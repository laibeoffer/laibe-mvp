import {
  createDrsSessionBootstrapHandler,
  type DrsSessionBootstrapDependencies,
} from "../_shared/drs-auth/drs-session-bootstrap-bff.ts";
import {
  createDrsSecureSessionRuntime,
} from "../_shared/drs-auth/drs-secure-session-runtime.ts";

export const VERIFY_JWT_REQUIRED = false;

export function createDrsSessionBootstrapEndpoint(
  dependencies?: DrsSessionBootstrapDependencies,
): (request: Request) => Promise<Response> {
  return createDrsSessionBootstrapHandler(dependencies);
}

const secureSessionRuntime = createDrsSecureSessionRuntime();

export const handler = createDrsSessionBootstrapEndpoint(
  secureSessionRuntime.bootstrapDependencies,
);

if (import.meta.main) Deno.serve(handler);
