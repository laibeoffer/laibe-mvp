# CURRENT PHASE REVIEW PACKET

此文件是萊比專案目前階段的總審查資料包。  
## Review Status

狀態：
Ready for user-triggered review

可選狀態：
Draft / Ready for user-triggered review / Reviewed / Needs update before review

說明：
本文件只提供給使用者在需要時主動觸發 LAIBE_REVIEWER 進行 Phase Review。
更新本文件不代表自動啟動審查。

本文件已包含 AI_ARCHITECT_CORE 治理規則層成果。  
本次追加整理 LAIBE_WEB_FLOW_BUILDER 聊天室負責範圍：landing、onboarding、header、CTA、routing、progress bar、dashboard flow、頁面連接。
本次追加整理 LAIBE_VISUAL_SIM 聊天室負責範圍：模擬圖、示意圖、圖片 prompt、visual brief、asset spec、對應網站位置、不可宣稱事項。
本次追加整理 LAIBE_VISUAL_SIM Issue #19 成果：visual brief / prompt / negative prompt / sandbox governance packet、storage policy、reference image policy 與 reviewer packet 邊界。

補充說明：本檔已在後續區段加入本聊天室負責的 budget-system / specDB / method-spec / budget output / estimate / quote / material / labor data，以及 plan-puzzle input adapter 銜接成果。

---

## Phase Name

AI / Codex 中央治理規則層、Web Flow 靜態連接、Budget / specDB / Method-spec 資料契約建立階段

---

## Review Date

2026-05-23

---

## Included Chatrooms / Roles

本檔目前整理 AI_ARCHITECT_CORE、LAIBE_WEB_FLOW_BUILDER、LAIBE_VISUAL_SIM 與本聊天室 budget-system / specDB 相關階段成果。

- AI_ARCHITECT_CORE
- LAIBE_REVIEWER，規則已建立，尚待執行階段總審查
- Builder / Codex，規則與模板已建立
- LAIBE_WEB_FLOW_BUILDER，規則與模板已建立；本次追加整理實際 web flow 施工成果
- LAIBE_VISUAL_SIM，規則、模板與聊天室指引已建立
- 平面拼圖 Builder，本聊天室未處理功能施工
- 預算生成 Builder，本聊天室已處理 Phase 1 至 Phase 2.9.2 的 budget-system / specDB / method-spec / output contract

---

## Phase Goal

建立萊比專案的 AI / Codex 中央治理規則層，整理 Web Flow 靜態頁面連接成果，並補齊 budget-system 從 deterministic mock engine、preview floor plan adapter、local warehouse、method-spec warehouse、budget output logistics、snapshot contract 到 renderer gate 的階段性資料契約，讓 LAIBE_REVIEWER 可對治理規則、頁面流程邊界與預算資料層一致性進行階段總審查。

---

## LAIBE_VISUAL_SIM Issue #19 成果

### 完成事項

- 建立 `docs/ai_style_visual_chat/VISUAL_BRIEF_PROMPT_SANDBOX_PACKET.md`，集中定義 visual brief、prompt preview、negative prompt、sandbox preview workflow、placeholder visual card、Builder 整合邊界與 Reviewer 審查重點。
- 修正並收斂 `PROMPT_SANITIZATION_RULES.md`，明確規定 prompt 必須由系統 template 組裝，不得直接使用 raw user prompt。
- 修正並收斂 `IMAGE_API_REQUEST_SCHEMA.md`，統一 `styleVisualApiRequest` 白名單欄位，並禁止 `rawPrompt`、`systemPrompt`、`developerPrompt`、Plancraft geometry、正式預算資料與 reference image file。
- 修正並收斂 `GENERATED_IMAGE_STORAGE_POLICY.md`，明確 generated preview 只能是 sandbox / mock / temporary preview，不得寫入正式案件資料或 production assets。
- 修正並收斂 `IMAGE_API_SPIKE_REVIEW_CHECKLIST.md`，補齊 API key / secret、request schema、prompt sanitization、reference image、generated preview、Plancraft geometry contamination 與 handoff 檢查項目。
- 更新 `templates/LAIBE_VISUAL_SIM_TASK_TEMPLATE.md`，加入 sandbox governance 必讀文件與禁止事項。
- 更新 `skills/laibe-visual-sim/SKILL.md`，修復固定輸出格式亂碼並補上 sandbox governance guardrail。

### 產出素材 / Prompt

- 產出的是治理文件、prompt 規則、negative prompt 規則、visual brief 欄位規格與 reviewer checklist。
- 未產出真圖片。
- 未呼叫 image generation API。
- 未建立 API key、`.env`、backend、proxy、upload pipeline 或 production storage。

### 對應網站位置

- 對應未來 Visual Simulation Panel、Prompt Preview、Placeholder Visual Card 與 sandbox preview UI 的文案 / 資料規格。
- 本輪未修改任何網站 runtime 檔案，未修改 `plan-puzzle.js`、routing、CTA 或 Header。

### 不可宣稱事項

Visual simulation 只能作為案件上架與風格溝通輔助，不得宣稱為：

- 施工圖。
- 正式設計圖。
- 真實案例。
- 竣工圖。
- 精準尺寸圖。
- 正式報價依據。
- 完工保證。

### 已知風險

- 真 image API、reference image upload、production asset storage、正式圖片用途或 server runtime 都尚未開放。
- 若未來進入真 API / server runtime，需另開 formal Issue，且 API key 不得進 frontend、repo、Markdown、handoff 或 console。
- Reference image upload 仍需獨立 privacy review。

### 是否 ready for phase review

Ready for user-triggered review。此狀態不代表自動啟動 LAIBE_REVIEWER。

---

## AI_ARCHITECT_CORE 成果

### 完成事項

- 建立並整合根目錄 `AGENTS.md` 作為 Codex / AI agent 的最高入口規則。
- 建立 `AI_RULES/` 中央治理規則層，涵蓋系統架構、routing、mandatory entry、file ownership、review checklist、handoff、task dispatch。
- 建立 LAIBE_REVIEWER 專用規則，明確規定 Reviewer 是審查官，不施工，並支援自動審查觸發。
- 建立 LAIBE_BUILDER 專用規則與 Builder 任務模板，明確規定 Builder 小步施工、不得擴大範圍、需固定格式回報。
- 建立 LAIBE_VISUAL_SIM 規則、任務模板、聊天室指引與 project-local skill-style 指引，明確其只產出 visual brief / image prompt / asset spec，不施工、不審查。
- 建立 LAIBE_WEB_FLOW_BUILDER 規則與任務模板，將 landing / onboarding / header / CTA / routing / progress bar / dashboard flow 與一般 Builder 區隔。
- 建立任務分派規則，支援 Builder Task、Reviewer Task、Architect / Governance Task、Documentation Task、Routing / CTA Task、Data Model Task、Sensitive Task、Blocked Task、Visual Simulation Task、Web Flow Builder Task、Phase Review Task。
- 建立 Builder Review-ready Summary 規則，讓 Builder / Codex 施工任務完成後整理可供使用者主動審查時使用的 `REVIEW_READY_SUMMARY`。
- 建立 Phase Review 制度，改以階段總審查取代每個小任務必審。
- 建立 `docs/CURRENT_PHASE_REVIEW_PACKET.md` 作為本階段總審查資料包。
- 更新 `docs/NEXT_CODEX_HANDOFF.md`，記錄目前治理規則、角色邊界、handoff 與 phase review 狀態。

### 修改檔案

- `AGENTS.md`
- `AI_RULES/CODEX_MANDATORY_ENTRY.md`
- `AI_RULES/FILE_OWNERSHIP_RULES.md`
- `AI_RULES/HANDOFF_RULES.md`
- `AI_RULES/LAIBE_BUILDER_RULES.md`
- `AI_RULES/LAIBE_REVIEWER_RULES.md`
- `AI_RULES/REVIEW_CHECKLIST.md`
- `AI_RULES/ROUTING_RULES.md`
- `AI_RULES/SYSTEM_ARCHITECTURE.md`
- `AI_RULES/TASK_DISPATCH_RULES.md`
- `docs/NEXT_CODEX_HANDOFF.md`
- `docs/CURRENT_PHASE_REVIEW_PACKET.md`
- `templates/CODEX_BUILDER_TASK_TEMPLATE.md`
- `templates/LAIBE_WEB_FLOW_BUILDER_TASK_TEMPLATE.md`

### 新增檔案

- `AI_RULES/LAIBE_BUILDER_RULES.md`
- `AI_RULES/LAIBE_REVIEWER_RULES.md`
- `AI_RULES/LAIBE_VISUAL_SIM_RULES.md`
- `AI_RULES/LAIBE_WEB_FLOW_BUILDER_RULES.md`
- `AI_RULES/PHASE_REVIEW_RULES.md`
- `AI_RULES/TASK_DISPATCH_RULES.md`
- `docs/CURRENT_PHASE_REVIEW_PACKET.md`
- `docs/LAIBE_VISUAL_SIM_CHATROOM.md`
- `skills/laibe-visual-sim/SKILL.md`
- `templates/CODEX_BUILDER_TASK_TEMPLATE.md`
- `templates/LAIBE_TASK_BRIEF_TEMPLATE.md`
- `templates/LAIBE_VISUAL_SIM_TASK_TEMPLATE.md`
- `templates/LAIBE_WEB_FLOW_BUILDER_TASK_TEMPLATE.md`
- `templates/PHASE_REVIEW_PACKET_TEMPLATE.md`
- `templates/PHASE_REVIEWER_PROMPT_TEMPLATE.md`

### 未完成事項

- 尚未由 LAIBE_REVIEWER 執行本階段總審查。
- 尚未整理各 Builder 聊天室的實際施工成果，本檔目前只涵蓋 AI_ARCHITECT_CORE 治理成果。
- 尚未確認所有 Builder / Reviewer / Visual Sim 聊天室是否都已採用最新模板。
- 尚未進行 Constitution Review 的正式審查輸出；目前僅建立治理與階段審查制度。

### 規則 / templates 影響

- Builder 不再被視為泛用施工入口，任務需先依 `TASK_DISPATCH_RULES.md` 分派。
- 網站主流程工作應優先交給 `LAIBE_WEB_FLOW_BUILDER`，不是泛用 Builder。
- 視覺模擬圖、網站示意圖、圖片 prompt 與素材 brief 應交給 `LAIBE_VISUAL_SIM`，不是 Builder 或 Reviewer。
- Reviewer 可做 Single Task Review，也可做 Phase Review；使用者可用「請執行本階段總審查」啟動 Phase Review。
- Builder / Codex 施工任務完成後應整理 `REVIEW_READY_SUMMARY`，但 Builder self-check 不等於 LAIBE_REVIEWER 正式審查，也不會自動觸發審查。
- `docs/NEXT_CODEX_HANDOFF.md` 用於下一輪接續工作；`docs/CURRENT_PHASE_REVIEW_PACKET.md` 用於 LAIBE_REVIEWER 階段總審查。
- Phase Review 制度降低每個小任務都由使用者主動觸發審查的複製貼上成本，改以工作段落為審查單位。

### 已知風險

- 規則文件已快速累積，可能存在重複描述或部分規則優先級需要整理。
- 部分既有 Markdown 在終端顯示有中文編碼亂碼，但本輪未處理編碼清理。
- `docs/NEXT_CODEX_HANDOFF.md` 目前同時包含治理資訊與較多既有功能階段資訊，後續 Reviewer 應檢查是否需要拆分或壓縮。
- 工作樹中存在既有功能檔修改或未追蹤項目，但本聊天室本輪未修改功能檔。

---

## LAIBE_WEB_FLOW_BUILDER 成果

### 完成事項

- Landing：以正式首頁黑底 / 水泥 / 金屬玻璃視覺方向作為 onboarding 與平面拼圖頁的樣式母版；本聊天室未再修改首頁本體。
- Onboarding：`onboard_ai_agent/code.html` header 移除「發案方」「接案方」入口，保留工具、流程、關於萊比、PCM 後台、我有帳號。
- Onboarding：需求問答輸出框外下方新增兩個分流入口：
  - 問答完成，進入平面拼圖
  - 已有平面圖，直接進入預算生成
- Header：`preview_floor_plan/code.html` header 保留 LaiBE logo 與主導覽。
- Header：平面拼圖頁的「工具」改為下拉選單，包含平面拼圖、預算生成、LiDAR 下載鏈接、iScanner 鏈接。
- Progress bar：平面拼圖頁的進度條從 header 中拆出，成為 header 下方的獨立 banner。
- Progress bar：需求整理、平面拼圖、預算生成三個節點皆可點擊。
- CTA：平面拼圖頁的「返回上一頁」「進行預算生成」放在畫布外、頁面右上角空白處。
- CTA：平面拼圖畫布內已移除返回、預算生成、上傳平面圖、新增空間等不應在插件內出現的功能區。
- Routing：需求整理 → 平面拼圖 → 預算生成的靜態頁面路徑已串接。
- 頁面連接：目前以 static MVP HTML 檔案彼此連結，未接真資料流。

### 修改檔案

- `src/stitch_laibe_landing_onboarding/onboard_ai_agent/code.html`
- `src/stitch_laibe_landing_onboarding/preview_floor_plan/code.html`
- `docs/NEXT_CODEX_HANDOFF.md`
- `docs/CURRENT_PHASE_REVIEW_PACKET.md`

### 新增檔案

- `AI_RULES/LAIBE_WEB_FLOW_BUILDER_RULES.md`
- `templates/LAIBE_WEB_FLOW_BUILDER_TASK_TEMPLATE.md`
- 本次 Web Flow 補充未新增功能檔或新 Markdown 檔。

### 未完成事項

- 未調整 `preview_budget/code.html` 預算生成頁內容。
- 未調整 dashboard / owner portal / vendor portal React 原型。
- 未實作真上傳、真 AI API、資料庫、登入或權限。
- 未做全站 QA；僅針對相關頁面與 routing 做最小 HTTP 200 檢查。
- Header「LiDAR 下載鏈接」「iScanner 鏈接」目前仍為 App Store 搜尋連結，尚未指定正式 App URL。
- Onboarding 的兩個下一步入口目前固定顯示，尚未依「問答完成」狀態動態顯示。

### Routing / CTA / Header 影響

- `onboard_ai_agent/code.html`
  - Header 移除發案方 / 接案方。
  - 問答輸出框外新增 CTA：
    - `../preview_floor_plan/code.html`
    - `../preview_budget/code.html`
- `preview_floor_plan/code.html`
  - Header 工具改為 dropdown。
  - Progress banner 節點：
    - 需求整理 → `../onboard_ai_agent/code.html`
    - 平面拼圖 → `./code.html`
    - 預算生成 → `../preview_budget/code.html`
  - 頁面右上角 CTA：
    - 返回上一頁 → `../onboard_ai_agent/code.html`
    - 進行預算生成 → `../preview_budget/code.html`
  - 畫布插件內不再放跨頁 CTA 或上傳 / 新增功能區。
- Landing：
  - 本聊天室未修改首頁內容；僅沿用首頁作為視覺與導覽風格母版。
- Dashboard flow：
  - 本聊天室未施工 dashboard；目前只整理 static MVP 的頁面連接。

### 風險

- 靜態 HTML routing 若資料夾位置調整，所有相對路徑需重新檢查。
- LiDAR / iScanner 連結未定稿，可能需要替換成指定官方下載頁。
- Onboarding 分流入口固定顯示，可能與日後真問答流程狀態不一致。
- 平面拼圖頁仍是靜態骨架，尚未確認實際互動、拖拉、resize 或資料輸出規格。
- Header / CTA 視覺位置已依當前回饋調整，但尚未做完整響應式視覺驗收。

### 本輪 Web Flow 驗收結果（2026-05-23）

#### 完成事項

- 已做只讀驗收，未修改任何功能程式碼。
- 已檢查主流程候選頁 HTTP 狀態；以下頁面皆回 `HTTP 200`：
  - `laibe_landing_desktop/code.html`
  - `onboard_ai_agent/code.html`
  - `preview_floor_plan/code.html`
  - `preview_budget/code.html`
  - `client_step_4_budget_finalization/code.html`
  - `budget_document_preview/code.html`
  - `client_awarding_dashboard/code.html`
  - `bid_comparison_and_ai_summary/code.html`
- 已靜態掃描主流程與 dashboard 候選頁的 `href`、button、progress bar、header tools 與 back button。

#### 修改檔案

- `docs/CURRENT_PHASE_REVIEW_PACKET.md`

#### 新增檔案

- 無。

#### 未完成事項

- Landing → onboarding 仍未形成清楚靜態跳轉：正式首頁沒有直接連到 `onboard_ai_agent/code.html` 的主 CTA。
- Budget-system → dashboard 仍未形成清楚靜態跳轉：`preview_budget/code.html` 目前先到 `client_step_4_budget_finalization/code.html`，尚未直接或明確接到 dashboard / award flow。
- `client_awarding_dashboard/code.html` 與 `bid_comparison_and_ai_summary/code.html` 目前存在且 HTTP 200，但未被主流程靜態連結承認，仍有 orphan page 風險。
- `preview_budget/code.html`、`client_awarding_dashboard/code.html` 等後段頁仍是舊版白底 header / flow 樣式，尚未對齊目前黑底金屬首頁母版與平面拼圖 header tools。

#### Routing / CTA / Header 影響

- 已確認可走通的靜態段落：
  - `onboard_ai_agent/code.html` → `preview_floor_plan/code.html`
  - `onboard_ai_agent/code.html` → `preview_budget/code.html`
  - `preview_floor_plan/code.html` → `onboard_ai_agent/code.html`
  - `preview_floor_plan/code.html` → `preview_budget/code.html`
  - `preview_budget/code.html` → `client_step_4_budget_finalization/code.html`
  - `client_step_4_budget_finalization/code.html` → `budget_document_preview/code.html`
  - `client_step_4_budget_finalization/code.html` → `tender_setting/code.html`
