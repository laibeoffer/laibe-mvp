# PCM Missing Flow Pages Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add six fail-closed, source-only PCM flow pages and immutable canonical receipts without changing any existing file.

**Architecture:** Each flow state is an isolated static page folder containing `code.html`, `styles.css` and `app.js`. A single Node built-in test validates all six folders, the exact new-only write set, content boundaries, local links and canonical UTF-8/LF receipts.

**Tech Stack:** HTML5, CSS custom properties and responsive media queries, browser-native ES modules, Node.js built-in test runner.

## Global Constraints

- Base commit is exactly `0b0037ff50a4dc5b1756fe3230588f12a01c5337` with tree `57bb0dc3775af085810a60a6719c5fa898e98a8d`.
- Create exactly 22 new paths and modify zero existing paths.
- Do not change `public_home`, owner/vendor/signing/service-contract pages, shared routes, page shells, `site/**`, Auth, Supabase, packages or lockfiles.
- Do not introduce browser storage, demo data, legacy site content, payment custody, old-house investment copy or marketplace vocabulary.
- Unknown context always renders zero payload and zero enabled write action.
- Receipts use fatal UTF-8 decode with `ignoreBOM: true`, CRLF-to-LF normalization, lone-CR preservation and canonical bytes.
- Do not push, merge or deploy.

---

### Task 1: Freeze design and write-set contracts

**Files:**
- Create: `docs/superpowers/specs/2026-08-02-pcm-missing-flow-pages-design.md`
- Create: `docs/superpowers/plans/2026-08-02-pcm-missing-flow-pages.md`

**Interfaces:**
- Consumes: the Human-approved source order and the existing PCM brand specification.
- Produces: exact page, accessibility, responsive and evidence contracts for the test and source files.

- [ ] **Step 1: Record the Extension-mode design system and six page contracts.**

  Include the exact palette, first-screen facts, unknown-state rule and page-specific allowed content from the approved source order.

- [ ] **Step 2: Record the canonical receipt algorithm.**

  Specify `new TextDecoder('utf-8', { fatal: true, ignoreBOM: true })`, CRLF-only normalization, UTF-8 re-encoding and the three receipt values.

- [ ] **Step 3: Review both documents for placeholders and scope expansion.**

  Run: `Select-String -Path docs/superpowers/specs/2026-08-02-pcm-missing-flow-pages-design.md,docs/superpowers/plans/2026-08-02-pcm-missing-flow-pages.md -Pattern (('T'+'BD'),('T'+'ODO'),('implement'+' later'),('fill'+' in'))`

  Expected: no matches.

### Task 2: Create the RED contract test

**Files:**
- Create: `tests/pcm-missing-flow-pages.test.mjs`

**Interfaces:**
- Consumes: the six page folder names and exact 22-path manifest contract.
- Produces: `canonicalUtf8LfBytes(bytes)` and `canonicalReceipt(bytes)` helpers plus static page acceptance tests.

- [ ] **Step 1: Add canonical receipt regression tests.**

  The test constructs in-memory LF, CRLF, BOM, lone-CR and invalid UTF-8 byte arrays. It asserts LF/CRLF equality, BOM/no-BOM inequality, lone-CR preservation and invalid UTF-8 rejection.

- [ ] **Step 2: Add missing-page and manifest tests.**

  Assert that each folder contains exactly `app.js`, `code.html`, `styles.css`, that the manifest has the exact 22 paths, and that each non-manifest path has a canonical receipt.

- [ ] **Step 3: Add content, interaction and local-reference tests.**

  Assert first-screen labels, page-specific text, forbidden vocabulary absence, local asset existence, 44px minimum targets, responsive media rules, disabled write actions and no browser-storage authority.

- [ ] **Step 4: Run the new test and observe the intended RED.**

  Run: `node --test tests/pcm-missing-flow-pages.test.mjs`

  Expected: failure because the six page folders and manifest do not exist.

### Task 3: Implement the six page folders

