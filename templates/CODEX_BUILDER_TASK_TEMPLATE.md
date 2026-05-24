# CODEX BUILDER TASK TEMPLATE

此模板用於所有萊比 Builder / Codex 施工任務。
每次開工前，請複製本模板並填入本輪任務。

---

## 開工指令

請全程使用中文回覆。

你現在是萊比專案的 Builder / Codex 施工者。
本輪請依照指定任務小步施工，不要擴大範圍，不要自行重構，不要修改未授權檔案。

---

## 必讀文件

開始前請依序閱讀：

1. AGENTS.md
2. AI_RULES/SYSTEM_ARCHITECTURE.md
3. AI_RULES/ROUTING_RULES.md
4. AI_RULES/CODEX_MANDATORY_ENTRY.md
5. AI_RULES/FILE_OWNERSHIP_RULES.md
6. AI_RULES/REVIEW_CHECKLIST.md
7. AI_RULES/HANDOFF_RULES.md
8. AI_RULES/LAIBE_BUILDER_RULES.md
9. AI_RULES/TASK_DISPATCH_RULES.md
10. docs/NEXT_CODEX_HANDOFF.md，若存在

若本輪是 Reviewer 任務，請改讀 `AI_RULES/LAIBE_REVIEWER_RULES.md`，不要使用本 Builder 模板施工。

---

## 本輪任務

[在此填入任務]

---

## 任務類型

請先判斷本輪屬於哪一類：

- Documentation Task
- Routing Task
- UI Task
- Data Model Task
- Bugfix Task
- Web Flow Builder Task
- Other

若是 Other，請說明原因。

---

## 允許修改範圍

本輪允許修改：

[填入允許修改的檔案或資料夾]

---

## 禁止修改範圍

本輪禁止修改：

- `src`，除非本輪明確授權
- `plancraft`，除非本輪明確授權
- `app`，除非本輪明確授權
- `components`，除非本輪明確授權
- `assets`，除非本輪明確授權
- `layout`，除非本輪明確授權
- `package.json`
- `node_modules`
- Vite / React / Next 相關設定
- git 設定
- 任務範圍外檔案

可依本輪任務補充其他禁止修改項目。

---

## 絕對禁止

- 不要 `git clean`
- 不要 `git reset`
- 不要 `git checkout` 還原未授權檔案
- 不要刪除檔案
- 不要新增 framework
- 不要 `npm install`
- 不要新增 React / Vite / Next / `package.json` / `node_modules`
- 不要重構核心 routing
- 不要重構 header architecture
- 不要重寫整個頁面
- 不要修改 plancraft 原始碼，除非本輪明確授權
- 不要把 placeholder 偽裝成已完成功能

---

## 執行要求

請依序執行：

1. 閱讀必讀文件
2. 確認本輪任務類型
3. 確認允許修改範圍
4. 確認禁止修改範圍
5. 小步修改
6. 自我檢查
7. 更新 `docs/NEXT_CODEX_HANDOFF.md`，若符合更新條件
8. 更新 `docs/CURRENT_PHASE_REVIEW_PACKET.md`，若本輪屬於階段成果
9. 使用固定格式回報

---

## 若涉及 Routing / CTA / Header

若本輪涉及 routing / CTA / header / progress bar / 返回按鈕，請檢查：

- 是否有 dead CTA
- 是否有 orphan page
- 是否有錯誤跳轉
- 是否有 `href="#"`
- 是否有 `href=""`
- 是否有可點但無作用 button
- 返回邏輯是否合理
- Header tools 是否一致
- 是否破壞主流程
- `AI_RULES/PAGE_REGISTRY.md` 是否有對應頁面
- `AI_RULES/CTA_FLOW_MAP.md` 是否有對應 CTA

萊比主流程固定為：

landing
→ onboarding
→ plan-puzzle
→ budget-system
→ dashboard

---

## 若涉及資料模型

若本輪涉及資料模型，請檢查是否影響：

- LayoutObject
- Room
- QuantityFact
- SVG object
- BudgetItem
- QuoteItemTemplate
- MethodRecipe
- MaterialSpec
- LaborRule
- NoteTemplate
- PricingRule

不得未授權改變欄位語意。
不得破壞既有資料相容性。

---

## REVIEW_READY_SUMMARY

所有 Builder / Codex 施工任務完成後，應整理 `REVIEW_READY_SUMMARY`，但不會自動觸發審查。

Builder / Codex 不得在每次任務完成後要求使用者交給 LAIBE_REVIEWER。
Builder 只能標示成果是否已整理、是否可供使用者後續主動審查。
是否啟動 LAIBE_REVIEWER，由使用者決定。

Builder self-check 不等於 LAIBE_REVIEWER 正式審查。
Builder 不得自行宣告「LAIBE_REVIEWER 已通過」。

```md
## REVIEW_READY_SUMMARY_START

### 任務名稱

### 任務類型

### Builder 聊天室 / 角色

### 修改檔案

### 新增檔案

### 未修改檔案確認

### 是否有功能程式碼改動

### 是否涉及 routing / CTA / header

### 是否涉及資料模型

### 是否涉及敏感區域

### 是否修改 plancraft

### 是否新增 framework / package

### 是否更新 handoff

### Handoff 實際更新段落

### Diff 摘要

### Builder 自我檢查結果

### 已知風險

### 可供使用者主動審查的重點

## REVIEW_READY_SUMMARY_END
```

若 Builder 任務完成後發現 High Risk 條件，例如未授權修改 plancraft、未授權修改 src、修改任務外檔案、新增 framework、`npm install`、`git clean`、`git reset`、刪除檔案、破壞 routing、破壞資料模型，Builder 不得宣告任務完成，必須標記為「需要使用者確認；可供使用者後續主動審查」。

---

## 完成後回報格式

請用以下格式回報：

## 本輪任務

## 任務類型

## 已完成

## 修改檔案

## 新增檔案

## 未修改檔案

## 是否有功能程式碼改動

## 是否涉及 routing / CTA / header

## 是否涉及資料模型

## 是否修改 plancraft

## 是否新增 framework / package

## 是否更新 docs/NEXT_CODEX_HANDOFF.md

## 是否更新 docs/CURRENT_PHASE_REVIEW_PACKET.md

## 自我檢查結果

## 已知風險

## 未完成事項

## 下一步建議

## REVIEW_READY_SUMMARY_START

[貼上 Review-ready Summary]

## REVIEW_READY_SUMMARY_END
