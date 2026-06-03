# Party Question Submission Flow

## Purpose

甲方與乙方可透過 LINE 或入口提交問題。問題提交只建立待審問題，不產生裁決、不修改合約、不觸發付款。

## Flow

1. Party submits question
   - 來源可能是甲方入口、乙方入口或 LINE 終端。
   - 角色宣稱只作 routing，不作正式身份驗證。

2. Normalize into question record
   - 建立 `line_message_record` 或入口提交紀錄。
   - `formal_record_effect` 固定為 `none`。

3. Classify question
   - `clarification`
   - `supplement_request`
   - `rfi`
   - `contract_interpretation`
   - `change_order_risk`
   - `payment_risk`
   - `evidence_verification_needed`

4. Route for review
   - 證據問題轉合約資料與證據管理 Agent。
   - 合約解釋或爭議轉問題分流與合約裁決建議 Agent。
   - 付款文字只標風險，不觸發付款。
   - 權限或邊界問題提報 AI PCM 總監／後台總控 Agent。

5. Platform review
   - 後台確認案件、合約、角色、證據與衝突狀態。
   - 可要求補件或人工審核。

6. Response draft
   - 可產生中立回覆草案。
   - AI 回覆不得直接成為正式裁決。

7. Close or escalate
   - 若不具正式效果，標記 `closed_without_formal_effect`。
   - 若涉及權限、合約變更或付款，標記 `requires_supervisor_decision`。

## Required Question Fields

| Field | Required | Description |
|---|---:|---|
| `question_id` | yes | 待審問題 ID。 |
| `case_id` | yes | 平台案件 ID。 |
| `contract_id` | conditional | 已關聯合約時必填。 |
| `party_role` | yes | `owner` 或 `contractor`。 |
| `question_type` | yes | 分流類型。 |
| `subject` | yes | 問題主旨。 |
| `body` | yes | 問題內容。 |
| `requested_action` | yes | 希望平台處理事項。 |
| `attachments` | no | 待審附件 metadata。 |
| `formal_record_effect` | yes | 固定為 `none`。 |
| `routing_target` | yes | 待處理 Agent 或後台佇列。 |

## Auto-Reject Conditions

以下不得由 LINE 或入口直接完成：

- 「我同意追加，直接改合約」
- 「已完工，直接付款」
- 「LINE 說了算」
- 「照片就是驗收完成」
- 「不用後台審核」

遇到以上語意時，系統只可建立風險標籤並提報。
