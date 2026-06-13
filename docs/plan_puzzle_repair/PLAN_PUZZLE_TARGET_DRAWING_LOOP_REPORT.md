# Plan Puzzle Target Drawing Loop Report

## Role
- actingAs: B_PLAN_PUZZLE_REPAIR_COMMANDER
- loop: Target Loop 1

## Worktree
- path: Z:\08-Jacky\laibe_MVP_project\_codex_worktrees\laibe_project\plan-puzzle-test-repair-worktree-20260611
- branch: codex/plan-puzzle-test-repair-worktree-20260611
- HEAD: 34e9a7c84d32941d5b66e6bd61c7b085c80e3ec5

## Target
Import drawing, calibrate scale, draw wall, select wall, attach door/window, and export candidate JSON evidence.

## Baseline Evidence
- validation URL: http://127.0.0.1:50448/src/stitch_laibe_landing_onboarding/preview_floor_plan/code.html?validation=b-plan-puzzle-scroll-calibrated
- console error: 0
- PNG import: PASS
- scale calibration after scrolling canvas into view: PASS
- wall draw after calibration: PASS
- wall selection: PASS
- door opening on selected wall: PASS
- 1440x900 human-operable layout: FAIL, body scrollHeight 5115 and canvas height 4348 in baseline layout smoke
- draft JSON export from toolbar: FAIL, data-action="export-draft" is disabled

## Result
TARGET_LOOP_1_PASS_WITH_NOTES

## Post-Patch Regression Evidence

- validation URL: http://127.0.0.1:50500/src/stitch_laibe_landing_onboarding/preview_floor_plan/code.html?validation=b-plan-puzzle-target-loop-1
- viewport: 1440x900
- console error count: 0
- bodyScrollHeight: 1188
- canvas height: 439
- exportDraft disabled: false
- exportPcSpike disabled: true
- importSource.accepted: true
- scale.calibrated: true
- exported walls: 1
- exported openings: 1
- candidate JSON download: laibe-plancraft-plus-draft.json
- forbidden scope: no Budget Engine, no formal estimate, no Plancraft core production.

## Bugs Found

| Bug | Severity | Evidence | Owner Agent | Required Fix |
|---|---|---|---|---|
| Workbench layout expands into a multi-thousand-pixel canvas at 1440x900 | P0 | bodyScrollHeight 5115; canvas height 4348 | Canvas / Import Core Builder | Limit workbench/panels/canvas shell height and make panel content scroll internally |
| Candidate draft JSON export is disabled | P0 | toolbar data-action="export-draft" disabled while plan-puzzle.js has exportDraft handler | Canvas / Import Core Builder | Enable candidate draft JSON export with clear mock/no Budget Engine boundary |
| Furniture / cabinet placement actions are absent | P1 | no furniture/cabinet action buttons found; project.furniture remains empty | Furniture / Cabinet Builder | Add after canvas loop is stable |
| Material actions are absent | P1 | no material action buttons or material project fields found | Inspector / Material Builder | Add after object selection/editing works |

## Next Loop Decision
Target Loop 1 P0 defects are patched and browser regression passes. Advance to Target Loop 2 for door/window focused edit/delete/offset behavior, while keeping furniture/material as P1 backlog.

## Next Owner
Door / Window / Opening Builder

## Done Definition
- no-wall hint is visible and blocks opening placement.
- existing wall can accept door/window/opening.
- opening can be selected, edited for offset/width/swing when controls exist, and deleted.
- exported JSON contains updated openings.
- browser smoke remains console clean.
- no Plancraft core, budget runtime, package, DB, payment, AI API, or formal estimate path touched.

## If No Response in 20 Minutes
Run Door / Window focused audit and furniture package read-only audit; do not start unrelated feature expansion.

## Loop 4 Split Decision

- Loop 4A: SVG Furniture Candidate Overlay QA
- furnitureSvgPackageRuntime: BLOCKED_UNTIL_OVERLAY_QA
- Loop 4B: Parametric Furniture / Cabinet Placement MVP
- parametricFurnitureCabinetMvp: ALLOWED_TO_START
- decision reason: SVG candidate package quality remains blocked by per-candidate overlay QA, but basic human-operable furniture / cabinet placement can proceed as parametric candidate layout objects without using SVG furniture package assets.
- runtime boundary: candidate-only; budgetCandidate true; productionReady false; notFormalEstimate true; no Budget Engine; no formal estimate.

## Loop 4B Parametric Furniture / Cabinet MVP Evidence

Validation URL: http://127.0.0.1:50361/code.html?validation=loop4b-parametric-furniture

| Step | Expected | Actual | Status | Evidence |
|---|---|---|---|---|
| Page load | code.html loads without browser console errors | Page loaded in in-app Browser at validation URL | PASS | Browser title `LaiBE | 平面拼圖 Plancraft+`; console error count 0 |
| Template visibility | At least 5 furniture / cabinet templates visible | 10 templates visible: wardrobe, tall_cabinet, low_wall_cabinet, tv_cabinet, kitchen_cabinet, bed, sofa, dining_table, toilet, washbasin | PASS | DOM count for `[data-action="select-furniture-template"]` = 10 |
| Active tool click | Click wardrobe changes tool flow or returns explicit precondition | Wardrobe button clickable; no console error after click | PARTIAL | In-app Browser clicked wardrobe template; console error count remained 0 |
| Placement precondition | If no calibrated underlay exists, placement should not silently fail | Current validation page has no underlay / scale state; placement is blocked by import + calibration precondition | PARTIAL | DOM check: canvasHasUnderlay false; furniture DOM count 0 |
| Place item | Clicking canvas creates item object | Not completed in this browser session because file input upload is not exposed by current in-app Browser API | TOOL_LIMITED | Browser tool lacks documented `setInputFiles`; runtime still requires imported image and calibrated scale |
| Drag item | Existing furniture can be dragged | Not completed; depends on successful placement | TOOL_LIMITED | Blocked by file upload / calibrated project setup limitation |
| Resize item | Resize handle changes widthMm / depthMm | Not completed; depends on successful placement | TOOL_LIMITED | Blocked by file upload / calibrated project setup limitation |
| Inspector edit | Right panel can edit widthMm / depthMm / note / material | Static runtime fields exist in source; browser interaction not completed | PARTIAL | Source scan confirms `selected-furniture-width`, `selected-furniture-depth`, `selected-furniture-note`, material application handler |
| Delete item | Delete removes selected furniture only | Not completed; depends on successful placement | TOOL_LIMITED | Delete handler exists; browser interaction not completed |
| Export JSON | JSON contains furniture / toolCatalogItems / layoutObjects candidate | Source export path includes furniture candidate fields; browser download verification not completed in this session | PARTIAL | Source scan confirms `payload.furniture`, `payload.toolCatalogItems`, `payload.layoutObjects`, candidate boundary |
| Forbidden calls | No Budget Engine / formal estimate / payment / DB / AI API | No actual forbidden runtime calls found in scan | PASS | Search hits are boundary text only; no `fetch(`, `XMLHttpRequest`, `generateBudgetEstimate`, or API keys found |

## Loop 4B Current Result

LOOP_4B_PARAMETRIC_MVP_PASS_WITH_NOTES

The runtime implementation has started and visible controls exist. Initial validation was blocked by file-input limitations in the in-app Browser, so a visible candidate-only blank millimeter draft path was added to create a calibrated project state without using SVG furniture package assets or Budget Engine paths.

## Loop 4B Blank-mm Draft Validation Evidence

Validation URL: http://127.0.0.1:50361/code.html?validation=loop4b-blank-mm-draft

| Step | Expected | Actual | Status | Evidence |
|---|---|---|---|---|
| Blank mm draft | Visible button creates calibrated project state | Button exists and creates underlay + calibrated scale | PASS | underlayCount 1; scale status calibrated; pxPerMm 0.1 |
| Furniture template list | At least 5 templates visible | 10 templates visible | PASS | wardrobe, tall_cabinet, low_wall_cabinet, tv_cabinet, kitchen_cabinet, bed, sofa, dining_table, toilet, washbasin |
| Place wardrobe | Click template and canvas creates object | Wardrobe created | PASS | DOM `.furniture-item` count 1; text `Wardrobe wardrobe / 1,800 x 600 mm` |
| Candidate guard display | Inspector shows candidate-only flags | Inspector shows budgetCandidate true, productionReady false, notFormalEstimate true | PASS | Selected furniture candidate card |
| Drag wardrobe | Object moves on canvas | Rect moved from x 512 / y 485.9375 to x 582 / y 525.9375 | PASS | CUA drag evidence |
| Resize wardrobe | Resize handle changes dimensions | Wardrobe changed to 2,350 x 950 mm | PASS | DOM text after resize |
| Edit width / depth / note | Inspector inputs update object | width 2200, depth 700, note `Loop 4B QA note` | PASS | Input values and DOM text `Wardrobe wardrobe / 2,200 x 700 mm` |
| Apply material | Material action updates selected item state | Applied stone message visible | PASS | Message `Applied stone to Wardrobe. Candidate only.` |
| Delete furniture | Delete selected furniture only | DOM `.furniture-item` count becomes 0 | PASS | Message `Furniture candidate deleted.` |
| Create second item | Bed / sofa / dining item can be created | Bed created | PASS | DOM text `Bed bed / 1,500 x 2,000 mm` |
| Export JSON event | Export button remains enabled and source payload contains furniture candidates | In-app Browser does not support download capture; source export path confirms payload fields | PARTIAL_TOOL_LIMITED | `payload.furniture`, `payload.toolCatalogItems`, `payload.layoutObjects`, `candidateExportBoundary` confirmed in source |
| Console errors | Console remains clean | 0 browser console errors | PASS | Browser dev logs error count 0 |

Remaining note: JSON download content could not be read because Codex in-app Browser reports downloads unsupported. This is a tooling limitation. Source export path confirms furniture candidate fields and guard fields are included.

## Loop 10 PNG Import CDP Regression Evidence

Validation URL: http://127.0.0.1:50362/src/stitch_laibe_landing_onboarding/preview_floor_plan/code.html?validation=loop10-png-import-cdp-scroll

Evidence file: docs/plan_puzzle_repair/PLAN_PUZZLE_TARGET_LOOP_10_PNG_IMPORT_CDP_REGRESSION.md

| Step | Expected | Actual | Status | Evidence |
|---|---|---|---|---|
| Page load | Plan Puzzle page loads and `.pc` production export remains disabled | Page loaded; `.pc` spike button disabled | PASS | `pcDisabled: true` |
| PNG import | File input accepts PNG and creates an underlay | Temporary PNG assigned to `#planImportInput`; `project.underlay = true`; `previewSupported = true` | PASS | CDP `DOM.setFileInputFiles` path |
| Scale calibration | Two visible canvas clicks and known length calibrate scale | `project.scale.calibrated = true`; calibration points = 2 | PASS | stable viewport + `scrollIntoView` before pointer events |
| Draw wall | Draw-wall action plus two canvas clicks creates one wall | `project.walls.length = 1` | PASS | browser mouse events on SVG canvas |
| Add window | Selected wall accepts a window opening | `project.openings` contains `kind: window` | PASS | opening width 1200 mm, offset 1000 mm |
| Candidate JSON preview | Export action shows current candidate JSON preview | Preview visible, current, contains `candidateExportBoundary` and `openings` | PASS | browser-verifiable JSON preview |
| Delete selected opening | Delete removes selected opening only | `project.openings.length` becomes 0 while wall remains 1 | PASS | keyboard Delete via CDP |
| Console | No blocking browser errors | `Runtime.exceptionThrown = 0`; CDP Log warnings/errors = 0 | PASS | CDP event capture |

Loop 10 result: LOOP_10_PNG_IMPORT_CDP_REGRESSION_PASS. No runtime patch was required.

## Loop 11 Opening Inspector Edit Regression Evidence

Validation URL after patch: http://127.0.0.1:50362/src/stitch_laibe_landing_onboarding/preview_floor_plan/code.html?validation=loop11-opening-edit-after-patch

Evidence file: docs/plan_puzzle_repair/PLAN_PUZZLE_TARGET_LOOP_11_OPENING_INSPECTOR_EDIT_REGRESSION.md

| Step | Expected | Actual | Status | Evidence |
|---|---|---|---|---|
| Defect proof | Selected opening number fields should update project data while typed | Pre-patch offset / width / height values did not update through input events | FAIL_BEFORE_PATCH | Door offset stayed `1151`; window offset/width/sill stayed initial values; generic opening height stayed `null` |
| Minimal patch | Wire selected opening numeric input fields to existing updater | `handleDocumentInput` now calls `updateSelectedOpeningFromField` for offset / width / sill height / height | PATCHED | Runtime patch limited to `plan-puzzle.js` |
| Door edit | Door inspector edits offset / width / swing / height | `offset 500`, `width 900`, `swing right`, `height 2100` | PASS | Browser CDP data evidence |
| Door export/delete | Candidate JSON preview includes opening, Delete removes selected door | Preview current; `project.openings.length = 0` after Delete | PASS | Browser CDP data evidence |
| Window edit | Window inspector edits offset / width / sill / height | `offset 700`, `width 1100`, `sillHeight 950`, `height 1200` | PASS | Browser CDP data evidence |
| Window export/delete | Candidate JSON preview includes opening, Delete removes selected window | Preview current; `project.openings.length = 0` after Delete | PASS | Browser CDP data evidence |
| Generic opening edit | Opening inspector edits offset / width / height | `offset 800`, `width 1000`, `height 2100` | PASS | Browser CDP data evidence |
| Generic opening export/delete | Candidate JSON preview includes opening, Delete removes selected opening | Preview current; `project.openings.length = 0` after Delete | PASS | Browser CDP data evidence |
| Console / guard | No blocking errors and `.pc` production export remains disabled | Console 0; `.pc` disabled true | PASS | CDP Runtime / Log events and DOM state |

Loop 11 result: LOOP_11_OPENING_INSPECTOR_EDIT_PATCH_VERIFIED.

