# Functional Acceptance Log Contract

Functional acceptance records whether an artifact met its declared scope.

## Record Shape

```json
{
  "functional_acceptance_id": "fa_20260601_0001",
  "artifact_id": "budget_audit_trail_docs_packet",
  "artifact_type": "docs_only_packet",
  "declared_scope": "docs_only_audit_contracts",
  "acceptance_status": "not_applicable_docs_only",
  "evidence_refs": [],
  "accepted_by_role": null,
  "blocked_reason": null,
  "created_at": "2026-06-01T00:00:00+08:00",
  "updated_at": "2026-06-01T00:00:00+08:00",
  "risk_flags": []
}
```

## Allowed Statuses

- `not_applicable_docs_only`
- `pending`
- `passed`
- `passed_with_notes`
- `failed`
- `blocked`

## Rules

- Docs-only packets use `not_applicable_docs_only` for runtime acceptance.
- Runtime acceptance must not be inferred from a docs-only PR merge.
- Integration use requires Integration Officer review.
