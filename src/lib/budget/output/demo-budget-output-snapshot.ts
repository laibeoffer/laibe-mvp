import { generateBudgetEstimate } from "../budget-generator.ts";
import { mockProject } from "../mock/mock-layout.ts";
import { buildBudgetCatalogFromMethodSpec } from "../specs/build-budget-catalog-from-method-spec.ts";
import { seedMethodSpecCatalog } from "../specs/seed-method-spec-catalog.ts";
import { validateMethodSpecCatalog } from "../specs/validate-method-spec-catalog.ts";
import { formatBudgetSheetOutput } from "./budget-sheet-formatter.ts";
import { createBudgetOutputSnapshot } from "./budget-output-snapshot.ts";
import {
  validateBudgetOutputSnapshot,
  validateBudgetSheetOutput,
} from "./budget-output-validator.ts";
import { InMemoryBudgetOutputRepository } from "./in-memory-budget-output-repository.ts";
import type { BudgetOutputSnapshot } from "./types.ts";

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
const snapshot = createBudgetOutputSnapshot(budgetSheetOutput, {
  catalog_version: seedMethodSpecCatalog.version,
  output_version: "budget-output-v1",
  validation_report: outputValidation,
});
const snapshotValidation = validateBudgetOutputSnapshot(
  snapshot,
  seedMethodSpecCatalog,
);
const invalidSnapshot = { ...snapshot } as Partial<BudgetOutputSnapshot>;

delete invalidSnapshot.snapshot_id;
delete invalidSnapshot.source_summary;

const invalidSnapshotValidation = validateBudgetOutputSnapshot(
  invalidSnapshot,
  seedMethodSpecCatalog,
);
const repository = new InMemoryBudgetOutputRepository();

repository.saveOutputSnapshot(snapshot);

const loadedSnapshot = repository.getOutputSnapshot(snapshot.snapshot_id);
const materialBindingReviewWarningCount = snapshotValidation.warnings.filter(
  (warning) => warning.startsWith("Material binding requires review:"),
).length;

const summary = {
  method_spec_valid: methodSpecValidation.valid,
  output_valid: outputValidation.valid && snapshotValidation.valid,
  snapshot_id: snapshot.snapshot_id,
  estimate_stage: snapshot.estimate_stage,
  total_amount: snapshot.totals.total_amount,
  customer_line_count: snapshot.source_summary.customer_line_count,
  internal_line_count: snapshot.source_summary.internal_line_count,
  material_linked_line_count:
    snapshot.source_summary.material_linked_line_count,
  material_unlinked_line_count:
    snapshot.source_summary.material_unlinked_line_count,
  material_binding_review_warning_count: materialBindingReviewWarningCount,
  review_required_count: snapshot.source_summary.review_required_count,
  snapshot_saved: true,
  snapshot_loaded: loadedSnapshot?.snapshot_id === snapshot.snapshot_id,
  invalid_snapshot_validation_result: invalidSnapshotValidation,
};

console.log(JSON.stringify(summary, null, 2));
