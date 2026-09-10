# DRS 最高審查官升任與治理權限實作計畫

> **For Codex:** REQUIRED SUB-SKILL: Use `executing-plans` to implement this plan task-by-task. Before each implementation slice, also use the task-specific skills named below.

**Goal:** 在不建立第二套帳號、不放大案件權限的前提下，讓後端認定的 DRS 系統擁有者可以從已核准且目前有效的一般審查員中，指定或撤銷多位最高審查官，並讓每次變更都有不可竄改、可追溯的治理紀錄。

**Architecture:** 保留現有 Email/password 與一般審查員註冊流程，將最高審查官實作成「有效一般審查員身分」與「有效註冊治理 grant」的交集。Postgres 是唯一 authority：私有 owner grant 驗證目前操作者，原子 RPC 重新驗證候選身分、版本、期限、idempotency 與 audit；Core Edge Functions 只做 live Auth session、request boundary 與 sanitized DTO；Internal Sites 只代理 bearer credential 並呈現兩個彼此獨立的 capability——一般審查員申請核准與最高審查官設定。

**Tech Stack:** PostgreSQL / Supabase Auth / Supabase Edge Functions (Deno + TypeScript) / Internal Sites (Vinext + Cloudflare Worker routes) / Vanilla HTML, CSS, JavaScript / Node test runner / disposable real PostgreSQL / Playwright browser acceptance。

**Confirmed specification:** `docs/superpowers/specs/2026-09-10-drs-highest-reviewer-promotion-design.md` at Core commit `61b7dd49a9819721c347486dc994c53f1c45faca`.

---

## 0. 執行邊界與不可變決策

### 0.1 產品規格

- 最高審查官先是目前有效的一般審查員；Email 未驗證、Auth user 已刪除／停權、specialist 非 active、binding 非 active／未生效／已逾期時都不能升任。
- 使用同一組 Email/password，不新增最高審查官註冊頁、不建立第二個帳號。
- 系統擁有者從私有 `drs_forward_private.governance_owner_grants` 取得管理能力；瀏覽器、JWT metadata、Email allowlist、`user_metadata`、URL 與 localStorage 都不是 authority。
- 可以同時有多位最高審查官；升任第二位不得取代第一位，撤銷一位不得影響其他人。
- 升任只增加一般審查員註冊治理能力；回應必須固定 `caseAccessChanged: false`，且案件、文件、報價與工作區權限前後完全不變。
- owner 可以在自己同時是有效一般審查員時升任自己；這仍是 owner-authorized、audited server command，不是公開自助升任。
- 不提供任何 browser/service endpoint 新增 owner。第一次 owner bootstrap 只能由另行核准的資料庫管理 authority 直接 provision，並由 trigger 留下 owner-grant event。
- 既有 public `drs-reviewer-registration-authority` 只表示審核窗口是否已配置，不表示目前登入者的 capability。
- 登入後，以既有受保護 queue 成功與否判定 `canReviewRegistrations`；以新的 candidates 成功與否判定 `canManageHighestReviewers`。兩種 capability 必須獨立呈現與 fail closed。
- 不把舊的 `public.drs_specialists`／`integration.drs_auth_specialist_bindings` 與目前 Email/password 註冊治理使用的 `drs_forward_private.specialists`／`drs_forward_private.auth_specialist_bindings` 靜默視為等價。本輪只使用後者；若 remote schema 不具備預期關係，停止為 `IDENTITY_AUTHORITY_SCHEMA_DRIFT`。

### 0.2 Source identities 與 worktrees

**Core source record**

- Repository: `C:\CodexWork\08-Jacky\worktrees\laibe_MVP_project\c-plus-highest-reviewer-design-20260910`
- Confirmed spec commit: `61b7dd49a9819721c347486dc994c53f1c45faca`
- Implementation worktree to create: `C:\CodexWork\08-Jacky\worktrees\laibe_MVP_project\c-plus-highest-reviewer-impl-20260910`
- Implementation branch: `drs-auth/c-plus-highest-reviewer-impl-20260910`

**Sites source record**

- Repository snapshot: `876af6cac21709b8ec201f594734599fcad607c0`
- Existing read-only/dirty worktree: `C:\CodexWork\08-Jacky\worktrees\sites\a-plus-internal-drs-split-20260908`
- Fresh implementation worktree to create: `C:\CodexWork\08-Jacky\worktrees\sites\c-plus-highest-reviewer-promotion-20260910`
- Implementation branch: `sites/c-plus-highest-reviewer-promotion-20260910`
- Protected and forbidden in the original Sites worktree: `tests/drs-dashboard-chain.test.mjs` and `.codex-sites-package/`.

Do not reuse or clean either protected dirty worktree. If either target worktree path or branch already exists, inspect its exact branch, HEAD, owner and status read-only; do not delete, reset or create a duplicate until it is classified.

### 0.3 Required skills by phase

- Worktree creation: `using-git-worktrees`.
- Every feature/bugfix slice: `test-driven-development`.
- Any unexpected failure: `systematic-debugging`.
- Core data/Auth/Edge work: `supabase:supabase`, `supabase:supabase-postgres-best-practices` and `drs-supabase-real-runtime`.
- Internal Site work: `sites:sites-building`.
- Pre-submission: `simplify`, `requesting-code-review` and `verification-before-completion`.
- Production Sites publication, only after explicit production authority: `sites:sites-hosting`.
- Final browser/runtime acceptance: `drs-canonical-browser-acceptance` and `drs-supabase-real-runtime`.

### 0.4 ONE_FILE = ONE_WRITER

- Core writer owns only `supabase/migrations/`, the exact Core function paths, `supabase/config.toml` and the named Core tests.
- Sites writer owns only the fresh Sites worktree and the exact Site files named in Tasks 7–9.
- An independent reviewer remains read-only.
- Parallel Core/Sites work may begin only after Task 1 records both immutable source identities and Section 1 DTOs are treated as frozen.

### 0.5 Production and secret boundary

Tasks 1–10 are local source construction and verification only. They do not authorize push, PR, merge, remote migration, Edge deployment, Site version save/deploy, owner grant provision, Auth-user mutation, password handling or provider configuration. Tasks 11–12 run only after explicit production authority and an exact existing Auth user ID are supplied through the approved operational channel. Never read, echo, store or commit passwords, bearer tokens, OTPs, service-role keys or provider secrets.

---

## 1. Frozen HTTP and RPC contract

Use exactly one schema version for both new operations:

```text
laibe.drs-highest-reviewer-governance.v1
```

### 1.1 Candidates request

```json
{
  "cursor": null
}
```

For subsequent pages, `cursor` is either `null` or this exact object:

```json
{
  "sortEmail": "verified@example.com",
  "candidateKey": "server-issued-uuid"
}
```

Rules:

- Page size is 25.
- Sort by normalized verified Email, then `candidateKey`.
- `candidateKey` is a server-issued stable UUID: current binding ID where available, otherwise existing grant ID.
- Cursor fields are ordering input only and never authority. The RPC revalidates owner/session and every returned identity.
- Extra keys, malformed Email, invalid UUID, or a cursor not found in the ordered candidate relation returns `INVALID_REQUEST`.

### 1.2 Candidates success

```json
{
  "schemaVersion": "laibe.drs-highest-reviewer-governance.v1",
  "state": "HIGHEST_REVIEWER_CANDIDATES_READY",
  "candidates": [
    {
      "candidateKey": "server-issued-uuid",
      "displayName": "審查員姓名",
      "accountEmail": "verified@example.com",
      "subject": {
        "authBindingId": "server-issued-uuid",
        "bindingVersion": 3,
        "grantId": null,
        "grantVersion": null
      },
      "qualification": {
        "state": "active",
        "validUntil": "2027-09-10T00:00:00.000Z"
      },
      "governanceGrant": {
        "state": "never_granted",
        "validUntil": null
      },
      "effectiveHighestReviewer": false,
      "availableAction": "grant"
    }
  ],
  "nextCursor": null
}
```

