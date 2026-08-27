import {
  createDrsBffGuard,
  type DrsBffGuard,
  type DrsBffRequestContract,
  type DrsSessionBootstrapDependencies,
} from "../drs-auth/drs-session-bootstrap-bff.ts";
import {
  DOCUMENT_LIMITS,
  type DocumentRequest,
  parseFinalizeRequest,
  parseSnapshotRequest,
  parseUploadIntentRequest,
  type UploadIntentRequest,
} from "../drs-document-storage/contracts.ts";

const MAX_REQUEST_BODY_BYTES = 65_536;
const MAX_EDGE_JSON_RESPONSE_BYTES = 65_536;
const MAX_DOCUMENT_BYTES = DOCUMENT_LIMITS.maxFileBytes;
const MAX_SIGNED_UPLOAD_URL_BYTES = 4_096;
const EDGE_ORIGIN = "https://edge.internal.invalid";
const GUARD_PATH = "/api/drs/_internal/document-operation-authorize";
const GUARD_SCHEMA = "laibe.drs-document-bff.guard.request.v1";
const JSON_CONTENT_TYPE = "application/json;charset=utf-8";
const JSON_CONTENT_TYPE_PATTERN =
  /^application\/json(?:\s*;\s*charset=utf-8)?$/iu;
const OPAQUE_VERSION_REF = /^dvr_[0-9a-z]{20,40}$/u;
const OPAQUE_INTENT_REF = /^int_[0-9a-z]{20,40}$/u;
const OPAQUE_DOCUMENT_REF = /^doc_[0-9a-z]{20,40}$/u;
const OPAQUE_SNAPSHOT_REF = /^snp_[0-9a-z]{20,40}$/u;
const OPAQUE_RECEIPT_REF = /^rcp_[0-9a-z]{20,40}$/u;
const SHA256 = /^[a-f0-9]{64}$/u;
const COOKIE_VALUE = /^[A-Za-z0-9._~-]{1,4096}$/u;

const LOGICAL_REQUEST_HEADER_ALLOWLIST = Object.freeze(
  new Set([
    "accept",
    "accept-encoding",
    "accept-language",
    "authorization",
    "baggage",
    "cache-control",
    "connection",
    "content-length",
    "content-type",
    "cookie",
    "dnt",
    "forwarded",
    "host",
    "origin",
    "pragma",
    "priority",
    "referer",
    "sec-ch-ua",
    "sec-ch-ua-mobile",
    "sec-ch-ua-platform",
    "sec-fetch-dest",
    "sec-fetch-mode",
    "sec-fetch-site",
    "sec-fetch-user",
    "te",
    "traceparent",
    "tracestate",
    "upgrade-insecure-requests",
    "user-agent",
    "via",
    "x-client-info",
    "x-forwarded-for",
    "x-forwarded-host",
    "x-forwarded-port",
    "x-forwarded-proto",
    "x-real-ip",
    "x-request-id",
    "x-supabase-api-version",
  ]),
);

const FORBIDDEN_AUTHORITY_FIELDS = Object.freeze(
  new Set([
    "userId",
    "caseId",
    "role",
    "memberId",
    "grantId",
    "grantVersion",
    "bucket",
    "path",
    "providerIdentity",
  ]),
);

type DocumentOperation =
  | "UPLOAD_INTENT"
  | "UPLOAD_FINALIZE"
  | "VERSION_DOWNLOAD"
  | "SNAPSHOT";

type RouteName = keyof typeof DRS_DOCUMENT_BFF_ROUTES;

type ClosedRoute = Readonly<{
  name: RouteName;
  operation: DocumentOperation;
  physicalPath: string;
  request: DocumentRequest;
}>;

export interface DrsDocumentEdgePort {
  invoke(request: Request): Promise<Response>;
}

export type DrsDocumentBffDependencies = Readonly<{
  applicationOrigin: string;
  storageOrigin: string;
  sessionCookieName: string;
  edgePort: DrsDocumentEdgePort;
  guardDependencies?: DrsSessionBootstrapDependencies;
}>;

