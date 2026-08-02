# Task 3：PCM 服務契約頁報告

## 修改檔案

- `src/stitch_laibe_landing_onboarding/pcm_standalone/service_contract/app.js`
  - 新增純函式 `evaluateSigningReadiness(input)` 與凍結的 `INITIAL_SIGNING_ENVELOPE`。
  - 以五項前提採取 fail-closed 判斷：小寫 SHA-256、甲方已驗證且有識別資料、自然人服務方快照、簽署紀錄準備、法務完成審閱。
  - 以受信任的 `textContent` 與固定段落 ID 渲染八項重點條款、完整契約、目錄與簽署前提；列印僅由使用者點擊觸發。
- `src/stitch_laibe_landing_onboarding/pcm_standalone/service_contract/code.html`
  - 新增繁體中文服務契約草稿頁，含 LaiBE 標誌、返回 PCM 首頁連結、v0.3／法務審閱中／草稿狀態、下一步、橘色文件盒、摘要、完整契約與簽署前提。
  - 簽署按鈕在 HTML 中已原生停用，並設有 `aria-disabled="true"`。
- `src/stitch_laibe_landing_onboarding/pcm_standalone/service_contract/styles.css`
  - 新增 PCM 深色外殼與暖白 A4 契約閱讀面、880px／620px 響應式排版、44px 行動控制、減少動態與列印樣式。

## 功能與狀態

- 新增完整契約閱讀、目錄定位、八項重點條款、簽署前提清單與列印草稿。
- 初始信封維持不可簽署：內容狀態仍為「法務審閱中」，且尚未有受信任的簽約資料。
- 未串接簽署服務、案件資料或任何儲存機制；本頁保留未來由受信任資料來源提供簽署前提的界面，但未實作該介接。
- 無外部使用者可見的工程語；未加入金流託管、代收代付、裝修投資或招標內容。
- 頁面符合萊比「裝修決策工具＋案件紀錄留痕系統」定位：明確指出目前狀態、等待對象、下一步與契約／案件紀錄依據。

## 驗證結果

- `node --test tests/pcm-service-contract.test.mjs`：4/4 通過。
- `node --check src/stitch_laibe_landing_onboarding/pcm_standalone/service_contract/app.js`：通過。
- `node --check src/stitch_laibe_landing_onboarding/pcm_standalone/service_contract/contract-content.js`：通過。
- `git diff --check`：通過。
- 禁用詞掃描（舊簽署狀態、瀏覽器儲存、工程語、金流託管、投資／招標、後端依賴）：0 筆命中。
- Build／lint：本 Task 3 未指定且不需要專案 build 或 lint；未執行。

## 待下一輪確認

- 法務完成審閱、服務方自然人資料與正式簽署流程有受信任來源後，才能由後續工作提供簽署前提；目前不可啟用簽署。
