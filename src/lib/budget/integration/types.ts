import type { BudgetOutputSnapshot, BudgetOutputValidationReport } from "../output/types.ts";
import type {
  MethodSpecCatalog,
  MethodSpecValidationReport,
} from "../specs/types.ts";

export const BUDGET_CONTEXT_STATUSES = [
  "placeholder",
  "linked",
  "verified",
  "unavailable",
] as const;

export type BudgetContextStatus = (typeof BUDGET_CONTEXT_STATUSES)[number];

export interface ProjectRequirementBriefWindow {
  project_requirement_brief_id: string | null;
  owner_intent_id: string | null;
  requirement_context_status: BudgetContextStatus;
  budget_preference: BudgetContextStatus;
  space_requirements: BudgetContextStatus;
  scope_constraints: BudgetContextStatus;
  review_flags: BudgetContextStatus;
}

export interface PlanPuzzleQuantityFactsWindow {
  plan_id: string | null;
  svg_artifact_id: string | null;
  plan_quantity_facts_id: string | null;
  quantity_context_status: BudgetContextStatus;
  zone_id: string | null;
  area_m2: number | null;
  wall_length_m: number | null;
  opening_count: number | null;
  quantity_confidence: BudgetContextStatus;
  reviewer_required: boolean;
}

export interface MethodSpecApprovedSeed {
  method_spec_catalog_id: string;
  method_spec_version: string;
  review_status: "approved";
  seed_source: "seedMethodSpecCatalog" | "approved_method_spec_catalog";
  catalog: MethodSpecCatalog;
}

export interface BudgetDryRunGuardrails {
  dry_run_only: true;
  formal_price_generated: false;
  formal_quote_generated: false;
  pricing_rule_written: false;
  budget_estimate_line_from_price_range: false;
  renderer_invoked: false;
  payment_invoked: false;
  ai_api_invoked: false;
  db_invoked: false;
  webhook_invoked: false;
  svg_production_quantity_used: false;
  customer_facing_allowed: false;
}

export interface MethodSpecAdapterSummary {
  catalog_id: string;
  version: string;
  quote_item_template_count: number;
  method_recipe_count: number;
  pricing_rule_count: number;
  material_count: number;
  labor_rate_count: number;
}

export interface BudgetInputBundle {
  bundle_id: string;
  generated_at: string;
  dry_run_only: true;
  project_requirement_brief: ProjectRequirementBriefWindow;
  plan_puzzle_quantity_facts: PlanPuzzleQuantityFactsWindow;
  method_spec_approved_seed: MethodSpecApprovedSeed;
  method_spec_validation_report: MethodSpecValidationReport;
  method_spec_adapter_summary: MethodSpecAdapterSummary;
  guardrails: BudgetDryRunGuardrails;
  review_required: boolean;
  warnings: string[];
}

export interface BuildBudgetInputBundleInput {
  dry_run_only: true;
  generated_at?: string;
  project_requirement_brief: ProjectRequirementBriefWindow;
  plan_puzzle_quantity_facts: PlanPuzzleQuantityFactsWindow;
  method_spec_approved_seed: MethodSpecApprovedSeed;
}

export interface BudgetHarnessMvpDryRunInput extends BuildBudgetInputBundleInput {
  project_id?: string;
  estimate_id?: string;
  snapshot_id?: string;
}

export interface BudgetHarnessMvpDryRunResult extends BudgetDryRunGuardrails {
  input_bundle: BudgetInputBundle;
  snapshot_candidate: BudgetOutputSnapshot;
  validation_report: BudgetOutputValidationReport;
  snapshot_shape_validation_report: BudgetOutputValidationReport;
  warnings: string[];
  source_summary: BudgetOutputSnapshot["source_summary"];
  review_required: boolean;
}

export interface BudgetHarnessStaticGuardIssue {
  file: string;
  rule: string;
  message: string;
}

export interface BudgetHarnessStaticGuardReport {
  valid: boolean;
  issue_count: number;
  scanned_files: string[];
  issues: BudgetHarnessStaticGuardIssue[];
}
