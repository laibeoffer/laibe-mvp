# LaiBE MVP Workstream Blackboard

Last updated: 2026-06-01 Asia/Taipei

This file is the compact GitHub blackboard for current LaiBE MVP coordination. It is not a patrol log archive.

## Current Operating Rules

- Source of truth: GitHub `main` plus current open PR / Issue state.
- Shared work path: GitHub is mandatory for all agents. Local worktrees are private staging only and are not shared truth.
- Agents with local-only work must sync to GitHub through a scoped branch + PR, or report exact local branch/files/diff evidence in the relevant GitHub Issue / PR if push is blocked.
- Do not make decisions from unsynced local work. If local state conflicts with GitHub, treat GitHub as authoritative and mark the local state stale until reconciled.
- 0% standby agents are not blockers.
- Every dispatch must have exactly one primary `To`.
- Commander owns routine GitHub landing / merge decisions for scope-clean PRs.
- Product direction, formal payment/auth/webhook/AI API, formal pricing, formal Excel/PDF, production secrets, and material business decisions still require user decision.
- Do not modify payment, auth, webhook, `.env`, secrets, production AI API, real DB, or production payment flows.
- Budget Knowledge Vault Agent is managed by `LAIBE_REVIEWER_INTEGRATION_OFFICER` / `LAIBE_PATROL_INTEGRATION_OFFICER`, not by Commander.

## Completion Rules

GitHub Merge Gate and Functional Acceptance Gate are separate.

`MERGED_TO_MAIN` means only that a PR landed safely. It does not automatically mean `FUNCTIONAL_ACCEPTED`, `INTEGRATION_READY_100`, or `TASK_COMPLETE_100`.

Functional Acceptance requires runtime / validator / demo / browser / static guard evidence appropriate to the workstream.

Docs/governance/blackboard/handoff-only PRs must be marked:

`Functional Acceptance: NOT_APPLICABLE_DOCS_ONLY`

They must not increase runtime or feature progress.

## Active Agent Progress Board

| Agent | Workstream | Repo / Branch | Progress % | Status | Current Issue / PR | Evidence | Functional Acceptance | Blocker | Need Commander | Need Reviewer | Next |
|---|---|---|---:|---|---|---|---|---|---|---|---|
| 平面拼圖 UI / Plan Puzzle | `plancraft/page-ui` | `laibeoffer/laibe-mvp` | 85 | IN_PROGRESS | PR #25 / Issue #15 context | UI IA correction recorded in handoff / phase packet; runtime Tool Catalog not complete | PENDING | Runtime / Tool Catalog interaction not complete | Yes, for product direction or next implementation authorization | No by default | Decide whether to authorize Tool Catalog Interaction Implementation |
| 平面拼圖 Adapter | `plancraft/adapter-clean` | `laibeoffer/laibe-mvp` | 100 | READY_FOR_INTEGRATION_CONTEXT_ONLY | PR #9 merged | Candidate adapter contract merged; `formalEstimateAllowed: false`; no `generateBudgetEstimate()` path | PASS for candidate adapter contract only | Not a full Plancraft+ completion signal | No | No unless adapter touches formal estimate boundary | Keep as candidate-only upstream context |
| Quote Factory | `quote-factory/price-range-governance` | `laibeoffer/laibe-quote-factory` | 85 | FUNCTIONAL_ACCEPTANCE_PENDING | PR #3 open draft | QF5.4 PR #3 head `e2fa1e8`; changed files scope clean; export package / manifest / validator are GitHub-tracked; validator commands listed in PR body | PENDING | PR #3 not merged; no GitHub-run validator evidence | Yes for final acceptance | Yes | Review PR #3, decide ready/merge or request GitHub-run validation evidence |
| Raw Candidate | `warehouse/raw-candidate` | `laibeoffer/laibe-mvp` | 100 | FINAL_GATE_PASSED / MERGED_SHARED_TRUTH | PR #26 merged / Issue #17 closed | PR #26 merged as `7b72fd9cfeada095ed5729bac3d728f4da0da806`; Issue #17 closed; PR body records R1.5 CLI demos, raw warehouse static guard, candidate-only boundaries, no formal pricing/output/payment/API/DB scope | PASS for R1.5 candidate-only raw warehouse readiness | None for Raw Candidate R1.5; candidate evidence still cannot become formal price/rule without review | No | No unless formal pricing/output drift appears | Use as candidate-only evidence handoff; do not treat raw candidate data as formal `PricingRule` or `BudgetEstimateLine.unit_price` |
| MethodSpec | `warehouse/method-spec` | `laibeoffer/laibe-mvp` | 75 | WAITING_FOR_BUDGET_ENGINE_ENTRY_DECISION | PR #30 open | PR #30 open, non-draft, mergeable=false; integration readiness evidence and context windows exist | PENDING | `BUDGET_ENGINE_ENTRY_BLOCKER` | Yes only if deciding whether to restore / create Budget Engine entry | No until runtime / formal rules change | Identify current Budget Engine entry before integration harness |
| Output Documents | `output/budget-documents` | `laibeoffer/laibe-mvp` | 100 | READY_SNAPSHOT_ONLY_DRY_RUN / MERGED_SHARED_TRUTH | PR #23 merged / PR #29 merged | PR #23 merged baseline; PR #29 merged as `c5fc75371a8ce0ceb46217662dc5f22207c1ebc0`; changed scope was docs-only integration usage note; static guard evidence recorded; no real xlsx/pdf output | PASS for snapshot-only dry-run output readiness | None for snapshot-only dry-run output readiness | No | No unless real Excel/PDF or renderer runtime boundary changes | Keep Output Documents snapshot-only; 100% here does not authorize formal Excel/PDF or customer-facing final quote |
| 模擬圖生成 | `visual/simulation-governance` | `laibeoffer/laibe-mvp` | 75 | READY_CONTEXT_ONLY | PR #24 merged | Governance docs / prompt / sandbox rules merged; no real image API | NOT_APPLICABLE_DOCS_ONLY for governance; runtime not complete | Runtime / production image API not part of current readiness | Only if real image/API direction is considered | No by default | Pause unless visual policy changes |
| Governance Patrol | `governance/codex-rules` | `laibeoffer/laibe-mvp` | 85 | GOVERNANCE_DOCS_MERGED | PR #35 merged / Issue #28 | PR #35 merged as compact blackboard rebuild; GitHub source-of-truth and merge-decision authority recorded | NOT_APPLICABLE_DOCS_ONLY | Ongoing governance maintenance | Only for system-rule changes | No by default | Maintain compact blackboard discipline |
| 巡檢官 / 整合官 | `integration/budget-system-readiness` | `laibeoffer/laibe-mvp` | 50 | ACTIONABLE_GOVERNANCE_RECOVERY | Issue #41 / blackboard recovery PR | Live GitHub state reconciled for PR #26, Issue #17, PR #29, PR #30, and Quote Factory PR #3 | NOT_APPLICABLE_DOCS_ONLY for this blackboard recovery | Integration Gate still waiting on Quote Factory shared truth and MethodSpec Budget Engine entry blocker | No for this docs-only recovery | No | Keep gate WAITING; resolve Budget Engine entry and Quote Factory shared truth next |

