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
- Budget Knowledge Vault Agent is managed by `LAIBE_REVIEWER_INTEGRATION_OFFICER`, not by Commander.

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
| Raw Candidate | `warehouse/raw-candidate` | `laibeoffer/laibe-mvp` | 90 | MERGED_TO_MAIN | PR #26 merged / Issue #17 | PR #26 merged as `7b72fd9cfeada095ed5729bac3d728f4da0da806`; final PR diff limited to Raw Candidate R1.5 files; validation evidence in PR comments includes CLI demos, static guard, `formal_price_generated:false`, `price_authority:"none"`, no formal pricing/output/payment/API/DB scope | PASS for R1.5 CLI / static guard evidence; final completion packet pending | Final Completion Packet and Integration Officer acceptance still pending | No | No unless final packet reveals formal pricing/output drift | Raw Candidate submits Final Completion Packet; Integration Officer updates gate acceptance |
| MethodSpec | `warehouse/method-spec` | `laibeoffer/laibe-mvp` | 75 | BLOCKED | PR #30 context | Integration readiness evidence and context windows exist | PENDING | `BUDGET_ENGINE_ENTRY_BLOCKER` | No unless product decision is needed | Integration Officer investigation required | Identify current Budget Engine entry before integration harness |
| Output Documents | `output/budget-documents` | `laibeoffer/laibe-mvp` | 75 | WAITING_REVIEW | PR #23 merged / PR #29 open | Snapshot-only usage note; static guard valid; no real xlsx/pdf output | PENDING | PR #29 merge / final evidence pending | No | Only if real Excel/PDF or renderer boundary changes | Wait for PR #29 / final static guard and snapshot-only evidence |
| 模擬圖生成 | `visual/simulation-governance` | `laibeoffer/laibe-mvp` | 75 | READY_CONTEXT_ONLY | PR #24 merged | Governance docs / prompt / sandbox rules merged; no real image API | NOT_APPLICABLE_DOCS_ONLY for governance; runtime not complete | Runtime / production image API not part of current readiness | Only if real image/API direction is considered | No by default | Pause unless visual policy changes |
| Governance Patrol | `governance/codex-rules` | `laibeoffer/laibe-mvp` | 85 | GOVERNANCE_DOCS_MERGED | PR #35 merged / Issue #28 | PR #35 merged as compact blackboard rebuild; GitHub source-of-truth and merge-decision authority recorded | NOT_APPLICABLE_DOCS_ONLY | Ongoing governance maintenance | Only for system-rule changes | No by default | Maintain compact blackboard discipline |
| 審查官兼整合官 | `integration/budget-system-readiness` | `laibeoffer/laibe-mvp` | 25 | WAITING | Integration Gate / Issue #41 | Four budget lines not all 100 | PENDING | Waiting on MethodSpec blocker and final evidence from other lines | No unless integration decision needed | N/A | Run read-only Budget Engine entry investigation |

## Integration Readiness Gate

Status: WAITING

Blocking item: MethodSpec / `BUDGET_ENGINE_ENTRY_BLOCKER`

Owner: `LAIBE_REVIEWER_INTEGRATION_OFFICER`

Next: Identify current Budget Engine entry before integration harness.

| Workstream | Required for Integration | Completion % | Evidence | Functional Acceptance | Blocker | Gate Status |
|---|---|---:|---|---|---|---|
| `quote-factory/price-range-governance` | Yes | 85 | PR #3 open draft; head `e2fa1e8`; export package / manifest / validator are GitHub-tracked | PENDING | PR #3 not merged; no GitHub-run validator evidence | WAITING |
| `warehouse/raw-candidate` | Yes | 90 | PR #26 merged as `7b72fd9cfeada095ed5729bac3d728f4da0da806`; R1.5 CLI demos/static guard passed; candidate-only safety evidence recorded | PASS for R1.5 validation evidence; final packet pending | Final Completion Packet and Integration Officer gate acceptance pending | WAITING |
| `warehouse/method-spec` | Yes | 75 | PR #30 context; integration readiness evidence exists | PENDING | `BUDGET_ENGINE_ENTRY_BLOCKER` | BLOCKED |
| `output/budget-documents` | Yes | 75 | PR #23 merged; PR #29 open; snapshot-only usage note and static guard valid | PENDING | PR #29 merge / final evidence pending | WAITING |

Readiness rule:

- Integration harness must not start until all four lines are 100% and blocker is `None`.
- Plan Puzzle and Owner Guide are not part of this four-line gate.
- Budget Knowledge Vault is not part of this gate and cannot replace completion packets.
- PR merge alone must not raise any line to 100%.

## Budget Integration Blocker Handoff

To: `LAIBE_REVIEWER_INTEGRATION_OFFICER`

Mission: read-only Budget Engine entry investigation.

