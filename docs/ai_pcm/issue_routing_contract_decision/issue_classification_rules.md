# Issue Classification Rules

## Classification Method

每個問題可有一個主要分類與多個次要分類。若問題描述不足，先分類為 `需求不清`，並建立 RFI ticket 要求補件。若已存在責任、金額、時程、驗收或條款解釋爭議，建立 dispute ticket，並標記人工審核。

## Required Categories

| 分類 | 適用情境 | 預設 Ticket | 需優先查找 |
|---|---|---|---|
| 需求不清 | 業主需求、範圍、完成標準未明確 | RFI | 合約範圍、需求書、會議紀錄 |
| 圖面不清 | 圖說尺寸、位置、版本、節點或標註不明 | RFI | 圖面版次、設計變更、標註說明 |
| 工項是否包含 | 某施工或供料是否在原合約內 | RFI / dispute | 標單、報價、工項明細、合約附件 |
| 材料規格爭議 | 品牌、型號、等級、替代品或樣品爭議 | dispute | 材料規範、核准樣品、送審紀錄 |
| 工法範圍爭議 | 施工方法、施工責任或界面不清 | dispute | 施工規範、界面表、會議紀錄 |
| 追加款爭議 | 是否應追加、追加金額或程序爭議 | dispute | 變更單、報價單、簽核流程 |
| 進度延誤 | 逾期、展延、等待決策或界面延誤 | dispute | 進度表、通知紀錄、展延條款 |
| 瑕疵 / 驗收 | 完工品質、缺失、修繕、驗收標準 | dispute | 驗收標準、缺失紀錄、照片、改善單 |
| 付款節點 | 請款條件、付款比例、階段完成認定 | dispute | 付款條款、驗收紀錄、請款文件 |
| 招標澄清 | 投標前或議約前條件、規範、範圍釐清 | RFI | 招標文件、補遺、答疑紀錄 |
| 合約條款解釋 | 條款文字、附件優先順序或適用條款爭議 | dispute | 合約本文、附件、優先順序條款 |

## Ticket Selection Rules

- 建立 RFI ticket：問題主要是資訊不清、文件缺漏、需要設計或業主確認。
- 建立 dispute ticket：問題已涉及責任歸屬、費用、工期、驗收、付款或條款解釋。
- 同時建立：一部分缺資料、一部分已形成爭議時，可建立 dispute ticket 並內含 RFI 補件事項。

## Risk Flags

- `payment_involved`：涉及付款節點、追加款、扣款或保留款。
- `change_involved`：可能涉及變更單、追加減或範圍變動。
- `acceptance_involved`：涉及驗收、瑕疵、缺失改善或保固。
- `legal_or_breach_claim`：任一方主張違約、求償、解除或法律責任。
- `evidence_conflict`：合約、圖面、訊息、照片或紀錄互相矛盾。
- `insufficient_verified_evidence`：資料不足以形成初步判斷。

## Classification Output Format

```json
{
  "primary_category": "工項是否包含",
  "secondary_categories": ["合約條款解釋", "追加款爭議"],
  "ticket_type": "dispute",
  "risk_flags": ["payment_involved", "change_involved"],
  "human_review_required": true,
  "reason": "涉及工項是否包含與追加款可能性，需依合約附件與變更程序人工審核。"
}
```
