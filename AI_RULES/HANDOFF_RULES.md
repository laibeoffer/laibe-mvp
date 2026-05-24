# HANDOFF_RULES

## Review Readiness Language

handoff / phase packet 可以記錄成果是否可供後續審查，但不得把每個小任務都寫成必須立即審查。

Builder / Codex 不得在每次任務完成後要求使用者交給 LAIBE_REVIEWER。
Builder 只能標示成果是否已整理、是否可供使用者後續主動審查。
是否啟動 LAIBE_REVIEWER，由使用者決定。

建議用語：

- 可供後續審查
- 已整理進 Phase Review Packet
- 使用者可視需要交給 LAIBE_REVIEWER
- 若進入階段驗收，可由 LAIBE_REVIEWER 審查

避免用語：

- 要求立即審查
- 下一步一定是 Reviewer
- 未經 Reviewer 不可繼續
- 每次完成都要由使用者主動觸發審查

除非該項目是 High Risk 或使用者明確要求 User-triggered Review。

本規則優先於舊有 handoff 文字中的通用「必須由使用者主動觸發審查」語氣。

本文件定義 `NEXT_CODEX_HANDOFF.md` 的更新時機、位置、內容、寫作風格與回報規則。

## 1. Purpose

`NEXT_CODEX_HANDOFF.md` 是下一輪 Codex / ChatGPT / Reviewer 理解專案狀態的交接文件。

它不是日記，不是完整技術文件，不是聊天摘要。

它應該回答：

- 目前做到哪裡
- 哪些檔案被修改
- 哪些規則必須遵守
- 哪些問題尚未完成
- 下一步應該做什麼

## 2. When to Update

只要符合以下任一條件，就必須更新 `NEXT_CODEX_HANDOFF.md`：

- 修改 routing
- 修改 header
- 修改 CTA
- 修改主流程
- 修改資料模型
- 修改 budget-system
- 修改 plan-puzzle
- 修改 specDB
- 修改 dashboard
- 新增重要文件
- 新增 AI_RULES
- 新增或修改 AGENTS.md
- 新增或修改 templates
- 修正重要 bug
- 留下未完成事項

## 3. Handoff Location

優先使用根目錄：

- `NEXT_CODEX_HANDOFF.md`

若根目錄沒有該檔案，但存在：

- `docs/NEXT_CODEX_HANDOFF.md`

則沿用並更新 `docs/NEXT_CODEX_HANDOFF.md`。

不得因為一次任務建立多個新的 handoff 或 status MD。

## 4. Recommended Sections

`NEXT_CODEX_HANDOFF.md` 建議包含以下 sections：

- Current Status
- Last Completed Task
- Modified Files
- Added Files
- Do Not Touch
- Important Rules
- Known Issues
- Pending Tasks
- Recommended Next Step
- Notes for Reviewer

既有 handoff 若已有不同 section，可以保留，但新增內容必須清楚、短、可執行。

## 5. Task Dispatch Handoff Record

`NEXT_CODEX_HANDOFF.md` 若記錄 Builder / Reviewer / Architect 任務，應包含任務分派資訊：

- 任務類型
- 指派角色
- 是否可供使用者主動審查
- 是否涉及敏感區域
- 是否涉及 routing / CTA / header
- 是否涉及資料模型

若任務使用 `AI_RULES/TASK_DISPATCH_RULES.md` 完成分派，handoff 還應記錄：

- 是否允許施工
- 下一步由哪個角色處理

## 6. Builder Template Handoff Requirement

Builder 任務若使用 `templates/CODEX_BUILDER_TASK_TEMPLATE.md` 開工，完成後必須在 `NEXT_CODEX_HANDOFF.md` 中記錄：

- 本輪使用了 Builder template
- 本輪任務類型
- 本輪是否可供使用者後續主動審查
- 本輪是否涉及 routing / CTA / header
- 本輪是否涉及資料模型

若根目錄沒有 `NEXT_CODEX_HANDOFF.md`，但存在 `docs/NEXT_CODEX_HANDOFF.md`，則記錄於 `docs/NEXT_CODEX_HANDOFF.md`。

---

## Builder Review-ready Summary Handoff Requirement

所有 Builder / Codex 施工任務完成後，應整理 REVIEW_READY_SUMMARY，但不會自動觸發審查。

若本輪更新 handoff，REVIEW_READY_SUMMARY 必須包含：

- 是否更新 handoff
- Handoff 實際更新段落
- Handoff 中記錄的修改檔案
- Handoff 中記錄的新增檔案
- Handoff 中記錄的已知風險
- 是否可供使用者後續主動審查

REVIEW_READY_SUMMARY 是供使用者主動要求 LAIBE_REVIEWER 審查時使用的可複製摘要，不取代 `NEXT_CODEX_HANDOFF.md`。  
Builder 不得用 REVIEW_READY_SUMMARY 取代 handoff 更新義務。

