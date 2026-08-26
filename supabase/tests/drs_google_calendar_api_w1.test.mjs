// deno-lint-ignore-file require-await -- injected async ports intentionally mirror production Promise interfaces
import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import test from "node:test";

const root = new URL("../", import.meta.url);
const urls = {
  authorization: new URL(
    "functions/_shared/google-calendar/drs-specialist-authorization.ts",
    root,
  ),
  oauth: new URL(
    "functions/_shared/google-calendar/google-oauth-adapter.ts",
    root,
  ),
  grant: new URL("functions/drs-google-calendar-grant/index.ts", root),
  start: new URL("functions/drs-google-calendar-oauth-start/index.ts", root),
  callback: new URL(
    "functions/drs-google-calendar-oauth-callback/index.ts",
    root,
  ),
  revoke: new URL("functions/drs-google-calendar-revoke/index.ts", root),
  events: new URL("functions/drs-google-calendar-events-read/index.ts", root),
  composition: new URL(
    "functions/_shared/drs-auth/drs-bff-route-composition.ts",
    root,
  ),
};

const AUTH_USER_ID = "41111111-1111-4111-8111-111111111111";
const CASE_ID = "42222222-2222-4222-8222-222222222222";
const OTHER_CASE_ID = "43333333-3333-4333-8333-333333333333";
const SPECIALIST_ID = "44444444-4444-4444-8444-444444444444";
const ASSIGNMENT_ID = "45555555-5555-4555-8555-555555555555";
const AUTHORIZATION_SUBJECT =
  `drs-specialist:${SPECIALIST_ID}:assignment:${ASSIGNMENT_ID}`;
const DRS_REDIRECT =
  "https://project.supabase.co/functions/v1/drs-google-calendar-oauth-callback";
const CREDENTIAL_KEY = Buffer.alloc(32, 11).toString("base64url");
const TEST_CORS_OPTIONS = Object.freeze({
  allowedOrigins: Object.freeze(["https://laibe.test"]),
});

async function optionalImport(url) {
  try {
    return await import(url.href);
  } catch {
    return Object.freeze({});
  }
}

function authorizedFacts(overrides = {}) {
  return {
    authorized: true,
    authenticatedUserId: AUTH_USER_ID,
    currentCaseId: CASE_ID,
    selectedCaseId: CASE_ID,
    accountRole: "drs",
    authorizationSubject: AUTHORIZATION_SUBJECT,
    authBindingStatus: "active",
    specialistStatus: "active",
    assignmentStatus: "active",
    specialistId: SPECIALIST_ID,
    assignmentId: ASSIGNMENT_ID,
    validFrom: "2026-08-01T00:00:00.000Z",
    validUntil: "2026-09-01T00:00:00.000Z",
    terminatedAt: null,
    lockStatus: "locked",
    ...overrides,
  };
}

function rpcAuthorizedFacts(overrides = {}) {
  return {
    authorized: true,
    authenticated_user_id: AUTH_USER_ID,
    specialist_id: SPECIALIST_ID,
    assignment_id: ASSIGNMENT_ID,
    selected_case_id: CASE_ID,
    account_role: "drs",
    authorization_subject: AUTHORIZATION_SUBJECT,
    auth_binding_status: "active",
    specialist_status: "active",
    assignment_status: "active",
    valid_from: "2026-08-01T00:00:00.000Z",
    valid_until: "2026-09-01T00:00:00.000Z",
    terminated_at: null,
    lock_status: "locked",
    ...overrides,
  };
}

