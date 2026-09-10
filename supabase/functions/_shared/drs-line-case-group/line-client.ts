const LINE_API_ORIGIN = "https://api.line.me";
const GROUP_ID = /^C[0-9a-f]{32}$/u;
const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
const MAX_RESPONSE_BYTES = 32 * 1024;

export type LineGroupPushReceipt = Readonly<{
  observedRequestId: string | null;
  acceptedRequestId: string | null;
  messageId: string | null;
  statusClass: "2xx" | "4xx";
  replayed: boolean;
}>;

export type LineGroupClient = Readonly<{
  pushText(
    groupId: string,
    text: string,
    retryKey: string,
  ): Promise<LineGroupPushReceipt>;
}>;

export type LineGroupProviderFailure =
  | "invalid_request"
  | "rate_limited"
  | "unavailable"
  | "invalid_response";

export class LineGroupProviderError extends Error {
  readonly code: LineGroupProviderFailure;
  readonly retryable: boolean;
  readonly statusClass: "none" | "2xx" | "4xx" | "5xx";
  readonly observedRequestId: string | null;

  constructor(
    code: LineGroupProviderFailure,
    retryable: boolean,
    statusClass: "none" | "2xx" | "4xx" | "5xx" = "none",
    observedRequestId: string | null = null,
  ) {
    super(code);
    this.name = "LineGroupProviderError";
    this.code = code;
    this.retryable = retryable;
    this.statusClass = statusClass;
    this.observedRequestId = observedRequestId;
  }
}

function safeHeader(response: Response, name: string): string | null {
  const value = response.headers.get(name);
  return value && /^[A-Za-z0-9._:-]{1,128}$/u.test(value) ? value : null;
}

function hasDisallowedControl(
  value: string,
  allowLineWhitespace = false,
): boolean {
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code === 127) return true;
    if (code <= 31 && !(allowLineWhitespace && [9, 10, 13].includes(code))) {
      return true;
    }
  }
  return false;
}

async function boundedJson(response: Response): Promise<unknown> {
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.byteLength > MAX_RESPONSE_BYTES) {
    throw new LineGroupProviderError("invalid_response", false);
  }
  if (bytes.byteLength === 0) return {};
  try {
    return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
  } catch {
    throw new LineGroupProviderError("invalid_response", false);
  }
}

function readMessageId(value: unknown): string | null | undefined {
  if (
    value === null || typeof value !== "object" || Array.isArray(value) ||
    Object.getPrototypeOf(value) !== Object.prototype
  ) return undefined;
  const object = value as Record<string, unknown>;
  if (Object.keys(object).length === 0) return null;
  if (
    Object.keys(object).sort().join(",") !== "sentMessages" ||
    !Array.isArray(object.sentMessages) || object.sentMessages.length !== 1
  ) {
    return undefined;
  }
  const sent = object.sentMessages[0];
  if (sent === null || typeof sent !== "object" || Array.isArray(sent)) {
    return undefined;
  }
  const record = sent as Record<string, unknown>;
  if (
    !Object.hasOwn(record, "id") ||
    Object.keys(record).some((key) => !["id", "quoteToken"].includes(key))
  ) return undefined;
  return typeof record.id === "string" && /^[0-9]{1,64}$/u.test(record.id)
    ? record.id
    : undefined;
}

export function createLineGroupClient(
  options: Readonly<{ accessToken: string; fetch?: typeof globalThis.fetch }>,
): LineGroupClient {
  if (
    typeof options.accessToken !== "string" ||
    options.accessToken.length < 16 ||
    options.accessToken.length > 4096 ||
    hasDisallowedControl(options.accessToken)
  ) throw new LineGroupProviderError("invalid_request", false);
  const fetcher = options.fetch ?? globalThis.fetch;
  if (typeof fetcher !== "function") {
    throw new LineGroupProviderError("unavailable", true);
  }
  return Object.freeze({
    async pushText(groupId, text, retryKey) {
      if (
        !GROUP_ID.test(groupId) || !UUID.test(retryKey) ||
        typeof text !== "string" || text.length < 1 || text.length > 5000 ||
        hasDisallowedControl(text, true)
      ) throw new LineGroupProviderError("invalid_request", false);
      let response: Response;
      try {
        response = await fetcher(`${LINE_API_ORIGIN}/v2/bot/message/push`, {
          method: "POST",
          redirect: "error",
          signal: AbortSignal.timeout(8_000),
          headers: {
            authorization: `Bearer ${options.accessToken}`,
            accept: "application/json",
            "content-type": "application/json; charset=utf-8",
            "x-line-retry-key": retryKey,
          },
          body: JSON.stringify({
            to: groupId,
            messages: [{ type: "text", text }],
          }),
        });
      } catch {
        throw new LineGroupProviderError("unavailable", true);
      }
      if (response.status === 409) {
        const observed = safeHeader(response, "x-line-request-id");
        const accepted = safeHeader(response, "x-line-accepted-request-id");
        await response.body?.cancel().catch(() => undefined);
        if (!accepted) {
          throw new LineGroupProviderError(
            "invalid_response",
            false,
            "4xx",
            observed,
          );
        }
        return Object.freeze({
          observedRequestId: observed,
          acceptedRequestId: accepted,
          messageId: null,
          statusClass: "4xx" as const,
          replayed: true,
        });
      }
      if (!response.ok) {
        const observed = safeHeader(response, "x-line-request-id");
        await response.body?.cancel().catch(() => undefined);
        if (response.status === 429) {
          throw new LineGroupProviderError(
            "rate_limited",
            true,
            "4xx",
            observed,
          );
        }
        if (response.status >= 500) {
          throw new LineGroupProviderError(
            "unavailable",
            true,
            "5xx",
            observed,
          );
        }
        throw new LineGroupProviderError(
          "invalid_request",
          false,
          "4xx",
          observed,
        );
      }
      const observed = safeHeader(response, "x-line-request-id");
      let messageId: string | null | undefined;
      try {
        messageId = readMessageId(await boundedJson(response));
      } catch {
        throw new LineGroupProviderError(
          "invalid_response",
          false,
          "2xx",
          observed,
        );
      }
      if (messageId === undefined) {
        throw new LineGroupProviderError(
          "invalid_response",
          false,
          "2xx",
          observed,
        );
      }
      return Object.freeze({
        observedRequestId: observed,
        acceptedRequestId: null,
        messageId,
        statusClass: "2xx" as const,
        replayed: false,
      });
    },
  });
}
