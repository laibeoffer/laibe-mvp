# Budget Engine Dry-Run Panel Spec

## Purpose

The dry-run panel shows whether a budget dry-run can be executed. It does not execute the Budget Engine in this phase.

## Status Values

- `unavailable`
- `pending`
- `dry-run ready`
- `blocked`

## Required Display

- engine entry status
- required input readiness
- blocker reason
- dry-run scope
- no-formal-price warning
- no-customer-facing-output warning

## Gate Inputs

The dry-run gate depends on:

- verified requirement state
- verified or accepted file state, if required
- verified plan quantity state
- accepted Quote Factory package, if required
- accepted Raw Candidate packet, if required
- MethodSpec not blocked by engine entry
- explicit dry-run entry availability

## CTA Rule

The primary CTA is enabled only when status is `dry-run ready`.

When disabled, it must show one exact reason, such as:

- `Requirement form is incomplete`
- `Plan quantity status is placeholder only`
- `Budget Engine entry is unavailable`
- `MethodSpec is blocked by engine entry`

## Forbidden Behavior

The panel must not:

- call `generateBudgetEstimate()`
- bypass formal estimate guards
- generate `BudgetEstimateLine`
- generate formal price
- generate formal quote
- start integration harness

