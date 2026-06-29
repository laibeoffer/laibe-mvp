# ProjectRequirementBrief Placeholder

Managed by: `SECOND_DEPUTY_COMMANDER`

## Purpose

`ProjectRequirementBrief placeholder` is a downstream handoff window generated from `OwnerIntent`. It is not a formal estimate basis.

## Required Fields

- `project_requirement_brief_id`
- `owner_intent_id`
- `requirement_context_status`
- `requirement_completion_status`
- `space_requirements`
- `budget_preference`
- `scope_constraints`
- `structured_requirement_notes`
- `owner_additional_notes`
- `review_flags`
- `handoff_targets`

## requirement_context_status

Allowed values:

- `placeholder`
- `linked`
- `verified`
- `unavailable`

## completion and CTA Gate

Before `requirement_completion_status = completed`, this placeholder may only hand off to `owner-guide-followup`.

After completion, it may expose handoff targets such as:

- `plan-puzzle`
- `budget-preview`
- `bid-preparation`

## Mock Upload Windows

`space_requirements` may include placeholder metadata for:

- `current_plan_files`
- `current_site_photos`
- `style_reference_images`

These are not production uploads and do not authorize file storage, AI image analysis, or formal design output.

## Boundary

This object may support plan-puzzle, budget preview, bid preparation, and AI PCM context, but it must not directly trigger formal pricing, formal quote creation, renderer output, MethodSpec mutation, Raw Candidate publication, payment, DB writes, upload backend calls, auth changes, or real AI API execution.
