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
          console.warn("calendar_callback_rejected", phase, "unclassified");
        }
        return response;
      },
    );
  };
}

if (typeof Deno !== "undefined" && import.meta.main) {
  Deno.serve(createVendorGoogleCalendarOauthCallbackHandler());
}
