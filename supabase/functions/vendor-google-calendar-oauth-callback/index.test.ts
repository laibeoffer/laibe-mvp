import { createVendorGoogleCalendarOauthCallbackHandler } from "./index.ts";
import { VENDOR_CALENDAR_CALLBACK_URI } from "../_shared/vendor-google-calendar-support/contracts.ts";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

Deno.test("retired Calendar callback returns the same safe 410 without side effects", async () => {
  let dependencyAccesses = 0;
  let fetchCalls = 0;
  const dependencies = new Proxy({}, {
    get() {
      dependencyAccesses++;
      throw new Error("Legacy OAuth dependency was reached");
    },
  });
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (() => {
    fetchCalls++;
    throw new Error("Network request was reached");
  }) as typeof fetch;

  try {
    const createHandler =
      createVendorGoogleCalendarOauthCallbackHandler as unknown as (
        dependencies: unknown,
      ) => (request: Request) => Response | Promise<Response>;
    const handler = createHandler(dependencies);
    let expectedBody: string | undefined;

    for (
      const method of [
        "GET",
        "POST",
        "PUT",
        "PATCH",
        "DELETE",
        "OPTIONS",
        "HEAD",
      ]
    ) {
      for (
        const query of [
          "",
          "?code=private-code&state=private-state",
          "?error=access_denied&state=private-state",
        ]
      ) {
        const response = await handler(
          new Request(`https://example.invalid/callback${query}`, { method }),
        );
        const body = await response.text();
        assert(
          response.status === 410,
          `${method}${query}: expected HTTP 410, got ${response.status}`,
        );
        assert(
          response.headers.get("content-type")?.startsWith("text/plain"),
          `${method}${query}: expected plain text`,
        );
        assert(
          !body.includes("private-code") && !body.includes("private-state"),
          `${method}${query}: sensitive value leaked`,
        );
        assert(
          !/(api|db|oauth|token|debug|mock|stack trace)/i.test(body),
          `${method}${query}: engineering text leaked`,
        );
        expectedBody ??= body;
        assert(
          body === expectedBody,
          `${method}${query}: response varied with request`,
        );
      }
    }

    assert(
      dependencyAccesses === 0,
      `Legacy dependencies reached ${dependencyAccesses} times`,
    );
    assert(fetchCalls === 0, `Network reached ${fetchCalls} times`);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

Deno.test("Calendar v2 uses the registered legacy callback URI", () => {
  assert(
    VENDOR_CALENDAR_CALLBACK_URI ===
      "https://zdwuyomhswjcbbpbhpcq.supabase.co/functions/v1/vendor-google-calendar-oauth-callback",
    "Calendar v2 must return through the registered callback",
  );
});

Deno.test("registered callback delegates a current flow without legacy ACL access", async () => {
  let claims = 0;
  const createHandler =
    createVendorGoogleCalendarOauthCallbackHandler as unknown as (
      dependencies: unknown,
    ) => (request: Request) => Response | Promise<Response>;
  const handler = createHandler({
    callbackUri: VENDOR_CALENDAR_CALLBACK_URI,
    configured: true,
    domain: Promise.resolve("calendar-v2"),
    dispatch: (action: string) => {
      if (action === "callback_claim") claims++;
      return Promise.reject(new Error("Synthetic flow has no stored state"));
    },
  });
  const response = await handler(
    new Request(
      `${VENDOR_CALENDAR_CALLBACK_URI}?state=${
        "a".repeat(64)
      }&code=synthetic-code`,
    ),
  );
  assert(claims === 1, `expected one v2 claim, got ${claims}`);
  assert(
    response.status === 400,
    `expected safe failed claim, got ${response.status}`,
  );
});
