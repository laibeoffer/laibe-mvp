# OwnerIntent Contract

## Purpose

`OwnerIntent` is a structured summary of owner renovation intent generated from the Owner Guide question flow. It is an intake contract, not a formal estimate input.

## Required Fields

- `owner_intent_id`
- `session_id`
- `project_id`
- `renovation_goals`
- `property_context`
- `style_preferences`
- `budget_signal`
- `schedule_signal`
- `asset_summary`
- `question_gaps`
- `next_recommended_step`
- `requires_followup`
- `confidence`
- `source_refs`
- `created_at`
- `updated_at`

## Budget Signal Boundary

`budget_signal` may contain unknown, range, ceiling, or needs-assistance signals. It must not contain formal prices, quote lines, `PricingRule`, or `BudgetEstimateLine`.

## Source Refs

`source_refs` must point back to question-answer log entries so downstream reviewers can trace the summary.