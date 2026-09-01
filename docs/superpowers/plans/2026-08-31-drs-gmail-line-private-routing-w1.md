# DRS Gmail to Private LINE Case Notification W1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and locally verify a Pilot backend source candidate in which
Gmail-authenticated DRS specialists bind one personal LINE notification
destination for server-authorized case assignments. Source and local-database
evidence do not establish deployment, provider operation, phone delivery, or
Pilot launch.

**Architecture:** Extend the clean A17 secure-session base with a private
Postgres state machine and thin Supabase Edge Function source. The intended
deployed flow validates the exact webhook raw body, processes official
`accountLink` events idempotently, and begins a provider request only after a
final pre-claim authority check. Current evidence is limited to source and
bounded local PostgreSQL assertions; it does not prove a deployed webhook, real
LINE provider behavior, phone delivery, or cancellation after a provider request
has started.

**Tech Stack:** TypeScript on Supabase Edge Functions/Deno, PostgreSQL 17
migrations and RPCs, Node.js built-in test runner, Web Crypto, LINE Messaging
API.

**Spec:**
`docs/superpowers/specs/2026-08-31-drs-gmail-line-private-routing-w1-design.md`

## Global Constraints

- Gmail-backed DRS authentication is the only login and authorization identity.
- LINE is a private notification destination only; it never creates a session,
  role, grant, assignment, or case authority.
- Environment is `PILOT`, restricted to the Human Owner.
- Use the existing A17 authority chain at base
  `d0571b467b0f75439a7773b300febbcfe8069cd1`.
- Do not modify A3 reviewer UI exact4, A14 LINE runtime, or
  `services/drs-line-test/**`.
- Do not read, print, persist, fixture, or commit LINE secrets, access tokens,
  encryption keys, raw nonces, raw link tokens, or real LINE user IDs.
- Browser contracts reject all extra keys and never accept specialist,
  assignment, case, role, provider, callback, or return-route authority.
- Tables are server-owned in `integration`; private functions live in
  `drs_private`, set `search_path = ''`, revoke `PUBLIC`, and grant only exact
  callers.
- The source contract requires provider-event and notification-command state to
  be durable and idempotent before an external effect begins. Current local
  evidence does not prove provider-side idempotency or cancellation of an
  already-started external request.
- Source, local database, deployed runtime, LINE provider, phone delivery, and
  production launch evidence remain separate.

---

### Task 1: Closed contracts, DTOs, and provider-safe validation

**Files:**

- Create: `supabase/functions/_shared/drs-line-account-link/contracts.ts`
- Create: `supabase/functions/_shared/drs-line-account-link/validation.ts`
- Create: `tests/drs-gmail-line-private-routing-source.test.mjs`

**Interfaces:**

- Consumes: `validateDrsAuthorityFacts`, `readExactEmptyJsonBody`,
  `jsonResponse`, and origin helpers from
  `supabase/functions/_shared/drs-auth/contracts.ts`.
- Produces:

```ts
export const LINE_LINK_STATES: readonly LineLinkState[];
export type LineLinkState =
  | "not_linked"
  | "awaiting_line_confirmation"
  | "linked"
  | "expired"
  | "cancelled"
  | "conflict_line_already_bound"
  | "conflict_drs_already_bound"
  | "permission_denied"
  | "specialist_inactive"
  | "temporarily_unavailable"
  | "unlinking"
  | "revoked";

export type LineLinkStatusDto = Readonly<{
  state: LineLinkState;
  expiresAt?: string;
  linkedAt?: string;
  revokedAt?: string;
  nextAction?: "continue_in_line" | "retry" | "unlink" | "relink";
  botLaunchUrl?: string;
}>;

export function sanitizeLineLinkStatus(input: unknown): LineLinkStatusDto;
export function readLineWebhookEnvelope(
  input: unknown,
): LineWebhookEnvelope | null;
export function readAccountLinkEvent(input: unknown): AccountLinkEvent | null;
```

- [ ] **Step 1: Write the failing source tests**

Add tests that import the wished-for modules, assert the exact twelve-state
tuple, reject prototype pollution and extra DTO keys, reject authority-shaped
browser fields, and accept only exact LINE message/account-link event envelopes.

- [ ] **Step 2: Verify causal RED**

Run:

```powershell
node --test tests/drs-gmail-line-private-routing-source.test.mjs
```

