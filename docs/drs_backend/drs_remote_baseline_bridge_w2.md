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
relation. It also preserves the existing Google Calendar authorization
function definition, owner, and effective ACL through an immutable admitted
manifest.
The new mapping table validates `casework.cases` through its own fail-closed
trigger instead of installing a foreign-key trigger on the protected relation.
Before the first persistent DDL, the transaction compares immutable SHA-256
fingerprints for effective ACLs, stable trigger definitions, constraints, and
policies, plus explicit owner and RLS / FORCE RLS state, on both protected
relations. The same gate binds the Calendar function definition, owner, and
effective ACL. It evaluates the manifest again before commit; it never derives
the expected values from the database being checked.
Policy role sets are rendered to stable role names before sorting and hashing;
OID creation order is ignored and role OID zero is represented explicitly as
`PUBLIC`.

Any missing, extra, duplicate, or replaced migration version; incompatible
casework shape; unexpected RLS state; Calendar function drift; or partial DRS
footprint fails before the first persistent DDL statement with a transactionally
empty DRS footprint.

## Added DRS-owned contracts

Within one PostgreSQL transaction the migration adds the missing DRS core,
verified specialist identity bridge, digest-only server session, and private
LINE account-link and delivery lifecycle. No user, specialist, assignment,
mapping, session, LINE binding, outbox item, receipt, or audit row is created by
the migration.

Five narrow public RPC wrappers expose the existing identity-state lifecycle
to `service_role` without exposing the `integration` schema. The wrappers have
a fixed empty search path, are owned by `postgres`, revoke execution from
`PUBLIC`, `anon`, and `authenticated`, and delegate only constant calls to the
private create, claim, fail, callback-prepare, and callback-finalize functions.
Direct DML on private identity, session, and LINE tables remains revoked.
All DRS SECURITY DEFINER functions use an empty `search_path`, schema-qualified
object references, `postgres` ownership, and an explicit least-privilege ACL.

## Local verification

The source test checks the immutable exact-seven preimage, forbidden protected
mutations, object manifest, service-role-only wrappers, canonical casework owner
mapping, hardened SECURITY DEFINER contracts, and local-only test harness. The
disposable PostgreSQL harness uses a
pinned local Docker executable and cached Supabase PostgreSQL image with no
network, ports, or mounts. It injects owner, ACL, RLS / FORCE RLS, trigger,
constraint, policy, and Calendar drift and requires the exact manifest-mismatch
marker with zero DRS footprint. It also tests transactional rollback,
successful apply, postconditions, function ACLs, and second-apply denial, then
removes its task-owned container and requires residual zero.
The RLS cases execute `DISABLE ROW LEVEL SECURITY` against each protected table,
require rejection before persistent DDL, restore RLS, and recheck the baseline.
The policy-role probe recreates an equivalent named role set in reverse OID
creation order and requires the rendered-name fingerprint to remain identical.

The harness must **never contact or mutate a remote Supabase project**. A future
remote apply requires a separately authorized action-time preimage read,
reviewed candidate admission, backup/rollback decision, secret handling, and
post-apply catalog verification.
