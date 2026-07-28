# A5 Knowledge Foundation Recovery And Core Readiness Implementation Plan

> [!CAUTION]
> **HISTORICAL_PLAN_SUPERSEDED_FOR_EXECUTION.** 本計畫中的 recovery 命令已完成且不得重跑。任何舊磁碟路徑或 historical placeholder 都是 `HISTORICAL_ONLY_DO_NOT_EXECUTE`；現行 C-only 證據與驗證命令請使用 `docs/governance/A5_KNOWLEDGE_FOUNDATION_C_DRIVE_REVALIDATION_20260728.md`。

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Recover the A5 Knowledge Foundation into an independently reviewable Git branch, harden it to an RPC-only PCM reviewer surface, repair the Knowledge Studio human workflow, and produce an unapplied LaiBE Core reconciliation bundle.

**Architecture:** Preserve the original A5 package in one immutable checkpoint, then add security and product changes as separate commits. Browser clients call Edge Functions with user JWTs; Edge Functions call an explicit allowlist of public RPCs; the public RPCs are tightly scoped security-definer boundaries with internal authorization checks and no direct client table privileges. LaiBE Core receives a generated, transaction-bound reconciliation bundle that fails before touching any non-A5 object when the target is incompatible.

**Tech Stack:** PostgreSQL 17 / Supabase migrations and Edge Functions, Deno TypeScript, browser-native HTML/CSS/ES modules, Node test runner, Python unittest, PGlite, Git worktrees, GitHub Draft PR.

## Global Constraints

- Source snapshot: exactly 50 A5 files, 570,943 bytes, copied from `HISTORICAL_RETIRED_SOURCE_ROOT` (`HISTORICAL_ONLY_DO_NOT_EXECUTE`).
- Clean base: `origin/main` at `e31287e10d78537cd7a0cb901a7e3e1cb5a2f6a5`.
- Historical worktree: `HISTORICAL_RETIRED_WORKTREE` (`HISTORICAL_ONLY_DO_NOT_EXECUTE`).
- Branch: `a5/knowledge-foundation-core-readiness-20260727`.
- Exact snapshot commit: `d0ce795` (`checkpoint: recover A5 knowledge foundation exact snapshot`).
- Do not modify the original dirty workspace, `main`, PR #111, A0 worktree, PCM public routes, or Plan Puzzle.
- Do not apply migrations, deploy functions, write data, or change configuration on any Supabase project.
- Do not create a paid Supabase branch.
- Knowledge Studio is PCM/admin internal only; owner/pro users do not enter it.
- Contracted owner/pro/PCM communication remains a LINE Bot concern; Studio is not a LINE replacement.
- A12 remains PDF-only and cannot create budget or contract decisions.
- No service-role key, JWT, publishable key, password, real domain, or secret may enter Git.
- No payment, escrow, custody, legal-effect, formal electronic-signature, or production-ready claim.

---

### Task 1: Bind The Exact Recovery Snapshot

**Files:**
- Historical source manifest outside repository: `HISTORICAL_RETIRED_WORKTREE\A5_KNOWLEDGE_FOUNDATION_SNAPSHOT_MANIFEST_20260727.json` (`HISTORICAL_ONLY_DO_NOT_EXECUTE`)
- Later copy into repository: `docs/governance/A5_KNOWLEDGE_FOUNDATION_SNAPSHOT_MANIFEST_20260727.json`

**Interfaces:**
- Consumes: original A5 dirty-workspace files.
- Produces: immutable checkpoint `d0ce795` and a path/SHA baseline for every later diff.

- [x] **Step 1: Discover the GitHub source without changing the dirty repository**

Use GitHub PR #111 to bind the repository to `laibeoffer/laibe-mvp`; do not add an `origin` to the dirty repository.

- [x] **Step 2: Fetch a clean base through an external control clone**

```powershell
# HISTORICAL_ONLY_DO_NOT_EXECUTE
git clone --no-checkout https://github.com/laibeoffer/laibe-mvp.git `
  HISTORICAL_RETIRED_CONTROL_CLONE
