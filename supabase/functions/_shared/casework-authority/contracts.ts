export type CaseworkRole = "owner" | "pro" | "highest_reviewer";

export type CaseCreateInput = Readonly<{
  authenticatedUserId: string;
  title: string;
  idempotencyKey: string;
  payloadSha256: string;
}>;

export type CaseworkIdentity = Readonly<{ userId: string }>;

export type CaseworkAuthorityDependencies = Readonly<{
  allowedOrigins: readonly string[];
  runtimeAvailable: boolean;
  resolveAuthenticatedIdentity(
    request: Request,
  ): Promise<CaseworkIdentity | null>;
  createCase(input: CaseCreateInput): Promise<unknown>;
  resolveWorkspaceGrant(userId: string, role: CaseworkRole): Promise<unknown>;
}>;

export const CASEWORK_CASE_CREATE_SCHEMA =
  "laibe.casework-case-create.request.v1";

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
const IDEMPOTENCY_KEY = /^[^\s\p{C}]{16,128}$/u;
const MAX_CASE_CREATE_BYTES = 1024;
const ALLOWED_PREFLIGHT_HEADERS = new Set([
  "authorization",
  "content-type",
  "apikey",
]);

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID.test(value);
}

function own(record: unknown, key: string): unknown {
  if (
    record === null || typeof record !== "object" || Array.isArray(record) ||
    Object.getPrototypeOf(record) !== Object.prototype ||
    !Object.prototype.hasOwnProperty.call(record, key)
  ) return undefined;
  return (record as Record<string, unknown>)[key];
}

export function corsHeaders(
  origin: string | null,
  allowedOrigins: readonly string[],
): Headers {
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
      "authorization, content-type, apikey",
    );
  }
  return headers;
}

export function jsonResponse(
  status: number,
  payload: Readonly<Record<string, unknown>>,
  headers = new Headers(),
): Response {
  const responseHeaders = new Headers(headers);
  responseHeaders.set("content-type", "application/json; charset=utf-8");
  responseHeaders.set("cache-control", "no-store");
  return new Response(JSON.stringify(payload), {
    status,
    headers: responseHeaders,
  });
}

export function disallowedOrigin(
  request: Request,
  allowedOrigins: readonly string[],
): boolean {
  const origin = request.headers.get("origin");
  return origin !== null && !allowedOrigins.includes(origin);
}

export function preflightResponse(
  request: Request,
  method: "GET" | "POST",
  allowedOrigins: readonly string[],
): Response | null {
  if (request.method !== "OPTIONS") return null;
  const origin = request.headers.get("origin");
  if (!origin || !allowedOrigins.includes(origin)) {
    return jsonResponse(403, { state: "CONTEXT_UNAVAILABLE" });
  }
  if (
    request.headers.get("access-control-request-method")?.trim()
      .toUpperCase() !== method
  ) return jsonResponse(403, { state: "CONTEXT_UNAVAILABLE" });
  const rawHeaders = request.headers.get("access-control-request-headers");
  if (rawHeaders) {
    const valid = rawHeaders.split(",").map((value) =>
      value.trim().toLowerCase()
    )
      .every((value) =>
        value.length > 0 && ALLOWED_PREFLIGHT_HEADERS.has(value)
      );
    if (!valid) return jsonResponse(403, { state: "CONTEXT_UNAVAILABLE" });
  }
  return new Response(null, {
    status: 204,
    headers: corsHeaders(origin, allowedOrigins),
  });
}

export function hasBearerAuthorization(request: Request): boolean {
  return /^Bearer\s+[^\s]+$/u.test(
    request.headers.get("authorization") ?? "",
  );
}

export function validateClosedGet(
  request: Request,
  pathname: string,
): "ok" | "method" | "invalid" {
  if (request.method !== "GET") return "method";
  const url = new URL(request.url);
  if (url.pathname !== pathname || url.search.length !== 0) return "invalid";
  const contentLength = request.headers.get("content-length");
  if (
    request.body !== null || (contentLength !== null && contentLength !== "0")
  ) {
    return "invalid";
  }
  for (const name of request.headers.keys()) {
    if (
      /^x-(?:case|user|role|group|provider|authorization-subject)/iu.test(name)
    ) {
      return "invalid";
    }
  }
  return "ok";
}

async function boundedBody(request: Request): Promise<Uint8Array | null> {
  const contentLength = request.headers.get("content-length");
  if (contentLength !== null) {
    if (!/^(?:0|[1-9]\d*)$/u.test(contentLength)) return null;
    const declared = Number(contentLength);
    if (!Number.isSafeInteger(declared) || declared > MAX_CASE_CREATE_BYTES) {
      return null;
    }
  }
  if (request.body === null) return null;
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const result = await reader.read();
      if (result.done) break;
      total += result.value.byteLength;
      if (total > MAX_CASE_CREATE_BYTES) {
        await reader.cancel();
        return null;
      }
      chunks.push(result.value);
    }
  } catch {
    try {
      await reader.cancel();
    } catch {
      // The malformed body remains invalid.
    }
    return null;
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes;
}

