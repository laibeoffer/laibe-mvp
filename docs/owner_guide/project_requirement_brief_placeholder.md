# ProjectRequirementBrief Placeholder

## Purpose

`ProjectRequirementBrief placeholder` is a downstream handoff window generated from `OwnerIntent`. It is not a formal estimate basis.

## Required Fields

- `project_requirement_brief_id`
- `owner_intent_id`
- `requirement_context_status`
- `space_requirements`
- `budget_preference`
- `scope_constraints`
- `review_flags`
- `handoff_targets`

## requirement_context_status

Allowed values:

- `placeholder`
- `linked`
- `verified`
- `unavailable`

## Boundary

This object may support plan-puzzle, budget preview, bid preparation, and AI PCM context, but it must not directly trigger formal pricing, formal quote creation, renderer output, MethodSpec mutation, Raw Candidate publication, payment, DB writes, or auth changes.