function postJson(url, body) {
  return new Request(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function endpointPort(overrides = {}) {
  return {
    runtimeReady: true,
    resolveAuthenticatedIdentity: async () => ({ userId: AUTH_USER_ID }),
    resolveAuthorization: async () => authorizedFacts(),
    loadGrant: async () => ({
      ok: true,
      state: "CONNECTED",
      grant: {
        authenticatedUserId: AUTH_USER_ID,
        selectedCaseId: CASE_ID,
        assignmentId: ASSIGNMENT_ID,
        accountRole: "drs",
        authorizationSubject: AUTHORIZATION_SUBJECT,
        connectionStatus: "connected",
        bindingStatus: "active",
        calendarId: "primary",
        timeZone: "Asia/Taipei",
      },
    }),
    revoke: async () => ({
      ok: true,
      state: "REVOKED",
      authenticatedUserId: AUTH_USER_ID,
      selectedCaseId: CASE_ID,
      assignmentId: ASSIGNMENT_ID,
      accountRole: "drs",
      authorizationSubject: AUTHORIZATION_SUBJECT,
    }),
    readEvents: async () => ({
      ok: true,
      state: "CONNECTED",
      authenticatedUserId: AUTH_USER_ID,
      selectedCaseId: CASE_ID,
      assignmentId: ASSIGNMENT_ID,
      accountRole: "drs",
      authorizationSubject: AUTHORIZATION_SUBJECT,
      timeZone: "Asia/Taipei",
      items: [],
    }),
    ...overrides,
  };
}

function bffContext(overrides = {}) {
  return Object.freeze({
    authenticatedUserId: AUTH_USER_ID,
    specialistId: SPECIALIST_ID,
    selectedCaseId: CASE_ID,
    caseStatus: "ACTIVE",
    accessMode: "read_only",
    authorizationSubject: AUTHORIZATION_SUBJECT,
    proofExpiresAt: "2099-01-01T00:00:00.000Z",
    ...overrides,
  });
}

function acceptedBffGuard(overrides = {}, onAuthorize = () => {}) {
  return Object.freeze({
    async authorize(request) {
      onAuthorize(request);
      return bffContext(overrides);
    },
  });
}

function rejectingBffGuard(error, onAuthorize = () => {}) {
  return Object.freeze({
    async authorize(request) {
      onAuthorize(request);
      throw error;
    },
  });
}

test("server-only strategy fails closed without the A14 authority adapter", async () => {
  const authorization = await optionalImport(urls.authorization);
  assert.equal(
    typeof authorization.createDrsSpecialistAuthorizationStrategy,
    "function",
  );
  const strategy = authorization.createDrsSpecialistAuthorizationStrategy();
  const result = await strategy.resolveAuthorization({
    authenticatedUserId: AUTH_USER_ID,
    accountRole: "drs",
    pending: null,
  });
  assert.equal(result, null);
});

test("strategy accepts only exact active specialist assignment and server-selected case facts", async () => {
  const authorization = await optionalImport(urls.authorization);
  assert.equal(
    typeof authorization.createDrsSpecialistAuthorizationStrategy,
    "function",
  );
  let observed = null;
  const strategy = authorization.createDrsSpecialistAuthorizationStrategy({
    resolveAuthorizationFacts: async (input) => {
      observed = input;
      return authorizedFacts({
        email: "not-authority@example.test",
        user_metadata: { role: "drs" },
      });
    },
  });
  const result = await strategy.resolveAuthorization({
    authenticatedUserId: AUTH_USER_ID,
    accountRole: "drs",
    pending: null,
    caseId: OTHER_CASE_ID,
  });

  assert.deepEqual(observed, {
    authenticatedUserId: AUTH_USER_ID,
    accountRole: "drs",
    pending: null,
  });
  assert.deepEqual(result, authorizedFacts());
  assert.equal(Object.hasOwn(result, "email"), false);
  assert.equal(Object.hasOwn(result, "user_metadata"), false);
});

test("wrong specialist, inactive assignment, wrong case and cross-case pending facts are denied", async () => {
  const authorization = await optionalImport(urls.authorization);
  assert.equal(
    typeof authorization.createDrsSpecialistAuthorizationStrategy,
    "function",
  );
  const variants = [
    { authenticatedUserId: "attacker" },
    { accountRole: "owner" },
    { authBindingStatus: "revoked" },
    { specialistStatus: "inactive" },
    { assignmentStatus: "revoked" },
    { currentCaseId: OTHER_CASE_ID },
    { selectedCaseId: OTHER_CASE_ID },
    { selectedCaseId: "", assignments: [ASSIGNMENT_ID, "other"] },
    { authorizationSubject: "drs-specialist:other:assignment:other" },
    { assignmentId: "46666666-6666-4666-8666-666666666666" },
    { validFrom: "invalid" },
    { validUntil: "2026-07-01T00:00:00.000Z" },
    { terminatedAt: "2026-08-20T00:00:00.000Z" },
    { membership: { role: "owner", status: "active" } },
    { lockStatus: "unlocked" },
  ];

  for (const variant of variants) {
    const strategy = authorization.createDrsSpecialistAuthorizationStrategy({
      resolveAuthorizationFacts: async () => authorizedFacts(variant),
    });
    const result = await strategy.resolveAuthorization({
      authenticatedUserId: AUTH_USER_ID,
      accountRole: "drs",
      pending: {
        currentCaseId: CASE_ID,
        authorizationSubject: AUTHORIZATION_SUBJECT,
        assignmentId: ASSIGNMENT_ID,
      },
    });
    assert.equal(result, null, JSON.stringify(variant));
  }
});

test("Supabase strategy uses one server RPC and forwards only pending authority expectations", async () => {
  const authorization = await optionalImport(urls.authorization);
  assert.equal(
    typeof authorization.createSupabaseDrsSpecialistAuthorizationStrategy,
    "function",
  );
  let rpcBody = null;
  const strategy = authorization
    .createSupabaseDrsSpecialistAuthorizationStrategy({
      env: {
        get(name) {
          return {
            SUPABASE_URL: "https://project.supabase.co",
            SUPABASE_SERVICE_ROLE_KEY: "server-secret",
          }[name];
        },
      },
      fetch: async (input, init) => {
        assert.equal(
          String(input),
          "https://project.supabase.co/rest/v1/rpc/drs_google_calendar_authorize_v1",
        );
        rpcBody = JSON.parse(init.body);
        return Response.json(rpcAuthorizedFacts());
      },
    });

  const result = await strategy.resolveAuthorization({
    authenticatedUserId: AUTH_USER_ID,
    accountRole: "drs",
    pending: {
      currentCaseId: CASE_ID,
      authorizationSubject: AUTHORIZATION_SUBJECT,
      assignmentId: ASSIGNMENT_ID,
    },
  });
  assert.deepEqual(rpcBody, {
    p_authenticated_user_id: AUTH_USER_ID,
    p_expected_case_id: CASE_ID,
    p_expected_authorization_subject: AUTHORIZATION_SUBJECT,
    p_expected_assignment_id: ASSIGNMENT_ID,
  });
  assert.deepEqual(result, authorizedFacts());
});

test("authenticated DRS OAuth start returns 403 when the A14 authority adapter denies and never falls back", async () => {
  const authorization = await optionalImport(urls.authorization);
  const oauth = await optionalImport(urls.oauth);
  const start = await optionalImport(urls.start);
  const calls = [];
  const runtime = {
    env: {
      get(name) {
        return {
          SUPABASE_URL: "https://project.supabase.co",
          SUPABASE_SERVICE_ROLE_KEY: "server-secret",
          GOOGLE_CALENDAR_CLIENT_ID: "mock-client-id",
          GOOGLE_CALENDAR_CLIENT_SECRET: "mock-client-secret",
          GOOGLE_CALENDAR_DRS_REDIRECT_URI: DRS_REDIRECT,
          GOOGLE_CALENDAR_CREDENTIAL_KEY: CREDENTIAL_KEY,
        }[name];
      },
    },
    fetch: async (input) => {
      const url = String(input);
      calls.push(url);
      if (url.endsWith("/auth/v1/user")) {
        return Response.json({ id: AUTH_USER_ID });
      }
      if (url.endsWith("/rpc/drs_google_calendar_authorize_v1")) {
        return Response.json({
          authorized: false,
          state: "DRS_AUTHORIZATION_ADAPTER_UNAVAILABLE",
        });
      }
      return Response.json({ error: "unexpected" }, { status: 500 });
    },
  };
  const strategy = authorization
    .createSupabaseDrsSpecialistAuthorizationStrategy(runtime);
  const dependencies = oauth.createSupabaseGoogleCalendarOAuthDependencies(
    "drs",
    { ...runtime, drsAuthorizationStrategy: strategy },
  );
  const handler = start.createDrsGoogleCalendarOauthStartHandler(
    dependencies,
    TEST_CORS_OPTIONS,
    acceptedBffGuard(),
    strategy,
  );
  const response = await handler(
    new Request("https://laibe.test/start", {
      method: "POST",
      headers: {
        authorization: "Bearer local-test-session",
        "content-type": "application/json",
      },
      body: "{}",
    }),
  );
  assert.equal(response.status, 403);
  assert.equal(
    calls.filter((url) =>
      url.includes("case_member_google_calendar_authorize_v1") ||
      url.includes("owner-google-calendar") ||
      url.includes("vendor-google-calendar")
    ).length,
    0,
  );
});

test("grant consumes accepted BFF authority before Calendar work and returns a minimal projection", async () => {
  const grant = await optionalImport(urls.grant);
  const composition = await optionalImport(urls.composition);
  assert.equal(typeof grant.createDrsGoogleCalendarGrantHandler, "function");
  const order = [];
  let legacyIdentityCalls = 0;
  const guarded = grant.createDrsGoogleCalendarGrantHandler(
    endpointPort({
      resolveAuthenticatedIdentity: async () => {
        legacyIdentityCalls += 1;
        return { userId: AUTH_USER_ID };
      },
      resolveAuthorization: async (identity, pending) => {
        order.push("calendar-authority");
        assert.deepEqual(identity, { userId: AUTH_USER_ID });
        assert.equal(pending, null);
        return authorizedFacts();
      },
    }),
    TEST_CORS_OPTIONS,
    acceptedBffGuard({}, () => order.push("bff-guard")),
  );

  const unavailable = grant.createDrsGoogleCalendarGrantHandler(
    endpointPort({ runtimeReady: false }),
    TEST_CORS_OPTIONS,
    acceptedBffGuard(),
  );
  const unavailableResponse = await unavailable(
    postJson("https://laibe.test/grant", {}),
  );
  assert.equal(unavailableResponse.status, 503);
  assert.deepEqual(await unavailableResponse.json(), {
    state: "DRS_AUTHORIZATION_UNAVAILABLE",
  });

  const missingSession = grant.createDrsGoogleCalendarGrantHandler(
    endpointPort(),
    TEST_CORS_OPTIONS,
    rejectingBffGuard(
      new composition.DrsBffRouteGuardError("AUTH_REQUIRED", 401),
    ),
  );
  assert.equal(
    (await missingSession(postJson("https://laibe.test/grant", {}))).status,
    401,
  );

  const noAssignment = grant.createDrsGoogleCalendarGrantHandler(
    endpointPort({ resolveAuthorization: async () => null }),
    TEST_CORS_OPTIONS,
    acceptedBffGuard(),
  );
  assert.equal(
    (await noAssignment(postJson("https://laibe.test/grant", {}))).status,
    403,
  );

  const response = await guarded(postJson("https://laibe.test/grant", {}));
  assert.equal(response.status, 200);
  assert.deepEqual(order, ["bff-guard", "calendar-authority"]);
  assert.equal(legacyIdentityCalls, 0);
  assert.deepEqual(await response.json(), {
    state: "READY",
    grant: {
      schemaVersion: "laibe.drs-calendar-read.v1",
      caseId: CASE_ID,
      accessMode: "read_only",
      connectionStatus: "connected",
      timeZone: "Asia/Taipei",
    },
  });
});

test("grant rejects wrong-case, revoked, and secret-bearing records without leaking them", async () => {
  const grant = await optionalImport(urls.grant);
  assert.equal(typeof grant.createDrsGoogleCalendarGrantHandler, "function");
  const wrongCase = grant.createDrsGoogleCalendarGrantHandler(
    endpointPort({
      loadGrant: async () => ({
        ok: true,
        grant: {
          selectedCaseId: OTHER_CASE_ID,
          authenticatedUserId: AUTH_USER_ID,
          accountRole: "drs",
          authorizationSubject: AUTHORIZATION_SUBJECT,
          connectionStatus: "connected",
          bindingStatus: "active",
          calendarId: "primary",
          timeZone: "Asia/Taipei",
          accessToken: "must-not-leak",
        },
      }),
    }),
    TEST_CORS_OPTIONS,
    acceptedBffGuard(),
  );
  assert.equal(
    (await wrongCase(postJson("https://laibe.test/grant", {}))).status,
    403,
  );

  const revoked = grant.createDrsGoogleCalendarGrantHandler(
    endpointPort({
      loadGrant: async () => ({
        ok: false,
        state: "GOOGLE_CALENDAR_BINDING_REVOKED",
        accessToken: "must-not-leak",
      }),
    }),
    TEST_CORS_OPTIONS,
    acceptedBffGuard(),
  );
  const response = await revoked(postJson("https://laibe.test/grant", {}));
  assert.equal(response.status, 409);
  assert.deepEqual(await response.json(), {
    state: "GOOGLE_CALENDAR_BINDING_REVOKED",
  });
});

test("revoke reauthorizes through BFF and returns no binding or credential material", async () => {
  const revoke = await optionalImport(urls.revoke);
  assert.equal(typeof revoke.createDrsGoogleCalendarRevokeHandler, "function");
  const handler = revoke.createDrsGoogleCalendarRevokeHandler(
    endpointPort(),
    TEST_CORS_OPTIONS,
    acceptedBffGuard(),
  );
  const response = await handler(
    postJson("https://laibe.test/revoke", {}),
  );
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { state: "REVOKED" });

  const crossCase = revoke.createDrsGoogleCalendarRevokeHandler(
    endpointPort({
      revoke: async () => ({
        ok: true,
        state: "REVOKED",
        authenticatedUserId: AUTH_USER_ID,
        selectedCaseId: OTHER_CASE_ID,
        assignmentId: ASSIGNMENT_ID,
        accountRole: "drs",
        authorizationSubject: AUTHORIZATION_SUBJECT,
      }),
    }),
    TEST_CORS_OPTIONS,
    acceptedBffGuard(),
  );
  assert.equal(
    (await crossCase(
      postJson("https://laibe.test/revoke", {}),
    )).status,
    403,
  );
});

test("events-read validates the window and exposes only minimum event fields", async () => {
  const events = await optionalImport(urls.events);
  assert.equal(
    typeof events.createDrsGoogleCalendarEventsReadHandler,
    "function",
  );
  const handler = events.createDrsGoogleCalendarEventsReadHandler(
    endpointPort({
      readEvents: async () => ({
        ok: true,
        state: "CONNECTED",
        authenticatedUserId: AUTH_USER_ID,
        selectedCaseId: CASE_ID,
        assignmentId: ASSIGNMENT_ID,
        accountRole: "drs",
        authorizationSubject: AUTHORIZATION_SUBJECT,
        timeZone: "Asia/Taipei",
        items: [
          {
            id: "event-1",
            status: "confirmed",
            summary: "工地會勘",
            start: { dateTime: "2026-08-25T09:00:00+08:00" },
            end: { dateTime: "2026-08-25T10:00:00+08:00" },
            description: "private detail",
            attendees: [{ email: "private@example.test" }],
            hangoutLink: "https://meet.google.com/private",
          },
          {
            id: "event-2",
            status: "confirmed",
            summary: "   ",
            start: { date: "2026-08-26" },
            end: { date: "2026-08-27" },
          },
        ],
      }),
    }),
    TEST_CORS_OPTIONS,
    acceptedBffGuard(),
  );
  const invalid = await handler(
    postJson("https://laibe.test/events", {
      timeMin: "bad",
      timeMax: "also-bad",
    }),
  );
  assert.equal(invalid.status, 400);
  const tooWide = await handler(postJson("https://laibe.test/events", {
    timeMin: "2026-08-01T00:00:00.000Z",
    timeMax: "2026-09-02T00:00:00.000Z",
  }));
  assert.equal(tooWide.status, 400);
  const forgedAuthority = await handler(postJson("https://laibe.test/events", {
    timeMin: "2026-08-24T00:00:00.000Z",
    timeMax: "2026-08-31T00:00:00.000Z",
    case_id: OTHER_CASE_ID,
  }));
  assert.equal(forgedAuthority.status, 400);

  const response = await handler(postJson("https://laibe.test/events", {
    timeMin: "2026-08-24T00:00:00.000Z",
    timeMax: "2026-08-31T00:00:00.000Z",
  }));
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    state: "READY",
    caseId: CASE_ID,
    timeZone: "Asia/Taipei",
    window: {
      timeMin: "2026-08-24T00:00:00.000Z",
      timeMax: "2026-08-31T00:00:00.000Z",
    },
    events: [
      {
        title: "工地會勘",
        startsAt: "2026-08-25T09:00:00+08:00",
        endsAt: "2026-08-25T10:00:00+08:00",
        allDay: false,
      },
      {
        title: "未命名行程",
        startsAt: "2026-08-26",
        endsAt: "2026-08-27",
        allDay: true,
      },
    ],
  });
});

