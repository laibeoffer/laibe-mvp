import assert from "node:assert/strict";
import { existsSync, readdirSync } from "node:fs";
import test from "node:test";

import {
  createAesGcmSecretEnvelope,
  DrsIdentityError,
  sha256Digest,
} from "../functions/_shared/drs-auth/contracts.ts";
import { createGoogleIdentityAdapter } from "../functions/_shared/drs-auth/google-identity-adapter.ts";
import { createLineIdentityAdapter } from "../functions/_shared/drs-auth/line-login-adapter.ts";
import { createDrsSpecialistAuthorizationStrategy } from "../functions/_shared/drs-auth/specialist-authorization.ts";
import { createDrsGoogleAuthStartHandler } from "../functions/drs-google-auth-start/index.ts";
import { createDrsGoogleAuthCallbackHandler } from "../functions/drs-google-auth-callback/index.ts";
import { createDrsLineLoginStartHandler } from "../functions/drs-line-login-start/index.ts";
import { createDrsLineLoginCallbackHandler } from "../functions/drs-line-login-callback/index.ts";
import { createDrsSessionGrantHandler } from "../functions/drs-session-grant/index.ts";

const supabaseRoot = new URL("../", import.meta.url);
const repositoryRoot = new URL("../../", import.meta.url);
const ORIGIN = "https://drs.local.example";
const GOOGLE_REDIRECT =
  "https://project.example/functions/v1/drs-google-auth-callback";
const LINE_REDIRECT =
  "https://project.example/functions/v1/drs-line-login-callback";
const SESSION_SUCCESS_REDIRECT = "https://drs.local.example/specialist";
const SESSION_COOKIE_NAME = "sb-drs-auth-token";
const SPECIALIST_A = "11111111-1111-4111-8111-111111111111";
const SPECIALIST_B = "22222222-2222-4222-8222-222222222222";
const AUTH_USER_A = "33333333-3333-4333-8333-333333333333";
const AUTH_USER_B = "44444444-4444-4444-8444-444444444444";
const CASE_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const CASE_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const NOW = new Date("2026-08-24T09:00:00.000Z");

function secureSessionContinuation(overrides = {}) {
  return {
    response: new Response(null, {
      status: overrides.status ?? 303,
      headers: {
        location: overrides.location ?? SESSION_SUCCESS_REDIRECT,
        "set-cookie": overrides.cookie ??
          `${SESSION_COOKIE_NAME}=opaque-mock-session; Path=/; HttpOnly; Secure; SameSite=Lax`,
        "x-laibe-session-state": overrides.state ?? "SESSION_ESTABLISHED",
      },
    }),
  };
}

const requiredProductionArtifacts = [
  new URL("functions/_shared/drs-auth/contracts.ts", supabaseRoot),
  new URL(
    "functions/_shared/drs-auth/google-identity-adapter.ts",
    supabaseRoot,
  ),
  new URL("functions/_shared/drs-auth/line-login-adapter.ts", supabaseRoot),
  new URL(
    "functions/_shared/drs-auth/specialist-authorization.ts",
    supabaseRoot,
  ),
  new URL("functions/drs-google-auth-start/index.ts", supabaseRoot),
  new URL("functions/drs-google-auth-callback/index.ts", supabaseRoot),
  new URL("functions/drs-line-login-start/index.ts", supabaseRoot),
  new URL("functions/drs-line-login-callback/index.ts", supabaseRoot),
  new URL("functions/drs-session-grant/index.ts", supabaseRoot),
  new URL(
    "tests/drs-identity-google-line-source-closure.test.mjs",
    repositoryRoot,
  ),
];

function closed(code, status = 403) {
  return new DrsIdentityError(code, status);
}

