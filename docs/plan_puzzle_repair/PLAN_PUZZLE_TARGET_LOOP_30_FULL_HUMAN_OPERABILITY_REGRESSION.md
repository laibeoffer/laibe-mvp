# Plan Puzzle Target Loop 30 Full Human Operability Regression

## 1. Commander Result

- role: B_PLAN_PUZZLE_REPAIR_COMMANDER / 平面拼圖修正指揮官
- loop: Target Loop 30
- decision: PASS_WITH_NOTES
- checkedAt: 2026-06-13 Asia/Taipei
- validationUrl: http://127.0.0.1:50362/src/stitch_laibe_landing_onboarding/preview_floor_plan/code.html?validation=loop30-full-human-operability-regression
- browserEngine: local Chrome via bundled Playwright
- consoleErrors: 0
- consoleWarnings: 0
- pageErrors: 0

Loop 30 validates the current human-operable path after the Loop 28 app-like tool rail repair and Loop 29 PPT-like inspector tab repair. It does not claim production budget readiness, Plancraft core readiness, SVG furniture package readiness, or formal estimate readiness.

## 2. Evidence Files

| Evidence | Path |
|---|---|
| Full regression screenshot | docs/plan_puzzle_repair/PLAN_PUZZLE_TARGET_LOOP_30_FULL_REGRESSION.png |
| Candidate JSON export | docs/plan_puzzle_repair/PLAN_PUZZLE_TARGET_LOOP_30_CANDIDATE_EXPORT.json |
| Runtime files checked | src/stitch_laibe_landing_onboarding/preview_floor_plan/code.html; src/stitch_laibe_landing_onboarding/preview_floor_plan/plan-puzzle.js |

## 3. Functional Smoke Matrix

| Check | Result | Evidence |
|---|---|---|
| Page load | PASS | Page opened in local Chrome; `.pc` production export button remained disabled; right inspector tab count was 5. |
| Console / page errors | PASS | Console errors 0; console warnings 0; page errors 0. |
| App-like tool rail | PASS | Visible Material Symbols spans 0; CSS pictorial tool icon count 48; delete actions 2. |
| PNG import | PASS | Test asset `docs/plan_puzzle_repair/test_assets/phase0-audit-final-1440x900-20260611.png` imported as underlay. |
| Scale calibration | PASS_WITH_NOTES | Calibration completed with `calibrated=true`, `pxPerMm=0.11`; Loop 30 patch sends inspector to overview tab so calibration controls are visible. True dimension-line OCR / auto-detect remains a separate P1 task. |
| Draw wall | PASS_WITH_NOTES | One wall candidate created and exported. Loop 30 script used a stale wall selector for one selected-wall DOM read; source reality confirms current selected wall class is `.wall-line.is-selected`. |
| Select feedback | PASS | Runtime CSS and render path use `.wall-line.is-selected`, `.opening-symbol.is-selected`, `.furniture-item.is-selected`; selected object paths now foreground the properties tab. |
| Add door | PASS | Door candidate created on selected wall, offset / width / swing edited, and exported. |
| Add window | PASS | Window candidate created on selected wall, offset / width edited, and exported. |
| Opening tool | PASS | Generic opening candidate created, delete / undo / redo path exercised, and exported. |
| Delete / undo / redo | PASS | Opening count changed 3 -> 2, undo restored 3, redo returned 2, final undo restored 3. |
| Furniture placement | PASS | Wardrobe candidate placed on canvas. |
| Furniture drag | PASS | Wardrobe bounding box moved after drag. |
| Furniture resize | PASS | Wardrobe bounding box grew after resize handle interaction. |
| Width / depth edit | PASS | Wardrobe exported with `widthMm=2100`, `depthMm=650`, `heightMm=2400`. |
| Material apply | PASS | Wardrobe exported with `materialTags=["stone"]`. |
| Note edit | PASS | Wardrobe exported with note `Loop30 human operability regression`. |
| Candidate JSON export | PASS_WITH_NOTES | Preview and download path produced candidate export with walls 1, openings 3, furniture 1, layoutObjects 1, toolCatalogItems 10. JSON contains large embedded underlay data URL and some legacy mojibake labels, but guard fields are intact. |
| Candidate JSON parse | PASS | Bundled Node `JSON.parse` confirmed the saved evidence file is valid JSON and contains walls 1, openings 3, furniture 1, layoutObjects 1, toolCatalogItems 10. |
| `.pc` production export disabled | PASS | `.pc` production export stayed disabled / mock-only; no production export path was enabled. |

## 4. Candidate JSON Summary

| Field | Observed |
|---|---|
| walls | 1 |
| openings | 3 (`door`, `window`, `opening`) |
| furniture | 1 (`wardrobe`) |
| layoutObjects | 1 |
| toolCatalogItems | 10 |
| furniture budgetCandidate | true |
| furniture productionReady | false |
| furniture notFormalEstimate | true |
| candidateExportBoundary.formalEstimate | false |
| candidateExportBoundary.budgetEngineCalled | false |
| candidateExportBoundary.productionReady | false |

## 5. Defects Found During Loop 30 and Minimal Patch

| Defect | Severity | Patch | Status |
|---|---|---|---|
| Calibration controls were hidden after the inspector tab rewrite because default tab stayed on properties. | P0 | `startCalibration()` now sets `uiState.inspectorTab = "overview"`. | RESOLVED_LOOP_30 |
| Opening and furniture property fields were hidden after object creation / selection when the right inspector was on another tab. | P0 | Wall / opening / zone / furniture selection and creation paths now set `uiState.inspectorTab = "properties"`. | RESOLVED_LOOP_30 |
| Loop 30 selected-wall DOM read used stale selector `.wall-segment.is-selected`. | P2 test harness note | Source reality confirms `.wall-line.is-selected` is current selector in CSS and renderer. | NOT_PRODUCT_DEFECT |

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

- Actual image dimension-line auto recognition / OCR-assisted scale detection is still not implemented. Current Loop 30 result only proves the calibration workflow remains usable and system-first in UI copy with manual fallback.
- SVG furniture package runtime remains blocked until overlay QA / reviewer / commander acceptance and a separate package integration task. Parametric furniture / cabinet candidates remain usable as draft-only runtime objects.
- Candidate JSON remains a draft candidate export and must not be treated as production quantity facts or formal estimate input.

## 8. Next Task Demand

NEXT_PLAN_PUZZLE_TASK_DEMAND: Loop 31 - Auto scale clue detection design and minimal human-safe implementation plan, while preserving manual calibration fallback and all candidate-only budget guards.