export const DRS_DOCUMENT_BFF_ROUTES = Object.freeze({
  uploadIntent: Object.freeze({
    method: "POST",
    logicalPath: "/api/drs/documents/upload-intents",
    physicalPath: "/functions/v1/drs-document-upload-intent",
    operation: "UPLOAD_INTENT",
  }),
  uploadFinalize: Object.freeze({
    method: "POST",
    logicalPath: "/api/drs/documents/upload-intents/finalize",
    physicalPath: "/functions/v1/drs-document-upload-finalize",
    operation: "UPLOAD_FINALIZE",
  }),
  versionDownload: Object.freeze({
    method: "GET",
    logicalPath: "/api/drs/document-versions/",
    physicalPath: "/functions/v1/drs-document-version-download/",
    operation: "VERSION_DOWNLOAD",
  }),
  snapshot: Object.freeze({
    method: "POST",
    logicalPath: "/api/drs/document-snapshots",
    physicalPath: "/functions/v1/drs-document-snapshot",
    operation: "SNAPSHOT",
  }),
});

// POST /api/drs/_internal/document-operation-authorize
const GUARD_REQUEST_CONTRACT: DrsBffRequestContract = Object.freeze({
  method: "POST",
  pathname: GUARD_PATH,
  queryFields: Object.freeze([]),
  jsonBodyFields: Object.freeze([
    Object.freeze({
      name: "schemaVersion",
      scalarType: "string" as const,
      validate: (value: string | number | boolean) => value === GUARD_SCHEMA,
    }),
    Object.freeze({
      name: "operation",
      scalarType: "string" as const,
      validate: (value: string | number | boolean) =>
        value === "UPLOAD_INTENT" || value === "UPLOAD_FINALIZE" ||
        value === "VERSION_DOWNLOAD" || value === "SNAPSHOT",
    }),
  ]),
});

class AdapterFailure extends Error {
  readonly status: 400 | 401 | 403 | 503;
  constructor(status: 400 | 401 | 403 | 503) {
    super("DOCUMENT_BFF_REJECTED");
    this.name = "AdapterFailure";
    this.status = status;
  }
}

function invalidRequest(): never {
  throw new AdapterFailure(400);
}

function contextUnavailable(): never {
  throw new AdapterFailure(503);
}

function hasExactOwnKeys(
  candidate: unknown,
  expected: readonly string[],
): candidate is Record<string, unknown> {
  if (
    candidate === null || typeof candidate !== "object" ||
    Array.isArray(candidate) ||
    Object.getPrototypeOf(candidate) !== Object.prototype
  ) return false;
  const keys = Object.keys(candidate);
  return keys.length === expected.length &&
    expected.every((key) =>
      Object.prototype.hasOwnProperty.call(candidate, key)
    );
}

function exactHttpsOrigin(value: unknown): value is string {
  if (typeof value !== "string" || value.length === 0) return false;
  try {
    const parsed = new URL(value);
    return parsed.protocol === "https:" && parsed.origin === value &&
      parsed.username === "" && parsed.password === "" &&
      parsed.pathname === "/" && parsed.search === "" && parsed.hash === "";
  } catch {
    return false;
  }
}

function assertDependencies(
  dependencies: DrsDocumentBffDependencies | undefined,
  injectedAcceptedGuard: DrsBffGuard | undefined,
): asserts dependencies is DrsDocumentBffDependencies {
  if (
    !dependencies || !exactHttpsOrigin(dependencies.applicationOrigin) ||
    !exactHttpsOrigin(dependencies.storageOrigin) ||
    typeof dependencies.sessionCookieName !== "string" ||
    !/^__Host-[A-Za-z0-9_-]{1,64}$/u.test(dependencies.sessionCookieName) ||
    !dependencies.edgePort ||
    typeof dependencies.edgePort.invoke !== "function" ||
    (injectedAcceptedGuard !== undefined &&
      typeof injectedAcceptedGuard.authorize !== "function")
  ) throw new TypeError("INVALID_DRS_DOCUMENT_BFF_DEPENDENCIES");
}

