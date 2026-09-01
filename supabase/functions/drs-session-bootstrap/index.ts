import {
  createDrsSessionBootstrapHandler,
  createDrsThreeRoleSessionBootstrapHandler,
  type DrsSessionBootstrapDependencies,
  type DrsThreeRoleSessionBootstrapDependencies,
} from "../_shared/drs-auth/drs-session-bootstrap-bff.ts";
import {
  createDrsSecureSessionRuntime,
  createDrsThreeRoleSecureSessionRuntime,
} from "../_shared/drs-auth/drs-secure-session-runtime.ts";

export const VERIFY_JWT_REQUIRED = false;

// The legacy factory remains injectable for existing bounded consumers. Only
// this module-owned dependency identity is rebound to the three-role default.
const secureSessionRuntime = createDrsSecureSessionRuntime();
const threeRoleRuntime = createDrsThreeRoleSecureSessionRuntime();
const defaultLegacyDependencies = secureSessionRuntime.bootstrapDependencies;
const defaultThreeRoleDependencies = threeRoleRuntime.bootstrapDependencies;

export function createDrsSessionBootstrapEndpoint(
  dependencies?: DrsSessionBootstrapDependencies,
): (request: Request) => Promise<Response> {
  if (
    dependencies === defaultLegacyDependencies &&
    defaultThreeRoleDependencies
  ) {
    return createDrsThreeRoleSessionBootstrapHandler(
      defaultThreeRoleDependencies,
    );
  }
  return createDrsSessionBootstrapHandler(dependencies);
}

export function createDrsThreeRoleSessionBootstrapEndpoint(
  dependencies?: DrsThreeRoleSessionBootstrapDependencies,
): (request: Request) => Promise<Response> {
  return createDrsThreeRoleSessionBootstrapHandler(dependencies);
}

export const handler = createDrsSessionBootstrapEndpoint(
  secureSessionRuntime.bootstrapDependencies,
);

if (import.meta.main) Deno.serve(handler);
