# No-skip Flow Rules

Workstream: `budget/input-flow-gate`

## Rule

A user may not skip directly from incomplete requirement intake or incomplete plan context into budget preview or formal quote.

## Required Sequence

1. Requirement intake reaches `complete`.
2. File intake gaps are linked, verified, or explicitly unavailable with review flags.
3. Plan Puzzle context reaches `verified` for dry-run preview.
4. Budget Preview remains dry-run / review-required.
5. Formal budget remains blocked until future authorized runtime and formal pricing gates exist.

## Blocked Skip Paths

- Requirement draft -> Budget Preview
- Requirement draft -> Formal Quote
- Plan placeholder -> Formal Budget
- Uploaded quote file -> `BudgetEstimateLine.unit_price`
- Quote Factory `PriceRange` -> formal price
- SVG placeholder quantity -> production quantity
- AI explanation -> formal pricing rule

## Required User Feedback

When blocked, the product should show the missing requirement, file, or plan context category and route the user back to the correct step.

## Docs-only Boundary

This file defines rules only. It does not change routing, CTA runtime behavior, Budget Engine, or Renderer.
