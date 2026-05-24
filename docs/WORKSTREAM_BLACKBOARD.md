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

### Active Deputy Authority

- Active Deputy Codex: this Commander thread.
- Previous / secondary Deputy chatroom: offline.
- Operational rule: do not wait for another Deputy before publishing patrol decisions, workstream dispatches, blackboard status updates, or GitHub/Issue/PR routing decisions.
- If another Deputy returns later, it must read this blackboard first and avoid overwriting active patrol decisions unless the Commander explicitly reassigns authority.

## Mandatory Read Rules By Chatroom

所有聊天室的 heartbeat / read-only 巡查都必須先讀文件，再判斷狀態。資料夾名稱只代表範圍，不代表已讀取內容；若指令列出資料夾，聊天室必須展開並讀取該資料夾內的相關檔案。若檔案在本地不存在，先查 GitHub `origin/main`；仍不存在才回報 `MISSING`，不得自行腦補。

全聊天室共同必讀：
- `AGENTS.md`
- `docs/WORKSTREAM_BLACKBOARD.md`
- `docs/CHATROOM_GITHUB_WORKSTREAMS.md`
- `docs/GITHUB_BRANCH_STRATEGY.md`
- `docs/NEXT_CODEX_HANDOFF.md`
- `docs/USER_WORKING_STYLE.md`
- `docs/USER_IT_LIMITS.md`

副指揮官 / command-deputy 必讀：
- 全聊天室共同必讀文件
- `docs/ISSUE_BLACKBOARD_PATROL_WORKFLOW.md`
- `docs/DEPUTY_CODEX_CHAT_EXPORT_2026-05-24.txt`，若存在
- GitHub open PR / open Issue / main SHA / Codex review comments

網站主流程 Builder0522 / site-page-formalization 必讀：
- 全聊天室共同必讀文件
- `AI_RULES/UX_FLOW_REVIEW_RULES.md`
- `AI_RULES/PAGE_REGISTRY.md`
- `AI_RULES/CTA_FLOW_MAP.md`
- `AI_RULES/LAIBE_WEB_FLOW_BUILDER_RULES.md`
- `docs/LAIBE_CORE_POSITIONING.md`
- `docs/EDITING_MAP.md`
- `docs/PROJECT_RULES.md`
- `docs/ABOUT_LAIBE_QA_SOURCE.md`

平面拼圖 / plancraft-page-ui / plancraft-adapter-clean 必讀：
- 全聊天室共同必讀文件
- `src/stitch_laibe_landing_onboarding/preview_floor_plan/code.html`
- `src/stitch_laibe_landing_onboarding/preview_floor_plan/plan-puzzle.js`
- `docs/budget/plancraft-plus-production-adapter-design.md`
- `src/lib/budget/adapters/preview-floor-plan-adapter.ts`，只在 adapter 任務讀取
- `src/lib/budget/types.ts`，只在 adapter / type 任務讀取
- `src/lib/budget/demo-generate-budget-from-preview-floor-plan.ts`，只在 adapter demo 任務讀取

原物料採購與倉儲 / warehouse-raw-candidate 必讀：
- 全聊天室共同必讀文件
- `docs/budget/20-raw-candidate-warehouse-plan.md`
- `docs/budget/21-raw-candidate-contract-hardening.md`
- `docs/budget/22-raw-review-contract-safety-validator.md`
- `docs/budget/23-raw-data-feeding-trial.md`
- `docs/budget/24-raw-multi-source-fixtures.md`
- `docs/budget/25-raw-negative-source-quality-fixtures.md`

配件倉庫：工法與規格 / warehouse-method-spec 必讀：
- 全聊天室共同必讀文件
- `docs/budget/20-method-spec-to-budget-output-boundary.md`
- `docs/budget/21-method-spec-catalog-inventory-report.md`
- `docs/budget/22-method-spec-validator-hardening.md`
- `docs/budget/23-method-spec-validator-reviewer-pass.md`
- `docs/budget/24-method-spec-validator-p1-plan.md`
- `docs/budget/25-method-spec-validator-p1-implementation.md`
- `docs/budget/26-method-spec-validator-p1-reviewer-pass.md`
- `docs/budget/27-method-spec-validator-p1b-plan.md`
- `docs/budget/28-method-spec-validator-p1b-implementation.md`
- `docs/budget/30-method-spec-scope-coverage-implementation.md`
- `docs/budget/31-method-spec-p1b-reviewer-pass.md`

成品物流：預算表單輸出 / output-budget-documents 必讀：
- 全聊天室共同必讀文件
- `docs/budget/15-budget-output-logistics.md`
- `docs/budget/16-budget-output-snapshot-and-material-alignment.md`
- `docs/budget/18-renderer-gate-and-legacy-output-guard.md`
- `docs/budget/19-excel-pdf-renderer-skeleton.md`
- `docs/budget/20-renderer-contract-hardening.md`
- `docs/budget/21-formal-excel-pdf-layout-contract.md`
- `docs/budget/22-formal-renderer-entry-contract.md`
- `docs/budget/23-formal-file-writer-preflight.md`
- `docs/budget/24-renderer-artifact-policy.md`
- `docs/budget/25-file-writer-dry-run-contract.md`
- `docs/budget/26-formal-file-writer-controlled-entry.md`

模擬圖生成 / visual-simulation-governance 必讀：
- 全聊天室共同必讀文件
- `AI_RULES/LAIBE_VISUAL_SIM_RULES.md`
- `docs/LAIBE_VISUAL_SIM_CHATROOM.md`
- `docs/ai_style_visual_chat/GENERATED_IMAGE_STORAGE_POLICY.md`
- `docs/ai_style_visual_chat/IMAGE_API_REQUEST_SCHEMA.md`
- `docs/ai_style_visual_chat/IMAGE_API_SPIKE_GOVERNANCE.md`
- `docs/ai_style_visual_chat/IMAGE_API_SPIKE_REVIEW_CHECKLIST.md`
- `docs/ai_style_visual_chat/PROMPT_SANITIZATION_RULES.md`
- `docs/ai_style_visual_chat/REFERENCE_IMAGE_POLICY.md`
- `templates/LAIBE_VISUAL_SIM_TASK_TEMPLATE.md`
- `skills/laibe-visual-sim/SKILL.md`

預算原料清洗工廠 / quote-factory-price-range-governance 必讀：
- Quote Factory repo `laibeoffer/laibe-quote-factory` 內的 QF5.2 baseline files: `docs/price_range_review_decision_contract.md`, `configs/price_range_review_decision_rules.json`, `scripts/apply_sample_price_range_review_decisions.py`, `review_queue/sample_price_range_review_decisions.json`, `exports_to_raw_warehouse/sample_price_ranges_reviewed.json`, `scripts/validate_sample_cloud_payload.py`
- Quote Factory repo `laibeoffer/laibe-quote-factory` 內的 QF5.3 files，若存在: `docs/price_range_review_audit_override.md`, `configs/price_range_override_rules.json`, `scripts/apply_price_range_review_overrides.py`, `review_queue/sample_price_range_review_overrides.json`, `exports_to_raw_warehouse/sample_price_ranges_reviewed_with_audit.json`, `review_queue/sample_price_range_review_audit_log.json`
- Quote Factory repo `laibeoffer/laibe-quote-factory` 內的 roadmap files，若存在: `docs/quote_factory_roadmap.md`, `docs/quote_factory_definition_of_done.md`, `docs/quote_factory_phase_index.md`
- 若 QF5.3 files 或 roadmap files 不存在，回報 `MISSING` 並停在 verify / publish，不得直接把 QF5.4 當成 active
- `laibeoffer/laibe-mvp` 的 `docs/WORKSTREAM_BLACKBOARD.md`，只用來同步狀態，不得把 Quote Factory 成果塞進主 repo

審查官聊天室 / LAIBE_REVIEWER 必讀：
- 全聊天室共同必讀文件
- `AI_RULES/LAIBE_REVIEWER_RULES.md`
- `AI_RULES/REVIEW_CHECKLIST.md`
- `AI_RULES/PHASE_REVIEW_RULES.md`
- `docs/CURRENT_PHASE_REVIEW_PACKET.md`
- 被審查 Builder 回報中列出的所有 changed files

Codex 指令優化 / governance-codex-rules 必讀：
- 全聊天室共同必讀文件
- `AI_RULES/SYSTEM_ARCHITECTURE.md`
- `AI_RULES/CODEX_MANDATORY_ENTRY.md`
- `AI_RULES/FILE_OWNERSHIP_RULES.md`
- `AI_RULES/HANDOFF_RULES.md`
- `AI_RULES/TASK_DISPATCH_RULES.md`
- `AI_RULES/LAIBE_BUILDER_RULES.md`
- `AI_RULES/LAIBE_REVIEWER_RULES.md`
- `AI_RULES/PHASE_REVIEW_RULES.md`

LOGO / brand-visual 聊天室必讀，若啟用：
- 全聊天室共同必讀文件
- `docs/LAIBE_CORE_POSITIONING.md`
- `docs/ABOUT_LAIBE_QA_SOURCE.md`
- `assets/logo/laibe.svg`
- `assets/logo/laibe_offer.svg`
- `assets/logo/offer.svg`

盤點 Git/GitHub 狀態聊天室必讀，若啟用：
- 全聊天室共同必讀文件
- `docs/GITHUB_BRANCH_STRATEGY.md`
- GitHub repo `laibeoffer/laibe-mvp` open PR / open Issue / main SHA
- GitHub repo `laibeoffer/laibe-quote-factory` open PR / open Issue / main SHA，僅在 Quote Factory 狀態相關時讀取

## Reporting Rules

### Blackboard Language Policy

The blackboard may be maintained fully in English. Workstream heartbeat reports, dispatches, status updates, and completion reports may also be required to answer in English when the purpose is blackboard publication or cross-chatroom automation.

Default language rule:
- User-facing replies to the Commander may remain Traditional Chinese unless the Commander asks otherwise.
- Blackboard entries should prefer concise English operational language for easier parsing across chatrooms.
- Workstream chatrooms may be instructed: "Reply in English using the blackboard short format."
- Keep file paths, branch names, repo names, PR / Issue numbers, enum values, status codes, guard names, and function names exact; do not translate them.
- Chinese workstream display names may remain beside English workstream ids when helpful, for example `平面拼圖 / plancraft/page-ui`.
- If a chatroom produces a Chinese report, Deputy Codex may normalize it into English before publishing it to this blackboard, as long as the meaning and risk boundaries are preserved.

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

### Blackboard Publication Enforcement

聊天室內的完成回報不等於正式交付。所有工作線只要有新成果、新阻塞、新風險、新 PR / Issue、狀態變更、Need Commander / Need Reviewer 變更，必須把短格式成果貼回本黑板的對應 workstream 狀態或 `Update Log`。若只是 heartbeat 且沒有變更，可以回報「本輪無黑板更新」。

平面拼圖目前已有新報告；平面拼圖聊天室必須將該報告用本黑板短格式補貼到 `Update Log`，不得只留在聊天室對話中。

### Task Preview Backlog Enforcement

各聊天室不得因為沒有 open PR / open Issue 就發呆。Commander 已提供「任務預告」作為候選任務清單；沒有新的 GitHub 派工時，各聊天室必須回到自己的任務預告，找出下一個安全、低風險、符合本 workstream 的候選任務，並先發布 `UPCOMING_PHASE_DECLARED` 與 GitHub Issue draft / claim。實作型修改仍必須等 GitHub Issue 或 Commander 明確正式派工；任務預告本身不是繞過 Issue 的施工授權。只有以下情況可以停下：
- 任務碰到正式 payment / escrow / listing fee。
- 任務碰到真 AI API / API key / 真上傳。
- 任務碰到正式價格 / PricingRule / `BudgetEstimateLine.unit_price`。
- 任務碰到正式 Excel / PDF 對外輸出。
- 任務要求 destructive git / 大量刪除 / reset / clean / force-push。
- 任務缺少產品方向、視覺方向、商業邏輯裁決。
- 任務預告中沒有本聊天室的下一步，必須回報 `TASK_PREVIEW_MISSING`，不得安靜 standby。

