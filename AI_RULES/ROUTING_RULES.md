# ROUTING_RULES

本文件定義萊比 MVP 的頁面連接、CTA、header、工具入口、progress bar 與流程跳轉規則。

## 1. Purpose

萊比的頁面不是孤立展示頁，而是裝修需求整理、平面資料建立、預算生成與甲方決策流程的一部分。

Codex 修改任何 header、nav、CTA、progress bar、返回按鈕、頁面跳轉、工具選單、onboarding flow、plan-puzzle 入口、budget-system 入口、dashboard 入口前，必須先確認其產品層級與流程位置。

## 2. Universal Routing Rules

所有頁面連接必須符合：

- 使用者知道自己在哪裡。
- 使用者知道下一步去哪裡。
- CTA 不可跳到無關頁面。
- 不可出現 dead CTA。
- 不可出現 orphan page。
- 不可出現重複但意義不同的入口。
- 返回按鈕必須可預期。
- Header 工具入口必須穩定。

## 3. Fixed Main Flow

主流程固定為：

`landing -> onboarding -> plan-puzzle -> budget-system -> dashboard`

不得未經授權改為其他主流程。

流程節點對應：

- 需求整理節點應對應 onboarding / requirement intake 類頁面。
- 平面拼圖節點應對應 plan-puzzle。
- 預算節點應對應 budget-system。
- 評比 / 決策節點應對應 dashboard。

## 4. Header Tools Rules

Header 的工具選單若存在，應包含：

- 平面拼圖
- 預算生成
- LiDAR 下載連結
- iScanner 下載連結

Header tools 原則：

- Header tools 應是下拉選單或清楚工具入口。
- 不可把所有工具按鈕平鋪成混亂 header。
- 不可讓 header 在不同頁面出現完全不同邏輯。
- 不可讓工具入口跳到錯誤頁面。
- 工具入口應盡量使用同一套命名。
- 外部工具必須標示為外部連結或 disabled / TODO，不可偽裝成站內頁面。

## 5. Back Button Rules

返回上一頁按鈕原則上使用 `history.back()`。

若該頁有明確固定返回目的，例如返回案件總覽、返回需求整理、返回平面拼圖，可以使用固定返回目的，但必須在任務回報中說明原因。

返回按鈕不可讓使用者跳到無關頁面，不可導向舊版廢棄頁面。

## 6. Progress Bar Rules

若頁面有流程進度條：

- 每個節點必須能對應真實頁面或真實流程狀態。
- 不可讓進度節點跳到無關頁面。
- 不可讓節點看似可點但沒有作用。
- 若節點不可點，必須在 UI 上呈現為非互動狀態。
- 需求整理節點應對應 onboarding / requirement intake 類頁面。
- 平面拼圖節點應對應 plan-puzzle。
- 預算節點應對應 budget-system。
- 評比 / 決策節點應對應 dashboard。

## 7. CTA Rules

每個 CTA 必須符合：

- 文字清楚。
- 目的明確。
- 跳轉正確。
- 不與其他 CTA 重複混淆。
- 不建立不存在的頁面假象。

禁止使用模糊 CTA，例如「看看」「開始」「下一步」，除非上下文非常清楚。

建議使用具體 CTA，例如：

- 開始整理需求
- 進入平面拼圖
- 產生預算草稿
- 查看報價比較
- 返回上一頁

## 8. Dead CTA Definition

以下都視為 dead CTA：

- `href="#"`
- `href=""`
- `onclick` 沒有實際作用
- button 無事件且看起來可點
- 指向不存在檔案
- 指向錯誤頁面
- 指向舊版廢棄頁面

除非任務明確要求保留 placeholder，否則必須修正或標記為 disabled。

## 9. Orphan Page Definition

以下都視為 orphan page：

- 頁面存在但沒有合理入口。
- 重要頁面沒有返回路徑。
- 使用者進入後無法回主流程。
- 頁面功能存在但沒有被 routing 邏輯承認。

修正 orphan page 時，不可亂塞入口，必須符合主流程。

## 10. External Tool Rules

外部工具如 LiDAR app、iScanner app、第三方掃描工具：

- 應明確標示為外部連結。
- 若暫無正式 URL，可使用 disabled 狀態或 TODO 註記。
- 不可亂填假連結。
- 不可偽裝成站內頁面。

## 11. Routing Review Requirement

任何修改以下項目後，必須執行 routing review，並在回報中列出檢查結果：

- header
- nav
- CTA
- progress bar
- 返回按鈕
- 頁面跳轉
- 工具選單
- onboarding flow
- plan-puzzle 入口
- budget-system 入口
- dashboard 入口

routing review 至少檢查：

- 是否符合主流程。
- 是否有 dead CTA。
- 是否有 orphan page。
- 是否有錯誤或假外部連結。
- header tools 命名與目的是否一致。
- 返回邏輯是否可預期。

## Page Registry / CTA Flow Consistency

`AI_RULES/PAGE_REGISTRY.md` 是頁面登錄來源。
`AI_RULES/CTA_FLOW_MAP.md` 是 CTA 行動線登錄來源。

任何 routing / CTA 修改都應維持這兩份文件一致。
若新增頁面，應登錄頁面角色、入口、出口、主 CTA、次 CTA、返回邏輯與狀態。
若新增或修改 CTA，應登錄出現頁面、CTA 文案、CTA 類型、目標、目的、狀態與風險。
若 CTA 指向未登錄頁面，必須補登錄或標記為風險。

## 本次整合說明

- 本文件已依本輪要求補齊萊比 MVP routing、CTA、header tools、返回按鈕、progress bar、dead CTA、orphan page、外部工具與 routing review 規則。
- 已保留既有 UI Logic Self-Audit 與產品層級區分規則。
- 既有內容有編碼損壞，本次以使用者提供的新規則為優先整理為可讀中文。
