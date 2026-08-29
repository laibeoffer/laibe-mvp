const REPLY_ENDPOINT = 'https://api.line.me/v2/bot/message/reply';
const DEFAULT_TIMEOUT_MS = 5_000;

export class LineReplyError extends Error {
  constructor(message, { httpStatus, upstreamStatus } = {}) {
    super(message);
    this.name = 'LineReplyError';
    this.httpStatus = httpStatus;
    if (upstreamStatus !== undefined) this.upstreamStatus = upstreamStatus;
  }
}

export function createLineClient({
  accessToken,
  fetchImpl = fetch,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  setTimeoutFn = setTimeout,
  clearTimeoutFn = clearTimeout,
} = {}) {
  return Object.freeze({
    async reply({ replyToken, text }) {
      const controller = new AbortController();
      const timer = setTimeoutFn(() => controller.abort(), timeoutMs);

      try {
        const response = await fetchImpl(REPLY_ENDPOINT, {
          method: 'POST',
          headers: {
            authorization: `Bearer ${accessToken}`,
            'content-type': 'application/json',
          },
          body: JSON.stringify({
            replyToken,
            messages: [{ type: 'text', text }],
          }),
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new LineReplyError('LINE Reply API returned a non-success status', {
            httpStatus: response.status >= 500 ? 503 : 502,
            upstreamStatus: response.status,
          });
        }
      } catch (error) {
        if (error instanceof LineReplyError) throw error;
        throw new LineReplyError('LINE Reply API request failed', { httpStatus: 503 });
      } finally {
        clearTimeoutFn(timer);
      }
    },
  });
}