Exact enums:

- `qualification.state`: `active | inactive | expired | revoked`.
- `governanceGrant.state`: `never_granted | active | expired | revoked | legacy_identity_unresolved`.
- `availableAction`: `grant | revoke | reconciliation_required | null`.
- Empty relation returns the same exact shape with `state: "NO_ELIGIBLE_REVIEWERS"`, `candidates: []` and `nextCursor: null`.
- Historical grant subjects remain visible even when reviewer qualification is no longer active, so an owner can revoke a residual grant.
- Full verified Email is returned only by this owner-authorized response and must never enter URL, durable browser storage or logs.

### 1.3 Decision request

All keys are required, including nullable keys:

```json
{
  "subject": {
    "authBindingId": "server-issued-uuid",
    "bindingVersion": 3,
    "grantId": null,
    "expectedGrantVersion": null
  },
  "decision": "grant",
  "reason": "負責審查員申請治理與交叉覆核",
  "idempotencyKey": "client-generated-uuid"
}
```

Rules:

- `decision` is exactly `grant | revoke`.
- `reason` is trimmed, 1–500 Unicode characters.
- `idempotencyKey` must be a UUID.
- First grant requires both `grantId` and `expectedGrantVersion` to be `null`.
- Regrant/revoke requires the exact server-returned `grantId` and non-negative integer `expectedGrantVersion`.
- Grant/regrant requires non-null `authBindingId` and integer `bindingVersion` and compares the live binding version.
- Revoke uses the identity already stored in the grant and compares only the grant version; it remains possible after the live reviewer binding was revoked, replaced or expired.
- Browser requests containing owner ID, actor user ID, specialist ID, subject user ID, operation, scope, role, expiration or case selector are rejected.

### 1.4 Decision success

```json
{
  "schemaVersion": "laibe.drs-highest-reviewer-governance.v1",
  "state": "HIGHEST_REVIEWER_GRANTED",
  "subject": {
    "authBindingId": "server-issued-uuid",
    "bindingVersion": 3,
    "grantId": "server-issued-uuid",
    "grantVersion": 1
  },
  "decision": {
    "decisionId": "server-issued-uuid",
    "outcome": "grant",
    "decidedAt": "2026-09-10T12:00:00.000Z"
  },
  "governanceGrant": {
    "state": "active",
    "validUntil": "2027-09-10T12:00:00.000Z"
  },
  "caseAccessChanged": false,
  "replayed": false
}
```

- Revoke uses `state: "HIGHEST_REVIEWER_REVOKED"`, `outcome: "revoke"` and `governanceGrant.state: "revoked"`.
- `validUntil` for grant/regrant is calculated server-side as `min(binding.valid_until, decided_at + interval '365 days')`.
- Repeating the same owner/idempotency key/payload returns the same decision and grant receipt with `replayed: true` and performs no new mutation.
- Reusing an idempotency key with a different canonical payload returns `IDEMPOTENCY_CONFLICT`.

### 1.5 Error envelope and HTTP mapping

Every error body has only:

```json
{
  "schemaVersion": "laibe.drs-highest-reviewer-governance.v1",
  "state": "FINITE_STATE"
}
```

| HTTP | State |
|---:|---|
| 400 | `INVALID_REQUEST` |
| 401 | `AUTH_REQUIRED` |
| 403 | `GOVERNANCE_OWNER_NOT_AUTHORIZED` |
| 409 | `REVIEWER_QUALIFICATION_CONFLICT` |
| 409 | `HIGHEST_REVIEWER_GRANT_CONFLICT` |
| 409 | `LEGACY_GRANT_RECONCILIATION_REQUIRED` |
| 409 | `IDEMPOTENCY_CONFLICT` |
| 503 | `TEMPORARILY_UNAVAILABLE` |

Do not return RPC names, SQL errors, Auth rows, stack traces, raw upstream bodies or secret values.

---

## Task 1: 建立兩個乾淨且身份固定的 implementation worktrees

**Files:**

- Read: applicable `AGENTS.md` in each repository path.
- Create worktree only: `C:\CodexWork\08-Jacky\worktrees\laibe_MVP_project\c-plus-highest-reviewer-impl-20260910`.
- Create worktree only: `C:\CodexWork\08-Jacky\worktrees\sites\c-plus-highest-reviewer-promotion-20260910`.
- Do not modify product files in this task.

**Step 1: Inspect target names before mutation**

Run from `C:\CodexWork\08-Jacky`:

```powershell
git -C C:\CodexWork\08-Jacky\worktrees\laibe_MVP_project\c-plus-highest-reviewer-design-20260910 worktree list --porcelain
git -C C:\CodexWork\08-Jacky\worktrees\sites\a-plus-internal-drs-split-20260908 worktree list --porcelain
git -C C:\CodexWork\08-Jacky\worktrees\laibe_MVP_project\c-plus-highest-reviewer-design-20260910 branch --list drs-auth/c-plus-highest-reviewer-impl-20260910
git -C C:\CodexWork\08-Jacky\worktrees\sites\a-plus-internal-drs-split-20260908 branch --list sites/c-plus-highest-reviewer-promotion-20260910
```

Expected: neither target path nor branch exists. If any exists, stop and reconcile it read-only; do not remove it.

**Step 2: Create the Core worktree**

```powershell
git -C C:\CodexWork\08-Jacky\worktrees\laibe_MVP_project\c-plus-highest-reviewer-design-20260910 worktree add -b drs-auth/c-plus-highest-reviewer-impl-20260910 C:\CodexWork\08-Jacky\worktrees\laibe_MVP_project\c-plus-highest-reviewer-impl-20260910 61b7dd49a9819721c347486dc994c53f1c45faca
```

**Step 3: Create the Sites worktree**

```powershell
git -C C:\CodexWork\08-Jacky\worktrees\sites\a-plus-internal-drs-split-20260908 worktree add -b sites/c-plus-highest-reviewer-promotion-20260910 C:\CodexWork\08-Jacky\worktrees\sites\c-plus-highest-reviewer-promotion-20260910 876af6cac21709b8ec201f594734599fcad607c0
```

**Step 4: Verify identities and clean state**

```powershell
git -C C:\CodexWork\08-Jacky\worktrees\laibe_MVP_project\c-plus-highest-reviewer-impl-20260910 rev-parse HEAD
git -C C:\CodexWork\08-Jacky\worktrees\laibe_MVP_project\c-plus-highest-reviewer-impl-20260910 status --short --branch
git -C C:\CodexWork\08-Jacky\worktrees\sites\c-plus-highest-reviewer-promotion-20260910 rev-parse HEAD
git -C C:\CodexWork\08-Jacky\worktrees\sites\c-plus-highest-reviewer-promotion-20260910 status --short --branch
```

Expected: exact SHAs above and no worktree changes.

**Step 5: Record ownership**

Record one Core writer, one Sites writer and one read-only reviewer in the execution task commentary. Do not create a duplicate writer for any file.

**Stop condition:** either worktree identity differs, target path/branch pre-exists without a verified owner, or either fresh worktree is dirty.

---

## Task 2: 先用 disposable real PostgreSQL 測試固定 authority 與 transaction 行為

**Files:**

- Create: `supabase/tests/drs_highest_reviewer_promotion_v1_real_pg.test.mjs`
- Read only for pattern: `supabase/tests/drs_reviewer_registration_governance_v1_real_pg.test.mjs`
- Read only for pattern: `supabase/tests/drs_reviewer_registration_authority_v1_real_pg.test.mjs`

Run in the fresh Core implementation worktree.

**Step 1: Build a task-owned real-PG harness**

The new test must:

- accept `DRS_HIGHEST_REVIEWER_PSQL` for an explicitly supplied disposable database;
- otherwise require `DRS_HIGHEST_REVIEWER_ALLOW_DISPOSABLE=1` and use `DRS_HIGHEST_REVIEWER_PG_PORT`;
- create and remove only its exact task-owned container/database;
- send SQL through stdin/in memory and never write helper SQL or logs outside the worktree;
- refuse destructive reset unless a test marker proves the database is disposable;
- create the minimal tracked dependency fixture for `auth.users`, `auth.sessions`, `drs_forward_private.specialists` and `drs_forward_private.auth_specialist_bindings` before applying the existing governance migration and the new migration;
- verify `pgcrypto` exists in schema `extensions`.

**Step 2: Write RED cases for schema and access boundary**

Add assertions for:

- new identity columns and validated two-shape constraint on `reviewer_registration_operation_grants`;
- private `governance_owner_grants`, append-only `governance_owner_grant_events` and `highest_reviewer_role_decisions`;
- force RLS and no direct table DML for `PUBLIC`, `anon`, `authenticated` or `service_role`;
- candidates/decision RPC execute revoked from `PUBLIC`, `anon` and `authenticated` and granted only to `service_role`;
- no public function or table path can create an owner;
- owner events, operation-grant events and decision ledger reject update/delete/truncate.

**Step 3: Write RED cases for owner and reviewer-first authority**

Cover at least:

- valid live owner session can list candidates;
- absent/revoked/expired owner grant, deleted/suspended/unconfirmed owner user, mismatched owner/session and expired session all fail closed;
- eligible reviewer requires a live confirmed Auth user, active specialist and active in-window binding;
- Email-only, Auth-only, pending application, inactive specialist, revoked/expired/future binding and mismatched user/specialist cannot be granted;
- existing highest-reviewer grant immediately loses runtime registration authority when reviewer qualification or Auth state becomes invalid;
- `registration_actor_check_v1` now requires the grant’s stored reviewer identity and live binding version.

**Step 4: Write RED cases for multi-seat and case isolation**

Cover at least:

- two distinct eligible reviewers can simultaneously have active grants;
- granting a second reviewer does not update/revoke the first;
- revoking one does not affect the other;
- repeat grant of an already active seat does not extend its expiration or create a second grant;
- before/after snapshots of case membership/assignment grants are byte-for-byte unchanged;
- every decision response has `caseAccessChanged=false`.

**Step 5: Write RED cases for concurrency, versioning and audit**

Cover:

- first grant requires null grant ID/version; stale binding or stale grant version fails deterministically;
- grant/regrant compares live binding version;
- revoke succeeds using stored grant identity even if the live binding is revoked, expired or replaced;
- same owner + idempotency key + same canonical payload replays one receipt;
- same key + different payload returns `IDEMPOTENCY_CONFLICT`;
- two concurrent first requests with the same key produce one decision;
- concurrent grant/revoke obtains owner/idempotency lock before subject/grant lock and does not deadlock;
- decision and grant events contain actor, subject, reason, before/after version and timestamp;
- canonical digest covers binding ID/version, grant ID/expected version, decision and trimmed reason.

**Step 6: Write RED cases for legacy rows**

Cover all statuses, not only active rows:

- a legacy row with null identity and `legacy_identity_unresolved=false` prevents constraint validation;
- unresolved shape is accepted only when revoked, has `revoked_at`, all three identity columns are null, and an audit event exists;
- unresolved rows can never form runtime authority or be granted/regranted;
- a separately authorized reconciliation can update the same row to a proven reviewer identity, increment version, append audit and clear the flag;
- after reconciliation the ordinary regrant path can proceed without unique-key collision.

**Step 7: Run the new test and confirm RED**

```powershell
$env:DRS_HIGHEST_REVIEWER_ALLOW_DISPOSABLE = '1'
$env:DRS_HIGHEST_REVIEWER_PG_PORT = '55448'
node --test supabase/tests/drs_highest_reviewer_promotion_v1_real_pg.test.mjs
```

Expected: FAIL only because `20260910120000_drs_highest_reviewer_promotion_v1.sql` and its objects do not exist. A harness, Docker, permission or fixture failure is not the intended RED and must be debugged before proceeding.

---

## Task 3: 實作 forward-only migration、owner trust root 與原子 RPC

**Files:**

- Create: `supabase/migrations/20260910120000_drs_highest_reviewer_promotion_v1.sql`
- Test: `supabase/tests/drs_highest_reviewer_promotion_v1_real_pg.test.mjs`

**Step 1: Add a hard schema preflight**

At migration start, use `to_regclass` plus catalog checks to require:

- `drs_forward_private.reviewer_registration_operation_grants`;
- `drs_forward_private.operation_grant_events`;
- `drs_forward_private.specialists`;
- `drs_forward_private.auth_specialist_bindings`;
- exact Auth/session, specialist and binding identity/status/version/time columns used by the RPCs.

Raise one bounded migration error identified as `IDENTITY_AUTHORITY_SCHEMA_DRIFT` if any dependency is absent or incompatible. Do not bridge to `public.drs_specialists` or `integration.drs_auth_specialist_bindings`.

**Step 2: Evolve operation grants without rewriting history**

Use forward-only `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` for:

- `specialist_id uuid`;
- `auth_binding_id uuid`;
- `auth_binding_version bigint`;
- `legacy_identity_unresolved boolean not null default false`.

Add and validate a named check constraint allowing only:

1. resolved: flag false and all three identity fields non-null; or
2. unresolved legacy: flag true, status revoked, `revoked_at` non-null and all three identity fields null.

All new runtime writes must create resolved rows only. If any pre-existing row fits neither shape, raise a bounded legacy-reconciliation error and roll the migration back. Do not guess identity from Email and do not auto-delete or silently revoke rows.

Reserve `20260910115959_drs_highest_reviewer_legacy_reconciliation_v1.sql` only if the production preflight later finds legacy rows. That separately reviewed, row-explicit migration must be created before applying this migration; do not create an empty or generic reconciliation migration now.

**Step 3: Create owner tables and immutable owner audit**

Create:

- `drs_forward_private.governance_owner_grants` with `owner_grant_id`, `owner_user_id`, `status`, `version`, `valid_from`, `valid_until`, `revoked_at`, `provisioned_by` and `authority_basis`;
- unique identity for one current grant row per owner user, while allowing multiple owner users;
- `drs_forward_private.governance_owner_grant_events` with `event_id`, `owner_grant_id`, `grant_version`, `event_type`, `recorded_at`, `database_actor`, `provisioned_by`, `before_value` and `after_value`;
- `drs_forward_private.governance_owner_grant_event_v1()` as the only automatic event trigger for owner-row insert/update;
- append-only trigger reuse or an exact new append-only trigger for the owner event ledger.

Force RLS and revoke direct access from all runtime roles. Do not create a browser/service owner-provision function.

**Step 4: Create the immutable decision ledger**

Create `drs_forward_private.highest_reviewer_role_decisions` with all fields in the confirmed spec, a unique constraint on `(owner_user_id, idempotency_key)` and an append-only trigger rejecting update/delete/truncate.

Calculate `payload_digest` from the exact canonical `jsonb_build_object` key set:

```text
authBindingId
bindingVersion
grantId
expectedGrantVersion
decision
reason
```

Hash `jsonb::text` UTF-8 bytes using `extensions.digest(..., 'sha256')` and store lowercase hex. Do not include owner-supplied Email or UI labels.

**Step 5: Add private verification helpers**

Implement `security definer` functions with `search_path = ''`:

- `drs_forward_private.governance_owner_actor_check_v1(owner_user_id, auth_session_id, jwt_expires_at)`;
- `drs_forward_private.reviewer_identity_check_v1(subject_user_id, specialist_id, auth_binding_id, auth_binding_version, checked_at)`;
- `create or replace drs_forward_private.registration_actor_check_v1(...)` using the grant’s newly stored reviewer identity.

