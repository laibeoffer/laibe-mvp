# Payment Forbidden Scope

## Hard Prohibitions

AI PCM must not:

- connect payment processors
- connect escrow providers
- connect listing fee systems
- connect bank APIs
- connect DB or persistence services
- connect AI APIs
- connect LINE APIs
- automatically release money
- automatically deduct money
- create real transactions
- create real invoices, receipts, chargebacks, settlements, payouts, or remittance files
- store bank account, card, wallet, escrow account, API key, webhook secret, or production credential data

## Placeholder Boundaries

Allowed records may include:

- placeholder amount
- placeholder allocation
- placeholder retention
- placeholder dispute amount
- placeholder release condition
- manual review status
- source-of-truth reference

Allowed records must not imply:

- money has moved
- money is owed as a final decision
- money is legally withheld
- escrow has been established
- payment processor or bank execution is available

## Permission Escalation

If any task requires real payment, escrow, listing fee, DB, bank, AI API, LINE API, automatic release, automatic deduction, or real transaction scope, stop that branch and report to AI PCM 總監／後台總控 Agent.

