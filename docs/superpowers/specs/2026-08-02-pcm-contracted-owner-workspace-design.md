# PCM 已簽約甲方工作台設計

決策碼：`A0-PCM-CONTRACTED-OWNER-WORKSPACE-20260802-V1`

狀態：`DESIGN_APPROVED_WITH_HEADER_ENTRY / IMPLEMENTATION_NOT_STARTED`

## 1. 目的與來源

本設計將既有「甲方入口首頁」改造成完成 PCM 服務契約後的甲方案件工作台。它不是公開入口、註冊頁或未簽約甲方的試用頁。

- 施工基線：`8b7af6c60f1436d9bc942173c13e231c1716c5ca`
- 隔離工作樹：`C:\CodexWork\08-Jacky\_reviewable\a0-owner-workspace-contract-gate-20260802`
- 既有入口來源：`src/stitch_laibe_landing_onboarding/client_awarding_dashboard/code.html`
- 來源檔基線 SHA-256：`8D72A9F74810844CAAC2837E9CCC65A5E030E0202A5B77E391DBE6C7C85A55E0`
- 唯讀參考頁：`C:\CodexWork\08-Jacky\laibe_MVP_project\site\owner_workspace\code.html`
- 參考頁 SHA-256：`5B24D5993E63ECCC94400955C1D09829859C3CF95658E1B11F7294C08997CABA`

採用方案 A：完整參考 `owner_workspace` 的資訊層級、深色 LaiBE 視覺、流程海報、案件摘要、治理區塊、回應紀錄、檢查清單與快速入口；資料與權限邊界則依目前 PCM canonical truth 重建，不複製參考頁中的硬編案件、廠商、數字、日期、假身分、假狀態或無作用控制。

## 2. 使用者、入口與五秒答案

### 2.1 唯一主要使用者

完成 PCM 服務契約、已登入且是該案件成員的甲方。

### 2.2 入口條件

正式路由的可信後端必須同時確認：

1. active authenticated session；
2. actor role 為 owner；
3. actor 是目前案件成員；
4. PCM 服務契約為 active，且固定 exact agreement version；
5. domain 與 case 綁定一致。

未簽約甲方不會由正常導覽進入此頁。直接網址、缺 session、錯案件、錯角色、契約未成立或契約狀態未知時一律 fail closed，不載入或顯示案件資料。

PCM 首頁 header 的「註冊／登入」是統一甲方入口，但不直接公開連到工作台：

1. 未登入者先進既有 `owner_start` 註冊／登入入口；
2. 未簽 PCM 服務契約者留在簽約前文件準備、送件與基本檢討流程；
3. 只有登入成功後，由可信後端回傳 active PCM agreement＋owner membership＋case binding，才可導向本工作台；
4. 已登入且符合相同條件者可由入口直接恢復自己的工作台；
5. 狀態未知或驗證失敗時維持原頁並以產品語言說明，不猜測目的地。

本靜態頁的 JavaScript 不是安全 authority；真正授權仍須由未來正式 route/adapter 在伺服器端完成。未配置可信 adapter 時，頁面只能顯示產品化的未開放狀態。
不得沿用參考頁的 `LB_AUTH`、`data-lb-gate`、localStorage 或網址參數作登入、簽約或案件授權證據。
既有 `?route_state=candidate_guarded` 只是一段歷史網址字串，沒有授權效力；新頁不得讀取它來切換身分、契約或案件狀態。

PCM 服務契約 active 只開放甲方查看其案件工作台。正式三方 milestone mutation 仍須另有乙方加入、同版程序同意與 action capability，不能由「已簽 PCM」自動推定。

### 2.3 五秒內必須回答

- 這是「甲方案件工作台」。
- 目前 PCM 服務契約與案件治理狀態。
- 現在球在誰手上。
- 下一步由誰、在何時前完成什麼。
- 本頁採用哪一份文件／報價／施工圖版本。
- 哪些訊息、確認與異議已進入萊比後台留痕。

## 3. 參考頁完整映射

