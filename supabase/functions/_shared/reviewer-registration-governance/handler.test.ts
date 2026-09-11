import { createRegistrationGovernanceHandler } from "./handler.ts";
import { base64url } from "../drs-auth/auth-bound-session.ts";
import { DrsIdentityError } from "../drs-auth/contracts.ts";
const U = "11111111-1111-4111-8111-111111111111",
  S = "22222222-2222-4222-8222-222222222222",
  A = "33333333-3333-4333-8333-333333333333",
  K = "44444444-4444-4444-8444-444444444444";
const PROJECT = "https://synthetic-governance.supabase.co",
  ORIGIN = "https://synthetic-drs.example";
const SCHEMA = "laibe.drs-reviewer-registration-governance.v1";
const NOW = Date.parse("2026-09-08T09:00:00Z");
function assert(x: unknown, m: string): asserts x {
  if (!x) throw Error(m);
}
const input = {
  applicationId: A,
  expectedVersion: 1,
  decision: "approve",
  reason: "資格資料確認",
  idempotencyKey: K,
  bindingValidUntil: "2026-10-08T09:00:00Z",
};
function fixture(route: "queue" | "decision", reply: unknown) {
  const env = {
    SUPABASE_URL: PROJECT,
    SUPABASE_SERVICE_ROLE_KEY: "synthetic-service-key-at-least-32-characters",
    LAIBE_DRS_APP_ORIGIN: ORIGIN,
  };
  const state = {
    live: true,
    fault: false,
    sessionFault: false,
    authStatus: 200,
    authUserId: U,
    rpc: [] as Record<string, unknown>[],
  };
  const enc = (x: unknown) =>
    base64url(new TextEncoder().encode(JSON.stringify(x)));
  const jwt = enc({ alg: "HS256" }) + "." +
    enc({
      sub: U,
      session_id: S,
      iss: PROJECT + "/auth/v1",
      aud: "authenticated",
      exp: NOW / 1000 + 300,
    }) + ".c3ludGhldGlj";
  const handler = createRegistrationGovernanceHandler(route, {
    env: { get: (n: string) => (env as Record<string, string>)[n] },
    now: () => NOW,
    guard: {
      authorize: (request: Request) => {
        if (state.fault || state.sessionFault) {
          return Promise.reject(
            new DrsIdentityError("CONTEXT_UNAVAILABLE", 503),
          );
        }
        if (
          request.headers.get("authorization") !== "Bearer " + jwt ||
          request.headers.get("cookie") !==
            "__Host-laibe-drs-session=opaque-cookie" ||
          state.authStatus !== 200 || state.authUserId !== U || !state.live
        ) {
          return Promise.reject(new DrsIdentityError("AUTH_REQUIRED", 401));
        }
        return Promise.resolve({
          authenticatedUserId: U,
          specialistId: "55555555-5555-4555-8555-555555555555",
          authorizationSubject:
            "drs-specialist:55555555-5555-4555-8555-555555555555",
          selectedCaseId: "66666666-6666-4666-8666-666666666666",
          caseStatus: "active" as const,
          accessMode: "read_only" as const,
          proofExpiresAt: "2026-09-08T09:01:00.000Z",
          verifiedAuthSession: {
            userId: U,
            authSessionId: S,
            expiresAtEpochSeconds: NOW / 1000 + 300,
          },
        });
      },
    },
    fetch: async (url: string | URL | Request, init?: RequestInit) => {
      await Promise.resolve();
      const path = new URL(String(url)).pathname;
      if (path === "/auth/v1/user") {
        if (state.fault) return Response.json({}, { status: 503 });
        return state.authStatus >= 200 && state.authStatus <= 299
          ? Response.json({ id: state.authUserId }, {
            status: state.authStatus,
          })
          : Response.json({}, { status: state.authStatus });
      }
      if (path.endsWith("/auth_session_validation_v1")) {
        if (state.sessionFault) return Response.json({}, { status: 503 });
        return Response.json({
          schemaVersion: "laibe.auth-session-validation.v1",
          active: state.live,
        });
      }
      state.rpc.push(JSON.parse(String(init?.body)));
      return Response.json(reply);
    },
  });
  const request = (
    body: unknown = route === "queue" ? { cursor: null } : input,
    origin = ORIGIN,
    query = "",
  ) =>
    new Request(
      PROJECT + "/functions/v1/drs-reviewer-registration-" + route + query,
      {
        method: "POST",
        headers: {
          origin,
          authorization: "Bearer " + jwt,
          cookie: "__Host-laibe-drs-session=opaque-cookie",
          "sec-fetch-site": "same-origin",
          "content-type": "application/json",
        },
        body: typeof body === "string" ? body : JSON.stringify(body),
      },
    );
  return { handler, request, state };
}
Deno.test("S5 RED verified caller without operation authority cannot list applicants", async () => {
  const f = fixture("queue", {
    schemaVersion: SCHEMA,
    state: "REGISTRATION_OPERATION_NOT_AUTHORIZED",
  });
  const r = await f.handler(f.request());
  assert(r.status === 403, "Missing operation grant must be 403");
  assert(
    JSON.stringify(await r.json()) ===
      JSON.stringify({ state: "REGISTRATION_OPERATION_NOT_AUTHORIZED" }),
    "Denial cannot contain queue",
  );
  assert(
    f.state.rpc.length === 1 && f.state.rpc[0].p_actor_user_id === U &&
      f.state.rpc[0].p_auth_session_id === S,
    "Actor must come only from S1",
  );
});

