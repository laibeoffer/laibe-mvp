# Plan Puzzle Target Loop 84 - Current Head Full Smoke

## Result

LOOP_84_CURRENT_HEAD_FULL_SMOKE_PASS_WITH_NOTES

## Purpose

Run a compact full workflow browser smoke after the Loop 83 guard-message patch. This loop verifies the path most likely to regress in real human use:

- Actual PNG import through the file input
- Manual two-point scale calibration
- Wall drawing
- Door / window / opening placement
- Furniture candidate placement
- Inspector material / overview tab access
- Candidate JSON export
- Candidate-only guard
- `.pc` production export disabled

## Runtime Patch

NO runtime patch in Loop 84.

## Browser Evidence

- Validation URL:
  - `http://127.0.0.1:50362/src/stitch_laibe_landing_onboarding/preview_floor_plan/code.html?validation=loop84-current-head-full-smoke-r2`
- Imported PNG:
  - `docs/plan_puzzle_repair/loop83-risk-boundary-operability-r2.png`
- Machine evidence:
  - `docs/plan_puzzle_repair/loop84-current-head-full-smoke-r2.json`
- Exported candidate JSON:
  - `docs/plan_puzzle_repair/loop84-downloads/loop84-current-head-full-smoke-export-r2.json`
- Screenshot:
  - `docs/plan_puzzle_repair/loop84-current-head-full-smoke-r2.png`

## Pass / Fail Matrix

| Check | Result | Evidence |
|---|---|---|
| Page load | PASS | Browser loaded the Loop 84 validation URL. |
| Console errors | PASS | `0` console errors. |
| Console warnings | PASS | `0` console warnings. |
| Page errors | PASS | `0` page errors. |
| PNG import | PASS | Imported PNG is accepted as `underlay-image`; natural size detected as `1508 x 709`. |
| Auto-scale boundary | PASS | Filename had no dimension clue, so the app correctly required manual two-point calibration. |
| Manual scale calibration | PASS | `3000 mm = 300 px`, resulting in `pxPerMm = 0.1`. |
| Draw wall | PASS | 1 wall created and selected after calibration. |
| Door / window / opening | PASS | 3 openings created. |
| Furniture placement | PASS | 1 furniture candidate created and selected. |
| Material tab | PASS | Material inspector tab is accessible. |
| Overview tab | PASS | Overview inspector tab is accessible after object creation. |
| Candidate JSON export | PASS | Export includes 1 wall, 3 openings, 1 furniture item, and 1 layout object. |
| Candidate guard | PASS | `candidateExportBoundary.formalEstimate=false`, `budgetEngineCalled=false`, `productionReady=false`. |
| `.pc` production export | PASS | `.pc` export button remains disabled. |

## Guard Check

- Plancraft core touched: NO
- `plancraft/` touched: NO
- Budget runtime touched: NO
- Budget Engine called: NO
- `formalEstimateGuard` changed: NO
- `PricingRule` / `BudgetEstimateLine` touched: NO
- DB / payment / AI API / LINE / n8n touched: NO
- `package.json` / `node_modules` touched: NO
- SVG furniture runtime include: 0
- Formal quote / Excel / PDF generated: NO

## Notes

- Loop 84 r1 was a timing/selector diagnostic run for the calibration input and is not committed.
- `loop84-calibration-debug-r1.json` is diagnostic-only and is not committed.
- Accepted evidence is `r2`.

## Next Automatic Task

Loop 85 - Current-head reviewer / A2 freshness packet mapping pushed HEAD to the accepted evidence set.