export type CaseCreateRequest = Readonly<{
  schemaVersion: typeof CASEWORK_CASE_CREATE_SCHEMA;
  title: string;
  idempotencyKey: string;
}>;

export async function readCaseCreateRequest(
  request: Request,
): Promise<CaseCreateRequest | null> {
  const url = new URL(request.url);
  if (
    request.method !== "POST" ||
    url.pathname !== "/functions/v1/casework-case-create" ||
    url.search.length !== 0 ||
    !/^application\/json(?:\s*;\s*charset=utf-8)?$/iu.test(
      request.headers.get("content-type") ?? "",
    )
  ) return null;
  const bytes = await boundedBody(request);
  if (!bytes || bytes.length === 0) return null;
  let candidate: unknown;
  try {
    candidate = JSON.parse(
      new TextDecoder("utf-8", { fatal: true }).decode(bytes),
    );
  } catch {
    return null;
  }
  if (
    candidate === null || typeof candidate !== "object" ||
    Array.isArray(candidate) ||
    Object.getPrototypeOf(candidate) !== Object.prototype
  ) return null;
  const keys = Object.keys(candidate).sort();
  if (
    keys.length !== 3 || keys[0] !== "idempotencyKey" ||
    keys[1] !== "schemaVersion" || keys[2] !== "title"
  ) return null;
  const schemaVersion = own(candidate, "schemaVersion");
  const title = own(candidate, "title");
  const idempotencyKey = own(candidate, "idempotencyKey");
  if (
    schemaVersion !== CASEWORK_CASE_CREATE_SCHEMA ||
    typeof title !== "string" || title !== title.trim() ||
    title.length < 1 || title.length > 200 || /\p{C}/u.test(title) ||
    typeof idempotencyKey !== "string" || !IDEMPOTENCY_KEY.test(idempotencyKey)
  ) return null;
  return Object.freeze({ schemaVersion, title, idempotencyKey });
}

export async function sha256CaseCreateRequest(
  input: CaseCreateRequest,
): Promise<string> {
  const canonical = JSON.stringify({
    schemaVersion: input.schemaVersion,
    title: input.title,
    idempotencyKey: input.idempotencyKey,
  });
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(canonical),
  );
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export type ValidCaseCreateResult = Readonly<{
  created: boolean;
  caseId: string;
  eventId: string;
}>;

export function validateCaseCreateResult(
  candidate: unknown,
): ValidCaseCreateResult | null {
  if (own(candidate, "ok") !== true) return null;
  const created = own(candidate, "created");
  const caseId = own(candidate, "case_id");
  const caseStatus = own(candidate, "case_status");
  const membershipRole = own(candidate, "membership_role");
  const membershipStatus = own(candidate, "membership_status");
  const eventId = own(candidate, "event_id");
  if (
    typeof created !== "boolean" || !isUuid(caseId) ||
    caseStatus !== "active" || membershipRole !== "owner" ||
    membershipStatus !== "active" || !isUuid(eventId)
  ) return null;
  return Object.freeze({ created, caseId, eventId });
}

export type ValidWorkspaceGrant = Readonly<{
  caseId: string;
  role: CaseworkRole;
}>;

export function validateWorkspaceGrant(
  candidate: unknown,
  expectedRole: CaseworkRole,
): ValidWorkspaceGrant | null {
  if (
    own(candidate, "authorized") !== true ||
    own(candidate, "state") !== "AUTHORIZED_CASEWORK_WORKSPACE"
  ) return null;
  const caseId = own(candidate, "case_id");
  const caseStatus = own(candidate, "case_status");
  const role = own(candidate, "account_role");
  const grantId = own(candidate, "grant_id");
  const grantVersion = own(candidate, "grant_version");
  const grantExpiresAt = own(candidate, "grant_expires_at");
  if (
    !isUuid(caseId) || caseStatus !== "active" || role !== expectedRole ||
    !isUuid(grantId) || !Number.isSafeInteger(grantVersion) ||
    (grantVersion as number) < 1 || typeof grantExpiresAt !== "string" ||
    !Number.isFinite(Date.parse(grantExpiresAt))
  ) return null;
  return Object.freeze({ caseId, role: expectedRole });
}

export function denialState(candidate: unknown): string {
  const state = own(candidate, "state");
  return state === "AUTH_REQUIRED" || state === "CASE_SELECTION_REQUIRED" ||
      state === "CASE_NOT_AUTHORIZED" || state === "IDEMPOTENCY_CONFLICT"
    ? state
    : "CONTEXT_UNAVAILABLE";
}

export function denialStatus(state: string): number {
  if (state === "AUTH_REQUIRED") return 401;
  if (state === "CASE_SELECTION_REQUIRED" || state === "IDEMPOTENCY_CONFLICT") {
    return 409;
  }
  if (state === "CASE_NOT_AUTHORIZED") return 403;
  return 503;
}
