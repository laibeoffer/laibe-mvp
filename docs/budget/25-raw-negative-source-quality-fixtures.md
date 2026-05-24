# Raw Negative / Source Quality Fixtures

Phase R1.4 adds negative and source-quality fixtures for the Raw Candidate Warehouse.

This phase verifies that dirty records, missing fields, unit conflicts, outlier price evidence, low reliability sources, duplicate rows, and ambiguous names still stay inside the raw candidate layer.

It does not create formal prices, formal catalog records, formal budget lines, formal quote output, or publishing workflows.

## Purpose

R1.3 proved that multiple source types can enter the normal raw warehouse pipeline.

R1.4 proves that problematic source rows can also enter the pipeline without breaking the safety boundary:

```text
RawCatalogSource
-> RawCatalogItem
-> Candidate
-> ValidationResult
-> ReviewQueueItem
-> HandoffProposal
```

Bad data may be flagged, held for more information, blocked, or rejected. It must not be silently treated as clean evidence.

## Fixture Cases

R1.4 includes the following fixture cases:

| Fixture | Expected behavior |
|---|---|
| `missing_source_date` | Adds `missing_source_date` / `effective_date_missing`; held for more information. |
| `missing_currency` | Adds `missing_currency`; held for more information. |
| `missing_unit` | Adds `missing_unit`; held for more information. |
| `blocked_negative_price` | Adds `blocked_negative_price`; blocked and rejected. |
| `price_outlier_high` | Adds `price_outlier_high`; stays evidence only. |
| `price_outlier_low` | Adds `price_outlier_low`; stays evidence only. |
| `unit_mismatch` | Merge policy flags unit mismatch for same suggested code. |
| `same_source_period_duplicate` | Merge policy flags same source/date/vendor duplicate evidence. |
| `brand_model_missing_model` | Adds `missing_model`; remains non-price brand/model evidence. |
| `material_missing_spec` | Adds `missing_spec`; stays evidence only. |
| `low_source_reliability` | Adds `low_source_reliability`; manual review required. |
| `ambiguous_name` | Adds `ambiguous_name`; held for more information. |

## Safety Rules

The same raw warehouse safety rules apply:

- `observed_price` is evidence only.
- `formal_price_generated` must remain `false`.
- `price_authority` must remain `"none"`.
- No formal `PricingRule` is produced.
- No formal `MaterialSpec` is produced.
- No formal `LaborRule` is produced.
- No `BudgetEstimateLine` is produced.
- No formal quote is produced.
- No catalog publishing is performed.

`approved_as_candidate` still only means candidate evidence can move to another review step. It is not formal approval.

## Pipeline Checks

The R1.4 demo runs:

- source collection
- candidate classification
- candidate validation
- review queue creation
- simulated candidate review
- handoff proposal generation
- merge policy checks
- handoff proposal contract validation
- warehouse export safety validation
- observed price safety validation
- raw warehouse static guard

## Expected Demo Shape

Run:

```powershell
node --experimental-strip-types src/lib/budget/raw-warehouse/demo-raw-negative-source-quality-fixtures.ts
```

The demo must produce:

- `needs_more_info_count > 0`
- `blocked_count > 0`
- `rejected_count > 0`
- `proposal_contract_valid: true`
- `warehouse_export_safety_valid: true`
- `observed_price_safety_valid: true`
- `static_guard_valid: true`
- `formal_price_generated: false`
- `price_authority: "none"`
- `formal_pricing_rule_generated: false`
- `formal_budget_line_generated: false`

The risk summary must include the major negative flags:

- `missing_source_date`
- `missing_currency`
- `missing_unit`
- `blocked_negative_price`
- `price_outlier_high`
- `price_outlier_low`
- `unit_mismatch`
- `same_source_period_duplicate`
- `missing_model`
- `missing_spec`
- `low_source_reliability`
- `ambiguous_name`

## Blocked Negative Price Policy

Negative observed price is blocked at candidate validation.

The blocked negative-price candidate must not produce a handoff proposal. This prevents invalid price evidence from being mistaken for usable downstream evidence.

## Non-Goals

R1.4 does not implement:

- Excel parsing
- real source import
- formal storage migration
- live procurement ingestion
- human review UI
- formal catalog publishing
- formal price approval
- formal material or labor catalog creation
- budget line generation
- customer-facing quote output
- output-layer work
- floor-plan wiring

## Next Step

R1.5 can define a source quality scoring policy and a stricter reviewer checklist for candidate evidence. That phase should still remain proposal-only and must not publish formal prices or catalog records.