test("events-read drops provider events that the calendar transport date contract would reject", async () => {
  const events = await optionalImport(urls.events);
  const handler = events.createDrsGoogleCalendarEventsReadHandler(
    endpointPort({
      readEvents: async () => ({
        ok: true,
        state: "CONNECTED",
        authenticatedUserId: AUTH_USER_ID,
        selectedCaseId: CASE_ID,
        assignmentId: ASSIGNMENT_ID,
        accountRole: "drs",
        authorizationSubject: AUTHORIZATION_SUBJECT,
        timeZone: "Asia/Taipei",
        items: [
          {
            summary: "可接受事件",
            start: { dateTime: "2026-08-25T09:00:00.123+08:00" },
            end: { dateTime: "2026-08-25T10:00:00.123+08:00" },
          },
          {
            summary: "過長小數秒",
            start: { dateTime: "2026-08-25T09:00:00.1234+08:00" },
            end: { dateTime: "2026-08-25T10:00:00.1234+08:00" },
          },
          {
            summary: "不存在日期",
            start: { date: "2026-02-30" },
            end: { date: "2026-03-01" },
          },
          {
            summary: "反向時間",
            start: { dateTime: "2026-08-25T11:00:00+08:00" },
            end: { dateTime: "2026-08-25T10:00:00+08:00" },
          },
        ],
      }),
    }),
    TEST_CORS_OPTIONS,
    acceptedBffGuard(),
  );
  const response = await handler(postJson("https://laibe.test/events", {
    timeMin: "2026-08-24T00:00:00.000Z",
    timeMax: "2026-08-31T00:00:00.000Z",
  }));
  assert.equal(response.status, 200);
  assert.deepEqual((await response.json()).events, [{
    title: "可接受事件",
    startsAt: "2026-08-25T09:00:00.123+08:00",
    endsAt: "2026-08-25T10:00:00.123+08:00",
    allDay: false,
  }]);
});

