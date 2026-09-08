import { createDrsWorkspaceGrantHandler } from "../../drs-workspace-grant/index.ts";
import { createDrsSecureSessionRuntime } from "./drs-secure-session-runtime.ts";
import { createDrsSessionBootstrapHandler } from "./drs-session-bootstrap-bff.ts";
import { createDrsBffRouteGuard } from "./drs-bff-route-composition.ts";
import {
  createDrsPasswordAuthSessionHandler,
  createSupabaseDrsPasswordSessionAuthorityResolver,
} from "./drs-password-auth-session.ts";
import { base64url } from "./auth-bound-session.ts";

const USER = "11111111-1111-4111-8111-111111111111";
const SESSION = "22222222-2222-4222-8222-222222222222";
const SPECIALIST = "33333333-3333-4333-8333-333333333333";
const CASE = "44444444-4444-4444-8444-444444444444";
const OTHER_CASE = "55555555-5555-4555-8555-555555555555";
const PROJECT = "https://synthetic-auth-project.supabase.co";
const ORIGIN = "https://synthetic-drs.example";
const EXTERNAL = "https://synthetic-owner-vendor.example";
const COOKIE = "__Host-laibe_drs_session";
function assert(value: unknown, message: string): asserts value {
  if (!value) throw new Error(message);
}

let entryImportId = 0;
async function withMemoryRuntime<T>(
  env: Record<string, string>,
  fetcher: typeof fetch,
  action: () => Promise<T> | T,
): Promise<T> {
  const descriptor = Object.getOwnPropertyDescriptor(Deno, "env")!;
  const previousFetch = globalThis.fetch;
  try {
    Object.defineProperty(Deno, "env", {
      configurable: true,
      value: { get: (name: string) => env[name] },
    });
    globalThis.fetch = fetcher;
    return await action();
  } finally {
    Object.defineProperty(Deno, "env", descriptor);
    globalThis.fetch = previousFetch;
  }
}

