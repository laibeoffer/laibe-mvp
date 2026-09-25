import {
  createOwnerCalendarEventsReadHandler,
  createOwnerCalendarRuntimeDependencies,
} from "../_shared/vendor-google-calendar-support/owner-runtime.ts";

export function createHandler() {
  return createOwnerCalendarEventsReadHandler(
    createOwnerCalendarRuntimeDependencies(),
  );
}

if (typeof Deno !== "undefined" && import.meta.main) {
  Deno.serve(createHandler());
}
