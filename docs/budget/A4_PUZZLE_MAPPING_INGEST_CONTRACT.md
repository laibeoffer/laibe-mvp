# A4 Puzzle Mapping Ingest Contract

Source sheet: `08_puzzle_mapping`

Rows reviewed: 8.

## 1. Required Columns

- `puzzle_object_type`
- `action_type`
- `space_type`
- `trigger_key`
- `quantity_rule_id`
- `budget_bundle_id`
- `auto_generate_candidate`
- `requires_human_review`
- `notes`

## 2. Contract Semantics

Plan Puzzle may produce object, space, action, and candidate quantity context. It does not produce formal quantity or formal budget lines.

Allowed outputs:

- Candidate object type.
- Candidate action type.
- Candidate space type.
- Candidate trigger key.
- Candidate bundle id.
- Candidate quantity rule id.

Forbidden outputs:

- Formal quantity.
- Formal estimate.
- Production quantity.
- Budget Engine source-of-truth rows.
- Excel/PDF/rendered quote output.

## 3. Guard Notes

UI, SVG, renderer preview, `.pc`, screenshot, and unverified geometry are not quantity sources. They may only support human review or future authorized extraction work.

## 4. Failure State

If Plan Puzzle mapping is ambiguous, create no final line and surface a review-needed mapping gap.
