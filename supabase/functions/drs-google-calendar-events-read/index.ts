import {
  createDrsCorsResponder,
  createSupabaseDrsCalendarServerPort,
  type DrsCalendarServerPort,
  type DrsCorsOptions,
  readExactJsonObject,
} from "../_shared/google-calendar/drs-specialist-authorization.ts";
import { readOwnData } from "../_shared/google-calendar/contracts.ts";
import {
  createDrsBffRouteGuard,
  type DrsBffGuard,
  exactDrsBffCalendarAuthority,
  readDrsBffGuardFailure,
} from "../_shared/drs-auth/drs-bff-route-composition.ts";

export const VERIFY_JWT = false;
export const DEFAULT_CLOSED_STATE = "CONTEXT_UNAVAILABLE";

const RFC3339 =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d{1,3})?(Z|[+-]\d{2}:\d{2})$/u;
const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/u;
const MAX_WINDOW_MS = 31 * 24 * 60 * 60 * 1000;

function validDateParts(match: RegExpExecArray): boolean {
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return false;
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

function dateTimeValue(value: unknown): number | null {
  const match = typeof value === "string" ? RFC3339.exec(value) : null;
  if (
    !match || !validDateParts(match) || Number(match[4]) > 23 ||
    Number(match[5]) > 59 || Number(match[6]) > 59
  ) return null;
  if (
    match[7] !== "Z" &&
    (Number(match[7].slice(1, 3)) > 23 ||
      Number(match[7].slice(4, 6)) > 59)
  ) return null;
  const epoch = Date.parse(value as string);
  return Number.isFinite(epoch) ? epoch : null;
}

function dateOnlyValue(value: unknown): number | null {
  const match = typeof value === "string" ? DATE_ONLY.exec(value) : null;
  return match && validDateParts(match)
    ? Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
    : null;
}

function windowFromBody(body: Record<string, unknown>) {
  const timeMin = readOwnData(body, "timeMin");
  const timeMax = readOwnData(body, "timeMax");
  if (
    typeof timeMin !== "string" || typeof timeMax !== "string" ||
    !RFC3339.test(timeMin) || !RFC3339.test(timeMax)
  ) return null;
  const start = dateTimeValue(timeMin);
  const end = dateTimeValue(timeMax);
  return start !== null && end !== null &&
      start < end && end - start <= MAX_WINDOW_MS
    ? Object.freeze({ timeMin, timeMax })
    : null;
}

function eventProjection(value: unknown) {
  const summary = readOwnData(value, "summary");
  const start = readOwnData(value, "start");
  const end = readOwnData(value, "end");
  const startDateTime = readOwnData(start, "dateTime");
  const endDateTime = readOwnData(end, "dateTime");
  const startDate = readOwnData(start, "date");
  const endDate = readOwnData(end, "date");
  const normalizedTitle = typeof summary === "string" ? summary.trim() : "";
  const title = normalizedTitle ? normalizedTitle.slice(0, 200) : "未命名行程";
  const startDateTimeValue = dateTimeValue(startDateTime);
  const endDateTimeValue = dateTimeValue(endDateTime);
  if (
    typeof startDateTime === "string" && typeof endDateTime === "string" &&
    startDateTimeValue !== null && endDateTimeValue !== null &&
    endDateTimeValue > startDateTimeValue
  ) {
    return Object.freeze({
      title,
      startsAt: startDateTime,
      endsAt: endDateTime,
      allDay: false,
    });
  }
  const startDateValue = dateOnlyValue(startDate);
  const endDateValue = dateOnlyValue(endDate);
  if (
    typeof startDate === "string" && typeof endDate === "string" &&
    startDateValue !== null && endDateValue !== null &&
    endDateValue > startDateValue
  ) {
    return Object.freeze({
      title,
      startsAt: startDate,
      endsAt: endDate,
      allDay: true,
    });
  }
  return null;
}

function safeFailureState(value: unknown): string {
  return [
      "CASE_NOT_AUTHORIZED",
      "GOOGLE_CALENDAR_RECONNECT_REQUIRED",
      "GOOGLE_CALENDAR_READ_UNAVAILABLE",
      "GOOGLE_CALENDAR_WINDOW_TOO_LARGE",
    ].includes(String(value))
    ? String(value)
    : "CONTEXT_UNAVAILABLE";
}

export function createDrsGoogleCalendarEventsReadHandler(
  port: DrsCalendarServerPort = createSupabaseDrsCalendarServerPort(),
  corsOptions: DrsCorsOptions = {},
  bffGuard: DrsBffGuard = createDrsBffRouteGuard("calendarEventsRead"),
) {
  return async function drsGoogleCalendarEventsRead(request: Request) {
    const cors = createDrsCorsResponder(request, ["POST"], corsOptions);
    if (cors.earlyResponse) return cors.earlyResponse;
    let guarded;
    try {
      guarded = await bffGuard.authorize(request);
    } catch (error) {
      const failure = readDrsBffGuardFailure(error);
      return cors.jsonResponse(failure.status, { state: failure.state });
    }
    const body = await readExactJsonObject(request, ["timeMin", "timeMax"]);
    const window = body ? windowFromBody(body) : null;
    if (!window) {
      return cors.jsonResponse(400, { state: "REQUEST_INVALID" });
    }
    if (port.runtimeReady === false) {
      return cors.jsonResponse(503, {
        state: "DRS_AUTHORIZATION_UNAVAILABLE",
      });
    }
    try {
      const candidateContext = await port.resolveAuthorization(
        { userId: guarded.authenticatedUserId },
        null,
      );
      const context = exactDrsBffCalendarAuthority(
        candidateContext,
        guarded,
      );
      if (!context) {
        return cors.jsonResponse(403, { state: "CASE_NOT_AUTHORIZED" });
      }
      const result = await port.readEvents(context, window);
      if (readOwnData(result, "ok") !== true) {
        const state = safeFailureState(readOwnData(result, "state"));
        return cors.jsonResponse(
          state === "CASE_NOT_AUTHORIZED" ? 403 : 409,
          {
            state,
          },
        );
      }
      if (
        readOwnData(result, "authenticatedUserId") !==
          readOwnData(context, "authenticatedUserId") ||
        readOwnData(result, "selectedCaseId") !==
          readOwnData(context, "selectedCaseId") ||
        readOwnData(result, "assignmentId") !==
          readOwnData(context, "assignmentId") ||
        readOwnData(result, "accountRole") !== "drs" ||
        readOwnData(result, "authorizationSubject") !==
          readOwnData(context, "authorizationSubject") ||
        readOwnData(result, "timeZone") !== "Asia/Taipei"
      ) return cors.jsonResponse(403, { state: "CASE_NOT_AUTHORIZED" });
      const rawItems = readOwnData(result, "items");
      if (!Array.isArray(rawItems) || rawItems.length > 250) {
        return cors.jsonResponse(409, {
          state: "GOOGLE_CALENDAR_WINDOW_TOO_LARGE",
        });
      }
      const events = rawItems.map(eventProjection).filter((event) =>
        event !== null
      );
      return cors.jsonResponse(200, {
        state: "READY",
        caseId: readOwnData(context, "selectedCaseId"),
        timeZone: "Asia/Taipei",
        window,
        events,
      });
    } catch {
      return cors.jsonResponse(409, { state: "CONTEXT_UNAVAILABLE" });
    }
  };
}

if (typeof Deno !== "undefined" && import.meta.main) {
  Deno.serve(createDrsGoogleCalendarEventsReadHandler());
}
