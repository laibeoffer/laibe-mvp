# LaiBE MVP Workstream Blackboard

Last updated: 2026-06-05 Asia/Taipei

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
- No-idle operating rule: problems are solved by the owning agent first; unresolved decisions are escalated with a decision packet; while waiting, agents must continue safe parallel work instead of idling.
- Pending approvals must not stop unrelated safe progress. `本 workstream 本輪無新指派` is allowed only when initialization is complete, no open PR / Issue / blocker / evidence gap exists, and the supervisor has confirmed standby.

## Workspace Registry

| Machine | Local Path | Repo | Allowed Mode | Notes |
|---|---|---|---|---|
| JACKY | `C:\laibe_project` | `laibeoffer/laibe-mvp` | assigned-branch only | Local workspace only. Can read server Z drive, but GitHub main / PR / commit SHA remains shared truth. |
| DESKTOP-5D1DK6S | `Z:\laibe_project` or detected network path such as `\\192.168.0.106\sever_data\laibe_project` | `laibeoffer/laibe-mvp` | assigned-branch only | Local / network workspace only. Do not treat Z drive as cross-computer source of truth. |

Workspace rules:

1. GitHub `main`, PRs, and commit SHAs are the only shared source of truth.
2. `C:\laibe_project`, `Z:\laibe_project`, and detected UNC paths are all `LOCAL_STATE`.
3. Task prompts and reports must use repo-relative paths such as `docs/WORKSTREAM_BLACKBOARD.md`.
4. Do not use local absolute paths to decide project completion state.
5. One branch may have only one writer agent / one writing machine at a time.
6. Other machines that need to inspect the same branch must use read-only mode.
7. Z drive must not be treated as cross-computer synchronization truth.
8. If local state differs from GitHub `main` or the active PR head, report `LOCAL_STATE_STALE` and use GitHub as authoritative.
9. If `git` / `gh` tools are unavailable, do not switch to publishing a local workflow. Use GitHub read-only checks or report the tool limitation.

## Completion Rules

GitHub Merge Gate and Functional Acceptance Gate are separate.

`MERGED_TO_MAIN` means only that a PR landed safely. It does not automatically mean `FUNCTIONAL_ACCEPTED`, `INTEGRATION_READY_100`, or `TASK_COMPLETE_100`.

Functional Acceptance requires runtime / validator / demo / browser / static guard evidence appropriate to the workstream.

Docs/governance/blackboard/handoff-only PRs must be marked:

`Functional Acceptance: NOT_APPLICABLE_DOCS_ONLY`

They must not increase runtime or feature progress.

## No-idle Agent Operation Rules

Core sentence for all agents:

問題先自解。自解不了再升級。升級後不空等。有安全任務就繼續做。上級核准堆積不能成為整體停擺理由。

Agent states:

| State | Meaning | Required Behavior |
|---|---|---|
| `ACTIVE_SOLVING` | Agent is actively solving a known task or evidence gap. | Continue work inside allowed scope and report evidence. |
| `ESCALATED_WAITING_DECISION` | A decision packet has been sent to a supervisor. | Do not idle; switch to `PARALLEL_SAFE_WORK`. |
| `PARALLEL_SAFE_WORK` | Agent is doing safe work while waiting for a decision. | Prepare docs, evidence, validation lists, replacement PR drafts, or status matrices. |
| `BLOCKED_NO_SAFE_WORK` | No safe work remains and the next step is high-risk. | Rare state; must include who is blocking, what is needed, options, risks, and next report time. |
| `COMPLETED_PENDING_ARCHIVE` | Work is complete and waiting for closeout / archive. | Stop broad edits; only respond to closeout or evidence requests. |

High-risk actions requiring explicit authorization:

- Merge PR, close Issue, resolve review thread, git clean / reset / rebase / force push, publish a full local worktree, modify functional code, modify Budget Engine runtime, create or modify `PricingRule`, create or modify `BudgetEstimateLine`, connect payment / AI API / DB / Supabase / n8n runtime / production webhook, generate formal price or formal quote, start integration harness, promote placeholder to production, or mark docs-only work as runtime verified.

Safe autonomous work:

- Read-only GitHub main checks, single PR / Issue status checks, docs-only contracts, Final Completion Packet drafts, Functional Acceptance Reports, blocker decision packets, forbidden-scope checklists, validation command lists, handoff contracts, blackboard status proposals, replacement PR drafts without merge, evidence整理, decision logs, mock / placeholder docs, and workstream scope-clean reports.

Decision Packet required before waiting:

| Section | Required Content |
|---|---|
| Decision Needed | Who must decide what. |
| Options | A / B / C options. |
| Recommendation | Agent recommendation. |
| Risk | Risk of each option. |
| Safe Work While Waiting | Safe work the agent will continue. |
| Next Report Time | When the agent will report again. |

## Decision Queue

| Decision | Owner | Requested By | Options | Recommendation | Waiting Since | Safe Work While Waiting |
|---|---|---|---|---|---|---|
| Plan Puzzle Tool Catalog / interaction implementation authorization | Deputy Commander | Plan Puzzle UI | Authorize / request more runtime evidence / defer | Defer until current PR lineage and runtime evidence are clean | 2026-06-01 | Prepare interaction checklist and browser validation plan. |
| MethodSpec PR #30 disposition / replacement | `warehouse/method-spec` owner + `LAIBE_REVIEWER_INTEGRATION_OFFICER` | Commander closeout approval | Close stale PR #30 / require clean current-main replacement PR | Close stale PR #30 unless a clean current-main replacement is prepared | 2026-06-05 | Keep Issue #49 open; do not start integration harness. |

