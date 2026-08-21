# Google Calendar DRS account contract

Status: local shared-contract candidate. It does not authorize a DRS endpoint,
Supabase migration apply, secret change, OAuth redirect registration, deploy, or
consumer implementation.

## Role boundary

`CaseMemberRole` remains exactly `owner | pro`. Calendar code uses the separate
`GoogleCalendarAccountRole = CaseMemberRole | "drs"`. A DRS account must never be
inserted into or projected as a `casework.case_members` owner/pro row.

Owner and pro keep the existing case-member authorization path and
`GOOGLE_CALENDAR_REDIRECT_URI`. DRS requires the distinct
`GOOGLE_CALENDAR_DRS_REDIRECT_URI`; the factory fails closed when it is absent,
not an exact HTTPS URL, or equal to the owner/vendor redirect.

## Injected DRS authorization

The future DRS start and callback endpoints must inject a
`DrsSpecialistAuthorizationStrategy` into
`createSupabaseGoogleCalendarOAuthDependencies("drs", options)`.

The strategy receives only the authenticated Supabase user ID, the fixed server
role `drs`, and either no pending context (start) or the pending row's exact case
and authorization subject (callback). It must resolve and recheck, from existing
DRS Core authority:

- active auth-user-to-specialist binding;
- ACTIVE specialist authority;
- active case assignment;
- the server-selected case;
- one stable server-derived specialist authorization subject.

The returned facts must contain matching `authenticatedUserId`, `currentCaseId`,
`accountRole: "drs"`, `authorizationSubject`, `authBindingStatus: "active"`,
`specialistStatus: "active"`, `assignmentStatus: "active"`, and a
`selectedCaseId` equal to `currentCaseId`. A membership object is rejected. The
shared contract does not define a DRS role table and does not infer any of these
facts from email, user metadata, URL/query/hash, browser storage, request body, or
frontend role state.

## JWT and callback boundary

Future authenticated grant/start functions remain `verify_jwt=true`. The
Supabase gateway may reject a missing or invalid JWT before handler code, so
acceptance requires HTTP 401 with no sensitive data but does not require a
handler-authored gateway body. A valid owner/pro JWT reaching a DRS handler must
fail application authorization with a sanitized 403.

The Google browser callback remains `verify_jwt=false`. It must not require or
trust a browser Supabase bearer. It resolves the opaque state to a digest-only
pending row, then derives the auth user, DRS role, selected case,
authorization subject, and exact redirect only from that row. Query parameters
other than Google `code` and opaque `state`, callback headers, and browser state
cannot override those values.

Before Google token exchange, the callback invokes the injected DRS strategy
again and requires the current authorization subject and case to match the
pending row. An authority, assignment, subject, role, case, redirect, expiry, or
consumed-state change stops before token exchange and credential commit.

## Persistence and secrets

Migration `20260821170000_google_calendar_drs_account_contract.sql` is additive.
It extends the private OAuth-state role check to `owner | pro | drs`, stores the
server authorization subject, and adds a private DRS Calendar binding table that
references `auth.users` and `casework.cases`, not `casework.case_members`.

The service-role-only v2 RPCs are:

- `google_calendar_account_begin_oauth_v2`
- `google_calendar_account_get_oauth_state_v2`
- `google_calendar_account_commit_callback_v2`

The callback commit locks the digest-selected pending row, verifies single use,
expiry, user, role, authorization subject, and redirect, then atomically updates
the encrypted credential, role-specific binding, and `consumed_at`. Owner/pro
still receive the existing SQL case-member reauthorization before begin and
commit. DRS specialist authorization remains the injected DRS Core strategy;
the migration creates no duplicate specialist authority model.

PKCE verifier and OAuth credentials remain AES-GCM sealed with server-only key
material. Provider responses are consumed only after `response.ok`. Browser
responses are limited to redirect-required/connected or sanitized closed states;
they do not expose auth-user/specialist identity, authorization subject, Google
subject, calendar/provider IDs, state digest, client secret, credentials, or
tokens. Shared OAuth code has no user-visible identifier or credential logging
path.
