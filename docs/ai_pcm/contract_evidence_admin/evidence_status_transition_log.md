# Evidence Status Transition Log

## Purpose

This log records status transitions for contract evidence records managed by `pcm/contract-evidence-admin`.

It is docs-only. It does not approve any evidence as verified and does not create formal contract basis.

## Allowed Status Values

Only these statuses may appear:

- `placeholder`
- `linked`
- `verified`
- `disputed`
- `superseded`
- `voided`
- `unavailable`

## Transition Rules

| From | To | Required Condition |
|---|---|---|
| `placeholder` | `linked` | A traceable source is found. |
| `linked` | `verified` | Source, version, party confirmation, and applicability are verified with GitHub source reference. |
| `linked` | `disputed` | Source, version, content, party identity, or applicability conflicts. |
| `verified` | `disputed` | New conflict, objection, or evidence weight issue appears. |
| `verified` | `superseded` | Newer verified evidence replaces the record. |
| any | `voided` | Record is voided, withdrawn, invalid, or forbidden. |
| any | `unavailable` | Source cannot be obtained or access is unavailable. |

## Required Transition Fields

| Field | Required | Description |
|---|---:|---|
| `transition_id` | Yes | Stable transition ID. |
| `evidence_id` | Yes | Evidence record being changed. |
| `from_status` | Yes | Previous status. |
| `to_status` | Yes | New status. |
| `transition_reason` | Yes | Why the change is allowed. |
| `source_of_truth` | Yes | GitHub PR / commit SHA or LOCAL_STATE limitation. |
| `formal_use_before` | Yes | Must be boolean. |
| `formal_use_after` | Yes | Must be boolean. |
| `review_required` | Yes | Must be true for disputed or high-risk transitions. |
| `approved_by` | Conditional | Required before `verified` formal use. |
| `created_at` | Yes | ISO timestamp. |

## Current Transition Entries

| Transition ID | Evidence ID | From | To | Formal Use After | Notes |
|---|---|---|---|---|---|
| `CE-TRANSITION-INIT-000` | `NONE` | `placeholder` | `placeholder` | false | Initialization log only; no project evidence transition has been registered. |
| `CE-TRANSITION-PATROL-2026-06-03-001` | `NONE` | `placeholder` | `placeholder` | false | Patrol-created transition log; no evidence status changed. |

## Guardrails

- `placeholder` must not be promoted to `verified` without a traceable source and GitHub reference.
- `linked` remains trace-only until verification completes.
- `disputed` must route to human review.
- `superseded` remains historical only.
- `voided` must not be used.
- `unavailable` must not enter adjudication.
- LINE messages must not be standalone contract authority.

