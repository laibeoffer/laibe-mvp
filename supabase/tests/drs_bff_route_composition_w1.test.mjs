// deno-lint-ignore-file require-await -- async seams intentionally mirror production ports.
import assert from "node:assert/strict";

const ROOT = new URL("../", import.meta.url);
const compositionUrl = new URL(
  "functions/_shared/drs-auth/drs-bff-route-composition.ts",
  ROOT,
);

const routeFiles = Object.freeze([
  "functions/drs-workspace-grant/index.ts",
  "functions/drs-google-calendar-grant/index.ts",
  "functions/drs-google-calendar-oauth-start/index.ts",
  "functions/drs-google-calendar-events-read/index.ts",
  "functions/drs-google-calendar-revoke/index.ts",
]);

async function readRequired(url, missingState) {
  try {
    return await Deno.readTextFile(url);
  } catch (error) {
    assert.fail(
      `${missingState}: ${error instanceof Error ? error.message : error}`,
    );
  }
}

Deno.test("focused RED: guarded BFF route composition is absent", async () => {
  const source = await readRequired(
    compositionUrl,
    "DRS_BFF_ROUTE_COMPOSITION_MISSING",
  );
  assert.match(source, /createDrsBffGuard/u);
  assert.match(source, /DRS_BFF_ROUTE_CONTRACTS/u);

  for (const relativePath of routeFiles) {
    const routeSource = await readRequired(
      new URL(relativePath, ROOT),
      relativePath,
    );
    assert.match(routeSource, /createDrsBffRouteGuard/u, relativePath);
    assert.doesNotMatch(
      routeSource,
      /resolveAuthenticatedIdentity\(request\)/u,
      `${relativePath} must not recover client JWT authority after the BFF guard`,
    );
  }
});

Deno.test("BFF route contracts close all five request shapes", async () => {
  const composition = await import(compositionUrl.href);
  const contracts = composition.DRS_BFF_ROUTE_CONTRACTS;
  assert.deepEqual(
    Object.fromEntries(
      Object.entries(contracts).map(([name, contract]) => [
        name,
        {
          method: contract.method,
          pathname: contract.pathname,
          query: contract.queryFields.map((field) => field.name),
          body: contract.jsonBodyFields?.map((field) => field.name) ?? null,
        },
      ]),
    ),
    {
      workspaceGrant: {
        method: "POST",
        pathname: "/functions/v1/drs-workspace-grant",
        query: [],
        body: [],
      },
      calendarGrant: {
        method: "POST",
        pathname: "/functions/v1/drs-google-calendar-grant",
        query: [],
        body: [],
      },
      calendarOauthStart: {
        method: "POST",
        pathname: "/functions/v1/drs-google-calendar-oauth-start",
        query: [],
        body: [],
      },
      calendarEventsRead: {
        method: "POST",
        pathname: "/functions/v1/drs-google-calendar-events-read",
        query: [],
        body: ["timeMin", "timeMax"],
      },
      calendarRevoke: {
        method: "POST",
        pathname: "/functions/v1/drs-google-calendar-revoke",
        query: [],
        body: [],
      },
    },
  );

  const [timeMin, timeMax] = contracts.calendarEventsRead.jsonBodyFields;
  assert.equal(timeMin.validate("2026-08-24T00:00:00.123Z"), true);
  assert.equal(timeMax.validate("2026-09-24T00:00:00+08:00"), true);
  assert.equal(timeMin.validate("2026-08-24T00:00:00.1234Z"), false);
  assert.equal(timeMax.validate("2026-02-30T00:00:00Z"), false);
});

const AUTH_USER_ID = "11111111-1111-4111-8111-111111111111";
const SPECIALIST_ID = "22222222-2222-4222-8222-222222222222";
const CASE_ID = "33333333-3333-4333-8333-333333333333";
const ASSIGNMENT_ID = "44444444-4444-4444-8444-444444444444";
const SUBJECT = `drs-specialist:${SPECIALIST_ID}`;

function bffContext() {
  return Object.freeze({
    authenticatedUserId: AUTH_USER_ID,
    specialistId: SPECIALIST_ID,
    authorizationSubject: SUBJECT,
    selectedCaseId: CASE_ID,
    caseStatus: "active",
    accessMode: "read_only",
    proofExpiresAt: "2026-08-24T01:00:00.000Z",
  });
}