- 已確認 `preview_floor_plan/code.html` header tools dropdown 包含：
  - 平面拼圖 → `./code.html`
  - 預算生成 → `../preview_budget/code.html`
  - LiDAR 下載鏈接 → App Store search
  - iScanner 鏈接 → App Store search
- 已確認 `laibe_landing_desktop/code.html` 中仍有 `href="#"`：
  - 業主入口
  - 設計師/承包商入口
  - 工具 02 預算生成
- 已確認 `client_step_4_budget_finalization/code.html` 中仍有 `href="#"`：
  - 合約生成
  - PCM治理
  - 多個 `[工法書]`
- 已確認 `budget_document_preview/code.html` 與 `client_awarding_dashboard/code.html` 仍有多個 `href="#"` 導覽或 footer link。
- 已確認相對路徑型主流程連結目前沒有掃到 missing target。

#### Progress bar 檢查

- `preview_floor_plan/code.html` 的 progress bar 已從 header 拆出為 header 下方獨立 banner。
- `preview_floor_plan/code.html` 三個節點皆可點：
  - 需求整理 → `../onboard_ai_agent/code.html`
  - 平面拼圖 → `./code.html`
  - 預算生成 → `../preview_budget/code.html`
- `preview_floor_plan/code.html` 目前節點為「平面拼圖」，狀態合理。
- `preview_budget/code.html` 目前是 header 內非 clickable stepper，尚未對齊平面拼圖頁的獨立 progress banner 規則。
- `onboard_ai_agent/code.html` 與 dashboard 候選頁尚未看到同一套 progress bar。

#### Back button 檢查

- 本輪掃描未發現主流程頁使用 `history.back()`。
- `preview_floor_plan/code.html` 的「返回上一頁」使用固定路徑 `../onboard_ai_agent/code.html`。
- 固定返回目的在目前 static MVP 合理，原因是平面拼圖頁是從需求整理頁進入，固定回需求整理比瀏覽器 history 更可預期。
- `client_step_4_budget_finalization/code.html` 的「返回平面配置」是 button，靜態掃描未看到 href 或 onclick，需後續確認或修正。
- `budget_document_preview/code.html` 的「返回預算總覽」是 button，靜態掃描未看到 href 或 onclick，需後續確認或修正。

#### 已知風險

- 主流程目前不是完整 `landing → onboarding → plan-puzzle → budget-system → dashboard`，比較準確是 `landing 部分工具入口 → plan-puzzle`、`onboarding → plan-puzzle / budget-system`、`budget-system → budget finalization / budget document`。
- Header tools 只在平面拼圖頁完整符合四項工具要求；landing / onboarding / budget / dashboard 頁尚未完全一致。
- 多個 `href="#"` 屬已確認 dead CTA 或 placeholder CTA，若顯示為正式功能會造成 Reviewer 退回風險。
- 多個可點 button 在靜態掃描中沒有 href / onclick / id / data wiring hint；其中一部分可能是 mock UI 或 JS 綁定不足，需逐頁處理，不應一次全站重構。
- LiDAR / iScanner 目前仍是 App Store search URL，不是指定官方 App 深連結。

#### 是否 ready for phase review

- Conditional ready。
- 本輪驗收資料已足夠交給 LAIBE_REVIEWER 後續主動審查，但結論應標示為「可審查，不等於 routing 全通過」；建議後續主動審查聚焦 landing → onboarding、budget-system → dashboard、後段舊 header、`href="#"` 與 orphan dashboard 候選頁。

---

## 平面拼圖 Builder 成果

### 完成事項

- 已把 LaiBE MVP 靜態網站中的平面拼圖頁從 room-based prototype 轉為 Plancraft+ wall-first 工具頁。
- 已建立 Plancraft+ Import Interface：JPG / JPEG / PNG 可作為 underlay，PDF 目前只建立匯入接口與明確提示，尚未預覽。
- 已建立比例校正：兩點校正、輸入已知 mm 長度、計算 `pxPerMm`。
- 已建立 Wall Segment Editor：手動畫牆、mm 座標、`existing / new / demolished`、`thickness`、endpoint snap、水平 / 垂直輔助、選取 / 編輯 / 刪除。
- 已建立 Wall Graph Cleanup：`wallGraph.nodes`、`wallGraph.issues`，支援 `nearby-endpoints`、`wall-intersection`、`overlapping-walls`、`wall-too-short`、`zero-length-wall`，並可整理 30mm 內端點。
- 已建立 Wall Split / Node Graph：`nodeGraph.nodes`、`nodeGraph.edges`，可選取 `wall-intersection` issue 後手動切分 T 字 / 十字交會牆段。
- 已建立 Opening Editor：`openings` 依附 `nodeGraph.edges`，支援 `door / window / opening`、`offset`、`width`、基本 `swing`、`sillHeight`、`height`。
- 已讓 openings 可顯示在 SVG layer、可選取、可編輯、可刪除，並可匯出到 Plancraft+ draft JSON。
- 已保留 `plancraftBridge` placeholder，尚未接 Plancraft DSL / renderer / `.pc` converter。
- 已保留 Import Interface、Wall Segment Editor、Wall Graph、Node Graph、Opening Editor 在同一個 LaiBE 網站工具頁內，不是獨立 Vite / React app。

### 修改檔案

- `src/stitch_laibe_landing_onboarding/preview_floor_plan/code.html`
- `src/stitch_laibe_landing_onboarding/preview_floor_plan/plan-puzzle.js`
- `docs/NEXT_CODEX_HANDOFF.md`
- `docs/CURRENT_PHASE_REVIEW_PACKET.md`

### 新增檔案

- `src/stitch_laibe_landing_onboarding/preview_floor_plan/plan-puzzle.js`：目前在 git status 中仍可能是未追蹤檔案，但它是平面拼圖互動邏輯的主要 JS。
- `docs/CURRENT_PHASE_REVIEW_PACKET.md`：目前在 git status 中顯示為未追蹤，這次只補充本聊天室 plan-puzzle 範圍。
- 未新增 `package.json`、`node_modules`、React / Vite / TypeScript 工程、`apps/laibe-plan-puzzle`。

### 未完成事項

- 尚未支援 PDF 直接預覽、PDF 校正、PDF 轉圖或 PDF 轉牆。
- 尚未支援圖片 / OCR / AI 自動轉牆。
- 尚未接 Plancraft DSL、renderer、`.pc` 匯入或 `.pc` 匯出。
- 尚未做 Plancraft Bridge `.pc` Converter。
- 尚未做 zone 自動封閉、room label、room 面積計算。
- 尚未做 furniture placement。
- 尚未做 opening overlap 檢查、同一 edge 多 opening 排列檢查、端點留邊規則與施工圖等級門窗符號。
- 尚未更新 budget-system adapter 來吃新版 Plancraft+ wall/nodeGraph/openings draft JSON。
- 尚未做雲端儲存、登入、後端 API、資料庫或付款串接。

### Plan-puzzle 資料影響

- 現在的核心資料方向是 `wall-first`，不是 `room block`。
- `project.version` 已推進到 `0.5.0-opening-editor`。
- `project.importSource` 記錄來源檔案資訊；JPG / JPEG / PNG 會建立 underlay，PDF 僅記錄接口狀態。
- `project.underlay` 存底圖 dataUrl、位置、scale、rotation、opacity 與校正資訊。
- `project.scale.pxPerMm` 是畫布 px 與 mm 的比例基準。
- `project.walls` 是可編輯牆段，座標使用 mm，並帶有 `status / thickness / structural / layer`。
- `project.wallGraph` 是檢查層，負責 nodes / issues 與端點整理提示。
- `project.nodeGraph` 是切分後的節點 / 邊結構，負責 `nodes` 與 `edges`，後續 openings 與 Plancraft Bridge 應以它為主要依附基準。
- `project.openings` 目前依附 `nodeGraph.edges`，包含 `edgeId / sourceWallId / kind / offset / width / swing / sillHeight / height`。
- `project.zones` 與 `project.furniture` 仍保留為空陣列，尚未實作。
- `project.plancraftBridge.status` 仍是 `not_ready`，表示尚未轉為 Plancraft `.pc`。
- 匯出的 JSON 是 LaiBE / Plancraft+ draft，不是 `.pc`。

### Plan-puzzle 與 budget-system 的輸出銜接

- 目前 budget-system 的 preview-floor-plan adapter 仍偏向 legacy room draft / mock layout shape。
- 新版 Plancraft+ draft 已轉為 `walls / wallGraph / nodeGraph / openings`，budget-system 尚未正式接上。
- 後續若要進入預算生成，應新增或更新 adapter，把 Plancraft+ draft 轉成 budget engine 可吃的 `Project / Space / LayoutObject / QuantityFact`。
- 面積、房間、區域、拆除 / 新作牆、門窗開口、牆厚與 openings 將會影響預算數量推導，但目前尚未完成正式 mapping。
- 在 adapter 更新前，不應假設 preview_floor_plan 的新版 JSON 已可直接作為正式預算依據。

### 風險

- `file://` 真實瀏覽器 console error 尚未由 Codex in-app browser 驗證；該工具曾拒絕開啟 `file://` URL。
- 目前幾何能力仍是 MVP，不是 CAD 等級拓撲系統。
- Wall split 支援 T 字 / 十字交會，但不處理所有斜牆與複雜 CAD cases。
- Opening Editor 已可建立 openings，但缺少 opening overlap、端點留邊、符號精修與多 opening 排列檢查。
- `underlay.dataUrl` 會讓匯出 JSON 變大。
- `plancraftBridge` 目前只是 placeholder，尚未驗證 `.pc` schema mapping。
- budget-system adapter 尚未更新，因此新版 plan-puzzle draft 與預算引擎仍有資料落差。
- `plan-puzzle.js` 與 `docs/CURRENT_PHASE_REVIEW_PACKET.md` 可能仍是 git 未追蹤狀態，phase review 前需要確認納入版本控制策略。

### 是否 ready for phase review

是，帶條件進入 phase review。

- 本聊天室負責的 plan-puzzle / 平面拼圖 / Plancraft+ draft model 階段成果已足夠進入 phase review。
- Review 時應特別檢查 wall-first 資料模型、nodeGraph / openings 結構、Plancraft Bridge 尚未實作、以及 budget-system adapter 尚未銜接的風險。
- 不應把目前成果視為正式施工圖工具或正式 `.pc` converter。

### 本輪補交：plan-puzzle 最新輸出模型與 budget adapter 銜接狀態

本補交以目前 `project.version = "0.10.0-renderer-preview-spike"` 的 plan-puzzle 狀態為準。上方早期 `0.5.0-opening-editor` 或「Plancraft Bridge 尚未實作」等敘述屬歷史階段紀錄；Reviewer 後續主動審查判讀 plan-puzzle / budget adapter 銜接時，請以本補交段落為最新狀態。

#### 完成事項

- 最新 Plancraft+ draft 已維持 wall-first 模型，並保留 Import Interface、Wall Segment Editor、Wall Graph Cleanup、Wall Split / Node Graph、Opening Editor、Zone Label、Zone Boundary、`.pc` Converter Spike、DSL Validation Spike、Renderer Preview Spike。
- `wallGraph` 已作為診斷 / cleanup 層，包含 endpoint / intersection nodes、issues 與 `lastBuiltAt`。
- `nodeGraph` 已作為較乾淨的牆段節點圖，包含 mm 座標 `nodes` 與 `edges`，並成為 openings 與 zone boundary 的依附基準。
- `openings` 已可依附 `nodeGraph.edges`，支援 `door / window / opening`、`offset`、`width`、`swing`、`sillHeight`、`height`。
- `zones` 已可存手動空間標籤與手動 boundary，包含 `labelPosition`、`boundaryEdgeIds`、`boundaryWallIds`、`polygon`、`boundaryStatus`、`boundaryIssues`。
- Plancraft+ draft JSON 匯出仍是目前最完整的 plan-puzzle 輸出，檔名為 `laibe-plancraft-plus-draft.json`。
- `.pc` converter 已存在，但僅為 spike / proof-of-concept；可輸出 `laibe-plancraft-plus-spike.pc` 與 Converter Report，不是 production converter。

#### 修改檔案

- `docs/CURRENT_PHASE_REVIEW_PACKET.md`
- `docs/NEXT_CODEX_HANDOFF.md`

#### 新增檔案

- 無。

#### 未完成事項

- 尚未建立新版 Plancraft+ draft → budget-system adapter 的正式 mapping。
- 尚未把 `zones` 轉成 budget-system 可正式使用的 `Space` contract。
- 尚未完成 zone polygon 面積計算，因此不可產生正式面積類 `QuantityFact`。
- 尚未把 `openings` 正式轉成門 / 窗 / 開口的 budget quantity facts。
- 尚未定義 `walls / nodeGraph.edges` 如何轉成拆除牆、新作牆、既有牆、牆厚、牆長等 budget quantity facts。
- 尚未建立新版 plan-puzzle 的 budgetable `object / furniture / fixture` 輸出；`project.furniture` 目前仍是空陣列。
- 尚未把 `.pc` converter、DSL validation 或 renderer preview 納入 budget-system 正式輸入。

#### Plan-puzzle 資料影響

- `wallGraph`：目前是檢查與提示層，適合標示端點接近、交會、重疊、短牆與零長牆；不應直接當作 budget-system 數量來源。
- `nodeGraph`：目前是 openings 與 zone boundary 的主要依附基準，可作為未來 adapter 的牆段來源候選，但仍需驗證 graph 清理狀態與 edge 語意。
- `openings`：目前以 mm 儲存 `offset / width` 並依附 `edgeId`；可作為未來門窗數量來源候選，但缺少正式 validation / recipe mapping。
- `zones`：目前代表人工空間標籤與人工 boundary 指定；`polygon` 是 mm 座標，但 `area` 仍為 `null`，因此還不能當作正式預算面積。
- `room`：目前沒有 LaiBE production room model。`.pc` converter spike 會由 closed zone best-effort 產生 Plancraft room，但該 room 是 spike 輸出，不是 budget-system 正式 room contract。
- `object`：目前新版 Plancraft+ page 尚未輸出正式 `LayoutObject` / furniture / fixture；legacy budget mock 的 `objects / layout_objects` 與新版 wall-first draft 尚未對齊。
- `SVG`：目前存在 browser 畫布 SVG layers 與本機 Plancraft renderer preview 指令；SVG 是顯示 / 驗證輔助，不是正式 budget input，也不得被宣稱為施工圖。
- `JSON`：Plancraft+ draft JSON 是目前可進 Reviewer 後續主動審查的主要輸出模型候選。
- `.pc converter`：目前是 `convertPlancraftPlusToPc(project)` spike，輸出 `{ ok, pcText, pcObject, warnings, errors, summary }`；不得視為正式 contract。

#### Spike / Contract 分界

- 暫定 contract 候選：Plancraft+ draft JSON 的 `importSource / scale / underlay / walls / wallGraph / nodeGraph / openings / zones / furniture / plancraftBridge` 結構。
- 暫定 contract 候選：`nodeGraph.edges` 作為 openings 與 `zones.boundaryEdgeIds` 的依附基準。
- 暫定 contract 候選：`zones.boundaryEdgeIds / boundaryWallIds / polygon / boundaryStatus / boundaryIssues` 作為未來 room / budget adapter 的輸入候選。
- Spike：`.pc` converter、DSL validation、renderer preview、sharedWalls 處理、Plancraft CLI compile 流程。
- Spike / display-only：browser SVG layers、Renderer Preview Report、AI 風格示意 / image proxy sandbox / visual simulation state。
- 尚未 contract：budget-system adapter 對新版 Plancraft+ draft 的正式 mapping、room generation、area calculation、furniture / object output、正式 `.pc` round-trip。

#### Budget adapter 銜接狀態

- 目前 `src/lib/budget/adapters/preview-floor-plan-adapter.ts` 仍以 legacy `rooms` 與 `objects / layout_objects` draft shape 為主，會把矩形 room 寬深轉成 `Space`，把 object 轉成 `LayoutObject`。
- 目前 `src/lib/budget/mock/mock-preview-floor-plan-draft.ts` 仍是 room-based mock，包含 `rooms` 與 `objects`；它不是最新 Plancraft+ wall-first draft。
- 最新 Plancraft+ draft 已轉為 `walls / wallGraph / nodeGraph / openings / zones`，budget-system adapter 尚未正式接上。
- 後續 adapter 需要定義：closed `zones` → `Space`、zone polygon → area、`openings` → door/window/opening quantity facts、`nodeGraph.edges` → wall length/status/thickness facts、future furniture/object → `LayoutObject`。
- Adapter 必須保留 deterministic pricing 邊界：plan-puzzle 只能提供可追溯 geometry / layout facts，不得直接產生價格。
- Adapter 必須拒絕或標記 `.pc converter`、renderer preview、visual simulation、underlay image data 等 spike / display-only 欄位，不得把它們當作正式預算來源。

#### 不得宣稱事項

- 不得宣稱 `.pc` converter 已 production-ready。
- 不得宣稱 Plancraft DSL / renderer 已自動驗證使用者目前匯出的 `.pc`。
- 不得宣稱 browser SVG 或 renderer preview SVG 是正式施工圖、CAD 圖、法規圖或正式報價依據。
- 不得宣稱 plan-puzzle 最新 JSON 已被 budget-system adapter 正式支援。
- 不得宣稱 zones 已完成自動封閉、正式 room generation 或面積精算。
- 不得宣稱 openings 已可直接產生正式門窗工項數量。
- 不得宣稱家具 / object placement 已完成。
- 不得宣稱 AI 風格示意、image sandbox 或 underlay image data 會進入正式預算資料。

#### 已知風險

- Phase review packet 前段仍保留歷史 plan-puzzle 記錄，Reviewer 應以本補交段落判斷最新輸出與 budget adapter 缺口。
- `plan-puzzle.js` 與 `docs/CURRENT_PHASE_REVIEW_PACKET.md` 目前可能仍是 git 未追蹤狀態，phase review 前需決定納入版本控制策略。
- 最新 Plancraft+ draft 與 budget adapter 之間仍有明確落差；若直接串接，可能導致錯誤面積、錯誤房間、錯誤門窗數量或錯誤工項推導。

