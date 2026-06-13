# Plan Puzzle Human Operable Pass Fail Summary

## Target Loop 1 Result

PASS_WITH_NOTES

| Function | Status | Evidence |
|---|---|---|
| Page load | PASS | title LaiBE / Plancraft+, ready complete |
| Console clean | PASS | consoleErrorCount 0 |
| One-screen workbench containment | PASS | bodyScrollHeight 1188 at 1440x900 |
| PNG import | PASS | importSource.accepted true; underlay dataUrl present |
| Scale calibration | PASS | scale.calibrated true; pxPerMm 0.1 |
| Wall drawing | PASS | exported walls length 1; wall DOM present |
| Wall/linked object selection | PASS_WITH_NOTES | inspector shows selected opening; wall/opening hit flow works |
| Door opening add | PASS_WITH_NOTES | exported openings length 1; opening DOM present |
| Candidate JSON export | PASS | exportDraft enabled; JSON blob captured |
| .pc production export | DISABLED_WITH_REASON | export-pc-spike remains disabled |
| Furniture/cabinet | NOT_IMPLEMENTED | no action buttons in current runtime |
| Material bucket | NOT_IMPLEMENTED | no material action controls in current runtime |

## Commander Decision

Target Loop 1 can advance to Target Loop 2, focused on door/window edit/delete/offset behavior and continued human QA.

## Current Consolidated Status After Loop 13

Result: `PASS_WITH_NOTES_FOR_LOCAL_HUMAN_OPERABLE_CANDIDATE_TOOLING`

| Function | Status | Evidence |
|---|---|---|
| Page load / console clean | PASS | Loop 10-12E CDP runs report exceptions 0 / logErrors 0 |
| PNG import | PASS | Loop 10 actual PNG import through CDP file input |
| Scale calibration | PASS | Loop 10 two-point calibration |
| Wall drawing | PASS | Loop 10 wall creation and wall DOM |
| Door / window / generic opening | PASS | Loop 11 placement, inspector edit, candidate preview, delete |
| Keyboard delete hardening | PASS | Loop 9 / Loop 10 / Loop 11 selected object delete evidence |
| Candidate JSON preview | PASS | Loop 9 stale-preview hardening; Loop 10-12 preview evidence |
| Zone placement / boundary | PASS_WITH_EXPECTED_WARNING | Loop 12A zone edit and open-boundary warning evidence |
| Clean wall endpoints | PASS | Loop 12B |
| Reset project | PASS | Loop 12C |
| Parametric furniture / cabinet | PASS_WITH_NOTES | Loop 4B blank-mm draft validation: place, drag, resize, edit, material, delete |
| Material candidate edit | PASS_WITH_NOTES | Loop 4B / Loop 5 |
| Style visual | PASS_WITH_NOTES | Loop 12D mock-only, proxy disabled, no forbidden network |
| Mobile focus-canvas | PASS | Loop 12E mobile scroll and desktop hidden evidence |
| `.pc` production export | DISABLED_WITH_REASON | Remains disabled / spike-only |
| SVG furniture package runtime | BLOCKED_BY_DESIGN | Overlay QA/reviewer gate required; runtime include count 0 |
| Budget / formal estimate | BLOCKED_BY_GUARD | Candidate-only; no Budget Engine / PricingRule / BudgetEstimateLine |

Current consolidated evidence file: `docs/plan_puzzle_repair/PLAN_PUZZLE_TARGET_LOOP_13_CONSOLIDATED_HUMAN_OPERABLE_REGRESSION.md`.

Current next target: `Target Loop 14 - Reviewer/A2 Completion Packet Refresh`.
