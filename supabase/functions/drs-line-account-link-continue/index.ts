import { createDefaultLineAccountLinkEndpointDependencies } from "../_shared/drs-line-account-link/endpoint-runtime.ts";
import { createLineLinkContinueHandler } from "../_shared/drs-line-account-link/http.ts";

export { createLineLinkContinueHandler };
export const VERIFY_JWT_REQUIRED = false;
export const handler = createLineLinkContinueHandler(
  createDefaultLineAccountLinkEndpointDependencies("continue"),
);
if (import.meta.main) Deno.serve(handler);
