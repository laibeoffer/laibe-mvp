import { createDrsReviewerRegistrationApplicationsHandler } from "../_shared/drs-auth/drs-reviewer-registration-applications.ts";

export const VERIFY_JWT_REQUIRED = true;
export const handler = createDrsReviewerRegistrationApplicationsHandler();
if (import.meta.main) Deno.serve(handler);
