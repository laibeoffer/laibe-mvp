# Plan Puzzle Agent Transfer

## Latest Transfer Update: Intuitive Workspace Repair 0.15.2

- Task: Plancraft+ Intuitive Workspace Repair 0.15.2.
- Branch: `codex/plan-puzzle-intuitive-workspace-repair-0-15-2`.
- Base: PR #67 / `codex/plan-puzzle-compact-workspace-polish-0-15-1` / head `fb926cd10f56a490f46deee216d5ec7c3d1d8062`.
- `project.version`: `0.15.2-intuitive-workspace-repair`.
- Tool Catalog runtime version: `0.15.2-intuitive-workspace-repair`.
- Script cache key: `./plan-puzzle.js?v=intuitive-workspace-repair-0-15-2`.
- Main change: 0.15 compact workspace was repaired into a more intuitive, single-screen CAD-like workspace.
- File area: compact topbar stays short; `預算` is not a main file button.
- Tool area: 56px icon category rail plus movable / collapsible floating palette.
- Canvas: central canvas keeps priority width; focus mode hides inspector and expands canvas.
- Right inspector: concise summary plus four tabs only: `屬性`, `圖層`, `提醒`, `更多`.
- Inspector tab repair: tab list now has explicit height / z-index and pointerdown-safe switching, so panel cards no longer cover tab buttons.
- Empty canvas: actionable `匯入圖檔` CTA remains; blank underlay creation remains disabled / unavailable.
- Developer diagnostics: collapsed by default and marked as testing / handoff information only.
- Validation:
  - `node --check src/stitch_laibe_landing_onboarding/preview_floor_plan/plan-puzzle.js`: PASS.
  - Browser URL: `http://127.0.0.1:50367/code.html?validation=intuitive-workspace-repair-0-15-2`.
  - Browser console error count: 0.
  - 4 inspector tabs switch correctly; 10 product layer buttons render; `燈具配置圖` can be selected; item palette opens; wall tool shows import/scale prerequisite error; focus mode expands canvas from 951px to 1251px and restores inspector.
- Guard: no Plancraft core, no `plancraft/`, no budget runtime, no package / node_modules / framework, no `formalEstimateGuard`, no `generateBudgetEstimate()`, no image API / AI API / DB / payment / escrow / listing fee.

## Latest Transfer Update: Compact Workspace / Single-Screen CAD-like Layout

- Task: Plancraft+ Compact Workspace / Single-Screen CAD-like Layout.
- Branch: `codex/plan-puzzle-compact-workspace-0-15`.
- `project.version`: `0.15.0-compact-workspace`.
- Tool Catalog runtime version: `0.15.0-compact-workspace`.
- Script cache key: `./plan-puzzle.js?v=compact-workspace-0-15`.
- Main change: layout is compressed from long-page UI into a CAD-like single-screen workspace.
- File area: compact topbar / ribbon.
- Tool area: icon-only rail plus flyout; tool clicks update `currentTool`, active state, and flyout content.
- Canvas: central canvas has priority width and fixed viewport height.
- Right inspector: tabs for properties, layers, reminders, materials, overview, help.
- Shortcut help: de-duplicated into help tab.
- Developer diagnostics: collapsed by default and kept out of homeowner status.
- Validation:
  - `node --check src/stitch_laibe_landing_onboarding/preview_floor_plan/plan-puzzle.js`: PASS.
  - Browser URL: `http://127.0.0.1:50362/code.html?validation=compact-workspace-0-15`.
  - Browser console error count: 0.
  - Body scroll height equals viewport height; main workspace is no longer a long document at desktop viewport.
- Guard: no Plancraft core, no budget runtime, no package / node_modules / framework, no `formalEstimateGuard`, no `generateBudgetEstimate()`, no AI API / DB / payment / escrow / listing fee.

## Latest Transfer Update: Status Area Productization / Debug Collapse

- Task: Plancraft+ Status Area Productization / Debug Collapse.
- Branch: `codex/plan-puzzle-tool-catalog-interaction`.
- `project.version`: `0.14.0-status-area-productization`.
- Tool Catalog runtime version: `0.14.0-status-area-productization`.
- Script cache key: `./plan-puzzle.js?v=status-area-productization-0-14`.
- Main change: right status area is now homeowner-facing by default; debug/developer panels are collapsed under `開發者診斷 / 技術資訊`.
- Default homeowner status area keeps: current layer, item catalog, selected object, layer overlay, AI guide, notes, preferences, system reminders, budget inclusion, completion, shortcuts, and preflight.
- Collapsed diagnostics keeps: Tool Catalog Runtime, Wall Graph, Node Graph, Plancraft Bridge, Converter Report, Renderer Preview Report, DSL / renderer state, and AI sandbox technical status.
- Validation:
  - `node --check src/stitch_laibe_landing_onboarding/preview_floor_plan/plan-puzzle.js`: PASS.
  - Browser URL: `http://127.0.0.1:50362/code.html?validation=status-area-productization-0-14`.
  - Browser console error count: 0.
