# DRS Core Data/Audit W1

## Scope

This is a local machine-readable candidate for DRS core case data and audit trace behavior.
It does not apply a migration, call LINE, call AI services, deploy, or change production state.

DRS routine interaction remains LINE-first. The backend contract only accepts sent events from formally linked DRS case groups, preserves the audit chain, and records the final Human-controlled decision path.

Persisted identifiers are UUID strings. Human-readable case numbers are display/reference fields and are never primary keys.

## Contract Coverage

- Case identity: UUID `case_id`, display `case_number`, `owner_id`, `case_state`, and `opened_at`.
- Formal LINE group link: `group_link_id`, `case_id`, `line_group_id`, `group_kind`, `valid_from`, and `valid_until`, with append-only termination records for bounded supersession.
- Specialist identity: immutable `specialist_id` with non-overlapping assignment interval history and append-only termination records for open-ended assignments.
- Audit envelope: UUID `event_id`, UUID `case_id`, `event_type`, `occurred_at`, actor, source, `previous_event_id`, and payload.
- W1 timestamp contract: every machine-supplied timestamp string accepted by the JS contract must use the RFC 3339 four-digit year range `0001-9999`, explicit `Z` or `±HH:MM`, optional 1-3 fractional digits only, valid Gregorian calendar dates, finite instants, and offsets bounded to `±14:00` inclusive. Accepted envelopes are returned with `occurred_at` canonicalized to UTC using exactly 3 fractional digits (`.sssZ`), and that canonical UTC instant must itself remain inside the same four-digit year range `0001-9999`. Equivalent offsets resolve to one canonical stored/replayed instant only when the normalized UTC instant stays inside that closed range; lower or upper UTC spill is rejected fail closed as `AUDIT_EVENT_OCCURRED_AT_INVALID`. Year `0000`, timezone-less strings, numeric values, overflow dates, invalid leap dates, offsets above `14:00`, `infinity`, `NULL`, signed six-digit years, and more than 3 fractional digits are rejected fail closed.
- Event types: `LINE_SENT_EVENT`, `AI_REVIEW`, `HUMAN_DECISION`, `FINAL_MESSAGE`, `RECEIPT`, and `WORK_ITEM_TRANSITION`.
- Guarded writer boundary: audit table DML is revoked from public application roles; the only candidate append path is `public.drs_append_audit_event(...)`, a `SECURITY DEFINER` RPC owned by `postgres`, fixed to `public, pg_temp`, executable only by `service_role`, with audit-event identity and LINE provider identity serialized before replay reads/inserts so exact replay returns the persisted event id and conflicting identity, root, successor, or transport reuse is rejected by stable contract errors rather than raw unique violations.
- Trusted AI review append boundary: `AI_REVIEW` cannot be created through the generic append path. The candidate adds a dedicated trusted append path in JS and SQL that accepts the submitted snapshot body only as transient input, computes SHA-256 inside the trusted helper/RPC, persists only `submitted_snapshot_sha256` plus review metadata, rejects caller-supplied snapshot hashes as authority, and fixes trusted provenance to the immutable service identity `actor_type = ai_service`, `actor_id = drs-ai-review-service`, `source.surface = SYSTEM`. The guarded JS append path replays exact persisted AI-review events by `audit_event_id`, compares `occurred_at` by canonical UTC millisecond instant for timestamptz parity, and rejects changed body/payload/distinct-millisecond identity reuse with stable domain conflicts.
- Audit chain boundary: one verifier invocation accepts one case only, exactly one root per case, same-case predecessor only, no self-reference, at most one successor, connected same-case chain, deterministic tail derivation, and predecessor time must not be later than successor time.
- Final message boundary: `FINAL_MESSAGE` must resolve to a prior same-case `HUMAN_DECISION` by an active, non-terminated, non-suspended assigned specialist at decision time, bind to the same final snapshot SHA-256, and be sent only by the same active specialist; AI/service/system actors cannot approve or send DRS-authored outbound messages. The final snapshot hash is deterministic: SHA-256 over the exact UTF-8 `final_text`, with no hidden draft, keystroke, or intermediate body included.
- AI review provenance: `AI_REVIEW` binds to a submitted snapshot SHA-256, an existing same-case source event, the canonical service identity `drs-ai-review-service`, and `source.surface = SYSTEM`. Human decisions must reference an existing same-case AI review except `PRE_SEND_REVIEW_NOT_PERFORMED_BREAK_GLASS`, which must omit AI review and use a distinct closed `break_glass_result`. `EDIT_AND_SEND` and `OVERRIDE_AND_SEND` reject `REVIEW_SERVICE_UNAVAILABLE`; `MANUAL_EXCEPTION_SEND` accepts only a same-case unavailable review and requires trimmed non-empty reason, urgency, and service incident id. Non-break-glass decisions carry a closed `result_difference` object that binds AI submitted snapshot SHA-256, Human final snapshot SHA-256, and a boolean `content_changed` flag derived from those two hashes. Human-edited final snapshots may differ from the AI submitted snapshot, but the final-message path binds to the Human final snapshot hash and never stores drafts, keystrokes, intermediate editing text, or hidden reasoning.
- Human outbound parity: `EDIT_AND_SEND` now requires a non-empty Human reason and `result_difference.content_changed = true`, so a no-change send cannot masquerade as an edit.
- Work items: `DOCUMENT_REVIEW` and `DRAWING_REVIEW` with state, next actor, UUID requester, closed subject reference, created time, and append-only transition evidence linked to same-case `WORK_ITEM_TRANSITION` audit events. Document subject refs contain only `document_id` UUID and non-empty trimmed `version`; drawing subject refs contain only `drawing_id` UUID and non-empty trimmed `version`. Subject references are normalized before JS comparison and persisted as `jsonb` in SQL so closed semantically identical refs match regardless of property order. The transition `occurred_at` must equal the bound audit event `occurred_at`; actor, case, subject, action, existing same-case work item, and authority are checked at that single instant. Specialist transitions require the same active assigned specialist as the audit event actor; owner confirmation requires the case owner.
- Privacy guard: sent LINE events only, formal same-case linked group only, provider transport message identity required, and closed typed per-event payload schemas. LINE sent text is always a string, message kind is bounded, attachment refs are closed typed objects, AI review flags/findings are closed typed arrays, and final/receipt/work-item payloads reject unknown nested keys or private draft structures.
- Human authority: AI is advisory only; assigned DRS specialist controls outbound DRS-authored messages.

