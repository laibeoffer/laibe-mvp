# MethodSpec Post-PR55 Reevaluation

Source of truth: GitHub `main` at `34772927ea4cbec51b012b275cefbcb12f006097`.

Agent: `配件倉庫：工法與規格 / MethodSpec Warehouse`

Workstream: `warehouse/method-spec`

Replacement target: PR #30 has already been closed as stale / unmerged / superseded. PR #87 is the current clean replacement evidence for MethodSpec post-PR55 reevaluation.

## 1. Current PR And Dependency State

- PR #30: closed, unmerged, superseded.
- PR #30 stale reason: it recorded the old missing-entry blocker and carried stale `docs/WORKSTREAM_BLACKBOARD.md` changes.
- PR #87: current clean replacement evidence for MethodSpec post-PR55 reevaluation.
- PR #55: merged and accepted for minimal dry-run Budget Engine Entry scope.
- PR #55 merge commit: `6b0b394d973a93d1e9f8601a55f4a277a28f8bbe`.
- Quote Factory PR #3: merged and accepted for export-package dry-run scope.
- Raw Candidate R1.5: accepted candidate-only.
- Output Documents: accepted for snapshot-only side.
- Issue #49: remains open until this post-PR55 MethodSpec reevaluation is disposed.

## 2. PR #55 Impact On Old Blocker

Decision: `OLD_BLOCKER_RESOLVED_PARTIAL`

The old blocker, meaning the absence of a minimal dry-run Budget Engine Entry able to accept approved upstream budget inputs, is resolved for the authorized dry-run scope by PR #55.

This does not mean any of the following are ready:

- production Budget Engine
- production pricing
- production `PricingRule`
- `BudgetEstimateLine` generation
- renderer / Excel / PDF output
- customer-facing formal quote
- payment
- AI API / RAG
- DB / Supabase
- n8n / webhook
- integration harness execution

## 3. MethodSpec Approved Rules Handoff Decision

Decision: `CAN_ROUTE_TO_PR55_DRY_RUN_ENTRY_WITH_LIMITS`

MethodSpec approved seed / rules can route to the PR #55 minimal dry-run entry as structured dry-run preparation input only.

Allowed source from MethodSpec:

- approved `QuoteItemTemplate` references
- approved `MethodRecipe` references
- approved seed / catalog references after MethodSpec validation
- `MaterialSpec` trace as non-price descriptive evidence
- `UnitConversion` reference for formula compatibility checks only
- `NoteTemplate` / inclusion-exclusion notes as trace and review context
- review flags and provenance

Not allowed from MethodSpec:

- direct formal price creation
- production `PricingRule` write
- `BudgetEstimateLine` creation
- customer-facing formal quote output
- renderer invocation
- Budget Engine runtime modification

## 4. Routing Contract

The routing from MethodSpec to PR #55 is a dry-run input contract, not a production estimate contract.

```text
MethodSpecCatalog approved seed/rules
  -> validate MethodSpec catalog / approved seed state
  -> adapt as dry-run method_spec_seed / approved rules reference
  -> BudgetInputBundle accepted by PR #55 minimal dry-run entry
  -> runBudgetHarnessMvpDryRun() dry-run object
  -> BudgetOutputSnapshot-compatible placeholder output
```

Required guard fields / semantics:

- `dry_run_only: true`
- `estimate_stage: "dry_run_mvp"` or equivalent dry-run marker
- placeholder / linked / verified context status must be preserved
- unverified requirements must force review flags
- unverified plan quantities must not become production quantities
- output must remain not customer-facing
- validation may be false / review-required when placeholder context is used
- formal price generation must remain false

Required forbidden-flow flags, where represented by the dry-run output or static guard:

- `formal_price_generated: false`
- `renderer_invoked: false`
- `payment_invoked: false`
- `ai_api_invoked: false`
- `db_invoked: false`
- no production `PricingRule` write
- no `BudgetEstimateLine` from price ranges or raw candidate observed prices

## 5. Requirement Context Window

MethodSpec may consume requirement context only for rule selection and review context.

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
- `requirement_context_status`: `placeholder | linked | verified | unavailable`

Allowed use:

- select likely applicable `QuoteItemTemplate`
- select likely applicable `MethodRecipe`
- produce assumptions / notes
- set `requires_review`

Forbidden use:

- free text requirement directly creates `PricingRule`
- requirement form directly changes `MaterialSpec`
- requirement form skips MethodSpec validator
- requirement form directly creates `BudgetEstimateLine`
- `OwnerIntent` becomes formal catalog without approval

## 6. Plan / SVG Quantity Context Window

MethodSpec may consume plan quantity context only to choose formulas and review flags.

Accepted fields:

- `plan_quantity_facts_id`
- `plan_id`
- `svg_artifact_id`
- `zone_id`
- `room_type`
- `area_m2`
- `wall_length_m`
- `opening_count`
- `quantity_source`: `svg_placeholder | plan_puzzle_mock | verified_plan | unavailable`
- `quantity_confidence`
- `reviewer_required`
- `quantity_context_status`: `placeholder | linked | verified | unavailable`

Allowed use:

- choose likely applicable MethodRecipe quantity formula
- identify possible work items
- set reviewer-required flags for uncertain zones

Forbidden use:

- SVG quantity becomes production quantity unless `verified_plan`
- MethodSpec validates Plancraft geometry
- MethodSpec modifies plan-puzzle
- unverified quantity enters formal estimate
- placeholder `area_m2` is written to formal `BudgetEstimateLine`

## 7. Functional Acceptance Boundary

Functional Acceptance for this replacement packet:

`PASS_FOR_METHODSPEC_DRY_RUN_INPUT_ROUTING_DOCUMENTATION`

This is not runtime acceptance and not production readiness. It only records that the old missing-entry blocker has been narrowed after PR #55 and that MethodSpec can supply approved seed/rules into the PR #55 dry-run entry under strict forbidden-flow guards.

Web validation: `NOT_WEB_SURFACE`.

## 8. Issue #49 Closeout Implication

Issue #49 can move toward closeout only if Integration Officer accepts this replacement packet as sufficient MethodSpec post-PR55 reevaluation.

Current disposition:

1. PR #30 has already been closed as stale / unmerged / superseded.
2. PR #87 is the current clean replacement evidence for MethodSpec post-PR55 reevaluation.
3. Keep Integration Harness `NOT_READY_FOR_HARNESS` until all four required budget lines have current acceptance evidence and no blocker.
4. Keep formal pricing, production Budget Engine, renderer, payment, AI API, DB, Supabase, n8n, and customer-facing quote output out of scope.

## 9. Forbidden Scope Check

- No Budget Engine runtime change.
- No `PricingRule` change.
- No production `PricingRule` write.
- No `BudgetEstimateLine` generation.
- No Renderer / Excel / PDF output.
- No raw warehouse change.
- No frontend change.
- No plan-puzzle change.
- No payment / AI API / RAG / DB / Supabase / n8n / webhook.
- No integration harness start.
- No formal price.
- No formal quote.

## 10. Need Commander / Reviewer

Need Commander: No for this docs-only replacement PR. Commander is needed to accept / merge PR #87 or to authorize any production/harness step.

Need Reviewer: No for docs-only replacement. Reviewer is required if any follow-up changes runtime, Budget Engine, Renderer, `PricingRule`, `BudgetEstimateLine`, formal price, formal quote, payment, AI API, DB, Supabase, n8n, or integration harness boundaries.
