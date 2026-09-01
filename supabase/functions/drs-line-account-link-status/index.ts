import { createDefaultLineAccountLinkEndpointDependencies } from "../_shared/drs-line-account-link/endpoint-runtime.ts";
import { createLineLinkStatusHandler } from "../_shared/drs-line-account-link/http.ts";

export { createLineLinkStatusHandler };
export const VERIFY_JWT_REQUIRED = false;
export const handler = createLineLinkStatusHandler(
  createDefaultLineAccountLinkEndpointDependencies("status"),
);
if (import.meta.main) Deno.serve(handler);
