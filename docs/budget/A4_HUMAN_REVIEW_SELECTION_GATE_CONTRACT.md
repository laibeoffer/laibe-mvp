# A4 Human Review Selection Gate Contract

The human review gate controls whether a `BudgetCandidateLine` may advance toward final budget output in a future authorized flow.

## 1. `selection_status` Enum

- `auto_selected`
- `needs_review`
- `optional`
- `excluded`
- `manual_required`

## 2. Status Semantics

`auto_selected` means the system may pre-check the candidate for review. It does not mean final output approval.

`needs_review` means a human must confirm scope, quantity, price evidence, or classification.

`optional` means the candidate should be visible but not selected by default unless explicitly chosen.

`excluded` means the candidate must not flow into final output.

`manual_required` means the candidate cannot proceed without explicit human input.

## 3. Gate Rule

Budget output cannot bypass the human review gate. Every candidate line must remain non-formal until a human review step accepts scope, quantity, price handling, and output eligibility.

## 4. Forced Manual Review Conditions

- `zero_price_review`
- `negative_price_review`
- `requires_manual_review = 1`
- Public work mapping used beyond metadata
- Reject-row provenance
- Missing or manual quantity
- Optional/dependency candidates
- Alias-only matching

## 5. Forbidden Use

Do not use this contract to authorize runtime, harness, formal estimate, production quantity, Excel, PDF, or PR mutation.
