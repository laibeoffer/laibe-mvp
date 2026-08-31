import { createDefaultLineAccountLinkEndpointDependencies } from "../_shared/drs-line-account-link/endpoint-runtime.ts";
import { createLineLinkUnlinkHandler } from "../_shared/drs-line-account-link/http.ts";

export { createLineLinkUnlinkHandler };
export const VERIFY_JWT_REQUIRED = false;
export const handler = createLineLinkUnlinkHandler(
  createDefaultLineAccountLinkEndpointDependencies("unlink"),
);
if (import.meta.main) Deno.serve(handler);
