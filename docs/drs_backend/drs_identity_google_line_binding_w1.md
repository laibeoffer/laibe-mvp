# DRS Identity Google + LINE Binding W1

## Candidate boundary

This package is a local source/static/mock transport candidate. It adds Google
and LINE Login identity-producer seams around the separately accepted DRS
authority chain; it does not create a second specialist, case, assignment, or
reviewer authority graph.

The authority chain consumed by this package is:

```text
verified Supabase authenticated_user_id
-> active integration.drs_auth_specialist_bindings row
-> ACTIVE public.drs_specialists row
-> server-owned selected assignment
-> active public.drs_case_specialist_assignments row
-> active integration.drs_case_identity_bindings row
-> exact casework.cases row
```

Provider subject, verified email, LINE profile, LINE webhook user ID, Business
ID, client role, user metadata, body/query case ID, and browser storage are not
authority. There is no highest-reviewer, all-cases, wildcard, or override path.
Google linkage is optional Calendar identity data; a valid LINE-only binding
does not require a Google binding.

## Composition contract

This additive provider migration composes after these accepted migrations and
does not alter their bytes:

- `20260824090000_drs_google_calendar_api_w1.sql`
- `20260824170000_drs_identity_google_line_w1.sql`
- `20260824180000_drs_calendar_identity_composition_w1.sql`

It stores only server-owned provider bindings, opaque OAuth pending state, and
provider audit events in `integration`. Provider bindings carry the exact
`authenticated_user_id`, `specialist_id`, and stable `authorization_subject`
produced by the accepted locked authority resolver. LINE and Google bindings are
independent.

The checked-in endpoints are dependency-injected and fail closed when the
runtime authority resolver, provider verifier, state store, or verified session
producer is unavailable. A login callback returns `SESSION_ESTABLISHED` only on
a validated browser continuation after an injected server-side producer accepts
the exact authenticated user, specialist, authorization subject, and server
continuation context. The continuation is an empty-body 303 response to the
exact configured same-origin application URL with a host-only `Secure`,
`HttpOnly`, `SameSite=Lax|Strict`, `Path=/` session cookie. Without a producer
or a usable continuation the callback returns the sanitized
`SESSION_PRODUCER_UNAVAILABLE` state and never claims that login succeeded.

## OAuth and callback protection

- Opaque state and nonce are stored as SHA-256 digests only.
- PKCE uses S256; the verifier uses an AES-GCM secret envelope.
- Pending lifetime is finite and no more than 15 minutes.
- State is atomically claimed before the provider exchange attempt.
- A claimed state is terminal: success consumes it; any exchange, verification,
  authority, completion, or session-producer failure records a failed terminal
  state. There is no release/reopen operation.
- Login completion is two-phase. Preparation locks and revalidates authority
  while leaving the state claimed and writes no success audit. The adapter then
  validates the producer's cookie/redirect response but holds it in memory.
  Finalization rechecks the exact prepared facts, atomically marks the state
  consumed, and writes one `identity_login`; only then is the held continuation
  returned to the browser.
- Producer throw/not-established/invalid continuation writes exactly one
  `identity_callback_failed` and zero `identity_login`. If finalization fails
  after producer preparation, the continuation is discarded and the state is
  terminalized failed, so retry cannot repeat provider exchange or producer
  invocation.
- Callback completion does not rely on ambient `auth.uid()` in the service-role
  path. Bind state carries server-validated accepted authority facts; login
  resolves a server-owned provider binding and revalidates the same accepted
  locked authority chain.
- Responses never expose tokens, credentials, provider subject, email, raw
  state, nonce, verifier, specialist ID, assignment ID, or unauthorized case
  identifiers in URL, JSON, logs, query/hash, or browser storage. Session
  material is accepted only in the validated secure HTTP-only cookie
  continuation.

The exact identity endpoint names in this source candidate are:

- `/functions/v1/drs-google-auth-start`
- `/functions/v1/drs-google-auth-callback`
- `/functions/v1/drs-line-login-start`
- `/functions/v1/drs-line-login-callback`
- `/functions/v1/drs-session-grant`

The separately accepted Calendar API uses the
`/functions/v1/drs-google-calendar-*` family. The historical isolated
`/drs-specialist-calendar-*` transport-test name is not a production endpoint
contract.

