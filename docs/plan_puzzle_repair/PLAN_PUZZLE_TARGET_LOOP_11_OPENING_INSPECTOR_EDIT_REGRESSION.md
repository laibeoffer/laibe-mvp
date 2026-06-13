# Plan Puzzle Target Loop 11 Opening Inspector Edit Regression

## Summary

- role: B_PLAN_PUZZLE_REPAIR_COMMANDER
- loop: Target Loop 11
- purpose: Close the focused door / window / opening edit evidence gap from the human-operable bug queue.
- validation URL before patch: `http://127.0.0.1:50362/src/stitch_laibe_landing_onboarding/preview_floor_plan/code.html?validation=loop11-opening-edit-cdp`
- validation URL after patch: `http://127.0.0.1:50362/src/stitch_laibe_landing_onboarding/preview_floor_plan/code.html?validation=loop11-opening-edit-after-patch`
- browser method: Chrome DevTools Protocol with temporary PNG import, visible scale calibration, canvas wall draw, inspector field edits, candidate JSON preview, and Delete key.
- runtime patch:
  - `src/stitch_laibe_landing_onboarding/preview_floor_plan/plan-puzzle.js`
- console blocking errors after patch: 0
- console warnings/errors after patch: 0

## Defect Proven Before Patch

The pre-patch browser run proved this defect:

| Area | Pre-patch Result | Evidence |
|---|---|---|
| Door add / export / delete | PASS | Door was attached to wall, exported, and deleted |
| Door inspector offset | FAIL | Intended offset `500`; project kept initial offset `1151` |
| Door inspector width | NOT PROVEN CHANGED | Intended width matched default `900`; width field path did not prove mutation |
| Door inspector swing | PASS | Swing changed from `left` to `right` |
| Window inspector offset / width / sill / height | FAIL | Intended offset `700`, width `1100`, sill `950`, height `1200`; project kept initial `1001`, `1200`, `900`, `1200` |
| Generic opening inspector offset / height | FAIL | Intended offset `800`, height `2100`; project kept initial `1101`, `null` |
| Console | PASS | 0 blocking errors |

## Root Cause

`handleDocumentInput` handled current opening defaults, selected zones, selected furniture, and style visual fields, but did not handle `selected-opening-*` numeric fields. The selected opening inspector only updated through `change`, so normal typing/input in number fields did not reliably update project data until a change event path occurred.

## Minimal Patch

Added input-event handling for selected opening numeric fields:

- `selected-opening-offset`
- `selected-opening-width`
- `selected-opening-sill-height`
- `selected-opening-height`

The patch calls `updateSelectedOpeningFromField(input)` and returns. Select fields such as `kind` and `swing` remain on the existing change-event path.

## Post-Patch Browser Regression

| Check | Result | Evidence |
|---|---|---|
| page load | PASS | Plan Puzzle loaded at Loop 11 validation URL |
| console errors | PASS | `Runtime.exceptionThrown = 0`; CDP Log warnings/errors = 0 |
| PNG import + calibration + base wall | PASS | `project.walls.length = 1`; node graph edge available |
| door add | PASS | Project contains `kind: door` attached to selected wall |
| door edit | PASS | `offset: 500`, `width: 900`, `swing: right`, `height: 2100` |
| door export | PASS | Candidate JSON preview current and contains `openings` |
| door delete | PASS | `project.openings.length = 0` after Delete |
| window add | PASS | Project contains `kind: window` attached to selected wall |
| window edit | PASS | `offset: 700`, `width: 1100`, `sillHeight: 950`, `height: 1200` |
| window export | PASS | Candidate JSON preview current and contains `openings` |
| window delete | PASS | `project.openings.length = 0` after Delete |
| generic opening add | PASS | Project contains `kind: opening` attached to selected wall |
| generic opening edit | PASS | `offset: 800`, `width: 1000`, `height: 2100` |
| generic opening export | PASS | Candidate JSON preview current and contains `openings` |
| generic opening delete | PASS | `project.openings.length = 0` after Delete |
| `.pc` production export disabled | PASS | `[data-action="export-pc-spike"][disabled]` remained true |

## Post-Patch Data Evidence

```json
{
  "doorAfterEdit": [
    {
      "kind": "door",
      "offset": 500,
      "width": 900,
      "swing": "right",
      "sillHeight": null,
      "height": 2100
    }
  ],
  "windowAfterEdit": [
    {
      "kind": "window",
      "offset": 700,
      "width": 1100,
      "swing": "none",
      "sillHeight": 950,
      "height": 1200
    }
  ],
  "openingAfterEdit": [
    {
      "kind": "opening",
      "offset": 800,
      "width": 1000,
      "swing": "none",
      "sillHeight": null,
      "height": 2100
    }
  ]
}
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

LOOP_11_OPENING_INSPECTOR_EDIT_PATCH_VERIFIED

Door / window / generic opening inspector editing is now browser-verified for human-operable offset / width / swing / height fields, candidate JSON preview, and selected-object Delete behavior.

