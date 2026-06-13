# Plan Puzzle Target Loop 49 Small Viewport Operability

## Result

`LOOP_49_SMALL_VIEWPORT_OPERABILITY_PASS_WITH_MINIMAL_PATCH`

## Scope

- Viewport: `1280 x 620`
- Validation URL: `http://127.0.0.1:50362/src/stitch_laibe_landing_onboarding/preview_floor_plan/code.html?validation=loop49-small-viewport-operability-r3`
- Tool note: external Chrome Playwright was used because the in-app Browser API cannot set file input for PNG import.

## Defect Proven Before Patch

Loop 49 R2 showed the core flow worked, but furniture resize by handle did not resize the selected furniture in a constrained-height viewport.

Root cause evidence:

- R2 `furnitureResize`: `PARTIAL`
- Before / after bounding box stayed `905 x 302`
- Probe showed the corner handle center was outside the usable canvas and under the inspector area:
  - `elementFromPoint`: `BUTTON.secondary-btn`
  - selected item was large enough that the bottom-right corner handle was not reliably human-clickable in the small viewport

## Minimal Patch

Allowed files only:

- `src/stitch_laibe_landing_onboarding/preview_floor_plan/code.html`
- `src/stitch_laibe_landing_onboarding/preview_floor_plan/plan-puzzle.js`

Patch summary:

- Kept the existing corner resize handle.
- Added an inside bottom-center resize handle for large furniture objects that extend beyond the visible canvas area.
- No Plancraft core, budget runtime, API, DB, payment, package, or node_modules changes.

## R3 Browser Evidence

Evidence files:

- `docs/plan_puzzle_repair/PLAN_PUZZLE_TARGET_LOOP_49_SMALL_VIEWPORT_R3_RESULT.json`
- `docs/plan_puzzle_repair/PLAN_PUZZLE_TARGET_LOOP_49_SMALL_VIEWPORT_R3.png`
- `docs/plan_puzzle_repair/PLAN_PUZZLE_TARGET_LOOP_49_SMALL_VIEWPORT_R3_EXPORT.json`

| Check | Result | Evidence |
|---|---|---|
| small viewport structure | PASS | file area, tools, canvas, and inspector visible |
| page load | PASS | `#planCanvas` exists |
| PNG import | PASS | filename scale suggestion appeared |
| scale calibration | PASS | scale status confirmed |
| draw wall | PASS | walls `1` |
| select wall | PASS | selectedWalls `1` |
| door / window / opening | PASS | opening symbols `4`; exported openings `3` |
| furniture placement | PASS | furniture `1`, resize handles `2`, inside handle `1` |
| furniture drag | PASS | bbox moved from `(96,201)` to `(152,226)` |
| furniture resize | PASS | bbox changed from `905 x 302` to `1085 x 421`; inspector changed to `2158 x 838` |
| inspector edit | PASS | width `1230`, depth `650`, material `system_panel` |
| candidate JSON export | PASS | walls `1`, openings `3`, furniture `1`, layoutObjects `1`, toolCatalogItems `10` |
| `.pc` production export disabled | PASS | disabled buttons `3` |
| candidate guard | PASS | candidate-only guard preserved |
| console errors | PASS | `0` |
| console warnings | PASS | `0` |

## Data Guard

- `candidateExportBoundary.formalEstimate`: `false`
- `candidateExportBoundary.budgetEngineCalled`: `false`
- `candidateExportBoundary.productionReady`: `false`
- furniture `productionReady`: `false`
- furniture `notFormalEstimate`: `true`
- layoutObject `productionReady`: `false`
- layoutObject `notFormalEstimate`: `true`

## Static Checks

- `node --check src/stitch_laibe_landing_onboarding/preview_floor_plan/plan-puzzle.js`: PASS
- Forbidden scope scan: no matches for `fetch(`, `XMLHttpRequest`, `OpenAI`, `apiKey`, `generateBudgetEstimate(`, `BudgetEstimateLine`, `PricingRule`, `formalEstimateGuard =`, `payment`, `escrow`, `listing fee`, `Supabase`, `n8n`, `LINE API`
- `git diff --check`: no whitespace errors; CRLF warnings only
- staged count: `0`

## Remaining Non-completion Items

- True OCR / visual dimension-line recognition remains separate and not claimed complete.
- PDF direct preview / calibration remains intentionally unsupported.
- SVG furniture package runtime include remains blocked until reviewer / commander accepts candidate-only dispositions and a separate package integration task is authorized.

## Next Demand

`Loop 50 - Mobile/narrow viewport tap-target and panel-scroll audit for import, wall, opening, furniture, inspector, candidate JSON export, and guard boundaries.`