Expected: FAIL because `contracts.ts` and `validation.ts` do not exist.

- [ ] **Step 3: Implement the minimal closed contracts**

Use own-property reads, exact-key sets, bounded strings, RFC3339 checks, enum
checks, and immutable return values. Unknown status/provider fields map to
`temporarily_unavailable`; they are never copied into DTOs.

- [ ] **Step 4: Verify GREEN and regressions**

```powershell
node --test tests/drs-gmail-line-private-routing-source.test.mjs tests/drs-secure-session-runtime-source.test.mjs tests/drs-workspace-grant-authority-v2-source.test.mjs
```

Expected: all tests pass with no warnings.

- [ ] **Step 5: Commit**

```powershell
git add -- tests/drs-gmail-line-private-routing-source.test.mjs supabase/functions/_shared/drs-line-account-link/contracts.ts supabase/functions/_shared/drs-line-account-link/validation.ts
git commit -m "feat(drs): define private LINE routing contracts"
```

### Task 2: Signature, digest, encryption-envelope, and LINE client ports

**Files:**

- Create: `supabase/functions/_shared/drs-line-account-link/crypto.ts`
- Create: `supabase/functions/_shared/drs-line-account-link/signature.ts`
- Create: `supabase/functions/_shared/drs-line-account-link/line-client.ts`
- Modify: `tests/drs-gmail-line-private-routing-source.test.mjs`

**Interfaces:**

```ts
export function verifyLineSignature(
  rawBody: Uint8Array,
  signatureHeader: string | null,
  channelSecret: string,
): Promise<boolean>;

export function randomProtocolValue(bytes?: number): Uint8Array;
export function base64UrlEncode(value: Uint8Array): string;
export function hmacIdentityDigest(
  secret: string,
  value: string,
): Promise<string>;
export function encryptLineUserId(
  key: CryptoKey,
  value: string,
): Promise<Readonly<{ ciphertext: string; iv: string }>>;
export function decryptLineUserId(
  key: CryptoKey,
  envelope: Readonly<{ ciphertext: string; iv: string }>,
): Promise<string>;

export type LineClient = Readonly<{
  issueLinkToken(lineUserId: string): Promise<string>;
  replyAccountLink(
    replyToken: string,
    linkingUrl: string,
  ): Promise<Readonly<{ requestId: string | null }>>;
  pushCaseNotification(
    lineUserId: string,
    message: LineCaseNotification,
  ): Promise<Readonly<{ requestId: string | null }>>;
}>;
```

- [ ] **Step 1: Add failing cryptographic and client-boundary tests**

Cover strict canonical Base64 signature input, constant-time equality after
format validation, body-byte sensitivity, at least 128-bit protocol randomness,
deterministic keyed identity digest, AES-GCM round trip and tamper rejection,
exact LINE endpoint allowlist, bounded response bodies, and sanitized provider
errors.

- [ ] **Step 2: Verify causal RED**

```powershell
node --test tests/drs-gmail-line-private-routing-source.test.mjs
```

Expected: FAIL on missing crypto/signature/client exports.

- [ ] **Step 3: Implement minimal Web Crypto and fetch adapters**

Pin every LINE request to `https://api.line.me`; do not accept a caller-supplied
base URL. Require `response.ok`, cap response text, and expose only safe
correlation IDs and reason enums.

- [ ] **Step 4: Verify GREEN**

```powershell
node --test tests/drs-gmail-line-private-routing-source.test.mjs
```

Expected: all focused tests pass.

- [ ] **Step 5: Commit**

```powershell
git add -- tests/drs-gmail-line-private-routing-source.test.mjs supabase/functions/_shared/drs-line-account-link/crypto.ts supabase/functions/_shared/drs-line-account-link/signature.ts supabase/functions/_shared/drs-line-account-link/line-client.ts
git commit -m "feat(drs): secure LINE provider boundaries"
```

### Task 3: Durable Postgres binding, replay, outbox, and receipt authority

**Files:**

- Create with `supabase migration new drs_gmail_line_private_routing_w1`:
  `supabase/migrations/<CLI-generated>_drs_gmail_line_private_routing_w1.sql`
- Create: `supabase/tests/drs_gmail_line_private_routing_w1.test.mjs`
- Modify: `tests/drs-gmail-line-private-routing-source.test.mjs`

**Interfaces:**

Create server-owned tables:

