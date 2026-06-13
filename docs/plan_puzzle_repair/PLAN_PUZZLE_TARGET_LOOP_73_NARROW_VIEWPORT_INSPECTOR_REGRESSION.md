# Plan Puzzle Target Loop 73 - Narrow Viewport And Inspector Readability Regression

## Result

PASS_WITH_NOTES

## Scope

- Worktree: `Z:\08-Jacky\laibe_MVP_project\_codex_worktrees\laibe_project\plan-puzzle-test-repair-worktree-20260611`
- Branch: `codex/plan-puzzle-test-repair-worktree-20260611`
- Runtime page: `http://127.0.0.1:50362/src/stitch_laibe_landing_onboarding/preview_floor_plan/code.html?validation=loop73-narrow-inspector-regression-r3`
- Runtime patch: NO
- Machine evidence source: `docs/plan_puzzle_repair/loop73-narrow-inspector-regression-r3.json`
- Screenshot evidence: `docs/plan_puzzle_repair/loop73-narrow-inspector-regression-r3.png` local-only; PNG files remain ignored and were not force-added.

## Browser Functional Smoke

| Step | Expected | Actual | Status |
|---|---|---|---|
| Page load | Page loads in a narrower viewport. | Loaded at 1180 x 720. | PASS |
| Console | No console errors or warnings. | `errors: 0`, `warnings: 0`. | PASS |
| Initial layout | File area, tool rail, canvas, and inspector remain in one left-to-right workbench without horizontal document overflow. | Document `scrollWidth` equals viewport width 1180; canvas remains 684 x 558; inspector remains 286 wide. | PASS |
| Draw wall | Continuous corner clicks still create a closed four-wall room outline. | 4 walls created; mode returned to `select`. | PASS |
| Add door | Door can be placed and edited in the narrow viewport. | Door created with offset 300, width 800, swing right, height 2100. | PASS |
| Furniture placement | Furniture candidate can be placed. | 1 wardrobe candidate created. | PASS |
| Furniture edit | Width, depth, material, and note can be edited through the inspector. | Width 1600, depth 600, material `wood`, note `narrow regression`. | PASS |
| Post-interaction layout | Workbench remains human-operable after object selection and inspector expansion. | No horizontal document overflow; inspector body scrolls internally. | PASS_WITH_NOTES |
| Candidate JSON export | Draft JSON includes candidate geometry and guard flags. | 4 walls, 1 opening, 1 furniture item, 1 layout object. | PASS |
| `.pc` production export | `.pc` formal export remains disabled. | 3 disabled `.pc` export controls observed. | PASS |

## Notes

- The browser evidence found one selected furniture control whose text content was marked as overflowing inside its own button, but it did not create page-level horizontal overflow and did not block placement, editing, export, or `.pc` guard behavior.
- This pass preserves Loop 72 behavior after the continuous wall drawing patch.
- The result is candidate/draft runtime evidence only, not production quantity evidence.

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

## Decision

Loop 73 is accepted as `NARROW_VIEWPORT_INSPECTOR_READABILITY_PASS_WITH_NOTES`.

Next automatic task: Loop 74 - selected furniture label wrapping / compact affordance polish if the selected furniture text overflow becomes a human-operability complaint, otherwise continue package/evidence closeout without touching Plancraft core or budget runtime.