function fakeGuard(calls) {
  return Object.freeze({
    async authorize(request) {
      calls.push(`guard:${new URL(request.url).pathname}`);
      return bffContext();
    },
  });
}

function post(pathname, body = {}) {
  return new Request(`https://app.laibe.test${pathname}`, {
    method: "POST",
    headers: {
      authorization: "Bearer opaque.proof.value",
      cookie: "__Host-laibe_drs=sealed-cookie",
      "content-type": "application/json",
      origin: "https://app.laibe.test",
    },
    body: JSON.stringify(body),
  });
}

Deno.test("workspace grant uses only guard-selected case and subject before its accepted RPC seam", async () => {
  const route = await import(
    new URL("functions/drs-workspace-grant/index.ts", ROOT).href
  );
  const calls = [];
  const response = await route.createDrsWorkspaceGrantHandler({
    runtimeAvailable: true,
    allowedOrigins: ["https://app.laibe.test"],
    async resolveAuthenticatedIdentity() {
      assert.fail("raw Supabase JWT identity must not run");
    },
    async resolveWorkspaceGrant(input) {
      calls.push({ backend: input });
      return {
        authorized: true,
        state: "AUTHORIZED_DRS_WORKSPACE",
        case_id: CASE_ID,
        case_status: "active",
        access_mode: "read_only",
      };
    },
  }, fakeGuard(calls))(
    post("/functions/v1/drs-workspace-grant"),
  );

  assert.equal(response.status, 200);
  assert.deepEqual(calls, [
    "guard:/functions/v1/drs-workspace-grant",
    {
      backend: {
        authenticatedUserId: AUTH_USER_ID,
        expectedCaseId: CASE_ID,
        expectedAuthorizationSubject: SUBJECT,
      },
    },
  ]);
  assert.deepEqual(await response.json(), {
    schemaVersion: "laibe.drs-workspace-auth.v1",
    state: "AUTHORIZED_DRS_WORKSPACE",
    case: { id: CASE_ID, status: "ACTIVE" },
    workspaceAccess: {
      accountRole: "drs",
      mode: "read_only",
      mutationAllowed: false,
      writeActionsEnabled: false,
    },
    next: {
      actor: "drs_specialist",
      action: "REVIEW_AUTHORIZED_CASE_RECORDS",
    },
  });
});

Deno.test("calendar grant reauthorizes and exactly matches the guard-selected authority", async () => {
  const route = await import(
    new URL("functions/drs-google-calendar-grant/index.ts", ROOT).href
  );
  const calls = [];
  const response = await route.createDrsGoogleCalendarGrantHandler(
    {
      runtimeReady: true,
      async resolveAuthenticatedIdentity() {
        assert.fail("raw Supabase JWT identity must not run");
      },
      async resolveAuthorization(identity, pending) {
        calls.push({ reauthorize: { identity, pending } });
        return {
          authorized: true,
          authenticatedUserId: AUTH_USER_ID,
          specialistId: SPECIALIST_ID,
          assignmentId: ASSIGNMENT_ID,
          selectedCaseId: CASE_ID,
          currentCaseId: CASE_ID,
          accountRole: "drs",
          authorizationSubject: SUBJECT,
          authBindingStatus: "active",
          specialistStatus: "active",
          assignmentStatus: "active",
          validFrom: "2026-08-01T00:00:00.000Z",
          validUntil: "2026-09-01T00:00:00.000Z",
          terminatedAt: null,
          lockStatus: "locked",
        };
      },
      async loadGrant(context) {
        calls.push({ backend: context });
        return {
          ok: true,
          state: "CONNECTED",
          grant: {
            authenticatedUserId: AUTH_USER_ID,
            selectedCaseId: CASE_ID,
            assignmentId: ASSIGNMENT_ID,
            accountRole: "drs",
            authorizationSubject: SUBJECT,
            connectionStatus: "connected",
            bindingStatus: "active",
            calendarId: "primary",
            timeZone: "Asia/Taipei",
          },
        };
      },
      async revoke() {
        assert.fail("wrong backend seam");
      },
      async readEvents() {
        assert.fail("wrong backend seam");
      },
    },
    { allowedOrigins: ["https://app.laibe.test"] },
    fakeGuard(calls),
  )(
    post("/functions/v1/drs-google-calendar-grant"),
  );

  assert.equal(response.status, 200);
  assert.equal(calls[0], "guard:/functions/v1/drs-google-calendar-grant");
  assert.deepEqual(calls[1], {
    reauthorize: {
      identity: { userId: AUTH_USER_ID },
      pending: null,
    },
  });
  assert.equal(calls.length, 3);
});

