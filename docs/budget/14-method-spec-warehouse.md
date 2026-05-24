# 配件倉庫：工法與規格系統

## 1. 配件倉庫是什麼

配件倉庫是萊比裝潢預算生成系統中的 approved rules / specs shelf。

它存放已審核的工法、材料規格、人工規則、備註模板、單位換算、包含與不包含規則。它不負責海撈市場資料，也不直接輸出預算單。

配件倉庫回答的是：

> 當一個需求、空間或平面物件出現時，應該產生哪些工項？數量怎麼算？備註與範圍邊界怎麼寫？

## 2. 和原物料倉庫的差別

原物料倉庫存放 raw / candidate data，例如歷史報價、材料單價、廠商報價、品牌型號、市場價格。

配件倉庫只存放已審核、可被 deterministic budget engine 使用的規則與規格。

簡單說：

- 原物料倉庫：資料從哪裡來，是否值得參考。
- 配件倉庫：哪些規則已核准，能不能套進估價流程。

原物料資料不能因為被匯入或分類，就直接變成配件倉庫的正式規則。

## 3. 和成品物流的差別

成品物流負責產出 `BudgetEstimateLine` 與傳統預算單格式。

配件倉庫不產生預算單。它提供：

- 工項模板。
- 工法配方。
- 材料規格。
- 人工規則。
- 備註模板。
- 單位換算。
- 包含 / 不包含條件。

成品物流拿這些已審核規則，加上專案輸入與價格來源，組成預算列。

## 4. MethodRecipe 是什麼

`MethodRecipe` 是需求或平面物件轉成工項的規則。

例如：

- `kitchen_island` 產生「中島吧檯矮櫃」與「中島吧檯人造石檯面」。
- `wardrobe` 依寬度 cm 轉成尺，產生「衣櫃桶身」。
- `bathroom` 依浴室數量產生防水、壁磚貼工、地磚貼工。
- `lighting_point` 依點位數產生燈具出線及安裝。

它必須保留 `recipe_id`、觸發條件、需要的 quantity fact、輸出工項、數量公式、預設假設與 review trigger。

## 5. MaterialSpec 是什麼

`MaterialSpec` 是已審核的材料規格，不是市場價格。

它描述：

- 材料代碼。
- 材料名稱。
- 類別。
- 品牌或型號。
- 等級。
- 單位。
- 對客戶可見備註。
- 內部備註。
- 是否啟用。

MaterialSpec 可以影響備註、適用工法、規格假設與 review flag，但不應單獨決定正式單價。

## 6. LaborRule 是什麼

`LaborRule` 是已審核的人工計算規則。

它描述：

- 人工代碼。
- 人工名稱。
- 工程類別。
- 單位。
- 基準費率。
- 客戶備註。
- 內部備註。
- 是否啟用。

LaborRule 是配件倉庫的一部分，但最終價格仍需由 deterministic pricing rule 與可追溯 price source 決定。

## 7. NoteTemplate 是什麼

`NoteTemplate` 是可重用的備註模板。

常見類型：

- `customer_note`
- `internal_note`
- `exclusion`
- `assumption`
- `risk`

它用來讓預算列能穩定輸出一致的備註，例如「磁磚貼工不含磁磚材料」或「燈具出線及安裝不含燈具本體」。

## 8. UnitConversion 是什麼

`UnitConversion` 是已審核的單位換算規則。

MVP 常用：

- cm -> 尺，`factor = 1 / 30.3`
- m2 -> 坪，`factor = 1 / 3.305785`
- mm -> cm，`factor = 0.1`

預算 engine 不應直接吃 px。任何幾何或平面資料必須先轉成估價可用單位。

## 9. Inclusion / Exclusion 是什麼

`InclusionExclusionRule` 定義某工項包含什麼、不包含什麼、估算假設是什麼，以及是否需要人工複核。

例如：

- 中島矮櫃包含基本櫃體，不含人造石及設備。
- 磁磚貼工包含貼工，不含磁磚材料。
- 燈具出線及安裝包含出線與基本安裝，不含燈具本體。

這些規則會影響客戶看到的備註與內部 review。

## 10. 哪些資料必須人工審核後才能進配件倉庫

以下資料必須人工審核：

- 新增或修改 MethodRecipe。
- 新增或修改 MaterialSpec。
- 新增或修改 LaborRule。
- 新增或修改 PricingRule。
- 新增或修改包含 / 不包含規則。
- 會影響單位換算、數量公式、工程範圍或備註風險的資料。
- 從歷史報價、廠商報價、市場價格轉換而來的任何候選資料。

AI 可以協助整理，但不能核准價格、工法或規格。

## 11. 配件倉庫如何餵給 budget engine

Phase 2.7 先用 local TypeScript / in-memory prototype。

資料流：

```text
MethodSpecCatalog
→ validateMethodSpecCatalog()
→ MethodSpecRepository
→ buildBudgetCatalogFromMethodSpec()
→ generateBudgetEstimate()
→ BudgetEstimate
```

`buildBudgetCatalogFromMethodSpec()` 會把配件倉庫轉成既有 Phase 1 engine 可吃的 `BudgetCatalog`，因此不用推倒既有 budget generator。

現階段仍是本地 prototype，不接正式資料庫、不做 RAG、不串 AI API、不做前端。
