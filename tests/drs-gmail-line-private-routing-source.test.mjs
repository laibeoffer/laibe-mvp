import assert from "node:assert/strict";
import { createHmac, webcrypto } from "node:crypto";
import { existsSync } from "node:fs";
import test from "node:test";

const contractsUrl = new URL(
  "../supabase/functions/_shared/drs-line-account-link/contracts.ts",
  import.meta.url,
);
const validationUrl = new URL(
  "../supabase/functions/_shared/drs-line-account-link/validation.ts",
  import.meta.url,
);
const cryptoUrl = new URL(
  "../supabase/functions/_shared/drs-line-account-link/crypto.ts",
  import.meta.url,
);
const signatureUrl = new URL(
  "../supabase/functions/_shared/drs-line-account-link/signature.ts",
  import.meta.url,
);
const lineClientUrl = new URL(
  "../supabase/functions/_shared/drs-line-account-link/line-client.ts",
  import.meta.url,
);
const migrationUrl = new URL(
  "../supabase/migrations/20260831050535_drs_gmail_line_private_routing_w1.sql",
  import.meta.url,
);
const linePortsUrl = new URL(
  "../supabase/functions/_shared/drs-line-account-link/ports.ts",
  import.meta.url,
);
const lineServiceUrl = new URL(
  "../supabase/functions/_shared/drs-line-account-link/service.ts",
  import.meta.url,
);
const lineHttpUrl = new URL(
  "../supabase/functions/_shared/drs-line-account-link/http.ts",
  import.meta.url,
);
const lineWebhookUrl = new URL(
  "../supabase/functions/_shared/drs-line-account-link/webhook.ts",
  import.meta.url,
);
const lineNotificationUrl = new URL(
  "../supabase/functions/_shared/drs-line-account-link/notification.ts",
  import.meta.url,
);

const AUTHORITY = Object.freeze({
  authenticatedUserId: "00000000-0000-4000-8000-000000000001",
  specialistId: "00000000-0000-4000-8000-000000000002",
  authorizationSubject: "drs-specialist:00000000-0000-4000-8000-000000000002",
  selectedCaseId: "00000000-0000-4000-8000-000000000003",
  caseStatus: "active",
  accessMode: "read_only",
  proofExpiresAt: "2026-08-31T12:01:00.000Z",
});

const LINE_USER_ID = "U0123456789abcdef0123456789abcdef";
const WEBHOOK_EVENT_ID = "01HZZZZZZZZZZZZZZZZZZZZZZZ";
const REPLY_TOKEN = "reply-token-without-real-provider-data";

function accountLinkEvent(overrides = {}) {
  return {
    type: "accountLink",
    mode: "active",
    timestamp: 1788148800000,
    source: { type: "user", userId: LINE_USER_ID },
    webhookEventId: WEBHOOK_EVENT_ID,
    deliveryContext: { isRedelivery: false },
    replyToken: REPLY_TOKEN,
    link: { result: "ok", nonce: "single-use-protocol-value" },
    ...overrides,
  };
}

function textBindingEvent(overrides = {}) {
  return {
    type: "message",
    mode: "active",
    timestamp: 1788148800000,
    source: { type: "user", userId: LINE_USER_ID },
    webhookEventId: WEBHOOK_EVENT_ID,
    deliveryContext: { isRedelivery: false },
    replyToken: REPLY_TOKEN,
    message: {
      id: "555001",
      type: "text",
      quoteToken: "quote-token-without-real-provider-data",
      text: "綁定 LINE 案件通知",
    },
    ...overrides,
  };
}

function textUnlinkEvent(overrides = {}) {
  return textBindingEvent({
    webhookEventId: "01HXXXXXXXXXXXXXXXXXXXXXXX",
    message: {
      id: "555002",
      type: "text",
      text: "解除 LINE 案件通知",
    },
    ...overrides,
  });
}

test("closed browser contract exposes exactly the twelve approved states", async () => {
  const { LINE_LINK_STATES } = await import(contractsUrl.href);

  assert.deepEqual(LINE_LINK_STATES, [
    "not_linked",
    "awaiting_line_confirmation",
    "linked",
    "expired",
    "cancelled",
    "conflict_line_already_bound",
    "conflict_drs_already_bound",
    "permission_denied",
    "specialist_inactive",
    "temporarily_unavailable",
    "unlinking",
    "revoked",
  ]);
  assert.equal(Object.isFrozen(LINE_LINK_STATES), true);
});

test("private LINE routing migration uses the CLI-issued immutable path", () => {
  assert.equal(existsSync(migrationUrl), true);
});

test("pending status projects only browser-safe fields and is immutable", async () => {
  const { sanitizeLineLinkStatus } = await import(validationUrl.href);

  const status = sanitizeLineLinkStatus({
    state: "awaiting_line_confirmation",
    expires_at: "2026-08-31T12:00:00.000Z",
    next_action: "continue_in_line",
    bot_launch_url: "https://line.me/R/ti/p/@953vqegd",
  });

  assert.deepEqual(status, {
    state: "awaiting_line_confirmation",
    expiresAt: "2026-08-31T12:00:00.000Z",
    nextAction: "continue_in_line",
    botLaunchUrl: "https://line.me/R/ti/p/@953vqegd",
  });
  assert.equal(Object.isFrozen(status), true);
});

test("malformed, over-broad, inherited, or authority-shaped status fails closed", async () => {
  const { sanitizeLineLinkStatus } = await import(validationUrl.href);
  const fallback = { state: "temporarily_unavailable", nextAction: "retry" };

  assert.deepEqual(
    sanitizeLineLinkStatus({ state: "linked", linked_at: "not-a-time" }),
    fallback,
  );
  assert.deepEqual(
    sanitizeLineLinkStatus({
      state: "not_linked",
      specialist_id: "00000000-0000-4000-8000-000000000001",
    }),
    fallback,
  );
  assert.deepEqual(
    sanitizeLineLinkStatus({ state: "not_linked", role: "highest_reviewer" }),
    fallback,
  );
  assert.deepEqual(
    sanitizeLineLinkStatus(Object.create({ state: "linked" })),
    fallback,
  );
  assert.deepEqual(
    sanitizeLineLinkStatus({
      state: "awaiting_line_confirmation",
      expires_at: "2026-08-31T12:00:00.000Z",
      next_action: "continue_in_line",
      bot_launch_url: "javascript:alert(1)",
    }),
    fallback,
  );
});

test("accountLink validator accepts the exact signed-provider event shape", async () => {
  const { readAccountLinkEvent } = await import(validationUrl.href);

  assert.deepEqual(readAccountLinkEvent(accountLinkEvent()), {
    kind: "account_link",
    webhookEventId: WEBHOOK_EVENT_ID,
    replyToken: REPLY_TOKEN,
    lineUserId: LINE_USER_ID,
    nonce: "single-use-protocol-value",
    result: "ok",
    timestamp: 1788148800000,
    isRedelivery: false,
  });
});

