# Plan Puzzle Target Loop 5 Inspector / Material Matrix

## Scope

- workstream: Plancraft+ Plan Puzzle Repair
- commander: B_PLAN_PUZZLE_REPAIR_COMMANDER
- loop: Target Loop 5
- task: Inspector / Material polish and JSON export evidence hardening
- source runtime:
  - `src/stitch_laibe_landing_onboarding/preview_floor_plan/code.html`
  - `src/stitch_laibe_landing_onboarding/preview_floor_plan/plan-puzzle.js`
- global blackboard write: false

## Current Baseline

- Loop 4B parametric furniture / cabinet MVP: PASS_WITH_NOTES
- SVG furniture package runtime: BLOCKED_UNTIL_OVERLAY_QA
- Browser evidence available:
  - blank-mm draft creates calibrated project state
  - wardrobe placement works
  - drag works
  - resize works
  - widthMm / depthMm / note edit works
  - material action applies `stone`
  - delete works
  - second item creation works
  - console error count: 0
- Remaining limitation:
  - Codex in-app Browser does not support download content capture.
  - A browser-verifiable candidate JSON preview/readout is now available after draft export and replaces the download-capture dependency for QA evidence.

## Inspector / Material Pass-Fail Matrix

| Area | Required Behavior | Current Evidence | Status | Owner | Focused Fix / Next |
|---|---|---|---|---|---|
| Selected furniture identity | Inspector displays selected item id / name / type / category | Selected furniture candidate card shows id, type, category | PASS | Inspector / Material Builder | Keep as-is |
| Candidate guard fields | Inspector displays budgetCandidate true, productionReady false, notFormalEstimate true | Browser evidence showed all three guard fields for selected Wardrobe | PASS | Data Guard | Keep as-is |
| widthMm edit | Inspector input updates object width | Browser evidence updated Wardrobe to width 2200 | PASS | Inspector / Material Builder | Keep as-is |
| depthMm edit | Inspector input updates object depth | Browser evidence updated Wardrobe to depth 700 | PASS | Inspector / Material Builder | Keep as-is |
| note edit | Inspector note input persists on selected item | Browser evidence updated note to `Loop 4B QA note` | PASS | Inspector / Material Builder | Keep as-is |
| material select | Native material select updates materialTags | Browser evidence: `selected-furniture-material` set to `fabric`; Candidate JSON Preview shows furniture/materialTags `fabric` and layoutObjects/materialTags `fabric` | PASS | Inspector / Material Builder | Keep as-is |
| material quick action | Material button applies tag to selected item | Browser evidence message: `Applied stone to Wardrobe. Candidate only.` | PASS | Inspector / Material Builder | Keep as-is |
| material export | Export payload includes materialTags | Browser preview/readout shows `materialTags` present, source export path includes `materialTags` in normalized furniture and layout objects | PASS_WITH_NOTES | QA / Browser Evidence | Download file content remains TOOL_LIMITED, but browser-verifiable preview is sufficient for runtime QA |
| delete selected furniture | Delete selected furniture removes only selected item | Browser evidence: furniture count 0 after delete | PASS | Furniture / Cabinet Builder | Keep as-is |
| second item creation | New template can be placed after delete | Browser evidence: Bed created | PASS | Furniture / Cabinet Builder | Keep as-is |
| inspector readability | Status panel is understandable as property panel, not only debug text | Candidate card is functional but still dense; mixed Plancraft spike/debug cards remain visible below | PARTIAL | Inspector / Material Builder | Collapse developer / Plancraft diagnostic sections by default or separate them from active property workflow |
| JSON export content capture | QA can prove exported JSON contains furniture candidate | Candidate JSON Preview panel shows furniture 1, toolCatalogItems 10, layoutObjects 1, formalEstimate false, budgetEngineCalled false, productionReady false | PASS_WITH_NOTES | QA / Browser Evidence | Keep download behavior; use preview/readout for browser QA evidence |

## Focused Repair Plan

1. Keep `export-draft` download behavior and the browser-verifiable Candidate JSON Preview panel.
2. Reduce inspector noise by keeping selected-object property controls foregrounded and Plancraft / renderer diagnostics visually separated or collapsed.

## Guard Boundary

- No Plancraft core touch.
- No Budget Engine call.
- No `generateBudgetEstimate`.
- No formal estimate.
- No payment / DB / AI API.
- No package / node_modules.
- Furniture and cabinet objects remain candidate-only:
  - `budgetCandidate: true`
  - `productionReady: false`
  - `notFormalEstimate: true`

## Loop 5 Result

LOOP_5_EXPORT_PREVIEW_PASS_WITH_NOTES

## Loop 5 Browser Evidence

- validation URL: http://127.0.0.1:50361/code.html?validation=loop5-candidate-export-preview
- console error count: 0
- candidate preview exists: true
- furniture count in preview: 1
- toolCatalogItems count in preview: 10
- layoutObjects count in preview: 1
- materialTags: present
- formalEstimate: false
- budgetEngineCalled: false
- productionReady: false
- JSON preview includes:
  - `furniture`
  - `toolCatalogItems`
  - `layoutObjects`
  - `candidateExportBoundary`
  - `budgetCandidate: true`
  - `productionReady: false`
  - `notFormalEstimate: true`

## Loop 5 Native Material Select Evidence

- validation URL: http://127.0.0.1:50361/code.html?validation=loop5-native-material-select
- action: set native `#selected-furniture-material` to `fabric`
- selected value after action: `fabric`
- Candidate JSON Preview:
  - `furniture[0].materialTags`: `fabric`
  - `layoutObjects[0].materialTags`: `fabric`
  - `budgetCandidate`: true
  - `productionReady`: false
  - `notFormalEstimate`: true
- console error count: 0

## Next Automatic Task

If no new packet arrives in 20 minutes, produce the inspector noise/collapse repair plan and identify the smallest runtime patch.
