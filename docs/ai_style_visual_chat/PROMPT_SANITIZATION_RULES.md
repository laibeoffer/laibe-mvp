# Prompt Sanitization Rules

本文件定義 LAIBE_VISUAL_SIM 在 visual brief、prompt preview、negative prompt 與未來 sandbox image API spike 中的 prompt 安全規則。

本文件不是 API 實作文件，不提供 API key，不要求呼叫任何 image generation provider。

## 核心原則

- Prompt 必須由系統 template 組裝，不得直接使用 raw user prompt。
- 使用者輸入只能進入白名單欄位，並且必須經過 trim、長度限制、字元檢查與語氣降級。
- Prompt 只能描述「風格示意圖」、「案件上架參考」、「空間氛圍」。
- Prompt 不得產生施工圖、正式設計圖、真實案例、正式報價依據或完工保證語氣。
- Prompt 不得包含 Plancraft geometry、正式預算資料、上傳圖片、reference image file 或任何可識別私人住宅的資料。

## 白名單欄位與長度限制

未來 `styleVisualApiRequest` 只能接收下列欄位：

- `roomType`: 最多 20 個中文字或 40 個 ASCII 字元。
- `primaryStyle`: 最多 20 個中文字或 40 個 ASCII 字元。
- `secondaryStyle`: 最多 20 個中文字或 40 個 ASCII 字元。
- `colorTone`: 最多 30 個中文字或 60 個 ASCII 字元。
- `materialTone`: 最多 40 個中文字或 80 個 ASCII 字元。
- `budgetLevel`: 最多 20 個中文字或 40 個 ASCII 字元。
- `purpose`: 必須固定為 `bid-listing-style-reference`。
- `disclaimerRequired`: 必須固定為 `true`。
- `referenceImage.allowed`: 必須固定為 `false`。

若欄位超過長度，系統應截斷或拒絕。若欄位為空，系統應使用安全預設值，例如「室內空間」、「柔和風格」、「中性暖色」。

## 禁止 System Override 指令

輸入內容若包含下列意圖，必須拒絕、移除或降級，不得進入 prompt：

- 要求忽略前文規則。
- 要求覆寫 system prompt、developer prompt 或 safety rule。
- 要求移除 disclaimer。
- 要求不要標示 AI、mock、sandbox、非正式圖片或非真實案例。
- 要求把示意圖說成正式設計、施工圖、真實案例、報價依據或完工保證。
- 要求前端直連 image provider、揭露 API key、使用 secret 或繞過 server-side proxy。

常見 blocked pattern 包含但不限於：

```text
ignore previous instructions
ignore all previous instructions
system override
developer override
remove disclaimer
do not mention mock
do not mention AI
pretend this is a real case
make it look like a completed project photo
official design
construction drawing
quotation basis
completion guarantee
正式設計圖
施工圖
真實案例
正式報價
完工保證
```

## 禁止正式承諾語氣

Prompt 不得包含下列語氣或承諾：

- 施工圖、竣工圖、藍圖、CAD 圖。
- 精準尺寸、法規符合、工法保證。
- 材料品牌保證、施工品質保證。
- 正式估價、正式報價、預算核准。
- 真實案例、完工照片、設計師作品。

必須改寫為：

- 風格示意。
- 空間氛圍參考。
- 案件上架視覺溝通輔助。
- mock preview / sandbox preview。

## 風格詞 Normalizer

系統可以將使用者常見風格詞正規化，避免 prompt 太發散。

| 原始輸入 | 建議正規化 |
| --- | --- |
| 奶油、cream、cream style | 奶油風 |
| 古典、classic、classical | 古典風 |
| 現代、modern | 現代風 |
| 日系、Japandi、Japanese | 日系 / Japandi |
| 木質、wood、wooden | 溫潤木質 |
| 豪華、奢華、luxury | 高級但克制 |

Normalizer 只能協助語氣一致，不得把模糊需求解讀成正式設計決策。

## 系統 Prompt Template

Prompt 必須由系統組裝，格式建議如下：

```text
{roomType}，{primaryStyle} + {secondaryStyle}，{colorTone}調性，
柔和自然光，{materialTone}，整體為高級但克制的室內風格示意圖。
用途是裝修競標案件的案件上架與風格溝通參考。
不得呈現為施工圖、正式設計圖、真實案例、正式報價依據或完工保證。
```

可輸出給使用者看的 prompt preview 必須保留「示意」、「參考」、「非正式」語氣。

## Negative Prompt Template

Negative prompt 至少包含：

```text
no construction drawing, no blueprint, no CAD drawing, no official design,
no real case claim, no completed project photo claim, no quotation basis,
no precise dimensions, no material brand guarantee, no legal compliance claim,
no completion guarantee, no text labels implying final design
```

中文任務 brief 可另外標示：

```text
避免施工圖感、正式設計圖感、真實案例宣稱、正式報價語氣、完工保證語氣、品牌材料保證、精準尺寸標示。
```

## Reviewer 檢查重點

Reviewer 應確認：

- Prompt 是否只由白名單欄位組成。
- Prompt 是否沒有 raw system prompt 或 developer prompt。
- Prompt 是否保留 disclaimer 與非正式用途。
- Negative prompt 是否明確阻擋施工圖、正式設計圖、真實案例、報價依據與完工保證。
- Prompt 是否沒有 Plancraft geometry、正式預算資料、reference image 或私人住宅資訊。
