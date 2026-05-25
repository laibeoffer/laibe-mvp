# CHATROOM_GITHUB_WORKSTREAMS.md

## Purpose

Map LaiBE chatrooms to scoped GitHub workstreams.

All construction work should happen on a scoped branch and finish with a PR.

Primary strategic source: `docs/LAIBE_CODEX_STRATEGIC_PLAN.md`.

## Global Dispatch / Heartbeat Rules

GitHub Issue is the formal dispatch ticket. `docs/WORKSTREAM_BLACKBOARD.md` is the battle board. Pull Request is the completion / review artifact. Heartbeat / automation is a patrol timer only, not a dispatch channel.

Deputy Codex dispatch must include:

- To:
- Workstream:
- Branch / Repo:
- Mission:
- Why this agent:
- Action:
- Need Commander:
- Need Reviewer:

Rules:

- `To:` must name exactly one primary agent / chatroom.
- Do not dispatch to "everyone".
- Do not provide only a branch name.
- Do not provide only a workstream name.
- Cross-workstream tasks must name a primary owner and list other workstreams as references only.
- `Need Commander: No` by default; set `Yes` only for product, visual, commercial, or high-risk formal decisions.
- `Need Reviewer: No` by default; set `Yes` only for Codex review NEEDS_FIX / P1 / P2, high-risk scope, explicit review request, or boundary-sensitive changes.

Heartbeat rules:

- Thread heartbeat only wakes the current chatroom.
- Deputy heartbeat patrols all Issues, PRs, blackboard status, and Codex review blockers.
- Workstream heartbeat patrols only that workstream's own `To:` / `Workstream:` Issues, related PRs, and blackboard section.
- A chatroom with GitHub connected is not automatically scheduled; it still needs its own heartbeat automation.

Full workflow:

- `docs/ISSUE_BLACKBOARD_PATROL_WORKFLOW.md`

## 網站主流程 / 網頁修改

- 負責什麼：landing、onboarding、header、CTA、routing、page formalization、頁面主流程。
- 不能碰什麼：budget core、plan-puzzle core、payment / escrow / listing fee、未授權新頁面。
- 對應 branch：`site/page-formalization`
- 完成後要開 PR。

## Plancraft fork / external read-only reference

- Repo：`laibeoffer/plancraft`
- Original：`pedroodb/plancraft`
- License：MIT License
- 角色：Plancraft SVG / DSL 平面圖工具 fork。
- 狀態：`plancraft/` 是 nested git repo，在 `laibe-mvp` 內只作為 read-only reference。
- 規則：不要把整個 `plancraft/` 直接提交進 `laibe-mvp`。
- 規則：若未來正式引用，需保留 third-party attribution / license note。
- 規則：不要把 Plancraft fork、LaiBE Importer UI、Plancraft Adapter Clean 混在同一個 PR。

## LaiBE Importer UI / 平面圖匯入工具

- Repo：`laibeoffer/laibe-mvp`
- Workstream：`plancraft/page-ui` 或 `plancraft/importer-ui`
- 主要檔案：
  - `src/stitch_laibe_landing_onboarding/preview_floor_plan/code.html`
  - `src/stitch_laibe_landing_onboarding/preview_floor_plan/plan-puzzle.js`
- 角色：萊比自製平面圖匯入與校正工具，用來補足原 Plancraft 不支援 PNG / JPG / PDF 匯入的問題。
- 負責什麼：PNG / JPG / JPEG 匯入、PDF 匯入接口與不支援預覽提示、FileReader underlay、底圖校正、canvas / toolbar、wall-first 工具、wallGraph / nodeGraph、openings / zones / zone boundary、`.pc` converter spike、renderer preview report。
- 不能碰什麼：budget adapter、formal estimate、Plancraft core、renderer / Excel / PDF、payment、AI API / upload backend。
- 規則：如果沒有新 diff，不要建立空 PR。
- Need Commander：只有涉及視覺、canvas tool hierarchy、CTA / routing 時才 Yes。
- Need Reviewer：No by default。

## Plancraft Adapter Clean / Budget Candidate Contract

- Repo：`laibeoffer/laibe-mvp`
- Workstream：`plancraft/adapter-clean`
- PR：#9 Add Plancraft adapter candidate contract
- Status：merged
- 主要檔案：
  - `src/lib/budget/adapters/preview-floor-plan-adapter.ts`
  - `src/lib/budget/types.ts`
  - `src/lib/budget/demo-generate-budget-from-preview-floor-plan.ts`
  - `docs/budget/plancraft-plus-production-adapter-design.md`