| `owner_workspace` 參考區塊 | 新甲方工作台落點 | 校正原則 |
| --- | --- | --- |
| LaiBE 深色 header、角色 chip | 品牌 header＋「甲方」角色＋案件名稱 | 未取得可信身分時不顯示姓名或案件 |
| STEP 流程海報 | 契約成立後的案件進度 | 保留大型數字與黃橘焦點；手機改緊湊列表 |
| 案件標題、狀態 badge | 案件 identity＋PCM 服務契約狀態 | 契約版本與案件狀態分開，不混為施工合約 |
| 四張摘要卡 | 文件、PCM 審查、待確認、下一步 | 不顯示假倒數、假投標數或固定日期 |
| 投標動態表 | 受邀乙方與正式提交版本 | 每列固定 submission/version/status；無資料顯示空狀態 |
| 競標者反應內容 | 甲方、乙方與 PCM 公開訊息留痕 | 所有參與方可讀；寫入必須由 durable writer 成功後才稱已留痕 |
| 場勘管理 | 場勘／會議與文件確認節點 | 不把書面 PCM 說成現場監工或品質裁決 |
| AI PCM 治理狀態 | PCM 書面治理狀態 | 不顯示「全程監督」、AI 最終裁決或法律效果 |
| 決標前檢查清單 | 當前治理檢查清單 | 由 evidence facts 推導，不以 caller boolean 冒充完成 |
| 設計案管理 | 送審、版本審核與要求修改 | 每次判定固定 exact 文件版本、理由與下一位處理者 |
| 工程案管理 | 今日焦點、待處理、施工紀錄與變更 | 只呈現已寫入案件後台的任務、照片、缺失與確認事件 |
| 文件歷史與時間軸 | 文件版本、作廢、歸檔與事件 trail | 歷史版本不可漂移到最新版，也不可用刪除洗掉治理紀錄 |
| 快速入口 | 文件、基本檢討、報價健檢、公開訊息 | 只有實際存在且可達的 href；其餘 disabled 並以產品語言說明 |

## 4. 頁面資訊架構

### 4.1 Header

- LaiBE logo 回到已存在的 PCM 首頁。
- 顯示「甲方工作台」。
- 可信資料存在時顯示案件名稱與 owner role；缺資料不建立假身分。
- 不提供 `href="#"`、404 route 或無 handler 的可用按鈕。
- PCM 公開首頁 header 顯示「註冊／登入」，href 固定指向既有 `../owner_start/code.html`，不直接暴露受保護工作台網址。
- `owner_start` 是統一入口；登入成功後只能採用可信 adapter 回傳的封閉 destination code，不能接受任意 redirect URL。

### 4.2 契約與案件狀態帶

分開顯示：

- PCM 服務契約：`active / ended / unknown`；
- 契約版本；
- 案件狀態；
- 目前責任人；
- 下一步與期限；
- 最近留痕時間。

`ended` 只代表 PCM 不再介入。甲乙方的工作台、既有文件與紀錄仍可讀取及下載；尚未發生的 PCM 服務費停止請款，既收 10% 簽約款依約扣抵，不在本頁產生退款或追加請款控制。

### 4.3 四段流程

1. 文件與版本：報價單 PDF、施工圖 PDF、補件與版本 identity。
2. PCM 書面檢討：完整性、範圍對照、風險與補件清單。
3. 正式治理：異議、回覆、暫緩、甲乙自行協議與 Human PCM 決定。
4. 案件執行：乙方提交、場勘、文件確認與後續案件紀錄。

每段均顯示 `completed / current / waiting / unavailable`，不得由瀏覽器自行推定完成。

### 4.4 案件總覽

四個摘要欄位：

- 目前文件版本；
- PCM 審查狀態；
- 待確認事項；
- 下一步與責任人。

資料未知時顯示「尚待載入」或「尚未建立」，不得補 0、固定日期、固定案件數或固定金額。

### 4.5 文件與報價

- 顯示文件名稱、種類、document/version、提交者、提交時間、目前狀態與來源摘要。
- 甲方可讀取與下載自己案件內有權限的既有文件。
- JPEG/PNG 若仍是 private staging/pending review，不得稱正式案件文件。
- 報價健檢與基本檢討是候選／書面整理，不構成工程款到期、付款授權、託管、代收代付或撥款。

### 4.6 乙方遴選與文件治理

- 顯示受邀乙方、提交狀態、文件完整性、待補件與場勘回覆。
- 沒有正式 writer 前，新增邀請、送出案件文件或確認合作對象等控制不得呈現為可用。
- 不以最低價排序作決策 authority。
- 乙方被 PCM 要求補件而不予驗收時，只有存在甲乙雙方同一份不可變協議與甲方明確確認，才可呈現甲方自行驗收結果。
- 候選圈選、補件／澄清、凍結期、文件缺漏、場勘待回覆與合作條件檢查狀態均須保留，但只能由可信案件 facts 計算。
- 「確認合作對象」屬高風險 CTA；只有 action capability、合作條件、exact 報價版本與二次確認皆成立時才可使用，並須保存理由、依據與 receipt。

### 4.7 設計案管理

- 顯示設計送審版本、待甲方審核、已通過、要求修改與下一位處理者。
- 甲方的通過／要求修改必須綁定 exact document version、理由與可信時間。
- PCM 可提出書面提醒與風險標註，但不能代替甲方接受設計或宣告現場品質。

### 4.8 工程案管理

