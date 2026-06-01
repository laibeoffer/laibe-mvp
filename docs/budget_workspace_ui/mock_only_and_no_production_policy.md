# Mock-Only And No-Production Policy

## Phase Boundary

This workstream is docs-only / IA-only / mock-contract-only.

It does not ship production UI.

It does not create a runtime.

It does not connect any backend.

## Required Labels

Any future UI derived from this contract must display:

- `Mock contract only`
- `Dry-run only`
- `No formal quote`
- `No formal price`
- `No production UI`
- `No formal Excel/PDF`

## Forbidden Production Claims

Do not claim:

- production ready
- formal estimate ready
- formal quote ready
- renderer ready
- Excel / PDF writer ready
- Budget Engine integrated
- DB connected
- AI API connected
- n8n runtime connected
- payment connected

## Forbidden Technical Actions

This workstream must not:

- edit `src/`
- edit Budget Engine runtime
- edit `PricingRule`
- edit `BudgetEstimateLine`
- edit renderer runtime
- connect DB / Supabase
- connect payment
- connect AI API
- connect n8n runtime
- create secrets
- create `.env`
- start integration harness
- generate formal price
- generate formal quote

## Escalation Rule

If a requested next step requires any forbidden action, mark:

`BLOCKED_NEED_COMMANDER_DECISION`

Then continue safe docs-only work if any remains.

