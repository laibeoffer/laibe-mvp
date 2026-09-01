import assert from "node:assert/strict";
import test from "node:test";

import { DrsIdentityError } from "../functions/_shared/drs-auth/contracts.ts";

const implementationUrl = new URL(
  "../functions/_shared/drs-auth/drs-session-bootstrap-bff.ts",
  import.meta.url,
);
const implementationPromise = import(implementationUrl.href).catch(() => null);

const APP_ORIGIN = "https://app.example.com";
const CALLBACK_ORIGIN = APP_ORIGIN;
const SUCCESS_REDIRECT = `${APP_ORIGIN}/specialist`;
const ENDPOINT = `${APP_ORIGIN}/functions/v1/drs-session-bootstrap`;
const WORKSPACE_ENDPOINT = `${APP_ORIGIN}/functions/v1/drs-workspace`;
const EVENTS_ENDPOINT = `${APP_ORIGIN}/functions/v1/drs-events`;
const COOKIE_NAME = "__Host-laibe-drs-session";
const AUTH_USER_A = "33333333-3333-4333-8333-333333333333";
const AUTH_USER_B = "44444444-4444-4444-8444-444444444444";
const SPECIALIST_A = "11111111-1111-4111-8111-111111111111";
const CASE_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const CASE_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const AUTHORIZATION_SUBJECT = `drs-specialist:${SPECIALIST_A}`;
const NOW = new Date("2026-08-24T09:00:00.000Z");
const RAW_ACCESS_TOKEN = "raw.supabase.session-token";
const RAW_SESSION_ID = "server-session-secret";
const ISO_INSTANT_PATTERN =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/u;

const WORKSPACE_REQUEST_CONTRACT = Object.freeze({
  method: "POST",
  pathname: "/functions/v1/drs-workspace",
  queryFields: Object.freeze([]),
  jsonBodyFields: Object.freeze([]),
});

const EVENTS_REQUEST_CONTRACT = Object.freeze({
  method: "POST",
  pathname: "/functions/v1/drs-events",
  queryFields: Object.freeze([]),
  jsonBodyFields: Object.freeze([
    Object.freeze({
      name: "timeMin",
      scalarType: "string",
      validate: (value) => ISO_INSTANT_PATTERN.test(value),
    }),
    Object.freeze({
      name: "timeMax",
      scalarType: "string",
      validate: (value) => ISO_INSTANT_PATTERN.test(value),
    }),
  ]),
});

async function api() {
  const implementation = await implementationPromise;
  assert.ok(
    implementation,
    "session bootstrap BFF implementation must exist",
  );
  return implementation;
}

class FakeCookieEnvelopeCodec {
  constructor() {
    this.envelopes = new Map();
    this.counter = 0;
  }

  sealCookieEnvelope(payload) {
    const value = `sealed_cookie_${++this.counter}`;
    this.envelopes.set(value, structuredClone(payload));
    return value;
  }

  openCookieEnvelope(value) {
    if (!this.envelopes.has(value)) throw new Error("invalid envelope");
    return structuredClone(this.envelopes.get(value));
  }

  replace(value, transform) {
    this.envelopes.set(
      value,
      transform(structuredClone(this.envelopes.get(value))),
    );
  }
}

class FakeProofCodec {
  constructor() {
    this.proofs = new Map();
    this.counter = 0;
    this.forcedProof = null;
    this.verificationError = false;
    this.verificationTransform = null;
  }

  mintOpaqueProof(claims) {
    const value = this.forcedProof ??
      `opaque_${++this.counter}.bff_proof.signature`;
    this.proofs.set(value, structuredClone(claims));
    return value;
  }

  verifyOpaqueProof(value) {
    if (this.verificationError) throw new Error("proof verification failed");
    if (!this.proofs.has(value)) throw new Error("invalid proof");
    const claims = structuredClone(this.proofs.get(value));
    return this.verificationTransform
      ? this.verificationTransform(claims)
      : claims;
  }

  replace(value, transform) {
    this.proofs.set(value, transform(structuredClone(this.proofs.get(value))));
  }
}

function exactVerifiedIdentity(overrides = {}) {
  return {
    authenticatedUserId: AUTH_USER_A,
    specialistId: SPECIALIST_A,
    authorizationSubject: AUTHORIZATION_SUBJECT,
    expiresAtEpochSeconds: Math.floor(NOW.getTime() / 1000) + 600,
    ...overrides,
  };
}

function createIssuer(overrides = {}) {
  const calls = [];
  return {
    calls,
    issueServerSession(input) {
      calls.push(structuredClone(input));
      return {
        serverSessionId: RAW_SESSION_ID,
        accessToken: RAW_ACCESS_TOKEN,
        expiresAtEpochSeconds: Math.floor(NOW.getTime() / 1000) + 600,
        ...overrides,
      };
    },
  };
}

