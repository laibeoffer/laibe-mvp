# Plan Puzzle Human Operable Bug Queue

## Resolved in Target Loop 1

| Bug | Severity | Status | Evidence |
|---|---|---|---|
| Workbench layout stretched canvas to several thousand pixels | P0 | RESOLVED | 1440x900 regression bodyScrollHeight 1188, canvas height 439 |
| Candidate draft JSON export was disabled | P0 | RESOLVED | exportDraft disabled false; downloadCount 1; JSON contains walls/openings/import/scale |

## Open Backlog

| Bug | Severity | Status | Owner |
|---|---|---|---|
| Door/window needs focused edit/delete/offset validation beyond basic add-door smoke | P1 | RESOLVED_LOOP_11 | Door / Window / Opening Builder |
| Loop 4B furniture/cabinet controls are present but end-to-end placement is not browser-verified | P1 | RESOLVED_PASS_WITH_NOTES | Furniture / Cabinet Builder, Human Operability QA |
| In-app Browser validation cannot currently upload an underlay image, while furniture placement requires imported image + calibrated scale | P1 | RESOLVED_BY_BLANK_MM_DRAFT_PATH_AND_LOOP_10_CDP_PNG_IMPORT_REGRESSION | Human Operability QA, Execution Officer |
| Material actions exist in parametric furniture inspector path but need end-to-end selected-item browser verification | P1 | RESOLVED_PASS_WITH_NOTES | Inspector / Status UX + Material Builder |
| JSON download content cannot be captured by Codex in-app Browser | P2 | RESOLVED_BY_BROWSER_PREVIEW_PASS_WITH_NOTES | Human Operability QA |
| Inspector diagnostic panels crowd selected-object editing workflow | P1 | RESOLVED_PASS_WITH_NOTES | Inspector / Status UX + Material Builder |
| Empty/upper opening layer intercepted wall hit-target clicks and blocked wall inspector foregrounding | P1 | RESOLVED | Inspector / Status UX + Material Builder |
| Opening hit target and opening inspector foregrounding needed post-hit-test regression | P1 | RESOLVED | Door / Window / Opening Builder |
| .pc export remains disabled by design and needs boundary wording review before any future enablement | P2 | RESOLVED_BOUNDARY_DISABLED_MOCK_ONLY | Commander / Data Guard |
| Furniture resize handle was usable but too subtle and had no direct resize hint | P1 | RESOLVED_LOOP_7 | Inspector / Status UX + Material Builder |
| Furniture inspector labels used technical field names instead of human-readable labels | P2 | RESOLVED_LOOP_7 | Inspector / Status UX + Material Builder |
| Keyboard Delete / Backspace needed hardening for selected drawing objects | P2 | RESOLVED_LOOP_9 | B_PLAN_PUZZLE_REPAIR_COMMANDER |
| Candidate JSON Preview could silently become stale after later edits | P2 | RESOLVED_LOOP_9 | B_PLAN_PUZZLE_REPAIR_COMMANDER |
| Zone / boundary candidate data was not visible in browser-verifiable Candidate JSON Preview | P1 | RESOLVED_LOOP_12A | B_PLAN_PUZZLE_REPAIR_COMMANDER |
| Clean wall endpoints action needed browser proof that it changes wall data and graph state | P1 | RESOLVED_LOOP_12B_NO_PATCH | B_PLAN_PUZZLE_REPAIR_COMMANDER |
| Reset project action needed browser proof that it clears project data and preview state | P1 | RESOLVED_LOOP_12C_NO_PATCH | B_PLAN_PUZZLE_REPAIR_COMMANDER |
| Style visual action needed browser proof that it remains a mock-only / no-network boundary | P1 | RESOLVED_LOOP_12D_NO_PATCH | B_PLAN_PUZZLE_REPAIR_COMMANDER |
| Mobile focus-canvas shortcut needed responsive browser evidence | P2 | RESOLVED_LOOP_12E_NO_PATCH | B_PLAN_PUZZLE_REPAIR_COMMANDER |
| Path-mode workbench layout needed top file area and desktop tools/canvas/status left-to-right evidence | P1 | RESOLVED_LOOP_15_WITH_PDF_BOUNDARY | B_PLAN_PUZZLE_REPAIR_COMMANDER |
| Path-mode hidden toolbar row collapsed `#planCanvas` to 0px and blocked canvas clicking | P0 | RESOLVED_LOOP_16_PATCH_VERIFIED | B_PLAN_PUZZLE_REPAIR_COMMANDER |
| Path-mode surface looked unprofessional / unintuitive with oversized tool cards and file controls losing click priority | P1 | RESOLVED_LOOP_18_POLISH_VERIFIED | B_PLAN_PUZZLE_REPAIR_COMMANDER |
| Selected furniture widthMm / depthMm typing was interrupted by inspector re-render on every input event | P1 | RESOLVED_LOOP_19_PATCH_VERIFIED | B_PLAN_PUZZLE_REPAIR_COMMANDER |

## Loop 4B Guarded Status

