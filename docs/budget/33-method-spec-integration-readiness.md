# MethodSpec Integration Readiness Evidence

Last updated: 2026-05-31

Workstream: warehouse/method-spec
Agent: MethodSpec Warehouse
Source of truth target: GitHub main plus PR branch evidence for MethodSpec docs.

This document records the integration-readiness evidence for the MethodSpec Warehouse after the validator freeze-note lane. It is a docs/governance packet only. It does not change runtime code, schemas, pricing behavior, renderer/output behavior, raw warehouse behavior, frontend behavior, plan-puzzle behavior, AI/RAG/API/DB/payment behavior, or formal quote generation.

## 1. Post-Merge Sync Note

- PR #22, `Add MethodSpec validator freeze note`, is merged.
- Issue #16, `[MethodSpec] Add validator freeze note`, is closed by PR #22.
- `docs/budget/32-method-spec-validator-freeze-note.md` is on `main` and is the current freeze-note source for P0/P1 MethodSpec validator boundaries.
- If `docs/WORKSTREAM_BLACKBOARD.md` still lists PR #22 or Issue #16 as active, that blackboard status is stale and should be read as superseded by the merged PR state.

## 2. Current Readiness Rating

- MVP Scope Completion: 90%
- Integration Readiness: 75%
- Downstream handoff ready: Partial. MethodSpec can supply validated catalog/reference evidence, but executable budget integration dry-run remains blocked by the missing Budget Engine entry file.

This packet does not claim 100% readiness because current-main executable dry-run evidence cannot be completed while `src/lib/budget/budget-generator.ts` is absent.

## 3. MethodSpecCatalog Shelves Summary

| Shelf | Current seed count | Responsibility | May affect | Must not affect | Downstream consumer | Validator coverage |
| --- | ---: | --- | --- | --- | --- | --- |
| `quote_item_templates` | 12 | Approved budget item templates and review policies. | Item identity, label, unit, category, review flags. | Unit price, final quantity, renderer rows, customer output. | Budget Engine catalog selection. | Count, binding, note, scope coverage. |
| `method_recipes` | 7 | Deterministic method/recipe metadata for a quote item. | Recipe choice, quantity formula reference, required materials/labor refs. | Formal unit price, geometry verification, renderer/output. | Budget Engine recipe selection. | Catalog link and policy checks. |
| `pricing_rules` | 12 | Sole deterministic formal unit-price authority. | Formal price source, unit price, price source trace. | AI/RAG/raw candidate direct writes, renderer/output. | Budget Engine pricing lookup. | Source-type guard and catalog linkage. |
| `material_specs` | 6 | Material/equipment specification reference and trace. | Material trace, compatibility, review hints. | Unit price, formal estimate amount. | Budget Engine trace and reviewer context. | Binding and allowlist guards. |
| `item_material_bindings` | 7 | Links quote item templates to allowed material specs. | Material applicability and trace. | Unit price, quantity, renderer rows. | Budget Engine material trace. | Binding and unbound allowlist guards. |
| `note_templates` | 10 | Standard assumptions, exclusions, and reviewer-facing notes. | Notes and assumptions. | Quantity, amount, formal price, renderer layout. | Budget Engine notes/internal trace. | Note coverage guard. |
| `inclusion_exclusion_rules` | 12 | Included/excluded scope rules and review flags. | Scope text, allowed conditions, review warnings. | Formal output mutation, renderer/customer output mutation. | Budget Engine scope review flags. | Review-policy and scope-coverage guards. |
| `unit_conversions` | 3 | Reference conversion definitions for known units. | Reference conversion visibility and warnings. | Silent quantity rewrite, production quantity without verified upstream facts. | Budget Engine/reference validation. | Warning-level conversion coverage guard. |
| `labor_rules` | 6 | Labor methodology reference and review hints. | Labor reference trace and review flags. | Formal price, unit price, direct BudgetEstimateLine write. | Budget Engine reviewer/reference trace. | Reference-only guard. |

## 4. Validators Completed

Current validator evidence from the seed MethodSpec catalog:

- `valid`: true
- `error_count`: 0
- `warning_count`: 2
- `allowed_condition_count`: 5
- `guard_result_count`: 7

