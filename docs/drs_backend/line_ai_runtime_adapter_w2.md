# DRS LINE + AI runtime adapter W2

Status: local source-ready candidate only.

This adapter wraps the frozen W1 DRS LINE group + AI/Human review contract with
dependency-injected runtime ports. It does not mount a route, apply a migration,
call live LINE, call live OpenAI, write production data, or claim canonical
admission.

## Runtime boundaries

- LINE webhook handling receives raw body bytes/text plus headers from an
  external route. Signature verification is performed before JSON parsing,
  destination checks, repository writes, or content retrieval.
- Only `source.type = "group"` message events are eligible. Room, user,
  member-only, bot lifecycle and unsupported event types are acknowledged safely
  without case records in this W2 adapter.
- Inbound acceptance is delegated to an injected formal-link repository. The
  adapter does not infer case, group authority, route, role or document identity
  from LINE profile, text, filename or message ID.
- The formal-link result must echo the signed LINE group identity. A mismatch
  between resolved `lineGroupId` and the webhook `source.groupId` is denied
  before event claim, attachment staging, or receipt recording.
- LINE message ID and webhook event ID are provider provenance and dedupe inputs
  only.
- Provider event dedupe is not a permanent pre-write claim. The injected
  repository must expose a bounded processing lease:
  `claimLineEventForProcessing` owns one in-flight provider event,
  `recordInboundSentMessage` receives the current lease token/expiry and must
  atomically persist the case receipt and committed provider claim under that
  lease, and `releaseLineEventClaim` releases expired-lease or transient
  attachment/record failures for LINE redelivery. Already committed events
  remain duplicate-safe, and same event identity with different fingerprint
  remains collision-safe.
- Owner and Vendor sent messages are stored unchanged. They are not rewritten,
  blocked, approved, or subjected to DRS outbound AI pre-send policy.
- Attachment handling is fail-closed: content must be retrieved through an
  injected content client, MIME and 10 MB bounds must pass, SHA-256 is computed
  before repository staging, and receipt recording occurs only after staging
  succeeds.

## OpenAI advisory boundary

- The OpenAI Responses adapter is injectable and uses mock fetch in W2 tests.
- Missing API key/model, timeout, 429, 5xx, malformed JSON, and transport errors
  normalize to `REVIEW_SERVICE_UNAVAILABLE` with safe service error codes.
- Successful advisory output is mapped only to:
  - `REVIEW_COMPLETED_NO_FLAG`
  - `REVIEW_COMPLETED_ATTENTION`
  - `REVIEW_SERVICE_UNAVAILABLE`
- The adapter sends only the explicit specialist-submitted snapshot text. It
  does not store or expose hidden chain-of-thought, and it does not let AI
  approve or send.
- API keys and provider error bodies are not returned through logs or persisted
  runtime result objects.

## Human final-send and LINE push boundary

- Human specialist finalization continues through W1 `finalizeDrsGroupSend`;
  assignment, auth subject, review status, decision metadata and final snapshot
  binding remain W1 authority.
- Group send dispatch revalidates group send authority through the injected
  repository immediately before push.
- `buildLinePushRequest` resolves immutable W1 final deliverable bytes. The
  dispatcher sends that exact request through injected fetch with the W1 retry
  key.
- Transport acceptance and recipient read are separate. W2 records
  `recipientReadConfirmed = false` and never claims recipient read/confirmation.
- 429, 5xx, timeout and transport exceptions are retryable/rate-limited
  outcomes, not successful delivery.

## External holds

- No A0 UI, shared route, route manifest, runtime route mount, webhook URL, Rich
  Menu, LINE Manager operation, provider row, private bucket, secret setting,
  migration apply, Edge deployment, live PostgreSQL/Supabase, live LINE, live
  OpenAI, production E2E, push, PR or merge is included.
- Credentialed verification remains a future gate. W2 proves local runtime
  adapter behavior with mock transports and network-denied tests only.

## Official references used

- LINE webhook signature verification:
  https://developers.line.biz/en/docs/messaging-api/verify-webhook-signature/
- LINE Messaging API webhook event reference:
  https://developers.line.biz/en/reference/messaging-api/nojs/
- LINE retry key behavior:
  https://developers.line.biz/en/docs/messaging-api/retrying-api-request/
- LINE webhook redelivery:
  https://developers.line.biz/en/docs/messaging-api/receiving-messages/
- OpenAI Responses API reference:
  https://developers.openai.com/api/reference/cli/resources/responses/methods/create
- OpenAI production key handling guidance:
  https://developers.openai.com/api/docs/guides/production-best-practices
