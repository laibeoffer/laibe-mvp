# Reviewer Decision Log

## Purpose

This log records review decisions for Budget Review Gate artifacts. It is append-only. It is not a formal price list, not a formal PricingRule catalog, and not a Budget Engine input.

## Append-Only Rules

- Do not delete historical decisions.
- Do not overwrite a rejected or needs-more-info decision.
- If a decision changes, append a new decision with a new `decision_id`.
- Preserve source references for every decision.
- Keep formal-rule approval separate from this agent unless a human formal-review role explicitly records it.

## Decision Table

| decision_id | source_artifact_id | source_agent | proposal_type | decision | reviewer_role | created_at | updated_at | source_refs | rationale |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| TEMPLATE | SOURCE_ARTIFACT_ID | SOURCE_AGENT | price_range_candidate | needs_more_info | budget_review_gate | 2026-05-31T15:20:00Z | 2026-05-31T15:20:00Z | `[]` | Template row only; replace with an appended decision record. |

## Allowed Decision Values

- `approved_for_next_review`
- `rejected`
- `needs_more_info`
- `preserved_as_evidence`
- `approved_for_formal_rule_by_human`

## Formal Rule Warning

Only a human formal-review role may use `approved_for_formal_rule_by_human`. This agent must not use that outcome to generate or publish formal prices, PricingRule, MaterialSpec, LaborRule, BudgetEstimateLine, BudgetOutputSnapshot, or customer quote.