## Loop 12A Zone Boundary Regression Evidence

Validation URL after patch: http://127.0.0.1:50362/src/stitch_laibe_landing_onboarding/preview_floor_plan/code.html?validation=loop12a-zone-boundary-after-patch

Evidence file: docs/plan_puzzle_repair/PLAN_PUZZLE_TARGET_LOOP_12A_ZONE_BOUNDARY_REGRESSION.md

| Step | Expected | Actual | Status | Evidence |
|---|---|---|---|---|
| Zone placement mode | `start-place-zone` gives active placement state | `uiState.mode = place-zone` | PASS | Browser CDP data evidence |
| Zone creation | Canvas click creates zone candidate | `project.zones.length = 1`; `.zone-label` visible | PASS | Browser CDP data evidence |
| Zone selection | Zone label is selectable and opens inspector | selected zone inspector visible | PASS | Browser CDP data evidence |
| Zone edit | Inspector changes name/type/position | `Loop 12A Living Zone`, `living`, `{ x: 1200, y: 1400 }` | PASS | Browser CDP data evidence |
| Boundary edit mode | `start-zone-boundary` enters boundary state | `uiState.mode = edit-zone-boundary`; apply enabled | PASS | Browser CDP data evidence |
| Boundary edge selection | Clicking wall hit target selects edge | draft `selectedBoundaryEdgeIds.length = 1` | PASS | Browser CDP data evidence |
| Boundary apply | Applied boundary persists candidate warning | `boundaryStatus = open`, `boundaryIssues = zone-boundary-too-few-edges` | PASS_WITH_EXPECTED_WARNING | Single-edge boundary should not become closed |
| Candidate JSON preview | Preview includes zones and boundary status | preview current; includes `"zones"`, `boundaryStatus`, zone name | PASS | Browser-verifiable preview after patch |
| Console / guard | No blocking errors and `.pc` production export remains disabled | Console 0; `.pc` disabled true | PASS | CDP Runtime / Log events and DOM state |

Loop 12A result: LOOP_12A_ZONE_BOUNDARY_PATCH_VERIFIED.

## Loop 12B Clean Wall Endpoints Regression Evidence

Validation URL: http://127.0.0.1:50362/src/stitch_laibe_landing_onboarding/preview_floor_plan/code.html?validation=loop12b-clean-wall-endpoints

Evidence file: docs/plan_puzzle_repair/PLAN_PUZZLE_TARGET_LOOP_12B_CLEAN_WALL_ENDPOINTS_REGRESSION.md

| Step | Expected | Actual | Status | Evidence |
|---|---|---|---|---|
| Scenario setup | Two wall endpoints are within the 30 mm cleanup threshold | Wall A ends at `{ x: 2000, y: 1000 }`; Wall B starts at `{ x: 2020, y: 1000 }` | PASS | Wall inspector coordinate edits |
| Clean endpoints | Action merges nearby endpoints to one shared point | Adjacent endpoints both became `{ x: 2010, y: 1000 }` | PASS | Browser CDP data evidence |
| Graph rebuild | Node graph reflects connected wall segments | node count = 3, edge count = 2 | PASS | Browser CDP data evidence |
| Visible feedback | Human user gets completion message | UI message: `已整理 2 個牆端點，並重新建立 wallGraph。` | PASS | Browser CDP data evidence |
| Candidate JSON preview | Export preview remains current and includes walls | Preview current; JSON preview contains `walls` | PASS | Browser-verifiable preview |
| Console / guard | No blocking errors and `.pc` production export remains disabled | Console 0; `.pc` disabled true | PASS | CDP Runtime / Log events and DOM state |

Loop 12B result: LOOP_12B_CLEAN_WALL_ENDPOINTS_PASS_NO_PATCH.

## Loop 12C Reset Project Regression Evidence

Validation URL: http://127.0.0.1:50362/src/stitch_laibe_landing_onboarding/preview_floor_plan/code.html?validation=loop12c-reset-project

Evidence file: docs/plan_puzzle_repair/PLAN_PUZZLE_TARGET_LOOP_12C_RESET_PROJECT_REGRESSION.md

| Step | Expected | Actual | Status | Evidence |
|---|---|---|---|---|
| Populated precondition | Project has visible candidate data before reset | wall 1, opening 1, zone 1, furniture 1, preview visible | PASS | Browser CDP data evidence |
| Reset clears import / scale | Import source, underlay, and calibrated scale are cleared | import false, underlay false, scale false | PASS | Browser CDP data evidence |
| Reset clears drawing data | Walls / openings / zones / furniture are all cleared | all counts became 0 | PASS | Browser CDP data evidence |
| Reset clears graph / DOM | Node graph, wall hits, zone labels, furniture DOM clear | node 0, edge 0, wall hits 0, labels 0, furniture DOM 0 | PASS | Browser CDP data evidence |
| Reset clears selection / preview | Selected object ids and candidate preview are cleared | all selected ids null; preview false | PASS | Browser CDP data evidence |
| Console / guard | No blocking errors and `.pc` production export remains disabled | Console 0; `.pc` disabled true | PASS | CDP Runtime / Log events and DOM state |

Loop 12C result: LOOP_12C_RESET_PROJECT_PASS_NO_PATCH.

## Loop 12D Style Visual Mock Boundary Regression Evidence

Validation URL: http://127.0.0.1:50362/src/stitch_laibe_landing_onboarding/preview_floor_plan/code.html?validation=loop12d-style-visual-visible-rerun

Evidence file: docs/plan_puzzle_repair/PLAN_PUZZLE_TARGET_LOOP_12D_STYLE_VISUAL_MOCK_BOUNDARY_REGRESSION.md

| Step | Expected | Actual | Status | Evidence |
|---|---|---|---|---|
| Page load | Plan Puzzle page loads | Page loaded in local Chrome CDP | PASS | validation URL loaded |
| Diagnostics panel | Style visual diagnostics panel opens | `panelExists: true`, `panelOpen: true` | PASS | `[data-testid="style-visual-diagnostics-panel"]` |
| Human-visible button | Generate action is visible and clickable | button rect `{ x: 1241, y: 521, w: 106, h: 38 }`; `buttonHumanVisible: true` | PASS | `[data-action="generate-style-visual"]` |
| Click action | Button click creates ready local task state | `taskStatus: "ready"` | PASS | `window.styleVisualTask.status` |
| Proxy boundary | Server-side image API proxy remains disabled | `proxyStatus: "disabled"`, `apiResponseStatus: "disabled"` | PASS | generated preview message says proxy not configured |
| Metadata guard | Generated preview is not production | sandbox true; official design / construction drawing / quotation / production asset flags false | PASS | `window.styleVisualTask.generatedPreview.metadata` |
| Reference image guard | Reference image upload remains disabled | `referenceImageAllowed: false` | PASS | `window.styleVisualTask.referenceImagePolicy.allowed` |
| Request whitelist | No prompt / geometry / project forbidden keys | `requestForbiddenKeys: []` | PASS | checked raw/system/developer prompts, walls, openings, zones, scale, plancraftBridge, projectId |
| Network guard | No image / AI / budget / payment / DB / n8n request | `forbiddenNetwork: []`, `addedResources: 0` after click | PASS | CDP Network events |
| Console | No blocking browser errors or warnings | exceptions 0, logErrors 0 | PASS | CDP Runtime / Log events |

Loop 12D result: LOOP_12D_STYLE_VISUAL_MOCK_BOUNDARY_PASS_NO_PATCH.

## Loop 12E Focus Canvas / Mobile Jump Regression Evidence

Mobile validation URL: http://127.0.0.1:50362/src/stitch_laibe_landing_onboarding/preview_floor_plan/code.html?validation=loop12e-focus-canvas-mobile-rerun

Desktop validation URL: http://127.0.0.1:50362/src/stitch_laibe_landing_onboarding/preview_floor_plan/code.html?validation=loop12e-focus-canvas-desktop-rerun

Evidence file: docs/plan_puzzle_repair/PLAN_PUZZLE_TARGET_LOOP_12E_FOCUS_CANVAS_MOBILE_REGRESSION.md

| Step | Expected | Actual | Status | Evidence |
|---|---|---|---|---|
| Mobile page load | Page loads in mobile viewport | 390 x 800 mobile emulation loaded | PASS | CDP validation URL |
| Mobile shortcut visible | focus-canvas button is visible on mobile | shortcut display flex; button rect `344 x 40` | PASS | `.mobile-canvas-shortcuts`, `[data-action="focus-canvas"]` |
| Mobile click scrolls | Button moves viewport toward canvas | scrollY `0 -> 453` | PASS | CDP scroll evidence |
| Mobile canvas visible | Canvas intersects viewport after click | `canvasIntersectsViewport: true` | PASS | `#planCanvas` rect |
| Desktop shortcut hidden | Mobile shortcut does not crowd desktop UI | shortcut display none; button rect 0 | PASS | 1440 x 900 desktop evidence |
| Desktop canvas visible | Desktop canvas remains visible without jump | shellVisible true; canvasVisible true | PASS | `.canvas-shell`, `#planCanvas` rect |
| Console / guard | No blocking errors and no forbidden network request | exceptions 0, logErrors 0, forbiddenNetwork [] | PASS | CDP Runtime / Log / Network events |

Loop 12E result: LOOP_12E_FOCUS_CANVAS_MOBILE_JUMP_PASS_NO_PATCH.

## Loop 15 Path Layout Mode Regression Evidence

Validation URL: http://127.0.0.1:50362/src/stitch_laibe_landing_onboarding/preview_floor_plan/code.html?validation=path-layout-mode-desktop-actual-selectors

Evidence file: docs/plan_puzzle_repair/PLAN_PUZZLE_TARGET_LOOP_15_PATH_LAYOUT_MODE_REGRESSION.md

| Step | Expected | Actual | Status | Evidence |
|---|---|---|---|---|
| File area | File controls are the top row | `.file-area` above `.tool-shell` | PASS | Browser layout rects |
| Workbench order | Row is tools, canvas, status | tools x `17`, canvas x `276`, status x `1091` | PASS | `columnsLeftToRight = true` |
| Background | Existing visual background remains unchanged | radial and linear gradients preserved | PASS | Browser computed style |
| Import controls | File import actions live in top file area | top actions visible; old left import group hidden | PASS | DOM/CSS evidence |
| Canvas toolbar | Canvas top toolbar no longer duplicates file path | `.canvas-toolbar display = none` | PASS | DOM/CSS evidence |
| Sample PDF | Provided sample PDF is readable but direct PDF preview remains bounded | sample.pdf exists; PDF preview remains non-production/future import path | PASS_WITH_BOUNDARY | file stat and UI boundary |
| Console / guard | No browser warnings/errors and `.pc` remains disabled | console warnings/errors `0`; `.pc` file action disabled | PASS | In-app browser evidence |

Loop 15 result: LOOP_15_PATH_LAYOUT_MODE_PASS_WITH_PDF_BOUNDARY.

## Loop 16 Path Layout Functional Smoke and Patch Evidence

Validation URL before patch: http://127.0.0.1:50362/src/stitch_laibe_landing_onboarding/preview_floor_plan/code.html?validation=loop16-path-layout-canvas-click-retry

Validation URL after patch: http://127.0.0.1:50362/src/stitch_laibe_landing_onboarding/preview_floor_plan/code.html?validation=loop16-path-layout-post-patch-functional-smoke

Evidence file: docs/plan_puzzle_repair/PLAN_PUZZLE_TARGET_LOOP_16_PATH_LAYOUT_FUNCTIONAL_SMOKE_AND_PATCH.md

| Step | Expected | Actual | Status | Evidence |
|---|---|---|---|---|
| Defect proof | `#planCanvas` remains clickable in path mode | Before patch, `#planCanvas` height was `0`; Browser reported canvas not visible | FAIL_BEFORE_PATCH | In-app browser evidence |
| Minimal patch | Remove hidden toolbar row from canvas-shell grid | `.canvas-shell` rows changed to `minmax(0, 1fr) auto` | PATCHED | CSS-only runtime patch |
| Canvas height | Canvas has stable human-clickable height | `#planCanvas` rect `{ x: 276, y: 563, w: 815, h: 590 }` | PASS | Browser rect evidence |
| Draw wall | Wall tool still works in path mode | wall DOM `1`, exported walls `1` | PASS | Browser operation + JSON preview |
| Door/window/opening | Opening tools still write candidate data | exported openings `3` | PASS | Browser operation + JSON preview |
| Furniture | Parametric wardrobe can be placed | furniture DOM `1`, exported furniture `1`, layoutObjects `1` | PASS | Browser operation + JSON preview |
| Candidate JSON | Export preview remains current and bounded | preview includes walls/openings/furniture/layoutObjects | PASS | `[data-testid="candidate-export-json-preview"]` |
| Guard | No production estimate / Budget Engine / `.pc` enablement | `budgetEngineCalled=false`, `formalEstimate=false`, `productionReady=false`, `.pc` disabled | PASS | JSON preview and DOM guard |
| Console | No blocking errors/warnings | log count `0` | PASS | Browser logs |

Loop 16 result: LOOP_16_PATH_LAYOUT_FUNCTIONAL_SMOKE_PATCH_VERIFIED.

## Loop 18 Professional Path Layout Polish Evidence

Validation URL: http://127.0.0.1:50362/src/stitch_laibe_landing_onboarding/preview_floor_plan/code.html?validation=loop18-professional-layout-final-full-smoke

Evidence file: docs/plan_puzzle_repair/PLAN_PUZZLE_TARGET_LOOP_18_PROFESSIONAL_PATH_LAYOUT_POLISH.md

