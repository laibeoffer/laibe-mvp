# Plan Puzzle Agent Transfer

## 任務名稱

Plancraft+ 平面拼圖 UI IA Alignment Implementation

## 當前 Repo / 工作目錄

`C:\laibe_project` in project docs; current local workspace path in this machine is `Z:\laibe_project`.

## 主要頁面

`src/stitch_laibe_landing_onboarding/preview_floor_plan/code.html`

## 主要 JS

`src/stitch_laibe_landing_onboarding/preview_floor_plan/plan-puzzle.js`

## 本機預覽網址

`http://127.0.0.1:41725/src/stitch_laibe_landing_onboarding/preview_floor_plan/code.html`

## 目前版本

- `project.version`: `0.12.0-ui-ia-alignment`
- Tool Catalog runtime version: `0.12.0-ui-ia-alignment`

## 本輪實際完成事項

- 建立四大 UI 區域：檔案區、工具區、畫布、狀態區。
- 檔案區新增草稿名稱、匯入、草稿儲存 placeholder、版本 / 儲存狀態、列印 / 匯出、已選材質、基本說明、總預覽入口。
- 工具區新增完整工具清單：選取、手掌、縮放、牆體、門窗、項目放置、尺寸、文字、材質、一鍵標註、刪除、鎖點、復原 / 重做。
- 建立 10 個產品圖層：現況、平面配置、隔間尺寸、天花板、現況拆除、地坪、燈具、插座及弱電、給排水、空調。
- 建立圖層與項目庫連動顯示；木作櫃、系統櫃、廚具、門窗工程、防水等不作為第一層產品圖層。
- 狀態區新增目前圖層、選取物件屬性、圖層顯示 / 疊加、AI 引導官、備註、偏好材料、系統提醒、納入預算勾選、完成度、快捷鍵、總預覽。
- 保留既有 Import Interface、underlay、scale calibration、wall drawing、wallGraph、nodeGraph、openings、zones、zone boundary、zone area metadata、`.pc` converter spike、DSL validation report、renderer preview report、Tool Catalog runtime。

## 本輪未完成事項

- 手掌 / 移動畫布、畫布縮放、項目放置、尺寸標註、文字、油漆桶 / 材質仍是 UI placeholder。
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

- Bundled Node `node --check plan-puzzle.js`: PASS.
- PATH `node.exe`: Access denied from Codex app WindowsApps path; no PATH or system config was changed.
- Local server browser validation:
  - URL: `http://127.0.0.1:41725/src/stitch_laibe_landing_onboarding/preview_floor_plan/code.html?validation=ui-ia-alignment-0-12`
  - Page loaded.
  - File area present.
  - Four main UI areas present.
  - Status area present.
  - Product layer select has 10 options.
  - Switching to `plumbing_plan` works.
  - Total preview expands.
  - Tool Catalog Runtime visible.
  - Browser console error count: 0.
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

Yes. 本輪是平面拼圖 UI 資訊架構、圖層、工具、項目庫、狀態區與總預覽重整，需要最高指揮官確認是否接受此 IA。

## Need Reviewer

No by default. 本輪未修改 Plancraft core、budget runtime、formal estimate guard 或正式 quantity / estimate / output。若後續觸碰上述邊界，需改為 Yes。

## 下一步唯一建議

Plancraft+ Tool Catalog Interaction Implementation.
