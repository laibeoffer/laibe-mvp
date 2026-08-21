# DRS T3 Calendar Source Convergence Map

## Decision

`CALENDAR_SOURCE_TEST_CLOSURE_LOCAL_CANDIDATE`

This package adds an exact, testable Google Calendar source closure to the
frozen DRS W2 local integration tree. It is source and test evidence only.

- `SOURCE_ADMISSION=HOLD`
- `SHARED_AUTH_COMMIT=HOLD_NOT_APPROVED`
- `LIVE_POSTGRES_PROOF=FALSE`
- `REAL_OAUTH_PROOF=FALSE`
- `REMOTE_ACTIONS=NONE`

It does not authorize migration apply, Supabase or Google configuration,
secrets, Edge deployment, push, PR, merge, canonical route integration, or
production use.

## Integration Identity

- Worktree:
  `C:\CodexWork\08-Jacky\worktrees\laibe_MVP_project\drs-t3-calendar-convergence-20260821`
- Branch: `codex/drs-t3-calendar-convergence-20260821`
- Frozen W2 base commit: `4236b40f086b1f709c5fa6ee8d98faf9bd998f92`
- Frozen W2 base tree: `a07f654348663c596d3e97e1740add6828c1e6bc`
- Calendar prerequisite source commit:
  `0163b4f006ad7157f4543d7952e22a4a4a99573b`
- Frozen T3 DRS Calendar commit: `0d715b713a15fdca235ec283de6cb1952a5952b4`
- Frozen T3 DRS Calendar tree: `8376ebec151e86bcdc2b3042c59b3f733adbd9d4`
- Independent T3 verdict: `APPROVE_T3_DRS_CONTRACT_LOCAL_CANDIDATE`
- Commander T3 freeze: `FROZEN_LOCAL_SOURCE_CONTRACT`

The base and T3 commits are not ancestors of one another. This candidate imports
exact committed blobs under a closed path allowlist; it does not cherry-pick the
W4 integration branch.

## Exact Source Inventory

Frozen T3 blobs from `0d715b713a15fdca235ec283de6cb1952a5952b4`:

| Path                                                                          | Git blob                                   |
| ----------------------------------------------------------------------------- | ------------------------------------------ |
| `docs/integrations/google-calendar-drs-account-contract.md`                   | `3ad75cc3b274c48f4a9b17d9554dbf0f1ce36036` |
| `supabase/functions/_shared/google-calendar/contracts.ts`                     | `88adb24e73268185ebbc8152f92656a51ffd83be` |
| `supabase/functions/_shared/google-calendar/google-oauth-adapter.ts`          | `81d262cee02538a9fce60b773c4c24f92e5ef781` |
| `supabase/migrations/20260821170000_google_calendar_drs_account_contract.sql` | `ed6c597361c8268e3317c97f564b0bb85d4901d6` |
| `supabase/tests/case_member_google_calendar_contract.test.mjs`                | `109020c2d8a164c2ceaae817eb023bbbec1502e6` |
| `supabase/tests/google_calendar_drs_account_contract.test.mjs`                | `445a248deb8997af4aae5bff25f6fbe63437d42c` |

Prerequisite Calendar blobs from `0163b4f006ad7157f4543d7952e22a4a4a99573b`:

| Path                                                                         | Git blob                                   |
| ---------------------------------------------------------------------------- | ------------------------------------------ |
| `supabase/functions/_shared/google-calendar/case-calendar-authorization.ts`  | `ea8c3edab6f3e36e66b034eb781cddb2d034139c` |
| `supabase/migrations/20260818165231_case_member_google_calendar_binding.sql` | `ea129a2dc5156f2572f4e2640e07af3e558d2ecd` |
| `supabase/functions/owner-google-calendar-grant/index.ts`                    | `bb47571abf735fd96c65ad1887cd0f42a4aa6615` |
| `supabase/functions/owner-google-calendar-oauth-callback/index.ts`           | `5bcf944cd1ef13d13b68089d3a27b2bd42bbdf73` |
| `supabase/functions/owner-google-calendar-oauth-start/index.ts`              | `06312e9c1aef1b899303bd04cf5027b5db4beb8c` |
| `supabase/functions/vendor-google-calendar-grant/index.ts`                   | `50ad5d0d9cbccf8d84de5e4cf27f4e51148d0ebb` |
| `supabase/functions/vendor-google-calendar-oauth-callback/index.ts`          | `5e5de771096790a69665ea5fb3f527d4bd8664e9` |
| `supabase/functions/vendor-google-calendar-oauth-start/index.ts`             | `7631886519be4cdc3cf22468725be83801880db2` |

The six owner/vendor wrappers are included only to preserve the frozen owner/pro
regression test surface. No owner/vendor UI, route, preview, Account Access, or
dirty Shared Auth byte is included.

## Migration Order

The local source filenames sort in this order:

1. `20260818165231_case_member_google_calendar_binding.sql`
2. `20260820000000_drs_linebot_group_ai_human_w1.sql`
3. `20260820090000_drs_core_case_audit_contract.sql`
4. `20260821170000_google_calendar_drs_account_contract.sql`

This ordering is not migration-apply authority. The first Calendar migration
fails closed unless an independently approved authority source has already
created `auth.users`, `casework.cases`, `casework.case_members`, and
`casework.case_members.membership_status`.

The DRS Calendar migration also leaves
`integration.google_calendar_drs_authorize_transaction_v1` as a private
fail-closed stub. A separately reviewed successor migration must provide
serialized checks for the auth-user-to-specialist binding, ACTIVE specialist
authority, active selected-case assignment, and termination or revocation state
before DRS callback persistence can succeed.

## Contract Evidence

- Calendar owner/pro and DRS source-contract tests: `37/37 PASS`.
- Frozen W2 runtime and source-convergence tests after import: `20/20 PASS`.
- Shared Calendar TypeScript syntax checks: PASS.
- All 14 imported paths match the recorded Git blobs byte for byte.
- No package or lockfile changed.
- No A0/canonical, `pcm_standalone`, `drs_standalone`, route, header,
  navigation, page registry, or CTA map path changed.

## Remaining Gates

1. Independent review and Commander freeze of the exact convergence commit.
2. An independently approved Shared Supabase Auth consumer commit and contract.
3. An approved casework authority source for `casework.case_members` and its
   active-membership semantics.
4. A reviewed DRS Core successor migration implementing the real serialized
   Calendar authorization hook.
5. DRS-specific grant, OAuth start, callback, and Calendar grant endpoints.
6. Clean immutable integration base for the real-auth child.
7. Live PostgreSQL/RLS, real JWT, OAuth, secret, redirect, browser, and
   deployment evidence under separate authority.

Until those gates close, this package remains a local source/test closure and
must not be described as real authentication, a connected Google Calendar,
deployed infrastructure, or production readiness.