function jsonHeaders(): Headers {
  return new Headers({
    "cache-control": "no-store",
    "content-type": JSON_CONTENT_TYPE,
    "pragma": "no-cache",
    "referrer-policy": "no-referrer",
    "x-content-type-options": "nosniff",
  });
}

function jsonResponse(
  status: number,
  body: Readonly<Record<string, unknown>>,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: jsonHeaders(),
  });
}

function failureResponse(status: 400 | 401 | 403 | 503): Response {
  if (status === 400) return jsonResponse(400, { state: "INVALID_REQUEST" });
  if (status === 401) return jsonResponse(401, { state: "AUTH_REQUIRED" });
  return jsonResponse(status, { state: "CONTEXT_UNAVAILABLE" });
}

function guardFailureResponse(candidate: unknown): Response {
  try {
    if (candidate && typeof candidate === "object") {
      const record = candidate as Record<string, unknown>;
      if (record.status === 400 && record.code === "INVALID_REQUEST") {
        return failureResponse(400);
      }
      if (record.status === 401 && record.code === "AUTH_REQUIRED") {
        return failureResponse(401);
      }
      if (record.status === 403) return failureResponse(403);
      if (record.status === 503 && record.code === "CONTEXT_UNAVAILABLE") {
        return failureResponse(503);
      }
    }
  } catch {
    // A hostile thrown value is projected only as the closed failure below.
  }
  return failureResponse(503);
}

function assertClosedLogicalHeaders(
  request: Request,
  applicationOrigin: string,
): void {
  for (const [name] of request.headers) {
    if (!LOGICAL_REQUEST_HEADER_ALLOWLIST.has(name)) invalidRequest();
    if (name.startsWith("x-") && !LOGICAL_REQUEST_HEADER_ALLOWLIST.has(name)) {
      invalidRequest();
    }
  }
  if (
    !request.headers.has("authorization") || !request.headers.has("cookie") ||
    request.headers.get("origin") !== applicationOrigin ||
    request.headers.get("sec-fetch-site") !== "same-origin"
  ) invalidRequest();
}

function exactSessionCookie(request: Request, configuredName: string): string {
  const raw = request.headers.get("cookie");
  if (raw === null || raw.length === 0 || raw.length > 8_192) invalidRequest();
  const matches: string[] = [];
  for (const segment of raw.split(";")) {
    const trimmed = segment.trim();
    const separator = trimmed.indexOf("=");
    if (separator <= 0) continue;
    const name = trimmed.slice(0, separator);
    const value = trimmed.slice(separator + 1);
    if (name === configuredName) {
      if (!COOKIE_VALUE.test(value)) invalidRequest();
      matches.push(`${name}=${value}`);
    }
  }
  if (matches.length !== 1) invalidRequest();
  return matches[0];
}

async function cancelReader(
  reader: ReadableStreamDefaultReader<Uint8Array>,
): Promise<void> {
  try {
    await reader.cancel();
  } catch {
    // Cancellation is best-effort after the request/response is already closed.
  }
}

async function cancelBody(
  body: ReadableStream<Uint8Array> | null,
): Promise<void> {
  if (body === null) return;
  try {
    const reader = body.getReader();
    await cancelReader(reader);
  } catch {
    try {
      await body.cancel();
    } catch {
      // The boundary remains failed closed if a hostile stream cannot cancel.
    }
  }
}

