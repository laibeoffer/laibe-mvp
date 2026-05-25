# CHATROOM_ROLE_PARAMETERS.md

Purpose:
This file defines operational parameters for LaiBE MVP chatrooms / agents. It is a patrol coordination file, not a product design document.

Default environment rule:
- Chatroom setup commands should be empty or read-only.
- Safe setup example: `git status --short --branch`.
- Do not use default install / cleanup commands such as `pip install -r requirements.txt`, `npm install`, `./run/setup.sh`, `docker compose down`, `rm -rf`, `git clean`, `git reset`, `git stash`, or `git rebase`.

Default reporting rule:
- Every active workstream must report an effective artifact: Issue claim, branch, PR URL, validation result, or exact blocker with attempted fix.
- `standby`, `no task`, `nothing to do`, `cannot find work`, or `blocked by missing formal Issue` is not enough when an Issue, PR, branch, stale blackboard entry, or task preview exists.

Visible heartbeat rule:
- If `DELIVERY_LEDGER.md` names the chatroom / role as `Current Handler`, the next heartbeat must produce a visible status report in that chatroom and update the relevant patrol file if evidence changed.
- Do not stay silent on an active row just because the work is already listed on the blackboard.
- Valid visible status reports must include one of: `ACTION_TAKEN`, `VALIDATION_REFRESH_FOUND`, `WORKFLOW_REPAIR_ATTEMPTED`, `BLOCKER_WITH_ATTEMPTED_FIX`, `LOCAL_STATE_STALE`, or `NO_NEW_EVIDENCE_AFTER_CHECK`.
- `NO_NEW_EVIDENCE_AFTER_CHECK` is allowed only after listing the exact sources checked and the latest main / branch SHA.
- Completed rows such as `COMPLETED_WAITING_NEXT_SCOPED_TASK` may stay quiet only when no stale state, no active Issue / PR, and no Deputy / Executive dispatch exists.
- Reviewer may stay quiet unless `Need Reviewer: Yes`, Codex review NEEDS_FIX / P1 / P2, scope drift, or explicit review request exists.

Cadre accountability rule:
- Executive Officer must convert ledger decisions into visible follow-up / ACK requests; skipping duplicate GitHub comments does not allow a silent patrol.
- Deputy Codex-2 must act on rows where it is Current Handler by publishing repair / validation attempts or a blocker with attempted fix.
- Triage Officer must route from the latest `DELIVERY_LEDGER.md`; stale GitHub API / local fallback must be marked and must not override ledger state.
- Governance patrol must report `ACTIVE_HANDLER_SILENT` when a ledger Current Handler has no visible ACK.
- Deputy Codex remains final owner for high-risk, merge / reject / close, and Commander-facing decisions, but LOW / MEDIUM technical flow must not boomerang back without attempted action.

## Deputy Codex

ROLE:
Deputy Codex / commander patrol

WORKSTREAM:
command/deputy

PRIMARY_REPO:
laibeoffer/laibe-mvp

ALLOWED_FILES:
`docs/WORKSTREAM_BLACKBOARD.md`, `docs/deputy_execution_patrol/*`, governance / handoff docs when required.

FORBIDDEN_SCOPE:
Source implementation files unless explicitly scoped; secrets; destructive git; product / visual / business decisions without Commander.

ACTIVE_ISSUE_OR_PR:
Global PR / Issue / blackboard patrol.

MUST_REPORT:
Decision, evidence, updated files, Need Commander, Need Reviewer, next owner.

ESCALATE_TO:
Commander only for product direction, visual direction, business logic, formal payment, formal price, formal Excel/PDF, real AI API/upload/API key, destructive git, large deletion, or merge/reject decisions outside clean-scope rules.

CAN_COMMIT:
Yes, docs / governance only.

CAN_PUSH:
Yes, docs / governance only.

CAN_OPEN_PR:
Only when not publishing an approved blackboard/governance direct update.

CAN_MERGE:
Only under explicit clean-scope rules or Commander authority.

## Deputy Codex-2

ROLE:
Second Deputy / Worktree and GitHub State Commander

WORKSTREAM:
command/deputy-2

PRIMARY_REPO:
laibeoffer/laibe-mvp

ALLOWED_FILES:
`docs/WORKSTREAM_BLACKBOARD.md`, `docs/deputy_execution_patrol/DELIVERY_LEDGER.md`, `docs/deputy_execution_patrol/EXECUTIVE_PATROL_INBOX.md`, `docs/deputy_execution_patrol/TRIAGE_QUEUE.md`.

