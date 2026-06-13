# Plan Puzzle Target Loop 26 - Intuitive Selection / Wall / Path Workbench Polish

## Result

LOOP_26_INTUITIVE_SELECTION_WALL_POLISH_PASS_WITH_NOTES

## Scope

User request:
- 選取物件必須明顯變色。
- 牆線端點不要圓弧狀，牆體需以灰階與剖線區分。
- 牆厚下拉選單需顯示人類可理解的說明。
- 「整理結點」類文案需改成使用者能懂的牆端 / 接點語言。
- 詳細設定應在滑鼠靠近工具時才展開，不得把繪圖版面撐長。
- 平面拼圖版面需剛好充滿畫面，頂部為檔案區，左至右為工具區、畫布、狀態區。
- 介面需維持中文、直覺、專業。

## Runtime Patch

Changed files:
- `src/stitch_laibe_landing_onboarding/preview_floor_plan/code.html`
- `src/stitch_laibe_landing_onboarding/preview_floor_plan/plan-puzzle.js`

Patch summary:
- Enabled `path-workbench` mode so the tool page hides general site header, progress banner, and candidate banner; file area is now the top-most workbench band.
- Kept left-to-right workbench layout as tool rail / canvas / status panel.
- Reduced tool rail density and icon size for a CAD-like compact workbench.
- Kept detailed tool settings as hover/focus flyout; verified it does not push layout height.
- Strengthened selected wall feedback with blue selected wall plus yellow selected outline.
- Kept wall line caps as `butt` and joins as `miter`.
- Kept wall categories as grey-scale and hatch patterns:
  - 既有牆: `#3C3C3C`
  - 承重牆 / 分戶牆: `#3C3C3C`
  - 輕隔間: `#8E8E8E` with double diagonal hatch
  - 木隔間: `#8E8E8E` with diagonal hatch
  - 分間實牆: `#5B5B5B`
- Added wall thickness help text in the wall tool setting and selected wall inspector.
- Replaced visible raw wall / edge IDs in the selected wall card with human-readable display names such as `牆體 1` and `已連結`.
- Renamed user-facing node/endpoint language toward `接齊牆端`, `接點`, and `進階檢查`.
- Added top-visible selected furniture material shortcut: `套用目前材質`.

## Browser Evidence

Validation URL:
`http://127.0.0.1:50362/src/stitch_laibe_landing_onboarding/preview_floor_plan/code.html?validation=loop26-final-display-name-polish`

Screenshot:
`docs/plan_puzzle_repair/PLAN_PUZZLE_TARGET_LOOP_26_FINAL_DISPLAY_NAME_POLISH.png`

Additional screenshot:
`docs/plan_puzzle_repair/PLAN_PUZZLE_TARGET_LOOP_26_PATH_WORKBENCH_FINAL.png`

| Check | Expected | Actual | Status |
|---|---|---|---|
| Page load | Page opens in static server | Loaded from `127.0.0.1:50362` | PASS |
| Console errors | 0 blocking errors | console errors `0`, warnings `0`, page errors `0` | PASS |
| Path workbench top | File area is top-most visible band | `.site-header`, `.progress-banner`, `.candidate-banner` display `none`; file area y `10` | PASS |
| One-screen workbench | Tool shell fits viewport | shell bottom `893.34` in 900px viewport | PASS |
| Left-to-right layout | Tool / canvas / status ordering | tool x `13`, canvas x `200.18`, inspector x `1139` | PASS |
| Tool detail panel | Hidden until hover/focus | before hover `none`, after hover `grid` | PASS |
| Selected wall feedback | Selected object visibly changes | wall stroke `rgb(0, 183, 255)`, outline `rgba(255, 218, 87, 0.88)` | PASS |
| Wall end style | No rounded visible wall ends | selected wall `stroke-linecap=butt`, outline `stroke-linecap=butt` | PASS |
| Wall thickness help | Human-readable help visible | contains `承重牆常見 240mm...` | PASS |
| Wall thickness options | Explanation in dropdown | includes `240mm　分間牆、承重牆`, `100mm　木隔間、輕隔間`, `150mm　磚牆、石膏磚牆` | PASS |
| Raw ID leak in selected card | No raw `wall-*` / `edge-wall-*` in human inspector | `leaksRawWallId=false`; displays `牆體 1` / `已連結` | PASS |
| Delete selected wall | Delete removes selected wall | wall count `1 -> 0` | PASS |
| Undo delete | Undo restores wall | wall count `0 -> 1` | PASS |

## Guard Check

- Plancraft core touched: false
- `plancraft/` touched: false
- budget runtime touched: false
- Budget Engine called: false
- PricingRule / BudgetEstimateLine touched: false
- formalEstimateGuard changed: false
- DB / payment / AI API / image API / LINE / n8n touched: false
- package / node_modules added: false
- git add / stage / push / merge / reset / clean: false

## Remaining Notes

- This loop improves human operability and visual clarity. It does not claim production readiness.
- Candidate JSON and `.pc` disabled guard were already verified in earlier loops; this loop did not change export schema.
- Further polish can continue on all furniture / material inspector copy, but the user-named A-D issues are resolved in this scoped loop.

## Next Automatic Task

Target Loop 27 - Human QA pass on furniture/material/status panel wording after path workbench polish.