## Human Outbound Decisions

Allowed decisions:

- `EDIT_AND_SEND`
- `OVERRIDE_AND_SEND`
- `MANUAL_EXCEPTION_SEND`
- `PRE_SEND_REVIEW_NOT_PERFORMED_BREAK_GLASS`

`OVERRIDE_AND_SEND` requires a reason. Manual exception and break-glass sends require reason, urgency, and incident identity. Break-glass is a no-AI-review path: any AI review id is rejected even if the referenced review is completed or unavailable.

## AI Review Statuses

Allowed statuses:

- `REVIEW_COMPLETED_NO_FLAG`
- `REVIEW_COMPLETED_ATTENTION`
- `REVIEW_SERVICE_UNAVAILABLE`

AI review status does not send a message by itself. It records advisory review output for Human decision.

## Receipt Semantics

`TRANSPORT_ACCEPTED` means the transport accepted the final message for delivery. It does not prove recipient read status, and the local contract keeps both top-level and payload `recipient_read` false for that receipt kind. Receipts must bind to an existing same-case `FINAL_MESSAGE`, carry a non-empty transport message id, and keep `accepted_at <= ingested_at <= occurred_at`.

## SQL Candidate

The migration candidate defines:

- `public.drs_cases`
- `public.drs_specialists`
- `public.drs_case_line_group_links`
- `public.drs_case_line_group_link_terminations`
- `public.drs_case_specialist_assignments`
- `public.drs_case_specialist_assignment_terminations`
- `public.drs_case_audit_events`
- `public.drs_review_work_items`
- `public.drs_review_work_item_transitions`

