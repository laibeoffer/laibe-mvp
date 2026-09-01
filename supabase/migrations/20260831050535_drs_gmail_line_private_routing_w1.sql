begin;

do $$
begin
  if to_regclass('auth.users') is null
    or to_regclass('public.drs_cases') is null
    or to_regclass('public.drs_specialists') is null
    or to_regclass('public.drs_case_specialist_assignments') is null
    or to_regclass(
      'public.drs_case_specialist_assignment_terminations'
    ) is null
    or to_regclass('integration.drs_auth_specialist_bindings') is null
    or to_regprocedure(
      'integration.drs_identity_authority_resolve_locked_v1(uuid,uuid,text)'
    ) is null
  then
    raise exception 'DRS_LINE_PRIVATE_ROUTING_PREREQUISITE_MISSING';
  end if;

  if to_regclass('integration.drs_line_account_link_intents') is not null
    or to_regclass('integration.drs_line_account_bindings') is not null
    or to_regclass('integration.drs_line_binding_audit') is not null
    or to_regclass('integration.drs_line_webhook_events') is not null
    or to_regclass('integration.drs_line_notification_outbox') is not null
    or to_regclass('integration.drs_line_delivery_receipts') is not null
  then
    raise exception 'DRS_LINE_PRIVATE_ROUTING_ALREADY_EXISTS';
  end if;
end;
$$;

alter table public.drs_case_audit_events
  drop constraint drs_case_audit_events_type_check;
alter table public.drs_case_audit_events
  add constraint drs_case_audit_events_type_check check (
    event_type in (
      'LINE_SENT_EVENT', 'AI_REVIEW', 'HUMAN_DECISION', 'FINAL_MESSAGE',
      'RECEIPT', 'WORK_ITEM_TRANSITION', 'PRIVATE_LINE_NOTIFICATION'
    )
  );

create table integration.drs_line_account_link_intents (
  intent_id uuid primary key default extensions.gen_random_uuid(),
  authenticated_user_id uuid not null references auth.users(id)
    on delete restrict,
  specialist_id uuid not null references public.drs_specialists(specialist_id)
    on delete restrict,
  assignment_id uuid not null references
    public.drs_case_specialist_assignments(assignment_id) on delete restrict,
  selected_case_id uuid not null,
  authorization_subject text not null,
  provider_channel_id text not null,
  bot_launch_url text not null,
  intent_state text not null,
  nonce_digest text,
  nonce_expires_at timestamptz,
  created_at timestamptz not null default clock_timestamp(),
  expires_at timestamptz not null,
  consumed_at timestamptz,
  cancelled_at timestamptz,
  failed_at timestamptz,
  constraint drs_line_intents_subject_check check (
    authorization_subject = 'drs-specialist:' || specialist_id::text
  ),
  constraint drs_line_intents_provider_check check (
    provider_channel_id ~ '^[0-9]{1,32}$'
  ),
  constraint drs_line_intents_bot_url_check check (
    bot_launch_url ~ '^https://([a-z0-9-]+\.)*line\.me/'
    and length(bot_launch_url) <= 512
  ),
  constraint drs_line_intents_state_check check (
    intent_state in (
      'pending', 'link_token_issued', 'nonce_ready', 'linked', 'expired',
      'cancelled', 'conflict_line_already_bound',
      'conflict_drs_already_bound', 'permission_denied',
      'specialist_inactive', 'temporarily_unavailable'
    )
  ),
  constraint drs_line_intents_interval_check check (
    isfinite(created_at) and isfinite(expires_at)
    and expires_at > created_at
    and expires_at <= created_at + interval '15 minutes'
  ),
  constraint drs_line_intents_nonce_check check (
    (nonce_digest is null and nonce_expires_at is null)
    or (
      nonce_digest ~ '^[A-Za-z0-9_-]{43}$'
      and nonce_expires_at is not null
      and isfinite(nonce_expires_at)
      and nonce_expires_at > created_at
      and nonce_expires_at <= expires_at
    )
  ),
  constraint drs_line_intents_terminal_time_check check (
    (consumed_at is null or isfinite(consumed_at))
    and (cancelled_at is null or isfinite(cancelled_at))
    and (failed_at is null or isfinite(failed_at))
  )
);

create table integration.drs_line_account_bindings (
  binding_id uuid primary key default extensions.gen_random_uuid(),
  binding_version bigint generated always as identity unique,
  specialist_id uuid not null references public.drs_specialists(specialist_id)
    on delete restrict,
  provider_channel_id text not null,
  line_user_digest text not null,
  line_user_ciphertext text not null,
  line_user_iv text not null,
  encryption_key_version text not null,
  binding_state text not null default 'active',
  linked_at timestamptz not null default clock_timestamp(),
  revoked_at timestamptz,
  constraint drs_line_bindings_provider_check check (
    provider_channel_id ~ '^[0-9]{1,32}$'
  ),
  constraint drs_line_bindings_digest_check check (
    line_user_digest ~ '^[A-Za-z0-9_-]{43}$'
  ),
  constraint drs_line_bindings_envelope_check check (
    line_user_ciphertext ~ '^[A-Za-z0-9_-]+$'
    and length(line_user_ciphertext) between 24 and 1024
    and line_user_iv ~ '^[A-Za-z0-9_-]{16}$'
    and encryption_key_version ~ '^[A-Za-z0-9._-]{1,64}$'
  ),
  constraint drs_line_bindings_state_check check (
    binding_state in ('active', 'revoked')
  ),
  constraint drs_line_bindings_lifecycle_check check (
    isfinite(linked_at)
    and (
      (binding_state = 'active' and revoked_at is null)
      or (
        binding_state = 'revoked'
        and revoked_at is not null
        and isfinite(revoked_at)
        and revoked_at >= linked_at
      )
    )
  )
);

create table integration.drs_line_binding_audit (
  audit_id uuid primary key default extensions.gen_random_uuid(),
  specialist_id uuid not null references public.drs_specialists(specialist_id)
    on delete restrict,
  intent_id uuid references integration.drs_line_account_link_intents(intent_id)
    on delete restrict,
  binding_id uuid references integration.drs_line_account_bindings(binding_id)
    on delete restrict,
  event_type text not null,
  safe_outcome text not null,
  safe_payload jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default clock_timestamp(),
  constraint drs_line_binding_audit_event_check check (
    event_type in (
      'start', 'link_token_issued', 'nonce_ready', 'linked', 'conflict',
      'expired', 'cancelled', 'unlink_requested', 'revoked', 'denied',
      'provider_unavailable'
    )
  ),
  constraint drs_line_binding_audit_outcome_check check (
    safe_outcome ~ '^[a-z0-9_]{1,64}$'
  ),
  constraint drs_line_binding_audit_payload_check check (
    jsonb_typeof(safe_payload) = 'object'
    and safe_payload - array[
      'state', 'reason_code', 'binding_version',
      'provider_status_class', 'correlation_digest'
    ] = '{}'::jsonb
  ),
  constraint drs_line_binding_audit_time_check check (isfinite(occurred_at))
);

create table integration.drs_line_webhook_events (
  webhook_event_digest text primary key,
  event_kind text not null,
  processing_state text not null default 'processing',
  safe_outcome text not null default 'pending',
  claim_token uuid not null default extensions.gen_random_uuid(),
  provider_retry_key uuid not null default extensions.gen_random_uuid(),
  attempt_count integer not null default 1,
  first_seen_at timestamptz not null default clock_timestamp(),
  claimed_at timestamptz not null default clock_timestamp(),
  completed_at timestamptz,
  constraint drs_line_webhook_digest_check check (
    webhook_event_digest ~ '^[A-Za-z0-9_-]{43}$'
  ),
  constraint drs_line_webhook_kind_check check (
    event_kind in ('binding_action', 'unlink_action', 'account_link', 'verify')
  ),
  constraint drs_line_webhook_state_check check (
    processing_state in ('processing', 'completed')
  ),
  constraint drs_line_webhook_outcome_check check (
    safe_outcome in (
      'pending', 'verified', 'link_token_replied', 'linked', 'expired',
      'conflict_line_already_bound', 'conflict_drs_already_bound',
      'specialist_inactive', 'not_linked', 'revoked', 'ignored', 'failed',
      'temporarily_unavailable'
    )
  ),
  constraint drs_line_webhook_attempt_check check (
    attempt_count between 1 and 12
  ),
  constraint drs_line_webhook_time_check check (
    isfinite(first_seen_at) and isfinite(claimed_at)
    and claimed_at >= first_seen_at
    and (
      (processing_state = 'processing' and completed_at is null)
      or (
        processing_state = 'completed'
        and completed_at is not null
        and isfinite(completed_at)
        and completed_at >= claimed_at
      )
    )
  )
);

create table integration.drs_line_notification_outbox (
  outbox_id uuid primary key default extensions.gen_random_uuid(),
  case_id uuid not null references public.drs_cases(case_id) on delete restrict,
  assignment_id uuid not null references
    public.drs_case_specialist_assignments(assignment_id) on delete restrict,
  specialist_id uuid not null references public.drs_specialists(specialist_id)
    on delete restrict,
  auth_binding_id uuid not null references
    integration.drs_auth_specialist_bindings(binding_id) on delete restrict,
  binding_id uuid not null references
    integration.drs_line_account_bindings(binding_id) on delete restrict,
  binding_version bigint not null,
  provider_channel_id text not null,
  template_version text not null,
  idempotency_key text not null unique,
  case_label text not null,
  case_status text not null,
  next_action text not null,
  case_path text not null,
  delivery_state text not null default 'pending',
  attempt_count integer not null default 0,
  next_attempt_at timestamptz not null default clock_timestamp(),
  claim_token uuid,
  claimed_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default clock_timestamp(),
  constraint drs_line_outbox_provider_check check (
    provider_channel_id ~ '^[0-9]{1,32}$'
  ),
  constraint drs_line_outbox_template_check check (
    template_version ~ '^[A-Za-z0-9._-]{1,64}$'
    and idempotency_key ~ '^[A-Za-z0-9._:-]{16,160}$'
  ),
  constraint drs_line_outbox_safe_message_check check (
    length(case_label) between 1 and 80
    and length(case_status) between 1 and 120
    and length(next_action) between 1 and 160
    and case_label !~ '[\x00-\x1f\x7f]'
    and case_status !~ '[\x00-\x1f\x7f]'
    and next_action !~ '[\x00-\x1f\x7f]'
    and case_path ~ '^/pcm/console/case\?caseId=[0-9a-f-]{36}$'
    and length(case_path) <= 512
  ),
  constraint drs_line_outbox_state_check check (
    delivery_state in (
      'pending', 'claimed', 'retry', 'accepted',
      'permanent_failure', 'suppressed'
    )
  ),
  constraint drs_line_outbox_attempt_check check (
    attempt_count between 0 and 5
  ),
  constraint drs_line_outbox_claim_check check (
    (delivery_state in ('pending', 'retry') and claim_token is null and claimed_at is null)
    or (delivery_state = 'claimed' and claim_token is not null and claimed_at is not null)
    or (delivery_state in ('accepted', 'permanent_failure', 'suppressed') and claim_token is null)
  )
);