test("events-read denies cross-case provider results and never returns provider errors", async () => {
  const events = await optionalImport(urls.events);
  assert.equal(
    typeof events.createDrsGoogleCalendarEventsReadHandler,
    "function",
  );
  const request = () =>
    postJson("https://laibe.test/events", {
      timeMin: "2026-08-24T00:00:00.000Z",
      timeMax: "2026-08-31T00:00:00.000Z",
    });
  const crossCase = events.createDrsGoogleCalendarEventsReadHandler(
    endpointPort({
      readEvents: async () => ({
        ok: true,
        authenticatedUserId: AUTH_USER_ID,
        selectedCaseId: OTHER_CASE_ID,
        assignmentId: ASSIGNMENT_ID,
        accountRole: "drs",
        authorizationSubject: AUTHORIZATION_SUBJECT,
        items: [],
      }),
    }),
    TEST_CORS_OPTIONS,
    acceptedBffGuard(),
  );
  assert.equal(
    (await crossCase(request())).status,
    403,
  );

  const providerFailure = events.createDrsGoogleCalendarEventsReadHandler(
    endpointPort({
      readEvents: async () => ({
        ok: false,
        state: "GOOGLE_CALENDAR_READ_UNAVAILABLE",
        providerError: { access_token: "secret", error_description: "raw" },
      }),
    }),
    TEST_CORS_OPTIONS,
    acceptedBffGuard(),
  );
  const response = await providerFailure(
    request(),
  );
  assert.equal(response.status, 409);
  assert.deepEqual(await response.json(), {
    state: "GOOGLE_CALENDAR_READ_UNAVAILABLE",
  });

  const truncated = events.createDrsGoogleCalendarEventsReadHandler(
    endpointPort({
      readEvents: async () => ({
        ok: false,
        state: "GOOGLE_CALENDAR_WINDOW_TOO_LARGE",
        nextPageToken: "must-not-leak",
      }),
    }),
    TEST_CORS_OPTIONS,
    acceptedBffGuard(),
  );
  const truncatedResponse = await truncated(request());
  assert.equal(truncatedResponse.status, 409);
  assert.deepEqual(await truncatedResponse.json(), {
    state: "GOOGLE_CALENDAR_WINDOW_TOO_LARGE",
  });
});

test("DRS OAuth start is fail closed and callback is explicitly GET-only", async () => {
  const start = await optionalImport(urls.start);
  const callback = await optionalImport(urls.callback);
  const composition = await optionalImport(urls.composition);
  assert.equal(
    typeof start.createDrsGoogleCalendarOauthStartHandler,
    "function",
  );
  assert.equal(
    typeof callback.createDrsGoogleCalendarOauthCallbackHandler,
    "function",
  );

  const dependencies = {
    allowedOrigins: ["https://laibe.test"],
    resolveServerContext: async () => null,
  };
  const invalidRequestHandler = start.createDrsGoogleCalendarOauthStartHandler(
    dependencies,
    TEST_CORS_OPTIONS,
    rejectingBffGuard(
      new composition.DrsBffRouteGuardError("INVALID_REQUEST", 400),
    ),
  );
  const forgedStart = await invalidRequestHandler(
    new Request(
      "https://laibe.test/functions/v1/drs-google-calendar-oauth-start",
      {
        method: "POST",
        headers: {
          origin: "https://laibe.test",
          "content-type": "application/json",
          authorization: "Bearer local-test-session",
        },
        body: JSON.stringify({
          case_id: OTHER_CASE_ID,
          email: "forged@example.test",
          role: "owner",
        }),
      },
    ),
  );
  assert.equal(forgedStart.status, 400);
  const missingSessionHandler = start.createDrsGoogleCalendarOauthStartHandler(
    dependencies,
    TEST_CORS_OPTIONS,
    rejectingBffGuard(
      new composition.DrsBffRouteGuardError("AUTH_REQUIRED", 401),
    ),
  );
  const startResponse = await missingSessionHandler(
    new Request(
      "https://laibe.test/functions/v1/drs-google-calendar-oauth-start",
      {
        method: "POST",
        headers: {
          origin: "https://laibe.test",
          "content-type": "application/json",
          authorization: "Bearer local-test-session",
        },
        body: "{}",
      },
    ),
  );
  assert.equal(startResponse.status, 401);
  const queryStartResponse = await invalidRequestHandler(
    new Request(
      "https://laibe.test/functions/v1/drs-google-calendar-oauth-start?debug=1",
      {
        method: "POST",
        headers: {
          origin: "https://laibe.test",
          "content-type": "application/json",
          authorization: "Bearer local-test-session",
        },
        body: "{}",
      },
    ),
  );
  assert.equal(queryStartResponse.status, 400);

  let callbackCalls = 0;
  const callbackHandler = callback.createDrsGoogleCalendarOauthCallbackHandler({
    loadPendingOAuth: async () => {
      callbackCalls += 1;
      return null;
    },
  });
  const callbackResponse = await callbackHandler(
    new Request(DRS_REDIRECT, { method: "POST" }),
  );
  assert.equal(callbackResponse.status, 405);
  assert.equal(callbackCalls, 0);
  const forgedCallback = await callbackHandler(
    new Request(
      `${DRS_REDIRECT}?code=code&state=state&case_id=${OTHER_CASE_ID}`,
    ),
  );
  assert.equal(forgedCallback.status, 400);
  assert.equal(callbackCalls, 0);
});

