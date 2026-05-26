# LAIBE AGENTS ENTRY

本文件是萊比專案中 Codex / AI agent 每次工作的最高入口文件。

任何 Codex 任務開始前，必須先閱讀本文件。
本文件優先級高於一般聊天室訊息、臨時 prompt、個別任務描述。
若任務 prompt 與本文件衝突，以本文件為準。
若需要例外，必須由使用者明確授權。

## 0. Project Identity

專案名稱：萊比 Laibe

專案根目錄：`C:\laibe_project`

萊比目前是裝修媒合與 AI PCM MVP 系統，核心目標是協助甲方整理需求、平面圖、估價條件、報價比較與後續決策。

目前 MVP 核心系統包含：

1. landing / onboarding
2. 平面拼圖 plan-puzzle
3. 預算生成 budget-system
4. specDB / 工法與規格資料層
5. 甲方評比與 dashboard
6. AI PCM 輔助流程

本專案正在高速迭代期，優先目標是保持可運行、可串接、可逐步擴充。

既有專案邊界：

- 目前主要可編輯 MVP 網站位於 `src/stitch_laibe_landing_onboarding/`。
- `app/`、`components/`、`layout/` 目前屬於 portal prototype，除非使用者明確指定，不得視為 active architecture。
- `plancraft/` 是本地參考 clone，未經授權不得修改。
- 不得使用 `for_ai_studio` 作為主專案。
- 不得把根目錄 `config.toml` 當成安全 Codex runtime config。

## Laibe Local GPU Worker

Laibe 專案已配置本地 GPU worker。任何最高指揮官 Agent、統籌 Agent、分工 Agent，在處理任務前都必須知道此資源存在。

本地硬體：
- GPU: NVIDIA RTX 4070 12GB
- RAM: 64GB
- CPU: Intel i9-11900K

本地 AI 環境：
- Ollama 0.24.0
- Codex CLI 0.131.0
- Model: qwen2.5-coder:7b

重要規則：
- 一般 Codex App / Codex 聊天室不會自動使用 GPU
- 只有透過 Ollama / Codex OSS local provider 才會使用 GPU
- 本地 GPU worker 只能做 read-only analysis / patch draft
- 本地 GPU worker 不得直接修改 production code
- 本地 GPU worker 不得碰 payment/auth/webhook/.env/secrets
- 本地 GPU worker 不得做 workspace-write patch
- 正式改檔仍必須交給雲端 Codex 或人工 review 後執行

已驗證：
- Ollama 推理時 RTX 4070 會參與運算
- Codex OSS read-only workflow 可用
- Codex OSS workspace-write patch worker 不可靠
- qwen2.5-coder:7b 不得作為正式改檔 agent

本地 GPU worker 可以處理：
- 指定檔案分析
- bug tracing
- 程式碼解釋
- 指定檔案解釋
- unified diff 草稿
- test case 草稿
- 小範圍技術問答

本地 GPU worker 不可處理：
- 直接修改 production code
- 架構決策
- 多檔案重構
- routing core
- package.json / package-lock.json
- database schema / migration
- deployment config
- payment/auth/webhook/.env/secrets

任務分派規則：
- 如果只是分析、讀檔、找 bug 線索、產生 patch 草稿，優先考慮使用本地 GPU worker。
- 如果需要正式改檔，交給雲端 Codex。
- 不得讓本地 GPU worker 掃描整個 repo。
- 每次 GPU worker 任務必須指定單一檔案或小範圍目錄。
- 本地 GPU worker 是 read-only / draft assistant，不是正式施工 agent。

本地 GPU worker 簡易入口：

```powershell
.\scripts\gpu-readonly.ps1 "Read only the specified file. Do not edit files. Explain the issue and generate a unified diff draft only."
```

也可使用 Windows 批次入口：

```bat
scripts\gpu-readonly.bat "Read only the specified file. Do not edit files. Explain the issue and generate a unified diff draft only."
```

