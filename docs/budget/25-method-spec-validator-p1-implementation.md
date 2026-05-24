# Phase MS-8 MethodSpec Validator P1-A Implementation

Last updated: 2026-05-23

## 1. Summary

Phase MS-8 implements only the two approved P1-A MethodSpec validator checks:

1. `LaborRule` reference-only guard.
2. allowed unbound material allowlist formalization.

This phase is validator-only. It does not change budget engine pricing, quantity takeoff, recipe matching, renderer, output logistics, intake, raw candidate warehouse, frontend, preview floor plan, RAG, AI API, DB migration, payment, escrow, or listing fee behavior.

`LaborRule`, `MaterialSpec`, `ItemMaterialBinding`, `NoteTemplate`, and `InclusionExclusionRule` still cannot change `unit_price` or `amount`.

## 2. Scope

In scope:

- Move validator policy constants into a small MethodSpec policy module.
- Add runtime guard for labor-derived `PricingRule.price_source.type`.
- Add visible guard result proving active `LaborRule` records remain reference-only.
- Add P1 demo with seed catalog and intentionally invalid labor-derived pricing source.
- Preserve MS-5 P0 pricing source guard behavior.

Out of scope:

- UnitConversion coverage.
- Active QuoteItemTemplate inclusion / exclusion coverage.
- Output propagation of inclusion/exclusion review flags.
- Renderer / Excel / PDF / CSV / HTML.
- Budget engine estimate flow changes.
- Labor pricing activation.
- Material/labor split pricing.
- RAG / AI API / DB / frontend / plan-puzzle / payment work.

## 3. File Ownership Guard

Baseline command:

```powershell
git status --short
```

Baseline result summary:

- The repo was already dirty before MS-8.
- Existing baseline includes many modified, deleted, and untracked paths across `app/`, `components/`, `config/`, `docs/`, generator files, `src/stitch_laibe_landing_onboarding/`, `src/lib/budget/`, renderer/output/intake/raw-warehouse areas, and preview floor plan files.
- These existing dirty / untracked paths are treated as baseline and not attributed to MS-8.

MS-8 allowed touch list:

- `src/lib/budget/specs/validate-method-spec-catalog.ts`
- `src/lib/budget/specs/method-spec-policy.ts`
- `src/lib/budget/specs/demo-method-spec-validator-p1.ts`
- `docs/budget/25-method-spec-validator-p1-implementation.md`
- `docs/NEXT_CODEX_HANDOFF.md`

MS-8 did not modify:

- `src/lib/budget/renderers/`
- `src/lib/budget/output/`
- `src/lib/budget/intake/`
- `src/lib/budget/raw-warehouse/`
- frontend
- preview floor plan / plan-puzzle
- budget engine main estimate flow

Because the repo baseline is not clean, if the user later requests LAIBE_REVIEWER review, file ownership may remain `PASS_WITH_NOTES` unless clean branch proof is provided.

## 4. LaborRule Reference-Only Guard

Added policy constant:

```ts
BLOCKED_LABOR_PRICING_SOURCE_TYPES
```

Blocked labor-derived `PricingRule.price_source.type` values:

- `labor_rule`
- `labor_derived`
- `labor_formula`
- `labor_rate`
- `labor_rate_derived`

Validator behavior:

- If any `PricingRule.price_source.type` matches the blocked labor-derived set, validator emits:
  - severity: `error`
  - code: `labor_rule_used_as_price_source`
  - guard: `labor_rule_reference_only_guard`
  - `valid: false`
- If active `LaborRule` records exist but no `PricingRule` uses labor-derived source type, validator emits an info guard result:
  - guard: `labor_rule_reference_only_guard`
  - passed: `true`
  - message confirms `LaborRule` exists as reference-only data.

This guard does not:

- modify `buildBudgetCatalogFromMethodSpec()`.
- put `LaborRule` into the main estimate formula.
- change `unit_price`.
- change `amount`.
- create labor pricing.

## 5. Allowed Unbound Material Allowlist Formalization

Added policy constant:

```ts
ALLOWED_UNBOUND_MATERIAL_ITEM_CODES
```

Current allowlist:

- `ELECTRIC_SOCKET_EXTENSION`
- `ELECTRIC_LIGHTING_INSTALL`
- `OTHER_PROTECTION_WORK`
- `OTHER_CLEANING_WORK`
- `OTHER_MANAGEMENT_FEE`