test("accountLink validator rejects extra keys, group sources, and malformed protocol data", async () => {
  const { readAccountLinkEvent } = await import(validationUrl.href);

  assert.equal(
    readAccountLinkEvent(accountLinkEvent({ role: "highest_reviewer" })),
    null,
  );
  assert.equal(
    readAccountLinkEvent(accountLinkEvent({
      source: { type: "group", groupId: "C0123456789" },
    })),
    null,
  );
  assert.equal(
    readAccountLinkEvent(accountLinkEvent({
      link: { result: "ok", nonce: "" },
    })),
    null,
  );
  assert.equal(
    readAccountLinkEvent(accountLinkEvent({ webhookEventId: "bad id" })),
    null,
  );
});

test("webhook envelope admits only exact private-user binding actions and account links", async () => {
  const { readLineWebhookEnvelope } = await import(validationUrl.href);
  const envelope = readLineWebhookEnvelope({
    destination: LINE_USER_ID,
    events: [
      textBindingEvent(),
      accountLinkEvent({
        webhookEventId: "01HYYYYYYYYYYYYYYYYYYYYYYY",
      }),
    ],
  });

  assert.deepEqual(envelope, {
    destination: LINE_USER_ID,
    events: [
      {
        kind: "binding_action",
        webhookEventId: WEBHOOK_EVENT_ID,
        replyToken: REPLY_TOKEN,
        lineUserId: LINE_USER_ID,
        timestamp: 1788148800000,
        isRedelivery: false,
      },
      {
        kind: "account_link",
        webhookEventId: "01HYYYYYYYYYYYYYYYYYYYYYYY",
        replyToken: REPLY_TOKEN,
        lineUserId: LINE_USER_ID,
        nonce: "single-use-protocol-value",
        result: "ok",
        timestamp: 1788148800000,
        isRedelivery: false,
      },
    ],
  });
  assert.equal(Object.isFrozen(envelope), true);
  assert.equal(Object.isFrozen(envelope.events), true);
});

test("webhook envelope rejects unknown actions, oversized batches, and prototype authority", async () => {
  const { readLineWebhookEnvelope } = await import(validationUrl.href);

  assert.equal(
    readLineWebhookEnvelope({
      destination: LINE_USER_ID,
      events: [textBindingEvent({
        message: { id: "555001", type: "text", text: "DRS真人測試" },
      })],
    }),
    null,
  );
  assert.equal(
    readLineWebhookEnvelope({
      destination: LINE_USER_ID,
      events: Array.from({ length: 21 }, () => textBindingEvent()),
    }),
    null,
  );
  const inherited = Object.create({
    destination: LINE_USER_ID,
    events: [textBindingEvent()],
  });
  assert.equal(readLineWebhookEnvelope(inherited), null);
});

test("LINE signature verification uses exact raw bytes and strict canonical Base64", async () => {
  const { verifyLineSignature } = await import(signatureUrl.href);
  const key = "unit-test-hmac-key-with-no-provider-value";
  const raw = new TextEncoder().encode('{"events":[]}');
  const signature = createHmac("sha256", key).update(raw).digest("base64");

  assert.equal(await verifyLineSignature(raw, signature, key), true);
  assert.equal(
    await verifyLineSignature(
      new TextEncoder().encode('{ "events":[] }'),
      signature,
      key,
    ),
    false,
  );
  assert.equal(await verifyLineSignature(raw, `${signature}\n`, key), false);
  assert.equal(
    await verifyLineSignature(raw, signature.replace(/=+$/u, ""), key),
    false,
  );
  assert.equal(
    await verifyLineSignature(raw, `${signature.slice(0, -1)}!`, key),
    false,
  );
  assert.equal(await verifyLineSignature(raw, null, key), false);
});

