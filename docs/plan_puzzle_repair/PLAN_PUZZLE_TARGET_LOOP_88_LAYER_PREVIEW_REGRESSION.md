# Plan Puzzle Target Loop 88 - Layer Visibility And Candidate Preview Regression

## Result

LOOP_88_LAYER_PREVIEW_PASS_WITHOUT_PATCH

## Scope

Loop 88 verifies layer visibility controls and candidate JSON preview behavior after a real PNG underlay import and manual scale calibration. It creates a wall, a door/opening candidate, and a wardrobe candidate, then verifies that hiding wall/opening/furniture layers does not delete project data, showing layers restores the visual objects, draft JSON export still contains all candidates, the candidate preview is visible in the overview panel, and guard boundaries remain intact.

## Runtime Patch

Patch status: NO

No runtime defect was proven in this loop. Earlier attempts were test-harness corrections:

- r1 checked child SVG `<line>` computed display instead of the hidden SVG layer container.
- r2 required `#zoneLayer` to hide entirely, but furniture visibility is applied to `.furniture-item` because `#zoneLayer` also hosts non-furniture overlays.
- r3 stayed on the layer tab after export; candidate JSON preview is designed to render in the properties/overview panels.
- r4 uses the correct evidence path.

## Browser Evidence

- Validation URL: `http://127.0.0.1:50362/src/stitch_laibe_landing_onboarding/preview_floor_plan/code.html?validation=loop88-layer-preview-r4`
- Machine evidence: `docs/plan_puzzle_repair/loop88-layer-preview-regression-r4.json`
- Exported candidate JSON: `docs/plan_puzzle_repair/loop88-downloads/loop88-layer-preview-export-r4.json`
- Screenshot: `docs/plan_puzzle_repair/loop88-layer-preview-regression-r4.png` local-only, ignored by git
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
| Create wall/opening/furniture | PASS | Project data contains 1 wall, 1 opening, 1 furniture candidate |
| Layer panel visible | PASS | `data-testid="layer-visibility-card"` found |
| Hide layers without deleting data | PASS | Wall/opening layers hidden, furniture item hidden; project counts remain 1/1/1 |
| Show layers restores visible objects | PASS | Wall/opening layers and furniture item return visible |
| Candidate JSON contains all objects | PASS | Export contains 1 wall, 1 opening, 1 furniture, 1 layout object |
| Candidate export boundary | PASS | `formalEstimate=false`, `budgetEngineCalled=false`, `productionReady=false` |
| Candidate JSON preview visible in overview | PASS | Preview card exists; JSON readout length 6566 |
| `.pc` production export disabled | PASS | `.pc` action remains disabled |
| Console errors | PASS | 0 |
| Page errors | PASS | 0 |

## Dirty Diagnostic Artifacts Not Committed

The following failed or diagnostic artifacts remain local-only and are intentionally excluded from this loop packet:

- `docs/plan_puzzle_repair/loop88-layer-preview-regression-r1.json`
- `docs/plan_puzzle_repair/loop88-layer-preview-regression-r2.json`
- `docs/plan_puzzle_repair/loop88-layer-preview-regression-r3.json`

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

Loop 88 is PASS_WITHOUT_PATCH and can be included in the Plan Puzzle human-operable evidence set. Layer visibility toggles, non-deletion of hidden candidates, re-show behavior, candidate JSON export, overview preview, and guard boundary are verified on the current pushed head.

## NEXT_PLAN_PUZZLE_TASK_DEMAND

Target Loop 89 - Full current-head smoke packet: verify import, scale, wall, opening, furniture, material, layers, export preview, delete/undo/redo, candidate JSON guard, and `.pc` disabled boundary in one consolidated browser run.
