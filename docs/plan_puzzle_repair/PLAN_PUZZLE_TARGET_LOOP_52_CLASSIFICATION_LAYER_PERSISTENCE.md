# Plan Puzzle Target Loop 52 Classification / Layer Persistence Regression

## Result

`LOOP_52_CLASSIFICATION_LAYER_PERSISTENCE_PASS_CORRECTED_HARNESS_FIELD_NAME`

## Scope

- Validation URL: `http://127.0.0.1:50362/src/stitch_laibe_landing_onboarding/preview_floor_plan/code.html?validation=loop52-classification-layer-persistence`
- Viewport: `1280 x 620`
- Purpose: verify selected object property edits are not UI-only and are persisted in candidate JSON.

## Browser Evidence

Evidence files:

- Raw result: `docs/plan_puzzle_repair/PLAN_PUZZLE_TARGET_LOOP_52_CLASSIFICATION_LAYER_PERSISTENCE_RESULT.json`
- Corrected result: `docs/plan_puzzle_repair/PLAN_PUZZLE_TARGET_LOOP_52_CLASSIFICATION_LAYER_PERSISTENCE_CORRECTED_RESULT.json`
- Screenshot: `docs/plan_puzzle_repair/PLAN_PUZZLE_TARGET_LOOP_52_CLASSIFICATION_LAYER_PERSISTENCE.png`
- Candidate JSON: `docs/plan_puzzle_repair/PLAN_PUZZLE_TARGET_LOOP_52_CLASSIFICATION_LAYER_PERSISTENCE_EXPORT.json`

| Check | Result | Evidence |
|---|---|---|
| page load | PASS | `#planCanvas visible` |
| draw wall | PASS | `wallHitTargets=1` |
| add door | PASS | `openingHitTargets=1` |
| edit opening metadata | PASS | offset `600`, width `760`, swing `right` |
| edit wall classification | PASS | status `demolished`, wallType `light_partition`, thickness `100` |
| place furniture | PASS | `furnitureItems=1` |
| edit furniture metadata | PASS | width `1600`, depth `550`, height `2300`, rotation `90`, material `system_panel`, note set |
| candidate JSON export | PASS | walls `1`, openings `1`, furniture `1`, layoutObjects `1`, toolCatalogItems `10` |
| wall persistence | PASS | exported wall status/type/thickness match inspector edits |
| opening persistence | PASS | exported opening offset/width/swing match inspector edits |
| furniture persistence | PASS | exported furniture size/material/note match inspector edits |
| layoutObject persistence | PASS | `layoutObjects[0]` mirrors furniture size/material/note candidate |
| `.pc` production export disabled | PASS | disabled buttons `3` |
| candidate guard | PASS | `formalEstimate=false`, `budgetEngineCalled=false`, `productionReady=false` |
| console errors | PASS | `0` |
| console warnings | PASS | `0` |

## Correction Note

The raw Loop 52 result was marked FAIL because the harness checked `draft.layout_objects`.

Runtime export uses camelCase `draft.layoutObjects`, and the candidate JSON contains:

- `layoutObjects.length = 1`
- `layoutObjects[0].objectType = parametric_furniture_candidate`
- `layoutObjects[0].sizeMm.width = 1600`
- `layoutObjects[0].sizeMm.depth = 550`
- `layoutObjects[0].materialTags = ["system_panel"]`
- `layoutObjects[0].productionReady = false`
- `layoutObjects[0].notFormalEstimate = true`

No runtime patch was required.

## Data Guard

- No Budget Engine call.
- No formal estimate output.
- No `.pc` production export.
- Wall / opening / furniture remain candidate data.
- Furniture and layout object remain `productionReady=false`, `notFormalEstimate=true`.

## Remaining Notes

- The wall was intentionally changed to `demolished` after the opening edit to verify classification persistence; this is a candidate draft state, not a production construction sequence.
- True OCR / image dimension-line recognition remains separate and not claimed complete.
- SVG furniture package runtime include remains blocked until reviewer / commander accepts candidate-only dispositions and a separate package integration task is authorized.

## Next Demand

`Loop 53 - Layer visibility / object visibility regression after classification edits, verifying hide/show does not delete wall, opening, furniture, material, or candidate JSON data.`