## Parallel Safe Work Queue

| Agent | Workstream | Safe Work | Status | Next Report |
|---|---|---|---|---|
| MethodSpec | `warehouse/method-spec` | Prepare PR #30 stale closeout or clean current-main replacement packet. Do not self-repair Budget Engine. | `PR30_DISPOSITION_REQUIRED` | Next single action: PR #30 disposition / replacement |
| Owner Guide Agent | `app/owner-guide-agent` | Continue standalone mock evidence and browser validation notes while routing decision waits. | `PARALLEL_SAFE_WORK` | Next Execution Officer report |
| Plan Puzzle Guide Agent | `app/plan-puzzle-guide-agent` | Continue contract evidence and browser/runtime validation preparation; do not claim 100%. | `PARALLEL_SAFE_WORK` | Next Execution Officer report |
| 預算資料契約 / Schema Registry Agent | `budget/schema-registry` | Prepare docs-only schema registry self-introduction, scope boundary, and first contract map. | `ACTIVE_SOLVING` | Every 15 minutes under Commander patrol |
| 預算稽核追溯 / Audit Trail Agent | `budget/audit-trail` | Prepare audit-only traceability contract, evidence matrix, and forbidden production authority list. | `ACTIVE_SOLVING` | Every 15 minutes under Commander patrol |
| 預算生成頁載體 / Budget Workspace UI Agent | `app/budget-workspace-ui` | Prepare IA-only workspace carrier map and UI boundary packet; do not implement runtime UI yet. | `ACTIVE_SOLVING` | Every 15 minutes under Commander patrol |

## Stalled Agent Watchlist

| Agent | Reason | Required Next Action | Supervisor |
|---|---|---|---|
| MethodSpec | PR #30 is stale, `mergeable=false`, and still records the old Budget Engine entry blocker. | Close PR #30 as stale or submit a clean current-main replacement PR after post-PR55 reevaluation. | `LAIBE_REVIEWER_INTEGRATION_OFFICER` |
| Issue #49 | Cannot close until MethodSpec post-PR55 reevaluation confirms PR #55 unblocks the previous entry blocker. | Keep Issue #49 open and link the MethodSpec disposition / replacement evidence. | `LAIBE_REVIEWER_INTEGRATION_OFFICER` |
| Integration Harness | Gate remains `NOT_READY_FOR_HARNESS`. | Do not start harness until MethodSpec disposition and all required runtime gates are accepted. | `LAIBE_REVIEWER_INTEGRATION_OFFICER` |

## Archived / Closeout Queue

| Agent | Scope | Status | Evidence | Automation | Boundary / Reactivation |
|---|---|---|---|---|---|
| Quote Factory | PR #3 export-package dry-run | `ARCHIVED_SCOPE_COMPLETED / NOT_PRODUCTION_READY` | PR #3 merged in `laibeoffer/laibe-quote-factory`; export package is dry-run metadata only. | `AUTOMATION_STOP_APPROVED` | No formal price, no `PricingRule`, no `BudgetEstimateLine`, no formal quote. Reactivate only for explicit Quote Factory production / pricing scope. |
| Raw Candidate | PR #26 R1.5 candidate-only | `ARCHIVED_SCOPE_COMPLETED / not formal price ready` | PR #26 merged; R1.5 candidate-only safety evidence accepted. | `AUTOMATION_STOP_APPROVED` | No formal price, no `PricingRule`, no `BudgetEstimateLine`, no Renderer readiness. Reactivate only for explicit formalization / review-gated runtime scope. |
| Budget Knowledge Vault | PR #78 docs-only support | `ARCHIVED_DOCS_ONLY / NOT_RUNTIME_VERIFIED` | PR #78 merged; support vault is docs-only and not part of four-line Integration Gate. | `AUTOMATION_STOP_APPROVED` | No runtime verification credit. Reactivate only if Integration Officer assigns new vault maintenance. |
| Budget Engine Entry / Picking | PR #55 minimal dry-run implementation patrol | `ARCHIVED_SCOPE_COMPLETED / not production Budget Engine` | PR #55 merged; `PASS_FOR_MINIMAL_DRY_RUN_ENTRY` only. | `AUTOMATION_STOP_APPROVED for implementation patrol` | Issue #49 stays open pending MethodSpec post-PR55 reevaluation. No production Budget Engine, formal pricing, renderer, payment, AI API, DB, n8n, or harness start. |
| Budget Review Gate | PR #37 docs-only review contract | `ARCHIVED_DOCS_ONLY / NOT_RUNTIME_VERIFIED` | PR #37 merged; docs-only review gate contracts. | `AUTOMATION_STOP_APPROVED` | No runtime verified credit and no formal price approval authority. |
| Budget E2E Fixture QA | PR #48 docs-only fixture contract | `ARCHIVED_DOCS_ONLY / NOT_RUNTIME_VERIFIED` | PR #48 merged; dry-run fixture / QA contracts only. | `AUTOMATION_STOP_APPROVED` | No harness execution and no runtime verified credit. |
| Budget Input Flow Gate | PR #71 docs-only evidence | `ARCHIVED_DOCS_ONLY / NOT_RUNTIME_VERIFIED` | PR #71 merged; support evidence only. | `AUTOMATION_STOP_APPROVED` | Does not enable runtime, Budget Engine, Renderer, `PricingRule`, or `BudgetEstimateLine`. |
| Budget File Intake Sandbox | PR #72 docs-only evidence | `ARCHIVED_DOCS_ONLY / NOT_RUNTIME_VERIFIED` | PR #72 merged; support evidence only. | `AUTOMATION_STOP_APPROVED` | Does not enable upload backend, storage API, DB, Budget Engine, Renderer, or formal quote. |
| Budget Runtime Acceptance | PR #73 docs-only evidence | `ARCHIVED_DOCS_ONLY / NOT_RUNTIME_VERIFIED` | PR #73 merged; support evidence only. | `AUTOMATION_STOP_APPROVED` | Docs-only acceptance matrix does not equal runtime verification. |
| Budget Workflow Orchestrator | PR #51 closed unmerged docs-only final report | `STANDBY_BY_COMMANDER_CLOSEOUT / no Gate credit` | PR #51 closed unmerged; prior placeholder baseline remains docs-only. | no recurring patrol | Do not enable n8n, webhook, scheduler, API key, DB, payment, AI API, formal quote, Excel, or PDF. |
| 平面拼圖 Adapter | PR #9 candidate adapter contract | `ARCHIVED_CONTEXT_ONLY` | PR #9 merged; candidate adapter contract only. | `NO_ACTIVE_PATROL_REQUIRED` | Does not affect Budget Integration Gate or full Plancraft+ readiness. |

