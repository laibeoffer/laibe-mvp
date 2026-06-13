# Plan Puzzle Target Loop 71 - Zone Boundary Regression

## Result

LOOP_71_ZONE_BOUNDARY_REGRESSION_PASS_AFTER_MINIMAL_PATCH

## Context

- checkedAt: 2026-06-14 00:23:05 +08:00
- role: B_PLAN_PUZZLE_REPAIR_COMMANDER
- worktree: Z:\08-Jacky\laibe_MVP_project\_codex_worktrees\laibe_project\plan-puzzle-test-repair-worktree-20260611
- branch: codex/plan-puzzle-test-repair-worktree-20260611
- validationUrl: http://127.0.0.1:50362/src/stitch_laibe_landing_onboarding/preview_floor_plan/code.html?validation=loop71-zone-boundary-regression-r5-1781366585749
- browser: local Chrome via Playwright, executable C:\Program Files\Google\Chrome\Application\chrome.exe
- screenshot: docs/plan_puzzle_repair/loop71-zone-boundary-regression-r5.png
- runtimePatch: YES

## Defect Proven

Initial Loop71 browser run attempted to draw a rectangular room by clicking consecutive wall endpoints. Only one wall was created.

Root cause:

- In draw-wall mode, clicking an existing wall hit target could select the wall instead of continuing the draw-wall flow.
- This blocked a human-style workflow: draw first wall, click its endpoint, continue drawing adjacent walls for a room boundary.

Minimal patch:

- File: src/stitch_laibe_landing_onboarding/preview_floor_plan/plan-puzzle.js
- Scope: wall hit target click handler only.
- Behavior: when `uiState.mode === "draw-wall"`, wall hit target clicks now call `handleDrawWallClick(event)` instead of selecting the wall.

## Validation Summary

| Check | Result | Evidence |
|---|---|---|
| syntax check | PASS | `node --check plan-puzzle.js` |
| page load | PASS | `#planCanvas` present |
| console errors | PASS | 0 |
| console warnings | PASS | 0 |
| blank mm draft | PASS | blank draft started from visible action button |
| draw rectangular room walls | PASS | 4 connected wall segments created |
| new-zone detailed settings collapsed | PASS | `#current-zone-type` and `#current-zone-name` not visible by default |
| place zone label | PASS | zone label placed inside rectangle |
| zone Chinese name edit | PASS | `客廳 A` persisted to project state |
| zone type edit | PASS | type changed to `bedroom` |
| zone label coordinate edit | PASS | labelPosition x=4400 / y=3700 |
| boundary edit mode | PASS | four wall edges selected by human-like mouse clicks |
| apply closed boundary | PASS | boundaryEdgeIds 4 / boundaryWallIds 4 / polygon points 4 / status `closed` |
| zone visual | PASS | zone label 1 / selected label 1 / boundary polygon 1 / open polygons 0 |
| candidate JSON export | PASS | exported zone preserved name/type/boundary/polygon/status |
| clear boundary | PASS | boundaryEdgeIds cleared and boundaryStatus returned to `none` |
| `.pc` production export disabled | PASS | disabled `export-pc-spike` button present |

## Project Data Evidence

Initial zone:

```json
{
  "name": "客廳",
  "type": "living",
  "labelPosition": {
    "x": 4300,
    "y": 3600
  },
  "boundaryStatus": "none",
  "boundaryIssues": ["zone-boundary-empty"]
}
```

Edited zone:

```json
{
  "name": "客廳 A",
  "type": "bedroom",
  "labelPosition": {
    "x": 4400,
    "y": 3700
  }
}
```

Applied boundary:

```json
{
  "boundaryEdgeIds": 4,
  "boundaryWallIds": 4,
  "polygon": [
    { "x": 1800, "y": 2200 },
    { "x": 6800, "y": 2200 },
    { "x": 6800, "y": 5200 },
    { "x": 1800, "y": 5200 }
  ],
  "boundaryStatus": "closed",
  "boundaryIssues": []
}
```

After clear:

```json
{
  "boundaryEdgeIds": [],
  "boundaryWallIds": [],
  "polygon": [],
  "boundaryStatus": "none",
  "boundaryIssues": ["zone-boundary-empty"]
}
```

## Export Evidence

Downloaded JSON:

- suggestedFilename: laibe-plancraft-plus-draft.json
- exported zone name: 客廳 A
- exported zone type: bedroom
- exported labelPosition: x 4400 / y 3700
- exported boundaryEdgeIds: 4
- exported boundaryWallIds: 4
- exported polygon points: 4
- exported boundaryStatus: closed

Candidate boundary flags are present under `candidateExportBoundary`:

```json
{
  "formalEstimate": false,
  "budgetEngineCalled": false,
  "productionReady": false,
  "note": "家具 / 櫃體物件僅為草稿候選資料。"
}
```

## Harness Notes

- First run proved the draw-wall hit target defect: endpoint continuation created only one wall.
- Second run verified the patch allowed 4 connected walls, then stopped because hidden default zone settings were intentionally collapsed.
- Third run used visible selected-zone controls but had PowerShell string encoding noise for the Chinese zone name.
- Final run used Unicode-escaped `客廳 A`; project state and export preserved the Chinese name correctly.

## Guard Status

- Plancraft core touched: NO
- budget runtime touched: NO
- Budget Engine called: NO
- PricingRule / BudgetEstimateLine touched: NO
- formalEstimateGuard changed: NO
- DB / payment / AI API / LINE / n8n touched: NO
- package.json / node_modules added: NO
- `.pc` production export enabled: NO
- SVG runtime include: 0

## Decision

Zone / room label placement, selected-zone edits, closed boundary selection, boundary clearing, and candidate JSON export are human-operable after the minimal draw-wall hit target patch.

## NEXT_PLAN_PUZZLE_TASK_DEMAND

Loop 72 - Full mixed-object regression: import/scale or blank draft, connected walls, openings, zone boundary, furniture placement, material apply, layer toggles, delete/undo/redo, and candidate JSON export in one continuous human workflow.
