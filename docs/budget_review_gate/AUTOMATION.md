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

## Alarm Repair Log

### 2026-06-01T00:35:00+08:00

Status:
`ALARM_REPAIR_CHECKED / DOCUMENTED_PATROL_ACTIVE / RUNTIME_AUTOMATION_NOT_AVAILABLE_IN_SESSION`

Checked:

- GitHub `main` SHA: `4cb9fe9d902fbd6c4eed16c525629e03ab0c57a1`
- Branch `budget/review-gate` SHA: `845a4b2d664568880dbdbc4286fac2806e572328`
- PR #37: open, mergeable, Budget Review Gate scope
- Open Issue scan: no non-PR Issue dedicated to `budget/review-gate` found
- Review docs: present on branch `budget/review-gate`

Repair result:

- The alarm contract is present in this file.
- No runtime heartbeat / scheduler tool is available in this session, so the repair is documented in-repo.
- Immediate patrol was executed manually.
- Initialization is complete pending PR merge.

Next patrol rule:
Continue checking only `docs/WORKSTREAM_BLACKBOARD.md`, GitHub Issues / PRs for `budget/review-gate`, `LAIBE_PATROL_INTEGRATION_OFFICER` instructions, and `docs/budget_review_gate/`.
