# Plan Puzzle Target Loop 82 - Zone / Inspector / Export Regression

## Result

LOOP_82_ZONE_INSPECTOR_EXPORT_REGRESSION_PASS_WITH_NOTES

## Purpose

Verify the current pushed Plan Puzzle repair branch still supports a human-operable room/zone workflow after the latest evidence-only commits. This loop focuses on functions that are easy to break while polishing the UI:

- Visible tool inventory
- Blank millimeter draft
- Closed wall outline
- Zone label placement
- Zone boundary editing
- Inspector tab switching
- Furniture candidate coexistence
- Candidate JSON export
- Candidate-only guard boundary

## Runtime Patch

NO runtime patch.

## Browser Evidence

- Validation URL:
  - `http://127.0.0.1:50362/src/stitch_laibe_landing_onboarding/preview_floor_plan/code.html?validation=loop82-zone-inspector-export-regression-r4`
- Machine evidence:
  - `docs/plan_puzzle_repair/loop82-zone-inspector-export-regression-r4.json`
- Tool action inventory:
  - `docs/plan_puzzle_repair/loop82-tool-action-inventory-r1.json`
- Exported candidate JSON:
  - `docs/plan_puzzle_repair/loop82-downloads/loop82-zone-inspector-export-r4.json`
- Screenshot:
  - `docs/plan_puzzle_repair/loop82-zone-inspector-export-regression-r4.png`

## Pass / Fail Matrix

| Check | Result | Evidence |
|---|---|---|
| Page load | PASS | Browser loaded the Loop 82 validation URL. |
| Console errors | PASS | `0` console errors. |
| Console warnings | PASS | `0` console warnings. |
| Page errors | PASS | `0` page errors. |
| Visible tool inventory | PASS | 35 visible buttons and 1 visible input were inventoried. |
| Blank millimeter draft | PASS | Blank draft action worked. |
| Closed wall outline | PASS | 4 walls created and available as wall hit targets. |
| Zone placement | PASS | 1 zone label created and selected. |
| Chinese zone name preservation | PASS | Runtime and exported candidate JSON preserve `客廳測試區`. |
| Boundary edit start | PASS | Boundary edit mode started with `apply-zone-boundary` present. |
| Boundary wall selection | PASS | 4 wall hit targets selected into the zone boundary draft. |
| Boundary apply | PASS | Zone boundary applied with 4 boundary edge IDs and `closed` status. |
| Inspector tabs | PASS | `屬性`, `圖層`, `提醒`, `材料`, `總覽` all switched successfully. |
| Furniture coexistence | PASS | 1 furniture candidate remained exportable after zone and tab work. |
| Candidate JSON export | PASS | Export includes 4 walls, 1 zone, 1 furniture item, and 1 layout object. |
| Candidate guard | PASS | `candidateExportBoundary.formalEstimate=false`, `budgetEngineCalled=false`, `productionReady=false`. |
| `.pc` production export | PASS | `.pc` export button remains disabled. |

## Notes

- Earlier Loop 82 diagnostic runs used weaker selectors or checked the wrong guard field location. Those local diagnostic artifacts are intentionally not committed.
- The accepted evidence is `r4`, which uses wall hit-target clicks for boundary selection and checks `candidateExportBoundary`.
- No Plancraft core, budget runtime, package files, SVG runtime package, DB/payment/API, or formal output path was touched.

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

## Next Automatic Task

Loop 83 - Current-head reviewer evidence freshness / branch sync packet, unless a new concrete browser defect is assigned first.