| Item | Severity | Status | Owner |
|---|---|---|---|
| SVG furniture package runtime must remain blocked until per-candidate overlay QA passes | P0 | BLOCKED_BY_DESIGN | SVG Furniture Candidate Overlay QA |
| Parametric furniture / cabinet MVP is allowed to continue without SVG package inclusion | P0 | ACTIVE | Furniture / Cabinet Builder |
| Furniture / cabinet candidates must remain draft-only and must not enter formal estimate | P0 | GUARD_ACTIVE | Data Guard |

## Loop 12A Guarded Status

| Item | Severity | Status | Owner |
|---|---|---|---|
| Zone placement and selected zone inspector editing | P1 | RESOLVED_LOOP_12A | B_PLAN_PUZZLE_REPAIR_COMMANDER |
| Zone boundary single-edge candidate warning | P1 | PASS_WITH_EXPECTED_OPEN_BOUNDARY_WARNING | B_PLAN_PUZZLE_REPAIR_COMMANDER |
| Candidate JSON Preview includes zones / boundaryStatus | P1 | RESOLVED_LOOP_12A | B_PLAN_PUZZLE_REPAIR_COMMANDER |

## Loop 12B Guarded Status

| Item | Severity | Status | Owner |
|---|---|---|---|
| Clean wall endpoints merges endpoints within 30 mm | P1 | RESOLVED_LOOP_12B_NO_PATCH | B_PLAN_PUZZLE_REPAIR_COMMANDER |
| Clean wall endpoints rebuilds node graph | P1 | RESOLVED_LOOP_12B_NO_PATCH | B_PLAN_PUZZLE_REPAIR_COMMANDER |
| Clean wall endpoints keeps candidate-only JSON boundary | P1 | RESOLVED_LOOP_12B_NO_PATCH | B_PLAN_PUZZLE_REPAIR_COMMANDER |

## Loop 12C Guarded Status

| Item | Severity | Status | Owner |
|---|---|---|---|
| Reset project clears import / underlay / scale | P1 | RESOLVED_LOOP_12C_NO_PATCH | B_PLAN_PUZZLE_REPAIR_COMMANDER |
| Reset project clears walls / openings / zones / furniture | P1 | RESOLVED_LOOP_12C_NO_PATCH | B_PLAN_PUZZLE_REPAIR_COMMANDER |
| Reset project clears candidate JSON preview and selections | P1 | RESOLVED_LOOP_12C_NO_PATCH | B_PLAN_PUZZLE_REPAIR_COMMANDER |

## Loop 12D Guarded Status

| Item | Severity | Status | Owner |
|---|---|---|---|
| Style visual generate action is visible and clickable | P1 | RESOLVED_LOOP_12D_NO_PATCH | B_PLAN_PUZZLE_REPAIR_COMMANDER |
| Style visual proxy remains disabled / mock-only | P0 | GUARD_ACTIVE_LOOP_12D | Data Guard |
| No AI / image API / budget / payment / DB / n8n request after click | P0 | VERIFIED_LOOP_12D | Data Guard |

## Loop 12E Guarded Status

| Item | Severity | Status | Owner |
|---|---|---|---|
| focus-canvas mobile shortcut is visible on mobile viewport | P2 | RESOLVED_LOOP_12E_NO_PATCH | B_PLAN_PUZZLE_REPAIR_COMMANDER |
| focus-canvas click scrolls canvas into viewport | P2 | RESOLVED_LOOP_12E_NO_PATCH | B_PLAN_PUZZLE_REPAIR_COMMANDER |
| focus-canvas shortcut stays hidden on desktop where canvas is already visible | P2 | RESOLVED_LOOP_12E_NO_PATCH | B_PLAN_PUZZLE_REPAIR_COMMANDER |

## Loop 15 Guarded Status

| Item | Severity | Status | Owner |
|---|---|---|---|
| Path-mode desktop layout: file area, tools, canvas, status | P1 | RESOLVED_LOOP_15 | B_PLAN_PUZZLE_REPAIR_COMMANDER |
| Existing background color/style must be preserved | P1 | VERIFIED_LOOP_15 | B_PLAN_PUZZLE_REPAIR_COMMANDER |
| Provided sample PDF path is readable, but PDF direct preview remains bounded | P2 | PASS_WITH_BOUNDARY | B_PLAN_PUZZLE_REPAIR_COMMANDER |

## Loop 16 Guarded Status

| Item | Severity | Status | Owner |
|---|---|---|---|
| `#planCanvas` height collapsed to 0 after hiding old toolbar | P0 | RESOLVED_LOOP_16 | B_PLAN_PUZZLE_REPAIR_COMMANDER |
| Path-mode draw wall / opening / furniture / export smoke | P0 | VERIFIED_LOOP_16 | B_PLAN_PUZZLE_REPAIR_COMMANDER |
| Candidate JSON boundary remains non-production | P0 | VERIFIED_LOOP_16 | Data Guard |

## Loop 18 Guarded Status

| Item | Severity | Status | Owner |
|---|---|---|---|
| Professional path layout: top file / left tools / center canvas / right status | P1 | RESOLVED_LOOP_18 | B_PLAN_PUZZLE_REPAIR_COMMANDER |
| Compact icon rail and reduced icon/label sizing | P1 | VERIFIED_LOOP_18 | B_PLAN_PUZZLE_REPAIR_COMMANDER |
| Sticky file area keeps Candidate JSON clickable after work | P1 | VERIFIED_LOOP_18 | B_PLAN_PUZZLE_REPAIR_COMMANDER |

