import {
  createOAuthCallbackHandler,
  createSupabaseGoogleCalendarOAuthDependencies,
} from "../_shared/google-calendar/google-oauth-adapter.ts";

export const DEFAULT_CLOSED_STATE = "CONTEXT_UNAVAILABLE";
export const AUTH_CLOSED_STATE = "AUTH_REQUIRED";

export function createOwnerGoogleCalendarOauthCallbackHandler(
  dependencies: Parameters<typeof createOAuthCallbackHandler>[1] =
    createSupabaseGoogleCalendarOAuthDependencies("owner"),
) {
  return createOAuthCallbackHandler("owner", dependencies);
}

if (typeof Deno !== "undefined" && import.meta.main) {
  Deno.serve(createOwnerGoogleCalendarOauthCallbackHandler());
}
