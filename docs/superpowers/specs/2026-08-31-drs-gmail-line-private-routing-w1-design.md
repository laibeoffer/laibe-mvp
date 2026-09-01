# DRS Gmail Login and Private LINE Case Notification W1 Design

**Status:** Human-approved design sections 1–3; written-spec review pending
**Date:** 2026-08-31 **Source base:** `d0571b467b0f75439a7773b300febbcfe8069cd1`
**Source tree:** `20ce85b39b3f95e71f64b079b1603a589bdf0f18` **Implementation
branch:** `drs-backend/a5-drs-gmail-line-private-routing-w1-20260831`
**Environment:** `PILOT`, restricted to the Human Owner

## 1. Product decision

DRS uses Gmail-backed DRS authentication as its only login and authorization
identity. A reviewer's personal LINE account is a notification destination only.
LINE must never create a DRS session, select a case, assign a role, or grant
case access.

The product flow is:

```text
Sign in to DRS with Gmail
→ DRS verifies an active specialist identity
→ Select "Bind LINE for case notifications"
→ Confirm the binding through the laibe LINE Official Account
→ DRS displays "LINE linked"
→ Future assigned-case notifications arrive in the reviewer's private LINE chat
→ Opening a case still requires Gmail-backed DRS authorization
```

This design uses the existing `laibe` LINE Official Account (`@953vqegd`,
Messaging API channel `2009045584`) as a Human-only Pilot. Pilot success does
not establish production ownership, public availability, or production launch.

## 2. Goals

1. Bind one active DRS specialist identity, derived from a verified Gmail-backed
   DRS session, to one personal LINE identity through LINE's official Messaging
   API User Account Linking flow.
2. Give the reviewer four explicit operations: start, status, cancel, and
   unlink.
3. Preserve durable, collision-safe, replay-safe binding and audit records.
4. Create a private LINE notification when a valid DRS case assignment is
   recorded for the bound specialist.
5. Make every notification traceable from assignment through outbox admission,
   LINE acceptance or failure, and the DRS case audit record.
6. Keep the existing reviewer UI's twelve sanitized states as the browser
   contract while rendering plain Traditional Chinese product copy.

## 3. Non-goals

- LINE Login OAuth, LIFF, password login, or LINE-based DRS sessions.
- LINE groups, group-to-case binding, owner/vendor group chat, or general chat
  features.
- Frontend role selection or role escalation.
- Granting ordinary-reviewer or highest-reviewer authority through LINE.
- Sending complete case documents, quotations, drawings, personal data, or
  internal review content in LINE messages.
- Modifying the A3 dirty reviewer UI files in this producer lane.
- Modifying the existing Zeabur `drs-line-real-test` transport-only service.
- Deploying, changing the LINE Console webhook, entering secrets, or declaring
  production launch in the source-only implementation phase.

## 4. Actor and authority model

The Gmail-backed DRS authority chain remains authoritative:

```text
verified auth subject
→ active DRS specialist
→ active case assignment or case-scoped grant
→ active case
→ permitted case action
```

The LINE binding attaches only to the resolved `specialist_id`. It does not
attach to an email string, display name, browser-supplied specialist ID, case
ID, or role.

An ordinary reviewer is the default case role. Highest-reviewer authority
remains a distinct, server-verified, case-scoped grant. Even when the same Human
holds both roles, a highest-reviewer intervention requires an explicit DRS
action, reason, timestamp, and immutable audit event. LINE has no role-switching
operation.

## 5. Runtime architecture

- **Zeabur:** hosts the DRS browser application and the user-facing account-link
  continuation page.
- **Supabase Auth and existing A17 runtime:** verify the Gmail-backed DRS
  session and resolve the current specialist authority.
- **Supabase Edge Functions:** implement the authenticated binding BFF, the
  canonical LINE webhook, the account-link continuation, and the
  private-notification dispatcher.
- **Supabase Postgres:** owns binding state, uniqueness, replay protection,
  outbox admission, receipts, and audit facts.
- **LINE Messaging API:** issues one-time link tokens, emits signed
  `accountLink` webhook events, and accepts private push messages.

The LINE channel has one canonical webhook. During source construction and
review, the existing Zeabur transport-only webhook remains unchanged. A later,
separately authorized Pilot deployment must switch the LINE channel only after
the Supabase webhook passes source review, local verification, deployment health
checks, and LINE Verify.

## 6. Official account-linking sequence

