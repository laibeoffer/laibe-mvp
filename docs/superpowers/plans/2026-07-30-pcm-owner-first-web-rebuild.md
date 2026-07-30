# PCM 甲方主導上線網頁重整實作計畫

> **執行要求：** 依序使用 TDD 完成每一項；每一項先看見正確 RED，再做最小 GREEN。不得修改 8765／既有萊比 donor 原頁，不得把尚未部署的 A5／A14 能力寫成已上線。

**目標：** 將 PCM 獨立上線頁面改造成甲方主導的市場測試入口：甲方先註冊並提供乙方報價單與施工圖 PDF，萊比提出基本檢討報告後，甲方再決定是否簽 PCM 服務契約；簽約後才邀請乙方，進入三方公開、可追溯的里程碑治理。

**架構：** 保留既有 PCM namespace 與首頁黃色箭牌視覺。所有 donor 頁面只複製其可用資訊架構，再以 PCM 元件與文案重建。瀏覽器端只呈現流程與安全的前端狀態；正式登入、文件保存、案件事件、LINE 與 A5 知識／Core 讀寫皆由明確 readiness gate 控制，未解鎖時 fail closed。

**技術：** 靜態 HTML/CSS/ES modules、Node `node:test`、既有 Supabase Edge／migration 契約、Playwright 瀏覽器驗收。

---

## Task 1：鎖定首頁與公開路由的新契約

**Files**

- Modify: `tests/pcm-public-home.test.mjs`
- Modify: `src/stitch_laibe_landing_onboarding/pcm_standalone/public/public-contract.js`
- Modify: `src/stitch_laibe_landing_onboarding/pcm_standalone/public_home/code.html`
- Modify: `src/stitch_laibe_landing_onboarding/pcm_standalone/public_home/styles.css`

**Steps**

1. 先改測試，要求：
   - 公開主要對象只有 `owner`；乙方是簽約後受邀角色，不是公開接案入口。
   - `startCase` 指向存在的 `owner_start/code.html`；所有路由均可解析。
   - 首頁兩個主 CTA 文案為「註冊並上傳文件」。
   - 黃色箭牌共六段：資格確認、註冊上傳、基本檢討、服務簽署、邀請乙方、里程碑治理。
   - 必備文件為乙方報價單 PDF 與施工圖 PDF（至少平面圖）。
   - 明確揭露 3% PCM 服務費、簽約時支付總服務費 10%、其餘 90% 依里程碑比例成立，以及萊比不代收工程款。
   - 異議、逐項回復、暫緩、自行驗收、48 小時補正與終止後持續下載皆有正確產品文案。
   - 不出現公共乙方 CTA、工程語、金流託管、最低價／零風險、老屋投資，亦不把 LINE 或 PCM 判讀寫成案件真相本身。
2. Run: `node --test tests/pcm-public-home.test.mjs`
3. 確認因新路由／新文案缺失而 RED。
4. 最小修改 route contract、HTML 與既有箭牌 CSS，使測試 GREEN。
5. Run: `node --test tests/pcm-public-home.test.mjs`

## Task 2：建立甲方註冊與文件收件入口

**Files**

- Add: `src/stitch_laibe_landing_onboarding/pcm_standalone/owner_start/code.html`
- Add: `src/stitch_laibe_landing_onboarding/pcm_standalone/owner_start/styles.css`
- Add: `src/stitch_laibe_landing_onboarding/pcm_standalone/owner_start/app.js`
- Add: `src/stitch_laibe_landing_onboarding/pcm_standalone/public/owner-onboarding-contract.js`
- Add: `tests/pcm-owner-onboarding.test.mjs`

**Steps**

1. 先寫測試，固定：
   - 頁面五秒內呈現目前狀態「尚未建立案件」、下一步「註冊後提供兩份 PDF」及責任人「甲方」。
   - 收件槽只有 `contractor_quote_pdf` 與 `construction_drawing_pdf`；施工圖提示至少包含平面圖。
   - 未完成登入／Storage readiness 時，檔案輸入與送出動作 fail closed，產品語為「正式收件設定完成後即可上傳」，不得收進記憶體外的持久位置。
   - 檔案只接受 PDF，大小、空檔、錯誤與重試都有可理解文案；不提供 JPEG/PNG。
   - 頁面不複製 donor 的招標、競標、付款、虛構客戶資料或外部圖片。
2. Run: `node --test tests/pcm-owner-onboarding.test.mjs`
3. 確認 module/page 缺失 RED。
4. 以 `client_document_selection` 的文件總覽資訊架構為參考，在 PCM namespace 重建，不修改 donor。
5. Run: `node --test tests/pcm-owner-onboarding.test.mjs`

## Task 3：建立基本檢討報告預覽

**Files**

- Add: `src/stitch_laibe_landing_onboarding/pcm_standalone/basic_report/code.html`
- Add: `src/stitch_laibe_landing_onboarding/pcm_standalone/basic_report/styles.css`
- Add: `src/stitch_laibe_landing_onboarding/pcm_standalone/basic_report/app.js`
- Add: `src/stitch_laibe_landing_onboarding/pcm_standalone/public/basic-report-contract.js`
- Add: `tests/pcm-basic-report.test.mjs`
- Modify: `src/stitch_laibe_landing_onboarding/pcm_standalone/public/public-contract.js`

**Steps**

1. 先寫測試，固定報告只包含文件完整性、版次、報價範圍差異、施工圖對照、待補件與下一步；每一項必須能引用文件與版次。
2. 固定 `formalImpact: "none"`：基本檢討不得被表述為正式驗收、法律意見、價格保證或付款授權。
3. 參考 `preview_budget` 與 `budget_document_preview` 的文件閱讀層級，在 PCM namespace 建立無真實案件資料的報告格式。
4. Run RED/GREEN: `node --test tests/pcm-basic-report.test.mjs`

