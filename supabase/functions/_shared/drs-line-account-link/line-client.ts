const LINE_API_ORIGIN = "https://api.line.me";
const MAX_PROVIDER_RESPONSE_BYTES = 32 * 1024;
const LINE_USER_ID_PATTERN = /^U[0-9a-f]{32}$/u;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;

export type LineCaseNotification = Readonly<{
  caseLabel: string;
  caseStatus: string;
  nextAction: string;
  caseUrl: string;
}>;

export type LineProviderErrorCode =
  | "provider_invalid_request"
  | "provider_conflict"
  | "provider_rate_limited"
  | "provider_unavailable"
  | "provider_invalid_response";

export class LineProviderError extends Error {
  readonly code: LineProviderErrorCode;
  readonly statusClass: "none" | "4xx" | "5xx";

  constructor(
    code: LineProviderErrorCode,
    statusClass: "none" | "4xx" | "5xx" = "none",
  ) {
    super(code);
    this.name = "LineProviderError";
    this.code = code;
    this.statusClass = statusClass;
  }
}

export type LineClient = Readonly<{
  issueLinkToken(lineUserId: string): Promise<string>;
  pushAccountLink(
    lineUserId: string,
    linkingUrl: string,
    retryKey: string,
  ): Promise<Readonly<{ requestId: string | null }>>;
  pushUnlinkConfirmation(
    lineUserId: string,
    retryKey: string,
  ): Promise<Readonly<{ requestId: string | null }>>;
  pushCaseNotification(
    lineUserId: string,
    message: LineCaseNotification,
    retryKey?: string,
  ): Promise<Readonly<{ requestId: string | null }>>;
}>;

export type LineClientDependencies = Readonly<{
  accessToken: string;
  fetch?: typeof fetch;
}>;

function isSafeText(
  value: unknown,
  minimum: number,
  maximum: number,
): value is string {
  return typeof value === "string" && value.length >= minimum &&
    value.length <= maximum && !hasAsciiControl(value);
}

function hasAsciiControl(value: string): boolean {
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code <= 31 || code === 127) return true;
  }
  return false;
}

function isSafeHttpsUrl(value: unknown, maximum = 1024): value is string {
  if (
    typeof value !== "string" || value.length === 0 || value.length > maximum
  ) {
    return false;
  }
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.username === "" &&
      url.password === "" && url.hash === "";
  } catch {
    return false;
  }
}

function safeRequestId(response: Response): string | null {
  const value = response.headers.get("x-line-request-id");
  return value && /^[A-Za-z0-9._:-]{1,128}$/u.test(value) ? value : null;
}

function safeAcceptedRequestId(response: Response): string | null {
  const value = response.headers.get("x-line-accepted-request-id");
  return value && /^[A-Za-z0-9._:-]{1,128}$/u.test(value) ? value : null;
}

function failureForStatus(status: number): LineProviderError {
  if (status === 409) return new LineProviderError("provider_conflict", "4xx");
  if (status === 429) {
    return new LineProviderError("provider_rate_limited", "4xx");
  }
  if (status >= 400 && status < 500) {
    return new LineProviderError("provider_invalid_request", "4xx");
  }
  return new LineProviderError("provider_unavailable", "5xx");
}

async function boundedJson(response: Response): Promise<unknown> {
  const declaredLength = response.headers.get("content-length");
  if (
    declaredLength !== null &&
    (!/^\d+$/u.test(declaredLength) ||
      Number(declaredLength) > MAX_PROVIDER_RESPONSE_BYTES)
  ) throw new LineProviderError("provider_invalid_response");
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.byteLength > MAX_PROVIDER_RESPONSE_BYTES) {
    throw new LineProviderError("provider_invalid_response");
  }
  if (bytes.byteLength === 0) return {};
  try {
    return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
  } catch {
    throw new LineProviderError("provider_invalid_response");
  }
}

function exactLinkToken(input: unknown): string | null {
  if (
    input === null || typeof input !== "object" || Array.isArray(input) ||
    Object.getPrototypeOf(input) !== Object.prototype ||
    Object.keys(input).length !== 1 ||
    !Object.prototype.hasOwnProperty.call(input, "linkToken")
  ) return null;
  const value = Object.getOwnPropertyDescriptor(input, "linkToken")?.value;
  return isSafeText(value, 1, 512) ? value : null;
}

function exactEmptyObject(input: unknown): boolean {
  return input !== null && typeof input === "object" && !Array.isArray(input) &&
    Object.getPrototypeOf(input) === Object.prototype &&
    Object.keys(input).length === 0;
}

function hasExactNotificationKeys(
  input: unknown,
): input is LineCaseNotification {
  if (
    input === null || typeof input !== "object" || Array.isArray(input) ||
    Object.getPrototypeOf(input) !== Object.prototype
  ) return false;
  const keys = Object.keys(input);
  return keys.length === 4 && [
    "caseLabel",
    "caseStatus",
    "nextAction",
    "caseUrl",
  ].every((key) => Object.prototype.hasOwnProperty.call(input, key));
}

