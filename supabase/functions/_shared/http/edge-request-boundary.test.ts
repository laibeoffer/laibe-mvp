import { base64url } from "../drs-auth/auth-bound-session.ts";
import { withEdgeRequestBoundary } from "./edge-request-boundary.ts";
const U = "11111111-1111-4111-8111-111111111111",
  S = "22222222-2222-4222-8222-222222222222",
  SP = "33333333-3333-4333-8333-333333333333",
  C = "44444444-4444-4444-8444-444444444444";
const PROJECT = "https://zdwuyomhswjcbbpbhpcq.supabase.co",
  ORIGIN = "https://laibe-drs-original-a4-20260901.blueleft120.chatgpt.site";
const slugs = [
  "drs-reviewer-registration-applications",
  "drs-password-auth-session",
  "drs-session-bootstrap",
  "drs-workspace-grant",
  "drs-session-logout",
] as const;
type Handler = (request: Request) => Promise<Response>;
function assert(x: unknown, m: string): asserts x {
  if (!x) throw Error(m);
}
let imports = 0;
async function fixture() {
  const now = Date.now(),
    env: Record<string, string> = {
      SUPABASE_URL: PROJECT,
      SUPABASE_SERVICE_ROLE_KEY: "synthetic-service-key-at-least-32-characters",
      LAIBE_DRS_APP_ORIGIN: ORIGIN,
      LAIBE_DRS_SESSION_SUCCESS_URL: ORIGIN + "/pcm/reviewer/access",
      LAIBE_DRS_SESSION_COOKIE_NAME: "__Host-laibe_drs_session",
      LAIBE_DRS_SESSION_COOKIE_KEY_V1: base64url(new Uint8Array(32).fill(11)),
      LAIBE_DRS_BFF_PROOF_KEY_V1: base64url(new Uint8Array(32).fill(22)),
    };
  const state = { live: true, calls: 0, expires: "" };
  const encode = (v: unknown) =>
    base64url(new TextEncoder().encode(JSON.stringify(v)));
  const token = encode({ alg: "HS256" }) + "." +
    encode({
      sub: U,
      session_id: S,
      aud: "authenticated",
      iss: PROJECT + "/auth/v1",
      exp: Math.floor(now / 1000) + 300,
    }) + ".c3ludGhldGlj";
  const fetcher = async (url: string | URL | Request, init?: RequestInit) => {
    await Promise.resolve();
    state.calls++;
    const path = new URL(String(url)).pathname;
    if (path === "/auth/v1/user") return Response.json({ id: U });
    if (path.endsWith("/auth_session_validation_v1")) {
      return Response.json({
        schemaVersion: "laibe.auth-session-validation.v1",
        active: state.live,
      });
    }
    const body = JSON.parse(String(init?.body));
    if (path.endsWith("/drs_password_session_authority_v1")) {
      return Response.json({
        authorized: true,
        authenticated_user_id: U,
        specialist_id: SP,
        assignment_id: S,
        selected_case_id: C,
        account_role: "drs",
        authorization_subject: "drs-specialist:" + SP,
        auth_binding_status: "active",
        specialist_status: "active",
        assignment_status: "active",
        valid_from: new Date(now - 60000).toISOString(),
        valid_until: new Date(now + 3600000).toISOString(),
        terminated_at: null,
        lock_status: "locked",
      });
    }
    if (path.endsWith("/drs_auth_bound_server_session_issue_v1")) {
      state.expires = body.p_expires_at;
      return Response.json({
        server_session_id: body.p_server_session_id,
        expires_at: state.expires,
      });
    }
    if (path.endsWith("/drs_auth_bound_server_session_verify_v1")) {
      return Response.json({
        authenticated_user_id: U,
        auth_session_id: S,
        specialist_id: SP,
        authorization_subject: "drs-specialist:" + SP,
        expires_at: state.expires,
        selected_case_id: C,
        case_status: "active",
        access_mode: "read_only",
      });
    }
    throw Error("Unexpected remote work");
  };
  const descriptor = Object.getOwnPropertyDescriptor(Deno, "env")!,
    oldFetch = globalThis.fetch;
  const handlers = {} as Record<typeof slugs[number], Handler>;
  try {
    Object.defineProperty(Deno, "env", {
      configurable: true,
      value: { get: (n: string) => env[n] },
    });
    globalThis.fetch = fetcher;
    for (const slug of slugs) {
      handlers[slug] =
        (await import("../../" + slug + "/index.ts?edgepath=" + (++imports)))
          .handler;
    }
  } finally {
    Object.defineProperty(Deno, "env", descriptor);
    globalThis.fetch = oldFetch;
  }
  const request = (
    slug: string,
    path = "/" + slug,
    headers: Record<string, string> = {},
    method = "POST",
  ) =>
    new Request(PROJECT + path, {
      method,
      headers: {
        origin: ORIGIN,
        "content-type": "application/json",
        "sec-fetch-site": "same-origin",
        ...headers,
      },
      ...(method === "POST" ? { body: "{}" } : {}),
    });
  return { handlers, state, token, request };
}
Deno.test("gateway RED actual S3 export accepts short-path OPTIONS", async () => {
  const f = await fixture(), slug = slugs[0];
  const r = await f.handlers[slug](
    f.request(slug, "/" + slug, {
      "access-control-request-method": "POST",
      "access-control-request-headers": "authorization,content-type,apikey",
    }, "OPTIONS"),
  );
  assert(
    r.status === 204,
    "Gateway S3 preflight expected 204, got " + r.status,
  );
  assert(f.state.calls === 0, "Preflight has no Auth work");
});

