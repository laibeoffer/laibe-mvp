import assert from "node:assert/strict";

import { createDrsBffGuard } from "../functions/_shared/drs-auth/drs-session-bootstrap-bff.ts";

const RUNTIME_URL = new URL(
  "../functions/_shared/drs-auth/drs-secure-session-runtime.ts",
  import.meta.url,
);
const ENDPOINT_URL = new URL(
  "../functions/drs-session-bootstrap/index.ts",
  import.meta.url,
);

const SUPABASE_ORIGIN = "https://project.supabase.co";
const APP_ORIGIN = "https://app.example.com";
const SUCCESS_URL = `${APP_ORIGIN}/specialist`;
const COOKIE_NAME = "__Host-laibe-drs-session";
const SERVICE_ROLE_KEY = "service-role-test-key";
const USER_ID = "11111111-1111-4111-8111-111111111111";
const SPECIALIST_ID = "22222222-2222-4222-8222-222222222222";
const CASE_ID = "33333333-3333-4333-8333-333333333333";
const SUBJECT = `drs-specialist:${SPECIALIST_ID}`;
const NOW = new Date("2026-08-27T14:00:00.000Z");

function base64Url(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(
    /=+$/u,
    "",
  );
}

const COOKIE_KEY = base64Url(new Uint8Array(32).fill(0x11));
const PROOF_KEY = base64Url(new Uint8Array(32).fill(0x22));
const RAW_TOKEN = base64Url(new Uint8Array(32).fill(0x33));

function environment(overrides = {}, reads = []) {
  const values = {
    SUPABASE_URL: SUPABASE_ORIGIN,
    SUPABASE_SERVICE_ROLE_KEY: SERVICE_ROLE_KEY,
    LAIBE_DRS_APP_ORIGIN: APP_ORIGIN,
    LAIBE_DRS_SESSION_SUCCESS_URL: SUCCESS_URL,
    LAIBE_DRS_SESSION_COOKIE_NAME: COOKIE_NAME,
    LAIBE_DRS_SESSION_COOKIE_KEY_V1: COOKIE_KEY,
    LAIBE_DRS_BFF_PROOF_KEY_V1: PROOF_KEY,
    ...overrides,
  };
  return {
    get(name) {
      reads.push(name);
      if (name === "LAIBE_ALLOWED_ORIGINS") {
        throw new Error("hostile LAIBE_ALLOWED_ORIGINS getter was touched");
      }
      return values[name];
    },
  };
}

function jsonResponse(payload, status = 200, headers = {}) {
  const body = JSON.stringify(payload);
  return new Response(body, {
    status,
    headers: {
      "content-length": String(new TextEncoder().encode(body).byteLength),
      "content-type": "application/problem+json",
      "x-provider-secret": "must-be-dropped",
      ...headers,
    },
  });
}

function exactIssueProjection(body) {
  return {
    server_session_id: body.p_server_session_id,
    expires_at: body.p_expires_at,
  };
}

function createRpcHarness() {
  const calls = [];
  let issued = null;
  const fetch = (input, init) => {
    const url = new URL(String(input));
    const body = JSON.parse(String(init?.body));
    calls.push({ url, init: structuredClone(init), body });
    assert.equal(init?.method, "POST");
    assert.equal(init?.redirect, "error");
    assert.deepEqual(Object.keys(init?.headers ?? {}).sort(), [
      "apikey",
      "authorization",
      "content-type",
    ]);
    assert.equal(init.headers.authorization, `Bearer ${SERVICE_ROLE_KEY}`);
    assert.equal(init.headers.apikey, SERVICE_ROLE_KEY);
    assert.equal(init.headers["content-type"], "application/json");
    assert.ok(new TextEncoder().encode(String(init.body)).byteLength <= 2048);

    switch (url.pathname) {
      case "/rest/v1/rpc/drs_server_session_issue_v1":
        issued = {
          digest: body.p_access_token_digest,
          expiresAt: body.p_expires_at,
        };
        return jsonResponse(exactIssueProjection(body));
      case "/rest/v1/rpc/drs_server_session_verify_v1":
        assert.equal(body.p_access_token_digest, issued?.digest);
        return jsonResponse({
          authenticated_user_id: USER_ID,
          specialist_id: SPECIALIST_ID,
          authorization_subject: SUBJECT,
          expires_at: issued?.expiresAt,
        });
      case "/rest/v1/rpc/drs_server_session_revoke_v1":
        return jsonResponse({ revoked: true });
      case "/rest/v1/rpc/drs_workspace_grant_v1":
        return jsonResponse({
          authorized: true,
          state: "AUTHORIZED_DRS_WORKSPACE",
          case_id: CASE_ID,
          case_status: "active",
          access_mode: "read_only",
        });
      default:
        throw new Error(`unexpected RPC ${url.pathname}`);
    }
  };
  return { calls, fetch };
}

