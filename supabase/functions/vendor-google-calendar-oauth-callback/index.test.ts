import { createVendorGoogleCalendarOauthCallbackHandler } from "./index.ts";

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
