import { createDrsPasswordAuthSessionHandler } from "./drs-password-auth-session.ts";
import { createDrsSecureSessionRuntime } from "./drs-secure-session-runtime.ts";
import {
  createDrsBffGuard,
  createDrsSessionBootstrapHandler,
} from "./drs-session-bootstrap-bff.ts";
import { base64url } from "./auth-bound-session.ts";

const USER = "11111111-1111-4111-8111-111111111111";
const SESSION = "22222222-2222-4222-8222-222222222222";
const SPECIALIST = "33333333-3333-4333-8333-333333333333";
const CASE = "44444444-4444-4444-8444-444444444444";
const PROJECT = "https://synthetic-auth-project.supabase.co";
const ORIGIN = "https://synthetic-drs.example";
const COOKIE = "__Host-laibe_drs_session";
function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}
function jwt(exp: number) {
  const encode = (value: unknown) =>
    btoa(JSON.stringify(value)).replaceAll("+", "-").replaceAll("/", "_")
      .replaceAll("=", "");
  return `${encode({ alg: "HS256" })}.${
    encode({
      sub: USER,
      session_id: SESSION,
      iss: `${PROJECT}/auth/v1`,
      aud: "authenticated",
      exp,
    })
  }.c3ludGhldGlj`;
}
async function password(
  active: boolean,
  denial?: string,
  tokenTransform = (value: string) => value,
  serviceStatus = 200,
) {
  const exp = Math.floor(Date.now() / 1000) + 300;
  const token = tokenTransform(jwt(exp));
  const issued: Record<string, unknown>[] = [];
  const dependencies = {
    allowedOrigin: ORIGIN,
    supabaseUrl: PROJECT,
    supabaseAnonKey: "synthetic-publishable-key",
    serviceRoleKey: "synthetic-service-key",
    sessionCookieName: COOKIE,
    sessionSuccessRedirectUrl: `${ORIGIN}/pcm/reviewer/access/#login`,
    now: () => new Date(),
    fetch: (input: string | URL | Request) =>
      Promise.resolve(Response.json(
        String(input).endsWith("/auth/v1/user")
          ? { id: USER }
          : { schemaVersion: "laibe.auth-session-validation.v1", active },
        { status: serviceStatus },
      )),
    authorityResolver: {
      resolveAuthority: () =>
        Promise.resolve(
          denial ? { authorized: false, state: denial } : {
            authorized: true,
            authenticated_user_id: USER,
            specialist_id: SPECIALIST,
            assignment_id: SESSION,
            selected_case_id: CASE,
            account_role: "drs",
            authorization_subject: `drs-specialist:${SPECIALIST}`,
            auth_binding_status: "active",
            specialist_status: "active",
            assignment_status: "active",
            valid_from: new Date(Date.now() - 60_000).toISOString(),
            valid_until: new Date(Date.now() + 3600_000).toISOString(),
            terminated_at: null,
            lock_status: "locked",
          },
        ),
    },
    sessionProducer: {
      createVerifiedSession: (input: unknown) => {
        issued.push(input as Record<string, unknown>);
        return Promise.resolve({
          response: new Response(null, {
            status: 303,
            headers: {
              location: `${ORIGIN}/pcm/reviewer/access/#login`,
              "x-laibe-session-state": "SESSION_ESTABLISHED",
              "set-cookie":
                `${COOKIE}=synthetic; Path=/; HttpOnly; Secure; SameSite=Lax`,
            },
          }),
        });
      },
    },
  };
  const response = await createDrsPasswordAuthSessionHandler(dependencies)(
    new Request(
      `${PROJECT}/functions/v1/drs-password-auth-session`,
      {
        method: "POST",
        headers: {
          origin: ORIGIN,
          authorization: `Bearer ${token}`,
          "content-type": "application/json",
        },
        body: "{}",
      },
    ),
  );
  return { response, issued, token, exp };
}

Deno.test("S2 password: revoked Auth session cannot mint a DRS cookie", async () => {
  const { response, issued } = await password(false);
  assert(response.status === 401, `Expected 401; got ${response.status}`);
  assert(issued.length === 0, "Revoked session reached the DRS producer");
});

