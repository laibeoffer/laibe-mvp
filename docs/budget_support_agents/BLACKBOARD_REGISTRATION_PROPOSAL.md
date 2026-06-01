# Budget Support Agents Blackboard Registration Proposal

Source of truth: GitHub `main` plus current open PR / Issue state.

Managed by: `LAIBE_PATROL_INTEGRATION_OFFICER` / `LAIBE_REVIEWER_INTEGRATION_OFFICER`

This is a docs-only registration proposal for three budget support agents. These agents are not part of the four Budget Integration Gate lines.

## Proposed Blackboard Section

```md
## Integration Officer Managed Support Agents

| Agent | Workstream | Automation | Status | Progress % | Functional Acceptance | Blocker | Next |
|---|---|---|---|---:|---|---|---|
| 預算輸入門禁 Agent | `budget/input-flow-gate` | every 15 minutes | ACTIVE_INITIALIZATION | 10 | PENDING | Blackboard self-introduction / AUTOMATION.md / input gate contract pending | Create docs-only self-introduction, AUTOMATION.md, requirement and preview readiness gate rules |
| 預算檔案收件沙盒 Agent | `budget/file-intake-sandbox` | every 15 minutes | ACTIVE_INITIALIZATION | 10 | PENDING | Blackboard self-introduction / AUTOMATION.md / file manifest contract pending | Create docs-only self-introduction, AUTOMATION.md, mock file manifest, no-real-upload boundary |
| 預算功能驗收官 Agent | `qa/budget-runtime-acceptance` | every 15 minutes | ACTIVE_INITIALIZATION | 10 | PENDING | Blackboard self-introduction / AUTOMATION.md / acceptance matrix pending | Create docs-only self-introduction, AUTOMATION.md, functional acceptance matrix and runtime evidence checklist |
```

## Gate Boundary

The four Budget Integration Gate lines remain only:

1. `quote-factory/price-range-governance`
2. `warehouse/raw-candidate`
3. `warehouse/method-spec`
4. `output/budget-documents`

These three support agents must not increase those four readiness lines.

## Preauthorized Low-risk Scope

Allowed without Commander approval:

- blackboard self-introduction
- docs directory
- `AUTOMATION.md`
- contract / schema / placeholder docs
- mock-only file manifest
- runtime evidence checklist
- functional acceptance report template
- docs-only PR
- stale-doc correction
- final closeout report

## Forbidden Scope

The support agents must not touch:

- formal price
- `PricingRule`
- `BudgetEstimateLine`
- Budget Engine runtime
- Renderer runtime
- payment / escrow / listing fee
- AI API
- DB / Supabase
- n8n production runtime
- real upload backend
- production webhook
- real Excel / PDF external output
- formal quote

## Closeout Rule

Each support agent must submit a final completion report and blackboard closeout status. Only the Integration Officer may declare:

- `AGENT_CLOSEOUT_ACCEPTED`
- `AUTOMATION_STOP_APPROVED`

Functional Acceptance for these initialization docs is `NOT_APPLICABLE_DOCS_ONLY` until runtime evidence is explicitly required and reviewed.
