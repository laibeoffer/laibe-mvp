# File Manifest Contract

Workstream: `budget/file-intake-sandbox`

## Purpose

The file manifest records file metadata and intended handoff routes without creating real storage, OCR, budget items, formal quantity, or formal price.

## Manifest Fields

| Field | Required | Meaning |
|---|---:|---|
| `file_id` | Yes | Stable mock identifier. |
| `file_type` | Yes | `current_state_drawing`, `floor_plan`, `current_state_photo`, `style_reference`, `quote_excel`, `quote_csv`, `quote_pdf`, `other`. |
| `file_purpose` | Yes | Why the file was provided. |
| `upload_status` | Yes | Current mock intake status. |
| `source_window` | Yes | `owner_guide`, `plan_puzzle`, or `quote_factory`. |
| `handoff_target` | Yes | Next consumer contract. |
| `storage_uri` | No | Placeholder only; must not be real production storage. |
| `ocr_status` | No | `not_run`, `placeholder`, or `out_of_scope`. |
| `budget_item_generated` | Yes | Must remain false. |
| `formal_price_generated` | Yes | Must remain false. |

## File Type Rules

- Current-state drawings and floor plans are recorded as context evidence only.
- Photos are recorded as visual reference only.
- Style images are preference evidence only.
- Quote Excel / CSV / PDF files are raw evidence candidates and must go through Quote Factory or Raw Candidate governance before any downstream budget use.
