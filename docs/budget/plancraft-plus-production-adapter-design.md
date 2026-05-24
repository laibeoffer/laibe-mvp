# Plancraft+ Production Adapter Design

本文件定義 Plancraft+ wall-first draft 未來如何升級為 budget-system 可接受的 production adapter contract。這是一份設計文件，不是 runtime implementation。

目前 `normalizeFloorPlanToBudgetInput()` 中的 Plancraft+ adapter 仍是 spike：`productionReady` 必須維持 `false`，`formal_estimate_generation` 必須維持 `blocked`，candidate facts 不得進入正式估價。

## 1. Purpose

Production adapter 的目標是把 Plancraft+ draft JSON 中已驗證的幾何與標註資料，轉成 budget-system 可追溯、可審查、可被 deterministic budget engine 使用的 production input。

Production adapter 必須回答三件事：

1. 哪些 Plancraft+ draft data 可以成為正式 `Space`、`QuantityFact` 或 future `LayoutObject`。
2. 哪些資料只能保留為 candidate，需要 reviewer 或 user confirmation。
3. 哪些資料不得直接進入正式估價。

Plancraft+ 的 `.pc` converter、DSL validation、renderer preview、SVG output、underlay image、AI style preview 都不得成為 budget input。Budget input 只能來自 Plancraft+ draft JSON 中已驗證的結構化資料。

## 2. Current State

目前已完成的 spike 狀態：

- Plancraft+ draft 可被 adapter 辨識，但輸出固定為 `adapterMode: "plancraft_plus_spike"`。
- `zones` 會轉為 `Space` candidate。
- `nodeGraph.edges` 會轉為 wall length candidate `QuantityFact`。
- `openings` 會轉為 door / window / wall opening candidate `QuantityFact`。
- `furniture` 與 object placement 尚未支援，Plancraft+ path 的 `layoutObjects` 仍為空。
- `.pc` converter output、SVG、renderer preview 不作 budget input。
- `formalEstimateGuard` 已建立，`generateBudgetEstimate()` 已阻止 Plancraft+ spike output 進入正式估價。
- null / undefined / malformed input 已有 object guard，不應 crash。
- legacy preview-floor-plan demo 仍可走既有 mock estimate path。

目前不是 production adapter，不得宣稱可以產生正式報價。

## 3. Non-goals

本設計不做以下事項：

- 不做正式報價。
- 不解除 `productionReady: false`。
- 不解除 `formal_estimate_generation` blocked guard。
- 不接 Excel / PDF writer。
- 不做金流、escrow、listing fee、payment 或 fund release。
- 不使用 AI 自動估價。
- 不把 `.pc`、SVG、renderer preview 當 budget input。
- 不把未驗證 renderer preview 當施工圖。
- 不把 candidate facts 當 production facts。
- 不把未封閉 zone boundary 當正式 room。
- 不把未驗證 openings 直接轉正式門窗工項。
- 不修改 Plancraft core。

## 4. Input Contract

Production adapter 只接受 Plancraft+ draft JSON，不接受 `.pc` text、SVG、renderer output、underlay image data 或 AI style preview。

最低 Plancraft+ production input 條件：

- `product === "Plancraft+"`
- `unit === "mm"`
- `version` 為可辨識字串，production adapter 應明確定義可接受版本範圍，例如 `>= 0.10.0` 並低於下一個 breaking schema 版本。
- `scale.calibrated === true`
- `scale.pxPerMm` 為正數，若 draft 仍依賴 underlay 校正。
- `walls` 為 array。
- `nodeGraph.nodes` 為 array。
- `nodeGraph.edges` 為 array。
- `openings` 為 array，可為空。
- `zones` 為 array。
- `furniture` 為 array，可為空。
- `plancraftBridge` 可存在，但不得作為 budget quantity source。

`nodeGraph.edges` 最低要求：

- `id` 唯一且穩定。
- `sourceWallId` 存在。
- `fromNodeId` 與 `toNodeId` 存在。
- `from` / `to` 使用 mm 座標。
- `length` 為正數，且可由 `from` / `to` 重算驗證。
- `thickness` 為正數，且落在 production policy 允許範圍。
- `status` 只能是 `existing`、`new`、`demolished`。
- `structural` 必須為 boolean 或明確缺省值。

`zones` 最低要求：

- `id` 唯一且穩定。
- `name` 與 `type` 存在。
- `boundaryStatus === "closed"` 才可進 production candidate。
- `boundaryEdgeIds` 至少 3 筆，且每個 id 都能對應 `nodeGraph.edges`。
- `boundaryWallIds` 必須可由 `boundaryEdgeIds[].sourceWallId` 去重重建。
- `polygon` 使用 mm 座標，至少 3 點，且可形成封閉區域。
- `boundaryIssues` 必須為空或只有 reviewer 已批准的非 blocker issue。

