# Quote Factory Export Package Notes

## Purpose

Record proposal-level notes about Quote Factory export packages so the Integration Officer can review what may later feed controlled integration.

## Allowed Use

- Preserve package names, manifest summaries, validation status, and known blockers.
- Record whether a package is draft, review-ready, or merged shared truth.
- Link package evidence to integration backlog items.

## Forbidden Use

- Do not convert exported price ranges into formal `PricingRule`.
- Do not write `BudgetEstimateLine.unit_price`.
- Do not treat `PriceObservation` or `PriceRange` as formal price authority.
- Do not feed renderer or customer output directly.

## Current Notes

- QF5.4 is recorded as validator-passed according to the task brief.
- PR #3 is still draft according to the task brief, so its output remains proposal / evidence until the Integration Officer confirms shared-truth status.