test("DRS callback rejects replay and reauthorization failure before provider exchange", async () => {
  const callback = await optionalImport(urls.callback);
  const oauth = await optionalImport(urls.oauth);
  assert.equal(
    typeof callback.createDrsGoogleCalendarOauthCallbackHandler,
    "function",
  );
  assert.equal(typeof oauth.issueOAuthMaterial, "function");
  const issued = await oauth.issueOAuthMaterial({ ttlMs: 60_000 });
  let exchanges = 0;
  const base = {
    redirectUri: DRS_REDIRECT,
    loadPendingOAuth: async () => ({
      stateDigest: issued.stateDigest,
      authenticatedUserId: AUTH_USER_ID,
      currentCaseId: CASE_ID,
      accountRole: "drs",
      authorizationSubject: AUTHORIZATION_SUBJECT,
      assignmentId: ASSIGNMENT_ID,
      redirectUri: DRS_REDIRECT,
      sealedVerifier: "sealed",
      expiresAt: issued.expiresAt,
      claimedAt: null,
      consumedAt: null,
    }),
    unsealSecret: async () => issued.codeVerifier,
    oauth: {
      exchangeCode: async () => {
        exchanges += 1;
        return { ok: false, publicResult: { state: "CONTEXT_UNAVAILABLE" } };
      },
    },
  };

  const denied = callback.createDrsGoogleCalendarOauthCallbackHandler({
    ...base,
    reauthorizePendingContext: async () => null,
  });
  const deniedResponse = await denied(
    new Request(`${DRS_REDIRECT}?code=code&state=${issued.state}`),
  );
  assert.equal(deniedResponse.status, 403);
  assert.equal(exchanges, 0);

  const replay = callback.createDrsGoogleCalendarOauthCallbackHandler({
    ...base,
    loadPendingOAuth: async () => ({
      ...(await base.loadPendingOAuth()),
      consumedAt: new Date().toISOString(),
    }),
    reauthorizePendingContext: async () => authorizedFacts(),
  });
  const replayResponse = await replay(
    new Request(`${DRS_REDIRECT}?code=code&state=${issued.state}`),
  );
  assert.equal(replayResponse.status, 403);
  assert.equal(exchanges, 0);
});

test("DRS callback sanitizes a token-exchange failure payload", async () => {
  const callback = await optionalImport(urls.callback);
  const oauth = await optionalImport(urls.oauth);
  const issued = await oauth.issueOAuthMaterial({ ttlMs: 60_000 });
  const handler = callback.createDrsGoogleCalendarOauthCallbackHandler({
    requireDrsAssignmentBinding: true,
    redirectUri: DRS_REDIRECT,
    loadPendingOAuth: async () => ({
      stateDigest: issued.stateDigest,
      authenticatedUserId: AUTH_USER_ID,
      currentCaseId: CASE_ID,
      accountRole: "drs",
      authorizationSubject: AUTHORIZATION_SUBJECT,
      assignmentId: ASSIGNMENT_ID,
      redirectUri: DRS_REDIRECT,
      sealedVerifier: "sealed",
      expiresAt: issued.expiresAt,
      claimedAt: null,
      consumedAt: null,
    }),
    reauthorizePendingContext: async () => authorizedFacts(),
    claimPendingOAuth: async () => ({ ok: true, state: "CLAIMED" }),
    unsealSecret: async () => issued.codeVerifier,
    oauth: {
      exchangeCode: async () => ({
        ok: false,
        publicResult: {
          state: "GOOGLE_CALENDAR_RECONNECT_REQUIRED",
          accessToken: "must-not-leak",
          providerPayload: { email: "must-not-leak@example.test" },
        },
      }),
    },
  });
  const response = await handler(
    new Request(`${DRS_REDIRECT}?code=code&state=${issued.state}`),
  );
  assert.equal(response.status, 409);
  assert.deepEqual(await response.json(), {
    state: "GOOGLE_CALENDAR_RECONNECT_REQUIRED",
  });
});

test("concurrent same-state callbacks claim once before provider exchange and commit once", async () => {
  const callback = await optionalImport(urls.callback);
  const oauth = await optionalImport(urls.oauth);
  assert.equal(
    typeof callback.createDrsGoogleCalendarOauthCallbackHandler,
    "function",
  );
  assert.equal(typeof oauth.issueOAuthMaterial, "function");
  const issued = await oauth.issueOAuthMaterial({ ttlMs: 60_000 });
  const pending = {
    stateDigest: issued.stateDigest,
    authenticatedUserId: AUTH_USER_ID,
    currentCaseId: CASE_ID,
    accountRole: "drs",
    authorizationSubject: AUTHORIZATION_SUBJECT,
    assignmentId: ASSIGNMENT_ID,
    redirectUri: DRS_REDIRECT,
    sealedVerifier: "sealed",
    expiresAt: issued.expiresAt,
    claimedAt: null,
    consumedAt: null,
  };
  let claimed = false;
  let providerExchangeCount = 0;
  let bindingCommitCount = 0;
  let auditCount = 0;
  const handler = callback.createDrsGoogleCalendarOauthCallbackHandler({
    requireDrsAssignmentBinding: true,
    redirectUri: DRS_REDIRECT,
    loadPendingOAuth: async () => ({ ...pending }),
    reauthorizePendingContext: async () => authorizedFacts(),
    claimPendingOAuth: async () => {
      if (claimed) return { ok: false, state: "OAUTH_STATE_ALREADY_USED" };
      claimed = true;
      return { ok: true, state: "CLAIMED" };
    },
    unsealSecret: async () => issued.codeVerifier,
    oauth: {
      exchangeCode: async () => {
        providerExchangeCount += 1;
        return {
          ok: true,
          publicResult: {
            scopes: [
              "openid",
              "https://www.googleapis.com/auth/calendar.readonly",
            ],
          },
          credentialEnvelope: {
            accessToken: "local-access",
            refreshToken: "local-refresh",
            idToken: "local-id",
            expiresIn: 3600,
          },
        };
      },
      resolveGoogleAccountAndCalendar: async () => ({
        googleSubject: "google-subject",
        calendarId: "primary",
      }),
    },
    sealCredential: async () => ({
      encryptedAccessToken: "sealed-access",
      encryptedRefreshToken: "sealed-refresh",
    }),
    commitBinding: async (input) => {
      assert.equal(input.pending.assignmentId, ASSIGNMENT_ID);
      bindingCommitCount += 1;
      auditCount += 1;
      return { ok: true, state: "CONNECTED" };
    },
  });
  const request = () =>
    new Request(`${DRS_REDIRECT}?code=code&state=${issued.state}`);
  const responses = await Promise.all([handler(request()), handler(request())]);
  assert.deepEqual(responses.map((response) => response.status).sort(), [
    200,
    409,
  ]);
  assert.equal(providerExchangeCount, 1);
  assert.equal(bindingCommitCount, 1);
  assert.equal(auditCount, 1);
});

