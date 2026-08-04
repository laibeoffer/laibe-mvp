# LaiBE PCM Owner-First End-to-End Flow Integration Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build one truthful owner-first PCM source journey with single-page quotation and drawing checks, one shared owner/vendor account entrance, recoverable contract and workspace flows, and traceable read-only outcomes in the original workspaces.

**Architecture:** `pcm-flow-route-manifest.js` owns canonical/planned/retired routes, compatibility aliases, failure states, and recovery edges. `public-contract.js` preserves current enumerable homepage aliases while exposing future canonical routes as non-clickable `null` values until their pages exist. Later packages activate one route only after its source page and tests exist.

**Tech Stack:** Static HTML, CSS, ES modules, Node.js built-in test runner, loopback-only preview, and browser acceptance.

## Global constraints

- Work only in `C:\CodexWork\08-Jacky\worktrees\laibe_MVP_project\a0-design-pcm-owner-first-integration-20260803` on `a0/design-pcm-owner-first-integration-20260803`.
- `888af2fb98f8a202e76ce3135d8e3f0ad66087fb` is `SUPERSEDED_PRE_CORRECTION` and is not admissible.
- `9e268212f5b3050a1770f7e559508521f4cff4ec` is the first T0 correction, received `CHANGES_REQUIRED`, and is not the final admitted T0 contract.
- `2f1c9ac61128dd4646e7239ac38e9fbdd1620cc7` is the exact parent for the focused admission correction. T2 remains byte-identically held outside the repository until A0 admits that correction.
- `403e4f7b84b3e5ee999db583bd23b65732e369d4` is the focused admission commit, received `CHANGES_REQUIRED`, and is the exact parent for the Array-iterator/evidence correction.
- Execute T0–T18 serially with one writer. Record the exact package write set before changing product source.
- G1 source is active. G2 identity/role, G3 durable data, and G4 production remain closed.
- Do not modify `apps/**`, `packages/**`, `supabase/**`, `src/lib/contracts/**`, root package/lock/config, or A1/R0/A9/A14-owned source.
- Do not reset, rebase, stash, merge, push, open a pull request, deploy, apply migrations, change secrets, or write production.
- Active local routes must exist; planned routes use `href: null`; compatibility pages never appear in canonical nodes or edges.
- Visible UI uses Traditional Chinese and contains no market-bidding language, fund custody/collection, investment promises, fabricated results, external implementation terminology, or claims that AI makes the final decision.
- Every package follows actual RED → minimal GREEN → refactor → focused verification → exact-path review → bounded local commit → clean worktree.

---

### Task T0: Corrected route, compatibility, and failure contract

**Files:**
- Modify: `src/stitch_laibe_landing_onboarding/pcm_standalone/public/pcm-flow-route-manifest.js`
- Modify: `src/stitch_laibe_landing_onboarding/pcm_standalone/public/public-contract.js`
- Modify: `tests/pcm-owner-first-route-manifest.test.mjs`
- Modify: `docs/superpowers/specs/2026-08-03-pcm-owner-first-full-site-design.md`
- Modify: `docs/superpowers/plans/2026-08-03-laibe-pcm-end-to-end-flow-integration.md`
- Modify: `docs/governance/pcm-owner-first-execution-manifest.v1.json`

**Interfaces:**
- Produces: canonical `/pcm/quote-check`, `/pcm/drawing-check`, `/account/access`; compatibility aliases; typed failure matrix; recovery edges; strict closed continuation.
- Preserves: original enumerable homepage route aliases and every existing compatibility file.

- [x] **Step 1: Add correction RED to the existing focused test.**

  Preserve valid G1–G4, active-path, four-edge-kind, and strict-closed coverage. Add negative assertions for split canonical pages, owner-only account entry, independent archive routes, the old read-only state, missing failure rows, and clickable planned routes.

- [x] **Step 2: Run actual RED against `888af2fb98f8a202e76ce3135d8e3f0ad66087fb`.**

  Result: 9 tests, 1 pass, 8 fail. The retained edge-coverage test passed; all Human-corrected canonical and failure requirements failed for the expected missing behavior.

- [x] **Step 3: Implement minimal GREEN in the other five approved paths.**

  Add one quote node, one drawing node, one shared account node, compatibility-only aliases, approved read-only outcomes, complete failure rows/edges, and the corrected T2–T18 schedule.

- [x] **Step 4: Run the corrected focused suite and current-train regressions.**

  Run:

  ```powershell
  node --test tests\pcm-owner-first-route-manifest.test.mjs
  node --test tests\pcm-public-home.test.mjs tests\pcm-missing-flow-pages.test.mjs
  node --check src\stitch_laibe_landing_onboarding\pcm_standalone\public\pcm-flow-route-manifest.js
  node --check src\stitch_laibe_landing_onboarding\pcm_standalone\public\public-contract.js
  ```

  Fresh result: corrected focused suite 9/9 PASS; current-train homepage, missing-flow, and service-contract regressions 46/46 PASS. The full repository suite is 123/124 PASS; the only failure is the frozen A3 cumulative-path admission assertion in `tests/pcm-governance-pages.test.mjs`, which intentionally describes its historical candidate rather than this integration train and remains unmodified.

- [x] **Step 5: Run UTF-8, JSON, forbidden-language, local href/src/fragment, planned-null, exact-six, and `git diff --check` gates.**

  Fresh result: strict UTF-8 6/6, JSON valid, active and compatibility local references 404 0, planned clickable routes 0, visible or unexpected forbidden-language matches 0, exact-six outside 0, and `git diff --check` clean. Five raw-source matches are confined to the existing `FORBIDDEN_PUBLIC_TERMS` rejection list and are not product copy.

- [x] **Step 6: Complete independent spec/quality review with Critical 0 and Important 0.**

  Review fixed hostile-reflection fail-closed handling and made the original owner/vendor workspace scope explicit for cancellation and approved read-only outcomes. Fresh review result: Critical 0, Important 0.

- [x] **Step 7: Commit the exact-six correction with parent `888af2fb98f8a202e76ce3135d8e3f0ad66087fb`.**

  Commit message: `fix(pcm): correct owner-first canonical route contract`

#### Focused admission correction after T1

