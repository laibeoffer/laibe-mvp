# MethodSpecCatalog Validator Hardening

Last updated: 2026-05-23

## 1. Summary

Phase MS-5 hardens `validateMethodSpecCatalog()` with P0 validator-only checks for the Method / Spec Warehouse.

This phase does not change the budget engine flow, renderer, output system, intake prototype, frontend, floor-plan, RAG, AI API, database migration, payment, escrow, or listing fee code.

The validator now separates:

- `errors`
- `warnings`
- `allowed_conditions`
- `guard_results`

The intent is to make formal pricing and material/spec boundary risks visible before formal quoting, without letting material specs, material bindings, notes, inclusion/exclusion rules, or labor rules change `unit_price` or `amount`.

## 2. P0 Validator Checks

Implemented P0 checks:

1. `PricingRule.price_source.type` runtime guard.
2. Allowed unbound material item allowlist.
3. `InclusionExclusionRule.requires_review` policy visibility as `scope_review`.
4. Active `QuoteItemTemplate` customer note coverage.

These checks are validator-level only. They do not implement output propagation, renderer behavior, or price calculation changes.

## 3. Allowed Unbound Material Item Allowlist

The validator now allows these quote items to have no `ItemMaterialBinding`:

- `ELECTRIC_SOCKET_EXTENSION`
- `ELECTRIC_LIGHTING_INSTALL`
- `OTHER_PROTECTION_WORK`
- `OTHER_CLEANING_WORK`
- `OTHER_MANAGEMENT_FEE`

When these items are unbound:

- They appear in `allowed_conditions`.
- They do not create errors.
- They do not force a fake `material_code`.

If an unbound item is not on the allowlist:

- The validator reports `template_missing_material_binding_not_allowlisted`.
- Current severity is `warning`, so prototype demos can continue.
- Reviewer can still see the gap before formal quote hardening.

## 4. Pricing Source Guard

The validator now blocks these `PricingRule.price_source.type` values:

- `raw`
- `candidate`
- `rag`
- `ai`
- `llm`
- `ai_generated`
- `rag_suggested`
- `candidate_import`

If one is found, the validator reports:

- severity: `error`
- code: `blocked_pricing_source_type`
- guard: `pricing_source_type_guard`
- `valid: false`

This keeps AI, RAG, raw candidate prices, and imported candidate values from becoming formal deterministic prices.

## 5. Review Propagation Policy Status

Phase MS-5 does not implement propagation into `BudgetOutputSnapshot`.

Validator-level status:

- `InclusionExclusionRule.requires_review` is treated as the policy source for `scope_review`.
- If `requires_review` is missing or not boolean at runtime, validator reports `inclusion_exclusion_requires_review_policy_missing`.
- Current seed catalog passes this guard.

Current policy mapping remains:

- `PricingRule.requires_review` -> `price_review`
- `ItemMaterialBinding.requires_review` -> `spec_review`
- `InclusionExclusionRule.requires_review` -> `scope_review`
- recipe-derived review signals -> `formula_review`
- future `NoteTemplate.requires_review` -> `note_review`

## 6. Note Coverage Rule

The validator checks each active `QuoteItemTemplate` has at least one of:

- non-empty `default_notes`
- active customer-visible `NoteTemplate`

If neither exists, the validator reports:

- severity: `warning`
- code: `template_missing_customer_note_coverage`

This does not block the mock demo, but it makes missing customer-facing note coverage visible to reviewers.

## 7. Demo Result

Executed:

```bash
node --experimental-strip-types src/lib/budget/specs/demo-method-spec-warehouse.ts
node --experimental-strip-types src/lib/budget/specs/demo-method-spec-validator-hardening.ts
```

Seed catalog result:

- `valid`: `true`
- `error_count`: `0`
- `warning_count`: `0`
- `allowed_condition_count`: `5`
- `guard_result_count`: `4`
- `pricing_source_type_guard`: passed
- `unbound_material_allowlist_guard`: passed
- `inclusion_exclusion_review_policy_guard`: passed
- `quote_item_note_coverage_guard`: passed

The 5 allowed conditions are the allowed unbound material items:

- `ELECTRIC_SOCKET_EXTENSION`
- `ELECTRIC_LIGHTING_INSTALL`
- `OTHER_PROTECTION_WORK`
- `OTHER_CLEANING_WORK`
- `OTHER_MANAGEMENT_FEE`

Intentionally invalid / risky catalog demo result:

- `valid`: `false`
- `error_count`: `1`
- `warning_count`: `2`
- `allowed_condition_count`: `5`
- `guard_result_count`: `4`

Expected findings were detected:

- `blocked_pricing_source_type` for `ai_generated`
- `template_missing_material_binding_not_allowlisted` for `WOOD_ISLAND_BASE_CABINET`
- `template_missing_customer_note_coverage` for `WOOD_ISLAND_BASE_CABINET`

The intentionally invalid catalog exists only inside `demo-method-spec-validator-hardening.ts`; it does not modify the seed catalog.

## 8. Remaining Validator Backlog

P1 - recommended before formal Excel / PDF:

- Validate every active `QuoteItemTemplate` has an `InclusionExclusionRule`, unless explicitly exempted.
- Validate `UnitConversion` covers recipe formula unit conversions.
- Add `LaborRule` reference-only guard, so labor base rates cannot be mistaken for formal pricing.

P2 - later refinement:

- Warn on unused active `MaterialSpec`.
- Add more detailed material binding completeness by trade and item type.
- Validate `NoteTemplate.trade_category` matches applied item trade category.
- Detect duplicate customer-visible note text after enrichment.
- Validate `MethodRecipe.required_params` are used by output conditions or marked documentation-only.
- Validate `MethodRecipe.review_triggers` are mapped to review policy categories.

## 9. Out of Scope

This phase does not:

- Modify renderer code.
- Modify Excel or PDF behavior.
- Modify `src/lib/budget/renderers/`.
- Modify `src/lib/budget/output/`.
- Modify `src/lib/budget/intake/`.
- Modify frontend code.
- Modify floor-plan / plan-puzzle code.
- Connect RAG.
- Connect AI API.
- Add Skills.
- Add DB migration.
- Touch payment, escrow, listing fee, or fund release.
- Change budget engine estimate flow.
- Put `LaborRule` into the main estimate formula.
- Allow `MaterialSpec`, `ItemMaterialBinding`, `NoteTemplate`, or `InclusionExclusionRule` to change `unit_price` or `amount`.
