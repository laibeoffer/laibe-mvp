# LAIBE PHASE REVIEW RULES

本文件定義萊比專案的「階段總審查」制度。

萊比不採用每個小任務完成後都立刻審查的模式。  
萊比採用「工作段落完成後進行階段總審查」的模式。

---

## Review Trigger Rule

Phase Review 只在使用者主動要求時啟動。

以下情況不自動觸發審查：

- Builder 完成小任務
- Builder 更新 handoff
- Builder 更新 phase review packet
- 某個聊天室完成一段工作
- 新增 Markdown 規則
- 更新 templates
- 更新 docs/CURRENT_PHASE_REVIEW_PACKET.md

以下情況才啟動 LAIBE_REVIEWER：

- 使用者在 LAIBE_REVIEWER 聊天室輸入「請執行本階段總審查」
- 使用者明確要求審查某份 Builder 回報
- 使用者明確要求 Web Flow / CTA / UX Review
- 使用者明確要求總體檢
- 使用者明確要求判斷是否進下一階段

Builder / Codex 可以準備審查資料，但不主動要求審查。

本規則優先於舊有「每階段自動要求審查」或「完成後必須由使用者主動觸發審查」語氣。

---

## 1. Core Principle

不要每個 prompt 執行完就審查。

原因：

- 會造成使用者反覆複製貼上
- 會讓 Reviewer 對小差異過度挑剔
- 會打斷 Builder 施工節奏
- 會讓 AI 工作流變得官僚
- 不符合 MVP 高速迭代需求

正確做法：

- Builder 小步施工
- Builder 更新階段成果
- 階段完成後再由 LAIBE_REVIEWER 一次總審查

---

## 2. Phase Review Packet

所有需要進入階段審查的成果，應整理到：

docs/CURRENT_PHASE_REVIEW_PACKET.md

此文件是 LAIBE_REVIEWER 執行階段總審查的主要輸入。

它不是永久規則。  
它不是完整歷史紀錄。  
它不是聊天摘要。  
它是本階段驗收資料包。

---

## 3. When to Update Phase Review Packet

以下任務完成後，應更新 docs/CURRENT_PHASE_REVIEW_PACKET.md：

- 網站主流程 Builder 完成一段 routing / CTA / header / dashboard flow 工作
- 平面拼圖 Builder 完成一段 plan-puzzle 功能或資料結構工作
- 預算生成 Builder 完成一段 budget-system / specDB 工作
- AI_ARCHITECT_CORE 完成一段 AGENTS / AI_RULES / templates 制度更新
- LAIBE_VISUAL_SIM 完成一批網站視覺素材 brief
- 任一聊天室完成可被視為「階段成果」的任務

不需要每個微小修改都更新。  
但每個階段結束前必須更新。

---

## 4. What Phase Review Should Check

LAIBE_REVIEWER 階段總審查應檢查：

- 各聊天室成果是否互相衝突
- 是否有任務邊界混亂
- 是否有人越界施工
- 是否違反 AGENTS.md
- 是否違反 AI_RULES
- 是否有 routing / CTA / header 風險
- 是否有 plan-puzzle 與 budget-system 邊界混淆
- 是否有資料模型風險
- 是否有 handoff 不一致
- 是否有重複規則
- 是否有未完成事項被當成完成
- 是否有 placeholder 被包裝成正式功能
- 是否有模擬圖被誤當真實案例或正式成果

---

## 5. Builder Responsibility

Builder 不需要每次完成小任務都交給 Reviewer。

Builder 需要做的是：

- 完成階段工作
- 更新 docs/CURRENT_PHASE_REVIEW_PACKET.md
- 更新 docs/NEXT_CODEX_HANDOFF.md，若符合 handoff 條件
- 說明本階段完成什麼
- 說明修改哪些檔案
- 說明尚未完成什麼
- 說明是否建議進入階段總審查

---

## 6. Reviewer Responsibility

LAIBE_REVIEWER 不應要求每個小任務都由使用者主動觸發審查。

LAIBE_REVIEWER 應支援：

- 單一任務審查
- 階段總審查

當使用者說：

「請執行本階段總審查」

或

「幫我掃一遍目前所有聊天室階段成果」

LAIBE_REVIEWER 應自動進入 Phase Review 模式。

---

## 7. Phase Review Output

LAIBE_REVIEWER 階段總審查必須輸出：

## 總評

## 審查結論

請只選一個：

- Pass，可進入下一階段
- Conditional Pass，修正指定問題後可進入下一階段
- Fail，必須退回指定 Builder / Architect 修正

## 各聊天室成果整理

## 跨聊天室衝突

## 高風險問題

## 中風險問題

## 低風險問題

## Routing / CTA / Header 總檢查

## Plan-puzzle / Budget-system 邊界檢查

## AI_RULES / AGENTS / Templates 檢查

## Handoff / Phase Review Packet 檢查

## 建議修正順序

## 給各聊天室的退回指令

---

## 8. Important Rule

階段總審查是「總體一致性審查」，不是程式碼風格爭論。

LAIBE_REVIEWER 不應因為不同聊天室對 code style 有輕微差異就退回。  
除非該差異造成：

- 功能錯誤
- routing 錯誤
- 資料模型破壞
- 使用者流程混亂
- 維護風險
- 規則衝突
- 無法交接

否則不應過度挑剔。

---

## Budget Three-Warehouse Phase Review

Phase Review 中，原本「預算生成 Builder」應改為三倉庫檢查：

1. 配件倉庫：工法與規格
2. 原物料採購與倉儲
3. 成品物流：預算表單輸出

Phase Review 應檢查：

- 三倉庫是否越界
- 成品物流是否只讀 BudgetOutputSnapshot / RenderedBudgetDocument
- 成品物流是否未重新跑 budget engine
- 成品物流是否未讀 pricing rules / material resolver
- 配件倉庫是否未修改 renderer
- 原物料採購與倉儲是否未修改 renderer
- 三倉庫之間的資料銜接是否清楚
- 是否有把 output renderer 當成 budget engine 的錯誤
- 是否有把材料採購規則混入 MethodSpec 主規則
- 是否有把 MethodSpec 主規則混入 renderer

---

## 本次整合說明

- 新增萊比 Phase Review 制度，將小任務逐輪審查改為階段總審查。
- 明確定義 docs/CURRENT_PHASE_REVIEW_PACKET.md 是階段驗收資料包，不取代 handoff 或永久規則。
- 已補充預算生成系統三倉庫 Phase Review 檢查規則。
