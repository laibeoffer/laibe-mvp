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

## Safe Work

Allowed autonomous work:

- docs-only registry updates
- schema-only examples
- compatibility matrix updates
- final report updates
- forbidden-scope checklists
- blackboard-ready status summaries

## Forbidden Work

The automation must not modify implementation code, Budget Engine runtime, `PricingRule`, `BudgetEstimateLine`, MethodSpec implementation, Raw Candidate implementation, Output Documents implementation, DB, Supabase, payment, AI API, n8n runtime, integration harness, formal price, or formal quote.
