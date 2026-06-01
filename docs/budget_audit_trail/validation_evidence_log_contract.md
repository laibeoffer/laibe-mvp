# Validation Evidence Log Contract

This contract records validation commands, static guards, demo evidence, and review evidence.

## Record Shape

```json
{
  "validation_evidence_id": "val_20260601_0001",
  "artifact_id": "budget_audit_trail_docs_packet",
  "validation_type": "docs_scope_check",
  "command": null,
  "result": "not_run_docs_only",
  "evidence_summary": "Docs-only contract packet; no runtime validation required.",
  "evidence_refs": [],
  "created_at": "2026-06-01T00:00:00+08:00",
  "updated_at": "2026-06-01T00:00:00+08:00",
  "risk_flags": []
}
```

## Rules

- If a command was not run, say so directly.
- Do not mark runtime behavior as validated unless runtime commands or browser checks actually ran.
- For docs-only tasks, validation may be limited to scope and forbidden-flow checks.
