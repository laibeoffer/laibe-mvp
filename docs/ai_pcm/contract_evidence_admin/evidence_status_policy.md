# Evidence Status Policy

## Core Rule

沒有 `verified` 的資料，不得作正式裁斷依據。

本政策適用於合約主文、附件、預算、報價、圖面、LINE 訊息、平台訊息、驗收、付款節點與雙方確認紀錄。

## Status Definitions

### placeholder

`placeholder` 表示資料尚未連結到可追溯來源，或只是等待補件的預留欄位。

Rule: `placeholder` 不能作正式裁斷。

Allowed use:

- 任務追蹤。
- 待補資料提示。
- 不完整 evidence packet 的占位。

Forbidden use:

- 不得作正式裁斷。
- 不得被視為已確認事實。
- 不得進入付款、法律或驗收判斷。

### linked

`linked` 表示資料已連結到來源，但尚未完成驗證。

Rule: `linked` 只能追溯。

Allowed use:

- 追溯來源。
- 提醒待驗證。
- 建立 evidence chain。

Forbidden use:

- 不得作正式裁斷。
- 不得替代 verified。
- 不得自動覆蓋合約或附件。

### verified

`verified` 表示資料已完成來源、版本、關聯、當事人確認與適用性驗證。

Rule: `verified` 才可作正式依據。

Required checks:

- 來源可追溯。
- 版本可識別。
- 與合約、附件、變更單或雙方確認紀錄有明確關聯。
- 未被較新 verified 紀錄取代。
- 未被 voided。
- 無未解 disputed issue。

### disputed

`disputed` 表示來源、版本、內容、當事人確認、適用性或證據權重存在爭議。

Rule: `disputed` 必須人工審核。

Forbidden use:

- 不得自動裁斷。
- 不得自動升級為 verified。
- 不得用 AI 推測補齊。

### superseded

`superseded` 表示該資料已被較新且 verified 的文件或紀錄取代。

Rule: `superseded` 不再作目前依據。

Allowed use:

- 歷史追溯。
- 說明版本演進。

Forbidden use:

- 不得作目前裁斷依據。

### voided

`voided` 表示該資料已作廢、撤回、確認無效或禁止使用。

Rule: `voided` 不得使用。

Allowed use:

- 稽核紀錄。
- 說明為何不得使用。

Forbidden use:

- 不得作正式或輔助裁斷。
- 不得用於付款、驗收、法律或合約判斷。

### unavailable

`unavailable` 表示資料無法取得、未被提供、來源不存在或權限不足。

Rule: `unavailable` 不得進裁斷。

Allowed use:

- 缺件清單。
- 權限或 source-of-truth blocker 回報。

Forbidden use:

- 不得用推測補足。
- 不得作正式裁斷。

## Transition Rules

| From | To | Allowed When |
|---|---|---|
| `placeholder` | `linked` | 已取得可追溯來源。 |
| `linked` | `verified` | 完成驗證且無爭議。 |
| `linked` | `disputed` | 來源、版本或內容有衝突。 |
| `verified` | `disputed` | 後續發現衝突或異議。 |
| `verified` | `superseded` | 較新 verified 資料明確取代。 |
| any | `voided` | 已作廢、撤回、確認無效或禁止使用。 |
| any | `unavailable` | 資料來源無法取得或權限不足。 |

## LINE And Platform Message Rule

LINE 訊息與平台訊息不得單獨升級為合約。

它們最多只能在以下條件下成為輔助證據：

- 來源可追溯。
- 參與者身份可確認。
- 時間、上下文與內容可驗證。
- 與合約、附件、變更單或雙方確認紀錄有明確關聯。

