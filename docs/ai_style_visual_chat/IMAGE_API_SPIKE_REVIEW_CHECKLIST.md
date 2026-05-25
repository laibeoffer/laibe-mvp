# Image API Spike Review Checklist

本文件提供 LAIBE_REVIEWER 或使用者主動審查 Image Generation API spike / sandbox visual preview 時的檢查清單。

本 checklist 只審查 spike 邊界，不代表功能可以 production 上線。

## Scope Review

- [ ] 本輪是否明確標示為 spike / proof of concept / sandbox。
- [ ] 是否沒有宣稱 production integration 或正式上線。
- [ ] 是否沒有修改 routing / CTA / Header。
- [ ] 是否沒有修改 Plancraft core。
- [ ] 是否沒有修改 `plan-puzzle.js`，除非 formal Issue 明確允許。
- [ ] 是否沒有碰 budget、raw warehouse、MethodSpec、renderer、payment、escrow、listing fee。

## API Key / Secret Review

- [ ] 沒有 API key。
- [ ] 沒有 `.env` 或 `.env.*`。
- [ ] 沒有 token / credential / secret。
- [ ] 沒有 secret 出現在 HTML、JS、CSS、Markdown、handoff、console、screenshot 或 PR description。
- [ ] 沒有前端直連 image generation provider。
- [ ] 若有 future proxy contract，是否只允許 same-origin server-side proxy。

## Request Schema Review

- [ ] `styleVisualApiRequest` 只包含白名單欄位。
- [ ] 沒有 `rawPrompt`、`systemPrompt`、`developerPrompt`。
- [ ] 沒有使用者覆寫 `purpose` 或 `disclaimerRequired`。
- [ ] 沒有把 `walls/openings/zones/scale/plancraftBridge` 傳入 image API。
- [ ] 沒有正式預算資料、BudgetEstimate、PricingRule、MaterialSpec、LaborRule。
- [ ] `referenceImage.allowed` 固定為 `false`。

## Prompt Sanitization Review

- [ ] Prompt 由系統 template 組裝，不直接使用 raw user prompt。
- [ ] 有長度限制、blocked patterns 與風格詞 normalizer。
- [ ] 禁止 system override / ignore previous instructions。
- [ ] 禁止正式設計、施工圖、真實案例、正式報價或完工保證語氣。
- [ ] Negative prompt 明確排除施工圖、藍圖、CAD、正式設計、真實案例、正式報價與完工保證。
- [ ] Prompt preview 只使用「風格示意」、「案件上架參考」、「空間氛圍」語氣。

## Generated Image / Preview Review

- [ ] 有固定 disclaimer。
- [ ] UI 或文件標示 AI / mock / sandbox / 非正式圖片。
- [ ] 標示非真實案例。
- [ ] 標示不會保存到正式案件。
- [ ] 命名不得包含 `final`、`production`、`official`、`case`、`real_case` 等誤導字樣。
- [ ] metadata 包含 `generatedBy`、`usage`、`sandbox`、`isOfficialDesign`、`isConstructionDrawing`、`isQuotationBasis`、`isRealCase`、`savedToOfficialCase`。
- [ ] 生成或 mock 圖沒有寫入正式案件資料或 production assets。

## Reference Image Review

- [ ] Reference image upload 仍 disabled。
- [ ] 沒有建立 upload pipeline。
- [ ] 沒有把私人住宅圖、平面圖、現場照送第三方模型。
- [ ] 若提到未來 reference image，是否標示需要 privacy review、使用者同意、暫存 / 刪除策略。

## Plancraft / Data Contamination Review

- [ ] 沒有修改 Plancraft geometry。
- [ ] 沒有寫入 `walls`。
- [ ] 沒有寫入 `openings`。
- [ ] 沒有寫入 `zones`。
- [ ] 沒有寫入 `scale`。
- [ ] 沒有寫入 `plancraftBridge`。
- [ ] 沒有寫入 project export JSON、budget data、case dashboard 或 formal case data。

## UI / Runtime Review

- [ ] 若 UI 存在，必須保留 `Sandbox Preview`。
- [ ] 若 UI 存在，必須保留 `AI 示意圖`。
- [ ] 若 UI 存在，必須保留 `非正式圖片`。
- [ ] 若 UI 存在，必須保留 `非真實案例`。
- [ ] 若 UI 存在，必須保留 `不會保存到正式案件`。
- [ ] 若 proxy disabled，應顯示「Server-side Image API proxy 尚未設定」或同等降溫文案。
- [ ] 不得出現「圖片生成完成」、「正式設計完成」、「production ready」、「可正式報價」等文案。

## Handoff Review

- [ ] 是否更新 `docs/NEXT_CODEX_HANDOFF.md`。
- [ ] Handoff 是否明確記錄本輪是否有 real API。
- [ ] Handoff 是否明確記錄是否有 API key / `.env` / secret。
- [ ] Handoff 是否明確記錄 generated preview local-only。
- [ ] Handoff 是否明確記錄 reference image disabled。
- [ ] Handoff 是否明確記錄不污染 Plancraft geometry / formal case data。
- [ ] 若涉及 file protocol 或 local runtime 限制，是否記錄驗證限制。

## Reviewer Conclusion

Reviewer 結論建議使用：

- `PASS`
- `PASS_WITH_NOTES`
- `NEEDS_FIX`
- `BLOCKED`

若任一高風險項目成立，例如 API key 外洩、真 API 未授權接入、production asset pipeline、reference image upload、正式案例宣稱、正式報價語氣或 Plancraft geometry 污染，應標示 `NEEDS_FIX` 或 `BLOCKED`。
