# Budget Audit Trail Overview

This overview defines the audit trail surface for the LaiBE budget support system.

The audit trail does not approve prices, generate quotes, or run the budget engine. It records traceability, validation, review, Commander decisions, and forbidden-flow checks around candidate budget artifacts.

## Core Objects

- `AuditEvent`: a normalized record for one lifecycle event.
- `ProvenanceRecord`: where an artifact came from and which upstream artifact produced it.
- `SourceTraceRecord`: source documents, rows, quote references, and confidence notes.
- `ReviewDecisionRecord`: reviewer disposition and constraints.
- `CommanderDecisionRecord`: Deputy Commander / Commander decision and scope.
- `FunctionalAcceptanceRecord`: evidence that a docs / runtime / validator artifact meets its declared scope.
- `ValidationEvidenceRecord`: validator command, result, and artifact references.
- `HandoffLogRecord`: what was handed to the next agent and under what limitations.
- `ForbiddenFlowAudit`: proof that forbidden runtime / pricing / payment / AI / DB flows were not touched.

## Required Audit Events

The audit trail must support at least these event types:

- `raw_data_received`
- `quote_row_normalized`
- `price_observation_generated`
- `price_range_generated`
- `raw_candidate_created`
- `validation_result_created`
- `review_queue_item_created`
- `handoff_proposal_created`
- `method_spec_proposal_reviewed`
- `pricing_rule_proposal_reviewed`
- `budget_input_bundle_created`
- `budget_run_plan_created`
- `budget_output_snapshot_created`
- `output_renderer_preview_created`
- `functional_acceptance_submitted`
- `commander_decision_made`
- `reviewer_decision_made`
- `integration_gate_changed`

## Minimum Audit Fields

Every audit event must include:

- `audit_event_id`
- `event_type`
- `source_agent`
- `source_artifact_id`
- `target_artifact_id`
- `workstream`
- `decision`
- `reviewer_role`
- `commander_decision_ref`
- `validation_evidence_ref`
- `source_refs`
- `created_at`
- `updated_at`
- `blocked_reason`
- `risk_flags`
- `forbidden_scope_check`

## Artifact Status Vocabulary

Use these statuses to avoid confusing proposal evidence with production approval:

- `placeholder`
- `candidate`
- `proposal`
- `review_queue`
- `reviewed`
- `commander_decided`
- `accepted_for_next_step`
- `blocked`
- `not_applicable_docs_only`

## Forbidden Claims

Audit records must not claim:

- formal price approval
- formal quotation approval
- `PricingRule` creation
- `BudgetEstimateLine` creation
- `BudgetOutputSnapshot` production readiness
- real Excel / PDF output
- DB / Supabase persistence
- payment / escrow readiness
- AI API or n8n runtime activation
