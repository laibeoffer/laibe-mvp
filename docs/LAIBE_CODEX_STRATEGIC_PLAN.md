# 萊比 MVP Codex 戰略計畫書（指揮官校正版）

版本：2026-05-25  
角色定位：供 Codex 指揮官、副指揮官、各分工聊天室、審查官與後續 Builder 接手使用。  
文件用途：本文件是「戰略計畫書」，不是單次施工 prompt，也不是產品行銷文。Codex 只能依此判斷工作線、邊界、派工、回報與完成標準；任何施工仍須另有 GitHub Issue 或明確 scoped task。

---

## 0. 本次指揮官校正重點

本版已修正上一版中的幾個關鍵問題：

1. **將「預算生成系統」正式拆回三倉**：
   - 原物料採購與倉儲聊天室 / Raw Candidate Warehouse
   - 配件倉庫聊天室 / MethodSpec Warehouse
   - 成品物流聊天室 / Budget Output Logistics

2. **將外部工作線獨立標示**：
   - `laibeoffer/laibe-quote-factory` 是外部 repo，不是 `laibe-mvp` 的 branch。
   - `laibeoffer/plancraft` 是外部 fork / read-only reference，不應整包提交進 `laibe-mvp`。

3. **將平面拼圖拆成三層**：
   - Plancraft fork：外部 fork / read-only reference
   - LaiBE Importer UI：萊比自製 PNG / JPG / PDF 匯入與校正工具
   - Plancraft Adapter Clean：候選資料 adapter / guard / design contract

4. **將模擬圖生成與 Quote Factory 分離**：
   - 模擬圖生成聊天室只負責 LAIBE_VISUAL_SIM / image API spike governance。
   - 預算原料清洗聊天室只負責 `laibe-quote-factory` 的報價單清洗與候選統計資料。

5. **修正 GitHub 狀態**：
   - PR #1–#13 已完成或需以 GitHub 最新狀態為準。
   - 已知 PR #10、#12、#13 均已 merged。
   - Issue #11 的 Issue workflow 已完成，後續應以 GitHub Issue 作為正式派工單。

6. **統一人稱與語氣**：
   - 本文件面向 Codex / Agent，不使用含糊的「我們剛剛」「你之前」等聊天語氣。
   - 指令採用明確的 Role / Scope / Forbidden / Completion Criteria。

---

## 1. Codex 共通閱讀規則

所有 Codex、分工聊天室與後續 Builder 必須先遵守以下規則：

1. 先確認自己是哪一個 Agent / Workstream，再判斷能碰哪些檔案。
2. 沒有 GitHub Issue 或明確 scoped task，不得自行施工。
3. GitHub Issue 是正式派工單；`docs/WORKSTREAM_BLACKBOARD.md` 是戰情回報板；PR 是完工驗收單。
4. 副指揮官派工必須明確寫出 `To: Agent`，不得只寫 workstream 或 branch。
5. 不得跨工作線修改檔案。
6. 不得把 mock、spike、candidate、proposal、review queue 誤稱為 production。
7. 不得把 observed price、candidate price、PriceRange、display_unit_price 寫成正式價格。
8. 不得讓 AI / RAG / raw candidate 直接變成正式 PricingRule。
9. 不得將 Visual Simulation 生成圖宣稱為施工圖、正式設計圖、真實案例、正式報價依據或完工保證。
10. 不得將 `plancraft/` nested repo 整包提交進 `laibe-mvp`。
11. Need Reviewer 預設為 `No`；只有跨工作線、高風險、Codex review NEEDS_FIX / P1 / P2、或使用者明確要求時才設為 `Yes`。
12. Need Commander 只在需求方向、產品流程、視覺風格、商業邏輯、正式金流、正式 AI API、正式價格、正式 Excel/PDF、merge / reject 最終裁決時設為 `Yes`。
13. IT / GitHub / branch / staging / commit / PR / re-review / workstream routing 等技術流程問題，不升級給使用者，由副指揮官或總參謀依文件直接判斷。

---

## 2. 萊比產品總定位

萊比不是一般裝修媒合平台，而是裝修治理平台。它要處理的是裝潢市場長期存在的資訊不對稱、報價不可比、圖面不完整、規格不一致、責任邊界模糊、追加減項缺乏依據與付款節點缺乏治理的問題。

