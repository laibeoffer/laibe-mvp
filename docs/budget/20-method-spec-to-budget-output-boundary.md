# MethodSpec to BudgetEstimateLine / BudgetOutputSnapshot Boundary

Last updated: 2026-05-23

## 1. Summary

本文件定義「配件倉庫：工法與規格系統」如何供應資料給 budget engine 與 BudgetOutputSnapshot。

核心邊界：

- `MethodSpecCatalog` 可以供應已審核的工項、工法、材料規格、人工規則、備註、單位換算、包含/不包含規則與 deterministic pricing rules。
- 只有 `QuoteItemTemplate`、`MethodRecipe`、`PricingRule` 可以直接影響目前的 `BudgetEstimateLine` 主資料。
- `MaterialSpec`、`ItemMaterialBinding`、`NoteTemplate`、`InclusionExclusionRule` 主要影響 output enrichment 與 `BudgetOutputSnapshot.internal_view`，不可直接改價格或數量。
- `LaborRule` 與 `UnitConversion` 在本階段是 reference / contract shelf，不可默默進入主估價公式。
- Renderer 只能讀 `BudgetOutputSnapshot`。Renderer 不得回頭讀 `MethodSpecCatalog`、不得呼叫 budget engine、不得讀 pricing rules、不得讀 material resolver。

## 2. Scope

本文件涵蓋：

- MethodSpec shelves 的資料 ownership。
- `MethodSpecCatalog` 對 `BudgetEstimateLine` 的影響邊界。
- `MethodSpecCatalog` 對 `BudgetOutputSnapshot.customer_view` 與 `BudgetOutputSnapshot.internal_view` 的影響邊界。
- `requires_review` propagation policy 草案。
- allowed unbound material items 草案。
- validator backlog priority。
- Reviewer 應審查與不應接手的範圍。

本文件不涵蓋：

- 不定義 renderer / Excel / PDF layout。
- 不定義欄寬、分頁、簽核欄位或視覺格式。
- 不定義 raw candidate warehouse 的採集與審核流程。
- 不定義 RAG 或 AI API。
- 不定義正式 DB migration。
- 不修改 `src/lib/budget/output/` 或 `src/lib/budget/renderers/` 程式。

## 3. Data Ownership Table

| Shelf | Owns | May affect | Must not affect | Downstream consumer |
| --- | --- | --- | --- | --- |
| `QuoteItemTemplate` | 工項代碼、品名、工程類別、單位、預設備註 | `BudgetEstimateLine.item_name`、`trade_code` / `engineering_category`、`unit`、template note source | 不可決定單價；不可覆寫 pricing rule；不可決定 renderer 格式 | budget engine, output formatter/enricher |
| `MethodRecipe` | 觸發條件、工項 output、數量 fact 類型、數量公式、recipe trace、default assumptions、review triggers | `source_type`、`source_id`、`recipe_id`、`quantity_formula`、`quantity`、`quantity_fact_ids`、formula/scope review signals | 不可決定 `unit_price`；不可覆寫 `PricingRule`；不可直接決定 renderer 欄位格式 | quantity takeoff / recipe matcher / budget engine |
| `PricingRule` | deterministic price source、pricing type、unit price 或 percentage rule、confidence、price review flag | `unit_price`、`amount`、`price_source`、`confidence`、`requires_review` | 不可由 AI / RAG / raw candidate data 直接寫入正式價格；不可讀 renderer 資料後反推價格 | budget engine |
| `MaterialSpec` | 材料規格、材料名稱、類別、品牌、等級、單位、customer/internal material note、active state | `BudgetOutputSnapshot.internal_view.material_code` 的可解釋資料、internal material note、spec review context | 不可直接改 `quantity`、`unit_price`、`amount`；不可直接改 renderer 格式 | output enrichment before snapshot, validator |
| `ItemMaterialBinding` | `item_code -> material_code`、binding role、default binding、spec review flag、binding note | `internal_view.material_code`、material-linked risk/internal note、spec review warning | 不可直接改 `unit_price`、`amount`；不可讓材料候選價進正式價格 | material resolver / output enrichment before snapshot |
| `NoteTemplate` | customer note、internal note、exclusion、assumption、risk 文案與適用 item codes | customer/internal notes、assumptions、risks、note review signals | 不可改 `quantity`、`unit_price`、`amount`；不可改 renderer 欄位集合 | output enrichment before snapshot |
| `InclusionExclusionRule` | includes、excludes、assumption、scope review flag | `internal_view.inclusions`、`exclusions`、`assumptions`、`risks`、scope review warning | 不可改 renderer 格式；不可改價格；不可默默新增或移除正式工項 | output enrichment before snapshot, validator |
| `LaborRule` | labor reference code、trade、unit、base rate reference、labor notes、active state | 目前只可作 reference；未來若另開 phase 可支援 material/labor split contract | 本階段不可進入主估價公式；不可改 `PricingRule`；不可成為正式價格來源 | budget catalog conversion as reference, validator |
| `UnitConversion` | approved unit conversion factors 與 formula note | 目前作 formula reference；未來可支援 formula validator | 不可默默改寫已產生的 `quantity`；不可在 snapshot/renderer 階段重算數量 | validator / future formula engine |

