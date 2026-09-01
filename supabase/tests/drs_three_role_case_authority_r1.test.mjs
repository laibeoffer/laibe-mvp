import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import { readdirSync, readFileSync } from "node:fs";
import test from "node:test";

import {
  DrsIdentityError,
  sha256Digest,
} from "../functions/_shared/drs-auth/contracts.ts";
import {
  createDrsThreeRoleSessionBootstrapHandler,
} from "../functions/_shared/drs-auth/drs-session-bootstrap-bff.ts";
import {
  createDrsThreeRoleGoogleAuthAdapter,
} from "../functions/_shared/drs-auth/drs-three-role-auth-runtime.ts";
import {
  createDrsThreeRoleSecureSessionRuntime,
} from "../functions/_shared/drs-auth/drs-secure-session-runtime.ts";

const ORIGIN = "https://app.example.com";
const BOOTSTRAP_URL = `${ORIGIN}/functions/v1/drs-session-bootstrap`;
const START_URL = `${ORIGIN}/functions/v1/drs-google-auth-start`;
const CALLBACK_URL =
  "https://project.example.com/functions/v1/drs-google-auth-callback";
const SUCCESS_URL = `${ORIGIN}/cases`;
const SUPABASE_URL = "https://project.example.com";
const COOKIE_NAME = "__Host-laibe-drs-session";
const NOW = new Date("2026-09-02T06:00:00.000Z");
const NOW_SECONDS = Math.floor(NOW.getTime() / 1000);

const CASE_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const CASE_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const USERS = Object.freeze({
  owner: "11111111-1111-4111-8111-111111111111",
  vendor: "22222222-2222-4222-8222-222222222222",
  drs: "33333333-3333-4333-8333-333333333333",
});
const SESSIONS = Object.freeze({
  owner: "44444444-4444-4444-8444-444444444444",
  vendor: "55555555-5555-4555-8555-555555555555",
  drs: "66666666-6666-4666-8666-666666666666",
});
const MEMBERSHIPS = Object.freeze({
  owner: "77777777-7777-4777-8777-777777777777",
  vendor: "88888888-8888-4888-8888-888888888888",
  drs: "99999999-9999-4999-8999-999999999999",
});
const SESSION_CONTEXT_KEYS = Object.freeze([
  "userId",
  "sessionId",
  "caseId",
  "membershipId",
  "role",
  "authorityVersion",
  "nextActor",
]);

function contextFor(role, overrides = {}) {
  return {
    userId: USERS[role],
    sessionId: SESSIONS[role],
    caseId: CASE_A,
    membershipId: MEMBERSHIPS[role],
    role,
    authorityVersion: 4,
    nextActor: role === "owner"
      ? "vendor"
      : role === "vendor"
      ? "drs"
      : "owner",
    ...overrides,
  };
}

function envelopeFor(role, overrides = {}) {
  return {
    schemaVersion: "drs-three-role-technical-session-v1",
    userId: USERS[role],
    authSessionId: SESSIONS[role],
    serverSessionId: `server_${role}_opaque`,
    accessToken: `access_${role}_opaque`,
    expiresAtEpochSeconds: NOW_SECONDS + 600,
    ...overrides,
  };
}

function bootstrapRequest(cookieValue = "sealed_owner", overrides = {}) {
  const headers = new Headers({
    origin: ORIGIN,
    "sec-fetch-site": "same-origin",
    "content-type": "application/json",
    cookie: `${COOKIE_NAME}=${cookieValue}`,
    ...(overrides.headers ?? {}),
  });
  return new Request(overrides.url ?? BOOTSTRAP_URL, {
    method: overrides.method ?? "POST",
    headers,
    body: overrides.body ?? "{}",
  });
}