## Loop 19 Guarded Status

| Item | Severity | Status | Owner |
|---|---|---|---|
| Selected furniture inspector dimensions commit reliably after multi-digit typing | P1 | RESOLVED_LOOP_19 | B_PLAN_PUZZLE_REPAIR_COMMANDER |
| Selected furniture materialTags / note update Candidate JSON preview | P1 | VERIFIED_LOOP_19 | Inspector / Status UX + Material Builder |
| Delete removes selected furniture candidate and layout object | P1 | VERIFIED_LOOP_19 | Furniture / Cabinet Builder |
| Narrow path layout has no horizontal overflow and focus-canvas brings canvas into view | P2 | VERIFIED_LOOP_19 | B_PLAN_PUZZLE_REPAIR_COMMANDER |

## Loop 20 Guarded Status

| Item | Severity | Status | Owner |
|---|---|---|---|
| Selected object must visibly change color on canvas | P1 | RESOLVED_LOOP_20 | B_PLAN_PUZZLE_REPAIR_COMMANDER |
| Wall line endpoints should not look rounded | P1 | RESOLVED_LOOP_20 | B_PLAN_PUZZLE_REPAIR_COMMANDER |
| Wall classification needs human-readable categories and grey/hatch styling | P1 | RESOLVED_LOOP_20 | B_PLAN_PUZZLE_REPAIR_COMMANDER |
| Wall thickness dropdown needs usage explanation | P1 | RESOLVED_LOOP_20 | B_PLAN_PUZZLE_REPAIR_COMMANDER |
| Node / endpoint wording is too technical | P2 | RESOLVED_LOOP_20 | B_PLAN_PUZZLE_REPAIR_COMMANDER |
| Tool detail panel should not push the whole drawing layout down | P1 | RESOLVED_LOOP_20 | B_PLAN_PUZZLE_REPAIR_COMMANDER |
| Candidate JSON must keep wall type while staying non-production | P0 | VERIFIED_LOOP_20 | Data Guard |

## Loop 21 Guarded Status

| Item | Severity | Status | Owner |
|---|---|---|---|
| Visible tool icons show broken `?` glyphs after Material Symbols removal | P1 | RESOLVED_LOOP_21 | B_PLAN_PUZZLE_REPAIR_COMMANDER |
| Visible UI still contains engineering English not understandable by normal users | P1 | RESOLVED_LOOP_21 | B_PLAN_PUZZLE_REPAIR_COMMANDER |
| Preview route wording says `預算生成` on a candidate-only page | P1 | RESOLVED_LOOP_21 | B_PLAN_PUZZLE_REPAIR_COMMANDER |
| Image sandbox copy exposes `Server-side Image API proxy` wording | P2 | RESOLVED_LOOP_21 | B_PLAN_PUZZLE_REPAIR_COMMANDER |
| Chinese UI sweep must not break wall draw / select / export | P0 | VERIFIED_LOOP_21 | Human Operability QA |
| Candidate JSON must remain non-production after UI wording patch | P0 | VERIFIED_LOOP_21 | Data Guard |

## Loop 22 Guarded Status

| Item | Severity | Status | Owner |
|---|---|---|---|
| Sticky header / progress / file area could intercept tool rail clicks after canvas focus | P0 | RESOLVED_LOOP_22 | B_PLAN_PUZZLE_REPAIR_COMMANDER |
| Full import-calibrate-draw-openings-furniture-export path needs current browser evidence | P0 | VERIFIED_LOOP_22 | Human Operability QA |
| Selected wall must show visible blue highlight and square endpoints | P1 | VERIFIED_LOOP_22 | B_PLAN_PUZZLE_REPAIR_COMMANDER |
| Selected opening delete must remove only the selected opening | P1 | VERIFIED_LOOP_22 | Door / Window / Opening Builder |
| Furniture / cabinet candidate must place, drag, resize, edit width/depth/material/note, export, and delete | P1 | VERIFIED_LOOP_22 | Furniture / Cabinet Builder |
| Candidate JSON must keep non-production guard fields | P0 | VERIFIED_LOOP_22 | Data Guard |
| `.pc` production export must remain disabled | P0 | VERIFIED_LOOP_22 | Data Guard |
| Undo / redo controls are not present in this page | P2 | RESOLVED_LOOP_23 | B_PLAN_PUZZLE_REPAIR_COMMANDER |

## Loop 23 Guarded Status

| Item | Severity | Status | Owner |
|---|---|---|---|
| Visible undo / redo command controls are needed for human-operable drawing | P2 | RESOLVED_LOOP_23 | B_PLAN_PUZZLE_REPAIR_COMMANDER |
| Ctrl+Z / Ctrl+Y should restore committed wall / opening actions | P2 | VERIFIED_LOOP_23 | Human Operability QA |
| Furniture delete should be undoable without losing candidate-only guard fields | P2 | VERIFIED_LOOP_23 | Furniture / Cabinet Builder |
| Candidate JSON after undo/redo must include furniture / toolCatalogItems / layoutObjects | P0 | VERIFIED_LOOP_23 | Data Guard |
| `.pc` production export must remain disabled after undo/redo patch | P0 | VERIFIED_LOOP_23 | Data Guard |