## 4. BudgetEstimateLine Impact Map

| BudgetEstimateLine field | Current source | Boundary note |
| --- | --- | --- |
| `item_code` | `QuoteItemTemplate.item_code`, resolved through recipe output/template mapping | Internal output trace uses this to link notes, rules, and material binding. |
| `item_name` | `QuoteItemTemplate.item_name` | Method/spec owner can update approved item naming; renderer must not rename by itself. |
| `trade_category` | `QuoteItemTemplate.trade_code` / `engineering_category` | In engine line this is `trade_code` + `engineering_category`; customer/internal output may label as trade category. |
| `unit` | `QuoteItemTemplate.unit`, checked against `MethodRecipeOutput.unit` and `PricingRule.unit` | Unit mismatch should be validation error. |
| `quantity` | `QuantityFact` matched by `MethodRecipe.outputs[].quantity_fact_type` | `UnitConversion` should not silently rewrite generated quantity after the line exists. |
| `unit_price` | `PricingRule.unit_price` or percentage calculation rule | Only deterministic pricing rule may set this field. |
| `amount` | Engine calculation: `quantity * unit_price`, or percentage rule amount | Material/notes/labor/reference data must not alter amount. |
| `customer_note` | Not a native `BudgetEstimateLine` field; later derived from `line.notes` + customer-visible `NoteTemplate` | Customer note belongs to output enrichment, not engine pricing. |
| `internal_note` | Not a native `BudgetEstimateLine` field; later derived from review reasons, material notes, binding notes, and internal notes | Internal note belongs to internal trace, not customer view. |
| `source_type` | `MethodRecipe.trigger_type` / recipe match source | Required trace field. |
| `source_id` | matched layout object, object group, space group, or project source | Required trace field. |
| `recipe_id` | `MethodRecipe.recipe_id` | Required trace field. |
| `quantity_formula` | `MethodRecipeOutput.quantity_formula` | Required trace field; formula review flags must not change price directly. |
| `price_source` | `PricingRule.price_source` | Must be deterministic and approved; cannot be raw / candidate / RAG / AI direct source. |
| `confidence` | min of recipe/match confidence and pricing rule confidence | Lower confidence may trigger review guidance but must not create AI pricing. |
| `requires_review` | Recipe/match review signal or `PricingRule.requires_review` | Material binding review may add downstream spec review in internal output, but must not alter price. |

## 5. BudgetOutputSnapshot Impact Map

### Customer View

`customer_view` may use:

- `BudgetEstimateLine.item_name`
- `BudgetEstimateLine.unit`
- `BudgetEstimateLine.quantity`
- `BudgetEstimateLine.unit_price`
- `BudgetEstimateLine.amount`
- `BudgetEstimateLine.engineering_category` / approved trade label
- `BudgetEstimateLine.notes`
- active `NoteTemplate` where `is_customer_visible = true`

Customer notes may come from:

- `QuoteItemTemplate.default_notes`
- customer-visible `NoteTemplate.text`
- approved customer-visible assumptions/exclusions/risks that have been intentionally surfaced by output enrichment

`customer_view` must not display:

- `source_id`
- `recipe_id`
- `quantity_formula`
- `price_source`
- `confidence`
- `internal_note`
- `material_code`
- raw `MaterialSpec.internal_note`
- `ItemMaterialBinding.note`
- `InclusionExclusionRule` raw internal review metadata
- raw candidate warehouse fields
- RAG / AI explanation as formal price source

### Internal View

`internal_view` may use:

- all customer row fields
- `item_code`
- `source_type`
- `source_id`
- `recipe_id`
- `material_code`
- `quantity_formula`
- `price_source`
- `confidence`
- `requires_review`
- `internal_note`
- `inclusions`
- `exclusions`
- `assumptions`
- `risks`

Material trace source:

- `ItemMaterialBinding.item_code`
- `ItemMaterialBinding.material_code`
- `ItemMaterialBinding.role`
- `ItemMaterialBinding.is_default`
- `ItemMaterialBinding.requires_review`
- `ItemMaterialBinding.note`
- `MaterialSpec.material_code`
- `MaterialSpec.material_name`
- `MaterialSpec.category`
- `MaterialSpec.brand`
- `MaterialSpec.grade`
- `MaterialSpec.internal_note`

Recipe trace source:

- `MethodRecipe.recipe_id`
- `MethodRecipe.recipe_code`
- `MethodRecipe.recipe_name`
- `MethodRecipe.version`
- `MethodRecipe.trigger_type`
- `MethodRecipe.object_type`
- `MethodRecipe.space_type`
- `MethodRecipe.outputs[].quantity_formula`
- `MethodRecipe.default_assumptions`
- `MethodRecipe.review_triggers`

Inclusion / exclusion / assumption / risk source:

- `NoteTemplate.note_type`
- `NoteTemplate.text`
- `NoteTemplate.applies_to_item_codes`
- `NoteTemplate.is_customer_visible`
- `InclusionExclusionRule.includes`
- `InclusionExclusionRule.excludes`
- `InclusionExclusionRule.assumption`
- `InclusionExclusionRule.requires_review`
- `BudgetEstimateLine.review_reason`

Review flags source:

- `PricingRule.requires_review`
- recipe/match review signal derived from `MethodRecipe` output conditions, missing facts, or recipe output review reasons
- `ItemMaterialBinding.requires_review`
- `InclusionExclusionRule.requires_review`
- future `NoteTemplate.requires_review`, if added

Renderer boundary:

- Renderer must read only `BudgetOutputSnapshot`.
- Renderer must not read `MethodSpecCatalog`.
- Renderer must not call material resolver.
- Renderer must not call budget engine.
- Renderer must not read or apply `PricingRule`.

## 6. Boundary Rules

1. `MaterialSpec` may provide material trace, customer-visible material wording, and internal material note. It must not directly change `unit_price` or `amount`.
2. `ItemMaterialBinding` may resolve `item_code -> material_code`. It must not directly change `unit_price` or `amount`.
3. `NoteTemplate` may provide customer note, internal note, exclusion, assumption, or risk. It must not change `quantity`, `unit_price`, or `amount`.
4. `InclusionExclusionRule` may populate internal inclusions, exclusions, assumptions, and scope review risks. It must not change renderer format.
5. `LaborRule` is reference-only in this phase. It must not enter the main estimate formula unless a later phase explicitly defines labor/material split pricing.
6. `UnitConversion` is a method/spec reference in this phase. It must not silently rewrite an already generated `BudgetEstimateLine.quantity`.
7. `PricingRule` is currently the only deterministic formal price source for `BudgetEstimateLine.unit_price` and percentage-based pricing.
8. AI, RAG, raw candidate data, historical quote raw lines, supplier raw prices, or user text must not directly write into formal `PricingRule`.
9. Candidate or raw prices may become review inputs only through a separate approval path; this boundary document does not approve them as formal prices.
10. Budget engine may consume the approved `BudgetCatalog` built from `MethodSpecCatalog`.
11. Output enrichment may consume `MethodSpecCatalog` before creating `BudgetOutputSnapshot`.
12. Renderer may only consume `BudgetOutputSnapshot`; it must not go back to `MethodSpecCatalog`.
13. Customer output must not leak internal trace fields.
14. Internal trace must preserve enough source fields for review: source type, source id, recipe id, quantity formula, price source, confidence, review flags, material trace, inclusions/exclusions, assumptions, and risks.

## 7. Requires Review Propagation Policy Draft

This is a draft policy. It defines review categories before adding new code.

| Review type | Source signal | Meaning | Suggested propagation |
| --- | --- | --- | --- |
| `price_review` | `PricingRule.requires_review` | Unit price, percentage rule, or pricing confidence needs manual confirmation. | Should set `BudgetEstimateLine.requires_review = true`; should appear in internal trace warnings/risks. |
| `spec_review` | `ItemMaterialBinding.requires_review` | Material binding is traceability-only, but material spec must be confirmed before formal quote. | Should appear in internal risks/warnings; may set internal line `requires_review = true`; must not change price. |
| `scope_review` | `InclusionExclusionRule.requires_review` | Scope, inclusion/exclusion, site condition, or execution boundary needs manual confirmation. | Should appear in internal risks/warnings; propagation to line-level `requires_review` should be explicit and validated. |
| `formula_review` | `MethodRecipe.requires_review` or recipe-derived review signal | Quantity formula, missing facts, mock scope, or recipe assumptions need manual confirmation. | Should set or preserve line-level `requires_review` when it affects quantity confidence. |
| `note_review` | `NoteTemplate.requires_review` | Customer/internal note text needs manual wording or legal/business review before formal output. | Should create warning and internal note review task; must not change quantity or price. |

Current implementation notes:

- Current `MethodRecipe` type does not have a top-level `requires_review` boolean. Formula review is currently represented by recipe/match review signals such as output `review_reason`, missing quantity facts, output conditions, and `review_triggers`.
- Current `NoteTemplate` type does not have a `requires_review` field. `note_review` is a future contract slot if note approval workflow is added.
- `ItemMaterialBinding.requires_review` means `spec_review`, not price review.
- `InclusionExclusionRule.requires_review` means `scope_review`, not price review.
- `PricingRule.requires_review` means `price_review`.
- No review flag may introduce AI-generated or RAG-generated formal prices.