`openings` 最低要求：

- `id` 唯一且穩定。
- `kind` 只能是 `door`、`window`、`opening`。
- `edgeId` 必須對應 `nodeGraph.edges`。
- `offset >= 0`。
- `width > 0`。
- `offset + width <= edge.length`。
- `sourceWallId` 必須與 edge provenance 可對齊。

Forbidden input：

- `.pc` converter output。
- SVG 或 renderer preview。
- underlay `dataUrl` / PDF / JPG / PNG bitmap。
- AI style visual prompt 或 generated image metadata。
- 未經 validator 接受的 arbitrary object。

Required provenance：

- source draft id 或 project id。
- draft version。
- adapter version。
- source entity id：zone id、edge id、wall id、opening id。
- formula 與 unit conversion。
- reviewer status。
- production gate status。

## 5. Space / Zone Contract

Production `Space` 只能由 validated zone 產生，不得由 `.pc` room、SVG label 或 underlay text 直接產生。

Zone 可升級為 production `Space` 的最低條件：

- `zone.id` 穩定。
- `zone.name` 非空。
- `zone.type` 可映射到 budget-system `space_type`。
- `boundaryStatus === "closed"`。
- `boundaryEdgeIds` 全部存在。
- `boundaryWallIds` 可重建並與 edge provenance 一致。
- `polygon` 合法、封閉、使用 mm 座標。
- `area` 已由 production-approved formula 計算或由 reviewer 批准。
- `areaSource` 明確。
- `areaConfidence` 達到 production threshold。
- 沒有 blocker boundary issue。

建議 production `Space.params` 保留：

- `source_type: "plancraft_plus_zone"`
- `source_id: zone.id`
- `boundaryEdgeIds`
- `boundaryWallIds`
- `polygon`
- `areaSource`
- `areaConfidence`
- `productionReady`
- `reviewStatus`

以下情況仍只能是 candidate：

- boundary 未封閉。
- polygon 缺失或少於 3 點。
- `boundaryEdgeIds` 找不到 edge。
- area 是 spike estimate。
- zone type 無法映射。
- reviewer 尚未確認。

## 6. Area Policy

面積可以用 polygon shoelace formula 計算，但只有在以下條件成立時才可進 production：

- polygon 由 closed boundary edges 產生。
- polygon 點位使用 mm 座標。
- polygon 至少 3 點。
- polygon 最後一段能回到起點，或系統以明確 closure rule 補上閉合線。
- boundary edges 沒有 missing edge。
- polygon 沒有明顯 self-intersection。
- zone boundary issues 無 blocker。
- reviewer gate 通過。

面積單位轉換：

- `area_mm2 = abs(shoelace(polygon))`
- `area_m2 = area_mm2 / 1_000_000`
- `area_ping = area_m2 / 3.305785`

Precision / rounding policy：

- 內部保留 `area_mm2` 原始值。
- budget quantity 可用 `area_m2`，建議顯示四捨五入到 0.01 m2。
- 坪數只作顯示或輔助理解，建議顯示四捨五入到 0.01 ping。
- 任何 rounding 必須記錄 `rounding_rule`。
- `formula` 必須保留，例如 `shoelace(zone.polygon_mm) / 1_000_000`。

不能進正式估價的情況：

- boundary 未封閉。
- area 來自手填但無 provenance。
- area 只來自 renderer 視覺量測。
- area 只來自 AI 或 OCR 推測。
- areaSource 是 `spike_polygon_estimate` 且未經 reviewer 批准。

## 7. Wall Fact Contract

`nodeGraph.edges` 是 wall fact 的 production source，不是 `wallGraph.issues`、SVG line 或 `.pc` wall。

Production wall fact 最低條件：

- edge id 穩定。
- sourceWallId 存在。
- from / to 使用 mm。
- length 可重算且與 edge.length 在 tolerance 內。
- thickness 合法。
- status 合法：`existing`、`new`、`demolished`。
- structural 是 boolean 或明確 unknown。
- edge 不屬於 unresolved overlap / zero length / too short issue。

建議 wall quantity facts：

- `existing_wall_length`
- `new_wall_length`
- `demolished_wall_length`

每個 fact 必須保留：

- `source_type: "project"`
- `source_id: edge.id`
- `object_type: "wall"`
- `value`
- `unit`
- `formula`
- `formula_inputs.edgeId`
- `formula_inputs.sourceWallId`
- `formula_inputs.from`
- `formula_inputs.to`
- `formula_inputs.status`
- `formula_inputs.thickness_mm`
- `formula_inputs.structural`
- `requires_review`

Reviewer confirmation 必須介入：

- `status === "new"`，因為會影響新作牆工項。
- `status === "demolished"`，因為會影響拆除工項與廢棄物。
- `structural === true` 或 structural unknown。
- sharedWalls 尚未 canonicalize。
- edge 長度、厚度或拓撲有 issue。