Deno.test("S5 queue proof/session failures expose only fixed diagnostic stages", async () => {
  const inputFailure = fixture("queue", {});
  const malformed = inputFailure.request();
  const malformedHeaders = new Headers(malformed.headers);
  malformedHeaders.set("authorization", "Bearer e30.e30.c2ln");
  const inputResponse = await inputFailure.handler(
    new Request(malformed, { headers: malformedHeaders }),
  );
  assert(inputResponse.status === 401, "Malformed claims remain denied");
  assert(
    inputResponse.headers.get("x-laibe-auth-stage") === "SESSION_STATE",
    "Proof rejection has a fixed stage",
  );

  const providerFailure = fixture("queue", {});
  providerFailure.state.authStatus = 401;
  const providerResponse = await providerFailure.handler(
    providerFailure.request(),
  );
  assert(
    providerResponse.status === 401,
    "Auth provider rejection remains denied",
  );
  assert(
    providerResponse.headers.get("x-laibe-auth-stage") === "SESSION_STATE",
    "Auth session rejection has a fixed stage",
  );

  const identityFailure = fixture("queue", {});
  identityFailure.state.authStatus = 201;
  identityFailure.state.authUserId = A;
  const identityResponse = await identityFailure.handler(
    identityFailure.request(),
  );
  assert(identityResponse.status === 401, "Identity mismatch remains denied");
  assert(
    identityResponse.headers.get("x-laibe-auth-stage") === "SESSION_STATE",
    "Identity rejection has a fixed stage",
  );

  const sessionFailure = fixture("queue", {});
  sessionFailure.state.live = false;
  const sessionResponse = await sessionFailure.handler(
    sessionFailure.request(),
  );
  assert(sessionResponse.status === 401, "Inactive session remains denied");
  assert(
    sessionResponse.headers.get("x-laibe-auth-stage") === "SESSION_STATE",
    "Session rejection has a fixed stage",
  );

  const serviceFailure = fixture("queue", {});
  serviceFailure.state.fault = true;
  const serviceResponse = await serviceFailure.handler(
    serviceFailure.request(),
  );
  assert(serviceResponse.status === 503, "Auth outage remains unavailable");
  assert(
    serviceResponse.headers.get("x-laibe-auth-stage") === "SESSION_SERVICE",
    "Service failure has a fixed stage",
  );

  const sessionServiceFailure = fixture("queue", {});
  sessionServiceFailure.state.sessionFault = true;
  const sessionServiceResponse = await sessionServiceFailure.handler(
    sessionServiceFailure.request(),
  );
  assert(
    sessionServiceResponse.status === 503,
    "Session outage remains unavailable",
  );
  assert(
    sessionServiceResponse.headers.get("x-laibe-auth-stage") ===
      "SESSION_SERVICE",
    "Session service failure has a fixed stage",
  );

  const decision = fixture("decision", {});
  decision.state.authStatus = 401;
  const decisionResponse = await decision.handler(decision.request());
  assert(
    decisionResponse.headers.get("x-laibe-auth-stage") === null,
    "Diagnostic stage is limited to the queue route",
  );
  for (
    const response of [
      inputResponse,
      providerResponse,
      identityResponse,
      sessionResponse,
      serviceResponse,
      sessionServiceResponse,
    ]
  ) {
    assert(
      /^(SESSION_STATE|SESSION_SERVICE)$/u
        .test(
          response.headers.get("x-laibe-auth-stage") ?? "",
        ),
      "Stage values remain bounded",
    );
    assert(
      JSON.stringify(await response.json()) ===
        JSON.stringify({
          state: response.status === 401
            ? "AUTH_REQUIRED"
            : "CONTEXT_UNAVAILABLE",
        }),
      "Diagnostic header cannot change the closed response body",
    );
  }
});

