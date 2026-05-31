# Plan Puzzle Quantity Facts Contract

Status: `CONTRACT_ONLY`

GitHub operating path acknowledged: Yes

## Contract Purpose

`PlanPuzzleQuantityFacts` is a placeholder receiving contract for plan-puzzle output. It may help the next workflow understand plan context, but it is not a formal quantity source.

Forbidden interpretation:

- Not a final quantity.
- Not a formal estimate input.
- Not a budget engine price source.
- Not a renderer-ready document.
- Not a construction drawing.

## Identifiers

### `plan_quantity_facts_id`

Purpose: stable identifier for one placeholder facts package.

Format:

```text
plan_quantity_facts_[timestamp_or_short_id]
```

Status window:

- `placeholder`: locally generated mock / draft.
- `linked`: connected to a specific plan draft or SVG artifact.
- `verified`: manually reviewed and accepted as context, still not a formal quantity.

### `svg_artifact_id`

Purpose: identifier for SVG / `.pc` preview artifact.

Format:

```text
svg_artifact_[timestamp_or_short_id]
```

Status window:

- `placeholder`: intended artifact only.
- `linked`: file or runtime preview exists.
- `verified`: preview was checked and linked to the facts package.

### `quantity_context_status`

Allowed values:

- `placeholder`
- `linked`
- `verified`

Rule:

- Default is `placeholder`.
- `verified` may only mean plan-context review. It never means formal quantity, formal price, formal estimate, or renderer approval.

## Receiving Windows

### SVG Window

Fields:

- `svg_artifact_id`
- `artifact_kind`
- `source`
- `status`
- `warnings`

Allowed `status`:

- `placeholder`
- `linked`
- `verified`

### Zone Window

Fields:

- `zone_id`
- `zone_name`
- `zone_type`
- `boundary_edge_ids`
- `status`
- `warnings`

Allowed `status`:

- `placeholder`
- `linked`
- `verified`

### Area Window

Fields:

- `zone_id`
- `area_sqm`
- `area_ping`
- `area_source`
- `area_confidence`
- `status`
- `warnings`

Allowed `status`:

- `placeholder`
- `linked`
- `verified`

Required warning:

- "Zone area is a candidate context signal only and must not be used as formal quantity."

### Wall Length Window

Fields:

- `wall_id`
- `length_mm`
- `thickness_mm`
- `wall_status`
- `status`
- `warnings`

Required warning:

- "Wall length is a candidate context signal only and must not be used as formal quantity."

### Opening Count Window

Fields:

- `opening_id`
- `kind`
- `wall_id`
- `width_mm`
- `height_mm`
- `count`
- `status`
- `warnings`

Required warning:

- "Opening count is a candidate context signal only and must not be used as formal quantity."
