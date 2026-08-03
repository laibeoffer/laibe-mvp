# LaiBE PCM Owner-First End-to-End Flow Integration Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build one truthful, recoverable, owner-first PCM source flow from the public homepage through document preparation, report, service decision, contract, workspaces, records, closeout, and legacy retirement.

**Architecture:** A route manifest defines lifecycle, role, gate, owner, and graph edges. A shared fail-closed state layer renders role/state/next-actor/trace facts without case payload when G2 or G3 is closed. Each page remains static-source compatible and receives a bounded RED→GREEN package before the final cross-page browser gate.

**Tech Stack:** Static HTML, CSS, ES modules, Node.js built-in test runner, Python loopback preview, and browser-based acceptance.

## Global Constraints

- Work only in `C:\CodexWork\08-Jacky\worktrees\laibe_MVP_project\a0-design-pcm-owner-first-integration-20260803` on `a0/design-pcm-owner-first-integration-20260803`.
- Use one writer and execute T0–T18 serially; do not modify shared files in parallel.
- G1 is the only active implementation gate. G2, G3, and G4 remain closed.
- Do not modify `apps/**`, `packages/**`, `supabase/**`, `src/lib/contracts/**`, root package/lock/config, or A1/R0/A9/A14-owned source.
- Do not merge, rebase, push, open a pull request, deploy, apply migrations, write production, or alter secrets.
- Visible UI uses Traditional Chinese and contains no market-bidding vocabulary, payment custody/collection, old-house investment, fabricated results, or external engineering language.
- Existing valid routes, fragment compatibility, LaiBE logo assets, and canonical contract content are protected.
- Every package starts with an actual failing test and ends with fresh verification, exact-path review, one bounded local commit, and a clean worktree.
- T18 must verify 1280×900, 768×1024, and 390×844, zero horizontal overflow, zero console warning/error, zero visible controls smaller than 44×44, valid local routes/assets/fragments, and evidence bound to one commit.

---

### Task T0: Canonical route manifest and fail-closed continuation

**Files:**
- Create: `src/stitch_laibe_landing_onboarding/pcm_standalone/public/pcm-flow-route-manifest.js`
- Modify: `src/stitch_laibe_landing_onboarding/pcm_standalone/public/public-contract.js`
- Create: `tests/pcm-owner-first-route-manifest.test.mjs`
- Create: `docs/superpowers/specs/2026-08-03-pcm-owner-first-full-site-design.md`
- Create: `docs/superpowers/plans/2026-08-03-laibe-pcm-end-to-end-flow-integration.md`
- Create: `docs/governance/pcm-owner-first-execution-manifest.v1.json`

**Interfaces:**
- Produces: `PCM_FLOW_ROUTE_MANIFEST`, `getActiveRouteHref(routeKey)`, `PUBLIC_ROUTES`, and `resolvePcmFlowContinuation(context)`.
- Consumes: existing local page paths from the A3 seed and S0 new-only inclusion.

- [x] **Step 1: Write the failing route-manifest test**

  Assert G1–G4, active/planned/retired nodes, all four edge kinds, active local destinations, non-clickable planned nodes, complete public route vocabulary, and strict closed continuation.

- [x] **Step 2: Run RED**

  Run: `node --test tests/pcm-owner-first-route-manifest.test.mjs`

  Expected: fail because `pcm-flow-route-manifest.js`, canonical route properties, and `resolvePcmFlowContinuation` do not exist.

- [x] **Step 3: Implement minimal GREEN**

  Create immutable nodes, edges, and gates. Add backward-compatible direct route properties. Resolve only public G1 intents; route unknown, missing, malformed, or protected intents to `accessUnavailable` without payload or mutation.

- [x] **Step 4: Record the approved design and execution contract**

  Save the route hierarchy, four gates, shared fact spine, content rules, T0–T18 packages, and exact write sets in the spec, plan, and governance manifest.