create table integration.drs_line_delivery_receipts (
  receipt_id uuid primary key default extensions.gen_random_uuid(),
  outbox_id uuid not null references
    integration.drs_line_notification_outbox(outbox_id) on delete restrict,
  case_id uuid not null references public.drs_cases(case_id) on delete restrict,
  specialist_id uuid not null references public.drs_specialists(specialist_id)
    on delete restrict,
  attempt_number integer not null,
  outcome text not null,
  http_status_class text not null,
  provider_request_id text,
  reason_code text not null,
  duration_ms integer not null,
  attempted_at timestamptz not null default clock_timestamp(),
  constraint drs_line_receipts_attempt_unique unique (
    outbox_id, attempt_number
  ),
  constraint drs_line_receipts_outcome_check check (
    outcome in ('accepted', 'retryable_failure', 'permanent_failure', 'suppressed')
  ),
  constraint drs_line_receipts_status_check check (
    http_status_class in ('2xx', '4xx', '5xx', 'none')
  ),
  constraint drs_line_receipts_provider_id_check check (
    provider_request_id is null
    or provider_request_id ~ '^[A-Za-z0-9._:-]{1,128}$'
  ),
  constraint drs_line_receipts_reason_check check (
    reason_code ~ '^[a-z0-9_]{1,64}$'
  ),
  constraint drs_line_receipts_duration_check check (
    duration_ms between 0 and 120000
    and attempt_number between 1 and 5
    and isfinite(attempted_at)
  )
);

create unique index drs_line_intents_one_pending_specialist_idx
  on integration.drs_line_account_link_intents(
    provider_channel_id, specialist_id
  )
  where intent_state in ('pending', 'link_token_issued', 'nonce_ready');

create unique index drs_line_intents_one_nonce_digest_idx
  on integration.drs_line_account_link_intents(nonce_digest)
  where nonce_digest is not null;

create unique index drs_line_bindings_one_active_specialist_idx
  on integration.drs_line_account_bindings(provider_channel_id, specialist_id)
  where binding_state = 'active';

create unique index drs_line_bindings_one_active_line_identity_idx
  on integration.drs_line_account_bindings(provider_channel_id, line_user_digest)
  where binding_state = 'active';

create index drs_line_outbox_due_idx
  on integration.drs_line_notification_outbox(next_attempt_at, created_at)
  where delivery_state in ('pending', 'retry', 'claimed');

create index drs_line_outbox_auth_binding_state_idx
  on integration.drs_line_notification_outbox(auth_binding_id, delivery_state)
  where delivery_state in ('pending', 'retry', 'claimed');

create index drs_line_audit_specialist_time_idx
  on integration.drs_line_binding_audit(specialist_id, occurred_at);

create index drs_line_receipts_case_time_idx
  on integration.drs_line_delivery_receipts(case_id, attempted_at);

alter table integration.drs_line_account_link_intents owner to postgres;
alter table integration.drs_line_account_bindings owner to postgres;
alter table integration.drs_line_binding_audit owner to postgres;
alter table integration.drs_line_webhook_events owner to postgres;
alter table integration.drs_line_notification_outbox owner to postgres;
alter table integration.drs_line_delivery_receipts owner to postgres;

alter table integration.drs_line_account_link_intents enable row level security;
alter table integration.drs_line_account_link_intents force row level security;
alter table integration.drs_line_account_bindings enable row level security;
alter table integration.drs_line_account_bindings force row level security;
alter table integration.drs_line_binding_audit enable row level security;
alter table integration.drs_line_binding_audit force row level security;
alter table integration.drs_line_webhook_events enable row level security;
alter table integration.drs_line_webhook_events force row level security;
alter table integration.drs_line_notification_outbox enable row level security;
alter table integration.drs_line_notification_outbox force row level security;
alter table integration.drs_line_delivery_receipts enable row level security;
alter table integration.drs_line_delivery_receipts force row level security;

create policy drs_line_account_link_intents_deny_all
  on integration.drs_line_account_link_intents
  for all to public using (false) with check (false);
create policy drs_line_account_bindings_deny_all
  on integration.drs_line_account_bindings
  for all to public using (false) with check (false);
create policy drs_line_binding_audit_deny_all
  on integration.drs_line_binding_audit
  for all to public using (false) with check (false);
create policy drs_line_webhook_events_deny_all
  on integration.drs_line_webhook_events
  for all to public using (false) with check (false);
create policy drs_line_notification_outbox_deny_all
  on integration.drs_line_notification_outbox
  for all to public using (false) with check (false);
create policy drs_line_delivery_receipts_deny_all
  on integration.drs_line_delivery_receipts
  for all to public using (false) with check (false);

revoke all on table integration.drs_line_account_link_intents
  from public, anon, authenticated, service_role;
revoke all on table integration.drs_line_account_bindings
  from public, anon, authenticated, service_role;
revoke all on table integration.drs_line_binding_audit
  from public, anon, authenticated, service_role;
revoke all on table integration.drs_line_webhook_events
  from public, anon, authenticated, service_role;
revoke all on table integration.drs_line_notification_outbox
  from public, anon, authenticated, service_role;
revoke all on table integration.drs_line_delivery_receipts
  from public, anon, authenticated, service_role;

revoke all on sequence integration.drs_line_account_bindings_binding_version_seq
  from public, anon, authenticated, service_role;

create or replace function integration.drs_line_append_only_v1()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  raise exception 'DRS_LINE_APPEND_ONLY';
end;
$$;

alter function integration.drs_line_append_only_v1() owner to postgres;
revoke all on function integration.drs_line_append_only_v1()
  from public, anon, authenticated, service_role;

create trigger drs_line_binding_audit_append_only
  before update or delete
  on integration.drs_line_binding_audit
  for each row execute function integration.drs_line_append_only_v1();

create trigger drs_line_delivery_receipts_append_only
  before update or delete
  on integration.drs_line_delivery_receipts
  for each row execute function integration.drs_line_append_only_v1();

create or replace function drs_private.drs_line_exact_json_keys_v1(
  p_input jsonb,
  p_keys text[]
)
returns boolean
language sql
immutable
security definer
set search_path = ''
as $$
  select jsonb_typeof(p_input) = 'object'
    and p_input ?& p_keys
    and not exists (
      select 1
      from pg_catalog.jsonb_object_keys(p_input) as supplied(key)
      where not (supplied.key = any(p_keys))
    );
$$;

alter function drs_private.drs_line_exact_json_keys_v1(jsonb, text[])
  owner to postgres;
revoke all on function drs_private.drs_line_exact_json_keys_v1(jsonb, text[])
  from public, anon, authenticated, service_role;

