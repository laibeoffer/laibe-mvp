import { createLineWebhookHandler } from "../_shared/drs-line-account-link/webhook.ts";

export { createLineWebhookHandler };
export const VERIFY_JWT_REQUIRED = false;
export const handler = createLineWebhookHandler();
if (import.meta.main) Deno.serve(handler);
