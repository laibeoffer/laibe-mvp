# PCM Governance Pages Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 新增 fail-closed 的 PCM 授權案件工作台與內部治理台；分開保存原始 exact10 product write set 與 base→candidate exact13 cumulative Git evidence，供 A0／主線評估 UI source candidate。

**Architecture:** 兩頁各自使用本地 HTML、CSS、ES module，不依賴 shared shell 或 runtime。JavaScript 只提供純狀態解析、view-model 正規化與 fail-closed 初始渲染；正式資料與授權由 A6 未來注入。

**Tech Stack:** HTML5、CSS custom properties、vanilla JavaScript ES modules、Node.js `node:test`、Codex in-app Browser。

## Global Constraints

- 只新增派令列出的 10 個路徑。
- 不修改既有頁、package／lock、Supabase、Auth、runtime、A2／A5／A6。
- 預設未授權、零案件 payload、零 enabled action。
- 所有 Human PCM 為裝潢專業人士；第一版人工指派，不做專業分科、自動分流或媒合。
- 不出現舊媒合語彙、工程語、金流託管、AI 最終決定或假成功。
- 原始 source commit parent 為 `0b0037ff50a4dc5b1756fe3230588f12a01c5337`；本次 final bounded correction parent 固定為 `5e1fc58ad2a1b7f8f3ec3975d2b8a01b2755fc8a`。

---

### Task 1: Contract Test RED

**Files:**
- Create: `tests/pcm-governance-pages.test.mjs`

**Interfaces:**
- Consumes: Node.js built-ins、exact page paths。
- Produces: 兩頁存在性、狀態解析、產品語言、responsive、44px、exact10 manifest 契約。

- [ ] **Step 1: 寫入頁面與狀態契約測試**

測試必須要求 `pcm_authorized_console` 與 `internal_governance` 各有 `code.html`、`styles.css`、`app.js`，並驗證預設 fail closed、可信 tuple 才能 ready、HTML 必備工作區、CSS breakpoint／44px／focus／reduced motion、manifest exact10。

- [ ] **Step 2: 執行 RED**

Run: `node --test tests/pcm-governance-pages.test.mjs`

Expected: FAIL，原因為新頁或 manifest 尚不存在，不得是 syntax error。

### Task 2: PCM Authorized Console GREEN

**Files:**
- Create: `src/stitch_laibe_landing_onboarding/pcm_standalone/pcm_authorized_console/code.html`
- Create: `src/stitch_laibe_landing_onboarding/pcm_standalone/pcm_authorized_console/styles.css`
- Create: `src/stitch_laibe_landing_onboarding/pcm_standalone/pcm_authorized_console/app.js`

**Interfaces:**
- Consumes: A6 未來注入的 trusted context；本輪不建立 adapter。
- Produces: `PCM_AUTHORIZED_CONSOLE_STATES`、`INITIAL_PCM_CONSOLE_CONTEXT`、`resolvePcmAuthorizedConsoleState(context)`、`buildPcmAuthorizedConsoleViewModel(result, context)`。

- [ ] **Step 1: 建立語意 HTML**

首屏放置五欄事實帶；建立案件清單、案件工作台、文件完整性、文件／風險比對、補件、決策整理、里程碑／驗收治理、通訊待回覆與案件紀錄 landmark。所有操作預設 disabled。

- [ ] **Step 2: 建立 Extension 樣式**

沿用 0b0037 token；1280 雙欄、768 與 390 單欄；所有控制 `min-height: 44px`，提供 `:focus-visible`、`prefers-reduced-motion` 且禁止水平溢出。

- [ ] **Step 3: 實作純狀態解析**

只有 active PCM session、primitive non-empty actor／case IDs、closed primitive membership array、相同 case binding、active contract 與 requested case 精確一列才可依 closed status table 解析。`文件檢討中` 對應 `AUTHORIZED_READY`；`已封存` 對應 `CASE_ARCHIVED_READ_ONLY`；未知狀態、重複列、object／undefined／empty ID 一律 `ACCESS_DENIED` 且 payload／actions 為空。初始渲染仍為 `ACCESS_DENIED` 且所有 action disabled。

- [ ] **Step 4: 執行目標測試**