Existing wall 不得自動產生施工工項，除非另有明確 scope 表示需要處理表面、拆除、修補或保護。

## 8. Opening Fact Contract

Openings 可成為 door / window / opening facts，但 production adapter 不得只因 opening 存在就直接產生正式門窗價格。

Production opening 最低條件：

- `opening.id` 穩定。
- `kind` 合法。
- `edgeId` 對應 existing `nodeGraph.edge`。
- edge 不屬於 demolished wall，除非 scope 是拆除相關。
- `offset >= 0`。
- `width > 0`。
- `offset + width <= edge.length`。
- door width / window width / opening width 符合 production policy 或有 reviewer approval。
- `height` 與 `sillHeight` 的缺失狀態被明確記錄。
- swing 若存在，必須符合 allowed values。

建議 facts：

- `door_opening_count`
- `door_opening_width`
- `window_opening_count`
- `window_opening_width`
- `window_sill_height`
- `wall_opening_count`
- `wall_opening_width`

每個 fact 必須保留：

- `source_id: opening.id`
- `edgeId`
- `sourceWallId`
- `offset_mm`
- `width_mm`
- `height_mm`
- `sillHeight_mm`
- `swing`
- `kind`
- `requires_review`

以下情況只能是 candidate：

- opening edge missing。
- offset / width 超出 edge。
- demolished edge 上新增 door / window。
- kind 無法映射。
- height / sillHeight 缺失但該工項需要。
- swing 格式不符合 production allowed values。

## 9. Furniture / Object Future Contract

目前 Plancraft+ `furniture` 仍未實作，production adapter 不得產生 Plancraft+ path 的 `LayoutObject` production output。

Future furniture / object contract 至少需要：

- object id。
- object type。
- zone id 或 edge id / anchor。
- dimensions：width / depth / height，建議使用 mm 或 cm 並明確 unit。
- position：x / y / rotation。
- asset code 或 semantic object code。
- budgetable flag。
- provenance。
- reviewer status。

在 current adapter 中：

- `furniture` 是 unsupported。
- object placement 是 unsupported。
- `layout_objects` 仍只屬 legacy preview-floor-plan path。
- 不得宣稱 Plancraft+ 已能產生 production furniture / fixture / object budget input。

## 10. Guard Model

Production adapter 必須保留 guard model，而不是只靠 warning 字串。

目前 spike guard 必須維持：

```json
{
  "productionReady": false,
  "adapterMode": "plancraft_plus_spike",
  "formalEstimateGuard": {
    "blocked": true,
    "status": "blocked",
    "reason": "plancraft_plus_adapter_spike",
    "code": "plancraft_plus_formal_estimate_blocked",
    "productionReady": false
  }
}
```

未來 production adapter 至少需要三層狀態：

1. `plancraft_plus_spike`：永遠 blocked。
2. `plancraft_plus_candidate`：可輸出 candidate facts，但不得進 formal estimate。
3. `plancraft_plus_production`：通過 contract validation、reviewer gates、quantity contract approval 後，才可進 formal estimate dry-run。

每個 `Space` / `QuantityFact` 應有自己的 readiness：

- `candidate`
- `productionReady`
- `requires_review`
- `review_reason`
- `source_type`
- `source_id`
- `authority`

必須保留的 reason codes：

- `plancraft_plus_adapter_spike`
- `plancraft_plus_formal_estimate_blocked`
- `plancraft_plus_area_not_calculated`
- `plancraft_plus_zone_boundary_not_closed`
- `plancraft_plus_openings_candidate_only`
- `plancraft_plus_opening_edge_missing`
- `plancraft_plus_edge_length_invalid`
- `plancraft_plus_pc_not_budget_input`
- `plancraft_plus_svg_not_budget_input`
- `plancraft_plus_furniture_not_supported`

## 11. Reviewer Gates

以下情況必須 reviewer approval 或 user confirmation：

- zone boundary 有 issue。
- zone boundary 未封閉。
- polygon 自動整理或排序有疑慮。
- area 是 estimated，而非 production formula result。
- opening 有 validation warning。
- opening edge missing 或 offset / width 接近邊界。
- wall status 是 `new`。
- wall status 是 `demolished`。
- structural wall involved。
- structural status unknown。
- sharedWalls unresolved。
- edge overlap / nearby endpoint / wall intersection 尚未整理。
- Plancraft `.pc` converter 有 warning。
- renderer preview 與 draft geometry 不一致。
- zone type 無法映射到 budget space type。
- method recipe mapping 缺失。

Reviewer approval 不等於 AI 決定價格。價格仍必須由 deterministic budget engine 與 approved catalog / pricing source 產生。

## 12. Downstream Safety

`generateBudgetEstimate()` 只能接受 production-ready input。最小條件：

