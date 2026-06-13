# Plan Puzzle Target Loop 89 - Full Current Head Human Operability Smoke

## Result

LOOP_89_FULL_CURRENT_HEAD_SMOKE_PASS_WITHOUT_PATCH

## Scope

Loop 89 verifies the current head as an integrated human-operability smoke after the prior Loop85 furniture inspector patch and Loop87 opening inspector patch. The smoke uses a real PNG underlay, manual scale calibration, wall drawing and classification, door/window/opening creation and inspector editing, parametric furniture placement/drag/resize/material/note editing, layer visibility toggles, selected-object delete/undo/redo, candidate JSON export, candidate JSON preview, and the `.pc` disabled boundary.

This loop does not claim production readiness. It verifies the browser-operable candidate draft workflow only.

## Runtime Patch

Patch status: NO

No runtime defect was proven in this loop. The first attempt, r1, failed because the test harness selected a hidden duplicate furniture template select. The r2 smoke used the visible wardrobe tool button and passed.

## Browser Evidence

- Validation URL: `http://127.0.0.1:50362/src/stitch_laibe_landing_onboarding/preview_floor_plan/code.html?validation=loop89-full-current-head-smoke-r2`
- Machine evidence: `docs/plan_puzzle_repair/loop89-full-current-head-smoke-r2.json`
- Exported candidate JSON: `docs/plan_puzzle_repair/loop89-downloads/loop89-full-current-head-smoke-export-r2.json`
- Screenshot: `docs/plan_puzzle_repair/loop89-full-current-head-smoke-r2.png` local-only, ignored by git
- Console errors: 0
- Console warnings: 0
- Page errors: 0
- Passed browser steps: 30

## Pass Matrix

| Check | Status | Evidence |
|---|---|---|
| Page load | PASS | Local validation URL loaded |
| Fresh reload | PASS | Browser storage cleared before smoke |
| PNG import | PASS | Imported `loop83-risk-boundary-operability-r2.png`, 1508 x 709 |
| Manual scale calibration | PASS | 300 px = 3000 mm, `pxPerMm = 0.1` |
| Draw wall and select visual | PASS | Wall created and DOM class includes `is-selected` |
| Wall classification and demolition | PASS | Inspector set `status=demolished`, `wallType=bearing_wall`, `thickness=240`; DOM includes `wall-demolished` |
| Restore wall for openings | PASS | Wall set back to `existing` before adding openings |
| Add door | PASS | Door created on selected wall and selected visually |
| Edit door | PASS | Offset 300, width 850, swing right preserved |
| Add and edit window | PASS | Window created with offset 1500, width 1200, sill 950, height 1300 |
| Add and edit plain opening | PASS | Opening created with offset 3100 and width 700 |
| Place wardrobe candidate | PASS | Visible wardrobe tool used; furniture created and selected |
| Drag furniture | PASS | Furniture coordinates changed after mouse drag |
| Resize furniture | PASS | Resize handle visible; width/depth changed after handle drag |
| Edit furniture inspector | PASS | Width 2200, depth 700, note updated, material set to `stone` |
| Hide layers | PASS | Wall/opening layers and furniture item hidden without deleting data |
| Show layers | PASS | Wall/opening layers and furniture item restored visible |
| Delete selected furniture only | PASS | Furniture removed while wall and openings remain |
| Undo restores furniture | PASS | Undo restores furniture candidate |
| Redo deletes furniture again | PASS | Redo removes furniture again |
| Restore furniture for export | PASS | Final undo restores furniture before export |
| Candidate JSON contains all objects | PASS | Export contains 1 wall, 3 openings, 1 furniture, and at least 1 layout object |
| Candidate export boundary | PASS | `formalEstimate=false`, `budgetEngineCalled=false`, `productionReady=false` |
| Furniture candidate guard/material | PASS | Exported furniture remains candidate, productionReady false, notFormalEstimate true, material includes `stone` |
| Candidate JSON preview visible | PASS | Overview preview contains `laibe-plancraft-plus-draft.json` |
| `.pc` production export disabled | PASS | `.pc` export action remains disabled |
| Console errors | PASS | 0 |
| Page errors | PASS | 0 |

## Dirty Diagnostic Artifacts Not Committed

The following failed or diagnostic artifact is local-only and intentionally excluded from this loop packet:

- `docs/plan_puzzle_repair/loop89-full-current-head-smoke-r1.json`

Older local-only diagnostic artifacts from prior loops remain untracked and are not part of this Loop89 packet.

## Guard Check

- Plancraft core touched: NO
- `plancraft/` touched: NO
- Budget runtime touched: NO
- Budget Engine called: NO
- PricingRule touched: NO
- BudgetEstimateLine touched: NO
- formalEstimateGuard changed: NO
- DB/payment/AI API/LINE/n8n touched: NO
- package.json/node_modules added: NO
- SVG runtime include: 0
- Formal quote/Excel/PDF generated: NO

## Remaining Defects / Blockers

- No blocking runtime defect was observed in Loop89.
- SVG furniture package runtime remains blocked until candidate-only dispositions are accepted and a separate SVG package integration task is authorized.
- Current evidence supports human-operable candidate draft workflow only, not production quantity facts, formal estimate, formal `.pc`, Excel, or PDF output.

## Decision

Loop 89 is PASS_WITHOUT_PATCH and can be included in the Plan Puzzle human-operable evidence set. It proves the current head can complete the core candidate draft path in one browser run: import, scale, wall, openings, furniture, material, layers, export, preview, undo/redo, and guard boundary.

## NEXT_PLAN_PUZZLE_TASK_DEMAND

Target Loop 90 - Reviewer/A2 completion packet refresh: consolidate Loop85, Loop86, Loop87, Loop88, and Loop89 evidence into a current-head completion package and list remaining non-production boundaries without staging old diagnostic artifacts.
