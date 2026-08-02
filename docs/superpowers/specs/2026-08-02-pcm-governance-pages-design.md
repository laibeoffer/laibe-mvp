# PCM 授權後台與內部治理頁設計規格

## 權威與範圍

- 基準 commit：`0b0037ff50a4dc5b1756fe3230588f12a01c5337`
- 基準 tree：`57bb0dc3775af085810a60a6719c5fa898e98a8d`
- 模式：Extension；只新增兩個 PCM 私有後台 source page，不修改既有頁、public/shared shell 或 runtime。
- 交付性質：A3 UI source candidate；不代表產品驗收、正式授權、資料權威或 A6 runtime 已接線。
- 主要使用者：具裝潢專業經驗的 Human PCM；第一版只做人工指派，不建立專業分科、專長標籤或自動分流。

## 方案選擇

採用兩個獨立頁面，各自擁有本地 HTML、CSS 與 fail-closed JavaScript。此方案不新增 shared shell，不改動既有 PCM 頁，並讓「案件處理」與「平台治理」的責任界線清楚。

未採用方案：

1. 單頁以分頁切換案件處理與平台治理：會混淆 Human PCM 與管理者責任，也使授權 gate 難以辨識。
2. 擴寫既有 `pcm_standalone` shell：會修改既有 UI authority，違反 new-only 範圍。

## Design Read

```yaml
artifact: PCM 私有案件工作台與內部治理台
audience: 受邀 Human PCM 與治理管理者
visual-language: 克制深色、資料密集、以責任接力與留痕為主的裝修決策工作台
mode: Extension
visual-variance: 3
motion-intensity: 2
information-density: 8
asset-dependence: 2
brand-fidelity: 10
```

具體結果：

- 以穩定欄位、線性分隔與單一橘紅主行動維持高密度可掃描性。
- 動態只用於 hover、focus、狀態切換；支援 reduced motion。
- 使用既有 LaiBE logo、深色表面、橘紅行動色、cyan focus 與 PCM 紫色身分點。
- 不加入照片、插畫、漸層英雄區、通用 SaaS 卡片牆或公開網站 Header。

## 首屏事實帶

兩頁首屏固定回答五件事：

1. 目前角色
2. 契約狀態
3. 案件狀態
4. 下一步責任人
5. 最近案件紀錄

未授權狀態仍呈現五欄，但只顯示「尚未確認／無授權案件／等待完成授權確認／尚無可調閱紀錄」等產品語言，不得帶入案件名稱、文件、成員或事件 payload。

## PCM 授權案件工作台

### 資訊架構

- 授權案件清單：只呈現可信授權內容；每列單一主要下一步。
- 案件工作台：案件、階段、文件版次、等待關係、下一步持續可見。
- 文件完整性：依需求、圖面、報價、說明與附件顯示齊備狀態。
- 文件／風險比對：能定位空間、工種、頁次或報價項目，區分 AI 初步檢核與 Human PCM 確認。
- 補件要求：指定責任方、引用文件版次、缺漏與期限；正式接線後才寫入案件紀錄。
- 決策整理／書面檢討：整理依據、雙方說明、PCM 確認結果與待處理差異。
- 里程碑／驗收治理：只管理書面里程碑、驗收項目與責任，不宣稱現場品質保證。
- 通訊待回覆：顯示誰在等待誰及待回覆事項。
- 案件紀錄調閱：以文件、房間、工種、狀態、行為人與時間查找，不顯示工程事件名稱。

### 狀態模型

- `ACCESS_CHECKING`
- `ACCESS_DENIED`
- `AUTHORIZED_EMPTY`
- `AUTHORIZED_READY`
- `CASE_ARCHIVED_READ_ONLY`
- `LOAD_FAILED_RETRYABLE`

預設 context 解析為 `ACCESS_DENIED`，case payload 為空陣列、enabled actions 為空陣列。只有 active session、PCM actor、active membership、相同 case binding 與 active contract 完整一致時才可進 `AUTHORIZED_READY`。

## 內部治理台

### 資訊架構

- 帳號：受邀 Gmail、啟用／停權與登入狀態。
- 案件成員：列出案件、成員角色、加入狀態與人工指派責任。
- 角色權限：只描述可看、可處理、可管理的範圍；不得自行定義 RLS 或資料權威。
- 契約版本／狀態：顯示目前適用版本、狀態、雙方程序與更新時間。
- 存取／異動紀錄：以使用者可理解的「存取紀錄／設定異動」呈現，不顯示 raw JSON 或工程事件名稱。

治理管理者維護帳號、成員、權限、契約狀態與留痕；不得替 Human PCM 作文件判讀、風險結論、補件判斷、書面檢討或驗收確認。

### 狀態模型

- `GOVERNANCE_CHECKING`
- `GOVERNANCE_DENIED`
- `GOVERNANCE_EMPTY`
- `GOVERNANCE_READY`
- `GOVERNANCE_READ_ONLY`
- `GOVERNANCE_LOAD_FAILED`

預設 context 解析為 `GOVERNANCE_DENIED`，帳號、案件成員、契約與紀錄 payload 全為空，enabled actions 為空。只有 active admin session、governance administrator actor 與 active governance assignment 完整一致時才可進 `GOVERNANCE_READY`。

## 視覺與互動規則

- Logo：`../../../../assets/logo/laibe_offer.svg`
- Palette：`#0a0c0f`、`#f4f1ea`、`#9aa3ad`、`#ff8a2b`、`#eb581e`、`#6cc6e8`、`#c08af0`。
- Typography：`Noto Sans TC`、`Microsoft JhengHei`、`PingFang TC`。
- Spacing：4px 基準；8／12／16／24／32。
- Radius：主容器 14px、內層 8px；禁止 card-inside-card。
- 所有可操作控制最小 44px；focus-visible 使用 cyan outline。
- 1280px 為雙欄／三欄工作台；768px 收斂為單主欄加水平可捲動的文字分頁；390px 為單欄且無水平溢出。
- 每頁最多一個 enabled primary action；未授權預設為零 enabled action。
- 不使用 emoji、外部 UI CDN、`scrollIntoView` 或瀏覽器儲存作授權依據。

## 產品語言與禁止事項

- 對外只說「案件紀錄」「提出人／處理人」「目前無法確認」「已有新版取代」「本次辨識未完成」。
- AI 只能稱「AI 初步檢核」，並標示「待 Human PCM 確認」。
- 禁止舊媒合／競價語彙、工程語、金流託管、支付保障、老屋投資、AI 最終決定、假案件、假成功與無作用 enabled button。

## 驗收契約

- TDD 必須先看到新 test 因 6 個 page source 檔與 manifest 缺少而 RED，再實作 GREEN。
- Node syntax：兩個 app.js 全通過。
- Browser：1280×720、768×1024、390×844；無水平溢出、console 0、資產 0 error。
- 44px：所有 enabled／disabled button、tab、link control 的 computed height 不小於 44px。
- exact10：Git 變更集合必須等於派令的 10 個新路徑；manifest 收 9 個非自身 receipts。
- final commit parent 必須為 `0b0037ff50a4dc5b1756fe3230588f12a01c5337`；commit 後 clean、staged 0。