Deno.test("S5 queue keysets retain PostgreSQL microseconds and UUID comparison", async () => {
  const a = {
    applicationId: "bbbbbbbb-1111-4111-8111-111111111111",
    version: 1,
    status: "pending",
    submittedAt: "2026-09-08T08:00:00.000001Z",
    displayName: "A",
    organization: "",
    phone: "",
    accountEmail: "",
    emailConfirmed: false,
  };
  const b = {
    ...a,
    applicationId: "aaaaaaaa-1111-4111-8111-111111111111",
    submittedAt: "2026-09-08T08:00:00.000002Z",
  };
  const dto = {
    schemaVersion: SCHEMA,
    state: "REGISTRATION_QUEUE_READY",
    applications: [a, b],
    nextCursor: null,
  };
  const f = fixture("queue", dto);
  assert(
    (await f.handler(f.request())).status === 200,
    "Submillisecond ordering cannot become a false service failure",
  );
  const g = fixture("queue", { ...dto, applications: [b] });
  assert(
    (await g.handler(
      g.request({
        cursor: {
          submittedAt: a.submittedAt,
          applicationId: a.applicationId.toUpperCase(),
        },
      }),
    )).status === 200,
    "Typed UUID cursor comparison",
  );
});
Deno.test("S5 actual entries disable gateway JWT and require the custom proof guard", async () => {
  const descriptor = Object.getOwnPropertyDescriptor(Deno, "env")!,
    oldFetch = globalThis.fetch;
  const env: Record<string, string> = {
    SUPABASE_URL: PROJECT,
    SUPABASE_SERVICE_ROLE_KEY: "synthetic-service-key-at-least-32-characters",
    LAIBE_DRS_APP_ORIGIN: ORIGIN,
    LAIBE_DRS_SESSION_SUCCESS_URL: `${ORIGIN}/pcm/reviewer/access/#login`,
    LAIBE_DRS_SESSION_COOKIE_NAME: "__Host-laibe-drs-session",
    LAIBE_DRS_SESSION_COOKIE_KEY_V1: base64url(new Uint8Array(32).fill(11)),
    LAIBE_DRS_BFF_PROOF_KEY_V1: base64url(new Uint8Array(32).fill(22)),
  };
  let calls = 0;
  try {
    const config = await Deno.readTextFile(
      new URL("../../../config.toml", import.meta.url),
    );
    assert(
      /\[functions\.drs-reviewer-registration-queue\]\r?\nverify_jwt = false/u
        .test(config) &&
        /\[functions\.drs-reviewer-registration-decision\]\r?\nverify_jwt = false/u
          .test(config),
      "Both governance entries accept only the custom proof guard",
    );
    Object.defineProperty(Deno, "env", {
      configurable: true,
      value: { get: (n: string) => env[n] },
    });
    globalThis.fetch = () => {
      calls++;
      throw Error("Unexpected Auth call");
    };
    for (const route of ["queue", "decision"]) {
      const module = await import(
        "../../drs-reviewer-registration-" + route + "/index.ts?s5-entry"
      );
      assert(
        module.VERIFY_JWT_REQUIRED === false,
        "Opaque proof reaches the same custom guard for both operations",
      );
      const body = route === "queue" ? { cursor: null } : input;
      const r = await module.handler(
        new Request(
          PROJECT + "/functions/v1/drs-reviewer-registration-" + route,
          {
            method: "POST",
            headers: {
              origin: ORIGIN,
              "sec-fetch-site": "same-origin",
              "content-type": "application/json",
            },
            body: JSON.stringify(body),
          },
        ),
      );
      assert(r.status === 401, "Missing proof reaches the custom guard");
    }
    assert(calls === 0, "No token means no provider request");
  } finally {
    Object.defineProperty(Deno, "env", descriptor);
    globalThis.fetch = oldFetch;
  }
});