test("protocol values, identity digests, and AES-GCM envelopes are cryptographically bounded", async () => {
  const {
    base64UrlDecode,
    base64UrlEncode,
    decryptLineUserId,
    encryptLineUserId,
    hmacIdentityDigest,
    randomProtocolValue,
  } = await import(cryptoUrl.href);

  const first = randomProtocolValue();
  const second = randomProtocolValue();
  assert.equal(first.byteLength, 32);
  assert.equal(second.byteLength, 32);
  assert.notDeepEqual(first, second);
  assert.throws(() => randomProtocolValue(15), /invalid_protocol_size/u);
  assert.deepEqual(base64UrlDecode(base64UrlEncode(first)), first);

  const digestA = await hmacIdentityDigest(
    "unit-test-identity-key",
    LINE_USER_ID,
  );
  const digestB = await hmacIdentityDigest(
    "unit-test-identity-key",
    LINE_USER_ID,
  );
  const digestOther = await hmacIdentityDigest(
    "unit-test-identity-key",
    "Uffffffffffffffffffffffffffffffff",
  );
  assert.equal(digestA, digestB);
  assert.notEqual(digestA, digestOther);
  assert.match(digestA, /^[A-Za-z0-9_-]{43}$/u);

  const encryptionKey = await webcrypto.subtle.generateKey(
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
  const envelope = await encryptLineUserId(encryptionKey, LINE_USER_ID);
  assert.deepEqual(Object.keys(envelope).sort(), ["ciphertext", "iv"]);
  assert.equal(Object.isFrozen(envelope), true);
  assert.equal(await decryptLineUserId(encryptionKey, envelope), LINE_USER_ID);
  const tampered = {
    ...envelope,
    ciphertext: `${envelope.ciphertext.slice(0, -1)}${
      envelope.ciphertext.endsWith("A") ? "B" : "A"
    }`,
  };
  await assert.rejects(() => decryptLineUserId(encryptionKey, tampered));
  await assert.rejects(() =>
    decryptLineUserId(encryptionKey, { ...envelope, iv: `${envelope.iv}=` })
  );
});

test("LINE client pins official endpoints and emits only approved request bodies", async () => {
  const { createLineClient } = await import(lineClientUrl.href);
  const calls = [];
  const responses = [
    new Response(JSON.stringify({ linkToken: "one-time-link-value" }), {
      status: 200,
      headers: {
        "content-type": "application/json",
        "x-line-request-id": "req-1",
      },
    }),
    new Response("{}", {
      status: 200,
      headers: {
        "content-type": "application/json",
        "x-line-request-id": "req-2",
      },
    }),
    new Response("{}", {
      status: 200,
      headers: {
        "content-type": "application/json",
        "x-line-request-id": "req-3",
      },
    }),
  ];
  const client = createLineClient({
    accessToken: "not-a-provider-credential",
    fetch: async (input, init) => {
      calls.push({ input: String(input), init });
      return responses.shift();
    },
  });

  assert.equal(
    await client.issueLinkToken(LINE_USER_ID),
    "one-time-link-value",
  );
  assert.deepEqual(
    await client.pushAccountLink(
      LINE_USER_ID,
      "https://laibe.example/drs/line/continue?protocol=opaque",
      "00000000-0000-4000-8000-000000000098",
    ),
    { requestId: "req-2" },
  );
  assert.deepEqual(
    await client.pushCaseNotification(
      LINE_USER_ID,
      {
        caseLabel: "案件 DRS-042",
        caseStatus: "等待一般審查員確認",
        nextAction: "請開啟 DRS 收件匣檢視",
        caseUrl: "https://laibe.example/drs/cases/current",
      },
      "00000000-0000-4000-8000-000000000099",
    ),
    { requestId: "req-3" },
  );

  assert.deepEqual(calls.map(({ input }) => input), [
    `https://api.line.me/v2/bot/user/${LINE_USER_ID}/linkToken`,
    "https://api.line.me/v2/bot/message/push",
    "https://api.line.me/v2/bot/message/push",
  ]);
  assert.equal(calls.every(({ init }) => init.method === "POST"), true);
  assert.equal(calls[0].init.body, undefined);
  assert.deepEqual(JSON.parse(calls[1].init.body), {
    to: LINE_USER_ID,
    messages: [{
      type: "template",
      altText: "確認綁定 LINE 案件通知",
      template: {
        type: "buttons",
        text: "請完成 LINE 案件通知綁定",
        actions: [{
          type: "uri",
          label: "繼續綁定",
          uri: "https://laibe.example/drs/line/continue?protocol=opaque",
        }],
      },
    }],
  });
  assert.equal(
    calls[1].init.headers["x-line-retry-key"],
    "00000000-0000-4000-8000-000000000098",
  );
  assert.deepEqual(JSON.parse(calls[2].init.body), {
    to: LINE_USER_ID,
    messages: [{
      type: "text",
      text: [
        "萊比案件通知",
        "案件 DRS-042",
        "目前狀態：等待一般審查員確認",
        "下一步：請開啟 DRS 收件匣檢視",
        "https://laibe.example/drs/cases/current",
      ].join("\n"),
    }],
  });
  assert.equal(
    calls[2].init.headers["x-line-retry-key"],
    "00000000-0000-4000-8000-000000000099",
  );
});

test("LINE client fails closed with sanitized errors and bounded provider responses", async () => {
  const { createLineClient, LineProviderError } = await import(
    lineClientUrl.href
  );
  const failed = createLineClient({
    accessToken: "not-a-provider-credential",
    fetch: async () =>
      new Response("provider body must never escape", { status: 503 }),
  });
  await assert.rejects(
    () => failed.issueLinkToken(LINE_USER_ID),
    (error) => {
      assert.equal(error instanceof LineProviderError, true);
      assert.equal(error.code, "provider_unavailable");
      assert.equal(error.statusClass, "5xx");
      assert.doesNotMatch(error.message, /provider body must never escape/u);
      return true;
    },
  );

  const oversized = createLineClient({
    accessToken: "not-a-provider-credential",
    fetch: async () =>
      new Response(`{"linkToken":"${"x".repeat(40_000)}"}`, {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
  });
  await assert.rejects(
    () => oversized.issueLinkToken(LINE_USER_ID),
    (error) => {
      assert.equal(error instanceof LineProviderError, true);
      assert.equal(error.code, "provider_invalid_response");
      return true;
    },
  );
});

test("LINE account-link prompt uses one stable push retry key across webhook recovery", async () => {
  const { createLineClient } = await import(lineClientUrl.href);
  const calls = [];
  const retryKey = "00000000-0000-4000-8000-000000000099";
  const client = createLineClient({
    accessToken: "not-a-provider-credential",
    fetch: async (url, init) => {
      calls.push({ url, init });
      return new Response("{}", {
        status: 409,
        headers: { "x-line-accepted-request-id": "accepted-on-first-attempt" },
      });
    },
  });
  assert.deepEqual(
    await client.pushAccountLink(
      LINE_USER_ID,
      "https://laibe.example/drs/line-account-link?linkToken=opaque",
      retryKey,
    ),
    { requestId: "accepted-on-first-attempt" },
  );
  assert.equal(calls[0].url, "https://api.line.me/v2/bot/message/push");
  assert.equal(calls[0].init.headers["x-line-retry-key"], retryKey);
  const body = JSON.parse(calls[0].init.body);
  assert.equal(body.to, LINE_USER_ID);
  assert.equal(
    body.messages[0].template.actions[0].uri.includes("linkToken=opaque"),
    true,
  );
});

test("LINE case notification preserves accepted truth across stable retry recovery", async () => {
  const { createLineClient } = await import(lineClientUrl.href);
  const calls = [];
  const retryKey = "00000000-0000-4000-8000-000000000097";
  const client = createLineClient({
    accessToken: "not-a-provider-credential",
    fetch: async (url, init) => {
      calls.push({ url, init });
      return new Response("{}", {
        status: 409,
        headers: {
          "x-line-accepted-request-id": "accepted-case-on-first-attempt",
        },
      });
    },
  });

  assert.deepEqual(
    await client.pushCaseNotification(
      LINE_USER_ID,
      {
        caseLabel: "案件 DRS-042",
        caseStatus: "等待一般審查員確認",
        nextAction: "請開啟 DRS 收件匣檢視",
        caseUrl: "https://laibe.example/drs/cases/current",
      },
      retryKey,
    ),
    { requestId: "accepted-case-on-first-attempt" },
  );
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, "https://api.line.me/v2/bot/message/push");
  assert.equal(calls[0].init.headers["x-line-retry-key"], retryKey);
});

test("LINE client rejects inherited notification authority before any provider call", async () => {
  const { createLineClient, LineProviderError } = await import(
    lineClientUrl.href
  );
  let providerCalled = false;
  const client = createLineClient({
    accessToken: "not-a-provider-credential",
    fetch: async () => {
      providerCalled = true;
      return new Response("{}", { status: 200 });
    },
  });
  const inherited = Object.assign(
    Object.create({ role: "highest_reviewer" }),
    {
      caseLabel: "案件 DRS-042",
      caseStatus: "等待一般審查員確認",
      nextAction: "請開啟 DRS 收件匣檢視",
      caseUrl: "https://laibe.example/drs/cases/current",
    },
  );

  await assert.rejects(
    () => client.pushCaseNotification(LINE_USER_ID, inherited),
    (error) =>
      error instanceof LineProviderError &&
      error.code === "provider_invalid_request",
  );
  assert.equal(providerCalled, false);
});

test("account-link service sends only server-derived authority to its repository", async () => {
  const { createLineAccountLinkService } = await import(lineServiceUrl.href);
  const calls = [];
  const repository = {
    async startIntent(authority) {
      calls.push({ operation: "start", authority });
      return {
        state: "awaiting_line_confirmation",
        expires_at: "2026-08-31T12:10:00.000Z",
        next_action: "continue_in_line",
        bot_launch_url: "https://line.me/R/ti/p/@953vqegd",
      };
    },
    async readStatus(authority) {
      calls.push({ operation: "status", authority });
      return { state: "not_linked" };
    },
    async cancelIntent(authority) {
      calls.push({ operation: "cancel", authority });
      return { state: "cancelled", next_action: "relink" };
    },
    async prepareNonce() {
      throw new Error("not used");
    },
    async unlink(authority) {
      calls.push({ operation: "unlink", authority });
      return {
        state: "revoked",
        revoked_at: "2026-08-31T12:00:00.000Z",
        next_action: "relink",
      };
    },
  };
  const service = createLineAccountLinkService({
    repository,
    identityHmacKey: "unit-test-identity-key",
  });

  assert.deepEqual(await service.start(AUTHORITY), {
    state: "awaiting_line_confirmation",
    expiresAt: "2026-08-31T12:10:00.000Z",
    nextAction: "continue_in_line",
    botLaunchUrl: "https://line.me/R/ti/p/@953vqegd",
  });
  assert.deepEqual(await service.status(AUTHORITY), {
    state: "not_linked",
    nextAction: "relink",
  });
  assert.deepEqual(await service.cancel(AUTHORITY), {
    state: "cancelled",
    nextAction: "relink",
  });
  assert.deepEqual(await service.unlink(AUTHORITY), {
    state: "revoked",
    revokedAt: "2026-08-31T12:00:00.000Z",
    nextAction: "relink",
  });
  assert.deepEqual(calls.map(({ operation }) => operation), [
    "start",
    "status",
    "cancel",
    "unlink",
  ]);
  for (const { authority } of calls) {
    assert.deepEqual(Object.keys(authority).sort(), [
      "authenticatedUserId",
      "authorizationSubject",
      "selectedCaseId",
      "specialistId",
    ]);
    assert.equal("assignmentId" in authority, false);
    assert.equal("role" in authority, false);
  }
});

test("start handler accepts only same-origin exact-empty requests and returns safe DTO", async () => {
  const { createLineLinkStartHandler } = await import(lineHttpUrl.href);
  let startCalls = 0;
  const handler = createLineLinkStartHandler({
    allowedOrigin: "https://laibe.example",
    guard: {
      async authorize() {
        return AUTHORITY;
      },
    },
    service: {
      async start() {
        startCalls += 1;
        return Object.freeze({
          state: "awaiting_line_confirmation",
          expiresAt: "2026-08-31T12:10:00.000Z",
          nextAction: "continue_in_line",
          botLaunchUrl: "https://line.me/R/ti/p/@953vqegd",
        });
      },
    },
  });

  const accepted = await handler(
    new Request(
      "https://edge.example/functions/v1/drs-line-account-link-start",
      {
        method: "POST",
        headers: {
          origin: "https://laibe.example",
          "content-type": "application/json",
        },
        body: "{}",
      },
    ),
  );
  assert.equal(accepted.status, 200);
  assert.deepEqual(await accepted.json(), {
    state: "awaiting_line_confirmation",
    expiresAt: "2026-08-31T12:10:00.000Z",
    nextAction: "continue_in_line",
    botLaunchUrl: "https://line.me/R/ti/p/@953vqegd",
  });
  assert.equal(accepted.headers.get("cache-control"), "no-store");
  assert.equal(startCalls, 1);

  for (
    const request of [
      new Request(
        "https://edge.example/functions/v1/drs-line-account-link-start",
        {
          method: "POST",
          headers: {
            origin: "https://laibe.example",
            "content-type": "application/json",
          },
          body: '{"specialistId":"00000000-0000-4000-8000-000000000002"}',
        },
      ),
      new Request(
        "https://edge.example/functions/v1/drs-line-account-link-start?caseId=x",
        {
          method: "POST",
          headers: {
            origin: "https://laibe.example",
            "content-type": "application/json",
          },
          body: "{}",
        },
      ),
      new Request(
        "https://edge.example/functions/v1/drs-line-account-link-start",
        {
          method: "POST",
          headers: {
            origin: "https://attacker.example",
            "content-type": "application/json",
          },
          body: "{}",
        },
      ),
    ]
  ) {
    const rejected = await handler(request);
    assert.equal([400, 403].includes(rejected.status), true);
  }
  assert.equal(startCalls, 1);
});

test("status cancel and unlink handlers preserve operation-specific methods", async () => {
  const {
    createLineLinkCancelHandler,
    createLineLinkStatusHandler,
    createLineLinkUnlinkHandler,
  } = await import(lineHttpUrl.href);
  const operations = [];
  const dependencies = {
    allowedOrigin: "https://laibe.example",
    guard: {
      async authorize() {
        return AUTHORITY;
      },
    },
    service: {
      async status() {
        operations.push("status");
        return Object.freeze({ state: "not_linked", nextAction: "relink" });
      },
      async cancel() {
        operations.push("cancel");
        return Object.freeze({ state: "cancelled", nextAction: "relink" });
      },
      async unlink() {
        operations.push("unlink");
        return Object.freeze({
          state: "revoked",
          revokedAt: "2026-08-31T12:00:00.000Z",
          nextAction: "relink",
        });
      },
    },
  };
  const statusResponse = await createLineLinkStatusHandler(dependencies)(
    new Request(
      "https://edge.example/functions/v1/drs-line-account-link-status",
      {
        headers: {
          origin: "https://laibe.example",
          "sec-fetch-site": "same-origin",
        },
      },
    ),
  );
  assert.equal(statusResponse.status, 200);
  const cancelResponse = await createLineLinkCancelHandler(dependencies)(
    new Request(
      "https://edge.example/functions/v1/drs-line-account-link-cancel",
      {
        method: "POST",
        headers: {
          origin: "https://laibe.example",
          "content-type": "application/json",
        },
        body: "{}",
      },
    ),
  );
  assert.equal(cancelResponse.status, 200);
  const unlinkResponse = await createLineLinkUnlinkHandler(dependencies)(
    new Request(
      "https://edge.example/functions/v1/drs-line-account-link-unlink",
      {
        method: "POST",
        headers: {
          origin: "https://laibe.example",
          "content-type": "application/json",
        },
        body: "{}",
      },
    ),
  );
  assert.equal(unlinkResponse.status, 200);
  assert.deepEqual(operations, ["status", "cancel", "unlink"]);
});

test("focused RED: status GET accepts same-origin browser metadata without Origin and keeps every auth and POST boundary closed", async () => {
  const {
    createLineLinkCancelHandler,
    createLineLinkContinueHandler,
    createLineLinkStartHandler,
    createLineLinkStatusHandler,
    createLineLinkUnlinkHandler,
  } = await import(lineHttpUrl.href);
  const { DrsIdentityError } = await import(
    new URL(
      "../supabase/functions/_shared/drs-auth/contracts.ts",
      import.meta.url,
    ).href
  );
  const allowedOrigin = "https://laibe.example";
  const authorization = "Bearer browser.proof.value";
  const cookie = "__Host-laibe-drs-session=opaque-session-cookie";
  let guardCalls = 0;
  let statusCalls = 0;
  const handler = createLineLinkStatusHandler({
    allowedOrigin,
    guard: {
      authorize(request) {
        guardCalls += 1;
        assert.equal(request.headers.get("origin"), allowedOrigin);
        assert.equal(request.headers.get("sec-fetch-site"), "same-origin");
        if (
          request.headers.get("authorization") !== authorization ||
          request.headers.get("cookie") !== cookie
        ) {
          throw new DrsIdentityError("AUTH_REQUIRED", 401);
        }
        return AUTHORITY;
      },
    },
    service: {
      status() {
        statusCalls += 1;
        return Object.freeze({ state: "not_linked", nextAction: "relink" });
      },
    },
  });

  const accepted = await handler(
    new Request(
      "https://edge.example/functions/v1/drs-line-account-link-status",
      {
        headers: {
          authorization,
          cookie,
          referer: `${allowedOrigin}/pcm/reviewer/access/`,
          "sec-fetch-site": "same-origin",
        },
      },
    ),
  );
  assert.equal(accepted.status, 200);
  assert.deepEqual(await accepted.json(), {
    state: "not_linked",
    nextAction: "relink",
  });
  assert.equal(guardCalls, 1);
  assert.equal(statusCalls, 1);

  for (
    const headers of [
      {
        authorization,
        cookie,
        origin: "https://attacker.example",
        "sec-fetch-site": "same-origin",
      },
      {
        authorization,
        cookie,
        origin: allowedOrigin,
        "sec-fetch-site": "cross-site",
      },
      {
        authorization,
        cookie,
        "sec-fetch-site": "cross-site",
      },
    ]
  ) {
    const rejected = await handler(
      new Request(
        "https://edge.example/functions/v1/drs-line-account-link-status",
        { headers },
      ),
    );
    assert.equal(rejected.status, 403);
  }
  assert.equal(guardCalls, 1);
  assert.equal(statusCalls, 1);

  for (
    const rejectedAuthorization of [undefined, "Bearer invalid-proof"]
  ) {
    const headers = {
      cookie,
      "sec-fetch-site": "same-origin",
    };
    if (rejectedAuthorization !== undefined) {
      headers.authorization = rejectedAuthorization;
    }
    const rejected = await handler(
      new Request(
        "https://edge.example/functions/v1/drs-line-account-link-status",
        { headers },
      ),
    );
    assert.equal(rejected.status, 401);
  }
  assert.equal(guardCalls, 3);
  assert.equal(statusCalls, 1);

  const postDependencies = {
    allowedOrigin,
    guard: {
      authorize() {
        throw new Error("POST without Origin must fail before authorization");
      },
    },
    service: {
      start() {
        throw new Error("must not run");
      },
      cancel() {
        throw new Error("must not run");
      },
      unlink() {
        throw new Error("must not run");
      },
      continueLink() {
        throw new Error("must not run");
      },
    },
  };
  for (
    const [postHandler, pathname] of [
      [
        createLineLinkStartHandler(postDependencies),
        "/functions/v1/drs-line-account-link-start",
      ],
      [
        createLineLinkCancelHandler(postDependencies),
        "/functions/v1/drs-line-account-link-cancel",
      ],
      [
        createLineLinkUnlinkHandler(postDependencies),
        "/functions/v1/drs-line-account-link-unlink",
      ],
      [
        createLineLinkContinueHandler(postDependencies),
        "/functions/v1/drs-line-account-link-continue?linkToken=opaque",
      ],
    ]
  ) {
    const rejected = await postHandler(
      new Request(`https://edge.example${pathname}`, {
        method: "POST",
        headers: {
          authorization,
          cookie,
          "content-type": "application/json",
          "sec-fetch-site": "same-origin",
        },
        body: "{}",
      }),
    );
    assert.equal(rejected.status, 403);
  }
});

test("handler converts missing Gmail-backed DRS authority to permission_denied", async () => {
  const { createLineLinkStatusHandler } = await import(lineHttpUrl.href);
  const { DrsIdentityError } = await import(
    new URL(
      "../supabase/functions/_shared/drs-auth/contracts.ts",
      import.meta.url,
    ).href
  );
  const handler = createLineLinkStatusHandler({
    allowedOrigin: "https://laibe.example",
    guard: {
      async authorize() {
        throw new DrsIdentityError("AUTH_REQUIRED", 401);
      },
    },
    service: {
      async status() {
        throw new Error("must not run");
      },
    },
  });
  const response = await handler(
    new Request(
      "https://edge.example/functions/v1/drs-line-account-link-status",
      {
        headers: {
          origin: "https://laibe.example",
          "sec-fetch-site": "same-origin",
        },
      },
    ),
  );
  assert.equal(response.status, 401);
  assert.deepEqual(await response.json(), { state: "permission_denied" });
});

test("continue creates a one-time nonce digest and only redirects to LINE accountLink", async () => {
  const { createLineAccountLinkService } = await import(lineServiceUrl.href);
  const { createLineLinkContinueHandler } = await import(lineHttpUrl.href);
  const prepared = [];
  const service = createLineAccountLinkService({
    repository: {
      async startIntent() {
        throw new Error("not used");
      },
      async readStatus() {
        throw new Error("not used");
      },
      async cancelIntent() {
        throw new Error("not used");
      },
      async unlink() {
        throw new Error("not used");
      },
      async prepareNonce(input) {
        prepared.push(input);
        return { accepted: true, state: "awaiting_line_confirmation" };
      },
    },
    identityHmacKey: "unit-test-identity-key",
    now: () => new Date("2026-08-31T12:00:00.000Z"),
    randomBytes: () => new Uint8Array(32).fill(7),
  });
  const handler = createLineLinkContinueHandler({
    allowedOrigin: "https://laibe.example",
    guard: {
      async authorize() {
        return AUTHORITY;
      },
    },
    service,
  });
  const response = await handler(
    new Request(
      "https://edge.example/functions/v1/drs-line-account-link-continue?linkToken=one-time-provider-value",
      {
        method: "POST",
        headers: {
          origin: "https://laibe.example",
          "content-type": "application/json",
        },
        body: "{}",
        redirect: "manual",
      },
    ),
  );
  assert.equal(response.status, 303);
  const location = new URL(response.headers.get("location"));
  assert.equal(location.origin, "https://access.line.me");
  assert.equal(location.pathname, "/dialog/bot/accountLink");
  assert.equal(
    location.searchParams.get("linkToken"),
    "one-time-provider-value",
  );
  const nonce = location.searchParams.get("nonce");
  assert.match(nonce, /^[A-Za-z0-9_-]{43}$/u);
  assert.equal(response.headers.get("referrer-policy"), "no-referrer");
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.equal(prepared.length, 1);
  assert.equal(prepared[0].nonceDigest === nonce, false);
  assert.equal("nonce" in prepared[0], false);
  assert.equal("linkToken" in prepared[0], false);
  assert.deepEqual(Object.keys(prepared[0].authority).sort(), [
    "authenticatedUserId",
    "authorizationSubject",
    "selectedCaseId",
    "specialistId",
  ]);
});

test("default function entries expose custom-session handlers without deployment side effects", async () => {
  for (
    const [path, exportName] of [
      ["drs-line-account-link-start", "createLineLinkStartHandler"],
      ["drs-line-account-link-status", "createLineLinkStatusHandler"],
      ["drs-line-account-link-cancel", "createLineLinkCancelHandler"],
      ["drs-line-account-link-unlink", "createLineLinkUnlinkHandler"],
      ["drs-line-account-link-continue", "createLineLinkContinueHandler"],
    ]
  ) {
    const module = await import(
      new URL(
        `../supabase/functions/${path}/index.ts`,
        import.meta.url,
      ).href
    );
    assert.equal(module.VERIFY_JWT_REQUIRED, false);
    assert.equal(typeof module[exportName], "function");
    assert.equal(typeof module.handler, "function");
  }
  const { createSupabaseDrsLineAccountLinkRepository } = await import(
    linePortsUrl.href
  );
  assert.equal(typeof createSupabaseDrsLineAccountLinkRepository, "function");
});

async function webhookRequest(body, secret, signatureOverride) {
  const raw = JSON.stringify(body);
  const signature = signatureOverride ?? createHmac("sha256", secret)
    .update(raw).digest("base64");
  return new Request("https://edge.example/functions/v1/drs-line-webhook", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-line-signature": signature,
    },
    body: raw,
  });
}