create or replace function drs_private.drs_line_authority_matches_v1(
  p_input jsonb
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_authority jsonb;
begin
  v_authority := integration.drs_identity_authority_resolve_locked_v1(
    (p_input ->> 'authenticated_user_id')::uuid,
    (p_input ->> 'selected_case_id')::uuid,
    p_input ->> 'authorization_subject'
  );
  return v_authority -> 'authorized' = 'true'::jsonb
    and v_authority ->> 'authenticated_user_id' =
      p_input ->> 'authenticated_user_id'
    and v_authority ->> 'specialist_id' = p_input ->> 'specialist_id'
    and v_authority ->> 'selected_case_id' = p_input ->> 'selected_case_id'
    and v_authority ->> 'authorization_subject' =
      p_input ->> 'authorization_subject';
exception
  when others then
    return false;
end;
$$;

alter function drs_private.drs_line_authority_matches_v1(jsonb)
  owner to postgres;
revoke all on function drs_private.drs_line_authority_matches_v1(jsonb)
  from public, anon, authenticated, service_role;

create or replace function drs_private.drs_line_start_link_intent_v1(
  p_input jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_now timestamptz := clock_timestamp();
  v_authority jsonb;
  v_existing integration.drs_line_account_link_intents%rowtype;
  v_binding integration.drs_line_account_bindings%rowtype;
begin
  if not drs_private.drs_line_exact_json_keys_v1(
    p_input,
    array[
      'authenticated_user_id', 'specialist_id', 'selected_case_id',
      'authorization_subject', 'provider_channel_id', 'bot_launch_url'
    ]
  )
    or coalesce(p_input ->> 'provider_channel_id', '') !~ '^[0-9]{1,32}$'
    or coalesce(p_input ->> 'bot_launch_url', '') !~
      '^https://([a-z0-9-]+\.)*line\.me/'
    or not drs_private.drs_line_authority_matches_v1(p_input)
  then
    return jsonb_build_object('state', 'permission_denied');
  end if;

  v_authority := integration.drs_identity_authority_resolve_locked_v1(
    (p_input ->> 'authenticated_user_id')::uuid,
    (p_input ->> 'selected_case_id')::uuid,
    p_input ->> 'authorization_subject'
  );
  if v_authority -> 'authorized' is distinct from 'true'::jsonb then
    return jsonb_build_object('state', 'permission_denied');
  end if;

  select * into v_binding
  from integration.drs_line_account_bindings
  where provider_channel_id = p_input ->> 'provider_channel_id'
    and specialist_id = (p_input ->> 'specialist_id')::uuid
    and binding_state = 'active'
  for update;

  if found then
    return jsonb_build_object(
      'state', 'linked',
      'linked_at', v_binding.linked_at,
      'next_action', 'unlink'
    );
  end if;

  select * into v_existing
  from integration.drs_line_account_link_intents
  where provider_channel_id = p_input ->> 'provider_channel_id'
    and specialist_id = (p_input ->> 'specialist_id')::uuid
    and intent_state in ('pending', 'link_token_issued', 'nonce_ready')
  for update;

  if found and v_existing.expires_at <= v_now then
    update integration.drs_line_account_link_intents
    set intent_state = 'expired', failed_at = v_now
    where intent_id = v_existing.intent_id;
    v_existing.intent_id := null;
  end if;

  if v_existing.intent_id is null then
    insert into integration.drs_line_account_link_intents (
      authenticated_user_id, specialist_id, assignment_id, selected_case_id,
      authorization_subject, provider_channel_id, bot_launch_url,
      intent_state, created_at, expires_at
    ) values (
      (p_input ->> 'authenticated_user_id')::uuid,
      (p_input ->> 'specialist_id')::uuid,
      (v_authority ->> 'assignment_id')::uuid,
      (p_input ->> 'selected_case_id')::uuid,
      p_input ->> 'authorization_subject',
      p_input ->> 'provider_channel_id',
      p_input ->> 'bot_launch_url',
      'pending', v_now, v_now + interval '10 minutes'
    ) returning * into v_existing;

    insert into integration.drs_line_binding_audit (
      specialist_id, intent_id, event_type, safe_outcome, safe_payload,
      occurred_at
    ) values (
      v_existing.specialist_id, v_existing.intent_id, 'start',
      'awaiting_line_confirmation',
      jsonb_build_object('state', 'awaiting_line_confirmation'), v_now
    );
  end if;

  return jsonb_build_object(
    'state', 'awaiting_line_confirmation',
    'expires_at', v_existing.expires_at,
    'next_action', 'continue_in_line',
    'bot_launch_url', v_existing.bot_launch_url
  );
exception
  when unique_violation then
    return jsonb_build_object(
      'state', 'temporarily_unavailable', 'next_action', 'retry'
    );
  when others then
    return jsonb_build_object(
      'state', 'temporarily_unavailable', 'next_action', 'retry'
    );
end;
$$;

create or replace function drs_private.drs_line_read_link_status_v1(
  p_input jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_now timestamptz := clock_timestamp();
  v_binding integration.drs_line_account_bindings%rowtype;
  v_intent integration.drs_line_account_link_intents%rowtype;
begin
  if not drs_private.drs_line_exact_json_keys_v1(
    p_input,
    array[
      'authenticated_user_id', 'specialist_id', 'selected_case_id',
      'authorization_subject', 'provider_channel_id'
    ]
  ) or not drs_private.drs_line_authority_matches_v1(p_input)
  then
    return jsonb_build_object('state', 'permission_denied');
  end if;

  select * into v_binding
  from integration.drs_line_account_bindings
  where provider_channel_id = p_input ->> 'provider_channel_id'
    and specialist_id = (p_input ->> 'specialist_id')::uuid
    and binding_state = 'active'
  for update;
  if found then
    return jsonb_build_object(
      'state', 'linked', 'linked_at', v_binding.linked_at,
      'next_action', 'unlink'
    );
  end if;

  select * into v_intent
  from integration.drs_line_account_link_intents
  where provider_channel_id = p_input ->> 'provider_channel_id'
    and specialist_id = (p_input ->> 'specialist_id')::uuid
  order by created_at desc
  limit 1
  for update;

  if not found then
    return jsonb_build_object('state', 'not_linked', 'next_action', 'relink');
  end if;

  if v_intent.intent_state in ('pending', 'link_token_issued', 'nonce_ready')
    and v_intent.expires_at <= v_now
  then
    update integration.drs_line_account_link_intents
    set intent_state = 'expired', failed_at = v_now
    where intent_id = v_intent.intent_id;
    return jsonb_build_object('state', 'expired', 'next_action', 'relink');
  end if;
  if v_intent.intent_state in ('pending', 'link_token_issued', 'nonce_ready') then
    return jsonb_build_object(
      'state', 'awaiting_line_confirmation',
      'expires_at', v_intent.expires_at,
      'next_action', 'continue_in_line',
      'bot_launch_url', v_intent.bot_launch_url
    );
  end if;
  if v_intent.intent_state = 'cancelled' then
    return jsonb_build_object('state', 'cancelled', 'next_action', 'relink');
  end if;
  if v_intent.intent_state in (
    'conflict_line_already_bound', 'conflict_drs_already_bound'
  ) then
    return jsonb_build_object(
      'state', v_intent.intent_state, 'next_action', 'relink'
    );
  end if;
  return jsonb_build_object(
    'state', 'temporarily_unavailable', 'next_action', 'retry'
  );
exception
  when others then
    return jsonb_build_object(
      'state', 'temporarily_unavailable', 'next_action', 'retry'
    );
end;
$$;

create or replace function drs_private.drs_line_unlink_by_line_identity_v1(
  p_input jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_now timestamptz := clock_timestamp();
  v_binding integration.drs_line_account_bindings%rowtype;
begin
  if not drs_private.drs_line_exact_json_keys_v1(
    p_input, array['provider_channel_id', 'line_user_digest']
  )
    or coalesce(p_input ->> 'provider_channel_id', '') !~ '^[0-9]{1,32}$'
    or coalesce(p_input ->> 'line_user_digest', '') !~
      '^[A-Za-z0-9_-]{43}$'
  then
    return jsonb_build_object(
      'state', 'temporarily_unavailable', 'next_action', 'retry'
    );
  end if;

  select * into v_binding
  from integration.drs_line_account_bindings
  where provider_channel_id = p_input ->> 'provider_channel_id'
    and line_user_digest = p_input ->> 'line_user_digest'
    and binding_state = 'active'
  for update;
  if not found then
    return jsonb_build_object('state', 'not_linked', 'next_action', 'relink');
  end if;

  perform 1
  from integration.drs_line_notification_outbox
  where binding_id = v_binding.binding_id
    and binding_version = v_binding.binding_version
    and delivery_state = 'claimed'
  for update;
  if found then
    return jsonb_build_object(
      'state', 'temporarily_unavailable', 'next_action', 'retry'
    );
  end if;

  update integration.drs_line_account_bindings
  set binding_state = 'revoked', revoked_at = v_now
  where binding_id = v_binding.binding_id;
  update integration.drs_line_notification_outbox
  set delivery_state = 'suppressed', claim_token = null,
    claimed_at = null, completed_at = v_now
  where binding_id = v_binding.binding_id
    and binding_version = v_binding.binding_version
    and delivery_state in ('pending', 'retry');
  insert into integration.drs_line_binding_audit (
    specialist_id, binding_id, event_type, safe_outcome, safe_payload,
    occurred_at
  ) values (
    v_binding.specialist_id, v_binding.binding_id, 'revoked', 'revoked',
    jsonb_build_object(
      'state', 'revoked', 'binding_version', v_binding.binding_version::text
    ), v_now
  );
  return jsonb_build_object(
    'state', 'revoked', 'revoked_at', v_now, 'next_action', 'relink'
  );
exception
  when others then
    return jsonb_build_object(
      'state', 'temporarily_unavailable', 'next_action', 'retry'
    );
end;
$$;

create or replace function drs_private.drs_line_cancel_link_intent_v1(
  p_input jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_now timestamptz := clock_timestamp();
  v_intent integration.drs_line_account_link_intents%rowtype;
begin
  if not drs_private.drs_line_exact_json_keys_v1(
    p_input,
    array[
      'authenticated_user_id', 'specialist_id', 'selected_case_id',
      'authorization_subject', 'provider_channel_id'
    ]
  ) or not drs_private.drs_line_authority_matches_v1(p_input)
  then
    return jsonb_build_object('state', 'permission_denied');
  end if;

  select * into v_intent
  from integration.drs_line_account_link_intents
  where provider_channel_id = p_input ->> 'provider_channel_id'
    and specialist_id = (p_input ->> 'specialist_id')::uuid
    and intent_state in ('pending', 'link_token_issued', 'nonce_ready')
  for update;
  if not found then
    return jsonb_build_object('state', 'not_linked', 'next_action', 'relink');
  end if;

  update integration.drs_line_account_link_intents
  set intent_state = 'cancelled', cancelled_at = v_now,
    nonce_digest = null, nonce_expires_at = null
  where intent_id = v_intent.intent_id;
  insert into integration.drs_line_binding_audit (
    specialist_id, intent_id, event_type, safe_outcome, safe_payload,
    occurred_at
  ) values (
    v_intent.specialist_id, v_intent.intent_id, 'cancelled', 'cancelled',
    jsonb_build_object('state', 'cancelled'), v_now
  );
  return jsonb_build_object('state', 'cancelled', 'next_action', 'relink');
exception
  when others then
    return jsonb_build_object(
      'state', 'temporarily_unavailable', 'next_action', 'retry'
    );
end;
$$;

create or replace function drs_private.drs_line_prepare_nonce_v1(
  p_input jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_now timestamptz := clock_timestamp();
  v_nonce_expires_at timestamptz;
  v_intent integration.drs_line_account_link_intents%rowtype;
begin
  if not drs_private.drs_line_exact_json_keys_v1(
    p_input,
    array[
      'authenticated_user_id', 'specialist_id', 'selected_case_id',
      'authorization_subject', 'provider_channel_id', 'nonce_digest',
      'nonce_expires_at'
    ]
  ) or not drs_private.drs_line_authority_matches_v1(p_input)
  then
    return jsonb_build_object('accepted', false, 'state', 'permission_denied');
  end if;
  v_nonce_expires_at := (p_input ->> 'nonce_expires_at')::timestamptz;
  if coalesce(p_input ->> 'nonce_digest', '') !~ '^[A-Za-z0-9_-]{43}$'
    or not isfinite(v_nonce_expires_at)
    or v_nonce_expires_at <= v_now
    or v_nonce_expires_at > v_now + interval '10 minutes'
  then
    return jsonb_build_object('accepted', false, 'state', 'expired');
  end if;

  select * into v_intent
  from integration.drs_line_account_link_intents
  where provider_channel_id = p_input ->> 'provider_channel_id'
    and specialist_id = (p_input ->> 'specialist_id')::uuid
    and intent_state in ('pending', 'link_token_issued')
    and consumed_at is null
    and expires_at > v_now
  for update;
  if not found then
    return jsonb_build_object('accepted', false, 'state', 'expired');
  end if;
  if v_nonce_expires_at > v_intent.expires_at then
    v_nonce_expires_at := v_intent.expires_at;
  end if;

  update integration.drs_line_account_link_intents
  set intent_state = 'nonce_ready',
    nonce_digest = p_input ->> 'nonce_digest',
    nonce_expires_at = v_nonce_expires_at
  where intent_id = v_intent.intent_id;
  insert into integration.drs_line_binding_audit (
    specialist_id, intent_id, event_type, safe_outcome, safe_payload,
    occurred_at
  ) values (
    v_intent.specialist_id, v_intent.intent_id, 'nonce_ready',
    'awaiting_line_confirmation',
    jsonb_build_object('state', 'awaiting_line_confirmation'), v_now
  );
  return jsonb_build_object(
    'accepted', true, 'state', 'awaiting_line_confirmation'
  );
exception
  when unique_violation then
    return jsonb_build_object('accepted', false, 'state', 'expired');
  when others then
    return jsonb_build_object(
      'accepted', false, 'state', 'temporarily_unavailable'
    );
end;
$$;

create or replace function drs_private.drs_line_complete_account_link_v1(
  p_input jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_now timestamptz := clock_timestamp();
  v_intent integration.drs_line_account_link_intents%rowtype;
  v_existing_line integration.drs_line_account_bindings%rowtype;
  v_existing_specialist integration.drs_line_account_bindings%rowtype;
  v_binding integration.drs_line_account_bindings%rowtype;
  v_authority jsonb;
begin
  if not drs_private.drs_line_exact_json_keys_v1(
    p_input,
    array[
      'provider_channel_id', 'nonce_digest', 'line_user_digest',
      'line_user_ciphertext', 'line_user_iv', 'encryption_key_version'
    ]
  )
    or coalesce(p_input ->> 'provider_channel_id', '') !~ '^[0-9]{1,32}$'
    or coalesce(p_input ->> 'nonce_digest', '') !~ '^[A-Za-z0-9_-]{43}$'
    or coalesce(p_input ->> 'line_user_digest', '') !~ '^[A-Za-z0-9_-]{43}$'
    or coalesce(p_input ->> 'line_user_ciphertext', '') !~
      '^[A-Za-z0-9_-]+$'
    or length(coalesce(p_input ->> 'line_user_ciphertext', ''))
      not between 24 and 1024
    or coalesce(p_input ->> 'line_user_iv', '') !~ '^[A-Za-z0-9_-]{16}$'
    or coalesce(p_input ->> 'encryption_key_version', '') !~
      '^[A-Za-z0-9._-]{1,64}$'
  then
    return jsonb_build_object(
      'state', 'temporarily_unavailable', 'next_action', 'retry'
    );
  end if;

  select * into v_intent
  from integration.drs_line_account_link_intents
  where provider_channel_id = p_input ->> 'provider_channel_id'
    and nonce_digest = p_input ->> 'nonce_digest'
    and intent_state = 'nonce_ready'
    and consumed_at is null
    and nonce_expires_at > v_now
    and expires_at > v_now
  for update;

  if not found then
    return jsonb_build_object('state', 'expired', 'next_action', 'relink');
  end if;

  v_authority := integration.drs_identity_authority_resolve_locked_v1(
    v_intent.authenticated_user_id,
    v_intent.selected_case_id,
    v_intent.authorization_subject
  );
  if v_authority -> 'authorized' is distinct from 'true'::jsonb
    or v_authority ->> 'specialist_id' is distinct from
      v_intent.specialist_id::text
    or v_authority ->> 'assignment_id' is distinct from
      v_intent.assignment_id::text
  then
    update integration.drs_line_account_link_intents
    set intent_state = 'specialist_inactive', consumed_at = v_now,
      failed_at = v_now, nonce_digest = null, nonce_expires_at = null
    where intent_id = v_intent.intent_id;
    insert into integration.drs_line_binding_audit (
      specialist_id, intent_id, event_type, safe_outcome, safe_payload,
      occurred_at
    ) values (
      v_intent.specialist_id, v_intent.intent_id, 'denied',
      'specialist_inactive',
      jsonb_build_object('state', 'specialist_inactive'), v_now
    );
    return jsonb_build_object(
      'state', 'specialist_inactive', 'next_action', 'retry'
    );
  end if;

  select * into v_existing_line
  from integration.drs_line_account_bindings
  where provider_channel_id = p_input ->> 'provider_channel_id'
    and line_user_digest = p_input ->> 'line_user_digest'
    and binding_state = 'active'
  for update;

  if found and v_existing_line.specialist_id <> v_intent.specialist_id then
    update integration.drs_line_account_link_intents
    set intent_state = 'conflict_line_already_bound', consumed_at = v_now,
      failed_at = v_now
    where intent_id = v_intent.intent_id;
    insert into integration.drs_line_binding_audit (
      specialist_id, intent_id, event_type, safe_outcome, safe_payload,
      occurred_at
    ) values (
      v_intent.specialist_id, v_intent.intent_id, 'conflict',
      'conflict_line_already_bound',
      jsonb_build_object('state', 'conflict_line_already_bound'), v_now
    );
    return jsonb_build_object(
      'state', 'conflict_line_already_bound', 'next_action', 'relink'
    );
  end if;

  select * into v_existing_specialist
  from integration.drs_line_account_bindings
  where provider_channel_id = p_input ->> 'provider_channel_id'
    and specialist_id = v_intent.specialist_id
    and binding_state = 'active'
  for update;

  if found then
    update integration.drs_line_account_link_intents
    set intent_state = 'conflict_drs_already_bound', consumed_at = v_now,
      failed_at = v_now
    where intent_id = v_intent.intent_id;
    insert into integration.drs_line_binding_audit (
      specialist_id, intent_id, binding_id, event_type, safe_outcome,
      safe_payload, occurred_at
    ) values (
      v_intent.specialist_id, v_intent.intent_id,
      v_existing_specialist.binding_id, 'conflict',
      'conflict_drs_already_bound',
      jsonb_build_object('state', 'conflict_drs_already_bound'), v_now
    );
    return jsonb_build_object(
      'state', 'conflict_drs_already_bound', 'next_action', 'relink'
    );
  end if;

  insert into integration.drs_line_account_bindings (
    specialist_id, provider_channel_id, line_user_digest,
    line_user_ciphertext, line_user_iv, encryption_key_version,
    binding_state, linked_at
  ) values (
    v_intent.specialist_id, p_input ->> 'provider_channel_id',
    p_input ->> 'line_user_digest', p_input ->> 'line_user_ciphertext',
    p_input ->> 'line_user_iv', p_input ->> 'encryption_key_version',
    'active', v_now
  ) returning * into v_binding;

  update integration.drs_line_account_link_intents
  set intent_state = 'linked', consumed_at = v_now,
    nonce_digest = null, nonce_expires_at = null
  where intent_id = v_intent.intent_id;

  insert into integration.drs_line_binding_audit (
    specialist_id, intent_id, binding_id, event_type, safe_outcome,
    safe_payload, occurred_at
  ) values (
    v_intent.specialist_id, v_intent.intent_id, v_binding.binding_id,
    'linked', 'linked',
    jsonb_build_object(
      'state', 'linked', 'binding_version', v_binding.binding_version::text
    ), v_now
  );
  return jsonb_build_object(
    'state', 'linked', 'linked_at', v_binding.linked_at,
    'next_action', 'unlink'
  );
exception
  when unique_violation then
    return jsonb_build_object(
      'state', 'temporarily_unavailable', 'next_action', 'retry'
    );
  when others then
    return jsonb_build_object(
      'state', 'temporarily_unavailable', 'next_action', 'retry'
    );
end;
$$;

create or replace function drs_private.drs_line_unlink_account_v1(
  p_input jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_now timestamptz := clock_timestamp();
  v_binding integration.drs_line_account_bindings%rowtype;
  v_authorized boolean := false;
begin
  if not drs_private.drs_line_exact_json_keys_v1(
    p_input,
    array[
      'authenticated_user_id', 'specialist_id', 'selected_case_id',
      'authorization_subject', 'provider_channel_id'
    ]
  ) then
    return jsonb_build_object('state', 'permission_denied');
  end if;

  v_authorized := drs_private.drs_line_authority_matches_v1(p_input);
  if not v_authorized then
    perform 1
    from integration.drs_auth_specialist_bindings
    where authenticated_user_id = (p_input ->> 'authenticated_user_id')::uuid
      and specialist_id = (p_input ->> 'specialist_id')::uuid
      and authorization_subject = p_input ->> 'authorization_subject'
      and binding_status = 'active'
      and revoked_at is null
      and valid_from <= v_now
      and valid_until > v_now
    for update;
    v_authorized := found;
  end if;

  if not v_authorized then
    return jsonb_build_object('state', 'permission_denied');
  end if;

  select * into v_binding
  from integration.drs_line_account_bindings
  where provider_channel_id = p_input ->> 'provider_channel_id'
    and specialist_id = (p_input ->> 'specialist_id')::uuid
    and binding_state = 'active'
  for update;

  if not found then
    return jsonb_build_object('state', 'not_linked', 'next_action', 'relink');
  end if;

  perform 1
  from integration.drs_line_notification_outbox
  where binding_id = v_binding.binding_id
    and binding_version = v_binding.binding_version
    and delivery_state = 'claimed'
  for update;
  if found then
    return jsonb_build_object(
      'state', 'temporarily_unavailable', 'next_action', 'retry'
    );
  end if;

  insert into integration.drs_line_binding_audit (
    specialist_id, binding_id, event_type, safe_outcome, safe_payload,
    occurred_at
  ) values (
    v_binding.specialist_id, v_binding.binding_id, 'unlink_requested',
    'unlinking', jsonb_build_object('state', 'unlinking'), v_now
  );

  update integration.drs_line_account_bindings
  set binding_state = 'revoked', revoked_at = v_now
  where binding_id = v_binding.binding_id;

  update integration.drs_line_notification_outbox
  set delivery_state = 'suppressed', claim_token = null,
    completed_at = v_now
  where binding_id = v_binding.binding_id
    and binding_version = v_binding.binding_version
    and delivery_state in ('pending', 'retry');

  insert into integration.drs_line_binding_audit (
    specialist_id, binding_id, event_type, safe_outcome, safe_payload,
    occurred_at
  ) values (
    v_binding.specialist_id, v_binding.binding_id, 'revoked', 'revoked',
    jsonb_build_object(
      'state', 'revoked', 'binding_version', v_binding.binding_version::text
    ), v_now
  );
  return jsonb_build_object(
    'state', 'revoked', 'revoked_at', v_now, 'next_action', 'relink'
  );
exception
  when others then
    return jsonb_build_object(
      'state', 'temporarily_unavailable', 'next_action', 'retry'
    );
end;
$$;

create or replace function drs_private.drs_line_claim_webhook_v1(
  p_input jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_now timestamptz := clock_timestamp();
  v_event integration.drs_line_webhook_events%rowtype;
  v_claim_token uuid := extensions.gen_random_uuid();
  v_provider_retry_key uuid := extensions.gen_random_uuid();
begin
  if not drs_private.drs_line_exact_json_keys_v1(
    p_input, array['webhook_event_digest', 'event_kind']
  )
    or coalesce(p_input ->> 'webhook_event_digest', '') !~
      '^[A-Za-z0-9_-]{43}$'
    or coalesce(p_input ->> 'event_kind', '') not in (
      'binding_action', 'unlink_action', 'account_link', 'verify'
    )
  then
    return jsonb_build_object('admission', 'rejected');
  end if;

  select * into v_event
  from integration.drs_line_webhook_events
  where webhook_event_digest = p_input ->> 'webhook_event_digest'
  for update;

  if found then
    if v_event.processing_state = 'completed' then
      return jsonb_build_object(
        'admission', 'already_completed',
        'safe_outcome', v_event.safe_outcome
      );
    end if;
    if v_event.attempt_count >= 12 then
      update integration.drs_line_webhook_events
      set processing_state = 'completed',
        safe_outcome = 'temporarily_unavailable', completed_at = v_now
      where webhook_event_digest = v_event.webhook_event_digest;
      return jsonb_build_object(
        'admission', 'already_completed',
        'safe_outcome', 'temporarily_unavailable'
      );
    end if;
    if v_event.claimed_at > v_now - interval '2 minutes' then
      return jsonb_build_object('admission', 'in_progress');
    end if;
    v_provider_retry_key := v_event.provider_retry_key;
    update integration.drs_line_webhook_events
    set claim_token = v_claim_token, claimed_at = v_now,
      attempt_count = attempt_count + 1
    where webhook_event_digest = v_event.webhook_event_digest;
  else
    insert into integration.drs_line_webhook_events (
      webhook_event_digest, event_kind, processing_state, safe_outcome,
      claim_token, provider_retry_key, attempt_count, first_seen_at, claimed_at
    ) values (
      p_input ->> 'webhook_event_digest', p_input ->> 'event_kind',
      'processing', 'pending', v_claim_token, v_provider_retry_key,
      1, v_now, v_now
    );
  end if;

  return jsonb_build_object(
    'admission', 'claimed', 'claim_token', v_claim_token::text,
    'provider_retry_key', v_provider_retry_key::text
  );
exception
  when unique_violation then
    return jsonb_build_object('admission', 'in_progress');
  when others then
    return jsonb_build_object('admission', 'temporarily_unavailable');
end;
$$;

create or replace function drs_private.drs_line_complete_webhook_v1(
  p_input jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_now timestamptz := clock_timestamp();
  v_event integration.drs_line_webhook_events%rowtype;
begin
  if not drs_private.drs_line_exact_json_keys_v1(
    p_input, array['webhook_event_digest', 'claim_token', 'safe_outcome']
  )
    or coalesce(p_input ->> 'safe_outcome', '') not in (
      'verified', 'link_token_replied', 'linked', 'expired',
      'conflict_line_already_bound', 'conflict_drs_already_bound',
      'specialist_inactive', 'not_linked', 'revoked', 'ignored', 'failed',
      'temporarily_unavailable'
    )
  then
    return jsonb_build_object('completed', false);
  end if;

  select * into v_event
  from integration.drs_line_webhook_events
  where webhook_event_digest = p_input ->> 'webhook_event_digest'
  for update;
  if not found then
    return jsonb_build_object('completed', false);
  end if;
  if v_event.processing_state = 'completed' then
    return jsonb_build_object(
      'completed', true, 'safe_outcome', v_event.safe_outcome
    );
  end if;
  if v_event.claim_token <> (p_input ->> 'claim_token')::uuid then
    return jsonb_build_object('completed', false);
  end if;
  update integration.drs_line_webhook_events
  set processing_state = 'completed',
    safe_outcome = p_input ->> 'safe_outcome',
    completed_at = v_now
  where webhook_event_digest = v_event.webhook_event_digest;
  return jsonb_build_object(
    'completed', true, 'safe_outcome', p_input ->> 'safe_outcome'
  );
exception
  when others then
    return jsonb_build_object('completed', false);
end;
$$;

create or replace function drs_private.drs_line_complete_account_link_event_v1(
  p_input jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_link jsonb;
  v_completion jsonb;
  v_outcome text;
begin
  if not drs_private.drs_line_exact_json_keys_v1(
    p_input,
    array[
      'webhook_event_digest', 'claim_token', 'provider_channel_id',
      'nonce_digest', 'line_user_digest', 'line_user_ciphertext',
      'line_user_iv', 'encryption_key_version'
    ]
  )
    or coalesce(p_input ->> 'webhook_event_digest', '') !~
      '^[A-Za-z0-9_-]{43}$'
    or coalesce(p_input ->> 'claim_token', '') !~
      '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  then
    return jsonb_build_object('completed', false);
  end if;

  v_link := drs_private.drs_line_complete_account_link_v1(
    jsonb_build_object(
      'provider_channel_id', p_input ->> 'provider_channel_id',
      'nonce_digest', p_input ->> 'nonce_digest',
      'line_user_digest', p_input ->> 'line_user_digest',
      'line_user_ciphertext', p_input ->> 'line_user_ciphertext',
      'line_user_iv', p_input ->> 'line_user_iv',
      'encryption_key_version', p_input ->> 'encryption_key_version'
    )
  );
  v_outcome := v_link ->> 'state';
  if coalesce(v_outcome, '') not in (
    'linked', 'expired', 'conflict_line_already_bound',
    'conflict_drs_already_bound', 'specialist_inactive'
  ) then
    raise exception 'DRS_LINE_ATOMIC_LINK';
  end if;

  v_completion := drs_private.drs_line_complete_webhook_v1(
    jsonb_build_object(
      'webhook_event_digest', p_input ->> 'webhook_event_digest',
      'claim_token', p_input ->> 'claim_token',
      'safe_outcome', v_outcome
    )
  );
  if v_completion -> 'completed' is distinct from 'true'::jsonb
    or v_completion ->> 'safe_outcome' is distinct from v_outcome
  then
    raise exception 'DRS_LINE_ATOMIC_LINK';
  end if;
  return v_completion;
exception
  when others then
    return jsonb_build_object('completed', false);
end;
$$;

create or replace function drs_private.drs_line_enqueue_assignment_v1(
  p_assignment_id uuid,
  p_provider_channel_id text,
  p_template_version text
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_now timestamptz := clock_timestamp();
  v_assignment public.drs_case_specialist_assignments%rowtype;
  v_case public.drs_cases%rowtype;
  v_auth_binding integration.drs_auth_specialist_bindings%rowtype;
  v_binding integration.drs_line_account_bindings%rowtype;
  v_authority_current boolean := false;
  v_count integer := 0;
begin
  if p_assignment_id is null
    or coalesce(p_provider_channel_id, '') !~ '^[0-9]{1,32}$'
    or coalesce(p_template_version, '') !~ '^[A-Za-z0-9._-]{1,64}$'
  then
    return 0;
  end if;

  select assignment_record.* into v_assignment
  from public.drs_case_specialist_assignments assignment_record
  join public.drs_specialists specialist_record
    on specialist_record.specialist_id = assignment_record.specialist_id
  join public.drs_cases case_record
    on case_record.case_id = assignment_record.case_id
  where assignment_record.assignment_id = p_assignment_id
    and assignment_record.valid_from <= v_now
    and (assignment_record.valid_until is null or assignment_record.valid_until > v_now)
    and specialist_record.authority_state = 'ACTIVE'
    and case_record.case_state in ('ACTIVE_REVIEW', 'ACTIVE_CONSTRUCTION')
    and not exists (
      select 1
      from public.drs_case_specialist_assignment_terminations termination
      where termination.assignment_id = assignment_record.assignment_id
        and termination.terminated_at <= v_now
    )
  for update of assignment_record, specialist_record, case_record;
  if not found then
    return 0;
  end if;
  select * into strict v_case
  from public.drs_cases where case_id = v_assignment.case_id;

  select * into v_auth_binding
  from integration.drs_auth_specialist_bindings auth_binding
  where auth_binding.specialist_id = v_assignment.specialist_id
    and auth_binding.selected_assignment_id = v_assignment.assignment_id
    and auth_binding.authorization_subject =
      'drs-specialist:' || v_assignment.specialist_id::text
    and auth_binding.binding_status = 'active'
    and auth_binding.revoked_at is null
    and auth_binding.valid_from <= v_now
    and auth_binding.valid_until > v_now
  for update;
  if not found then
    return 0;
  end if;

  select * into v_binding
  from integration.drs_line_account_bindings binding
  where binding.specialist_id = v_assignment.specialist_id
    and binding.provider_channel_id = p_provider_channel_id
    and binding.binding_state = 'active'
  for update;
  if not found then
    return 0;
  end if;

  -- Lock acquisition can wait. Refresh the decision clock after all required
  -- authority and delivery-binding rows are locked, then repeat the complete
  -- current-authority predicate before persisting any payload.
  v_now := clock_timestamp();
  select exists (
    select 1
    from public.drs_case_specialist_assignments assignment_record
    join public.drs_specialists specialist_record
      on specialist_record.specialist_id = assignment_record.specialist_id
    join public.drs_cases case_record
      on case_record.case_id = assignment_record.case_id
    join integration.drs_auth_specialist_bindings auth_binding_record
      on auth_binding_record.binding_id = v_auth_binding.binding_id
    where assignment_record.assignment_id = v_assignment.assignment_id
      and assignment_record.case_id = v_assignment.case_id
      and assignment_record.specialist_id = v_assignment.specialist_id
      and assignment_record.valid_from <= v_now
      and (
        assignment_record.valid_until is null
        or assignment_record.valid_until > v_now
      )
      and specialist_record.authority_state = 'ACTIVE'
      and case_record.case_state in ('ACTIVE_REVIEW', 'ACTIVE_CONSTRUCTION')
      and auth_binding_record.specialist_id = v_assignment.specialist_id
      and auth_binding_record.selected_assignment_id = v_assignment.assignment_id
      and auth_binding_record.authorization_subject =
        'drs-specialist:' || v_assignment.specialist_id::text
      and auth_binding_record.binding_status = 'active'
      and auth_binding_record.revoked_at is null
      and auth_binding_record.valid_from <= v_now
      and auth_binding_record.valid_until > v_now
      and not exists (
        select 1
        from public.drs_case_specialist_assignment_terminations termination
        where termination.assignment_id = assignment_record.assignment_id
          and termination.terminated_at <= v_now
      )
  ) into v_authority_current;
  if not v_authority_current then
    return 0;
  end if;

  insert into integration.drs_line_notification_outbox (
    case_id, assignment_id, specialist_id, auth_binding_id, binding_id,
    binding_version, provider_channel_id, template_version, idempotency_key,
    case_label, case_status, next_action, case_path, delivery_state,
    attempt_count, next_attempt_at, created_at
  )
  values (
    v_assignment.case_id, v_assignment.assignment_id,
    v_assignment.specialist_id, v_auth_binding.binding_id, v_binding.binding_id,
    v_binding.binding_version, v_binding.provider_channel_id,
    p_template_version,
    'a:' || replace(v_assignment.assignment_id::text, '-', '') ||
      ':l:' || v_binding.binding_version::text ||
      ':u:' || replace(v_auth_binding.binding_id::text, '-', '') ||
      ':t:' || p_template_version,
    left('案件 ' || v_case.case_number, 80),
    case v_case.case_state
      when 'ACTIVE_REVIEW' then '審查進行中'
      else '施工追蹤中'
    end,
    '請開啟 DRS 收件匣檢視案件',
    '/pcm/console/case?caseId=' || v_assignment.case_id::text,
    'pending', 0, v_now, v_now
  )
  on conflict (idempotency_key) do nothing;

  select count(*)::integer into v_count
  from integration.drs_line_notification_outbox outbox
  where outbox.assignment_id = v_assignment.assignment_id
    and outbox.auth_binding_id = v_auth_binding.binding_id
    and outbox.provider_channel_id = p_provider_channel_id
    and outbox.template_version = p_template_version;
  return v_count;
end;
$$;

create or replace function drs_private.drs_line_assignment_producer_v1()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_binding record;
begin
  for v_binding in
    select distinct provider_channel_id
    from integration.drs_line_account_bindings
    where specialist_id = new.specialist_id and binding_state = 'active'
  loop
    perform drs_private.drs_line_enqueue_assignment_v1(
      new.assignment_id, v_binding.provider_channel_id, 'assignment-v1'
    );
  end loop;
  return new;
end;
$$;

create or replace function drs_private.drs_line_binding_producer_v1()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_assignment record;
begin
  if new.binding_state <> 'active' then
    return new;
  end if;
  for v_assignment in
    select assignment_id
    from public.drs_case_specialist_assignments
    where specialist_id = new.specialist_id
  loop
    perform drs_private.drs_line_enqueue_assignment_v1(
      v_assignment.assignment_id, new.provider_channel_id, 'assignment-v1'
    );
  end loop;
  return new;
end;
$$;

create trigger drs_line_assignment_notification_producer
  after insert on public.drs_case_specialist_assignments
  for each row execute function drs_private.drs_line_assignment_producer_v1();

create trigger drs_line_binding_notification_producer
  after insert on integration.drs_line_account_bindings
  for each row execute function drs_private.drs_line_binding_producer_v1();

create or replace function drs_private.drs_line_delivery_fence_v1()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_key uuid;
  v_claimed boolean := false;
  v_now timestamptz := clock_timestamp();
  v_suppressed integration.drs_line_notification_outbox%rowtype;
begin
  if tg_table_schema = 'integration'
    and tg_table_name = 'drs_auth_specialist_bindings'
    and tg_op = 'DELETE'
  then
    raise exception 'DRS_AUTH_BINDING_DELETE_FORBIDDEN';
  end if;

  if tg_table_schema = 'public'
    and tg_table_name = 'drs_case_specialist_assignment_terminations'
  then
    v_key := (to_jsonb(new) ->> 'assignment_id')::uuid;
    perform 1 from integration.drs_line_notification_outbox
    where assignment_id = v_key and delivery_state = 'claimed';
  elsif tg_table_schema = 'public'
    and tg_table_name = 'drs_case_specialist_assignments'
  then
    v_key := (to_jsonb(old) ->> 'assignment_id')::uuid;
    perform 1 from integration.drs_line_notification_outbox
    where assignment_id = v_key and delivery_state = 'claimed';
  elsif tg_table_schema = 'public' and tg_table_name = 'drs_specialists'
  then
    v_key := (to_jsonb(old) ->> 'specialist_id')::uuid;
    perform 1 from integration.drs_line_notification_outbox
    where specialist_id = v_key and delivery_state = 'claimed';
  elsif tg_table_schema = 'public' and tg_table_name = 'drs_cases'
  then
    v_key := (to_jsonb(old) ->> 'case_id')::uuid;
    perform 1 from integration.drs_line_notification_outbox
    where case_id = v_key and delivery_state = 'claimed';
  elsif tg_table_schema = 'integration'
    and tg_table_name = 'drs_auth_specialist_bindings'
  then
    v_key := (to_jsonb(old) ->> 'binding_id')::uuid;
    perform 1 from integration.drs_line_notification_outbox
    where auth_binding_id = v_key and delivery_state = 'claimed';
  elsif tg_table_schema = 'integration'
    and tg_table_name = 'drs_line_account_bindings'
  then
    v_key := (to_jsonb(old) ->> 'binding_id')::uuid;
    perform 1 from integration.drs_line_notification_outbox
    where binding_id = v_key and delivery_state = 'claimed';
  else
    if tg_op = 'DELETE' then return old; end if;
    return new;
  end if;
  v_claimed := found;
  if v_claimed then
    raise exception 'DRS_LINE_DELIVERY_IN_FLIGHT';
  end if;
  if tg_table_schema = 'integration'
    and tg_table_name = 'drs_auth_specialist_bindings'
  then
    for v_suppressed in
      update integration.drs_line_notification_outbox
      set delivery_state = 'suppressed', claim_token = null,
        claimed_at = null, completed_at = v_now
      where auth_binding_id = v_key
        and delivery_state in ('pending', 'retry')
      returning *
    loop
      insert into integration.drs_line_delivery_receipts (
        outbox_id, case_id, specialist_id, attempt_number, outcome,
        http_status_class, provider_request_id, reason_code, duration_ms,
        attempted_at
      ) values (
        v_suppressed.outbox_id, v_suppressed.case_id,
        v_suppressed.specialist_id,
        greatest(v_suppressed.attempt_count + 1, 1),
        'suppressed', 'none', null, 'suppressed_authority', 0, v_now
      );
      perform drs_private.drs_line_append_case_receipt_v1(
        v_suppressed.outbox_id, 'suppressed', 'suppressed_authority', v_now
      );
    end loop;
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

create trigger drs_line_assignment_termination_delivery_fence
  before insert on public.drs_case_specialist_assignment_terminations
  for each row execute function drs_private.drs_line_delivery_fence_v1();
create trigger drs_line_assignment_update_delivery_fence
  before update of valid_until on public.drs_case_specialist_assignments
  for each row when (old.valid_until is distinct from new.valid_until)
  execute function drs_private.drs_line_delivery_fence_v1();
create trigger drs_line_specialist_delivery_fence
  before update of authority_state on public.drs_specialists
  for each row when (old.authority_state is distinct from new.authority_state)
  execute function drs_private.drs_line_delivery_fence_v1();
create trigger drs_line_case_delivery_fence
  before update of case_state on public.drs_cases
  for each row when (old.case_state is distinct from new.case_state)
  execute function drs_private.drs_line_delivery_fence_v1();
create trigger drs_line_auth_binding_delivery_fence
  before update or delete
  on integration.drs_auth_specialist_bindings
  for each row execute function drs_private.drs_line_delivery_fence_v1();
create trigger drs_line_binding_revoke_delivery_fence
  before update of binding_state on integration.drs_line_account_bindings
  for each row when (old.binding_state is distinct from new.binding_state)
  execute function drs_private.drs_line_delivery_fence_v1();

create or replace function drs_private.drs_line_admit_case_notification_v1(
  p_input jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer;
begin
  if not drs_private.drs_line_exact_json_keys_v1(
    p_input, array['assignment_id', 'provider_channel_id', 'template_version']
  )
    or coalesce(p_input ->> 'provider_channel_id', '') !~ '^[0-9]{1,32}$'
    or coalesce(p_input ->> 'template_version', '') !~
      '^[A-Za-z0-9._-]{1,64}$'
  then
    return jsonb_build_object('admitted', false, 'state', 'permission_denied');
  end if;

  v_count := drs_private.drs_line_enqueue_assignment_v1(
    (p_input ->> 'assignment_id')::uuid,
    p_input ->> 'provider_channel_id',
    p_input ->> 'template_version'
  );
  return jsonb_build_object(
    'admitted', v_count > 0,
    'state', case when v_count > 0 then 'pending'
      else 'notification_pending_setup' end,
    'outbox_count', v_count
  );
exception
  when others then
    return jsonb_build_object(
      'admitted', false, 'state', 'temporarily_unavailable'
    );
end;
$$;

create or replace function drs_private.drs_line_append_case_receipt_v1(
  p_outbox_id uuid,
  p_outcome text,
  p_reason_code text,
  p_occurred_at timestamptz
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_outbox integration.drs_line_notification_outbox%rowtype;
  v_previous_event_id uuid;
  v_event_id uuid := extensions.gen_random_uuid();
begin
  select * into strict v_outbox
  from integration.drs_line_notification_outbox
  where outbox_id = p_outbox_id;
  perform 1 from public.drs_cases
  where case_id = v_outbox.case_id for update;
  select event.event_id into v_previous_event_id
  from public.drs_case_audit_events event
  where event.case_id = v_outbox.case_id
    and not exists (
      select 1 from public.drs_case_audit_events successor
      where successor.previous_event_id = event.event_id
    )
  order by event.occurred_at desc, event.event_id desc
  limit 1
  for update;
  return drs_private.insert_drs_audit_event(
    v_event_id, v_outbox.case_id, v_previous_event_id,
    'PRIVATE_LINE_NOTIFICATION',
    p_occurred_at, 'SYSTEM', 'drs-line-private-notification', 'SYSTEM',
    null, null,
    jsonb_build_object(
      'receipt_kind', 'PRIVATE_LINE_NOTIFICATION',
      'outbox_id', v_outbox.outbox_id::text,
      'outcome', p_outcome,
      'reason_code', p_reason_code,
      'binding_version', v_outbox.binding_version::text
    ), false, false
  );
end;
$$;

create or replace function drs_private.drs_line_claim_notification_v1(
  p_input jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_now timestamptz := clock_timestamp();
  v_claim_token uuid := extensions.gen_random_uuid();
  v_outbox integration.drs_line_notification_outbox%rowtype;
  v_binding integration.drs_line_account_bindings%rowtype;
  v_authority_current boolean := false;
  v_binding_current boolean := false;
begin
  if not drs_private.drs_line_exact_json_keys_v1(p_input, array[]::text[]) then
    return jsonb_build_object('admitted', false, 'state', 'permission_denied');
  end if;

  select * into v_outbox
  from integration.drs_line_notification_outbox
  where (
      delivery_state in ('pending', 'retry')
      and next_attempt_at <= v_now
      and attempt_count < 5
    ) or (
      delivery_state = 'claimed'
      and claimed_at <= v_now - interval '2 minutes'
    )
  order by next_attempt_at, created_at, outbox_id
  limit 1
  for update skip locked;

  if not found then
    return jsonb_build_object('admitted', false, 'state', 'empty');
  end if;

  if v_outbox.delivery_state = 'claimed' and v_outbox.attempt_count >= 5 then
    update integration.drs_line_notification_outbox
    set delivery_state = 'permanent_failure', claim_token = null,
      claimed_at = null, completed_at = v_now
    where outbox_id = v_outbox.outbox_id;
    insert into integration.drs_line_delivery_receipts (
      outbox_id, case_id, specialist_id, attempt_number, outcome,
      http_status_class, provider_request_id, reason_code, duration_ms,
      attempted_at
    ) values (
      v_outbox.outbox_id, v_outbox.case_id, v_outbox.specialist_id,
      v_outbox.attempt_count, 'permanent_failure', 'none', null,
      'dispatcher_claim_expired', 0, v_now
    );
    perform drs_private.drs_line_append_case_receipt_v1(
      v_outbox.outbox_id, 'permanent_failure',
      'dispatcher_claim_expired', v_now
    );
    return jsonb_build_object(
      'admitted', false, 'state', 'permanent_failure'
    );
  end if;

  perform 1
  from public.drs_case_specialist_assignments assignment_record
  join public.drs_specialists specialist_record
    on specialist_record.specialist_id = assignment_record.specialist_id
  join public.drs_cases case_record
    on case_record.case_id = assignment_record.case_id
  join integration.drs_auth_specialist_bindings auth_binding_record
    on auth_binding_record.binding_id = v_outbox.auth_binding_id
  where assignment_record.assignment_id = v_outbox.assignment_id
    and assignment_record.case_id = v_outbox.case_id
    and assignment_record.specialist_id = v_outbox.specialist_id
    and assignment_record.valid_from <= v_now
    and (assignment_record.valid_until is null or assignment_record.valid_until > v_now)
    and specialist_record.authority_state = 'ACTIVE'
    and case_record.case_state in ('ACTIVE_REVIEW', 'ACTIVE_CONSTRUCTION')
    and auth_binding_record.specialist_id = v_outbox.specialist_id
    and auth_binding_record.selected_assignment_id = v_outbox.assignment_id
    and auth_binding_record.authorization_subject =
      'drs-specialist:' || v_outbox.specialist_id::text
    and auth_binding_record.binding_status = 'active'
    and auth_binding_record.revoked_at is null
    and auth_binding_record.valid_from <= v_now
    and auth_binding_record.valid_until > v_now
    and not exists (
      select 1
      from public.drs_case_specialist_assignment_terminations termination
      where termination.assignment_id = assignment_record.assignment_id
        and termination.terminated_at <= v_now
    )
  for update of assignment_record, specialist_record, case_record,
    auth_binding_record;
  v_authority_current := found;

  select * into v_binding
  from integration.drs_line_account_bindings
  where binding_id = v_outbox.binding_id
    and specialist_id = v_outbox.specialist_id
    and provider_channel_id = v_outbox.provider_channel_id
    and binding_version = v_outbox.binding_version
    and binding_state = 'active'
  for update;
  v_binding_current := found;

  -- The required row locks may have waited past an authority deadline.
  -- Refresh the clock and recheck every current fact before exposing payload.
  v_now := clock_timestamp();
  if v_authority_current and v_binding_current then
    select exists (
      select 1
      from public.drs_case_specialist_assignments assignment_record
      join public.drs_specialists specialist_record
        on specialist_record.specialist_id = assignment_record.specialist_id
      join public.drs_cases case_record
        on case_record.case_id = assignment_record.case_id
      join integration.drs_auth_specialist_bindings auth_binding_record
        on auth_binding_record.binding_id = v_outbox.auth_binding_id
      where assignment_record.assignment_id = v_outbox.assignment_id
        and assignment_record.case_id = v_outbox.case_id
        and assignment_record.specialist_id = v_outbox.specialist_id
        and assignment_record.valid_from <= v_now
        and (
          assignment_record.valid_until is null
          or assignment_record.valid_until > v_now
        )
        and specialist_record.authority_state = 'ACTIVE'
        and case_record.case_state in ('ACTIVE_REVIEW', 'ACTIVE_CONSTRUCTION')
        and auth_binding_record.specialist_id = v_outbox.specialist_id
        and auth_binding_record.selected_assignment_id = v_outbox.assignment_id
        and auth_binding_record.authorization_subject =
          'drs-specialist:' || v_outbox.specialist_id::text
        and auth_binding_record.binding_status = 'active'
        and auth_binding_record.revoked_at is null
        and auth_binding_record.valid_from <= v_now
        and auth_binding_record.valid_until > v_now
        and not exists (
          select 1
          from public.drs_case_specialist_assignment_terminations termination
          where termination.assignment_id = assignment_record.assignment_id
            and termination.terminated_at <= v_now
        )
    ) into v_authority_current;
  end if;

  if not v_authority_current or not v_binding_current then
    update integration.drs_line_notification_outbox
    set delivery_state = 'suppressed', claim_token = null,
      claimed_at = null, completed_at = v_now
    where outbox_id = v_outbox.outbox_id;
    insert into integration.drs_line_delivery_receipts (
      outbox_id, case_id, specialist_id, attempt_number, outcome,
      http_status_class, provider_request_id, reason_code, duration_ms,
      attempted_at
    ) values (
      v_outbox.outbox_id, v_outbox.case_id, v_outbox.specialist_id,
      greatest(v_outbox.attempt_count + 1, 1), 'suppressed', 'none', null,
      'suppressed_authority', 0, v_now
    );
    perform drs_private.drs_line_append_case_receipt_v1(
      v_outbox.outbox_id, 'suppressed', 'suppressed_authority', v_now
    );
    return jsonb_build_object(
      'admitted', false,
      'state', 'suppressed_authority',
      'assignment_status', 'not_current'
    );
  end if;

  update integration.drs_line_notification_outbox
  set delivery_state = 'claimed', claim_token = v_claim_token,
    claimed_at = v_now, attempt_count = attempt_count + 1
  where outbox_id = v_outbox.outbox_id;

  return jsonb_build_object(
    'admitted', true,
    'outbox_id', v_outbox.outbox_id::text,
    'claim_token', v_claim_token::text,
    'binding_version', v_binding.binding_version::text,
    'line_user_ciphertext', v_binding.line_user_ciphertext,
    'line_user_iv', v_binding.line_user_iv,
    'encryption_key_version', v_binding.encryption_key_version,
    'case_label', v_outbox.case_label,
    'case_status', v_outbox.case_status,
    'next_action', v_outbox.next_action,
    'case_path', v_outbox.case_path
  );
exception
  when unique_violation then
    return jsonb_build_object(
      'admitted', false, 'state', 'temporarily_unavailable'
    );
  when others then
    return jsonb_build_object(
      'admitted', false, 'state', 'temporarily_unavailable'
    );
end;
$$;

create or replace function drs_private.drs_line_assert_notification_claim_v1(
  p_input jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_now timestamptz := clock_timestamp();
  v_outbox integration.drs_line_notification_outbox%rowtype;
  v_current boolean := false;
begin
  if not drs_private.drs_line_exact_json_keys_v1(
    p_input, array['outbox_id', 'claim_token']
  ) then
    return jsonb_build_object('current', false);
  end if;
  select * into v_outbox
  from integration.drs_line_notification_outbox
  where outbox_id = (p_input ->> 'outbox_id')::uuid
    and delivery_state = 'claimed'
    and claim_token = (p_input ->> 'claim_token')::uuid
  for update;
  if not found then
    return jsonb_build_object('current', false);
  end if;
  perform 1
  from public.drs_case_specialist_assignments assignment_record
  join public.drs_specialists specialist_record
    on specialist_record.specialist_id = assignment_record.specialist_id
  join public.drs_cases case_record
    on case_record.case_id = assignment_record.case_id
  join integration.drs_line_account_bindings binding
    on binding.binding_id = v_outbox.binding_id
  join integration.drs_auth_specialist_bindings auth_binding_record
    on auth_binding_record.binding_id = v_outbox.auth_binding_id
  where assignment_record.assignment_id = v_outbox.assignment_id
    and assignment_record.case_id = v_outbox.case_id
    and assignment_record.specialist_id = v_outbox.specialist_id
    and assignment_record.valid_from <= v_now
    and (assignment_record.valid_until is null or assignment_record.valid_until > v_now)
    and specialist_record.authority_state = 'ACTIVE'
    and case_record.case_state in ('ACTIVE_REVIEW', 'ACTIVE_CONSTRUCTION')
    and binding.specialist_id = v_outbox.specialist_id
    and binding.provider_channel_id = v_outbox.provider_channel_id
    and binding.binding_version = v_outbox.binding_version
    and binding.binding_state = 'active'
    and auth_binding_record.specialist_id = v_outbox.specialist_id
    and auth_binding_record.selected_assignment_id = v_outbox.assignment_id
    and auth_binding_record.authorization_subject =
      'drs-specialist:' || v_outbox.specialist_id::text
    and auth_binding_record.binding_status = 'active'
    and auth_binding_record.revoked_at is null
    and auth_binding_record.valid_from <= v_now
    and auth_binding_record.valid_until > v_now
    and not exists (
      select 1
      from public.drs_case_specialist_assignment_terminations termination
      where termination.assignment_id = assignment_record.assignment_id
        and termination.terminated_at <= v_now
    )
  for update of assignment_record, specialist_record, case_record, binding,
    auth_binding_record;
  v_current := found;
  if v_current then
    v_now := clock_timestamp();
    select exists (
      select 1
      from public.drs_case_specialist_assignments assignment_record
      join public.drs_specialists specialist_record
        on specialist_record.specialist_id = assignment_record.specialist_id
      join public.drs_cases case_record
        on case_record.case_id = assignment_record.case_id
      join integration.drs_line_account_bindings binding
        on binding.binding_id = v_outbox.binding_id
      join integration.drs_auth_specialist_bindings auth_binding_record
        on auth_binding_record.binding_id = v_outbox.auth_binding_id
      where assignment_record.assignment_id = v_outbox.assignment_id
        and assignment_record.case_id = v_outbox.case_id
        and assignment_record.specialist_id = v_outbox.specialist_id
        and assignment_record.valid_from <= v_now
        and (
          assignment_record.valid_until is null
          or assignment_record.valid_until > v_now
        )
        and specialist_record.authority_state = 'ACTIVE'
        and case_record.case_state in ('ACTIVE_REVIEW', 'ACTIVE_CONSTRUCTION')
        and binding.specialist_id = v_outbox.specialist_id
        and binding.provider_channel_id = v_outbox.provider_channel_id
        and binding.binding_version = v_outbox.binding_version
        and binding.binding_state = 'active'
        and auth_binding_record.specialist_id = v_outbox.specialist_id
        and auth_binding_record.selected_assignment_id = v_outbox.assignment_id
        and auth_binding_record.authorization_subject =
          'drs-specialist:' || v_outbox.specialist_id::text
        and auth_binding_record.binding_status = 'active'
        and auth_binding_record.revoked_at is null
        and auth_binding_record.valid_from <= v_now
        and auth_binding_record.valid_until > v_now
        and not exists (
          select 1
          from public.drs_case_specialist_assignment_terminations termination
          where termination.assignment_id = assignment_record.assignment_id
            and termination.terminated_at <= v_now
        )
    ) into v_current;
  end if;
  return jsonb_build_object('current', v_current);
exception
  when others then
    return jsonb_build_object('current', false);
end;
$$;

create or replace function drs_private.drs_line_complete_notification_v1(
  p_input jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_now timestamptz := clock_timestamp();
  v_retry_after integer;
  v_outbox integration.drs_line_notification_outbox%rowtype;
  v_next_state text;
begin
  if not drs_private.drs_line_exact_json_keys_v1(
    p_input,
    array[
      'outbox_id', 'claim_token', 'outcome', 'http_status_class',
      'provider_request_id', 'reason_code', 'duration_ms',
      'retry_after_seconds'
    ]
  )
    or coalesce(p_input ->> 'outcome', '') not in (
      'accepted', 'retryable_failure', 'permanent_failure'
    )
    or coalesce(p_input ->> 'http_status_class', '') not in (
      '2xx', '4xx', '5xx', 'none'
    )
    or coalesce(p_input ->> 'reason_code', '') !~ '^[a-z0-9_]{1,64}$'
  then
    return jsonb_build_object('completed', false);
  end if;

  select * into v_outbox
  from integration.drs_line_notification_outbox
  where outbox_id = (p_input ->> 'outbox_id')::uuid
  for update;
  if not found or v_outbox.delivery_state <> 'claimed'
    or v_outbox.claim_token <> (p_input ->> 'claim_token')::uuid
  then
    return jsonb_build_object('completed', false);
  end if;

  insert into integration.drs_line_delivery_receipts (
    outbox_id, case_id, specialist_id, attempt_number, outcome,
    http_status_class, provider_request_id, reason_code, duration_ms,
    attempted_at
  ) values (
    v_outbox.outbox_id, v_outbox.case_id, v_outbox.specialist_id,
    v_outbox.attempt_count, p_input ->> 'outcome',
    p_input ->> 'http_status_class',
    nullif(p_input ->> 'provider_request_id', ''),
    p_input ->> 'reason_code', (p_input ->> 'duration_ms')::integer, v_now
  );

  if p_input ->> 'outcome' = 'accepted' then
    v_next_state := 'accepted';
    update integration.drs_line_notification_outbox
    set delivery_state = v_next_state, claim_token = null,
      claimed_at = null, completed_at = v_now
    where outbox_id = v_outbox.outbox_id;
  elsif p_input ->> 'outcome' = 'retryable_failure'
    and v_outbox.attempt_count < 5
  then
    v_retry_after := least(
      greatest((p_input ->> 'retry_after_seconds')::integer, 5), 3600
    );
    v_next_state := 'retry';
    update integration.drs_line_notification_outbox
    set delivery_state = v_next_state, claim_token = null,
      claimed_at = null,
      next_attempt_at = v_now + make_interval(secs => v_retry_after)
    where outbox_id = v_outbox.outbox_id;
  else
    v_next_state := 'permanent_failure';
    update integration.drs_line_notification_outbox
    set delivery_state = v_next_state, claim_token = null,
      claimed_at = null, completed_at = v_now
    where outbox_id = v_outbox.outbox_id;
  end if;

  perform drs_private.drs_line_append_case_receipt_v1(
    v_outbox.outbox_id, v_next_state, p_input ->> 'reason_code', v_now
  );
  return jsonb_build_object('completed', true, 'state', v_next_state);
exception
  when unique_violation then
    return jsonb_build_object('completed', false);
  when others then
    return jsonb_build_object('completed', false);
end;
$$;

alter function drs_private.drs_line_start_link_intent_v1(jsonb)
  owner to postgres;
alter function drs_private.drs_line_read_link_status_v1(jsonb)
  owner to postgres;
alter function drs_private.drs_line_cancel_link_intent_v1(jsonb)
  owner to postgres;
alter function drs_private.drs_line_prepare_nonce_v1(jsonb)
  owner to postgres;
alter function drs_private.drs_line_complete_account_link_v1(jsonb)
  owner to postgres;
alter function drs_private.drs_line_unlink_account_v1(jsonb)
  owner to postgres;
alter function drs_private.drs_line_unlink_by_line_identity_v1(jsonb)
  owner to postgres;
alter function drs_private.drs_line_claim_webhook_v1(jsonb)
  owner to postgres;
alter function drs_private.drs_line_complete_webhook_v1(jsonb)
  owner to postgres;
alter function drs_private.drs_line_complete_account_link_event_v1(jsonb)
  owner to postgres;
alter function drs_private.drs_line_admit_case_notification_v1(jsonb)
  owner to postgres;
alter function drs_private.drs_line_claim_notification_v1(jsonb)
  owner to postgres;
alter function drs_private.drs_line_assert_notification_claim_v1(jsonb)
  owner to postgres;
alter function drs_private.drs_line_complete_notification_v1(jsonb)
  owner to postgres;
alter function drs_private.drs_line_enqueue_assignment_v1(uuid,text,text)
  owner to postgres;
alter function drs_private.drs_line_assignment_producer_v1() owner to postgres;
alter function drs_private.drs_line_binding_producer_v1() owner to postgres;
alter function drs_private.drs_line_delivery_fence_v1() owner to postgres;
alter function drs_private.drs_line_append_case_receipt_v1(uuid,text,text,timestamptz)
  owner to postgres;

revoke all on function drs_private.drs_line_start_link_intent_v1(jsonb)
  from public, anon, authenticated;
revoke all on function drs_private.drs_line_read_link_status_v1(jsonb)
  from public, anon, authenticated;
revoke all on function drs_private.drs_line_cancel_link_intent_v1(jsonb)
  from public, anon, authenticated;
revoke all on function drs_private.drs_line_prepare_nonce_v1(jsonb)
  from public, anon, authenticated;
revoke all on function drs_private.drs_line_complete_account_link_v1(jsonb)
  from public, anon, authenticated;
revoke all on function drs_private.drs_line_unlink_account_v1(jsonb)
  from public, anon, authenticated;
revoke all on function drs_private.drs_line_unlink_by_line_identity_v1(jsonb)
  from public, anon, authenticated;
revoke all on function drs_private.drs_line_claim_webhook_v1(jsonb)
  from public, anon, authenticated;
revoke all on function drs_private.drs_line_complete_webhook_v1(jsonb)
  from public, anon, authenticated;
revoke all on function drs_private.drs_line_complete_account_link_event_v1(jsonb)
  from public, anon, authenticated;
revoke all on function drs_private.drs_line_admit_case_notification_v1(jsonb)
  from public, anon, authenticated;
revoke all on function drs_private.drs_line_claim_notification_v1(jsonb)
  from public, anon, authenticated;
revoke all on function drs_private.drs_line_assert_notification_claim_v1(jsonb)
  from public, anon, authenticated;
revoke all on function drs_private.drs_line_complete_notification_v1(jsonb)
  from public, anon, authenticated;
revoke all on function drs_private.drs_line_enqueue_assignment_v1(uuid,text,text)
  from public, anon, authenticated, service_role;
revoke all on function drs_private.drs_line_assignment_producer_v1()
  from public, anon, authenticated, service_role;
revoke all on function drs_private.drs_line_binding_producer_v1()
  from public, anon, authenticated, service_role;
revoke all on function drs_private.drs_line_delivery_fence_v1()
  from public, anon, authenticated, service_role;
revoke all on function drs_private.drs_line_append_case_receipt_v1(uuid,text,text,timestamptz)
  from public, anon, authenticated, service_role;

grant execute on function drs_private.drs_line_start_link_intent_v1(jsonb)
  to service_role;
grant execute on function drs_private.drs_line_read_link_status_v1(jsonb)
  to service_role;
grant execute on function drs_private.drs_line_cancel_link_intent_v1(jsonb)
  to service_role;
grant execute on function drs_private.drs_line_prepare_nonce_v1(jsonb)
  to service_role;
grant execute on function drs_private.drs_line_complete_account_link_v1(jsonb)
  to service_role;
grant execute on function drs_private.drs_line_unlink_account_v1(jsonb)
  to service_role;
grant execute on function drs_private.drs_line_unlink_by_line_identity_v1(jsonb)
  to service_role;
grant execute on function drs_private.drs_line_claim_webhook_v1(jsonb)
  to service_role;
grant execute on function drs_private.drs_line_complete_webhook_v1(jsonb)
  to service_role;
grant execute on function drs_private.drs_line_complete_account_link_event_v1(jsonb)
  to service_role;
grant execute on function drs_private.drs_line_admit_case_notification_v1(jsonb)
  to service_role;
grant execute on function drs_private.drs_line_claim_notification_v1(jsonb)
  to service_role;
grant execute on function drs_private.drs_line_assert_notification_claim_v1(jsonb)
  to service_role;
grant execute on function drs_private.drs_line_complete_notification_v1(jsonb)
  to service_role;

-- PostgREST only exposes functions in its configured API schemas. These
-- facades expose no table and no browser authority: service_role is the sole
-- caller and every operation remains implemented by the closed private RPC.
create or replace function public.drs_line_start_link_intent_v1(p_input jsonb)
returns jsonb language sql security definer set search_path = ''
as $$ select drs_private.drs_line_start_link_intent_v1(p_input) $$;
create or replace function public.drs_line_read_link_status_v1(p_input jsonb)
returns jsonb language sql security definer set search_path = ''
as $$ select drs_private.drs_line_read_link_status_v1(p_input) $$;
create or replace function public.drs_line_cancel_link_intent_v1(p_input jsonb)
returns jsonb language sql security definer set search_path = ''
as $$ select drs_private.drs_line_cancel_link_intent_v1(p_input) $$;
create or replace function public.drs_line_prepare_nonce_v1(p_input jsonb)
returns jsonb language sql security definer set search_path = ''
as $$ select drs_private.drs_line_prepare_nonce_v1(p_input) $$;
create or replace function public.drs_line_complete_account_link_v1(p_input jsonb)
returns jsonb language sql security definer set search_path = ''
as $$ select drs_private.drs_line_complete_account_link_v1(p_input) $$;
create or replace function public.drs_line_unlink_account_v1(p_input jsonb)
returns jsonb language sql security definer set search_path = ''
as $$ select drs_private.drs_line_unlink_account_v1(p_input) $$;
create or replace function public.drs_line_unlink_by_line_identity_v1(p_input jsonb)
returns jsonb language sql security definer set search_path = ''
as $$ select drs_private.drs_line_unlink_by_line_identity_v1(p_input) $$;
create or replace function public.drs_line_claim_webhook_v1(p_input jsonb)
returns jsonb language sql security definer set search_path = ''
as $$ select drs_private.drs_line_claim_webhook_v1(p_input) $$;
create or replace function public.drs_line_complete_webhook_v1(p_input jsonb)
returns jsonb language sql security definer set search_path = ''
as $$ select drs_private.drs_line_complete_webhook_v1(p_input) $$;
create or replace function public.drs_line_complete_account_link_event_v1(
  p_input jsonb
)
returns jsonb language sql security definer set search_path = ''
as $$ select drs_private.drs_line_complete_account_link_event_v1(p_input) $$;
create or replace function public.drs_line_admit_case_notification_v1(p_input jsonb)
returns jsonb language sql security definer set search_path = ''
as $$ select drs_private.drs_line_admit_case_notification_v1(p_input) $$;
create or replace function public.drs_line_claim_notification_v1(p_input jsonb)
returns jsonb language sql security definer set search_path = ''
as $$ select drs_private.drs_line_claim_notification_v1(p_input) $$;
create or replace function public.drs_line_assert_notification_claim_v1(p_input jsonb)
returns jsonb language sql security definer set search_path = ''
as $$ select drs_private.drs_line_assert_notification_claim_v1(p_input) $$;
create or replace function public.drs_line_complete_notification_v1(p_input jsonb)
returns jsonb language sql security definer set search_path = ''
as $$ select drs_private.drs_line_complete_notification_v1(p_input) $$;

alter function public.drs_line_start_link_intent_v1(jsonb) owner to postgres;
alter function public.drs_line_read_link_status_v1(jsonb) owner to postgres;
alter function public.drs_line_cancel_link_intent_v1(jsonb) owner to postgres;
alter function public.drs_line_prepare_nonce_v1(jsonb) owner to postgres;
alter function public.drs_line_complete_account_link_v1(jsonb) owner to postgres;
alter function public.drs_line_unlink_account_v1(jsonb) owner to postgres;
alter function public.drs_line_unlink_by_line_identity_v1(jsonb) owner to postgres;
alter function public.drs_line_claim_webhook_v1(jsonb) owner to postgres;
alter function public.drs_line_complete_webhook_v1(jsonb) owner to postgres;
alter function public.drs_line_complete_account_link_event_v1(jsonb)
  owner to postgres;
alter function public.drs_line_admit_case_notification_v1(jsonb) owner to postgres;
alter function public.drs_line_claim_notification_v1(jsonb) owner to postgres;
alter function public.drs_line_assert_notification_claim_v1(jsonb) owner to postgres;
alter function public.drs_line_complete_notification_v1(jsonb) owner to postgres;

revoke all on function public.drs_line_start_link_intent_v1(jsonb)
  from public, anon, authenticated;
revoke all on function public.drs_line_read_link_status_v1(jsonb)
  from public, anon, authenticated;
revoke all on function public.drs_line_cancel_link_intent_v1(jsonb)
  from public, anon, authenticated;
revoke all on function public.drs_line_prepare_nonce_v1(jsonb)
  from public, anon, authenticated;
revoke all on function public.drs_line_complete_account_link_v1(jsonb)
  from public, anon, authenticated;
revoke all on function public.drs_line_unlink_account_v1(jsonb)
  from public, anon, authenticated;
revoke all on function public.drs_line_unlink_by_line_identity_v1(jsonb)
  from public, anon, authenticated;
revoke all on function public.drs_line_claim_webhook_v1(jsonb)
  from public, anon, authenticated;
revoke all on function public.drs_line_complete_webhook_v1(jsonb)
  from public, anon, authenticated;
revoke all on function public.drs_line_complete_account_link_event_v1(jsonb)
  from public, anon, authenticated;
revoke all on function public.drs_line_admit_case_notification_v1(jsonb)
  from public, anon, authenticated;
revoke all on function public.drs_line_claim_notification_v1(jsonb)
  from public, anon, authenticated;
revoke all on function public.drs_line_assert_notification_claim_v1(jsonb)
  from public, anon, authenticated;
revoke all on function public.drs_line_complete_notification_v1(jsonb)
  from public, anon, authenticated;

grant execute on function public.drs_line_start_link_intent_v1(jsonb)
  to service_role;
grant execute on function public.drs_line_read_link_status_v1(jsonb)
  to service_role;
grant execute on function public.drs_line_cancel_link_intent_v1(jsonb)
  to service_role;
grant execute on function public.drs_line_prepare_nonce_v1(jsonb)
  to service_role;
grant execute on function public.drs_line_complete_account_link_v1(jsonb)
  to service_role;
grant execute on function public.drs_line_unlink_account_v1(jsonb)
  to service_role;
grant execute on function public.drs_line_unlink_by_line_identity_v1(jsonb)
  to service_role;
grant execute on function public.drs_line_claim_webhook_v1(jsonb)
  to service_role;
grant execute on function public.drs_line_complete_webhook_v1(jsonb)
  to service_role;
grant execute on function public.drs_line_complete_account_link_event_v1(jsonb)
  to service_role;
grant execute on function public.drs_line_admit_case_notification_v1(jsonb)
  to service_role;
grant execute on function public.drs_line_claim_notification_v1(jsonb)
  to service_role;
grant execute on function public.drs_line_assert_notification_claim_v1(jsonb)
  to service_role;
grant execute on function public.drs_line_complete_notification_v1(jsonb)
  to service_role;

commit;