Deno.test("S5 revoked Auth and provider fault stop before governance RPC", async () => {
  for (const failure of ["live", "fault"] as const) {
    const f = fixture("queue", {});
    if (failure === "live") f.state.live = false;
    else f.state.fault = true;
    const r = await f.handler(f.request());
    assert(
      r.status === (failure === "live" ? 401 : 503),
      "Auth failure classification",
    );
    assert(f.state.rpc.length === 0, "No governance work before verified Auth");
  }
});
Deno.test("S5 exact inputs reject forged authority, duplicate keys, invalid dates and body bounds", async () => {
  for (
    const body of [
      { ...input, actor: U },
      { ...input, caseId: A },
      { ...input, status: "approved" },
      { ...input, expectedVersion: "1" },
      { ...input, reason: " " },
      { ...input, reason: "a\nb" },
      { ...input, bindingValidUntil: null },
      { ...input, bindingValidUntil: "2026-02-31T00:00:00Z" },
      { ...input, decision: "reject" },
      { ...input, reason: "x".repeat(501) },
      { ...input, reason: "x".repeat(5000) },
      JSON.stringify(input).replace(
        '"expectedVersion":1',
        '"expectedVersion":1,"expectedVersion":1',
      ),
    ]
  ) {
    const f = fixture("decision", {});
    assert(
      (await f.handler(f.request(body))).status === 400,
      "Invalid decision input",
    );
    assert(f.state.rpc.length === 0, "Invalid input cannot reach governance");
  }
  for (
    const cursor of [{}, { submittedAt: "bad", applicationId: A }, {
      submittedAt: "2026-09-08T09:00:00Z",
      applicationId: A,
      limit: 25,
    }]
  ) {
    const f = fixture("queue", {});
    assert(
      (await f.handler(f.request({ cursor }))).status === 400,
      "Invalid cursor",
    );
  }
});
Deno.test("S5 strict queue status and account metadata cannot be coerced or augmented", async () => {
  const a = {
    applicationId: A,
    version: 1,
    status: "pending",
    submittedAt: "2026-09-08T08:00:00Z",
    displayName: "王小姐",
    organization: "",
    phone: "",
    accountEmail: "synthetic@example.invalid",
    emailConfirmed: true,
  };
  const dto = {
    schemaVersion: SCHEMA,
    state: "REGISTRATION_QUEUE_READY",
    applications: [a],
    nextCursor: null,
  };
  const f = fixture("queue", dto);
  assert((await f.handler(f.request())).status === 200, "Valid queue");
  for (
    const change of [
      { status: ["pending"] },
      { status: "approved" },
      { emailConfirmed: 1 },
      { version: "1" },
      { accountEmail: null },
      { userId: U },
    ]
  ) {
    const bad = fixture("queue", {
      ...dto,
      applications: [{ ...a, ...change }],
    });
    assert(
      (await bad.handler(bad.request())).status === 503,
      "Malformed queue must stay unavailable",
    );
  }
  for (
    const badDto of [
      { ...dto, applications: Array(26).fill(a) },
      { ...dto, applications: [a, a] },
      { ...dto, nextCursor: { submittedAt: a.submittedAt, applicationId: A } },
      {
        ...dto,
        applications: [],
        nextCursor: { submittedAt: a.submittedAt, applicationId: A },
      },
    ]
  ) {
    const bad = fixture("queue", badDto);
    assert(
      (await bad.handler(bad.request())).status === 503,
      "Queue bounds and cursor closure",
    );
  }
});
Deno.test("S5 sanitized SQL denial states retain their exact HTTP classifications", async () => {
  for (
    const [state, status] of Object.entries({
      AUTH_REQUIRED: 401,
      REGISTRATION_OPERATION_NOT_AUTHORIZED: 403,
      SELF_APPROVAL_NOT_ALLOWED: 403,
      INVALID_REQUEST: 400,
      APPLICATION_CONFLICT: 409,
      IDEMPOTENCY_CONFLICT: 409,
      APPLICANT_NOT_ELIGIBLE: 409,
      EXISTING_IDENTITY_REQUIRES_REVIEW: 409,
      CONTEXT_UNAVAILABLE: 503,
    })
  ) {
    const f = fixture("decision", { schemaVersion: SCHEMA, state });
    const r = await f.handler(f.request());
    assert(r.status === status, "Exact typed SQL denial");
    assert(
      Object.keys(await r.json()).join() === "state",
      "No internal details",
    );
  }
  for (
    const state of [
      ["AUTH_REQUIRED"],
      { state: "AUTH_REQUIRED" },
      null,
      0,
      "UNKNOWN",
    ]
  ) {
    const f = fixture("decision", { schemaVersion: SCHEMA, state });
    assert(
      (await f.handler(f.request())).status === 503,
      "Unknown/coerced SQL state",
    );
  }
});
Deno.test("S5 reject history has no qualification effect and malformed success stays closed", async () => {
  const body = { ...input, decision: "reject", bindingValidUntil: null };
  const dto = {
    schemaVersion: SCHEMA,
    state: "REGISTRATION_DECIDED",
    application: { applicationId: A, status: "rejected", version: 2 },
    decision: {
      decisionId: K,
      outcome: "reject",
      decidedAt: "2026-09-08T09:00:00Z",
    },
    qualification: { effect: "not_granted", validUntil: null },
    caseAccessGranted: false,
    replayed: true,
  };
  const f = fixture("decision", dto);
  assert(
    (await f.handler(f.request(body))).status === 200,
    "Reject exact history",
  );
  for (
    const change of [
      { caseAccessGranted: true },
      { replayed: "true" },
      { application: { ...dto.application, status: ["rejected"] } },
      { qualification: { effect: "granted", validUntil: null } },
      { decision: { ...dto.decision, outcome: "approve" } },
      { extra: "secret" },
    ]
  ) {
    const bad = fixture("decision", { ...dto, ...change });
    assert(
      (await bad.handler(bad.request(body))).status === 503,
      "Untrusted result projection",
    );
  }
});
Deno.test("S5 exact origin, POST path and query close before any operation", async () => {
  const f = fixture("queue", {});
  assert(
    (await f.handler(f.request({ cursor: null }, "https://external.invalid")))
      .status === 403,
    "Foreign origin",
  );
  assert(
    (await f.handler(f.request({ cursor: null }, ORIGIN, "?actor=" + U)))
      .status === 400,
    "Query selectors denied",
  );
  const get = new Request(
    PROJECT + "/functions/v1/drs-reviewer-registration-queue",
    { headers: { origin: ORIGIN } },
  );
  assert((await f.handler(get)).status === 400, "POST-only");
  assert(f.state.rpc.length === 0, "Shape/origin rejects before RPC");
});
Deno.test("S5 RED decision uses verified JWT expiry and projects zero case authority", async () => {
  const dto = {
    schemaVersion: SCHEMA,
    state: "REGISTRATION_DECIDED",
    application: { applicationId: A, status: "approved", version: 2 },
    decision: {
      decisionId: K,
      outcome: "approve",
      decidedAt: "2026-09-08T09:00:00Z",
    },
    qualification: { effect: "granted", validUntil: input.bindingValidUntil },
    caseAccessGranted: false,
    replayed: false,
  };
  const f = fixture("decision", dto), r = await f.handler(f.request());
  assert(r.status === 200, "Valid decision expected 200");
  assert(
    JSON.stringify(await r.json()) === JSON.stringify(dto),
    "Decision DTO must remain exact",
  );
  assert(
    f.state.rpc[0].p_jwt_expires_at === "2026-09-08T09:05:00.000Z",
    "JWT deadline must be S1 verified",
  );
});

