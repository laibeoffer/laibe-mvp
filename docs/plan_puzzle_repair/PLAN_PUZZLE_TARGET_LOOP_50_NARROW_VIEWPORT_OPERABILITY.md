# Plan Puzzle Target Loop 50 Narrow Viewport Operability

## Result

`LOOP_50_NARROW_VIEWPORT_OPERABILITY_PASS_WITH_MINIMAL_PATCH`

## Scope

- Viewport: `430 x 820`
- Validation URL: `http://127.0.0.1:50362/src/stitch_laibe_landing_onboarding/preview_floor_plan/code.html?validation=loop50-narrow-tap-panel-scroll-r3`
- Goal: verify a narrow/mobile viewport can still reach the file area, tools, canvas, inspector, and complete the core human-test drawing flow.

## Defects Proven Before Patch

Loop 50 first run:

- `apply-auto-scale-suggestion` was visible but could not be clicked because the sticky inspector tab strip intercepted pointer events.
- This was a narrow viewport layout defect, not a scale/runtime data defect.

Loop 50 R2:

- Scale click was fixed, but narrow canvas width produced a wall too short for default door/window/opening widths.
- Door / window / opening export remained `0` because the user could not draw a normal-length wall in the shrunken mobile canvas.

## Minimal Patch

Allowed file only:

- `src/stitch_laibe_landing_onboarding/preview_floor_plan/code.html`

Patch summary:

- At `max-width: 640px`, inspector tabs become normal relative content instead of sticky, preventing tap interception.
- At `max-width: 640px`, the canvas shell allows horizontal scrolling.
- At `max-width: 640px`, the canvas keeps `min-width: 760px`, preserving enough drawing width for normal wall/opening operations.

## R3 Browser Evidence

Evidence files:

- `docs/plan_puzzle_repair/PLAN_PUZZLE_TARGET_LOOP_50_NARROW_VIEWPORT_R3_RESULT.json`
- `docs/plan_puzzle_repair/PLAN_PUZZLE_TARGET_LOOP_50_NARROW_VIEWPORT_R3.png`
- `docs/plan_puzzle_repair/PLAN_PUZZLE_TARGET_LOOP_50_NARROW_VIEWPORT_R3_EXPORT.json`

| Check | Result | Evidence |
|---|---|---|
| page load | PASS | `#planCanvas` exists |
| narrow page sections | PASS | sections present; inspector tabs relative; canvas horizontally scrollable |
| PNG import | PASS | filename scale suggestion appeared |
| scale calibration | PASS | scale status confirmed |
| draw wall | PASS | walls `1` |
| select wall | PASS | selectedWalls `1` |
| door / window / opening | PASS | opening symbols `4`; exported openings `3` |
| furniture placement | PASS | furniture `1`, handles `2`, inside handle `1` |
| furniture drag | PASS | bbox moved |
| furniture resize | PASS | bbox `905 x 302` -> `1005 x 371` |
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

## Remaining Non-completion Items

- True OCR / visual dimension-line recognition remains separate and not claimed complete.
- PDF direct preview / calibration remains intentionally unsupported.
- SVG furniture package runtime include remains blocked until reviewer / commander accepts candidate-only dispositions and a separate package integration task is authorized.

## Next Demand

`Loop 51 - Delete / undo / redo regression across wall, opening, and furniture after responsive layout patches.`
