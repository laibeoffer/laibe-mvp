# Upload Status Contract

Workstream: `budget/file-intake-sandbox`

## Status Values

| Status | Meaning | Downstream Use |
|---|---|---|
| `not_requested` | File is not required yet. | No handoff. |
| `placeholder_expected` | User may provide this file later. | Display as missing optional/required evidence. |
| `mock_received` | Metadata exists, but no real upload storage is active. | Mock handoff only. |
| `linked` | File metadata points to a known upstream source. | Context only, not production authority. |
| `verified` | Human or future authorized validator accepted metadata. | May be used as reviewed context only. |
| `rejected` | File was unsuitable. | Must not be used. |
| `unavailable` | User cannot provide the file. | Add review flag. |

## Rules

1. `mock_received` does not mean a real file exists in production storage.
2. `linked` does not mean OCR or price extraction has occurred.
3. `verified` does not generate budget items or prices.
4. Quote files remain candidate evidence only until Quote Factory / Raw Candidate processing.
5. File status must be carried as trace metadata, not direct Budget Engine input authority.
