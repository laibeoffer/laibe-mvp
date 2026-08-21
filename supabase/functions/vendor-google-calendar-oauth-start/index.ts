import {
  createOAuthStartHandler,
  createSupabaseGoogleCalendarOAuthDependencies,
} from "../_shared/google-calendar/google-oauth-adapter.ts";

export const DEFAULT_CLOSED_STATE = "CONTEXT_UNAVAILABLE";
export const AUTH_CLOSED_STATE = "AUTH_REQUIRED";

export function createVendorGoogleCalendarOauthStartHandler(
  dependencies: Parameters<typeof createOAuthStartHandler>[1] =
    createSupabaseGoogleCalendarOAuthDependencies("pro"),
) {
  return createOAuthStartHandler("pro", dependencies);
}

if (typeof Deno !== "undefined" && import.meta.main) {
  Deno.serve(createVendorGoogleCalendarOauthStartHandler());
}
