import { createRegistrationGovernanceHandler } from "./handler.ts";
import { base64url } from "../drs-auth/auth-bound-session.ts";
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
    fetch: async (url: string | URL | Request, init?: RequestInit) => {
      await Promise.resolve();
      if (state.fault) return Response.json({}, { status: 503 });
      const path = new URL(String(url)).pathname;
      if (path === "/auth/v1/user") return Response.json({ id: U });
      if (path.endsWith("/auth_session_validation_v1")) {
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
Deno.test("S5 actual JWT entries declare their gateway mode and still require custom Auth", async () => {
  const descriptor = Object.getOwnPropertyDescriptor(Deno, "env")!,
    oldFetch = globalThis.fetch;
  const env: Record<string, string> = {
    SUPABASE_URL: PROJECT,
    SUPABASE_SERVICE_ROLE_KEY: "synthetic-service-key-at-least-32-characters",
    LAIBE_DRS_APP_ORIGIN: ORIGIN,
  };
  let calls = 0;
  try {
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
        module.VERIFY_JWT_REQUIRED === (route === "decision"),
        "Queue uses custom Auth while decision retains gateway verification",
      );
      const body = route === "queue" ? { cursor: null } : input;
      const r = await module.handler(
        new Request(PROJECT + "/drs-reviewer-registration-" + route, {
          method: "POST",
          headers: { origin: ORIGIN, "content-type": "application/json" },
          body: JSON.stringify(body),
        }),
      );
      assert(r.status === 401, "Short path reaches true Auth-required entry");
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
