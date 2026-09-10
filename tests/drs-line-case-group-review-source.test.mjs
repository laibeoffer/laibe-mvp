import assert from "node:assert/strict";
import { webcrypto } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

if (!globalThis.crypto) globalThis.crypto = webcrypto;

const root = new URL("../", import.meta.url);
const shared = new URL(
  "supabase/functions/_shared/drs-line-case-group/",
  root,
);
const migration = new URL(
  "supabase/migrations/20260911090000_drs_line_case_group_review_dispatch_v1.sql",
  root,
);

const expectedFiles = [
  migration,
  new URL("contracts.ts", shared),
  new URL("crypto.ts", shared),
  new URL("line-client.ts", shared),
  new URL("repository.ts", shared),
  new URL("binding-start.ts", shared),
  new URL("webhook.ts", shared),
  new URL("review-notification.ts", shared),
  new URL("dispatch.ts", shared),
  new URL(
    "supabase/functions/drs-line-case-group-binding-start/index.ts",
    root,
  ),
  new URL("supabase/functions/drs-line-case-webhook/index.ts", root),
  new URL(
    "supabase/functions/drs-line-review-notification-enqueue/index.ts",
    root,
  ),
  new URL(
    "supabase/functions/drs-line-review-notification-dispatch/index.ts",
    root,
  ),
  new URL("canonical-webhook.ts", shared),
  new URL("supabase/functions/drs-line-webhook/index.ts", root),
];

const GROUP_ID = "C0123456789abcdef0123456789abcdef";
const USER_ID = "U0123456789abcdef0123456789abcdef";
const EVENT_ID = "01HZZZZZZZZZZZZZZZZZZZZZZZ";
const REVIEW_EVENT_ID = "00000000-0000-4000-8000-000000000001";
const publicLineEntrypoints = [
  {
    slug: "drs-line-case-group-binding-start",
    createName: "createCaseGroupBindingStartHandler",
    verifyJwt: true,
  },
  {
    slug: "drs-line-review-notification-enqueue",
    createName: "createReviewNotificationEnqueueHandler",
    verifyJwt: false,
  },
  {
    slug: "drs-line-review-notification-dispatch",
    createName: "createReviewNotificationDispatchHandler",
    verifyJwt: true,
  },
  {
    slug: "drs-line-webhook",
    createName: "createCanonicalLineWebhookHandler",
    verifyJwt: false,
  },
];

test("all bounded LINE case-group runtime artifacts exist", () => {
  for (const path of expectedFiles) {
    assert.equal(existsSync(path), true, `${path.pathname} must exist`);
  }
});

test("browser inputs never accept case, group, role, email, or provider authority", async () => {
  const { readBindingStartInput, readReviewEnqueueInput } = await import(
    new URL("contracts.ts", shared).href
  );

  assert.deepEqual(readBindingStartInput({}), {});
  assert.equal(readBindingStartInput({ lineGroupId: GROUP_ID }), null);
  assert.equal(readBindingStartInput({ caseId: REVIEW_EVENT_ID }), null);
  assert.equal(readBindingStartInput({ email: "owner@example.invalid" }), null);

  assert.deepEqual(readReviewEnqueueInput({ reviewEventId: REVIEW_EVENT_ID }), {
    reviewEventId: REVIEW_EVENT_ID,
  });
  for (const extra of ["caseId", "lineGroupId", "role", "email"]) {
    assert.equal(
      readReviewEnqueueInput({ reviewEventId: REVIEW_EVENT_ID, [extra]: "x" }),
      null,
    );
  }
});

test("signed webhook parser accepts only an exact LINE group binding message", async () => {
  const { readGroupBindingWebhookEnvelope } = await import(
    new URL("contracts.ts", shared).href
  );
  const challenge = "A".repeat(43);
  const event = {
    type: "message",
    mode: "active",
    timestamp: 1789099200000,
    source: { type: "group", groupId: GROUP_ID, userId: USER_ID },
    webhookEventId: EVENT_ID,
    deliveryContext: { isRedelivery: false },
    replyToken: "reply-token-no-provider-secret",
    message: {
      id: "555001",
      type: "text",
      quoteToken: "quote-token-no-provider-secret",
      text: `DRS案件綁定 ${challenge}`,
    },
  };

  assert.deepEqual(
    readGroupBindingWebhookEnvelope({
      destination: USER_ID,
      events: [event],
    }),
    {
      destination: USER_ID,
      events: [{
        webhookEventId: EVENT_ID,
        lineGroupId: GROUP_ID,
        lineUserId: USER_ID,
        challenge,
        timestamp: 1789099200000,
        isRedelivery: false,
      }],
    },
  );

  assert.deepEqual(
    readGroupBindingWebhookEnvelope({
      destination: USER_ID,
      events: [{ ...event, source: { type: "user", userId: USER_ID } }],
    }),
    { destination: USER_ID, events: [] },
  );
  assert.deepEqual(
    readGroupBindingWebhookEnvelope({
      destination: USER_ID,
      events: [{ ...event, role: "owner" }],
    }),
    { destination: USER_ID, events: [] },
  );
});

