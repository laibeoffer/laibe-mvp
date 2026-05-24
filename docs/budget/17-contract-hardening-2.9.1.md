# Phase 2.9.1 Contract Hardening

本輪是 Phase 2.9 的 contract hardening，不是新功能擴張。範圍只補強 BudgetOutputSnapshot、BudgetSheetOutput validation，以及 ItemMaterialBinding.requires_review 的正式語意。

## 1. 可先凍結的 Phase 2.9 contract

Phase 2.9 的核心 contract 可先凍結：

- `ItemMaterialBinding` 只負責 `item_code -> material_code` 的規格追溯。
- `BudgetSheetOutput` 保留 `customer_view` 與 `internal_view`。
- `BudgetOutputSnapshot` 是未來 Excel / PDF renderer 的唯一輸入來源。
- `material_code` 只作規格追溯，不改變 `unit_price` 或 `amount`。

## 2. 本輪補強的 validator behavior

`BudgetOutputSnapshot` validator 必須檢查 top-level required fields：

- `snapshot_id`
- `estimate_id`
- `project_id`
- `estimate_stage`
- `output_version`
- `generated_at`
- `catalog_version`
- `customer_view`
- `internal_view`
- `totals`
- `validation_report`
- `warnings`
- `source_summary`

缺少欄位時，validator 只能回傳 `valid: false` 與 `errors`，不可 throw。`source_summary` 缺失也必須回傳 validation error。

## 3. ItemMaterialBinding.requires_review

`ItemMaterialBinding.requires_review` 的正式語意是：

> 此材料綁定只是規格追溯，但此材料規格在正式報價前需要人工確認。

它不可以：

- 改變價格
- 改變 `unit_price`
- 改變 `amount`
- 讓候選價格進入正式價格

它可以：

- 進入 `InternalBudgetLine.risks`
- 進入 output validation warnings
- 標示該列需要人工確認材料規格

## 4. BudgetOutputSnapshot.estimate_stage

`BudgetOutputSnapshot.estimate_stage` 保存產生 snapshot 時的估價階段。Phase 2.9.1 先由 `BudgetSheetOutput.stage` 帶入，讓未來 Excel / PDF、DB snapshot、審查流程能判斷此輸出是 mock、draft、reviewed 或 formal 版本。

## 5. Excel / PDF renderer 政策

未來 Excel / PDF renderer 必須只讀 `BudgetOutputSnapshot`，不可重新呼叫 budget engine。renderer 的責任是排版與輸出，不負責：

- 重算數量
- 重配工法
- 重查價格
- 重新分類材料
- 呼叫 RAG 或 AI 取得價格

這能避免同一份預算在輸出時因 catalog 或 engine 更新而變成不同結果。

## 6. 無 material binding 的工項

插座、燈具、保護工程、清潔工程、工程管理費等工項可以沒有 material binding。這些目前應被視為 warning：

`Material binding not required or not applicable for ITEM_CODE`

它們不是 validation error，也不應阻擋 snapshot 或成品物流輸出。