- [x] **Step 5: Verify T0**

  Run:

  ```powershell
  node --test tests\pcm-owner-first-route-manifest.test.mjs
  node --test tests\pcm-public-home.test.mjs tests\pcm-missing-flow-pages.test.mjs
  node --check src\stitch_laibe_landing_onboarding\pcm_standalone\public\pcm-flow-route-manifest.js
  node --check src\stitch_laibe_landing_onboarding\pcm_standalone\public\public-contract.js
  git diff --check
  ```

  Expected: all tests pass, syntax checks exit 0, and diff check is clean.

- [x] **Step 6: Commit T0**

  Stage only the six T0 paths and run `git commit -m "feat(pcm): define owner-first route contract"`.

---

### Task T1: Shared visual tokens and fail-closed state system

**Files:**
- Create: `src/stitch_laibe_landing_onboarding/pcm_standalone/shared/owner-first-tokens.css`
- Create: `src/stitch_laibe_landing_onboarding/pcm_standalone/shared/owner-first-shell.css`
- Create: `src/stitch_laibe_landing_onboarding/pcm_standalone/shared/owner-first-state.js`
- Create: `tests/pcm-owner-first-shared-system.test.mjs`
- Modify: the T0 spec, plan, and governance manifest.

**Interfaces:**
- Produces: shared CSS tokens/classes and `resolveOwnerFirstState(input)` for safe fact-spine state.
- Consumes: G1–G4 names and `accessUnavailable` recovery route from T0.

- [ ] **Step 1: Record the exact seven-path T1 write set in the plan and governance manifest.**
- [ ] **Step 2: Write RED tests for the six closed states, zero payload/mutation, product-language copy, 44px controls, focus-visible, reduced motion, and 1280/768/390 overflow rules.**
- [ ] **Step 3: Run `node --test tests/pcm-owner-first-shared-system.test.mjs` and confirm the expected missing-module/style failures.**
- [ ] **Step 4: Implement the minimal shared tokens, shell, fact spine, and state resolver.**
- [ ] **Step 5: Run the focused test, all existing PCM tests, JavaScript syntax checks, UTF-8 checks, forbidden-language checks, and `git diff --check`.**
- [ ] **Step 6: Review Critical/Important findings to zero and commit with `git commit -m "feat(pcm): add owner-first shared interface system"`.**

---

### Task T2: Public homepage hierarchy

**Files:**
- Modify: `src/stitch_laibe_landing_onboarding/pcm_standalone/public_home/code.html`
- Modify: `src/stitch_laibe_landing_onboarding/pcm_standalone/public_home/styles.css`
- Modify only if route binding requires it: `src/stitch_laibe_landing_onboarding/pcm_standalone/public_home/app.js`
- Create: `tests/pcm-owner-first-public-home.test.mjs`
- Modify: the spec, plan, and governance manifest.

**Interfaces:**
- Consumes: `PUBLIC_ROUTES`, shared tokens, shared shell, and safe route continuation.
- Produces: Hero → qualification → PCM checks → clearly labeled result-format example → four-stage flow → fee/boundary → final CTA.

- [ ] **Step 1: Record the exact T2 write set, including whether `app.js` is needed.**
- [ ] **Step 2: Write RED assertions for the seven-section order, one primary CTA per section, preserved `#case-flow` and `#service-fee`, removed duplicate six-step content, and valid contract/owner-start destinations.**
- [ ] **Step 3: Run the focused test and confirm hierarchy failures.**
- [ ] **Step 4: Recompose only the homepage using existing brand assets and shared tokens.**
- [ ] **Step 5: Verify focused and regression tests plus 1280/768/390 browser behavior, console, overflow, focus, and touch targets.**
- [ ] **Step 6: Commit with `git commit -m "feat(pcm): focus public home on owner decisions"`.**

---

### Task T3: Owner entry and account preparation

**Files:**
- Modify: `src/stitch_laibe_landing_onboarding/pcm_standalone/owner_start/code.html`
- Modify: `src/stitch_laibe_landing_onboarding/pcm_standalone/owner_start/styles.css`
- Modify: `src/stitch_laibe_landing_onboarding/pcm_standalone/owner_start/app.js`
- Modify: `src/stitch_laibe_landing_onboarding/pcm_standalone/public_intake/code.html`
- Modify: `src/stitch_laibe_landing_onboarding/pcm_standalone/public_intake/styles.css`
- Modify: `src/stitch_laibe_landing_onboarding/pcm_standalone/public_intake/app.js`
- Create: `tests/pcm-owner-first-owner-entry.test.mjs`
- Modify: the spec, plan, and governance manifest.

