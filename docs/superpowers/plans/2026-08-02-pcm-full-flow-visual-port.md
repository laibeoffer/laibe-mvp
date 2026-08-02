# PCM Full-flow Visual Port Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 將四個 Human 指定 LaiBE 母版轉譯為安全、同風格、可驗收的 PCM 服務契約、甲方工作台、乙方工作台與甲乙方契約簽訂頁。

**Architecture:** 保留 static HTML/CSS/ES module 結構。既有 v0.3 契約與 owner fail-closed runtime 保留；新增 vendor/signing runtime 只實作純 UI state evaluator。正式資料只從 trusted adapter 進入，預設零資料。

**Tech Stack:** HTML5、CSS、browser-native ES modules、Node `node:test`；不新增 dependency。

**Execution status:** 本計畫七項工作均已完成；逐項 TDD、browser QA、完整 PCM 回歸與 immutable manifest 證據見 `docs/governance/pcm-full-flow-visual-port-manifest.v1.json`。

## Global Constraints

- Base：`b07ff9c0b4b875bd6123e4c65ecaff87e564d39b`。
- Worktree：`C:\CodexWork\08-Jacky\worktrees\laibe_MVP_project\aa-pcm-full-flow-visual-port-20260802`。
- 不修改 Supabase、Auth、migration、A5／R0 contracts、package／lock 或其他 agent worktree。
- 四頁禁詞掃描必須為零；所有可見 route 必須 resolve。
- 每個 task 都要先觀察預期 RED，再做最小 GREEN。

---

### Task 1: Freeze source and route contracts

**Files:**
- Create: `tests/pcm-full-flow-visual-port.test.mjs`

**Interfaces:**
- Consumes: design spec 中四份 SHA-256。
- Produces: 四個 canonical target routes、視覺 landmark、禁詞與 fail-closed assertions。

- [ ] **Step 1: Write failing tests**

  測試四頁存在、母版 landmark、exact local routes/assets、無空連結、無禁詞、無 browser authority。

- [ ] **Step 2: Verify RED**

  Run: `node --test tests/pcm-full-flow-visual-port.test.mjs`

  Expected: `vendor_workspace`、`contract_signing` 不存在；既有兩頁缺 pinned visual landmarks。

- [ ] **Step 3: Keep the test as the acceptance contract**

  不因實作困難縮小 assertion；每次新增互動都加入 loading／empty／error／disabled 或 readonly state。

### Task 2: PCM service contract visual port

**Files:**
- Modify: `src/stitch_laibe_landing_onboarding/pcm_standalone/service_contract/code.html`
- Modify: `src/stitch_laibe_landing_onboarding/pcm_standalone/service_contract/styles.css`
- Modify: `src/stitch_laibe_landing_onboarding/pcm_standalone/service_contract/contract-content.js`
- Modify: `tests/pcm-service-contract.test.mjs`

**Interfaces:**
- Consumes: `PCM_SERVICE_CONTRACT` v0.3 and existing readiness evaluator.
- Produces: orange folder, two paper panels, full contract reader, print and disabled signing action.

- [ ] **Step 1:** Add source-specific folder/paper/button RED assertions.
- [ ] **Step 2:** Run visual-port and service-contract tests; confirm expected failure.
- [ ] **Step 3:** Recompose HTML/CSS around the existing canonical renderer.
- [ ] **Step 4:** Run `node --test tests/pcm-service-contract.test.mjs tests/pcm-full-flow-visual-port.test.mjs`; expect GREEN.

### Task 3: Owner workspace visual port

**Files:**
- Modify: `src/stitch_laibe_landing_onboarding/client_awarding_dashboard/code.html`
- Modify: `src/stitch_laibe_landing_onboarding/client_awarding_dashboard/styles.css`
- Modify only if required for tab state: `src/stitch_laibe_landing_onboarding/client_awarding_dashboard/app.js`

**Interfaces:**
- Consumes: `resolveOwnerWorkspaceState()` and trusted-message receipt verification.
- Produces: source-matched header, four-stage banner, owner tabs, dense dashboard and zero-data states.

- [ ] **Step 1:** Add RED for header/stages/tabs/dashboard.
- [ ] **Step 2:** Run owner tests and verify only visual landmarks fail.
- [ ] **Step 3:** Recompose HTML/CSS without weakening authorization gates.
- [ ] **Step 4:** Run owner and visual-port tests; expect GREEN.

