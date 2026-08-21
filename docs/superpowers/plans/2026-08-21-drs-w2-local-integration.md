# DRS W2 Local Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Every behavior change follows RED/GREEN TDD and every completed checkpoint receives independent read-only review.

**Goal:** Produce one reproducible, locally integrated DRS backend candidate in which a formally linked LINE event can flow through advisory AI review, assigned Human specialist decision, final send receipt, case/audit persistence, and the isolated Owner/Vendor/Specialist workspace without changing A0 or claiming production readiness.

**Architecture:** Three frozen W2 source lanes remain one-writer authorities: Core Data/Audit owns the PostgreSQL contract and local runtime proof, A14 owns dependency-injected LINE/OpenAI adapters, and Workspace owns the isolated DRS browser surfaces. This integration branch accepts only independently approved lane commits, overlays them in a recorded order, adds integration-only adapters/tests, and proves the complete local flow with mock transports and a disposable local database when available.

**Tech Stack:** Node.js ES modules and `node:test`, static HTML/CSS/JavaScript, dependency-injected LINE/OpenAI ports, PostgreSQL/Supabase-compatible SQL, bundled Playwright for browser verification.

## Authority And Completion Rules

- Integration worktree: `C:\CodexWork\08-Jacky\worktrees\laibe_MVP_project\drs-w2-integration-20260821`.
- Integration branch: `codex/drs-w2-integration-20260821`.
- Baseline: `dfae8484228c2718486f147b8e22103c7ed2f0f7`.
- Parent issue: `#113`; W2 issues: `#117`, `#118`, `#119`, `#120`.
- A0 existing website UI is immutable. Do not modify or integrate into canonical pages, `pcm_standalone`, shared UI, route manifests, page registry, CTA map, header, navigation, or runtime routes.
- No real credentials, production calls, remote migrations, deploy, push, PR, merge, destructive Git, payment, Budget Engine, Plancraft, tender, bidding, or formal quote/Excel/PDF work.
- A local candidate is not production acceptance. Production/external gates remain separately closed.
- An agent may stop only after an independent `APPROVE` verdict and Commander `FROZEN` instruction. Candidate delivery or local green tests alone are not completion.
- Overall local completion requires every acceptance gate in Task 6 to pass on the exact integrated tree.

### Task 1: Freeze The Cross-Lane Contract And Source Map

**Files:**
- Create: `docs/drs_backend/drs_w2_source_convergence_map.md`
- Create: `tests/drs-w2-source-convergence.test.mjs`
- Read only: all approved W2 lane commits and their exact changed-path inventories

- [x] Record each lane's parent, candidate commit, tree, changed paths, exported API, data fields, migration dependencies, and independent verdict.
- [x] Add a failing source-convergence test for missing commit identity, overlapping writer ownership, unexpected A0 paths, migration timestamp collisions, and unresolved import targets.
- [x] Make the inventory machine-checkable, then tighten it after admission to verify exact frozen commit/tree and byte-for-byte admitted source equality.
- [x] Run `node --test tests/drs-w2-source-convergence.test.mjs` and retain RED/GREEN evidence.

### Task 2: Admit Independently Approved W2 Candidates

**Files:**
- Modify only paths enumerated by the approved Core, A14, and Workspace W2 candidate inventories.
- Modify: `docs/drs_backend/drs_w2_source_convergence_map.md`

- [x] Verify each lane is a clean descendant of its frozen W1 parent and contains only its W2 allowlist.
- [x] Require an independent `APPROVE` result before admission.
- [x] Apply candidates in order: A14 runtime adapter, Core Data/Audit, Workspace data binding. The SQL filename order remains A14 `20260820000000` before Core `20260820090000`.
- [x] After admission, run each lane's focused suite plus source-convergence tests.
- [x] Record exact source commit/tree and admitted integration source paths. The integration commit/tree is recorded in the Commander terminal report after commit creation.

### Task 3: Bind Runtime Ports To The Core Contract

**Files:**
- Create: `src/lib/drs-integration/local-runtime.mjs`
- Create: `src/lib/drs-integration/view-model.mjs`
- Create: `tests/drs-w2-runtime-integration.test.mjs`

- [x] Write RED tests for linked-group admission, duplicate webhook replay, sent-only ingestion, Owner/Vendor unaffected inbound events, advisory AI statuses, Human final authority, unavailable-review break-glass, transport receipt distinction, and audit correlation.
- [x] Bind local A14/Core semantics through explicit injected repositories/transports in the integration contract; no direct network or secret lookup.
- [x] Preserve two non-interchangeable hashes: Core `body_sha256` for exact final text and A14 `transport_payload_sha256` for text plus attachments/deliverables. Verify both; never relabel one as the other.
- [x] Treat A14 webhook `RECEIPT` as an internal inbound-ingestion receipt only. Create Core `RECEIPT` only after outbound transport acceptance and never infer recipient read.
- [x] Keep queued outbox state internal. Append Core `FINAL_MESSAGE` and its following `RECEIPT` only after the mock transport returns accepted; timeout/retry/permanent failure must not fabricate either event.
- [x] Maintain one Core audit tail per case; map A14 correlation IDs to Core events without copying A14's disconnected predecessor graph.
- [x] Derive the specialist identity from an injected verified-session port and an immutable auth-subject binding. Never accept caller-supplied specialist authority.
- [x] Produce role-safe view models for Owner, Vendor, and Specialist without raw provider identifiers or engineering status text.
- [x] Reject missing assignment, expired assignment, unlinked group, invalid snapshot hash, unauthorised Human decision, and fabricated review success.
- [x] Run focused integration tests from clean local state.

