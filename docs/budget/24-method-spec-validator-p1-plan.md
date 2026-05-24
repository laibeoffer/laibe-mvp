# Phase MS-7 MethodSpec Validator P1 Plan

Last planned: 2026-05-23

## 1. Summary

MS-7 是「配件倉庫：工法與規格」的 P1 validator planning，不是 validator implementation。

本文件只定義未來 MS-8 可施工的 P1 validator 範圍、優先順序、檔案觸碰清單、clean worktree guard plan 與 Reviewer 檢查點。

本輪不新增 validator checks、不修改 `src/lib/budget/specs/` 程式碼、不修改 renderer / output / intake / frontend / preview floor plan / budget engine 估價流程。

## 2. Current Status

- MS-5 P0 validator-only hardening 已完成並通過 seed catalog 驗證。
- MS-6 User-triggered Review result 結論是 `PASS_WITH_NOTES`。
- P0 guard 目前已涵蓋：
  - blocked pricing source type guard。
  - allowed unbound material item allowlist。
  - `InclusionExclusionRule.requires_review` scope_review policy visibility。
  - active `QuoteItemTemplate` customer note coverage。
  - validation report shape: `issues`、`allowed_conditions`、`guard_results`、summary counts。
- MS-6 note：repo baseline 目前不乾淨，正式 freeze 前需要 clean branch / clean worktree file ownership proof。
- 目前 deterministic regression baseline：
  - `demo-generate-budget.ts` total amount: `231103`
  - budget line count: `12`

## 3. Scope

本計畫只規劃配件倉庫 validator P1。

本計畫不處理：

- renderer
- output formatting
- Excel / PDF
- CSV / HTML renderer
- intake
- raw candidate warehouse
- RAG
- AI API
- frontend
- preview floor plan
- plan-puzzle
- budget engine 主估價流程
- DB migration
- payment / escrow / listing fee

本計畫不讓：

- `LaborRule` 進入主估價公式。
- `MaterialSpec`、`ItemMaterialBinding`、`NoteTemplate`、`InclusionExclusionRule` 改 `unit_price` 或 `amount`。
- `UnitConversion` 默默改寫已產生的 quantity。

## 4. P1 Validator Candidates

### A. LaborRule Reference-Only Guard

目的：

確認 `LaborRule` 仍是 reference-only，不會被誤認成正式價格公式。

應檢查：

- `MethodSpecCatalog.labor_rules` 是否存在 active rules。
- `build-budget-catalog-from-method-spec` 是否把 `LaborRule` 轉成正式 `PricingRule`。
- `PricingRule.price_source.type` 或其他 source 欄位是否含有 labor-derived source type。
- 是否有任何 `LaborRule.labor_code`、`LaborRule.base_rate` 被用來直接影響 `BudgetEstimateLine.unit_price` 或 `amount`。

建議未來 validator 行為：

- 若發現 labor-derived formal pricing path，報 `error` 或 high warning。
- 若只是存在 active `LaborRule` 並維持 reference-only，應報 info guard result，不應阻擋 seed demo。
- 此 guard 不應修改 `buildBudgetCatalogFromMethodSpec()` 行為；只做 validator visibility。

### B. UnitConversion Coverage

目的：

確認 recipe formula 使用到的單位轉換有對應 `UnitConversion`。

應檢查：

- recipe `quantity_formula` 是否包含 `cm -> 尺`。
- recipe `quantity_formula` 是否包含 `m2 -> 坪`。
- recipe `quantity_formula` 是否包含其他可解析 conversion phrase。
- seed `unit_conversions` 是否有對應 conversion。
- 若 formula 使用未定義 conversion，報 warning。

建議未來 validator 行為：

- 先做輕量字串偵測，不建立正式 formula parser。
- 缺 conversion 時先 warning，不阻擋 mock demo。
- 不應改寫 `quantity`，也不應重算任何既有 `BudgetEstimateLine`。

### C. Active QuoteItemTemplate Inclusion / Exclusion Coverage

目的：

確認 active quote item 有 scope 說明來源。

應檢查：

- active `QuoteItemTemplate` 是否有 matching `InclusionExclusionRule`。
- allowlist item 是否可降低嚴重度。
- 缺 scope rule 時先 warning，不阻擋 mock demo。

建議未來 validator 行為：

