# Budget Schema Registry Automation

automation_name: budget-schema-registry-patrol

frequency: every 15 minutes

managed_by: DEPUTY_COMMANDER

final_integration_reviewer: LAIBE_PATROL_INTEGRATION_OFFICER

workstream: budget/schema-registry

github_source_of_truth: laibeoffer/laibe-mvp

no_idle_until_initialized: true

auto_progress_after_minutes_without_response: 20

closeout_requires_deputy_commander_approval: true

integration_use_requires_integration_officer_review: true

app_automation_status: ACTIVE

app_automation_kind: heartbeat

## Patrol Rules

Every patrol must check whether the required docs-only registry files exist on the active scoped branch or merged GitHub main.

If no response is received within 20 minutes, continue the next safe docs-only task. Do not report `NO_NEW_ASSIGNMENT` before initialization is complete.

## Closeout Patrol Rule

PR #61 is merged and docs-only initialization is complete, but automation closeout is not complete until both explicit signals exist:

- `AGENT_CLOSEOUT_ACCEPTED`
- `AUTOMATION_STOP_APPROVED`

If either signal is absent, keep `budget-schema-registry-patrol` active and report `BLOCKED_NEED_COMMANDER_DECISION` only when notifying.

## AGENT_IDLE_VIOLATION Remediation

A safe-work supplement was required after `AGENT_IDLE_VIOLATION`.

Required supplement files:

- `docs/budget_schema_registry/evidence_packet.md`
- `docs/budget_schema_registry/forbidden_scope_check.md`
- `docs/budget_schema_registry/handoff_contract.md`
- `docs/budget_schema_registry/closeout_report.md`
- `docs/budget_schema_registry/sync_ready_manifest.md`

These files are docs-only evidence and handoff artifacts. They do not change runtime behavior or authorize automation stop.

## Safe Work

Allowed autonomous work:

- docs-only registry updates
- schema-only examples
- compatibility matrix updates
- final report updates
- forbidden-scope checklists
- blackboard-ready status summaries
- evidence packets
- handoff contracts
- closeout reports
- sync-ready manifests

## Forbidden Work

The automation must not modify implementation code, Budget Engine runtime, `PricingRule`, `BudgetEstimateLine`, MethodSpec implementation, Raw Candidate implementation, Output Documents implementation, DB, Supabase, payment, AI API, n8n runtime, integration harness, formal price, or formal quote.
