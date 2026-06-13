# Plan Puzzle Target Loop 5 Inspector Foregrounding / Diagnostics Collapse Plan

## Scope

- workstream: Plancraft+ Plan Puzzle Repair
- commander: B_PLAN_PUZZLE_REPAIR_COMMANDER
- loop: Target Loop 5
- task: selected-object foregrounding and Plancraft / renderer diagnostics collapse plan
- source runtime:
  - `src/stitch_laibe_landing_onboarding/preview_floor_plan/code.html`
  - `src/stitch_laibe_landing_onboarding/preview_floor_plan/plan-puzzle.js`
- global blackboard write: false

## Current Evidence

- Selected furniture card is rendered first when a furniture item is selected.
- Candidate guard fields are visible in selected furniture inspector:
  - `budgetCandidate: true`
  - `productionReady: false`
  - `notFormalEstimate: true`
- Candidate JSON Preview is browser-verifiable and no longer depends on unsupported download capture.
- Native material select path is browser-verified:
  - selected value: `fabric`
  - preview `furniture[0].materialTags`: `fabric`
  - preview `layoutObjects[0].materialTags`: `fabric`
  - console error count: 0

## Problem

The inspector still appends several diagnostic cards after the selected-object workflow:

- wallGraph
- nodeGraph
- Plancraft Bridge
- .pc converter report
- renderer preview report
- style visual sandbox panel

This is useful for repair/debug work, but noisy for human operation. Selected-object editing should remain foregrounded, and Plancraft / renderer diagnostics should be collapsed by default.

## Current Runtime Pattern

In `renderInspector()`:

- selected object cards render first.
- `renderWallGraphCard()` and `renderNodeGraphCard()` are appended immediately after selected-object cards.
- `bridgePanel` combines:
  - `renderBridgeCard()`
  - `renderPcConverterReportCard()`
  - `renderRendererPreviewReportCard()`
- style visual panel is appended after diagnostics.

## Proposed Smallest Runtime Polish Patch

1. Add a helper:
   - `renderCollapsedDiagnosticsPanel(content, title, summaryText)`
2. Wrap these diagnostics in collapsed `<details>` blocks by default:
   - wall graph / node graph
   - Plancraft Bridge / .pc converter / renderer preview
   - style visual sandbox
3. Keep selected-object property cards and Candidate JSON Preview visible by default.
4. Preserve all existing diagnostics and buttons; do not remove behavior.
5. Do not touch Plancraft core, Budget Engine, DB/payment/AI/API, package.json, or node_modules.

## Acceptance

| Requirement | Acceptance |
|---|---|
| Selected object remains foregrounded | Selected furniture / wall / opening / zone card is first visible inspector content |
| Candidate JSON Preview remains visible | Preview card stays outside collapsed diagnostics |
| Diagnostics collapsed by default | WallGraph, NodeGraph, Bridge, .pc report, renderer report, and style visual are hidden behind `<details>` |
| Existing diagnostics still reachable | User can expand details to inspect reports |
| No runtime guard regression | furniture candidates remain budgetCandidate true, productionReady false, notFormalEstimate true |
| Browser evidence | Page loads, selected furniture inspector renders, details collapsed, expansion works, console error count 0 |

## Patch Boundary

Allowed:

- `src/stitch_laibe_landing_onboarding/preview_floor_plan/plan-puzzle.js`
- dedicated docs under `docs/plan_puzzle_repair/`

Not allowed:

- `plancraft/`
- Budget Engine
- `package.json`
- `node_modules`
- formal estimate / Excel / PDF
- DB / payment / AI API
- global blackboard

## Decision

PATCH_APPLIED_BROWSER_VERIFIED_PASS_WITH_NOTES

## Runtime Patch Applied

- file: `src/stitch_laibe_landing_onboarding/preview_floor_plan/plan-puzzle.js`
- helper added: `renderInspectorDiagnosticsPanel(bridgePanel, styleVisualPanel)`
- behavior:
  - selected-object inspector cards remain visible before diagnostics.
  - Candidate JSON Preview remains visible before diagnostics.
  - wallGraph / nodeGraph are wrapped in a collapsed `details` panel.
  - Plancraft Bridge / `.pc` converter / renderer preview are wrapped in a collapsed `details` panel.
  - style visual sandbox is wrapped in a collapsed `details` panel.