class FakeIdentityStore {
  constructor() {
    this.states = new Map();
    this.specialists = new Map([[SPECIALIST_A, "active"], [
      SPECIALIST_B,
      "active",
    ]]);
    this.bindings = { google: new Map(), line: new Map() };
    this.audits = [];
    this.claimCount = 0;
    this.prepareCount = 0;
    this.finalizeCount = 0;
    this.commitCount = 0;
    this.failPrepare = false;
    this.failFinalize = false;
  }
  async createLinkState(input) {
    assert.equal(Object.hasOwn(input, "rawState"), false);
    assert.equal(Object.hasOwn(input, "nonce"), false);
    assert.equal(Object.hasOwn(input, "pkceVerifier"), false);
    this.states.set(input.stateDigest, {
      ...input,
      claimedAt: null,
      claimToken: null,
      consumedAt: null,
      failedAt: null,
    });
  }
  async claimLinkState(input) {
    const state = this.states.get(input.stateDigest);
    if (!state) throw closed("OAUTH_STATE_INVALID");
    if (state.provider !== input.provider) {
      throw closed("OAUTH_PROVIDER_MISMATCH");
    }
    if (state.redirectUri !== input.redirectUri) {
      throw closed("OAUTH_REDIRECT_MISMATCH");
    }
    if (state.expiresAt.getTime() <= input.now.getTime()) {
      throw closed("OAUTH_STATE_EXPIRED");
    }
    if (state.consumedAt || state.claimedAt) {
      throw closed("OAUTH_STATE_CONSUMED");
    }
    state.claimedAt = input.now;
    state.claimToken = crypto.randomUUID();
    this.claimCount += 1;
    return structuredClone(state);
  }
  async failIdentityCallback(input) {
    for (const state of this.states.values()) {
      if (
        state.claimToken === input.claimToken && !state.consumedAt &&
        !state.failedAt
      ) {
        state.failedAt = input.now;
        state.failureState = input.failureState;
        this.audits.push({
          eventType: "identity_callback_failed",
          provider: state.provider,
          specialistId: state.specialistId,
        });
      }
    }
  }
  async prepareIdentityCallback(input) {
    this.prepareCount += 1;
    if (this.failPrepare) throw closed("CONTEXT_UNAVAILABLE", 503);
    return this.#resolveIdentityCallback(input);
  }
  async finalizeIdentityCallback(input) {
    this.finalizeCount += 1;
    if (this.failFinalize) throw closed("CONTEXT_UNAVAILABLE", 503);
    const completion = await this.#resolveIdentityCallback(input);
    assert.equal(
      completion.authenticatedUserId,
      input.expectedAuthenticatedUserId,
    );
    assert.equal(completion.specialistId, input.expectedSpecialistId);
    assert.equal(
      completion.authorizationSubject,
      input.expectedAuthorizationSubject,
    );
    assert.equal(completion.intendedAction, input.expectedIntendedAction);
    const state = [...this.states.values()].find((candidate) =>
      candidate.claimToken === input.claimToken
    );
    const existing = this.bindings[input.provider].get(input.subject);
    if (state.intendedAction === "bind" && !existing) {
      this.bindings[input.provider].set(input.subject, {
        specialistId: completion.specialistId,
        authenticatedUserId: completion.authenticatedUserId,
        authorizationSubject: completion.authorizationSubject,
        subject: input.subject,
        status: "active",
        verifiedEmail: input.verifiedEmail ?? null,
      });
    }
    state.consumedAt = input.now;
    this.commitCount += 1;
    this.audits.push({
      eventType: state.intendedAction === "bind"
        ? "identity_bound"
        : "identity_login",
      provider: input.provider,
      specialistId: completion.specialistId,
      correlationId: input.correlationId,
    });
  }
  async #resolveIdentityCallback(input) {
    const state = [...this.states.values()].find((candidate) =>
      candidate.claimToken === input.claimToken
    );
    if (!state || state.consumedAt || state.failedAt) {
      throw closed("OAUTH_STATE_CONSUMED");
    }
    let authenticatedUserId = state.authenticatedUserId;
    let specialistId = state.specialistId;
    let authorizationSubject = state.authorizationSubject;
    const existing = this.bindings[input.provider].get(input.subject);
    if (state.intendedAction === "login") {
      if (!existing || existing.status !== "active") {
        throw closed(
          input.provider === "google"
            ? "GOOGLE_IDENTITY_NOT_BOUND"
            : "LINE_IDENTITY_NOT_BOUND",
        );
      }
      authenticatedUserId = existing.authenticatedUserId;
      specialistId = existing.specialistId;
      authorizationSubject = existing.authorizationSubject ??
        `drs-specialist:${specialistId}`;
    } else {
      if (!specialistId) throw closed("INVITATION_REQUIRED");
      if (
        existing &&
        (existing.specialistId !== specialistId ||
          existing.authenticatedUserId !== authenticatedUserId)
      ) {
        throw closed("IDENTITY_CONFLICT");
      }
      const activeForSpecialist = [...this.bindings[input.provider].values()]
        .find((binding) =>
          binding.specialistId === specialistId &&
          binding.status === "active" && binding.subject !== input.subject
        );
      if (activeForSpecialist) throw closed("IDENTITY_ALREADY_BOUND");
    }
    if (this.specialists.get(specialistId) !== "active") {
      throw closed("SPECIALIST_INACTIVE");
    }
    return {
      authenticatedUserId,
      specialistId,
      authorizationSubject,
      intendedAction: state.intendedAction,
    };
  }
}

function providerMock(provider, overrides = {}) {
  const calls = { authorize: 0, exchange: 0, verify: 0 };
  let issuedNonce = "";
  const expectedIssuer = provider === "google"
    ? "https://accounts.google.com"
    : "https://access.line.me";
  const expectedAudience = provider === "google"
    ? "google-client-id"
    : "line-channel-id";
  return {
    calls,
    transport: {
      createAuthorizationUrl(input) {
        calls.authorize += 1;
        issuedNonce = input.nonce;
        const url = new URL(`https://${provider}.mock.example/authorize`);
        url.searchParams.set("redirect_uri", input.redirectUri);
        url.searchParams.set("state", input.state);
        url.searchParams.set("nonce", input.nonce);
        url.searchParams.set("code_challenge", input.codeChallenge);
        url.searchParams.set(
          "code_challenge_method",
          input.codeChallengeMethod,
        );
        return url.toString();
      },
      async exchangeCode(input) {
        calls.exchange += 1;
        assert.equal(input.code, "mock-code");
        assert.ok(input.pkceVerifier.length >= 43);
        return { idToken: `${provider}-mock-id-token` };
      },
      async verifyIdToken() {
        calls.verify += 1;
        if (overrides.verifyError) {
          throw new Error("invalid provider signature");
        }
        return {
          subject: overrides.subject ?? `${provider}-subject-a`,
          issuer: overrides.issuer ?? expectedIssuer,
          audience: overrides.audience ?? expectedAudience,
          expiresAtEpochSeconds: overrides.expiresAtEpochSeconds ??
            Math.floor(NOW.getTime() / 1000) + 300,
          nonce: overrides.nonce ?? issuedNonce,
          signatureVerified: overrides.signatureVerified ?? true,
          emailVerified: provider === "google"
            ? (overrides.emailVerified ?? true)
            : undefined,
          verifiedEmail: provider === "google"
            ? (overrides.verifiedEmail ?? "reviewer@example.com")
            : undefined,
          displayName: overrides.displayName,
          webhookUserId: overrides.webhookUserId,
          businessIdEmail: overrides.businessIdEmail,
          botChannelToken: overrides.botChannelToken,
        };
      },
    },
  };
}

