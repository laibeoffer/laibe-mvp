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

export function createDrsGoogleCalendarRevokeHandler(
  port: DrsCalendarServerPort = createSupabaseDrsCalendarServerPort(),
  corsOptions: DrsCorsOptions = {},
  bffGuard: DrsBffGuard = createDrsBffRouteGuard("calendarRevoke"),
) {
  return async function drsGoogleCalendarRevoke(request: Request) {
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
      const result = await port.revoke(context);
      const exact = readOwnData(result, "ok") === true &&
        readOwnData(result, "state") === "REVOKED" &&
        readOwnData(result, "authenticatedUserId") ===
          readOwnData(context, "authenticatedUserId") &&
        readOwnData(result, "selectedCaseId") ===
          readOwnData(context, "selectedCaseId") &&
        readOwnData(result, "assignmentId") ===
          readOwnData(context, "assignmentId") &&
        readOwnData(result, "accountRole") === "drs" &&
        readOwnData(result, "authorizationSubject") ===
          readOwnData(context, "authorizationSubject");
      if (!exact) {
        const state = readOwnData(result, "state") ===
            "GOOGLE_CALENDAR_NOT_CONNECTED"
          ? "GOOGLE_CALENDAR_NOT_CONNECTED"
          : "CASE_NOT_AUTHORIZED";
        return cors.jsonResponse(
          state === "CASE_NOT_AUTHORIZED" ? 403 : 409,
          {
            state,
          },
        );
      }
      return cors.jsonResponse(200, { state: "REVOKED" });
    } catch {
      return cors.jsonResponse(409, { state: "CONTEXT_UNAVAILABLE" });
    }
  };
}

if (typeof Deno !== "undefined" && import.meta.main) {
  Deno.serve(createDrsGoogleCalendarRevokeHandler());
}
