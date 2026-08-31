import { createDefaultLineAccountLinkEndpointDependencies } from "../_shared/drs-line-account-link/endpoint-runtime.ts";
import { createLineLinkCancelHandler } from "../_shared/drs-line-account-link/http.ts";

export { createLineLinkCancelHandler };
export const VERIFY_JWT_REQUIRED = false;
export const handler = createLineLinkCancelHandler(
  createDefaultLineAccountLinkEndpointDependencies("cancel"),
);
if (import.meta.main) Deno.serve(handler);
