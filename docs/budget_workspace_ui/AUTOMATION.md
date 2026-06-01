# Budget Workspace UI Automation

automation_name: budget-workspace-ui-patrol

frequency: every 15 minutes

managed_by: DEPUTY_COMMANDER

final_integration_reviewer: LAIBE_PATROL_INTEGRATION_OFFICER

workstream: app/budget-workspace-ui

github_source_of_truth: laibeoffer/laibe-mvp

no_idle_until_initialized: true

auto_progress_after_minutes_without_response: 20

closeout_requires_deputy_commander_approval: true

integration_use_requires_integration_officer_review: true

## Runtime Status

Codex app heartbeat automation was created with id:

`budget-workspace-ui-patrol`

The automation is active and wakes this thread every 15 minutes.

## Patrol Contract

Every patrol must check:

- GitHub source-of-truth state for `laibeoffer/laibe-mvp`
- `docs/WORKSTREAM_BLACKBOARD.md` status
- this workstream's documentation completeness
- whether any safe docs-only task remains
- whether high-risk work is being requested

Every patrol may continue only safe docs-only / IA-only / mock-contract work.

## Forbidden Patrol Actions

The automation must not:

- modify production UI
- modify Budget Engine runtime
- modify `PricingRule`
- modify `BudgetEstimateLine`
- modify renderer runtime
- connect DB / Supabase
- connect payment
- connect AI API
- connect n8n runtime
- start integration harness
- generate formal price
- generate formal quote
- merge PRs
- close Issues
- resolve review threads
- run `git clean`
- run `git reset`

