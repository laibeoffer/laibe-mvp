# Plan Puzzle Target Loop 21 - Full Chinese Visible UI Sweep

## Result

LOOP_21_FULL_CHINESE_VISIBLE_UI_SWEEP_PASS_WITH_NOTES

## Scope

- Runtime files:
  - `src/stitch_laibe_landing_onboarding/preview_floor_plan/code.html`
  - `src/stitch_laibe_landing_onboarding/preview_floor_plan/plan-puzzle.js`
- Documentation files:
  - `docs/plan_puzzle_repair/PLAN_PUZZLE_TARGET_LOOP_21_FULL_CHINESE_VISIBLE_UI_SWEEP.md`
  - `docs/plan_puzzle_repair/PLAN_PUZZLE_REPAIR_BLACKBOARD.md`
  - `docs/plan_puzzle_repair/PLAN_PUZZLE_TARGET_DRAWING_LOOP_REPORT.md`
  - `docs/plan_puzzle_repair/PLAN_PUZZLE_HUMAN_OPERABLE_BUG_QUEUE.md`

## User Request

使用者要求平面拼圖必須是全中文介面，而且要更直覺。前一輪選取、畫牆、牆厚與詳細設定已完成，Loop 21 針對可見 UI 中剩餘的英文工程詞、圖示亂碼與非直覺預算文案進行最小修補。

## Runtime Patch

| Area | Change | Status |
|---|---|---|
| Material symbol text | Replaced broken `?` icon text with Chinese one-character tool marks such as `圖`, `新`, `尺`, `選`, `牆`, `門`, `窗`, `材` | PASS |
| Top / rail copy | Replaced visible `Budget Engine` with `預算引擎` | PASS |
| Renderer copy | Replaced visible `Renderer / renderer` wording with `渲染器` | PASS |
| Image sandbox copy | Replaced `Server-side Image API proxy 尚未設定` with `圖片示意服務尚未啟用` | PASS |
| AI visible label | Replaced visible `AI 示意圖` with `風格示意圖` | PASS |
| Budget nav wording | Replaced `預算生成` with `預算預覽` where this page only leads to a preview route | PASS |
| PCM nav wording | Replaced `PCM 後台` with `專案管理後台` | PASS |
| Node wording | Replaced visible `節點 / nodeGraph edge` wording with `牆端 / 交點 / 牆段連線` where users need to understand the action | PASS |

## Browser Evidence

Validation URL:

`http://127.0.0.1:50362/src/stitch_laibe_landing_onboarding/preview_floor_plan/code.html?validation=loop21-final-iab-smoke`

Browser method:

- Primary: in-app Browser.
- Note: one attempted click used the hidden canvas toolbar and failed because that toolbar is intentionally hidden in path mode; the final smoke used visible top file controls and left tool rail controls.

| Check | Evidence | Status |
|---|---|---|
| Page load | `pageLoaded: true` | PASS |
| Console errors/warnings | `logs21f: []` | PASS |
| Broken icon text | `iconQuestionCount: 0` | PASS |
| Old Material icon ligatures | `oldIconLigatureVisible: false` in initial scan | PASS |
| Visible English engineering leaks | `englishLeakLines: []` after final export | PASS |
| Tool detail panel | `toolPanelDisplay: "none"` before focus | PASS |
| Draw wall | Wall count became `1`; helper: `已建立 3,520 mm 牆段。` | PASS |
| Selected object feedback | Selected wall line exists and stroke is `rgb(0, 183, 255)` | PASS |
| Wall endpoint shape | Selected line `strokeLinecap: "butt"` | PASS |
| Wall inspector text | Right inspector shows Chinese wall status, category, type details and thickness labels | PASS |
| Candidate JSON preview | Preview visible; wall count `1` | PASS |
| Candidate-only guard | Preview shows `呼叫預算引擎: 否`, `可作正式成果: 否` | PASS |

## Functional Smoke Details

1. Opened the local Plan Puzzle page.
2. Clicked visible top file area `空白毫米草稿`.
3. Clicked visible left tool rail `畫牆`.
4. Clicked two canvas points outside the sticky top area:
   - first point: `{ x: 489, y: 427 }`
   - second point: `{ x: 841, y: 427 }`
5. Confirmed wall helper text changed from first-point prompt to wall-created message.
6. Clicked visible left tool rail `選取模式`.
7. Clicked wall midpoint and confirmed selected wall blue highlight.
8. Clicked visible top file area `匯出候選 JSON`.
9. Confirmed candidate JSON preview contains one wall and remains non-production.

## Guard Check

| Guard | Result |
|---|---|
| Plancraft core touched | false |
| budget runtime touched | false |
| formalEstimateGuard changed | false |
| Budget Engine called | false |
| PricingRule / BudgetEstimateLine touched | false |
| payment / DB / AI API / LINE / n8n touched | false |
| package.json / node_modules added | false |
| git add / stage / push / merge | false |

## Notes

- Format/product names remain as necessary nouns: `JPG`, `PNG`, `PDF`, `JSON`, `.pc`, `Plancraft+`, `DSL`, `SVG`, `CLI`, `LiDAR`, `iScanner`.
- Raw candidate JSON keys remain English schema keys by design; the visible labels around the preview are Chinese and clearly mark the data as candidate-only.
- `download` event was not captured in the final in-app Browser run, but the candidate JSON preview rendered successfully and shows the exported wall data and guard fields.

## Next Automatic Task

Target Loop 22 - Full Human Operability Regression Across Wall / Opening / Furniture / Material / Export After Chinese UI Sweep.
