# Review Queue Schema

## Purpose

The review queue records candidate and proposal artifacts before any downstream review. It is not a formal catalog, not a price table, not a budget engine input, and not a customer-output source.

## Queue Item Fields

| Field | Required | Type | Description |
| --- | --- | --- | --- |
| `queue_item_id` | Yes | string | Stable id for the review queue item. |
| `source_artifact_id` | Yes | string | Id of the candidate or proposal artifact. |
| `source_agent` | Yes | string | Agent or workstream that produced the source artifact. |
| `proposal_type` | Yes | enum | Type of proposal entering the queue. |
| `status` | Yes | enum | Current review queue state. |
| `candidate_only` | Yes | boolean | Must be true unless the artifact is a pure proposal with no price-like evidence. |
| `source_refs` | Yes | array | GitHub, file, PR, issue, commit, or artifact references. |
| `risk_flags` | Yes | array | Known risk flags that must remain visible. |
| `reviewer_requirements` | Yes | object | Review roles or conditions needed before next stage. |
| `formalization_lock` | Yes | object | Explicit blocked formal-output switches. |
| `payload_summary` | Yes | object | Short, non-authoritative summary of the candidate/proposal. |
| `created_at` | Yes | string | ISO 8601 timestamp. |
| `updated_at` | Yes | string | ISO 8601 timestamp. |

## Proposal Type Enum

- `price_range_candidate`
- `handoff_proposal`
- `method_spec_proposal`
- `material_spec_proposal`
- `unit_conversion_proposal`
- `pricing_review_proposal`
- `output_feedback_proposal`
- `knowledge_vault_return_proposal`

## Status Enum

- `queued`
- `under_review`
- `needs_more_info`
- `rejected`
- `preserved_as_evidence`
- `approved_for_next_review`

`approved_for_formal_rule_by_human` belongs to the review decision contract, not ordinary queue status. Queue status may reference that decision only after the human formal-rule workflow writes an explicit decision record.

## Formalization Lock Fields

| Field | Required value in this queue |
| --- | --- |
| `formal_price_allowed` | `false` |
| `pricing_rule_publish_allowed` | `false` |
| `material_spec_publish_allowed` | `false` |
| `labor_rule_publish_allowed` | `false` |
| `budget_estimate_line_allowed` | `false` |
| `budget_output_snapshot_allowed` | `false` |
| `customer_quote_allowed` | `false` |

## Rejection Triggers

Reject or mark needs-more-info when:

- Source references are missing.
- Source agent is unknown.
- Proposal type is unsupported.
- Candidate evidence contains formal-price claims.
- Candidate evidence attempts to publish PricingRule, MaterialSpec, LaborRule, or BudgetEstimateLine.
- Price-like evidence lacks provenance.
- The artifact tries to bypass review queue.