async function testEncryptionKey() {
  return await webcrypto.subtle.importKey(
    "raw",
    new Uint8Array(32).fill(17),
    "AES-GCM",
    false,
    ["encrypt", "decrypt"],
  );
}

test("signed binding action durably claims before issuing the official link token", async () => {
  const { createLineWebhookHandler } = await import(lineWebhookUrl.href);
  const secret = "unit-test-channel-secret";
  const calls = [];
  const handler = createLineWebhookHandler({
    channelSecret: secret,
    identityHmacKey: "unit-test-identity-hmac-key",
    identityEncryptionKey: await testEncryptionKey(),
    identityEncryptionKeyVersion: "test-v1",
    publicOrigin: "https://laibe.example",
    repository: {
      async claimEvent(input) {
        calls.push({ operation: "claim", input });
        return {
          admission: "claimed",
          claimToken: "00000000-0000-4000-8000-000000000099",
          providerRetryKey: "00000000-0000-4000-8000-000000000097",
        };
      },
      async completeEvent(input) {
        calls.push({ operation: "complete", input });
        return { completed: true, safeOutcome: input.safeOutcome };
      },
      async completeAccountLink() {
        throw new Error("not used");
      },
    },
    lineClient: {
      async issueLinkToken(lineUserId) {
        calls.push({ operation: "issue", lineUserId });
        return "provider-link-token";
      },
      async pushAccountLink(lineUserId, linkingUrl, retryKey) {
        calls.push({
          operation: "push-link",
          lineUserId,
          linkingUrl,
          retryKey,
        });
        return { requestId: "safe-request-id" };
      },
      async pushCaseNotification() {
        throw new Error("not used");
      },
    },
  });
  const response = await handler(
    await webhookRequest({
      destination: LINE_USER_ID,
      events: [textBindingEvent()],
    }, secret),
  );
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {});
  assert.deepEqual(calls.map(({ operation }) => operation), [
    "claim",
    "issue",
    "push-link",
    "complete",
  ]);
  assert.match(calls[0].input.webhookEventDigest, /^[A-Za-z0-9_-]{43}$/u);
  assert.equal(JSON.stringify(calls[0]).includes(WEBHOOK_EVENT_ID), false);
  const link = new URL(calls[2].linkingUrl);
  assert.equal(link.origin, "https://laibe.example");
  assert.equal(link.pathname, "/drs/line-account-link");
  assert.equal(link.searchParams.get("linkToken"), "provider-link-token");
  assert.equal(calls[2].lineUserId, LINE_USER_ID);
  assert.equal(calls[2].retryKey, "00000000-0000-4000-8000-000000000097");
  assert.equal(calls[3].input.safeOutcome, "link_token_replied");
});