test("DRS callback rejects write-capable provider scopes before account lookup or binding commit", async () => {
  const callback = await optionalImport(urls.callback);
  const oauth = await optionalImport(urls.oauth);
  const issued = await oauth.issueOAuthMaterial({ ttlMs: 60_000 });
  let accountLookups = 0;
  let commits = 0;
  const handler = callback.createDrsGoogleCalendarOauthCallbackHandler({
    requireDrsAssignmentBinding: true,
    redirectUri: DRS_REDIRECT,
    loadPendingOAuth: async () => ({
      stateDigest: issued.stateDigest,
      authenticatedUserId: AUTH_USER_ID,
      currentCaseId: CASE_ID,
      accountRole: "drs",
      authorizationSubject: AUTHORIZATION_SUBJECT,
      assignmentId: ASSIGNMENT_ID,
      redirectUri: DRS_REDIRECT,
      sealedVerifier: "sealed",
      expiresAt: issued.expiresAt,
      claimedAt: null,
      consumedAt: null,
    }),
    reauthorizePendingContext: async () => authorizedFacts(),
    claimPendingOAuth: async () => ({ ok: true, state: "CLAIMED" }),
    unsealSecret: async () => issued.codeVerifier,
    oauth: {
      exchangeCode: async () => ({
        ok: true,
        publicResult: {
          scopes: [
            "https://www.googleapis.com/auth/calendar.readonly",
            "https://www.googleapis.com/auth/calendar.events",
          ],
        },
        credentialEnvelope: {
          accessToken: "local-access",
          refreshToken: "local-refresh",
          idToken: "local-id",
          expiresIn: 3600,
        },
      }),
      resolveGoogleAccountAndCalendar: async () => {
        accountLookups += 1;
        return null;
      },
    },
    commitBinding: async () => {
      commits += 1;
      return { ok: true, state: "CONNECTED" };
    },
  });
  const response = await handler(
    new Request(`${DRS_REDIRECT}?code=code&state=${issued.state}`),
  );
  assert.equal(response.status, 409);
  assert.deepEqual(await response.json(), {
    state: "GOOGLE_CALENDAR_RECONNECT_REQUIRED",
  });
  assert.equal(accountLookups, 0);
  assert.equal(commits, 0);
});

test("DRS callback requires exactly one openid and one readonly provider scope before account lookup", async () => {
  const callback = await optionalImport(urls.callback);
  const oauth = await optionalImport(urls.oauth);
  for (
    const scopes of [
      ["https://www.googleapis.com/auth/calendar.readonly"],
      [
        "openid",
        "https://www.googleapis.com/auth/calendar.readonly",
        "https://www.googleapis.com/auth/calendar.readonly",
      ],
      [
        "openid",
        "openid",
        "https://www.googleapis.com/auth/calendar.readonly",
      ],
    ]
  ) {
    const issued = await oauth.issueOAuthMaterial({ ttlMs: 60_000 });
    let accountLookups = 0;
    const handler = callback.createDrsGoogleCalendarOauthCallbackHandler({
      requireDrsAssignmentBinding: true,
      redirectUri: DRS_REDIRECT,
      loadPendingOAuth: async () => ({
        stateDigest: issued.stateDigest,
        authenticatedUserId: AUTH_USER_ID,
        currentCaseId: CASE_ID,
        accountRole: "drs",
        authorizationSubject: AUTHORIZATION_SUBJECT,
        assignmentId: ASSIGNMENT_ID,
        redirectUri: DRS_REDIRECT,
        sealedVerifier: "sealed",
        expiresAt: issued.expiresAt,
        claimedAt: null,
        consumedAt: null,
      }),
      reauthorizePendingContext: async () => authorizedFacts(),
      claimPendingOAuth: async () => ({ ok: true, state: "CLAIMED" }),
      unsealSecret: async () => issued.codeVerifier,
      oauth: {
        exchangeCode: async () => ({
          ok: true,
          publicResult: { scopes },
          credentialEnvelope: {
            accessToken: "local-access",
            refreshToken: "local-refresh",
            idToken: "local-id",
            expiresIn: 3600,
          },
        }),
        resolveGoogleAccountAndCalendar: async () => {
          accountLookups += 1;
          return null;
        },
      },
    });
    const response = await handler(
      new Request(`${DRS_REDIRECT}?code=code&state=${issued.state}`),
    );
    assert.equal(response.status, 409, JSON.stringify(scopes));
    assert.deepEqual(await response.json(), {
      state: "GOOGLE_CALENDAR_RECONNECT_REQUIRED",
    });
    assert.equal(accountLookups, 0, JSON.stringify(scopes));
  }
});