#### 是否 ready for phase review

Yes，ready for user-triggered review 後續主動審查，限「文件與資料邊界」審查。

- 可交 Reviewer 檢查：plan-puzzle 最新輸出模型、spike / contract 分界、budget adapter 缺口與不得宣稱事項。
- 不代表 ready for production。
- 不代表 ready for formal budget-system adapter。
- 不代表 `.pc` converter、renderer preview、room generation、area calculation 已正式完成。

---

### 本輪補交：Plancraft+ → Budget Adapter Contract Spike

本補交回應 LAIBE_REVIEWER 階段總審查指出的缺口：最新版 plan-puzzle / Plancraft+ `wallGraph / nodeGraph / openings / zones / .pc converter spike` 尚未正式對齊 budget-system adapter。本輪已建立 budget adapter contract spike，但仍不是 production adapter，不會產生正式報價。

#### 完成事項

- `preview-floor-plan-adapter.ts` 已可辨識新版 Plancraft+ draft JSON。
- legacy `rooms / objects / layout_objects` draft path 已保留，既有 room-based mock demo 仍可執行。
- Plancraft+ path 會輸出 `productionReady: false`，並標示 `adapterMode: "plancraft_plus_spike"`。
- `zones` 會映射為 `Space` candidate，保留 `zone.id`、`name`、`type`、`labelPosition`、`boundaryEdgeIds`、`boundaryWallIds`、`polygonPointCount`、`boundaryStatus` 與 `boundaryIssues`。
- `nodeGraph.edges` 會映射為 wall length candidate `QuantityFact`，fact type 依 `status` 產生：
  - `existing_wall_length_candidate`
  - `new_wall_length_candidate`
  - `demolished_wall_length_candidate`
- `openings` 會映射為 opening candidate `QuantityFact`：
  - `door_opening_count`
  - `window_opening_count`
  - `wall_opening_count`
- Plancraft+ path 不產生正式 `LayoutObject`，`layoutObjects` 維持空陣列。
- `.pc` converter output、SVG / renderer preview、AI visual sandbox、underlay image data 都不作為 budget input。
- 已加入 adapter warnings / unsupported mechanism，以明確阻擋 production claim。

#### 修改檔案

- `src/lib/budget/adapters/preview-floor-plan-adapter.ts`
- `src/lib/budget/types.ts`
- `docs/CURRENT_PHASE_REVIEW_PACKET.md`
- `docs/NEXT_CODEX_HANDOFF.md`

#### 新增檔案

- 無。

#### 未完成事項

- 尚未建立 production-ready Plancraft+ budget adapter。
- 尚未把 `zones` 轉成正式 room generation。
- 尚未正式計算 zone polygon 面積、坪數、地坪、天花或牆面數量。
- 尚未把 openings 轉成正式門窗工項或材料數量。
- 尚未把 wall facts 接入正式拆除牆 / 新作牆 / 既有牆 recipes。
- 尚未支援 Plancraft+ furniture / fixture / object placement。
- 尚未建立 `.pc` output 或 SVG renderer preview 到 budget-system 的任何正式銜接。
- 尚未把 Plancraft+ candidate facts 餵入 `generateBudgetEstimate()` 產生正式 estimate。

#### Plan-puzzle 資料影響

- 最新主要 budget input 候選是 Plancraft+ draft JSON，不是 `.pc`、SVG 或 renderer preview。
- `zones` 目前只能成為 `Space` candidate，不能視為 production room。
- `zone.area` 仍多為 `null`；若 `polygon` 存在但 `area` 為 `null`，adapter 只標示 `areaStatus: "not_calculated"`，不產生正式面積 quantity。
- `nodeGraph.edges` 可成為 wall length candidate，保留 `status / thickness / structural / sourceWallId / from / to`，但不能直接產生拆除或新作牆工項。
- `openings` 可成為 opening count candidate，保留 `edgeId / sourceWallId / width / offset / height / sillHeight / swing`，但不能直接產生正式門窗工項。
- `furniture` / `object placement` 目前 unsupported；新版 Plancraft+ 不產生 budgetable `LayoutObject`。

#### Spike / Contract 分界

- 暫定 contract：adapter 可辨識 `product: "Plancraft+"`、`nodeGraph.edges`、`openings`、`zones`、`plancraftBridge`。
- 暫定 contract：Plancraft+ adapter output 包含 `source: "plancraft_plus_draft"`、`version`、`productionReady: false`、`spaces`、`quantityFacts`、`layoutObjects: []`、`warnings`、`unsupported`、`provenance`。
- 暫定 contract：candidate facts 必須帶 `authority: "plancraft_plus_draft_spike"` 與 `productionReady: false`。
- Spike：所有 Plancraft+ → budget facts 目前都是 candidate，不是 recipe-ready production facts。
- Spike：`.pc` converter、DSL validation、renderer preview 仍不得視為 budget input 或 production contract。
- Legacy contract：legacy `rooms / objects / layout_objects` adapter path 保留，仍支援既有 mock budget demo。

#### Budget adapter 銜接狀態

- `preview-floor-plan-adapter.ts` 現在有兩條路徑：
  - legacy draft：沿用 `rooms` → `Space`、`objects / layout_objects` → `LayoutObject`。
  - Plancraft+ draft：`zones` → `Space` candidate、`nodeGraph.edges` → wall candidate facts、`openings` → opening candidate facts。
- Plancraft+ output 明確固定 `productionReady: false`，並透過 warnings 阻擋 formal estimate。
- Plancraft+ path 不呼叫 budget engine、不讀 pricing rules、不接 MethodSpecCatalog、不產生 BudgetEstimateLine。
- `.pc` 與 SVG 完全不被 adapter 讀取；adapter 只讀 Plancraft+ draft JSON。
- furniture / object placement 明確列為 unsupported；legacy `layout_objects` 仍只屬 legacy path。

#### Warnings / unsupported

已加入或保留以下 warning codes：

- `plancraft_plus_adapter_spike`
- `plancraft_plus_area_not_calculated`
- `plancraft_plus_openings_candidate_only`
- `plancraft_plus_furniture_not_supported`
- `plancraft_plus_pc_not_budget_input`
- `plancraft_plus_svg_not_budget_input`
- `plancraft_plus_formal_estimate_blocked`
- `plancraft_plus_zone_boundary_not_closed`
- `plancraft_plus_opening_edge_missing`
- `plancraft_plus_edge_length_invalid`

#### 不得宣稱事項

- 不得宣稱 Plancraft+ budget adapter production-ready。
- 不得宣稱 Plancraft+ candidate facts 可直接產生正式報價。
- 不得宣稱 `.pc` converter output 是 budget input。
- 不得宣稱 SVG / renderer preview 是 budget input。
- 不得宣稱 zones 已完成正式 room generation。
- 不得宣稱 zone area 已 production-calculated。
- 不得宣稱 openings 已可直接生成正式門窗工項數量。
- 不得宣稱 furniture / object placement 已支援新版 Plancraft+。

#### 驗收結果

- Legacy demo 已執行：`node --experimental-strip-types src/lib/budget/demo-generate-budget-from-preview-floor-plan.ts`，可正常產生既有 mock estimate。
- Plancraft+ adapter smoke test 已執行：可辨識 Plancraft+ draft，輸出 `source: "plancraft_plus_draft"`、`productionReady: false`、1 個 Space candidate、2 個 QuantityFact candidates、0 個 layoutObjects 與必要 warnings。
- 本輪沒有修改 `C:\laibe_project\plancraft`。
- 本輪沒有新增 `package.json`、`node_modules`、React、Vite 或新 app。

#### 是否 ready for phase review

Yes，ready for user-triggered review，限 adapter contract spike 與 budget 邊界審查。

- 可審查：Plancraft+ draft 是否能被 adapter 安全辨識、candidate mapping 是否清楚、warnings / unsupported 是否足夠、是否保留 legacy path。
- 不可視為：production budget adapter、formal estimate generation、正式 room / area / opening / wall recipe mapping。

---

### 本輪補交：Plancraft+ Budget Adapter Guard Hardening

本補交回應 Reviewer `PASS_WITH_NOTES` 指出的 production blocker：先前 `productionReady: false` 與 `formal_estimate_generation: "blocked"` 主要仍是 metadata / warning；若 downstream 直接把 normalized `project` 丟進 `generateBudgetEstimate()`，仍可能產生 mock estimate。本輪只做 guard hardening，不進入 production adapter，不產生正式估價。

#### 完成事項

- `isPlancraftPlusDraft()` 判斷已收窄，不再只因為資料含 `zones`、`openings` 或 `.pc targetFormat` 就判定為 Plancraft+。
- Plancraft+ detection 現在至少需要：
  - `product === "Plancraft+"`
  - `unit === "mm"`
  - `version` 為字串
  - 存在 `scale`
  - 存在 `plancraftBridge`
  - `plancraftBridge.targetFormat === ".pc"`
  - `nodeGraph.edges`、`zones`、`openings` 至少其中之一為 array
  - `walls` / `furniture` 若存在必須為 array
- Plancraft+ adapter output 新增 machine-readable `formalEstimateGuard`。
- `project.user_requirements.formal_estimate_generation` 已由單純字串升級為 guard object，並保留 `formal_estimate_generation_status: "blocked"` 作最小相容。
- `generateBudgetEstimate()` 入口已新增 guard：若 project 帶 `productionReady === false`、`adapter_mode === "plancraft_plus_spike"` 或 `formal_estimate_generation.status === "blocked"`，會丟出受控 `BudgetEstimateBlockedError`。
- 新增 helper：`isFormalEstimateBlocked(project)` 與 `assertBudgetInputProductionReady(project)`。
- legacy preview-floor-plan demo 仍可走原本 mock estimate。
- Plancraft+ spike normalized output 若嘗試進入 `generateBudgetEstimate()`，會被阻止，reason code 為 `plancraft_plus_formal_estimate_blocked`。

#### 修改檔案

- `src/lib/budget/adapters/preview-floor-plan-adapter.ts`
- `src/lib/budget/types.ts`
- `src/lib/budget/budget-generator.ts`
- `src/lib/budget/demo-generate-budget-from-preview-floor-plan.ts`
- `docs/CURRENT_PHASE_REVIEW_PACKET.md`
- `docs/NEXT_CODEX_HANDOFF.md`

#### 新增檔案

- 無。

#### Guard contract

Plancraft+ path 目前輸出：

```json
{
  "formalEstimateGuard": {
    "blocked": true,
    "status": "blocked",
    "reason": "plancraft_plus_adapter_spike",
    "code": "plancraft_plus_formal_estimate_blocked",
    "message": "Plancraft+ adapter output is candidate-only and cannot enter formal estimate generation.",
    "requiredNextStep": "Production adapter review and quantity contract approval required.",
    "productionReady": false
  }
}
```

#### Budget adapter 銜接狀態

- Plancraft+ draft 仍只產生 candidate `spaces` 與 candidate `quantityFacts`。
- candidate facts 仍固定 `productionReady: false`，不得轉正式 BudgetEstimateLine。
- `.pc` output、SVG / renderer preview、AI visual sandbox 仍完全不作 budget input。
- `furniture` / object placement 仍 unsupported。
- Legacy `rooms / objects / layout_objects` path 保留，不受 Plancraft+ guard 阻擋。

#### 驗收結果

- `node --experimental-strip-types --check src/lib/budget/types.ts` 通過。
- `node --experimental-strip-types --check src/lib/budget/adapters/preview-floor-plan-adapter.ts` 通過。
- `node --experimental-strip-types --check src/lib/budget/budget-generator.ts` 通過。
- `node --experimental-strip-types --check src/lib/budget/demo-generate-budget-from-preview-floor-plan.ts` 通過。
- `node --experimental-strip-types src/lib/budget/demo-generate-budget-from-preview-floor-plan.ts` 通過，legacy mock estimate 仍產生，Plancraft+ guard smoke 顯示 blocked。
- inline smoke test 通過：未知資料若只有 `zones / openings` 不會被誤判為 Plancraft+。

#### 不得宣稱事項

- 不得宣稱 Plancraft+ budget adapter 已 production-ready。
- 不得宣稱 Plancraft+ candidate facts 可進正式報價。
- 不得宣稱 `.pc` / SVG / renderer preview 是 budget input。
- 不得宣稱 zones 已完成正式 room generation 或 production area calculation。
- 不得宣稱 openings 已可直接生成正式門窗工項。
- 不得宣稱本輪已完成 Excel / PDF / DB migration / AI API / payment flow。

#### 未完成事項

- 尚未建立 production adapter 設計文件。
- 尚未完成 zone area / boundary refinement。
- 尚未把 Plancraft+ wall / opening / zone candidate facts 映射到正式 MethodRecipe / QuantityFact contract。
- 尚未允許 Plancraft+ path 進入 formal estimate generation。

#### 是否 ready for phase review

Yes，可供使用者主動觸發 User-triggered Review，審查重點是 guard 是否足以阻止 Plancraft+ spike 被 downstream 誤用為正式 budget input。

---

### 本輪修正：Plancraft+ Budget Adapter Guard Hardening - Required Fix

本輪回應 Reviewer `NEEDS_CHANGES`：`normalizeFloorPlanToBudgetInput(null)` 會在 `isPlancraftPlusDraft()` 讀取 `product` 時發生 TypeError。此修正只處理 null / undefined / malformed input 不應 crash 的 blocker，不擴大為 production adapter。

#### 完成事項

- 已在 `preview-floor-plan-adapter.ts` 加入最小 object guard：`isRecord(value)`。
- `isPlancraftPlusDraft()` 現在會先確認 input 是非 array object；`null`、`undefined`、primitive、array 都不會被判定為 Plancraft+。
- 新增 legacy room shape guard：只有具備合法 `name` 與有效 `rooms[]` room 欄位時，才走 legacy adapter path。
- `normalizeUnsupportedFloorPlanInput()` 已可接收 `unknown`，對 `null / undefined / primitive / malformed object` 回傳受控 `unknown_floor_plan_draft` output。
- unknown / malformed input 仍帶 `productionReady: false` 與 blocked formal estimate guard，不會進 formal estimate path。
- 已補 smoke cases：`null_input`、`undefined_input`、`string_input`、`zones_only`、`pc_only`、`valid_plancraft_plus`、`legacy_input`。

#### 修改檔案

- `src/lib/budget/adapters/preview-floor-plan-adapter.ts`
- `src/lib/budget/demo-generate-budget-from-preview-floor-plan.ts`
- `docs/CURRENT_PHASE_REVIEW_PACKET.md`
- `docs/NEXT_CODEX_HANDOFF.md`

#### 新增檔案

無。

#### 驗收結果

- `node --experimental-strip-types --check src/lib/budget/adapters/preview-floor-plan-adapter.ts` 通過。
- `node --experimental-strip-types --check src/lib/budget/demo-generate-budget-from-preview-floor-plan.ts` 通過。
- `node --experimental-strip-types src/lib/budget/demo-generate-budget-from-preview-floor-plan.ts` 通過。
- inline smoke test 通過：`null_input`、`undefined_input`、`string_input` 不 crash；`zones_only`、`pc_only` 不誤判 Plancraft+；valid Plancraft+ 仍被辨識且被 `plancraft_plus_formal_estimate_blocked` 阻止；legacy input 仍可走既有 mock estimate。

#### 未完成事項

- 仍不是 production adapter。
- 仍不得讓 Plancraft+ candidate facts 進正式估價。
- 仍不得把 `.pc` / SVG / renderer preview 當 budget input。
- 仍需後續由使用者視需要交給 LAIBE_REVIEWER 做 re-check。

#### 是否 ready for phase review

Yes，可供後續 Reviewer re-check。此段只修正 required blocker，不代表 Plancraft+ adapter production-ready。

---

### 本輪文件設計：Plancraft+ Production Adapter Design Doc

本輪跳過 Reviewer Re-check，直接補齊 Plancraft+ production budget adapter 的正式設計文件。本輪只做文件與 contract planning，沒有 production implementation，也沒有解除任何 formal estimate guard。

#### 完成事項

- 已新增 `docs/budget/plancraft-plus-production-adapter-design.md`。
- 已明確定義 Plancraft+ production adapter 的目標：把已驗證的 wall-first draft JSON 轉成 budget-system 可追溯、可審查、可由 deterministic engine 使用的 production input。
- 已明確標記目前仍不是 production adapter：現有 adapter 仍是 spike，`productionReady` 仍必須為 `false`，`formal_estimate_generation` 仍必須 blocked。
- 已定義 production input contract：`product === "Plancraft+"`、`unit === "mm"`、version range、scale calibrated、valid `nodeGraph.edges`、closed zone boundary、valid polygon、valid openings、wall status/provenance。
- 已定義 forbidden input：`.pc` converter output、SVG、renderer preview、underlay image data、AI style visual preview 不得作為 budget input。
- 已定義 zones → production `Space` 的條件，以及何時仍只能是 candidate。
- 已定義 polygon shoelace area policy、mm2 → m2 → 坪轉換、precision / rounding policy 與正式面積禁用條件。
- 已定義 `nodeGraph.edges` → wall fact contract，包含 existing / new / demolished、length、thickness、structural、sourceWallId、edgeId、from / to、reviewer confirmation 條件。
- 已定義 openings → door / window / opening fact contract，包含 edgeId、offset、width、height、sillHeight、swing、validation rules 與 candidate 條件。
- 已定義 furniture / object future contract，但明確標記目前 unsupported，不能產生 production `LayoutObject`。
- 已定義 guard model：`productionReady`、`adapterMode`、`formalEstimateGuard`、candidate vs production、provenance、unsupported、warnings、blocked reason codes。
- 已定義 reviewer gates 與 downstream safety：`generateBudgetEstimate()` 只能接受 production-ready input，candidate facts 與 spike input 必須被拒，Excel / PDF writer 只能讀 snapshot。
- 已定義 migration plan：P1 Design Doc、P2 Zone Area / Boundary Refinement、P3 Production Quantity Fact Contract、P4 Reviewer-gated Production Adapter、P5 Formal Estimate Dry-run、P6 Excel / PDF Writer Integration。

