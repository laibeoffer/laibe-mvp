# CODEX_MANDATORY_ENTRY

本文件定義 Codex 每次任務的標準開工流程、任務分派、預設允許事項、預設禁止事項、執行風格、完成檢查與最終回報格式。

## Task Dispatch Before Work

任何 Codex 任務開始前，必須先判斷任務應歸類為：

- Builder Task
- Reviewer Task
- Architect / Governance Task
- Documentation Task
- Routing / CTA Task
- Data Model Task
- Sensitive Task
- Blocked Task
- Visual Simulation Task

若任務是 Visual Simulation Task，不應由 Codex 直接施工。
應交給 LAIBE_VISUAL_SIM 產出 visual brief / prompt。
若後續需要放入網站，再交給 Builder 使用 CODEX_BUILDER_TASK_TEMPLATE.md 小步整合。
Visual Simulation Task 必須參考 `AI_RULES/LAIBE_VISUAL_SIM_RULES.md` 與 `docs/LAIBE_VISUAL_SIM_CHATROOM.md`。
所有模擬圖只能作為案件上架與風格溝通輔助，不得宣稱為施工圖、正式設計圖、真實案例、正式報價依據或完工保證。

若任務屬於 Sensitive Task 或 Blocked Task，Codex 不得直接施工，必須在回報中說明原因。

任務分派必須依照 `AI_RULES/TASK_DISPATCH_RULES.md` 判斷。
若任務類型不明確，必須先完成分派判斷，不得直接施工。

## Builder Required Reading

若任務角色是 Builder / Codex 施工者，必須同時閱讀：

- AGENTS.md
- docs/LAIBE_CODEX_STRATEGIC_PLAN.md
- AI_RULES/SYSTEM_ARCHITECTURE.md
- AI_RULES/ROUTING_RULES.md
- AI_RULES/CODEX_MANDATORY_ENTRY.md
- AI_RULES/FILE_OWNERSHIP_RULES.md
- AI_RULES/REVIEW_CHECKLIST.md
- AI_RULES/HANDOFF_RULES.md
- AI_RULES/TASK_DISPATCH_RULES.md
- AI_RULES/LAIBE_BUILDER_RULES.md
- NEXT_CODEX_HANDOFF.md，若存在
- docs/NEXT_CODEX_HANDOFF.md，若存在且根目錄 handoff 不存在

Builder 開工前必須明確判斷：

- 本輪任務類型
- 本輪允許修改範圍
- 本輪禁止修改範圍
- 是否涉及 routing / CTA / header
- 是否涉及資料模型
- 是否涉及 plancraft
- 是否需要更新 handoff
- 是否需要交給 LAIBE_REVIEWER 審查

## 1. Mandatory Start Reading

開始任何修改前必須先閱讀：

1. AGENTS.md
2. docs/LAIBE_CODEX_STRATEGIC_PLAN.md
3. AI_RULES/SYSTEM_ARCHITECTURE.md
4. AI_RULES/ROUTING_RULES.md
5. AI_RULES/FILE_OWNERSHIP_RULES.md
6. AI_RULES/REVIEW_CHECKLIST.md
7. AI_RULES/HANDOFF_RULES.md
8. AI_RULES/TASK_DISPATCH_RULES.md
9. AI_RULES/LAIBE_BUILDER_RULES.md，若為 Builder / Codex 施工任務
10. AI_RULES/LAIBE_REVIEWER_RULES.md，若為 Reviewer 任務
11. NEXT_CODEX_HANDOFF.md，若存在
12. docs/NEXT_CODEX_HANDOFF.md，若存在且根目錄 handoff 不存在

若任務涉及 budget-system，還必須讀取 `docs/budget/`。

## 2. Start Confirmation

開始前必須確認：

- 本次任務允許修改的檔案範圍。
- 本次任務禁止修改的檔案範圍。
- 本次任務是文件任務、UI 任務、routing 任務、資料模型任務，還是 bugfix 任務。
- 本次任務是否屬於 Sensitive Task 或 Blocked Task。
- 是否會影響其他子系統。
- 是否需要 reviewer。
- 是否可能造成架構漂移。
- 是否需要更新 handoff。
- 是否涉及 secrets、payment、escrow、AI API、upload、plancraft、header、routing 或資料模型。

