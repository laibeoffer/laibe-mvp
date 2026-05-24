# WORKSTREAM_BLACKBOARD.md

## Purpose

這是萊比 MVP 的 GitHub 戰情黑板。  
所有工作線的階段成果、阻塞、待審查、下一步建議，都集中記錄在這裡。  
副指揮官依此整理狀態與派工建議。  
本文件不是產品設計文件，也不是長篇報告。

## Command Structure

- Commander：使用者本人，負責最終裁決。
- Deputy Codex：副指揮官，負責整理狀態、辨識阻塞、建議下一個 Issue。
- Builder Workstreams：各分工聊天室 / Codex，負責各自 branch 內的施工。
- Reviewer：審查官，只在抽查或風險觸發時進行只讀審查。

## Reporting Rules

每個工作線完成階段任務後，必須更新自己的狀態區與 Update Log。

每次回報只填短格式：

- Workstream:
- Branch:
- Status:
- Changed:
- Files:
- PR / Commit:
- Blocked:
- Next:
- Need Commander:
- Need Reviewer:

禁止：
- 不貼長篇聊天紀錄
- 不貼完整 PR 描述
- 不寫產品重設計
- 不跨改別人的 workstream 狀態
- 不把黑板當成任務實作區

## Issue / Blackboard / Heartbeat Patrol Rules

萊比 GitHub 工作流固定為：

- GitHub Issue = 正式派工單。
- Pull Request = 完工驗收單。
- `docs/WORKSTREAM_BLACKBOARD.md` = 戰情黑板。
- Deputy heartbeat = 全局巡邏，檢查 open Issue / open PR / Codex review / blocker / Need Commander / Need Reviewer。
- Workstream heartbeat = 單一聊天室自己的鬧鐘，只巡自己的 `To:` / `Workstream:` / PR / 黑板區塊。

Thread heartbeat 只能喚醒該聊天室本身，不能喚醒其他聊天室。若每條工作線都要自動巡查，必須在各自聊天室建立自己的 heartbeat automation。

Deputy Codex 派工時必須使用以下格式：

- To:
- Workstream:
- Branch / Repo:
- Mission:
- Why this agent:
- Action:
- Need Commander:
- Need Reviewer:

派工規則：

- `To:` 必須明確點名一個主要 agent / 聊天室。
- 不可只寫 branch。
- 不可只寫 workstream。
- 不可把任務丟給「大家」。
- 跨線任務要指定主責 agent，其他只列 reference。
- 完整 scoped task prompt 仍應使用上述 8 欄作為最小格式。
- IT / GitHub / branch / PR / commit / staging / re-review 由 Deputy Codex 判斷，不升級給 Commander。

完整制度見：

- `docs/ISSUE_BLACKBOARD_PATROL_WORKFLOW.md`

## Commander Escalation Rules

只有以下情況才標記 @commander：

- 需要使用者做產品方向判斷
- 需要 merge / reject 的最終裁決
- 任務跨多個 workstream
- 發現現有檔案來源或頁面角色混淆
- 涉及 payment / escrow / listing fee
- 涉及真 AI API / 真上傳 / API key
- 涉及正式價格 / PricingRule / BudgetEstimateLine.unit_price
- 涉及正式 Excel / PDF 輸出
- 副指揮官無法判斷下一步

## Reviewer Trigger Rules

審查官採抽查制 / 風險觸發制。

只有以下情況建議 @reviewer：

- Codex review 出現 NEEDS_FIX 或具體 P2/P1 風險
- 任務跨 workstream
- PR changed files 超出白名單
- 涉及正式價格、正式輸出、payment、AI API、真上傳
- 副指揮官懷疑 Builder 越界
- 使用者要求審查

## Deputy Technical Judgment Rules

使用者只負責需求、產品方向、視覺審美、商業邏輯與最終裁決。

IT 技術相關問題不要升級給使用者。副指揮官可依 `AGENTS.md`、GitHub branch strategy、workstream rules 自行判斷並提出執行建議。

副指揮官可自行處理 / 判斷：

- Git branch / PR / commit / push 流程
- 是否需要拆 commit
- 是否需要重新觸發 Codex review
- 白名單 staging 是否合理
- 檔案是否屬於正確 workstream
- 技術性 blocked 狀態
- Codex 回報是否需要技術修正
- GitHub workflow 下一步
- 是否請 Builder 修正技術問題

