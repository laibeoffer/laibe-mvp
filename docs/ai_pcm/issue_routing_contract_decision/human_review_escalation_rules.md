# Human Review Escalation Rules

## Escalation Owner

AI PCM 總監／後台總控 Agent

## Mandatory Escalation Triggers

以下任一情況必須人工審核：

- 涉及付款、扣款、保留款、追加款或付款節點。
- 涉及變更單、追加減、合約範圍變動或工項是否包含。
- 涉及驗收、瑕疵、缺失改善、保固或完成標準。
- 任一方主張違約、求償、罰則、解除契約或法律責任。
- 合約、附件、圖面、會議紀錄、LINE 訊息或照片互相矛盾。
- 合約條款存在兩種以上合理解釋。
- 只有 placeholder 或 unverified evidence，缺乏 verified evidence。
- 需要存取 GitHub、正式合約庫、DB、LINE production、payment 或其他受限系統。
- 回覆可能造成任一方實質權利義務變動。

## Optional Escalation Triggers

以下情況建議人工審核：

- 問題跨多個工項、樓層、專業分包或界面。
- 影響關鍵路徑、工期展延或里程碑。
- 涉及材料替代、品牌等級或性能差異。
- 涉及招標補遺或投標公平性。
- 對外回覆可能被視為正式承諾。

## Escalation Payload

提報人工審核時應包含：

```json
{
  "ticket_id": "PCM-DISPUTE-YYYYMMDD-001",
  "reason": "涉及付款與變更，且合約附件尚未 verified。",
  "issue_summary": "中立摘要",
  "contract_basis": [],
  "verified_facts": [],
  "missing_information": [],
  "risk_flags": {
    "payment_involved": true,
    "change_involved": true,
    "acceptance_involved": false,
    "legal_or_breach_claim": false,
    "evidence_conflict": false
  },
  "requested_decision": "請確認是否可依合約變更程序要求補件與人工審核。"
}
```

## Escalation Language

- 可用：「本案涉及付款 / 變更 / 驗收，建議升級人工審核。」
- 可用：「目前資料不足以形成裁決建議，需補充合約附件與 verified evidence。」
- 不可用：「AI 已裁決。」
- 不可用：「平台已判定某方違約。」
