# Budget Input Flow Gate Agent Automation

Agent: 預算輸入門禁 Agent

Workstream: `budget/input-flow-gate`

Managed by: `LAIBE_PATROL_INTEGRATION_OFFICER` / `LAIBE_REVIEWER_INTEGRATION_OFFICER`

Automation: every 15 minutes

Status: `EVIDENCE_PACKET_REQUIRED`

Registration: 100%

Evidence Packet: 0%

Closeout: 0%

Effective Progress: 33%

Functional Acceptance: `PENDING`

Not part of Integration Gate: Yes

Tracking Issue: #63

## Mission

Define the pre-budget-generation flow gate. The agent makes sure a user has completed required requirement intake, file intake, and plan quantity context status before entering budget preview.

## Responsible For

- `requirement_completion_status`
- `plan_quantity_context_status`
- CTA gate rules
- no-skip rules
- required data checklist
- budget preview readiness rules
- docs-only final completion report

## Required Evidence Packet

Submit a docs-only `Budget Input Flow Gate Evidence Packet` containing:

- `project_state_machine.md`
- `cta_gate_rules.md`
- `required_data_checklist.md`
- `owner_guide_completion_gate.md`
- `plan_puzzle_completion_gate.md`
- `budget_preview_gate.md`
- `no_skip_flow_rules.md`
- `final_completion_report.md`

The packet must answer:

1. Which CTAs must be disabled when the requirement form is incomplete?
2. Which conditions allow entry into Plan Puzzle?
3. Which conditions allow entry into Budget Preview?
4. Can a formal budget start when Plan Puzzle quantity is not `verified`?
5. What do `placeholder`, `linked`, `verified`, and `unavailable` mean?
6. Which data must not directly become `BudgetEstimateLine`?
7. Confirm no Budget Engine, `PricingRule`, Renderer, payment, AI API, or DB changes.

## Not Responsible For

- price calculation
- AI API
- DB / Supabase
- payment / escrow / listing fee
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

1. Submit the required evidence packet to Issue #63 or link a scoped docs-only PR.
2. Keep all work docs-only / contract-only.
3. Do not touch Budget Engine, `PricingRule`, Renderer, payment, AI API, DB, formal price, or formal quote.

## Closeout Conditions

- Evidence packet submitted and accepted.
- Final completion report submitted.
- Blackboard closeout status proposed.
- No forbidden scope touched.
- Integration Officer declares `AGENT_CLOSEOUT_ACCEPTED`.
- Integration Officer declares `AUTOMATION_STOP_APPROVED`.
