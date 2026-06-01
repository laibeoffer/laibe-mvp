# NEXT_CODEX_HANDOFF.md

## Latest Plan Puzzle Task: UI IA Alignment Implementation

- To: 第二副指揮官 / @Deputy-Codex-2.
- Workstream: `plancraft/page-ui`.
- 任務名稱：Plancraft+ 平面拼圖 UI IA Alignment Implementation + Agent Transfer Handoff.
- 任務類型：Builder / UI Structure Alignment / Tool Catalog Runtime / Agent Handoff.
- 指派角色：平面拼圖 UI / Plan Puzzle Builder.
- 是否允許施工：Yes, explicitly scoped to `preview_floor_plan` UI files and governance / handoff docs.
- 是否可供使用者後續主動審查：Yes.
- 是否涉及 routing / CTA / header：Page-level CTA / file area actions only; no global route architecture changed.
- 是否涉及資料模型：Only draft UI state / candidate metadata; no production budget model.
- 是否涉及敏感區域：No.
- 修改檔案：
  - `src/stitch_laibe_landing_onboarding/preview_floor_plan/code.html`
  - `src/stitch_laibe_landing_onboarding/preview_floor_plan/plan-puzzle.js`
  - `docs/NEXT_CODEX_HANDOFF.md`
  - `docs/CURRENT_PHASE_REVIEW_PACKET.md`
  - `docs/WORKSTREAM_BLACKBOARD.md`
- 新增檔案：
  - `docs/PLAN_PUZZLE_AGENT_TRANSFER.md`
- 已完成：
  - Updated Plan Puzzle runtime / project version to `0.12.0-ui-ia-alignment`.
  - Added a clear file area with draft name, import, local draft save placeholder, version/save status, print/export actions, selected material tags, basic instructions, and total preview / pre-submit entry.
  - Added a complete left tool catalog surface for select, pan, zoom, wall, opening, item placement, dimension, text, material bucket, auto annotate, delete, snap toggle, undo/redo.
  - Added 10 product layers and layer-linked item library display.
  - Added right-side status sections for current layer, selected object properties, layer overlay, AI guide, notes, preferences, system reminders, budget inclusion, completion, shortcut help, and total preview.
  - Preserved existing Import Interface, underlay, scale calibration, wall drawing, wallGraph, nodeGraph, openings, zones, zone boundary, zone area metadata, `.pc` converter spike, DSL validation report, renderer preview report, and Tool Catalog runtime.
- 未完成 / placeholder：
  - Pan / zoom / item placement / dimension / text / material bucket remain UI placeholders.
  - Undo / redo history stack remains placeholder.
  - Total preview is a first-pass UI / checklist entry, not a formal submission or quote.
  - No production Tool Catalog data model, no Budget Engine, no formal quantity, no renderer input, no Excel / PDF writer, no AI API, no DB / cloud storage.
- 驗證：
  - Bundled Node command: `C:\Users\USER\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe --check Z:\laibe_project\src\stitch_laibe_landing_onboarding\preview_floor_plan\plan-puzzle.js` PASS.
  - PATH `node.exe` from Codex app returned Access denied; no system PATH changes were made.
  - Browser runtime URL: `http://127.0.0.1:41725/src/stitch_laibe_landing_onboarding/preview_floor_plan/code.html?validation=ui-ia-alignment-0-12`.
  - Browser checked: page title loads, file area exists, 4 area count matches, status area exists, 10 product layer options present, switching to `plumbing_plan` works, total preview expands, `Tool Catalog Runtime` visible, console error count 0.
  - `file:///C:/laibe_project/...` could not be checked because `C:\laibe_project` does not exist in this environment; `file:///Z:/...` browser navigation was blocked by in-app browser URL policy.
- 邊界：
  - 未修改 `C:\laibe_project\plancraft` / `Z:\laibe_project\plancraft` / Plancraft core.
  - 未修改 budget runtime / adapter / renderer / MethodSpec / Raw Candidate / Output Documents.
  - 未新增 `package.json`, `node_modules`, React, Vite, TypeScript app, or npm dependency.
  - 未解除 `formalEstimateGuard`, 未呼叫 `generateBudgetEstimate()`, 未產生正式估價 / 正式價格 / Excel / PDF.
  - 未接 payment / escrow / listing fee / auth / webhook / secrets / AI API / DB.
  - 未執行 `git clean` / `git reset`; local `git` executable remains unavailable in PATH.
- Need Commander：Yes. 本輪涉及平面拼圖 UI 資訊架構、圖層、工具、項目庫、狀態區與總預覽，需最高指揮官確認是否接受此 IA。
- Need Reviewer：No by default. 本輪未修改 Plancraft core、budget runtime、formal estimate guard 或正式數量/估價/output；若後續進 production quantity / budget / renderer boundary 才需要。
- 下一步唯一建議：Plancraft+ Tool Catalog Interaction Implementation，將目前 placeholder 工具逐項落成可瀏覽器驗證的 draft interaction。

## Latest Plan Puzzle Task: Tool Catalog Runtime Interaction

- To: 第二副指揮官 / @Deputy-Codex-2.
- Workstream: `plancraft/page-ui`.
- 任務名稱：Plan Puzzle Tool Catalog Runtime Interaction.
- 任務類型：Builder / UI runtime / Tool Catalog interaction.
- 修改檔案：
  - `src/stitch_laibe_landing_onboarding/preview_floor_plan/code.html`
  - `src/stitch_laibe_landing_onboarding/preview_floor_plan/plan-puzzle.js`
  - `docs/NEXT_CODEX_HANDOFF.md`
  - `docs/CURRENT_PHASE_REVIEW_PACKET.md`
- 新增檔案：無。
- 已完成：
  - 新增 `PLAN_PUZZLE_TOOL_CATALOG` runtime contract，將既有工具映射到 file / tool / canvas / status 四類區域。
  - 新增 `window.laibePlanPuzzleToolCatalog` 讀取入口與 `project.toolCatalog` draft snapshot。
  - Inspector 顯示 `Tool Catalog Runtime`，含 active tool、receives、output、boundary、placeholder / linked / verified 定義。
  - 點擊既有 toolbar / tool-card 後會更新 active tool，linked 工具會在本 browser session 標記為 verified。
  - `code.html` script query 已改為 `tool-catalog-runtime-interaction`，避免舊快取掩蓋 runtime 修正。
- 未完成：
  - 尚未建立 production Tool Catalog data model。
  - 尚未實作家具 / 項目庫完整互動。
  - 尚未把 Tool Catalog 接到 Budget Engine、Renderer、MethodSpec、Raw Candidate、Output Documents 或 DB/API。
  - 尚未同步成 GitHub branch / PR；本機 `git` executable 不可用。
- 驗證：
  - `node --check src/stitch_laibe_landing_onboarding/preview_floor_plan/plan-puzzle.js` PASS。
  - Browser runtime URL: `http://127.0.0.1:41725/src/stitch_laibe_landing_onboarding/preview_floor_plan/code.html?validation=tool-catalog-runtime`.
  - Browser checked: page title loads, `Tool Catalog Runtime` panel visible, clicking `start-draw-wall` and `start-place-zone` updates panel to verified, console error count 0.
- 邊界：
  - 未修改 `C:\laibe_project\plancraft` / Plancraft core。
  - 未修改 budget adapter/runtime/types、Renderer、MethodSpec、Raw Candidate、Output Documents。
  - 未呼叫 `generateBudgetEstimate()`，未解除 `formalEstimateGuard`，未產生正式估價 / 正式價格 / Excel / PDF。
  - 未接 payment / escrow / listing fee / auth / webhook / secrets / AI API / DB。
- Need Commander：No，除非要變更 Tool Catalog 產品方向或決定 PR landing。
- Need Reviewer：No by default；若後續把 candidate area / tool catalog 接到正式 quantity / estimate / output，才需要 Reviewer。
- 下一步唯一建議：Create scoped GitHub PR for Tool Catalog Runtime Interaction once GitHub write path is available from a clean main-based branch.

## Latest Old Blackboard Path Lookup Report

- 本輪任務名稱：Old blackboard lookup / new blackboard path report to Execution Officer.
- 任務類型：Documentation / Governance / Blackboard routing.
- 指派角色：@Plan-Puzzle / Plan Puzzle responsible agent.
- Workstream：`plancraft/page-ui` / `app/plan-puzzle-guide-agent`.
- Managed by：`EXECUTION_OFFICER` for the report destination.
- 修改檔案：
  - `docs/WORKSTREAM_BLACKBOARD.md`
  - `docs/NEXT_CODEX_HANDOFF.md`
- 新增檔案：無。
- 已完成：
  - 查詢舊黑板與 handoff 中的 blackboard rebuild 記錄。
  - 確認新黑板不是另一個新檔案；`docs/WORKSTREAM_BLACKBOARD.md` 已被原地重建為 compact current-state board。
  - 已在 compact blackboard 以 `Old Blackboard Path Lookup Report` 呈報 `EXECUTION_OFFICER`。
  - 已記錄後續更新規則：黑板只放 current state / evidence / blocker / owner / next single action；詳細內容放 `docs/NEXT_CODEX_HANDOFF.md`、`docs/CURRENT_PHASE_REVIEW_PACKET.md`、`docs/budget_knowledge_vault/` 或 Git history。
- 未修改：
  - `src/`
  - `plancraft/`
  - budget engine / renderer / MethodSpec / Raw Candidate / Output Documents runtime
  - payment / escrow / listing fee / DB / auth / AI API / secrets
  - package / framework files
- 已知風險：
  - 本輪是黑板路徑查詢與呈報，不代表 Plan Puzzle runtime / PR #25 已完成。
  - `git` executable remains unavailable in PATH in this environment, so no local git diff/status was produced.
- Need Commander：No.
- Need Reviewer：No.
- 下一步建議：
  - EXECUTION_OFFICER should route future agent status to `docs/WORKSTREAM_BLACKBOARD.md` compact entries and keep detailed reports in handoff / phase / vault documents.

## Latest Commander Governance Announcement: GitHub Is Shared Work Path

- 本輪任務名稱：Announce GitHub as mandatory shared work path.
- 任務類型：Documentation / Governance / Commander announcement.
- 修改檔案：
  - `docs/WORKSTREAM_BLACKBOARD.md`
  - `docs/NEXT_CODEX_HANDOFF.md`
- 新增檔案：無。
- 已完成：
  - 在黑板 `Current Operating Rules` 公告所有 agents：共同作業路徑一律以 GitHub 為準。
  - 明確規定 local worktree 只能作為 private staging，不是 shared truth。
  - 要求原本在本地作業的 agent 透過 scoped branch + PR 同步 GitHub；若無法 push，必須在相關 GitHub Issue / PR 回報 local branch、files、diff evidence。
  - 明確禁止用 unsynced local work 做決策。
  - 明確禁止把 unrelated dirty work 一起同步；只能發布該 workstream 授權範圍內的 scoped files。
- 未修改：功能碼、`src/`、budget engine、Plancraft core、payment / auth / webhook / AI API / DB / secrets。
- 下一步建議：將此公告同步到治理 PR / Issue，讓 GitHub 端可追蹤。

## Latest Plan Puzzle Guide Agent Task: Initialization Contract

- 本輪任務名稱：Plan Puzzle Guide Agent initialization contract.
- 任務類型：Documentation / Builder / Plan Puzzle guide workstream setup.
- 指派角色：平面拼圖引導官 Agent / Plan Puzzle Guide Agent.
- Workstream：`app/plan-puzzle-guide-agent`.
- Managed by：`EXECUTION_OFFICER`.
- 是否允許施工：Yes, docs-only within explicitly allowed scope. Runtime code deferred because worktree safety cannot be confirmed without local `git`.
- 修改檔案：
  - `docs/WORKSTREAM_BLACKBOARD.md`
  - `docs/NEXT_CODEX_HANDOFF.md`
  - `docs/CURRENT_PHASE_REVIEW_PACKET.md`
- 新增檔案：
  - `docs/plan_puzzle_guide/PLAN_PUZZLE_GUIDE_AGENT.md`
  - `docs/plan_puzzle_guide/AUTOMATION.md`
  - `docs/plan_puzzle_guide/plan_puzzle_import_flow.md`
  - `docs/plan_puzzle_guide/plan_puzzle_step_guidance.md`
  - `docs/plan_puzzle_guide/plan_puzzle_quantity_facts_contract.md`
  - `docs/plan_puzzle_guide/plan_puzzle_context_status.md`
  - `docs/plan_puzzle_guide/plan_puzzle_web_runtime_check.md`
  - `docs/plan_puzzle_guide/examples/plan_puzzle_quantity_facts.placeholder.json`
- 已完成：
  - Added blackboard self-introduction for `Plan Puzzle Guide Agent`.
  - Recorded `Managed By: EXECUTION_OFFICER`.
  - Recorded no-idle rule: after blackboard self-introduction, if no response arrives within 20 minutes, continue the next safe initialization task; do not report `本 workstream 本輪無新指派` before initialization is complete.
  - Confirmed existing automation file `C:\Users\USER\.codex\automations\plan-puzzle-guide-agent-patrol\automation.toml` is ACTIVE with `FREQ=MINUTELY;INTERVAL=15`.
  - Defined import and guide flow for PNG/JPG import, PDF interface-only handling, underlay calibration, scale setting, walls, openings, zones, SVG / `.pc` preview, and placeholder plan facts.
  - Defined `PlanPuzzleQuantityFacts`, `plan_quantity_facts_id`, `svg_artifact_id`, and `quantity_context_status`.
  - Defined receiving windows for SVG, zone, area, wall length, and opening count with `placeholder` / `linked` / `verified`.
  - Added placeholder JSON example.
- 未修改：
  - `src/stitch_laibe_landing_onboarding/preview_floor_plan/code.html`
  - `src/stitch_laibe_landing_onboarding/preview_floor_plan/plan-puzzle.js`
  - `plancraft/`
  - budget engine
  - renderer / Output Documents
  - MethodSpec / Raw Candidate
  - payment / escrow / listing fee
  - DB / auth / AI API / secrets
  - package / framework files
- Runtime status：`WEB_RUNTIME_PENDING`.
- Runtime evidence：
  - Read-only review of `code.html` found existing import, calibration, wall/opening/zone controls, progress banner, budget CTA, draft export, and `.pc` spike export UI.
  - Read-only review of `plan-puzzle.js` found existing image import handling, PDF unsupported message, FileReader underlay, calibration, wall drawing, opening logic, zone / zone boundary / area candidate logic, draft export, `.pc` spike, and renderer preview spike metadata.
- Missing / blocker：
  - `docs/ISSUE_BLACKBOARD_PATROL_WORKFLOW.md` is missing locally.
  - Local `git` executable is unavailable in PATH, so dirty worktree safety cannot be confirmed.
  - Runtime does not yet visibly output the new `PlanPuzzleQuantityFacts` placeholder contract.
  - Browser runtime verification was not completed in this round.
- 是否涉及 routing / CTA / header：No runtime code change. Existing plan-puzzle progress / CTA were reviewed read-only.
- 是否涉及資料模型：No runtime schema change. Docs-only placeholder contract created for plan-puzzle output context.
- 是否涉及敏感區域：No.
- 是否可供使用者後續主動審查：Yes, as docs-only workstream initialization and contract setup.
- 下一步建議：
  1. After worktree safety is confirmed, wire a mock-only runtime facts panel into `preview_floor_plan` without calling Budget Engine, renderer, DB, AI API, payment, or Plancraft core.
  2. Verify browser runtime and then move status from `WEB_RUNTIME_PENDING` to `MOCK_READY` or `WEB_RUNTIME_VERIFIED`.

## Latest Owner Guide Agent Task: Mock Runtime Surface

- 本輪任務名稱：Owner Guide Agent no-idle mock runtime follow-up.
- 任務類型：Web Flow Builder / Owner Guide mock runtime.
- 指派角色：需求引導官 Agent / Owner Guide Agent.
- Workstream：`app/owner-guide-agent`.
- Managed by：`EXECUTION_OFFICER`.
- 是否允許施工：Yes, as no-idle continuation after initialization report and user instruction to execute other tasks.
- 修改檔案：
  - `src/stitch_laibe_landing_onboarding/onboard_ai_agent/code.html`
  - `docs/owner_guide/owner_guide_web_runtime_check.md`
  - `docs/WORKSTREAM_BLACKBOARD.md`
  - `docs/NEXT_CODEX_HANDOFF.md`
- 新增檔案：無。
- 已完成：
  - Added a front-end-only Owner Guide mock runtime surface to `onboard_ai_agent`.
  - Added local in-memory `OwnerGuideSessionState` with `QuestionAnswerLog` rendering.
  - Added visible requirement summary and next-step recommendation CTA.
  - Added visible `OwnerIntent` JSON output.
  - Added visible `ProjectRequirementBrief placeholder` JSON output.
  - Marked outputs as mock / placeholder only and not for formal pricing.
  - Updated Owner Guide runtime check status to `MOCK_READY`.
  - Updated compact blackboard row for Owner Guide from `INIT_DOCS_DONE` to `MOCK_READY`.
- 未修改：
  - budget engine
  - renderer / Output Documents
  - MethodSpec / Raw Candidate
  - Plancraft core
  - payment / escrow / listing fee
  - DB / auth / production AI API / secrets
  - package / framework / dependency setup
- 驗證：
  - Static source check found `ownerGuideState`, `qaLogList`, `OwnerIntent JSON`, `ProjectRequirementBrief Placeholder`, `recordOwnerAnswer()`, and `renderOwnerGuideOutputs()`.
  - Static source check found no `fetch`, `XMLHttpRequest`, OpenAI key, Supabase, local storage, indexedDB, or formal estimate line wiring.
  - Route target `src/stitch_laibe_landing_onboarding/bid_comparison_and_ai_summary/code.html` exists for the mock bid-preparation CTA.
- 未完成 / blocker：
  - Browser runtime verification could not complete because the in-app browser runtime fails to start in this environment.
  - JavaScript syntax check through local `node.exe` could not complete because the WindowsApps `node.exe` returns access denied.
  - Local `git` / `gh` executables are still unavailable in PATH, so commit / push / PR remain not completed from this environment.
- Runtime status：`MOCK_READY`.
- 是否涉及 routing / CTA / header：
  - CTA: Yes, page-level next-step CTA was added inside the Owner Guide mock surface.
  - Routing: Only existing local page links are referenced; no routing architecture was changed.
  - Header: No header architecture change.
- 是否涉及資料模型：
  - No production model change. Runtime-only mock objects mirror the documented placeholder contracts.
- 是否涉及敏感區域：No.
- 是否可供使用者後續主動審查：Yes.
- 下一步建議：
  1. Re-run browser verification when the browser runtime is available.
  2. Keep all handoff outputs mock / placeholder until an explicitly authorized integration harness exists.

## Latest Blackboard Rebuild: Compact Current-State Board

- 本輪任務名稱：Rebuild oversized GitHub workstream blackboard.
- 任務類型：Documentation / Governance.
- 修改檔案：
  - `docs/WORKSTREAM_BLACKBOARD.md`
  - `docs/NEXT_CODEX_HANDOFF.md`
- 新增檔案：無。
- 已完成：
  - 將過大的 `docs/WORKSTREAM_BLACKBOARD.md` 重建為 compact current-state board。
  - 新增 `Blackboard Rebuild Announcement`，明確宣告黑板不再承載完整 patrol log / chat transcript / heartbeat history。
  - 保留 active agents、Integration Readiness Gate、`BUDGET_ENGINE_ENTRY_BLOCKER` handoff、Support Agents、Future / Standby Agent Backlog 與 compact update format。
  - 明確維持 Integration Gate: `WAITING`。
  - 明確記錄 blocking item：MethodSpec / `BUDGET_ENGINE_ENTRY_BLOCKER`。
  - 明確記錄 owner：`LAIBE_REVIEWER_INTEGRATION_OFFICER`。
  - 明確記錄 next：Identify current Budget Engine entry before integration harness。
- 未修改：
  - `src/`
  - budget engine
  - `budget-generator.ts`
  - MethodSpec implementation
  - Raw Candidate implementation
  - Output Documents runtime
  - Plancraft core
  - payment / auth / webhook / AI API / DB / secrets
- 已知風險：
  - 舊黑板正文被 compact board 取代；歷史細節需從 Git history、`docs/NEXT_CODEX_HANDOFF.md`、`docs/CURRENT_PHASE_REVIEW_PACKET.md`、或 `docs/budget_knowledge_vault/` 查。
  - 本輪未查遠端 GitHub 最新 PR / Issue metadata；重建依據為本機目前文件與使用者最新指示。
- 下一步建議：
  - 後續 agent 只用 compact update format 更新黑板。
  - 詳細工作報告放 handoff、phase packet 或該 workstream 專用文件，不再塞入黑板。

## Latest Owner Guide Agent Task: Initialization Contract

- 本輪任務名稱：Owner Guide Agent initialization contract.
- 任務類型：Documentation / Builder / Owner requirement intake workstream setup.
- 指派角色：需求引導官 Agent / Owner Guide Agent.
- Workstream：`app/owner-guide-agent`.
- Managed by：`EXECUTION_OFFICER`.
- 是否允許施工：Yes, docs-only within the explicitly allowed scope.
- 修改檔案：
  - `docs/WORKSTREAM_BLACKBOARD.md`
  - `docs/NEXT_CODEX_HANDOFF.md`
- 新增檔案：
  - `docs/owner_guide/OWNER_GUIDE_AGENT.md`
  - `docs/owner_guide/AUTOMATION.md`
  - `docs/owner_guide/owner_guide_question_flow.md`
  - `docs/owner_guide/owner_guide_session_state.md`
  - `docs/owner_guide/owner_intent_contract.md`
  - `docs/owner_guide/project_requirement_brief_placeholder.md`
  - `docs/owner_guide/next_step_recommendation_rules.md`
  - `docs/owner_guide/owner_guide_web_runtime_check.md`
  - `docs/owner_guide/examples/owner_intent.sample.json`
  - `docs/owner_guide/examples/project_requirement_brief.placeholder.json`
  - `docs/owner_guide/examples/qa_session.sample.json`
