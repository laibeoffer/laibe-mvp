import {
  createDrsSessionBootstrapHandler,
  type DrsSessionBootstrapDependencies,
} from "../_shared/drs-auth/drs-session-bootstrap-bff.ts";

export const VERIFY_JWT_REQUIRED = false;

export function createDrsSessionBootstrapEndpoint(
  dependencies?: DrsSessionBootstrapDependencies,
): (request: Request) => Promise<Response> {
  return createDrsSessionBootstrapHandler(dependencies);
}

export const handler = createDrsSessionBootstrapEndpoint();

if (import.meta.main) Deno.serve(handler);
