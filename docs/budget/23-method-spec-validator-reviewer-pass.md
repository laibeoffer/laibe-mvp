# Phase MS-6 MethodSpecCatalog Validator User-triggered Review result

Last reviewed: 2026-05-23

## 1. Summary

LAIBE_REVIEWER verdict: **PASS_WITH_NOTES**.

Phase MS-5 validator-only hardening satisfies the MethodSpec warehouse boundary. The P0 guards are visible in the validation report, seed catalog validation remains valid, the intentionally risky demo catalog is rejected, and the deterministic budget demo still produces the expected total and line count.

The only note is worktree attribution: the current repo contains pre-existing dirty and untracked files across multiple budget areas, including output, renderers, intake, and preview floor plan paths. This user-triggered review result did not modify those areas, and the reviewed MethodSpec validator code does not call into those areas, but a strict git-status-only proof of MS-5 file ownership is not possible from this dirty baseline.

## 2. Scope

This user-triggered review result only reviewed Phase MS-5 MethodSpecCatalog validator hardening.

In scope:

- MethodSpecCatalog validation report shape.
- Pricing source guard.
- Allowed unbound material allowlist.
- Inclusion / Exclusion review policy visibility.
- Active QuoteItemTemplate note coverage.
- Regression demos requested by the task.

Out of scope:

- Renderer / Excel / PDF work.
- `src/lib/budget/renderers/`.
- `src/lib/budget/output/` implementation changes.
- `src/lib/budget/intake/`.
- Frontend and preview floor plan work.
- Budget engine pricing flow changes.
- RAG, AI API, Skills, DB migration, payment, escrow, listing fee.

## 3. Files Reviewed

- `docs/NEXT_CODEX_HANDOFF.md`
- `docs/budget/14-method-spec-warehouse.md`
- `docs/budget/20-method-spec-to-budget-output-boundary.md`
- `docs/budget/21-method-spec-catalog-inventory-report.md`
- `docs/budget/22-method-spec-validator-hardening.md`
- `src/lib/budget/specs/types.ts`
- `src/lib/budget/specs/validate-method-spec-catalog.ts`
- `src/lib/budget/specs/demo-method-spec-warehouse.ts`
- `src/lib/budget/specs/demo-method-spec-validator-hardening.ts`
- `src/lib/budget/specs/build-budget-catalog-from-method-spec.ts`
- `src/lib/budget/demo-generate-budget.ts`

## 4. Boundary Compliance Result

Result: **PASS_WITH_NOTES**.

MS-5 intended scope is consistent with validator-only hardening:

- Modified / relevant MethodSpec files:
  - `src/lib/budget/specs/types.ts`
  - `src/lib/budget/specs/validate-method-spec-catalog.ts`
  - `docs/NEXT_CODEX_HANDOFF.md`
- Added MS-5 support files:
  - `src/lib/budget/specs/demo-method-spec-validator-hardening.ts`
  - `docs/budget/22-method-spec-validator-hardening.md`

The reviewed validator code stays within `src/lib/budget/specs/` responsibilities. It does not call renderer code, output logistics code, intake code, frontend code, preview floor plan code, RAG, AI API, or DB code. It does not alter the budget engine estimate flow.

The current worktree has unrelated existing dirty / untracked files in areas outside MethodSpec, including budget output, renderers, intake, and preview floor plan paths. No MS-6 code changes were made to those areas. The note is recorded because the dirty baseline prevents a clean diff-only ownership proof.

## 5. Pricing Source Guard Result

Result: **PASS**.

The validator blocks these pricing source types:

- `raw`
- `candidate`
- `rag`
- `ai`
- `llm`
- `ai_generated`
- `rag_suggested`
- `candidate_import`

Blocked pricing sources are emitted as validation errors with code `blocked_pricing_source_type`. They are not downgraded to warnings.

Seed catalog result:

- `valid: true`
- No false positive pricing source errors.
- `pricing_source_type_guard.passed: true`

Intentionally invalid catalog result:

- `valid: false`
- `ai_generated` was caught as an error.
- Guard result shows `pricing_source_type_guard.passed: false`.

## 6. Allowed Unbound Material Allowlist Result

Result: **PASS**.

The allowlist covers the expected non-material-bound items:

- `ELECTRIC_SOCKET_EXTENSION`
- `ELECTRIC_LIGHTING_INSTALL`
- `OTHER_PROTECTION_WORK`
- `OTHER_CLEANING_WORK`
- `OTHER_MANAGEMENT_FEE`

