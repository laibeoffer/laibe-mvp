import { createCaseGroupBindingStartHandler } from "../_shared/drs-line-case-group/binding-start.ts";
import { withEdgeRequestBoundary } from "../_shared/http/edge-request-boundary.ts";

export { createCaseGroupBindingStartHandler };
export const VERIFY_JWT_REQUIRED = true;
export const handler = withEdgeRequestBoundary(
  "drs-line-case-group-binding-start",
  createCaseGroupBindingStartHandler(),
);
if (import.meta.main) Deno.serve(handler);