async function session(defaultEntries = false) {
  let nowMs = Date.now();
  const now = () => new Date(nowMs);
  const state = {
    active: true,
    wrongUser: false,
    wrongCase: false,
    unavailable: false,
    oldRpcCalls: 0,
    fetchCalls: 0,
    verifies: 0,
  };
  const env = {
    SUPABASE_URL: PROJECT,
    SUPABASE_SERVICE_ROLE_KEY: "synthetic-service-key-at-least-thirty-two",
    LAIBE_DRS_APP_ORIGIN: ORIGIN,
    LAIBE_DRS_SESSION_SUCCESS_URL: `${ORIGIN}/pcm/reviewer/access/#login`,
    LAIBE_DRS_SESSION_COOKIE_NAME: COOKIE,
    LAIBE_DRS_SESSION_COOKIE_KEY_V1: base64url(new Uint8Array(32).fill(11)),
    LAIBE_DRS_BFF_PROOF_KEY_V1: base64url(new Uint8Array(32).fill(22)),
  };
  const environment = {
    get: (name: string) => (env as Record<string, string>)[name],
  };
  const encode = (value: unknown) =>
    base64url(new TextEncoder().encode(JSON.stringify(value)));
  const token = `${encode({ alg: "HS256" })}.${
    encode({
      sub: USER,
      session_id: SESSION,
      iss: `${PROJECT}/auth/v1`,
      aud: "authenticated",
      exp: Math.floor(nowMs / 1000) + 300,
    })
  }.c3ludGhldGlj`;
  let expiry = "";
  const fetcher = (input: string | URL | Request, init?: RequestInit) => {
    state.fetchCalls++;
    const path = new URL(String(input)).pathname;
    if (state.unavailable) {
      return Promise.resolve(Response.json({}, { status: 503 }));
    }
    if (path === "/auth/v1/user") {
      return Promise.resolve(
        Response.json({ id: state.wrongUser ? OTHER_CASE : USER }),
      );
    }
    if (path.endsWith("/auth_session_validation_v1")) {
      return Promise.resolve(
        Response.json({
          schemaVersion: "laibe.auth-session-validation.v1",
          active: state.active,
        }),
      );
    }
    const body = JSON.parse(String(init?.body));
    if (path.endsWith("/drs_password_session_authority_v1")) {
      return Promise.resolve(Response.json({
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
        valid_from: new Date(nowMs - 60_000).toISOString(),
        valid_until: new Date(nowMs + 3_600_000).toISOString(),
        terminated_at: null,
        lock_status: "locked",
      }));
    }
    if (path.endsWith("/drs_auth_bound_server_session_issue_v1")) {
      assert(
        body.p_auth_session_id === SESSION &&
          body.p_authenticated_user_id === USER,
        "Verified Auth pairing must reach issue",
      );
      expiry = body.p_expires_at;
      return Promise.resolve(
        Response.json({
          server_session_id: body.p_server_session_id,
          expires_at: expiry,
        }),
      );
    }
    if (path.endsWith("/drs_auth_bound_server_session_verify_v1")) {
      state.verifies++;
      return Promise.resolve(
        Response.json({
          authenticated_user_id: USER,
          auth_session_id: SESSION,
          specialist_id: SPECIALIST,
          authorization_subject: `drs-specialist:${SPECIALIST}`,
          expires_at: expiry,
          selected_case_id: state.wrongCase ? OTHER_CASE : CASE,
          case_status: "active",
          access_mode: "read_only",
        }),
      );
    }
    throw new Error("Unexpected RPC or provider call");
  };
  const runtime = createDrsSecureSessionRuntime({
    env: environment,
    fetch: fetcher,
    now,
  });
  assert(
    runtime.runtimeAvailable && runtime.passwordSessionProducer &&
      runtime.bootstrapDependencies,
    "Real runtime must configure",
  );
  const authorityResolver = createSupabaseDrsPasswordSessionAuthorityResolver({
    env: environment,
    fetch: fetcher,
  });
  assert(authorityResolver, "Password authority resolver must configure");
  let password = createDrsPasswordAuthSessionHandler({
    allowedOrigin: ORIGIN,
    supabaseUrl: PROJECT,
    serviceRoleKey: env.SUPABASE_SERVICE_ROLE_KEY,
    sessionCookieName: COOKIE,
    sessionSuccessRedirectUrl: env.LAIBE_DRS_SESSION_SUCCESS_URL,
    fetch: fetcher,
    now,
    sessionProducer: runtime.passwordSessionProducer,
    authorityResolver,
  });
  if (defaultEntries) {
    password = await withMemoryRuntime(
      env,
      fetcher,
      async () =>
        (await import(
          `../../drs-password-auth-session/index.ts?entry=${++entryImportId}`
        )).handler,
    );
  }
  const signedIn = await password(
    new Request(`${PROJECT}/functions/v1/drs-password-auth-session`, {
      method: "POST",
      headers: {
        origin: ORIGIN,
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
      },
      body: "{}",
    }),
  );
  assert(
    signedIn.status === 204,
    `Password expected 204, got ${signedIn.status}`,
  );
  assert(!signedIn.headers.has("location"), "Password API must not redirect");
  const cookie = signedIn.headers.get("set-cookie")!.split(";")[0];
  let bootstrap = createDrsSessionBootstrapHandler(
    runtime.bootstrapDependencies,
  );
  if (defaultEntries) {
    bootstrap = await withMemoryRuntime(
      env,
      fetcher,
      async () =>
        (await import(
          `../../drs-session-bootstrap/index.ts?entry=${++entryImportId}`
        )).handler,
    );
  }
  const bootstrapped = await bootstrap(
    new Request(`${PROJECT}/functions/v1/drs-session-bootstrap`, {
      method: "POST",
      headers: {
        origin: ORIGIN,
        cookie,
        "sec-fetch-site": "same-origin",
        "content-type": "application/json",
      },
      body: "{}",
    }),
  );
  assert(
    bootstrapped.status === 204,
    `Bootstrap expected 204, got ${bootstrapped.status}`,
  );
  const proof = bootstrapped.headers.get("authorization")!;
  const guard = createDrsBffRouteGuard(
    "workspaceGrant",
    runtime.bootstrapDependencies,
  );
  const dependencies = {
    runtimeAvailable: true,
    allowedOrigins: [ORIGIN],
    resolveAuthenticatedIdentity: () =>
      Promise.reject(new Error("Client identity fallback forbidden")),
    resolveWorkspaceGrant: () => {
      state.oldRpcCalls++;
      return Promise.resolve({
        authorized: false,
        state: "CASE_NOT_AUTHORIZED",
      });
    },
  };
  const handler = defaultEntries
    ? await withMemoryRuntime(
      env,
      fetcher,
      () => createDrsWorkspaceGrantHandler(),
    )
    : createDrsWorkspaceGrantHandler(dependencies, guard);
  const request = (origin = ORIGIN, body = "{}") =>
    new Request(`${PROJECT}/functions/v1/drs-workspace-grant`, {
      method: "POST",
      headers: {
        origin,
        cookie,
        authorization: proof,
        "sec-fetch-site": "same-origin",
        "content-type": "application/json",
      },
      body,
    });
  return {
    state,
    handler,
    request,
    guard,
    exportedHandler: () =>
      withMemoryRuntime(
        env,
        fetcher,
        async () =>
          (await import(
            `../../drs-workspace-grant/index.ts?entry=${++entryImportId}`
          )).handler as ((request: Request) => Promise<Response>) | undefined,
      ),
    advance: (seconds: number) => {
      nowMs += seconds * 1000;
    },
  };
}

