# Milestone Payment Plan Contract

## Purpose

`milestone_payment_plan` defines planned payment checkpoints tied to acceptance, delivery, review, dispute, and manual approval gates.

This contract is a planning placeholder. It cannot trigger real collection, escrow, release, deduction, invoice settlement, or bank activity.

## Required Fields

| Field | Type | Required | Notes |
|---|---|---:|---|
| plan_id | string | yes | Stable placeholder ID. |
| project_id | string | yes | Project reference. |
| contract_ref | string | yes | Contract or draft reference. |
| currency | string | yes | Display currency. |
| milestones | array | yes | Payment checkpoints. |
| aggregate_payment_status | string | yes | Allowed payment status enum. |
| source_of_truth_ref | string | yes | GitHub PR, commit SHA, or approved document ref. |
| manual_approval_required | boolean | yes | Must be true. |
| forbidden_real_payment | boolean | yes | Must be true. |

## Milestone Fields

| Field | Type | Required | Notes |
|---|---|---:|---|
| milestone_id | string | yes | Stable milestone ID. |
| title | string | yes | Human readable milestone name. |
| placeholder_amount | number | yes | Placeholder amount only. |
| acceptance_condition_refs | array | yes | Release condition references. |
| retention_placeholder_ref | string/null | yes | Retention record if applicable. |
| escrow_placeholder_ref | string/null | yes | Escrow placeholder if applicable. |
| payment_status | string | yes | Allowed payment status enum. |
| review_status | string | yes | draft, pending_manual_review, approved_placeholder, rejected_placeholder, superseded. |
| target_review_date | string/null | no | Date for manual review reminder. |
| notes | string | no | Review notes only. |

## Rules

- Every milestone must have at least one acceptance or release condition reference before it can become `ready_to_release`.
- `ready_to_release` means ready for human review only.
- `released_placeholder` means the placeholder milestone was marked complete in documentation only.
- Milestones with unresolved disputes must be `partially_disputed` or `on_hold`.