async function api() {
  return await import(`${RUNTIME_URL.href}?v=${Date.now()}-${Math.random()}`);
}

function validRuntime(module, overrides = {}) {
  return module.createDrsSecureSessionRuntime({
    env: environment(overrides.env),
    fetch: overrides.fetch ?? createRpcHarness().fetch,
    crypto: overrides.crypto ?? globalThis.crypto,
    now: overrides.now ?? (() => new Date(NOW)),
  });
}

Deno.test("focused RED: secure-session runtime factory composes exact immutable server ports", async () => {
  const module = await api();
  const harness = createRpcHarness();
  const reads = [];
  const runtime = module.createDrsSecureSessionRuntime({
    env: environment({}, reads),
    fetch: harness.fetch,
    crypto: globalThis.crypto,
    now: () => new Date(NOW),
  });

  assert.deepEqual(Object.keys(runtime), [
    "runtimeAvailable",
    "bootstrapDependencies",
    "verifiedSessionProducer",
    "sessionRevoker",
  ]);
  assert.equal(runtime.runtimeAvailable, true);
  assert.ok(Object.isFrozen(runtime));
  assert.ok(Object.isFrozen(runtime.bootstrapDependencies));
  assert.ok(Object.isFrozen(runtime.verifiedSessionProducer));
  assert.ok(Object.isFrozen(runtime.sessionRevoker));
  assert.deepEqual(reads, [
    "SUPABASE_URL",
    "SUPABASE_SERVICE_ROLE_KEY",
    "LAIBE_DRS_APP_ORIGIN",
    "LAIBE_DRS_SESSION_SUCCESS_URL",
    "LAIBE_DRS_SESSION_COOKIE_NAME",
    "LAIBE_DRS_SESSION_COOKIE_KEY_V1",
    "LAIBE_DRS_BFF_PROOF_KEY_V1",
  ]);
  assert.equal(reads.includes("LAIBE_ALLOWED_ORIGINS"), false);
  assert.deepEqual(runtime.bootstrapDependencies.authorization, {
    resolveSession: runtime.bootstrapDependencies.authorization.resolveSession,
    authorizeServerSelectedCase:
      runtime.bootstrapDependencies.authorization.authorizeServerSelectedCase,
  });
  assert.equal("revokeServerSession" in runtime.bootstrapDependencies, false);
});