git -c safe.directory=* fetch origin main
git -c safe.directory=* rev-parse origin/main
```

Expected: `e31287e10d78537cd7a0cb901a7e3e1cb5a2f6a5`.

- [x] **Step 3: Create the linked worktree and branch**

```powershell
# HISTORICAL_ONLY_DO_NOT_EXECUTE
git -c safe.directory=* worktree add `
  -b a5/knowledge-foundation-core-readiness-20260727 `
  HISTORICAL_RETIRED_WORKTREE `
  origin/main
```

- [x] **Step 4: Copy only the 50-file whitelist**

Exclude all `__pycache__` directories and `.pyc` files. Verify target SHA-256 values against the source manifest.

Expected: 50 files, 570,943 bytes, zero SHA mismatch.

- [x] **Step 5: Commit the byte-exact snapshot**

```powershell
git -c safe.directory=* commit `
  -m "checkpoint: recover A5 knowledge foundation exact snapshot"
```

Expected: `d0ce795`; 50 files. The original Markdown hard-break trailing spaces remain in this checkpoint by design.

---

### Task 2: Write Security And Core-Reconciliation RED Contracts

**Files:**
- Create: `supabase/tests/core_readiness_security_contract.test.mjs`
- Create: `supabase/tests/core_reconciliation_contract.test.mjs`
- Modify: `supabase/tests/foundation_contract.test.mjs`
- Modify: `tests/knowledge/pglite_migration_smoke.test.ts`
- Test: the four files above

**Interfaces:**
- Consumes: current migration corpus and Edge Function source.
- Produces: failing contracts for RPC-only access, explicit grants, CORS, server completeness, reconciliation and non-A5 isolation.

- [ ] **Step 1: Add the failing privilege-surface test**

The test must require:

```js
assert.match(sql, /revoke all privileges on all tables in schema knowledge/i);
assert.match(sql, /revoke all privileges on all tables in schema knowledge_staging/i);
assert.match(sql, /revoke all privileges on all tables in schema casework/i);
assert.doesNotMatch(sql, /grant execute on all functions/i);
```

It must enumerate every allowed public RPC signature and every allowed internal helper signature. Any unlisted `authenticated` execute grant fails.

- [ ] **Step 2: Add the failing authorization test**

Require:

- no `anon` or `PUBLIC` execution on A5 RPC/helper functions;
- no owner/pro Studio reviewer path;
- PCM/admin role plus active session for Studio operations;
- case membership and domain checks for case/Gateway operations;
- fixed empty `search_path`;
- explicit security-definer designation only for reviewed RPC boundaries.

- [ ] **Step 3: Add the failing CORS test**

Require:

```js
assert.match(studioEdge, /KNOWLEDGE_STUDIO_ALLOWED_ORIGINS/);
assert.match(gatewayEdge, /KNOWLEDGE_GATEWAY_ALLOWED_ORIGINS/);
assert.match(studioEdge, /CORS_CONFIGURATION_MISSING/);
assert.match(gatewayEdge, /ORIGIN_NOT_ALLOWED/);
```

No fallback may reflect the first configured origin for a disallowed request.

- [ ] **Step 4: Add the failing server-completeness test**

Require one server helper and one atomic RPC to reject missing title, type, owner, summary, criteria, next owner and evidence before submission. Publish must call the same completeness helper.

- [ ] **Step 5: Add the failing Core reconciliation test**

Require an ordered bundle with:

- exact source component hashes;
- one outer transaction;
- preflight rejection when any A5 schema already exists without the expected marker;
- no DDL against non-A5 `public` tables;
- explicit public RPC creation only;
- rollback limited to A5 schemas, exact public functions, exact policies and exact buckets;
- a verification script that proves the bundle has not been applied remotely.

- [ ] **Step 6: Run RED**

```powershell
node --test --test-reporter=tap `
  supabase/tests/core_readiness_security_contract.test.mjs `
  supabase/tests/core_reconciliation_contract.test.mjs