test("stored DRS scopes must be the exact openid plus readonly set before provider read", async () => {
  const authorization = await optionalImport(urls.authorization);
  const oauth = await optionalImport(urls.oauth);
  const events = await optionalImport(urls.events);
  const sealedAccess = await oauth.encryptCredentialEnvelope(
    { accessToken: "mock-google-access" },
    CREDENTIAL_KEY,
  );
  for (
    const grantedScopes of [
      ["https://www.googleapis.com/auth/calendar.readonly"],
      [
        "openid",
        "https://www.googleapis.com/auth/calendar.readonly",
        "https://www.googleapis.com/auth/calendar.events",
      ],
      [
        "openid",
        "https://www.googleapis.com/auth/calendar.readonly",
        "https://www.googleapis.com/auth/calendar.readonly",
      ],
    ]
  ) {
    let providerCalls = 0;
    const port = authorization.createSupabaseDrsCalendarServerPort({
      env: {
        get(name) {
          return {
            SUPABASE_URL: "https://project.supabase.co",
            SUPABASE_SERVICE_ROLE_KEY: "server-secret",
            GOOGLE_CALENDAR_CREDENTIAL_KEY: CREDENTIAL_KEY,
          }[name];
        },
      },
      fetch: async (input) => {
        const url = String(input);
        if (url.endsWith("/auth/v1/user")) {
          return Response.json({ id: AUTH_USER_ID });
        }
        if (url.endsWith("/rpc/drs_google_calendar_authorize_v1")) {
          return Response.json(rpcAuthorizedFacts());
        }
        if (url.endsWith("/rpc/drs_google_calendar_events_context_v1")) {
          return Response.json({
            ok: true,
            state: "CONNECTED",
            authenticatedUserId: AUTH_USER_ID,
            selectedCaseId: CASE_ID,
            assignmentId: ASSIGNMENT_ID,
            accountRole: "drs",
            authorizationSubject: AUTHORIZATION_SUBJECT,
            bindingStatus: "active",
            credentialStatus: "active",
            timeZone: "Asia/Taipei",
            calendarId: "primary",
            encryptedAccessToken: sealedAccess,
            tokenExpiresAt: "2099-01-01T00:00:00.000Z",
            grantedScopes,
          });
        }
        if (url.includes("googleapis.com/calendar")) {
          providerCalls += 1;
          return Response.json({ items: [] });
        }
        return Response.json({}, { status: 500 });
      },
    });
    const handler = events.createDrsGoogleCalendarEventsReadHandler(
      port,
      TEST_CORS_OPTIONS,
      acceptedBffGuard(),
    );
    const response = await handler(
      new Request("https://laibe.test/events", {
        method: "POST",
        headers: {
          authorization: "Bearer local-session",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          timeMin: "2026-08-24T00:00:00.000Z",
          timeMax: "2026-08-31T00:00:00.000Z",
        }),
      }),
    );
    assert.equal(response.status, 409, JSON.stringify(grantedScopes));
    assert.deepEqual(await response.json(), {
      state: "GOOGLE_CALENDAR_RECONNECT_REQUIRED",
    });
    assert.equal(providerCalls, 0, JSON.stringify(grantedScopes));
  }
});

test("DRS API CORS reflects only an exact allowed origin and handles preflight before authority", async () => {
  const grant = await optionalImport(urls.grant);
  let guardCalls = 0;
  let calendarAuthorityCalls = 0;
  let legacyIdentityCalls = 0;
  const handler = grant.createDrsGoogleCalendarGrantHandler(
    endpointPort({
      resolveAuthenticatedIdentity: async () => {
        legacyIdentityCalls += 1;
        return { userId: AUTH_USER_ID };
      },
      resolveAuthorization: async () => {
        calendarAuthorityCalls += 1;
        return authorizedFacts();
      },
    }),
    { allowedOrigins: ["https://drs.laibe.test"] },
    acceptedBffGuard({}, () => {
      guardCalls += 1;
    }),
  );
  const preflight = await handler(
    new Request("https://api.laibe.test/grant", {
      method: "OPTIONS",
      headers: {
        origin: "https://drs.laibe.test",
        "access-control-request-method": "POST",
        "access-control-request-headers": "authorization, content-type",
      },
    }),
  );
  assert.equal(preflight.status, 204);
  assert.equal(
    preflight.headers.get("access-control-allow-origin"),
    "https://drs.laibe.test",
  );
  assert.equal(preflight.headers.get("access-control-allow-methods"), "POST");
  assert.equal(
    preflight.headers.get("access-control-allow-headers"),
    "authorization, content-type",
  );
  assert.equal(preflight.headers.get("vary"), "Origin");
  assert.equal(preflight.headers.get("access-control-allow-credentials"), null);
  assert.notEqual(preflight.headers.get("access-control-allow-origin"), "*");
  assert.equal(guardCalls, 0);
  assert.equal(calendarAuthorityCalls, 0);
  assert.equal(legacyIdentityCalls, 0);

  const allowed = await handler(
    new Request("https://api.laibe.test/grant", {
      method: "POST",
      headers: {
        origin: "https://drs.laibe.test",
        "content-type": "application/json",
      },
      body: "{}",
    }),
  );
  assert.equal(allowed.status, 200);
  assert.equal(
    allowed.headers.get("access-control-allow-origin"),
    "https://drs.laibe.test",
  );
  assert.equal(allowed.headers.get("vary"), "Origin");
  assert.equal(guardCalls, 1);
  assert.equal(calendarAuthorityCalls, 1);
  assert.equal(legacyIdentityCalls, 0);

  const denied = await handler(
    new Request("https://api.laibe.test/grant", {
      method: "POST",
      headers: {
        origin: "https://attacker.test",
        "content-type": "application/json",
      },
      body: "{}",
    }),
  );
  assert.equal(denied.status, 403);
  assert.deepEqual(await denied.json(), { state: "ORIGIN_NOT_ALLOWED" });
  assert.equal(denied.headers.get("vary"), "Origin");
  assert.equal(denied.headers.get("access-control-allow-origin"), null);
  assert.equal(guardCalls, 1);
  assert.equal(calendarAuthorityCalls, 1);
  assert.equal(legacyIdentityCalls, 0);

  const noOrigin = await handler(postJson("https://api.laibe.test/grant", {}));
  assert.equal(noOrigin.status, 200);
  assert.equal(noOrigin.headers.get("vary"), "Origin");
  assert.equal(noOrigin.headers.get("access-control-allow-origin"), null);
  assert.equal(guardCalls, 2);
  assert.equal(calendarAuthorityCalls, 2);
  assert.equal(legacyIdentityCalls, 0);

  const missingOriginPreflight = await handler(
    new Request("https://api.laibe.test/grant", {
      method: "OPTIONS",
      headers: { "access-control-request-method": "POST" },
    }),
  );
  assert.equal(missingOriginPreflight.status, 403);
  assert.equal(missingOriginPreflight.headers.get("vary"), "Origin");
  assert.equal(guardCalls, 2);
  assert.equal(calendarAuthorityCalls, 2);
  assert.equal(legacyIdentityCalls, 0);

  const extraHeaderPreflight = await handler(
    new Request("https://api.laibe.test/grant", {
      method: "OPTIONS",
      headers: {
        origin: "https://drs.laibe.test",
        "access-control-request-method": "POST",
        "access-control-request-headers": "authorization, x-unapproved",
      },
    }),
  );
  assert.equal(extraHeaderPreflight.status, 403);
  assert.equal(extraHeaderPreflight.headers.get("vary"), "Origin");
  assert.equal(
    extraHeaderPreflight.headers.get("access-control-allow-origin"),
    "https://drs.laibe.test",
  );
  assert.equal(guardCalls, 2);
  assert.equal(calendarAuthorityCalls, 2);
  assert.equal(legacyIdentityCalls, 0);
});

