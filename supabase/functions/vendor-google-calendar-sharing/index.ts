import {
  createVendorCalendarRuntimeDependencies,
  createVendorCalendarSharingHandler,
} from "../_shared/vendor-google-calendar-support/runtime.ts";

export function createHandler() {
  return createVendorCalendarSharingHandler(
    createVendorCalendarRuntimeDependencies(),
  );
}

if (typeof Deno !== "undefined" && import.meta.main) {
  Deno.serve(createHandler());
}
