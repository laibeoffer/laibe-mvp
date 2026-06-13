# Plan Puzzle Target Loop 10 PNG Import CDP Regression

## Summary

- role: B_PLAN_PUZZLE_REPAIR_COMMANDER
- loop: Target Loop 10
- purpose: Prove the actual PNG file-input path, calibration path, wall path, opening path, candidate JSON preview path, and disabled `.pc` boundary with browser operation evidence.
- runtime files changed in this loop: none
- validation method: Chrome DevTools Protocol with a temporary PNG assigned to `#planImportInput` through the browser file input, then canvas interaction through browser mouse events.
- validation URL: `http://127.0.0.1:50362/src/stitch_laibe_landing_onboarding/preview_floor_plan/code.html?validation=loop10-png-import-cdp-scroll`
- temporary PNG: `C:\Users\USER\AppData\Local\Temp\plan-puzzle-loop10-JTlqlt\loop10-test-plan.png`
- console blocking errors: 0
- console warnings/errors from CDP Log domain: 0

## Why This Loop Was Needed

Previous human-operable browser evidence proved the blank millimeter draft path. The in-app Browser could not directly provide a file-upload primitive, so actual PNG import still needed a browser-level proof. Loop 10 uses Chrome CDP to exercise the real file input path without editing runtime state directly.

## Tooling Note

An initial CDP attempt uploaded the PNG successfully but clicked the SVG canvas while it was below the visible headless viewport. That produced `mode=calibrate` but `calibrationPoints=0`. The validated run fixed the test harness by setting a stable viewport and calling `scrollIntoView` before canvas pointer events. The passing result is therefore a product-path pass and a test-harness correction, not a runtime patch.

## Browser Functional Smoke

| Check | Result | Evidence |
|---|---|---|
| page load | PASS | `#planCanvas` loaded; `.pc` export control disabled on load |
| console errors | PASS | `Runtime.exceptionThrown = 0`; CDP Log warnings/errors = 0 |
| PNG import | PASS | `project.underlay = true`; `project.importSource.previewSupported = true` |
| scale calibration | PASS | after two visible canvas clicks and known length `2000`, `project.scale.calibrated = true` |
| draw wall | PASS | after draw-wall canvas clicks, `project.walls.length = 1` |
| add window | PASS | after window action, `project.openings = [{ kind: "window", widthMm: 1200, offsetMm: 1000 }]` |
| candidate JSON export | PASS | candidate export preview visible, `previewStatus = current`, JSON preview contains `candidateExportBoundary` and `openings` |
| `.pc` production export disabled | PASS | `[data-action="export-pc-spike"][disabled]` remained true |
| Delete selected opening | PASS | pressing Delete after selected window changed `project.openings.length` from 1 to 0 |

## Key State Trace

| Step | Underlay | Scale | Mode | Points | Walls | Openings | Preview | `.pc` Disabled |
|---|---:|---:|---|---:|---:|---|---:|---:|
| page-load | false | false | select | 0 | 0 | none | false | true |
| png-upload | true | false | select | 0 | 0 | none | false | true |
| calibration-points | true | false | calibrate | 2 | 0 | none | false | true |
| scale-calibration | true | true | select | 2 | 0 | none | false | true |
| draw-wall | true | true | draw-wall | 2 | 1 | none | false | true |
| add-window | true | true | draw-wall | 2 | 1 | window | false | true |
| export | true | true | draw-wall | 2 | 1 | window | true/current | true |
| delete | true | true | draw-wall | 2 | 1 | none | true/stale_after_edits | true |

## Guard Result

- Plancraft core touched: false
- budget runtime touched: false
- Budget Engine called: false
- formalEstimateGuard changed: false
- PricingRule / BudgetEstimateLine touched: false
- DB / payment / AI API / LINE / n8n touched: false
- package.json / node_modules added: false
- `.pc` production export enabled: false

## Decision

LOOP_10_PNG_IMPORT_CDP_REGRESSION_PASS

The actual PNG import path is now browser-verified with calibration, wall, window, candidate JSON preview, disabled `.pc` boundary, and Delete-key selected opening behavior. No runtime patch was required for Loop 10.

## Remaining Boundary

SVG furniture package runtime include remains blocked by design until reviewer / commander accepts candidate dispositions and authorizes a separate package integration task.

