# Payment Ledger Placeholder Schema

## Status Enums

Payment status values:

- not_started
- pending_acceptance
- ready_to_release
- partially_disputed
- on_hold
- released_placeholder
- cancelled

Review status values:

- draft
- pending_manual_review
- approved_placeholder
- rejected_placeholder
- superseded

Release condition status values:

- not_checked
- pending_evidence
- satisfied_placeholder
- failed_placeholder
- waived_by_manual_approval

## Record Types

### payment_allocation_ledger

Required references:

- `ledger_id`
- `project_id`
- `source_of_truth_ref`
- `allocations[]`
- `payment_status`
- `review_status`
- `manual_approval_required`
- `forbidden_real_payment`

Required invariant:

- `manual_approval_required` must be `true`.
- `forbidden_real_payment` must be `true`.

### milestone_payment_plan

Required references:

- `plan_id`
- `project_id`
- `contract_ref`
- `milestones[]`
- `aggregate_payment_status`
- `source_of_truth_ref`
- `manual_approval_required`
- `forbidden_real_payment`

### escrow_placeholder

Required invariant:

- `escrow_enabled` must be `false`.
- `provider_ref` must be `null`.
- `forbidden_real_escrow` must be `true`.

### retention_placeholder

Required invariant:

- `forbidden_real_deduction` must be `true`.
- Retention release remains manual review only.

### disputed_amount_record

Required invariant:

- `forbidden_auto_resolution` must be `true`.
- Any final decision must be manual and traceable to source-of-truth evidence.

### release_condition

Required invariant:

- `forbidden_auto_release` must be `true`.
- `satisfied_placeholder` does not authorize real payment release.

