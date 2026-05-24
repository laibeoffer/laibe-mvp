# Phase 3.0 Excel / PDF Renderer Skeleton

This phase establishes the renderer entry shape for future Excel / PDF output.
It does not generate formal Excel files, PDF files, frontend views, database rows,
AI output, or RAG output.

## 1. Snapshot-only input

Renderers must read `BudgetOutputSnapshot` only. A renderer must not accept
`BudgetEstimate`, `BudgetCatalog`, `MethodSpecCatalog`, pricing rules, raw floor
plan data, or catalog candidate data as its formal input.

## 2. Renderer gate first

Every renderer entry must call `assertSnapshotRenderable()` before producing
rows, HTML, CSV, Excel, PDF, or any other output. If the gate returns
`allowed: false`, the renderer must reject output.

## 3. Customer view

The customer renderer may use `snapshot.customer_view` only. Customer output is
limited to the traditional budget sheet fields:

- 工程類別
- 項次
- 品名
- 單位
- 數量
- 單價
- 金額
- 備註

Customer output must not contain `source_id`, `recipe_id`, `quantity_formula`,
`internal_note`, `material_code`, or other internal trace fields.

## 4. Internal trace view

The internal trace renderer may use `snapshot.internal_view` and the snapshot
validation report. It may expose trace fields needed for review, including item
codes, source references, recipe ids, material codes, formulas, price sources,
confidence, review flags, inclusions, exclusions, assumptions, and risks.

## 5. No repricing

Renderers must not decide prices. They must not recalculate `unit_price`,
`amount`, totals, or management fee rules. Renderers display values already
stored in the snapshot.

## 6. No budget engine calls

Renderers must not call `generateBudgetEstimate()` or any budget engine flow.
If a new estimate is needed, it must be generated before the renderer receives
the snapshot.

## 7. No material resolver calls

Renderers must not call material resolvers or item-material binding logic.
Material trace data must already be frozen inside the snapshot.

## 8. No RAG / AI API

Renderers must not call RAG, AI APIs, external crawlers, or candidate catalog
intake tools. Output must be deterministic from the snapshot.

## 9. Skeleton only

This phase only creates structured rows, simple HTML skeleton strings, and CSV
skeleton strings. It intentionally does not create formal `.xlsx` or `.pdf`
files.

## 10. Future extension

Formal Excel and PDF renderers should extend this skeleton by reading the same
`RenderedBudgetDocument` model after passing the renderer gate. They must keep
the same snapshot-only boundary and must not use legacy `formatBudgetOutput()`
as a formal source.