- 將缺少 scope rule 的 active item 報為 warning。
- 若 item 是 allowed unbound material item，可維持 warning 或 allowed condition，但仍應讓 Reviewer 看見 scope coverage 狀態。
- 不要在本 guard 實作 output propagation。

### D. Allowed Unbound Material Allowlist Formalization

目的：

將目前 validator 內部 allowlist 正式文件化，避免未來散落在 validator 裡。

目前 allowlist：

- `ELECTRIC_SOCKET_EXTENSION`
- `ELECTRIC_LIGHTING_INSTALL`
- `OTHER_PROTECTION_WORK`
- `OTHER_CLEANING_WORK`
- `OTHER_MANAGEMENT_FEE`

可規劃位置：

- 方案 1：維持在 `validate-method-spec-catalog.ts` 的 validator constants。
- 方案 2：抽到 `method-spec-policy.ts`，供 validator 與未來 reviewer demo 共用。
- 方案 3：加入 seed catalog policy section，但不讓 policy 變成 pricing rule。

MS-7 建議：

- MS-8 先不要大拆檔。
- 若只是 P1-A 實作，允許先維持 validator constants，並在文件與 guard result 中明確標示 allowlist。
- 若後續 policy 增多，再另開 phase 抽 `method-spec-policy.ts`。

## 5. P1 Priority

### P1-A：下一輪可先做

1. LaborRule reference-only guard
   - 風險最高，因為 `LaborRule.base_rate` 容易被誤認為正式價格公式。
   - 目標是建立防線，不是啟用 labor pricing。

2. allowed unbound material allowlist formalization
   - 目前 allowlist 已存在於 validator 內部。
   - 下一輪應讓 guard result / docs / constants 的語意更一致，方便 Reviewer 判讀。

### P1-B：可稍後做

1. UnitConversion coverage
   - 目前 seed conversion 覆蓋現有 cm -> 尺、m2 -> 坪、mm -> cm。
   - 但 recipe formula 尚未有正式 parser，因此先列 P1-B。

2. active QuoteItemTemplate inclusion / exclusion coverage
   - 目前 seed catalog 已有 12 個 inclusion/exclusion rules。
   - 可做，但不是立即最高風險。

### P2：後續精細化

- unused active `MaterialSpec`。
- duplicate customer-visible notes。
- `NoteTemplate.trade_category` consistency。
- `MethodRecipe.required_params` / `review_triggers` policy mapping。
- duplicate enriched note detection。
- item-type-level material binding completeness。

## 6. Proposed File Touch List for Future MS-8

未來真正實作 P1 validator 時，允許修改：

- `src/lib/budget/specs/validate-method-spec-catalog.ts`
- `src/lib/budget/specs/types.ts`，只在必要時
- `src/lib/budget/specs/demo-method-spec-validator-hardening.ts`
- 可新增 `src/lib/budget/specs/demo-method-spec-validator-p1.ts`，若需要獨立 demo
- `docs/budget/25-method-spec-validator-p1-implementation.md`
- `docs/NEXT_CODEX_HANDOFF.md`

未來 MS-8 禁止修改：

- `src/lib/budget/renderers/`
- `src/lib/budget/output/`
- `src/lib/budget/intake/`
- `src/lib/budget/raw-warehouse/`
- frontend
- preview floor plan
- `src/stitch_laibe_landing_onboarding/preview_floor_plan/`
- `plan-puzzle.js`
- budget engine 主估價流程
- `src/lib/budget/budget-generator.ts`
- `src/lib/budget/quantity-takeoff.ts`
- `src/lib/budget/recipe-matcher.ts`
- payment / escrow / listing fee
- AI / RAG integration files
- DB migration files

MS-8 若需要新增 helper，應先確認是否真的必要。若只是 constants 或 simple runtime checks，優先留在 validator 檔案內。

## 7. Clean Worktree Guard Plan

MS-8 施工前應做：

1. 記錄 git status baseline。
   - 建議命令：`git status --short`
   - 若輸出含既有 dirty / untracked paths，先列出並標記「非本輪修改」。

2. 建立 file ownership baseline。
   - 明確列出 MS-8 允許修改的 File Touch List。
   - 明確列出禁止區域：renderer / output / intake / frontend / preview floor plan / budget engine 主估價流程。

