# Acceptance Matrix

| ID | Area | Input / Stimulus | Expected Result | Evidence |
|---|---|---|---|---|
| E2E-QA-001 | fixture loading | all fixtures include `dry_run_only: true` | harness accepts dry-run package | fixture manifest validation |
| E2E-QA-002 | Quote Factory boundary | cloud-ready export package contains reviewed references | references appear only in provenance / warning summary | provenance summary |
| E2E-QA-003 | raw evidence boundary | raw `PriceObservation` attempts direct line price | blocked before budget row creation | forbidden flow report |
| E2E-QA-004 | Raw Candidate gate | `HandoffProposal` enters pipeline | review gate status is required before downstream trace use | internal trace preview |
| E2E-QA-005 | customer view boundary | `HandoffProposal` attempts customer preview output | blocked; no handoff payload in customer preview | customer preview scan |
| E2E-QA-006 | MethodSpec approval | approved seed / rule catalog provided | only `approval_status: approved` rules are eligible | rule provenance |
| E2E-QA-007 | MethodSpec rejection | draft or unapproved MethodSpec rule appears | fail closed before Budget Engine fixture step | validation error |
| E2E-QA-008 | placeholder requirements | owner free text provided | text is captured as assumption context only | warning summary |
| E2E-QA-009 | placeholder plan facts | plan facts provided with placeholder authority | quantities remain dry-run and cannot become formal | internal trace preview |
| E2E-QA-010 | SVG boundary | SVG artifact reference exists | SVG is not renderer input and not formal quantity source | forbidden flow report |
| E2E-QA-011 | Budget Engine output | deterministic dry-run step completes | expected `BudgetOutputSnapshot` contract is produced | snapshot validation |
| E2E-QA-012 | Output Documents boundary | renderer reads output | renderer reads snapshot only | access log / fixture assertion |
| E2E-QA-013 | formal price prevention | price-capable fields inspected | formal price fields are null or redacted | snapshot scan |
| E2E-QA-014 | forbidden flows | all negative cases executed | every case is blocked, rejected, or fail-closed | forbidden flow report |
| E2E-QA-015 | external IO | fixture run attempts payment, AI API, DB, n8n, webhook | blocked before external call | external IO assertion |
| E2E-QA-016 | regression scope | repository diff inspected | no `src/`, `app/`, implementation, renderer, DB, payment, or AI code changed | PR changed files |

## Required Acceptance Result

Final acceptance requires all matrix rows to pass. Any failed forbidden flow, formal price creation, implementation code change, or external IO attempt blocks acceptance.