function createBootstrapFixture() {
  const envelopes = new Map([
    ["sealed_owner", envelopeFor("owner")],
    ["sealed_vendor", envelopeFor("vendor")],
    ["sealed_drs", envelopeFor("drs")],
  ]);
  const contexts = new Map([
    [SESSIONS.owner, contextFor("owner")],
    [SESSIONS.vendor, contextFor("vendor")],
    [SESSIONS.drs, contextFor("drs")],
  ]);
  const state = {
    openCalls: 0,
    verifyCalls: 0,
    effects: 0,
    verificationError: null,
    transform: null,
  };
  const technicalCookieCodec = {
    openTechnicalSessionCookie(value) {
      state.openCalls += 1;
      const envelope = envelopes.get(value);
      if (!envelope) throw new Error("invalid cookie");
      return structuredClone(envelope);
    },
  };
  const sessionVerifier = {
    verifyThreeRoleSession(input) {
      state.verifyCalls += 1;
      if (state.verificationError) throw state.verificationError;
      const context = contexts.get(input.expectedAuthSessionId);
      if (!context) throw new DrsIdentityError("AUTH_REQUIRED", 401);
      assert.deepEqual(input, {
        serverSessionId: `server_${context.role}_opaque`,
        accessToken: `access_${context.role}_opaque`,
        expectedUserId: context.userId,
        expectedAuthSessionId: context.sessionId,
      });
      const result = state.transform
        ? state.transform(structuredClone(context))
        : structuredClone(context);
      if (
        SESSION_CONTEXT_KEYS.every((key) => Object.hasOwn(result, key)) &&
        ["owner", "vendor", "drs"].includes(result.role)
      ) {
        state.effects += 1;
      }
      return result;
    },
  };
  const handler = createDrsThreeRoleSessionBootstrapHandler({
    allowedOrigin: ORIGIN,
    sessionCookieName: COOKIE_NAME,
    now: () => new Date(NOW),
    technicalCookieCodec,
    sessionVerifier,
  });
  return { handler, envelopes, contexts, state };
}

test("owner, vendor and DRS receive separate exact-seven server-derived sessions", async () => {
  const fixture = createBootstrapFixture();
  for (const role of ["owner", "vendor", "drs"]) {
    const response = await fixture.handler(bootstrapRequest(`sealed_${role}`));
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("cache-control"), "no-store");
    const payload = await response.json();
    assert.deepEqual(Object.keys(payload), SESSION_CONTEXT_KEYS);
    assert.deepEqual(payload, contextFor(role));
  }
  assert.equal(fixture.state.effects, 3);
});

test("a second case remains isolated and cannot be selected by caller input", async () => {
  const fixture = createBootstrapFixture();
  const secondMembership = "abababab-abab-4bab-8bab-abababababab";
  fixture.contexts.set(
    SESSIONS.owner,
    contextFor("owner", { caseId: CASE_B, membershipId: secondMembership }),
  );
  const response = await fixture.handler(bootstrapRequest("sealed_owner"));
  assert.equal(response.status, 200);
  assert.deepEqual(
    await response.json(),
    contextFor("owner", {
      caseId: CASE_B,
      membershipId: secondMembership,
    }),
  );

  const hinted = await fixture.handler(bootstrapRequest("sealed_owner", {
    body: JSON.stringify({ caseId: CASE_A, role: "owner" }),
  }));
  assert.equal(hinted.status, 400);
  assert.equal(fixture.state.effects, 1);
});

test("query, body, header, hash and client authority hints are rejected before effects", async (t) => {
  const variants = [
    ["query case", { url: `${BOOTSTRAP_URL}?caseId=${CASE_A}` }],
    ["query role", { url: `${BOOTSTRAP_URL}?role=owner` }],
    ["body case", { body: JSON.stringify({ caseId: CASE_A }) }],
    ["body role", { body: JSON.stringify({ role: "owner" }) }],
    ["authority header", { headers: { "x-laibe-case-id": CASE_A } }],
    ["client role header", { headers: { "x-role": "owner" } }],
    ["authorization header", { headers: { authorization: "Bearer client" } }],
    ["URL hash", { url: `${BOOTSTRAP_URL}#caseId=${CASE_A}` }],
    ["localStorage projection", {
      body: JSON.stringify({ localStorage: { caseId: CASE_A, role: "owner" } }),
    }],
  ];
  for (const [name, overrides] of variants) {
    await t.test(name, async () => {
      const fixture = createBootstrapFixture();
      const response = await fixture.handler(
        bootstrapRequest("sealed_owner", overrides),
      );
      assert.equal(response.status, 400);
      assert.equal(fixture.state.openCalls, 0);
      assert.equal(fixture.state.verifyCalls, 0);
      assert.equal(fixture.state.effects, 0);
    });
  }
});

