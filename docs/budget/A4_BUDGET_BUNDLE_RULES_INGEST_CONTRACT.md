# A4 Budget Bundle Rules Ingest Contract

Source sheet: `04_budget_bundle_rules`

Rows reviewed: 7.

## 1. Required Columns

- `bundle_id`
- `trigger_key`
- `bundle_name`
- `bundle_type`
- `description`
- `default_selection_mode`
- `requires_human_review`
- `notes`

## 2. Contract Semantics

`bundle_id` identifies a candidate bundle generated from a trigger. A bundle is a candidate expansion plan, not a final quote section.

Allowed `default_selection_mode` behavior:

- `default_yes_with_review`: may create candidate lines but must enter human review.
- `manual_review`: may create review-required candidates only.
- Other values must be treated conservatively as review-required until explicitly mapped.

## 3. Allowed Use

- Expand a trigger into candidate work-item groups.
- Preserve bundle type and review requirements.
- Join `05_bundle_items` by `bundle_id`.

## 4. Forbidden Use

- Do not treat a bundle as user-approved scope.
- Do not create formal output from a bundle without human review.
- Do not treat PR #100 candidate metadata as a production adapter for bundle generation.

## 5. Failure State

If a `trigger_key` points to a missing `bundle_id`, stop candidate expansion for that trigger and surface a schema gap.