async function adapterFixture(provider, options = {}) {
  const store = options.store ?? new FakeIdentityStore();
  const mock = providerMock(provider, options.claims);
  const envelope = await createAesGcmSecretEnvelope(new Uint8Array(32).fill(7));
  const common = {
    allowedOrigin: ORIGIN,
    redirectUri: provider === "google" ? GOOGLE_REDIRECT : LINE_REDIRECT,
    sessionSuccessRedirectUrl: SESSION_SUCCESS_REDIRECT,
    sessionCookieName: SESSION_COOKIE_NAME,
    clientId: provider === "google" ? "google-client-id" : "line-channel-id",
    now: () => new Date(NOW),
    stateTtlMs: options.stateTtlMs,
    envelope,
    store,
    provider: mock.transport,
    resolveStartContext: async () =>
      options.startContext ??
        {
          intendedAction: "bind",
          authenticatedUserId: AUTH_USER_A,
          specialistId: SPECIALIST_A,
          authorizationSubject: `drs-specialist:${SPECIALIST_A}`,
        },
    sessionProducer: options.sessionProducer ?? null,
  };
  return {
    adapter: provider === "google"
      ? createGoogleIdentityAdapter(common)
      : createLineIdentityAdapter(common),
    store,
    calls: mock.calls,
  };
}

async function lineLoginAdapterFixture(sessionProducer) {
  const store = new FakeIdentityStore();
  store.bindings.line.set("line-subject-a", {
    authenticatedUserId: AUTH_USER_A,
    specialistId: SPECIALIST_A,
    authorizationSubject: `drs-specialist:${SPECIALIST_A}`,
    subject: "line-subject-a",
    status: "active",
  });
  return await adapterFixture("line", {
    store,
    startContext: {
      intendedAction: "login",
      authenticatedUserId: null,
      specialistId: null,
      authorizationSubject: null,
    },
    sessionProducer,
  });
}

async function startFlow(adapter, bodyText = "{}") {
  const response = await adapter.start(
    new Request("https://project.example/functions/v1/start", {
      method: "POST",
      headers: { origin: ORIGIN, "content-type": "application/json" },
      body: bodyText,
    }),
  );
  const payload = await response.json();
  return {
    response,
    payload,
    authorization: payload.authorizationUrl
      ? new URL(payload.authorizationUrl)
      : null,
  };
}

async function callbackFlow(
  adapter,
  authorization,
  method = "GET",
  redirectUri,
) {
  const state = authorization.searchParams.get("state");
  const base = redirectUri ??
    (authorization.hostname.startsWith("google")
      ? GOOGLE_REDIRECT
      : LINE_REDIRECT);
  return await adapter.callback(
    new Request(`${base}?code=mock-code&state=${encodeURIComponent(state)}`, {
      method,
    }),
  );
}

async function body(response) {
  return await response.json();
}

test("focused RED: independent DRS identity foundation is absent", () => {
  const missing = requiredProductionArtifacts.filter((url) => !existsSync(url))
    .map((url) => url.pathname);
  const migrations = readdirSync(new URL("migrations/", supabaseRoot))
    .filter((name) => name.endsWith("_drs_identity_foundation.sql"));
  assert.deepEqual(
    missing,
    [],
    `DRS_INDEPENDENT_IDENTITY_FOUNDATION_MISSING: ${missing.join(", ")}`,
  );
  assert.equal(
    migrations.length,
    1,
    "exactly one CLI-generated identity migration is required",
  );
});

test("Google start stores digest-only state, nonce digest, PKCE S256, encrypted verifier and <=15m TTL", async () => {
  const { adapter, store } = await adapterFixture("google");
  const { response, authorization } = await startFlow(adapter);
  assert.equal(response.status, 200);
  assert.equal(authorization.searchParams.get("code_challenge_method"), "S256");
  assert.ok(authorization.searchParams.get("code_challenge"));
  const rawState = authorization.searchParams.get("state");
  const nonce = authorization.searchParams.get("nonce");
  const saved = [...store.states.values()][0];
  assert.equal(saved.stateDigest, await sha256Digest(rawState));
  assert.equal(saved.nonceDigest, await sha256Digest(nonce));
  assert.equal(JSON.stringify(saved).includes(rawState), false);
  assert.equal(JSON.stringify(saved).includes(nonce), false);
  assert.match(saved.pkceVerifierCiphertext, /^v1\./u);
  assert.ok(saved.expiresAt.getTime() - NOW.getTime() <= 15 * 60 * 1000);
});

