import {
  createDrsBffGuard,
  type DrsBffRequestContract,
} from "../drs-auth/drs-session-bootstrap-bff.ts";
import { createDrsSecureSessionRuntime } from "../drs-auth/drs-secure-session-runtime.ts";
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

function hasUnsafeLinkTokenByte(value: string): boolean {
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code <= 32 || code === 127) return true;
  }
  return false;
}

function runtimeEnv(name: string): string {
  try {
    const candidate = (globalThis as unknown as {
      Deno?: { env?: { get?: (key: string) => string | undefined } };
    }).Deno?.env?.get?.(name);
    return typeof candidate === "string" ? candidate : "";
  } catch {
    return "";
  }
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
) {
  const secureSession = createDrsSecureSessionRuntime();
  return Object.freeze({
    allowedOrigin: runtimeEnv("LAIBE_DRS_APP_ORIGIN"),
    guard: createDrsBffGuard(
      secureSession.bootstrapDependencies,
      requestContract(name),
    ),
    service: createLineAccountLinkService({
      repository: createSupabaseDrsLineAccountLinkRepository(),
      identityHmacKey: readRuntimeLineIdentityHmacKey(),
    }),
  });
}
