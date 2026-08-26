import assert from "node:assert/strict";
import test from "node:test";

const moduleUrl = new URL("../src/stitch_laibe_landing_onboarding/drs_standalone/specialist_workspace/drs-session-adapter.js", import.meta.url);
const now = Date.parse("2026-08-24T08:00:00.000Z");
const validToken = "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJkcnMifQ.signature_1";

async function createResolver(resolveVerifiedDrsSession) {
  const { createDrsSessionHeadersResolver } = await import(`${moduleUrl.href}?test=${Date.now()}-${Math.random()}`);
  return createDrsSessionHeadersResolver({ resolveVerifiedDrsSession, now: () => now });
}

async function createBootstrapResolver(fetchImplementation) {
  const { createDrsSessionBootstrapResolver } = await import(`${moduleUrl.href}?bootstrap=${Date.now()}-${Math.random()}`);
  return createDrsSessionBootstrapResolver({ fetchImplementation });
}

test("session adapter emits only one ephemeral authorization header from a verified unexpired session", async () => {
  const resolveSessionHeaders = await createResolver(async () => ({
    accessToken: validToken,
    expiresAt: "2026-08-24T08:05:00.000Z",
  }));

  const headers = await resolveSessionHeaders();
  assert.deepEqual(headers, { authorization: `Bearer ${validToken}` });
  assert.deepEqual(Object.keys(headers), ["authorization"]);
});

test("session adapter fails closed when the verified-session producer is absent, throws, or returns malformed or expired data", async () => {
  const invalidResolvers = [
    undefined,
    async () => {
      throw new Error("private upstream detail");
    },
    async () => null,
    async () => ({ accessToken: validToken }),
    async () => ({ accessToken: validToken, expiresAt: "not-a-time" }),
    async () => ({ accessToken: validToken, expiresAt: "2026-08-24T08:00:00.000Z" }),
    async () => ({ accessToken: validToken, expiresAt: "2026-08-24T08:05:00.000Z", role: "drs" }),
    async () => ({ accessToken: validToken, expiresAt: "2026-08-24T08:05:00.000Z", caseId: "CASE-A7" }),
  ];

  for (const resolveVerifiedDrsSession of invalidResolvers) {
    const resolveSessionHeaders = await createResolver(resolveVerifiedDrsSession);
    assert.equal(await resolveSessionHeaders(), null);
  }
});

test("session adapter rejects whitespace, control characters, bearer prefixes, and non-token-like access tokens without storage, DOM, or logging", async () => {
  const invalidTokens = [
    "",
    "abc",
    "a.b",
    "a.b.c.d",
    "Bearer a.b.c",
    "a. b.c",
    "a.b.\nc",
    "a.b.\u0000c",
  ];
  const originalConsoleError = console.error;
  const originalConsoleLog = console.log;
  console.error = () => {
    throw new Error("must not log");
  };
  console.log = () => {
    throw new Error("must not log");
  };
  try {
    for (const accessToken of invalidTokens) {
      const resolveSessionHeaders = await createResolver(async () => ({
        accessToken,
        expiresAt: "2026-08-24T08:05:00.000Z",
      }));
      assert.equal(await resolveSessionHeaders(), null, JSON.stringify(accessToken));
    }
  } finally {
    console.error = originalConsoleError;
    console.log = originalConsoleLog;
  }
});

test("session bootstrap resolver requests only the exact same-origin empty contract and keeps proof ephemeral", async () => {
  const calls = [];
  const resolveVerifiedDrsSession = await createBootstrapResolver(async (input, init) => {
    calls.push({ input, init });
    return {
      status: 204,
      headers: new Headers({
        authorization: `Bearer ${validToken}`,
        "x-laibe-session-expires-at": "2026-08-24T08:05:00.000Z",
      }),
    };
  });

  assert.deepEqual(await resolveVerifiedDrsSession(), {
    accessToken: validToken,
    expiresAt: "2026-08-24T08:05:00.000Z",
  });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].input, "/functions/v1/drs-session-bootstrap");
  assert.deepEqual(calls[0].init, {
    method: "POST",
    credentials: "same-origin",
    headers: { "content-type": "application/json" },
    body: "{}",
  });
});

test("session bootstrap resolver fails closed on transport, status, and response-header drift", async () => {
  const cases = [
    undefined,
    async () => {
      throw new Error("private transport detail");
    },
    async () => ({ status: 200, headers: new Headers() }),
    async () => ({ status: 204, headers: new Headers({ authorization: `Bearer ${validToken}` }) }),
    async () => ({ status: 204, headers: new Headers({ authorization: "Bearer invalid", "x-laibe-session-expires-at": "2026-08-24T08:05:00.000Z" }) }),
  ];
  for (const fetchImplementation of cases) {
    const resolver = await createBootstrapResolver(fetchImplementation);
    assert.equal(await resolver(), null);
  }
});
