# Plan Puzzle PPT-like Usability Audit

## Summary

- workstream: Plancraft+ Plan Puzzle Repair
- loop: Loop 44 - PPT-like direct manipulation stress
- checkedAt: 2026-06-13 20:13:55 +08:00
- validationUrl: `http://127.0.0.1:50362/src/stitch_laibe_landing_onboarding/preview_floor_plan/code.html?validation=loop44-ppt-like-direct-manipulation-human-tab-pass`
- browser: System Chrome via bundled Playwright
- result: PASS_WITH_MINIMAL_RUNTIME_PATCH
- consoleErrors: 0
- consoleWarnings: 0

## Evidence Files

- resultJson: `docs/plan_puzzle_repair/PLAN_PUZZLE_TARGET_LOOP_44_SELECTED_OBJECT_AFFORDANCE_RESULT.json`
- screenshot: `docs/plan_puzzle_repair/PLAN_PUZZLE_TARGET_LOOP_44_SELECTED_OBJECT_AFFORDANCE_STRESS.png`
- candidateJson: `docs/plan_puzzle_repair/PLAN_PUZZLE_TARGET_LOOP_44_SELECTED_OBJECT_AFFORDANCE_EXPORT.json`

## Test A: Draw Like PPT

| Step | Expected | Actual | Status | Evidence |
|---|---|---|---|---|
| Open blank draft | User can start a calibrated blank draft | blank draft scale PASS | PASS | resultJson |
| Draw first wall | Click wall tool and click two points | walls `1`; selected wall visual present | PASS | resultJson |
| Draw second wall | Create another wall for delete test | walls `2` | PASS | resultJson |
| Select wall | Selected wall changes visual state | `.wall-line.is-selected` and `.wall-selected-outline` present | PASS | resultJson |
| Delete wall | Delete selected new wall only | walls reduced to `1` | PASS | resultJson |
| Undo / redo | Ctrl+Z restores, Ctrl+Y reapplies delete | PASS | resultJson |

## Test B: Place Object Like PPT

| Step | Expected | Actual | Status | Evidence |
|---|---|---|---|---|
| Select wardrobe tool | Visible left tool creates placement mode | furniture candidate created | PASS | resultJson |
| Click canvas | Item appears on canvas | selected `.furniture-item` with resize handle | PASS | screenshot + resultJson |
| Drag object | Object follows pointer and coordinates update | x/y changed | PASS | resultJson |
| Resize object | Drag handle changes width/depth | width/depth changed | PASS | resultJson |
| Inspector edit | Width/depth/note/material update candidate data | width `1550`, depth `680`, material `system_panel`, note present | PASS | resultJson |
| Delete object | Delete removes selected furniture only | furniture `0`, walls `1`, openings `3` | PASS | resultJson |

## Test C: Format Like PPT

| Step | Expected | Actual | Status | Evidence |
|---|---|---|---|---|
| Select material | Material behaves like a format tool | material select updates `materialTags` | PASS | resultJson |
| Export material | JSON includes material preference | exported sofa has material tags | PASS | candidateJson |
| Guard | Material does not enter formal estimate | `formalEstimate=false`, `budgetEngineCalled=false`, `productionReady=false` | PASS | candidateJson |

## Test D: Inspect Like PPT

| Step | Expected | Actual | Status | Evidence |
|---|---|---|---|---|
| No debug-first panel | Right side remains an inspector surface | five inspector tabs present | PASS_WITH_NOTES | screenshot |
| Select wall | Inspector enters property context | selected wall and visual highlight verified | PASS | resultJson |
| Select opening | Inspector shows opening width field | `#selected-opening-width` present and editable | PASS | resultJson |
| Select furniture | Inspector keeps selected furniture context | selected furniture id present | PASS | resultJson |
| Candidate export | Export includes direct manipulation results | walls `1`, openings `3`, furniture `1`, layoutObjects `1`, toolCatalogItems `10` | PASS | candidateJson |

## Minimal Runtime Patch

| Area | Defect | Patch | Result |
|---|---|---|---|
| Furniture dimensions | Continuous human editing after resize could be interrupted by full inspector render | dimension input now updates candidate data and redraws only the furniture/canvas preview path | PASS |
| Opening dimensions | Opening width input could be interrupted by full inspector render | opening numeric input now updates candidate data and redraws only the opening/canvas preview path | PASS |

## Remaining Partial / Notes

- SVG furniture package runtime include remains blocked until reviewer / commander accepts candidate-only dispositions and a separate package integration task is authorized.
- True OCR / image dimension-line auto-scale remains a separate future task; current calibration and blank draft are human-operable.
- This pass proves local human-operable draft tooling, not production drawing, formal quantity, formal estimate, Excel, PDF, DB, payment, AI API, LINE, or n8n readiness.

## Guard

- Plancraft core touched: NO
- budget runtime touched: NO
- formalEstimateGuard changed: NO
- Budget Engine called: NO
- payment / DB / AI API / LINE / n8n touched: NO
- package / node_modules added: NO
- candidate-only JSON boundary: PASS
- `.pc` production export disabled: PASS

## Loop 56 Addendum - PPT-like UI Wording and Icon Rail Repair

- checkedAt: 2026-06-13 22:13:36 +08:00
- result: PASS
- evidenceFile: `docs/plan_puzzle_repair/PLAN_PUZZLE_TARGET_LOOP_56_PPT_LIKE_DIRECT_MANIPULATION_UI_REPAIR.md`
- desktopScreenshot: `docs/plan_puzzle_repair/PLAN_PUZZLE_LOOP56_PPT_LIKE_UI_REPAIR_DESKTOP_R2.png`
- functionalSmoke: `docs/plan_puzzle_repair/PLAN_PUZZLE_LOOP56_PPT_LIKE_FUNCTIONAL_SMOKE_R2_RESULT.json`
- functionalSmokeR3: `docs/plan_puzzle_repair/PLAN_PUZZLE_LOOP56_PPT_LIKE_FUNCTIONAL_SMOKE_R3_RESULT.json`
- selectionSmoke: `docs/plan_puzzle_repair/PLAN_PUZZLE_LOOP56_SELECTION_HIGHLIGHT_SMOKE_RESULT.json`
- propertyFieldTerms: `docs/plan_puzzle_repair/PLAN_PUZZLE_LOOP56_PROPERTY_FIELD_TERMS_CHECK_CORRECTED_RESULT.json`

### Changes Verified

| Area | Result |
|---|---|
| Tool rail | App-like 3-column icon tiles, short labels, no large explanatory text inside tool cards |
| Right panel | Visible wording changed to `屬性面板`; panel remains contextual to selected object |
| Confusing wording | `節點`, `狀態區`, `加入圖面`, `自動接齊`, `整理結點` removed from visible primary UI |
| Selection feedback | Selected wall shows `.wall-line.is-selected`, blue stroke, and yellow outline |
| Basic direct manipulation | Blank draft, wall draw, furniture placement, selected furniture handles remain working |
| Property labels | Selected furniture panel shows width, depth, height, `材料`, and note |
| Console | 0 errors, 0 warnings |

### Notes

- This addendum is UI/interaction wording evidence only. It does not change production guard boundaries.
