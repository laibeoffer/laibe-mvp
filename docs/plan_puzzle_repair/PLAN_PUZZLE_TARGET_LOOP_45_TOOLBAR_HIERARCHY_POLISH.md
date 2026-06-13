# Plan Puzzle Target Loop 45 - Toolbar Hierarchy Polish

## Summary

- workstream: Plancraft+ Plan Puzzle Repair
- loop: Loop 45 - Human-facing toolbar icon hierarchy and compact inspector polish
- checkedAt: 2026-06-13 20:21:52 +08:00
- validationUrl: `http://127.0.0.1:50362/src/stitch_laibe_landing_onboarding/preview_floor_plan/code.html?validation=loop45-toolbar-post-patch-functional-regression-assertion-fix`
- result: PASS_WITH_NOTES
- consoleErrors: 0
- consoleWarnings: 0

## Evidence Files

- hierarchyAuditJson: `docs/plan_puzzle_repair/PLAN_PUZZLE_TARGET_LOOP_45_TOOLBAR_HIERARCHY_AUDIT_RESULT.json`
- hierarchyScreenshot: `docs/plan_puzzle_repair/PLAN_PUZZLE_TARGET_LOOP_45_TOOLBAR_HIERARCHY_AUDIT.png`
- regressionJson: `docs/plan_puzzle_repair/PLAN_PUZZLE_TARGET_LOOP_45_FUNCTIONAL_REGRESSION_RESULT.json`
- regressionScreenshot: `docs/plan_puzzle_repair/PLAN_PUZZLE_TARGET_LOOP_45_FUNCTIONAL_REGRESSION.png`
- regressionCandidateJson: `docs/plan_puzzle_repair/PLAN_PUZZLE_TARGET_LOOP_45_FUNCTIONAL_REGRESSION_EXPORT.json`

## Proven Defect

| ID | Evidence | Fix | Result |
|---|---|---|---|
| LOOP45-PLACE-LABEL | Read-only audit found the visible tool label `開始放置` and prior helper wording used an engineering-ish "selected item" model. | Renamed visible action to `加入圖面`, changed helper copy to `點畫布建立此項目`, and changed toolbar title to a human action sentence. | PASS |

## Hierarchy Audit

| Check | Expected | Actual | Status |
|---|---|---|---|
| High-frequency tools | Select / delete / wall stay in the front block | Passed audit | PASS |
| Activity furniture grouping | Sofa / bed / dining-table style reference tools stay below fixed/cost candidate items | Passed audit | PASS |
| Place action wording | No `開始放置` / `選取項目` wording in the visible action | `加入圖面` | PASS |
| Console | No browser console error or warning | `0 / 0` | PASS |

## Functional Regression

| Check | Expected | Actual | Status |
|---|---|---|---|
| Blank draft | Draft starts and is calibrated | PASS | PASS |
| Wall | Wall can be drawn | walls `1` | PASS |
| Door / window | Door and window can be added | openings `2` | PASS |
| Furniture | Wardrobe can be added from visible tool | furniture `1` | PASS |
| Dimensions / material | Furniture can be resized and inspector width/depth/material updates | width `1400`, depth `650`, material `system_panel` | PASS |
| Candidate export | JSON includes draft objects | walls `1`, openings `2`, furniture `1`, layoutObjects `1`, toolCatalogItems `10` | PASS |
| Guard | Export remains candidate-only | formalEstimate false, budgetEngineCalled false, productionReady false | PASS |
| `.pc` | Production `.pc` export remains disabled | disabled button present | PASS |

## Guard

- Plancraft core touched: NO
- budget runtime touched: NO
- formalEstimateGuard changed: NO
- Budget Engine called: NO
- payment / DB / AI API / LINE / n8n touched: NO
- package / node_modules added: NO
- git add / stage: NO

## Remaining Notes

- This loop only fixed proven toolbar wording and validated the high-frequency hierarchy. It does not claim final production drawing readiness.
- Inspector still scrolls in dense states but did not block functional operation in this loop.
- SVG furniture package runtime remains blocked until separate reviewer / commander package acceptance.

## Next Demand

Loop 46 should verify import wording, PDF placeholder behavior, and auto-scale / calibration guidance against human expectations. The UI must not imply true PDF parsing or true OCR dimension detection unless browser evidence proves it.
