# Phase MS-1 + MS-2 MethodSpecCatalog Inventory Report

Last reviewed: 2026-05-23

## 1. Summary

本報告盤點目前「配件倉庫：工法與規格系統」的 `MethodSpecCatalog` 結構，並檢查 seed catalog 是否足以支援現有 `BudgetEstimateLine` 與 `BudgetOutputSnapshot.internal_view`。

結論：

- 目前 seed `MethodSpecCatalog` 足以支援現有 mock budget engine 產生 `BudgetEstimateLine`。
- 目前 seed `MethodSpecCatalog` 足以支援現有 output enricher 產生 `BudgetOutputSnapshot.internal_view` 所需的材料追溯、備註、包含/不包含、assumptions、risks。
- `MaterialSpec` 與 `ItemMaterialBinding` 目前只應作為規格追溯，不可改變 `unit_price` 或 `amount`。
- `LaborRule` 與 `UnitConversion` 目前仍屬 reference shelf，尚未直接進入估價公式。
- `PricingRule` 仍是 deterministic price source，目前沒有 RAG、AI 或候選資料直接覆寫正式價格的路徑。
- `docs/budget/20-method-spec-to-budget-output-boundary.md` 目前不存在，建議 Phase MS-4 優先補上邊界文件。

本輪沒有修改功能程式碼，也沒有修改 renderer / output system。

## 2. Scope

本輪範圍：

- 盤點 `MethodSpecCatalog` 的貨架結構。
- 檢查 seed method-spec catalog 是否覆蓋目前預算引擎與 output snapshot 的需求。
- 釐清哪些欄位會影響 `BudgetEstimateLine`。
- 釐清哪些欄位會影響 `BudgetOutputSnapshot.internal_view`。
- 釐清哪些欄位目前只是 reference，不應影響價格、數量或 renderer 格式。
- 執行既有 method-spec demo / validator。

本輪不包含：

- 不修改 renderer / Excel / PDF。
- 不修改 `src/lib/budget/renderers/`。
- 不修改 `src/lib/budget/output/`。
- 不修改 `src/lib/budget/intake/`。
- 不修改前端、平面拼圖、`preview_floor_plan`、`plan-puzzle.js`、`code.html`。
- 不做 RAG、AI API、Skills、DB migration。
- 不碰 payment / escrow / listing fee。

## 3. Files Reviewed

指定閱讀：

- `AGENTS.md`
- `docs/NEXT_CODEX_HANDOFF.md`
- `docs/CURRENT_PHASE_REVIEW_PACKET.md`
- `docs/budget/14-method-spec-warehouse.md`
- `docs/budget/20-method-spec-to-budget-output-boundary.md` - missing
- `src/lib/budget/specs/types.ts`
- `src/lib/budget/specs/seed-method-spec-catalog.ts`
- `src/lib/budget/specs/validate-method-spec-catalog.ts`
- `src/lib/budget/specs/build-budget-catalog-from-method-spec.ts`

支援性只讀檢查：

- `src/lib/budget/types.ts`
- `src/lib/budget/budget-generator.ts`
- `src/lib/budget/recipe-matcher.ts`
- `src/lib/budget/output/budget-line-enricher.ts`
- `src/lib/budget/output/material-code-resolver.ts`

## 4. MethodSpecCatalog Shelf Inventory

| Shelf | Current responsibility | Used by budget engine | Used by output/internal trace | Should affect price/quantity/renderer format |
| --- | --- | --- | --- | --- |
| `quote_item_templates` | 定義正式工項模板、工程類別、品名、單位、預設備註 | Yes. `BudgetEstimateLine` 的工項、單位、類別來源之一 | Indirect. item code/name/unit 會進 output rows | 不應直接決定價格；unit 只作為配方與 pricing 對齊依據 |
| `method_recipes` | 定義物件/空間/project 如何觸發工項、數量公式、來源追溯、assumptions/review | Yes. 直接影響 line 的 `source_type`、`source_id`、`recipe_id`、`quantity_formula`、`quantity`、`assumptions`、`requires_review` | Indirect. 透過 `BudgetEstimateLine` 進 internal trace | 可以影響數量與追溯；不可決定單價 |
| `material_specs` | 定義材料規格、品牌/等級/內部備註 | No current pricing use. 轉成 `BudgetCatalog.materials` 但 engine 不用它計價 | Yes, when linked by item material binding; 可補 internal material note | 不可改 `unit_price`、`amount` 或 renderer 格式 |
| `labor_rules` | 定義人工規則與 base rate 的 reference shelf | No. 目前轉成 `BudgetCatalog.labor_rates`，但 engine 未使用 | No current output use | 本階段 reference only，不可視為正式估價公式 |
| `note_templates` | 定義 customer note、internal note、exclusion、assumption、risk | No | Yes. 影響 customer/internal notes、assumptions、risks | 不可改價格、數量或 renderer 欄位格式 |
| `unit_conversions` | 定義單位換算資料 | No direct use. 目前 quantity formulas 仍由 takeoff / recipe logic 處理 | No current output use | 不可單獨改價格；未來若接入公式，需明確 validator |
| `inclusion_exclusion_rules` | 定義每個 item 的 includes、excludes、assumption、review 語意 | No | Yes. 影響 internal `inclusions`、`exclusions`、`assumptions`、`risks` | 不可改價格、數量或 renderer 格式 |
| `item_material_bindings` | 定義 `item_code -> material_code` 規格追溯 | No | Yes. 影響 `material_code`、材料規格 review risk/internal note | 不可改 `unit_price`、`amount` |
| `pricing_rules` | 定義 deterministic 單價規則與價格來源 | Yes. 直接影響 `unit_price`、`amount`、`price_source`、`confidence`、`requires_review` | Indirect. 透過 `BudgetEstimateLine` 進 internal trace | 是目前唯一正式價格來源；不得由 AI/RAG/candidate raw data 覆寫 |