export function createLineClient(
  dependencies: LineClientDependencies,
): LineClient {
  if (!isSafeText(dependencies.accessToken, 1, 4096)) {
    throw new LineProviderError("provider_invalid_request");
  }
  const fetcher = dependencies.fetch ?? globalThis.fetch;
  if (typeof fetcher !== "function") {
    throw new LineProviderError("provider_unavailable");
  }
  const headers = Object.freeze({
    authorization: `Bearer ${dependencies.accessToken}`,
    accept: "application/json",
  });

  async function request(
    path: string,
    body?: unknown,
    additionalHeaders?: Readonly<Record<string, string>>,
    acceptRetryConflict = false,
  ): Promise<Readonly<{ payload: unknown; requestId: string | null }>> {
    let response: Response;
    try {
      response = await fetcher(`${LINE_API_ORIGIN}${path}`, {
        method: "POST",
        headers: body === undefined ? { ...headers, ...additionalHeaders } : {
          ...headers,
          ...additionalHeaders,
          "content-type": "application/json; charset=utf-8",
        },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
    } catch {
      throw new LineProviderError("provider_unavailable");
    }
    if (response.status === 409 && acceptRetryConflict) {
      const acceptedRequestId = safeAcceptedRequestId(response);
      await response.body?.cancel().catch(() => undefined);
      if (acceptedRequestId === null) throw failureForStatus(response.status);
      return Object.freeze({ payload: {}, requestId: acceptedRequestId });
    }
    if (!response.ok) throw failureForStatus(response.status);
    const payload = await boundedJson(response);
    return Object.freeze({ payload, requestId: safeRequestId(response) });
  }

  return Object.freeze({
    async issueLinkToken(lineUserId: string): Promise<string> {
      if (!LINE_USER_ID_PATTERN.test(lineUserId)) {
        throw new LineProviderError("provider_invalid_request");
      }
      const result = await request(`/v2/bot/user/${lineUserId}/linkToken`);
      const linkToken = exactLinkToken(result.payload);
      if (!linkToken) throw new LineProviderError("provider_invalid_response");
      return linkToken;
    },

    async pushAccountLink(
      lineUserId: string,
      linkingUrl: string,
      retryKey: string,
    ): Promise<Readonly<{ requestId: string | null }>> {
      if (
        !LINE_USER_ID_PATTERN.test(lineUserId) ||
        !isSafeHttpsUrl(linkingUrl) || !UUID_PATTERN.test(retryKey)
      ) throw new LineProviderError("provider_invalid_request");
      const result = await request(
        "/v2/bot/message/push",
        {
          to: lineUserId,
          messages: [{
            type: "template",
            altText: "確認綁定 LINE 案件通知",
            template: {
              type: "buttons",
              text: "請完成 LINE 案件通知綁定",
              actions: [{
                type: "uri",
                label: "繼續綁定",
                uri: linkingUrl,
              }],
            },
          }],
        },
        { "x-line-retry-key": retryKey },
        true,
      );
      if (!exactEmptyObject(result.payload)) {
        throw new LineProviderError("provider_invalid_response");
      }
      return Object.freeze({ requestId: result.requestId });
    },

    async pushUnlinkConfirmation(
      lineUserId: string,
      retryKey: string,
    ): Promise<Readonly<{ requestId: string | null }>> {
      if (
        !LINE_USER_ID_PATTERN.test(lineUserId) || !UUID_PATTERN.test(retryKey)
      ) {
        throw new LineProviderError("provider_invalid_request");
      }
      const result = await request(
        "/v2/bot/message/push",
        {
          to: lineUserId,
          messages: [{
            type: "text",
            text: "LINE 案件通知已解除。Gmail 登入與 DRS 身分不受影響。",
          }],
        },
        { "x-line-retry-key": retryKey },
        true,
      );
      if (!exactEmptyObject(result.payload)) {
        throw new LineProviderError("provider_invalid_response");
      }
      return Object.freeze({ requestId: result.requestId });
    },

    async pushCaseNotification(
      lineUserId: string,
      message: LineCaseNotification,
      retryKey?: string,
    ): Promise<Readonly<{ requestId: string | null }>> {
      if (
        !LINE_USER_ID_PATTERN.test(lineUserId) ||
        !hasExactNotificationKeys(message) ||
        !isSafeText(message.caseLabel, 1, 80) ||
        !isSafeText(message.caseStatus, 1, 120) ||
        !isSafeText(message.nextAction, 1, 160) ||
        !isSafeHttpsUrl(message.caseUrl, 512) ||
        (retryKey !== undefined && !UUID_PATTERN.test(retryKey))
      ) throw new LineProviderError("provider_invalid_request");
      const result = await request(
        "/v2/bot/message/push",
        {
          to: lineUserId,
          messages: [{
            type: "text",
            text: [
              "萊比案件通知",
              message.caseLabel,
              `目前狀態：${message.caseStatus}`,
              `下一步：${message.nextAction}`,
              message.caseUrl,
            ].join("\n"),
          }],
        },
        retryKey === undefined ? undefined : { "x-line-retry-key": retryKey },
        retryKey !== undefined,
      );
      if (!exactEmptyObject(result.payload)) {
        throw new LineProviderError("provider_invalid_response");
      }
      return Object.freeze({ requestId: result.requestId });
    },
  });
}