- [x] Stop T2 and preserve its exact five dirty files in the authorized C-only hold directory before restoring the source worktree to clean `2f1c9ac61128dd4646e7239ac38e9fbdd1620cc7`.
- [x] Preserve the existing focused coverage and add negative tests for inherited intent pollution, poisoned post-load intrinsics, strict own primitive roles, vendor-to-owner isolation, and non-mutating overdue recovery.
- [x] Run actual RED against parent `2f1c9ac61128dd4646e7239ac38e9fbdd1620cc7`: 11 tests, 8 pass, 3 fail, exit 1. The three failures reproduced unsafe inherited intent routing, missing role-bound read-only routing, and owner-only read-only fallback.
- [x] During read-only review, add one narrower forged-Proxy RED: 11 tests, 10 pass, 1 fail, exit 1. This proved a transparent Proxy could still forge own descriptors before captured structured-clone rejection was added.
- [x] Implement minimal GREEN with captured reflection primitives, an exact own-key/data-descriptor contract, captured structured-clone Proxy rejection, closed switch/equality routing, an exception-safe outer resolver, exact owner/vendor workspace mapping, and read-only overdue copy.
- [x] Focused GREEN: `node --test tests\pcm-owner-first-route-manifest.test.mjs` = 11/11 pass.
- [x] Current-train suite = 65/65 pass. Full repository truth = 133/134 pass; the only failure is the unchanged frozen A3 cumulative-path admission assertion in `tests/pcm-governance-pages.test.mjs`.
- [x] Static gates: strict UTF-8 6/6, JSON valid, 22 local route references and 3 fragments resolved, planned clickable routes 0, forbidden product terms 0, deprecated read-only state 0, and `git diff --check` clean.
- [x] Independent adversarial review = Critical 0 / Important 0.
- [x] Keep T2 held and stop for A0 focused admission after creating one exact-six correction commit with parent `2f1c9ac61128dd4646e7239ac38e9fbdd1620cc7`; do not restore or continue T2 before that verdict.

#### Array-iterator and evidence correction

- [x] Keep the T2 hold untouched and restore no page source.
- [x] Add actual RED against `403e4f7b84b3e5ee999db583bd23b65732e369d4`: focused 14 tests, 11 pass, 3 fail, exit 1. Failures reproduced Array-iterator route rewriting, raw duplicate JSON keys, and the stale 123/124 evidence value.
- [x] Replace the parsed-context Array with a frozen null-prototype own-data record and read intent/role as direct scalar fields. Targeted Array-iterator GREEN = 1/1.
- [x] Add a raw structural duplicate-key guard and merge `t0.currentTrainRegression`, `t0.fullSuiteTruth`, `t0.staticGates`, and `t0.independentReview` to one key each. Targeted governance GREEN = 2/2.
- [x] Focused GREEN = 14/14.
- [x] Fresh current-train suite = 68/68. Fresh full repository truth = 136/137; the only failure remains the unchanged frozen A3 cumulative-path admission assertion.
- [x] Static gates: Node syntax valid, strict UTF-8 5/5, JSON valid, raw duplicate-key guard pass, exact-five outside 0, route manifest frozen, forbidden/deprecated terms 0, `git diff --check` clean, and T2 hold 6/6.
- [x] Independent adversarial review = Critical 0 / Important 0.
- [x] Create one bounded exact-five commit with parent `403e4f7b84b3e5ee999db583bd23b65732e369d4`, keep T2 held, and stop for A0 focused admission.

---

### Task T1: Shared visual system and corrected closed states

**Exact proposed write set:**
- Create: `src/stitch_laibe_landing_onboarding/pcm_standalone/shared/owner-first-tokens.css`
- Create: `src/stitch_laibe_landing_onboarding/pcm_standalone/shared/owner-first-shell.css`
- Create: `src/stitch_laibe_landing_onboarding/pcm_standalone/shared/owner-first-state.js`
- Create: `tests/pcm-owner-first-shared-system.test.mjs`
- Modify: current spec, plan, and governance manifest.

**Produces:** LaiBE dark tokens, orange-red primary action, cyan viewing action, five-fact spine, accessible loading/empty/error/recovery shells, the distinct `PCM_EXITED_BILATERAL_CONTINUATION` state, and `CASE_CLOSED_READ_ONLY`, with no G1 mutation authority.

- [x] Record the exact seven paths and corrected T0 parent `9e268212f5b3050a1770f7e559508521f4cff4ec` (tree `bdfd5bf44cf1e1ec032fcde1132d9275e8855a77`).
- [x] Write RED for tokens, five facts, corrected closed states, the two approved read-only outcomes, 44px controls, focus, reduced motion, and overflow safety.

  Actual RED: 8 tests, 0 pass, 8 fail because all three approved shared assets were absent.

- [x] Run RED, implement minimal GREEN, and verify focused/current-train regression tests.

  Fresh result: T1 focused 8/8 PASS; T0 plus homepage, missing-flow, and service-contract current-train suite 63/63 PASS. Full repository truth is 131/132 PASS with the same single frozen A3 cumulative-path admission assertion; no current-train product regression was added.

- [x] Review Critical/Important findings to zero and commit `feat(pcm): add owner-first shared interface system`.

  Review fixed prototype-name state lookup before commit. Strict UTF-8 7/7, JSON and JavaScript syntax valid, CSS braces valid, external CSS URLs 0, forbidden product-language matches 0, deprecated standalone archive state 0, and exact7 outside 0. The exact token file matches the repository's broad `*token*` ignore rule and therefore must be staged only with an exact-path forced add.

---

### Task T2: Public homepage and three explicit entries

**Original bounded commit:** `ba22b765c727732b774a60259f111ac6a361f941`, containing the public-home HTML, CSS and JavaScript, the focused homepage test, and the governance manifest.

**Actual bounded correction write set (parent `ba22b765c727732b774a60259f111ac6a361f941`):**
- `src/stitch_laibe_landing_onboarding/pcm_standalone/public_home/app.js`
- `src/stitch_laibe_landing_onboarding/pcm_standalone/public_home/code.html`
- `tests/pcm-owner-first-public-home.test.mjs`
- `docs/governance/pcm-owner-first-execution-manifest.v1.json`
- `docs/superpowers/plans/2026-08-03-laibe-pcm-end-to-end-flow-integration.md`