test("anonymous, expired, replayed, revoked, cross-case and wrong-role sessions deny with effects=0", async (t) => {
  await t.test("anonymous", async () => {
    const fixture = createBootstrapFixture();
    const request = bootstrapRequest("sealed_owner");
    request.headers.delete("cookie");
    const response = await fixture.handler(request);
    assert.equal(response.status, 401);
    assert.equal(fixture.state.effects, 0);
  });

  await t.test("expired technical cookie", async () => {
    const fixture = createBootstrapFixture();
    fixture.envelopes.set(
      "sealed_owner",
      envelopeFor("owner", {
        expiresAtEpochSeconds: NOW_SECONDS,
      }),
    );
    const response = await fixture.handler(bootstrapRequest("sealed_owner"));
    assert.equal(response.status, 401);
    assert.equal(fixture.state.verifyCalls, 0);
    assert.equal(fixture.state.effects, 0);
  });

  for (
    const [name, code, status] of [
      ["replayed", "AUTH_REQUIRED", 401],
      ["revoked membership", "CASE_NOT_AUTHORIZED", 403],
      ["cross-case", "CASE_NOT_AUTHORIZED", 403],
    ]
  ) {
    await t.test(name, async () => {
      const fixture = createBootstrapFixture();
      fixture.state.verificationError = new DrsIdentityError(code, status);
      const response = await fixture.handler(bootstrapRequest("sealed_owner"));
      assert.equal(response.status, status);
      assert.equal(fixture.state.effects, 0);
    });
  }

  await t.test("wrong role", async () => {
    const fixture = createBootstrapFixture();
    fixture.state.transform = (context) => ({ ...context, role: "admin" });
    const response = await fixture.handler(bootstrapRequest("sealed_owner"));
    assert.equal(response.status, 403);
    assert.equal(fixture.state.effects, 0);
  });
});

test("production technical-session ports persist only session facts and resolve case authority at bootstrap", async () => {
  const serviceRoleKey = "service-role-key-fixture-names-only";
  const sessionCookieKey = Buffer.alloc(32, 7).toString("base64url");
  const calls = [];
  const rpcResponse = (payload) => {
    const body = JSON.stringify(payload);
    return new Response(body, {
      status: 200,
      headers: {
        "content-type": "application/json",
        "content-length": String(Buffer.byteLength(body)),
      },
    });
  };
  let issuedSessionId = null;
  let issuedExpiresAt = null;
  const fetch = (input, init) => {
    const url = new URL(String(input));
    const body = JSON.parse(String(init.body));
    calls.push({
      pathname: url.pathname,
      body,
      authorization: init.headers.authorization,
      apikey: init.headers.apikey,
    });
    assert.equal(init.headers.authorization, `Bearer ${serviceRoleKey}`);
    assert.equal(init.headers.apikey, serviceRoleKey);
    if (url.pathname.endsWith("drs_three_role_server_session_issue_v1")) {
      issuedSessionId = body.p_server_session_id;
      issuedExpiresAt = body.p_expires_at;
      return rpcResponse({
        server_session_id: issuedSessionId,
        expires_at: issuedExpiresAt,
      });
    }
    if (url.pathname.endsWith("drs_three_role_server_session_verify_v1")) {
      assert.equal(body.p_server_session_id, issuedSessionId);
      return rpcResponse({
        user_id: USERS.owner,
        session_id: SESSIONS.owner,
        case_id: CASE_A,
        membership_id: MEMBERSHIPS.owner,
        role: "owner",
        authority_version: 4,
        next_actor: "vendor",
        expires_at: issuedExpiresAt,
      });
    }
    throw new Error(`unexpected RPC ${url.pathname}`);
  };
  const values = new Map([
    ["SUPABASE_URL", SUPABASE_URL],
    ["SUPABASE_SERVICE_ROLE_KEY", serviceRoleKey],
    ["LAIBE_DRS_APP_ORIGIN", ORIGIN],
    ["LAIBE_DRS_SESSION_SUCCESS_URL", SUCCESS_URL],
    ["LAIBE_DRS_SESSION_COOKIE_NAME", COOKIE_NAME],
    ["LAIBE_DRS_SESSION_COOKIE_KEY_V1", sessionCookieKey],
  ]);
  const runtime = createDrsThreeRoleSecureSessionRuntime({
    env: { get: (name) => values.get(name) },
    fetch,
    crypto: globalThis.crypto,
    now: () => new Date(NOW),
  });
  assert.equal(runtime.runtimeAvailable, true);
  const jwt = accessToken(USERS.owner, SESSIONS.owner, NOW_SECONDS + 900);
  const continuation = await runtime.technicalSessionProducer
    .createTechnicalSession({
      userId: USERS.owner,
      authSessionId: SESSIONS.owner,
      accessToken: jwt,
      expiresAtEpochSeconds: NOW_SECONDS + 900,
      callbackOrigin: SUPABASE_URL,
      successRedirectUrl: SUCCESS_URL,
      sessionCookieName: COOKIE_NAME,
    });
  assert.equal(continuation.response.status, 303);
  const cookie =
    continuation.response.headers.get("set-cookie").split(";", 1)[0];
  const response = await createDrsThreeRoleSessionBootstrapHandler(
    runtime.bootstrapDependencies,
  )(bootstrapRequest(cookie.slice(COOKIE_NAME.length + 1)));
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), contextFor("owner"));
  assert.equal(calls.length, 2);
  assert.deepEqual(Object.keys(calls[0].body), [
    "p_server_session_id",
    "p_access_token_digest",
    "p_user_id",
    "p_auth_session_id",
    "p_issued_at",
    "p_expires_at",
  ]);
  for (
    const forbidden of [
      "p_case_id",
      "p_membership_id",
      "p_role",
      "p_next_actor",
    ]
  ) {
    assert.equal(Object.hasOwn(calls[0].body, forbidden), false);
  }
});