- Guard: no Plancraft core, no budget runtime, no package / node_modules / framework, no `formalEstimateGuard`, no `generateBudgetEstimate()`, no AI API / DB / payment / escrow / listing fee.

## 任務名稱

Plancraft+ Tool Catalog Interaction Implementation

## 當前 Repo / 工作目錄

`C:\laibe_project` in project docs; current local workspace path in this machine is `Z:\laibe_project`.

## 主要頁面

`src/stitch_laibe_landing_onboarding/preview_floor_plan/code.html`

## 主要 JS

`src/stitch_laibe_landing_onboarding/preview_floor_plan/plan-puzzle.js`

## 本機預覽網址

`http://127.0.0.1:41725/src/stitch_laibe_landing_onboarding/preview_floor_plan/code.html`

## 目前版本

- `project.version`: `0.12.1-tool-catalog-interaction`
- Tool Catalog runtime version: `0.12.1-tool-catalog-interaction`

## 本輪實際完成事項

- 建立四大 UI 區域：檔案區、工具區、畫布、狀態區。
- 檔案區新增草稿名稱、匯入、草稿儲存 placeholder、版本 / 儲存狀態、列印 / 匯出、已選材質、基本說明、總預覽入口。
- 工具區新增完整工具清單：選取、手掌、縮放、牆體、門窗、項目放置、尺寸、文字、材質、一鍵標註、刪除、鎖點、復原 / 重做。
- 建立 10 個產品圖層：現況、平面配置、隔間尺寸、天花板、現況拆除、地坪、燈具、插座及弱電、給排水、空調。
- 建立圖層與項目庫連動顯示；木作櫃、系統櫃、廚具、門窗工程、防水等不作為第一層產品圖層。
- 圖層切換會實際更新 `uiState.currentLayer` / `project.currentLayer`，並驅動目前圖層項目庫。
- 工具切換會實際更新 `uiState.currentTool`，工具按鈕 active state 會同步目前工具。
- 項目庫依目前圖層顯示不同項目，點選 chip 會更新 draft `project.layerItemSelections`。
- 圖層疊加 checkbox 會更新 `project.visibleLayers`，並寫入 Tool Catalog runtime snapshot。
- 系統提醒 / 缺失清單支援 `加入預算`、`忽略`、`請廠商建議` 三種處理狀態。
- 總預覽 / 送出前檢查可展開，並顯示目前提醒、提醒狀態與已選圖層項目。
- 狀態區新增目前圖層、選取物件屬性、圖層顯示 / 疊加、AI 引導官、備註、偏好材料、系統提醒、納入預算勾選、完成度、快捷鍵、總預覽。
- 保留既有 Import Interface、underlay、scale calibration、wall drawing、wallGraph、nodeGraph、openings、zones、zone boundary、zone area metadata、`.pc` converter spike、DSL validation report、renderer preview report、Tool Catalog runtime。

## 本輪未完成事項

- 手掌 / 移動畫布、畫布縮放、尺寸標註、文字、油漆桶 / 材質仍是 draft interaction 邊界；項目放置已落到圖層項目庫 selection，不是 canvas furniture placement。
- 復原 / 重做完整 history stack 尚未落地。
- 總預覽 / 送出前檢查目前是初版入口與 checklist，不是正式提交流程。
- 尚未建立 production Tool Catalog data model。
- 尚未接 production budget adapter、Budget Engine、Renderer、MethodSpec、Raw Candidate、Output Documents、Excel / PDF writer、AI API、DB 或雲端儲存。

## 修改檔案

- `src/stitch_laibe_landing_onboarding/preview_floor_plan/code.html`
- `src/stitch_laibe_landing_onboarding/preview_floor_plan/plan-puzzle.js`
- `docs/NEXT_CODEX_HANDOFF.md`
- `docs/CURRENT_PHASE_REVIEW_PACKET.md`
- `docs/WORKSTREAM_BLACKBOARD.md`
- `docs/PLAN_PUZZLE_AGENT_TRANSFER.md`

## 未修改檔案 / 區域

- 未修改 `C:\laibe_project\plancraft`
- 未修改 `Z:\laibe_project\plancraft`
- 未修改 Plancraft core
- 未修改 budget runtime
- 未新增 `package.json`
- 未新增 `node_modules`
- 未新增 React / Vite / TypeScript app
- 未解除 `formalEstimateGuard`
- 未呼叫 `generateBudgetEstimate()`
- 未做正式估價
- 未做正式價格
- 未做正式 Excel / PDF
- 未接 AI API
- 未接 DB / payment / escrow / listing fee / auth / webhook / secrets

