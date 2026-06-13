# Plan Puzzle Target Loop 41 - Below-canvas Layout / PPT-like Direct Smoke

## 1. Scope

- role: B_PLAN_PUZZLE_REPAIR_COMMANDER
- loop: Target Loop 41
- task: Below-canvas notes / supplemental area audit and PPT-like direct manipulation smoke
- worktree: `Z:\08-Jacky\laibe_MVP_project\_codex_worktrees\laibe_project\plan-puzzle-test-repair-worktree-20260611`
- branch: `codex/plan-puzzle-test-repair-worktree-20260611`
- HEAD: `34e9a7c84d32941d5b66e6bd61c7b085c80e3ec5`

## 2. Decision

`LOOP_41_BELOW_CANVAS_LAYOUT_AND_PPT_SMOKE_PASS_WITH_MINIMAL_RUNTIME_PATCH`

Loop 41 found two layout defects and patched them inside `code.html` only:

1. Desktop inspector tabs stretched vertically because `#inspectorBody` grid rows were stretching to fill the panel.
2. Mobile canvas could overflow its canvas shell and overlap later tool / inspector sections after using the mobile jump shortcut.

No `plan-puzzle.js` runtime logic patch was needed in Loop 41.

## 3. Runtime Patch

Allowed runtime file changed:

- `src/stitch_laibe_landing_onboarding/preview_floor_plan/code.html`

Patch summary:

- `#inspectorBody` now aligns content to the top and scrolls internally.
- Mobile `.tool-shell` now aligns content to the top.
- Mobile `.canvas-shell` now has a stable minimum height so `#planCanvas` stays contained before tool / inspector panels.

## 4. Desktop Layout Evidence

Validation URL:

`http://127.0.0.1:50362/src/stitch_laibe_landing_onboarding/preview_floor_plan/code.html?validation=loop41-desktop-layout-post-patch`

Screenshots:

- `docs/plan_puzzle_repair/PLAN_PUZZLE_TARGET_LOOP_41_DESKTOP_LAYOUT_AUDIT.png`
- `docs/plan_puzzle_repair/PLAN_PUZZLE_TARGET_LOOP_41_DESKTOP_LAYOUT_POST_PATCH.png`

| Check | Expected | Actual | Status |
|---|---|---|---|
| Page load | Page loads without blocking console errors | console errors 0, warnings 0, page errors 0 | PASS |
| File area | Top file area stays compact | top 10, bottom 95, height 85 | PASS |
| Workbench | Tool / canvas / inspector share the main viewport | toolShell height 597, canvasShell height 595, inspector height 595 | PASS |
| Canvas | Canvas remains in first drawing viewport | `#planCanvas` top 106, bottom 653, height 547 | PASS |
| Inspector tabs | Tabs should not become giant buttons | tab heights all 32 px after patch | PASS |
| Below-canvas notes | Notes should not push the drawing board down | only the compact file-area note is visible in the first viewport | PASS |
| `.pc` boundary | Production export remains disabled | `.pc` button disabled | PASS |

## 5. Mobile Layout Evidence

Validation URL:

`http://127.0.0.1:50362/src/stitch_laibe_landing_onboarding/preview_floor_plan/code.html?validation=loop41-mobile-layout-post-patch`

Screenshots:

- `docs/plan_puzzle_repair/PLAN_PUZZLE_TARGET_LOOP_41_MOBILE_LAYOUT_POST_PATCH_BEFORE_JUMP.png`
- `docs/plan_puzzle_repair/PLAN_PUZZLE_TARGET_LOOP_41_MOBILE_LAYOUT_POST_PATCH_AFTER_JUMP.png`

| Check | Expected | Actual | Status |
|---|---|---|---|
| Mobile shortcut | Shortcut remains visible before jumping to canvas | top 322, bottom 436, visible true | PASS |
| Canvas shell | Canvas shell contains the drawing canvas | canvasShell height 520; planCanvas height 472; contained true | PASS |
| Jump behavior | Jump should land on the drawing board, not overlap tools | after jump, canvasShell top 101, bottom 621 | PASS |
| Tool overlap | Tool / inspector panels must not overlap canvas | toolPanel top 621 after jump; no overlap | PASS |
| Console | No browser errors or warnings | errors 0, warnings 0, page errors 0 | PASS |

## 6. PPT-like Direct Manipulation Smoke

Validation URL:

`http://127.0.0.1:50362/src/stitch_laibe_landing_onboarding/preview_floor_plan/code.html?validation=loop41-ppt-like-direct-smoke`

Evidence:

- screenshot: `docs/plan_puzzle_repair/PLAN_PUZZLE_TARGET_LOOP_41_PPT_LIKE_SMOKE.png`
- exported JSON: `docs/plan_puzzle_repair/PLAN_PUZZLE_TARGET_LOOP_41_PPT_LIKE_SMOKE_EXPORT.json`

| Step | Expected | Actual | Status |
|---|---|---|---|
| Blank draft | User can start a calibrated blank draft | Started from visible button | PASS |
| Draw wall | User can choose wall and click two points | export contains walls 1 | PASS |
| Add door | User can add a door on selected wall | export contains openings 1 | PASS |
| Place cabinet | User can choose wardrobe and click canvas | furniture DOM count 1 | PASS |
| Drag object | Furniture can move like a direct-manipulation object | furniture coordinates changed before export | PASS |
| Resize object | Furniture resize handle changes visible size | furniture text updated after resize | PASS |
| Edit dimensions | Right inspector can change width / depth | width 2200, depth 700 after input and blur | PASS |
| Add note | Right inspector can save note | note `Loop 41 PPT-like smoke` exported | PASS |
| Apply material | Material selection updates candidate | materialTags includes `wood` | PASS |
| Export JSON | Candidate JSON downloads and parses | walls 1, openings 1, furniture 1, layoutObjects 1, toolCatalogItems 10 | PASS |
| Candidate guard | Export remains draft-only | formalEstimate false, budgetEngineCalled false, productionReady false | PASS |
| `.pc` export | Production export remains disabled | `.pc` disabled true | PASS |
| Console | No blocking browser errors | errors 0, warnings 0, page errors 0 | PASS |

## 7. Guard Check

- Plancraft core touched: NO
- `plancraft/` touched: NO
- budget runtime touched: NO
- Budget Engine called: NO
- PricingRule / BudgetEstimateLine touched: NO
- formalEstimateGuard changed: NO
- DB / payment / AI API / LINE / n8n touched: NO
- package.json / node_modules added: NO
- git add / stage / push / merge / PR / reset / clean / delete: NO

## 8. Remaining Defects / Blockers

- `NONE_OBSERVED_IN_LOOP_41_PPT_SMOKE`

Guarded non-blocking items still open:

- True OCR / image dimension-line scale detection remains future P1 work; filename clue autoscale is already guarded and verified.
- SVG furniture package runtime remains blocked until reviewer / commander accepts candidate-only dispositions and authorizes a separate package integration task.
- Mobile deep interaction polish can continue, but Loop 41 confirms no canvas overlap / inspector tab stretch blocker.

## 9. Next Demand

`Loop 42 - Mobile and desktop direct-manipulation affordance audit: verify selected-object handles, delete affordance, visible mode hint, inspector tab relevance, and no hidden duplicate control traps.`
