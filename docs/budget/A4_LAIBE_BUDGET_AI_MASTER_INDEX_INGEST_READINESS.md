# A4 LAIBE Budget AI Master Index Ingest Readiness

Task: `A4_CONSUME_AI_MASTER_INDEX_AND_BUILD_INGEST_CONTRACTS_NO_RUNTIME`

Source workbook:
`Z:\08-Jacky\laibe_MVP_project\bugget\清單分類_20260605_0107\_AI_BUDGET_MASTER_INDEX_OUTPUT_20260617_132725\laibe_budget_ai_master_index.xlsx`

A1 verdict consumed: `APPROVED_WITH_MINOR_NOTES_FOR_A4_INGEST_NO_RUNTIME`

This document records no-runtime ingest readiness only. It does not authorize Budget Engine runtime, harness, formal estimate, production quantity, renderer output, Excel, PDF, PR mutation, or `src/**` edits.

## 1. Sheet Inventory

| Sheet | Rows | Ingest role | Status |
|---|---:|---|---|
| `00_manifest` | 15 | Generation manifest and run metadata | Present |
| `01_standard_work_item_master` | 19,212 | Candidate work-item source | Present |
| `02_price_range_index` | 19,212 | Price range evidence and review flags | Present |
| `03_object_trigger_rules` | 12 | Object/action/space trigger rules | Present |
| `04_budget_bundle_rules` | 7 | Trigger-to-bundle rules | Present |
| `05_bundle_items` | 24 | Bundle item expansion rules | Present |
| `06_dependency_rules` | 19 | Dependency candidate rules | Present |
| `07_quantity_rules` | 10 | Quantity-rule identifiers and source types | Present |
| `08_puzzle_mapping` | 8 | Plan Puzzle object-to-trigger mapping | Present |
| `09_ai_alias_index` | 20,638 | Alias/retrieval support | Present |
| `10_material_method_index` | 14 | Method/material index support | Present |
| `11_rejects` | 9 | Excluded evidence only | Present |
| `12_validation_report` | 24 | Workbook validation evidence | Present |
| `13_public_work_mapping` | 67 | Public-work metadata mapping | Present |

External validation: 0 fatal, 0 warning.

## 2. Review Notes Carried Forward

`02_price_range_index` has 269 `zero_price_review` rows and 159 `negative_price_review` rows. These rows must carry `price_review_required`, `requires_manual_price_review`, and `not_formal_price_truth` semantics. They cannot become formal price truth, auto-selected prices, `suggested_unit_price`, formal estimates, or production quantities.

`13_public_work_mapping` is conservative metadata: 59 rows are `division_only`; 8 are `unknown`. Public work code may support audit context, but it is not a budget generation primary key, automatic classification truth, or formal classification verdict.

`11_rejects` rows remain excluded evidence only. They are not standard work items, price candidates, or `BudgetCandidateLine` records.

## 3. Primary Joins

Allowed primary joins for future no-runtime mapping:

- `laibe_uid`
- `trigger_key`
- `bundle_id`
- `quantity_rule_id`
- `budget_retrieval_key`
- `puzzle_retrieval_key`

Forbidden primary joins:

- Public work code as primary Budget Engine key.
- UI labels, SVG ids, renderer preview ids, `.pc` file ids, screenshots, or unverified geometry.
- Reject ids as candidate work-item ids.

## 4. Readiness Judgment

The workbook is ready for no-runtime ingest contract review. It is not yet a runtime Budget Engine source by itself. A4 may treat it as AI/Budget Engine ingest source-of-truth only after contract review and shared-truth gate acceptance.

Result: `MASTER_INDEX_READY_FOR_INGEST_CONTRACT_REVIEW_NO_RUNTIME`
