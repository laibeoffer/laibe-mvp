# PCM 已簽約甲方工作台實作計畫

決策碼：`A0-PCM-CONTRACTED-OWNER-WORKSPACE-20260802-V1`

## 施工邊界

- Base：`8b7af6c60f1436d9bc942173c13e231c1716c5ca`
- Worktree：`C:\CodexWork\08-Jacky\_reviewable\a0-owner-workspace-contract-gate-20260802`
- 本輪只修改獨立頁面：
  - `src/stitch_laibe_landing_onboarding/client_awarding_dashboard/code.html`
  - `src/stitch_laibe_landing_onboarding/client_awarding_dashboard/styles.css`
  - `src/stitch_laibe_landing_onboarding/client_awarding_dashboard/app.js`
  - `tests/pcm-contracted-owner-workspace.test.mjs`
- 依 `AA_PCM_SERVICE_CONTRACT_PATH_OWNERSHIP_COORDINATION_20260802`，本輪不得修改 `pcm_standalone/service_contract/**`、`pcm_standalone/public_home/**`、`tests/pcm-public-home.test.mjs`、`tests/pcm-service-contract.test.mjs`。
- Header「註冊／登入」及 `owner_start` 的正式導流只保留於設計規格；待 AA closeout exact commit 後另以新 seed 接線。
- 不修改 Auth、case resolver、Storage、durable writer、Supabase、migration、A1/A5/A9/A11/A12/A14 或 production。

## 設計讀取

- Artifact：已完成 PCM 服務契約的甲方案件工作台。
- Audience：已登入、具有 active PCM agreement 與案件 membership 的甲方。
- Mode：Redesign — Overhaul；保留既有路徑，重建資訊架構與視覺。
- Visual language：參考 `site/owner_workspace` 的深色工具型介面、黃橘節點與緊湊治理摘要。
- Visual variance：4/10；motion：2/10；information density：8/10；asset dependence：3/10；brand fidelity：10/10。
- Preserve：路徑、LaiBE 品牌、甲方角色定位。
- Improve：五秒答案、狀態、下一位處理者、文件版次、公開訊息與留痕邊界、響應式。
- Remove：亂碼、硬編案件／金額／日期／身分、無作用按鈕、`href="#"`、瀏覽器授權假象與舊發案用語。
- Highest risk：靜態候選誤導成已授權真實案件；以 fail-closed 狀態與測試阻擋。
- Fallback：adapter 未注入時只呈現 `CONTRACT_CONTEXT_UNAVAILABLE`，零案件資料與零 mutation 控制。

## Task 1：以測試固定受保護頁契約（RED）

新增 `tests/pcm-contracted-owner-workspace.test.mjs`，先證明舊頁違反：

1. HTML 必須以繁中明確說明「甲方案件工作台」與「完成 PCM 服務契約後」。
2. HTML 必須載入本地 `styles.css` 與 module `app.js`，不得依賴 Tailwind CDN 或第三方字型。
3. 公開預設狀態不得含硬編案件、金額、身分、文件、事件或 Human PCM decision。
4. 頁面 source、CSS、JS 與測試可見 fixture 對舊兩字發案詞為零命中。
5. 不得有 `href="#"` 或無 handler 的 enabled button。
6. 不得以 localStorage、sessionStorage、query parameter、DOM boolean 或任意 redirect URL取得授權。
7. runtime 必須輸出封閉狀態：`ACCESS_CHECKING`、`ACCESS_DENIED`、`CONTRACT_CONTEXT_UNAVAILABLE`、`AUTHORIZED_EMPTY`、`AUTHORIZED_READY`、`PCM_SERVICE_ENDED_READ_ONLY`、`LOAD_FAILED_RETRYABLE`。
8. exact access tuple 才可進 authorized；錯 role／membership／agreement／case binding均 fail closed。
9. `AUTHORIZED_READY` 只接受可信 adapter的正規化資料；所有動態文字以 DOM API輸出。
10. 訊息與提交型控制只有有 capability＋writer method時才呈現；成功必須以 durable receipt為準。
11. 終止後只讀狀態保留既有文件與訊息入口，但 PCM 不再介入。
12. 禁止金流、付款 authority、AI 最終裁決、最低價、零風險與老屋投資語意。

