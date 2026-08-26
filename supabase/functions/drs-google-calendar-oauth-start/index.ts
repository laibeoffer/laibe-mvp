import {
  createOAuthStartHandler,
  createSupabaseGoogleCalendarOAuthDependencies,
} from "../_shared/google-calendar/google-oauth-adapter.ts";
import {
  createDrsCorsResponder,
  createSupabaseDrsSpecialistAuthorizationStrategy,
  type DrsCorsOptions,
} from "../_shared/google-calendar/drs-specialist-authorization.ts";
import {
  createDrsBffRouteGuard,
  type DrsBffGuard,
  exactDrsBffCalendarAuthority,
  readDrsBffGuardFailure,
} from "../_shared/drs-auth/drs-bff-route-composition.ts";

export const VERIFY_JWT = false;
export const DEFAULT_CLOSED_STATE = "CONTEXT_UNAVAILABLE";

function defaultDependencies() {
  return createSupabaseGoogleCalendarOAuthDependencies("drs", {
    drsAuthorizationStrategy:
      createSupabaseDrsSpecialistAuthorizationStrategy(),
  });
}

export function createDrsGoogleCalendarOauthStartHandler(
  dependencies: Parameters<typeof createOAuthStartHandler>[1] =
    defaultDependencies(),
  corsOptions: DrsCorsOptions = {},
  bffGuard: DrsBffGuard = createDrsBffRouteGuard("calendarOauthStart"),
  authorization = createSupabaseDrsSpecialistAuthorizationStrategy(),
) {
  return async function drsGoogleCalendarOauthStart(request: Request) {
    const cors = createDrsCorsResponder(request, ["POST"], corsOptions);
    if (cors.earlyResponse) return cors.earlyResponse;
    let guarded;
    try {
      guarded = await bffGuard.authorize(request);
    } catch (error) {
      const failure = readDrsBffGuardFailure(error);
      return cors.jsonResponse(failure.status, { state: failure.state });
    }
    if (dependencies.runtimeReady === false) {
      return cors.jsonResponse(503, {
        state: "DRS_AUTHORIZATION_UNAVAILABLE",
      });
    }
    try {
      const candidateContext = await authorization.resolveAuthorization({
        authenticatedUserId: guarded.authenticatedUserId,
        accountRole: "drs",
        pending: null,
      });
      const context = exactDrsBffCalendarAuthority(
        candidateContext,
        guarded,
      );
      if (!context) {
        return cors.jsonResponse(403, { state: "CASE_NOT_AUTHORIZED" });
      }
      const handler = createOAuthStartHandler("drs", {
        ...dependencies,
        resolveServerContext: () => Promise.resolve(context),
        resolveAuthenticatedIdentity: () => Promise.resolve(null),
      });
      return cors.apply(await handler(request));
    } catch {
      return cors.jsonResponse(503, { state: "CONTEXT_UNAVAILABLE" });
    }
  };
}

if (typeof Deno !== "undefined" && import.meta.main) {
  Deno.serve(createDrsGoogleCalendarOauthStartHandler());
}