async function readBoundedBytes(
  body: ReadableStream<Uint8Array> | null,
  maximum: number,
  failureStatus: 400 | 503,
): Promise<Uint8Array> {
  if (body === null) throw new AdapterFailure(failureStatus);
  let reader: ReadableStreamDefaultReader<Uint8Array>;
  try {
    reader = body.getReader();
  } catch {
    throw new AdapterFailure(failureStatus);
  }
  const chunks: Uint8Array[] = [];
  let byteLength = 0;
  try {
    while (true) {
      const step = await reader.read();
      if (step.done) break;
      if (!(step.value instanceof Uint8Array)) {
        await cancelReader(reader);
        throw new AdapterFailure(failureStatus);
      }
      byteLength += step.value.byteLength;
      if (byteLength > maximum) {
        await cancelReader(reader);
        throw new AdapterFailure(failureStatus);
      }
      chunks.push(step.value);
    }
  } catch (failure) {
    await cancelReader(reader);
    if (failure instanceof AdapterFailure) throw failure;
    throw new AdapterFailure(failureStatus);
  }
  if (byteLength === 0) throw new AdapterFailure(failureStatus);
  const bytes = new Uint8Array(byteLength);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes;
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
        let memberName: unknown;
        try {
          memberName = JSON.parse(raw.slice(stringStart, end));
        } catch {
          return false;
        }
        if (typeof memberName !== "string") return false;
        if (seen.has(memberName)) return true;
        seen.add(memberName);
      }
      stringStart = -1;
      continue;
    }
    if (character === '"') stringStart = index;
    else if (character === "{" || character === "[") depth += 1;
    else if (character === "}" || character === "]") depth -= 1;
  }
  return false;
}

function containsForbiddenAuthorityField(candidate: unknown): boolean {
  if (Array.isArray(candidate)) {
    return candidate.some(containsForbiddenAuthorityField);
  }
  if (
    candidate === null || typeof candidate !== "object" ||
    Object.getPrototypeOf(candidate) !== Object.prototype
  ) return false;
  for (const [name, value] of Object.entries(candidate)) {
    if (FORBIDDEN_AUTHORITY_FIELDS.has(name)) return true;
    if (containsForbiddenAuthorityField(value)) return true;
  }
  return false;
}

async function readClosedPostBody(request: Request): Promise<unknown> {
  if (
    !JSON_CONTENT_TYPE_PATTERN.test(request.headers.get("content-type") ?? "")
  ) {
    invalidRequest();
  }
  const declaredLength = request.headers.get("content-length");
  if (declaredLength !== null) {
    if (!/^(?:0|[1-9]\d*)$/u.test(declaredLength)) {
      await cancelBody(request.body);
      invalidRequest();
    }
    const parsed = Number(declaredLength);
    if (!Number.isSafeInteger(parsed) || parsed > MAX_REQUEST_BODY_BYTES) {
      await cancelBody(request.body);
      invalidRequest();
    }
  }
  const bytes = await readBoundedBytes(
    request.body,
    MAX_REQUEST_BODY_BYTES,
    400,
  );
  if (declaredLength !== null && Number(declaredLength) !== bytes.byteLength) {
    invalidRequest();
  }
  let raw: string;
  let payload: unknown;
  try {
    raw = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    if (hasDuplicateTopLevelJsonMemberName(raw)) invalidRequest();
    payload = JSON.parse(raw);
  } catch (failure) {
    if (failure instanceof AdapterFailure) throw failure;
    invalidRequest();
  }
  if (containsForbiddenAuthorityField(payload)) invalidRequest();
  return payload;
}

function exactDownloadSelector(pathname: string): string | null {
  const prefix = DRS_DOCUMENT_BFF_ROUTES.versionDownload.logicalPath;
  const suffix = "/download";
  if (
    !pathname.startsWith(prefix) || !pathname.endsWith(suffix) ||
    pathname.includes("%")
  ) return null;
  const selector = pathname.slice(prefix.length, -suffix.length);
  return OPAQUE_VERSION_REF.test(selector) ? selector : null;
}

