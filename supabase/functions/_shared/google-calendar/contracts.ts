const ObjectGetOwnPropertyDescriptor = Object.getOwnPropertyDescriptor;
const ObjectCreate = Object.create;
const ObjectFreeze = Object.freeze;
const StringPrototypeTrim = String.prototype.trim;
const RegExpPrototypeTest = RegExp.prototype.test;
const ReflectApply = Reflect.apply;
const EncodeURIComponent = encodeURIComponent;
// deno-lint-ignore no-control-regex -- authority fields explicitly reject control bytes.
const CONTROL_CHARACTER_PATTERN = /[\u0000-\u001f\u007f]/u;

const MISSING = Symbol("missing");

export type CaseMemberRole = "owner" | "pro";

export type GoogleCalendarAccountRole = CaseMemberRole | "drs";

export type CalendarGrantFacts = {
  authenticatedUserId: string;
  currentCaseId: string;
  calendarId: string;
};

export type WorkspaceGrantFacts = {
  authenticatedUserId: string;
  currentCaseId: string;
  calendarGrant?: unknown;
};

type FetchLike = (
  input: string | URL | Request,
  init?: RequestInit,
) => Promise<Response>;

type RuntimeEnv = {
  get(name: string): string | undefined;
};

export type SupabaseCalendarRuntimeConfig = {
  supabaseUrl: string;
  serviceRoleKey: string;
  currentCaseContextRpc: string | null;
  allowedOrigins: readonly string[];
  fetch: FetchLike;
};

export type SupabaseCalendarRuntimeOptions = {
  env?: RuntimeEnv;
  fetch?: FetchLike;
  allowedOrigins?: readonly string[];
  currentCaseContextRpc?: string;
};

export const CLOSED_STATES = ObjectFreeze([
  "AUTH_REQUIRED",
  "CONTEXT_UNAVAILABLE",
  "IDENTITY_MISMATCH",
  "CASE_NOT_AUTHORIZED",
  "MEMBERSHIP_INACTIVE",
  "GOOGLE_CALENDAR_NOT_CONNECTED",
  "GOOGLE_CALENDAR_RECONNECT_REQUIRED",
  "GOOGLE_CALENDAR_BINDING_REVOKED",
  "INVALID_CALENDAR_BINDING",
]);

export function readOwnData(record: unknown, key: PropertyKey): unknown {
  try {
    if (record === null || typeof record !== "object") return MISSING;
    const descriptor = ObjectGetOwnPropertyDescriptor(record, key);
    if (
      descriptor === undefined ||
      !ObjectGetOwnPropertyDescriptor(descriptor, "value")
    ) {
      return MISSING;
    }
    return descriptor.value;
  } catch {
    return MISSING;
  }
}

export function isMissing(value: unknown): boolean {
  return value === MISSING;
}

export function isOwnNonEmptyString(
  record: unknown,
  key: PropertyKey,
  maximumLength = 1024,
): boolean {
  const value = readOwnData(record, key);
  if (
    typeof value !== "string" || value.length === 0 ||
    value.length > maximumLength
  ) {
    return false;
  }
  try {
    return ReflectApply(StringPrototypeTrim, value, []) === value &&
      !ReflectApply(RegExpPrototypeTest, CONTROL_CHARACTER_PATTERN, [value]);
  } catch {
    return false;
  }
}

function frozenRecord(
  entries: ReadonlyArray<readonly [string, unknown]>,
): Readonly<Record<string, unknown>> {
  const record: Record<string, unknown> = ObjectCreate(null);
  for (let index = 0; index < entries.length; index += 1) {
    record[entries[index][0]] = entries[index][1];
  }
  return ObjectFreeze(record);
}

export function closedResult(
  state = "CONTEXT_UNAVAILABLE",
): Readonly<Record<string, unknown>> {
  const allowed = state === "AUTH_REQUIRED" ||
      state === "CONTEXT_UNAVAILABLE" ||
      state === "IDENTITY_MISMATCH" ||
      state === "CASE_NOT_AUTHORIZED" ||
      state === "MEMBERSHIP_INACTIVE" ||
      state === "GOOGLE_CALENDAR_NOT_CONNECTED" ||
      state === "GOOGLE_CALENDAR_RECONNECT_REQUIRED" ||
      state === "GOOGLE_CALENDAR_BINDING_REVOKED" ||
      state === "INVALID_CALENDAR_BINDING"
    ? state
    : "CONTEXT_UNAVAILABLE";
  return frozenRecord([
    ["ok", false],
    ["state", allowed],
    ["grant", null],
  ]);
}

export function successResult(
  grant: unknown,
): Readonly<Record<string, unknown>> {
  return frozenRecord([
    ["ok", true],
    ["state", "READY"],
    ["grant", grant],
  ]);
}

export function createGrantRecord(
  expectedRole: CaseMemberRole,
  facts: CalendarGrantFacts,
) {
  const schemaVersion = expectedRole === "owner"
    ? "laibe.owner-calendar-embed.v1"
    : "laibe.vendor-calendar-embed.v1";
  return frozenRecord([
    ["schemaVersion", schemaVersion],
    ["authenticatedUserId", facts.authenticatedUserId],
    ["currentCaseId", facts.currentCaseId],
    [
      "membership",
      frozenRecord([
        ["userId", facts.authenticatedUserId],
        ["caseId", facts.currentCaseId],
        ["role", expectedRole],
        ["status", "active"],
      ]),
    ],
    [
      "calendarBinding",
      frozenRecord([
        ["userId", facts.authenticatedUserId],
        ["caseId", facts.currentCaseId],
        ["accountRole", expectedRole],
        ["connectionStatus", "connected"],
        ["bindingStatus", "active"],
        ["calendarId", facts.calendarId],
        ["timeZone", "Asia/Taipei"],
      ]),
    ],
  ]);
}