test("start is same-origin POST exact empty JSON and ignores caller authority fields", async () => {
  const { adapter } = await adapterFixture("google");
  for (
    const request of [
      new Request("https://project.example/functions/v1/start", {
        method: "GET",
      }),
      new Request("https://project.example/functions/v1/start", {
        method: "POST",
        headers: {
          origin: "https://evil.example",
          "content-type": "application/json",
        },
        body: "{}",
      }),
      new Request(
        "https://project.example/functions/v1/start?specialist_id=x",
        {
          method: "POST",
          headers: { origin: ORIGIN, "content-type": "application/json" },
          body: "{}",
        },
      ),
      new Request("https://project.example/functions/v1/start", {
        method: "POST",
        headers: { origin: ORIGIN, "content-type": "application/json" },
        body: JSON.stringify({
          specialist_id: SPECIALIST_B,
          reviewer_level: "highest_reviewer",
          case_id: CASE_B,
        }),
      }),
    ]
  ) assert.notEqual((await adapter.start(request)).status, 200);
});

test("unapproved Google subject and same-email different subject cannot establish a session", async () => {
  const store = new FakeIdentityStore();
  store.bindings.google.set("approved-google-subject", {
    specialistId: SPECIALIST_A,
    subject: "approved-google-subject",
    status: "active",
    verifiedEmail: "same@example.com",
  });
  const { adapter } = await adapterFixture("google", {
    store,
    sessionProducer: {
      async createVerifiedSession() {
        return secureSessionContinuation();
      },
    },
    startContext: {
      intendedAction: "login",
      authenticatedUserId: null,
      specialistId: null,
      authorizationSubject: null,
    },
    claims: {
      subject: "different-google-subject",
      verifiedEmail: "same@example.com",
    },
  });
  const { authorization } = await startFlow(adapter);
  const response = await callbackFlow(adapter, authorization);
  assert.equal(response.status, 403);
  assert.equal((await body(response)).state, "GOOGLE_IDENTITY_NOT_BOUND");
  assert.equal(store.commitCount, 0);
});

test("Google token issuer, audience, signature, expiry, nonce and email verification all fail closed", async () => {
  for (
    const claims of [
      { issuer: "https://evil.example" },
      { audience: "wrong-audience" },
      { signatureVerified: false },
      { verifyError: true },
      { expiresAtEpochSeconds: Math.floor(NOW.getTime() / 1000) },
      { nonce: "wrong-nonce" },
      { emailVerified: false },
    ]
  ) {
    const { adapter, store } = await adapterFixture("google", { claims });
    const { authorization } = await startFlow(adapter);
    const response = await callbackFlow(adapter, authorization);
    assert.equal(response.status, 403, JSON.stringify(claims));
    assert.equal((await body(response)).state, "TOKEN_VERIFICATION_FAILED");
    assert.equal(store.commitCount, 0);
  }
});

test("LINE token issuer, audience, signature, expiry and nonce all fail closed", async () => {
  for (
    const claims of [
      { issuer: "https://evil.example" },
      { audience: "wrong-audience" },
      { signatureVerified: false },
      { verifyError: true },
      { expiresAtEpochSeconds: Math.floor(NOW.getTime() / 1000) },
      { nonce: "wrong-nonce" },
    ]
  ) {
    const { adapter, store } = await adapterFixture("line", { claims });
    const { authorization } = await startFlow(adapter);
    const response = await callbackFlow(adapter, authorization);
    assert.equal(response.status, 403, JSON.stringify(claims));
    assert.equal((await body(response)).state, "TOKEN_VERIFICATION_FAILED");
    assert.equal(store.commitCount, 0);
  }
});

test("callback rejects non-GET and exact redirect mismatch before provider exchange", async () => {
  const { adapter, calls } = await adapterFixture("google");
  const { authorization } = await startFlow(adapter);
  assert.equal(
    (await callbackFlow(adapter, authorization, "POST")).status,
    405,
  );
  const mismatch = await callbackFlow(
    adapter,
    authorization,
    "GET",
    "https://project.example/functions/v1/wrong-callback",
  );
  assert.equal(mismatch.status, 403);
  assert.equal((await body(mismatch)).state, "OAUTH_REDIRECT_MISMATCH");
  assert.equal(calls.exchange, 0);
});