| Step | Expected | Actual | Status | Evidence |
|---|---|---|---|---|
| File area | Compact top file area remains first and reachable | `1393 x 94`, sticky top `140px`, z-index `70` | PASS | CDP layout evidence |
| Workbench zones | Desktop order is tools / canvas / status | tool x `17`, canvas x `247`, inspector x `1106` | PASS | CDP layout evidence |
| Tool rail | Tool area behaves like compact icon rail | 3 columns, visible tool card `61 x 58`, icon `19px`, labels `10px`, descriptions hidden | PASS | CDP computed style |
| Canvas dominance | Canvas is the main region | `#planCanvas` `858 x 680` | PASS | CDP layout evidence |
| Draw wall | Path-mode tool rail creates wall | wall DOM `1`, JSON walls `1` | PASS | CDP input + JSON preview |
| Door/window/opening | Opening tools create candidates | JSON openings `3` | PASS | CDP input + JSON preview |
| Furniture | Wardrobe candidate can be placed | furniture DOM `1`, JSON furniture `1`, layoutObjects `1` | PASS | CDP input + JSON preview |
| Candidate JSON | Sticky file export remains clickable after working | `topAction=export-draft`, preview exists | PASS | CDP hit-test and preview |
| Guard | Candidate-only boundary remains active | `budgetEngineCalled=false`, `formalEstimate=false`, `productionReady=false`, `.pc` disabled | PASS | JSON preview and DOM |
| Console/log | No blocking browser errors | bad event count `0` | PASS | CDP Runtime/Log/Network events |

Loop 18 result: LOOP_18_PROFESSIONAL_PATH_LAYOUT_POLISH_PASS.

## Loop 19 Narrow Inspector / Material / Delete Regression Evidence

Desktop validation URL: http://127.0.0.1:50362/src/stitch_laibe_landing_onboarding/preview_floor_plan/code.html?validation=loop19-desktop-inspector-material-delete-rerun

Narrow validation URL: http://127.0.0.1:50362/src/stitch_laibe_landing_onboarding/preview_floor_plan/code.html?validation=loop19-narrow-path-layout-rerun

Evidence file: docs/plan_puzzle_repair/PLAN_PUZZLE_TARGET_LOOP_19_NARROW_INSPECTOR_MATERIAL_DELETE_REGRESSION.md

| Step | Expected | Actual | Status | Evidence |
|---|---|---|---|---|
| Defect proof | Selected furniture widthMm / depthMm can be typed reliably | Before patch, multi-digit dimensions were interrupted by inspector re-render during input | FAIL_BEFORE_PATCH | Browser/CDP smoke |
| Minimal patch | Furniture inspector fields commit without mid-typing re-render | `selected-furniture-*` no longer commits on every input event; change / blur still commits | PATCHED | `plan-puzzle.js` scoped patch |
| Select furniture | Selected wardrobe opens furniture inspector | inspectorHasFurniture `true`; selectedName `Wardrobe` | PASS | Browser/CDP DOM and project data |
| Width / depth edit | Inspector updates furniture dimensions | widthMm `2100`, depthMm `650` | PASS | Candidate JSON preview |
| Material / note edit | Material and note update selected candidate | materialTags `["stone"]`, note `Loop 19 material note` | PASS | Candidate JSON preview |
| Delete | Delete removes selected furniture and layout object | furniture DOM `0`; furniture `0`; layoutObjects `0` | PASS | DOM and Candidate JSON preview |
| Narrow viewport | Path layout has no horizontal overflow | viewport `390 x 800`; bodyScrollWidth `390`; horizontalOverflow `false` | PASS | CDP layout evidence |
| Focus canvas | Mobile shortcut brings canvas into viewport | canvasIntersectsViewport `true` after focus | PASS | CDP layout evidence |
| Guard | Candidate-only and `.pc` disabled boundaries remain active | budgetEngineCalled `false`; formalEstimate `false`; productionReady `false`; pcDisabled `true` | PASS | JSON preview and DOM |
| Console/log | No blocking browser errors | bad event count `0` | PASS | CDP Runtime/Log/Network events |

Loop 19 result: LOOP_19_NARROW_INSPECTOR_MATERIAL_DELETE_PATCH_VERIFIED.

## Loop 20 Chinese Intuitive Wall Selection Repair Evidence

Validation URL: http://127.0.0.1:50362/src/stitch_laibe_landing_onboarding/preview_floor_plan/code.html?validation=loop20-chinese-intuitive-wall-selection

Evidence file: docs/plan_puzzle_repair/PLAN_PUZZLE_TARGET_LOOP_20_CHINESE_INTUITIVE_WALL_SELECTION_REPAIR.md

| Step | Expected | Actual | Status | Evidence |
|---|---|---|---|---|
| Page load | Local Plan Puzzle page loads | `pageLoaded: true` | PASS | In-app Browser |
| Console/log | No blocking browser errors or warnings | `logsFinal20b: []` | PASS | Browser dev logs |
| Tool settings | Detailed settings do not stay expanded by default | `toolPanelDefaultDisplay: "none"` | PASS | CSS computed style |
| Tool settings focus | Detailed settings open as overlay when focusing wall tool | `display: "grid"`, `position: "absolute"`, rect `300 x 273` | PASS | Browser DOM/CSS |
| Wall copy | Unclear endpoint wording removed | `oldEndpointVisible: false`; visible copy uses `自動接齊牆端` | PASS | Browser DOM |
| Wall type labels | Wall classification options are Chinese and human-readable | `輕隔間 / 雙斜線剖線`, `木隔間 / 斜線剖線` | PASS | Browser DOM |
| Wall thickness labels | Thickness dropdown explains typical usage | includes `100mm　木隔間、輕隔間` and `240mm　分間牆、承重牆` | PASS | Browser DOM |
| Draw wall | Wall tool creates wall in blank mm draft | `wallLineCount: 1` | PASS | Browser click smoke |
| Selected visual feedback | Selected wall changes color | `selectedStroke: "rgb(0, 183, 255)"` | PASS | Browser computed style |
| Wall endpoint shape | Wall endpoint is not rounded | `selectedLinecap: "butt"` | PASS | Browser computed style |
| Wall classification class | Wall DOM carries type class | `wall-line wall-existing wall-type-light_partition is-selected` | PASS | Browser DOM |
| Candidate JSON | Export includes wall type and thickness | `wallTypeExport: "light_partition"`, `wallThicknessExport: 240` | PASS | Candidate JSON preview |
| Guard | Candidate JSON remains non-production | `budgetEngineCalled=false`, `formalEstimate=false`, `productionReady=false` | PASS | Candidate JSON preview |

Loop 20 result: LOOP_20_CHINESE_INTUITIVE_WALL_SELECTION_REPAIR_PASS_WITH_NOTES.

## Loop 21 Full Chinese Visible UI Sweep Evidence

Validation URL: http://127.0.0.1:50362/src/stitch_laibe_landing_onboarding/preview_floor_plan/code.html?validation=loop21-final-iab-smoke

Evidence file: docs/plan_puzzle_repair/PLAN_PUZZLE_TARGET_LOOP_21_FULL_CHINESE_VISIBLE_UI_SWEEP.md

| Step | Expected | Actual | Status | Evidence |
|---|---|---|---|---|
| Page load | Local Plan Puzzle page loads | `pageLoaded: true` | PASS | In-app Browser |
| Console/log | No blocking browser errors or warnings | `logs21f: []` | PASS | Browser dev logs |
| Icon text | No visible `?` icon glyphs remain | `iconQuestionCount: 0`; icon set `圖新尺重存停往選牆接門窗口區界衣櫃視廚床沙桌廁洗放刪工材` | PASS | Browser DOM |
| Engineering English | Visible `Budget Engine`, `Renderer`, `Server-side Image API proxy`, `PCM`, and old icon ligatures removed | `englishLeakLines: []` | PASS | Browser DOM |
| Budget wording | Preview route no longer implies formal generation | nav and progress use `預算預覽` | PASS | Browser DOM |
| Draw wall | Wall tool still creates a wall after copy/icon patch | helper `已建立 3,520 mm 牆段。`; wall count `1` | PASS | Browser click smoke |
| Selected visual feedback | Selected wall changes color | `selectedStroke: "rgb(0, 183, 255)"` | PASS | Browser computed style |
| Wall endpoint shape | Wall endpoint remains square, not round | `selectedLinecap: "butt"` | PASS | Browser computed style |
| Wall inspector | Right inspector remains readable in Chinese | includes wall status, wall type detail, and thickness descriptions | PASS | Browser DOM |
| Candidate JSON | Export preview includes the created wall | preview wall count `1` | PASS | Candidate JSON preview |
| Guard | Candidate JSON remains non-production | `呼叫預算引擎: 否`, `可作正式成果: 否` | PASS | Candidate JSON preview |

Loop 21 result: LOOP_21_FULL_CHINESE_VISIBLE_UI_SWEEP_PASS_WITH_NOTES.

## Loop 22 Full Human Operability Regression Evidence

Validation URL: http://127.0.0.1:50362/src/stitch_laibe_landing_onboarding/preview_floor_plan/code.html?validation=loop22-chrome-file-import-regression

Evidence file: docs/plan_puzzle_repair/PLAN_PUZZLE_TARGET_LOOP_22_FULL_HUMAN_OPERABILITY_REGRESSION.md

Screenshot: docs/plan_puzzle_repair/PLAN_PUZZLE_TARGET_LOOP_22_BROWSER_REGRESSION.png

| Step | Expected | Actual | Status | Evidence |
|---|---|---|---|---|
| Defect proof | Sticky header does not cover tool rail after focus actions | Before patch, `畫牆` center could hit `.progress-inner`; after patch `hitAction=start-draw-wall`, `progressAtPoint=false` | PASS_AFTER_PATCH | Browser hit-test |
| PNG import | PNG file can be imported | user-provided PNG file visible; status `已匯入`; preview status `可預覽` | PASS | Local Chrome file input smoke |
| Scale calibration | Two calibration points plus known length apply | `已校正`; `4,000 mm = 440 px`; `pxPerMm=0.11` | PASS | Browser click + inspector |
| Draw wall | Wall tool creates selected wall | wall count `1`, selected count `1`, selected stroke `rgb(0, 183, 255)` | PASS | SVG DOM + computed style |
| Wall endpoint style | Wall endpoints are square | line cap `butt` | PASS | Computed style |
| Door / window / opening | Opening tools add candidates on selected wall | door `1`, window symbols `2`, opening `1` | PASS | SVG DOM |
| Delete opening | Selected opening can be deleted | opening hit targets `3 -> 2`; symbols `4 -> 3` | PASS | Coordinate click + Delete |
| Furniture placement | Left tool rail places wardrobe candidate | furniture `1`; selected furniture `1`; label shows `衣櫃` | PASS | Browser click |
| Furniture drag / resize | Furniture can move and resize | drag rect `708,649 -> 778,689`; resize `198x66 -> 288x116` | PASS | Pointer events |
| Inspector edit | Width/depth/material/note update | `2,100 x 650 mm`; material `stone`; note retained | PASS | Inspector + JSON preview |
| Candidate JSON | Export includes wall/opening/furniture/layoutObject | walls `1`, openings `3`, furniture `1`, layoutObjects `1` | PASS | Candidate JSON preview |
| Guard | Candidate output remains non-production | `budgetEngineCalled=false`, `formalEstimate=false`, `productionReady=false`, `.pc` disabled | PASS | JSON preview and DOM |
| Console/log | No browser errors or warnings | console errors `0`, warnings `0`, page errors `0` | PASS | Browser logs |
| Undo / redo | Visible undo/redo controls | `undoButtonCount=0` | NOT_IMPLEMENTED_WITH_REASON | Browser DOM |

Loop 22 result: LOOP_22_FULL_HUMAN_OPERABILITY_REGRESSION_PASS_WITH_NOTES.

## Loop 23 Undo / Redo Command History Regression Evidence

Validation URL: http://127.0.0.1:50362/src/stitch_laibe_landing_onboarding/preview_floor_plan/code.html?validation=loop23-undo-redo-regression

Evidence file: docs/plan_puzzle_repair/PLAN_PUZZLE_TARGET_LOOP_23_UNDO_REDO_COMMAND_HISTORY_REGRESSION.md

Screenshot: docs/plan_puzzle_repair/PLAN_PUZZLE_TARGET_LOOP_23_UNDO_REDO_REGRESSION.png

Exported candidate JSON: docs/plan_puzzle_repair/PLAN_PUZZLE_TARGET_LOOP_23_CANDIDATE_EXPORT.json

| Step | Expected | Actual | Status | Evidence |
|---|---|---|---|---|
| Undo / redo controls | Top file area exposes visible command buttons | `復原` / `重做` buttons present, disabled until history exists | PASS | Browser DOM + state |
| Blank draft history | First draft action creates undo history | `undoDisabled=false`, `redoDisabled=true` | PASS | Chrome state read |
| Wall undo | Wall creation can be undone | wall count `1 -> 0`, redo enabled | PASS | Chrome click smoke |
| Wall redo | Wall creation can be redone | wall count `0 -> 1`, selected wall restored | PASS | Chrome click smoke |
| Opening keyboard undo | Ctrl+Z reverses latest window addition | openings `2 -> 1`, window removed | PASS | Chrome keyboard smoke |
| Opening keyboard redo | Ctrl+Y restores window addition | openings `1 -> 2`, window restored | PASS | Chrome keyboard smoke |
| Door/window/opening baseline | All opening kinds still create candidates | kinds `door`, `window`, `opening` | PASS | Runtime state |
| Furniture delete undo | Deleted wardrobe candidate can be restored | furniture `1 -> 0 -> 1` | PASS | Runtime state |
| Candidate JSON | Export includes furniture/tool catalog/layout objects | furniture `1`, toolCatalogItems `10`, layoutObjects `1` | PASS | Parsed download JSON |
| Guard | Candidate-only boundary remains active | `formalEstimate=false`, `budgetEngineCalled=false`, `productionReady=false`, `.pc` disabled | PASS | Parsed JSON and DOM |
| Console/log | No browser errors or warnings | console errors `0`, warnings `0`, page errors `0` | PASS | Browser logs |

Loop 23 result: LOOP_23_UNDO_REDO_COMMAND_HISTORY_PASS_WITH_NOTES.

## Loop 24 Selected Object Action Model Evidence

