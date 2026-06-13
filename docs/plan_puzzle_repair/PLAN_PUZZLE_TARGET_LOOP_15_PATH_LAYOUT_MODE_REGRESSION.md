# Plan Puzzle Target Loop 15 - Path Layout Mode Regression

## Scope

- Request: adjust layout into path mode while preserving the existing background color/style.
- Required desktop path: top file area, then left tools, center canvas, right status area.
- Runtime files touched in this loop: `src/stitch_laibe_landing_onboarding/preview_floor_plan/code.html`.
- Plancraft sample reference checked: `Z:\08-Jacky\laibe_MVP_project\laibe_project\plancraft\sample.pdf`.

## Desktop Browser Evidence

Validation URL:
`http://127.0.0.1:50362/src/stitch_laibe_landing_onboarding/preview_floor_plan/code.html?validation=path-layout-mode-desktop-actual-selectors`

Viewport: `1440 x 900`

| Check | Expected | Actual | Status |
|---|---|---|---|
| File area | Top file area is visible above workbench | `.file-area` rect `{ x: 16, y: 226, w: 1393, h: 150 }` | PASS |
| File above workbench | File area precedes tool/canvas/status row | `fileAboveShell = true` | PASS |
| Left-to-right path | Tools, canvas, status ordered left to right | tools x `17`, canvas x `276`, status x `1091`; `columnsLeftToRight = true` | PASS |
| Top file actions | Import / blank draft / calibrate / reset / candidate JSON available | all file-area actions present; `.pc` disabled | PASS |
| Old left import group | Import controls removed from left tool section | `#plan-tools-import display = none` | PASS |
| Old canvas toolbar | Canvas toolbar no longer occupies the center top | `.canvas-toolbar display = none` | PASS |
| Background | Existing page background style is preserved | body background still includes radial and linear gradients | PASS |
| Console | No browser errors or warnings | error/warning log count `0` | PASS |

## Narrow Viewport Evidence

Validation URL:
`http://127.0.0.1:50362/src/stitch_laibe_landing_onboarding/preview_floor_plan/code.html?validation=path-layout-mode-browser-final`

Observed narrow in-app browser viewport:

| Check | Expected | Actual | Status |
|---|---|---|---|
| File area remains first | File area stays above workbench | `fileAboveShell = true` | PASS |
| Responsive stacking | Existing narrow/mobile behavior may stack content | canvas/tool/status stack instead of desktop 3-column | PASS |
| File actions | Actions stay accessible without horizontal overflow | file-area actions visible; `.pc` disabled | PASS |
| Console | No browser errors or warnings | error/warning log count `0` | PASS |

## Sample PDF Smoke

Reference file:
`Z:\08-Jacky\laibe_MVP_project\laibe_project\plancraft\sample.pdf`

| Check | Expected | Actual | Status |
|---|---|---|---|
| File exists | sample PDF is readable | size `168970`, mtime `2026-05-31 15:15:12 Asia/Taipei` | PASS |
| PDF boundary | PDF import is interface-visible but direct PDF preview remains unsupported | Existing helper text keeps PDF as future import pipeline / convert-to-JPG/PNG path | PASS_WITH_BOUNDARY |
| File modified | Smoke must not alter source PDF | No write action performed against sample PDF | PASS |

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

`LOOP_15_PATH_LAYOUT_MODE_PASS_WITH_PDF_BOUNDARY`

The Plan Puzzle page now presents a desktop path layout with the file area on top and the working row ordered as tools, canvas, and status. The existing visual background is preserved. PDF is accepted as a visible import path but remains bounded by the existing non-production PDF preview limitation.

## Follow-up Functional Finding

Loop 15 was layout-only evidence. Loop 16 later proved a functional regression: `#planCanvas` collapsed to `0px` height after the old canvas toolbar was hidden. Loop 16 patched `.canvas-shell` grid rows and re-ran functional smoke. Use Loop 16 as the authoritative functional post-layout evidence.

## Next Automatic Task

If no new instruction arrives in 20 minutes, prepare a scoped reviewer/A2 handoff packet that maps Loop 15 layout evidence to the dirty runtime diff, without staging, pushing, or widening scope.
