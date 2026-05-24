# Phase 2.9.2 Renderer Gate And Legacy Output Guard

Phase 2.9.2 only defines the renderer entry guard. It does not implement Excel, PDF, frontend, database persistence, RAG, AI API calls, or formal quotation output.

## 1. Snapshot-Only Renderer Input

Future Excel / PDF renderers must read `BudgetOutputSnapshot` only.

The renderer must not rebuild a budget from `Project`, `LayoutObject`, `MethodRecipe`, `PricingRule`, or `MaterialSpec`. Rendering is a formatting step after the estimate output has already been frozen into a snapshot.

## 2. Fresh Validation At Renderer Entry

Every renderer entry must call:

```ts
validateBudgetOutputSnapshot(snapshot, methodSpecCatalog)
```

If validation returns `valid: false`, the renderer must reject output. It must not "repair" the snapshot, silently skip rows, or regenerate missing data.

## 3. Forbidden Renderer Calls

Renderer code must not call:

- `generateBudgetEstimate()`
- pricing rules
- material resolver
- RAG retrieval
- AI API
- catalog intake or candidate price workflows

Renderer code must not read candidate prices, raw historical quote lines, or AI-generated price suggestions.

## 4. Customer And Internal Outputs

Customer-facing Excel / PDF must be rendered from `snapshot.customer_view`.

Internal trace / review output must be rendered from:

- `snapshot.internal_view`
- `snapshot.validation_report`
- `snapshot.warnings`
- `snapshot.source_summary`

The customer view must not expose `source_id`, `recipe_id`, `quantity_formula`, `internal_note`, `material_code`, or other internal trace fields.

## 5. Renderer Gate

`assertSnapshotRenderable()` is the pre-render safety gate.

It must:

- call `validateBudgetOutputSnapshot()`
- reject invalid snapshots
- require `customer_view` by default
- optionally require `internal_view`
- return explicit errors and warnings

It must not:

- call `generateBudgetEstimate()`
- call material resolver
- inspect pricing rules
- call RAG or AI

## 6. Legacy Output Guard

`src/lib/budget/format-budget-output.ts` is legacy debug output only.

It may expose internal trace fields and is not customer-safe. It exists to keep Phase 1 demos stable, but it must not be used as the source for formal Excel / PDF renderers.

Formal renderers must read `BudgetOutputSnapshot` only.