Each live authority check locks and verifies the exact `auth.sessions` and `auth.users` rows, including Email confirmation, deletion, suspension, session user match and both DB/JWT expiry. Use the actual tracked remote-compatible column names proven by Task 2; do not invent an alternate metadata authority.

**Step 6: Implement candidates RPC**

Create service-role-only `drs_highest_reviewer_candidates_v1` with typed owner/session/expiry/cursor arguments.

- Recheck live owner authority inside the transaction.
- Return the union of currently eligible reviewer identities and subjects with any existing highest-reviewer grant.
- Return only the frozen DTO fields.
- Use 25-row keyset pagination.
- Derive `effectiveHighestReviewer` from the current intersection, not from grant status alone.
- Never return secrets, raw Auth rows or internal SQL errors.

**Step 7: Implement atomic grant/revoke RPC**

Create service-role-only `drs_highest_reviewer_role_decision_v1`.

- Acquire transaction-scoped advisory locks in this fixed order:
  1. `hashtextextended('drs-highest-owner-command:' || owner_user_id || ':' || idempotency_key, 0)`;
  2. `hashtextextended('drs-highest-subject:' || subject identity || ':reviewer-registration:global', 0)`.
- Then lock owner Auth/session/grant, subject Auth/specialist/binding, operation grant and prior decision rows.
- Recheck owner and candidate after locks.
- Initial grant creates one resolved operation grant; regrant updates the same row; active repeat never extends expiry.
- Revoke uses stored grant identity and remains possible without a current binding.
- Increment versions deterministically.
- Insert the decision and allow the existing operation-grant event trigger to append before/after state in the same transaction.
- Return the frozen sanitized receipt with `caseAccessChanged=false`.

Set owner/function ownership explicitly, revoke `PUBLIC`/`anon`/`authenticated` execute, and grant only `service_role` execute.

**Step 8: Run GREEN**

```powershell
$env:DRS_HIGHEST_REVIEWER_ALLOW_DISPOSABLE = '1'
$env:DRS_HIGHEST_REVIEWER_PG_PORT = '55448'
node --test supabase/tests/drs_highest_reviewer_promotion_v1_real_pg.test.mjs
```

Expected: PASS with real PostgreSQL evidence for constraints, RLS, locks, transactions, idempotency, multi-seat and case isolation.

**Step 9: Inspect the exact diff**

```powershell
git diff --check
git diff -- supabase/migrations/20260910120000_drs_highest_reviewer_promotion_v1.sql supabase/tests/drs_highest_reviewer_promotion_v1_real_pg.test.mjs
```

**Step 10: Commit**

```powershell
git add -- supabase/migrations/20260910120000_drs_highest_reviewer_promotion_v1.sql supabase/tests/drs_highest_reviewer_promotion_v1_real_pg.test.mjs
git commit -m "feat(drs): add highest reviewer authority model"
```

---

## Task 4: 以既有註冊治理測試證明 reviewer-first 回歸與 public authority 語意

**Files:**

- Modify: `supabase/tests/drs_reviewer_registration_governance_v1_real_pg.test.mjs`
- Modify only if fixture compatibility requires it: `supabase/tests/drs_reviewer_registration_authority_v1_real_pg.test.mjs`
- Test against: `supabase/migrations/20260910120000_drs_highest_reviewer_promotion_v1.sql`

**Step 1: Add RED regression coverage**

Update the governance fixture to create an eligible actor reviewer identity and bind its operation grant through `specialist_id`, `auth_binding_id` and `auth_binding_version`. Add negative cases proving queue and application decision fail after:

- Auth user deletion/suspension/Email-confirmation loss;
- specialist deactivation;
- binding revocation/expiry/version replacement;
- `legacy_identity_unresolved=true`.

Keep the public authority test explicit: it reports only configured/unconfigured availability and never a per-user `canReviewRegistrations` capability.

**Step 2: Run the focused tests and confirm intended RED/GREEN transition**

```powershell
$env:DRS_AUTH_S5_ALLOW_DISPOSABLE = '1'
$env:DRS_AUTH_S5_PG_PORT = '55449'
node --test supabase/tests/drs_reviewer_registration_governance_v1_real_pg.test.mjs

$env:DRS_REGISTRATION_AUTHORITY_ALLOW_DISPOSABLE = '1'
$env:DRS_REGISTRATION_AUTHORITY_PG_PORT = '55450'
node --test supabase/tests/drs_reviewer_registration_authority_v1_real_pg.test.mjs
```

Expected: both PASS against the same evolved candidate. A skip is not a PASS.

**Step 3: Commit**

```powershell
git add -- supabase/tests/drs_reviewer_registration_governance_v1_real_pg.test.mjs supabase/tests/drs_reviewer_registration_authority_v1_real_pg.test.mjs
git commit -m "test(drs): enforce reviewer first governance access"
```

---

## Task 5: 先測試再實作 Core Edge Functions

**Files:**

- Create: `supabase/functions/_shared/highest-reviewer-governance/handler.test.ts`
- Create: `supabase/functions/_shared/highest-reviewer-governance/handler.ts`
- Modify: `supabase/functions/_shared/drs-auth/contracts.ts`
- Create: `supabase/functions/drs-highest-reviewer-candidates/index.ts`
- Create: `supabase/functions/drs-highest-reviewer-role-decision/index.ts`
- Reuse without changing unless a test exposes a real defect: `supabase/functions/_shared/auth-session/verified-auth-session.ts`
- Reuse: `supabase/functions/_shared/http/edge-request-boundary.ts`

**Step 1: Write strict handler RED tests**

Define the public factory as:

```typescript
createHighestReviewerGovernanceHandler(
  operation: "candidates" | "role-decision",
  dependencies
)
```

Test both operations for:

- exact POST method, JSON content type, allowed origin and body-size boundary;
- missing/malformed bearer token and inactive/expired live session;
- browser-supplied owner/actor/role/case/operation/scope fields rejected as `INVALID_REQUEST`;
- candidates cursor exact-key validation;
- decision request exact-key, nullable-key, UUID, version and 1–500-character reason validation;
- verified user/session values supplied to RPC; browser identity values are never forwarded;
- strict validation of every success field and enum from Section 1;
- RPC error mapping to only the finite Section 1 states;
- malformed/unexpected RPC response, timeout and exception become `TEMPORARILY_UNAVAILABLE` without raw detail;
- no Authorization header, token, service-role key, password, Auth row or raw provider payload in response/log;
- replayed receipts retain the same decision/grant identifiers;
- `caseAccessChanged` must be exactly false.

**Step 2: Run the new test and confirm RED**

```powershell
deno test --no-check --reporter=tap supabase/functions/_shared/highest-reviewer-governance/handler.test.ts
```

Expected: FAIL because the handler and entrypoints do not exist. Resolve Deno/runtime setup errors before treating it as intended RED.

**Step 3: Add shared contract types**

In `contracts.ts` add only the highest-reviewer schema constant, request/response types and finite state union. Do not weaken or broaden existing registration, session or LINE contracts.

**Step 4: Implement the handler**

Follow the existing registration-governance handler pattern:

- normalize request through the shared Edge boundary;
- verify live bearer/session through `verifyAuthSession`;
- construct the exact typed RPC input from verified session plus validated DTO;
- use the server-side Supabase client only to call the one matching RPC;
- reject upstream extra/missing keys and invalid enums;
- return no-store JSON with the finite HTTP map;
- clear sensitive locals and never log credentials or raw upstream data.

The handler must not decide who is an owner or reviewer. That decision remains in the RPC.

**Step 5: Add two thin entrypoints**

Each `index.ts` selects exactly one operation and delegates to the shared handler. It must not duplicate validators or add alternate authority paths.

**Step 6: Run focused GREEN and regressions**