## 5. Seed Catalog Sufficiency Checklist

| Check | Result | Notes |
| --- | --- | --- |
| 每個工項是否都有 `QuoteItemTemplate` | Pass | 目前 12 個工項 template 覆蓋木作、泥作、水電、其他。 |
| 每個工項是否都有合理 `MethodRecipe` | Pass | 目前 7 個 recipe 可產生 12 個工項；project recipe 覆蓋保護、清潔、管理費。 |
| 每個可綁材料的工項是否有 `ItemMaterialBinding` | Pass for current scope | 木作櫃體、人造石、防水、壁磚、地磚已有 binding。 |
| 無材料綁定的工項是否合理 | Pass with warnings | 插座、燈具、保護、清潔、工程管理費目前允許 `material_code = null`。 |
| 每個工項是否有 customer-visible note | Pass | 透過 template default notes 或 active customer-visible `NoteTemplate` 覆蓋。 |
| 每個工項是否有 internal note / assumption / risk 來源 | Pass for prototype | 來源包含 recipe assumptions、material internal note、binding note、inclusion/exclusion rule、pricing review reason。 |
| Inclusion / Exclusion 是否足夠支援內部追溯 | Pass | 目前 12 個工項都有對應 `InclusionExclusionRule`。 |
| `LaborRule` 是 reference 還是估價公式 | Reference only | 目前未被 budget engine 用於單價或數量。 |
| `UnitConversion` 是否覆蓋目前配方使用的單位轉換 | Pass for current prototype | 已有 `cm -> 尺`、`m2 -> 坪`、`mm -> cm`；但目前未成為公式執行來源。 |
| `PricingRule` 是否維持 deterministic price source | Pass | 12 個 pricing rules 使用 approved method-spec catalog 的 deterministic source。 |

Current seed counts from demo:

- Quote item templates: 12
- Method recipes: 7
- Material specs: 6
- Labor rules: 6
- Note templates: 10
- Unit conversions: 3
- Inclusion / exclusion rules: 12
- Item material bindings: 7
- Pricing rules: 12

## 6. BudgetEstimateLine Impact Map

目前會直接影響 `BudgetEstimateLine` 的 shelf：

| Shelf | Direct impact on `BudgetEstimateLine` |
| --- | --- |
| `quote_item_templates` | `trade_code` / `engineering_category`、`item_name`、`unit`、template notes |
| `method_recipes` | `source_type`、`source_id`、`recipe_id`、`quantity_formula`、`quantity_fact_ids`、`quantity`、`assumptions`、review reason |
| `pricing_rules` | `unit_price`、`amount`、`price_source`、`confidence`、`requires_review` |

目前不直接影響 `BudgetEstimateLine` 的 shelf：

| Shelf | Current status |
| --- | --- |
| `material_specs` | 只作規格追溯；不進 engine price calculation。 |
| `item_material_bindings` | 只作 output internal trace 的 material link；不改 engine line。 |
| `note_templates` | output enrichment 使用；不改 engine line amount/quantity。 |
| `inclusion_exclusion_rules` | output enrichment 使用；不改 engine line amount/quantity。 |
| `labor_rules` | reference only；不進目前估價公式。 |
| `unit_conversions` | reference only；目前 quantity conversion 仍由 takeoff/recipe logic 實作。 |

不得影響價格或數量的欄位：