**Interfaces:**
- Consumes: shared states and public route contract.
- Produces: truthful registration-preparation, login-preparation, and document-intake states without claiming G2 or G3 readiness.

- [ ] **Step 1: Record the exact T3 write set.**
- [ ] **Step 2: Write RED tests for role/purpose/state/next actor/trace, preserved form field contracts, readable empty/error states, and safe recovery.**
- [ ] **Step 3: Run the focused test and confirm failures against the current manual-like entry pages.**
- [ ] **Step 4: Implement the smallest owner-first entry and intake changes without adding a writer.**
- [ ] **Step 5: Verify focused/regression tests, syntax, routes, and responsive controls.**
- [ ] **Step 6: Commit with `git commit -m "feat(pcm): clarify owner entry and intake"`.**

---

### Task T4: Document checks, corrections, and resubmission

**Files:**
- Modify: `src/stitch_laibe_landing_onboarding/pcm_standalone/document_corrections/code.html`
- Modify: `src/stitch_laibe_landing_onboarding/pcm_standalone/document_corrections/styles.css`
- Modify: `src/stitch_laibe_landing_onboarding/pcm_standalone/document_corrections/app.js`
- Create: `tests/pcm-owner-first-document-corrections.test.mjs`
- Modify: the spec, plan, and governance manifest.

**Interfaces:**
- Consumes: shared fact spine and route contract.
- Produces: format, file-size, page-count, readability, correction-responsibility, and resubmission states.

- [ ] **Step 1: Record the exact T4 write set.**
- [ ] **Step 2: Write RED tests for the four check types, next actor, preserved return/continue routes, and no fabricated upload success.**
- [ ] **Step 3: Run RED, implement minimal GREEN, and run focused tests.**
- [ ] **Step 4: Verify all PCM tests, syntax, local links, and responsive states.**
- [ ] **Step 5: Commit with `git commit -m "feat(pcm): add truthful document correction flow"`.**

---

### Task T5: Three result views for owner decisions

**Files:**
- Modify: `src/stitch_laibe_landing_onboarding/pcm_standalone/basic_report/code.html`
- Modify: `src/stitch_laibe_landing_onboarding/pcm_standalone/basic_report/styles.css`
- Modify: `src/stitch_laibe_landing_onboarding/pcm_standalone/basic_report/app.js`
- Create: `tests/pcm-owner-first-basic-results.test.mjs`
- Modify: the spec, plan, and governance manifest.

**Interfaces:**
- Produces: quotation result, drawing result, and combined basic-review result tabs; each shows referenced version, confirmed items, differences/missing items, uncertainty, next step, next actor, and trace method.

- [ ] **Step 1: Record the exact T5 write set.**
- [ ] **Step 2: Write RED tests for all three result structures and the label `格式示意，非真實案件`.**
- [ ] **Step 3: Verify RED, implement minimal GREEN without invented case data, and re-run focused tests.**
- [ ] **Step 4: Verify fragment tab behavior, keyboard operation, regressions, and responsive layouts.**
- [ ] **Step 5: Commit with `git commit -m "feat(pcm): structure owner-facing basic results"`.**

---

### Task T6: Formal PCM or self-service decision branch

**Files:**
- Modify: `src/stitch_laibe_landing_onboarding/pcm_standalone/account_service_status/code.html`
- Modify: `src/stitch_laibe_landing_onboarding/pcm_standalone/account_service_status/styles.css`
- Modify: `src/stitch_laibe_landing_onboarding/pcm_standalone/account_service_status/app.js`
- Create: `tests/pcm-owner-first-service-decision.test.mjs`
- Modify: the spec, plan, and governance manifest.

**Interfaces:**
- Produces: explicit `申請正式 PCM` and `暫不申請` outcomes, with service-contract and self-service-archive destinations.

