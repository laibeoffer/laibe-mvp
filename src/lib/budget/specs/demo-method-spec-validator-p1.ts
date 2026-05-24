import { generateBudgetEstimate } from "../budget-generator.ts";
import { mockProject } from "../mock/mock-layout.ts";
import { buildBudgetCatalogFromMethodSpec } from "./build-budget-catalog-from-method-spec.ts";
import {
  ALLOWED_UNBOUND_MATERIAL_ITEM_CODES,
  BLOCKED_LABOR_PRICING_SOURCE_TYPES,
  BLOCKED_PRICING_SOURCE_TYPES,
} from "./method-spec-policy.ts";
import { seedMethodSpecCatalog } from "./seed-method-spec-catalog.ts";
import { validateMethodSpecCatalog } from "./validate-method-spec-catalog.ts";
import type {
  MethodSpecCatalog,
  MethodSpecGuardResult,
  MethodSpecValidationReport,
} from "./types.ts";

const cloneCatalog = (catalog: MethodSpecCatalog): MethodSpecCatalog =>
  JSON.parse(JSON.stringify(catalog)) as MethodSpecCatalog;

const findGuardResult = (
  report: MethodSpecValidationReport,
  guard: string,
): MethodSpecGuardResult | null =>
  report.guard_results.find((result) => result.guard === guard) ?? null;

const summarizeReport = (report: MethodSpecValidationReport) => ({
  valid: report.valid,
  error_count: report.summary.error_count,
  warning_count: report.summary.warning_count,
  allowed_condition_count: report.summary.allowed_condition_count,
  guard_result_count: report.summary.guard_result_count,
  pricing_source_guard_result: findGuardResult(
    report,
    "pricing_source_type_guard",
  ),
  labor_rule_reference_only_guard_result: findGuardResult(
    report,
    "labor_rule_reference_only_guard",
  ),
  unbound_material_allowlist_result: findGuardResult(
    report,
    "unbound_material_allowlist_guard",
  ),
  allowed_unbound_material_item_codes: report.allowed_conditions.map(
    (condition) => condition.ref,
  ),
  issue_codes: report.issues.map((issue) => issue.code),
  issue_refs: report.issues.map((issue) => issue.ref),
});

const makeRiskyLaborCatalog = (): MethodSpecCatalog => {
  const riskyCatalog = cloneCatalog(seedMethodSpecCatalog);

  riskyCatalog.catalog_id = `${seedMethodSpecCatalog.catalog_id}-validator-p1-risk-demo`;
  riskyCatalog.pricing_rules = riskyCatalog.pricing_rules.map((rule, index) => {
    if (index === 0) {
      return {
        ...rule,
        price_source: {
          ...rule.price_source,
          type: "labor_rule",
          id: "invalid-labor-rule-source-demo",
          label: "Invalid labor rule source demo",
        },
      };
    }

    if (index === 1) {
      return {
        ...rule,
        price_source: {
          ...rule.price_source,
          type: "ai_generated",
          id: "invalid-ai-generated-source-demo",
          label: "Invalid AI generated source demo",
        },
      };
    }

    return rule;
  });

  return riskyCatalog;
};

const seedValidation = validateMethodSpecCatalog(seedMethodSpecCatalog);
const riskyLaborValidation = validateMethodSpecCatalog(makeRiskyLaborCatalog());

const budgetCatalog = buildBudgetCatalogFromMethodSpec(seedMethodSpecCatalog);
const budgetEstimate = generateBudgetEstimate(mockProject, budgetCatalog);

console.log(
  JSON.stringify(
    {
      policy: {
        allowed_unbound_material_item_codes: [
          ...ALLOWED_UNBOUND_MATERIAL_ITEM_CODES,
        ],
        blocked_pricing_source_types: [...BLOCKED_PRICING_SOURCE_TYPES],
        blocked_labor_pricing_source_types: [
          ...BLOCKED_LABOR_PRICING_SOURCE_TYPES,
        ],
      },
      seed_catalog: summarizeReport(seedValidation),
      intentionally_invalid_labor_catalog: summarizeReport(
        riskyLaborValidation,
      ),
      regression_budget: {
        total_amount: budgetEstimate.total_amount,
        budget_line_count: budgetEstimate.lines.length,
        review_required_line_count:
          budgetEstimate.review_required_lines.length,
      },
    },
    null,
    2,
  ),
);
