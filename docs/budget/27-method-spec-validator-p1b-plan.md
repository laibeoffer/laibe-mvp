# Phase MS-10 MethodSpec Validator P1-B Plan

Last planned: 2026-05-23

## 1. Summary

MS-10 is a planning-only phase for MethodSpecCatalog validator P1-B work.

This phase does not implement validator checks, does not modify `src/lib/budget/specs/`, and does not change the budget engine, output system, renderer, intake, raw warehouse, frontend, preview floor plan, or plan-puzzle code.

The goal is to define the next validator-only scope for:

1. UnitConversion coverage for recipe formula units.
2. Active QuoteItemTemplate inclusion / exclusion coverage.

## 2. Current Status

- MS-5 P0 validator guards are complete and passed MS-6.
- MS-8 P1-A validator guards are complete and passed MS-9.
- MS-9 reviewer verdict was `PASS_WITH_NOTES`.
- The MS-9 notes were due to an existing dirty repo baseline, not because the P1-A validator guards failed.
- MS-10 only plans P1-B validator work and does not change code.

## 3. Scope

In scope for this plan:

- UnitConversion coverage for recipe formula units.
- Active QuoteItemTemplate inclusion / exclusion coverage.
- Future validator report shape for the two P1-B checks.
- Future MS-11 file touch list and file ownership guard.

Out of scope:

- Renderer, Excel, PDF, CSV, HTML, or output formatting.
- `src/lib/budget/renderers/`.
- `src/lib/budget/output/`.
- `src/lib/budget/intake/`.
- `src/lib/budget/raw-warehouse/`.
- RAG, AI API, or Skills.
- Frontend, preview floor plan, plan-puzzle, or `plan-puzzle.js`.
- Budget engine main pricing flow.
- Letting LaborRule enter the pricing formula.
- Letting UnitConversion recalculate or rewrite produced quantities.
- Letting MaterialSpec, ItemMaterialBinding, NoteTemplate, or InclusionExclusionRule change `unit_price` or `amount`.

## 4. UnitConversion Coverage Plan

Purpose:

Confirm that unit conversions implied by `MethodRecipe.outputs.quantity_formula` or recipe output units are represented in the `unit_conversions` shelf.

Future validator approach:

- Read `method_recipes`.
- Inspect each recipe output's `quantity_formula`, `quantity_fact_type`, and output `unit`.
- Detect formulas or metadata that imply a conversion, such as `width_cm / 30.3` outputting `尺`.
- Compare the implied conversion pair with `unit_conversions.from_unit` and `unit_conversions.to_unit`.
- If a formula appears to use a conversion that is not defined in `unit_conversions`, report a warning.
- Do not recompute quantity.
- Do not change `BudgetEstimateLine.quantity`.
- Do not modify any recipe formula.
- Treat UnitConversion as coverage and trace validation only.

Initial conversion pairs to check:

- `cm -> 尺`
- `mm -> cm`
- `m2 -> 坪`
- `cm -> m`
- `m -> cm`

Suggested detection hints for a future validator:

- `quantity_formula` contains `cm / 30.3`, `/ 30.3`, or output unit `尺` with a source field ending in `_cm`: implies `cm -> 尺`.
- `quantity_formula` contains `m2`, `floor_area_m2`, or `area_m2`, and output unit is `坪`: implies `m2 -> 坪`.
- `quantity_formula` contains `mm` and output unit is `cm`: implies `mm -> cm`.
- `quantity_formula` contains `/ 100`, `cm_to_m`, or output unit `m` with a source field ending in `_cm`: implies `cm -> m`.
- `quantity_formula` contains `* 100`, `m_to_cm`, or output unit `cm` with a source field ending in `_m`: implies `m -> cm`.

Current seed observation:

- Current seed catalog already defines `cm -> 尺`, `m2 -> 坪`, and `mm -> cm`.
- Current seed catalog does not currently need `cm -> m` or `m -> cm` for the existing mock formulas.
- MS-10 records this gap as future coverage planning only and does not patch seed data.

## 5. Inclusion / Exclusion Coverage Plan

Purpose:

Confirm that each active QuoteItemTemplate has a scope explanation source that can support internal traceability and customer understanding.

Future validator approach:

- Read active `quote_item_templates`.
- Read `inclusion_exclusion_rules`.
- For each active `item_code`, check whether at least one matching `InclusionExclusionRule.item_code` exists.
- If an active item lacks a matching scope rule, report a warning first.
- Do not report an error in the first P1-B implementation unless a later formal-quote phase explicitly upgrades severity.
- Do not propagate inclusion / exclusion into output in this validator phase.
- Do not let InclusionExclusionRule add, remove, or rewrite formal quote items.
- Do not let InclusionExclusionRule change renderer format.

Important distinction:

- The allowed unbound material allowlist is not a scope-rule allowlist.
- An item may be allowed to have no material binding and still need inclusion / exclusion scope coverage.

Future policy option:

- Define a separate `ALLOWED_MISSING_SCOPE_RULE_ITEM_CODES` policy constant.
- This should not reuse `ALLOWED_UNBOUND_MATERIAL_ITEM_CODES`, because material traceability and scope explanation are different concerns.

Items that may temporarily receive lower severity while still remaining reviewer-visible:

- `OTHER_MANAGEMENT_FEE`
- `OTHER_PROTECTION_WORK`
- `OTHER_CLEANING_WORK`