- 角色：Plancraft+ draft JSON 轉成 budget-system candidate data 的 adapter contract / spike。
- 負責什麼：candidate-only budget facts、zones -> Space candidate、openings -> QuantityFact candidate、nodeGraph.edges -> wall facts candidate、`productionReady: false`、`formalEstimateAllowed: false`、formal estimate guard blocked。
- 不能碰什麼：正式估價、`generateBudgetEstimate()` 正式流程、`BudgetEstimateLine.unit_price`、Plancraft core、preview floor plan UI、renderer / Excel / PDF、raw warehouse、MethodSpec、payment / escrow / listing fee、AI API / upload backend。
- 規則：demo 不呼叫 `generateBudgetEstimate()`；不產生正式估價。
- Need Commander：No，除非要改正式估價策略、產品流程或視覺互動。
- Need Reviewer：No by default；只有 Codex review 出現 NEEDS_FIX / P1 / P2，或越界到 formal estimate / `BudgetEstimateLine.unit_price` 才 Yes。

## 原物料採購與倉儲

- 負責什麼：RawCatalogSource、RawCatalogItem、Candidate、risk_flags、review queue、handoff proposal。
- 不能碰什麼：formal price、PricingRule、BudgetEstimateLine.unit_price、renderer、frontend、payment。
- 對應 branch：`warehouse/raw-candidate`
- 完成後要開 PR。

## 配件倉庫：工法與規格

- 負責什麼：MethodSpecCatalog、MethodRecipe、MaterialSpec、LaborRule、NoteTemplate、UnitConversion、validators。
- 不能碰什麼：renderer / output、raw warehouse、frontend、formal budget engine changes、payment。
- 對應 branch：`warehouse/method-spec`
- 完成後要開 PR。

## 成品物流：預算表單輸出

- 負責什麼：BudgetOutputSnapshot、RenderedBudgetDocument、customer_view、internal_view、renderer gate、preflight、manifest、dry-run writer。
- 不能碰什麼：pricing decisions、budget engine rerun、material resolver、MethodSpecCatalog changes、frontend、payment。
- 對應 branch：`output/budget-documents`
- 完成後要開 PR。

## 模擬圖生成

- 負責什麼：LAIBE_VISUAL_SIM、AI style preview、prompt preview、sandbox image preview、image API spike governance。
- 不能碰什麼：正式施工圖宣稱、正式設計圖宣稱、真實案例宣稱、報價依據宣稱、完工保證。
- 對應 branch：`visual/simulation-governance`
- 完成後要開 PR。

## Quote Factory / 預算原料清洗工廠

- Repo：`laibeoffer/laibe-quote-factory`
- Branch：`main`
- Status：initial repo pushed
- Workstream：`quote-factory/price-range-governance`
- 類型：external repo / external workstream，不是 `laibe-mvp` branch。
- 角色：把歷史報價單資料整理成可追溯候選資料。
- Flow：RawQuoteRow -> RawCatalogItem / RawCatalogSource -> PriceObservation -> PriceRange -> PriceRange Review Decision。
- 不能碰什麼：正式價格、正式 PricingRule、`BudgetEstimateLine.unit_price`、`C:\laibe_project`、Supabase、API / migration、Renderer / BudgetOutputSnapshot、payment / escrow / listing fee。
- Need Commander：No。
- Need Reviewer：No。

## Codex 指令優化

- 負責什麼：AGENTS.md、AI_RULES、handoff rules、task dispatch rules、Codex operating boundaries。
- 不能碰什麼：頁面施工、產品功能擴張、payment / escrow / listing fee、真 API。
- 對應 branch：`governance/codex-rules`
- 完成後要開 PR。

## LOGO / 品牌資產

- 負責什麼：logo SVG、品牌資產、正式可共用 visual assets。
- 不能碰什麼：頁面 routing、budget core、plan-puzzle core、payment、未授權品牌方向重做。
- 對應 branch：`brand/logo-assets`
- 完成後要開 PR。

## 審查官聊天室

- 負責什麼：審查 Codex 結果、scope compliance、file changes、安全邊界、規則遵守。
- 不能碰什麼：施工、產品方向、頁面重設計、新功能提案、business logic。
- 對應 branch：none
- 說明：只審查 Codex 結果，不施工、不改產品方向。
