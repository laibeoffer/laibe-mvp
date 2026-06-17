# A4 Standard Work Item Master Ingest Contract

Source sheet: `01_standard_work_item_master`

Rows reviewed: 19,212.

## 1. Required Columns

Required columns:

- `laibe_uid`
- `laibe_code`
- `pcc_division`
- `pcc_code`
- `pcc_match_status`
- `class_lv1`
- `class_lv2`
- `canonical_item_name`
- `original_item_name_examples`
- `method_code`
- `object_code`
- `material_code`
- `space_type`
- `action_type`
- `work_item_role`
- `trigger_key`
- `dependency_group`
- `quantity_rule_id`
- `unit_standard`
- `price_min`
- `price_max`
- `sample_count`
- `source_time_min`
- `source_time_max`
- `budget_retrieval_key`
- `puzzle_retrieval_key`
- `is_budget_candidate`
- `is_auto_selectable`
- `requires_manual_review`
- `exclude_reason`

## 2. Key Rules

Primary key: `laibe_uid`.

Fallback lookup keys may include `budget_retrieval_key`, `puzzle_retrieval_key`, `canonical_item_name`, `class_lv1`, `class_lv2`, `trigger_key`, and `quantity_rule_id`, but fallback lookup must not create a formal budget line without human review.

Allowed use:

- Work-item candidate retrieval.
- Candidate item classification support.
- Joining trigger, bundle, dependency, quantity-rule, and price-range records.
- Producing `BudgetCandidateLine` only.

Forbidden use:

- Treating a standard work item as `FinalBudgetLine`.
- Treating `pcc_code` or `pcc_division` as automatic classification truth.
- Treating `price_min` or `price_max` on this sheet as formal quote authority.
- Auto-selecting rows with `requires_manual_review = 1` into final output.

## 3. Validation Rules

- `laibe_uid` must be present and unique.
- Candidate rows must preserve `is_budget_candidate`.
- `quantity_rule_id` must match `07_quantity_rules`.
- `trigger_key`, if present, must match `03_object_trigger_rules`.
- Rows with `exclude_reason` must not generate `BudgetCandidateLine` unless an explicit review policy allows audit-only display.

## 4. Failure State

If key uniqueness, required columns, or join references fail, the ingest path must stop with a schema/data-contract blocker. Do not fallback to AI inference.

## 5. Stitching Relation

This sheet supplies candidate work-item identity. It does not supply final quantity, final price, formal estimate, production quantity, or renderer output.