3. MS-8 施工中只允許修改 File Touch List。
   - 若發現必須碰其他檔案，應先停下並回報使用者，不可自行擴張。

4. 完工後列出本輪實際修改。
   - 建議命令：`git diff --name-only`
   - 若新檔案是 untracked，可用 `git status --short` 補充。

5. Reviewer 應確認沒有跨到：
   - `src/lib/budget/renderers/`
   - `src/lib/budget/output/`
   - `src/lib/budget/intake/`
   - frontend
   - preview floor plan
   - plan puzzle
   - budget engine 主估價流程

6. 若無法取得乾淨 worktree：
   - 必須在 handoff 明確列出無法證明的範圍。
   - 必須區分「既有 dirty / untracked」與「MS-8 本輪修改」。
   - LAIBE_REVIEWER verdict 最多應是 `PASS_WITH_NOTES`，除非能補足 file ownership proof。

7. 不得使用：
   - `git clean`
   - `git reset`
   - `git checkout` 還原未授權檔案
   - 刪除未授權檔案

## 8. Non-Goals

MS-7 / 未來 MS-8 P1 validator 不做以下事項：

- 不讓 `LaborRule` 進主估價公式。
- 不讓 `UnitConversion` 默默改寫已產生 quantity。
- 不讓 `MaterialSpec` / `ItemMaterialBinding` / `NoteTemplate` 改價格。
- 不讓 `InclusionExclusionRule` 改 renderer 格式。
- 不把 inclusion / exclusion propagation 到 output。
- 不修改 `BudgetOutputSnapshot`。
- 不做 renderer / Excel / PDF。
- 不做 CSV / HTML renderer。
- 不接 RAG / AI API。
- 不接正式 DB migration。
- 不碰 frontend / preview floor plan / plan-puzzle。
- 不碰 payment / escrow / listing fee。
- 不改 budget engine 的估價流程。

## 9. Reviewer Checklist for Future MS-8

Reviewer 應檢查：

- P1 validator 是否只在 specs 範圍。
- 是否保留 MS-5 P0 guard。
- seed catalog 是否仍 `valid: true`。
- invalid catalog 是否仍能抓 `ai_generated`。
- blocked pricing source type 是否仍是 error。
- allowed unbound material allowlist 是否仍進 `allowed_conditions`。
- LaborRule 是否仍 reference-only。
- UnitConversion 是否沒有重算已產生 quantity。
- MaterialSpec / ItemMaterialBinding / NoteTemplate / InclusionExclusionRule 是否沒有改 `unit_price` 或 `amount`。
- `demo-generate-budget.ts` total amount 是否仍為 `231103`。
- budget line count 是否仍為 `12`。
- 是否沒有修改 renderer / output / intake。
- 是否沒有修改 frontend / preview floor plan / plan-puzzle。
- 是否沒有修改 budget engine 主估價流程。
- 若 worktree 不乾淨，是否清楚標示哪些是既有 dirty / untracked、哪些是本輪修改。

建議 MS-8 regression commands：

```powershell
node --experimental-strip-types src/lib/budget/specs/demo-method-spec-warehouse.ts
node --experimental-strip-types src/lib/budget/specs/demo-method-spec-validator-hardening.ts
node --experimental-strip-types src/lib/budget/demo-generate-budget.ts
```

若新增 P1 demo，可追加：

```powershell
node --experimental-strip-types src/lib/budget/specs/demo-method-spec-validator-p1.ts
```

## 10. Recommendation

建議進入 **MS-8 P1 validator implementation**，但需先建立 clean worktree / file ownership proof。

MS-8 第一輪建議只做兩項 P1-A：

1. `LaborRule` reference-only guard。
2. allowed unbound material allowlist formalization。

MS-8 不建議同時做 P1-B，避免 validator 變更範圍過大。

MS-8 開工前必須：

- 記錄 git status baseline。
- 標記既有 dirty / untracked paths。
- 鎖定 File Touch List。
- 完工後提供 `git diff --name-only` 或等效檔案清單。

若無法清理 worktree，仍可施工，但必須在 handoff 與 review-ready summary 中明確標示 file ownership proof 的限制；若使用者後續主動要求 LAIBE_REVIEWER 審查，結論可能維持 `PASS_WITH_NOTES`。
