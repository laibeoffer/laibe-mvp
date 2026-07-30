# PCM 甲方註冊頁萊比版型對齊設計

日期：2026-07-30  
狀態：Human 已核准設計方向，待規格審閱  
施工路由：`src/stitch_laibe_landing_onboarding/pcm_standalone/owner_start/code.html`

## 1. 目的與定位

PCM 獨立試營運以甲方為主要服務對象。本次改造要讓 PCM 甲方註冊頁直接承接萊比既有註冊頁的視覺語言與操作結構，同時維持 PCM 的文件先行、簽約前基本檢討與案件留痕邊界。

頁面必須讓甲方在五秒內知道：

1. 這是甲方帳號註冊頁。
2. 註冊後要上傳乙方報價單與施工圖。
3. 萊比會先提供基本檢討，甲方之後才決定是否簽署 PCM 服務契約。
4. 乙方不從公開頁註冊，而是由甲方從案件內邀請。

本頁不是接案方招募、媒合、投標、訂閱或案件解鎖入口。

## 2. 既有來源與保護契約

視覺來源：

- `C:\CodexWork\08-Jacky\laibe_MVP_project\site\register_owner\code.html`
- `C:\CodexWork\08-Jacky\laibe_MVP_project\site\register_vendor\code.html`
- `C:\CodexWork\08-Jacky\laibe_MVP_project\site\shared\laibe-header.js`
- `C:\CodexWork\08-Jacky\laibe_MVP_project\site\laibe_offer_light.png`

PCM 既有保護契約：

- `PUBLIC_ROUTES.startCase` 維持 `../owner_start/code.html`。
- PCM 首頁與舊 `public_intake` 繼續導向同一 canonical 路由。
- 文件欄位固定為 `contractor_quote_pdf` 與 `construction_drawing_pdf`。
- 兩份文件都只接受 PDF，單檔上限 25 MB；施工圖至少包含平面圖。
- 甲方可在 PCM 服務契約簽署前完成註冊、上傳文件並取得基本檢討。
- 不建立公開乙方註冊路由。
- 不以瀏覽器儲存保存帳號、密碼、文件或案件事實。
- 未驗證 Auth、隱私揭露、Storage 或 writer 時必須 fail closed。

本次屬於「Redesign — Preserve」：重做頁面構圖與註冊流程，但不改公開路由、PCM 核心定位、文件契約及權限邊界。

## 3. 設計系統

### Design Read

- artifact：甲方註冊與簽約前文件收件頁
- audience：已取得乙方報價單與施工圖、準備申請 PCM 基本檢討的甲方
- visual language：萊比既有暖黑／冷黑雙欄註冊介面
- mode：Redesign — Preserve
- visual variance：2／10；以忠實對齊既有萊比註冊頁為優先
- motion intensity：1／10；只保留必要的狀態切換
- information density：6／10；同頁完成帳號與文件兩階段
- asset dependence：8／10；必須使用真實 LaiBE Logo
- brand fidelity：10／10

### Positioning

- narrative role：帳號建立與文件收件的操作入口
- viewing distance：手機 10 公分、筆電 1 公尺
- visual temperature：穩定、可信、克制
- capacity：桌機左右雙欄；手機依序呈現說明、註冊卡與簽約前邊界

### Tokens

- 背景：`#06080a`
- 主文字：`#f7f7f2`
- 次文字：`rgba(236,243,247,.74)`
- 弱文字：`rgba(236,243,247,.5)`
- 主橘：`#ff8a2b`
- 深橘：`#EB581E`
- 連結青：`#6cc6e8`
- 成功綠：`#74d59b`
- 字體：`"Noto Sans TC", "Microsoft JhengHei", system-ui, sans-serif`
- 主內容最大寬：1080px
- 桌機右欄：380px 至 440px
- 欄距：32px
- 表單卡圓角：20px
- 輸入框最小高度：46px
- 行動控制最小高度：44px
- 響應斷點：880px 以下改為單欄；680px 以下收斂頁面與導覽間距