- 已完成：
  - Added blackboard self-introduction for `Agent Self-Introduction: Owner Guide Agent`.
  - Recorded `owner-guide-agent-patrol` every 15 minutes.
  - Recorded no-idle rule: after blackboard report, if no response within 20 minutes, continue the next safe initialization task; do not report `本 workstream 本輪無新指派` before initialization is complete.
  - Defined basic project, space, style, budget signal, schedule, asset status, and next-step question flow.
  - Defined `OwnerGuideSessionState`, `QuestionAnswerLog`, `OwnerIntent`, `ProjectRequirementBrief placeholder`, `RequirementGapChecklist`, and next-step recommendation rules.
  - Added sample `OwnerIntent`, `ProjectRequirementBrief placeholder`, and QA session JSON.
- 未修改：
  - `src/stitch_laibe_landing_onboarding/onboard_ai_agent/code.html`
  - `src/`
  - `app/`
  - budget engine
  - renderer / Output Documents
  - MethodSpec / Raw Candidate
  - Plancraft core
  - payment / escrow / listing fee
  - DB / auth / AI API / secrets
- Runtime status：`WEB_RUNTIME_PENDING`.
- Runtime evidence：
  - Read-only review of `src/stitch_laibe_landing_onboarding/onboard_ai_agent/code.html` found an existing mock guide panel, text input, mock response area, and plan/budget links.
  - Browser verification was attempted but the in-app browser could not start in this environment. No source runtime was changed in this docs-only initialization.
- Missing / blocker：
  - `docs/ISSUE_BLACKBOARD_PATROL_WORKFLOW.md` is missing locally.
  - Runtime does not yet visibly output the new `OwnerIntent` / `ProjectRequirementBrief placeholder` contracts.
  - Browser runtime remains unverified because the in-app browser could not start in this environment.
  - Local `git` / `gh` executables are unavailable in PATH, so local commit / push / PR could not be completed from this environment.
- 是否涉及 routing / CTA / header：No code change. Read-only runtime check notes existing plan/budget links.
- 是否涉及資料模型：No runtime schema change. Docs-only placeholder contracts were created for requirement-intake outputs.
- 是否涉及敏感區域：No.
- 是否可供使用者後續主動審查：Yes, as docs-only workstream initialization and contract setup.
- 下一步建議：
  1. After scoped authorization, wire the mock owner-guide runtime to show QA log, requirement summary, next-step CTA, `OwnerIntent`, and `ProjectRequirementBrief placeholder`.
  2. Keep all outputs mock / placeholder and do not connect real AI API, DB, payment, budget engine, renderer, MethodSpec, Raw Candidate, or Output Documents.

## Latest Plan Puzzle Operating Rule: 20-Minute Self-Progression

- 本輪任務名稱：Plan Puzzle 20-minute self-progression rule.
- 任務類型：Documentation / Workstream operating rule.
- 修改檔案：
  - `docs/WORKSTREAM_BLACKBOARD.md`
  - `docs/NEXT_CODEX_HANDOFF.md`
- 已完成：
  - 已在黑板記錄 @Plan-Puzzle 不得被動等待最高指揮官回應。
  - 已升級 @Plan-Puzzle 為 Plan Puzzle workstream responsible owner：可以累積完成工作、驗證證據、review-ready summary 給 Commander 審查，但不能因缺少新指令而停工。
  - 已明確禁止用 `本輪無新指令` 作為主要回報或停工理由；若沒有新 Commander 指令，必須回報自選的安全下一步與實際 evidence。
  - 已定義任務回報或 Commander review request 後 20 分鐘無回應時，將等待項目暫記為 `WAITING_COMMANDER_20MIN_SKIPPED`，並轉往下一個安全、同範圍、非高風險任務。
  - 已列出可自我推進項目：read-only 狀態刷新、docs/handoff/blackboard clarification、可不污染 worktree 的 browser/runtime validation、或不依賴 Commander 回覆的已授權 Plan Puzzle 子任務。
  - 已列出停止條件：不得 merge/push/close PR or Issue/resolve review thread，不得碰 Plancraft core、budget adapter/runtime/types、formal estimate、renderer、payment、AI API、DB、secrets、package/framework/install、production webhook。
- 未修改：
  - `src/stitch_laibe_landing_onboarding/preview_floor_plan/code.html`
  - `src/stitch_laibe_landing_onboarding/preview_floor_plan/plan-puzzle.js`
  - Plancraft core
  - budget adapter/runtime
  - package.json / node_modules / framework setup
  - AI API / DB / payment / escrow / listing fee / secrets
- Need Commander：
  - No for activating this operating rule.
  - Yes only when a skipped item requires product, merge, or high-risk decision.
- Need Reviewer：
  - No for this docs-only operating rule.
  - Yes only if the next task touches runtime code, data model, budget adapter/runtime, guard, Plancraft core, or merge readiness.
- 下一步唯一建議：
  - 若 Commander review invite 20 分鐘內沒有回應，@Plan-Puzzle should proceed to the next safe Plan Puzzle item: read-only PR #25 refresh or browser validation evidence collection, depending on current tooling availability.

## Latest Budget Knowledge Vault Task: Structure + Automation

- 本輪任務名稱：Budget Knowledge Vault structure and automation repair.
- 任務類型：Documentation / Support Agent Knowledge Vault / Automation setup.
- 指派角色：預算知識庫 / Budget Knowledge Vault Agent.
- Workstream：`knowledge/budget-vault`.
- Managed by：`LAIBE_REVIEWER_INTEGRATION_OFFICER`.
- 修改檔案：
  - `docs/WORKSTREAM_BLACKBOARD.md`
  - `docs/NEXT_CODEX_HANDOFF.md`
- 新增檔案：
  - `docs/budget_knowledge_vault/00_index.md`
  - `docs/budget_knowledge_vault/AUTOMATION.md`
  - `docs/budget_knowledge_vault/01_quote_factory/qf_status_summary.md`
  - `docs/budget_knowledge_vault/01_quote_factory/qf_export_package_notes.md`
  - `docs/budget_knowledge_vault/02_raw_candidate/raw_candidate_status_summary.md`
  - `docs/budget_knowledge_vault/02_raw_candidate/raw_candidate_handoff_notes.md`
  - `docs/budget_knowledge_vault/03_method_spec/methodspec_status_summary.md`
  - `docs/budget_knowledge_vault/03_method_spec/methodspec_rule_guard_notes.md`
  - `docs/budget_knowledge_vault/04_output_documents/output_documents_status_summary.md`
  - `docs/budget_knowledge_vault/04_output_documents/output_snapshot_renderer_notes.md`
  - `docs/budget_knowledge_vault/05_integration_backlog/integration_gap_register.md`
  - `docs/budget_knowledge_vault/05_integration_backlog/integration_readiness_matrix.md`
  - `docs/budget_knowledge_vault/06_proposals/method_spec_proposals.md`
  - `docs/budget_knowledge_vault/06_proposals/pricing_review_proposals.md`
  - `docs/budget_knowledge_vault/06_proposals/unit_conversion_proposals.md`
  - `docs/budget_knowledge_vault/06_proposals/output_feedback_proposals.md`
  - `docs/budget_knowledge_vault/07_decision_logs/reviewer_decisions.md`
  - `docs/budget_knowledge_vault/07_decision_logs/commander_decisions.md`
- 自動化：
  - Codex app heartbeat `budget-knowledge-vault-patrol` 已建立。
  - 巡邏頻率：每 12 分鐘。
  - Scope：只巡查 `knowledge/budget-vault`，不巡查全專案。
- 已完成：
  - 建立 Budget Knowledge Vault Markdown 結構。
  - 建立 / 記錄 12 分鐘巡邏 automation。
  - 在 `docs/WORKSTREAM_BLACKBOARD.md` 補上完整 `Agent Self-Introduction: Budget Knowledge Vault`。
  - 建立四條預算核心線 summary：Quote Factory、Raw Candidate、MethodSpec、Output Documents。
  - 建立 integration gap register、readiness matrix、proposal registers、reviewer / commander decision logs。
  - 保留 Requirement Form / ProjectRequirementBrief window 與 Plan Puzzle SVG / Quantity Facts window 邊界。
- 未碰範圍：`src/`、`app/`、`components/`、Quote Factory repo、raw warehouse implementation、MethodSpec implementation、Output Documents implementation、Budget Engine、PricingRule、BudgetEstimateLine、正式價格、正式報價、n8n、Obsidian runtime、AI API、Supabase / DB、payment / escrow / listing fee、integration harness、Plancraft。
- 是否涉及 routing / CTA / header：No.
- 是否涉及資料模型：No runtime schema change; Markdown knowledge-vault summaries only.
- 是否涉及敏感區域：No.
- 是否可供使用者後續主動審查：Yes, as docs-only support-agent setup.
- 已知風險：
  - 目前本地主工作樹存在大量既有 unrelated dirty changes；本輪未還原、未刪除、未修改那些變更。
  - `git` 不在 PATH，但 MinGit fallback 可用於 read-only/status 與後續非破壞性 Git 操作。
- 下一步建議：若要發布到 GitHub，僅 stage `docs/budget_knowledge_vault/`、`docs/WORKSTREAM_BLACKBOARD.md`、`docs/NEXT_CODEX_HANDOFF.md` 後建立 `knowledge/budget-vault` branch / commit / PR；不得把既有 unrelated dirty changes 帶入。

## Latest Plan Puzzle UI IA Correction: ACCEPT_WITH_NOTES

- 本輪任務名稱：Plancraft+ 平面拼圖 UI 區域與工具區重整 - UI IA 修正。
- Commander conclusion：ACCEPT_WITH_NOTES。
- 任務類型：Documentation / Governance / plan-puzzle IA clarification。
- 指派角色：平面拼圖 / Plan Puzzle Builder。
- 本輪不進入：Tool Catalog Data Model Spike。
- 修改檔案：
  - `docs/NEXT_CODEX_HANDOFF.md`
  - `docs/CURRENT_PHASE_REVIEW_PACKET.md`
  - `docs/WORKSTREAM_BLACKBOARD.md`
- 未修改檔案 / 區域：
  - 未修改 `src/stitch_laibe_landing_onboarding/preview_floor_plan/code.html`
  - 未修改 `src/stitch_laibe_landing_onboarding/preview_floor_plan/plan-puzzle.js`
  - 未修改 `C:\laibe_project\plancraft`
  - 未修改 Plancraft core
  - 未修改 budget adapter / budget runtime
  - 未新增 `package.json`
  - 未新增 `node_modules`
  - 未新增 React / Vite / TypeScript app
  - 未執行 `npm install`
  - 未解除 `formalEstimateGuard`
  - 未做正式估價
  - 未接真 AI API / DB / payment / escrow / listing fee
- UI 四大區域定義：
  - 檔案區：處理匯入、檔案來源、底圖狀態、比例校正入口與草稿保存 / 匯出狀態；不負責預算、正式上傳或雲端儲存。
  - 工具區：放置牆體、門窗、空間標籤、邊界、圖層顯示、項目庫入口與快捷操作；不直接產生正式預算。
  - 畫布：承載 underlay、grid、牆體、門窗、空間邊界、空間標籤、檢查提示與互動選取；是使用者編輯區，不是 budget input authority。
  - 狀態區：顯示目前匯入、比例、牆體 / 門窗 / zone、area metadata、系統提醒、送出前檢查與總預覽摘要；不宣稱審查通過或正式估價完成。
- 10 個產品圖層與現有技術圖層關係：
  - 丈量底圖 / 原圖層：對應現有 `underlayLayer` 與 grid。
  - 牆體 / 結構層：對應現有 `wallLayer`、`project.walls`、`nodeGraph.edges`。
  - 門窗 / 開口層：對應現有 `openingLayer`、`project.openings`。
  - 空間 / zone 層：對應現有 `zoneLayer` 與 `zonePolygonLayer`。
  - 衛浴圖層：產品語意圖層；應連到 bathroom zone 與其項目庫項目，不是新的正式預算來源。
  - 防水圖層：產品語意圖層；應依附衛浴 / 陽台等 zone 與邊界檢查，不等於可直接估價。
  - 木作櫃圖層：產品語意圖層；應連到家具 / 收納項目，不等於 current technical layer。
  - 系統櫃圖層：產品語意圖層；應連到系統櫃項目庫與擺放物件，不等於 current technical layer。
  - 廚具圖層：產品語意圖層；應連到 kitchen zone 與廚具項目，不等於 formal quote line。
  - 水電 / 空調圖層：產品語意圖層；水電與空調可在 UI 上分組或拆分顯示，但目前只能作需求標記 / 系統提醒，不得直接產生正式工程量。
- 項目庫定位：
  - 項目庫不是圖層。
  - 項目庫是可放置 / 標記的工程或物件分類資料來源，必須跟目前圖層連動，例如選到衛浴 zone 才顯示防水 / 衛浴設備候選項，選到牆或開口才顯示相關門窗 / 牆面項目。
  - 項目庫後續若要落地資料模型，需另開明確授權任務，不可在本輪偷做。
- 系統提醒 / 總預覽 / 送出前檢查 / 快捷鍵說明定位：
  - 系統提醒：顯示缺比例、open boundary、invalid boundary、缺 zone、areaConfidence 低、reviewerRequired 等非阻斷 / 阻斷提示。
  - 總預覽：彙整目前圖層、zone、area metadata、未完成檢查與草稿狀態；不是 renderer preview，也不是 budget preview。
  - 送出前檢查：作為草稿交給下一階段前的 gate checklist；不得解除 formal estimate guard。
  - 快捷鍵說明：只說明畫布操作快捷鍵，不應承擔產品流程、正式送出或預算產生職責。
- 邊界：
  - 不得宣稱正式預算完成。
  - 不得接真 AI API。
  - 不得把 SVG / renderer preview 當 budget input。
  - 不得解除 `formalEstimateGuard`。
  - 不得修改 Plancraft core。
  - 不得把 candidate area 當 production quantity。
- 未完成事項：
  - 尚未做 Tool Catalog Data Model Spike。
  - 尚未實作完整項目庫互動。
  - 尚未把 10 個產品圖層全部接成可操作 UI。
  - 尚未把產品圖層轉成正式 budget adapter input。
  - 尚未完成 undo / redo history。
  - 尚未做正式報價、Excel / PDF writer、AI API、真雲端儲存。
- 測試 / 驗證：
  - 本輪為文件 IA 修正，未改功能碼。
  - 重新讀取 `preview_floor_plan/code.html` 與 `plan-puzzle.js` 相關片段確認現有技術圖層與狀態命名。
  - 本機 `git` executable / PATH 仍不可用，無法執行 `git diff`。
- Need Commander：Yes。需要最高指揮官確認此 IA 描述是否符合產品方向。
- Need Reviewer：No。本輪只改治理 / handoff / 黑板 / review packet 文件，未碰功能碼、資料模型、budget runtime、guard、adapter 或 Plancraft core。
- 下一步唯一建議：Plancraft+ Tool Catalog Interaction Implementation。

## Latest Blackboard Update: Budget Knowledge Vault Support Agent Boundary

- 本輪任務名稱：Blackboard - Budget Knowledge Vault support agent boundary.
- 任務類型：Governance / Documentation / Commander boundary update.
- 修改檔案：
  - `docs/WORKSTREAM_BLACKBOARD.md`
  - `docs/NEXT_CODEX_HANDOFF.md`
- 新增檔案：無。
- 已完成：
  - 在 `docs/WORKSTREAM_BLACKBOARD.md` 新增 `Support Agents Managed by Integration Officer` 區塊。
  - 登記 `預算知識庫 / Budget Knowledge Vault Agent`，workstream 為 `knowledge/budget-vault`。
  - 明確標示該 agent 由 `LAIBE_REVIEWER_INTEGRATION_OFFICER` 管理，狀態為 `ACTIVE_SUPPORT`，完成比例由整合官回報。
  - 明確標示該 agent 不列入 Integration Readiness Gate，也不列入四條預算核心完成率。
  - 補上 Commander 邊界：最高指揮官只記錄存在與引用整合官狀態，不直接派工、不要求補件、不要求改文件、不要求 PR / automation / 全局巡檢。
- Integration Readiness Gate：仍只包含 `quote-factory/price-range-governance`、`warehouse/raw-candidate`、`warehouse/method-spec`、`output/budget-documents`。
- 未碰範圍：`src/`、功能碼、budget engine、renderer runtime、payment / auth / webhook、AI API、DB、secrets、GitHub PR / merge / close 狀態。
- 已知風險：此為本機文件更新；若要成為 GitHub 黑板共同真相，仍需後續用乾淨 branch / PR 發布。
- 下一步建議：後續 hourly report 若提到 `knowledge/budget-vault`，只寫 `Managed by Integration Officer`；若整合官回報 blocker，轉交整合官；若整合官回報 `Need Commander: Yes`，再摘要給使用者裁決。

## Latest Output Documents Task: Integration Usage Note

- 本輪任務名稱：Output Documents integration usage note.
- 任務類型：Documentation / Budget Output Warehouse Task.
- 指派角色：預算成品物流系統 / Output Documents.
- 是否允許施工：Yes, docs-only within Output Documents scope.
- 修改檔案：
  - `docs/NEXT_CODEX_HANDOFF.md`
- 新增檔案：
  - `docs/budget/28-output-documents-integration-usage-note.md`
- 已完成：
  - 建立 Output Documents 參與 budget integration harness 的使用說明。
  - 明確規定 Output Documents 只接受 `BudgetOutputSnapshot` 或 snapshot-gated render document。
  - 明確拒絕 `RawCandidate`、`MethodSpecCatalog`、`PricingRule`、`PriceObservation`、`PriceRange`、RAG / AI response、需求表單文字與 SVG / plan-puzzle artifact 作為直接 renderer input。
  - 補上 Requirement Context Trace Window 與 Plan / SVG Trace Window，並限制兩者只能透過 snapshot trace 進入 internal trace / reviewer note / customer disclaimer。
  - 保留 placeholder / dry-run / not customer-facing 標示規則。
- 未碰範圍：budget engine、pricing、material resolver、raw warehouse、MethodSpecCatalog、RAG / AI API、payment / escrow / listing fee、plan-puzzle、preview_floor_plan、正式 Excel / PDF、customer-facing final quote。
- 驗證狀態：
  - 本機 `git` executable / PATH 仍不可用，無法建立 branch、commit、PR 或執行 `git diff`。
  - 本輪可引用 merged PR #23 evidence 作為 snapshot-only renderer/static-guard baseline。
- 是否涉及 routing / CTA / header：No.
- 是否涉及資料模型：No runtime schema change; documentation only mentions trace-window fields for integration usage.
- 是否涉及敏感區域：No.
- 是否可供使用者後續主動審查：Yes, as docs-only Output Documents integration note.
- 下一步建議：若要發布到 GitHub，需先修復 Git PATH 或由有 GitHub branch/PR 權限的環境將本地文件提交到 `output/integration-usage-note` branch 並開 PR `Add Output Documents integration usage note`.

## Latest Blackboard Update: New-Machine Read-only Handoff Patrol Alias

- 本輪任務名稱：Blackboard - New-Machine Read-only Handoff Patrol Alias.
- 任務類型：Documentation / Blackboard routing note.
- 修改檔案：
  - `docs/WORKSTREAM_BLACKBOARD.md`
  - `docs/NEXT_CODEX_HANDOFF.md`
- 新增檔案：無。
- 已完成：
  - 在 `docs/WORKSTREAM_BLACKBOARD.md` 的 `New Computer Takeover Patrol Contact` 段落補上 mention alias：`@laibe-mvp-new-machine-readonly-handoff`.
  - 將此 alias 定義為 existing read-only handoff patrol 的通知 handle，不建立新角色、不重新命名聊天室。
  - 要求 Commander 派發 local Git availability diagnostics、repo visibility checks、new-machine handoff intake 任務時，mention `@laibe-mvp-new-machine-readonly-handoff`。
  - 在黑板 update log 補記本次 `CONTACT_ALIAS_REGISTERED`。
- 未碰範圍：runtime code、frontend、budget engine、renderer、raw warehouse、MethodSpec runtime、payment / escrow / listing fee、AI API、DB、migrations、secrets、Plancraft core、GitHub PR / Issue state。
- 已知限制：此機目前仍找不到 Git executable，因此本輪無法用 `git status` / `git diff` 正式驗證工作樹或 diff；本輪只用檔案重讀確認文字落點。
- 下一步建議：Commander 後續若要喚起本新機 read-only handoff patrol，請在黑板、Issue comment 或指令中明確寫 `@laibe-mvp-new-machine-readonly-handoff`.

## Latest Blackboard Update: New Computer Takeover Patrol Contact

- 本輪任務名稱：Blackboard - New Computer Takeover Patrol Contact.
- 任務類型：Documentation / Blackboard routing note.
- 修改檔案：
  - `docs/WORKSTREAM_BLACKBOARD.md`
  - `docs/NEXT_CODEX_HANDOFF.md`
- 新增檔案：無。
- 已完成：
  - 在 `docs/WORKSTREAM_BLACKBOARD.md` 的 contact 區新增 `New Computer Takeover Patrol Contact`.
  - 登記 mention handle：`@laibe-mvp-new-computer-takeover-patrol`.
  - 補上短 mention alias：`@LaibeTakeoverCodex`.
  - 說明此 thread 只負責 read-only GitHub / repo governance takeover patrol、metadata reconciliation drift、Deputy2 visible ACK、automation stale、final-gate visibility、Commander / Reviewer need checks.
  - 要求 Commander 派發 read-only takeover patrol、metadata reconciliation、final-gate visibility、Deputy2 ACK visibility、automation stale checks 時，mention `@laibe-mvp-new-computer-takeover-patrol` 或 `@LaibeTakeoverCodex`.
  - 保留回報 signature：`Source: New Computer Takeover Patrol` followed by `Round Result:`.
- 未碰範圍：source implementation files、routing code、page UI、budget engine、renderer、formal price、formal Excel/PDF、payment、real AI API、upload、secrets、plancraft、GitHub PR / Issue state、merge / reject / close actions。
- 下一步建議：Commander 後續若要喚起本接管巡查 thread，請在黑板、Issue comment 或指令中明確寫 `@laibe-mvp-new-computer-takeover-patrol` 或 `@LaibeTakeoverCodex`.

