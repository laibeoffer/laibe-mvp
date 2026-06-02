# Quote Factory File Window

Workstream: `budget/file-intake-sandbox`

## Purpose

Quote files may be recorded as candidate evidence for Quote Factory. This window does not parse prices into formal budget output.

## Accepted File Types

- `quote_excel`
- `quote_csv`
- `quote_pdf`
- `quote_image_reference`

## Required Metadata

- `file_id`
- `file_type`
- `upload_status`
- `supplier_name_if_known`
- `quote_date_if_known`
- `handoff_target: quote_factory`
- `candidate_evidence_only: true`
- `formal_price_generated: false`

## Handoff To Quote Factory

Quote Factory may use quote file metadata as a source reference for candidate extraction or future validator workflows. The file metadata itself is not a `PricingRule`, `MaterialSpec`, `LaborRule`, or `BudgetEstimateLine`.

## Forbidden

- no direct `display_unit_price` to `BudgetEstimateLine.unit_price`;
- no formal price;
- no approved price as production price;
- no Renderer payload;
- no DB/Supabase storage assumption;
- no production OCR.
