# Plan Puzzle Target Loop 23 - Undo / Redo Command History Regression

role: B_PLAN_PUZZLE_REPAIR_COMMANDER
workstream: Plancraft+ Plan Puzzle Repair
loop: TARGET_LOOP_23_UNDO_REDO_COMMAND_HISTORY
date: 2026-06-13 Asia/Taipei
result: LOOP_23_UNDO_REDO_COMMAND_HISTORY_PASS_WITH_NOTES

## Scope

Loop 23 closes the Loop 22 remaining note that undo / redo controls were not implemented.

Allowed runtime patch files:
- src/stitch_laibe_landing_onboarding/preview_floor_plan/code.html
- src/stitch_laibe_landing_onboarding/preview_floor_plan/plan-puzzle.js

No global blackboard write.

## Runtime Patch Summary

| File | Patch | Scope |
|---|---|---|
| code.html | Added top file-area `復原` / `重做` buttons | Human-visible command controls |
| plan-puzzle.js | Added bounded command-history snapshots, undo/redo handlers, keyboard shortcuts, and disabled-state sync | Draft runtime only |

History behavior:
- Records draft state before committed actions.
- `復原` restores the previous snapshot and enables `重做`.
- `重做` restores the redo snapshot and returns current state to undo stack.
- History stack is bounded by `HISTORY_LIMIT = 50`.
- Ctrl+Z triggers undo.
- Ctrl+Y and Ctrl+Shift+Z trigger redo.

## Browser Functional Smoke

Validation URL:

`http://127.0.0.1:50362/src/stitch_laibe_landing_onboarding/preview_floor_plan/code.html?validation=loop23-undo-redo-regression`

Browser:

Local Chrome through bundled Playwright. In-app Browser was used first, but its read-only evaluation scope did not expose `window.laibePlancraftPlusProject`; therefore full state / JSON validation was run in local Chrome.

Screenshot:

`docs/plan_puzzle_repair/PLAN_PUZZLE_TARGET_LOOP_23_UNDO_REDO_REGRESSION.png`

Exported candidate JSON evidence:

`docs/plan_puzzle_repair/PLAN_PUZZLE_TARGET_LOOP_23_CANDIDATE_EXPORT.json`

| Step | Expected | Actual | Status | Evidence |
|---|---|---|---|---|
| Page load | Runtime state is available | `projectReady=true` | PASS | Chrome state read |
| Blank mm draft | Undo enabled, redo disabled | `undoDisabled=false`, `redoDisabled=true` | PASS | Button state |
| Draw wall | Wall is created and selected | `walls=1`, selected wall id exists | PASS | Runtime state |
| Button undo wall | Wall count returns to 0 | `walls=0`, redo enabled | PASS | Runtime state |
| Button redo wall | Wall count returns to 1 | `walls=1`, selected wall restored | PASS | Runtime state |
| Add door | Door opening is created | `openings=1`, kind `door` | PASS | Runtime state |
| Add window | Window opening is created | `openings=2`, kinds include `window` | PASS | Runtime state |
| Ctrl+Z window | Last window action is undone | `openings=1`, only door remains | PASS | Keyboard smoke |
| Ctrl+Y window | Window action is restored | `openings=2`, kinds include `window` | PASS | Keyboard smoke |
| Add opening | Opening candidate is created | `openings=3`, kinds include `opening` | PASS | Runtime state |
| Place wardrobe | Furniture candidate is created | `furnitureCount=1`, `budgetCandidate=true`, `productionReady=false`, `notFormalEstimate=true` | PASS | Runtime state |
| Delete furniture | Selected furniture is removed | `furnitureCount=0` | PASS | Runtime state |
| Undo delete furniture | Furniture candidate returns | `furnitureCount=1`, same candidate boundary fields preserved | PASS | Runtime state |
| Candidate JSON export | Download is triggered | filename `laibe-plancraft-plus-draft.json` | PASS | Download event |
| Candidate JSON fields | Export contains furniture and layout mappings | `furniture=1`, `toolCatalogItems=10`, `layoutObjects=1` | PASS | Parsed JSON |
| .pc production export | Production export remains disabled | all visible `.pc` buttons disabled | PASS | DOM state |
| Candidate-only guard | No formal estimate boundary is preserved | `formalEstimate=false`, `budgetEngineCalled=false`, `productionReady=false` | PASS | Parsed JSON |
| Console / page errors | No browser errors | console errors `0`, warnings `0`, page errors `0` | PASS | Browser logs |

## Guard Result

- Plancraft core touched: NO
- plancraft/ touched: NO
- Budget Engine touched: NO
- PricingRule / BudgetEstimateLine touched: NO
- formalEstimateGuard changed: NO
- Budget Engine called: NO
- DB / payment / AI API / LINE / n8n touched: NO
- package.json / node_modules added: NO
- git add / stage / push / merge / deploy: NO
- formal quote / Excel / PDF generated: NO

## Remaining Notes

- Undo / redo now covers committed draft actions tested in this package: blank draft, wall creation, opening creation, furniture placement, furniture delete.
- SVG furniture package runtime remains blocked separately until candidate-only package boundary and per-candidate overlay QA are accepted.
- This package does not claim production readiness or formal estimate readiness.

## Commander Decision

Loop 23 decision: PASS_WITH_NOTES.

Next automatic task: Loop 24 - selected-object action model and inspector affordance audit, covering wall status/type/thickness changes, selected-object deletion routes, and layer classification controls with browser evidence.
