# Plan Puzzle Target Loop 2 Regression Report

## Target Loop 1 Regression

Target Loop 1 remained green during Target Loop 2 browser flows:
- PNG import: PASS
- scale calibration: PASS
- wall draw: PASS
- candidate JSON export: PASS
- .pc production export disabled: PASS
- consoleErrorCount: 0
- bodyScrollHeight: 1188
- canvas height: 439

## Target Loop 2 Regression

| Function | Status | Evidence |
|---|---|---|
| No-wall add door guard | PASS | openings [] |
| Door placement | PASS | exported kind door |
| Door offset | PASS | exported offset 400 |
| Door width | PASS | exported width 1000 |
| Door swing | PASS | exported swing right |
| Door delete | PASS | openings [] |
| Window placement | PASS | exported kind window |
| Window offset | PASS | exported offset 650 |
| Window width | PASS | exported width 900 |
| Direct opening placement | PASS | exported kind opening |
| Opening delete | PASS | openings [] |
| Console | PASS | consoleErrorCount 0 |
| Guard | PASS | .pc production export disabled true |

## Decision

TARGET_LOOP_2_PASS_NO_PATCH_REQUIRED

Next loop should move to Furniture / Cabinet placement readiness, beginning with read-only Plancraft furniture package audit and item template contract.