test("LINE webhook verification and unrelated signed events are acknowledged without retry", async () => {
  const { readGroupBindingWebhookEnvelope } = await import(
    new URL("contracts.ts", shared).href
  );
  assert.deepEqual(
    readGroupBindingWebhookEnvelope({ destination: USER_ID, events: [] }),
    { destination: USER_ID, events: [] },
  );
  assert.deepEqual(
    readGroupBindingWebhookEnvelope({
      destination: USER_ID,
      events: [{ type: "follow", webhookEventId: EVENT_ID }],
    }),
    { destination: USER_ID, events: [] },
  );
});

test("LINE group identifiers are encrypted with authenticated context", async () => {
  const {
    decryptLineGroupId,
    encryptLineGroupId,
    importLineGroupEncryptionKey,
  } = await import(new URL("crypto.ts", shared).href);
  const rawKey = new Uint8Array(32).fill(7);
  const encodedKey = Buffer.from(rawKey).toString("base64url");
  const key = await importLineGroupEncryptionKey(encodedKey);
  const encrypted = await encryptLineGroupId(key, GROUP_ID);

  assert.notEqual(encrypted.ciphertext, GROUP_ID);
  assert.match(encrypted.iv, /^[A-Za-z0-9_-]{16}$/u);
  assert.equal(await decryptLineGroupId(key, encrypted), GROUP_ID);
  await assert.rejects(
    decryptLineGroupId(key, {
      ...encrypted,
      ciphertext: `${encrypted.ciphertext}A`,
    }),
  );
});

test("group push uses one provider request, a retry key, and receipt identifiers", async () => {
  const { createLineGroupClient } = await import(
    new URL("line-client.ts", shared).href
  );
  const calls = [];
  const client = createLineGroupClient({
    accessToken: "local-test-token-not-a-real-secret",
    fetch: async (url, init) => {
      calls.push({ url, init });
      return new Response("{}", {
        status: 200,
        headers: {
          "content-type": "application/json",
          "x-line-request-id": "provider-request-001",
        },
      });
    },
  });
  const result = await client.pushText(
    GROUP_ID,
    "審核結果已完成，請於案件工作台確認。",
    "00000000-0000-4000-8000-000000000002",
  );

  assert.deepEqual(result, {
    observedRequestId: "provider-request-001",
    acceptedRequestId: null,
    messageId: null,
    statusClass: "2xx",
    replayed: false,
  });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, "https://api.line.me/v2/bot/message/push");
  assert.equal(
    new Headers(calls[0].init.headers).get("x-line-retry-key"),
    "00000000-0000-4000-8000-000000000002",
  );
  assert.deepEqual(JSON.parse(calls[0].init.body), {
    to: GROUP_ID,
    messages: [{
      type: "text",
      text: "審核結果已完成，請於案件工作台確認。",
    }],
  });
});

test("LINE retry conflict keeps both the observed and accepted request receipts", async () => {
  const { createLineGroupClient } = await import(
    new URL("line-client.ts", shared).href
  );
  const client = createLineGroupClient({
    accessToken: "local-test-token-not-a-real-secret",
    fetch: async () =>
      new Response("", {
        status: 409,
        headers: {
          "x-line-request-id": "provider-observed-409",
          "x-line-accepted-request-id": "provider-accepted-before",
        },
      }),
  });
  assert.deepEqual(
    await client.pushText(
      GROUP_ID,
      "審核結果已完成，請於案件工作台確認。",
      "00000000-0000-4000-8000-000000000002",
    ),
    {
      observedRequestId: "provider-observed-409",
      acceptedRequestId: "provider-accepted-before",
      messageId: null,
      statusClass: "4xx",
      replayed: true,
    },
  );
});

