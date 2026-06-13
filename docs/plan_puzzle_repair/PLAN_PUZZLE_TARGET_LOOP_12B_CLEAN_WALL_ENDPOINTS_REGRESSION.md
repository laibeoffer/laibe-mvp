# Plan Puzzle Target Loop 12B Clean Wall Endpoints Regression

## Summary

- role: B_PLAN_PUZZLE_REPAIR_COMMANDER
- loop: Target Loop 12B
- purpose: Verify that the visible `clean-wall-endpoints` action performs real endpoint cleanup and preserves candidate JSON export guard boundaries.
- validation URL: `http://127.0.0.1:50362/src/stitch_laibe_landing_onboarding/preview_floor_plan/code.html?validation=loop12b-clean-wall-endpoints`
- browser method: Chrome DevTools Protocol with blank millimeter draft, wall drawing, wall inspector coordinate edits, `clean-wall-endpoints`, and candidate JSON preview.
- runtime patch: none
- console blocking errors: 0
- console warnings/errors: 0

## Scenario

The test created two human-visible wall segments, then used the wall inspector to make their adjacent endpoints 20 mm apart:

| Wall | Before Cleanup |
|---|---|
| wall A | from `{ x: 1000, y: 1000 }` to `{ x: 2000, y: 1000 }` |
| wall B | from `{ x: 2020, y: 1000 }` to `{ x: 3000, y: 1000 }` |

Because the endpoints were within the cleanup merge threshold of 30 mm, `clean-wall-endpoints` should merge them to their averaged point.

## Browser Regression

| Check | Result | Evidence |
|---|---|---|
| page load | PASS | Plan Puzzle loaded at Loop 12B validation URL |
| console errors | PASS | `Runtime.exceptionThrown = 0`; CDP Log warnings/errors = 0 |
| blank draft | PASS | Candidate-only blank millimeter draft active |
| first wall setup | PASS | Wall A inspector coordinates became `1000,1000 -> 2000,1000` |
| second wall setup | PASS | Wall B inspector coordinates became `2020,1000 -> 3000,1000` |
| cleanup action | PASS | Adjacent endpoints merged to `{ x: 2010, y: 1000 }` |
| node graph | PASS | node count changed to 3 for two connected wall segments |
| wall graph message | PASS | UI message reported 2 endpoints cleaned and wallGraph rebuilt |
| candidate JSON preview | PASS | preview current and contains `walls` |
| `.pc` production export disabled | PASS | `[data-action="export-pc-spike"][disabled]` remained true |

## Post-Cleanup Data Evidence

```json
[
  {
    "from": { "x": 1000, "y": 1000 },
    "to": { "x": 2010, "y": 1000 },
    "length": 1010
  },
  {
    "from": { "x": 2010, "y": 1000 },
    "to": { "x": 3000, "y": 1000 },
    "length": 990
  }
]
```

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

LOOP_12B_CLEAN_WALL_ENDPOINTS_PASS_NO_PATCH

The `clean-wall-endpoints` action is now browser-verified as human-operable. It mutates wall endpoint data, rebuilds graph state, gives a visible completion message, and preserves candidate-only export boundaries.

