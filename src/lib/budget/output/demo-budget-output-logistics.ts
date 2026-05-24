import { generateBudgetEstimate } from "../budget-generator.ts";
import { mockProject } from "../mock/mock-layout.ts";
import { buildBudgetCatalogFromMethodSpec } from "../specs/build-budget-catalog-from-method-spec.ts";
import { seedMethodSpecCatalog } from "../specs/seed-method-spec-catalog.ts";
import { validateMethodSpecCatalog } from "../specs/validate-method-spec-catalog.ts";
import { formatBudgetSheetOutput } from "./budget-sheet-formatter.ts";
import {
  exportBudgetSheetToJson,
  exportCustomerBudgetRows,
  exportInternalTraceRows,
} from "./budget-output-exporter.ts";
import { validateBudgetSheetOutput } from "./budget-output-validator.ts";

const methodSpecValidation = validateMethodSpecCatalog(seedMethodSpecCatalog);
const budgetCatalog = buildBudgetCatalogFromMethodSpec(seedMethodSpecCatalog);
const budgetEstimate = generateBudgetEstimate(mockProject, budgetCatalog);
const budgetSheetOutput = formatBudgetSheetOutput(
  budgetEstimate,
  seedMethodSpecCatalog,
);
const outputValidation = validateBudgetSheetOutput(
  budgetSheetOutput,
  seedMethodSpecCatalog,
);
const customerRows = exportCustomerBudgetRows(budgetSheetOutput);
const internalTraceRows = exportInternalTraceRows(budgetSheetOutput);

// Keep the full JSON exporter exercised in this demo without printing the full sheet.
const exportedJson = exportBudgetSheetToJson(budgetSheetOutput);
const materialBindingReviewWarningCount = outputValidation.warnings.filter(
  (warning) => warning.startsWith("Material binding requires review:"),
).length;

const summary = {
  output_valid: methodSpecValidation.valid && outputValidation.valid,
  method_spec_valid: methodSpecValidation.valid,
  output_validation: outputValidation,
  estimate_id: budgetSheetOutput.estimate_id,
  total_amount: budgetSheetOutput.totals.total_amount,
  customer_line_count: customerRows.length,
  internal_line_count: internalTraceRows.length,
  trade_group_count: budgetSheetOutput.totals.trade_group_count,
  warning_count: outputValidation.warnings.length,
  material_binding_review_warning_count: materialBindingReviewWarningCount,
  review_required_count: budgetSheetOutput.totals.review_required_count,
  exported_json_length: exportedJson.length,
  first_customer_line: customerRows[0],
  first_internal_trace_line: internalTraceRows[0],
};

console.log(JSON.stringify(summary, null, 2));
