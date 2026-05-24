# Phase R1.2 Raw Review Contract & Warehouse Safety Validator

本階段補強 Raw Candidate Warehouse 在交給下游審核前的安全合約。

這不是正式上架流程，也不是正式 pricing / material / labor catalog 建立流程。Raw Candidate Warehouse 仍只保存 raw source、raw item、candidate、review queue 與 handoff proposal。

## 1. Handoff proposal contract validator

`validateHandoffProposalContract()` 逐筆檢查 `HandoffProposal` 是否符合 Raw Candidate Warehouse 的交接契約。

每筆 proposal 必須保留：

- `proposal_id`
- `proposal_type`
- `source_id`
- `source_type`
- `source_name`
- `source_reliability`
- `source_date`
- `raw_item_id`
- `candidate_id`
- `review_item_id`
- `validation_status`
- `review_status`
- `reviewer_note`
- `observed_price`
- `currency`
- `unit`
- `formal_price_generated`
- `price_authority`
- `allowed_next_actions`
- `blocked_actions`
- `provenance_trace`

`provenance_trace` 必須串起：

`RawCatalogSource -> RawCatalogItem -> Candidate -> ValidationResult -> ReviewQueueItem -> HandoffProposal`

安全規則：

- `formal_price_generated` 必須是 `false`。
- `price_authority` 必須是 `"none"`。
- `allowed_next_actions` 只能是送往下一層審核、保留參考、補資料或拒絕。
- `blocked_actions` 必須明確阻擋正式價格、預算列、覆蓋 catalog、未審核發布與客戶輸出。
- proposal 不得包含 `unit_price`、`formal_price`、`approved_price`、`amount_as_price`、`pricing_rule_id`、`material_spec_id`、`labor_rule_id`、`budget_estimate_line_id`。

## 2. Warehouse export safety scan

`validateWarehouseExportSafety()` 掃描 raw warehouse 對外輸出物件：

- candidates
- review items
- handoff proposals
- repository export snapshot，若未來需要

它會檢查：

- 不得出現正式價格欄位。
- 不得出現正式 catalog identity。
- 若存在 `formal_price_generated`，必須是 `false`。
- 若存在 `price_authority`，必須是 `"none"`。
- `observed_price` 允許存在，但只能被視為 evidence，必須再經下游審核。

## 3. approved_as_candidate 語意

`approved_as_candidate` 只代表：

> 這筆資料可作為候選證據送往下一層審核。

它不代表：

- 正式價格核准
- 正式 catalog 上架
- PricingRule 核准
- MaterialSpec 核准
- LaborRule 核准
- 可直接進 BudgetEstimateLine
- 可直接輸出給客戶

因此 demo summary 固定輸出：

```json
{
  "approved_as_candidate_is_formal_approval": false
}
```

## 4. Merge policy prototype

`evaluateRawCandidateMergePolicy()` 只產生 flags 與 recommendation，不自動合併、不自動上架。

MVP 規則：

- `suggested_code` 相同，標記 `possible_merge_required`。
- `suggested_code + vendor_name + region + effective_date` 相同，標記 `same_source_period_duplicate`。
- `suggested_code` 相同但 `unit` 不同，標記 `unit_mismatch`。
- material 類 candidate 同 brand / model / spec，標記 `possible_material_duplicate`。
- `observed_price` 與同 suggested_code 候選差異過大，標記 `price_outlier_high` 或 `price_outlier_low`。

這些結果只提醒人工審核，不會改寫 candidate，也不會產生正式 catalog。

## 5. 本階段仍禁止事項

Phase R1.2 仍禁止：

- 產生正式 `PricingRule`
- 產生正式 `MaterialSpec`
- 產生正式 `LaborRule`
- 產生正式 `BudgetEstimateLine.unit_price`
- 產生正式報價
- 進行正式 catalog publishing
- 接 RAG / AI API
- 接正式資料庫 migration
- 建立人工審核 UI
- 接 Renderer / Excel / PDF / BudgetOutputSnapshot
- 修改平面拼圖或 preview floor plan
- 修改 payment / escrow / listing fee

Raw Candidate Warehouse 的價格欄位只能是 `observed_price`，並且 `formal_price_generated` 必須永遠是 `false`。

## 6. 下一階段建議

建議下一階段先做 Phase R1.2 User-triggered Review result：

1. 驗證 proposal contract 是否完整。
2. 驗證 export safety scan 是否能阻擋正式價格欄位外洩。
3. 驗證 `approved_as_candidate` 沒有被誤讀成正式核准。
4. 驗證 merge policy 只產生 flags / recommendation。
5. 再決定是否進入 R1.3：raw source schema fixture、source reliability policy、或人工審核規格書。
