# Plan Puzzle Target Loop 29 - PPT-like Inspector Tabs

## 1. Scope

- task: compact right-side inspector into PPT-like property tabs
- date: 2026-06-13 Asia/Taipei
- changed runtime files:
  - `src/stitch_laibe_landing_onboarding/preview_floor_plan/code.html`
  - `src/stitch_laibe_landing_onboarding/preview_floor_plan/plan-puzzle.js`

## 2. Implemented

- Right panel heading changed from status framing to property framing:
  - `屬性面板`
  - `選取物件設定`
- Added five right-side tabs:
  - `屬性`
  - `圖層`
  - `提醒`
  - `材料`
  - `總覽`
- Default tab is `屬性`.
- No-selection state now tells the user to select a wall, opening, zone, furniture, or cabinet.
- Reminder tab uses compact checklist format.
- Material tab exposes candidate material selection without sending anything to budget.
- Overview tab keeps candidate-only boundary visible.

## 3. Browser Evidence

- validation URL: `http://127.0.0.1:50362/src/stitch_laibe_landing_onboarding/preview_floor_plan/code.html?validation=loop29-inspector-tabs-content-read`
- screenshot: `docs/plan_puzzle_repair/PLAN_PUZZLE_TARGET_LOOP_29_INSPECTOR_TABS_CHROME_SMOKE.png`
- browser engine: local Chrome via bundled Playwright
- console error count: 0
- console warning count: 0

| Tab | Click Result | Content Evidence | Status |
|---|---|---|---|
| 屬性 | active tab becomes `屬性` | no-selection instruction shown | PASS |
| 圖層 | active tab becomes `圖層` | layer toggles listed | PASS |
| 提醒 | active tab becomes `提醒` | checklist items begin with `□` | PASS |
| 材料 | active tab becomes `材料` | material select and apply action shown | PASS_WITH_NOTES |
| 總覽 | active tab becomes `總覽` | import / scale / walls / openings / candidates / guard boundary shown | PASS_WITH_NOTES |

## 4. Remaining Notes

- The overview tab still includes advanced diagnostic details farther down because those details already exist as collapsed `<details>` panels. This is acceptable for now, but the next polish can move diagnostics behind an even smaller `進階` disclosure.
- Actual automatic dimension-line recognition is not implemented; scale remains `待自動偵測` until an imported image is analyzed or manually confirmed.

## 5. Guard Check

- Plancraft core touched: NO
- `plancraft/` touched: NO
- budget runtime touched: NO
- `formalEstimateGuard` changed: NO
- Budget Engine called: NO
- DB / payment / AI API / LINE / n8n touched: NO
- package.json / node_modules touched: NO
- git add / stage / push / merge / reset / clean: NO

## 6. Result

`LOOP_29_PPT_LIKE_INSPECTOR_TABS_PASS_WITH_NOTES`

## 7. NEXT_PLAN_PUZZLE_TASK_DEMAND

Loop 30: Rerun full human-operable drawing regression after the PPT-like tool and inspector repairs: import / scale / wall / select / delete / door / window / opening / furniture place-drag-resize / material / JSON export / `.pc` disabled boundary.
