# CLI Validator Evidence Checklist

Workstream: `qa/budget-runtime-acceptance`

## When Required

Use this checklist when a PR claims `CLI_VALIDATED`, static guard pass, validator pass, or runtime demo pass.

## Required Fields

- command;
- working context or repo ref;
- input fixture if relevant;
- expected output;
- observed output summary;
- pass/fail result;
- warning count or issue count when available;
- exact limitation of the claim.

## Required Forbidden-Flow Check

For budget-related validators, include:

- formal price generated: Yes / No;
- `PricingRule` written: Yes / No;
- `BudgetEstimateLine` generated: Yes / No;
- Renderer invoked: Yes / No;
- payment invoked: Yes / No;
- AI API invoked: Yes / No;
- DB/Supabase invoked: Yes / No;
- n8n/webhook invoked: Yes / No.

## Evidence Result Labels

- `PASS`
- `PASS_WITH_WARNINGS`
- `FAIL`
- `PENDING`
- `NOT_RUN`

## Docs-only Boundary

This file is a checklist. It does not run any CLI command and does not prove runtime behavior.