「Standby」只能用於沒有任務預告、任務被 blocker 擋住、或任務需要 Commander/Reviewer 的情況；回報時必須寫清楚為什麼不能繼續。若任務只是文件、候選資料、validator、sandbox governance、read-only review packet、或不碰正式高風險邊界，應依任務預告準備 formal Issue / blackboard dispatch；只有在 GitHub Issue 或 Commander 明確正式派工存在時，才開始會改檔的施工。

### Upcoming Phase Declaration Rule

Every workstream heartbeat must declare its next phase from the Commander-provided task preview before claiming standby.

Required behavior:
- Do not reply only with "no new PR / no new Issue / standby."
- Read this blackboard and the task preview backlog.
- Identify the next safe phase that belongs to the current workstream.
- Publish an `UPCOMING_PHASE_DECLARED` entry to this blackboard before requesting / claiming the formal Issue, starting read-only preparation, or reporting blocked.
- If the next phase is safe and inside the workstream boundary but no GitHub Issue or Commander formal dispatch exists, publish a concise Issue draft / claim instead of starting implementation.
- File-changing implementation starts only after a GitHub Issue exists or the Commander explicitly provides a formal dispatch for that workstream.
- If the next phase cannot proceed, report the exact blocker using `BLOCKED_BY_COMMANDER_DECISION`, `BLOCKED_BY_REVIEWER_TRIGGER`, `BLOCKED_BY_HIGH_RISK_SCOPE`, `BLOCKED_BY_MISSING_TASK_PREVIEW`, or `BLOCKED_BY_SCOPE_MISMATCH`.

Required upcoming-phase short format:
- Workstream:
- Branch / Repo:
- Task Preview Source:
- Upcoming Phase / Task:
- Why this phase:
- Can Proceed: Yes / No
- First Action:
- Allowed Files / Repo:
- Stop Conditions:
- Blocked:
- Need Commander:
- Need Reviewer:

Current required upcoming-phase declarations:
- `plancraft/page-ui` / `plancraft/adapter-clean`: declare `Plancraft+ Zone Area / Boundary Refinement`, then claim or request the matching formal Issue before implementation.
- `warehouse/method-spec`: declare `MethodSpec validator freeze note`, target `docs/budget/32-method-spec-validator-freeze-note.md`.
- `warehouse/raw-candidate`: declare `R1.5 source quality scoring / reviewer checklist` or the next raw warehouse candidate-intake doc task.
- `output/budget-documents`: declare `renderer snapshot-only review packet / static guard next step`; no real `.xlsx` / `.pdf`.
- `visual/simulation-governance`: declare the next visual brief / prompt / sandbox governance phase; no real image API or API key.
- `quote-factory/price-range-governance`: declare QF5.3 verify / publish, then QF5.4 only after QF5.3 exists in `laibeoffer/laibe-quote-factory`.
- `site/page-formalization`: if no Commander-selected page / CTA / routing task exists, declare `TASK_PREVIEW_MISSING` and do not invent product direction.
- `governance/codex-rules`: declare the next blackboard / Issue workflow / heartbeat prompt / workstream registry governance task.

目前任務預告對應的下一步：
- 平面拼圖 / `plancraft/page-ui` / `plancraft/adapter-clean`: 宣告 `Plancraft+ Zone Area / Boundary Refinement` 並 claim / request formal Issue；完成後再依序處理 `Production Quantity Fact Contract`，但 formal estimate 仍 blocked。
- 配件倉庫：工法與規格 / `warehouse/method-spec`: MS-12 已是 `PASS_WITH_NOTES`；下一步宣告 `docs/budget/32-method-spec-validator-freeze-note.md` 並 claim / request formal Issue。若需要新增 catalog / formal price，才停下。
- 原物料採購與倉儲 / `warehouse/raw-candidate`: 宣告 R1.5 source quality scoring / reviewer checklist，或 Raw Warehouse architecture / intake pipeline 候選文件，並 claim / request formal Issue；不得產生正式價格。
- 成品物流：預算表單輸出 / `output/budget-documents`: 宣告 renderer snapshot-only review packet、renderer static guard / import denylist、或 placeholder writer hardening，並 claim / request formal Issue；不得產生正式 `.xlsx` / `.pdf` 對外輸出。
- 模擬圖生成 / `visual/simulation-governance`: 宣告 visual brief / prompt / negative prompt / sandbox governance / storage policy / reviewer packet，並 claim / request formal Issue；不得接真 image API、API key、backend production runtime。
- 預算原料清洗工廠 / `quote-factory/price-range-governance`: 先宣告 verify / publish QF5.3 並在 Quote Factory repo claim / request formal Issue；若缺 roadmap，建立 Quote Factory roadmap / definition of done / phase index；不得修改 `laibeoffer/laibe-mvp`，不得產生正式價格。
- 網站主流程 Builder0522 / `site/page-formalization`: 若任務預告沒有指定頁面，回報 `TASK_PREVIEW_MISSING` 並等待 Commander 指定 page / CTA / routing / visual flow；不得自行改產品方向。
- Codex 指令優化 / `governance/codex-rules`: 繼續補齊黑板、Issue workflow、heartbeat prompt、workstream registry 與任務治理文件。

以下聊天室均被點名遵守：
- 平面拼圖 / `plancraft/page-ui` / `plancraft/adapter-clean`
- 配件倉庫：工法與規格 / `warehouse/method-spec`
- 原物料採購與倉儲 / `warehouse/raw-candidate`
- 成品物流：預算表單輸出 / `output/budget-documents`
- 模擬圖生成 / `visual/simulation-governance`
- 網站主流程 Builder0522 / `site/page-formalization`
- 預算原料清洗工廠 / `quote-factory/price-range-governance`
- Codex 指令優化 / `governance/codex-rules`
- LOGO / `brand-visual`，若啟用
- 審查官聊天室 / `LAIBE_REVIEWER`，只在有實際審查結果時貼 PASS / PASS_WITH_NOTES / NEEDS_FIX / BLOCKED

每次貼黑板必須使用短格式：
- Workstream:
- Branch / Repo:
- Status:
- Changed:
- Files:
- PR / Commit:
- Blocked:
- Next:
- Need Commander:
- Need Reviewer:

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
- `main` latest sha: `ce584e822f1d6a9fc65c21b0753f6c85896e202f`.
- Open PR: None.
- Open Issue: None.
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
  - PR #12 Add workstream issue template, merge commit `157c75520b31b37c81b67b7f7082c7e03e968fec`
  - PR #13 Define issue blackboard patrol workflow, merge commit `ce584e822f1d6a9fc65c21b0753f6c85896e202f`

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
PR #3 merged. Owns RawCatalogSource, RawCatalogItem, Candidate, ReviewQueueItem, HandoffProposal, risk_flags, review queue, observed price safety, and import boundary guard. Candidate data only; no formal price output. Phase R1.4 negative / source-quality fixtures completed: missing fields, negative observed price, outliers, unit mismatch, duplicate source-period rows, missing model/spec, low reliability, and ambiguous raw names are flagged or blocked without producing formal prices.

Forbidden:
formal price, PricingRule, MaterialSpec / LaborRule, `BudgetEstimateLine.unit_price`, renderer / Excel / PDF, BudgetOutputSnapshot, plan-puzzle, payment / escrow / listing fee.

Last PR / Commit:
PR #3 merged.

Blocked:
None.

Next:
Pause until next raw source quality scoring / reviewer checklist task.

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
PR #4 merged. P0 validator hardening complete. P1-A / P1-B validator complete. MS-12 Reviewer result: PASS_WITH_NOTES. P1-B reviewer confirmed UnitConversion coverage and Inclusion / Exclusion scope coverage guards pass; MS-5 / MS-8 pricing guard regressions pass; budget regression remains total `231103`, line count `12`, review-required line count `5`. PASS_WITH_NOTES is due to dirty repo baseline, not a detected boundary failure.

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
PR #6 merged. Governance docs, templates, and skill documentation only. Does not include `plan-puzzle.js`, Quote Factory, PriceRange, raw warehouse, MethodSpec, or output renderer work. Minimal Real Server Runtime Spike result is recorded as sandbox-only governance status: route B, no backend runtime, no proxy stub, no real image API, no API key / `.env`, disabled adapter / fallback only, and no production asset pipeline.

Forbidden:
real image API, API key, real AI API, Plancraft geometry, `plan-puzzle.js`, budget, raw warehouse, MethodSpec, renderer, payment / escrow / listing fee, or presenting simulations as construction drawings, formal design drawings, real cases, quote basis, or completion guarantees.

Last PR / Commit:
PR #6 merged.

Blocked:
None.

Next:
Pause unless visual simulation policy changes. If continuing toward real server runtime, first decide a scoped local same-origin proxy spike and keep it disabled-by-default / no-secret / no-production. If Quote Factory, PriceRange, warehouse, renderer, or Plancraft implementation reports appear in this chatroom, mark them as wrong-workstream input and route them back to the correct workstream.

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
PR #9 merged into `main`. Adapter remains candidate-only: zones become Space candidates, openings become QuantityFact candidates, nodeGraph edges become wall fact candidates, `productionReady: false`, `formalEstimateAllowed: false`, and formal estimate guard remains blocked. Demo does not call `generateBudgetEstimate()`. Production Adapter Design Doc is recorded at `docs/budget/plancraft-plus-production-adapter-design.md`; it defines the future production contract, guard model, reviewer gates, downstream safety rules, and migration plan while keeping the current adapter non-production.

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
QF5.2 PriceRange Review Decision Contract completed and published. PriceRange review decisions remain candidate-governance metadata only; `approved_for_cloud` means cloud-ready candidate statistics, not formal price approval.

Last PR / Commit:
Commit `c332d43c174e5f8b5816cceb5fbdc3ca5f708fd8`, `feat(quote-factory): add raw quote cleaning workspace`.

Forbidden:
formal price, formal PricingRule, `BudgetEstimateLine.unit_price`, modifying GitHub repo `laibeoffer/laibe-mvp`, Supabase, API / migration, Renderer / BudgetOutputSnapshot, payment / escrow / listing fee.

Blocked:
None.

Next:
Keep as external repo. Next suggested step is QF5.3 review decision audit / override governance, still without merging into `laibe-mvp` unless an explicit integration task is approved.

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

Reference Location:
GitHub repo `laibeoffer/plancraft`. Local clones are not authoritative dispatch targets.

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

## Member Report Decision Basis

Deputy Codex decisions are made from member chatroom work reports first. GitHub and this blackboard are the verification and publication surfaces, not the only audience.

Per patrol, Deputy Codex must:
- Identify the reporting chatroom / agent.
- Judge whether that member report means standby, ready, blocked, needs-review, or needs commander.
- Publish a direct next-step decision back to the blackboard.
- Produce sendable prompts only for member workrooms, not for Deputy Codex itself.
- Exclude Reviewer from the send list unless reviewer trigger rules are met.