Confirmed guard result categories:

- `pricing_source_type_guard`
- `labor_rule_reference_only_guard`
- `unit_conversion_coverage_guard`
- `inclusion_exclusion_review_policy_guard`
- `inclusion_exclusion_scope_coverage_guard`
- `unbound_material_allowlist_guard`
- `quote_item_note_coverage_guard`

Known warning:

- `unit_conversion_coverage_guard` warns that `cm -> m` and `m -> cm` conversions are still absent. This is a reference coverage warning, not permission to rewrite quantities silently.

Validation command refreshed:

```powershell
node --experimental-strip-types src/lib/budget/specs/demo-method-spec-validator-hardening.ts
```

Result:

- PASS when run with the bundled Codex Node runtime.
- Seed catalog remained valid.
- Invalid pricing-source clone was rejected by `pricing_source_type_guard`.

## 5. Reviewer Pass And Freeze Evidence

Completed MethodSpec stages:

- Inventory Audit: `docs/budget/21-method-spec-catalog-inventory-report.md`
- MethodSpec to BudgetOutput boundary: `docs/budget/20-method-spec-to-budget-output-boundary.md`
- P0 validator hardening: `docs/budget/22-method-spec-validator-hardening.md`
- P0 reviewer pass: `docs/budget/23-method-spec-validator-reviewer-pass.md`
- P1-A plan and implementation: `docs/budget/24-method-spec-validator-p1-plan.md`, `docs/budget/25-method-spec-validator-p1-implementation.md`
- P1-A reviewer pass: `docs/budget/26-method-spec-validator-p1-reviewer-pass.md`
- P1-B plan and implementation: `docs/budget/27-method-spec-validator-p1b-plan.md`, `docs/budget/28-method-spec-validator-p1b-implementation.md`, `docs/budget/30-method-spec-scope-coverage-implementation.md`
- P1-B reviewer pass: `docs/budget/31-method-spec-p1b-reviewer-pass.md`
- Freeze note: `docs/budget/32-method-spec-validator-freeze-note.md`

Reviewer evidence from the freeze-note lane:

- PR #22 merged.
- Issue #16 closed.
- Freeze note is on main.
- MethodSpec forbidden scope remained docs-only/governance-only for the freeze lane.

## 6. Requirement Context Window

Accepted fields:

- `project_requirement_brief_id`
- `owner_intent_id`
- `project_type`
- `space_requirements`
- `budget_preference`
- `quality_level_hint`
- `style_hint`
- `scope_constraints`
- `review_flags`
- `requirement_context_status`: `placeholder`, `linked`, `verified`, or `unavailable`

Allowed use:

- Help choose possible `QuoteItemTemplate` candidates.
- Help choose possible `MethodRecipe` candidates.
- Help generate assumptions and notes.
- Help mark `requires_review`.

Forbidden use:

- Do not use free-text requirements to create or mutate `PricingRule`.
- Do not use requirement-form content to directly change `MaterialSpec`.
- Do not skip the MethodSpec validator.
- Do not directly produce `BudgetEstimateLine`.
- Do not convert `OwnerIntent` directly into formal catalog data.

## 7. Plan / SVG Quantity Context Window

Accepted fields:

- `plan_quantity_facts_id`
- `plan_id`
- `svg_artifact_id`
- `zone_id`
- `room_type`
- `area_m2`
- `wall_length_m`
- `opening_count`
- `quantity_source`: `svg_placeholder`, `plan_puzzle_mock`, `verified_plan`, or `unavailable`
- `quantity_confidence`
- `reviewer_required`
- `quantity_context_status`: `placeholder`, `linked`, `verified`, or `unavailable`

Allowed use:

- Help `MethodRecipe` decide whether a quantity formula may apply.
- Help decide which quote items may appear.
- Help mark zones or quantities that require reviewer attention.

Forbidden use:

- Do not treat SVG quantity as production quantity unless `quantity_source` is `verified_plan`.
- Do not let MethodSpec verify Plancraft geometry.
- Do not modify plan-puzzle.
- Do not let unverified quantity enter a formal estimate.
- Do not write placeholder `area_m2` into a formal `BudgetEstimateLine`.

