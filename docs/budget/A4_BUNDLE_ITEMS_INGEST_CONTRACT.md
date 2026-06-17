# A4 Bundle Items Ingest Contract

Source sheet: `05_bundle_items`

Rows reviewed: 24.

## 1. Required Columns

- `bundle_id`
- `item_seq`
- `item_role`
- `canonical_item_name`
- `work_item_query_key`
- `default_qty`
- `quantity_rule_id`
- `required_level`
- `selection_status_default`
- `linked_source_category`
- `notes`

## 2. Contract Semantics

Bundle items translate a `bundle_id` into candidate work-item searches. They are not final line items until joined to standard work items, price evidence, quantity rules, and human review.

`item_role` may include base, dependency, optional, and repair semantics. `required_level` and `selection_status_default` must be carried into `BudgetCandidateLine.selection_status`.

## 3. Allowed Use

- Search `01_standard_work_item_master` using `work_item_query_key`.
- Attach `quantity_rule_id` and `default_qty` as candidate quantity hints.
- Preserve review status for optional and manual-review items.

## 4. Forbidden Use

- Do not use `default_qty` as production quantity.
- Do not bypass `07_quantity_rules`.
- Do not treat `work_item_query_key` text matching as exact classification truth.

## 5. Failure State

If a bundle item cannot find a candidate work item, keep a review gap. Do not synthesize a standard work item.
