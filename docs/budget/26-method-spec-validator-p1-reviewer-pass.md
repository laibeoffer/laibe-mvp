# Phase MS-9 MethodSpec Validator P1-A User-triggered Review result

Last reviewed: 2026-05-23

## 1. Summary

LAIBE_REVIEWER verdict: **PASS_WITH_NOTES**.

Phase MS-8 P1-A validator implementation satisfies the MethodSpec warehouse boundary. The `LaborRule` reference-only guard is effective, the allowed unbound material allowlist is centralized, MS-5 blocked pricing source guards still work, and regression demos keep the expected deterministic budget total and line count.

The note is file ownership proof: the repo baseline is still dirty with many modified / deleted / untracked files across unrelated areas. The reviewed P1-A code stays inside MethodSpec validator scope, but strict clean-worktree attribution is not possible from the current baseline.

## 2. Scope

This user-triggered review result only reviews Phase MS-8 P1-A:

- `LaborRule` reference-only validator guard.
- allowed unbound material item allowlist formalization.
- MS-5 pricing source guard regression.
- validation report shape.
- regression demos requested for MethodSpec.

Out of scope:

- renderer / Excel / PDF / CSV / HTML.
- `src/lib/budget/renderers/`.
- `src/lib/budget/output/`.
- `src/lib/budget/intake/`.
- `src/lib/budget/raw-warehouse/`.
- frontend / preview floor plan / plan-puzzle.
- budget engine estimate flow changes.
- P1-B checks such as UnitConversion coverage or active QuoteItemTemplate inclusion/exclusion coverage.
- RAG, AI API, Skills, DB migration, payment, escrow, listing fee.

## 3. Files Reviewed

Global / handoff / boundary files:

- `AGENTS.md`
- `AI_RULES/SYSTEM_ARCHITECTURE.md`
- `AI_RULES/ROUTING_RULES.md`
- `AI_RULES/CODEX_MANDATORY_ENTRY.md`
- `AI_RULES/FILE_OWNERSHIP_RULES.md`
- `AI_RULES/REVIEW_CHECKLIST.md`
- `AI_RULES/HANDOFF_RULES.md`
- `AI_RULES/TASK_DISPATCH_RULES.md`
- `AI_RULES/LAIBE_BUILDER_RULES.md`
- `AI_RULES/LAIBE_REVIEWER_RULES.md`
- `AI_RULES/LAIBE_VISUAL_SIM_RULES.md`
- `AI_RULES/LAIBE_WEB_FLOW_BUILDER_RULES.md`
- `AI_RULES/PHASE_REVIEW_RULES.md`
- `docs/NEXT_CODEX_HANDOFF.md`

MethodSpec docs:

- `docs/budget/20-method-spec-to-budget-output-boundary.md`
- `docs/budget/21-method-spec-catalog-inventory-report.md`
- `docs/budget/22-method-spec-validator-hardening.md`
- `docs/budget/23-method-spec-validator-reviewer-pass.md`
- `docs/budget/24-method-spec-validator-p1-plan.md`
- `docs/budget/25-method-spec-validator-p1-implementation.md`

MethodSpec source:

- `src/lib/budget/specs/types.ts`
- `src/lib/budget/specs/method-spec-policy.ts`
- `src/lib/budget/specs/validate-method-spec-catalog.ts`
- `src/lib/budget/specs/demo-method-spec-validator-hardening.ts`
- `src/lib/budget/specs/demo-method-spec-validator-p1.ts`
- `src/lib/budget/specs/build-budget-catalog-from-method-spec.ts`
- `src/lib/budget/specs/seed-method-spec-catalog.ts` for source-code spot checks.

## 4. File Ownership Result

Result: **PASS_WITH_NOTES**.

Baseline command executed:

```powershell
git status --short
```

Baseline result:

- Worktree is not clean.
- Existing dirty / untracked paths include `app/`, `components/`, deleted `config/` docs, generated preview files, `docs/`, `src/lib/budget/`, `src/lib/budget/renderers/`, `src/lib/budget/output/`, `src/lib/budget/intake/`, `src/lib/budget/raw-warehouse/`, and preview floor plan files.
- This dirty baseline prevents strict diff-only proof that every dirty path belongs to a specific prior phase.

MS-8 attributed touch list from handoff and implementation doc:

- `src/lib/budget/specs/validate-method-spec-catalog.ts`
- `docs/NEXT_CODEX_HANDOFF.md`
- `src/lib/budget/specs/method-spec-policy.ts`
- `src/lib/budget/specs/demo-method-spec-validator-p1.ts`
- `docs/budget/25-method-spec-validator-p1-implementation.md`

Targeted status also shows unrelated dirty / untracked prohibited areas already present:

- `src/lib/budget/renderers/`
- `src/lib/budget/output/`
- `src/lib/budget/intake/`
- `src/lib/budget/raw-warehouse/`
- `src/stitch_laibe_landing_onboarding/preview_floor_plan/`
- budget engine files such as `budget-generator.ts`, `quantity-takeoff.ts`, and `recipe-matcher.ts`

Reviewer interpretation:

- No evidence in reviewed MS-8 P1-A code indicates renderer/output/intake/raw-warehouse/frontend/plan-puzzle/budget-engine changes were part of P1-A.
- Because the repo baseline is dirty, this cannot be upgraded to full PASS on file ownership alone.

## 5. Boundary Compliance Result

Result: **PASS_WITH_NOTES**.

The reviewed P1-A implementation stays inside the MethodSpec validator boundary:

- Policy constants are in `src/lib/budget/specs/method-spec-policy.ts`.
- Runtime checks are in `src/lib/budget/specs/validate-method-spec-catalog.ts`.
- Demo coverage is in `src/lib/budget/specs/demo-method-spec-validator-p1.ts`.
- Documentation is in `docs/budget/25-method-spec-validator-p1-implementation.md`.

The reviewed code does not:

- call renderer code.
- modify or call output logistics.
- modify intake or raw candidate warehouse code.
- modify frontend or preview floor plan code.
- connect RAG or AI API.
- touch DB migrations, payment, escrow, or listing fee.
- change the budget engine estimate flow.
- allow `MaterialSpec`, `ItemMaterialBinding`, `NoteTemplate`, or `InclusionExclusionRule` to change `unit_price` or `amount`.

`build-budget-catalog-from-method-spec.ts` still maps active `LaborRule` records into `BudgetCatalog.labor_rates` as reference data. It does not convert `LaborRule` into formal `PricingRule`, and the current `budget-generator.ts` pricing path reads `pricing_rules`, not `labor_rates`.

## 6. LaborRule Reference-Only Guard Result

Result: **PASS**.

`BLOCKED_LABOR_PRICING_SOURCE_TYPES` is centralized in `src/lib/budget/specs/method-spec-policy.ts` and includes:

- `labor_rule`
- `labor_derived`
- `labor_formula`
- `labor_rate`
- `labor_rate_derived`

Validator behavior confirmed:

- If `PricingRule.price_source.type = labor_rule`, validator emits an error.
- The issue code is `labor_rule_used_as_price_source`.
- `labor_rule_reference_only_guard.passed` becomes `false`.
- Seed catalog active `LaborRule` records do not create errors.
- Seed catalog emits an info guard result saying `LaborRule` exists as reference-only data and no `PricingRule` uses labor-derived source type.

This satisfies the requirement that `LaborRule` remains reference-only and does not enter the main estimate formula.

## 7. Allowed Unbound Material Allowlist Result

Result: **PASS**.

`ALLOWED_UNBOUND_MATERIAL_ITEM_CODES` is centralized in `src/lib/budget/specs/method-spec-policy.ts` and includes:

- `ELECTRIC_SOCKET_EXTENSION`
- `ELECTRIC_LIGHTING_INSTALL`
- `OTHER_PROTECTION_WORK`
- `OTHER_CLEANING_WORK`
- `OTHER_MANAGEMENT_FEE`

Validator behavior confirmed:

- These items appear in `allowed_conditions` when they have no `ItemMaterialBinding`.
- They do not create errors.
- Guard result reports allowed unbound item count and item codes.
- Non-allowlisted active items without material binding remain reviewer-visible as warnings through the existing MS-5 behavior.

## 8. MS-5 Guard Regression Result

Result: **PASS**.

`BLOCKED_PRICING_SOURCE_TYPES` remains centralized in `src/lib/budget/specs/method-spec-policy.ts` and includes:

- `raw`
- `candidate`
- `rag`
- `ai`
- `llm`
- `ai_generated`
- `rag_suggested`
- `candidate_import`

