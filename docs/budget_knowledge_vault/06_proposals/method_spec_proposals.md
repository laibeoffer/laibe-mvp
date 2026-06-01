# MethodSpec Proposals

Status: proposal register only.

## Proposal Rules

- Proposals may identify candidate MethodSpec changes for reviewer consideration.
- Proposals must not directly edit `MethodSpecCatalog`.
- Proposals must not become `PricingRule`, `MaterialSpec`, or `LaborRule` without approved review.
- Proposals must preserve source evidence and uncertainty.

## Current Proposals

No formal MethodSpec proposal is approved by this vault.

## Candidate Review Inputs

These are non-binding review inputs for the Integration Officer / MethodSpec owner. They are not approved catalog changes.

| Candidate | Source Signal | Proposed Review Question | Boundary |
|---|---|---|---|
| Budget engine entry clarification | `integration_gap_register.md` records `BUDGET_ENGINE_ENTRY_BLOCKER`; Issue #49 / PR #47 record docs-only `NO_ENTRY_FOUND_MINIMAL_DRY_RUN_ENTRY_REQUIRED` evidence; Issue #49 Commander decision authorizes the entry-picking agent to prepare a minimal dry-run runtime using zero-value placeholders only. | How should a future dry-run entry consume `validateMethodSpecCatalog()` / `buildBudgetCatalogFromMethodSpec()` output as approved seed/rules without turning MethodSpec into formal pricing authority? | Do not edit `MethodSpecCatalog`, budget engine code, `PricingRule`, `MaterialSpec`, or `LaborRule`; this vault cannot implement runtime code or formal prices. |
| Context-window trace status | `00_index.md` records Requirement Form and Plan Puzzle SVG / Quantity Facts windows as trace metadata. | What evidence status is required before each context window can support formal estimate preparation? | Placeholder / linked evidence remains trace-only and must not become estimate authority. |