test("LINE message length uses UTF-16 code units at the 5000-unit boundary", async () => {
  const { createLineGroupClient } = await import(
    new URL("line-client.ts", shared).href
  );
  let calls = 0;
  const client = createLineGroupClient({
    accessToken: "local-test-token-not-a-real-secret",
    fetch: async () => {
      calls += 1;
      return new Response("{}", {
        status: 200,
        headers: { "x-line-request-id": "provider-request-utf16" },
      });
    },
  });
  await client.pushText(
    GROUP_ID,
    "😀".repeat(2500),
    "00000000-0000-4000-8000-000000000002",
  );
  await assert.rejects(
    client.pushText(
      GROUP_ID,
      "😀".repeat(2501),
      "00000000-0000-4000-8000-000000000003",
    ),
  );
  assert.equal(calls, 1);
});

test("LINE failures retain an observed provider request id", async () => {
  const { createLineGroupClient, LineGroupProviderError } = await import(
    new URL("line-client.ts", shared).href
  );
  const client = createLineGroupClient({
    accessToken: "local-test-token-not-a-real-secret",
    fetch: async () =>
      new Response("", {
        status: 429,
        headers: { "x-line-request-id": "provider-rate-limit-001" },
      }),
  });
  await assert.rejects(
    client.pushText(
      GROUP_ID,
      "審核結果已完成。",
      "00000000-0000-4000-8000-000000000002",
    ),
    (error) => {
      assert.equal(error instanceof LineGroupProviderError, true);
      assert.equal(error.observedRequestId, "provider-rate-limit-001");
      assert.equal(error.statusClass, "4xx");
      assert.equal(error.retryable, true);
      return true;
    },
  );
});

test("all new Edge entrypoints declare the required JWT boundary", () => {
  const start = readFileSync(expectedFiles[9], "utf8");
  const webhook = readFileSync(expectedFiles[10], "utf8");
  const enqueue = readFileSync(expectedFiles[11], "utf8");
  const dispatch = readFileSync(expectedFiles[12], "utf8");
  assert.match(start, /VERIFY_JWT_REQUIRED\s*=\s*true/u);
  assert.match(webhook, /VERIFY_JWT_REQUIRED\s*=\s*false/u);
  assert.match(enqueue, /VERIFY_JWT_REQUIRED\s*=\s*false/u);
  assert.match(dispatch, /VERIFY_JWT_REQUIRED\s*=\s*true/u);
});

test("review enqueue forwards only sealed DRS cookie proof and the review event selector", async () => {
  const { createReviewNotificationEnqueueHandler } = await import(
    new URL("review-notification.ts", shared).href
  );
  let rpcInput;
  const handler = createReviewNotificationEnqueueHandler({
    env: {
      get(name) {
        return {
          DRS_ALLOWED_ORIGINS: "https://workspace.example.invalid",
          DRS_LINE_IDENTITY_HMAC_KEY: "local-test-hmac-key-material",
          DRS_LINE_PROVIDER_CHANNEL_ID: "local-channel-id",
        }[name];
      },
    },
    repository: {
      async invoke(name, input) {
        assert.equal(name, "drs_line_review_notification_enqueue_v1");
        rpcInput = input;
        return {
          ok: true,
          state: "ENQUEUED",
          outbox_id: "00000000-0000-4000-8000-000000000006",
        };
      },
    },
    async verify(request) {
      assert.equal(request.headers.has("authorization"), false);
      assert.equal(
        request.headers.get("cookie"),
        "__Host-laibe-drs=sealed-local-test-cookie",
      );
      return {
        state: "verified",
        proof: {
          serverSessionId: "00000000-0000-4000-8000-000000000001",
          accessTokenDigest: "A".repeat(43),
          authenticatedUserId: "00000000-0000-4000-8000-000000000002",
          authSessionId: "00000000-0000-4000-8000-000000000003",
          authTokenDigest: "B".repeat(43),
        },
      };
    },
  });
  const response = await handler(
    new Request(
      "https://api.example.invalid/functions/v1/drs-line-review-notification-enqueue",
      {
        method: "POST",
        headers: {
          origin: "https://workspace.example.invalid",
          "content-type": "application/json",
          cookie: "__Host-laibe-drs=sealed-local-test-cookie",
        },
        body: JSON.stringify({ reviewEventId: REVIEW_EVENT_ID }),
      },
    ),
  );
  assert.equal(response.status, 200);
  assert.deepEqual(Object.keys(rpcInput).sort(), [
    "access_token_digest",
    "auth_session_id",
    "auth_token_digest",
    "authenticated_user_id",
    "provider_channel_digest",
    "review_event_id",
    "server_session_id",
  ]);
  for (const forbidden of ["case_id", "line_group_id", "email", "role"]) {
    assert.equal(Object.hasOwn(rpcInput, forbidden), false);
  }
});

