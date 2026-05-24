# SYSTEM_ARCHITECTURE

本文件定義萊比 Laibe MVP 的核心系統、系統邊界、資料流與架構原則。

## 1. Purpose

萊比不是單純展示網站，也不是一般聊天式報價工具。

萊比目前是裝修媒合與 AI PCM MVP 系統，目標是協助甲方整理需求、描述空間、建立估價條件、比較報價並進行後續決策。

Codex 修改任何功能、頁面、資料結構或文件前，必須先理解該項工作屬於哪個子系統，並避免為了單次 demo 破壞長期可擴充架構。

## 2. Core MVP Systems

萊比 MVP 目前包含：

1. landing / pre-landing
2. onboarding / 需求整理
3. plan-puzzle / 平面拼圖
4. budget-system / 預算生成
5. specDB / method-spec warehouse
6. dashboard / 甲方評比與決策
7. AI PCM 輔助流程

## 3. Main Flow

主流程固定為：

`landing -> onboarding -> plan-puzzle -> budget-system -> dashboard`

不得未經授權改為其他主流程。

## 4. Supplementary Flows

補充流程：

`plan-puzzle -> budget-system`

`budget-system -> dashboard`

補充流程只能強化主流程，不得取代主流程，不得讓使用者失去目前所在階段的理解。

## 5. System Responsibilities

### landing / pre-landing

用途：

- 介紹萊比價值主張。
- 引導使用者進入 onboarding。
- 建立使用者對產品定位與下一步的基本理解。

邊界：

- 不承擔複雜工具功能。
- 不塞入完整預算生成邏輯。
- 不直接取代 onboarding。

### onboarding / 需求整理

用途：

- 協助甲方整理基本裝修需求。
- 引導使用者進入平面拼圖或預算流程。
- 建立案件初始資料。

邊界：

- 不得變成雜亂工具頁。
- 不得跳過必要需求整理。
- 不得和 dashboard 混在一起。

### plan-puzzle / 平面拼圖

用途：

- 讓甲方用低門檻方式描述空間。
- 支援空間區塊、家具、物件、SVG / JSON / room-based 資料。
- 作為後續預算生成與案件描述的資料來源之一。

核心資料概念：

- `LayoutObject`
- `Room`
- `QuantityFact`
- `SVG object`
- `object_type`
- `width_cm`
- `depth_cm`
- `params`

邊界：

- 不得依賴 dashboard 才能運行。
- 不得被重寫成大型 CAD 系統。
- 不得未授權修改 plancraft 原始碼。
- 不得在本階段引入複雜 3D 引擎。

### budget-system / 預算生成

用途：

- 接收結構化需求。
- 依據 specDB / method-spec / quantity facts 生成估價或預算草稿。
- 支援 AI PCM 服務流程。

核心資料概念：

- `BudgetItem`
- `QuoteItemTemplate`
- `MethodRecipe`
- `MaterialSpec`
- `LaborRule`
- `NoteTemplate`
- `PricingRule`

邊界：

- 不得只生成漂亮文字而沒有資料結構。
- 不得把預算邏輯硬寫死在 UI。
- 不得和單一頁面過度耦合。
- AI 不得直接決定價格。
- 價格必須由 deterministic budget engine 產生。

### specDB / method-spec warehouse

用途：

- 儲存工法、規格、材料、工項、備註、單位換算、價格規則等資料。
- 作為預算生成與報價比較的基礎資料層。

邊界：

- 資料必須可驗證、可擴充、能被 budget-system 使用。
- 不可只作為文字備忘錄。
- 不可混入臨時 UI 狀態。

### dashboard / 甲方評比與決策

用途：

- 協助甲方比較報價。
- 呈現案件狀態。
- 支援決標前與決標後的不同資訊需求。

邊界：

- 不得取代 onboarding。
- 不得取代 budget-system。
- 不得塞入所有功能入口造成混亂。

### AI PCM 輔助流程

用途：

- 補問缺漏資料。
- 整理假設。
- 標示風險。
- 解釋預算與報價差異。

邊界：

