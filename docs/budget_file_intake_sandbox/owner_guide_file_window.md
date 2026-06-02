# Owner Guide File Window

Workstream: `budget/file-intake-sandbox`

## Purpose

Owner Guide can collect file metadata as requirement context. This remains a mock intake window and does not activate real upload storage.

## Accepted File Purposes

- current-state photo reference;
- current-state drawing reference;
- expected style reference;
- previous quote reference;
- note-only file placeholder.

## Required Metadata

- `file_id`
- `file_type`
- `file_purpose`
- `upload_status`
- `owner_note`
- `handoff_target`
- `budget_item_generated: false`
- `formal_price_generated: false`

## Handoff

Owner Guide may hand off file metadata to:

- Plan Puzzle for plan/drawing context;
- Quote Factory for quote file candidate evidence;
- Budget Input Flow Gate for readiness / missing-data checks.

## Boundary

Owner Guide file metadata cannot directly create `BudgetEstimateLine`, formal quantity, formal price, renderer output, or customer-facing quote.
