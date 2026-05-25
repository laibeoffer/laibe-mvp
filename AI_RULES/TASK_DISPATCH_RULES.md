# LAIBE TASK DISPATCH RULES

本文件定義萊比專案中任務應該如何分派給不同 AI 聊天室 / Codex 角色。

萊比目前採用多聊天室協作模式：

- AI_ARCHITECT_CORE：負責規則、架構、MD、AGENTS、skills、任務制度
- Builder / Codex：負責小步施工
- LAIBE_REVIEWER：負責審查，不施工
- 使用者：最終產品決策者與架構授權者

本文件的目的，是避免每次任務都靠臨時判斷，導致聊天室職責混亂、Codex 越界施工、Reviewer 變成 Builder、Builder 變成架構師。

---

## Strategic Plan Source

`docs/LAIBE_CODEX_STRATEGIC_PLAN.md` 是 Codex 工作線、邊界與派工制度的戰略來源。任何副指揮官、執行官、分流員、Builder、Reviewer 或治理聊天室在判斷工作線前，必須先用該文件確認 Role / Scope / Forbidden / Completion Criteria。

派工制度固定如下：

- GitHub Issue 是正式派工單。
- `docs/WORKSTREAM_BLACKBOARD.md` 是戰情板。
- Heartbeat / automation 是巡邏員，只能定時喚醒本聊天室，不能取代 Issue 或黑板。
- 副指揮官派工必須寫明 `To: Agent`，不得只寫 workstream、branch 或 repo。
- Issue 必須列出 `To`、`Workstream`、`Branch / Repo`、`Target files`、`Task`、`Allowed changes`、`Forbidden scope`、`Self-check`、`Git / PR instructions`、`Blackboard update`、`Completion report format`、`Need Commander`、`Need Reviewer`。

預算生成系統不得再被當作單一聊天室任務，必須拆成三倉：

- 原物料採購與倉儲：`warehouse/raw-candidate`，只處理 raw source / candidate / review queue / handoff proposal。
- 配件倉庫：`warehouse/method-spec`，處理 MethodSpec / MethodRecipe / MaterialSpec / LaborRule / UnitConversion / validator policy。
- 成品物流：`output/budget-documents`，只處理 BudgetOutputSnapshot 後的 renderer / writer / artifact policy。

外部工作線必須獨立標示：

- 平面拼圖應區分 Plancraft fork、LaiBE Importer UI、Plancraft Adapter Clean，不得混線。
- 模擬圖生成只屬於 `visual/simulation-governance`，不得混入 Quote Factory 或 budget output。
- 預算原料清洗屬於外部 repo `laibeoffer/laibe-quote-factory`，不得當作 `laibe-mvp` branch。

---

## Review Dispatch Rule

審查任務由使用者主動指派。

不要因為 Builder 完成任務就自動建立 Reviewer 任務。
不要因為 phase packet 被更新就自動建立 Reviewer 任務。
不要因為 handoff 被更新就自動建立 Reviewer 任務。

以下情況才指派 LAIBE_REVIEWER：

- 使用者明確要求審查
- 使用者要求總體檢
- 使用者要求判斷是否進下一階段
- 使用者要求 Web Flow / UX / CTA Review
- 使用者要求審查特定 Builder 回報

Builder / Codex 可以標示「可供後續審查」或「使用者可視需要交給 LAIBE_REVIEWER」，但不得把每個任務完成都自動升級為 Reviewer 任務。

Builder / Codex 不得在每次任務完成後要求使用者交給 LAIBE_REVIEWER。
Builder 只能標示成果是否已整理、是否可供使用者後續主動審查。
是否啟動 LAIBE_REVIEWER，由使用者決定。

本規則優先於舊有自動審查語氣；除非使用者明確要求 User-triggered Review 或任務有 High Risk，否則不自動啟動審查。

---

## 1. Role Summary

### 1.1 AI_ARCHITECT_CORE

負責：

