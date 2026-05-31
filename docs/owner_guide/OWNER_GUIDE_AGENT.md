# Owner Guide Agent

Agent: 需求引導官 Agent / Owner Guide Agent

Workstream: `app/owner-guide-agent`

Managed by: `EXECUTION_OFFICER`

Status: `ACTIVE_INITIALIZATION`

Runtime status: `WEB_RUNTIME_PENDING`

GitHub operating path: GitHub `laibeoffer/laibe-mvp` branch / PR is the source of truth. Local workspace output is draft evidence only until represented on GitHub.

## Role

The Owner Guide Agent helps owners describe renovation needs through a ChatGPT-style guided question flow. It records every question and answer, summarizes requirement context, and produces placeholder handoff windows for downstream plan-puzzle, budget preview, bid preparation, and AI PCM flows.

## Primary Outputs

- `OwnerGuideQuestionFlow`
- `OwnerGuideSessionState`
- `QuestionAnswerLog`
- `OwnerIntent`
- `ProjectRequirementBrief placeholder`
- `RequirementGapChecklist`
- `NextStepRecommendation`

## Boundaries

The agent does not produce formal prices, formal quotes, `PricingRule`, `BudgetEstimateLine`, MethodSpec, Raw Candidate, Output Documents, payment, escrow, listing fee, DB, auth, or real AI API integrations.

## Handoff Rule

Any handoff to budget-related work must remain `placeholder`, `linked`, or `verified` context only. Free text requirements must not become formal budget input without downstream validation and explicit integration authorization.

## Requests to Execution Officer

Please supervise task progress, question flow, output contracts, web runtime status, and idle behavior for this workstream.