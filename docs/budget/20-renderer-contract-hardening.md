# Phase 3.1 Renderer Contract Hardening

Phase 3.1 is renderer contract hardening only. It does not create formal Excel files, PDF files, frontend UI, database migrations, RAG flows, Skills, or AI API calls.

## Snapshot-only renderer gate

Formal renderer entry must use `assertSnapshotRenderableForRenderer()`.

This wrapper accepts only renderer-safe options:

- `requireCustomerView`
- `requireInternalView`

It intentionally does not accept `methodSpecCatalog`. Method/spec validation belongs before snapshot creation or in non-renderer validation workflows. Renderer code must not resolve material bindings, read pricing rules, or rebuild estimates.

The older `assertSnapshotRenderable()` remains available for non-renderer validation and demos that need catalog-aware validation.

## Static guard

`src/lib/budget/renderers/renderer-static-guard.ts` scans the renderer formal path for forbidden imports and keywords.

Forbidden renderer references include:

- `budget-generator`
- `generateBudgetEstimate`
- `mock-pricing`
- `seed-budget-catalog`
- `material-code-resolver`
- `format-budget-output`
- `LEGACY_BUDGET_OUTPUT_WARNING`
- `rag`
- `ai`
- `openai`

Demo files are skipped because demos may generate a snapshot before calling renderer functions. Formal renderer files must stay snapshot-only.

## Runtime option validation

Renderer entry must validate runtime options, not only TypeScript union types.

Unknown `mode` values must be rejected. Unknown `format` values must be rejected. Errors should be explicit enough to diagnose bad caller input.

Allowed modes:

- `customer`
- `internal_trace`

Allowed formats:

- `structured_rows`
- `html_skeleton`
- `csv_skeleton`

## Customer warning sanitizer

Customer output must not expose internal trace keys in rows or warnings.

If snapshot warnings contain internal trace terms such as `source_id`, `recipe_id`, `quantity_formula`, `material_code`, `internal_note`, `price_source`, `confidence`, or `requires_review`, the customer renderer must replace them with customer-safe warning text.

Internal trace output may preserve full warnings.

## Serializer boundary

HTML and CSV skeleton modules are document serializers. They should receive `RenderedBudgetDocument` produced by the snapshot-gated renderer pipeline.

They are not the formal snapshot entry point. The formal entry point is `renderSnapshot()` or an equivalent wrapper that calls `assertSnapshotRenderableForRenderer()` first.

## Still out of scope

- Formal `.xlsx` file generation.
- Formal `.pdf` file generation.
- Repricing, recalculating amounts, or reading pricing rules.
- Calling budget engine from renderer code.
- Calling material resolver from renderer code.
- RAG or AI API calls.
- Legacy `formatBudgetOutput()` as a formal renderer source.