```text
integration.drs_line_account_link_intents
integration.drs_line_account_bindings
integration.drs_line_binding_audit
integration.drs_line_webhook_events
integration.drs_line_notification_outbox
integration.drs_line_delivery_receipts
```

Create private RPCs with exact JSON contracts:

```text
drs_private.drs_line_start_link_intent_v1(jsonb) → jsonb
drs_private.drs_line_read_link_status_v1(jsonb) → jsonb
drs_private.drs_line_cancel_link_intent_v1(jsonb) → jsonb
drs_private.drs_line_prepare_nonce_v1(jsonb) → jsonb
drs_private.drs_line_complete_account_link_v1(jsonb) → jsonb
drs_private.drs_line_unlink_account_v1(jsonb) → jsonb
drs_private.drs_line_claim_webhook_v1(jsonb) → jsonb
drs_private.drs_line_complete_webhook_v1(jsonb) → jsonb
drs_private.drs_line_claim_notification_v1(jsonb) → jsonb
drs_private.drs_line_complete_notification_v1(jsonb) → jsonb
```

- [ ] **Step 1: Create the migration path with the CLI**

```powershell
supabase --version
supabase migration new drs_gmail_line_private_routing_w1
```

Record the exact returned filename in the test and subsequent Git commands.

- [ ] **Step 2: Write failing migration/source tests**

Assert forced RLS, revoked grants, `search_path = ''`, private function
ownership, exact input keys, append-only audit/receipts, one-active-binding
partial unique indexes, webhook-event uniqueness, outbox idempotency,
binding-version checks, and assignment/grant revalidation.

- [ ] **Step 3: Verify causal RED**

```powershell
node --test supabase/tests/drs_gmail_line_private_routing_w1.test.mjs tests/drs-gmail-line-private-routing-source.test.mjs
```

Expected: FAIL because the generated migration is empty and RPCs are absent.

- [ ] **Step 4: Implement the migration**

Use the existing `integration` and `drs_private` schemas. Do not expose tables
through the Data API. Use database constraints and row locks for all state
transitions; never rely on Edge Function read-then-write sequences for
uniqueness or replay safety.

- [ ] **Step 5: Verify local migration and focused tests**

```powershell
supabase --help
supabase db --help
node --test supabase/tests/drs_gmail_line_private_routing_w1.test.mjs tests/drs-gmail-line-private-routing-source.test.mjs
```

When the verified local Supabase runtime is available, reset the local database,
run the concurrency harness, then run database advisors. If unavailable, report
the real-PostgreSQL gate as blocked and do not replace it with source
assertions.

- [ ] **Step 6: Commit**

```powershell
git add -- supabase/migrations/*_drs_gmail_line_private_routing_w1.sql supabase/tests/drs_gmail_line_private_routing_w1.test.mjs tests/drs-gmail-line-private-routing-source.test.mjs
git commit -m "feat(drs): add durable private LINE routing state"
```

### Task 4: Account-link service and five browser-adjacent BFF functions

**Files:**

- Create: `supabase/functions/_shared/drs-line-account-link/ports.ts`
- Create: `supabase/functions/_shared/drs-line-account-link/service.ts`
- Create: `supabase/functions/_shared/drs-line-account-link/http.ts`
- Create: `supabase/functions/drs-line-account-link-start/index.ts`
- Create: `supabase/functions/drs-line-account-link-status/index.ts`
- Create: `supabase/functions/drs-line-account-link-cancel/index.ts`
- Create: `supabase/functions/drs-line-account-link-unlink/index.ts`
- Create: `supabase/functions/drs-line-account-link-continue/index.ts`
- Modify: `supabase/config.toml`
- Modify: `tests/drs-gmail-line-private-routing-source.test.mjs`

**Interfaces:**