function base64UrlJson(value) {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

function accessToken(userId, sessionId, expiresAtEpochSeconds) {
  return [
    base64UrlJson({ alg: "RS256", typ: "JWT" }),
    base64UrlJson({
      sub: userId,
      session_id: sessionId,
      exp: expiresAtEpochSeconds,
      app_metadata: { role: "admin", caseId: CASE_B },
    }),
    "signature-verified-by-gotrue-user-endpoint",
  ].join(".");
}

class FakeOAuthStateStore {
  constructor() {
    this.states = new Map();
    this.createCalls = [];
    this.claimCalls = 0;
    this.finalizeCalls = 0;
    this.failCalls = 0;
  }

  createOAuthState(input) {
    this.createCalls.push(structuredClone(input));
    this.states.set(input.stateDigest, {
      ...structuredClone(input),
      claimToken: null,
      consumedAt: null,
      failedAt: null,
    });
  }

  claimOAuthState(input) {
    const state = this.states.get(input.stateDigest);
    if (!state) throw new DrsIdentityError("OAUTH_STATE_INVALID", 403);
    if (state.expiresAt.getTime() <= input.now.getTime()) {
      throw new DrsIdentityError("OAUTH_STATE_EXPIRED", 403);
    }
    if (state.claimToken || state.consumedAt || state.failedAt) {
      throw new DrsIdentityError("OAUTH_STATE_CONSUMED", 403);
    }
    state.claimToken = `claim_token_${++this.claimCalls}_server_only`;
    return {
      claimToken: state.claimToken,
      pkceVerifierCiphertext: state.pkceVerifierCiphertext,
      expiresAt: state.expiresAt,
    };
  }

  finalizeOAuthState(input) {
    const state = [...this.states.values()].find((candidate) =>
      candidate.claimToken === input.claimToken
    );
    if (!state || state.consumedAt || state.failedAt) {
      throw new DrsIdentityError("OAUTH_STATE_CONSUMED", 403);
    }
    state.consumedAt = input.now;
    this.finalizeCalls += 1;
  }

  failOAuthState(input) {
    const state = [...this.states.values()].find((candidate) =>
      candidate.claimToken === input.claimToken
    );
    if (state && !state.consumedAt) state.failedAt = input.now;
    this.failCalls += 1;
  }
}

function createOAuthFixture() {
  const store = new FakeOAuthStateStore();
  const stateEnvelope = {
    encrypt(value) {
      return `encrypted.${Buffer.from(value).toString("base64url")}`;
    },
    decrypt(value) {
      const match = /^encrypted\.([A-Za-z0-9_-]+)$/u.exec(value);
      if (!match) throw new Error("invalid verifier envelope");
      return Buffer.from(match[1], "base64url").toString();
    },
  };
  const stateValue = "oauth_state_server_random_0123456789";
  const pkceVerifier =
    "pkce_verifier_server_random_abcdefghijklmnopqrstuvwxyz_0123456789";
  const randomValues = [stateValue, pkceVerifier];
  const userId = USERS.owner;
  const authSessionId = SESSIONS.owner;
  const authState = {
    jwt: accessToken(userId, authSessionId, NOW_SECONDS + 900),
  };
  const calls = { exchange: 0, user: 0, producer: [], fetch: [] };
  const fetch = (input, init = {}) => {
    const url = new URL(String(input));
    calls.fetch.push({ url: url.href, init: structuredClone(init) });
    if (
      url.pathname === "/auth/v1/token" && url.search === "?grant_type=pkce"
    ) {
      calls.exchange += 1;
      const body = JSON.parse(String(init.body));
      assert.equal(body.auth_code, "authorization_code_once");
      assert.equal(body.code_verifier, pkceVerifier);
      return Response.json({ access_token: authState.jwt, expires_in: 900 });
    }
    if (url.pathname === "/auth/v1/user") {
      calls.user += 1;
      assert.equal(init.headers.authorization, `Bearer ${authState.jwt}`);
      return Response.json({ id: userId });
    }
    throw new Error(`unexpected fetch ${url.href}`);
  };
  const sessionProducer = {
    createTechnicalSession(input) {
      calls.producer.push(structuredClone(input));
      return {
        response: new Response(null, {
          status: 303,
          headers: {
            location: SUCCESS_URL,
            "set-cookie":
              `${COOKIE_NAME}=sealed-technical; Path=/; HttpOnly; Secure; SameSite=Lax`,
            "x-laibe-session-state": "SESSION_ESTABLISHED",
          },
        }),
      };
    },
  };
  const adapter = createDrsThreeRoleGoogleAuthAdapter({
    allowedOrigin: ORIGIN,
    redirectUri: CALLBACK_URL,
    sessionSuccessRedirectUrl: SUCCESS_URL,
    sessionCookieName: COOKIE_NAME,
    supabaseUrl: SUPABASE_URL,
    supabaseAnonKey: "anon-key-name-only-fixture",
    now: () => new Date(NOW),
    stateTtlMs: 5 * 60 * 1000,
    stateEnvelope,
    stateStore: store,
    fetch,
    sessionProducer,
    randomOpaqueValue: () => randomValues.shift(),
  });
  return {
    adapter,
    store,
    calls,
    authState,
    userId,
    authSessionId,
    jwt: authState.jwt,
  };
}

function oauthStartRequest(overrides = {}) {
  return new Request(overrides.url ?? START_URL, {
    method: "POST",
    headers: {
      origin: ORIGIN,
      "sec-fetch-site": "same-origin",
      "content-type": "application/json",
      ...(overrides.headers ?? {}),
    },
    body: overrides.body ?? "{}",
  });
}

test("OAuth start persists one-time state digest and encrypted PKCE verifier without role or case", async () => {
  const fixture = createOAuthFixture();
  const response = await fixture.adapter.start(oauthStartRequest());
  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.deepEqual(Object.keys(payload), ["authorizationUrl"]);
  const authorizationUrl = new URL(payload.authorizationUrl);
  assert.equal(authorizationUrl.origin, SUPABASE_URL);
  assert.equal(authorizationUrl.pathname, "/auth/v1/authorize");
  assert.equal(authorizationUrl.searchParams.get("provider"), "google");
  const callback = new URL(authorizationUrl.searchParams.get("redirect_to"));
  assert.equal(callback.origin + callback.pathname, CALLBACK_URL);
  assert.equal(
    callback.searchParams.get("state"),
    "oauth_state_server_random_0123456789",
  );
  assert.equal(authorizationUrl.searchParams.has("state"), false);
  assert.equal(
    authorizationUrl.searchParams.get("code_challenge_method"),
    "s256",
  );
  assert.ok(authorizationUrl.searchParams.get("code_challenge"));

  assert.equal(fixture.store.createCalls.length, 1);
  const stored = fixture.store.createCalls[0];
  assert.equal(
    stored.stateDigest,
    await sha256Digest("oauth_state_server_random_0123456789"),
  );
  assert.equal(stored.provider, "google");
  assert.equal(stored.redirectUri, CALLBACK_URL);
  assert.match(stored.pkceVerifierCiphertext, /^encrypted\./u);
  assert.equal(
    stored.pkceVerifierCiphertext.includes("pkce_verifier_server_random"),
    false,
    "the stored state must not contain the raw PKCE verifier",
  );
  for (
    const forbidden of [
      "rawState",
      "state",
      "pkceVerifier",
      "userId",
      "caseId",
      "membershipId",
      "role",
      "nextActor",
    ]
  ) assert.equal(Object.hasOwn(stored, forbidden), false);
});

test("OAuth start rejects caller authority hints before state persistence", async () => {
  for (
    const overrides of [
      { url: `${START_URL}?role=owner` },
      { body: JSON.stringify({ caseId: CASE_A }) },
      { headers: { "x-laibe-role": "owner" } },
    ]
  ) {
    const fixture = createOAuthFixture();
    const response = await fixture.adapter.start(oauthStartRequest(overrides));
    assert.equal(response.status, 400);
    assert.equal(fixture.store.createCalls.length, 0);
  }
});

test("OAuth callback uses GoTrue-verified JWT session_id once and never derives case authority", async () => {
  const fixture = createOAuthFixture();
  const started = await fixture.adapter.start(oauthStartRequest());
  const authorizationUrl = new URL((await started.json()).authorizationUrl);
  const state = new URL(
    authorizationUrl.searchParams.get("redirect_to"),
  ).searchParams.get("state");
  assert.ok(state);

  const callback = new Request(
    `${CALLBACK_URL}?code=authorization_code_once&state=${
      encodeURIComponent(state)
    }`,
  );
  const response = await fixture.adapter.callback(callback);
  assert.equal(response.status, 303);
  assert.equal(response.headers.get("location"), SUCCESS_URL);
  assert.equal(fixture.calls.exchange, 1);
  assert.equal(fixture.calls.user, 1);
  assert.equal(fixture.store.finalizeCalls, 1);
  assert.deepEqual(fixture.calls.producer, [{
    userId: fixture.userId,
    authSessionId: fixture.authSessionId,
    accessToken: fixture.jwt,
    expiresAtEpochSeconds: NOW_SECONDS + 900,
    callbackOrigin: new URL(CALLBACK_URL).origin,
    successRedirectUrl: SUCCESS_URL,
    sessionCookieName: COOKIE_NAME,
  }]);
  for (const forbidden of ["caseId", "membershipId", "role", "nextActor"]) {
    assert.equal(Object.hasOwn(fixture.calls.producer[0], forbidden), false);
  }

  const replay = await fixture.adapter.callback(callback);
  assert.equal(replay.status, 403);
  assert.equal(fixture.calls.exchange, 1);
  assert.equal(fixture.calls.user, 1);
  assert.equal(fixture.calls.producer.length, 1);
});

test("expired OAuth state denies before token exchange or technical session effects", async () => {
  const fixture = createOAuthFixture();
  const started = await fixture.adapter.start(oauthStartRequest());
  const authorizationUrl = new URL((await started.json()).authorizationUrl);
  const state = new URL(
    authorizationUrl.searchParams.get("redirect_to"),
  ).searchParams.get("state");
  const stored = fixture.store.states.get(await sha256Digest(state));
  stored.expiresAt = new Date(NOW);
  const response = await fixture.adapter.callback(
    new Request(
      `${CALLBACK_URL}?code=authorization_code_once&state=${
        encodeURIComponent(state)
      }`,
    ),
  );
  assert.equal(response.status, 403);
  assert.equal(fixture.calls.exchange, 0);
  assert.equal(fixture.calls.user, 0);
  assert.equal(fixture.calls.producer.length, 0);
  assert.equal(fixture.store.finalizeCalls, 0);
});

test("OAuth callback rejects malformed or expired server session JWT before technical session effects", async (t) => {
  for (
    const [name, tokenFactory] of [
      [
        "missing session_id",
        () => accessToken(USERS.owner, undefined, NOW_SECONDS + 900),
      ],
      ["expired", () => accessToken(USERS.owner, SESSIONS.owner, NOW_SECONDS)],
      [
        "wrong subject",
        () => accessToken(USERS.vendor, SESSIONS.owner, NOW_SECONDS + 900),
      ],
    ]
  ) {
    await t.test(name, async () => {
      const fixture = createOAuthFixture();
      fixture.authState.jwt = tokenFactory();
      const started = await fixture.adapter.start(oauthStartRequest());
      const authorizationUrl = new URL((await started.json()).authorizationUrl);
      const state = new URL(
        authorizationUrl.searchParams.get("redirect_to"),
      ).searchParams.get("state");
      const callback = new Request(
        `${CALLBACK_URL}?code=authorization_code_once&state=${
          encodeURIComponent(state)
        }`,
      );
      const response = await fixture.adapter.callback(callback);
      assert.equal(response.status, 401);
      assert.equal(fixture.calls.exchange, 1);
      assert.equal(fixture.calls.user, 1);
      assert.equal(fixture.calls.producer.length, 0);
      assert.equal(fixture.store.finalizeCalls, 0);
      assert.equal(fixture.store.failCalls, 1);
    });
  }
});

function task2MigrationSource() {
  const migrationsUrl = new URL("../migrations/", import.meta.url);
  const names = readdirSync(migrationsUrl).filter((name) =>
    /^\d+_drs_three_role_case_authority_r1\.sql$/u.test(name)
  );
  assert.deepEqual(names, [
    "20260901174523_drs_three_role_case_authority_r1.sql",
  ]);
  return readFileSync(new URL(names[0], migrationsUrl), "utf8");
}

test("Task2 migration adds traceable active membership and exact case authority without changing the A5 baseline tables", () => {
  const sql = task2MigrationSource();
  assert.match(sql, /AUTH_R1_A5_BRIDGE_REQUIRED/u);
  assert.match(sql, /AUTH_R1_GOTRUE_SESSION_PREIMAGE_MISMATCH/u);
  assert.match(sql, /AUTH_R1_PARTIAL_FOOTPRINT/u);
  assert.match(
    sql,
    /create table casework\.drs_three_role_memberships[\s\S]*?membership_id uuid primary key[\s\S]*?status text not null[\s\S]*?valid_from timestamptz not null[\s\S]*?revoked_at timestamptz[\s\S]*?invited_by uuid not null[\s\S]*?authority_source text not null[\s\S]*?authority_version bigint not null/iu,
  );
  assert.match(
    sql,
    /create unique index drs_three_role_memberships_one_active_case_user[\s\S]*?where status = 'active' and revoked_at is null/iu,
  );
  assert.match(
    sql,
    /foreign key \(case_id, user_id\)[\s\S]*?references casework\.case_members\(case_id, user_id\)/iu,
  );
  assert.match(
    sql,
    /create table casework\.drs_three_role_case_authority[\s\S]*?authority_version bigint not null[\s\S]*?next_actor text not null/iu,
  );
  assert.match(sql, /AUTH_R1_A5_BRIDGE_PRESERVATION_FAILED/u);
  assert.doesNotMatch(
    sql,
    /alter table casework\.(?:cases|case_members)\s+(?:add|drop|alter|rename)/iu,
  );
});

test("Task2 OAuth state and technical session RPC names and parameters exactly match Phase A", () => {
  const sql = task2MigrationSource();
  for (
    const contract of [
      [
        "drs_three_role_oauth_state_create_v1",
        [
          "p_state_digest text",
          "p_provider text",
          "p_redirect_uri text",
          "p_pkce_verifier_ciphertext text",
          "p_created_at timestamptz",
          "p_expires_at timestamptz",
        ],
      ],
      [
        "drs_three_role_oauth_state_claim_v1",
        [
          "p_state_digest text",
          "p_provider text",
          "p_redirect_uri text",
          "p_now timestamptz",
        ],
      ],
      [
        "drs_three_role_auth_session_bind_v1",
        [
          "p_user_id uuid",
          "p_auth_session_id uuid",
          "p_membership_id uuid",
          "p_bound_at timestamptz",
        ],
      ],
      [
        "drs_three_role_server_session_issue_v1",
        [
          "p_server_session_id uuid",
          "p_access_token_digest text",
          "p_user_id uuid",
          "p_auth_session_id uuid",
          "p_issued_at timestamptz",
          "p_expires_at timestamptz",
        ],
      ],
      [
        "drs_three_role_server_session_verify_v1",
        [
          "p_server_session_id uuid",
          "p_access_token_digest text",
          "p_expected_user_id uuid",
          "p_expected_auth_session_id uuid",
        ],
      ],
    ]
  ) {
    const [name, parameters] = contract;
    const escaped = parameters.map((parameter) =>
      parameter.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&")
    );
    assert.match(
      sql,
      new RegExp(
        `create function public\\.${name}\\s*\\(\\s*${
          escaped.join(
            "\\s*,\\s*",
          )
        }\\s*\\)`,
        "iu",
      ),
    );
  }
  assert.match(sql, /'created', true/iu);
  assert.match(
    sql,
    /'claim_token'[\s\S]*?'pkce_verifier_ciphertext'[\s\S]*?'expires_at'/iu,
  );
  assert.match(sql, /'consumed', true/iu);
  assert.match(sql, /'failed', true/iu);
  assert.match(sql, /'server_session_id'[\s\S]*?'expires_at'/iu);
  assert.match(
    sql,
    /'user_id'[\s\S]*?'session_id'[\s\S]*?'case_id'[\s\S]*?'membership_id'[\s\S]*?'role'[\s\S]*?'authority_version'[\s\S]*?'next_actor'[\s\S]*?'expires_at'/iu,
  );
  assert.doesNotMatch(
    sql.match(
      /create function public\.drs_three_role_server_session_issue_v1[\s\S]*?\)\nreturns jsonb/iu,
    )?.[0] ?? "",
    /p_case_id|p_membership_id|p_role|p_next_actor/iu,
  );
});

