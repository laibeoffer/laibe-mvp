import { createDrsReviewerRegistrationApplicationsHandler } from "./drs-reviewer-registration-applications.ts";
import { VERIFY_JWT_REQUIRED as registrationJwtRequired } from "../../drs-reviewer-registration-applications/index.ts";
import { VERIFY_JWT_REQUIRED as passwordJwtRequired } from "../../drs-password-auth-session/index.ts";

const USER = "11111111-1111-4111-8111-111111111111";
const SID = "22222222-2222-4222-8222-222222222222";
const APP = "33333333-3333-4333-8333-333333333333";
const ORIGIN = "https://synthetic-drs.example";
const PROJECT = "https://synthetic-auth-project.supabase.co";
const SCHEMA = "laibe.drs-reviewer-self-application.v1";
const PATH = "/functions/v1/drs-reviewer-registration-applications";
const CONTACT = {
  displayName: " 王小明 ",
  organization: " 測試公司 ",
  phone: " 0912345678 ",
};
function assert(value: unknown, message: string): asserts value {
  if (!value) throw new Error(message);
}
function fixture() {
  const now = Date.now();
  const state = {
    active: true,
    unavailable: false,
    revokedAtRpc: false,
    created: true,
    status: "pending" as unknown,
    none: false,
    malformed: false,
    rpcCalls: [] as Record<string, unknown>[],
  };
  const values: Record<string, string> = {
    SUPABASE_URL: PROJECT,
    SUPABASE_SERVICE_ROLE_KEY: "synthetic-service-key-at-least-thirty-two",
    LAIBE_DRS_APP_ORIGIN: ORIGIN,
  };
  const encode = (v: unknown) =>
    btoa(JSON.stringify(v)).replaceAll("+", "-").replaceAll("/", "_")
      .replaceAll("=", "");
  const token = `${encode({ alg: "HS256" })}.${
    encode({
      sub: USER,
      session_id: SID,
      iss: PROJECT + "/auth/v1",
      aud: "authenticated",
      exp: Math.floor(now / 1000) + 300,
    })
  }.c3ludGhldGlj`;
  const fetcher: typeof fetch = (input, init) => {
    const path = new URL(String(input)).pathname;
    if (state.unavailable) {
      return Promise.resolve(Response.json({}, { status: 503 }));
    }
    if (path === "/auth/v1/user") {
      return Promise.resolve(Response.json({ id: USER }));
    }
    if (path.endsWith("/auth_session_validation_v1")) {
      return Promise.resolve(
        Response.json({
          schemaVersion: "laibe.auth-session-validation.v1",
          active: state.active,
        }),
      );
    }
    assert(
      path.endsWith("/drs_reviewer_self_application_v1"),
      "No role, case or provider endpoint may be called",
    );
    state.rpcCalls.push(JSON.parse(String((init as RequestInit)?.body)));
    if (state.revokedAtRpc) {
      return Promise.resolve(
        Response.json({ schemaVersion: SCHEMA, state: "AUTH_REQUIRED" }),
      );
    }
    const application = state.none ? null : {
      applicationId: APP,
      submittedAt: "2026-09-08T08:00:00.000Z",
      status: state.status,
    };
    return Promise.resolve(Response.json({
      schemaVersion: SCHEMA,
      state: state.none
        ? "NO_APPLICATION"
        : `APPLICATION_${String(state.status).toUpperCase()}`,
      application,
      created: state.none ? false : state.created,
      ...(state.malformed ? { userId: USER } : {}),
    }));
  };
  const handler = createDrsReviewerRegistrationApplicationsHandler({
    env: { get: (name: string) => values[name] },
    fetch: fetcher,
    now: () => now,
  });
  const request = (
    method = "POST",
    body: unknown = CONTACT,
    origin = ORIGIN,
    bearer = token,
    query = "",
  ) =>
    new Request(PROJECT + PATH + query, {
      method,
      headers: {
        origin,
        authorization: `Bearer ${bearer}`,
        "content-type": "application/json",
      },
      ...(method === "POST" ? { body: JSON.stringify(body) } : {}),
    });
  return {
    state,
    values,
    handler,
    request,
    jwtExpiry: new Date((Math.floor(now / 1000) + 300) * 1000).toISOString(),
  };
}