- AGENTS.md
- AI_RULES
- skills 規則
- templates
- 任務制度
- 系統架構規則
- 長期治理文件
- 規則衝突整理
- 任務分派設計
- Builder / Reviewer 的工作規範

不負責：

- 實際修改網站功能
- 大量改 HTML / JS / CSS
- 審查每一輪 Builder 成果
- 替代 Reviewer 做驗收
- 替代使用者做產品決策

---

### 1.2 Builder / Codex

負責：

- 依照任務小步修改檔案
- 修正明確 bug
- 修正明確 routing / CTA 問題
- 補齊指定文件
- 更新 NEXT_CODEX_HANDOFF.md
- 按照 Builder template 回報

不負責：

- 自行改產品策略
- 自行重構系統
- 自行新增 framework
- 自行修改 plancraft
- 自行更改主流程
- 自行刪除或搬移大量檔案
- 自行宣告審查通過

---

### 1.3 LAIBE_REVIEWER

負責：

- 審查 Builder / Codex 完成回報
- 審查 diff 摘要
- 審查修改檔案清單
- 審查 routing / CTA / header / handoff
- 找出任務外改動
- 判斷是否可進下一階段
- 給 Builder 退回修正指令

不負責：

- 施工
- 寫功能程式
- 自行重構
- 補做 Builder 任務
- 擴大產品方向
- 把審查建議寫成已完成事項

---

### 1.4 使用者

負責：

- 最終產品決策
- 授權敏感區域修改
- 判斷商業策略
- 決定是否進下一階段
- 決定是否接受風險

Codex 不得替使用者做高風險授權。

---

## 2. Task Categories

### LAIBE_VISUAL_SIM

負責：

- 網站模擬圖
- 情境圖 prompt
- 視覺素材 brief
- 圖片用途與檔名建議
- 給 Builder 的圖片整合備註
- 給 Reviewer 的圖片審查備註
- 案件上架與風格溝通輔助素材規格

不負責：

- 修改程式碼
- 修改 routing
- 修改 CTA
- 修改網站 layout
- 審查 Builder 成果
- 決定產品策略
- 宣稱示意圖為真實案例或施工圖
- 宣稱示意圖為正式設計圖、正式報價依據或完工保證

---

每個任務開始前，必須先判斷任務類型。

---

### LAIBE_WEB_FLOW_BUILDER

負責：

- landing / pre-landing 主流程
- onboarding 頁面連接
- header tools / nav
- CTA
- routing
- progress bar
- 返回按鈕
- dashboard flow
- 頁面之間的跳轉
- dead CTA / orphan page 修正
- 工具入口連接

不負責：

- plan-puzzle 核心功能
- budget-system 核心邏輯
- plancraft 原始碼
- specDB schema
- 模擬圖 prompt
- Reviewer 審查
- AI_RULES / AGENTS.md 架構制定

---

### 2.1 Builder Task

以下任務屬於 Builder Task：

- 修正明確 bug
- 修改指定頁面小區塊
- 補齊指定連結
- 修正指定 CTA
- 修正指定 header item
- 更新指定 Markdown 文件
- 新增指定文件
- 小幅調整 UI 文案
- 小幅補資料結構
- 小幅整理指定檔案

處理方式：

1. 使用 templates/CODEX_BUILDER_TASK_TEMPLATE.md
2. 開工前閱讀 Builder 必讀文件
3. 小步修改
4. 更新 NEXT_CODEX_HANDOFF.md，若符合 handoff 條件
5. 固定格式回報
6. 若涉及 routing / CTA / header / 資料模型，可供使用者後續主動審查

---

### 2.2 Reviewer Task

以下任務屬於 Reviewer Task：

- 審查 Builder 完成回報
- 審查 Codex 完成回報
- 審查 diff 摘要
- 審查 NEXT_CODEX_HANDOFF.md
- 審查 routing / CTA / header 是否合理
- 審查是否越界改檔
- 審查是否可進下一階段
- 使用者詢問「這樣可以嗎」「幫我看一下」「有沒有問題」