### Task 4: Prove Disposable PostgreSQL And RLS Behavior

**Files:**
- Reuse approved Core W2 runtime harness.
- Create only if required by integration: `tests/drs-w2-postgres-integration/**`

- [ ] Apply migrations to a fresh disposable local PostgreSQL database when a supported local executable exists.
- [ ] Prove direct audit mutation denial, FORCE RLS, two-subject isolation, specialist assignment validity, formal group linkage, replay/chain behavior, rollback, and deterministic rerun.
- [ ] Add an integration-owned auth binding and active case-participant projection so Vendor access is explicit, case-bound, time-bounded, and RLS-enforced instead of bypassing Core.
- [x] Map both `OWNER_DRS_PRIVATE` and `OWNER_VENDOR_DRS_SHARED` to Core `group_kind='DRS_CASE_GROUP'`; preserve their visibility distinction in the local integration binding/projection, not by weakening Core's formal-link contract.
- [x] If local PostgreSQL is unavailable, preserve the completed deterministic harness and report the exact executable/tool blocker. Do not replace runtime proof with static claims.
- [x] Keep remote Supabase, live data, credentials, and production migrations closed.

### Task 5: Bind And Exercise The Isolated Workspace

**Files:**
- Modify only approved `src/stitch_laibe_landing_onboarding/drs_standalone/**` paths.
- Create: `tests/drs-w2-workspace-e2e.test.mjs`

- [x] Serve only the isolated DRS workspace from the integration worktree.
- [x] Exercise loading, ready, empty, error, denied, retry, role, current responsibility, next action, case trace, document queue, drawing queue, Human decision, and receipt states.
- [x] Prove LINE remains the routine response surface and complex document/drawing work opens only in the isolated workstation.
- [x] Verify desktop `1440x900` and mobile `390x844`: HTTP 200, no console/page error, no horizontal overflow, no incoherent overlap, correct tab semantics, and no dead production-looking CTA.
- [x] Verify product-visible Traditional Chinese contains no DB/API/mock/debug/source-clean wording.

### Task 6: Run The Overall Local Acceptance Gate

**Files:**
- Create: `docs/drs_backend/drs_w2_local_acceptance_report.md`
- Create: `docs/drs_backend/drs_w2_local_acceptance_report.json`
- Create: `tests/drs-w2-overall-e2e.test.mjs`

- [x] Normal flow: linked LINE sent event -> advisory review no flag -> assigned Human send -> final message -> transport receipt -> case/audit/view-model update.
- [x] Attention flow: advisory attention -> Human `EDIT_AND_SEND` or `OVERRIDE_AND_SEND` with required reason.
- [x] Service unavailable flow: automatic send fails closed -> `MANUAL_EXCEPTION_SEND` requires reason, urgency, and incident id.
- [x] Privacy flow: unlinked group denied; drafts, keystrokes, unsent text, unrelated chats, intermediate Human edits, and hidden chain-of-thought are absent.
- [x] Authority flow: Owner/Vendor messages are unaffected; AI never approves, vetoes, sends, or overrides Human authority.
- [x] Document/drawing flow: large review queue is visible in the isolated workstation; routine replies stay in LINE.
- [x] Security flow: signature failure, replay, identity spoof, expired assignment, bad hash, cross-case access, and forged receipt fail closed in the local contract slice.
- [x] Cancellation flow: record the Human cancellation decision and consume no transport; no Core `FINAL_MESSAGE` or outbound `RECEIPT` may be created.
- [x] Run all lane suites, integration suites, static scans, browser smoke, `git diff --check`, A0 immutable diff guard, and exact-path inventory.
- [ ] Obtain independent security/privacy review and independent browser/product review against the exact final tree.
- [ ] Freeze only when both reviewers return `APPROVE` and every non-external gate is green.

## Overall Status Vocabulary

- `ACTIVE_PROTECTED`: unfinished work is actively assigned.
- `CANDIDATE_PENDING_INDEPENDENT_REVIEW`: local bytes exist but are not complete.
- `FROZEN_LOCAL_LANE`: one lane has independent approval and Commander freeze.
- `DRS_W2_LOCAL_INTEGRATED_CANDIDATE`: all local gates pass on one exact tree.
- `BLOCKED_EXTERNAL_GATE`: only a credential/account/production/deployment gate remains; name it exactly.
- `PRODUCTION_READY` and `LAUNCHED` are forbidden unless separately authorised and verified in their own gates.
