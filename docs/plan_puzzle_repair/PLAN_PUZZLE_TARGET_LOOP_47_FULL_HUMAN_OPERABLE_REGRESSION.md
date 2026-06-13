# Plan Puzzle Target Loop 47 - Full Human-operable Regression

## Result

`LOOP_47_FULL_HUMAN_OPERABLE_REGRESSION_PASS`

## Purpose

Re-run the full human-operable drawing flow after Loop 46 import / scale guidance changes. This confirms the wording patch did not regress core drawing actions.

## Browser Evidence

Validation URL:

`http://127.0.0.1:50362/src/stitch_laibe_landing_onboarding/preview_floor_plan/code.html?validation=loop47-full-human-operable-regression-r5`

| Step | Expected | Actual | Status | Evidence |
|---|---|---|---|---|
| Page load | Page opens | PASS | PASS | Corrected result JSON |
| PNG import | `width-3000mm` PNG can be imported | PASS | PASS | Corrected result JSON |
| Scale apply | Filename scale suggestion can be applied | `scaleStatus=已確認` | PASS | Corrected result JSON |
| Draw wall | Long wall can be drawn | walls `1` | PASS | Candidate JSON |
| Door / window / opening | Door, window, opening can be added to long wall | openings `3` | PASS | Candidate JSON |
| Furniture / fixture placement | Item can be placed and selected | furniture `1` | PASS | Screenshot + JSON |
| Drag | Item can be dragged | position changed | PASS | Result JSON |
| Resize handle | Item can be resized by handle | visual box changed | PASS | Result JSON |
| Inspector edit | Width/depth/note/material editable | width `900`, material `system_panel`, note kept | PASS | Candidate JSON |
| Candidate JSON export | Export includes candidate data | walls `1`, openings `3`, furniture `1`, layoutObjects `1`, toolCatalogItems `10` | PASS | Candidate JSON |
| `.pc` production export disabled | Production `.pc` remains disabled | disabled | PASS | Screenshot |
| Console errors/warnings | No browser errors/warnings | `0 / 0` | PASS | Corrected result JSON |

## Evidence Files

- `docs/plan_puzzle_repair/PLAN_PUZZLE_TARGET_LOOP_47_FULL_REGRESSION_R5_RESULT.json`
- `docs/plan_puzzle_repair/PLAN_PUZZLE_TARGET_LOOP_47_FULL_REGRESSION_R5_CORRECTED_RESULT.json`
- `docs/plan_puzzle_repair/PLAN_PUZZLE_TARGET_LOOP_47_FULL_REGRESSION_R5.png`
- `docs/plan_puzzle_repair/PLAN_PUZZLE_TARGET_LOOP_47_FULL_REGRESSION_R5_EXPORT.json`

## Correction Note

The first R5 result had one harness false negative on `scaleApply`: the recorded DOM detail was `scaleStatus: 已確認`, but the script's Chinese literal comparison was affected by PowerShell / stdin encoding. The corrected result keeps the raw R5 file and adds a corrected evidence file. Dependent actions requiring a calibrated scale, including drawing walls and adding openings, also passed.

## Data Guard

PASS.

- Exported candidate boundary: `formalEstimate=false`, `budgetEngineCalled=false`, `productionReady=false`.
- No `BudgetEstimateLine`, `generateBudgetEstimate`, or `PricingRule` output.
- No Plancraft core touched.
- No budget runtime touched.
- No DB / payment / AI / LINE / n8n touched.
- `.pc` production export remains disabled.

## Remaining Notes

- PDF direct preview and true OCR / visual dimension-line detection remain separate future tasks.
- SVG furniture package runtime include remains blocked until reviewer / commander accepts candidate-only dispositions and a separate package integration task is authorized.

## Next Loop Demand

`Loop 48 - Human UX polish queue triage for remaining non-core usability issues, without changing budget or Plancraft core.`