頁面唯一的視覺記憶點是萊比既有的「左側大標與三步驟＋右側深色註冊卡」構圖。本次不另加黃色流程箭牌、額外卡片牆或新的裝飾語彙。

## 4. 資訊架構

```text
萊比風格頁首
└─ PCM 甲方註冊主畫面
   ├─ 左欄
   │  ├─ PCM 甲方註冊 eyebrow
   │  ├─ 建立你的甲方帳號
   │  ├─ 簽約前文件先行說明
   │  ├─ 甲方身分／乙方由案件邀請
   │  ├─ 三步驟
   │  │  ├─ 建立甲方帳號
   │  │  ├─ 上傳乙方報價與施工圖
   │  │  └─ 取得基本檢討後決定是否簽約
   │  └─ 基本檢討與服務契約邊界
   └─ 右欄單一卡片
      ├─ 階段一：甲方註冊／登入
      ├─ 帳號建立成功狀態
      ├─ 階段二：兩份 PDF 上傳
      └─ 文件收件成功或可重試錯誤
```

頁首只使用目前存在且可到達的 PCM 路由。視覺可對齊萊比膠囊導覽，但不得直接沿用寫死 `../` 的舊 `laibe-header.js`，也不得產生 404 連結。

## 5. 兩階段操作流程

### 5.1 階段一：甲方註冊

核准欄位：

- `account_type`：`individual` 或 `company`
- `company_name`：公司／法人時必填
- `contact_name`
- `mobile`
- `region`
- `email`
- `password`
- `terms_accepted`：不得預先勾選

欄位應提供正確的 `type`、`inputmode`、`autocomplete`、`required` 與可理解的 inline error。密碼至少八碼並包含英文字母與數字；正式密碼政策仍由 Auth 契約裁決。

CTA：

- 主 CTA：「建立甲方帳號」
- 次入口：「已有帳號？登入」

公開頁不提供「我是乙方」註冊切換。左側可用非互動說明標示「乙方由甲方從案件內邀請」。

帳號 writer 成功後，註冊資料從畫面清除，卡片切換至文件階段。帳號 writer 失敗時保留非密碼欄位；密碼必須清除，並顯示可執行的重試說明。

### 5.2 已有帳號登入

登入表單只包含 Email、密碼與明確登入 CTA。未串接正式 Auth 時不顯示假登入結果，並以產品語言說明入口尚在設定中。

成功登入且有權使用 PCM 的甲方，卡片直接進入文件階段。乙方、PCM reviewer 或無權限身分不得藉由此頁取得案件資料。

### 5.3 階段二：文件上傳

卡片顯示：

- 乙方報價單 PDF
- 施工圖 PDF
- 單檔 25 MB 上限
- 施工圖至少包含平面圖
- 目前狀態、目前處理者與下一步

CTA：「送出文件，取得基本檢討」。

文件成功送出後顯示：

- 「已收件，待萊比整理基本檢討」
- 可公開給甲方的收件識別
- 引用的文件名稱與版次
- 下一步由萊比 PCM 處理

文件送出失敗時不得重新建立帳號；應停留在既有帳號的文件階段並允許安全重試。

## 6. 狀態模型

頁面狀態：

1. `registration_closed`：Auth／條款／account writer 未就緒。
2. `registration_ready`：可建立甲方帳號。
3. `registering`：鎖定重複送出。
4. `registration_error`：保留非密碼資料，顯示欄位或一般錯誤。
5. `documents_closed`：帳號已建立，但文件 writer 或 Storage 未就緒。
6. `documents_ready`：兩份文件可選擇與驗證。
7. `documents_invalid`：缺件、格式、空檔或超限。
8. `submitting_documents`：鎖定重複送出。
9. `document_error`：帳號不回退，可重試文件送件。
10. `submitted`：文件已收件，等待基本檢討。