The continuation response contains only the exact configured same-origin
`Location` (with no query, hash, credentials, or authority fields), one
host-only secure session cookie, `x-laibe-session-state: SESSION_ESTABLISHED`,
and no-cache/security headers. Frozen A0 currently consumes a JS-visible
`{accessToken, expiresAt}` result and Authorization headers, so it cannot
directly consume this cookie-only contract. This candidate intentionally does
not expose tokens to imitate that consumer; an A3-owned session bootstrap/BFF
composition stage is required before A0 linkage.

Provider tables use RLS plus FORCE RLS, deny direct application access, pin
security-definer `search_path`, and expose only the exact producer functions to
`service_role`. The DRS session-grant endpoint consumes a verified Supabase
session and emits only the accepted `laibe.drs-workspace-auth.v1` read-only case
projection.

The migration path is fixed at
`supabase/migrations/20260824092002_drs_identity_foundation.sql`. Do not run
`supabase migration new drs_identity_foundation`; no migration was applied.

## Non-secret local verification

Run from this worktree without provider credentials or a Supabase project link:

```powershell
deno test --allow-read --no-check --reporter=tap supabase/tests/drs_identity_google_line_binding_w1.test.mjs
node --test tests/drs-identity-google-line-source-closure.test.mjs
deno check supabase/functions/_shared/drs-auth/contracts.ts supabase/functions/_shared/drs-auth/google-identity-adapter.ts supabase/functions/_shared/drs-auth/line-login-adapter.ts supabase/functions/_shared/drs-auth/specialist-authorization.ts supabase/functions/drs-google-auth-start/index.ts supabase/functions/drs-google-auth-callback/index.ts supabase/functions/drs-line-login-start/index.ts supabase/functions/drs-line-login-callback/index.ts supabase/functions/drs-session-grant/index.ts
deno fmt --check supabase/functions/_shared/drs-auth/contracts.ts supabase/functions/_shared/drs-auth/google-identity-adapter.ts supabase/functions/_shared/drs-auth/line-login-adapter.ts supabase/functions/_shared/drs-auth/specialist-authorization.ts supabase/functions/drs-google-auth-start/index.ts supabase/functions/drs-google-auth-callback/index.ts supabase/functions/drs-line-login-start/index.ts supabase/functions/drs-line-login-callback/index.ts supabase/functions/drs-session-grant/index.ts supabase/tests/drs_identity_google_line_binding_w1.test.mjs
deno lint supabase/functions/_shared/drs-auth/contracts.ts supabase/functions/_shared/drs-auth/google-identity-adapter.ts supabase/functions/_shared/drs-auth/line-login-adapter.ts supabase/functions/_shared/drs-auth/specialist-authorization.ts supabase/functions/drs-google-auth-start/index.ts supabase/functions/drs-google-auth-callback/index.ts supabase/functions/drs-line-login-start/index.ts supabase/functions/drs-line-login-callback/index.ts supabase/functions/drs-session-grant/index.ts
node --check tests/drs-identity-google-line-source-closure.test.mjs
git diff --check
```

All behavior tests use in-memory stores, injected authority/session ports, and
mock transport objects. They make no provider, database, Supabase, Google, or
LINE network call.

## External gates

```text
REAL_DRS_SUPABASE_PROJECT=NOT_CREATED
REAL_GOOGLE_OAUTH=NOT_CONNECTED
REAL_LINE_LOGIN=NOT_CONNECTED
REAL_DRS_ACCOUNTS=NOT_CREATED
REMOTE_MIGRATION=NOT_APPLIED
DEPLOYMENT=NOT_DONE
CANONICAL_RUNTIME=NOT_PROVEN
A0_DIRECT_COOKIE_CONTINUATION_COMPATIBILITY=FALSE
```

Also unproven: real PostgreSQL compilation or migration execution, real Supabase
Auth/RLS, a real LINE-to-Supabase session producer, real provider token
verification, real Google Calendar use, browser end-to-end behavior, canonical
runtime integration, deployment, and production admission.

## Next safe stage

After A3 independent acceptance, an authorized backend composition task may
compile/apply the composed migrations in disposable local PostgreSQL and wire
the server-only stores, verified session producer, provider verifiers, and
runtime configuration. UI linkage remains a later bounded task. This candidate
must stay Keep as-is with COMMIT=NO and must not be deployed or presented as a
real login, Auth, RLS, OAuth, Calendar, LINE, or production integration.
