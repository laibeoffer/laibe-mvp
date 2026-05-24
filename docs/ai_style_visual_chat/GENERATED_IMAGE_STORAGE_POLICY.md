# Generated Image Storage Policy

本文件定義 Image Generation API Integration Spike 的生成圖片保存與命名規則。

## Spike 階段保存原則

- Spike 階段不得把生成結果寫入正式案件資料。
- Spike 階段不得保存到 production assets。
- Spike 階段不得把生成結果寫入 Plancraft geometry、budget output、specDB 或 dashboard official case data。
- Spike 階段生成圖只能作為 mock / visual simulation / bid-listing-style-reference。

## 禁止命名

生成圖檔名不得包含：

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
- `報價依據`

## 建議命名

```text
laibe-visual-sim-[room]-[style]-mock-v01.png
```

範例：

```text
laibe-visual-sim-living-room-cream-classic-mock-v01.png
```

## 必備 Metadata

每個 spike 生成結果若被暫存，必須附 metadata：

```json
{
  "generatedBy": "LAIBE_VISUAL_SIM",
  "usage": "bid-listing-style-reference",
  "isOfficialDesign": false,
  "isConstructionDrawing": false,
  "isQuotationBasis": false
}
```

建議補充 metadata：

```json
{
  "isRealCase": false,
  "isProductionAsset": false,
  "disclaimerRequired": true,
  "source": "image-api-spike",
  "reviewStatus": "pending-laibe-reviewer",
  "createdFor": "visual-simulation-preview"
}
```

## Storage Gate

在 LAIBE_REVIEWER 通過前：

- 不得進 production assets。
- 不得被正式頁面引用。
- 不得進案件正式資料。
- 不得提供給預算引擎作為價格或材料判斷依據。
- 不得在 dashboard 中作為真實案例展示。

## 刪除與清理

Spike 產物若只是暫存，必須能被清理。

不得讓 spike 產物成為不可追蹤的散落檔案。  
不得讓 spike 產物混入正式素材命名規則。