Deno.test("Supabase origin and all seven exact environment values fail closed before fetch", async () => {
  const module = await api();
  const invalidSupabaseOrigins = [
    "https://project.supabase.co/",
    "https://project.supabase.co/path",
    "https://project.supabase.co?x=1",
    "https://project.supabase.co#x",
    "https://user@project.supabase.co",
    "https://PROJECT.supabase.co",
    "https://project.supabase.co:443",
    " https://project.supabase.co",
    "https://project.supabase.co\\evil",
    "http://localhost:54321",
    "http://project.supabase.co",
    "http://10.0.0.1",
    "http://192.168.1.1",
    "http://8.8.8.8",
    "http://0.0.0.0",
    "http://[::]",
    "ftp://project.supabase.co",
    "data:text/plain,opaque",
  ];
  for (const candidate of invalidSupabaseOrigins) {
    let fetchCount = 0;
    const runtime = module.createDrsSecureSessionRuntime({
      env: environment({ SUPABASE_URL: candidate }),
      fetch: () => {
        fetchCount += 1;
        throw new Error("must not fetch");
      },
      crypto: globalThis.crypto,
      now: () => new Date(NOW),
    });
    assert.deepEqual(runtime, {
      runtimeAvailable: false,
      bootstrapDependencies: undefined,
      verifiedSessionProducer: null,
      sessionRevoker: null,
    }, candidate);
    assert.equal(Object.isFrozen(runtime), true);
    assert.equal(fetchCount, 0, candidate);
  }

  for (
    const candidate of [
      "https://project.supabase.co",
      "http://127.0.0.1:54321",
      "http://[::1]:54321",
    ]
  ) {
    const runtime = validRuntime(module, {
      env: { SUPABASE_URL: candidate },
    });
    assert.equal(runtime.runtimeAvailable, true, candidate);
  }

  const invalidEnvironment = [
    { SUPABASE_SERVICE_ROLE_KEY: "" },
    { LAIBE_DRS_APP_ORIGIN: "http://app.example.com" },
    { LAIBE_DRS_APP_ORIGIN: `${APP_ORIGIN}/` },
    { LAIBE_DRS_SESSION_SUCCESS_URL: "https://other.example.com/specialist" },
    { LAIBE_DRS_SESSION_SUCCESS_URL: `${SUCCESS_URL}?next=x` },
    { LAIBE_DRS_SESSION_COOKIE_NAME: "laibe-drs-session" },
    { LAIBE_DRS_SESSION_COOKIE_KEY_V1: PROOF_KEY },
    { LAIBE_DRS_SESSION_COOKIE_KEY_V1: "not-base64url" },
    { LAIBE_DRS_BFF_PROOF_KEY_V1: COOKIE_KEY },
    { LAIBE_DRS_BFF_PROOF_KEY_V1: COOKIE_KEY.slice(1) },
  ];
  for (const override of invalidEnvironment) {
    const runtime = validRuntime(module, { env: override });
    assert.equal(runtime.runtimeAvailable, false, JSON.stringify(override));
    assert.equal(runtime.bootstrapDependencies, undefined);
    assert.equal(runtime.verifiedSessionProducer, null);
    assert.equal(runtime.sessionRevoker, null);
  }
});

