import {
  callSupabaseRpc,
  createSupabaseCalendarRuntimeConfig,
  isMissing,
  jsonResponse,
  readOwnData,
  resolveSupabaseAuthenticatedIdentity,
  type SupabaseCalendarRuntimeOptions,
} from "./contracts.ts";
import {
  decryptCredentialEnvelope,
  type DrsSpecialistAuthorizationStrategy,
  exactDrsGrantedScopes,
} from "./google-oauth-adapter.ts";

const MAX_AUTHORITY_STRING = 512;
const CONTROL_OR_SPACE = /(?:\s|\p{Cc})/u;

type PendingAuthority = Readonly<{
  currentCaseId: string;
  authorizationSubject: string;
  assignmentId: string;
}>;

type AuthorizationInput = {
  authenticatedUserId: string;
  accountRole: "drs";
  pending: PendingAuthority | null;
};

type AuthorizationSource = {
  resolveAuthorizationFacts?(input: AuthorizationInput): Promise<unknown>;
  nowMs?: number;
};

export type DrsCalendarWindow = Readonly<{
  timeMin: string;
  timeMax: string;
}>;

export type DrsCalendarServerPort = {
  runtimeReady: boolean;
  resolveAuthenticatedIdentity(
    request: Request,
  ): Promise<{ userId: string } | null>;
  resolveAuthorization(
    identity: { userId: string },
    pending?: PendingAuthority | null,
  ): Promise<unknown>;
  loadGrant(context: unknown): Promise<unknown>;
  revoke(context: unknown): Promise<unknown>;
  readEvents(context: unknown, window: DrsCalendarWindow): Promise<unknown>;
};

export type SupabaseDrsCalendarRuntimeOptions =
  & SupabaseCalendarRuntimeOptions
  & {
    drsAuthorizationStrategy?: DrsSpecialistAuthorizationStrategy | null;
    nowMs?: number;
  };

type DrsCorsEnv = Readonly<{
  get(name: string): string | undefined;
}>;

export type DrsCorsOptions = Readonly<{
  allowedOrigins?: readonly string[];
  env?: DrsCorsEnv;
}>;

type DrsCorsResponder = Readonly<{
  earlyResponse: Response | null;
  jsonResponse(status: number, payload: unknown): Response;
  apply(response: Response): Response;
}>;

const CORS_ALLOWED_HEADERS = Object.freeze(["authorization", "content-type"]);

function defaultCorsEnv(): DrsCorsEnv | undefined {
  return typeof Deno !== "undefined" ? Deno.env : undefined;
}

function exactOrigin(value: string): string | null {
  try {
    const url = new URL(value);
    return (url.protocol === "https:" || url.protocol === "http:") &&
        url.origin === value
      ? value
      : null;
  } catch {
    return null;
  }
}

function configuredCorsOrigins(options: DrsCorsOptions): ReadonlySet<string> {
  const values = options.allowedOrigins ??
    (options.env ?? defaultCorsEnv())?.get("DRS_ALLOWED_ORIGINS")?.split(",") ??
    [];
  const origins = new Set<string>();
  for (const candidate of values) {
    const origin = exactOrigin(candidate.trim());
    if (origin) origins.add(origin);
  }
  return origins;
}