When these active quote items have no material binding, the validator records them in `allowed_conditions` instead of reporting errors.

The intentionally invalid catalog removed the material binding from `WOOD_ISLAND_BASE_CABINET`, which is not in the allowlist. The validator made the missing binding visible with warning code `template_missing_material_binding_not_allowlisted`.

## 7. Review Propagation Policy Visibility Result

Result: **PASS**.

The validator makes `InclusionExclusionRule.requires_review` visible through `inclusion_exclusion_review_policy_guard`.

Current behavior is correctly limited to validator-level policy visibility:

- `requires_review: true` inclusion / exclusion rules are visible as scope-review references.
- Missing or non-boolean `requires_review` is reportable.
- No propagation into `BudgetOutputSnapshot` is implemented in this phase.
- No output system code was modified.

This matches the MS-6 boundary: reviewer visibility only, no downstream propagation.

## 8. Note Coverage Result

Result: **PASS**.

The validator checks active quote item note coverage through:

- `QuoteItemTemplate.default_notes`, or
- active customer-visible `NoteTemplate`, or
- another traceable note source supported by the current catalog shape.

Seed catalog result:

- No note coverage warnings.
- `quote_item_note_coverage_guard.passed: true`.

Intentionally invalid catalog result:

- Missing note coverage for `WOOD_ISLAND_BASE_CABINET` is reported as warning code `template_missing_customer_note_coverage`.
- The warning does not break seed catalog demos.

## 9. Validation Report Shape Result

Result: **PASS**.

The report shape clearly separates:

- `issues`
- `allowed_conditions`
- `guard_results`
- `summary.allowed_condition_count`
- `summary.guard_result_count`

The demo output confirms:

- Seed report has `allowed_condition_count: 5`.
- Seed report has `guard_result_count: 4`.
- Invalid clone report has errors and warnings separated from allowed conditions.

The current shape is adequate for reviewer use and does not require renderer or output system changes.

## 10. Regression Demo Result

Result: **PASS**.

Executed:

```powershell
node --experimental-strip-types src/lib/budget/specs/demo-method-spec-warehouse.ts
node --experimental-strip-types src/lib/budget/specs/demo-method-spec-validator-hardening.ts
node --experimental-strip-types src/lib/budget/demo-generate-budget.ts
```

Observed key results:

- `demo-method-spec-warehouse.ts`
  - `method_spec_valid: true`
  - `error_count: 0`
  - `warning_count: 0`
  - `allowed_condition_count: 5`
  - `guard_result_count: 4`
  - `budget_total_amount: 231103`
  - `budget_line_count: 12`
- `demo-method-spec-validator-hardening.ts`
  - Seed catalog `valid: true`
  - Intentionally invalid catalog `valid: false`
  - `ai_generated` caught by `blocked_pricing_source_type`
  - Non-allowlist missing material binding is visible
  - Missing note coverage is visible
- `demo-generate-budget.ts`
  - `total_amount: 231103`
  - budget line count remains `12`
  - review-required line count remains `5`

## 11. PASS / PASS_WITH_NOTES / FAIL

**PASS_WITH_NOTES**

Reason:

- P0 validator guards are effective.
- Seed catalog remains valid.
- Risky catalog clone is rejected or warned as expected.
- Regression budget amount and line count are stable.
- No reviewed validator code crosses into renderer, output, intake, frontend, preview floor plan, or budget engine estimation flow.
- Note: current dirty worktree prevents strict diff-only attribution for prior phase changes.

## 12. Required Fixes

None required for accepting MS-5 validator-only hardening.

Before a formal phase freeze or production quote workflow, recommended cleanup:

- Review from a clean branch or clean worktree so file ownership can be proven by diff.
- Keep the current P0 validator behavior locked before adding P1 checks.
- Do not move LaborRule into the main pricing formula without a separate approved phase.

## 13. Recommended Next Phase

Recommended next phase: **Phase MS-7: MethodSpec validator P1 planning / backlog implementation plan**.

Suggested MS-7 focus:

- LaborRule reference-only guard.
- UnitConversion coverage for recipe formula units.
- Active QuoteItemTemplate inclusion / exclusion rule coverage.
- Allowed unbound material allowlist formalization in docs and validator constants.

Renderer, Excel / PDF, output formatting, intake, preview floor plan, and frontend work should remain outside this MethodSpec chatroom.