## 測試 / 驗證

- `node --check plan-puzzle.js`: PASS.
- PATH `node.exe`: Access denied from Codex app WindowsApps path; no PATH or system config was changed.
- Local server browser validation:
- Browser validation:
  - URL: `http://127.0.0.1:41854/src/stitch_laibe_landing_onboarding/preview_floor_plan/code.html?validation=dom-validation`
  - Page loaded.
  - Product layer select has 10 options.
  - Switching to `plumbing_plan` updates current layer and item catalog.
  - `dimension` tool updates currentTool and active state.
  - Plumbing overlay checkbox updates visible state.
  - `浴室給水` item selection toggles.
  - `BATH_WATERPROOFING_SUGGESTED` reminder can be marked `include_budget`.
  - Total preview expands and shows current reminders / selected items.
  - Shortcut help visible.
  - Browser validation runner observed console error count: 0.
- `file:///C:/laibe_project/...` was not checked because `C:\laibe_project` does not exist in this environment.
- `file:///Z:/...` browser navigation was blocked by in-app browser URL policy.

## 下一台 Agent 接手前必讀

- `docs/WORKSTREAM_BLACKBOARD.md`
- `docs/NEXT_CODEX_HANDOFF.md`
- `docs/CURRENT_PHASE_REVIEW_PACKET.md`
- `docs/PLAN_PUZZLE_AGENT_TRANSFER.md`
- `AGENTS.md`
- `AI_RULES/SYSTEM_ARCHITECTURE.md`
- `AI_RULES/ROUTING_RULES.md`
- `AI_RULES/FILE_OWNERSHIP_RULES.md`
- `AI_RULES/HANDOFF_RULES.md`
- `AI_RULES/TASK_DISPATCH_RULES.md`
- `AI_RULES/LAIBE_BUILDER_RULES.md`

## 下一台 Agent 不可做

- 不要 `git clean`
- 不要 `git reset`
- 不要修改 Plancraft core
- 不要新增 `package.json`
- 不要新增 `node_modules`
- 不要新增 React / Vite / TypeScript app
- 不要解除 `formalEstimateGuard`
- 不要把 UI placeholder 當 production 功能
- 不要把 AI 模擬圖當正式設計圖
- 不要把 `.pc` / SVG 當 budget input
- 不要把 candidate facts 當 production facts
- 不要接正式 Budget Engine、payment、auth、webhook、AI API、DB 或 secrets

## Need Commander

No for scoped implementation. Yes only for PR landing / product acceptance.

## Need Reviewer

No by default. 本輪未修改 Plancraft core、budget runtime、formal estimate guard 或正式 quantity / estimate / output。若後續觸碰上述邊界，需改為 Yes。

## 下一步唯一建議

Commit and open scoped PR.

## 2026-06-02 接手補充：0.15.1 Compact Workspace Polish

- 目前版本：`0.15.1-compact-workspace-polish`。
- 目前 script：`./plan-puzzle.js?v=compact-workspace-polish-0-15-1`。
- 平面拼圖主頁已改為單螢幕 compact workspace，不再以長頁說明書方式呈現。
- 四大區域仍存在：compact topbar 檔案區、分類 icon rail 工具區、中央畫布、右側情境式 inspector。
- 左側工具列分為匯入 / 檢視、繪製 / 編修、空間 / 物件、標註 / 輸出；工具內容改為 floating panel。
- 右側 inspector 只保留 4 個 tab：屬性、圖層 / 頁面、總覽、說明。
- 10 個產品圖層仍可在 UI 中切換，圖層疊加 checkbox 仍更新 visibleLayers。
- 空畫布已有「匯入圖檔」CTA；「建立空白底圖」為 disabled / 尚未開放。
- 新增專注模式，會收合工具浮動面板與右側 inspector，讓畫布最大化。
- 快捷鍵說明只保留在說明 tab。
- AI 風格示意 / 模擬圖預覽不再顯示於平面拼圖主頁主流程。
- 開發者診斷 / 技術資訊仍預設收合，僅供測試與交接。
- 未修改 `plancraft/`、Plancraft core、budget runtime、formalEstimateGuard、package.json、node_modules 或任何新 framework。
- 未接 AI API、image API、DB、payment、escrow、listing fee；未產生正式估價。
- 驗證：`node --check src/stitch_laibe_landing_onboarding/preview_floor_plan/plan-puzzle.js` PASS。
- Browser evidence：`http://127.0.0.1:50362/code.html?validation=compact-workspace-polish-0-15-1` 可載入；body 不長捲；topbar 72px；rail 56px；canvas shell 1173px；layer switch / visible layer / focus mode / empty CTA 通過。
- 注意：目前 in-app browser API 無法掛 console listener；未觀察到頁面 runtime break 或 error overlay。