Run: `node --test tests/pcm-governance-pages.test.mjs --test-name-pattern="PCM 授權案件工作台"`

Expected: 該群組 PASS；內部治理與 manifest 仍可失敗。

### Task 3: Internal Governance GREEN

**Files:**
- Create: `src/stitch_laibe_landing_onboarding/pcm_standalone/internal_governance/code.html`
- Create: `src/stitch_laibe_landing_onboarding/pcm_standalone/internal_governance/styles.css`
- Create: `src/stitch_laibe_landing_onboarding/pcm_standalone/internal_governance/app.js`

**Interfaces:**
- Consumes: A6 未來注入的 trusted governance context。
- Produces: `PCM_INTERNAL_GOVERNANCE_STATES`、`INITIAL_GOVERNANCE_CONTEXT`、`resolveInternalGovernanceState(context)`、`buildInternalGovernanceViewModel(result, context)`。

- [ ] **Step 1: 建立治理 HTML 與責任邊界**

建立帳號、案件成員、角色權限、契約版本／狀態、存取／異動紀錄；首屏五欄事實帶明示管理者不取代 Human PCM 決定。

- [ ] **Step 2: 建立治理樣式與 responsive**

沿用相同 token 與控制尺寸；資料表在 390px 改成 label/value rows，不產生水平 overflow。

- [ ] **Step 3: 實作治理 fail-closed**

只有 active admin session、primitive non-empty exact actor IDs、governance administrator actor、active assignment 與 closed mode 完整一致才可繼續。mode 必須先於 records empty branch 驗證：`active`＋empty 為 `GOVERNANCE_EMPTY` 且只提供既定管理 actions；`active`＋records 為 `GOVERNANCE_READY`；`read_only`＋empty／records 都為 `GOVERNANCE_READ_ONLY` 且 actions 永遠空；缺失或未知 mode 一律 `GOVERNANCE_DENIED`。

### Admission fail-closed correction（parent `7c033382164e8f29218bf6ffb4afd3c953e88da6`）

- [ ] 先用 actual adversarial inputs 驗證 missing／empty／object IDs、undefined／object membership、duplicate rows、unknown case status、missing／unknown mode、read-only empty 與 visible-shell renderer copy，取得 RED。
- [ ] Resolver 只使用 closed primitive validation、exact cardinality 與 spec 明列 allowlist；禁止 truthy、object identity 或 unknown fallback。
- [ ] `AUTHORIZED_READY`、`CASE_ARCHIVED_READ_ONLY`、`GOVERNANCE_READY`、`GOVERNANCE_READ_ONLY` 的 renderer copy 必須與可見 shell 同步。
- [ ] Fresh 重跑 receipt invariants、focused governance 與完整 tests；只提交派令 exact6，A6 不得把 prototype resolver 當 runtime authority。

### Own-data／shared-prototype correction（parent `12b6fd3210f421e2478ab3b87f6c7b3139cf9e6d`）

- [ ] 先以 actual adversarial probes 覆蓋 sparse `membership.caseIds`／`authorizedCases`／records、revoked array Proxy、prototype-inherited actor／row、accessor field、null record，以及 post-load Array／Set／iterator hook，確認 RED。
- [ ] 所有 authority consumed fields 攔在 own enumerable data descriptor，descriptor 單次讀取；accessor、inherited、invalid 或 throwing input 一律 DENIED 且零 payload／actions。
- [ ] 三種 authority arrays 以 own-index dense numeric loop 驗證；authorized row 的 `id`／`status`／`nextOwner` 與 governance record 的 `id`／`category` 都是 primitive non-empty strings。
- [ ] Authority evaluation 只使用 captured safe intrinsics、numeric loops 與 direct mode/status equality；不呼叫 Array prototype `every`／`filter`／`map`／`includes`、`Set.prototype.has` 或 `Symbol.iterator`，輸出複製亦不用 iterator。
- [ ] Fresh 重跑 valid READY／READ_ONLY、所有歷次 adversarial probes、renderer copy、LF／CRLF、BOM、lone CR、invalid UTF-8 receipt invariants 與完整 suite；refresh manifest canonical receipts，再做 exact6 diff／commit gate。