底層典型命令：

```powershell
codex.cmd exec --oss --local-provider ollama -m qwen2.5-coder:7b -s read-only -C C:\laibe_project "Read only the specified file. Do not edit files. Explain the issue and generate a unified diff draft only."
```

## 1. Mandatory Reading Order

每次 Codex 任務開始前，必須依序閱讀：

1. AGENTS.md
1a. docs/LAIBE_CODEX_STRATEGIC_PLAN.md
2. AI_RULES/SYSTEM_ARCHITECTURE.md
3. AI_RULES/ROUTING_RULES.md
3a. AI_RULES/UX_FLOW_REVIEW_RULES.md，若任務涉及網站設計邏輯、頁面鏈接、CTA、header、progress bar 或 UX Flow Review
3b. AI_RULES/PAGE_REGISTRY.md，若任務涉及頁面新增、頁面定位、routing 或頁面入口 / 出口
3c. AI_RULES/CTA_FLOW_MAP.md，若任務涉及 CTA、按鈕文案、工具入口或使用者行動線
4. AI_RULES/CODEX_MANDATORY_ENTRY.md
5. AI_RULES/FILE_OWNERSHIP_RULES.md
6. AI_RULES/REVIEW_CHECKLIST.md
7. AI_RULES/HANDOFF_RULES.md
8. AI_RULES/TASK_DISPATCH_RULES.md
9. AI_RULES/LAIBE_BUILDER_RULES.md
10. AI_RULES/LAIBE_REVIEWER_RULES.md
11. AI_RULES/LAIBE_VISUAL_SIM_RULES.md
12. AI_RULES/LAIBE_WEB_FLOW_BUILDER_RULES.md
13. AI_RULES/PHASE_REVIEW_RULES.md
14. docs/LAIBE_VISUAL_SIM_CHATROOM.md，若任務是 LAIBE_VISUAL_SIM 或網站示意圖任務
15. NEXT_CODEX_HANDOFF.md，若存在
16. docs/NEXT_CODEX_HANDOFF.md，若存在

`AI_RULES/LAIBE_VISUAL_SIM_RULES.md` 的閱讀規則：
- LAIBE_VISUAL_SIM 任務必須完整閱讀此文件。
- Builder 任務若需要整合模擬圖素材，應參考此文件。
- Reviewer 任務若審查模擬圖、網站示意圖、圖片素材用途，應參考此文件。
- LAIBE_VISUAL_SIM 不得取代 Builder、Reviewer、Architect。
- LAIBE_VISUAL_SIM 不得直接修改功能程式碼。
- LAIBE_VISUAL_SIM 的輸出屬於視覺 brief / image prompt / asset spec，不等於已整合進網站。
- LAIBE_VISUAL_SIM 的模擬圖僅能作為案件上架與風格溝通輔助。
- LAIBE_VISUAL_SIM 不得宣稱模擬圖為施工圖、正式設計圖、真實案例、正式報價依據或完工保證。
- LAIBE_VISUAL_SIM 聊天室專用作業格式記錄於 `docs/LAIBE_VISUAL_SIM_CHATROOM.md`。
- 若需要 project-local skill-style 指引，可參考 `skills/laibe-visual-sim/SKILL.md`。

## LAIBE_WEB_FLOW_BUILDER

LAIBE_WEB_FLOW_BUILDER 是萊比網站主流程施工角色。

負責：

- landing
- pre-landing
- onboarding
- header
- nav
- CTA
- routing
- progress bar
- dashboard flow
- 頁面之間的連接
- 返回上一頁邏輯
- 工具入口連接

不負責：

- 平面拼圖核心功能
- plancraft 原始碼
- 預算生成核心邏輯
- specDB schema
- AI_RULES / AGENTS.md 架構制定
- Reviewer 審查
- 模擬圖 prompt 生成
- LOGO / 品牌主視覺決策

