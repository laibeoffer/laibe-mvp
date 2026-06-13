# Plan Puzzle Target Loop 24 - Selected Object Action Model Audit

role: B_PLAN_PUZZLE_REPAIR_COMMANDER
workstream: Plancraft+ Plan Puzzle Repair
loop: TARGET_LOOP_24_SELECTED_OBJECT_ACTION_MODEL
date: 2026-06-13 Asia/Taipei
result: LOOP_24_SELECTED_OBJECT_ACTION_MODEL_PASS_WITH_NOTES

## Scope

Loop 24 verifies whether a user can select an object, understand what is selected, change its classification, use related object actions, and avoid accidental production output.

Allowed runtime patch file:
- src/stitch_laibe_landing_onboarding/preview_floor_plan/plan-puzzle.js

No global blackboard write.

## Defect Found

Before patch, opening selection had `selectedWallId` internally, but the inspector stayed on the opening card and there was no obvious human-facing path back to the attached wall. This made it hard to perform wall-level actions such as changing wall classification or deleting the selected wall and its dependent openings.

## Minimal Patch

Added a visible `選取依附牆體` action in the selected opening card near the `來源牆段` information.

Runtime behavior:
- When an opening is selected, the user can click `選取依附牆體`.
- The inspector switches back to the attached wall.
- `selectedOpeningId` is cleared.
- Wall actions such as status/type/thickness changes and Delete now target the wall.

## Browser Functional Smoke

Validation URL:

`http://127.0.0.1:50362/src/stitch_laibe_landing_onboarding/preview_floor_plan/code.html?validation=loop24-selected-object-action-model-audit-post-patch`

Browser:

Local Chrome through bundled Playwright.

Screenshot:

`docs/plan_puzzle_repair/PLAN_PUZZLE_TARGET_LOOP_24_SELECTED_OBJECT_ACTION_MODEL_AUDIT.png`

Exported candidate JSON evidence:

`docs/plan_puzzle_repair/PLAN_PUZZLE_TARGET_LOOP_24_CANDIDATE_EXPORT.json`

| Step | Expected | Actual | Status | Evidence |
|---|---|---|---|---|
| Page load | Runtime state is available | page loaded and project state exists | PASS | Chrome state read |
| Select wall | Selected wall visibly changes color | selected stroke `rgb(0, 183, 255)` | PASS | SVG computed style |
| Wall property edit | Status/type/thickness can be changed in inspector | `status=demolished`, `wallType=light_partition`, `thickness=100` | PASS | Runtime state |
| Wall class sync | DOM class reflects selected wall state/type | `wall-demolished wall-type-light_partition is-selected` | PASS | SVG DOM |
| Demolished wall guard | Door/window creation is blocked on demolished wall | error `拆除牆上不建議新增門窗。` | PASS | Runtime state |
| Restore wall status | Demolished wall can be changed back | `status=existing` | PASS | Runtime state |
| Add door/window | Existing wall can receive openings | openings include `door` and `window` | PASS | Runtime state |
| Opening-to-wall action | Opening card exposes attached-wall action | `選取依附牆體` visible in selected opening card | PASS | Inspector DOM |
| Opening kind edit | Selected window can become opening | opening kind changed to `opening` | PASS | Runtime state |
| Switch to attached wall | Opening inspector can switch to wall inspector | `selectedOpeningId=null`, wall inspector visible | PASS | Runtime state and inspector |
| Layer toggle | Wall layer visibility can be toggled without losing data | `layerVisibility.walls=false`, wall data remains | PASS | Runtime state |
| Delete wall | Delete removes selected wall and dependent openings | walls `1 -> 0`, openings `2 -> 0` | PASS | Keyboard smoke |
| Undo delete wall | Ctrl+Z restores wall and dependent openings | walls `0 -> 1`, openings `0 -> 2` | PASS | Keyboard smoke |
| Candidate JSON | Export preserves wall type and thickness | exported wall `wallType=light_partition`, `thickness=100` | PASS | Parsed JSON |
| Guard | Candidate-only boundary remains active | `formalEstimate=false`, `budgetEngineCalled=false`, `productionReady=false` | PASS | Parsed JSON |
| Console / page errors | No browser errors or warnings | console errors `0`, warnings `0`, page errors `0` | PASS | Browser logs |

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

- This loop improves human operation for wall/opening selection. It does not make candidate draft JSON production quantity data.
- SVG furniture package runtime remains blocked separately until candidate-only package boundary and per-candidate overlay QA are accepted.
- Next loop should continue toward whole-tool human operability rather than close the alarm.

## Commander Decision

Loop 24 decision: PASS_WITH_NOTES.

Next automatic task: Loop 25 - object action shortcut audit, covering wall / opening / furniture delete buttons, keyboard Delete, undo/redo after inspector edits, and visible action labels for normal users.