```powershell
deno test --no-check --reporter=tap `
  supabase/functions/_shared/highest-reviewer-governance/handler.test.ts `
  supabase/functions/_shared/reviewer-registration-governance/handler.test.ts `
  supabase/functions/_shared/drs-auth/drs-reviewer-registration-authority.test.ts `
  supabase/functions/_shared/auth-session/verified-auth-session.test.ts
```

Expected: all PASS.

**Step 7: Inspect and commit**

```powershell
git diff --check
git diff -- supabase/functions/_shared/highest-reviewer-governance supabase/functions/_shared/drs-auth/contracts.ts supabase/functions/drs-highest-reviewer-candidates supabase/functions/drs-highest-reviewer-role-decision
git add -- supabase/functions/_shared/highest-reviewer-governance supabase/functions/_shared/drs-auth/contracts.ts supabase/functions/drs-highest-reviewer-candidates supabase/functions/drs-highest-reviewer-role-decision
git commit -m "feat(drs): expose highest reviewer governance endpoints"
```

---

## Task 6: 封閉 Core function config、composition 與 build 證據

**Files:**

- Modify: `supabase/config.toml`
- Modify: `tests/drs-bff-route-composition-source.test.mjs`
- Verify: `scripts/build-drs-production.mjs` output through existing scripts

**Step 1: Write source-composition RED**

Extend the exact function manifest test from 30 to 32 entries and require:

```toml
[functions.drs-highest-reviewer-candidates]
verify_jwt = true

[functions.drs-highest-reviewer-role-decision]
verify_jwt = true
```

Also assert both `index.ts` files exist and import the shared highest-reviewer handler. Do not change the special webhook exception or any existing function’s `verify_jwt` value.

**Step 2: Confirm RED**

```powershell
node --test tests/drs-bff-route-composition-source.test.mjs
```

Expected: FAIL for the two missing config entries only.

**Step 3: Add the config entries**

Modify only `supabase/config.toml` with the two exact `verify_jwt = true` blocks.

**Step 4: Run focused and full Core source verification**

```powershell
node --test tests/drs-bff-route-composition-source.test.mjs
deno test --no-check --reporter=tap `
  supabase/functions/_shared/highest-reviewer-governance/handler.test.ts `
  supabase/functions/_shared/reviewer-registration-governance/handler.test.ts `
  supabase/functions/_shared/drs-auth/drs-reviewer-registration-authority.test.ts `
  supabase/functions/_shared/auth-session/verified-auth-session.test.ts
$env:DRS_HIGHEST_REVIEWER_ALLOW_DISPOSABLE = '1'
$env:DRS_HIGHEST_REVIEWER_PG_PORT = '55448'
node --test supabase/tests/drs_highest_reviewer_promotion_v1_real_pg.test.mjs
npm run build:drs
npm run test:drs-build
```

Expected: all PASS; real-PG test must not skip.

**Step 5: Commit**

```powershell
git add -- supabase/config.toml tests/drs-bff-route-composition-source.test.mjs
git commit -m "chore(drs): register highest reviewer functions"
```

**Step 6: Record the Core candidate**

```powershell
git status --short --branch
git rev-parse HEAD
git rev-parse 'HEAD^{tree}'
git diff --check 61b7dd49a9819721c347486dc994c53f1c45faca..HEAD
git diff --name-status 61b7dd49a9819721c347486dc994c53f1c45faca..HEAD
```

Expected: clean worktree; only Task 2–6 paths changed.

---

## Task 7: 先用 Sites contract tests 固定 owner-only BFF routes

**Files:**

- Create: `app/api/_lib/drs-highest-reviewer-governance-proxy.js`
- Create: `internal-site/app/functions/v1/drs-highest-reviewer-candidates/route.ts`
- Create: `internal-site/app/functions/v1/drs-highest-reviewer-role-decision/route.ts`
- Create: `tests/drs-highest-reviewer-management.test.mjs`
- Modify: `scripts/build-internal-site.mjs`
- Modify: `tests/internal-site-build-output.test.mjs`

Run only in the fresh Sites implementation worktree. Do not read or modify the protected dirty original worktree.

**Step 1: Write BFF RED tests**

In the new focused test, require:

- candidates and role-decision routes expose POST only;
- the proxy factory supports exactly `candidates | role-decision`;
- exact request and response DTOs from Section 1;
- caller Authorization is a normal bearer token and is the only forwarded caller credential;
- cookies, owner/actor/role/case/operation/scope selectors and extra body keys are rejected;
- fixed upstream paths are `/functions/v1/drs-highest-reviewer-candidates` and `/functions/v1/drs-highest-reviewer-role-decision`;
- fixed `LAIBE_DRS_APP_ORIGIN`, publishable-key routing and no service-role secret;
- request limit 4 KiB, candidates response limit 64 KiB, decision response limit 16 KiB and upstream timeout no more than 8 seconds;
- finite errors only, no raw upstream body/stack/secret;
- `caseAccessChanged=false` is required.

In the build-output test, require both route modules in the generated server route manifest.

**Step 2: Confirm RED**

```powershell
node --test tests/drs-highest-reviewer-management.test.mjs tests/internal-site-build-output.test.mjs
```

Expected: FAIL for missing proxy/routes/manifest entries.

**Step 3: Implement the focused proxy**

Create a new proxy instead of extending `drs-reviewer-registration-governance-proxy.js`. Reuse its boundary conventions, but keep the new schema and finite state set isolated so a future change cannot silently broaden the existing general-reviewer approval contract.

Export:

```javascript
createDrsHighestReviewerGovernanceProxy(
  operation,
  options
)
```

Do not infer authority in Sites. Validate shape, forward the bearer, and accept only a Core response matching Section 1.

**Step 4: Add thin Vinext route wrappers**

Both routes normalize the native request through the existing internal request adapter and delegate to the focused proxy. No route may expose GET, accept query selectors, read role metadata or persist tokens.

**Step 5: Register server routes in the internal build**

Update `scripts/build-internal-site.mjs` and its build validation with the two exact paths. No new public asset is created in this task, so do not change `internal-site/app/_lib/internal-public-paths.js`.

**Step 6: Run GREEN**

```powershell
node --test tests/drs-highest-reviewer-management.test.mjs tests/internal-site-build-output.test.mjs
```

Expected: PASS.

**Step 7: Inspect and commit**

```powershell
git diff --check
git diff -- app/api/_lib/drs-highest-reviewer-governance-proxy.js internal-site/app/functions/v1/drs-highest-reviewer-candidates/route.ts internal-site/app/functions/v1/drs-highest-reviewer-role-decision/route.ts scripts/build-internal-site.mjs tests/drs-highest-reviewer-management.test.mjs tests/internal-site-build-output.test.mjs
git add -- app/api/_lib/drs-highest-reviewer-governance-proxy.js internal-site/app/functions/v1/drs-highest-reviewer-candidates/route.ts internal-site/app/functions/v1/drs-highest-reviewer-role-decision/route.ts scripts/build-internal-site.mjs tests/drs-highest-reviewer-management.test.mjs tests/internal-site-build-output.test.mjs
git commit -m "feat(sites): proxy highest reviewer governance"
```

---

## Task 8: 在既有治理頁新增最小最高審查官設定區

**Files:**

- Modify: `public/pcm/governance/index.html`
- Modify: `public/assets/drs-governance/app.js`
- Modify: `public/assets/drs-governance/styles.css`
- Modify: `public/index.html`
- Modify: `public/pcm/index.html`
- Modify: `tests/drs-highest-reviewer-management.test.mjs`
- Modify: `tests/drs-reviewer-registration-governance.test.mjs`
- Modify: `package.json`

**Step 1: Add UI/controller RED tests**

Require these exact selectors:

```text
[data-highest-reviewer-management]
[data-highest-reviewer-state]
[data-highest-reviewer-list]
[data-highest-reviewer-item-template]
[data-highest-reviewer-reason]
[data-highest-reviewer-action]
[data-highest-reviewer-load-more]
[data-highest-reviewer-retry]
[data-highest-reviewer-trace]
```