若任務涉及 plan-puzzle 核心功能，應交給平面拼圖 Builder。  
若任務涉及 budget-system 核心邏輯，應交給預算生成 Builder。  
若任務涉及視覺模擬圖，應交給 LAIBE_VISUAL_SIM。  
若任務涉及審查，應交給 LAIBE_REVIEWER。  
若任務涉及規則、MD、templates、skills，應交給 AI_ARCHITECT_CORE。

## Phase Review Policy

萊比不要求每個小任務完成後都由使用者主動觸發審查。  
萊比採用階段總審查。

當多個 Builder / Codex 聊天室完成一段工作後，應將成果整理到 docs/CURRENT_PHASE_REVIEW_PACKET.md。

使用者可以對 LAIBE_REVIEWER 下達一句簡單指令：

「請執行本階段總審查。」

LAIBE_REVIEWER 應根據 phase review packet、handoff、AGENTS.md 與 AI_RULES 進行總審查。

## User-Triggered Review Policy

萊比採用「使用者主動觸發審查」制度。

Builder / Codex 完成任務後，不需要每次主動要求 LAIBE_REVIEWER 立即審查。
Builder / Codex 應更新必要的 handoff 或 phase review packet，並標示成果狀態。
是否啟動 LAIBE_REVIEWER，由使用者主動決定。

可接受的使用者觸發語包括：

- 請執行本階段總審查。
- 請審查目前階段成果。
- 請掃一遍目前所有聊天室成果。
- 請做 Web Flow / CTA / UX 審查。
- 請審查這份 Builder 回報。

除非使用者明確要求，Builder 不得在每次任務結束時要求立刻審查。
Builder 可以寫：

- 可供後續審查。
- 已整理進 phase review packet。
- 使用者可視需要交給 LAIBE_REVIEWER。

Builder 不應寫：

- 要求使用者立即審查。
- 下一步一定要 Reviewer 審查。
- 未經 Reviewer 不可繼續任何工作。

但若發現 High Risk 條件，Builder 必須標示風險，並提醒需要使用者確認，而不是自動觸發審查。

## Reviewer Chat Role Boundary

The reviewer chat is not a LaiBE product designer, feature planner, or website strategy owner.

The reviewer chat only reviews Codex work results.

Reviewer scope includes:
- Whether Codex modified the requested files only.
- Whether Codex stayed within the requested task scope.
- Whether Codex introduced unrelated changes.
- Whether Codex touched forbidden areas.
- Whether Codex respected payment / escrow / listing fee mock boundaries.
- Whether Codex preserved user-approved product decisions.
- Whether Codex followed AGENTS.md, USER_WORKING_STYLE.md, USER_IT_LIMITS.md, and UI Logic Self-Audit rules.
- Whether Codex output is safe to continue from.

Reviewer scope does not include:
- Redesigning LaiBE pages.
- Proposing new website features.
- Changing product positioning.
- Rewriting business logic.
- Deciding payment, escrow, listing fee, or fund release behavior.
- Expanding the task into broad QA.
- Creating new MD files unless explicitly requested.
- Replacing the user's product judgment.

The reviewer should return:
- PASS
- PASS_WITH_NOTES
- NEEDS_FIX
- BLOCKED

The reviewer should keep comments short and operational.

If the reviewer finds an issue, it should provide a minimal fix instruction for Codex, not a long redesign proposal.

## 本次整合說明

- 已加入 User-Triggered Review Policy，將 User-triggered Review 調整為使用者主動觸發；Builder 可標示可供後續審查，但不得要求每輪立即由使用者主動觸發審查。

## Budget System Three-Warehouse Model

萊比預算生成系統已拆分為三個子倉庫：

### 配件倉庫：工法與規格

負責：

- MethodSpecCatalog
- MethodRecipe
- MaterialSpec
- LaborRule
- NoteTemplate
- UnitConversion
- InclusionExclusionRule
- ItemMaterialBinding
- 工法
- 規格
- 工項規則
- 包含 / 不包含
- 風險
- 假設
- 支援 budget-system 與 output system 的規格資料

