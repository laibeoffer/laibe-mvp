import { createRegistrationGovernanceHandler } from "../_shared/reviewer-registration-governance/handler.ts";
import { withEdgeRequestBoundary } from "../_shared/http/edge-request-boundary.ts";
export const VERIFY_JWT_REQUIRED = true;
export const handler = withEdgeRequestBoundary(
  "drs-reviewer-registration-decision",
  createRegistrationGovernanceHandler("decision"),
);
if (import.meta.main) Deno.serve(handler);