Deno.test("guard failure returns a sanitized response before calendar backend work", async () => {
  const composition = await import(compositionUrl.href);
  const route = await import(
    new URL("functions/drs-google-calendar-revoke/index.ts", ROOT).href
  );
  let backendCalls = 0;
  const response = await route.createDrsGoogleCalendarRevokeHandler(
    {
      runtimeReady: true,
      async resolveAuthenticatedIdentity() {
        backendCalls += 1;
        return null;
      },
      async resolveAuthorization() {
        backendCalls += 1;
        return null;
      },
      async loadGrant() {
        backendCalls += 1;
        return null;
      },
      async revoke() {
        backendCalls += 1;
        return null;
      },
      async readEvents() {
        backendCalls += 1;
        return null;
      },
    },
    { allowedOrigins: ["https://app.laibe.test"] },
    {
      async authorize() {
        throw new composition.DrsBffRouteGuardError("AUTH_REQUIRED", 401);
      },
    },
  )(post("/functions/v1/drs-google-calendar-revoke"));

  assert.equal(response.status, 401);
  assert.deepEqual(await response.json(), { state: "AUTH_REQUIRED" });
  assert.equal(backendCalls, 0);
});

function calendarAuthority(overrides = {}) {
  return {
    authorized: true,
    authenticatedUserId: AUTH_USER_ID,
    specialistId: SPECIALIST_ID,
    assignmentId: ASSIGNMENT_ID,
    selectedCaseId: CASE_ID,
    currentCaseId: CASE_ID,
    accountRole: "drs",
    authorizationSubject: SUBJECT,
    authBindingStatus: "active",
    specialistStatus: "active",
    assignmentStatus: "active",
    validFrom: "2026-08-01T00:00:00.000Z",
    validUntil: "2026-09-01T00:00:00.000Z",
    terminatedAt: null,
    lockStatus: "locked",
    ...overrides,
  };
}

Deno.test("focused correction: OAuth start freshly resolves assignment with no pending client seam", async () => {
  const route = await import(
    new URL("functions/drs-google-calendar-oauth-start/index.ts", ROOT).href
  );
  const resolverInputs = [];
  const stored = [];
  let providerCalls = 0;
  const dependencies = {
    runtimeReady: true,
    allowedOrigins: ["https://app.laibe.test"],
    redirectUri: "https://app.laibe.test/oauth/google-calendar/callback",
    requireDrsAssignmentBinding: true,
    async sealSecret(value) {
      return `sealed:${value.length}`;
    },
    async storePendingOAuth(value) {
      stored.push(value);
    },
    oauth: {
      createAuthorizationUrl() {
        providerCalls += 1;
        return "https://accounts.google.test/o/oauth2/v2/auth?opaque=1";
      },
    },
  };
  const authorization = {
    requiresAssignmentBinding: true,
    async resolveAuthorization(input) {
      resolverInputs.push(input);
      return input.pending === null ? calendarAuthority() : null;
    },
  };
  const response = await route.createDrsGoogleCalendarOauthStartHandler(
    dependencies,
    { allowedOrigins: ["https://app.laibe.test"] },
    fakeGuard([]),
    authorization,
  )(post("/functions/v1/drs-google-calendar-oauth-start"));

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    state: "OAUTH_REDIRECT_REQUIRED",
    authorizationUrl: "https://accounts.google.test/o/oauth2/v2/auth?opaque=1",
  });
  assert.deepEqual(resolverInputs, [{
    authenticatedUserId: AUTH_USER_ID,
    accountRole: "drs",
    pending: null,
  }]);
  assert.equal(stored.length, 1);
  assert.equal(stored[0].assignmentId, ASSIGNMENT_ID);
  assert.equal(providerCalls, 1);
});