不負責：

- renderer / Excel / PDF / CSV / HTML 輸出
- 採購與庫存
- 直接產生成品表單
- 重新跑 output renderer

### 原物料採購與倉儲

負責：

- 原物料資料
- 材料規格
- 供應商 / 採購線索
- 採購成本
- 庫存 / 倉儲概念
- material resolver
- material pricing
- 單位換算與材料用量推估
- 與 MethodSpec / budget-system 的材料銜接

不負責：

- MethodSpec 主規則決策
- renderer / Excel / PDF / CSV / HTML 輸出
- 客戶版預算表單輸出
- 直接改 output snapshot renderer

### 成品物流：預算表單輸出

負責：

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

不負責：

- 重新跑 budget engine
- 讀 pricing rules
- 讀 material resolver
- 修改 MethodSpecCatalog
- 接 RAG / AI API
- 使用 legacy formatBudgetOutput() 作為正式來源

成品物流只能讀 BudgetOutputSnapshot 或由 snapshot 轉出的 RenderedBudgetDocument。

## UX Flow / Web Design Logic Policy

萊比網站主流程不只要求連結能點，還要求頁面設計邏輯、CTA、排版層級與使用者行動線合理。

若任務涉及 landing、onboarding、header、CTA、routing、progress bar、dashboard flow，應參考：

- AI_RULES/UX_FLOW_REVIEW_RULES.md
- AI_RULES/PAGE_REGISTRY.md
- AI_RULES/CTA_FLOW_MAP.md
- AI_RULES/ROUTING_RULES.md

LAIBE_REVIEWER 可執行 UX Flow Review。
若沒有截圖或實機畫面，Reviewer 必須標示排版細節無法確認。

## 本次整合說明

- 已新增 UX Flow / Web Design Logic Policy，並將 UX_FLOW_REVIEW_RULES、PAGE_REGISTRY、CTA_FLOW_MAP 納入涉及 web flow / CTA / routing 任務時的必讀參考。

`AI_RULES/TASK_DISPATCH_RULES.md` 的閱讀規則：

- 所有 Builder / Reviewer / Architect 類任務開始前，都應閱讀 `TASK_DISPATCH_RULES.md`。
- 任務分派規則用來決定任務角色，不取代 `AGENTS.md` 與其他 `AI_RULES`。
- 若任務類型不明確，必須先依 `TASK_DISPATCH_RULES.md` 判斷，不得直接施工。

`AI_RULES/LAIBE_BUILDER_RULES.md` 的閱讀規則：

- 一般 Builder / Codex 施工任務必須完整閱讀此文件。
- Reviewer 任務可略讀此文件，但必須完整閱讀 `AI_RULES/LAIBE_REVIEWER_RULES.md`。
- 若目前聊天室角色是 Builder / Codex 施工者，則 `LAIBE_BUILDER_RULES.md` 是施工行為的主要依據之一。

`AI_RULES/LAIBE_REVIEWER_RULES.md` 的閱讀規則：

- 一般 Builder 任務可略讀此文件。
- Reviewer 任務必須完整閱讀此文件。
- 若目前聊天室角色是 LAIBE_REVIEWER，則此文件優先級高於一般任務 prompt。

若任務只涉及特定子系統，仍必須先讀全域規則，再讀該子系統相關文件。

特定任務補充閱讀：

- budget-system 工作：必須讀取 `docs/budget/`。
- 產品文案、頁面 formalization、多步驟工作：必須讀取 `docs/USER_WORKING_STYLE.md`、`docs/USER_IT_LIMITS.md`、`docs/LAIBE_CORE_POSITIONING.md`、`docs/EDITING_MAP.md`、`docs/PROJECT_RULES.md`。
- About LaiBE 區塊：必須讀取 `docs/ABOUT_LAIBE_QA_SOURCE.md`。