## Latest Blackboard Update: MethodSpec Warehouse Contact

- 本輪任務名稱：Blackboard - MethodSpec Warehouse Patrol Contact.
- 任務類型：Documentation / Blackboard routing note.
- 修改檔案：
  - `docs/WORKSTREAM_BLACKBOARD.md`
  - `docs/NEXT_CODEX_HANDOFF.md`
- 新增檔案：無。
- 已完成：
  - 在 `docs/WORKSTREAM_BLACKBOARD.md` 的 `warehouse/method-spec` 狀態區新增 contact handle：`@MethodSpec Warehouse Patrol`.
  - 登記角色身分為：配件倉庫：工法與規格 / MethodSpec Warehouse patrol.
  - 要求 Commander 派發 MethodSpec Warehouse、MethodSpec validator、Issue #16 / PR #22、或 `warehouse/method-spec-validator-freeze-note` 巡檢任務時，mention `@MethodSpec Warehouse Patrol`。
  - 保留回報 signature：`Source: MethodSpec Builder` followed by `Round Result:`.
- 未碰範圍：runtime code、schemas、pricing rules、formal prices、`BudgetEstimateLine.unit_price`、renderer/output、raw warehouse、frontend、payment / escrow / listing fee、AI API、DB、migrations、secrets、GitHub PR / Issue state。
- 下一步建議：Commander 後續若要喚起本 MethodSpec patrol thread，請在黑板、Issue comment 或指令中明確寫 `@MethodSpec Warehouse Patrol`.

## Latest Governance Update: Output Budget Documents Mention Handle

- 本輪任務名稱：Blackboard Output Budget Documents Contact Introduction。
- 任務類型：Documentation / Blackboard dispatch contact update。
- 修改檔案：
  - `docs/WORKSTREAM_BLACKBOARD.md`
  - `docs/NEXT_CODEX_HANDOFF.md`
- 新增檔案：無。
- 已完成：
  - 已在 `docs/WORKSTREAM_BLACKBOARD.md` 的 Command Structure 區塊新增 `Output Budget Documents Contact`。
  - 成品物流：預算表單輸出本聊天室 mention handle 設為 `@OutputBudgetDocuments`。
  - 已註明最高指揮官派發 Output Documents、renderer snapshot-only、static guard、preflight、artifact manifest、dry-run writer 或 placeholder writer hardening 任務時，應在指令中 mention `@OutputBudgetDocuments`。
  - 已註明本聊天室回報 signature：`Source: OutputBudgetDocuments` followed by `Round Result:`。
- 未碰範圍：source code、budget engine、pricing rules、material resolver、MethodSpecCatalog、raw warehouse、Plan Puzzle、frontend、payment、DB/API、migration、AI API、secrets、real Excel/PDF output、GitHub PR / Issue 狀態。
- 已知風險：無；此更新只建立派工識別名稱，不代表新增角色權限或擴大成品物流施工範圍。
- 下一步建議：最高指揮官若要派發成品物流相關任務，可在任務開頭加入 `@OutputBudgetDocuments`，讓本聊天室辨識任務歸屬。

## Latest Blackboard Update: Triage Officer Contact

- 本輪任務名稱：Blackboard - LaiBE MVP Triage Officer Contact.
- 任務類型：Documentation / Blackboard routing note.
- 修改檔案：
  - `docs/WORKSTREAM_BLACKBOARD.md`
  - `docs/NEXT_CODEX_HANDOFF.md`
- 新增檔案：無。
- 已完成：
  - 在 `docs/WORKSTREAM_BLACKBOARD.md` 的 `Active Deputy Authority` 後方新增 `LaiBE MVP Triage Officer Contact`.
  - 登記 mention handle：`@LaiBE MVP Triage Officer`.
  - 說明此角色只負責 routing、lag classification、complexity sorting、state reconciliation、recovery routing.
  - 要求 Commander 派發 triage / heartbeat / lag classification / workstream routing / stale automation / active-handler silence / PR-Issue state reconciliation 任務時，使用 `@LaiBE MVP Triage Officer`。
- 未碰範圍：source implementation files、routing code、page UI、budget engine、renderer、formal price、formal Excel/PDF、payment、real AI API、upload、secrets、plancraft、GitHub PR / Issue state。
- 下一步建議：Commander 後續若要喚起本 triage thread，請在黑板、issue comment 或指令中明確寫 `@LaiBE MVP Triage Officer`.

## Latest Web Flow Builder Update: Flow Simplification Correction

- 本輪任務名稱：Web Flow Builder - Flow Simplification Correction。
- 任務範圍：依使用者回饋，收斂預算與招標後段頁面邏輯，避免一頁頁拆成不直覺的主流程節點。
- 修改檔案：
  - `src/stitch_laibe_landing_onboarding/onboard_ai_agent/code.html`
  - `src/stitch_laibe_landing_onboarding/preview_budget/code.html`
  - `src/stitch_laibe_landing_onboarding/budget_document_preview/code.html`
  - `src/stitch_laibe_landing_onboarding/client_step_4_budget_finalization/code.html`
  - `src/stitch_laibe_landing_onboarding/preview_floor_plan/code.html`
  - `src/stitch_laibe_landing_onboarding/tender_notice/code.html`
  - `src/stitch_laibe_landing_onboarding/tender_setting/code.html`
  - `src/stitch_laibe_landing_onboarding/tender_publish_success/code.html`
  - `src/stitch_laibe_landing_onboarding/client_awarding_dashboard/code.html`
  - `docs/WEB_FLOW_PAGE_MATRIX.md`
  - `docs/NEXT_CODEX_HANDOFF.md`
- 新增檔案：無。
- 已完成：
  - 官方 owner flow 收斂為：需求整理 → 平面拼圖 → 預算生成 → 招標 → Dashboard。
  - `preview_floor_plan/code.html` 的下一步已改為 `client_step_4_budget_finalization/code.html`，不再先進 `preview_budget`。
  - `client_step_4_budget_finalization/code.html` 已定位為預算生成頁；預算編輯、確認與摘要預覽在同一頁處理，下一步進 `tender_notice/code.html`。
  - `preview_budget/code.html` 與 `budget_document_preview/code.html` 降為 compatibility / old-entry 頁，不再是官方 progress 節點。
  - `tender_notice/code.html` 改為合併後的招標頁；舊的招標說明、招標設定、發布完成三段不再拆成 6/7/8 三步。
  - `tender_setting/code.html` 與 `tender_publish_success/code.html` 降為 compatibility / old-entry 頁，導回招標頁或 Dashboard。
  - `onboard_ai_agent/code.html` 的報價單 / 報價健檢入口改指向預算生成頁，避免再導向舊預算預覽頁。
  - `client_awarding_dashboard/code.html` 已由舊白底 Tailwind 草稿改為黑底金屬 Dashboard 候選頁，移除 `href="#"`，並接回需求整理、平面拼圖、預算生成與招標。
- 未碰範圍：budget engine、raw warehouse、MethodSpec、output renderer、real AI API、real upload backend、payment / escrow / listing fee、webhook、plancraft core。
- 已知風險：
  - `client_awarding_dashboard/code.html` 仍是 Dashboard endpoint candidate，尚未接真登入、真案件資料、真投標資料或正式 award logic。
  - `preview_budget`、`budget_document_preview`、`tender_setting`、`tender_publish_success` 仍存在作為相容入口；若未來要完全下架，需使用者另行授權，不可自行刪除。
- 下一步建議：若要繼續後段流程，檢查 `bid_comparison_and_ai_summary/code.html` / `client_document_selection/code.html` 是否應作為 Dashboard 分支；不要接真 backend 或金流。

## Previous Web Flow Builder Update: Tender Batch 1A

- 本輪任務名稱：Web Flow Builder - Tender Batch 1A。
- 任務範圍：依 `docs/WEB_FLOW_PAGE_MATRIX.md` 的 Batch 1A，將招標說明、招標設定、發布完成三頁作為同一個 owner-flow route cluster 處理。
- 修改檔案：
  - `src/stitch_laibe_landing_onboarding/tender_notice/code.html`
  - `src/stitch_laibe_landing_onboarding/tender_setting/code.html`
  - `src/stitch_laibe_landing_onboarding/tender_publish_success/code.html`
  - `docs/WEB_FLOW_PAGE_MATRIX.md`
  - `docs/NEXT_CODEX_HANDOFF.md`
- 新增檔案：無。
- 已完成：
  - `tender_notice/code.html` 從舊白底 Tailwind / old logo 改為 LaiBE 黑底、水泥紋理、金屬玻璃、cyan 高光、橘色 CTA 的招標說明頁。
  - `tender_setting/code.html` 從舊白底 Tailwind / old logo 改為同系統招標設定 mock 頁。
  - `tender_publish_success/code.html` 從舊白底 / 綠色成功頁改為同系統發布完成 mock 頁。
  - 三頁均使用同一組 header tools dropdown：平面拼圖、預算生成、LiDAR、iScanner。
  - 三頁均使用 standalone progress banner：需求整理 → 平面拼圖 → 預算預覽 → 預算確認 → 文件預覽 → 招標說明 → 招標設定 → 發布完成。
  - `tender_setting` 移除舊的 listing fee / payment 路由意圖；金流、圈存、上架費以 disabled / mock-only 說明呈現。
  - `tender_publish_success` 的下一步導向 `client_awarding_dashboard/code.html` 作為 dashboard 候選頁。
- 未碰範圍：listing_fee_payment_*、payment / escrow / listing fee、real publish backend、webhook、budget engine、raw warehouse、MethodSpec、output renderer、real AI API、real upload backend、plancraft core。
- 已知風險：
  - `client_awarding_dashboard/code.html` 仍是 dashboard 候選頁，尚未 formalize，可能是下一個舊版風格斷點。
  - `tender_setting/` 在本輪前已是既有 untracked path，本輪只沿用該指定頁施工，未處理其他 dirty worktree。
- 下一步建議：由使用者確認 dashboard 正式頁候選，再執行 Batch 1B，處理 `client_awarding_dashboard/code.html` / `bid_comparison_and_ai_summary/code.html` / `client_document_selection/code.html` 中被選定的 dashboard cluster。

## Previous Web Flow Builder Update: Budget Preview / Budget Edit Flow Correction

- 本輪任務名稱：Web Flow Builder - Budget Preview / Budget Edit Flow Correction。
- 任務範圍：修正預算預覽頁與預算生成編輯頁的角色混淆，並同步目前主流程草稿頁的 header tools / progress bar routing。
- 修改檔案：
  - `src/stitch_laibe_landing_onboarding/onboard_ai_agent/code.html`
  - `src/stitch_laibe_landing_onboarding/preview_floor_plan/code.html`
  - `src/stitch_laibe_landing_onboarding/preview_budget/code.html`
  - `src/stitch_laibe_landing_onboarding/client_step_4_budget_finalization/code.html`
  - `src/stitch_laibe_landing_onboarding/budget_document_preview/code.html`
  - `docs/NEXT_CODEX_HANDOFF.md`
- 新增檔案：無。
- 已完成：
  - `preview_budget/code.html` 明確改為「預算預覽 / Budget Preview」，不再把本頁稱為預算生成編輯頁。
  - `client_step_4_budget_finalization/code.html` 從舊白底頁改為同一套黑底、水泥紋理、金屬玻璃、cyan 高光、橘色 CTA 的預算確認 / 編輯 mock 頁。
  - `budget_document_preview/code.html` 從舊白底頁改為同一套黑底草稿，作為「預算確認 → 文件預覽」的 mock-only 頁。
  - `preview_budget` 的「進入預算確認」保留為進入預算生成後編輯 / 確認頁的入口。
  - 主流程 progress bar 統一為：需求整理 → 平面拼圖 → 預算預覽 → 預算確認。
  - 需求整理節點改指向最新版需求頁定位：`../onboard_ai_agent/code.html#guideInput`。
  - Header tools 的「預算生成」改指向 `../client_step_4_budget_finalization/code.html`，避免把預覽頁誤當編輯頁。
  - Onboarding header tools 補上 LiDAR / iScanner 外部 app search links，PCM backend 改用現有 landing flow anchor，避免 `#pcm` dead anchor。
- 未碰範圍：budget engine、raw warehouse、MethodSpec、output renderer、payment / escrow / listing fee、real AI API、real upload backend、plancraft core、homepage。
- 下一步建議：接著檢查 `tender_notice/code.html` 或 dashboard 候選頁，讓「文件預覽 → 招標 / dashboard」後段流程不要回到舊版或 orphan page。

## Previous Web Flow Builder Update: Budget Preview Formalization

- 本輪任務名稱：Web Flow Builder - Budget Preview Formalization。
- 任務範圍：只處理網站主流程中的 `preview_budget/code.html`，讓預算生成頁接上目前 landing / onboarding / plan-puzzle 的黑底金屬視覺與 workflow routing。
- 修改檔案：`src/stitch_laibe_landing_onboarding/preview_budget/code.html`、`docs/NEXT_CODEX_HANDOFF.md`。
- 新增檔案：無。
- 已完成：
  - 將預算生成頁從舊版白底 preview 改為 LaiBE 黑底、水泥紋理、金屬玻璃、細線、cyan 高光與橘色主 CTA 的同系統視覺。
  - Header 改為與平面拼圖頁一致的 logo / 導覽感，工具入口採 dropdown。
  - Header tools dropdown 包含：平面拼圖、預算生成、LiDAR、iScanner。
  - Progress bar 已獨立於 header 下方，節點可點：需求整理、平面拼圖、預算生成、預算確認。
  - 頁面級 CTA 放在頁面右上方：返回平面拼圖、進入預算確認。
  - 匯出草稿標記為尚未開放的 disabled 狀態，避免偽裝成已完成功能。
  - 頁面明確標示 mock mode：不接真 budget engine、不接 AI API、不接真上傳、不產生正式 Excel / PDF。
- Routing / CTA：
  - 返回平面拼圖固定指向 `../preview_floor_plan/code.html`，原因是此頁在主流程中明確承接平面拼圖。
  - 下一步主 CTA 指向 `../client_step_4_budget_finalization/code.html`。
  - Progress bar 需求整理指向 `../onboard_ai_agent/code.html`，平面拼圖指向 `../preview_floor_plan/code.html`，預算生成指向 `./code.html`，預算確認指向 `../client_step_4_budget_finalization/code.html`。
- 未碰範圍：budget engine、raw warehouse、MethodSpec、output renderer、payment / escrow / listing fee、real AI API、real upload backend、plancraft core、homepage。
- 下一步建議：接著小步 formalize `client_step_4_budget_finalization/code.html` 或 `budget_document_preview/code.html`，讓預算生成後的確認 / 文件預覽 flow 不再停在舊版或候選頁。

## Latest Local GPU Worker Resource Status

- 本輪任務名稱：Local GPU Worker Resource Status。
- 任務類型：Documentation / Local Tooling Governance / Multi-agent Dispatch Note；本輪不修改 production feature code。
- 新增檔案：`docs/LOCAL_GPU_WORKER_STATUS.md`。
- 本地 worker 硬體：RTX 4070 12GB、RAM 64GB、Intel i9-11900K。
- 本地 AI 環境：Ollama `0.24.0`、Codex CLI `0.131.0`、`qwen2.5-coder:7b`。
- 已確認 Ollama 推理會使用 GPU。
- `qwen2.5-coder:7b` 可分派工作：指定檔案 read-only 分析、小範圍 bug tracing、程式解釋、unified diff 草稿、測試草稿。
- `qwen2.5-coder:7b` 不可分派工作：正式改檔、Codex OSS `workspace-write` 自動 patch、跨檔重構、架構決策、高風險 production scope。
- 禁止本地 GPU worker 觸碰：payment、auth、webhook、`.env`、secrets、real API key、production deployment、正式金流 / 託管 / listing fee。
- 正式 patch 仍應由 cloud Codex 或人工 review 後執行；本地 GPU worker 只提供分析與草稿。
- 後續分派任務時，先判斷：是否可交給本地 GPU worker 做 read-only analysis；是否需要 cloud Codex 正式 patch；是否需要使用者人工確認。
- 未修改：`src/`、production feature code、payment、auth、webhook、`.env`、secrets、`plancraft/`、package / dependency files。
- 未執行：`npm install`、model pull、workspace-write 測試、commit、merge、push。

## Latest Local AI Workflow Update: Draft Patch Mode

- 本輪任務名稱：Local AI workflow draft patch mode。
- 任務類型：Documentation / Local Tooling Governance；本輪不修改 production feature code。
- 已更新 `docs/LOCAL_AI_WORKFLOW.md` 與 `docs/LOCAL_AI_WORKFLOW_TROUBLESHOOTING.md`。
- `qwen2.5-coder:7b` 已降級為 read-only analysis / patch draft 模式。
- `qwen2.5-coder:7b` 可用於：解釋程式碼、找 bug 線索、產生 unified diff 草稿、產生測試案例草稿、小範圍技術問答。
- `qwen2.5-coder:7b` 不得用於：Codex OSS `workspace-write` 自動改檔、production patch、架構決策、payment/auth/webhook/`.env`/secrets 相關操作。
- 真正改檔應由 cloud Codex、人工 review 後手動套用，或只在 sandbox 內做人工控制 patch。
- 未修改：`AGENTS.md`、`src/`、production、payment、auth、webhook、`.env`、secrets。
- 未執行 commit / merge / push。

## Latest Local AI Workflow Task: GPU-backed Codex + Ollama setup

- 本輪任務名稱：Local GPU AI Coding Workflow Setup。
- 任務類型：Documentation / Local Tooling Setup / Safe Sandbox；本輪不修改 production feature code。
- 已建立 branch：`local-ai-workflow`。
- 已安裝 Ollama for Windows，版本 `0.24.0`；目前安裝路徑為 `C:\Users\J\AppData\Local\Programs\Ollama\ollama.exe`。
- 已確認 Codex CLI 版本 `0.131.0`；PowerShell `.ps1` wrapper 可能受 execution policy 影響，建議使用 `codex.cmd`。
- 已下載本地模型：`qwen2.5-coder:7b`，大小約 `4.7 GB`。
- 已驗證 `codex exec --oss --local-provider ollama -m qwen2.5-coder:7b` 可呼叫本地 Ollama provider。
- 已用 `nvidia-smi` 取樣驗證 RTX 4070 參與 Ollama 推理：推理期間 VRAM 從約 2GB used 上升到約 7GB used，GPU utilization 最高取樣約 29%。
- 新增檔案：
  - `docs/LOCAL_AI_WORKFLOW.md`
  - `local_ai_sandbox/README.md`
  - `local_ai_sandbox/add-safe.js`
  - `local_ai_sandbox/test-add-safe.js`
- 修改檔案：
  - `AGENTS.md`
  - `docs/NEXT_CODEX_HANDOFF.md`
- `AGENTS.md` 僅新增 Local GPU AI Coding Workflow Addendum，規定本地 agent 只能做小步可回復 patch，不得做架構決策，不得碰 payment/auth/webhook/secrets/plancraft，不得大型跨檔重構。
- `docs/LOCAL_AI_WORKFLOW.md` 記錄日常使用命令、Codex `--oss` 啟動方式、本地/雲端分工、安全規則、Git review 流程與 GPU 驗證方式。
- `local_ai_sandbox/` 是唯一新增的安全測試區，不屬於 production code。
- 未修改：`src/` production flow、payment、auth、webhook、`.env`、secrets、`plancraft/`、package files、framework 設定。
- 注意：目前 repo 在本輪開始前已有大量既有 dirty / untracked / deleted 狀態；本輪未清理、未 reset、未 checkout 還原、未刪除任何既有檔案。
- 下一步建議：日常使用時先由 cloud Codex/ChatGPT 判斷任務範圍，再用 local Codex + Ollama 做單檔或 sandbox patch，完成後必跑 `git diff --stat`、`git diff` 與最小測試。

## Latest Visual Simulation State Reconciliation: Issue #19 / PR #24

- 本輪任務名稱：Visual Simulation State Reconciliation。
- GitHub Issue #19 `[Visual Simulation] Add visual brief prompt sandbox governance packet` 已 closed。
- GitHub PR #24 `Add visual prompt sandbox governance packet` 已 merged。
- PR #24 merge commit `cf170e248a48be2df43f6cd6e6db0ef956cd5658` 已確認可由最新 `origin/main` 追溯到。
- 已同步 `docs/WORKSTREAM_BLACKBOARD.md`，將 Visual Simulation 舊 active dispatch 標記為 completed，避免後續 heartbeat 繼續把 #19 / #24 當成 active stall、pending、blocked 或 needs-review。
- 已同步 `docs/CURRENT_PHASE_REVIEW_PACKET.md`，補記 Issue #19 / PR #24 合併狀態。
- 本輪未修改 source code，未修改 `plan-puzzle.js`，未碰 Plancraft geometry、budget official data、renderer、raw warehouse、MethodSpec 或 payment。
- 本輪沒有 real image API、沒有 API key / `.env`、沒有 reference image upload、沒有 backend/proxy、沒有 production storage、沒有 production asset。
- Visual Simulation 仍只能作為案件上架與風格溝通輔助，不得宣稱為施工圖、正式設計圖、真實案例、正式報價依據或完工保證。
- 下一階段若需要新 Issue，只能限於 visual scope matrix、style taxonomy、trust levels、asset naming rules、sandbox preview state policy、placeholder visual card spec、reviewer packet、prompt / negative prompt governance refinement。

## Latest Raw Candidate Warehouse Task: R1.5 Source Quality Scoring / Reviewer Checklist

- 本輪任務名稱：Raw Warehouse R1.5 source quality scoring / reviewer checklist。
- 任務來源：GitHub Issue #17 `[Raw Candidate] Add R1.5 source quality scoring reviewer checklist`。Issue #21 是 duplicate，已被 Deputy Codex 關閉並指向 #17。
- 修改檔案：
  - `src/lib/budget/raw-warehouse/types.ts`
  - `docs/CURRENT_PHASE_REVIEW_PACKET.md`
  - `docs/NEXT_CODEX_HANDOFF.md`
  - `docs/WORKSTREAM_BLACKBOARD.md`