test("review enqueue proof matches the actual auth-bound session digest contract", async () => {
  const { createAuthBoundSession } = await import(
    new URL("../drs-auth/auth-bound-session.ts", shared).href
  );
  const authBound = createAuthBoundSession({
    supabaseUrl: "https://supabase.example.invalid",
    serviceRoleKey: "local-test-service-role-key-material",
    allowedOrigin: "https://workspace.example.invalid",
    successRedirectUrl: "https://workspace.example.invalid/drs",
    sessionCookieName: "__Host-laibe-drs",
    cookieKey: new Uint8Array(32).fill(9),
    now: () => new Date("2026-09-11T12:00:00.000Z"),
    fetch: () => {
      throw new Error("proofBody must not call a provider");
    },
    crypto: globalThis.crypto,
  });
  const proof = await authBound.proofBody({
    schemaVersion: "laibe.drs-server-session-cookie.v2",
    authenticatedUserId: "00000000-0000-4000-8000-000000000002",
    specialistId: "00000000-0000-4000-8000-000000000004",
    authorizationSubject: "drs-specialist:00000000-0000-4000-8000-000000000004",
    serverSessionId: "00000000-0000-4000-8000-000000000001",
    accessToken: "S".repeat(43),
    expiresAtEpochSeconds: 1789131600,
    authSessionId: "00000000-0000-4000-8000-000000000003",
    supabaseAccessToken: "header.payload.signature",
    authExpiresAtEpochSeconds: 1789131600,
  });
  assert.deepEqual(Object.keys(proof).sort(), [
    "p_access_token_digest",
    "p_auth_session_id",
    "p_auth_token_digest",
    "p_authenticated_user_id",
    "p_server_session_id",
  ]);
  assert.match(proof.p_access_token_digest, /^[A-Za-z0-9_-]{43}$/u);
  assert.match(proof.p_auth_token_digest, /^[A-Za-z0-9_-]{43}$/u);
  assert.doesNotMatch(proof.p_access_token_digest, /^[a-f0-9]{64}$/u);
  assert.doesNotMatch(proof.p_auth_token_digest, /^[a-f0-9]{64}$/u);
});

test("canonical LINE webhook routes unchanged signed bytes by provider source type", async () => {
  const { createCanonicalLineWebhookHandler } = await import(
    new URL("canonical-webhook.ts", shared).href
  );
  const seen = [];
  const handler = createCanonicalLineWebhookHandler({
    accountLinkHandler: async (request) => {
      seen.push({
        route: "account",
        path: new URL(request.url).pathname,
        signature: request.headers.get("x-line-signature"),
        body: await request.text(),
      });
      return new Response(null, { status: 200 });
    },
    caseGroupHandler: async (request) => {
      seen.push({
        route: "group",
        path: new URL(request.url).pathname,
        signature: request.headers.get("x-line-signature"),
        body: await request.text(),
      });
      return new Response(null, { status: 200 });
    },
  });
  const groupRaw = JSON.stringify({
    destination: USER_ID,
    events: [{ source: { type: "group", groupId: GROUP_ID } }],
  });
  const groupResponse = await handler(
    new Request("https://api.example.invalid/functions/v1/drs-line-webhook", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-line-signature": "signed-original-group-bytes",
      },
      body: groupRaw,
    }),
  );
  assert.equal(groupResponse.status, 200);
  assert.deepEqual(seen.shift(), {
    route: "group",
    path: "/functions/v1/drs-line-case-webhook",
    signature: "signed-original-group-bytes",
    body: groupRaw,
  });

  const userRaw = JSON.stringify({
    destination: USER_ID,
    events: [{ source: { type: "user", userId: USER_ID } }],
  });
  const userResponse = await handler(
    new Request("https://api.example.invalid/functions/v1/drs-line-webhook", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-line-signature": "signed-original-user-bytes",
      },
      body: userRaw,
    }),
  );
  assert.equal(userResponse.status, 200);
  assert.deepEqual(seen.shift(), {
    route: "account",
    path: "/functions/v1/drs-line-webhook",
    signature: "signed-original-user-bytes",
    body: userRaw,
  });
  assert.equal(seen.length, 0);
});

