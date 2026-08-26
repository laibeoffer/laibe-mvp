import { DrsIdentityError, isUuid, readOwnValue } from "./contracts.ts";
import {
  createDrsBffGuard,
  type DrsBffAuthorizedContext,
  type DrsBffGuard,
  type DrsBffRequestContract,
  type DrsSessionBootstrapDependencies,
} from "./drs-session-bootstrap-bff.ts";

const RFC3339_MILLISECONDS =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d{1,3})?(Z|[+-]\d{2}:\d{2})$/u;
const MAX_CALENDAR_WINDOW_MS = 31 * 24 * 60 * 60 * 1000;
const MAX_CALENDAR_WINDOW_BODY_BYTES = 1024;

type BoundedRouteBody = Readonly<{
  raw: string;
  byteLength: number;
}>;

function isRfc3339(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const match = RFC3339_MILLISECONDS.exec(value);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = Number(match[4]);
  const minute = Number(match[5]);
  const second = Number(match[6]);
  const zone = match[7];
  if (
    month < 1 || month > 12 || day < 1 || day > 31 || hour > 23 ||
    minute > 59 || second > 59
  ) return false;
  const exactDay = new Date(Date.UTC(year, month - 1, day));
  if (
    exactDay.getUTCFullYear() !== year ||
    exactDay.getUTCMonth() !== month - 1 ||
    exactDay.getUTCDate() !== day
  ) return false;
  if (
    zone !== "Z" &&
    (Number(zone.slice(1, 3)) > 23 || Number(zone.slice(4, 6)) > 59)
  ) return false;
  return Number.isFinite(Date.parse(value));
}

const exactEmptyBody = Object.freeze([]);
const exactTimeWindowBody = Object.freeze([
  Object.freeze({
    name: "timeMin",
    scalarType: "string" as const,
    validate: isRfc3339,
  }),
  Object.freeze({
    name: "timeMax",
    scalarType: "string" as const,
    validate: isRfc3339,
  }),
]);

function closedPost(
  pathname: string,
  jsonBodyFields: DrsBffRequestContract["jsonBodyFields"],
): DrsBffRequestContract {
  return Object.freeze({
    method: "POST",
    pathname,
    queryFields: Object.freeze([]),
    jsonBodyFields,
  });
}

export const DRS_BFF_ROUTE_CONTRACTS = Object.freeze({
  workspaceGrant: closedPost(
    "/functions/v1/drs-workspace-grant",
    exactEmptyBody,
  ),
  calendarGrant: closedPost(
    "/functions/v1/drs-google-calendar-grant",
    exactEmptyBody,
  ),
  calendarOauthStart: closedPost(
    "/functions/v1/drs-google-calendar-oauth-start",
    exactEmptyBody,
  ),
  calendarEventsRead: closedPost(
    "/functions/v1/drs-google-calendar-events-read",
    exactTimeWindowBody,
  ),
  calendarRevoke: closedPost(
    "/functions/v1/drs-google-calendar-revoke",
    exactEmptyBody,
  ),
});

export type DrsBffRouteName = keyof typeof DRS_BFF_ROUTE_CONTRACTS;
export type { DrsBffAuthorizedContext, DrsBffGuard };

export class DrsBffRouteGuardError extends DrsIdentityError {}

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
          throw new DrsIdentityError("INVALID_REQUEST", 400);
        }
        if (typeof memberName !== "string") {
          throw new DrsIdentityError("INVALID_REQUEST", 400);
        }
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

async function cancelRequestBody(request: Request): Promise<void> {
  try {
    await request.body?.cancel();
  } catch {
    // A locked or already-cancelled request is still rejected fail closed.
  }
}

async function rejectOversizedRouteBody(
  request: Request,
  reader: ReadableStreamDefaultReader<Uint8Array>,
): Promise<never> {
  const cloneCancellation = reader.cancel();
  const requestCancellation = cancelRequestBody(request);
  await Promise.allSettled([cloneCancellation, requestCancellation]);
  throw new DrsIdentityError("INVALID_REQUEST", 400);
}

