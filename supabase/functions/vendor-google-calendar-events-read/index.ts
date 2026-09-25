import {
  createVendorCalendarEventsReadHandler,
  createVendorCalendarRuntimeDependencies,
} from "../_shared/vendor-google-calendar-support/runtime.ts";

export function createHandler() {
  return createVendorCalendarEventsReadHandler(
    createVendorCalendarRuntimeDependencies(),
  );
}

if (typeof Deno !== "undefined" && import.meta.main) {
  Deno.serve(createHandler());
}
