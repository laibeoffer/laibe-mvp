# File Handoff Routes

Workstream: `budget/file-intake-sandbox`

## Route Map

| Source Window | File Types | Handoff Target | Allowed Use |
|---|---|---|---|
| Owner Guide | photos, drawings, style refs, quote files | Budget Input Flow Gate | Readiness / missing-data status only |
| Owner Guide | floor plans, drawings | Plan Puzzle | Context reference only |
| Plan Puzzle | linked plan / drawing metadata | Budget Input Flow Gate | Plan context status only |
| Owner Guide | quote Excel/CSV/PDF | Quote Factory | Candidate evidence only |
| Quote Factory | export package metadata | Raw Candidate | Candidate evidence only |

## Handoff Payload Fields

- `file_id`
- `file_type`
- `source_window`
- `handoff_target`
- `upload_status`
- `candidate_evidence_only`
- `review_required`
- `budget_item_generated: false`
- `formal_price_generated: false`

## Route Constraints

Files cannot bypass their target contract. A quote file cannot go directly to Budget Engine. A plan file cannot directly create production quantity. A style image cannot directly create scope or price.

## Review Flags

Add `review_required: true` when file status is `placeholder`, `linked`, `unavailable`, or when quote metadata is incomplete.
