import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const paths = {
  contracts: new URL("functions/_shared/google-calendar/contracts.ts", root),
  authorization: new URL(
    "functions/_shared/google-calendar/case-calendar-authorization.ts",
    root,
  ),
  oauth: new URL(
    "functions/_shared/google-calendar/google-oauth-adapter.ts",
    root,
  ),
  migration: new URL(
    "migrations/20260821170000_google_calendar_drs_account_contract.sql",
    root,
  ),
};

const AUTH_USER_ID = "31111111-1111-4111-8111-111111111111";
const CASE_ID = "32222222-2222-4222-8222-222222222222";
const SPECIALIST_SUBJECT =
  "drs-specialist:33333333-3333-4333-8333-333333333333";
const OWNER_REDIRECT =
  "https://project.supabase.co/functions/v1/owner-google-calendar-oauth-callback";
const DRS_REDIRECT =
  "https://project.supabase.co/functions/v1/drs-google-calendar-oauth-callback";
const CREDENTIAL_KEY = Buffer.alloc(32, 7).toString("base64url");

async function loadModules() {
  return {
    authorization: await import(paths.authorization.href),
    oauth: await import(paths.oauth.href),
  };
}

function ownerFacts(role = "owner") {
  return {
    authenticatedUserId: AUTH_USER_ID,
    currentCaseId: CASE_ID,
    membership: {
      userId: AUTH_USER_ID,
      caseId: CASE_ID,
      role,
      status: "active",
    },
  };
}

function drsFacts(overrides = {}) {
  return {
    authenticatedUserId: AUTH_USER_ID,
    currentCaseId: CASE_ID,
    accountRole: "drs",
    authorizationSubject: SPECIALIST_SUBJECT,
    authBindingStatus: "active",
    specialistStatus: "active",
    assignmentStatus: "active",
    selectedCaseId: CASE_ID,
    ...overrides,
  };
}