test("Google and LINE subjects bind to one server-selected specialist without profile authority", async () => {
  const store = new FakeIdentityStore();
  const google = await adapterFixture("google", { store });
  const line = await adapterFixture("line", {
    store,
    claims: {
      displayName: "Highest Reviewer",
      webhookUserId: "U-webhook-user",
      businessIdEmail: "business@example.com",
      botChannelToken: "bot-channel-token",
    },
  });
  const googleStart = await startFlow(google.adapter);
  const lineStart = await startFlow(line.adapter);
  assert.equal(
    (await callbackFlow(google.adapter, googleStart.authorization)).status,
    200,
  );
  assert.equal(
    (await callbackFlow(line.adapter, lineStart.authorization)).status,
    200,
  );
  assert.equal(
    store.bindings.google.get("google-subject-a").specialistId,
    SPECIALIST_A,
  );
  assert.equal(
    store.bindings.line.get("line-subject-a").specialistId,
    SPECIALIST_A,
  );
  const lineBytes = JSON.stringify([...store.bindings.line.values()]);
  for (
    const forbidden of [
      "Highest Reviewer",
      "U-webhook-user",
      "bot-channel-token",
    ]
  ) {
    assert.equal(lineBytes.includes(forbidden), false);
  }
  assert.equal(store.audits.length, 2);
});

test("Google or LINE subject cannot bind across specialists", async () => {
  for (const provider of ["google", "line"]) {
    const store = new FakeIdentityStore();
    store.bindings[provider].set(`${provider}-subject-a`, {
      specialistId: SPECIALIST_B,
      subject: `${provider}-subject-a`,
      status: "active",
    });
    const { adapter } = await adapterFixture(provider, { store });
    const { authorization } = await startFlow(adapter);
    const response = await callbackFlow(adapter, authorization);
    assert.equal(response.status, 403);
    assert.equal((await body(response)).state, "IDENTITY_CONFLICT");
    assert.equal(store.commitCount, 0);
  }
});

test("claimed state blocks concurrent replay before provider exchange and commits once", async () => {
  const { adapter, store, calls } = await adapterFixture("google");
  const { authorization } = await startFlow(adapter);
  const [first, second] = await Promise.all([
    callbackFlow(adapter, authorization),
    callbackFlow(adapter, authorization),
  ]);
  assert.deepEqual([first.status, second.status].sort(), [200, 403]);
  assert.equal(calls.exchange, 1);
  assert.equal(store.claimCount, 1);
  assert.equal(store.commitCount, 1);
  assert.equal(store.audits.length, 1);
});

test("A3 correction RED: failed callback claim is terminal before sequential retry exchange", async () => {
  const failed = await adapterFixture("google");
  const started = await startFlow(failed.adapter);
  failed.store.failPrepare = true;
  const first = await callbackFlow(failed.adapter, started.authorization);
  assert.equal(first.status, 503);
  failed.store.failPrepare = false;
  const second = await callbackFlow(failed.adapter, started.authorization);
  assert.equal(second.status, 403);
  assert.equal((await body(second)).state, "OAUTH_STATE_CONSUMED");
  assert.equal(failed.calls.exchange, 1);
  assert.equal(failed.store.commitCount, 0);
});

test("A3 correction RED: LINE login without a verified session producer never reports authentication", async () => {
  const store = new FakeIdentityStore();
  store.bindings.line.set("line-subject-a", {
    authenticatedUserId: AUTH_USER_A,
    specialistId: SPECIALIST_A,
    subject: "line-subject-a",
    status: "active",
  });
  const line = await adapterFixture("line", {
    store,
    startContext: {
      intendedAction: "login",
      authenticatedUserId: null,
      specialistId: null,
      authorizationSubject: null,
    },
    sessionProducer: null,
  });
  const started = await startFlow(line.adapter);
  const response = await callbackFlow(line.adapter, started.authorization);
  assert.equal(response.status, 503);
  assert.deepEqual(await body(response), {
    state: "SESSION_PRODUCER_UNAVAILABLE",
  });
  assert.equal(line.calls.exchange, 0);
  assert.equal(line.store.commitCount, 0);
  assert.ok([...line.store.states.values()][0].failedAt instanceof Date);
});

test("A3 second correction RED: producer throw writes failed audit without false login", async () => {
  let producerCalls = 0;
  const line = await lineLoginAdapterFixture({
    async createVerifiedSession() {
      producerCalls += 1;
      throw new Error("mock session producer failure");
    },
  });
  const started = await startFlow(line.adapter);
  const first = await callbackFlow(line.adapter, started.authorization);
  assert.equal(first.status, 503);
  assert.deepEqual(await body(first), {
    state: "SESSION_PRODUCER_UNAVAILABLE",
  });
  assert.equal(line.store.commitCount, 0);
  assert.equal(
    line.store.audits.filter((event) => event.eventType === "identity_login")
      .length,
    0,
  );
  assert.equal(
    line.store.audits.filter((event) =>
      event.eventType === "identity_callback_failed"
    ).length,
    1,
  );
  const retry = await callbackFlow(line.adapter, started.authorization);
  assert.equal(retry.status, 403);
  assert.equal(line.calls.exchange, 1);
  assert.equal(producerCalls, 1);
});

