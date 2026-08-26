import {
  createOAuthCallbackHandler,
  createSupabaseGoogleCalendarOAuthDependencies,
} from "../_shared/google-calendar/google-oauth-adapter.ts";
import {
  createSupabaseDrsSpecialistAuthorizationStrategy,
} from "../_shared/google-calendar/drs-specialist-authorization.ts";
import { jsonResponse } from "../_shared/google-calendar/contracts.ts";

export const VERIFY_JWT = false;
export const DEFAULT_CLOSED_STATE = "CONTEXT_UNAVAILABLE";

function defaultDependencies() {
  return createSupabaseGoogleCalendarOAuthDependencies("drs", {
    drsAuthorizationStrategy:
      createSupabaseDrsSpecialistAuthorizationStrategy(),
  });
}

function exactCallbackQuery(request: Request): boolean {
  try {
    const query = new URL(request.url).searchParams;
    return [...query.keys()].length === 2 &&
      query.getAll("code").length === 1 &&
      query.getAll("state").length === 1 &&
      Boolean(query.get("code")) && Boolean(query.get("state"));
  } catch {
    return false;
  }
}

export function createDrsGoogleCalendarOauthCallbackHandler(
  dependencies: Parameters<typeof createOAuthCallbackHandler>[1] =
    defaultDependencies(),
) {
  const handler = createOAuthCallbackHandler("drs", dependencies);
  return async function drsGoogleCalendarOauthCallback(request: Request) {
    if (request.method !== "GET") {
      return jsonResponse(405, { state: "CONTEXT_UNAVAILABLE" });
    }
    if (!exactCallbackQuery(request)) {
      return jsonResponse(400, { state: "REQUEST_INVALID" });
    }
    if (dependencies.runtimeReady === false) {
      return jsonResponse(503, { state: "DRS_AUTHORIZATION_UNAVAILABLE" });
    }
    return await handler(request);
  };
}

if (typeof Deno !== "undefined" && import.meta.main) {
  Deno.serve(createDrsGoogleCalendarOauthCallbackHandler());
}
