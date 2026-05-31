# Unit Conversion Proposals

Status: proposal register only.

## Known Reference Gap

MethodSpec integration readiness notes that `cm -> m` and `m -> cm` conversion coverage may still be absent as warning-level reference coverage.

## Proposal Boundary

Any conversion proposal must remain review-only until the MethodSpec owner explicitly approves validator or catalog changes. This vault must not silently rewrite quantities.

## Candidate Review Inputs

These are non-binding review inputs for conversion governance.

| Candidate | Source Signal | Proposed Review Question | Boundary |
|---|---|---|---|
| `cm <-> m` coverage warning | Existing reference gap notes possible missing `cm -> m` and `m -> cm` coverage. | Should MethodSpec validator evidence include explicit warning-level coverage for both directions before integration dry-run? | Do not alter validators, catalog data, or quantity formulas from this vault. |
| Quantity context confidence label | Plan Puzzle SVG / Quantity Facts window tracks `quantity_confidence`. | Should conversion-dependent quantity facts require `verified` status plus confidence label before use in formal preparation? | Trace-only quantities must not become `BudgetEstimateLine` or renderer input. |
