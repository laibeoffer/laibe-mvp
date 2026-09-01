import { createDefaultLineAccountLinkEndpointDependencies } from "../_shared/drs-line-account-link/endpoint-runtime.ts";
import { createLineLinkStartHandler } from "../_shared/drs-line-account-link/http.ts";

export { createLineLinkStartHandler };
export const VERIFY_JWT_REQUIRED = false;
export const handler = createLineLinkStartHandler(
  createDefaultLineAccountLinkEndpointDependencies("start"),
);
if (import.meta.main) Deno.serve(handler);
