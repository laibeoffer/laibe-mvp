# Raw to MethodSpec Handoff Contract

Phase R1.7 defines how Raw Candidate Warehouse evidence may be handed to MethodSpec Warehouse / Pricing Review.

This contract is docs-only. It does not create MethodSpec records, pricing rules, budget lines, output snapshots, renderer documents, or customer-facing estimates.

## 1. Purpose

Raw Candidate Warehouse may prepare a `HandoffProposal` when candidate evidence has enough traceability for downstream review.

The proposal is a review packet. It is not a formal catalog write.

The downstream reviewer may inspect:

- candidate evidence
- source quality assessment
- review status
- risk flags
- observed price evidence
- requirement context metadata
- plan / SVG context metadata
- provenance trace

## 2. HandoffProposal Required Fields

Every proposal should include:

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
- `source_item_id`
- `suggested_code`
- `suggested_name`
- `unit`
- `observed_price`
- `currency`
- `reason`
- `risk_flags`
- `formal_price_generated: false`
- `price_authority: "none"`
- `allowed_next_actions`
- `blocked_actions`
- `provenance_trace`
- `metadata`

Optional metadata may include:

- `requirement_context_window`
- `plan_context_window`
- `source_quality_assessment_id`
- `source_quality_grade`
- `source_quality_score`
- `package_id`
- `package_version`

## 3. Allowed Next Actions

Allowed next actions describe review routing only. They do not execute the action.

Allowed values may include:

- `send_to_method_spec_review`
- `send_to_pricing_review`
- `send_to_material_spec_review`
- `keep_as_historical_reference`
- `request_more_info`
- `reject_candidate`

These actions mean a reviewer may inspect the proposal and decide whether a later scoped task should convert evidence into a formal record.

## 4. Blocked Actions

Every proposal must block:

- `create_formal_pricing_rule`
- `create_budget_estimate_line`
- `overwrite_catalog`
- `publish_without_human_review`
- `render_customer_output`

The proposal also blocks any direct write to:

- `PricingRule`
- `MaterialSpec`
- `LaborRule`
- `BudgetEstimateLine`
- `BudgetOutputSnapshot`
- renderer / Excel / PDF output
- customer output
- payment / escrow / listing fee
- RAG / AI API
- Supabase / DB / migration
- Plan Puzzle geometry

## 5. Provenance Trace

The `provenance_trace` must preserve the full chain:

```text
RawCatalogSource
-> RawCatalogItem
-> RawCatalogCandidate
-> CandidateValidationResult
-> CatalogReviewItem
-> HandoffProposal
```

At minimum, the trace should include:

- source id, type, name, reliability, and date
- raw item id, row index, raw category, raw name, unit, observed price, amount, currency, date, region, vendor
- candidate id, type, suggested code, suggested name, confidence, review requirement, and risk flags
- validation status, errors, warnings, and risk flags
- review item id, review status, and reviewer note
- proposal id, proposal type, `formal_price_generated`, and `price_authority`

## 6. MethodSpec Review Boundary

MethodSpec Warehouse may read a proposal as evidence for a future scoped review.

MethodSpec Warehouse must not treat the proposal as:

- a ready `MethodSpecCatalog` entry
- a final `MaterialSpec`
- a final `LaborRule`
- a final `PricingRule`
- a final quantity source
- a budget engine input
- a renderer input

Any conversion from proposal to formal MethodSpec / material / labor record requires a separate authorized MethodSpec task and its own validator evidence.

## 7. Pricing Review Boundary

Pricing Review may inspect `observed_price`, source quality, risk flags, and provenance.

Pricing Review must not treat `observed_price` as:

- `unit_price`
- approved price
- formal range
- final budget value
- customer-facing quote

If a reviewer wants to use observed price evidence, the next task must explicitly define a formal review process and keep the deterministic budget engine as the only formal price authority.

## 8. Context Windows

`requirement_context_window` and `plan_context_window` may be included in proposal metadata.

They are review hints only:

- requirement context can explain project, brief, intent, space, or work-scope relevance
- plan context can explain room, zone, area hint, or quantity-source relevance

They cannot approve candidates, generate pricing rules, write budget lines, or create formal quantities.

## 9. Validation Gate

Before handoff, the proposal should pass:

- handoff proposal contract validation
- warehouse export safety validation
- observed price safety validation
- source quality scoring
- raw warehouse static guard

Expected invariant values:

- `formal_price_generated: false`
- `price_authority: "none"`
- `formal_pricing_rule_generated: false`
- `formal_budget_line_generated: false`
- `static_guard_valid: true`

## 10. Integration Readiness

Raw Candidate Warehouse is ready for a MethodSpec / Pricing Review dry-run when:

- every proposal has full provenance
- risk flags are preserved
- context windows are metadata only
- observed price remains evidence only
- blocked actions prevent direct formal publishing
- validators pass
- PR final gate is clean against current `main`

Until then, the handoff remains candidate-only and review-only.
