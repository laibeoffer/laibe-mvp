# Phase R1.2A Raw Data Feeding Trial

本階段是 Raw Candidate Warehouse 的小批量餵資料測試。

目標是確認手動整理的預算單列，可以被轉成 `RawCatalogSource` / `RawCatalogItem`，再走既有 raw warehouse pipeline：

`RawCatalogSource -> RawCatalogItem -> Candidate -> ValidationResult -> ReviewQueueItem -> HandoffProposal`

本階段不是正式資料匯入器，不做 Excel parser，不做資料庫，不做正式 catalog publishing。

## 1. Sample row shape

本輪使用手動整理 sample rows，欄位接近傳統預算單：

- 工程類別
- 品名
- 單位
- 數量
- 單價
- 金額
- 備註

這些欄位只代表來源列中的觀測資料。`單價` 會轉成 raw row 的 `raw_unit_price`，再進 candidate 的 `observed_price`。它不得變成正式 `unit_price`。

## 2. RawCatalogSource mapping

`createRawCatalogSourceFromBudgetRows()` 會把整批 sample rows 包成一個 source：

- `source_type`: `historical_quote`
- `source_name`: `R1.2A manually arranged budget sheet sample`
- `source_owner`: `laibe_raw_warehouse_trial`
- `source_reliability`: `medium`
- `region`: `TW-TPE`
- `currency`: `TWD`

因為本輪是小批量手動整理預算列，所以先視為 historical quote evidence，不視為正式 catalog。

## 3. RawCatalogItem mapping

每一列 sample row 會轉成一筆 raw item：

- `raw_category` <- 工程類別
- `raw_name` <- 品名
- `raw_unit` <- 單位
- `raw_quantity` <- 數量
- `raw_unit_price` <- 單價
- `raw_amount` <- 金額
- `raw_note` <- 備註
- `raw_text` <- 原始欄位串接文字
- `metadata.original_row` <- 保留原始 sample row

`raw_unit_price` 與 `raw_amount` 只保留來源證據，不是正式價格。

## 4. Pipeline checks

`demo-raw-data-feeding-trial.ts` 會執行：

1. sample rows -> RawCatalogSource
2. RawCatalogSource -> RawCatalogItem
3. existing classifier
4. existing normalizer
5. existing validator
6. review queue
7. handoff proposals
8. observed price safety
9. proposal contract validator
10. warehouse export safety
11. static guard

## 5. Safety rules

本階段固定維持：

```json
{
  "formal_price_generated": false,
  "price_authority": "none",
  "formal_pricing_rule_generated": false,
  "formal_budget_line_generated": false
}
```

禁止事項：

- 不產生正式 `PricingRule`
- 不產生正式 `MaterialSpec`
- 不產生正式 `LaborRule`
- 不產生正式 `BudgetEstimateLine.unit_price`
- 不做正式報價
- 不做正式 catalog publishing
- 不碰 Renderer / Excel / PDF / BudgetOutputSnapshot
- 不碰平面拼圖
- 不做 RAG / AI API / DB migration

## 6. Demo command

```bash
node --experimental-strip-types src/lib/budget/raw-warehouse/demo-raw-data-feeding-trial.ts
```

目前 demo summary：

- `sample_row_count`: 10
- `raw_item_count`: 10
- `candidate_count`: 10
- `valid_for_review_count`: 10
- `needs_more_info_count`: 0
- `blocked_count`: 0
- `review_queue_count`: 10
- `proposal_count`: 10
- `proposal_contract_valid`: true
- `warehouse_export_safety_valid`: true
- `observed_price_safety_valid`: true
- `static_guard_valid`: true
- `formal_price_generated`: false
- `price_authority`: `"none"`
- `formal_pricing_rule_generated`: false
- `formal_budget_line_generated`: false

## 7. 下一步建議

下一步可以做 R1.2A User-triggered Review result，檢查：

- sample row -> raw source / raw item mapping 是否足夠。
- `observed_price` 是否仍只停留在 evidence layer。
- proposal contract / export safety 是否阻擋正式價格欄位。
- 是否需要在 R1.3 擴充更多 sample fixture，例如廠商報價、材料單價表、人工單價表、品牌型號表。
