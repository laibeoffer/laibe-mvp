import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const supabaseRoot = new URL("../", import.meta.url);
const repositoryRoot = new URL("../../", import.meta.url);

async function exists(url) {
  try {
    await Deno.stat(url);
    return true;
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) return false;
    throw error;
  }
}

Deno.test("focused RED: DRS identity authority bridge is absent", async () => {
  const bridgePaths = [
    new URL("functions/_shared/drs-auth/contracts.ts", supabaseRoot),
    new URL(
      "functions/_shared/drs-auth/drs-specialist-authority.ts",
      supabaseRoot,
    ),
    new URL("functions/drs-workspace-grant/index.ts", supabaseRoot),
    new URL(
      "migrations/20260824170000_drs_identity_google_line_w1.sql",
      supabaseRoot,
    ),
    new URL("tests/drs-identity-google-line-source.test.mjs", repositoryRoot),
  ];
  const inheritedSql = await readFile(
    new URL(
      "migrations/20260821170000_google_calendar_drs_account_contract.sql",
      supabaseRoot,
    ),
    "utf8",
  );
  const allBridgeArtifactsExist = (
    await Promise.all(bridgePaths.map((path) => exists(path)))
  ).every(Boolean);
  const inheritedHookIsUnavailable =
    /'state',\s*'DRS_AUTHORIZATION_HOOK_UNAVAILABLE'/u.test(inheritedSql);

  assert.equal(
    allBridgeArtifactsExist && inheritedHookIsUnavailable,
    true,
    "DRS_IDENTITY_AUTHORITY_BRIDGE_MISSING",
  );
});

const AUTH_USER_ID = "81111111-1111-4111-8111-111111111111";
const OTHER_USER_ID = "82222222-2222-4222-8222-222222222222";
const SPECIALIST_ID = "83333333-3333-4333-8333-333333333333";
const OTHER_SPECIALIST_ID = "84444444-4444-4444-8444-444444444444";
const ASSIGNMENT_ID = "85555555-5555-4555-8555-555555555555";
const CASE_ID = "86666666-6666-4666-8666-666666666666";
const OTHER_CASE_ID = "87777777-7777-4777-8777-777777777777";
const SUBJECT = `drs-specialist:${SPECIALIST_ID}`;

function authorityFacts(overrides = {}) {
  const now = Date.now();
  return {
    authorized: true,
    authenticated_user_id: AUTH_USER_ID,
    specialist_id: SPECIALIST_ID,
    assignment_id: ASSIGNMENT_ID,
    selected_case_id: CASE_ID,
    account_role: "drs",
    authorization_subject: SUBJECT,
    auth_binding_status: "active",
    specialist_status: "active",
    assignment_status: "active",
    valid_from: new Date(now - 60_000).toISOString(),
    valid_until: new Date(now + 3_600_000).toISOString(),
    terminated_at: null,
    lock_status: "locked",
    ...overrides,
  };
}

function workspaceGrantProjection(overrides = {}) {
  return {
    authorized: true,
    state: "AUTHORIZED_DRS_WORKSPACE",
    case_id: CASE_ID,
    case_status: "active",
    access_mode: "read_only",
    ...overrides,
  };
}

async function loadProductionModules() {
  return {
    contracts: await import(
      new URL("functions/_shared/drs-auth/contracts.ts", supabaseRoot).href
    ),
    authority: await import(
      new URL(
        "functions/_shared/drs-auth/drs-specialist-authority.ts",
        supabaseRoot,
      ).href
    ),
    endpoint: await import(
      new URL("functions/drs-workspace-grant/index.ts", supabaseRoot).href
    ),
    composition: await import(
      new URL(
        "functions/_shared/drs-auth/drs-bff-route-composition.ts",
        supabaseRoot,
      ).href
    ),
  };
}