- 新增檔案：
  - `docs/budget/26-raw-source-quality-scoring-reviewer-checklist.md`
  - `src/lib/budget/raw-warehouse/source-quality-scoring.ts`
  - `src/lib/budget/raw-warehouse/demo-raw-source-quality-scoring.ts`
- R1.5 新增 `SourceQualityAssessment`、`ReviewerChecklistItem`、`SourceQualityGrade` 與 `ReviewerChecklistStatus`，用於 candidate-only source quality scoring。
- `scoreSourceQualityForCandidates()` 只讀 `RawCatalogSource`、`RawCatalogItem`、`RawCatalogCandidate` 與 `CandidateValidationResult`，輸出 source quality score、grade、reviewer checklist、recommended review status 與 recommendation reason。
- R1.5 reviewer checklist 檢查 source identity、source date、source reliability、raw item trace、suggested code、unit、currency、observed price evidence-only 與 validation status。
- `observed_price` 仍只作 evidence；R1.5 不產生正式 `PricingRule`、`MaterialSpec`、`LaborRule`、`BudgetEstimateLine.unit_price`、正式報價或 customer-facing output。
- `formal_price_generated` 維持 `false`；`price_authority` 維持 `"none"`；`observed_price_is_evidence_only` 為 `true`。
- Demo command：`node --experimental-strip-types src/lib/budget/raw-warehouse/demo-raw-source-quality-scoring.ts`。
- R1.5 demo sample result：16 sources、29 raw items、29 candidates、29 source quality assessments、average quality score `81`、grade counts `excellent: 15`, `good: 8`, `poor: 5`, `blocked: 1`；proposal contract / warehouse export safety / observed price safety / static guard 全部通過。
- 驗證已執行並通過：
  - `node --experimental-strip-types src/lib/budget/raw-warehouse/demo-raw-source-quality-scoring.ts`
  - `node --experimental-strip-types src/lib/budget/raw-warehouse/demo-raw-warehouse-static-guard.ts`
  - `node --experimental-strip-types --check src/lib/budget/raw-warehouse/source-quality-scoring.ts`
  - `node --experimental-strip-types --check src/lib/budget/raw-warehouse/demo-raw-source-quality-scoring.ts`
  - `node --experimental-strip-types src/lib/budget/raw-warehouse/demo-raw-negative-source-quality-fixtures.ts`
  - `node --experimental-strip-types src/lib/budget/raw-warehouse/demo-raw-multi-source-fixtures.ts`
  - `node --experimental-strip-types src/lib/budget/raw-warehouse/demo-raw-data-feeding-trial.ts`
  - `node --experimental-strip-types src/lib/budget/raw-warehouse/demo-raw-review-contract-safety.ts`
  - `node --experimental-strip-types src/lib/budget/raw-warehouse/demo-raw-catalog-warehouse.ts`
- Known external verification blocker：`node --experimental-strip-types src/lib/budget/demo-generate-budget.ts` 與 `node --experimental-strip-types src/lib/budget/demo-load-budget-warehouse.ts` 目前因 `src/lib/budget/budget-generator.ts` 缺失而失敗；這不是 R1.5 改動造成，且不在 raw warehouse Issue scope 內。
- 本輪未修改 renderer / Excel / PDF、`BudgetOutputSnapshot`、MethodSpec 主規則、平面拼圖、frontend、DB/API、RAG/AI API、payment、escrow 或 listing fee。
- 下一步建議：可針對 R1.5 做 reviewer pass，檢查 source quality scoring 是否仍停留在 candidate evidence layer，以及 static guard / price safety 是否仍成立。

## Latest Plan-Puzzle Task: Plancraft+ Zone Area / Boundary Refinement

- 本輪任務名稱：Plancraft+ Zone Area / Boundary Refinement。
- 任務來源：黑板 dispatch 與 GitHub Issue #15 `Plancraft+ Zone Area / Boundary Refinement`。
- 修改檔案：
  - `src/stitch_laibe_landing_onboarding/preview_floor_plan/plan-puzzle.js`
  - `docs/CURRENT_PHASE_REVIEW_PACKET.md`
  - `docs/NEXT_CODEX_HANDOFF.md`
- 新增檔案：無。
- `project.version` 已升級為 `0.11.0-zone-area-boundary-refinement`。
- zone boundary 仍維持人工選邊，不做自動 room closure、不做自動排序複雜邊界、不修改 wall / opening / nodeGraph。
- 已新增 zone area candidate metadata：`areaSqMm`、`areaM2`、`areaPing`、`areaSource`、`areaStatus`、`areaConfidence`、`areaProductionReady`、`areaAuthority`、`reviewerRequired`、`reviewerReasons`、`areaUpdatedAt`。
- 當 zone boundary 為 `closed` 且 polygon 有效時，用 shoelace formula 由 mm polygon 計算候選面積；換算 `m²` 與 `坪`，`areaSource` 固定為 `spike_polygon_estimate`。
- 當 boundary 未封閉、無效、edge 缺失或點數不足時，不計算正式面積，`areaStatus` 會標示 `not_calculated` / `open_boundary` / `invalid`，並保留 reviewer reasons。
- `areaProductionReady` 永遠是 `false`；本輪沒有讓任何 zone area 進入正式 budget quantity，也沒有修改 budget adapter、budget types、`generateBudgetEstimate()`、Excel / PDF、renderer 或 payment / AI / API。
- 右側 zone inspector 會顯示候選面積狀態、`m² / 坪`、area source、confidence 與 `productionReady: false`，並提示 area 只作候選估算、不作正式估價。
- Plancraft+ 草稿 JSON export 會包含最新 zone boundary 與候選 area metadata。
- 驗收：`node --check src/stitch_laibe_landing_onboarding/preview_floor_plan/plan-puzzle.js` 通過。
- 已知限制：候選面積只支援已形成 closed polygon 的 zone；未做 production-grade area approval、precision policy gate、adapter production mapping 或 formal estimate。
- 下一步建議：Production Quantity Fact Contract 或 Zone Area Review Gate，仍需保持 candidate-only，不可直接進正式估價。

## Latest Documentation Task: Plancraft+ Production Adapter Design Doc

- 本輪任務名稱：Plancraft+ Production Adapter Design Doc。
- 任務類型：Design Doc / Contract Planning / No Runtime Implementation；本輪只做 production adapter 設計文件與交接文件更新。
- 新增檔案：
  - `docs/budget/plancraft-plus-production-adapter-design.md`
- 修改檔案：
  - `docs/CURRENT_PHASE_REVIEW_PACKET.md`
  - `docs/NEXT_CODEX_HANDOFF.md`
- 未修改：`C:\laibe_project\plancraft`、`src/stitch_laibe_landing_onboarding/preview_floor_plan/plan-puzzle.js`、`src/stitch_laibe_landing_onboarding/preview_floor_plan/code.html`、`src/lib/budget/adapters/preview-floor-plan-adapter.ts`、`src/lib/budget/types.ts`、`src/lib/budget/budget-generator.ts`、`src/lib/budget/demo-generate-budget-from-preview-floor-plan.ts`。
- 沒有新增 `package.json`、`node_modules`、React / Vite / TypeScript app、後端 API、AI API、Excel / PDF、DB migration、payment / escrow / listing fee。
- 沒有把 Plancraft+ adapter 升級成 production；沒有解除 `productionReady: false`；沒有解除 `formal_estimate_generation` blocked guard；沒有修改 `generateBudgetEstimate()` 正式估價邏輯。
- 設計文件明確定義：Plancraft+ production adapter 只能讀 Plancraft+ draft JSON；`.pc` converter output、SVG、renderer preview、underlay image data、AI style visual preview 都不得作為 budget input。
- 設計文件定義 production input contract：`product === "Plancraft+"`、`unit === "mm"`、version range、scale calibrated、valid `nodeGraph.edges`、closed zone boundary、valid polygon、valid openings、wall status/provenance 與 forbidden input。
- 設計文件定義 zones → production `Space` 的條件：closed boundary、valid edge ids、valid polygon、approved area、areaSource / areaConfidence / reviewer status；未封閉或 estimated-only 仍只能是 candidate。
- 設計文件定義 area policy：可在封閉 polygon 上用 shoelace formula，保留 `area_mm2`、`area_m2`、`area_ping`、rounding rule 與 formula；未封閉 boundary 不得進正式面積。
- 設計文件定義 `nodeGraph.edges` → wall facts 的條件：length / thickness / status / structural / sourceWallId / edgeId / from / to 都必須保留；new / demolished / structural wall 需 reviewer confirmation。
- 設計文件定義 openings → door / window / opening facts 的條件：valid edgeId、offset / width 驗證、height / sillHeight / swing policy；invalid 或 missing edge 只能 candidate。
- 設計文件定義 furniture / object future contract，但明確標記目前 Plancraft+ furniture / object placement unsupported，不能產生 production `LayoutObject`。
- 設計文件定義 guard model：保留 `productionReady`、`adapterMode`、`formalEstimateGuard`、candidate vs production、provenance、unsupported、warnings、blocked reason codes。
- 設計文件定義 downstream safety：`generateBudgetEstimate()` 只能接受 production-ready input；spike input、candidate facts、blocked formal guard 必須被拒；Excel / PDF writer 只能讀 snapshot，不得讀 Plancraft+ draft 或重跑 budget engine。
- 設計文件列出 migration plan：P1 Design Doc、P2 Zone Area / Boundary Refinement、P3 Production Quantity Fact Contract、P4 Reviewer-gated Production Adapter、P5 Formal Estimate Dry-run、P6 Excel / PDF Writer Integration。
- 下一步若繼續施工，建議先做 Zone Area / Boundary Refinement 或 Production Quantity Fact Contract；若要進入 production adapter 前，可由使用者視需要交給 LAIBE_REVIEWER 做階段審查。

## Previous Builder Task: Plancraft+ Budget Adapter Guard Hardening - Required Fix

- 本輪任務名稱：Plancraft+ Budget Adapter Guard Hardening - Required Fix。
- 任務類型：Builder / Minimal Fix / Budget Safety；只修 Reviewer `NEEDS_CHANGES` 指出的 null / malformed input crash，不進 production adapter。
- Reviewer blocker：`normalizeFloorPlanToBudgetInput(null)` 會在 `isPlancraftPlusDraft()` 讀取 `product` 時 TypeError。
- 修改檔案：
  - `src/lib/budget/adapters/preview-floor-plan-adapter.ts`
  - `src/lib/budget/demo-generate-budget-from-preview-floor-plan.ts`
  - `docs/CURRENT_PHASE_REVIEW_PACKET.md`
  - `docs/NEXT_CODEX_HANDOFF.md`
- 新增檔案：無。
- 未修改：`C:\laibe_project\plancraft`、`src/stitch_laibe_landing_onboarding/preview_floor_plan/plan-puzzle.js`、`src/stitch_laibe_landing_onboarding/preview_floor_plan/code.html`、`laibe_landing_desktop/code.html`。
- 沒有新增 `package.json`、`node_modules`、React / Vite / TypeScript app、後端 API、AI API、Excel / PDF、DB migration、payment / escrow / listing fee。
- `preview-floor-plan-adapter.ts` 已新增 `isRecord(value)` guard：只有非 null、object、非 array 的值才會進 Plancraft+ 或 legacy shape 判斷。
- `isPlancraftPlusDraft()` 現在先檢查 object guard；`null`、`undefined`、string / number / boolean、array 不會 crash，也不會被誤判為 Plancraft+。
- 新增 `isLegacyPreviewFloorPlanDraft()` / `isValidPreviewFloorPlanRoom()`，避免 malformed object 僅因存在 `rooms` 就進 legacy path。
- `normalizeUnsupportedFloorPlanInput()` 現在接收 `unknown`，對未知或 malformed input 回傳 `source: "unknown_floor_plan_draft"`、`adapterMode: "unsupported"`、`productionReady: false`，並帶 machine-readable blocked formal estimate guard。
- smoke cases 已補進 `demo-generate-budget-from-preview-floor-plan.ts`：`null_input`、`undefined_input`、`string_input`、`zones_only`、`pc_only`、`valid_plancraft_plus`、`legacy_input`。
- 驗收：
  - `node --experimental-strip-types --check src/lib/budget/adapters/preview-floor-plan-adapter.ts` 通過。
  - `node --experimental-strip-types --check src/lib/budget/demo-generate-budget-from-preview-floor-plan.ts` 通過。
  - `node --experimental-strip-types src/lib/budget/demo-generate-budget-from-preview-floor-plan.ts` 通過。
  - inline smoke 通過：null / undefined / string 不 crash；zones_only / pc_only 不誤判；valid Plancraft+ 被辨識且被 `plancraft_plus_formal_estimate_blocked` 阻止；legacy input 仍可產生既有 mock estimate。
- 未完成事項：Plancraft+ budget adapter 仍是 spike；candidate facts 仍不得進正式估價；`.pc` / SVG / renderer preview 仍不得作 budget input；尚未做 production adapter design。
- 可供後續 Reviewer re-check；不要把本修正解讀為 production adapter 通過。

## Previous Builder Task: Plancraft+ Budget Adapter Guard Hardening

- 本輪任務名稱：Plancraft+ Budget Adapter Guard Hardening。
- 任務類型：Builder / Guard Hardening / Budget Safety；只做 guard hardening，不是 production adapter。
- 指派角色：Builder / Codex；允許施工範圍限 budget adapter / guard / demo / phase packet / handoff。
- Reviewer 前一輪結論為 `PASS_WITH_NOTES`；production blocker 是 `productionReady: false` / `formal_estimate_generation` 仍偏 metadata，downstream 直接呼叫 `generateBudgetEstimate(normalized.project)` 仍可能產生 mock estimate。
- 修改檔案：
  - `src/lib/budget/adapters/preview-floor-plan-adapter.ts`
  - `src/lib/budget/types.ts`
  - `src/lib/budget/budget-generator.ts`
  - `src/lib/budget/demo-generate-budget-from-preview-floor-plan.ts`
  - `docs/CURRENT_PHASE_REVIEW_PACKET.md`
  - `docs/NEXT_CODEX_HANDOFF.md`
- 新增檔案：無。
- 未修改：`C:\laibe_project\plancraft`、`src/stitch_laibe_landing_onboarding/preview_floor_plan/plan-puzzle.js`、`src/stitch_laibe_landing_onboarding/preview_floor_plan/code.html`、`laibe_landing_desktop/code.html`。
- 沒有新增 `package.json`、`node_modules`、React / Vite / TypeScript app、後端 API、AI API、Excel / PDF、DB migration、payment / escrow / listing fee。
- Plancraft+ detection 已收窄：必須同時滿足 `product === "Plancraft+"`、`unit === "mm"`、`version` 為字串、存在 `scale`、存在 `plancraftBridge`、`plancraftBridge.targetFormat === ".pc"`，且 `nodeGraph.edges` / `zones` / `openings` 至少之一為 array；`walls` / `furniture` 若存在必須為 array。
- 不再只因為資料帶 `zones`、`openings` 或 `.pc targetFormat` 就判斷為 Plancraft+；legacy draft 不應被誤判。
- Plancraft+ adapter output 新增 `formalEstimateGuard`：
  - `blocked: true`
  - `status: "blocked"`
  - `reason: "plancraft_plus_adapter_spike"`
  - `code: "plancraft_plus_formal_estimate_blocked"`
  - `productionReady: false`
- `project.user_requirements.formal_estimate_generation` 已升級為 machine-readable guard object；另保留 `formal_estimate_generation_status: "blocked"` 作最小相容。
- `generateBudgetEstimate()` 入口已呼叫 `assertBudgetInputProductionReady(project)`；若輸入帶 `productionReady === false`、`adapter_mode === "plancraft_plus_spike"` 或 `formal_estimate_generation.status === "blocked"`，會丟出受控 `BudgetEstimateBlockedError`，reason code 為 `plancraft_plus_formal_estimate_blocked`。
- 新增 helper：`isFormalEstimateBlocked(project)`、`assertBudgetInputProductionReady(project)`；下游若不直接呼叫 generator，也可先用 helper 檢查。
- `demo-generate-budget-from-preview-floor-plan.ts` 現在同時展示：
  - legacy preview-floor-plan input 仍可產生既有 mock estimate。
  - Plancraft+ normalized output 固定 `productionReady: false`，且嘗試進入 `generateBudgetEstimate()` 時會被 guard 阻止。
- warnings 保留：`plancraft_plus_adapter_spike`、`plancraft_plus_area_not_calculated`、`plancraft_plus_openings_candidate_only`、`plancraft_plus_furniture_not_supported`、`plancraft_plus_pc_not_budget_input`、`plancraft_plus_svg_not_budget_input`、`plancraft_plus_formal_estimate_blocked`、`plancraft_plus_zone_boundary_not_closed`、`plancraft_plus_opening_edge_missing`、`plancraft_plus_edge_length_invalid`。
- 驗收：
  - `node --experimental-strip-types --check src/lib/budget/types.ts`
  - `node --experimental-strip-types --check src/lib/budget/adapters/preview-floor-plan-adapter.ts`
  - `node --experimental-strip-types --check src/lib/budget/budget-generator.ts`
  - `node --experimental-strip-types --check src/lib/budget/demo-generate-budget-from-preview-floor-plan.ts`
  - `node --experimental-strip-types src/lib/budget/demo-generate-budget-from-preview-floor-plan.ts`
  - inline smoke：Plancraft+ blocked、unknown zones/openings-only draft 不誤判為 Plancraft+。
- 後續不得宣稱 Plancraft+ adapter production-ready；不得讓 Plancraft+ candidate facts 進正式估價；不得把 `.pc` / SVG / renderer preview 當 budget input。
- 建議下一步：可供使用者主動觸發 User-triggered Review，審查 guard hardening；後續若繼續施工，建議先做 Production Adapter Design Doc，而不是直接進 production adapter。

## Latest Visual Simulation Task: Minimal Real Server Runtime Spike

- 本輪任務名稱：Minimal Real Server Runtime Spike。
- 任務類型：Builder / Minimal Server Runtime Spike / proof of concept only；不是 production integration，沒有部署，也沒有把 disabled adapter 升級成 production API。
- 本輪檢查結果：`C:\laibe_project` 根目錄沒有 `package.json`、`node_modules`、`api/`、`server/`、`backend/`、`functions/`、`netlify.toml`、`vercel.json`、`wrangler.toml` 或既有可安全承載 same-origin image proxy 的 server runtime。
- 本輪判斷：目前 LaiBE MVP 仍以靜態 `file:///` 頁面為主，不適合在未決定 runtime 選型前硬造 `api/` 或 `server/` production-like 結構。
- 本輪採用路線 B：沒有建立 server/proxy stub，沒有新增 backend/api/functions/server 目錄，沒有新增 `package.json`、`node_modules` 或任何 framework。
- 修改檔案：
  - `src/stitch_laibe_landing_onboarding/preview_floor_plan/code.html`
  - `docs/NEXT_CODEX_HANDOFF.md`
- 新增檔案：無。
- `code.html` 只將 `plan-puzzle.js` cache query 更新為 `?v=minimal-server-runtime-spike`，避免瀏覽器快取仍讀舊標記；沒有修改 routing、CTA、Header 或頁面主流程。
- `plan-puzzle.js` 未於本輪修改；`callStyleVisualImageProxy(styleVisualApiRequest)` 仍預設 disabled，沒有 `fetch()`、沒有 `XMLHttpRequest`，不直連外部 image API，不包含 API key。
- Future same-origin proxy contract 仍只能是 `/api/style-visual-image-spike`；目前 endpoint 未啟用、未呼叫、未依賴。
- `styleVisualApiRequest` contract 維持白名單欄位：`roomType`、`primaryStyle`、`secondaryStyle`、`colorTone`、`materialTone`、`budgetLevel`、`purpose: "bid-listing-style-reference"`、`disclaimerRequired: true`、`referenceImage: { allowed: false, reason: "reference image upload requires separate privacy review" }`。
- `styleVisualApiRequest` 不得包含 `rawPrompt`、`systemPrompt`、`developerPrompt`、`walls`、`openings`、`zones`、`scale`、`plancraftBridge`、正式預算資料、reference image file 或使用者私宅圖片。
- `styleVisualApiResponse` contract 維持 `status: "disabled" | "mock_ready" | "error"`、`imageUrl: null`、`previewDataUrl: null`、`message` 與 metadata。metadata 必須保留 `generatedBy: "LAIBE_VISUAL_SIM"`、`usage: "bid-listing-style-reference"`、`sandbox: true`、`isOfficialDesign: false`、`isConstructionDrawing: false`、`isQuotationBasis: false`、`isRealCase: false`、`savedToOfficialCase: false`。
- UI fallback 仍顯示 `Server-side Image API proxy 尚未設定`；Visual Simulation Panel 必須保留 `Sandbox Preview`、`AI 示意圖`、`非正式圖片`、`不會保存到正式案件`、`非真實案例`、`非正式成果` 與固定 disclaimer。
- `styleVisualTask.generatedPreview` 仍只能是 local UI task state；不得寫入 `project`、export JSON、正式案件資料、production assets、budget data、`walls`、`openings`、`zones`、`scale` 或 `plancraftBridge`。
- Reference image upload 仍 disabled，`referenceImage.allowed` 必須維持 `false`；不得建立 upload pipeline。
- 本輪沒有 real image API、沒有 OpenAI 或第三方模型呼叫、沒有 API key、沒有 `.env`、沒有 secret、沒有 production endpoint。
- `file:///` 架構仍保留；若 Codex in-app browser 阻擋 file protocol，請用 localhost 或 headless browser 驗證，並由使用者本機手動確認嚴格 file protocol 體驗。
- 若下一步要建立真 server runtime，需先由使用者決定 runtime 選型：local Node server、Python dev server + separate proxy、Netlify Function、Vercel Function、Cloudflare Worker 或其他部署方式。
- 下一步在進入任何真 server runtime、真 API request、key 注入、production connection 或 reference image upload 前，請使用者視需要交給 LAIBE_REVIEWER 審查本輪 spike 邊界。

## Latest Builder Task: Plancraft+ → Budget Adapter Contract Spike

