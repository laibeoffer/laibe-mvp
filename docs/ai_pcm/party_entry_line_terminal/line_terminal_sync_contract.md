# LINE Terminal Sync Contract

## Principle

LINE 是通知與輸入終端。平台後台才是正式紀錄。同步流程只把 LINE 訊息轉成待審紀錄，不讓 LINE 單獨改變合約、工單、付款或驗收狀態。

## Allowed LINE Terminal Capabilities

- 通知
- 提醒
- 補件
- 快速回覆
- 問題提交
- 圖片 / 文件補傳提醒

## Sync Direction

| Direction | Allowed | Rule |
|---|---:|---|
| platform to LINE | yes | 可送通知、提醒、待補提示。 |
| LINE to platform | yes | 只建立待審紀錄或問題提交。 |
| LINE to contract | no | 不得直接改合約。 |
| LINE to payment | no | 不得觸發付款。 |
| LINE to verified evidence | no | 不得自動標 verified。 |

## Sync Stages

1. `terminal_received`
   - LINE 或入口收到訊息。
   - 不產生正式效果。

2. `normalized_record_created`
   - 轉成 `line_message_record`。
   - 設定 `formal_record_effect: none`。

3. `platform_queue_pending`
   - 進平台待審佇列。
   - 未審核前不得改合約狀態。

4. `platform_review_required`
   - 依角色、案件、附件與訊息類型分流。
   - 需要人工或 Agent 審查。

5. `platform_record_linked`
   - 可連結到案件、問題單或補件清單。
   - 仍不可覆蓋正式紀錄。

6. `closed_or_escalated`
   - 關閉、要求補件、轉問題分流、轉證據管理或提報總控。

## Conflict Rule

當 LINE 訊息與平台正式紀錄衝突：

1. 以平台正式紀錄為準。
2. LINE 訊息標記為 `conflict_with_platform_record`。
3. 需要人工或 AI PCM 總監／後台總控 Agent 決策。
4. 不得讓 LINE 口頭訊息凌駕合約。

## Audit Trail

每筆同步紀錄必須保留：

- terminal source
- received timestamp
- normalized timestamp
- submitter display name
- role claim
- case and contract linkage
- message body digest
- attachment metadata
- sync status
- reviewer or escalation status
- formal record effect

## Explicit Non-Goals

- 不接真 LINE webhook。
- 不寫入 DB。
- 不產生 payment instruction。
- 不產生 legal conclusion。
- 不處理正式身份驗證。
