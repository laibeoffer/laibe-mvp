# Plan Puzzle Target Loop 20 - Chinese Intuitive Wall Selection Repair

datetime: 2026-06-13 14:58:05 +08:00

role: B_PLAN_PUZZLE_REPAIR_COMMANDER

worktree: Z:\08-Jacky\laibe_MVP_project\_codex_worktrees\laibe_project\plan-puzzle-test-repair-worktree-20260611

branch: codex/plan-puzzle-test-repair-worktree-20260611

validationUrl: http://127.0.0.1:50362/src/stitch_laibe_landing_onboarding/preview_floor_plan/code.html?validation=loop20-chinese-intuitive-wall-selection

## User Request

修正平面拼圖的人類可操作性：

- 全中文、直覺介面。
- 選取物件必須在畫布上明顯變色。
- 牆線端點不要圓弧狀。
- 牆體分類需能區分既有牆、承重牆 / 分戶牆、輕隔間、木隔間、分間實牆。
- 牆厚下拉需要人類可讀說明，例如 `240mm　分間牆、承重牆`。
- 「整理結點」類文字需改成人能理解的「牆端接合」語意。
- 詳細設定不得常駐撐高工具區；需在工具 hover / focus 時展開。
- 主繪圖區需維持一屏式路徑版面。

## Files Updated

| File | Scope | Status |
|---|---|---|
| src/stitch_laibe_landing_onboarding/preview_floor_plan/code.html | UI copy / CSS layout / selection visual / wall line style | UPDATED |
| src/stitch_laibe_landing_onboarding/preview_floor_plan/plan-puzzle.js | wallType data model / inspector controls / export fields / Chinese copy | UPDATED |

## Repair Summary

| Item | Change | Result |
|---|---|---|
| Select feedback | Selected wall stroke changes to `#00B7FF`; selected opening/furniture also use high-contrast blue state | PASS |
| Wall endpoints | Visible wall line uses `stroke-linecap: butt` and `stroke-linejoin: miter` | PASS |
| Wall classification | Added `wallType` with `existing_wall`, `bearing_wall`, `light_partition`, `wood_partition`, `solid_partition` | PASS |
| Wall style | Existing/bearing uses `#3C3C3C`; solid partition uses `#5B5B5B`; light/wood partition use SVG hatch pattern based on `#8E8E8E` | PASS |
| Wall thickness descriptions | Current and selected wall thickness options show human labels from 80mm to 240mm | PASS |
| Selected wall inspector | Shows wall status, wall type, type detail, thickness select, structure checkbox, delete, add door/window, auto-align wall ends | PASS |
| Node wording | Reworded node/geometry cards to `牆端接合檢查` and `牆線接點` | PASS |
| Tool detail panel | Left tool settings are `display:none` by default and open as absolute panel on hover/focus | PASS |
| Visible English cleanup | Removed visible `hatch`, `current`, `next`, `app`, `Drag corner to resize`, and old `整理端點` copy from human-facing paths | PASS_WITH_BOUNDARY |

Boundary note: product/format/guard terms such as `Plancraft+`, `.pc`, `JPG / PNG / PDF`, `JSON`, and `Budget Engine` remain where they identify a product, file format, or non-production guard. Candidate JSON preview intentionally displays raw schema keys.

## Browser Functional Evidence

| Step | Expected | Actual | Status | Evidence |
|---|---|---|---|---|
| Page load | Page loads from local validation URL | `pageLoaded: true` | PASS | in-app Browser |
| Console | No blocking console errors/warnings | `logsFinal20b: []` | PASS | Browser dev logs |
| Initial tool detail panel | Wall tool settings do not expand by default | `toolPanelDefaultDisplay: "none"` | PASS | CSS computed state |
| Focus expansion | Clicking wall tool opens settings as overlay | `display: "grid"`, `position: "absolute"`, rect `300 x 273` | PASS | Browser DOM/CSS |
| Chinese options | Wall type/thickness options are human-readable Chinese | `輕隔間 / 雙斜線剖線`, `240mm　分間牆、承重牆` | PASS | Browser DOM |
| Draw wall | Wall tool creates a wall in blank mm draft | `wallLineCount: 1` | PASS | Browser click smoke |
| Selected color | Selected wall visibly changes color | `selectedStroke: "rgb(0, 183, 255)"` | PASS | Browser computed style |
| Square wall ends | Wall ends are not rounded | `selectedLinecap: "butt"` | PASS | Browser computed style |
| Wall type class | Selected wall carries classification | `lineClass: "wall-line wall-existing wall-type-light_partition is-selected"` | PASS | Browser DOM |
| Export wall type | Candidate JSON includes wall type | `wallTypeExport: "light_partition"` | PASS | Candidate JSON preview |
| Export wall thickness | Candidate JSON includes selected thickness | `wallThicknessExport: 240` | PASS | Candidate JSON preview |
| Guard boundary | Candidate JSON remains non-production | `budgetEngineCalled=false`, `formalEstimate=false`, `productionReady=false` | PASS | Candidate JSON preview |
| Old wording | Old unclear copy removed from visible text | `oldEndpointVisible=false`, `hatchVisible=false` | PASS | Browser DOM |

Final browser smoke object:

```json
{
  "pageLoaded": true,
  "wallLineCount": 1,
  "selectedStroke": "rgb(0, 183, 255)",
  "selectedLinecap": "butt",
  "lineClass": "wall-line wall-existing wall-type-light_partition is-selected",
  "wallTypeDataset": "light_partition",
  "wallThicknessExport": 240,
  "wallTypeExport": "light_partition",
  "candidateBoundary": {
    "budgetEngineCalled": false,
    "formalEstimate": false,
    "productionReady": false
  },
  "oldEndpointVisible": false,
  "hatchVisible": false,
  "toolPanelDefaultDisplay": "none"
}
```

## Guard Check

| Guard | Result |
|---|---|
| Plancraft core touched | NO |
| budget runtime touched | NO |
| Budget Engine called | NO |
| PricingRule / BudgetEstimateLine touched | NO |
| formalEstimateGuard changed | NO |
| DB / payment / AI API / LINE / n8n touched | NO |
| package.json / node_modules added | NO |
| git add / stage / push / merge / deploy | NO |

## Result

LOOP_20_CHINESE_INTUITIVE_WALL_SELECTION_REPAIR_PASS_WITH_NOTES

Notes:

- Selection feedback, wall endpoint style, wall type classification, wall thickness descriptions, and human-readable endpoint wording are verified.
- Tool details are now hidden by default and can expand without pushing the drawing workbench down.
- Candidate JSON remains draft-only and is not a production quantity source.

## Next Automatic Task

Plan Puzzle Loop 21 - Full Chinese Visible UI Sweep and Human Tool Naming Polish

