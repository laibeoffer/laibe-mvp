import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";

const root = new URL("../", import.meta.url);
const OWNER_CALLBACK_REDIRECT = "https://example.test/callback";
const PRO_CALLBACK_REDIRECT = "https://example.test/pro-callback";
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
    "migrations/20260818165231_case_member_google_calendar_binding.sql",
    root,
  ),
  ownerStart: new URL(
    "functions/owner-google-calendar-oauth-start/index.ts",
    root,
  ),
  ownerCallback: new URL(
    "functions/owner-google-calendar-oauth-callback/index.ts",
    root,
  ),
  ownerGrant: new URL("functions/owner-google-calendar-grant/index.ts", root),
  vendorStart: new URL(
    "functions/vendor-google-calendar-oauth-start/index.ts",
    root,
  ),
  vendorCallback: new URL(
    "functions/vendor-google-calendar-oauth-callback/index.ts",
    root,
  ),
  vendorGrant: new URL("functions/vendor-google-calendar-grant/index.ts", root),
};

async function loadModules() {
  return {
    contracts: await import(paths.contracts.href),
    authorization: await import(paths.authorization.href),
    oauth: await import(paths.oauth.href),
  };
}

function facts(role = "owner") {
  return {
    authenticatedUserId: "11111111-1111-4111-8111-111111111111",
    currentCaseId: "22222222-2222-4222-8222-222222222222",
    membership: {
      userId: "11111111-1111-4111-8111-111111111111",
      caseId: "22222222-2222-4222-8222-222222222222",
      role,
      status: "active",
    },
    calendarBinding: {
      userId: "11111111-1111-4111-8111-111111111111",
      caseId: "22222222-2222-4222-8222-222222222222",
      accountRole: role,
      connectionStatus: "connected",
      bindingStatus: "active",
      calendarId: "vendor+case@example.com",
      timeZone: "Asia/Taipei",
    },
  };
}

test("owner and pro grants are exact same-user same-case server projections", async () => {
  const { authorization } = await loadModules();
  const owner = authorization.resolveCaseMemberCalendarGrant(
    "owner",
    facts("owner"),
  );
  const vendor = authorization.resolveCaseMemberCalendarGrant(
    "pro",
    facts("pro"),
  );
  assert.equal(owner.ok, true);
  assert.equal(owner.grant.schemaVersion, "laibe.owner-calendar-embed.v1");
  assert.equal(owner.grant.membership.role, "owner");
  assert.equal(vendor.ok, true);
  assert.equal(vendor.grant.schemaVersion, "laibe.vendor-calendar-embed.v1");
  assert.equal(vendor.grant.membership.role, "pro");
  assert.equal(Object.hasOwn(owner.grant, "accessToken"), false);
  assert.equal(
    Object.hasOwn(owner.grant.calendarBinding, "refreshToken"),
    false,
  );
});

test("wrong user, case, role, inactive or revoked facts fail closed", async () => {
  const { authorization } = await loadModules();
  const mutations = [
    (v) => {
      v.membership.userId = "99999999-9999-4999-8999-999999999999";
    },
    (v) => {
      v.calendarBinding.userId = "99999999-9999-4999-8999-999999999999";
    },
    (v) => {
      v.membership.caseId = "99999999-9999-4999-8999-999999999999";
    },
    (v) => {
      v.calendarBinding.caseId = "99999999-9999-4999-8999-999999999999";
    },
    (v) => {
      v.membership.role = "pro";
    },
    (v) => {
      v.calendarBinding.accountRole = "pro";
    },
    (v) => {
      v.membership.status = "inactive";
    },
    (v) => {
      v.calendarBinding.bindingStatus = "revoked";
    },
    (v) => {
      v.calendarBinding.connectionStatus = "reconnect_required";
    },
  ];
  for (const mutate of mutations) {
    const value = structuredClone(facts("owner"));
    mutate(value);
    const result = authorization.resolveCaseMemberCalendarGrant("owner", value);
    assert.equal(result.ok, false);
    assert.equal(result.grant, null);
  }
});