- [ ] **Step 1: Record the exact T6 write set and write RED route/copy/state tests.**
- [ ] **Step 2: Run RED, implement the branch without storing a fake decision, and run GREEN.**
- [ ] **Step 3: Verify regression, local destinations, keyboard focus, and 44px targets.**
- [ ] **Step 4: Commit with `git commit -m "feat(pcm): add explicit service decision branch"`.**

---

### Task T7: Self-service read-only archive

**Files:**
- Modify: `src/stitch_laibe_landing_onboarding/pcm_standalone/self_service_archive/code.html`
- Modify: `src/stitch_laibe_landing_onboarding/pcm_standalone/self_service_archive/styles.css`
- Modify: `src/stitch_laibe_landing_onboarding/pcm_standalone/self_service_archive/app.js`
- Create: `tests/pcm-owner-first-self-service-archive.test.mjs`
- Modify: the spec, plan, and governance manifest.

**Interfaces:**
- Produces: `ARCHIVED_READ_ONLY` UI with owner-visible documents/report structure, no fabricated content, and return-to-service-decision path.

- [ ] **Step 1: Record the exact T7 write set and write RED read-only/zero-mutation/recovery tests.**
- [ ] **Step 2: Run RED, implement minimal GREEN, and run focused tests.**
- [ ] **Step 3: Verify regressions and responsive empty/read-only states.**
- [ ] **Step 4: Commit with `git commit -m "feat(pcm): provide self-service read-only archive"`.**

---

### Task T8: PCM service contract reading experience

**Files:**
- Modify: `src/stitch_laibe_landing_onboarding/pcm_standalone/service_contract/code.html`
- Modify: `src/stitch_laibe_landing_onboarding/pcm_standalone/service_contract/styles.css`
- Modify: `src/stitch_laibe_landing_onboarding/pcm_standalone/service_contract/app.js`
- Create: `tests/pcm-owner-first-service-contract.test.mjs`
- Modify: the spec, plan, and governance manifest.

**Interfaces:**
- Preserves: v0.3, 3.5%, legal-review state, full contract text, and print completeness.
- Produces: mobile table of contents, collapsible reading sections, and gated next actions.

- [ ] **Step 1: Record the exact T8 write set and write RED preservation/mobile-reading/gating tests.**
- [ ] **Step 2: Run RED, implement the smallest reading improvement, and run GREEN.**
- [ ] **Step 3: Verify full text remains in the DOM and print expands all sections.**
- [ ] **Step 4: Verify regressions, responsive height/overflow, and local routes.**
- [ ] **Step 5: Commit with `git commit -m "feat(pcm): improve service contract reading"`.**

---

### Task T9: Contract prerequisite recovery

**Files:**
- Modify: `src/stitch_laibe_landing_onboarding/pcm_standalone/contract_prerequisites/code.html`
- Modify: `src/stitch_laibe_landing_onboarding/pcm_standalone/contract_prerequisites/styles.css`
- Modify: `src/stitch_laibe_landing_onboarding/pcm_standalone/contract_prerequisites/app.js`
- Create: `tests/pcm-owner-first-contract-prerequisites.test.mjs`
- Modify: the spec, plan, and governance manifest.

**Interfaces:**
- Produces: missing item, responsibility, return destination, and `PREREQUISITES_PENDING` state without revealing case data.

- [ ] **Step 1: Record the exact T9 write set and write RED tests for missing-item responsibility and recovery routes.**
- [ ] **Step 2: Run RED, implement minimal GREEN, and run focused tests.**
- [ ] **Step 3: Verify regressions, zero mutation, and responsive states.**
- [ ] **Step 4: Commit with `git commit -m "feat(pcm): clarify contract prerequisite recovery"`.**

---

### Task T10: Complete STEP 01–07 contract signing source

**Files:**
- Modify: `src/stitch_laibe_landing_onboarding/pcm_standalone/contract_signing/code.html`
- Modify: `src/stitch_laibe_landing_onboarding/pcm_standalone/contract_signing/styles.css`
- Modify: `src/stitch_laibe_landing_onboarding/pcm_standalone/contract_signing/app.js`
- Create: `tests/pcm-owner-first-contract-signing.test.mjs`
- Modify: the spec, plan, and governance manifest.