**Produces:** Hero → qualification → what PCM checks → result-format example → four-stage explanation → fee/boundary → final action, plus explicit report-check, drawing-review, and shared account controls. Planned controls remain non-clickable until T3–T5 activate their routes.

- [x] Wrote and reproduced the homepage hierarchy RED plus the bounded-correction RED for post-load intrinsic pollution, unknown/traversal route candidates, visible forbidden payment vocabulary, and missing evidence closure.
- [x] Implemented the owner-first homepage and the fail-closed binder. A control becomes active only when its explicit route name and candidate href exactly match the module-load trusted `PUBLIC_ROUTES` own-data binding; planned quote/drawing/account controls remain closed until their trusted routes exist.
- [x] Removed the visible forbidden payment vocabulary and retained plain-language service boundaries without implying G2/G3/G4 capability.
- [x] Verified 1280/768/390, console, overflow, focus, touch targets, local references, and current-train regressions. This correction's fresh focused suite is 16/16, homepage pair is 38/38, and current train is 132/132. Fresh full truth is 152/153; the only failure is the frozen A3 cumulative-path assertion. The original T2 baseline remains recorded separately as historical 149/150 evidence.
- [x] Original bounded commit recorded above; this correction remains a separate bounded commit with exact parent `ba22b765c727732b774a60259f111ac6a361f941` for A0 review.

---

### Task T3: Single-page quotation check

**Actual bounded write set (parent `3c525bb6625e8a6a8c30fecc1f9b7f506f313ad7`):**
- `src/stitch_laibe_landing_onboarding/pcm_standalone/quote_check/code.html`
- `src/stitch_laibe_landing_onboarding/pcm_standalone/quote_check/styles.css`
- `src/stitch_laibe_landing_onboarding/pcm_standalone/quote_check/app.js`
- `tests/pcm-owner-first-quote-check.test.mjs`
- `src/stitch_laibe_landing_onboarding/pcm_standalone/public/pcm-flow-route-manifest.js`
- `src/stitch_laibe_landing_onboarding/pcm_standalone/public/public-contract.js`
- `docs/superpowers/specs/2026-08-03-pcm-owner-first-full-site-design.md`
- `docs/superpowers/plans/2026-08-03-laibe-pcm-end-to-end-flow-integration.md`
- `docs/governance/pcm-owner-first-execution-manifest.v1.json`

**Produces:** one page state machine for introduction, consent, PDF selection, format checks, correction list, resubmission, and clearly labeled non-case result structure. Read `site/preview_budget/code.html` only as a C-only interaction/layout reference; do not carry old market, payment, or implementation language.

- [x] Write RED for the complete state sequence, safe file failures, trace facts, route activation, hostile inputs, local references, and exact-nine evidence. Actual RED against the exact parent: 11 tests, 1 pass, 10 fail, exit 1; the page, active route, and T3 evidence were absent as expected.
- [x] Create the page and activate only `quoteCheck`. The focused product assertions are GREEN before evidence closure; drawing/account remain planned, compatibility aliases remain non-canonical, and local references resolve. Browser QA at 1280×900, 768×1024, and 390×844 covered introduction → consent → selection/validation → correction → reselection → result-format → closed outcome plus invalid-format recovery. All three widths have horizontal overflow 0, visible controls below 44px 0, planned clickable controls 0, broken assets 0, and console warning/error 0. The valid-file path used an in-memory browser PDF fixture so no out-of-scope test artifact was written.
- [x] Record the original T3 exact-nine receipts and complete the first independent review at Critical 0 / Important 0 before the bounded feature commit.

**Actual bounded correction write set (parent `b54f9a51c968640541f4e69ee3ad75a22dc46dc2`):**
- `src/stitch_laibe_landing_onboarding/pcm_standalone/quote_check/app.js`
- `src/stitch_laibe_landing_onboarding/pcm_standalone/quote_check/code.html`
- `tests/pcm-owner-first-quote-check.test.mjs`
- `tests/pcm-owner-first-public-home.test.mjs`
- `tests/pcm-owner-first-route-manifest.test.mjs`
- `docs/governance/pcm-owner-first-execution-manifest.v1.json`
- `docs/superpowers/plans/2026-08-03-laibe-pcm-end-to-end-flow-integration.md`
- `docs/superpowers/specs/2026-08-03-pcm-owner-first-full-site-design.md`

- [x] Reproduce metadata RED against `b54f9a5`: focused 15 tests, 11 passed, 4 failed, exit 1. A renamed `text/plain` file and post-load string-method rewriting could incorrectly reach validation; copy also overstated browser metadata as content recognition.
- [x] Apply the minimal fail-closed correction. Only an exact browser MIME label of `application/pdf` reaches `VALIDATION_PENDING`, which now says the content format is still unverified. Suffix-only, malformed, hostile rewrite, and hostile throw paths do not throw and never gain trust.
- [x] Bind T2 receipts to immutable admitted commit `3c525bb6625e8a6a8c30fecc1f9b7f506f313ad7` instead of comparing historical receipts with T3 worktree bytes. Current T3 and this correction are recorded separately.
- [x] Regress the actual browser flow at 1280×900, 768×1024, and 390×844. Introduction → consent → selection → validation → correction → reselection → result format → closed result completed; renamed text, ordinary text, valid MIME, rewrite pollution, and throwing pollution were exercised. Horizontal overflow, broken assets, planned clickable controls, controls below 44px, and console warnings/errors were all 0. Focus-visible and reduced-motion behavior remained effective.
- [x] Final current-train truth is 54/54. Full-suite truth is 168/169; the sole failure remains `tests/pcm-governance-pages.test.mjs`, the frozen A3 cumulative-path admission assertion. T4 and G2–G4 remain closed pending A0 admission.

**Actual bounded input-safety correction write set (parent `ece1fb380c9a1a5ab85b98a20175773cb3f8006f`):**
- `src/stitch_laibe_landing_onboarding/pcm_standalone/quote_check/app.js`
- `tests/pcm-owner-first-quote-check.test.mjs`
- `docs/governance/pcm-owner-first-execution-manifest.v1.json`
- `docs/superpowers/plans/2026-08-03-laibe-pcm-end-to-end-flow-integration.md`
- `docs/superpowers/specs/2026-08-03-pcm-owner-first-full-site-design.md`