執行：

```powershell
node --test tests/pcm-contracted-owner-workspace.test.mjs
```

預期：至少因舊頁缺 runtime、假資料與無作用控制而 RED。

## Task 2：建立 pure runtime 與狀態渲染（GREEN）

新增 `client_awarding_dashboard/app.js`：

- export immutable `OWNER_WORKSPACE_STATES` 與 `OWNER_WORKSPACE_COPY`。
- export `normalizeOwnerWorkspaceContext`、`resolveOwnerWorkspaceState`、`createOwnerWorkspaceController`。
- adapter 預設不存在；初始化只顯示準備／未開放狀態。
- adapter 回傳必須有 active session、owner role、active membership、active agreement、bound case。
- typed view facts只包含 case identity、agreement version/state、next actor/action、document/version refs、review states、公開訊息 receipt與 permitted actions。
- unknown field不取得 authority；URL/query/local browser state完全不參與。
- mutation controls只有 writer存在且 capability允許才掛 handler；否則不渲染或 disabled。
- 只有可信 receipt回傳後才顯示「已記錄」。
- 401/403/404/409/5xx映射為使用者可理解的產品狀態。

重新跑 focused test 至 GREEN。

## Task 3：重建完整頁面與響應式樣式

修改 `code.html`、新增 `styles.css`：

- Header：LaiBE logo、甲方工作台、角色；無可信資料時不造姓名或案件。
- 首屏：頁面目的、PCM service context、目前狀態、下一位處理者與下一步。
- 四步流程：文件與版本、PCM 書面檢討、正式治理、案件執行。
- 摘要：文件版次、PCM 審查、待確認、下一步。
- Tabs/anchors：案件總覽、文件與報價、公開訊息、治理檢查、事件紀錄。
- 文件、乙方提交、場勘、設計送審、施工任務、異議／暫緩／終止 read-only、事件 trail與快速入口的完整 IA。
- 空狀態優先，不建立假資料。
- Desktop 1440×900、tablet 768×1024、mobile 390×844。
- 所有主要控制至少44px；skip link、focus-visible、semantic headings、reduced motion。

重新跑 focused test，並以 Node syntax gate驗證 JS。

## Task 4：回歸與瀏覽器驗收

完整回歸：

```powershell
$pcm = @(Get-ChildItem -LiteralPath tests -Filter 'pcm*.test.mjs' | Sort-Object Name | ForEach-Object FullName)
$pcm += (Resolve-Path tests\next-owner-vendor-legacy-surface.test.mjs).Path
node --test @pcm
node --check src\stitch_laibe_landing_onboarding\client_awarding_dashboard\app.js
node --check tests\pcm-contracted-owner-workspace.test.mjs
git diff --check
```

以新的短時 C-only static server做 fresh browser QA：

- 1440×900、768×1024、390×844。
- unavailable／authorized fixture／ended read-only三種狀態。
- horizontal overflow 0、console error/warning 0。
- skip link、焦點順序、44px controls、所有同源 href/anchor有效。
- 截圖存於 `C:\CodexWork\08-Jacky\qa_temp\pcm-owner-workspace-20260802-*`，不污染 worktree。

## Task 5：review、封裝與回報

- 執行獨立 code review；Critical/Important先補正並重跑相關 gates。
- `git status --short`只含四檔 ceiling與本計畫／既有設計規格commit。
- 建立 bounded local commit，不 push／PR／merge／deploy。
- 回報參謀長 task `019facc4-1d6e-75f0-a16e-4bda58329347`：commit、parent、修改檔、RED→GREEN、完整回歸、三 viewport、未串接項、AA header integration hold與 C-only證據。
