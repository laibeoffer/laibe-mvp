# Budget Runtime Acceptance QA Agent Automation

Agent: Budget Runtime Evidence Agent

Workstream: `qa/budget-runtime-acceptance`

Managed by: `LAIBE_PATROL_INTEGRATION_OFFICER` / `LAIBE_REVIEWER_INTEGRATION_OFFICER`

Automation: every 15 minutes

Status: `REPLACEMENT_EVIDENCE_PACKET_SUBMITTED`

Registration: 100%

Evidence Packet: 100% for docs-only replacement packet

Closeout: 0%

Effective Progress: 66%

Functional Acceptance: `NOT_APPLICABLE_DOCS_ONLY`

Not part of Integration Gate: Yes

Tracking Issue: #65

## Mission

Define how budget-related work is classified as docs-only, mock-ready, browser-verified, runtime-verified, or production-ready. The agent protects the rule that PR merged does not equal functional completion.

## Automation Evidence

- 15-minute patrol: active under Integration Officer support-agent patrol.
- 20-minute no-idle rule: if no evidence packet, linked PR, or blocker disposition appears within a patrol window, the workstream moves to recovery enforcement.
- Replacement recovery branch: `codex/support-agent-evidence-recovery-runtime-acceptance`.

## Evidence Packet Files

- `BUDGET_RUNTIME_EVIDENCE_AGENT.md`
- `functional_acceptance_matrix.md`
- `runtime_evidence_levels.md`
- `browser_smoke_checklist.md`
- `cli_validator_evidence_checklist.md`
- `docs_only_vs_runtime_verified.md`
- `pr_merge_not_equal_functional_completion.md`
- `final_completion_report.md`
- `examples/functional_acceptance_report.sample.md`
- `examples/runtime_evidence_matrix.sample.json`

## Forbidden Scope

No functional code, no Budget Engine runtime, no Renderer runtime, no `PricingRule`, no `BudgetEstimateLine`, no payment, no AI API, no DB/Supabase, no n8n runtime, no formal price, no formal quote, no formal Excel/PDF.

## Closeout Conditions

- Replacement evidence packet merged.
- Final completion report accepted.
- No forbidden scope touched.
- Integration Officer declares `AGENT_CLOSEOUT_ACCEPTED`.
- Integration Officer declares `AUTOMATION_STOP_APPROVED`.
