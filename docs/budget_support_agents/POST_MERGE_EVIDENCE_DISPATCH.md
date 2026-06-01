# Budget Support Agents Post-Merge Evidence Dispatch

Source of truth: GitHub `main`, PR #58 merged artifacts, and open evidence request issues.

PR #58 merged as docs-only registration package at `6e48e827d129c6e112c92f9691229b0ffb590a12`.

These three support agents are not part of the four-line Budget Integration Gate and must not increase Quote Factory, Raw Candidate, MethodSpec, or Output Documents readiness.

Functional Acceptance for PR #58 registration package: `NOT_APPLICABLE_DOCS_ONLY`.

## Post-Merge Evidence Status Rows

| Agent | Workstream | Status | Next Required Evidence | Deadline / Next Patrol |
|---|---|---|---|---|
| 預算輸入門禁 Agent | `budget/input-flow-gate` | `EVIDENCE_PACKET_REQUIRED` | input gate contracts / CTA rules / no-skip rules / final report | Next patrol; track Issue #63 |
| 預算檔案收件沙盒 Agent | `budget/file-intake-sandbox` | `EVIDENCE_PACKET_REQUIRED` | file manifest / upload status / handoff routes / no-real-upload boundary / final report | Next patrol; track Issue #64 |
| 預算功能驗收官 Agent | `qa/budget-runtime-acceptance` | `EVIDENCE_PACKET_REQUIRED` | functional acceptance matrix / runtime evidence checklist / PR merged != functional complete rule / final report | Next patrol; track Issue #65 |

## Evidence Request Issues

- Issue #63: Budget Input Flow Gate Evidence Packet Required
- Issue #64: Budget File Intake Sandbox Evidence Packet Required
- Issue #65: Budget Runtime Acceptance Evidence Packet Required

## Idle Prevention Rule

Until each issue receives its required evidence packet, the correct patrol status is `ACTION_REQUIRED`, not `NO_ACTION`.

Agents may not report `本 workstream 本輪無新指派` while evidence packets, final completion reports, blackboard closeout, or automation-stop approval are pending.

## Forbidden Scope Reminder

No formal price, no `PricingRule`, no `BudgetEstimateLine`, no Budget Engine runtime, no Renderer runtime, no payment, no AI API, no DB/Supabase, no n8n runtime, no real upload backend, no production webhook, no formal Excel/PDF, and no formal quote.

## Next Patrol Expectation

The next patrol must check Issues #63, #64, and #65 for submitted evidence packets. If no evidence is posted, keep all three agents at `ACTION_REQUIRED` and repeat the concrete missing evidence list.