## Active Agent Progress Board

| Agent | Workstream | Repo / Branch | Progress % | Status | Current Issue / PR | Evidence | Functional Acceptance | Blocker | Need Commander | Need Reviewer | Next |
|---|---|---|---:|---|---|---|---|---|---|---|---|
| 平面拼圖 UI / Plan Puzzle | `plancraft/page-ui` | `laibeoffer/laibe-mvp` | 85 | IN_PROGRESS | PR #25 / Issue #15 context | UI IA correction recorded in handoff / phase packet; runtime Tool Catalog not complete | PENDING | Runtime / Tool Catalog interaction not complete | Yes, for product direction or next implementation authorization | No by default | Decide whether to authorize Tool Catalog Interaction Implementation |
| 平面拼圖 Adapter | `plancraft/adapter-clean` | `laibeoffer/laibe-mvp` | 100 | READY_FOR_INTEGRATION_CONTEXT_ONLY | PR #9 merged | Candidate adapter contract merged; `formalEstimateAllowed: false`; no `generateBudgetEstimate()` path | PASS for candidate adapter contract only | Not a full Plancraft+ completion signal | No | No unless adapter touches formal estimate boundary | Keep as candidate-only upstream context |
| Quote Factory | `quote-factory/price-range-governance` | `laibeoffer/laibe-quote-factory` | 100 | `ARCHIVED_SCOPE_COMPLETED / NOT_PRODUCTION_READY` | PR #3 merged | Export-package dry-run closeout approved. | PASS for scoped dry-run export package only | No formal price / `PricingRule` / `BudgetEstimateLine` / formal quote credit | No | No unless production pricing scope is reopened | Standby; heartbeat stopped |
| Raw Candidate | `warehouse/raw-candidate` | `laibeoffer/laibe-mvp` | 100 | `ARCHIVED_SCOPE_COMPLETED / not formal price ready` | PR #26 merged / Issue #17 closed | R1.5 candidate-only acceptance archived. | PASS for candidate-only guard evidence | Not formal price ready; no Renderer readiness | No | No unless formalization scope is reopened | Standby; heartbeat stopped |
| MethodSpec | `warehouse/method-spec` | `laibeoffer/laibe-mvp` | 75 | `PR30_DISPOSITION_REQUIRED` | PR #30 open / `mergeable=false`; Issue #49 dependency | Existing PR #30 still records old Budget Engine entry blocker; PR #55 has since merged minimal dry-run entry. | PENDING | PR #30 stale / non-mergeable; MethodSpec post-PR55 reevaluation required | No unless product/formal-output decision appears | Yes | MethodSpec PR #30 disposition / replacement |
| 預算生產線入口 / 撿貨系統 Agent | `budget/engine-entry-picking` | `laibeoffer/laibe-mvp` | 100 | `ARCHIVED_SCOPE_COMPLETED / not production Budget Engine` | PR #55 merged / Issue #49 open | Minimal dry-run entry implementation patrol accepted. | PASS for minimal dry-run entry only | Issue #49 remains open until MethodSpec post-PR55 reevaluation confirms unblock | No | No unless MethodSpec reevaluation finds runtime boundary drift | Stop implementation heartbeat; keep Issue #49 open |
| Output Documents | `output/budget-documents` | `laibeoffer/laibe-mvp` | 85 | `SNAPSHOT_ONLY_FUNCTIONAL_PACKET_SUBMITTED` | PR #23 merged / PR #29 merged | Snapshot-only usage note and static guard valid; no real xlsx/pdf output. | PASS for snapshot-only output readiness | Formal Excel/PDF and formal quote remain out of scope | No | Only if real Excel/PDF or renderer boundary changes | Standby for snapshot-only; do not produce formal output |
| 模擬圖生成 | `visual/simulation-governance` | `laibeoffer/laibe-mvp` | 75 | READY_CONTEXT_ONLY | PR #24 merged | Governance docs / prompt / sandbox rules merged; no real image API | NOT_APPLICABLE_DOCS_ONLY for governance; runtime not complete | Runtime / production image API not part of current readiness | Only if real image/API direction is considered | No by default | Pause unless visual policy changes |
| Governance Patrol | `governance/codex-rules` | `laibeoffer/laibe-mvp` | 85 | GOVERNANCE_DOCS_MERGED | PR #35 merged / Issue #28 | PR #35 merged as compact blackboard rebuild; GitHub source-of-truth and merge-decision authority recorded | NOT_APPLICABLE_DOCS_ONLY | Ongoing governance maintenance | Only for system-rule changes | No by default | Maintain compact blackboard discipline |
| 審查官兼整合官 | `integration/budget-system-readiness` | `laibeoffer/laibe-mvp` | 25 | `NOT_READY_FOR_HARNESS` | Integration Gate / Issue #49 / PR #30 | Commander closeout approved scoped standby for completed support lines. | PENDING | MethodSpec PR #30 disposition / replacement required; Issue #49 remains open | No unless integration harness start or production scope is proposed | N/A | MethodSpec PR #30 disposition / replacement |

