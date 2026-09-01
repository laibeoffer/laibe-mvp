# DRS remote baseline bridge W2

This is a **local source only** forward bridge for the admitted seven-row
Supabase migration baseline. It is not a remote apply script, migration-history
repair, deployment receipt, or proof of live Auth, RLS, Gmail, LINE, or case
data.

## Protected baseline

The bridge requires the exact admitted migration versions and the existing
`casework.cases` and `casework.case_members` relations. It reads those relations
only to validate their identity and to derive owner participation. It never
creates, alters, drops, grants, revokes, inserts, updates, or deletes either
relation. It also preserves the existing Google Calendar authorization function
definition, owner, and ACL byte-for-byte at the catalog level. The new mapping
table validates `casework.cases` through its own fail-closed trigger instead of
installing a foreign-key trigger on the protected relation. The transaction
compares owner, ACL, RLS flags, triggers, constraints, and policies for both
protected relations before it can commit.

Any missing, extra, duplicate, or replaced migration version; incompatible
casework shape; unexpected RLS state; Calendar function drift; or partial DRS
footprint fails before the first persistent DDL statement.

## Added DRS-owned contracts

Within one PostgreSQL transaction the migration adds the missing DRS core,
verified specialist identity bridge, digest-only server session, and private
LINE account-link and delivery lifecycle. No user, specialist, assignment,
mapping, session, LINE binding, outbox item, receipt, or audit row is created by
the migration.

Five narrow public RPC wrappers expose the existing identity-state lifecycle to
`service_role` without exposing the `integration` schema. The wrappers have a
fixed empty search path, are owned by `postgres`, revoke execution from
`PUBLIC`, `anon`, and `authenticated`, and delegate only constant calls to the
private create, claim, fail, callback-prepare, and callback-finalize functions.
Direct DML on private identity, session, and LINE tables remains revoked.

## Local verification

The source test checks the immutable exact-seven preimage, forbidden protected
mutations, object manifest, service-role-only wrappers, canonical casework owner
mapping, and local-only test harness. The disposable PostgreSQL harness uses a
pinned local Docker executable and cached Supabase PostgreSQL image with no
network, ports, or mounts. It tests fail-closed preimage drift, transactional
rollback, successful apply, postconditions, ACLs, and second-apply denial, then
removes its task-owned container and requires residual zero.

The harness must **never contact or mutate a remote Supabase project**. A future
remote apply requires a separately authorized action-time preimage read,
reviewed candidate admission, backup/rollback decision, secret handling, and
post-apply catalog verification.
