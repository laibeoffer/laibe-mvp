# ISSUE_BLACKBOARD_PATROL_WORKFLOW.md

## Purpose

This file defines how LaiBE uses GitHub Issues, `docs/WORKSTREAM_BLACKBOARD.md`, and chatroom heartbeat patrols together.

It prevents work from falling back to manual chatroom搬磚 and keeps Deputy Codex responsible for technical routing.

## Core Model

- GitHub Issue = formal work order.
- Pull Request = completion / review artifact.
- `docs/WORKSTREAM_BLACKBOARD.md` = shared battlefield board and current status source.
- Thread heartbeat = one chatroom patrol timer; it wakes only that chatroom.
- Deputy Codex heartbeat = central patrol across all PRs, Issues, and blackboard status.
- Workstream heartbeat = scoped patrol for one agent / workstream only.

Thread heartbeat is not a chatroom group mention system. One heartbeat cannot wake another chatroom.

## Required Dispatch Format

Every Deputy Codex dispatch must include:

```md
To:
Workstream:
Branch / Repo:
Mission:
Why this agent:
Action:
Need Commander:
Need Reviewer:
```

Rules:

- `To:` must name exactly one primary agent / chatroom.
- `Workstream:` must match the workstream registry.
- `Branch / Repo:` must identify the target branch or external repo.
- `Mission:` must describe a complete scoped task, not one tiny keystroke.
- `Why this agent:` must explain ownership.
- `Action:` must say whether the agent should read-only patrol, implement, review, or report blocker.
- `Need Commander:` defaults to `No`.
- `Need Reviewer:` defaults to `No`.

Do not dispatch to "everyone". Do not provide only a branch name. Do not provide only a workstream name.

## Commander Escalation

Escalate to Commander only for:

- demand / product direction
- user-facing flow decisions
- visual direction
- commercial logic
- formal payment / escrow / listing fee
- real AI API / real upload / API key
- formal price / `PricingRule` / `BudgetEstimateLine.unit_price`
- formal Excel / PDF output
- destructive git operations, reset, clean, force push, or large deletion
- merge / reject final裁決 when automatic merge rules do not apply

Do not escalate IT workflow mechanics to Commander.

Deputy Codex handles:

- git / branch / PR / commit mechanics
- whether to re-request Codex review
- dirty worktree isolation
- staging scope
- workstream routing
- issue drafting
- technical blocker triage

## Reviewer Trigger

`Need Reviewer: No` by default.

Set `Need Reviewer: Yes` only for:

- Codex review `NEEDS_FIX`, P1, or P2
- changed files outside the allowed scope
- high-risk boundary touch
- routing / CTA / header review request
- data model review request
- formal price / formal output / payment / escrow / real AI API / upload boundary
- explicit user request

Reviewer chatrooms do not施工, do not rewrite product strategy, and do not create implementation PRs.

## Deputy Heartbeat

Deputy Codex heartbeat should patrol every 10 minutes when active.

It checks:

- `laibeoffer/laibe-mvp` open PRs
- `laibeoffer/laibe-mvp` open Issues
- main SHA
- `docs/WORKSTREAM_BLACKBOARD.md`
- `docs/CHATROOM_GITHUB_WORKSTREAMS.md`
- Codex review comments
- branch / PR existence claims
- `Need Commander: Yes`
- `Need Reviewer: Yes`

Deputy may automatically merge a PR only when all are true:

- Codex review reports PASS or no major issues.
- PR is mergeable / clean.
- Changed files are inside the allowed scope.
- No `Need Commander: Yes`.
- No high-risk boundary.
- No implementation file was touched by a governance-only task.

If a bot says it created a branch / PR but GitHub cannot find it, Deputy marks the chain as blocked and either fixes it directly if safe or creates a minimal follow-up Issue.

## Workstream Heartbeat

Each workstream chatroom needs its own heartbeat automation.

Each workstream patrol only checks:

- Issues where `To:` matches the agent / chatroom.
- Issues where `Workstream:` matches its registered workstream.
- PRs for that workstream.
- Its own section of `docs/WORKSTREAM_BLACKBOARD.md`.

If no new assignment exists, it reports:

```md
本 workstream 本輪無新指派。
```

Workstream heartbeat must not wake other chatrooms and must not patrol unrelated workstreams.

## Blackboard Minimum Rule

`docs/WORKSTREAM_BLACKBOARD.md` must preserve the dispatch rule summary:

- Issue = 派工單
- PR = 完工驗收單
- Blackboard = 戰情板
- Deputy heartbeat = 全局巡邏
- Workstream heartbeat = 只巡自己的 To / Workstream / PR / 黑板區塊
- Dispatch must include `To`, `Workstream`, `Branch / Repo`, `Mission`, `Why this agent`, `Action`, `Need Commander`, and `Need Reviewer`

## Safety Boundaries

Do not read, copy, or expose secrets.

Do not touch `.env`, API keys, tokens, credentials, payment, escrow, listing fee, real AI API, upload backend, formal price, or formal Excel/PDF unless explicitly authorized.

Do not modify `plancraft` core from `laibe-mvp` workstreams.