## Integration Readiness Gate

Status: `NOT_READY_FOR_HARNESS`

Blocking item: MethodSpec PR #30 stale / non-mergeable and Issue #49 post-PR55 reevaluation

Current blocker owner: `warehouse/method-spec` with `LAIBE_REVIEWER_INTEGRATION_OFFICER`

Gate manager: `LAIBE_REVIEWER_INTEGRATION_OFFICER`

Next: MethodSpec PR #30 disposition / replacement.

| Workstream | Required for Integration | Completion % | Evidence | Functional Acceptance | Blocker | Gate Status |
|---|---|---:|---|---|---|---|
| `quote-factory/price-range-governance` | Yes | 100 scoped | PR #3 merged in `laibeoffer/laibe-quote-factory`; export package dry-run scope archived | PASS for scoped dry-run export package only | No formal price / `PricingRule` / `BudgetEstimateLine` / formal quote readiness | STANDBY |
| `warehouse/raw-candidate` | Yes | 100 scoped | PR #26 merged; R1.5 candidate-only safety evidence archived | PASS for candidate-only evidence | Not formal price ready; no Renderer readiness | STANDBY |
| `warehouse/method-spec` | Yes | 75 | PR #30 open, stale, `mergeable=false`; Issue #49 remains open for post-PR55 reevaluation | PENDING | PR #30 disposition / clean current-main replacement required | BLOCKED |
| `output/budget-documents` | Yes | 85 | PR #23 and PR #29 merged; snapshot-only usage note and static guard evidence | PASS for snapshot-only output readiness | Formal Excel/PDF and formal quote remain out of scope | WAITING |

Readiness rule:

- Integration harness must not start until all four lines are 100% and blocker is `None`.
- Plan Puzzle and Owner Guide are not part of this four-line gate.
- Budget Knowledge Vault is not part of this gate and cannot replace completion packets.
- PR merge alone must not raise any line to 100%.
- Docs-only closeout must not be treated as runtime verified.
- Candidate-only acceptance must not be treated as formal price ready.

## Budget Integration Blocker Handoff

To: `warehouse/method-spec` / MethodSpec owner

Issue: #49

Mission: MethodSpec post-PR55 reevaluation for Issue #49.

Required output:

- Decide whether PR #30 should be closed as stale or replaced with a clean current-main PR.
- Confirm whether PR #55 minimal dry-run entry unblocks the previous MethodSpec Budget Engine entry blocker.
- Keep Issue #49 open until this reevaluation is recorded.
- Do not start integration harness.

Forbidden:

- Do not modify functional code.
- Do not create or patch `budget-generator.ts`.
- Do not start integration harness.
- Do not create formal prices, production `PricingRule`, `BudgetEstimateLine`, renderer output, Excel/PDF, payment/auth/webhook/API/DB/secrets.

## Support Agents Managed Outside Commander

