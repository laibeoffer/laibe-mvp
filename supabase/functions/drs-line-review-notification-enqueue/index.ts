import { createReviewNotificationEnqueueHandler } from "../_shared/drs-line-case-group/review-notification.ts";
import { withEdgeRequestBoundary } from "../_shared/http/edge-request-boundary.ts";

export { createReviewNotificationEnqueueHandler };
export const VERIFY_JWT_REQUIRED = false;
export const handler = withEdgeRequestBoundary(
  "drs-line-review-notification-enqueue",
  createReviewNotificationEnqueueHandler(),
);
if (import.meta.main) Deno.serve(handler);
