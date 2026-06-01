# Budget Engine Entry Investigation

Date: 2026-06-01 Asia/Taipei
Agent: Budget Engine Entry & Picking Agent
Workstream: budget/engine-entry-picking
Supervisor: LAIBE_PATROL_INTEGRATION_OFFICER
Scope: docs-only investigation against GitHub `main`

## 1. Source Checked

Primary source of truth:

- Repository: `laibeoffer/laibe-mvp`
- Ref: GitHub `main`
- Main SHA checked: `87b0b1e050f11501438423676c32619daee554cb`
- Checked paths:
  - `src/lib/budget/`
  - `src/lib/budget/specs/`
  - `src/lib/budget/output/`
  - `src/lib/budget/renderers/`
  - `docs/budget/`
  - `docs/NEXT_CODEX_HANDOFF.md`
  - `docs/WORKSTREAM_BLACKBOARD.md`

Secondary evidence checked:

- PR #30 `warehouse/method-spec-integration-readiness`, because it records MethodSpec readiness and the `BUDGET_ENGINE_ENTRY_BLOCKER` evidence.

This document does not use local workspace state as shared truth.

## 2. Entry Search Result

| Target | GitHub main result | Interpretation |
| --- | --- | --- |
| `src/lib/budget/budget-generator.ts` | Not present in GitHub `main` tree. | Old Budget Engine entry is missing. |
| `src/lib/budget/demo-generate-budget.ts` | Not present in GitHub `main` tree. | Old demo entry is missing. |
| `generateBudgetEstimate` | No implementation or export found on GitHub `main`; references remain in docs, static guards, and MethodSpec demo files. | The callable engine entry is absent; references are stale or guard-only. |
| `BudgetEstimate` | No current `src/lib/budget/types.ts` export found on GitHub `main`; references remain in docs and output/raw boundary text. | Existing runtime types do not expose a usable formal estimate entry contract. |
| `BudgetEstimateLine` | No current runtime export found on GitHub `main`; references remain in docs and forbidden-flow guards. | A formal line contract is documented, but not available as the current engine entry. |
| `BudgetOutputSnapshot` | Present in `src/lib/budget/output/types.ts`. | Output Documents has a snapshot contract. |
| `createBudgetOutputSnapshot` | Present in `src/lib/budget/output/budget-output-snapshot.ts`. | Can wrap a `BudgetSheetOutput` into `BudgetOutputSnapshot`; it is not an engine. |
| `buildBudgetCatalogFromMethodSpec` | Present in `src/lib/budget/specs/build-budget-catalog-from-method-spec.ts`. | Converts MethodSpec shelves into catalog-shaped data; it does not generate estimate lines. |
| `MethodSpecCatalog` | Present in `src/lib/budget/specs/types.ts`. | MethodSpec can supply approved catalog/reference shelves. |

## 3. Current Budget-Related Runtime Surface

### Plancraft / Plan Input Adapter

- `src/lib/budget/adapters/preview-floor-plan-adapter.ts`
- `src/lib/budget/demo-generate-budget-from-preview-floor-plan.ts`
- `src/lib/budget/types.ts`

This path normalizes Plancraft+ draft data into `BudgetInputFromFloorPlan` candidate data. It explicitly keeps:

- `productionReady: false`
- `formalEstimateAllowed: false`
- candidate-only quantity facts

It is not a Budget Engine entry and must not be used to produce a formal estimate.

### MethodSpec Warehouse

- `src/lib/budget/specs/types.ts`
- `src/lib/budget/specs/seed-method-spec-catalog.ts`
- `src/lib/budget/specs/validate-method-spec-catalog.ts`
- `src/lib/budget/specs/build-budget-catalog-from-method-spec.ts`

MethodSpec can currently supply:

- `QuoteItemTemplate`
- `MethodRecipe`
- `PricingRule`
- `MaterialSpec`
- `LaborRule`
- `NoteTemplate`
- `UnitConversion`
- `InclusionExclusionRule`
- `ItemMaterialBinding`
- validator evidence and review flags

This is a catalog/reference supplier, not an executable integration entry.

### Output Documents

- `src/lib/budget/output/types.ts`
- `src/lib/budget/output/budget-output-snapshot.ts`
- `src/lib/budget/renderers/render-snapshot.ts`
- `src/lib/budget/renderers/renderer-static-guard.ts`

Output Documents accepts `BudgetOutputSnapshot` / snapshot-gated renderer inputs only. It must not call the Budget Engine, read raw warehouse data, read `MethodSpecCatalog` directly as renderer input, or recalculate prices/quantities.

## 4. MethodSpec Handoff Status

MethodSpec can hand off approved catalog/reference data and validator evidence to a future budget integration bundle.

Current safe handoff target:

- A future `BudgetInputBundle` built by the Budget Engine Entry / Integration Harness layer.

Current blocked target:

- Direct executable dry-run into `generateBudgetEstimate`, because `src/lib/budget/budget-generator.ts` is absent on GitHub `main`.

PR #30 correctly treats this as `BUDGET_ENGINE_ENTRY_BLOCKER`, not as a MethodSpec validator failure.

## 5. Output Documents Requirement

Output Documents only needs a `BudgetOutputSnapshot` or snapshot-compatible object.

It does not need:

- `budget-generator.ts`
- `generateBudgetEstimate()`
- raw candidate rows
- `PriceObservation`
- `PriceRange`
- direct `MethodSpecCatalog` reads
- renderer-side pricing or quantity calculation

For integration, Output Documents should receive a completed dry-run snapshot from the harness and render/validate preview output only.

## 6. Missing Integration Harness Segment

The missing segment is the Budget Engine entry layer between upstream evidence and `BudgetOutputSnapshot`:

1. Build a `BudgetInputBundle` from:
   - placeholder `ProjectRequirementBrief`
   - placeholder `PlanPuzzleQuantityFacts`
   - approved MethodSpec seed/rules
2. Select candidate work items and recipes in dry-run mode.
3. Produce `BudgetSheetOutput` / `BudgetOutputSnapshot`-compatible data.
4. Mark all output as dry-run / not customer-facing / not formal quote.
5. Preserve trace fields and review requirements.
6. Never use raw candidate, observed price, PriceRange, SVG quantity, or free-text requirement as formal price or production quantity.

## 7. Decision

Decision: `NO_ENTRY_FOUND_MINIMAL_DRY_RUN_ENTRY_REQUIRED`

Rationale:

- Old Budget Engine files are not present on GitHub `main`.
- No renamed replacement entry was found.
- Existing MethodSpec and Output Documents surfaces are necessary but not sufficient.
- A small, explicit dry-run entry is needed before integration harness runtime work can proceed.

## 8. Forbidden Scope Confirmed

This investigation does not authorize:

- formal price generation
- formal quote generation
- `PricingRule` direct writes from candidates
- `BudgetEstimateLine.unit_price` from `PriceRange` / observed price
- SVG quantity as production quantity
- renderer reads from raw warehouse or MethodSpec catalog
- payment, escrow, listing fee
- AI API / RAG
- DB / Supabase
- production webhook
- real Excel / PDF output

## 9. Recommended Next Step

Commander should decide whether to authorize the scoped runtime implementation of a minimal dry-run Budget Engine entry. Until then, integration harness remains blocked.