import { generateBudgetEstimate } from "../budget-generator.ts";
import { mockProject } from "../mock/mock-layout.ts";
import { buildBudgetCatalogFromMethodSpec } from "./build-budget-catalog-from-method-spec.ts";
import {
  BLOCKED_LABOR_PRICING_SOURCE_TYPES,
  BLOCKED_PRICING_SOURCE_TYPES,
  REQUIRED_UNIT_CONVERSION_PAIRS,
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

const countIssueCode = (
  report: MethodSpecValidationReport,
  code: string,
): number => report.issues.filter((issue) => issue.code === code).length;

const summarizeReport = (report: MethodSpecValidationReport) => ({
  valid: report.valid,
  error_count: report.summary.error_count,
  warning_count: report.summary.warning_count,
  allowed_condition_count: report.summary.allowed_condition_count,
  guard_result_count: report.summary.guard_result_count,
  unit_conversion_coverage_guard_result: findGuardResult(
    report,
    "unit_conversion_coverage_guard",
  ),
  pricing_source_guard_result: findGuardResult(
    report,
    "pricing_source_type_guard",
  ),
  labor_rule_reference_only_guard_result: findGuardResult(
    report,
    "labor_rule_reference_only_guard",
  ),
  missing_required_unit_conversion_warning_count: countIssueCode(
    report,
    "missing_required_unit_conversion",
  ),
  missing_formula_unit_conversion_warning_count: countIssueCode(
    report,
    "missing_formula_unit_conversion",
  ),
  blocked_pricing_source_error_count: countIssueCode(
    report,
    "blocked_pricing_source_type",
  ),
  labor_rule_price_source_error_count: countIssueCode(
    report,
    "labor_rule_used_as_price_source",
  ),
  issue_codes: report.issues.map((issue) => issue.code),
  issue_refs: report.issues.map((issue) => issue.ref),
});

const makeMissingConversionCatalog = (): MethodSpecCatalog => {
  const riskyCatalog = cloneCatalog(seedMethodSpecCatalog);

  riskyCatalog.catalog_id = `${seedMethodSpecCatalog.catalog_id}-missing-conversion-demo`;
  riskyCatalog.unit_conversions = riskyCatalog.unit_conversions.filter(
    (conversion) =>
      !(
        conversion.from_unit.trim().toLowerCase() === "cm" &&
        conversion.to_unit.trim() === "尺"
      ),
  );

  return riskyCatalog;
};

const makeRiskyPricingCatalog = (): MethodSpecCatalog => {
  const riskyCatalog = cloneCatalog(seedMethodSpecCatalog);

  riskyCatalog.catalog_id = `${seedMethodSpecCatalog.catalog_id}-validator-p1b-risk-demo`;
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
const missingConversionValidation = validateMethodSpecCatalog(
  makeMissingConversionCatalog(),
);
const riskyPricingValidation = validateMethodSpecCatalog(
  makeRiskyPricingCatalog(),
);

const budgetCatalog = buildBudgetCatalogFromMethodSpec(seedMethodSpecCatalog);
const budgetEstimate = generateBudgetEstimate(mockProject, budgetCatalog);

console.log(
  JSON.stringify(
    {
      policy: {
        required_unit_conversion_pairs: REQUIRED_UNIT_CONVERSION_PAIRS,
        blocked_pricing_source_types: [...BLOCKED_PRICING_SOURCE_TYPES],
        blocked_labor_pricing_source_types: [
          ...BLOCKED_LABOR_PRICING_SOURCE_TYPES,
        ],
      },
      seed_catalog: summarizeReport(seedValidation),
      intentionally_missing_conversion_catalog: summarizeReport(
        missingConversionValidation,
      ),
      intentionally_invalid_pricing_catalog: summarizeReport(
        riskyPricingValidation,
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
