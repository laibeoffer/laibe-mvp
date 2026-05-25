# TRIAGE_QUEUE.md

This file is the dedicated queue for the LaiBE MVP Triage Officer.

Triage Officer is a patrol support role for Deputy Codex and Executive Officer. It does not replace Deputy Codex, does not make Commander decisions, and does not merge / close / dispatch formal work without Deputy approval.

## Queue Rules

- Read `docs/WORKSTREAM_BLACKBOARD.md`, GitHub open Issues / PRs, `docs/deputy_execution_patrol/EXECUTIVE_PATROL_INBOX.md`, and the latest workstream reports before appending triage.
- Classify workstreams by status: `ON_TRACK`, `LAGGING_ONE_CYCLE`, `LAGGING_TWO_CYCLES`, `BLOCKED_BY_REAL_SCOPE`, `NEEDS_EXECUTIVE_CHASE`, `NEEDS_DEPUTY_DECISION`, `NEEDS_REVIEWER`, or `NEEDS_COMMANDER`.
- Classify complexity: `LOW`, `MEDIUM`, `HIGH`, or `CRITICAL`.
- Write short operational entries only. Do not paste long task bodies.
- Do not edit source code, merge PRs, close Issues, open new formal tasks, or touch secrets.

## Entry Format

```md
### YYYY-MM-DDTHH:mm:ssZ - [TRIAGE_CODE] - [Workstream]

Status:

Complexity:

Target:

Evidence:

Recommended Executive Action:

Recommended Deputy Action:

Need Commander:

Need Reviewer:
```

## Open Triage Items

### 2026-05-25T04:23:16Z - [PR_VERIFICATION_REQUIRED] - Plan Puzzle

Status:
NEEDS_EXECUTIVE_CHASE

Complexity:
MEDIUM

Target:
`laibeoffer/laibe-mvp` Issue #15 / PR #25 / `plancraft/page-ui`

Evidence:
Branch `plancraft/zone-area-boundary-refinement` now exists at `ffbe8e1e72a1af1df0c7fce1397bd3ff91f615b7` and maps to PR #25. Changed files are Plan Puzzle UI plus handoff/review packet docs. Branch is not based on latest main, and `refs/pull/25/merge` was not found during Deputy patrol.

Recommended Executive Action:
Stop classifying this as no-branch stall. Verify PR #25 mergeability, latest-main sync need, allowed files, `node --check`, guard checks, and Codex review readiness.

Recommended Deputy Action:
Keep as technical PR verification / sync follow-up. No Commander escalation unless the PR changes product direction, formal estimate boundary, payment, AI API, or forbidden files.

Need Commander:
No

Need Reviewer:
No unless scope drift or Codex review reports NEEDS_FIX / P1 / P2.

### 2026-05-25T04:23:16Z - [PR_VERIFICATION_REQUIRED] - Raw Candidate

Status:
NEEDS_EXECUTIVE_CHASE

Complexity:
MEDIUM

Target:
`laibeoffer/laibe-mvp` Issue #17 / PR #26 / `warehouse/raw-candidate`

Evidence:
Branch `warehouse/raw-source-quality-scoring` now exists at `7853fe7d15c4ad28a5ac47bc18348e7277eb9bf3` and maps to PR #26. Changed files are raw-warehouse scoring/checklist scope plus handoff/blackboard docs. `refs/pull/26/merge` exists, but candidate-only validation and forbidden formal-pricing checks still need verification.

Recommended Executive Action:
Stop classifying this as no-branch stall. Verify PR #26 validation command output, candidate-only boundary, forbidden formal-price / PricingRule / BudgetEstimateLine fields, changed files, and Codex review readiness.

Recommended Deputy Action:
Keep as technical PR verification follow-up. No Commander escalation unless formal price / formal catalog / renderer / payment / API boundary appears.

Need Commander:
No

Need Reviewer:
No unless scope drift, formal pricing risk, or Codex review reports NEEDS_FIX / P1 / P2.

### 2026-05-24T20:43:51Z - [LAGGING_TWO_CYCLES] - Plan Puzzle

Status:
NEEDS_EXECUTIVE_CHASE

Complexity:
MEDIUM

Target:
`laibeoffer/laibe-mvp` Issue #15 / `plancraft/page-ui` / `plancraft/adapter-clean`

Evidence:
No `plancraft/zone-area-boundary-refinement` branch, PR URL, issue claim, validation result, `node --check` result, guard check, or exact blocker found after repeated Deputy and Executive patrols.

Recommended Executive Action:
Keep chasing Issue #15 and the Plan Puzzle chatroom. Require PR URL, issue claim, validation result, or exact blocker with attempted resolution. Do not accept `standby`, `no task`, or `blocked by missing formal Issue`.

Recommended Deputy Action:
No Commander escalation yet. Keep this as technical execution follow-up unless a high-risk scope or repeated table-compliance failure appears again.

Need Commander:
No

Need Reviewer:
No

### 2026-05-24T20:43:51Z - [LAGGING_TWO_CYCLES] - Raw Candidate

Status:
NEEDS_EXECUTIVE_CHASE

Complexity:
MEDIUM

Target:
`laibeoffer/laibe-mvp` Issue #17 / `warehouse/raw-candidate`

Evidence:
No `warehouse/raw-source-quality-scoring` branch, PR URL, issue claim, candidate-only validation result, forbidden-pricing-field check, or exact blocker found after repeated Deputy and Executive patrols.

Recommended Executive Action:
Keep chasing Issue #17 and the Raw Candidate chatroom. Require PR URL, issue claim, candidate-only validation result, forbidden-pricing-field check, or exact blocker with attempted resolution. Do not accept `standby`, `no task`, or `blocked by missing formal Issue`.

Recommended Deputy Action:
No Commander escalation yet. Keep this as technical execution follow-up unless formal pricing boundary risk appears.

Need Commander:
No

Need Reviewer:
No

### 2026-05-24T20:43:51Z - [RESOLVED_BY_DEPUTY] - Quote Factory

Status:
ON_TRACK

Complexity:
LOW

Target:
`laibeoffer/laibe-quote-factory` Issue #1 / PR #2 / `quote-factory/price-range-governance`

Evidence:
PR #2 was reviewed by Codex with no major issues and merged by Deputy Codex. Issue #1 is closed. Merge commit: `d075c505d0e950ca288e8d374bdf2efc6b447105`.

Recommended Executive Action:
Stop chasing QF5.3 / Issue #1. Watch only for a new QF5.4 formal issue / dispatch.

Recommended Deputy Action:
No further QF5.3 action. If QF5.4 is started later, keep it candidate-only and external-repo scoped.

Need Commander:
No

Need Reviewer:
No

### 2026-05-24T20:43:51Z - [P2_BLOCKED] - Output Documents

Status:
NEEDS_EXECUTIVE_CHASE

Complexity:
HIGH

Target:
`laibeoffer/laibe-mvp` PR #23 / Issue #18 / `output/budget-documents`

Evidence:
PR #23 remains open with Codex P2 on renderer / format mismatch fail-closed handling. Changed files are in Output Documents renderer scope, but merge is blocked until the P2 is fixed and re-reviewed.

Recommended Executive Action:
Keep chasing PR #23 for fix, latest-main re-sync, renderer static guard / syntax / smoke checks, and Codex re-review.

Recommended Deputy Action:
Do not merge PR #23 until P2 is fixed and Codex re-review is clean.

Need Commander:
No

Need Reviewer:
Yes

## Processed Triage Items

No processed triage items yet.
