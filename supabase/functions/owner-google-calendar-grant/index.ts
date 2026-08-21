import {
  createCaseMemberGrantResolver,
  createSupabaseCaseMemberGrantDependencies,
} from "../_shared/google-calendar/case-calendar-authorization.ts";
import { jsonResponse } from "../_shared/google-calendar/contracts.ts";

export const DEFAULT_CLOSED_STATE = "CONTEXT_UNAVAILABLE";
export const AUTH_CLOSED_STATE = "AUTH_REQUIRED";

export function createOwnerGoogleCalendarGrantHandler(
  dependencies: Parameters<typeof createCaseMemberGrantResolver>[0] =
    createSupabaseCaseMemberGrantDependencies(),
) {
  const resolveGrant = createCaseMemberGrantResolver(dependencies);
  return async function ownerGoogleCalendarGrant(request: Request) {
    if (request.method !== "GET") {
      return jsonResponse(405, { state: "CONTEXT_UNAVAILABLE" });
    }
    const result = await resolveGrant(request, "owner");
    return result.ok
      ? jsonResponse(200, result.grant)
      : jsonResponse(result.state === "AUTH_REQUIRED" ? 401 : 403, {
        state: result.state,
      });
  };
}

if (typeof Deno !== "undefined" && import.meta.main) {
  Deno.serve(createOwnerGoogleCalendarGrantHandler());
}