test("A3 second correction RED: false or invalid producer continuation is terminal", async () => {
  for (
    const continuation of [
      false,
      secureSessionContinuation({
        cookie: `${SESSION_COOKIE_NAME}=unsafe-cookie; Path=/`,
      }),
    ]
  ) {
    let producerCalls = 0;
    const line = await lineLoginAdapterFixture({
      async createVerifiedSession() {
        producerCalls += 1;
        return continuation;
      },
    });
    const started = await startFlow(line.adapter);
    const first = await callbackFlow(line.adapter, started.authorization);
    assert.equal(first.status, 503);
    assert.equal((await body(first)).state, "SESSION_PRODUCER_UNAVAILABLE");
    assert.equal(line.store.commitCount, 0);
    assert.deepEqual(
      line.store.audits.map((event) => event.eventType),
      ["identity_callback_failed"],
    );
    const retry = await callbackFlow(line.adapter, started.authorization);
    assert.equal(retry.status, 403);
    assert.equal(line.calls.exchange, 1);
    assert.equal(producerCalls, 1);
  }
});

test("A3 second correction RED: finalize failure discards prepared browser continuation", async () => {
  let producerCalls = 0;
  const line = await lineLoginAdapterFixture({
    async createVerifiedSession() {
      producerCalls += 1;
      return secureSessionContinuation();
    },
  });
  line.store.failFinalize = true;
  const started = await startFlow(line.adapter);
  const first = await callbackFlow(line.adapter, started.authorization);
  assert.equal(first.status, 503);
  assert.equal((await body(first)).state, "CONTEXT_UNAVAILABLE");
  assert.equal(first.headers.get("set-cookie"), null);
  assert.equal(first.headers.get("x-laibe-session-state"), null);
  assert.equal(line.store.prepareCount, 1);
  assert.equal(line.store.finalizeCount, 1);
  assert.equal(line.store.commitCount, 0);
  assert.deepEqual(
    line.store.audits.map((event) => event.eventType),
    ["identity_callback_failed"],
  );
  const retry = await callbackFlow(line.adapter, started.authorization);
  assert.equal(retry.status, 403);
  assert.equal(line.calls.exchange, 1);
  assert.equal(producerCalls, 1);
});

test("A3 second correction RED: validated secure continuation is returned only after finalize", async () => {
  const producerInputs = [];
  const line = await lineLoginAdapterFixture({
    async createVerifiedSession(input) {
      producerInputs.push(structuredClone(input));
      return secureSessionContinuation();
    },
  });
  const started = await startFlow(line.adapter);
  const response = await callbackFlow(line.adapter, started.authorization);
  assert.equal(response.status, 303);
  assert.equal(response.headers.get("location"), SESSION_SUCCESS_REDIRECT);
  assert.match(response.headers.get("set-cookie") ?? "", /HttpOnly/iu);
  assert.match(response.headers.get("set-cookie") ?? "", /Secure/iu);
  assert.equal(
    response.headers.get("x-laibe-session-state"),
    "SESSION_ESTABLISHED",
  );
  assert.equal(await response.text(), "");
  assert.deepEqual(producerInputs, [{
    authenticatedUserId: AUTH_USER_A,
    specialistId: SPECIALIST_A,
    authorizationSubject: `drs-specialist:${SPECIALIST_A}`,
    callbackOrigin: "https://project.example",
    successRedirectUrl: SESSION_SUCCESS_REDIRECT,
    sessionCookieName: SESSION_COOKIE_NAME,
  }]);
  assert.equal(line.store.prepareCount, 1);
  assert.equal(line.store.finalizeCount, 1);
  assert.equal(line.store.commitCount, 1);
  assert.deepEqual(
    line.store.audits.map((event) => event.eventType),
    ["identity_login"],
  );
});

test("LINE-only login transfers exact accepted authority to the verified session producer", async () => {
  const store = new FakeIdentityStore();
  store.bindings.line.set("line-subject-a", {
    authenticatedUserId: AUTH_USER_A,
    specialistId: SPECIALIST_A,
    authorizationSubject: `drs-specialist:${SPECIALIST_A}`,
    subject: "line-subject-a",
    status: "active",
  });
  assert.equal(store.bindings.google.size, 0);
  const produced = [];
  const line = await adapterFixture("line", {
    store,
    startContext: {
      intendedAction: "login",
      authenticatedUserId: null,
      specialistId: null,
      authorizationSubject: null,
    },
    sessionProducer: {
      async createVerifiedSession(input) {
        produced.push(structuredClone(input));
        return secureSessionContinuation();
      },
    },
  });
  const started = await startFlow(line.adapter);
  const response = await callbackFlow(line.adapter, started.authorization);
  assert.equal(response.status, 303);
  assert.equal(response.headers.get("location"), SESSION_SUCCESS_REDIRECT);
  assert.deepEqual(produced, [{
    authenticatedUserId: AUTH_USER_A,
    specialistId: SPECIALIST_A,
    authorizationSubject: `drs-specialist:${SPECIALIST_A}`,
    callbackOrigin: "https://project.example",
    successRedirectUrl: SESSION_SUCCESS_REDIRECT,
    sessionCookieName: SESSION_COOKIE_NAME,
  }]);
  assert.equal(line.calls.exchange, 1);
  assert.equal(line.store.commitCount, 1);
});

