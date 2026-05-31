# Automation Placeholder

automation_name: budget-workflow-orchestrator-patrol
frequency: every 15 minutes
managed_by: LAIBE_PATROL_INTEGRATION_OFFICER
workstream: workflow/budget-orchestrator
github_source_of_truth: laibeoffer/laibe-mvp
no_idle_until_initialized: true
auto_progress_after_minutes_without_response: 20

## Runtime Status

No real heartbeat or external automation is created in this repository by this document.

This is a workflow placeholder record only. It records the intended patrol policy for the Budget Workflow Orchestrator Agent while n8n is not enabled.

## Patrol Scope

The patrol scope is limited to:

- GitHub `main` version of `docs/WORKSTREAM_BLACKBOARD.md`
- GitHub Issues assigned to Budget Workflow Orchestrator Agent
- GitHub PRs assigned to Budget Workflow Orchestrator Agent
- instructions from `LAIBE_PATROL_INTEGRATION_OFFICER`
- `docs/workflow/budget_orchestrator/`

## No-Idle Rule

After blackboard self-introduction, if no response is received within 20 minutes, this agent must automatically continue the next defined initialization task.

Before initialization is complete, this agent may not report:

`本 workstream 本輪無新指派`

Only after initialization is complete, and only when there is no open Issue, open PR, or Integration Officer instruction, the agent may report:

`本 workstream 本輪無新指派`

No-idle cannot be used as a stop reason.

## Prohibited Automation

This placeholder does not create:

- n8n runtime
- real webhook trigger
- file upload backend
- cron job
- scheduler
- API key
- DB connection
- payment automation
- AI API call
- production notification
- formal budget output