**Interfaces:**
- Produces: continuous STEP 01–07 content and a disabled signing action until exact trusted identity and writer readiness are supplied by later gates.

- [ ] **Step 1: Record the exact T10 write set and write RED tests for steps 01–07, responsibility, prerequisites, immutable identity, and closed writer behavior.**
- [ ] **Step 2: Run RED, implement the complete visible sequence, and run GREEN.**
- [ ] **Step 3: Verify no URL/hash/storage/caller boolean unlocks signing or owner-workspace continuation.**
- [ ] **Step 4: Verify regressions, responsive reading, focus, and disabled/loading behavior.**
- [ ] **Step 5: Commit with `git commit -m "feat(pcm): complete gated contract signing steps"`.**

---

### Task T11: Calendar-first owner workspace

**Files:**
- Modify: `src/stitch_laibe_landing_onboarding/client_awarding_dashboard/code.html`
- Modify: `src/stitch_laibe_landing_onboarding/client_awarding_dashboard/styles.css`
- Modify: `src/stitch_laibe_landing_onboarding/client_awarding_dashboard/app.js`
- Create: `tests/pcm-owner-first-owner-workspace.test.mjs`
- Modify: the spec, plan, and governance manifest.

**Interfaces:**
- Consumes: a trusted adapter seam with default zero data.
- Produces: calendar main view, case-message side panel, compact state spine, and documents/risks/changes/acceptance/records tabs or drawers.

- [ ] **Step 1: Record the exact T11 write set and write RED layout, state, zero-data, and adapter-boundary tests.**
- [ ] **Step 2: Run RED, adapt the verified vendor calendar/message grammar for the owner role, and run GREEN.**
- [ ] **Step 3: Verify the message panel is described as case communication, not a live external messaging claim.**
- [ ] **Step 4: Verify desktop/tablet/mobile behavior, regressions, console, overflow, and controls.**
- [ ] **Step 5: Commit with `git commit -m "feat(pcm): make owner workspace calendar-first"`.**

---

### Task T12: Vendor invitation, membership, and workspace

**Files:**
- Create: `src/stitch_laibe_landing_onboarding/pcm_standalone/vendor_invitation/code.html`
- Create: `src/stitch_laibe_landing_onboarding/pcm_standalone/vendor_invitation/styles.css`
- Create: `src/stitch_laibe_landing_onboarding/pcm_standalone/vendor_invitation/app.js`
- Modify: `src/stitch_laibe_landing_onboarding/pcm_standalone/vendor_workspace/code.html`
- Modify: `src/stitch_laibe_landing_onboarding/pcm_standalone/vendor_workspace/styles.css`
- Modify: `src/stitch_laibe_landing_onboarding/pcm_standalone/vendor_workspace/app.js`
- Create: `tests/pcm-owner-first-vendor-flow.test.mjs`
- Modify: the spec, plan, route manifest, and governance manifest.

**Interfaces:**
- Produces: invitation, identity, membership, access-denied, and authorized-shell states; default remains closed at G2.

- [ ] **Step 1: Record the exact T12 write set and write RED route/membership/closed-state tests.**
- [ ] **Step 2: Run RED, implement source-only invitation and workspace states, and run GREEN.**
- [ ] **Step 3: Verify no case payload appears without a trusted adapter and all failures recover safely.**
- [ ] **Step 4: Verify regressions and cross-viewport workspace behavior.**
- [ ] **Step 5: Commit with `git commit -m "feat(pcm): add gated vendor entry and workspace"`.**

---

### Task T13: PCM login, authorized list, and case workspace

**Files:**
- Create: `src/stitch_laibe_landing_onboarding/pcm_standalone/pcm_login/code.html`
- Create: `src/stitch_laibe_landing_onboarding/pcm_standalone/pcm_login/styles.css`
- Create: `src/stitch_laibe_landing_onboarding/pcm_standalone/pcm_login/app.js`
- Modify: `src/stitch_laibe_landing_onboarding/pcm_standalone/pcm_authorized_console/code.html`
- Modify: `src/stitch_laibe_landing_onboarding/pcm_standalone/pcm_authorized_console/styles.css`
- Modify: `src/stitch_laibe_landing_onboarding/pcm_standalone/pcm_authorized_console/app.js`
- Create: `tests/pcm-owner-first-pcm-console.test.mjs`
- Modify: the spec, plan, route manifest, and governance manifest.