---

## Phase Review Packet Requirement

若本輪成果屬於階段性成果，應更新 docs/CURRENT_PHASE_REVIEW_PACKET.md。

docs/NEXT_CODEX_HANDOFF.md 用於下一輪接續工作。  
docs/CURRENT_PHASE_REVIEW_PACKET.md 用於 LAIBE_REVIEWER 階段總審查。

兩者用途不同：

- NEXT_CODEX_HANDOFF.md：下一個 Builder / Codex 要知道什麼
- CURRENT_PHASE_REVIEW_PACKET.md：Reviewer 階段總審查要知道什麼

---

## Budget Three-Warehouse Handoff Requirement

若任務涉及預算生成系統三倉庫，handoff 必須標示：

- 本輪屬於哪個倉庫
- 是否跨倉庫
- 輸入資料來自哪裡
- 輸出資料交給哪裡
- 是否修改 MethodSpecCatalog
- 是否修改 material resolver / pricing rules
- 是否修改 BudgetOutputSnapshot / renderer
- 是否有越界風險

## Visual Simulation Handoff Requirement

若任務涉及 LAIBE_VISUAL_SIM 產出的素材，NEXT_CODEX_HANDOFF.md 應記錄：

- 模擬圖任務名稱
- 對應網站位置
- 建議檔名
- prompt 版本
- 是否已交給 Builder
- 是否已整合進網站
- 是否可供使用者主動審查
- 不可宣稱事項

不可宣稱事項至少必須包含：

- 模擬圖僅供案件上架與風格溝通輔助
- 不得宣稱為施工圖
- 不得宣稱為正式設計圖
- 不得宣稱為真實案例
- 不得作為正式報價依據
- 不得宣稱為完工保證

---

## Web Flow Builder Handoff Requirement

若本輪是 Web Flow Builder Task，NEXT_CODEX_HANDOFF.md 必須記錄：

- 本輪修改的頁面
- 本輪修改的 CTA
- 本輪修改的 routing
- 是否涉及 header
- 是否涉及 progress bar
- 是否涉及 dashboard flow
- 是否檢查 dead CTA / orphan page
- 是否可供使用者後續主動審查

---

## 7. Writing Style

handoff 寫作風格必須：

- 簡潔。
- 明確。
- 可執行。
- 不寫空話。
- 不寫過度長篇背景。
- 不混入猜測。
- 不隱藏風險。
- 不把未授權未來方向寫成已決策。

## 8. Do Not Touch Section

Do Not Touch section 至少應包含：

- 不要 git clean。
- 不要 git reset。
- 不要修改 plancraft。
- 不要新增 npm / React / Vite / package.json / node_modules。
- 不要修改任務範圍外檔案。

若 handoff 目前沒有獨立 Do Not Touch section，可在 Product Freeze Points、Notes For New Codex 或相近區塊補上，但內容必須能被下一輪任務看到。

## 9. Known Issues Rules

Known Issues section 必須分清楚：

- 已確認問題
- 疑似問題
- 尚未驗證問題

不得把尚未驗證的推測寫成事實。

## 10. Recommended Next Step Rules

Recommended Next Step 只能有 1 到 3 項，不可列出一長串模糊方向。

若既有 handoff 已有較長 Next Work 區塊，更新時應盡量縮短或補明優先順序，不要再擴張成長篇清單。

## Budget Three-Warehouse Integration Note

- 已補充 Budget Three-Warehouse Handoff Requirement。
- 預算生成系統三倉庫任務 handoff 必須標示倉庫、是否跨倉庫、輸入資料來源、輸出資料去向、是否修改 MethodSpecCatalog、是否修改 material resolver / pricing rules、是否修改 BudgetOutputSnapshot / renderer，以及是否有越界風險。

## 11. Final Report Requirement

更新 handoff 後，Codex 必須在最終回報中說明：

- 是否已更新 `NEXT_CODEX_HANDOFF.md`。
- handoff 新增了哪些重點。
- 是否有未完成事項。

## 本次整合說明

- 已補充 `NEXT_CODEX_HANDOFF.md` 若記錄 Builder / Reviewer / Architect 任務，應包含任務類型、指派角色、是否可供使用者主動審查、是否涉及敏感區域、是否涉及 routing / CTA / header、是否涉及資料模型。
- 已補充若任務使用 `AI_RULES/TASK_DISPATCH_RULES.md` 完成分派，handoff 應記錄是否允許施工與下一步由哪個角色處理。
- 已保留既有 handoff discipline：重要規則、流程、資料模型、AI_RULES、AGENTS.md、templates 改動必須更新 handoff，不新增多份 status MD。