Deno.test("focused correction: OAuth mismatch denies before pending storage or provider work", async () => {
  const route = await import(
    new URL("functions/drs-google-calendar-oauth-start/index.ts", ROOT).href
  );
  let resolverCalls = 0;
  let storeCalls = 0;
  let providerCalls = 0;
  const response = await route.createDrsGoogleCalendarOauthStartHandler(
    {
      runtimeReady: true,
      allowedOrigins: ["https://app.laibe.test"],
      redirectUri: "https://app.laibe.test/oauth/google-calendar/callback",
      requireDrsAssignmentBinding: true,
      async sealSecret(value) {
        return `sealed:${value.length}`;
      },
      async storePendingOAuth() {
        storeCalls += 1;
      },
      oauth: {
        createAuthorizationUrl() {
          providerCalls += 1;
          return "https://accounts.google.test/forbidden";
        },
      },
    },
    { allowedOrigins: ["https://app.laibe.test"] },
    fakeGuard([]),
    {
      async resolveAuthorization() {
        resolverCalls += 1;
        return calendarAuthority({
          selectedCaseId: "55555555-5555-4555-8555-555555555555",
          currentCaseId: "55555555-5555-4555-8555-555555555555",
        });
      },
    },
  )(post("/functions/v1/drs-google-calendar-oauth-start"));

  assert.equal(response.status, 403);
  assert.deepEqual(await response.json(), { state: "CASE_NOT_AUTHORIZED" });
  assert.equal(resolverCalls, 1);
  assert.equal(storeCalls, 0);
  assert.equal(providerCalls, 0);
});

Deno.test("focused correction: A0 accepts the direct workspace route replay as ACTIVE", async () => {
  const route = await import(
    new URL("functions/drs-workspace-grant/index.ts", ROOT).href
  );
  const a0ModuleHref = [
    "file:",
    "",
    "",
    "C:",
    "CodexWork",
    "08-Jacky",
    "worktrees",
    "laibe_MVP_project",
    "a0-drs-specialist-calendar-integration-w1-20260824",
    "src",
    "stitch_laibe_landing_onboarding",
    "drs_standalone",
    "specialist_workspace",
    "drs-workspace-transport.js",
  ].join("/");
  const a0ModuleSpecifier = `${a0ModuleHref}?composition=${Date.now()}`;
  const a0Module = await import(a0ModuleSpecifier);
  const handler = route.createDrsWorkspaceGrantHandler({
    runtimeAvailable: true,
    allowedOrigins: ["https://app.laibe.test"],
    async resolveAuthenticatedIdentity() {
      assert.fail("raw JWT identity must not run");
    },
    async resolveWorkspaceGrant() {
      return {
        authorized: true,
        state: "AUTHORIZED_DRS_WORKSPACE",
        case_id: CASE_ID,
        case_status: "active",
        access_mode: "read_only",
      };
    },
  }, fakeGuard([]));
  const transport = a0Module.createDrsWorkspaceTransport({
    async fetchImplementation(url, init) {
      return await handler(
        new Request(`https://app.laibe.test${url}`, {
          ...init,
          headers: { ...init.headers, origin: "https://app.laibe.test" },
        }),
      );
    },
    async resolveSessionHeaders() {
      return { authorization: "Bearer opaque.proof.value" };
    },
  });

  const replay = await transport.loadWorkspaceGrant();
  assert.equal(replay.ok, true, JSON.stringify(replay));
  assert.deepEqual(replay.case, { id: CASE_ID, status: "ACTIVE" });
  assert.equal(replay.workspaceAccess.mode, "read_only");
});

