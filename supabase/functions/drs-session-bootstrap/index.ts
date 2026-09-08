import { withEdgeRequestBoundary } from "../_shared/http/edge-request-boundary.ts";
import {
  createDrsSessionBootstrapHandler,
  createDrsThreeRoleSessionBootstrapHandler,
  type DrsSessionBootstrapDependencies,
  type DrsThreeRoleSessionBootstrapDependencies,
} from "../_shared/drs-auth/drs-session-bootstrap-bff.ts";
import {
  createDrsSecureSessionRuntime,
} from "../_shared/drs-auth/drs-secure-session-runtime.ts";

export const VERIFY_JWT_REQUIRED = false;

const secureSessionRuntime = createDrsSecureSessionRuntime();

export function createDrsSessionBootstrapEndpoint(
  dependencies?: DrsSessionBootstrapDependencies,
): (request: Request) => Promise<Response> {
  return createDrsSessionBootstrapHandler(dependencies);
}

export function createDrsThreeRoleSessionBootstrapEndpoint(
  dependencies?: DrsThreeRoleSessionBootstrapDependencies,
): (request: Request) => Promise<Response> {
  return createDrsThreeRoleSessionBootstrapHandler(dependencies);
}

export const handler = withEdgeRequestBoundary(
  "drs-session-bootstrap",
  createDrsSessionBootstrapEndpoint(secureSessionRuntime.bootstrapDependencies),
);

if (import.meta.main) Deno.serve(handler);
