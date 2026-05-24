# MethodSpec Validator Freeze Note

Last updated: 2026-05-25

## 1. Summary

This note freezes the current MethodSpec validator checkpoint after MS-12.

Current reviewer status: `PASS_WITH_NOTES`.

The note is due to historical dirty / untracked repository baseline only. The reviewed MethodSpec validator work did not show a boundary failure.

This document is a documentation / governance checkpoint. It does not change runtime code, catalog schemas, pricing rules, renderer behavior, budget engine behavior, or output generation.

## 2. Scope

This freeze note covers the Method / Spec Warehouse workstream:

- `MethodSpecCatalog`
- `QuoteItemTemplate`
- `MethodRecipe`
- `PricingRule`
- `MaterialSpec`
- `ItemMaterialBinding`
- `LaborRule`
- `NoteTemplate`
- `UnitConversion`
- `InclusionExclusionRule`
- MethodSpec validator policy constants
- MethodSpec validator report shape
- local demo validation expectations

Out of scope:

- renderer / Excel / PDF / CSV / HTML
- `BudgetOutputSnapshot` renderer implementation
- raw warehouse / procurement candidate intake
- preview floor plan / plan-puzzle
- frontend
- RAG / AI API
- DB migration
- payment / escrow / listing fee
- formal pricing authority changes

## 3. Current Frozen Status

Frozen status at this checkpoint:

- PR #4 for `warehouse/method-spec` is merged.
- P0 validator hardening is complete.
- P1-A validator hardening is complete.
- P1-B validator hardening is complete.
- MS-12 reviewer verdict is `PASS_WITH_NOTES`.
- Seed catalog remains validator-valid.
- Regression budget total remains `231103`.
- Regression budget line count remains `12`.
- Regression review-required line count remains `5`.

The current MethodSpec validator guards are accepted as the baseline for future MethodSpec work unless a later formal Issue explicitly changes them.

## 4. Frozen Validator Guards

### P0 Guards

The P0 validator checkpoint includes:

- `PricingRule.price_source.type` guard blocks raw / candidate / RAG / AI / LLM source types.
- allowed unbound material item allowlist.
- `InclusionExclusionRule.requires_review` policy visibility as `scope_review`.
- active `QuoteItemTemplate` customer note coverage.
- report separation for `issues`, `allowed_conditions`, `guard_results`, and summary counts.

Blocked pricing source types include:

- `raw`
- `candidate`
- `rag`
- `ai`
- `llm`
- `ai_generated`
- `rag_suggested`
- `candidate_import`

These remain errors, not warnings.

### P1-A Guards

The P1-A validator checkpoint includes:

- `LaborRule` reference-only guard.
- allowed unbound material allowlist formalized in validator policy constants.

Blocked labor-derived pricing source types include:

- `labor_rule`
- `labor_derived`
- `labor_formula`
- `labor_rate`
- `labor_rate_derived`

If a `PricingRule.price_source.type` uses one of these values, validator result must be invalid.

Active `LaborRule` records may exist as reference data. They must not become formal pricing rules or change `unit_price` / `amount`.

### P1-B Guards

The P1-B validator checkpoint includes:

- UnitConversion coverage guard.
- formula-implied conversion detection.
- active `QuoteItemTemplate` inclusion / exclusion scope coverage guard.

UnitConversion coverage is warning-only. It must not:

- recalculate quantity.
- rewrite `BudgetEstimateLine.quantity`.
- enter the budget engine flow.
- change price, unit price, or amount.

Inclusion / Exclusion scope coverage is warning / allowed-condition only. It must not:

- propagate to renderer directly.
- add, remove, or rewrite formal work items.
- change quantity, unit price, or amount.
- modify `BudgetOutputSnapshot`.

## 5. Frozen Boundary Rules

The following invariants are frozen for the current MethodSpec validator baseline:

- `PricingRule` is the only current deterministic source for formal `BudgetEstimateLine.unit_price`.
- AI, RAG, raw candidate data, supplier raw prices, or imported candidate data must not directly become formal prices.
- `MaterialSpec` is specification trace data only and must not directly change price.
- `ItemMaterialBinding` maps `item_code -> material_code` for traceability and must not change price.
- `NoteTemplate` may provide customer or internal notes, assumptions, exclusions, and risks, but must not change quantity or price.
- `InclusionExclusionRule` may provide scope trace and review visibility, but must not alter renderer format or formal work-item generation.
- `LaborRule` remains reference-only and must not enter the main estimate formula without a separate approved phase.
- `UnitConversion` remains coverage / trace validation in this phase and must not silently rewrite produced quantities.
- Renderer / output work must read `BudgetOutputSnapshot` or renderer-safe documents, not `MethodSpecCatalog`.
- MethodSpec work must not modify renderer / output / raw warehouse / frontend / plan-puzzle ownership areas.

## 6. Allowed Unbound Material Items

The following active quote items may remain without a material binding in the current validator baseline:

- `ELECTRIC_SOCKET_EXTENSION`
- `ELECTRIC_LIGHTING_INSTALL`
- `OTHER_PROTECTION_WORK`
- `OTHER_CLEANING_WORK`
- `OTHER_MANAGEMENT_FEE`

These are allowed conditions, not errors.

This allowlist does not mean the items are out of review forever. It only means material binding is not required for the current MethodSpec seed catalog.

## 7. Allowed Missing Scope Rule Items

The following active quote items may temporarily miss an inclusion / exclusion scope rule with lower severity:

- `OTHER_MANAGEMENT_FEE`
- `OTHER_PROTECTION_WORK`
- `OTHER_CLEANING_WORK`

Missing scope rules for these items must stay reviewer-visible through allowed conditions or warnings.

This policy is separate from allowed unbound material items. Do not merge the two allowlists.

## 8. Known Notes

Current known notes:

- Repo baseline was historically dirty / untracked during the validator reviewer passes.
- MS-12 `PASS_WITH_NOTES` is caused by file ownership proof limitations, not by a detected validator failure.
- Seed catalog currently has expected warning-only UnitConversion coverage gaps for `cm -> m` and `m -> cm`.
- Missing conversion pairs must remain warnings unless a future formal quote phase intentionally upgrades severity.
- Current validator demos are local prototype checks, not CI.
- No formal database, no formal catalog publishing UI, and no production human approval workflow is implemented by this workstream.

## 9. Future Trigger Conditions

Future MethodSpec work should require a new formal Issue if it touches any of the following:

- `PricingRule` authority.
- `BudgetEstimateLine.unit_price`.
- `BudgetEstimateLine.amount`.
- labor/material split pricing.
- formal quote readiness severity upgrades.
- schema or type expansion.
- catalog publishing workflow.
- renderer / output handoff semantics.
- raw candidate to MethodSpec publishing.
- DB migration or external persistence.

Mark `Need Reviewer: Yes` if future work touches:

- formal price boundaries.
- `PricingRule`.
- `BudgetEstimateLine.unit_price`.
- output / renderer boundaries.
- raw warehouse to MethodSpec publishing.
- cross-workstream ownership.

Mark `Need Commander: Yes` if future work asks for:

- formal price policy decisions.
- business quote policy.
- production catalog approval workflow.
- payment / escrow / listing fee.
- real AI API / RAG integration.
- formal Excel / PDF output behavior.

## 10. Remaining Backlog

Backlog after this freeze note:

- P2 validator planning for unused active `MaterialSpec`.
- duplicate customer-visible note detection.
- `NoteTemplate.trade_category` consistency.
- `MethodRecipe.required_params` / `review_triggers` policy mapping.
- decide whether `cm -> m` and `m -> cm` should be added to seed conversions or intentionally kept as warning-only coverage pairs.
- decide whether missing non-allowlisted inclusion / exclusion scope rules should become errors before formal quote.
- clean branch / clean worktree file ownership proof for any future freeze or production readiness review.

## 11. Recommendation

Recommendation: treat the current MethodSpec validator baseline as frozen for prototype continuation.

Do not expand the MethodSpec validator, catalog schema, pricing authority, or output propagation without a new formal GitHub Issue.

Do not use this freeze note as permission to create formal prices, formal quotes, renderer output, raw warehouse publishing, frontend UI, DB migration, RAG, AI API, payment, escrow, or listing fee behavior.
