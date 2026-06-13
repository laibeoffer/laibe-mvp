# Plan Puzzle Target Loop 12C Reset Project Regression

## Summary

- role: B_PLAN_PUZZLE_REPAIR_COMMANDER
- loop: Target Loop 12C
- purpose: Verify that the visible `reset-project` action clears an active draft project and preserves guard boundaries.
- validation URL: `http://127.0.0.1:50362/src/stitch_laibe_landing_onboarding/preview_floor_plan/code.html?validation=loop12c-reset-project`
- browser method: Chrome DevTools Protocol with a populated blank millimeter draft containing wall, door, zone, furniture, and candidate JSON preview before reset.
- runtime patch: none
- console blocking errors: 0
- console warnings/errors: 0

## Scenario

The test created a populated candidate project before pressing reset:

- blank millimeter draft active
- scale calibrated
- wall count: 1
- opening count: 1
- zone count: 1
- furniture count: 1
- candidate JSON preview visible
- `.pc` production export disabled

## Browser Regression

| Check | Result | Evidence |
|---|---|---|
| page load | PASS | Plan Puzzle loaded at Loop 12C validation URL |
| console errors | PASS | `Runtime.exceptionThrown = 0`; CDP Log warnings/errors = 0 |
| populated precondition | PASS | wall/opening/zone/furniture all present before reset |
| reset clears import | PASS | `project.importSource = null`; `project.underlay = null` |
| reset clears scale | PASS | `project.scale.calibrated = false` |
| reset clears drawing data | PASS | walls/openings/zones/furniture all became 0 |
| reset clears graph state | PASS | node count and edge count became 0 |
| reset clears selection | PASS | selected wall/opening/zone/furniture all null |
| reset clears DOM drawing affordances | PASS | zone labels, furniture items, wall hit targets all 0 |
| reset clears candidate preview | PASS | Candidate JSON Preview no longer visible |
| `.pc` production export disabled | PASS | `[data-action="export-pc-spike"][disabled]` remained true |

## State Evidence

| State | Import | Scale | Walls | Openings | Zones | Furniture | Preview | Wall Hits | Zone Labels | Furniture DOM |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| populated-before-reset | true | true | 1 | 1 | 1 | 1 | true | 1 | 1 | 1 |
| after-reset | false | false | 0 | 0 | 0 | 0 | false | 0 | 0 | 0 |

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

LOOP_12C_RESET_PROJECT_PASS_NO_PATCH

The `reset-project` action is browser-verified as human-operable. It clears project data, graph state, DOM drawing affordances, selection, and candidate JSON preview while preserving disabled `.pc` production export.