Deno.test("S5 auth-bound proof bridge supplies queue and decision actor facts without browser JWT", async () => {
  const queue = {
    schemaVersion: SCHEMA,
    state: "REGISTRATION_QUEUE_READY",
    applications: [],
    nextCursor: null,
  };
  const decision = {
    schemaVersion: SCHEMA,
    state: "REGISTRATION_DECIDED",
    application: { applicationId: A, status: "approved", version: 2 },
    decision: {
      decisionId: K,
      outcome: "approve",
      decidedAt: "2026-09-08T09:00:00Z",
    },
    qualification: { effect: "granted", validUntil: input.bindingValidUntil },
    caseAccessGranted: false,
    replayed: false,
  };
  for (
    const [route, reply] of [
      ["queue", queue],
      ["decision", decision],
    ] as const
  ) {
    const rpc: Array<{ body: Record<string, unknown>; headers: Headers }> = [];
    const proof =
      "Bearer e30.eyJhdWQiOiJsYWliZTpkcnMtc2Vzc2lvbi1iZmYifQ.cHJvb2Y";
    const cookie = "__Host-laibe-drs-session=opaque-cookie";
    let guardCalls = 0;
    const handler = createRegistrationGovernanceHandler(route, {
      env: {
        get: (name: string) =>
          ({
            SUPABASE_URL: PROJECT,
            SUPABASE_SERVICE_ROLE_KEY:
              "synthetic-service-key-at-least-32-characters",
            LAIBE_DRS_APP_ORIGIN: ORIGIN,
          } as Record<string, string>)[name],
      },
      now: () => NOW,
      guard: {
        authorize: (request: Request) => {
          guardCalls++;
          assert(
            request.headers.get("authorization") === proof &&
              request.headers.get("cookie") === cookie,
            "Guard must receive only the opaque proof and selected cookie",
          );
          return Promise.resolve({
            authenticatedUserId: U,
            specialistId: "55555555-5555-4555-8555-555555555555",
            authorizationSubject:
              "drs-specialist:55555555-5555-4555-8555-555555555555",
            selectedCaseId: "66666666-6666-4666-8666-666666666666",
            caseStatus: "active" as const,
            accessMode: "read_only" as const,
            proofExpiresAt: "2026-09-08T09:01:00.000Z",
            verifiedAuthSession: {
              userId: U,
              authSessionId: S,
              expiresAtEpochSeconds: NOW / 1000 + 300,
            },
          });
        },
      },
      fetch: (_url, init) => {
        const requestInit = init as
          | Readonly<{
            body?: BodyInit | null;
            headers?: HeadersInit;
          }>
          | undefined;
        rpc.push({
          body: JSON.parse(String(requestInit?.body)),
          headers: new Headers(requestInit?.headers),
        });
        return Promise.resolve(Response.json(reply));
      },
    });
    const body = route === "queue" ? { cursor: null } : input;
    const response = await handler(
      new Request(
        `${PROJECT}/functions/v1/drs-reviewer-registration-${route}`,
        {
          method: "POST",
          headers: {
            origin: ORIGIN,
            authorization: proof,
            cookie,
            "sec-fetch-site": "same-origin",
            "content-type": "application/json",
          },
          body: JSON.stringify(body),
        },
      ),
    );
    assert(response.status === 200, `${route} bridge must succeed`);
    assert(guardCalls === 1 && rpc.length === 1, "One guard and one RPC only");
    assert(
      rpc[0].body.p_actor_user_id === U &&
        rpc[0].body.p_auth_session_id === S &&
        rpc[0].body.p_jwt_expires_at === "2026-09-08T09:05:00.000Z",
      "RPC identity and expiry must come from the server-authenticated binding",
    );
    assert(
      rpc[0].headers.get("authorization") ===
          "Bearer synthetic-service-key-at-least-32-characters" &&
        !JSON.stringify(rpc[0].body).includes(proof) &&
        !JSON.stringify(rpc[0].body).includes(cookie),
      "Service role stays transport-only and no browser credential enters RPC args",
    );
  }
});