Deno.test("AES cookie and HMAC proof codecs round-trip, randomize, reject tamper and remain reusable", async () => {
  const module = await api();
  const runtime = validRuntime(module);
  const cookieCodec = runtime.bootstrapDependencies.cookieEnvelope;
  const proofCodec = runtime.bootstrapDependencies.proofCodec;
  const envelope = Object.freeze({
    schemaVersion: "laibe.drs-server-session-cookie.v1",
    authenticatedUserId: USER_ID,
    specialistId: SPECIALIST_ID,
    authorizationSubject: SUBJECT,
    serverSessionId: "44444444-4444-4444-8444-444444444444",
    accessToken: RAW_TOKEN,
    expiresAtEpochSeconds: Math.floor(NOW.getTime() / 1000) + 900,
  });
  const sealedA = await cookieCodec.sealCookieEnvelope(envelope);
  const sealedB = await cookieCodec.sealCookieEnvelope(envelope);
  assert.match(sealedA, /^v1\.[A-Za-z0-9_-]{16}\.[A-Za-z0-9_-]+$/u);
  assert.notEqual(sealedA, sealedB);
  assert.deepEqual(await cookieCodec.openCookieEnvelope(sealedA), envelope);
  assert.equal(sealedA.includes(USER_ID), false);
  assert.equal(sealedA.includes(SPECIALIST_ID), false);
  assert.equal(sealedA.includes(RAW_TOKEN), false);
  await assert.rejects(() => cookieCodec.openCookieEnvelope(`${sealedA}x`));
  await assert.rejects(() => cookieCodec.openCookieEnvelope("v1.bad.bad"));
  await assert.rejects(() => cookieCodec.openCookieEnvelope("x".repeat(4097)));

  const wrongCookieRuntime = validRuntime(module, {
    env: {
      LAIBE_DRS_SESSION_COOKIE_KEY_V1: base64Url(new Uint8Array(32).fill(0x44)),
    },
  });
  await assert.rejects(() =>
    wrongCookieRuntime.bootstrapDependencies.cookieEnvelope.openCookieEnvelope(
      sealedA,
    )
  );

  const claims = Object.freeze({
    audience: "laibe:drs-session-bff",
    issuedAtEpochSeconds: Math.floor(NOW.getTime() / 1000),
    expiresAtEpochSeconds: Math.floor(NOW.getTime() / 1000) + 60,
    cookieDigest: "a".repeat(43),
    authorizationFactsDigest: "b".repeat(43),
  });
  const proof = await proofCodec.mintOpaqueProof(claims);
  assert.equal(proof.split(".").length, 3);
  assert.deepEqual(await proofCodec.verifyOpaqueProof(proof), claims);
  assert.deepEqual(await proofCodec.verifyOpaqueProof(proof), claims);
  const segments = proof.split(".");
  await assert.rejects(() =>
    proofCodec.verifyOpaqueProof(
      `${segments[0]}.${segments[1]}.${segments[2].slice(0, -1)}A`,
    )
  );
  const noneHeader = base64Url(
    new TextEncoder().encode('{"alg":"none","typ":"JWT"}'),
  );
  await assert.rejects(() =>
    proofCodec.verifyOpaqueProof(
      `${noneHeader}.${segments[1]}.${segments[2]}`,
    )
  );
  await assert.rejects(() => proofCodec.verifyOpaqueProof("x".repeat(4097)));
  await assert.rejects(() =>
    proofCodec.mintOpaqueProof({ ...claims, extra: true })
  );

  const wrongProofRuntime = validRuntime(module, {
    env: {
      LAIBE_DRS_BFF_PROOF_KEY_V1: base64Url(new Uint8Array(32).fill(0x55)),
    },
  });
  await assert.rejects(() =>
    wrongProofRuntime.bootstrapDependencies.proofCodec.verifyOpaqueProof(proof)
  );
});