test("Task2 migration grants only service RPC execution and uses explicit CRUD RLS", () => {
  const sql = task2MigrationSource();
  for (
    const table of [
      "drs_three_role_memberships",
      "drs_three_role_case_authority",
      "drs_three_role_oauth_states",
      "drs_three_role_auth_session_bindings",
      "drs_three_role_server_sessions",
    ]
  ) {
    for (const command of ["select", "insert", "update", "delete"]) {
      assert.match(
        sql,
        new RegExp(
          `create policy ${table}_${command}_[a-z_]+[\\s\\S]*?for ${command}`,
          "iu",
        ),
      );
    }
  }
  assert.match(
    sql,
    /create function drs_auth_private\.drs_three_role_has_active_case_membership_v1[\s\S]*?auth\.uid\(\)[\s\S]*?auth\.jwt\(\)->>'session_id'[\s\S]*?auth\.sessions[\s\S]*?drs_three_role_server_sessions[\s\S]*?authority_record\.authority_version = membership_record\.authority_version[\s\S]*?status = 'active'[\s\S]*?revoked_at is null/iu,
  );
  assert.doesNotMatch(
    sql,
    /create function public\.drs_three_role_has_active_case_membership_v1/iu,
  );
  assert.match(
    sql,
    /alter table integration\.drs_three_role_oauth_states force row level security/iu,
  );
  assert.match(
    sql,
    /alter table integration\.drs_three_role_auth_session_bindings force row level security/iu,
  );
  assert.match(
    sql,
    /alter table integration\.drs_three_role_server_sessions force row level security/iu,
  );
  for (
    const rpc of [
      "drs_three_role_oauth_state_create_v1",
      "drs_three_role_oauth_state_claim_v1",
      "drs_three_role_oauth_state_finalize_v1",
      "drs_three_role_oauth_state_fail_v1",
      "drs_three_role_auth_session_bind_v1",
      "drs_three_role_server_session_issue_v1",
      "drs_three_role_server_session_verify_v1",
      "drs_three_role_server_session_revoke_v1",
    ]
  ) {
    assert.match(
      sql,
      new RegExp(
        `revoke all on function public\\.${rpc}[\\s\\S]*?from public, anon, authenticated`,
        "iu",
      ),
    );
    assert.match(
      sql,
      new RegExp(
        `grant execute on function public\\.${rpc}[\\s\\S]*?to service_role`,
        "iu",
      ),
    );
  }
  assert.match(
    sql,
    /access_token_digest text not null unique/iu,
  );
  assert.match(
    sql,
    /create unique index drs_three_role_server_sessions_one_active_binding[\s\S]*?on integration\.drs_three_role_server_sessions\(auth_session_id\)[\s\S]*?where revoked_at is null/iu,
  );
  assert.match(
    sql,
    /create function public\.drs_three_role_auth_session_bind_v1[\s\S]*?from auth\.sessions auth_session[\s\S]*?for update/iu,
  );
  assert.match(
    sql,
    /create function public\.drs_three_role_server_session_issue_v1[\s\S]*?from auth\.sessions auth_session[\s\S]*?for update/iu,
  );
  assert.match(
    sql,
    /create function public\.drs_three_role_server_session_verify_v1[\s\S]*?join integration\.drs_three_role_auth_session_bindings binding_record[\s\S]*?binding_record\.membership_id = session_record\.membership_id[\s\S]*?binding_record\.authority_version = session_record\.authority_version/iu,
  );
  const securityDefiners = sql.match(/security definer/giu) ?? [];
  const emptySearchPaths = sql.match(/set search_path = ''/giu) ?? [];
  assert.equal(emptySearchPaths.length, securityDefiners.length);
  assert.doesNotMatch(sql, /C:\\/u);
  assert.doesNotMatch(sql, /service_role[^\n]*(?:owner|vendor|drs)/iu);
});