for (
  const [label, status] of [
    ["expired proof", 401],
    ["revoked Auth session", 401],
    ["tampered proof", 401],
    ["tampered cookie", 401],
    ["withdrawn authority", 403],
    ["session verifier outage", 503],
  ] as const
) {
  Deno.test(`S5 ${label} causes zero governance business writes`, async () => {
    let rpcCalls = 0;
    const handler = createRegistrationGovernanceHandler("decision", {
      env: {
        get: (name: string) =>
          ({
            SUPABASE_URL: PROJECT,
            SUPABASE_SERVICE_ROLE_KEY:
              "synthetic-service-key-at-least-32-characters",
            LAIBE_DRS_APP_ORIGIN: ORIGIN,
          } as Record<string, string>)[name],
      },
      now: () => NOW,
      guard: {
        authorize: () =>
          Promise.reject(
            new DrsIdentityError(
              status === 401
                ? "AUTH_REQUIRED"
                : status === 403
                ? "CASE_NOT_AUTHORIZED"
                : "CONTEXT_UNAVAILABLE",
              status,
            ),
          ),
      },
      fetch: () => {
        rpcCalls++;
        return Promise.resolve(Response.json({}));
      },
    });
    const response = await handler(
      new Request(
        `${PROJECT}/functions/v1/drs-reviewer-registration-decision`,
        {
          method: "POST",
          headers: {
            origin: ORIGIN,
            authorization: "Bearer e30.e30.cHJvb2Y",
            cookie: "__Host-laibe-drs-session=opaque-cookie",
            "sec-fetch-site": "same-origin",
            "content-type": "application/json",
          },
          body: JSON.stringify(input),
        },
      ),
    );
    assert(response.status === status, `${label} status must remain closed`);
    assert(rpcCalls === 0, `${label} must stop before governance RPC`);
  });
}