- 本輪任務名稱：Plancraft+ → Budget Adapter Contract Spike。
- 任務類型：Builder / Adapter Contract Spike / budget-system integration preparation。
- 指派角色：Builder / Codex；允許施工，範圍限 budget adapter contract 與 phase/handoff 文件。
- 本輪涉及資料模型與 budget-system adapter，但不是 production budget adapter。
- 修改檔案：
  - `src/lib/budget/adapters/preview-floor-plan-adapter.ts`
  - `src/lib/budget/types.ts`
  - `docs/CURRENT_PHASE_REVIEW_PACKET.md`
  - `docs/NEXT_CODEX_HANDOFF.md`
- 新增檔案：無。
- 未修改：`C:\laibe_project\plancraft`、`preview_floor_plan/code.html`、`preview_floor_plan/plan-puzzle.js`、`laibe_landing_desktop/code.html`。
- 沒有新增 `package.json`、`node_modules`、React / Vite / TypeScript app、後端 API、AI API、payment / escrow / listing fee。
- `preview-floor-plan-adapter.ts` 現在支援兩條路徑：
  - legacy `rooms / objects / layout_objects` draft：保留原行為，仍轉成 `Space` 與 `LayoutObject`。
  - Plancraft+ draft：辨識 `product: "Plancraft+"`、`nodeGraph.edges`、`openings`、`zones` 或 `plancraftBridge.targetFormat === ".pc"` 後，走 spike mapping。
- Plancraft+ adapter output 固定：`source: "plancraft_plus_draft"`、`adapterMode: "plancraft_plus_spike"`、`productionReady: false`、`spaces`、`quantityFacts`、`layoutObjects: []`、`warnings`、`unsupported`、`provenance`。
- `zones` → `Space` candidate：`zone.id` 保留為 source，`zone.name` / `zone.type` 轉入 space，`labelPosition`、boundary ids、`boundaryStatus`、`boundaryIssues` 與 `polygonPointCount` 放入 `space.params`。
- `nodeGraph.edges` → wall length candidate `QuantityFact`：`existing_wall_length_candidate`、`new_wall_length_candidate`、`demolished_wall_length_candidate`；value 使用 mm 長度，保留 status / thickness / structural / provenance。
- `openings` → opening candidate `QuantityFact`：`door_opening_count`、`window_opening_count`、`wall_opening_count`；保留 `edgeId / sourceWallId / offset / width / height / sillHeight / swing`。
- Plancraft+ path 不呼叫 `generateBudgetEstimate()`，不讀 pricing rules，不讀 MethodSpecCatalog，不產生 BudgetEstimateLine，不產生正式價格。
- `.pc` converter output 不作 budget input；SVG / renderer preview 不作 budget input；adapter 只讀 Plancraft+ draft JSON。
- furniture / object placement 仍 unsupported；`layout_objects` 仍只屬 legacy path。
- 主要 warning codes：`plancraft_plus_adapter_spike`、`plancraft_plus_area_not_calculated`、`plancraft_plus_openings_candidate_only`、`plancraft_plus_furniture_not_supported`、`plancraft_plus_pc_not_budget_input`、`plancraft_plus_svg_not_budget_input`、`plancraft_plus_formal_estimate_blocked`、`plancraft_plus_zone_boundary_not_closed`、`plancraft_plus_opening_edge_missing`、`plancraft_plus_edge_length_invalid`。
- 驗證：
  - `node --experimental-strip-types src/lib/budget/demo-generate-budget-from-preview-floor-plan.ts` 通過，legacy adapter 與既有 mock estimate 未破壞。
  - inline Plancraft+ smoke test 通過，可輸出 `productionReady: false`、1 個 Space candidate、2 個 QuantityFact candidates、0 個 layoutObjects 與必要 warnings。
- `docs/CURRENT_PHASE_REVIEW_PACKET.md` 已補上「Plancraft+ → Budget Adapter Contract Spike」段落。
- 後續不得宣稱 Plancraft+ budget adapter production-ready；不得把 candidate facts 當正式報價；不得把 `.pc` / SVG / renderer preview 當 budget input。
- 建議下一步：使用者可視需要觸發 User-triggered Review，審查 adapter contract spike 與資料邊界；不需要因 handoff 更新自動觸發審查。

## Latest Documentation Task: plan-puzzle output model / budget adapter alignment

- 本輪任務名稱：補交 plan-puzzle 輸出模型與 budget adapter 銜接狀態。
- 任務類型：Documentation / Phase Review Packet 補充；本輪沒有修改功能程式碼。
- 已更新 `docs/CURRENT_PHASE_REVIEW_PACKET.md` 的「平面拼圖 Builder 成果」區段，補上目前 `project.version = "0.10.0-renderer-preview-spike"` 的最新輸出模型與 budget adapter 銜接狀態。
- 最新 plan-puzzle 輸出模型包含 `walls`、`wallGraph`、`nodeGraph`、`openings`、`zones`、`furniture: []`、`plancraftBridge`、Plancraft+ draft JSON 與 `.pc` converter spike。
- `.pc` converter、DSL validation、renderer preview、sharedWalls、browser SVG / Renderer Preview Report、AI 風格示意與 image proxy sandbox 都不得視為 production contract。
- `src/lib/budget/adapters/preview-floor-plan-adapter.ts` 已由上方 Plancraft+ → Budget Adapter Contract Spike 補上新版 draft 辨識與 candidate mapping；但仍不是 production budget adapter。
- `src/lib/budget/mock/mock-preview-floor-plan-draft.ts` 仍是 room-based mock；不得把它當作最新 Plancraft+ wall-first draft。
- 後續若要從 spike 進入正式 plan-puzzle → budget-system adapter，仍需另開明確任務，補 zone area、formal room generation、opening validation / recipe mapping、wall recipe mapping、future furniture/object → `LayoutObject`，且不得直接產生價格。
- 不得宣稱 `.pc` converter production-ready、不得宣稱 browser SVG / renderer preview SVG 是施工圖或正式報價依據、不得宣稱最新 Plancraft+ candidate mapping 已可產生正式預算。

## Latest Plan-Puzzle Task: Plancraft+ Renderer Preview Spike

- 本輪任務名稱：Plancraft+ Renderer Preview Spike。
- 任務分派：Builder / Data Model / plan-puzzle / Plancraft bridge spike；允許施工範圍只限 `preview_floor_plan/code.html`、`preview_floor_plan/plan-puzzle.js`、`docs/NEXT_CODEX_HANDOFF.md`。
- `project.version` 已升級為 `0.10.0-renderer-preview-spike`；不得降回 `0.9.0-plancraft-dsl-validation-spike`。
- 已保留 `.pc` converter spike、DSL validation state、Zone Boundary、Zone Label、Opening Editor、nodeGraph、wallGraph、openings、zones、boundaryEdgeIds、import interface、Plancraft+ draft JSON 匯出與 `.pc` 測試版匯出。
- `project.plancraftBridge` 仍是 `status: "spike"`，新增 `preview: { status, checkedAt, svgOutputPath, command, errors, warnings }`。
- `preview.status` 預設為 `not_run`。靜態 `file:///` 頁面不直接 import Plancraft renderer、不 bundle Plancraft packages，也不能直接執行本機 CLI。
- UI 已新增 Renderer Preview Report，顯示 preview status、checkedAt、SVG output path、本機 command、warnings、errors、next action。
- UI 明確提示：`靜態頁尚未直接載入 Plancraft renderer；請使用本機 CLI compile 產生 SVG 預覽。`
- read-only 檢查過 Plancraft renderer / CLI：
  - `C:\laibe_project\plancraft\packages\renderer\package.json`
  - `C:\laibe_project\plancraft\packages\renderer\src\index.ts`
  - `C:\laibe_project\plancraft\packages\renderer\src\scene-graph.ts`
  - `C:\laibe_project\plancraft\packages\renderer\src\emitters\svg-emitter.ts`
  - `C:\laibe_project\plancraft\packages\cli\src\index.ts`
  - `C:\laibe_project\plancraft\packages\cli\src\commands\compile.ts`
  - `C:\laibe_project\plancraft\package.json`
  - `C:\laibe_project\plancraft\examples\studio-apartment.pc`
- CLI `compile` 會讀 `.pc`，用 `@plancraft/dsl` parse/resolve，再用 `@plancraft/renderer` 的 `buildSceneWithFurniture()` 與 `emitSVG()` 輸出 SVG。
- CLI 支援 `--structure-only`，其 layer set 是 `walls, openings, labels`。
- CLI 支援 `--layers <list>`，renderer layer 型別是 `walls | openings | dimensions | labels | furniture`。
- 本機 Renderer Preview 指令 A（structure-only）：
```powershell
cd C:\laibe_project
node C:\laibe_project\plancraft\packages\cli\dist\index.js compile C:\path\to\laibe-plancraft-plus-spike.pc --structure-only -o C:\path\to\laibe-plancraft-plus-spike.svg
```
- 本機 Renderer Preview 指令 B（指定 layers）：
```powershell
cd C:\laibe_project
node C:\laibe_project\plancraft\packages\cli\dist\index.js compile C:\path\to\laibe-plancraft-plus-spike.pc --layers walls,openings,labels -o C:\path\to\laibe-plancraft-plus-layers.svg
```
- 代表性 sample compile 已在不修改 Plancraft repo 的前提下執行：
  - `node C:\laibe_project\plancraft\packages\cli\dist\index.js compile C:\laibe_project\plancraft\examples\studio-apartment.pc --structure-only -o %TEMP%\laibe-plancraft-renderer-preview-structure.svg`
  - `node C:\laibe_project\plancraft\packages\cli\dist\index.js compile C:\laibe_project\plancraft\examples\studio-apartment.pc --layers walls,openings,labels -o %TEMP%\laibe-plancraft-renderer-preview-layers.svg`
  - 兩個指令皆成功寫出 SVG；這只代表 Plancraft CLI / renderer dist 可用，不代表使用者當前匯出的 `.pc` 已通過 renderer preview。
- 若要驗證目前使用者匯出的 `.pc`，請先在 browser 下載 `laibe-plancraft-plus-spike.pc`，再把上方 `C:\path\to\...` 換成實際下載路徑。
- 本輪不做 browser renderer integration、不新增後端、不新增 npm、不修改 Plancraft core。
- 尚未做 sharedWalls canonicalization；converter 仍可能對共用牆重複輸出 room walls。
- 下一步唯一建議：SharedWalls Canonicalization Spike。理由：Renderer preview 流程已建立，但 converter 的共用牆 canonicalization 仍是下一個會影響 SVG/Plancraft 結果品質的核心缺口。

## Latest Visual Simulation Task: Server-side Image API Proxy Spike

- 本輪已完成 Server-side Image API Proxy Spike 的最小前端 contract / adapter 骨架；仍是 spike / proof of concept，不是 production integration。
- 專案根目錄目前沒有 `package.json`，也沒有 `api/`、`server/`、`backend/`、`functions/`、`netlify.toml`、`vercel.json` 或可安全承載 server-side proxy 的既有 runtime。
- 因目前 LaiBE MVP 仍是靜態頁，本輪沒有建立 backend、沒有建立 proxy stub 檔、沒有部署、沒有新增 server、沒有新增 package、沒有新增 node_modules。
- 本輪沒有 real image API、沒有 OpenAI 或第三方模型呼叫、沒有 API key、沒有 `.env`、沒有 secret、沒有 production endpoint。
- `src/stitch_laibe_landing_onboarding/preview_floor_plan/plan-puzzle.js` 目前只建立 disabled 的 `callStyleVisualImageProxy(styleVisualApiRequest)` 前端 adapter。該 adapter 明確註解：未來只能呼叫 same-origin server-side proxy，不允許前端直連 image generation provider。
- 未來唯一允許的 same-origin proxy path contract 是 `/api/style-visual-image-spike`，但本輪未啟用、未呼叫、未依賴此 endpoint。
- `styleVisualApiRequest` 是本輪統一 contract 名稱，白名單欄位只有 `roomType`、`primaryStyle`、`secondaryStyle`、`colorTone`、`materialTone`、`budgetLevel`、`purpose: "bid-listing-style-reference"`、`disclaimerRequired: true`、`referenceImage: { allowed: false, reason: "reference image upload requires separate privacy review" }`。
- `styleVisualApiRequest` 不得包含 `rawPrompt`、`systemPrompt`、`developerPrompt`、`walls`、`openings`、`zones`、`scale`、`plancraftBridge`、正式預算資料、reference image file 或使用者私宅圖片。
- `styleVisualApiResponse` contract 為 `status: "disabled" | "mock_ready" | "error"`、`imageUrl: null`、`previewDataUrl: null`、`message` 與 metadata。metadata 包含 `generatedBy: "LAIBE_VISUAL_SIM"`、`usage: "bid-listing-style-reference"`、`sandbox: true`、`isOfficialDesign: false`、`isConstructionDrawing: false`、`isQuotationBasis: false`、`isRealCase: false`、`savedToOfficialCase: false`。
- Proxy disabled 時 UI 顯示 `Server-side Image API proxy 尚未設定`；ready 文案仍使用 `Sandbox 預覽已建立`，不得改成「圖片生成完成」、「正式設計完成」或 production ready。
- `styleVisualTask.generatedPreview` 仍是 local UI task state only，不寫入 `project`、export JSON、正式案件資料、production assets、budget data 或 Plancraft geometry。
- Reference image upload 仍 disabled，UI 繼續顯示 `Reference image upload 尚未開放，需經 privacy review。`
- Visual Simulation Panel 必須持續保留 `Sandbox Preview`、`AI 示意圖`、`非正式圖片`、`不會保存到正式案件`、`非真實案例`、`非正式成果` 與固定 disclaimer。
- Codex in-app browser 仍可能阻擋直接 `file:///` 驗證；請用 localhost 等價驗證，若需要嚴格 file protocol 結果需使用者本機手動確認。
- 本輪完成後若使用者主動要求審查，可交給 LAIBE_REVIEWER。Reviewer 通過前不得進入 real server runtime、真 API、上線標記、production asset pipeline 或 reference image upload。

## Latest Plan-Puzzle Task: Plancraft+ DSL Validation Spike

- 本輪任務名稱：Plancraft+ DSL Validation Spike。
- 本輪仍只修改 LaiBE 端 `src/stitch_laibe_landing_onboarding/preview_floor_plan/code.html`、`src/stitch_laibe_landing_onboarding/preview_floor_plan/plan-puzzle.js` 與本 handoff；沒有修改 `C:\laibe_project\plancraft`。
- `project.version` 已升級為 `0.9.0-plancraft-dsl-validation-spike`，不得降回 `0.8.0-plancraft-bridge-pc-spike`。
- `project.plancraftBridge.status` 維持 `spike`，並新增 `validation: { status, checkedAt, errors, warnings }`。在靜態 `file:///` 頁內預設為 `status: "not_run"`，不得假裝 browser 已通過 DSL validation。
- 已新增 `validateGeneratedPcSpike(pcText)` browser-safe placeholder。它不 import Plancraft DSL、不 bundle Plancraft packages、不新增 npm 流程，只回報需要本機 validation command。
- Converter Report 現在顯示 validation status、checkedAt、validation warnings / errors 與 next action；若未跑本機 DSL，UI 明確顯示「靜態頁尚未直接載入 Plancraft DSL；請使用本機驗證流程確認 .pc。」
- read-only 檢查過 Plancraft：`plancraft/package.json`、`packages/dsl/package.json`、`packages/cli/package.json`、`packages/dsl/src/index.ts`、`packages/dsl/src/ast/types.ts`、`packages/dsl/src/parser.ts`、`packages/dsl/src/resolver.ts`、`packages/cli/src/index.ts`、`packages/cli/src/commands/compile.ts`、`examples/studio-apartment.pc`、`examples/two-bedroom.pc`、`examples/tolosa.pc`。
- Plancraft DSL dist 已存在：`C:\laibe_project\plancraft\packages\dsl\dist\index.js`，可用 CommonJS `require(...)` 取得 `parse` / `resolve`。
- Plancraft CLI dist 已存在：`C:\laibe_project\plancraft\packages\cli\dist\index.js`，`compile` 會先 parse/resolve，再透過 renderer 輸出 SVG。
- 已用 DSL dist 驗證 examples：`studio-apartment.pc`、`two-bedroom.pc`、`tolosa.pc` 都可 parse/resolve。
- 已用 DSL dist 驗證一份代表 Plancraft+ converter 輸出 schema 的 sample `.pc`：root `{ name, scale, unit, floors }`、floor `{ name, rooms, labels }`、room `{ name, walls, doors, windows, openings }`、wall `{ direction, from, to, thickness }`、door `{ wall, offset, width, swing }`、window `{ wall, offset, width, height, sill }`、opening `{ wall, offset, width }` 可被 parse/resolve。
- 已用 CLI read-only 驗證 example compile：`node C:\laibe_project\plancraft\packages\cli\dist\index.js compile C:\laibe_project\plancraft\examples\studio-apartment.pc --structure-only -o %TEMP%\plancraft-studio-structure-validation.svg` 可成功輸出 SVG 到暫存資料夾。
- 本輪沒有把 browser 靜態頁接上 Plancraft DSL。原因：目前頁面是原生 HTML/JS，可用 `file:///` 直接開啟；直接 import `C:\laibe_project\plancraft` dist 會破壞靜態頁邊界並引入本地路徑/打包問題。
- 匯出 `.pc` 測試版仍使用 `convertPlancraftPlusToPc(project)`；匯出檔名仍是 `laibe-plancraft-plus-spike.pc`。
- `convertPlancraftPlusToPc()` 仍輸出 Plancraft examples / parser 可接受的 JSON schema；目前不輸出未知欄位如 `type`、`status`、`structural` 到 `.pc`，而是以 warnings 呈現資料遺失。
- sharedWalls 仍尚未 canonicalize；兩個 zones 共用 edge 時仍可能重複輸出 room walls，並保留 warning。
- existing / new / demolished / structural 仍不是正式 Plancraft schema 欄位；converter 會跳過 demolished boundary edge 或 warning status/structural lost。
- Swing 只輸出 Plancraft 支援的 `left` / `right` / `sliding`；不支援或 `none` 會 warning 並 fallback。
- 本機驗證指令 A，直接驗證使用者匯出的 `.pc`：

```powershell
cd C:\laibe_project
node -e "const {readFileSync}=require('node:fs'); const {parse,resolve}=require('C:/laibe_project/plancraft/packages/dsl/dist/index.js'); const file='C:/path/to/laibe-plancraft-plus-spike.pc'; const resolved=resolve(parse(readFileSync(file,'utf8'))); console.log(JSON.stringify({ok:true,floors:resolved.floors.length,rooms:resolved.floors.reduce((n,f)=>n+f.rooms.length,0)},null,2));"
```

- 本機驗證指令 B，使用 Plancraft CLI compile 進一步產 SVG：

```powershell
cd C:\laibe_project
node C:\laibe_project\plancraft\packages\cli\dist\index.js compile C:\path\to\laibe-plancraft-plus-spike.pc --structure-only -o C:\path\to\laibe-plancraft-plus-spike.svg
```

- 注意：Plancraft DSL parser 目前不接受 UTF-8 BOM；瀏覽器匯出的 `Blob` 檔不會加 BOM，但若用 PowerShell 手寫測試檔，請避免 `Set-Content -Encoding UTF8` 產生 BOM。
- 本輪另用 CLI compile 驗證代表性 Plancraft+ `.pc` sample，使用無 BOM UTF-8 寫入暫存檔後可成功輸出 `laibe-plancraft-plus-spike-sample.svg` 到 `%TEMP%`。
- 已知 validation warnings：browser UI validation 預設 `not_run`；sharedWalls 尚未 canonicalize；renderer preview 尚未做；正式 production converter 尚未建立。
- 下一步建議：Renderer Preview Spike。理由是 converter schema 已對齊 DSL parser/resolver，下一步應確認 Plancraft renderer 對匯出 `.pc` 的 SVG 視覺結果。

## Latest Plan-Puzzle Task: Plancraft+ Bridge .pc Converter Spike

- 本輪已在萊比網站平面拼圖頁建立 `.pc` 轉換測試版入口；這是 Spike，不是正式 production converter。
- 修改範圍限於 `src/stitch_laibe_landing_onboarding/preview_floor_plan/code.html`、`src/stitch_laibe_landing_onboarding/preview_floor_plan/plan-puzzle.js` 與本 handoff。
- `project.version` 已升級為 `0.8.0-plancraft-bridge-pc-spike`。
- `project.plancraftBridge` 目前為 `status: "spike"`、`targetFormat: ".pc"`、`converterVersion: "0.1.0-spike"`，並保留 `lastExportedAt`、`lastExportSummary` 與 `warnings`。
- 已新增 `convertPlancraftPlusToPc(project)`，輸出 `{ ok, pcText, pcObject, warnings, errors, summary }`。
- Converter 會用 `zones[].boundaryEdgeIds` 對應 `nodeGraph.edges` 產生 Plancraft rooms，並把 boundary edges 轉成 room `walls`。
- Converter 會嘗試把 `project.openings` 依 `edgeId` 對應到第一個匹配 room wall，轉成 Plancraft `doors` / `windows` / `openings`。
- `.pc` 測試版下載按鈕為「匯出 Plancraft .pc 測試版」，檔名 `laibe-plancraft-plus-spike.pc`。
- 原本「匯出 Plancraft+ 草稿」仍保留，檔名 `laibe-plancraft-plus-draft.json`，仍包含 underlay / walls / wallGraph / nodeGraph / openings / zones / furniture / plancraftBridge。
- UI 已新增 Converter Report，顯示 converter status、roomCount、wallCount、openingCount、skippedZoneCount、skippedOpeningCount、warnings 與 errors。
- 無 valid closed zone boundary 時不下載 `.pc`，會顯示錯誤與 report；有 valid boundary 時才下載 `.pc`。
- 本輪沒有使用 Plancraft DSL / renderer 驗證，沒有 `import @plancraft/dsl`，沒有 `import @plancraft/renderer`。
- 本輪 read-only 參考了 `C:\laibe_project\plancraft\README.md`、`examples\studio-apartment.pc`、`examples\two-bedroom.pc`、`examples\tolosa.pc`、`packages\dsl\src\ast\types.ts`、`packages\dsl\src\parser.ts`、`packages\dsl\src\resolver.ts`。
- Plancraft `.pc` 參考結論：root 是 JSON/JSONC `{ name, scale, unit, floors }`；floor 有 `rooms` / `labels`；room 以 `walls` closed polygon 為核心；door/window/opening 以 `wall` direction 掛在 room wall 上；`sharedWalls` 支援但本 Spike 尚未 canonicalize。
- 目前轉換限制會進 warnings：sharedWalls 尚未 canonicalize、Plancraft+ top-left 原點尚未做 Plancraft renderer 座標驗證、zone type 不寫入 `.pc`、new/existing/demolished status 與 structural metadata 可能遺失或被略過、door swing `none` 會警示並暫用 valid swing。
- demolished edge 不會輸出為正式 room wall；包含 demolished edge 的 zone 會被略過並 warning。
- shared edge 若有 opening，本 Spike 先掛到第一個匹配 room，並 warning shared opening 尚未 canonicalize。
- 下一步建議：Plancraft DSL Validation Spike。目標是用 Plancraft DSL parser/resolver 或 CLI 驗證 `laibe-plancraft-plus-spike.pc` 的 schema 與 renderer 相容性；仍不得修改 Plancraft core。

