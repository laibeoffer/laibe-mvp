# Forbidden Direct Publish Flows

## Purpose

This file lists flows that must never bypass Budget Review Gate review.

## Forbidden Flows

| Source | Forbidden direct target | Required handling |
| --- | --- | --- |
| `price_range_candidate` | Formal price | Queue for review; preserve as candidate evidence. |
| `price_range_candidate` | `PricingRule` | Queue for review; require human formal-rule approval outside this agent. |
| `handoff_proposal` | `MaterialSpec` | Queue for review; no direct publish. |
| `handoff_proposal` | `BudgetEstimateLine` | Reject direct publish; preserve source refs. |
| `method_spec_proposal` | Formal MethodSpec catalog entry | Queue for review; MethodSpec owner must handle authoring separately. |
| `material_spec_proposal` | Formal `MaterialSpec` | Queue for review; require owner review and human formal-rule approval where needed. |
| `unit_conversion_proposal` | Runtime quantity rewrite | Queue for review; no direct quantity changes. |
| `pricing_review_proposal` | Formal price update | Queue for review; no direct formal price change. |
| `output_feedback_proposal` | Price or rule update | Queue for review; output feedback cannot set prices. |
| Knowledge Vault return proposal | Formal rule update | Queue for review; no direct publishing. |
| AI or RAG suggestion | Formal price or rule | Reject direct publish; preserve as non-authoritative evidence only. |

## Absolute Blocks

The Budget Review Gate Agent must not create:

- Formal price.
- Formal PricingRule.
- Formal MaterialSpec.
- Formal LaborRule.
- BudgetEstimateLine.
- BudgetOutputSnapshot.
- Customer quote.
- Payment, escrow, or listing fee integration.
- AI API integration.
- DB / Supabase integration.
- n8n runtime integration.

## Violation Response

If a source artifact attempts direct publish:

1. Mark the queue item `rejected` or `needs_more_info`.
2. Record a decision with rationale.
3. Preserve source references.
4. Set `Need Reviewer: Yes` if the artifact touches formal price, PricingRule, MaterialSpec, LaborRule, or BudgetEstimateLine.
5. Set `Need Commander: Yes` only if formal approval authority or business policy must be decided.
