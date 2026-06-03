# Disputed Evidence Register

## Purpose

本 register 記錄所有不得自動裁斷的 disputed evidence。

任何 disputed evidence 必須人工審核，不得由 AI PCM 自動升級為 `verified`。

## Dispute Triggers

以下情況必須標記為 `disputed`：

- 合約主文與附件衝突。
- 預算單與報價單衝突。
- 變更單版本不明。
- LINE 或平台訊息內容與合約不一致。
- 雙方確認紀錄缺少一方確認。
- 圖面、SVG、量體版本不一致。
- 現況照片時間、地點或來源不明。
- 付款節點與驗收紀錄不一致。
- 資料來源可追溯但內容真實性或適用性被提出異議。

## Register Fields

| Field | Description |
|---|---|
| `dispute_id` | 爭議 ID。 |
| `evidence_id` | 相關證據 ID。 |
| `dispute_reason` | 爭議原因。 |
| `raised_by` | 提出者或來源。 |
| `raised_at` | 提出時間。 |
| `required_review` | 需要何種人工審核。 |
| `blocked_formal_use` | 是否阻擋正式使用。 |
| `resolution_status` | `open`、`resolved`、`voided`、`superseded`。 |

## Current Register

No disputed project evidence has been registered during initialization.

If a future source conflicts with contract main text, verified attachment, verified change order, verified acceptance record, or verified bilateral confirmation, it must be registered here before any formal use.