## 8. Allowed Raw Candidate Input

Raw Candidate Warehouse and `HandoffProposal` data may be used only as evidence.

Allowed:

- Preserve raw proposal provenance.
- Attach proposal evidence to reviewer context.
- Suggest candidate shelf changes for human or deterministic approval.
- Mark uncertainty and review flags.

Forbidden:

- Do not automatically convert a proposal into `MaterialSpec`.
- Do not automatically convert a proposal into `PricingRule`.
- Do not automatically convert a proposal into `LaborRule`.
- Do not let AI/RAG approve formal catalog data.
- Do not use raw candidate evidence as formal price authority.

## 9. Allowed Output To Budget Engine

MethodSpec may supply:

- Approved `QuoteItemTemplate`
- Approved `MethodRecipe`
- Approved `PricingRule`
- `MaterialSpec` trace
- `UnitConversion` reference
- `NoteTemplate`
- `InclusionExclusionRule`
- Review flags and assumptions

MethodSpec may not supply directly to:

- Renderer
- Output Documents
- Excel/PDF/CSV/HTML output
- `customer_view`
- Payment, escrow, listing fee, or frontend flows

## 10. Formal Rule Guards

- `PricingRule` remains the only deterministic formal unit-price source.
- AI/RAG/raw candidate data is forbidden from directly writing or approving `PricingRule`.
- `LaborRule` is reference-only and must not create formal prices.
- `UnitConversion` must not silently rewrite quantity.
- `InclusionExclusionRule` must not mutate output/renderer/customer documents.
- `MaterialSpec` must not change formal prices.
- `ItemMaterialBinding` must not change formal prices.
- `NoteTemplate` must not change quantities or amounts.

## 11. Budget Engine Entry Check

Checked paths:

- `src/lib/budget/budget-generator.ts`
- `src/lib/budget/demo-generate-budget.ts`
- `src/lib/budget/specs/demo-method-spec-warehouse.ts`
- `src/lib/budget/specs/demo-method-spec-validator-p1.ts`
- `src/lib/budget/specs/demo-method-spec-validator-p1b.ts`
- `src/lib/budget/specs/demo-method-spec-validator-scope-coverage.ts`

Findings:

- `src/lib/budget/budget-generator.ts` is missing locally and was not found on GitHub `main`.
- `src/lib/budget/demo-generate-budget.ts` exists locally, but the current GitHub `main` lookup did not find that file.
- The validator-hardening demo does not require `budget-generator.ts` and passes.
- The other listed demos import or transitively require `budget-generator.ts` and fail with module-not-found.

Blocker:

- `BUDGET_ENGINE_ENTRY_BLOCKER`

Blocked demo status:

- `demo-method-spec-warehouse.ts`: `BLOCKED_BY_MISSING_BUDGET_ENGINE_ENTRY`
- `demo-method-spec-validator-p1.ts`: `BLOCKED_BY_MISSING_BUDGET_ENGINE_ENTRY`
- `demo-method-spec-validator-p1b.ts`: `BLOCKED_BY_MISSING_BUDGET_ENGINE_ENTRY`
- `demo-method-spec-validator-scope-coverage.ts`: `BLOCKED_BY_MISSING_BUDGET_ENGINE_ENTRY`
- `demo-generate-budget.ts`: `BLOCKED_BY_MISSING_BUDGET_ENGINE_ENTRY`

This blocker is not a MethodSpec validator failure. It is an integration-entry clarification task for the Budget Engine owner.

## 12. Integration Handoff Position

MethodSpec can participate in a dry-run as a validated catalog/reference supplier if the harness consumes only MethodSpec shelves and validator output.

MethodSpec cannot claim executable end-to-end Budget Engine dry-run readiness until the Budget Engine entry path is clarified or restored.

Recommended next action:

- Assign Budget Engine owner or integration officer to clarify the current replacement for `src/lib/budget/budget-generator.ts`, or open a dedicated issue for the missing entry.
- Keep MethodSpec within docs/catalog/validator guard scope. Do not fix the Budget Engine entry from this workstream unless explicitly assigned.
