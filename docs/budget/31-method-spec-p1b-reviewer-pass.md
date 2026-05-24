# MethodSpec Validator P1-B Reviewer Pass

## 1. Summary

Phase MS-12 reviewed the MethodSpecCatalog validator P1-B work:

1. MS-11A UnitConversion coverage validator.
2. MS-11B Inclusion / Exclusion scope coverage validator.

Reviewer result: `PASS_WITH_NOTES`.

The P1-B guards are effective and remain inside the Method / Spec Warehouse validator boundary. The notes are due to the repository baseline remaining dirty / untracked, not due to failing demos or a detected boundary violation.

## 2. Scope

Reviewed:

- UnitConversion coverage guard.
- Formula-implied unit conversion detection.
- Active QuoteItemTemplate inclusion / exclusion scope coverage guard.
- Allowed missing scope rule policy.
- MS-5 pricing source guard regression.
- MS-8 LaborRule reference-only guard regression.
- Validation report shape.
- Demo regression results.

Out of scope:

- New validator checks.
- Seed catalog fixes for missing `cm -> m` or `m -> cm`.
- Renderer, Excel, PDF, CSV, HTML, or output system.
- Inclusion / Exclusion propagation to `BudgetOutputSnapshot`.
- Intake, raw warehouse, frontend, preview floor plan, plan-puzzle, RAG, AI API, Skills, DB migration, payment, escrow, or listing fee.
- Budget engine main estimate flow changes.

## 3. Files Reviewed

Documentation:

- `AGENTS.md`
- `docs/NEXT_CODEX_HANDOFF.md`
- `docs/budget/20-method-spec-to-budget-output-boundary.md`
- `docs/budget/27-method-spec-validator-p1b-plan.md`
- `docs/budget/28-method-spec-validator-p1b-implementation.md`
- `docs/budget/30-method-spec-scope-coverage-implementation.md`

Specs validator files:

- `src/lib/budget/specs/types.ts`
- `src/lib/budget/specs/method-spec-policy.ts`
- `src/lib/budget/specs/validate-method-spec-catalog.ts`
- `src/lib/budget/specs/demo-method-spec-validator-p1b.ts`
- `src/lib/budget/specs/demo-method-spec-validator-scope-coverage.ts`

Reviewer governance:

- `AI_RULES/LAIBE_REVIEWER_RULES.md`
- `AI_RULES/TASK_DISPATCH_RULES.md`

## 4. File Ownership Result

`git status --short` shows the repository baseline is still dirty, with many modified, deleted, and untracked paths across:

- `app/`
- `components/`
- `config/`
- `docs/`
- generator scripts
- `src/stitch_laibe_landing_onboarding/`
- `src/lib/budget/`
- preview floor plan files
- templates and other project assets

This means a clean worktree proof is not available.

MS-11A / MS-11B expected implementation files are within specs validator / policy / demo / docs handoff scope:

- `src/lib/budget/specs/method-spec-policy.ts`
- `src/lib/budget/specs/validate-method-spec-catalog.ts`
- `src/lib/budget/specs/demo-method-spec-validator-p1b.ts`
- `src/lib/budget/specs/demo-method-spec-validator-scope-coverage.ts`
- `docs/budget/28-method-spec-validator-p1b-implementation.md`
- `docs/budget/30-method-spec-scope-coverage-implementation.md`
- `docs/NEXT_CODEX_HANDOFF.md`

MS-12 itself only adds this reviewer pass document.

File ownership result: `PASS_WITH_NOTES` because the repo baseline is dirty, but reviewed files and demos show no evidence of renderer / output / intake / raw warehouse / frontend / plan-puzzle / budget engine pricing flow changes for P1-B.

## 5. Boundary Compliance Result

Result: pass.

No boundary violation was found in the reviewed P1-B validator files.

Confirmed:

- `validate-method-spec-catalog.ts` does not import `src/lib/budget/renderers/`.
- `validate-method-spec-catalog.ts` does not import `src/lib/budget/output/`.
- `validate-method-spec-catalog.ts` does not import `src/lib/budget/intake/`.
- `validate-method-spec-catalog.ts` does not import `src/lib/budget/raw-warehouse/`.
- `validate-method-spec-catalog.ts` does not call `generateBudgetEstimate()`.
- `validate-method-spec-catalog.ts` does not call material resolver or renderer functions.
- P1-B checks only push validator `issues`, `allowed_conditions`, and `guard_results`.
- UnitConversion does not recalculate or rewrite quantity.
- InclusionExclusionRule does not propagate to output or renderer.
- InclusionExclusionRule does not add, delete, or rewrite formal quote items.
- InclusionExclusionRule does not change `unit_price`, `amount`, or `quantity`.