test("webhook verifies exact raw bytes before parsing or durable work", async () => {
  const { createLineWebhookHandler } = await import(lineWebhookUrl.href);
  let repositoryCalls = 0;
  const handler = createLineWebhookHandler({
    channelSecret: "unit-test-channel-secret",
    identityHmacKey: "unit-test-identity-hmac-key",
    identityEncryptionKey: await testEncryptionKey(),
    identityEncryptionKeyVersion: "test-v1",
    publicOrigin: "https://laibe.example",
    repository: {
      async claimEvent() {
        repositoryCalls += 1;
        throw new Error("must not run");
      },
      async completeEvent() {
        throw new Error("must not run");
      },
      async completeAccountLink() {
        throw new Error("must not run");
      },
    },
    lineClient: {
      async issueLinkToken() {
        throw new Error("must not run");
      },
      async replyAccountLink() {
        throw new Error("must not run");
      },
      async pushCaseNotification() {
        throw new Error("must not run");
      },
    },
  });
  const response = await handler(
    await webhookRequest(
      { destination: LINE_USER_ID, events: [textBindingEvent()] },
      "unit-test-channel-secret",
      "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=",
    ),
  );
  assert.equal(response.status, 401);
  assert.equal(repositoryCalls, 0);

  const oversized = await handler(
    new Request(
      "https://edge.example/functions/v1/drs-line-webhook",
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-line-signature": "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=",
        },
        body: "x".repeat(1_048_577),
      },
    ),
  );
  assert.equal(oversized.status, 413);
  assert.equal(repositoryCalls, 0);
});