function runtimeOptions(options = {}) {
  const role = options.role ?? "drs";
  const drsRedirect = Object.hasOwn(options, "drsRedirect")
    ? options.drsRedirect
    : DRS_REDIRECT;
  const ownerRedirect = Object.hasOwn(options, "ownerRedirect")
    ? options.ownerRedirect
    : OWNER_REDIRECT;
  const strategy = options.strategy ?? null;
  const calls = options.calls ?? [];
  const values = new Map([
    ["SUPABASE_URL", "https://project.supabase.co"],
    ["SUPABASE_SERVICE_ROLE_KEY", "service-role-secret"],
    ["LAIBE_CURRENT_CASE_CONTEXT_RPC", "case_member_current_case_context_v1"],
    ["GOOGLE_CALENDAR_CLIENT_ID", "google-client-id"],
    ["GOOGLE_CALENDAR_CLIENT_SECRET", "google-client-secret"],
    ["GOOGLE_CALENDAR_CREDENTIAL_KEY", CREDENTIAL_KEY],
    ["GOOGLE_CALENDAR_REDIRECT_URI", ownerRedirect],
    ["GOOGLE_CALENDAR_DRS_REDIRECT_URI", drsRedirect],
  ]);
  return {
    env: { get: (name) => values.get(name) },
    drsAuthorizationStrategy: strategy,
    fetch: async (input, init = {}) => {
      const url = String(input);
      calls.push({ url, init });
      if (url.endsWith("/auth/v1/user")) {
        return new Response(JSON.stringify({ id: AUTH_USER_ID }), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }
      if (url.includes("/rest/v1/rpc/")) {
        return new Response(JSON.stringify({ authorized: false }), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }
      throw new Error(`unexpected ${role} request: ${url}`);
    },
  };
}

test("CaseMemberRole stays owner|pro while GoogleCalendarAccountRole adds drs", async () => {
  const source = await readFile(paths.contracts, "utf8");
  assert.match(source, /export type CaseMemberRole = "owner" \| "pro";/u);
  assert.match(
    source,
    /export type GoogleCalendarAccountRole = CaseMemberRole \| "drs";/u,
  );
  assert.doesNotMatch(source, /CaseMemberRole\s*=\s*[^;]*"drs"/u);
});

test("drs cannot pass CaseMemberRole checks and is accepted only by the injected specialist strategy", async () => {
  const { authorization, oauth } = await loadModules();
  assert.equal(
    authorization.authorizeCaseMemberContext("drs", ownerFacts()).ok,
    false,
  );

  let strategyCalls = 0;
  const strategyInputs = [];
  const strategy = {
    resolveAuthorization: async (input) => {
      strategyCalls += 1;
      strategyInputs.push(input);
      return drsFacts();
    },
  };
  const rpcCalls = [];
  const dependencies = oauth.createSupabaseGoogleCalendarOAuthDependencies(
    "drs",
    runtimeOptions({ strategy, calls: rpcCalls }),
  );
  const context = await dependencies.resolveServerContext(
    new Request("https://project.supabase.co/functions/v1/drs-start", {
      headers: { authorization: "Bearer real-session" },
    }),
  );

  assert.deepEqual(strategyInputs[0], {
    authenticatedUserId: AUTH_USER_ID,
    accountRole: "drs",
    pending: null,
  });
  assert.deepEqual(context, drsFacts());
  assert.equal(
    rpcCalls.some(({ url }) =>
      url.includes("case_member_google_calendar_authorize_v1")
    ),
    false,
  );
  assert.equal(Object.hasOwn(context, "membership"), false);

  const reauthorized = await dependencies.reauthorizePendingContext(
    {
      authenticatedUserId: AUTH_USER_ID,
      currentCaseId: CASE_ID,
      accountRole: "drs",
      authorizationSubject: SPECIALIST_SUBJECT,
      redirectUri: DRS_REDIRECT,
    },
    { userId: AUTH_USER_ID },
    "drs",
  );
  assert.deepEqual(reauthorized, drsFacts());
  assert.deepEqual(strategyInputs[1], {
    authenticatedUserId: AUTH_USER_ID,
    accountRole: "drs",
    pending: {
      currentCaseId: CASE_ID,
      authorizationSubject: SPECIALIST_SUBJECT,
    },
  });
  assert.equal(strategyCalls, 2);

  const withoutStrategy = oauth.createSupabaseGoogleCalendarOAuthDependencies(
    "drs",
    runtimeOptions({ strategy: null }),
  );
  assert.equal(
    await withoutStrategy.resolveServerContext(
      new Request("https://project.supabase.co/functions/v1/drs-start", {
        headers: { authorization: "Bearer real-session" },
      }),
    ),
    null,
  );
});

test("drs specialist facts fail closed unless binding, authority, assignment and selected case are exact", async () => {
  const { oauth } = await loadModules();
  for (
    const invalid of [
      { authenticatedUserId: "39999999-9999-4999-8999-999999999999" },
      { accountRole: "owner" },
      { authorizationSubject: "" },
      { authBindingStatus: "inactive" },
      { specialistStatus: "inactive" },
      { assignmentStatus: "revoked" },
      { selectedCaseId: "39999999-9999-4999-8999-999999999999" },
    ]
  ) {
    const dependencies = oauth.createSupabaseGoogleCalendarOAuthDependencies(
      "drs",
      runtimeOptions({
        strategy: {
          resolveAuthorization: async () => drsFacts(invalid),
        },
      }),
    );
    const context = await dependencies.resolveServerContext(
      new Request("https://project.supabase.co/functions/v1/drs-start", {
        headers: { authorization: "Bearer real-session" },
      }),
    );
    assert.equal(context, null);
  }
});

test("drs requires an exact dedicated HTTPS redirect while owner and pro keep the existing redirect", async () => {
  const { oauth } = await loadModules();
  const strategy = { resolveAuthorization: async () => drsFacts() };
  for (
    const drsRedirect of [
      undefined,
      "",
      OWNER_REDIRECT,
      "http://project.test/drs-callback",
    ]
  ) {
    const dependencies = oauth.createSupabaseGoogleCalendarOAuthDependencies(
      "drs",
      runtimeOptions({ drsRedirect, strategy }),
    );
    assert.equal(
      await dependencies.resolveServerContext(
        new Request("https://project.supabase.co/functions/v1/drs-start", {
          headers: { authorization: "Bearer real-session" },
        }),
      ),
      null,
    );
  }

  for (const role of ["owner", "pro"]) {
    const calls = [];
    const dependencies = oauth.createSupabaseGoogleCalendarOAuthDependencies(
      role,
      runtimeOptions({
        role,
        drsRedirect: "https://different.test/drs-only-callback",
        calls,
      }),
    );
    const url = new URL(dependencies.oauth.createAuthorizationUrl({
      state: "opaque-state",
      codeChallenge: "pkce-challenge",
    }));
    assert.equal(url.searchParams.get("redirect_uri"), OWNER_REDIRECT);
  }
});

test("drs OAuth start persists only server-derived role, subject, case and redirect", async () => {
  const { oauth } = await loadModules();
  let stored = null;
  const handler = oauth.createOAuthStartHandler("drs", {
    redirectUri: DRS_REDIRECT,
    resolveServerContext: async () => drsFacts(),
    sealSecret: async () => "sealed-verifier",
    storePendingOAuth: async (pending) => {
      stored = pending;
    },
    oauth: { createAuthorizationUrl: () => "https://accounts.google.com/" },
  });
  const response = await handler(
    new Request("https://project.supabase.co/functions/v1/drs-start", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        accountRole: "owner",
        authorizationSubject: "browser-forged-subject",
        currentCaseId: "browser-forged-case",
      }),
    }),
  );
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.state, "OAUTH_REDIRECT_REQUIRED");
  assert.equal(stored.accountRole, "drs");
  assert.equal(stored.authenticatedUserId, AUTH_USER_ID);
  assert.equal(stored.currentCaseId, CASE_ID);
  assert.equal(stored.authorizationSubject, SPECIALIST_SUBJECT);
  assert.equal(stored.redirectUri, DRS_REDIRECT);
  assert.equal(JSON.stringify(body).includes(SPECIALIST_SUBJECT), false);
  assert.equal(JSON.stringify(body).includes("browser-forged"), false);
});

