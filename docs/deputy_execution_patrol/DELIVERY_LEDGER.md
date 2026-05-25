# DELIVERY_LEDGER.md

Purpose:
Single delivery ledger for Deputy Codex-2, Executive Officer, and Triage Officer. This file tracks who has an Issue, branch, PR, validation result, stale state, and stalled cycles.

Operating rules:
- GitHub Issue is the dispatch / order.
- GitHub branch is the work lane.
- GitHub PR is the delivery artifact.
- `docs/WORKSTREAM_BLACKBOARD.md` is the battle board.
- This ledger is the shared delivery tracker; update it when status changes, not only in chat.
- Executive Officer owns owner chase, missing evidence collection, and workstream callouts.
- Deputy Codex-2 owns GitHub / branch / worktree state reconciliation and may decide LOW / MEDIUM technical workflow recovery.
- Triage Officer owns queue sorting, lag classification, and routing suggestions.
- Deputy Codex owns final command decisions, high-risk escalation, merge / reject / close decisions, and Commander-facing synthesis.

Allowed Deputy Codex-2 decisions:
- LOW: stale blackboard correction, missing report format, missing Issue / PR link, missing validation evidence.
- MEDIUM: branch / PR workflow repair, latest-main sync request, repeated missing claim, PR URL recovery, validation rerun request.

Deputy Codex-2 must escalate:
- HIGH: Codex P1 / P2 / NEEDS_FIX, changed files outside allowed scope, repeated table-compliance failure, cross-workstream scope drift.
- CRITICAL: formal price, formal Excel / PDF, payment / escrow / listing fee, real AI API / upload / API key, destructive git, large deletion, product direction, visual direction, business logic.

Stall counters:
- 0: effective artifact found this cycle.
- 1: one patrol without effective artifact.
- 2: two patrols without effective artifact; Executive Officer must call out exact owner.
- 3: Deputy Codex-2 workflow repair or reassignment package required.
- 4+: Deputy Codex decision required.

Effective artifact examples:
- Issue claim.
- Branch name and branch SHA.
- PR URL.
- Validation command and result.
- Exact blocker plus attempted fix.
- Backfill result: `MISSED_PROGRESS_FOUND`, `LOCAL_STATE_STALE`, `BACKFILL_ACTION`.

## Delivery Table

| Workstream | Issue / PR | Primary Owner | Branch | Branch SHA | PR URL | Current State | Last Effective Artifact | Validation / Checks | Missed Cycles | Current Handler | Next Required Action | Escalation Level | Need Commander | Need Reviewer |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Plan Puzzle | Issue #15 / PR #25 | Plan Puzzle Builder | `plancraft/zone-area-boundary-refinement` | `ffbe8e1` | `https://github.com/laibeoffer/laibe-mvp/pull/25` | `PR_VERIFICATION_REQUIRED` | PR #25 found after prior stall; no merge ref observed; branch not based on latest main during patrol. | Verify changed files, latest-main sync, `node --check`, guard checks, and mergeability signal. | 0 | Executive Officer + Deputy Codex-2 | Verify PR #25 readiness and decide whether owner must re-sync or repair branch workflow. | MEDIUM | No | No unless scope drift or Codex review reports NEEDS_FIX / P1 / P2 |
| Raw Candidate | Issue #17 / PR #26 | Raw Candidate Builder | `warehouse/raw-source-quality-scoring` | `7853fe7` | `https://github.com/laibeoffer/laibe-mvp/pull/26` | `PR_VERIFICATION_REQUIRED` | PR #26 found after prior stall; merge ref observed. | Verify candidate-only scope, forbidden formal-pricing fields, validation output, and changed files. | 0 | Executive Officer + Deputy Codex-2 | Confirm validation / scope evidence and whether Reviewer is needed. | MEDIUM | No | No unless scope drift, formal price risk, or Codex review reports NEEDS_FIX / P1 / P2 |
| MethodSpec | Issue #16 / PR #22 | MethodSpec Builder | `warehouse/method-spec-validator-freeze-note` | `e338431` | `https://github.com/laibeoffer/laibe-mvp/pull/22` | `PR_VERIFICATION_REQUIRED` | PR #22 branch update and merge ref observed. | Verify conflict state, allowed docs scope, checks, and owner response. | 0 | Executive Officer + Deputy Codex-2 | Confirm whether PR #22 is now mergeable or still needs workflow repair. | MEDIUM | No | No unless Codex review reports NEEDS_FIX / P1 / P2 |
| Output Documents | Issue #18 / PR #23 | Output Documents Builder | `output/renderer-static-guard-review-packet` | `cb276cb` | `https://github.com/laibeoffer/laibe-mvp/pull/23` | `REVIEW_GATE_HOLD` | PR #23 branch update and merge ref observed; previous Codex P2 must be re-reviewed clean. | Verify changed files, renderer static guard/import denylist, checks, and Codex review status. | 0 | Executive Officer + Reviewer | Keep hold until Codex P2 is fixed and re-reviewed clean. | HIGH | No | Yes |
| Visual Simulation | Issue #19 / PR #24 | Visual Simulation | `visual/simulation-governance` | Completed / historical branch `2e7d2c` | `https://github.com/laibeoffer/laibe-mvp/pull/24` | `COMPLETED_WAITING_NEXT_SCOPED_TASK` | Issue #19 closed by merged PR #24. | No real image API / upload; only governance / brief / prompt tasks may continue. | 0 | Deputy watch | Do not restart #19; draft next safe governance / brief task only when assigned. | LOW | No | No |
| Quote Factory | External Issue #1 / PR #2 | Quote Factory Builder | `qf/qf5-3-audit-override-publish` | branch `eaa399`; main `d075c5` | `https://github.com/laibeoffer/laibe-quote-factory/pull/2` | `COMPLETED_WAITING_QF5_4_DISPATCH` | QF5.3 PR #2 merged; Issue #1 closed; local blackboard should not say PR pending. | QF5.3 validation already reported; do not start QF5.4 without formal dispatch. | 0 | Deputy watch | Only state reconciliation or QF5.4 formal dispatch may reopen work. | LOW | No | No |
| Site Builder | None | Site Builder | None | N/A | N/A | `TASK_PREVIEW_MISSING` | No current Commander page / CTA / routing / visual-flow dispatch. | N/A | 0 | Deputy / Commander | Requires exact page, CTA, routing, or flow instruction before work. | LOW | Yes if Commander wants new site task | No |
| LOGO / Brand Visual | None | Brand Visual | None | N/A | N/A | `TASK_PREVIEW_MISSING` | No current Commander visual direction dispatch. | N/A | 0 | Deputy / Commander | Requires exact visual direction before work. | LOW | Yes if Commander wants brand task | No |

## Current Patrol Notes

- `PR_VERIFICATION_REQUIRED` is not standby. Executive Officer must obtain evidence.
- `REVIEW_GATE_HOLD` is not idle. Reviewer / Codex review state must be resolved before merge consideration.
- `COMPLETED_WAITING_NEXT_SCOPED_TASK` is valid only after Issue / PR / merge / blackboard state reconciliation is complete.
- `TASK_PREVIEW_MISSING` is valid only when no active Issue, PR, task preview, stale branch, or Commander instruction exists.
