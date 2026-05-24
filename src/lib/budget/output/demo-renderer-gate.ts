import { fixtureBudgetOutputSnapshot } from "../renderers/fixture-budget-output-snapshot.ts";
import { assertSnapshotRenderable } from "./renderer-gate.ts";
import type { BudgetOutputSnapshot } from "./types.ts";

// Renderer gate demos are snapshot-only: they consume a persisted fixture
// snapshot and never rerun estimate generation or pricing logic.
const validSnapshot = fixtureBudgetOutputSnapshot;
const validGate = assertSnapshotRenderable(validSnapshot, {
  requireCustomerView: true,
});
const invalidSnapshot = {
  ...validSnapshot,
  customer_view: [],
} as Partial<BudgetOutputSnapshot>;

delete invalidSnapshot.snapshot_id;

const invalidGate = assertSnapshotRenderable(invalidSnapshot, {
  requireCustomerView: true,
});

const summary = {
  valid_gate_allowed: validGate.allowed,
  snapshot_only: true,
  valid_gate_errors: validGate.errors,
  valid_gate_warnings_count: validGate.warnings.length,
  invalid_gate_allowed: invalidGate.allowed,
  invalid_gate_errors: invalidGate.errors,
  snapshot_id: validGate.snapshot_id,
  estimate_stage: validGate.estimate_stage,
};

console.log(JSON.stringify(summary, null, 2));
