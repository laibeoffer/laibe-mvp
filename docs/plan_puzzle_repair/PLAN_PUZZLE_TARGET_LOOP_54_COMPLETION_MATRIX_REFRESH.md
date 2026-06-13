# Plan Puzzle Target Loop 54 Completion Matrix Refresh

## Result

`LOOP_54_COMPLETION_MATRIX_REFRESH_READY`

## Purpose

Refresh the human-operable completion matrix after Loops 49 through 53, without changing runtime.

This file separates:

- core Plan Puzzle functions with browser evidence,
- candidate-only / mock boundaries,
- remaining placeholders that must not be claimed as complete.

## Core Human-test Usable Functions

| Function | Status | Evidence | Boundary |
|---|---|---|---|
| Page load / visible workbench | PASS | Loop 47, 49, 50, 51, 52, 53 result JSON | Runtime local smoke only |
| Chinese visible UI / tool wording | PASS_WITH_NOTES | `PLAN_PUZZLE_TARGET_LOOP_43_DYNAMIC_TEXT_SWEEP.md`, Loop 45, Loop 48 | PowerShell display mojibake is tooling artifact; browser-visible text is the evidence |
| PNG import | PASS | `PLAN_PUZZLE_TARGET_LOOP_47_FULL_HUMAN_OPERABLE_REGRESSION.md`, Loop 49, Loop 50 | PNG/JPG path only |
| Filename scale suggestion / apply | PASS_WITH_NOTES | Loop 46, 47, 49, 50 | Filename dimension clue only; true OCR not complete |
| Blank mm draft | PASS | Loop 51, Loop 52, Loop 53 | Candidate draft only |
| Draw wall | PASS | Loop 47, 49, 50, 51, 52, 53 | Candidate geometry |
| Select wall | PASS | Loop 20, 24, 49, 52 | Human-facing highlight verified |
| Wall status / type / thickness persistence | PASS | Loop 20, Loop 24, Loop 52 | Candidate draft only |
| Demolished wall guard | PASS_WITH_NOTES | Loop 24, Loop 52 | Draft guard only |
| Door / window / opening placement | PASS | Loop 2, Loop 47, Loop 49, Loop 50, Loop 51 | Candidate openings |
| Opening offset / width / swing persistence | PASS | Loop 2, Loop 52 | Candidate metadata only |
| Opening delete / undo / redo | PASS | Loop 51 | Candidate data only |
| Furniture / cabinet placement | PASS_WITH_NOTES | Loop 4B, Loop 47, Loop 49, Loop 50, Loop 52 | Parametric candidate only, not SVG package |
| Furniture drag | PASS | Loop 47, Loop 49, Loop 50 | Candidate object |
| Furniture resize | PASS_WITH_NOTES | Loop 49, Loop 50 | Inside resize handle added; candidate object |
| Furniture material / note persistence | PASS | Loop 52, Loop 53 | Candidate materialTags only |
| Delete selected furniture | PASS | Loop 44, Loop 51 | Candidate data only |
| Undo / redo command history | PASS_WITH_NOTES | Loop 23, Loop 51 | Runtime command stack, not collaboration history |
| Layer visibility hide/show | PASS | Loop 53 | Visibility only, data persists |
| Candidate JSON export | PASS | Loops 47, 49, 50, 51, 52, 53 | Candidate contract only |
| `.pc` production export disabled | PASS | Loops 47, 49, 50, 51, 52, 53 | Formal Plancraft production remains disabled |
| Data guard | PASS | Loops 47, 49, 50, 51, 52, 53 | No Budget Engine / formal estimate |

## Candidate-only Boundaries

| Boundary | Status | Evidence |
|---|---|---|
| Candidate JSON is not production quantity fact | ENFORCED | Candidate boundary fields across Loops 47, 49, 50, 51, 52, 53 |
| Furniture / cabinet objects are not formal estimate inputs | ENFORCED | `productionReady=false`, `notFormalEstimate=true` in Loop 52 / 53 |
| Layout objects are candidate mirrors | ENFORCED | Loop 52 corrected result, Loop 53 exports |
| `.pc` export remains disabled | ENFORCED | disabled export buttons across Loop 47+ |
| SVG furniture package not included in runtime | ENFORCED | Loop 4A packages and reviewer gate; copied SVG count `0`, runtime include `0` |

## Remaining Placeholders / Not Complete

| Item | Status | Why Not Complete | Owner / Next |
|---|---|---|---|
| True OCR / visual dimension-line scale recognition | OPEN_SEPARATE_OCR_AUTOSCALE | Current auto-scale uses filename dimension clue or manual two-point calibration | Future OCR/autoscale owner |
| Direct PDF preview / calibration | OPEN_SEPARATE_IMPORT_PIPELINE | Current UI instructs PDF should be converted to image first | Import pipeline owner |
| SVG furniture package runtime include | BLOCKED_PENDING_REVIEWER_COMMANDER_ACCEPTANCE | 84 candidates audited; 20 allow-after-QA, 64 quarantined, direct include `0` | Reviewer / commander candidate disposition |
| Formal Plancraft `.pc` production export | DISABLED_BY_GUARD | Production path intentionally disabled | Commander / Plancraft production owner |
| Budget Engine / formal estimate stitching | EXCLUDED_FROM_REPAIR_LOOP | No Budget Engine call allowed in this worktree | Budget integration owner |
| AI / DB / payment / LINE / n8n integration | EXCLUDED_FROM_REPAIR_LOOP | Explicit forbidden scope | Correct future integration owners |

## Latest Evidence Map

| Loop | Evidence |
|---|---|
| 47 | `docs/plan_puzzle_repair/PLAN_PUZZLE_TARGET_LOOP_47_FULL_HUMAN_OPERABLE_REGRESSION.md` |
| 48 | `docs/plan_puzzle_repair/PLAN_PUZZLE_TARGET_LOOP_48_UX_POLISH_TRIAGE.md` |
| 49 | `docs/plan_puzzle_repair/PLAN_PUZZLE_TARGET_LOOP_49_SMALL_VIEWPORT_OPERABILITY.md` |
| 50 | `docs/plan_puzzle_repair/PLAN_PUZZLE_TARGET_LOOP_50_NARROW_VIEWPORT_OPERABILITY.md` |
| 51 | `docs/plan_puzzle_repair/PLAN_PUZZLE_TARGET_LOOP_51_DELETE_UNDO_REDO_REGRESSION.md` |
| 52 | `docs/plan_puzzle_repair/PLAN_PUZZLE_TARGET_LOOP_52_CLASSIFICATION_LAYER_PERSISTENCE.md` |
| 53 | `docs/plan_puzzle_repair/PLAN_PUZZLE_TARGET_LOOP_53_LAYER_VISIBILITY_REGRESSION.md` |

## Commander Position

Core Plan Puzzle functions are human-test usable as candidate drafting tools, with browser evidence and guard evidence.

Not claimed:

- production-ready Plancraft,
- production budget adapter,
- formal estimate,
- SVG furniture package runtime inclusion,
- true OCR/PDF pipeline.

## Next Demand

`Loop 55 - Runtime diff risk audit and reviewer-ready scope map for code.html, plan-puzzle.js, docs/plan_puzzle_repair evidence, and A2 return package.`
