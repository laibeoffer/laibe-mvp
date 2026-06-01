# Pricing Review Proposals

Status: proposal register only.

## Proposal Rules

- Raw price evidence, price ranges, historical quote lines, and observed prices may be logged only as review evidence.
- This vault must not create formal prices.
- This vault must not approve `PricingRule`.
- This vault must not write `BudgetEstimateLine.unit_price`.

## Current Proposals

No pricing proposal is approved by this vault.

## Candidate Review Inputs

These are non-binding review inputs for pricing governance. They do not create or approve prices.

| Candidate | Source Signal | Proposed Review Question | Boundary |
|---|---|---|---|
| Quote Factory candidate-only marker | Integration readiness notes QF5.4 evidence is still pending final shared truth / PR #3 merge. | Should downstream handoff packets display an explicit `candidate_price_range_only` marker until governance approval exists? | Do not create formal prices, approve `PricingRule`, or write `BudgetEstimateLine.unit_price`. |
| Review usage signal separation | PR #31 has review usage-limit comments and no reviewer decision. | Should pricing-related proposal logs distinguish missing review signal from reviewer approval / rejection? | Missing review signal is not approval and cannot unblock formal pricing. |
| Dry-run amount policy | Issue #49 asks Commander to decide whether a future minimal dry-run entry uses zero-value placeholders or reviewed MethodSpec deterministic dry-run amounts. | What dry-run amount policy is allowed before formal pricing and functional acceptance exist? | This vault must not choose the policy, create formal prices, approve `PricingRule`, or write `BudgetEstimateLine.unit_price`. |