副指揮官不應把以下問題丟給使用者：

- 要不要 git pull
- 要不要開 branch
- 要不要重跑 Codex review
- commit message 怎麼寫
- PR description 怎麼寫
- 某檔案是否應該 stage
- 某技術修正該交給哪條 branch
- GitHub dirty worktree 如何隔離，只要不涉及刪除或重寫重要內容

必須升級給使用者的情況：

- 需求方向不清
- 產品流程要改
- 視覺風格要改
- 涉及正式金流 / escrow / listing fee
- 涉及正式 AI API / 真上傳 / API key
- 涉及正式價格 / PricingRule / BudgetEstimateLine.unit_price
- 涉及正式 Excel / PDF 輸出
- 需要刪除大量檔案、reset、clean、rebase、force push
- 需要合併或否決 PR 的最終裁決
- 任務會改變萊比產品定位

如果是技術問題，副指揮官應輸出：

- 技術判斷
- 建議交給哪個 workstream
- 最小修正 Issue 草稿
- 是否需要 Codex review

如果是需求問題，才輸出：

```md
# 需要指揮官裁決
```

## Current Global State

- GitHub repo `laibeoffer/laibe-mvp` 已建立。
- Codex environment 已建立。
- `main` 已作為整合主線。
- `main` latest sha: `57c81695977c4c18f87b02590469af4b89880ea8`.
- Open PR: PR #12 Add workstream issue template.
- 以下 PR 已 merged：
  - PR #1 site/page-formalization
  - PR #2 governance/codex-rules
  - PR #3 warehouse/raw-candidate
  - PR #4 warehouse/method-spec
  - PR #5 output/budget-documents, merge commit `9095a98`
  - PR #6 visual/simulation-governance
  - PR #7 Update workstream blackboard status, merge commit `b1e1aa4`
  - PR #8 Sync workstream blackboard after merge, merge commit `0f18099`
  - PR #9 Add Plancraft adapter candidate contract, merge commit `7ea4f8dc1a82599953ca66fed21666b58b99d012`
  - PR #10 Sync workstream registry with blackboard, merge commit `57c81695977c4c18f87b02590469af4b89880ea8`

## Workstream Status

### site/page-formalization

Branch:
`site/page-formalization`

Role:
LaiBE MVP Web Flow Builder collaborator. Owns landing, onboarding, header, CTA, routing, progress bar, back button, dashboard flow, and page connections.

Scope:
- `src/stitch_laibe_landing_onboarding/`
- `laibe_landing_desktop/code.html`
- `onboard_ai_agent/code.html`
- `preview_floor_plan/code.html`
- `preview_floor_plan/plan-puzzle.js`
- `preview_budget/code.html`
- `docs/CURRENT_PHASE_REVIEW_PACKET.md`

Current:
PR #1 merged. Website main flow remains handled manually by Commander + ChatGPT + Codex because visual judgment is required. `site/web-flow-routing` was checked before; whitelisted files had no diff from `main`, so no commit / PR was created.

Forbidden:
budget engine, raw warehouse, MethodSpec, output renderer, payment / escrow / listing fee, real AI API, real upload.

Last PR / Commit:
PR #1 merged.

Blocked:
None.

Next:
Wait for Commander-selected page or CTA / routing task.

Need Commander:
Yes, for page selection, visual direction, or product-flow decisions.

Need Reviewer:
No.

### governance/codex-rules

Branch:
`governance/codex-rules`

Role:
Codex rules, task templates, and workstream coordination.

Scope:
- `AGENTS.md`
- `docs/NEXT_CODEX_HANDOFF.md`
- `docs/USER_WORKING_STYLE.md`
- `docs/USER_IT_LIMITS.md`
- `docs/GITHUB_BRANCH_STRATEGY.md`
- `docs/CHATROOM_GITHUB_WORKSTREAMS.md`
- `docs/WORKSTREAM_BLACKBOARD.md`
- `templates/`

Current:
PR #2 merged. PR #7 merged. `docs/WORKSTREAM_BLACKBOARD.md` is established as the shared status board and initial handoff source for new chats.

Forbidden:
website pages, budget implementation, payment / escrow / listing fee, real AI API.