async function boundedRouteBodyPreflight(
  request: Request,
): Promise<BoundedRouteBody> {
  const contentLength = request.headers.get("content-length");
  if (contentLength !== null) {
    if (!/^(?:0|[1-9]\d*)$/u.test(contentLength)) {
      await cancelRequestBody(request);
      throw new DrsIdentityError("INVALID_REQUEST", 400);
    }
    const declaredBytes = Number(contentLength);
    if (
      !Number.isSafeInteger(declaredBytes) ||
      declaredBytes > MAX_CALENDAR_WINDOW_BODY_BYTES
    ) {
      await cancelRequestBody(request);
      throw new DrsIdentityError("INVALID_REQUEST", 400);
    }
  }

  let cloneBody: ReadableStream<Uint8Array> | null;
  try {
    cloneBody = request.clone().body;
  } catch {
    throw new DrsIdentityError("INVALID_REQUEST", 400);
  }
  if (cloneBody === null) throw new DrsIdentityError("INVALID_REQUEST", 400);

  const reader = cloneBody.getReader();
  const chunks: Uint8Array[] = [];
  let byteLength = 0;
  try {
    while (true) {
      const result = await reader.read();
      if (result.done) break;
      byteLength += result.value.byteLength;
      if (byteLength > MAX_CALENDAR_WINDOW_BODY_BYTES) {
        return await rejectOversizedRouteBody(request, reader);
      }
      chunks.push(result.value);
    }
  } catch (error) {
    try {
      await reader.cancel();
    } catch {
      // The malformed stream remains an invalid request.
    }
    if (error instanceof DrsIdentityError) throw error;
    throw new DrsIdentityError("INVALID_REQUEST", 400);
  }

  const bytes = new Uint8Array(byteLength);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  let raw: string;
  try {
    raw = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    throw new DrsIdentityError("INVALID_REQUEST", 400);
  }
  return Object.freeze({ raw, byteLength });
}

function assertExactCalendarEventsWindow(
  request: Request,
  body: BoundedRouteBody,
): void {
  const url = new URL(request.url);
  if (
    request.method !== "POST" ||
    url.pathname !== DRS_BFF_ROUTE_CONTRACTS.calendarEventsRead.pathname ||
    url.search.length !== 0 ||
    !/^application\/json(?:\s*;\s*charset=utf-8)?$/iu.test(
      request.headers.get("content-type") ?? "",
    )
  ) throw new DrsIdentityError("INVALID_REQUEST", 400);
  if (body.byteLength === 0) {
    throw new DrsIdentityError("INVALID_REQUEST", 400);
  }
  let raw: string;
  let payload: unknown;
  try {
    raw = body.raw;
    if (hasDuplicateTopLevelJsonMemberName(raw)) {
      throw new DrsIdentityError("INVALID_REQUEST", 400);
    }
    payload = JSON.parse(raw);
  } catch (error) {
    if (error instanceof DrsIdentityError) throw error;
    throw new DrsIdentityError("INVALID_REQUEST", 400);
  }
  if (
    payload === null || typeof payload !== "object" || Array.isArray(payload) ||
    Object.getPrototypeOf(payload) !== Object.prototype
  ) throw new DrsIdentityError("INVALID_REQUEST", 400);
  const record = payload as Record<string, unknown>;
  const keys = Object.keys(record).sort();
  if (
    keys.length !== 2 || keys[0] !== "timeMax" || keys[1] !== "timeMin" ||
    !isRfc3339(record.timeMin) || !isRfc3339(record.timeMax)
  ) throw new DrsIdentityError("INVALID_REQUEST", 400);
  const start = Date.parse(record.timeMin);
  const end = Date.parse(record.timeMax);
  if (start >= end || end - start > MAX_CALENDAR_WINDOW_MS) {
    throw new DrsIdentityError("INVALID_REQUEST", 400);
  }
}

