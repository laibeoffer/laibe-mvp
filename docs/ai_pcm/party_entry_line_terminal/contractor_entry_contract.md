# Contractor Entry Contract

## Purpose

乙方入口用於接收提醒、補件、現場回覆、問題提交與文件補傳提醒。乙方入口不得取代合約、正式估驗、付款條件或後台審核。

## Allowed Contractor Actions

- 回覆平台通知。
- 提交施工問題或 RFI。
- 回覆補件提醒。
- 上傳現場圖片或文件作為待審補件。
- 提交需甲方或後台確認的問題。
- 使用快速回覆標記「已收到」、「已補件」、「需確認」、「無法配合」。

## Required Platform Confirmation

以下事項不得只靠乙方 LINE 訊息成立：

- 追加工程成立
- 工期展延成立
- 估驗完成
- 請款成立
- 合約條款變更
- 驗收通過
- 付款觸發

## Contractor Submission Fields

| Field | Required | Description |
|---|---:|---|
| `case_id` | yes | 平台案件 ID。 |
| `contract_id` | conditional | 若與既有合約關聯，必填。 |
| `party_role` | yes | 固定為 `contractor`。 |
| `submitter_display_name` | yes | LINE 或入口顯示名稱，非正式身份驗證。 |
| `message_type` | yes | `notice_reply`, `rfi`, `supplement`, `quick_reply`。 |
| `subject` | yes | 問題、補件或回覆主旨。 |
| `body` | yes | 提交內容。 |
| `attachments` | no | 待審圖片或文件。 |
| `requested_action` | yes | 希望平台或甲方處理的事項。 |
| `formal_record_effect` | yes | 固定為 `none`，除非平台後台另行審核。 |

## Contractor Entry State

| State | Meaning |
|---|---|
| `received_terminal_message` | LINE 或入口收到訊息。 |
| `queued_for_platform_sync` | 等待同步到平台。 |
| `platform_pending_review` | 已進平台待審。 |
| `needs_owner_response` | 需要甲方回覆。 |
| `needs_contract_review` | 需要合約或問題分流 Agent 檢查。 |
| `requires_supervisor_decision` | 需要 AI PCM 總監／後台總控 Agent 決策。 |
| `closed_without_formal_effect` | 已關閉，但不產生正式合約效果。 |

## Guardrails

- 乙方 LINE 報價不得自動成為追加契約。
- 乙方 LINE 請款不得觸發付款。
- 乙方現場照片不得自動通過驗收。
- 乙方口頭承諾不得凌駕合約與平台正式紀錄。