## 8. Allowed Unbound Material Items Draft

Some quote items do not need material trace in the method/spec catalog. Missing material binding for these items should be a warning or allowlisted condition, not an error.

Draft allowed unbound items:

| Item | Seed item code | Reason |
| --- | --- | --- |
| 插座出口延伸 | `ELECTRIC_SOCKET_EXTENSION` | Point-based electrical work; material is not currently itemized in the method/spec seed. |
| 燈具出線及安裝 | `ELECTRIC_LIGHTING_INSTALL` | Labor/point installation line; fixture body is excluded and not material-priced here. |
| 保護工程 | `OTHER_PROTECTION_WORK` | Site scope varies; material trace may be optional until protection spec is formalized. |
| 清潔工程 | `OTHER_CLEANING_WORK` | Service/scope line; no default material binding required. |
| 工程管理費 | `OTHER_MANAGEMENT_FEE` | Percentage/admin line; material binding is not applicable. |

Notes:

- `SITE_PROTECTION_STANDARD` exists as a material spec, but protection work is currently allowed to remain unbound.
- A future validator should use an explicit allowlist instead of warning on every missing binding in the same way.

## 9. Validator Backlog

### P0 - Required Before Formal Quote

- Validate `PricingRule.price_source.type` is not raw, candidate, RAG, AI, generated, or unapproved.
- Add allowed unbound material item allowlist.
- Define and validate `InclusionExclusionRule.requires_review` propagation policy.
- Validate each active `QuoteItemTemplate` has default notes or active customer-visible `NoteTemplate`.

### P1 - Recommended Before Formal Excel / PDF

- Validate each active `QuoteItemTemplate` has an `InclusionExclusionRule`, unless explicitly exempted.
- Validate `UnitConversion` covers unit conversions referenced by recipe formulas.
- Add `LaborRule` reference-only guard so labor base rates cannot be mistaken for formal pricing.

### P2 - Later Refinement

- Warn on unused active `MaterialSpec`.
- Add more detailed material binding completeness rules by trade and item type.
- Validate `NoteTemplate.trade_category` matches every applied item code's trade category.
- Detect duplicate customer-visible note text after enrichment.
- Validate `MethodRecipe.required_params` are either used by output conditions or marked documentation-only.
- Validate `MethodRecipe.review_triggers` are mapped to review policy categories.

## 10. Reviewer Guidance

Reviewer should read:

- `docs/budget/20-method-spec-to-budget-output-boundary.md`
- `docs/budget/21-method-spec-catalog-inventory-report.md`
- `docs/budget/14-method-spec-warehouse.md`
- `src/lib/budget/specs/types.ts`
- `src/lib/budget/specs/seed-method-spec-catalog.ts`
- `src/lib/budget/specs/validate-method-spec-catalog.ts`
- `src/lib/budget/specs/build-budget-catalog-from-method-spec.ts`

Reviewer should check:

- Whether `PricingRule` remains the only deterministic formal price source.
- Whether material specs and material bindings are only traceability metadata.
- Whether note and inclusion/exclusion data avoid changing quantity or price.
- Whether `LaborRule` remains reference-only.
- Whether renderer work remains outside the Method/Spec Warehouse chatroom.
- Whether customer output avoids internal trace leakage.
- Whether internal trace keeps source type, source id, recipe id, quantity formula, price source, confidence, material trace, assumptions, exclusions, risks, and review flags.

Reviewer should not treat renderer as this chatroom's ownership:

- Do not ask this chatroom to implement Excel/PDF.
- Do not ask this chatroom to edit `src/lib/budget/renderers/`.
- Do not ask this chatroom to edit renderer layout, CSV serializer, HTML skeleton, page breaks, column width, signing blocks, or PDF styling.
- Renderer review belongs to the output / renderer warehouse.

## 11. Recommendation

Recommendation: Phase MS-4 can be considered complete once this document is reviewed and accepted.

Suggested Phase MS-5 direction:

1. Implement validator-only hardening for the P0 backlog inside the Method/Spec Warehouse.
2. Keep MS-5 limited to `src/lib/budget/specs/` and method-spec docs unless explicitly expanded.
3. Do not modify renderer, output system, intake, frontend, floor-plan, RAG, AI API, DB migration, or payment areas.
4. Start with safety validators:
   - approved pricing source guard
   - allowed unbound material allowlist
   - quote item note coverage
   - inclusion/exclusion review propagation policy validation
5. Leave LaborRule activation, formula engine integration, and formal material/labor split pricing to later explicitly scoped phases.
