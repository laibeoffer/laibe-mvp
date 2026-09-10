begin;

do $preimage$
begin
  if to_regclass('casework.cases') is null
    or to_regclass('casework.case_events') is null
    or to_regclass('drs_forward_private.document_reviews') is null
    or to_regprocedure(
      'drs_forward_private.drs_auth_session_lock_v1(uuid,uuid)'
    ) is null
    or to_regprocedure(
      'drs_forward_private.drs_password_authority_resolve_locked_v1(uuid,uuid,text)'
    ) is null
    or to_regprocedure('public.owner_workspace_grant_v1(uuid)') is null
    or to_regprocedure(
      'public.drs_auth_bound_server_session_verify_v1(uuid,text,uuid,uuid,text)'
    ) is null
  then
    raise exception 'DRS_LINE_CASE_GROUP_REVIEW_DISPATCH_PREREQUISITE_MISSING';
  end if;
  if to_regclass('integration.drs_line_case_group_binding_intents') is not null
    or to_regclass('integration.drs_line_case_group_bindings') is not null
    or to_regclass('integration.drs_line_case_group_webhook_events') is not null
    or to_regclass('integration.drs_line_review_notification_outbox') is not null
    or to_regclass('integration.drs_line_review_delivery_receipts') is not null
    or to_regclass('integration.drs_line_case_audit_events') is not null
  then
    raise exception 'DRS_LINE_CASE_GROUP_REVIEW_DISPATCH_ALREADY_EXISTS';
  end if;
end;
$preimage$;

create function integration.drs_line_utf16_length_v1(p_value text)
returns integer
language plpgsql
immutable
strict
parallel safe
set search_path = ''
as $function$
declare
  v_index integer;
  v_units integer := 0;
begin
  if p_value = '' then
    return 0;
  end if;
  if pg_catalog.octet_length(p_value) > 20000 then
    return 5001;
  end if;
  for v_index in 1..pg_catalog.char_length(p_value) loop
    v_units := v_units + case
      when pg_catalog.ascii(pg_catalog.substr(p_value, v_index, 1)) > 65535
        then 2
      else 1
    end;
    if v_units > 5000 then
      return v_units;
    end if;
  end loop;
  return v_units;
end;
$function$;

alter function integration.drs_line_utf16_length_v1(text) owner to postgres;
revoke all on function integration.drs_line_utf16_length_v1(text)
  from public, anon, authenticated, service_role;

create table integration.drs_line_case_group_binding_intents (
  intent_id uuid primary key default extensions.gen_random_uuid(),
  case_id uuid not null references casework.cases(id) on delete restrict,
  owner_user_id uuid not null references auth.users(id) on delete restrict,
  auth_session_id uuid not null,
  provider_channel_digest text not null check (
    provider_channel_digest ~ '^[A-Za-z0-9_-]{43}$'
  ),
  challenge_digest text not null unique check (
    challenge_digest ~ '^[A-Za-z0-9_-]{43}$'
  ),
  intent_state text not null default 'pending' check (
    intent_state in ('pending','consumed','cancelled','expired')
  ),
  expires_at timestamptz not null check (isfinite(expires_at)),
  consumed_at timestamptz check (consumed_at is null or isfinite(consumed_at)),
  created_at timestamptz not null default clock_timestamp()
    check (isfinite(created_at)),
  updated_at timestamptz not null default clock_timestamp()
    check (isfinite(updated_at)),
  check (expires_at > created_at and expires_at <= created_at + interval '10 minutes'),
  check (
    (intent_state = 'pending' and consumed_at is null)
    or (intent_state <> 'pending' and consumed_at is not null)
  )
);

create unique index drs_line_case_group_intents_one_pending_case
  on integration.drs_line_case_group_binding_intents(
    case_id, provider_channel_digest
  ) where intent_state = 'pending';

create table integration.drs_line_case_group_bindings (
  binding_id uuid primary key default extensions.gen_random_uuid(),
  binding_version bigint generated always as identity unique,
  case_id uuid not null references casework.cases(id) on delete restrict,
  provider_channel_digest text not null check (
    provider_channel_digest ~ '^[A-Za-z0-9_-]{43}$'
  ),
  line_group_digest text not null check (
    line_group_digest ~ '^[A-Za-z0-9_-]{43}$'
  ),
  line_group_ciphertext text not null check (
    pg_catalog.length(line_group_ciphertext) between 24 and 256
    and line_group_ciphertext ~ '^[A-Za-z0-9_-]+$'
  ),
  line_group_iv text not null check (line_group_iv ~ '^[A-Za-z0-9_-]{16}$'),
  encryption_key_version text not null check (
    encryption_key_version ~ '^[A-Za-z0-9._-]{1,64}$'
  ),
  binding_state text not null default 'active' check (
    binding_state in ('active','revoked')
  ),
  bound_by_owner_user_id uuid not null references auth.users(id) on delete restrict,
  bound_by_line_user_digest text check (
    bound_by_line_user_digest is null
    or bound_by_line_user_digest ~ '^[A-Za-z0-9_-]{43}$'
  ),
  source_intent_id uuid not null unique references
    integration.drs_line_case_group_binding_intents(intent_id) on delete restrict,
  source_webhook_event_digest text not null unique check (
    source_webhook_event_digest ~ '^[A-Za-z0-9_-]{43}$'
  ),
  bound_at timestamptz not null default clock_timestamp()
    check (isfinite(bound_at)),
  revoked_at timestamptz check (revoked_at is null or isfinite(revoked_at)),
  revocation_reason text,
  check (
    (binding_state = 'active' and revoked_at is null and revocation_reason is null)
    or (
      binding_state = 'revoked' and revoked_at is not null
      and btrim(coalesce(revocation_reason,'')) <> ''
    )
  )
);

create unique index drs_line_case_group_bindings_one_active_case
  on integration.drs_line_case_group_bindings(case_id, provider_channel_digest)
  where binding_state = 'active';
create unique index drs_line_case_group_bindings_one_active_group
  on integration.drs_line_case_group_bindings(
    provider_channel_digest, line_group_digest
  ) where binding_state = 'active';

