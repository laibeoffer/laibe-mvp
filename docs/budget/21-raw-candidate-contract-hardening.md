# Raw Candidate Contract Hardening

Phase R1.1 is contract hardening for the Raw Candidate Warehouse. It does not add formal pricing, formal material specs, formal labor rules, renderer output, database migration, RAG, AI API, or real data import.

## 1. Proposal Provenance Contract

Every handoff proposal must preserve the full source chain:

`RawCatalogSource -> RawCatalogItem -> Candidate -> ValidationResult -> ReviewQueueItem -> HandoffProposal`

Each proposal must include:

- `proposal_id`
- `proposal_type`
- `source_id`
- `source_type`
- `source_name`
- `source_reliability`
- `source_date`
- `raw_item_id`
- `candidate_id`
- `review_item_id`
- `validation_status`
- `review_status`
- `reviewer_note`
- `observed_price`
- `currency`
- `unit`
- `formal_price_generated: false`
- `price_authority: "none"`
- `allowed_next_actions`
- `blocked_actions`
- `provenance_trace`

Allowed next actions are limited to:

- `send_to_method_spec_review`
- `send_to_pricing_review`
- `send_to_material_spec_review`
- `keep_as_historical_reference`
- `request_more_info`
- `reject_candidate`

Blocked actions must include:

- `create_formal_pricing_rule`
- `create_budget_estimate_line`
- `overwrite_catalog`
- `publish_without_human_review`
- `render_customer_output`

## 2. Risk Flags Taxonomy

Raw candidates and review queue items use an explicit risk flag taxonomy:

- `missing_unit`
- `missing_price`
- `missing_currency`
- `missing_source_date`
- `low_source_reliability`
- `low_confidence`
- `duplicate_suggested_code`
- `possible_merge_required`
- `price_outlier_high`
- `price_outlier_low`
- `unit_mismatch`
- `ambiguous_name`
- `missing_brand`
- `missing_model`
- `missing_spec`
- `unknown_candidate_type`
- `blocked_negative_price`
- `source_scope_unclear`
- `region_missing`
- `effective_date_missing`
- `manual_review_required`
- `missing_suggested_code`

The validator may add flags during contract checks, and the review queue preserves both classifier and validator flags.

## 3. Observed Price Safety Rules

`observed_price` is source evidence only. It may exist in raw items, candidates, and handoff proposals, but it is never a formal budget price.

The Raw Candidate Warehouse must not output:

- `unit_price`
- `formal_price`
- `approved_price`
- `amount_as_price`
- `pricing_rule_id`
- formal `PricingRule`
- formal `MaterialSpec`
- formal `LaborRule`
- `BudgetEstimateLine`

Every proposal must keep:

- `formal_price_generated: false`
- `price_authority: "none"`

If a proposal contains forbidden formal price fields, the observed price safety validator must report errors.

## 4. Import Boundary Static Guard

The local raw warehouse static guard scans `src/lib/budget/raw-warehouse/` TypeScript files for forbidden imports and boundary keywords.

Forbidden references include renderer/output systems, budget engine calls, method/spec catalog ownership, material resolver, pricing rule approval, RAG/AI, database/Supabase, payment/escrow/listing fee, and floor-plan adapters.

The guard is local-only for now and is not wired into CI.

Demo command:

```bash
node --experimental-strip-types src/lib/budget/raw-warehouse/demo-raw-warehouse-static-guard.ts
```

## 5. Still Forbidden

Raw Candidate Warehouse must not:

- create formal prices.
- create formal `PricingRule`.
- create formal `MaterialSpec`.
- create formal `LaborRule`.
- create `BudgetEstimateLine`.
- call budget engine.
- call renderer / Excel / PDF systems.
- call `BudgetOutputSnapshot` logic.
- call material resolver.
- publish to MethodSpecCatalog.
- overwrite catalog data.
- use RAG or AI API.
- import real data from external systems.
- modify floor-plan or plan-puzzle data.
- touch payment, escrow, or listing fee code.

## 6. Phase R1.1 Non-Goals

This phase does not implement:

- real procurement ingestion.
- human review UI.
- formal database storage.
- formal pricing approval.
- material resolver.
- renderer output.
- Excel or PDF output.
- MethodSpecCatalog edits.
- live vendor, market, or web crawling.

Phase R1.1 only strengthens the local candidate contract and proves that `formal_price_generated` remains `false`.