```ts
export type DrsLineAccountLinkRepository = Readonly<{
  startIntent(facts: DrsSpecialistAuthorityFacts): Promise<LineLinkStatusDto>;
  readStatus(facts: DrsSpecialistAuthorityFacts): Promise<LineLinkStatusDto>;
  cancelIntent(facts: DrsSpecialistAuthorityFacts): Promise<LineLinkStatusDto>;
  prepareNonce(
    input: Readonly<
      {
        facts: DrsSpecialistAuthorityFacts;
        nonceDigest: string;
        expiresAt: string;
      }
    >,
  ): Promise<Readonly<{ accepted: boolean }>>;
  unlink(facts: DrsSpecialistAuthorityFacts): Promise<LineLinkStatusDto>;
}>;

export function createLineAccountLinkService(
  deps: LineAccountLinkDependencies,
): LineAccountLinkService;
export function createLineLinkStartHandler(
  deps?: LineAccountLinkDependencies,
): (request: Request) => Promise<Response>;
export function createLineLinkStatusHandler(
  deps?: LineAccountLinkDependencies,
): (request: Request) => Promise<Response>;
export function createLineLinkCancelHandler(
  deps?: LineAccountLinkDependencies,
): (request: Request) => Promise<Response>;
export function createLineLinkUnlinkHandler(
  deps?: LineAccountLinkDependencies,
): (request: Request) => Promise<Response>;
export function createLineLinkContinueHandler(
  deps?: LineAccountLinkDependencies,
): (request: Request) => Promise<Response>;
```

- [ ] **Step 1: Write failing handler tests**

Cover method, content type, exact empty body, CORS allowlist, Gmail session,
active specialist, server-derived authority, no extra response fields,
inactive-specialist start denial, inactive-specialist unlink ownership, and
continuation no-cache/no-referrer behavior.

- [ ] **Step 2: Verify causal RED**

```powershell
node --test tests/drs-gmail-line-private-routing-source.test.mjs
```

Expected: FAIL on missing service/handler/functions.

- [ ] **Step 3: Implement thin handlers and service**

Reuse A17 secure-session dependencies. Keep repository and provider ports
injected for tests. The five browser-adjacent BFF functions intentionally use
`verify_jwt = false` as a non-user-JWT boundary; each handler must verify the
A17 sealed session cookie and exact short-lived opaque BFF proof before
server-derived authority or provider work. Continuation must exchange protocol
input into server-held state before any redirect and must not log it.

- [ ] **Step 4: Verify GREEN and A17 regressions**

```powershell
node --test tests/drs-gmail-line-private-routing-source.test.mjs tests/drs-secure-session-runtime-source.test.mjs tests/drs-workspace-grant-authority-v2-source.test.mjs
```

- [ ] **Step 5: Commit**

```powershell
git add -- supabase/config.toml supabase/functions/_shared/drs-line-account-link/ports.ts supabase/functions/_shared/drs-line-account-link/service.ts supabase/functions/_shared/drs-line-account-link/http.ts supabase/functions/drs-line-account-link-start/index.ts supabase/functions/drs-line-account-link-status/index.ts supabase/functions/drs-line-account-link-cancel/index.ts supabase/functions/drs-line-account-link-unlink/index.ts supabase/functions/drs-line-account-link-continue/index.ts tests/drs-gmail-line-private-routing-source.test.mjs
git commit -m "feat(drs): add LINE binding BFF"
```

### Task 5: Canonical signed LINE webhook and official account-link completion

**Files:**

- Create: `supabase/functions/_shared/drs-line-account-link/webhook.ts`
- Create: `supabase/functions/drs-line-webhook/index.ts`
- Modify: `supabase/config.toml`
- Modify: `tests/drs-gmail-line-private-routing-source.test.mjs`

**Interfaces:**

```ts
export type LineWebhookRepository = Readonly<{
  claimEvent(eventId: string, eventKind: string): Promise<WebhookClaim>;
  completeEvent(eventId: string, outcome: SafeWebhookOutcome): Promise<void>;
  completeAccountLink(
    input: CompleteAccountLinkInput,
  ): Promise<LineLinkStatusDto>;
}>;

export function createLineWebhookHandler(
  deps?: LineWebhookDependencies,
): (request: Request) => Promise<Response>;
```

- [ ] **Step 1: Write failing webhook tests**

Cover exact raw-body signature verification before JSON parsing, strict Base64,
maximum body size, malformed JSON, batch event limits, message/postback binding
action, link-token issuance, signed `accountLink` success/failure, nonce replay,
`webhookEventId` redelivery, concurrent duplicate claims, and sanitized logs.

- [ ] **Step 2: Verify causal RED**

```powershell
node --test tests/drs-gmail-line-private-routing-source.test.mjs
```

- [ ] **Step 3: Implement the canonical webhook**