```

Expected: failures for missing hardening migration, atomic submit RPC, CORS rejection and Core bundle.

---

### Task 3: Implement RPC-Only Supabase Hardening

**Files:**
- Create: `supabase/migrations/20260727193000_pcm_knowledge_rpc_surface_hardening.sql`
- Modify: `supabase/functions/knowledge-studio/index.ts`
- Modify: `supabase/functions/knowledge-gateway/index.ts`
- Modify: `supabase/functions/knowledge-ingest/index.ts` only if the explicit RPC map requires it
- Modify: `supabase/contracts/knowledge_studio.v1.schema.json`
- Test: `supabase/tests/core_readiness_security_contract.test.mjs`
- Test: `supabase/tests/foundation_contract.test.mjs`

**Interfaces:**
- Consumes: user JWT, `auth.uid()`, `auth.jwt()->app_metadata.role`, active `auth.sessions`, case membership and knowledge domain.
- Produces: explicit public RPC-only surface; direct A5 table access is unavailable to `anon` and `authenticated`.

- [ ] **Step 1: Revoke direct table and sequence privileges**

The migration must revoke `ALL PRIVILEGES` from `PUBLIC`, `anon` and `authenticated` on all tables and sequences in the three A5 schemas, plus matching default privileges. Keep schema `USAGE` only where exact Storage-policy helpers require it.

- [ ] **Step 2: Replace broad function grants**

Remove every `grant execute on all functions`. Revoke execute from `PUBLIC`, `anon` and `authenticated`, then re-grant only exact reviewed signatures.

- [ ] **Step 3: Establish reviewed security-definer RPC boundaries**

Public RPCs may be security definer only when they:

- use `set search_path = ''`;
- check PCM/admin plus active session for Studio;
- check domain access for knowledge search;
- check case membership for case evidence/finding;
- preserve `formalImpact = none`;
- do not accept price, budget-decision or contract-decision authority from A12.

Internal trigger functions remain non-client-callable.

- [ ] **Step 4: Add server-side completeness**

Create a private helper that validates all required Studio fields. Add `public.knowledge_studio_save_and_submit(...)` so save plus submission occurs in one database transaction. Invoke the same helper from publication.

- [ ] **Step 5: Keep FORCE RLS selective**

Do not blanket-enable FORCE RLS. Document that security-definer RPCs intentionally own the table boundary; forcing owner RLS across all 26 tables could break legitimate atomic RPCs. Preserve existing FORCE RLS only where its behavior is covered by PGlite contracts.

- [ ] **Step 6: Make CORS fail closed**

For Studio and Gateway:

- an empty allowlist returns a controlled configuration failure;
- an `Origin` header not in the allowlist returns 403;
- preflight requires an allowed origin;
- a non-browser request without `Origin` is allowed only when the allowlist is configured;
- no real domain is committed.

Document only:

```text
KNOWLEDGE_STUDIO_ALLOWED_ORIGINS
KNOWLEDGE_GATEWAY_ALLOWED_ORIGINS
```

- [ ] **Step 7: Run GREEN**

```powershell
node --test --test-reporter=tap `
  supabase/tests/foundation_contract.test.mjs `
  supabase/tests/core_readiness_security_contract.test.mjs
deno fmt --check supabase/functions
deno check supabase/functions/knowledge-ingest/index.ts
deno check supabase/functions/knowledge-studio/index.ts
deno check supabase/functions/knowledge-gateway/index.ts
```

Expected: zero failure.

---

### Task 4: Write Knowledge Studio Workflow RED Contracts

**Files:**
- Modify: `site/knowledge_studio/tests/knowledge_studio.test.mjs`
- Create: `site/knowledge_studio/tests/knowledge_studio_dom_contract.test.mjs`
- Test: both files

**Interfaces:**
- Consumes: draft buffer, store/adapter operations and responsive page markup.
- Produces: failing human-workflow tests independent from browser screenshots.

- [ ] **Step 1: Test unsaved new-draft behavior**

Clicking/starting a new draft must not call `createDraft`. Cancelling returns to the list and leaves record count unchanged.

- [ ] **Step 2: Test atomic save-and-submit**

The UI/controller must make one `saveAndSubmitReview` call containing the latest form data. A failed call leaves the local record and selected form in draft state with no partial event.

- [ ] **Step 3: Test field-level completeness**

Require human-readable errors for:

```text
規則名稱、類型、負責人、規則摘要、判斷條件、下一位處理者、來源依據
```

The first invalid field receives focus.

- [ ] **Step 4: Test formal/destructive confirmations**

Return, publish and retire must expose action-specific impact text, cancel safely, and report success/failure consistently.

- [ ] **Step 5: Test mobile list/detail navigation**

The DOM contract must require:

- explicit list and detail panel states;
- a visible mobile-only `返回規則清單` control;
- selecting a row sets detail mode immediately;
- back returns to list mode without deleting selection;
- desktop selected state remains.

- [ ] **Step 6: Test loading/error/disabled/unsaved states**

Require `aria-busy`, disabled actions during requests, an unsaved indicator, before-unload protection, empty state and recoverable product-language error state.

- [ ] **Step 7: Run RED**

```powershell
node --test --test-reporter=tap `
  site/knowledge_studio/tests/knowledge_studio.test.mjs `
  site/knowledge_studio/tests/knowledge_studio_dom_contract.test.mjs