| Agent | Workstream | Managed By | Status | Progress % | Not Part of Integration Gate | Notes |
|---|---|---|---|---:|---|---|
| 預算知識庫 / Budget Knowledge Vault Agent | `knowledge/budget-vault` | `LAIBE_REVIEWER_INTEGRATION_OFFICER` | `ARCHIVED_DOCS_ONLY / NOT_RUNTIME_VERIFIED` | 100 | Yes | PR #78 docs-only support archived; heartbeat stopped; no Integration Gate credit. |
| 預算 E2E 驗收測試 / Budget E2E Fixture & QA Agent | `budget/e2e-fixture-qa` | `LAIBE_PATROL_INTEGRATION_OFFICER` | `ARCHIVED_DOCS_ONLY / NOT_RUNTIME_VERIFIED` | 100 | Yes | PR #48 docs-only fixture contract archived; heartbeat stopped; no harness execution. |
| 需求引導官 / Owner Guide Agent | `app/owner-guide-agent` | `EXECUTION_OFFICER` | MOCK_READY | 45 | Yes | `onboard_ai_agent` exposes front-end QA log, requirement summary, next-step CTA, `OwnerIntent`, and `ProjectRequirementBrief placeholder`; browser verification still pending. |
| 平面拼圖引導官 / Plan Puzzle Guide Agent | `app/plan-puzzle-guide-agent` | `EXECUTION_OFFICER` | CONTRACT_ONLY | 25 | Yes | Docs-only initialization contract exists under `docs/plan_puzzle_guide/`; runtime remains `WEB_RUNTIME_PENDING`. |
| 預算審核閘門 / Budget Review Gate Agent | `budget/review-gate` | `LAIBE_PATROL_INTEGRATION_OFFICER` | `ARCHIVED_DOCS_ONLY / NOT_RUNTIME_VERIFIED` | 100 | Yes | PR #37 docs-only review contract archived; heartbeat stopped; no runtime verified credit. |
| Budget Input Flow Gate Agent | `budget/input-flow-gate` | `LAIBE_PATROL_INTEGRATION_OFFICER` | `ARCHIVED_DOCS_ONLY / NOT_RUNTIME_VERIFIED` | 100 | Yes | PR #71 docs-only evidence archived; heartbeat stopped. |
| Budget File Intake Sandbox Agent | `budget/file-intake-sandbox` | `LAIBE_PATROL_INTEGRATION_OFFICER` | `ARCHIVED_DOCS_ONLY / NOT_RUNTIME_VERIFIED` | 100 | Yes | PR #72 docs-only evidence archived; heartbeat stopped. |
| Budget Runtime Acceptance Agent | `qa/budget-runtime-acceptance` | `LAIBE_PATROL_INTEGRATION_OFFICER` | `ARCHIVED_DOCS_ONLY / NOT_RUNTIME_VERIFIED` | 100 | Yes | PR #73 docs-only evidence archived; heartbeat stopped; docs-only matrix is not runtime verification. |

## Support Agents Managed by Deputy Commander

These support agents are not part of the four-line Budget Integration Gate. They are initially supervised by Deputy Commander. If their output is later proposed for the budget-system integration harness, `LAIBE_PATROL_INTEGRATION_OFFICER` must perform final integration review first.

Preauthorized safe scope: docs-only, schema-only, audit-only, IA-only, self-introduction, automation notes, no-idle reports, completion packet drafts, closeout reports, and PRs limited to docs / blackboard / handoff.

Forbidden: Budget Engine runtime, `PricingRule`, `BudgetEstimateLine`, `BudgetOutputSnapshot`, renderer runtime, payment, AI API, DB, Supabase, n8n runtime / production webhook, formal price, formal quote, production-ready claim, or Integration Gate promotion.

| Agent | Workstream | Managed By | Status | Progress % | Not Part of Integration Gate | Automation | Notes |
|---|---|---|---|---:|---|---|---|
| 預算資料契約 / Schema Registry Agent | `budget/schema-registry` | Deputy Commander | ACTIVE_SUPPORT_INITIATED | 10 | Yes | 15-minute Commander patrol | Maintains budget data contract registry proposals, schema map, placeholder contracts, and compatibility notes. |
| 預算稽核追溯 / Audit Trail Agent | `budget/audit-trail` | Deputy Commander | ACTIVE_SUPPORT_INITIATED | 10 | Yes | 15-minute Commander patrol | Maintains audit trail concepts, traceability evidence matrix, decision log proposal, and no-formal-authority guardrails. |
| 預算生成頁載體 / Budget Workspace UI Agent | `app/budget-workspace-ui` | Deputy Commander | ACTIVE_SUPPORT_INITIATED | 10 | Yes | 15-minute Commander patrol | Maintains IA-only budget workspace carrier map and UI boundary packet; does not implement production UI or runtime wiring. |

## Agent Self-Introduction: Budget Schema Registry Agent

Agent:
預算資料契約 / Schema Registry Agent

Workstream:
`budget/schema-registry`

Managed By:
Deputy Commander

Status:
`ACTIVE_SUPPORT_INITIATED`

Automation:
15-minute Commander patrol

Role:
整理預算系統資料契約、schema registry proposal、placeholder contract map、跨 agent handoff 欄位表與相容性風險。

Allowed:
docs-only / schema-only proposal, blackboard self-introduction, completion packet draft, Functional Acceptance report draft, and closeout report.

Forbidden:
No runtime schema migration, no Budget Engine implementation, no `PricingRule`, no `BudgetEstimateLine`, no renderer runtime, no DB / Supabase, no production API, no Integration Gate promotion.

Functional Acceptance:
`NOT_APPLICABLE_DOCS_ONLY` until a runtime/schema implementation task is explicitly authorized.

## Agent Self-Introduction: Budget Audit Trail Agent

Agent:
預算稽核追溯 / Audit Trail Agent

Workstream:
`budget/audit-trail`

Managed By:
Deputy Commander

Status:
`ACTIVE_SUPPORT_INITIATED`

Automation:
15-minute Commander patrol

Role:
整理預算資料追溯、review decision log、audit event proposal、source-to-output traceability matrix 與禁止正式價格越界的稽核規則。

Allowed:
docs-only / audit-only proposal, evidence matrix, decision log template, forbidden-flow checklist, completion packet draft, and closeout report.