Last PR / Commit:
PR #7 merged, merge commit `b1e1aa4`.

Blocked:
None.

Next:
Only update when workflow rules or blackboard reporting discipline changes.

Need Commander:
Only for system-rule changes.

Need Reviewer:
No.

### warehouse/raw-candidate

Branch:
`warehouse/raw-candidate`

Role:
Raw Candidate Warehouse / raw material intake and review station.

Scope:
- `src/lib/budget/raw-warehouse/`
- `docs/budget/20-25 raw candidate` series

Current:
PR #3 merged. Owns RawCatalogSource, RawCatalogItem, Candidate, ReviewQueueItem, HandoffProposal, risk_flags, review queue, observed price safety, and import boundary guard. Candidate data only; no formal price output.

Forbidden:
formal price, PricingRule, MaterialSpec / LaborRule, `BudgetEstimateLine.unit_price`, renderer / Excel / PDF, BudgetOutputSnapshot, plan-puzzle, payment / escrow / listing fee.

Last PR / Commit:
PR #3 merged.

Blocked:
None.

Next:
Pause until next raw source quality task.

Need Commander:
No.

Need Reviewer:
No. Trigger only if formal price boundary is touched.

### warehouse/method-spec

Branch:
`warehouse/method-spec`

Role:
MethodSpec / MaterialSpec / LaborRule data-layer gatekeeper.

Scope:
- `src/lib/budget/specs/`
- MethodSpec / MaterialSpec / LaborRule / UnitConversion / InclusionExclusionRule
- validator policy
- docs/budget MethodSpec series

Current:
PR #4 merged. P0 validator hardening complete. P1-A / P1-B validator complete. MS-12 Reviewer result: PASS_WITH_NOTES.

Forbidden:
raw warehouse, renderer / output, frontend, formal budget engine pricing, payment / escrow / listing fee.

Last PR / Commit:
PR #4 merged.

Blocked:
None.

Next:
Pause until next MethodSpec validator / catalog task.

Need Commander:
No.

Need Reviewer:
No. Trigger only if formal price or BudgetEstimateLine boundary is touched.

### output/budget-documents

Branch:
`output/budget-documents`

Role:
BudgetOutputSnapshot to renderer / writer skeleton / dry-run output.

Scope:
- `src/lib/budget/output/`
- specified `src/lib/budget/renderers/` renderer / writer skeleton files
- `docs/budget/15-26 output` series

Current:
PR #5 merged. Codex review previously raised P2: output demo must not call `generateBudgetEstimate()`. Fixed as snapshot-only. No real xlsx/pdf output.

Forbidden:
rerun budget engine, decide prices, read pricing rules, modify MethodSpecCatalog, raw warehouse, frontend, plan-puzzle, real xlsx/pdf, payment / escrow / listing fee.

Last PR / Commit:
PR #5 merged, merge commit `9095a98`.

Blocked:
None.

Next:
Pause until next output logistics task.

Need Commander:
No.

Need Reviewer:
No. Trigger only if real Excel/PDF output boundary is touched.

### visual/simulation-governance

Branch:
`visual/simulation-governance`

Role:
AI style visual / image API spike / sandbox governance.

Scope:
- `docs/ai_style_visual_chat/`
- `templates/LAIBE_VISUAL_SIM_TASK_TEMPLATE.md`
- `skills/laibe-visual-sim/SKILL.md`

Current:
PR #6 merged. Governance docs, templates, and skill documentation only. Does not include `plan-puzzle.js`, Quote Factory, or PriceRange.

Forbidden:
real image API, API key, real AI API, Plancraft geometry, `plan-puzzle.js`, budget, raw warehouse, MethodSpec, renderer, payment / escrow / listing fee, or presenting simulations as construction drawings, formal design drawings, real cases, quote basis, or completion guarantees.

Last PR / Commit:
PR #6 merged.

Blocked:
None.

Next:
Pause unless visual simulation policy changes.

Need Commander:
Only if real image/API direction or visual/product direction is considered.

Need Reviewer:
No. Trigger only if API/runtime boundary is touched.

### plancraft/page-ui / plancraft/importer-ui

Branch:
`plancraft/page-ui`

Role:
LaiBE self-built floor plan importer UI / Plancraft+ page UI builder.