Validation URL: http://127.0.0.1:50362/src/stitch_laibe_landing_onboarding/preview_floor_plan/code.html?validation=loop24-selected-object-action-model-audit-post-patch

Evidence file: docs/plan_puzzle_repair/PLAN_PUZZLE_TARGET_LOOP_24_SELECTED_OBJECT_ACTION_MODEL_AUDIT.md

Screenshot: docs/plan_puzzle_repair/PLAN_PUZZLE_TARGET_LOOP_24_SELECTED_OBJECT_ACTION_MODEL_AUDIT.png

Exported candidate JSON: docs/plan_puzzle_repair/PLAN_PUZZLE_TARGET_LOOP_24_CANDIDATE_EXPORT.json

| Step | Expected | Actual | Status | Evidence |
|---|---|---|---|---|
| Selected wall feedback | Selected wall visibly changes color | stroke `rgb(0, 183, 255)` | PASS | SVG computed style |
| Wall property edit | Inspector can update status/type/thickness | demolished -> existing, light partition, 100mm | PASS | Runtime state |
| Wall class sync | Canvas class follows selected wall state/type | `wall-demolished wall-type-light_partition is-selected` | PASS | SVG DOM |
| Demolished wall guard | Door/window creation is blocked on demolished wall | error says demolished walls should not receive openings | PASS | Runtime state |
| Add openings | Existing wall can receive door/window | openings include door and window | PASS | Runtime state |
| Opening-to-wall action | Opening card can switch back to attached wall | `selectedOpeningId=null`, wall inspector visible | PASS | Inspector DOM |
| Layer visibility | Wall layer can be toggled without deleting data | `layerVisibility.walls=false`, wall data still exists | PASS | Runtime state |
| Delete selected wall | Delete removes wall and dependent openings | walls `1 -> 0`, openings `2 -> 0` | PASS | Keyboard smoke |
| Undo delete wall | Ctrl+Z restores wall and dependent openings | walls `0 -> 1`, openings `0 -> 2` | PASS | Keyboard smoke |
| Candidate JSON | Export keeps wall classification | wallType `light_partition`, thickness `100`, status `existing` | PASS | Parsed JSON |
| Guard | Candidate-only boundary remains active | `formalEstimate=false`, `budgetEngineCalled=false`, `productionReady=false` | PASS | Parsed JSON |
| Console/log | No browser errors or warnings | console errors `0`, warnings `0`, page errors `0` | PASS | Browser logs |

Loop 24 result: LOOP_24_SELECTED_OBJECT_ACTION_MODEL_PASS_WITH_NOTES.

## Loop 26 Intuitive Selection / Wall / Path Workbench Polish Evidence

Validation URL: http://127.0.0.1:50362/src/stitch_laibe_landing_onboarding/preview_floor_plan/code.html?validation=loop26-final-display-name-polish

Evidence file: docs/plan_puzzle_repair/PLAN_PUZZLE_TARGET_LOOP_26_INTUITIVE_SELECTION_WALL_POLISH.md

Screenshot: docs/plan_puzzle_repair/PLAN_PUZZLE_TARGET_LOOP_26_FINAL_DISPLAY_NAME_POLISH.png

Additional screenshot: docs/plan_puzzle_repair/PLAN_PUZZLE_TARGET_LOOP_26_PATH_WORKBENCH_FINAL.png

| Step | Expected | Actual | Status | Evidence |
|---|---|---|---|---|
| Path workbench top | File area is the top-most visible band | site header / progress / candidate banner hidden; file area y `10` | PASS | Browser DOM |
| One-screen board | Tool / canvas / status fit one viewport | shell bottom `893.34` in 900px viewport | PASS | Browser geometry |
| Tool setting behavior | Detail panel opens only on hover/focus | before hover `none`, after hover `grid` | PASS | Browser computed style |
| Selected object feedback | Selected wall changes visibly | blue wall stroke plus yellow outline | PASS | Browser computed style and screenshot |
| Wall end style | Wall ends are not rounded | `stroke-linecap=butt`; outline `stroke-linecap=butt` | PASS | Browser computed style |
| Wall thickness help | Dropdown and inspector explain use | 100/150/240mm human-readable labels and help text visible | PASS | Browser DOM |
| Node wording | User-facing wording avoids unclear node jargon | `接齊牆端`, `接點`, `進階檢查` | PASS | Runtime copy |
| Raw ID leak | Selected wall card hides raw wall/edge IDs | `牆體 1` / `已連結`; raw ID leak false | PASS | Browser text scan |
| Delete / undo | Core selected-wall actions still work | wall count `1 -> 0 -> 1` | PASS | Browser click smoke |
| Console/log | No browser errors or warnings | console errors `0`, warnings `0`, page errors `0` | PASS | Browser logs |

Loop 26 result: LOOP_26_INTUITIVE_SELECTION_WALL_POLISH_PASS_WITH_NOTES.

## Loop 28 PPT-like Direct Manipulation UX Repair Evidence

Validation URL: http://127.0.0.1:50362/src/stitch_laibe_landing_onboarding/preview_floor_plan/code.html?validation=loop27-postpatch-visible-path-tools-smoke

Evidence file: docs/plan_puzzle_repair/PLAN_PUZZLE_PPT_LIKE_USABILITY_AUDIT.md

Screenshot: docs/plan_puzzle_repair/PLAN_PUZZLE_TARGET_LOOP_28_PPT_DIRECT_MANIPULATION_UX.png

| Step | Expected | Actual | Status | Evidence |
|---|---|---|---|---|
| App-like icons | Tool buttons use small pictorial icons, not large Chinese-character tiles | `material-symbols-outlined` visible span count `0`; CSS `.tool-icon` count `48` | PASS | Browser DOM + screenshot |
| Activity furniture grouping | Bed / sofa / dining table / TV cabinet are not all primary tool cards | Primary left rail shows single `家具` activity entry; exact item remains in top item selector | PASS_WITH_NOTES | Browser DOM |
| Fixed item grouping | Floor-plan-relevant fixed items appear before activity furniture | `固定項目` group contains 衣櫃 / 高櫃 / 矮櫃 / 廚具 / 馬桶 / 洗手台 | PASS | Browser DOM |
| Delete affordance | Delete is a standalone important tool | `刪除` appears in common wall group and top toolbar with `data-action=delete-current-selection` | PASS | Browser DOM |
| Placement wording | User should understand how to place selected item | `放置選取項目` removed; visible wording is `開始放置` and `放到圖上` | PASS | Text scan |
| Wall endpoint wording | User should not need to understand node jargon | visible action changed to `自動接牆` | PASS | Text scan |
| Scale status | Scale should be system-first, not manual-only jargon | visible status changed to `待自動偵測`; action label `自動比例` | PARTIAL | Browser DOM; actual detector not implemented |
| Header / canvas-first | General site header should not steal drawing space | `headerVisible=false`, file area is top workbench band | PASS | Browser DOM |
| Console/log | No browser errors or warnings | console errors `0`, warnings `0` | PASS | Browser logs |
| Guard | No forbidden runtime/API/budget calls added | forbidden scope scan found none | PASS | Static scan |

Loop 28 result: LOOP_28_PPT_LIKE_DIRECT_MANIPULATION_UX_PARTIAL_WITH_EVIDENCE.

Remaining next demand: Loop 29 must convert the right-side inspector into compact `屬性 / 圖層 / 提醒 / 材料 / 總覽` tabs and rerun full PPT-like click regression.

## Loop 29 PPT-like Inspector Tabs Evidence

Validation URL: http://127.0.0.1:50362/src/stitch_laibe_landing_onboarding/preview_floor_plan/code.html?validation=loop29-inspector-tabs-content-read

Evidence file: docs/plan_puzzle_repair/PLAN_PUZZLE_TARGET_LOOP_29_INSPECTOR_TABS.md

Screenshot: docs/plan_puzzle_repair/PLAN_PUZZLE_TARGET_LOOP_29_INSPECTOR_TABS_CHROME_SMOKE.png

| Step | Expected | Actual | Status | Evidence |
|---|---|---|---|---|
| Right panel framing | Reads as property panel, not status report | heading `屬性面板` / `選取物件設定` | PASS | Browser DOM |
| Five tabs | 屬性 / 圖層 / 提醒 / 材料 / 總覽 visible | tab count `5` | PASS | Browser DOM |
| Tab click | Each tab can become active | Chrome click smoke active states: 材料 / 總覽 / 提醒 / 圖層 / 屬性 | PASS | Chrome Playwright |
| Property tab | Default selected-object-first view | no-selection instruction shown | PASS | Browser text |
| Reminder tab | Compact todo list | reminder rows begin with `□` | PASS | Browser text |
| Material tab | Candidate material selection exposed | material select and apply action present | PASS_WITH_NOTES | Browser text |
| Overview tab | Candidate-only boundary visible | states not施工圖 / not正式估價 / no budget engine | PASS_WITH_NOTES | Browser text |
| Console/log | No browser errors or warnings | console errors `0`, warnings `0` | PASS | Chrome logs |
| Guard | No forbidden runtime/API/budget calls added | forbidden scope scan found none | PASS | Static scan |

Loop 29 result: LOOP_29_PPT_LIKE_INSPECTOR_TABS_PASS_WITH_NOTES.

Next demand: Loop 30 full human-operable regression after tool and inspector UX repairs.

## Loop 30 Full Human Operability Regression Evidence

Validation URL: http://127.0.0.1:50362/src/stitch_laibe_landing_onboarding/preview_floor_plan/code.html?validation=loop30-full-human-operability-regression

Evidence file: docs/plan_puzzle_repair/PLAN_PUZZLE_TARGET_LOOP_30_FULL_HUMAN_OPERABILITY_REGRESSION.md

Screenshot: docs/plan_puzzle_repair/PLAN_PUZZLE_TARGET_LOOP_30_FULL_REGRESSION.png

Exported candidate JSON: docs/plan_puzzle_repair/PLAN_PUZZLE_TARGET_LOOP_30_CANDIDATE_EXPORT.json

| Step | Expected | Actual | Status | Evidence |
|---|---|---|---|---|
| Page load | Page opens with path workbench and no blocking errors | `.pc` disabled; inspector tabs `5`; tool icons `48`; delete actions `2` | PASS | Chrome Playwright |
| Console/log | No runtime errors or warnings | console errors `0`, warnings `0`, page errors `0` | PASS | Browser logs |
| PNG import | Imported PNG appears as underlay | `underlay=true` | PASS | Runtime state + screenshot |
| Scale calibration | User can complete scale calibration | `calibrated=true`, `pxPerMm=0.11` | PASS_WITH_NOTES | Runtime state; true OCR/autoscale remains future task |
| Draw wall | Wall can be drawn and exported | wall count `1` | PASS_WITH_NOTES | Runtime state; stale test selector note documented |
| Add door | Door can be created and edited | exported opening kind `door`, offset / width / swing edited | PASS | Runtime state + JSON |
| Add window | Window can be created and edited | exported opening kind `window`, offset / width edited | PASS | Runtime state + JSON |
| Opening tool | Generic opening can be created | exported opening kind `opening` | PASS | Runtime state + JSON |
| Delete / undo / redo | Selected opening can be deleted and restored | openings `3 -> 2 -> 3 -> 2 -> 3` through delete / undo / redo / undo | PASS | Browser interaction |
| Furniture place / drag / resize | Furniture candidate is human-operable | wardrobe placed, dragged, resized | PASS | Browser geometry + screenshot |
| Width / depth / material / note | Inspector edits selected furniture | `widthMm=2100`, `depthMm=650`, `materialTags=["stone"]`, note exported | PASS | Runtime state + JSON |
| Candidate JSON export | Draft candidate JSON is available | walls `1`, openings `3`, furniture `1`, layoutObjects `1`, toolCatalogItems `10` | PASS_WITH_NOTES | Download + preview |
| Candidate JSON parse | Saved evidence file is valid JSON | bundled Node `JSON.parse` passed | PASS | Saved evidence file |
| Candidate-only guard | Export is not formal estimate | `formalEstimate=false`, `budgetEngineCalled=false`, `productionReady=false` | PASS | Parsed candidate boundary |
| `.pc` production export | Production export remains disabled | disabled / mock-only boundary preserved | PASS | DOM + guard text |

Loop 30 result: LOOP_30_FULL_HUMAN_OPERABILITY_REGRESSION_PASS_WITH_NOTES.

Defects fixed in Loop 30:
- Calibration controls hidden after inspector tab rewrite: fixed by switching to overview tab during calibration.
- Object property fields hidden after creation / selection: fixed by foregrounding properties tab for wall / opening / zone / furniture selection and creation.

Remaining next demand: Loop 31 should address true dimension-line clue detection / assisted autoscale; do not claim current manual calibration fallback as full OCR autoscale.

## Loop 31 Auto Scale Clue Regression Evidence

Validation URL: http://127.0.0.1:50362/src/stitch_laibe_landing_onboarding/preview_floor_plan/code.html?validation=loop31-autoscale-human-smoke-toolrail

Evidence file: docs/plan_puzzle_repair/PLAN_PUZZLE_TARGET_LOOP_31_AUTOSCALE_CLUE_REGRESSION.md

Screenshot: docs/plan_puzzle_repair/PLAN_PUZZLE_TARGET_LOOP_31_AUTOSCALE_REGRESSION.png

Exported candidate JSON: docs/plan_puzzle_repair/PLAN_PUZZLE_TARGET_LOOP_31_CANDIDATE_EXPORT.json

