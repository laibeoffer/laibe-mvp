# A4 Master Index Price Review Policy

Source sheet: `02_price_range_index`

## 1. Review Counts

| Review state | Count | Policy |
|---|---:|---|
| `zero_price_review` | 269 | Review-only; not formal price truth |
| `negative_price_review` | 159 | Review-only; not formal price truth |

## 2. Required Flags

Rows in either review state must carry these semantics:

- `price_review_required = true`
- `requires_manual_price_review = true`
- `not_formal_price_truth = true`
- `is_formal_output_allowed = false`

## 3. Allowed Use

- Historical/anomaly evidence.
- Review queue surfacing.
- Human reviewer context.
- Candidate-line warning.

## 4. Forbidden Use

- Cannot become formal price truth.
- Cannot auto-select as `suggested_unit_price`.
- Cannot enter `FinalBudgetLine` without manual price review.
- Cannot be used for formal estimate, production quantity, Excel, PDF, or renderer output.

## 5. Candidate Handling

If a candidate line joins to `zero_price_review` or `negative_price_review`, set:

- `selection_status = manual_required`
- `manual_review_reason` includes the price review state
- `price_source = 02_price_range_index`
- `is_formal_output_allowed = false`
