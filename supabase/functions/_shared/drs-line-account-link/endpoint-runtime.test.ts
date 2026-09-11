import {
  createDefaultLineAccountLinkEndpointDependencies,
  LINE_ACCOUNT_LINK_ENDPOINT_REQUIRED_ENVIRONMENT,
} from "./endpoint-runtime.ts";
import {
  createLineLinkCancelHandler,
  createLineLinkContinueHandler,
  createLineLinkStartHandler,
  createLineLinkStatusHandler,
  createLineLinkUnlinkHandler,
} from "./http.ts";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const COMPLETE_ENVIRONMENT = Object.freeze<Record<string, string>>({
  SUPABASE_URL: "https://project.supabase.co",
  SUPABASE_SERVICE_ROLE_KEY: "s".repeat(32),
  LAIBE_DRS_APP_ORIGIN: "https://laibe.example",
  LAIBE_DRS_SESSION_SUCCESS_URL:
    "https://laibe.example/pcm/reviewer/access/#login",
  LAIBE_DRS_SESSION_COOKIE_NAME: "__Host-laibe-drs-session",
  LAIBE_DRS_SESSION_COOKIE_KEY_V1:
    "AQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQE",
  LAIBE_DRS_BFF_PROOF_KEY_V1: "AgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgI",
  LINE_CHANNEL_SECRET: "c".repeat(16),
  LINE_CHANNEL_ACCESS_TOKEN: "test-channel-access-token",
  DRS_LINE_PROVIDER_CHANNEL_ID: "1234567890",
  DRS_LINE_IDENTITY_HMAC_KEY: "h".repeat(32),
  DRS_LINE_IDENTITY_ENCRYPTION_KEY: "A".repeat(43),
  DRS_LINE_IDENTITY_ENCRYPTION_KEY_VERSION: "line-key-v1",
  DRS_PUBLIC_ORIGIN: "https://laibe.example",
  DRS_LINE_OFFICIAL_ACCOUNT_URL: "https://line.me/R/ti/p/@laibe",
});

function environmentWith(overrides: Record<string, string | undefined> = {}) {
  return Object.freeze({
    get(name: string): string | undefined {
      return Object.prototype.hasOwnProperty.call(overrides, name)
        ? overrides[name]
        : COMPLETE_ENVIRONMENT[name];
    },
  });
}

const HANDLERS = Object.freeze({
  start: createLineLinkStartHandler,
  status: createLineLinkStatusHandler,
  cancel: createLineLinkCancelHandler,
  continue: createLineLinkContinueHandler,
  unlink: createLineLinkUnlinkHandler,
});

type EndpointName = keyof typeof HANDLERS;

function request(name: EndpointName, malformed = false): Request {
  const pathname = `/functions/v1/drs-line-account-link-${name}`;
  if (name === "status") {
    return new Request(
      `https://edge.example${pathname}`,
      malformed
        ? {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: "{}",
        }
        : {
          headers: {
            origin: "https://laibe.example",
            "sec-fetch-site": "same-origin",
          },
        },
    );
  }
  return new Request(
    `https://edge.example${pathname}${
      name === "continue" ? "?linkToken=opaque" : ""
    }`,
    malformed ? { method: "GET" } : {
      method: "POST",
      headers: {
        origin: "https://laibe.example",
        "content-type": "application/json",
      },
      body: "{}",
    },
  );
}

async function assertUnavailable(response: Response): Promise<string> {
  assert(response.status === 503, `expected 503, got ${response.status}`);
  const body = await response.json();
  assert(
    body?.state === "temporarily_unavailable" && body?.nextAction === "retry",
    "response must expose only the safe unavailable DTO",
  );
  assert(
    Object.keys(body).sort().join(",") === "nextAction,state",
    "unavailable DTO must not expose extra fields",
  );
  return JSON.stringify(body);
}

Deno.test("default factories require the complete LINE and secure-session runtime", () => {
  const secureSessionNames = [
    "LAIBE_DRS_SESSION_SUCCESS_URL",
    "LAIBE_DRS_SESSION_COOKIE_NAME",
    "LAIBE_DRS_SESSION_COOKIE_KEY_V1",
    "LAIBE_DRS_BFF_PROOF_KEY_V1",
  ];
  for (const name of secureSessionNames) {
    assert(
      LINE_ACCOUNT_LINK_ENDPOINT_REQUIRED_ENVIRONMENT.includes(name as never),
      `${name} must be in the required closure`,
    );
  }
  for (const name of Object.keys(HANDLERS) as EndpointName[]) {
    const dependencies = createDefaultLineAccountLinkEndpointDependencies(
      name,
      { env: environmentWith() },
    );
    assert(dependencies.runtimeReady, `${name} default factory must be ready`);
  }
});

Deno.test("every missing runtime setting closes all endpoints before parsing or effects", async () => {
  let proofSignatureCalls = 0;
  let databaseCalls = 0;
  let providerCalls = 0;
  const unavailable = () => {
    databaseCalls += 1;
    providerCalls += 1;
    throw new Error("must not run");
  };
  for (const missing of LINE_ACCOUNT_LINK_ENDPOINT_REQUIRED_ENVIRONMENT) {
    for (const name of Object.keys(HANDLERS) as EndpointName[]) {
      const defaults = createDefaultLineAccountLinkEndpointDependencies(name, {
        env: environmentWith({ [missing]: undefined }),
        fetch() {
          databaseCalls += 1;
          return Promise.reject(new Error("must not run"));
        },
      });
      assert(!defaults.runtimeReady, `missing ${missing} must close ${name}`);
      const handler = HANDLERS[name]({
        ...defaults,
        guard: {
          authorize() {
            proofSignatureCalls += 1;
            throw new Error("must not run");
          },
        },
        service: {
          start: unavailable,
          status: unavailable,
          cancel: unavailable,
          unlink: unavailable,
          continueLink: unavailable,
        },
      });
      const wellFormed = await assertUnavailable(await handler(request(name)));
      const malformed = await assertUnavailable(
        await handler(request(name, true)),
      );
      assert(
        wellFormed === malformed,
        `${name} must return the same DTO when ${missing} is missing`,
      );
    }
  }
  assert(proofSignatureCalls === 0, "proof signature must not run");
  assert(databaseCalls === 0, "database must not run");
  assert(providerCalls === 0, "provider must not run");
});

Deno.test("secure-session runtime failure and omitted readiness both fail closed", async () => {
  const sameKey = COMPLETE_ENVIRONMENT.LAIBE_DRS_SESSION_COOKIE_KEY_V1;
  const defaults = createDefaultLineAccountLinkEndpointDependencies("status", {
    env: environmentWith({ LAIBE_DRS_BFF_PROOF_KEY_V1: sameKey }),
  });
  assert(!defaults.runtimeReady, "invalid secure-session runtime must close");
  await assertUnavailable(
    await createLineLinkStatusHandler(defaults)(request("status")),
  );

  const unsafeOmission = {
    allowedOrigin: "https://laibe.example",
    guard: { authorize: () => Promise.reject(new Error("must not run")) },
    service: { status: () => Promise.reject(new Error("must not run")) },
  } as unknown as Parameters<typeof createLineLinkStatusHandler>[0];
  await assertUnavailable(
    await createLineLinkStatusHandler(unsafeOmission)(request("status", true)),
  );
});
