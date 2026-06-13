# Plan Puzzle Target Loop 12A Zone Boundary Regression

## Summary

- role: B_PLAN_PUZZLE_REPAIR_COMMANDER
- loop: Target Loop 12A
- purpose: Verify zone placement, zone inspector editing, boundary edge selection, candidate JSON preview evidence, and guard boundaries.
- validation URL before patch: `http://127.0.0.1:50362/src/stitch_laibe_landing_onboarding/preview_floor_plan/code.html?validation=loop12a-zone-boundary-cdp`
- validation URL after patch: `http://127.0.0.1:50362/src/stitch_laibe_landing_onboarding/preview_floor_plan/code.html?validation=loop12a-zone-boundary-after-patch`
- browser method: Chrome DevTools Protocol with temporary PNG import, visible scale calibration, canvas wall draw, zone placement, zone label selection, inspector edit, boundary edge selection, candidate JSON preview.
- runtime patch:
  - `src/stitch_laibe_landing_onboarding/preview_floor_plan/plan-puzzle.js`
- console blocking errors after patch: 0
- console warnings/errors after patch: 0

## Defect Proven Before Patch

Zone placement, zone inspector editing, boundary mode, boundary edge selection, and boundary apply all worked before patch. The defect was in browser-verifiable candidate JSON evidence:

| Area | Pre-patch Result | Evidence |
|---|---|---|
| Zone placement | PASS | `project.zones.length = 1`; `.zone-label` visible |
| Zone selection | PASS | selected zone inspector present |
| Zone edit | PASS | name, type, label X/Y updated project data |
| Boundary edit mode | PASS | `uiState.mode = edit-zone-boundary` |
| Boundary edge selection | PASS | draft `selectedBoundaryEdgeIds.length = 1` |
| Boundary apply | PASS | zone persisted `boundaryStatus = open`, `boundaryIssues = zone-boundary-too-few-edges` |
| Candidate JSON preview | FAIL | Preview was current but did not include `"zones"` or `boundaryStatus`; full payload had zones but the visible preview slice omitted them |

## Root Cause

`createDraftExportPreview` built a browser-verifiable preview payload with walls, openings, furniture, tool catalog items, layout objects, and candidate export boundary, but omitted `payload.zones`. This made zone / boundary export unverifiable in the browser, even though the full downloaded JSON payload contained zone data.

## Minimal Patch

`createDraftExportPreview` now includes:

- `zones: payload.zones || []`
- `zoneCount`
- `openZoneBoundaryCount`

`renderCandidateExportPreviewCard` now displays:

- `zones`
- `openZoneBoundaries`

## Post-Patch Browser Regression

| Check | Result | Evidence |
|---|---|---|
| page load | PASS | Plan Puzzle loaded at Loop 12A validation URL |
| console errors | PASS | `Runtime.exceptionThrown = 0`; CDP Log warnings/errors = 0 |
| PNG import + calibration + base wall | PASS | `project.walls.length = 1`; node graph edge available |
| zone placement mode | PASS | `uiState.mode = place-zone` after `start-place-zone` |
| zone created | PASS | `project.zones.length = 1`; `.zone-label` count = 1 |
| zone selectable | PASS | selected zone inspector present |
| zone edit | PASS | `name = Loop 12A Living Zone`, `type = living`, `labelPosition = { x: 1200, y: 1400 }` |
| boundary mode | PASS | `uiState.mode = edit-zone-boundary`; apply boundary button enabled |
| boundary edge selected | PASS | draft `selectedBoundaryEdgeIds.length = 1` |
| boundary applied | PASS | zone `boundaryEdgeIds.length = 1`; `boundaryStatus = open` |
| candidate JSON preview | PASS | preview current and contains `"zones"`, `boundaryStatus`, and `Loop 12A Living Zone` |
| `.pc` production export disabled | PASS | `[data-action="export-pc-spike"][disabled]` remained true |

## Post-Patch Zone Data Evidence

```json
{
  "name": "Loop 12A Living Zone",
  "type": "living",
  "labelPosition": {
    "x": 1200,
    "y": 1400
  },
  "boundaryEdgeIds": [
    "edge-wall-1781323379385-db4bb3"
  ],
  "boundaryWallIds": [
    "wall-1781323379385-db4bb3"
  ],
  "boundaryStatus": "open",
  "boundaryIssues": [
    "zone-boundary-too-few-edges"
  ],
  "polygonCount": 0,
  "area": null
}
```

## Boundary Decision

The tested single-wall boundary correctly remains `open` with `zone-boundary-too-few-edges`. This is not a runtime failure. It is the expected candidate boundary warning for an incomplete zone boundary and is useful upstream evidence for budget candidate warnings.

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

LOOP_12A_ZONE_BOUNDARY_PATCH_VERIFIED

Zone placement, zone inspector editing, boundary edge selection, open-boundary warning persistence, and browser-verifiable candidate JSON preview are now human-test usable.

