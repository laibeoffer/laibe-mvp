const ORIGIN = "https://synthetic-drs.example";
const PROJECT = "https://synthetic-core.supabase.co";
const PATH = "/functions/v1/drs-reviewer-registration-authority";
const SCHEMA = "laibe.drs-reviewer-registration-authority.v1";
const PUBLIC_KEY = "sb_publishable_synthetic_default_key_only_for_tests";
function assert(value: unknown, message: string): asserts value {
  if (!value) throw new Error(message);
}

Deno.test("registration authority exposes only current configuration and fails closed", async (t) => {
  const module = await import("./drs-reviewer-registration-authority.ts").catch(
    () => null,
  );
  assert(
    module !== null,
    "The read-only registration authority handler must exist",
  );
  let configured = false;
  let rpcResult: unknown = null;
  let rpcStatus = 200;
  let calls = 0;
  let lastRequest: RequestInit | undefined;
  let rpcUrl = "";
  const values: Record<string, string> = {
    LAIBE_DRS_APP_ORIGIN: ORIGIN,
    SUPABASE_URL: PROJECT,
    SUPABASE_SERVICE_ROLE_KEY: "synthetic-service-key-at-least-thirty-two",
    SUPABASE_PUBLISHABLE_KEYS: JSON.stringify({ default: PUBLIC_KEY }),
  };
  const handler = module.createDrsReviewerRegistrationAuthorityHandler({
    env: { get: (name: string) => values[name] },
    fetch: (input: string | URL | Request, init?: RequestInit) => {
      calls++;
      rpcUrl = String(input);
      lastRequest = init;
      return Promise.resolve(
        Response.json(rpcResult ?? { configured }, { status: rpcStatus }),
      );
    },
  });
  const request = (path = PATH, method = "GET", origin = ORIGIN) =>
    new Request(PROJECT + path, {
      method,
      headers: {
        origin,
        apikey: PUBLIC_KEY,
        authorization: "Bearer ignored-browser-token",
        cookie: "ignored=browser-cookie",
      },
    });

  for (const value of [false, true, false]) {
    await t.step(`current configured=${value}`, async () => {
      configured = value;
      const response = await handler(request());
      assert(response.status === 200, "configuration lookup succeeds");
      const body = await response.json();
      const expected = {
        schemaVersion: SCHEMA,
        state: value
          ? "REGISTRATION_AUTHORITY_CONFIGURED"
          : "REGISTRATION_AUTHORITY_UNCONFIGURED",
        reviewAuthority: {
          status: value ? "configured" : "unconfigured",
          label: "萊比註冊審核窗口",
          scope: "reviewer_registration",
        },
      };
      assert(
        JSON.stringify(body) === JSON.stringify(expected),
        "Only the exact public configuration DTO is exposed",
      );
      assert(
        response.headers.get("cache-control") === "no-store",
        "Current configuration must not be cached",
      );
      assert(
        response.headers.get("access-control-allow-origin") === ORIGIN,
        "CORS origin is exact",
      );
      assert(
        rpcUrl ===
          PROJECT + "/rest/v1/rpc/drs_reviewer_registration_authority_v1",
        "Only the read-only RPC may run",
      );
      assert(
        lastRequest?.body === "{}",
        "The RPC accepts no client authority fields",
      );
      assert(
        !JSON.stringify(lastRequest).includes("ignored"),
        "Browser identity and cookies are not forwarded",
      );
    });
  }
  for (
    const [path, method, origin] of [
      [PATH, "POST", ORIGIN],
      [PATH + "?caseId=guess", "GET", ORIGIN],
      [PATH + "/", "GET", ORIGIN],
      [PATH, "GET", "https://wrong.example"],
    ]
  ) {
    await t.step(`reject ${method} ${path} ${origin}`, async () => {
      const before = calls;
      const response = await handler(request(path, method, origin));
      assert(
        response.status === (origin === ORIGIN ? 400 : 403),
        "Invalid boundary is rejected",
      );
      assert(calls === before, "Invalid request cannot reach the RPC");
    });
  }
  for (
    const bad of [
      { configured: "true" },
      { configured: true, actor: "secret" },
      {},
      [true],
    ]
  ) {
    await t.step(
      "reject malformed or over-disclosing RPC payload",
      async () => {
        rpcResult = bad;
        const response = await handler(request());
        assert(response.status === 503, "Untrusted RPC payload fails closed");
        assert(
          JSON.stringify(await response.json()) ===
            '{"state":"CONTEXT_UNAVAILABLE"}',
          "Malformed data is not exposed",
        );
      },
    );
  }
  rpcResult = null;
  await t.step(
    "routing keys are required without granting user authority",
    async () => {
      const before = calls;
      for (const value of [null, "sb_publishable_wrong_synthetic_key"]) {
        const input = request();
        if (value === null) input.headers.delete("apikey");
        else input.headers.set("apikey", value);
        assert(
          (await handler(input)).status === 403,
          "Missing or wrong routing keys must be denied",
        );
      }
      assert(calls === before, "Denied routing key must not invoke the RPC");
    },
  );
  await t.step(
    "hosted key configuration fails closed and local fallback is explicit",
    async () => {
      const before = calls;
      for (
        const named of [
          "",
          " ",
          "invalid",
          "null",
          "[]",
          "{}",
          '{"default":1}',
          '{"default":""}',
        ]
      ) {
        const invalid = module.createDrsReviewerRegistrationAuthorityHandler({
          env: {
            get: (name: string) =>
              name === "SUPABASE_PUBLISHABLE_KEYS"
                ? named
                : name === "SUPABASE_PUBLISHABLE_KEY"
                ? PUBLIC_KEY
                : values[name],
          },
          fetch: () => {
            calls++;
            return Promise.resolve(Response.json({ configured: true }));
          },
        });
        assert(
          (await invalid(request())).status === 503,
          "Malformed hosted keys cannot fall back to local keys",
        );
      }
      assert(
        calls === before,
        "Invalid runtime key config must not invoke the RPC",
      );
      for (const local of [undefined, PUBLIC_KEY]) {
        const fallback = module.createDrsReviewerRegistrationAuthorityHandler({
          env: {
            get: (name: string) =>
              name === "SUPABASE_PUBLISHABLE_KEYS"
                ? undefined
                : name === "SUPABASE_PUBLISHABLE_KEY"
                ? local
                : values[name],
          },
          fetch: () => {
            calls++;
            return Promise.resolve(Response.json({ configured: false }));
          },
        });
        assert(
          (await fallback(request())).status === (local ? 200 : 503),
          "Only absent hosted config permits the local fallback",
        );
      }
      assert(
        calls === before + 1,
        "Only a valid explicit local key invokes the RPC",
      );
    },
  );
  await t.step(
    "preflight enforces the read-only request contract",
    async () => {
      const before = calls;
      for (
        const [method, headers, expected] of [
          ["GET", "apikey, content-type", 204],
          ["POST", "apikey", 403],
          ["GET", "authorization", 403],
        ] as const
      ) {
        const response = await handler(
          new Request(PROJECT + PATH, {
            method: "OPTIONS",
            headers: {
              origin: ORIGIN,
              "access-control-request-method": method,
              "access-control-request-headers": headers,
            },
          }),
        );
        assert(
          response.status === expected,
          "Preflight must use the exact contract",
        );
      }
      assert(calls === before, "Preflight never invokes the RPC");
    },
  );
  for (const mode of ["transport", "timeout", "oversize"] as const) {
    await t.step(`${mode} stays unknown`, async () => {
      const unavailable = module.createDrsReviewerRegistrationAuthorityHandler({
        env: { get: (name: string) => values[name] },
        fetch: () => {
          if (mode === "transport") {
            throw new Error("synthetic upstream details");
          }
          if (mode === "timeout") {
            throw new DOMException("synthetic timeout", "TimeoutError");
          }
          return Promise.resolve(
            new Response(" ".repeat(8192) + '{"configured":true}', {
              headers: { "content-type": "application/json" },
            }),
          );
        },
      });
      const response = await unavailable(request());
      assert(
        response.status === 503,
        "Failure cannot imply an unconfigured operator",
      );
      assert(
        JSON.stringify(await response.json()) ===
          '{"state":"CONTEXT_UNAVAILABLE"}',
        "No upstream details may escape",
      );
    });
  }
  await t.step("RPC failure stays unknown", async () => {
    rpcStatus = 500;
    assert(
      (await handler(request())).status === 503,
      "An RPC error is not an unconfigured result",
    );
    rpcStatus = 200;
  });
  await t.step("bad runtime config cannot invoke RPC", async () => {
    const before = calls;
    const missing = module.createDrsReviewerRegistrationAuthorityHandler({
      env: { get: () => undefined },
    });
    assert(
      (await missing(request())).status === 503,
      "Missing runtime configuration fails closed",
    );
    assert(calls === before, "No RPC on invalid config");
  });
});
