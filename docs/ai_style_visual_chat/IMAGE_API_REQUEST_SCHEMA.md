# Image API Request Schema

本文件定義未來 Image Generation API Integration Spike 可使用的 request schema。

本 schema 只供 spike / proof of concept 使用，不代表 production API contract 已凍結。

## styleVisualApiRequest

```js
styleVisualApiRequest = {
  projectId,
  roomType,
  primaryStyle,
  secondaryStyle,
  colorTone,
  materialTone,
  budgetLevel,
  avoid,
  purpose: "bid-listing-style-reference",
  disclaimerRequired: true,
  referenceImage: {
    allowed: false,
    reason: "reference image upload requires separate privacy review"
  }
}
```

## 欄位說明

- `projectId`：spike 用 project identifier，不得包含地址、姓名、電話或其他個資。
- `roomType`：空間類型，例如客廳、臥室、廚房。
- `primaryStyle`：主要風格，例如奶油風。
- `secondaryStyle`：次要風格，例如古典風。
- `colorTone`：色調，例如米白暖色。
- `materialTone`：材質語彙，例如大理石 + 溫潤木質。
- `budgetLevel`：預算感，例如中高階。不得被解讀為正式報價或預算承諾。
- `avoid`：需要避免的元素，例如過度豪宅化、暗色壓迫感、真實品牌 logo。
- `purpose`：固定為 `bid-listing-style-reference`。
- `disclaimerRequired`：必須為 `true`，不得由使用者覆寫。
- `referenceImage.allowed`：本階段固定為 `false`。

## 白名單欄位規則

- Request schema 只能由白名單欄位組成。
- 不允許任意新增自由文字欄位。
- 不允許使用者傳入 `systemPrompt`、`developerPrompt`、`rawPrompt`、`negativeSystemPrompt` 或類似欄位。
- 不允許使用者覆寫 `purpose` 或 `disclaimerRequired`。
- 不允許使用者覆寫 disclaimer 文字。

## 禁止傳入 Image API 的資料

以下資料不得傳入 image generation API：

- `walls`
- `openings`
- `zones`
- `scale`
- `plancraftBridge`
- Plancraft `.pc` 或 bridge converter payload
- 正式預算資料
- 正式報價資料
- 使用者個資
- 地址、電話、門牌、社區名稱等可識別位置資訊

## Prompt 組裝規則

- Prompt 必須由系統 template 組裝。
- 使用者欄位值只能填入 template 的指定位置。
- 系統必須保留「風格示意、案件上架與溝通參考」語氣。
- 系統必須避免將 `budgetLevel` 轉成正式價格、材料等級承諾或施工範圍承諾。

## Schema Gate

進入 API spike 前，Builder 必須先確認：

- 所有欄位都有長度限制。
- 所有欄位都經過 prompt sanitization。
- `referenceImage.allowed` 仍為 `false`。
- `disclaimerRequired` 仍為 `true`。
- request 不包含 Plancraft geometry。