Deno.test("workspace P1 default factory with valid runtime rejects missing cookie as 401", async () => {
  const f = await session(true);
  const request = f.request();
  request.headers.delete("cookie");
  request.headers.delete("authorization");
  const calls = f.state.fetchCalls;
  const response = await f.handler(request);
  assert(
    response.status === 401,
    `Default factory expected 401, got ${response.status}`,
  );
  assert(
    f.state.fetchCalls === calls,
    "Missing cookie must fail before remote work",
  );
});

Deno.test("workspace P1 real default password and bootstrap entries reach factory and served export", async () => {
  const f = await session(true);
  const before = f.state.verifies;
  const response = await f.handler(f.request());
  assert(
    response.status === 200,
    `Default workspace expected 200, got ${response.status}`,
  );
  assert(
    f.state.verifies > before,
    "Default factory must freshly verify Auth-bound session",
  );
  const served = await f.exportedHandler();
  assert(
    typeof served === "function",
    "Workspace must export the handler passed to Deno.serve",
  );
  const servedResponse = await served(f.request());
  assert(
    servedResponse.status === 200,
    "Served export must authorize the real default chain",
  );
  const body = await servedResponse.json();
  assert(
    body.state === "AUTHORIZED_DRS_WORKSPACE" && body.case.id === CASE,
    "Served export must consume the same real default runtime composition",
  );
  assert(
    f.state.oldRpcCalls === 0,
    "Default entries cannot fall back to Google authority",
  );
});

for (
  const failure of [
    "revoked",
    "wrongUser",
    "wrongCase",
    "unavailable",
    "foreignOrigin",
  ] as const
) {
  Deno.test(`workspace P1 served default entry rejects ${failure}`, async () => {
    const f = await session(true);
    const served = await f.exportedHandler();
    assert(typeof served === "function", "Served default handler must exist");
    if (failure === "revoked") f.state.active = false;
    if (failure === "wrongUser") f.state.wrongUser = true;
    if (failure === "wrongCase") f.state.wrongCase = true;
    if (failure === "unavailable") f.state.unavailable = true;
    const response = await served(
      f.request(failure === "foreignOrigin" ? EXTERNAL : ORIGIN),
    );
    const expected = failure === "unavailable"
      ? 503
      : failure === "foreignOrigin"
      ? 403
      : 401;
    assert(
      response.status === expected,
      `${failure} default entry expected ${expected}, got ${response.status}`,
    );
    assert(
      !response.headers.has("location") && f.state.oldRpcCalls === 0,
      "Default denial must not redirect or use Google authority",
    );
  });
}

Deno.test("S2I password-only real producer/bootstrap/guard reaches workspace without legacy Google RPC", async () => {
  const f = await session();
  const verifies = f.state.verifies;
  const response = await f.handler(f.request());
  assert(
    response.status === 200,
    `Trusted workspace expected 200; got ${response.status}`,
  );
  assert(
    f.state.verifies > verifies,
    "Workspace must freshly verify the bound session",
  );
  assert(
    f.state.oldRpcCalls === 0,
    "Workspace must not require an old Google binding after fresh authority verification",
  );
  assert(!response.headers.has("location"), "Workspace POST must not redirect");
  const body = await response.json();
  assert(
    body.case.id === CASE && body.case.status === "ACTIVE" &&
      body.workspaceAccess.mode === "read_only" &&
      body.workspaceAccess.mutationAllowed === false,
    "Only the authorized read-only case may be projected",
  );
});