萊比的核心任務不是先幫業主遇到廠商，而是先把需求、平面圖、報價條件、工法、規格與文件整理成可理解、可比較、可追溯、可審核的狀態，再進入詢價、招標、比價、決標與後續履約治理。

萊比 MVP 的主要能力包含：

- 甲方需求整理與 AI 引導。
- 平面圖匯入、底圖校正與 Plancraft+ 平面拼圖。
- 風格示意 / 模擬圖治理。
- 報價單清洗與候選價格證據生成。
- 預算生成三倉：原物料採購、配件工法規格、成品物流輸出。
- 招標、決標、PCM 與後續治理入口。

目前所有 payment、escrow、listing fee、fund release、真 AI API、真上傳、正式 Excel / PDF、正式價格自動核准都不得直接上線。相關內容只能是 mock、spike、sandbox 或 design contract，除非使用者明確批准進入 production 階段。

---

## 3. GitHub / Issue / Blackboard / Patrol 工作制度

### 3.1 三個核心載體

- **GitHub Issue**：正式派工單。每個可執行任務都應先變成 Issue。
- **WORKSTREAM_BLACKBOARD.md**：戰情回報板。記錄各工作線的狀態、PR、commit、blocked、next、Need Commander、Need Reviewer。
- **Thread heartbeat / automation**：巡邏員。讓單一聊天室定時醒來看指定內容，回報到同一串聊天室；它不是群組，也不能喚醒其他聊天室。

### 3.2 標準工作流

1. 副指揮官讀 GitHub、Issue、PR 與黑板。
2. 副指揮官判斷下一個最小任務。
3. 副指揮官建立 GitHub Issue，並明確指定 `To: Agent`。
4. Issue 內使用 `@codex please implement this in a scoped branch and open a PR.`。
5. Codex 建 branch、修改白名單檔案、commit、push、open PR。
6. Codex review。
7. 若 PASS、scope clean、Need Commander: No，總參謀可直接 merge。
8. 黑板更新。
9. 各工作線 heartbeat 僅看自己的黑板區塊、Issue 與 PR。

### 3.3 Issue 必填欄位

每張派工 Issue 必須包含：

- To
- Workstream
- Branch / Repo
- Target files
- Task
- Allowed changes
- Forbidden scope
- Self-check
- Git / PR instructions
- Blackboard update
- Completion report format
- Need Commander
- Need Reviewer

### 3.4 副指揮官巡邏規則

副指揮官每 10 分鐘巡全局時，檢查：

- open Issue
- open PR
- Codex blocker
- 可 merge PR
- `WORKSTREAM_BLACKBOARD.md` 是否落後 GitHub
- 是否有 Need Commander: Yes
- 是否需要建立下一張 Issue

副指揮官不得把 GitHub、branch、commit、PR、staging、re-review 等 IT 流程問題丟回使用者。

### 3.5 工作線巡邏規則

每個工作線若設 heartbeat，只能看：

- 黑板上的自己 workstream 區塊。
- 指向自己的 Issue。
- 指向自己的 PR。

若沒有變化，回報：「本 workstream 本輪無新指派。」

若出現 READY、NEEDS_FIX、BLOCKED、新 Issue、新 PR、Codex review、Need Commander、Need Reviewer，才詳細回報。

---

## 4. Agent / Workstream 名冊

### 4.1 副指揮官 / Deputy Codex

- Workstream：`command/deputy`
- Role：讀 GitHub、黑板、Issue、PR；判斷 ready / blocked / needs-review；建立 Issue；派工點名 Agent。
- Forbidden：不施工、不改檔、不做產品設計、不要求每任務審查、不把技術問題問使用者。

### 4.2 網站主流程 Builder

- Workstream：`site/page-formalization` / `site/*`
- Scope：`src/stitch_laibe_landing_onboarding/`，包含 landing、onboarding、header、CTA、routing、progress bar、back button、dashboard flow。
- Forbidden：不碰 budget engine、raw warehouse、MethodSpec、output renderer、payment、真 AI API、真上傳、Quote Factory、Plancraft adapter、visual simulation governance。
- Need Commander：視覺、CTA、routing、產品流程改動時 Yes。

### 4.3 平面拼圖聊天室

