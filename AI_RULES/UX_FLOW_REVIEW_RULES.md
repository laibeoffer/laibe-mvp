# LAIBE UX FLOW REVIEW RULES

本文件定義 LAIBE_REVIEWER 對網頁設計邏輯、排版、CTA 合理性與使用者行動線的審查標準。

LAIBE_REVIEWER 不只檢查 dead link，也必須檢查：

- 頁面角色是否清楚
- 主 CTA 是否合理
- 次 CTA 是否干擾主流程
- 排版是否支持使用者下一步
- Header / nav / progress bar 是否符合真實網站邏輯
- 頁面之間的鏈接是否符合 PAGE_REGISTRY 與 CTA_FLOW_MAP
- 使用者是否能理解「我在哪裡、我要做什麼、下一步去哪裡」

---

## 1. Page Role Review

每個頁面都必須有清楚角色。

Reviewer 應檢查：

- 這個頁面主要任務是什麼
- 頁面是否混入太多不相關功能
- 頁面是否與 onboarding / plan-puzzle / budget-system / dashboard 混淆
- 頁面是否承擔不該承擔的功能
- 頁面是否有清楚的下一步

頁面角色不清楚時，應標記為 Medium Risk。
若頁面角色混淆導致流程錯誤，應標記為 High Risk。

---

## 2. CTA Logic Review

Reviewer 應檢查每個 CTA：

- 文案是否具體
- 行動是否清楚
- 是否對應正確頁面
- 是否符合使用者當前階段
- 是否有主次層級
- 是否有多個 CTA 互相打架
- 是否有看起來可點但無作用的 button
- 是否有 href="#" 或 href=""
- 是否有 placeholder 被包裝成已完成功能

主 CTA 應該推動主流程：

landing
→ onboarding
→ plan-puzzle
→ budget-system
→ dashboard

---

## 3. Layout Logic Review

Reviewer 應檢查排版是否支持使用者理解。

檢查項目：

- Hero 是否清楚說明頁面價值
- 重要 CTA 是否在合理視線位置
- 功能區塊順序是否符合使用者理解
- 資訊是否過度擁擠
- 是否有太多同層級按鈕
- 卡片排列是否有清楚優先順序
- 工具區是否放在正確頁面
- 返回按鈕是否放在合理位置
- 手機版是否可能失去主 CTA 或造成混亂

若只看文字無法確認排版，Reviewer 必須標記「無法確認，需要截圖或實機畫面」。

---

## 4. Header / Nav Review

Header 應該是穩定導航，不是功能垃圾桶。

Reviewer 應檢查：

- Header tools 是否包含平面拼圖、預算生成、LiDAR、iScanner
- Header 是否過度擁擠
- Header 是否在不同頁面邏輯不一致
- Header 是否讓使用者誤以為某功能已完成
- 外部連結是否標示為外部工具
- 未確定外部連結是否使用 disabled 或 TODO，而不是假連結

---

## 5. Progress Bar Review

若頁面有 progress bar，Reviewer 應檢查：

- 每個節點是否對應真實頁面或狀態
- 目前節點是否正確
- 可點節點是否真的可跳轉
- 不可點節點是否視覺上不可點
- 節點順序是否符合主流程
- 是否把未完成流程顯示為已完成

---

## 6. AI Studio-like Link Precision

萊比希望達到接近 AI Studio / Stitch 原型中「頁面精準鏈接」的效果。

因此所有頁面跳轉應由以下文件支撐：

- AI_RULES/PAGE_REGISTRY.md
- AI_RULES/CTA_FLOW_MAP.md

Reviewer 應檢查：

- CTA 是否登錄在 CTA_FLOW_MAP
- 目標頁面是否登錄在 PAGE_REGISTRY
- CTA 文案是否與目標頁面任務一致
- 是否有未登錄頁面被連到
- 是否有已存在頁面沒有入口
- 是否有重複入口導向不同意思
- 是否有同名 CTA 在不同頁面做不同事

---

## 7. Output Format For UX Flow Review

若 Reviewer 執行 UX / Web Flow 審查，必須輸出：

## 頁面角色檢查

## CTA 合理性檢查

## 排版與資訊層級檢查

## Header / Nav 檢查

## Progress Bar 檢查

## 頁面鏈接精準度檢查

## 使用者行動線風險

## 需要截圖或實機驗證的項目

