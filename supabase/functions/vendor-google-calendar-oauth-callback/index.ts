import {
  createVendorCalendarConnectCallbackHandler,
  createVendorCalendarRuntimeDependencies,
} from "../_shared/vendor-google-calendar-support/runtime.ts";

const RETIRED_MESSAGE = "這個日曆連結入口已停止使用，請返回萊比重新連結日曆。";

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
    return createVendorCalendarConnectCallbackHandler(
      dependencies ?? createVendorCalendarRuntimeDependencies(),
    )(request);
  };
}

if (typeof Deno !== "undefined" && import.meta.main) {
  Deno.serve(createVendorGoogleCalendarOauthCallbackHandler());
}
