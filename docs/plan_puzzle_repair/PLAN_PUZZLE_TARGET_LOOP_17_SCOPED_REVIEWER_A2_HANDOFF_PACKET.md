# Plan Puzzle Target Loop 17 - Scoped Reviewer / A2 Handoff Packet

## Result

`LOOP_17_SCOPED_REVIEWER_A2_HANDOFF_READY_WITH_NON_PRODUCTION_BOUNDARIES`

## Worktree

- path: `Z:\08-Jacky\laibe_MVP_project\_codex_worktrees\laibe_project\plan-puzzle-test-repair-worktree-20260611`
- branch: `codex/plan-puzzle-test-repair-worktree-20260611`
- HEAD: `34e9a7c84d32941d5b66e6bd61c7b085c80e3ec5`
- staged count: `0`

## Runtime Scope

| File | Scope | Evidence | Risk |
|---|---|---|---|
| `src/stitch_laibe_landing_onboarding/preview_floor_plan/code.html` | Path-mode layout and CSS canvas height repair | Loop 15 layout evidence; Loop 16 functional smoke | Medium, runtime UI file |
| `src/stitch_laibe_landing_onboarding/preview_floor_plan/plan-puzzle.js` | Existing prior repair worktree dirty file, not modified by Loop 15/16 | Syntax check PASS | Existing dirty runtime candidate |

## Loop 15 / 16 Evidence Map

| Loop | Evidence File | Decision | Browser Evidence |
|---|---|---|---|
| Loop 15 | `docs/plan_puzzle_repair/PLAN_PUZZLE_TARGET_LOOP_15_PATH_LAYOUT_MODE_REGRESSION.md` | `LOOP_15_PATH_LAYOUT_MODE_PASS_WITH_PDF_BOUNDARY` | Top file area; desktop tools/canvas/status order; background preserved; sample PDF boundary |
| Loop 16 | `docs/plan_puzzle_repair/PLAN_PUZZLE_TARGET_LOOP_16_PATH_LAYOUT_FUNCTIONAL_SMOKE_AND_PATCH.md` | `LOOP_16_PATH_LAYOUT_FUNCTIONAL_SMOKE_PATCH_VERIFIED` | Canvas height restored; draw wall; door/window/opening; furniture; candidate JSON; `.pc` disabled |

## Functional Smoke Summary

Validation URL:
`http://127.0.0.1:50362/src/stitch_laibe_landing_onboarding/preview_floor_plan/code.html?validation=loop16-path-layout-post-patch-functional-smoke`

| Check | Result |
|---|---|
| file area above workbench | PASS |
| desktop tools / canvas / status left-to-right | PASS |
| `#planCanvas` height | PASS, `590px` |
| draw wall | PASS, exported walls `1` |
| add door/window/opening | PASS, exported openings `3` |
| parametric furniture placement | PASS, exported furniture `1`, layoutObjects `1` |
| candidate JSON preview | PASS |
| `.pc` production export disabled | PASS |
| console warnings/errors | PASS, `0` |

## Verification Commands

| Command | Result |
|---|---|
| `node --check src/stitch_laibe_landing_onboarding/preview_floor_plan/plan-puzzle.js` | PASS |
| `git diff --check` | PASS with LF-to-CRLF warnings only |
| staged count | `0` |
| forbidden runtime scan | PASS; only boundary text hit in docs |

## Guard Statement

- Plancraft core touched: false.
- Budget runtime touched: false.
- Budget Engine called: false.
- PricingRule / BudgetEstimateLine touched: false.
- formalEstimateGuard changed: false.
- DB / payment / AI API / LINE / n8n touched: false.
- package.json / node_modules touched: false.
- `.pc` production export remains disabled.
- Candidate JSON remains candidate-only and not production quantity facts.

## Remaining Non-production Boundaries

- SVG furniture package runtime remains blocked until candidate-only dispositions and separate integration task are accepted.
- Candidate JSON is not a production budget input.
- PR / merge readiness is not asserted by this packet.
- Undo / redo remains unavailable unless separately implemented.
- PDF direct preview remains a bounded future import pipeline; `sample.pdf` was readable but not converted into production runtime.

## Reviewer / A2 Request

`REQUEST_A2_REVIEW_FOR_SCOPED_RUNTIME_REPAIR_AND_BROWSER_EVIDENCE`

Review should focus on:

1. Whether the path-mode layout patch is scope-clean.
2. Whether Loop 16 proves the canvas collapse regression was fixed.
3. Whether candidate JSON / `.pc` / budget guard wording remains acceptable.
4. Whether this worktree output is ready for a scoped PR package, without claiming production readiness.

## Next Automatic Task

If no new instruction arrives in 20 minutes, continue with targeted human-operability regression for the remaining user-facing path-mode interactions: material edit in the right inspector, delete selected object after path-mode smoke, and narrow viewport canvas reachability.
