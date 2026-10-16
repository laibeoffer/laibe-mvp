import {
  createVendorCalendarEventsCreateHandler,
  createVendorCalendarEventsUpdateHandler,
  createVendorCalendarRuntimeDependencies,
} from "./runtime.ts";

Deno.test("Vendor calendar event write handlers reject requests after factory binding", async () => {
  const dependencies = createVendorCalendarRuntimeDependencies({
    env: { get: () => undefined },
  });

  for (
    const factory of [
      createVendorCalendarEventsCreateHandler,
      createVendorCalendarEventsUpdateHandler,
    ]
  ) {
    const handler = factory(dependencies);
    if (typeof handler !== "function") {
      throw new Error(
        "calendar handler factory did not return a request handler",
      );
    }
    const response = await handler(
      new Request("https://laibe.invalid/calendar", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "{}",
      }),
    );
    if (response.status !== 403) {
      throw new Error(`calendar event write returned ${response.status}`);
    }
  }
});