## Task 4：實作里程碑治理純領域核心

**Files**

- Add: `src/stitch_laibe_landing_onboarding/pcm_standalone/core/milestone-governance-aggregate.js`
- Modify: `src/stitch_laibe_landing_onboarding/pcm_standalone/core/index.js`
- Add: `tests/pcm-milestone-governance.test.mjs`

**Steps**

1. 先以測試建立不可變狀態與事件：
   - `PCM_MILESTONE_REVIEW_PUBLISHED`
   - `OWNER_OBJECTION_SUBMITTED`
   - `PCM_OBJECTION_RESPONSE_PUBLISHED`
   - `INSPECTION_DEFERRAL_REQUESTED/ACCEPTED/REJECTED`
   - `NON_SIGNOFF_CURE_STARTED/CANCELLED`
   - `BILATERAL_ACCEPTANCE_AGREEMENT_CONFIRMED`
   - `OWNER_OVERRIDE_ACCEPTANCE`
   - `PCM_SERVICE_TERMINATED_BY_OWNER`
   - `FUTURE_PCM_INVOICES_CANCELLED`
2. 測試所有 command 均需 case、milestone、actor、expected version、idempotency key 與引用文件版次。
3. 測試異議／證據取消倒數，PCM 回復後重給完整期限；暫緩需乙方同意；48 小時只是最後補正，不是一般驗收期間。
4. 測試甲方自行驗收只在甲乙確認同一協議版本後成立，PCM 原意見保留、後續里程碑繼續、不推定工程款到期。
5. 測試終止同時停止未發生請款、保留 10% 扣抵效果、甲乙仍可讀取／下載／匯出與直接協議，PCM 失去新增介入權限。
6. Run RED/GREEN: `node --test tests/pcm-milestone-governance.test.mjs`

## Task 5：加入 A5 exact-head 相容閘門

**Files**

- Add: `src/stitch_laibe_landing_onboarding/pcm_standalone/integrations/a5-core-contract.js`
- Add: `tests/pcm-a5-core-contract.test.mjs`
- Add: `docs/governance/PCM_A5_CORE_INTEGRATION_GATE_20260730.md`

**Steps**

1. 先寫測試固定 A5 candidate identity `2c4418301be57b86a87ba0d83e37cd3d237ea302`。
2. adapter 只宣告可安全使用的公開 read RPC：
   - `gateway_search_knowledge`
   - `gateway_get_knowledge_entry`
   - `gateway_get_case_evidence`
3. 明確拒絕：
   - 冒用 A12 專屬 `gateway_record_finding`
   - 直接 CRUD `knowledge`／`casework` private tables
   - 在沒有 A0 專用文件／事件 RPC 時宣稱已寫入 Core
   - JPEG/PNG canonical 文件
4. readiness 只有在 exact bundle、migration apply、Edge deploy、active session claims 與 A0 專用寫入 contract 全部驗證後才可啟用寫入；否則 UI 使用產品語顯示功能正在整理。
5. Run RED/GREEN: `node --test tests/pcm-a5-core-contract.test.mjs`

## Task 6：加入 A14 LINE adapter fail-closed 閘門

**Files**

- Add: `src/stitch_laibe_landing_onboarding/pcm_standalone/integrations/a14-line-contract.js`
- Add: `tests/pcm-a14-line-contract.test.mjs`
- Add: `docs/governance/PCM_A14_LINE_INTEGRATION_GATE_20260730.md`

**Steps**

1. 先寫測試固定 A14 現況為 local dirty candidate、未 commit／apply／deploy，不得對外顯示為可用。
2. readiness gate 至少要求：
   - typed accountLink facts 與 DB-owned settlement clock
   - accepted pending input 可跨 expiry 安全重試
   - account-link enqueue／binding 原子 adopt
   - `PublicSafeText` 單一 sink boundary
   - OS-owned 完整 process containment gate
   - 正式網站 continuation route、active session consumer、worker invoker、provider、private bucket、secrets、scheduler 及監控
3. 未通過時，首頁只能說「案件通知與三方訊息入口將於設定完成後開放」，不得顯示「已綁定 LINE」或將 LINE 訊息當 canonical event。
4. Run RED/GREEN: `node --test tests/pcm-a14-line-contract.test.mjs`

## Task 7：完整驗證與瀏覽器 QA

**Files**

- Modify only files exposed by failed verification.

**Steps**

1. Run focused:
   - `node --test tests/pcm-public-home.test.mjs`
   - `node --test tests/pcm-owner-onboarding.test.mjs`
   - `node --test tests/pcm-basic-report.test.mjs`
   - `node --test tests/pcm-milestone-governance.test.mjs`
   - `node --test tests/pcm-a5-core-contract.test.mjs`
   - `node --test tests/pcm-a14-line-contract.test.mjs`
2. Run existing PCM regression:
   - `node --test tests/pcm-standalone-core.test.mjs`
   - `node --test tests/pcm-standalone-workbench.test.mjs`
   - `node --test tests/pcm-public-intake-ui.test.mjs`
3. Run `git diff --check`，並另掃 untracked 檔案的衝突標記與行尾空白。
4. 以全新本機服務和硬性 timeout 驗收：
   - Desktop 1440×900
   - Mobile 390×844
   - 首頁兩個 CTA、所有錨點、owner start 與 basic report 路由
   - 無水平溢出、console error 0、warning 0
5. 逐項回報哪些是真正可用、哪些仍由 readiness gate 阻擋；不得 apply migration、deploy、設 secret、改 LINE Manager、push、開 PR 或 merge。