處理方式：

1. 使用 AI_RULES/LAIBE_REVIEWER_RULES.md
2. 不施工
3. 不修改程式
4. 不重構
5. 輸出審查結論
6. 若不通過，提供 Builder 退回指令

---

### Phase Review Task

以下任務屬於 Phase Review Task：

- 使用者要求總審查
- 使用者要求掃一遍所有聊天室成果
- 多個 Builder 聊天室完成一段工作
- 工作告一段落，需要判斷是否進下一階段

處理方式：

1. 指派給 LAIBE_REVIEWER。
2. 使用 AI_RULES/PHASE_REVIEW_RULES.md。
3. 讀取 docs/CURRENT_PHASE_REVIEW_PACKET.md。
4. 讀取 docs/NEXT_CODEX_HANDOFF.md。
5. 不施工。
6. 不修改程式。
7. 輸出階段總審查報告。

---

### Method Spec Warehouse Task

指派角色：配件倉庫：工法與規格

適用任務：

- MethodSpecCatalog
- MethodRecipe
- MaterialSpec
- LaborRule
- NoteTemplate
- UnitConversion
- InclusionExclusionRule
- ItemMaterialBinding
- 工法規則
- 工項規格
- 包含 / 不包含
- 風險與假設
- 支援 budget-system / output system 的規格資料

不可處理：

- renderer / Excel / PDF / CSV / HTML 輸出
- 採購與庫存主邏輯
- 直接產生成品表單

---

### Material Procurement Warehouse Task

指派角色：原物料採購與倉儲

適用任務：

- 原物料資料
- 材料規格
- 供應商 / 採購線索
- 採購成本
- 庫存 / 倉儲概念
- material resolver
- material pricing
- 單位換算
- 材料用量推估
- 與 MethodSpec / budget-system 的材料銜接

不可處理：

- MethodSpec 主規則決策
- renderer / Excel / PDF / CSV / HTML 輸出
- 客戶版預算表單輸出

---

### Budget Output Warehouse Task

指派角色：成品物流：預算表單輸出

適用任務：

- BudgetOutputSnapshot
- customer_view
- internal_view
- Excel renderer
- PDF renderer
- CSV renderer
- HTML renderer
- structured_rows
- renderSnapshot()
- renderer gate
- 預算表單輸出
- 客戶版 / 內部追溯版輸出

不可處理：

- 重新跑 budget engine
- 讀 pricing rules
- 讀 material resolver
- 修改 MethodSpecCatalog
- 接 RAG / AI API
- 使用 legacy formatBudgetOutput() 作為正式來源

---

### 2.3 Architect / Governance Task

以下任務屬於 Architect / Governance Task：

- 新增或修改 AGENTS.md
- 新增或修改 AI_RULES
- 新增或修改 skills 規則
- 新增或修改 templates
- 整理 Codex 工作制度
- 整理 Builder / Reviewer 分工
- 整理任務分派規則
- 解決規則衝突
- 壓縮重複規則
- 建立長期治理文件

處理方式：

1. 僅修改 Markdown 文件
2. 不碰功能程式碼
3. 不碰 src / plancraft / app / components / assets / layout
4. 更新 NEXT_CODEX_HANDOFF.md
5. 完成後可標示為可供使用者主動審查

---

### 2.4 Documentation Task

以下任務屬於 Documentation Task：

- 新增文件
- 更新文件
- 整理 handoff
- 整理 README
- 整理規格文件
- 補充流程說明
- 補充任務模板

處理方式：

- 只改 Markdown / 文件
- 不改功能程式碼
- 不改 UI
- 不改 routing
- 不改資料模型
- 若文件影響 AI_RULES 或 AGENTS.md，完成後可標示為可供使用者主動審查

---

### 2.5 Routing / CTA Task

以下任務屬於 Routing / CTA Task：

