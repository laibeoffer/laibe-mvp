# Budget File Intake Sandbox Agent Automation

Agent: Budget File Intake Sandbox Agent

Workstream: `budget/file-intake-sandbox`

Managed by: `LAIBE_PATROL_INTEGRATION_OFFICER` / `LAIBE_REVIEWER_INTEGRATION_OFFICER`

Automation: every 15 minutes

Status: `REPLACEMENT_EVIDENCE_PACKET_SUBMITTED`

Registration: 100%

Evidence Packet: 100% for docs-only replacement packet

Closeout: 0%

Effective Progress: 66%

Functional Acceptance: `NOT_APPLICABLE_DOCS_ONLY`

Not part of Integration Gate: Yes

Tracking Issue: #64

## Mission

Define mock / placeholder intake logic for current-state drawings, current-state photos, style references, floor plans, quotes, and related files before budget preview.

## Automation Evidence

- 15-minute patrol: active under Integration Officer support-agent patrol.
- 20-minute no-idle rule: if no evidence packet, linked PR, or blocker disposition appears within a patrol window, the workstream moves to recovery enforcement.
- Replacement recovery branch: `codex/support-agent-evidence-recovery-file-intake`.

## Evidence Packet Files

- `BUDGET_FILE_INTAKE_SANDBOX_AGENT.md`
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

## Forbidden Scope

No real upload backend, no storage API, no DB/Supabase, no production OCR, no functional code, no Budget Engine runtime, no `PricingRule`, no `BudgetEstimateLine`, no Renderer runtime, no payment, no AI API, no n8n runtime, no formal price, no formal quote, no formal Excel/PDF.

## Closeout Conditions

- Replacement evidence packet merged.
- Final completion report accepted.
- No forbidden scope touched.
- Integration Officer declares `AGENT_CLOSEOUT_ACCEPTED`.
- Integration Officer declares `AUTOMATION_STOP_APPROVED`.
