# Release Condition Contract

## Purpose

`release_condition` describes the acceptance or review gates that must be checked before a placeholder amount can move toward manual release review.

It does not authorize real payment, escrow release, deduction, or bank activity.

## Required Fields

| Field | Type | Required | Notes |
|---|---|---:|---|
| condition_id | string | yes | Stable placeholder ID. |
| project_id | string | yes | Project reference. |
| condition_type | string | yes | acceptance, evidence, inspection, dispute_clearance, retention_review, manual_approval. |
| description | string | yes | Human readable condition. |
| evidence_refs | array | yes | Evidence references. |
| condition_status | string | yes | not_checked, pending_evidence, satisfied_placeholder, failed_placeholder, waived_by_manual_approval. |
| checked_by_agent | string/null | yes | Agent name if checked. |
| checked_at | string/null | yes | ISO 8601 timestamp if checked. |
| manual_approval_required | boolean | yes | Must be true for release-sensitive conditions. |
| forbidden_auto_release | boolean | yes | Must be true. |

## Rules

- `satisfied_placeholder` only means the condition appears satisfied for documentation review.
- `waived_by_manual_approval` requires a source-of-truth reference.
- Conditions tied to disputes cannot be marked satisfied unless the dispute record is manually resolved.
- No condition may trigger automatic release.