- 修改頁面跳轉
- 修改 header tools
- 修改 nav
- 修改 CTA
- 修改 progress bar
- 修改返回按鈕
- 修正 dead CTA
- 修正 orphan page
- 修正錯誤跳轉

處理方式：

1. 必須閱讀 ROUTING_RULES.md
2. 必須使用 Builder template
3. 必須小步施工
4. 必須更新 NEXT_CODEX_HANDOFF.md
5. 完成後若使用者主動要求審查，可交給 LAIBE_REVIEWER

Routing / CTA Task 不可跳過 Reviewer。

---

### 2.6 Data Model Task

以下任務屬於 Data Model Task：

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
- specDB schema
- budget-system schema
- plan-puzzle output schema

處理方式：

1. 必須先確認任務是否明確授權
2. 必須說明影響範圍
3. 不可任意改欄位語意
4. 不可破壞相容性
5. 不可將 UI 文字混入資料模型
6. 完成後若使用者主動要求審查，可交給 LAIBE_REVIEWER

Data Model Task 不可跳過 Reviewer。

---

### 2.7 Sensitive Task

以下任務屬於 Sensitive Task：

- 修改 plancraft 原始碼
- 修改核心資料模型
- 修改主流程
- 修改全站 header architecture
- 修改 routing architecture
- 修改 package.json
- 新增 npm package
- 新增 framework
- 修改 build / config / git 設定
- 大量搬移檔案
- 刪除檔案
- 涉及金流 / 稅務 / 託管帳戶
- 涉及正式商業條款
- 涉及使用者資料保存策略

處理方式：

- 沒有使用者明確授權，不得施工
- 只能回報風險與需要確認事項
- 若使用者授權，必須小步修改
- 完成後若使用者主動要求審查，可交給 LAIBE_REVIEWER
- 必須更新 NEXT_CODEX_HANDOFF.md

---

### 2.8 Blocked Task

以下任務屬於 Blocked Task：

- 要求 git clean
- 要求 git reset
- 要求刪除大量檔案
- 要求未授權還原檔案
- 要求無理由重構整站
- 要求新增大型 framework 但沒有明確授權
- 要求修改 plancraft 但沒有明確授權
- 要求偽造外部連結
- 要求把 placeholder 偽裝成已完成功能
- 要求把尚未驗證內容寫成事實

處理方式：

- 不施工
- 說明阻擋原因
- 提供安全替代方案
- 等待使用者重新授權或縮小範圍

---

### UX Flow Review Task

以下任務屬於 UX Flow Review Task：

- 檢查網頁設計邏輯
- 檢查排版合理性
- 檢查 CTA 合理性
- 檢查頁面鏈接精準度
- 檢查像 AI Studio / Stitch 原型一樣的頁面流
- 檢查 header / progress bar / 返回按鈕
- 檢查 Web Flow Builder 成果

處理方式：

- 指派給 LAIBE_REVIEWER
- 不施工
- 不修改程式碼
- 參考 UX_FLOW_REVIEW_RULES.md、PAGE_REGISTRY.md、CTA_FLOW_MAP.md
- 若缺少截圖或 HTML，必須標示無法確認排版細節

---

## 3. Dispatch Matrix

### Visual Simulation Task

Dispatch Matrix 補充：

| 任務內容 | 指派角色 | 是否可施工 | 是否可供使用者主動審查 |
|---|---|---:|---:|
| 產生網站模擬圖 prompt | LAIBE_VISUAL_SIM | 否，只產出 brief | 不需要 |
| 產生圖片素材規格 | LAIBE_VISUAL_SIM | 否，只產出 brief | 不需要 |
| 將模擬圖整合進網站 | Builder | 是 | 視頁面影響，通常建議 |
| 審查網站中的模擬圖是否誤導 | LAIBE_REVIEWER | 不施工 | 本身即審查 |
| 工法 / 規格 / MethodSpecCatalog | 配件倉庫：工法與規格 | 是 | 視影響，通常建議 |
| 原物料 / 採購 / 倉儲 / material resolver | 原物料採購與倉儲 | 是 | 視影響，通常建議 |
| BudgetOutputSnapshot / renderer / Excel / PDF / CSV / HTML | 成品物流：預算表單輸出 | 是 | 視影響，通常建議 |
| renderer 重新跑 budget engine | Blocked / Sensitive | 否，除非明確授權 | 必須 |
| output 直接讀 pricing rules / material resolver | Blocked / Sensitive | 否，除非明確授權 | 必須 |