**Interfaces:**
- Produces: auth-required, authorized-list, no-authorized-case, selected-case, denied, and recovery shells; G2 remains closed by default.

- [ ] **Step 1: Record the exact T13 write set and write RED authentication/list/case/recovery tests.**
- [ ] **Step 2: Run RED, implement source-only fail-closed states, and run GREEN.**
- [ ] **Step 3: Verify no unauthorized case content or enabled mutation appears.**
- [ ] **Step 4: Verify regressions, local routes, responsive behavior, and console.**
- [ ] **Step 5: Commit with `git commit -m "feat(pcm): add gated PCM console journey"`.**

---

### Task T14: Internal governance entry and recovery

**Files:**
- Modify: `src/stitch_laibe_landing_onboarding/pcm_standalone/internal_governance/code.html`
- Modify: `src/stitch_laibe_landing_onboarding/pcm_standalone/internal_governance/styles.css`
- Modify: `src/stitch_laibe_landing_onboarding/pcm_standalone/internal_governance/app.js`
- Create: `tests/pcm-owner-first-internal-governance.test.mjs`
- Modify: the spec, plan, route manifest, and governance manifest.

**Interfaces:**
- Produces: auth-required, permission-denied, authorized-list, and recovery states with no public navigation entry.

- [ ] **Step 1: Record the exact T14 write set and write RED permission/list/recovery tests.**
- [ ] **Step 2: Run RED, implement minimal GREEN, and verify no public header exposes this entry.**
- [ ] **Step 3: Verify regressions, responsive states, and zero unauthorized data.**
- [ ] **Step 4: Commit with `git commit -m "feat(pcm): add internal governance recovery path"`.**

---

### Task T15: Case record center

**Files:**
- Create: `src/stitch_laibe_landing_onboarding/pcm_standalone/case_record_center/code.html`
- Create: `src/stitch_laibe_landing_onboarding/pcm_standalone/case_record_center/styles.css`
- Create: `src/stitch_laibe_landing_onboarding/pcm_standalone/case_record_center/app.js`
- Create: `tests/pcm-owner-first-record-center.test.mjs`
- Modify: the spec, plan, route manifest, and governance manifest.

**Interfaces:**
- Produces: filterable source-only structure for documents, decisions, messages, changes, construction tasks, acceptance, actor, source version, state, and next responsibility; default is context unavailable.

- [ ] **Step 1: Record the exact T15 write set and write RED taxonomy/fact-spine/zero-data/recovery tests.**
- [ ] **Step 2: Run RED, implement minimal GREEN without fabricated events, and run focused tests.**
- [ ] **Step 3: Verify keyboard tabs/filters, regressions, and responsive density.**
- [ ] **Step 4: Commit with `git commit -m "feat(pcm): add traceable case record center"`.**

---

### Task T16: Closeout, three-party confirmation, and archive

**Files:**
- Modify: `src/stitch_laibe_landing_onboarding/pcm_standalone/case_closeout/code.html`
- Modify: `src/stitch_laibe_landing_onboarding/pcm_standalone/case_closeout/styles.css`
- Modify: `src/stitch_laibe_landing_onboarding/pcm_standalone/case_closeout/app.js`
- Create: `tests/pcm-owner-first-case-closeout.test.mjs`
- Modify: the spec, plan, route manifest, and governance manifest.

**Interfaces:**
- Produces: pending-confirmation, disputed-item, confirmed, and read-only archive states; no confirmation can be written at G3 closed.

- [ ] **Step 1: Record the exact T16 write set and write RED state/responsibility/archive/zero-writer tests.**
- [ ] **Step 2: Run RED, implement minimal GREEN, and run focused tests.**
- [ ] **Step 3: Verify regressions, recovery links, responsive layouts, and disabled actions.**
- [ ] **Step 4: Commit with `git commit -m "feat(pcm): structure case closeout and archive"`.**

---

### Task T17: Retire legacy entry points

