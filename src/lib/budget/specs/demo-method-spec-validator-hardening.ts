import type {
  MethodSpecCatalog,
  MethodSpecGuardResult,
  MethodSpecValidationReport,
} from "./types.ts";
import {
  METHOD_SPEC_ITEM_CODES,
  seedMethodSpecCatalog,
} from "./seed-method-spec-catalog.ts";
import { validateMethodSpecCatalog } from "./validate-method-spec-catalog.ts";

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
  unbound_material_allowlist_result: findGuardResult(
    report,
    "unbound_material_allowlist_guard",
  ),
  inclusion_exclusion_review_policy_result: findGuardResult(
    report,
    "inclusion_exclusion_review_policy_guard",
  ),
  note_coverage_result: findGuardResult(
    report,
    "quote_item_note_coverage_guard",
  ),
});

const makeRiskyCatalog = (): MethodSpecCatalog => {
  const riskyCatalog = cloneCatalog(seedMethodSpecCatalog);
  const riskyItemCode = METHOD_SPEC_ITEM_CODES.islandCabinet;

  riskyCatalog.catalog_id = `${seedMethodSpecCatalog.catalog_id}-validator-risk-demo`;
  riskyCatalog.pricing_rules = riskyCatalog.pricing_rules.map((rule, index) =>
    index === 0
      ? {
          ...rule,
          price_source: {
            ...rule.price_source,
            type: "ai_generated",
            id: "invalid-ai-generated-source-demo",
          },
        }
      : rule,
  );
  riskyCatalog.item_material_bindings =
    riskyCatalog.item_material_bindings.filter(
      (binding) => binding.item_code !== riskyItemCode,
    );
  riskyCatalog.quote_item_templates = riskyCatalog.quote_item_templates.map(
    (template) =>
      template.item_code === riskyItemCode
        ? {
            ...template,
            default_notes: "",
          }
        : template,
  );
  riskyCatalog.note_templates = riskyCatalog.note_templates.map((note) => ({
    ...note,
    applies_to_item_codes: note.applies_to_item_codes.filter(
      (itemCode) => itemCode !== riskyItemCode,
    ),
  }));

  return riskyCatalog;
};

const seedValidation = validateMethodSpecCatalog(seedMethodSpecCatalog);
const riskyValidation = validateMethodSpecCatalog(makeRiskyCatalog());

console.log(
  JSON.stringify(
    {
      seed_catalog: summarizeReport(seedValidation),
      intentionally_invalid_catalog: {
        ...summarizeReport(riskyValidation),
        issue_codes: riskyValidation.issues.map((issue) => issue.code),
        issue_refs: riskyValidation.issues.map((issue) => issue.ref),
      },
    },
    null,
    2,
  ),
);