Validator behavior confirmed:

- Blocked general pricing source types emit error code `blocked_pricing_source_type`.
- Seed catalog does not false-positive.
- MS-5 hardening demo still catches `ai_generated`.
- P1 demo still catches `ai_generated` while also catching `labor_rule`.

The demo directly exercises `ai_generated`; the full blocked set is verified from the shared policy module used by the runtime guard.

## 9. Validation Report Shape Result

Result: **PASS**.

Report shape remains compatible with MS-5 and clearly separates:

- `issues`
- `allowed_conditions`
- `guard_results`
- `summary.allowed_condition_count`
- `summary.guard_result_count`

Seed catalog currently reports:

- `error_count: 0`
- `warning_count: 0`
- `allowed_condition_count: 5`
- `guard_result_count: 5`

The new labor guard adds one `guard_results` entry without breaking the MS-5 report structure.

## 10. Regression Demo Result

Result: **PASS**.

Executed:

```powershell
node --experimental-strip-types src/lib/budget/specs/demo-method-spec-warehouse.ts
node --experimental-strip-types src/lib/budget/specs/demo-method-spec-validator-hardening.ts
node --experimental-strip-types src/lib/budget/specs/demo-method-spec-validator-p1.ts
node --experimental-strip-types src/lib/budget/demo-generate-budget.ts
```

Observed results:

- `demo-method-spec-warehouse.ts`
  - `method_spec_valid: true`
  - `error_count: 0`
  - `warning_count: 0`
  - `allowed_condition_count: 5`
  - `guard_result_count: 5`
  - `budget_total_amount: 231103`
  - `budget_line_count: 12`
  - `review_required_lines_count: 5`
- `demo-method-spec-validator-hardening.ts`
  - seed catalog `valid: true`
  - intentionally invalid catalog `valid: false`
  - `ai_generated` caught as `blocked_pricing_source_type`
  - non-allowlist missing material binding remains reviewer-visible
  - missing note coverage remains reviewer-visible
- `demo-method-spec-validator-p1.ts`
  - seed catalog `valid: true`
  - invalid labor catalog `valid: false`
  - `labor_rule` caught as `labor_rule_used_as_price_source`
  - `ai_generated` still caught as `blocked_pricing_source_type`
  - regression budget `total_amount: 231103`
  - regression budget line count `12`
- `demo-generate-budget.ts`
  - `total_amount: 231103`
  - budget line count remains `12`
  - review-required line count remains `5`

## 11. PASS / PASS_WITH_NOTES / FAIL

**PASS_WITH_NOTES**

Reason:

- P1-A guard behavior is effective.
- Regression demos passed.
- MS-5 pricing source guard remains effective.
- No reviewed P1-A code crosses into renderer/output/intake/raw-warehouse/frontend/plan-puzzle/budget-engine estimation.
- Note: dirty repo baseline prevents strict clean-worktree file ownership proof.

## 12. Required Fixes

None required for accepting Phase MS-8 P1-A validator implementation.

Before a formal freeze, still recommended:

- Establish clean branch / clean worktree file ownership proof.
- Keep P1-A limited to MethodSpec validator scope.
- Do not allow `LaborRule` to become a formal pricing source without a separate approved phase.

Non-blocking note:

- `buildBudgetCatalogFromMethodSpec()` maps `LaborRule` into `labor_rates` as reference data with `price_source.type = "method_spec_labor_rule"`. Current engine does not use that path for pricing. If a future phase ever promotes labor rates into formal `PricingRule`, a separate validator decision should decide whether `method_spec_labor_rule` must also be blocked or explicitly approved.

## 13. Recommended Next Phase

Recommended next phase: **Phase MS-10 P1-B planning or narrowly scoped P1-B implementation**, but only after the MS-9 reviewer result is accepted.

Suggested next focus:

1. UnitConversion coverage for recipe formula units.
2. Active QuoteItemTemplate inclusion / exclusion coverage.

Conditions before MS-10:

- Record `git status --short` baseline again.
- Keep any MS-10 file touch list inside `src/lib/budget/specs/` and `docs/budget/`.
- Do not modify renderer/output/intake/raw-warehouse/frontend/preview-floor-plan/budget-engine flow.
- Preserve deterministic regression baseline: total amount `231103`, budget line count `12`.
