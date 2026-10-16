const RETIRED_MESSAGE = "這個日曆連結入口已停止使用，請返回萊比重新連結日曆。";

export function createVendorGoogleCalendarOauthCallbackHandler() {
  return (_request: Request): Response =>
    new Response(RETIRED_MESSAGE, {
      status: 410,
      headers: {
        "content-type": "text/plain; charset=utf-8",
        "cache-control": "no-store",
      },
    });
}

if (typeof Deno !== "undefined" && import.meta.main) {
  Deno.serve(createVendorGoogleCalendarOauthCallbackHandler());
}