Deno.test("issuer to cookie to bootstrap to proof to guard re-verifies session and current authority", async () => {
  const module = await api();
  const harness = createRpcHarness();
  const runtime = validRuntime(module, { fetch: harness.fetch });
  const producerResult = await runtime.verifiedSessionProducer
    .createVerifiedSession({
      authenticatedUserId: USER_ID,
      specialistId: SPECIALIST_ID,
      authorizationSubject: SUBJECT,
      callbackOrigin: APP_ORIGIN,
      successRedirectUrl: SUCCESS_URL,
      sessionCookieName: COOKIE_NAME,
    });
  assert.equal(producerResult.response.status, 303);
  const exactCookie = producerResult.response.headers.get("set-cookie")
    .split(";", 1)[0];
  assert.match(exactCookie, new RegExp(`^${COOKIE_NAME}=v1\\.`));
  assert.equal(exactCookie.includes(USER_ID), false);
  assert.equal(exactCookie.includes(SPECIALIST_ID), false);
  assert.equal(exactCookie.includes(SUBJECT), false);

  const endpoint = await import(`${ENDPOINT_URL.href}?v=${Date.now()}`);
  const bootstrap = endpoint.createDrsSessionBootstrapEndpoint(
    runtime.bootstrapDependencies,
  );
  const bootstrapResponse = await bootstrap(
    new Request(
      `${APP_ORIGIN}/functions/v1/drs-session-bootstrap`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "cookie": exactCookie,
          "origin": APP_ORIGIN,
          "sec-fetch-site": "same-origin",
        },
        body: "{}",
      },
    ),
  );
  assert.equal(bootstrapResponse.status, 204);
  const proof = bootstrapResponse.headers.get("authorization");
  assert.match(
    proof,
    /^Bearer [A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/u,
  );

  const guard = createDrsBffGuard(runtime.bootstrapDependencies, {
    method: "POST",
    pathname: "/functions/v1/drs-secure-probe",
    queryFields: Object.freeze([]),
    jsonBodyFields: null,
  });
  const context = await guard.authorize(
    new Request(
      `${APP_ORIGIN}/functions/v1/drs-secure-probe`,
      {
        method: "POST",
        headers: {
          "authorization": proof,
          "cookie": exactCookie,
          "origin": APP_ORIGIN,
          "sec-fetch-site": "same-origin",
        },
      },
    ),
  );
  assert.deepEqual(context, {
    authenticatedUserId: USER_ID,
    specialistId: SPECIALIST_ID,
    authorizationSubject: SUBJECT,
    selectedCaseId: CASE_ID,
    caseStatus: "active",
    accessMode: "read_only",
    proofExpiresAt: new Date(NOW.getTime() + 60_000).toISOString(),
  });

  const paths = harness.calls.map((call) => call.url.pathname);
  assert.equal(paths.filter((path) => path.endsWith("_issue_v1")).length, 1);
  assert.equal(paths.filter((path) => path.endsWith("_verify_v1")).length, 2);
  assert.equal(
    paths.filter((path) => path.endsWith("workspace_grant_v1")).length,
    2,
  );
  assert.equal(paths.some((path) => path === "/auth/v1/user"), false);
  for (const call of harness.calls) {
    assert.equal(JSON.stringify(call.body).includes(RAW_TOKEN), false);
  }
  const issue = harness.calls.find((call) =>
    call.url.pathname.endsWith("_issue_v1")
  );
  assert.deepEqual(Object.keys(issue.body), [
    "p_server_session_id",
    "p_access_token_digest",
    "p_authenticated_user_id",
    "p_specialist_id",
    "p_authorization_subject",
    "p_issued_at",
    "p_expires_at",
  ]);
  assert.match(issue.body.p_access_token_digest, /^[A-Za-z0-9_-]{43}$/u);
});

function hostileResponse({
  status = 200,
  redirected = false,
  contentLength,
  chunks = [new TextEncoder().encode('{"revoked":true}')],
  readError = null,
  bodyPresent = true,
}) {
  let index = 0;
  let cancelCount = 0;
  const reader = {
    read() {
      if (readError && index === readError.at) throw readError.error;
      if (index >= chunks.length) return { done: true, value: undefined };
      return { done: false, value: chunks[index++] };
    },
    cancel() {
      cancelCount += 1;
    },
  };
  const headers = new Headers();
  if (contentLength !== undefined) headers.set("content-length", contentLength);
  return {
    response: {
      status,
      redirected,
      headers,
      body: bodyPresent ? { getReader: () => reader } : null,
    },
    canceled: () => cancelCount,
  };
}

