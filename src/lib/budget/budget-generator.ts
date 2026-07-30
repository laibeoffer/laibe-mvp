import type { BudgetInputBundle } from "./integration/types.ts";
import type { BudgetOutputSnapshot } from "./output/types.ts";
import {
  createBudgetEstimateBlockedResult,
  type BudgetEstimateBlockedResult,
} from "./budget-estimate-blocked-error.ts";

export interface GenerateBudgetEstimateInput {
  dry_run_only: true;
  input_bundle: BudgetInputBundle;
  formal_estimate_requested?: false;
  production_quantity_requested?: false;
  customer_facing_output_requested?: false;
  renderer_output_requested?: false;
  source_authority?: "candidate_review_only" | "docs_only_candidate";
  quantity_source_status?: "placeholder" | "linked" | "verified" | "unavailable";
  forbidden_source_flags?: string[];
  pr100_candidate_metadata_only?: true;
  issue_89_harness_gate_open?: true;
}

export interface BudgetEstimateCandidateReviewResult {
  blocked: false;
  dry_run_only: true;
  candidate_only: true;
  review_only: true;
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
  issue_89_harness_gate_open: true;
  snapshot_candidate: Pick<
    BudgetOutputSnapshot,
    | "snapshot_id"
    | "estimate_id"
    | "project_id"
    | "estimate_stage"
    | "output_version"
    | "generated_at"
    | "catalog_version"
    | "customer_view"
    | "internal_view"
    | "totals"
    | "validation_report"
    | "warnings"
    | "source_summary"
  >;
  warnings: string[];
}

export type GenerateBudgetEstimateResult =
  | BudgetEstimateBlockedResult
  | BudgetEstimateCandidateReviewResult;

type ValidatedGenerateBudgetEstimateInput = GenerateBudgetEstimateInput & {
  input_bundle: BudgetInputBundle & {
    bundle_id: string;
    project_requirement_brief: Record<string, unknown>;
    method_spec_approved_seed: Record<string, unknown>;
  };
  forbidden_source_flags?: string[];
};

const FORBIDDEN_SOURCE_FLAGS = new Set([
  "ui_mock",
  "guide_mock",
  "svg",
  "renderer_preview",
  "screenshot",
  "visual_simulation",
  "pc",
  "unverified_geometry",
]);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

const readStringOrFallback = (
  record: Record<string, unknown>,
  key: string,
  fallback: string,
): string => (isNonEmptyString(record[key]) ? record[key] : fallback);

const block = (
  reasonCode: BudgetEstimateBlockedResult["reason_code"],
  message: string,
  requiredAuthorization: BudgetEstimateBlockedResult["required_authorization"],
): BudgetEstimateBlockedResult =>
  createBudgetEstimateBlockedResult(
    reasonCode,
    message,
    requiredAuthorization,
  );

const hasForbiddenSource = (flags: string[]): boolean =>
  flags.some((flag) => FORBIDDEN_SOURCE_FLAGS.has(flag));

const createReviewOnlySnapshotCandidate = (
  input: ValidatedGenerateBudgetEstimateInput,
): BudgetEstimateCandidateReviewResult["snapshot_candidate"] => {
  const bundle = input.input_bundle;

  return {
    snapshot_id: `candidate-snapshot-${bundle.bundle_id}`,
    estimate_id: `candidate-estimate-${bundle.bundle_id}`,
    project_id: readStringOrFallback(
      bundle.project_requirement_brief,
      "project_requirement_brief_id",
      "candidate-project-unverified",
    ),
    estimate_stage: "candidate_review_only",
    output_version: "bg1-runtime-skeleton-v0",
    generated_at: new Date().toISOString(),
    catalog_version: readStringOrFallback(
      bundle.method_spec_approved_seed,
      "method_spec_version",
      "method-spec-version-unverified",
    ),
    customer_view: [],
    internal_view: [],
    totals: {
      total_amount: 0,
      customer_line_count: 0,
      internal_line_count: 0,
      trade_group_count: 0,
      review_required_count: 0,
    },
    validation_report: {
      valid: false,
      errors: [
        "Candidate-only runtime skeleton does not produce formal estimate lines.",
      ],
      warnings: [
        "Review-only snapshot candidate contains no customer-facing budget rows.",
      ],
    },
    warnings: [
      "BG1 runtime skeleton is candidate-only and review-only.",
      "Issue #89 remains the harness execution gate.",
    ],
    source_summary: {
      estimate_line_count: 0,
      customer_line_count: 0,
      internal_line_count: 0,
      review_required_count: 0,
      material_linked_line_count: 0,
      material_unlinked_line_count: 0,
    },
  };
};

