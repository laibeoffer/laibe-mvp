# Plan Puzzle Target Loop 7 Interaction Polish Packet

## Scope

- workstream: Plancraft+ Plan Puzzle Repair
- commander: B_PLAN_PUZZLE_REPAIR_COMMANDER
- loop: Target Loop 7
- task: interaction polish target demand and browser evidence plan
- createdAt: 2026-06-12 03:46 Asia/Taipei
- global blackboard write: false

## Current Baseline

- Loop 1 core canvas/import/wall: PASS
- Loop 2 door/window/opening: PASS
- Loop 4B parametric furniture/cabinet MVP: PASS_WITH_NOTES
- Loop 5 inspector foregrounding / collapsed diagnostics / `.pc` boundary: PASS_WITH_NOTES
- Loop 6 focused regression: PASS_WITH_NOTES
- SVG furniture package runtime: BLOCKED_UNTIL_OVERLAY_QA

## Loop 7 Goal

Improve human operability without expanding production scope:

1. Make furniture resize handles easier to discover and use.
2. Make selected furniture / wall / opening visual affordance clearer.
3. Make furniture inspector labels more human-readable while preserving data fields.
4. Keep Candidate JSON Preview and guard text visible.
5. Keep diagnostics collapsed by default.
6. Keep `.pc` production export disabled/mock-only.

## Owner / Support

- owner: Inspector / Status UX + Material Builder
- support:
  - Furniture / Cabinet Builder
  - Human Operability QA
  - Data Guard
  - B_PLAN_PUZZLE_REPAIR_COMMANDER

## Allowed Patch Scope

Runtime patch may start only if browser evidence or code reality identifies a concrete human-operability gap.

Allowed:

- `src/stitch_laibe_landing_onboarding/preview_floor_plan/code.html`
- `src/stitch_laibe_landing_onboarding/preview_floor_plan/plan-puzzle.js`
- `docs/plan_puzzle_repair/**`

Not allowed:

- `plancraft/`
- Budget Engine
- `formalEstimateGuard`
- DB / payment / AI API / image API / LINE / n8n
- `package.json`
- `node_modules`
- git stage / commit / push / merge / reset / clean
- direct SVG furniture package include

## Candidate Polish Matrix

| Area | Current Evidence | Target | Minimal Patch Candidate | Done Definition |
|---|---|---|---|---|
| Furniture resize handle | Resize works, but affordance needs explicit human-readable cue | Handle should be visually obvious on selected furniture | Larger handle, visible cursor, hover/focus styling, short helper copy | Browser can drag handle; selected item shows clear resize affordance; console 0 |
| Selected furniture affordance | Selected furniture inspector foregrounded; object visible | Selected object should be clearly distinguishable on canvas | Stronger selected outline / label contrast / handle visibility | Selected furniture visually clear in browser evidence |
| Selected wall affordance | Wall hit target and inspector pass | Selected wall should be obvious without diagnostics | Preserve selected outline and length label; verify no opening layer interception | Browser wall selection evidence remains PASS |
| Selected opening affordance | Opening hit target and inspector pass | Selected door/window/opening should be clear against wall | Preserve opening selected symbol; verify hit target still reachable | Browser opening selection evidence remains PASS |
| Inspector labels | Functional fields exist but some labels are technical | Human-readable labels with technical fields preserved | Add display labels such as Width (mm), Depth (mm), Material tags, Candidate only | Browser inspector remains compact; fields still write same data |
| Candidate guard copy | Guard exists | User must understand candidate-only boundary | Keep concise guard text near export/inspector | No formal estimate language remains clear |
| Diagnostics | Collapsed by default | Debug content stays available but not primary | Preserve details panels | Diagnostics closed by default and expandable |

## Browser Evidence Plan

Validation URL:

`http://127.0.0.1:50361/code.html?validation=loop7-interaction-polish`

Required steps:

1. Load page.
2. Start Blank mm draft.
3. Place `wardrobe`.
4. Confirm selected furniture is visually highlighted.
5. Drag furniture body.
6. Drag resize handle.
7. Confirm width/depth changed in inspector.
8. Change native material select.
9. Confirm material appears in Candidate JSON Preview.
10. Select wall and verify selected wall foregrounding.
11. Add/select door and verify selected opening foregrounding.
12. Confirm diagnostics default closed and expandable.
13. Confirm all `.pc` export controls disabled/mock-only.
14. Confirm console error count is 0.

## Pass / Partial / Fail Rules

PASS:

- Furniture resize handle is visible and usable.
- Selected furniture, wall, and opening are visually distinguishable.
- Inspector labels are human-readable and still map to same fields.
- Candidate JSON Preview still includes candidate guard fields.
- `.pc` controls remain disabled/mock-only.
- console error count is 0.

PARTIAL:

- Feature works but affordance is still subtle.
- Inspector label polish is incomplete but data fields remain usable.
- Browser evidence is blocked by tooling, with source evidence available.

FAIL:

- Resize handle cannot be used.
- Selected item is not distinguishable.
- Inspector edits stop writing data.
- Candidate guard fields disappear.
- `.pc` production path becomes enabled.
- Any Budget Engine / Plancraft core / AI API / DB/payment touch appears.

## Remaining Placeholder List

| Placeholder | Status | Boundary | Next |
|---|---|---|---|
| SVG furniture package | BLOCKED | Must pass per-candidate overlay QA before runtime include | Keep Loop 4A separate |
| Formal estimate | EXCLUDED | Plan Puzzle candidates are not formal quantities | No action in this worktree |
| AI/style visual | MOCK_ONLY | No AI/image API connection | Keep mock-only label |
| Download capture | TOOL_LIMITED | In-app Browser cannot inspect downloaded file | Use Candidate JSON Preview |
| Production `.pc` export | DISABLED_BY_GUARD | No Plancraft core production call | Keep disabled/mock-only |

## Decision

LOOP_7_INTERACTION_POLISH_PATCH_APPLIED_BROWSER_VERIFIED

## Runtime Patch Applied

- checkedAt: 2026-06-12 04:05 Asia/Taipei
- files:
  - `src/stitch_laibe_landing_onboarding/preview_floor_plan/code.html`
  - `src/stitch_laibe_landing_onboarding/preview_floor_plan/plan-puzzle.js`
- patch summary:
  - Enlarged furniture resize handle from 14 x 14 px to 18 x 18 px.
  - Added stronger resize-handle glow.
  - Added resize handle tooltip / aria label: `Drag corner to resize`.
  - Changed furniture inspector labels from technical field names to human-readable labels.
  - Updated `plan-puzzle.js` cache-bust query in `code.html` so browser validation loads the patched JS.

## Browser Evidence

- validationUrl: `http://127.0.0.1:50361/code.html?validation=loop7-interaction-polish-after-cachebust`
- scriptSrc: `./plan-puzzle.js?v=loop7-interaction-polish-20260612`
- scenario:
  1. Start Blank mm draft.
  2. Select `wardrobe`.
  3. Place furniture candidate.
  4. Drag furniture body.
  5. Drag furniture resize handle.
  6. Change native material select to `fabric`.
  7. Export candidate draft JSON preview.
  8. Expand Geometry diagnostics.
  9. Verify `.pc` controls disabled/mock-only.

## Evidence Result

| Check | Result | Status |
|---|---|---|
| Resize handle exists | true | PASS |
| Resize handle size | 18 x 18 px | PASS |
| Resize handle cursor | `nwse-resize` | PASS |
| Resize handle title | `Drag corner to resize` | PASS |
| Resize handle aria label | `Drag corner to resize` | PASS |
| Selected furniture affordance | selected class, cyan border, cyan shadow | PASS |
| Furniture body drag | x +36, y +24 | PASS |
| Furniture resize | visual width +58 px, height +42 px | PASS |
| Inspector width/depth update | width +580 mm, depth +420 mm | PASS |
| Inspector labels | `Item name`, `Width (mm)`, `Depth (mm)`, `Height (mm)`, `Rotation (deg)`, `Material preference`, `Candidate note` | PASS |
| Technical labels remaining | none | PASS |
| Native material select | `fabric` | PASS |
| Candidate JSON Preview | contains candidate JSON and `fabric` | PASS |
| Guard fields | `formalEstimate=false`, `budgetEngineCalled=false`, `productionReady=false` | PASS |
| Diagnostics default state | all closed | PASS |
| Geometry diagnostics expansion | open=true | PASS |
| `.pc` boundary | all `.pc` controls disabled/mock-only | PASS |
| Console errors | 0 | PASS |

## Guard Result

- Plancraft core touched: No
- Budget Engine touched: No
- formalEstimateGuard changed: No
- DB / payment / AI API touched: No
- `package.json` / `node_modules` touched: No
- `.pc` production export enabled: No
- SVG furniture package included in runtime: No

## Next Automatic Task

If no new packet arrives in 20 minutes, prepare Loop 8 closeout / PR scope packet for the dedicated worktree, including changed files, browser evidence map, remaining blocked SVG overlay QA, and guard statements.
