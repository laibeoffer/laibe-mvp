import { createLineWebhookHandler } from "../_shared/drs-line-account-link/webhook.ts";
import { createCanonicalLineWebhookHandler } from "../_shared/drs-line-case-group/canonical-webhook.ts";
import { createCaseGroupWebhookHandler } from "../_shared/drs-line-case-group/webhook.ts";

export {
  createCanonicalLineWebhookHandler,
  createCaseGroupWebhookHandler,
  createLineWebhookHandler,
};
export const VERIFY_JWT_REQUIRED = false;
export const handler = createCanonicalLineWebhookHandler({
  accountLinkHandler: createLineWebhookHandler(),
  caseGroupHandler: createCaseGroupWebhookHandler(),
});
if (import.meta.main) Deno.serve(handler);
