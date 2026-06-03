# Disputed Amount Record Contract

## Purpose

`disputed_amount_record` marks placeholder amounts that require human review because acceptance, scope, quality, deadline, evidence, or responsibility is disputed.

It is not a legal finding, debt claim, deduction, chargeback, or payment instruction.

## Required Fields

| Field | Type | Required | Notes |
|---|---|---:|---|
| dispute_id | string | yes | Stable placeholder ID. |
| project_id | string | yes | Project reference. |
| related_ledger_id | string | yes | Payment allocation ledger reference. |
| related_milestone_id | string/null | yes | Milestone reference if applicable. |
| disputed_placeholder_amount | number | yes | Review-only disputed amount. |
| currency | string | yes | Display currency. |
| dispute_reason | string | yes | Short reason category. |
| evidence_refs | array | yes | Evidence references, can be placeholder refs. |
| payment_status | string | yes | partially_disputed or on_hold recommended. |
| review_status | string | yes | draft, pending_manual_review, approved_placeholder, rejected_placeholder, superseded. |
| required_human_decision | string | yes | Decision requested from reviewer. |
| forbidden_auto_resolution | boolean | yes | Must be true. |

## Rules

- Disputed amounts must not trigger auto-deduction.
- Dispute status must not resolve itself based only on AI output.
- AI PCM may summarize evidence and recommend review paths only.
- Final decisions must be manual and traceable to source-of-truth evidence.