Cover:

- logged-out state loads neither protected queue nor candidates;
- highest reviewer who is not owner can use registration queue but cannot see owner controls;
- owner who is not highest reviewer can use management controls but cannot see registration queue;
- account with both capabilities sees both independent sections;
- account with neither capability sees a clear no-governance-permission state;
- public registration-authority status never sets either capability;
- candidate list, pagination, empty state and historical unresolved row;
- grant/revoke requires a 1–500-character reason and sends only the Section 1 request;
- pending action prevents double-submit;
- conflict preserves reason and gives refresh/retry;
- success updates row/trace with actor-facing time/result/next step and preserves multi-seat rows;
- logout invalidates request epoch, clears in-memory bearer, hides both protected sections and returns to login;
- stale responses after logout cannot redraw protected content;
- no Email/user-ID/role input, no independent highest-reviewer registration CTA, and no case-access claim.

**Step 2: Confirm RED**

```powershell
node --test tests/drs-highest-reviewer-management.test.mjs tests/drs-reviewer-registration-governance.test.mjs
```

Expected: FAIL for missing management DOM/controller behavior only.

**Step 3: Add minimal semantic markup**

Inside the existing governance workspace, add one `最高審查官設定` section. Keep the existing Email/password login and one logout control. Each state must explain:

- what the current state is;
- what the signed-in person can do;
- who must act next;
- that grant/revoke changes registration governance only, does not change case access, and leaves a record.

Do not add a new registration page, arbitrary Email field, role dropdown, date picker or case selector.

**Step 4: Implement two independent capabilities**

Refactor the existing controller minimally so post-login it starts:

1. protected registration queue request;
2. protected highest-reviewer candidates request.

Use independent pending/success/forbidden/error states. One 403 must not erase the other successful capability. Only both forbidden means no governance permission. Keep the public availability adapter limited to configured/unconfigured copy.

Candidate actions:

- `eligible + never_granted/expired/revoked` → grant;
- active grant → revoke;
- unresolved legacy → reconciliation message, no mutation CTA;
- inactive qualification with no active grant → no CTA;
- inactive qualification with active residual grant → revoke remains available.

Use server-returned identity/version values verbatim in the action request, then re-fetch the current page after success.

**Step 5: Preserve one logout mechanism**

The existing `[data-governance-logout]` must:

- abort/obsolete both queue and candidates requests;
- sign out of the existing Supabase Email/password session;
- clear only in-memory UI state;
- hide every protected list/control;
- render a user-facing retry if sign-out fails without showing raw errors.

This satisfies logout for both a general highest reviewer and a system owner, including an account holding both roles.

**Step 6: Use product-language states**

Map finite server states to the confirmed Traditional Chinese wording. Do not render enum names or engineering terms. Include:

- 尚未登入；
- 正在確認管理權限；
- 目前沒有可指定的審查員；
- 可以指定／正在指定／已指定；
- 正在撤銷／已撤銷；
- 審查員資格已變更；
- 這筆歷史權限需要管理員完成身分核對；
- 這個帳號沒有最高審查官設定權限；
- 目前無法完成，請稍後再試。

**Step 7: Correct adjacent navigation copy**

In `public/index.html`, `public/pcm/index.html` and the governance page metadata, remove any claim that registration governance sets or exposes 「案件範圍」. Replace it with accurate copy about 審查員資格、治理權限、決策理由與留痕. Do not change unrelated navigation.

**Step 8: Style within the existing design system**

Extend existing governance CSS only:

- keep the current restrained dark/professional hierarchy;
- use one management section, not nested card piles;
- make primary grant/revoke and secondary refresh/logout visually distinct;
- retain readable focus, disabled, error and empty states;
- verify breakpoints at 840 px and 520 px;
- respect `prefers-reduced-motion`.

**Step 9: Add the focused test to the explicit internal suite**

Modify `test:internal-site` so it explicitly includes `tests/drs-highest-reviewer-management.test.mjs`. Preserve every existing listed test and do not replace the script with a wildcard.

**Step 10: Run GREEN**

```powershell
node --test tests/drs-highest-reviewer-management.test.mjs tests/drs-reviewer-registration-authority.test.mjs tests/drs-reviewer-registration-governance.test.mjs
```

Expected: all PASS.

**Step 11: Inspect and commit**

```powershell
git diff --check
git diff -- public/pcm/governance/index.html public/assets/drs-governance/app.js public/assets/drs-governance/styles.css public/index.html public/pcm/index.html tests/drs-highest-reviewer-management.test.mjs tests/drs-reviewer-registration-governance.test.mjs package.json
git add -- public/pcm/governance/index.html public/assets/drs-governance/app.js public/assets/drs-governance/styles.css public/index.html public/pcm/index.html tests/drs-highest-reviewer-management.test.mjs tests/drs-reviewer-registration-governance.test.mjs package.json
git commit -m "feat(sites): manage highest reviewer roles"
```

---

## Task 9: 建置並驗證乾淨 Sites candidate

**Files:**

- Verify only the exact Sites files changed in Tasks 7–8.
- Generated build artifacts may exist only inside the fresh Sites worktree.

**Step 1: Run exact lint and typecheck**

```powershell
npx --no-install oxlint `
  public/assets/drs-governance/app.js `
  app/api/_lib/drs-highest-reviewer-governance-proxy.js `
  internal-site/app/functions/v1/drs-highest-reviewer-candidates/route.ts `
  internal-site/app/functions/v1/drs-highest-reviewer-role-decision/route.ts `
  tests/drs-highest-reviewer-management.test.mjs
npx --no-install tsc --noEmit --incremental false
```

Expected: PASS. Do not run repository-wide format.

**Step 2: Run focused source tests**

```powershell
node --test `
  tests/drs-reviewer-registration-authority.test.mjs `
  tests/drs-reviewer-registration-governance.test.mjs `
  tests/drs-highest-reviewer-management.test.mjs `
  tests/internal-site-build-output.test.mjs
```

Expected: PASS.

**Step 3: Run the explicit internal build suite**

```powershell
npm run test:internal-site
```

Expected: build and every explicitly listed test PASS. This may write only `.wrangler/qa/internal-site-stage` and `dist` inside the fresh worktree.

**Step 4: Verify staged artifact closure**

Confirm:

- both new function routes are present in the server route manifest;
- governance HTML loads the existing CSS/JS assets;
- no new asset path is missing from staged public files;
- trailing slash normalization remains `/pcm/governance/ → /pcm/governance`;
- root redirect remains unchanged;
- built product bytes contain no raw server state, stack trace, DB/API/mock/source terminology, secret, arbitrary Email grant field or case-access promise.

**Step 5: Record the Sites candidate**

```powershell
git status --short --branch
git rev-parse HEAD
git rev-parse 'HEAD^{tree}'
git diff --check 876af6cac21709b8ec201f594734599fcad607c0..HEAD
git diff --name-status 876af6cac21709b8ec201f594734599fcad607c0..HEAD
```

Expected: only Task 7–8 source/test changes plus ignored/generated build output; no protected original-worktree file appears.

**Step 6: Perform bounded temporary visual QA**

Start the built internal Site from the fresh worktree on one recorded local port and classify it as `TEMPORARY_PREVIEW`. With browser request interception for the two new endpoints, exercise desktop 1401×912 and mobile 447×912 states:

```text
logged out
→ owner-only
→ highest-reviewer-only
→ both capabilities
→ empty candidates
→ two active highest reviewers
→ conflict preserving reason
→ logout clears protected content
```

Check focus order, overflow, disabled states, status copy and console errors. Stop the exact temporary server after the check. This proves presentation/controller behavior only; it is not real Auth, database, deployment or canonical runtime evidence.

---

## Task 10: 簡化、自主檢查並取得獨立 source review

**Files:**

- Read all changed Core files from Tasks 2–6.
- Read all changed Sites files from Tasks 7–8.
- Do not edit from the reviewer context.

**Step 1: Run `simplify` in each writer context**

Review only the new/changed code for duplicated validation, unnecessary abstractions, stale comments and avoidable complexity. Preserve the frozen DTOs and security checks. Any simplification is made by the owning writer, followed by the affected focused test and one final scoped suite.

**Step 2: Bind immutable candidates**

Record:

```text
CORE_BASE=61b7dd49a9819721c347486dc994c53f1c45faca
CORE_HEAD=<exact SHA>
CORE_TREE=<exact tree SHA>
CORE_CHANGED_PATHS=<exact name-status list>