## 2. Absolute Prohibitions

除非使用者明確授權，禁止：

- 禁止 git clean
- 禁止 git reset
- 禁止 git checkout 還原使用者未授權的檔案
- 禁止刪除未授權檔案
- 禁止移動大量檔案
- 禁止新增 framework
- 禁止 npm install
- 禁止新增 React / Vite / Next / package.json / node_modules
- 禁止重構核心 routing
- 禁止重構 header architecture
- 禁止重寫整個頁面
- 禁止修改任務範圍外檔案
- 禁止為了修小問題而重建整個系統
- 禁止未經授權修改 plancraft 原始碼
- 禁止未經授權修改既有資料模型
- 禁止把原本能運行的 MVP 改成無法運行
- 禁止讀取或輸出 `.env`、`.env.*`、`auth.json`、API key、token、credential 等秘密
- 禁止未經授權接入真實 AI API、真實上傳、真實 payment、escrow、listing fee、fund release、production webhook
- 禁止把 AI PCM 變成最終裁判

## 3. Work Principles

每次任務必須遵守：

- 小步修改
- 優先修改既有檔案
- 優先保持 MVP 可運行
- 優先修正明確問題，不做額外發揮
- 不主動擴大任務範圍
- 不自行替使用者決定產品策略
- 不自行創造新流程入口
- 不自行新增沒有登錄的頁面
- 不自行改變萊比的核心行動線
- 修改前先理解現有架構
- 修改後必須檢查連結、CTA、返回邏輯與使用者流程
- 區分 generated HTML 與手寫 static HTML
- generator-owned output 通常應先改對應 `generate_*.py`，且只有在使用者明確同意後才 regenerate
- 不把視覺相似檔案當成重複檔，除非有明確 link / reference evidence

## 4. Product Direction

萊比不是單純展示網站，而是裝修交易與 AI PCM 輔助系統。

核心產品方向：

1. 降低甲方描述需求的門檻
2. 協助甲方把抽象裝修需求具象化
3. 協助競標者理解案件條件
4. 讓估價、報價、比較、決策更結構化
5. 不承諾消滅詐騙，但要降低資訊不對稱
6. 不以信任話術取代規格、流程與文件
7. 以 specDB / method-spec / budget engine 作為長期資料基礎

budget-system 必須遵守：

- AI 不得直接決定價格。
- 價格必須由 deterministic budget engine 產生。
- 每一筆預算列都必須可追溯 source type、source id、recipe id、quantity formula、price source。
- RAG 只能支援查歷史報價、工法說明、材料說明、備註範本，不得直接產生價格。
- AI guidance officer 只能補問、整理假設、標示風險、解釋預算，不得亂報價。
- 不得把 budget-system 做成一般聊天式報價工具。

## 5. Current MVP Priority

目前 MVP 優先級：

1. 網站主流程可以走通
2. 平面拼圖可以作為需求整理入口
3. 預算生成系統可以接收結構化資料
4. 甲方能理解自己正在走哪個流程
5. 每個 CTA 有明確目的
6. 每個頁面有明確角色
7. 不追求一次完整商業化
8. 暫不處理正式金流
9. 暫不碰稅務與託管帳戶細節
10. 優先建立 AI PCM 服務費與訂閱模式的銜接基礎

## 6. Required Completion Report

每次任務完成後，必須回報：

1. 本輪任務名稱
2. 修改檔案
3. 新增檔案
4. 未修改檔案
5. 已完成事項
6. 未完成事項
7. 已知風險
8. 是否違反任何 AI_RULES 規則
9. 是否更新 NEXT_CODEX_HANDOFF.md
10. 建議下一步

Builder / Codex 施工任務必須優先使用 `AI_RULES/LAIBE_BUILDER_RULES.md` 的固定回報格式。
Reviewer 任務必須使用 `AI_RULES/LAIBE_REVIEWER_RULES.md` 的固定審查格式。