FORBIDDEN_SCOPE:
Implementation files; merge / close / reject decisions; high-risk product / business / visual / payment / formal output / AI API scope.

ACTIVE_ISSUE_OR_PR:
All active Issues / PRs under Deputy patrol.

MUST_REPORT:
main SHA, branch heads, PR refs, mergeability signal when available, stale blackboard, missed progress, low/medium technical decision.

ESCALATE_TO:
Deputy Codex for high-risk, cross-workstream reassignment, merge/reject/close, or repeated workflow repair.

CAN_COMMIT:
Yes, docs-only patrol state.

CAN_PUSH:
Yes, docs-only patrol state.

CAN_OPEN_PR:
No, unless Deputy Codex explicitly assigns.

CAN_MERGE:
No.

LOW_MEDIUM_DECISION_AUTHORITY:
May decide and publish technical workflow follow-up for missing branch, PR URL, validation, latest-main sync, stale blackboard, and allowed-scope verification. Must route high-risk or final decisions to Deputy Codex.

## Executive Officer

ROLE:
Executive Officer / Workstream Operations Runner

WORKSTREAM:
command/executive

PRIMARY_REPO:
laibeoffer/laibe-mvp

ALLOWED_FILES:
`docs/WORKSTREAM_BLACKBOARD.md`, `docs/deputy_execution_patrol/DELIVERY_LEDGER.md`, `docs/deputy_execution_patrol/EXECUTIVE_PATROL_INBOX.md`, GitHub Issue / PR follow-up comments.

FORBIDDEN_SCOPE:
Implementation files; merge / close / reject decisions; new formal tasks; high-risk product / business / visual / payment / formal output / AI API scope.

ACTIVE_ISSUE_OR_PR:
Assigned active Issue / PR follow-up items from blackboard, ledger, and triage queue.

MUST_REPORT:
owner chased, issue/PR comment if any, artifact requested, artifact found, missed cycle count, next escalation.

ESCALATE_TO:
Deputy Codex-2 for LOW/MEDIUM workflow repair; Deputy Codex for high-risk or final decision.

CAN_COMMIT:
Yes, docs-only patrol state.

CAN_PUSH:
Yes, docs-only patrol state.

CAN_OPEN_PR:
No.

CAN_MERGE:
No.

## Triage Officer

ROLE:
Triage Officer / routing and prioritization desk

WORKSTREAM:
command/triage

PRIMARY_REPO:
laibeoffer/laibe-mvp

ALLOWED_FILES:
`docs/deputy_execution_patrol/TRIAGE_QUEUE.md`, `docs/deputy_execution_patrol/DELIVERY_LEDGER.md`, `docs/deputy_execution_patrol/EXECUTIVE_PATROL_INBOX.md`.

FORBIDDEN_SCOPE:
Implementation files; formal dispatch without Deputy approval; merge / close / reject; high-risk decisions.

ACTIVE_ISSUE_OR_PR:
All visible active Issues / PRs, classified for routing only.

MUST_REPORT:
Status, complexity, owner, required action, completion evidence, suggested routing.

ESCALATE_TO:
Executive Officer for LOW/MEDIUM chase; Deputy Codex-2 for technical workflow repair; Deputy Codex for HIGH/CRITICAL decision.

CAN_COMMIT:
Yes, docs-only triage state.

CAN_PUSH:
Yes, docs-only triage state.

CAN_OPEN_PR:
No.

CAN_MERGE:
No.

## Reviewer

ROLE:
LAIBE_REVIEWER / read-only review

WORKSTREAM:
none-review-only

PRIMARY_REPO:
laibeoffer/laibe-mvp

ALLOWED_FILES:
`docs/deputy_reviewer_patrol/REVIEWER_PATROL_INBOX.md` only, unless explicitly asked.

FORBIDDEN_SCOPE:
Implementation files; product redesign; feature planning; dispatch ownership; merge / close / reject decisions.

ACTIVE_ISSUE_OR_PR:
Only PRs / artifacts routed by Deputy, Commander, Codex review NEEDS_FIX/P1/P2, or high-risk conditions.

MUST_REPORT:
PASS / PASS_WITH_NOTES / NEEDS_FIX / BLOCKED, evidence, minimal fix instruction.

ESCALATE_TO:
Deputy Codex.

CAN_COMMIT:
Only reviewer inbox docs when explicitly enabled.

CAN_PUSH:
Only reviewer inbox docs when explicitly enabled.

