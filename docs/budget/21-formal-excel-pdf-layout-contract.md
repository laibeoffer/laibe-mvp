# Formal Excel / PDF Layout Contract

This document defines what must be handled before formal Excel or PDF generation starts.

Formal renderers must extend the snapshot-only renderer pipeline. They must read `BudgetOutputSnapshot`, pass `assertSnapshotRenderableForRenderer()`, and then format already-frozen customer or internal trace data.

## Required layout concerns

Formal Excel / PDF work must define:

- Column widths for customer budget fields.
- Column widths for internal trace fields.
- Page breaks and print area rules.
- Header and footer rules.
- Signature / approval area.
- Total and subtotal area.
- Notes and assumptions area.
- Customer-visible warning area.
- Internal review warning area.
- Customer version styling.
- Internal trace version styling.

## Customer version

The customer version must read `snapshot.customer_view` only.

Customer fields are limited to:

- 工程類別
- 項次
- 品名
- 單位
- 數量
- 單價
- 金額
- 備註

Customer output must not expose internal trace fields, material codes, source ids, recipe ids, formulas, internal notes, price source objects, confidence scores, or review flags.

## Internal trace version

The internal trace version may read:

- `snapshot.internal_view`
- `snapshot.validation_report`
- `snapshot.warnings`
- `snapshot.source_summary`

It may show source references, recipe ids, material codes, quantity formulas, price sources, confidence, review flags, inclusions, exclusions, assumptions, and risks.

## Forbidden renderer behavior

Formal Excel / PDF renderers must not:

- Call the budget engine.
- Call pricing rules.
- Call material resolver or item-material binding lookup.
- Call RAG.
- Call AI APIs.
- Read candidate pricing data.
- Use legacy `formatBudgetOutput()` as the formal source.

## File generation boundary

Phase 3.1 does not generate formal Excel or PDF files.

Before Phase 3.2 creates any real file renderer, the renderer skeleton must keep passing:

- Snapshot-only gate.
- Runtime option validation.
- Customer warning sanitizer.
- Static guard scan.
- Invalid snapshot rejection.

## Future extension

Future Excel and PDF renderers should take `RenderedBudgetDocument` produced by `renderSnapshot()` or an equivalent snapshot-gated entry. They may add layout metadata, workbook or page options, and styling, but they must not rerun estimate generation or pricing logic.
