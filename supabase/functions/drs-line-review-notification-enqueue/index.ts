import { createReviewNotificationEnqueueHandler } from "../_shared/drs-line-case-group/review-notification.ts";

export { createReviewNotificationEnqueueHandler };
export const VERIFY_JWT_REQUIRED = false;
export const handler = createReviewNotificationEnqueueHandler();
if (import.meta.main) Deno.serve(handler);