- 首屏優先呈現今天做什麼、缺什麼、誰要決定什麼。
- 施工任務、施工照片、追加減項、驗收缺失與確認結果必須來自案件後台事件。
- 變更核准／拒絕、缺施工日誌、歷史版本與結案歸檔各自保留封閉狀態，不以一個泛用完成布林值取代。
- PCM 只整理文件與治理節點，不宣稱現場監督、工程驗收或付款裁決。

### 4.9 公開訊息與留痕

- 甲方、乙方與 PCM 在案件內的正式訊息對三方公開。
- 每筆顯示 actor、時間、案件、所依文件版次、訊息類型、目前處理狀態與下一步。
- 前端送出成功不等於已留痕；只有 durable writer 回傳可信 receipt 後才顯示「已記錄」。
- writer 未配置時訊息輸入不呈現，或 disabled 並顯示「正式訊息入口正在整理中」。
- LINE 只可作 transport receipt，不是案件真相。

### 4.10 異議、驗證、暫緩與終止

- 甲方提出異議或證據後，PCM 必須逐項檢查與回覆；這是治理程序，不是服務契約終止。
- PCM 回覆後重新提供甲方自行驗證／驗收時間。
- 甲方可因時間因素提出暫緩，需乙方明確同意。
- 「補件」與「無法判定」不能直接進入 48 小時終止。
- 只有一般驗證期結束、通知可證、文件可讀、平台可用且甲方無有效回應時，可信後端才可啟動 48 小時 cure。
- 甲方在 cure 中提出有效異議或證據，倒數取消並回到 PCM 回覆程序。
- 終止後保留文件、訊息與事件讀取／下載；PCM 狀態改為不再介入，甲乙進入直接協議、工程爭議或私下調停。

## 5. 狀態模型

頁面只接受下列頂層狀態：

- `ACCESS_CHECKING`
- `ACCESS_DENIED`
- `CONTRACT_CONTEXT_UNAVAILABLE`
- `AUTHORIZED_EMPTY`
- `AUTHORIZED_READY`
- `PCM_SERVICE_ENDED_READ_ONLY`
- `LOAD_FAILED_RETRYABLE`

`AUTHORIZED_READY` 仍不代表任何文件已正式核准，也不代表付款條件成立。

### 5.1 Adapter minimum

可信 adapter 至少回傳：

- actor identity/role/capability；
- case identity/membership/domain；
- PCM service agreement ID/version/state；
- case state/current actor/next action；
- document/version refs；
- review outcomes與 reason codes；
- tender submissions與 source refs；
- public message/event receipts；
- permitted actions與每項不可用原因；
- owner destination code：`PRE_CONTRACT_INTAKE` 或 `ACTIVE_PCM_OWNER_WORKSPACE`。

UI 不以 localStorage、query parameter、DOM data attribute 或 caller boolean 製造上述 authority。

## 6. 互動與錯誤處理

- Tabs、filter、accordion 等純檢視互動可在前端運作。
- 每個提交型 CTA 必須對應真實 adapter method、loading、成功 receipt、可理解錯誤與 retry。
- 沒有 handler 的控制不呈現為 enabled。
- 401/403 顯示存取說明，不洩漏案件是否存在。
- 404 case 顯示「找不到可供你查看的案件」。
- 409 顯示資料已更新並要求重新載入，不覆寫新版。
- 5xx/網路錯誤保留使用者尚未送出的內容，但不得宣稱已記錄。
- 動態案件文字以安全 DOM API 輸出；不得把 localStorage／訊息內容直接拼入 `innerHTML`，未來若使用 `postMessage` 必須驗證 exact origin 與 message schema。
- 外部頁面不得顯示 DB、API、mock、debug、stack trace、raw JSON 等工程語。
- redirect 只接受封閉 destination code 映射到 repo 內已存在 route；adapter 回傳任意 URL、跨 origin、未知 code 或缺 agreement/membership evidence 時一律不導頁。

## 7. 視覺與響應式

採 Extension 模式：保留 `owner_workspace` 的黑色工具型介面、白字、大型步驟數字、黃橘主焦點與金屬感操作元件，同時沿用 PCM 已核准的 LaiBE logo 與可見焦點規則。

- Desktop 1440×900：流程海報與案件摘要同屏可辨識，主內容／側欄比例清楚。
- Tablet 768×1024：流程改 2×2 或水平緊湊列，摘要卡 2×2，表格可轉語意列。
- Mobile 390×844：單欄；流程為四列固定編號／標題／狀態；表格轉卡片；無水平溢出。
- 案件 tabs 在窄畫面提供可理解的水平導覽；七欄日曆改 agenda，三欄今日焦點與廠商明細改單欄卡片。
- 主要控制觸控區至少 44px。
- Skip link、語意 heading、keyboard focus、reduced motion 與色彩對比維持。