Scope:
- `src/stitch_laibe_landing_onboarding/preview_floor_plan/code.html`
- `src/stitch_laibe_landing_onboarding/preview_floor_plan/plan-puzzle.js`

Current:
Tracked / clean in `laibe-mvp` when last inventoried. This is LaiBE's own PNG / JPG / JPEG / PDF-entry floor-plan import and calibration tool, not the Plancraft fork and not the budget adapter. No PR is needed if there is no new diff.

Forbidden:
Plancraft core, formal estimate, renderer / Excel / PDF, DB / API / AI / payment.

Last PR / Commit:
No PR.

Blocked:
Awaiting explicit importer-ui / page-ui task.

Next:
Wait for explicit importer / canvas / CTA / routing task. Do not open empty PRs.

Need Commander:
Yes.

Need Reviewer:
No.

### plancraft/adapter-clean

Branch:
`plancraft/adapter-clean`

Role:
Plancraft+ draft JSON to budget-system candidate data adapter contract / spike.

Scope:
- `src/lib/budget/adapters/preview-floor-plan-adapter.ts`
- `src/lib/budget/types.ts`
- `src/lib/budget/demo-generate-budget-from-preview-floor-plan.ts`
- `docs/budget/plancraft-plus-production-adapter-design.md`

Current:
PR #9 merged into `main`. Adapter remains candidate-only: zones become Space candidates, openings become QuantityFact candidates, nodeGraph edges become wall fact candidates, `productionReady: false`, `formalEstimateAllowed: false`, and formal estimate guard remains blocked. Demo does not call `generateBudgetEstimate()`.

Forbidden:
Plancraft core, preview floor plan UI, formal estimate, formal `generateBudgetEstimate()` flow, `BudgetEstimateLine.unit_price`, renderer / Excel / PDF, raw warehouse, MethodSpec, DB / API / AI / upload backend, payment / escrow / listing fee.

Last PR / Commit:
PR #9 merged, merge commit `7ea4f8dc1a82599953ca66fed21666b58b99d012`.

Blocked:
None.

Next:
Wait for the next explicit adapter / importer / page-ui task. Do not self-start new construction.

Need Commander:
No.

Need Reviewer:
No. Trigger only if adapter touches formal estimate boundary or crosses workstreams.

### none-review-only / LAIBE_REVIEWER

Branch:
`none-review-only`

Role:
Read-only reviewer / audit role.

Scope:
- PR diff
- Codex reports
- `docs/CURRENT_PHASE_REVIEW_PACKET.md`
- `docs/NEXT_CODEX_HANDOFF.md`
- `AGENTS.md`
- `AI_RULES/*`

Current:
No GitHub branch required. Rules are in `main`. Reviewer remains sampling-based / risk-triggered, not scheduled for every task.

Forbidden:
implementation, file edits, refactors, feature work, product design, dispatch decisions.

Last PR / Commit:
N/A.

Blocked:
None.

Next:
Only respond when @reviewer is requested.

Need Commander:
Only if review escalates to product decision.

Need Reviewer:
N/A.

## External Workstream Status

### quote-factory/price-range-governance

Repo:
`laibeoffer/laibe-quote-factory`

Branch:
`main`

Role:
Quote Factory / raw quote cleaning workspace.

Scope:
- RawQuoteRow
- RawCatalogItem / RawCatalogSource
- PriceObservation
- PriceRange
- PriceRange Review Decision

Current:
Initial repo pushed.

Last PR / Commit:
Commit `c332d43c174e5f8b5816cceb5fbdc3ca5f708fd8`, `feat(quote-factory): add raw quote cleaning workspace`.

Forbidden:
formal price, formal PricingRule, `BudgetEstimateLine.unit_price`, modifying `C:\laibe_project`, Supabase, API / migration, Renderer / BudgetOutputSnapshot, payment / escrow / listing fee.

Blocked:
None.

Next:
Keep as external repo. Do not merge into `laibe-mvp` unless an explicit integration task is approved.

Need Commander:
No.

Need Reviewer:
No.

### external/plancraft-fork

Repo:
`laibeoffer/plancraft`

Original:
`pedroodb/plancraft`

License:
MIT License.

Local Path:
`C:\laibe_project\plancraft`

