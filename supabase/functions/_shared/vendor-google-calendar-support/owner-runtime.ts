import {
  buildOwnerCalendarStatus,
  OWNER_VENDOR_CALENDAR_READ_SCHEMA,
  OWNER_VENDOR_CALENDAR_TIME_ZONE,
  OwnerCalendarProjectionError,
  type OwnerCalendarProjectionState,
  type OwnerCalendarShareMode,
  parseOwnerCalendarProjectionRequest,
  projectOwnerCalendarEvent,
} from "./owner-projection.ts";

const CANONICAL_SITE_ORIGIN =
  "https://laibe-drs-owner-vendor-20260908.blueleft120.chatgpt.site";
const ERROR_SCHEMA = "laibe.owner-vendor-calendar-error.v1";
const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
const GOOGLE_READ_SCOPES = new Set([
  "https://www.googleapis.com/auth/calendar.events.owned.readonly",
]);
const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

type RuntimeOptions = Readonly<{
  env?: { get(name: string): string | undefined };
  fetch?: typeof fetch;
  now?: () => number;
}>;

type Principal = Readonly<{ userId: string; caseId: string }>;

type PrivateSelection = Readonly<{
  selectionRef: string;
  calendarId: string;
  shareMode: OwnerCalendarShareMode;
}>;

export type PrivateOwnerCalendarProjection = Readonly<{
  state: OwnerCalendarProjectionState;
  caseId: string;
  vendorUserId?: string;
  bindingRef?: string;
  sharingRevision: number | null;
  credentialGeneration?: number;
  credentialDomain?: string;
  googleSubject?: string;
  encryptedCredential?: string;
  tokenExpiresAt?: string;
  grantedScopes?: readonly string[];
  selections: readonly PrivateSelection[];
}>;

type ProviderEvent = Readonly<{
  providerEventId: string;
  selectionRef: string;
  allDay: boolean;
  start: string;
  end: string;
  title?: string;
  description?: string;
  location?: string;
  [key: string]: unknown;
}>;

type ProviderReadResult =
  | Readonly<{ ok: true; events: readonly ProviderEvent[] }>
  | Readonly<{
    ok: false;
    state: "reconnect_required" | "provider_unavailable" | "incomplete";
  }>;

export type OwnerCalendarRuntimeDependencies = Readonly<{
  allowedOrigins: readonly string[];
  backendConfigured: boolean;
  providerConfigured: boolean;
  now: () => number;
  authorize(request: Request): Promise<Principal>;
  loadProjection(principal: Principal): Promise<PrivateOwnerCalendarProjection>;
  readProviderEvents(
    projection: PrivateOwnerCalendarProjection,
    window: Readonly<{ timeMin: string; timeMax: string }>,
  ): Promise<ProviderReadResult>;
  makeEventRef(
    projection: PrivateOwnerCalendarProjection,
    event: ProviderEvent,
  ): Promise<string>;
}>;

class RuntimeFailure extends Error {
  readonly state: string;
  readonly status: number;

  constructor(state: string, status = 503) {
    super(state);
    this.name = "RuntimeFailure";
    this.state = state;
    this.status = status;
  }
}

function fail(state: string, status = 503): never {
  throw new RuntimeFailure(state, status);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function boundedText(value: unknown, maximum: number): value is string {
  return typeof value === "string" && value.length > 0 &&
    value.length <= maximum && !/\p{C}/u.test(value);
}

function positiveInteger(value: unknown): value is number {
  return Number.isSafeInteger(value) && Number(value) > 0;
}

function responseHeaders(origin: string | null): Headers {
  const headers = new Headers({
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    vary: "Origin",
  });
  if (origin) headers.set("access-control-allow-origin", origin);
  return headers;
}

function jsonResponse(
  status: number,
  body: unknown,
  origin: string | null,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: responseHeaders(origin),
  });
}

function acceptedOrigin(
  request: Request,
  dependencies: OwnerCalendarRuntimeDependencies,
): string | null {
  const origin = request.headers.get("origin");
  return origin && dependencies.allowedOrigins.includes(origin) ? origin : null;
}

