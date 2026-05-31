# Candidate-To-Formal Approval Policy

## Purpose

This policy blocks candidate evidence from becoming formal prices, formal rules, formal material data, formal labor data, or customer-facing budget output without explicit review and human formal-rule approval where required.

## Candidate Evidence

Candidate evidence includes:

- PriceRange candidate.
- Observed price.
- Raw Candidate Warehouse HandoffProposal.
- MethodSpec proposal.
- MaterialSpec proposal.
- UnitConversion proposal.
- Pricing review proposal.
- Output feedback proposal.
- Knowledge Vault return proposal.

Candidate evidence may support review. It must not publish formal budget data.

## Required Path

The only allowed path is:

1. Candidate or proposal artifact is created by its source workstream.
2. Artifact enters Budget Review Gate queue.
3. Reviewer decision is recorded.
4. If approved, artifact may move only to the next review stage.
5. If a formal rule is requested, a human formal-review role must issue `approved_for_formal_rule_by_human`.
6. Formal-rule publishing happens outside this agent's authority and must preserve decision references.

## Blocked Shortcuts

The following shortcuts are forbidden:

- Candidate -> formal price.
- Candidate -> PricingRule.
- Candidate -> MaterialSpec.
- Candidate -> LaborRule.
- Candidate -> BudgetEstimateLine.
- Candidate -> BudgetOutputSnapshot.
- Candidate -> customer quote.
- Output feedback -> price change.
- Raw observed price -> budget engine input.
- AI or RAG proposal -> formal rule.

## Human Formal Approval

`approved_for_formal_rule_by_human` requires:

- Named human formal-review role.
- Clear rationale.
- Source references.
- Confirmed proposal type.
- Explicit statement of the formal rule target.
- Confirmation that this agent did not generate a formal price or rule.

## Decision Separation

`approved_for_next_review` does not mean:

- Formal price approved.
- PricingRule approved.
- MaterialSpec approved.
- LaborRule approved.
- BudgetEstimateLine approved.
- Customer quote approved.

It only means the proposal may continue to the next review step.

## Need Commander

Set `Need Commander: Yes` if a task asks this agent to decide:

- Who can approve formal prices.
- Who can approve customer quotes.
- Whether automated candidate-to-formal conversion is allowed.
- Any business policy for formal approval authority.

## Need Reviewer

Set `Need Reviewer: Yes` if any proposal attempts to become:

- Formal price.
- PricingRule.
- MaterialSpec.
- LaborRule.
- BudgetEstimateLine.
- BudgetOutputSnapshot.
- Customer-facing quote.