async function closeLogicalRoute(request: Request): Promise<ClosedRoute> {
  const url = new URL(request.url);
  if (url.search !== "") invalidRequest();
  if (
    request.method === "POST" &&
    url.pathname === DRS_DOCUMENT_BFF_ROUTES.uploadIntent.logicalPath
  ) {
    const parsed = parseUploadIntentRequest(await readClosedPostBody(request));
    if (
      !parsed ||
      (parsed.mode === "NEW_VERSION" &&
        !OPAQUE_DOCUMENT_REF.test(parsed.documentRef ?? ""))
    ) {
      invalidRequest();
    }
    return Object.freeze({
      name: "uploadIntent",
      operation: "UPLOAD_INTENT",
      physicalPath: DRS_DOCUMENT_BFF_ROUTES.uploadIntent.physicalPath,
      request: parsed,
    });
  }
  if (
    request.method === "POST" &&
    url.pathname === DRS_DOCUMENT_BFF_ROUTES.uploadFinalize.logicalPath
  ) {
    const parsed = parseFinalizeRequest(await readClosedPostBody(request));
    if (!parsed || !OPAQUE_INTENT_REF.test(parsed.intentRef)) invalidRequest();
    return Object.freeze({
      name: "uploadFinalize",
      operation: "UPLOAD_FINALIZE",
      physicalPath: DRS_DOCUMENT_BFF_ROUTES.uploadFinalize.physicalPath,
      request: parsed,
    });
  }
  if (
    request.method === "POST" &&
    url.pathname === DRS_DOCUMENT_BFF_ROUTES.snapshot.logicalPath
  ) {
    const parsed = parseSnapshotRequest(await readClosedPostBody(request));
    if (
      !parsed ||
      parsed.versionRefs.some((value) => !OPAQUE_VERSION_REF.test(value))
    ) {
      invalidRequest();
    }
    return Object.freeze({
      name: "snapshot",
      operation: "SNAPSHOT",
      physicalPath: DRS_DOCUMENT_BFF_ROUTES.snapshot.physicalPath,
      request: parsed,
    });
  }
  if (request.method === "GET") {
    const selector = exactDownloadSelector(url.pathname);
    if (
      selector !== null && request.body === null &&
      !request.headers.has("content-type") &&
      !request.headers.has("content-length")
    ) {
      return Object.freeze({
        name: "versionDownload",
        operation: "VERSION_DOWNLOAD",
        physicalPath:
          `${DRS_DOCUMENT_BFF_ROUTES.versionDownload.physicalPath}${selector}`,
        request: Object.freeze({ versionRef: selector }),
      });
    }
  }
  invalidRequest();
}

function canonicalGuardRequest(
  applicationOrigin: string,
  operation: DocumentOperation,
  request: Request,
  cookie: string,
): Request {
  return new Request(`${applicationOrigin}${GUARD_PATH}`, {
    method: "POST",
    headers: {
      authorization: request.headers.get("authorization") ?? "",
      "content-type": JSON_CONTENT_TYPE,
      cookie,
      origin: applicationOrigin,
      "sec-fetch-site": "same-origin",
    },
    body: JSON.stringify({ schemaVersion: GUARD_SCHEMA, operation }),
  });
}

function fixedEdgeRequest(
  route: ClosedRoute,
  request: Request,
  cookie: string,
): Request {
  const headers = new Headers({
    authorization: request.headers.get("authorization") ?? "",
    cookie,
    origin: request.headers.get("origin") ?? "",
    "sec-fetch-site": "same-origin",
  });
  const init: RequestInit = {
    method: route.name === "versionDownload" ? "GET" : "POST",
    headers,
  };
  if (route.name !== "versionDownload") {
    headers.set("content-type", JSON_CONTENT_TYPE);
    init.body = JSON.stringify(route.request);
  }
  return new Request(`${EDGE_ORIGIN}${route.physicalPath}`, init);
}

async function readEdgeJson(response: Response): Promise<unknown> {
  if (
    !JSON_CONTENT_TYPE_PATTERN.test(response.headers.get("content-type") ?? "")
  ) {
    await cancelBody(response.body);
    contextUnavailable();
  }
  const bytes = await readBoundedBytes(
    response.body,
    MAX_EDGE_JSON_RESPONSE_BYTES,
    503,
  );
  try {
    const raw = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    if (hasDuplicateTopLevelJsonMemberName(raw)) contextUnavailable();
    return JSON.parse(raw);
  } catch (failure) {
    if (failure instanceof AdapterFailure) throw failure;
    contextUnavailable();
  }
}

function canonicalInstant(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const instant = Date.parse(value);
  return Number.isFinite(instant) && new Date(instant).toISOString() === value;
}