以下任務屬於 Visual Simulation Task：

- 產生網站 hero 圖 prompt
- 產生 onboarding 示意圖 prompt
- 產生 plan-puzzle 模擬圖 prompt
- 產生 budget-system 示意圖 prompt
- 產生 dashboard 示意圖 prompt
- 產生 AI PCM 流程圖 prompt
- 產生 before / after 示意圖 prompt
- 產生網站圖片素材 brief
- 產生圖片檔名與 alt text 建議

處理方式：

1. 指派給 LAIBE_VISUAL_SIM
2. 不修改程式碼
3. 不整合進網站
4. 產出 visual brief / prompt / asset spec
5. 明確標示模擬圖僅供案件上架與風格溝通輔助
6. 明確標示不得宣稱為施工圖、正式設計圖、真實案例、正式報價依據或完工保證
7. 若要放進網站，後續交給 Builder
8. 若已放入網站，後續交給 Reviewer 審查

---

### Image Generation API Integration Spike

Image Generation API Integration Spike 屬於高風險 API spike preparation / Builder execution 任務，不屬於 LAIBE_VISUAL_SIM 的 prompt-only 任務。

處理方式：

1. 必須先建立並通過 governance pack。
2. 必須閱讀 `docs/ai_style_visual_chat/IMAGE_API_SPIKE_GOVERNANCE.md`。
3. 必須閱讀 `docs/ai_style_visual_chat/IMAGE_API_REQUEST_SCHEMA.md`。
4. 必須閱讀 `docs/ai_style_visual_chat/PROMPT_SANITIZATION_RULES.md`。
5. 必須閱讀 `docs/ai_style_visual_chat/REFERENCE_IMAGE_POLICY.md`。
6. 必須閱讀 `docs/ai_style_visual_chat/GENERATED_IMAGE_STORAGE_POLICY.md`。
7. 必須閱讀 `docs/ai_style_visual_chat/IMAGE_API_SPIKE_REVIEW_CHECKLIST.md`。
8. API spike 必須由 Builder / Codex 在明確授權範圍內小步執行。
9. API spike 不得進 production，不得宣稱功能上線。
10. API key 不得出現在 frontend、repo、HTML、JS、Markdown、handoff、console 或任何可被瀏覽器讀到的位置。
11. Reference image upload 預設禁止，除非先完成 privacy review。
12. Generated images 不得進正式案件資料或 production assets。
13. 不得把 `walls`、`openings`、`zones`、`scale`、`plancraftBridge` 傳入 image API 或被 image API response 回寫。
14. Spike 完成後若使用者主動要求審查，可交給 LAIBE_REVIEWER。
15. Reviewer 通過前不得標記上線。

Dispatch Matrix 補充：

| 任務內容 | 指派角色 | 是否可施工 | 是否可供使用者主動審查 |
|---|---|---:|---:|
| Image API spike governance pack | Documentation / Governance Builder | 是，只改 Markdown | 建議 |
| Image Generation API Integration Spike | Builder / Codex，需明確授權 | 是，但只能 spike | 必須 |
| Image API spike 審查 | LAIBE_REVIEWER | 不施工 | 本身即審查 |
| Reference image upload 支援 | Sensitive Task，需 privacy review | 未通過前否 | 必須 |

---