Forbidden:
No production audit runtime, no DB / Supabase, no payment, no AI API, no formal price, no formal quote, no `BudgetEstimateLine`, no Integration Gate promotion.

Functional Acceptance:
`NOT_APPLICABLE_DOCS_ONLY` until an implementation task is explicitly authorized.

## Agent Self-Introduction: Budget Workspace UI Agent

Agent:
預算生成頁載體 / Budget Workspace UI Agent

Workstream:
`app/budget-workspace-ui`

Managed By:
Deputy Commander

Status:
`ACTIVE_SUPPORT_INITIATED`

Automation:
15-minute Commander patrol

Role:
整理預算生成頁載體的 IA-only workspace map、入口 / 出口邊界、placeholder panel contract、狀態區與驗收前 UI boundary。此 agent 不等於網站主流程 Builder。

Allowed:
docs-only / IA-only proposal, blackboard self-introduction, page carrier map, non-runtime mock contract, completion packet draft, and closeout report.

Forbidden:
No `src/` UI implementation without explicit task, no routing change, no Budget Engine runtime, no renderer runtime, no payment, no AI API, no DB / Supabase, no production-ready claim, no Integration Gate promotion.

Functional Acceptance:
`NOT_APPLICABLE_DOCS_ONLY` until a runtime UI task is explicitly authorized and validated.

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

## Archived Agents - AI PCM Department

AI PCM department docs-only closeout is accepted according to AI PCM Commander report. This archive only covers documentation, roles, boundaries, reserved flows, and governance rules.

Functional Acceptance: `NOT_APPLICABLE_DOCS_ONLY`

Forbidden claims:

- AI PCM production ready
- LINE API connected
- AI API connected
- DB / Supabase connected
- payment / escrow / listing fee connected
- formal tender enabled
- formal legal decision enabled
- formal quote / price enabled
- runtime code complete

Reactivation condition: only explicit user activation of AI PCM runtime, LINE terminal, production AI API, DB / Supabase, payment / escrow, formal tender, formal legal decision, or formal quote / price may reactivate these agents.

Integration Gate Impact: None. AI PCM department is not part of the Budget Integration Gate and must not raise budget-system completion progress.

| Agent | Workstream | Status | Evidence | Boundary | Automation | Reactivation Condition |
|---|---|---|---|---|---|---|
| AI PCM 總監／後台總控 Agent | `pcm/admin-control-center` | `ARCHIVED_GOVERNANCE_READY` | `CLOSEOUT_READY / 100%` | docs-only, no runtime code, no production API | `DISABLED_AFTER_ARCHIVE` | Explicit user activation of AI PCM runtime / production API scope |
| 合約資料與證據管理 Agent | `pcm/contract-evidence-admin` | `ARCHIVED_DOCS_ONLY` | `CLOSEOUT_ACCEPTED_WITH_NOTES / 100%` | docs-only, no production contract/legal runtime | `NO_ACTIVE_PATROL_REQUIRED` | Explicit user activation of contract evidence runtime scope |
| 問題分流與合約裁決建議 Agent | `pcm/issue-routing-contract-decision` | `ARCHIVED_DOCS_ONLY` | `CLOSEOUT_ACCEPTED_WITH_NOTES / 100%` | docs-only, no formal legal decision | `NO_ACTIVE_PATROL_REQUIRED` | Explicit user activation of formal legal decision / runtime routing scope |
| 甲乙方入口與 LINE 終端 Agent | `pcm/party-entry-line-terminal` | `ARCHIVED_DOCS_ONLY` | `CLOSEOUT_ACCEPTED_WITH_NOTES / 100%` | docs-only, no production LINE API | `NO_ACTIVE_PATROL_REQUIRED` | Explicit user activation of LINE terminal / production API scope |
| 招標前置輔助 Agent | `pcm/pre-tender-readiness` | `ARCHIVED_DOCS_ONLY` | `CLOSEOUT_ACCEPTED_WITH_NOTES / 100%` | docs-only, no formal tender enabled | `NO_ACTIVE_PATROL_REQUIRED` | Explicit user activation of formal tender scope |
| 付款節點與金流分撥預留 Agent | `pcm/payment-ledger-placeholder` | `ARCHIVED_DOCS_ONLY` | `CLOSEOUT_ACCEPTED_WITH_NOTES / 100%` | docs-only, no payment / escrow / listing fee | `NO_ACTIVE_PATROL_REQUIRED` | Explicit user activation of payment / escrow / listing fee scope |
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

1. MethodSpec PR #30 disposition / replacement.

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

### 2026-06-05 - Commander Budget Closeout Approval

