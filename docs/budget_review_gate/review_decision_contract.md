# Review Decision Contract

## Purpose

The review decision contract records reviewer outcomes for candidate and proposal artifacts. It is a decision log format, not a formal pricing engine and not a formal catalog publisher.

## Required Fields

| Field | Required | Type | Description |
| --- | --- | --- | --- |
| `decision_id` | Yes | string | Stable id for the decision record. |
| `source_artifact_id` | Yes | string | Id of the reviewed source artifact. |
| `source_agent` | Yes | string | Agent or workstream that produced the artifact. |
| `proposal_type` | Yes | enum | Type of proposal reviewed. |
| `decision` | Yes | enum | Reviewer decision outcome. |
| `reviewer_role` | Yes | string | Role that made the decision. |
| `rationale` | Yes | string | Human-readable reason for the decision. |
| `source_refs` | Yes | array | Evidence references used by the reviewer. |
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

## Decision Enum

- `approved_for_next_review`
- `rejected`
- `needs_more_info`
- `preserved_as_evidence`
- `approved_for_formal_rule_by_human`

## Decision Meanings

### `approved_for_next_review`

The artifact may move to the next review stage. This is not formal price approval and does not publish any formal rule.

### `rejected`

The artifact must not move forward. It may remain trace evidence if needed.

### `needs_more_info`

The artifact lacks required provenance, reviewer context, or safety information.

### `preserved_as_evidence`

The artifact is retained as source evidence only. It must not affect formal price, rules, or output.

### `approved_for_formal_rule_by_human`

Only an explicitly authorized human formal-review role may use this decision. This agent cannot grant it. The decision must include rationale, source references, and the reviewer role responsible for formal-rule authority.

## Invariants

- AI, RAG, raw candidate data, PriceRange, observed price, or output feedback cannot directly become formal price.
- A decision record cannot create `PricingRule`, `MaterialSpec`, `LaborRule`, `BudgetEstimateLine`, or `BudgetOutputSnapshot`.
- Formal-rule approval must be a separate human-governed workflow after this gate.
- The decision log must preserve rejected and needs-more-info outcomes for auditability.
