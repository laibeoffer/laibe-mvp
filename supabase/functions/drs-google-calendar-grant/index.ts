import {
  createDrsCorsResponder,
  createSupabaseDrsCalendarServerPort,
  type DrsCalendarServerPort,
  type DrsCorsOptions,
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

function failureState(value: unknown): string {
  return [
      "CASE_NOT_AUTHORIZED",
      "GOOGLE_CALENDAR_NOT_CONNECTED",
      "GOOGLE_CALENDAR_BINDING_REVOKED",
      "GOOGLE_CALENDAR_RECONNECT_REQUIRED",
    ].includes(String(value))
    ? String(value)
    : "CONTEXT_UNAVAILABLE";
}

export function createDrsGoogleCalendarGrantHandler(
  port: DrsCalendarServerPort = createSupabaseDrsCalendarServerPort(),
  corsOptions: DrsCorsOptions = {},
  bffGuard: DrsBffGuard = createDrsBffRouteGuard("calendarGrant"),
) {
  return async function drsGoogleCalendarGrant(request: Request) {
    const cors = createDrsCorsResponder(request, ["POST"], corsOptions);
    if (cors.earlyResponse) return cors.earlyResponse;
    let guarded;
    try {
      guarded = await bffGuard.authorize(request);
    } catch (error) {
      const failure = readDrsBffGuardFailure(error);
      return cors.jsonResponse(failure.status, { state: failure.state });
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
      const result = await port.loadGrant(context);
      if (readOwnData(result, "ok") !== true) {
        const state = failureState(readOwnData(result, "state"));
        return cors.jsonResponse(
          state === "CASE_NOT_AUTHORIZED" ? 403 : 409,
          {
            state,
          },
        );
      }
      const grant = readOwnData(result, "grant");
      const authenticatedUserId = readOwnData(context, "authenticatedUserId");
      const selectedCaseId = readOwnData(context, "selectedCaseId");
      const assignmentId = readOwnData(context, "assignmentId");
      const authorizationSubject = readOwnData(
        context,
        "authorizationSubject",
      );
      const calendarId = readOwnData(grant, "calendarId");
      if (
        readOwnData(grant, "authenticatedUserId") !== authenticatedUserId ||
        readOwnData(grant, "selectedCaseId") !== selectedCaseId ||
        readOwnData(grant, "assignmentId") !== assignmentId ||
        readOwnData(grant, "accountRole") !== "drs" ||
        readOwnData(grant, "authorizationSubject") !== authorizationSubject ||
        readOwnData(grant, "connectionStatus") !== "connected" ||
        readOwnData(grant, "bindingStatus") !== "active" ||
        typeof calendarId !== "string" || calendarId.length === 0 ||
        calendarId.length > 1024 ||
        readOwnData(grant, "timeZone") !== "Asia/Taipei"
      ) return cors.jsonResponse(403, { state: "CASE_NOT_AUTHORIZED" });
      return cors.jsonResponse(200, {
        state: "READY",
        grant: {
          schemaVersion: "laibe.drs-calendar-read.v1",
          caseId: selectedCaseId,
          accessMode: "read_only",
          connectionStatus: "connected",
          timeZone: "Asia/Taipei",
        },
      });
    } catch {
      return cors.jsonResponse(409, { state: "CONTEXT_UNAVAILABLE" });
    }
  };
}

if (typeof Deno !== "undefined" && import.meta.main) {
  Deno.serve(createDrsGoogleCalendarGrantHandler());
}
