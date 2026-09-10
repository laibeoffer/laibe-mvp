import { createReviewNotificationDispatchHandler } from "../_shared/drs-line-case-group/dispatch.ts";
import { withEdgeRequestBoundary } from "../_shared/http/edge-request-boundary.ts";

export { createReviewNotificationDispatchHandler };
export const VERIFY_JWT_REQUIRED = true;
export const handler = withEdgeRequestBoundary(
  "drs-line-review-notification-dispatch",
  createReviewNotificationDispatchHandler(),
);
if (import.meta.main) Deno.serve(handler);
