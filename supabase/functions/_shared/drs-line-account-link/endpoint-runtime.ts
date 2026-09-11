import {
  createDrsBffGuard,
  type DrsBffRequestContract,
} from "../drs-auth/drs-session-bootstrap-bff.ts";
import type { RuntimeEnvironment } from "../drs-auth/contracts.ts";
import {
  createDrsSecureSessionRuntime,
  type DrsSecureSessionRuntimeOptions,
} from "../drs-auth/drs-secure-session-runtime.ts";
import {
  createSupabaseDrsLineAccountLinkRepository,
  readRuntimeLineIdentityHmacKey,
} from "./ports.ts";
import { createLineAccountLinkService } from "./service.ts";

export type LineAccountLinkEndpointName =
  | "start"
  | "status"
  | "cancel"
  | "unlink"
  | "continue";

const PATHS = Object.freeze({
  start: "/functions/v1/drs-line-account-link-start",
  status: "/functions/v1/drs-line-account-link-status",
  cancel: "/functions/v1/drs-line-account-link-cancel",
  unlink: "/functions/v1/drs-line-account-link-unlink",
  continue: "/functions/v1/drs-line-account-link-continue",
});

export const LINE_ACCOUNT_LINK_ENDPOINT_REQUIRED_ENVIRONMENT = Object.freeze(
  [
    "SUPABASE_URL",
    "SUPABASE_SERVICE_ROLE_KEY",
    "LAIBE_DRS_APP_ORIGIN",
    "LAIBE_DRS_SESSION_SUCCESS_URL",
    "LAIBE_DRS_SESSION_COOKIE_NAME",
    "LAIBE_DRS_SESSION_COOKIE_KEY_V1",
    "LAIBE_DRS_BFF_PROOF_KEY_V1",
    "LINE_CHANNEL_SECRET",
    "LINE_CHANNEL_ACCESS_TOKEN",
    "DRS_LINE_PROVIDER_CHANNEL_ID",
    "DRS_LINE_IDENTITY_HMAC_KEY",
    "DRS_LINE_IDENTITY_ENCRYPTION_KEY",
    "DRS_LINE_IDENTITY_ENCRYPTION_KEY_VERSION",
    "DRS_PUBLIC_ORIGIN",
    "DRS_LINE_OFFICIAL_ACCOUNT_URL",
  ] as const,
);

function hasUnsafeLinkTokenByte(value: string): boolean {
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code <= 32 || code === 127) return true;
  }
  return false;
}

function runtimeEnvironment(): RuntimeEnvironment | undefined {
  try {
    const candidate = (globalThis as unknown as {
      Deno?: { env?: { get?: (key: string) => string | undefined } };
    }).Deno?.env;
    return typeof candidate?.get === "function"
      ? Object.freeze({ get: candidate.get.bind(candidate) })
      : undefined;
  } catch {
    return undefined;
  }
}

function environmentValue(
  environment: RuntimeEnvironment | undefined,
  name: string,
): string {
  try {
    const value = environment?.get(name);
    return typeof value === "string" ? value : "";
  } catch {
    return "";
  }
}

export function isLineAccountLinkEndpointRuntimeReady(
  environment: RuntimeEnvironment | undefined = runtimeEnvironment(),
): boolean {
  const value = (name: string) => environmentValue(environment, name);
  return /^https:\/\/[^/]+$/u.test(value("SUPABASE_URL")) &&
    value("SUPABASE_SERVICE_ROLE_KEY").length >= 32 &&
    /^https:\/\/[^/]+$/u.test(value("LAIBE_DRS_APP_ORIGIN")) &&
    value("LAIBE_DRS_SESSION_SUCCESS_URL").length > 0 &&
    value("LAIBE_DRS_SESSION_COOKIE_NAME").length > 0 &&
    value("LAIBE_DRS_SESSION_COOKIE_KEY_V1").length > 0 &&
    value("LAIBE_DRS_BFF_PROOF_KEY_V1").length > 0 &&
    value("LINE_CHANNEL_SECRET").length >= 16 &&
    value("LINE_CHANNEL_ACCESS_TOKEN").length >= 1 &&
    value("LINE_CHANNEL_ACCESS_TOKEN").length <= 4096 &&
    /^[0-9]{1,32}$/u.test(value("DRS_LINE_PROVIDER_CHANNEL_ID")) &&
    value("DRS_LINE_IDENTITY_HMAC_KEY").length >= 16 &&
    value("DRS_LINE_IDENTITY_HMAC_KEY").length <= 4096 &&
    /^[A-Za-z0-9_-]{43}$/u.test(
      value("DRS_LINE_IDENTITY_ENCRYPTION_KEY"),
    ) &&
    /^[A-Za-z0-9._-]{1,64}$/u.test(
      value("DRS_LINE_IDENTITY_ENCRYPTION_KEY_VERSION"),
    ) &&
    /^https:\/\/[^/]+$/u.test(value("DRS_PUBLIC_ORIGIN")) &&
    /^https:\/\/([a-z0-9-]+\.)*line\.me\//u.test(
      value("DRS_LINE_OFFICIAL_ACCOUNT_URL"),
    );
}

function requestContract(
  name: LineAccountLinkEndpointName,
): DrsBffRequestContract {
  return Object.freeze({
    method: name === "status" ? "GET" : "POST",
    pathname: PATHS[name],
    queryFields: name === "continue"
      ? Object.freeze([Object.freeze({
        name: "linkToken",
        scalarType: "string" as const,
        validate: (value: string | number | boolean) =>
          typeof value === "string" && value.length >= 1 &&
          value.length <= 512 &&
          !hasUnsafeLinkTokenByte(value),
      })])
      : Object.freeze([]),
    jsonBodyFields: name === "status" ? null : Object.freeze([]),
  });
}

export function createDefaultLineAccountLinkEndpointDependencies(
  name: LineAccountLinkEndpointName,
  options: DrsSecureSessionRuntimeOptions = {},
) {
  const environment = options.env ?? runtimeEnvironment();
  const secureSession = createDrsSecureSessionRuntime({
    ...options,
    env: environment,
  });
  const runtimeReady = isLineAccountLinkEndpointRuntimeReady(environment) &&
    secureSession.runtimeAvailable === true &&
    secureSession.bootstrapDependencies !== undefined;
  return Object.freeze({
    runtimeReady,
    allowedOrigin: environmentValue(environment, "LAIBE_DRS_APP_ORIGIN"),
    guard: createDrsBffGuard(
      secureSession.bootstrapDependencies,
      requestContract(name),
    ),
    service: createLineAccountLinkService({
      repository: createSupabaseDrsLineAccountLinkRepository({
        env: environment,
        fetch: options.fetch,
      }),
      identityHmacKey: readRuntimeLineIdentityHmacKey(environment),
    }),
  });
}
