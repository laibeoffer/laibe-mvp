# Quote Factory Status Panel Spec

## Purpose

The Quote Factory panel shows the readiness of quote package evidence from the external Quote Factory workflow.

## Status Values

- `not started`
- `package ready`
- `validator passed`
- `functional acceptance pending`
- `blocked`

## Required Display

- package id
- package version
- validator command or report
- validation result
- functional acceptance state
- unresolved blocker

## Gate Rule

`validator passed` is necessary but not always sufficient.

If functional acceptance is pending, the workspace must show:

`validator passed / functional acceptance pending`

and keep dry-run CTA disabled if the workflow requires acceptance before use.

## Forbidden Behavior

The panel must not:

- import Quote Factory runtime
- generate formal price
- create `PricingRule`
- create `BudgetEstimateLine`
- treat external quote evidence as accepted final price