| Step | Expected | Actual | Status | Evidence |
|---|---|---|---|---|
| PNG import | Test image with dimension clue imports | `loop31-width-4000mm.png`, 1425 x 900 px | PASS | Browser upload |
| Dimension clue detection | System identifies explicit size clue | `檔名明確標示 寬度 4,000 mm` | PASS | Right inspector card |
| Suggestion before apply | UI exposes one-click suggestion, not silent guess | scale status `有系統建議`; apply button enabled | PASS | Browser DOM |
| Apply suggestion | Scale becomes calibrated | `pxPerMm=0.35625`, `knownLength=4000`, `pixelDistance=1425` | PASS | Runtime state + export |
| Calibration source | Export records method / confidence | `method=auto-scale-suggestion`, `confidence=high` | PASS | Parsed JSON |
| Manual fallback | Two-point calibration remains available | known length input and apply calibration controls remain visible | PASS | Inspector DOM |
| Draw wall after autoscale | Wall tool still works | wall count `1` | PASS | Browser click smoke |
| Add door after autoscale | Door tool still works | opening count `1` | PASS | Browser click smoke |
| Candidate JSON export | Export remains candidate-only | formalEstimate `false`, budgetEngineCalled `false`, productionReady `false` | PASS | Parsed JSON |
| Console/log | No browser errors or warnings | console errors `0`, warnings `0`, page errors `0` | PASS | Browser logs |

Loop 31 result: LOOP_31_AUTOSCALE_CLUE_REGRESSION_PASS_WITH_NOTES.

Remaining next demand: Loop 32 should clean remaining mojibake in visible UI / exported candidate metadata labels without changing the verified drawing, auto-scale, and guard behavior.

## Loop 32 Text Encoding Audit Evidence

Validation URL: http://127.0.0.1:50362/src/stitch_laibe_landing_onboarding/preview_floor_plan/code.html?validation=loop32-text-encoding-audit

Evidence file: docs/plan_puzzle_repair/PLAN_PUZZLE_TARGET_LOOP_32_TEXT_ENCODING_AUDIT.md

Screenshot: docs/plan_puzzle_repair/PLAN_PUZZLE_TARGET_LOOP_32_TEXT_ENCODING_AUDIT.png

| Step | Expected | Actual | Status | Evidence |
|---|---|---|---|---|
| Auto-scale title text | Readable Chinese in browser DOM | `系統比例建議` present | PASS | Browser DOM |
| Auto-scale source label | Readable filename clue label | `檔名明確標示 寬度 4,000 mm` present | PASS | Browser DOM |
| Auto-scale confidence label | Readable confidence label | `可套用，信心 高` present | PASS | Browser DOM |
| Replacement character | No browser-visible replacement character | `replacementCharPresent=false` | PASS | Browser DOM |
| Export metadata label | Candidate JSON label remains readable | `sourceLabel=檔名明確標示 寬度 4,000 mm` | PASS | Parsed JSON |
| Console/log | No browser errors or warnings | console errors `0`, warnings `0`, page errors `0` | PASS | Browser logs |
| Guard | No forbidden runtime/API/budget calls added | forbidden scope preserved | PASS | Static scan |

Loop 32 result: LOOP_32_TEXT_ENCODING_AUDIT_PASS_WITH_NOTES.

No runtime patch was required. The apparent mojibake in PowerShell output is a console decoding artifact; browser-visible text and exported candidate metadata are readable.

Remaining next demand: Loop 33 should package Loops 28-32 into a reviewer/A2 handoff map without staging, pushing, or expanding runtime scope.

## Loop 33 Reviewer / A2 Handoff Package

Evidence file: docs/plan_puzzle_repair/PLAN_PUZZLE_TARGET_LOOP_33_REVIEWER_A2_HANDOFF_PACKAGE.md

| Check | Expected | Actual | Status | Evidence |
|---|---|---|---|---|
| Worktree identity | Dedicated repair worktree / branch / HEAD recorded | branch `codex/plan-puzzle-test-repair-worktree-20260611`, HEAD `34e9a7c84d32941d5b66e6bd61c7b085c80e3ec5` | PASS | git read-only commands |
| Staged count | No staged files | staged count `0` | PASS | git diff --cached |
| Dirty scope | Runtime files and dedicated repair docs mapped | `code.html`, `plan-puzzle.js`, `docs/plan_puzzle_repair/**` | PASS_WITH_NOTES | git status / diff numstat |
| Evidence map | Loops 28-32 linked to browser screenshots / JSON exports / reports | Evidence table created | PASS | Loop 33 package |
| Guard statement | Forbidden areas remain untouched | Plancraft / budget / DB / payment / AI / package / stage all NO | PASS | Loop 33 package |
| Decision options | Reviewer / A2 has explicit choices | ACCEPT / REQUEST_TARGETED_REWORK / KEEP_LOCAL_ONLY | PASS | Loop 33 package |

Loop 33 result: LOOP_33_HANDOFF_PACKAGE_READY_WITH_GUARDED_BLOCKERS.

Remaining next demand: Loop 34 should run an enabled-action coverage delta audit against the current visible UI and only patch if a concrete human-operability defect is proven by browser evidence.

## Loop 34 Enabled Action Coverage Delta Audit

Evidence file: docs/plan_puzzle_repair/PLAN_PUZZLE_TARGET_LOOP_34_ENABLED_ACTION_COVERAGE_DELTA_AUDIT.md

Focused smoke screenshot: docs/plan_puzzle_repair/PLAN_PUZZLE_TARGET_LOOP_34_EXPORT_DOWNLOAD_SMOKE.png

Downloaded candidate JSON: docs/plan_puzzle_repair/PLAN_PUZZLE_TARGET_LOOP_34_START_PLACE_FURNITURE_EXPORT.json

| Step | Expected | Actual | Status | Evidence |
|---|---|---|---|---|
| Visible action inventory | Current UI enabled actions are listed | 18 unique visible `data-action` values | PASS | Browser DOM |
| File chooser action | `choose-file` opens file picker | `chooserOpened=true` | PASS | Browser event |
| Start-place-furniture action | Explicit button path creates furniture | Sofa candidate created from `start-place-furniture` path | PASS | Browser click smoke |
| Candidate JSON download | Export downloads candidate JSON | `laibe-plancraft-plus-draft.json` | PASS | Browser download |
| Candidate JSON parse | Exported JSON parses | Node `JSON.parse` PASS | PASS | Saved JSON |
| Furniture candidate export | Furniture is written to JSON | `furniture=1`, `layoutObjects=1`, `toolCatalogItems=10` | PASS | Parsed JSON |
| Candidate guard | Export remains draft-only | `formalEstimate=false`, `budgetEngineCalled=false`, `productionReady=false` | PASS | Parsed JSON |
| `.pc` production export | Production export remains disabled | `pcDisabled=true` | PASS | DOM |
| Console/log | No browser errors or warnings | console errors `0`, warnings `0`, page errors `0` | PASS | Browser logs |

Loop 34 result: LOOP_34_ENABLED_ACTION_COVERAGE_DELTA_PASS_NO_RUNTIME_PATCH_REQUIRED.

Remaining next demand: Loop 35 should run a compact populated-state top-toolbar and inspector-action regression and only patch if browser evidence proves a concrete defect.

## Loop 35 Populated-State Toolbar / Inspector Regression

Evidence file: docs/plan_puzzle_repair/PLAN_PUZZLE_TARGET_LOOP_35_POPULATED_STATE_REGRESSION.md

Screenshot: docs/plan_puzzle_repair/PLAN_PUZZLE_TARGET_LOOP_35_POPULATED_STATE_REGRESSION.png

Downloaded candidate JSON: docs/plan_puzzle_repair/PLAN_PUZZLE_TARGET_LOOP_35_POPULATED_STATE_EXPORT.json

| Step | Expected | Actual | Status | Evidence |
|---|---|---|---|---|
| Blank draft | Blank calibrated draft can start | Draft started | PASS | Browser click |
| Draw wall | Wall can be drawn | DOM wall count `1`; export walls `1` | PASS | Browser click + JSON |
| Add door | Door can be added from visible rail | Export opening kind `door` | PASS | Browser click + JSON |
| Add window | Window can be added from visible rail | Export opening kind `window` | PASS | Browser click + JSON |
| Place furniture | Sofa can be placed | DOM furniture `1`; export furniture `1` | PASS | Browser click + JSON |
| Inspector tabs | All five inspector tabs activate | properties / layers / reminders / materials / overview active | PASS | Browser DOM |
| Candidate JSON download | Download and parse candidate JSON | filename `laibe-plancraft-plus-draft.json`; parse PASS | PASS | Browser download + Node parse |
| Candidate guard | Export remains draft-only | `formalEstimate=false`, `budgetEngineCalled=false`, `productionReady=false` | PASS | Parsed JSON |
| `.pc` production export | Production export remains disabled | `pcDisabled=true` | PASS | DOM |
| Console/log | No browser errors or warnings | console errors `0`, warnings `0`, page errors `0` | PASS | Browser logs |

Loop 35 result: LOOP_35_POPULATED_STATE_REGRESSION_PASS_NO_RUNTIME_PATCH_REQUIRED.

Remaining next demand: Loop 36 should inspect the DOM/export opening count discrepancy and only patch if browser evidence proves a duplicate user-facing opening defect.

## Loop 36 Opening DOM / Export Count Audit

Evidence file: docs/plan_puzzle_repair/PLAN_PUZZLE_TARGET_LOOP_36_OPENING_DOM_EXPORT_AUDIT.md

Screenshot: docs/plan_puzzle_repair/PLAN_PUZZLE_TARGET_LOOP_36_OPENING_DOM_AUDIT.png

| Step | Expected | Actual | Status | Evidence |
|---|---|---|---|---|
| Door DOM symbol | Door may render as one line | One `.opening-symbol.opening-door` | PASS | Browser DOM |
| Window DOM symbol | Window may render as two parallel lines | Two `.opening-symbol.opening-window` | PASS | Browser DOM |
| Export candidate count | Export should contain actual candidates only | Loop 35 export has `openings=2` | PASS | Parsed JSON |
| Duplicate opening defect | No third exported candidate | No third opening candidate found | PASS | DOM / JSON comparison |
| Console/log | No browser errors or warnings | console errors `0`, warnings `0`, page errors `0` | PASS | Browser logs |

Loop 36 result: LOOP_36_OPENING_DOM_EXPORT_AUDIT_PASS_EXPECTED_WINDOW_DOUBLE_LINE_RENDERING.

No runtime patch was required. The DOM/export count difference is expected visual rendering: one door line plus two window lines.

Remaining next demand: Loop 37 should update the A2 completion package with Loops 33-36 evidence delta.

## Loop 37 A2 Completion Delta

Evidence file: docs/plan_puzzle_repair/PLAN_PUZZLE_TARGET_LOOP_37_A2_COMPLETION_DELTA.md

A2 return package updated:

Z:\08-Jacky\laibe_MVP_project\_ab_command_center_v2\PLAN_PUZZLE_TO_A2_REPORTS\PLAN_PUZZLE_COMPLETION_EVIDENCE_PACKAGE_RETURN_20260613.md

| Step | Expected | Actual | Status | Evidence |
|---|---|---|---|---|
| Delta coverage | Loops 33-36 are mapped for A2 | Handoff, enabled-action audit, populated-state regression, opening DOM/export audit mapped | PASS | Loop 37 package |
| A2 package | Latest completion package includes current delta | Loop 33-37 delta addendum appended | PASS | A2 return package |
| Staged count | No staged files | staged count `0` | PASS | git diff --cached |
| Runtime scope | No additional runtime patch for Loops 33-37 | Runtime patch required: NO | PASS | Loop 33-37 docs |
| Guard | Forbidden areas remain untouched | Plancraft / budget / API / payment / DB / package / git publish all NO | PASS | Loop 37 package |

Loop 37 result: LOOP_37_A2_COMPLETION_DELTA_READY.

Remaining next demand: Loop 38 should perform a read-only stale-evidence audit across A2 referenced files and latest JSON exports.

## Loop 38 Stale Evidence Audit

Evidence file: docs/plan_puzzle_repair/PLAN_PUZZLE_TARGET_LOOP_38_STALE_EVIDENCE_AUDIT.md

| Step | Expected | Actual | Status | Evidence |
|---|---|---|---|---|
| Evidence files | A2/reviewer referenced evidence files exist | All checked files present | PASS | Filesystem read-only check |
| Latest JSON exports | Candidate exports parse | Loops 30 / 31 / 34 / 35 JSON parse PASS | PASS | Node JSON.parse |
| Candidate guards | Latest exports remain draft-only | `formalEstimate=false`, `budgetEngineCalled=false`, `productionReady=false` | PASS | Parsed JSON |
| Staged files | No staged files | staged count `0` | PASS | git diff --cached |
| Runtime patch | No patch needed for stale check | runtimePatchRequired NO | PASS | Loop 38 package |

Loop 38 result: LOOP_38_STALE_EVIDENCE_AUDIT_PASS.

Remaining next demand: Loop 39 should keep the worktree active for A2/reviewer response-watch, or resume targeted browser evidence if a new concrete user-facing defect appears.

## Loop 39 Layer Visibility Regression

Evidence file: docs/plan_puzzle_repair/PLAN_PUZZLE_TARGET_LOOP_39_LAYER_VISIBILITY_REGRESSION.md

Screenshot: docs/plan_puzzle_repair/PLAN_PUZZLE_TARGET_LOOP_39_LAYER_VISIBILITY_REGRESSION.png

Candidate JSON: docs/plan_puzzle_repair/PLAN_PUZZLE_TARGET_LOOP_39_LAYER_VISIBILITY_EXPORT.json

| Step | Expected | Actual | Status | Evidence |
|---|---|---|---|---|
| Defect repro | Layer toggle should be Chinese-only | Repro found `牆體 layer hidden.` | DEFECT_PROVEN | Browser DOM |
| Runtime patch | Replace mixed English toggle message | Message now uses `圖層已顯示 / 圖層已隱藏` | PASS | Source patch + browser |
| Wall layer toggle | Hide / show wall layer | display `none -> block` | PASS | Browser computed style |
| Opening layer toggle | Hide / show opening layer | display `none -> block` | PASS | Browser computed style |
| Furniture layer toggle | Hide / show furniture layer | display `none -> grid` | PASS | Browser computed style |
| English status text | No `layer / shown / hidden` after patch | `hasEnglishLayerText=false` | PASS | Browser DOM |
| Candidate JSON export | Visibility toggles do not delete draft data | walls 1, openings 1, furniture 1, layoutObjects 1, toolCatalogItems 10 | PASS | Parsed JSON |
| Candidate guard | Export remains draft-only | `formalEstimate=false`, `budgetEngineCalled=false`, `productionReady=false` | PASS | Parsed JSON |
| Console/log | No browser errors or warnings | console errors `0`, warnings `0`, page errors `0` | PASS | Browser logs |

