# Plan Puzzle File Window

Workstream: `budget/file-intake-sandbox`

## Purpose

Plan Puzzle can receive file metadata for drawings and floor plan references. This window is context-only and does not parse files into production quantities.

## Accepted File Types

- `floor_plan`
- `current_state_drawing`
- `current_state_photo`
- `style_reference`

## Allowed Use

- show that a plan or drawing reference exists;
- link file metadata to a plan puzzle session;
- mark plan context as `placeholder`, `linked`, `verified`, or `unavailable`;
- inform Budget Input Flow Gate whether plan context is missing.

## Forbidden Use

- no production quantity from uploaded files;
- no SVG quantity promotion without verification;
- no OCR production extraction;
- no Budget Engine runtime input authority;
- no `BudgetEstimateLine` creation;
- no formal price.

## Handoff Fields

- `file_id`
- `file_type`
- `plan_context_status`
- `linked_plan_session_id`
- `quantity_authority: false`
- `review_required`
