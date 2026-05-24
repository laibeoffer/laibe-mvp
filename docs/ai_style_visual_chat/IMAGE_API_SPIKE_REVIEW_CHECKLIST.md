# Image API Spike Review Checklist

本文件提供 LAIBE_REVIEWER 審查 Image Generation API Integration Spike 使用。

Reviewer 應確認 spike 仍停留在 proof of concept，不得被包裝成正式功能上線。

## Scope Review

- [ ] 是否只做 Image Generation API Integration Spike。
- [ ] 是否未擴大成 production integration。
- [ ] 是否未修改 routing / CTA / Header。
- [ ] 是否未修改 Plancraft core。
- [ ] 是否未修改 payment / escrow / upload production flow。

## API Key Review

- [ ] API key 是否未外洩。
- [ ] API key 是否未進 frontend。
- [ ] API key 是否未進 repo。
- [ ] API key 是否未出現在 HTML / JS / CSS / Markdown / console / handoff。
- [ ] 是否沒有新增未授權 `.env` 或 `.env.*`。

## Request Schema Review

- [ ] Request 是否只包含白名單欄位。
- [ ] 是否不允許使用者自由輸入 system prompt。
- [ ] 是否不允許使用者覆寫 disclaimer。
- [ ] 是否不允許把 `walls/openings/zones/scale/plancraftBridge` 傳入 image API。
- [ ] `referenceImage.allowed` 是否仍為 `false`。

## Prompt Sanitization Review

- [ ] 是否有字串長度限制。
- [ ] 是否禁止 system override 指令。
- [ ] 是否禁止「忽略前文規則」。
- [ ] 是否禁止正式設計 / 施工圖 / 報價 / 完工承諾。
- [ ] 是否禁止真實案例宣稱。
- [ ] Prompt 是否由系統 template 組裝，不直接使用 raw user prompt。

## Generated Image Review

- [ ] 是否保留 disclaimer。
- [ ] 是否標示 AI / mock / 非真實案例。
- [ ] 是否未生成 production asset。
- [ ] 是否未命名為 final / production / official。
- [ ] 是否附 metadata：`generatedBy`、`usage`、`isOfficialDesign`、`isConstructionDrawing`、`isQuotationBasis`。
- [ ] 是否未寫入正式案件資料。

## Plancraft / Data Contamination Review

- [ ] 是否未污染 Plancraft geometry。
- [ ] 是否未寫入 `walls`。
- [ ] 是否未寫入 `openings`。
- [ ] 是否未寫入 `zones`。
- [ ] 是否未寫入 `scale`.
- [ ] 是否未寫入 `plancraftBridge`。
- [ ] 是否未影響 budget-system / specDB / official quote data。

## UI / Runtime Review

- [ ] Visual Simulation UI 是否仍明確標示為示意。
- [ ] 是否 console error = 0。
- [ ] 是否沒有破壞既有 Import Interface。
- [ ] 是否沒有破壞 Wall Segment Editor / Opening Editor。
- [ ] 是否沒有破壞 disclaimer 顯示。

## Handoff Review

- [ ] 是否更新 `docs/NEXT_CODEX_HANDOFF.md`。
- [ ] Handoff 是否清楚標示 spike 非 production。
- [ ] Handoff 是否列出未接 production、未新增 key、未污染資料。
- [ ] Handoff 是否要求 spike 完成後交 LAIBE_REVIEWER。

## Reviewer Conclusion

Reviewer 結論只能是：

- Pass，可進入下一階段。
- Conditional Pass，修正指定問題後可進入下一階段。
- Fail，必須退回 Builder 修正。

Reviewer 通過前，不得標記為正式上線。