- Workstream：`plancraft/page-ui`、`plancraft/importer-ui`、`plancraft/adapter-clean`
- External reference：`laibeoffer/plancraft`
- Role：萊比自製平面圖匯入與 Plancraft+ 工具，包含 importer UI 與 budget candidate adapter。
- Forbidden：不修改 Plancraft core；不解除 formalEstimateGuard；不產生正式估價；不碰 renderer / Excel / PDF；不碰 payment / AI API。

### 4.4 模擬圖生成聊天室

- Workstream：`visual/simulation-governance`
- Role：LAIBE_VISUAL_SIM，負責風格示意圖、prompt governance、image API spike governance、sandbox preview、非正式用途標示。
- Forbidden：不接真 image API、不放 API key、不污染 Plancraft geometry、不把示意圖當施工圖 / 正式設計圖 / 真實案例 / 報價依據 / 完工保證。

### 4.5 預算原料清洗聊天室

- Workstream：`quote-factory/price-range-governance`
- Repo：`laibeoffer/laibe-quote-factory`
- Role：報價單規格化工廠，把歷史報價單轉成 RawQuoteRow、PriceObservation、PriceRange、review queue、review decision、audit log、cloud-ready package。
- Forbidden：不修改 `C:\laibe_project`，不接 Supabase / API / migration / Renderer / BudgetOutputSnapshot，不產生正式價格、PricingRule、MaterialSpec、LaborRule、BudgetEstimateLine。

### 4.6 原物料採購與倉儲聊天室

- Workstream：`warehouse/raw-candidate`
- Role：預算生成系統第一倉，處理 raw source、raw item、candidate、validation、review queue、handoff proposal。
- Forbidden：不產生正式價格、PricingRule、MaterialSpec、LaborRule、BudgetEstimateLine，不碰 renderer、Excel、PDF、BudgetOutputSnapshot、平面拼圖、payment。

### 4.7 配件倉庫聊天室

- Workstream：`warehouse/method-spec`
- Role：工法與規格資料層，管理 MethodSpecCatalog、MethodRecipe、QuoteItemTemplate、PricingRule reference、MaterialSpec、LaborRule、UnitConversion、InclusionExclusionRule、validator policy。
- Forbidden：不碰 raw warehouse、renderer/output、frontend、正式估價流程、payment，不讓 AI / RAG / raw candidate 直接寫正式 PricingRule。

### 4.8 成品物流聊天室

- Workstream：`output/budget-documents`
- Role：BudgetOutputSnapshot → renderer gate → customer/internal trace → structured render document → formal layout → file writer preflight → artifact manifest / registry。
- Forbidden：不重跑 budget engine、不查 pricing / material / RAG / AI、不碰 raw warehouse / MethodSpec / plan-puzzle，不產生未授權正式 Excel / PDF。

### 4.9 審查官聊天室 / LAIBE_REVIEWER

- Workstream：`none-review-only`
- Role：只讀審查。檢查 PR diff、Codex 回報、phase packet、handoff、routing、預算三倉邊界、mock 邊界、spike 是否被當 production。
- Forbidden：不施工、不改檔、不重構、不補功能、不派工、不產品設計。

### 4.10 Codex 指令優化聊天室

- Workstream：`governance/codex-rules`
- Role：維護 AGENTS.md、AI_RULES、CHATROOM_GITHUB_WORKSTREAMS、WORKSTREAM_BLACKBOARD、Issue template、handoff、workstream 規則。
- Forbidden：不改網站頁、不改 implementation、不接 payment / AI API / upload。

---

## 5. 平面拼圖聊天室戰略

### 5.1 系統定位

Plancraft+ 是萊比網站內的一體化平面拼圖工具，不是孤立 demo，也不是直接大改 Plancraft core。使用者看到的是萊比網站上的「平面拼圖 / Plancraft+」。

內部資料流：

1. 使用者匯入丈量圖：JPG / JPEG / PNG / PDF interface。
2. 顯示 underlay，支援透明度與比例校正。
3. wall-first editor：手動畫牆、牆體狀態、厚度、節點、切分。
4. openings：門、窗、開口依附 nodeGraph.edges。
5. zones：空間標籤、zone boundary、zone area。
6. Plancraft Bridge：wall-first draft → Plancraft `.pc` spike。
7. Validation / Preview：DSL validation、renderer preview。
8. Budget Adapter：candidate mapping、guard hardening、production adapter design。
9. Future production path：production quantity contract、reviewer gate、正式估價、Excel / PDF writer。

### 5.2 三層拆分

