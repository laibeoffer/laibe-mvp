# Budget Review Gate Patrol Automation

automation_name: budget-review-gate-patrol

frequency: every 15 minutes

managed_by: LAIBE_PATROL_INTEGRATION_OFFICER

workstream: budget/review-gate

github_source_of_truth: laibeoffer/laibe-mvp

no_idle_until_initialized: true

auto_progress_after_minutes_without_response: 20

## Scope

Every patrol checks only this workstream:

- GitHub `main` `docs/WORKSTREAM_BLACKBOARD.md`
- GitHub Issues assigned to Budget Review Gate Agent
- GitHub PRs assigned to Budget Review Gate Agent
- Instructions from `LAIBE_PATROL_INTEGRATION_OFFICER`
- `docs/budget_review_gate/`

## No-Idle Rule

After the blackboard self-introduction is posted, if no response is received within 20 minutes, this agent must automatically continue initialization tasks.

Before initialization is complete, the agent may not report:

`本 workstream 本輪無新指派`

Only after initialization is complete, and after confirming there are no open Issues, open PRs, or integration-officer instructions, may it report:

`本 workstream 本輪無新指派`

## Source of Truth

GitHub is the source of truth. Local dirty worktree state must not be used to decide whether this workstream is complete.

If local state differs from GitHub `main`, report:

`LOCAL_STATE_IGNORED_GITHUB_IS_SOURCE_OF_TRUTH`
