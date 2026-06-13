# Plan Puzzle Target Loop 22 Full Human Operability Regression

## Scope

Loop 22 verifies the main human drawing path after the Chinese/intuitive UI repair:

- PNG underlay import
- scale calibration
- wall drawing and selected-wall visual feedback
- door / window / opening placement
- selected opening delete
- parametric furniture placement, drag, resize, inspector edit, material apply, delete
- candidate JSON export
- `.pc` production export disabled boundary
- forbidden scope guard

Runtime patch scope:

- `src/stitch_laibe_landing_onboarding/preview_floor_plan/code.html`
- `src/stitch_laibe_landing_onboarding/preview_floor_plan/plan-puzzle.js`

No global blackboard write.

## Defect Proven

Before the Loop 22 patch, clicking `空白毫米草稿` or another canvas-focus action could scroll the workbench so the sticky progress/file area covered the top of the tool rail. Browser hit-test showed the center of the `畫牆` button was intercepted by `.progress-inner`, so a human click could hit the progress bar instead of the tool.

Root cause:

- `focusCanvasForHumanAction()` scrolled only `.canvas-shell` to `block: "start"`.
- The sticky header / progress / file area remained above it and overlapped the first rows of the left tool rail.

Minimal patch:

- Add `scroll-margin-top: 252px` to `.tool-shell`.
- Scroll the whole `.tool-shell` instead of only `.canvas-shell`.

Post-patch hit-test:

| Check | Expected | Actual | Status |
|---|---|---|---|
| Wall button hit target | Center of `畫牆` hits its own button | `hitAction: start-draw-wall` | PASS |
| Sticky overlay interception | Progress area does not receive click | `progressAtPoint: false` | PASS |
| Tool rail position | Button remains visible below sticky bars | `y: 349` | PASS |

## Browser Evidence

Validation URL:

`http://127.0.0.1:50362/src/stitch_laibe_landing_onboarding/preview_floor_plan/code.html?validation=loop22-chrome-file-import-regression`

Screenshot:

`docs/plan_puzzle_repair/PLAN_PUZZLE_TARGET_LOOP_22_BROWSER_REGRESSION.png`

Browser:

- Local Chrome via Playwright, because the in-app Browser wrapper does not expose `setInputFiles`.
- In-app Browser was still used for hit-test diagnosis before the full Chrome smoke.

Console:

- errors: 0
- warnings: 0
- page errors: 0

## Functional Smoke Matrix

