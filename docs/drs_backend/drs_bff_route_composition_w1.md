# DRS BFF Route Composition W1

## Objective

Bind the DRS workspace and Google Calendar server routes to the accepted secure
session cookie plus opaque BFF proof. Browser-supplied case, role, specialist,
assignment, provider, calendar, query, body, or custom header values are never
authorization inputs.

## Guarded route contract

The following same-origin routes accept only `POST` and the exact JSON shape
shown here. `OPTIONS` may complete CORS preflight before authorization.

- `/functions/v1/drs-workspace-grant`: `{}`
- `/functions/v1/drs-google-calendar-grant`: `{}`
- `/functions/v1/drs-google-calendar-oauth-start`: `{}`
- `/functions/v1/drs-google-calendar-events-read`: `{ timeMin, timeMax }`
- `/functions/v1/drs-google-calendar-revoke`: `{}`

Both event window fields must be RFC3339 strings with at most three fractional
digits. The start must precede the end and the window must not exceed 31 days.
Unknown query members, body members, nested values, arrays, duplicate top-level
members, and unapproved `x-*` headers fail before server authority or provider
work. Reversed or oversized event windows are rejected before the accepted BFF
verifier, current-authority check, Calendar authority port, or provider seam.

## Server authority composition

The shared route guard verifies the exact request shape, same-origin browser
context, secure session cookie, opaque proof, expiry, cookie digest, and bound
authorization facts. It alone selects `authenticatedUserId`, `selectedCaseId`,
and `authorizationSubject`.

Workspace authorization then calls the accepted workspace grant seam with the
guard-selected case and subject as mandatory expectations. Calendar grant, event
read, revoke, and OAuth start freshly resolve DRS Calendar authority and must
exactly match the guard-selected user, case, specialist, and subject before
backend or provider work. OAuth start passes no pending assignment hint; the
server freshly selects the assignment and the route then performs the exact BFF
context match. It replaces the raw-session resolver with an injected
guard-backed server-context seam. Missing BFF or provider runtime fails closed.

The workspace response remains the minimal A0 read-only contract and maps the
validated internal active grant to the exact product state `ACTIVE`. No route
returns, logs, or persists an access token, refresh token, provider credential,
opaque proof, or session cookie.

## Configuration and exclusions

Platform JWT verification is disabled only for the custom session bootstrap, the
five BFF-guarded routes, and the accepted Google Calendar OAuth callback. The
callback remains outside this composition and retains its accepted signed state
and server-side pending-context contract. Accepted migrations, callback, shared
Google adapters, and all other intake files are frozen byte-for-byte.

This worktree contains a local static candidate and injected test seams only. It
does not apply migrations, call live services, deploy functions, or prove real
Auth, OAuth, database, RLS, provider, deployment, or launch behavior.