Current seed observation:

- Current seed catalog has inclusion / exclusion rules for all current quote item templates.
- MS-10 does not change seed data.

## 6. Proposed Policy Constants

Future MS-11 may add the following constants to `src/lib/budget/specs/method-spec-policy.ts`:

```ts
export const REQUIRED_UNIT_CONVERSION_PAIRS = [
  { from_unit: "cm", to_unit: "尺" },
  { from_unit: "mm", to_unit: "cm" },
  { from_unit: "m2", to_unit: "坪" },
  { from_unit: "cm", to_unit: "m" },
  { from_unit: "m", to_unit: "cm" },
] as const;

export const ALLOWED_MISSING_SCOPE_RULE_ITEM_CODES = new Set([
  "OTHER_MANAGEMENT_FEE",
  "OTHER_PROTECTION_WORK",
  "OTHER_CLEANING_WORK",
]);
```

These are proposed constants only. MS-10 does not implement them.

## 7. Proposed Validator Report Additions

Future MS-11 may add report-level visibility for:

- `unit_conversion_coverage_result`
- `missing_unit_conversion_warnings`
- `scope_rule_coverage_result`
- `missing_scope_rule_warnings`

Implementation note for MS-11:

- These may be represented as new `guard_results` entries plus warning `issues`, instead of expanding the validation report type more than necessary.
- Any report shape change should preserve existing MS-5 and MS-8 fields:
  - `issues`
  - `allowed_conditions`
  - `guard_results`
  - `summary.allowed_condition_count`
  - `summary.guard_result_count`

MS-10 does not implement these report additions.

## 8. Future MS-11 File Touch List

Allowed for future P1-B implementation:

- `src/lib/budget/specs/method-spec-policy.ts`
- `src/lib/budget/specs/validate-method-spec-catalog.ts`
- `src/lib/budget/specs/demo-method-spec-validator-p1.ts`
- or a new `src/lib/budget/specs/demo-method-spec-validator-p1b.ts`
- `docs/budget/28-method-spec-validator-p1b-implementation.md`
- `docs/NEXT_CODEX_HANDOFF.md`

Forbidden for future P1-B implementation:

- `src/lib/budget/renderers/`
- `src/lib/budget/output/`
- `src/lib/budget/intake/`
- `src/lib/budget/raw-warehouse/`
- frontend files
- preview floor plan files
- plan-puzzle files
- budget engine main pricing flow
- renderer, Excel, PDF, CSV, or HTML output layers

## 9. Clean Worktree / File Ownership Guard

MS-11 should continue the guard discipline from MS-7 and MS-9:

- Record `git status --short` before implementation.
- If the repo baseline is dirty, list existing dirty or untracked paths as "not part of this phase".
- Modify only the MS-11 File Touch List.
- After implementation, list actual modified paths with `git diff --name-only` or equivalent.
- Reviewer should confirm there are no changes in renderer, output, intake, raw warehouse, frontend, preview floor plan, plan-puzzle, or budget engine pricing flow.
- If a clean worktree cannot be proven, reviewer policy should remain `PASS_WITH_NOTES` unless a real boundary violation is found.

## 10. Non-Goals

MS-10 and the future P1-B validator phase do not:

- Execute UnitConversion calculations.
- Modify `BudgetEstimateLine.quantity`.
- Rewrite recipe formulas.
- Propagate InclusionExclusionRule into renderer behavior.
- Create formal quotes.
- Touch RAG, AI API, intake, output, renderer, or frontend.
- Add Excel / PDF behavior.
- Let LaborRule enter the main pricing formula.
- Let MaterialSpec, ItemMaterialBinding, NoteTemplate, or InclusionExclusionRule change `unit_price` or `amount`.

## 11. Reviewer Checklist for Future MS-11

Future MS-11 reviewer should confirm:

- MS-5 blocked pricing source guard remains effective.
- MS-8 LaborRule reference-only guard remains effective.
- UnitConversion coverage is warning-only.
- UnitConversion coverage does not recalculate or rewrite quantities.
- Scope rule coverage is warning-only.
- Scope rule coverage does not change BudgetOutputSnapshot or renderer behavior.
- `demo-generate-budget` total amount remains `231103`.
- Budget line count remains `12`.
- No renderer, output, intake, raw warehouse, frontend, preview floor plan, or plan-puzzle files were modified.

Suggested regression commands for future MS-11 reviewer:

```bash
node --experimental-strip-types src/lib/budget/specs/demo-method-spec-warehouse.ts
node --experimental-strip-types src/lib/budget/specs/demo-method-spec-validator-hardening.ts
node --experimental-strip-types src/lib/budget/specs/demo-method-spec-validator-p1.ts
node --experimental-strip-types src/lib/budget/demo-generate-budget.ts
```

## 12. Recommendation

Recommendation:

- Proceed to MS-11 P1-B implementation after file ownership is recorded.
- If the repo baseline is still dirty, prefer splitting implementation into:
  - MS-11A: UnitConversion coverage.
  - MS-11B: Inclusion / Exclusion scope coverage.
- If a clean branch or strong file ownership proof is available, both P1-B checks can be implemented in one narrow validator-only MS-11 phase.
- Reviewer policy should remain `PASS_WITH_NOTES` when the baseline is dirty but the actual MS-11 file touch list is clean and in scope.
