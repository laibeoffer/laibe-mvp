# Contract Attachment Registry

## Purpose

本 registry 管理合約附件、附件版本、附件狀態與附件對合約主文的關聯。

本文件不修改合約，也不判定法律效力；只記錄附件證據狀態。

## Attachment Status Rule

合約附件必須符合 evidence status policy：

- `placeholder`：預留附件，不能作正式裁斷。
- `linked`：有來源但未驗證，只能追溯。
- `verified`：可作正式依據。
- `disputed`：必須人工審核。
- `superseded`：不再作目前依據。
- `voided`：不得使用。
- `unavailable`：不得進裁斷。

## Registry Fields

| Field | Description |
|---|---|
| `attachment_id` | 附件唯一 ID。 |
| `contract_id` | 所屬合約 ID。 |
| `title` | 附件名稱。 |
| `attachment_type` | 圖面、預算、報價、工法、材料規格、驗收等。 |
| `status` | evidence status。 |
| `version_label` | 版本標示。 |
| `source_uri` | 來源路徑或 GitHub reference。 |
| `source_of_truth` | GitHub main / PR / commit SHA 或 LOCAL_STATE blocker。 |
| `contract_clause_reference` | 對應合約條款。 |
| `effective_date` | 生效日。 |
| `verified_by` | 驗證者或驗證機制。 |
| `verified_at` | 驗證時間。 |
| `superseded_by` | 取代本附件的附件 ID。 |
| `notes` | 限制、缺件、爭議或追溯說明。 |

## Current Registry

| Attachment ID | Contract ID | Title | Type | Status | Formal Use | Notes |
|---|---|---|---|---|---:|---|
| `ATTACHMENT-PLACEHOLDER-000` | `CONTRACT-UNKNOWN` | No verified attachment registered | `placeholder` | `placeholder` | No | Initialization placeholder only. |