- 不得直接決定價格。
- 不得取代 deterministic budget engine。
- 不得成為最終決策者或裁判。

## 6. Explicit System Boundaries

plan-puzzle 可以輸出：

- 空間資料
- 家具 / 物件資料
- SVG / JSON
- 面積 / 長寬 / 數量線索

plan-puzzle 不負責：

- 最終報價決策
- 工項資料庫管理
- 設計師評分

budget-system 可以輸出：

- 預算草稿
- 工項列表
- 材料 / 工法推估
- 報價基礎資料

budget-system 不負責：

- 平面圖編輯
- UI landing 設計
- 設計師媒合邏輯

specDB 可以輸出：

- 工法規格
- 工項模板
- 材料規格
- 勞務規則
- 備註模板
- 單位換算

specDB 不負責：

- 使用者 UI
- 頁面 routing
- CTA 設計

## 7. Architecture Principles

- UI 與資料邏輯要盡量分離。
- 預算邏輯不可硬寫死在單一頁面。
- 平面拼圖資料應可被預算系統讀取。
- specDB 是長期資料資產，不可隨意混入臨時 UI。
- 每個頁面必須有明確角色。
- 每個 CTA 必須有明確目的。
- 不可為了單次 demo 破壞長期架構。
- MVP 優先，但不能製造無法延展的死結。
- 不可把 mock prototype 誤接成 production flow。
- 不可未經授權接入真實 payment、escrow、AI API、upload、production webhook。

## 8. Notes for Codex

- 若任務涉及跨系統串接，先確認資料輸入、資料輸出與 routing。
- 若任務只要求文件，不得進行功能實作。
- 若任務可能改變主流程，必須先取得使用者明確授權。
- 若低層文件與本文件衝突，遵守 `AGENTS.md` 與本文件，並在回報中說明。

## 本次整合說明

- 本文件已依本輪要求補齊 landing、onboarding、plan-puzzle、budget-system、specDB、dashboard、AI PCM 的用途、邊界與資料流。
- 已保留既有中央治理內容中的 MVP 架構、budget-system、plancraft 限制與 production 邊界。

---

## Budget System Three-Warehouse Architecture

原本單一 budget-system 的總體概念仍保留：預算生成系統接收結構化需求、quantity facts、method-spec 與材料 / 勞務 / 歷史價格資料，產出可追溯的預算草稿。

但目前 Budget System 已拆分為三個下游 / 子倉庫：

1. Method / Spec Warehouse  
   對應「配件倉庫：工法與規格」。

2. Material / Procurement Warehouse  
   對應「原物料採購與倉儲」。

3. Output / Renderer Warehouse  
   對應「成品物流：預算表單輸出」。

三者關係：

配件倉庫：工法與規格  
→ 提供工法、規格、工項、備註、包含 / 不包含、風險、假設

原物料採購與倉儲  
→ 提供材料、採購、價格、庫存、單位換算、材料用量線索

budget engine / estimate layer  
→ 產生 BudgetOutputSnapshot

成品物流：預算表單輸出  
→ 只讀 BudgetOutputSnapshot / RenderedBudgetDocument  
→ 產生 customer_view / internal_view / CSV / HTML / Excel / PDF 輸出

成品物流明確禁止：

- 不得重新跑 budget engine。
- 不得讀 pricing rules。
- 不得讀 material resolver。
- 不得修改 MethodSpecCatalog。
- 不得接 RAG / AI API。
- 不得使用 legacy formatBudgetOutput() 作為正式來源。

---

## 本次整合說明

- 已補充 Budget System Three-Warehouse Architecture。
- 已明確標示 Method / Spec Warehouse、Material / Procurement Warehouse、Output / Renderer Warehouse 的責任邊界。
- 已明確規定成品物流只能讀 BudgetOutputSnapshot / RenderedBudgetDocument，不得重新跑 engine、讀 pricing/material resolver、改 MethodSpecCatalog、接 RAG / AI API 或使用 legacy formatBudgetOutput() 作為正式來源。
- 既有內容有編碼損壞，本次以使用者提供的新規則為優先整理為可讀中文。