## Loop 24 Guarded Status

| Item | Severity | Status | Owner |
|---|---|---|---|
| Opening inspector did not provide an obvious human path back to the attached wall inspector | P1 | RESOLVED_LOOP_24 | B_PLAN_PUZZLE_REPAIR_COMMANDER |
| Selected wall status/type/thickness must update canvas class and exported candidate JSON | P1 | VERIFIED_LOOP_24 | Human Operability QA |
| Demolished wall must block accidental door/window placement | P1 | VERIFIED_LOOP_24 | Door / Window / Opening Builder |
| Delete on a selected wall must remove dependent openings, and Ctrl+Z must restore both | P1 | VERIFIED_LOOP_24 | B_PLAN_PUZZLE_REPAIR_COMMANDER |
| Wall layer visibility toggle must not delete wall candidate data | P1 | VERIFIED_LOOP_24 | Data Guard |
| Candidate JSON must remain non-production after selected-object action patch | P0 | VERIFIED_LOOP_24 | Data Guard |

## Loop 26 Guarded Status

| Item | Severity | Status | Owner |
|---|---|---|---|
| Selected wall feedback was not visually obvious enough for humans | P1 | RESOLVED_LOOP_26 | B_PLAN_PUZZLE_REPAIR_COMMANDER |
| Wall ends must not render with rounded visible caps | P1 | VERIFIED_LOOP_26 | Human Operability QA |
| Wall type and wall thickness copy must match human interior-plan expectations | P1 | RESOLVED_LOOP_26 | B_PLAN_PUZZLE_REPAIR_COMMANDER |
| Node / endpoint wording was too technical for normal users | P2 | RESOLVED_LOOP_26 | B_PLAN_PUZZLE_REPAIR_COMMANDER |
| Tool detail settings must not stretch the drawing board | P1 | VERIFIED_LOOP_26 | Human Operability QA |
| Path workbench must fit tool / canvas / status in one viewport with file area on top | P1 | VERIFIED_LOOP_26 | Human Operability QA |
| Selected wall card should not expose raw wall / edge IDs to normal users | P2 | RESOLVED_LOOP_26 | B_PLAN_PUZZLE_REPAIR_COMMANDER |
| Candidate-only guard must remain unchanged after UI polish | P0 | VERIFIED_LOOP_26 | Data Guard |

## Loop 28 Guarded Status

| Item | Severity | Status | Owner |
|---|---|---|---|
| Tool icons looked like cheap large Chinese text tiles instead of app-like pictorial icons | P1 | RESOLVED_LOOP_28 | B_PLAN_PUZZLE_REPAIR_COMMANDER |
| Activity furniture such as TV / sofa should be collapsed into one human-readable furniture entry | P1 | RESOLVED_LOOP_28 | B_PLAN_PUZZLE_REPAIR_COMMANDER |
| Non-core future furniture package / .pc actions polluted primary drawing tools | P1 | RESOLVED_LOOP_28 | B_PLAN_PUZZLE_REPAIR_COMMANDER |
| `放置選取項目` wording was not understandable to normal users | P1 | RESOLVED_LOOP_28 | B_PLAN_PUZZLE_REPAIR_COMMANDER |
| Delete needed to be an important standalone action, not only a furniture-specific card | P1 | RESOLVED_LOOP_28 | B_PLAN_PUZZLE_REPAIR_COMMANDER |
| Scale status should be system-first auto detection rather than manual-only wording | P1 | PARTIAL_LOOP_28 | B_PLAN_PUZZLE_REPAIR_COMMANDER |
| Right inspector still needs PPT-like 5-tab property panel simplification | P1 | OPEN_LOOP_29 | Inspector / Status UX + Material Builder |
| Candidate-only guard must remain unchanged after UI icon/grouping patch | P0 | VERIFIED_LOOP_28 | Data Guard |

## Loop 29 Guarded Status

| Item | Severity | Status | Owner |
|---|---|---|---|
| Right inspector was too report-like and needed selected-object-first PPT-style tabs | P1 | RESOLVED_LOOP_29 | Inspector / Status UX + Material Builder |
| Right inspector tabs must be clickable and switch visible content | P1 | VERIFIED_LOOP_29 | Human Operability QA |
| Reminder panel should read like a todo checklist, not a report wall | P2 | VERIFIED_LOOP_29 | B_PLAN_PUZZLE_REPAIR_COMMANDER |
| Material panel must expose candidate material choices without budget handoff | P1 | VERIFIED_LOOP_29 | Data Guard |
| Overview must preserve candidate-only / no formal estimate boundary | P0 | VERIFIED_LOOP_29 | Data Guard |
| Actual dimension-line auto recognition remains unimplemented | P1 | OPEN_LOOP_30_OR_SEPARATE_AUTOSCALE | B_PLAN_PUZZLE_REPAIR_COMMANDER |

## Loop 30 Guarded Status

