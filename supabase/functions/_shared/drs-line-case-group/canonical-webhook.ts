type WebhookHandler = (request: Request) => Promise<Response>;

export type CanonicalLineWebhookDependencies = Readonly<{
  accountLinkHandler: WebhookHandler;
  caseGroupHandler: WebhookHandler;
}>;

const MAX_BODY_BYTES = 1_048_576;
const JSON_HEADERS = Object.freeze({
  "cache-control": "no-store",
  "content-type": "application/json; charset=utf-8",
  "x-content-type-options": "nosniff",
});

function json(status: number): Response {
  return new Response("{}", { status, headers: JSON_HEADERS });
}

function exactCanonicalRequest(request: Request): boolean {
  const url = new URL(request.url);
  const contentType = request.headers.get("content-type")?.split(";", 1)[0]
    .trim().toLowerCase();
  return request.method === "POST" &&
    url.pathname === "/functions/v1/drs-line-webhook" &&
    url.search === "" && contentType === "application/json";
}

async function boundedBody(request: Request): Promise<Uint8Array> {
  const declared = request.headers.get("content-length");
  if (
    declared !== null &&
    (!/^\d+$/u.test(declared) || Number(declared) > MAX_BODY_BYTES)
  ) throw new RangeError("body_too_large");
  if (request.body === null) return new Uint8Array();
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_BODY_BYTES) {
        await reader.cancel().catch(() => undefined);
        throw new RangeError("body_too_large");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const result = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return result;
}

function own(value: unknown, key: string): unknown {
  return value !== null && typeof value === "object" && !Array.isArray(value) &&
      Object.prototype.hasOwnProperty.call(value, key)
    ? (value as Record<string, unknown>)[key]
    : undefined;
}

function pureGroupEnvelope(rawBody: Uint8Array): boolean {
  let payload: unknown;
  try {
    payload = JSON.parse(
      new TextDecoder("utf-8", { fatal: true }).decode(rawBody),
    );
  } catch {
    return false;
  }
  const events = own(payload, "events");
  if (!Array.isArray(events) || events.length === 0 || events.length > 20) {
    return false;
  }
  return events.every((event) => own(own(event, "source"), "type") === "group");
}

function forwardedRequest(
  request: Request,
  rawBody: Uint8Array,
  pathname: string,
): Request {
  const url = new URL(request.url);
  url.pathname = pathname;
  const body = Uint8Array.from(rawBody).buffer;
  return new Request(url, {
    method: "POST",
    headers: new Headers(request.headers),
    body,
  });
}

export function createCanonicalLineWebhookHandler(
  dependencies: CanonicalLineWebhookDependencies,
): WebhookHandler {
  return async (request) => {
    if (!exactCanonicalRequest(request)) return json(400);
    let rawBody: Uint8Array;
    try {
      rawBody = await boundedBody(request);
    } catch (error) {
      return json(error instanceof RangeError ? 413 : 400);
    }
    const group = pureGroupEnvelope(rawBody);
    const targetPath = group
      ? "/functions/v1/drs-line-case-webhook"
      : "/functions/v1/drs-line-webhook";
    const forwarded = forwardedRequest(request, rawBody, targetPath);
    return group
      ? await dependencies.caseGroupHandler(forwarded)
      : await dependencies.accountLinkHandler(forwarded);
  };
}
