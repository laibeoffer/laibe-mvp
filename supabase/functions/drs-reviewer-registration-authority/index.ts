import { withEdgeRequestBoundary } from "../_shared/http/edge-request-boundary.ts";
import { createDrsReviewerRegistrationAuthorityHandler } from "../_shared/drs-auth/drs-reviewer-registration-authority.ts";

// The handler validates the application's publishable key; this grants no user or case authority.
export const VERIFY_JWT_REQUIRED = false;
export const handler = withEdgeRequestBoundary(
  "drs-reviewer-registration-authority",
  createDrsReviewerRegistrationAuthorityHandler(),
);
if (import.meta.main) Deno.serve(handler);
