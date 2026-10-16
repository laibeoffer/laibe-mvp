import {
  createVendorCalendarConnectCallbackHandler,
  createVendorCalendarRuntimeDependencies,
} from "../_shared/vendor-google-calendar-support/runtime.ts";

const RETIRED_MESSAGE = "這個日曆連結入口已停止使用，請返回萊比重新連結日曆。";
const CALLBACK_ACTIONS = new Set([
  "callback_claim",
  "callback_check",
  "callback_subject",
  "callback_complete",
]);
const CALLBACK_FAILURES = new Set([
  "flow_invalid",
  "flow_expired",
  "session_changed",
  "context_changed",
  "case_not_authorized",
  "revision_conflict",
  "setup_unavailable",
  "reconsent_required",
  "scope_not_supported",
  "sign_in_required",
]);
const CALLBACK_QUERY_KEYS = new Set([
  "state",
  "code",
  "scope",
  "authuser",
  "prompt",
  "error",
  "error_description",
  "error_uri",
]);

function preDispatchCategory(
  request: Request,
  runtime: Parameters<typeof createVendorCalendarConnectCallbackHandler>[0],
): string {
  const url = new URL(request.url);
  if (request.method !== "GET") return "method_invalid";
  if (url.origin + url.pathname !== runtime.callbackUri) {
    let expected: URL;
    try {
      expected = new URL(runtime.callbackUri);
    } catch {
      return "uri_config_invalid";
    }
    if (url.origin === expected.origin) return "uri_path_mismatch";
    if (url.pathname === expected.pathname) return "uri_origin_mismatch";
    return "uri_both_mismatch";
  }
  if (!runtime.configured) return "setup_unavailable";
  if (
    [...url.searchParams.keys()].some((key) =>
      !CALLBACK_QUERY_KEYS.has(key) || url.searchParams.getAll(key).length !== 1
    )
  ) return "query_invalid";
  if (url.searchParams.has("error")) return "provider_error";
  const state = url.searchParams.get("state");
  const code = url.searchParams.get("code");
  if (!state || !/^[A-Za-z0-9_-]{64}$/u.test(state)) return "state_invalid";
  if (!code || code.length > 8192 || /\p{C}/u.test(code)) {
    return "code_invalid";
  }
  return "unclassified";
}

function retiredResponse(): Response {
  return new Response(RETIRED_MESSAGE, {
    status: 410,
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

export function createVendorGoogleCalendarOauthCallbackHandler(
  dependencies?: Parameters<
    typeof createVendorCalendarConnectCallbackHandler
  >[0],
) {
  return (request: Request): Response | Promise<Response> => {
    const url = new URL(request.url);
    const state = url.searchParams.get("state");
    if (
      request.method !== "GET" || !state ||
      !/^[A-Za-z0-9_-]{64}$/u.test(state)
    ) return retiredResponse();
    const issuer = url.searchParams.getAll("iss");
    if (issuer.length === 1 && issuer[0] === "https://accounts.google.com") {
      url.searchParams.delete("iss");
      request = new Request(url, request);
    }
    const runtime = dependencies ?? createVendorCalendarRuntimeDependencies();
    try {
      const canonical = new URL(runtime.callbackUri);
      canonical.search = url.search;
      request = new Request(canonical, request);
    } catch {
      // Let the shared handler reject an invalid callback configuration.
    }
    let phase = "before_dispatch";
    let reported = false;
    const observed = {
      ...runtime,
      dispatch: async (...args: Parameters<typeof runtime.dispatch>) => {
        const [action] = args;
        phase = CALLBACK_ACTIONS.has(action) ? action : "other";
        try {
          const result = await runtime.dispatch(...args);
          if (result.ok !== true) {
            const state = result.state;
            const category = typeof state === "string" &&
                CALLBACK_FAILURES.has(state)
              ? state
              : "unknown";
            console.warn("calendar_callback_rejected", phase, category);
            reported = true;
          }
          return result;
        } catch (error) {
          console.warn("calendar_callback_rejected", phase, "transport_error");
          reported = true;
          throw error;
        }
      },
    };
    return createVendorCalendarConnectCallbackHandler(observed)(request).then(
      (response) => {
        if (response.status >= 400 && !reported) {
          console.warn(
            "calendar_callback_rejected",
            phase,
            preDispatchCategory(request, runtime),
          );
        }
        return response;
      },
    );
  };
}

if (typeof Deno !== "undefined" && import.meta.main) {
  Deno.serve(createVendorGoogleCalendarOauthCallbackHandler());
}