Current member-goal interpretation:
- 配件倉庫：工法與規格: Protect MethodSpec / MaterialSpec / LaborRule boundaries. Latest blackboard says MS-12 is already PASS_WITH_NOTES; next preview task is `docs/budget/32-method-spec-validator-freeze-note.md`, not silent standby.
- 原物料採購與倉儲: Build raw candidate warehouse safety. Latest completed step is R1.4 negative / source-quality fixtures; next preview task is R1.5 source quality scoring / reviewer checklist or raw warehouse architecture / intake candidate docs.
- 成品物流：預算表單輸出: Output only from BudgetOutputSnapshot. Phase 3.5 controlled writer entry is complete; next preview task is renderer snapshot-only review packet, renderer static guard / import denylist, or placeholder writer hardening without real `.xlsx` / `.pdf`.
- 平面拼圖: Keep Plancraft+ importer UI, adapter-clean, and external Plancraft fork separate. Commander has now authorized the scoped `Plancraft+ Zone Area / Boundary Refinement` Builder task with Reviewer skipped for this round.
- 預算原料清洗工廠: External Quote Factory protects raw quote / PriceRange candidate governance. QF5.3 report was misrouted through Visual Simulation; Quote Factory must verify/publish QF5.3 on GitHub before QF5.4 becomes active.
- 模擬圖生成: Visual simulation remains sandbox governance / brief / prompt support only. No real image API, API key, backend runtime, production asset, construction drawing, formal design drawing, quote basis, or completion guarantee.

### READY

- [ ] plancraft/page-ui / plancraft/adapter-clean — Plancraft+ Zone Area / Boundary Refinement
  - Status: ISSUE_READY. This workstream must publish `UPCOMING_PHASE_DECLARED` and claim/request the formal GitHub Issue before any file-changing implementation.
  - Workstream: plancraft/page-ui / plancraft/adapter-clean
  - Need Commander: no unless product flow, visual interaction, budget adapter/type changes, or formal estimate strategy changes
- [ ] warehouse/raw-candidate — R1.5 source quality scoring / reviewer checklist
  - Status: ISSUE_READY preview backlog task; claim/request formal Issue before file-changing implementation
  - Workstream: warehouse/raw-candidate
  - Need Commander: no unless formal pricing boundary changes
- [ ] warehouse/method-spec — MethodSpec validator freeze note
  - Status: ISSUE_READY preview backlog task after MS-12 PASS_WITH_NOTES; claim/request formal Issue before file-changing implementation
  - Workstream: warehouse/method-spec
  - File target: `docs/budget/32-method-spec-validator-freeze-note.md`
  - Need Commander: no unless formal price / PricingRule / budget line authority changes
- [ ] output/budget-documents — renderer snapshot-only review packet / static guard next step
  - Status: ISSUE_READY preview backlog task; claim/request formal Issue before file-changing implementation and do not produce real `.xlsx` / `.pdf`
  - Workstream: output/budget-documents
  - Need Commander: no unless formal Excel / PDF or product-facing output decisions are requested
- [ ] quote-factory/price-range-governance — QF5.3 verify / publish, then QF5.4 next
  - Status: ISSUE_READY in external repo. QF5.3 report received but must be owned by Quote Factory and verified on GitHub; report status to Deputy for blackboard sync.
  - Repo: laibeoffer/laibe-quote-factory
  - Need Commander: no unless external repo integration into laibe-mvp is requested

### ACTIVE TASK DISPATCHES

These dispatches convert the Commander task preview backlog into issue-ready work orders. Every named chatroom must publish `UPCOMING_PHASE_DECLARED`, claim or request a formal GitHub Issue, or report a concrete blocker. No chatroom may claim silent standby only because there is no open PR or Issue. Blackboard dispatches are coordination records, not full implementation specs.

- [ ] To: 平面拼圖 / Plan Puzzle
  - Workstream: plancraft/page-ui / plancraft/adapter-clean
  - Branch / Repo: plancraft/zone-area-boundary-refinement / laibeoffer/laibe-mvp
  - Mission: Prepare the formal work order for Phase 1 `Plancraft+ Zone Area / Boundary Refinement`.
  - Why this agent: Owns LaiBE importer UI and zone boundary geometry. Does not own Plancraft core or budget runtime.
  - Action: Publish `UPCOMING_PHASE_DECLARED` and claim/request a GitHub Issue using the Commander task preview as the implementation source. Do not start file-changing implementation until the Issue or Commander formal dispatch exists.
  - Allowed files: `src/stitch_laibe_landing_onboarding/preview_floor_plan/plan-puzzle.js`, `src/stitch_laibe_landing_onboarding/preview_floor_plan/code.html`, `docs/CURRENT_PHASE_REVIEW_PACKET.md`, `docs/NEXT_CODEX_HANDOFF.md`.
  - Stop if: budget adapter/types/runtime, Plancraft core, formal estimate, Excel/PDF, DB/API, AI API, payment/escrow/listing fee, package/framework/install, `formalEstimateGuard` weakening, or `generateBudgetEstimate` acceptance of Plancraft+ spike is required.
  - Need Commander: No.
  - Need Reviewer: No.

- [ ] To: 配件倉庫：工法與規格 / Method Spec Warehouse
  - Workstream: warehouse/method-spec
  - Branch / Repo: warehouse/method-spec-validator-freeze-note / laibeoffer/laibe-mvp
  - Mission: Prepare the formal work order for `MethodSpec validator freeze note`.
  - Why this agent: Owns MethodSpec / MaterialSpec / LaborRule boundaries and validator policy history.
  - Action: Publish `UPCOMING_PHASE_DECLARED` and claim/request a GitHub Issue for the freeze-note doc. Keep the implementation source in the Issue, not expanded inside this blackboard.
  - Allowed files: `docs/budget/32-method-spec-validator-freeze-note.md`, `docs/NEXT_CODEX_HANDOFF.md`, `docs/CURRENT_PHASE_REVIEW_PACKET.md`.
  - Stop if: runtime code, data model expansion, formal price, renderer/output, raw warehouse, Plancraft, frontend, payment, or AI API work is required.
  - Need Commander: No.
  - Need Reviewer: No.

- [ ] To: 原物料採購與倉儲 / Raw Candidate Warehouse
  - Workstream: warehouse/raw-candidate
  - Branch / Repo: warehouse/raw-source-quality-scoring / laibeoffer/laibe-mvp
  - Mission: Prepare the formal work order for R1.5 source quality scoring / reviewer checklist.
  - Why this agent: Owns raw candidate intake, source traceability, and candidate-only material evidence before formal pricing.
  - Action: Publish `UPCOMING_PHASE_DECLARED` and claim/request a GitHub Issue for candidate-only source quality scoring. Keep all outputs candidate-only and keep formal pricing blocked.
  - Allowed files: `src/lib/budget/raw-warehouse/`, `docs/budget/26-raw-source-quality-scoring-reviewer-checklist.md`, `docs/NEXT_CODEX_HANDOFF.md`, `docs/CURRENT_PHASE_REVIEW_PACKET.md`.
  - Stop if: `PricingRule`, `MaterialSpec`, `LaborRule`, `BudgetEstimateLine.unit_price`, renderer/output, frontend, payment, DB/API, AI API, or formal price authority is required.
  - Need Commander: No.
  - Need Reviewer: No.

- [ ] To: 成品物流：預算表單輸出 / Output Documents
  - Workstream: output/budget-documents
  - Branch / Repo: output/renderer-static-guard-review-packet / laibeoffer/laibe-mvp
  - Mission: Prepare the formal work order for renderer snapshot-only review packet / static guard next step.
  - Why this agent: Owns BudgetOutputSnapshot-to-renderer boundaries and placeholder writer safety, not pricing or MethodSpec decisions.
  - Action: Publish `UPCOMING_PHASE_DECLARED` and claim/request a GitHub Issue for the snapshot-only / static-guard task. Preserve the rule that output reads `BudgetOutputSnapshot` or snapshot-gated `RenderedBudgetDocument` only.
  - Allowed files: `src/lib/budget/renderers/`, `docs/budget/27-renderer-snapshot-only-review-packet.md`, `docs/NEXT_CODEX_HANDOFF.md`, `docs/CURRENT_PHASE_REVIEW_PACKET.md`.
  - Stop if: real `.xlsx` / `.pdf`, budget engine rerun, pricing rules, material resolver, MethodSpecCatalog changes, formal output decisions, payment, DB/API, or AI API work is required.
  - Need Commander: No unless formal output format or user-facing document behavior is requested.
  - Need Reviewer: No.

- [ ] To: 模擬圖生成 / Visual Simulation
  - Workstream: visual/simulation-governance
  - Branch / Repo: visual/brief-prompt-sandbox-governance / laibeoffer/laibe-mvp
  - Mission: Prepare the formal work order for visual brief / prompt / negative prompt / sandbox governance packet.
  - Why this agent: Owns visual simulation governance, visual brief structure, prompt hygiene, and image sandbox policy only.
  - Action: Publish `UPCOMING_PHASE_DECLARED` and claim/request a GitHub Issue for the visual governance packet. Keep real image API/API key/backend/storage production work blocked.
  - Allowed files: `docs/ai_style_visual_chat/`, `templates/LAIBE_VISUAL_SIM_TASK_TEMPLATE.md`, `skills/laibe-visual-sim/SKILL.md`, `docs/NEXT_CODEX_HANDOFF.md`, `docs/CURRENT_PHASE_REVIEW_PACKET.md`.
  - Stop if: real image API, API key, backend/proxy, upload/storage production integration, production asset, construction drawing, formal design drawing, quote basis, site runtime code, payment, or non-visual workstream content is required.
  - Need Commander: No unless visual direction, real API, or storage policy decision is required.
  - Need Reviewer: No.

- [ ] To: 預算原料清洗工廠 / Quote Factory
  - Workstream: quote-factory/price-range-governance
  - Branch / Repo: qf/qf5-3-audit-override-publish / laibeoffer/laibe-quote-factory
  - Mission: Prepare the formal work order to verify/publish QF5.3, then prepare QF5.4 only after QF5.3 is visible in the external repo.
  - Why this agent: Owns PriceRange candidate governance in the external Quote Factory repo. This is not Visual Simulation and not `laibe-mvp` implementation work.
  - Action: Publish `UPCOMING_PHASE_DECLARED` and claim/request a GitHub Issue in `laibeoffer/laibe-quote-factory`. Verify QF5.3 before QF5.4; keep formal price blocked. Report the short status back to Deputy Codex for blackboard sync.
  - Allowed repo/files: `laibeoffer/laibe-quote-factory`; QF5.3 docs/config/scripts/review_queue/exports files; Quote Factory roadmap docs.
  - Stop if: modifying `laibe-mvp` implementation files, Supabase/API/migration, formal price, `PricingRule`, `BudgetEstimateLine.unit_price`, renderer/output, payment, or AI API work is required. Blackboard status publication is handled by Deputy Codex unless a separate `laibe-mvp` governance Issue authorizes it.
  - Need Commander: No.
  - Need Reviewer: No.

- [ ] To: 網站主流程 Builder0522 / Site Flow Builder
  - Workstream: site/page-formalization
  - Branch / Repo: site/task-preview-intake / laibeoffer/laibe-mvp
  - Mission: Publish `TASK_PREVIEW_MISSING` / task-preview intake for site flow.
  - Why this agent: Owns landing/onboarding/header/CTA/routing/dashboard flow, but no current Commander-selected page/CTA/routing task is active.
  - Action: Publish `UPCOMING_PHASE_DECLARED` with `TASK_PREVIEW_MISSING`. Do not edit UI or invent product direction.
  - Allowed files: `docs/WORKSTREAM_BLACKBOARD.md` status/report only, optionally `docs/CURRENT_PHASE_REVIEW_PACKET.md` if summarizing site blocker.
  - Stop if: any UI/page/product direction/routing/CTA change would be required.
  - Need Commander: Yes for actual page/CTA/routing/visual task.
  - Need Reviewer: No.

