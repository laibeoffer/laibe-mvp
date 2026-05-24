# MethodSpec Validator Scope Coverage Implementation

## 1. Summary

Phase MS-11B implements the P1-B validator check for active `QuoteItemTemplate` inclusion / exclusion coverage.

This is validator-only hardening. It checks whether active quote items have a matching `InclusionExclusionRule` so reviewers can see which work items have clear scope language.

It does not propagate inclusion / exclusion data into `BudgetOutputSnapshot`, does not modify the renderer, and does not change price, quantity, amount, or formal work items.

## 2. Scope

In scope:

- Add a formal policy allowlist for items that may temporarily miss scope rules.
- Check active `QuoteItemTemplate` records against `inclusion_exclusion_rules`.
- Report missing non-allowlisted scope rules as warnings.
- Report allowlisted missing scope rules as allowed conditions.
- Add a local demo for seed, missing scope, allowed missing scope, and pricing guard regression.

Out of scope:

- Renderer / Excel / PDF work.
- Output system changes.
- Propagating `InclusionExclusionRule` into `BudgetOutputSnapshot`.
- Budget engine pricing or quantity flow changes.
- Intake / raw warehouse work.
- Frontend, preview floor plan, plan-puzzle, RAG, AI API, Skills, DB migration, payment, escrow, or listing fee.

## 3. File Ownership Guard

Allowed MS-11B touch list:

- `src/lib/budget/specs/method-spec-policy.ts`
- `src/lib/budget/specs/validate-method-spec-catalog.ts`
- `src/lib/budget/specs/demo-method-spec-validator-p1b.ts`
- `docs/budget/28-method-spec-validator-p1b-implementation.md`
- `docs/NEXT_CODEX_HANDOFF.md`

Optional MS-11B additions:

- `src/lib/budget/specs/demo-method-spec-validator-scope-coverage.ts`
- `docs/budget/30-method-spec-scope-coverage-implementation.md`

Actual MS-11B implementation used the specs validator files, a new scope coverage demo, this document, and handoff notes.

The repository baseline was already dirty before MS-11B, so reviewer attribution should use file ownership evidence rather than expecting a clean worktree.

## 4. Inclusion / Exclusion Coverage Rule

The validator now checks:

1. Read active `QuoteItemTemplate` records.
2. Read `InclusionExclusionRule.item_code`.
3. For each active item, confirm a matching scope rule exists.
4. If missing and allowlisted, record an allowed condition.
5. If missing and not allowlisted, record a warning.

Missing scope coverage is never an error in MS-11B. It must not make the seed catalog invalid and must not block mock demos.

The warning code for non-allowlisted gaps is:

- `missing_inclusion_exclusion_rule`

The allowed condition code for allowlisted gaps is:

- `allowed_missing_scope_rule`

## 5. Allowed Missing Scope Rule Item Codes

MS-11B introduces `ALLOWED_MISSING_SCOPE_RULE_ITEM_CODES` as a distinct policy from material binding allowlists.

Initial allowed missing scope rule items:

- `OTHER_MANAGEMENT_FEE`
- `OTHER_PROTECTION_WORK`
- `OTHER_CLEANING_WORK`

This allowlist only affects validator severity. It does not remove the need for reviewer attention before formal quote use.

## 6. Validation Report Changes

The validator adds a guard result:

- `inclusion_exclusion_scope_coverage_guard`

The guard result message exposes:

- `active_quote_item_count`
- `scope_rule_count`
- `missing_scope_rule_count`
- `allowed_missing_scope_rule_count`
- `missing_scope_rule_item_codes`

The report continues to separate:

- `issues`
- `allowed_conditions`
- `guard_results`
- `summary.allowed_condition_count`
- `summary.guard_result_count`

## 7. Demo Results

Demo file:

- `src/lib/budget/specs/demo-method-spec-validator-scope-coverage.ts`

Demo scenarios:

- Seed catalog: should remain valid; scope coverage guard should pass.
- Missing scope clone: removes a non-allowlisted scope rule and should report `missing_inclusion_exclusion_rule` as warning only.
- Allowed missing scope clone: removes an allowlisted scope rule and should report `allowed_missing_scope_rule` as an allowed condition.
- Invalid pricing clone: confirms `ai_generated` and `labor_rule` pricing sources are still blocked as errors.

MS-11B demo result:

- Seed catalog: `valid = true`, `warning_count = 2`, `scope_coverage_guard_result.passed = true`.
- Missing non-allowlisted scope clone: `valid = true`, `missing_inclusion_exclusion_rule_warning_count = 1`.
- Allowed missing scope clone: `valid = true`, `allowed_missing_scope_rule_condition_count = 1`.
- Invalid pricing clone: `valid = false`, `blocked_pricing_source_error_count = 1`, `labor_rule_price_source_error_count = 1`.
- Regression budget: `total_amount = 231103`, `budget_line_count = 12`.

## 8. Regression Checks

MS-11B must preserve:

- MS-5 blocked AI / RAG / candidate pricing source guard.
- MS-8 LaborRule reference-only guard.
- MS-11A UnitConversion coverage warning-only behavior.
- Budget estimate demo total amount and line count.

Expected regression command:

```powershell
node --experimental-strip-types src/lib/budget/demo-generate-budget.ts
```

Expected mock budget result:

- `total_amount = 231103`
- `line_count = 12`

## 9. Out of Scope

MS-11B explicitly does not:

- Recalculate quantity.
- Change `BudgetEstimateLine.quantity`.
- Change `unit_price` or `amount`.
- Add, remove, or rewrite formal quote items.
- Push inclusion / exclusion data into output or renderer.
- Modify `BudgetOutputSnapshot`.
- Modify renderer / Excel / PDF files.
- Modify intake, raw warehouse, frontend, preview floor plan, plan-puzzle, DB, RAG, AI API, payment, escrow, or listing fee logic.

## 10. Remaining Backlog

Future validator or reviewer backlog:

- user-triggered review result for MS-11A + MS-11B combined P1-B guards.
- Decide whether missing scope coverage should remain warning-only for all non-allowlisted items before formal quotes.
- Consider whether `ALLOWED_MISSING_SCOPE_RULE_ITEM_CODES` should move into catalog policy data if multiple catalogs emerge.
- P2 checks such as duplicate customer-visible notes, unused active `MaterialSpec`, and `NoteTemplate.trade_category` consistency.

## 11. Recommendation

MS-11B can proceed to the next User-triggered Review result after demos pass.

The reviewer should verify:

- Scope coverage is warning-only.
- Allowed missing scope rules appear in `allowed_conditions`.
- No renderer / output / intake / frontend / plan-puzzle / budget engine pricing flow was modified.
- Existing pricing source guards and budget regression outputs remain stable.