const PRODUCT_MESSAGES: Readonly<Record<string, string>> = Object.freeze({
  sign_in_required: "登入已失效，請重新登入。",
  authority_denied: "目前帳號無法查看此案件的共享日曆。",
  not_shared: "乙方尚未開放此案件的 Google 日曆。",
  invalid_request: "日曆查詢條件不正確，請重新選擇月份。",
  origin_not_allowed: "此來源無法使用案件日曆。",
  reconnect_required: "乙方需要重新連結 Google 日曆。",
  provider_unavailable: "目前無法讀取 Google 日曆，請稍後再試。",
  incomplete: "目前無法完整取得日曆內容，請稍後再試。",
  temporarily_unavailable: "案件或分享設定已變更，請重新整理日曆。",
  setup_unavailable: "日曆同步功能暫時無法使用，請稍後再試。",
});

function failureResponse(
  request: Request,
  dependencies: OwnerCalendarRuntimeDependencies,
  error: unknown,
): Response {
  const failure = error instanceof RuntimeFailure
    ? error
    : error instanceof OwnerCalendarProjectionError
    ? new RuntimeFailure(error.state, error.status)
    : new RuntimeFailure("setup_unavailable", 503);
  const state = Object.hasOwn(PRODUCT_MESSAGES, failure.state)
    ? failure.state
    : "setup_unavailable";
  const retryable = [
    "provider_unavailable",
    "incomplete",
    "temporarily_unavailable",
    "setup_unavailable",
  ].includes(state);
  return jsonResponse(failure.status, {
    schemaVersion: ERROR_SCHEMA,
    state,
    message: PRODUCT_MESSAGES[state],
    retryable,
  }, acceptedOrigin(request, dependencies));
}

function preflight(
  request: Request,
  dependencies: OwnerCalendarRuntimeDependencies,
  method: "GET" | "POST",
): Response | null {
  if (request.method !== "OPTIONS") return null;
  const origin = acceptedOrigin(request, dependencies);
  const requestedHeaders = (request.headers.get(
    "access-control-request-headers",
  ) ?? "").split(",").map((value) => value.trim().toLowerCase()).filter(
    Boolean,
  );
  if (
    !origin ||
    request.headers.get("access-control-request-method") !== method ||
    requestedHeaders.some((value) =>
      !["authorization", "apikey", "content-type"].includes(value)
    )
  ) {
    return jsonResponse(403, {
      schemaVersion: ERROR_SCHEMA,
      state: "origin_not_allowed",
      message: PRODUCT_MESSAGES.origin_not_allowed,
      retryable: false,
    }, null);
  }
  return new Response(null, {
    status: 204,
    headers: {
      "access-control-allow-origin": origin,
      "access-control-allow-methods": `${method}, OPTIONS`,
      "access-control-allow-headers": "authorization, apikey, content-type",
      "access-control-max-age": "600",
      "cache-control": "no-store",
      vary: "Origin",
    },
  });
}

function assertReady(dependencies: OwnerCalendarRuntimeDependencies): void {
  if (!dependencies.backendConfigured || !dependencies.providerConfigured) {
    fail("setup_unavailable", 503);
  }
}

function safeState(
  projection: PrivateOwnerCalendarProjection,
): OwnerCalendarProjectionState {
  return ["ready", "not_shared", "temporarily_unavailable"].includes(
      projection.state,
    )
    ? projection.state
    : "temporarily_unavailable";
}

function statusBody(projection: PrivateOwnerCalendarProjection) {
  return buildOwnerCalendarStatus({
    state: safeState(projection),
    caseId: projection.caseId,
    sharingRevision: projection.state === "ready"
      ? projection.sharingRevision
      : null,
  });
}

function sameProjection(
  before: PrivateOwnerCalendarProjection,
  after: PrivateOwnerCalendarProjection,
): boolean {
  return before.state === "ready" && after.state === "ready" &&
    before.caseId === after.caseId && before.bindingRef === after.bindingRef &&
    before.sharingRevision === after.sharingRevision &&
    before.credentialGeneration === after.credentialGeneration &&
    before.credentialDomain === after.credentialDomain;
}

async function readClosedJson(request: Request): Promise<unknown> {
  if (
    !/^application\/json(?:\s*;|$)/iu.test(
      request.headers.get("content-type") ?? "",
    )
  ) fail("invalid_request", 400);
  const declared = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(declared) && declared > 4096) {
    fail("invalid_request", 400);
  }
  const bytes = new Uint8Array(await request.arrayBuffer());
  if (bytes.byteLength === 0 || bytes.byteLength > 4096) {
    fail("invalid_request", 400);
  }
  try {
    return JSON.parse(textDecoder.decode(bytes));
  } catch {
    fail("invalid_request", 400);
  }
}