export const generateBudgetEstimate = (
  input: unknown,
  ...legacyArgs: unknown[]
): GenerateBudgetEstimateResult => {
  if (legacyArgs.length > 0) {
    return block(
      "invalid_input",
      "Legacy budget generator arguments are blocked by the BG1 runtime skeleton. Use a guarded dry-run object.",
      "reviewer_gate",
    );
  }

  if (!isRecord(input)) {
    return block(
      "invalid_input",
      "Budget estimate input must be a guarded dry-run object.",
      "reviewer_gate",
    );
  }

  if (input.dry_run_only !== true) {
    return block(
      "dry_run_only_required",
      "Budget estimate skeleton only accepts dry_run_only: true.",
      "commander_review",
    );
  }

  if (input.formal_estimate_requested === true) {
    return block(
      "formal_estimate_blocked",
      "Formal estimate generation is blocked by the BG1 runtime skeleton.",
      "formal_output_gate",
    );
  }

  if (input.production_quantity_requested === true) {
    return block(
      "production_quantity_blocked",
      "Production quantity usage is blocked until a verified quantity authority is approved.",
      "production_quantity_gate",
    );
  }

  if (input.customer_facing_output_requested === true) {
    return block(
      "customer_facing_output_blocked",
      "Customer-facing final output is blocked in the runtime skeleton.",
      "formal_output_gate",
    );
  }

  if (input.renderer_output_requested === true) {
    return block(
      "renderer_output_blocked",
      "Renderer, Excel, and PDF output remain blocked in the runtime skeleton.",
      "formal_output_gate",
    );
  }

  if (!isRecord(input.input_bundle)) {
    return block(
      "input_bundle_required",
      "Budget estimate input_bundle must be a guarded object before any candidate review snapshot can be prepared.",
      "reviewer_gate",
    );
  }

  if (!isNonEmptyString(input.input_bundle.bundle_id)) {
    return block(
      "input_bundle_required",
      "Budget estimate input_bundle.bundle_id must be a non-empty string.",
      "reviewer_gate",
    );
  }

  if (!isRecord(input.input_bundle.project_requirement_brief)) {
    return block(
      "input_bundle_required",
      "Budget estimate input_bundle.project_requirement_brief must be an object.",
      "reviewer_gate",
    );
  }

  if (!isRecord(input.input_bundle.method_spec_approved_seed)) {
    return block(
      "input_bundle_required",
      "Budget estimate input_bundle.method_spec_approved_seed must be an object.",
      "reviewer_gate",
    );
  }

  if (
    input.forbidden_source_flags !== undefined &&
    (!Array.isArray(input.forbidden_source_flags) ||
      input.forbidden_source_flags.some((flag) => typeof flag !== "string"))
  ) {
    return block(
      "forbidden_source_flags_invalid",
      "forbidden_source_flags must be an array of strings when provided.",
      "reviewer_gate",
    );
  }

  const guardedInput = input as unknown as ValidatedGenerateBudgetEstimateInput;
  const forbiddenSourceFlags = guardedInput.forbidden_source_flags ?? [];

  if (hasForbiddenSource(forbiddenSourceFlags)) {
    return block(
      "forbidden_quantity_source",
      "Forbidden source flags cannot be used as final budget quantity sources.",
      "reviewer_gate",
    );
  }

  if (guardedInput.pr100_candidate_metadata_only !== true) {
    return block(
      "pr100_candidate_only",
      "PR #100 must remain candidate metadata only and cannot be treated as a production adapter.",
      "reviewer_gate",
    );
  }

  if (guardedInput.issue_89_harness_gate_open !== true) {
    return block(
      "issue_89_harness_gate",
      "Issue #89 must remain open as the harness execution gate.",
      "issue_89_harness_review",
    );
  }

  return {
    blocked: false,
    dry_run_only: true,
    candidate_only: true,
    review_only: true,
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
    issue_89_harness_gate_open: true,
    snapshot_candidate: createReviewOnlySnapshotCandidate(guardedInput),
    warnings: [
      "Candidate-only skeleton result. No formal estimate lines were created.",
      "No renderer, Excel, PDF, harness, pricing rule, or production quantity path was invoked.",
    ],
  };
};