export function createDrsBffRouteGuard(
  route: DrsBffRouteName,
  dependencies?: DrsSessionBootstrapDependencies,
  injectedAcceptedGuard?: DrsBffGuard,
): DrsBffGuard {
  const acceptedGuard = injectedAcceptedGuard ??
    createDrsBffGuard(dependencies, DRS_BFF_ROUTE_CONTRACTS[route]);
  return Object.freeze({
    async authorize(request: Request) {
      const body = await boundedRouteBodyPreflight(request);
      if (route === "calendarEventsRead") {
        assertExactCalendarEventsWindow(request, body);
      }
      return await acceptedGuard.authorize(request);
    },
  });
}

export function readDrsBffGuardFailure(error: unknown): Readonly<{
  status: number;
  state: "AUTH_REQUIRED" | "INVALID_REQUEST" | "CONTEXT_UNAVAILABLE";
}> {
  if (error instanceof DrsIdentityError) {
    if (error.code === "AUTH_REQUIRED" && error.status === 401) {
      return Object.freeze({ status: 401, state: "AUTH_REQUIRED" });
    }
    if (error.code === "INVALID_REQUEST" && error.status === 400) {
      return Object.freeze({ status: 400, state: "INVALID_REQUEST" });
    }
    if (error.code === "CONTEXT_UNAVAILABLE") {
      return Object.freeze({
        status: error.status === 503 ? 503 : 403,
        state: "CONTEXT_UNAVAILABLE",
      });
    }
  }
  return Object.freeze({ status: 503, state: "CONTEXT_UNAVAILABLE" });
}

export type DrsBffCalendarAuthorityContext = Readonly<{
  authenticatedUserId: string;
  specialistId: string;
  assignmentId: string;
  selectedCaseId: string;
  currentCaseId: string;
  accountRole: "drs";
  authorizationSubject: string;
  authBindingStatus: "active";
  specialistStatus: "active";
  assignmentStatus: "active";
  terminatedAt: null;
  lockStatus: "locked";
}>;

export function exactDrsBffCalendarAuthority(
  candidate: unknown,
  guarded: DrsBffAuthorizedContext,
): DrsBffCalendarAuthorityContext | null {
  try {
    const authenticatedUserId = readOwnValue(candidate, "authenticatedUserId");
    const specialistId = readOwnValue(candidate, "specialistId");
    const assignmentId = readOwnValue(candidate, "assignmentId");
    const selectedCaseId = readOwnValue(candidate, "selectedCaseId");
    const currentCaseId = readOwnValue(candidate, "currentCaseId");
    const authorizationSubject = readOwnValue(
      candidate,
      "authorizationSubject",
    );
    if (
      authenticatedUserId !== guarded.authenticatedUserId ||
      specialistId !== guarded.specialistId || !isUuid(assignmentId) ||
      selectedCaseId !== guarded.selectedCaseId ||
      currentCaseId !== guarded.selectedCaseId ||
      authorizationSubject !== guarded.authorizationSubject ||
      readOwnValue(candidate, "accountRole") !== "drs" ||
      readOwnValue(candidate, "authBindingStatus") !== "active" ||
      readOwnValue(candidate, "specialistStatus") !== "active" ||
      readOwnValue(candidate, "assignmentStatus") !== "active" ||
      readOwnValue(candidate, "terminatedAt") !== null ||
      readOwnValue(candidate, "lockStatus") !== "locked"
    ) return null;
    return candidate as DrsBffCalendarAuthorityContext;
  } catch {
    return null;
  }
}

export function drsBffCalendarPending(guarded: DrsBffAuthorizedContext) {
  return Object.freeze({
    currentCaseId: guarded.selectedCaseId,
    authorizationSubject: guarded.authorizationSubject,
  });
}