Deno.test("gateway actual short-path password bootstrap workspace chain with canonical success config", async () => {
  const f = await fixture();
  const password = await f.handlers["drs-password-auth-session"](
    f.request("drs-password-auth-session", "/drs-password-auth-session", {
      authorization: "Bearer " + f.token,
    }),
  );
  assert(
    password.status === 204,
    "Actual short password expected 204, got " + password.status,
  );
  const cookie = password.headers.get("set-cookie")!.split(";")[0];
  const bootstrap = await f.handlers["drs-session-bootstrap"](
    f.request("drs-session-bootstrap", "/drs-session-bootstrap", { cookie }),
  );
  assert(
    bootstrap.status === 204,
    "Actual short bootstrap expected 204, got " + bootstrap.status,
  );
  const proof = bootstrap.headers.get("authorization")!;
  const workspace = () =>
    f.handlers["drs-workspace-grant"](
      f.request("drs-workspace-grant", "/drs-workspace-grant", {
        cookie,
        authorization: proof,
      }),
    );
  const response = await workspace();
  assert(
    response.status === 200,
    "Actual short workspace expected 200, got " + response.status,
  );
  const dto = await response.json();
  assert(
    dto.case.id === C && dto.workspaceAccess.mode === "read_only" &&
      !dto.workspaceAccess.mutationAllowed,
    "Exact read-only grant",
  );
  f.state.live = false;
  assert(
    (await workspace()).status === 401,
    "Revoked Auth cannot reuse short-path proof",
  );
});
Deno.test("gateway all five exports reject non-exact and encoded paths before fetch", async () => {
  const f = await fixture();
  for (const slug of slugs) {
    for (
      const path of [
        "/extra/" + slug,
        "/" + slug + "/suffix",
        "/" + slug + "/",
        "/" + slug + "?x=1",
        "/" + slug + "?",
        "/" + slug + "%2F",
        "/%64" + slug.slice(1),
        "/functions/v1/" + slug + "/",
        "/functions/v1/" + slug + "?x=1",
      ]
    ) {
      const r = await f.handlers[slug](f.request(slug, path));
      assert(
        r.status === 400 && (await r.json()).state === "INVALID_REQUEST",
        "Wrong path expected closed 400: " + path,
      );
      assert(
        r.headers.get("cache-control") === "no-store",
        "Boundary denial must be no-store",
      );
    }
  }
  assert(f.state.calls === 0, "Bad path cannot reach Auth/session/RPC");
});
Deno.test("gateway preserves method body headers and canonical request object", async () => {
  const seen: Request[] = [];
  const handler = withEdgeRequestBoundary("test-edge", async (r) => {
    seen.push(r);
    return new Response(await r.text());
  });
  const headers = {
    origin: "https://untrusted-origin.invalid",
    authorization: "Bearer synthetic",
    cookie: "synthetic=untrusted",
    "sec-fetch-site": "cross-site",
    "content-type": "application/json",
  };
  const short = new Request("https://synthetic.invalid/test-edge", {
    method: "POST",
    headers,
    body: '{"unchanged":true}',
  });
  const result = await handler(short);
  assert(await result.text() === '{"unchanged":true}', "Body bytes unchanged");
  assert(
    seen[0].method === "POST" &&
      new URL(seen[0].url).pathname === "/functions/v1/test-edge",
    "Only path changes",
  );
  for (const [k, v] of Object.entries(headers)) {
    assert(
      seen[0].headers.get(k) === v,
      "Header must not be invented or changed: " + k,
    );
  }
  const canonical = new Request(
    "https://synthetic.invalid/functions/v1/test-edge",
    { method: "POST", body: "canonical" },
  );
  await handler(canonical);
  assert(seen[1] === canonical, "Canonical request passes through unchanged");
});
Deno.test("gateway RED all five actual exports classify short-path missing credentials as 401", async () => {
  const f = await fixture();
  for (const slug of slugs) {
    const r = await f.handlers[slug](
      f.request(slug, "/" + slug, {}, slug === slugs[0] ? "GET" : "POST"),
    );
    assert(
      r.status === 401,
      slug + " short path expected 401, got " + r.status,
    );
  }
  assert(f.state.calls === 0, "Missing credentials rejected before fetch");
});
