# PCM Case Status Model

## Purpose

This model defines docs-only case status labels for AI PCM governance and patrol. It does not create a database schema, production workflow, legal status, payment status, or formal contract state.

## Case Statuses

| Status | Meaning | Allowed Use |
|---|---|---|
| `intake_placeholder` | Case information exists only as a placeholder | Planning only |
| `awaiting_verified_contract` | Contract source is missing or not verified | Block formal judgment |
| `awaiting_evidence_review` | Evidence exists but needs review | Prepare evidence packet |
| `needs_party_clarification` |甲方 or 乙方 input is required through approved channels | Route through platform / supervisor |
| `needs_supervisor_decision` | Low-risk docs-only or governance decision needed | AI PCM Supervisor queue |
| `needs_deputy_escalation` | High-risk item needs highest commander decision | Deputy Commander queue |
| `ready_for_supervisor_review` | Agent packet is complete enough for supervisor review | Closeout queue |
| `closeout_accepted` | Supervisor accepted docs-only workstream closeout | Stop may be considered |
| `automation_stop_approved` | Supervisor or Deputy explicitly approved automation stop | Stop patrol |
| `blocked_forbidden_scope` | Requested action touches forbidden production/sensitive scope | Do not proceed |

## Validation Rules

- No status authorizes formal legal decision.
- No status authorizes payment, escrow, listing fee, or fund release.
- No status authorizes contract modification.
- No status lets LINE messages override contract records.
- No status lets AI guesses override verified records.
- `verified` evidence remains a prerequisite for formal judgment, but this docs-only model does not itself verify any fact.