test("calendarId must be own data and hostile objects never throw or invoke accessors", async () => {
  const { authorization } = await loadModules();
  let getterCalls = 0;
  const accessor = facts("owner");
  Object.defineProperty(accessor.calendarBinding, "calendarId", {
    get() {
      getterCalls += 1;
      return "attacker@example.com";
    },
  });
  const inherited = facts("owner");
  delete inherited.calendarBinding.calendarId;
  Object.setPrototypeOf(inherited.calendarBinding, {
    calendarId: "attacker@example.com",
  });
  const missing = facts("owner");
  delete missing.calendarBinding.calendarId;
  const blank = facts("owner");
  blank.calendarBinding.calendarId = "   ";
  const nonString = facts("owner");
  nonString.calendarBinding.calendarId = 42;
  const revoked = Proxy.revocable(facts("owner"), {});
  revoked.revoke();
  const throwing = new Proxy({}, {
    getOwnPropertyDescriptor() {
      throw new Error("trap");
    },
  });
  for (
    const value of [
      accessor,
      inherited,
      missing,
      blank,
      nonString,
      revoked.proxy,
      throwing,
    ]
  ) {
    const result = authorization.resolveCaseMemberCalendarGrant("owner", value);
    assert.equal(result.ok, false);
    assert.equal(result.grant, null);
  }
  assert.equal(getterCalls, 0);
});

test("embed URL is derived only from the grant and encodes calendarId", async () => {
  const { contracts, authorization } = await loadModules();
  const resolved = authorization.resolveCaseMemberCalendarGrant(
    "pro",
    facts("pro"),
  );
  assert.equal(resolved.ok, true);
  assert.equal(
    contracts.buildCalendarEmbedUrl(resolved.grant),
    "https://calendar.google.com/calendar/embed?src=vendor%2Bcase%40example.com&ctz=Asia%2FTaipei&hl=zh_TW",
  );
});

test("OAuth state is opaque, expiring, single-use and identity-bound", async () => {
  const { oauth } = await loadModules();
  const issued = await oauth.issueOAuthMaterial({
    nowMs: 1_000,
    ttlMs: 600_000,
  });
  assert.match(issued.state, /^[A-Za-z0-9_-]{40,}$/);
  assert.equal(issued.state.includes("11111111"), false);
  const pending = {
    stateDigest: issued.stateDigest,
    authenticatedUserId: facts().authenticatedUserId,
    expiresAt: new Date(601_000).toISOString(),
    consumedAt: null,
  };
  assert.equal(
    await oauth.validateOAuthState(
      issued.state,
      pending,
      facts().authenticatedUserId,
      2_000,
    ),
    true,
  );
  assert.equal(
    await oauth.validateOAuthState(
      issued.state,
      { ...pending, consumedAt: new Date().toISOString() },
      facts().authenticatedUserId,
      2_000,
    ),
    false,
  );
  assert.equal(
    await oauth.validateOAuthState(
      issued.state,
      pending,
      "99999999-9999-4999-8999-999999999999",
      2_000,
    ),
    false,
  );
  assert.equal(
    await oauth.validateOAuthState(
      issued.state,
      pending,
      facts().authenticatedUserId,
      700_000,
    ),
    false,
  );
});