- [x] Reproduce the actual event-boundary RED against `ece1fb3`: focused 18 tests, 15 passed, 3 failed, exit 1. Throwing `files` and `name` getters escaped the change handler; the third failure was the intentionally stale receipt gate. A separate read-only hostile matrix also reproduced repeated `files` access, throwing length/index, sparse lists, blank names, and unsafe MIME metadata against the exact parent.
- [x] Apply one minimal input boundary: snapshot `files`, exact length, index, name, and MIME once inside an exception-safe reader. Empty selection remains a normal cancellation; malformed, sparse, throwing, missing, blank, or non-PDF metadata enters the same closed product failure with null case data and no actions.
- [x] Keep the product language evidence-limited. Invalid metadata says the browser did not provide a confirmable PDF label and that content format remains unverified; it never classifies the file bytes. Exact nonblank name plus `application/pdf` remains pending, while suffix-only and post-load string intrinsic pollution stay closed.
- [x] Record exact-five receipts, three-viewport browser evidence, and independent Critical 0 / Important 0 review. The commit gate requires a fresh focused 18/18 and current train 56/56; full-suite truth remains 170/171 with only the frozen A3 assertion. T4 and G2–G4 remain closed.

**Actual bounded own-data boundary correction write set (parent `3b856f9ebd82daf1991ab436c959aca8e634eba2`):**
- `src/stitch_laibe_landing_onboarding/pcm_standalone/quote_check/app.js`
- `tests/pcm-owner-first-quote-check.test.mjs`
- `tests/pcm-governance-pages.test.mjs`
- `docs/governance/pcm-owner-first-execution-manifest.v1.json`
- `docs/superpowers/plans/2026-08-03-laibe-pcm-end-to-end-flow-integration.md`
- `docs/superpowers/specs/2026-08-03-pcm-owner-first-full-site-design.md`

- [x] Preserve the actual 170/171 baseline RED. The sole failure came from an open-ended historical A3 diff reading the descendant integration HEAD rather than its immutable historical candidate.
- [x] Reproduce inherited-authority RED: focused 21 tests, 17 passed, 4 failed. A shared Array slot, inherited file metadata, inherited length, and stale receipts exposed the boundary.
- [x] Apply captured WebIDL brand checks for the input, `FileList`, and `File`; require an own file-list slot corroborated by native `item()`, reject own metadata shadows and plain-object identity, and continue to accept genuine branded subclasses. A second hostile review produced a 23-test brand-identity RED before the product assertions reached 23/23.
- [x] Bound the historical test to immutable candidate `3f6bddea936bdebd36846a239bc5d13c37e1d331`: immediate `ae4f575a3062a48c6f08cc708738e14518f4df72..3f6bdde` and cumulative `0b0037ff50a4dc5b1756fe3230588f12a01c5337..3f6bdde`. Historical receipts now come from that immutable Git object, never current descendant bytes.
- [x] Add the exact-six evidence gate. Its actual RED is 25 tests, 23 passed, 2 failed: stale current receipts and the absent correction record. The final gate requires focused 25/25, current train 63/63, and full PCM 178/178.
- [x] Inspect 1280 by 900, 768 by 1024, 390 by 844, and 640 by 450. The introduction, consent, selection, invalid-file failure, recovery, and closed result structure remain usable; horizontal overflow, controls below 44px, planned clickable controls, broken assets, and console warning/error are 0. Keyboard focus is visible on the skip control. The loopback preview was stopped with listener count 0.
- [x] Record final exact-six receipts, obtain independent Critical 0 / Important 0 review, create the bounded correction commit, and stop for A0 focused admission. T4 and G2-G4 remain closed.

**Actual bounded final exact-seven correction write set (parent `238f8180af9e6a1a8d7dd7a71303cd4031324775`):**
- `src/stitch_laibe_landing_onboarding/pcm_standalone/quote_check/app.js`
- `src/stitch_laibe_landing_onboarding/pcm_standalone/quote_check/code.html`
- `src/stitch_laibe_landing_onboarding/pcm_standalone/quote_check/styles.css`
- `tests/pcm-owner-first-quote-check.test.mjs`
- `docs/governance/pcm-owner-first-execution-manifest.v1.json`
- `docs/superpowers/plans/2026-08-03-laibe-pcm-end-to-end-flow-integration.md`
- `docs/superpowers/specs/2026-08-03-pcm-owner-first-full-site-design.md`

- [x] Preserve the immutable-receipt RED: the checked-out governance test has 36,031 bytes while `238f818:tests/pcm-governance-pages.test.mjs` has 35,231 bytes, yet the prior focused gate still passed 25/25. The exact-seven behavioral RED then ran 29 tests with 21 passed and 8 failed.
- [x] Replace the inherited empty Array with a frozen null-prototype zero-action iterable. Post-load Array index or iterator pollution cannot create `actions[0]`, alter spread, throw, or grant an action.
- [x] Clear the browser file input and every displayed filename when a later selection is invalid. Failure and recovery move focus to the active panel heading rather than leaving it on BODY or a control from the previous state.
- [x] Add one compact hero continuation block without changing routes or service scope. At 390×640 and 1280×768, current status, next step, and the primary CTA are visible together; 1280×900, 768×1024, and 390×844 retain zero horizontal overflow, zero visible controls below 44px, zero broken assets, and zero planned clickable controls.
- [x] Close the normalized self-receipt, fresh focused/current/full suites, and three independent Critical 0 / Important 0 reviews. This bounded commit records the exact-seven correction and stops for A0 admission; T4/T5 and G2-G4 remain closed.

---

### Task T4: Single-page drawing check

**Admitted disjoint source write set:** `pcm_standalone/drawing_check/{code.html,styles.css,app.js}` and `tests/pcm-owner-first-drawing-check.test.mjs` at exact source commit `ca90ecdd3fb0191c8f3ae4f420c2011758908521` (parent `f16b6d8191634eba9cc7037237e17f471363e312`).

**Serial integration write set:** route manifest, route-manifest test, public-home test, the existing quote-check route-regression assertion, this plan, the current design spec, and the governance manifest. `public-contract.js` remains byte-frozen because it derives `drawingCheck` from the trusted route manifest.

**Produces:** one page state machine for introduction, consent, upload, format checks, corrections, resubmission, and result, with paired-file recovery back to quotation check.

