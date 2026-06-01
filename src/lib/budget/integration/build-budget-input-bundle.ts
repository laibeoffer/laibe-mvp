import { buildBudgetCatalogFromMethodSpec } from "../specs/build-budget-catalog-from-method-spec.ts";
import type {
  MethodSpecCatalog,
  MethodSpecValidationIssue,
  MethodSpecValidationReport,
} from "../specs/types.ts";
import {
  BUDGET_CONTEXT_STATUSES,
  type BudgetContextStatus,
  type BudgetDryRunGuardrails,
  type BudgetInputBundle,
  type BuildBudgetInputBundleInput,
  type MethodSpecAdapterSummary,
  type PlanPuzzleQuantityFactsWindow,
  type ProjectRequirementBriefWindow,
} from "./types.ts";

const defaultGuardrails: BudgetDryRunGuardrails = {
  dry_run_only: true,
  formal_price_generated: false,
  formal_quote_generated: false,
  pricing_rule_written: false,
  budget_estimate_line_from_price_range: false,
  renderer_invoked: false,
  payment_invoked: false,
  ai_api_invoked: false,
  db_invoked: false,
  webhook_invoked: false,
  svg_production_quantity_used: false,
  customer_facing_allowed: false,
};

const isBudgetContextStatus = (value: unknown): value is BudgetContextStatus =>
  typeof value === "string" &&
  BUDGET_CONTEXT_STATUSES.includes(value as BudgetContextStatus);

const assertContextStatus = (field: string, value: unknown): void => {
  if (!isBudgetContextStatus(value)) {
    throw new Error(
      `Invalid ${field}: ${String(value)}. Expected one of ${BUDGET_CONTEXT_STATUSES.join(", ")}.`,
    );
  }
};

const hasUnverifiedRequirement = (
  brief: ProjectRequirementBriefWindow,
): boolean =>
  [
    brief.requirement_context_status,
    brief.budget_preference,
    brief.space_requirements,
    brief.scope_constraints,
    brief.review_flags,
  ].some((status) => status !== "verified");

const hasUnverifiedQuantity = (
  facts: PlanPuzzleQuantityFactsWindow,
): boolean =>
  facts.quantity_context_status !== "verified" ||
  facts.quantity_confidence !== "verified" ||
  facts.reviewer_required;

const summarizeAdapterCatalog = (
  adapterCatalog: ReturnType<typeof buildBudgetCatalogFromMethodSpec>,
): MethodSpecAdapterSummary => ({
  catalog_id: adapterCatalog.catalog_id,
  version: adapterCatalog.version,
  quote_item_template_count: adapterCatalog.quote_item_templates.length,
  method_recipe_count: adapterCatalog.method_recipes.length,
  pricing_rule_count: adapterCatalog.pricing_rules.length,
  material_count: adapterCatalog.materials.length,
  labor_rate_count: adapterCatalog.labor_rates.length,
});

const countArray = (value: unknown): number => Array.isArray(value) ? value.length : 0;

const requireCatalogArray = (
  catalog: MethodSpecCatalog,
  field: keyof MethodSpecCatalog,
  issues: MethodSpecValidationIssue[],
): void => {
  if (!Array.isArray(catalog[field])) {
    issues.push({
      severity: "error",
      code: "method_spec_catalog_array_missing",
      message: `MethodSpecCatalog.${String(field)} must be an array.`,
      ref: String(field),
    });
  }
};

const validateApprovedMethodSpecSeed = (
  catalog: MethodSpecCatalog,
): MethodSpecValidationReport => {
  const issues: MethodSpecValidationIssue[] = [];

  if (!catalog.catalog_id) {
    issues.push({
      severity: "error",
      code: "method_spec_catalog_id_missing",
      message: "MethodSpecCatalog.catalog_id is required.",
      ref: "catalog_id",
    });
  }

  if (!catalog.version) {
    issues.push({
      severity: "error",
      code: "method_spec_catalog_version_missing",
      message: "MethodSpecCatalog.version is required.",
      ref: "version",
    });
  }

  [
    "quote_item_templates",
    "method_recipes",
    "material_specs",
    "labor_rules",
    "note_templates",
    "unit_conversions",
    "inclusion_exclusion_rules",
    "item_material_bindings",
    "pricing_rules",
  ].forEach((field) =>
    requireCatalogArray(catalog, field as keyof MethodSpecCatalog, issues),
  );

  return {
    valid: issues.every((issue) => issue.severity !== "error"),
    checked_at: new Date().toISOString(),
    summary: {
      quote_item_template_count: countArray(catalog.quote_item_templates),
      method_recipe_count: countArray(catalog.method_recipes),
      material_spec_count: countArray(catalog.material_specs),
      labor_rule_count: countArray(catalog.labor_rules),
      note_template_count: countArray(catalog.note_templates),
      unit_conversion_count: countArray(catalog.unit_conversions),
      inclusion_exclusion_rule_count: countArray(catalog.inclusion_exclusion_rules),
      item_material_binding_count: countArray(catalog.item_material_bindings),
      pricing_rule_count: countArray(catalog.pricing_rules),
      error_count: issues.filter((issue) => issue.severity === "error").length,
      warning_count: issues.filter((issue) => issue.severity === "warning").length,
      allowed_condition_count: 0,
      guard_result_count: 1,
    },
    issues,
    allowed_conditions: [],
    guard_results: [
      {
        guard: "minimal_dry_run_approved_seed_shape_guard",
        passed: issues.every((issue) => issue.severity !== "error"),
        severity: issues.some((issue) => issue.severity === "error")
          ? "error"
          : "info",
        message:
          "Minimal dry-run entry confirmed approved MethodSpec seed shape without mutating MethodSpecCatalog.",
        refs: [catalog.catalog_id],
      },
    ],
  };
};