Role:
External fork / nested git repo / read-only reference for Plancraft behavior.

Current:
`plancraft/` is not a normal `laibe-mvp` folder and should not be submitted wholesale into `laibe-mvp`.

Last PR / Commit:
N/A for `laibe-mvp`.

Forbidden:
Do not commit the whole `plancraft/` folder into `laibe-mvp`; do not mix Plancraft fork work with LaiBE importer UI or budget adapter PRs; preserve third-party attribution / license note if formally referenced later.

Blocked:
None.

Next:
Use read-only unless a separate Plancraft fork task is explicitly approved.

Need Commander:
No.

Need Reviewer:
No.

## Dispatch Queue

### READY

- [ ] plancraft/adapter-clean — next explicit adapter / importer / page-ui task
  - Status: proposed placeholder, not started
  - Workstream: plancraft/adapter-clean
  - Need Commander: no unless product flow, visual interaction, or formal estimate strategy changes

### NEEDS REVIEW

- [ ] None

### BLOCKED

- [ ] None

## Update Log

### 2026-05-24 — deputy-codex

Changed:
- Added Issue / Blackboard / Heartbeat Patrol Rules to the blackboard.
- Recorded that Deputy Codex dispatch must include `To`, `Workstream`, `Branch / Repo`, `Mission`, `Why this agent`, `Action`, `Need Commander`, and `Need Reviewer`.
- Clarified that thread heartbeat only wakes the current chatroom; each workstream needs its own heartbeat automation to patrol itself.
- Added pointer to `docs/ISSUE_BLACKBOARD_PATROL_WORKFLOW.md`.
- Synced global state after PR #10 merge and PR #12 opening.

Files:
- `docs/WORKSTREAM_BLACKBOARD.md`
- `docs/CHATROOM_GITHUB_WORKSTREAMS.md`
- `docs/ISSUE_BLACKBOARD_PATROL_WORKFLOW.md`

PR / Commit:
- Governance PR pending.

Next:
- After this governance PR passes Codex review, merge it if changed files stay limited to governance docs.

### 2026-05-24 — deputy-codex

Changed:
- Synced blackboard after PR #9 merge: `main` latest sha `7ea4f8dc1a82599953ca66fed21666b58b99d012`, open PR None, PR #9 merged with merge commit `7ea4f8dc1a82599953ca66fed21666b58b99d012`.
- Marked `plancraft/adapter-clean` as merged into `main`; next adapter / importer / page-ui work remains proposed placeholder / not started.
- Added Quote Factory as external repo / external workstream: `laibeoffer/laibe-quote-factory`.
- Added Plancraft fork as external fork / read-only reference: `laibeoffer/plancraft`, original `pedroodb/plancraft`, MIT License.
- Synced blackboard after PR #7 merge: `main` latest sha `b1e1aa4`, open PR None, PR #7 merged with merge commit `b1e1aa4`.
- Kept `plancraft/adapter-clean` as proposed / not started.
- Filled initial handoff status for all known workstreams from chatroom self-introductions.
- Added Role, Scope, Current, Last PR / Commit, Blocked, Next, Need Commander, and Need Reviewer fields for each workstream.
- Added concise Forbidden boundaries so new chats can identify their own scope without relying on old chat memory.

Files:
- `docs/WORKSTREAM_BLACKBOARD.md`

PR / Commit:
- PR #9 merged; latest main `7ea4f8dc1a82599953ca66fed21666b58b99d012`.

Next:
- Wait for next explicit adapter / importer / page-ui task; do not self-start new construction.

### 2026-05-24 — system

Changed:
- Established merged GitHub workstreams for governance, raw warehouse, MethodSpec, output documents, and visual simulation governance.
- Added Deputy Technical Judgment Rules: technical GitHub / branch / PR / staging / workstream routing decisions should be handled by Deputy Codex; only product, business, visual, high-risk, destructive, or final PR裁決 issues escalate to Commander.
- Synced blackboard short status: `main` latest sha `9095a98`, open PR None, PR #5 merged with merge commit `9095a98`, and `plancraft/adapter` remains READY / not approved.

Files:
- GitHub PR history

PR / Commit:
- PR #1 through PR #6 merged; main `9095a98`

Next:
- Establish blackboard reporting discipline before starting next build task.