Deno.test("focused correction: invalid event windows fail before every verifier and backend seam", async () => {
  const composition = await import(compositionUrl.href);
  const route = await import(
    new URL("functions/drs-google-calendar-events-read/index.ts", ROOT).href
  );
  const calls = {
    verifier: 0,
    currentAuthority: 0,
    calendarAuthority: 0,
    provider: 0,
  };
  const acceptedGuard = {
    async authorize() {
      calls.verifier += 1;
      calls.currentAuthority += 1;
      return bffContext();
    },
  };
  const guard = composition.createDrsBffRouteGuard(
    "calendarEventsRead",
    undefined,
    acceptedGuard,
  );
  const handler = route.createDrsGoogleCalendarEventsReadHandler(
    {
      runtimeReady: true,
      async resolveAuthenticatedIdentity() {
        assert.fail("raw JWT identity must not run");
      },
      async resolveAuthorization() {
        calls.calendarAuthority += 1;
        return calendarAuthority();
      },
      async loadGrant() {
        assert.fail("wrong backend seam");
      },
      async revoke() {
        assert.fail("wrong backend seam");
      },
      async readEvents() {
        calls.provider += 1;
        return {
          ok: true,
          state: "CONNECTED",
          authenticatedUserId: AUTH_USER_ID,
          selectedCaseId: CASE_ID,
          assignmentId: ASSIGNMENT_ID,
          accountRole: "drs",
          authorizationSubject: SUBJECT,
          timeZone: "Asia/Taipei",
          items: [],
        };
      },
    },
    { allowedOrigins: ["https://app.laibe.test"] },
    guard,
  );

  for (
    const body of [
      {
        timeMin: "2026-08-25T00:00:00.000Z",
        timeMax: "2026-08-24T00:00:00.000Z",
      },
      {
        timeMin: "2026-08-24T00:00:00.000Z",
        timeMax: "2026-09-24T00:00:00.001Z",
      },
    ]
  ) {
    const response = await handler(
      post("/functions/v1/drs-google-calendar-events-read", body),
    );
    assert.equal(response.status, 400);
    assert.deepEqual(await response.json(), { state: "INVALID_REQUEST" });
  }
  assert.deepEqual(calls, {
    verifier: 0,
    currentAuthority: 0,
    calendarAuthority: 0,
    provider: 0,
  });

  const legal = await handler(post(
    "/functions/v1/drs-google-calendar-events-read",
    {
      timeMin: "2026-08-24T00:00:00.000Z",
      timeMax: "2026-08-31T00:00:00.000Z",
    },
  ));
  assert.equal(legal.status, 200);
  assert.deepEqual(calls, {
    verifier: 1,
    currentAuthority: 1,
    calendarAuthority: 1,
    provider: 1,
  });
});

function streamingRequest(pathname, chunkSize = 1024, totalChunks = 128) {
  const metrics = { pulls: 0, bytesProduced: 0, canceled: false };
  const body = new ReadableStream({
    pull(controller) {
      metrics.pulls += 1;
      const chunk = new Uint8Array(chunkSize);
      chunk.fill(0x20);
      metrics.bytesProduced += chunk.byteLength;
      controller.enqueue(chunk);
      if (metrics.pulls >= totalChunks) controller.close();
    },
    cancel() {
      metrics.canceled = true;
    },
  });
  const request = new Request(`https://app.laibe.test${pathname}`, {
    method: "POST",
    headers: {
      authorization: "Bearer opaque.proof.value",
      cookie: "__Host-laibe_drs=sealed-cookie",
      "content-type": "application/json",
      origin: "https://app.laibe.test",
    },
    body,
    duplex: "half",
  });
  return { request, metrics };
}

Deno.test("focused streaming RED: workspace rejects before verifier and RPC", async () => {
  const composition = await import(compositionUrl.href);
  const workspaceRoute = await import(
    new URL("functions/drs-workspace-grant/index.ts", ROOT).href
  );
  const downstream = {
    verifier: 0,
    currentAuthority: 0,
    workspaceRpc: 0,
  };
  const acceptedGuard = {
    async authorize() {
      downstream.verifier += 1;
      downstream.currentAuthority += 1;
      return bffContext();
    },
  };

  const workspaceStream = streamingRequest(
    "/functions/v1/drs-workspace-grant",
  );
  const workspaceResponse = await workspaceRoute.createDrsWorkspaceGrantHandler(
    {
      runtimeAvailable: true,
      allowedOrigins: ["https://app.laibe.test"],
      async resolveAuthenticatedIdentity() {
        assert.fail("raw JWT identity must not run");
      },
      async resolveWorkspaceGrant() {
        downstream.workspaceRpc += 1;
        return null;
      },
    },
    composition.createDrsBffRouteGuard(
      "workspaceGrant",
      undefined,
      acceptedGuard,
    ),
  )(workspaceStream.request);

  assert.deepEqual(downstream, {
    verifier: 0,
    currentAuthority: 0,
    workspaceRpc: 0,
  });
  assert.equal(workspaceResponse.status, 400);
  assert.deepEqual(await workspaceResponse.json(), {
    state: "INVALID_REQUEST",
  });
  assert.ok(
    workspaceStream.metrics.pulls <= 4,
    JSON.stringify(workspaceStream.metrics),
  );
  assert.ok(workspaceStream.metrics.bytesProduced <= 4 * 1024);
  assert.equal(workspaceStream.metrics.canceled, true);
});