#### 修改檔案

- `docs/CURRENT_PHASE_REVIEW_PACKET.md`
- `docs/NEXT_CODEX_HANDOFF.md`

#### 新增檔案

- `docs/budget/plancraft-plus-production-adapter-design.md`

#### 未修改檔案

- `C:\laibe_project\plancraft`
- `src/stitch_laibe_landing_onboarding/preview_floor_plan/plan-puzzle.js`
- `src/stitch_laibe_landing_onboarding/preview_floor_plan/code.html`
- `src/lib/budget/adapters/preview-floor-plan-adapter.ts`
- `src/lib/budget/types.ts`
- `src/lib/budget/budget-generator.ts`
- `src/lib/budget/demo-generate-budget-from-preview-floor-plan.ts`

#### 未完成事項

- 尚未實作 production adapter。
- 尚未解除 Plancraft+ spike guard。
- 尚未做 Zone Area / Boundary Refinement。
- 尚未做 Production Quantity Fact Contract。
- 尚未做 Reviewer-gated Production Adapter。
- 尚未做 formal estimate dry-run。
- 尚未接 Excel / PDF writer。

#### 已知風險

- 設計文件已定義 production gate，但 runtime 仍停留在 spike guard hardening 狀態。
- 若下游繞過 `generateBudgetEstimate()` guard 或自行讀 candidate facts，仍可能誤用資料；後續 production implementation 必須補 validator 與 contract tests。
- `.pc` converter、DSL validation、renderer preview 仍是 spike / report，不得當作 production budget source。

#### 是否 ready for phase review

- 可供後續使用者主動觸發審查。
- 本輪文件本身可審查，但不代表 Plancraft+ production adapter 已可施工或已通過 production gate。

---

## 預算生成 Builder 成果（Budget / specDB / Method-spec）

### 完成事項

- Phase 1 建立 local deterministic mock budget engine，可由 mock layout 產生 `BudgetEstimate` JSON。
- Phase 1 資料流已建立：`LayoutObject -> QuantityFact -> MethodRecipe -> QuoteItemTemplate -> BudgetEstimateLine -> BudgetEstimate`。
- 每筆 `BudgetEstimateLine` 保留 `source_type`、`source_id`、`recipe_id`、`quantity_formula`、`price_source`、`confidence`、`requires_review`。
- Phase 2 建立 `preview_floor_plan` / 平面拼圖 draft adapter，將半真實 draft JSON normalize 成 budget engine 可吃的 `Project`、`Space`、`LayoutObject`。
- Phase 2.5 建立 local TypeScript / in-memory budget warehouse foundation，分出 Catalog Data、Project Data、Estimate Data，並建立 repository interface、seed catalog 與 catalog validation。
- Phase 2.6 原 catalog intake prototype 已暫停；後續不得繼續擴張舊 `src/lib/budget/intake/`，除非使用者重新定義。
- Phase 2.7 建立「配件倉庫：工法與規格系統」，包含 `MethodSpecCatalog`、`MaterialSpec`、`LaborRule`、`NoteTemplate`、`UnitConversion`、`InclusionExclusionRule`、`ItemMaterialBinding` 前置基礎。
- Phase 2.8 建立「成品物流：預算表單輸出系統」，輸出 `customer_view`、`internal_view`、totals、warnings 與 JSON rows，不做 Excel / PDF。
- Phase 2.9 完成 MaterialSpec 對齊與 `BudgetOutputSnapshot` contract，讓 material_code 從 MethodSpecCatalog binding 解析，不再 hardcode 在 output layer。
- Phase 2.9.1 加固 snapshot contract：top-level required field checks、`estimate_stage`、invalid snapshot 不 throw、material binding review warning。
- Phase 2.9.2 建立 renderer gate 與 legacy output guard：`assertSnapshotRenderable()` fresh validate snapshot，`formatBudgetOutput()` 標記為 legacy debug-only。
- Phase 2.9 與 Phase 2.9.2 User-triggered Review result 結論皆為 `PASS_WITH_NOTES`，可有條件進入 Excel/PDF renderer skeleton，但 renderer 必須只讀 `BudgetOutputSnapshot`。

### 修改檔案

- `docs/budget/11-data-warehouse.md`
- `docs/budget/12-catalog-intake-classification.md`
- `docs/budget/13-three-warehouse-architecture.md`
- `docs/budget/14-method-spec-warehouse.md`
- `docs/budget/15-budget-output-logistics.md`
- `docs/budget/16-budget-output-snapshot-and-material-alignment.md`
- `docs/budget/17-contract-hardening-2.9.1.md`
- `docs/budget/18-renderer-gate-and-legacy-output-guard.md`
- `docs/NEXT_CODEX_HANDOFF.md`
- `src/lib/budget/types.ts`
- `src/lib/budget/budget-generator.ts`
- `src/lib/budget/format-budget-output.ts`
- `src/lib/budget/mock/mock-quote-item-templates.ts`
- `src/lib/budget/mock/mock-method-recipes.ts`
- `src/lib/budget/mock/mock-pricing.ts`
- `src/lib/budget/specs/types.ts`
- `src/lib/budget/specs/seed-method-spec-catalog.ts`
- `src/lib/budget/specs/validate-method-spec-catalog.ts`
- `src/lib/budget/output/types.ts`
- `src/lib/budget/output/budget-line-enricher.ts`
- `src/lib/budget/output/budget-output-validator.ts`
- `src/lib/budget/output/demo-budget-output-logistics.ts`
- `src/lib/budget/output/demo-budget-output-snapshot.ts`

### 新增檔案

- `src/lib/budget/mock/mock-layout.ts`
- `src/lib/budget/mock/mock-preview-floor-plan-draft.ts`
- `src/lib/budget/quantity-takeoff.ts`
- `src/lib/budget/recipe-matcher.ts`
- `src/lib/budget/demo-generate-budget.ts`
- `src/lib/budget/demo-generate-budget-from-preview-floor-plan.ts`
- `src/lib/budget/adapters/preview-floor-plan-adapter.ts`
- `src/lib/budget/storage/budget-catalog.ts`
- `src/lib/budget/storage/budget-project-store.ts`
- `src/lib/budget/storage/budget-estimate-store.ts`
- `src/lib/budget/storage/budget-repository.ts`
- `src/lib/budget/storage/in-memory-budget-repository.ts`
- `src/lib/budget/storage/validate-budget-catalog.ts`
- `src/lib/budget/storage/seed-budget-catalog.ts`
- `src/lib/budget/demo-load-budget-warehouse.ts`
- `src/lib/budget/intake/types.ts`
- `src/lib/budget/intake/mock-raw-catalog-sources.ts`
- `src/lib/budget/intake/source-collector.ts`
- `src/lib/budget/intake/catalog-classifier.ts`
- `src/lib/budget/intake/catalog-normalizer.ts`
- `src/lib/budget/intake/catalog-review-queue.ts`
- `src/lib/budget/intake/catalog-publisher.ts`
- `src/lib/budget/intake/demo-catalog-intake.ts`
- `src/lib/budget/specs/method-spec-repository.ts`
- `src/lib/budget/specs/in-memory-method-spec-repository.ts`
- `src/lib/budget/specs/build-budget-catalog-from-method-spec.ts`
- `src/lib/budget/specs/demo-method-spec-warehouse.ts`
- `src/lib/budget/specs/item-material-binding.ts`
- `src/lib/budget/output/budget-sheet-formatter.ts`
- `src/lib/budget/output/budget-output-exporter.ts`
- `src/lib/budget/output/material-code-resolver.ts`
- `src/lib/budget/output/budget-output-snapshot.ts`
- `src/lib/budget/output/budget-output-repository.ts`
- `src/lib/budget/output/in-memory-budget-output-repository.ts`
- `src/lib/budget/output/renderer-gate.ts`
- `src/lib/budget/output/demo-renderer-gate.ts`

### 未完成事項

- 尚未做正式資料庫 migration；目前 repository 都是 local TypeScript / in-memory prototype。
- 尚未接 RAG、AI API、Skills、外部網站爬取、真實材料價格或真實廠商報價。
- 尚未做正式報價、Excel、PDF、合約、付款、escrow、listing fee 或 fund release。
- Phase 2 preview-floor-plan adapter 仍以 mock draft / legacy room draft shape 為主，尚未對齊最新 Plancraft+ wall/nodeGraph draft JSON。
- Bathroom wall tile / floor tile quantity 仍是 mock per-bathroom scope，尚未改成面積或牆面量體。
- `src/lib/budget/intake/` 舊 Phase 2.6 prototype 已暫停，需待未來重構成 Raw Candidate Warehouse 才能繼續。
- Renderer skeleton 尚未建立；進入 Excel/PDF 前需新增 import denylist 與 snapshot-only renderer entry。

### Budget / specDB 影響

- budget-system 已有 deterministic local prototype，可從 mock layout 或 normalized preview floor plan input 產生 traceable `BudgetEstimate`。
- specDB / method-spec 已以 `MethodSpecCatalog` 形式建立本地資料契約，包含 approved recipes、material specs、labor rules、note templates、unit conversions、inclusion/exclusion rules、pricing rules 與 item-material bindings。
- quote / estimate output 已分成 `BudgetEstimate`、`BudgetSheetOutput`、`BudgetOutputSnapshot` 三層；未來 Excel / PDF renderer 應讀 snapshot，不可重跑 engine。
- material_code 只作規格追溯，不可改價格；價格仍由 deterministic pricing rules / seed catalog 產生。
- customer output 與 internal trace output 已分離：客戶版不應含 `source_id`、`recipe_id`、`quantity_formula`、`internal_note`、`material_code` 等內部欄位。
- plan-puzzle 到 budget-system 的銜接已由 adapter prototype 處理 px-to-cm normalization，不讓 budget engine 直接吃 px。

### 風險

- 目前所有單價仍是 seed/mock pricing，不是正式價格，不可被視為正式報價。
- Phase 2 adapter 尚未跟最新 Plancraft+ wall-first draft shape 完全對齊，未來 Phase 3 需要更新 adapter。
- `formatBudgetOutput()` 雖已標記 legacy debug-only，但仍保留給 Phase 1 demo；未來 renderer skeleton 需禁止 import。
- `validateBudgetOutputSnapshot()` 可透過 methodSpecCatalog 做 material binding warning；未來若 renderer 要嚴格 snapshot-only，需決定是否拆出 snapshot-only validation mode。
- 成品物流中 note / assumption / risk 文案有少量重複，已知可後續整理，但不阻擋 contract review。
- 目前 review status 是 prototype warning / requires_review，不代表人工審核流程已完成。

### 是否 ready for phase review

Yes.

原因：

- Phase 1 至 Phase 2.9.2 的 budget-system / specDB / method-spec / output contract 已整理到本 packet。
- 已明確標示哪些資料是 mock、哪些不得作正式價格、哪些不得進 Excel / PDF 前繞過 snapshot。
- 已完成兩輪 User-triggered Review result，核心 contract 為 `PASS_WITH_NOTES`，可進階段總審查。

---

## LAIBE_VISUAL_SIM 成果

### 完成事項

- 建立 LAIBE_VISUAL_SIM 角色規則。
- 建立 LAIBE_VISUAL_SIM 任務模板。
- 建立 LAIBE_VISUAL_SIM 聊天室指引。
- 建立 project-local skill-style 指引。
- 完成 Plancraft+ Visual Simulation Task Preview MVP 的視覺邊界整理與審查輸入。
- 明確定義 Visual Simulation Panel 只能作為案件上架與風格溝通輔助，不是正式 AI 生圖、施工圖或設計圖。
- 明確定義 Plancraft+ 平面拼圖頁中的「AI 風格示意」應顯示 task status、visual brief、style tags、prompt preview、placeholder visual card 與 disclaimer。
- 已確認示意圖相關 UI 不應寫入 `walls`、`openings`、`zones`、`scale` 或 `plancraftBridge`，只可作為風格視覺化層。
- 已完成 LAIBE_REVIEWER 對 Visual Simulation Panel / Prompt Preview / Placeholder Visual Card / Disclaimer / `styleVisualRequest` / `styleVisualTask` 的邊界審查，結論為 `PASS_WITH_NOTES`。

### 產出素材 / prompt

- 本階段未產出真實圖片檔，未生成 AI 圖片，未接 image generation API。
- 本階段產出的是網站建構用 visual brief / prompt preview / asset spec，可供 Builder 與 Reviewer 檢查使用。
- Prompt Preview 範例：

```text
客廳，奶油風 + 古典風，米白暖色調，柔和自然光，大理石 + 溫潤木質，作為裝修競標案件的風格示意圖。
```

- Visual Brief 範例：

```text
客廳以奶油風為主軸，加入古典風的線條與比例感；整體維持米白暖色，搭配大理石 + 溫潤木質，呈現中高階但克制的案件上架風格參考。
```

- Style tags / asset spec：
  - 空間類型：客廳
  - 主要風格：奶油風
  - 次要風格：古典風
  - 色調：米白暖色
  - 材質語彙：大理石 + 溫潤木質
  - 預算感：中高階
  - 用途：`bid-listing-style-reference`
- Placeholder visual card spec：
  - 類型：AI 示意圖預覽卡
  - 視覺：深色工具頁中的克制暖色 interior placeholder，不使用真實照片
  - 必備標示：`示意圖`、`非正式圖片`
  - 必備內容：空間類型、style tags、簡短 visual brief、sample prompt text、disclaimer badge
- 建議未來素材命名：
  - `laibe_visual_sim_plan_puzzle_style_preview_cream_classic_v01.png`
  - 僅供未來真實 image generation spike 或網站素材管理參考，目前沒有此實體檔案。

### 對應網站位置

- 頁面：`src/stitch_laibe_landing_onboarding/preview_floor_plan/code.html`
- JS：`src/stitch_laibe_landing_onboarding/preview_floor_plan/plan-puzzle.js`
- 位置：Plancraft+ 平面拼圖頁右側 Inspector 下方的 `AI 風格示意` panel。
- 用途：讓使用者在輸入風格需求後，看見案件示意方向正在被整理，包含 task status、prompt preview、visual brief、style tags 與 placeholder visual card。
- 邊界：此 panel 是 Plancraft+ 工具頁內的 visual simulation layer，不是 Plancraft core，不是 geometry editor，不是正式圖片生成器。

### 不可宣稱事項

- LAIBE_VISUAL_SIM 產出不等於網站已整合。
- 模擬圖僅供案件上架與風格溝通輔助。
- 不得宣稱為施工圖。
- 不得宣稱為正式設計圖。
- 不得宣稱為真實案例。
- 不得作為正式報價依據。
- 不得宣稱為完工保證。
- 不得宣稱為竣工圖、法規圖、精準尺寸圖或材料品牌承諾。
- 不得宣稱符合消防、建築、結構或施工規範。
- 不得宣稱 AI 已完成正式設計或已產出 production asset。

### 風險

- 後續若 Visual Sim 產出素材並交給 Builder 整合，需由 LAIBE_REVIEWER 檢查是否有誤導風險。
- 若下一步進入 Image Generation API Integration Spike，必須重新檢查 API key 管理、prompt injection、user uploaded reference image、圖片版權、真實案例誤導、過度商業宣稱與正式案件資料污染風險。
- 生成圖或 placeholder 不得寫入 Plancraft+ `walls`、`openings`、`zones`、`scale`、`plancraftBridge` 或預算正式資料。
- `ready` / `MOOD READY` 類狀態文案可能讓使用者誤以為正式圖片已完成；若接真 API，建議改為更保守的「示意方向已建立」或加強 `非正式圖片` 標示。
- 若未來支援使用者上傳參考圖，必須明確告知是否會送第三方模型，不得默默上傳私人住宅圖。

### 是否 ready for phase review

Yes, with notes.

原因：

- LAIBE_VISUAL_SIM 的角色規則、模板、聊天室指引與 skill-style 指引已建立。
- Plancraft+ Visual Simulation Task Preview 的 visual brief、prompt preview、asset spec、網站位置與不可宣稱事項已整理。
- 已明確標示目前沒有真實圖片生成、沒有 API、沒有 production asset。
- 已知風險已列出，足以交給 LAIBE_REVIEWER 做階段總審查。

---

## Cross-Chatroom Notes

- 目前治理制度已定義 AI_ARCHITECT_CORE、Builder / Codex、LAIBE_WEB_FLOW_BUILDER、LAIBE_REVIEWER、LAIBE_VISUAL_SIM 的邊界。
- 任務分派原則已建立：治理留在 AI_ARCHITECT_CORE，施工交給 Builder，審查交給 LAIBE_REVIEWER，模擬圖交給 LAIBE_VISUAL_SIM。
- Phase Review 制度已建立，避免每個小任務都立即由使用者主動觸發審查。
- Builder Review-ready Summary 與 Phase Review Packet 同時存在：前者服務單一 Builder 完成回報，後者服務階段總審查。
- 後續需要確認各聊天室是否依新模板與新分派規則運作。
- AI 引導官不應再被理解為獨立頁主角；它是平面拼圖、預算生成、招標系統內的諮詢層。
- 需求整理頁目前仍是 `onboard_ai_agent/code.html`，但頁面語意應保持「需求整理 / onboarding」，不要擴大成正式 AI 系統。
- Header 不應再出現「發案方」「接案方」這兩個入口。
- 平面拼圖頁的 progress bar 必須保持在 header 下方獨立 banner，不要放回 header。
- 跨頁 CTA 不應放在畫布插件內；插件內只放工具或畫布狀態。
- Dashboard flow 尚未由本聊天室實作；目前只整理 static MVP 頁面連接。
- budget-system 的資料層已可進階段總審查；但它目前仍是 local deterministic prototype，不是正式報價系統。
- plan-puzzle 到 budget-system 的銜接目前在 budget adapter 端成立，尚未代表平面拼圖頁已輸出最新 Plancraft+ draft JSON。
- 未來 Excel / PDF renderer 必須只讀 `BudgetOutputSnapshot`，不得呼叫 budget engine、pricing rules、material resolver、RAG、AI API 或 legacy `formatBudgetOutput()`。