**Files:**
- Create: `src/stitch_laibe_landing_onboarding/pcm_standalone/account_service_status/code.html`
- Create: `src/stitch_laibe_landing_onboarding/pcm_standalone/account_service_status/styles.css`
- Create: `src/stitch_laibe_landing_onboarding/pcm_standalone/account_service_status/app.js`
- Create: `src/stitch_laibe_landing_onboarding/pcm_standalone/access_unavailable/code.html`
- Create: `src/stitch_laibe_landing_onboarding/pcm_standalone/access_unavailable/styles.css`
- Create: `src/stitch_laibe_landing_onboarding/pcm_standalone/access_unavailable/app.js`
- Create: `src/stitch_laibe_landing_onboarding/pcm_standalone/document_corrections/code.html`
- Create: `src/stitch_laibe_landing_onboarding/pcm_standalone/document_corrections/styles.css`
- Create: `src/stitch_laibe_landing_onboarding/pcm_standalone/document_corrections/app.js`
- Create: `src/stitch_laibe_landing_onboarding/pcm_standalone/self_service_archive/code.html`
- Create: `src/stitch_laibe_landing_onboarding/pcm_standalone/self_service_archive/styles.css`
- Create: `src/stitch_laibe_landing_onboarding/pcm_standalone/self_service_archive/app.js`
- Create: `src/stitch_laibe_landing_onboarding/pcm_standalone/contract_prerequisites/code.html`
- Create: `src/stitch_laibe_landing_onboarding/pcm_standalone/contract_prerequisites/styles.css`
- Create: `src/stitch_laibe_landing_onboarding/pcm_standalone/contract_prerequisites/app.js`
- Create: `src/stitch_laibe_landing_onboarding/pcm_standalone/case_closeout/code.html`
- Create: `src/stitch_laibe_landing_onboarding/pcm_standalone/case_closeout/styles.css`
- Create: `src/stitch_laibe_landing_onboarding/pcm_standalone/case_closeout/app.js`

**Interfaces:**
- Consumes: only local static assets and safe relative links.
- Produces: six independent static source pages whose initial state is `CONTEXT_UNAVAILABLE`.

- [ ] **Step 1: Create semantic HTML for all six pages.**

  Each file contains a skip link, logo header, role and three state fields, next-responsible actor, latest-record field, page-specific content, safe return link and a module script reference.

- [ ] **Step 2: Create page-local CSS.**

  Each stylesheet declares LaiBE tokens, visible focus, 44px controls, responsive rules at 900px and 560px, overflow protection and reduced-motion behavior.

- [ ] **Step 3: Create inert fail-closed modules.**

  Each module exports an immutable `INITIAL_VIEW_STATE` with `CONTEXT_UNAVAILABLE`, empty payload and `writeActionsEnabled: false`, then applies only safe text states after `DOMContentLoaded`.

- [ ] **Step 4: Run the new test before the manifest exists.**

  Run: `node --test tests/pcm-missing-flow-pages.test.mjs`

  Expected: page-contract checks pass and manifest check fails because its file is not yet created.

### Task 4: Close the exact manifest and reach GREEN

**Files:**
- Create: `docs/governance/pcm-missing-flow-pages-manifest.v1.json`

**Interfaces:**
- Consumes: canonical bytes for the other 21 new paths.
- Produces: ordered `writeSet`, `receiptConvention` and 21 canonical artifact receipts.

- [ ] **Step 1: Generate canonical receipts for the 21 non-manifest files.**

  Use the same fatal UTF-8, BOM-preserving and CRLF-normalizing algorithm as the test helper. Record canonical byte count, SHA-256 and Git blob SHA-1.

- [ ] **Step 2: Write the manifest with exact path order.**

  The manifest itself is the only write-set entry without a receipt, avoiding self-referential hashing.

- [ ] **Step 3: Run the new test to GREEN.**

  Run: `node --test tests/pcm-missing-flow-pages.test.mjs`

  Expected: all tests pass with zero failures.

### Task 5: Browser acceptance and bounded completion

**Files:**
- Verify: all 22 new paths; modify only a failing path within the same ceiling.

**Interfaces:**
- Consumes: the six local pages and browser viewport evidence.
- Produces: a reproducible test, browser, Git-boundary and commit report.

- [ ] **Step 1: Serve the clean worktree without changing product files.**

  Use a temporary local static server bound to `127.0.0.1` and record its process ID and URL.

- [ ] **Step 2: Exercise all six pages at 1280px, 768px and 390px.**

  Check horizontal overflow, console errors, local asset failures, 44px controls, visible first-screen state facts and absence of enabled write actions.

- [ ] **Step 3: Run static and Git boundary checks.**

  Run the new test, syntax-check all six modules, search the full PCM source for forbidden marketplace vocabulary, run `git diff --check`, and compare the status path list with the manifest.

- [ ] **Step 4: Create one bounded local commit.**

  Stage only the exact 22 paths and commit them with parent `0b0037ff50a4dc5b1756fe3230588f12a01c5337`. Do not push, merge or deploy.

- [ ] **Step 5: Re-run the full completion checks on committed HEAD.**

  Confirm the worktree is clean, staged count is zero, commit parent and tree are recorded, and all new tests still pass.
