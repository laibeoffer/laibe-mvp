# Owner Guide Automation

```yaml
automation_name: owner-guide-agent-patrol
frequency: every 15 minutes
managed_by: SECOND_DEPUTY_COMMANDER
workstream: app/owner-guide-agent
no_idle_until_initialized: true
no_change_response_allowed_after_initialization_only: true
```

## Patrol Rule

After blackboard reporting, if no new assignment is received within 20 minutes, this agent must continue the next safe initialization or correction task within `app/owner-guide-agent` scope.

Before initialization / correction is complete, the agent must not report `本 workstream 本輪無新指派`.

## Management Rule

The Owner Guide Agent is now supervised by `SECOND_DEPUTY_COMMANDER`, not `EXECUTION_OFFICER`. Requirement flow, UI logic, task progress, runtime evidence, and functional acceptance routing are supervised by the Second Deputy Commander.

## GitHub Source Rule

Patrol results are not formal until they are represented on GitHub `laibeoffer/laibe-mvp` through a tracked branch, PR, or merged Markdown file. Local workspace output is `LOCAL_DRAFT_ONLY` until promoted.