test("grant/start app authorization keeps gateway-compatible 401 and rejects owner/pro context as drs with sanitized 403", async () => {
  const { oauth } = await loadModules();
  const missingJwt = oauth.createOAuthStartHandler("drs", {
    redirectUri: DRS_REDIRECT,
    resolveServerContext: async () => null,
  });
  const missingResponse = await missingJwt(
    new Request("https://project.supabase.co/functions/v1/drs-start", {
      method: "POST",
    }),
  );
  assert.equal(missingResponse.status, 401);
  assert.deepEqual(await missingResponse.json(), { state: "AUTH_REQUIRED" });

  for (const role of ["owner", "pro"]) {
    const wrongAccount = oauth.createOAuthStartHandler("drs", {
      redirectUri: DRS_REDIRECT,
      resolveServerContext: async () => ownerFacts(role),
    });
    const response = await wrongAccount(
      new Request("https://project.supabase.co/functions/v1/drs-start", {
        method: "POST",
        headers: { authorization: "Bearer valid-owner-or-pro-jwt" },
      }),
    );
    assert.equal(response.status, 403);
    assert.deepEqual(await response.json(), { state: "CASE_NOT_AUTHORIZED" });
  }
});

test("drs callback rejects role, subject and redirect swaps before token exchange", async () => {
  const { oauth } = await loadModules();
  const issued = await oauth.issueOAuthMaterial({
    nowMs: Date.now(),
    ttlMs: 600_000,
  });
  let exchangeCalls = 0;
  const variants = [
    { stateDigest: "0".repeat(64) },
    { expiresAt: new Date(Date.now() - 1).toISOString() },
    { consumedAt: new Date().toISOString() },
    { accountRole: "owner" },
    { authorizationSubject: "drs-specialist:attacker" },
    { redirectUri: OWNER_REDIRECT },
  ];
  for (const variant of variants) {
    const handler = oauth.createOAuthCallbackHandler("drs", {
      redirectUri: DRS_REDIRECT,
      loadPendingOAuth: async () => ({
        stateDigest: issued.stateDigest,
        authenticatedUserId: AUTH_USER_ID,
        currentCaseId: CASE_ID,
        accountRole: "drs",
        authorizationSubject: SPECIALIST_SUBJECT,
        redirectUri: DRS_REDIRECT,
        sealedVerifier: "sealed-verifier",
        expiresAt: issued.expiresAt,
        consumedAt: null,
        ...variant,
      }),
      reauthorizePendingContext: async () => drsFacts(),
      unsealSecret: async () => issued.codeVerifier,
      oauth: {
        exchangeCode: async () => {
          exchangeCalls += 1;
          throw new Error("must not exchange swapped state");
        },
      },
    });
    const response = await handler(
      new Request(
        `${DRS_REDIRECT}?code=oauth-code&state=${issued.state}`,
      ),
    );
    assert.notEqual(response.status, 200);
  }
  assert.equal(exchangeCalls, 0);
});