function hasControlCharacter(value: string): boolean {
  for (const character of value) {
    const codePoint = character.codePointAt(0) ?? 0;
    if (codePoint <= 31 || codePoint === 127) return true;
  }
  return false;
}

function validSignedUploadUrl(
  value: unknown,
  storageOrigin: string,
): value is string {
  if (
    typeof value !== "string" || hasControlCharacter(value) ||
    new TextEncoder().encode(value).byteLength > MAX_SIGNED_UPLOAD_URL_BYTES
  ) return false;
  try {
    const parsed = new URL(value);
    const prefix = "/storage/v1/object/upload/sign/";
    const entries = Array.from(parsed.searchParams.entries());
    return parsed.protocol === "https:" && parsed.origin === storageOrigin &&
      parsed.username === "" && parsed.password === "" && parsed.hash === "" &&
      parsed.pathname.startsWith(prefix) &&
      parsed.pathname.length > prefix.length &&
      entries.length === 1 && entries[0][0] === "token" &&
      entries[0][1].length > 0;
  } catch {
    return false;
  }
}

function validUploadIntentResponse(
  candidate: unknown,
  request: UploadIntentRequest,
  storageOrigin: string,
): candidate is Record<string, unknown> {
  if (
    !hasExactOwnKeys(candidate, [
      "schemaVersion",
      "state",
      "intentRef",
      "intentExpiresAt",
      "upload",
      "limits",
    ]) ||
    candidate.schemaVersion !==
      "laibe.drs-document-upload-intent.response.v1" ||
    candidate.state !== "UPLOAD_INTENT_CREATED" ||
    !OPAQUE_INTENT_REF.test(String(candidate.intentRef)) ||
    !canonicalInstant(candidate.intentExpiresAt) ||
    !hasExactOwnKeys(candidate.upload, [
      "method",
      "signedUploadUrl",
      "nativeExpiresAt",
      "requiredHeaders",
    ]) || candidate.upload.method !== "SIGNED_UPLOAD" ||
    !validSignedUploadUrl(candidate.upload.signedUploadUrl, storageOrigin) ||
    !canonicalInstant(candidate.upload.nativeExpiresAt) ||
    Date.parse(candidate.upload.nativeExpiresAt) <
      Date.parse(candidate.intentExpiresAt) ||
    Date.parse(candidate.upload.nativeExpiresAt) -
          Date.parse(candidate.intentExpiresAt) >
      2 * 60 * 60 * 1_000 ||
    !hasExactOwnKeys(candidate.upload.requiredHeaders, ["content-type"]) ||
    candidate.upload.requiredHeaders["content-type"] !== request.declaredMime ||
    !hasExactOwnKeys(candidate.limits, ["maxBytes", "allowedMime"]) ||
    candidate.limits.maxBytes !== MAX_DOCUMENT_BYTES ||
    !Array.isArray(candidate.limits.allowedMime) ||
    candidate.limits.allowedMime.length !== 3 ||
    candidate.limits.allowedMime[0] !== "application/pdf" ||
    candidate.limits.allowedMime[1] !== "image/jpeg" ||
    candidate.limits.allowedMime[2] !== "image/png"
  ) return false;
  return true;
}

function validFinalizeCreated(
  candidate: unknown,
): candidate is Record<string, unknown> {
  return hasExactOwnKeys(candidate, [
    "schemaVersion",
    "state",
    "documentRef",
    "versionRef",
    "receiptRef",
  ]) &&
    candidate.schemaVersion ===
      "laibe.drs-document-upload-finalize.response.v1" &&
    candidate.state === "FORMAL_VERSION_CREATED" &&
    OPAQUE_DOCUMENT_REF.test(String(candidate.documentRef)) &&
    OPAQUE_VERSION_REF.test(String(candidate.versionRef)) &&
    OPAQUE_RECEIPT_REF.test(String(candidate.receiptRef));
}