for (
  const state of [
    "REVIEWER_APPROVAL_REQUIRED",
    "CASE_NOT_AUTHORIZED",
    "CASE_SELECTION_REQUIRED",
    "CONTEXT_UNAVAILABLE",
  ]
) {
  Deno.test(`S2 password: ${state} remains distinct and cannot mint a workspace session`, async () => {
    const { response, issued } = await password(true, state);
    assert(
      response.status === (state === "CONTEXT_UNAVAILABLE" ? 503 : 403),
      "Incorrect denial status",
    );
    assert(
      (await response.json()).state === state,
      "Denial layer must remain distinct",
    );
    assert(issued.length === 0, "Denial must never reach producer");
  });
}
Deno.test("S2 password: wrong issuer, missing sid, expired JWT and unavailable verifier cannot issue", async () => {
  for (
    const changes of [
      { iss: "https://wrong.example/auth/v1" },
      { session_id: undefined },
      { sub: CASE },
      { exp: 1 },
    ]
  ) {
    const modify = (token: string) => {
      const parts = token.split(".");
      const payload = JSON.parse(
        atob(parts[1].replaceAll("-", "+").replaceAll("_", "/")),
      );
      parts[1] = btoa(JSON.stringify({ ...payload, ...changes })).replaceAll(
        "+",
        "-",
      ).replaceAll("/", "_").replaceAll("=", "");
      return parts.join(".");
    };
    const { response, issued } = await password(true, undefined, modify);
    assert(
      response.status === 401 && issued.length === 0,
      "Invalid Auth claim reached producer",
    );
  }
  const fault = await password(true, undefined, (token) => token, 503);
  assert(
    fault.response.status === 503 && fault.issued.length === 0,
    "Verifier failure must stay unavailable",
  );
});
Deno.test("S2 password: producer receives only the verified Auth session and expiry", async () => {
  const { response, issued, token, exp } = await password(true);
  assert(
    response.status === 204,
    "Valid password identity should reach its existing authority check",
  );
  assert(issued.length === 1, "Expected one session issue");
  assert(
    issued[0].authSessionId === SESSION,
    "Auth session id was lost before DRS issue",
  );
  assert(
    issued[0].supabaseAccessToken === token,
    "Verified token was lost before secure sealing",
  );
  assert(
    issued[0].authExpiresAtEpochSeconds === exp,
    "JWT expiry was lost before DRS issue",
  );
});

function fixture(lifetimeSeconds = 300, issueDelaySeconds = 0) {
  let nowMs = Date.now();
  const now = () => new Date(nowMs);
  const state = {
    active: true,
    authStatus: 200,
    rpcStatus: 200,
    caseDenied: false,
    issues: 0,
    verifies: 0,
    wrongUser: false,
  };
  const env: Record<string, string> = {
    SUPABASE_URL: PROJECT,
    SUPABASE_SERVICE_ROLE_KEY: "synthetic-service-role-key-at-least-thirty-two",
    LAIBE_DRS_APP_ORIGIN: ORIGIN,
    LAIBE_DRS_SESSION_SUCCESS_URL: `${ORIGIN}/pcm/reviewer/access/#login`,
    LAIBE_DRS_SESSION_COOKIE_NAME: COOKIE,
    LAIBE_DRS_SESSION_COOKIE_KEY_V1: base64url(new Uint8Array(32).fill(11)),
    LAIBE_DRS_BFF_PROOF_KEY_V1: base64url(new Uint8Array(32).fill(22)),
  };
  const exp = Math.floor(nowMs / 1000) + lifetimeSeconds;
  const token = jwt(exp);
  let expiry = "";
  const fetcher = async (url: string | URL | Request, init?: RequestInit) => {
    const path = new URL(String(url)).pathname;
    if (path === "/auth/v1/user") {
      return Response.json({ id: state.wrongUser ? CASE : USER }, {
        status: state.authStatus,
      });
    }
    if (path.endsWith("/auth_session_validation_v1")) {
      return Response.json({
        schemaVersion: "laibe.auth-session-validation.v1",
        active: state.active,
      }, { status: state.rpcStatus });
    }
    if (state.rpcStatus !== 200) {
      return Response.json({}, { status: state.rpcStatus });
    }
    const body = await new Response(String(init?.body)).json();
    if (path.endsWith("/drs_auth_bound_server_session_issue_v1")) {
      state.issues++;
      assert(
        body.p_auth_session_id === SESSION &&
          body.p_authenticated_user_id === USER,
        "Issue lost verified pair",
      );
      assert(
        !String(init?.body).includes(token),
        "RPC must receive only JWT digest",
      );
      expiry = body.p_expires_at;
      nowMs += issueDelaySeconds * 1000;
      return Response.json({
        server_session_id: body.p_server_session_id,
        expires_at: expiry,
      });
    }
    if (path.endsWith("/drs_auth_bound_server_session_verify_v1")) {
      state.verifies++;
      if (state.caseDenied) {
        return Response.json({
          authorized: false,
          state: "CASE_NOT_AUTHORIZED",
        });
      }
      return Response.json({
        authenticated_user_id: USER,
        auth_session_id: SESSION,
        specialist_id: SPECIALIST,
        authorization_subject: `drs-specialist:${SPECIALIST}`,
        expires_at: expiry,
        selected_case_id: CASE,
        case_status: "active",
        access_mode: "read_only",
      });
    }
    throw new Error("Unexpected RPC");
  };
  const runtime = createDrsSecureSessionRuntime({
    env: { get: (name) => env[name] },
    fetch: fetcher,
    now,
  });
  assert(
    runtime.runtimeAvailable && runtime.passwordSessionProducer &&
      runtime.bootstrapDependencies,
    "Runtime should be configured",
  );
  const producer = runtime.passwordSessionProducer;
  const input = {
    authenticatedUserId: USER,
    authSessionId: SESSION,
    supabaseAccessToken: token,
    authExpiresAtEpochSeconds: exp,
    specialistId: SPECIALIST,
    authorizationSubject: `drs-specialist:${SPECIALIST}`,
    callbackOrigin: ORIGIN,
    successRedirectUrl: env.LAIBE_DRS_SESSION_SUCCESS_URL,
    sessionCookieName: COOKIE,
  };
  return { state, runtime, input, producer, token, now, fetcher };
}

