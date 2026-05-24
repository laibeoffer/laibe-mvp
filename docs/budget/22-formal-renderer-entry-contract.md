# Phase 3.2 Formal Renderer Entry Contract

Phase 3.2 establishes the formal renderer entry scaffold and layout contract for future Excel and PDF output.

This phase does not create `.xlsx` files, `.pdf` files, frontend UI, database migrations, RAG flows, Skills, payment flows, escrow flows, or listing fee behavior.

## Formal Renderer Input

The formal renderer entry accepts only:

- `BudgetOutputSnapshot`
- `FormalRendererOptions`

It must not accept `BudgetEstimate`, `BudgetCatalog`, `MethodSpecCatalog`, raw candidate sources, pricing rules, material resolvers, floor plan drafts, or legacy debug output.

Formal Excel and PDF skeleton functions require a formal renderer token created by `formal-renderer-entry.ts`. The old string marker is not sufficient: direct skeleton calls or manually forged string markers must fail at runtime. This keeps formal skeletons behind the snapshot-gated entry scaffold.

## Entry Gate

The formal entry is:

```ts
renderFormalBudgetDocument(snapshot, options)
```

The first runtime gate inside this function must be:

```ts
assertSnapshotRenderableForRenderer(snapshot)
```

Invalid snapshots must be rejected before any skeleton output is produced.

## Options

`FormalRendererOptions` contains:

- `audience`: `customer` or `internal_trace`
- `format`: `excel_skeleton` or `pdf_skeleton`
- `layout_profile`: `standard_a4`, `compact_a4`, or `internal_trace_a4`
- optional `generated_at`
- optional `render_id`
- optional `title`

Runtime validation must reject:

- unknown audience
- unknown format
- unknown layout profile
- `methodSpecCatalog`

Customer output may use `standard_a4` or `compact_a4`. Internal trace output must use `internal_trace_a4`.

## Layout Contract

`FormalLayoutContract` describes layout metadata only. It does not produce a file.

It includes:

- columns and widths
- page header
- page footer
- pagination
- signature block
- totals block
- notes block
- sections
- customer / internal trace style settings

Customer columns are limited to:

- `trade_category`
- `line_no`
- `item_name`
- `unit`
- `quantity`
- `unit_price`
- `amount`
- `customer_note`

Internal trace columns may include:

- customer-safe columns
- `item_code`
- `source_type`
- `source_id`
- `recipe_id`
- `material_code`
- `quantity_formula`
- `price_source`
- `confidence`
- `requires_review`
- `internal_note`

## Skeleton Outputs

`formal-excel-renderer-skeleton.ts` returns a structured object:

- `renderer: "formal_excel_skeleton"`
- `audience`
- `layout_contract`
- `sheets`
- `rows`
- `totals`
- `warnings`

It does not create an `.xlsx` file.

`formal-pdf-renderer-skeleton.ts` returns a structured object:

- `renderer: "formal_pdf_skeleton"`
- `audience`
- `layout_contract`
- `pages`
- `sections`
- `rows`
- `totals`
- `warnings`

It does not create a `.pdf` file.

## Static Guard Command

The renderer static guard can be run with:

```bash
node --experimental-strip-types src/lib/budget/renderers/run-renderer-static-guard.ts
```

It prints:

- `valid`
- issue count
- scanned files
- skipped files
- forbidden references checked

If issues exist, the command sets a non-zero exit code.

## Forbidden Behavior

Formal renderer code must not:

- call the budget engine
- call pricing rules
- call material resolver or item-material binding lookup
- call RAG
- call AI APIs
- read candidate pricing data
- use legacy `formatBudgetOutput()`
- import raw serializers as the external formal entry

Formal renderers must keep using `BudgetOutputSnapshot` as the frozen boundary.