Deno.test("authority facts normalize exact locked specialist assignment", async () => {
  const { contracts } = await loadProductionModules();
  const result = contracts.validateDrsAuthorityFacts(authorityFacts(), {
    authenticatedUserId: AUTH_USER_ID,
    selectedCaseId: CASE_ID,
    authorizationSubject: SUBJECT,
    requireLocked: true,
  });

  assert.equal(result?.authenticatedUserId, AUTH_USER_ID);
  assert.equal(result?.specialistId, SPECIALIST_ID);
  assert.equal(result?.assignmentId, ASSIGNMENT_ID);
  assert.equal(result?.selectedCaseId, CASE_ID);
  assert.equal(result?.currentCaseId, CASE_ID);
  assert.equal(result?.authorizationSubject, SUBJECT);
  assert.equal(result?.terminatedAt, null);
  assert.equal(result?.lockStatus, "locked");
  assert.equal(Object.isFrozen(result), true);
});

Deno.test("authority facts reject every identity and lifecycle drift", async () => {
  const { contracts } = await loadProductionModules();
  const invalid = [
    authorityFacts({ authenticated_user_id: OTHER_USER_ID }),
    authorityFacts({ specialist_id: OTHER_SPECIALIST_ID }),
    authorityFacts({ assignment_id: "" }),
    authorityFacts({ selected_case_id: OTHER_CASE_ID }),
    authorityFacts({ account_role: "owner" }),
    authorityFacts({ authorization_subject: `${SUBJECT}:drift` }),
    authorityFacts({ auth_binding_status: "revoked" }),
    authorityFacts({ specialist_status: "suspended" }),
    authorityFacts({ assignment_status: "future" }),
    authorityFacts({ valid_from: "not-rfc3339" }),
    authorityFacts({ valid_from: "infinity" }),
    authorityFacts({ valid_from: "-infinity" }),
    authorityFacts({ valid_until: null }),
    authorityFacts({ valid_until: "infinity" }),
    authorityFacts({ valid_until: "-infinity" }),
    authorityFacts({ valid_until: "2026-08-23T00:00:00.000Z" }),
    authorityFacts({ terminated_at: "2026-08-24T01:00:00.000Z" }),
    authorityFacts({ lock_status: "unlocked" }),
    authorityFacts({ authorized: false }),
  ];

  for (const candidate of invalid) {
    assert.equal(
      contracts.validateDrsAuthorityFacts(candidate, {
        authenticatedUserId: AUTH_USER_ID,
        selectedCaseId: CASE_ID,
        authorizationSubject: SUBJECT,
        requireLocked: true,
      }),
      null,
    );
  }
});

Deno.test("workspace grant projection is exact minimal service data", async () => {
  const { contracts } = await loadProductionModules();
  assert.deepEqual(
    contracts.validateDrsWorkspaceGrantProjection?.(
      workspaceGrantProjection(),
    ),
    {
      selectedCaseId: CASE_ID,
      caseStatus: "active",
      accessMode: "read_only",
    },
  );
  assert.equal(
    contracts.validateDrsWorkspaceGrantProjection?.(
      workspaceGrantProjection({ specialist_id: SPECIALIST_ID }),
    ),
    null,
  );
  assert.equal(
    contracts.validateDrsWorkspaceGrantProjection?.(authorityFacts()),
    null,
  );
});

Deno.test("authority facts reject future and expired assignment windows", async () => {
  const { contracts } = await loadProductionModules();
  const expectation = {
    authenticatedUserId: AUTH_USER_ID,
    selectedCaseId: CASE_ID,
    authorizationSubject: SUBJECT,
    requireLocked: true,
    nowMs: Date.parse("2026-08-24T12:00:00.000Z"),
  };
  assert.equal(
    contracts.validateDrsAuthorityFacts(
      authorityFacts({ valid_from: "2026-08-25T00:00:00.000Z" }),
      expectation,
    ),
    null,
  );
  assert.equal(
    contracts.validateDrsAuthorityFacts(
      authorityFacts({ valid_until: "2026-08-24T11:59:59.000Z" }),
      expectation,
    ),
    null,
  );
});

Deno.test("strategy fails closed without its server-only authority port", async () => {
  const { authority } = await loadProductionModules();
  const strategy = authority.createDrsSpecialistAuthorizationStrategy(null);
  const result = await strategy.resolveAuthorization({
    authenticatedUserId: AUTH_USER_ID,
    accountRole: "drs",
    pending: null,
  });
  assert.equal(result, null);
});

