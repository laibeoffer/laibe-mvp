import type {
  BudgetOutputSnapshot,
  BudgetOutputValidationReport,
} from "../output/types.ts";
import { seedMethodSpecCatalog } from "../specs/seed-method-spec-catalog.ts";
import { buildBudgetInputBundle } from "./build-budget-input-bundle.ts";
import { fixturePlaceholderPlanPuzzleQuantityFacts } from "./fixture-placeholder-plan-quantities.ts";
import { fixturePlaceholderProjectRequirementBrief } from "./fixture-placeholder-project-brief.ts";
import type {
  BudgetHarnessMvpDryRunInput,
  BudgetHarnessMvpDryRunResult,
  BudgetInputBundle,
} from "./types.ts";

const DEFAULT_GENERATED_AT = "2026-06-01T00:00:00.000Z";

const requiredSnapshotFields: Array<keyof BudgetOutputSnapshot> = [
  "snapshot_id",
  "estimate_id",
  "project_id",
  "estimate_stage",
  "output_version",
  "generated_at",
  "catalog_version",
  "customer_view",
  "internal_view",
  "totals",
  "validation_report",
  "warnings",
  "source_summary",
];

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const hasRequiredSnapshotFields = (
  snapshot: Partial<BudgetOutputSnapshot>,
): string[] =>
  requiredSnapshotFields.filter((field) => {
    const value = snapshot[field];
    return value === undefined || value === null || value === "";
  });

export const validateBudgetOutputSnapshotCompatibleShape = (
  snapshot: Partial<BudgetOutputSnapshot>,
): BudgetOutputValidationReport => {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!isRecord(snapshot)) {
    return {
      valid: false,
      errors: ["snapshot_candidate must be an object."],
      warnings,
    };
  }

  const missingFields = hasRequiredSnapshotFields(snapshot);
  missingFields.forEach((field) =>
    errors.push(`snapshot_candidate missing required field: ${field}.`),
  );

  if (!Array.isArray(snapshot.customer_view)) {
    errors.push("snapshot_candidate.customer_view must be an array.");
  }
  if (!Array.isArray(snapshot.internal_view)) {
    errors.push("snapshot_candidate.internal_view must be an array.");
  }
  if (!Array.isArray(snapshot.warnings)) {
    errors.push("snapshot_candidate.warnings must be an array.");
  }
  if (!isRecord(snapshot.validation_report)) {
    errors.push("snapshot_candidate.validation_report must be an object.");
  }
  if (!isRecord(snapshot.source_summary)) {
    errors.push("snapshot_candidate.source_summary must be an object.");
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
};

