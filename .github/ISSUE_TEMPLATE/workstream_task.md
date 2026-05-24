---
name: Workstream task
description: Scoped LaiBE workstream task for Deputy Codex dispatch
title: "[Workstream] "
labels: ["workstream"]
body:
---

## To

Agent / chatroom name:

## Workstream

Example: `governance/codex-rules`, `site/page-formalization`, `warehouse/raw-candidate`, `output/budget-documents`.

## Repo / Branch

Repo:
Branch:

## Target files

Allowed files or folders:

## Mission

What should be completed in this task?

## Why this agent

Why this workstream / agent owns the task:

## Allowed changes

- 

## Forbidden scope

- Do not modify files outside the target scope.
- Do not modify implementation files unless explicitly listed in Target files.
- Do not touch payment, escrow, listing fee, real AI API, upload backend, secrets, `.env`, or production credentials.
- Do not modify Plancraft core unless explicitly authorized.
- Do not create new framework, package manager setup, `package.json`, or `node_modules` unless explicitly authorized.

## Self-check

Before opening PR, confirm:

- Changed files are limited to allowed scope.
- No forbidden files or high-risk areas were touched.
- No secrets or credentials were read, copied, or exposed.
- Blackboard / handoff impact is clear.
- Need Commander is correctly marked.
- Need Reviewer is correctly marked.

## Git / PR instructions

- Branch:
- Commit message:
- PR title:
- PR description must include scope, changed files, and boundary check.

## Blackboard update

Should `docs/WORKSTREAM_BLACKBOARD.md` be updated?

- [ ] Yes
- [ ] No

If yes, describe the exact short status entry:

## Completion report format

- Modified files:
- Added files:
- Commit:
- PR URL:
- Scope check:
- Boundary check:
- Need Commander:
- Need Reviewer:

## Need Commander

Default: No

Set `Yes` only for product direction, user-facing flow decisions, visual direction, business logic, formal payment / escrow / listing fee, real AI API, formal pricing, formal Excel/PDF, or other high-risk final decisions.

Need Commander: No

## Need Reviewer

Default: No

Set `Yes` for Codex review NEEDS_FIX / P1 / P2, high-risk scope, routing / CTA / header review, data model review, or explicit user-requested review.

Need Reviewer: No
