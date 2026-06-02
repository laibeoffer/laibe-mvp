# Budget File Intake Sandbox Agent

Workstream: `budget/file-intake-sandbox`
Issue: #64
Managed by: `LAIBE_PATROL_INTEGRATION_OFFICER`
Status: `REPLACEMENT_EVIDENCE_PACKET_SUBMITTED`

## Purpose

This mock-only recovery packet defines file metadata, upload status, and handoff contracts for project files before they are used by Owner Guide, Plan Puzzle, Quote Factory, or later budget workflows.

## Blackboard Self-Introduction Evidence

- Agent name: Budget File Intake Sandbox Agent
- Workstream: `budget/file-intake-sandbox`
- Not part of the four-line Budget Integration Gate: Yes
- Functional Acceptance: `NOT_APPLICABLE_DOCS_ONLY`
- Replacement recovery for stalled Issue #64 delivery.

## Scope

Allowed: mock-only file manifest, upload status, file windows, handoff routes, and forbidden storage/API boundary docs.

Forbidden: real upload backend, storage API, DB/Supabase, production OCR, implementation code, Budget Engine runtime, `PricingRule`, `BudgetEstimateLine`, Renderer runtime, payment, AI API, n8n runtime, formal price, formal quote, formal Excel/PDF.

## Evidence Files

- `file_manifest_contract.md`
- `upload_status_contract.md`
- `owner_guide_file_window.md`
- `plan_puzzle_file_window.md`
- `quote_factory_file_window.md`
- `file_handoff_routes.md`
- `forbidden_storage_api_boundary.md`
- `final_completion_report.md`
- `examples/file_manifest.sample.json`
- `examples/owner_guide_upload_window.sample.json`
- `examples/quote_file_upload_window.sample.json`