## 8. 預計有界檔案

設計核准後的 implementation plan 原則上只允許：

- 修改 `src/stitch_laibe_landing_onboarding/client_awarding_dashboard/code.html`
- 新增 `src/stitch_laibe_landing_onboarding/client_awarding_dashboard/styles.css`
- 新增 `src/stitch_laibe_landing_onboarding/client_awarding_dashboard/app.js`
- 修改 `src/stitch_laibe_landing_onboarding/pcm_standalone/public_home/code.html` 的 header 入口文案與既有 href
- 修改 `src/stitch_laibe_landing_onboarding/pcm_standalone/owner_start/app.js` 的可信登入後 destination handling
- 新增 `tests/pcm-contracted-owner-workspace.test.mjs`
- 最小更新 `tests/pcm-public-home.test.mjs` 與 `tests/pcm-owner-registration-page.test.mjs`

不得修改：

- `src/stitch_laibe_landing_onboarding/pcm_standalone/**` 中除上述兩個精確檔案外的所有來源
- A1/A5/A9/A11/A12/A14 contracts或runtime
- Supabase、Auth、Storage、migration、writer或production設定
- `site/owner_workspace/code.html` 唯讀參考來源
- Next Owner/Vendor/PCM quarantine

若 static import、資產或測試依賴無法在此 ceiling 內封閉，實作前停止並回報，不自行擴張。

## 9. TDD 與驗收

### 9.1 RED 必須先證明

- 現頁仍是公開「建立新專案」入口。
- 存在 `href="#"` 與無 handler 的 enabled button。
- 存在固定假案件、預算、投標數與假狀態。
- 沒有 PCM 契約／membership fail-closed 狀態。
- 沒有三方公開訊息與 durable receipt 邊界。
- 首頁 header 尚未提供「註冊／登入」統一入口，登入成功也沒有可信 destination 分流。
- 沒有文件 version／next actor／traceability minimum。

### 9.2 GREEN 必須證明

- 頁面明確是已完成 PCM 服務契約後的甲方工作台。
- 缺可信 context 時零案件資料、零假身分、零假操作。
- 未簽約／未登入／非成員不會由公開流程進入；直接 URL 不洩漏資料。
- query parameter、localStorage 或 client-side candidate gate 無法把頁面切成 authorized。
- 首頁 header 的「註冊／登入」固定進既有 owner gateway；未簽約者不進工作台，active-contract owner 才能依可信 destination code 導入工作台。
- unknown／任意 URL／跨 origin destination 全部 fail closed，且不洩漏案件。
- 參考頁的主要資訊架構完整映射。
- 以 `String.fromCodePoint(0x62db, 0x6a19)` 產生的舊兩字發案詞彙，在頁面來源與可見文字皆為零命中。
- 所有可用 CTA 具有真實 href 或 handler；未開放操作不可用且文案誠實。
- 文件、公開訊息、異議、暫緩、終止與 read/download 邊界正確。
- 無付款授權、金流託管、代收代付、AI 最終裁決、最低價或老屋投資語意。
- 完整 PCM＋legacy 回歸保持綠燈。

### 9.3 Fresh browser

驗證 1440×900、768×1024、390×844：

- page purpose、role、state、next actor與留痕說明；
- header、流程、摘要、文件、公開訊息、檢查清單、快速入口；
- denied/unavailable與authorized fixture兩種可見狀態；
- horizontal overflow 0；文字／數字／CTA 無重疊或裁切；
- console error/warning 0；
- keyboard focus、skip link、44px controls；
- 所有同源 href 為 HTTP 200 或有效 anchor。

## 10. 非目標與外部 Gate

本輪不建立或宣稱：

- 真實 Auth、PCM contract resolver、case membership resolver；
- durable document/message/event writer；
- Storage 或正式文件下載授權；
- 報價 OCR、施工圖辨識或 Human PCM 最終 writer；
- 對外發布案件、確認合作對象、付款或工程款到期能力；
- LINE、worker、scheduler、deployment或production readiness。

完成頁面只代表可審查的 fail-closed frontend candidate；跨 agent runtime integration、正式資料接線與 production acceptance 維持 HOLD。

## 11. 完成回報

完成 implementation 與 fresh 驗證後，A0 必須把以下資訊回報參謀長 task `019facc4-1d6e-75f0-a16e-4bda58329347`：

- exact worktree、branch、base與candidate commit；
- 修改檔案與每檔用途；
- RED→GREEN與完整回歸；
- 三個 viewport與console／overflow／href證據；
- 契約門檻、公開訊息留痕、文件讀取與終止後 read-only行為；
- 仍未串接項與 production HOLD；
- C-only、未碰原 dirty worktree、未 push／merge／deploy／apply。