Required output:

- Current Budget Engine entry path / export name, if it exists.
- Whether `budget-generator.ts` is missing, renamed, or intentionally replaced.
- Which existing files reference the current budget engine entry.
- Whether a separate scoped implementation task is needed.
- Functional Acceptance status for all four budget gate lines.

Forbidden:

- Do not modify functional code.
- Do not create or patch `budget-generator.ts`.
- Do not route this blocker to MethodSpec for self-repair.
- Do not start integration harness.

## Support Agents Managed Outside Commander

| Agent | Workstream | Managed By | Status | Progress % | Not Part of Integration Gate | Notes |
|---|---|---|---|---:|---|---|
| 預算知識庫 / Budget Knowledge Vault Agent | `knowledge/budget-vault` | `LAIBE_REVIEWER_INTEGRATION_OFFICER` | ACTIVE_SUPPORT | 25 | Yes | Summarizes four budget-core reports, gaps, proposals, decisions, and feedback loops. Supports Integration Officer only. |
| 預算 E2E 驗收測試 / Budget E2E Fixture & QA Agent | `budget/e2e-fixture-qa` | `LAIBE_PATROL_INTEGRATION_OFFICER` | ACTIVE_INITIALIZATION | 25 | Yes | Defines dry-run E2E fixtures, expected snapshot contract, acceptance matrix, forbidden-flow QA checks, and final QA report template. |
| 需求引導官 / Owner Guide Agent | `app/owner-guide-agent` | `EXECUTION_OFFICER` | MOCK_READY | 45 | Yes | `onboard_ai_agent` exposes front-end QA log, requirement summary, next-step CTA, `OwnerIntent`, and `ProjectRequirementBrief placeholder`; browser verification still pending. |
| 平面拼圖引導官 / Plan Puzzle Guide Agent | `app/plan-puzzle-guide-agent` | `EXECUTION_OFFICER` | CONTRACT_ONLY | 25 | Yes | Docs-only initialization contract exists under `docs/plan_puzzle_guide/`; runtime remains `WEB_RUNTIME_PENDING`. |

## Agent Self-Introduction: Budget E2E Fixture & QA Agent

Agent:
預算 E2E 驗收測試 Agent
Budget E2E Fixture & QA Agent

Workstream:
`budget/e2e-fixture-qa`

Managed By:
`LAIBE_PATROL_INTEGRATION_OFFICER`

Repo / Branch:
`laibeoffer/laibe-mvp / budget/e2e-fixture-qa`

Status:
`ACTIVE_INITIALIZATION`

Automation:
`budget-e2e-fixture-qa-patrol / every 15 minutes`

No-Idle Rule:
After blackboard self-introduction, if no response is received within 20 minutes, this agent must automatically continue initialization tasks. It may not report `本 workstream 本輪無新指派` until initialization is complete.

Role:
建立預算生成 dry-run E2E fixtures、驗收矩陣、預期輸出、禁止資料流檢查與 final acceptance checklist，支援整合官驗收 Budget Integration Harness。

Primary Outputs:
- E2E fixture plan
- dry-run fixture set contract
- expected output snapshot contract
- acceptance matrix
- forbidden flow QA checklist
- regression checklist
- final QA report template

Not Responsible For:
- implementing Budget Engine
- running production integration
- approving prices
- modifying PricingRule
- modifying MethodSpec
- modifying renderer runtime
- n8n runtime
- payment
- AI API
- DB / Supabase

Need Commander:
No，除非要決定正式驗收標準或 production release。

Need Reviewer:
Yes before final integration harness acceptance.

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

1. `LAIBE_REVIEWER_INTEGRATION_OFFICER`: investigate `BUDGET_ENGINE_ENTRY_BLOCKER` read-only.
2. `Raw Candidate`: submit Final Completion Packet after PR #26 merge.
3. Commander: keep Integration Gate as WAITING until the four required lines reach 100% with Functional Acceptance evidence.

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

### 2026-06-01 - Raw Candidate PR #26 Merge Gate Landed

- Agent: @Raw-Candidate
- Workstream: `warehouse/raw-candidate`
- Status: `MERGED_TO_MAIN`
- Progress %: 90
- Evidence: PR #26 merged as `7b72fd9cfeada095ed5729bac3d728f4da0da806`; final diff scope clean for Raw Candidate R1.5; CLI demos/static guard evidence recorded in PR comments.
- Functional Acceptance: PASS for R1.5 CLI / static guard evidence; final completion packet pending.
- Blocker: Integration readiness still pending Final Completion Packet and Integration Officer gate acceptance.
- Need Commander: No
- Need Reviewer: No unless final packet reveals formal pricing/output drift.
- Next single action: Raw Candidate submits Final Completion Packet; Integration Officer updates readiness gate.
