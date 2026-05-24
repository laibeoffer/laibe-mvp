# Phase MS-11A MethodSpec Validator P1-B UnitConversion Coverage Implementation

Last updated: 2026-05-23

## 1. Summary

Phase MS-11A implements only the UnitConversion coverage part of the P1-B MethodSpec validator plan.

This phase adds a warning-only validator guard that checks whether `MethodRecipe.outputs[].quantity_formula` or related formula metadata implies unit conversions that are represented in `MethodSpecCatalog.unit_conversions`.

This phase does not implement active QuoteItemTemplate inclusion / exclusion coverage. That remains the MS-11B backlog.

## 2. Scope

In scope:

- Add `REQUIRED_UNIT_CONVERSION_PAIRS` policy constant.
- Add UnitConversion coverage validation to `validateMethodSpecCatalog()`.
- Add formula-implied conversion detection for common formula strings.
- Add warning-only validation issues:
  - `missing_required_unit_conversion`
  - `missing_formula_unit_conversion`
- Add visible `unit_conversion_coverage_guard` result.
- Add a dedicated MS-11A demo.

Out of scope:

- Active QuoteItemTemplate inclusion / exclusion coverage.
- InclusionExclusionRule propagation.
- Renderer / output / Excel / PDF / CSV / HTML.
- `src/lib/budget/renderers/`.
- `src/lib/budget/output/`.
- `src/lib/budget/intake/`.
- `src/lib/budget/raw-warehouse/`.
- Frontend / preview floor plan / plan-puzzle.
- Budget engine main estimate flow.
- RAG / AI API / Skills / DB migration / payment / escrow / listing fee.
- Any use of UnitConversion to recalculate or rewrite `BudgetEstimateLine.quantity`.

## 3. File Ownership Guard

Baseline command:

```powershell
git status --short
```

Baseline result summary:

- The repo was already dirty before MS-11A.
- Existing baseline includes many modified, deleted, and untracked paths across `app/`, `components/`, `config/`, docs, generator files, `src/stitch_laibe_landing_onboarding/`, `src/lib/budget/`, and preview floor plan files.
- These existing dirty / untracked paths are treated as baseline and are not attributed to MS-11A.

MS-11A allowed touch list:

- `src/lib/budget/specs/method-spec-policy.ts`
- `src/lib/budget/specs/validate-method-spec-catalog.ts`
- `src/lib/budget/specs/demo-method-spec-validator-p1b.ts`
- `docs/budget/28-method-spec-validator-p1b-implementation.md`
- `docs/NEXT_CODEX_HANDOFF.md`

MS-11A did not modify:

- `src/lib/budget/renderers/`
- `src/lib/budget/output/`
- `src/lib/budget/intake/`
- `src/lib/budget/raw-warehouse/`
- frontend
- preview floor plan / plan-puzzle
- budget engine main estimate flow

Because the repo baseline is not clean, if the user later requests LAIBE_REVIEWER review, file ownership may remain `PASS_WITH_NOTES` unless clean branch proof is provided.

## 4. UnitConversion Coverage Rule

The validator now checks UnitConversion coverage in two ways:

1. Required conversion pair coverage.
2. Formula-implied conversion coverage.

The rule is warning-only:

- Missing UnitConversion pairs do not make `valid` false.
- Missing UnitConversion pairs create validator warnings.
- No quantity is recalculated.
- No `BudgetEstimateLine.quantity` is rewritten.
- No pricing rule is changed.
- UnitConversion remains a coverage / trace validation shelf, not an engine execution path.

## 5. Required Unit Conversion Pairs

`src/lib/budget/specs/method-spec-policy.ts` now exports:

```ts
REQUIRED_UNIT_CONVERSION_PAIRS
```

Initial required pairs:

- `cm -> 尺`
- `mm -> cm`
- `m2 -> 坪`
- `cm -> m`
- `m -> cm`

Current seed catalog defines:

- `cm -> 尺`
- `m2 -> 坪`
- `mm -> cm`

Current seed catalog does not define:

- `cm -> m`
- `m -> cm`

Those gaps are reported as warnings, not errors.

## 6. Formula-Implied Conversion Detection

The validator uses lightweight formula string detection, not a formal formula parser.

Detected examples:

- `width_cm / 30.3` implies `cm -> 尺`.
- formula or metadata using `m2` with `坪` implies `m2 -> 坪`.
- formula using `mm` and `0.1` or output unit `cm` implies `mm -> cm`.
- formula using `cm_to_m`, `/ 100` with `cm`, or output unit `m` with `_cm` source metadata implies `cm -> m`.
- formula using `m_to_cm`, standalone `m * 100`, or output unit `cm` with `_m` source metadata implies `m -> cm`.

