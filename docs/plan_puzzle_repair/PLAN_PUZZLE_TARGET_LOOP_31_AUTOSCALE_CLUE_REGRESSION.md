# Plan Puzzle Target Loop 31 Auto Scale Clue Regression

## 1. Commander Result

- role: B_PLAN_PUZZLE_REPAIR_COMMANDER / 平面拼圖修正指揮官
- loop: Target Loop 31
- decision: PASS_WITH_NOTES
- checkedAt: 2026-06-13 Asia/Taipei
- validationUrl: http://127.0.0.1:50362/src/stitch_laibe_landing_onboarding/preview_floor_plan/code.html?validation=loop31-autoscale-human-smoke-toolrail
- browserEngine: local Chrome via bundled Playwright
- consoleErrors: 0
- consoleWarnings: 0
- pageErrors: 0

Loop 31 converts the previous "auto scale" wording into a guarded, testable runtime path. It does not claim OCR / computer-vision dimension detection. It detects explicit dimension clues from the imported file name, creates a suggested scale, and lets the user apply it in one click while preserving manual two-point calibration fallback.

## 2. Runtime Patch Scope

| File | Scope |
|---|---|
| src/stitch_laibe_landing_onboarding/preview_floor_plan/plan-puzzle.js | Added image natural-size probe, filename dimension clue parser, guarded auto-scale suggestion object, apply-auto-scale action, overview suggestion card, export metadata. |

No changes were made to Plancraft core, budget runtime, package.json, node_modules, DB, payment, AI API, LINE, n8n, or production export paths.

## 3. Evidence Files

| Evidence | Path |
|---|---|
| Test image | docs/plan_puzzle_repair/test_assets/loop31-width-4000mm.png |
| Browser screenshot | docs/plan_puzzle_repair/PLAN_PUZZLE_TARGET_LOOP_31_AUTOSCALE_REGRESSION.png |
| Candidate JSON export | docs/plan_puzzle_repair/PLAN_PUZZLE_TARGET_LOOP_31_CANDIDATE_EXPORT.json |

## 4. Functional Smoke Matrix

| Check | Expected | Actual | Status |
|---|---|---|---|
| Page load | Page opens with current runtime | Loaded local page on 50362 | PASS |
| Upload image | PNG import accepted | `loop31-width-4000mm.png` imported; image size read as 1425 x 900 px | PASS |
| Detect dimension clue | System detects explicit width clue | Source label: `檔名明確標示 寬度 4,000 mm` | PASS |
| Suggest scale | Suggestion is visible before apply | Status: `有系統建議`; apply button enabled | PASS |
| Apply suggestion | One-click apply calibrates scale | `pxPerMm=0.35625`; `knownLength=4000`; `pixelDistance=1425` | PASS |
| Calibration evidence | Export records method and source | `calibratedBy.method=auto-scale-suggestion`; confidence `high` | PASS |
| Manual fallback | Manual calibration remains available | Scale card still shows known length input and apply calibration buttons | PASS |
| Draw wall after autoscale | Wall drawing still works | Wall count 1 | PASS |
| Add door after autoscale | Opening logic still works | Opening count 1 | PASS |
| Candidate JSON export | Export parses and contains guard | JSON parsed; walls 1; openings 1; formalEstimate false; budgetEngineCalled false; productionReady false | PASS |
| `.pc` production export | Must stay disabled | `.pc` export remained disabled | PASS |
| Console / page errors | No errors | console errors 0; warnings 0; page errors 0 | PASS |

## 5. Export Summary

```json
{
  "scale": {
    "pxPerMm": 0.35625,
    "calibrated": true,
    "autoScaleApplied": true,
    "autoScaleSuggestion": {
      "status": "suggested",
      "source": "file-name-dimension-clue",
      "sourceLabel": "檔名明確標示 寬度 4,000 mm",
      "axis": "width",
      "imageWidthPx": 1425,
      "imageHeightPx": 900,
      "pixelDistance": 1425,
      "knownLengthMm": 4000,
      "pxPerMm": 0.35625,
      "confidence": "high",
      "canApply": true
    }
  },
  "calibratedBy": {
    "method": "auto-scale-suggestion",
    "knownLength": 4000,
    "pixelDistance": 1425,
    "confidence": "high",
    "source": "file-name-dimension-clue"
  },
  "walls": 1,
  "openings": 1,
  "candidateExportBoundary": {
    "formalEstimate": false,
    "budgetEngineCalled": false,
    "productionReady": false
  }
}
```

## 6. Guard Check

| Guard | Result |
|---|---|
| Plancraft core touched | NO |
| `plancraft/` touched | NO |
| budget runtime touched | NO |
| formalEstimateGuard changed | NO |
| Budget Engine called | NO |
| PricingRule / BudgetEstimateLine touched | NO |
| DB / payment / escrow / listing fee touched | NO |
| AI / image API / LINE / n8n touched | NO |
| package.json / node_modules added | NO |
| npm install | NO |
| git add / stage | NO |
| push / merge / PR / deploy | NO |
| reset / clean / delete | NO |

## 7. Remaining Notes

- This is not OCR. It is guarded filename / import metadata dimension clue detection.
- If no explicit mm / cm / m clue exists, the UI shows manual two-point calibration instead of guessing.
- Future OCR / dimension-line recognition should be a separate task and must preserve the same "do not auto-pass low confidence" guard.

## 8. Next Task Demand

NEXT_PLAN_PUZZLE_TASK_DEMAND: Loop 32 - Human-facing text encoding and export label cleanup for remaining mojibake inside candidate metadata, while preserving all verified drawing and guard behavior.