function createAuthorization() {
  const state = {
    revoked: false,
    selectedCaseId: CASE_A,
    calls: [],
  };
  return {
    state,
    strategy: {
      resolveSession(identity) {
        state.calls.push(structuredClone(identity));
        if (state.revoked) {
          throw new DrsIdentityError("CASE_NOT_AUTHORIZED", 403);
        }
        return {
          selectedCaseId: state.selectedCaseId,
          caseStatus: "active",
          accessMode: "read_only",
        };
      },
      authorizeServerSelectedCase() {
        throw new Error("bootstrap must use resolveSession");
      },
    },
  };
}

async function createFixture(options = {}) {
  const implementation = await api();
  const cookieEnvelope = options.cookieEnvelope ??
    new FakeCookieEnvelopeCodec();
  const proofCodec = options.proofCodec ?? new FakeProofCodec();
  const issuer = options.issuer ?? createIssuer();
  const authorization = options.authorization ?? createAuthorization();
  const verifierState = {
    denied: false,
    identity: exactVerifiedIdentity(),
    calls: [],
  };
  const accessSessionVerifier = options.accessSessionVerifier ?? {
    verifyAccessSession(input) {
      verifierState.calls.push(structuredClone(input));
      assert.deepEqual(input, {
        serverSessionId: RAW_SESSION_ID,
        accessToken: RAW_ACCESS_TOKEN,
      });
      if (verifierState.denied) {
        throw new DrsIdentityError("AUTH_REQUIRED", 401);
      }
      return structuredClone(verifierState.identity);
    },
  };
  const producer = implementation.createServerOwnedVerifiedSessionProducer({
    allowedCallbackOrigin: CALLBACK_ORIGIN,
    successRedirectUrl: SUCCESS_REDIRECT,
    sessionCookieName: COOKIE_NAME,
    sameSite: "Strict",
    now: () => new Date(NOW),
    serverSessionIssuer: issuer,
    cookieEnvelope,
  });
  const continuation = await producer.createVerifiedSession({
    authenticatedUserId: AUTH_USER_A,
    specialistId: SPECIALIST_A,
    authorizationSubject: AUTHORIZATION_SUBJECT,
    callbackOrigin: CALLBACK_ORIGIN,
    successRedirectUrl: SUCCESS_REDIRECT,
    sessionCookieName: COOKIE_NAME,
  });
  const setCookie = continuation.response.headers.get("set-cookie");
  assert.ok(setCookie);
  const cookiePair = setCookie.split(";", 1)[0];
  const cookieValue = cookiePair.slice(COOKIE_NAME.length + 1);
  const dependencies = {
    allowedOrigin: APP_ORIGIN,
    sessionCookieName: COOKIE_NAME,
    proofTtlSeconds: options.proofTtlSeconds ?? 45,
    now: () => new Date(NOW),
    cookieEnvelope,
    proofCodec,
    accessSessionVerifier,
    authorization: authorization.strategy,
  };
  return {
    implementation,
    producer,
    continuation,
    cookieEnvelope,
    proofCodec,
    issuer,
    authorization,
    verifierState,
    dependencies,
    cookiePair,
    cookieValue,
  };
}

class HostOnlyCookieJar {
  constructor() {
    this.cookies = new Map();
  }

  storeFromResponse(responseUrl, setCookie) {
    assert.equal(/(?:^|;)\s*Domain=/iu.test(setCookie), false);
    assert.match(setCookie, /^__Host-[^=]+=[^;]+; Path=\/;/u);
    const cookiePair = setCookie.split(";", 1)[0];
    this.cookies.set(new URL(responseUrl).origin, cookiePair);
  }

  cookieHeader(requestUrl) {
    const url = new URL(requestUrl);
    if (url.protocol !== "https:") return null;
    return this.cookies.get(url.origin) ?? null;
  }
}

function bootstrapRequest(cookiePair, overrides = {}) {
  const headers = new Headers({
    "content-type": "application/json",
    "origin": APP_ORIGIN,
    "sec-fetch-site": "same-origin",
  });
  if (cookiePair !== null) headers.set("cookie", cookiePair);
  for (const [key, value] of Object.entries(overrides.headers ?? {})) {
    if (value === null) headers.delete(key);
    else headers.set(key, value);
  }
  return new Request(overrides.url ?? ENDPOINT, {
    method: overrides.method ?? "POST",
    headers,
    body: (overrides.method ?? "POST") === "GET"
      ? undefined
      : (overrides.body ?? "{}"),
  });
}

function guardedRequest(cookiePair, proof, overrides = {}) {
  return bootstrapRequest(cookiePair, {
    ...overrides,
    url: overrides.url ?? WORKSPACE_ENDPOINT,
    headers: {
      ...(proof === null ? {} : { authorization: `Bearer ${proof}` }),
      ...(overrides.headers ?? {}),
    },
  });
}