### Final bounded length／renderer／evidence correction（parent `5e1fc58ad2a1b7f8f3ec3975d2b8a01b2755fc8a`）

- [ ] 先以 active Array Proxy 回報 `4294967296` length 與 post-load `Array.prototype.includes = () => true` renderer 實際重現 RangeError／private-shell fail open，取得 RED。
- [ ] Dense array 在 allocation 前要求 own data length 是 captured safe integer 且 `0..1000`；NaN、Infinity、負數、小數、超界、throwing descriptor、revoked Proxy 均不 throw並回 DENIED／zero payload／actions，allocation/copy 全段 exception-safe。
- [ ] 兩個 renderer 只讀 own enumerable data state，以 direct closed equality 決定 private shell；denied／unknown／inherited／accessor state 均 fail closed，READY／READ_ONLY 不退步。
- [ ] Manifest 分開 `originalProductWriteSet` exact10 與 fresh Git base→candidate `cumulativeGitPathSet` exact13，列 correction chain exact parents，並驗證 cumulative 中 12 個 non-self-manifest canonical receipts。
- [ ] Fresh 執行 focused、full suite、syntax、receipt invariants、strict UTF-8、immediate／cumulative exact path、parent、exact6 與 postcommit clean/staged0 gates；只建一筆 local commit，不自我 admission。

- [ ] **Step 4: 執行測試**

Run: `node --test tests/pcm-governance-pages.test.mjs`

Expected: 除 manifest receipt 外全部 PASS。

### Task 4: Exact10 Product Set / Exact13 Cumulative Manifest

**Files:**
- Create: `docs/governance/pcm-governance-pages-manifest.v1.json`

**Interfaces:**
- Consumes: cumulative exact13 中除本 manifest 外的 12 檔；每檔先以 fatal UTF-8 解碼，再只將 CRLF 正規化為 LF。
- Produces: `originalProductWriteSet` exact10、fresh Git `cumulativeGitPathSet` exact13、correction chain exact parents、baseline commit/tree，以及 `UTF8_LF_CANONICAL_BYTES_GIT_BLOB_SHA1_V1` 的 canonical bytes／SHA-256／Git blob SHA-1；不宣稱 working-tree raw bytes。

- [ ] **Step 1: 計算 12 個 receipts**

使用與測試相同的 UTF-8/LF canonical helper 計算 immutable receipts；先用 in-memory LF／CRLF 同內容向量證明 bytes、SHA-256 與 Git blob SHA-1 完全一致，不寫暫存檔，也不把 manifest 自身列入 receipts。

- [ ] **Step 2: 寫入 manifest 並執行 GREEN**

Run: `node --test tests/pcm-governance-pages.test.mjs`

Expected: 全部 PASS、0 fail。

### Task 5: Browser QA and Bounded Commit

**Files:**
- Verify only: 兩頁 source 與 manifest。

**Interfaces:**
- Consumes: static source candidate。
- Produces: 1280／768／390 QA facts與本機 immutable commit。

- [ ] **Step 1: 啟動最小 static server**

Run from repository parent: `python -m http.server <port> --bind 127.0.0.1 --directory <worktree>`

Expected: 兩頁 HTML、CSS、JS、logo 全為 HTTP 200。

- [ ] **Step 2: 執行三 viewport QA**

逐頁驗證 1280×720、768×1024、390×844：`scrollWidth <= innerWidth`、console warning/error 0、所有可見控制高度至少 44px、首屏五欄可讀、零 enabled action。

- [ ] **Step 3: Fresh technical gate**

Run:

```powershell
node --check src/stitch_laibe_landing_onboarding/pcm_standalone/pcm_authorized_console/app.js
node --check src/stitch_laibe_landing_onboarding/pcm_standalone/internal_governance/app.js
node --test tests/pcm-governance-pages.test.mjs
git diff --check
```

Expected: syntax 2/2、tests 0 fail、diff check 0 error。

- [ ] **Step 4: 驗證 exact10 並 commit**

只 stage exact10，確認 staged set 等於 manifest writeSet，commit message 使用 `feat(pcm): add governance page sources`。

- [ ] **Step 5: 驗證 immutable result**

確認 commit parent 為 exact seed、worktree clean、staged 0；不 push、merge、deploy 或建立 PR。
