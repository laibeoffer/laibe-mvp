import { fixtureBudgetOutputSnapshot } from "../renderers/fixture-budget-output-snapshot.ts";
import {
  exportBudgetSheetToJson,
  exportCustomerBudgetRows,
  exportInternalTraceRows,
} from "./budget-output-exporter.ts";
import { validateBudgetSheetOutput } from "./budget-output-validator.ts";

// Output demos are snapshot-only: they consume a persisted fixture snapshot
// and never rerun estimate generation or pricing logic.
const budgetSheetOutput = {
  estimate_id: fixtureBudgetOutputSnapshot.estimate_id,
  project_id: fixtureBudgetOutputSnapshot.project_id,
  stage: fixtureBudgetOutputSnapshot.estimate_stage,
  generated_at: fixtureBudgetOutputSnapshot.generated_at,
  customer_view: fixtureBudgetOutputSnapshot.customer_view,
  internal_view: fixtureBudgetOutputSnapshot.internal_view,
  totals: fixtureBudgetOutputSnapshot.totals,
  warnings: fixtureBudgetOutputSnapshot.warnings,
};
const outputValidation = validateBudgetSheetOutput(budgetSheetOutput);
const customerRows = exportCustomerBudgetRows(budgetSheetOutput);
const internalTraceRows = exportInternalTraceRows(budgetSheetOutput);

// Keep the full JSON exporter exercised in this demo without printing the full sheet.
const exportedJson = exportBudgetSheetToJson(budgetSheetOutput);
const materialBindingReviewWarningCount = outputValidation.warnings.filter(
  (warning) => warning.startsWith("Material binding requires review:"),
).length;

const summary = {
  output_valid: outputValidation.valid,
  snapshot_only: true,
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