Set `verify_jwt = false` for `drs-line-webhook` because LINE cannot present a
Supabase user JWT; validate `X-Line-Signature` against the exact bytes before
inspecting events. Return HTTP 200 only after every admitted event has a durable
safe outcome; retryable storage failure returns a retryable non-2xx without
duplicating committed effects.

- [ ] **Step 4: Verify GREEN**

```powershell
node --test tests/drs-gmail-line-private-routing-source.test.mjs
```

- [ ] **Step 5: Commit**

```powershell
git add -- supabase/config.toml supabase/functions/_shared/drs-line-account-link/webhook.ts supabase/functions/drs-line-webhook/index.ts tests/drs-gmail-line-private-routing-source.test.mjs
git commit -m "feat(drs): consume official LINE account links"
```

### Task 6: Private case-notification outbox dispatcher and audit receipt

**Files:**

- Create: `supabase/functions/_shared/drs-line-account-link/notification.ts`
- Create: `supabase/functions/drs-line-private-notification-dispatch/index.ts`
- Modify: `supabase/config.toml`
- Modify: `supabase/tests/drs_gmail_line_private_routing_w1.test.mjs`
- Modify: `tests/drs-gmail-line-private-routing-source.test.mjs`

**Interfaces:**

```ts
export type LineCaseNotification = Readonly<{
  caseLabel: string;
  caseStatus: string;
  nextAction: string;
  caseUrl: string;
}>;

export type NotificationRepository = Readonly<{
  claimNext(): Promise<NotificationClaim | null>;
  complete(input: NotificationCompletion): Promise<void>;
}>;

export function createPrivateNotificationDispatcher(
  deps?: PrivateNotificationDependencies,
): () => Promise<DispatchResult>;
```

- [ ] **Step 1: Write failing notification tests**

Cover assignment-authorized outbox admission, exact safe message fields, binding
decryption only at send time, current binding-version assertion, pre-claim and
pre-retry suppression after unlink, assignment termination, or Gmail-backed
authority loss, bounded retry, permanent failure, idempotent receipt, one case
audit event, and no role switch through message contents. Claimed or in-flight
provider-request cancellation remains outside this harness.

- [ ] **Step 2: Verify causal RED**

```powershell
node --test supabase/tests/drs_gmail_line_private_routing_w1.test.mjs tests/drs-gmail-line-private-routing-source.test.mjs
```

- [ ] **Step 3: Implement dispatcher and service-only endpoint**

Use a service-only function authentication mode; never accept a browser case ID
or target LINE identity. Claim one outbox row under lock, lock the required
authority and LINE binding rows, refresh `clock_timestamp()` after those locks
are acquired, re-resolve every current and expiry fact, and begin the provider
request only if that final post-lock check remains current. Apply the same
post-lock time rule to enqueue and claim assertion.
`integration.drs_auth_specialist_bindings` is non-deletable audit lineage:
reject `DELETE` deterministically and use status, revocation, expiry, or version
rotation for lifecycle loss. Append the safe receipt and case audit outcome
according to the persisted result. Do not describe an already-started provider
request as cancellable by a later authority change.

- [ ] **Step 4: Verify GREEN**

```powershell
node --test supabase/tests/drs_gmail_line_private_routing_w1.test.mjs tests/drs-gmail-line-private-routing-source.test.mjs
```

- [ ] **Step 5: Commit**

```powershell
git add -- supabase/config.toml supabase/functions/_shared/drs-line-account-link/notification.ts supabase/functions/drs-line-private-notification-dispatch/index.ts supabase/tests/drs_gmail_line_private_routing_w1.test.mjs tests/drs-gmail-line-private-routing-source.test.mjs
git commit -m "feat(drs): dispatch private LINE case notifications"
```

### Task 7: Operator contract, bounded local verification, and immutable source receipt

**Files:**

- Create: `docs/drs_backend/drs_gmail_line_private_routing_w1.md`
- Modify only if source verification requires it: files already listed in Tasks
  1–6

**Interfaces:**

- Consumes: all final modules, migration, functions, and tests.
- Produces: a names-only configuration contract, exact deployment order,
  rollback/hold conditions, sanitized log allowlist, Pilot checklist, and
  immutable source receipt.

- [ ] **Step 1: Write the operator contract**

Document names only:

```text
LINE_CHANNEL_SECRET
LINE_CHANNEL_ACCESS_TOKEN
DRS_LINE_IDENTITY_HMAC_KEY
DRS_LINE_IDENTITY_ENCRYPTION_KEY
DRS_LINE_IDENTITY_ENCRYPTION_KEY_VERSION
DRS_ALLOWED_ORIGINS
DRS_PUBLIC_ORIGIN
DRS_LINE_OFFICIAL_ACCOUNT_URL
```

State that the Human enters secrets directly into Supabase encrypted secrets
after source approval. Include deploy order: migration, five browser-adjacent
BFF functions, continuation, webhook, dispatcher, health/source checks, LINE
Verify, Human-only Pilot. Include a hold if any provider, DB, or phone fact is
unproven.

- [ ] **Step 2: Run static and focused verification**

```powershell
git diff --check
node --test tests/drs-gmail-line-private-routing-source.test.mjs supabase/tests/drs_gmail_line_private_routing_w1.test.mjs tests/drs-secure-session-runtime-source.test.mjs tests/drs-workspace-grant-authority-v2-source.test.mjs
```

- [ ] **Step 3: Run TypeScript/Deno checks using discovered local commands**

```powershell
supabase --version
supabase functions --help
deno --version
```

Use the available CLI's documented local function check/serve command. If Deno
is unavailable, use the repository's established Node source checks and report
`DENO_RUNTIME_CHECK=BLOCKED`; do not claim a Deno pass.

- [ ] **Step 4: Run migration/advisor verification when local Supabase is
      available**

Use `supabase --help`, `supabase db --help`, and `supabase migration --help` to
select current commands. Run the migration list, local database reset,
real-PostgreSQL tests, and advisors. If Docker or local Supabase is unavailable,
report the exact blocked gates.

The focused real-PostgreSQL gate uses one task-scoped disposable PostgreSQL
container with the pinned local image, no network, ports, or volumes. It applies
the prerequisite migrations and LINE migration and exercises the harness-defined
bounded cases, including deterministic rejection of authorization-binding
deletion without lifecycle side effects, post-lock rejection when a wait crosses
authority expiry, and suppression of pending or retry outbox work when
Gmail-backed authority becomes stale before claim or retry. It removes the
container in `finally`. This proves only those local assertions against that
disposable PostgreSQL identity. It does not prove cancellation of a claimed or
in-flight provider request, a remote database, deployed runtime, real
Gmail/Auth, real LINE webhook or provider delivery, phone receipt, deployment,
or launch.

- [ ] **Step 5: Run secret and forbidden-scope scans**

```powershell
rg -n --hidden -g '!*.lock' -g '!node_modules/**' "(LINE_CHANNEL_SECRET|LINE_CHANNEL_ACCESS_TOKEN|service_role|sb_secret_|Bearer [A-Za-z0-9._~-]{16,})" docs supabase tests
rg -n "LINE Login|LIFF|line group|groupId|role switch|localStorage|sessionStorage|console\.(log|error|warn)" supabase/functions/_shared/drs-line-account-link supabase/functions/drs-line-* docs/drs_backend/drs_gmail_line_private_routing_w1.md
```

Review every configuration-name-only hit manually; fail on values, fixtures,
browser projection, group routing, or LINE-based authorization.

- [ ] **Step 6: Commit and record immutable identity**

```powershell
git add -- docs/drs_backend/drs_gmail_line_private_routing_w1.md
git commit -m "docs(drs): document private LINE routing operations"
git status --short
git rev-parse HEAD
git show -s --format='%T'
```

Expected: clean worktree, final HEAD/tree recorded, no
push/PR/merge/deploy/provider changes.

## Plan self-review result

- Source-plan coverage: Tasks 1–7 define source contracts and intended
  operational steps for account linking, private assignment notifications,
  receipts, audit, bounded failure handling, tests, and a future Pilot handoff.
  Current verification remains limited to the checks explicitly recorded for
  source and disposable local PostgreSQL; it is not end-to-end runtime,
  provider, delivery, or launch evidence.
- Scope: personal LINE only; no LINE Login, LIFF, password login, LINE groups,
  frontend role selection, A3 UI edits, or transport-service edits.
- Type consistency: `LineLinkState`, `LineLinkStatusDto`, authority facts,
  repository ports, notification claim/completion, and handler factory names are
  defined once and reused consistently.
- Placeholder scan: no implementation placeholder remains; the migration
  filename is intentionally created by the required Supabase CLI command and
  then used verbatim.