| Item | Severity | Status | Owner |
|---|---|---|---|
| Calibration controls became hard to reach after inspector tab rewrite | P0 | RESOLVED_LOOP_30 | B_PLAN_PUZZLE_REPAIR_COMMANDER |
| Selected object property fields became hard to reach after object creation / selection | P0 | RESOLVED_LOOP_30 | B_PLAN_PUZZLE_REPAIR_COMMANDER |
| Full import / scale / wall / door / window / opening / furniture / material / export regression after Loop 28 and Loop 29 | P0 | VERIFIED_LOOP_30 | Human Operability QA |
| Candidate-only JSON guard after full regression | P0 | VERIFIED_LOOP_30 | Data Guard |
| `.pc` production export disabled boundary after full regression | P0 | VERIFIED_LOOP_30 | Data Guard |
| Console errors after full regression | P0 | VERIFIED_ZERO_LOOP_30 | Human Operability QA |
| Actual dimension-line OCR / image scale auto-detection | P1 | OPEN_LOOP_31_AUTOSCALE | B_PLAN_PUZZLE_REPAIR_COMMANDER |

## Loop 31 Guarded Status

| Item | Severity | Status | Owner |
|---|---|---|---|
| Auto scale was only UI wording and did not create a runtime suggestion | P1 | RESOLVED_LOOP_31 | B_PLAN_PUZZLE_REPAIR_COMMANDER |
| File-name dimension clue should produce a guarded scale suggestion | P1 | VERIFIED_LOOP_31 | Human Operability QA |
| One-click apply should calibrate scale and preserve manual fallback | P1 | VERIFIED_LOOP_31 | Human Operability QA |
| Wall / door / candidate export must still work after auto-scale apply | P0 | VERIFIED_LOOP_31 | Human Operability QA |
| Candidate-only JSON guard after auto-scale apply | P0 | VERIFIED_LOOP_31 | Data Guard |
| True OCR / dimension-line visual detection | P1 | OPEN_SEPARATE_OCR_AUTOSCALE | B_PLAN_PUZZLE_REPAIR_COMMANDER |

## Loop 32 Guarded Status

| Item | Severity | Status | Owner |
|---|---|---|---|
| Browser-visible auto-scale Chinese labels must not show mojibake | P1 | VERIFIED_LOOP_32 | Human Operability QA |
| Candidate JSON auto-scale source label must remain readable Chinese | P1 | VERIFIED_LOOP_32 | Data Guard |
| PowerShell display mojibake should not be treated as runtime defect | P2 | TOOLING_DISPLAY_ARTIFACT_LOOP_32 | B_PLAN_PUZZLE_REPAIR_COMMANDER |
| Candidate-only JSON guard after text encoding audit | P0 | VERIFIED_LOOP_32 | Data Guard |
| True OCR / dimension-line visual detection | P1 | OPEN_SEPARATE_OCR_AUTOSCALE | B_PLAN_PUZZLE_REPAIR_COMMANDER |

## Loop 34 Guarded Status

| Item | Severity | Status | Owner |
|---|---|---|---|
| Current visible enabled actions need coverage map after Loops 28-33 | P1 | VERIFIED_LOOP_34 | B_PLAN_PUZZLE_REPAIR_COMMANDER |
| `choose-file` button path must open file chooser | P1 | VERIFIED_LOOP_34 | Human Operability QA |
| `start-place-furniture` button path must create an exported candidate object | P1 | VERIFIED_LOOP_34 | Furniture / Cabinet Builder |
| Candidate JSON downloaded from focused smoke must contain furniture / layoutObjects / toolCatalogItems | P0 | VERIFIED_LOOP_34 | Data Guard |
| `.pc` production export must remain disabled after focused enabled-action smoke | P0 | VERIFIED_LOOP_34 | Data Guard |
| Stale harness selectors should not be treated as product defects | P2 | TOOLING_SELECTOR_ARTIFACT_LOOP_34 | B_PLAN_PUZZLE_REPAIR_COMMANDER |

## Loop 35 Guarded Status

| Item | Severity | Status | Owner |
|---|---|---|---|
| Populated-state wall / door / window / furniture / inspector / export regression | P1 | VERIFIED_LOOP_35 | Human Operability QA |
| All five inspector tabs must be activatable after object creation | P1 | VERIFIED_LOOP_35 | Inspector / Status UX + Material Builder |
| Candidate JSON must include wall, door, window, furniture, layoutObjects, toolCatalogItems | P0 | VERIFIED_LOOP_35 | Data Guard |
| `.pc` production export must remain disabled after populated-state regression | P0 | VERIFIED_LOOP_35 | Data Guard |
| DOM opening count differed from exported opening count after door/window smoke | P2 | OPEN_LOOP_36_READ_ONLY_AUDIT | B_PLAN_PUZZLE_REPAIR_COMMANDER |

## Loop 36 Guarded Status

| Item | Severity | Status | Owner |
|---|---|---|---|
| DOM opening count differed from exported opening count after door/window smoke | P2 | RESOLVED_EXPECTED_WINDOW_DOUBLE_LINE_LOOP_36 | B_PLAN_PUZZLE_REPAIR_COMMANDER |
| Window symbol uses two visible SVG lines while export contains one window candidate | P2 | VERIFIED_LOOP_36 | Human Operability QA |
| Door/window export candidate count remains data-accurate | P0 | VERIFIED_LOOP_36 | Data Guard |
| Runtime patch required for DOM/export mismatch | P2 | NO_PATCH_REQUIRED_LOOP_36 | B_PLAN_PUZZLE_REPAIR_COMMANDER |

