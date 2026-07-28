# A5 LaiBE Core Reconciliation Bundle

狀態：**尚未套用**。此目錄只提供本機審查與隔離測試，不代表 LaiBE Core 已接入 Knowledge Foundation。

目標專案 reference：`zdwuyomhswjcbbpbhpcq`

## 邊界

- 套用前必須由 A0／Owner 再次明確核准。
- 不得以本套件修改、刪除或重新命名任何非 A5 schema、table、function、policy 或 Storage bucket。
- `000_preflight.sql` 只讀檢查 A5 schema、RPC 與 Storage 衝突；命中即停止。
- 重複套用會停止；本 bundle 是 create-only 基線，不得作為既有 A5 schema 的 upgrade。
- `010_a5_knowledge_foundation.sql` 以單一交易建立 A5 物件，失敗時整批回退。
- `900_verify.sql` 只讀確認物件數、RLS、table privilege、RPC grant 與 private Storage。
- `990_rollback.sql` 只允許 matching marker 且沒有知識發布、案件、staging 或 Storage 資料時執行；不使用 `CASCADE`，任何非 A5 外部依賴都會使整筆交易回退。

## A14 LINE Core adapter 邊界

- `casework.document_versions` 是 append-only 文件版本紀錄，不允許原地更新或刪除。
- `casework.case_member_workstreams` 是案件角色與工作流授權的唯一明確來源；不得從 `casework.case_members` 推測 design / construction workstream。
- jpeg / png 附件如何對齊目前 PDF-only 的父文件模型仍標記為 `pending_a0_a14_confirmation`；正式套用前必須由 A0 / A14 確認，不得自行放寬既有文件類型約束。

## 正式套用前

1. 重新取得 LaiBE Core schema inventory 與 migration history。
2. 執行 preflight 並保存結果。
3. 建立可還原備份，確認鎖表與短暫維護時段。
4. 由 A0／Owner 核准 apply window、執行人與 rollback 條件。
5. 套用 ordered bundle 後立即執行 verify。

## 風險

建立 28 張 A5 table、index、RLS policy 與 function 會取得 DDL lock；空白 A5 schema 的預估鎖定時間短，但實際時間必須在正式環境 preflight 後重新估算。bundle marker 僅寫入 A5 `knowledge` schema comment，不建立 `public` table。rollback 不是一般清理工具，只能在零業務資料且 marker 完整時使用。

本套件不包含 production consumer、LINE Bot、正式知識發布、付款、託管、代收代付或法律效力功能。