- [x] Create the source page with an isolated RED→GREEN cycle and obtain formal `ADMITTED_G1_UI_SOURCE_ONLY` for exact `ca90ecd`; focused drawing tests are 22/22 and A0's fresh PCM suite is 211/211.
- [x] Absorb the admitted exact-four source into the unique integration writer as local commit `7464e83`, without T5 or C1 bytes.
- [x] Establish route-integration RED: route plus homepage focused tests are 27/30, with exactly the three expected drawing-route failures while account access remains closed.
- [x] Activate only `drawingCheck`, its homepage edge, and the two quote/drawing completion edges. Focused route plus homepage tests are GREEN at 30/30; `accountAccess` remains `planned` with `href: null`.
- [x] Run the first active-train checkpoint. It is RED at 86/88 only because the historical T3 assertion still required drawing to remain planned and the current manifest self receipt was intentionally not yet closed. Update the route-regression assertion as part of this serial integration; leave self receipt closure until final evidence is fixed.
- [x] Run browser QA through the actual homepage drawing entry at 1280×900, 768×1024, 390×844, 390×640, and a 640×450 200%-reflow equivalent. All five reach the drawing page with five decision facts, overflow 0, controls below 44px 0, console/network failures 0, and a visible primary CTA. The 640×450 CTA requires scrolling and is recorded as such rather than claimed first-screen visible.
- [x] Add an executable exact-seven receipt gate before evidence closure. After adding the route-lookup adversarial regression, its final intentional RED is focused 88/90 and full PCM 211/213; the only two failures are the intentionally empty T4 receipt set and the not-yet-recomputed normalized manifest self receipt, with zero product or route regression.
- [x] Close the post-load `Array.prototype.find` seam with a child-process RED 0/1 then GREEN 1/1; trusted route lookup now uses fixed-count direct own slots and records zero shared `find` calls.
- [x] Complete the mainline focused rereview at Critical 0 / Important 0 / Minor 0 after the delegated review process was interrupted by a safety-classifier error; the classifier interruption is not counted as evidence.
- [x] Create bounded integration commit `fd7a571`; A0 correctly returns `CHANGES_REQUIRED` because the frozen quotation page still said drawing review was unavailable while the shared graph exposed a clickable quote-to-drawing edge. Treat `fd7a571` as superseded immutable evidence, not admission.
- [x] Establish route-truth RED at 51/53: the quotation page has no exact drawing anchor and current suite metadata says 11 files instead of the enumerated 12.
- [x] Add exact local anchors to the quotation result and quote-only failure recovery, align state copy/hero/recovery with `DRAWING_CHECK`, and reject unknown, traversal, data, JavaScript, and external route values without shared string-method authority. Product quote tests are GREEN at 38/38.
- [x] Run actual quote-to-drawing browser journeys at 1280×900, 768×1024, and 390×844: destination 3/3, keyboard focus 3/3, exact href 3/3, overflow 0, controls below 44px 0, console/network failures 0.
- [x] Close the read-only review Important finding with an executable production-listener mutation probe: removing the guard demonstrably permits hostile navigation, while current source keeps unsafe hrefs and post-load `getAttribute`, `preventDefault`, and `click` pollution at zero navigation and zero polluted calls.
- [x] Close the twelve-file current inventory, exact-seven receipts, normalized self receipt, fresh 101/101 focused and 216/216 full suites, bounded commit, and A0 focused admission gates. Exact `35bb499b9c549e1a0013eace1c8f7d3070014bca` is `ADMITTED_G1_UI_SOURCE_ONLY`.

---

### Task T5: Shared owner and vendor account access

**Bounded source lane:** exact four paths only: `pcm_standalone/account_access/{code.html,styles.css,app.js}` and `tests/pcm-owner-first-account-access.test.mjs`. Shared route, public contract, homepage, spec, plan, and governance files remain frozen in the source lane.

**Serial integration write set:** `public/pcm-flow-route-manifest.js`, `public_home/code.html`, the route, homepage, account-access, and quotation active-train tests, and the current spec/plan/governance manifest. `public-contract.js` remains byte-frozen and derives the active href only from the trusted route manifest.

**Produces:** one registration/sign-in page for owners and invited vendors, with role choice, truthful G2-closed state, identity recovery, and no case payload. Read `site/register_vendor/code.html` only as a C-only visual/interaction reference and remove old market and payment semantics.

- [x] Complete the disjoint source RED→GREEN and A0 review. Exact source `1b62e12712178451b47b6b85c2fca859c26bde83` is `ADMITTED_G1_UI_SOURCE_ONLY`; focused account tests are 24/24 and the source worktree is clean.
- [x] Mechanically absorb the four admitted blobs into the unique integration writer as local commit `bd3e0678eba2bd272f05b7e787ef99a954cbb9ee`; all four blob IDs equal the admitted source.
- [x] Establish serial integration RED at 29/33: account node and public contract were still planned, the header still targeted the compatibility status page, and the historical T4 receipt test incorrectly read mutable checkout bytes.
- [x] Activate only `accountAccess` at `../account_access/code.html`, make `home→accountAccess` clickable, and convert the header to a fail-closed `data-route="accountAccess"` control that becomes active only through trusted route binding. No Auth, case payload, network, persistence, or write authority is granted.
- [x] Run the first full-suite checkpoint: 238/241, with exactly two intentional active-train assertions still requiring account `planned` plus the normalized manifest self receipt pending. Bring those two tests into the same serial integration package; no source page behavior changed.
- [x] Close exact-nine receipts, normalized self receipt, fresh 34/34 route/home focused, 241/241 full suite, and the 1280×900／768×1024／390×844 homepage→account journey. All three destinations are `CONTEXT_UNAVAILABLE` with case payload 0, enabled write controls 0, and overflow／under-44px／console／network failures 0.
- [x] Reproduce the A0 hostile DOM-method finding against exact `a07adf3`: post-load `setAttribute` rewrote the trusted account href to `javascript:`, while a no-op `removeAttribute` left an unsafe href on a closed control. The new production-function regression was 16/17 RED before implementation.
- [x] Capture the branded `Element.prototype` set/remove/get methods and `Reflect.apply` at module load, read the route name through the captured getter, close every control before activation, and verify the exact href and closed attributes after each operation. Rewritten, no-op, and throwing post-load hooks now have zero authority; the focused production-function suite is 17/17 GREEN.
- [x] Close the bounded correction and evidence lineage. Exact `64539be0b93170a916106dbd61e9ca5841f83b2b` is `ADMITTED_G1_UI_SOURCE_ONLY`; G2/G3/G4 remain closed.
- [x] Begin T6 and T7 only as disjoint source lanes after that admission. Shared integration remains serialized under the unique writer.