function validFinalizePending(
  candidate: unknown,
): candidate is Record<string, unknown> {
  return hasExactOwnKeys(candidate, ["schemaVersion", "state", "intentRef"]) &&
    candidate.schemaVersion ===
      "laibe.drs-document-upload-finalize.response.v1" &&
    candidate.state === "VALIDATION_PENDING" &&
    OPAQUE_INTENT_REF.test(String(candidate.intentRef));
}

function validConflict(
  candidate: unknown,
  schemaVersion: string,
): candidate is Record<string, unknown> {
  return hasExactOwnKeys(candidate, ["schemaVersion", "state"]) &&
    candidate.schemaVersion === schemaVersion &&
    (candidate.state === "IDEMPOTENCY_CONFLICT" ||
      candidate.state === "VERSION_CONFLICT");
}

function validSnapshotCreated(
  candidate: unknown,
): candidate is Record<string, unknown> {
  return hasExactOwnKeys(candidate, [
    "schemaVersion",
    "state",
    "snapshotRef",
    "receiptRef",
    "canonicalPayloadSha256",
  ]) && candidate.schemaVersion === "laibe.drs-document-snapshot.response.v1" &&
    candidate.state === "SNAPSHOT_RECORDED" &&
    OPAQUE_SNAPSHOT_REF.test(String(candidate.snapshotRef)) &&
    OPAQUE_RECEIPT_REF.test(String(candidate.receiptRef)) &&
    SHA256.test(String(candidate.canonicalPayloadSha256));
}

function validSanitizedEdgeFailure(
  status: number,
  candidate: unknown,
): candidate is Record<string, unknown> {
  if (!hasExactOwnKeys(candidate, ["state"])) return false;
  if (status === 400) return candidate.state === "INVALID_REQUEST";
  if (status === 401) return candidate.state === "AUTH_REQUIRED";
  if (status === 403 || status === 503) {
    return candidate.state === "CONTEXT_UNAVAILABLE";
  }
  return false;
}

async function projectEdgeJsonResponse(
  route: ClosedRoute,
  edgeResponse: Response,
  storageOrigin: string,
): Promise<Response> {
  const candidate = await readEdgeJson(edgeResponse);
  if (validSanitizedEdgeFailure(edgeResponse.status, candidate)) {
    return jsonResponse(edgeResponse.status, candidate);
  }
  if (
    route.name === "uploadIntent" && edgeResponse.status === 201 &&
    validUploadIntentResponse(
      candidate,
      route.request as UploadIntentRequest,
      storageOrigin,
    )
  ) return jsonResponse(201, candidate);
  if (route.name === "uploadFinalize") {
    if (edgeResponse.status === 201 && validFinalizeCreated(candidate)) {
      return jsonResponse(201, candidate);
    }
    if (edgeResponse.status === 202 && validFinalizePending(candidate)) {
      return jsonResponse(202, candidate);
    }
    if (
      edgeResponse.status === 409 &&
      validConflict(
        candidate,
        "laibe.drs-document-upload-finalize.response.v1",
      )
    ) return jsonResponse(409, candidate);
  }
  if (route.name === "snapshot") {
    if (edgeResponse.status === 201 && validSnapshotCreated(candidate)) {
      return jsonResponse(201, candidate);
    }
    if (
      edgeResponse.status === 409 &&
      validConflict(candidate, "laibe.drs-document-snapshot.response.v1")
    ) return jsonResponse(409, candidate);
  }
  contextUnavailable();
}

function canonicalDownloadLength(response: Response): number | null {
  const raw = response.headers.get("content-length");
  if (raw === null) return null;
  if (!/^[1-9]\d*$/u.test(raw)) contextUnavailable();
  const parsed = Number(raw);
  if (!Number.isSafeInteger(parsed) || parsed > MAX_DOCUMENT_BYTES) {
    contextUnavailable();
  }
  return parsed;
}

