import { verifyLineSignature } from './signature.mjs';

export const TEST_MESSAGE = 'DRS真人測試';
export const LOCKED_REPLY = '萊比已收到這次 DRS 連線測試。本次僅確認訊息傳輸，不代表案件已建立、身分已授權或決策已生效。';

function isAuthorizedTestEvent(event) {
  return event?.type === 'message'
    && event?.message?.type === 'text'
    && event?.source?.type === 'user'
    && event?.message?.text === TEST_MESSAGE
    && typeof event?.webhookEventId === 'string'
    && event.webhookEventId.length > 0
    && typeof event?.replyToken === 'string'
    && event.replyToken.length > 0;
}

export function createWebhookHandler({
  channelSecret,
  lineClient,
  dedupeStore,
  logger = () => {},
  parser = JSON.parse,
  now = Date.now,
} = {}) {
  const safeLog = (entry) => {
    try { logger(entry); } catch { /* logging must not alter webhook behavior */ }
  };

  return async function handleWebhook({ rawBody, signature, requestId }) {
    const startedAt = now();
    const log = (entry) => safeLog({
      requestId,
      ...entry,
      durationMs: Math.max(0, now() - startedAt),
    });

    if (!verifyLineSignature(rawBody, signature, channelSecret)) {
      log({ outcome: 'signature_invalid', httpStatus: 401 });
      return { status: 401 };
    }

    let payload;
    try {
      payload = parser(rawBody.toString('utf8'));
    } catch {
      log({ outcome: 'invalid_json', httpStatus: 400 });
      return { status: 400 };
    }

    if (!payload || !Array.isArray(payload.events)) {
      log({ outcome: 'invalid_payload', httpStatus: 400 });
      return { status: 400 };
    }

    for (const event of payload.events) {
      const eventFields = {
        eventId: typeof event?.webhookEventId === 'string' ? event.webhookEventId : undefined,
        eventType: typeof event?.type === 'string' ? event.type : undefined,
        sourceType: typeof event?.source?.type === 'string' ? event.source.type : undefined,
      };

      if (!isAuthorizedTestEvent(event)) {
        log({ ...eventFields, outcome: 'ignored', httpStatus: 200 });
        continue;
      }

      if (!dedupeStore.begin(event.webhookEventId)) {
        log({ ...eventFields, outcome: 'duplicate', httpStatus: 200 });
        continue;
      }

      try {
        await lineClient.reply({ replyToken: event.replyToken, text: LOCKED_REPLY });
        dedupeStore.complete(event.webhookEventId);
        log({ ...eventFields, outcome: 'replied', httpStatus: 200 });
      } catch (error) {
        dedupeStore.release(event.webhookEventId);
        const httpStatus = error?.httpStatus === 503 ? 503 : 502;
        log({ ...eventFields, outcome: 'reply_failed', httpStatus });
        return { status: httpStatus };
      }
    }

    return { status: 200 };
  };
}
