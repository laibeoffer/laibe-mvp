import assert from "node:assert/strict";
import { createHmac, webcrypto } from "node:crypto";
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
    events: [textBindingEvent(), accountLinkEvent({
      webhookEventId: "01HYYYYYYYYYYYYYYYYYYYYYYY",
    })],
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

  assert.equal(readLineWebhookEnvelope({
    destination: LINE_USER_ID,
    events: [textBindingEvent({
      message: { id: "555001", type: "text", text: "DRS真人測試" },
    })],
  }), null);
  assert.equal(readLineWebhookEnvelope({
    destination: LINE_USER_ID,
    events: Array.from({ length: 21 }, () => textBindingEvent()),
  }), null);
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
  assert.equal(await verifyLineSignature(raw, signature.replace(/=+$/u, ""), key), false);
  assert.equal(await verifyLineSignature(raw, `${signature.slice(0, -1)}!`, key), false);
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

  const digestA = await hmacIdentityDigest("unit-test-identity-key", LINE_USER_ID);
  const digestB = await hmacIdentityDigest("unit-test-identity-key", LINE_USER_ID);
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
      headers: { "content-type": "application/json", "x-line-request-id": "req-1" },
    }),
    new Response("{}", {
      status: 200,
      headers: { "content-type": "application/json", "x-line-request-id": "req-2" },
    }),
    new Response("{}", {
      status: 200,
      headers: { "content-type": "application/json", "x-line-request-id": "req-3" },
    }),
  ];
  const client = createLineClient({
    accessToken: "not-a-provider-credential",
    fetch: async (input, init) => {
      calls.push({ input: String(input), init });
      return responses.shift();
    },
  });

  assert.equal(await client.issueLinkToken(LINE_USER_ID), "one-time-link-value");
  assert.deepEqual(
    await client.replyAccountLink(
      REPLY_TOKEN,
      "https://laibe.example/drs/line/continue?protocol=opaque",
    ),
    { requestId: "req-2" },
  );
  assert.deepEqual(await client.pushCaseNotification(LINE_USER_ID, {
    caseLabel: "案件 DRS-042",
    caseStatus: "等待一般審查員確認",
    nextAction: "請開啟 DRS 收件匣檢視",
    caseUrl: "https://laibe.example/drs/cases/current",
  }), { requestId: "req-3" });

  assert.deepEqual(calls.map(({ input }) => input), [
    `https://api.line.me/v2/bot/user/${LINE_USER_ID}/linkToken`,
    "https://api.line.me/v2/bot/message/reply",
    "https://api.line.me/v2/bot/message/push",
  ]);
  assert.equal(calls.every(({ init }) => init.method === "POST"), true);
  assert.equal(calls[0].init.body, undefined);
  assert.deepEqual(JSON.parse(calls[1].init.body), {
    replyToken: REPLY_TOKEN,
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
});

test("LINE client fails closed with sanitized errors and bounded provider responses", async () => {
  const { createLineClient, LineProviderError } = await import(lineClientUrl.href);
  const failed = createLineClient({
    accessToken: "not-a-provider-credential",
    fetch: async () => new Response("provider body must never escape", { status: 503 }),
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
    fetch: async () => new Response(`{"linkToken":"${"x".repeat(40_000)}"}`, {
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

test("LINE client rejects inherited notification authority before any provider call", async () => {
  const { createLineClient, LineProviderError } = await import(lineClientUrl.href);
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
    (error) => error instanceof LineProviderError &&
      error.code === "provider_invalid_request",
  );
  assert.equal(providerCalled, false);
});