function boundedDownloadStream(
  body: ReadableStream<Uint8Array>,
  expectedLength: number | null,
): ReadableStream<Uint8Array> {
  const reader = body.getReader();
  let cumulativeBytes = 0;
  let terminal = false;
  async function terminate(
    controller: ReadableStreamDefaultController<Uint8Array>,
  ): Promise<void> {
    if (terminal) return;
    terminal = true;
    await cancelReader(reader);
    controller.error(new AdapterFailure(503));
  }
  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      if (terminal) return;
      let step: ReadableStreamReadResult<Uint8Array>;
      try {
        step = await reader.read();
      } catch {
        await terminate(controller);
        return;
      }
      if (step.done) {
        if (
          cumulativeBytes === 0 ||
          (expectedLength !== null && cumulativeBytes !== expectedLength)
        ) {
          await terminate(controller);
          return;
        }
        terminal = true;
        controller.close();
        return;
      }
      if (!(step.value instanceof Uint8Array)) {
        await terminate(controller);
        return;
      }
      cumulativeBytes += step.value.byteLength;
      if (
        cumulativeBytes > MAX_DOCUMENT_BYTES ||
        (expectedLength !== null && cumulativeBytes > expectedLength)
      ) {
        await terminate(controller);
        return;
      }
      controller.enqueue(step.value);
    },
    async cancel() {
      if (terminal) return;
      terminal = true;
      await cancelReader(reader);
    },
  });
}

async function projectDownloadResponse(
  edgeResponse: Response,
): Promise<Response> {
  if (edgeResponse.status !== 200) {
    const candidate = await readEdgeJson(edgeResponse);
    if (validSanitizedEdgeFailure(edgeResponse.status, candidate)) {
      return jsonResponse(edgeResponse.status, candidate);
    }
    contextUnavailable();
  }
  let contentLength: number | null;
  try {
    contentLength = canonicalDownloadLength(edgeResponse);
  } catch {
    await cancelBody(edgeResponse.body);
    contextUnavailable();
  }
  if (edgeResponse.body === null) contextUnavailable();
  let stream: ReadableStream<Uint8Array>;
  try {
    stream = boundedDownloadStream(edgeResponse.body, contentLength);
  } catch {
    await cancelBody(edgeResponse.body);
    contextUnavailable();
  }
  const headers = new Headers({
    "cache-control": "private, no-store",
    "content-disposition": "attachment",
    "content-type": "application/octet-stream",
    "x-content-type-options": "nosniff",
  });
  if (contentLength !== null) {
    headers.set("content-length", String(contentLength));
  }
  return new Response(stream, { status: 200, headers });
}

export function createDrsDocumentBffAdapter(
  dependencies: DrsDocumentBffDependencies | undefined,
  injectedAcceptedGuard?: DrsBffGuard,
): (request: Request) => Promise<Response> {
  assertDependencies(dependencies, injectedAcceptedGuard);
  const acceptedGuard = injectedAcceptedGuard ??
    createDrsBffGuard(dependencies.guardDependencies, GUARD_REQUEST_CONTRACT);
  return async function drsDocumentBffAdapter(
    request: Request,
  ): Promise<Response> {
    let route: ClosedRoute;
    let cookie: string;
    try {
      assertClosedLogicalHeaders(request, dependencies.applicationOrigin);
      route = await closeLogicalRoute(request);
      cookie = exactSessionCookie(request, dependencies.sessionCookieName);
    } catch (failure) {
      if (failure instanceof AdapterFailure) {
        return failureResponse(failure.status);
      }
      return failureResponse(400);
    }

    try {
      await acceptedGuard.authorize(canonicalGuardRequest(
        dependencies.applicationOrigin,
        route.operation,
        request,
        cookie,
      ));
    } catch (failure) {
      return guardFailureResponse(failure);
    }

    let edgeResponse: Response;
    try {
      edgeResponse = await dependencies.edgePort.invoke(
        fixedEdgeRequest(route, request, cookie),
      );
    } catch {
      return failureResponse(503);
    }
    try {
      return route.name === "versionDownload"
        ? await projectDownloadResponse(edgeResponse)
        : await projectEdgeJsonResponse(
          route,
          edgeResponse,
          dependencies.storageOrigin,
        );
    } catch {
      return failureResponse(503);
    }
  };
}