const buildWarnings = (
  input: BuildBudgetInputBundleInput,
  methodSpecValid: boolean,
): string[] => {
  const warnings = [
    "DRY_RUN_ONLY: This bundle is not customer-facing and cannot be used as a formal quote.",
    "FORMAL_PRICE_DISABLED: No formal price is generated by this entry.",
    "RENDERER_DISABLED: Renderer and formal document output are not invoked by this entry.",
  ];

  if (hasUnverifiedRequirement(input.project_requirement_brief)) {
    warnings.push(
      "REQUIREMENT_CONTEXT_NOT_VERIFIED: ProjectRequirementBrief is placeholder, linked, or unavailable.",
    );
  }

  if (hasUnverifiedQuantity(input.plan_puzzle_quantity_facts)) {
    warnings.push(
      "QUANTITY_CONTEXT_NOT_VERIFIED: PlanPuzzleQuantityFacts is placeholder, linked, unavailable, or reviewer-required.",
    );
  }

  if (!methodSpecValid) {
    warnings.push(
      "METHOD_SPEC_VALIDATION_NOT_READY: MethodSpec approved seed failed validation.",
    );
  }

  return warnings;
};

export const buildBudgetInputBundle = (
  input: BuildBudgetInputBundleInput,
): BudgetInputBundle => {
  if (input.dry_run_only !== true) {
    throw new Error("Minimal budget harness requires dry_run_only: true.");
  }

  if (input.method_spec_approved_seed.review_status !== "approved") {
    throw new Error("MethodSpec seed must be approved before dry-run bundling.");
  }

  assertContextStatus(
    "project_requirement_brief.requirement_context_status",
    input.project_requirement_brief.requirement_context_status,
  );
  assertContextStatus(
    "project_requirement_brief.budget_preference",
    input.project_requirement_brief.budget_preference,
  );
  assertContextStatus(
    "project_requirement_brief.space_requirements",
    input.project_requirement_brief.space_requirements,
  );
  assertContextStatus(
    "project_requirement_brief.scope_constraints",
    input.project_requirement_brief.scope_constraints,
  );
  assertContextStatus(
    "project_requirement_brief.review_flags",
    input.project_requirement_brief.review_flags,
  );
  assertContextStatus(
    "plan_puzzle_quantity_facts.quantity_context_status",
    input.plan_puzzle_quantity_facts.quantity_context_status,
  );
  assertContextStatus(
    "plan_puzzle_quantity_facts.quantity_confidence",
    input.plan_puzzle_quantity_facts.quantity_confidence,
  );

  const methodSpecValidationReport = validateApprovedMethodSpecSeed(
    input.method_spec_approved_seed.catalog,
  );

  if (!methodSpecValidationReport.valid) {
    throw new Error(
      `MethodSpec approved seed failed validation: ${methodSpecValidationReport.issues
        .map((issue) => issue.code)
        .join(", ")}`,
    );
  }

  const adapterCatalog = buildBudgetCatalogFromMethodSpec(
    input.method_spec_approved_seed.catalog,
  );
  const generatedAt = input.generated_at ?? new Date().toISOString();
  const reviewRequired =
    hasUnverifiedRequirement(input.project_requirement_brief) ||
    hasUnverifiedQuantity(input.plan_puzzle_quantity_facts);

  return {
    bundle_id: `budget_input_bundle_${input.method_spec_approved_seed.method_spec_catalog_id}`,
    generated_at: generatedAt,
    dry_run_only: true,
    project_requirement_brief: input.project_requirement_brief,
    plan_puzzle_quantity_facts: input.plan_puzzle_quantity_facts,
    method_spec_approved_seed: input.method_spec_approved_seed,
    method_spec_validation_report: methodSpecValidationReport,
    method_spec_adapter_summary: summarizeAdapterCatalog(adapterCatalog),
    guardrails: defaultGuardrails,
    review_required: reviewRequired,
    warnings: buildWarnings(input, methodSpecValidationReport.valid),
  };
};