create table integration.drs_line_case_group_webhook_events (
  webhook_record_id uuid primary key default extensions.gen_random_uuid(),
  webhook_event_digest text not null check (
    webhook_event_digest ~ '^[A-Za-z0-9_-]{43}$'
  ),
  provider_channel_digest text not null check (
    provider_channel_digest ~ '^[A-Za-z0-9_-]{43}$'
  ),
  challenge_digest text not null check (
    challenge_digest ~ '^[A-Za-z0-9_-]{43}$'
  ),
  line_group_digest text not null check (
    line_group_digest ~ '^[A-Za-z0-9_-]{43}$'
  ),
  processing_state text not null check (
    processing_state in ('received','bound','ignored')
  ),
  reason_code text not null check (
    reason_code = btrim(reason_code) and length(reason_code) between 1 and 64
  ),
  provider_timestamp_ms bigint not null check (provider_timestamp_ms >= 0),
  is_redelivery boolean not null,
  received_at timestamptz not null default clock_timestamp()
    check (isfinite(received_at)),
  processed_at timestamptz check (processed_at is null or isfinite(processed_at)),
  constraint drs_line_case_group_webhook_event_unique
    unique (webhook_event_digest)
);

create table integration.drs_line_review_notification_outbox (
  outbox_id uuid primary key default extensions.gen_random_uuid(),
  case_id uuid not null references casework.cases(id) on delete restrict,
  review_event_id uuid not null,
  reviewer_user_id uuid not null references auth.users(id) on delete restrict,
  binding_id uuid not null references
    integration.drs_line_case_group_bindings(binding_id) on delete restrict,
  binding_version bigint not null,
  provider_channel_digest text not null check (
    provider_channel_digest ~ '^[A-Za-z0-9_-]{43}$'
  ),
  review_payload_sha256 text not null check (
    review_payload_sha256 ~ '^[a-f0-9]{64}$'
  ),
  message_text text not null check (
    message_text = btrim(message_text)
    and integration.drs_line_utf16_length_v1(message_text) between 1 and 5000
    and translate(message_text, E'\t\n\r', '') !~ '[[:cntrl:]]'
  ),
  delivery_state text not null default 'pending' check (
    delivery_state in ('pending','dispatching','retry','sent','failed','suppressed')
  ),
  retry_key uuid not null unique default extensions.gen_random_uuid(),
  attempt_count integer not null default 0 check (attempt_count between 0 and 20),
  next_attempt_at timestamptz not null default clock_timestamp()
    check (isfinite(next_attempt_at)),
  claim_token uuid,
  claimed_at timestamptz check (claimed_at is null or isfinite(claimed_at)),
  provider_request_id text,
  provider_accepted_request_id text,
  provider_message_id text,
  created_at timestamptz not null default clock_timestamp()
    check (isfinite(created_at)),
  sent_at timestamptz check (sent_at is null or isfinite(sent_at)),
  completed_at timestamptz check (completed_at is null or isfinite(completed_at)),
  foreign key (review_event_id)
    references casework.case_events(id) on delete restrict,
  unique (review_event_id, binding_id, binding_version),
  check (
    (delivery_state = 'dispatching' and claim_token is not null and claimed_at is not null)
    or (delivery_state <> 'dispatching')
  )
);

create index drs_line_review_outbox_dispatch_idx
  on integration.drs_line_review_notification_outbox(
    delivery_state, next_attempt_at, created_at
  );

create table integration.drs_line_review_delivery_receipts (
  receipt_id uuid primary key default extensions.gen_random_uuid(),
  outbox_id uuid not null references
    integration.drs_line_review_notification_outbox(outbox_id) on delete restrict,
  outcome text not null check (
    outcome in ('accepted','retry','permanent_failure')
  ),
  provider_request_id text,
  provider_accepted_request_id text,
  provider_message_id text,
  provider_status_class text not null check (
    provider_status_class in ('2xx','4xx','5xx','none')
  ),
  reason_code text not null check (
    reason_code = btrim(reason_code) and length(reason_code) between 1 and 64
  ),
  duration_ms integer not null check (duration_ms between 0 and 120000),
  occurred_at timestamptz not null default clock_timestamp()
    check (isfinite(occurred_at)),
  check (
    outcome <> 'accepted'
    or provider_request_id is not null
    or provider_accepted_request_id is not null
    or provider_message_id is not null
  )
);

create index drs_line_review_receipts_outbox_idx
  on integration.drs_line_review_delivery_receipts(outbox_id, occurred_at);

create table integration.drs_line_case_audit_events (
  audit_event_id uuid primary key default extensions.gen_random_uuid(),
  case_id uuid not null references casework.cases(id) on delete restrict,
  actor_user_id uuid references auth.users(id) on delete restrict,
  actor_role text not null check (actor_role in ('owner','drs','system')),
  event_type text not null check (
    event_type in (
      'LINE_CASE_GROUP_BOUND',
      'LINE_REVIEW_NOTIFICATION_ENQUEUED',
      'LINE_REVIEW_NOTIFICATION_SENT',
      'LINE_REVIEW_NOTIFICATION_RETRY',
      'LINE_REVIEW_NOTIFICATION_FAILED',
      'LINE_REVIEW_NOTIFICATION_SUPPRESSED'
    )
  ),
  source_ref uuid not null,
  idempotency_key text not null unique check (
    length(idempotency_key) between 16 and 128
    and idempotency_key !~ '[[:space:][:cntrl:]]'
  ),
  payload_sha256 text not null check (payload_sha256 ~ '^[a-f0-9]{64}$'),
  current_status text not null check (
    current_status = btrim(current_status)
    and length(current_status) between 1 and 64
  ),
  next_actor text not null check (next_actor in ('owner','vendor','drs','system')),
  occurred_at timestamptz not null default clock_timestamp()
    check (isfinite(occurred_at))
);

create function integration.drs_line_case_append_only_v1()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $function$
begin
  raise exception 'DRS_LINE_CASE_APPEND_ONLY';
end;
$function$;

alter function integration.drs_line_case_append_only_v1() owner to postgres;
revoke all on function integration.drs_line_case_append_only_v1()
  from public, anon, authenticated, service_role;

create trigger drs_line_review_delivery_receipts_append_only
before update or delete on integration.drs_line_review_delivery_receipts
for each row execute function integration.drs_line_case_append_only_v1();