- `MaterialSpec.brand`
- `MaterialSpec.grade`
- `MaterialSpec.customer_note`
- `MaterialSpec.internal_note`
- `ItemMaterialBinding.material_code`
- `ItemMaterialBinding.requires_review`
- `ItemMaterialBinding.note`
- `NoteTemplate.text`
- `InclusionExclusionRule.includes`
- `InclusionExclusionRule.excludes`
- `InclusionExclusionRule.assumption`
- `LaborRule.base_rate` in current phase

## 7. BudgetOutputSnapshot Impact Map

本聊天室不負責 renderer / Excel / PDF；以下只描述 method-spec 對 downstream output snapshot data 的資料供應關係。

| Shelf | Impact on `BudgetOutputSnapshot.internal_view` |
| --- | --- |
| `quote_item_templates` | 透過 `BudgetEstimateLine` 提供 item code/name/unit/trade。 |
| `method_recipes` | 透過 `BudgetEstimateLine` 提供 recipe trace、quantity formula、assumptions。 |
| `pricing_rules` | 透過 `BudgetEstimateLine` 提供 price source、confidence、review flags。 |
| `note_templates` | 提供 customer/internal note、exclusion、assumption、risk 的文字來源。 |
| `inclusion_exclusion_rules` | 提供 inclusions、exclusions、assumptions、review/risk 語意。 |
| `item_material_bindings` | 提供 `material_code` 與材料規格需人工確認的 risk/internal note。 |
| `material_specs` | 提供 material internal note 與規格追溯資訊。 |
| `labor_rules` | 目前沒有進 `internal_view`。 |
| `unit_conversions` | 目前沒有進 `internal_view`。 |

應保留但不應改 renderer 格式的資訊：

- `source_type`
- `source_id`
- `recipe_id`
- `quantity_formula`
- `price_source`
- `confidence`
- `requires_review`
- `material_code`
- `inclusions`
- `exclusions`
- `assumptions`
- `risks`

這些資訊可以被 downstream output system 放進 internal trace，但配件倉庫不應決定 Excel/PDF 欄寬、分頁、簽核欄位或視覺格式。

## 8. Missing Notes / Missing Bindings / Missing Rules

### Missing document

- `docs/budget/20-method-spec-to-budget-output-boundary.md` 目前不存在。
- 建議 Phase MS-4 優先建立此文件，正式定義「工法與規格輸入 -> BudgetEstimateLine / BudgetOutputSnapshot」邊界。

### Material binding warnings

validator 目前回報 5 個 warning，均屬合理的 unbound material items：

- `ELECTRIC_SOCKET_EXTENSION`
- `ELECTRIC_LIGHTING_INSTALL`
- `OTHER_PROTECTION_WORK`
- `OTHER_CLEANING_WORK`
- `OTHER_MANAGEMENT_FEE`

這些工項目前不需要或不適合強制綁定 `material_code`。此狀態應維持 warning，而不是 error。

### Potential unused material spec

- `SITE_PROTECTION_STANDARD` 目前存在於 `material_specs`，但沒有對應 item binding。
- 這不影響現有預算生成；若未來希望保護工程也有材料追溯，應由 method-spec owner 明確決定是否新增 binding。

### Internal-only note taxonomy

目前內部追溯文字主要來自：

- material internal note
- item material binding note
- binding review warning
- inclusion/exclusion rule
- recipe / pricing review reason

seed catalog 中 active `NoteTemplate` 多數偏 customer-visible。若未來內部審查需要更細的施工風險、採購風險、現場丈量風險，可新增 internal-only note taxonomy；但這不是目前 BudgetEstimateLine 或 snapshot 的 blocker。

### Inclusion / exclusion review flag semantics

`InclusionExclusionRule.requires_review` 目前可形成 risk 語意，但是否應直接提升 `InternalBudgetLine.requires_review` 尚未形成明確 contract。

建議在 Phase MS-4 邊界文件中定義：

- 哪些 review flags 只產生 risk。
- 哪些 review flags 會讓該列變成 `requires_review = true`。
- 這些 flags 不得改變價格或數量。

## 9. Fields Currently Reference Only

目前屬 reference only 或未被正式 engine/output 使用的欄位：

| Field | Current status |
| --- | --- |
| `MaterialSpec.customer_note` | 目前不是 customer note 的主要來源；customer note 主要來自 template/note templates。 |
| `MaterialSpec.brand` | 規格參考，不影響價格。 |
| `MaterialSpec.grade` | 規格參考，不影響價格。 |
| `MaterialSpec.unit` | 規格參考；目前不驅動 quantity 或 pricing。 |
| `LaborRule.*` | 本階段 reference only；未進入估價公式。 |
| `UnitConversion.*` | 本階段 reference only；未被 recipe matcher 直接執行。 |
| `NoteTemplate.trade_category` | 目前作分類資訊；未作為 grouping source。 |
| `MethodRecipe.required_params` | 目前未形成完整 validator enforcement。 |
| `MethodRecipe.review_triggers` | 目前未形成完整 validator enforcement。 |
| `InclusionExclusionRule.requires_review` | 目前偏 risk/review 語意；是否推升 line review flag 仍需邊界文件確認。 |

