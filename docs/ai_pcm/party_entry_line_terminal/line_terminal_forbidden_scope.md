# LINE Terminal Forbidden Scope

## Absolute Prohibitions

LINE cannot:

- 單獨改合約。
- 單獨成立變更單。
- 單獨觸發付款。
- 覆蓋平台正式紀錄。
- 讓口頭訊息凌駕合約。
- 作為合約唯一來源。
- 作為正式身份驗證來源。

## Integration Prohibitions

本工作流不得實作：

- 真 LINE API
- LINE webhook callback
- DB connection
- payment / escrow / listing fee
- production AI API
- production runtime
- formal identity verification

## Forbidden Outcome Examples

| Input | Forbidden Outcome | Allowed Handling |
|---|---|---|
| 甲方 LINE 回覆「同意追加」 | 自動改合約或成立追加 | 建立待審問題，標 `change_order_attempt`。 |
| 乙方 LINE 回覆「已完工請付款」 | 觸發付款 | 建立待審問題，標 `payment_trigger_attempt`。 |
| 任一方補傳照片 | 自動驗收或 verified evidence | 建立待審補件，轉證據驗證。 |
| LINE 訊息與後台紀錄衝突 | 覆蓋後台正式紀錄 | 標 `conflict_with_platform_record` 並提報。 |
| 任一方說「LINE 說了算」 | 讓口頭訊息凌駕合約 | 標 `oral_message_over_contract_risk`。 |

## Boundary Check Checklist

- `formal_record_effect` 是否固定為 `none`。
- 是否沒有 API key、webhook URL 或 DB connection string。
- 是否沒有 payment trigger。
- 是否沒有把附件標成 verified。
- 是否沒有把 quick reply 解讀成合約同意。
- 是否有衝突提報路徑。

## Escalation Route

任何權限、外部整合、正式身份驗證、合約效力或付款問題，一律提報：

`AI PCM 總監／後台總控 Agent`
