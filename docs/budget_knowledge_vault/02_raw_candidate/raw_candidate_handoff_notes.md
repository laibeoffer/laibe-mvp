# Raw Candidate Handoff Notes

## Allowed Handoff

Raw Candidate Warehouse may hand off:

- source identity
- raw item metadata
- normalized candidate labels
- proposal provenance
- review flags
- missing source/unit/currency/spec warnings

## Forbidden Handoff

Raw Candidate Warehouse must not hand off:

- formal price authority
- approved `PricingRule`
- direct `MaterialSpec`
- direct `LaborRule`
- `BudgetEstimateLine.unit_price`
- renderer input
- customer quote data

## Review Notes

Raw candidate evidence can support reviewer decisions and MethodSpec proposals, but it must pass a separate approval path before any formal rule or catalog shelf changes.