- Agent: Deputy Commander
- Workstream: `integration/budget-system-readiness`
- Status: `COMMANDER_CLOSEOUT_STANDBY_APPROVED`
- Progress %: N/A
- Evidence: Budget Integration Closeout Sprint Report accepted for scoped closeout / standby. Archived scopes: Quote Factory PR #3 dry-run export package; Raw Candidate PR #26 R1.5 candidate-only; Budget Knowledge Vault PR #78 docs-only support; Budget Engine Entry PR #55 minimal dry-run implementation patrol; Budget Review Gate PR #37 docs-only contract; Budget E2E Fixture QA PR #48 docs-only contract; Budget Input Flow Gate PR #71 docs-only evidence; Budget File Intake Sandbox PR #72 docs-only evidence; Budget Runtime Acceptance PR #73 docs-only evidence; Budget Workflow Orchestrator PR #51 closed unmerged docs-only final report.
- Functional Acceptance: Scoped only. Docs-only closeout is `NOT_RUNTIME_VERIFIED`; candidate-only acceptance is not formal price ready; Budget Engine Entry is not production Budget Engine.
- Blocker: MethodSpec PR #30 remains open, stale, and `mergeable=false`; Issue #49 remains open pending MethodSpec post-PR55 reevaluation; Integration Harness remains `NOT_READY_FOR_HARNESS`.
- Need Commander: No for the archived scopes. Yes before integration harness start, production Budget Engine, formal pricing, payment, AI API, DB, n8n, webhook, or product-direction changes.
- Need Reviewer: Yes for MethodSpec PR #30 disposition / replacement.
- Next single action: MethodSpec PR #30 disposition / replacement.

### 2026-06-05 - Patrol Commander Report Requested

- To: 巡檢總指揮
- Workstream: `command/patrol-commander`
- Status: `REPORT_REQUESTED`
- Progress %: N/A
- Evidence: Commander requests the Patrol Commander to submit the latest local-vs-GitHub inspection report to this GitHub blackboard or a scoped current-main PR.
- Functional Acceptance: `NOT_APPLICABLE_DOCS_ONLY`
- Blocker: No visible Patrol Commander report section was found on GitHub `main` during the previous Commander check.
- Need Commander: No, unless the report requires merge, closeout, runtime, production, payment, AI API, DB, or formal quote decisions.
- Need Reviewer: No by default.
- Next single action: Patrol Commander submits a compact report with GitHub main SHA, local path checked, LOCAL_STATE status, changed PR / Issue facts, stale-state findings, owner actions, and exact blocker / closeout recommendations.
### 2026-06-05 - Output Documents Snapshot-only Functional Evidence Packet Submitted

- Agent: Output Documents / 預算成品物流系統
- Workstream: `output/budget-documents`
- Status: `SNAPSHOT_ONLY_FUNCTIONAL_PACKET_SUBMITTED`
- Progress %: 85
- Evidence: BudgetOutputSnapshot accepted input and snapshot-gated rendered document boundary recorded; snapshot-only renderer / static guard evidence accepted for snapshot-only readiness; no Budget Engine rerun, no Raw Candidate read, no MethodSpecCatalog read, no real Excel/PDF.
- Functional Acceptance: `PASS_FOR_SNAPSHOT_ONLY_OUTPUT_READINESS`
- Blocker: Formal Excel/PDF and formal quote remain out of scope and not closeable.
- Need Commander: No for snapshot-only closeout; Yes before formal Excel/PDF, formal quote, production renderer, payment, AI API, or DB.
- Need Reviewer: No unless future evidence crosses into renderer runtime, Budget Engine rerun, direct Raw/MethodSpec read, or formal output.
- Next single action: Integration Officer may close the snapshot-only queue; do not start integration harness.
### 2026-06-04 - Budget Workflow Orchestrator Closeout Disposition Synced

- Agent: Budget Workflow Orchestrator Agent
- Workstream: `workflow/budget-orchestrator`
- Status: `STANDBY_BY_COMMANDER_CLOSEOUT / no Gate credit`
- Progress %: 100
- Evidence: GitHub main patrol found stale PR #51 watchlist text. PR #51 has Commander disposition `CLOSE_SUPERSEDED / CLOSEOUT_ACCEPTED_BY_PR_36_BASELINE`, with `AGENT_CLOSEOUT_ACCEPTED`; 2026-06-05 Commander closeout approval records no recurring patrol. The active docs on main remain the placeholder workflow package from the accepted baseline.
- Functional Acceptance: `NOT_APPLICABLE_DOCS_ONLY`
- Blocker: None for this workstream closeout; Budget Integration Gate is unaffected.
- Need Commander: No unless n8n, webhook, external automation, API, DB, payment, AI API, or production quote scope is reopened.
- Need Reviewer: No by default; Yes only if future work proposes production triggers, runtime automation, formal budget output, or customer-facing notification.
- Next single action: Standby; no recurring patrol; do not create runtime automation.

### 2026-06-01 - Budget Review Gate Final Report Submitted

- Agent: 預算審核閘門 / Budget Review Gate Agent
- Workstream: `budget/review-gate`
- Status: `ARCHIVED_DOCS_ONLY / NOT_RUNTIME_VERIFIED`
- Progress %: 100
- Evidence: PR #37 has merged; `docs/budget_review_gate/` contains review gate contract, queue schema, decision contract, approval policy, decision log, forbidden direct-publish flows, JSON examples, automation record, final completion report, and Integration Officer action packet. 2026-06-05 Commander closeout approval archived this docs-only scope.
- Functional Acceptance: `NOT_APPLICABLE_DOCS_ONLY / NOT_RUNTIME_VERIFIED`
- Blocker: None for docs-only review contract closeout; no formal price approval authority is granted.
- Need Commander: No for archived docs-only scope.
- Need Reviewer: No unless any proposal attempts to become formal price, formal rule, formal quantity, `BudgetEstimateLine`, `BudgetOutputSnapshot`, or customer quote.
- Next single action: Standby; heartbeat stopped.

