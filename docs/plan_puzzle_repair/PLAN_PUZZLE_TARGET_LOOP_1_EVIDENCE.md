# Target Loop 1 Evidence

## Goal

Import drawing, calibrate scale, draw wall, select linked object/opening, and export candidate JSON.

## Validation

- validation URL: http://127.0.0.1:50500/src/stitch_laibe_landing_onboarding/preview_floor_plan/code.html?validation=b-plan-puzzle-target-loop-1
- browser: Headless Chrome via CDP fallback
- viewport: 1440x900
- console error count: 0

## Step Evidence

| Step | Expected | Actual | Status | Evidence |
|---|---|---|---|---|
| 1. Page load | code.html loads with planCanvas | title LaiBE / Plancraft+, ready complete, planCanvas present | PASS | DOM ready and canvas found |
| 2. PNG import | PNG accepted as underlay | importSource.accepted true; underlay dataUrl present | PASS | Synthetic PNG import through planImportInput |
| 3. Scale calibration | known length sets pxPerMm | scale.calibrated true; pxPerMm 0.1 | PASS | known length 3000 mm applied |
| 4. Wall tool active | wall drawing mode can start | start-draw-wall action accepted | PASS | two canvas clicks produced wall |
| 5. First wall point | first click captured | no console error | PASS | click at canvas coordinate |
| 6. Second wall point | second click creates wall | wall DOM present | PASS | wallDom 3 |
| 7. wall written to project.walls | walls exported | exported walls length 1 | PASS | candidate JSON captured |
| 8. wallLayer visible | wall appears in wall layer | wall DOM count above 0 | PASS | #wallLayer line/path elements present |
| 9. Opening add | selected wall can receive opening | add-opening produced opening | PASS_WITH_NOTES | openingDom 4 |
| 10. opening written to data | openings exported | exported openings length 1 | PASS | candidate JSON captured |
| 11. Inspector evidence | selected object properties visible | inspector shows selected opening properties | PASS_WITH_NOTES | inspector text includes opening ID/kind/edge/sourceWall |
| 12. Candidate JSON export | JSON export button works | downloadCount 1; blob captured | PASS | laibe-plancraft-plus-draft.json |
| 13. .pc production export disabled | production .pc export remains blocked | export-pc-spike disabled true | PASS | disabled button remains |
| 14. Console error = 0 | no runtime console errors | consoleErrorCount 0 | PASS | CDP event scan |

## JSON Evidence

Captured candidate JSON contains:
- walls: 1
- openings: 1
- scale.calibrated: true
- scale.pxPerMm: 0.1
- importSource.accepted: true
- underlay.hasDataUrl: true
- furniture key exists, but no furniture created in Target Loop 1
- zones key exists, but no zone created in Target Loop 1

Candidate guard:
- not a formal estimate
- no Budget Engine call
- no formal quote
- .pc production export remains disabled

## Screenshot / DOM Evidence

DOM evidence:
- bodyScrollHeight: 1188
- toolShell height: 760
- canvas rect after patch: x 287, y 662.296875, width 791, height 439
- exportDraft disabled: false
- exportPcSpike disabled: true
- download file name: laibe-plancraft-plus-draft.json

## Result

PASS