#### A. Plancraft fork

- Repo：`laibeoffer/plancraft`
- Original：`pedroodb/plancraft`
- License：MIT License
- Role：SVG / DSL 平面圖工具 fork。
- Rule：作為 external fork / read-only reference，不整包提交進 `laibe-mvp`。

#### B. LaiBE Importer UI

- Workstream：`plancraft/page-ui` 或 `plancraft/importer-ui`
- Files：
  - `src/stitch_laibe_landing_onboarding/preview_floor_plan/code.html`
  - `src/stitch_laibe_landing_onboarding/preview_floor_plan/plan-puzzle.js`
- Role：萊比自製平面圖檔案匯入與校正工具。
- Scope：PNG / JPG / JPEG 匯入、PDF interface、FileReader underlay、底圖校正、canvas / toolbar、wallGraph、nodeGraph、openings、zones、.pc converter spike、renderer preview report。

#### C. Plancraft Adapter Clean

- Workstream：`plancraft/adapter-clean`
- Files：
  - `src/lib/budget/adapters/preview-floor-plan-adapter.ts`
  - `src/lib/budget/types.ts`
  - `src/lib/budget/demo-generate-budget-from-preview-floor-plan.ts`
  - `docs/budget/plancraft-plus-production-adapter-design.md`
- Role：Plancraft+ draft JSON → budget-system candidate data adapter contract / spike。
- Rules：candidate-only；`productionReady: false`；`formalEstimateAllowed: false`；formal estimate guard blocked；demo 不呼叫 `generateBudgetEstimate()`；不寫 `BudgetEstimateLine.unit_price`。

### 5.3 已完成狀態

已完成或已建立方向：Import Interface、Wall Segment Editor、Wall Graph / Node Graph、Opening Editor、Zone Label / Zone Boundary、`.pc` Converter Spike、DSL Validation Spike、Renderer Preview / Report Spike、Budget Adapter Contract Spike、Budget Adapter Guard Hardening、PR #9 Adapter Clean。

### 5.4 絕對禁止

- 不修改 Plancraft core。
- 不把 spike 當 production。
- 不把 candidate facts 當正式 quantity。
- 不把 `.pc` / SVG / renderer preview 當 budget input。
- 不解除 formalEstimateGuard。
- 不讓 `generateBudgetEstimate()` 接受 Plancraft+ spike output。
- 不做正式估價、Excel / PDF writer、金流、AI API、DB migration。

### 5.5 下一階段路線

下一階段是 **Zone Area / Boundary Refinement**。

目標：讓 zones 從人工標籤 + 邊界，前進到可審查的面積候選資料。

可做：polygon validation、shoelace area estimate、areaM2、areaPing、areaSource、areaStatus、areaConfidence、reviewerRequired、reviewerReasons、boundaryIssues、JSON export。

不可做：不產生正式 quantity、不解除 formalEstimateGuard、不讓 adapter 直接吃 area、不進正式估價。

---

## 6. 模擬圖生成聊天室戰略

### 6.1 系統定位

LAIBE_VISUAL_SIM 是萊比網站中的風格示意圖 / 模擬圖系統。它協助甲方在案件上架前，將模糊的風格描述具象化，讓競標者更容易理解案件方向。

它不是施工圖工具，不是正式設計圖工具，不是報價工具，也不是 Plancraft+ 的平面圖幾何編輯器。

### 6.2 可做事項

- 將甲方風格形容詞轉成 visual brief。
- 產生 image prompt / negative prompt。
- 產生示意圖任務狀態。
- 顯示 AI 風格示意 preview。
- 協助案件上架與風格溝通。
- 治理 image API spike 與 sandbox preview。

### 6.3 不得宣稱

任何模擬圖不得被宣稱為：

- 施工圖。
- 正式設計圖。
- 真實案例。
- 正式報價依據。
- 完工保證。
- 實際尺寸圖。
- 材料或工法承諾。

固定警語：

> 本圖僅為風格示意，用於案件上架與溝通參考，不代表最終設計、施工圖、實際尺寸、工法、材料品牌或正式報價內容。

### 6.4 與 Plancraft+ 分工

Plancraft+ 負責 underlay、scale、walls、openings、zones、furniture、Plancraft Bridge。  
LAIBE_VISUAL_SIM 負責空間類型、風格詞、色調、材質、預算感、prompt、sandbox preview、metadata、image API spike governance。