async function issueThroughPasswordHandler(f: ReturnType<typeof fixture>) {
  const handler = createDrsPasswordAuthSessionHandler({
    allowedOrigin: ORIGIN,
    supabaseUrl: PROJECT,
    serviceRoleKey: "synthetic-service-role-key-at-least-thirty-two",
    sessionCookieName: COOKIE,
    sessionSuccessRedirectUrl: `${ORIGIN}/pcm/reviewer/access/#login`,
    now: f.now,
    fetch: f.fetcher,
    sessionProducer: f.producer,
    authorityResolver: {
      resolveAuthority: () =>
        Promise.resolve({
          authorized: true,
          authenticated_user_id: USER,
          specialist_id: SPECIALIST,
          assignment_id: SESSION,
          selected_case_id: CASE,
          account_role: "drs",
          authorization_subject: `drs-specialist:${SPECIALIST}`,
          auth_binding_status: "active",
          specialist_status: "active",
          assignment_status: "active",
          valid_from: new Date(f.now().getTime() - 60_000).toISOString(),
          valid_until: new Date(f.now().getTime() + 3_600_000).toISOString(),
          terminated_at: null,
          lock_status: "locked",
        }),
    },
  });
  return await handler(
    new Request(`${PROJECT}/functions/v1/drs-password-auth-session`, {
      method: "POST",
      headers: {
        origin: ORIGIN,
        authorization: `Bearer ${f.token}`,
        "content-type": "application/json",
      },
      body: "{}",
    }),
  );
}

for (
  const [lifetime, delay, label] of [
    [5, 6, "JWT expired"],
    [1200, 901, "DRS session expired"],
  ] as const
) {
  Deno.test(`S2 P2 late issue: ${label} rejects without a cookie`, async () => {
    const f = fixture(lifetime, delay);
    const response = await issueThroughPasswordHandler(f);
    assert(
      f.state.issues === 1,
      "Expected the real producer to await one issue RPC",
    );
    assert(
      response.status === 401,
      `Expected 401 after late issue; got ${response.status}`,
    );
    assert(
      !response.headers.has("set-cookie"),
      "Expired response must not issue a cookie",
    );
    assert(
      !response.headers.has("x-laibe-session-state"),
      "Expired response must not claim SESSION_ESTABLISHED",
    );
  });
}
Deno.test("S2 P2 late issue: still-valid response uses remaining TTL", async () => {
  const f = fixture(20, 6);
  const response = await issueThroughPasswordHandler(f);
  assert(
    response.status === 204,
    "Still-valid response should establish the session",
  );
  assert(
    response.headers.get("x-laibe-session-state") === "SESSION_ESTABLISHED",
    "Missing success state",
  );
  assert(
    response.headers.get("set-cookie")?.endsWith("Max-Age=14"),
    "Cookie must use the 14 seconds remaining after issue",
  );
});
async function rejectsStatus(action: () => Promise<unknown>, status: number) {
  try {
    await action();
  } catch (error) {
    assert(
      error instanceof Error && "status" in error && error.status === status,
      `Expected sanitized ${status}`,
    );
    return;
  }
  throw new Error("Expected rejection");
}