test("expired and wrong-provider states fail before provider exchange", async () => {
  const expired = await adapterFixture("google", { stateTtlMs: -1 });
  const expiredStart = await startFlow(expired.adapter);
  const expiredResponse = await callbackFlow(
    expired.adapter,
    expiredStart.authorization,
  );
  assert.equal((await body(expiredResponse)).state, "OAUTH_STATE_EXPIRED");
  assert.equal(expired.calls.exchange, 0);
  const store = new FakeIdentityStore();
  const google = await adapterFixture("google", { store });
  const line = await adapterFixture("line", { store });
  const googleStart = await startFlow(google.adapter);
  const wrongProvider = await callbackFlow(
    line.adapter,
    googleStart.authorization,
    "GET",
    LINE_REDIRECT,
  );
  assert.equal((await body(wrongProvider)).state, "OAUTH_PROVIDER_MISMATCH");
  assert.equal(line.calls.exchange, 0);
});

test("callback revalidates specialist and binding failure leaves no partial binding or consumption", async () => {
  const suspended = await adapterFixture("line");
  const suspendedStart = await startFlow(suspended.adapter);
  suspended.store.specialists.set(SPECIALIST_A, "suspended");
  const denied = await callbackFlow(
    suspended.adapter,
    suspendedStart.authorization,
  );
  assert.equal((await body(denied)).state, "SPECIALIST_INACTIVE");
  assert.equal(suspended.store.bindings.line.size, 0);
  assert.equal([...suspended.store.states.values()][0].consumedAt, null);
  const failed = await adapterFixture("google");
  const failedStart = await startFlow(failed.adapter);
  failed.store.failPrepare = true;
  const unavailable = await callbackFlow(
    failed.adapter,
    failedStart.authorization,
  );
  assert.equal(unavailable.status, 503);
  assert.equal(failed.store.bindings.google.size, 0);
  assert.equal([...failed.store.states.values()][0].consumedAt, null);
});

class FakeWorkspaceGrantPort {
  constructor(resolver) {
    this.calls = [];
    this.resolver = resolver;
  }
  async resolveWorkspaceGrant(input) {
    this.calls.push(structuredClone(input));
    return await this.resolver(input);
  }
}

function activeWorkspaceGrant(caseId = CASE_A, overrides = {}) {
  return {
    authorized: true,
    state: "AUTHORIZED_DRS_WORKSPACE",
    case_id: caseId,
    case_status: "active",
    access_mode: "read_only",
    ...overrides,
  };
}

function identity() {
  return { authenticatedUserId: AUTH_USER_A };
}

test("session authority ignores provider metadata and returns only accepted selected-case projection", async () => {
  const port = new FakeWorkspaceGrantPort(() => activeWorkspaceGrant());
  const strategy = createDrsSpecialistAuthorizationStrategy(port);
  const grant = await strategy.resolveSession({
    ...identity(),
    provider: "line",
    subject: "caller-controlled-subject",
    userMetadata: { reviewer_level: "highest_reviewer" },
    email: "owner@example.com",
    role: "owner",
  });
  assert.deepEqual(grant, {
    selectedCaseId: CASE_A,
    caseStatus: "active",
    accessMode: "read_only",
  });
  assert.deepEqual(port.calls, [{
    authenticatedUserId: AUTH_USER_A,
    expectedCaseId: null,
    expectedAuthorizationSubject: null,
  }]);
});

test("server-selected case is exact and cross-case output is denied", async () => {
  const port = new FakeWorkspaceGrantPort((input) =>
    input.expectedCaseId === CASE_A
      ? activeWorkspaceGrant(CASE_A)
      : { authorized: false, state: "CASE_NOT_AUTHORIZED" }
  );
  const strategy = createDrsSpecialistAuthorizationStrategy(port);
  assert.equal(
    (await strategy.authorizeServerSelectedCase({
      identity: identity(),
      serverSelectedCaseId: CASE_A,
    })).selectedCaseId,
    CASE_A,
  );
  await assert.rejects(
    strategy.authorizeServerSelectedCase({
      identity: identity(),
      serverSelectedCaseId: CASE_B,
    }),
    (error) => error.code === "CASE_NOT_AUTHORIZED",
  );
});

test("A3 correction RED: LINE-only authority binds exact verified auth user and selected case", async () => {
  const port = new FakeWorkspaceGrantPort((input) =>
    input.authenticatedUserId === AUTH_USER_A
      ? activeWorkspaceGrant()
      : { authorized: false, state: "IDENTITY_MISMATCH" }
  );
  const strategy = createDrsSpecialistAuthorizationStrategy(port);
  const grant = await strategy.resolveSession({
    authenticatedUserId: AUTH_USER_A,
    provider: "line",
    subject: "line-subject-a",
  });
  assert.equal(grant.selectedCaseId, CASE_A);
  await assert.rejects(
    strategy.resolveSession({
      authenticatedUserId: AUTH_USER_B,
      provider: "line",
      subject: "line-subject-a",
    }),
    (error) => error.code === "IDENTITY_MISMATCH",
  );
});