Loop 39 result: LOOP_39_LAYER_VISIBILITY_REGRESSION_PASS_WITH_MINIMAL_RUNTIME_PATCH.

Remaining next demand: Loop 40 should verify undo / redo remains stable after layer visibility toggles.

## Loop 40 Layer Undo / Redo Regression

Evidence file: docs/plan_puzzle_repair/PLAN_PUZZLE_TARGET_LOOP_40_LAYER_UNDO_REDO_REGRESSION.md

Screenshot: docs/plan_puzzle_repair/PLAN_PUZZLE_TARGET_LOOP_40_LAYER_UNDO_REDO_REGRESSION.png

Candidate JSON: docs/plan_puzzle_repair/PLAN_PUZZLE_TARGET_LOOP_40_LAYER_UNDO_REDO_EXPORT.json

| Step | Expected | Actual | Status | Evidence |
|---|---|---|---|---|
| Hide wall layer | Wall layer hides | display `none`, checkbox unchecked | PASS | Browser computed style |
| Undo visibility toggle | Wall layer returns | display `block`, checkbox checked | PASS | Browser computed style |
| Redo visibility toggle | Wall layer hides again | display `none`, checkbox unchecked | PASS | Browser computed style |
| Chinese status text | No `layer / shown / hidden` after hide / undo / redo | `hasEnglishLayerText=false` | PASS | Browser DOM |
| Candidate JSON export | Wall data remains after visibility history actions | walls `1` | PASS | Parsed JSON |
| Candidate guard | Export remains draft-only | `formalEstimate=false`, `budgetEngineCalled=false`, `productionReady=false` | PASS | Parsed JSON |
| Console/log | No browser errors or warnings | console errors `0`, warnings `0`, page errors `0` | PASS | Browser logs |

Loop 40 result: LOOP_40_LAYER_UNDO_REDO_REGRESSION_PASS_NO_ADDITIONAL_RUNTIME_PATCH_REQUIRED.

Remaining next demand: Loop 41 should audit below-canvas notes / supplemental area behavior against the one-screen drawing expectation.

## Loop 41 Below-canvas Layout / PPT-like Direct Smoke

Evidence file: docs/plan_puzzle_repair/PLAN_PUZZLE_TARGET_LOOP_41_BELOW_CANVAS_LAYOUT_AUDIT.md

Desktop screenshots:

- docs/plan_puzzle_repair/PLAN_PUZZLE_TARGET_LOOP_41_DESKTOP_LAYOUT_AUDIT.png
- docs/plan_puzzle_repair/PLAN_PUZZLE_TARGET_LOOP_41_DESKTOP_LAYOUT_POST_PATCH.png

Mobile screenshots:

- docs/plan_puzzle_repair/PLAN_PUZZLE_TARGET_LOOP_41_MOBILE_LAYOUT_POST_PATCH_BEFORE_JUMP.png
- docs/plan_puzzle_repair/PLAN_PUZZLE_TARGET_LOOP_41_MOBILE_LAYOUT_POST_PATCH_AFTER_JUMP.png

PPT-like smoke evidence:

- screenshot: docs/plan_puzzle_repair/PLAN_PUZZLE_TARGET_LOOP_41_PPT_LIKE_SMOKE.png
- candidate JSON: docs/plan_puzzle_repair/PLAN_PUZZLE_TARGET_LOOP_41_PPT_LIKE_SMOKE_EXPORT.json

| Step | Expected | Actual | Status | Evidence |
|---|---|---|---|---|
| Desktop layout | File area compact, workbench visible, inspector tabs normal height | bodyScrollHeight 714, clientHeight 709, tab heights 32 px | PASS | Browser layout metrics |
| Mobile layout | Canvas contained in canvas shell and no lower-panel overlap after jump | canvasShell height 520; no tool overlap after jump | PASS | Browser mobile metrics |
| Defect patch | Minimal CSS patch only | patched `#inspectorBody`, mobile `.tool-shell`, mobile `.canvas-shell` | PASS | `code.html` |
| Blank draft | User can start draft from visible button | blank draft started | PASS | Chrome smoke |
| Draw wall | User can draw wall | export walls 1 | PASS | Candidate JSON |
| Add door | User can add a door to selected wall | export openings 1 | PASS | Candidate JSON |
| Place wardrobe | User can place cabinet/furniture | furniture DOM 1, export furniture 1 | PASS | Screenshot + JSON |
| Drag / resize | Furniture can move and resize like direct object | visible text updated; export width 2200 depth 700 | PASS | Screenshot + JSON |
| Material / note | Inspector can update material and note | materialTags `wood`, note exported | PASS | Candidate JSON |
| Guard | Candidate-only and `.pc` disabled | formalEstimate false, budgetEngineCalled false, productionReady false, `.pc` disabled true | PASS | Candidate JSON + DOM |
| Console/log | No browser errors or warnings | errors 0, warnings 0, page errors 0 | PASS | Browser logs |

Loop 41 result: LOOP_41_BELOW_CANVAS_LAYOUT_AND_PPT_SMOKE_PASS_WITH_MINIMAL_RUNTIME_PATCH.

Remaining next demand: Loop 42 should audit selected-object handles, delete affordance, visible mode hints, inspector tab relevance, and hidden duplicate control traps.

## Loop 42 Direct-manipulation Affordance / Visible Chinese UI Recovery

Evidence file: docs/plan_puzzle_repair/PLAN_PUZZLE_TARGET_LOOP_42_DIRECT_MANIPULATION_AFFORDANCE_AUDIT.md

Screenshots:

- docs/plan_puzzle_repair/PLAN_PUZZLE_TARGET_LOOP_42_DIRECT_AFFORDANCE_AUDIT.png
- docs/plan_puzzle_repair/PLAN_PUZZLE_TARGET_LOOP_42_VISIBLE_CHINESE_UI_POST_PATCH.png
- docs/plan_puzzle_repair/PLAN_PUZZLE_TARGET_LOOP_42_DIRECT_AFFORDANCE_CHROME_POST_PATCH.png

Candidate JSON:

- docs/plan_puzzle_repair/PLAN_PUZZLE_TARGET_LOOP_42_DIRECT_AFFORDANCE_CHROME_EXPORT.json

Result JSON:

- docs/plan_puzzle_repair/PLAN_PUZZLE_TARGET_LOOP_42_DIRECT_AFFORDANCE_CHROME_RESULT.json

| Step | Expected | Actual | Status | Evidence |
|---|---|---|---|---|
| Tool visual state | Available tools should not all look selected | availability uses `is-ready`; current mode uses `is-mode-active` | PASS | Source + browser DOM |
| Active mode at load | Only select mode active | `activeModes=["選取"]` | PASS | System Chrome smoke |
| Visible Chinese UI | No visible mojibake | `hasChinese=true`, `hasMojibakeTokens=false` | PASS | Browser DOM |
| DOM uniqueness | One clean shell and one each for core IDs | `cleanShellCount=1` | PASS | Browser DOM |
| Blank draft | User can start calibrated blank draft | underlay `已匯入`, scale `已確認` | PASS | System Chrome click smoke |
| Draw wall | User can draw a wall | export walls `1` | PASS | Candidate JSON |
| Add door / window | User can add openings | export openings `2` | PASS | Candidate JSON |
| Place wardrobe | User can place cabinet candidate | DOM furniture `1`, export furniture `1`, layoutObjects `1` | PASS | Screenshot + JSON |
| Candidate JSON export | Download parses | parsed successfully | PASS | JSON evidence |
| Candidate guard | Export remains draft-only | formalEstimate false, budgetEngineCalled false, productionReady false | PASS | `candidateExportBoundary` |
| `.pc` disabled | `.pc` production export remains disabled | `pcDisabled=true` | PASS | Browser DOM |
| Console/log | No browser errors or warnings | errors `0`, warnings `0` | PASS | Browser logs |

Loop 42 result: LOOP_42_DIRECT_MANIPULATION_AFFORDANCE_PASS_WITH_NOTES.

Remaining next demand: Loop 43 should audit dynamic runtime strings generated by `plan-puzzle.js` for visible mojibake in helper, inspector, history, and candidate preview states.

## Loop 43 Dynamic Runtime Text Sweep

Evidence file: docs/plan_puzzle_repair/PLAN_PUZZLE_TARGET_LOOP_43_DYNAMIC_TEXT_SWEEP.md

Screenshot:

- docs/plan_puzzle_repair/PLAN_PUZZLE_TARGET_LOOP_43_DYNAMIC_TEXT_SWEEP.png

Candidate JSON:

- docs/plan_puzzle_repair/PLAN_PUZZLE_TARGET_LOOP_43_DYNAMIC_TEXT_SWEEP_EXPORT.json

Result JSON:

- docs/plan_puzzle_repair/PLAN_PUZZLE_TARGET_LOOP_43_DYNAMIC_TEXT_SWEEP_RESULT.json

| Step | Expected | Actual | Status | Evidence |
|---|---|---|---|---|
| Dynamic text sweep | Helper / inspector / tabs / undo / redo / export text should be readable | captures `17`, failed captures `0` | PASS | Result JSON |
| Console/log | No browser errors or warnings | errors `0`, warnings `0` | PASS | Browser logs |
| Blank draft | Dynamic status remains readable | PASS | System Chrome smoke |
| Wall / door / window / opening | Dynamic state remains readable | openings `3` in export | PASS | Candidate JSON |
| Furniture / material | Selected furniture and material state remain readable | selected furniture Chinese check true | PASS | Result JSON |
| Inspector tabs | Layers / reminders / materials / overview / properties readable | all covered | PASS | Result JSON |
| Undo / redo | History actions do not leak debug or mojibake | no bad pattern | PASS | Result JSON |
| Candidate guard | Export remains draft-only | `formalEstimate=false`, `budgetEngineCalled=false`, `productionReady=false` | PASS | Candidate JSON |

Loop 43 result: LOOP_43_DYNAMIC_TEXT_SWEEP_PASS_NO_RUNTIME_PATCH_REQUIRED.

Remaining next demand: Loop 44 should stress-check selected-object affordances: object highlight, drag / resize handles, Delete key, and inspector sync across wall / opening / furniture.

## Loop 44 PPT-like Direct Manipulation Stress

Evidence file: docs/plan_puzzle_repair/PLAN_PUZZLE_PPT_LIKE_USABILITY_AUDIT.md

Screenshot:

- docs/plan_puzzle_repair/PLAN_PUZZLE_TARGET_LOOP_44_SELECTED_OBJECT_AFFORDANCE_STRESS.png

Candidate JSON:

- docs/plan_puzzle_repair/PLAN_PUZZLE_TARGET_LOOP_44_SELECTED_OBJECT_AFFORDANCE_EXPORT.json

Result JSON:

- docs/plan_puzzle_repair/PLAN_PUZZLE_TARGET_LOOP_44_SELECTED_OBJECT_AFFORDANCE_RESULT.json

| Step | Expected | Actual | Status | Evidence |
|---|---|---|---|---|
| Page / blank draft | Page loads and blank millimeter draft calibrates | PASS | PASS | Result JSON |
| Draw wall | Wall tool creates selected wall | walls `1`, selected visual present | PASS | Result JSON |
| Wall select/delete | Selected wall changes color and Delete removes only selected wall | PASS | PASS | Result JSON |
| Undo / redo | Ctrl+Z / Ctrl+Y works after wall delete | PASS | PASS | Result JSON |
| Door / window / opening | Selected wall accepts door, window, opening | openings `3` | PASS | Candidate JSON |
| Opening inspector | Opening width edits from right inspector | width `950` | PASS | Result JSON |
| Furniture placement | Visible wardrobe tool places selected cabinet candidate | PASS | PASS | Screenshot + Result JSON |
| Furniture drag | Object moves like a PPT shape | x/y updated | PASS | Result JSON |
| Furniture resize | Resize handle changes width/depth | PASS | PASS | Result JSON |
| Furniture inspector | Width/depth/note/material update candidate data | width `1550`, depth `680`, material `system_panel` | PASS | Result JSON |
| Furniture delete | Delete removes selected furniture only | furniture `0`, walls `1`, openings `3` | PASS | Result JSON |
| Candidate export | Export includes walls/openings/furniture/layoutObjects/toolCatalogItems | `1/3/1/1/10` | PASS | Candidate JSON |
| Guard | Candidate-only and `.pc` disabled | formalEstimate false, budgetEngineCalled false, productionReady false | PASS | Candidate JSON |
| Console/log | No browser errors or warnings | errors `0`, warnings `0` | PASS | Browser logs |

Loop 44 result: LOOP_44_PPT_LIKE_DIRECT_MANIPULATION_PASS_WITH_MINIMAL_RUNTIME_PATCH.

Remaining next demand: Loop 45 should audit high-frequency toolbar hierarchy, compact icon affordance, and inspector noise/collapse with the same browser evidence standard.

## Loop 45 Toolbar Hierarchy Polish

Evidence file: docs/plan_puzzle_repair/PLAN_PUZZLE_TARGET_LOOP_45_TOOLBAR_HIERARCHY_POLISH.md

Screenshots:

- docs/plan_puzzle_repair/PLAN_PUZZLE_TARGET_LOOP_45_TOOLBAR_HIERARCHY_AUDIT.png
- docs/plan_puzzle_repair/PLAN_PUZZLE_TARGET_LOOP_45_FUNCTIONAL_REGRESSION.png

Result JSON:

- docs/plan_puzzle_repair/PLAN_PUZZLE_TARGET_LOOP_45_TOOLBAR_HIERARCHY_AUDIT_RESULT.json
- docs/plan_puzzle_repair/PLAN_PUZZLE_TARGET_LOOP_45_FUNCTIONAL_REGRESSION_RESULT.json