The validator now imports this allowlist from `src/lib/budget/specs/method-spec-policy.ts`.

Validator behavior remains:

- allowlisted unbound items become `allowed_conditions`.
- allowlisted unbound items are not errors.
- non-allowlisted active items without `ItemMaterialBinding` remain visible as warnings.

The guard result message now explicitly shows:

- allowed unbound item count.
- allowed unbound item codes.

## 6. Validation Report Changes

Validation report shape remains compatible with MS-5:

- `issues`
- `allowed_conditions`
- `guard_results`
- `summary.allowed_condition_count`
- `summary.guard_result_count`

MS-8 adds one guard result:

- `labor_rule_reference_only_guard`

Seed catalog guard count is now `5`:

1. `pricing_source_type_guard`
2. `labor_rule_reference_only_guard`
3. `inclusion_exclusion_review_policy_guard`
4. `unbound_material_allowlist_guard`
5. `quote_item_note_coverage_guard`

No `MethodSpecValidationReport` type change was required.

## 7. Demo Results

Executed:

```powershell
node --experimental-strip-types src/lib/budget/specs/demo-method-spec-warehouse.ts
node --experimental-strip-types src/lib/budget/specs/demo-method-spec-validator-hardening.ts
node --experimental-strip-types src/lib/budget/specs/demo-method-spec-validator-p1.ts
node --experimental-strip-types src/lib/budget/demo-generate-budget.ts
```

Seed catalog results:

- `valid: true`
- `error_count: 0`
- `warning_count: 0`
- `allowed_condition_count: 5`
- `guard_result_count: 5`
- `labor_rule_reference_only_guard.passed: true`
- active LaborRule count shown in guard result: `6`
- allowed unbound material item count shown in guard result: `5`

Intentionally invalid P1 catalog results:

- `valid: false`
- `error_count: 2`
- `warning_count: 0`
- `labor_rule_used_as_price_source` detected for `labor_rule`.
- MS-5 `blocked_pricing_source_type` still detected for `ai_generated`.
- `labor_rule_reference_only_guard.passed: false`
- `pricing_source_type_guard.passed: false`

## 8. Regression Checks

Regression baseline remains stable:

- `demo-generate-budget.ts` total amount: `231103`
- budget line count: `12`
- review-required line count: `5`

`demo-method-spec-warehouse.ts` remains valid:

- `method_spec_valid: true`
- `budget_total_amount: 231103`
- `budget_line_count: 12`

MS-5 hardening demo remains valid:

- seed catalog `valid: true`
- intentionally invalid catalog `valid: false`
- `ai_generated` still blocked as `blocked_pricing_source_type`

## 9. Out of Scope

MS-8 did not:

- implement UnitConversion coverage.
- implement active QuoteItemTemplate inclusion / exclusion coverage.
- modify renderer.
- modify Excel / PDF / CSV / HTML output.
- modify `src/lib/budget/output/`.
- modify `src/lib/budget/intake/`.
- modify `src/lib/budget/raw-warehouse/`.
- modify frontend.
- modify preview floor plan or plan-puzzle.
- connect RAG.
- connect AI API.
- add Skills.
- add DB migration.
- touch payment / escrow / listing fee.
- change budget engine estimate flow.
- let `LaborRule` enter the main pricing formula.
- let `MaterialSpec`, `ItemMaterialBinding`, `NoteTemplate`, or `InclusionExclusionRule` change `unit_price` or `amount`.

## 10. Remaining P1-B / P2 Backlog

P1-B:

- UnitConversion coverage.
- active QuoteItemTemplate inclusion / exclusion coverage.

P2:

- unused active `MaterialSpec`.
- duplicate customer-visible notes.
- `NoteTemplate.trade_category` consistency.
- `MethodRecipe.required_params` / `review_triggers` policy mapping.
- duplicate enriched note detection.
- item-type-level material binding completeness.

## 11. Recommendation

Recommendation: mark Phase MS-9 as review-ready; LAIBE_REVIEWER runs only if the user explicitly requests review.

MS-9 should verify:

- MS-8 touched only allowed files.
- `labor_rule_used_as_price_source` is an error.
- seed catalog remains valid.
- MS-5 pricing source guard still blocks `ai_generated`.
- allowed unbound material items remain allowed conditions, not errors.
- budget total and line count remain stable.
- no renderer/output/intake/raw-warehouse/frontend/preview-floor-plan/budget-engine scope was modified by MS-8.
