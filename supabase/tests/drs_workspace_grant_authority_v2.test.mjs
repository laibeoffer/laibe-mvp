import assert from "node:assert/strict";

const MODULE_URL = new URL(
  "../functions/_shared/drs-auth/versioned-workspace-grant.ts",
  import.meta.url,
);

const USER_ID = "11111111-1111-4111-8111-111111111111";
const CASE_ID = "22222222-2222-4222-8222-222222222222";
const SPECIALIST_ID = "33333333-3333-4333-8333-333333333333";
const GRANT_ID = "44444444-4444-4444-8444-444444444444";
const SUBJECT = `drs-specialist:${SPECIALIST_ID}`;
const MALFORMED_UUID_SUBJECT =
  "drs-specialist:00000000-0000-0000-8000-000000000000";
const HTTP_DATE = "Wed, 26 Aug 2026 08:12:00 GMT";
const NOW_MS = Date.parse("2026-08-26T08:00:00.000Z");

function candidate(overrides = {}) {
  return {
    authorized: true,
    state: "AUTHORIZED_DRS_VERSIONED_WORKSPACE",
    authenticated_user_id: USER_ID,
    case_id: CASE_ID,
    authorization_subject: SUBJECT,
    grant_id: GRANT_ID,
    grant_version: "9223372036854775807",
    grant_expires_at: "2026-08-26T08:10:00.000Z",
    ...overrides,
  };
}

function expectation(overrides = {}) {
  return {
    authenticatedUserId: USER_ID,
    expectedCaseId: CASE_ID,
    authorizationSubject: SUBJECT,
    nowMs: NOW_MS,
    acceptedAuthorityExpiresAt: "2026-08-26T08:12:00.000Z",
    ...overrides,
  };
}

Deno.test("focused RED: versioned DRS grant authority seam is absent", async () => {
  const module = await import(MODULE_URL.href);
  const grant = module.validateDrsVersionedWorkspaceGrant(
    candidate(),
    expectation(),
  );
  assert.deepEqual(grant, {
    authenticatedUserId: USER_ID,
    selectedCaseId: CASE_ID,
    authorizationSubject: SUBJECT,
    grantId: GRANT_ID,
    grantVersion: "9223372036854775807",
    grantExpiresAt: "2026-08-26T08:10:00.000Z",
  });
});

Deno.test("versioned grant validation preserves bigint precision and closes malformed facts", async () => {
  const { validateDrsVersionedWorkspaceGrant } = await import(MODULE_URL.href);
  for (
    const invalid of [
      candidate({ grant_version: 42 }),
      candidate({ grant_version: "0" }),
      candidate({ grant_version: "01" }),
      candidate({ grant_version: "-1" }),
      candidate({ grant_version: "1.5" }),
      candidate({ grant_version: "18446744073709551616" }),
      candidate({ grant_id: "not-a-uuid" }),
      candidate({
        authenticated_user_id: "55555555-5555-4555-8555-555555555555",
      }),
      candidate({ case_id: "66666666-6666-4666-8666-666666666666" }),
      candidate({ authorization_subject: "drs-specialist:caller-controlled" }),
      candidate({ grant_expires_at: "2026-08-26T08:00:00.000Z" }),
      candidate({ grant_expires_at: "2026-08-26T08:15:00.001Z" }),
      candidate({ grant_expires_at: "2026-08-26T08:13:00.000Z" }),
      { ...candidate(), unexpected: true },
    ]
  ) {
    assert.equal(
      validateDrsVersionedWorkspaceGrant(invalid, expectation()),
      null,
    );
  }
});

