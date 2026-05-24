# Raw Candidate Warehouse Plan

## 1. Mission

Raw Candidate Warehouse is the raw material procurement and warehouse layer for the LaiBE budget system.

Its job is to collect and preserve source-side evidence, such as historical quotes, material price sheets, vendor quotes, market references, brand/model catalogs, and labor rate sheets. These records are candidates only. They are not official catalog data, not approved method/spec rules, and not formal budget prices.

This warehouse may classify, normalize, validate, and prepare handoff proposals. It must never publish directly into `PricingRule`, `MaterialSpec`, `LaborRule`, `BudgetEstimateLine.unit_price`, Excel/PDF renderers, or formal quotation output.

`formal_price_generated` must always be `false`.

## 2. RawCatalogSource

`RawCatalogSource` represents one captured source bundle.

Required fields:

- `id`: stable source id.
- `source_type`: source category, such as historical quote, material sheet, vendor quote, market price, brand/model catalog, or labor rate sheet.
- `source_name`: human-readable source name.
- `source_owner`: owner or team that captured the source.
- `source_date`: original document or quotation date.
- `captured_at`: when LaiBE captured it.
- `region`: market or project region.
- `currency`: observed currency.
- `source_note`: source-level note.
- `source_reliability`: high, medium, low, or unknown reliability.
- `raw_items`: original rows/items from the source.
- `metadata`: source-specific metadata.

## 3. RawCatalogItem

`RawCatalogItem` represents one raw row or source item.

Required fields:

- `id`: stable raw item id.
- `source_id`: parent source id.
- `row_index`: row order in source.
- `raw_category`: original category text.
- `raw_name`: original item name.
- `raw_brand`: original brand, if any.
- `raw_model`: original model, if any.
- `raw_spec`: original spec text.
- `raw_unit`: original unit.
- `raw_quantity`: observed quantity, if present.
- `raw_unit_price`: observed unit price, if present.
- `raw_amount`: observed amount, if present.
- `raw_currency`: observed currency.
- `raw_note`: row note.
- `raw_text`: full raw text.
- `effective_date`: date this observation applies to.
- `region`: source region.
- `vendor_name`: vendor, if any.
- `metadata`: row-specific metadata.

Raw item fields preserve source evidence. They do not mean LaiBE has approved the data.

## 4. Candidate Types

Classification produces candidate records:

- `HistoricalQuoteLineCandidate`: a line observed in a historical quote.
- `MaterialPriceCandidate`: a material price observation.
- `VendorQuoteCandidate`: a vendor quote reference.
- `MarketPriceCandidate`: a market price reference.
- `BrandModelCandidate`: a brand/model/spec reference.
- `LaborRateCandidate`: a labor rate observation.
- `CatalogNoteCandidate`: a reusable note or method/spec note candidate.
- `UnknownCandidate`: a row that cannot be safely classified.

Each candidate contains:

- source lineage: `candidate_id`, `source_item_id`.
- classification: `candidate_type`, `suggested_code`, `suggested_name`, `trade_category`, `item_category`.
- observed commercial data: `unit`, `observed_price`, `currency`, `brand`, `model`, `spec`, `effective_date`.
- review fields: `confidence`, `requires_human_review`, `reason`, `risk_flags`.

`observed_price` is only an observed price. It is not a formal `unit_price`.

## 5. Review Queue Status

Review queue statuses:

- `pending`: candidate is ready for human review.
- `approved_as_candidate`: human allowed this record to move forward as a candidate reference only.
- `rejected`: invalid or unsafe candidate.
- `needs_more_info`: missing unit, price, code, date, vendor, or other review-critical data.
- `needs_merge`: overlaps an existing known code and should be merged instead of inserted.
- `deprecated`: kept for history but not used for new proposals.

Approval here means "approved as candidate evidence." It does not mean formal pricing approval.

## 6. Price Safety Rules

Raw Candidate Warehouse must follow these rules:

- Candidate price is stored only as `observed_price`.
- Candidate price must not become `BudgetEstimateLine.unit_price`.
- Candidate price must not become a formal `PricingRule`.
- Candidate material rows must not become formal `MaterialSpec`.
- Candidate labor rows must not become formal `LaborRule`.
- Historical quotes, vendor quotes, and market references are evidence only.
- Any price-bearing candidate requires human review.
- `formal_price_generated` must always be `false`.

## 7. Handoff Proposal Rules

`handoff-proposal.ts` may produce proposals for the next warehouse or reviewer:

- `material_candidate_proposal`
- `labor_rate_candidate_proposal`
- `historical_quote_reference_proposal`
- `vendor_quote_reference_proposal`
- `market_price_reference_proposal`
- `merge_proposal`

Handoff proposals are not catalog records. They do not write to MethodSpecCatalog, PricingRule, MaterialSpec, LaborRule, BudgetEstimate, BudgetOutputSnapshot, Excel, or PDF. A proposal only says "this candidate may be reviewed by the next process."

Every proposal must keep `formal_price_generated: false`.

## 8. Automatically Classifiable Data

These records may be rule-classified into candidates:

- Historical quote rows with item name, unit, and observed price.
- Material rows containing material keywords such as board, stone, cement, tile, fixture, or hardware.
- Vendor quote rows with vendor name and price observation.
- Market reference rows with explicit market/reference source.
- Brand/model rows with brand and model but no formal pricing claim.
- Labor rows containing labor role or trade keywords.
- Note rows that are descriptive and non-price-bearing.

Automatic classification only prepares candidates; it does not approve them.

## 9. Human Review Required

Human review is required when:

- A row has any observed price.
- Unit, price, date, vendor, source, or suggested code is missing.
- Source reliability is low or unknown.
- Suggested code overlaps existing catalog data.
- Classification confidence is below the review threshold.
- The item is a market price, vendor quote, or historical quote.
- The candidate could affect future formal pricing, material spec, labor rule, or method/spec decisions.

Unknown candidates must not move forward without review.

## 10. Non-Goals

Raw Candidate Warehouse does not:

- generate formal pricing.
- generate formal material specs.
- generate formal labor rules.
- generate formal budget lines.
- call budget engine.
- call renderer, Excel, or PDF systems.
- call RAG or AI APIs.
- modify floor-plan or plan-puzzle data.
- expand the paused `src/lib/budget/intake/` prototype.

`formal_price_generated` must always be `false`.
