# A4 Price Range Index Ingest Contract

Source sheet: `02_price_range_index`

Rows reviewed: 19,212.

## 1. Required Columns

- `laibe_uid`
- `canonical_item_name`
- `class_lv1`
- `class_lv2`
- `unit_standard`
- `price_min`
- `price_max`
- `price_range_status`
- `sample_count`
- `source_time_min`
- `source_time_max`
- `budget_retrieval_key`
- `can_merge_price_range`
- `requires_manual_review`
- `notes`

## 2. Status Counts

| `price_range_status` | Count | Contract meaning |
|---|---:|---|
| `single_or_flat` | 15,625 | Candidate evidence, still not formal price truth |
| `range` | 3,159 | Candidate evidence, still not formal price truth |
| `zero_price_review` | 269 | Review-only anomaly/evidence |
| `negative_price_review` | 159 | Review-only anomaly/evidence |

`requires_manual_review`: 13,058 rows are `1`; 6,154 rows are `0`.

## 3. Price Review Flags

Rows with `zero_price_review` or `negative_price_review` must be represented with these semantics:

- `price_review_required = true`
- `requires_manual_price_review = true`
- `not_formal_price_truth = true`
- `is_formal_output_allowed = false` until manual price review clears the row

## 4. Allowed Use

- Candidate price-range evidence for `BudgetCandidateLine`.
- Review queue surfacing.
- Historical/anomaly evidence.
- Human reviewer decision support.

## 5. Forbidden Use

- Do not treat `price_min` or `price_max` as formal price truth.
- Do not generate `suggested_unit_price` from this contract.
- Do not auto-select `zero_price_review` or `negative_price_review`.
- Do not enter `FinalBudgetLine` without manual price review and final estimate authorization.
- Do not use this sheet to produce formal estimate, production quantity, Excel, or PDF.

## 6. Failure State

If a price row cannot be joined by `laibe_uid` or `budget_retrieval_key`, keep the candidate as `needs_review` or block the specific candidate. Do not infer price through AI.
