# Workflow Knowledge Vault Feedback Contract

## Purpose

Define how dry-run workflow observations may become Knowledge Vault feedback proposals without directly changing production rules.

This contract is placeholder-only. It does not create a database, vector store, AI API, RAG pipeline, or production automation.

## Feedback Inputs

Allowed feedback inputs:

- preview warnings
- rejected raw candidates
- needs-more-info candidate refs
- unresolved MethodSpec assumptions
- Requirement Form context review flags
- Quantity Facts confidence warnings
- dry-run trace anomalies
- human reviewer notes

Forbidden feedback inputs:

- secrets
- API keys
- credentials
- production endpoints
- customer notification payloads
- formal quote outputs
- payment data
- DB records
- raw free text converted directly into pricing rules

## Feedback Output Packet

The feedback proposal packet may contain:

```json
{
  "feedback_packet_id": "placeholder-feedback-001",
  "workflow_run_id": "placeholder-run-001",
  "status": "proposal_only",
  "source_nodes": [],
  "proposed_updates": [],
  "requires_human_review": true,
  "forbidden_direct_mutation": true
}
```

## Proposed Update Types

Allowed proposal types:

- `raw_candidate_source_quality_review`
- `methodspec_scope_note_review`
- `requirement_brief_clarification_needed`
- `quantity_fact_review_needed`
- `output_preview_warning_review`
- `blackboard_status_note`

Forbidden proposal types:

- `direct_pricing_rule_update`
- `direct_budget_estimate_line_update`
- `direct_methodspec_mutation`
- `direct_raw_catalog_publish`
- `direct_renderer_output`
- `direct_customer_notification`
- `direct_db_write`
- `direct_ai_api_call`

## Review Gate

Knowledge Vault feedback must stop at human review.

It may not:

- modify formal rules
- modify MethodSpecCatalog
- create or update PricingRule
- create or update BudgetEstimateLine
- write to DB or Supabase
- call AI API
- publish customer-facing output
- trigger payment or production automation

## Traceability

Every feedback packet must preserve:

- `workflow_run_id`
- source node ids
- source package refs
- review flags
- rejected assumptions
- reviewer-required marker
- blackboard update reference when available

## Escalation

Need Commander:
Yes if feedback would require enabling production runtime, API, DB, payment, AI API, formal pricing, or formal output.

Need Reviewer:
Yes if feedback would be used to change production rules, MethodSpec, formal pricing, renderer behavior, or customer-facing quote output.
