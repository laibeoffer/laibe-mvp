# A4 BudgetCandidateLine Contract

`BudgetCandidateLine` is the no-runtime handoff unit between trigger/bundle/dependency/quantity matching and human review. It is not `FinalBudgetLine`.

## 1. Required Fields

- `candidate_line_id`
- `project_id`
- `space_id`
- `source_object_id`
- `trigger_key`
- `bundle_id`
- `laibe_uid`
- `budget_retrieval_key`
- `puzzle_retrieval_key`
- `item_name`
- `unit_standard`
- `quantity`
- `quantity_rule_id`
- `quantity_source`
- `price_min`
- `price_max`
- `price_source`
- `selection_status`
- `manual_review_reason`
- `exclude_reason`
- `is_formal_output_allowed`

## 2. Field Rules

`candidate_line_id` must be traceable and deterministic for a candidate generation run. `laibe_uid` joins to standard work item and price evidence. `quantity_rule_id` must come from `07_quantity_rules`.

`quantity` may be blank, provisional, or review-required. It must not be production quantity unless a future authorized quantity gate explicitly upgrades it.

`price_min` and `price_max` are candidate evidence only. `price_source` must identify `02_price_range_index` and review flags.

`is_formal_output_allowed` defaults to false.

## 3. Allowed Use

- Review queue.
- Candidate budget explanation.
- Internal dry candidate packet, if later authorized.
- Human decision support.

## 4. Forbidden Use

- Do not render as formal estimate.
- Do not write Excel/PDF.
- Do not treat as final budget line.
- Do not bypass price review, quantity review, or human selection gate.

## 5. Required Review Reasons

Set `manual_review_reason` when any of these are true:

- `requires_manual_review = 1`
- `zero_price_review`
- `negative_price_review`
- public work mapping is used as metadata
- quantity source is missing, manual, or unverified
- dependency is optional or conditionally required
- item matching is alias/query based
