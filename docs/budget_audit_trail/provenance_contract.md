# Provenance Contract

The provenance contract records where a budget artifact came from, who transformed it, and what status it has.

## Record Shape

```json
{
  "provenance_id": "prov_20260601_0001",
  "artifact_id": "raw_candidate_0001",
  "artifact_type": "raw_candidate",
  "workstream": "budget/audit-trail",
  "source_agent": "Budget Audit Trail Agent",
  "upstream_artifacts": [],
  "source_refs": [],
  "transformation": "docs_only_contract_initialization",
  "status": "candidate",
  "decision_state": "not_reviewed",
  "created_at": "2026-06-01T00:00:00+08:00",
  "updated_at": "2026-06-01T00:00:00+08:00",
  "risk_flags": [],
  "forbidden_scope_check": {
    "implementation_code_changed": false,
    "formal_price_generated": false,
    "pricing_rule_changed": false,
    "budget_estimate_line_generated": false,
    "payment_ai_api_db_n8n_touched": false
  }
}
```

## Required Fields

- `provenance_id`
- `artifact_id`
- `artifact_type`
- `workstream`
- `source_agent`
- `upstream_artifacts`
- `source_refs`
- `transformation`
- `status`
- `decision_state`
- `created_at`
- `updated_at`
- `risk_flags`
- `forbidden_scope_check`

## Rules

- Provenance is evidence of lineage, not approval.
- Provenance must not be used as a formal price authority.
- Every downstream handoff must preserve upstream artifact IDs.
- If source lineage is incomplete, set `risk_flags` and keep `status` as `candidate` or `blocked`.
