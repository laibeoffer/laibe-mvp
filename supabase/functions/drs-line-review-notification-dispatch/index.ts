import { createReviewNotificationDispatchHandler } from "../_shared/drs-line-case-group/dispatch.ts";

export { createReviewNotificationDispatchHandler };
export const VERIFY_JWT_REQUIRED = true;
export const handler = createReviewNotificationDispatchHandler();
if (import.meta.main) Deno.serve(handler);