```

Expected: failures for missing draft buffer, atomic operation, confirmations and mobile back navigation.

---

### Task 5: Implement The Knowledge Studio Human Workflow

**Files:**
- Modify: `site/knowledge_studio/app.js`
- Modify: `site/knowledge_studio/code.html`
- Modify: `site/knowledge_studio/styles.css`
- Modify: `site/knowledge_studio/tests/knowledge_studio.test.mjs`
- Modify: `supabase/functions/knowledge-studio/index.ts`
- Test: Studio tests and security contracts

**Interfaces:**
- Consumes: validated draft form data and explicit user confirmation.
- Produces: saved draft or atomic pending-review state with traceable source, next owner and next action.

- [ ] **Step 1: Add an unsaved draft buffer**

`新增草稿` opens a form-only buffer with no ID and no store call. `取消` restores the list; `儲存草稿` is the first persistence operation.

- [ ] **Step 2: Add validation and inline field errors**

Export one shared client validator, attach messages with `aria-describedby`, focus the first invalid field and retain user input after failure.

- [ ] **Step 3: Add atomic submission**

Implement `saveAndSubmitReview` in LocalKnowledgeStore and GatewayAdapter. The remote adapter sends a single `saveAndSubmitReview` operation; the Edge Function routes to the atomic SQL RPC.

- [ ] **Step 4: Add action confirmation**

Use one accessible confirmation dialog for return, publish and retire. Each action states what changes, what remains traceable, and whether the rule remains retrievable.

- [ ] **Step 5: Add operation states**

Disable relevant actions during requests, expose `aria-busy`, retain unsaved changes after server failure, and provide consistent success/error feedback.

- [ ] **Step 6: Add responsive list-to-detail**

At mobile width, selecting a record immediately switches to the detail panel and focuses its heading. The back control returns to the list. At desktop width, preserve master-detail and the current selected-row treatment.

- [ ] **Step 7: Mature the product copy**

Use `PCM 規則治理中心` and explicitly state that sample rules demonstrate the workflow and are not case facts. Do not expose DB/API/mock/debug terminology or imply publication has legal effect.

- [ ] **Step 8: Increment asset versions**

If `app.js` changes, increment its `?v=` in `code.html`. If `styles.css` changes, increment its `?v=` as well.

- [ ] **Step 9: Run GREEN**

```powershell
node --test --test-reporter=tap `
  site/knowledge_studio/tests/knowledge_studio.test.mjs `
  site/knowledge_studio/tests/knowledge_studio_dom_contract.test.mjs `
  supabase/tests/core_readiness_security_contract.test.mjs
```

Expected: zero failure.

---

### Task 6: Build The Unapplied LaiBE Core Reconciliation Bundle

**Files:**
- Create: `scripts/knowledge/build_core_reconciliation.mjs`
- Create: `scripts/knowledge/tests/test_build_core_reconciliation.mjs`
- Create: `supabase/core_reconciliation/manifest.json`
- Create: `supabase/core_reconciliation/000_preflight.sql`
- Create: `supabase/core_reconciliation/010_a5_knowledge_foundation.sql`
- Create: `supabase/core_reconciliation/900_verify.sql`
- Create: `supabase/core_reconciliation/990_rollback.sql`
- Create: `supabase/core_reconciliation/README.md`
- Modify: `tests/knowledge/pglite_migration_smoke.test.ts`