- adapterMode 不得是 `plancraft_plus_spike`。
- `productionReady === true`。
- `formalEstimateGuard.status !== "blocked"`。
- 所有 production quantity facts 都通過 contract validator。
- candidate facts 不得出現在 production estimate input。
- unsupported 清單不得含 blocker。
- provenance 必須完整。

Spike input 必須被拒絕：

- `adapterMode === "plancraft_plus_spike"`。
- `productionReady === false`。
- `formal_estimate_generation.status === "blocked"`。
- `formalEstimateGuard.blocked === true`。

Excel / PDF writer 前置 guard：

- Excel / PDF writer 不得直接讀 Plancraft+ draft。
- Excel / PDF writer 不得呼叫 `generateBudgetEstimate()`。
- Excel / PDF writer 只能讀 `BudgetOutputSnapshot` 或 snapshot-gated `RenderedBudgetDocument`。
- Renderer entry 必須執行 snapshot validation。
- Legacy `formatBudgetOutput()` 不得作為正式 Excel / PDF source。

`.pc` / SVG / renderer preview 永遠不得作為 budget input。它們只能作為幾何驗證或視覺檢查輔助。

## 13. Production Adapter Acceptance Criteria

Plancraft+ production adapter 進入 implementation 前，至少需要：

- 本文件或後續 contract doc 通過使用者或 Reviewer 檢查。
- version range policy 明確。
- zone boundary validator 明確。
- polygon area validator 明確。
- wall fact validator 明確。
- opening validator 明確。
- candidate / production fact type 命名定稿。
- reviewer gate data structure 定稿。
- `generateBudgetEstimate()` guard 保持有效。
- legacy preview-floor-plan path 未破壞。
- `.pc` / SVG / renderer preview 仍不作 budget input。
- no Plancraft core changes。
- no AI-generated pricing。
- no Excel / PDF writer bypass。

Production adapter runtime acceptance 至少需要測試：

- valid Plancraft+ draft 可產生 production `Space` 與 approved `QuantityFact`。
- invalid boundary 被 blocked。
- estimated-only area 被 blocked 或 candidate-only。
- openings invalid edge 被 blocked 或 candidate-only。
- new / demolished / structural wall 需要 review。
- candidate facts 不會進 formal estimate。
- production facts 能追溯到 zone / edge / opening source id。
- legacy input 仍可走 legacy path。
- unknown / malformed input 不 crash。

## 14. Migration Plan

### Phase P1：Production Adapter Design Doc

建立 production adapter 設計與安全邊界。這就是本文件。本階段不修改 runtime，不解除 guard。

### Phase P2：Zone Area / Boundary Refinement

完成 zone boundary validator、polygon closure check、polygon ordering policy、shoelace area calculation、area confidence 與 rounding policy。

### Phase P3：Production Quantity Fact Contract

定義 production `QuantityFact` type、unit、formula、formula_inputs、review_reason、provenance 與 catalog recipe mapping 所需欄位。

### Phase P4：Reviewer-gated Production Adapter

建立 gated production adapter path。只有通過 validator 與 reviewer gate 的 spaces / facts 才能 `productionReady: true`。

### Phase P5：Formal Estimate Dry-run

用 production-ready Plancraft+ input 進行 formal estimate dry-run，但仍不接 Excel / PDF writer，不宣稱正式報價。

### Phase P6：Excel / PDF Writer Integration

在 BudgetOutputSnapshot 與 renderer gate 完成後，才接正式 Excel / PDF writer。Writer 只讀 snapshot，不讀 Plancraft+ draft。

## 15. Open Questions

- Plancraft+ production version range 要從哪個版本開始鎖定？
- zone `boundaryStatus` 是否需要獨立 validator report，而不是只放在 zone object？
- polygon auto-ordering 是否允許進 production，或只能使用 user-selected ordered edges？
- area confidence threshold 要設多少？
- new / demolished wall 對應哪些 MethodRecipe？
- existing wall 何時只作 reference，何時產生保護 / 修補 / 表面處理工項？
- structural wall 是否一律 blocked，還是可在特定非結構工項中保留 reference？
- sharedWalls canonicalization 完成前，production adapter 是否可允許部分 room facts？
- opening 的 door / window height default 能否使用 catalog assumption，還是必須 user confirmation？
- openings 跨 shared edge 時應歸屬單一 zone、雙 zone，或建立 canonical opening fact？
- furniture / object placement 的 production source 應由 Plancraft+ editor、家具庫，還是 budget UI 補充？
- `.pc` converter warnings 是否需要進入 budget adapter reviewer gate？
- Renderer preview mismatch 應如何 machine-readably 回寫到 draft validation report？
- Production adapter output 是否應新增獨立 `plancraftPlusValidationReport`，避免把 spike 欄位擴散進通用 `BudgetInputFromFloorPlan`？