Deno.test("strategy enforces pending case and subject without owner/vendor fallback", async () => {
  const { authority } = await loadProductionModules();
  let authorityCalls = 0;
  let fallbackCalls = 0;
  const strategy = authority.createDrsSpecialistAuthorizationStrategy({
    async resolveAuthority(input) {
      authorityCalls += 1;
      assert.deepEqual(input, {
        authenticatedUserId: AUTH_USER_ID,
        expectedCaseId: CASE_ID,
        expectedAuthorizationSubject: SUBJECT,
      });
      return authorityFacts();
    },
    async ownerVendorFallback() {
      fallbackCalls += 1;
      return authorityFacts();
    },
  });

  const result = await strategy.resolveAuthorization({
    authenticatedUserId: AUTH_USER_ID,
    accountRole: "drs",
    pending: {
      currentCaseId: CASE_ID,
      authorizationSubject: SUBJECT,
    },
  });

  assert.equal(result?.currentCaseId, CASE_ID);
  assert.equal(result?.assignmentId, ASSIGNMENT_ID);
  assert.equal(authorityCalls, 1);
  assert.equal(fallbackCalls, 0);

  const denied = await authority.createDrsSpecialistAuthorizationStrategy({
    async resolveAuthority() {
      return authorityFacts({ selected_case_id: OTHER_CASE_ID });
    },
  }).resolveAuthorization({
    authenticatedUserId: AUTH_USER_ID,
    accountRole: "drs",
    pending: { currentCaseId: CASE_ID, authorizationSubject: SUBJECT },
  });
  assert.equal(denied, null);
});

Deno.test("Supabase authority port uses verified user and one service-only RPC via mock transport", async () => {
  const { authority } = await loadProductionModules();
  const calls = [];
  const dependencies = authority.createSupabaseDrsWorkspaceGrantDependencies({
    env: {
      get(name) {
        return {
          SUPABASE_URL: "https://project.supabase.co/",
          SUPABASE_SERVICE_ROLE_KEY: "local-test-service-key",
          LAIBE_ALLOWED_ORIGINS: "https://app.laibe.test",
        }[name];
      },
    },
    async fetch(input, init = {}) {
      calls.push({ input: String(input), init });
      if (String(input).endsWith("/auth/v1/user")) {
        return Response.json({
          id: AUTH_USER_ID,
          email: "must-not-be-authority@example.test",
          user_metadata: { specialist_id: OTHER_SPECIALIST_ID },
        });
      }
      return Response.json(workspaceGrantProjection());
    },
  });

  const identity = await dependencies.resolveAuthenticatedIdentity(exactPost());
  assert.deepEqual(identity, { userId: AUTH_USER_ID });
  const facts = await dependencies.resolveWorkspaceGrant({
    authenticatedUserId: AUTH_USER_ID,
    expectedCaseId: CASE_ID,
    expectedAuthorizationSubject: SUBJECT,
  });
  assert.deepEqual(facts, workspaceGrantProjection());
  assert.equal(calls.length, 2);
  assert.equal(calls[0].input, "https://project.supabase.co/auth/v1/user");
  assert.equal(
    calls[0].init.headers.authorization,
    "Bearer verified-user-jwt",
  );
  assert.equal(
    calls[1].input,
    "https://project.supabase.co/rest/v1/rpc/drs_workspace_grant_v1",
  );
  assert.deepEqual(JSON.parse(calls[1].init.body), {
    p_authenticated_user_id: AUTH_USER_ID,
    p_expected_case_id: CASE_ID,
    p_authorization_subject: SUBJECT,
  });
});

function exactPost(
  body = "{}",
  url = "https://edge.test/functions/v1/drs-workspace-grant",
) {
  return new Request(url, {
    method: "POST",
    headers: {
      authorization: "Bearer verified-user-jwt",
      "content-type": "application/json",
      origin: "https://app.laibe.test",
    },
    body,
  });
}

function bffContext(overrides = {}) {
  return Object.freeze({
    authenticatedUserId: AUTH_USER_ID,
    specialistId: SPECIALIST_ID,
    authorizationSubject: SUBJECT,
    selectedCaseId: CASE_ID,
    caseStatus: "ACTIVE",
    accessMode: "read_only",
    proofExpiresAt: "2099-01-01T00:00:00.000Z",
    ...overrides,
  });
}

