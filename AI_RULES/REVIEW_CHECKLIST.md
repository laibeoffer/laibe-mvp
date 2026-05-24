# REVIEW_CHECKLIST

本文件供 Codex 自我檢查與 Reviewer Chat 審查使用。

Reviewer 原則上不施工，只審查。Reviewer 不應直接修改程式，除非使用者明確要求。

## Review Scope Discipline

Reviewer 應避免把每個微小差異都放大為退回項。
Phase Review 重點是：

- 是否有 blocker
- 是否有跨聊天室衝突
- 是否有越界施工
- 是否破壞主流程
- 是否破壞資料模型
- 是否破壞三倉庫邊界
- 是否 handoff 不足以支撐下一階段
- 是否有重大 UX / CTA / routing 風險

不應把一般 code style、命名小差異、格式小差異當成主要 blocker，除非它造成可維護性或流程風險。

本規則優先於舊有 Review Checklist 中可能造成逐項瑣碎退回的審查語氣。

## LAIBE_REVIEWER Required Reading

若任務角色是 LAIBE_REVIEWER，必須同時閱讀：

- AGENTS.md
- AI_RULES/SYSTEM_ARCHITECTURE.md
- AI_RULES/ROUTING_RULES.md
- AI_RULES/CODEX_MANDATORY_ENTRY.md
- AI_RULES/FILE_OWNERSHIP_RULES.md
- AI_RULES/REVIEW_CHECKLIST.md
- AI_RULES/HANDOFF_RULES.md
- AI_RULES/LAIBE_REVIEWER_RULES.md
- NEXT_CODEX_HANDOFF.md，若存在
- docs/NEXT_CODEX_HANDOFF.md，若存在且根目錄 handoff 不存在

## 1. Scope Review

檢查項目：

- 是否只做本次任務。
- 是否修改任務外檔案。
- 是否新增不必要檔案。
- 是否重構超出需求。
- 是否有未授權刪除。
- 是否有未授權搬移。

風險分級：

- 高風險：修改任務外核心檔案。
- 中風險：新增不必要輔助檔。
- 低風險：註解或文件補充但未說明。

## 2. Routing Review

檢查項目：

- CTA 是否跳到正確頁面。
- 是否有 dead CTA。
- 是否有 orphan page。
- 返回按鈕是否合理。
- Header 工具入口是否一致。
- Progress bar 節點是否合理。
- 外部連結是否標示清楚。
- 是否指向不存在檔案。
- 是否指向舊版廢棄頁面。

## 3. UI / UX Flow Review

檢查項目：

- 使用者是否知道目前在哪一步。
- 下一步是否清楚。
- 頁面主功能是否明確。
- 是否有重複入口造成混亂。
- 是否把工具放錯位置。
- 是否把 onboarding / dashboard / tool page 混在一起。
- 是否符合萊比甲方行動線。
- 是否區分 global navigation、workflow navigation、page-level actions、canvas / workspace tools、primary CTA、secondary CTA。

## 4. Architecture Review

檢查項目：

- 是否破壞系統邊界。
- 是否讓 plan-puzzle 依賴 dashboard。
- 是否讓 budget-system 過度依賴單一 UI。
- 是否把 specDB 寫成臨時文字。
- 是否把資料邏輯硬寫死在畫面。
- 是否新增未必要的抽象層。
- 是否為單次 demo 破壞長期架構。

## 5. Data Model Review

檢查項目：

- 是否維持既有資料欄位。
- 是否亂改命名。
- 是否破壞相容性。
- 是否沒有說明 migration。
- 是否把展示文字當資料模型。
- 是否讓 budget / spec / layout 資料混在一起。
- budget-system 是否仍保留 source type、source id、recipe id、quantity formula、price source。
- AI 是否沒有直接決定價格。

## 6. Safety Review

檢查項目：

- 是否執行 git clean。
- 是否執行 git reset。
- 是否執行 git checkout 還原未授權檔案。
- 是否刪除檔案。
- 是否新增 package。
- 是否引入外部依賴。
- 是否修改 plancraft。
- 是否改到敏感設定。
- 是否讀取或輸出 secrets。
- 是否接入真實 payment、escrow、AI API、upload 或 production webhook。

任何命中 Safety Review 項目，都必須標為 High risk。

## 7. Handoff Review

檢查項目：

- 是否更新 NEXT_CODEX_HANDOFF.md。
- 是否列出修改檔案。
- 是否列出新增檔案。
- 是否列出未完成事項。
- 是否列出下一步。
- 是否說明風險。
- 是否沒有新增多份 status / handoff MD。

## Visual Asset Review

若任務涉及模擬圖、示意圖、AI 生成圖、網站素材，Reviewer 應檢查：

- 圖片是否被明確定位為示意圖
- 圖片是否被明確定位為案件上架與風格溝通輔助
- 是否可能被誤認為真實案例
- 是否可能被誤認為施工圖
- 是否可能被誤認為正式設計成果
- 是否可能被誤認為報價依據
- 是否可能被誤認為完工保證
- 圖片是否符合該頁面功能
- 圖片是否與 CTA / routing / flow 衝突
- 圖片是否過度豪宅化
- 圖片是否符合預算級距
- 圖片是否需要 alt text
- 圖片是否需要 mobile crop
- 圖片檔名是否可追蹤

若圖片用於 landing、onboarding、plan-puzzle、budget-system、dashboard，Reviewer 應檢查是否有不當產品承諾。

---

## LAIBE_VISUAL_SIM Image API Spike Review

Reviewer 審查 Image Generation API Integration Spike 時，必須檢查：