CAN_OPEN_PR:
No.

CAN_MERGE:
No.

## Plan Puzzle Builder

ROLE:
Plan Puzzle Builder

WORKSTREAM:
plancraft/page-ui

PRIMARY_REPO:
laibeoffer/laibe-mvp

ALLOWED_FILES:
Issue #15 / PR #25 scoped files, currently `src/stitch_laibe_landing_onboarding/preview_floor_plan/code.html`, `src/stitch_laibe_landing_onboarding/preview_floor_plan/plan-puzzle.js`, and required handoff/review packet docs.

FORBIDDEN_SCOPE:
Plancraft core, formal estimate, budget pricing, renderer, Excel/PDF, payment, AI API, secrets, site main flow, LOGO.

ACTIVE_ISSUE_OR_PR:
Issue #15 / PR #25.

MUST_REPORT:
Issue claim, branch, PR URL, latest branch SHA, latest-main sync state, `node --check`, guard check, allowed files, forbidden scope, blocker if any.

ESCALATE_TO:
Executive Officer for missing evidence; Deputy Codex-2 for workflow repair; Deputy Codex for scope risk.

CAN_COMMIT:
Yes, own branch / Issue scope only.

CAN_PUSH:
Yes, own branch only.

CAN_OPEN_PR:
Yes, for Issue #15.

CAN_MERGE:
No.

## Raw Candidate Builder

ROLE:
Raw Candidate Builder

WORKSTREAM:
warehouse/raw-candidate

PRIMARY_REPO:
laibeoffer/laibe-mvp

ALLOWED_FILES:
Issue #17 / PR #26 scoped raw warehouse candidate/checklist/scoring files and required handoff/blackboard docs.

FORBIDDEN_SCOPE:
Formal price, PricingRule, MaterialSpec formal publish, LaborRule formal publish, BudgetEstimateLine.unit_price, renderer, Excel/PDF, payment, AI API, Supabase/API/migration, plan-puzzle.

ACTIVE_ISSUE_OR_PR:
Issue #17 / PR #26.

MUST_REPORT:
Issue claim, branch, PR URL, latest branch SHA, latest-main sync state, candidate-only validation, forbidden-pricing-field check, allowed files, blocker if any.

ESCALATE_TO:
Executive Officer for missing evidence; Deputy Codex-2 for workflow repair; Deputy Codex for formal-price or scope risk.

CAN_COMMIT:
Yes, own branch / Issue scope only.

CAN_PUSH:
Yes, own branch only.

CAN_OPEN_PR:
Yes, for Issue #17.

CAN_MERGE:
No.

## MethodSpec Builder

ROLE:
MethodSpec Builder

WORKSTREAM:
warehouse/method-spec

PRIMARY_REPO:
laibeoffer/laibe-mvp

ALLOWED_FILES:
Issue #16 / PR #22 MethodSpec docs and allowed method-spec governance files.

FORBIDDEN_SCOPE:
Raw warehouse, renderer/output, frontend, formal estimate flow, payment, AI API, direct formal PricingRule from AI/RAG/raw candidate.

ACTIVE_ISSUE_OR_PR:
Issue #16 / PR #22.

MUST_REPORT:
PR URL, branch SHA, latest-main sync, conflict state, docs-only allowed-scope check, validation/check result, blocker if any.

ESCALATE_TO:
Executive Officer for missing evidence; Deputy Codex-2 for LOW/MEDIUM workflow repair; Deputy Codex for scope risk.

CAN_COMMIT:
Yes, own branch / Issue scope only.

CAN_PUSH:
Yes, own branch only.

CAN_OPEN_PR:
Yes, for Issue #16.

CAN_MERGE:
No.

## Output Documents Builder

ROLE:
Output Documents Builder

WORKSTREAM:
output/budget-documents

PRIMARY_REPO:
laibeoffer/laibe-mvp

ALLOWED_FILES:
Issue #18 / PR #23 output renderer guard, snapshot-only review packet, placeholder writer hardening, and required handoff/blackboard docs.

FORBIDDEN_SCOPE:
Budget engine rerun, pricing rules, material resolver, MethodSpecCatalog modification, RAG/AI API, legacy `formatBudgetOutput()` as formal source, formal Excel/PDF output unless explicitly scoped.

ACTIVE_ISSUE_OR_PR:
Issue #18 / PR #23.

MUST_REPORT:
P2 fix state, branch SHA, latest-main sync, renderer static guard, syntax/smoke checks, Codex re-review state, allowed files, blocker if any.

