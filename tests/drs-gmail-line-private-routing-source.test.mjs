import assert from "node:assert/strict";
import test from "node:test";

const contractsUrl = new URL(
  "../supabase/functions/_shared/drs-line-account-link/contracts.ts",
  import.meta.url,
);
const validationUrl = new URL(
  "../supabase/functions/_shared/drs-line-account-link/validation.ts",
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