function withCorsHeaders(response: Response, corsHeaders: Headers): Response {
  const headers = new Headers(response.headers);
  corsHeaders.forEach((value, name) => headers.set(name, value));
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export function createDrsCorsResponder(
  request: Request,
  allowedMethods: readonly string[],
  options: DrsCorsOptions = {},
): DrsCorsResponder {
  const corsHeaders = new Headers();
  corsHeaders.set("vary", "Origin");
  const origin = request.headers.get("origin");
  let requestOrigin: string | null = null;
  try {
    requestOrigin = new URL(request.url).origin;
  } catch {
    requestOrigin = null;
  }
  const configured = configuredCorsOrigins(options);
  const allowedOrigin = origin && exactOrigin(origin) &&
      (origin === requestOrigin || configured.has(origin))
    ? origin
    : null;

  let earlyResponse: Response | null = null;
  if (origin && !allowedOrigin) {
    earlyResponse = withCorsHeaders(
      jsonResponse(403, { state: "ORIGIN_NOT_ALLOWED" }),
      corsHeaders,
    );
  } else if (allowedOrigin) {
    corsHeaders.set("access-control-allow-origin", allowedOrigin);
    corsHeaders.set("access-control-allow-methods", allowedMethods.join(", "));
    corsHeaders.set(
      "access-control-allow-headers",
      CORS_ALLOWED_HEADERS.join(", "),
    );
  }

  if (request.method === "OPTIONS" && !earlyResponse) {
    const requestedMethod = request.headers.get(
      "access-control-request-method",
    );
    const requestedHeaders = (request.headers.get(
      "access-control-request-headers",
    ) ?? "").split(",").map((value) => value.trim().toLowerCase()).filter(
      Boolean,
    );
    if (
      !allowedOrigin || !requestedMethod ||
      !allowedMethods.includes(requestedMethod) ||
      requestedHeaders.some((name) => !CORS_ALLOWED_HEADERS.includes(name))
    ) {
      earlyResponse = withCorsHeaders(
        jsonResponse(403, { state: "ORIGIN_NOT_ALLOWED" }),
        corsHeaders,
      );
    } else {
      earlyResponse = new Response(null, { status: 204, headers: corsHeaders });
    }
  }

  return Object.freeze({
    earlyResponse,
    jsonResponse(status: number, payload: unknown) {
      return withCorsHeaders(jsonResponse(status, payload), corsHeaders);
    },
    apply(response: Response) {
      return withCorsHeaders(response, corsHeaders);
    },
  });
}

export function hasUnexpectedQuery(request: Request): boolean {
  try {
    return new URL(request.url).search.length > 0;
  } catch {
    return true;
  }
}

function ownValue(input: unknown, camel: string, snake: string): unknown {
  const camelValue = readOwnData(input, camel);
  return isMissing(camelValue) ? readOwnData(input, snake) : camelValue;
}

function boundedString(
  value: unknown,
  limit = MAX_AUTHORITY_STRING,
): string | null {
  return typeof value === "string" && value.length > 0 &&
      value.length <= limit && !CONTROL_OR_SPACE.test(value)
    ? value
    : null;
}

function timestamp(value: unknown): string | null {
  if (typeof value !== "string" || value.length > 64) return null;
  const milliseconds = Date.parse(value);
  return Number.isFinite(milliseconds) ? value : null;
}

function normalizePending(value: unknown): PendingAuthority | null {
  if (value === null) return null;
  const currentCaseId = boundedString(readOwnData(value, "currentCaseId"), 128);
  const authorizationSubject = boundedString(
    readOwnData(value, "authorizationSubject"),
  );
  const assignmentId = boundedString(readOwnData(value, "assignmentId"), 128);
  return currentCaseId && authorizationSubject && assignmentId
    ? Object.freeze({ currentCaseId, authorizationSubject, assignmentId })
    : null;
}

function normalizeAuthorizationFacts(
  candidate: unknown,
  expected: AuthorizationInput,
  nowMs: number,
) {
  try {
    const authenticatedUserId = boundedString(
      ownValue(candidate, "authenticatedUserId", "authenticated_user_id"),
      128,
    );
    const specialistId = boundedString(
      ownValue(candidate, "specialistId", "specialist_id"),
      128,
    );
    const assignmentId = boundedString(
      ownValue(candidate, "assignmentId", "assignment_id"),
      128,
    );
    const selectedCaseId = boundedString(
      ownValue(candidate, "selectedCaseId", "selected_case_id"),
      128,
    );
    const currentCaseId = boundedString(
      ownValue(candidate, "currentCaseId", "current_case_id"),
      128,
    ) ?? selectedCaseId;
    const authorizationSubject = boundedString(
      ownValue(candidate, "authorizationSubject", "authorization_subject"),
    );
    const validFrom = timestamp(ownValue(candidate, "validFrom", "valid_from"));
    const validUntil = timestamp(
      ownValue(candidate, "validUntil", "valid_until"),
    );
    const terminatedAt = ownValue(candidate, "terminatedAt", "terminated_at");
    const accountRole = ownValue(candidate, "accountRole", "account_role");
    const authBindingStatus = ownValue(
      candidate,
      "authBindingStatus",
      "auth_binding_status",
    );
    const specialistStatus = ownValue(
      candidate,
      "specialistStatus",
      "specialist_status",
    );
    const assignmentStatus = ownValue(
      candidate,
      "assignmentStatus",
      "assignment_status",
    );
    const lockStatus = ownValue(candidate, "lockStatus", "lock_status");
    const validFromMs = validFrom ? Date.parse(validFrom) : NaN;
    const validUntilMs = validUntil ? Date.parse(validUntil) : NaN;

    if (
      readOwnData(candidate, "authorized") !== true ||
      authenticatedUserId !== expected.authenticatedUserId ||
      !specialistId || !assignmentId || !selectedCaseId ||
      currentCaseId !== selectedCaseId || !authorizationSubject ||
      accountRole !== "drs" || authBindingStatus !== "active" ||
      specialistStatus !== "active" || assignmentStatus !== "active" ||
      terminatedAt !== null || lockStatus !== "locked" ||
      !validFrom || !validUntil || validFromMs >= validUntilMs ||
      nowMs < validFromMs || nowMs >= validUntilMs ||
      !isMissing(readOwnData(candidate, "membership"))
    ) return null;

    if (
      expected.pending &&
      (selectedCaseId !== expected.pending.currentCaseId ||
        authorizationSubject !== expected.pending.authorizationSubject ||
        assignmentId !== expected.pending.assignmentId)
    ) return null;

    return Object.freeze({
      authorized: true,
      authenticatedUserId,
      currentCaseId: selectedCaseId,
      selectedCaseId,
      accountRole: "drs" as const,
      authorizationSubject,
      authBindingStatus: "active" as const,
      specialistStatus: "active" as const,
      assignmentStatus: "active" as const,
      specialistId,
      assignmentId,
      validFrom,
      validUntil,
      terminatedAt: null,
      lockStatus: "locked" as const,
    });
  } catch {
    return null;
  }
}

export function createDrsSpecialistAuthorizationStrategy(
  source: AuthorizationSource | null = null,
): DrsSpecialistAuthorizationStrategy {
  const resolver = source?.resolveAuthorizationFacts;
  return {
    requiresAssignmentBinding: true,
    async resolveAuthorization(input) {
      if (typeof resolver !== "function") return null;
      const authenticatedUserId = boundedString(
        readOwnData(input, "authenticatedUserId"),
        128,
      );
      if (!authenticatedUserId || readOwnData(input, "accountRole") !== "drs") {
        return null;
      }
      const rawPending = readOwnData(input, "pending");
      const pending = rawPending === null ? null : normalizePending(rawPending);
      if (rawPending !== null && !pending) return null;
      const exactInput: AuthorizationInput = Object.freeze({
        authenticatedUserId,
        accountRole: "drs",
        pending,
      });
      try {
        const candidate = await resolver(exactInput);
        const nowMs = Number.isFinite(source?.nowMs)
          ? source?.nowMs as number
          : Date.now();
        return normalizeAuthorizationFacts(candidate, exactInput, nowMs);
      } catch {
        return null;
      }
    },
  };
}

export function createSupabaseDrsSpecialistAuthorizationStrategy(
  options: SupabaseDrsCalendarRuntimeOptions = {},
): DrsSpecialistAuthorizationStrategy {
  const config = createSupabaseCalendarRuntimeConfig(options);
  if (!config) return createDrsSpecialistAuthorizationStrategy();
  return createDrsSpecialistAuthorizationStrategy({
    nowMs: options.nowMs,
    async resolveAuthorizationFacts(input) {
      return await callSupabaseRpc(
        config,
        "drs_google_calendar_authorize_v1",
        {
          p_authenticated_user_id: input.authenticatedUserId,
          p_expected_case_id: input.pending?.currentCaseId ?? null,
          p_expected_authorization_subject:
            input.pending?.authorizationSubject ?? null,
          p_expected_assignment_id: input.pending?.assignmentId ?? null,
        },
      );
    },
  });
}

function readRuntimeEnv(
  options: SupabaseDrsCalendarRuntimeOptions,
  name: string,
): string | undefined {
  const explicit = options.env?.get(name);
  if (explicit) return explicit;
  const runtime = globalThis as typeof globalThis & {
    Deno?: { env?: { get(name: string): string | undefined } };
  };
  try {
    return runtime.Deno?.env?.get(name);
  } catch {
    return undefined;
  }
}

function exactContext(input: unknown) {
  const authenticatedUserId = boundedString(
    readOwnData(input, "authenticatedUserId"),
    128,
  );
  const selectedCaseId = boundedString(
    readOwnData(input, "selectedCaseId"),
    128,
  );
  const assignmentId = boundedString(readOwnData(input, "assignmentId"), 128);
  const authorizationSubject = boundedString(
    readOwnData(input, "authorizationSubject"),
  );
  return authenticatedUserId && selectedCaseId && assignmentId &&
      authorizationSubject && readOwnData(input, "accountRole") === "drs"
    ? {
      authenticatedUserId,
      selectedCaseId,
      assignmentId,
      authorizationSubject,
    }
    : null;
}

function exactRpcBinding(
  input: unknown,
  context: ReturnType<typeof exactContext>,
) {
  if (!context || readOwnData(input, "ok") !== true) return null;
  const authenticatedUserId = ownValue(
    input,
    "authenticatedUserId",
    "authenticated_user_id",
  );
  const selectedCaseId = ownValue(input, "selectedCaseId", "selected_case_id");
  const assignmentId = ownValue(input, "assignmentId", "assignment_id");
  const authorizationSubject = ownValue(
    input,
    "authorizationSubject",
    "authorization_subject",
  );
  const accountRole = ownValue(input, "accountRole", "account_role");
  return authenticatedUserId === context.authenticatedUserId &&
      selectedCaseId === context.selectedCaseId &&
      assignmentId === context.assignmentId &&
      authorizationSubject === context.authorizationSubject &&
      accountRole === "drs"
    ? context
    : null;
}

function failClosedPort(): DrsCalendarServerPort {
  const unavailable = (): Promise<null> => Promise.resolve(null);
  return Object.freeze({
    runtimeReady: false,
    resolveAuthenticatedIdentity: unavailable,
    resolveAuthorization: unavailable,
    loadGrant: unavailable,
    revoke: unavailable,
    readEvents: unavailable,
  });
}

export function createSupabaseDrsCalendarServerPort(
  options: SupabaseDrsCalendarRuntimeOptions = {},
): DrsCalendarServerPort {
  const config = createSupabaseCalendarRuntimeConfig(options);
  const credentialKey = readRuntimeEnv(
    options,
    "GOOGLE_CALENDAR_CREDENTIAL_KEY",
  );
  if (!config || !credentialKey) return failClosedPort();
  const runtimeConfig = config;
  const strategy = options.drsAuthorizationStrategy ??
    createSupabaseDrsSpecialistAuthorizationStrategy(options);

  async function resolveAuthorization(
    identity: { userId: string },
    pending: PendingAuthority | null = null,
  ) {
    return await strategy.resolveAuthorization({
      authenticatedUserId: identity.userId,
      accountRole: "drs",
      pending,
    });
  }

  async function exactRpc(
    name: string,
    context: unknown,
  ) {
    const exact = exactContext(context);
    if (!exact) return null;
    return await callSupabaseRpc(runtimeConfig, name, {
      p_authenticated_user_id: exact.authenticatedUserId,
      p_selected_case_id: exact.selectedCaseId,
      p_assignment_id: exact.assignmentId,
      p_authorization_subject: exact.authorizationSubject,
    });
  }

  return Object.freeze({
    runtimeReady: true,
    async resolveAuthenticatedIdentity(request: Request) {
      return await resolveSupabaseAuthenticatedIdentity(
        request,
        runtimeConfig,
      );
    },
    resolveAuthorization,
    async loadGrant(context: unknown) {
      return await exactRpc("drs_google_calendar_grant_v1", context);
    },
    async revoke(context: unknown) {
      return await exactRpc("drs_google_calendar_revoke_v1", context);
    },
    async readEvents(context: unknown, window: DrsCalendarWindow) {
      const exact = exactContext(context);
      if (!exact) return { ok: false, state: "CASE_NOT_AUTHORIZED" };
      const access = await exactRpc(
        "drs_google_calendar_events_context_v1",
        context,
      );
      if (!exactRpcBinding(access, exact)) {
        return { ok: false, state: "CASE_NOT_AUTHORIZED" };
      }
      if (
        ownValue(access, "bindingStatus", "binding_status") !== "active" ||
        ownValue(access, "credentialStatus", "credential_status") !==
          "active" ||
        ownValue(access, "timeZone", "time_zone") !== "Asia/Taipei"
      ) return { ok: false, state: "GOOGLE_CALENDAR_RECONNECT_REQUIRED" };
      const calendarId = boundedString(
        ownValue(access, "calendarId", "calendar_id"),
        1024,
      );
      const encryptedAccessToken = boundedString(
        ownValue(access, "encryptedAccessToken", "encrypted_access_token"),
        32768,
      );
      const tokenExpiresAt = timestamp(
        ownValue(access, "tokenExpiresAt", "token_expires_at"),
      );
      const grantedScopes = ownValue(access, "grantedScopes", "granted_scopes");
      if (
        !calendarId || !encryptedAccessToken || !tokenExpiresAt ||
        Date.parse(tokenExpiresAt) <= Date.now() ||
        exactDrsGrantedScopes(grantedScopes) === null
      ) return { ok: false, state: "GOOGLE_CALENDAR_RECONNECT_REQUIRED" };
      let accessToken = "";
      try {
        const envelope = await decryptCredentialEnvelope(
          encryptedAccessToken,
          credentialKey,
        );
        const value = readOwnData(envelope, "accessToken");
        accessToken = typeof value === "string" ? value : "";
      } catch {
        return { ok: false, state: "GOOGLE_CALENDAR_RECONNECT_REQUIRED" };
      }
      if (!accessToken) {
        return { ok: false, state: "GOOGLE_CALENDAR_RECONNECT_REQUIRED" };
      }
      const url = new URL(
        `https://www.googleapis.com/calendar/v3/calendars/${
          encodeURIComponent(calendarId)
        }/events`,
      );
      url.searchParams.set("timeMin", window.timeMin);
      url.searchParams.set("timeMax", window.timeMax);
      url.searchParams.set("singleEvents", "true");
      url.searchParams.set("orderBy", "startTime");
      url.searchParams.set("timeZone", "Asia/Taipei");
      url.searchParams.set("maxResults", "250");
      let providerPayload: unknown;
      try {
        const response = await runtimeConfig.fetch(url, {
          method: "GET",
          headers: {
            authorization: `Bearer ${accessToken}`,
            accept: "application/json",
          },
        });
        if (!response.ok) {
          return { ok: false, state: "GOOGLE_CALENDAR_READ_UNAVAILABLE" };
        }
        providerPayload = await response.json();
      } catch {
        return { ok: false, state: "GOOGLE_CALENDAR_READ_UNAVAILABLE" };
      }
      if (boundedString(readOwnData(providerPayload, "nextPageToken"), 2048)) {
        return { ok: false, state: "GOOGLE_CALENDAR_WINDOW_TOO_LARGE" };
      }
      const postFetch = await resolveAuthorization(
        { userId: exact.authenticatedUserId },
        {
          currentCaseId: exact.selectedCaseId,
          authorizationSubject: exact.authorizationSubject,
          assignmentId: exact.assignmentId,
        },
      );
      const postExact = exactContext(postFetch);
      if (
        !postExact ||
        postExact.authenticatedUserId !== exact.authenticatedUserId ||
        postExact.selectedCaseId !== exact.selectedCaseId ||
        postExact.assignmentId !== exact.assignmentId ||
        postExact.authorizationSubject !== exact.authorizationSubject
      ) return { ok: false, state: "CASE_NOT_AUTHORIZED" };
      const items = readOwnData(providerPayload, "items");
      return {
        ok: true,
        state: "CONNECTED",
        authenticatedUserId: exact.authenticatedUserId,
        selectedCaseId: exact.selectedCaseId,
        assignmentId: exact.assignmentId,
        accountRole: "drs",
        authorizationSubject: exact.authorizationSubject,
        timeZone: "Asia/Taipei",
        items: Array.isArray(items) ? items : [],
      };
    },
  });
}

export async function readExactJsonObject(
  request: Request,
  exactKeys: readonly string[],
): Promise<Record<string, unknown> | null> {
  const contentType = request.headers.get("content-type") ?? "";
  if (!/^application\/json(?:\s*;|$)/iu.test(contentType)) return null;
  try {
    const value = await request.clone().json();
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      return null;
    }
    const keys = Object.keys(value).sort();
    const expected = [...exactKeys].sort();
    if (keys.length !== expected.length) return null;
    for (let index = 0; index < keys.length; index += 1) {
      if (keys[index] !== expected[index]) return null;
    }
    return value as Record<string, unknown>;
  } catch {
    return null;
  }
}
