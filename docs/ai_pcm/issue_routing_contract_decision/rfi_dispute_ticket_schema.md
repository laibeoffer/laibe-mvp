# RFI / Dispute Ticket Schema

## Purpose

本 schema 用於將甲乙方問題標準化為可追蹤、可補件、可人工審核的 RFI 或 dispute ticket。所有欄位不得以 placeholder 冒充 verified evidence。

## Common Fields

```json
{
  "ticket_id": "PCM-RFI-YYYYMMDD-001",
  "ticket_type": "rfi",
  "status": "open",
  "created_at": "YYYY-MM-DDTHH:mm:ss+08:00",
  "created_by": "issue-routing-contract-decision-agent",
  "project_id": "PROJECT_ID_OR_PLACEHOLDER",
  "parties": {
    "requesting_party": "甲方 / 乙方 / 監造 / PCM / unknown",
    "responding_party": "甲方 / 乙方 / 監造 / PCM / unknown"
  },
  "issue_summary": "中立摘要，不加入責任判斷。",
  "primary_category": "需求不清",
  "secondary_categories": [],
  "contract_basis": [
    {
      "source_type": "contract_clause",
      "reference": "合約第 X 條",
      "version": "YYYY-MM-DD",
      "verification_status": "unverified",
      "note": "尚待人工確認條款文字。"
    }
  ],
  "verified_facts": [],
  "missing_information": [],
  "risk_flags": {
    "payment_involved": false,
    "change_involved": false,
    "acceptance_involved": false,
    "legal_or_breach_claim": false,
    "evidence_conflict": false
  },
  "preliminary_assessment": "目前資料不足以直接判斷。",
  "recommended_next_steps": [],
  "human_review": {
    "required": false,
    "reason": "",
    "review_owner": "AI PCM 總監／後台總控 Agent"
  },
  "forbidden_scope_check": {
    "no_legal_verdict": true,
    "no_auto_breach_decision": true,
    "no_auto_payment_request": true,
    "no_auto_construction_order": true,
    "no_placeholder_as_verified": true
  }
}
```

## Required Fields

- `ticket_id`
- `ticket_type`
- `status`
- `created_at`
- `created_by`
- `issue_summary`
- `primary_category`
- `contract_basis`
- `verified_facts`
- `missing_information`
- `risk_flags`
- `preliminary_assessment`
- `recommended_next_steps`
- `human_review`
- `forbidden_scope_check`

## Ticket Type Values

- `rfi`
- `dispute`

## Status Values

- `open`
- `awaiting_information`
- `under_human_review`
- `response_drafted`
- `closed_by_human`

## Evidence Verification Values

- `verified`
- `unverified`
- `placeholder`
- `conflicting`

## Validation Rules

- 若 `ticket_type = dispute` 且涉及付款、變更、驗收、違約或證據衝突，`human_review.required` 必須為 `true`。
- 若 `contract_basis` 全部為 `placeholder` 或 `unverified`，不得輸出確定性判斷。
- 若 `missing_information` 非空，初步判斷必須保留資料不足限制。
- 若 `risk_flags.payment_involved = true`，不得輸出付款命令。
- 若 `risk_flags.change_involved = true`，必須提示可能涉及變更單。