export function createOwnerCalendarStatusHandler(
  dependencies: OwnerCalendarRuntimeDependencies,
) {
  return async function ownerCalendarStatus(
    request: Request,
  ): Promise<Response> {
    const options = preflight(request, dependencies, "GET");
    if (options) return options;
    try {
      if (request.method !== "GET") fail("invalid_request", 405);
      const origin = acceptedOrigin(request, dependencies);
      if (!origin) fail("origin_not_allowed", 403);
      assertReady(dependencies);
      const principal = await dependencies.authorize(request);
      const projection = await dependencies.loadProjection(principal);
      return jsonResponse(200, statusBody(projection), origin);
    } catch (error) {
      return failureResponse(request, dependencies, error);
    }
  };
}

export function createOwnerCalendarEventsReadHandler(
  dependencies: OwnerCalendarRuntimeDependencies,
) {
  return async function ownerCalendarEventsRead(
    request: Request,
  ): Promise<Response> {
    const options = preflight(request, dependencies, "POST");
    if (options) return options;
    try {
      if (request.method !== "POST") fail("invalid_request", 405);
      const origin = acceptedOrigin(request, dependencies);
      if (!origin) fail("origin_not_allowed", 403);
      assertReady(dependencies);
      const body = parseOwnerCalendarProjectionRequest(
        await readClosedJson(request),
      );
      const started = dependencies.now();
      const principal = await dependencies.authorize(request);
      const projection = await dependencies.loadProjection(principal);
      if (projection.state !== "ready") {
        return jsonResponse(200, {
          schemaVersion: OWNER_VENDOR_CALENDAR_READ_SCHEMA,
          state: safeState(projection),
          caseId: projection.caseId,
          sharingRevision: null,
          timeZone: OWNER_VENDOR_CALENDAR_TIME_ZONE,
          complete: true,
          events: [],
        }, origin);
      }

      const providerResult = await dependencies.readProviderEvents(projection, {
        timeMin: body.timeMin,
        timeMax: body.timeMax,
      });
      if (!providerResult.ok) {
        fail(
          providerResult.state,
          providerResult.state === "reconnect_required" ? 409 : 503,
        );
      }

      const confirmed = await dependencies.loadProjection(principal);
      if (!sameProjection(projection, confirmed)) {
        fail("temporarily_unavailable", 409);
      }
      if (dependencies.now() - started > 12_000) fail("incomplete", 503);

      const selectionByRef = new Map(
        projection.selections.map((selection) => [
          selection.selectionRef,
          selection,
        ]),
      );
      if (providerResult.events.length > 250) fail("incomplete", 503);
      const projected = await Promise.all(providerResult.events.map(
        async (event) => {
          const selection = selectionByRef.get(event.selectionRef);
          if (!selection) fail("incomplete", 503);
          return projectOwnerCalendarEvent({
            ...event,
            eventRef: await dependencies.makeEventRef(projection, event),
          }, selection.shareMode);
        },
      ));
      projected.sort((left, right) =>
        left.start.localeCompare(right.start) ||
        left.end.localeCompare(right.end) ||
        left.selectionRef.localeCompare(right.selectionRef) ||
        left.eventRef.localeCompare(right.eventRef)
      );

      return jsonResponse(200, {
        schemaVersion: OWNER_VENDOR_CALENDAR_READ_SCHEMA,
        state: "ready",
        caseId: projection.caseId,
        sharingRevision: projection.sharingRevision,
        timeZone: OWNER_VENDOR_CALENDAR_TIME_ZONE,
        complete: true,
        events: projected,
      }, origin);
    } catch (error) {
      return failureResponse(request, dependencies, error);
    }
  };
}

function parseAllowedOrigins(value: string | undefined): string[] {
  if (!value) return [];
  let values: unknown = value.split(/[\s,]+/u).filter(Boolean);
  if (value.trim().startsWith("[")) {
    try {
      values = JSON.parse(value);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(values)) return [];
  const origins: string[] = [];
  for (const candidate of values) {
    if (typeof candidate !== "string") continue;
    try {
      const url = new URL(candidate);
      if (url.origin !== candidate || url.protocol !== "https:") continue;
      origins.push(url.origin);
    } catch {
      // Invalid configured origins remain closed.
    }
  }
  return origins;
}

function fromBase64Url(value: string): Uint8Array {
  const normalized = value.replace(/-/gu, "+").replace(/_/gu, "/");
  const padded = normalized + "=".repeat((4 - normalized.length % 4) % 4);
  try {
    const binary = atob(padded);
    return Uint8Array.from(binary, (character) => character.charCodeAt(0));
  } catch {
    return new Uint8Array();
  }
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/gu, "-").replace(/\//gu, "_").replace(
    /=+$/gu,
    "",
  );
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const buffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buffer).set(bytes);
  return buffer;
}