async function bootstrapSuccess(fixture) {
  const handler = fixture.implementation.createDrsSessionBootstrapHandler(
    fixture.dependencies,
  );
  const response = await handler(bootstrapRequest(fixture.cookiePair));
  assert.equal(response.status, 204);
  const authorization = response.headers.get("authorization");
  assert.match(
    authorization ?? "",
    /^Bearer [A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/u,
  );
  return { response, proof: authorization.slice("Bearer ".length) };
}

function assertClosedResponse(response, status) {
  assert.equal(response.status, status);
  assert.equal(response.headers.get("authorization"), null);
  assert.equal(response.headers.get("x-laibe-session-expires-at"), null);
}

test("producer issues a server session and returns an exact bodyless secure 303 continuation", async () => {
  const fixture = await createFixture();
  const response = fixture.continuation.response;
  assert.equal(response.status, 303);
  assert.equal(await response.text(), "");
  assert.equal(response.headers.get("location"), SUCCESS_REDIRECT);
  assert.equal(
    response.headers.get("x-laibe-session-state"),
    "SESSION_ESTABLISHED",
  );
  assert.match(
    response.headers.get("set-cookie") ?? "",
    new RegExp(
      `^${COOKIE_NAME}=[A-Za-z0-9._~-]+; Path=/; HttpOnly; Secure; SameSite=Strict$`,
      "u",
    ),
  );
  assert.equal(response.headers.get("set-cookie").includes("Domain="), false);
  assert.deepEqual(fixture.issuer.calls, [{
    authenticatedUserId: AUTH_USER_A,
    specialistId: SPECIALIST_A,
    authorizationSubject: AUTHORIZATION_SUBJECT,
    now: NOW.toISOString(),
  }]);
  const publicBytes = [...response.headers.values()].join("\n");
  assert.equal(publicBytes.includes(RAW_ACCESS_TOKEN), false);
  assert.equal(publicBytes.includes(RAW_SESSION_ID), false);
});

test("producer rejects caller-controlled redirect, cookie, identity, and invalid issued session facts", async () => {
  const fixture = await createFixture();
  const valid = {
    authenticatedUserId: AUTH_USER_A,
    specialistId: SPECIALIST_A,
    authorizationSubject: AUTHORIZATION_SUBJECT,
    callbackOrigin: CALLBACK_ORIGIN,
    successRedirectUrl: SUCCESS_REDIRECT,
    sessionCookieName: COOKIE_NAME,
  };
  for (
    const override of [
      { specialistId: AUTH_USER_B },
      { authorizationSubject: "drs-specialist:forged" },
      { callbackOrigin: "https://evil.example" },
      { successRedirectUrl: `${SUCCESS_REDIRECT}?token=raw` },
      { sessionCookieName: "caller-cookie" },
    ]
  ) {
    await assert.rejects(
      fixture.producer.createVerifiedSession({ ...valid, ...override }),
      (error) => error instanceof DrsIdentityError && error.status === 503,
    );
  }
  const invalidIssuer = createIssuer({
    expiresAtEpochSeconds: Math.floor(NOW.getTime() / 1000),
  });
  const implementation = await api();
  const producer = implementation.createServerOwnedVerifiedSessionProducer({
    allowedCallbackOrigin: CALLBACK_ORIGIN,
    successRedirectUrl: SUCCESS_REDIRECT,
    sessionCookieName: COOKIE_NAME,
    sameSite: "Lax",
    now: () => new Date(NOW),
    serverSessionIssuer: invalidIssuer,
    cookieEnvelope: new FakeCookieEnvelopeCodec(),
  });
  await assert.rejects(
    producer.createVerifiedSession(valid),
    (error) => error instanceof DrsIdentityError && error.status === 503,
  );
});

test("producer rejects configured cross-origin continuation and non-__Host cookie even when caller input matches", async () => {
  const implementation = await api();
  const validFacts = {
    authenticatedUserId: AUTH_USER_A,
    specialistId: SPECIALIST_A,
    authorizationSubject: AUTHORIZATION_SUBJECT,
    callbackOrigin: APP_ORIGIN,
  };
  const configurations = [
    {
      successRedirectUrl: "https://evil.example.com/specialist",
      sessionCookieName: COOKIE_NAME,
    },
    {
      successRedirectUrl: SUCCESS_REDIRECT,
      sessionCookieName: "laibe-drs-session",
    },
  ];
  for (const configuration of configurations) {
    const producer = implementation.createServerOwnedVerifiedSessionProducer({
      allowedCallbackOrigin: APP_ORIGIN,
      ...configuration,
      sameSite: "Strict",
      now: () => new Date(NOW),
      serverSessionIssuer: createIssuer(),
      cookieEnvelope: new FakeCookieEnvelopeCodec(),
    });
    await assert.rejects(
      producer.createVerifiedSession({
        ...validFacts,
        ...configuration,
      }),
      (error) => error instanceof DrsIdentityError && error.status === 503,
    );
  }
});

test("bootstrap rejects a codec result equal to raw access material and guard rejects proof TTL above 60 seconds", async () => {
  const rawProofCodec = new FakeProofCodec();
  rawProofCodec.forcedProof = RAW_ACCESS_TOKEN;
  const raw = await createFixture({ proofCodec: rawProofCodec });
  const rawHandler = raw.implementation.createDrsSessionBootstrapHandler(
    raw.dependencies,
  );
  assertClosedResponse(
    await rawHandler(bootstrapRequest(raw.cookiePair)),
    503,
  );

  const excessive = await createFixture();
  const { proof } = await bootstrapSuccess(excessive);
  excessive.proofCodec.replace(proof, (claims) => ({
    ...claims,
    expiresAtEpochSeconds: claims.issuedAtEpochSeconds + 61,
  }));
  const guard = excessive.implementation.createDrsBffGuard(
    excessive.dependencies,
    WORKSPACE_REQUEST_CONTRACT,
  );
  await assert.rejects(
    guard.authorize(guardedRequest(excessive.cookiePair, proof)),
    (error) => error instanceof DrsIdentityError && error.status === 401,
  );
});

test("bootstrap verifies cookie, access session, and accepted authority before minting a short opaque proof", async () => {
  const fixture = await createFixture();
  const { response, proof } = await bootstrapSuccess(fixture);
  assert.equal(await response.text(), "");
  assert.equal(
    response.headers.get("x-laibe-session-expires-at"),
    "2026-08-24T09:00:45.000Z",
  );
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.equal(response.headers.get("x-content-type-options"), "nosniff");
  assert.match(response.headers.get("vary") ?? "", /Cookie/u);
  assert.match(
    response.headers.get("access-control-expose-headers") ?? "",
    /Authorization/u,
  );
  assert.equal(response.headers.get("content-type"), null);
  assert.equal(response.headers.get("set-cookie"), null);
  assert.deepEqual(fixture.authorization.state.calls, [{
    authenticatedUserId: AUTH_USER_A,
  }]);
  const claims = fixture.proofCodec.proofs.get(proof);
  assert.deepEqual(Object.keys(claims).sort(), [
    "audience",
    "authorizationFactsDigest",
    "cookieDigest",
    "expiresAtEpochSeconds",
    "issuedAtEpochSeconds",
  ]);
  assert.equal(claims.audience, fixture.implementation.BFF_PROOF_AUDIENCE);
  assert.equal(claims.expiresAtEpochSeconds - claims.issuedAtEpochSeconds, 45);
  const publicBytes = [...response.headers.values()].join("\n");
  for (
    const secret of [
      RAW_ACCESS_TOKEN,
      RAW_SESSION_ID,
      AUTH_USER_A,
      SPECIALIST_A,
      AUTHORIZATION_SUBJECT,
      CASE_A,
    ]
  ) assert.equal(publicBytes.includes(secret), false, secret);
});

test("bootstrap immediately self-verifies minted proof and rejects unverifiable or mismatched claims", async () => {
  const codecs = [new FakeProofCodec(), new FakeProofCodec()];
  codecs[0].verificationError = true;
  codecs[1].verificationTransform = (claims) => ({
    ...claims,
    cookieDigest: "A".repeat(43),
  });
  for (const proofCodec of codecs) {
    const fixture = await createFixture({ proofCodec });
    const handler = fixture.implementation.createDrsSessionBootstrapHandler(
      fixture.dependencies,
    );
    assertClosedResponse(
      await handler(bootstrapRequest(fixture.cookiePair)),
      503,
    );
  }
});

test("bootstrap fails closed for malformed requests, cookies, runtime, verifier denial, and revoked authority", async () => {
  const fixture = await createFixture();
  const handler = fixture.implementation.createDrsSessionBootstrapHandler(
    fixture.dependencies,
  );
  const malformed = [
    [bootstrapRequest(null), 401],
    [bootstrapRequest(`${fixture.cookiePair}; ${fixture.cookiePair}`), 401],
    [bootstrapRequest(`${COOKIE_NAME}=quoted%20cookie`), 401],
    [
      bootstrapRequest(fixture.cookiePair, {
        url: `${ENDPOINT}?case_id=${CASE_A}`,
      }),
      400,
    ],
    [bootstrapRequest(fixture.cookiePair, { method: "GET" }), 400],
    [bootstrapRequest(fixture.cookiePair, { body: '{"role":"drs"}' }), 400],
    [
      bootstrapRequest(fixture.cookiePair, {
        headers: { origin: "https://evil.example" },
      }),
      403,
    ],
    [
      bootstrapRequest(fixture.cookiePair, {
        headers: { "sec-fetch-site": "cross-site" },
      }),
      403,
    ],
    [
      bootstrapRequest(fixture.cookiePair, {
        headers: { authorization: "Bearer caller.token.value" },
      }),
      400,
    ],
    [
      bootstrapRequest(fixture.cookiePair, {
        headers: { "x-laibe-case-id": CASE_A },
      }),
      400,
    ],
  ];
  for (const [request, status] of malformed) {
    assertClosedResponse(await handler(request), status);
  }

  const missingRuntime = fixture.implementation
    .createDrsSessionBootstrapHandler();
  assertClosedResponse(
    await missingRuntime(bootstrapRequest(fixture.cookiePair)),
    503,
  );

  fixture.verifierState.denied = true;
  assertClosedResponse(
    await handler(bootstrapRequest(fixture.cookiePair)),
    401,
  );
  fixture.verifierState.denied = false;
  fixture.authorization.state.revoked = true;
  assertClosedResponse(
    await handler(bootstrapRequest(fixture.cookiePair)),
    403,
  );
});

test("bootstrap rejects expired or identity-mismatched sealed envelopes and invalid proof TTL configuration", async () => {
  const fixture = await createFixture();
  const handler = fixture.implementation.createDrsSessionBootstrapHandler(
    fixture.dependencies,
  );
  fixture.cookieEnvelope.replace(fixture.cookieValue, (payload) => ({
    ...payload,
    expiresAtEpochSeconds: Math.floor(NOW.getTime() / 1000),
  }));
  assertClosedResponse(
    await handler(bootstrapRequest(fixture.cookiePair)),
    401,
  );

  const mismatch = await createFixture();
  mismatch.cookieEnvelope.replace(mismatch.cookieValue, (payload) => ({
    ...payload,
    authenticatedUserId: AUTH_USER_B,
  }));
  const mismatchHandler = mismatch.implementation
    .createDrsSessionBootstrapHandler(
      mismatch.dependencies,
    );
  assertClosedResponse(
    await mismatchHandler(bootstrapRequest(mismatch.cookiePair)),
    401,
  );

  const excessive = await createFixture({ proofTtlSeconds: 61 });
  const excessiveHandler = excessive.implementation
    .createDrsSessionBootstrapHandler(
      excessive.dependencies,
    );
  assertClosedResponse(
    await excessiveHandler(bootstrapRequest(excessive.cookiePair)),
    503,
  );
});

test("BFF guard requires the same cookie and proof and re-verifies access plus current authority", async () => {
  const fixture = await createFixture();
  const { proof } = await bootstrapSuccess(fixture);
  fixture.authorization.state.calls.length = 0;
  const guard = fixture.implementation.createDrsBffGuard(
    fixture.dependencies,
    WORKSPACE_REQUEST_CONTRACT,
  );
  const context = await guard.authorize(
    guardedRequest(fixture.cookiePair, proof),
  );
  assert.deepEqual(context, {
    authenticatedUserId: AUTH_USER_A,
    specialistId: SPECIALIST_A,
    authorizationSubject: AUTHORIZATION_SUBJECT,
    selectedCaseId: CASE_A,
    caseStatus: "active",
    accessMode: "read_only",
    proofExpiresAt: "2026-08-24T09:00:45.000Z",
  });
  assert.deepEqual(fixture.authorization.state.calls, [{
    authenticatedUserId: AUTH_USER_A,
  }]);
});

test("same cookie and proof may be reused within TTL only with fresh access and authority verification", async () => {
  const fixture = await createFixture();
  const { proof } = await bootstrapSuccess(fixture);
  fixture.verifierState.calls.length = 0;
  fixture.authorization.state.calls.length = 0;
  const guard = fixture.implementation.createDrsBffGuard(
    fixture.dependencies,
    WORKSPACE_REQUEST_CONTRACT,
  );
  const contexts = [];
  for (let index = 0; index < 2; index += 1) {
    contexts.push(
      await guard.authorize(guardedRequest(fixture.cookiePair, proof)),
    );
  }
  assert.deepEqual(contexts[0], contexts[1]);
  assert.equal(fixture.verifierState.calls.length, 2);
  assert.deepEqual(fixture.authorization.state.calls, [{
    authenticatedUserId: AUTH_USER_A,
  }, {
    authenticatedUserId: AUTH_USER_A,
  }]);
});

test("BFF guard rejects cookie-only, proof-only, cross-cookie, malformed, expired, cross-user, and cross-case authority", async () => {
  const fixture = await createFixture();
  const { proof } = await bootstrapSuccess(fixture);
  const guard = fixture.implementation.createDrsBffGuard(
    fixture.dependencies,
    WORKSPACE_REQUEST_CONTRACT,
  );
  const denied = async (request, status) => {
    await assert.rejects(
      guard.authorize(request),
      (error) => error instanceof DrsIdentityError && error.status === status,
    );
  };
  await denied(guardedRequest(fixture.cookiePair, null), 401);
  await denied(
    guardedRequest(null, proof),
    401,
  );
  await denied(
    guardedRequest(fixture.cookiePair, null, {
      headers: { authorization: "Bearer malformed" },
    }),
    401,
  );

  const other = await createFixture({
    cookieEnvelope: fixture.cookieEnvelope,
    proofCodec: fixture.proofCodec,
  });
  await denied(
    guardedRequest(other.cookiePair, proof),
    401,
  );

  fixture.proofCodec.replace(proof, (claims) => ({
    ...claims,
    expiresAtEpochSeconds: Math.floor(NOW.getTime() / 1000),
  }));
  await denied(
    guardedRequest(fixture.cookiePair, proof),
    401,
  );

  const crossUser = await createFixture();
  const { proof: crossUserProof } = await bootstrapSuccess(crossUser);
  crossUser.verifierState.identity = exactVerifiedIdentity({
    authenticatedUserId: AUTH_USER_B,
  });
  const crossUserGuard = crossUser.implementation.createDrsBffGuard(
    crossUser.dependencies,
    WORKSPACE_REQUEST_CONTRACT,
  );
  await assert.rejects(
    crossUserGuard.authorize(
      guardedRequest(crossUser.cookiePair, crossUserProof),
    ),
    (error) => error instanceof DrsIdentityError && error.status === 401,
  );

  const crossCase = await createFixture();
  const { proof: crossCaseProof } = await bootstrapSuccess(crossCase);
  crossCase.authorization.state.selectedCaseId = CASE_B;
  const crossCaseGuard = crossCase.implementation.createDrsBffGuard(
    crossCase.dependencies,
    WORKSPACE_REQUEST_CONTRACT,
  );
  await assert.rejects(
    crossCaseGuard.authorize(
      guardedRequest(crossCase.cookiePair, crossCaseProof),
    ),
    (error) => error instanceof DrsIdentityError && error.status === 401,
  );
});

test("BFF guard rejects forged authority in headers, query, or body instead of accepting client hints", async () => {
  const fixture = await createFixture();
  const { proof } = await bootstrapSuccess(fixture);
  fixture.verifierState.calls.length = 0;
  fixture.authorization.state.calls.length = 0;
  const guard = fixture.implementation.createDrsBffGuard(
    fixture.dependencies,
    WORKSPACE_REQUEST_CONTRACT,
  );
  await guard.authorize(guardedRequest(fixture.cookiePair, proof, {
    headers: {
      "x-client-info": "laibe-browser",
      "x-forwarded-proto": "https",
      "x-request-id": "local-contract-check",
    },
  }));
  assert.equal(fixture.verifierState.calls.length, 1);
  assert.equal(fixture.authorization.state.calls.length, 1);
  fixture.verifierState.calls.length = 0;
  fixture.authorization.state.calls.length = 0;
  let deeplyNested = { selectedCalendarId: "caller-calendar" };
  for (let depth = 0; depth < 10; depth += 1) {
    deeplyNested = { payload: [deeplyNested] };
  }
  const requests = [
    guardedRequest(fixture.cookiePair, proof, {
      headers: {
        "x-laibe-arbitrary-caller": "forged",
      },
    }),
    guardedRequest(fixture.cookiePair, proof, {
      headers: { "x-drs-caller-context": "forged" },
    }),
    guardedRequest(fixture.cookiePair, proof, {
      headers: { "x-case-id": CASE_A },
    }),
    guardedRequest(fixture.cookiePair, proof, {
      headers: { "x-selected-case": CASE_A },
    }),
    guardedRequest(fixture.cookiePair, proof, {
      headers: { "x-calendar-id": "caller-calendar" },
    }),
    guardedRequest(fixture.cookiePair, proof, {
      url: `${WORKSPACE_ENDPOINT}?case_id=${CASE_A}`,
    }),
    guardedRequest(fixture.cookiePair, proof, {
      body: JSON.stringify({ payload: {}, authenticatedUserId: AUTH_USER_A }),
    }),
    guardedRequest(fixture.cookiePair, proof, {
      url: `${WORKSPACE_ENDPOINT}?selected_case_id=${CASE_A}`,
    }),
    guardedRequest(fixture.cookiePair, proof, {
      body: JSON.stringify({
        rows: [{
          currentCaseId: CASE_A,
          expectedCaseId: CASE_A,
          drsCaseId: CASE_A,
          selectedAssignmentId: "caller-assignment",
          currentProviderSubject: "caller-provider-subject",
          expectedProviderId: "caller-provider",
          selectedCalendarId: "caller-calendar",
          calendarProvider: "caller-calendar-provider",
        }],
      }),
    }),
    guardedRequest(fixture.cookiePair, proof, {
      body: JSON.stringify(deeplyNested),
    }),
  ];
  for (const request of requests) {
    await assert.rejects(
      guard.authorize(request),
      (error) => error instanceof DrsIdentityError && error.status === 400,
    );
  }
  assert.deepEqual(fixture.verifierState.calls, []);
  assert.deepEqual(fixture.authorization.state.calls, []);
});

test("BFF guard fails closed without a valid server-owned route contract", async () => {
  const fixture = await createFixture();
  const invalidContracts = [
    undefined,
    {},
    {
      ...WORKSPACE_REQUEST_CONTRACT,
      queryFields: [{
        name: "timeMin",
        scalarType: "string",
        validate: () => true,
      }, {
        name: "timeMin",
        scalarType: "string",
        validate: () => true,
      }],
    },
    {
      ...WORKSPACE_REQUEST_CONTRACT,
      queryFields: [{
        name: "x".repeat(65),
        scalarType: "string",
        validate: () => true,
      }],
    },
    {
      ...WORKSPACE_REQUEST_CONTRACT,
      queryFields: [{
        name: "count",
        scalarType: "number",
        validate: () => true,
      }],
    },
    {
      ...WORKSPACE_REQUEST_CONTRACT,
      jsonBodyFields: [{
        name: "timeMin",
        scalarType: "string",
      }],
    },
  ];
  for (const contract of invalidContracts) {
    assert.throws(
      () =>
        fixture.implementation.createDrsBffGuard(
          fixture.dependencies,
          contract,
        ),
      (error) => error instanceof DrsIdentityError && error.status === 503,
    );
  }
});

test("workspace closed contract rejects adversarial and arbitrary keys before downstream authority", async () => {
  const fixture = await createFixture();
  const { proof } = await bootstrapSuccess(fixture);
  fixture.verifierState.calls.length = 0;
  fixture.authorization.state.calls.length = 0;
  const guard = fixture.implementation.createDrsBffGuard(
    fixture.dependencies,
    WORKSPACE_REQUEST_CONTRACT,
  );
  for (
    const key of [
      "requestedCaseId",
      "targetAssignmentId",
      "activeSpecialistId",
      "sourceCalendarId",
      "externalProviderId",
      "caseIds",
      "foo",
    ]
  ) {
    await assert.rejects(
      guard.authorize(guardedRequest(fixture.cookiePair, proof, {
        body: JSON.stringify({ [key]: "caller-value" }),
      })),
      (error) => error instanceof DrsIdentityError && error.status === 400,
    );
  }
  assert.deepEqual(fixture.verifierState.calls, []);
  assert.deepEqual(fixture.authorization.state.calls, []);
});

test("events closed contract validates exact body schema, query, scalar form, method, and path", async () => {
  const fixture = await createFixture();
  const { proof } = await bootstrapSuccess(fixture);
  fixture.verifierState.calls.length = 0;
  fixture.authorization.state.calls.length = 0;
  const guard = fixture.implementation.createDrsBffGuard(
    fixture.dependencies,
    EVENTS_REQUEST_CONTRACT,
  );
  const validTimeMin = "2026-08-24T09:00:00.000Z";
  const validTimeMax = "2026-08-24T10:00:00.000Z";
  const validBody = JSON.stringify({
    timeMin: validTimeMin,
    timeMax: validTimeMax,
  });
  await guard.authorize(guardedRequest(fixture.cookiePair, proof, {
    url: EVENTS_ENDPOINT,
    body: validBody,
  }));
  assert.equal(fixture.verifierState.calls.length, 1);
  assert.equal(fixture.authorization.state.calls.length, 1);
  fixture.verifierState.calls.length = 0;
  fixture.authorization.state.calls.length = 0;

  const invalidRequests = [
    guardedRequest(fixture.cookiePair, proof, {
      method: "PUT",
      url: EVENTS_ENDPOINT,
      body: validBody,
    }),
    guardedRequest(fixture.cookiePair, proof, {
      url: WORKSPACE_ENDPOINT,
      body: validBody,
    }),
    guardedRequest(fixture.cookiePair, proof, {
      url: EVENTS_ENDPOINT,
      body: JSON.stringify({ timeMin: validTimeMin }),
    }),
    guardedRequest(fixture.cookiePair, proof, {
      url: `${EVENTS_ENDPOINT}?foo=one&foo=two`,
      body: validBody,
    }),
    guardedRequest(fixture.cookiePair, proof, {
      url: EVENTS_ENDPOINT,
      body: JSON.stringify({
        timeMin: "2026-08-24",
        timeMax: validTimeMax,
      }),
    }),
    guardedRequest(fixture.cookiePair, proof, {
      url: EVENTS_ENDPOINT,
      body: JSON.stringify({
        timeMin: validTimeMin,
        timeMax: validTimeMax,
        foo: "caller-value",
      }),
    }),
    guardedRequest(fixture.cookiePair, proof, {
      url: EVENTS_ENDPOINT,
      body:
        `{"timeMin":"caller-first","timeMin":"${validTimeMin}","timeMax":"${validTimeMax}"}`,
    }),
    guardedRequest(fixture.cookiePair, proof, {
      url: EVENTS_ENDPOINT,
      body: "[]",
    }),
    guardedRequest(fixture.cookiePair, proof, {
      url: EVENTS_ENDPOINT,
      body: JSON.stringify({
        timeMin: { nested: ["caller-value"] },
        timeMax: validTimeMax,
      }),
    }),
    guardedRequest(fixture.cookiePair, proof, {
      url: EVENTS_ENDPOINT,
      body: "{",
    }),
    guardedRequest(fixture.cookiePair, proof, {
      url: EVENTS_ENDPOINT,
      body: "x".repeat(64 * 1024 + 1),
    }),
    guardedRequest(fixture.cookiePair, proof, {
      url: EVENTS_ENDPOINT,
      body: validBody,
      headers: { "content-type": "text/plain" },
    }),
  ];
  for (const request of invalidRequests) {
    await assert.rejects(
      guard.authorize(request),
      (error) => error instanceof DrsIdentityError && error.status === 400,
    );
  }
  assert.deepEqual(fixture.verifierState.calls, []);
  assert.deepEqual(fixture.authorization.state.calls, []);
});

test("host-only __Host cookie jar sends the continuation only to same-origin bootstrap", async () => {
  const fixture = await createFixture();
  const jar = new HostOnlyCookieJar();
  jar.storeFromResponse(
    `${CALLBACK_ORIGIN}/functions/v1/drs-line-login-callback`,
    fixture.continuation.response.headers.get("set-cookie"),
  );
  assert.equal(jar.cookieHeader(ENDPOINT), fixture.cookiePair);
  assert.equal(
    jar.cookieHeader(
      "https://evil.example.com/functions/v1/drs-session-bootstrap",
    ),
    null,
  );
  const response = await fixture.implementation
    .createDrsSessionBootstrapHandler(
      fixture.dependencies,
    )(bootstrapRequest(jar.cookieHeader(ENDPOINT)));
  assert.equal(response.status, 204);
});

test("mock future A0 resolver keeps only bootstrap Authorization and expiry in memory", async () => {
  const fixture = await createFixture();
  const handler = fixture.implementation.createDrsSessionBootstrapHandler(
    fixture.dependencies,
  );
  const calls = [];
  const jar = new HostOnlyCookieJar();
  jar.storeFromResponse(
    `${CALLBACK_ORIGIN}/functions/v1/drs-line-login-callback`,
    fixture.continuation.response.headers.get("set-cookie"),
  );
  const fetchBootstrap = async (input, init) => {
    calls.push({ input, init: structuredClone(init) });
    const headers = new Headers(init.headers);
    const cookie = jar.cookieHeader(input);
    if (cookie) headers.set("cookie", cookie);
    return await handler(
      new Request(input, {
        method: init.method,
        headers,
        body: init.body,
      }),
    );
  };
  async function mockResolveVerifiedDrsSession() {
    const response = await fetchBootstrap(ENDPOINT, {
      method: "POST",
      credentials: "same-origin",
      headers: {
        "content-type": "application/json",
        "origin": APP_ORIGIN,
        "sec-fetch-site": "same-origin",
      },
      body: "{}",
    });
    if (response.status !== 204) return null;
    const bearer = response.headers.get("authorization") ?? "";
    const expiresAt = response.headers.get("x-laibe-session-expires-at");
    if (!bearer.startsWith("Bearer ") || !expiresAt) return null;
    return { accessToken: bearer.slice(7), expiresAt };
  }
  const session = await mockResolveVerifiedDrsSession();
  assert.deepEqual(Object.keys(session), ["accessToken", "expiresAt"]);
  assert.match(
    session.accessToken,
    /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/u,
  );
  assert.equal(session.expiresAt, "2026-08-24T09:00:45.000Z");
  assert.equal(calls.length, 1);
  assert.equal(calls[0].input, ENDPOINT);
  assert.equal(calls[0].init.credentials, "same-origin");
  assert.equal(new URL(calls[0].input).search, "");
  assert.equal(new URL(calls[0].input).hash, "");
});