test("production events port uses mock transport and decrypts server-only access material", async () => {
  const authorization = await optionalImport(urls.authorization);
  const oauth = await optionalImport(urls.oauth);
  const events = await optionalImport(urls.events);
  assert.equal(
    typeof authorization.createSupabaseDrsCalendarServerPort,
    "function",
  );
  assert.equal(typeof oauth.encryptCredentialEnvelope, "function");
  assert.equal(
    typeof events.createDrsGoogleCalendarEventsReadHandler,
    "function",
  );

  const sealedAccess = await oauth.encryptCredentialEnvelope(
    { accessToken: "mock-google-access" },
    CREDENTIAL_KEY,
  );
  const seen = [];
  const port = authorization.createSupabaseDrsCalendarServerPort({
    env: {
      get(name) {
        return {
          SUPABASE_URL: "https://project.supabase.co",
          SUPABASE_SERVICE_ROLE_KEY: "server-secret",
          GOOGLE_CALENDAR_CREDENTIAL_KEY: CREDENTIAL_KEY,
        }[name];
      },
    },
    fetch: async (input, init = {}) => {
      const url = String(input);
      seen.push({ url, init });
      if (url.endsWith("/auth/v1/user")) {
        return Response.json({ id: AUTH_USER_ID });
      }
      if (url.endsWith("/rpc/drs_google_calendar_authorize_v1")) {
        return Response.json(rpcAuthorizedFacts());
      }
      if (url.endsWith("/rpc/drs_google_calendar_events_context_v1")) {
        return Response.json({
          ok: true,
          state: "CONNECTED",
          authenticatedUserId: AUTH_USER_ID,
          selectedCaseId: CASE_ID,
          assignmentId: ASSIGNMENT_ID,
          accountRole: "drs",
          authorizationSubject: AUTHORIZATION_SUBJECT,
          bindingStatus: "active",
          credentialStatus: "active",
          timeZone: "Asia/Taipei",
          calendarId: "primary/calendar",
          encryptedAccessToken: sealedAccess,
          tokenExpiresAt: "2099-01-01T00:00:00.000Z",
          grantedScopes: [
            "openid",
            "https://www.googleapis.com/auth/calendar.readonly",
          ],
        });
      }
      if (url.startsWith("https://www.googleapis.com/calendar/v3/calendars/")) {
        assert.equal(init.headers.authorization, "Bearer mock-google-access");
        return Response.json({
          items: [{
            id: "mock-event",
            status: "confirmed",
            summary: "本機測試",
            start: { date: "2026-08-26" },
            end: { date: "2026-08-27" },
          }],
        });
      }
      return Response.json({ error: "unexpected" }, { status: 500 });
    },
  });
  const handler = events.createDrsGoogleCalendarEventsReadHandler(
    port,
    TEST_CORS_OPTIONS,
    acceptedBffGuard(),
  );
  const response = await handler(
    new Request("https://laibe.test/events", {
      method: "POST",
      headers: {
        authorization: "Bearer local-session",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        timeMin: "2026-08-24T00:00:00.000Z",
        timeMax: "2026-08-31T00:00:00.000Z",
      }),
    }),
  );
  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.equal(payload.events[0].title, "本機測試");
  assert.equal(JSON.stringify(payload).includes("mock-google-access"), false);
  assert.equal(
    seen.some(({ url }) => url.includes("googleapis.com/calendar")),
    true,
  );
  const providerUrl = new URL(
    seen.find(({ url }) => url.includes("googleapis.com/calendar")).url,
  );
  assert.equal(providerUrl.searchParams.get("singleEvents"), "true");
  assert.equal(providerUrl.searchParams.get("orderBy"), "startTime");
  assert.equal(providerUrl.searchParams.get("timeZone"), "Asia/Taipei");
  assert.equal(providerUrl.searchParams.get("maxResults"), "250");
  assert.equal(
    seen.filter(({ url }) =>
      url.includes("case_member_google_calendar_authorize_v1") ||
      url.includes("owner-google-calendar") ||
      url.includes("vendor-google-calendar")
    ).length,
    0,
  );
});

test("events fetched before assignment termination are discarded after post-fetch reauthorization", async () => {
  const authorization = await optionalImport(urls.authorization);
  const oauth = await optionalImport(urls.oauth);
  const events = await optionalImport(urls.events);
  assert.equal(
    typeof authorization.createSupabaseDrsCalendarServerPort,
    "function",
  );
  const sealedAccess = await oauth.encryptCredentialEnvelope(
    { accessToken: "mock-google-access" },
    CREDENTIAL_KEY,
  );
  let authorizationCalls = 0;
  let providerCalls = 0;
  const port = authorization.createSupabaseDrsCalendarServerPort({
    env: {
      get(name) {
        return {
          SUPABASE_URL: "https://project.supabase.co",
          SUPABASE_SERVICE_ROLE_KEY: "server-secret",
          GOOGLE_CALENDAR_CREDENTIAL_KEY: CREDENTIAL_KEY,
        }[name];
      },
    },
    fetch: async (input) => {
      const url = String(input);
      if (url.endsWith("/auth/v1/user")) {
        return Response.json({ id: AUTH_USER_ID });
      }
      if (url.endsWith("/rpc/drs_google_calendar_authorize_v1")) {
        authorizationCalls += 1;
        return Response.json(
          authorizationCalls === 1 ? rpcAuthorizedFacts() : rpcAuthorizedFacts({
            authorized: false,
            assignment_status: "terminated",
            terminated_at: "2026-08-24T12:00:00.000Z",
          }),
        );
      }
      if (url.endsWith("/rpc/drs_google_calendar_events_context_v1")) {
        return Response.json({
          ok: true,
          authenticatedUserId: AUTH_USER_ID,
          selectedCaseId: CASE_ID,
          assignmentId: ASSIGNMENT_ID,
          accountRole: "drs",
          authorizationSubject: AUTHORIZATION_SUBJECT,
          bindingStatus: "active",
          credentialStatus: "active",
          timeZone: "Asia/Taipei",
          calendarId: "primary",
          encryptedAccessToken: sealedAccess,
          tokenExpiresAt: "2099-01-01T00:00:00.000Z",
          grantedScopes: [
            "openid",
            "https://www.googleapis.com/auth/calendar.readonly",
          ],
        });
      }
      if (url.includes("googleapis.com/calendar")) {
        providerCalls += 1;
        return Response.json({
          items: [{
            summary: "must-be-discarded",
            start: { date: "2026-08-26" },
            end: { date: "2026-08-27" },
          }],
        });
      }
      return Response.json({}, { status: 500 });
    },
  });
  const handler = events.createDrsGoogleCalendarEventsReadHandler(
    port,
    TEST_CORS_OPTIONS,
    acceptedBffGuard(),
  );
  const response = await handler(
    new Request("https://laibe.test/events", {
      method: "POST",
      headers: {
        authorization: "Bearer local-session",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        timeMin: "2026-08-24T00:00:00.000Z",
        timeMax: "2026-08-31T00:00:00.000Z",
      }),
    }),
  );
  assert.equal(response.status, 403);
  assert.deepEqual(await response.json(), { state: "CASE_NOT_AUTHORIZED" });
  assert.equal(providerCalls, 1);
  assert.equal(authorizationCalls, 2);
});