---

## Known Issues

### 已確認問題

- 尚未由 LAIBE_REVIEWER 正式審查本階段治理規則。
- 本階段 Phase Review Packet 已追加 Web Flow Builder 本聊天室成果，但尚未納入其他 Builder 的完整實際施工成果。
- 平面拼圖仍為靜態骨架，尚未具備真互動。
- 預算生成入口已存在，但 `preview_budget/code.html` 頁面本體未在本聊天室整理。
- budget-system 後端資料契約已完成 Phase 1 至 Phase 2.9.2 prototype，但仍未接正式 DB、RAG、AI API、Excel/PDF 或真價格來源。
- 最新 Plancraft+ wall/nodeGraph draft 尚未對齊 budget adapter。
- Onboarding 兩個下一步入口固定顯示，不依問答完成狀態切換。

### 疑似問題

- 規則文件間可能有重複敘述，後續 Constitution Review 可檢查是否需要壓縮。
- `docs/NEXT_CODEX_HANDOFF.md` 可能過長，後續可檢查是否需要分段整理。
- 工具 dropdown 的 LiDAR / iScanner 連結可能需要替換為正式指定 App 連結。
- 各頁 header 視覺仍需逐頁比對正式首頁母版。

### 尚未驗證問題

- 尚未驗證 Builder / Reviewer / Visual Sim / Web Flow Builder 聊天室是否都能按照新模板順利運作。
- 尚未驗證 Phase Review 實際執行時，LAIBE_REVIEWER 是否能只聚焦總體一致性而不過度挑剔小差異。
- Mobile / tablet 響應式版面尚未完整驗證。
- 所有跨頁 routing 尚未做全站掃描，只做相關頁 HTTP 200 最小檢查。
- Dashboard / portal prototype 與 static MVP flow 是否需要同步尚未確認。
- 尚未驗證 LAIBE_REVIEWER 是否要把 Phase 2.9.2 renderer gate 的 validator/material resolver 邊界列為 Excel/PDF skeleton 前置修正。

---

## Do Not Touch

本階段仍禁止：

- git clean
- git reset
- 未授權修改 plancraft
- 未授權新增 framework / package
- 未授權刪除檔案
- 未授權大範圍重構
- 未授權修改 HTML / JS / CSS / TS / Python 功能檔
- 未授權修改 `src`、`plancraft`、`app`、`components`、`assets`、`layout`

---

## Ready For Phase Review

Yes

原因：

- AI_ARCHITECT_CORE 本階段治理成果已整理完成。
- 已追加本聊天室負責的 LAIBE_WEB_FLOW_BUILDER 成果。
- 已追加本聊天室負責的 budget-system / specDB / method-spec / budget output / snapshot contract / renderer gate 成果。
- 已標明本聊天室未處理其他 Builder 的完整實際施工成果。
- 已列出已知風險與尚未驗證事項。
- Ready 範圍限治理規則、Web Flow 靜態頁面連接、budget-system local deterministic prototype、method-spec/output contract 與已列出的 plan-puzzle adapter 銜接；不代表整個 LaiBE MVP 功能已完成或可正式報價。

---

## 本次整合說明

- 已將 AI_ARCHITECT_CORE 本階段成果整理進本 Phase Review Packet。
- 已追加 LAIBE_WEB_FLOW_BUILDER 本聊天室成果：landing、onboarding、header、CTA、routing、progress bar、dashboard flow、頁面連接。
- 已追加 budget-system 本聊天室成果：mock engine、preview floor plan adapter、warehouse、method-spec、budget output logistics、MaterialSpec alignment、snapshot contract、renderer gate 與 user-triggered review result 結論。
- 本次只更新 `docs/CURRENT_PHASE_REVIEW_PACKET.md`，未修改功能程式碼。
 
---

## Budget Phase 3.0 Addendum

### Completed

- Added Excel / PDF renderer skeleton for budget output.
- Renderer code reads `BudgetOutputSnapshot` only.
- Renderer entry calls `assertSnapshotRenderable()` before producing output.
- Customer renderer reads `customer_view` only and excludes internal trace fields.
- Internal trace renderer reads `internal_view` and preserves trace fields.
- HTML and CSV skeleton outputs are simple strings only; no formal Excel or PDF files are generated.

### Modified Files

- `docs/NEXT_CODEX_HANDOFF.md`
- `docs/CURRENT_PHASE_REVIEW_PACKET.md`

### Added Files

- `docs/budget/19-excel-pdf-renderer-skeleton.md`
- `src/lib/budget/renderers/types.ts`
- `src/lib/budget/renderers/customer-budget-renderer.ts`
- `src/lib/budget/renderers/internal-trace-renderer.ts`
- `src/lib/budget/renderers/html-renderer-skeleton.ts`
- `src/lib/budget/renderers/csv-renderer-skeleton.ts`
- `src/lib/budget/renderers/render-snapshot.ts`
- `src/lib/budget/renderers/demo-render-snapshot.ts`

### Unfinished

- Formal `.xlsx` renderer is not implemented.
- Formal `.pdf` renderer is not implemented.
- Import denylist / static guard for formal renderer work is still future work.

### Budget / specDB Impact

- `BudgetOutputSnapshot` remains the frozen input boundary for renderer work.
- Renderer skeleton does not change pricing, material binding, method-spec catalog, estimate generation, or repository behavior.
- Future Excel/PDF renderer should extend this skeleton and must not call budget engine, pricing rules, material resolver, RAG, AI API, or legacy `formatBudgetOutput()`.

### Known Risks

- Current renderer output is a skeleton, not production-grade Excel/PDF formatting.
- Formal renderer work still needs review guardrails before file generation.

### Ready For Phase Review

Yes, for Phase 3.0 renderer skeleton review.

---

## Budget Phase R1 Addendum

### Completed

- Established Raw Candidate Warehouse Foundation for raw material procurement and candidate data.
- Created a new namespace at `src/lib/budget/raw-warehouse/`.
- Defined `RawCatalogSource`, `RawCatalogItem`, typed candidate records, review statuses, validation statuses, review queue items, and handoff proposals.
- Added mock raw sources for historical quote lines, material price rows, vendor quotes, market references, brand/model references, labor rate observations, and note candidates.
- Implemented source flattening, raw item normalization, rule-based classification, candidate validation, review queue generation, simulated candidate-only approval, in-memory repository storage, and handoff proposal output.
- Kept all price observations as `observed_price` only.
- Confirmed `formal_price_generated` remains `false`.

### Modified Files

- `docs/NEXT_CODEX_HANDOFF.md`
- `docs/CURRENT_PHASE_REVIEW_PACKET.md`

### Added Files

- `docs/budget/20-raw-candidate-warehouse-plan.md`
- `src/lib/budget/raw-warehouse/types.ts`
- `src/lib/budget/raw-warehouse/mock-raw-sources.ts`
- `src/lib/budget/raw-warehouse/source-collector.ts`
- `src/lib/budget/raw-warehouse/raw-item-normalizer.ts`
- `src/lib/budget/raw-warehouse/candidate-classifier.ts`
- `src/lib/budget/raw-warehouse/candidate-validator.ts`
- `src/lib/budget/raw-warehouse/review-queue.ts`
- `src/lib/budget/raw-warehouse/handoff-proposal.ts`
- `src/lib/budget/raw-warehouse/in-memory-raw-catalog-repository.ts`
- `src/lib/budget/raw-warehouse/demo-raw-catalog-warehouse.ts`

### Unfinished

- No real data import pipeline is implemented.
- No external crawling, RAG, AI API, database, or formal catalog publishing is implemented.
- No formal `PricingRule`, `MaterialSpec`, `LaborRule`, or `BudgetEstimateLine.unit_price` is generated.
- No integration with Renderer, Excel/PDF, `BudgetOutputSnapshot`, floor-plan, or old `src/lib/budget/intake/` is attempted.

### Budget / specDB Impact

- Adds a separate raw candidate evidence layer before Method / Spec Warehouse and Estimate Output Logistics.
- Provides candidate handoff proposals only; proposals are not formal catalog records.
- Protects the formal pricing boundary by storing candidate price only as `observed_price`.
- Future specDB work can review candidates and decide whether to create approved catalog entries in a separate controlled process.

### Known Risks

- Rule-based classification is intentionally simple and mock-only.
- Mock source reliability, vendor fields, effective dates, and suggested codes are not production-grade.
- Candidate merge logic only demonstrates policy; it does not perform real catalog merge.
- Human review is simulated in the demo and must be replaced by a real review workflow later.

### Ready For Phase Review

Yes, for Phase R1 Raw Candidate Warehouse contract review.

## Budget Phase R1.1 Addendum

### Completed

- Hardened the Raw Candidate Warehouse contract without expanding into renderer, output snapshot, floor-plan, RAG, AI, DB, or formal pricing scope.
- Added full handoff proposal provenance: `RawCatalogSource -> RawCatalogItem -> Candidate -> ValidationResult -> ReviewQueueItem -> HandoffProposal`.
- Added explicit proposal safety fields: `formal_price_generated: false`, `price_authority: "none"`, `allowed_next_actions`, `blocked_actions`, and `provenance_trace`.
- Added a raw candidate risk flag taxonomy covering missing unit/price/currency/source date, low reliability/confidence, duplicates, merge risk, price outliers, unit mismatch, ambiguous names, missing brand/model/spec, unknown type, negative price, unclear scope, missing region/effective date, and manual review.
- Added observed price safety validation to ensure raw-warehouse candidates/proposals do not expose formal pricing fields such as `unit_price`, `formal_price`, `approved_price`, `amount_as_price`, or `pricing_rule_id`.
- Added a local raw-warehouse static guard to scan raw-warehouse TypeScript imports and boundary keywords.
- Updated the raw warehouse demo summary with safety status, static guard status, full provenance counts, risk flag counts, `formal_price_generated`, and `price_authority`.

### Modified Files

- `src/lib/budget/raw-warehouse/types.ts`
- `src/lib/budget/raw-warehouse/candidate-classifier.ts`
- `src/lib/budget/raw-warehouse/candidate-validator.ts`
- `src/lib/budget/raw-warehouse/review-queue.ts`
- `src/lib/budget/raw-warehouse/handoff-proposal.ts`
- `src/lib/budget/raw-warehouse/demo-raw-catalog-warehouse.ts`
- `docs/NEXT_CODEX_HANDOFF.md`
- `docs/CURRENT_PHASE_REVIEW_PACKET.md`

### Added Files

- `docs/budget/21-raw-candidate-contract-hardening.md`
- `src/lib/budget/raw-warehouse/observed-price-safety.ts`
- `src/lib/budget/raw-warehouse/static-guard.ts`
- `src/lib/budget/raw-warehouse/demo-raw-warehouse-static-guard.ts`

### Not Completed

- No real procurement ingestion.
- No human review UI.
- No formal DB persistence.
- No formal `PricingRule`, `MaterialSpec`, `LaborRule`, or `BudgetEstimateLine.unit_price`.
- No renderer, Excel, PDF, CSV, HTML, or `BudgetOutputSnapshot` work.
- No plan-puzzle / preview floor-plan work.
- No RAG, AI API, Skills, payment, escrow, or listing fee integration.

### Budget / specDB Impact

- Raw candidate evidence can now be handed off with complete provenance and explicit blocked actions.
- MethodSpecCatalog remains untouched; proposals do not write into MethodSpecCatalog or create specs.
- Budget engine remains untouched; observed prices do not become formal budget prices.
- Downstream specDB/pricing review can inspect proposals, but must still perform human approval before any formal catalog changes.

### Known Risks

- Static guard is local-only and not wired to CI.
- Rule-based classification and simulated human review remain mock/prototype behavior.
- Risk flags are policy signals, not final procurement approval logic.
- Handoff proposals are structured enough for review, but there is still no real reviewer workflow or audit store.

### Ready For Phase Review

Yes, for Phase R1.1 Raw Candidate Warehouse contract hardening review. The ready scope is limited to candidate contract safety and local prototype guards.

## Budget Phase 3.1 Addendum

### Completed

- Added renderer contract hardening for the budget output renderer layer.
- Added renderer-only snapshot gate wrapper: `assertSnapshotRenderableForRenderer()`.
- Renderer-only gate rejects `methodSpecCatalog` options and keeps catalog-aware validation outside formal renderer entry.
- Added runtime validation for render `mode` and `format`.
- Added customer warning sanitizer so customer output warnings do not leak internal trace keys.
- Added serializer guard marker on `RenderedBudgetDocument` and serializer input checks.
- Added renderer static guard to scan formal renderer files for forbidden imports and keywords.
- Added formal Excel / PDF layout contract documentation for the next phase.

### Modified Files

- `docs/NEXT_CODEX_HANDOFF.md`
- `docs/CURRENT_PHASE_REVIEW_PACKET.md`
- `src/lib/budget/renderers/types.ts`
- `src/lib/budget/renderers/render-snapshot.ts`
- `src/lib/budget/renderers/customer-budget-renderer.ts`
- `src/lib/budget/renderers/internal-trace-renderer.ts`
- `src/lib/budget/renderers/html-renderer-skeleton.ts`
- `src/lib/budget/renderers/csv-renderer-skeleton.ts`

### Added Files

- `docs/budget/20-renderer-contract-hardening.md`
- `docs/budget/21-formal-excel-pdf-layout-contract.md`
- `src/lib/budget/renderers/assert-snapshot-renderable-for-renderer.ts`
- `src/lib/budget/renderers/customer-warning-sanitizer.ts`
- `src/lib/budget/renderers/validate-render-options.ts`
- `src/lib/budget/renderers/renderer-static-guard.ts`
- `src/lib/budget/renderers/demo-renderer-hardening.ts`

### Unfinished

- Formal `.xlsx` renderer is not implemented.
- Formal `.pdf` renderer is not implemented.
- Static guard is local prototype validation, not a CI-enforced import policy.

### Budget / specDB Impact

- Renderer formal path remains snapshot-only.
- Renderer code still does not call budget engine, pricing rules, material resolver, RAG, AI API, or legacy `formatBudgetOutput()`.
- `BudgetOutputSnapshot` remains the frozen boundary for future Excel / PDF file rendering.
- No change to MethodSpecCatalog, pricing rules, estimate generation, warehouse repositories, or plan-puzzle adapter.

### Known Risks

- HTML / CSV outputs remain skeleton serializers, not production document layout.
- Future formal file renderers still need workbook/page layout rules, signatures, totals layout, notes section, and style differences.
- Static guard should be promoted to a test/CI step before production renderer work.

### Ready For Phase Review

Yes, for Phase 3.1 renderer contract hardening review.

---

## Budget Renderer Phase 3.2 Review Addendum

### Phase Scope

This addendum covers the current chatroom scope only: budget-system, specDB / method-spec handoff boundaries, budget output, estimate / quote / material / labor trace data, and the plan-puzzle to budget-system input boundary. Phase 3.2 did not modify plan-puzzle or preview_floor_plan.

### Completed Items

- Built the formal renderer entry scaffold for future Excel / PDF work.
- Added a formal layout contract for customer and internal trace output profiles.
- Added Excel and PDF skeleton renderers that return structured objects only.
- Added a runtime entry marker so formal Excel/PDF skeleton functions reject direct calls that do not come through `formal-renderer-entry.ts`.
- Commandized renderer static guard so it can be rerun before formal renderer work.
- Added a demo that proves valid customer/internal skeleton output, invalid snapshot rejection, unknown option rejection, customer/internal field separation, methodSpecCatalog rejection, and static guard success.

### Modified Files

- `src/lib/budget/renderers/types.ts`
- `src/lib/budget/renderers/renderer-static-guard.ts`
- `docs/NEXT_CODEX_HANDOFF.md`
- `docs/CURRENT_PHASE_REVIEW_PACKET.md`

### New Files

- `docs/budget/22-formal-renderer-entry-contract.md`
- `src/lib/budget/renderers/formal-renderer-entry.ts`
- `src/lib/budget/renderers/formal-layout-contract.ts`
- `src/lib/budget/renderers/formal-excel-renderer-skeleton.ts`
- `src/lib/budget/renderers/formal-pdf-renderer-skeleton.ts`
- `src/lib/budget/renderers/run-renderer-static-guard.ts`
- `src/lib/budget/renderers/demo-formal-renderer-entry.ts`

### Incomplete Items

- No formal `.xlsx` writer has been implemented.
- No formal `.pdf` writer has been implemented.
- Layout contract is metadata-only; it does not yet drive a real workbook/page engine.
- Signature, totals, notes, header/footer, and pagination are contract fields only.

### Budget / specDB Impact

- Formal renderers remain snapshot-only: they read `BudgetOutputSnapshot` and do not read `MethodSpecCatalog`, pricing rules, material resolver, RAG, or AI API.
- `MethodSpecCatalog` remains upstream of snapshot generation and is not part of the formal renderer entry.
- Customer layout is limited to customer-safe budget fields.
- Internal trace layout preserves estimate / quote / material / labor trace fields needed for later audit.
- No changes were made to project input adapters or plan-puzzle draft structures.

### Known Risks

- Skeleton output is not a real Excel/PDF rendering implementation yet.
- Static guard is local-command based; it should become a test/CI gate before production renderer work.
- Formal layout profiles may need refinement after real workbook/page rendering is attempted.
- The repo worktree contains many pre-existing unrelated dirty/untracked files; Phase 3.2 did not revert or modify those unrelated areas.

### Ready For Phase Review

Yes. Phase 3.2 is ready for a User-triggered Review result before any real `.xlsx` or `.pdf` generation work begins.

---

## 預算生成系統三倉庫統一收尾規則

本階段新增治理規則：預算生成系統不再視為單一「預算生成 Builder」，而是拆分為三個子倉庫 / 專責聊天室。

