# Plan Puzzle Target Loop 87 - Opening Inspector Regression

## Result

LOOP_87_OPENING_INSPECTOR_PASS_WITH_PATCH

## Scope

Loop 87 verifies selected opening human-operability after a real PNG underlay import and manual scale calibration. It covers wall creation, door placement, selected opening visual state, door offset/width/swing edits, changing the same selected opening into a window, window sill/height edits, changing it into an opening, candidate JSON preservation, delete, undo, redo, console health, and `.pc` production export disabled boundary.

## Runtime Patch

Patch status: YES

Patched file:

- `src/stitch_laibe_landing_onboarding/preview_floor_plan/plan-puzzle.js`

Patch summary:

- Selected opening numeric fields now use the non-reflow preview path in the `change` handler as well as the `input` handler.
- This prevents the inspector from fully re-rendering between consecutive edits such as window sill height and opening height.
- The patch is limited to selected opening `offset`, `width`, `sillHeight`, and `height` fields.

## Browser Evidence

- Validation URL: `http://127.0.0.1:50362/src/stitch_laibe_landing_onboarding/preview_floor_plan/code.html?validation=loop87-opening-inspector-r2`
- Machine evidence: `docs/plan_puzzle_repair/loop87-opening-inspector-regression-r2.json`
- Exported candidate JSON: `docs/plan_puzzle_repair/loop87-downloads/loop87-opening-inspector-export-r2.json`
- Screenshot: `docs/plan_puzzle_repair/loop87-opening-inspector-regression-r2.png` local-only, ignored by git
- Console errors: 0
- Console warnings: 0
- Page errors: 0

## Pass Matrix

| Check | Status | Evidence |
|---|---|---|
| Page load | PASS | Page opened from local validation URL |
| Fresh reload | PASS | Browser storage cleared before smoke |
| PNG import | PASS | Imported `loop83-risk-boundary-operability-r2.png`, 1508 x 709 |
| Manual scale calibration | PASS | 300 px = 3000 mm, `pxPerMm = 0.1` |
| Draw wall selected | PASS | Wall created and `.wall-line.is-selected` exists |
| Add door selected and inspectable | PASS | `kind=door`, inspector `#selected-opening-kind=door`, selected symbol exists |
| Edit door offset/width/swing | PASS | `offset=500`, `width=900`, `swing=right` |
| Change to window and edit sill/height | PASS | `kind=window`, `swing=none`, `sillHeight=950`, `height=1300` |
| Change to opening and edit width | PASS | `kind=opening`, `width=1000`, `swing=none` |
| Candidate JSON edited opening | PASS | Export preserves `kind=opening`, `offset=500`, `width=1000`, `sillHeight=950`, `height=1300` |
| Candidate export boundary | PASS | `formalEstimate=false`, `budgetEngineCalled=false`, `productionReady=false` |
| Delete selected opening | PASS | Project opening count and canvas opening count return to 0 |
| Undo after delete | PASS | Undo available and restores edited opening |
| Redo after undo | PASS | Redo deletes opening again |
| `.pc` production export disabled | PASS | `.pc` action remains disabled |
| Console errors | PASS | 0 |
| Page errors | PASS | 0 |

## Defect Proven And Fixed

| Defect | Evidence | Fix |
|---|---|---|
| Consecutive selected opening numeric edits could lose the second field update after inspector re-render. | r1 changed door to window and `sillHeight` became `950`, but `height` stayed `2100` despite filling `1300`. | `handleDocumentChange` now routes selected opening numeric fields to `previewSelectedOpeningDimensionFromField` and returns before full selected-opening render. |

## Dirty Diagnostic Artifacts Not Committed

The following failed diagnostic artifact remains local-only and is intentionally excluded from this loop packet:

- `docs/plan_puzzle_repair/loop87-opening-inspector-regression-r1.json`

## Guard Check

- Plancraft core touched: NO
- `plancraft/` touched: NO
- Budget runtime touched: NO
- Budget Engine called: NO
- PricingRule touched: NO
- BudgetEstimateLine touched: NO
- formalEstimateGuard changed: NO
- DB/payment/AI API/LINE/n8n touched: NO
- package.json/node_modules added: NO
- SVG runtime include: 0
- Formal quote/Excel/PDF generated: NO

## Decision

Loop 87 is PASS_WITH_PATCH and can be included in the Plan Puzzle human-operable evidence set. Opening inspector edits, kind transitions, export preservation, delete, undo, redo, and guard boundary are verified on the current pushed head plus the Loop87 scoped patch.

## NEXT_PLAN_PUZZLE_TASK_DEMAND

Target Loop 88 - Layer visibility and candidate export preview regression: verify wall/opening/furniture layer toggles, inspector layer state, hidden-object non-deletion, candidate JSON preview/readout preservation, and guard boundary after real PNG import.
