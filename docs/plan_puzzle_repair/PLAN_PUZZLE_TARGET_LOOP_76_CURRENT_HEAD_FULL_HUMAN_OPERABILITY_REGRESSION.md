# Plan Puzzle Target Loop 76 - Current HEAD Full Human-operability Regression

## Result

PASS_WITH_NOTES

## Scope

- Worktree: `Z:\08-Jacky\laibe_MVP_project\_codex_worktrees\laibe_project\plan-puzzle-test-repair-worktree-20260611`
- Branch: `codex/plan-puzzle-test-repair-worktree-20260611`
- Tested HEAD: `ae564c6f83d47442aeef5249dba8484f28cf671e`
- Runtime page: `http://127.0.0.1:50362/src/stitch_laibe_landing_onboarding/preview_floor_plan/code.html?validation=loop76-current-head-full-human-operability-r3`
- Runtime patch: NO
- Machine evidence source: `docs/plan_puzzle_repair/loop76-current-head-full-human-operability-r3.json`
- Screenshot evidence: `docs/plan_puzzle_repair/loop76-current-head-full-human-operability-r3.png` local-only; PNG files remain ignored and were not force-added.

## Browser Functional Smoke

| Step | Expected | Actual | Status |
|---|---|---|---|
| Page load | Page loads in Chrome. | Loaded at 1365 x 768. | PASS |
| Console | No console errors or warnings. | `errors: 0`, `warnings: 0`. | PASS |
| PNG import | User can import a PNG through file input. | Temp PNG `laibe-loop76-width-4000mm.png` imported; underlay exists. | PASS |
| Scale calibration | User can manually calibrate by two points and known length. | 400 px = 4000 mm; `pxPerMm: 0.1`; calibrated true. | PASS |
| Draw wall | User can draw a closed wall outline with continuous clicks. | 4 connected walls; mode returned to `select`. | PASS |
| Add door / window / opening | User can place all three opening kinds on selected walls. | 3 openings exported with kinds door, window, opening. | PASS |
| Furniture drag / resize | User can place, drag, and resize a wardrobe candidate. | Drag and resize changed object geometry. | PASS |
| Furniture inspector edits | User can edit width, depth, material, and note. | Width 1880, depth 680, material wood, note `Loop 76 human smoke`. | PASS |
| Delete / undo / redo | User can delete selected opening, undo, and redo. | Opening count 3 -> 2 -> 3 -> 2, then opening restored for final export. | PASS |
| Candidate JSON export | Draft JSON downloads and includes candidate data. | 4 walls, 3 openings, 1 furniture, 1 layout object. | PASS |
| `.pc` production export | `.pc` formal export remains disabled. | 3 disabled `.pc` export controls; 0 enabled. | PASS |
| Horizontal overflow | Main document does not create horizontal overflow. | Document/body scroll width equals client width. | PASS |

## Export Evidence

| Field | Value |
|---|---|
| Suggested filename | `laibe-plancraft-plus-draft.json` |
| `walls.length` | `4` |
| `openings.length` | `3` |
| Opening kinds | `door`, `opening`, `window` |
| `furniture.length` | `1` |
| `layoutObjects.length` | `1` |
| Furniture width / depth | `1880 x 680 mm` |
| Furniture material | `wood` |
| Furniture note | `Loop 76 human smoke` |
| `candidateExportBoundary.formalEstimate` | `false` |
| `candidateExportBoundary.budgetEngineCalled` | `false` |
| `candidateExportBoundary.productionReady` | `false` |
| Furniture `budgetCandidate` | `true` |
| Furniture `productionReady` | `false` |
| Furniture `notFormalEstimate` | `true` |

## Guard Summary

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
- Formal quote / Excel / PDF generated: NO

## Notes

- Loop 76 r1/r2 were diagnostic attempts and were not accepted as pass evidence.
- Loop 76 r3 is the accepted evidence because it validates the same workflow with stable human-style waits and state checks.
- The workflow remains candidate/draft only and is not a production budget source.

## Decision

Loop 76 is accepted as `CURRENT_HEAD_FULL_HUMAN_OPERABILITY_REGRESSION_PASS_WITH_NOTES`.

Next automatic task: prepare PR/reviewer scope packet for the current repair branch, or address the next concrete human-operability defect from A2.