### 2026-06-01 - Budget Engine Entry Blocker Routed

- Agent: 預算生產線入口 / 撿貨系統 Agent
- Workstream: `budget/engine-entry-picking`
- Status: `ARCHIVED_SCOPE_COMPLETED / not production Budget Engine`
- Progress %: 100
- Evidence: Issue #49 dispatch led to PR #55 minimal dry-run entry; PR #55 has merged and implementation patrol is archived by 2026-06-05 Commander closeout approval.
- Functional Acceptance: `PASS_FOR_MINIMAL_DRY_RUN_ENTRY` only.
- Blocker: Issue #49 remains open until MethodSpec post-PR55 reevaluation confirms the previous entry blocker is unblocked.
- Need Commander: No for archived implementation patrol. Yes before production Budget Engine, integration harness, formal price, payment, AI API, DB, n8n, or webhook.
- Need Reviewer: Yes for MethodSpec PR #30 disposition / replacement.
- Next single action: MethodSpec PR #30 disposition / replacement.

### 2026-06-01 - Raw Candidate Final Packet Submitted

- Agent: @Raw-Candidate
- Workstream: `warehouse/raw-candidate`
- Status: `ARCHIVED_SCOPE_COMPLETED / not formal price ready`
- Progress %: 100
- Evidence: PR #26 merged as `7b72fd9cfeada095ed5729bac3d728f4da0da806`; Issue #17 closed; final packet posted in PR comment `4590972724`; current-main CLI demos/static guard passed; candidate-only guard preserved `formal_price_generated:false`, `price_authority:"none"`, no formal pricing/output/payment/API/DB scope.
- Blocker: None for R1.5 candidate-only closeout; not formal price ready and no Renderer readiness.
- Need Commander: No for archived candidate-only scope.
- Need Reviewer: No by default unless acceptance review finds drift.
- Next single action: Standby; heartbeat stopped.

### 2026-06-03 - Integration Officer Closeout Handoff Submitted

- Agent: LAIBE_PATROL_INTEGRATION_OFFICER / LAIBE_REVIEWER_INTEGRATION_OFFICER
- Workstream: `integration/budget-system-readiness`
- Status: `SUPERSEDED_BY_COMMANDER_CLOSEOUT_APPROVAL_2026_06_05`
- Patrol mode: `BLOCKER_WATCH_ONLY`
- Budget Integration Gate: `NOT_READY_FOR_HARNESS`
- Ready to integrate: No
- Evidence:
  - PR #71 merged; Issue #63 closeout accepted.
  - PR #72 merged; Issue #64 closeout accepted.
  - PR #73 merged; Issue #65 closeout accepted.
  - PR #55 reviewed as `PASS_WITH_NOTES_FOR_MINIMAL_DRY_RUN`.
  - PR #55 has since landed on `main` as minimal dry-run entry only.
  - Quote Factory PR #3 has since landed in `laibeoffer/laibe-quote-factory` as dry-run export package only.
  - Commander closeout / standby approval recorded on 2026-06-05.
- Support Agents:
  - `budget/input-flow-gate`: `ARCHIVED_DOCS_ONLY / NOT_RUNTIME_VERIFIED / AUTOMATION_STOP_APPROVED`
  - `budget/file-intake-sandbox`: `ARCHIVED_DOCS_ONLY / NOT_RUNTIME_VERIFIED / AUTOMATION_STOP_APPROVED`
  - `qa/budget-runtime-acceptance`: `ARCHIVED_DOCS_ONLY / NOT_RUNTIME_VERIFIED / AUTOMATION_STOP_APPROVED`
  - `knowledge/budget-vault`: `ARCHIVED_DOCS_ONLY / NOT_RUNTIME_VERIFIED / AUTOMATION_STOP_APPROVED`
  - `budget/review-gate`: `ARCHIVED_DOCS_ONLY / NOT_RUNTIME_VERIFIED / AUTOMATION_STOP_APPROVED`
  - `budget/e2e-fixture-qa`: `ARCHIVED_DOCS_ONLY / NOT_RUNTIME_VERIFIED / AUTOMATION_STOP_APPROVED`
- Active Owner Actions:
  - MethodSpec owner: close stale PR #30 or provide a clean current-main replacement after post-PR55 reevaluation.
- Functional Acceptance:
  - Support agents #63 / #64 / #65 and other docs-only closeout scopes: `NOT_APPLICABLE_DOCS_ONLY / NOT_RUNTIME_VERIFIED`
  - PR #55: `PASS_WITH_NOTES_FOR_MINIMAL_DRY_RUN` only; not production Budget Engine readiness.
  - PR #3 / PR #26: scoped dry-run / candidate-only acceptance only; not formal price ready.
- Blocker:
  - MethodSpec PR #30 is stale / non-mergeable and still records the old blocker.
  - Issue #49 remains open pending MethodSpec post-PR55 reevaluation.
  - Integration harness must not start.
- Need Commander: No for closeout handoff. Yes only for integration harness start, high-risk runtime merge, production Budget Engine, formal pricing, payment, AI API, DB, n8n, or product-direction decisions.
- Need Reviewer: Yes for MethodSpec PR #30 disposition / replacement.
- Next single action: MethodSpec PR #30 disposition / replacement.