test("revoked, inactive, unassigned and terminated authority states fail closed", async () => {
  for (
    const state of [
      "CASE_NOT_AUTHORIZED",
      "CASE_SELECTION_REQUIRED",
      "IDENTITY_MISMATCH",
    ]
  ) {
    const strategy = createDrsSpecialistAuthorizationStrategy(
      new FakeWorkspaceGrantPort(() => ({ authorized: false, state })),
    );
    await assert.rejects(
      strategy.resolveSession(identity()),
      (error) => error.code === state,
    );
  }
  const strategy = createDrsSpecialistAuthorizationStrategy(
    new FakeWorkspaceGrantPort(() => ({
      authorized: false,
      state: "CONTEXT_UNAVAILABLE",
    })),
  );
  await assert.rejects(
    strategy.resolveSession(identity()),
    (error) => error.code === "CONTEXT_UNAVAILABLE" && error.status === 503,
  );
});

test("highest-reviewer and all-cases hints never create wildcard authority", async () => {
  const port = new FakeWorkspaceGrantPort((input) =>
    input.expectedCaseId === CASE_A
      ? activeWorkspaceGrant()
      : { authorized: false, state: "CASE_NOT_AUTHORIZED" }
  );
  const strategy = createDrsSpecialistAuthorizationStrategy(port);
  await assert.rejects(
    strategy.authorizeServerSelectedCase({
      identity: {
        authenticatedUserId: AUTH_USER_A,
        reviewerLevel: "highest_reviewer",
        allCases: true,
        override: true,
      },
      serverSelectedCaseId: CASE_B,
    }),
    (error) => error.code === "CASE_NOT_AUTHORIZED",
  );
});

test("owner/pro, Business ID, webhook, display name and bot-token inputs cannot resolve DRS authority", async () => {
  const strategy = createDrsSpecialistAuthorizationStrategy(
    new FakeWorkspaceGrantPort(() => activeWorkspaceGrant()),
  );
  for (
    const candidate of [
      { provider: "owner", subject: "owner-user" },
      { provider: "pro", subject: "pro-user" },
      { provider: "business_id", subject: "business@example.com" },
      { provider: "line_webhook", subject: "U-webhook-user" },
      { provider: "line_profile", subject: "Display Name" },
      { provider: "line_bot", subject: "bot-channel-token" },
    ]
  ) {
    await assert.rejects(
      strategy.resolveSession(candidate),
      (error) => error.code === "AUTH_REQUIRED",
    );
  }
});

test("closed adapter responses are sanitized and never expose credentials or foreign identity", async () => {
  const { adapter } = await adapterFixture("google", {
    claims: {
      verifyError: true,
      subject: "other-subject",
      verifiedEmail: "other@example.com",
    },
  });
  const { authorization } = await startFlow(adapter);
  const response = await callbackFlow(adapter, authorization);
  const text = await response.text();
  assert.match(text, /TOKEN_VERIFICATION_FAILED/u);
  for (
    const forbidden of [
      "mock-code",
      authorization.searchParams.get("state"),
      authorization.searchParams.get("nonce"),
      "other-subject",
      "other@example.com",
      "id-token",
      "refresh",
      CASE_B,
    ]
  ) assert.equal(text.includes(forbidden), false, forbidden);
});

test("endpoint factories guard methods and missing runtime dependencies fail closed", async () => {
  for (
    const handler of [
      createDrsGoogleAuthStartHandler(),
      createDrsGoogleAuthCallbackHandler(),
      createDrsLineLoginStartHandler(),
      createDrsLineLoginCallbackHandler(),
      createDrsSessionGrantHandler(),
    ]
  ) {
    const response = await handler(
      new Request("https://project.example/functions/v1/drs", {
        method: "POST",
      }),
    );
    assert.ok([400, 405, 503].includes(response.status));
    assert.ok(
      ["CONTEXT_UNAVAILABLE", "INVALID_REQUEST"].includes(
        (await body(response)).state,
      ),
    );
    assert.equal(response.headers.get("vary"), "Origin");
  }
});

test("session grant POST emits only the accepted minimal read-only workspace projection", async () => {
  const handler = createDrsSessionGrantHandler({
    allowedOrigins: [ORIGIN],
    runtimeAvailable: true,
    resolveAuthenticatedIdentity: async () => identity(),
    authorization: {
      resolveSession: async () => ({
        selectedCaseId: CASE_A,
        caseStatus: "active",
        accessMode: "read_only",
      }),
      authorizeServerSelectedCase: async () => {
        throw new Error("not used");
      },
    },
  });
  const response = await handler(
    new Request("https://project.example/functions/v1/drs-session-grant", {
      method: "POST",
      headers: {
        authorization: "Bearer verified-session",
        "content-type": "application/json",
      },
      body: "{}",
    }),
  );
  assert.equal(response.status, 200);
  assert.deepEqual(await body(response), {
    schemaVersion: "laibe.drs-workspace-auth.v1",
    state: "AUTHORIZED_DRS_WORKSPACE",
    case: { id: CASE_A, status: "active" },
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
  const withRawCase = await handler(
    new Request(
      `https://project.example/functions/v1/drs-session-grant?case_id=${CASE_B}`,
      {
        method: "POST",
        headers: {
          authorization: "Bearer verified-session",
          "content-type": "application/json",
        },
        body: "{}",
      },
    ),
  );
  assert.equal(withRawCase.status, 400);
  const missingJwt = await handler(
    new Request("https://project.example/functions/v1/drs-session-grant", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{}",
    }),
  );
  assert.equal(missingJwt.status, 401);
});