## Loop 39 Guarded Status

| Item | Severity | Status | Owner |
|---|---|---|---|
| Layer toggle status message mixed Chinese and English (`layer shown/hidden`) | P1 | RESOLVED_LOOP_39 | B_PLAN_PUZZLE_REPAIR_COMMANDER |
| Wall / opening / furniture layer hide-show should not delete candidate data | P1 | VERIFIED_LOOP_39 | Human Operability QA |
| Candidate JSON must retain walls / openings / furniture after layer visibility toggles | P0 | VERIFIED_LOOP_39 | Data Guard |
| `.pc` production export must remain disabled after layer visibility regression | P0 | VERIFIED_LOOP_39 | Data Guard |

## Loop 40 Guarded Status

| Item | Severity | Status | Owner |
|---|---|---|---|
| Undo / redo after layer visibility toggle must restore visual state | P1 | VERIFIED_LOOP_40 | Human Operability QA |
| Layer visibility history text must remain Chinese-only | P1 | VERIFIED_LOOP_40 | B_PLAN_PUZZLE_REPAIR_COMMANDER |
| Candidate JSON must retain wall data after layer undo / redo | P0 | VERIFIED_LOOP_40 | Data Guard |
| `.pc` production export must remain disabled after layer undo / redo regression | P0 | VERIFIED_LOOP_40 | Data Guard |

## Loop 41 Guarded Status

| Item | Severity | Status | Owner |
|---|---|---|---|
| Desktop inspector tabs stretched into large vertical buttons | P1 | RESOLVED_LOOP_41 | B_PLAN_PUZZLE_REPAIR_COMMANDER |
| Mobile canvas overflowed its shell and could overlap lower panels after jump | P1 | RESOLVED_LOOP_41 | B_PLAN_PUZZLE_REPAIR_COMMANDER |
| Desktop one-screen drawing board must remain usable after layout patch | P1 | VERIFIED_LOOP_41 | Human Operability QA |
| PPT-like smoke must preserve blank draft / wall / door / furniture / material / export loop | P0 | VERIFIED_LOOP_41 | Human Operability QA |
| Candidate JSON must remain draft-only after Loop 41 | P0 | VERIFIED_LOOP_41 | Data Guard |
| `.pc` production export must remain disabled after Loop 41 | P0 | VERIFIED_LOOP_41 | Data Guard |
| True OCR / image dimension-line scale detection | P1 | OPEN_SEPARATE_OCR_AUTOSCALE | B_PLAN_PUZZLE_REPAIR_COMMANDER |
| SVG furniture package runtime include | P1 | BLOCKED_PENDING_REVIEWER_COMMANDER_ACCEPTANCE | B_PLAN_PUZZLE_REPAIR_COMMANDER |
## Loop 42 Closed / New Follow-up