1. The authenticated reviewer calls `drs-line-account-link-start` with an exact
   empty JSON object.
2. The server resolves the authenticated user to an active specialist and
   creates or reuses one unexpired pending intent.
3. The response contains only a sanitized pending state, expiry, next action,
   and the public laibe Official Account launch URL.
4. The reviewer opens the laibe private chat and selects the exact binding
   action.
5. The signed LINE event supplies the provider-owned LINE user identity to the
   canonical webhook.
6. The webhook requests a one-time `linkToken` and sends the official linking
   URL by private push with a durable provider retry key. A crash and LINE
   redelivery reuse that key, so an already accepted visible prompt is not
   duplicated.
7. The user opens the link. The continuation page requires the existing
   Gmail-backed DRS session; when absent, it resumes only the existing Gmail
   authentication flow.
8. The continuation service resolves the active specialist again, generates a
   cryptographically random single-use nonce, stores only the nonce digest with
   the pending intent, and redirects to LINE's official account-link endpoint.
9. LINE sends a signed `accountLink` webhook event containing the result, LINE
   user identity, and nonce.
10. One atomic database operation consumes the nonce, enforces both uniqueness
    directions, creates the active binding, completes the intent, records replay
    admission, and appends the binding audit event.
11. The browser polls `status` and renders `linked` only after the durable
    transaction succeeds.

The raw link token and nonce are one-time protocol values. They must not appear
in application DTOs, browser storage, analytics, audit payloads, or logs. The
continuation route must apply `Referrer-Policy: no-referrer`, prevent caching,
strip the protocol query from browser history as soon as it has been exchanged
for server-held state, and reject reuse or expiry.

## 7. Browser BFF contract

All browser operations require a valid Gmail-backed DRS session and server-side
active-specialist resolution. They must reject extra request keys and must never
accept authority IDs from the browser.

### Start

```http
POST /functions/v1/drs-line-account-link-start
Content-Type: application/json

{}
```

```json
{
  "state": "awaiting_line_confirmation",
  "expiresAt": "2026-08-31T12:00:00.000Z",
  "nextAction": "continue_in_line",
  "botLaunchUrl": "https://line.me/..."
}
```

### Status

```http
GET /functions/v1/drs-line-account-link-status
```

The response contains exactly `state` and only the optional timestamps and
product-action fields allowed for that state. It never contains a specialist ID,
LINE user ID, provider payload, nonce, link token, case ID, assignment ID, role,
secret, or bearer credential.

### Cancel

```http
POST /functions/v1/drs-line-account-link-cancel
Content-Type: application/json

{}
```

Cancel applies only to an unconsumed pending intent. It does not modify an
active binding.

### Unlink

```http
POST /functions/v1/drs-line-account-link-unlink
Content-Type: application/json

{}
```

Unlink is an independent operation. An active Gmail-backed DRS session may use
this BFF. When no current-case session exists, the owner may send the exact
private message `解除 LINE 案件通知` from the already-bound LINE identity. The
signed webhook can revoke only the matching provider-channel/LINE-identity
binding; it cannot authenticate, grant a case, or change a role. Both paths stop
new notifications without deleting historical audits or receipts.

## 8. Browser state contract

The exact transport states are:

```text
not_linked
awaiting_line_confirmation
linked
expired
cancelled
conflict_line_already_bound
conflict_drs_already_bound
permission_denied
specialist_inactive
temporarily_unavailable
unlinking
revoked
```

Allowed transitions are:

```text
not_linked → awaiting_line_confirmation
awaiting_line_confirmation → linked | expired | cancelled
awaiting_line_confirmation → conflict_line_already_bound | conflict_drs_already_bound
awaiting_line_confirmation → permission_denied | specialist_inactive | temporarily_unavailable
linked → unlinking → revoked
revoked → awaiting_line_confirmation
```

Unknown, malformed, over-broad, or secret-shaped provider data maps to
`temporarily_unavailable` or `permission_denied`; it is never projected into the
page. A conflict never overwrites an existing active binding.

## 9. Durable data model

All new server-owned records live in the existing non-browser `integration`
schema. Private mutation and assertion functions live in `drs_private`, use
`search_path = ''`, revoke default `PUBLIC` execution, and grant only the exact
service path that requires them.

### `integration.drs_line_account_link_intents`

Stores the specialist, provider channel, state, one-way nonce digest, expiry,
consumption, cancellation, failure, and timestamps. It never stores a raw nonce
or raw link token.

