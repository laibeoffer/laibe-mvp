# Plan Puzzle Target Loop 19 Narrow Inspector / Material / Delete Regression

## Scope

- role: B_PLAN_PUZZLE_REPAIR_COMMANDER
- worktree: Z:\08-Jacky\laibe_MVP_project\_codex_worktrees\laibe_project\plan-puzzle-test-repair-worktree-20260611
- branch: codex/plan-puzzle-test-repair-worktree-20260611
- runtime files:
  - src/stitch_laibe_landing_onboarding/preview_floor_plan/code.html
  - src/stitch_laibe_landing_onboarding/preview_floor_plan/plan-puzzle.js
- validation urls:
  - http://127.0.0.1:50362/src/stitch_laibe_landing_onboarding/preview_floor_plan/code.html?validation=loop19-desktop-inspector-material-delete-rerun
  - http://127.0.0.1:50362/src/stitch_laibe_landing_onboarding/preview_floor_plan/code.html?validation=loop19-narrow-path-layout-rerun

## Defect Proven Before Patch

Browser/CDP smoke found that the selected furniture inspector could update materialTags and note, and Delete removed the selected furniture, but widthMm / depthMm edits were unreliable when typed as multi-digit values.

Root cause: `handleDocumentInput` committed every `selected-furniture-*` input event. Each keystroke triggered an inspector re-render, interrupting multi-digit typing before the final value could be entered.

## Minimal Patch

Runtime patch limited to `plan-puzzle.js`.

- `selected-furniture-*` fields no longer commit on every `input` event.
- Furniture fields still commit through existing `change` / `blur` handling.
- This preserves human multi-digit typing for widthMm / depthMm and notes without changing the data model.

## Desktop Browser Evidence After Patch

| Check | Expected | Actual | Status | Evidence |
|---|---|---|---|---|
| Page load | Local Plan Puzzle page loads | Page loaded at Loop 19 desktop validation URL | PASS | CDP browser session |
| Console | No blocking browser errors | badEventCount `0` | PASS | CDP Runtime / Log events |
| Select furniture | Selecting wardrobe foregrounds furniture inspector | inspectorHasFurniture `true`; selectedName `Wardrobe` | PASS | DOM and project data |
| Width edit | widthMm can be typed as multi-digit value | widthMm `2100` in Candidate JSON preview | PASS | `[data-testid="candidate-export-json-preview"]` |
| Depth edit | depthMm can be typed as multi-digit value | depthMm `650` in Candidate JSON preview | PASS | `[data-testid="candidate-export-json-preview"]` |
| Material edit | materialTags update from native select | materialTags `["stone"]` | PASS | Candidate JSON preview |
| Note edit | note can be typed without losing text | note `Loop 19 material note` | PASS | Candidate JSON preview |
| Delete | Delete selected furniture only | furniture DOM `0`, furniture `0`, layoutObjects `0` after Delete | PASS | DOM and JSON preview |
| Candidate guard | Furniture remains candidate-only | budgetEngineCalled `false`; formalEstimate `false`; productionReady `false` | PASS | Candidate JSON preview |
| `.pc` guard | Production `.pc` export remains disabled | pcDisabled `true` | PASS | DOM guard |

## Narrow Viewport Evidence

| Check | Expected | Actual | Status | Evidence |
|---|---|---|---|---|
| Viewport | 390 x 800 narrow viewport loads without horizontal overflow | bodyScrollWidth `390`, horizontalOverflow `false` | PASS | CDP layout evidence |
| File area | File area remains visible in path layout | fileArea `370 x 279`, sticky top `140px` | PASS | layout rect |
| Workbench order | Tools / canvas / status stack safely on narrow viewport | toolShell `370 x 3627`, canvas `368 x 501`, inspector `368 x 1396` | PASS_WITH_NOTES | responsive stacked layout |
| Mobile shortcut | Focus canvas shortcut visible | mobileShortcutDisplay `flex` | PASS | computed style |
| Focus canvas | Shortcut scrolls canvas into viewport | scrollY `511`; canvasIntersectsViewport `true` | PASS | layout rect after focus |

## Guard Result

- Plancraft core touched: false
- budget runtime touched: false
- formalEstimateGuard changed: false
- Budget Engine called: false
- PricingRule / BudgetEstimateLine touched: false
- payment / DB / AI / LINE / n8n touched: false
- package.json / node_modules added: false
- git add / stage / push / merge: false

## Result

LOOP_19_NARROW_INSPECTOR_MATERIAL_DELETE_PATCH_VERIFIED

Remaining note: narrow viewport is usable and overflow-free, but the full workbench still stacks tall. This is acceptable for the current path-mode repair because desktop CAD-like operation remains the primary target and the mobile shortcut brings the canvas into view.
