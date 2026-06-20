# A4 Dependency Rules Ingest Contract

Source sheet: `06_dependency_rules`

Rows reviewed: 19.

## 1. Required Columns

- `dependency_rule_id`
- `trigger_key`
- `condition`
- `generated_item_query_key`
- `generated_item_name`
- `default_qty`
- `quantity_rule_id`
- `required_level`
- `source_price_category`
- `review_status_default`
- `notes`

## 2. Covered Examples

TV wall / media wall dependency coverage:

- Power outlet or dedicated circuit.
- Weak current, HDMI, internet, or TV wiring.
- Optional LED strip or indirect lighting.
- Wall paint/repair and closing work.

Bathroom work dependency coverage:

- Waterproofing.
- Tile and masonry.
- Sanitary equipment.
- Bathroom accessories.
- Plumbing and drainage review.

Demolition repair dependency coverage:

- Demolition candidate.
- Wall/floor repair.
- Cleanup and protection.
- Closing and make-good work after demolition.

## 3. Contract Semantics

Dependency rules generate additional `BudgetCandidateLine` candidates from a trigger. Required dependencies may default to `needs_review` or `default_yes`, but still require human review before final output.

## 4. Allowed Use

- Add required, default, optional, or repair candidates.
- Carry `quantity_rule_id`, `default_qty`, and `review_status_default`.
- Surface missing dependent work in review.

## 5. Forbidden Use

- Do not treat dependency existence as final scope approval.
- Do not infer final quantity or final price.
- Do not turn optional dependencies into selected final output without human review.

## 6. Failure State

If a dependency has missing trigger, missing quantity rule, or no matching work item, keep it as a review/blocker record. Do not silently drop it if it is required.