### `integration.drs_line_account_bindings`

Stores the specialist, provider channel, deterministic keyed LINE identity
digest, encrypted LINE user identifier, encryption-key version, lifecycle state,
linked timestamp, revoked timestamp, and monotonic version. Partial unique
indexes enforce one active binding per specialist and one active specialist per
provider LINE identity.

### `integration.drs_line_binding_audit`

Append-only identity-level events: start, link-token-issued, linked, conflict,
expired, cancelled, unlink-requested, revoked, denied, and provider-unavailable.
Payload keys are closed and contain no raw LINE identifier, token, nonce, Gmail
address, or secret.

### `integration.drs_line_webhook_events`

Stores a durable digest of `webhookEventId`, event kind, first-seen time, stable
provider retry key, completion state, and safe outcome. The unique event key
plus stable provider retry key make signed LINE redelivery and crash recovery
idempotent at the visible push boundary.

### `integration.drs_line_notification_outbox`

Stores one immutable notification intent per accepted case-assignment/version
combination. The record references the case, assignment, specialist, binding
version, product template version, safe case summary, state, attempt count, and
next-attempt time. A unique idempotency key prevents duplicate user-visible
notifications.

### `integration.drs_line_delivery_receipts`

Append-only delivery attempts containing the outbox ID, safe provider request
correlation, accepted or failed outcome, HTTP status class, attempt time,
duration, and sanitized reason code. It contains no raw provider response or
credential.

Identity encryption and deterministic lookup use separate server-only secrets
with explicit key versions. Secret values never enter migrations, tracked
fixtures, browser assets, logs, or chat.

## 10. Private case-notification flow

1. DRS accepts a case assignment using existing server authority.
2. Database triggers on assignment creation and active-binding creation invoke
   one server-derived producer. It creates one outbox record keyed by
   assignment, binding version, and notification-template version; the caller
   cannot provide message text, case URL, role, or specialist identity.
3. The dispatcher re-resolves the active case, assignment, specialist, and
   current binding version immediately before sending.
4. The dispatcher decrypts the LINE destination only inside the server process,
   constructs the minimum notification, and calls the LINE push endpoint.
5. It appends a delivery receipt and a `PRIVATE_LINE_NOTIFICATION` DRS case
   audit event describing whether the reviewer was notified.
6. Retryable failure schedules a bounded retry using the same idempotency key.
   Permanent failure stops retries and leaves a clear DRS inbox state.

The private LINE message contains only:

- a safe case label or reference;
- the current case status;
- the next action expected from the reviewer;
- a signed-in DRS case URL.

It excludes documents, quotations, drawings, personal contact details, raw
findings, full messages, internal identifiers, database state, and engineering
terminology.

If no active binding exists, the assignment remains valid and the DRS inbox
displays a product-language state equivalent to “Case assigned; LINE
notification pending setup.” LINE delivery success never substitutes for the
assignment or case audit fact.

## 11. Failure and concurrency behavior

- Invalid Gmail/DRS session: deny before any provider or database mutation.
- Inactive specialist: deny start; allow the authenticated binding owner to
  unlink.
- Expired or reused link token/nonce: fail closed and preserve the prior active
  binding.
- Invalid LINE signature: return a controlled rejection without parsing provider
  authority or writing binding state.
- Duplicate `webhookEventId`: return the previously committed safe outcome
  without repeating provider or database effects.
- Same LINE bound elsewhere: `conflict_line_already_bound`; never transfer
  automatically.
- Same specialist bound elsewhere: `conflict_drs_already_bound`; never replace
  automatically.
- Database or LINE outage: `temporarily_unavailable`; retain pending/outbox
  state for bounded retry.
- Notification retry: use the original idempotency key and binding version;
  never send after unlink or authority loss.
- Concurrent unlink and send: a locked current-binding assertion must make
  either revocation or send admission win, never both ambiguously.

## 12. Security boundary

- Browser requests never carry `specialistId`, `assignmentId`, `caseId`, role,
  provider channel, LINE user ID, group ID, callback origin, or return URL.
- Browser code never contains service-role credentials, LINE secrets, channel
  access tokens, encryption keys, or webhook verification material.
- Authorization does not use user-editable metadata, email text, LINE display
  names, profile text, query parameters, local storage, session storage, or DOM
  data attributes.
- Authenticated Edge Functions validate the Gmail-backed Supabase user session
  and then re-resolve DRS specialist authority.
