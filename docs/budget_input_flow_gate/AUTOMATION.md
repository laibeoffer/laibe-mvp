# Budget Input Flow Gate Agent Automation

Agent: Budget Input Flow Gate Agent

Workstream: `budget/input-flow-gate`

Managed by: `LAIBE_PATROL_INTEGRATION_OFFICER` / `LAIBE_REVIEWER_INTEGRATION_OFFICER`

Automation: every 15 minutes

Status: `REPLACEMENT_EVIDENCE_PACKET_SUBMITTED`

Registration: 100%

Evidence Packet: 100% for docs-only replacement packet

Closeout: 0%

Effective Progress: 66%

Functional Acceptance: `NOT_APPLICABLE_DOCS_ONLY`

Not part of Integration Gate: Yes

Tracking Issue: #63

## Mission

Define the pre-budget-generation flow gate. The agent makes sure a user has completed required requirement intake, file intake, and plan quantity context status before entering budget preview.

## Automation Evidence

- 15-minute patrol: active under Integration Officer support-agent patrol.
- 20-minute no-idle rule: if no evidence packet, linked PR, or blocker disposition appears within a patrol window, the workstream moves to recovery enforcement.
- Replacement recovery branch: `codex/support-agent-evidence-recovery-input-gate`.

## Evidence Packet Files

- `BUDGET_INPUT_FLOW_GATE_AGENT.md`
- `project_state_machine.md`
- `cta_gate_rules.md`
- `required_data_checklist.md`
- `owner_guide_completion_gate.md`
- `plan_puzzle_completion_gate.md`
- `budget_preview_gate.md`
- `no_skip_flow_rules.md`
- `final_completion_report.md`
- `examples/project_state.sample.json`
- `examples/cta_gate_rules.sample.json`

## Forbidden Scope

No functional code, no Budget Engine runtime, no `PricingRule`, no `BudgetEstimateLine`, no Renderer runtime, no payment, no AI API, no DB/Supabase, no n8n runtime, no formal price, no formal quote, no formal Excel/PDF.

## Closeout Conditions

- Replacement evidence packet merged.
- Final completion report accepted.
- No forbidden scope touched.
- Integration Officer declares `AGENT_CLOSEOUT_ACCEPTED`.
- Integration Officer declares `AUTOMATION_STOP_APPROVED`.
