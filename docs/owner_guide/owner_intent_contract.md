# OwnerIntent Contract

Managed by: `SECOND_DEPUTY_COMMANDER`

## Purpose

`OwnerIntent` is a structured summary of owner renovation intent generated from the Owner Guide question flow. It is an intake contract and completion gate context, not a formal estimate input.

## Required Fields

- `owner_intent_id`
- `session_id`
- `project_id`
- `renovation_goals`
- `property_context`
- `space_requirements`
- `style_preferences`
- `budget_signal`
- `schedule_signal`
- `asset_summary`
- `question_gaps`
- `requirement_completion_status`
- `structured_requirement_notes`
- `question_answer_log`
- `answer_revision_log`
- `owner_additional_notes`
- `next_recommended_step`
- `requires_followup`
- `confidence`
- `source_refs`
- `created_at`
- `updated_at`

## Effective Answer Rule

`question_answer_log` in OwnerIntent must include only effective answers. Reverted answers may be present in `answer_revision_log` with `revision_status: reverted`, but they must not remain active in `renovation_goals`, `structured_requirement_notes`, `source_refs`, or next-step recommendations.

## Upload Metadata Rule

`asset_summary` may include:

- `current_plan_files`
- `current_site_photos`
- `style_reference_images`
- `mock_upload_only`
- `has_any_upload_metadata`

These fields are metadata windows only. They do not mean files were uploaded to production storage.

## Completion Rule

Before `requirement_completion_status = completed`, `next_recommended_step` must stay `continue_requirement_intake` and downstream CTAs must stay closed.

## Budget Signal Boundary

`budget_signal` may contain unknown, range, ceiling, or needs-assistance signals. It must not contain formal prices, quote lines, `PricingRule`, or `BudgetEstimateLine`.

## Source Refs

`source_refs` must point back to effective question-answer log entries so downstream reviewers can trace the summary.
