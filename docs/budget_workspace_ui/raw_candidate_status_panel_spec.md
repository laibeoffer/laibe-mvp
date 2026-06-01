# Raw Candidate Status Panel Spec

## Purpose

The Raw Candidate panel shows evidence readiness from the raw candidate warehouse.

## Status Values

- `candidate-only`
- `reviewed`
- `final packet accepted`
- `blocked`

## Required Display

- candidate count
- source quality status
- reviewer checklist status
- final packet link or id
- candidate-only warning
- no-formal-price warning

## Gate Rule

Only `final packet accepted` can contribute to downstream dry-run readiness.

`candidate-only` and `reviewed` must remain evidence states, not pricing authority.

## Forbidden Behavior

The panel must not:

- publish catalog data
- generate formal `MaterialSpec`
- generate formal `LaborRule`
- generate formal `PricingRule`
- write `BudgetEstimateLine.unit_price`
- call renderer