SITES_BASE=876af6cac21709b8ec201f594734599fcad607c0
SITES_HEAD=<exact SHA>
SITES_TREE=<exact tree SHA>
SITES_CHANGED_PATHS=<exact name-status list>
```

Every review and test receipt must bind to these exact heads/trees. Any subsequent source change invalidates affected evidence.

**Step 3: Request one read-only independent review**

Use `requesting-code-review`. The reviewer must answer this matrix:

- highest reviewer is provably an active ordinary reviewer on every use;
- owner authority is live-session + private DB grant only;
- multiple seats coexist;
- no public owner bootstrap or arbitrary Email/user-ID grant;
- grant/revoke is atomic, idempotent, version checked and append-only audited;
- revoke still works after reviewer qualification changes;
- no case authority changes;
- Core Edge and Sites BFF validate the identical strict DTO;
- two UI capabilities are independent;
- public registration-authority availability is not treated as per-user authority;
- logout removes protected data for owner, highest reviewer and dual-role accounts;
- no engineering language, secret leakage, payment custody or old-house investment content;
- changed paths are within the frozen scope and protected dirty state was untouched.

Verdict is exactly `ACCEPT` or `REWORK` with file/line findings. A reviewer may not modify source.

**Step 4: Resolve findings through the owning writer**

For each `REWORK` finding:

1. reproduce with one focused RED;
2. make the smallest fix in the owning worktree;
3. rerun focused GREEN;
4. rerun that repository’s final scoped suite once;
5. record new HEAD/tree and request review of the new immutable candidate.

Do not let Core and Sites writers edit each other’s repositories.

**Step 5: Source-phase verdict**

Only after both repositories are clean, all scoped tests pass and the reviewer returns `ACCEPT` may the status be:

```text
SOURCE_INTEGRATION_READY
RUNTIME_ACCEPTANCE_PENDING
```

Do not use `WEB_INTEGRATION_ACCEPTED`, `production ready` or equivalent language at this phase.

---

## Task 11: Production admission、remote schema preflight 與受控 rollout

**Authority gate:** Stop before this task unless the Owner/Integration Authority explicitly authorizes source publication/admission, remote database migration, Edge deployment, initial owner provision and Sites deployment for the exact Core/Sites candidates. Technical convenience or prior local authorization does not expand this production authority.

**Required skills:** `drs-github-publication-pr-readiness`, `supabase:supabase`, `drs-supabase-real-runtime` and, for the Site, `sites:sites-hosting`.

**Step 1: Admit exact source candidates**

Use the approved publication/PR path to bind remote refs to the exact accepted Core and Sites SHAs. Verify remote SHA, merge base, changed-path scope and admission decision separately for each repository. A push or PR alone is not deployment or runtime acceptance.

**Step 2: Run read-only remote identity preflight**

Without exposing secret values, verify:

- target Supabase project identity and migration history;
- `drs_forward_private.specialists` and `auth_specialist_bindings` exist with the exact columns/constraints used by the accepted migration;
- they are the actual identity source used by current Email/password registration and login;
- `reviewer_registration_operation_grants` current row count and every row’s status, version and authority basis;
- existing owner/highest-reviewer objects do not conflict;
- required Auth/session columns and `extensions.pgcrypto` exist.

If any identity source differs, stop:

```text
IDENTITY_AUTHORITY_SCHEMA_DRIFT
```

Do not substitute the legacy `public`/`integration` identity model.

**Step 3: Gate legacy reconciliation**

If `reviewer_registration_operation_grants` contains zero rows, proceed with the accepted main migration.

If it contains any active, revoked or expired row:

- do not apply the main migration;
- inventory every exact `grant_id` read-only;
- create a separate, independently reviewed `20260910115959_drs_highest_reviewer_legacy_reconciliation_v1.sql`;
- enumerate each row explicitly as either a proven reviewer identity binding or an audited revoke with `legacy_identity_unresolved=true`;
- never infer by Email alone;
- prove all rows satisfy the two-shape constraint before retrying the main migration.

This reconciliation is a new candidate and requires its own authority/review. Do not continue rollout in the same unreviewed step.

**Step 4: Apply and verify the database migration**

Using the approved Supabase deployment mechanism:

1. apply only the admitted migration sequence;
2. verify migration identity remotely;
3. query catalog/RPC permissions read-only;
4. execute the real-runtime matrix with authorized fixture identities;
5. prove direct DML denial, owner/session fail-closed behavior, reviewer-first authority, multi-seat, idempotency, concurrent lock behavior, append-only audit and case-scope invariance.

Static SQL, local disposable PostgreSQL and a migration receipt do not replace this remote verification.

**Step 5: Provision the initial owner**

Obtain one exact existing Supabase Auth `user.id` through the approved admin channel. Do not use an Email in the owner grant and do not put the UUID in source.

In one explicitly authorized database transaction:

- verify the Auth user exists, is Email-confirmed and not deleted/suspended;
- insert one active `governance_owner_grants` row with bounded authority basis;
- let the owner-grant trigger append the immutable event;
- read back only sanitized identifiers/status/version/time;
- verify no case membership or assignment changed.

If the same account will also become a highest reviewer, it must independently pass ordinary reviewer qualification and then use the owner UI/API grant flow. Do not insert a highest-reviewer operation grant directly.

**Step 6: Deploy Core functions**

Deploy exactly:

```text
drs-highest-reviewer-candidates
drs-highest-reviewer-role-decision
```

Verify deployed function identity/config, `verify_jwt=true`, allowed origin and bounded response behavior. Execute owner, non-owner, invalid-session and malformed-request probes without logging credentials.

**Step 7: Save and deploy the admitted Internal Site**

Use the existing `.openai/hosting.json` project and `sites:sites-hosting`. Do not create a replacement Site or project ID. Save one version from the admitted clean Sites candidate, verify version identity and deploy only that exact version after the Core endpoints are healthy.

**Step 8: Fail-closed rollback posture**

If Core verification fails, do not deploy Sites. If Sites verification fails after deploy, stop new role commands and restore only through the approved Sites version mechanism; do not delete audit data or rewrite migrations. Revocation of a mistakenly provisioned owner must be a new versioned, audited owner-grant update by authorized DB operations, never a row delete.

---

## Task 12: Canonical desktop/mobile real-account acceptance

**Canonical preview URL:**

```text
https://laibe-drs-original-a4-20260901.blueleft120.chatgpt.site/pcm/governance
```

If the approved production target is not this exact Site/project, stop and obtain an explicit canonical URL decision before browser acceptance. Do not silently substitute localhost or a temporary Site.

**Step 1: Prove canonical runtime identity**

Record:

```text
CANONICAL_PREVIEW_URL
CANONICAL_PREVIEW_PID_OR_DEPLOYMENT_ID
CANONICAL_PREVIEW_ROOT_OR_SITE_PROJECT
INTEGRATION_WORKTREE
INTEGRATION_HEAD_OR_SOURCE_IDENTITY
SERVER_ROOT_MATCHES_INTEGRATION_WORKTREE
```

For the changed governance HTML, governance JS, governance CSS and server route bundle, compare accepted worktree SHA-256 with deployed/served bytes or an immutable build-manifest mapping. Every critical file must match.

Inventory other local/remote previews used during this cycle and classify each as canonical or temporary. Different candidates on multiple Human-facing previews means `SPLIT_BRAIN_PREVIEW_DETECTED=TRUE` and blocks acceptance.

**Step 2: Prepare authorized real test identities**

Use existing authorized test accounts; do not generate or reveal passwords in source or reports. Minimum matrix:

- one active system owner;
- two distinct eligible ordinary reviewers;
- one active highest reviewer who is not owner, if available;
- one signed-in ordinary reviewer who is neither owner nor highest reviewer.

If the matrix cannot be supplied, mark the uncovered journey `BLOCKED`; do not replace it with mocked identities.

**Step 3: Desktop journey**

At 1401×912:

1. Open canonical `/pcm` and navigate in-page to 註冊治理; a deep link alone is insufficient.
2. Sign in as owner using the existing Email/password path.
3. Confirm management capability loads while registration queue visibility independently reflects whether this account is also a highest reviewer.
4. Grant reviewer A with a reason; observe actor-facing result/time/next step.
5. Grant reviewer B; verify both remain active.
6. Capture case-authority snapshot before/after and prove unchanged.
7. Log out; verify all protected content disappears and back/refresh cannot restore it.
8. Sign in as reviewer A; prove registration queue/decision capability works and no owner controls appear unless A separately has owner grant.
9. Log out.
10. Sign in as owner, revoke reviewer A with a reason; prove reviewer B remains active.
11. Verify reviewer A’s subsequent queue/decision request fails closed while reviewer B still succeeds.
12. Verify both owner and highest-reviewer account types can log out.

Check visible product states, focus, network responses, no sensitive payloads and no console errors.

**Step 4: Mobile journey**

Repeat the meaningful open → navigate → sign in → list → grant/revoke → resulting state → logout path at 447×912. Verify:

- no horizontal overflow;
- controls remain reachable and labels are not clipped;
- reason validation and confirmation are understandable;
- management and registration sections remain distinguishable;
- protected data disappears after logout.

**Step 5: Negative runtime probes**

Using normal browser/server requests, prove:

- public registration-authority availability cannot reveal candidates or grant;
- a non-owner direct POST gets `GOVERNANCE_OWNER_NOT_AUTHORIZED`;
- extra owner/role/case selectors get `INVALID_REQUEST`;
- stale binding/grant versions get the correct 409;
- same idempotency payload replays and changed payload conflicts;
- Auth suspension/reviewer deactivation immediately removes effective highest-reviewer authority despite a nonexpired token;
- grant/revoke leaves case authority unchanged.

**Step 6: Final browser verdict**

Only declare `WEB_INTEGRATION_ACCEPTED` when canonical served identity, desktop journey, mobile journey, in-page navigation, real Auth/DB/owner authority and browser pending state all pass. Otherwise use exactly one truthful status:

```text
SOURCE_INTEGRATION_READY
RUNTIME_ACCEPTANCE_PENDING
CANONICAL_RUNTIME_ACCEPTANCE_BLOCKED
SPLIT_BRAIN_PREVIEW_DETECTED
```

---

## Task 13: Final self-verification and completion report

**Step 1: Re-run only final candidate suites**

After the last relevant source byte change, run each repository’s final scoped suite once. Do not repeat unchanged full suites.

Core:

```powershell
node --test tests/drs-bff-route-composition-source.test.mjs
deno test --no-check --reporter=tap `
  supabase/functions/_shared/highest-reviewer-governance/handler.test.ts `
  supabase/functions/_shared/reviewer-registration-governance/handler.test.ts `
  supabase/functions/_shared/drs-auth/drs-reviewer-registration-authority.test.ts `
  supabase/functions/_shared/auth-session/verified-auth-session.test.ts