### 配件倉庫：工法與規格 成果

### 完成事項

- 已確立三倉庫架構中「配件倉庫：工法與規格」的責任邊界，將本倉庫定位為 approved MethodSpec / specs / rules shelf。
- 已建立 `MethodSpecCatalog` 作為工法與規格主資料契約，涵蓋 `QuoteItemTemplate`、`MethodRecipe`、`MaterialSpec`、`LaborRule`、`NoteTemplate`、`UnitConversion`、`InclusionExclusionRule`、`ItemMaterialBinding` 與 `PricingRule`。
- 已建立 seed MethodSpecCatalog，包含木作、泥作、水電與其他工程的第一批 approved 工項、工法、材料規格、備註、包含 / 不包含規則與單位換算。
- 已建立 `buildBudgetCatalogFromMethodSpec()`，讓 MethodSpecCatalog 可轉成既有 deterministic budget engine 可吃的 BudgetCatalog。
- 已建立 MethodSpecCatalog validator，並在 MS-5 補強 P0 validator guard：
  - 阻擋 raw / candidate / RAG / AI / LLM 類價格來源直接成為正式 pricing source。
  - 建立 allowed unbound material item allowlist。
  - 讓 InclusionExclusionRule.requires_review 的 scope_review policy 在 validation report 中可見。
  - 檢查 active QuoteItemTemplate 是否有 customer note coverage。
  - validation report 可分辨 errors、warnings、allowed_conditions、guard_results。
- 已完成 MS-1 + MS-2 盤點報告，確認 seed MethodSpecCatalog 足以支援現有 BudgetEstimateLine 與 BudgetOutputSnapshot.internal_view。
- 已完成 MS-4 邊界文件，定義 MethodSpec 對 BudgetEstimateLine / BudgetOutputSnapshot 的可影響欄位與不可越界規則。
- 已完成 MS-6 User-triggered Review result，結論為 `PASS_WITH_NOTES`；P0 validator guard 有效，且未發現本倉庫越界修改 renderer / output / intake / frontend / plan puzzle / budget engine 估價流程。

### 修改檔案

- `docs/CURRENT_PHASE_REVIEW_PACKET.md`
- `docs/NEXT_CODEX_HANDOFF.md`
- `src/lib/budget/specs/types.ts`
- `src/lib/budget/specs/seed-method-spec-catalog.ts`
- `src/lib/budget/specs/validate-method-spec-catalog.ts`
- `src/lib/budget/specs/build-budget-catalog-from-method-spec.ts`
- `src/lib/budget/specs/demo-method-spec-warehouse.ts`

### 新增檔案

- `docs/budget/14-method-spec-warehouse.md`
- `docs/budget/20-method-spec-to-budget-output-boundary.md`
- `docs/budget/21-method-spec-catalog-inventory-report.md`
- `docs/budget/22-method-spec-validator-hardening.md`
- `docs/budget/23-method-spec-validator-reviewer-pass.md`
- `src/lib/budget/specs/method-spec-repository.ts`
- `src/lib/budget/specs/in-memory-method-spec-repository.ts`
- `src/lib/budget/specs/item-material-binding.ts`
- `src/lib/budget/specs/demo-method-spec-validator-hardening.ts`

### 未完成事項

- 尚未接正式資料庫；目前 MethodSpecCatalog 仍是 local TypeScript seed / in-memory prototype。
- 尚未建立正式人工審核 UI 或 publish workflow；目前只以文件、seed catalog、validator 與 demo 表示 contract。
- LaborRule 目前維持 reference-only，尚未進入主估價公式；若未來要拆 material / labor pricing，必須另開 phase。
- UnitConversion coverage 目前支援現有 cm -> 尺、m2 -> 坪、mm -> cm，但尚未建立完整 formula parser 或 recipe formula coverage checker。
- InclusionExclusionRule.requires_review 已在 validator report 可見，但尚未實作到 BudgetOutputSnapshot 的正式 propagation。
- active QuoteItemTemplate 的 inclusion / exclusion completeness、unused active MaterialSpec、material binding completeness 等仍屬後續 P1 / P2 validator backlog。

### MethodSpec / 工法與規格資料影響

- `QuoteItemTemplate` 定義工項代碼、品名、工程類別、單位與預設備註來源。
- `MethodRecipe` 定義 layout / space / project trigger 如何產生工項、數量公式、recipe trace 與 requires_review 訊號。
- `MaterialSpec` 提供材料規格追溯，不得直接改價格、數量、unit_price 或 amount。
- `ItemMaterialBinding` 定義 item_code -> material_code 的規格追溯關係，不得直接影響 unit_price 或 amount。
- `NoteTemplate` 提供 customer note、internal note、exclusion、assumption、risk 等備註來源，不得改數量與金額。
- `InclusionExclusionRule` 定義 includes、excludes、assumption 與 scope review 訊號，不得改 renderer 格式。
- `UnitConversion` 提供估價公式可用的單位換算參考，不得默默改寫已產生的 quantity。
- `LaborRule` 目前僅為 reference shelf，不得進入主估價公式。
- `PricingRule` 仍是目前 deterministic price source；AI / RAG / raw candidate data 不得直接寫入正式 PricingRule。

### 對 budget-system 的影響

- budget engine 可透過 `buildBudgetCatalogFromMethodSpec()` 使用已審核 MethodSpecCatalog 轉出的 BudgetCatalog。
- MethodRecipe / QuoteItemTemplate / PricingRule 可影響 BudgetEstimateLine 的 item_code、品名、工程類別、單位、數量公式、unit_price、amount、price_source、confidence 與 requires_review。
- MaterialSpec、ItemMaterialBinding、NoteTemplate、InclusionExclusionRule 不得改變 unit_price 或 amount。
- MS-6 regression demo 已確認 `demo-generate-budget.ts` total amount 仍為 `231103`，budget line count 仍為 `12`，代表 MS-5 validator hardening 未破壞 deterministic budget engine。
- 本倉庫不處理 plan-puzzle draft normalization，也不修改 preview_floor_plan adapter；它只提供 budget-system 估價所需的工法與規格規則。

### 對成品物流 / output system 的影響

- 成品物流可在 snapshot 生成前讀取 MethodSpecCatalog，用於補齊 customer_note、internal_note、material_code、inclusions、exclusions、assumptions、risks 與 review signals。
- BudgetOutputSnapshot 建立後，renderer / Excel / PDF / CSV / HTML 輸出層只能讀 snapshot，不得回頭讀 MethodSpecCatalog。
- ItemMaterialBinding.requires_review 代表 spec_review；InclusionExclusionRule.requires_review 代表 scope_review；PricingRule.requires_review 代表 price_review；MethodRecipe.requires_review 代表 formula_review；NoteTemplate.requires_review 代表 note_review。
- customer_view 不應顯示 internal trace fields；internal_view 可保留 recipe trace、material trace、inclusion / exclusion / assumption / risk 與 review flags。
- 本倉庫不修改 renderer，不決定 Excel / PDF 欄寬、分頁、簽核欄位、HTML / CSV 格式或任何成品表單排版。

### 風險

- 目前 seed catalog / pricing rule 仍是 mock / deterministic prototype，不是正式報價資料。
- 若 raw candidate、RAG、AI 或採購價格繞過人工審核直接進入 PricingRule，會違反「AI 不直接定價」與三倉庫邊界。
- 若 MaterialSpec / ItemMaterialBinding / NoteTemplate / InclusionExclusionRule 被 downstream 用來改 unit_price 或 amount，屬於高風險越界。
- 若 renderer 回頭讀 MethodSpecCatalog 或呼叫 budget engine / pricing rules / material resolver，屬於高風險越界。
- 目前 worktree 存在其他階段的 dirty / untracked files；MS-6 user-triggered review result 已記錄此事，因此正式 phase freeze 前建議以乾淨分支再做一次 file ownership proof。
- MS-5 validator report 目前可見 P0 guard，但 P1 / P2 backlog 尚未完成，正式報價前仍需補強。

### 是否 ready for phase review

Yes, with notes.

配件倉庫：工法與規格目前可進入 phase review。Ready 範圍限 MethodSpecCatalog contract、seed catalog、validator P0 guard、MethodSpec -> BudgetEstimateLine / BudgetOutputSnapshot 邊界文件與 user-triggered review result 結論；不代表正式報價、正式 DB、正式人工審核流程、正式 Excel / PDF 或 renderer 工作已完成。

### Freeze note 補充

- 已新增 `docs/budget/32-method-spec-validator-freeze-note.md`，作為 MS-12 `PASS_WITH_NOTES` 後的 MethodSpec validator checkpoint。
- freeze note 記錄目前 frozen baseline：PR #4 merged、P0 / P1-A / P1-B validator complete、MS-12 `PASS_WITH_NOTES`、budget regression total `231103`、line count `12`、review-required line count `5`。
- freeze note 確認 `PricingRule` 仍是目前唯一 deterministic formal price source；AI / RAG / raw candidate data 不得直接變正式價格。
- freeze note 確認 `LaborRule` 維持 reference-only；`MaterialSpec`、`ItemMaterialBinding`、`NoteTemplate`、`InclusionExclusionRule` 不得改 `quantity`、`unit_price` 或 `amount`。
- freeze note 確認 UnitConversion coverage 仍是 warning-only，不得重算或改寫已產生 quantity。
- freeze note 確認 Inclusion / Exclusion scope coverage 仍是 warning / allowed-condition only，不得直接 propagation 到 renderer / output，也不得新增、刪除或改寫正式工項。
- 本補充沒有修改 runtime code、specs validator implementation、renderer / output、raw warehouse、frontend、plan-puzzle、payment / escrow / listing fee。

---

## 原物料採購與倉儲 成果

### 完成事項

- 已建立 Raw Candidate Warehouse Foundation，作為原物料採購與倉儲的候選資料層。
- 已建立 `src/lib/budget/raw-warehouse/` namespace，與舊 `src/lib/budget/intake/` 暫停 prototype 分離。
- 已定義 `RawCatalogSource`，保留來源類型、來源名稱、來源 owner、來源日期、擷取時間、地區、幣別、來源可靠度、來源備註、raw items 與 metadata。
- 已定義 `RawCatalogItem`，保留原始列資料：品名、品牌、型號、規格、單位、數量、觀測單價、金額、幣別、備註、原文、有效日期、地區、vendor 與 metadata。
- 已定義候選資料型別：historical quote line、material price、vendor quote、market price、brand/model、labor rate、catalog note、unknown。
- 已建立候選資料流程：source collector、raw item normalizer、rule-based classifier、candidate validator、review queue、handoff proposal、in-memory repository。
- 已完成 Phase R1 User-triggered Review result，結論為 `PASS_WITH_NOTES`。
- 已確認候選價格只使用 `observed_price`，不得成為正式 `unit_price`。
- 已確認 `formal_price_generated` 在 demo summary 與 handoff proposal 中維持 `false`。

### 修改檔案

- `docs/CURRENT_PHASE_REVIEW_PACKET.md`
- `docs/NEXT_CODEX_HANDOFF.md`（前一輪 R1 建立成果時已更新 handoff；本輪未修改）

### 新增檔案

- `docs/budget/20-raw-candidate-warehouse-plan.md`
- `src/lib/budget/raw-warehouse/types.ts`
- `src/lib/budget/raw-warehouse/mock-raw-sources.ts`
- `src/lib/budget/raw-warehouse/source-collector.ts`
- `src/lib/budget/raw-warehouse/raw-item-normalizer.ts`
- `src/lib/budget/raw-warehouse/candidate-classifier.ts`
- `src/lib/budget/raw-warehouse/candidate-validator.ts`
- `src/lib/budget/raw-warehouse/review-queue.ts`
- `src/lib/budget/raw-warehouse/handoff-proposal.ts`
- `src/lib/budget/raw-warehouse/in-memory-raw-catalog-repository.ts`
- `src/lib/budget/raw-warehouse/demo-raw-catalog-warehouse.ts`

### 未完成事項

- 尚未建立真實資料匯入流程；目前僅使用 mock raw sources。
- 尚未接正式資料庫、Supabase、外部網站、RAG 或 AI API。
- 尚未建立正式 material resolver。
- 尚未建立正式 material pricing。
- 尚未建立正式供應商 / 採購 / 庫存資料同步。
- 尚未建立正式單位換算或材料用量推估引擎。
- 尚未把候選資料轉成正式 `PricingRule`、`MaterialSpec`、`LaborRule`。
- 尚未建立人工審核 UI；目前 review queue 與 approval 僅為 local prototype。
- 尚未建立 static import guard；目前已人工 review import 邊界，R1.1 建議補 guard。

### 原物料 / 採購 / 倉儲資料影響

- 本倉庫目前建立的是 raw candidate evidence layer，不是正式材料庫。
- 可收集與保存歷史報價、材料單價表、廠商報價、市場價格參考、品牌型號、人工單價與備註候選。
- 每筆資料保留來源、日期、地區、幣別、可靠度與 metadata，方便後續稽核與人工審核。
- 價格資料僅作觀測資料，欄位名稱為 `observed_price`。
- 採購成本、供應商線索、材料規格、品牌型號與人工單價目前都只可成為候選資料，不可直接上架為正式價格。
- Review queue 狀態已區分 `pending`、`approved_as_candidate`、`rejected`、`needs_more_info`、`needs_merge`、`deprecated`。
- Validator 已區分 `valid_for_review`、`needs_more_info`、`blocked`。
- Handoff proposal 只代表「可交給下一層審查」，不代表正式上架。

### 對 MethodSpecCatalog 的影響

- 本倉庫不得直接修改 `MethodSpecCatalog` 主規則。
- 本倉庫不得直接建立正式 `MaterialSpec`、`LaborRule`、`PricingRule`。
- 本倉庫可提供 material candidate、labor rate candidate、historical quote reference、vendor quote reference、market price reference 與 merge proposal，供 MethodSpec / specDB 後續人工審核。
- `approved_as_candidate` 僅代表候選證據通過初步審查，不等於 MethodSpec catalog approval。
- 未來若候選資料要進入 MethodSpecCatalog，必須經過另一個明確的人工審核 / merge / publish 流程。

### 對 budget-system 的影響

- 本倉庫不呼叫 `generateBudgetEstimate()`。
- 本倉庫不寫入 `BudgetEstimateLine.unit_price`。
- 本倉庫不產生正式報價。
- 本倉庫不修改 budget engine、quantity takeoff、recipe matcher、budget output、renderer 或 snapshot。
- 目前對 budget-system 的影響是新增一個候選資料前置層，未來可作為正式 pricing / material / labor 審核流程的來源證據。
- Phase R1 demo 已確認既有 `demo-generate-budget.ts` 與 `demo-load-budget-warehouse.ts` 仍可執行，未破壞既有 deterministic budget engine。

### 風險

- 若 `observed_price` 被誤接為正式 `unit_price`，屬於 blocker 級越權定價風險。
- 若候選資料直接生成 `PricingRule`、`MaterialSpec`、`LaborRule`，屬於三倉庫越界風險。
- 若 Raw Candidate Warehouse import renderer、BudgetOutputSnapshot、budget-generator、MethodSpec publisher 或舊 intake prototype，屬於 import 邊界風險。
- 目前 rule-based classifier、source reliability、suggested code、merge policy 與 simulated review 都是 mock / prototype。
- Handoff proposal 目前主要靠 `source_item_id` 回查來源；R1.1 建議補強 proposal 的 standalone provenance。
- `source-collector` 目前會用 source fallback 補 row 的缺漏 `raw_currency` / `region`，R1.1 建議保留 inherited value 與原始缺值差異。

### 是否 ready for phase review

Yes，原物料採購與倉儲 Phase R1 已可進入 phase review。

備註：ready 範圍僅限 Raw Candidate Warehouse Foundation / candidate evidence layer，不代表正式 material resolver、正式 material pricing、正式採購系統或正式報價已完成。

### Phase R1.2 補充：Raw Review Contract & Warehouse Safety Validator

#### 完成事項

- 已建立 `validateHandoffProposalContract()`，逐欄檢查 handoff proposal 是否保留完整 provenance 與安全欄位。
- 已建立 `validateWarehouseExportSafety()`，掃描 candidates、review items、handoff proposals 與可選 export snapshot，阻擋正式價格欄位與正式 catalog identity 欄位外洩。
- 已明確化 `approved_as_candidate` 語意：只代表候選證據可送往下一層審核，不代表正式價格、正式 catalog、正式 PricingRule / MaterialSpec / LaborRule 或客戶輸出核准。
- 已建立 `evaluateRawCandidateMergePolicy()`，針對 duplicate / merge / unit mismatch / material duplicate / price outlier 只產生 flags 與 recommendation，不自動合併、不自動上架。
- 已更新 raw warehouse demo summary，加入 proposal contract、warehouse export safety、merge policy 與 `approved_as_candidate_is_formal_approval: false`。
- 已新增 R1.2 專用 demo：`demo-raw-review-contract-safety.ts`。

#### 修改檔案

- `docs/CURRENT_PHASE_REVIEW_PACKET.md`
- `docs/NEXT_CODEX_HANDOFF.md`
- `src/lib/budget/raw-warehouse/types.ts`
- `src/lib/budget/raw-warehouse/review-queue.ts`
- `src/lib/budget/raw-warehouse/demo-raw-catalog-warehouse.ts`

#### 新增檔案

- `docs/budget/22-raw-review-contract-safety-validator.md`
- `src/lib/budget/raw-warehouse/handoff-proposal-contract-validator.ts`
- `src/lib/budget/raw-warehouse/warehouse-export-safety.ts`
- `src/lib/budget/raw-warehouse/merge-policy.ts`
- `src/lib/budget/raw-warehouse/demo-raw-review-contract-safety.ts`

#### 未完成事項

- 尚未接真實 raw source 匯入。
- 尚未建立人工審核 UI。
- 尚未進行正式 catalog publishing。
- 尚未把 proposal 寫入正式 PricingRule / MaterialSpec / LaborRule，且本階段明確禁止此事。
- 尚未接 CI；static guard 與 safety validator 仍以 local demo 執行。