export function createWorkspaceGrantRecord(
  expectedRole: CaseMemberRole,
  facts: WorkspaceGrantFacts,
) {
  const schemaVersion = expectedRole === "owner"
    ? "laibe.owner-workspace-auth.v1"
    : "laibe.vendor-workspace-auth.v1";
  const state = expectedRole === "owner"
    ? "AUTHORIZED_OWNER_WORKSPACE"
    : "AUTHORIZED_VENDOR_WORKSPACE";
  const entries: [string, unknown][] = [
    ["schemaVersion", schemaVersion],
    ["state", state],
    ["authenticatedUserId", facts.authenticatedUserId],
    ["currentCaseId", facts.currentCaseId],
    [
      "membership",
      frozenRecord([
        ["userId", facts.authenticatedUserId],
        ["caseId", facts.currentCaseId],
        ["role", expectedRole],
        ["status", "active"],
      ]),
    ],
    [
      "workspaceAccess",
      frozenRecord([
        ["role", expectedRole],
        ["mutationAllowed", false],
        ["writeActionsEnabled", false],
        ["payloadPolicy", "AUTHORIZED_SCOPE_ONLY"],
      ]),
    ],
  ];
  if (facts.calendarGrant !== undefined && facts.calendarGrant !== null) {
    entries.push(["calendarGrant", facts.calendarGrant]);
  }
  return frozenRecord(entries);
}

export function buildCalendarEmbedUrl(grant: unknown): string | null {
  try {
    const binding = readOwnData(grant, "calendarBinding");
    if (!isOwnNonEmptyString(binding, "calendarId")) return null;
    if (readOwnData(binding, "timeZone") !== "Asia/Taipei") return null;
    const calendarId = readOwnData(binding, "calendarId") as string;
    return "https://calendar.google.com/calendar/embed?src=" +
      EncodeURIComponent(calendarId) +
      "&ctz=Asia%2FTaipei&hl=zh_TW";
  } catch {
    return null;
  }
}

export function jsonResponse(status: number, payload: unknown): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
    },
  });
}

function readRuntimeEnv(
  options: SupabaseCalendarRuntimeOptions,
  name: string,
): string | undefined {
  const explicit = options.env?.get(name);
  if (explicit) return explicit;
  const runtimeGlobal = globalThis as typeof globalThis & {
    Deno?: { env?: RuntimeEnv };
  };
  try {
    return runtimeGlobal.Deno?.env?.get(name);
  } catch {
    return undefined;
  }
}

function parseAllowedOrigins(value: string | undefined): readonly string[] {
  if (!value) return ObjectFreeze([]);
  return ObjectFreeze(
    value.split(",")
      .map((part) => ReflectApply(StringPrototypeTrim, part, []))
      .filter((part) => part.length > 0),
  );
}

export function createSupabaseCalendarRuntimeConfig(
  options: SupabaseCalendarRuntimeOptions = {},
): SupabaseCalendarRuntimeConfig | null {
  const supabaseUrl = readRuntimeEnv(options, "SUPABASE_URL");
  const serviceRoleKey = readRuntimeEnv(
    options,
    "SUPABASE_SERVICE_ROLE_KEY",
  );
  const fetchImplementation = options.fetch ?? globalThis.fetch;
  if (
    !supabaseUrl || !serviceRoleKey || typeof fetchImplementation !== "function"
  ) {
    return null;
  }
  const allowedOrigins = options.allowedOrigins ??
    parseAllowedOrigins(readRuntimeEnv(options, "LAIBE_ALLOWED_ORIGINS"));
  return {
    supabaseUrl: supabaseUrl.replace(/\/+$/u, ""),
    serviceRoleKey,
    currentCaseContextRpc: options.currentCaseContextRpc ??
      readRuntimeEnv(options, "LAIBE_CURRENT_CASE_CONTEXT_RPC") ?? null,
    allowedOrigins,
    fetch: fetchImplementation,
  };
}

export function bearerTokenFromRequest(request: Request): string | null {
  try {
    const value = request.headers.get("authorization") ?? "";
    const match = value.match(/^Bearer\s+(.+)$/iu);
    return match?.[1] ?? null;
  } catch {
    return null;
  }
}

export async function callSupabaseRpc(
  config: SupabaseCalendarRuntimeConfig,
  functionName: string,
  payload: Record<string, unknown>,
): Promise<unknown> {
  const response = await config.fetch(
    `${config.supabaseUrl}/rest/v1/rpc/${functionName}`,
    {
      method: "POST",
      headers: {
        "authorization": `Bearer ${config.serviceRoleKey}`,
        "apikey": config.serviceRoleKey,
        "content-type": "application/json",
      },
      body: JSON.stringify(payload),
    },
  );
  if (!response.ok) return null;
  return await response.json();
}

export async function resolveSupabaseAuthenticatedIdentity(
  request: Request,
  config: SupabaseCalendarRuntimeConfig,
): Promise<{ userId: string } | null> {
  const bearerToken = bearerTokenFromRequest(request);
  if (!bearerToken) return null;
  const response = await config.fetch(`${config.supabaseUrl}/auth/v1/user`, {
    headers: {
      "authorization": `Bearer ${bearerToken}`,
      "apikey": config.serviceRoleKey,
    },
  });
  if (!response.ok) return null;
  const payload = await response.json();
  const userId = readOwnData(payload, "id");
  return typeof userId === "string" && userId.length > 0 ? { userId } : null;
}
