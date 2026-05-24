import type {
  BudgetOutputSnapshot,
  BudgetOutputSnapshotOptions,
  BudgetSheetOutput,
} from "./types.ts";

const sanitizeIdPart = (value: string): string =>
  value.replace(/[^a-zA-Z0-9_-]/g, "-").replace(/-+/g, "-");

const makeSnapshotId = (
  output: BudgetSheetOutput,
  generatedAt: string,
): string =>
  `budget-output-snapshot-${sanitizeIdPart(output.project_id)}-${sanitizeIdPart(
    output.estimate_id,
  )}-${sanitizeIdPart(generatedAt)}`;

export const createBudgetOutputSnapshot = (
  output: BudgetSheetOutput,
  options: BudgetOutputSnapshotOptions,
): BudgetOutputSnapshot => {
  const generatedAt = options.generated_at ?? new Date().toISOString();
  const customerLineCount = output.customer_view.flatMap(
    (group) => group.lines,
  ).length;
  const internalLines = output.internal_view.flatMap((group) => group.lines);
  const materialLinkedLineCount = internalLines.filter(
    (line) => line.material_code,
  ).length;
  const reviewRequiredCount = internalLines.filter(
    (line) => line.requires_review,
  ).length;

  return {
    snapshot_id:
      options.snapshot_id ?? makeSnapshotId(output, generatedAt),
    estimate_id: output.estimate_id,
    project_id: output.project_id,
    estimate_stage: output.stage,
    output_version: options.output_version ?? "budget-output-v1",
    generated_at: generatedAt,
    catalog_version: options.catalog_version,
    customer_view: output.customer_view,
    internal_view: output.internal_view,
    totals: output.totals,
    validation_report: options.validation_report,
    warnings: output.warnings,
    source_summary: {
      estimate_line_count: internalLines.length,
      customer_line_count: customerLineCount,
      internal_line_count: internalLines.length,
      review_required_count: reviewRequiredCount,
      material_linked_line_count: materialLinkedLineCount,
      material_unlinked_line_count: internalLines.length - materialLinkedLineCount,
    },
  };
};