LAIBE_VISUAL_SIM 不得寫入或污染：project.walls、project.openings、project.zones、project.scale、project.plancraftBridge、Plancraft geometry、正式案件資料、budget official data、production assets、export JSON。

### 6.5 未來階段

1. 治理文件完整化：visual scope matrix、style taxonomy、trust levels、asset naming rules。
2. UI / local state 完整化：維持 sandbox / local-only。
3. local server runtime spike：same-origin proxy contract，不接真 API。
4. real API spike：必須使用者明確授權，API key 僅 server-side secure env。
5. 正式功能前治理：TTL、cleanup、asset storage、manual review、commercial usage、user consent、reference image privacy。

---

## 7. 預算原料清洗聊天室戰略

### 7.1 系統定位

`laibe_quote_factory` 是獨立報價單規格化工廠，不是 `laibe-mvp` 的分支。

目標：把乾淨測試用的歷史報價單資料轉成 RawQuoteRow，再轉成 PriceObservation，再聚合成 PriceRange，再產生 Review Queue、Review Decision、Audit Log 與 Cloud-ready export package。

### 7.2 完整流程

RawQuoteRow → RawCatalogItem / RawCatalogSource → PriceObservation → PriceRange → PriceRange Review Decision → Audit Log → Cloud-ready export package。

### 7.3 核心邊界

- PriceObservation 只能是價格觀測資料，不是正式單價。
- PriceRange 只能是候選統計資料，不是正式 PricingRule。
- `approved_for_cloud` 只表示候選資料可以上雲，不代表正式定價核准。
- Override 不得產生正式價格，不得產生正式 PricingRule，不得產生 BudgetEstimateLine。
- Cloud interface 預留欄位，但本階段不得真的連 Supabase。

### 7.4 完成條件摘要

完成時應具備 docs、configs、samples、exports_to_raw_warehouse、review_queue、validators、batch samples、cloud-ready package 與完整來源追溯欄位。

每筆資料至少保留：source_file_id、source_file_name、source_row_id、sheet_name、row_index、created_at、updated_at、schema_version、upload_stage。

最終完成定義：報價單工廠可以接收 sanitized Excel / CSV sample，完成 header detection、RawQuoteRow、blocked / review 標記、alias matching、unit normalization、work_material_scope、PriceObservation、PriceRange、Review Queue、Review Decision / Override / Audit Log、cloud-ready JSON package 與 validators 全部通過；全程不產生正式價格。

### 7.5 永久禁止

- 不修改 `C:\laibe_project`。
- 不寫入 `laibe-mvp/src`。
- 不接 Supabase。
- 不做 API / migration。
- 不做 Renderer / BudgetOutputSnapshot。
- 不產生正式價格。
- 不產生正式 PricingRule、MaterialSpec、LaborRule。
- 不產生 BudgetEstimateLine。
- 不接 payment / escrow / listing fee。

---

## 8. 預算生成系統三倉

預算生成系統已正式拆成三倉，不再由單一「預算生成系統聊天室」承擔。

完整資料流：

Raw Candidate Warehouse → Handoff Proposal → Method / Spec Warehouse Review → Approved Spec / Rule → Deterministic Budget Engine → BudgetOutputSnapshot → Renderer / Writer。

禁止資料流：

- Raw observed_price → formal unit_price。
- Raw candidate → formal PricingRule。
- Handoff proposal → BudgetEstimateLine。
- Renderer → budget engine。
- Renderer → pricing rules。
- AI / RAG → formal price。

### 8.1 原物料採購與倉儲聊天室

#### 定位

Raw Candidate Warehouse 是第一倉，負責處理所有尚未被審核成正式資料的原始資料與候選資料。它是檢疫倉，不是正式 pricing system、正式 catalog、正式報價系統、renderer、AI 定價器或 RAG 定價器。

#### 標準資料流

RawCatalogSource → RawCatalogItem → RawCandidate → ValidationResult → ReviewQueueItem → HandoffProposal。

#### 可做

接收 raw source、攤平成 raw item、分類 candidate、正規化名稱 / 單位 / 幣別 / 品牌 / 型號 / 規格、保留 observed_price、產生 risk flags、validation report、review queue item、handoff proposal、safety validator、static guard、negative fixture 測試。

#### 不可做