Candidate JSON:

- docs/plan_puzzle_repair/PLAN_PUZZLE_TARGET_LOOP_45_FUNCTIONAL_REGRESSION_EXPORT.json

| Step | Expected | Actual | Status | Evidence |
|---|---|---|---|---|
| Toolbar hierarchy audit | High-frequency tools first and activity furniture below fixed/cost candidate items | PASS_WITH_NOTES, no FAIL findings | PASS | Audit JSON |
| Place action wording | Visible wording should be human-readable | `加入圖面`; no `選取項目` | PASS | Audit JSON |
| Blank draft | Draft starts and calibrates | PASS | Functional regression |
| Wall | Wall can be drawn | walls `1` | PASS | Candidate JSON |
| Door / window | Door/window can be added | openings `2` | PASS | Candidate JSON |
| Furniture | Wardrobe can be added from visible tool | furniture `1` | PASS | Functional regression |
| Dimension / material | Inspector dimensions and material update data | width `1400`, depth `650`, material `system_panel` | PASS | Functional regression |
| Candidate export | Export includes draft data | walls `1`, openings `2`, furniture `1`, layoutObjects `1`, toolCatalogItems `10` | PASS | Candidate JSON |
| Guard | Candidate-only and `.pc` disabled | formalEstimate false, budgetEngineCalled false, productionReady false | PASS | Candidate JSON |
| Console/log | No browser errors or warnings | errors `0`, warnings `0` | PASS | Browser logs |

Loop 45 result: LOOP_45_TOOLBAR_HIERARCHY_POLISH_PASS_WITH_NOTES.

Remaining next demand: Loop 46 should verify import wording, PDF placeholder behavior, and auto-scale / calibration guidance honesty against actual runtime ability.

## Loop 46 Import / PDF Placeholder / Auto-scale Guidance Honesty

Evidence file: docs/plan_puzzle_repair/PLAN_PUZZLE_TARGET_LOOP_46_IMPORT_AUTOSCALE_GUIDANCE.md

Screenshots:

- docs/plan_puzzle_repair/PLAN_PUZZLE_TARGET_LOOP_46_POSTPATCH_INITIAL.png
- docs/plan_puzzle_repair/PLAN_PUZZLE_TARGET_LOOP_46_POSTPATCH_PDF.png
- docs/plan_puzzle_repair/PLAN_PUZZLE_TARGET_LOOP_46_POSTPATCH_NO_CLUE.png
- docs/plan_puzzle_repair/PLAN_PUZZLE_TARGET_LOOP_46_POSTPATCH_APPLIED.png

Result JSON:

- docs/plan_puzzle_repair/PLAN_PUZZLE_TARGET_LOOP_46_IMPORT_AUTOSCALE_POSTPATCH_PRECISE_RESULT.json
- docs/plan_puzzle_repair/PLAN_PUZZLE_TARGET_LOOP_46_FORBIDDEN_SCOPE_GUARD_RESULT.json

Candidate JSON:

- docs/plan_puzzle_repair/PLAN_PUZZLE_TARGET_LOOP_46_POSTPATCH_PRECISE_EXPORT.json

| Step | Expected | Actual | Status | Evidence |
|---|---|---|---|---|
| Import label honesty | PDF is not presented as direct preview support | Top toolbar says `匯入 JPG / PNG（PDF先轉圖）` | PASS | Screenshot + result JSON |
| Auto-scale wording | UI does not imply OCR / visual dimension-line recognition | `自動偵測` and `圖面尺寸線索` removed from enabled guidance | PASS | Result JSON + static scan |
| PDF upload | PDF remains placeholder only | Placeholder card explains PDF must become JPG / PNG first | PASS | PDF screenshot |
| PNG without filename clue | No automatic suggestion; asks for two-point calibration | `待兩點校正`, no apply suggestion button | PASS | No-clue screenshot |
| PNG with `width-3000mm` filename clue | Can apply filename scale suggestion | Scale becomes confirmed and export includes scale/importSource | PASS | Applied screenshot + candidate JSON |
| Candidate export | Export stays candidate JSON only | `candidateExportBoundary.formalEstimate=false`, `budgetEngineCalled=false` | PASS | Guard JSON |
| Console/log | No browser errors | errors `0` | PASS | Result JSON |

Loop 46 result: LOOP_46_IMPORT_AUTOSCALE_GUIDANCE_PASS_WITH_NOTES.

Remaining next demand: Loop 47 should re-run full human-operable regression across import / scale / wall / opening / furniture / material / export after the guidance patch.

## Loop 47 Full Human-operable Regression

Evidence file: docs/plan_puzzle_repair/PLAN_PUZZLE_TARGET_LOOP_47_FULL_HUMAN_OPERABLE_REGRESSION.md

Screenshot:

- docs/plan_puzzle_repair/PLAN_PUZZLE_TARGET_LOOP_47_FULL_REGRESSION_R5.png

Result JSON:

- docs/plan_puzzle_repair/PLAN_PUZZLE_TARGET_LOOP_47_FULL_REGRESSION_R5_RESULT.json
- docs/plan_puzzle_repair/PLAN_PUZZLE_TARGET_LOOP_47_FULL_REGRESSION_R5_CORRECTED_RESULT.json

Candidate JSON:

- docs/plan_puzzle_repair/PLAN_PUZZLE_TARGET_LOOP_47_FULL_REGRESSION_R5_EXPORT.json

| Step | Expected | Actual | Status | Evidence |
|---|---|---|---|---|
| Page / import / scale | Page loads, PNG imports, filename scale applies | scale status `已確認` | PASS | Corrected result JSON |
| Wall | User can draw a long wall | walls `1` | PASS | Candidate JSON |
| Door / window / opening | User can add all three to the selected wall | openings `3` | PASS | Candidate JSON |
| Furniture / fixture | User can place an item | furniture `1`, selected | PASS | Screenshot + JSON |
| Drag / resize | User can drag and resize by handle | movement and visual size changed | PASS | Result JSON |
| Inspector edit | User can edit width/depth/note/material | width `900`, material `system_panel`, note kept | PASS | Candidate JSON |
| Candidate export | Export contains walls/openings/furniture/layoutObjects/toolCatalogItems | `1/3/1/1/10` | PASS | Candidate JSON |
| Guard | Candidate-only and `.pc` disabled | formalEstimate false, budgetEngineCalled false, productionReady false | PASS | Candidate JSON |
| Console/log | No browser errors or warnings | errors `0`, warnings `0` | PASS | Corrected result JSON |

Loop 47 result: LOOP_47_FULL_HUMAN_OPERABLE_REGRESSION_PASS.

Remaining next demand: Loop 48 should triage remaining human UX polish items. Core drawing, opening, furniture, material, and candidate export are human-test usable in this evidence pass.

## Loop 48 Human UX Polish Triage

Evidence file: docs/plan_puzzle_repair/PLAN_PUZZLE_TARGET_LOOP_48_UX_POLISH_TRIAGE.md

Screenshot:

- docs/plan_puzzle_repair/PLAN_PUZZLE_TARGET_LOOP_48_CHINESE_FURNITURE_LABEL.png

Result JSON:

- docs/plan_puzzle_repair/PLAN_PUZZLE_TARGET_LOOP_48_CHINESE_FURNITURE_LABEL_RESULT.json
- docs/plan_puzzle_repair/PLAN_PUZZLE_TARGET_LOOP_48_CHINESE_FURNITURE_LABEL_CORRECTED_RESULT.json

Candidate JSON:

- docs/plan_puzzle_repair/PLAN_PUZZLE_TARGET_LOOP_48_CHINESE_LABEL_EXPORT.json

| Step | Expected | Actual | Status | Evidence |
|---|---|---|---|---|
| Canvas furniture label | Human-facing label should be Chinese | `馬桶 / 420 x 700 mm`; no `toilet` slug visible in label | PASS | Screenshot + corrected result |
| Candidate JSON | Machine-readable type remains stable | type `toilet`, name `馬桶` | PASS | Candidate JSON |
| Guard | Candidate-only and `.pc` disabled | formalEstimate false, budgetEngineCalled false, productionReady false | PASS | Candidate JSON |
| Console/log | No browser errors | errors `0` | PASS | Corrected result JSON |

Loop 48 result: LOOP_48_UX_POLISH_TRIAGE_PASS_WITH_MINIMAL_PATCH.

Remaining next demand: Loop 49 should audit mobile / small-height viewport operability for the same core flow.

## Loop 49 Small Viewport Operability

Evidence file: docs/plan_puzzle_repair/PLAN_PUZZLE_TARGET_LOOP_49_SMALL_VIEWPORT_OPERABILITY.md

Screenshot:

- docs/plan_puzzle_repair/PLAN_PUZZLE_TARGET_LOOP_49_SMALL_VIEWPORT_R3.png

Result JSON:

- docs/plan_puzzle_repair/PLAN_PUZZLE_TARGET_LOOP_49_SMALL_VIEWPORT_R2_RESULT.json
- docs/plan_puzzle_repair/PLAN_PUZZLE_TARGET_LOOP_49_SMALL_VIEWPORT_R3_RESULT.json

Candidate JSON:

- docs/plan_puzzle_repair/PLAN_PUZZLE_TARGET_LOOP_49_SMALL_VIEWPORT_R3_EXPORT.json

| Step | Expected | Actual | Status | Evidence |
|---|---|---|---|---|
| Small viewport layout | File area, left tools, canvas, and inspector remain visible at 1280 x 620 | All four areas visible | PASS | R3 result JSON |
| Import / scale | PNG imports and filename scale suggestion applies | scale status confirmed | PASS | R3 result JSON |
| Wall / openings | Wall can be drawn and door / window / opening can be added | walls `1`, openings `3` in export | PASS | Candidate JSON |
| Furniture placement / drag | Wardrobe can be placed and dragged in constrained height | furniture `1`; bbox moved | PASS | R3 result JSON |
| Furniture resize | Human-visible resize handle works even when corner handle is outside canvas | inside handle resized bbox `905 x 302` -> `1085 x 421` | PASS | R3 result JSON |
| Inspector edit | Width / depth / material remain editable | width `1230`, depth `650`, material `system_panel` | PASS | Candidate JSON |
| Candidate export | Export contains walls / openings / furniture / layoutObjects / toolCatalogItems | `1 / 3 / 1 / 1 / 10` | PASS | Candidate JSON |
| Guard | Candidate-only and `.pc` disabled | formalEstimate false, budgetEngineCalled false, productionReady false | PASS | Candidate JSON |
| Console/log | No browser errors or warnings | errors `0`, warnings `0` | PASS | R3 result JSON |

Loop 49 result: LOOP_49_SMALL_VIEWPORT_OPERABILITY_PASS_WITH_MINIMAL_PATCH.

Remaining next demand: Loop 50 should audit mobile/narrow viewport tap-targets and panel scrolling for the same core flow.

## Loop 50 Narrow Viewport Operability

Evidence file: docs/plan_puzzle_repair/PLAN_PUZZLE_TARGET_LOOP_50_NARROW_VIEWPORT_OPERABILITY.md

Screenshot:

- docs/plan_puzzle_repair/PLAN_PUZZLE_TARGET_LOOP_50_NARROW_VIEWPORT_R3.png

Result JSON:

- docs/plan_puzzle_repair/PLAN_PUZZLE_TARGET_LOOP_50_NARROW_VIEWPORT_RESULT.json
- docs/plan_puzzle_repair/PLAN_PUZZLE_TARGET_LOOP_50_NARROW_VIEWPORT_R2_RESULT.json
- docs/plan_puzzle_repair/PLAN_PUZZLE_TARGET_LOOP_50_NARROW_VIEWPORT_R3_RESULT.json

Candidate JSON:

- docs/plan_puzzle_repair/PLAN_PUZZLE_TARGET_LOOP_50_NARROW_VIEWPORT_R3_EXPORT.json

| Step | Expected | Actual | Status | Evidence |
|---|---|---|---|---|
| Narrow layout | File area, tools, canvas, and inspector reachable at 430 x 820 | inspector tabs relative; canvas horizontally scrollable | PASS | R3 result JSON |
| Import / scale | PNG imports and filename scale suggestion applies | scale status confirmed | PASS | R3 result JSON |
| Wall / openings | User can draw long wall by horizontal canvas scroll and add door/window/opening | walls `1`, openings `3` in export | PASS | Candidate JSON |
| Furniture placement / drag / resize | Wardrobe can be placed, dragged, and resized | bbox resize `905 x 302` -> `1005 x 371` | PASS | R3 result JSON |
| Inspector edit | Width / depth / material remain editable | width `1230`, depth `650`, material `system_panel` | PASS | Candidate JSON |
| Candidate export | Export contains walls / openings / furniture / layoutObjects / toolCatalogItems | `1 / 3 / 1 / 1 / 10` | PASS | Candidate JSON |
| Guard | Candidate-only and `.pc` disabled | formalEstimate false, budgetEngineCalled false, productionReady false | PASS | Candidate JSON |
| Console/log | No browser errors or warnings | errors `0`, warnings `0` | PASS | R3 result JSON |

Loop 50 result: LOOP_50_NARROW_VIEWPORT_OPERABILITY_PASS_WITH_MINIMAL_PATCH.

Remaining next demand: Loop 51 should verify Delete / undo / redo across wall, opening, and furniture after the responsive layout patches.

## Loop 51 Delete / Undo / Redo Regression

Evidence file: docs/plan_puzzle_repair/PLAN_PUZZLE_TARGET_LOOP_51_DELETE_UNDO_REDO_REGRESSION.md

Screenshot:

- docs/plan_puzzle_repair/PLAN_PUZZLE_TARGET_LOOP_51_DELETE_UNDO_REDO_R4.png

Result JSON:

- docs/plan_puzzle_repair/PLAN_PUZZLE_TARGET_LOOP_51_DELETE_UNDO_REDO_R4_RESULT.json

