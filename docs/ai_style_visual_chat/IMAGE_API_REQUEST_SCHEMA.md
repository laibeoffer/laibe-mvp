# Image API Request Schema

本文件定義未來 Image Generation API spike 的 request / response contract。此 contract 只用於 spike / proof of concept，不代表 production API 已建立。

本文件不提供 API key，不要求建立 backend，不允許前端直連 image generation provider。

## styleVisualApiRequest

未來若進入 server-side proxy spike，前端只能傳入下列白名單欄位：

```js
styleVisualApiRequest = {
  roomType,
  primaryStyle,
  secondaryStyle,
  colorTone,
  materialTone,
  budgetLevel,
  purpose: "bid-listing-style-reference",
  disclaimerRequired: true,
  referenceImage: {
    allowed: false,
    reason: "reference image upload requires separate privacy review"
  }
}
```

## 欄位說明

- `roomType`: 空間類型，例如「客廳」、「臥室」、「廚房」。
- `primaryStyle`: 主要風格，例如「奶油風」。
- `secondaryStyle`: 次要風格，例如「古典風」。
- `colorTone`: 色調，例如「米白暖色」。
- `materialTone`: 材質氛圍，例如「大理石 + 溫潤木質」。
- `budgetLevel`: 預算感，只能用於視覺質感參考，不得轉成正式價格或報價承諾。
- `purpose`: 必須固定為 `bid-listing-style-reference`。
- `disclaimerRequired`: 必須固定為 `true`。
- `referenceImage.allowed`: 必須固定為 `false`，直到通過獨立 privacy review。

## 禁止欄位

`styleVisualApiRequest` 不得包含：

- `rawPrompt`
- `systemPrompt`
- `developerPrompt`
- `negativeSystemPrompt`
- `projectId`，除非未來另有正式 privacy / storage review
- `avoid`，若需要排除項，應由系統 negative prompt template 產生，不進 API request contract
- `walls`
- `openings`
- `zones`
- `scale`
- `plancraftBridge`
- Plancraft `.pc` 或 bridge converter payload
- BudgetEstimate、PricingRule、MaterialSpec、LaborRule 或正式預算資料
- reference image file
- 使用者上傳的私人住宅照片、圖面或現場圖

## Prompt 組裝規則

- API request 不得攜帶 raw prompt。
- Prompt 必須由 server-side 或受控系統 template 組裝。
- 使用者不得覆寫 disclaimer、purpose 或 safety metadata。
- `budgetLevel` 只能描述「視覺質感」，不得被解讀成價格等級、工程預算或報價承諾。
- reference image upload 仍維持 disabled。

## styleVisualApiResponse

Spike response 只能使用下列 shape：

```js
styleVisualApiResponse = {
  status: "disabled" | "mock_ready" | "error",
  imageUrl: null,
  previewDataUrl: null,
  message,
  metadata: {
    generatedBy: "LAIBE_VISUAL_SIM",
    usage: "bid-listing-style-reference",
    sandbox: true,
    isOfficialDesign: false,
    isConstructionDrawing: false,
    isQuotationBasis: false,
    isRealCase: false,
    savedToOfficialCase: false
  }
}
```

若沒有安全 server-side proxy，`status` 必須是 `disabled` 或 local `mock_ready`，不得假裝已接 production API。

## Schema Gate

任何 Builder 或 Reviewer 進入 image API spike 前，必須確認：

- Request 只含白名單欄位。
- `referenceImage.allowed === false`。
- `disclaimerRequired === true`。
- 沒有 Plancraft geometry。
- 沒有正式案件資料、正式預算資料或 production asset 指標。
- 沒有 API key、secret、token 或 credential 進入 frontend、Markdown、handoff 或 console。