test("OAuth start authorizes first connection before any calendar binding exists", async () => {
  const { oauth } = await loadModules();
  const proFacts = facts("pro");
  let stored = null;
  let createdAuthorizationUrl = null;
  const handler = oauth.createOAuthStartHandler("pro", {
    redirectUri: PRO_CALLBACK_REDIRECT,
    resolveServerContext: async () => ({
      authenticatedUserId: proFacts.authenticatedUserId,
      currentCaseId: proFacts.currentCaseId,
      membership: proFacts.membership,
    }),
    sealSecret: async (value) => `sealed:${value.length}`,
    storePendingOAuth: async (pending) => {
      stored = pending;
    },
    oauth: {
      createAuthorizationUrl: (material) => {
        createdAuthorizationUrl = material;
        return `https://accounts.google.com/o/oauth2/v2/auth?state=${material.state}`;
      },
    },
  });

  const response = await handler(
    new Request("https://laibe.test/start", {
      method: "POST",
    }),
  );
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.state, "OAUTH_REDIRECT_REQUIRED");
  assert.match(body.authorizationUrl, /^https:\/\/accounts\.google\.com\//u);
  assert.equal(stored.authenticatedUserId, proFacts.authenticatedUserId);
  assert.equal(stored.currentCaseId, proFacts.currentCaseId);
  assert.equal(stored.accountRole, "pro");
  assert.equal(Object.hasOwn(stored, "calendarBinding"), false);
  assert.equal(typeof createdAuthorizationUrl.codeChallenge, "string");
});

test("OAuth start rejects cross-site or wrong content type requests before issuing state", async () => {
  const { oauth } = await loadModules();
  let contextCalls = 0;
  const handler = oauth.createOAuthStartHandler("pro", {
    redirectUri: PRO_CALLBACK_REDIRECT,
    allowedOrigins: ["https://laibe.test"],
    resolveServerContext: async () => {
      contextCalls += 1;
      return facts("pro");
    },
    sealSecret: async () => "sealed",
    storePendingOAuth: async () => {},
    oauth: { createAuthorizationUrl: () => "https://accounts.google.com/" },
  });

  const crossSite = await handler(
    new Request("https://laibe.test/start", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: "https://attacker.test",
        "sec-fetch-site": "cross-site",
      },
    }),
  );
  const wrongType = await handler(
    new Request("https://laibe.test/start", {
      method: "POST",
      headers: {
        "content-type": "text/plain",
        origin: "https://laibe.test",
        "sec-fetch-site": "same-origin",
      },
    }),
  );

  assert.equal(crossSite.status, 403);
  assert.deepEqual(await crossSite.json(), { state: "CONTEXT_UNAVAILABLE" });
  assert.equal(wrongType.status, 415);
  assert.deepEqual(await wrongType.json(), { state: "CONTEXT_UNAVAILABLE" });
  assert.equal(contextCalls, 0);
});

