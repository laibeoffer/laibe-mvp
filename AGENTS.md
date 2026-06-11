# LaiBE MVP Agent Entry

This file is the A/B worktree governance entry for Codex agents working under:

```text
Z:\08-Jacky\laibe_MVP_project
```

If this file conflicts with older prompts or stale nested `AGENTS.md` files, follow this file unless the user explicitly overrides it.

## 1. Command Structure

- A computer worktree commander is final authority.
- B computer deputy commander executes A-assigned B tasks and reports through `B_TO_A_REPORTS`.
- B must use `A_TO_B_TASKS\CURRENT_B_TASK.md` as the active task source.
- Old agents may not self-direct, self-publish, or bypass the command center.

## 2. Command Center

Primary command center:

```text
Z:\08-Jacky\laibe_MVP_project\_ab_command_center
```

Key files:

- `WORKTREE_REGISTRY.md`
- `WORKTREE_DISTRIBUTION_PLAN.md`
- `GITHUB_ISSUE_COMMAND_BOARD.md`
- `CODEX_SKILLS_AND_PLUGINS_REGISTRY.md`
- `A_TO_B_TASKS\CURRENT_B_TASK.md`
- `A_TO_B_TASKS\TASK_INDEX.md`
- `B_TO_A_REPORTS`
- `WORKTREE_STATUS_REPORTS`
- `GITHUB_PUBLISH_QUEUE`

## 3. Skills

Use the LaiBE worktree skill suite:

```text
Z:\08-Jacky\laibe_MVP_project\skills\laibe-worktree-suite\SKILL.md
```

The full current skill packet is:

```text
Z:\08-Jacky\laibe_MVP_project\_ab_command_center\WORKTREE_PROMPT_PACKETS\LAIBE_WORKTREE_SKILLS_V2.md
```

## 4. Allowed Work

Allowed inside an explicitly assigned worktree:

- static route repair
- mock / placeholder / candidate / disabled labels
- dry-run JSON / preview artifacts
- browser smoke
- human UI/UX acceptance reports
- command-center Markdown governance
- handoff reports
- exact-file guard scans

## 5. Forbidden Work

Do not perform without explicit high-risk authorization:

- DB / Supabase
- real login / auth
- payment / escrow / listing fee
- AI API / LINE API
- n8n / production webhook
- production Budget Engine
- PricingRule
- BudgetEstimateLine
- formal quote / formal price
- formal Excel / formal PDF
- formal tender / award
- Plancraft core modification
- GitHub push / merge / PR / issue close
- broad staging such as `git add .`
- reset / clean / force push

## 6. Publish Rule

PREDEPLOY evidence is not publish authorization.

Before any publish-related action:

1. Use `GITHUB_PUBLISH_QUEUE`.
2. List exact files.
3. Exclude unrelated dirty state.
4. Confirm browser smoke.
5. Confirm Human UI/UX gate.
6. Confirm forbidden scope clean.
7. Receive explicit commander authorization.

## 7. Local State Warning

Current project state may differ from GitHub.

Use:

```text
LOCAL_STATE_DIFFERS_FROM_GITHUB
```

when local state and GitHub state do not match.

Do not treat dirty local worktrees as GitHub truth.
