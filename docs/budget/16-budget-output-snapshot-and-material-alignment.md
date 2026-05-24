# Budget Output Snapshot 與 MaterialSpec 對齊

## 1. 為什麼 material_code 不能 hardcode 在成品物流

`material_code` 是規格追溯資料，應由配件倉庫管理，而不是寫死在成品物流。

如果成品物流用 item name hardcode material mapping，會產生幾個問題：

- 品名改字就可能失效。
- 同一工項未來可能有多種材料角色，例如 primary、optional、accessory。
- material code 無法被 catalog validation 檢查。
- Excel / PDF renderer 可能讀到未經配件倉庫承認的材料代碼。

因此 `material_code` 必須從 `MethodSpecCatalog.item_material_bindings` 解析。

## 2. MaterialSpec 與 BudgetEstimateLine 的關係

`MaterialSpec` 是已審核材料規格，不是價格來源。

`BudgetEstimateLine` 透過 `item_code` 連到 `ItemMaterialBinding`，再連到 `MaterialSpec.material_code`。

這個連結只說明該預算列使用或參考哪個材料規格，不會改變 `unit_price`、`amount` 或 `price_source`。

## 3. ItemMaterialBinding 是什麼

`ItemMaterialBinding` 是工項與材料規格之間的正式 binding 規則。

它描述：

- 哪個 `item_code` 對應哪個 `material_code`。
- 材料在該工項中的角色。
- 是否為預設材料。
- 是否需要人工複核。
- 備註。

角色包含：

- `primary`
- `optional`
- `accessory`
- `reference_only`

MVP 先使用 default primary binding 解析輸出列的 `material_code`。

## 4. BudgetOutputSnapshot 是什麼

`BudgetOutputSnapshot` 是成品物流輸出的固定快照。

它保存：

- `customer_view`
- `internal_view`
- `totals`
- `validation_report`
- `warnings`
- `source_summary`
- 使用的 catalog version
- output version

快照的目的，是讓後續展示、Excel、PDF 或審核流程讀同一份穩定資料，而不是每次重新跑 engine。

## 5. 為什麼 Excel / PDF 未來應讀 snapshot，而不是重新跑 engine

Excel / PDF 是 rendering layer，不是估價 engine。

如果 Excel / PDF 每次都重新跑預算邏輯，可能造成：

- 同一張預算單前後不一致。
- catalog 更新後舊預算被意外改寫。
- 無法追溯當時輸出的 validation report。
- 難以區分「重新估價」與「重新渲染」。

未來正確流程應是：

```text
BudgetEstimate + MethodSpecCatalog
→ BudgetSheetOutput
→ BudgetOutputSnapshot
→ Excel / PDF renderer
```

renderer 只能讀 snapshot，不得重新分類、重新計價或改寫追溯欄位。

## 6. material_code 只是規格追溯，不可以直接改價格

`material_code` 只表示材料規格關聯。

它不可以：

- 直接改 `unit_price`。
- 直接改 `amount`。
- 覆蓋 `price_source`。
- 取代 `PricingRule`。

價格仍必須由 deterministic budget engine 依 approved pricing rules 產生。