test("all public LINE entrypoints compose their exact gateway boundary and preserve JWT flags", () => {
  for (const entrypoint of publicLineEntrypoints) {
    const source = readFileSync(
      new URL(`supabase/functions/${entrypoint.slug}/index.ts`, root),
      "utf8",
    );
    assert.match(source, /withEdgeRequestBoundary/u, entrypoint.slug);
    assert.match(
      source,
      new RegExp(
        `handler\\s*=\\s*withEdgeRequestBoundary\\(\\s*"${entrypoint.slug}"\\s*,\\s*${entrypoint.createName}\\(`,
        "u",
      ),
      entrypoint.slug,
    );
    assert.match(
      source,
      new RegExp(
        `VERIFY_JWT_REQUIRED\\s*=\\s*${entrypoint.verifyJwt}`,
        "u",
      ),
      entrypoint.slug,
    );
  }
});

test("canonical boundary accepts gateway and public paths without changing signed bytes", async () => {
  const { withEdgeRequestBoundary } = await import(
    new URL(
      "supabase/functions/_shared/http/edge-request-boundary.ts",
      root,
    ).href
  );
  const { createCanonicalLineWebhookHandler } = await import(
    new URL("canonical-webhook.ts", shared).href
  );
  const seen = [];
  const handler = withEdgeRequestBoundary(
    "drs-line-webhook",
    createCanonicalLineWebhookHandler({
      accountLinkHandler: async (request) => {
        seen.push({
          path: new URL(request.url).pathname,
          signature: request.headers.get("x-line-signature"),
          body: new Uint8Array(await request.arrayBuffer()),
        });
        return new Response(null, { status: 200 });
      },
      caseGroupHandler: () => {
        throw new Error("empty events must not reach the case-group handler");
      },
    }),
  );
  const rawBody = new TextEncoder().encode(
    ` {"destination":"${USER_ID}","events":[]}\r\n`,
  );

  for (
    const path of [
      "/drs-line-webhook",
      "/functions/v1/drs-line-webhook",
    ]
  ) {
    const response = await handler(
      new Request(`https://api.example.invalid${path}`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-line-signature": "signed-exact-raw-bytes",
        },
        body: Uint8Array.from(rawBody),
      }),
    );
    assert.equal(response.status, 200);
  }

  assert.equal(seen.length, 2);
  for (const request of seen) {
    assert.equal(request.path, "/functions/v1/drs-line-webhook");
    assert.equal(request.signature, "signed-exact-raw-bytes");
    assert.deepEqual(request.body, rawBody);
  }
});

test("all public LINE boundaries reject lookalike paths before downstream effects", async () => {
  const { withEdgeRequestBoundary } = await import(
    new URL(
      "supabase/functions/_shared/http/edge-request-boundary.ts",
      root,
    ).href
  );
  let effects = 0;
  const downstream = () => {
    effects += 1;
    return new Response(null, { status: 200 });
  };
  for (const entrypoint of publicLineEntrypoints) {
    const handler = withEdgeRequestBoundary(entrypoint.slug, downstream);
    const rejected = [
      `/${entrypoint.slug}?unexpected=1`,
      `/${entrypoint.slug}/`,
      `/${entrypoint.slug}/child`,
      "/another-function",
    ];
    for (const path of rejected) {
      const response = await handler(
        new Request(`https://api.example.invalid${path}`, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-line-signature": "signed-but-wrong-path",
          },
          body: `{"destination":"${USER_ID}","events":[]}`,
        }),
      );
      assert.equal(response.status, 400, `${entrypoint.slug}:${path}`);
      assert.equal(
        response.headers.get("cache-control"),
        "no-store",
        `${entrypoint.slug}:${path}`,
      );
    }
  }
  assert.equal(effects, 0);
});