Deno.test("focused streaming RED: events stop clone pulls before Calendar and provider work", async () => {
  const composition = await import(compositionUrl.href);
  const eventsRoute = await import(
    new URL("functions/drs-google-calendar-events-read/index.ts", ROOT).href
  );
  const downstream = {
    verifier: 0,
    currentAuthority: 0,
    calendarAuthority: 0,
    provider: 0,
  };
  const acceptedGuard = {
    async authorize() {
      downstream.verifier += 1;
      downstream.currentAuthority += 1;
      return bffContext();
    },
  };
  const eventsStream = streamingRequest(
    "/functions/v1/drs-google-calendar-events-read",
  );
  const eventsResponse = await eventsRoute
    .createDrsGoogleCalendarEventsReadHandler(
      {
        runtimeReady: true,
        async resolveAuthenticatedIdentity() {
          assert.fail("raw JWT identity must not run");
        },
        async resolveAuthorization() {
          downstream.calendarAuthority += 1;
          return null;
        },
        async loadGrant() {
          assert.fail("wrong backend seam");
        },
        async revoke() {
          assert.fail("wrong backend seam");
        },
        async readEvents() {
          downstream.provider += 1;
          return null;
        },
      },
      { allowedOrigins: ["https://app.laibe.test"] },
      composition.createDrsBffRouteGuard(
        "calendarEventsRead",
        undefined,
        acceptedGuard,
      ),
    )(eventsStream.request);

  assert.equal(eventsResponse.status, 400);
  assert.deepEqual(await eventsResponse.json(), { state: "INVALID_REQUEST" });
  assert.ok(
    eventsStream.metrics.pulls <= 4,
    JSON.stringify(eventsStream.metrics),
  );
  assert.ok(
    eventsStream.metrics.bytesProduced <= 4 * 1024,
    JSON.stringify(eventsStream.metrics),
  );
  assert.equal(eventsStream.metrics.canceled, true);
  assert.deepEqual(downstream, {
    verifier: 0,
    currentAuthority: 0,
    calendarAuthority: 0,
    provider: 0,
  });
});

Deno.test("focused streaming RED: the first oversized chunk is bounded and legal bodies remain replayable", async () => {
  const composition = await import(compositionUrl.href);
  const acceptedPayloads = [];
  const acceptedGuard = {
    async authorize(request) {
      acceptedPayloads.push(await request.clone().json());
      return bffContext();
    },
  };
  const oversized = streamingRequest(
    "/functions/v1/drs-google-calendar-grant",
    4096,
  );
  const oversizedGuard = composition.createDrsBffRouteGuard(
    "calendarGrant",
    undefined,
    acceptedGuard,
  );
  let oversizedError;
  try {
    await oversizedGuard.authorize(oversized.request);
  } catch (error) {
    oversizedError = error;
  }
  assert.ok(oversized.metrics.pulls <= 3, JSON.stringify(oversized.metrics));
  assert.ok(
    oversized.metrics.bytesProduced <= 3 * 4096,
    JSON.stringify(oversized.metrics),
  );
  assert.equal(oversized.metrics.canceled, true);
  assert.equal(acceptedPayloads.length, 0);
  assert.equal(
    composition.readDrsBffGuardFailure(oversizedError).status,
    400,
  );

  const legalRoutes = [
    ["workspaceGrant", "/functions/v1/drs-workspace-grant", {}],
    ["calendarGrant", "/functions/v1/drs-google-calendar-grant", {}],
    [
      "calendarOauthStart",
      "/functions/v1/drs-google-calendar-oauth-start",
      {},
    ],
    ["calendarRevoke", "/functions/v1/drs-google-calendar-revoke", {}],
    [
      "calendarEventsRead",
      "/functions/v1/drs-google-calendar-events-read",
      {
        timeMin: "2026-08-24T00:00:00.000Z",
        timeMax: "2026-08-31T00:00:00.000Z",
      },
    ],
  ];
  for (const [routeName, pathname, body] of legalRoutes) {
    const guard = composition.createDrsBffRouteGuard(
      routeName,
      undefined,
      acceptedGuard,
    );
    const context = await guard.authorize(post(pathname, body));
    assert.equal(context.selectedCaseId, CASE_ID);
  }
  assert.deepEqual(acceptedPayloads, legalRoutes.map((entry) => entry[2]));
});
