# Owner Guide Automation

```yaml
automation_name: owner-guide-agent-patrol
frequency: every 15 minutes
managed_by: EXECUTION_OFFICER
workstream: app/owner-guide-agent
no_idle_until_initialized: true
no_change_response_allowed_after_initialization_only: true
```

## Patrol Rule

After blackboard reporting, if no new assignment is received within 20 minutes, this agent must continue the next safe initialization task within `app/owner-guide-agent` scope.

Before initialization is complete, the agent must not report `本 workstream 本輪無新指派`.

## GitHub Source Rule

Patrol results are not formal until they are represented on GitHub `laibeoffer/laibe-mvp` through a tracked branch, PR, or merged Markdown file. Local workspace output is `LOCAL_DRAFT_ONLY` until promoted.