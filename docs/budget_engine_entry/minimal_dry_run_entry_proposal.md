# Minimal Dry-run Budget Engine Entry Proposal

Date: 2026-06-01 Asia/Taipei
Agent: Budget Engine Entry & Picking Agent
Workstream: budget/engine-entry-picking
Supervisor: LAIBE_PATROL_INTEGRATION_OFFICER
Scope: proposal only; no runtime implementation in this PR

## 1. Purpose

GitHub `main` does not contain a usable Budget Engine entry equivalent to `src/lib/budget/budget-generator.ts` or `generateBudgetEstimate()`.

This proposal defines the smallest safe dry-run entry needed to unblock a future budget integration harness without producing formal prices, formal quotes, real Excel/PDF, production quantities, payment, AI API, DB, or renderer-side calculation.

## 2. Proposed Files

Suggested runtime files for a later authorized implementation:

- `src/lib/budget/integration/build-budget-input-bundle.ts`
- `src/lib/budget/integration/demo-budget-harness-mvp.ts`
- `src/lib/budget/integration/fixture-placeholder-project-brief.ts`
- `src/lib/budget/integration/fixture-placeholder-plan-quantities.ts`

Suggested documentation file for the later implementation PR:

- `docs/budget_engine_entry/minimal_dry_run_entry_implementation.md`

This proposal does not create or modify those runtime files.

## 3. Proposed Function Names

### `buildBudgetInputBundle`

Location:

- `src/lib/budget/integration/build-budget-input-bundle.ts`

Purpose:

- Normalize the minimal dry-run input package for the integration harness.
- Enforce placeholder / dry-run guard fields.
- Keep upstream evidence traceable without promoting it to formal price or production quantity.

### `runDemoBudgetHarnessMvp`

Location:

- `src/lib/budget/integration/demo-budget-harness-mvp.ts`

Purpose:

- Execute the minimal dry-run budget harness using fixture placeholders and approved MethodSpec seed/rules.
- Return a `BudgetOutputSnapshot`-compatible object for Output Documents preview validation.
- Never call renderer, payment, AI API, DB, Supabase, or production webhooks.

## 4. Input Contract

Proposed top-level input:

```ts
type BudgetInputBundle = {
  bundle_id: string;
  mode: "dry_run_mvp";
  formal_price_allowed: false;
  formal_quote_allowed: false;
  customer_facing_allowed: false;
  project_requirement_brief: ProjectRequirementBrief;
  plan_quantity_facts: PlanPuzzleQuantityFacts;
  method_spec_catalog: MethodSpecCatalog;
  catalog_version: string;
  provenance: BudgetInputBundleProvenance;
  guardrails: BudgetInputBundleGuardrails;
};
```

### `ProjectRequirementBrief`

Minimum required fields:

```ts
type ProjectRequirementBrief = {
  brief_id: string;
  status: "placeholder" | "linked" | "verified";
  source: "fixture_placeholder" | "owner_guide_placeholder" | "owner_guide_linked";
  project_type?: string;
  space_requirements?: Array<{
    space_id: string;
    label: string;
    requested_work_tags: string[];
  }>;
  assumptions: string[];
  review_flags: string[];
};
```

Rules:

- `placeholder` is accepted for dry-run only.
- `linked` is accepted as trace only.
- `verified` is required before any production or customer-facing use.
- Free text must not directly create `BudgetEstimateLine`.
- Requirement text must not become a price source.

### `PlanPuzzleQuantityFacts`

Minimum required fields:

```ts
type PlanPuzzleQuantityFacts = {
  facts_id: string;
  status: "placeholder" | "linked" | "verified";
  source: "fixture_placeholder" | "plan_puzzle_mock" | "svg_placeholder" | "verified_plan";
  production_quantity_allowed: false;
  zones: Array<{
    zone_id: string;
    label: string;
    room_type?: string;
    area_m2?: number;
    wall_length_m?: number;
    opening_count?: number;
    confidence: "placeholder" | "low" | "medium" | "verified";
  }>;
  review_flags: string[];
};
```

Rules:

- `placeholder` is accepted for dry-run only.
- `linked` is accepted as trace only.
- `verified_plan` is required before production quantity authority.
- SVG area or wall length must not become production quantity in this phase.

### MethodSpec Input

The entry may accept:

- approved `MethodSpecCatalog`
- approved MethodSpec seed catalog
- validator report summary
- approved/reviewed rules from MethodSpec

The entry must not accept:

- raw candidate rows as formal catalog updates
- `PriceObservation` or `PriceRange` as `PricingRule`
- unreviewed proposal data as `MaterialSpec`, `LaborRule`, or formal price source

## 5. Output Contract

The dry-run entry should return a `BudgetOutputSnapshot`-compatible object, preferably by producing a `BudgetSheetOutput` and passing it through `createBudgetOutputSnapshot()`.

Required output properties:

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

Dry-run line requirements:

- Use only MethodSpec approved templates/recipes/rules for item selection.
- Preserve `source_type`, `source_id`, `recipe_id`, `quantity_formula`, `price_source`, `confidence`, and `requires_review` in internal trace.
- Mark all placeholder-derived lines as `requires_review: true`.
- Use explicit dry-run warnings.
- Use `estimate_stage: "dry_run_mvp"` or equivalent non-formal marker.
- Do not create customer-facing final quote authority.

Price handling options for implementation decision:

1. Use zero-value placeholder amounts with `price_source.type = "dry_run_placeholder"` and customer-facing disclaimers.
2. Use reviewed MethodSpec deterministic pricing rules only when Commander explicitly authorizes dry-run pricing display.

Default recommendation: option 1 for first harness, because it proves contract flow without implying formal price readiness.

## 6. Minimal Flow

1. Load fixture placeholder `ProjectRequirementBrief`.
2. Load fixture placeholder `PlanPuzzleQuantityFacts`.
3. Load approved MethodSpec seed/rules.
4. Build `BudgetInputBundle`.
5. Select a small deterministic set of dry-run items from MethodSpec.
6. Attach placeholder quantity trace and review flags.
7. Build `BudgetSheetOutput` with dry-run markers.
8. Create `BudgetOutputSnapshot`-compatible object.
9. Return snapshot for Output Documents preview validation.

The entry must not call renderer directly. The integration harness may pass the returned snapshot to Output Documents in a separate step.

## 7. Requirement Form Window

Accepted in dry-run:

- placeholder `ProjectRequirementBrief`
- linked `ProjectRequirementBrief` trace

Required for production:

- verified requirement source
- explicit review decision
- no direct free-text to budget line conversion

Forbidden:

- requirement free text directly creating line items
- requirement text becoming `PricingRule`
- requirement text becoming `BudgetEstimateLine.unit_price`

## 8. Plan Puzzle SVG / Quantity Facts Window

Accepted in dry-run:

- placeholder quantity facts
- linked SVG / Plan Puzzle trace
- mock room/area/wall/opening facts with visible dry-run markers

Required for production:

- verified plan quantity source
- explicit reviewer decision
- no placeholder quantity authority

Forbidden:

- SVG area becoming production quantity
- Plancraft candidate quantity becoming formal quantity
- plan-puzzle placeholder becoming customer-facing quote evidence

## 9. Forbidden Data Flows

The minimal entry must block:

- `PriceObservation -> BudgetEstimateLine.unit_price`
- `PriceRange -> BudgetEstimateLine.unit_price`
- observed candidate price -> formal price
- raw candidate -> formal `PricingRule`
- raw candidate -> formal `MaterialSpec`
- raw candidate -> formal `LaborRule`
- raw candidate -> `BudgetOutputSnapshot`
- SVG quantity -> production quantity
- free-text requirement -> formal estimate line
- renderer -> Budget Engine
- renderer -> pricing rules
- renderer -> raw warehouse
- renderer -> MethodSpec catalog
- Output Documents -> raw warehouse
- Output Documents -> MethodSpec catalog

## 10. Explicit Non-Goals

This proposal does not authorize:

- restoring old `budget-generator.ts` without Commander decision
- formal price generation
- customer-facing quote generation
- real Excel / PDF output
- payment, escrow, listing fee
- AI API or RAG
- DB / Supabase
- production webhook
- renderer runtime changes
- raw warehouse promotion into formal catalog data

## 11. Need Commander

Yes.

Commander decision required:

- Whether to authorize implementation of the minimal dry-run Budget Engine entry.
- Whether first implementation may display reviewed MethodSpec deterministic prices, or must use zero-value placeholder amounts only.

Default recommendation:

- Authorize minimal dry-run entry with zero-value placeholder amounts and explicit `not customer-facing` markers first.

## 12. Need Reviewer

No for this docs-only proposal.

Yes before:

- any runtime implementation merge
- any `BudgetEstimateLine` / pricing rule behavior change
- any integration harness final review
- any move from placeholder/dry-run toward production or customer-facing quote behavior

## 13. Next Action

Ask Commander to authorize or reject the minimal dry-run Budget Engine entry implementation scope.