Deno.test("focused RED: exact subject and RFC3339 validators reject parser-compatible impostors", async () => {
  const {
    createSupabaseDrsVersionedWorkspaceGrantResolver,
    validateDrsVersionedWorkspaceGrant,
  } = await import(MODULE_URL.href);

  assert.equal(
    validateDrsVersionedWorkspaceGrant(
      candidate({ authorization_subject: MALFORMED_UUID_SUBJECT }),
      expectation({ authorizationSubject: MALFORMED_UUID_SUBJECT }),
    ),
    null,
    "a UUID-shaped suffix that fails the accepted UUID predicate must close",
  );
  assert.equal(
    validateDrsVersionedWorkspaceGrant(
      candidate({ grant_expires_at: HTTP_DATE }),
      expectation(),
    ),
    null,
    "Date.parse-compatible HTTP dates are not the accepted RFC3339 wire syntax",
  );
  assert.equal(
    validateDrsVersionedWorkspaceGrant(
      candidate(),
      expectation({ acceptedAuthorityExpiresAt: HTTP_DATE }),
    ),
    null,
    "accepted authority expiry must use the same exact RFC3339 predicate",
  );
  assert.ok(
    validateDrsVersionedWorkspaceGrant(
      candidate({ grant_expires_at: "2026-08-26T16:10:00+08:00" }),
      expectation({
        acceptedAuthorityExpiresAt: "2026-08-26T16:12:00+08:00",
      }),
    ),
    "an exact RFC3339 offset timestamp remains valid",
  );

  let fetchCalls = 0;
  const resolver = createSupabaseDrsVersionedWorkspaceGrantResolver({
    env: {
      get(name) {
        return name === "SUPABASE_URL"
          ? "https://project.example"
          : "service-role-test-only";
      },
    },
    fetch: () => {
      fetchCalls += 1;
      return Promise.resolve(Response.json(candidate()));
    },
  });
  assert.equal(
    await resolver.issueVersionedWorkspaceGrant(
      expectation({ authorizationSubject: MALFORMED_UUID_SUBJECT }),
    ),
    null,
  );
  assert.equal(
    await resolver.issueVersionedWorkspaceGrant(
      expectation({ acceptedAuthorityExpiresAt: HTTP_DATE }),
    ),
    null,
  );
  assert.equal(
    fetchCalls,
    0,
    "invalid resolver inputs must close before RPC work",
  );
});

Deno.test("service resolver uses only the private v2 RPC contract and validates its response", async () => {
  const { createSupabaseDrsVersionedWorkspaceGrantResolver } = await import(
    MODULE_URL.href
  );
  const calls = [];
  const resolver = createSupabaseDrsVersionedWorkspaceGrantResolver({
    env: {
      get(name) {
        return {
          SUPABASE_URL: "https://project.example/",
          SUPABASE_SERVICE_ROLE_KEY: "service-role-test-only",
        }[name];
      },
    },
    fetch: (input, init) => {
      calls.push({ input: String(input), init });
      return Promise.resolve(Response.json(candidate()));
    },
  });

  const result = await resolver.issueVersionedWorkspaceGrant(expectation());
  assert.equal(resolver.runtimeAvailable, true);
  assert.equal(result?.grantVersion, "9223372036854775807");
  assert.equal(calls.length, 1);
  assert.equal(
    calls[0].input,
    "https://project.example/rest/v1/rpc/drs_workspace_grant_v2",
  );
  assert.deepEqual(JSON.parse(calls[0].init.body), {
    p_authenticated_user_id: USER_ID,
    p_expected_case_id: CASE_ID,
    p_authorization_subject: SUBJECT,
  });
  assert.equal(calls[0].init.headers.apikey, "service-role-test-only");
  assert.equal(
    calls[0].init.headers.authorization,
    "Bearer service-role-test-only",
  );
});

Deno.test("service resolver fails closed on unavailable runtime, denial, and malformed projection", async () => {
  const { createSupabaseDrsVersionedWorkspaceGrantResolver } = await import(
    MODULE_URL.href
  );
  const unavailable = createSupabaseDrsVersionedWorkspaceGrantResolver({
    env: { get() {} },
    fetch: () => Promise.resolve(Response.json(candidate())),
  });
  assert.equal(unavailable.runtimeAvailable, false);
  assert.equal(
    await unavailable.issueVersionedWorkspaceGrant(expectation()),
    null,
  );

  for (
    const payload of [
      { authorized: false, state: "CASE_NOT_AUTHORIZED" },
      candidate({ grant_version: 1 }),
    ]
  ) {
    const resolver = createSupabaseDrsVersionedWorkspaceGrantResolver({
      env: {
        get(name) {
          return name === "SUPABASE_URL"
            ? "https://project.example"
            : "service-role-test-only";
        },
      },
      fetch: () => Promise.resolve(Response.json(payload)),
    });
    assert.equal(
      await resolver.issueVersionedWorkspaceGrant(expectation()),
      null,
    );
  }
});