test("signed accountLink atomically stores private identity and terminal webhook truth", async () => {
  const { createLineWebhookHandler } = await import(lineWebhookUrl.href);
  const secret = "unit-test-channel-secret";
  const completed = [];
  const rawNonce = "single-use-protocol-value";
  const handler = createLineWebhookHandler({
    channelSecret: secret,
    identityHmacKey: "unit-test-identity-hmac-key",
    identityEncryptionKey: await testEncryptionKey(),
    identityEncryptionKeyVersion: "test-v1",
    publicOrigin: "https://laibe.example",
    repository: {
      async claimEvent() {
        return {
          admission: "claimed",
          claimToken: "00000000-0000-4000-8000-000000000099",
          providerRetryKey: "00000000-0000-4000-8000-000000000097",
        };
      },
      async completeAccountLinkEvent(input) {
        completed.push({ operation: "link-event", input });
        return {
          completed: true,
          safeOutcome: "linked",
        };
      },
    },
    lineClient: {
      async issueLinkToken() {
        throw new Error("not used");
      },
      async replyAccountLink() {
        throw new Error("not used");
      },
      async pushCaseNotification() {
        throw new Error("not used");
      },
    },
  });
  const event = accountLinkEvent({ link: { result: "ok", nonce: rawNonce } });
  const response = await handler(
    await webhookRequest({
      destination: LINE_USER_ID,
      events: [event],
    }, secret),
  );
  assert.equal(response.status, 200);
  assert.deepEqual(completed.map(({ operation }) => operation), ["link-event"]);
  const linkInput = completed[0].input;
  assert.match(linkInput.nonceDigest, /^[A-Za-z0-9_-]{43}$/u);
  assert.match(linkInput.lineUserDigest, /^[A-Za-z0-9_-]{43}$/u);
  assert.match(linkInput.lineUserCiphertext, /^[A-Za-z0-9_-]{24,1024}$/u);
  assert.match(linkInput.lineUserIv, /^[A-Za-z0-9_-]{16}$/u);
  assert.equal(linkInput.encryptionKeyVersion, "test-v1");
  const serialized = JSON.stringify(linkInput);
  assert.equal(serialized.includes(rawNonce), false);
  assert.equal(serialized.includes(LINE_USER_ID), false);
  assert.match(linkInput.webhookEventDigest, /^[A-Za-z0-9_-]{43}$/u);
  assert.equal(
    linkInput.claimToken,
    "00000000-0000-4000-8000-000000000099",
  );
});