## Browser Evidence

- checkedAt: 2026-06-12 03:03 Asia/Taipei
- validationUrl: `http://127.0.0.1:50361/code.html?validation=loop5-collapse-diagnostics`
- scenario:
  1. Load page.
  2. Start Blank mm draft.
  3. Select `wardrobe`.
  4. Click canvas to place furniture candidate.
  5. Click export draft to show Candidate JSON Preview.
  6. Verify inspector ordering.
  7. Verify diagnostics panels collapsed by default.
  8. Expand Geometry diagnostics panel.
- result:
  - selected furniture card exists: PASS
  - selected furniture card appears before Candidate JSON Preview: PASS
  - Candidate JSON Preview exists: PASS
  - Candidate JSON Preview appears before diagnostics panels: PASS
  - diagnostics panel count: 3
  - default open states:
    - `geometry-diagnostics-panel`: false
    - `plancraft-diagnostics-panel`: false
    - `style-visual-diagnostics-panel`: false
  - geometry diagnostics expansion: PASS
  - furniture candidate count: 1
  - guard text visible: PASS
  - preview guard fields visible: `formalEstimate=false`, `budgetEngineCalled=false`, `productionReady=false`
  - console error count: 0

## Loop 5 Regression Evidence

- checkedAt: 2026-06-12 03:22 Asia/Taipei
- validationUrl: `http://127.0.0.1:50361/code.html?validation=loop5-regression-pc-boundary-final`
- runtime patch added during regression:
  - `code.html`: `.opening-layer` no longer intercepts wall hit-target clicks when empty or above wall layer.
  - `plan-puzzle.js`: diagnostics `.pc spike` button is disabled and marked `data-mock-only="true"`.
- regression scenario:
  1. Start Blank mm draft.
  2. Draw wall.
  3. Select wall through browser hit target.
  4. Add door opening from selected wall inspector.
  5. Select opening through browser hit target.
  6. Place wardrobe furniture candidate.
  7. Export candidate draft JSON preview.
  8. Expand Geometry diagnostics.
  9. Verify `.pc` controls are disabled/mock-only.
- result:
  - wall midpoint hit target: `wall-hit-target`
  - selected wall inspector exists: PASS
  - wall inspector first visible card: PASS
  - opening midpoint hit target: `opening-hit-target`
  - selected opening inspector exists: PASS
  - opening inspector first visible card: PASS
  - selected furniture inspector exists: PASS
  - furniture inspector first visible card: PASS
  - Candidate JSON Preview exists: PASS
  - furniture inspector before Candidate JSON Preview: PASS
  - Candidate JSON Preview before diagnostics: PASS
  - diagnostics default state: all closed
  - Geometry diagnostics expansion: PASS
  - all `.pc` export controls disabled: PASS
  - all `.pc` export controls marked mock-only: PASS
  - console error count: 0

## Regression Defects Resolved

| Defect | Root Cause | Patch | Status |
|---|---|---|---|
| Wall inspector could not be reached by clicking an existing wall after a door/opening layer was present above the wall layer | Empty/upper `opening-layer` intercepted pointer targeting before `wall-hit-target` | Set `.opening-layer` to `pointer-events: none`; keep `.opening-hit-target` as `pointer-events: stroke` | RESOLVED |
| Diagnostics contained an enabled `.pc spike` button while other `.pc` controls were disabled/mock-only | Converter diagnostics button was not aligned with current repair guard boundary | Marked button disabled, mock-only, and no-production | RESOLVED |

## Guard Result

- Plancraft core touched: No
- Budget Engine touched: No
- formalEstimateGuard changed: No
- DB / payment / AI API touched: No
- `package.json` / `node_modules` touched: No
- candidate boundary preserved: PASS
- `.pc` production export enabled: No
- `.pc` controls disabled/mock-only: PASS

## Next Automatic Task

If no new packet arrives in 20 minutes, run Loop 5 regression for selected wall / opening / furniture inspector foregrounding, Candidate JSON Preview, diagnostics expansion, and `.pc` disabled boundary wording.
