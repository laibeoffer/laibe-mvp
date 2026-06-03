# Payment Allocation Ledger Contract

## Purpose

`payment_allocation_ledger` records proposed payment allocation states for a project, phase, milestone, vendor, contractor, or stakeholder. It is a placeholder ledger only.

It must never be treated as a real payment instruction, bank order, escrow order, invoice settlement, deduction, or transaction record.

## Required Fields

| Field | Type | Required | Notes |
|---|---|---:|---|
| ledger_id | string | yes | Stable placeholder ID. |
| project_id | string | yes | Project reference. |
| source_of_truth_ref | string | yes | GitHub PR, commit SHA, or approved document ref. |
| currency | string | yes | ISO-like display code, for example TWD. |
| total_placeholder_amount | number | yes | Placeholder amount only. |
| allocations | array | yes | Allocation lines. |
| payment_status | string | yes | Must use allowed status enum. |
| review_status | string | yes | draft, pending_manual_review, approved_placeholder, rejected_placeholder, superseded. |
| manual_approval_required | boolean | yes | Must be true before any future real payment workflow. |
| forbidden_real_payment | boolean | yes | Must be true. |
| created_by_agent | string | yes | Agent name. |
| updated_at | string | yes | ISO 8601 timestamp. |

## Allocation Line Fields

| Field | Type | Required | Notes |
|---|---|---:|---|
| allocation_id | string | yes | Stable line ID. |
| party_ref | string | yes | Placeholder party reference. |
| role | string | yes | owner, contractor, designer, supplier, platform, other. |
| placeholder_amount | number | yes | Proposed allocation amount only. |
| allocation_basis | string | yes | milestone, retention, dispute, adjustment, manual_review. |
| release_condition_refs | array | yes | References release condition records. |
| disputed_amount_ref | string/null | yes | Required when allocation is disputed. |
| notes | string | no | Review notes only. |

## Allowed Payment Statuses

- not_started
- pending_acceptance
- ready_to_release
- partially_disputed
- on_hold
- released_placeholder
- cancelled

## Validation Rules

- `forbidden_real_payment` must always be `true`.
- `manual_approval_required` must remain `true` unless a future approved production workflow replaces this contract.
- `released_placeholder` means placeholder review complete only; it must not imply actual money release.
- Allocation totals should equal `total_placeholder_amount` unless a documented dispute or hold explains the difference.
- A `partially_disputed` ledger must reference at least one disputed amount record.