function acceptedBffGuard(overrides = {}, onAuthorize = () => {}) {
  return Object.freeze({
    authorize(request) {
      onAuthorize(request);
      return bffContext(overrides);
    },
  });
}

function rejectingBffGuard(error, onAuthorize = () => {}) {
  return Object.freeze({
    authorize(request) {
      onAuthorize(request);
      throw error;
    },
  });
}

function endpointDependencies(overrides = {}) {
  return {
    runtimeAvailable: true,
    allowedOrigins: ["https://app.laibe.test"],
    async resolveAuthenticatedIdentity() {
      return { userId: AUTH_USER_ID };
    },
    async resolveWorkspaceGrant() {
      return workspaceGrantProjection();
    },
    ...overrides,
  };
}

Deno.test("workspace grant keeps CORS and centralized BFF rejection before authority", async () => {
  const { endpoint, composition } = await loadProductionModules();
  const order = [];
  let legacyIdentityCalls = 0;
  const dependencies = endpointDependencies({
    resolveAuthenticatedIdentity() {
      legacyIdentityCalls += 1;
      return { userId: AUTH_USER_ID };
    },
    resolveWorkspaceGrant(expectation) {
      order.push("workspace-rpc");
      assert.deepEqual(expectation, {
        authenticatedUserId: AUTH_USER_ID,
        expectedCaseId: CASE_ID,
        expectedAuthorizationSubject: SUBJECT,
      });
      return workspaceGrantProjection();
    },
  });
  const handler = endpoint.createDrsWorkspaceGrantHandler(
    dependencies,
    acceptedBffGuard({}, () => order.push("bff-guard")),
  );
  let rejectedGuardCalls = 0;
  const invalidHandler = endpoint.createDrsWorkspaceGrantHandler(
    dependencies,
    rejectingBffGuard(
      new composition.DrsBffRouteGuardError("INVALID_REQUEST", 400),
      () => {
        rejectedGuardCalls += 1;
      },
    ),
  );

  for (
    const request of [
      new Request("https://edge.test/functions/v1/drs-workspace-grant", {
        method: "GET",
        headers: { origin: "https://app.laibe.test" },
      }),
      exactPost(
        "{}",
        "https://edge.test/functions/v1/drs-workspace-grant?case_id=x",
      ),
      ...[
        "",
        "[]",
        '{"case_id":"x"}',
        '{"email":"x@y.test"}',
        '{"line_user_id":"U123"}',
      ].map((body) => exactPost(body)),
    ]
  ) {
    const response = await invalidHandler(request);
    assert.equal(response.status, 400);
    assert.deepEqual(await response.json(), { state: "INVALID_REQUEST" });
  }
  assert.equal(rejectedGuardCalls, 7);
  assert.deepEqual(order, []);

  const disallowedOrigin = await handler(
    new Request("https://edge.test/functions/v1/drs-workspace-grant", {
      method: "OPTIONS",
      headers: { origin: "https://evil.test" },
    }),
  );
  assert.equal(disallowedOrigin.status, 403);
  assert.equal(disallowedOrigin.headers.get("vary"), "Origin");

  const preflight = await handler(
    new Request("https://edge.test/functions/v1/drs-workspace-grant", {
      method: "OPTIONS",
      headers: {
        origin: "https://app.laibe.test",
        "access-control-request-method": "POST",
        "access-control-request-headers": "authorization, content-type, apikey",
      },
    }),
  );
  assert.equal(preflight.status, 204);
  assert.equal(
    preflight.headers.get("access-control-allow-origin"),
    "https://app.laibe.test",
  );
  for (
    const invalidPreflight of [
      new Request("https://edge.test/functions/v1/drs-workspace-grant", {
        method: "OPTIONS",
        headers: { "access-control-request-method": "POST" },
      }),
      new Request("https://edge.test/functions/v1/drs-workspace-grant", {
        method: "OPTIONS",
        headers: {
          origin: "https://app.laibe.test",
          "access-control-request-method": "DELETE",
        },
      }),
      new Request("https://edge.test/functions/v1/drs-workspace-grant", {
        method: "OPTIONS",
        headers: {
          origin: "https://app.laibe.test",
          "access-control-request-method": "POST",
          "access-control-request-headers": "authorization, x-case-id",
        },
      }),
    ]
  ) {
    const response = await handler(invalidPreflight);
    assert.equal(response.status, 403);
    assert.equal(response.headers.get("vary"), "Origin");
  }
  assert.deepEqual(order, []);

  const noOrigin = await handler(
    new Request("https://edge.test/functions/v1/drs-workspace-grant", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{}",
    }),
  );
  assert.equal(noOrigin.status, 200);
  assert.equal(noOrigin.headers.get("vary"), "Origin");
  assert.deepEqual(order, ["bff-guard", "workspace-rpc"]);
  assert.equal(legacyIdentityCalls, 0);
});