function validEncryptionKey(value: string | undefined): value is string {
  return typeof value === "string" && fromBase64Url(value).byteLength === 32;
}

async function encryptionKey(encodedKey: string): Promise<CryptoKey> {
  return await crypto.subtle.importKey(
    "raw",
    toArrayBuffer(fromBase64Url(encodedKey)),
    "AES-GCM",
    false,
    ["decrypt"],
  );
}

async function decryptCredential(
  envelope: string,
  encodedKey: string,
  binding: Readonly<Record<string, unknown>>,
): Promise<unknown> {
  const [version, iv, ciphertext, extra] = envelope.split(".");
  if (version !== "v2" || !iv || !ciphertext || extra !== undefined) {
    fail("reconnect_required", 409);
  }
  try {
    const plaintext = await crypto.subtle.decrypt(
      {
        name: "AES-GCM",
        iv: toArrayBuffer(fromBase64Url(iv)),
        additionalData: textEncoder.encode(JSON.stringify(binding)),
      },
      await encryptionKey(encodedKey),
      toArrayBuffer(fromBase64Url(ciphertext)),
    );
    return JSON.parse(textDecoder.decode(plaintext));
  } catch {
    fail("reconnect_required", 409);
  }
}

type Credential = Readonly<{
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
  scopes: readonly string[];
}>;

function parseCredential(value: unknown): Credential {
  if (!isRecord(value)) fail("reconnect_required", 409);
  if (
    !boundedText(value.accessToken, 16_384) ||
    !boundedText(value.refreshToken, 16_384) ||
    !boundedText(value.expiresAt, 40) ||
    !Number.isFinite(Date.parse(value.expiresAt)) ||
    !Array.isArray(value.scopes) || value.scopes.length === 0 ||
    value.scopes.length > 16 ||
    value.scopes.some((scope) => !boundedText(scope, 256)) ||
    !value.scopes.some((scope) => GOOGLE_READ_SCOPES.has(scope as string))
  ) {
    fail("reconnect_required", 409);
  }
  return {
    accessToken: value.accessToken,
    refreshToken: value.refreshToken,
    expiresAt: value.expiresAt,
    scopes: value.scopes as string[],
  };
}

async function readBoundedJson(
  response: Response,
  maximumBytes: number,
): Promise<Record<string, unknown>> {
  if (
    !response.body || !/^application\/json(?:\s*;|$)/iu.test(
      response.headers.get("content-type") ?? "",
    )
  ) fail("provider_unavailable", 503);
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const next = await reader.read();
    if (next.done) break;
    total += next.value.byteLength;
    if (total > maximumBytes) {
      await reader.cancel();
      fail("incomplete", 503);
    }
    chunks.push(next.value);
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  try {
    const value = JSON.parse(textDecoder.decode(bytes));
    if (!isRecord(value)) fail("provider_unavailable", 503);
    return value;
  } catch (error) {
    if (error instanceof RuntimeFailure) throw error;
    fail("provider_unavailable", 503);
  }
}

function validDate(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/u.test(value) &&
    Number.isFinite(Date.parse(value)) &&
    new Date(value).toISOString().slice(0, 10) === value;
}

function taipeiTime(value: unknown): string | null {
  if (
    typeof value !== "string" ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/u
      .test(value)
  ) return null;
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) return null;
  return new Date(parsed + 8 * 3_600_000).toISOString().replace(
    /\.000Z$/u,
    "+08:00",
  ).replace(/Z$/u, "+08:00");
}