- The external LINE webhook disables platform JWT admission only because LINE
  cannot send a Supabase credential; it must verify the exact raw request body
  against `X-Line-Signature` before processing events.
- All external inputs use strict content type, method, body size, exact-key,
  string-length, timestamp, Base64, and enum validation.
- Logs use a fixed allowlist of safe correlation, event-kind, outcome,
  status-class, and duration fields.

## 13. Source-only implementation boundary

The producer starts from A17 commit `d0571b467b0f75439a7773b300febbcfe8069cd1`.
The intended implementation allowlist is:

```text
docs/superpowers/specs/2026-08-31-drs-gmail-line-private-routing-w1-design.md
docs/superpowers/plans/2026-08-31-drs-gmail-line-private-routing-w1.md
docs/drs_backend/drs_gmail_line_private_routing_w1.md
supabase/config.toml
supabase/migrations/<Supabase-CLI-generated>_drs_gmail_line_private_routing_w1.sql
supabase/functions/_shared/drs-line-account-link/**
supabase/functions/drs-line-account-link-start/index.ts
supabase/functions/drs-line-account-link-status/index.ts
supabase/functions/drs-line-account-link-cancel/index.ts
supabase/functions/drs-line-account-link-unlink/index.ts
supabase/functions/drs-line-account-link-continue/index.ts
supabase/functions/drs-line-webhook/index.ts
supabase/functions/drs-line-private-notification-dispatch/index.ts
supabase/tests/drs_gmail_line_private_routing_w1.test.mjs
tests/drs-gmail-line-private-routing-source.test.mjs
```

The A3 reviewer UI exact4, A14 LINE runtime candidate, and
`services/drs-line-test/**` are protected non-writable dependencies for this
producer.

## 14. Test strategy

Implementation follows causal RED/GREEN evidence. Required focused tests cover:

1. strict Gmail session and active-specialist admission;
2. closed start/status/cancel/unlink requests and sanitized DTOs;
3. all twelve browser states and allowed transitions;
4. canonical raw-body LINE signature verification;
5. one-time link token and nonce expiry/reuse behavior;
6. both uniqueness collisions under concurrent attempts;
7. durable webhook redelivery idempotency;
8. unlink ownership, revocation, and audit preservation;
9. assignment-authorized outbox admission;
10. no notification after assignment invalidation, authority loss, binding
    revocation, or binding-version change;
11. retry without duplicate user-visible messages;
12. absence of secrets and authority IDs from browser DTOs, tracked source,
    logs, and fixtures;
13. migration ownership, grants, RLS/private-schema boundaries, indexes,
    triggers, and append-only guards;
14. Edge Function source/type checks and existing A17 session/grant regression
    tests;
15. real local PostgreSQL concurrency and constraint checks when the verified
    local Supabase runtime is available.

Source tests, local migration tests, HTTP mocks, or a healthy Edge Function do
not prove real LINE acceptance, durable deployed Supabase state, or phone
delivery. Those claims require the separate Pilot gate below.

## 15. Human-only Pilot acceptance

After independent source review and separate deployment authority, the Human
Owner performs exactly one Pilot sequence:

1. Sign in to DRS with Gmail.
2. Start the LINE notification binding.
3. Complete official linking through the laibe private chat.
4. Confirm the DRS page reports a durable linked state.
5. Assign one non-production test case to the same specialist.
6. Confirm the private LINE chat receives one case notification.
7. Open the link and confirm Gmail-backed DRS authorization resolves the
   intended test case.
8. Unlink LINE.
9. Trigger another test assignment and confirm no new LINE notification is sent.
10. Confirm DRS retains assignment, notification, delivery, failure where
    applicable, and unlink audit history.

Only all ten verified facts allow:

```text
PRIVATE_LINE_CASE_NOTIFICATION_PILOT=PASS
```

The following remain false until separately approved and proven:

```text
PRODUCTION_BUSINESS_OWNERSHIP_CONFIRMED=FALSE
PUBLIC_REVIEWER_ROLLOUT=FALSE
PRODUCTION_LAUNCH=FALSE
```

## 16. Completion and handoff

The source candidate is complete only when the exact allowlist is cleanly
committed, focused and regression tests pass at the final HEAD, secret scanning
is clean, an independent reviewer reports no unresolved Critical or Important
findings, and source/runtime/provider truth is reported separately.

Push, PR, merge, Supabase deployment, LINE Console changes, Zeabur changes,
secret entry, real Pilot messages, and production launch each require separate
Human authority.