Deno.test("workspace grant separates 401 403 and 503 with sanitized errors", async () => {
  const { endpoint, composition } = await loadProductionModules();
  const missingAuth = await endpoint.createDrsWorkspaceGrantHandler(
    endpointDependencies(),
    rejectingBffGuard(
      new composition.DrsBffRouteGuardError("AUTH_REQUIRED", 401),
    ),
  )(exactPost());
  assert.equal(missingAuth.status, 401);
  assert.deepEqual(await missingAuth.json(), { state: "AUTH_REQUIRED" });

  const unavailable = await endpoint.createDrsWorkspaceGrantHandler(
    endpointDependencies({ runtimeAvailable: false }),
    acceptedBffGuard(),
  )(exactPost());
  assert.equal(unavailable.status, 503);
  assert.deepEqual(await unavailable.json(), { state: "CONTEXT_UNAVAILABLE" });

  const denied = await endpoint.createDrsWorkspaceGrantHandler(
    endpointDependencies({
      async resolveWorkspaceGrant() {
        return {
          authorized: false,
          state: "CASE_SELECTION_REQUIRED",
          raw: "secret",
        };
      },
    }),
    acceptedBffGuard(),
  )(exactPost());
  assert.equal(denied.status, 403);
  assert.deepEqual(await denied.json(), { state: "CASE_SELECTION_REQUIRED" });

  const rpcUnavailable = await endpoint.createDrsWorkspaceGrantHandler(
    endpointDependencies({
      async resolveWorkspaceGrant() {
        return { authorized: false, state: "CONTEXT_UNAVAILABLE" };
      },
    }),
    acceptedBffGuard(),
  )(exactPost());
  assert.equal(rpcUnavailable.status, 503);
  assert.deepEqual(await rpcUnavailable.json(), {
    state: "CONTEXT_UNAVAILABLE",
  });
});

Deno.test("workspace grant maps centralized auth rejection without client identity fallback", async () => {
  const { endpoint, composition } = await loadProductionModules();
  let legacyIdentityCalls = 0;
  let workspaceRpcCalls = 0;
  let guardCalls = 0;
  const dependencies = endpointDependencies({
    resolveAuthenticatedIdentity() {
      legacyIdentityCalls += 1;
      return { userId: AUTH_USER_ID };
    },
    resolveWorkspaceGrant() {
      workspaceRpcCalls += 1;
      return workspaceGrantProjection();
    },
  });
  for (const authorization of [null, "Basic abc", "Bearer   "]) {
    const handler = endpoint.createDrsWorkspaceGrantHandler(
      dependencies,
      rejectingBffGuard(
        new composition.DrsBffRouteGuardError("AUTH_REQUIRED", 401),
        () => {
          guardCalls += 1;
        },
      ),
    );
    const headers = new Headers({
      "content-type": "application/json",
      origin: "https://app.laibe.test",
    });
    if (authorization !== null) headers.set("authorization", authorization);
    const response = await handler(
      new Request("https://edge.test/functions/v1/drs-workspace-grant", {
        method: "POST",
        headers,
        body: "{}",
      }),
    );
    assert.equal(response.status, 401);
    assert.deepEqual(await response.json(), { state: "AUTH_REQUIRED" });
  }
  assert.equal(guardCalls, 3);
  assert.equal(legacyIdentityCalls, 0);
  assert.equal(workspaceRpcCalls, 0);
});

