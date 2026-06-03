# Payment Review Status Policy

## Payment Status Enum

All placeholder payment records must use one of these statuses:

- not_started
- pending_acceptance
- ready_to_release
- partially_disputed
- on_hold
- released_placeholder
- cancelled

## Status Meaning

| Status | Meaning | Allowed AI PCM Action |
|---|---|---|
| not_started | Payment planning has not started. | Create placeholder plan or reminder. |
| pending_acceptance | Acceptance or evidence is still pending. | Check release conditions and request evidence review. |
| ready_to_release | Conditions appear ready for human review. | Prepare manual approval request only. |
| partially_disputed | Some amount is disputed. | Link dispute record and suggest allocation split. |
| on_hold | Payment placeholder is paused. | Record blocker and request manual decision. |
| released_placeholder | Placeholder review has been marked complete. | Document result only; no real release. |
| cancelled | Placeholder payment path was cancelled. | Preserve audit trail; do not delete records. |

## Review Status Enum

Supporting review fields should use:

- draft
- pending_manual_review
- approved_placeholder
- rejected_placeholder
- superseded

## Transition Rules

- `not_started` may move to `pending_acceptance` after a milestone or ledger record exists.
- `pending_acceptance` may move to `ready_to_release` only when release conditions are satisfied as placeholders.
- `ready_to_release` may move to `released_placeholder` only after manual approval is documented.
- Any status may move to `on_hold` when evidence, permission, or source-of-truth issues exist.
- Any amount-level dispute should move the affected record to `partially_disputed`.
- `cancelled` records must remain in the audit trail.

## Human Approval

Human approval is required before any future real-world payment operation. AI PCM can only prepare review packets and recommendations.

