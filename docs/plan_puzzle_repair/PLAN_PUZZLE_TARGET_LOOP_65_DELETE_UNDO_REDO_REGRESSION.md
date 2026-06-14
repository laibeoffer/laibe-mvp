# Plan Puzzle Target Loop65 Delete / Undo / Redo Regression

## Worktree

- path: Z:\08-Jacky\laibe_MVP_project\_codex_worktrees\laibe_project\plan-puzzle-test-repair-worktree-20260611
- branch: codex/plan-puzzle-test-repair-worktree-20260611
- previous evidence commit: e72f867ca2830e6b4e2df13b63e73cd7866c22a0
- new commit: not created in this packet
- validation URLs:
  - http://127.0.0.1:50362/src/stitch_laibe_landing_onboarding/preview_floor_plan/code.html?validation=loop65-delete-undo-redo-post-patch-r5
  - http://127.0.0.1:50362/src/stitch_laibe_landing_onboarding/preview_floor_plan/code.html?validation=loop65-window-focused-post-patch-r7

## Browser Environment

- browser: Chrome CDP headless
- evidence files:
  - docs/plan_puzzle_repair/loop65-delete-undo-redo-post-patch-r5.json
  - docs/plan_puzzle_repair/loop65-delete-undo-redo-post-patch-r5.png
  - docs/plan_puzzle_repair/loop65-window-focused-post-patch-r7.json
  - docs/plan_puzzle_repair/loop65-window-focused-post-patch-r7.png
- console error count: 0
- console event count: 0
- log entry count: 0

## Scenario Setup

| Object | Created | Evidence |
|---|---|---|
| wall | PASS | R5 drawWall PASS; wall create undo/redo PASS |
| door | PASS | R5 addDoor PASS; keyboard Delete / undo / redo PASS |
| window | PASS | R7 addWindow PASS; preview openings=1, delete returns openings=0 |
| opening | PASS | R5 openingTool PASS |
| wardrobe | PASS | R5 placeFurniture PASS |
| material applied | PASS | R5 material apply undo/redo PASS |

## Delete Matrix

| Target | Method | Expected | Actual | Status | Evidence |
|---|---|---|---|---|---|
| door / opening | keyboard Delete | selected opening removed | DOM openings 0 | PASS | loop65-delete-undo-redo-post-patch-r5.json |
| window | toolbar delete | selected window removed | DOM symbols 0 / preview openings 0 | PASS | loop65-window-focused-post-patch-r7.json |
| furniture | toolbar delete | selected furniture removed | DOM furniture 0 | PASS | loop65-delete-undo-redo-post-patch-r5.json |

## Undo / Redo Matrix

| Test | Action | Expected | Actual | Status | Evidence |
|---|---|---|---|---|---|
| wall create | undo | wall count 0 | wall count 0 | PASS | R5 |
| wall create | redo | wall count 1 | wall count 1 | PASS | R5 |
| door delete | undo | opening count 1 | opening count 1 | PASS | R5 |
| door delete | redo | opening count 0 | opening count 0 | PASS | R5 |
| furniture resize handle | resize | width changes from 1800 | width 2600 | PASS | R5 |
| furniture resize handle | undo | width returns to 1800 | width 1800 | PASS | R5 |
| furniture resize handle | redo | width returns to 2600 | width 2600 | PASS | R5 |
| material apply | undo | material returns to wood | wood | PASS | R5 |
| material apply | redo | material returns to system_panel | system_panel | PASS | R5 |
| furniture delete | undo | furniture count 1 | furniture count 1 | PASS | R5 |
| furniture delete | redo | furniture count 0 | furniture count 0 | PASS | R5 |

## Candidate JSON Sync Matrix

| Action | Preview Updated | Download JSON Matches | Status | Evidence |
|---|---|---|---|---|
| final preview / download after delete-undo-redo scenario | previewOk=true, walls=1, openings=1, furniture=0 | download bytes 10384 | PASS | loop65-delete-undo-redo-post-patch-r5.json |
| live preview before export after wall create | previewOk=true, walls=1, openings=0, furniture=0 | not downloaded by design | PASS | loop65-delete-undo-redo-post-patch-r5.json |
| live preview before export after window add | previewOk=true, walls=1, openings=1 | not downloaded by design | PASS | loop65-window-focused-post-patch-r7.json |
| live preview after window delete | previewOk=true, walls=1, openings=0 | not downloaded by design | PASS | loop65-window-focused-post-patch-r7.json |

## Inspector Sync Matrix

| Action | Inspector Expected | Actual | Status | Evidence |
|---|---|---|---|---|
| selected wall | wall inspector visible | selected-wall-thickness field visible | PASS | R5 |
| selected door / opening | opening inspector visible | selected-opening-width field visible | PASS | R5 |
| selected furniture | furniture inspector visible | width / depth / material fields visible | PASS | R5 |

## Runtime Patch

- changed files:
  - src/stitch_laibe_landing_onboarding/preview_floor_plan/plan-puzzle.js
- reason:
  - Candidate JSON preview was not available before the first explicit export, so Loop65 preview sync could not be proven after ordinary edit actions.
- patch summary:
  - Added live candidate JSON preview generation through the existing `buildDraftPayload()` and `createDraftExportPreview()` path.
  - `renderCandidateExportPreviewCard()` now renders a live candidate preview when there is no saved export snapshot or when the saved snapshot no longer matches the current draft signature.
- node --check: PASS
- git diff --check: PASS, CRLF warning only

## Guard Check

- Budget Engine called: NO
- formalEstimateGuard changed: NO
- payment / DB / AI API touched: NO
- LINE / n8n touched: NO
- Plancraft touched: NO
- package / node_modules added: NO
- `.pc` production export disabled: PASS
- candidate guard: formalEstimate=false, budgetEngineCalled=false, productionReady=false

## Result

PASS_WITH_PATCH

## P0 Bugs

NONE_OBSERVED_AFTER_PATCH

## P1 Bugs

NONE_OBSERVED_AFTER_PATCH

## P2 Notes

- R5 originally marked addWindow FAIL because the test counted `.opening-symbol` SVG lines as if one window should equal one symbol. A window renders as two visible SVG lines plus one hit target, so R7 corrected the evidence by checking preview `openings=1`, hit target count, and delete result.
- The patch does not alter export payload format; it only makes the existing candidate preview visible and live before download.

## Next Loop Recommendation

Loop66 - Layer visibility and object selection foreground regression across wall, opening, furniture, candidate JSON readout, and inspector state.