Deno.test("workspace grant exposes only read-only case and next-step state", async () => {
  const { endpoint } = await loadProductionModules();
  const response = await endpoint.createDrsWorkspaceGrantHandler(
    endpointDependencies(),
    acceptedBffGuard(),
  )(exactPost());
  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.deepEqual(payload, {
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
  const serialized = JSON.stringify(payload);
  assert.doesNotMatch(
    serialized,
    /authenticated_user_id|specialist_id|assignment_id|authorization_subject|line_user|email|credential|provider|token|secret/iu,
  );
});

Deno.test("migration adds explicit mappings locked resolver and no DRS case membership", async () => {
  const migration = await readFile(
    new URL(
      "migrations/20260824170000_drs_identity_google_line_w1.sql",
      supabaseRoot,
    ),
    "utf8",
  );
  for (
    const prerequisite of [
      "auth.users",
      "casework.cases",
      "public.drs_specialists",
      "public.drs_case_specialist_assignments",
      "public.drs_case_specialist_assignment_terminations",
      "integration.google_calendar_drs_authorize_transaction_v1(uuid,uuid,text,text)",
    ]
  ) assert.equal(migration.includes(prerequisite), true, prerequisite);

  assert.match(
    migration,
    /create table integration\.drs_auth_specialist_bindings/iu,
  );
  assert.match(
    migration,
    /create table integration\.drs_case_identity_bindings/iu,
  );
  assert.match(
    migration,
    /authenticated_user_id uuid[\s\S]*specialist_id uuid[\s\S]*selected_assignment_id uuid/iu,
  );
  assert.match(migration, /drs_case_id uuid[\s\S]*casework_case_id uuid/iu);
  assert.match(migration, /enable row level security/iu);
  assert.match(migration, /force row level security/iu);
  assert.match(
    migration,
    /create policy[\s\S]*using \(false\)[\s\S]*with check \(false\)/iu,
  );
  assert.doesNotMatch(
    migration,
    /insert\s+into\s+casework\.case_members|alter\s+table\s+casework\.(?:cases|case_members)|create\s+table\s+casework\./iu,
  );
});

Deno.test("migration locks and rechecks exact binding specialist mapping assignment termination", async () => {
  const migration = await readFile(
    new URL(
      "migrations/20260824170000_drs_identity_google_line_w1.sql",
      supabaseRoot,
    ),
    "utf8",
  );
  assert.match(migration, /drs_identity_authority_resolve_locked_v1/iu);
  assert.match(
    migration,
    /from integration\.drs_auth_specialist_bindings[\s\S]*for update/iu,
  );
  assert.match(migration, /from public\.drs_specialists[\s\S]*for update/iu);
  assert.match(
    migration,
    /from public\.drs_case_specialist_assignments[\s\S]*integration\.drs_case_identity_bindings[\s\S]*order by[\s\S]*for update/iu,
  );
  assert.match(
    migration,
    /drs_case_specialist_assignment_terminations[\s\S]*terminated_at/iu,
  );
  assert.match(migration, /CASE_SELECTION_REQUIRED/iu);
  assert.match(migration, /selected_assignment_id/iu);
  assert.match(migration, /authorization_subject[\s\S]*drs-specialist:/iu);
  assert.match(migration, /v_binding_status <> 'active'/iu);
  assert.match(migration, /v_binding_valid_from > v_now/iu);
  assert.match(migration, /v_binding_valid_until[\s\S]*<= v_now/iu);
  assert.match(migration, /v_specialist_state <> 'ACTIVE'/iu);
  assert.match(
    migration,
    /a\.valid_from <= v_now[\s\S]*a\.valid_until[\s\S]*> v_now/iu,
  );
  assert.match(
    migration,
    /m\.mapping_status = 'active'[\s\S]*m\.revoked_at is null/iu,
  );
  assert.match(migration, /c\.case_status = 'active'/iu);
  assert.match(
    migration,
    /if v_termination_at <= v_now then[\s\S]*continue;/iu,
  );
  assert.match(
    migration,
    /greatest\([\s\S]*v_binding_valid_from[\s\S]*mapping_valid_from[\s\S]*assignment_valid_from/iu,
  );
  assert.match(
    migration,
    /least\([\s\S]*v_binding_valid_until[\s\S]*mapping_valid_until[\s\S]*assignment_valid_until[\s\S]*v_termination_at/iu,
  );
  assert.match(migration, /'lock_status',\s*'locked'/iu);
  assert.match(migration, /'assignment_id'/iu);
  assert.match(migration, /'selected_case_id'/iu);
  assert.match(migration, /'terminated_at',\s*null/iu);
});

Deno.test("migration enforces finite bridge windows and selected-assignment index", async () => {
  const migration = await readFile(
    new URL(
      "migrations/20260824170000_drs_identity_google_line_w1.sql",
      supabaseRoot,
    ),
    "utf8",
  );
  const bindingTable = migration.match(
    /create table integration\.drs_auth_specialist_bindings \([\s\S]*?\n\);/iu,
  )?.[0] ?? "";
  const mappingTable = migration.match(
    /create table integration\.drs_case_identity_bindings \([\s\S]*?\n\);/iu,
  )?.[0] ?? "";
  assert.match(bindingTable, /valid_until timestamptz not null/iu);
  assert.match(mappingTable, /valid_until timestamptz not null/iu);
  const missingFiniteConstraints = [
    ["integration.drs_auth_specialist_bindings", bindingTable],
    ["integration.drs_case_identity_bindings", mappingTable],
  ].filter(([, table]) =>
    !/isfinite\(valid_from\)[\s\S]*isfinite\(valid_until\)[\s\S]*valid_until > valid_from/iu
      .test(table)
  ).map(([name]) => name);
  assert.deepEqual(
    missingFiniteConstraints,
    [],
    `POSTGRES_FINITE_TIMESTAMP_AUTHORITY_WINDOW_MISSING: ${
      missingFiniteConstraints.join(
        ",",
      )
    }`,
  );
  assert.match(
    migration,
    /create index drs_auth_specialist_bindings_selected_assignment_idx[\s\S]*\(selected_assignment_id\)[\s\S]*where selected_assignment_id is not null/iu,
  );
});

Deno.test("public workspace RPC projects only minimal service grant fields", async () => {
  const migration = await readFile(
    new URL(
      "migrations/20260824170000_drs_identity_google_line_w1.sql",
      supabaseRoot,
    ),
    "utf8",
  );
  const rpc = migration.match(
    /create or replace function public\.drs_workspace_grant_v1\([\s\S]*?\n\$\$;/iu,
  )?.[0] ?? "";
  for (
    const field of [
      "authorized",
      "state",
      "case_id",
      "case_status",
      "access_mode",
    ]
  ) assert.match(rpc, new RegExp(`'${field}'`, "iu"));
  assert.doesNotMatch(
    rpc,
    /'authenticated_user_id'|'specialist_id'|'assignment_id'|'authorization_subject'|'lock_status'/iu,
  );
});

Deno.test("migration keeps resolver private and grants only the service read RPC", async () => {
  const migration = await readFile(
    new URL(
      "migrations/20260824170000_drs_identity_google_line_w1.sql",
      supabaseRoot,
    ),
    "utf8",
  );
  assert.match(migration, /security definer[\s\S]*set search_path = ''/iu);
  assert.match(
    migration,
    /alter function integration\.drs_identity_authority_resolve_locked_v1[\s\S]*owner to postgres/iu,
  );
  assert.match(
    migration,
    /revoke all on function integration\.drs_identity_authority_resolve_locked_v1[\s\S]*from public, anon, authenticated, service_role/iu,
  );
  assert.match(
    migration,
    /revoke all on function integration\.google_calendar_drs_authorize_transaction_v1[\s\S]*from public, anon, authenticated, service_role/iu,
  );
  assert.match(
    migration,
    /grant execute on function public\.drs_workspace_grant_v1[\s\S]*to service_role/iu,
  );
  assert.doesNotMatch(
    migration,
    /grant (?:select|insert|update|delete|all)[\s\S]*drs_(?:auth_specialist|case_identity)_bindings[\s\S]*to service_role/iu,
  );
});