test("signed private LINE unlink revokes only its own binding and confirms idempotently", async () => {
  const { createLineWebhookHandler } = await import(lineWebhookUrl.href);
  const secret = "unit-test-channel-secret";
  const calls = [];
  const handler = createLineWebhookHandler({
    channelSecret: secret,
    identityHmacKey: "unit-test-identity-hmac-key",
    identityEncryptionKey: await testEncryptionKey(),
    identityEncryptionKeyVersion: "test-v1",
    publicOrigin: "https://laibe.example",
    repository: {
      async claimEvent(input) {
        calls.push({ operation: "claim", input });
        return {
          admission: "claimed",
          claimToken: "00000000-0000-4000-8000-000000000099",
          providerRetryKey: "00000000-0000-4000-8000-000000000097",
        };
      },
      async unlinkByLineIdentity(input) {
        calls.push({ operation: "unlink", input });
        return {
          state: "revoked",
          revoked_at: "2026-08-31T12:00:00.000Z",
          next_action: "relink",
        };
      },
      async completeEvent(input) {
        calls.push({ operation: "complete", input });
        return { completed: true, safeOutcome: input.safeOutcome };
      },
      async completeAccountLink() {
        throw new Error("not used");
      },
    },
    lineClient: {
      async issueLinkToken() {
        throw new Error("not used");
      },
      async pushUnlinkConfirmation(lineUserId, retryKey) {
        calls.push({ operation: "confirm", lineUserId, retryKey });
        return { requestId: "safe-request-id" };
      },
      async pushCaseNotification() {
        throw new Error("not used");
      },
    },
  });
  const response = await handler(
    await webhookRequest({
      destination: LINE_USER_ID,
      events: [textUnlinkEvent()],
    }, secret),
  );
  assert.equal(response.status, 200);
  assert.deepEqual(calls.map(({ operation }) => operation), [
    "claim",
    "unlink",
    "confirm",
    "complete",
  ]);
  assert.equal(calls[0].input.eventKind, "unlink_action");
  assert.match(calls[1].input.lineUserDigest, /^[A-Za-z0-9_-]{43}$/u);
  assert.equal(JSON.stringify(calls[1]).includes(LINE_USER_ID), false);
  assert.equal(calls[2].lineUserId, LINE_USER_ID);
  assert.equal(calls[2].retryKey, "00000000-0000-4000-8000-000000000097");
  assert.equal(calls[3].input.safeOutcome, "revoked");
});

test("completed redelivery is idempotent and retryable storage failure is non-2xx", async () => {
  const { createLineWebhookHandler } = await import(lineWebhookUrl.href);
  const secret = "unit-test-channel-secret";
  let providerCalls = 0;
  const base = {
    channelSecret: secret,
    identityHmacKey: "unit-test-identity-hmac-key",
    identityEncryptionKey: await testEncryptionKey(),
    identityEncryptionKeyVersion: "test-v1",
    publicOrigin: "https://laibe.example",
    lineClient: {
      async issueLinkToken() {
        providerCalls += 1;
        return "unused";
      },
      async replyAccountLink() {
        providerCalls += 1;
        return { requestId: null };
      },
      async pushCaseNotification() {
        throw new Error("not used");
      },
    },
  };
  const body = { destination: LINE_USER_ID, events: [textBindingEvent()] };
  const duplicate = createLineWebhookHandler({
    ...base,
    repository: {
      async claimEvent() {
        return {
          admission: "already_completed",
          safeOutcome: "link_token_replied",
        };
      },
      async completeEvent() {
        throw new Error("must not run");
      },
      async completeAccountLink() {
        throw new Error("must not run");
      },
    },
  });
  assert.equal(
    (await duplicate(await webhookRequest(body, secret))).status,
    200,
  );
  assert.equal(providerCalls, 0);

  const unavailable = createLineWebhookHandler({
    ...base,
    repository: {
      async claimEvent() {
        throw new Error("database unavailable");
      },
      async completeEvent() {
        throw new Error("must not run");
      },
      async completeAccountLink() {
        throw new Error("must not run");
      },
    },
  });
  assert.equal(
    (await unavailable(await webhookRequest(body, secret))).status,
    503,
  );
  assert.equal(providerCalls, 0);
});

test("canonical LINE webhook entry disables gateway JWT and remains import-safe", async () => {
  const module = await import(
    new URL(
      "../supabase/functions/drs-line-webhook/index.ts",
      import.meta.url,
    ).href
  );
  assert.equal(module.VERIFY_JWT_REQUIRED, false);
  assert.equal(typeof module.createLineWebhookHandler, "function");
  assert.equal(typeof module.handler, "function");
});

async function encryptedLineClaim(overrides = {}) {
  const { encryptLineUserId } = await import(cryptoUrl.href);
  const key = await testEncryptionKey();
  const envelope = await encryptLineUserId(key, LINE_USER_ID);
  return {
    key,
    claim: {
      admitted: true,
      outboxId: "00000000-0000-4000-8000-000000000099",
      claimToken: "00000000-0000-4000-8000-000000000098",
      bindingVersion: "17",
      lineUserCiphertext: envelope.ciphertext,
      lineUserIv: envelope.iv,
      encryptionKeyVersion: "test-v1",
      caseLabel: "案件 DRS-042",
      caseStatus: "等待一般審查員確認",
      nextAction: "請開啟 DRS 收件匣檢視",
      casePath: "/pcm/console/case?caseId=00000000-0000-4000-8000-000000000003",
      ...overrides,
    },
  };
}