- [ ] To: Codex 指令優化 / Governance Rules
  - Workstream: governance/codex-rules
  - Branch / Repo: codex/blackboard-no-idle-patrol-rules / laibeoffer/laibe-mvp
  - Mission: PR #14 publication of no-idle blackboard rules and active dispatches is complete.
  - Why this agent: Owns blackboard, heartbeat, Issue workflow, and workstream registry governance.
  - Action: PR #14 received clean Codex review and was merged to `main`. Continue future governance work only through a new scoped Issue / dispatch.
  - Allowed files: `docs/WORKSTREAM_BLACKBOARD.md`; governance docs only if review requires.
  - Need Commander: No.
  - Need Reviewer: No.

- [ ] To: 盤點 Git/GitHub 狀態 / Repo Status Patrol
  - Workstream: governance/repo-status
  - Branch / Repo: none / laibeoffer/laibe-mvp and laibeoffer/laibe-quote-factory
  - Mission: Keep GitHub state tied to the blackboard.
  - Why this agent: Owns read-only Git/GitHub status visibility, not implementation.
  - Action: On each patrol, report main SHA, open PRs, open Issues, PR review state, changed files for open PRs, and whether each PR maps to a blackboard workstream decision. PR #14 is merged; future PRs need their own blackboard decision.
  - Allowed files: none for normal read-only patrol; `docs/WORKSTREAM_BLACKBOARD.md` only if publishing a status change.
  - Stop if: destructive git, force-push, reset/clean/stash/rebase, secret access, or implementation changes would be required.
  - Need Commander: No unless a merge/reject decision falls outside automatic clean-scope rules.
  - Need Reviewer: No unless Codex review reports P1/P2/NEEDS_FIX or scope expands.

- [ ] To: 最高指揮官 / Commander Patrol
  - Workstream: command/deputy
  - Branch / Repo: none / laibeoffer/laibe-mvp
  - Mission: Continue 15-minute deputy patrol and force workstream momentum through the blackboard.
  - Why this agent: This commander thread is now the sole active Deputy Codex; previous/secondary deputy is offline.
  - Action: Interpret member reports, GitHub PR/Issue state, and blackboard together; publish workstream decisions to `docs/WORKSTREAM_BLACKBOARD.md`; ensure each chatroom either works from its preview task, declares `UPCOMING_PHASE_DECLARED`, or reports a concrete blocker. Do not ask Commander about IT workflow details.
  - Allowed files: `docs/WORKSTREAM_BLACKBOARD.md` for operational decisions; governance docs only when explicitly scoped.
  - Stop if: product direction, visual direction, business logic, formal payment/escrow/listing fee, real AI API/API key/upload, formal price, formal Excel/PDF, destructive git, large deletion, or out-of-policy merge/reject is required.
  - Need Commander: No for routine patrol.
  - Need Reviewer: No.

- [ ] To: 審查官聊天室 / LAIBE_REVIEWER
  - Workstream: none-review-only
  - Branch / Repo: none / laibeoffer/laibe-mvp
  - Mission: No proactive build task; monitor review triggers only.
  - Why this agent: Reviewer is read-only and must not replace Builder or Deputy.
  - Action: If any workstream marks `Need Reviewer: Yes`, perform read-only review. Otherwise report `NO_REVIEW_TRIGGER`.
  - Need Commander: No.
  - Need Reviewer: N/A.

- [ ] To: LOGO / Brand Visual
  - Workstream: brand-visual
  - Branch / Repo: brand/task-preview-intake / laibeoffer/laibe-mvp
  - Mission: Report `TASK_PREVIEW_MISSING` unless Commander gives a brand / logo task.
  - Why this agent: Brand direction requires Commander visual judgment; no current task preview assigns brand changes.
  - Action: Do not redesign the brand or logo. Read any existing brand notes and publish what Commander input is missing before work can start.
  - Need Commander: Yes.
  - Need Reviewer: No.

### NEEDS REVIEW

- [ ] None unless a workstream explicitly asks LAIBE_REVIEWER or hits risk trigger.

### BLOCKED

- [ ] None

### LATEST PATROL DECISIONS

- [x] To: 平面拼圖 / Plan Puzzle
  - Workstream: plancraft/page-ui / plancraft/adapter-clean
  - Branch / Repo: plancraft/zone-area-boundary-refinement / laibeoffer/laibe-mvp
  - Mission: Make `Plancraft+ Zone Area / Boundary Refinement` the next formal work order, not silent standby.
  - Why this agent: This workstream owns the LaiBE floor-plan importer and zone boundary candidate path while budget adapter and formal estimate guards remain intact.
  - Supersedes: Any older Plancraft standby note in this blackboard. Current decision is ISSUE_READY, not direct implementation permission.
  - Action: Publish `UPCOMING_PHASE_DECLARED` and claim/request the matching GitHub Issue. Keep the full implementation checklist in the Issue / task preview, not in this blackboard.
  - Allowed files: `src/stitch_laibe_landing_onboarding/preview_floor_plan/plan-puzzle.js`, `src/stitch_laibe_landing_onboarding/preview_floor_plan/code.html`, `docs/CURRENT_PHASE_REVIEW_PACKET.md`, `docs/NEXT_CODEX_HANDOFF.md`.
  - Stop and report if: budget adapter/runtime/types must change; `laibeoffer/plancraft` or Plancraft core must change; a new package/framework/install is needed; formal estimate / Excel / PDF / DB / API / AI API / payment / escrow / listing fee is requested; `formalEstimateGuard` or `generateBudgetEstimate` guard would be weakened.
  - Completion report must be pasted to this blackboard using the short format.
  - Need Commander: No.
  - Need Reviewer: No.

- [x] To: 配件倉庫：工法與規格
  - Workstream: warehouse/method-spec
  - Branch / Repo: warehouse/method-spec / laibeoffer/laibe-mvp
  - Mission: Heartbeat read-rule and report wording correction.
  - Why this agent: The latest MethodSpec heartbeat correctly concluded standby, but must explicitly follow `Mandatory Read Rules By Chatroom` and avoid wording that sounds like a GitHub API failure.
  - Action: On every heartbeat, read the full `warehouse-method-spec` mandatory file list from this blackboard before judging status. If GitHub returns no open PR or no open Issue, report `Open PR: None` and `Open Issue: None`; do not write "GitHub API returned no content" unless there is an actual connector/API failure. Current status remains Standby. Do not start validator / catalog work until explicitly dispatched.
  - Need Commander: No.
  - Need Reviewer: No.

- [x] To: 平面拼圖
  - Workstream: plancraft/page-ui / plancraft/adapter-clean
  - Branch / Repo: plancraft/zone-area-boundary-refinement / laibeoffer/laibe-mvp
  - Mission: Plancraft+ Zone Area / Boundary Refinement.
  - Why this agent: This work belongs to the LaiBE floor-plan importer / Plancraft+ zone geometry layer, not Visual Simulation, Quote Factory, MethodSpec, or Output.
  - Action: ISSUE_READY. Publish `UPCOMING_PHASE_DECLARED` and use the GitHub Issue workflow before implementation. Keep implementation details in the Issue / task preview, not in this blackboard.
  - Allowed files: `src/stitch_laibe_landing_onboarding/preview_floor_plan/plan-puzzle.js`, `src/stitch_laibe_landing_onboarding/preview_floor_plan/code.html`, `docs/CURRENT_PHASE_REVIEW_PACKET.md`, `docs/NEXT_CODEX_HANDOFF.md`.
  - Guard: Do not modify `laibeoffer/plancraft`; do not modify budget adapter runtime or budget types; do not create a production adapter; do not unblock formal estimate; do not produce Excel / PDF, DB / API, AI API, payment, escrow, or listing fee work. If budget adapter or budget type changes seem required, stop and report.
  - Need Commander: No.
  - Need Reviewer: No.

- [x] To: 模擬圖生成
  - Workstream: visual/simulation-governance
  - Branch / Repo: visual/simulation-governance / laibeoffer/laibe-mvp
  - Mission: Context cleanup only.
  - Why this agent: QF5.3 / PriceRange / Quote Factory content was pasted into the visual chatroom and must be marked as wrong-workstream context.
  - Action: Mark QF5.3, PriceRange, Quote Factory, audit trail, cloud payload validation, warehouse, budget, renderer, Plancraft implementation, payment, and production API content as `out-of-scope context contamination`. Do not modify files. Future non-visual input should trigger: "這不是 LAIBE_VISUAL_SIM 工作線，是否要轉交其他聊天室？"
  - Need Commander: No.
  - Need Reviewer: No.

- [x] To: 預算原料清洗工廠
  - Workstream: quote-factory/price-range-governance
  - Branch / Repo: main / laibeoffer/laibe-quote-factory
  - Mission: Own the QF5.3 PriceRange Review Decision Audit / Override report and move it onto the GitHub-tracked Quote Factory path.
  - Why this agent: QF5.3 is Quote Factory candidate-governance work, not Visual Simulation and not `laibe-mvp` runtime work.
  - Action: Verify whether QF5.3 artifacts exist in `laibeoffer/laibe-quote-factory`. If they exist and validations pass, publish/sync them through the Quote Factory GitHub workflow and mark QF5.4 as next. If they do not exist in the repo, finish QF5.3 first. Keep all outputs candidate-only.
  - Need Commander: No, unless integration into `laibeoffer/laibe-mvp`, real Supabase/API, formal pricing, or business pricing policy is requested.
  - Need Reviewer: No.

- [x] To: 配件倉庫：工法與規格
  - Workstream: warehouse/method-spec
  - Branch / Repo: warehouse/method-spec / laibeoffer/laibe-mvp
  - Mission: Standby.
  - Why this agent: Latest state remains MS-12 PASS_WITH_NOTES with no new MethodSpec dispatch.
  - Action: Do not start a new validator / catalog task until explicitly dispatched. Do not consume QF5.3, Plancraft zone area, visual simulation, output writer, or GitHub governance reports as MethodSpec work.
  - Need Commander: No.
  - Need Reviewer: No.

- [x] To: 原物料採購與倉儲
  - Workstream: warehouse/raw-candidate
  - Branch / Repo: warehouse/raw-candidate / laibeoffer/laibe-mvp
  - Mission: Standby with next candidate task identified.
  - Why this agent: R1.4 is complete; R1.5 source quality scoring / reviewer checklist remains a candidate next task but has not been explicitly dispatched in this patrol.
  - Action: Wait for explicit R1.5 dispatch. Do not treat Quote Factory QF5.3 artifacts as formal price or as direct PricingRule input.
  - Need Commander: No.
  - Need Reviewer: No.

- [x] To: 成品物流：預算表單輸出
  - Workstream: output/budget-documents
  - Branch / Repo: output/budget-documents / laibeoffer/laibe-mvp
  - Mission: Standby.
  - Why this agent: Phase 3.5 is complete and remains snapshot-only; no explicit output logistics task is active.
  - Action: Do not start Phase 3.6, writer library spike, real `.xlsx`, or real `.pdf` work until explicitly dispatched. Renderer / writer must continue reading only `BudgetOutputSnapshot` or gated rendered documents.
  - Need Commander: No, unless formal Excel / PDF or product-facing output decisions are requested.
  - Need Reviewer: No, unless real output boundary or Codex review risk appears.