---

### Task T6: Case setup, document linking, and formal PCM decision

**Source write set:** `pcm_standalone/case_setup/{code.html,styles.css,app.js}` and `tests/pcm-owner-first-case-setup.test.mjs` only. Shared route/public contract/spec/plan/governance changes belong to the later serial integration package.

**Produces:** one source-only flow for creating a case, associating quotation/drawing references, showing missing-pair states, and choosing whether to apply for formal PCM. No archive workspace is created; declining formal service leaves the user in the original owner context with no invented durable write.

- [x] RED/GREEN the pairing, decision, zero-writer, responsibility, recovery, responsive, and hostile-context contracts.
- [x] Obtain source-only admission at exact `bfcfd2461443864cac4b2fbb4874dbc45a8084cc`.
- [x] Mechanically absorb the four admitted source/test blobs in unique-writer commit `6bc25bab3b4cadaa16c6deae6b24207bc7d4007c`.
- [ ] Close the serial evidence lineage and full-suite gate. `caseSetup` intentionally remains `planned`, `G2_AUTH_RUNTIME`, and `href:null`; G1 must not activate an Auth-dependent route.

---

### Task T7: PCM service contract

**Source write set:** `pcm_standalone/service_contract/{code.html,styles.css,app.js}` and `tests/pcm-owner-first-service-contract.test.mjs` only. Shared evidence and route integration remain serial.

**Produces:** preserved v0.3, 3.5%, legal-review state, full DOM/print text, readable mobile navigation, and truthful prerequisite/signing gates.

- [x] RED/GREEN preservation, mobile reading, strict readiness/context authority, hostile intrinsic behavior, and disabled signing.
- [x] Obtain source-only admission at exact `db289177da74283d3075383d7714318aa9760951`.
- [x] Mechanically absorb the four admitted source/test blobs in unique-writer commit `6bc25bab3b4cadaa16c6deae6b24207bc7d4007c`.
- [x] Replace four descendant-hostile shared assertions with immutable Git-object lineage and close the first focused RED from 63/71 to GREEN.
- [x] Replace the prior whole-case PCM-exit state with `PCM_EXITED_BILATERAL_CONTINUATION`, preserving the exact ten bilateral resources while stopping new PCM operations and requiring new authorization for re-entry.
- [x] Reproduce post-load Array index/iterator injection at 18/19 RED, then harden continuation actions/resources/workspaces as frozen null-prototype own-iterator lists in all three public/shared sources.
- [x] Fresh focused = 73/73; complete PCM enumeration = 15 files and 266/266. Browser acceptance at 1280×900, 768×1024, 390×844, 390×640, 1280×768, and 640×450 has overflow 0, visible under-44px controls 0, broken fragments/images 0, enabled writes 0, console warning/error 0, and six direct local resources HTTP 200. Case setup focuses `#preparation`; service contract reaches `#full-contract` with signing disabled.
- [ ] Create the bounded product/test/docs commit with parent `6bc25bab3b4cadaa16c6deae6b24207bc7d4007c`, then close its immutable governance receipts in a separate evidence-only commit and obtain A0 focused admission. G2/G3/G4 remain closed.

---

### Task T8: Contract prerequisites and supplementation

**Exact proposed write set:** `pcm_standalone/contract_prerequisites/{code.html,styles.css,app.js}`, `tests/pcm-owner-first-contract-prerequisites.test.mjs`, current spec/plan/governance manifest.

**Produces:** missing item, responsible role, due-state, overdue recovery, return route, and no enabled signing action.

- [ ] RED prerequisite, supplement-overdue, responsibility, and zero-mutation states.
- [ ] Implement GREEN, verify responsive recovery, and commit `feat(pcm): clarify contract prerequisites`.

---

### Task T9: STEP 01–07 contract signing

**Exact proposed write set:** `pcm_standalone/contract_signing/{code.html,styles.css,app.js}`, `tests/pcm-owner-first-contract-signing.test.mjs`, current spec/plan/governance manifest.

**Produces:** complete STEP 01–07 content, exact mutual-version requirements, disabled signing until trusted G2/G3 readiness, and safe failure recovery.

- [ ] RED steps 01–07, strict inputs, mutual version, writer readiness, and disabled/loading behavior.
- [ ] Implement GREEN, verify no URL/hash/storage boolean unlock, and commit `feat(pcm): complete gated signing steps`.

---

### Task T10: Calendar-first owner workspace

**Exact proposed write set:** `src/stitch_laibe_landing_onboarding/client_awarding_dashboard/{code.html,styles.css,app.js}`, `tests/pcm-owner-first-owner-workspace.test.mjs`, current spec/plan/governance manifest.

**Produces:** calendar main view, case-message side panel, compact state spine, and document/risk/change/acceptance/record drawers; default zero data and no live external-messaging claim.

- [ ] RED calendar/message/fact-spine/adapter/read-only behavior.
- [ ] Implement GREEN using the vendor workspace grammar, verify 1280/768/390, and commit `feat(pcm): make owner workspace calendar-first`.

---

### Task T11: Vendor invitation, membership, and workspace

**Exact proposed write set:** create `pcm_standalone/vendor_invitation/{code.html,styles.css,app.js}`, modify `pcm_standalone/vendor_workspace/{code.html,styles.css,app.js}`, create `tests/pcm-owner-first-vendor-flow.test.mjs`, modify route manifest and current spec/plan/governance manifest.

**Produces:** declined/expired/withdrawn/resend invitation states, shared account recovery, membership confirmation, authorized shell, and original-workspace read-only outcomes.

- [ ] RED invitation/membership/zero-data/read-only contracts.
- [ ] Implement GREEN, activate only destinations that exist and pass G1, verify regressions/browser, and commit `feat(pcm): add gated vendor journey`.

---

### Task T12: PCM login, authorized cases, and case workspace

