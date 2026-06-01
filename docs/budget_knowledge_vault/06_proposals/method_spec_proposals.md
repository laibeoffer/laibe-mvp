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
| Budget engine entry clarification | `integration_gap_register.md` records `BUDGET_ENGINE_ENTRY_BLOCKER`; PR #47 records docs-only `NO_ENTRY_FOUND_MINIMAL_DRY_RUN_ENTRY_REQUIRED` evidence and asks for separate authorization before runtime implementation. | Which deterministic budget engine entry path should receive verified MethodSpec / context-window evidence for dry-run integration, and should a future implementation use zero-value placeholders or reviewed deterministic dry-run amounts? | Do not edit `MethodSpecCatalog`, budget engine code, `PricingRule`, `MaterialSpec`, or `LaborRule`; this vault cannot authorize runtime implementation or formal prices. |
| Context-window trace status | `00_index.md` records Requirement Form and Plan Puzzle SVG / Quantity Facts windows as trace metadata. | What evidence status is required before each context window can support formal estimate preparation? | Placeholder / linked evidence remains trace-only and must not become estimate authority. |
