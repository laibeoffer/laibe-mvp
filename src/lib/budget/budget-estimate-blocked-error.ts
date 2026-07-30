export const BUDGET_ESTIMATE_BLOCK_REASONS = [
  "invalid_input",
  "input_bundle_required",
  "forbidden_source_flags_invalid",
  "dry_run_only_required",
  "formal_estimate_blocked",
  "production_quantity_blocked",
  "customer_facing_output_blocked",
  "renderer_output_blocked",
  "forbidden_quantity_source",
  "pr100_candidate_only",
  "issue_89_harness_gate",
] as const;

export type BudgetEstimateBlockReason =
  (typeof BUDGET_ESTIMATE_BLOCK_REASONS)[number];

export interface BudgetEstimateBlockedResult {
  blocked: true;
  reason_code: BudgetEstimateBlockReason;
  message: string;
  required_authorization:
    | "commander_review"
    | "reviewer_gate"
    | "issue_89_harness_review"
    | "production_quantity_gate"
    | "formal_output_gate";
  formal_estimate_generated: false;
  formal_quote_generated: false;
  production_quantity_used: false;
  budget_estimate_line_created: false;
  pricing_rule_written: false;
  renderer_invoked: false;
  excel_pdf_generated: false;
  harness_executed: false;
  total_amount: 0;
  lines: [];
  review_required_lines: [];
}

export class BudgetEstimateBlockedError extends Error {
  readonly name = "BudgetEstimateBlockedError";
  readonly reason_code: BudgetEstimateBlockReason;
  readonly required_authorization: BudgetEstimateBlockedResult["required_authorization"];
  readonly blocked_result: BudgetEstimateBlockedResult;

  constructor(blockedResult: BudgetEstimateBlockedResult) {
    super(blockedResult.message);
    this.reason_code = blockedResult.reason_code;
    this.required_authorization = blockedResult.required_authorization;
    this.blocked_result = blockedResult;
  }
}

export const createBudgetEstimateBlockedResult = (
  reasonCode: BudgetEstimateBlockReason,
  message: string,
  requiredAuthorization: BudgetEstimateBlockedResult["required_authorization"],
): BudgetEstimateBlockedResult => ({
  blocked: true,
  reason_code: reasonCode,
  message,
  required_authorization: requiredAuthorization,
  formal_estimate_generated: false,
  formal_quote_generated: false,
  production_quantity_used: false,
  budget_estimate_line_created: false,
  pricing_rule_written: false,
  renderer_invoked: false,
  excel_pdf_generated: false,
  harness_executed: false,
  total_amount: 0,
  lines: [],
  review_required_lines: [],
});

export const createBudgetEstimateBlockedError = (
  reasonCode: BudgetEstimateBlockReason,
  message: string,
  requiredAuthorization: BudgetEstimateBlockedResult["required_authorization"],
): BudgetEstimateBlockedError =>
  new BudgetEstimateBlockedError(
    createBudgetEstimateBlockedResult(
      reasonCode,
      message,
      requiredAuthorization,
    ),
  );
