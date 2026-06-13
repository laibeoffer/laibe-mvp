# Plan Puzzle Target Loop 18 - Professional Path Layout Polish

## Scope

- User request: make the current Plan Puzzle layout follow the path model and look more professional / intuitive.
- Path order: top file area, then left tools, center canvas, right status.
- Background color/style: preserved.
- Runtime file patched: `src/stitch_laibe_landing_onboarding/preview_floor_plan/code.html`.

## Layout Changes

| Area | Change | Result |
|---|---|---|
| Top file area | Reduced height and made sticky below site header/progress | file area stays reachable during work |
| Intro area | Hidden in the tool surface | workbench starts immediately after file path |
| Left tools | Converted large cards to compact 3-column icon rail | less text, smaller icons, faster scanning |
| Icon size | Tool icons reduced to `19px` | less toy-like, more CAD-like |
| Tool labels | Tool labels reduced to `10px`; descriptions hidden | compact rail behavior |
| Canvas | Widened and kept stable height | drawing area becomes the dominant region |
| Status panel | Kept as right column | functional separation remains left/tools, center/canvas, right/status |
| File actions | Raised sticky z-index | Candidate JSON / file controls remain clickable after tool work |

## Browser Layout Evidence

Validation URL:
`http://127.0.0.1:50362/src/stitch_laibe_landing_onboarding/preview_floor_plan/code.html?validation=loop18-professional-layout-final-full-smoke`

Viewport: `1440 x 900`

| Check | Actual | Status |
|---|---|---|
| page intro | `display: none` | PASS |
| file area | `{ x: 16, y: 214, w: 1393, h: 94 }` | PASS |
| file area position | `sticky`, top `140px`, z-index `70` | PASS |
| left tool panel | `{ x: 17, y: 323, w: 230, h: 728 }` | PASS |
| canvas shell | `{ x: 247, y: 323, w: 858, h: 728 }` | PASS |
| plan canvas | `{ x: 247, y: 323, w: 858, h: 680 }` | PASS |
| right inspector | `{ x: 1106, y: 323, w: 302, h: 728 }` | PASS |
| desktop order | tools x `<` canvas x `<` status x | PASS |
| tool grid | `repeat(3, minmax(0px, 1fr))` | PASS |
| visible tool card size | `61 x 58` | PASS |
| tool icon size | `19px` | PASS |
| tool label size | `10px` | PASS |
| descriptions hidden | `true` | PASS |
| background preserved | `true` | PASS |

## Functional Smoke Evidence

Same validation URL:
`http://127.0.0.1:50362/src/stitch_laibe_landing_onboarding/preview_floor_plan/code.html?validation=loop18-professional-layout-final-full-smoke`

| Step | Expected | Actual | Status |
|---|---|---|---|
| Blank mm draft | Top file action starts calibrated candidate workspace | `topAction=start-blank-mm-draft` | PASS |
| Draw wall | Left tool rail creates wall | DOM wall count `1`; JSON walls `1` | PASS |
| Add door/window/opening | Left opening tools create opening candidates | JSON openings `3` | PASS |
| Place wardrobe | Left furniture rail creates parametric item | DOM furniture `1`; JSON furniture `1` | PASS |
| Candidate JSON | Sticky top file action remains clickable after work | `topAction=export-draft`, preview exists | PASS |
| Guard | Candidate remains non-production | `budgetEngineCalled=false`, `formalEstimate=false`, `productionReady=false` | PASS |
| `.pc` production export | Disabled | all `.pc` controls disabled | PASS |
| Console/log | No blocking issue | `badEventCount=0` | PASS |

Note: `openingDom=4` represents multiple SVG symbols/affordances for `3` logical opening candidates. Exported JSON count is the authoritative candidate object count.

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

`LOOP_18_PROFESSIONAL_PATH_LAYOUT_POLISH_PASS`

The path-mode layout is now more professional and intuitive while preserving the functional smoke path. File actions remain reachable, the left tool area behaves like a compact icon rail, the canvas is dominant, and the right inspector remains the status/property area.

## Next Automatic Task

If no new instruction arrives in 20 minutes, run narrow viewport path-mode regression and selected-object inspector/material edit smoke.