不產生正式 PricingRule、MaterialSpec、LaborRule、MethodSpec、BudgetEstimateLine、BudgetEstimate、BudgetOutputSnapshot、正式報價、客戶輸出、Excel / PDF。不修改 renderer、平面拼圖，不連 Supabase，不做 DB migration，不串 AI API / RAG，不做 payment / escrow / listing fee。

#### 目前狀態

已完成：R1 Foundation、R1.1 Contract Hardening、R1.2 Safety Validator、R1.2A Data Feeding Trial、R1.3 Multi-Source Fixture Expansion、R1.3 Reviewer Pass：PASS_WITH_NOTES。

#### 下一步

R1.4 Raw Warehouse Negative / Source Quality Fixtures。需測 missing source_date、missing currency、missing unit、negative price、price outlier、unit mismatch、duplicate、missing model/spec、low reliability、ambiguous name。完成後需 R1.4 Reviewer Pass。

### 8.2 配件倉庫聊天室

#### 定位

Method / Spec Warehouse 是工法與規格資料中樞。它負責 MethodSpecCatalog、MethodRecipe、QuoteItemTemplate、PricingRule reference、MaterialSpec、ItemMaterialBinding、LaborRule、NoteTemplate、UnitConversion、InclusionExclusionRule 與 validator policy。

#### 核心資料路徑

MethodSpecCatalog → validateMethodSpecCatalog() → buildBudgetCatalogFromMethodSpec() → Budget Engine → BudgetEstimateLine → BudgetOutputSnapshot internal trace。

#### 九個 shelf

1. quote_item_templates：正式工項模板。
2. method_recipes：工法配方與 quantity formula trace。
3. pricing_rules：唯一 deterministic formal price source。
4. material_specs：材料規格追溯，不直接改價格。
5. item_material_bindings：item_code → material_code 關係，不直接改價格。
6. note_templates：customer note / internal note / assumption / risk / exclusion，不改數量或金額。
7. inclusion_exclusion_rules：包含 / 不包含 / 假設 / 風險，不改 output 或 renderer。
8. unit_conversions：coverage / trace validation，不默默改寫 quantity。
9. labor_rules：reference-only，不進主估價公式。

#### 已完成

P0 pricing source guard、allowed unbound material handling、P1-A LaborRule reference-only guard、P1-B UnitConversion coverage、Inclusion / Exclusion scope coverage。

#### 下一步

MS-12：P1-B Reviewer Pass。通過後進入 MS-13 MethodSpec validator freeze note。

### 8.3 成品物流聊天室

#### 定位

成品物流不是預算引擎，不是材料倉庫，不是 AI 報價員。它只負責將已生成、已驗證、可追溯的 BudgetOutputSnapshot 安全輸出成客戶版與內部追溯版文件。

#### 資料流

BudgetOutputSnapshot → renderer gate → customer / internal_trace 分流 → structured render document → formal layout contract → file writer preflight → artifact manifest → artifact registry → Excel / PDF artifact。

#### 核心原則

1. 所有正式輸出都必須從 BudgetOutputSnapshot 出發。
2. Renderer 不得重跑 budget engine。
3. File writer 不得查 pricing / material / RAG / AI。
4. Customer artifact 不得洩漏 internal trace。
5. Internal trace artifact 必須保留追溯欄位。
6. 所有 artifact 都必須能回推 snapshot_id。

#### 完成路線

Snapshot / Output 基礎層 → Renderer 層 → Renderer Hardening → Formal Renderer Entry → File Writer Preflight → Dry-run / Controlled Writer Entry → Excel Writer → PDF Writer → Artifact Registry → End-to-End Final Review。

#### 下一步

成品物流目前已完成 snapshot-only renderer / writer skeleton 方向。未來若要前進，應以 GitHub Issue 派工，逐步做 Excel writer、PDF writer、artifact registry 與 final review packet。未批准前不得產生正式對外 Excel / PDF。

---

## 9. 目前 GitHub 狀態與待辦

### 9.1 已完成基礎治理

已完成：

- Workstream registry / blackboard 同步。
- Issue template。
- Issue + Blackboard + Patrol workflow。
- 外部 Quote Factory repo 標記。
- 外部 Plancraft fork / read-only reference 標記。
- Importer UI 與 Adapter Clean 分離。

### 9.2 仍需下一間總參謀室查核

下一間總參謀室接手時，必須先做 read-only 查核：

