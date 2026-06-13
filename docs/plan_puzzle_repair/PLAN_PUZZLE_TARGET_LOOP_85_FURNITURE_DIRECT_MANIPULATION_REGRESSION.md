# Plan Puzzle Target Loop 85 - Furniture Direct Manipulation Regression

## Result

LOOP_85_FURNITURE_DIRECT_MANIPULATION_PASS_WITH_PATCH

## Scope

Loop 85 verifies the current head with a real PNG underlay import, manual scale calibration, wall creation, parametric wardrobe placement, direct drag, resize handle operation, inspector width/depth/note/material editing, candidate JSON export, delete, console health, and `.pc` production export disabled boundary.

This loop does not include SVG furniture candidates in runtime. SVG package runtime remains blocked until candidate-only disposition is accepted and a separate integration task is authorized.

## Runtime Patch

Patch status: YES

Patched file:

- `src/stitch_laibe_landing_onboarding/preview_floor_plan/plan-puzzle.js`

Patch summary:

- Furniture dimension inputs now preview through the selected furniture data path without full inspector re-render, so moving from width to depth does not lose the second field edit.
- Furniture name/note inputs now sync on input without full inspector re-render, so notes are preserved in candidate JSON even when the user exports immediately.
- Guard flags remain enforced on edited furniture: `budgetCandidate: true`, `productionReady: false`, `notFormalEstimate: true`.

## Browser Evidence

- Validation URL: `http://127.0.0.1:50362/src/stitch_laibe_landing_onboarding/preview_floor_plan/code.html?validation=loop85-furniture-direct-manipulation-r12`
- Machine evidence: `docs/plan_puzzle_repair/loop85-furniture-direct-manipulation-regression-r12.json`
- Exported candidate JSON: `docs/plan_puzzle_repair/loop85-downloads/loop85-furniture-direct-manipulation-export-r12.json`
- Screenshot: `docs/plan_puzzle_repair/loop85-furniture-direct-manipulation-regression-r12.png` local-only, ignored by git
- Console errors: 0
- Console warnings: 0
- Page errors: 0

## Pass Matrix

| Check | Status | Evidence |
|---|---|---|
| Page load | PASS | Page opened from local validation URL |
| Fresh reload | PASS | Browser storage cleared before smoke |
| PNG import | PASS | Imported `loop83-risk-boundary-operability-r2.png`, 1508 x 709 |
| Manual scale calibration | PASS | 300 px = 3000 mm, `pxPerMm = 0.1` |
| Draw wall | PASS | 1 wall written to project data |
| Place wardrobe candidate | PASS | 1 `wardrobe` furniture candidate written |
| Selected visual state | PASS | `.furniture-item.is-selected` found |
| Drag furniture candidate | PASS | Position changed from initial point |
| Resize furniture by handle | PASS | Width/depth changed through resize handle |
| Inspector width/depth edit | PASS | `widthMm = 2100`, `depthMm = 650` |
| Inspector note edit | PASS | Candidate note preserved |
| Material apply | PASS | `materialTags` contains `stone` |
| Candidate JSON furniture | PASS | `furniture` contains edited candidate |
| Candidate JSON layout object | PASS | `layoutObjects` contains parametric furniture candidate |
| Candidate JSON dimensions | PASS | Exported `widthMm = 2100`, `depthMm = 650` |
| Candidate JSON note | PASS | Exported note preserved |
| Candidate JSON material | PASS | Exported `materialTags` contains `stone` |
| Candidate guard flags | PASS | `budgetCandidate=true`, `productionReady=false`, `notFormalEstimate=true` |
| Candidate export boundary | PASS | `formalEstimate=false`, `budgetEngineCalled=false`, `productionReady=false` |
| Delete furniture | PASS | Project furniture count returns to 0 |
| Canvas removal after delete | PASS | `.furniture-item` count returns to 0 |
| `.pc` production export disabled | PASS | `.pc` action remains disabled |
| Console errors | PASS | 0 |
| Page errors | PASS | 0 |

## Dirty Diagnostic Artifacts Not Committed

The following failed or diagnostic artifacts remain local-only and are intentionally excluded from this loop packet:

- `docs/plan_puzzle_repair/loop85-furniture-direct-manipulation-regression-r1.json` through `r11.json`
- `docs/plan_puzzle_repair/loop85-depth-input-diagnostic-r1.json`
- `docs/plan_puzzle_repair/loop85-depth-input-diagnostic-r2.json`
- `docs/plan_puzzle_repair/loop85-depth-hit-test-r1.json`
- `docs/plan_puzzle_repair/loop85-post-resize-depth-diagnostic-r1.json`
- `docs/plan_puzzle_repair/loop85-note-hit-test-r1.json`
- `docs/plan_puzzle_repair/loop85-note-hit-test-r2.json`

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

## Decision

Loop 85 is PASS_WITH_PATCH and can be included in the Plan Puzzle human-operable evidence set. The patch is scoped to selected furniture/cabinet inspector edit stability and candidate data preservation.

## NEXT_PLAN_PUZZLE_TASK_DEMAND

Target Loop 86 - Wall classification and demolition/structural status regression after real PNG import: verify selected wall visual state, wall type/status/thickness/structural edits, demolition wall styling, candidate JSON preservation, delete/undo/redo, and guard boundary.