Deno.test("bounded RPC response reader rejects redirects, sizes, malformed streams, UTF-8 and JSON with cancellation", async () => {
  const module = await api();
  const goodBytes = new TextEncoder().encode('{"revoked":true}');
  const cases = [
    hostileResponse({
      redirected: true,
      contentLength: String(goodBytes.length),
    }),
    hostileResponse({ status: 302, contentLength: String(goodBytes.length) }),
    hostileResponse({ contentLength: "01" }),
    hostileResponse({ contentLength: "1, 1" }),
    hostileResponse({ contentLength: "8193" }),
    hostileResponse({ contentLength: String(goodBytes.length + 1) }),
    hostileResponse({ chunks: [] }),
    hostileResponse({ chunks: [new Uint8Array(8193)] }),
    hostileResponse({ chunks: ["not-a-uint8array"] }),
    hostileResponse({ chunks: [new Uint8Array([0xff])] }),
    hostileResponse({ chunks: [new TextEncoder().encode("not-json")] }),
    hostileResponse({ readError: { at: 0, error: new Error("aborted") } }),
  ];
  for (const candidate of cases) {
    const runtime = validRuntime(module, {
      fetch: () => candidate.response,
    });
    await assert.rejects(() =>
      runtime.sessionRevoker.revokeServerSession({
        serverSessionId: "44444444-4444-4444-8444-444444444444",
        accessToken: RAW_TOKEN,
      })
    );
    assert.equal(candidate.canceled(), 1);
  }

  const absent = hostileResponse({ bodyPresent: false });
  const absentRuntime = validRuntime(module, {
    fetch: () => absent.response,
  });
  await assert.rejects(() =>
    absentRuntime.sessionRevoker.revokeServerSession({
      serverSessionId: "44444444-4444-4444-8444-444444444444",
      accessToken: RAW_TOKEN,
    })
  );

  const noDeclaredLength = hostileResponse({ chunks: [goodBytes] });
  const successRuntime = validRuntime(module, {
    fetch: () => noDeclaredLength.response,
  });
  await successRuntime.sessionRevoker.revokeServerSession({
    serverSessionId: "44444444-4444-4444-8444-444444444444",
    accessToken: RAW_TOKEN,
  });
  assert.equal(noDeclaredLength.canceled(), 0);
});

Deno.test("server revoker validates its closed input, hashes the raw token, and accepts only own-key true", async () => {
  const module = await api();
  const calls = [];
  const runtime = validRuntime(module, {
    fetch: (input, init) => {
      calls.push({ input: String(input), body: JSON.parse(String(init.body)) });
      return jsonResponse({ revoked: true });
    },
  });
  await runtime.sessionRevoker.revokeServerSession({
    serverSessionId: "44444444-4444-4444-8444-444444444444",
    accessToken: RAW_TOKEN,
  });
  assert.equal(calls.length, 1);
  assert.deepEqual(Object.keys(calls[0].body), [
    "p_server_session_id",
    "p_access_token_digest",
  ]);
  assert.equal(JSON.stringify(calls[0].body).includes(RAW_TOKEN), false);
  assert.match(calls[0].body.p_access_token_digest, /^[A-Za-z0-9_-]{43}$/u);

  for (
    const invalid of [
      { serverSessionId: "not-uuid", accessToken: RAW_TOKEN },
      {
        serverSessionId: "44444444-4444-4444-8444-444444444444",
        accessToken: "raw",
      },
      {
        serverSessionId: "44444444-4444-4444-8444-444444444444",
        accessToken: `${RAW_TOKEN}=`,
      },
      {
        serverSessionId: "44444444-4444-4444-8444-444444444444",
        accessToken: RAW_TOKEN,
        extra: true,
      },
    ]
  ) {
    await assert.rejects(() =>
      runtime.sessionRevoker.revokeServerSession(invalid)
    );
  }
  assert.equal(calls.length, 1);

  for (
    const payload of [{ revoked: false }, { revoked: true, extra: true }, [
      true,
    ], null]
  ) {
    const closedRuntime = validRuntime(module, {
      fetch: () => jsonResponse(payload),
    });
    await assert.rejects(() =>
      closedRuntime.sessionRevoker.revokeServerSession({
        serverSessionId: "44444444-4444-4444-8444-444444444444",
        accessToken: RAW_TOKEN,
      })
    );
  }
});

Deno.test("default endpoint uses one composed runtime and returns 503 when environment is unavailable", async () => {
  const endpoint = await import(`${ENDPOINT_URL.href}?default=${Date.now()}`);
  assert.equal(endpoint.VERIFY_JWT_REQUIRED, false);
  const response = await endpoint.createDrsSessionBootstrapEndpoint()(
    new Request(
      `${APP_ORIGIN}/functions/v1/drs-session-bootstrap`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "{}",
      },
    ),
  );
  assert.equal(response.status, 503);
});