| ID | Severity | Status | Owner | Evidence | Decision |
|---|---|---|---|---|---|
| LOOP42-UI-001 | P1 | CLOSED | B_PLAN_PUZZLE_REPAIR_COMMANDER | `PLAN_PUZZLE_TARGET_LOOP_42_DIRECT_MANIPULATION_AFFORDANCE_AUDIT.md` | Static tool cards no longer use `is-active` as availability; `is-ready` and `is-mode-active` are separated. |
| LOOP42-ENC-001 | P0 | CLOSED_VISIBLE_UI | B_PLAN_PUZZLE_REPAIR_COMMANDER | `PLAN_PUZZLE_TARGET_LOOP_42_VISIBLE_CHINESE_UI_POST_PATCH.png` | Visible `code.html` shell restored to Chinese and corrupted legacy body removed. |
| LOOP43-ENC-001 | P1 | CLOSED_NO_PATCH_REQUIRED | B_PLAN_PUZZLE_REPAIR_COMMANDER | `PLAN_PUZZLE_TARGET_LOOP_43_DYNAMIC_TEXT_SWEEP.md` | Dynamic helper / inspector / tab / undo-redo / export text sweep covered 17 states; failed captures 0; no runtime patch required. |
| LOOP44-AFFORDANCE-001 | P1 | CLOSED_VERIFIED | B_PLAN_PUZZLE_REPAIR_COMMANDER | `PLAN_PUZZLE_PPT_LIKE_USABILITY_AUDIT.md` | Selected-object highlight, drag / resize handles, Delete key, inspector sync, and candidate export passed in System Chrome. |
| LOOP44-FURNITURE-INPUT-001 | P1 | CLOSED_PATCHED | Furniture / Cabinet Builder | `PLAN_PUZZLE_TARGET_LOOP_44_SELECTED_OBJECT_AFFORDANCE_RESULT.json` | Furniture numeric fields now update candidate data without rebuilding the right-side form mid-edit. |
| LOOP44-OPENING-INPUT-001 | P1 | CLOSED_PATCHED | Door / Window / Opening Builder | `PLAN_PUZZLE_TARGET_LOOP_44_SELECTED_OBJECT_AFFORDANCE_RESULT.json` | Opening numeric fields now update candidate data without rebuilding the right-side form mid-edit. |
| LOOP45-TOOLBAR-HIERARCHY-001 | P1 | CLOSED_PATCHED | B_PLAN_PUZZLE_REPAIR_COMMANDER | `PLAN_PUZZLE_TARGET_LOOP_45_TOOLBAR_HIERARCHY_POLISH.md` | Replaced unclear `開始放置` / selected-item wording with `加入圖面`, verified hierarchy and functional regression. |
| LOOP46-IMPORT-AUTOSCALE-001 | P1 | CLOSED_PATCHED | B_PLAN_PUZZLE_REPAIR_COMMANDER | `PLAN_PUZZLE_TARGET_LOOP_46_IMPORT_AUTOSCALE_GUIDANCE.md` | Import labels now state `PDF先轉圖`; auto-scale guidance now states filename clue or two-point calibration. |
| LOOP46-PDF-DIRECT-001 | P2 | OPEN_SEPARATE_IMPORT_PIPELINE | B_PLAN_PUZZLE_REPAIR_COMMANDER | `PLAN_PUZZLE_TARGET_LOOP_46_POSTPATCH_PDF.png` | PDF direct preview / calibration remains intentionally unsupported and must not be treated as completed. |
| LOOP46-OCR-AUTOSCALE-001 | P2 | OPEN_SEPARATE_OCR_AUTOSCALE | B_PLAN_PUZZLE_REPAIR_COMMANDER | `PLAN_PUZZLE_TARGET_LOOP_46_IMPORT_AUTOSCALE_GUIDANCE.md` | True OCR / visual dimension-line recognition remains out of scope; current helper only uses filename dimension clues. |
| LOOP47-FULL-REGRESSION-001 | P0 | CLOSED_VERIFIED | B_PLAN_PUZZLE_REPAIR_COMMANDER | `PLAN_PUZZLE_TARGET_LOOP_47_FULL_HUMAN_OPERABLE_REGRESSION.md` | Full human-operable regression passed: import, scale, wall, door/window/opening, furniture placement/drag/resize, inspector edit, material, candidate export, `.pc` disabled. |
| LOOP47-HARNESS-ENCODING-001 | P2 | TOOLING_SELECTOR_ARTIFACT_LOOP_47 | B_PLAN_PUZZLE_REPAIR_COMMANDER | `PLAN_PUZZLE_TARGET_LOOP_47_FULL_REGRESSION_R5_CORRECTED_RESULT.json` | Raw R5 result had one PowerShell/stdin Chinese literal false negative on `scaleApply`; corrected evidence preserves raw result and notes DOM `scaleStatus=已確認`. |
| LOOP48-LABEL-001 | P1 | CLOSED_PATCHED | B_PLAN_PUZZLE_REPAIR_COMMANDER | `PLAN_PUZZLE_TARGET_LOOP_48_UX_POLISH_TRIAGE.md` | Canvas furniture / fixture label no longer exposes raw English type slug; visible label is `馬桶 / 420 x 700 mm` while candidate JSON keeps machine-readable `type: toilet`. |

## Loop 49 Guarded Status

| ID | Severity | Status | Owner | Evidence | Decision |
|---|---|---|---|---|---|
| LOOP49-SMALL-VIEWPORT-RESIZE-001 | P1 | CLOSED_PATCHED | B_PLAN_PUZZLE_REPAIR_COMMANDER | `PLAN_PUZZLE_TARGET_LOOP_49_SMALL_VIEWPORT_OPERABILITY.md` | At 1280 x 620 the default wardrobe was larger than the visible canvas window and the corner resize handle could land under the inspector. Added an inside resize handle and verified bbox resize `905 x 302` -> `1085 x 421`, console `0`, candidate guard PASS. |

## Loop 50 Guarded Status

| ID | Severity | Status | Owner | Evidence | Decision |
|---|---|---|---|---|---|
| LOOP50-NARROW-STICKY-INSPECTOR-001 | P1 | CLOSED_PATCHED | B_PLAN_PUZZLE_REPAIR_COMMANDER | `PLAN_PUZZLE_TARGET_LOOP_50_NARROW_VIEWPORT_OPERABILITY.md` | At 430 x 820 the sticky inspector tabs intercepted the scale suggestion button. Mobile inspector tabs now use normal relative flow at max-width 640px; R3 scale calibration PASS. |
| LOOP50-NARROW-CANVAS-WIDTH-001 | P1 | CLOSED_PATCHED | B_PLAN_PUZZLE_REPAIR_COMMANDER | `PLAN_PUZZLE_TARGET_LOOP_50_NARROW_VIEWPORT_OPERABILITY.md` | Narrow canvas width prevented drawing a wall long enough for default door/window/opening widths. Mobile canvas shell now scrolls horizontally with canvas min-width 760px; R3 exported openings `3`. |

## Loop 51 Guarded Status

