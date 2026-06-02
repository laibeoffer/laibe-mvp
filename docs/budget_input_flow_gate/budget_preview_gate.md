# Budget Preview Gate

Workstream: `budget/input-flow-gate`

## Purpose

The Budget Preview gate determines whether a project may enter a dry-run budget preview state.

## Required Inputs

- requirement completion status: `complete`;
- plan quantity context status: `verified`;
- file intake status: all required files are `linked`, `verified`, or explicitly `unavailable` with review flag;
- forbidden-flow check exists;
- user-facing language identifies preview as dry-run / not formal quote.

## Gate Output

The gate may emit:

- `budget_preview_allowed: true | false`
- `review_required: true | false`
- `missing_inputs`
- `blocked_ctas`
- `allowed_ctas`
- `dry_run_only: true`

## Must Remain Disabled

Even when dry-run Budget Preview is allowed, these remain disabled unless future authorized runtime evidence exists:

- formal price generation;
- customer-facing final quote;
- formal Excel/PDF export;
- production `PricingRule` write;
- production `BudgetEstimateLine` creation.

## Boundary

This document defines a gate contract only. It does not run Budget Engine or Renderer.