#### 原物料 / 採購 / 倉儲資料影響

- Raw warehouse 對外輸出現在有 proposal contract validator 與 repository-wide export safety scan 兩層防線。
- `observed_price` 仍可留在 raw / candidate / proposal 層，但只能作為 evidence。
- `formal_price_generated` 維持 `false`。
- `price_authority` 維持 `"none"`。
- forbidden fields 包含 `unit_price`、`formal_price`、`approved_price`、`amount_as_price`、`pricing_rule_id`、`material_spec_id`、`labor_rule_id`、`method_spec_id`、`budget_estimate_line_id`。

#### 對 MethodSpecCatalog 的影響

- R1.2 不修改 MethodSpec 主規則，不新增正式 MethodSpecCatalog payload。
- Handoff proposal 只可作為 MethodSpec / pricing / material spec 後續人工審核的候選證據。
- merge policy 不會自動 merge，也不會覆蓋 MethodSpecCatalog。

#### 對 budget-system 的影響

- R1.2 不呼叫 budget engine，不產生 BudgetEstimateLine，不影響 deterministic pricing。
- R1.2 不接 Renderer、Excel / PDF、BudgetOutputSnapshot、preview_floor_plan 或 plan-puzzle。
- 對 budget-system 的新增影響只是在正式估價資料之前補上 raw evidence safety gate。

#### 風險

- 目前 validator / static guard 是 local prototype，尚未接 CI。
- mock raw source 的中文在部分終端可能顯示亂碼，但資料流與安全欄位仍可執行。
- merge policy 是初版 rule-based recommendation，尚未具備正式去重或人工審核介面。
- 若下游忽略 proposal contract，把 observed_price 當正式價格，仍是 blocker 級越權風險。

#### 是否 ready for phase review

Yes，Phase R1.2 可進入 User-triggered Review result。

Ready 範圍限 raw proposal contract、warehouse export safety scan、approved_as_candidate 語意、merge policy prototype 與 local demo；不代表正式採購系統、正式材料定價、正式 catalog publishing 或正式報價完成。

---

## 成品物流：預算表單輸出 成果

### 完成事項

- 已建立 `BudgetSheetOutput`，可由 `BudgetEstimate` 整理出客戶版 `customer_view`、內部追溯版 `internal_view`、totals 與 warnings。
- 已建立 `BudgetOutputSnapshot` contract，讓未來 Excel / PDF / CSV / HTML renderer 讀取穩定快照，不需重新跑 budget engine。
- 已建立 output repository prototype，可用 in-memory repository 儲存與讀回 output snapshot。
- 已建立 renderer gate：`assertSnapshotRenderable()` 與 renderer-only gate `assertSnapshotRenderableForRenderer()`，renderer 入口需先驗證 snapshot。
- 已建立 `RenderedBudgetDocument` 與 `renderSnapshot()`，可從 `BudgetOutputSnapshot` 輸出 `structured_rows`、HTML skeleton、CSV skeleton。
- 已建立 customer renderer，僅讀 `snapshot.customer_view`，不輸出 `source_id`、`recipe_id`、`quantity_formula`、`material_code`、`internal_note` 等內部追溯欄位。
- 已建立 internal trace renderer，可讀 `snapshot.internal_view` 並保留 `item_code`、`source_type`、`source_id`、`recipe_id`、`material_code`、`quantity_formula`、`price_source`、`confidence`、`requires_review`、`internal_note`、inclusions、exclusions、assumptions、risks。
- 已建立 customer warning sanitizer，避免 customer output warnings 洩漏 internal trace keys。
- 已建立 legacy output guard，`formatBudgetOutput()` 僅能作 legacy debug output，不得作正式 Excel / PDF 來源。
- 已建立 renderer static guard，掃描 renderer formal path 是否誤 import budget engine、pricing、material resolver、RAG、AI 或 legacy output。
- 已建立 Formal Renderer Entry scaffold：`renderFormalBudgetDocument(snapshot, options)`。
- 已建立 formal layout contract，描述欄寬、分頁、簽核欄、合計區、備註區、頁首頁尾，以及 customer / internal trace 樣式差異。
- 已建立 Excel skeleton 與 PDF skeleton，但只輸出 structured object，不產生正式 `.xlsx` 或 `.pdf`。
- 已建立 formal renderer token guard，讓 formal Excel / PDF skeleton 未經 formal entry 建立 token 時會 runtime 拒絕；手動偽造舊 string marker 會被拒絕。
- 已建立 Formal File Writer artifact policy，定義 customer / internal_trace audience、future excel / pdf format、檔名、儲存目標與安全規則。
- 已建立 Formal File Writer preflight，只檢查 gated structured document，不輸出正式 `.xlsx` / `.pdf`。
- 已建立固定 `BudgetOutputSnapshot` fixture，讓 renderer / file-writer preflight 測試不需要重新跑 budget engine。
- 已強化 renderer static guard，新增 dynamic import、require、path alias、cross-file re-export 與全文 forbidden keyword 掃描。
- 已強化 `runFormalFileWriterPreflight()` no-throw contract：malformed input 會回傳 `valid: false` 與 errors，不會因缺 `layout_contract.columns` 或 `snapshot_id` 先 throw。
- 已建立 invalid formal document fixtures，覆蓋 null、undefined、primitive、缺 snapshot、缺 layout、缺 rows、錯 token、customer trace leak、bad filename、forbidden writer options 等情境。
- 已建立 file writer dry-run contract，只回傳 would-write metadata，不產生 `.xlsx` / `.pdf`。
- 已強化 token factory import guard，限制 `createFormalRendererToken()` 只能由 formal entry / token module 使用。
- 已建立 formal file writer controlled entry：`writeFormalBudgetArtifact(gatedDocument, options)`，第一步固定呼叫 `runFormalFileWriterPreflight()`。
- 已建立 `FormalArtifactManifest`，記錄 snapshot、project、estimate、audience、format、filename、storage target、row count、total amount、layout profile、policy 與 security flags。
- 已建立 local staging policy，限制 staging root 為 `artifacts/budget-renderer-staging/`，拒絕任意絕對路徑、path traversal、正式 `.xlsx` / `.pdf` target 與 signed / approved overwrite。
- 已建立 placeholder artifact writer，僅允許在 policy 通過後寫 `.json` manifest 或 `.txt` placeholder；Phase 3.5 demo 使用 manifest-only，不實際寫檔。
- 已強化 renderer static guard，新增 workbook / file writer library 與 file write escape guard。
- 已完成 Phase 3.0、Phase 3.1、Phase 3.2 User-triggered Review result；Phase 3.2 結論為 `PASS_WITH_NOTES`。Phase 3.3 User-triggered Review result 結論為 `PASS_WITH_NOTES`，允許進入 Phase 3.4。Phase 3.4 User-triggered Review result 結論為 `PASS_WITH_NOTES`，允許進入 Phase 3.5。Phase 3.5 目前完成 builder implementation，可供後續審查。

### 修改檔案

- `docs/CURRENT_PHASE_REVIEW_PACKET.md`
- `docs/NEXT_CODEX_HANDOFF.md`
- `src/lib/budget/format-budget-output.ts`
- `src/lib/budget/output/types.ts`
- `src/lib/budget/output/budget-line-enricher.ts`
- `src/lib/budget/output/budget-sheet-formatter.ts`
- `src/lib/budget/output/budget-output-validator.ts`
- `src/lib/budget/output/budget-output-exporter.ts`
- `src/lib/budget/output/demo-budget-output-logistics.ts`
- `src/lib/budget/output/demo-budget-output-snapshot.ts`
- `src/lib/budget/renderers/types.ts`
- `src/lib/budget/renderers/render-snapshot.ts`
- `src/lib/budget/renderers/customer-budget-renderer.ts`
- `src/lib/budget/renderers/internal-trace-renderer.ts`
- `src/lib/budget/renderers/html-renderer-skeleton.ts`
- `src/lib/budget/renderers/csv-renderer-skeleton.ts`
- `src/lib/budget/renderers/renderer-static-guard.ts`
- `src/lib/budget/renderers/formal-layout-contract.ts`
- `src/lib/budget/renderers/formal-renderer-entry.ts`
- `src/lib/budget/renderers/formal-excel-renderer-skeleton.ts`
- `src/lib/budget/renderers/formal-pdf-renderer-skeleton.ts`
- `src/lib/budget/renderers/customer-budget-renderer.ts`
- `src/lib/budget/renderers/internal-trace-renderer.ts`
- `src/lib/budget/renderers/formal-file-writer-policy.ts`
- `src/lib/budget/renderers/formal-file-writer-preflight.ts`
- `src/lib/budget/renderers/run-renderer-static-guard.ts`
- `docs/budget/22-formal-renderer-entry-contract.md`
- `docs/budget/23-formal-file-writer-preflight.md`
- `docs/NEXT_CODEX_HANDOFF.md`

### 新增檔案

- `docs/budget/15-budget-output-logistics.md`
- `docs/budget/16-budget-output-snapshot-and-material-alignment.md`
- `docs/budget/17-contract-hardening-2.9.1.md`
- `docs/budget/18-renderer-gate-and-legacy-output-guard.md`
- `docs/budget/19-excel-pdf-renderer-skeleton.md`
- `docs/budget/20-renderer-contract-hardening.md`
- `docs/budget/21-formal-excel-pdf-layout-contract.md`
- `docs/budget/22-formal-renderer-entry-contract.md`
- `docs/budget/23-formal-file-writer-preflight.md`
- `docs/budget/24-renderer-artifact-policy.md`
- `src/lib/budget/output/budget-output-snapshot.ts`
- `src/lib/budget/output/budget-output-repository.ts`
- `src/lib/budget/output/in-memory-budget-output-repository.ts`
- `src/lib/budget/output/material-code-resolver.ts`
- `src/lib/budget/output/renderer-gate.ts`
- `src/lib/budget/output/demo-renderer-gate.ts`
- `src/lib/budget/renderers/assert-snapshot-renderable-for-renderer.ts`
- `src/lib/budget/renderers/customer-warning-sanitizer.ts`
- `src/lib/budget/renderers/validate-render-options.ts`
- `src/lib/budget/renderers/renderer-static-guard.ts`
- `src/lib/budget/renderers/demo-renderer-hardening.ts`
- `src/lib/budget/renderers/customer-budget-renderer.ts`
- `src/lib/budget/renderers/internal-trace-renderer.ts`
- `src/lib/budget/renderers/html-renderer-skeleton.ts`
- `src/lib/budget/renderers/csv-renderer-skeleton.ts`
- `src/lib/budget/renderers/render-snapshot.ts`
- `src/lib/budget/renderers/demo-render-snapshot.ts`
- `src/lib/budget/renderers/formal-renderer-entry.ts`
- `src/lib/budget/renderers/formal-layout-contract.ts`
- `src/lib/budget/renderers/formal-excel-renderer-skeleton.ts`
- `src/lib/budget/renderers/formal-pdf-renderer-skeleton.ts`
- `src/lib/budget/renderers/run-renderer-static-guard.ts`
- `src/lib/budget/renderers/demo-formal-renderer-entry.ts`
- `src/lib/budget/renderers/formal-renderer-token.ts`
- `src/lib/budget/renderers/formal-file-writer-policy.ts`
- `src/lib/budget/renderers/formal-file-writer-preflight.ts`
- `src/lib/budget/renderers/fixture-budget-output-snapshot.ts`
- `src/lib/budget/renderers/demo-formal-file-writer-preflight.ts`
- `docs/budget/25-file-writer-dry-run-contract.md`
- `src/lib/budget/renderers/formal-file-writer-dry-run.ts`
- `src/lib/budget/renderers/fixture-invalid-formal-documents.ts`
- `src/lib/budget/renderers/demo-file-writer-dry-run-hardening.ts`
- `docs/budget/26-formal-file-writer-controlled-entry.md`
- `src/lib/budget/renderers/formal-file-writer-entry.ts`
- `src/lib/budget/renderers/formal-artifact-manifest.ts`
- `src/lib/budget/renderers/formal-local-staging-policy.ts`
- `src/lib/budget/renderers/formal-placeholder-artifact-writer.ts`
- `src/lib/budget/renderers/demo-formal-file-writer-controlled-entry.ts`

### 未完成事項

- 尚未產生正式 `.xlsx` 檔案。
- 尚未產生正式 `.pdf` 檔案。
- Excel / PDF 目前仍是 skeleton structured object，不是正式檔案 renderer。
- Formal file writer 目前只有 controlled entry / policy / preflight / manifest / placeholder writer，尚未寫入正式檔案。
- Controlled writer entry 目前只產生 manifest result；尚未實作 production file writer。
- Placeholder writer 雖具備 `.json` / `.txt` staging 能力，但本階段 demo 採 manifest-only，未實際寫出 artifact。
- HTML / CSV 目前仍是 skeleton serializer，不是 production document layout。
- Formal layout contract 尚未接真實 workbook/page engine。
- 欄寬、分頁、簽核欄、合計區、備註區、頁首頁尾與 customer/internal trace 樣式差異仍需在正式檔案 writer 前實測。
- renderer static guard 目前是 local command，尚未接 CI / test script。
- token guard 仍是 TypeScript module runtime guard；正式 writer 前仍需保留 static guard 與 User-triggered Review result。

### BudgetOutputSnapshot / renderer 影響

- `BudgetOutputSnapshot` 已成為成品物流的 frozen boundary。
- `RenderedBudgetDocument` 是 snapshot 轉出後的 renderer-safe document。
- `renderSnapshot()` 可輸出 `structured_rows`、`html_skeleton`、`csv_skeleton`。
- `renderFormalBudgetDocument()` 是 formal Excel / PDF skeleton 的正式入口 scaffold。
- formal Excel / PDF skeleton 現在必須攜帶 formal entry 建立的 token；舊 string marker 不足以通過。
- formal file writer preflight 只能接受 `renderFormalBudgetDocument()` 產出的 gated structured document。
- fixed fixture `BudgetOutputSnapshot` 可供 renderer / preflight demo 使用，避免驗證流程重新跑 budget engine。
- invalid formal document fixtures 可驗證 malformed input 不 throw。
- dry-run writer 只回傳 `valid`、`would_write`、audience、format、filename、storage target、snapshot id、row count、total amount、preflight errors / warnings 與 artifact policy id。
- controlled writer entry 只接受 preflight 通過的 gated structured document；preflight invalid 會 blocked，不產生 manifest 或檔案。
- artifact manifest 的 security flags 固定記錄 `snapshot_only`、`preflight_passed`、`engine_not_called`、`pricing_not_called`、`material_resolver_not_called`、`rag_not_called`、`ai_not_called`、`legacy_output_not_used`。
- renderer gate 會 fresh validate snapshot；invalid snapshot 必須拒絕輸出。
- renderer-only gate 不接受 `methodSpecCatalog`。
- formal renderer entry runtime 拒絕 unknown audience、unknown format、unknown layout_profile。
- renderer static guard 已禁止正式 renderer path import 或使用 `budget-generator`、`generateBudgetEstimate`、`mock-pricing`、`seed-budget-catalog`、`material-code-resolver`、`format-budget-output`、`LEGACY_BUDGET_OUTPUT_WARNING`、`rag`、`ai`、`openai`。
- renderer static guard 已補 dynamic import、require、path alias、cross-file re-export 與全文掃描。
- renderer static guard report 已改列 `forbidden_rules_checked`，並標示 rule type：`full_text`、`import_pattern`、`restricted_usage`。
- renderer static guard 會檢查 `createFormalRendererToken()` restricted usage，避免 file writer / preflight / dry-run 自行建立 token。
- renderer static guard 已新增 workbook-style library 與 file write escape 掃描：workbook token、`xlsx` package import、`pdfkit`、`jspdf`、`puppeteer`、`playwright`、`html-pdf`、非 placeholder writer 的 `writeFileSync` / `createWriteStream`。
- 成品物流不得重新跑 budget engine。
- 成品物流不得讀 pricing rules。
- 成品物流不得讀 material resolver。
- 成品物流不得修改 MethodSpecCatalog。
- 成品物流不得接 RAG / AI API。
- 成品物流不得使用 legacy `formatBudgetOutput()` 作正式來源。

### 對 customer output 的影響

- customer output 只讀 `snapshot.customer_view` 或 snapshot-gated `RenderedBudgetDocument`。
- customer structured rows 欄位只包含傳統預算表單安全欄位：工程類別、項次、品名、單位、數量、單價、金額、備註。
- formal customer layout 只允許 `trade_category`、`line_no`、`item_name`、`unit`、`quantity`、`unit_price`、`amount`、`customer_note`。
- customer renderer 不讀 `snapshot.internal_view`。
- customer output 不應包含 `source_id`、`recipe_id`、`quantity_formula`、`material_code`、`internal_note`、`price_source`、`confidence`、`requires_review` 等 internal trace fields。
- customer warning sanitizer 會將含 internal trace key 的 warning 改為安全提示。
- formal file writer preflight 會拒絕 customer artifact rows 或 layout 出現 internal trace 欄位。
- formal customer layout 已確認中文欄名、欄寬、頁首頁尾、合計區、備註區與簽核欄的 metadata。

### 對 internal trace output 的影響

- internal trace output 可讀 `snapshot.internal_view`。
- internal trace renderer 保留每列追溯欄位：`item_code`、`source_type`、`source_id`、`recipe_id`、`material_code`、`quantity_formula`、`price_source`、`confidence`、`requires_review`、`internal_note`。
- internal trace output 可保留 inclusions、exclusions、assumptions、risks 與完整 warnings。
- formal internal trace layout 可保留追溯欄位，並明確標示 `internal_trace` audience。
- formal file writer preflight 允許 internal trace warnings 保留完整追溯資訊。
- internal trace output 只負責輸出與稽核追溯，不得重新估價。
- internal trace output 不得回頭查 pricing rules、material resolver 或 MethodSpecCatalog。

### 風險