- [x] To: 網站主流程 Builder0522
  - Workstream: site/page-formalization
  - Branch / Repo: site/* / laibeoffer/laibe-mvp
  - Mission: Standby.
  - Why this agent: No new Commander-selected page, CTA, routing, header, or visual-flow task was found in the latest reports.
  - Action: Do not start unrelated page work. Wait for explicit page / CTA / routing / visual direction.
  - Need Commander: Yes for page selection, visual direction, CTA, or product-flow decisions.
  - Need Reviewer: No.

- [x] To: 平面拼圖
  - Workstream: plancraft/page-ui / plancraft/importer-ui / plancraft/adapter-clean
  - Branch / Repo: plancraft/adapter-clean / laibeoffer/laibe-mvp
  - Action: Standby
  - Decision: PR #9 merged; adapter-clean has no blocker and remains candidate-only. Page-ui / importer-ui waits for an explicit task. Do not start the placeholder task or open an empty PR.
  - Need Commander: No, unless future work touches visual direction, CTA / routing, canvas tool hierarchy, product flow, or formal estimate strategy.
  - Need Reviewer: No, unless future work touches formal estimate, formal price, renderer / Excel / PDF, or crosses workstreams.

- [x] To: 配件倉庫：工法與規格
  - Workstream: warehouse/method-spec
  - Branch / Repo: warehouse/method-spec / laibeoffer/laibe-mvp
  - Action: Standby
  - Decision: PR #4 merged; P0 / P1-A / P1-B validators complete; MS-12 is PASS_WITH_NOTES. Issue #11 / PR #12 are governance, not MethodSpec work.
  - Need Commander: No.
  - Need Reviewer: No, unless future work touches formal price, PricingRule, BudgetEstimateLine.unit_price, renderer / output, raw warehouse, or frontend boundaries.

- [x] To: 成品物流：預算表單輸出
  - Workstream: output/budget-documents
  - Branch / Repo: output/budget-documents / laibeoffer/laibe-mvp
  - Action: Standby
  - Decision: PR #5 merged; Phase 3.5 completed; output remains snapshot-only. Do not start Phase 3.6 without an explicit output logistics task. No real .xlsx / .pdf output.
  - Need Commander: No, unless future work touches formal Excel / PDF, formal business document format, formal pricing, or product flow decisions.
  - Need Reviewer: No, unless future work touches real Excel / PDF output boundary, formal renderer, or Codex review reports P1 / P2 / NEEDS_FIX.

- [x] To: 模擬圖生成
  - Workstream: visual/simulation-governance
  - Branch / Repo: visual/simulation-governance / laibeoffer/laibe-mvp
  - Action: Scope correction / Standby
  - Decision: QF5.3 PriceRange Review Decision Audit & Override Contract, `validate_sample_cloud_payload.py`, `validate_price_ranges.py`, `sample_price_ranges_reviewed_with_audit.json`, warehouse/raw-candidate, warehouse/method-spec, output/budget-documents, and Plancraft implementation reports are wrong-workstream input for visual/simulation-governance. Visual Simulation should only handle visual governance, prompt / visual brief, image API sandbox policy, `docs/ai_style_visual_chat/`, templates, skills, and read-only visual status patrol.
  - Need Commander: No.
  - Need Reviewer: No.

## Update Log

### 2026-05-25 - Raw Candidate stale issue-state correction

Published by:
Deputy Codex

Status:
Raw Candidate Warehouse reported `formal GitHub Issue missing` / issue draft only, but formal Issue #17 already exists. This means the workstream read stale local blackboard / stale GitHub state.

Changed:
- Added Deputy correction comment to Raw Candidate Issue #17.
- Clarified that Issue #17 is the active dispatch for `warehouse/raw-candidate` R1.5.
- Raw Candidate must stop reporting `Open Issue: None`, `沒有正式 GitHub Issue`, or `formal issue draft only` for this workstream.
- If a chatroom local `docs/WORKSTREAM_BLACKBOARD.md` disagrees with GitHub `origin/main`, it must treat local state as stale and read GitHub `origin/main` plus the active Issue.

Formal Issue:
- Raw Candidate Warehouse: `https://github.com/laibeoffer/laibe-mvp/issues/17`

Next:
- Raw Candidate Warehouse should claim Issue #17, create/use branch `warehouse/raw-source-quality-scoring`, implement only candidate-only R1.5 scope, open PR `Add raw source quality scoring reviewer checklist`, and report PR URL plus candidate-only / forbidden-pricing-field checks back to the blackboard.

Need Commander:
No

Need Reviewer:
No

### 2026-05-25 - Deputy guidance comments added to formal Issues

Published by:
Deputy Codex

Status:
Workstream chatrooms were not seeing enough Deputy response / guidance after formal Issues were created. Deputy guidance comments were added directly to the active GitHub Issues.

Changed:
- Added Deputy guidance comment to Plan Puzzle Issue #15.
- Added Deputy guidance comment to MethodSpec Issue #16.
- Added Deputy guidance comment to Raw Candidate Issue #17.
- Added Deputy guidance comment to Output Documents Issue #18.
- Added Deputy guidance comment to Visual Simulation Issue #19.
- Added Deputy guidance comment to Quote Factory Issue #1.
- Corrected MethodSpec direction: formal Issue #16 already exists, so MethodSpec must stop reporting `formal issue missing` / `Open Issue: None` for this workstream.

Formal Issues:
- Plan Puzzle: `https://github.com/laibeoffer/laibe-mvp/issues/15`
- MethodSpec Warehouse: `https://github.com/laibeoffer/laibe-mvp/issues/16`
- Raw Candidate Warehouse: `https://github.com/laibeoffer/laibe-mvp/issues/17`
- Output Documents: `https://github.com/laibeoffer/laibe-mvp/issues/18`
- Visual Simulation: `https://github.com/laibeoffer/laibe-mvp/issues/19`
- Quote Factory: `https://github.com/laibeoffer/laibe-quote-factory/issues/1`

Next:
- Each workstream should claim its active Issue, create/use the listed branch, open the named PR, and report PR URL plus checks back to the blackboard.
- MethodSpec specifically should proceed from Issue #16 and no longer mark itself `BLOCKED_BY_MISSING_FORMAL_ISSUE`.

Need Commander:
No

Need Reviewer:
No

### 2026-05-25 - formal workstream Issues opened from no-idle backlog

Published by:
Deputy Codex

Status:
The no-idle preview backlog has been converted into formal GitHub Issues for the active safe workstreams. Workstream chatrooms should now read their matching Issue and report branch / PR progress back to the blackboard.

Changed:
- Opened Plan Puzzle formal Issue for Plancraft+ Zone Area / Boundary Refinement.
- Opened MethodSpec formal Issue for validator freeze note.
- Opened Raw Candidate formal Issue for R1.5 source quality scoring / reviewer checklist.
- Opened Output Documents formal Issue for renderer snapshot-only review packet / static guard next step.
- Opened Visual Simulation formal Issue for visual brief / prompt / sandbox governance packet.
- Opened Quote Factory formal Issue in the external Quote Factory repo for QF5.3 verification / publication and QF5.4 dry-run preparation.
- Site Flow Builder and Brand Visual remain `TASK_PREVIEW_MISSING` because they require Commander product / visual direction before implementation.

Formal Issues:
- Plan Puzzle: `https://github.com/laibeoffer/laibe-mvp/issues/15`
- MethodSpec Warehouse: `https://github.com/laibeoffer/laibe-mvp/issues/16`
- Raw Candidate Warehouse: `https://github.com/laibeoffer/laibe-mvp/issues/17`
- Output Documents: `https://github.com/laibeoffer/laibe-mvp/issues/18`
- Visual Simulation: `https://github.com/laibeoffer/laibe-mvp/issues/19`
- Quote Factory: `https://github.com/laibeoffer/laibe-quote-factory/issues/1`

Files:
- `docs/WORKSTREAM_BLACKBOARD.md`

Blocked:
- None for the six issued workstreams.
- Site Flow Builder remains blocked by missing Commander-selected page / CTA / routing task.
- Brand Visual remains blocked by missing Commander brand / logo direction.

Next:
- Each named workstream should claim its Issue, start only within the allowed scope, and open a PR.
- Deputy Codex should patrol Issues #15-#19 and Quote Factory Issue #1 on the next heartbeat.

Need Commander:
No

Need Reviewer:
No

### 2026-05-25 - PR #14 merged: blackboard patrol rules published

Published by:
Deputy Codex

Status:
PR #14 was cleanly reviewed by Codex and merged. Blackboard no-idle / mandatory-read / issue-ready patrol rules are now on `main`.

Changed:
- Merged PR #14 after the latest Codex review reported no major issues.
- Published Active Deputy Authority, Mandatory Read Rules By Chatroom, issue-ready no-idle patrol rules, consolidated chatroom task/defect prompt summary, and active dispatch governance to `main`.
- Confirmed changed file scope was `docs/WORKSTREAM_BLACKBOARD.md` only.
- Closed stale PR #14 patrol wording in active dispatches.

Files:
- `docs/WORKSTREAM_BLACKBOARD.md`

PR / Commit:
- PR #14 merged.
- Merge commit: `6a709f2e9e3ec78d9c3c69318a203004f4b0e8dd`

Blocked:
- None.

Next:
- Workstream chatrooms should read `main` blackboard, publish `UPCOMING_PHASE_DECLARED`, and claim/request formal Issues before file-changing work.

Need Commander:
No

Need Reviewer:
No

### 2026-05-25 - consolidated chatroom task and defect prompt

Published by:
Deputy Codex

Status:
Commander requested one consolidated prompt covering every chatroom's current task and defect. The prompt is issued from the Commander thread; this blackboard records the operational summary.

Changed:
- Consolidated shared rules for all chatrooms: read mandatory files, expand folder scopes into files, publish `UPCOMING_PHASE_DECLARED`, claim/request a GitHub Issue before file-changing work, and report back in blackboard short format.
- Summarized per-workstream tasks and defects for Plan Puzzle, MethodSpec Warehouse, Raw Candidate Warehouse, Output Documents, Visual Simulation, Quote Factory, Site Flow Builder, Governance Rules, Repo Status Patrol, Reviewer, and Brand Visual.
- Reaffirmed current defect pattern: chat-only reports are not formal delivery; silent standby is not allowed when a safe preview task exists; implementation cannot bypass Issue / Commander formal dispatch.

Files:
- `docs/WORKSTREAM_BLACKBOARD.md`

PR / Commit:
- PR #14 update pending publication.

Blocked:
- PR #14 still awaits clean Codex re-review before merge.

Next:
- Commander can paste the consolidated prompt into each chatroom. Each chatroom must reply with `UPCOMING_PHASE_DECLARED`, Issue claim/draft, blocker, or `TASK_PREVIEW_MISSING`.

Need Commander:
No

Need Reviewer:
No

### 2026-05-24 - PR #14 Codex review fix: READY status and Quote Factory reporting

Published by:
Deputy Codex

Status:
PR #14 received another Codex review on commit `811190d`: P1 noted the `READY` section still implied non-issue-gated Plan Puzzle execution; earlier P2 noted Quote Factory blackboard publication conflicted with its external-repo boundary. Both were corrected.

Changed:
- Changed `READY` entries to `ISSUE_READY`, making Issue / formal dispatch required before file-changing implementation.
- Clarified that Quote Factory reports short status to Deputy Codex; Deputy handles blackboard sync unless a separate `laibe-mvp` governance Issue authorizes a blackboard edit.
- Preserved no-idle behavior as phase declaration / Issue claim, not direct implementation permission.

Files:
- `docs/WORKSTREAM_BLACKBOARD.md`

PR / Commit:
- PR #14 update pending publication.

Blocked:
- PR #14 should not merge until Codex re-review confirms no remaining P1/P2.

Next:
- Push the blackboard fix to PR #14 and request Codex re-review.

Need Commander:
No

Need Reviewer:
No

### 2026-05-24 - PR #14 Codex review fix: issue-gated no-idle rules

Published by:
Deputy Codex

Status:
PR #14 received Codex review comments on the earlier commit: P1 issue-gated execution ambiguity and P2 implementation detail inside blackboard dispatches. Blackboard rules were corrected.

Changed:
- Reinstated GitHub Issue / Commander formal dispatch as the gate for file-changing implementation.
- Kept no-idle behavior, but changed it to `UPCOMING_PHASE_DECLARED` + Issue draft / claim rather than direct implementation from task preview alone.
- Shortened active dispatches so the blackboard remains an operational routing board, not an implementation spec.
- Converted Plan Puzzle's detailed implementation checklist into an `ISSUE_READY` dispatch that points to the task preview / Issue for details.

Files:
- `docs/WORKSTREAM_BLACKBOARD.md`

PR / Commit:
- PR #14 update pending publication.

Blocked:
- PR #14 should not merge until Codex re-review confirms the P1/P2 comments are addressed.

Next:
- Push the blackboard fix to PR #14 and request Codex re-review.

Need Commander:
No

Need Reviewer:
No

### 2026-05-24 - active task dispatches from preview backlog

Published by:
Deputy Codex

Status:
Commander task preview backlog has been converted into concrete active tasks for every pinned workstream/chatroom.

Changed:
- Added `ACTIVE TASK DISPATCHES` under `Dispatch Queue`.
- Assigned one primary active task to each chatroom/workstream instead of allowing silent standby.
- Required each workstream to either start the scoped task or publish `UPCOMING_PHASE_DECLARED` with a concrete blocker.
- Named allowed files/repos, stop conditions, Need Commander, and Need Reviewer for each dispatch.
- Preserved boundaries: no Plancraft core edits, no formal estimate, no formal price, no formal Excel/PDF, no real AI API/API key, no payment/escrow/listing fee, no secrets, no destructive git.

Dispatched:
- 平面拼圖 / Plan Puzzle: `Plancraft+ Zone Area / Boundary Refinement`.
- 配件倉庫：工法與規格 / Method Spec Warehouse: `MethodSpec validator freeze note`.
- 原物料採購與倉儲 / Raw Candidate Warehouse: R1.5 source quality scoring / reviewer checklist.
- 成品物流：預算表單輸出 / Output Documents: renderer snapshot-only review packet / static guard next step.
- 模擬圖生成 / Visual Simulation: visual brief / prompt / negative prompt / sandbox governance packet.
- 預算原料清洗工廠 / Quote Factory: verify/publish QF5.3 in `laibeoffer/laibe-quote-factory`, then prepare QF5.4.
- 網站主流程 Builder0522 / Site Flow Builder: `TASK_PREVIEW_MISSING` / intake declaration until Commander chooses a page/CTA/routing task.
- Codex 指令優化 / Governance Rules: finish PR #14 publication and merge after clean Codex review.
- 盤點 Git/GitHub 狀態 / Repo Status Patrol: read-only PR/Issue/main SHA patrol tied to blackboard decisions.
- 最高指揮官 / Commander Patrol: continue 15-minute deputy patrol and publish decisions to the blackboard.
- 審查官聊天室 / LAIBE_REVIEWER: no proactive build task; monitor review triggers only.
- LOGO / Brand Visual: `TASK_PREVIEW_MISSING` until Commander gives brand direction.

Files:
- `docs/WORKSTREAM_BLACKBOARD.md`

PR / Commit:
- PR #14 update pending publication.

Blocked:
- None.

Next:
- Workstreams must post completion/progress back to this blackboard. Chat-only completion reports are not formal delivery.

Need Commander:
No

Need Reviewer:
No

### 2026-05-24 - heartbeat prompt no-idle sync

Published by:
Deputy Codex

Status:
Commander patrol and active workstream heartbeats were synced with the no-idle / upcoming-phase policy.

Changed:
- Updated `laibe-commander-patrol` so this thread is treated as the sole active Deputy and so patrols apply `Active Deputy Authority`, `Blackboard Language Policy`, and `Upcoming Phase Declaration Rule`.
- Updated active workstream heartbeat prompts for Plan Puzzle, MethodSpec Warehouse, Raw Candidate Warehouse, Output Documents, Visual Simulation, and Quote Factory.
- Removed the old effective behavior where workstreams could stop at "no new PR / no new Issue / no new assignment."
- Required each active workstream heartbeat to declare `UPCOMING_PHASE_DECLARED` from the task preview backlog before claiming standby.
- Preserved workstream boundaries and high-risk stop conditions: no formal price, no formal Excel/PDF, no real AI API/API key, no payment/escrow/listing fee, no destructive git, and no secrets.

Files:
- `docs/WORKSTREAM_BLACKBOARD.md`
- Codex app heartbeat automations: `laibe-commander-patrol`, `laibe-plan-puzzle-patrol`, `laibe-method-spec-patrol`, `heartbeat`, `heartbeat-2`, `heartbeat-3`, `heartbeat-4`

PR / Commit:
- None. Blackboard and automation update only.

Blocked:
- None.

Next:
- On their next wakeup, workstream chatrooms should announce the next phase from the task preview and either proceed inside scope or report a concrete blocker.

Need Commander:
No

Need Reviewer:
No

### 2026-05-24 - upcoming phase declaration rule

Published by:
Deputy Codex

Status:
All workstream chatrooms must declare the next phase they are about to run based on the Commander task preview.

Changed:
- Added `Upcoming Phase Declaration Rule`.
- Instructed every heartbeat not to stop at `no new PR / no new Issue / standby`.
- Required each workstream to read the task preview backlog, identify the next safe phase, and publish an `UPCOMING_PHASE_DECLARED` entry before starting or reporting blocked.
- Added required fields: task preview source, upcoming phase/task, why this phase, can proceed, first action, allowed files/repo, stop conditions, blocker, Need Commander, and Need Reviewer.
- Named the expected next phase for Plancraft, MethodSpec, Raw Candidate Warehouse, Output Documents, Visual Simulation, Quote Factory, Site Builder, and Governance.

Files:
- `docs/WORKSTREAM_BLACKBOARD.md`

PR / Commit:
- None. Blackboard-only local update.

Blocked:
- None.

Next:
- Each workstream heartbeat should declare its upcoming phase first, then continue the safe task or report a concrete blocker.

Need Commander:
No

Need Reviewer:
No

### 2026-05-24 - active deputy authority update

Published by:
Deputy Codex

Status:
This Commander thread is now the sole active Deputy Codex.

Changed:
- Recorded that the previous / secondary Deputy chatroom is offline.
- Clarified that patrol decisions, workstream dispatches, blackboard status updates, and GitHub / Issue / PR routing decisions should not wait for another Deputy.
- Added return rule: if another Deputy comes back online later, it must read this blackboard first and avoid overwriting active patrol decisions unless the Commander explicitly reassigns authority.

Files:
- `docs/WORKSTREAM_BLACKBOARD.md`

PR / Commit:
- None. Blackboard-only local update.

Blocked:
- None.

Next:
- Continue 15-minute patrol and publish operational decisions directly to the blackboard.

Need Commander:
No

Need Reviewer:
No

### 2026-05-24 - blackboard language policy

Published by:
Deputy Codex

Status:
Blackboard language policy added.

Changed:
- Confirmed the blackboard may be maintained fully in English.
- Confirmed workstream heartbeat reports, dispatches, status updates, and completion reports may be required to answer in English when intended for blackboard publication or cross-chatroom automation.
- Preserved Commander-facing replies in Traditional Chinese by default unless the Commander asks otherwise.
- Required exact preservation of file paths, branch names, repo names, PR / Issue numbers, enum values, status codes, guard names, and function names.
- Allowed Deputy Codex to normalize Chinese workstream reports into concise English blackboard entries while preserving meaning and risk boundaries.

Files:
- `docs/WORKSTREAM_BLACKBOARD.md`

PR / Commit:
- None. Blackboard-only local update.

Blocked:
- None.

Next:
- Future workstream prompts may include: `Reply in English using the blackboard short format.`

Need Commander:
No

Need Reviewer:
No

### 2026-05-24 - plan puzzle executable guidance

Published by:
Deputy Codex

Status:
Superseded by later Issue-gated patrol rules. Plancraft / Plan Puzzle is now `ISSUE_READY`; file-changing work requires a GitHub Issue or Commander formal dispatch.

Changed:
- Earlier direct execution wording is no longer active.
- Current rule requires `UPCOMING_PHASE_DECLARED` plus GitHub Issue / Commander formal dispatch before file-changing implementation.
- Detailed implementation steps belong in the formal Issue / task preview, not in the blackboard.
- Formal estimate remains blocked.

Files:
- `docs/WORKSTREAM_BLACKBOARD.md`

PR / Commit:
- None. Blackboard-only local update.

Blocked:
- None.

Next:
- 平面拼圖 should continue the Zone Area / Boundary Refinement task now and paste its completion report back to this blackboard.

Need Commander:
No

Need Reviewer:
No

### 2026-05-24 - task preview backlog no-idle notice

Published by:
Deputy Codex

Status:
Task preview backlog is now an operational source. Workstreams were told not to idle when no PR / Issue exists.

Changed:
- Added `Task Preview Backlog Enforcement` under Reporting Rules.
- Clarified that no open PR / Issue does not mean no work; each chatroom must consult its Commander-provided task preview and continue the next safe scoped task.
- Clarified that `Standby` is only valid when there is no preview task, a blocker exists, or a Commander / Reviewer / high-risk boundary is required.
- Added next preview tasks for 平面拼圖, 配件倉庫：工法與規格, 原物料採購與倉儲, 成品物流：預算表單輸出, 模擬圖生成, 預算原料清洗工廠, 網站主流程 Builder0522, and Codex 指令優化.
- Updated Dispatch Queue so MethodSpec freeze note and Output renderer static guard / review-packet work are no longer hidden behind generic standby.

Files:
- `docs/WORKSTREAM_BLACKBOARD.md`

PR / Commit:
- None. Blackboard-only local update.

Blocked:
- None.

Next:
- Each heartbeat should first publish any missing report to the blackboard, then continue the next safe task from the preview backlog or report a concrete blocker.

Need Commander:
No

Need Reviewer:
No

### 2026-05-24 - blackboard publication enforcement notice

Published by:
Deputy Codex

Status:
All workstream chatrooms were explicitly reminded that chat-only completion reports are not formal delivery.

Changed:
- Added `Blackboard Publication Enforcement` under Reporting Rules.
- Announced that every workstream must paste new outcomes, blockers, risks, PR / Issue changes, status changes, and Need Commander / Need Reviewer changes back to this blackboard.
- Explicitly named 平面拼圖, 配件倉庫：工法與規格, 原物料採購與倉儲, 成品物流：預算表單輸出, 模擬圖生成, 網站主流程 Builder0522, 預算原料清洗工廠, Codex 指令優化, LOGO / brand-visual, and 審查官聊天室.
- Recorded that 平面拼圖 has a new report and must paste the short-format result into this blackboard `Update Log` instead of leaving it only in chat.
- Standardized the required blackboard short format.

Files:
- `docs/WORKSTREAM_BLACKBOARD.md`

PR / Commit:
- None. Blackboard-only local update.

Blocked:
- None.

Next:
- Each workstream heartbeat should check whether its latest chatroom report has been posted to the blackboard. If not, the first action is to publish the short-format report.

Need Commander:
No

Need Reviewer:
No

### 2026-05-24 - plan-puzzle patrol task report

Workstream:
plancraft/page-ui / plancraft/adapter-clean

Branch:
plancraft/zone-area-boundary-refinement

Status:
READY dispatch found for Plancraft+ Zone Area / Boundary Refinement. No construction started in this patrol.

Changed:
- 巡查黑板後確認平面拼圖目前有 READY 任務：Plancraft+ Zone Area / Boundary Refinement.
- Confirmed allowed files are limited to `src/stitch_laibe_landing_onboarding/preview_floor_plan/plan-puzzle.js`, `src/stitch_laibe_landing_onboarding/preview_floor_plan/code.html`, `docs/CURRENT_PHASE_REVIEW_PACKET.md`, and `docs/NEXT_CODEX_HANDOFF.md`.
- Confirmed guard boundaries: do not modify `laibeoffer/plancraft`, do not modify budget adapter runtime or budget types, do not create production adapter, do not unblock formal estimate, and do not produce Excel / PDF, DB / API, AI API, payment, escrow, or listing fee work.
- Confirmed Need Commander: No and Need Reviewer: No for the dispatched task.

Files:
- `docs/WORKSTREAM_BLACKBOARD.md`

PR / Commit:
None. Blackboard report only.

Blocked:
None.

Next:
Start Plancraft+ Zone Area / Boundary Refinement only when instructed, on the scoped branch and within the allowed files.

Need Commander:
No.

Need Reviewer:
No.

### 2026-05-24 - method-spec heartbeat report wording correction

Published by:
Deputy Codex

Status:
Correction announcement published for 配件倉庫：工法與規格 / `warehouse/method-spec`.

Changed:
- Confirmed the latest MethodSpec heartbeat decision remains correct: Standby, no new dispatch, Need Commander No, Need Reviewer No.
- Added explicit instruction that `warehouse/method-spec` must follow `Mandatory Read Rules By Chatroom` and read its full mandatory file list before judging heartbeat status.
- Standardized empty GitHub result wording: use `Open PR: None` and `Open Issue: None`.
- Clarified that "GitHub API returned no content" should only be used for an actual connector/API failure, not for an empty open Issue list.

Files:
- `docs/WORKSTREAM_BLACKBOARD.md`

PR / Commit:
- None. Blackboard-only local update.

Blocked:
- None.

Next:
- MethodSpec remains on standby until an explicit MethodSpec validator / catalog task is dispatched.

Need Commander:
No

Need Reviewer:
No

### 2026-05-24 - mandatory read rules by chatroom

Published by:
Deputy Codex

Status:
All chatrooms are explicitly named in the blackboard with mandatory read targets.

Changed:
- Added `Mandatory Read Rules By Chatroom`.
- Clarified that folder paths are only scope hints; heartbeat / read-only patrols must expand and read the actual files.
- Added shared mandatory files for all chatrooms.
- Added per-chatroom read targets for 副指揮官, 網站主流程 Builder0522, 平面拼圖, 原物料採購與倉儲, 配件倉庫：工法與規格, 成品物流：預算表單輸出, 模擬圖生成, 預算原料清洗工廠, 審查官聊天室, Codex 指令優化, LOGO / brand-visual, and 盤點 Git/GitHub 狀態.
- Clarified that missing local files should be checked on GitHub `origin/main`; only report `MISSING` after that.

Files:
- `docs/WORKSTREAM_BLACKBOARD.md`

PR / Commit:
- None. Blackboard-only local update.

Blocked:
- None.

Next:
- Future heartbeat prompts should point each chatroom to its named mandatory read list instead of only giving a broad folder path.

Need Commander:
No

Need Reviewer:
No

### 2026-05-24 - deputy patrol member report dispatch refresh

Published by:
Deputy Codex

Status:
Latest member reports converted into workstream-specific instructions and published to the blackboard.

Changed:
- Published READY dispatch for 平面拼圖: `Plancraft+ Zone Area / Boundary Refinement`, limited to the LaiBE preview floor plan files and docs, with formal estimate and budget runtime guards preserved.
- Published context cleanup instruction for 模擬圖生成: QF5.3 / PriceRange / Quote Factory material is `out-of-scope context contamination` and must not drive visual work.
- Routed QF5.3 ownership back to 預算原料清洗工廠 / `quote-factory/price-range-governance` in `laibeoffer/laibe-quote-factory`; QF5.3 must be verified and GitHub-tracked before moving to QF5.4.
- Kept 配件倉庫, 原物料採購與倉儲, 成品物流, and 網站主流程 on standby unless an explicit scoped dispatch appears.
- Confirmed GitHub state: `laibeoffer/laibe-mvp` open PR None, open Issue None, main sha `ce584e822f1d6a9fc65c21b0753f6c85896e202f`; `laibeoffer/laibe-quote-factory` open PR None, open Issue None, main sha `c332d43c174e5f8b5816cceb5fbdc3ca5f708fd8`.
- Replaced remaining local path dispatch references for Quote Factory / Plancraft external sections with GitHub repo references.

Files:
- `docs/WORKSTREAM_BLACKBOARD.md`

PR / Commit:
- None. Blackboard-only local update.

Blocked:
- None.

Next:
- Send the 平面拼圖 READY prompt first if Commander wants the next active build to proceed.
- Send 模擬圖生成 the cleanup prompt before any further visual work.
- Send 預算原料清洗工廠 the QF5.3 verify/publish instruction before treating QF5.4 as active.

Need Commander:
No

Need Reviewer:
No

### 2026-05-24 - visual workstream routing correction

Published by:
Deputy Codex

Status:
Wrong-workstream input corrected for 模擬圖生成 / visual-simulation-governance.

Changed:
- Confirmed QF5.3 / PriceRange audit and override material belongs to `quote-factory/price-range-governance`, not `visual/simulation-governance`.
- Confirmed `validate_sample_cloud_payload.py`, `validate_price_ranges.py`, and `sample_price_ranges_reviewed_with_audit.json` are Quote Factory / price candidate governance artifacts, not visual brief / prompt / asset spec.
- Confirmed warehouse/raw-candidate, warehouse/method-spec, output/budget-documents, and Plancraft implementation reports should not be routed to 模擬圖生成.
- Clarified visual/simulation-governance only handles visual governance, prompt / visual brief, image API sandbox policy, `docs/ai_style_visual_chat/`, templates, skills, and read-only visual status patrol.
- No new visual construction task was assigned.

Files:
- `docs/WORKSTREAM_BLACKBOARD.md`

PR / Commit:
- None. Blackboard-only local update.

Blocked:
- None.

Next:
- Keep 模擬圖生成 on standby unless a visual governance / prompt / sandbox image policy task appears.
- Route QF5.3 / QF5.4 work to 預算原料清洗工廠 / `quote-factory/price-range-governance`.

Need Commander:
No

Need Reviewer:
No

### 2026-05-24 - deputy patrol GitHub state sync

Published by:
Deputy Codex

Status:
GitHub patrol synced global state to blackboard.

Changed:
- Confirmed `main` latest sha is `ce584e822f1d6a9fc65c21b0753f6c85896e202f`.
- Confirmed open PR: None.
- Confirmed open Issue: None.
- Confirmed PR #12 `Add workstream issue template` is merged.
- Confirmed PR #13 `Define issue blackboard patrol workflow` is merged.
- Confirmed Issue #11 `Establish GitHub Issue workflow for LaiBE workstreams` is closed as completed.
- No new member workstream dispatch was published this patrol.

Files:
- `docs/WORKSTREAM_BLACKBOARD.md`

PR / Commit:
- None. Blackboard-only local update.

Blocked:
- None.

Next:
- Continue 15-minute Deputy patrol. Publish only new PR / Issue / member-report decisions to the blackboard.

Need Commander:
No

Need Reviewer:
No

### 2026-05-24 - deputy member-goal alignment

Published by:
Commander

Status:
Member work goals received and converted into Deputy Codex decision basis.

Changed:
- Clarified that Deputy decisions are based on each member chatroom's work report, not only on GitHub status.
- Recorded current member-goal interpretation for 配件倉庫：工法與規格, 原物料採購與倉儲, 成品物流：預算表單輸出, 平面拼圖, 預算原料清洗工廠, and 模擬圖生成.
- Updated dispatch classification from member goals:
  - READY candidate: warehouse/raw-candidate R1.5 source quality scoring / reviewer checklist.
  - READY candidate: quote-factory/price-range-governance QF5.3 review decision audit / override governance.
  - NEEDS REVIEW candidate: output/budget-documents Phase 3.5 Reviewer Pass.
- Confirmed 配件倉庫 latest blackboard state already has MS-12 PASS_WITH_NOTES, so MS-12 is not re-issued as new work.
- Confirmed 平面拼圖 PR #9 / Production Adapter Design Doc is complete, so it remains standby until an explicit adapter / importer / page-ui task.
- Confirmed 模擬圖生成 remains sandbox governance only.

Files:
- `docs/WORKSTREAM_BLACKBOARD.md`

PR / Commit:
- None. Blackboard-only local update.

Blocked:
- None.

Next:
- Deputy patrols must publish member-specific next-step decisions to the blackboard before treating them as delivered.

Need Commander:
No

Need Reviewer:
No

### 2026-05-24 - deputy patrol dispatch published

Published by:
Deputy Codex

Status:
Patrol decisions published to blackboard. Blackboard is the coordination battlefield; chat replies alone are not considered delivered to workstreams.

Changed:
- Published standby decisions for 平面拼圖, 配件倉庫：工法與規格, and 成品物流：預算表單輸出.
- Confirmed Issue #11 and PR #12 belong to governance/codex-rules, not to plancraft, MethodSpec, or output workstreams.
- Confirmed no new construction task is assigned to those three workstreams.
- Synced GitHub global state: `main` latest sha `57c81695977c4c18f87b02590469af4b89880ea8`, PR #10 merged, PR #12 open, Issue #11 open.

Files:
- `docs/WORKSTREAM_BLACKBOARD.md`

PR / Commit:
- None. Blackboard-only local update.

Blocked:
- None.

Next:
- Keep workstreams in standby unless an explicit scoped task is posted to the blackboard.

Need Commander:
No

Need Reviewer:
No

### 2026-05-24 - quote-factory QF5.2 PriceRange Review Decision Contract

Workstream:
quote-factory/price-range-governance

Branch:
main

Status:
QF5.2 completed in external repo `laibeoffer/laibe-quote-factory`. PriceRange Review Decision Contract is established.

Changed:
- Defined PriceRange review decision contract and decision enum: `approved_for_cloud`, `rejected`, `needs_more_observations`, `needs_unit_review`, `needs_scope_review`, `needs_alias_review`, and `keep_as_historical_reference`.
- Clarified that `approved_for_cloud` is not formal price approval; it only means the PriceRange can move forward as candidate statistical data for Raw Candidate Warehouse / Pricing Review.
- Added configurable suggested-decision rules for insufficient observations, cross-unit review, unknown scope, missing canonical item, null display price, forbidden fields, and invalid price order.
- Generated simulated review decisions for sample PriceRange review queue items.
- Applied sample decisions to produce reviewed PriceRange output while preserving review metadata, reviewer placeholder, decision reasons, reviewed timestamp, and simulated review flag.
- Confirmed sample decision counts: `approved_for_cloud: 0`, `needs_more_observations: 2`, `needs_unit_review: 2`, `keep_as_historical_reference: 5`, `rejected: 0`, `needs_scope_review: 0`, `needs_alias_review: 0`.
- Confirmed reviewed output count: `9`.
- Confirmed no formal price, no formal `PricingRule`, no `BudgetEstimateLine.unit_price`, no Supabase, no API / migration, no Renderer / BudgetOutputSnapshot, no payment / escrow / listing fee.

Files:
- `docs/price_range_review_decision_contract.md`
- `configs/price_range_review_decision_rules.json`
- `scripts/apply_sample_price_range_review_decisions.py`
- `review_queue/sample_price_range_review_decisions.json`
- `exports_to_raw_warehouse/sample_price_ranges_reviewed.json`
- `scripts/validate_sample_cloud_payload.py`

PR / Commit:
- External repo commit `c332d43c174e5f8b5816cceb5fbdc3ca5f708fd8`, `feat(quote-factory): add raw quote cleaning workspace`.
- No `laibe-mvp` PR. Blackboard-only publication.

Blocked:
- None.

Next:
- QF5.3 review decision audit / override governance, keeping all outputs candidate-only and preserving the downstream boundary.

Need Commander:
No

Need Reviewer:
No

### 2026-05-24 - visual/simulation-governance Minimal Real Server Runtime Spike

Workstream:
visual/simulation-governance

Branch:
visual/simulation-governance

Status:
Minimal Real Server Runtime Spike result published to blackboard as sandbox-only governance status.

Changed:
- Recorded route B result: no backend runtime, no server/proxy stub, no real image API, no API key / `.env`, no production endpoint.
- Confirmed Visual Simulation remains disabled fallback / sandbox governance only.
- Confirmed `approved` or generated visual outputs must not be treated as construction drawings, formal design drawings, real cases, quote basis, completion guarantees, or production assets.
- Confirmed future server runtime work must remain scoped, same-origin, disabled-by-default, no-secret, and non-production unless separately approved.

Files:
- `docs/WORKSTREAM_BLACKBOARD.md`

PR / Commit:
- None. Blackboard-only update.

Blocked:
- None.

Next:
- Pause unless visual simulation policy changes or Commander explicitly starts a local same-origin proxy spike.

Need Commander:
No

Need Reviewer:
No

### 2026-05-24 - warehouse/raw-candidate Phase R1.4 report

Workstream:
warehouse/raw-candidate

Branch:
warehouse/raw-candidate

Status:
Phase R1.4 completed. Raw Warehouse Negative / Source Quality Fixtures added and safety-checked.

Changed:
- Added negative and source-quality fixture coverage for dirty raw evidence.
- Covered missing source date, missing currency, missing unit, blocked negative observed price, high / low outliers, unit mismatch, same source-period duplicate, missing model, missing spec, low source reliability, and ambiguous raw names.
- Confirmed bad data can enter the raw candidate pipeline without being silently approved.
- Confirmed `blocked_negative_price` is blocked / rejected and does not produce a handoff proposal.
- Confirmed `needs_more_info_count`, `blocked_count`, and `rejected_count` are greater than zero in the R1.4 demo.
- Confirmed proposal contract, warehouse export safety, observed price safety, and static guard pass.
- Confirmed `formal_price_generated: false`, `price_authority: "none"`, `formal_pricing_rule_generated: false`, and `formal_budget_line_generated: false`.
- No formal price, no `PricingRule`, no `MaterialSpec` / `LaborRule`, no `BudgetEstimateLine.unit_price`, no renderer / Excel / PDF, no `BudgetOutputSnapshot`, no floor-plan, no payment / escrow / listing fee.

Files:
- `docs/budget/25-raw-negative-source-quality-fixtures.md`
- `src/lib/budget/raw-warehouse/negative-source-quality-fixtures.ts`
- `src/lib/budget/raw-warehouse/demo-raw-negative-source-quality-fixtures.ts`
- `src/lib/budget/raw-warehouse/candidate-classifier.ts`
- `src/lib/budget/raw-warehouse/candidate-validator.ts`

PR / Commit:
- PR #3 already merged for `warehouse/raw-candidate`; this report is blackboard-only.

Blocked:
- None.

Next:
- R1.5 source quality scoring / reviewer checklist prototype, keeping all outputs candidate evidence only.

Need Commander:
No

Need Reviewer:
No

### 2026-05-24 - warehouse/method-spec Phase MS-12 Reviewer Pass

Workstream:
warehouse/method-spec

Branch:
warehouse/method-spec

Status:
Phase MS-12 MethodSpec validator P1-B Reviewer Pass published to blackboard. Reviewer verdict: PASS_WITH_NOTES.

Changed:
- Published MS-12 reviewer result for MethodSpec validator P1-B.
- Confirmed UnitConversion coverage validator is warning-only and does not recalculate quantity, rewrite `BudgetEstimateLine.quantity`, or enter the budget engine.
- Confirmed Inclusion / Exclusion scope coverage validator is warning / allowed-condition only and does not propagate to output / renderer.
- Confirmed InclusionExclusionRule does not add, delete, or rewrite formal work items and does not change `unit_price`, `amount`, or `quantity`.
- Confirmed MS-5 pricing source guard still blocks AI / RAG / candidate price source types.
- Confirmed MS-8 LaborRule reference-only guard still blocks labor-derived pricing source types.
- Confirmed regression demos keep budget total `231103`, budget line count `12`, and review-required line count `5`.
- PASS_WITH_NOTES reason is dirty / untracked repo baseline only; no MethodSpec P1-B boundary violation was found.

Files:
- `docs/budget/31-method-spec-p1b-reviewer-pass.md`
- `docs/WORKSTREAM_BLACKBOARD.md`

PR / Commit:
- PR #4 already merged for `warehouse/method-spec`; this is a blackboard-only publication.

Blocked:
- None.

Next:
- Pause until the next explicit MethodSpec validator / catalog task. Likely next options are P2 validator planning or clean worktree / file ownership proof.

Need Commander:
No

Need Reviewer:
No. Trigger only if future work touches formal price, `PricingRule`, `BudgetEstimateLine.unit_price`, or crosses renderer / output / raw warehouse / frontend boundaries.

### 2026-05-24 — plancraft-production-adapter-design-doc

Workstream:
plancraft/adapter-clean

Branch:
plancraft/adapter-clean

Status:
Plancraft+ Production Adapter Design Doc published to blackboard.

Changed:
- Recorded `docs/budget/plancraft-plus-production-adapter-design.md` as the design source for a future production Plancraft+ budget adapter.
- Design doc defines production input requirements for Plancraft+ draft JSON: product, unit, version range, calibrated scale, valid nodeGraph edges, closed zone boundaries, valid openings, wall status, and provenance.
- Design doc defines zone / space, area policy, wall facts, opening facts, future furniture / object contract, guard model, reviewer gates, downstream safety, production acceptance criteria, migration plan, and open questions.
- Current adapter remains a spike only: `productionReady: false`, `formalEstimateAllowed: false`, and formal estimate generation stays blocked.
- `.pc` output, SVG / renderer preview, candidate facts, and unverified zones remain excluded from formal budget input.

Files:
- `docs/budget/plancraft-plus-production-adapter-design.md`
- `docs/WORKSTREAM_BLACKBOARD.md`

PR / Commit:
- Design doc included in PR #9, merge commit `7ea4f8dc1a82599953ca66fed21666b58b99d012`.

Blocked:
- None.

Next:
- Wait for an explicit next adapter task, likely Zone Area / Boundary Refinement or Production Quantity Fact Contract.

Need Commander:
No.

Need Reviewer:
No. Trigger only if future work touches production estimate, formal price, renderer / Excel / PDF, or crosses workstreams.

### 2026-05-24 — warehouse/raw-candidate R1.3 Reviewer Pass

Workstream:
warehouse/raw-candidate

Branch:
warehouse/raw-candidate

Status:
Phase R1.3 Reviewer Pass: PASS. Raw Warehouse Multi-Source Fixture Expansion verified.

Changed:
- Reviewed R1.3 multi-source fixture expansion scope and safety boundaries.
- Confirmed five source types enter the candidate-only raw warehouse flow: `historical_quote`, `material_price_sheet`, `vendor_quote`, `labor_rate_sheet`, and `brand_model_catalog`.
- Confirmed source-to-candidate mapping remains correct: historical quote -> historical quote line, material price sheet -> material price, vendor quote -> vendor quote, labor rate sheet -> labor rate, brand model catalog -> brand model.
- Confirmed `brand_model_catalog` remains non-price-bearing; `brand_model_price_bearing_count` must remain `0`.
- Confirmed proposal contract, warehouse export safety, observed price safety, and static guard pass.
- Confirmed `formal_price_generated: false`, `price_authority: "none"`, `formal_pricing_rule_generated: false`, and `formal_budget_line_generated: false`.
- No formal price, no `PricingRule`, no `MaterialSpec` / `LaborRule`, no `BudgetEstimateLine.unit_price`, no renderer / Excel / PDF, no `BudgetOutputSnapshot`, no floor-plan, no payment / escrow / listing fee.

Files:
- `docs/budget/24-raw-multi-source-fixtures.md`
- `src/lib/budget/raw-warehouse/multi-source-fixtures.ts`
- `src/lib/budget/raw-warehouse/demo-raw-multi-source-fixtures.ts`

PR / Commit:
- PR #3 already merged for `warehouse/raw-candidate`; this Reviewer Pass report is blackboard-only.

Blocked:
- None.

Next:
- R1.4 negative / source-quality fixtures, keeping all outputs candidate evidence only.

Need Commander:
No

Need Reviewer:
No

### 2026-05-24 - output/budget-documents Phase 3.5 report

Workstream:
output/budget-documents

Branch:
output/budget-documents

Status:
Phase 3.5 Formal File Writer Controlled Entry Spike completed and ready for output workstream tracking. No real `.xlsx` / `.pdf` output.

Changed:
- Established controlled writer entry `writeFormalBudgetArtifact(gatedDocument, options)`.
- Added preflight-first behavior: invalid preflight returns `status: "blocked"` and does not create manifest or write artifacts.
- Added `FormalArtifactManifest` with snapshot/project/estimate/audience/format/filename/storage/row_count/total/security_flags.
- Added local staging policy for `artifacts/budget-renderer-staging/`, rejecting absolute paths, path traversal, signed/approved overwrite, and `.xlsx` / `.pdf` targets.
- Added placeholder writer guard for `.json` manifest or `.txt` placeholder only; Phase 3.5 demo used manifest-only and wrote no files.
- Strengthened renderer static guard for workbook/PDF libraries and file-write escape rules.
- Verified demos: controlled entry and static guard passed; `generated_xlsx_or_pdf_count: 0`.

Files:
- `src/lib/budget/renderers/formal-file-writer-entry.ts`
- `src/lib/budget/renderers/formal-artifact-manifest.ts`
- `src/lib/budget/renderers/formal-local-staging-policy.ts`
- `src/lib/budget/renderers/formal-placeholder-artifact-writer.ts`
- `src/lib/budget/renderers/demo-formal-file-writer-controlled-entry.ts`
- `src/lib/budget/renderers/renderer-static-guard.ts`
- `docs/budget/26-formal-file-writer-controlled-entry.md`
- `docs/NEXT_CODEX_HANDOFF.md`
- `docs/CURRENT_PHASE_REVIEW_PACKET.md`
- `docs/WORKSTREAM_BLACKBOARD.md`

PR / Commit:
- None in this blackboard update. Phase 3.5 remains tracked as workstream report only.

Blocked:
- None.

Next:
- Pause until next explicit output logistics task. If continuing, Phase 3.6 should harden writer path containment and optionally test `.json` / `.txt` placeholder write without producing `.xlsx` / `.pdf`.

Need Commander:
No

Need Reviewer:
No

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
