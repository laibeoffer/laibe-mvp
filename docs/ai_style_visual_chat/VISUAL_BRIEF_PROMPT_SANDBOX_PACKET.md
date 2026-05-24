# Visual Brief Prompt Sandbox Governance Packet

本文件是 LAIBE_VISUAL_SIM 的 visual brief / prompt / negative prompt / sandbox preview 治理包。

本文件只用於案件上架與風格溝通輔助，不是圖片生成 API，不是 production integration，不是正式案例素材規格。

## 適用範圍

本治理包適用於：

- 模擬圖任務 brief。
- 示意圖 prompt。
- Negative prompt。
- Placeholder visual card。
- Sandbox preview / API-disabled fallback。
- Reviewer packet / phase review packet 中的 visual simulation 區段。

不適用於：

- 真 image API 接入。
- API key 管理實作。
- backend / proxy 實作。
- reference image upload。
- production asset pipeline。
- Plancraft geometry、budget、renderer、payment 或正式案件資料。

## 固定聲明

所有 visual simulation 任務必須保留以下 disclaimer：

```text
本圖僅為風格示意，用於案件上架與溝通參考，不代表最終設計、施工圖、實際尺寸、工法、材料品牌或正式報價內容。
```

## 不可宣稱事項

LAIBE_VISUAL_SIM 的輸出不得宣稱為：

- 施工圖。
- 正式設計圖。
- 真實案例。
- 竣工圖。
- 精準尺寸圖。
- 正式報價依據。
- 完工保證。
- 材料品牌保證。
- 法規符合文件。

只能宣稱為：

- 視覺示意。
- 功能說明。
- 風格參考。
- MVP 展示素材。
- 使用者溝通輔助。
- 案件上架與風格溝通參考。

## Visual Brief 必備欄位

每份 visual brief 至少包含：

- `taskName`: 模擬圖任務名稱。
- `useCase`: 使用場景。
- `sitePlacement`: 對應網站位置。
- `knownInputs`: 已知條件。
- `assumptions`: 假設條件。
- `unknowns`: 不確定條件。
- `doNotClaim`: 不可宣稱事項。
- `styleTags`: 風格標籤。
- `promptPreview`: 給 UI 或 Reviewer 看的 prompt preview。
- `chinesePrompt`: 中文 prompt。
- `englishPrompt`: English prompt。
- `negativePrompt`: Negative prompt。
- `assetSpec`: 比例、解析度、建議檔名、alt text。
- `disclaimer`: 固定 disclaimer。
- `builderNotes`: 給 Builder 的整合備註。
- `reviewerNotes`: 給 Reviewer 的審查備註。
- `riskNotes`: 風險提醒。

## Prompt Preview 規則

Prompt preview 必須用降溫語氣，例如：

```text
客廳，奶油風 + 古典風，米白暖色調，柔和自然光，大理石與溫潤木質，作為裝修競標案件的風格示意圖與案件上架參考。
```

Prompt preview 不得寫：

- 圖片生成完成。
- 正式設計完成。
- 可作為報價依據。
- 真實完工案例。
- 施工圖已建立。

## Negative Prompt 必備內容

Negative prompt 至少要排除：

```text
no construction drawing, no blueprint, no CAD drawing, no official design,
no real case claim, no completed project photo claim, no quotation basis,
no precise dimensions, no material brand guarantee, no legal compliance claim,
no completion guarantee, no text labels implying final design
```

中文備註可寫：

```text
避免施工圖感、正式設計圖感、真實案例宣稱、正式報價語氣、完工保證語氣、品牌材料保證、精準尺寸標示。
```

## Sandbox Preview Workflow

安全 sandbox preview 流程：

1. 收集白名單欄位：`roomType`、`primaryStyle`、`secondaryStyle`、`colorTone`、`materialTone`、`budgetLevel`。
2. 套用 prompt sanitization 與風格詞 normalizer。
3. 由系統 template 組裝 prompt preview 與 negative prompt。
4. 顯示 placeholder visual card 或 API-disabled fallback。
5. 只在 UI 或文件中標示 sandbox / mock / 非正式圖片。
6. 不寫入正式案件資料、production assets、Plancraft geometry、budget data 或 export JSON。

## Placeholder Visual Card 規格

Placeholder visual card 可以包含：

- `Sandbox Preview` label。
- `AI 示意圖` label。
- `非正式圖片` badge。
- `非真實案例` badge。
- `不會保存到正式案件` badge。
- 空間類型。
- style tags。
- brief 摘要。
- mock image area。
- disclaimer badge。

不得讓 placeholder 看起來像正式案例頁、設計師作品集、施工成果照或正式設計圖。

## Builder 整合備註

Builder 若整合 visual simulation UI，只能把本治理包視為資料與文案規格來源。

Builder 不得：

- 直接接真 image API。
- 在前端放 API key。
- 建立 upload pipeline。
- 把 generated preview 寫入 `project`、export JSON、formal case data、production assets 或 Plancraft geometry。
- 修改 `walls`、`openings`、`zones`、`scale`、`plancraftBridge`。

## Reviewer 審查備註

Reviewer 應檢查：

- 是否保留固定 disclaimer。
- 是否沒有正式設計、施工圖、真實案例、報價依據或完工保證宣稱。
- 是否沒有 API key、secret、`.env` 或 frontend 直連 image provider。
- `styleVisualApiRequest` 是否只包含白名單欄位。
- Reference image upload 是否 disabled。
- generated preview 是否 local-only / mock-only。
- 是否沒有污染 Plancraft geometry、budget 或 formal case data。

## Issue #19 驗收清單

- [ ] Visual brief 欄位清楚。
- [ ] Prompt preview 語氣降溫。
- [ ] Negative prompt 阻擋正式用途。
- [ ] Sandbox governance 清楚。
- [ ] Storage / reference image policy 清楚。
- [ ] Reviewer packet 可用。
- [ ] 無真 API。
- [ ] 無 API key。
- [ ] 無 backend / proxy / upload / production storage。
- [ ] 無網站 runtime code 變更。
