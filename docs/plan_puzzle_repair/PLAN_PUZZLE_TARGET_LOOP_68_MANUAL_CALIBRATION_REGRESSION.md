# Plan Puzzle Target Loop 68 - Manual Two-point Calibration Regression

## Result

LOOP_68_MANUAL_CALIBRATION_REGRESSION_PASS

## Context

- checkedAt: 2026-06-13 23:33:15 +08:00
- role: B_PLAN_PUZZLE_REPAIR_COMMANDER
- worktree: Z:\08-Jacky\laibe_MVP_project\_codex_worktrees\laibe_project\plan-puzzle-test-repair-worktree-20260611
- branch: codex/plan-puzzle-test-repair-worktree-20260611
- validationUrl: http://127.0.0.1:50362/src/stitch_laibe_landing_onboarding/preview_floor_plan/code.html?validation=loop68-manual-calibration-r3-1781364775849
- browser: local Chrome via Playwright, executable C:\Program Files\Google\Chrome\Application\chrome.exe
- fixture: docs/plan_puzzle_repair/loop68-manual-calibration-plan.png
- screenshot: docs/plan_puzzle_repair/loop68-manual-calibration-r3.png
- runtimePatch: NO

## Fixture

Generated local test PNG:

- file: loop68-manual-calibration-plan.png
- size: 900 x 550 px
- filename dimension clue: none
- repository status: ignored by `*.png`; not staged

## Validation Summary

| Check | Result | Evidence |
|---|---|---|
| page load | PASS | `#planCanvas` present |
| console errors | PASS | 0 |
| console warnings | PASS | 0 |
| PNG import | PASS | file input accepted local PNG |
| underlay render | PASS | underlay image count 1 |
| no auto-scale suggestion | PASS | apply-auto-scale-suggestion button count 0 |
| start manual calibration | PASS | `start-calibration` clicked |
| known length initially blank | PASS | `#known-length` value blank |
| first calibration point | PASS | clicked canvas at 180,460 |
| second calibration point | PASS | clicked canvas at 580,460 |
| known length input | PASS | filled 4000mm |
| apply calibration | PASS | `apply-calibration` clicked |
| scale status | PASS | scaleStatusText `已確認` |
| exported scale | PASS | scale.calibrated=true, pxPerMm=0.1 |
| calibratedBy payload | PASS | 4000mm = 400px |
| draw wall after manual calibration | PASS | wall DOM count 1 |
| candidate JSON export | PASS | downloaded `laibe-plancraft-plus-draft.json` |
| candidate boundary | PASS | formalEstimate=false, budgetEngineCalled=false, productionReady=false |

## Manual Calibration Evidence

Before calibration:

- underlayImages: 1
- autoScaleButtons: 0
- helperText: `等待比例確認 / 檔名未找到可自動套用的尺寸線索，請用兩點校正確認比例。`

Calibration inputs:

- point 1: x 180, y 460
- point 2: x 580, y 460
- known length: 4000mm

After applying calibration:

- scaleStatusText: 已確認
- knownLengthValue: 4000
- scale.pxPerMm: 0.1
- scale.calibrated: true
- calibratedBy.pixelDistance: 400
- calibratedBy.knownLength: 4000
- calibratedBy.unit: mm

Inspector text confirmed:

```text
比例狀態
已確認
比例係數
0.1
校正點
2 / 2
目前比例
1 mm = 0.1 px；1000 mm = 100 px
校正資訊
4,000 mm = 400 px
```

## Export Evidence

Downloaded JSON:

- suggestedFilename: laibe-plancraft-plus-draft.json
- importSource.originalFileName: loop68-manual-calibration-plan.png
- importSource.previewSupported: true
- importSource.normalizedAs: underlay-image
- scale.calibrated: true
- scale.pxPerMm: 0.1
- calibratedBy.pixelDistance: 400
- calibratedBy.knownLength: 4000
- walls: 1
- formalEstimate: false
- budgetEngineCalled: false
- productionReady: false

## Test Harness Notes

- The first Loop68 run produced correct product evidence but the final test result was false because the inline script compared a Chinese expected string through the PowerShell pipeline.
- The final run used Unicode-escaped expected text for `已確認` and passed.
- This was a test harness encoding issue, not a Plan Puzzle runtime defect.

## Guard Status

- Plancraft core touched: NO
- budget runtime touched: NO
- Budget Engine called: NO
- PricingRule / BudgetEstimateLine touched: NO
- formalEstimateGuard changed: NO
- DB / payment / AI API / LINE / n8n touched: NO
- package.json / node_modules added: NO
- `.pc` production export enabled: NO
- SVG runtime include: 0

## Decision

Manual two-point calibration is human-operable and can be used when the imported image filename does not contain a usable dimension clue.

No runtime patch was required in Loop 68.

## NEXT_PLAN_PUZZLE_TASK_DEMAND

Loop 69 - Opening dimension edit regression for offset, width, swing, sill height, and exported JSON consistency.