create trigger drs_line_case_audit_events_append_only
before update or delete on integration.drs_line_case_audit_events
for each row execute function integration.drs_line_case_append_only_v1();

alter table integration.drs_line_case_group_binding_intents owner to postgres;
alter table integration.drs_line_case_group_binding_intents enable row level security;
alter table integration.drs_line_case_group_binding_intents force row level security;
create policy drs_line_case_group_binding_intents_deny_all
  on integration.drs_line_case_group_binding_intents
  for all to public using (false) with check (false);
revoke all on table integration.drs_line_case_group_binding_intents
  from public, anon, authenticated, service_role;

alter table integration.drs_line_case_group_bindings owner to postgres;
alter table integration.drs_line_case_group_bindings enable row level security;
alter table integration.drs_line_case_group_bindings force row level security;
create policy drs_line_case_group_bindings_deny_all
  on integration.drs_line_case_group_bindings
  for all to public using (false) with check (false);
revoke all on table integration.drs_line_case_group_bindings
  from public, anon, authenticated, service_role;

alter table integration.drs_line_case_group_webhook_events owner to postgres;
alter table integration.drs_line_case_group_webhook_events enable row level security;
alter table integration.drs_line_case_group_webhook_events force row level security;
create policy drs_line_case_group_webhook_events_deny_all
  on integration.drs_line_case_group_webhook_events
  for all to public using (false) with check (false);
revoke all on table integration.drs_line_case_group_webhook_events
  from public, anon, authenticated, service_role;

alter table integration.drs_line_review_notification_outbox owner to postgres;
alter table integration.drs_line_review_notification_outbox enable row level security;
alter table integration.drs_line_review_notification_outbox force row level security;
create policy drs_line_review_notification_outbox_deny_all
  on integration.drs_line_review_notification_outbox
  for all to public using (false) with check (false);
revoke all on table integration.drs_line_review_notification_outbox
  from public, anon, authenticated, service_role;

alter table integration.drs_line_review_delivery_receipts owner to postgres;
alter table integration.drs_line_review_delivery_receipts enable row level security;
alter table integration.drs_line_review_delivery_receipts force row level security;
create policy drs_line_review_delivery_receipts_deny_all
  on integration.drs_line_review_delivery_receipts
  for all to public using (false) with check (false);
revoke all on table integration.drs_line_review_delivery_receipts
  from public, anon, authenticated, service_role;

alter table integration.drs_line_case_audit_events owner to postgres;
alter table integration.drs_line_case_audit_events enable row level security;
alter table integration.drs_line_case_audit_events force row level security;
create policy drs_line_case_audit_events_deny_all
  on integration.drs_line_case_audit_events
  for all to public using (false) with check (false);
revoke all on table integration.drs_line_case_audit_events
  from public, anon, authenticated, service_role;

