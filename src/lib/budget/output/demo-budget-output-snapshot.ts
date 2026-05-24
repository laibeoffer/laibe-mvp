import { fixtureBudgetOutputSnapshot } from "../renderers/fixture-budget-output-snapshot.ts";
import { validateBudgetOutputSnapshot } from "./budget-output-validator.ts";
import { InMemoryBudgetOutputRepository } from "./in-memory-budget-output-repository.ts";
import type { BudgetOutputSnapshot } from "./types.ts";

// Output snapshot demos are snapshot-only: they consume a persisted fixture
// snapshot and never rerun estimate generation or pricing logic.
const snapshot = fixtureBudgetOutputSnapshot;
const snapshotValidation = validateBudgetOutputSnapshot(snapshot);
const invalidSnapshot = { ...snapshot } as Partial<BudgetOutputSnapshot>;

delete invalidSnapshot.snapshot_id;
delete invalidSnapshot.source_summary;

const invalidSnapshotValidation = validateBudgetOutputSnapshot(
  invalidSnapshot,
);
const repository = new InMemoryBudgetOutputRepository();

repository.saveOutputSnapshot(snapshot);

const loadedSnapshot = repository.getOutputSnapshot(snapshot.snapshot_id);
const materialBindingReviewWarningCount = snapshotValidation.warnings.filter(
  (warning) => warning.startsWith("Material binding requires review:"),
).length;

const summary = {
  snapshot_only: true,
  output_valid: snapshotValidation.valid,
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
