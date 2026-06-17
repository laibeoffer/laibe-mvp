# A4 Budget Stitching Data Contract Map

This map records the no-runtime data path from master index sheets to future candidate and final budget concepts.

## 1. Contract Path

| Data model | Source | Purpose | Formal output allowed |
|---|---|---|---|
| `StandardWorkItem` | `01_standard_work_item_master` | Candidate work-item identity | No |
| `PriceRange` | `02_price_range_index` | Candidate price evidence | No |
| `TriggerRule` | `03_object_trigger_rules` | Object/action/space trigger | No |
| `BundleRule` | `04_budget_bundle_rules` | Trigger-to-bundle mapping | No |
| `BundleItem` | `05_bundle_items` | Bundle item expansion | No |
| `DependencyRule` | `06_dependency_rules` | Additional candidate items | No |
| `QuantityRule` | `07_quantity_rules` | Candidate quantity source rule | No |
| `PuzzleMapping` | `08_puzzle_mapping` | Plan Puzzle candidate mapping | No |
| `BudgetCandidateLine` | Joined candidate output | Human-review unit | No |
| `HumanReviewSelection` | Human review gate | Scope/quantity/price confirmation | No formal output by itself |
| `FinalBudgetLine` | Future authorized post-review output | Formal line candidate | Only after explicit formal-output authorization |

## 2. Required Joins

Primary joins:

- `laibe_uid`
- `trigger_key`
- `bundle_id`
- `quantity_rule_id`
- `budget_retrieval_key`
- `puzzle_retrieval_key`

Metadata-only joins:

- `pcc_division`
- `pcc_code`
- `pcc_match_status`
- `mapping_id`

## 3. Guarded Transitions

`StandardWorkItem + PriceRange + TriggerRule + BundleRule + BundleItem + DependencyRule + QuantityRule + PuzzleMapping` may produce `BudgetCandidateLine` only.

`BudgetCandidateLine` may produce final output only after:

- human review selection;
- quantity review;
- price review;
- zero/negative price anomaly clearance when applicable;
- formal-output authorization;
- runtime authorization.

None of those gates are opened by this document.