test("private dispatcher decrypts only a claimed current binding and appends acceptance", async () => {
  const { createPrivateNotificationDispatcher } = await import(
    lineNotificationUrl.href
  );
  const { key, claim } = await encryptedLineClaim();
  const calls = [];
  const dispatcher = createPrivateNotificationDispatcher({
    repository: {
      async claimNext() {
        calls.push({ operation: "claim" });
        return claim;
      },
      async assertCurrent(input) {
        calls.push({ operation: "assert", input });
        return { current: true };
      },
      async complete(input) {
        calls.push({ operation: "complete", input });
        return { completed: true, state: "accepted" };
      },
    },
    lineClient: {
      async issueLinkToken() {
        throw new Error("not used");
      },
      async replyAccountLink() {
        throw new Error("not used");
      },
      async pushCaseNotification(lineUserId, message, retryKey) {
        calls.push({ operation: "push", lineUserId, message, retryKey });
        return { requestId: "safe-request-id" };
      },
    },
    identityEncryptionKey: key,
    identityEncryptionKeyVersion: "test-v1",
    publicOrigin: "https://laibe.example",
    clock: (() => {
      const values = [1000, 1354];
      return () => values.shift() ?? 1354;
    })(),
  });
  assert.deepEqual(await dispatcher(), { state: "accepted" });
  assert.deepEqual(calls.map(({ operation }) => operation), [
    "claim",
    "assert",
    "push",
    "complete",
  ]);
  assert.deepEqual(calls[1].input, {
    outboxId: claim.outboxId,
    claimToken: claim.claimToken,
  });
  assert.equal(calls[2].lineUserId, LINE_USER_ID);
  assert.equal(calls[2].retryKey, claim.outboxId);
  assert.deepEqual(calls[2].message, {
    caseLabel: claim.caseLabel,
    caseStatus: claim.caseStatus,
    nextAction: claim.nextAction,
    caseUrl: `https://laibe.example${claim.casePath}`,
  });
  assert.equal(calls[3].input.outcome, "accepted");
  assert.equal(calls[3].input.httpStatusClass, "2xx");
  assert.equal(calls[3].input.durationMs, 354);
  assert.equal(JSON.stringify(calls[3]).includes(LINE_USER_ID), false);
});

test("dispatcher never sends after key-version mismatch and bounds provider retries", async () => {
  const {
    createPrivateNotificationDispatcher,
  } = await import(lineNotificationUrl.href);
  const { LineProviderError } = await import(lineClientUrl.href);
  const { key, claim } = await encryptedLineClaim();
  const completions = [];
  let pushes = 0;
  const mismatch = createPrivateNotificationDispatcher({
    repository: {
      async claimNext() {
        return { ...claim, encryptionKeyVersion: "retired-v0" };
      },
      async complete(input) {
        completions.push(input);
        return { completed: true, state: "permanent_failure" };
      },
    },
    lineClient: {
      async issueLinkToken() {
        throw new Error("not used");
      },
      async replyAccountLink() {
        throw new Error("not used");
      },
      async pushCaseNotification() {
        pushes += 1;
        throw new Error("must not send");
      },
    },
    identityEncryptionKey: key,
    identityEncryptionKeyVersion: "test-v1",
    publicOrigin: "https://laibe.example",
  });
  assert.deepEqual(await mismatch(), { state: "permanent_failure" });
  assert.equal(pushes, 0);
  assert.equal(completions[0].reasonCode, "encryption_key_unavailable");

  const retrying = createPrivateNotificationDispatcher({
    repository: {
      async claimNext() {
        return claim;
      },
      async assertCurrent() {
        return { current: true };
      },
      async complete(input) {
        completions.push(input);
        return { completed: true, state: "retry" };
      },
    },
    lineClient: {
      async issueLinkToken() {
        throw new Error("not used");
      },
      async replyAccountLink() {
        throw new Error("not used");
      },
      async pushCaseNotification() {
        throw new LineProviderError("provider_rate_limited", "4xx");
      },
    },
    identityEncryptionKey: key,
    identityEncryptionKeyVersion: "test-v1",
    publicOrigin: "https://laibe.example",
  });
  assert.deepEqual(await retrying(), { state: "retry" });
  assert.equal(completions.at(-1).outcome, "retryable_failure");
  assert.equal(completions.at(-1).retryAfterSeconds, 60);
});

test("dispatcher leaves a non-current claim for durable recovery and never sends", async () => {
  const { createPrivateNotificationDispatcher } = await import(
    lineNotificationUrl.href
  );
  const { key, claim } = await encryptedLineClaim();
  let pushes = 0;
  let completions = 0;
  const dispatcher = createPrivateNotificationDispatcher({
    repository: {
      async claimNext() {
        return claim;
      },
      async assertCurrent() {
        return { current: false };
      },
      async complete() {
        completions += 1;
        return { completed: false };
      },
    },
    lineClient: {
      async issueLinkToken() {
        throw new Error("not used");
      },
      async pushCaseNotification() {
        pushes += 1;
        return { requestId: null };
      },
    },
    identityEncryptionKey: key,
    identityEncryptionKeyVersion: "test-v1",
    publicOrigin: "https://laibe.example",
  });
  await assert.rejects(() => dispatcher(), /notification_claim_not_current/u);
  assert.equal(pushes, 0);
  assert.equal(completions, 0);
});

test("service-only dispatch endpoint has an exact empty request contract", async () => {
  const { createPrivateNotificationDispatchHandler } = await import(
    lineNotificationUrl.href
  );
  let dispatches = 0;
  const handler = createPrivateNotificationDispatchHandler({
    authorizeService: () => true,
    dispatcher: async () => {
      dispatches += 1;
      return { state: "empty" };
    },
  });
  const accepted = await handler(
    new Request(
      "https://edge.example/functions/v1/drs-line-private-notification-dispatch",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "{}",
      },
    ),
  );
  assert.equal(accepted.status, 200);
  assert.deepEqual(await accepted.json(), { state: "empty" });
  assert.equal(dispatches, 1);
  const rejected = await handler(
    new Request(
      "https://edge.example/functions/v1/drs-line-private-notification-dispatch?caseId=x",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "{}",
      },
    ),
  );
  assert.equal(rejected.status, 400);
  assert.equal(dispatches, 1);
});

test("private notification entry requires gateway JWT and remains import-safe", async () => {
  const module = await import(
    new URL(
      "../supabase/functions/drs-line-private-notification-dispatch/index.ts",
      import.meta.url,
    ).href
  );
  assert.equal(module.VERIFY_JWT_REQUIRED, true);
  assert.equal(
    typeof module.createPrivateNotificationDispatchHandler,
    "function",
  );
  assert.equal(typeof module.handler, "function");
});