test("drs callback commits the server authorization subject once and returns no credential", async () => {
  const { oauth } = await loadModules();
  const issued = await oauth.issueOAuthMaterial({
    nowMs: Date.now(),
    ttlMs: 600_000,
  });
  let commitInput = null;
  const handler = oauth.createOAuthCallbackHandler("drs", {
    redirectUri: DRS_REDIRECT,
    loadPendingOAuth: async () => ({
      stateDigest: issued.stateDigest,
      authenticatedUserId: AUTH_USER_ID,
      currentCaseId: CASE_ID,
      accountRole: "drs",
      authorizationSubject: SPECIALIST_SUBJECT,
      redirectUri: DRS_REDIRECT,
      sealedVerifier: "sealed-verifier",
      expiresAt: issued.expiresAt,
      consumedAt: null,
    }),
    reauthorizePendingContext: async () => drsFacts(),
    unsealSecret: async () => issued.codeVerifier,
    oauth: {
      exchangeCode: async () => ({
        ok: true,
        publicResult: { state: "CONNECTED_PENDING_BINDING", scopes: [] },
        credentialEnvelope: {
          accessToken: "access-secret",
          refreshToken: "refresh-secret",
          expiresIn: 3600,
          idToken: "identity-secret",
        },
      }),
      resolveGoogleAccountAndCalendar: async () => ({
        googleSubject: "google-subject",
        calendarId: "drs-calendar@example.test",
      }),
    },
    sealCredential: async () => ({
      encryptedAccessToken: "sealed-access",
      encryptedRefreshToken: "sealed-refresh",
    }),
    commitBinding: async (input) => {
      commitInput = input;
      return { ok: true, state: "CONNECTED" };
    },
  });
  const response = await handler(
    new Request(
      `${DRS_REDIRECT}?code=oauth-code&state=${issued.state}&user_id=attacker&account_role=owner`,
      { headers: { authorization: "Bearer attacker-browser-session" } },
    ),
  );
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.deepEqual(body, { state: "CONNECTED" });
  assert.equal(commitInput.accountRole, "drs");
  assert.equal(commitInput.authorizationSubject, SPECIALIST_SUBJECT);
  assert.equal(commitInput.redirectUri, DRS_REDIRECT);
  assert.equal(JSON.stringify(body).includes("secret"), false);
  assert.equal(JSON.stringify(commitInput).includes("access-secret"), false);
  assert.equal(JSON.stringify(commitInput).includes("refresh-secret"), false);
});

test("drs callback never reports CONNECTED when the atomic persistence commit fails", async () => {
  const { oauth } = await loadModules();
  const issued = await oauth.issueOAuthMaterial({
    nowMs: Date.now(),
    ttlMs: 600_000,
  });
  const handler = oauth.createOAuthCallbackHandler("drs", {
    redirectUri: DRS_REDIRECT,
    loadPendingOAuth: async () => ({
      stateDigest: issued.stateDigest,
      authenticatedUserId: AUTH_USER_ID,
      currentCaseId: CASE_ID,
      accountRole: "drs",
      authorizationSubject: SPECIALIST_SUBJECT,
      redirectUri: DRS_REDIRECT,
      sealedVerifier: "sealed-verifier",
      expiresAt: issued.expiresAt,
      consumedAt: null,
    }),
    reauthorizePendingContext: async () => drsFacts(),
    unsealSecret: async () => issued.codeVerifier,
    oauth: {
      exchangeCode: async () => ({
        ok: true,
        publicResult: { state: "CONNECTED_PENDING_BINDING", scopes: [] },
        credentialEnvelope: {
          accessToken: "access-secret",
          refreshToken: null,
          expiresIn: 3600,
          idToken: null,
        },
      }),
      resolveGoogleAccountAndCalendar: async () => ({
        googleSubject: "google-subject",
        calendarId: "drs-calendar@example.test",
      }),
    },
    sealCredential: async () => ({
      encryptedAccessToken: "sealed-access",
      encryptedRefreshToken: null,
    }),
    commitBinding: async () => ({ ok: false, state: "IDENTITY_MISMATCH" }),
  });
  const response = await handler(
    new Request(`${DRS_REDIRECT}?code=oauth-code&state=${issued.state}`),
  );
  assert.equal(response.status, 409);
  assert.deepEqual(await response.json(), { state: "IDENTITY_MISMATCH" });
});