若任務描述不清楚，且可能造成大範圍改動，應先回報疑點，不得直接重構。

## 3. Default Allowed Actions

預設允許：

- 小範圍修改現有 HTML / CSS / JS。
- 修正明確錯誤連結。
- 補充註解。
- 更新 Markdown 文件。
- 更新 NEXT_CODEX_HANDOFF.md。
- 新增明確要求的文件。
- 修正 typo。
- 做不破壞現有架構的小型整理。

若使用者本輪明確限制只允許 Markdown，則以上 HTML / CSS / JS 允許事項暫停，必須遵守當前任務限制。

## 4. Default Forbidden Actions

預設禁止：

- 新增 framework。
- 新增 package manager。
- npm install。
- 重構整個頁面。
- 大量搬移檔案。
- 刪除功能。
- 重寫核心資料模型。
- 修改 plancraft 原始碼。
- 修改任務範圍外檔案。
- 變更專案主流程。
- 變更產品定位。
- 偽造外部連結。
- 將 placeholder 當成已完成功能。
- git clean。
- git reset。
- git checkout 還原使用者未授權檔案。

## 5. Execution Style

執行風格：

- 先理解現有檔案，再修改。
- 修改越小越好。
- 保持原本風格。
- 不主動美化不相關區域。
- 不加入過度抽象。
- 不把 MVP 改成大型正式系統。
- 不為了展示能力而增加複雜度。
- 不把文件任務擴張成功能實作。
- 不把 mock flow 誤接為 production flow。
- Builder / Codex 施工任務應優先使用 `templates/CODEX_BUILDER_TASK_TEMPLATE.md` 作為開工模板。
- 任務開始前建議使用 `templates/LAIBE_TASK_BRIEF_TEMPLATE.md` 先整理 task brief。

## 6. Stop Conditions

遇到以下情況必須停止並回報疑點：

- 任務要求與 `AGENTS.md` 或 `AI_RULES` 衝突。
- 任務分派結果是 Blocked Task。
- Sensitive Task 沒有使用者明確授權。
- 任務需要刪除、重命名、搬移大量檔案。
- 任務可能接入真實 payment、escrow、AI API、upload 或 production webhook。
- 任務可能修改 plancraft 原始碼。
- 任務可能重構核心 routing、header architecture 或既有資料模型。
- 任務可能改變萊比主流程或產品定位。
- 任務要求使用假外部連結或把 placeholder 包裝成完成品。

## 7. Completion Check

完成修改後必須檢查：

- 修改是否符合任務。
- 是否有任務外改動。
- 是否破壞 routing。
- 是否破壞 header。
- 是否產生 dead CTA。
- 是否產生 orphan page。
- 是否有 console error 風險。
- 是否需要更新 handoff。
- 是否有未完成 TODO。
- 是否有需要使用者人工確認的地方。
- 是否碰到被禁止的檔案或資料夾。
- 是否需要交給 LAIBE_REVIEWER 審查。
- 任務分派資訊是否已在 handoff 中記錄。

## 8. Final Report Format

一般最終回報格式必須包含：

1. 本輪任務
2. 已完成
3. 修改檔案
4. 新增檔案
5. 未修改檔案
6. 檢查結果
7. 已知風險
8. 未完成事項
9. 是否更新 NEXT_CODEX_HANDOFF.md
10. 下一步建議

Builder / Codex 施工任務必須使用 `AI_RULES/LAIBE_BUILDER_RULES.md` 的 Builder 固定回報格式。

不得只回答「完成」。

## 本次整合說明

- 已新增 `Task Dispatch Before Work`，規定任何 Codex 任務開始前必須先判斷任務分類。
- 已整合 `AI_RULES/TASK_DISPATCH_RULES.md` 至 Builder 必讀與 Mandatory Start Reading。
- 已規定 Sensitive Task 或 Blocked Task 不得直接施工，必須回報原因。
- 已保留既有 Builder Required Reading、預設允許 / 禁止、停止條件、完成檢查與回報格式。