test("all public LINE exported handlers treat gateway and canonical paths identically", async () => {
  for (const entrypoint of publicLineEntrypoints) {
    const { handler } = await import(
      new URL(`supabase/functions/${entrypoint.slug}/index.ts`, root).href
    );
    const outcomes = [];
    for (
      const path of [
        `/${entrypoint.slug}`,
        `/functions/v1/${entrypoint.slug}`,
      ]
    ) {
      const response = await handler(
        new Request(`https://api.example.invalid${path}`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: `{"destination":"${USER_ID}","events":[]}`,
        }),
      );
      outcomes.push({ status: response.status, body: await response.text() });
    }
    assert.deepEqual(outcomes[0], outcomes[1], entrypoint.slug);
    assert.notEqual(
      outcomes[0].body,
      '{"state":"INVALID_REQUEST"}',
      entrypoint.slug,
    );
  }
});

test("webhook rejects an invalid signature before parsing or persistence", async () => {
  const { createCaseGroupWebhookHandler } = await import(
    new URL("webhook.ts", shared).href
  );
  let repositoryCalls = 0;
  let signatureCalls = 0;
  const handler = createCaseGroupWebhookHandler({
    env: {
      get(name) {
        return name === "LINE_CHANNEL_SECRET"
          ? "local-test-channel-secret"
          : undefined;
      },
    },
    repository: {
      async invoke() {
        repositoryCalls += 1;
        return {};
      },
    },
    async verifySignature() {
      signatureCalls += 1;
      return false;
    },
  });
  const response = await handler(
    new Request(
      "https://example.invalid/functions/v1/drs-line-case-webhook",
      {
        method: "POST",
        headers: { "x-line-signature": "invalid" },
        body: "not-json",
      },
    ),
  );
  assert.equal(response.status, 401);
  assert.deepEqual(await response.json(), { state: "signature_denied" });
  assert.equal(signatureCalls, 1);
  assert.equal(repositoryCalls, 0);
});

test("binding start forwards only verified-session and server protocol facts", async () => {
  const { createCaseGroupBindingStartHandler } = await import(
    new URL("binding-start.ts", shared).href
  );
  let rpcInput;
  const handler = createCaseGroupBindingStartHandler({
    env: {
      get(name) {
        return {
          DRS_ALLOWED_ORIGINS: "https://workspace.example.invalid",
          DRS_LINE_IDENTITY_HMAC_KEY: "local-test-hmac-key-material",
          DRS_LINE_PROVIDER_CHANNEL_ID: "local-channel-id",
        }[name];
      },
    },
    repository: {
      async invoke(name, input) {
        assert.equal(name, "drs_line_case_group_binding_start_v1");
        rpcInput = input;
        return {
          ok: true,
          state: "AWAITING_LINE_GROUP",
          intent_id: "00000000-0000-4000-8000-000000000011",
          case_id: "00000000-0000-4000-8000-000000000012",
          expires_at: "2026-09-11T12:05:00.000Z",
        };
      },
    },
    async verify() {
      return {
        state: "verified",
        session: {
          userId: "00000000-0000-4000-8000-000000000013",
          authSessionId: "00000000-0000-4000-8000-000000000014",
          expiresAtEpochSeconds: 1789131600,
        },
      };
    },
    now: () => Date.parse("2026-09-11T12:00:00.000Z"),
  });
  const response = await handler(
    new Request(
      "https://api.example.invalid/functions/v1/drs-line-case-group-binding-start",
      {
        method: "POST",
        headers: {
          origin: "https://workspace.example.invalid",
          "content-type": "application/json",
          authorization: "Bearer local-test-only",
        },
        body: "{}",
      },
    ),
  );
  assert.equal(response.status, 200);
  assert.deepEqual(Object.keys(rpcInput).sort(), [
    "auth_session_id",
    "authenticated_user_id",
    "challenge_digest",
    "expires_at",
    "provider_channel_digest",
  ]);
  for (const forbidden of ["case_id", "line_group_id", "email", "role"]) {
    assert.equal(Object.hasOwn(rpcInput, forbidden), false);
  }
  const body = await response.json();
  assert.equal(body.caseId, "00000000-0000-4000-8000-000000000012");
  assert.match(body.bindingCommand, /^DRS案件綁定 [A-Za-z0-9_-]{43}$/u);
});

test("service dispatch accepts only an empty command body", async () => {
  const { createReviewNotificationDispatchHandler } = await import(
    new URL("dispatch.ts", shared).href
  );
  const handler = createReviewNotificationDispatchHandler();
  const response = await handler(
    new Request(
      "https://api.example.invalid/functions/v1/drs-line-review-notification-dispatch",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ x: 1 }),
      },
    ),
  );
  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), { state: "invalid_request" });
});