Deno.test("S3 P2 status is a primitive string enum and never coerces service values", async () => {
  const f = fixture();
  f.state.created = false;
  for (const status of ["pending", "approved", "rejected"]) {
    f.state.status = status;
    const response = await f.handler(f.request("GET"));
    assert(
      response.status === 200 &&
        (await response.json()).application.status === status,
      "Primitive status positive failed",
    );
  }
  for (
    const status of [
      ["pending"],
      ["approved"],
      ["rejected"],
      {},
      null,
      1,
      false,
    ]
  ) {
    f.state.status = status;
    const response = await f.handler(f.request("GET"));
    assert(
      response.status === 503,
      `Non-string status expected 503; got ${response.status}`,
    );
  }
});
Deno.test("S3 P2 JWT-only registration and password entries require gateway JWT verification", () => {
  assert(
    registrationJwtRequired && passwordJwtRequired,
    "Both JWT-only entries must declare gateway verification",
  );
});
Deno.test("S3 creates only the verified caller pending application with trimmed contact fields", async () => {
  const f = fixture();
  const response = await f.handler(f.request());
  assert(response.status === 201, `Expected 201, got ${response.status}`);
  assert(
    JSON.stringify(f.state.rpcCalls) ==
      JSON.stringify([{
        p_authenticated_user_id: USER,
        p_auth_session_id: SID,
        p_jwt_expires_at: f.jwtExpiry,
        p_create: true,
        p_display_name: "王小明",
        p_organization: "測試公司",
        p_phone: "0912345678",
      }]),
    "RPC must use only verified identity and bounded contact",
  );
  const body = await response.json();
  assert(
    body.schemaVersion === SCHEMA && body.state === "APPLICATION_PENDING" &&
      body.application.status === "pending",
    "Exact pending DTO required",
  );
  assert(
    Object.keys(body).sort().join(",") === "application,schemaVersion,state",
    "No identity/qualification or internal created flag may leak",
  );
});
Deno.test("S3 GET absence/existing and repeated POST preserve the minimal self status DTO", async () => {
  const f = fixture();
  f.state.none = true;
  let response = await f.handler(f.request("GET"));
  assert(response.status === 200, "GET absence expected 200");
  assert(
    JSON.stringify(await response.json()) ===
      JSON.stringify({
        schemaVersion: SCHEMA,
        state: "NO_APPLICATION",
        application: null,
      }),
    "Absence must be explicit",
  );
  f.state.none = false;
  f.state.created = false;
  for (const status of ["pending", "approved", "rejected"]) {
    f.state.status = status;
    response = await f.handler(f.request("GET"));
    assert(response.status === 200, "Self history should remain readable");
    assert(
      (await response.json()).state === `APPLICATION_${status.toUpperCase()}`,
      "History status mismatch",
    );
  }
  f.state.status = "pending";
  response = await f.handler(f.request());
  assert(response.status === 200, "Repeated POST must return existing");
});
Deno.test("S3 revoked Auth or database recheck denial cannot create an application", async () => {
  const f = fixture();
  f.state.active = false;
  let response = await f.handler(f.request());
  assert(
    response.status === 401 && f.state.rpcCalls.length === 0,
    "Revoked session reached application RPC",
  );
  f.state.active = true;
  f.state.revokedAtRpc = true;
  response = await f.handler(f.request());
  assert(
    response.status === 401,
    "Late session revocation must remain auth denial",
  );
});
Deno.test("S3 unavailable/malformed service response remains 503 without fake empty or success", async () => {
  const f = fixture();
  f.state.unavailable = true;
  assert(
    (await f.handler(f.request())).status === 503,
    "Verifier unavailable expected 503",
  );
  f.state.unavailable = false;
  f.state.malformed = true;
  assert(
    (await f.handler(f.request())).status === 503,
    "Malformed RPC must fail closed",
  );
});
Deno.test("S3 rejects authority inputs, control characters, bounds, nonstrings and query selectors", async () => {
  const f = fixture();
  for (
    const invalid of [
      { ...CONTACT, userId: USER },
      { ...CONTACT, status: "approved" },
      { ...CONTACT, role: "admin" },
      { ...CONTACT, caseId: APP },
      { ...CONTACT, actor: USER },
      { ...CONTACT, decision: "approved" },
      { ...CONTACT, displayName: " " },
      { ...CONTACT, displayName: "a".repeat(81) },
      { ...CONTACT, organization: "a".repeat(161) },
      { ...CONTACT, phone: "a".repeat(33) },
      { ...CONTACT, displayName: "a\n" },
      { ...CONTACT, phone: 123 },
      null,
      [],
    ]
  ) {
    assert(
      (await f.handler(f.request("POST", invalid))).status === 400,
      "Invalid input must reject",
    );
  }
  assert(
    (await f.handler(
      f.request("GET", null, ORIGIN, undefined, "?userId=" + USER),
    )).status === 400,
    "GET caller selector forbidden",
  );
  assert(
    f.state.rpcCalls.length === 0,
    "Invalid body must never reach application RPC",
  );
});
Deno.test("S3 exact origin and method gate runs before Auth or application work", async () => {
  const f = fixture();
  assert(
    (await f.handler(f.request("POST", CONTACT, "https://evil.example")))
      .status === 403,
    "Foreign origin must reject",
  );
  assert(
    (await f.handler(f.request("DELETE"))).status === 400,
    "Delete is not self-intake",
  );
  const preflight = await f.handler(
    new Request(PROJECT + PATH, {
      method: "OPTIONS",
      headers: {
        origin: ORIGIN,
        "access-control-request-method": "GET",
        "access-control-request-headers": "authorization,apikey",
      },
    }),
  );
  assert(
    preflight.status === 204 &&
      preflight.headers.get("access-control-allow-origin") === ORIGIN,
    "GET preflight should succeed",
  );
  assert(
    f.state.rpcCalls.length === 0,
    "Preflight/denials cannot create an application",
  );
});

Deno.test("S3 bounded body rejects duplicate members, oversized input and C1 controls", async () => {
  const f = fixture();
  for (
    const raw of [
      '{"displayName":"First","displayName":"Second","organization":"","phone":""}',
      JSON.stringify({ ...CONTACT, displayName: "a".repeat(5000) }),
      JSON.stringify({ ...CONTACT, phone: "a\u0080" }),
    ]
  ) {
    const response = await f.handler(
      new Request(PROJECT + PATH, {
        method: "POST",
        headers: f.request().headers,
        body: raw,
      }),
    );
    assert(response.status === 400, "Invalid bounded body must reject");
  }
  assert(f.state.rpcCalls.length === 0, "Rejected body reached persistence");
});