**Interfaces:**
- Consumes: ordered local A5 migration corpus and its SHA-256 values.
- Produces: deterministic one-transaction Core bundle plus preflight, verification and rollback contracts.

- [ ] **Step 1: Bind the Core inventory**

Record the read-only Core facts:

- project ref `zdwuyomhswjcbbpbhpcq`;
- zero project migrations;
- no `public`, `knowledge`, `knowledge_staging` or `casework` application tables;
- only Supabase-managed auth/storage/extensions/vault objects exist.

- [ ] **Step 2: Write the generator RED test**

The test must prove deterministic output, component-hash verification, outer-transaction normalization and rejection of unexpected migration names.

- [ ] **Step 3: Implement deterministic bundle generation**

Build from the five snapshot migrations plus the new hardening migration. Strip only their outer transaction wrappers; preserve function bodies and quoted semicolons.

- [ ] **Step 4: Add fail-fast preflight**

The preflight permits existing non-A5 schemas/tables. It aborts before DDL if any A5 schema/object exists without the expected reconciliation marker. It never drops or renames existing objects.

- [ ] **Step 5: Add scoped rollback and verification**

Rollback requires a matching A5 bundle marker and zero formal/case data, then drops only exact A5 policies, buckets, public functions and schemas. Verification reports exact object, RLS, privilege and function-grant counts.

- [ ] **Step 6: Prove local application**

```powershell
node --test --test-reporter=tap `
  scripts/knowledge/tests/test_build_core_reconciliation.mjs `
  supabase/tests/core_reconciliation_contract.test.mjs
powershell -NoProfile -ExecutionPolicy Bypass `
  -File tests/knowledge/run_pglite_unc_safe.ps1
