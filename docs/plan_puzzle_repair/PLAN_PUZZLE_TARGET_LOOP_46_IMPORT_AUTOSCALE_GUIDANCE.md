# Plan Puzzle Target Loop 46 - Import / PDF Placeholder / Auto-scale Guidance Honesty

## Result

`LOOP_46_IMPORT_AUTOSCALE_GUIDANCE_PASS_WITH_NOTES`

## Commander Decision

PDF import is still a placeholder path and must not be presented as direct preview / calibration support. Auto-scale is only a filename-dimension clue helper, not OCR and not visual dimension-line recognition.

## Runtime Patch

Allowed files only:

- `src/stitch_laibe_landing_onboarding/preview_floor_plan/code.html`
- `src/stitch_laibe_landing_onboarding/preview_floor_plan/plan-puzzle.js`

Changes:

- Reworded import labels to `匯入 JPG / PNG（PDF先轉圖）`.
- Reworded import tool card to `JPG / PNG；PDF先轉圖`.
- Replaced `待自動偵測` / `自動比例` / `系統比例建議` wording with `待比例確認` / `比例確認` / `檔名比例建議`.
- Reworded helper and inspector guidance so it says filename width / height / mm clues can produce a suggestion, otherwise use two-point calibration.
- Kept PDF runtime behavior as unsupported preview placeholder.

## Browser Evidence

| Check | Result | Evidence |
|---|---|---|
| Page load | PASS | `PLAN_PUZZLE_TARGET_LOOP_46_POSTPATCH_INITIAL.png` |
| Console errors | PASS, `0` | `PLAN_PUZZLE_TARGET_LOOP_46_IMPORT_AUTOSCALE_POSTPATCH_PRECISE_RESULT.json` |
| PDF label honesty | PASS | Top toolbar shows `PDF先轉圖`, direct `匯入 JPG / PNG / PDF` removed |
| PDF upload | PASS | `PLAN_PUZZLE_TARGET_LOOP_46_POSTPATCH_PDF.png`; PDF is placeholder only |
| PNG without filename clue | PASS | `PLAN_PUZZLE_TARGET_LOOP_46_POSTPATCH_NO_CLUE.png`; no apply button, asks for two-point calibration |
| PNG with `width-3000mm` filename clue | PASS | `PLAN_PUZZLE_TARGET_LOOP_46_POSTPATCH_APPLIED.png`; scale applied |
| Candidate JSON export | PASS | `PLAN_PUZZLE_TARGET_LOOP_46_POSTPATCH_PRECISE_EXPORT.json` |
| `.pc` production export disabled | PASS | Browser screenshot and disabled button remain present |
| Forbidden runtime calls | PASS | `PLAN_PUZZLE_TARGET_LOOP_46_FORBIDDEN_SCOPE_GUARD_RESULT.json` |

## Evidence Files

- `docs/plan_puzzle_repair/PLAN_PUZZLE_TARGET_LOOP_46_IMPORT_AUTOSCALE_PREPATCH_RESULT.json`
- `docs/plan_puzzle_repair/PLAN_PUZZLE_TARGET_LOOP_46_IMPORT_AUTOSCALE_PREPATCH.png`
- `docs/plan_puzzle_repair/PLAN_PUZZLE_TARGET_LOOP_46_IMPORT_AUTOSCALE_POSTPATCH_RESULT.json`
- `docs/plan_puzzle_repair/PLAN_PUZZLE_TARGET_LOOP_46_POSTPATCH_INITIAL.png`
- `docs/plan_puzzle_repair/PLAN_PUZZLE_TARGET_LOOP_46_POSTPATCH_PDF.png`
- `docs/plan_puzzle_repair/PLAN_PUZZLE_TARGET_LOOP_46_POSTPATCH_NO_CLUE.png`
- `docs/plan_puzzle_repair/PLAN_PUZZLE_TARGET_LOOP_46_POSTPATCH_APPLIED.png`
- `docs/plan_puzzle_repair/PLAN_PUZZLE_TARGET_LOOP_46_IMPORT_AUTOSCALE_POSTPATCH_PRECISE_RESULT.json`
- `docs/plan_puzzle_repair/PLAN_PUZZLE_TARGET_LOOP_46_POSTPATCH_PRECISE_EXPORT.json`
- `docs/plan_puzzle_repair/PLAN_PUZZLE_TARGET_LOOP_46_FORBIDDEN_SCOPE_GUARD_RESULT.json`
- `docs/plan_puzzle_repair/PLAN_PUZZLE_TARGET_LOOP_46_POSTPATCH_PRECISE.png`

## Data Guard

PASS.

- No Plancraft core touched.
- No budget runtime touched.
- No Budget Engine / `generateBudgetEstimate` call.
- No `BudgetEstimateLine` / `PricingRule` output.
- No DB / payment / AI / LINE / n8n.
- Exported JSON remains candidate-only.
- `notFormalEstimate: true` and `candidateExportBoundary.formalEstimate: false` are guard fields, not formal estimate output.

## Remaining Notes

- True OCR / visual dimension-line detection is not implemented and remains a separate future task.
- PDF direct preview / calibration is not implemented; PDF must remain a placeholder until a separate authorized import pipeline is created.

## Next Loop Demand

`Loop 47 - Full human-operable regression across import / scale / wall / opening / furniture / material / export after guidance patch.`