Deno.test("S2I trusted projection still rejects malformed UUID, non-active case and write mode", async () => {
  const f = await session();
  const context = await f.guard.authorize(f.request());
  for (
    const change of [
      { selectedCaseId: "not-a-uuid" },
      { caseStatus: "ACTIVE" },
      { accessMode: "write" },
    ]
  ) {
    const handler = createDrsWorkspaceGrantHandler({
      allowedOrigins: [ORIGIN],
      runtimeAvailable: true,
    }, {
      authorize: () =>
        Promise.resolve({ ...context, ...change } as typeof context),
    });
    const response = await handler(f.request());
    assert(
      response.status === 403,
      "Malformed trusted projection must fail closed",
    );
    assert(
      (await response.json()).state === "CASE_NOT_AUTHORIZED",
      "Projection denial must be sanitized",
    );
  }
});

for (
  const failure of [
    "expired",
    "revoked",
    "wrongUser",
    "wrongCase",
    "unavailable",
    "foreignOrigin",
    "clientCase",
  ] as const
) {
  Deno.test(`S2I real workspace chain rejects ${failure}`, async () => {
    const f = await session();
    if (failure === "expired") f.advance(301);
    if (failure === "revoked") f.state.active = false;
    if (failure === "wrongUser") f.state.wrongUser = true;
    if (failure === "wrongCase") f.state.wrongCase = true;
    if (failure === "unavailable") f.state.unavailable = true;
    const response = await f.handler(
      f.request(
        failure === "foreignOrigin" ? EXTERNAL : ORIGIN,
        failure === "clientCase"
          ? JSON.stringify({ caseId: OTHER_CASE })
          : "{}",
      ),
    );
    const expected = failure === "unavailable"
      ? 503
      : failure === "foreignOrigin"
      ? 403
      : failure === "clientCase"
      ? 400
      : 401;
    assert(
      response.status === expected,
      `${failure} expected ${expected}; got ${response.status}`,
    );
    assert(
      f.state.oldRpcCalls === 0 && !response.headers.has("location"),
      "Denial must not call legacy authority or redirect",
    );
  });
}

function defaultHandler(values: Record<string, string>) {
  const descriptor = Object.getOwnPropertyDescriptor(Deno, "env")!;
  try {
    Object.defineProperty(Deno, "env", {
      configurable: true,
      value: { get: (name: string) => values[name] },
    });
    return createDrsWorkspaceGrantHandler(undefined, {
      authorize: () =>
        Promise.reject(new Error("Preflight must not authorize")),
    });
  } finally {
    Object.defineProperty(Deno, "env", descriptor);
  }
}
function preflight(origin: string) {
  return new Request(`${PROJECT}/functions/v1/drs-workspace-grant`, {
    method: "OPTIONS",
    headers: {
      origin,
      "access-control-request-method": "POST",
      "access-control-request-headers": "authorization,content-type,apikey",
    },
  });
}
Deno.test("S2I default CORS uses the single DRS origin with no global list dependency", async () => {
  for (const globalOrigins of ["", EXTERNAL]) {
    const handler = defaultHandler({
      LAIBE_DRS_APP_ORIGIN: ORIGIN,
      LAIBE_ALLOWED_ORIGINS: globalOrigins,
    });
    const response = await handler(preflight(ORIGIN));
    assert(
      response.status === 204 &&
        response.headers.get("access-control-allow-origin") === ORIGIN,
      "Configured DRS origin must preflight without the global list",
    );
    assert(
      (await handler(preflight(EXTERNAL))).status === 403,
      "External origin must not enter DRS",
    );
  }
});
Deno.test("S2I missing/invalid DRS origin cannot fall back to global external origins", async () => {
  for (
    const value of [
      "",
      "*",
      ORIGIN + "/",
      "http://insecure.example",
      ORIGIN + "/path",
      `${ORIGIN},${EXTERNAL}`,
    ]
  ) {
    const handler = defaultHandler({
      LAIBE_DRS_APP_ORIGIN: value,
      LAIBE_ALLOWED_ORIGINS: EXTERNAL,
    });
    for (const origin of [ORIGIN, EXTERNAL]) {
      assert(
        (await handler(preflight(origin))).status === 403,
        "Invalid DRS configuration must remain closed",
      );
    }
  }
});