$env:DRS_HIGHEST_REVIEWER_ALLOW_DISPOSABLE = '1'
$env:DRS_HIGHEST_REVIEWER_PG_PORT = '55448'
node --test supabase/tests/drs_highest_reviewer_promotion_v1_real_pg.test.mjs
npm run build:drs
npm run test:drs-build
```

Sites:

```powershell
npx --no-install oxlint `
  public/assets/drs-governance/app.js `
  app/api/_lib/drs-highest-reviewer-governance-proxy.js `
  internal-site/app/functions/v1/drs-highest-reviewer-candidates/route.ts `
  internal-site/app/functions/v1/drs-highest-reviewer-role-decision/route.ts `
  tests/drs-highest-reviewer-management.test.mjs
npx --no-install tsc --noEmit --incremental false
npm run test:internal-site
```

**Step 2: Self-check scope and evidence**

Verify:

- both worktrees/branches/HEADs/trees and changed paths;
- no protected dirty state was touched;
- every PASS receipt belongs to the final bytes;
- no source result was promoted into remote/runtime/browser proof;
- owner identity and all secrets remain absent from source/report;
- no case authority changed;
- no raw engineering language is visible to external users;
- no payment custody, payment guarantee, old-house alchemy or renovation-investment content was added.

**Step 3: Report the mandatory web runtime fields**

```text
CANONICAL_PREVIEW_URL:
CANONICAL_PREVIEW_PID:
CANONICAL_PREVIEW_ROOT:
INTEGRATION_WORKTREE:
INTEGRATION_CANDIDATE:
SERVER_ROOT_MATCHES_INTEGRATION_WORKTREE:
CRITICAL_SERVED_IDENTITY:
- file:
  worktree_sha256:
  served_sha256:
  match:
SPLIT_BRAIN_PREVIEW_DETECTED:
DESKTOP_CANONICAL_JOURNEY:
MOBILE_CANONICAL_JOURNEY:
BROWSER_ACCEPTANCE_PENDING:
CANONICAL_SERVED_RUNTIME_GATE:
FINAL_INTEGRATION_VERDICT:
```

Use `BLOCKED`/`PENDING` rather than inventing missing values.

**Step 4: Report the product completion fields**

The final report must state:

1. modified files;
2. what changed in each file;
3. functions added/fixed;
4. remaining mock, unconnected or unverified behavior;
5. whether external engineering language was removed;
6. whether payment custody and old-house alchemy were excluded;
7. whether the result still fits 「裝修決策工具 + 案件紀錄留痕系統」;
8. build/lint/typecheck/test results with exact commands and candidate identity;
9. next-round issues.

Also include immutable decision/audit evidence, owner/reviewer authority evidence, multi-seat evidence, logout evidence and proof that case access did not change.

---

## Acceptance summary

### Source PASS

- Core real-PG, Edge and build suites pass on one clean Core candidate.
- Sites contract, UI, lint/typecheck and internal build suites pass on one clean Sites candidate.
- Independent reviewer returns `ACCEPT`.
- No protected dirty file, secret, provider setting or production state was touched.

### Runtime PASS

- Exact remote schema/functions/Site versions match admitted candidates.
- Initial owner was provisioned by authorized DB operations and audited.
- Real owner plus two eligible reviewers proves multi-seat grant/revoke.
- Existing queue authority immediately follows reviewer-first status.
- Case visibility is unchanged.
- Canonical desktop and mobile journeys, including logout, pass.

### FAIL / stop conditions

Stop immediately on:

- identity-source drift or missing private specialist/binding schema;
- any unreconciled legacy operation-grant row;
- missing production authority or exact owner Auth user ID;
- migration/function/Site identity mismatch;
- secret exposure;
- inability to prove case isolation;
- stale-version/idempotency/concurrency ambiguity;
- protected dirty-state overlap;
- canonical served-byte mismatch, split-brain preview or browser acceptance pending.

The safe terminal status before Tasks 11–12 is `SOURCE_INTEGRATION_READY / RUNTIME_ACCEPTANCE_PENDING`. Only the complete runtime matrix permits `WEB_INTEGRATION_ACCEPTED`.