## Purpose

Short operational handoff for the next Codex session. This is not the full LaiBE product doctrine.

Reviewer chat is only for reviewing Codex work output and boundary compliance. It is not responsible for LaiBE website feature design or product direction.

## Must Read

- `AGENTS.md`
- `AI_RULES/SYSTEM_ARCHITECTURE.md`
- `AI_RULES/ROUTING_RULES.md`
- `AI_RULES/CODEX_MANDATORY_ENTRY.md`
- `AI_RULES/FILE_OWNERSHIP_RULES.md`
- `AI_RULES/REVIEW_CHECKLIST.md`
- `AI_RULES/HANDOFF_RULES.md`
- `AI_RULES/TASK_DISPATCH_RULES.md` for deciding Builder / Reviewer / Architect / blocked task routing
- `AI_RULES/PHASE_REVIEW_RULES.md` for Phase Review policy and reviewer output requirements
- `AI_RULES/LAIBE_BUILDER_RULES.md` for Builder / Codex implementation tasks
- `AI_RULES/LAIBE_REVIEWER_RULES.md` for LAIBE_REVIEWER or Reviewer-mode tasks
- `AI_RULES/LAIBE_VISUAL_SIM_RULES.md` for LAIBE_VISUAL_SIM or visual asset / image prompt tasks
- `AI_RULES/LAIBE_WEB_FLOW_BUILDER_RULES.md` for landing / onboarding / header / CTA / routing / progress bar / dashboard flow tasks
- `docs/LAIBE_VISUAL_SIM_CHATROOM.md` for the dedicated visual simulation chatroom operating format
- `docs/ai_style_visual_chat/IMAGE_API_SPIKE_GOVERNANCE.md` and sibling docs before any Image Generation API Integration Spike
- `docs/EDITING_MAP.md`
- `docs/PROJECT_RULES.md`
- `docs/USER_WORKING_STYLE.md`
- `docs/USER_IT_LIMITS.md`
- `docs/LAIBE_CORE_POSITIONING.md` for product positioning and copy decisions
- `docs/ABOUT_LAIBE_QA_SOURCE.md` before editing the About LaiBE section

## Current State

