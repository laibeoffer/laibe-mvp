# Generated Image Storage Policy

本文件定義 LAIBE_VISUAL_SIM 在 sandbox image preview 或未來 Image Generation API spike 中的圖片保存邊界。

本文件不是 production asset pipeline 規格，不允許保存正式圖片資產，不允許寫入正式案件資料。

## Spike 階段儲存原則

- Spike 階段不得寫入正式案件資料。
- Spike 階段不得保存到 production assets。
- Spike 階段不得寫入 Plancraft geometry、budget output、specDB、dashboard official case data 或任何正式報價資料。
- Spike 階段的 generated preview 只能是 mock / visual simulation / bid-listing-style-reference。
- 若前端需要呈現結果，應只存在 local task state，例如 `styleVisualTask.generatedPreview`。

## 禁止命名

生成或 mock 圖不得使用下列命名片段：

- `final`
- `production`
- `official`
- `case`
- `real_case`
- `construction`
- `blueprint`
- `quotation`
- `施工圖`
- `正式設計`
- `真實案例`
- `正式報價`
- `完工保證`

## 建議命名

```text
laibe-visual-sim-[room]-[style]-mock-v01.png
```

範例：

```text
laibe-visual-sim-living-room-cream-classic-mock-v01.png
```

若只是 placeholder 或 mock data URL，仍應沿用 `mock` 或 `sandbox` 標記。

## 必要 Metadata

任何 spike preview、mock response 或未來 temporary preview 都必須附 metadata：

```json
{
  "generatedBy": "LAIBE_VISUAL_SIM",
  "usage": "bid-listing-style-reference",
  "sandbox": true,
  "isOfficialDesign": false,
  "isConstructionDrawing": false,
  "isQuotationBasis": false,
  "isRealCase": false,
  "savedToOfficialCase": false,
  "disclaimerRequired": true
}
```

若未來有暫存位置，必須額外記錄：

```json
{
  "isProductionAsset": false,
  "storageStage": "temporary-spike-preview",
  "reviewStatus": "pending-user-triggered-review",
  "createdFor": "visual-simulation-preview"
}
```

## Storage Gate

進入任何圖片保存或暫存前，必須確認：

- 沒有寫入正式案件資料。
- 沒有寫入 production assets。
- 沒有寫入 export JSON、budget data、Plancraft geometry 或 case dashboard。
- 沒有把圖片標示為真實案例、正式設計、施工成果或正式報價依據。
- 固定 disclaimer 仍可被 UI 顯示。
- 若涉及第三方 storage、CDN、user upload 或 production asset，必須先標示 Need Commander: Yes。

## Retention Policy

Spike 階段若產生 temporary preview，預設應視為可丟棄資料。

- 不保證長期保存。
- 不作為正式案例展示。
- 不作為後續施工、報價、材料品牌或工法承諾的依據。
- 不得因使用者按下 preview 產生正式案件附件。

## Reviewer 檢查重點

Reviewer 應確認：

- 命名沒有 `final`、`production`、`official` 等誤導字樣。
- metadata 明確標記 `sandbox: true` 與所有 official flags 為 false。
- generated preview 沒有進正式資料流。
- disclaimer 沒有被移除或覆寫。