function projectProviderEvent(
  value: unknown,
  selectionRef: string,
): ProviderEvent | null {
  if (!isRecord(value)) fail("incomplete", 503);
  if (value.status === "cancelled" || value.transparency === "transparent") {
    return null;
  }
  if (
    !boundedText(value.id, 2048) || !isRecord(value.start) ||
    !isRecord(value.end)
  ) fail("incomplete", 503);
  let start: string;
  let end: string;
  let allDay: boolean;
  if (Object.hasOwn(value.start, "date") || Object.hasOwn(value.end, "date")) {
    if (
      !validDate(value.start.date) || !validDate(value.end.date) ||
      value.end.date <= value.start.date ||
      Object.hasOwn(value.start, "dateTime") ||
      Object.hasOwn(value.end, "dateTime")
    ) fail("incomplete", 503);
    start = value.start.date;
    end = value.end.date;
    allDay = true;
  } else {
    const from = taipeiTime(value.start.dateTime);
    const to = taipeiTime(value.end.dateTime);
    if (!from || !to || Date.parse(to) <= Date.parse(from)) {
      fail("incomplete", 503);
    }
    start = from;
    end = to;
    allDay = false;
  }
  if (
    value.summary !== undefined &&
    (typeof value.summary !== "string" || value.summary.length > 200 ||
      /\p{C}/u.test(value.summary))
  ) fail("incomplete", 503);
  return {
    providerEventId: value.id,
    selectionRef,
    allDay,
    start,
    end,
    ...(typeof value.summary === "string" ? { title: value.summary } : {}),
  };
}

async function hmacEventReference(
  encodedKey: string,
  projection: PrivateOwnerCalendarProjection,
  event: ProviderEvent,
): Promise<string> {
  if (!projection.bindingRef) fail("incomplete", 503);
  const material = await crypto.subtle.importKey(
    "raw",
    toArrayBuffer(fromBase64Url(encodedKey)),
    "HKDF",
    false,
    ["deriveKey"],
  );
  const subkey = await crypto.subtle.deriveKey(
    {
      name: "HKDF",
      hash: "SHA-256",
      salt: textEncoder.encode("laibe.calendar.v2"),
      info: textEncoder.encode("event-reference"),
    },
    material,
    {
      name: "HMAC",
      hash: "SHA-256",
      length: 256,
    },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    subkey,
    textEncoder.encode(JSON.stringify([
      projection.bindingRef,
      event.selectionRef,
      event.providerEventId,
      event.start,
    ])),
  );
  return toBase64Url(new Uint8Array(signature));
}

async function responseJson(
  request: typeof fetch,
  url: string,
  init: RequestInit,
  timeoutMs: number,
): Promise<{ response: Response; value: Record<string, unknown> }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await request(url, {
      ...init,
      redirect: "error",
      signal: controller.signal,
    });
    const value = await readBoundedJson(response, 1_048_576);
    return { response, value };
  } catch (error) {
    if (error instanceof RuntimeFailure) throw error;
    fail("provider_unavailable", 503);
  } finally {
    clearTimeout(timer);
  }
}

function normalizeProjection(value: unknown): PrivateOwnerCalendarProjection {
  if (!isRecord(value)) fail("setup_unavailable", 503);
  if (value.ok !== true) {
    const state = value.state === "authority_denied"
      ? "authority_denied"
      : "temporarily_unavailable";
    fail(state, state === "authority_denied" ? 403 : 503);
  }
  if (!UUID.test(String(value.case_id ?? ""))) fail("setup_unavailable", 503);
  if (value.state === "not_shared") {
    return {
      state: "not_shared",
      caseId: value.case_id as string,
      sharingRevision: null,
      selections: [],
    };
  }
  if (
    value.state !== "ready" || !UUID.test(String(value.vendor_user_id ?? "")) ||
    !UUID.test(String(value.binding_ref ?? "")) ||
    !positiveInteger(value.sharing_revision) ||
    !positiveInteger(value.credential_generation) ||
    !boundedText(value.credential_domain, 128) ||
    !boundedText(value.google_subject, 255) ||
    !boundedText(value.encrypted_credential, 65_536) ||
    !boundedText(value.token_expires_at, 40) ||
    !Array.isArray(value.granted_scopes) ||
    !Array.isArray(value.selections) || value.selections.length !== 1
  ) fail("setup_unavailable", 503);
  const selections = value.selections.map((selection) => {
    if (
      !isRecord(selection) ||
      !UUID.test(String(selection.selection_ref ?? "")) ||
      !boundedText(selection.calendar_id, 1024) ||
      selection.share_mode !== "full_detail"
    ) fail("setup_unavailable", 503);
    return {
      selectionRef: selection.selection_ref as string,
      calendarId: selection.calendar_id,
      shareMode: selection.share_mode as OwnerCalendarShareMode,
    };
  });
  return {
    state: "ready",
    caseId: value.case_id as string,
    vendorUserId: value.vendor_user_id as string,
    bindingRef: value.binding_ref as string,
    sharingRevision: value.sharing_revision as number,
    credentialGeneration: value.credential_generation as number,
    credentialDomain: value.credential_domain as string,
    googleSubject: value.google_subject as string,
    encryptedCredential: value.encrypted_credential as string,
    tokenExpiresAt: value.token_expires_at as string,
    grantedScopes: value.granted_scopes as string[],
    selections,
  };
}

