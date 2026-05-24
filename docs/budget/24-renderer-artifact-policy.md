# Phase 3.3 Renderer Artifact Policy

本文件定義未來正式 Excel / PDF artifact writer 的政策。Phase 3.3 只建立 policy 與 preflight，不輸出正式檔案。

## Artifact Audience

目前允許兩種 audience：

- `customer`：客戶版預算表，只能包含客戶安全欄位。
- `internal_trace`：內部追溯版，可包含 source、recipe、material、formula、price_source、confidence、review 等追溯欄位。

嚴禁把 internal trace 輸出成 customer artifact。

## Artifact Format

目前 policy 定義未來兩種 format：

- `excel`
- `pdf`

目前 renderer 仍只輸出 skeleton structured object，不產生真 `.xlsx` / `.pdf`。

## 檔名規則

預設檔名規則：

```text
laibe-budget-{project_id}-{estimate_id}-{audience}-{snapshot_id}.{xlsx|pdf}
```

檔名必須綁定 `snapshot_id`，避免未來 artifact 無法追溯到生成快照。

## 儲存位置規則

目前 local prototype 只定義 policy，不寫入檔案。

允許的 storage target：

- `local_artifact_staging`
- `review_packet_attachment`

正式導入儲存層前，writer 仍不得碰正式資料庫 migration。

## 安全規則

Formal file writer 必須遵守：

- 不得覆寫已簽核文件。
- 不得把 internal trace artifact 當 customer artifact 輸出。
- 不得從 writer 重跑 budget engine。
- 不得從 writer 查 pricing rules。
- 不得從 writer 查 material resolver。
- 不得從 writer 呼叫 RAG 或 AI API。
- 不得使用 legacy `formatBudgetOutput()` 作為正式來源。
- 每個 artifact 必須記錄 `snapshot_id`。

## Writer Preflight

正式 file writer 進場時，第一步應先跑 preflight。若 preflight `valid: false`，writer 必須拒絕輸出，不得嘗試補資料、重算價格或繞過 snapshot。