**Exact proposed write set:** create `pcm_standalone/pcm_login/{code.html,styles.css,app.js}`, modify `pcm_standalone/pcm_authorized_console/{code.html,styles.css,app.js}`, create `tests/pcm-owner-first-pcm-console.test.mjs`, modify route manifest and current spec/plan/governance manifest.

**Produces:** login-required, zero authorized cases, authorized list, selected case, denied/recovery, and PCM-exited no-action state; G2 remains closed by default.

- [ ] RED identity/authorization/cardinality/recovery/exit behavior.
- [ ] Implement GREEN without unauthorized case content, verify regressions/browser, and commit `feat(pcm): add gated PCM console journey`.

---

### Task T13: Internal governance

**Exact proposed write set:** `pcm_standalone/internal_governance/{code.html,styles.css,app.js}`, `tests/pcm-owner-first-internal-governance.test.mjs`, route manifest and current spec/plan/governance manifest.

**Produces:** auth-required, permission-denied, authorized-list, and recovery states with no public navigation entry and no delegated Human decision authority.

- [ ] RED permissions/list/recovery/public-entry absence.
- [ ] Implement GREEN, verify zero unauthorized data, and commit `feat(pcm): add governance recovery flow`.

---

### Task T14: Case record center

**Exact proposed write set:** create `pcm_standalone/case_record_center/{code.html,styles.css,app.js}`, create `tests/pcm-owner-first-record-center.test.mjs`, modify route manifest and current spec/plan/governance manifest.

**Produces:** source-only structure for documents, decisions, messages, changes, tasks, acceptance, actor, source version, state, next responsibility, and safe zero-data context.

- [ ] RED taxonomy/facts/zero-data/recovery and keyboard filters.
- [ ] Implement GREEN, verify operational density/responsive behavior, and commit `feat(pcm): add traceable case record center`.

---

### Task T15: PCM exit, case cancellation, closeout, and three-party confirmation

**Exact proposed write set:** owner workspace, vendor workspace, PCM console, `pcm_standalone/case_closeout/{code.html,styles.css,app.js}`, `tests/pcm-owner-first-case-lifecycle.test.mjs`, route manifest and current spec/plan/governance manifest.

**Produces:** original-workspace `PCM_EXITED_BILATERAL_CONTINUATION`, `CASE_CLOSED_READ_ONLY`, and cancelled-case states. PCM exit keeps owner/vendor workspaces, documents, messages, schedules, evidence, acceptance, changes, addenda, and case records operational while stopping new PCM operations and retaining historical PCM records read-only. Case close is the distinct whole-case read-only outcome; no archive workspace is created.

- [ ] RED state names, original-workspace retention, action removal, three-party confirmation, and recovery.
- [ ] Implement GREEN, verify no alternate workspace route, and commit `feat(pcm): close case lifecycle in original workspaces`.

---

### Task T16: Cross-role failure recovery and flow consistency

**Exact proposed write set:** only affected `pcm_standalone/**` pages identified by RED, `tests/pcm-owner-first-cross-role-recovery.test.mjs`, route manifest/public contract and current spec/plan/governance manifest.

**Produces:** consistent reason, next action, responsible role, return/recovery route, payload policy, and disabled mutation for every failure matrix row across owner, vendor, PCM, and governance surfaces.

- [ ] Record affected paths before writing; RED every matrix row against its visible source.
- [ ] Apply only bounded consistency fixes, run full current-train tests/browser routes, and commit `fix(pcm): align cross-role recovery states`.

---

### Task T17: Legacy entry retirement

**Exact proposed write set:** the existing `code.html` in `site/ai_pcm_035_pre_tender_candidate`, `site/ai_pcm_045_contract_support_candidate`, `site/ai_pcm_entry_candidate`, `site/client_awarding_dashboard`, `site/owner_workspace`, `site/pcm_contract_generator`, `site/pcm_contract_preview`, `site/pcm_contract_review`, `site/pcm_contract_sign`, `site/pcm_inbox`, `site/pcm_login`, `site/pcm_mobile`, `site/pcm_review_workbench`, `site/pro_workspace`, and `site/register_vendor`; create `site/shared/pcm-retirement.css`; modify `pcm_standalone/{code.html,app.js}`; create `tests/pcm-owner-first-legacy-retirement.test.mjs`; modify current route/spec/plan/governance manifest.

**Produces:** consistent retirement shells and canonical return destinations, with no demo cases, old market actions, or dead links. Compatibility source pages are handled only by the approved retirement list.

- [ ] Verify every approved file exists, RED all old entries, replace only the recorded paths, run GREEN/local-route/forbidden-language checks.
- [ ] Commit `chore(pcm): retire legacy PCM entries`.

---

### Task T18: Full route graph and browser acceptance

**Exact proposed write set:** PCM owner-first tests, current spec/plan/governance manifest, and `outputs/pcm-owner-first-20260803/**` only.

**Produces:** commit-bound route report, full-page screenshots at 1280×900/768×1024/390×844, acceptance report, and evidence ZIP.

- [ ] Read `web-design-engineer/references/browser-acceptance.md` and bind the immutable T17 HEAD/tree.
- [ ] Run full current-train tests, candidate-specific historical checks in their proper frozen context, syntax, UTF-8, JSON, local href/src/fragment, forbidden visible language, exact-path, and `git diff --check`.
- [ ] Traverse every active forward/back/pending/recovery route at all three viewports; record 404 0, console warning/error 0, horizontal overflow 0, and visible controls under 44×44 equal 0.
- [ ] Capture full-page evidence, create the ZIP inside `outputs/pcm-owner-first-20260803/`, verify receipts, and commit `test(pcm): verify owner-first source journey`.
- [ ] Report exact identity, commits, files, tests, browser evidence, closed G2–G4 capabilities, and return authority without merge/push/deploy.

## T3 bounded CTA contrast correction

**Actual bounded CTA contrast correction write set:** `quote_check/styles.css`, `tests/pcm-owner-first-quote-check.test.mjs`, this plan, the current owner-first specification, and the governance manifest. Parent is `0b4aecee2bd7e4317a4734dbcf9c7b1096b269fc`; outside this exact-five set is zero.

