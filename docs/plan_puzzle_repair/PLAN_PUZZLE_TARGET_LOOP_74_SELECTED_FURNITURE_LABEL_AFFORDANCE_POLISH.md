# Plan Puzzle Target Loop 74 - Selected Furniture Label And Affordance Polish

## Result

PASS_WITH_NOTES

## Scope

- Worktree: `Z:\08-Jacky\laibe_MVP_project\_codex_worktrees\laibe_project\plan-puzzle-test-repair-worktree-20260611`
- Branch: `codex/plan-puzzle-test-repair-worktree-20260611`
- Runtime page: `http://127.0.0.1:50362/src/stitch_laibe_landing_onboarding/preview_floor_plan/code.html?validation=loop74-selected-furniture-label-regression-r2`
- Runtime files patched:
  - `src/stitch_laibe_landing_onboarding/preview_floor_plan/code.html`
  - `src/stitch_laibe_landing_onboarding/preview_floor_plan/plan-puzzle.js`
- Machine evidence source: `docs/plan_puzzle_repair/loop74-selected-furniture-label-regression-r2.json`
- Screenshot evidence: `docs/plan_puzzle_repair/loop74-selected-furniture-label-regression-r2.png` local-only; PNG files remain ignored and were not force-added.

## Defect Proven And Fixed

| Defect | Evidence | Fix | Retest |
|---|---|---|---|
| Selected furniture label/affordance could be reported as overflowing in the narrow viewport. | Loop 74 r1 had console 0 but failed `selected furniture compact label`; the outside corner resize handle expanded the furniture button scroll box and the label used duplicated type/name text. | Render furniture object text as name + dimensions only, constrain label text with ellipsis, increase label line height, and move the corner resize handle inside the item frame. | Loop 74 r2 PASS: no furniture label/control overflow and corner handle remains inside the selected item. |

## Browser Functional Smoke

| Step | Expected | Actual | Status |
|---|---|---|---|
| Page load | Page loads in 1180 x 720 viewport. | Loaded at Loop 74 validation URL. | PASS |
| Console | No console errors or warnings. | `errors: 0`, `warnings: 0`. | PASS |
| Blank mm draft | Draft mode can start without production path. | Scale calibrated with px/mm set for blank draft. | PASS |
| Furniture placement | User can choose wardrobe and place it on the canvas. | 1 wardrobe candidate created and selected. | PASS |
| Furniture label | Selected furniture label stays inside object. | Item scrollWidth/clientWidth 176/176; scrollHeight/clientHeight 56/56. | PASS |
| Resize affordance | Corner resize handle remains usable and inside selected object. | Corner handle is inside item bounds. | PASS |
| Candidate guard | Furniture remains candidate only. | `budgetCandidate: true`, `productionReady: false`, `notFormalEstimate: true`. | PASS |
| Horizontal overflow | Narrow viewport does not create page-level horizontal overflow. | Document/body scroll width did not exceed client width. | PASS |
| `.pc` production export | `.pc` formal export remains disabled. | 3 disabled `.pc` export controls observed. | PASS |

## Export Guard Evidence

| Guard | Value |
|---|---|
| Furniture count | `1` |
| Candidate layout object eligible count | `1` |
| Furniture `budgetCandidate` | `true` |
| Furniture `productionReady` | `false` |
| Furniture `notFormalEstimate` | `true` |
| Disabled `.pc` controls | `3` |

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

Loop 74 is accepted as `SELECTED_FURNITURE_LABEL_AFFORDANCE_POLISH_PASS_WITH_NOTES`.

Next automatic task: Loop 75 - final human-operable pass/fail consolidation for current Plan Puzzle repair branch, unless a new concrete human-operability defect is reported.
