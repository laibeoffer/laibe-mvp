# Owner Entry Contract

## Purpose

甲方入口用於提交案件問題、補件、快速回覆與平台提醒確認。甲方入口不得取代合約、後台審核或 verified evidence。

## Allowed Owner Actions

- 查看平台同步後的通知摘要。
- 回覆補件提醒。
- 提交問題或疑義。
- 上傳圖片或文件作為待審補件。
- 對提醒選擇快速回覆，例如「已收到」、「稍後補件」、「需要人工協助」。

## Required Platform Confirmation

以下事項必須回到平台後台確認：

- 合約條款變更
- 工項變更
- 追加減項確認
- 驗收結果
- 付款節點
- 身份或代理權確認
- 文件是否成為 verified evidence

## Owner Submission Fields

| Field | Required | Description |
|---|---:|---|
| `case_id` | yes | 平台案件 ID，由平台建立。 |
| `contract_id` | conditional | 若問題已關聯合約，必須帶入。 |
| `party_role` | yes | 固定為 `owner`。 |
| `submitter_display_name` | yes | LINE 或入口顯示名稱，非正式身份驗證。 |
| `message_type` | yes | `notice_reply`, `question`, `supplement`, `quick_reply`。 |
| `subject` | yes | 問題或補件主旨。 |
| `body` | yes | 提交內容。 |
| `attachments` | no | 圖片或文件待補清單，只作待審提示。 |
| `requested_action` | yes | 甲方希望平台處理的事項。 |
| `formal_record_effect` | yes | 固定為 `none`，除非平台後台另行審核。 |

## Owner Entry State

| State | Meaning |
|---|---|
| `received_terminal_message` | LINE 或入口收到訊息。 |
| `queued_for_platform_sync` | 等待同步到平台。 |
| `platform_pending_review` | 已進平台待審。 |
| `needs_evidence_verification` | 需要證據管理 Agent 驗證。 |
| `requires_supervisor_decision` | 需要 AI PCM 總監／後台總控 Agent 決策。 |
| `closed_without_formal_effect` | 已關閉，但不產生正式合約效果。 |

## Guardrails

- 甲方 LINE 回覆「同意」不得視為合約同意。
- 甲方補傳圖片不得自動成為 verified evidence。
- 甲方詢問付款不得觸發 payment。
- 甲方要求變更不得自動成立變更單。
