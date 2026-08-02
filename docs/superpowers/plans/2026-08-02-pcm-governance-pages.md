# PCM Governance Pages Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 新增 fail-closed 的 PCM 授權案件工作台與內部治理台，並以 exact10 manifest 綁定可交 A6 評估的 UI source candidate。

**Architecture:** 兩頁各自使用本地 HTML、CSS、ES module，不依賴 shared shell 或 runtime。JavaScript 只提供純狀態解析、view-model 正規化與 fail-closed 初始渲染；正式資料與授權由 A6 未來注入。

**Tech Stack:** HTML5、CSS custom properties、vanilla JavaScript ES modules、Node.js `node:test`、Codex in-app Browser。

## Global Constraints

- 只新增派令列出的 10 個路徑。
- 不修改既有頁、package／lock、Supabase、Auth、runtime、A2／A5／A6。
- 預設未授權、零案件 payload、零 enabled action。
- 所有 Human PCM 為裝潢專業人士；第一版人工指派，不做專業分科、自動分流或媒合。
- 不出現舊媒合語彙、工程語、金流託管、AI 最終決定或假成功。
- Final commit parent 固定為 `0b0037ff50a4dc5b1756fe3230588f12a01c5337`。

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

只有 active PCM session、active membership、相同 case binding 與 active contract 才回 `AUTHORIZED_READY`；其他狀態不得帶案件 payload。初始渲染 `ACCESS_DENIED` 且所有 action disabled。

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

只有 active admin session、governance administrator actor 與 active assignment 完整一致才回 `GOVERNANCE_READY`；預設 payload 全空、action 全 disabled。

- [ ] **Step 4: 執行測試**

Run: `node --test tests/pcm-governance-pages.test.mjs`

Expected: 除 manifest receipt 外全部 PASS。

### Task 4: Exact10 Manifest

**Files:**
- Create: `docs/governance/pcm-governance-pages-manifest.v1.json`

**Interfaces:**
- Consumes: 9 個非 manifest 新檔的 final bytes。
- Produces: exact writeSet、baseline commit/tree、每檔 bytes／SHA-256／Git blob SHA-1。

- [ ] **Step 1: 計算 9 個 receipts**

使用 PowerShell `Get-FileHash` 與 `git hash-object -- <path>` 取得 immutable receipts，不把 manifest 自身列入 receipts。

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
