import { createCaseGroupWebhookHandler } from "../_shared/drs-line-case-group/webhook.ts";

export { createCaseGroupWebhookHandler };
export const VERIFY_JWT_REQUIRED = false;
export const handler = createCaseGroupWebhookHandler();
if (import.meta.main) Deno.serve(handler);
