import {
  createVendorCalendarConnectCallbackHandler,
  createVendorCalendarRuntimeDependencies,
} from "../_shared/vendor-google-calendar-support/runtime.ts";

export function normalizeVendorCalendarCallbackRequest(
  request: Request,
): Request {
  const url = new URL(request.url);
  if (url.pathname !== "/vendor-google-calendar-connect-callback") {
    return request;
  }
  url.pathname = "/functions/v1/vendor-google-calendar-connect-callback";
  return new Request(url.toString(), request);
}

export function createHandler(
  dependencies: Parameters<
    typeof createVendorCalendarConnectCallbackHandler
  >[0] = createVendorCalendarRuntimeDependencies(),
) {
  const handler = createVendorCalendarConnectCallbackHandler(dependencies);
  return (request: Request) =>
    handler(normalizeVendorCalendarCallbackRequest(request));
}

if (typeof Deno !== "undefined" && import.meta.main) {
  Deno.serve(createHandler());
}
