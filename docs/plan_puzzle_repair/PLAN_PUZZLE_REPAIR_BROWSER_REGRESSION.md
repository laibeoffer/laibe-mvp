# Plan Puzzle Repair Browser Regression

## Target Loop 1

validationUrl: http://127.0.0.1:50500/src/stitch_laibe_landing_onboarding/preview_floor_plan/code.html?validation=b-plan-puzzle-target-loop-1
browserTool: Headless Chrome via CDP fallback
viewport: 1440x900
consoleErrorCount: 0

## Layout Evidence

Before patch baseline:
- bodyScrollHeight: 5115
- canvas height: 4348
- result: FAIL

After Canvas Builder patch:
- bodyScrollHeight: 1188
- toolShell height: 760
- canvas rect: x 287, y 662.296875, width 791, height 439
- result: PASS

## Interaction Evidence

Steps executed:
1. Load code.html.
2. Inject synthetic PNG into planImportInput.
3. Start calibration.
4. Set known length to 3000 mm.
5. Apply calibration.
6. Start wall tool.
7. Click two canvas points.
8. Select wall/opening flow and add door.
9. Click candidate draft JSON export.

Observed:
- hasUnderlay: true
- wallDom: 3
- openingDom: 4
- inspector shows selected opening properties.
- exportDraft disabled: false
- export .pc disabled: true
- downloadCount: 1
- download file name: laibe-plancraft-plus-draft.json

Exported candidate JSON summary:
- walls: 1
- openings: 1
- scale.calibrated: true
- scale.pxPerMm: 0.1
- importSource.accepted: true
- underlay.hasDataUrl: true

## Boundary

Candidate JSON is mock/candidate output only.
.pc production export remains disabled.
No Budget Engine, no formal estimate, no Plancraft core production path.