If the implied pair is absent from `unit_conversions`, validator emits:

- severity: `warning`
- code: `missing_formula_unit_conversion`

Current seed formulas imply `cm -> 尺` through `width_cm / 30.3`, and the seed has that conversion, so formula-implied warnings are currently `0` for the seed catalog.

## 7. Validation Report Changes

Validation report shape remains compatible with MS-5 and MS-8:

- `issues`
- `allowed_conditions`
- `guard_results`
- `summary.allowed_condition_count`
- `summary.guard_result_count`

MS-11A adds one guard result:

- `unit_conversion_coverage_guard`

The guard message includes reviewer-visible counts:

- `required_unit_conversion_count`
- `available_unit_conversion_count`
- `missing_unit_conversion_count`
- `formula_conversion_warning_count`

MS-11A does not add new summary fields, avoiding unnecessary type expansion.

## 8. Demo Results

Executed:

```powershell
node --experimental-strip-types src/lib/budget/specs/demo-method-spec-warehouse.ts
node --experimental-strip-types src/lib/budget/specs/demo-method-spec-validator-hardening.ts
node --experimental-strip-types src/lib/budget/specs/demo-method-spec-validator-p1.ts
node --experimental-strip-types src/lib/budget/specs/demo-method-spec-validator-p1b.ts
node --experimental-strip-types src/lib/budget/demo-generate-budget.ts
```

Seed catalog results:

- `valid: true`
- `error_count: 0`
- `warning_count: 2`
- warnings:
  - `missing_required_unit_conversion: cm->m`
  - `missing_required_unit_conversion: m->cm`
- `guard_result_count: 6`
- `unit_conversion_coverage_guard.severity: warning`
- `formula_conversion_warning_count: 0`

Intentionally missing conversion catalog results:

- Removed seed `cm -> 尺` conversion.
- `valid: true`
- `error_count: 0`
- `warning_count: 6`
- `missing_required_unit_conversion_warning_count: 3`
- `missing_formula_unit_conversion_warning_count: 3`
- formula warnings correctly detect:
  - `RECIPE_KITCHEN_ISLAND_BASIC` / `width_cm / 30.3`
  - `RECIPE_WARDROBE_STANDARD` / `width_cm / 30.3`
  - `RECIPE_SHOE_CABINET_STANDARD` / `width_cm / 30.3`

Intentionally invalid pricing catalog results:

- `valid: false`
- `labor_rule` price source is blocked by MS-8 guard.
- `ai_generated` price source is blocked by MS-5 guard.
- UnitConversion warnings remain warnings and do not hide pricing source errors.

## 9. Regression Checks

Regression baseline remains stable:

- `demo-generate-budget.ts` total amount: `231103`
- budget line count: `12`
- review-required line count: `5`

`demo-method-spec-warehouse.ts` remains valid:

- `method_spec_valid: true`
- `budget_total_amount: 231103`
- `budget_line_count: 12`

MS-5 and MS-8 guards remain effective:

- `ai_generated` is still blocked as `blocked_pricing_source_type`.
- `labor_rule` is still blocked as `labor_rule_used_as_price_source`.
- Active `LaborRule` remains reference-only.
- Allowed unbound material items remain allowed conditions, not errors.

## 10. Out of Scope

MS-11A did not:

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
- let UnitConversion recalculate generated quantities.
- let `LaborRule` enter the main pricing formula.
- let `MaterialSpec`, `ItemMaterialBinding`, `NoteTemplate`, or `InclusionExclusionRule` change `unit_price` or `amount`.

## 11. Remaining MS-11B Scope Coverage Backlog

MS-11B should implement active QuoteItemTemplate inclusion / exclusion coverage only if explicitly requested.

Recommended MS-11B behavior:

- Check active quote item templates for matching `InclusionExclusionRule`.
- Report missing scope rule as warning first.
- Do not propagate inclusion / exclusion to output.
- Do not modify renderer.
- Do not alter item generation, quantity, unit price, or amount.

## 12. Recommendation

Recommendation: mark Phase MS-12 / MS-11A as review-ready; LAIBE_REVIEWER runs only if the user explicitly requests review.

MS-12 should verify:

- MS-11A touched only allowed files.
- `unit_conversion_coverage_guard` is warning-only.
- seed catalog remains `valid: true`.
- missing conversion clone remains `valid: true` while surfacing required and formula warnings.
- MS-5 `ai_generated` pricing source guard still fails invalid catalogs.
- MS-8 `labor_rule` pricing source guard still fails invalid catalogs.
- budget total remains `231103`.
- budget line count remains `12`.
- no renderer/output/intake/raw-warehouse/frontend/preview-floor-plan/budget-engine pricing flow was modified by MS-11A.