## Integration Readiness Gate

Status: WAITING

Reason:

- Not waiting because of 0% standby agents.
- Not waiting because of Budget Knowledge Vault.
- Quote Factory is not shared truth yet: PR #3 remains draft / not merged.
- MethodSpec still has `BUDGET_ENGINE_ENTRY_BLOCKER`.
- Raw Candidate and Output Documents are ready only for their candidate-only / snapshot-only dry-run scopes; they do not authorize formal price, formal rules, formal Excel/PDF, or a customer-facing final quote.

Owner: `LAIBE_PATROL_INTEGRATION_OFFICER`

Next: Resolve Budget Engine entry decision before starting any integration harness.

| Workstream | Required for Integration | Completion % | Evidence | Functional Acceptance | Blocker | Gate Status |
|---|---|---:|---|---|---|---|
| `quote-factory/price-range-governance` | Yes | 85 | PR #3 open draft; head `e2fa1e8`; export package / manifest / validator are GitHub-tracked | PENDING | PR #3 not merged; no GitHub-run validator evidence accepted into shared truth | WAITING |
| `warehouse/raw-candidate` | Yes | 100 | PR #26 merged as `7b72fd9cfeada095ed5729bac3d728f4da0da806`; Issue #17 closed; R1.5 CLI demos/static guard passed; candidate-only safety evidence recorded | PASS for R1.5 candidate-only readiness | None for Raw Candidate scope | READY |
| `warehouse/method-spec` | Yes | 75 | PR #30 open, non-draft, mergeable=false; integration readiness evidence exists | PENDING | `BUDGET_ENGINE_ENTRY_BLOCKER` | BLOCKED |
| `output/budget-documents` | Yes | 100 | PR #23 merged; PR #29 merged as `c5fc75371a8ce0ceb46217662dc5f22207c1ebc0`; snapshot-only usage note and static guard evidence exist | PASS for snapshot-only dry-run output readiness | None for snapshot-only dry-run scope | READY |

Readiness rule:

- Integration harness must not start until all four lines are 100% and blocker is `None`.
- Plan Puzzle and Owner Guide are not part of this four-line gate.
- Budget Knowledge Vault is not part of this gate and cannot replace completion packets.
- PR merge alone must not raise any line to 100% without matching validator / static guard / runtime / docs-only acceptance evidence.
- Output Documents 100% means snapshot-only dry-run output readiness. It does not mean formal Excel/PDF, production artifact storage, or customer-facing final quote readiness.
- Raw Candidate 100% means candidate-only warehouse readiness. It does not mean candidate price may become formal pricing authority.

## Budget Integration Blocker Handoff

To: `LAIBE_PATROL_INTEGRATION_OFFICER`