export function createOwnerCalendarRuntimeDependencies(
  options: RuntimeOptions = {},
): OwnerCalendarRuntimeDependencies {
  const environment = options.env ??
    { get: (name: string) => Deno.env.get(name) };
  const request = options.fetch ?? globalThis.fetch;
  const now = options.now ?? Date.now;
  const supabaseUrl = environment.get("SUPABASE_URL") ?? "";
  const serviceRoleKey = environment.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const clientId = environment.get("GOOGLE_CALENDAR_OAUTH_CLIENT_ID") ??
    environment.get("GOOGLE_CALENDAR_CLIENT_ID") ?? "";
  const clientSecret = environment.get("GOOGLE_CALENDAR_OAUTH_CLIENT_SECRET") ??
    environment.get("GOOGLE_CALENDAR_CLIENT_SECRET") ?? "";
  const vendorKey = environment.get("VENDOR_GOOGLE_CALENDAR_ENCRYPTION_KEY");
  const encryptionKeyValue = vendorKey ??
    environment.get("GOOGLE_CALENDAR_CREDENTIAL_KEY") ?? "";
  const backendConfigured = /^https:\/\/[a-z0-9-]+\.supabase\.co$/u.test(
    supabaseUrl,
  ) && serviceRoleKey.length > 20;
  const providerConfigured = clientId.length > 0 && clientSecret.length > 0 &&
    validEncryptionKey(encryptionKeyValue);
  const allowedOrigins = Object.freeze([
    ...new Set([
      CANONICAL_SITE_ORIGIN,
      ...parseAllowedOrigins(environment.get("LAIBE_ALLOWED_ORIGINS")),
    ]),
  ]);
  const currentCaseRpc = environment.get("LAIBE_CURRENT_CASE_CONTEXT_RPC") ??
    "case_member_current_case_context_v1";

  async function readSupabaseJson(
    response: Response,
  ): Promise<Record<string, unknown>> {
    if (!response.ok) fail("setup_unavailable", 503);
    return await readBoundedJson(response, 262_144);
  }

  async function rpc(
    name: string,
    body: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    if (!backendConfigured) fail("setup_unavailable", 503);
    const response = await request(
      `${supabaseUrl}/rest/v1/rpc/${encodeURIComponent(name)}`,
      {
        method: "POST",
        redirect: "error",
        headers: {
          apikey: serviceRoleKey,
          authorization: `Bearer ${serviceRoleKey}`,
          "content-type": "application/json",
          accept: "application/json",
        },
        body: JSON.stringify(body),
      },
    );
    return await readSupabaseJson(response);
  }

  return {
    allowedOrigins,
    backendConfigured,
    providerConfigured,
    now,
    async authorize(incoming) {
      if (!backendConfigured) fail("setup_unavailable", 503);
      const authorization = incoming.headers.get("authorization") ?? "";
      if (!/^Bearer\s+\S{20,}$/u.test(authorization)) {
        fail("sign_in_required", 401);
      }
      const identityResponse = await request(`${supabaseUrl}/auth/v1/user`, {
        method: "GET",
        redirect: "error",
        headers: {
          apikey: serviceRoleKey,
          authorization,
          accept: "application/json",
        },
      });
      if (identityResponse.status === 401 || identityResponse.status === 403) {
        await identityResponse.body?.cancel();
        fail("sign_in_required", 401);
      }
      const identity = await readSupabaseJson(identityResponse);
      if (!UUID.test(String(identity.id ?? ""))) fail("sign_in_required", 401);
      const context = await rpc(currentCaseRpc, { p_user_id: identity.id });
      const caseId = context.case_id ?? context.caseId;
      if (!UUID.test(String(caseId ?? ""))) fail("authority_denied", 403);
      return { userId: identity.id as string, caseId: caseId as string };
    },
    async loadProjection(principal) {
      return normalizeProjection(
        await rpc(
          "owner_vendor_google_calendar_projection_v1",
          {
            p_authenticated_user_id: principal.userId,
            p_expected_case_id: principal.caseId,
          },
        ),
      );
    },
    async readProviderEvents(projection, window) {
      if (
        !providerConfigured || projection.state !== "ready" ||
        !projection.vendorUserId || !projection.googleSubject ||
        !projection.credentialDomain || !projection.credentialGeneration ||
        !projection.encryptedCredential
      ) return { ok: false, state: "reconnect_required" };
      try {
        const credentialBinding = {
          kind: "credential",
          owner: projection.vendorUserId,
          subject: projection.googleSubject,
          domain: projection.credentialDomain,
          generation: projection.credentialGeneration,
        };
        let credential = parseCredential(
          await decryptCredential(
            projection.encryptedCredential,
            encryptionKeyValue,
            credentialBinding,
          ),
        );
        if (Date.parse(credential.expiresAt) <= now() + 30_000) {
          const tokenResult = await responseJson(
            request,
            "https://oauth2.googleapis.com/token",
            {
              method: "POST",
              headers: {
                "content-type": "application/x-www-form-urlencoded",
                accept: "application/json",
              },
              body: new URLSearchParams({
                client_id: clientId,
                client_secret: clientSecret,
                refresh_token: credential.refreshToken,
                grant_type: "refresh_token",
              }),
            },
            10_000,
          );
          if (!tokenResult.response.ok) {
            return {
              ok: false,
              state: tokenResult.response.status === 400 ||
                  tokenResult.response.status === 401
                ? "reconnect_required"
                : "provider_unavailable",
            };
          }
          if (
            !boundedText(tokenResult.value.access_token, 16_384) ||
            !positiveInteger(tokenResult.value.expires_in)
          ) return { ok: false, state: "provider_unavailable" };
          credential = {
            ...credential,
            accessToken: tokenResult.value.access_token,
            expiresAt: new Date(
              now() + (tokenResult.value.expires_in as number) * 1000,
            ).toISOString(),
          };
        }

        const events: ProviderEvent[] = [];
        let pages = 0;
        for (const selection of projection.selections) {
          let pageToken: string | undefined;
          do {
            pages += 1;
            if (pages > 64) return { ok: false, state: "incomplete" };
            const url = new URL(
              `https://www.googleapis.com/calendar/v3/calendars/${
                encodeURIComponent(selection.calendarId)
              }/events`,
            );
            url.searchParams.set("timeMin", window.timeMin);
            url.searchParams.set("timeMax", window.timeMax);
            url.searchParams.set("singleEvents", "true");
            url.searchParams.set("orderBy", "startTime");
            url.searchParams.set("maxResults", "250");
            if (pageToken) url.searchParams.set("pageToken", pageToken);
            const listed = await responseJson(request, url.toString(), {
              method: "GET",
              headers: {
                authorization: `Bearer ${credential.accessToken}`,
                accept: "application/json",
              },
            }, 10_000);
            if (!listed.response.ok) {
              return {
                ok: false,
                state: listed.response.status === 401 ||
                    listed.response.status === 403
                  ? "reconnect_required"
                  : "provider_unavailable",
              };
            }
            if (!Array.isArray(listed.value.items)) {
              return { ok: false, state: "incomplete" };
            }
            for (const value of listed.value.items) {
              const event = projectProviderEvent(value, selection.selectionRef);
              if (!event) continue;
              events.push(event);
              if (events.length > 250) {
                return { ok: false, state: "incomplete" };
              }
            }
            if (listed.value.nextPageToken === undefined) {
              pageToken = undefined;
            } else if (boundedText(listed.value.nextPageToken, 2048)) {
              pageToken = listed.value.nextPageToken;
            } else {
              return { ok: false, state: "incomplete" };
            }
          } while (pageToken);
        }
        return { ok: true, events };
      } catch (error) {
        if (error instanceof RuntimeFailure) {
          return {
            ok: false,
            state: error.state === "reconnect_required"
              ? "reconnect_required"
              : error.state === "incomplete"
              ? "incomplete"
              : "provider_unavailable",
          };
        }
        return { ok: false, state: "provider_unavailable" };
      }
    },
    async makeEventRef(projection, event) {
      return await hmacEventReference(encryptionKeyValue, projection, event);
    },
  };
}