Deno.test("S5 proof crossing expiry after guard stops queue and decision RPC", async () => {
  for (const route of ["queue", "decision"] as const) {
    let clock = NOW;
    let rpcCalls = 0;
    const handler = createRegistrationGovernanceHandler(route, {
      env: {
        get: (name: string) =>
          ({
            SUPABASE_URL: PROJECT,
            SUPABASE_SERVICE_ROLE_KEY:
              "synthetic-service-key-at-least-32-characters",
            LAIBE_DRS_APP_ORIGIN: ORIGIN,
          } as Record<string, string>)[name],
      },
      now: () => clock,
      guard: {
        authorize: () => {
          clock = NOW + 60_000;
          return Promise.resolve({
            authenticatedUserId: U,
            specialistId: "55555555-5555-4555-8555-555555555555",
            authorizationSubject:
              "drs-specialist:55555555-5555-4555-8555-555555555555",
            selectedCaseId: "66666666-6666-4666-8666-666666666666",
            caseStatus: "active" as const,
            accessMode: "read_only" as const,
            proofExpiresAt: "2026-09-08T09:01:00.000Z",
            verifiedAuthSession: {
              userId: U,
              authSessionId: S,
              expiresAtEpochSeconds: NOW / 1000 + 300,
            },
          });
        },
      },
      fetch: () => {
        rpcCalls++;
        return Promise.resolve(Response.json({}));
      },
    });
    const response = await handler(
      new Request(
        `${PROJECT}/functions/v1/drs-reviewer-registration-${route}`,
        {
          method: "POST",
          headers: {
            origin: ORIGIN,
            authorization: "Bearer e30.e30.cHJvb2Y",
            cookie: "__Host-laibe-drs-session=opaque-cookie",
            "sec-fetch-site": "same-origin",
            "content-type": "application/json",
          },
          body: JSON.stringify(route === "queue" ? { cursor: null } : input),
        },
      ),
    );
    assert(response.status === 401, `${route} crossed proof expiry`);
    assert(rpcCalls === 0, `${route} must stop before governance RPC`);
  }
});