const buildContextValidationReport = (
  bundle: BudgetInputBundle,
): BudgetOutputValidationReport => {
  const errors: string[] = [];
  const warnings = [...bundle.warnings];

  if (bundle.review_required) {
    errors.push(
      "Dry-run placeholder input requires review before any production or customer-facing use.",
    );
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
};

const buildSnapshotCandidate = (
  bundle: BudgetInputBundle,
  input: BudgetHarnessMvpDryRunInput,
  validationReport: BudgetOutputValidationReport,
): BudgetOutputSnapshot => {
  const catalog = bundle.method_spec_approved_seed.catalog;
  const template = catalog.quote_item_templates[0];
  const recipe = catalog.method_recipes[0];
  const projectId = input.project_id ?? "project_budget_harness_dry_run";
  const estimateId = input.estimate_id ?? "estimate_budget_harness_dry_run";
  const snapshotId = input.snapshot_id ?? "snapshot_budget_harness_dry_run";
  const itemName = "Dry-run placeholder budget item";
  const lineNo = "DRY-1";
  const warnings = [
    ...bundle.warnings,
    `${lineNo} ${itemName} requires review before production use.`,
  ];

  return {
    snapshot_id: snapshotId,
    estimate_id: estimateId,
    project_id: projectId,
    estimate_stage: "dry_run_mvp",
    output_version: "budget-output-v1",
    generated_at: bundle.generated_at,
    catalog_version: bundle.method_spec_approved_seed.method_spec_version,
    customer_view: [
      {
        trade_category: "dry_run",
        subtotal: 0,
        lines: [
          {
            trade_category: "dry_run",
            line_no: lineNo,
            item_name: itemName,
            unit: template?.unit ?? "placeholder_unit",
            quantity: 0,
            unit_price: 0,
            amount: 0,
            customer_note:
              "Dry-run placeholder only. Not customer-facing and not a formal quote.",
          },
        ],
      },
    ],
    internal_view: [
      {
        trade_category: "dry_run",
        subtotal: 0,
        lines: [
          {
            trade_category: "dry_run",
            line_no: lineNo,
            item_code: template?.item_code ?? "DRY_RUN_PLACEHOLDER_ITEM",
            item_name: itemName,
            unit: template?.unit ?? "placeholder_unit",
            quantity: 0,
            unit_price: 0,
            amount: 0,
            customer_note:
              "Dry-run placeholder only. Not customer-facing and not a formal quote.",
            internal_note:
              "Generated by minimal dry-run budget harness. No formal price, renderer, payment, API, or DB path was invoked.",
            source_type: "budget_harness_dry_run",
            source_id: bundle.bundle_id,
            recipe_id: recipe?.recipe_id ?? "dry_run_placeholder_recipe",
            material_code: null,
            quantity_formula: "placeholder_quantity_not_for_production",
            price_source: {
              type: "dry_run_placeholder",
              id: "no_formal_price",
              label: "No formal price generated.",
            },
            confidence: 0,
            requires_review: true,
            inclusions: [],
            exclusions: ["Formal quote output", "Production quantity authority"],
            assumptions: [
              `Requirement context: ${bundle.project_requirement_brief.requirement_context_status}`,
              `Quantity context: ${bundle.plan_puzzle_quantity_facts.quantity_context_status}`,
            ],
            risks: [
              "Placeholder requirement and quantity facts require human review.",
            ],
          },
        ],
      },
    ],
    totals: {
      total_amount: 0,
      customer_line_count: 1,
      internal_line_count: 1,
      trade_group_count: 1,
      review_required_count: 1,
    },
    validation_report: validationReport,
    warnings,
    source_summary: {
      estimate_line_count: 1,
      customer_line_count: 1,
      internal_line_count: 1,
      review_required_count: 1,
      material_linked_line_count: 0,
      material_unlinked_line_count: 1,
    },
  };
};

export const runBudgetHarnessMvpDryRun = (
  input: BudgetHarnessMvpDryRunInput = {
    dry_run_only: true,
    generated_at: DEFAULT_GENERATED_AT,
    project_requirement_brief: fixturePlaceholderProjectRequirementBrief,
    plan_puzzle_quantity_facts: fixturePlaceholderPlanPuzzleQuantityFacts,
    method_spec_approved_seed: {
      method_spec_catalog_id: seedMethodSpecCatalog.catalog_id,
      method_spec_version: seedMethodSpecCatalog.version,
      review_status: "approved",
      seed_source: "seedMethodSpecCatalog",
      catalog: seedMethodSpecCatalog,
    },
  },
): BudgetHarnessMvpDryRunResult => {
  const inputBundle = buildBudgetInputBundle(input);
  const validationReport = buildContextValidationReport(inputBundle);
  const snapshotCandidate = buildSnapshotCandidate(
    inputBundle,
    input,
    validationReport,
  );
  const shapeValidationReport =
    validateBudgetOutputSnapshotCompatibleShape(snapshotCandidate);

  return {
    ...inputBundle.guardrails,
    input_bundle: inputBundle,
    snapshot_candidate: snapshotCandidate,
    validation_report: validationReport,
    snapshot_shape_validation_report: shapeValidationReport,
    warnings: snapshotCandidate.warnings,
    source_summary: snapshotCandidate.source_summary,
    review_required: inputBundle.review_required,
  };
};

const demoResult = runBudgetHarnessMvpDryRun();

console.log(
  JSON.stringify(
    {
      dry_run_only: demoResult.dry_run_only,
      formal_price_generated: demoResult.formal_price_generated,
      formal_quote_generated: demoResult.formal_quote_generated,
      pricing_rule_written: demoResult.pricing_rule_written,
      budget_estimate_line_from_price_range:
        demoResult.budget_estimate_line_from_price_range,
      renderer_invoked: demoResult.renderer_invoked,
      payment_invoked: demoResult.payment_invoked,
      ai_api_invoked: demoResult.ai_api_invoked,
      db_invoked: demoResult.db_invoked,
      webhook_invoked: demoResult.webhook_invoked,
      svg_production_quantity_used: demoResult.svg_production_quantity_used,
      snapshot_shape_valid: demoResult.snapshot_shape_validation_report.valid,
      validation_report: demoResult.validation_report,
      snapshot_id: demoResult.snapshot_candidate.snapshot_id,
      estimate_stage: demoResult.snapshot_candidate.estimate_stage,
      total_amount: demoResult.snapshot_candidate.totals.total_amount,
      review_required: demoResult.review_required,
      warning_count: demoResult.warnings.length,
      source_summary: demoResult.source_summary,
    },
    null,
    2,
  ),
);
