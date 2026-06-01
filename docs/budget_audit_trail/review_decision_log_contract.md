# Review Decision Log Contract

This contract records reviewer decisions without letting the audit trail become a reviewer or price authority.

## Record Shape

```json
{
  "review_decision_id": "review_20260601_0001",
  "reviewer_role": "LAIBE_PATROL_INTEGRATION_OFFICER",
  "review_subject_id": "handoff_proposal_0001",
  "review_subject_type": "handoff_proposal",
  "decision": "pending",
  "decision_reason": "not yet reviewed",
  "conditions": [],
  "blocked_reason": null,
  "created_at": "2026-06-01T00:00:00+08:00",
  "updated_at": "2026-06-01T00:00:00+08:00",
  "source_refs": [],
  "risk_flags": []
}
```

## Allowed Decisions

- `pass`
- `pass_with_notes`
- `needs_fix`
- `blocked`
- `not_applicable_docs_only`
- `pending`

## Rules

- Reviewer decisions do not generate formal prices.
- Reviewer decisions must preserve stated scope.
- If evidence is missing, use `pending` or `blocked`, not `pass`.