test("dispatch keeps an unavailable authority assertion retryable", async () => {
  const { createReviewNotificationDispatchHandler } = await import(
    new URL("dispatch.ts", shared).href
  );
  const { hmacIdentityDigest } = await import(
    new URL("crypto.ts", shared).href
  );
  const providerChannelDigest = await hmacIdentityDigest(
    "local-test-hmac-key-material",
    "local-channel-id",
  );
  let lineCalls = 0;
  const handler = createReviewNotificationDispatchHandler({
    env: {
      get(name) {
        return {
          DRS_LINE_IDENTITY_HMAC_KEY: "local-test-hmac-key-material",
          DRS_LINE_PROVIDER_CHANNEL_ID: "local-channel-id",
          DRS_LINE_GROUP_ENCRYPTION_KEY_VERSION: "local-v1",
        }[name];
      },
    },
    repository: {
      async invoke(name) {
        if (name === "drs_line_review_notification_claim_v1") {
          return {
            claimed: true,
            state: "CLAIMED",
            outbox_id: "00000000-0000-4000-8000-000000000021",
            claim_token: "00000000-0000-4000-8000-000000000022",
            retry_key: "00000000-0000-4000-8000-000000000023",
            provider_channel_digest: providerChannelDigest,
            line_group_digest: "B".repeat(43),
            line_group_ciphertext: "C".repeat(32),
            line_group_iv: "D".repeat(16),
            encryption_key_version: "local-v1",
            message_text: "審核已完成。",
          };
        }
        if (name === "drs_line_review_notification_assert_current_v1") {
          return { ok: false, state: "CONTEXT_UNAVAILABLE" };
        }
        throw new Error("unexpected RPC");
      },
    },
    lineClient: {
      async pushText() {
        lineCalls += 1;
        throw new Error("must not call provider");
      },
    },
    encryptionKey: {},
    authorizeService: () => true,
  });
  const response = await handler(
    new Request(
      "https://api.example.invalid/functions/v1/drs-line-review-notification-dispatch",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "{}",
      },
    ),
  );
  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), { state: "temporarily_unavailable" });
  assert.equal(lineCalls, 0);
});

test("dispatch durably rejects a claimed payload outside the Edge contract", async () => {
  const { createReviewNotificationDispatchHandler } = await import(
    new URL("dispatch.ts", shared).href
  );
  let completionInput;
  let lineCalls = 0;
  const handler = createReviewNotificationDispatchHandler({
    env: { get: () => undefined },
    repository: {
      async invoke(name, input) {
        if (name === "drs_line_review_notification_claim_v1") {
          return {
            claimed: true,
            state: "CLAIMED",
            outbox_id: "00000000-0000-4000-8000-000000000031",
            claim_token: "00000000-0000-4000-8000-000000000032",
            retry_key: "00000000-0000-4000-8000-000000000033",
            provider_channel_digest: "A".repeat(43),
            line_group_digest: "B".repeat(43),
            line_group_ciphertext: "C".repeat(32),
            line_group_iv: "D".repeat(16),
            encryption_key_version: "local-v1",
            message_text: "😀".repeat(3000),
          };
        }
        if (name === "drs_line_review_notification_complete_v1") {
          completionInput = input;
          return { ok: true, state: "FAILED" };
        }
        throw new Error("unexpected RPC");
      },
    },
    lineClient: {
      async pushText() {
        lineCalls += 1;
        throw new Error("must not call provider");
      },
    },
    encryptionKey: {},
    authorizeService: () => true,
  });
  const response = await handler(
    new Request(
      "https://api.example.invalid/functions/v1/drs-line-review-notification-dispatch",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "{}",
      },
    ),
  );
  assert.equal(response.status, 502);
  assert.deepEqual(await response.json(), { state: "claim_rejected" });
  assert.equal(lineCalls, 0);
  assert.equal(
    completionInput.outbox_id,
    "00000000-0000-4000-8000-000000000031",
  );
  assert.equal(
    completionInput.claim_token,
    "00000000-0000-4000-8000-000000000032",
  );
  assert.equal(completionInput.outcome, "permanent_failure");
  assert.equal(completionInput.reason_code, "INVALID_CLAIM_CONTRACT");
});
