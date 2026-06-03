# Superseded And Voided Evidence Log

## Purpose

本 log 記錄已被取代或不得使用的證據，以保留追溯鏈並避免舊資料被誤用。

## Superseded Rule

`superseded` 表示資料已被較新且 `verified` 的資料取代。

`superseded` 可保留歷史追溯，但不再作目前依據。

## Voided Rule

`voided` 表示資料已作廢、撤回、確認無效或禁止使用。

`voided` 不得使用，包含不得作正式依據或輔助裁斷。

## Log Fields

| Field | Description |
|---|---|
| `log_id` | 紀錄 ID。 |
| `evidence_id` | 被取代或作廢的證據 ID。 |
| `status` | `superseded` or `voided`。 |
| `reason` | 取代或作廢原因。 |
| `replacement_evidence_id` | 取代它的 evidence ID，若適用。 |
| `decision_source` | 使狀態成立的 verified 來源。 |
| `logged_at` | 紀錄時間。 |
| `formal_use_allowed` | 必須為 `false`。 |

## Current Log

No superseded or voided project evidence has been registered during initialization.

Future rows must only be added when a real evidence record is explicitly marked `superseded` or `voided`.
