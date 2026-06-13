# Plan Puzzle Target Loop 39 Layer Visibility Regression

## 1. Commander Result

- role: B_PLAN_PUZZLE_REPAIR_COMMANDER / Plan Puzzle Repair Commander
- loop: Target Loop 39
- decision: PASS_WITH_MINIMAL_RUNTIME_PATCH
- checkedAt: 2026-06-13 Asia/Taipei
- validationUrl: http://127.0.0.1:50362/src/stitch_laibe_landing_onboarding/preview_floor_plan/code.html?validation=loop39-layer-visibility-regression
- browserEngine: local Chrome via Playwright with explicit Chrome executable
- consoleErrors: 0
- consoleWarnings: 0
- pageErrors: 0

Loop 39 targets a remaining mainstream human-operability gap: layer / overlay visibility. The browser repro proved that toggling a layer showed mixed English status text (`牆體 layer hidden.`), which violates the full-Chinese and intuitive-UI requirement. A minimal runtime patch changed the status message to Chinese and regression confirmed layer visibility behavior and export integrity.

## 2. Runtime Patch

| File | Patch |
|---|---|
| src/stitch_laibe_landing_onboarding/preview_floor_plan/plan-puzzle.js | Changed layer toggle status message from `layer shown/hidden` to Chinese `圖層已顯示 / 圖層已隱藏`. |

No Plancraft core, budget runtime, package, DB, payment, AI, LINE, n8n, or production export path was touched.

## 3. Evidence Files

| Evidence | Path |
|---|---|
| Browser screenshot | docs/plan_puzzle_repair/PLAN_PUZZLE_TARGET_LOOP_39_LAYER_VISIBILITY_REGRESSION.png |
| Candidate JSON export | docs/plan_puzzle_repair/PLAN_PUZZLE_TARGET_LOOP_39_LAYER_VISIBILITY_EXPORT.json |

## 4. Regression Matrix

| Check | Expected | Actual | Status |
|---|---|---|---|
| Repro | Existing layer toggle message should not contain English | Repro found `牆體 layer hidden.` before patch | DEFECT_PROVEN |
| Wall layer hide | Wall layer should hide without deleting data | `wallLayerDisplay=none` | PASS |
| Opening layer hide | Opening layer should hide without deleting data | `openingLayerDisplay=none` | PASS |
| Furniture layer hide | Furniture item should hide without deleting data | furniture display `none` | PASS |
| Wall layer show | Wall layer should return after re-toggle | `wallLayerDisplay=block` | PASS |
| Opening layer show | Opening layer should return after re-toggle | `openingLayerDisplay=block` | PASS |
| Furniture layer show | Furniture item should return after re-toggle | furniture display `grid` | PASS |
| Status text | No `layer / shown / hidden` English text remains after toggle | `hasEnglishLayerText=false` after hide and show | PASS |
| Candidate JSON export | Data should remain after visibility toggles | walls 1, openings 1, furniture 1, layoutObjects 1, toolCatalogItems 10 | PASS |
| Candidate guard | Export remains draft-only | `formalEstimate=false`, `budgetEngineCalled=false`, `productionReady=false` | PASS |
| `.pc` production export | Production export remains disabled | `pcDisabled=true` | PASS |
| Console / page errors | No runtime errors | errors 0 / warnings 0 / pageErrors 0 | PASS |

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

Loop 40 - Run focused undo / redo after layer visibility toggles and object creation. Confirm the Chinese layer-toggle history label is stable, undo / redo does not corrupt visibility state, and candidate export remains draft-only.
