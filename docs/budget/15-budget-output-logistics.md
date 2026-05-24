# 成品物流：預算表單輸出系統

## 1. 成品物流是什麼

成品物流是萊比裝潢預算生成系統的輸出層。

它負責把既有 `BudgetEstimate` 與配件倉庫中的 `MethodSpecCatalog` 整理成接近傳統裝潢預算單格式的 structured JSON。

成品物流只做輸出整理，不撈貨、不分類、不決定價格。

## 2. 和原物料倉庫的差別

原物料倉庫處理 raw / candidate data，例如歷史報價、材料單價、廠商報價、市場價格。

成品物流不接觸 raw data，也不把候選價格變成正式單價。

如果成品物流需要價格，它只能讀取 deterministic budget engine 已產出的 `BudgetEstimateLine.unit_price` 與 `price_source`。

## 3. 和配件倉庫的差別

配件倉庫存放已審核的工法、材料規格、備註、單位換算、包含 / 不包含規則。

成品物流不新增工法，也不改規格。它只讀取配件倉庫資料，把備註、包含、排除、假設、風險併入輸出列。

## 4. 預算表單輸出格式

輸出分成：

- `customer_view`: 客戶可見預算列。
- `internal_view`: 系統內部追溯列。
- `totals`: 總計與統計資訊。
- `warnings`: 需複核或資料風險提醒。

這階段只輸出 JSON / rows，不輸出 Excel 或 PDF。

## 5. 客戶可見欄位

客戶可見列包含：

- 工程類別
- 項次
- 品名
- 單位
- 數量
- 單價
- 金額
- 備註

客戶可見資料不得包含 `source_id`、`recipe_id`、`quantity_formula`、`internal_note` 等內部追溯欄位。

## 6. 系統內部追溯欄位

內部追溯列需保留：

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

這些欄位用來說明每一列為什麼出現、怎麼算、價格從哪裡來、哪些地方需要複核。

## 7. 為什麼成品物流不能決定價格

價格只能由 deterministic budget engine 根據已審核規則產生。

成品物流不能決定價格，因為：

- 它不是原物料資料審核層。
- 它不是配件倉庫規則層。
- 它不能把候選資料變成正式價格。
- 它不能繞過 `price_source`、`PricingRule` 或人工審核。

成品物流只能顯示與整理既有價格。

## 8. 為什麼這階段不做 Excel / PDF

Phase 2.8 先確認資料結構是否正確。

Excel / PDF 會引入版面、匯出格式、字型、分頁、列印與檔案維護問題。這些應在 structured output 穩定後再做。

本階段只做：

- JSON output。
- customer rows。
- internal trace rows。
- validation report。

## 9. 未來如何接正式預算單、Excel、PDF

未來流程應是：

```text
BudgetEstimate
→ BudgetSheetOutput
→ customer rows / internal trace rows
→ Excel renderer
→ PDF renderer
→ formal review / approval workflow
```

Excel / PDF renderer 必須讀取 `BudgetSheetOutput`，不得重新計價、重新分類或直接改寫 traceability fields。