| Step | Expected | Actual | Status | Evidence |
|---|---|---|---|---|
| Page load | Page opens | `pageLoaded: true` | PASS | Browser DOM |
| Broken icon glyphs | No `?` material icons | `iconQuestionCount: 0` | PASS | Browser DOM |
| Visible engineering English | No visible `Budget Engine`, `Renderer`, `Server-side Image API proxy`, `PCM` | `visibleEnglishLeak: []` | PASS | Browser text scan |
| `.pc` production export | Remains disabled | `pcExportDisabled: true` | PASS | Browser DOM |
| PNG import | User-provided PNG is accepted | `underlayStatus: 已匯入`; file name visible; import card says PNG / 可預覽 | PASS | `planImportInput.setInputFiles(...)` |
| Scale calibration | Two points + known length apply | `scaleText: 已校正`; `4,000 mm = 440 px`; `pxPerMm: 0.11` | PASS | Browser click + inspector |
| Tool hit-test | Wall tool click is not covered by sticky header | `hitAction: start-draw-wall`, `progressAtPoint: false` | PASS | Browser hit-test |
| Draw wall | Two canvas clicks create a wall | `wallCount: 1` | PASS | SVG DOM |
| Selected wall feedback | Selected wall visibly changes color | `selectedStroke: rgb(0, 183, 255)` | PASS | Computed style |
| Wall endpoints | Wall endpoints are square, not rounded | `lineCaps: ["butt"]` | PASS | Computed style |
| Wall inspector | User can classify wall and see thickness meanings | Inspector shows `既有牆`, `拆除牆`, `承重牆 / 分戶牆`, `100mm`, `240mm` descriptions | PASS | Inspector text |
| Add door | Door candidate appears | `doorCount: 1` | PASS | SVG DOM |
| Add window | Window candidate appears | `windowCount: 2` symbol lines | PASS | SVG DOM |
| Add opening | Opening candidate appears | `openingCount: 1` | PASS | SVG DOM |
| Select opening | Opening inspector appears | `selectedOpeningSymbols: 1` | PASS | Coordinate click on transparent hit target |
| Delete opening | Delete removes only selected opening | hit targets `3 -> 2`; symbols `4 -> 3` | PASS | Browser keyboard |
| Furniture placement | Wardrobe can be placed from left tool rail | `furnitureCount: 1`; text `衣櫃 / wardrobe / 1,800 x 600 mm` | PASS | Browser click |
| Furniture drag | Furniture can move | rect x/y changed `708,649 -> 778,689` | PASS | Browser pointer events |
| Furniture resize | Furniture can resize | rect size changed `198 x 66 -> 288 x 116` | PASS | Browser pointer events |
| Inspector width/depth | Right panel edits dimensions | displayed `2,100 x 650 mm` | PASS | Inspector inputs |
| Material apply | Material preference updates candidate | export `materialTags: ["stone"]` | PASS | Candidate JSON |
| Note field | Note is retained | export note `Loop22 人類操作回歸備註` | PASS | Candidate JSON |
| Candidate JSON export | Preview includes wall/openings/furniture/layout object | walls `1`, openings `3`, furniture `1`, layoutObjects `1` | PASS | `[data-testid="candidate-export-json-preview"]` |
| Candidate-only guard | Export remains non-production | `formalEstimate: false`, `budgetEngineCalled: false`, `productionReady: false` | PASS | Candidate JSON |
| Delete furniture | Delete removes selected furniture | furniture `1 -> 0` | PASS | Browser keyboard |
| Undo / redo | Visible undo/redo controls | no visible undo/redo controls | NOT_IMPLEMENTED_WITH_REASON | `undoButtonCount: 0` |

## Candidate JSON Evidence

Export preview included:

- `walls[0].wallType: "solid_partition"`
- `openings`: door, window, opening
- `furniture[0].type: "wardrobe"`
- `furniture[0].widthMm: 2100`
- `furniture[0].depthMm: 650`
- `furniture[0].materialTags: ["stone"]`
- `furniture[0].budgetCandidate: true`
- `furniture[0].productionReady: false`
- `furniture[0].notFormalEstimate: true`
- `layoutObjects[0].objectType: "parametric_furniture_candidate"`
- `candidateExportBoundary.formalEstimate: false`
- `candidateExportBoundary.budgetEngineCalled: false`
- `candidateExportBoundary.productionReady: false`

## Guard Check

| Guard | Result |
|---|---|
| Plancraft core touched | NO |
| Budget runtime touched | NO |
| Budget Engine called | NO |
| PricingRule / BudgetEstimateLine touched | NO |
| formalEstimateGuard changed | NO |
| DB / payment / AI API / LINE / n8n touched | NO |
| package.json / node_modules added | NO |
| git stage / push / merge / PR | NO |

## Result

`LOOP_22_FULL_HUMAN_OPERABILITY_REGRESSION_PASS_WITH_NOTES`

Notes:

- Core drawing path is human-test usable for import, calibration, wall, door/window/opening, furniture/cabinet, material, delete, and candidate JSON export.
- SVG furniture package runtime remains blocked until overlay QA and commander/reviewer acceptance.
- Undo / redo controls are not implemented in the current page and remain a future loop item.

## Next Automatic Task

Loop 23: Undo / redo scope decision and minimal command-history plan, or continue SVG Furniture Candidate Overlay QA without runtime include.
