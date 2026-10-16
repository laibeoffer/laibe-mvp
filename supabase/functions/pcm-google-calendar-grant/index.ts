import {
  createPcmCalendarGrantHandler,
  createPcmCalendarProductionDependencies,
} from "../pcm-google-calendar-events-read/index.ts";

export { createPcmCalendarGrantHandler };

export function createHandler() {
  return createPcmCalendarGrantHandler(
    createPcmCalendarProductionDependencies(),
  );
}

if (typeof Deno !== "undefined" && import.meta.main) {
  Deno.serve(createHandler());
}
