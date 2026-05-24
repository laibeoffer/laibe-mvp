import { generateBudgetEstimate } from "../budget-generator.ts";
import { mockProject } from "../mock/mock-layout.ts";
import { buildBudgetCatalogFromMethodSpec } from "../specs/build-budget-catalog-from-method-spec.ts";
import { seedMethodSpecCatalog } from "../specs/seed-method-spec-catalog.ts";
import { formatBudgetSheetOutput } from "./budget-sheet-formatter.ts";
import { createBudgetOutputSnapshot } from "./budget-output-snapshot.ts";
import { validateBudgetSheetOutput } from "./budget-output-validator.ts";
import { assertSnapshotRenderable } from "./renderer-gate.ts";
import type { BudgetOutputSnapshot } from "./types.ts";

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
const validSnapshot = createBudgetOutputSnapshot(budgetSheetOutput, {
  catalog_version: seedMethodSpecCatalog.version,
  output_version: "budget-output-v1",
  validation_report: outputValidation,
});
const validGate = assertSnapshotRenderable(validSnapshot, {
  methodSpecCatalog: seedMethodSpecCatalog,
  requireCustomerView: true,
});
const invalidSnapshot = {
  ...validSnapshot,
  customer_view: [],
} as Partial<BudgetOutputSnapshot>;

delete invalidSnapshot.snapshot_id;

const invalidGate = assertSnapshotRenderable(invalidSnapshot, {
  methodSpecCatalog: seedMethodSpecCatalog,
  requireCustomerView: true,
});

const summary = {
  valid_gate_allowed: validGate.allowed,
  valid_gate_errors: validGate.errors,
  valid_gate_warnings_count: validGate.warnings.length,
  invalid_gate_allowed: invalidGate.allowed,
  invalid_gate_errors: invalidGate.errors,
  snapshot_id: validGate.snapshot_id,
  estimate_stage: validGate.estimate_stage,
};

console.log(JSON.stringify(summary, null, 2));