**Files:**
- Modify the existing `code.html` in each approved directory under `site/`: `ai_pcm_035_pre_tender_candidate`, `ai_pcm_045_contract_support_candidate`, `ai_pcm_entry_candidate`, `client_awarding_dashboard`, `owner_workspace`, `pcm_contract_generator`, `pcm_contract_preview`, `pcm_contract_review`, `pcm_contract_sign`, `pcm_inbox`, `pcm_login`, `pcm_mobile`, `pcm_review_workbench`, `pro_workspace`, and `register_vendor`.
- Create: `site/shared/pcm-retirement.css`
- Modify: `src/stitch_laibe_landing_onboarding/pcm_standalone/code.html`
- Modify: `src/stitch_laibe_landing_onboarding/pcm_standalone/app.js`
- Create: `tests/pcm-owner-first-legacy-retirement.test.mjs`
- Modify: the spec, plan, route manifest, and governance manifest.

**Interfaces:**
- Produces: consistent retirement shells with canonical return destinations and no demo cases, demo adapter, or old market-flow actions.

- [ ] **Step 1: Record the exact T17 file list and verify each approved file exists before writing.**
- [ ] **Step 2: Write RED tests that open every legacy entry, require the retirement message and canonical destination, and forbid old demo/case actions.**
- [ ] **Step 3: Run RED, replace only the approved entry files and shared retirement CSS, and run GREEN.**
- [ ] **Step 4: Verify no retired entry yields a 404 and no canonical page links back to a retired route.**
- [ ] **Step 5: Run regressions, forbidden-language scan, syntax checks, and exact-path review.**
- [ ] **Step 6: Commit with `git commit -m "chore(pcm): retire legacy PCM entry points"`.**

---

### Task T18: Full route graph and browser acceptance

**Files:**
- Create or modify only PCM owner-first tests under `tests/`.
- Modify: the spec, plan, and governance manifest.
- Create: `outputs/pcm-owner-first-20260803/route-report.json`
- Create: `outputs/pcm-owner-first-20260803/acceptance-report.md`
- Create: screenshots under `outputs/pcm-owner-first-20260803/screenshots/`
- Create: `outputs/pcm-owner-first-20260803/pcm-owner-first-evidence.zip`

**Interfaces:**
- Consumes: the immutable T17 candidate.
- Produces: one commit-bound route report, browser evidence set, acceptance report, and ZIP.

- [ ] **Step 1: Read `web-design-engineer/references/browser-acceptance.md`, record the exact T18 write set, and bind the candidate HEAD/tree.**
- [ ] **Step 2: Run the full Node test suite, all changed JavaScript syntax checks, HTML/local href/src/fragment verification, UTF-8 checks, forbidden visible-language scan, and `git diff --check`.**
- [ ] **Step 3: Start or recover one loopback-only preview on the assigned port without terminating an unknown process.**
- [ ] **Step 4: Traverse every active forward, back, pending, and recovery edge at 1280×900, 768×1024, and 390×844.**
- [ ] **Step 5: Record screenshots and assert horizontal overflow 0, console warning/error 0, and visible controls smaller than 44×44 equal 0.**
- [ ] **Step 6: Verify every first screen identifies role, purpose, current state, next actor/action, and trace behavior; record any still-closed G2/G3/G4 capability truthfully.**
- [ ] **Step 7: Build the evidence ZIP inside `outputs/pcm-owner-first-20260803/`, rerun integrity checks, and commit with `git commit -m "test(pcm): verify owner-first source journey"`.**
- [ ] **Step 8: Report exact worktree, branch, HEAD, parent, tree, commits, changed files, test/browser evidence, remaining closed gates, and return authority to A0 without merge/push/deploy.**

## Self-review

- Spec coverage: T0–T18 map to every Human-ordered page, route, state, retirement, and acceptance requirement.
- Placeholder scan: no unfinished implementation placeholders are used; planned capabilities are named and explicitly gate-closed.
- Interface consistency: route IDs and G1–G4 gate names match the T0 manifest and are consumed consistently by later tasks.
- Scope: every task is independently testable and produces one bounded commit before the next task begins.
