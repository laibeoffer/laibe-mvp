# Image API Spike Governance

本文件定義 LaiBE / LAIBE_VISUAL_SIM 在進入 Image Generation API Integration Spike 前必須遵守的治理邊界。

本文件不是 API 實作文件，不提供 API key，不要求串接任何模型，不代表功能已上線。

## Spike 目的

- 驗證 Visual Simulation Panel 未來是否可以安全銜接 image generation request。
- 驗證 `styleVisualApiRequest` 是否足以描述案件上架用風格示意需求。
- 驗證 prompt template、disclaimer、metadata 與 storage policy 是否能避免誤導使用者。
- 驗證產物能否維持在 LAIBE_VISUAL_SIM 的「案件上架與風格溝通輔助」邊界內。

## 非 Production 聲明

- Image Generation API Integration Spike 只能是 spike / proof of concept。
- Spike 不代表正式功能上線。
- Spike 不得被接入 production routing、正式案件資料、正式圖片資產庫或正式報價流程。
- Spike 結果不得被宣稱為正式設計、施工圖、真實案例、正式報價依據或完工保證。
- Spike 完成後，若使用者主動要求審查，可交給 LAIBE_REVIEWER 審查，通過前不得標記上線。

## API Key 管理規則

- API key 不得放在 frontend、HTML、JS、CSS、client bundle 或任何可被瀏覽器讀到的位置。
- API key 不得提交到 repo。
- API key 不得寫入 Markdown、handoff、log、console output、screenshot 或 issue description。
- API key 不得新增到本輪文件任務中；本輪不得建立 `.env` 或 `.env.*`。
- 未來若 spike 需要 key，只能由明確授權的 server-side / local secure environment 讀取。
- 若發現 key 外洩，必須停止 spike，標記 High Risk，並交由使用者處理 key rotation。

## Prompt Sanitization 規則

- 使用者輸入只能進入白名單欄位，不得直接作為 raw prompt 送出。
- 不允許使用者輸入或覆寫 system prompt。
- 不允許使用者要求忽略 LaiBE disclaimer、不可宣稱事項或安全規則。
- Prompt template 必須由系統組裝，使用欄位值填入固定模板。
- 任何包含正式設計、正式報價、完工保證、真實案例宣稱、法規符合或施工承諾的語句都必須被拒絕或降級為「風格示意」語氣。

## User Reference Image 規則

- 本階段不支援使用者上傳 reference image 送第三方 image model。
- 原因：私人住宅圖面、室內照片、地址線索、個資與財產資訊可能外洩。
- 未來若要支援，必須先完成 privacy review，包含明確告知、使用者同意、暫存 / 刪除策略與不進正式案件資料規則。

## Generated Image Storage 規則

- Spike 階段不得把生成結果寫入正式案件資料。
- Spike 階段不得保存到 production assets。
- Spike 階段不得使用 `final`、`production`、`official`、`case`、`施工圖`、`正式設計` 等命名。
- 生成結果若需要暫存，必須附 metadata，並標示為 mock / visual simulation。
- 生成結果不得成為報價、工項、材料品牌、尺寸、施工方法或 Plancraft geometry 的 source of truth。

## Disclaimer 規則

所有 image generation spike 結果都必須保留以下 disclaimer：

```text
本圖僅為風格示意，用於案件上架與溝通參考，不代表最終設計、施工圖、實際尺寸、工法、材料品牌或正式報價內容。
```

額外建議標示：

- AI 風格示意
- mock
- 非真實案例
- 非正式圖片

## No Official Case Contamination 規則

- 生成圖不得被放入正式案例庫。
- 生成圖不得被作為真實完工照片、客戶案例、施工成果或設計師作品展示。
- 生成圖不得與正式報價、合約、估價單、預算引擎輸出混為同一資料來源。
- 生成圖不得作為決標、價格、材料品牌或工法承諾的依據。

## No Plancraft Geometry Contamination 規則

Image generation spike 不得讀取、修改、覆寫或寫入以下 Plancraft+ geometry / bridge 欄位：

- `walls`
- `openings`
- `zones`
- `scale`
- `plancraftBridge`

Image generation request 不得把上述欄位傳入 image API。  
Image generation response 不得回寫上述欄位。  
Visual Simulation 只能是獨立的風格視覺化層。

## Post-Spike User-triggered Review

Image Generation API Integration Spike 完成後若使用者主動要求審查，可交給 LAIBE_REVIEWER 審查。

Reviewer 至少必須檢查：

- API key 是否外洩。
- 是否沒有進 frontend / repo。
- 是否沒有寫入正式案件資料。
- 是否保留 disclaimer。
- 是否標示 AI / mock / 非真實案例。
- 是否沒有污染 Plancraft geometry。
- 是否沒有修改 routing / CTA / Header。
- 是否沒有生成 production asset。
- 是否 handoff 清楚。

