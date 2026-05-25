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
| Plan Puzzle | Issue #15 / PR #25 | Plan Puzzle Builder | `plancraft/zone-area-boundary-refinement` | `ffbe8e1` | `https://github.com/laibeoffer/laibe-mvp/pull/25` | `DEPUTY2_WORKFLOW_REPAIR_ASSIGNED / NO_CURRENT_MERGE_REF` | PR #25 received repeated local-only Codex connector handoff comments `4531872891` / `4531949297`; reported local commits `33c4695` / `d8e2c4e` are not pushed to PR #25. Current Executive patrol on `origin/main` `2c26cd5` confirms no `refs/pull/25/merge` exists and `git merge-tree --write-tree origin/main refs/eopatrol/pr25-head` exits `128` (`refusing to merge unrelated histories`). | Prior `node --check` / guard checks were reported in PR comment `4531558124`; the local-only handoffs also report `node --check` pass, but final delivery evidence requires a pushed current-main repair and `refs/pull/25/merge` before Codex review. | 3 | Deputy Codex-2 | Deputy Codex-2 repair assignment remains active: resolve the current-main branch / handoff blocker inside Issue #15 scope, push an actual branch update, rerun `node --check src/stitch_laibe_landing_onboarding/preview_floor_plan/plan-puzzle.js` and guard checks, and request Codex review only after merge ref exists. Stop if scope drifts. | MEDIUM / DEPUTY_DECISION_MADE | No | No unless scope drift or Codex review reports NEEDS_FIX / P1 / P2 |
| Raw Candidate | Issue #17 / PR #26 | Raw Candidate Builder | `warehouse/raw-source-quality-scoring` | `7853fe7` | `https://github.com/laibeoffer/laibe-mvp/pull/26` | `DEPUTY_SIGNAL_DECISION_REQUIRED / CURRENT_MAIN_SIMULATION_PASS_MERGE_REF_STALE` | PR #26 previously had Executive validation `4531540239`, Codex clean result `4531555287`, and Deputy gate routing `4531573641`. Current Executive patrol on `origin/main` `2c26cd5` finds local `git merge-tree --write-tree origin/main refs/eopatrol/pr26-head` exits `0`, but the available `refs/pull/26/merge` still targets old base `0e8ab82` and no owner response was found after Executive call-out comment `4531941371`. | Prior candidate-only / forbidden formal-pricing checks are stale for final-gate purposes until current-main evidence is refreshed; Executive has current-main merge-tree evidence but not a fresh owner validation rerun. | 3 | Executive Officer + Deputy Codex | Deputy signal decision requested: either accept Executive current-main merge-tree evidence and route the final gate with stale owner-validation risk noted, or assign Raw Candidate owner / repair lane to rerun R1.5 validation and forbidden formal-pricing checks against current main. Request Codex re-review only if the PR head changes. | MEDIUM / PENDING_DEPUTY_DECISION | No | No unless new Codex review reports NEEDS_FIX / P1 / P2, formal-price risk, or scope drift |
| MethodSpec | Issue #16 / PR #22 | MethodSpec Builder | `warehouse/method-spec-validator-freeze-note` | `e338431` | `https://github.com/laibeoffer/laibe-mvp/pull/22` | `DEPUTY_SIGNAL_DECISION_REQUIRED / CURRENT_MAIN_SIMULATION_PASS_MERGE_REF_STALE` | PR #22 has clean Codex result `4531356014` and GitHub changed files remain limited to the Issue #16 docs-only set. Current Executive patrol on `origin/main` `2c26cd5` finds local `git merge-tree --write-tree origin/main refs/eopatrol/pr22-head` exits `0`, but GitHub metadata / merge-ref evidence is still not current-main final-gate clean and no owner response was found after Executive call-out comment `4531941286`. | Allowed docs-only scope remains `docs/budget/32-method-spec-validator-freeze-note.md`, `docs/NEXT_CODEX_HANDOFF.md`, and `docs/CURRENT_PHASE_REVIEW_PACKET.md`; no review threads exist, but fresh owner current-main confirmation is still missing. | 3 | Executive Officer + Deputy Codex | Deputy signal decision requested: either accept Executive current-main merge-tree plus allowed-files evidence and route final gate, or assign MethodSpec owner / repair lane to publish a fresh latest-main mergeability confirmation. Request Codex re-review only if the PR head changes. | MEDIUM / PENDING_DEPUTY_DECISION | No | No unless branch changes or Codex review reports NEEDS_FIX / P1 / P2 |
| Output Documents | Issue #18 / PR #23 | Output Documents Builder | `output/renderer-static-guard-review-packet` | `a75e380` | `https://github.com/laibeoffer/laibe-mvp/pull/23` | `DEPUTY2_WORKFLOW_REPAIR_ASSIGNED / CURRENT_MAIN_SYNC_BLOCKED` | PR #23 had clean Codex result `4531569296` on head `a75e380`, but current main advanced again. Current Executive patrol on `origin/main` `2c26cd5` finds local `git merge-tree --write-tree origin/main refs/eopatrol/pr23-head` exits `1` with a content conflict in `docs/WORKSTREAM_BLACKBOARD.md`; GitHub still reports no current merge commit. No owner response or branch update was found after Executive reassignment recommendation comment `4531941113`; the old P2 review thread is outdated with a fix reply, but the branch remains sync-blocked. | Prior checks are stale against latest main. Re-sync latest `origin/main`, rerun renderer static guard / syntax / mismatch / fixture / invalid fixture / `.xlsx/.pdf` diff / `git diff --check`, and request Codex re-review if the head changes. | 4 | Deputy Codex-2 | Deputy Codex-2 repair assignment remains active: re-sync PR #23 against current main, preserve fail-closed P2 fix and patrol docs, resolve only PR #23 / Output Documents conflicts, rerun checks, and request Codex re-review if head changes. | MEDIUM / DEPUTY_DECISION_MADE | No | No unless new Codex review reports NEEDS_FIX / P1 / P2 or scope drifts |
| Visual Simulation | Issue #19 / PR #24 | Visual Simulation | `visual/simulation-governance` | Completed / historical branch `2e7d2c` | `https://github.com/laibeoffer/laibe-mvp/pull/24` | `COMPLETED_WAITING_NEXT_SCOPED_TASK` | Issue #19 closed by merged PR #24. | No real image API / upload; only governance / brief / prompt tasks may continue. | 0 | Deputy watch | Do not restart #19; draft next safe governance / brief task only when assigned. | LOW | No | No |
| Quote Factory | External Issue #1 / PR #2 | Quote Factory Builder | `qf/qf5-3-audit-override-publish` | branch `eaa399`; main `d075c5` | `https://github.com/laibeoffer/laibe-quote-factory/pull/2` | `COMPLETED_WAITING_QF5_4_DISPATCH` | QF5.3 PR #2 merged; Issue #1 closed; local blackboard should not say PR pending. | QF5.3 validation already reported; do not start QF5.4 without formal dispatch. | 0 | Deputy watch | Only state reconciliation or QF5.4 formal dispatch may reopen work. | LOW | No | No |
| Site Builder | None | Site Builder | None | N/A | N/A | `TASK_PREVIEW_MISSING` | No current Commander page / CTA / routing / visual-flow dispatch. | N/A | 0 | Deputy / Commander | Requires exact page, CTA, routing, or flow instruction before work. | LOW | Yes if Commander wants new site task | No |
| LOGO / Brand Visual | None | Brand Visual | None | N/A | N/A | `TASK_PREVIEW_MISSING` | No current Commander visual direction dispatch. | N/A | 0 | Deputy / Commander | Requires exact visual direction before work. | LOW | Yes if Commander wants brand task | No |

## Current Patrol Notes

- `FINAL_GATE_READY` means Deputy Codex owns merge / reject; Executive Officer should not keep ordinary chase active unless branch state changes.
- `SYNC_BLOCKED` is not standby. Executive Officer must obtain a true latest-main sync and merge ref before Codex review.
- `DEPUTY_SIGNAL_DECISION_REQUIRED` means Executive has enough current-main patrol evidence to stop ordinary chase, but Deputy must decide whether that evidence is sufficient for gate routing or whether a repair owner must refresh the branch / validation report.
- `COMPLETED_WAITING_NEXT_SCOPED_TASK` is valid only after Issue / PR / merge / blackboard state reconciliation is complete.
- `TASK_PREVIEW_MISSING` is valid only when no active Issue, PR, task preview, stale branch, or Commander instruction exists.
