# Next Step Recommendation Rules

## Output Values

- `continue_requirement_intake`
- `enter_plan_puzzle`
- `enter_budget_preview`
- `prepare_for_bidding`
- `human_assistance`

## Rules

Recommend `continue_requirement_intake` when required fields are missing across property, space, style, budget signal, schedule, or asset state.

Recommend `enter_plan_puzzle` when the owner has or needs a floor plan / layout boundary, or when space requirements cannot be reasoned about without a plan.

Recommend `enter_budget_preview` only when enough non-price requirement context exists for a mock / preview pathway. This is not a formal estimate.

Recommend `prepare_for_bidding` only when owner intent is sufficiently complete and any placeholder context has been reviewed or marked as ready for downstream preparation.

Recommend `human_assistance` when the owner asks for human help, reports unusual constraints, or confidence is too low.

## Forbidden Recommendation Behavior

The rules must not recommend direct formal quote, payment, escrow, listing fee, DB write, production AI API call, or budget engine execution.