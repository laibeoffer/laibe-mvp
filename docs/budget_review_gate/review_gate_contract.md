# Review Gate Contract

## Purpose

The Budget Review Gate controls how candidate evidence and proposal artifacts enter review. It prevents candidate data from being treated as formal price, formal rule, formal material data, formal labor data, or customer-facing budget output.

## Accepted Inputs

The gate accepts these proposal types:

- `price_range_candidate`
- `handoff_proposal`
- `method_spec_proposal`
- `material_spec_proposal`
- `unit_conversion_proposal`
- `pricing_review_proposal`
- `output_feedback_proposal`
- `knowledge_vault_return_proposal`

## Gate Responsibilities

- Validate that the source artifact is candidate or proposal evidence only.
- Confirm the source agent and source references are recorded.
- Add the artifact to the review queue.
- Preserve original source context and risk flags.
- Record reviewer decisions using the review decision contract.
- Block direct publication to formal price, PricingRule, MaterialSpec, LaborRule, BudgetEstimateLine, BudgetOutputSnapshot, or customer quote.

## Non-Responsibilities

The review gate does not:

- Clean raw quotes.
- Author MethodSpec content.
- Create or update PricingRule.
- Approve formal prices.
- Generate budget estimates.
- Generate output snapshots.
- Render Excel, PDF, CSV, HTML, or customer documents.
- Connect payment, AI API, DB / Supabase, or n8n runtime.

## Gate States

| State | Meaning | Formal output allowed |
| --- | --- | --- |
| `queued` | Artifact has entered the review queue. | No |
| `under_review` | Reviewer is evaluating the artifact. | No |
| `needs_more_info` | More evidence is required before review can continue. | No |
| `rejected` | Artifact is not accepted for downstream review. | No |
| `preserved_as_evidence` | Artifact remains trace evidence only. | No |
| `approved_for_next_review` | Artifact may move to the next review stage. | No |
| `approved_for_formal_rule_by_human` | A human formal-review role approved the artifact for a formal-rule workflow. | Not by this agent |

`approved_for_next_review` is not formal approval. It only means the item may be reviewed again by the next responsible role.

## Required Gate Checks

Every queued item must include:

- Stable queue id.
- Source artifact id.
- Source agent.
- Proposal type.
- Source references.
- Candidate-only or proposal-only assertion.
- Formalization lock.
- Risk flags.
- Created and updated timestamps.

## Formalization Lock

Every queue item must carry:

```json
{
  "formalization_lock": {
    "formal_price_allowed": false,
    "pricing_rule_publish_allowed": false,
    "material_spec_publish_allowed": false,
    "labor_rule_publish_allowed": false,
    "budget_estimate_line_allowed": false,
    "customer_quote_allowed": false
  }
}
```

Only a separately authorized human formal-rule workflow may change these restrictions, and that change must be recorded as a distinct decision outside this agent's authority.
