# Budget File Intake Sandbox Agent Automation

Agent: 預算檔案收件沙盒 Agent

Workstream: `budget/file-intake-sandbox`

Managed by: `LAIBE_PATROL_INTEGRATION_OFFICER` / `LAIBE_REVIEWER_INTEGRATION_OFFICER`

Automation: every 15 minutes

Status: `EVIDENCE_PACKET_REQUIRED`

Registration: 100%

Evidence Packet: 0%

Closeout: 0%

Effective Progress: 33%

Functional Acceptance: `PENDING`

Not part of Integration Gate: Yes

Tracking Issue: #64

## Mission

Define mock / placeholder intake logic for current-state drawings, current-state photos, style references, floor plans, quotes, and related files before budget preview.

## Responsible For

- `file_manifest`
- `file_type`
- `file_purpose`
- `upload_status`
- `placeholder | linked | verified` status
- handoff target
- no real upload backend boundary
- docs-only final completion report

## Required Evidence Packet

Submit a mock-only / placeholder-only `Budget File Intake Sandbox Evidence Packet` containing:

- `file_manifest_contract.md`
- `upload_status_contract.md`
- `owner_guide_file_window.md`
- `plan_puzzle_file_window.md`
- `quote_factory_file_window.md`
- `file_handoff_routes.md`
- `forbidden_storage_api_boundary.md`
- `final_completion_report.md`

The packet must answer:

1. How are current-state drawings / floor plans recorded?
2. How are current-state photos recorded?
3. How are expected style reference images recorded?
4. How are quote Excel / CSV / PDF files recorded?
5. What `upload_status` states exist?
6. How are files handed off to Owner Guide / Plan Puzzle / Quote Factory?
7. Confirm there is no real upload backend.
8. Confirm there is no storage / DB / Supabase.
9. Confirm there is no production OCR.
10. Confirm files do not directly become budget items, formal quantity, or formal price.

## Not Responsible For

- real upload backend
- storage
- DB / Supabase
- production OCR
- turning photos directly into budget items
- turning floor plans directly into production quantity
- price calculation
- Budget Engine runtime
- Renderer runtime
- `PricingRule`
- `BudgetEstimateLine`
- formal quote

## No-idle Rule

This agent may not report `等待命令派發`, `本輪無新指派`, `pending approval`, `blocker unchanged`, or `no material change` while any evidence packet or docs-only evidence gap remains.

If blocked, it must submit:

1. self-solve attempt
2. decision packet if needed
3. safe work while waiting
4. next report expectation

## Next Safe Work

1. Submit the required evidence packet to Issue #64 or link a scoped docs-only PR.
2. Keep all work mock-only / placeholder-only.
3. Do not touch real upload backend, storage API, DB/Supabase, production OCR, Budget Engine, `PricingRule`, `BudgetEstimateLine`, formal quantity, formal price, or formal quote.

## Closeout Conditions

- Evidence packet submitted and accepted.
- Final completion report submitted.
- Blackboard closeout status proposed.
- No forbidden scope touched.
- Integration Officer declares `AGENT_CLOSEOUT_ACCEPTED`.
- Integration Officer declares `AUTOMATION_STOP_APPROVED`.
