# LINE Message Record Schema

## Purpose

`line_message_record` 是 LINE 終端訊息的標準化待審紀錄格式。它不是正式合約紀錄，也不是付款或驗收指令。

## Required Fields

| Field | Type | Required | Description |
|---|---|---:|---|
| `schema_version` | string | yes | 固定格式版本，例如 `1.0.0-draft`。 |
| `record_id` | string | yes | 平台產生的待審紀錄 ID。 |
| `case_id` | string | yes | 平台案件 ID。 |
| `contract_id` | string or null | yes | 合約 ID；尚未關聯時為 null。 |
| `terminal_channel` | string | yes | 固定為 `line_terminal_placeholder`。 |
| `terminal_provider_record_id` | string or null | yes | 真 LINE 未接入時為 null 或 placeholder。 |
| `direction` | string | yes | `inbound` 或 `outbound`。 |
| `party_role` | string | yes | `owner`, `contractor`, `platform`, `unknown`。 |
| `submitter_display_name` | string | yes | 顯示名稱，非正式身份。 |
| `identity_verification_status` | string | yes | 固定為 `not_verified_by_line_terminal`。 |
| `message_type` | string | yes | `notice`, `reminder`, `supplement_request`, `quick_reply`, `question`, `rfi`, `attachment_notice`。 |
| `subject` | string | yes | 主旨。 |
| `body` | string | yes | 訊息本文或摘要。 |
| `attachments` | array | yes | 待審附件 metadata。 |
| `received_at` | string | yes | ISO 8601 timestamp。 |
| `normalized_at` | string | yes | ISO 8601 timestamp。 |
| `sync_status` | string | yes | 同步狀態。 |
| `platform_review_status` | string | yes | 後台審核狀態。 |
| `formal_record_effect` | string | yes | 固定預設 `none`。 |
| `risk_flags` | array | yes | 風險標籤。 |
| `escalation_target` | string or null | yes | 需要提報時填 `AI_PCM_SUPERVISOR`。 |

## Enumerations

`sync_status`:

- `terminal_received`
- `normalized_record_created`
- `platform_queue_pending`
- `platform_review_required`
- `platform_record_linked`
- `closed_without_formal_effect`
- `escalated_to_supervisor`

`platform_review_status`:

- `pending_review`
- `needs_evidence_verification`
- `needs_contract_review`
- `needs_party_response`
- `requires_supervisor_decision`
- `reviewed_no_formal_effect`

`formal_record_effect`:

- `none`

`risk_flags`:

- `contract_change_attempt`
- `change_order_attempt`
- `payment_trigger_attempt`
- `identity_not_verified`
- `attachment_not_verified`
- `conflict_with_platform_record`
- `oral_message_over_contract_risk`

## Validation Rules

1. `formal_record_effect` must be `none`.
2. `identity_verification_status` must not claim formal verification.
3. Any payment-related body must add `payment_trigger_attempt` when it appears to request payment action.
4. Any contract-change wording must add `contract_change_attempt` or `change_order_attempt`.
5. Attachments must remain metadata only until evidence verification.
6. LINE terminal records may link to platform records but may not overwrite them.