| ID | Severity | Status | Owner | Evidence | Decision |
|---|---|---|---|---|---|
| LOOP51-R1-R2-HARNESS-001 | P2 | TOOLING_SETUP_ARTIFACT | B_PLAN_PUZZLE_REPAIR_COMMANDER | `PLAN_PUZZLE_TARGET_LOOP_51_DELETE_UNDO_REDO_REGRESSION.md` | R1/R2 were not accepted as product verdicts because setup or Playwright SVG line actionability blocked the harness before a valid delete regression could run. |
| LOOP51-PNG-SHORT-WALL-001 | P2 | TEST_GEOMETRY_LIMITATION_NOT_RUNTIME_DEFECT | B_PLAN_PUZZLE_REPAIR_COMMANDER | `PLAN_PUZZLE_TARGET_LOOP_51_DELETE_UNDO_REDO_R3_RESULT.json` | R3 drew a wall too short for three default openings on the imported PNG scale; hit-target diagnosis confirmed wall/opening hit targets are real pointer targets. |
| LOOP51-DELETE-UNDO-REDO-001 | P0 | CLOSED_VERIFIED | B_PLAN_PUZZLE_REPAIR_COMMANDER | `PLAN_PUZZLE_TARGET_LOOP_51_DELETE_UNDO_REDO_R4_RESULT.json` | On blank-mm-draft, furniture, opening, and wall Delete / Ctrl+Z / Ctrl+Y / restore all passed; wall delete removed dependent openings and undo restored them. |
| LOOP51-GUARD-001 | P0 | VERIFIED_LOOP_51 | Data Guard | `PLAN_PUZZLE_TARGET_LOOP_51_DELETE_UNDO_REDO_R4_FINAL_EXPORT.json` | Candidate-only boundary remained intact: no Budget Engine call, no formal estimate, `.pc` production export disabled, furniture `productionReady=false` and `notFormalEstimate=true`. |

## Loop 52 Guarded Status

| ID | Severity | Status | Owner | Evidence | Decision |
|---|---|---|---|---|---|
| LOOP52-CLASSIFICATION-001 | P0 | CLOSED_VERIFIED | B_PLAN_PUZZLE_REPAIR_COMMANDER | `PLAN_PUZZLE_TARGET_LOOP_52_CLASSIFICATION_LAYER_PERSISTENCE_CORRECTED_RESULT.json` | Selected wall status/type/thickness, opening offset/width/swing, and furniture size/material/note persisted into candidate JSON. |
| LOOP52-HARNESS-FIELD-001 | P2 | TOOLING_FIELD_NAME_ARTIFACT | B_PLAN_PUZZLE_REPAIR_COMMANDER | `PLAN_PUZZLE_TARGET_LOOP_52_CLASSIFICATION_LAYER_PERSISTENCE_RESULT.json` | Raw result checked `layout_objects`, while runtime export uses `layoutObjects`; corrected result confirms `layoutObjects.length = 1` and no runtime patch was required. |
| LOOP52-GUARD-001 | P0 | VERIFIED_LOOP_52 | Data Guard | `PLAN_PUZZLE_TARGET_LOOP_52_CLASSIFICATION_LAYER_PERSISTENCE_EXPORT.json` | Candidate boundary remained intact: no Budget Engine call, no formal estimate, `.pc` production export disabled, furniture/layoutObject `productionReady=false` and `notFormalEstimate=true`. |

## Loop 53 Guarded Status

| ID | Severity | Status | Owner | Evidence | Decision |
|---|---|---|---|---|---|
| LOOP53-LAYER-VISIBILITY-001 | P0 | CLOSED_VERIFIED | B_PLAN_PUZZLE_REPAIR_COMMANDER | `PLAN_PUZZLE_TARGET_LOOP_53_LAYER_VISIBILITY_REGRESSION_RESULT.json` | Wall/opening/furniture layer hide/show affected visibility only; hidden and restored exports retained wall/opening/furniture/layoutObjects data. |
| LOOP53-GUARD-001 | P0 | VERIFIED_LOOP_53 | Data Guard | `PLAN_PUZZLE_TARGET_LOOP_53_LAYER_VISIBILITY_RESTORED_EXPORT.json` | Candidate boundary remained intact: no Budget Engine call, no formal estimate, `.pc` production export disabled, furniture/layoutObject `productionReady=false` and `notFormalEstimate=true`. |

## Loop 54 Closeout Matrix Status

| ID | Severity | Status | Owner | Evidence | Decision |
|---|---|---|---|---|---|
| LOOP54-COMPLETION-MATRIX-001 | P0 | READY_FOR_REVIEWER_SCOPE_AUDIT | B_PLAN_PUZZLE_REPAIR_COMMANDER | `PLAN_PUZZLE_TARGET_LOOP_54_COMPLETION_MATRIX_REFRESH.md` | Core candidate drafting functions are mapped to browser evidence; remaining placeholders are separated and not claimed complete. |
| LOOP54-PLACEHOLDER-BOUNDARY-001 | P0 | GUARD_ACTIVE | B_PLAN_PUZZLE_REPAIR_COMMANDER | `PLAN_PUZZLE_TARGET_LOOP_54_COMPLETION_MATRIX_REFRESH.md` | OCR scale recognition, direct PDF preview/calibration, SVG furniture runtime include, formal `.pc`, Budget Engine, AI/API/DB/payment remain excluded or blocked. |
