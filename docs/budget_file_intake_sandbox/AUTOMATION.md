# Budget File Intake Sandbox Agent Automation

Agent: 預算檔案收件沙盒 Agent

Workstream: `budget/file-intake-sandbox`

Managed by: `LAIBE_PATROL_INTEGRATION_OFFICER` / `LAIBE_REVIEWER_INTEGRATION_OFFICER`

Automation: every 15 minutes

Status: `ACTIVE_INITIALIZATION`

Functional Acceptance: `PENDING`

Not part of Integration Gate: Yes

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

This agent may not report `等待命令派發`, `本輪無新指派`, `pending approval`, `blocker unchanged`, or `no material change` while any initialization or docs-only evidence gap remains.

If blocked, it must submit:

1. self-solve attempt
2. decision packet if needed
3. safe work while waiting
4. next report expectation

## Next Safe Work

1. Create blackboard self-introduction.
2. Draft mock file manifest contract.
3. Draft file type / purpose taxonomy.
4. Draft placeholder / linked / verified status rules.
5. Draft handoff target matrix.
6. Submit final closeout packet to Integration Officer.

## Closeout Conditions

- Final completion report submitted.
- Blackboard closeout status proposed.
- No forbidden scope touched.
- Integration Officer declares `AGENT_CLOSEOUT_ACCEPTED`.
- Integration Officer declares `AUTOMATION_STOP_APPROVED`.