- 若成品物流重新跑 budget engine，標記 High Risk。
- 若成品物流直接讀 pricing rules 或 material resolver，標記 High Risk。
- 若成品物流修改 MethodSpecCatalog，標記 High Risk。
- 若成品物流接 RAG / AI API，標記 High Risk。
- 若成品物流使用 legacy `formatBudgetOutput()` 作正式來源，標記 High Risk。
- 若 customer output 洩漏 internal trace fields，標記 High Risk。
- 若正式 Excel / PDF writer 繞過 `BudgetOutputSnapshot`、`assertSnapshotRenderableForRenderer()` 或 `renderFormalBudgetDocument()`，標記 High Risk。
- 若 static guard 未被納入正式 writer 前檢查，仍有 import 邊界退化風險。
- formal renderer token 仍屬 TypeScript module runtime guard，無法形成絕對私有能力；正式 writer 前仍需保留 static guard 與 User-triggered Review result。
- Phase 3.5 controlled writer entry 目前只產生 manifest-only result；正式 `.xlsx` / `.pdf` library 接入時仍需再次審查。

### 是否 ready for phase review

Yes，成品物流：預算表單輸出倉庫已可進入 phase review。

備註：ready 範圍限 `BudgetOutputSnapshot`、`RenderedBudgetDocument`、customer/internal view、renderer gate、structured rows、HTML / CSV skeleton、Excel / PDF formal entry skeleton、layout contract、formal artifact policy、file-writer preflight、dry-run、controlled writer entry、artifact manifest、local staging policy、placeholder writer guard 與 static guard；不代表正式 `.xlsx` / `.pdf` 檔案輸出已完成。

---

## 三倉庫統一收尾檢查

- 三倉庫階段收尾時，必須說明輸入資料來自哪裡、輸出資料交給哪裡。
- 若任務跨倉庫，必須列出每個倉庫的責任邊界與交接資料。
- Phase Review 必須檢查三倉庫是否越界。
- 成品物流只能讀 BudgetOutputSnapshot / RenderedBudgetDocument。
- 成品物流不得重新跑 budget engine。
- 成品物流不得讀 pricing rules / material resolver。
- 成品物流不得修改 MethodSpecCatalog。
- 成品物流不得接 RAG / AI API。
- 成品物流不得使用 legacy formatBudgetOutput() 作為正式來源。

---

## Web Flow Builder UX / Web Design Logic Notes

本區補充 Phase Review Packet 中 LAIBE_WEB_FLOW_BUILDER 成果的 UX / Web Design Logic Notes，供 LAIBE_REVIEWER 後續執行 UX Flow Review。

### 頁面角色變化

- 本輪新增制度要求 Web Flow Builder 在修改 landing / onboarding / plan-puzzle / budget-system / dashboard 相關頁面時，同步確認頁面角色是否清楚。
- 後續審查需檢查 onboarding、工具頁、budget-system 與 dashboard 是否被混在同一層級或同一工具區。

### CTA 變化

- 新增 `AI_RULES/CTA_FLOW_MAP.md` 作為 CTA 行動線登錄來源。
- 後續新增或修改 CTA 時，需登錄出現頁面、文案、類型、目標、目的、狀態與風險。

### Header / nav 變化

- 新增 `AI_RULES/PAGE_REGISTRY.md` 與 `AI_RULES/CTA_FLOW_MAP.md` 後，Header tools 需對齊已登錄頁面與工具入口。
- 外部工具入口不得填假連結，不得把 placeholder 偽裝成 active 完成功能。

### Progress bar 變化

- 後續 progress bar 節點需對應 PAGE_REGISTRY 中的真實頁面或真實流程狀態。
- 若節點不可點，應在 UI 上呈現為非互動狀態。

### 排版或資訊層級變化

- 本輪只更新 Markdown 規則，未修改實際畫面。
- 排版、視覺層級、手機版 CTA 可見性與資訊擁擠程度尚未驗證。

### 是否需要截圖驗證

- 需要。
- 若 LAIBE_REVIEWER 執行 UX Flow Review，沒有截圖、實機畫面或 HTML 內容時，需標示排版細節無法確認。

### 是否可供使用者主動觸發 UX Flow Review

- 需要。
- Web Flow Builder 成果進入 Phase Review 時，Reviewer 應參考 `AI_RULES/UX_FLOW_REVIEW_RULES.md`、`AI_RULES/PAGE_REGISTRY.md`、`AI_RULES/CTA_FLOW_MAP.md` 與 `AI_RULES/ROUTING_RULES.md`。

## 本次整合說明

- 已補充 Web Flow Builder UX / Web Design Logic Notes，並記錄 PAGE_REGISTRY、CTA_FLOW_MAP 與 UX Flow Review 對 Phase Review 的影響。

---

## AI_ARCHITECT_CORE 補充成果：UX Flow Review 與頁面鏈接登錄制度

### 完成事項

- 新增 `AI_RULES/UX_FLOW_REVIEW_RULES.md`，定義 LAIBE_REVIEWER 對頁面角色、CTA 邏輯、排版邏輯、Header / Nav、Progress bar 與 AI Studio-like link precision 的審查標準。
- 新增 `AI_RULES/PAGE_REGISTRY.md`，作為萊比 MVP 頁面角色、入口、出口、主 CTA、次 CTA、返回邏輯與狀態的登錄來源。
- 新增 `AI_RULES/CTA_FLOW_MAP.md`，作為萊比 MVP CTA 文案、類型、目標、目的、狀態與風險的登錄來源。
- 更新 Reviewer、Web Flow Builder、Routing、Review Checklist 與 Task Dispatch 規則，將 UX Flow Review、PAGE_REGISTRY、CTA_FLOW_MAP 納入 Web Flow 任務與審查。
- 更新 `templates/PHASE_REVIEW_PACKET_TEMPLATE.md`，在 Web Flow Builder 區段加入 UX / Web Design Logic Notes。

### 修改檔案

- `AGENTS.md`
- `AI_RULES/LAIBE_REVIEWER_RULES.md`
- `AI_RULES/LAIBE_WEB_FLOW_BUILDER_RULES.md`
- `AI_RULES/ROUTING_RULES.md`
- `AI_RULES/REVIEW_CHECKLIST.md`
- `AI_RULES/TASK_DISPATCH_RULES.md`
- `templates/PHASE_REVIEW_PACKET_TEMPLATE.md`
- `docs/CURRENT_PHASE_REVIEW_PACKET.md`
- `docs/NEXT_CODEX_HANDOFF.md`

### 新增檔案

- `AI_RULES/UX_FLOW_REVIEW_RULES.md`
- `AI_RULES/PAGE_REGISTRY.md`
- `AI_RULES/CTA_FLOW_MAP.md`

### 未完成事項

- PAGE_REGISTRY 目前使用待確認路徑，尚未由 Web Flow Builder 依實際檔案路徑補齊。
- CTA_FLOW_MAP 目前使用待確認實際路徑，尚未由 Web Flow Builder 依實際 CTA 實作補齊。
- 尚未由 LAIBE_REVIEWER 以截圖、HTML 或實機畫面執行正式 UX Flow Review。

### 規則 / templates 影響

- Web Flow Builder 修改頁面、CTA、header、progress bar 或 routing 時，需同步檢查 PAGE_REGISTRY、CTA_FLOW_MAP、ROUTING_RULES 與 UX_FLOW_REVIEW_RULES。
- LAIBE_REVIEWER 審查 Web Flow Builder 成果或使用者要求網頁設計邏輯審查時，需執行 UX Flow Review。
- Phase Review Packet 後續可記錄頁面角色變化、CTA 變化、Header / nav 變化、Progress bar 變化、排版或資訊層級變化，以及是否需要截圖驗證。

### 已知風險

- 目前 PAGE_REGISTRY 與 CTA_FLOW_MAP 是初始登錄，不代表所有實際頁面與 CTA 已完成逐一盤點。
- 若缺少截圖、實機畫面或 HTML 內容，Reviewer 只能審查流程與文件邏輯，排版細節必須標示無法確認。

### 是否 ready for phase review

Yes。此治理制度可進入 LAIBE_REVIEWER 的 Phase Review；但實際頁面路徑與 CTA 精準對應仍需後續由 Web Flow Builder 補登錄。

---

## Conditional Pass Cleanup Notes

本區回應 LAIBE_REVIEWER 本階段總審查的 Conditional Pass，作為本 Phase Review Packet 的最新清理說明。

### 過期或需改讀的敘述

- 本檔前段仍保留多輪 Builder / AI_ARCHITECT_CORE 的歷史成果紀錄，其中部分內容是階段歷程，不應被視為最新可施工指令。
- 若本檔與 `docs/NEXT_CODEX_HANDOFF.md` 對同一事項描述不同，後續接續工作應優先讀取 `docs/NEXT_CODEX_HANDOFF.md` 的最新操作限制，再回到本檔查 Phase Review 背景。
- 本檔中提到「可進入下一階段」的語句，只代表對應階段資料已可交 Reviewer 判讀，不代表可進入 production、真 API、正式金流、正式報價或正式檔案輸出。

### File Ownership 對帳

- 本輪已新增 `docs/FILE_OWNERSHIP_RECONCILIATION.md`。
- 該文件已整理目前 `git status` 中的 D / M / ?? 類型，並區分本階段治理成果、舊有 dirty 狀態、封存搬移與未確認風險。
- 本輪沒有還原檔案、沒有刪檔、沒有執行 `git clean`、沒有執行 `git reset`。

### Plan-puzzle .pc converter 狀態

- plan-puzzle `.pc` converter / Plancraft+ bridge 仍是 spike / proof-of-concept。
- 目前不得標記為 production-ready。
- 目前不得宣稱已完成正式 Plancraft `.pc` round-trip、正式 renderer integration 或正式 CAD-grade converter。
- 後續若要推進 production converter，必須另開明確任務，並由對應 Builder 小步施工；若使用者要求正式驗收，可交由 LAIBE_REVIEWER 審查。

### 預算三倉庫狀態

- 三倉庫目前已完成治理邊界建立：
  - 配件倉庫：工法與規格
  - 原物料採購與倉儲
  - 成品物流：預算表單輸出
- 三倉庫各自成果仍需維持邊界，不得用「預算生成 Builder」泛稱混處所有預算任務。
- 配件倉庫不得越界修改 renderer / Excel / PDF / CSV / HTML 輸出層。
- 原物料採購與倉儲不得越界修改 MethodSpec 主規則或 output renderer。
- 成品物流只能讀 `BudgetOutputSnapshot` / `RenderedBudgetDocument`，不得重新跑 budget engine、不得讀 pricing rules、不得讀 material resolver、不得修改 MethodSpecCatalog、不得接 RAG / AI API、不得使用 legacy `formatBudgetOutput()` 作為正式來源。

### Excel / PDF writer 狀態

- 成品物流正式 Excel / PDF writer 前仍需專門 LAIBE_REVIEWER 審查結果。
- 目前任何 Excel / PDF skeleton、formal renderer entry、file writer preflight 或 renderer guard 都不等於正式 `.xlsx` / `.pdf` 檔案輸出已 production-ready。
- 若後續要進入正式 Excel / PDF writer，必須確認：
  - input 僅來自 `BudgetOutputSnapshot` / `RenderedBudgetDocument`
  - renderer 未重新跑 budget engine
  - renderer 未讀 pricing rules / material resolver
  - renderer 未使用 legacy `formatBudgetOutput()` 作為正式來源
  - LAIBE_REVIEWER 已針對正式 writer 任務給出通過結論

### Template 亂碼修復

- 本輪已修復以下模板中文亂碼：
  - `templates/CODEX_BUILDER_TASK_TEMPLATE.md`
  - `templates/LAIBE_WEB_FLOW_BUILDER_TASK_TEMPLATE.md`
  - `templates/LAIBE_TASK_BRIEF_TEMPLATE.md`
  - `templates/PHASE_REVIEW_PACKET_TEMPLATE.md`
  - `templates/PHASE_REVIEWER_PROMPT_TEMPLATE.md`
  - `templates/LAIBE_VISUAL_SIM_TASK_TEMPLATE.md`
- 本輪未新增額外模板。

### Ready For Follow-up Review

Conditional Pass 的治理層修正已完成到可回交 LAIBE_REVIEWER 複查的狀態。

---

## 本聊天室補充：Landing / Onboarding / Header / CTA / Routing 階段成果

本區只整理本聊天室負責範圍：landing、onboarding、header、CTA、routing、progress bar、dashboard flow、頁面連接。  
本區不涵蓋 budget-system、specDB、renderer、plan-puzzle engine、真上傳、真 AI API、payment / escrow / listing fee。

### 完成事項

- Landing：已將黑底、水泥紋理、金屬玻璃質感實驗首頁升級為正式首頁。
- Landing：正式首頁已採用 `Laibe Offer` logo、黑底 header、發案方 / 接案方入口、我有帳號入口，以及首頁 Hero 成果卡 carousel。
- Landing：正式首頁 Hero 已加入左上主張文案：
  - 甲方別再盲問報價，
  - 乙方別再白做估價。
  - 萊比先把圖面、需求與規格整理清楚，再讓詢價、招標與比較開始。
- Landing：正式首頁保留 mock / placeholder 邊界；未接真上傳、真 AI API、真 payment、escrow、listing fee 或 fund release。
- Onboarding：已選定 `onboard_ai_agent/code.html` 作為甲方 / 業主第一步需求整理頁。
- Onboarding：頁面主角已從一般「AI 引導官」改為「AI 書記官」輸入框與終端機風格需求成果筆記。
- Onboarding：主標改為強調需求輸入品質與後續平面圖 / 預算精準度的關係。
- Onboarding：輸入框保留首頁同款邏輯：左側 `+`、中間動態輸入文字、右側送出箭頭；仍為前端 mock。
- Onboarding：筆記輸出框改為需求成果整理，而不是提問大綱，包含房屋現況坪數、格局、裝修範圍、工程概述與下一步。
- Header：正式首頁與 onboarding 均使用 `../../../assets/logo/laibe_offer.svg` 作為 logo。
- Header：onboarding header 已移除發案方 / 接案方入口 icon，因本頁已是甲方入口後的需求整理頁。
- CTA：onboarding 底部已移除「開始 AI 引導」「先看報價健檢」兩顆舊 CTA。
- CTA：onboarding 需求成果筆記下方保留兩個下一步入口：
  - 問答完成，進入平面拼圖
  - 已有平面圖，直接進入預算生成
- Routing：正式首頁中的工具 / 入口仍以 static prototype 路徑與 placeholder hash 為主；未接真 route system。
- 頁面連接：onboarding 已可接往 `preview_floor_plan/code.html` 與 `preview_budget/code.html`。

### 修改檔案

- `src/stitch_laibe_landing_onboarding/laibe_landing_desktop/code.html`
- `src/stitch_laibe_landing_onboarding/onboard_ai_agent/code.html`
- `docs/CURRENT_PHASE_REVIEW_PACKET.md`

### 新增檔案

- `src/stitch_laibe_landing_onboarding/laibe_landing_desktop/code.backup_before_black_cement_home.html`

### 未完成事項

- Landing 的部分入口仍是 placeholder hash 或 static prototype anchor，尚未全部接成正式 route。
- Onboarding 的輸入框、上傳、送出與 AI 書記官回應仍是前端 mock，未接後端、真上傳或真 AI API。
- Onboarding 的「需求成果整理」目前是展示用靜態筆記，尚未由真問答狀態動態生成。
- Dashboard flow 尚未正式施工；目前仍只完成 landing / onboarding 到平面拼圖與預算生成的前段連接。
- Progress bar 本聊天室未新增新實作；既有 progress bar 仍主要存在於平面拼圖 / 相關流程頁，尚未統一到所有頁。
- 手機版完整視覺與所有 CTA 點擊狀態尚未做本階段最終 phase review。

### Routing / CTA / Header 影響

- Landing header：
  - 使用 `assets/logo/laibe_offer.svg`。
  - 保留發案方 / 接案方入口 icon，因首頁是雙角色入口。
  - 保留工具、流程、關於萊比、PCM 後台、我有帳號等導覽。
- Onboarding header：
  - 使用同一 logo 與黑底 header 語言。
  - 移除發案方 / 接案方入口 icon，避免在甲方入口後重複角色選擇。
  - 保留工具、流程、關於萊比、PCM 後台、我有帳號。
- Onboarding routing：
  - `../preview_floor_plan/code.html`
  - `../preview_budget/code.html`
- CTA 影響：
  - 本聊天室沒有接真上傳、真 AI 或真金流。
  - Placeholder hash 仍應視為 prototype route，不可在 phase review 中判定為正式完成 route。
- Dashboard flow：
  - 本聊天室尚未把 dashboard / owner portal / vendor portal 正式串成完整主線。
  - dashboard 相關頁仍需後續獨立任務決定是否納入 MVP 主線。

### 已知風險

- 正式首頁已由實驗頁升級而來，雖已能作展示母版，但部分 CTA 仍是 placeholder，Reviewer 應把它視為「視覺與主敘事完成，route 尚未全正式化」。
- Onboarding 的 AI 書記官輸入與筆記仍是 mock，若文案或 UI 暗示真 AI / 真上傳，需在後續修正。
- Logo、header 與導覽已調整多輪，若後續再同步到其他頁，應以首頁與 onboarding 目前版本為母版，不要混回舊白底 / 彩色卡片風。
- Dashboard flow 尚未接上，若 phase review 要審 dashboard，需另列 dashboard 專屬施工範圍。
- 不得把目前 mock payment / listing fee / escrow / fund release 寫成正式服務。

### 是否 ready for phase review

Conditional ready。

- Landing 與 onboarding 的視覺方向、header 母版、前段 CTA 與頁面連接已可進入 phase review。
- Routing / CTA 尚未全部正式化，因此 phase review 應標示為「可審查目前階段成果，但不代表完整網站流程全通」。
- Dashboard flow、progress bar 全站一致性、手機版完整 QA 與 placeholder route 收斂仍需下一階段處理。
