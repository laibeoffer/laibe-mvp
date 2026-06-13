# Plan Puzzle Target Loop 48 - Human UX Polish Triage

## Result

`LOOP_48_UX_POLISH_TRIAGE_PASS_WITH_MINIMAL_PATCH`

## Defect Found

The canvas furniture / fixture label still exposed raw English item type slugs, for example:

- before: `馬桶 / toilet / 420 x 700 mm`
- after: `馬桶 / 420 x 700 mm`

This was a human-facing UX defect because the user requested an all-Chinese, intuitive Plan Puzzle interface.

## Runtime Patch

Allowed runtime file only:

- `src/stitch_laibe_landing_onboarding/preview_floor_plan/plan-puzzle.js`

Change:

- Canvas furniture label now uses `getFurnitureTypeLabel(item.type)` instead of raw `item.type`.

## Browser Evidence

Validation URL:

`http://127.0.0.1:50362/src/stitch_laibe_landing_onboarding/preview_floor_plan/code.html?validation=loop48-chinese-furniture-label`

| Check | Expected | Actual | Status | Evidence |
|---|---|---|---|---|
| Page load | Page opens | PASS | PASS | Result JSON |
| PNG import / scale | Existing filename scale path still works | PASS | PASS | Result JSON |
| Furniture label | Visible canvas label uses Chinese type, not English slug | `馬桶 / 420 x 700 mm`; no `toilet` in label | PASS | Screenshot + corrected result |
| Candidate JSON export | Export still works | furniture type remains machine-readable `toilet`, display name `馬桶` | PASS | Export JSON |
| Candidate boundary | No formal / budget runtime output | `formalEstimate=false`, `budgetEngineCalled=false`, `productionReady=false` | PASS | Export JSON |
| Console errors | No errors | `0` | PASS | Corrected result JSON |

## Evidence Files

- `docs/plan_puzzle_repair/PLAN_PUZZLE_TARGET_LOOP_48_CHINESE_FURNITURE_LABEL_RESULT.json`
- `docs/plan_puzzle_repair/PLAN_PUZZLE_TARGET_LOOP_48_CHINESE_FURNITURE_LABEL_CORRECTED_RESULT.json`
- `docs/plan_puzzle_repair/PLAN_PUZZLE_TARGET_LOOP_48_CHINESE_FURNITURE_LABEL.png`
- `docs/plan_puzzle_repair/PLAN_PUZZLE_TARGET_LOOP_48_CHINESE_LABEL_EXPORT.json`

## Correction Note

The raw result had one harness false negative on `visibleChineseLabel` due stdin / PowerShell Chinese literal handling. The raw captured label text is `馬桶\n馬桶 / 420 x 700 mm`, so the corrected result marks the human-facing label check PASS.

## Data Guard

PASS.

- Machine-readable type remains `toilet` inside candidate JSON for downstream schema stability.
- Visible canvas label is Chinese.
- No Plancraft core touched.
- No budget runtime touched.
- No Budget Engine / `generateBudgetEstimate` call.
- No DB / payment / AI / LINE / n8n.
- `.pc` production export remains disabled.

## Next Loop Demand

`Loop 49 - Focused mobile / small-height viewport operability audit for the same human-test usable core flow.`