## 10. Risks

1. `LaborRule.base_rate` 容易被誤認為正式價格公式。現階段應明確標示為 reference only。
2. `UnitConversion` 已有資料，但目前不是 quantity formula 的唯一執行來源。未來若接入公式引擎，需要避免同一轉換邏輯存在兩套 source of truth。
3. `MaterialSpec` 與 `ItemMaterialBinding` 若被誤用，可能讓材料規格直接影響價格；這違反「AI / RAG / candidate data 不直接定價」與 deterministic pricing 邊界。
4. `InclusionExclusionRule.requires_review` 的 propagation 尚未完全定義，可能造成 `risks` 與 `requires_review` 語意不一致。
5. `docs/budget/20-method-spec-to-budget-output-boundary.md` 缺失，導致配件倉庫與 output snapshot 的責任邊界仍分散在程式與其他文件中。
6. `SITE_PROTECTION_STANDARD` 目前未綁定任何 item，若長期保留，validator 可考慮提示 unused active material spec。
7. 若未來新增 raw/candidate catalog intake，必須禁止候選價格直接寫入正式 `PricingRule`。

## 11. Recommended Validator Backlog

建議後續 validator 補強：

1. 檢查每個 active `QuoteItemTemplate` 至少有 default notes 或 active customer-visible `NoteTemplate`。
2. 檢查每個 active `QuoteItemTemplate` 至少有一個 `InclusionExclusionRule`。
3. 檢查 `MethodRecipe.required_quantity_facts` 是否被 outputs 使用，或明確標示為 aggregate-only。
4. 檢查 `MethodRecipe.required_params` 是否被 output conditions 使用，或明確標示為 documentation-only。
5. 檢查 `UnitConversion` 是否覆蓋所有 recipe quantity formulas 中使用的單位換算。
6. 檢查 `LaborRule` 是否仍保持 reference-only；未來若啟用，必須新增 item/recipe binding contract。
7. 檢查 active `MaterialSpec` 是否完全未被 binding 使用，並輸出 non-blocking warning。
8. 建立 allowed unbound material item allowlist，避免所有 missing binding 都只能用同一種 warning 解釋。
9. 定義並驗證 `InclusionExclusionRule.requires_review` 是否應推升 internal line `requires_review`。
10. 檢查所有 `PricingRule.price_source.type` 不得是 raw、candidate、RAG、AI 或 unapproved source。
11. 檢查 `NoteTemplate.trade_category` 是否與 applies-to item 的工程類別一致。
12. 檢查 customer-visible notes 是否有重複文字，避免 downstream customer note 重複。

## 12. Recommendation: 是否可以進入 Phase MS-4

建議：可以進入 Phase MS-4，但應先完成邊界文件。

Phase MS-4 建議優先事項：

1. 建立 `docs/budget/20-method-spec-to-budget-output-boundary.md`。
2. 明確定義 MethodSpecCatalog 哪些 shelf 可以影響 `BudgetEstimateLine`。
3. 明確定義 MethodSpecCatalog 哪些 shelf 只能影響 `BudgetOutputSnapshot.internal_view`。
4. 明確定義 MaterialSpec / ItemMaterialBinding 不可改價格、數量與 renderer 格式。
5. 明確定義 LaborRule 在正式啟用前維持 reference only。
6. 明確定義 Inclusion / Exclusion review flags 的 propagation policy。
7. 建立 validator backlog 的優先級，但不要在 MS-4 接手 renderer / Excel / PDF。

## Demo Result

Executed:

```bash
node --experimental-strip-types src/lib/budget/specs/demo-method-spec-warehouse.ts
```

Result summary:

- `method_spec_valid`: `true`
- validation errors: `0`
- validation warnings: `5`
- quote item templates: `12`
- method recipes: `7`
- material specs: `6`
- labor rules: `6`
- note templates: `10`
- unit conversions: `3`
- inclusion/exclusion rules: `12`
- item material bindings: `7`
- budget total amount: `231103`
- budget line count: `12`
- review required lines count: `5`

The 5 warnings are allowed unbound material items:

- `ELECTRIC_SOCKET_EXTENSION`
- `ELECTRIC_LIGHTING_INSTALL`
- `OTHER_PROTECTION_WORK`
- `OTHER_CLEANING_WORK`
- `OTHER_MANAGEMENT_FEE`
