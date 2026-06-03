# Minimal Dry-run Budget Engine Entry Runtime Evidence

Date: 2026-06-01 Asia/Taipei

Agent: Budget Engine Entry & Picking Agent

Workstream: `budget/engine-entry-picking`

Supervisor: `LAIBE_PATROL_INTEGRATION_OFFICER`

GitHub Issue: `#49`

Source of truth: GitHub `main`

Base commit checked before implementation: `aa455708dac93bcc4f1309e22acc4ae3ad76387e`

## 1. Scope

This runtime implementation adds a minimal dry-run Budget Engine entry for
integration harness preparation.

It is not a restored production Budget Engine. It does not generate formal
prices, formal quotes, production `PricingRule`, production quantity authority,
renderer output, Excel / PDF, payment, AI API, DB / Supabase, n8n, webhook, or
customer-facing output.

## 2. Changed Files

- `src/lib/budget/integration/types.ts`
- `src/lib/budget/integration/fixture-placeholder-project-brief.ts`
- `src/lib/budget/integration/fixture-placeholder-plan-quantities.ts`
- `src/lib/budget/integration/build-budget-input-bundle.ts`
- `src/lib/budget/integration/demo-budget-harness-mvp.ts`
- `src/lib/budget/integration/run-budget-harness-static-guard.ts`
- `docs/budget_engine_entry/minimal_dry_run_entry_runtime_evidence.md`

## 3. Runtime Entry

Path:

- `src/lib/budget/integration/demo-budget-harness-mvp.ts`

Exported functions:

- `runBudgetHarnessMvpDryRun()`
- `validateBudgetOutputSnapshotCompatibleShape()`

Supporting export:

- `buildBudgetInputBundle()` from
  `src/lib/budget/integration/build-budget-input-bundle.ts`

Dry-run guard:

- `dry_run_only: true`
- `formal_price_generated: false`
- `formal_quote_generated: false`
- `pricing_rule_written: false`
- `budget_estimate_line_from_price_range: false`
- `renderer_invoked: false`
- `payment_invoked: false`
- `ai_api_invoked: false`
- `db_invoked: false`
- `webhook_invoked: false`
- `svg_production_quantity_used: false`
- `customer_facing_allowed: false`

## 4. Input Contract

### ProjectRequirementBrief Placeholder

Accepted fields:

- `project_requirement_brief_id`
- `owner_intent_id`
- `requirement_context_status`
- `budget_preference`
- `space_requirements`
- `scope_constraints`
- `review_flags`

Allowed statuses:

- `placeholder`
- `linked`
- `verified`
- `unavailable`

Dry-run behavior:

- placeholder / linked / unavailable are trace only.
- non-verified context sets `review_required: true`.
- free text is not accepted as a direct line-item generator.
- requirement context does not write `PricingRule`.

### PlanPuzzleQuantityFacts Placeholder

Accepted fields:

- `plan_id`
- `svg_artifact_id`
- `plan_quantity_facts_id`
- `quantity_context_status`
- `zone_id`
- `area_m2`
- `wall_length_m`
- `opening_count`
- `quantity_confidence`
- `reviewer_required`

Allowed statuses:

- `placeholder`
- `linked`
- `verified`
- `unavailable`

Dry-run behavior:

- placeholder / linked / unavailable are trace only.
- non-verified context sets `review_required: true`.
- SVG placeholder data is not production quantity authority.
- SVG data is not routed to renderer.

### MethodSpec Approved Seed

Accepted input:

- `method_spec_catalog_id`
- `method_spec_version`
- `review_status: "approved"`
- `seed_source`
- `catalog`

Dry-run behavior:

- The entry performs a local approved-seed shape guard.
- The entry summarizes `buildBudgetCatalogFromMethodSpec()` output as seed
  preparation only.
- It does not mutate `MethodSpecCatalog`.
- It does not write `PricingRule`.

Note:

`validateMethodSpecCatalog()` is not imported by this minimal runtime entry
because current GitHub main has a separate missing runtime dependency at
`src/lib/budget/storage/budget-catalog.ts`. The minimal entry keeps that
blocker contained and uses an approved-seed shape guard instead.

## 5. Output Contract

The demo produces a `BudgetOutputSnapshot`-compatible dry-run object with:

- `snapshot_id`
- `estimate_id`
- `project_id`
- `estimate_stage: "dry_run_mvp"`
- `output_version`
- `generated_at`
- `catalog_version`
- `customer_view`
- `internal_view`
- `totals`
- `validation_report`
- `warnings`
- `source_summary`

Placeholder result behavior:

- `snapshot_shape_valid: true`
- `validation_report.valid: false`
- `review_required: true`
- `total_amount: 0`

The false validation state is intentional because placeholder requirement and
quantity contexts must not pass as production-ready input.

## 6. Validation Results

Commands run:

```powershell
node --experimental-strip-types --check src/lib/budget/integration/types.ts
node --experimental-strip-types --check src/lib/budget/integration/build-budget-input-bundle.ts
node --experimental-strip-types --check src/lib/budget/integration/demo-budget-harness-mvp.ts
node --experimental-strip-types src/lib/budget/integration/demo-budget-harness-mvp.ts
node --experimental-strip-types src/lib/budget/integration/run-budget-harness-static-guard.ts
```

Results:

- `types.ts` syntax check: PASS
- `build-budget-input-bundle.ts` syntax check: PASS
- `demo-budget-harness-mvp.ts` syntax check: PASS
- demo run: PASS
- static guard: PASS

Demo summary:

```json
{
  "dry_run_only": true,
  "formal_price_generated": false,
  "formal_quote_generated": false,
  "pricing_rule_written": false,
  "budget_estimate_line_from_price_range": false,
  "renderer_invoked": false,
  "payment_invoked": false,
  "ai_api_invoked": false,
  "db_invoked": false,
  "webhook_invoked": false,
  "svg_production_quantity_used": false,
  "snapshot_shape_valid": true,
  "validation_report": {
    "valid": false,
    "errors": [
      "Dry-run placeholder input requires review before any production or customer-facing use."
    ]
  },
  "estimate_stage": "dry_run_mvp",
  "total_amount": 0,
  "review_required": true
}
```

## 7. Static Guard Results

Static guard output:

```json
{
  "valid": true,
  "issue_count": 0
}
```

Guard checks:

- renderer import: PASS
- payment import: PASS
- AI / RAG import: PASS
- DB / Supabase import: PASS
- n8n / webhook import: PASS
- formal price: PASS
- PricingRule write: PASS
- BudgetEstimateLine from PriceRange: PASS
- SVG production quantity: PASS

## 8. Functional Acceptance

`PASS_FOR_MINIMAL_DRY_RUN_ENTRY`

This pass is limited to the minimal dry-run Budget Engine entry. It does not
mean the integration harness is started, production pricing is available, or
formal quote output is authorized.

## 9. Integration Gate Impact

Does this unblock MethodSpec?

Partial.

The blocker is reduced from "no entry exists" to "minimal dry-run entry exists
and can emit a snapshot-compatible placeholder object."

Remaining blocker:

- Integration harness still requires reviewer approval before runtime wiring.
- Production pricing / formal quote output remains blocked.
- Placeholder requirement and quantity contexts still require human review.

## 10. Need Commander

No for this authorized minimal implementation PR.

Yes before any production Budget Engine restoration, formal pricing, formal
quote output, external automation, payment, AI API, DB, or customer-facing
runtime behavior.

## 11. Need Reviewer

Yes.

Reviewer is required because this PR creates scoped runtime code.
