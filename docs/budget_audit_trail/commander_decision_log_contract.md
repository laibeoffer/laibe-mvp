# Commander Decision Log Contract

This contract records Commander / Deputy Commander decisions for audit trail governance.

## Record Shape

```json
{
  "commander_decision_id": "cmd_20260601_0001",
  "owner_role": "DEPUTY_COMMANDER",
  "decision_subject_id": "budget_audit_trail_initialization",
  "decision": "pending",
  "decision_scope": "docs_only_support_agent_initialization",
  "decision_reason": "awaiting branch / PR disposition",
  "allowed_next_step": "docs_only_review",
  "forbidden_next_steps": ["runtime integration", "formal pricing", "DB persistence"],
  "created_at": "2026-06-01T00:00:00+08:00",
  "updated_at": "2026-06-01T00:00:00+08:00",
  "source_refs": [],
  "risk_flags": []
}
```

## Rules

- Commander decisions must define scope.
- A docs-only Commander decision does not authorize runtime integration.
- Closeout requires explicit `AGENT_CLOSEOUT_ACCEPTED` and `AUTOMATION_STOP_APPROVED` if the automation should stop.
