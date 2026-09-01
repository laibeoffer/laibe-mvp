import { createPrivateNotificationDispatchHandler } from "../_shared/drs-line-account-link/notification.ts";

export { createPrivateNotificationDispatchHandler };
export const VERIFY_JWT_REQUIRED = true;
export const handler = createPrivateNotificationDispatchHandler();
if (import.meta.main) Deno.serve(handler);
