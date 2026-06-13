# Plan Puzzle Target Loop 35 Populated-State Toolbar / Inspector Regression

## 1. Commander Result

- role: B_PLAN_PUZZLE_REPAIR_COMMANDER / Plan Puzzle Repair Commander
- loop: Target Loop 35
- decision: PASS_NO_RUNTIME_PATCH_REQUIRED
- checkedAt: 2026-06-13 Asia/Taipei
- validationUrl: http://127.0.0.1:50362/src/stitch_laibe_landing_onboarding/preview_floor_plan/code.html?validation=loop35-populated-state-regression
- browserEngine: local Chrome via Playwright with explicit Chrome executable
- consoleErrors: 0
- consoleWarnings: 0
- pageErrors: 0

Loop 35 validates the current UI from a populated drawing state. The smoke creates a blank calibrated draft, draws a wall, adds door and window candidates through visible left-rail controls, places a sofa candidate, switches all inspector tabs, downloads candidate JSON, and confirms candidate-only guards.

## 2. Evidence Files

| Evidence | Path |
|---|---|
| Browser screenshot | docs/plan_puzzle_repair/PLAN_PUZZLE_TARGET_LOOP_35_POPULATED_STATE_REGRESSION.png |
| Downloaded candidate export | docs/plan_puzzle_repair/PLAN_PUZZLE_TARGET_LOOP_35_POPULATED_STATE_EXPORT.json |

## 3. Regression Matrix

| Check | Expected | Actual | Status |
|---|---|---|---|
| Page load | Current path workbench loads | Loaded on local port 50362 | PASS |
| Blank draft | User can start blank calibrated draft | Draft started | PASS |
| Draw wall | Wall can be drawn from visible tool rail | DOM wall count `1`; export walls `1` | PASS |
| Add door | Door can be added from visible tool rail | Export opening kind includes `door` | PASS |
| Add window | Window can be added from visible tool rail | Export opening kind includes `window` | PASS |
| Place furniture | Sofa can be placed from activity furniture entry | DOM furniture count `1`; export furniture `1` | PASS |
| Inspector tabs | Properties / layers / reminders / materials / overview can all become active | All five tab clicks active | PASS |
| Candidate JSON download | Download uses draft JSON filename | `laibe-plancraft-plus-draft.json` | PASS |
| Candidate JSON parse | Downloaded JSON parses | Node `JSON.parse` PASS | PASS |
| Layout object export | Furniture writes layout object candidate | `layoutObjects=1` | PASS |
| Tool catalog export | Tool catalog templates preserved | `toolCatalogItems=10` | PASS |
| Candidate-only guard | Export remains non-production | `formalEstimate=false`, `budgetEngineCalled=false`, `productionReady=false` | PASS |
| `.pc` production export | Production export remains disabled | `pcDisabled=true` | PASS |
| Console / page errors | No runtime errors | errors 0 / warnings 0 / pageErrors 0 | PASS |

## 4. Test Harness Notes

| Finding | Classification | Decision |
|---|---|---|
| Hidden toolbar door/window buttons exist but are not visible in current path layout | EXPECTED_LAYOUT_STATE | Visible left-rail controls are the active human path and passed. |
| Selected wall count is 0 at final DOM snapshot | EXPECTED_SELECTION_STATE | Final selected object is furniture after placement; wall/export evidence remains valid. |
| DOM opening count was 3 while export openings were 2 | VISUAL_LAYER_ARTIFACT_TO_MONITOR | Export correctly includes the two created candidates: door and window. Continue monitoring in future regression if this repeats with user-facing confusion. |

## 5. Guard Check

- Plancraft core touched: NO
- budget runtime touched: NO
- formalEstimateGuard changed: NO
- Budget Engine called: NO
- PricingRule / BudgetEstimateLine touched: NO
- DB / payment / AI API / LINE / n8n touched: NO
- package.json / node_modules changed: NO
- git add / stage / push / merge / PR: NO
- reset / clean / delete: NO

## 6. Next Demand

Loop 36 - Investigate the Loop 35 DOM opening count discrepancy in a read-only browser run. Determine whether it is a harmless visual layer artifact, an expected marker, or a real duplicate rendering defect; patch only if browser evidence proves user-facing duplicate openings.
