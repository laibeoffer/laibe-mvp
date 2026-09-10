import { createHighestReviewerGovernanceHandler } from "../_shared/highest-reviewer-governance/handler.ts";
export const VERIFY_JWT_REQUIRED = true;
export const handler = createHighestReviewerGovernanceHandler("role-decision");
if (import.meta.main) Deno.serve(handler);