Deno.test("S2 cookie v2: encrypted JWT, exact identity, TTL, tampering and old-unbound reject", async () => {
  const f = fixture();
  const issued = await f.producer.createVerifiedSession(f.input);
  const header = issued.response.headers.get("set-cookie")!;
  assert(
    !header.includes(f.token) && header.length <= 4096,
    "Cookie must seal token within cookie bound",
  );
  assert(
    header.includes("Max-Age=300") || header.includes("Max-Age=299"),
    "Cookie TTL must not exceed JWT",
  );
  const sealed = header.split(";")[0].split("=")[1];
  const codec = f.runtime.authBoundSession!.codec;
  const opened = await codec.openCookieEnvelope(sealed);
  assert(
    opened.supabaseAccessToken === f.token && opened.authSessionId === SESSION,
    "Sealed identity mismatch",
  );
  await rejectsStatus(
    () => codec.openCookieEnvelope(sealed.slice(0, -2) + "AA"),
    401,
  );
  await rejectsStatus(
    () => codec.openCookieEnvelope("v1.synthetic.synthetic"),
    401,
  );
  await rejectsStatus(
    () => f.producer.createVerifiedSession({ ...f.input, authSessionId: CASE }),
    401,
  );
  await rejectsStatus(
    () =>
      f.producer.createVerifiedSession({
        ...f.input,
        authenticatedUserId: CASE,
      }),
    401,
  );
  await rejectsStatus(
    () =>
      f.producer.createVerifiedSession({
        ...f.input,
        authExpiresAtEpochSeconds: 1,
      }),
    401,
  );
  assert(f.state.issues === 1, "Invalid identity must never reach issue RPC");
});

Deno.test("S2 bootstrap and real BFF guard reject revoked-before-exp and changed-case late proof", async () => {
  const f = fixture();
  const issued = await f.producer.createVerifiedSession(f.input);
  const cookie = issued.response.headers.get("set-cookie")!.split(";")[0];
  const dependencies = f.runtime.bootstrapDependencies!;
  const bootstrap = createDrsSessionBootstrapHandler(dependencies);
  const request = () =>
    new Request(`${PROJECT}/functions/v1/drs-session-bootstrap`, {
      method: "POST",
      headers: {
        origin: ORIGIN,
        cookie,
        "sec-fetch-site": "same-origin",
        "content-type": "application/json",
      },
      body: "{}",
    });
  const response = await bootstrap(request());
  assert(
    response.status === 204,
    `Bootstrap expected 204 got ${response.status}`,
  );
  const proof = response.headers.get("authorization")!;
  assert(
    proof && !proof.includes(f.token),
    "BFF proof must never expose Auth JWT",
  );
  const guard = createDrsBffGuard(dependencies, {
    method: "POST",
    pathname: "/functions/v1/drs-protected-test",
    queryFields: [],
    jsonBodyFields: [],
  });
  const guarded = () =>
    new Request(`${PROJECT}/functions/v1/drs-protected-test`, {
      method: "POST",
      headers: {
        origin: ORIGIN,
        cookie,
        authorization: proof,
        "sec-fetch-site": "same-origin",
        "content-type": "application/json",
      },
      body: "{}",
    });
  f.state.active = false;
  const denied = await bootstrap(request());
  assert(
    denied.status === 401,
    "Revoked session must fail bootstrap before opaque verification",
  );
  await rejectsStatus(() => guard.authorize(guarded()), 401);
  f.state.active = true;
  f.state.caseDenied = true;
  await rejectsStatus(() => guard.authorize(guarded()), 403);
  f.state.caseDenied = false;
  f.state.rpcStatus = 503;
  assert(
    (await bootstrap(request())).status === 503,
    "Service fault must not become Auth denial",
  );
});