狀態切換由 runtime readiness 與 writer 結果決定，不以 DOM 文字、URL、`localStorage` 或 `sessionStorage` 冒充帳號與案件真相。

## 7. 產品文案邊界

必須正面說明：

- 基本檢討只依甲方提交且可辨識的乙方報價單與施工圖。
- PCM 對文件核對、差異標示、來源引用與留痕負責。
- 上傳文件不等於簽署 PCM 服務契約。
- 基本檢討不是正式驗收、現場品質判定、價格保證或付款授權。
- 乙方在正式治理階段由甲方邀請，並對同一程序版本明示同意。

不得出現：

- 投標、競標、得標、訂閱方案或案件解鎖費
- 金流託管、代收代付或付款保障
- 最低價、零風險或品質保證
- 老屋投資、翻修獲利或裝修理財
- DB、API、debug、mock、stack trace 等外部工程語

## 8. 錯誤、安全與可及性

- 所有錯誤使用欄位旁訊息或卡片內 status region，不使用 `alert()`。
- 錯誤後焦點移至第一個需修正欄位或錯誤摘要。
- 密碼不得保存在 browser storage、URL、console 或可下載證據。
- 文件不得在未驗證 writer 下持久化。
- 條款與隱私入口不得使用空 `href="#"`；未有正式頁面時，連到本頁存在的揭露區。
- 所有輸入均有可見 label；錯誤透過 `aria-describedby` 關聯。
- 鍵盤焦點清楚；支援 `prefers-reduced-motion`。
- 390px 寬度不得水平溢出。

## 9. 實作邊界

預計修改：

- `owner_start/code.html`
- `owner_start/styles.css`
- `owner_start/app.js`
- `public/owner-onboarding-contract.js`
- `tests/pcm-owner-onboarding.test.mjs`
- 新增註冊頁／註冊契約測試；若能維持單一測試檔清晰，優先擴充既有測試。
- 必要時更新 `brand-spec.md`，只記錄重用的萊比註冊頁資產與 tokens。

不修改：

- PCM 首頁 CTA 路由
- `PUBLIC_ROUTES.startCase`
- `public_intake` canonical redirect
- Core、Supabase migration、A5 PR、A14 candidate
- production Auth、Storage、secret、遠端設定或部署

## 10. 測試與驗收

TDD 必須先新增會因現況缺少註冊卡而失敗的測試，再實作最小功能。

自動化驗收至少涵蓋：

- 萊比註冊頁雙欄構圖與真實 Logo。
- 只包含核准的甲方帳號欄位。
- 不含接案方方案、投標或解鎖費。
- 註冊表單在文件階段之前。
- 註冊成功後同一卡片切換至既有兩份 PDF。
- 註冊失敗不進入文件階段。
- 文件失敗不重建帳號。
- readiness 未就緒時 fail closed 且不宣稱成功。
- 既有 owner-first 路由與基本檢討連結不變。
- 外部文案符合 PCM 定位與禁用詞規則。
- HTML、CSS、JS 格式與 lint/type/static check。

瀏覽器檢查：

- 1440×900：左右欄並排，表單卡不與頁首或左欄重疊。
- 390×844：單欄、控制項全寬、錯誤不截斷、水平溢出為 0。
- 註冊／登入切換、個人／法人切換及帳號成功後文件階段皆可由受測 writer 驗證。
- console error／warning 為 0。

## 11. 完成定義

只有同時滿足以下條件才算完成：

1. 外觀可明確辨識為萊比既有註冊頁的 PCM 甲方版本。
2. 甲方知道自己正在建立帳號，並知道下一步要提供哪兩份文件。
3. 註冊成功與文件成功是兩個獨立、可追溯的結果。
4. 未串接的能力不會顯示假成功。
5. 原 PCM 路由、文件契約、基本檢討與治理邊界沒有被破壞。
6. 桌機、手機、自動測試與靜態檢查都有新鮮通過證據。
