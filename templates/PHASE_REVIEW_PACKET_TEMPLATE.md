# PHASE REVIEW PACKET TEMPLATE

此模板用於整理萊比專案階段總審查資料。

請將本階段各聊天室成果集中整理到 `docs/CURRENT_PHASE_REVIEW_PACKET.md`。

---

## Phase Name

[填入本階段名稱]

---

## Review Date

[填入日期]

---

## Included Chatrooms / Roles

請列出本階段包含哪些聊天室：

- AI_ARCHITECT_CORE
- LAIBE_WEB_FLOW_BUILDER
- 平面拼圖 Builder
- 配件倉庫：工法與規格
- 原物料採購與倉儲
- 成品物流：預算表單輸出
- LAIBE_VISUAL_SIM
- 其他

---

## Phase Goal

[本階段目標]

---

## AI_ARCHITECT_CORE 成果

### 完成事項

### 修改檔案

### 新增檔案

### 未完成事項

### 規則 / templates 影響

### 風險

---

## LAIBE_WEB_FLOW_BUILDER 成果

### 完成事項

### 修改檔案

### 新增檔案

### 未完成事項

### Routing / CTA / Header 影響

### UX / Web Design Logic Notes

請記錄：

- 頁面角色變化
- CTA 變化
- Header / nav 變化
- Progress bar 變化
- 排版或資訊層級變化
- 是否需要截圖驗證
- 是否可供使用者主動觸發 UX Flow Review

### 風險

---

## 平面拼圖 Builder 成果

### 完成事項

### 修改檔案

### 新增檔案

### 未完成事項

### Plan-puzzle 資料影響

### 風險

---

## 配件倉庫：工法與規格 成果

### 完成事項

### 修改檔案

### 新增檔案

### 未完成事項

### MethodSpec / 工法與規格資料影響

### 對 budget-system 的影響

### 對成品物流 / output system 的影響

### 風險

---

## 原物料採購與倉儲 成果

### 完成事項

### 修改檔案

### 新增檔案

### 未完成事項

### 原物料 / 採購 / 倉儲資料影響

### 對 MethodSpecCatalog 的影響

### 對 budget-system 的影響

### 風險

---

## 成品物流：預算表單輸出 成果

### 完成事項

### 修改檔案

### 新增檔案

### 未完成事項

### BudgetOutputSnapshot / renderer 影響

### 對 customer output 的影響

### 對 internal trace output 的影響

### 風險

---

## LAIBE_VISUAL_SIM 成果

### 完成事項

### 產出素材 / prompt

### 對應網站位置

### 不可宣稱事項

### 風險

---

## Cross-Chatroom Notes

請記錄跨聊天室需要注意的地方：

- 是否有流程衝突
- 是否有命名衝突
- 是否有資料模型衝突
- 是否有 handoff 不一致
- 是否有同一問題被不同聊天室用不同方式處理

---

## Known Issues

### 已確認問題

### 疑似問題

### 尚未驗證問題

---

## Review Status

請選一個：

- Draft，尚未準備審查
- Ready for user-triggered review
- Reviewed
- Needs update before review

注意：
此狀態只是供使用者判斷是否要主動啟動 LAIBE_REVIEWER。
它不會自動觸發審查。

Builder / Codex 不得在每次任務完成後要求使用者交給 LAIBE_REVIEWER。
Builder 只能標示成果是否已整理、是否可供使用者後續主動審查。
是否啟動 LAIBE_REVIEWER，由使用者決定。

---

## Do Not Touch

本階段仍禁止：

- `git clean`
- `git reset`
- 未授權修改 plancraft
- 未授權新增 framework / package
- 未授權刪除檔案
- 未授權大範圍重構
- 成品物流未授權重新跑 budget engine
- 成品物流未授權讀 pricing rules / material resolver
- 成品物流使用 legacy `formatBudgetOutput()` 作為正式來源

---

## Ready For Phase Review

請選一個：

- Yes
- No

若 No，請說明原因。