create function public.drs_line_case_group_binding_start_v1(p_input jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_now timestamptz := clock_timestamp();
  v_user_id uuid;
  v_session_id uuid;
  v_expires_at timestamptz;
  v_grant jsonb;
  v_case_id uuid;
  v_intent_id uuid;
begin
  if current_setting('role', true) is distinct from 'service_role' then
    raise insufficient_privilege;
  end if;
  if p_input is null or jsonb_typeof(p_input) <> 'object'
    or not p_input ?& array[
      'authenticated_user_id','auth_session_id','provider_channel_digest',
      'challenge_digest','expires_at'
    ]
    or exists (
      select 1 from jsonb_object_keys(p_input) key_name
      where key_name <> all(array[
        'authenticated_user_id','auth_session_id','provider_channel_digest',
        'challenge_digest','expires_at'
      ])
    )
    or coalesce(p_input ->> 'authenticated_user_id','') !~
      '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
    or coalesce(p_input ->> 'auth_session_id','') !~
      '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
    or coalesce(p_input ->> 'provider_channel_digest','') !~ '^[A-Za-z0-9_-]{43}$'
    or coalesce(p_input ->> 'challenge_digest','') !~ '^[A-Za-z0-9_-]{43}$'
  then
    return jsonb_build_object('ok', false, 'state', 'INVALID_REQUEST');
  end if;
  v_user_id := (p_input ->> 'authenticated_user_id')::uuid;
  v_session_id := (p_input ->> 'auth_session_id')::uuid;
  v_expires_at := (p_input ->> 'expires_at')::timestamptz;
  if not isfinite(v_expires_at) or v_expires_at <= v_now
    or v_expires_at > v_now + interval '10 minutes'
    or not drs_forward_private.drs_auth_session_lock_v1(v_user_id, v_session_id)
  then
    return jsonb_build_object('ok', false, 'state', 'CASE_NOT_AUTHORIZED');
  end if;
  v_grant := public.owner_workspace_grant_v1(v_user_id);
  if v_grant -> 'authorized' is distinct from 'true'::jsonb
    or v_grant ->> 'account_role' <> 'owner'
    or coalesce(v_grant ->> 'case_id','') !~
      '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  then
    return jsonb_build_object('ok', false, 'state', 'CASE_NOT_AUTHORIZED');
  end if;
  v_case_id := (v_grant ->> 'case_id')::uuid;
  update integration.drs_line_case_group_binding_intents
  set intent_state = 'cancelled', consumed_at = v_now, updated_at = v_now
  where case_id = v_case_id
    and provider_channel_digest = p_input ->> 'provider_channel_digest'
    and intent_state = 'pending';
  insert into integration.drs_line_case_group_binding_intents(
    case_id, owner_user_id, auth_session_id, provider_channel_digest,
    challenge_digest, expires_at
  ) values (
    v_case_id, v_user_id, v_session_id,
    p_input ->> 'provider_channel_digest',
    p_input ->> 'challenge_digest', v_expires_at
  ) returning intent_id into v_intent_id;
  return jsonb_build_object(
    'ok', true, 'state', 'AWAITING_LINE_GROUP',
    'intent_id', v_intent_id::text, 'case_id', v_case_id::text,
    'expires_at', to_char(v_expires_at at time zone 'UTC',
      'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
  );
exception
  when insufficient_privilege then raise;
  when unique_violation then
    return jsonb_build_object('ok', false, 'state', 'CONTEXT_UNAVAILABLE');
  when others then
    return jsonb_build_object('ok', false, 'state', 'CONTEXT_UNAVAILABLE');
end;
$function$;

create function public.drs_line_case_group_bind_from_webhook_v1(p_input jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_now timestamptz := clock_timestamp();
  v_intent integration.drs_line_case_group_binding_intents%rowtype;
  v_binding integration.drs_line_case_group_bindings%rowtype;
  v_existing_webhook integration.drs_line_case_group_webhook_events%rowtype;
  v_grant jsonb;
  v_webhook_id uuid;
begin
  if current_setting('role', true) is distinct from 'service_role' then
    raise insufficient_privilege;
  end if;
  if p_input is null or jsonb_typeof(p_input) <> 'object'
    or not p_input ?& array[
      'provider_channel_digest','webhook_event_digest','challenge_digest',
      'line_group_digest','line_group_ciphertext','line_group_iv',
      'line_user_digest','encryption_key_version','provider_timestamp_ms',
      'is_redelivery'
    ]
    or exists (
      select 1 from jsonb_object_keys(p_input) key_name
      where key_name <> all(array[
        'provider_channel_digest','webhook_event_digest','challenge_digest',
        'line_group_digest','line_group_ciphertext','line_group_iv',
        'line_user_digest','encryption_key_version','provider_timestamp_ms',
        'is_redelivery'
      ])
    )
    or coalesce(p_input ->> 'provider_channel_digest','') !~ '^[A-Za-z0-9_-]{43}$'
    or coalesce(p_input ->> 'webhook_event_digest','') !~ '^[A-Za-z0-9_-]{43}$'
    or coalesce(p_input ->> 'challenge_digest','') !~ '^[A-Za-z0-9_-]{43}$'
    or coalesce(p_input ->> 'line_group_digest','') !~ '^[A-Za-z0-9_-]{43}$'
    or pg_catalog.length(coalesce(p_input ->> 'line_group_ciphertext',''))
      not between 24 and 256
    or coalesce(p_input ->> 'line_group_ciphertext','') !~ '^[A-Za-z0-9_-]+$'
    or coalesce(p_input ->> 'line_group_iv','') !~ '^[A-Za-z0-9_-]{16}$'
    or coalesce(p_input ->> 'encryption_key_version','') !~ '^[A-Za-z0-9._-]{1,64}$'
    or jsonb_typeof(p_input -> 'provider_timestamp_ms') <> 'number'
    or jsonb_typeof(p_input -> 'is_redelivery') <> 'boolean'
    or (
      p_input -> 'line_user_digest' <> 'null'::jsonb
      and coalesce(p_input ->> 'line_user_digest','') !~ '^[A-Za-z0-9_-]{43}$'
    )
  then
    return jsonb_build_object('ok', false, 'state', 'INVALID_REQUEST');
  end if;
  insert into integration.drs_line_case_group_webhook_events(
    webhook_event_digest, provider_channel_digest, challenge_digest,
    line_group_digest,
    processing_state, reason_code, provider_timestamp_ms, is_redelivery
  ) values (
    p_input ->> 'webhook_event_digest', p_input ->> 'provider_channel_digest',
    p_input ->> 'challenge_digest', p_input ->> 'line_group_digest',
    'received', 'RECEIVED',
    (p_input ->> 'provider_timestamp_ms')::bigint,
    (p_input ->> 'is_redelivery')::boolean
  ) on conflict (webhook_event_digest) do nothing
  returning webhook_record_id into v_webhook_id;
  if v_webhook_id is null then
    select * into v_existing_webhook
    from integration.drs_line_case_group_webhook_events
    where webhook_event_digest = p_input ->> 'webhook_event_digest';
    if found
      and v_existing_webhook.provider_channel_digest =
        p_input ->> 'provider_channel_digest'
      and v_existing_webhook.challenge_digest = p_input ->> 'challenge_digest'
      and v_existing_webhook.line_group_digest = p_input ->> 'line_group_digest'
    then
      return jsonb_build_object('ok', true, 'state', 'REDELIVERED');
    end if;
    return jsonb_build_object('ok', true, 'state', 'IGNORED');
  end if;

  select * into v_intent
  from integration.drs_line_case_group_binding_intents
  where provider_channel_digest = p_input ->> 'provider_channel_digest'
    and challenge_digest = p_input ->> 'challenge_digest'
    and intent_state = 'pending'
    and expires_at > v_now
  for update;
  if not found then
    update integration.drs_line_case_group_webhook_events
    set processing_state = 'ignored', reason_code = 'NO_ACTIVE_INTENT',
      processed_at = v_now
    where webhook_record_id = v_webhook_id;
    return jsonb_build_object('ok', true, 'state', 'IGNORED');
  end if;

  if not drs_forward_private.drs_auth_session_lock_v1(
    v_intent.owner_user_id, v_intent.auth_session_id
  ) then
    update integration.drs_line_case_group_binding_intents
    set intent_state = 'cancelled', consumed_at = v_now, updated_at = v_now
    where intent_id = v_intent.intent_id;
    update integration.drs_line_case_group_webhook_events
    set processing_state = 'ignored', reason_code = 'OWNER_SESSION_REVOKED',
      processed_at = v_now
    where webhook_record_id = v_webhook_id;
    return jsonb_build_object('ok', true, 'state', 'IGNORED');
  end if;
  v_grant := public.owner_workspace_grant_v1(v_intent.owner_user_id);
  if v_grant ->> 'state' = 'CONTEXT_UNAVAILABLE' then
    delete from integration.drs_line_case_group_webhook_events
    where webhook_record_id = v_webhook_id;
    return jsonb_build_object('ok', false, 'state', 'CONTEXT_UNAVAILABLE');
  end if;
  if v_grant -> 'authorized' is distinct from 'true'::jsonb
    or v_grant ->> 'account_role' is distinct from 'owner'
    or v_grant ->> 'case_id' is distinct from v_intent.case_id::text
  then
    update integration.drs_line_case_group_binding_intents
    set intent_state = 'cancelled', consumed_at = v_now, updated_at = v_now
    where intent_id = v_intent.intent_id;
    update integration.drs_line_case_group_webhook_events
    set processing_state = 'ignored', reason_code = 'OWNER_AUTHORITY_REVOKED',
      processed_at = v_now
    where webhook_record_id = v_webhook_id;
    return jsonb_build_object('ok', true, 'state', 'IGNORED');
  end if;

  select * into v_binding
  from integration.drs_line_case_group_bindings
  where binding_state = 'active'
    and provider_channel_digest = p_input ->> 'provider_channel_digest'
    and (
      case_id = v_intent.case_id
      or line_group_digest = p_input ->> 'line_group_digest'
    )
  for update;
  if found and (
    v_binding.case_id <> v_intent.case_id
    or v_binding.line_group_digest <> p_input ->> 'line_group_digest'
  ) then
    update integration.drs_line_case_group_webhook_events
    set processing_state = 'ignored', reason_code = 'BINDING_CONFLICT',
      processed_at = v_now
    where webhook_record_id = v_webhook_id;
    return jsonb_build_object('ok', true, 'state', 'IGNORED');
  end if;

  if not found then
    insert into integration.drs_line_case_group_bindings(
      case_id, provider_channel_digest, line_group_digest,
      line_group_ciphertext, line_group_iv, encryption_key_version,
      bound_by_owner_user_id, bound_by_line_user_digest,
      source_intent_id, source_webhook_event_digest
    ) values (
      v_intent.case_id, p_input ->> 'provider_channel_digest',
      p_input ->> 'line_group_digest', p_input ->> 'line_group_ciphertext',
      p_input ->> 'line_group_iv', p_input ->> 'encryption_key_version',
      v_intent.owner_user_id, nullif(p_input ->> 'line_user_digest',''),
      v_intent.intent_id, p_input ->> 'webhook_event_digest'
    ) returning * into v_binding;
    insert into integration.drs_line_case_audit_events(
      case_id, actor_user_id, actor_role, event_type, source_ref,
      idempotency_key, payload_sha256, current_status, next_actor
    ) values (
      v_intent.case_id, v_intent.owner_user_id, 'owner',
      'LINE_CASE_GROUP_BOUND', v_binding.binding_id,
      'line-group-bound:' || v_binding.binding_id::text,
      encode(extensions.digest(convert_to(
        v_binding.binding_id::text || ':' || v_binding.binding_version::text,
        'UTF8'), 'sha256'), 'hex'),
      'active', 'drs'
    );
  end if;
  update integration.drs_line_case_group_binding_intents
  set intent_state = 'consumed', consumed_at = v_now, updated_at = v_now
  where intent_id = v_intent.intent_id;
  update integration.drs_line_case_group_webhook_events
  set processing_state = 'bound', reason_code = 'BOUND', processed_at = v_now
  where webhook_record_id = v_webhook_id;
  return jsonb_build_object(
    'ok', true, 'state', 'BOUND', 'binding_id', v_binding.binding_id::text,
    'case_id', v_binding.case_id::text
  );
exception
  when insufficient_privilege then raise;
  when others then
    return jsonb_build_object('ok', false, 'state', 'CONTEXT_UNAVAILABLE');
end;
$function$;

create function public.drs_line_review_notification_enqueue_v1(p_input jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_user_id uuid;
  v_session_id uuid;
  v_server_session_id uuid;
  v_review_event_id uuid;
  v_verified jsonb;
  v_event casework.case_events%rowtype;
  v_review drs_forward_private.document_reviews%rowtype;
  v_binding integration.drs_line_case_group_bindings%rowtype;
  v_outbox integration.drs_line_review_notification_outbox%rowtype;
  v_inserted boolean := false;
  v_message text;
begin
  if current_setting('role', true) is distinct from 'service_role' then
    raise insufficient_privilege;
  end if;
  if p_input is null or jsonb_typeof(p_input) <> 'object'
    or not p_input ?& array[
      'server_session_id','access_token_digest','authenticated_user_id',
      'auth_session_id','auth_token_digest','review_event_id',
      'provider_channel_digest'
    ]
    or exists (
      select 1 from jsonb_object_keys(p_input) key_name
      where key_name <> all(array[
        'server_session_id','access_token_digest','authenticated_user_id',
        'auth_session_id','auth_token_digest','review_event_id',
        'provider_channel_digest'
      ])
    )
    or coalesce(p_input ->> 'server_session_id','') !~
      '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
    or coalesce(p_input ->> 'access_token_digest','') !~ '^[A-Za-z0-9_-]{43}$'
    or coalesce(p_input ->> 'authenticated_user_id','') !~
      '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
    or coalesce(p_input ->> 'auth_session_id','') !~
      '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
    or coalesce(p_input ->> 'auth_token_digest','') !~ '^[A-Za-z0-9_-]{43}$'
    or coalesce(p_input ->> 'review_event_id','') !~
      '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
    or coalesce(p_input ->> 'provider_channel_digest','') !~ '^[A-Za-z0-9_-]{43}$'
  then
    return jsonb_build_object('ok', false, 'state', 'INVALID_REQUEST');
  end if;
  v_server_session_id := (p_input ->> 'server_session_id')::uuid;
  v_user_id := (p_input ->> 'authenticated_user_id')::uuid;
  v_session_id := (p_input ->> 'auth_session_id')::uuid;
  v_review_event_id := (p_input ->> 'review_event_id')::uuid;
  v_verified := public.drs_auth_bound_server_session_verify_v1(
    v_server_session_id,
    p_input ->> 'access_token_digest',
    v_user_id,
    v_session_id,
    p_input ->> 'auth_token_digest'
  );
  select * into v_event from casework.case_events
  where id = v_review_event_id
  for share;
  if not found then
    return jsonb_build_object('ok', false, 'state', 'CASE_NOT_AUTHORIZED');
  end if;
  select * into v_review from drs_forward_private.document_reviews
  where event_id = v_review_event_id
  for share;
  if not found then
    return jsonb_build_object('ok', false, 'state', 'CASE_NOT_AUTHORIZED');
  end if;
  v_message := v_review.review_text;
  if v_verified ->> 'authenticated_user_id' is distinct from v_user_id::text
    or v_verified ->> 'auth_session_id' is distinct from v_session_id::text
    or coalesce(v_verified ->> 'specialist_id','') !~
      '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
    or v_verified ->> 'authorization_subject' is distinct from
      'drs-specialist:' || (v_verified ->> 'specialist_id')
    or v_verified ->> 'selected_case_id' is distinct from v_event.case_id::text
    or v_verified ->> 'case_status' is distinct from 'active'
    or v_verified ->> 'access_mode' is distinct from 'read_only'
    or v_event.actor_id is distinct from v_user_id
    or v_event.actor_role is distinct from 'drs'
    or v_event.event_type is distinct from 'DOCUMENT_REVIEW_SUBMITTED'
    or v_review.case_id is distinct from v_event.case_id
    or v_review.reviewer_user_id is distinct from v_event.actor_id
    or v_message is null or v_message <> btrim(v_message)
    or integration.drs_line_utf16_length_v1(v_message) not between 1 and 5000
    or translate(v_message, E'\t\n\r', '') ~ '[[:cntrl:]]'
  then
    return jsonb_build_object('ok', false, 'state', 'CASE_NOT_AUTHORIZED');
  end if;
  select * into v_binding
  from integration.drs_line_case_group_bindings
  where case_id = v_event.case_id
    and provider_channel_digest = p_input ->> 'provider_channel_digest'
    and binding_state = 'active'
  for share;
  if not found then
    return jsonb_build_object('ok', false, 'state', 'GROUP_NOT_BOUND');
  end if;
  insert into integration.drs_line_review_notification_outbox(
    case_id, review_event_id, reviewer_user_id, binding_id, binding_version,
    provider_channel_digest, review_payload_sha256, message_text
  ) values (
    v_event.case_id, v_event.id, v_user_id, v_binding.binding_id,
    v_binding.binding_version, p_input ->> 'provider_channel_digest',
    v_review.request_sha256, v_message
  ) on conflict (review_event_id, binding_id, binding_version) do nothing
  returning * into v_outbox;
  v_inserted := found;
  if not v_inserted then
    select * into v_outbox
    from integration.drs_line_review_notification_outbox
    where review_event_id = v_event.id
      and binding_id = v_binding.binding_id
      and binding_version = v_binding.binding_version;
  else
    insert into integration.drs_line_case_audit_events(
      case_id, actor_user_id, actor_role, event_type, source_ref,
      idempotency_key, payload_sha256, current_status, next_actor
    ) values (
      v_event.case_id, v_user_id, 'drs',
      'LINE_REVIEW_NOTIFICATION_ENQUEUED', v_outbox.outbox_id,
      'line-review-enqueued:' || v_outbox.outbox_id::text,
      v_review.request_sha256, 'pending', 'system'
    );
  end if;
  return jsonb_build_object(
    'ok', true,
    'state', case when v_inserted then 'ENQUEUED' else 'ALREADY_ENQUEUED' end,
    'outbox_id', v_outbox.outbox_id::text
  );
exception
  when insufficient_privilege then raise;
  when others then
    return jsonb_build_object('ok', false, 'state', 'CONTEXT_UNAVAILABLE');
end;
$function$;

create function public.drs_line_review_notification_claim_v1(p_input jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_now timestamptz := clock_timestamp();
  v_outbox integration.drs_line_review_notification_outbox%rowtype;
  v_event casework.case_events%rowtype;
  v_review drs_forward_private.document_reviews%rowtype;
  v_binding integration.drs_line_case_group_bindings%rowtype;
  v_authority jsonb;
begin
  if current_setting('role', true) is distinct from 'service_role' then
    raise insufficient_privilege;
  end if;
  if p_input is null or p_input <> '{}'::jsonb then
    return jsonb_build_object('claimed', false, 'state', 'INVALID_REQUEST');
  end if;
  select * into v_outbox
  from integration.drs_line_review_notification_outbox
  where (
    (
      delivery_state in ('pending','retry') and next_attempt_at <= v_now
      and attempt_count < 20
    ) or (
      delivery_state = 'dispatching'
      and claimed_at < v_now - interval '2 minutes'
      and attempt_count <= 20
    )
  )
  order by next_attempt_at, created_at, outbox_id
  for update skip locked
  limit 1;
  if not found then
    return jsonb_build_object('claimed', false, 'state', 'EMPTY');
  end if;
  select * into v_event from casework.case_events
  where id = v_outbox.review_event_id and case_id = v_outbox.case_id;
  select * into v_review from drs_forward_private.document_reviews
  where event_id = v_outbox.review_event_id and case_id = v_outbox.case_id;
  select * into v_binding
  from integration.drs_line_case_group_bindings
  where binding_id = v_outbox.binding_id
    and case_id = v_outbox.case_id
    and binding_version = v_outbox.binding_version
    and binding_state = 'active'
  for share;
  v_authority := drs_forward_private.drs_password_authority_resolve_locked_v1(
    v_outbox.reviewer_user_id, v_outbox.case_id, null
  );
  if v_event.id is null or v_review.review_id is null
    or v_binding.binding_id is null
    or v_event.actor_id <> v_outbox.reviewer_user_id
    or v_event.actor_role is distinct from 'drs'
    or v_event.event_type is distinct from 'DOCUMENT_REVIEW_SUBMITTED'
    or v_review.reviewer_user_id <> v_outbox.reviewer_user_id
    or v_review.request_sha256 <> v_outbox.review_payload_sha256
    or v_review.review_text <> v_outbox.message_text
    or v_authority -> 'authorized' is distinct from 'true'::jsonb
    or v_authority ->> 'selected_case_id' <> v_outbox.case_id::text
  then
    update integration.drs_line_review_notification_outbox
    set delivery_state = 'suppressed', completed_at = v_now,
      claim_token = null, claimed_at = null
    where outbox_id = v_outbox.outbox_id;
    insert into integration.drs_line_case_audit_events(
      case_id, actor_user_id, actor_role, event_type, source_ref,
      idempotency_key, payload_sha256, current_status, next_actor
    ) values (
      v_outbox.case_id, null, 'system',
      'LINE_REVIEW_NOTIFICATION_SUPPRESSED', v_outbox.outbox_id,
      'line-review-suppressed:' || v_outbox.outbox_id::text,
      v_outbox.review_payload_sha256, 'suppressed', 'drs'
    ) on conflict (idempotency_key) do nothing;
    return jsonb_build_object('claimed', false, 'state', 'EMPTY');
  end if;
  update integration.drs_line_review_notification_outbox
  set delivery_state = 'dispatching',
    attempt_count = case
      when delivery_state = 'dispatching' then attempt_count
      else attempt_count + 1
    end,
    claim_token = extensions.gen_random_uuid(), claimed_at = v_now
  where outbox_id = v_outbox.outbox_id
  returning * into v_outbox;
  return jsonb_build_object(
    'claimed', true, 'state', 'CLAIMED',
    'outbox_id', v_outbox.outbox_id::text,
    'claim_token', v_outbox.claim_token::text,
    'retry_key', v_outbox.retry_key::text,
    'provider_channel_digest', v_outbox.provider_channel_digest,
    'line_group_digest', v_binding.line_group_digest,
    'line_group_ciphertext', v_binding.line_group_ciphertext,
    'line_group_iv', v_binding.line_group_iv,
    'encryption_key_version', v_binding.encryption_key_version,
    'binding_version', v_binding.binding_version::text,
    'message_text', v_outbox.message_text
  );
exception
  when insufficient_privilege then raise;
  when others then
    return jsonb_build_object('claimed', false, 'state', 'CONTEXT_UNAVAILABLE');
end;
$function$;

create function public.drs_line_review_notification_assert_current_v1(p_input jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_now timestamptz := clock_timestamp();
  v_outbox integration.drs_line_review_notification_outbox%rowtype;
  v_event casework.case_events%rowtype;
  v_review drs_forward_private.document_reviews%rowtype;
  v_binding integration.drs_line_case_group_bindings%rowtype;
  v_authority jsonb;
begin
  if current_setting('role', true) is distinct from 'service_role' then
    raise insufficient_privilege;
  end if;
  if p_input is null or jsonb_typeof(p_input) <> 'object'
    or not p_input ?& array['outbox_id','claim_token']
    or exists (
      select 1 from jsonb_object_keys(p_input) key_name
      where key_name <> all(array['outbox_id','claim_token'])
    )
  then
    return jsonb_build_object('ok', false, 'state', 'INVALID_REQUEST');
  end if;
  select * into v_outbox
  from integration.drs_line_review_notification_outbox
  where outbox_id = (p_input ->> 'outbox_id')::uuid
    and claim_token = (p_input ->> 'claim_token')::uuid
    and delivery_state = 'dispatching'
  for update;
  if not found then
    return jsonb_build_object('ok', false, 'state', 'STALE_CLAIM');
  end if;
  select * into v_event from casework.case_events
  where id = v_outbox.review_event_id and case_id = v_outbox.case_id;
  select * into v_review from drs_forward_private.document_reviews
  where event_id = v_outbox.review_event_id and case_id = v_outbox.case_id;
  select * into v_binding
  from integration.drs_line_case_group_bindings
  where binding_id = v_outbox.binding_id
    and case_id = v_outbox.case_id
    and binding_version = v_outbox.binding_version
    and binding_state = 'active'
  for share;
  v_authority := drs_forward_private.drs_password_authority_resolve_locked_v1(
    v_outbox.reviewer_user_id, v_outbox.case_id, null
  );
  if v_event.id is null or v_review.review_id is null
    or v_binding.binding_id is null
    or v_event.actor_id <> v_outbox.reviewer_user_id
    or v_event.actor_role is distinct from 'drs'
    or v_event.event_type is distinct from 'DOCUMENT_REVIEW_SUBMITTED'
    or v_review.reviewer_user_id <> v_outbox.reviewer_user_id
    or v_review.request_sha256 <> v_outbox.review_payload_sha256
    or v_review.review_text <> v_outbox.message_text
    or v_authority -> 'authorized' is distinct from 'true'::jsonb
    or v_authority ->> 'selected_case_id' <> v_outbox.case_id::text
  then
    update integration.drs_line_review_notification_outbox
    set delivery_state = 'suppressed', completed_at = v_now,
      claim_token = null, claimed_at = null
    where outbox_id = v_outbox.outbox_id;
    insert into integration.drs_line_case_audit_events(
      case_id, actor_user_id, actor_role, event_type, source_ref,
      idempotency_key, payload_sha256, current_status, next_actor
    ) values (
      v_outbox.case_id, null, 'system',
      'LINE_REVIEW_NOTIFICATION_SUPPRESSED', v_outbox.outbox_id,
      'line-review-suppressed:' || v_outbox.outbox_id::text,
      v_outbox.review_payload_sha256, 'suppressed', 'drs'
    ) on conflict (idempotency_key) do nothing;
    return jsonb_build_object('ok', false, 'state', 'SUPPRESSED');
  end if;
  return jsonb_build_object('ok', true, 'state', 'CURRENT');
exception
  when insufficient_privilege then raise;
  when others then
    return jsonb_build_object('ok', false, 'state', 'CONTEXT_UNAVAILABLE');
end;
$function$;

create function public.drs_line_review_notification_complete_v1(p_input jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_now timestamptz := clock_timestamp();
  v_outbox integration.drs_line_review_notification_outbox%rowtype;
  v_outcome text;
  v_request_id text;
  v_accepted_id text;
  v_message_id text;
  v_status_class text;
  v_reason text;
  v_duration integer;
  v_event_type text;
  v_next_actor text;
begin
  if current_setting('role', true) is distinct from 'service_role' then
    raise insufficient_privilege;
  end if;
  if p_input is null or jsonb_typeof(p_input) <> 'object'
    or not p_input ?& array[
      'outbox_id','claim_token','outcome','provider_request_id',
      'provider_accepted_request_id','provider_message_id',
      'provider_status_class','reason_code','duration_ms'
    ]
    or exists (
      select 1 from jsonb_object_keys(p_input) key_name
      where key_name <> all(array[
        'outbox_id','claim_token','outcome','provider_request_id',
        'provider_accepted_request_id','provider_message_id',
        'provider_status_class','reason_code','duration_ms'
      ])
    )
  then
    return jsonb_build_object('ok', false, 'state', 'INVALID_REQUEST');
  end if;
  v_outcome := p_input ->> 'outcome';
  v_request_id := nullif(p_input ->> 'provider_request_id','');
  v_accepted_id := nullif(p_input ->> 'provider_accepted_request_id','');
  v_message_id := nullif(p_input ->> 'provider_message_id','');
  v_status_class := p_input ->> 'provider_status_class';
  v_reason := p_input ->> 'reason_code';
  v_duration := (p_input ->> 'duration_ms')::integer;
  if v_outcome not in ('accepted','retry','permanent_failure')
    or v_status_class not in ('2xx','4xx','5xx','none')
    or v_reason is null or v_reason <> btrim(v_reason)
    or length(v_reason) not between 1 and 64
    or v_duration not between 0 and 120000
    or (v_request_id is not null and v_request_id !~ '^[A-Za-z0-9._:-]{1,128}$')
    or (v_accepted_id is not null and v_accepted_id !~ '^[A-Za-z0-9._:-]{1,128}$')
    or (v_message_id is not null and v_message_id !~ '^[0-9]{1,64}$')
    or (
      v_outcome = 'accepted' and v_request_id is null
      and v_accepted_id is null and v_message_id is null
    )
  then
    return jsonb_build_object('ok', false, 'state', 'INVALID_REQUEST');
  end if;
  select * into v_outbox
  from integration.drs_line_review_notification_outbox
  where outbox_id = (p_input ->> 'outbox_id')::uuid
    and claim_token = (p_input ->> 'claim_token')::uuid
    and delivery_state = 'dispatching'
  for update;
  if not found then
    return jsonb_build_object('ok', false, 'state', 'STALE_CLAIM');
  end if;
  insert into integration.drs_line_review_delivery_receipts(
    outbox_id, outcome, provider_request_id, provider_accepted_request_id,
    provider_message_id, provider_status_class, reason_code, duration_ms
  ) values (
    v_outbox.outbox_id, v_outcome, v_request_id, v_accepted_id,
    v_message_id, v_status_class, v_reason, v_duration
  );
  if v_outcome = 'accepted' then
    update integration.drs_line_review_notification_outbox
    set delivery_state = 'sent', provider_request_id = v_request_id,
      provider_accepted_request_id = v_accepted_id,
      provider_message_id = v_message_id, sent_at = v_now,
      completed_at = v_now, claim_token = null, claimed_at = null
    where outbox_id = v_outbox.outbox_id;
    v_event_type := 'LINE_REVIEW_NOTIFICATION_SENT';
    v_next_actor := 'owner';
  elsif v_outcome = 'retry' and v_outbox.attempt_count < 20 then
    update integration.drs_line_review_notification_outbox
    set delivery_state = 'retry',
      next_attempt_at = v_now + make_interval(secs => least(900,
        (2 ^ least(attempt_count, 9))::integer)),
      claim_token = null, claimed_at = null
    where outbox_id = v_outbox.outbox_id;
    v_event_type := 'LINE_REVIEW_NOTIFICATION_RETRY';
    v_next_actor := 'system';
  else
    update integration.drs_line_review_notification_outbox
    set delivery_state = 'failed', completed_at = v_now,
      claim_token = null, claimed_at = null
    where outbox_id = v_outbox.outbox_id;
    v_event_type := 'LINE_REVIEW_NOTIFICATION_FAILED';
    v_next_actor := 'drs';
  end if;
  insert into integration.drs_line_case_audit_events(
    case_id, actor_user_id, actor_role, event_type, source_ref,
    idempotency_key, payload_sha256, current_status, next_actor
  ) values (
    v_outbox.case_id, null, 'system', v_event_type, v_outbox.outbox_id,
    'line-review-delivery:' || v_outbox.outbox_id::text || ':' ||
      v_outbox.attempt_count::text,
    v_outbox.review_payload_sha256,
    case v_event_type
      when 'LINE_REVIEW_NOTIFICATION_SENT' then 'sent'
      when 'LINE_REVIEW_NOTIFICATION_RETRY' then 'retry'
      else 'failed'
    end,
    v_next_actor
  );
  return jsonb_build_object('ok', true, 'state',
    case v_event_type
      when 'LINE_REVIEW_NOTIFICATION_SENT' then 'SENT'
      when 'LINE_REVIEW_NOTIFICATION_RETRY' then 'RETRY_SCHEDULED'
      else 'FAILED'
    end
  );
exception
  when insufficient_privilege then raise;
  when others then
    return jsonb_build_object('ok', false, 'state', 'CONTEXT_UNAVAILABLE');
end;
$function$;

alter function public.drs_line_case_group_binding_start_v1(jsonb) owner to postgres;
revoke all on function public.drs_line_case_group_binding_start_v1(jsonb)
  from public, anon, authenticated, service_role;
grant execute on function public.drs_line_case_group_binding_start_v1(jsonb) to service_role;

alter function public.drs_line_case_group_bind_from_webhook_v1(jsonb) owner to postgres;
revoke all on function public.drs_line_case_group_bind_from_webhook_v1(jsonb)
  from public, anon, authenticated, service_role;
grant execute on function public.drs_line_case_group_bind_from_webhook_v1(jsonb) to service_role;

alter function public.drs_line_review_notification_enqueue_v1(jsonb) owner to postgres;
revoke all on function public.drs_line_review_notification_enqueue_v1(jsonb)
  from public, anon, authenticated, service_role;
grant execute on function public.drs_line_review_notification_enqueue_v1(jsonb) to service_role;

alter function public.drs_line_review_notification_claim_v1(jsonb) owner to postgres;
revoke all on function public.drs_line_review_notification_claim_v1(jsonb)
  from public, anon, authenticated, service_role;
grant execute on function public.drs_line_review_notification_claim_v1(jsonb) to service_role;

alter function public.drs_line_review_notification_assert_current_v1(jsonb) owner to postgres;
revoke all on function public.drs_line_review_notification_assert_current_v1(jsonb)
  from public, anon, authenticated, service_role;
grant execute on function public.drs_line_review_notification_assert_current_v1(jsonb) to service_role;

alter function public.drs_line_review_notification_complete_v1(jsonb) owner to postgres;
revoke all on function public.drs_line_review_notification_complete_v1(jsonb)
  from public, anon, authenticated, service_role;
grant execute on function public.drs_line_review_notification_complete_v1(jsonb) to service_role;

comment on table integration.drs_line_case_group_bindings is
  'Server-derived case-to-LINE-group binding. Raw LINE group identifiers remain encrypted.';
comment on table integration.drs_line_review_notification_outbox is
  'Case-bound review delivery intent revalidated immediately before LINE provider push.';

commit;
