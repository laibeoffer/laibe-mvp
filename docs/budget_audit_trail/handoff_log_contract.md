# Handoff Log Contract

The handoff log records what an agent hands to the next owner and what is forbidden.

## Record Shape

```json
{
  "handoff_log_id": "handoff_20260601_0001",
  "from_agent": "Budget Audit Trail Agent",
  "to_role": "DEPUTY_COMMANDER",
  "workstream": "budget/audit-trail",
  "handoff_artifacts": [],
  "scope_summary": "docs-only audit trail contracts",
  "allowed_next_steps": ["docs review", "integration officer review before use"],
  "forbidden_next_steps": ["runtime integration", "formal pricing", "DB persistence", "payment", "AI API", "n8n runtime"],
  "known_risks": [],
  "created_at": "2026-06-01T00:00:00+08:00",
  "updated_at": "2026-06-01T00:00:00+08:00"
}
```

## Rules

- Handoff must include scope, artifacts, risks, and forbidden steps.
- If integration use is proposed, it must route to `LAIBE_PATROL_INTEGRATION_OFFICER`.
- Handoff must not claim audit logs equal formal approval.