1. 查 `laibeoffer/laibe-mvp` main 最新 sha。
2. 查 open PR。
3. 查 open Issue。
4. 查 Issue #11 是否已完成、是否已 closed。
5. 查 PR #10 / #12 / #13 是否均已 merged。
6. 若一切已完成，下一步不應再做 governance 基礎建設，而應由副指揮官根據黑板提出下一個真正 workstream Issue。

---

## 10. 下一個候選任務池

副指揮官只能從黑板與 GitHub 狀態判斷下一個 Issue，不能同時開多線。候選任務包含：

1. 平面拼圖：Zone Area / Boundary Refinement。
2. 原物料採購與倉儲：R1.4 Negative / Source Quality Fixtures。
3. 配件倉庫：MS-12 P1-B Reviewer Pass。
4. 成品物流：Artifact registry 或 Excel writer 前置 contract。
5. Quote Factory：Definition of Done / roadmap / phase index 或 batch sample 階段。
6. 網站主流程：由使用者指定某一頁或 CTA / routing，否則暫停。
7. 模擬圖生成：除非要推進 image API spike governance，否則暫停。

選下一個任務時，副指揮官必須輸出：

- To
- Workstream
- Branch / Repo
- Mission
- Why this agent
- Target files
- Forbidden scope
- Completion criteria
- Need Commander
- Need Reviewer

---

## 11. Completion Report 標準格式

每個 workstream 完成任務後，必須回報：

- Workstream
- Branch / Repo
- Status
- Changed
- Files
- PR / Commit
- Blocked
- Next
- Need Commander
- Need Reviewer

如果產生 PR，必須附 PR URL。  
如果需要使用者操作 GitHub，必須附：連結、要貼的文字、要按哪裡。

---

## 12. 交接給 Codex 指揮官的 Prompt

將以下 prompt 貼給下一間「萊比總參謀室 / Codex 指揮官」聊天室。

```text
你現在接手「萊比 MVP 總參謀室 / Codex 指揮官」聊天室。

請不要依賴舊聊天記憶。請以 GitHub、WORKSTREAM_BLACKBOARD.md、CHATROOM_GITHUB_WORKSTREAMS.md、Issue、PR 與本文件為狀態來源。

GitHub 主 repo：
laibeoffer/laibe-mvp

外部 repo：
laibeoffer/laibe-quote-factory

外部 fork：
laibeoffer/plancraft

請先 read-only 查核：
1. main 最新 sha
2. open PR
3. open Issue
4. Issue #11 是否已完成 / closed
5. PR #10、#12、#13 是否已 merged
6. WORKSTREAM_BLACKBOARD.md 是否與 GitHub 一致
7. 下一個最小候選 Issue

你不得施工、不得改檔、不得開新 PR、不得 merge，直到完成狀態查核。

請使用以下輸出格式：

# 總參謀室接手查核

## 1. GitHub 狀態
- main:
- open PR:
- open Issue:
- recent merged PR:

## 2. 黑板與名冊狀態
- WORKSTREAM_BLACKBOARD 是否落後:
- CHATROOM_GITHUB_WORKSTREAMS 是否落後:
- Issue workflow 是否完成:

## 3. 各 workstream 狀態
列出：site、plancraft、raw-candidate、method-spec、output-documents、visual-sim、quote-factory、governance、reviewer。

## 4. 下一個最小 Issue 建議
必須包含：
- To
- Workstream
- Branch / Repo
- Mission
- Why this agent
- Target files
- Forbidden scope
- Completion criteria
- Need Commander
- Need Reviewer

## 5. 是否需要指揮官裁決
只有需求、產品流程、視覺、商業邏輯、正式金流、正式 AI API、正式價格、正式 Excel/PDF、merge/reject 最終裁決才 Yes。

## 6. 是否需要審查官
Need Reviewer 預設 No。只有高風險、跨工作線、Codex review NEEDS_FIX / P1 / P2、或使用者要求才 Yes。
```

---

## 13. 最終提醒

本文件是戰略計畫書，不是施工票。Codex 不得因為讀到下一階段路線就自行開工。所有施工必須經 GitHub Issue 或明確 scoped task。若 Issue 與本文件衝突，以 Issue 的白名單與 forbidden scope 為當輪最高優先；若 Issue 試圖突破本文件的高風險邊界，必須標記 Need Commander: Yes。