The demo files call `generateBudgetEstimate()` only for regression proof that the budget total and line count remain stable. This is acceptable for demo verification and is not part of the validator implementation.

## 6. UnitConversion Coverage Guard Result

Result: pass.

Confirmed:

- `REQUIRED_UNIT_CONVERSION_PAIRS` is centralized in `method-spec-policy.ts`.
- Validator performs coverage / trace validation only.
- Validator does not calculate UnitConversion output.
- Validator does not modify `BudgetEstimateLine.quantity`.
- Validator does not connect UnitConversion into the budget engine.
- Missing conversion is reported as warning, not error.
- Seed catalog remains `valid: true` even though `cm -> m` and `m -> cm` are missing.
- Missing conversion clone detects `missing_required_unit_conversion`.
- Formula-implied conversion detection catches `width_cm / 30.3` as `cm -> 尺` when the seed `cm -> 尺` conversion is removed.

Observed demo result from `demo-method-spec-validator-p1b.ts`:

- Seed catalog: `valid = true`, `warning_count = 2`, `error_count = 0`.
- Missing conversion clone: `valid = true`, `warning_count = 6`.
- Missing required conversion warning count: `3`.
- Missing formula conversion warning count: `3`.
- Invalid pricing clone: `valid = false`.

The two seed warnings are expected P1-B backlog warnings:

- `cm -> m`
- `m -> cm`

These are not blockers because the phase explicitly required not to patch seed catalog and not to turn missing conversion into an error.

## 7. Inclusion / Exclusion Scope Coverage Guard Result

Result: pass.

Confirmed:

- `ALLOWED_MISSING_SCOPE_RULE_ITEM_CODES` is centralized in `method-spec-policy.ts`.
- It is separate from `ALLOWED_UNBOUND_MATERIAL_ITEM_CODES`.
- Active quote items are checked against `InclusionExclusionRule.item_code`.
- Missing non-allowlisted scope rule is reported as warning.
- Missing allowlisted scope rule is reported as allowed condition.
- Missing scope rule does not make the catalog invalid.
- Scope coverage does not propagate to `BudgetOutputSnapshot`.
- Scope coverage does not modify output / renderer behavior.
- InclusionExclusionRule does not add, delete, or rewrite formal work items.
- InclusionExclusionRule does not modify `unit_price`, `amount`, or `quantity`.

Observed demo result from `demo-method-spec-validator-scope-coverage.ts`:

- Seed catalog: `valid = true`, `scope_coverage_guard_result.passed = true`.
- Missing non-allowlisted scope clone: `valid = true`, `missing_inclusion_exclusion_rule_warning_count = 1`.
- Allowed missing scope clone: `valid = true`, `allowed_missing_scope_rule_condition_count = 1`.
- Invalid pricing clone: `valid = false`.

Allowed missing scope items currently include:

- `OTHER_MANAGEMENT_FEE`
- `OTHER_PROTECTION_WORK`
- `OTHER_CLEANING_WORK`

## 8. MS-5 / MS-8 Guard Regression Result

Result: pass.

MS-5 guard regression:

- `ai_generated` pricing source is still blocked by `blocked_pricing_source_type`.
- Invalid pricing clone remains `valid = false`.

MS-8 guard regression:

- `labor_rule` pricing source is still blocked by `labor_rule_used_as_price_source`.
- Active `LaborRule` remains reference-only.
- Invalid labor/pricing clone remains `valid = false`.

Observed:

- `demo-method-spec-validator-p1.ts` invalid labor catalog: `valid = false`, `error_count = 2`.
- `demo-method-spec-validator-p1b.ts` invalid pricing catalog: `blocked_price_errors = 1`, `labor_price_errors = 1`.
- `demo-method-spec-validator-scope-coverage.ts` invalid pricing catalog: `blocked_price_errors = 1`, `labor_price_errors = 1`.

## 9. Validation Report Shape Result

Result: pass.

The validation report still clearly separates:

- `issues`
- `allowed_conditions`
- `guard_results`
- `summary.allowed_condition_count`
- `summary.guard_result_count`

P1-B additions use guard results and existing warning / allowed-condition channels rather than replacing the MS-5 / MS-8 report shape.

Relevant guard results now include:

- `unit_conversion_coverage_guard`
- `pricing_source_type_guard`
- `labor_rule_reference_only_guard`
- `inclusion_exclusion_review_policy_guard`
- `inclusion_exclusion_scope_coverage_guard`
- `unbound_material_allowlist_guard`
- `quote_item_note_coverage_guard`

The seed catalog currently reports:

- `error_count = 0`
- `warning_count = 2`
- `allowed_condition_count = 5`
- `guard_result_count = 7`

## 10. Regression Demo Result

Executed commands:

```powershell
node --experimental-strip-types src/lib/budget/specs/demo-method-spec-warehouse.ts
node --experimental-strip-types src/lib/budget/specs/demo-method-spec-validator-hardening.ts
node --experimental-strip-types src/lib/budget/specs/demo-method-spec-validator-p1.ts
node --experimental-strip-types src/lib/budget/specs/demo-method-spec-validator-p1b.ts
node --experimental-strip-types src/lib/budget/specs/demo-method-spec-validator-scope-coverage.ts
node --experimental-strip-types src/lib/budget/demo-generate-budget.ts
```

Results:

| Demo | Result |
| --- | --- |
| `demo-method-spec-warehouse.ts` | pass; `method_spec_valid = true`, `budget_total_amount = 231103`, `budget_line_count = 12`, `review_required_lines_count = 5` |
| `demo-method-spec-validator-hardening.ts` | pass; seed `valid = true`, invalid clone `valid = false` |
| `demo-method-spec-validator-p1.ts` | pass; seed `valid = true`, invalid labor clone `valid = false`, regression total `231103` |
| `demo-method-spec-validator-p1b.ts` | pass; seed `valid = true`, missing conversion clone `valid = true`, invalid pricing clone `valid = false` |
| `demo-method-spec-validator-scope-coverage.ts` | pass; seed `valid = true`, missing scope clone `valid = true`, allowed missing scope clone `valid = true`, invalid pricing clone `valid = false` |
| `demo-generate-budget.ts` | pass; `total_amount = 231103`, `budget_line_count = 12`, `review_required_line_count = 5` |

Regression expectations are satisfied:

- Seed catalog remains valid.
- Missing UnitConversion warnings do not make seed invalid.
- Missing scope rule warning does not make catalog invalid.
- Allowed missing scope rule does not create error.
- `ai_generated` guard remains effective.
- `labor_rule` guard remains effective.
- Budget total remains `231103`.
- Budget line count remains `12`.
- Review-required line count remains `5`.

## 11. PASS / PASS_WITH_NOTES / FAIL

Reviewer verdict: `PASS_WITH_NOTES`.

Reason:

- P1-B guards are effective.
- Demos pass.
- No boundary violation was found.
- The repo baseline is still dirty / untracked, so clean file ownership proof is unavailable.

No `FAIL` condition was found:

- UnitConversion does not rewrite quantity or enter budget engine.
- Missing conversion remains warning-only.
- InclusionExclusionRule does not propagate to output / renderer.
- Missing scope rule remains warning / allowed-condition only.
- MS-5 and MS-8 pricing guards remain effective.

## 12. Required Fixes

None for MS-12.

Before formal quote / production hardening, future phases may still address:

- Add or intentionally reject `cm -> m` and `m -> cm` seed conversions.
- Decide whether missing non-allowlisted scope rules should become errors in a formal quote phase.
- Move policy constants into catalog-level policy data if multiple catalogs are introduced.

These are backlog items, not blockers for P1-B reviewer pass.

## 13. Recommended Next Phase

Recommended next phase: proceed to MethodSpec validator P2 planning or a focused cleanup / freeze pass.

Suggested next options:

1. P2 planning for unused active `MaterialSpec`, duplicate customer-visible notes, and `NoteTemplate.trade_category` consistency.
2. Clean worktree / file ownership proof before further validator implementation.
3. Formal quote readiness planning that decides which warnings should become errors before a production quote path.

Do not proceed by modifying renderer, output, intake, raw warehouse, frontend, preview floor plan, plan-puzzle, or budget engine pricing flow from this Method / Spec Warehouse thread.
