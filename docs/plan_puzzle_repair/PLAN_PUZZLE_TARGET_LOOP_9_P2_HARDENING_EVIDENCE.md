# Plan Puzzle Target Loop 9 P2 Hardening Evidence

checkedAt: 2026-06-13 11:37:20 +08:00

workstream: Plancraft+ Plan Puzzle Repair

role: B_PLAN_PUZZLE_REPAIR_COMMANDER

worktree: `Z:\08-Jacky\laibe_MVP_project\_codex_worktrees\laibe_project\plan-puzzle-test-repair-worktree-20260611`

validationUrl: `http://127.0.0.1:50362/src/stitch_laibe_landing_onboarding/preview_floor_plan/code.html?validation=delete-key-smoke`

## 1. Scope

Loop 9 closes two P2 human-operability notes from the prior human-usable smoke:

1. Keyboard Delete / Backspace should be hardened for selected objects, especially selected wall.
2. Candidate JSON Preview should not silently remain stale after later edits.

Runtime patch scope:

- `src/stitch_laibe_landing_onboarding/preview_floor_plan/plan-puzzle.js`

No other runtime file was modified by Loop 9.

## 2. Patch Summary

| Patch | Purpose | Result |
|---|---|---|
| `deleteCurrentSelection()` | Centralize non-text-field Delete / Backspace handling for furniture, zone, opening, and wall selection. Prevents Backspace browser navigation when a drawing object is selected or when no object is selected. | PASS |
| Candidate preview `stateSignature` | Records export-time state for walls, openings, zones, and furniture. | PASS |
| Candidate preview `previewStatus` | Displays `current` when the preview matches current drawing state and `stale_after_edits` after later mutations. | PASS |

## 3. CLI Verification

| Check | Result | Evidence |
|---|---|---|
| Syntax check | PASS | `node.exe --check src\stitch_laibe_landing_onboarding\preview_floor_plan\plan-puzzle.js` exited 0 using bundled Node. |
| Diff check | PASS_WITH_CRLF_WARNING | `git diff --check -- src/stitch_laibe_landing_onboarding/preview_floor_plan/plan-puzzle.js` reported only LF-to-CRLF warning. |
| Forbidden call scan | PASS | Scan found boundary wording only; no `fetch(`, `XMLHttpRequest`, `OpenAI`, `generateBudgetEstimate`, `formalEstimateGuard`, payment, escrow, listing fee, Supabase, n8n, LINE, or API key runtime calls. |

## 4. Browser Evidence

Browser: Codex in-app Browser.

Console result: 0 error / warning entries observed in the Loop 9 smoke runs.

### 4.1 Blank Draft / Wall / Delete Key

| Step | Expected | Actual | Status |
|---|---|---|---|
| Reload page | Page loads | HTML and runtime controls loaded; console 0 | PASS |
| Click `Blank mm draft` | Underlay and scale become active | `underlayStatus = 已匯入`, `scaleStatus = 已校正` | PASS |
| Click toolbar `start-draw-wall` | Helper enters wall drawing mode | Helper text: `畫牆模式：請在底圖上點第一個牆端點。` | PASS |
| Click two canvas points | Wall is created | `wallCountStatus 0 -> 1`, `nodeCountStatus 2`, DOM wall count 1, message `已建立 1,410 mm 牆段。` | PASS |
| Press Delete | Selected wall is deleted | `wallCountStatus 1 -> 0`, `nodeCountStatus 0`, DOM wall count 0, console 0 | PASS |

### 4.2 Candidate JSON Preview Current / Stale

| Step | Expected | Actual | Status |
|---|---|---|---|
| Re-draw one wall | One wall exists | `wallCountStatus = 1`, `nodeCountStatus = 2` | PASS |
| Click `export-draft` | Candidate JSON Preview appears and is current | `candidatePreviewVisible = true`, `previewStatus = current`, preview contains `candidateExportBoundary`, `formalEstimate false`, `budgetEngineCalled false`, `productionReady false` | PASS |
| Place furniture after export | Preview marks itself stale | `furnitureDomCount = 1`, message `Placed Wardrobe. Candidate only; no Budget Engine.`, `previewStatus = stale_after_edits`, console 0 | PASS |
| Re-export after furniture mutation | Preview returns current and includes furniture context | `previewStatus = current`, `furniture = 1`, `toolCatalogItems = 10`, `layoutObjects = 1`, `materialTags = present` | PASS |

### 4.3 Opening Tools Fresh Smoke

Window and generic opening were re-tested in separate fresh sessions to avoid selection-state contamination from an existing door.

| Tool | Expected | Actual | Status |
|---|---|---|---|
| Window-first smoke | Selected wall accepts a window | Fresh wall: `wallCountStatus = 1`; after click: message `已新增 window。`, `openingDomCount 0 -> 1`, console 0 | PASS |
| Opening-first smoke | Selected wall accepts a generic opening | Fresh wall: `wallCountStatus = 1`; after click: message `已新增 opening。`, `openingDomCount 0 -> 1`, console 0 | PASS |
| Door smoke | Selected wall accepts a door | Existing Loop 9 run: message `已新增 door。`, `openingDomCount 0 -> 1`, console 0 | PASS |

## 5. Guard Check

| Guard | Result |
|---|---|
| Plancraft core touched | No |
| `plancraft/` modified | No |
| Budget runtime touched | No |
| `formalEstimateGuard` changed | No |
| Budget Engine called | No |
| `PricingRule` / `BudgetEstimateLine` touched | No |
| DB / payment / escrow / listing fee touched | No |
| AI / image API / LINE / n8n touched | No |
| package / node_modules added | No |
| `.pc` production export enabled | No |
| SVG furniture package runtime include | No |

## 6. Decision

decision: `LOOP_9_P2_HARDENING_BROWSER_VERIFIED`

Human-operable goal status: `CORE_HUMAN_USABLE_BROWSER_VERIFIED_WITH_SVG_PACKAGE_RUNTIME_BLOCKED_BY_DESIGN`

Remaining non-core blocker:

- SVG furniture package runtime remains blocked until reviewer / commander accepts candidate dispositions and a separate package integration task is authorized.

## 7. Next Task Demand

NEXT_PLAN_PUZZLE_TASK_DEMAND:

- Continue Loop 4A SVG candidate package reviewer disposition watch, or start a separate authorized SVG package integration task only after reviewer / commander approval. Do not include SVG candidates in runtime before that decision.
