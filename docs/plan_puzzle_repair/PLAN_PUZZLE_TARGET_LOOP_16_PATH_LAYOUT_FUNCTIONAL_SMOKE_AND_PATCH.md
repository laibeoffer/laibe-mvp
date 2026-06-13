# Plan Puzzle Target Loop 16 - Path Layout Functional Smoke and Patch

## Scope

- Follow-up to Loop 15 path layout mode.
- Goal: prove the path layout did not break human-operable canvas actions.
- Runtime file patched: `src/stitch_laibe_landing_onboarding/preview_floor_plan/code.html`.
- Patch type: minimal CSS grid repair only.

## Defect Proven Before Patch

Validation URL:
`http://127.0.0.1:50362/src/stitch_laibe_landing_onboarding/preview_floor_plan/code.html?validation=loop16-path-layout-canvas-click-retry`

| Check | Expected | Actual Before Patch | Status |
|---|---|---|---|
| `#planCanvas` height | Canvas should have a stable human-clickable height | `{ w: 815, h: 0, x: 276, y: 563 }` | FAIL |
| Canvas click | Furniture placement click should hit canvas | Browser reported `#planCanvas` not visible | FAIL |
| Candidate data | A placed item should appear | furniture count `0` | FAIL |

Root cause:

`.canvas-shell` still used `grid-template-rows: auto minmax(0, 1fr) auto` after `.canvas-toolbar` was hidden for path mode. The hidden first grid row left the center canvas row collapsible to `0px` in the desktop path layout.

## Minimal Patch

Changed `.canvas-shell` from:

```css
grid-template-rows: auto minmax(0, 1fr) auto;
```

to:

```css
grid-template-rows: minmax(0, 1fr) auto;
```

No JavaScript was changed in this loop.

## Post-patch Browser Smoke

Validation URL:
`http://127.0.0.1:50362/src/stitch_laibe_landing_onboarding/preview_floor_plan/code.html?validation=loop16-path-layout-post-patch-functional-smoke`

Viewport: `1440 x 900`

| Check | Expected | Actual After Patch | Status |
|---|---|---|---|
| Path layout | File area remains above tool/canvas/status row | `fileAboveShell = true` | PASS |
| Desktop order | Tools, canvas, status remain left-to-right | `columnsLeftToRight = true` | PASS |
| Canvas height | Canvas has human-clickable height | `#planCanvas` rect `{ x: 276, y: 563, w: 815, h: 590 }` | PASS |
| Canvas toolbar | Old duplicated toolbar stays hidden | `.canvas-toolbar display = none` | PASS |
| Draw wall | Wall tool still writes visible wall data | DOM wall count `1`, JSON walls `1` | PASS |
| Add openings | Door/window/opening tools still write candidate openings | DOM opening symbols `4`, JSON openings `3` | PASS |
| Furniture placement | Parametric wardrobe can be placed from left tool rail | DOM furniture `1`, JSON furniture `1`, layoutObjects `1` | PASS |
| Candidate JSON | Export preview reflects current candidate draft | preview exists and includes walls/openings/furniture/layoutObjects | PASS |
| Guard | Candidate boundary stays non-production | `budgetEngineCalled=false`, `formalEstimate=false`, `productionReady=false` | PASS |
| `.pc` export | Production `.pc` export stays disabled | all `[data-action="export-pc-spike"]` controls disabled | PASS |
| Console | No blocking warnings/errors | error/warning log count `0` | PASS |

Note: DOM opening symbols count is higher than JSON opening count because swing/label affordances create multiple SVG elements per logical opening. The exported JSON count is the authoritative candidate object count.

## Guard

- Plancraft core touched: false.
- Budget runtime touched: false.
- Budget Engine called: false.
- PricingRule / BudgetEstimateLine touched: false.
- formalEstimateGuard changed: false.
- DB / payment / AI API / LINE / n8n touched: false.
- package.json / node_modules touched: false.
- `.pc` production export remains disabled.

## Decision

`LOOP_16_PATH_LAYOUT_FUNCTIONAL_SMOKE_PATCH_VERIFIED`

Path mode is now layout-verified and functionally smoke-verified for blank draft, draw wall, add door/window/opening, parametric furniture placement, candidate JSON preview, and guard boundaries.

## Next Automatic Task

If no new instruction arrives in 20 minutes, prepare the scoped Reviewer/A2 handoff packet mapping the path-mode layout patch and Loop 16 functional smoke evidence to the dirty runtime diff.
