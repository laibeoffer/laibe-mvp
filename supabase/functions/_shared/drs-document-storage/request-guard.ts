import {
  DocumentContractError,
  type DocumentRequest,
  isOpaqueRef,
  parseFinalizeRequest,
  parseSnapshotRequest,
  parseUploadIntentRequest,
} from "./contracts.ts";

export type DocumentRoute =
  | "uploadIntent"
  | "finalize"
  | "download"
  | "snapshot";

const MAX_BODY_BYTES = 64 * 1024;
const APPROVED_X_HEADERS = new Set([
  "x-client-info",
  "x-forwarded-for",
  "x-forwarded-host",
  "x-forwarded-port",
  "x-forwarded-proto",
  "x-real-ip",
  "x-request-id",
  "x-supabase-api-version",
]);

const ROUTE_PATHS = Object.freeze({
  uploadIntent: "/functions/v1/drs-document-upload-intent",
  finalize: "/functions/v1/drs-document-upload-finalize",
  snapshot: "/functions/v1/drs-document-snapshot",
});

function invalidRequest(): never {
  throw new DocumentContractError("INVALID_REQUEST", 400);
}

function assertApprovedHeaders(request: Request): void {
  for (const name of request.headers.keys()) {
    if (name.startsWith("x-") && !APPROVED_X_HEADERS.has(name)) {
      invalidRequest();
    }
  }
}

function hasDuplicateTopLevelJsonMemberName(raw: string): boolean {
  const seen = new Set<string>();
  let depth = 0;
  let stringStart = -1;
  let escaped = false;
  for (let index = 0; index < raw.length; index += 1) {
    const character = raw[index];
    if (stringStart >= 0) {
      if (escaped) {
        escaped = false;
        continue;
      }
      if (character === "\\") {
        escaped = true;
        continue;
      }
      if (character !== '"') continue;
      const end = index + 1;
      let next = end;
      while (/\s/u.test(raw[next] ?? "")) next += 1;
      if (depth === 1 && raw[next] === ":") {
        let name: unknown;
        try {
          name = JSON.parse(raw.slice(stringStart, end));
        } catch {
          invalidRequest();
        }
        if (typeof name !== "string" || seen.has(name)) return true;
        seen.add(name);
      }
      stringStart = -1;
    } else if (character === '"') stringStart = index;
    else if (character === "{" || character === "[") depth += 1;
    else if (character === "}" || character === "]") depth -= 1;
  }
  return false;
}

async function readExactJson(request: Request): Promise<unknown> {
  if (
    request.body === null ||
    !/^application\/json(?:\s*;\s*charset=utf-8)?$/iu.test(
      request.headers.get("content-type") ?? "",
    )
  ) invalidRequest();
  const contentLength = request.headers.get("content-length");
  if (
    contentLength !== null &&
    (!/^(?:0|[1-9]\d*)$/u.test(contentLength) ||
      Number(contentLength) > MAX_BODY_BYTES)
  ) {
    try {
      await request.body.cancel();
    } catch {
      // The request is rejected regardless of provider cancellation support.
    }
    invalidRequest();
  }
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (
        !(value instanceof Uint8Array) ||
        total + value.byteLength > MAX_BODY_BYTES
      ) {
        await reader.cancel();
        invalidRequest();
      }
      chunks.push(value);
      total += value.byteLength;
    }
  } catch {
    try {
      await reader.cancel();
    } catch {
      // The request is rejected regardless of provider cancellation support.
    }
    invalidRequest();
  } finally {
    reader.releaseLock();
  }
  if (total === 0) invalidRequest();
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  try {
    const raw = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    if (hasDuplicateTopLevelJsonMemberName(raw)) invalidRequest();
    return JSON.parse(raw);
  } catch (error) {
    if (error instanceof DocumentContractError) throw error;
    invalidRequest();
  }
}

export async function readDocumentRequest(
  route: DocumentRoute,
  request: Request,
): Promise<DocumentRequest> {
  assertApprovedHeaders(request);
  const url = new URL(request.url);
  if (url.search.length !== 0) invalidRequest();
  if (route === "download") {
    if (
      request.method !== "GET" || request.body !== null ||
      request.headers.has("content-type") ||
      request.headers.has("content-length")
    ) invalidRequest();
    const prefix = "/functions/v1/drs-document-version-download/";
    if (!url.pathname.startsWith(prefix)) invalidRequest();
    const versionRef = url.pathname.slice(prefix.length);
    if (!isOpaqueRef(versionRef) || versionRef.includes("/")) invalidRequest();
    return Object.freeze({ versionRef });
  }
  if (
    request.method !== "POST" ||
    url.pathname !== ROUTE_PATHS[route as keyof typeof ROUTE_PATHS]
  ) invalidRequest();
  const payload = await readExactJson(request);
  const parsed = route === "uploadIntent"
    ? parseUploadIntentRequest(payload)
    : route === "finalize"
    ? parseFinalizeRequest(payload)
    : parseSnapshotRequest(payload);
  if (!parsed) invalidRequest();
  return parsed;
}

export function documentJsonResponse(
  status: number,
  payload: Readonly<Record<string, unknown>>,
  origin: string | null,
  allowedOrigins: readonly string[],
): Response {
  const headers = new Headers({
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    "vary": "Origin",
  });
  if (origin !== null && allowedOrigins.includes(origin)) {
    headers.set("access-control-allow-origin", origin);
    headers.set("access-control-allow-methods", "GET, POST, OPTIONS");
    headers.set(
      "access-control-allow-headers",
      "authorization, content-type, apikey, x-client-info, x-request-id",
    );
  }
  return new Response(JSON.stringify(payload), { status, headers });
}

export function documentPreflight(
  request: Request,
  method: "GET" | "POST",
  allowedOrigins: readonly string[],
): Response | null {
  if (request.method !== "OPTIONS") return null;
  const origin = request.headers.get("origin");
  const requested = request.headers.get("access-control-request-method")
    ?.trim().toUpperCase();
  if (!origin || !allowedOrigins.includes(origin) || requested !== method) {
    return documentJsonResponse(
      403,
      { state: "CONTEXT_UNAVAILABLE" },
      null,
      [],
    );
  }
  return new Response(null, {
    status: 204,
    headers: documentJsonResponse(200, {}, origin, allowedOrigins).headers,
  });
}

export function hasDisallowedDocumentOrigin(
  request: Request,
  allowedOrigins: readonly string[],
): boolean {
  const origin = request.headers.get("origin");
  return origin === null || !allowedOrigins.includes(origin);
}
