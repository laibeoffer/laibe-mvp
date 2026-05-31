# n8n Placeholder Workflow

## Current Status

目前尚未啟用 n8n。
本階段只建立 workflow spec / placeholder blueprint。
任何 n8n 節點只能是描述性 placeholder，不可包含:

- real webhook URL
- API key
- secret
- credential
- production endpoint
- payment node
- DB node
- Supabase node
- real AI API node
- real customer notification
- formal quote output

## Workflow Name

`budget-workflow-orchestrator-placeholder`

## Purpose

Document the future budget generation orchestration path without enabling runtime execution.

The workflow describes how a validated input package would move through existing LaiBE budget-system boundaries:

1. Trigger placeholder
2. Input package validation
3. Quote Factory export package reference
4. Raw Candidate intake reference
5. Raw Candidate review queue
6. MethodSpec review gate
7. Budget Engine entry and picking
8. Budget Engine dry-run
9. BudgetOutputSnapshot placeholder
10. Output Documents preview
11. Knowledge Vault feedback
12. Blackboard status update

## First Version Flow

```text
Manual Trigger / Webhook Placeholder / File Upload Placeholder
-> Validate Input Package
-> Quote Factory Export Package
-> Raw Candidate Intake
-> Raw Candidate Review Queue
-> MethodSpec Review Gate
-> Budget Engine Entry & Picking
-> Budget Engine Dry-run
-> BudgetOutputSnapshot
-> Output Documents Preview
-> Knowledge Vault Feedback
-> Blackboard Status Update
```

Schedule Review Trigger Placeholder uses the same dry-run boundary, but its intended future purpose is periodic proposal review and Knowledge Vault hygiene. It may not directly modify formal rules.

## Global Execution Policy

- `dry_run_only: true` for all nodes.
- `requires_human_review: true` for all review gates and any node that would affect downstream estimates.
- `placeholder_only: true` for all trigger nodes.
- No node may call real n8n, API, DB, Supabase, payment, AI API, webhook runtime, upload backend, production notification, or renderer.
- No node may produce formal Excel, PDF, formal customer quote, formal PricingRule, or formal BudgetEstimateLine.

## Dynamic Parameter Windows

Two parameter windows may be carried by the workflow. They are context windows, not pricing authorities.

### Requirement Form / ProjectRequirementBrief Window

Fields:

- `project_requirement_brief_id`
- `owner_intent_id`
- `requirement_context_status`
- `budget_preference`
- `space_requirements`
- `scope_constraints`
- `review_flags`

Allowed `requirement_context_status` values:

- `placeholder`
- `linked`
- `verified`
- `unavailable`

Prohibited behavior:

- Free-text requirements must not directly create `BudgetEstimateLine`.
- Requirement form data must not directly create `PricingRule`.
- Requirement form data must not bypass review gates.

### Plan Puzzle SVG / Quantity Facts Window

Fields:

- `plan_id`
- `svg_artifact_id`
- `plan_quantity_facts_id`
- `quantity_context_status`
- `zone_id`
- `area_m2`
- `wall_length_m`
- `opening_count`
- `quantity_confidence`
- `reviewer_required`

Allowed `quantity_context_status` values:

- `placeholder`
- `linked`
- `verified`
- `unavailable`

Prohibited behavior:

- SVG must not go directly to Renderer.
- SVG must not go directly to `BudgetEstimateLine`.
- Placeholder quantity must not be treated as production quantity.

## Stop Conditions

Stop immediately and mark the workflow blocked if any node requires:

- real n8n runtime
- webhook endpoint
- upload backend
- API key, credential, token, secret
- DB, Supabase, migration, storage runtime
- payment, escrow, listing fee, fund release
- AI API, RAG runtime, OpenAI API
- production automation
- formal budget generation
- formal Excel or PDF output
- customer notification
