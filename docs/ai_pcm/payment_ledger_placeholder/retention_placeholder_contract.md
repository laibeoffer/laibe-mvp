# Retention Placeholder Contract

## Purpose

`retention_placeholder` records proposed holdback amounts and review conditions. It is not a real withholding, escrow reserve, payable balance, or deduction.

## Required Fields

| Field | Type | Required | Notes |
|---|---|---:|---|
| retention_placeholder_id | string | yes | Stable placeholder ID. |
| project_id | string | yes | Project reference. |
| milestone_id | string | yes | Related milestone. |
| placeholder_amount | number | yes | Review-only retention amount. |
| retention_basis | string | yes | warranty, defect_review, acceptance_hold, dispute_hold, manual_review. |
| payment_status | string | yes | Allowed payment status enum. |
| release_condition_refs | array | yes | Required for future release review. |
| review_status | string | yes | draft, pending_manual_review, approved_placeholder, rejected_placeholder, superseded. |
| manual_approval_required | boolean | yes | Must be true. |
| forbidden_real_deduction | boolean | yes | Must be true. |

## Rules

- Retention placeholder amounts must not be deducted automatically.
- Retention release cannot be automated.
- Any `ready_to_release` retention requires human approval and source-of-truth evidence.
- Disputed retention must link to a disputed amount record.

