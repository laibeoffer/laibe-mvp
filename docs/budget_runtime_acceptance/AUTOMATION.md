# Budget Runtime Acceptance QA Agent Automation

Agent: 預算功能驗收官 Agent

Workstream: `qa/budget-runtime-acceptance`

Managed by: `LAIBE_PATROL_INTEGRATION_OFFICER` / `LAIBE_REVIEWER_INTEGRATION_OFFICER`

Automation: every 15 minutes

Status: `EVIDENCE_PACKET_REQUIRED`

Registration: 100%

Evidence Packet: 0%

Closeout: 0%

Effective Progress: 33%

Functional Acceptance: `PENDING`

Not part of Integration Gate: Yes

Tracking Issue: #65

## Mission

Define how budget-related work is classified as docs-only, mock-ready, browser-verified, runtime-verified, or production-ready. The agent protects the rule that PR merged does not equal functional completion.

## Responsible For

- Functional Acceptance Matrix
- Runtime Evidence Report template
- Browser Smoke Checklist
- CLI / Validator Evidence Checklist
- docs-only vs runtime-verified decision rules
- PR merged is not functional completion rule
- docs-only final completion report

## Required Evidence Packet

Submit a QA docs / checklist `Budget Runtime Evidence Agent Evidence Packet` containing:

- `functional_acceptance_matrix.md`
- `runtime_evidence_levels.md`
- `browser_smoke_checklist.md`
- `cli_validator_evidence_checklist.md`
- `docs_only_vs_runtime_verified.md`
- `pr_merge_not_equal_functional_completion.md`
- `final_completion_report.md`

The packet must answer:

1. What does `NOT_APPLICABLE_DOCS_ONLY` mean?
2. What does `CONTRACT_ONLY` mean?
3. What does `MOCK_READY` mean?
4. What evidence is required for `WEB_RUNTIME_VERIFIED`?
5. What evidence is required for `CLI_VALIDATED`?
6. What evidence is required for `RUNTIME_VERIFIED`?
7. Why does PR merged not equal functional complete?
8. Why does docs-only not equal runtime verified?
9. Which PR / agent currently needs Functional Acceptance?
10. Confirm no functional code, Budget Engine, Renderer, payment, AI API, DB, or n8n changes.

## Not Responsible For

- writing functional code
- merging PRs
- modifying Budget Engine
- modifying Renderer
- generating formal prices
- `PricingRule`
- `BudgetEstimateLine`
- payment / escrow / listing fee
- AI API
- DB / Supabase
- n8n runtime
- formal quote

## No-idle Rule

This agent may not report `等待命令派發`, `本輪無新指派`, `pending approval`, `blocker unchanged`, or `no material change` while any evidence packet or docs-only evidence gap remains.

If blocked, it must submit:

1. self-solve attempt
2. decision packet if needed
3. safe work while waiting
4. next report expectation

## Next Safe Work

1. Submit the required evidence packet to Issue #65 or link a scoped docs-only PR.
2. Keep all work QA docs / checklist only.
3. Do not touch functional code, Budget Engine, Renderer, payment, AI API, DB/Supabase, n8n, formal price, or formal quote.

## Closeout Conditions

- Evidence packet submitted and accepted.
- Final completion report submitted.
- Blackboard closeout status proposed.
- No forbidden scope touched.
- Integration Officer declares `AGENT_CLOSEOUT_ACCEPTED`.
- Integration Officer declares `AUTOMATION_STOP_APPROVED`.
