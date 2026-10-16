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

Deno.test("Google issuer is verified before the current callback claims state", async () => {
  const createHandler =
    createVendorGoogleCalendarOauthCallbackHandler as unknown as (
      dependencies: unknown,
    ) => (request: Request) => Response | Promise<Response>;
  let claims = 0;
  const handler = createHandler({
    callbackUri: VENDOR_CALENDAR_CALLBACK_URI,
    configured: true,
    domain: Promise.resolve("calendar-v2"),
    dispatch: (action: string) => {
      if (action === "callback_claim") claims++;
      return Promise.reject(new Error("Synthetic flow has no stored state"));
    },
  });
  const callback = (issuer: string) =>
    new Request(
      `${VENDOR_CALENDAR_CALLBACK_URI}?state=${
        "a".repeat(64)
      }&code=synthetic-code&iss=${encodeURIComponent(issuer)}`,
    );

  const googleResponse = await handler(callback("https://accounts.google.com"));
  assert(googleResponse.status === 400, "synthetic state should fail safely");
  assert(claims === 1, "verified Google issuer should reach the v2 claim");

  const forgedResponse = await handler(callback("https://example.invalid"));
  assert(forgedResponse.status === 400, "forged issuer should fail safely");
  assert(claims === 1, "forged issuer must not reach the v2 claim");
});

Deno.test("callback failure records only a bounded phase and error category", async () => {
  const warnings: unknown[][] = [];
  const originalWarn = console.warn;
  console.warn = (...values: unknown[]) => {
    warnings.push(values);
  };
  try {
    const createHandler =
      createVendorGoogleCalendarOauthCallbackHandler as unknown as (
        dependencies: unknown,
      ) => (request: Request) => Response | Promise<Response>;
    const handler = createHandler({
      callbackUri: VENDOR_CALENDAR_CALLBACK_URI,
      configured: true,
      domain: Promise.resolve("calendar-v2"),
      dispatch: () =>
        Promise.resolve({
          ok: false,
          state: "code=private-code&state=private-state",
        }),
    });
    const response = await handler(
      new Request(
        `${VENDOR_CALENDAR_CALLBACK_URI}?state=${
          "a".repeat(64)
        }&code=synthetic-code&iss=https%3A%2F%2Faccounts.google.com`,
      ),
    );
    assert(response.status === 400, "failed claim should remain safe");
    assert(
      JSON.stringify(warnings) ===
        JSON.stringify([[
          "calendar_callback_rejected",
          "callback_claim",
          "unknown",
        ]]),
      "diagnostic must contain only a fixed phase and category",
    );
  } finally {
    console.warn = originalWarn;
  }
});

Deno.test("callback reports unavailable configuration before claiming state", async () => {
  const warnings: unknown[][] = [];
  const originalWarn = console.warn;
  console.warn = (...values: unknown[]) => warnings.push(values);
  try {
    const createHandler =
      createVendorGoogleCalendarOauthCallbackHandler as unknown as (
        dependencies: unknown,
      ) => (request: Request) => Response | Promise<Response>;
    const handler = createHandler({
      callbackUri: VENDOR_CALENDAR_CALLBACK_URI,
      configured: false,
      domain: Promise.resolve("calendar-v2"),
      dispatch: () => {
        throw new Error("must not claim");
      },
    });
    const response = await handler(
      new Request(
        `${VENDOR_CALENDAR_CALLBACK_URI}?state=${
          "a".repeat(64)
        }&code=synthetic-code&iss=https%3A%2F%2Faccounts.google.com`,
      ),
    );
    assert(
      response.status === 400,
      "unavailable configuration should fail safely",
    );
    assert(
      JSON.stringify(warnings) ===
        JSON.stringify([[
          "calendar_callback_rejected",
          "before_dispatch",
          "setup_unavailable",
        ]]),
      "diagnostic should identify unavailable configuration without secrets",
    );
  } finally {
    console.warn = originalWarn;
  }
});

Deno.test("callback classifies unexpected query keys without logging their values", async () => {
  const warnings: unknown[][] = [];
  const originalWarn = console.warn;
  console.warn = (...values: unknown[]) => warnings.push(values);
  try {
    const createHandler =
      createVendorGoogleCalendarOauthCallbackHandler as unknown as (
        dependencies: unknown,
      ) => (request: Request) => Response | Promise<Response>;
    const handler = createHandler({
      callbackUri: VENDOR_CALENDAR_CALLBACK_URI,
      configured: true,
      domain: Promise.resolve("calendar-v2"),
      dispatch: () => {
        throw new Error("must not claim");
      },
    });
    const response = await handler(
      new Request(
        `${VENDOR_CALENDAR_CALLBACK_URI}?state=${
          "a".repeat(64)
        }&code=synthetic-code&iss=https%3A%2F%2Faccounts.google.com&unexpected=private-value`,
      ),
    );
    assert(response.status === 400, "unexpected query should fail safely");
    assert(
      JSON.stringify(warnings) ===
        JSON.stringify([[
          "calendar_callback_rejected",
          "before_dispatch",
          "query_invalid",
        ]]),
      "diagnostic should identify the query shape without logging its contents",
    );
  } finally {
    console.warn = originalWarn;
  }
});