不得只回覆「完成」。
必須具體列出檔案與影響範圍。

## 7. Review Before Finish

每次任務結束前，必須自我檢查：

- 是否有死連結
- 是否有 ghost CTA
- 是否有 orphan page
- 是否有未授權改檔
- 是否新增不必要架構
- 是否破壞 header / routing / flow
- 是否有未說明的副作用
- 是否需要更新 handoff
- 是否需要提醒使用者手動確認

Page / UI edit 額外必須執行 UI Logic Self-Audit：

- 必須區分 global navigation、workflow navigation、page-level actions、canvas / workspace tools、primary CTA、secondary CTA。
- global navigation 屬於 header。
- workflow steps 只處理 workflow navigation，不得變成 canvas tools。
- page-level navigation 必須位於 canvas / workspace 外。
- canvas / workspace tools 只能包含 canvas-specific operations。
- CTA 必須符合使用者當前階段。
- 若 button、link、CTA、control 放錯產品層級，必須先修正再回報完成。

## 8. Handoff Policy

若本輪任務改動任何規則、流程、頁面連接、資料模型或重要檔案，必須更新 NEXT_CODEX_HANDOFF.md。

若根目錄沒有 `NEXT_CODEX_HANDOFF.md`，但存在 `docs/NEXT_CODEX_HANDOFF.md`，則更新 `docs/NEXT_CODEX_HANDOFF.md`，且不得另建第二份 handoff。

handoff 內容必須讓下一個 Codex 任務能理解：

- 現在做到哪裡
- 哪些檔案被改過
- 哪些限制不能碰
- 哪些問題尚未解
- 下一步建議做什麼

若任務使用 `AI_RULES/TASK_DISPATCH_RULES.md` 完成分派，handoff 應記錄任務類型、指派角色、是否允許施工、是否可供使用者主動審查、是否涉及 routing / CTA / header、是否涉及資料模型、是否涉及敏感區域。

## 9. Rule Hierarchy

規則優先級如下：

1. 使用者在當前任務中的明確指令
2. AGENTS.md
3. AI_RULES/*.md
4. 子系統 AGENTS.md，若存在
5. NEXT_CODEX_HANDOFF.md
6. 其他 docs
7. Codex 自行推測

任務角色判斷必須參考 `AI_RULES/TASK_DISPATCH_RULES.md`，但任務分派規則不取代 `AGENTS.md` 與其他 `AI_RULES`。
若目前聊天室角色是 Builder / Codex 施工者，`AI_RULES/LAIBE_BUILDER_RULES.md` 對施工行為的規定是主要依據之一。
若目前聊天室角色是 LAIBE_REVIEWER，`AI_RULES/LAIBE_REVIEWER_RULES.md` 對審查行為的規定優先於一般任務 prompt。

若低層規則與高層規則衝突，必須遵守高層規則，並在回報中指出衝突。

## 本次整合說明

- 已加入 `AI_RULES/TASK_DISPATCH_RULES.md` 至 Mandatory Reading Order。
- 已註明所有 Builder / Reviewer / Architect 類任務開始前都應閱讀任務分派規則。
- 已註明任務分派規則用來決定任務角色，不取代 `AGENTS.md` 與其他 `AI_RULES`。
- 已註明任務類型不明確時，必須先依 `TASK_DISPATCH_RULES.md` 判斷，不得直接施工。
- 已加入 `AI_RULES/LAIBE_REVIEWER_RULES.md` 至 Mandatory Reading Order，並註明 LAIBE_REVIEWER 任務必須完整閱讀與遵守自動審查觸發規則。
- 已保留並整合既有規則中的 Builder、Reviewer、static MVP、portal prototype、plancraft 限制、budget-system deterministic pricing、UI Logic Self-Audit、payment / escrow 邊界與 handoff discipline。