| 任務內容 | 指派角色 | 是否可施工 | 是否可供使用者主動審查 |
|---|---|---:|---:|
| 新增 AI_RULES | AI_ARCHITECT_CORE | 是，只改文件 | 建議 |
| 更新 AGENTS.md | AI_ARCHITECT_CORE | 是，只改文件 | 建議 |
| 新增 Builder template | AI_ARCHITECT_CORE | 是，只改文件 | 建議 |
| 修正 CTA | Builder | 是 | 必須 |
| 修正 header tools | Builder | 是 | 必須 |
| 修正 progress bar | Builder | 是 | 必須 |
| 修正 dead CTA | Builder | 是 | 必須 |
| 修正 orphan page | Builder | 是 | 必須 |
| 小幅 UI 文案 | Builder | 是 | 視情況 |
| 小幅 bugfix | Builder | 是 | 視情況 |
| 修改資料模型 | Builder，但需授權 | 視授權 | 必須 |
| 修改 plancraft | Sensitive Task | 需明確授權 | 必須 |
| 新增 framework | Sensitive Task | 需明確授權 | 必須 |
| npm install | Sensitive Task | 需明確授權 | 必須 |
| git clean / git reset | Blocked Task | 否 | 不適用 |
| 審查完成回報 | LAIBE_REVIEWER | 不施工 | 本身即審查 |
| 規則衝突整理 | AI_ARCHITECT_CORE | 是，只改文件 | 建議 |

---

### Web Flow Builder Task

以下任務屬於 Web Flow Builder Task：

- landing 頁面主流程
- pre-landing 主流程
- onboarding 頁面連接
- header tools
- nav
- CTA
- progress bar
- 返回按鈕
- dashboard flow
- 頁面之間的跳轉
- dead CTA
- orphan page
- 工具入口連接

處理方式：

1. 指派給 LAIBE_WEB_FLOW_BUILDER。
2. 使用 templates/LAIBE_WEB_FLOW_BUILDER_TASK_TEMPLATE.md。
3. 不得修改 plan-puzzle 核心功能。
4. 不得修改 budget-system 核心邏輯。
5. 不得修改 plancraft。
6. 完成後若涉及 routing / CTA / header / progress bar，可標示為可供使用者主動審查。

Dispatch Matrix 補充：

| 任務內容 | 指派角色 | 是否可施工 | 是否可供使用者主動審查 |
|---|---|---:|---:|
| landing / onboarding 主流程 | LAIBE_WEB_FLOW_BUILDER | 是 | 視影響，通常建議 |
| header tools / nav | LAIBE_WEB_FLOW_BUILDER | 是 | 必須 |
| CTA / routing / progress bar | LAIBE_WEB_FLOW_BUILDER | 是 | 必須 |
| dead CTA / orphan page | LAIBE_WEB_FLOW_BUILDER | 是 | 必須 |
| UX Flow / 網頁設計邏輯審查 | LAIBE_REVIEWER | 不施工 | 本身即審查 |
| PAGE_REGISTRY / CTA_FLOW_MAP 維護 | LAIBE_WEB_FLOW_BUILDER 或 AI_ARCHITECT_CORE | 是，只改文件 | 視影響，通常建議 |
| plan-puzzle 核心功能 | 平面拼圖 Builder | 是 | 視影響 |
| budget-system 核心邏輯 | 預算生成 Builder | 是 | 視影響 |
| 模擬圖 prompt | LAIBE_VISUAL_SIM | 否，只產出 brief | 不需要 |

---

## 4. User-triggered Review Readiness

以下任務完成後，若使用者主動要求審查，可交給 LAIBE_REVIEWER：

- routing
- CTA
- header
- progress bar
- 返回按鈕
- 主流程
- plan-puzzle
- budget-system
- specDB
- dashboard
- 資料模型
- AGENTS.md
- AI_RULES
- NEXT_CODEX_HANDOFF.md
- plancraft 相關任務
- framework / package / config 相關任務
- Image Generation API Integration Spike
- image API key / generated image storage / reference image 相關任務
- 任何修改多個頁面的任務
- 任何使用者覺得「正常網頁邏輯怪怪的」任務

