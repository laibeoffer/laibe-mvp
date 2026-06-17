# A4 Quantity Rules Ingest Contract

Source sheet: `07_quantity_rules`

Rows reviewed: 10.

## 1. Required Columns

- `quantity_rule_id`
- `quantity_source_type`
- `puzzle_anchor_type`
- `default_unit`
- `calculation_method`
- `requires_manual_quantity`
- `notes`

## 2. Required Quantity Rules

- `Q_WALL_AREA`
- `Q_WALL_LENGTH`
- `Q_CABINET_LENGTH`
- `Q_POINT_COUNT`
- `Q_EQUIPMENT_COUNT`
- `Q_ROOM_COUNT`
- `Q_FLOOR_AREA`
- `Q_CEILING_AREA`
- `Q_LUMP_SUM`
- `Q_MANUAL`

## 3. Contract Semantics

Quantity rules define candidate quantity source expectations. They do not authorize production quantity.

Allowed candidate quantity sources:

- User-entered dimensions.
- Reviewed Plan Puzzle object context.
- Reviewed room/object count.
- Manual quantity review.

Forbidden quantity sources:

- UI/SVG/renderer preview geometry.
- `.pc` files without validated extraction.
- Screenshots.
- Unverified Plan Puzzle visual state.
- AI-inferred dimensions.

## 4. Failure State

If a quantity rule requires manual quantity, or a source is missing, the candidate must be `manual_required` or `needs_review`. Do not create formal quantity.
