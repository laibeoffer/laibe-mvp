# Raw Multi-Source Fixtures

Phase R1.3 expands the Raw Candidate Warehouse fixture set from one manually arranged historical quote source into multiple local sample source types.

This remains a local prototype. It does not parse Excel files, import real records, create database migrations, publish catalog data, generate formal prices, generate formal budget lines, or create formal quote output.

## Purpose

The goal is to prove that different raw source shapes can all enter the same warehouse path:

```text
RawCatalogSource
-> RawCatalogItem
-> Candidate
-> ValidationResult
-> ReviewQueueItem
-> HandoffProposal
```

Every output is still candidate evidence only.

`formal_price_generated` must remain `false`.

`price_authority` must remain `"none"`.

## Fixture Source Types

R1.3 includes five local source fixtures:

| source_type | Purpose | Expected candidate_type |
|---|---|---|
| `historical_quote` | Historical quote rows from past estimate sheets | `historical_quote_line` |
| `material_price_sheet` | Observed material cost rows | `material_price` |
| `vendor_quote` | Supplier quote rows for fixtures or equipment | `vendor_quote` |
| `labor_rate_sheet` | Observed labor cost rows | `labor_rate` |
| `brand_model_catalog` | Brand/model reference rows without price | `brand_model` |

## Sample Coverage

`historical_quote` includes:

- 中島吧檯矮櫃 / 尺 / 3500 / 不含人造石及設備
- 浴室彈性水泥防水 H:240 / 間 / 12000 / 施作兩層

`material_price_sheet` includes:

- E1 系統櫃板材 / 片 / 1800 / E1 等級
- 韓國人造石 / CM / 180 / 依色號調整
- 30x60 壁磚 / 坪 / 2200 / 不含貼工

`vendor_quote` includes:

- TOTO 分離式馬桶 / 組 / 17460 / 型號 CW767CTW
- 國際牌浴室暖風乾燥機 / 組 / 11500 / 220V 無線

`labor_rate_sheet` includes:

- 木工師傅 / 工 / 3500 / 日工
- 水電師傅 / 工 / 3600 / 日工
- 泥作貼磚工 / 坪 / 3000 / 工資不含料

`brand_model_catalog` includes:

- TOTO CW767CTW / 馬桶 / 型號資料 / 不帶價格
- 舞光 9.5cm LED 崁燈 / 燈具 / 型號資料 / 不帶價格
- 國際牌星光面板 / 開關面板 / 型號資料 / 不帶價格

## Price Safety

Rows with prices store those prices as `observed_price` only.

Rows without prices, especially `brand_model_catalog`, must not become price-bearing candidates. The demo checks:

- `brand_model_candidate_count`
- `brand_model_price_bearing_count`

`brand_model_price_bearing_count` must be `0`.

## Required Checks

The multi-source demo runs:

- rule-based classification
- candidate validation
- review queue creation
- simulated `approved_as_candidate`
- handoff proposal generation
- handoff proposal contract validation
- warehouse export safety validation
- observed price safety validation
- raw warehouse static guard

`approved_as_candidate` still means candidate evidence only. It does not mean formal approval, formal catalog publishing, formal price approval, or customer-facing output.

## Demo

Run:

```powershell
node --experimental-strip-types src/lib/budget/raw-warehouse/demo-raw-multi-source-fixtures.ts
```

Expected summary characteristics:

- `source_count: 5`
- `raw_item_count: 13`
- `candidate_count: 13`
- `proposal_contract_valid: true`
- `warehouse_export_safety_valid: true`
- `observed_price_safety_valid: true`
- `static_guard_valid: true`
- `formal_price_generated: false`
- `price_authority: "none"`
- `formal_pricing_rule_generated: false`
- `formal_budget_line_generated: false`
- `brand_model_price_bearing_count: 0`

## Still Forbidden

R1.3 does not allow:

- real data import
- Excel parsing
- formal catalog publishing
- formal `PricingRule`
- formal `MaterialSpec`
- formal `LaborRule`
- formal budget line pricing
- customer-facing quote output
- floor-plan wiring
- output-layer work
- payment, escrow, or listing fee work

## Next Step

The next raw-warehouse step can add negative fixtures and source-quality edge cases, such as missing date, missing currency, duplicate vendor rows, unit mismatch, and outlier price evidence. Those should still remain candidate evidence only.