test("callback reauthorization failure stops before provider exchange and credential commit", async () => {
  const { oauth } = await loadModules();
  const issued = await oauth.issueOAuthMaterial({
    nowMs: Date.now(),
    ttlMs: 600_000,
  });
  let exchangeCalls = 0;
  let commitCalls = 0;
  const handler = oauth.createOAuthCallbackHandler("drs", {
    redirectUri: DRS_REDIRECT,
    loadPendingOAuth: async () => ({
      stateDigest: issued.stateDigest,
      authenticatedUserId: AUTH_USER_ID,
      currentCaseId: CASE_ID,
      accountRole: "drs",
      authorizationSubject: SPECIALIST_SUBJECT,
      redirectUri: DRS_REDIRECT,
      sealedVerifier: "sealed-verifier",
      expiresAt: issued.expiresAt,
      consumedAt: null,
    }),
    reauthorizePendingContext: async () =>
      drsFacts({
        specialistStatus: "inactive",
      }),
    unsealSecret: async () => issued.codeVerifier,
    oauth: {
      exchangeCode: async () => {
        exchangeCalls += 1;
        throw new Error("must not exchange after authority revocation");
      },
    },
    commitBinding: async () => {
      commitCalls += 1;
    },
  });
  const response = await handler(
    new Request(`${DRS_REDIRECT}?code=oauth-code&state=${issued.state}`),
  );
  assert.equal(response.status, 403);
  assert.equal(exchangeCalls, 0);
  assert.equal(commitCalls, 0);
  assert.notDeepEqual(await response.json(), { state: "CONNECTED" });
});

test("non-2xx Google token responses fail closed without exposing client secret or token payload", async () => {
  const { oauth } = await loadModules();
  const adapter = oauth.createGoogleOAuthAdapter({
    clientId: "client-id",
    clientSecret: "server-client-secret",
    redirectUri: DRS_REDIRECT,
    fetch: async () =>
      new Response(
        JSON.stringify({
          error: "invalid_grant",
          access_token: "leaked-token",
        }),
        { status: 400, headers: { "content-type": "application/json" } },
      ),
  });
  const result = await adapter.exchangeCode({
    code: "bad-code",
    codeVerifier: "pkce-verifier",
  });
  assert.equal(result.ok, false);
  assert.deepEqual(result.publicResult, {
    state: "GOOGLE_CALENDAR_RECONNECT_REQUIRED",
  });
  assert.equal(JSON.stringify(result).includes("server-client-secret"), false);
  assert.equal(JSON.stringify(result).includes("leaked-token"), false);
});

test("every provider response is checked before user or calendar data is consumed", async () => {
  const { oauth } = await loadModules();
  let fetchCalls = 0;
  const identityRejected = oauth.createGoogleOAuthAdapter({
    clientId: "client-id",
    clientSecret: "server-client-secret",
    redirectUri: DRS_REDIRECT,
    fetch: async () => {
      fetchCalls += 1;
      return new Response(JSON.stringify({ sub: "provider-subject" }), {
        status: 503,
        headers: { "content-type": "application/json" },
      });
    },
  });
  assert.equal(
    await identityRejected.resolveGoogleAccountAndCalendar("access-secret"),
    null,
  );
  assert.equal(fetchCalls, 1);

  const replies = [
    new Response(JSON.stringify({ sub: "provider-subject" }), {
      status: 200,
      headers: { "content-type": "application/json" },
    }),
    new Response(
      JSON.stringify({ items: [{ primary: true, id: "provider-calendar" }] }),
      { status: 502, headers: { "content-type": "application/json" } },
    ),
  ];
  const calendarRejected = oauth.createGoogleOAuthAdapter({
    clientId: "client-id",
    clientSecret: "server-client-secret",
    redirectUri: DRS_REDIRECT,
    fetch: async () => replies.shift(),
  });
  assert.equal(
    await calendarRejected.resolveGoogleAccountAndCalendar("access-secret"),
    null,
  );
});