test("OAuth adapter keeps client secret and tokens out of public results", async () => {
  const { oauth } = await loadModules();
  const calls = [];
  const adapter = oauth.createGoogleOAuthAdapter({
    clientId: "client-id",
    clientSecret: "server-secret",
    redirectUri: "https://example.test/callback",
    fetch: async (url, init) => {
      calls.push({ url: String(url), body: String(init?.body ?? "") });
      return new Response(
        JSON.stringify({
          access_token: "access-secret",
          refresh_token: "refresh-secret",
          expires_in: 3600,
          scope: "https://www.googleapis.com/auth/calendar.readonly",
          token_type: "Bearer",
          id_token: "identity-token",
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    },
  });
  const result = await adapter.exchangeCode({
    code: "oauth-code",
    codeVerifier: "verifier",
  });
  const authorizationUrl = new URL(adapter.createAuthorizationUrl({
    state: "opaque-state",
    codeChallenge: "pkce-challenge",
  }));
  assert.equal(result.ok, true);
  assert.equal(JSON.stringify(result.publicResult).includes("secret"), false);
  assert.equal(calls[0].body.includes("server-secret"), true);
  assert.equal(Object.hasOwn(result.publicResult, "access_token"), false);
  assert.equal(
    authorizationUrl.searchParams.get("scope").includes("openid"),
    true,
  );
  assert.equal(
    authorizationUrl.searchParams.get("scope").includes(
      "https://www.googleapis.com/auth/calendar.readonly",
    ),
    true,
  );
});

test("credential envelope is AES-GCM sealed and only server-side code can recover it", async () => {
  const { oauth } = await loadModules();
  const key = Buffer.alloc(32, 7).toString("base64url");
  const credential = {
    accessToken: "access-secret",
    refreshToken: "refresh-secret",
    expiresIn: 3600,
    idToken: "identity-secret",
  };
  const sealed = await oauth.encryptCredentialEnvelope(credential, key);
  assert.equal(sealed.includes("access-secret"), false);
  assert.equal(sealed.includes("refresh-secret"), false);
  assert.deepEqual(
    await oauth.decryptCredentialEnvelope(sealed, key),
    credential,
  );
  await assert.rejects(
    oauth.decryptCredentialEnvelope(
      sealed,
      Buffer.alloc(32, 8).toString("base64url"),
    ),
  );
});

test("callback resolves pending state by digest, binds once, and never returns credentials", async () => {
  const { oauth } = await loadModules();
  const issued = await oauth.issueOAuthMaterial({
    nowMs: Date.now(),
    ttlMs: 600_000,
  });
  const stored = {
    stateDigest: issued.stateDigest,
    authenticatedUserId: facts().authenticatedUserId,
    currentCaseId: facts().currentCaseId,
    accountRole: "owner",
    authorizationSubject:
      `case-member:owner:${facts().authenticatedUserId}:${facts().currentCaseId}`,
    redirectUri: OWNER_CALLBACK_REDIRECT,
    sealedVerifier: "sealed-verifier",
    expiresAt: issued.expiresAt,
    consumedAt: null,
  };
  const observations = { lookup: null, commits: 0, sealed: null };
  const handler = oauth.createOAuthCallbackHandler("owner", {
    redirectUri: OWNER_CALLBACK_REDIRECT,
    resolveAuthenticatedIdentity: async () => ({
      userId: facts().authenticatedUserId,
    }),
    loadPendingOAuth: async (lookup) => {
      observations.lookup = lookup;
      return stored;
    },
    reauthorizePendingContext: async () => facts("owner"),
    unsealSecret: async () => issued.codeVerifier,
    oauth: {
      exchangeCode: async () => ({
        ok: true,
        publicResult: { state: "CONNECTED_PENDING_BINDING" },
        credentialEnvelope: {
          accessToken: "access-secret",
          refreshToken: "refresh-secret",
          expiresIn: 3600,
          idToken: "identity-secret",
        },
      }),
      resolveGoogleAccountAndCalendar: async () => ({
        googleSubject: "google-subject",
        calendarId: "owner-calendar@example.test",
      }),
    },
    sealCredential: async (credential) => {
      observations.sealed = credential;
      return "sealed-credential";
    },
    commitBinding: async () => {
      observations.commits += 1;
      return { ok: true, state: "CONNECTED" };
    },
  });
  const response = await handler(
    new Request(
      `https://example.test/callback?code=oauth-code&state=${issued.state}`,
    ),
  );
  const body = await response.json();
  assert.equal(response.status, 200);
  assert.deepEqual(body, { state: "CONNECTED" });
  assert.equal(observations.lookup, issued.stateDigest);
  assert.equal(observations.commits, 1);
  assert.equal(observations.sealed.accessToken, "access-secret");
  assert.equal(JSON.stringify(body).includes("secret"), false);
});

test("callback rejects wrong digest, expired, consumed, and wrong-role state before token exchange", async () => {
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
    { accountRole: "pro" },
  ];
  for (const variant of variants) {
    const handler = oauth.createOAuthCallbackHandler("owner", {
      redirectUri: OWNER_CALLBACK_REDIRECT,
      resolveAuthenticatedIdentity: async () => ({
        userId: facts().authenticatedUserId,
      }),
      loadPendingOAuth: async () => ({
        stateDigest: issued.stateDigest,
        authenticatedUserId: facts().authenticatedUserId,
        currentCaseId: facts().currentCaseId,
        accountRole: "owner",
        sealedVerifier: "sealed-verifier",
        expiresAt: issued.expiresAt,
        authorizationSubject:
          `case-member:owner:${facts().authenticatedUserId}:${facts().currentCaseId}`,
        redirectUri: OWNER_CALLBACK_REDIRECT,
        consumedAt: null,
        ...variant,
      }),
      reauthorizePendingContext: async () => facts("owner"),
      unsealSecret: async () => issued.codeVerifier,
      oauth: {
        exchangeCode: async () => {
          exchangeCalls += 1;
          throw new Error("must not run");
        },
      },
    });
    const response = await handler(
      new Request(
        `https://example.test/callback?code=oauth-code&state=${issued.state}`,
      ),
    );
    assert.notEqual(response.status, 200);
  }
  assert.equal(exchangeCalls, 0);
});

test("callback does not report CONNECTED when transactional binding commit rejects", async () => {
  const { oauth } = await loadModules();
  const issued = await oauth.issueOAuthMaterial({
    nowMs: Date.now(),
    ttlMs: 600_000,
  });
  const handler = oauth.createOAuthCallbackHandler("owner", {
    resolveAuthenticatedIdentity: async () => ({
      userId: facts().authenticatedUserId,
    }),
    redirectUri: OWNER_CALLBACK_REDIRECT,
    loadPendingOAuth: async () => ({
      stateDigest: issued.stateDigest,
      authenticatedUserId: facts().authenticatedUserId,
      currentCaseId: facts().currentCaseId,
      accountRole: "owner",
      sealedVerifier: "sealed-verifier",
      expiresAt: issued.expiresAt,
      consumedAt: null,
      authorizationSubject:
        `case-member:owner:${facts().authenticatedUserId}:${facts().currentCaseId}`,
      redirectUri: OWNER_CALLBACK_REDIRECT,
    }),
    reauthorizePendingContext: async () => facts("owner"),
    unsealSecret: async () => issued.codeVerifier,
    oauth: {
      exchangeCode: async () => ({
        ok: true,
        credentialEnvelope: {
          accessToken: "access-secret",
          refreshToken: "refresh-secret",
          expiresIn: 3600,
          idToken: null,
        },
      }),
      resolveGoogleAccountAndCalendar: async () => ({
        googleSubject: "google-subject",
        calendarId: "owner-calendar@example.test",
      }),
    },
    sealCredential: async () => "sealed-credential",
    commitBinding: async () => ({ ok: false, state: "IDENTITY_MISMATCH" }),
  });
  const response = await handler(
    new Request(
      `https://example.test/callback?code=oauth-code&state=${issued.state}`,
    ),
  );
  assert.equal(response.status, 409);
  assert.deepEqual(await response.json(), { state: "IDENTITY_MISMATCH" });
});

test("post-load collection and regexp prototype pollution cannot create authority", async () => {
  const { contracts, authorization, oauth } = await loadModules();
  const originals = {
    setHas: Set.prototype.has,
    arrayIncludes: Array.prototype.includes,
    arrayFind: Array.prototype.find,
    regexpTest: RegExp.prototype.test,
  };
  let roleResult;
  let closed;
  let calendarIdAccepted;
  let google;
  const replies = [
    new Response(JSON.stringify({ sub: "google-subject" }), { status: 200 }),
    new Response(JSON.stringify({ items: [] }), { status: 200 }),
  ];
  try {
    Set.prototype.has = () => true;
    Array.prototype.includes = () => true;
    Array.prototype.find = () => ({ primary: true, id: "attacker-calendar" });
    RegExp.prototype.test = () => false;
    const hostileRole = facts("owner");
    hostileRole.membership.role = "pcm";
    roleResult = authorization.authorizeCaseMemberContext("pcm", hostileRole);
    closed = contracts.closedResult("NOT_A_STATE");
    calendarIdAccepted = contracts.isOwnNonEmptyString({
      calendarId: "bad\u0000id",
    }, "calendarId");
    const adapter = oauth.createGoogleOAuthAdapter({
      clientId: "client-id",
      clientSecret: "server-secret",
      redirectUri: "https://example.test/callback",
      fetch: async () => replies.shift(),
    });
    google = await adapter.resolveGoogleAccountAndCalendar("access-secret");
  } finally {
    Set.prototype.has = originals.setHas;
    Array.prototype.includes = originals.arrayIncludes;
    Array.prototype.find = originals.arrayFind;
    RegExp.prototype.test = originals.regexpTest;
  }
  assert.equal(roleResult.ok, false);
  assert.equal(closed.state, "CONTEXT_UNAVAILABLE");
  assert.equal(calendarIdAccepted, false);
  assert.equal(google, null);
});

test("migration creates private state, credential and binding tables with server-only RPC grants", async () => {
  const sql = await readFile(paths.migration, "utf8");
  assert.match(sql, /^begin;/i);
  assert.match(sql, /commit;\s*$/i);
  assert.match(sql, /create schema if not exists extensions;/i);
  assert.doesNotMatch(sql, /\b(?:drop|truncate)\b/i);
  for (
    const table of [
      "google_calendar_oauth_states",
      "google_calendar_credentials",
      "case_member_google_calendar_bindings",
    ]
  ) {
    assert.match(sql, new RegExp(`create table integration\\.${table}`, "i"));
    assert.match(
      sql,
      new RegExp(
        `alter table integration\\.${table} force row level security`,
        "i",
      ),
    );
  }
  assert.match(
    sql,
    /revoke all on table integration\.google_calendar_oauth_states from public, anon, authenticated/i,
  );
  assert.match(
    sql,
    /revoke all on table integration\.google_calendar_credentials from public, anon, authenticated/i,
  );
  assert.match(
    sql,
    /revoke all on table integration\.case_member_google_calendar_bindings from public, anon, authenticated/i,
  );
  assert.match(
    sql,
    /grant execute on function public\.case_member_google_calendar_/i,
  );
  assert.match(
    sql,
    /casework\.case_members[\s\S]{0,360}m\.membership_status::text\s*=\s*'active'/i,
  );
  assert.match(
    sql,
    /'membership_status',\s*v_membership_status/i,
  );
  assert.doesNotMatch(sql, /'membership_status',\s*'active'/i);
  assert.doesNotMatch(sql, /grant execute[\s\S]*to authenticated/i);
  assert.match(sql, /where state_digest = p_state_digest\s+for update;/i);
  assert.match(sql, /set consumed_at = v_now\s+where id = v_state\.id;/i);
  assert.doesNotMatch(sql, /@[A-Za-z0-9.-]+\.(?:com|tw)/i);
});

test("all endpoint sources expose role-scoped factories and reject caller authority fields", async () => {
  const endpointPaths = [
    paths.ownerStart,
    paths.ownerCallback,
    paths.ownerGrant,
    paths.vendorStart,
    paths.vendorCallback,
    paths.vendorGrant,
  ];
  for (const path of endpointPaths) {
    const source = await readFile(path, "utf8");
    assert.match(source, /create[A-Za-z]+Handler/);
    assert.match(source, /AUTH_REQUIRED|CONTEXT_UNAVAILABLE/);
    assert.match(source, /Deno\.serve/);
    assert.match(source, /import\.meta\.main/);
    assert.doesNotMatch(
      source,
      /(?:body|searchParams)\.(?:userId|caseId|calendarId|role)/,
    );
    assert.doesNotMatch(source, /@[A-Za-z0-9.-]+\.(?:com|tw)/i);
  }
});

test("source tree contains no fixed Gmail, calendar ID, token, escrow or investment wording", async () => {
  const sources = await Promise.all(
    Object.values(paths).map((path) => readFile(path, "utf8")),
  );
  const joined = sources.join("\n");
  assert.doesNotMatch(joined, /[A-Za-z0-9._%+-]+@gmail\.com/i);
  assert.doesNotMatch(
    joined,
    /(?:access|refresh)[_-]?token\s*[:=]\s*["'][A-Za-z0-9_-]{12,}/i,
  );
  assert.doesNotMatch(joined, /金流託管|代收代付|老屋投資|翻修獲利/);
  assert.equal(createHash("sha256").update(joined).digest("hex").length, 64);
});