### Task 4: Vendor workspace

**Files:**
- Create: `src/stitch_laibe_landing_onboarding/pcm_standalone/vendor_workspace/code.html`
- Create: `src/stitch_laibe_landing_onboarding/pcm_standalone/vendor_workspace/styles.css`
- Create: `src/stitch_laibe_landing_onboarding/pcm_standalone/vendor_workspace/app.js`

**Interfaces:**
- Consumes: optional `globalThis.__LAIBE_VENDOR_WORKSPACE_ADAPTER__`.
- Produces: `resolveVendorWorkspaceState()` with checking, denied, contract-pending, empty, ready, archived-readonly and retryable states.

- [ ] **Step 1:** Add RED for missing files, tab labels, dashboard structure and evaluator mutations.
- [ ] **Step 2:** Run focused RED.
- [ ] **Step 3:** Implement source-matched shell, sidebar, four summary cards, calendar/message split and default zero-data access panel.
- [ ] **Step 4:** Run focused GREEN and prove query/storage cannot authorize.

### Task 5: Owner-vendor contract signing

**Files:**
- Create: `src/stitch_laibe_landing_onboarding/pcm_standalone/contract_signing/code.html`
- Create: `src/stitch_laibe_landing_onboarding/pcm_standalone/contract_signing/styles.css`
- Create: `src/stitch_laibe_landing_onboarding/pcm_standalone/contract_signing/app.js`

**Interfaces:**
- Consumes: optional `globalThis.__LAIBE_CONTRACT_SIGNING_ADAPTER__`.
- Produces: `evaluateContractSigningReadiness()` and seven-step visual workspace; no durable write.

- [ ] **Step 1:** Add RED for missing route and every prerequisite mutation.
- [ ] **Step 2:** Run focused RED.
- [ ] **Step 3:** Implement summary, seven-step rail, contract preview, signature panel and disabled default.
- [ ] **Step 4:** Run focused GREEN and verify no third-party signer/payment control.

  UI source 階段即使純 readiness evaluator 通過，也不得啟用沒有 A6 action／A5 durable writer 的簽署按鈕；待補狀態不得渲染傳入案件 payload。

### Task 6: Bounded routes and language cleanup

**Files:**
- Verify unchanged: `src/stitch_laibe_landing_onboarding/pcm_standalone/public_home/code.html`
- Modify only the four target page files where a local route or asset correction is required.

**Interfaces:**
- Produces: public home既有服務契約入口維持有效；簽署與甲乙方工作台只由未來可信受保護流程進入，乙方仍是邀請制。

- [ ] **Step 1:** Add failing route assertions.
- [ ] **Step 2:** Verify existing truthful routes; do not expose protected workspaces through a public shortcut.
- [ ] **Step 3:** Scan target HTML/CSS/JS for banned marketplace, engineering, payment-custody and investment copy.
- [ ] **Step 4:** Run all PCM source tests.

### Task 7: Verification and immutable source receipt

**Files:**
- Create: `docs/governance/pcm-full-flow-visual-port-manifest.v1.json`

**Interfaces:**
- Produces: exact base、changed-path inventory，以及 `UTF8_LF_CANONICAL_BYTES_GIT_BLOB_SHA1_V1` receipts：以 fatal UTF-8 解碼後只將 CRLF 正規化為 LF，再計算 canonical bytes、SHA-256 與 Git blob SHA-1；不宣稱 working-tree raw bytes。

- [ ] **Step 1:** Run all PCM tests and `node --check` on changed JS/MJS.
- [ ] **Step 2:** Run strict UTF-8, local route/asset, forbidden-copy and `git diff --check`.
- [ ] **Step 3:** Serve the isolated worktree and inspect four pages at desktop, tablet and mobile.
- [ ] **Step 4:** Record canonical UTF-8/LF source hashes and worktree state，並用 in-memory LF／CRLF vector 驗證 receipt 可攜性；do not claim Auth/runtime/writer/production acceptance.

## Self-review

- Spec coverage：四頁、母版、禁詞、fail-closed、routes 與四層 gate 都有 task。
- Placeholder scan：沒有 TBD／TODO；未來功能以明確 HOLD boundary 表達。
- Type consistency：新 evaluator 名稱與 tests/interfaces 一致。
