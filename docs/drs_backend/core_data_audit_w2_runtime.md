# DRS Core Data/Audit W2 Local PostgreSQL Runtime

## Scope

W2 adds a repeatable disposable local PostgreSQL runtime harness for the frozen W1 contract lane. This lane is local-only and uses a disposable local PostgreSQL process or container when one already exists on the machine. It is not remote Supabase, not production, and not an authorization to apply the migration anywhere outside the disposable local runtime.

## Tool Selection Order

The harness chooses the smallest existing-compatible local runtime in this order:

1. local PostgreSQL binaries already on `PATH` (`initdb`, `pg_ctl`, `psql`)
2. local Docker runtime with a preloaded `postgres:16` image
3. `supabase` CLI is inspected for observability only and is not the default W2 runtime path

`supabase` CLI alone is not enough for W2 runtime proof. Detection keeps `supabase` read-only: the harness records whether the executable is present, but it does not invoke the CLI during disposable-runtime discovery. If Docker and local PostgreSQL binaries are both absent, or if Docker exists but the local `postgres:16` image is unavailable and cannot be pulled during the task, the harness returns `BLOCKED_NO_DISPOSABLE_POSTGRES` plus the exact missing executable/command and one exact next safe action.

## Disposable Bootstrap

Because the W1 migration references `auth.uid()` and Supabase-style application roles, the disposable runtime bootstrap creates only the minimum local stand-ins needed for runtime verification:

- roles: `anon`, `authenticated`, `service_role`
- schema: `auth`
- helper: `auth.uid()` bound to `request.jwt.claim.sub`

This bootstrap exists only to let the local PostgreSQL runtime evaluate the migration and RLS paths. It does not claim parity with a live Supabase platform runtime.

For the Docker path, the disposable runtime is exercised only through `docker exec`. The harness does not publish a host port for a trust-auth container.

## Runtime Proof Matrix

The W2 harness is scoped to these proofs:

1. W1 migration applies to a fresh disposable local DB
2. schema, owner, revoke, and execute grants exist as expected
3. direct audit DML is denied to application roles
4. RLS and FORCE RLS hold for owner and specialist authenticated subjects
5. specialist identity and assignment interval constraints stay immutable
6. LINE ingest requires a formal same-case DRS group link
7. guarded append, replay, chronology, and chain rules hold
8. trusted AI review append only accepts bounded advisory statuses
9. human authority, unavailable-review handling, and break-glass stay bounded
10. final message and transport receipt remain distinct
11. invalid timestamp and interval cases fail closed
12. runtime seed data rolls back and repeated fresh runs stay deterministic

Proof reporting is evidence-derived. A passing result is built from the runtime assertions emitted by `verify-drs-core-runtime.sql`, plus a second verification run against the same disposable database after rollback.

## Files

- harness library: `scripts/drs-core-postgres-runtime/runtime-harness.mjs`
- harness CLI: `scripts/drs-core-postgres-runtime/run-runtime-checks.mjs`
- disposable auth bootstrap: `scripts/drs-core-postgres-runtime/bootstrap-local-auth.sql`
- runtime verification SQL: `scripts/drs-core-postgres-runtime/verify-drs-core-runtime.sql`
- static preflight tests: `tests/drs-core-postgres-runtime/*.test.mjs`

## Blocked Fallback

If no supported disposable local PostgreSQL runtime exists, W2 does not fake runtime proof. The harness returns a blocked result that includes:

- exact blocker code
- exact missing executable/command list
- any observed local CLI detection detail, including a skipped `supabase` probe
- one exact next safe action

## Current Honest Boundary

- `CANONICAL_ADMISSION=FALSE`
- `DEPLOYMENT=FALSE`
- `LIVE_POSTGRES_PROOF=FALSE` until the disposable local runtime actually executes green
- live postgres proof is a separate gate from static SQL or Node preflight green
- no remote Supabase connection
- no migration apply outside the disposable local runtime
- no secret or production dependency

## Execution

Human-readable output:

```powershell
node scripts/drs-core-postgres-runtime/run-runtime-checks.mjs
```

Structured output:

```powershell
node scripts/drs-core-postgres-runtime/run-runtime-checks.mjs --json
```

Tooling-only preflight:

```powershell
node scripts/drs-core-postgres-runtime/run-runtime-checks.mjs --tooling-only --json
```

When the runtime path is available, the same harness is intended to be run twice against fresh disposable state before W2 claims a local runtime candidate.