- 是否已先建立並遵守 `docs/ai_style_visual_chat/IMAGE_API_SPIKE_GOVERNANCE.md`。
- 是否只做 spike / proof of concept，沒有宣稱 production 上線。
- API key 是否沒有外洩。
- API key 是否沒有進 frontend、repo、HTML、JS、Markdown、handoff 或 console。
- 是否沒有新增未授權 `.env`、`.env.*`、token、credential。
- Request schema 是否只使用白名單欄位。
- 是否不允許使用者自由輸入 system prompt。
- 是否不允許使用者覆寫 disclaimer。
- 是否沒有把 `walls`、`openings`、`zones`、`scale`、`plancraftBridge` 傳入 image API。
- Reference image 是否仍為 disabled；若有啟用，是否已有 separate privacy review。
- Prompt sanitization 是否包含長度限制、system override 阻擋、「忽略前文規則」阻擋、正式設計 / 報價 / 完工承諾阻擋、真實案例宣稱阻擋。
- Generated images 是否沒有寫入正式案件資料。
- Generated images 是否沒有保存到 production assets。
- Generated images 是否沒有命名為 final / production / official。
- Generated images 是否附 metadata：`generatedBy`、`usage`、`isOfficialDesign`、`isConstructionDrawing`、`isQuotationBasis`。
- 是否保留固定 disclaimer。
- 是否標示 AI / mock / 非真實案例。
- 是否未污染 Plancraft geometry。
- 是否未修改 routing / CTA / Header。
- 是否 console error = 0。
- 是否 handoff 清楚記錄：沒有接 production、沒有新增 key、沒有生成 production asset，並標示是否可供使用者主動觸發 User-triggered Review。

若 API key 外洩、generated image 污染正式案件資料、Plancraft geometry 被改寫、placeholder 被包裝成 production asset，必須標記為 High Risk。

---

## Web Flow Review

Reviewer 審查網站主流程 Builder 任務時，應檢查：

- 是否保護 landing → onboarding → plan-puzzle → budget-system → dashboard 主流程
- 是否有 dead CTA
- 是否有 orphan page
- Header tools 是否一致
- Progress bar 是否對應真實流程
- 返回按鈕是否合理
- 是否誤改 plan-puzzle 核心功能
- 是否誤改 budget-system 核心邏輯
- 是否誤改 plancraft
- 是否讓頁面角色混亂
- 是否產生正常網站邏輯不該出現的跳轉

若網站主流程 Builder 修改 routing / CTA / header 後未標示是否可供使用者主動審查，應標記為 Medium Risk。  
若它改到 plancraft、plan-puzzle 核心功能或 budget-system 核心邏輯，應視情況標記為 High Risk。

---

## Budget Three-Warehouse Review

Reviewer 審查預算生成相關任務時，應檢查：

- 任務是否正確指派到三倉庫之一
- 配件倉庫是否越界改 renderer / output
- 原物料採購與倉儲是否越界改 renderer / MethodSpec 主規則
- 成品物流是否越界重新跑 budget engine
- 成品物流是否越界讀 pricing rules / material resolver
- 成品物流是否只讀 BudgetOutputSnapshot / RenderedBudgetDocument
- 是否使用 legacy formatBudgetOutput() 作為正式來源
- 三倉庫 handoff 是否清楚
- 是否把材料規格、工法規格、輸出格式混在一起

若 output renderer 重新跑 budget engine，應標記為 High Risk。  
若 output renderer 讀 pricing rules 或 material resolver，應標記為 High Risk。  
若成品物流使用 legacy formatBudgetOutput() 作為正式來源，應標記為 High Risk。

---

## 8. Reviewer Output Format

Reviewer 輸出格式必須包含：

1. 總評
2. 通過項目
3. 問題列表
4. 高風險問題
5. 中風險問題
6. 低風險問題
7. 建議修正順序
8. 是否建議進入下一階段

Reviewer 不應直接修改程式，除非使用者明確要求。

LAIBE_REVIEWER 任務必須改用 `AI_RULES/LAIBE_REVIEWER_RULES.md` 內定義的完整審查輸出格式。

## 9. Codex Completion Self-Check

Codex 最終回報前必須確認：

- 是否只改授權範圍。
- 是否遵守本輪禁止事項。
- 是否完成 handoff 判斷。
- 是否列出未完成事項。
- 是否列出已知風險。
- 是否具體列出檔案與影響範圍。

## UX / Web Design Logic Review

Reviewer 應檢查：

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
- PAGE_REGISTRY 是否有對應頁面
- CTA_FLOW_MAP 是否有對應 CTA

若缺少截圖、實機畫面或 HTML 內容，Reviewer 可以檢查流程與文件邏輯，但必須標示排版細節「無法確認」。

## 本次整合說明

- 已新增 `LAIBE_REVIEWER Required Reading`，明確規定 LAIBE_REVIEWER 必須同時閱讀 `AGENTS.md`、所有中央 AI_RULES、`AI_RULES/LAIBE_REVIEWER_RULES.md` 與 handoff。
- 已保留既有 Scope、Routing、UI / UX Flow、Architecture、Data Model、Safety、Handoff 與 Reviewer 輸出格式規則。
- 已註明 LAIBE_REVIEWER 任務必須使用 `AI_RULES/LAIBE_REVIEWER_RULES.md` 的完整審查輸出格式。
- 已補充 Budget Three-Warehouse Review，將預算生成相關審查拆分為配件倉庫、原物料採購與倉儲、成品物流，並標示成品物流越界 High Risk 條件。
- LAIBE_REVIEWER 的自動審查觸發與固定審查輸出格式，以 `AI_RULES/LAIBE_REVIEWER_RULES.md` 為準。