It uses lowercase identifiers, UUID persisted identifiers, `timestamptz`, explicit check constraints, trigger-guarded interval overlap checks, indexes for foreign keys and common lookups, trigger guards for append-only records, RLS enabled and forced, and select policies limited to owners or currently assigned specialists.

The guarded append RPC accepts the bounded audit envelope and inserts through `public.drs_case_audit_events`, so the same insert trigger performs event-type validation before persistence. Direct audit table `INSERT`, `UPDATE`, and `DELETE` are revoked from `PUBLIC`, `anon`, `authenticated`, and `service_role`; `service_role` can execute only the guarded append RPC. The public append RPCs accept `occurred_at` as text, route both generic and trusted-AI appends through one centralized private parser, reject lexical year `0000` before `make_date` or `timestamptz` cast, validate strict RFC 3339 syntax and calendar correctness before a single `timestamptz` cast, guard the lower and upper UTC year spill boundaries for the closed four-digit canonical range `0001-9999`, and fail closed with `AUDIT_EVENT_OCCURRED_AT_INVALID` on malformed, timezone-less, `NULL`, overflow, non-finite, out-of-range-offset, out-of-range-UTC, or over-precision inputs. Equivalent offsets resolve to the same UTC millisecond instant for replay and persisted-envelope identity only when that canonical UTC instant remains parser-closed. The RPC takes deterministic transaction advisory locks on audit-event identity and LINE linked-group transport identity before replay reads and inserts. Exact event-id replay and exact LINE transport replay return the persisted event id; conflicting event-id, root, successor, or linked-group transport reuse raises a stable contract error instead of surfacing a raw unique violation. LINE transport idempotency is keyed by the formal linked group identity plus a non-blank transport message id, never by mutable payload body or arrival time.

For hashing, `drs_private.sha256_utf8(...)` no longer assumes `pgcrypto` lives on `public` or that unqualified `digest(...)` is safe. The candidate resolves the installed `pgcrypto` extension schema from `pg_extension` and `pg_namespace` under a fixed `pg_catalog, pg_temp` search path, fails closed with a stable missing-extension error, and then calls the schema-qualified `digest` helper.

Assignment-dependent policies use `drs_private.is_current_actor_active_case_specialist(...)`, a non-public `SECURITY DEFINER` fixed-search-path helper that binds membership to `auth.uid()` internally. Historical authority checks remain private to triggers and are not granted to authenticated callers, so forced RLS does not make the policy silently lose its own assignment lookup or expose arbitrary membership queries. The local candidate pins each `SECURITY DEFINER` helper to owner `postgres` and revokes PUBLIC/anon/authenticated access except the minimum authenticated policy helper grant.

Termination records are append-only. The SQL candidate serializes event insertion and termination insertion on the same group-link or assignment identity, reads effective link/assignment intervals under the identity lock, rejects non-finite audit timestamps, and rejects backdated terminations that would retroactively invalidate already accepted LINE, Human decision, final-message, or work-item transition evidence. Specialist work-item audit admission and transition mutation take the assignment identity lock before re-reading authority at the single evidence time.

## Known Gaps

- The SQL is a local candidate only and has not been applied to a database.
- The SQL source contract now mirrors the lexical `0001-9999` profile and the UTC lower/upper spill guard, but live PostgreSQL execution around the exact `0001`/`9999` boundaries, RLS execution, trigger owner semantics, and lock behavior remain static-source assumptions until a separately authorized local PostgreSQL harness proves them live.
- RLS policies are candidate policy shape only; no live Auth claims, roles, forced-RLS behavior, `SECURITY DEFINER` owner runtime behavior, trigger owner execution, two-session lock ordering, concurrency, or database session have been verified.
- No LINE transport, AI service, UI, route manifest, deployment, push, PR, or production integration is included.
- Canonical admission is false until the Commander integrates and accepts this local/static candidate.