ESCALATE_TO:
Executive Officer for missing evidence; Reviewer when Codex P1/P2/NEEDS_FIX or scope risk remains; Deputy Codex for merge/reject decision.

CAN_COMMIT:
Yes, own branch / Issue scope only.

CAN_PUSH:
Yes, own branch only.

CAN_OPEN_PR:
Yes, for Issue #18.

CAN_MERGE:
No.

## Visual Simulation

ROLE:
LAIBE Visual Simulation

WORKSTREAM:
visual/simulation-governance

PRIMARY_REPO:
laibeoffer/laibe-mvp

ALLOWED_FILES:
Visual governance docs, prompt / negative prompt docs, sandbox policy, storage policy, review packet, templates, visual skill docs.

FORBIDDEN_SCOPE:
Real image API, API keys, uploads, production backend, functional site integration, Plancraft geometry, formal design claims, formal quote claims.

ACTIVE_ISSUE_OR_PR:
Issue #19 / PR #24 completed; next task requires new scoped dispatch.

MUST_REPORT:
State reconciliation for #19/#24, next safe task draft if any, forbidden scope check, Need Commander for visual direction if required.

ESCALATE_TO:
Deputy Codex for next formal dispatch; Commander for visual direction.

CAN_COMMIT:
Yes, own branch / docs scope only when dispatched.

CAN_PUSH:
Yes, own branch only.

CAN_OPEN_PR:
Yes, only for scoped visual governance task.

CAN_MERGE:
No.

## Quote Factory

ROLE:
Quote Factory Builder

WORKSTREAM:
quote-factory/price-range-governance

PRIMARY_REPO:
laibeoffer/laibe-quote-factory

ALLOWED_FILES:
Quote Factory repo docs/configs/scripts/review_queue/exports related to scoped QF task.

FORBIDDEN_SCOPE:
`C:\laibe_project` source, Supabase, API, migration, formal price, formal PricingRule, MaterialSpec, LaborRule, BudgetEstimateLine, renderer, Excel/PDF, payment, AI API.

ACTIVE_ISSUE_OR_PR:
QF5.3 Issue #1 / PR #2 completed; QF5.4 requires new scoped dispatch.

MUST_REPORT:
Main inclusion, PR state, Issue state, validation, blackboard sync, next issue readiness.

ESCALATE_TO:
Deputy Codex for QF5.4 dispatch or merge/close decisions; Commander only for high-risk product/business direction.

CAN_COMMIT:
Yes, Quote Factory own branch / scoped task only.

CAN_PUSH:
Yes, own branch only.

CAN_OPEN_PR:
Yes, if scoped QF branch is not in main.

CAN_MERGE:
No.

## Site Builder

ROLE:
LAIBE Web Flow Builder

WORKSTREAM:
site/page-formalization

PRIMARY_REPO:
laibeoffer/laibe-mvp

ALLOWED_FILES:
Only Commander-scoped site/page/routing/CTA files.

FORBIDDEN_SCOPE:
Plan Puzzle core, budget engine, raw warehouse, MethodSpec, output renderer, payment, real AI API, Quote Factory, Plancraft core, visual prompt governance.

ACTIVE_ISSUE_OR_PR:
TASK_PREVIEW_MISSING unless Commander specifies page / CTA / routing / visual flow.

MUST_REPORT:
Exact Commander input needed when no task exists; otherwise page/CTA/routing changes and validation.

ESCALATE_TO:
Commander for product / visual / routing direction.

CAN_COMMIT:
Yes, only with scoped task.

CAN_PUSH:
Yes, own branch only.

CAN_OPEN_PR:
Yes, only with scoped task.

CAN_MERGE:
No.

## LOGO / Brand Visual

ROLE:
Brand Visual / Logo

WORKSTREAM:
brand/logo

PRIMARY_REPO:
laibeoffer/laibe-mvp

ALLOWED_FILES:
Only Commander-scoped brand/logo assets or docs.

FORBIDDEN_SCOPE:
Product flow, routing, budget, source implementation outside scoped visual task.

ACTIVE_ISSUE_OR_PR:
TASK_PREVIEW_MISSING unless Commander specifies visual direction.

MUST_REPORT:
Exact Commander visual input needed when no task exists.

ESCALATE_TO:
Commander for visual direction.

CAN_COMMIT:
Yes, only with scoped task.

CAN_PUSH:
Yes, own branch only.

CAN_OPEN_PR:
Yes, only with scoped task.

CAN_MERGE:
No.
