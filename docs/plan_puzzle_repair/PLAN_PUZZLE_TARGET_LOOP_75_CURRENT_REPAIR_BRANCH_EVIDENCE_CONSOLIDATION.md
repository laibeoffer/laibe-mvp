# Plan Puzzle Target Loop 75 - Current Repair Branch Evidence Consolidation

## Result

CURRENT_REPAIR_BRANCH_HUMAN_OPERABLE_PASS_WITH_NOTES

## Source

- Worktree: `Z:\08-Jacky\laibe_MVP_project\_codex_worktrees\laibe_project\plan-puzzle-test-repair-worktree-20260611`
- Branch: `codex/plan-puzzle-test-repair-worktree-20260611`
- Current pushed HEAD: `7f4c0eecb2861a2ac63b6ae54a0e2e1cd6a36db4`
- Runtime target: `src/stitch_laibe_landing_onboarding/preview_floor_plan/code.html`
- Runtime JS: `src/stitch_laibe_landing_onboarding/preview_floor_plan/plan-puzzle.js`

## Human-operable Function Matrix

| Area | Status | Evidence | Boundary |
|---|---|---|---|
| PNG import | PASS | Target Loop 1 completion package and later regression chain kept page/import status operable. | Candidate draft only. |
| Scale calibration | PASS | Target Loop 1 and follow-up smoke evidence; blank mm draft path remains valid for direct drawing. | Does not create production quantity facts. |
| Wall drawing | PASS | Loop 72 fixed continuous corner drawing and closed-outline select-mode behavior; Loop 73 kept it passing in 1180 x 720. | Candidate walls only. |
| Wall classification | PASS | Loop 70 verified selected wall highlight, status/type/thickness/structural edits, demolition style, undo/redo, and JSON export. | Not a formal estimate input. |
| Door / window / opening | PASS | Loop 72 verified door, window, opening placement/edit/export; Loop 73 verified door placement/edit in narrow viewport. | Candidate openings only. |
| Room / zone boundary | PASS | Loop 71 verified zone label placement, closed boundary editing, boundary clearing, and JSON export. | Candidate zones only. |
| Furniture / cabinet placement | PASS_WITH_NOTES | Loop 4B/5-8 established parametric MVP; Loop 72 verified place/drag/edit; Loop 74 fixed selected furniture label/resize affordance overflow. | Parametric candidate only; SVG furniture runtime package remains blocked. |
| Material preference | PASS_WITH_NOTES | Loop 72 and Loop 74 kept candidate material tags in furniture data. | Material tags are preferences, not pricing rules. |
| Inspector / status panel | PASS_WITH_NOTES | Loop 73 verified narrow viewport inspector remains usable with internal scrolling; Loop 74 fixed selected furniture affordance readability. | Some advanced diagnostics remain non-production. |
| Delete / undo / redo | PASS | Loop 23 verified undo/redo; Loop 72 verified delete/undo/redo restore in mixed workflow. | Command history is runtime draft state only. |
| Candidate JSON export | PASS | Loop 72 exported walls/openings/zones/furniture/tool catalog/layout object summary; Loop 73 and Loop 74 preserved candidate guard. | Candidate JSON only. |
| `.pc` production export | DISABLED_PASS | Loop 72/73/74 observed disabled `.pc` controls. | No Plancraft production export. |
| SVG furniture package | BLOCKED_BY_DESIGN | Loop 4A strict QA kept 0 runtime include; 20 allow-after-QA / 64 quarantined require reviewer/commander disposition. | No SVG candidate is in runtime package. |

## Evidence Pointers

| Loop | File | Decision |
|---|---|---|
| 70 | `docs/plan_puzzle_repair/PLAN_PUZZLE_TARGET_LOOP_70_WALL_CLASSIFICATION_REGRESSION.md` | WALL_CLASSIFICATION_REGRESSION_PASS |
| 71 | `docs/plan_puzzle_repair/PLAN_PUZZLE_TARGET_LOOP_71_ZONE_BOUNDARY_REGRESSION.md` | ZONE_BOUNDARY_REGRESSION_PASS_AFTER_MINIMAL_PATCH |
| 72 | `docs/plan_puzzle_repair/PLAN_PUZZLE_TARGET_LOOP_72_FULL_MIXED_OBJECT_WORKFLOW_REGRESSION.md` | FULL_MIXED_OBJECT_WORKFLOW_PASS_WITH_NOTES |
| 73 | `docs/plan_puzzle_repair/PLAN_PUZZLE_TARGET_LOOP_73_NARROW_VIEWPORT_INSPECTOR_REGRESSION.md` | NARROW_VIEWPORT_INSPECTOR_READABILITY_PASS_WITH_NOTES |
| 74 | `docs/plan_puzzle_repair/PLAN_PUZZLE_TARGET_LOOP_74_SELECTED_FURNITURE_LABEL_AFFORDANCE_POLISH.md` | SELECTED_FURNITURE_LABEL_AFFORDANCE_POLISH_PASS_WITH_NOTES |

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

## Remaining Notes

- This branch is not production-ready and should not be described as a formal budget source.
- Current runtime evidence supports a human-test-usable Plan Puzzle candidate workflow.
- SVG furniture package integration remains excluded until separate overlay QA / reviewer acceptance authorizes package import.
- Two local failed/diagnostic JSON files remain untracked and were intentionally not committed:
  - `docs/plan_puzzle_repair/loop73-narrow-inspector-regression-r2.json`
  - `docs/plan_puzzle_repair/loop74-selected-furniture-label-regression-r1.json`

## Decision

The current repair branch is ready for A2 / reviewer review as `CURRENT_REPAIR_BRANCH_HUMAN_OPERABLE_PASS_WITH_NOTES`.

Next automatic task: prepare PR/reviewer scope packet or address any new concrete human-operability defect reported by A2, without touching Plancraft core, budget runtime, package dependencies, or SVG runtime package.