- Central AI / Codex governance layer has been refreshed in Markdown only: root `AGENTS.md` is now the highest entry file, and `AI_RULES/` contains full architecture, routing, mandatory entry, file ownership, review, and handoff rules.
- Task dispatch rules have been added at `AI_RULES/TASK_DISPATCH_RULES.md`; every task should be classified before work as Builder, Reviewer, Architect/Governance, Documentation, Routing/CTA, Data Model, Sensitive, or Blocked.
- A task brief template has been added at `templates/LAIBE_TASK_BRIEF_TEMPLATE.md`; use it before assigning work to Builder / Reviewer / Architect when task scope or role is unclear.
- Routing / CTA / header / Data Model / Sensitive Task work must or should go to LAIBE_REVIEWER after completion according to `AI_RULES/TASK_DISPATCH_RULES.md`.
- Sensitive Task work requires explicit user authorization before construction; Blocked Task work must not be performed.
- LAIBE_BUILDER dedicated rules have been added at `AI_RULES/LAIBE_BUILDER_RULES.md`; Builder / Codex implementation tasks must read it fully.
- A fixed Builder task template has been added at `templates/CODEX_BUILDER_TASK_TEMPLATE.md`; Builder tasks should use it to classify task type, allowed scope, forbidden scope, self-review, handoff need, and final report format.
- Builder completion reports must use the fixed Builder format from `AI_RULES/LAIBE_BUILDER_RULES.md`; tasks involving routing / CTA / header / data model / AI_RULES should be recommended for LAIBE_REVIEWER review.
- Builder / Codex implementation tasks should now include a REVIEW_READY_SUMMARY when useful; it is prepared for user-triggered review and does not automatically start LAIBE_REVIEWER.
- Builder tasks that involve routing / CTA / header / progress bar / back buttons / main flow / plan-puzzle / budget-system / specDB / dashboard / data model / AGENTS.md / AI_RULES / templates / handoff / plancraft / framework-package-config / multi-page changes must also run Review-ready self-check, but this does not replace LAIBE_REVIEWER formal review.
- If Builder detects High Risk conditions such as unauthorized plancraft or src edits, out-of-scope file edits, framework/package changes, npm install, git clean/reset, file deletion, broken routing, or broken data model, it must mark the task as needing user confirmation / Reviewer instead of declaring final completion.
- Phase Review rules have been added at `AI_RULES/PHASE_REVIEW_RULES.md`; LaiBE now prefers stage-level review over requiring LAIBE_REVIEWER after every tiny Builder task.
- Phase review packet template has been added at `templates/PHASE_REVIEW_PACKET_TEMPLATE.md`; reviewer prompt template has been added at `templates/PHASE_REVIEWER_PROMPT_TEMPLATE.md`.
- Current phase review packet has been created at `docs/CURRENT_PHASE_REVIEW_PACKET.md`; Builder / Architect / Visual Sim roles should update it when a work segment becomes a phase result.
- `docs/NEXT_CODEX_HANDOFF.md` remains for the next Builder / Codex continuation context; `docs/CURRENT_PHASE_REVIEW_PACKET.md` is for LAIBE_REVIEWER phase-level review.
- Budget system dispatch has been updated into the three-warehouse model: `配件倉庫：工法與規格`, `原物料採購與倉儲`, and `成品物流：預算表單輸出`.
- Method / Spec Warehouse owns MethodSpecCatalog, MethodRecipe, MaterialSpec, LaborRule, NoteTemplate, UnitConversion, InclusionExclusionRule, ItemMaterialBinding, method/spec rules, assumptions, risks, and inclusions/exclusions.
- Material / Procurement Warehouse owns raw materials, supplier/procurement clues, procurement cost, inventory/warehouse concepts, material resolver, material pricing, unit conversion, and material quantity signals.
- Output / Renderer Warehouse owns BudgetOutputSnapshot, customer_view, internal_view, structured_rows, renderSnapshot(), renderer gate, and CSV / HTML / Excel / PDF output.
- Output / Renderer Warehouse must only read BudgetOutputSnapshot or RenderedBudgetDocument; it must not rerun budget engine, read pricing rules, read material resolver, modify MethodSpecCatalog, call RAG / AI API, or use legacy formatBudgetOutput() as the formal source.
- `templates/PHASE_REVIEW_PACKET_TEMPLATE.md` and `docs/CURRENT_PHASE_REVIEW_PACKET.md` now include separate sections for the three budget warehouses.
- LAIBE_REVIEWER dedicated rules have been added at `AI_RULES/LAIBE_REVIEWER_RULES.md`; Reviewer-mode tasks must read it fully, and Builder-mode tasks may skim it.
- Latest Markdown-only governance update finalized `AI_RULES/LAIBE_REVIEWER_RULES.md` as the dedicated Reviewer rule file and kept LAIBE_REVIEWER output in the fixed review-only format requested by the user.
- LAIBE_VISUAL_SIM rules have been added at `AI_RULES/LAIBE_VISUAL_SIM_RULES.md`; LAIBE_VISUAL_SIM produces visual briefs, image prompts, asset specs, naming notes, usage notes, and risk notes only.
- LAIBE_VISUAL_SIM task template has been added at `templates/LAIBE_VISUAL_SIM_TASK_TEMPLATE.md`.
- LAIBE_VISUAL_SIM chatroom guide has been added at `docs/LAIBE_VISUAL_SIM_CHATROOM.md`.
- Project-local LAIBE_VISUAL_SIM skill-style instructions have been added at `skills/laibe-visual-sim/SKILL.md`.
- LAIBE_VISUAL_SIM does not modify code, does not build, does not review, and does not replace Builder / Reviewer / Architect roles.
- LAIBE_VISUAL_SIM mock images are only case-listing and style-communication aids; they must not be claimed as construction drawings, formal design drawings, real cases, quotation basis, or completion guarantees.
- Visual simulation assets that need site integration should go to Builder; visual assets already integrated into the website should go to LAIBE_REVIEWER for misleading-claim and page-fit review.
- LAIBE_WEB_FLOW_BUILDER rules have been added at `AI_RULES/LAIBE_WEB_FLOW_BUILDER_RULES.md`.
- LAIBE_WEB_FLOW_BUILDER task template has been added at `templates/LAIBE_WEB_FLOW_BUILDER_TASK_TEMPLATE.md`.
- UX Flow Review rules have been added at `AI_RULES/UX_FLOW_REVIEW_RULES.md`; LAIBE_REVIEWER can now review page role, CTA logic, layout logic, header/nav, progress bar, and AI Studio-like link precision.
- Page link registry has been added at `AI_RULES/PAGE_REGISTRY.md`; Web Flow Builder and Reviewer should use it as the page role / entry / exit / CTA / back-logic registry.
- CTA flow map has been added at `AI_RULES/CTA_FLOW_MAP.md`; Web Flow Builder and Reviewer should use it as the CTA action-line registry.
- Web Flow Builder tasks that add or modify pages / CTA / header / progress bar / routing should keep `PAGE_REGISTRY.md`, `CTA_FLOW_MAP.md`, `ROUTING_RULES.md`, and `UX_FLOW_REVIEW_RULES.md` aligned.
- If LAIBE_REVIEWER lacks screenshots, live UI, or HTML content during UX Flow Review, it may review flow and document logic but must mark layout details as unable to confirm.
- Phase Review Conditional Pass governance cleanup has been handled in Markdown only.
- `docs/FILE_OWNERSHIP_RECONCILIATION.md` now records current `git status` ownership categories: current governance outputs, old dirty state / other Builder outputs, archive moves, and unresolved risks. It does not authorize deletion, reset, clean, or checkout.
- `docs/CURRENT_PHASE_REVIEW_PACKET.md` now includes Conditional Pass cleanup notes: plan-puzzle `.pc` converter remains spike / not production-ready; the three budget warehouses have governance boundaries but must keep outputs separated; formal Excel / PDF writer still needs a dedicated LAIBE_REVIEWER 審查結果 before production-ready claims.
- The six templates under `templates/` have been repaired from mojibake into readable Chinese: `CODEX_BUILDER_TASK_TEMPLATE.md`, `LAIBE_WEB_FLOW_BUILDER_TASK_TEMPLATE.md`, `LAIBE_TASK_BRIEF_TEMPLATE.md`, `PHASE_REVIEW_PACKET_TEMPLATE.md`, `PHASE_REVIEWER_PROMPT_TEMPLATE.md`, and `LAIBE_VISUAL_SIM_TASK_TEMPLATE.md`.
- User-triggered Review has been changed to user-triggered review. Builder / Codex should not automatically require LAIBE_REVIEWER after every small task or phase update.
- Builder / Codex may update handoff / phase packet and mark work as "可供後續審查", but should not write "要求立即審查", "下一步一定是 Reviewer", or "未經 Reviewer 不可繼續" unless the user explicitly requests a User-triggered Review or a High Risk condition exists.
- LAIBE_REVIEWER still supports Single Task Review and Phase Review, but review starts only when the user explicitly asks, for example: "請執行本階段總審查", "請審查目前階段成果", "請掃一遍目前所有聊天室成果", "請做 Web Flow / CTA / UX 審查", or "請審查這份 Builder 回報".
- `docs/CURRENT_PHASE_REVIEW_PACKET.md` now includes Review Status. Updating the packet does not automatically trigger review.
- Reviewer 自動要求審查的殘留語言已清除並統一改為 User-triggered Review。Builder / Codex 應整理 Review-ready Summary，且註明該摘要不會自動觸發審查；是否啟動 LAIBE_REVIEWER 由使用者決定。
- Old generic website modification tasks should gradually be routed through LAIBE_WEB_FLOW_BUILDER when they involve landing / onboarding / header / CTA / routing / progress bar / dashboard flow.
- LAIBE_WEB_FLOW_BUILDER does not own plan-puzzle core functionality, budget-system core logic, plancraft source code, visual simulation prompts, or governance architecture.
- Web flow tasks involving routing / CTA / header must or should go to LAIBE_REVIEWER after completion according to the user-triggered review.
- LAIBE_REVIEWER now uses user-triggered review: pasted Builder/Codex completion reports alone do not trigger a full review unless the user explicitly asks, such as "幫我看一下" or "請審查".
- Last governance tasks modified `AGENTS.md`, `AI_RULES/SYSTEM_ARCHITECTURE.md`, `AI_RULES/ROUTING_RULES.md`, `AI_RULES/CODEX_MANDATORY_ENTRY.md`, `AI_RULES/FILE_OWNERSHIP_RULES.md`, `AI_RULES/REVIEW_CHECKLIST.md`, `AI_RULES/HANDOFF_RULES.md`, `AI_RULES/TASK_DISPATCH_RULES.md`, `AI_RULES/LAIBE_BUILDER_RULES.md`, `AI_RULES/LAIBE_REVIEWER_RULES.md`, `AI_RULES/LAIBE_VISUAL_SIM_RULES.md`, `AI_RULES/LAIBE_WEB_FLOW_BUILDER_RULES.md`, `AI_RULES/PHASE_REVIEW_RULES.md`, `docs/CURRENT_PHASE_REVIEW_PACKET.md`, `docs/LAIBE_VISUAL_SIM_CHATROOM.md`, `skills/laibe-visual-sim/SKILL.md`, `templates/CODEX_BUILDER_TASK_TEMPLATE.md`, `templates/LAIBE_TASK_BRIEF_TEMPLATE.md`, `templates/LAIBE_VISUAL_SIM_TASK_TEMPLATE.md`, `templates/LAIBE_WEB_FLOW_BUILDER_TASK_TEMPLATE.md`, `templates/PHASE_REVIEW_PACKET_TEMPLATE.md`, `templates/PHASE_REVIEWER_PROMPT_TEMPLATE.md`, and this handoff file.
- The governance refresh did not modify HTML, JS, CSS, TS, Python, `src`, `app`, `components`, `assets`, `layout`, or `plancraft`.
- Official homepage has been replaced with the black / cement / metal direction.
- Official homepage file: `src/stitch_laibe_landing_onboarding/laibe_landing_desktop/code.html`
- Owner / requester requirement page is already handled in the black cement experiment flow.
- Current floor-plan work is: `src/stitch_laibe_landing_onboarding/preview_floor_plan/code.html`
- Current prompt rechecked Wall Split / Node Graph MVP; the implementation was already present in `plan-puzzle.js`. Do not downgrade the current `0.5.0-opening-editor` file back to `0.4.0-wall-split-node-graph` just to match an older task prompt.
- Current task completed: Plancraft+ Opening Editor MVP.
- Current task completed: Plancraft+ Visual Simulation Task Preview MVP.
- Current governance task completed: Image Generation API Spike Governance Pack.
- Current task completed: Image Generation API Sandbox Spike.
- Current task completed: Real Image Generation API Spike, still sandbox-only / proof-of-concept. No production integration was added.
- Current task completed: Server-side Image API Proxy Spike, still disabled / local-only contract. No backend or real proxy was created because this MVP has no server runtime.
- The sandbox spike was implemented only inside the existing preview floor-plan page files: `src/stitch_laibe_landing_onboarding/preview_floor_plan/code.html` and `src/stitch_laibe_landing_onboarding/preview_floor_plan/plan-puzzle.js`; this handoff was also updated.
- This Real Image Generation API Spike did not connect a real image API, did not call OpenAI or any model provider, did not add API keys, did not add `.env`, did not add packages, and did not create production image assets.
- The Real Spike implementation added a local-only `generateSandboxVisualPreview()` path and `buildSanitizedVisualPrompt()` prompt builder. The Server-side Proxy Spike now keeps this path behind a disabled proxy contract and displays `Server-side Image API proxy 尚未設定`.
- Visual Simulation Panel now shows sandbox labels: `Sandbox Preview`, `AI 示意圖`, `非正式圖片`, `不會保存到正式案件`, `非真實案例`, and `非正式成果`.
- Proxy-disabled fallback is explicit: `Server-side Image API proxy 尚未設定`.
- `ready` UI copy is intentionally softened to `Sandbox 預覽已建立`; do not use `完成`, `正式`, or `設計已完成` for this state.
- `styleVisualTask` now keeps the sandbox-only state: `sanitizedPrompt`, `styleVisualApiRequest`, `styleVisualApiResponse`, `proxyStatus`, `referenceImagePolicy`, and `generatedPreview`.
- `styleVisualTask.generatedPreview` is local UI task state only. It is not written into `project`, exported draft JSON, official case data, production assets, budget data, or Plancraft geometry.
- `styleVisualTask.generatedPreview.metadata` includes `generatedBy: "LAIBE_VISUAL_SIM"`, `usage: "bid-listing-style-reference"`, `isOfficialDesign: false`, `isConstructionDrawing: false`, `isQuotationBasis: false`, and `sandbox: true`.
- The `styleVisualApiRequest` uses whitelist fields only: `roomType`, `primaryStyle`, `secondaryStyle`, `colorTone`, `materialTone`, `budgetLevel`, `purpose`, `disclaimerRequired`, and `referenceImage.allowed/reason`.
- Reference image upload remains disabled in `styleVisualTask.referenceImagePolicy`; the UI states `Reference image upload 尚未開放，需經 privacy review。`.
- The `styleVisualApiRequest` must not include `walls`, `openings`, `zones`, `scale`, `plancraftBridge`, raw system prompts, user-uploaded reference images, official quote data, or private identifying data.
- Codex in-app browser may block direct `file:///` verification. Use localhost as equivalent validation inside Codex, and ask the user to manually confirm file protocol on their machine if strict `file:///` proof is needed.
- The Server-side Image API Proxy Spike can be handed to LAIBE_REVIEWER if the user explicitly asks for review. User-triggered review approval is required only when the user asks for formal acceptance before any future server runtime, real API request, production connection, or online label.
- New governance docs are under `docs/ai_style_visual_chat/`: `IMAGE_API_SPIKE_GOVERNANCE.md`, `IMAGE_API_REQUEST_SCHEMA.md`, `PROMPT_SANITIZATION_RULES.md`, `REFERENCE_IMAGE_POLICY.md`, `GENERATED_IMAGE_STORAGE_POLICY.md`, and `IMAGE_API_SPIKE_REVIEW_CHECKLIST.md`.
- This governance pack is documentation only: no image API was connected, no OpenAI API was called, no API key or `.env` was added, no image was generated, and no frontend / Plancraft / routing / CTA / Header code was modified by this governance task.
- Before any Image Generation API Integration Spike, Builder must read the governance pack and keep the work as spike / proof of concept only.
- Image API spike request schema must use whitelist fields only and must not allow raw system prompt, disclaimer override, reference image upload, or `walls/openings/zones/scale/plancraftBridge` in the image API request.
- Reference image upload remains disabled until a separate privacy review approves clear notice, user consent, temporary storage, deletion strategy, no official case storage, and no real-case display.
- Generated images from a future spike must not enter official case data, production assets, budget official data, or Plancraft geometry, and must include metadata such as `generatedBy: "LAIBE_VISUAL_SIM"`, `usage: "bid-listing-style-reference"`, `isOfficialDesign: false`, `isConstructionDrawing: false`, and `isQuotationBasis: false`.
- Any Image Generation API Integration Spike can be handed to LAIBE_REVIEWER if the user explicitly asks for review after completion; User-triggered review approval is required only when the user asks for formal acceptance before anything can be marked online.
- Floor-plan page now includes an inspector-side `AI 風格示意` panel rendered from `plan-puzzle.js`; it is a mock task preview only, not real image generation.
- Visual Simulation Preview state is kept separate from wall geometry: `styleVisualRequest` stores room/style/tone/material/budget/purpose, and `styleVisualTask` stores `idle | drafting | ready`, visual brief, prompt preview, and disclaimer.
- The `生成風格示意` inspector action simulates `idle -> drafting -> ready` with a local 1 second timer; it does not call OpenAI, any image-generation API, backend, upload, or Plancraft core.
- The Visual Simulation Preview must remain a style visualization layer only. Do not write it into `walls`, `openings`, `zones`, `scale`, or `plancraftBridge`.
- Disclaimer shown in the panel: `本圖僅為風格示意，用於案件上架與溝通參考，不代表最終設計、施工圖、實際尺寸、工法、材料品牌或正式報價內容。`
- Product positioning: Plancraft+ is one integrated LaiBE website tool, not a separated "LaiBE importer" and "Plancraft" module.
- The old room-based main flow is stopped: no rectangular room add/drag/resize/overlap workflow is exposed.
- The floor-plan page now uses a Plancraft+ wall-first draft model in `src/stitch_laibe_landing_onboarding/preview_floor_plan/plan-puzzle.js`: `importSource`, `underlay`, `scale`, `walls`, `wallGraph`, `nodeGraph`, `openings`, `zones`, empty `furniture`, and `plancraftBridge`.
- JPG/JPEG/PNG import uses browser FileReader to create an underlay data URL; no backend upload.
- PDF can be selected and recorded in `importSource`, but direct PDF preview/calibration is intentionally blocked with a clear message. No pdf.js is used.
- Scale calibration lets the user click two canvas points, enter a known mm length, and computes `pxPerMm = pixelDistance / knownLength`.
- Wall Segment Editor is enabled after scale calibration. Walls are stored in mm coordinates from the canvas top-left origin and rendered to SVG with `px = mm * pxPerMm`.
- Wall drawing supports two-click wall creation, `existing/new/demolished` status, thickness, endpoint snap, horizontal/vertical assist, selection, inspector editing, Delete/Backspace deletion, and JSON export.
- Wall Graph Cleanup is enabled in the same Plancraft+ page. `project.version` is now `0.3.0-wall-graph-cleanup`.
- `project.wallGraph = { nodes: [], issues: [], lastBuiltAt: null }`; nodes are rebuilt from wall endpoints and wall intersections using mm coordinates.
- Wall graph issues currently supported: `nearby-endpoints`, `wall-intersection`, `overlapping-walls`, `wall-too-short`, and `zero-length-wall`.
- `nearby-endpoints` flags endpoints 30mm to 150mm apart that are not exactly aligned. The UI message is: "有牆端點接近但未對齊，建議整理端點。"
- The "整理端點" action merges wall endpoints within 30mm, updates `wall.from` / `wall.to`, rebuilds `wallGraph`, and does not split walls or merge mid-wall intersections.
- `wall-intersection` marks T/cross intersections on the canvas but does not auto-split walls.
- `overlapping-walls` currently detects simple horizontal/vertical overlaps only and does not auto-delete or merge walls.
- The inspector shows wall count, node count, issue count, and clickable issue rows; clicking an issue highlights related walls/endpoints/intersections in the wall graph helper layer.
- Wall Split / Node Graph is enabled. `project.version` is now `0.4.0-wall-split-node-graph`.
- `project.nodeGraph = { nodes: [], edges: [], issues: [], lastBuiltAt: null }`.
- Node Graph nodes use mm coordinates and have `id`, `x`, `y`, `kind`, `wallIds`, `edgeIds`, and `createdAt`.
- Node Graph edges use mm coordinates and preserve each source wall's `thickness`, `status`, `structural`, and `layer`; `edge.sourceWallId` points back to the original wall id.
- Selecting a `wall-intersection` issue shows the `切分交會牆段` action in the Node Graph inspector card.
- Manual intersection split is supported for T and cross intersections. It only splits the selected issue's related walls, does not auto-split all intersections, and does not create segments shorter than 200mm.
- Split walls keep the source wall's `status`, `thickness`, and `structural`; new split wall ids are generated and `sourceWallId` keeps the original wall reference.
- After split, `walls`, `wallGraph`, and `nodeGraph` are rebuilt, and export includes latest `nodeGraph`.
- Opening Editor is enabled. `project.version` is now `0.5.0-opening-editor`.
- `project.openings` now stores openings attached to `nodeGraph.edges`, not directly to legacy wall objects.
- Opening model: `id`, `edgeId`, `sourceWallId`, `kind` (`door/window/opening`), `offset`, `width`, `swing`, `sillHeight`, `height`, `createdAt`, and `updatedAt`.
- Door/window/opening creation uses the selected wall's matching `selectedEdgeId`; default widths are door 900mm, window 1200mm, and opening 1000mm.
- Opening validation blocks invalid dimensions: width below 300mm, `offset + width` beyond edge length, and adding openings to demolished edges.
- Opening rendering uses an SVG opening layer above walls; doors show a simple swing arc, windows show double-line marks, and generic openings show a dashed marker.
- Openings support selection, inspector editing, Delete/Backspace deletion, and JSON export.
- Zone Label MVP is enabled. `project.version` is now `0.6.0-zone-label-mvp`.
- `project.zones` now stores manual space labels with `id`, `name`, `type`, `labelPosition`, `boundaryEdgeIds`, `boundaryWallIds`, `polygon`, `area`, `createdAt`, and `updatedAt`.
- Zone labels are manually placed on the canvas after JPG/JPEG/PNG underlay import and scale calibration. `labelPosition` uses mm coordinates from the canvas top-left origin.
- Supported zone types: `living`, `bedroom`, `kitchen`, `bathroom`, `dining`, `balcony`, `entry`, `storage`, `closet`, and `other`; default Chinese names are mapped in `plan-puzzle.js`.
- Zone labels render in a dedicated HTML overlay layer above openings and below wall graph helpers. They support selection, inspector editing of `name/type/labelPosition`, Delete/Backspace deletion, and JSON export.
- Zone labels are manual room intent markers only. There is still no automatic closed polygon detection, boundary inference, area calculation, Plancraft room conversion, or budget quantity conversion from zones.
- Task dispatch note: Zone Label MVP was a Builder / Data Model / plan-puzzle task with implementation allowed by explicit user scope; recommend LAIBE_REVIEWER phase review before treating the zone schema as frozen.
- Zone Boundary MVP is enabled. `project.version` is now `0.7.0-zone-boundary-mvp`.
- `zone.boundaryEdgeIds` now stores selected `nodeGraph.edges` ids; `zone.boundaryWallIds` is derived from each edge's `sourceWallId` with duplicates removed.
- `zone.polygon` is generated in mm coordinates only when the user-selected boundary edges can form a closed loop in the selected order; `area` remains `null`.
- `zone.boundaryStatus` and `zone.boundaryIssues` are exported with each zone. Supported issue types: `zone-boundary-empty`, `zone-boundary-open`, `zone-boundary-too-few-edges`, and `zone-boundary-edge-missing`.
- Boundary editing is manual: select a zone, choose `編輯邊界`, click wall / edge segments to add or remove them from the boundary, then `套用邊界`. It does not auto-detect rooms, auto-sort complex edge loops, auto-calculate area, or modify wall / opening / nodeGraph data.
- The floor-plan canvas now includes a `zonePolygonLayer` below walls and above the grid. It renders closed zone polygons, selected boundary edge highlights, and in-progress boundary previews.
- `plancraftBridge` remains `not_ready` and now states that zone boundary data is still being stabilized before any future wall-first + openings + zones to Plancraft `.pc` converter.
- Task dispatch note: Zone Boundary MVP was a Builder / Data Model / plan-puzzle task with implementation allowed by explicit user scope; recommend LAIBE_REVIEWER phase review before treating the zone boundary schema as frozen.
- Draft export now downloads `laibe-plancraft-plus-draft.json` with the Plancraft+ fields and bridge placeholder.
- Still no automatic room closure, area calculation, furniture editing, Plancraft `.pc` import/export/converter, Plancraft renderer, API, login, database, cloud save, payment, or AI integration.
- Floor-plan header Tools is a dropdown; top-right page actions only include Return Previous and Budget Generation; canvas plugin should not contain the upload/add/return/budget action strip.
- Requirement page header no longer includes owner/vendor nav items; its Q&A result area has next-step entries to Floor Plan and Budget Generation.
- Homepage tools entry now links to `../preview_floor_plan/code.html`.
- Budget generation system first spec set is under `docs/budget/`.
- Budget engine Phase 1 is implemented as a local deterministic mock prototype under `src/lib/budget/`.
- Budget demo command: `node --experimental-strip-types src/lib/budget/demo-generate-budget.ts`.
- Budget Phase 2 preview-floor-plan adapter is implemented at `src/lib/budget/adapters/preview-floor-plan-adapter.ts`.
- Budget Phase 2 mock preview draft is `src/lib/budget/mock/mock-preview-floor-plan-draft.ts`; it mirrors the legacy room draft shape and should be updated before using it with the new Plancraft+ draft JSON.
- Budget Phase 2 demo command: `node --experimental-strip-types src/lib/budget/demo-generate-budget-from-preview-floor-plan.ts`.
- Budget Phase 2.5 data warehouse foundation is implemented with local TypeScript/in-memory storage under `src/lib/budget/storage/`.
- Budget Phase 2.5 doc: `docs/budget/11-data-warehouse.md`.
- Budget Phase 2.5 demo command: `node --experimental-strip-types src/lib/budget/demo-load-budget-warehouse.ts`.
- Budget Phase 2.6 original catalog intake and classification prototype is implemented under `src/lib/budget/intake/`, but the user explicitly paused this original Phase 2.6 direction. Do not continue, wire, expand, or treat it as the active next phase unless the user redefines it.
- Budget Phase 2.6 doc: `docs/budget/12-catalog-intake-classification.md`.
- Budget Phase 2.6 demo command: `node --experimental-strip-types src/lib/budget/intake/demo-catalog-intake.ts`.
- Budget architecture has been reframed into three systems in `docs/budget/13-three-warehouse-architecture.md`: Raw Candidate Warehouse, Method / Spec Warehouse, and Estimate Output Logistics.
- Recommended budget next step is the Method / Spec Warehouse contract, not expanding the paused Phase 2.6 intake prototype.
- Budget Phase 2.7 Method / Spec Warehouse is implemented under `src/lib/budget/specs/`.
- Budget Phase 2.7 doc: `docs/budget/14-method-spec-warehouse.md`.
- Budget Phase 2.7 demo command: `node --experimental-strip-types src/lib/budget/specs/demo-method-spec-warehouse.ts`.
- Budget Phase 2.7 can convert `MethodSpecCatalog` into the existing `BudgetCatalog` through `buildBudgetCatalogFromMethodSpec()`, so Phase 1 budget engine can consume approved method/spec rules.
- Budget Method / Spec Warehouse Phase MS-4 boundary doc is now `docs/budget/20-method-spec-to-budget-output-boundary.md`. It defines which MethodSpec shelves may affect `BudgetEstimateLine`, which shelves may only enrich `BudgetOutputSnapshot.internal_view`, and confirms renderers must not read `MethodSpecCatalog`.
- Budget Method / Spec Warehouse Phase MS-4 remains documentation-only: no renderer, output system, intake, frontend, floor-plan, RAG, AI API, DB migration, or payment/escrow/listing-fee code was modified.
- Budget Method / Spec Warehouse Phase MS-5 validator-only hardening is implemented in `src/lib/budget/specs/validate-method-spec-catalog.ts` and `src/lib/budget/specs/types.ts`; demo is `src/lib/budget/specs/demo-method-spec-validator-hardening.ts`; doc is `docs/budget/22-method-spec-validator-hardening.md`.
- Budget Method / Spec Warehouse Phase MS-5 adds P0 validator guards only: blocked pricing source types, allowed unbound material item allowlist, `InclusionExclusionRule.requires_review` scope-review policy visibility, and active quote item note coverage. It does not modify budget engine pricing flow, renderer/output/intake/frontend/floor-plan/RAG/AI/DB/payment code, and does not let `LaborRule`, `MaterialSpec`, `ItemMaterialBinding`, `NoteTemplate`, or `InclusionExclusionRule` change `unit_price` or `amount`.
- Budget Method / Spec Warehouse Phase MS-7 is planning-only in `docs/budget/24-method-spec-validator-p1-plan.md`. It plans P1 validator candidates and a clean worktree guard for future MS-8; it does not modify specs code, renderer/output/intake/frontend/floor-plan/RAG/AI/DB/payment code, and does not change budget engine pricing flow.
- Budget Method / Spec Warehouse Phase MS-8 P1-A validator implementation is complete. It adds `src/lib/budget/specs/method-spec-policy.ts`, `labor_rule_reference_only_guard`, and `src/lib/budget/specs/demo-method-spec-validator-p1.ts`; doc is `docs/budget/25-method-spec-validator-p1-implementation.md`. It only formalizes validator policy constants and blocks labor-derived PricingRule source types; it does not let LaborRule enter pricing and does not modify renderer/output/intake/raw-warehouse/frontend/floor-plan/RAG/AI/DB/payment code.
- Budget Method / Spec Warehouse Phase MS-10 is planning-only in `docs/budget/27-method-spec-validator-p1b-plan.md`. It scopes P1-B into UnitConversion coverage and active QuoteItemTemplate inclusion/exclusion coverage, and recommends splitting implementation while the repo baseline remains dirty.
- Budget Method / Spec Warehouse Phase MS-11A UnitConversion coverage validator implementation is complete. It adds `REQUIRED_UNIT_CONVERSION_PAIRS`, warning-only `unit_conversion_coverage_guard`, and `src/lib/budget/specs/demo-method-spec-validator-p1b.ts`; doc is `docs/budget/28-method-spec-validator-p1b-implementation.md`. Missing UnitConversion pairs now produce warnings, not errors; UnitConversion still does not recalculate quantity or enter the budget engine flow. MS-11B scope coverage is not implemented yet.
- Budget Method / Spec Warehouse Phase MS-11B Inclusion / Exclusion coverage validator implementation is complete. It adds `ALLOWED_MISSING_SCOPE_RULE_ITEM_CODES`, warning-only `inclusion_exclusion_scope_coverage_guard`, and `src/lib/budget/specs/demo-method-spec-validator-scope-coverage.ts`; doc is `docs/budget/30-method-spec-scope-coverage-implementation.md`. Missing non-allowlisted scope rules now produce warnings, allowlisted missing scope rules produce allowed conditions, and scope coverage still does not propagate to output or change price, quantity, amount, renderer behavior, or formal work items.
- Budget Phase 2.8 Estimate Output Logistics is implemented under `src/lib/budget/output/`.
- Budget Phase 2.8 doc: `docs/budget/15-budget-output-logistics.md`.
- Budget Phase 2.8 demo command: `node --experimental-strip-types src/lib/budget/output/demo-budget-output-logistics.ts`.
- Budget Phase 2.8 outputs structured JSON only: customer rows, internal trace rows, validation report. It does not generate Excel or PDF.
- Budget Phase 2.9 MaterialSpec alignment and output snapshot contract is implemented under `src/lib/budget/specs/` and `src/lib/budget/output/`.
- Budget Phase 2.9 doc: `docs/budget/16-budget-output-snapshot-and-material-alignment.md`.
- Budget Phase 2.9 added `item_material_bindings` to `MethodSpecCatalog`, moved `material_code` resolution out of output hardcoding, and added `BudgetOutputSnapshot` plus an in-memory output snapshot repository.
- Budget Phase 2.9 demo command: `node --experimental-strip-types src/lib/budget/output/demo-budget-output-snapshot.ts`.
- Task dispatch note: Budget Phase 2.9 was a Builder / Data Model budget-system task with implementation allowed by user scope; recommend LAIBE_REVIEWER review before treating the snapshot contract as frozen.
- Budget Phase 2.9.1 Output Snapshot Contract Hardening is implemented under `src/lib/budget/output/` and `src/lib/budget/specs/`.
- Budget Phase 2.9.1 doc: `docs/budget/17-contract-hardening-2.9.1.md`.
- Budget Phase 2.9.1 keeps the Phase 2.9 main flow unchanged, but hardens `BudgetOutputSnapshot` top-level required field checks, adds `estimate_stage` to snapshots, prevents missing snapshot fields from throwing, and routes `ItemMaterialBinding.requires_review` into internal risks / output warnings without changing prices.
- Budget Phase 2.9.1 demo command: `node --experimental-strip-types src/lib/budget/output/demo-budget-output-snapshot.ts`.
- Task dispatch note: Budget Phase 2.9.1 was a Builder / Data Model budget-system task with implementation allowed by user scope; recommend LAIBE_REVIEWER review before moving into Excel/PDF renderer work.
- Budget Phase 2.9.2 Renderer Gate & Legacy Output Guard is implemented under `src/lib/budget/output/`.
- Budget Phase 2.9.2 doc: `docs/budget/18-renderer-gate-and-legacy-output-guard.md`.
- Budget Phase 2.9.2 added `assertSnapshotRenderable()` so future renderers must fresh-validate `BudgetOutputSnapshot` before output. The gate rejects invalid snapshots and requires `customer_view` by default.
- Budget Phase 2.9.2 marks `src/lib/budget/format-budget-output.ts` as legacy debug output only through `LEGACY_BUDGET_OUTPUT_WARNING`; formal Excel / PDF renderers must not use it.
- Budget Phase 2.9.2 demo command: `node --experimental-strip-types src/lib/budget/output/demo-renderer-gate.ts`.
- Task dispatch note: Budget Phase 2.9.2 was a Builder / Data Model budget-system task with implementation allowed by user scope; recommend LAIBE_REVIEWER review before allowing Excel/PDF renderer work.
- Budget Phase 3.0 Excel / PDF Renderer Skeleton is implemented under `src/lib/budget/renderers/`.
- Budget Phase 3.0 doc: `docs/budget/19-excel-pdf-renderer-skeleton.md`.
- Budget Phase 3.0 demo command: `node --experimental-strip-types src/lib/budget/renderers/demo-render-snapshot.ts`.
- Budget Phase 3.0 renderers read `BudgetOutputSnapshot` only and call `assertSnapshotRenderable()` before output. Customer renderer reads `customer_view` only; internal trace renderer reads `internal_view`.
- Budget Phase 3.0 outputs structured rows, simple HTML skeleton strings, and CSV skeleton strings only. It does not generate real `.xlsx` or `.pdf` files.
- Budget Phase 3.0 renderer code must not import or call `generateBudgetEstimate()`, pricing rules, material resolver, RAG, AI API, or legacy `formatBudgetOutput()`. The demo may generate a snapshot before invoking renderer functions.
- Task dispatch note: Budget Phase 3.0 was a Builder / Data Model budget-system task with implementation allowed by user scope; recommend LAIBE_REVIEWER review before formal Excel/PDF renderer work.
- Budget Phase 3.1 Renderer Contract Hardening & Static Guard is implemented under `src/lib/budget/renderers/`.
- Budget Phase 3.1 docs: `docs/budget/20-renderer-contract-hardening.md` and `docs/budget/21-formal-excel-pdf-layout-contract.md`.
- Budget Phase 3.1 added `assertSnapshotRenderableForRenderer()` as the renderer-only gate. It does not accept `methodSpecCatalog`; catalog-aware validation remains outside formal renderer entry.
- Budget Phase 3.1 added runtime render option validation, customer warning sanitization, serializer guard markers, and `renderer-static-guard.ts` denylist scanning for formal renderer files.
- Budget Phase 3.1 demo command: `node --experimental-strip-types src/lib/budget/renderers/demo-renderer-hardening.ts`.
- Task dispatch note: Budget Phase 3.1 was a Builder / Data Model budget-system task with implementation allowed by user scope; recommend LAIBE_REVIEWER review before formal `.xlsx` / `.pdf` file renderer work.
- Budget Phase R1 Raw Candidate Warehouse Foundation is implemented under `src/lib/budget/raw-warehouse/`.
- Budget Phase R1 doc: `docs/budget/20-raw-candidate-warehouse-plan.md`.
- Budget Phase R1 demo command: `node --experimental-strip-types src/lib/budget/raw-warehouse/demo-raw-catalog-warehouse.ts`.
- Budget Phase R1 is the active raw material procurement / candidate warehouse path for this chatroom. It is separate from Renderer / Excel / PDF, `BudgetOutputSnapshot`, floor-plan work, and the paused old `src/lib/budget/intake/` prototype.
- Budget Phase R1 collects mock raw sources, flattens raw items, rule-classifies candidates, normalizes candidate fields, validates into `valid_for_review` / `needs_more_info` / `blocked`, creates a review queue, simulates candidate-only approval, and outputs handoff proposals.
- Budget Phase R1 must not generate formal `PricingRule`, `MaterialSpec`, `LaborRule`, `BudgetEstimateLine.unit_price`, formal quotes, or official prices. Candidate prices are stored only as `observed_price`; `formal_price_generated` must remain `false`.
- Task dispatch note: Budget Phase R1 was a Builder / Data Model budget-system task scoped to Raw Candidate Warehouse only; recommend LAIBE_REVIEWER review before treating the raw candidate contract as stable.
- Budget Phase R1.1 Raw Candidate Warehouse Contract Hardening is implemented under `src/lib/budget/raw-warehouse/`.
- Budget Phase R1.1 doc: `docs/budget/21-raw-candidate-contract-hardening.md`.
- Budget Phase R1.1 adds full proposal provenance (`RawCatalogSource -> RawCatalogItem -> Candidate -> ValidationResult -> ReviewQueueItem -> HandoffProposal`), explicit risk flag taxonomy, observed price safety validation, and a local raw-warehouse import boundary static guard.
- Budget Phase R1.1 demo commands: `node --experimental-strip-types src/lib/budget/raw-warehouse/demo-raw-catalog-warehouse.ts` and `node --experimental-strip-types src/lib/budget/raw-warehouse/demo-raw-warehouse-static-guard.ts`.
- Budget Phase R1.1 still does not create formal `PricingRule`, `MaterialSpec`, `LaborRule`, `BudgetEstimateLine.unit_price`, renderer output, `BudgetOutputSnapshot`, floor-plan adapters, RAG/AI/DB/payment code, or real procurement ingestion. `formal_price_generated` remains `false`; `price_authority` remains `"none"`.
- Budget Phase R1.2 Raw Review Contract & Warehouse Safety Validator is implemented under `src/lib/budget/raw-warehouse/`.
- Budget Phase R1.2 doc: `docs/budget/22-raw-review-contract-safety-validator.md`.
- Budget Phase R1.2 adds `validateHandoffProposalContract()`, `validateWarehouseExportSafety()`, and `evaluateRawCandidateMergePolicy()` so handoff proposals keep full provenance, exports reject formal price/catalog fields, and duplicate/merge signals remain recommendation-only.
- Budget Phase R1.2 demo commands: `node --experimental-strip-types src/lib/budget/raw-warehouse/demo-raw-review-contract-safety.ts`, `node --experimental-strip-types src/lib/budget/raw-warehouse/demo-raw-catalog-warehouse.ts`, and `node --experimental-strip-types src/lib/budget/raw-warehouse/demo-raw-warehouse-static-guard.ts`.
- Budget Phase R1.2 keeps `approved_as_candidate` as candidate evidence only. It is not formal approval, not formal catalog publishing, not formal pricing approval, and not a source for customer output.
- Budget Phase R1.2 still does not create formal `PricingRule`, `MaterialSpec`, `LaborRule`, `BudgetEstimateLine.unit_price`, renderer output, `BudgetOutputSnapshot`, floor-plan adapters, RAG/AI/DB/payment code, or real procurement ingestion. `formal_price_generated` remains `false`; `price_authority` remains `"none"`.
- Budget Phase R1.2A Raw Data Feeding Trial is implemented under `src/lib/budget/raw-warehouse/`.
- Budget Phase R1.2A doc: `docs/budget/23-raw-data-feeding-trial.md`.
- Budget Phase R1.2A demo command: `node --experimental-strip-types src/lib/budget/raw-warehouse/demo-raw-data-feeding-trial.ts`.
- Budget Phase R1.2A adds `createRawCatalogSourceFromBudgetRows()` and `runRawDataFeedingTrial()` to test a small manually arranged budget sheet sample. It maps sample rows into one `historical_quote` `RawCatalogSource`, then into `RawCatalogItem`, candidate, validation result, review queue, and handoff proposal.
- Budget Phase R1.2A sample run result: 10 sample rows, 10 raw items, 10 candidates, 10 `valid_for_review`, 0 `needs_more_info`, 0 `blocked`, 10 handoff proposals, proposal contract valid, warehouse export safety valid, observed price safety valid, static guard valid.
- Budget Phase R1.2A still does not parse Excel files, import real data, create a DB migration, publish catalog data, create formal `PricingRule`, `MaterialSpec`, `LaborRule`, `BudgetEstimateLine.unit_price`, renderer output, `BudgetOutputSnapshot`, floor-plan data, RAG/AI/DB/payment code, or formal quotes. `formal_price_generated` remains `false`; `price_authority` remains `"none"`.
- Budget Phase R1.3 Raw Warehouse Multi-Source Fixture Expansion is implemented under `src/lib/budget/raw-warehouse/`.
- Budget Phase R1.3 doc: `docs/budget/24-raw-multi-source-fixtures.md`.
- Budget Phase R1.3 demo command: `node --experimental-strip-types src/lib/budget/raw-warehouse/demo-raw-multi-source-fixtures.ts`.
- Budget Phase R1.3 adds `rawMultiSourceFixtureSources` and `runRawMultiSourceFixtureTrial()` to test five local raw source types: `historical_quote`, `material_price_sheet`, `vendor_quote`, `labor_rate_sheet`, and `brand_model_catalog`.
- Budget Phase R1.3 sample run result: 5 sources, 13 raw items, 13 candidates, candidate type counts `historical_quote_line: 2`, `material_price: 3`, `vendor_quote: 2`, `labor_rate: 3`, `brand_model: 3`; 13 handoff proposals; proposal contract valid; warehouse export safety valid; observed price safety valid; static guard valid.
- Budget Phase R1.3 verifies `brand_model_catalog` rows remain non-price-bearing: `brand_model_candidate_count: 3`, `brand_model_price_bearing_count: 0`.
- Budget Phase R1.3 still does not parse Excel files, import real data, create a DB migration, publish catalog data, create formal `PricingRule`, `MaterialSpec`, `LaborRule`, `BudgetEstimateLine.unit_price`, renderer output, `BudgetOutputSnapshot`, floor-plan data, RAG/AI/DB/payment code, or formal quotes. `formal_price_generated` remains `false`; `price_authority` remains `"none"`.
- Budget Phase R1.4 Raw Negative / Source Quality Fixtures is implemented under `src/lib/budget/raw-warehouse/`.
- Budget Phase R1.4 doc: `docs/budget/25-raw-negative-source-quality-fixtures.md`.
- Budget Phase R1.4 demo command: `node --experimental-strip-types src/lib/budget/raw-warehouse/demo-raw-negative-source-quality-fixtures.ts`.
- Budget Phase R1.4 adds `rawNegativeSourceQualityFixtureSources` and `runRawNegativeSourceQualityFixtureTrial()` to test dirty raw evidence: missing source date, missing currency, missing unit, negative observed price, high / low outliers, unit mismatch, same source period duplicates, missing model, missing spec, low source reliability, and ambiguous raw names.
- Budget Phase R1.4 sample run result: 13 fixture cases, 11 sources, 16 raw items, 16 candidates, 8 `valid_for_review`, 7 `needs_more_info`, 1 `blocked`, 1 rejected review item, and 8 handoff proposals.
- Budget Phase R1.4 verifies major risk flags are present: `missing_source_date`, `missing_currency`, `missing_unit`, `blocked_negative_price`, `price_outlier_high`, `price_outlier_low`, `unit_mismatch`, `same_source_period_duplicate`, `missing_model`, `missing_spec`, `low_source_reliability`, and `ambiguous_name`.
- Budget Phase R1.4 blocks the negative observed price candidate from producing a handoff proposal. Proposal contract, warehouse export safety, observed price safety, and static guard all pass.
- Budget Phase R1.4 still does not parse Excel files, import real data, create a DB migration, publish catalog data, create formal `PricingRule`, `MaterialSpec`, `LaborRule`, `BudgetEstimateLine.unit_price`, renderer output, `BudgetOutputSnapshot`, floor-plan data, RAG/AI/DB/payment code, or formal quotes. `formal_price_generated` remains `false`; `price_authority` remains `"none"`.
- Budget Phase 1/2/2.5/2.6/2.7/2.8/2.9/2.9.1/2.9.2/3.0/3.1/R1 intentionally has no frontend, formal database migration, RAG, Skills, AI API, external crawling, formal Excel/PDF generation, payment, escrow, or listing fee integration.
- `C:\laibe_project\plancraft` is a local reference clone only. It is excluded locally via `.git/info/exclude` and should not be committed into LaiBE MVP.