```

Expected: reconciliation applies from an empty application schema, rejects a partial A5 collision, does not alter a sentinel non-A5 table and rolls back only its own objects.

- [ ] **Step 7: Preserve the remote no-apply proof**

Re-read Core migrations and A5-schema table inventory. Expected after local work: still zero. Do not call any Supabase mutation tool.

---

### Task 7: Create Governance, Apply Checklist And Snapshot Evidence

**Files:**
- Create: `docs/governance/A5_KNOWLEDGE_FOUNDATION_SNAPSHOT_MANIFEST_20260727.json`
- Create: `docs/governance/A5_KNOWLEDGE_FOUNDATION_CORE_READINESS_REPORT_20260727.md`
- Create: `docs/governance/A5_LAIBE_CORE_APPLY_CHECKLIST_20260727.md`
- Modify: `docs/governance/A5_KNOWLEDGE_FOUNDATION_BRANCH_VERIFICATION_20260727.md`
- Modify: `supabase/README.md`

**Interfaces:**
- Consumes: immutable snapshot, final commits, test evidence, advisor baseline and Core inventory.
- Produces: reviewer-readable provenance, before/after privilege matrix and explicit Owner gates.

- [ ] **Step 1: Copy the external manifest**

Preserve the exact 50 source hashes and add the snapshot commit SHA without changing the original `files` array.

- [ ] **Step 2: Document permission changes**

Show before/after for:

- table privileges;
- GraphQL discoverability;
- schema usage;
- public RPC/helper execute grants;
- owner/pro/PCM/admin Studio access;
- Storage membership behavior;
- CORS behavior.

- [ ] **Step 3: Document Core apply controls**

Include ordered commands, expected locks, estimated downtime, preflight, backup requirement, rollback conditions and every action requiring new A0/Owner approval.

- [ ] **Step 4: Record remaining limitations**

State that:

- Core migration is not applied;
- no production consumer is connected;
- Studio data remains local demonstration data unless an approved endpoint is configured;
- LINE Bot integration is outside this PR;
- no formal knowledge is published;
- AI PCM is not production-ready.

---

### Task 8: Full Verification And Browser Acceptance

**Files:**
- Verify all files in the branch.
- Store screenshots outside Git unless the PR explicitly needs them.

**Interfaces:**
- Consumes: one immutable candidate commit.
- Produces: fresh technical, security and human-visible acceptance evidence.

- [ ] **Step 1: Run all Node tests**

Run the original seven files plus every new `.mjs` test. Report per-file and total counts.

- [ ] **Step 2: Run Python tests**

```powershell
py -3.14 -m unittest discover -s scripts/knowledge/tests -p "test*.py" -v
```

Expected baseline: 24/24 plus any new Python tests.

- [ ] **Step 3: Run PGlite, Deno and JSON checks**

Run PGlite smoke/reconciliation contracts, `deno fmt --check`, `deno check`, and parse every JSON contract/fixture/manifest.

- [ ] **Step 4: Run local privilege/advisor-equivalent checks**

Prove zero `anon`/`authenticated` table privileges on the 26 A5 tables, zero broad function grants, exact RPC/helper grants and preserved Storage policies. Compare against the read-only remote advisor baseline without mutating it.

- [ ] **Step 5: Test desktop**

At `1440x900`, test:

- new draft, cancel and save;
- incomplete submit errors;
- successful atomic submit;
- return/publish/retire confirmation cancellation;
- loading/error/disabled/unsaved behavior;
- keyboard focus;
- selected row;
- no horizontal overflow;
- console zero error/warning.

- [ ] **Step 6: Test mobile**

At `390x844`, test record selection, immediate detail display, back-to-list, form errors, action confirmation, no 2,000px hidden-detail pattern and no horizontal overflow.

- [ ] **Step 7: Request independent code review**

Dispatch a reviewer with:

- base `d0ce795`;
- candidate HEAD;
- this plan;
- explicit focus on security-definer authorization, transactional submission, Core non-interference and mobile workflow.

Resolve every Critical/Important finding before publication.

- [ ] **Step 8: Verify the Git candidate**

```powershell
git -c safe.directory=* diff --check origin/main...HEAD
git -c safe.directory=* status --short
git -c safe.directory=* diff --name-only origin/main...HEAD
```

Expected: clean status; changed paths limited to the A5 whitelist plus explicitly documented recovery/hardening files.

---

### Task 9: Publish A Draft PR Without Merge

**Files:**
- No new product files.
- PR body generated from verified evidence.

**Interfaces:**
- Consumes: clean reviewed branch.
- Produces: one pushed branch and one Draft PR targeting `main`.

- [ ] **Step 1: Create one or more correction commits**

Keep security/Core and Studio UX changes in reviewable commits. Do not amend `d0ce795`.

- [ ] **Step 2: Verify GitHub publication prerequisites**

Use the GitHub connector for repository identity and PR creation. The local `gh` executable is currently absent; do not install it or change global tools without Owner approval. Local Git push may proceed only if existing Git credentials work.

- [ ] **Step 3: Push only the A5 branch**

```powershell
git -c safe.directory=* push -u origin `
  a5/knowledge-foundation-core-readiness-20260727
```

- [ ] **Step 4: Open a Draft PR**

Target `main`, leave PR #111 untouched, and include:

- Core migration not applied;
- production consumers not connected;
- Studio is PCM/admin internal only;
- contracted owner/pro communication remains via LINE Bot;
- no formal knowledge publication;
- no payment/escrow/old-house-investment content;
- no production-readiness claim.

- [ ] **Step 5: Report to A0**

Report the base SHA, worktree, snapshot and correction SHAs, branch, Draft PR URL, manifest, changed files, security before/after, browser evidence, full test totals, unapplied Core proof and next Owner gate.

---

## Plan Self-Review

- Spec coverage: every section of the A0 dispatch maps to Tasks 1-9.
- Placeholder scan: no `TBD`, `TODO` or unspecified implementation step remains.
- Type consistency: `saveAndSubmitReview` is the single client/store/Edge operation; `knowledge_studio_save_and_submit` is the single SQL RPC.
- Scope check: no Plan Puzzle, budget-price selection, public owner/pro Studio, LINE implementation or remote Supabase mutation is included.
- Execution mode: inline execution is already authorized by the A0 dispatch; no additional plan-choice prompt is required.
