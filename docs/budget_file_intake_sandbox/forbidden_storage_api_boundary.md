# Forbidden Storage / API Boundary

Workstream: `budget/file-intake-sandbox`

## Purpose

This packet is mock-only. It documents file metadata contracts without activating storage, upload APIs, OCR, or production file processing.

## Explicitly Forbidden

- real upload backend;
- storage API;
- DB or Supabase writes;
- production OCR;
- production webhook;
- AI API extraction;
- file-to-price automation;
- file-to-quantity automation;
- renderer output;
- formal Excel/PDF;
- formal quote.

## Allowed Placeholder Fields

- `file_id`
- `file_name_placeholder`
- `file_type`
- `upload_status`
- `handoff_target`
- `review_required`
- `storage_uri: null`
- `ocr_status: not_run`

## Guard Values

Every sample manifest must include:

- `real_upload_backend_enabled: false`
- `storage_api_connected: false`
- `ocr_production_enabled: false`
- `budget_item_generated: false`
- `formal_price_generated: false`

## Functional Acceptance

`NOT_APPLICABLE_DOCS_ONLY`.
