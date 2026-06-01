# Budget E2E Fixture QA Automation

automation_name: `budget-e2e-fixture-qa-patrol`
frequency: `every 15 minutes`
managed_by: `LAIBE_PATROL_INTEGRATION_OFFICER`
workstream: `budget/e2e-fixture-qa`
github_source_of_truth: `laibeoffer/laibe-mvp`
no_idle_until_initialized: `true`
auto_progress_after_minutes_without_response: `20`

## Scope

Each patrol is limited to:
- GitHub `main` `docs/WORKSTREAM_BLACKBOARD.md`
- GitHub Issues assigned to Budget E2E Fixture & QA Agent
- GitHub PRs assigned to Budget E2E Fixture & QA Agent
- instructions from `LAIBE_PATROL_INTEGRATION_OFFICER`
- `docs/budget_e2e_qa/`

## No-Idle Rules

1. After the blackboard self-introduction is posted, if no response is received within 20 minutes, continue the next initialization task automatically.
2. Before initialization is complete, do not report `本 workstream 本輪無新指派`.
3. After initialization is complete, `本 workstream 本輪無新指派` is allowed only when no open Issue, open PR, or Integration Officer instruction exists for this workstream.

## Patrol Checklist

- Confirm GitHub `main` is the source of truth.
- Confirm this workstream branch or PR is current.
- Check for Integration Officer instructions.
- Check assigned Issues and PRs.
- Confirm no implementation files were changed.
- Confirm dry-run docs still prohibit formal price, payment, AI API, DB, n8n, webhook, and formal output generation.

## Escalation

Escalate to Commander only for formal acceptance standard decisions or production release decisions.
Escalate to Reviewer before final integration harness acceptance.