- [x] Reproduce the quantitative RED at 14px: inherited `#f6f8f9` measured 1.70:1, 2.58:1, and 3.16:1 against the three primary gradient stops.
- [x] Apply the local quote-page override `#080b0d` without changing the shared system, markup, routes, interactions, or secondary actions. The resulting ratios are 10.93:1, 7.17:1, and 5.86:1.
- [x] Verify all six required viewports, the invalid-file recovery focus, exact-five scope, fresh focused/current/full suites, normalized self-receipt, and independent Critical 0 / Important 0 review.
- [x] Keep T4 and G2–G4 closed and stop for A0 admission after the bounded commit.

## T3 hero action correction

**Actual bounded hero action correction write set:** `quote_check/app.js`, `tests/pcm-owner-first-quote-check.test.mjs`, this plan, the current owner-first specification, and the governance manifest. Parent is `74b606297c391615d76de505759bceda4756ec57`; outside this exact-five set is zero.

- [x] Reproduce the production listener RED: after an exact browser PDF label reached `VALIDATION_PENDING`, the hero CTA still displayed its introduction label and initial `CONSENT` target. Clicking it returned the user to consent. The focused run reported 35 tests, 33 passed, and 2 failed; the second failure was the expected stale historical receipt assertion before it was bound to its immutable candidate.
- [x] Add one closed state-to-hero-action projection for the label, enabled state, and target. The render path owns the displayed action, while the click listener dispatches only the current projected action and never reads a stale DOM dataset for authority.
- [x] Keep gated and closed states safe: consent has no hero target until the in-panel consent step, no-action states are disabled with `aria-disabled` and no target, `VALIDATION_PENDING` leads only to `CORRECTION_REQUIRED`, and failure recovery remains closed to its declared recovery step.
- [x] Preserve hostile input, MIME/FileList, zero-action, contrast, file recovery, and G2-G4 closure coverage. Refresh immutable historical receipts for the prior contrast correction from commit `74b6062`, then record the exact-five correction and one normalized manifest self-receipt.
- [x] Verify the focused suite, current T0-T3 train, full PCM suite against the parent 185/185 baseline, syntax/UTF-8/JSON/duplicate-key/local-reference/forbidden-copy/diff gates, six viewport smoke, and independent Critical 0 / Important 0 review before the bounded local commit.

## T3 final bounded canonical identity correction

**Actual immediate write set (parent `e7a12315d5d7a8aff6b6d12778a9e404b68a96a6`):** `quote_check/app.js`, `tests/pcm-owner-first-quote-check.test.mjs`, this plan, the current owner-first specification, and the governance manifest. Outside this exact-five set is zero. The historical `t3HeroActionCorrection` remains bound to the e7a candidate whose parent is `74b606297c391615d76de505759bceda4756ec57`; it is not reused as this correction record.

- [x] Establish the hostile-caller RED before product code. The first focused run was 34/36 with the intended stale receipt failure plus a test-fixture `Object.prototype.code` writability collision. After making that pollution descriptor writable, the causal targeted RED was 0/1 with `actual true` versus `expected false`: an untrusted lookalike had received the enabled introduction CTA. The immutable-receipt targeted RED separately failed 0/1 on `candidate_git_blob_bytes` versus the required `declared_git_blob_bytes` scope.
- [x] Replace caller `state.code` inspection with direct canonical object identity comparisons for every built-in quote state and failure. Eight hostile variants remain target-free and disabled; accessor getter and Proxy get trap calls are both zero. No Map, Set, Array, or mutable collection prototype carries projection authority. The built-in action matrix, consent gating, `VALIDATION_PENDING` to `CORRECTION_REQUIRED`, stale-dataset resistance, file recovery, and contrast behavior remain unchanged.
- [x] Preserve historical e7a receipts while verifying them from their declared Git blob bytes and requiring each declared blob to exist. Current worktree drift is observed but never trusted as historical receipt evidence. Add a separate `t3CanonicalIdentityCorrection` block with parent e7a, this exact-five immediate write set, four current non-manifest declared-blob receipts, and the normalized manifest self-receipt.
- [x] Fresh GREEN is focused 36/36, current T0-T3 train 74/74, and full PCM 189/189 against the e7a parent baseline 188/188. Chrome acceptance from the repository-root server at 390x640 and 1280x768 recorded page/logo 200, initial CTA/status/next agreement, horizontal overflow 0, visible controls under 44px 0, console warning/error 0, network failure 0, visible keyboard focus, consent disabled with no target, stale dataset still reaching `CORRECTION_REQUIRED`, and invalid-file recovery focus on `reselect-title`.
- [x] Keep T4/T5 and G2-G4 closed. Run syntax, strict UTF-8, JSON parse and raw duplicate-key, exact-five/outside-zero, diff-check, and an independent C0/I0/M0 final review before the bounded local commit.

## T5 immutable receipt provenance correction

**Actual evidence-only write set (parent `b64238044b480e5570ef99dbc7a807e59b893b6e`):** the public-home focused test, this plan, the current owner-first specification, and the governance manifest. Product source, route manifest, public contract, account source, T0-T4, and T6+ are byte-frozen; outside this exact-four set is zero.

- [x] Establish the actual RED: the prior verifier read mutable checkout files, exposed no `reviewTarget`, and gave its four artifact receipts no immutable scope.
- [x] Bind the evidence to `CORRECTION_COMMIT_CONTAINING_THIS_MANIFEST`, exact parent b642380, and the exact-four correction diff.
- [x] Require each declared blob to exist, equal the review-target tree entry, and reproduce its byte count, SHA-256, and Git blob identity from immutable object bytes.
- [x] Prove in-memory checkout drift cannot change the immutable result; wrong blob, missing blob, wrong parent, and extra path fail closed.
- [ ] Create the one bounded local commit, rerun focused 36/36 and full PCM 243/243 from the immutable commit, refresh the normalized self-receipt, obtain Critical 0 / Important 0 review, and return to A0 for the final G1 verdict.

## Self-review

- Coverage: the corrected schedule has exactly T0–T18 and maps every Human-ordered source package once.
- Route consistency: quotation, drawing, and account access each have one canonical node; compatibility pages have no canonical edge.
- Read-only consistency: PCM exit and case closeout stay in original workspaces with no actions.
- Testability: each package has an independently rejectable RED/GREEN/commit boundary.
- Scope: no package grants Auth, durable data, or production authority.
