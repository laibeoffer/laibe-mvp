# Plan Puzzle Target Loop 72 - Full Mixed-object Human Workflow Regression

## Result

PASS_WITH_NOTES

## Scope

- Worktree: `Z:\08-Jacky\laibe_MVP_project\_codex_worktrees\laibe_project\plan-puzzle-test-repair-worktree-20260611`
- Branch: `codex/plan-puzzle-test-repair-worktree-20260611`
- Runtime page: `http://127.0.0.1:50362/src/stitch_laibe_landing_onboarding/preview_floor_plan/code.html?validation=loop72-full-mixed-object-regression-r10-pass`
- Runtime file patched: `src/stitch_laibe_landing_onboarding/preview_floor_plan/plan-puzzle.js`
- Evidence screenshot: `docs/plan_puzzle_repair/loop72-full-mixed-object-regression-r10.png`
- Machine evidence source: `docs/plan_puzzle_repair/loop72-full-mixed-object-regression-r10.json`

## Defects Proven And Fixed

| Defect | Evidence | Fix | Retest |
|---|---|---|---|
| Continuous corner clicks created only 2 wall segments instead of a 4-wall room outline. | Loop 72 r2/r3 failed with `WALL_RECTANGLE_COUNT_NOT_4`; only top and bottom wall segments existed after five human-style corner clicks. | After a wall segment is created, keep the segment end as the next `wallDraftStart` so the next click continues drawing from that endpoint. | r10 PASS: 4 connected wall segments created. |
| After closing the room outline, draw-wall mode kept an active draft endpoint and a later wall click could add an unintended extra wall. | Loop 72 r5 exported 5 walls after a closed rectangle plus wall selection/opening workflow. | Detect when a new wall segment ends on an existing endpoint; treat it as a closed outline, clear the wall draft, and return to select mode. | r10 PASS: closed rectangle has 4 walls and `uiState.mode = select`. |

## Browser Functional Smoke

| Step | Expected | Actual | Status |
|---|---|---|---|
| Page load | Page loads on local static server. | Loaded at validation URL. | PASS |
| Console | No console errors or warnings. | `errors: 0`, `warnings: 0`. | PASS |
| Blank mm draft | Draft can start without formal production path. | Blank draft started; `.pc` remained disabled. | PASS |
| Draw wall | Five corner clicks should create a closed 4-wall room outline. | 4 connected wall segments created and mode returned to select. | PASS |
| Add door | Door can be placed on selected wall and edited. | Door offset 400, width 800, swing right, height 2100. | PASS |
| Add window | Window can be placed on selected wall and edited. | Window offset 1500, width 900, sill height 850, height 1100. | PASS |
| Add opening | Opening can be placed on selected wall and edited. | Opening offset 2700, width 700, height 2050. | PASS |
| Zone boundary | Zone label and closed boundary can be created. | 1 zone, 4 boundary edges, 4 polygon points, `boundaryStatus: closed`. | PASS |
| Furniture placement | Furniture item can be placed. | 1 wardrobe candidate created. | PASS |
| Furniture drag | Furniture can be moved. | Wardrobe moved from initial placement to x 3900 / y 3750. | PASS |
| Furniture edit | Furniture dimensions, material, and note can be edited. | Width 1800, depth 650, height 2200, material `wood`, note persisted. | PASS |
| Layer toggle | Opening layer can hide/show. | `openingLayer.hidden/display/aria-hidden` and `uiState.layerVisibility.openings` changed correctly. | PASS |
| Delete / undo / redo | Selected opening delete, undo, redo, and restore work. | Opening count moved 3 -> 2 -> 3 -> 2 -> 3. | PASS |
| Candidate JSON export | Draft JSON includes core candidate data and guard flags. | 4 walls, 3 openings, 1 zone, 1 furniture, 10 tool catalog items, 1 layout object. | PASS |
| Candidate JSON preview | Inspector preview shows candidate payload. | Preview includes 4 walls, 3 openings, 1 zone, 1 furniture, 10 tool catalog items, 1 layout object. | PASS |
| `.pc` production export | `.pc` formal export remains disabled. | 3 disabled `.pc` export controls observed before/after workflow. | PASS |

## Export Guard Evidence

| Guard | Value |
|---|---|
| `candidateExportBoundary.formalEstimate` | `false` |
| `candidateExportBoundary.budgetEngineCalled` | `false` |
| `candidateExportBoundary.productionReady` | `false` |
| Furniture `budgetCandidate` | `true` |
| Furniture `productionReady` | `false` |
| Furniture `notFormalEstimate` | `true` |

## Forbidden Scope Guard

- Plancraft core touched: NO
- `plancraft/` touched: NO
- Budget runtime touched: NO
- Budget Engine called: NO
- PricingRule / BudgetEstimateLine touched: NO
- formalEstimateGuard changed: NO
- DB / payment / AI API / LINE / n8n touched: NO
- package.json / node_modules added: NO
- SVG runtime include: 0
- `.pc` production export enabled: NO

## Remaining Notes

- This is still candidate/draft runtime evidence, not production quantity evidence.
- SVG furniture package runtime remains blocked until candidate overlay QA and separate integration approval.
- The test used local Chrome/Playwright against the static page served on port 50362.

## Decision

Loop 72 is accepted as `FULL_MIXED_OBJECT_WORKFLOW_PASS_WITH_NOTES`.

Next automatic task: Loop 73 - run a small/narrow viewport and human-readable inspector regression after the wall continuation patch, preserving all guard boundaries.
