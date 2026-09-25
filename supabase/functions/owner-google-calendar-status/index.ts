import {
  createOwnerCalendarRuntimeDependencies,
  createOwnerCalendarStatusHandler,
} from "../_shared/vendor-google-calendar-support/owner-runtime.ts";

export function createHandler() {
  return createOwnerCalendarStatusHandler(
    createOwnerCalendarRuntimeDependencies(),
  );
}

if (typeof Deno !== "undefined" && import.meta.main) {
  Deno.serve(createHandler());
}