Mission: resolve Budget Engine entry decision path before integration harness.

Required output:

- Current Budget Engine entry path / export name, if it exists.
- Whether `budget-generator.ts` is missing, renamed, or intentionally replaced.
- Which existing files reference the current budget engine entry.
- Whether a separate scoped implementation task is needed.
- If new / restored Budget Engine entry is required, escalate to Commander before runtime work.

Forbidden:

- Do not modify functional code from this blackboard task.
- Do not create or patch `budget-generator.ts` from this blackboard task.
- Do not route this blocker to MethodSpec for self-repair.
- Do not start integration harness.

## Support Agents Managed Outside Commander

| Agent | Workstream | Managed By | Status | Progress % | Not Part of Integration Gate | Notes |
|---|---|---|---|---:|---|---|
| 預算知識庫 / Budget Knowledge Vault Agent | `knowledge/budget-vault` | `LAIBE_REVIEWER_INTEGRATION_OFFICER` / `LAIBE_PATROL_INTEGRATION_OFFICER` | ACTIVE_SUPPORT | 25 | Yes | Support agent only. Summarizes four budget-core reports, gaps, proposals, decisions, and feedback loops. It is not part of the four-line Integration Gate, does not unlock the gate, and is not directly dispatched by Commander. |
| 需求引導官 / Owner Guide Agent | `app/owner-guide-agent` | `EXECUTION_OFFICER` | MOCK_READY | 45 | Yes | `onboard_ai_agent` exposes front-end QA log, requirement summary, next-step CTA, `OwnerIntent`, and `ProjectRequirementBrief placeholder`; browser verification still pending. |
| 平面拼圖引導官 / Plan Puzzle Guide Agent | `app/plan-puzzle-guide-agent` | `EXECUTION_OFFICER` | CONTRACT_ONLY | 25 | Yes | Docs-only initialization contract exists under `docs/plan_puzzle_guide/`; runtime remains `WEB_RUNTIME_PENDING`. |

## Future / Standby Agent Backlog

These agents are not current blockers and must not receive new tasks unless explicitly activated by the user.

| Agent | Workstream | Progress % | Status | Activation Condition | Notes |
|---|---|---:|---|---|---|
| 網站主流程 Builder | `site/page-formalization` | 0 | STANDBY | User selects a page / CTA / routing task | Do not treat as budget integration blocker |
| 需求結構化 / 案件 Brief | `app/project-brief-structuring` | 0 | STANDBY | User activates structured brief task | Do not treat as current blocker |
| 招標 / 上架條件 | `app/tender-listing-flow` | 0 | STANDBY | User activates tender/listing flow | Do not touch payment / listing fee |
| AI PCM 決策輔助 | `app/ai-pcm-decision-support` | 0 | STANDBY | User activates AI PCM task | No real AI API without explicit authorization |
| 帳號 / 權限 / 儀表板狀態 | `app/account-dashboard-state` | 0 | STANDBY | User activates account/dashboard task | Do not touch auth / production permissions |

## Current Global Next Actions

1. `LAIBE_PATROL_INTEGRATION_OFFICER`: resolve `BUDGET_ENGINE_ENTRY_BLOCKER` decision path read-only, then escalate only if restore / new Budget Engine runtime entry is required.
2. Quote Factory: move PR #3 from draft / not-merged state into shared-truth evidence or provide accepted validator evidence.
3. Commander: keep Integration Gate as WAITING until all four required lines reach 100% with Functional Acceptance evidence and no blocker.

## Compact Update Format

Use this format only when changing current status:

```md
### YYYY-MM-DD - Short Update Title

- Agent:
- Workstream:
- Status:
- Progress %:
- Evidence:
- Functional Acceptance:
- Blocker:
- Need Commander:
- Need Reviewer:
- Next single action:
```

Do not paste full logs or repeated heartbeat text into this file.

### 2026-06-01 - Budget Integration Blackboard Stale Recovery

- Agent: `LAIBE_PATROL_INTEGRATION_OFFICER`
- Workstream: `integration/budget-system-readiness`
- Status: `ACTION_TAKEN`
- Progress %: 100 for blackboard stale recovery only
- Evidence: GitHub source-of-truth checked for PR #26, Issue #17, PR #29, PR #30, Quote Factory PR #3, and current `main`; blackboard corrected to mark PR #26 merged / Issue #17 closed and PR #29 merged.
- Functional Acceptance: `NOT_APPLICABLE_DOCS_ONLY` for this blackboard recovery.
- Blocker: Integration Gate remains WAITING because Quote Factory PR #3 is draft / not merged and MethodSpec still has `BUDGET_ENGINE_ENTRY_BLOCKER`.
- Need Commander: No for this docs-only blackboard recovery. Yes only if deciding whether to restore / create Budget Engine runtime entry.
- Need Reviewer: No for this docs-only blackboard recovery.
- Next single action: Resolve Budget Engine entry decision path before any integration harness.