Candidate JSON:

- docs/plan_puzzle_repair/PLAN_PUZZLE_TARGET_LOOP_51_DELETE_UNDO_REDO_R4_FINAL_EXPORT.json

| Step | Expected | Actual | Status | Evidence |
|---|---|---|---|---|
| Blank mm draft | A long calibrated blank draft can isolate delete / undo / redo | `normalizedAs=blank-mm-draft`, scale calibrated | PASS | R4 result JSON |
| Wall / openings / furniture setup | One wall, three openings, one furniture candidate | `1 / 3 / 1` | PASS | R4 candidate JSON |
| Furniture Delete / undo / redo | Delete removes furniture, undo restores, redo removes, final undo restores | `0 -> 1 -> 0 -> 1` | PASS | R4 state exports |
| Opening Delete / undo / redo | Delete removes one opening, undo restores, redo removes, final undo restores | `2 -> 3 -> 2 -> 3` | PASS | R4 state exports |
| Wall Delete / undo / redo | Delete removes wall and dependent openings, undo restores, redo removes, final undo restores | `0/0 -> 1/3 -> 0/0 -> 1/3` | PASS | R4 state exports |
| Candidate export | Final export contains wall/opening/furniture candidate data | walls `1`, openings `3`, furniture `1` | PASS | R4 final export |
| Guard | Candidate-only and `.pc` disabled | formalEstimate false, budgetEngineCalled false, productionReady false | PASS | R4 final export |
| Console/log | No browser errors or warnings | errors `0`, warnings `0` | PASS | R4 result JSON |

Loop 51 result: LOOP_51_DELETE_UNDO_REDO_REGRESSION_PASS.

Remaining next demand: Loop 52 should verify selected object classification / layer persistence across wall status, wall type, thickness, opening metadata, furniture material, candidate JSON export, and guard boundary.

## Loop 52 Classification / Layer Persistence

Evidence file: docs/plan_puzzle_repair/PLAN_PUZZLE_TARGET_LOOP_52_CLASSIFICATION_LAYER_PERSISTENCE.md

Screenshot:

- docs/plan_puzzle_repair/PLAN_PUZZLE_TARGET_LOOP_52_CLASSIFICATION_LAYER_PERSISTENCE.png

Result JSON:

- docs/plan_puzzle_repair/PLAN_PUZZLE_TARGET_LOOP_52_CLASSIFICATION_LAYER_PERSISTENCE_RESULT.json
- docs/plan_puzzle_repair/PLAN_PUZZLE_TARGET_LOOP_52_CLASSIFICATION_LAYER_PERSISTENCE_CORRECTED_RESULT.json

Candidate JSON:

- docs/plan_puzzle_repair/PLAN_PUZZLE_TARGET_LOOP_52_CLASSIFICATION_LAYER_PERSISTENCE_EXPORT.json

| Step | Expected | Actual | Status | Evidence |
|---|---|---|---|---|
| Wall classification edit | Selected wall edits persist | status `demolished`, type `light_partition`, thickness `100` | PASS | Corrected result JSON |
| Opening metadata edit | Selected opening edits persist | offset `600`, width `760`, swing `right` | PASS | Corrected result JSON |
| Furniture metadata edit | Selected furniture edits persist | width `1600`, depth `550`, height `2300`, rotation `90`, material `system_panel`, note set | PASS | Corrected result JSON |
| Candidate export | Export contains edited wall/opening/furniture/layoutObject | walls `1`, openings `1`, furniture `1`, layoutObjects `1` | PASS | Candidate JSON |
| Guard | Candidate-only and `.pc` disabled | formalEstimate false, budgetEngineCalled false, productionReady false | PASS | Candidate JSON |
| Console/log | No browser errors or warnings | errors `0`, warnings `0` | PASS | Corrected result JSON |

Correction note: the raw result checked `layout_objects`, but runtime export uses `layoutObjects`. Corrected result confirms layout object persistence without runtime patch.

Loop 52 result: LOOP_52_CLASSIFICATION_LAYER_PERSISTENCE_PASS_CORRECTED_HARNESS_FIELD_NAME.

Remaining next demand: Loop 53 should verify layer visibility / object visibility does not delete wall, opening, furniture, material, layoutObjects, or candidate JSON data.

## Loop 53 Layer Visibility Regression

Evidence file: docs/plan_puzzle_repair/PLAN_PUZZLE_TARGET_LOOP_53_LAYER_VISIBILITY_REGRESSION.md

Screenshot:

- docs/plan_puzzle_repair/PLAN_PUZZLE_TARGET_LOOP_53_LAYER_VISIBILITY_REGRESSION.png

Result JSON:

- docs/plan_puzzle_repair/PLAN_PUZZLE_TARGET_LOOP_53_LAYER_VISIBILITY_REGRESSION_RESULT.json

Candidate JSON:

- docs/plan_puzzle_repair/PLAN_PUZZLE_TARGET_LOOP_53_LAYER_VISIBILITY_INITIAL_EXPORT.json
- docs/plan_puzzle_repair/PLAN_PUZZLE_TARGET_LOOP_53_LAYER_VISIBILITY_HIDDEN_EXPORT.json
- docs/plan_puzzle_repair/PLAN_PUZZLE_TARGET_LOOP_53_LAYER_VISIBILITY_RESTORED_EXPORT.json

| Step | Expected | Actual | Status | Evidence |
|---|---|---|---|---|
| Initial setup | Wall/opening/furniture/layoutObject exist | `1 / 1 / 1 / 1` | PASS | Initial export |
| Hide layers | Wall/opening/furniture become visually hidden | wall hidden, opening hidden, furniture hidden `1/1` | PASS | Result JSON |
| Hidden export | Hidden layers do not delete data | `1 / 1 / 1 / 1` remains | PASS | Hidden export |
| Restore layers | Wall/opening/furniture become visible again | wall visible, opening visible, furniture visible `1` | PASS | Result JSON |
| Restored export | Restored layers preserve data | `1 / 1 / 1 / 1` remains | PASS | Restored export |
| Guard | Candidate-only and `.pc` disabled | formalEstimate false, budgetEngineCalled false, productionReady false | PASS | Restored export |
| Console/log | No browser errors or warnings | errors `0`, warnings `0` | PASS | Result JSON |

Loop 53 result: LOOP_53_LAYER_VISIBILITY_REGRESSION_PASS.

Remaining next demand: Loop 54 should refresh the final human-operable completion matrix and separate remaining placeholders from completed core usable functions.

## Loop 54 Completion Matrix Refresh

Evidence file: docs/plan_puzzle_repair/PLAN_PUZZLE_TARGET_LOOP_54_COMPLETION_MATRIX_REFRESH.md

| Area | Status | Evidence |
|---|---|---|
| Core candidate drafting functions | HUMAN_TEST_USABLE | Loops 47, 49, 50, 51, 52, 53 |
| Candidate JSON export | PASS | Loops 47, 49, 50, 51, 52, 53 |
| `.pc` production export | DISABLED_BY_GUARD | Loops 47, 49, 50, 51, 52, 53 |
| Budget / formal estimate | EXCLUDED_FROM_REPAIR_LOOP | Guard evidence across latest loops |
| True OCR scale recognition | REMAINING_PLACEHOLDER | Listed separately; not claimed complete |
| Direct PDF preview / calibration | REMAINING_PLACEHOLDER | Listed separately; not claimed complete |
| SVG furniture runtime include | BLOCKED | Candidate-only package; direct include `0` |

Loop 54 result: LOOP_54_COMPLETION_MATRIX_REFRESH_READY.

Remaining next demand: Loop 55 should produce a runtime diff risk audit and reviewer-ready scope map.
## Loop 57 Runtime Diff Risk Audit and Reviewer-ready Scope Map

| Item | Result | Evidence |
|---|---|---|
| Loop decision | `LOOP_57_REVIEWER_SCOPE_MAP_READY` | `docs/plan_puzzle_repair/PLAN_PUZZLE_TARGET_LOOP_57_RUNTIME_DIFF_RISK_AUDIT.md` |
| Tracked runtime scope | 2 files: `code.html`, `plan-puzzle.js` | git diff name-status |
| Runtime diff size | `+3375 / -695` across tracked runtime files | git diff numstat |
| Evidence inventory | 249 repair evidence files | docs/plan_puzzle_repair scan |
| Guard | node check PASS, forbidden scan PASS, staged count 0 | Loop 57 guard table |
| Reviewer disposition | `REVIEW_REQUIRED_BEFORE_PR_READY` | Loop 57 recommendation |

Loop 57 does not modify runtime. It packages the current Plan Puzzle repair scope for reviewer / A2 disposition and keeps production, budget, `.pc`, AI, DB, payment, LINE, and n8n boundaries excluded.

## Loop 58 Reviewer Response Watch and Patch Split Guide

| Item | Result | Evidence |
|---|---|---|
| Loop decision | `LOOP_58_PATCH_SPLIT_GUIDE_READY` | `docs/plan_puzzle_repair/PLAN_PUZZLE_TARGET_LOOP_58_REVIEWER_RESPONSE_WATCH_AND_PATCH_SPLIT_GUIDE.md` |
| Runtime patch | `false` | Loop 58 is docs-only |
| Reviewer response | `NO_RESPONSE_OBSERVED_LOCALLY` | response-watch table |
| Patch split groups | 7 groups | UI shell, wall/opening, furniture, inspector, command history, export guard, SVG candidate boundary |
| Staged count | `0` | guard table |
| Guard boundary | preserved | no Plancraft, budget runtime, package/node_modules, production estimate, or SVG runtime include |

Loop 58 keeps work moving while completion remains unproven. It does not claim PR-ready or production-ready status; it prepares the review path so A2 / Reviewer can accept, request targeted rework, or split the large runtime diff into smaller review groups.

## Loop 59 A2 Completion Evidence Index

| Item | Result | Evidence |
|---|---|---|
| Loop decision | `LOOP_59_A2_COMPLETION_EVIDENCE_INDEX_READY` | `docs/plan_puzzle_repair/PLAN_PUZZLE_TARGET_LOOP_59_A2_COMPLETION_EVIDENCE_INDEX.md` |
| Runtime patch | `false` | Loop 59 is docs-only |
| A2 package state | `READY_FOR_A2_REVIEW_ONLY` | A2 return file plus Loop 59 index |
| Evidence mapped | 18 required A2 evidence rows | Requirement-to-evidence table |
| Not claimed | PR ready / A3 ready / production ready / budget ready / formal `.pc` ready | Loop 59 decision section |
| Next safe task | Loop 60 evidence freshness check | Loop 59 next automatic task |

Loop 59 keeps the package reviewable by A2 without widening scope. It preserves the distinction between local human-test usable candidate drafting and production / budget / PR readiness.

## Loop 60 Evidence Freshness and JSON Parse Check

| Item | Result | Evidence |
|---|---|---|
| Loop decision | `LOOP_60_EVIDENCE_FRESHNESS_PASS_WITH_BOM_NOTE` | `docs/plan_puzzle_repair/PLAN_PUZZLE_TARGET_LOOP_60_EVIDENCE_FRESHNESS_CHECK.md` |
| Runtime patch | `false` | Loop 60 is evidence-only |
| JSON files checked | `9` | parse matrix |
| Plain JSON parse | `8 PASS / 1 BOM_NOTE` | strict parse fails only for one BOM-bearing evidence result file |
| Export payload guard | PASS | all parsed export payloads keep `formalEstimate=false`, `budgetEngineCalled=false`, `productionReady=false` |
| Runtime defect found | NO | BOM note is evidence-file hygiene only |

Loop 60 confirms the latest evidence set remains readable and candidate-only. One evidence result file should be normalized only if A2 requires strict plain `JSON.parse` without BOM handling.

## Loop 61 SVG Furniture Package Source Path Confirmation

| Item | Result | Evidence |
|---|---|---|
| Loop decision | `LOOP_61_SVG_SOURCE_PATH_CONFIRMED_WITH_COUNT_RECONCILIATION_REQUIRED` | `docs/plan_puzzle_repair/PLAN_PUZZLE_TARGET_LOOP_61_SVG_SOURCE_PATH_CONFIRMATION.md` |
| User-confirmed SVG source path | `Z:\08-Jacky\svg_blocks` | read-only path check |
| Current recursive SVG count | `1565` | `Get-ChildItem -Recurse -Filter *.svg` |
| Historic audit count | `1826` | earlier Loop 3 / Loop 4A blackboard value |
| Runtime SVG include | `0` | no runtime patch / no copied assets |
| Decision | SVG source confirmed, runtime package still blocked | count reconciliation required before package include |

Loop 61 updates the SVG package source truth without polluting Plan Puzzle runtime. Parametric furniture / cabinet MVP remains the active human-operable path; SVG furniture package inclusion remains blocked until count reconciliation, per-candidate QA, and reviewer / commander acceptance.

## Loop 62 SVG Source Count Reconciliation

| Item | Result | Evidence |
|---|---|---|
| Loop decision | `LOOP_62_SVG_CANDIDATE_PATHS_RECONCILED_TOTAL_COUNT_STILL_CHANGED` | `docs/plan_puzzle_repair/PLAN_PUZZLE_TARGET_LOOP_62_SVG_SOURCE_RECONCILIATION.md` |
| Current source root | `Z:\08-Jacky\svg_blocks` | user-confirmed path |
| Current recursive SVG count | `1565` | read-only source scan |
| Historic audit SVG count | `1826` | earlier Loop 3 / Loop 4 records |
| Candidate ledger rows parsed | `84` | Loop 4 candidate contract |
| Candidate source paths existing | `84 / 84` | read-only `Test-Path` equivalent through Node |
| Runtime SVG include | `0` | no runtime patch / no copied assets |

Loop 62 confirms the existing 84 candidate ledger can remain as candidate-only review evidence because every referenced source path still exists. It does not authorize runtime inclusion; the total inventory count changed, so any future SVG package task must refresh the full current `1565`-file source inventory first.
