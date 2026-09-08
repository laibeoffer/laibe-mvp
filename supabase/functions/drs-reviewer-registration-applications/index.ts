import { withEdgeRequestBoundary } from "../_shared/http/edge-request-boundary.ts";
import { createDrsReviewerRegistrationApplicationsHandler } from "../_shared/drs-auth/drs-reviewer-registration-applications.ts";

export const VERIFY_JWT_REQUIRED = true;
export const handler = withEdgeRequestBoundary(
  "drs-reviewer-registration-applications",
  createDrsReviewerRegistrationApplicationsHandler(),
);
if (import.meta.main) Deno.serve(handler);