test("shared DRS OAuth source has no user-visible logging path for identifiers or credentials", async () => {
  const source = await readFile(paths.oauth, "utf8");
  assert.doesNotMatch(source, /console\.(?:log|info|warn|error)|logger\./u);
  assert.doesNotMatch(
    source,
    /jsonResponse\([^\n]*authenticatedUserId|jsonResponse\([^\n]*authorizationSubject/u,
  );
});

test("DRS persistence adds role and specialist subject without a case-member foreign key", async () => {
  const sql = await readFile(paths.migration, "utf8");
  assert.match(sql, /^begin;/iu);
  assert.match(sql, /commit;\s*$/iu);
  assert.match(
    sql,
    /google_calendar_oauth_states[\s\S]*account_role in \('owner', 'pro', 'drs'\)/iu,
  );
  assert.match(sql, /authorization_subject\s+text/iu);
  assert.match(sql, /create table integration\.drs_google_calendar_bindings/iu);
  const drsTable = sql.match(
    /create table integration\.drs_google_calendar_bindings[\s\S]*?\n\);/iu,
  )?.[0] ?? "";
  assert.match(
    drsTable,
    /account_role\s+text[^\n]*check \(account_role = 'drs'\)/iu,
  );
  assert.match(drsTable, /authorization_subject\s+text\s+not null/iu);
  assert.match(drsTable, /references auth\.users\(id\)/iu);
  assert.match(drsTable, /references casework\.cases\(id\)/iu);
  assert.doesNotMatch(drsTable, /references casework\.case_members/iu);
  assert.match(sql, /where state_digest = p_state_digest\s+for update;/iu);
  assert.match(
    sql,
    /v_state\.authorization_subject is distinct from p_authorization_subject/iu,
  );
  assert.match(sql, /v_state\.redirect_uri is distinct from p_redirect_uri/iu);
  assert.match(sql, /set consumed_at = v_now\s+where id = v_state\.id;/iu);
  assert.match(sql, /grant execute[\s\S]*to service_role/iu);
  assert.doesNotMatch(sql, /grant execute[\s\S]*to (?:anon|authenticated)/iu);
  assert.doesNotMatch(sql, /@[A-Za-z0-9.-]+\.(?:com|tw)/iu);
});

test("final DRS callback transaction requires the authoritative DRS hook after locking state and before writes", async () => {
  const sql = await readFile(paths.migration, "utf8");
  const commitFunction = sql.match(
    /create or replace function public\.google_calendar_account_commit_callback_v2\([\s\S]*?\n\$\$;/iu,
  )?.[0] ?? "";
  const stateLock = commitFunction.indexOf("for update;");
  const hookCall = commitFunction.indexOf(
    "integration.google_calendar_drs_authorize_transaction_v1",
  );
  const credentialWrite = commitFunction.indexOf(
    "insert into integration.google_calendar_credentials",
  );
  const consumedWrite = commitFunction.indexOf("set consumed_at = v_now");

  assert.notEqual(stateLock, -1);
  assert.ok(hookCall > stateLock);
  assert.ok(credentialWrite > hookCall);
  assert.ok(consumedWrite > credentialWrite);
  assert.match(
    commitFunction,
    /to_regprocedure\('integration\.google_calendar_drs_authorize_transaction_v1\(uuid,uuid,text,text\)'\) is null/iu,
  );
  assert.match(
    commitFunction,
    /v_authorization\s*->\s*'authorized'\s+is distinct from\s+'true'::jsonb/iu,
  );
  assert.match(
    commitFunction,
    /v_authorization\s*->\s*'authorization_subject'\s+is distinct from\s+to_jsonb\(v_state\.authorization_subject\)/iu,
  );
  assert.doesNotMatch(
    commitFunction,
    /from auth\.users[\s\S]*join casework\.cases/iu,
  );
});

test("DRS transaction hook is a private fail-closed integration point with a serialized authority contract", async () => {
  const sql = await readFile(paths.migration, "utf8");
  assert.match(
    sql,
    /create or replace function integration\.google_calendar_drs_authorize_transaction_v1\(\s*p_user_id uuid,\s*p_case_id uuid,\s*p_account_role text,\s*p_authorization_subject text\s*\)[\s\S]*returns jsonb/iu,
  );
  assert.match(
    sql,
    /'authorized', false[\s\S]*'state', 'DRS_AUTHORIZATION_HOOK_UNAVAILABLE'/iu,
  );
  assert.match(
    sql,
    /comment on function integration\.google_calendar_drs_authorize_transaction_v1[\s\S]*FOR UPDATE[\s\S]*auth-user-to-specialist binding[\s\S]*ACTIVE specialist[\s\S]*selected-case assignment[\s\S]*termination/iu,
  );
  assert.match(
    sql,
    /revoke all on function integration\.google_calendar_drs_authorize_transaction_v1[\s\S]*from public, anon, authenticated, service_role/iu,
  );
});

test("DRS hook denial, malformed output, revocation or subject mismatch returns before every persistent write", async () => {
  const sql = await readFile(paths.migration, "utf8");
  const commitFunction = sql.match(
    /create or replace function public\.google_calendar_account_commit_callback_v2\([\s\S]*?\n\$\$;/iu,
  )?.[0] ?? "";
  const hookCall = commitFunction.indexOf(
    "integration.google_calendar_drs_authorize_transaction_v1",
  );
  const denial = commitFunction.indexOf(
    "return jsonb_build_object('ok', false, 'state', 'CASE_NOT_AUTHORIZED')",
    hookCall,
  );
  const credentialWrite = commitFunction.indexOf(
    "insert into integration.google_calendar_credentials",
  );

  assert.ok(hookCall > -1);
  assert.ok(denial > hookCall);
  assert.ok(credentialWrite > denial);
  for (const requiredFact of [
    "authenticated_user_id",
    "selected_case_id",
    "account_role",
    "authorization_subject",
    "auth_binding_status",
    "specialist_status",
    "assignment_status",
    "lock_status",
  ]) {
    assert.match(commitFunction, new RegExp(`'${requiredFact}'`, "u"));
  }
  assert.match(commitFunction, /exception\s+when others then[\s\S]*CASE_NOT_AUTHORIZED/iu);
});

test("DRS callback persistence uses only the locked pending identity, case, role and authorization subject", async () => {
  const sql = await readFile(paths.migration, "utf8");
  const commitFunction = sql.match(
    /create or replace function public\.google_calendar_account_commit_callback_v2\([\s\S]*?\n\$\$;/iu,
  )?.[0] ?? "";
  const credentialValues = commitFunction.match(
    /insert into integration\.google_calendar_credentials[\s\S]*?values\s*\(([\s\S]*?)\)\s*on conflict/iu,
  )?.[1] ?? "";
  const drsValues = commitFunction.match(
    /insert into integration\.drs_google_calendar_bindings[\s\S]*?values\s*\(([\s\S]*?)\)\s*on conflict/iu,
  )?.[1] ?? "";

  assert.match(credentialValues, /v_state\.user_id/iu);
  assert.doesNotMatch(credentialValues, /p_user_id/iu);
  assert.match(drsValues, /v_state\.user_id/iu);
  assert.match(drsValues, /v_state\.case_id/iu);
  assert.match(drsValues, /v_state\.account_role/iu);
  assert.match(drsValues, /v_state\.authorization_subject/iu);
  assert.doesNotMatch(
    drsValues,
    /p_user_id|p_account_role|p_authorization_subject/iu,
  );
});

test("owner and pro final transaction reauthorization remains unchanged", async () => {
  const sql = await readFile(paths.migration, "utf8");
  const commitFunction = sql.match(
    /create or replace function public\.google_calendar_account_commit_callback_v2\([\s\S]*?\n\$\$;/iu,
  )?.[0] ?? "";
  assert.match(
    commitFunction,
    /if v_state\.account_role in \('owner', 'pro'\) then[\s\S]*public\.case_member_google_calendar_authorize_v1\(\s*v_state\.user_id,\s*v_state\.case_id,\s*v_state\.account_role\s*\)/iu,
  );
});

test("final callback uses IS DISTINCT FROM so nullable authority facts cannot fall through SQL three-valued logic", async () => {
  const sql = await readFile(paths.migration, "utf8");
  const commitFunction = sql.match(
    /create or replace function public\.google_calendar_account_commit_callback_v2\([\s\S]*?\n\$\$;/iu,
  )?.[0] ?? "";

  const callbackIdentityFacts = [
    ["v_state.user_id", "p_user_id"],
    ["v_state.account_role", "p_account_role"],
    ["v_state.authorization_subject", "p_authorization_subject"],
    ["v_state.redirect_uri", "p_redirect_uri"],
  ];
  for (const [lockedFact, callerFact] of callbackIdentityFacts) {
    assert.match(
      commitFunction,
      new RegExp(
        `${lockedFact.replace(".", "\\.")}\\s+is distinct from\\s+${callerFact}`,
        "iu",
      ),
      `${lockedFact} must reject SQL NULL with IS DISTINCT FROM; <> yields UNKNOWN`,
    );
    assert.doesNotMatch(
      commitFunction,
      new RegExp(
        `${lockedFact.replace(".", "\\.")}\\s*<>\\s*${callerFact}`,
        "iu",
      ),
      `${lockedFact} must not use <> because SQL NULL would bypass IF`,
    );
  }

  const hookFacts = [
    ["authenticated_user_id", "to_jsonb(v_state.user_id::text)"],
    ["selected_case_id", "to_jsonb(v_state.case_id::text)"],
    ["account_role", "to_jsonb(v_state.account_role)"],
    ["authorization_subject", "to_jsonb(v_state.authorization_subject)"],
    ["auth_binding_status", "to_jsonb('active'::text)"],
    ["specialist_status", "to_jsonb('active'::text)"],
    ["assignment_status", "to_jsonb('active'::text)"],
    ["lock_status", "to_jsonb('locked'::text)"],
  ];
  for (const [returnedFact, requiredValue] of hookFacts) {
    const fact = `v_authorization\\s*->\\s*'${returnedFact}'`;
    const value = requiredValue
      .replaceAll("(", "\\(")
      .replaceAll(")", "\\)")
      .replaceAll(".", "\\.");
    assert.match(
      commitFunction,
      new RegExp(
        `${fact}\\s+is distinct from\\s+${value}`,
        "iu",
      ),
      `${returnedFact} must reject missing, JSON null, SQL NULL, and wrong values`,
    );
    assert.doesNotMatch(
      commitFunction,
      new RegExp(`${fact}\\s*<>\\s*${value}`, "iu"),
      `${returnedFact} must not use <> because SQL NULL would bypass IF`,
    );
  }
});

test("DRS hook facts preserve JSONB scalar types instead of coercing them through ->>", async () => {
  const sql = await readFile(paths.migration, "utf8");
  const commitFunction = sql.match(
    /create or replace function public\.google_calendar_account_commit_callback_v2\([\s\S]*?\n\$\$;/iu,
  )?.[0] ?? "";
  const hookFacts = [
    ["authenticated_user_id", "to_jsonb(v_state.user_id::text)"],
    ["selected_case_id", "to_jsonb(v_state.case_id::text)"],
    ["account_role", "to_jsonb(v_state.account_role)"],
    ["authorization_subject", "to_jsonb(v_state.authorization_subject)"],
    ["auth_binding_status", "to_jsonb('active'::text)"],
    ["specialist_status", "to_jsonb('active'::text)"],
    ["assignment_status", "to_jsonb('active'::text)"],
    ["lock_status", "to_jsonb('locked'::text)"],
  ];
  for (const [returnedFact, requiredJsonb] of hookFacts) {
    const jsonFact = `v_authorization\\s*->\\s*'${returnedFact}'`;
    const expected = requiredJsonb
      .replaceAll("(", "\\(")
      .replaceAll(")", "\\)")
      .replaceAll(".", "\\.");
    assert.match(
      commitFunction,
      new RegExp(`${jsonFact}\\s+is distinct from\\s+${expected}`, "iu"),
      `${returnedFact} must retain JSONB type so number/boolean values cannot equal a text authority fact`,
    );
    assert.doesNotMatch(
      commitFunction,
      new RegExp(`v_authorization\\s*->>\\s*'${returnedFact}'`, "iu"),
      `${returnedFact} must not use ->> because it erases JSON scalar types`,
    );
  }
});