Builder 不得自行宣告這些任務完全通過。

所有 Builder / Codex 施工任務完成後，應整理 REVIEW_READY_SUMMARY，但不會自動觸發審查。  
REVIEW_READY_SUMMARY 的目的，是讓使用者在主動要求審查時可以直接複製給 LAIBE_REVIEWER，不代表自動啟動審查。

若 Builder 任務涉及 routing、CTA、header、progress bar、返回按鈕、主流程、plan-puzzle、budget-system、specDB、dashboard、資料模型、AGENTS.md、AI_RULES、templates、NEXT_CODEX_HANDOFF.md、plancraft、framework / package / config 或任何多頁改動，Builder 必須同時執行 Review-ready self-check。

Builder self-check 不等於 LAIBE_REVIEWER 正式審查。Builder 不得自行宣告 LAIBE_REVIEWER 已通過。

若 Builder 任務完成後發現 High Risk 條件，例如未授權修改 plancraft、未授權修改 src、修改任務外檔案、新增 framework、npm install、git clean、git reset、刪除檔案、破壞 routing、破壞資料模型，Builder 不得宣告任務完成，必須標記為「需要使用者確認；可供使用者後續主動審查」。

---

## 5. Task Dispatch Procedure

每次新任務開始前，應依序回答：

1. 這是什麼任務類型？
2. 應該由誰處理？
3. 是否允許施工？
4. 允許修改哪些檔案？
5. 禁止修改哪些檔案？
6. 是否涉及 routing / CTA / header？
7. 是否涉及資料模型？
8. 是否涉及 plancraft？
9. 是否涉及 framework / package / config？
10. 是否需要更新 NEXT_CODEX_HANDOFF.md？
11. 是否可供使用者主動審查？

若無法回答以上問題，任務不得直接施工。

---

## 6. Default Assignment Rules

預設規則如下：

- 文件治理任務 → AI_ARCHITECT_CORE
- 實作施工任務 → Builder / Codex
- 完成結果檢查 → LAIBE_REVIEWER
- routing / CTA / header → Builder 施工後使用者主動要求時可由 LAIBE_REVIEWER 審查
- 資料模型 → Builder 施工後使用者主動要求時可由 LAIBE_REVIEWER 審查
- plancraft / framework / package / config → 需要使用者明確授權
- git clean / git reset / 刪檔 → Blocked Task

---

## 7. Anti-Confusion Rules

禁止出現以下混亂：

- Reviewer 開始施工
- Builder 自行審查通過
- Architect 開始改 UI 功能
- Documentation Task 偷改 src
- Routing Task 偷改資料模型
- Bugfix Task 偷做重構
- Sensitive Task 沒授權就施工
- Builder 不更新 handoff
- Reviewer 把無法確認寫成已確認

---

## 8. Handoff Dispatch Record

若任務使用本文件完成分派，NEXT_CODEX_HANDOFF.md 應記錄：

- 本輪任務類型
- 指派角色
- 是否允許施工
- 是否可供使用者主動審查
- 是否涉及 routing / CTA / header
- 是否涉及資料模型
- 是否涉及敏感區域
- 下一步由哪個角色處理

## 本次整合說明

- 本文件為新增萊比任務分派規則。
- 已定義 AI_ARCHITECT_CORE、Builder / Codex、LAIBE_REVIEWER、使用者的角色責任。
- 已建立任務分類、分派矩陣、User-triggered Review Readiness、Task Dispatch Procedure、Default Assignment Rules、Anti-Confusion Rules 與 handoff dispatch record。
- 已補充預算生成系統三倉庫任務類型與分派矩陣：配件倉庫、原物料採購與倉儲、成品物流。
- 已標示 output renderer 重新跑 budget engine 或直接讀 pricing rules / material resolver 屬 Blocked / Sensitive。