## Product Freeze Points

- LaiBE is not a generic matching platform.
- LaiBE is a renovation governance / decision workbench.
- Payment, listing fee, escrow, fund release, and webhook are mock/prototype only.
- Do not connect real upload, real AI API, real payment, or real escrow unless explicitly approved.
- Image Generation API work must remain spike-only until the governance pack is followed and LAIBE_REVIEWER 審查結果es it.
- API keys must never appear in frontend, repo, HTML, JS, Markdown, handoff, console output, or browser-readable files.
- Generated images must not be treated as official designs, construction drawings, real cases, quotation basis, completion guarantees, production assets, or official case data.
- Do not turn AI PCM into the final judge.

## Next Work

1. Immediate next step for visual simulation: if continuing beyond the disabled adapter, first choose a server runtime direction for a separate spike. Options include local Node server, Python dev server + separate proxy, Netlify Function, Vercel Function, Cloudflare Worker, or another user-approved deployment path. Do not mark it online, production, or real API-enabled before user-triggered LAIBE_REVIEWER review.
2. Recommended next floor-plan task: Plancraft Bridge `.pc` Converter Spike, because manual zones can now be connected to nodeGraph edges and exported as boundary data.
3. Budget raw-warehouse next step for this chatroom can be R1.4 review or R1.5 source quality scoring / reviewer checklist. Keep it proposal-only and do not take over Renderer, Excel/PDF, `BudgetOutputSnapshot`, floor-plan, or the paused old `intake/` path in this chatroom.
4. Budget renderer next step, if requested in the renderer/output chatroom, should review Phase 3.1 with LAIBE_REVIEWER, then proceed to Phase 3.2 formal renderer layout/file-generation work only from `BudgetOutputSnapshot`.
5. Do not continue the original Phase 2.6 intake path unless the user explicitly reopens or redefines that direction.
6. Start Budget Phase 3 floor-plan adapter work only if the user asks: update budget adapters for the new Plancraft+ draft shape, add real furniture/fixture data to the floor-plan page, or refine area-based bathroom quantity facts.
7. Keep Plancraft `.pc` bridge/export for after the wall graph and opening model are stable.
8. Keep each page edit scoped to one page.
9. Do not create more status MD files; update this file only when project status changes.

## Notes For New Codex

- The user prefers direct edits over long reports.
- Do not restart broad inventory or QA loops unless requested.
- Use the homepage visual direction as the style parent: black base, cement texture, brushed metal/glass, sparse cyan/mint/orange highlights, large breathing room.
- Do not git clean, git reset, modify plancraft, add npm / React / Vite / package.json / node_modules, or modify files outside the task scope unless explicitly authorized.

## Budget Renderer Phase 3.2 Handoff

- Budget Phase 3.2 Formal Renderer Entry + Layout Contract Implementation is implemented under `src/lib/budget/renderers/`.
- Budget Phase 3.2 doc: `docs/budget/22-formal-renderer-entry-contract.md`.
- Budget Phase 3.2 formal entry command: `node --experimental-strip-types src/lib/budget/renderers/demo-formal-renderer-entry.ts`.
- Budget renderer static guard command: `node --experimental-strip-types src/lib/budget/renderers/run-renderer-static-guard.ts`.
- Formal renderer entry is `renderFormalBudgetDocument(snapshot, options)` in `src/lib/budget/renderers/formal-renderer-entry.ts`.
- Formal renderer entry accepts only `BudgetOutputSnapshot` plus `FormalRendererOptions`; it rejects `methodSpecCatalog` at runtime.
- The first gate in formal renderer entry is `assertSnapshotRenderableForRenderer(snapshot)`.
- Formal Excel/PDF skeleton functions require the runtime token created by `formal-renderer-entry.ts`; the old string marker is not sufficient, and direct skeleton calls without the token fail at runtime.
- Formal renderer options currently support `audience: customer | internal_trace`, `format: excel_skeleton | pdf_skeleton`, and `layout_profile: standard_a4 | compact_a4 | internal_trace_a4`.
- `formal-layout-contract.ts` defines layout metadata only: column specs, section specs, signature block, totals block, notes block, pagination, header/footer, and customer/internal style separation.
- Customer layout columns are limited to customer-safe fields: `trade_category`, `line_no`, `item_name`, `unit`, `quantity`, `unit_price`, `amount`, and `customer_note`.
- Internal trace layout may include trace fields such as `item_code`, `source_type`, `source_id`, `recipe_id`, `material_code`, `quantity_formula`, `price_source`, `confidence`, `requires_review`, and `internal_note`.
- `formal-excel-renderer-skeleton.ts` and `formal-pdf-renderer-skeleton.ts` output structured skeleton objects only. They do not generate `.xlsx` or `.pdf`.
- `renderer-static-guard.ts` now scans the Phase 3.2 formal renderer files and rejects forbidden renderer imports / keywords such as `budget-generator`, `generateBudgetEstimate`, `mock-pricing`, `seed-budget-catalog`, `material-code-resolver`, `format-budget-output`, `LEGACY_BUDGET_OUTPUT_WARNING`, `rag`, `ai`, and `openai`.
- `run-renderer-static-guard.ts` is a command wrapper that prints validity, issue count, scanned files, and checked forbidden keywords; it exits non-zero if issues are found.
- Phase 3.2 did not modify frontend, floor-plan, preview_floor_plan, plan-puzzle, `code.html`, database migrations, RAG, AI API, Skills, payment, escrow, or listing fee.
- Task dispatch note: Budget Phase 3.2 is a Builder / Data Model / renderer-contract task with implementation allowed by user scope. Mark Phase 3.2 as review-ready before any real `.xlsx` or `.pdf` file writer; LAIBE_REVIEWER runs only if the user explicitly requests formal review.

## Budget Renderer Phase 3.3 Handoff

- Budget Phase 3.3 Formal File Writer Preflight & Guard Tightening is implemented under `src/lib/budget/renderers/`.
- Budget Phase 3.3 docs: `docs/budget/23-formal-file-writer-preflight.md` and `docs/budget/24-renderer-artifact-policy.md`.
- Budget Phase 3.3 demo command: `node --experimental-strip-types src/lib/budget/renderers/demo-formal-file-writer-preflight.ts`.
- Renderer static guard command remains: `node --experimental-strip-types src/lib/budget/renderers/run-renderer-static-guard.ts`.
- Formal Excel/PDF skeleton entry now uses `formal-renderer-token.ts`; the old string marker is no longer accepted as sufficient proof of formal entry.
- `formal-file-writer-policy.ts` defines artifact audience, future format, naming, storage, and security rules. It does not write files.
- `formal-file-writer-preflight.ts` validates gated structured output before any future file writer may run. It checks token provenance, audience/format, filename, snapshot id, layout, totals, rows, customer trace leakage, internal marking, sanitized warnings, and forbidden writer options.
- `fixture-budget-output-snapshot.ts` provides a fixed `BudgetOutputSnapshot` fixture so renderer / file-writer preflight can run without calling the budget engine.
- `renderer-static-guard.ts` now also detects dynamic import, require calls, path alias imports, cross-file re-export patterns, and scans full renderer source content for forbidden keywords.
- Root `package.json` does not exist, so Phase 3.3 did not add an npm script or create a package file.
- Phase 3.3 still does not generate real `.xlsx` or `.pdf`; Excel/PDF outputs remain structured skeleton documents only.
- Phase 3.3 did not modify frontend, floor-plan, preview_floor_plan, plan-puzzle, `code.html`, database migrations, RAG, AI API, Skills, payment, escrow, or listing fee.
- Task dispatch note: Budget Phase 3.3 is a Builder / Data Model / renderer-contract hardening task with implementation allowed by user scope. Mark Phase 3.3 as review-ready before any actual file writer; LAIBE_REVIEWER runs only if the user explicitly requests formal review.

## Budget Renderer Phase 3.4 Handoff

- Budget Phase 3.4 File Writer Dry-run Contract Hardening is implemented under `src/lib/budget/renderers/`.
- Budget Phase 3.4 doc: `docs/budget/25-file-writer-dry-run-contract.md`.
- Budget Phase 3.4 demo command: `node --experimental-strip-types src/lib/budget/renderers/demo-file-writer-dry-run-hardening.ts`.
- Renderer static guard command remains: `node --experimental-strip-types src/lib/budget/renderers/run-renderer-static-guard.ts`.
- `runFormalFileWriterPreflight()` is now no-throw for malformed input. Null, undefined, primitive values, missing `snapshot_id`, missing `layout_contract`, missing `layout_contract.columns`, missing / non-array `rows`, missing `totals`, missing `audience`, missing `renderer`, wrong token, customer trace leakage, bad filename, and forbidden writer options return `valid: false` with errors instead of throwing.
- `fixture-invalid-formal-documents.ts` provides invalid gated-document cases without importing or calling the budget engine.
- `formal-file-writer-dry-run.ts` returns would-write metadata only. It does not write files, does not import file write APIs, and does not create `.xlsx` or `.pdf`.
- `renderer-static-guard.ts` now reports `forbidden_rules_checked` with rule type (`full_text`, `import_pattern`, `restricted_usage`) and enforces that `createFormalRendererToken()` may only be used by `formal-renderer-entry.ts` and `formal-renderer-token.ts`.
- `docs/budget/22-formal-renderer-entry-contract.md` and `docs/budget/23-formal-file-writer-preflight.md` now describe token / factory behavior instead of the old string marker contract.
- Phase 3.4 still does not generate real `.xlsx` or `.pdf`; it only hardens preflight and dry-run writer readiness.
- Phase 3.4 did not modify frontend, floor-plan, preview_floor_plan, plan-puzzle, `code.html`, database migrations, RAG, AI API, Skills, payment, escrow, or listing fee.
- Task dispatch note: Budget Phase 3.4 is a Builder / Data Model / renderer-contract hardening task with implementation allowed by user scope. Mark Phase 3.4 as review-ready before any actual file writer; LAIBE_REVIEWER runs only if the user explicitly requests formal review.

## Budget Renderer Phase 3.5 Handoff

- Budget Phase 3.5 Formal File Writer Controlled Entry Spike is implemented under `src/lib/budget/renderers/`.
- Budget Phase 3.5 doc: `docs/budget/26-formal-file-writer-controlled-entry.md`.
- Budget Phase 3.5 demo command: `node --experimental-strip-types src/lib/budget/renderers/demo-formal-file-writer-controlled-entry.ts`.
- Renderer static guard command remains: `node --experimental-strip-types src/lib/budget/renderers/run-renderer-static-guard.ts`.
- `writeFormalBudgetArtifact(gatedDocument, options)` is the controlled writer entry. Its first runtime step is `runFormalFileWriterPreflight()`.
- Preflight failure returns a blocked result and does not write any artifact.
- `formal-artifact-manifest.ts` defines `FormalArtifactManifest` with snapshot id, project id, estimate id, audience, format, intended extension, actual artifact kind, filename, storage target, row count, total amount, layout profile, created time, policy id, warnings, and security flags.
- Security flags record snapshot-only behavior and confirm engine, pricing, material resolver, RAG, AI, and legacy output were not called or used.
- `formal-local-staging-policy.ts` restricts local staging to `artifacts/budget-renderer-staging/`, rejects absolute paths, path traversal, formal `.xlsx` / `.pdf` targets, unsupported extensions, and signed / approved overwrite.
- `formal-placeholder-artifact-writer.ts` can only write `.json` manifest or `.txt` placeholder when explicitly requested and staging policy passes. The Phase 3.5 demo uses manifest-only mode and does not write files.
- `renderer-static-guard.ts` now also blocks workbook-style libraries and writer escapes: workbook token, `xlsx` package import, `pdfkit`, `jspdf`, `puppeteer`, `playwright`, `html-pdf`, `writeFileSync` outside the placeholder writer, and `createWriteStream` outside the placeholder writer.
- Phase 3.5 still does not generate real `.xlsx` or `.pdf`; it only establishes controlled writer entry, manifest, local staging policy, placeholder writer guard, and static guard coverage.
- Phase 3.5 did not modify frontend, floor-plan, preview_floor_plan, plan-puzzle, `code.html`, database migrations, RAG, AI API, Skills, payment, escrow, or listing fee.
- Task dispatch note: Budget Phase 3.5 is a Builder / Data Model / renderer-contract spike with implementation allowed by user scope. It is ready to be included in phase review materials before any production-grade file writer is attempted.
## Latest Visual Simulation Task: Minimal Real Server Runtime Spike Revalidation

- 本輪任務名稱：Minimal Real Server Runtime Spike。
- 任務類型：Builder / Minimal Server Runtime Spike / proof of concept only；不是 production integration，沒有部署，沒有宣稱正式上線，也沒有把 disabled adapter 升級成 production API。
- 本輪重新盤點結果：`C:\laibe_project` 根目錄仍沒有 `package.json`、`node_modules`、`api/`、`server/`、`backend/`、`functions/`、`netlify.toml`、`vercel.json`、`wrangler.toml`、`.env` 或既有可安全承載 same-origin image proxy 的 server runtime。
- 本輪判斷：目前 LaiBE MVP 仍以靜態 `file:///` 頁面為主；在使用者決定 runtime 選型前，不適合硬造 `api/`、`server/` 或 production-like backend 結構。
- 本輪採用路線 B：沒有建立 server/proxy stub，沒有新增 backend/api/functions/server 目錄，沒有新增 `package.json`、`node_modules` 或任何 framework。
- 修改檔案：`docs/NEXT_CODEX_HANDOFF.md`。
- 新增檔案：無。
- 未修改：`src/stitch_laibe_landing_onboarding/preview_floor_plan/code.html`、`src/stitch_laibe_landing_onboarding/preview_floor_plan/plan-puzzle.js`、`C:\laibe_project\plancraft`、routing、CTA、Header。
- `code.html` 目前已使用 `./plan-puzzle.js?v=minimal-server-runtime-spike`，本輪未再修改；`file:///` 靜態載入架構仍保留。
- `plan-puzzle.js` 本輪未修改；`callStyleVisualImageProxy(styleVisualApiRequest)` 仍預設 disabled，沒有 `fetch()`、沒有 `XMLHttpRequest`，不直連外部 image API，不包含 API key，也不依賴任何真 server endpoint。
- Future same-origin proxy contract 仍只能是 `/api/style-visual-image-spike`；目前 endpoint 未啟用、未呼叫、未依賴。
- `styleVisualApiRequest` contract 維持白名單欄位：`roomType`、`primaryStyle`、`secondaryStyle`、`colorTone`、`materialTone`、`budgetLevel`、`purpose: "bid-listing-style-reference"`、`disclaimerRequired: true`、`referenceImage: { allowed: false, reason: "reference image upload requires separate privacy review" }`。
- `styleVisualApiRequest` 不得包含 `rawPrompt`、`systemPrompt`、`developerPrompt`、`walls`、`openings`、`zones`、`scale`、`plancraftBridge`、正式預算資料、reference image file 或使用者私宅圖片。
- `styleVisualApiResponse` contract 維持 `status: "disabled" | "mock_ready" | "error"`、`imageUrl: null`、`previewDataUrl: null`、`message` 與 metadata；metadata 必須保留 `generatedBy: "LAIBE_VISUAL_SIM"`、`usage: "bid-listing-style-reference"`、`sandbox: true`、`isOfficialDesign: false`、`isConstructionDrawing: false`、`isQuotationBasis: false`、`isRealCase: false`、`savedToOfficialCase: false`。
- UI fallback 仍顯示 `Server-side Image API proxy 尚未設定`；Visual Simulation Panel 必須保留 `Sandbox Preview`、`AI 示意圖`、`非正式圖片`、`不會保存到正式案件`、`非真實案例`、`非正式成果` 與固定 disclaimer。
- `styleVisualTask.generatedPreview` 仍只能是 local UI task state；不得寫入 `project`、export JSON、正式案件資料、production assets、budget data、`walls`、`openings`、`zones`、`scale` 或 `plancraftBridge`。
- Reference image upload 仍 disabled，`referenceImage.allowed` 必須維持 `false`；不得建立 upload pipeline。
- 本輪沒有 real image API、沒有 OpenAI 或第三方模型呼叫、沒有 API key、沒有 `.env`、沒有 secret、沒有 production endpoint。
- 若下一步要建立真 server runtime，需先由使用者決定 runtime 選型：local Node server、Python dev server + separate proxy、Netlify Function、Vercel Function、Cloudflare Worker 或其他部署方式。以目前靜態 MVP 與禁止新增 package 的限制看，下一個 local-only spike 可優先評估「內建 Node `http` 的 local same-origin dev server」，但必須另開任務並維持 disabled-by-default / no-secret 規則。
- 本輪成果可供使用者後續主動交給 LAIBE_REVIEWER 做 runtime boundary review；在進入任何真 server runtime、真 API request、key 注入、production connection 或 reference image upload 前，應先完成使用者觸發的審查。
