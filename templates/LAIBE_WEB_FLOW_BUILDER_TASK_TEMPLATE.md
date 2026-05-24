# LAIBE WEB FLOW BUILDER TASK TEMPLATE

此模板用於「網站主流程 Builder」。

適用任務：

- landing
- pre-landing
- onboarding
- header
- CTA
- routing
- progress bar
- dashboard flow
- 頁面之間的連接
- 返回按鈕
- 工具入口
- PAGE_REGISTRY / CTA_FLOW_MAP 維護

不適用：

- 平面拼圖核心功能
- 預算生成核心邏輯
- plancraft 原始碼
- specDB schema
- 模擬圖 prompt
- Reviewer 審查
- AI_RULES 制定

---

## 開工指令

請全程使用中文回覆。

你現在是萊比網站主流程 Builder。
本輪只處理 landing / onboarding / header / CTA / routing / progress bar / dashboard flow / 頁面連接相關任務。
不要擴大範圍。
不要改平面拼圖核心功能。
不要改預算生成核心邏輯。
不要改 plancraft。
不要新增 framework。
不要 `npm install`。
不要 `git clean`。
不要 `git reset`。

---

## 必讀文件

開始前請閱讀：

- AGENTS.md
- AI_RULES/SYSTEM_ARCHITECTURE.md
- AI_RULES/ROUTING_RULES.md
- AI_RULES/UX_FLOW_REVIEW_RULES.md
- AI_RULES/PAGE_REGISTRY.md
- AI_RULES/CTA_FLOW_MAP.md
- AI_RULES/CODEX_MANDATORY_ENTRY.md
- AI_RULES/FILE_OWNERSHIP_RULES.md
- AI_RULES/HANDOFF_RULES.md
- AI_RULES/LAIBE_BUILDER_RULES.md
- AI_RULES/LAIBE_WEB_FLOW_BUILDER_RULES.md
- AI_RULES/TASK_DISPATCH_RULES.md
- docs/NEXT_CODEX_HANDOFF.md，若存在

---

## 本輪任務

[填入本輪任務]

---

## 允許修改範圍

[填入允許修改的頁面或檔案]

---

## 禁止修改範圍

本輪禁止修改：

- `plancraft`
- plan-puzzle 核心邏輯，除非本輪明確授權
- budget-system 核心邏輯，除非本輪明確授權
- specDB schema，除非本輪明確授權
- `package.json`
- `node_modules`
- Vite / React / Next 相關設定
- git 設定
- 任務範圍外檔案

---

## 必查項目

若本輪涉及 routing / CTA / header，請檢查：

- 是否有 dead CTA
- 是否有 orphan page
- 是否有錯誤跳轉
- 是否有 `href="#"`
- 是否有 `href=""`
- 是否有可點但無作用 button
- 返回邏輯是否合理
- Header tools 是否一致
- Progress bar 節點是否合理
- 是否破壞主流程
- PAGE_REGISTRY 是否有對應頁面
- CTA_FLOW_MAP 是否有對應 CTA
- 若新增頁面，是否補登錄 PAGE_REGISTRY
- 若新增或修改 CTA，是否補登錄 CTA_FLOW_MAP

主流程固定為：

landing
→ onboarding
→ plan-puzzle
→ budget-system
→ dashboard

---

## UX Flow 自我檢查

請確認：

- 頁面角色是否清楚
- 主 CTA 是否合理
- 次 CTA 是否干擾主 CTA
- CTA 文案是否具體
- CTA 目標是否正確
- Header 是否穩定
- Progress bar 是否符合流程
- 返回邏輯是否合理
- 排版是否支持使用者理解
- 是否需要截圖或實機畫面才能確認

---

## REVIEW_READY_SUMMARY

完成後應整理 `REVIEW_READY_SUMMARY`，供使用者需要時主動提供給 LAIBE_REVIEWER；此摘要不會自動觸發審查。
Builder / Codex 不得在每次任務完成後要求使用者交給 LAIBE_REVIEWER。
Builder 只能標示成果是否已整理、是否可供使用者後續主動審查。
是否啟動 LAIBE_REVIEWER，由使用者決定。

Builder self-check 不等於 LAIBE_REVIEWER 正式審查。

```md
## REVIEW_READY_SUMMARY_START

### 任務名稱

### 任務類型
Web Flow Builder Task

### Builder 聊天室 / 角色
LAIBE_WEB_FLOW_BUILDER

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

### Dead CTA / Orphan Page 檢查

### UX Flow 自我檢查

### 已知風險

### 可供使用者主動審查的重點

## REVIEW_READY_SUMMARY_END
```

---

## 完成後回報格式

請用以下格式回報：

## 本輪任務

## 任務類型
Web Flow Builder Task

## 已完成

## 修改檔案

## 新增檔案

## 未修改檔案

## 是否有功能程式碼改動

## 是否涉及 routing / CTA / header

## 是否涉及 plan-puzzle 核心功能

## 是否涉及 budget-system 核心邏輯

## 是否修改 plancraft

## 是否新增 framework / package

## 是否更新 docs/NEXT_CODEX_HANDOFF.md

## 是否更新 docs/CURRENT_PHASE_REVIEW_PACKET.md

## Dead CTA / Orphan Page 檢查

## UX Flow 自我檢查

## 自我檢查結果

## 已知風險

## 是否可供使用者後續主動審查

## 下一步建議

## REVIEW_READY_SUMMARY_START

[貼上 Review-ready Summary]

## REVIEW_READY_SUMMARY_END
