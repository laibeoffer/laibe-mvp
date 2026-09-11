begin;

set local lock_timeout = '5s';
set local statement_timeout = '120s';

-- REAPPLY_MODE=FAIL_CLOSED_NOT_IDEMPOTENT
-- Supported source states are exactly FRESH_TARGET and the tracked, empty
-- 20260831050535 W1 footprint (LEGACY_W1_EXACT). Everything else is
-- UNKNOWN_LINE_DRIFT and aborts this transaction before target DDL.
do $preflight$
declare
  v_missing text[] := array[]::text[];
  v_name text;
  v_line_table_count integer;
  v_w1_public_count integer;
  v_w1_private_count integer;
  v_w1_trigger_count integer;
  v_w1_exact boolean := false;
begin
  if not exists (select 1 from pg_catalog.pg_roles where rolname = 'postgres') then
    v_missing := array_append(v_missing, 'role:postgres');
  end if;
  foreach v_name in array array['anon', 'authenticated', 'service_role'] loop
    if not exists (select 1 from pg_catalog.pg_roles where rolname = v_name) then
      v_missing := array_append(v_missing, 'role:' || v_name);
    end if;
  end loop;
  foreach v_name in array array['integration', 'drs_forward_private', 'casework', 'auth'] loop
    if not exists (select 1 from pg_catalog.pg_namespace where nspname = v_name) then
      v_missing := array_append(v_missing, 'schema:' || v_name);
    end if;
  end loop;
  foreach v_name in array array[
    'auth.users',
    'casework.cases',
    'casework.case_members',
    'drs_forward_private.specialists',
    'drs_forward_private.auth_specialist_bindings',
    'drs_forward_private.reviewer_case_authorities'
  ] loop
    if pg_catalog.to_regclass(v_name) is null then
      v_missing := array_append(v_missing, 'table:' || v_name);
    end if;
  end loop;
  if pg_catalog.to_regprocedure(
    'drs_forward_private.drs_password_authority_resolve_locked_v1(uuid,uuid,text)'
  ) is null then
    v_missing := array_append(
      v_missing,
      'function:drs_forward_private.drs_password_authority_resolve_locked_v1(uuid,uuid,text)'
    );
  end if;

  -- Bind to the current Core row shape; this migration never alters it.
  foreach v_name in array array[
    'case_id', 'user_id', 'role', 'added_by', 'added_at'
  ] loop
    if not exists (
      select 1
      from pg_catalog.pg_attribute a
      join pg_catalog.pg_class c on c.oid = a.attrelid
      join pg_catalog.pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'casework' and c.relname = 'case_members'
        and a.attname = v_name and a.attnum > 0 and not a.attisdropped
    ) then
      v_missing := array_append(v_missing, 'case_members:' || v_name);
    end if;
  end loop;
  if (
    select pg_catalog.array_agg(a.attname::text order by a.attnum)
    from pg_catalog.pg_attribute a
    where a.attrelid = pg_catalog.to_regclass('casework.case_members')
      and a.attnum > 0 and not a.attisdropped
  ) is distinct from array['case_id', 'user_id', 'role', 'added_by', 'added_at']
  then
    v_missing := array_append(v_missing, 'case_members:exact_shape');
  end if;
  if (
    select pg_catalog.array_agg(a.attname::text order by key_column.ordinality)
    from pg_catalog.pg_index i
    cross join lateral pg_catalog.unnest(i.indkey::smallint[])
      with ordinality as key_column(attnum, ordinality)
    join pg_catalog.pg_attribute a
      on a.attrelid = i.indrelid and a.attnum = key_column.attnum
    where i.indrelid = pg_catalog.to_regclass('casework.case_members')
      and i.indisprimary
  ) is distinct from array['case_id', 'user_id']
  then
    v_missing := array_append(v_missing, 'case_members:primary_key(case_id,user_id)');
  end if;
  if (
    select pg_catalog.array_agg(e.enumlabel::text order by e.enumsortorder)
    from pg_catalog.pg_attribute a
    join pg_catalog.pg_type t on t.oid = a.atttypid and t.typtype = 'e'
    join pg_catalog.pg_enum e on e.enumtypid = t.oid
    where a.attrelid = pg_catalog.to_regclass('casework.case_members')
      and a.attname = 'role' and a.attnum > 0 and not a.attisdropped
  ) is distinct from array['owner', 'pro', 'pcm', 'admin']
  then
    v_missing := array_append(v_missing, 'case_members:role_enum(owner,pro,pcm,admin)');
  end if;

  if pg_catalog.array_length(v_missing, 1) is not null then
    raise exception 'DRS_LINE_ACCOUNT_LINK_V2_PREREQUISITE_MISSING:%',
      pg_catalog.array_to_string(v_missing, ',');
  end if;

  select pg_catalog.count(*) into v_line_table_count
  from pg_catalog.pg_class c
  join pg_catalog.pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'integration' and c.relkind in ('r', 'p')
    and c.relname in (
      'drs_line_account_link_intents', 'drs_line_account_bindings',
      'drs_line_binding_audit', 'drs_line_webhook_events',
      'drs_line_notification_outbox', 'drs_line_delivery_receipts'
    );
  select pg_catalog.count(*) into v_w1_public_count
  from pg_catalog.unnest(array[
    'drs_line_start_link_intent_v1', 'drs_line_read_link_status_v1',
    'drs_line_cancel_link_intent_v1', 'drs_line_prepare_nonce_v1',
    'drs_line_complete_account_link_v1', 'drs_line_unlink_account_v1',
    'drs_line_unlink_by_line_identity_v1', 'drs_line_claim_webhook_v1',
    'drs_line_complete_webhook_v1', 'drs_line_complete_account_link_event_v1',
    'drs_line_admit_case_notification_v1', 'drs_line_claim_notification_v1',
    'drs_line_assert_notification_claim_v1', 'drs_line_complete_notification_v1'
  ]) as f(name)
  where pg_catalog.to_regprocedure('public.' || f.name || '(jsonb)') is not null;
  select pg_catalog.count(*) into v_w1_private_count
  from pg_catalog.unnest(array[
    'drs_line_exact_json_keys_v1(jsonb,text[])',
    'drs_line_authority_matches_v1(jsonb)',
    'drs_line_start_link_intent_v1(jsonb)',
    'drs_line_read_link_status_v1(jsonb)',
    'drs_line_unlink_by_line_identity_v1(jsonb)',
    'drs_line_cancel_link_intent_v1(jsonb)',
    'drs_line_prepare_nonce_v1(jsonb)',
    'drs_line_complete_account_link_v1(jsonb)',
    'drs_line_unlink_account_v1(jsonb)',
    'drs_line_claim_webhook_v1(jsonb)',
    'drs_line_complete_webhook_v1(jsonb)',
    'drs_line_complete_account_link_event_v1(jsonb)',
    'drs_line_enqueue_assignment_v1(uuid,text,text)',
    'drs_line_assignment_producer_v1()',
    'drs_line_binding_producer_v1()',
    'drs_line_delivery_fence_v1()',
    'drs_line_admit_case_notification_v1(jsonb)',
    'drs_line_append_case_receipt_v1(uuid,text,text,timestamptz)',
    'drs_line_claim_notification_v1(jsonb)',
    'drs_line_assert_notification_claim_v1(jsonb)',
    'drs_line_complete_notification_v1(jsonb)'
  ]) as f(signature)
  where pg_catalog.to_regprocedure('drs_private.' || f.signature) is not null;
  select pg_catalog.count(*) into v_w1_trigger_count
  from (values
    ('drs_line_binding_audit_append_only', 'integration', 'drs_line_binding_audit'),
    ('drs_line_delivery_receipts_append_only', 'integration', 'drs_line_delivery_receipts'),
    ('drs_line_assignment_notification_producer', 'public', 'drs_case_specialist_assignments'),
    ('drs_line_binding_notification_producer', 'integration', 'drs_line_account_bindings'),
    ('drs_line_assignment_termination_delivery_fence', 'public', 'drs_case_specialist_assignment_terminations'),
    ('drs_line_assignment_update_delivery_fence', 'public', 'drs_case_specialist_assignments'),
    ('drs_line_specialist_delivery_fence', 'public', 'drs_specialists'),
    ('drs_line_case_delivery_fence', 'public', 'drs_cases'),
    ('drs_line_auth_binding_delivery_fence', 'integration', 'drs_auth_specialist_bindings'),
    ('drs_line_binding_revoke_delivery_fence', 'integration', 'drs_line_account_bindings')
  ) as expected(trigger_name, schema_name, relation_name)
  join pg_catalog.pg_namespace n on n.nspname = expected.schema_name
  join pg_catalog.pg_class c
    on c.relnamespace = n.oid and c.relname = expected.relation_name
  join pg_catalog.pg_trigger t
    on t.tgrelid = c.oid and t.tgname = expected.trigger_name and not t.tgisinternal;

  v_w1_exact := v_line_table_count = 6
    and v_w1_public_count = 14 and v_w1_private_count = 21
    and v_w1_trigger_count = 10
    and pg_catalog.to_regprocedure('integration.drs_line_append_only_v1()') is not null
    and exists (
      select 1 from pg_catalog.pg_attribute a
      where a.attrelid = pg_catalog.to_regclass('integration.drs_line_account_link_intents')
        and a.attname = 'assignment_id' and a.attnum > 0 and not a.attisdropped
    )
    and not exists (
      select 1 from pg_catalog.pg_attribute a
      where a.attrelid = pg_catalog.to_regclass('integration.drs_line_account_link_intents')
        and a.attname = 'authority_id' and a.attnum > 0 and not a.attisdropped
    )
    and exists (
      select 1 from pg_catalog.pg_attribute a
      where a.attrelid = pg_catalog.to_regclass('integration.drs_line_webhook_events')
        and a.attname = 'webhook_event_digest' and a.attnum > 0 and not a.attisdropped
    )
    and (
      select pg_catalog.array_agg(a.attname::text order by a.attnum)
      from pg_catalog.pg_attribute a
      where a.attrelid = pg_catalog.to_regclass('integration.drs_line_account_link_intents')
        and a.attnum > 0 and not a.attisdropped
    ) = array[
      'intent_id', 'authenticated_user_id', 'specialist_id', 'assignment_id',
      'selected_case_id', 'authorization_subject', 'provider_channel_id',
      'bot_launch_url', 'intent_state', 'nonce_digest', 'nonce_expires_at',
      'created_at', 'expires_at', 'consumed_at', 'cancelled_at', 'failed_at'
    ]
    and (
      select pg_catalog.array_agg(a.attname::text order by a.attnum)
      from pg_catalog.pg_attribute a
      where a.attrelid = pg_catalog.to_regclass('integration.drs_line_account_bindings')
        and a.attnum > 0 and not a.attisdropped
    ) = array[
      'binding_id', 'binding_version', 'specialist_id', 'provider_channel_id',
      'line_user_digest', 'line_user_ciphertext', 'line_user_iv',
      'encryption_key_version', 'binding_state', 'linked_at', 'revoked_at'
    ]
    and (
      select pg_catalog.array_agg(a.attname::text order by a.attnum)
      from pg_catalog.pg_attribute a
      where a.attrelid = pg_catalog.to_regclass('integration.drs_line_webhook_events')
        and a.attnum > 0 and not a.attisdropped
    ) = array[
      'webhook_event_digest', 'event_kind', 'processing_state', 'safe_outcome',
      'claim_token', 'provider_retry_key', 'attempt_count', 'first_seen_at',
      'claimed_at', 'completed_at'
    ];

  if v_line_table_count = 0 and v_w1_public_count = 0 and v_w1_private_count = 0
    and v_w1_trigger_count = 0
    and pg_catalog.to_regprocedure('integration.drs_line_append_only_v1()') is null
    and not exists (select 1 from pg_catalog.pg_namespace where nspname = 'drs_line_private')
  then
    perform pg_catalog.set_config('laibe.drs_line_exact3_source', 'FRESH_TARGET', true);
  elsif v_w1_exact then
    if exists (select 1 from integration.drs_line_account_link_intents)
      or exists (select 1 from integration.drs_line_account_bindings)
      or exists (select 1 from integration.drs_line_binding_audit)
      or exists (select 1 from integration.drs_line_webhook_events)
      or exists (select 1 from integration.drs_line_notification_outbox)
      or exists (select 1 from integration.drs_line_delivery_receipts)
    then
      raise exception 'DRS_LINE_ACCOUNT_LINK_V2_LEGACY_W1_DATA_REQUIRES_EXPLICIT_CONVERGENCE';
    end if;
    perform pg_catalog.set_config('laibe.drs_line_exact3_source', 'LEGACY_W1_EXACT', true);
  else
    raise exception 'DRS_LINE_ACCOUNT_LINK_V2_UNKNOWN_LINE_DRIFT';
  end if;
end;
$preflight$;

do $legacy_w1_cleanup$
begin
  if pg_catalog.current_setting('laibe.drs_line_exact3_source', true) = 'LEGACY_W1_EXACT' then
    drop trigger drs_line_assignment_notification_producer on public.drs_case_specialist_assignments;
    drop trigger drs_line_assignment_termination_delivery_fence on public.drs_case_specialist_assignment_terminations;
    drop trigger drs_line_assignment_update_delivery_fence on public.drs_case_specialist_assignments;
    drop trigger drs_line_specialist_delivery_fence on public.drs_specialists;
    drop trigger drs_line_case_delivery_fence on public.drs_cases;
    drop trigger drs_line_auth_binding_delivery_fence on integration.drs_auth_specialist_bindings;
    drop trigger drs_line_binding_notification_producer on integration.drs_line_account_bindings;
    drop trigger drs_line_binding_revoke_delivery_fence on integration.drs_line_account_bindings;
    drop trigger drs_line_binding_audit_append_only on integration.drs_line_binding_audit;
    drop trigger drs_line_delivery_receipts_append_only on integration.drs_line_delivery_receipts;

    drop function public.drs_line_start_link_intent_v1(jsonb);
    drop function public.drs_line_read_link_status_v1(jsonb);
    drop function public.drs_line_cancel_link_intent_v1(jsonb);
    drop function public.drs_line_prepare_nonce_v1(jsonb);
    drop function public.drs_line_complete_account_link_v1(jsonb);
    drop function public.drs_line_unlink_account_v1(jsonb);
    drop function public.drs_line_unlink_by_line_identity_v1(jsonb);
    drop function public.drs_line_claim_webhook_v1(jsonb);
    drop function public.drs_line_complete_webhook_v1(jsonb);
    drop function public.drs_line_complete_account_link_event_v1(jsonb);
    drop function public.drs_line_admit_case_notification_v1(jsonb);
    drop function public.drs_line_claim_notification_v1(jsonb);
    drop function public.drs_line_assert_notification_claim_v1(jsonb);
    drop function public.drs_line_complete_notification_v1(jsonb);

    drop function drs_private.drs_line_start_link_intent_v1(jsonb);
    drop function drs_private.drs_line_read_link_status_v1(jsonb);
    drop function drs_private.drs_line_cancel_link_intent_v1(jsonb);
    drop function drs_private.drs_line_prepare_nonce_v1(jsonb);
    drop function drs_private.drs_line_complete_account_link_v1(jsonb);
    drop function drs_private.drs_line_unlink_account_v1(jsonb);
    drop function drs_private.drs_line_unlink_by_line_identity_v1(jsonb);
    drop function drs_private.drs_line_claim_webhook_v1(jsonb);
    drop function drs_private.drs_line_complete_webhook_v1(jsonb);
    drop function drs_private.drs_line_complete_account_link_event_v1(jsonb);
    drop function drs_private.drs_line_admit_case_notification_v1(jsonb);
    drop function drs_private.drs_line_claim_notification_v1(jsonb);
    drop function drs_private.drs_line_assert_notification_claim_v1(jsonb);
    drop function drs_private.drs_line_complete_notification_v1(jsonb);
    drop function drs_private.drs_line_enqueue_assignment_v1(uuid,text,text);
    drop function drs_private.drs_line_assignment_producer_v1();
    drop function drs_private.drs_line_binding_producer_v1();
    drop function drs_private.drs_line_delivery_fence_v1();
    drop function drs_private.drs_line_append_case_receipt_v1(uuid,text,text,timestamptz);
    drop function drs_private.drs_line_authority_matches_v1(jsonb);
    drop function drs_private.drs_line_exact_json_keys_v1(jsonb,text[]);
    drop function integration.drs_line_append_only_v1();

    drop table integration.drs_line_delivery_receipts;
    drop table integration.drs_line_notification_outbox;
    drop table integration.drs_line_binding_audit;
    drop table integration.drs_line_webhook_events;
    drop table integration.drs_line_account_bindings;
    drop table integration.drs_line_account_link_intents;
  end if;
end;
$legacy_w1_cleanup$;

create schema drs_line_private authorization postgres;

create table integration.drs_line_account_link_intents (
  intent_id uuid primary key default gen_random_uuid(),
  authenticated_user_id uuid not null,
  specialist_id uuid not null,
  authority_id uuid not null,
  selected_case_id uuid not null,
  authorization_subject text not null,
  provider_channel_id text not null,
  bot_launch_url text not null,
  intent_state text not null default 'pending',
  nonce_digest text,
  nonce_expires_at timestamptz,
  created_at timestamptz not null default clock_timestamp(),
  expires_at timestamptz not null,
  linked_at timestamptz,
  cancelled_at timestamptz,
  failed_at timestamptz,
  consumed_at timestamptz,
  foreign key (authenticated_user_id) references auth.users(id),
  foreign key (specialist_id) references drs_forward_private.specialists(specialist_id),
  foreign key (authority_id) references drs_forward_private.reviewer_case_authorities(authority_id),
  foreign key (selected_case_id) references casework.cases(id),
  constraint drs_line_intent_provider_ck check (provider_channel_id ~ '^[0-9]{1,32}$'),
  constraint drs_line_intent_subject_ck check (
    authorization_subject = 'drs-specialist:' || specialist_id::text
  ),
  constraint drs_line_intent_url_ck check (
    bot_launch_url ~ '^https://([a-z0-9-]+\.)*line\.me/'
    and char_length(bot_launch_url) <= 512
  ),
  constraint drs_line_intent_state_ck check (
    intent_state in (
      'pending', 'nonce_ready', 'linked', 'expired', 'cancelled',
      'conflict_line_already_bound', 'conflict_drs_already_bound',
      'specialist_inactive'
    )
  ),
  constraint drs_line_intent_digest_ck check (
    nonce_digest is null
    or (char_length(nonce_digest) = 43 and nonce_digest ~ '^[A-Za-z0-9_-]{43}$')
  ),
  constraint drs_line_intent_expiry_ck check (
    expires_at > created_at and expires_at <= created_at + interval '15 minutes'
  ),
  constraint drs_line_intent_nonce_expiry_ck check (
    (nonce_digest is null and nonce_expires_at is null)
    or (
      nonce_digest is not null and nonce_expires_at is not null
      and nonce_expires_at > created_at
      and nonce_expires_at <= expires_at
      and nonce_expires_at <= created_at + interval '10 minutes'
    )
  ),
  constraint drs_line_intent_terminal_ck check (
    case
      when intent_state = 'pending' then
        consumed_at is null and linked_at is null and cancelled_at is null
        and failed_at is null and nonce_digest is null and nonce_expires_at is null
      when intent_state = 'nonce_ready' then
        consumed_at is null and linked_at is null and cancelled_at is null
        and failed_at is null and nonce_digest is not null and nonce_expires_at is not null
      when intent_state = 'linked' then
        consumed_at is not null and linked_at is not null and cancelled_at is null
        and failed_at is null and nonce_digest is null and nonce_expires_at is null
      when intent_state = 'cancelled' then
        consumed_at is not null and linked_at is null and cancelled_at is not null
        and failed_at is null and nonce_digest is null and nonce_expires_at is null
      else
        consumed_at is not null and linked_at is null and cancelled_at is null
        and failed_at is not null and nonce_digest is null and nonce_expires_at is null
    end
  )
);

create table integration.drs_line_account_bindings (
  binding_id uuid primary key default gen_random_uuid(),
  authenticated_user_id uuid not null,
  specialist_id uuid not null,
  authority_id uuid not null,
  selected_case_id uuid not null,
  authorization_subject text not null,
  source_intent_id uuid not null,
  provider_channel_id text not null,
  line_user_digest text not null,
  line_user_ciphertext text not null,
  line_user_iv text not null,
  encryption_key_version text not null,
  binding_state text not null default 'active',
  binding_version bigint not null,
  linked_at timestamptz not null,
  revoked_at timestamptz,
  foreign key (authenticated_user_id) references auth.users(id),
  foreign key (specialist_id) references drs_forward_private.specialists(specialist_id),
  foreign key (authority_id) references drs_forward_private.reviewer_case_authorities(authority_id),
  foreign key (selected_case_id) references casework.cases(id),
  foreign key (source_intent_id) references integration.drs_line_account_link_intents(intent_id),
  constraint drs_line_binding_provider_ck check (provider_channel_id ~ '^[0-9]{1,32}$'),
  constraint drs_line_binding_subject_ck check (
    authorization_subject = 'drs-specialist:' || specialist_id::text
  ),
  constraint drs_line_binding_digest_ck check (
    char_length(line_user_digest) = 43
    and line_user_digest ~ '^[A-Za-z0-9_-]{43}$'
  ),
  constraint drs_line_binding_ciphertext_ck check (
    char_length(line_user_ciphertext) between 24 and 1024
    and line_user_ciphertext ~ '^[A-Za-z0-9_-]+$'
  ),
  constraint drs_line_binding_iv_ck check (
    char_length(line_user_iv) = 16 and line_user_iv ~ '^[A-Za-z0-9_-]{16}$'
  ),
  constraint drs_line_binding_key_version_ck check (
    encryption_key_version ~ '^[A-Za-z0-9._-]{1,64}$'
  ),
  constraint drs_line_binding_version_ck check (binding_version > 0),
  constraint drs_line_binding_state_ck check (binding_state in ('active', 'revoked')),
  constraint drs_line_binding_terminal_ck check (
    (binding_state = 'active' and revoked_at is null)
    or (binding_state = 'revoked' and revoked_at is not null and revoked_at >= linked_at)
  )
);

create table integration.drs_line_binding_audit (
  audit_id uuid not null default gen_random_uuid(),
  specialist_id uuid not null,
  intent_id uuid,
  binding_id uuid,
  event_type text not null,
  safe_outcome text not null,
  safe_payload jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default clock_timestamp(),
  foreign key (specialist_id) references drs_forward_private.specialists(specialist_id),
  foreign key (intent_id) references integration.drs_line_account_link_intents(intent_id),
  foreign key (binding_id) references integration.drs_line_account_bindings(binding_id),
  constraint drs_line_audit_event_ck check (
    event_type in ('start', 'nonce_ready', 'linked', 'cancelled', 'expired', 'conflict', 'denied', 'revoked')
  ),
  constraint drs_line_audit_outcome_ck check (
    safe_outcome in (
      'awaiting_line_confirmation', 'linked', 'cancelled', 'expired',
      'conflict_line_already_bound', 'conflict_drs_already_bound',
      'specialist_inactive', 'revoked'
    )
  ),
  constraint drs_line_audit_reference_ck check (intent_id is not null or binding_id is not null),
  constraint drs_line_audit_payload_ck check (
    jsonb_typeof(safe_payload) = 'object'
    and not (safe_payload ?| array[
      'line_user_digest', 'line_user_ciphertext', 'line_user_iv',
      'nonce_digest', 'authenticated_user_id', 'authorization_subject'
    ])
  )
);

create table integration.drs_line_webhook_events (
  webhook_digest text primary key,
  event_kind text not null,
  processing_state text not null,
  claim_token uuid not null,
  provider_retry_key uuid not null,
  attempt_count smallint not null default 1,
  safe_outcome text,
  first_received_at timestamptz not null default clock_timestamp(),
  claimed_at timestamptz not null,
  completed_at timestamptz,
  updated_at timestamptz not null,
  constraint drs_line_webhook_digest_ck check (
    char_length(webhook_digest) = 43 and webhook_digest ~ '^[A-Za-z0-9_-]{43}$'
  ),
  constraint drs_line_webhook_kind_ck check (
    event_kind in ('binding_action', 'unlink_action', 'account_link', 'verify')
  ),
  constraint drs_line_webhook_attempt_ck check (
    attempt_count >= 1 and attempt_count <= 12
  ),
  constraint drs_line_webhook_state_ck check (processing_state in ('processing', 'completed')),
  constraint drs_line_webhook_outcome_ck check (
    safe_outcome is null or safe_outcome in (
      'verified', 'link_token_replied', 'linked', 'expired',
      'conflict_line_already_bound', 'conflict_drs_already_bound',
      'specialist_inactive', 'ignored', 'failed', 'not_linked', 'revoked',
      'temporarily_unavailable'
    )
  ),
  constraint drs_line_webhook_terminal_ck check (
    (processing_state = 'processing' and safe_outcome is null and completed_at is null)
    or (processing_state = 'completed' and safe_outcome is not null and completed_at is not null)
  ),
  constraint drs_line_webhook_time_ck check (
    claimed_at >= first_received_at and updated_at >= first_received_at
    and (completed_at is null or completed_at >= first_received_at)
  )
);

create unique index drs_line_intents_active_specialist_uq
  on integration.drs_line_account_link_intents (provider_channel_id, specialist_id)
  where intent_state in ('pending', 'nonce_ready');
create unique index drs_line_intents_nonce_uq
  on integration.drs_line_account_link_intents (nonce_digest)
  where nonce_digest is not null;
create unique index drs_line_bindings_active_specialist_uq
  on integration.drs_line_account_bindings (provider_channel_id, specialist_id)
  where binding_state = 'active';
create unique index drs_line_bindings_active_identity_uq
  on integration.drs_line_account_bindings (provider_channel_id, line_user_digest)
  where binding_state = 'active';
create index drs_line_audit_specialist_time_idx
  on integration.drs_line_binding_audit (specialist_id, occurred_at desc);

alter table integration.drs_line_account_link_intents enable row level security;
alter table integration.drs_line_account_link_intents force row level security;
alter table integration.drs_line_account_bindings enable row level security;
alter table integration.drs_line_account_bindings force row level security;
alter table integration.drs_line_binding_audit enable row level security;
alter table integration.drs_line_binding_audit force row level security;
alter table integration.drs_line_webhook_events enable row level security;
alter table integration.drs_line_webhook_events force row level security;

create policy drs_line_account_link_intents_deny_all
  on integration.drs_line_account_link_intents for all to public
  using (false) with check (false);
create policy drs_line_account_bindings_deny_all
  on integration.drs_line_account_bindings for all to public
  using (false) with check (false);
create policy drs_line_binding_audit_deny_all
  on integration.drs_line_binding_audit for all to public
  using (false) with check (false);
create policy drs_line_webhook_events_deny_all
  on integration.drs_line_webhook_events for all to public
  using (false) with check (false);

revoke all on table integration.drs_line_account_link_intents from public, anon, authenticated, service_role;
revoke all on table integration.drs_line_account_bindings from public, anon, authenticated, service_role;
revoke all on table integration.drs_line_binding_audit from public, anon, authenticated, service_role;
revoke all on table integration.drs_line_webhook_events from public, anon, authenticated, service_role;

create function drs_line_private.drs_line_append_only_v2()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
begin
  raise exception 'DRS_LINE_BINDING_AUDIT_APPEND_ONLY';
end;
$function$;

create trigger drs_line_binding_audit_append_only
before update or delete on integration.drs_line_binding_audit
for each row execute function drs_line_private.drs_line_append_only_v2();

create function drs_line_private.drs_line_exact_json_keys_v2(
  p_input jsonb,
  p_expected text[]
)
returns boolean
language plpgsql
immutable
security definer
set search_path = ''
as $function$
declare
  v_actual text[];
  v_expected text[];
begin
  if p_input is null or pg_catalog.jsonb_typeof(p_input) <> 'object' then
    return false;
  end if;
  select coalesce(pg_catalog.array_agg(k order by k), array[]::text[])
    into v_actual from pg_catalog.jsonb_object_keys(p_input) as keys(k);
  select coalesce(pg_catalog.array_agg(k order by k), array[]::text[])
    into v_expected from pg_catalog.unnest(p_expected) as keys(k);
  return v_actual = v_expected;
exception when others then
  return false;
end;
$function$;

create function drs_line_private.drs_line_resolve_authority_v2(p_input jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_user_id uuid;
  v_specialist_id uuid;
  v_case_id uuid;
  v_subject text;
  v_authority jsonb;
  v_authority_id uuid;
  v_granted_by uuid;
  v_membership casework.case_members%rowtype;
begin
  v_user_id := (p_input ->> 'authenticated_user_id')::uuid;
  v_specialist_id := (p_input ->> 'specialist_id')::uuid;
  v_case_id := (p_input ->> 'selected_case_id')::uuid;
  v_subject := p_input ->> 'authorization_subject';
  if v_subject is distinct from 'drs-specialist:' || v_specialist_id::text then
    return null;
  end if;

  v_authority := drs_forward_private.drs_password_authority_resolve_locked_v1(
    v_user_id, v_case_id, v_subject
  );
  if v_authority -> 'authorized' is distinct from 'true'::jsonb then
    return null;
  end if;
  v_authority_id := (v_authority ->> 'assignment_id')::uuid;
  if (v_authority ->> 'authenticated_user_id')::uuid is distinct from v_user_id
    or (v_authority ->> 'specialist_id')::uuid is distinct from v_specialist_id
    or (v_authority ->> 'selected_case_id')::uuid is distinct from v_case_id
    or v_authority ->> 'authorization_subject' is distinct from v_subject
    or v_authority_id is null
  then
    return null;
  end if;

  select authority_record.granted_by into v_granted_by
  from drs_forward_private.reviewer_case_authorities authority_record
  where authority_record.authority_id = v_authority_id
    and authority_record.user_id = v_user_id
    and authority_record.specialist_id = v_specialist_id
    and authority_record.legacy_case_id = v_case_id
  for update;
  if not found or v_granted_by is null then
    return null;
  end if;

  select membership_row.* into v_membership
  from casework.case_members membership_row
  where membership_row.case_id = v_case_id
    and membership_row.user_id = v_granted_by
  for update;
  if not found
    or v_membership.role::text is distinct from 'owner'
  then
    return null;
  end if;
  return pg_catalog.jsonb_build_object(
    'authenticated_user_id', v_user_id::text,
    'specialist_id', v_specialist_id::text,
    'selected_case_id', v_case_id::text,
    'authorization_subject', v_subject,
    'authority_id', v_authority_id::text
  );
exception
  when insufficient_privilege then raise;
  when others then return null;
end;
$function$;

create function drs_line_private.drs_line_start_link_intent_v2(p_input jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_now timestamptz := pg_catalog.clock_timestamp();
  v_authority jsonb;
  v_intent integration.drs_line_account_link_intents%rowtype;
  v_binding integration.drs_line_account_bindings%rowtype;
begin
  if not drs_line_private.drs_line_exact_json_keys_v2(p_input, array[
    'authenticated_user_id', 'specialist_id', 'selected_case_id',
    'authorization_subject', 'provider_channel_id', 'bot_launch_url'
  ])
    or coalesce(p_input ->> 'provider_channel_id', '') !~ '^[0-9]{1,32}$'
    or coalesce(p_input ->> 'bot_launch_url', '') !~ '^https://([a-z0-9-]+\.)*line\.me/'
    or pg_catalog.char_length(coalesce(p_input ->> 'bot_launch_url', '')) > 512
  then
    return pg_catalog.jsonb_build_object('state', 'permission_denied');
  end if;
  v_authority := drs_line_private.drs_line_resolve_authority_v2(p_input);
  if v_authority is null then
    return pg_catalog.jsonb_build_object('state', 'permission_denied');
  end if;

  select * into v_binding
  from integration.drs_line_account_bindings
  where provider_channel_id = p_input ->> 'provider_channel_id'
    and specialist_id = (v_authority ->> 'specialist_id')::uuid
    and binding_state = 'active'
  for update;
  v_now := pg_catalog.clock_timestamp();
  if found then
    if drs_line_private.drs_line_resolve_authority_v2(p_input) is null then
      return pg_catalog.jsonb_build_object('state', 'permission_denied');
    end if;
    return pg_catalog.jsonb_build_object(
      'state', 'linked', 'linked_at', v_binding.linked_at, 'next_action', 'unlink'
    );
  end if;

  select * into v_intent
  from integration.drs_line_account_link_intents
  where provider_channel_id = p_input ->> 'provider_channel_id'
    and specialist_id = (v_authority ->> 'specialist_id')::uuid
    and intent_state in ('pending', 'nonce_ready')
  for update;
  v_now := pg_catalog.clock_timestamp();
  if found and drs_line_private.drs_line_resolve_authority_v2(p_input) is null then
    return pg_catalog.jsonb_build_object('state', 'permission_denied');
  end if;
  v_now := pg_catalog.clock_timestamp();
  if found and v_intent.expires_at <= v_now then
    update integration.drs_line_account_link_intents
      set intent_state = 'expired', failed_at = v_now, consumed_at = v_now,
        nonce_digest = null, nonce_expires_at = null
      where intent_id = v_intent.intent_id;
    insert into integration.drs_line_binding_audit(
      specialist_id, intent_id, event_type, safe_outcome, safe_payload, occurred_at
    ) values (
      v_intent.specialist_id, v_intent.intent_id, 'expired', 'expired',
      pg_catalog.jsonb_build_object('state', 'expired'), v_now
    );
    v_intent.intent_id := null;
  end if;
  if v_intent.intent_id is not null then
    if v_intent.authenticated_user_id <> (v_authority ->> 'authenticated_user_id')::uuid
      or v_intent.authority_id <> (v_authority ->> 'authority_id')::uuid
      or v_intent.selected_case_id <> (v_authority ->> 'selected_case_id')::uuid
      or v_intent.authorization_subject <> v_authority ->> 'authorization_subject'
    then
      return pg_catalog.jsonb_build_object(
        'state', 'temporarily_unavailable', 'next_action', 'retry'
      );
    end if;
    return pg_catalog.jsonb_build_object(
      'state', 'awaiting_line_confirmation', 'expires_at', v_intent.expires_at,
      'next_action', 'continue_in_line', 'bot_launch_url', v_intent.bot_launch_url
    );
  end if;

  v_authority := drs_line_private.drs_line_resolve_authority_v2(p_input);
  v_now := pg_catalog.clock_timestamp();
  if v_authority is null then
    return pg_catalog.jsonb_build_object('state', 'permission_denied');
  end if;
  insert into integration.drs_line_account_link_intents(
    authenticated_user_id, specialist_id, authority_id, selected_case_id,
    authorization_subject, provider_channel_id, bot_launch_url,
    intent_state, created_at, expires_at
  ) values (
    (v_authority ->> 'authenticated_user_id')::uuid,
    (v_authority ->> 'specialist_id')::uuid,
    (v_authority ->> 'authority_id')::uuid,
    (v_authority ->> 'selected_case_id')::uuid,
    v_authority ->> 'authorization_subject', p_input ->> 'provider_channel_id',
    p_input ->> 'bot_launch_url', 'pending', v_now, v_now + interval '15 minutes'
  ) returning * into v_intent;
  insert into integration.drs_line_binding_audit(
    specialist_id, intent_id, event_type, safe_outcome, safe_payload, occurred_at
  ) values (
    v_intent.specialist_id, v_intent.intent_id, 'start',
    'awaiting_line_confirmation',
    pg_catalog.jsonb_build_object('state', 'awaiting_line_confirmation'), v_now
  );
  return pg_catalog.jsonb_build_object(
    'state', 'awaiting_line_confirmation', 'expires_at', v_intent.expires_at,
    'next_action', 'continue_in_line', 'bot_launch_url', v_intent.bot_launch_url
  );
exception when unique_violation then
  return pg_catalog.jsonb_build_object('state', 'temporarily_unavailable', 'next_action', 'retry');
when others then
  return pg_catalog.jsonb_build_object('state', 'temporarily_unavailable', 'next_action', 'retry');
end;
$function$;

create function drs_line_private.drs_line_read_link_status_v2(p_input jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_now timestamptz := pg_catalog.clock_timestamp();
  v_authority jsonb;
  v_intent integration.drs_line_account_link_intents%rowtype;
  v_binding integration.drs_line_account_bindings%rowtype;
begin
  if not drs_line_private.drs_line_exact_json_keys_v2(p_input, array[
    'authenticated_user_id', 'specialist_id', 'selected_case_id',
    'authorization_subject', 'provider_channel_id'
  ]) or coalesce(p_input ->> 'provider_channel_id', '') !~ '^[0-9]{1,32}$'
  then
    return pg_catalog.jsonb_build_object('state', 'permission_denied');
  end if;
  v_authority := drs_line_private.drs_line_resolve_authority_v2(p_input);
  if v_authority is null then
    return pg_catalog.jsonb_build_object('state', 'permission_denied');
  end if;

  select * into v_binding
  from integration.drs_line_account_bindings
  where provider_channel_id = p_input ->> 'provider_channel_id'
    and specialist_id = (v_authority ->> 'specialist_id')::uuid
    and binding_state = 'active'
  for update;
  v_now := pg_catalog.clock_timestamp();
  if found then
    if drs_line_private.drs_line_resolve_authority_v2(p_input) is null then
      return pg_catalog.jsonb_build_object('state', 'permission_denied');
    end if;
    return pg_catalog.jsonb_build_object(
      'state', 'linked', 'linked_at', v_binding.linked_at, 'next_action', 'unlink'
    );
  end if;

  select * into v_intent
  from integration.drs_line_account_link_intents
  where provider_channel_id = p_input ->> 'provider_channel_id'
    and authenticated_user_id = (v_authority ->> 'authenticated_user_id')::uuid
    and specialist_id = (v_authority ->> 'specialist_id')::uuid
    and authority_id = (v_authority ->> 'authority_id')::uuid
    and selected_case_id = (v_authority ->> 'selected_case_id')::uuid
  order by created_at desc limit 1
  for update;
  v_now := pg_catalog.clock_timestamp();
  if drs_line_private.drs_line_resolve_authority_v2(p_input) is null then
    return pg_catalog.jsonb_build_object('state', 'permission_denied');
  end if;
  v_now := pg_catalog.clock_timestamp();
  if found and v_intent.intent_state in ('pending', 'nonce_ready')
    and v_intent.expires_at <= v_now
  then
    if drs_line_private.drs_line_resolve_authority_v2(p_input) is null then
      return pg_catalog.jsonb_build_object('state', 'permission_denied');
    end if;
    update integration.drs_line_account_link_intents
      set intent_state = 'expired', failed_at = v_now, consumed_at = v_now,
        nonce_digest = null, nonce_expires_at = null
      where intent_id = v_intent.intent_id;
    insert into integration.drs_line_binding_audit(
      specialist_id, intent_id, event_type, safe_outcome, safe_payload, occurred_at
    ) values (
      v_intent.specialist_id, v_intent.intent_id, 'expired', 'expired',
      pg_catalog.jsonb_build_object('state', 'expired'), v_now
    );
    return pg_catalog.jsonb_build_object('state', 'expired', 'next_action', 'relink');
  end if;
  if found and v_intent.intent_state in ('pending', 'nonce_ready') then
    return pg_catalog.jsonb_build_object(
      'state', 'awaiting_line_confirmation', 'expires_at', v_intent.expires_at,
      'next_action', 'continue_in_line', 'bot_launch_url', v_intent.bot_launch_url
    );
  end if;
  if found and v_intent.intent_state = 'cancelled' then
    return pg_catalog.jsonb_build_object('state', 'cancelled', 'next_action', 'relink');
  end if;
  if found and v_intent.intent_state in (
    'expired', 'conflict_line_already_bound', 'conflict_drs_already_bound', 'specialist_inactive'
  ) then
    return pg_catalog.jsonb_build_object(
      'state', v_intent.intent_state,
      'next_action', case when v_intent.intent_state = 'specialist_inactive' then 'retry' else 'relink' end
    );
  end if;

  select * into v_binding
  from integration.drs_line_account_bindings
  where provider_channel_id = p_input ->> 'provider_channel_id'
    and specialist_id = (v_authority ->> 'specialist_id')::uuid
    and binding_state = 'revoked'
  order by revoked_at desc limit 1;
  if found then
    return pg_catalog.jsonb_build_object(
      'state', 'revoked', 'revoked_at', v_binding.revoked_at, 'next_action', 'relink'
    );
  end if;
  return pg_catalog.jsonb_build_object('state', 'not_linked', 'next_action', 'relink');
exception when others then
  return pg_catalog.jsonb_build_object('state', 'temporarily_unavailable', 'next_action', 'retry');
end;
$function$;

create function drs_line_private.drs_line_cancel_link_intent_v2(p_input jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_now timestamptz := pg_catalog.clock_timestamp();
  v_authority jsonb;
  v_intent integration.drs_line_account_link_intents%rowtype;
begin
  if not drs_line_private.drs_line_exact_json_keys_v2(p_input, array[
    'authenticated_user_id', 'specialist_id', 'selected_case_id',
    'authorization_subject', 'provider_channel_id'
  ]) or coalesce(p_input ->> 'provider_channel_id', '') !~ '^[0-9]{1,32}$'
  then
    return pg_catalog.jsonb_build_object('state', 'permission_denied');
  end if;
  v_authority := drs_line_private.drs_line_resolve_authority_v2(p_input);
  if v_authority is null then
    return pg_catalog.jsonb_build_object('state', 'permission_denied');
  end if;
  select * into v_intent
  from integration.drs_line_account_link_intents
  where provider_channel_id = p_input ->> 'provider_channel_id'
    and authenticated_user_id = (v_authority ->> 'authenticated_user_id')::uuid
    and specialist_id = (v_authority ->> 'specialist_id')::uuid
    and authority_id = (v_authority ->> 'authority_id')::uuid
    and selected_case_id = (v_authority ->> 'selected_case_id')::uuid
    and intent_state in ('pending', 'nonce_ready')
  for update;
  if not found then
    return pg_catalog.jsonb_build_object('state', 'not_linked', 'next_action', 'relink');
  end if;
  if drs_line_private.drs_line_resolve_authority_v2(p_input) is null then
    return pg_catalog.jsonb_build_object('state', 'permission_denied');
  end if;
  v_now := pg_catalog.clock_timestamp();
  if v_intent.expires_at <= v_now then
    update integration.drs_line_account_link_intents
      set intent_state = 'expired', failed_at = v_now, consumed_at = v_now,
        nonce_digest = null, nonce_expires_at = null
      where intent_id = v_intent.intent_id;
    insert into integration.drs_line_binding_audit(
      specialist_id, intent_id, event_type, safe_outcome, safe_payload, occurred_at
    ) values (
      v_intent.specialist_id, v_intent.intent_id, 'expired', 'expired',
      pg_catalog.jsonb_build_object('state', 'expired'), v_now
    );
    return pg_catalog.jsonb_build_object('state', 'expired', 'next_action', 'relink');
  end if;
  update integration.drs_line_account_link_intents
    set intent_state = 'cancelled', cancelled_at = v_now, consumed_at = v_now,
      nonce_digest = null, nonce_expires_at = null
    where intent_id = v_intent.intent_id;
  insert into integration.drs_line_binding_audit(
    specialist_id, intent_id, event_type, safe_outcome, safe_payload, occurred_at
  ) values (
    v_intent.specialist_id, v_intent.intent_id, 'cancelled', 'cancelled',
    pg_catalog.jsonb_build_object('state', 'cancelled'), v_now
  );
  return pg_catalog.jsonb_build_object('state', 'cancelled', 'next_action', 'relink');
exception when others then
  return pg_catalog.jsonb_build_object('state', 'temporarily_unavailable', 'next_action', 'retry');
end;
$function$;

create function drs_line_private.drs_line_prepare_nonce_v2(p_input jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_now timestamptz := pg_catalog.clock_timestamp();
  v_nonce_expires_at timestamptz;
  v_authority jsonb;
  v_intent integration.drs_line_account_link_intents%rowtype;
begin
  if not drs_line_private.drs_line_exact_json_keys_v2(p_input, array[
    'authenticated_user_id', 'specialist_id', 'selected_case_id',
    'authorization_subject', 'provider_channel_id', 'nonce_digest', 'nonce_expires_at'
  ]) or coalesce(p_input ->> 'provider_channel_id', '') !~ '^[0-9]{1,32}$'
    or coalesce(p_input ->> 'nonce_digest', '') !~ '^[A-Za-z0-9_-]{43}$'
  then
    return pg_catalog.jsonb_build_object('accepted', false, 'state', 'permission_denied');
  end if;
  v_nonce_expires_at := (p_input ->> 'nonce_expires_at')::timestamptz;
  if not pg_catalog.isfinite(v_nonce_expires_at)
    or v_nonce_expires_at <= v_now
    or v_nonce_expires_at > v_now + interval '10 minutes'
  then
    return pg_catalog.jsonb_build_object('accepted', false, 'state', 'expired');
  end if;
  v_authority := drs_line_private.drs_line_resolve_authority_v2(p_input);
  if v_authority is null then
    return pg_catalog.jsonb_build_object('accepted', false, 'state', 'permission_denied');
  end if;
  select * into v_intent
  from integration.drs_line_account_link_intents
  where provider_channel_id = p_input ->> 'provider_channel_id'
    and authenticated_user_id = (v_authority ->> 'authenticated_user_id')::uuid
    and specialist_id = (v_authority ->> 'specialist_id')::uuid
    and authority_id = (v_authority ->> 'authority_id')::uuid
    and selected_case_id = (v_authority ->> 'selected_case_id')::uuid
    and intent_state = 'pending' and consumed_at is null and expires_at > v_now
  for update;
  if not found then
    return pg_catalog.jsonb_build_object('accepted', false, 'state', 'expired');
  end if;
  if v_nonce_expires_at > v_intent.expires_at then
    v_nonce_expires_at := v_intent.expires_at;
  end if;
  if drs_line_private.drs_line_resolve_authority_v2(p_input) is null then
    return pg_catalog.jsonb_build_object('accepted', false, 'state', 'permission_denied');
  end if;
  v_now := pg_catalog.clock_timestamp();
  if v_nonce_expires_at <= v_now or v_intent.expires_at <= v_now then
    return pg_catalog.jsonb_build_object('accepted', false, 'state', 'expired');
  end if;
  update integration.drs_line_account_link_intents
    set intent_state = 'nonce_ready', nonce_digest = p_input ->> 'nonce_digest',
      nonce_expires_at = v_nonce_expires_at
    where intent_id = v_intent.intent_id;
  insert into integration.drs_line_binding_audit(
    specialist_id, intent_id, event_type, safe_outcome, safe_payload, occurred_at
  ) values (
    v_intent.specialist_id, v_intent.intent_id, 'nonce_ready',
    'awaiting_line_confirmation',
    pg_catalog.jsonb_build_object('state', 'awaiting_line_confirmation'), v_now
  );
  return pg_catalog.jsonb_build_object('accepted', true, 'state', 'awaiting_line_confirmation');
exception when unique_violation then
  return pg_catalog.jsonb_build_object('accepted', false, 'state', 'expired');
when others then
  return pg_catalog.jsonb_build_object('accepted', false, 'state', 'temporarily_unavailable');
end;
$function$;

create function drs_line_private.drs_line_unlink_account_v2(p_input jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_now timestamptz := pg_catalog.clock_timestamp();
  v_user_id uuid;
  v_specialist_id uuid;
  v_authority jsonb;
  v_authorized boolean := false;
  v_binding integration.drs_line_account_bindings%rowtype;
begin
  if not drs_line_private.drs_line_exact_json_keys_v2(p_input, array[
    'authenticated_user_id', 'specialist_id', 'selected_case_id',
    'authorization_subject', 'provider_channel_id'
  ]) or coalesce(p_input ->> 'provider_channel_id', '') !~ '^[0-9]{1,32}$'
  then
    return pg_catalog.jsonb_build_object('state', 'permission_denied');
  end if;
  v_user_id := (p_input ->> 'authenticated_user_id')::uuid;
  v_specialist_id := (p_input ->> 'specialist_id')::uuid;
  if p_input ->> 'authorization_subject' is distinct from
    'drs-specialist:' || v_specialist_id::text
  then
    return pg_catalog.jsonb_build_object('state', 'permission_denied');
  end if;
  v_authority := drs_line_private.drs_line_resolve_authority_v2(p_input);
  v_authorized := v_authority is not null;
  if not v_authorized then
    perform 1
    from drs_forward_private.auth_specialist_bindings
    where authenticated_user_id = v_user_id
      and specialist_id = v_specialist_id
      and binding_status = 'active'
      and revoked_at is null
      and valid_from <= v_now
      and valid_until > v_now
    for update;
    v_authorized := found;
  end if;
  if not v_authorized then
    return pg_catalog.jsonb_build_object('state', 'permission_denied');
  end if;
  select * into v_binding
  from integration.drs_line_account_bindings
  where provider_channel_id = p_input ->> 'provider_channel_id'
    and specialist_id = v_specialist_id and binding_state = 'active'
  for update;
  v_now := pg_catalog.clock_timestamp();
  if not found then
    return pg_catalog.jsonb_build_object('state', 'not_linked', 'next_action', 'relink');
  end if;
  update integration.drs_line_account_bindings
    set binding_state = 'revoked', revoked_at = v_now
    where binding_id = v_binding.binding_id;
  insert into integration.drs_line_binding_audit(
    specialist_id, binding_id, event_type, safe_outcome, safe_payload, occurred_at
  ) values (
    v_binding.specialist_id, v_binding.binding_id, 'revoked', 'revoked',
    pg_catalog.jsonb_build_object(
      'state', 'revoked', 'binding_version', v_binding.binding_version::text
    ), v_now
  );
  return pg_catalog.jsonb_build_object(
    'state', 'revoked', 'revoked_at', v_now, 'next_action', 'relink'
  );
exception when others then
  return pg_catalog.jsonb_build_object('state', 'temporarily_unavailable', 'next_action', 'retry');
end;
$function$;

create function drs_line_private.drs_line_claim_webhook_v2(p_input jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_now timestamptz := pg_catalog.clock_timestamp();
  v_event integration.drs_line_webhook_events%rowtype;
  v_claim_token uuid := gen_random_uuid();
  v_retry_key uuid := gen_random_uuid();
begin
  if not drs_line_private.drs_line_exact_json_keys_v2(
    p_input, array['webhook_event_digest', 'event_kind']
  ) or coalesce(p_input ->> 'webhook_event_digest', '') !~ '^[A-Za-z0-9_-]{43}$'
    or coalesce(p_input ->> 'event_kind', '') not in (
      'binding_action', 'unlink_action', 'account_link', 'verify'
    )
  then
    return pg_catalog.jsonb_build_object('admission', 'rejected');
  end if;

  insert into integration.drs_line_webhook_events(
    webhook_digest, event_kind, processing_state, claim_token,
    provider_retry_key, attempt_count, first_received_at, claimed_at, updated_at
  ) values (
    p_input ->> 'webhook_event_digest', p_input ->> 'event_kind', 'processing',
    v_claim_token, v_retry_key, 1, v_now, v_now, v_now
  ) on conflict (webhook_digest) do nothing
  returning * into v_event;
  if found then
    return pg_catalog.jsonb_build_object(
      'admission', 'claimed', 'claim_token', v_event.claim_token,
      'provider_retry_key', v_event.provider_retry_key
    );
  end if;

  select * into v_event
  from integration.drs_line_webhook_events
  where webhook_digest = p_input ->> 'webhook_event_digest'
  for update;
  v_now := pg_catalog.clock_timestamp();
  if v_event.event_kind <> p_input ->> 'event_kind' then
    return pg_catalog.jsonb_build_object('admission', 'rejected');
  end if;
  if v_event.processing_state = 'completed' then
    return pg_catalog.jsonb_build_object(
      'admission', 'already_completed', 'safe_outcome', v_event.safe_outcome
    );
  end if;
  if v_event.attempt_count >= 12 then
    update integration.drs_line_webhook_events
      set processing_state = 'completed', safe_outcome = 'temporarily_unavailable',
        completed_at = v_now, updated_at = v_now
      where webhook_digest = v_event.webhook_digest;
    return pg_catalog.jsonb_build_object(
      'admission', 'already_completed', 'safe_outcome', 'temporarily_unavailable'
    );
  end if;
  if v_event.claimed_at > v_now - interval '2 minutes' then
    return pg_catalog.jsonb_build_object('admission', 'in_progress');
  end if;
  update integration.drs_line_webhook_events
    set claim_token = v_claim_token,
      attempt_count = attempt_count + 1, claimed_at = v_now, updated_at = v_now
    where webhook_digest = v_event.webhook_digest
    returning * into v_event;
  return pg_catalog.jsonb_build_object(
    'admission', 'claimed', 'claim_token', v_event.claim_token,
    'provider_retry_key', v_event.provider_retry_key
  );
exception when others then
  return pg_catalog.jsonb_build_object('admission', 'temporarily_unavailable');
end;
$function$;

create function drs_line_private.drs_line_complete_webhook_v2(p_input jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_now timestamptz := pg_catalog.clock_timestamp();
  v_event integration.drs_line_webhook_events%rowtype;
  v_claim_token uuid;
  v_outcome text;
begin
  if not drs_line_private.drs_line_exact_json_keys_v2(
    p_input, array['webhook_event_digest', 'claim_token', 'safe_outcome']
  ) or coalesce(p_input ->> 'webhook_event_digest', '') !~ '^[A-Za-z0-9_-]{43}$'
    or coalesce(p_input ->> 'safe_outcome', '') not in (
      'verified', 'link_token_replied', 'linked', 'expired',
      'conflict_line_already_bound', 'conflict_drs_already_bound',
      'specialist_inactive', 'ignored', 'failed', 'not_linked', 'revoked',
      'temporarily_unavailable'
    )
  then
    return pg_catalog.jsonb_build_object('completed', false);
  end if;
  v_claim_token := (p_input ->> 'claim_token')::uuid;
  v_outcome := p_input ->> 'safe_outcome';
  select * into v_event from integration.drs_line_webhook_events
    where webhook_digest = p_input ->> 'webhook_event_digest' for update;
  v_now := pg_catalog.clock_timestamp();
  if not found then
    return pg_catalog.jsonb_build_object('completed', false);
  end if;
  if v_event.processing_state = 'completed' then
    return pg_catalog.jsonb_build_object(
      'completed', v_event.claim_token = v_claim_token and v_event.safe_outcome = v_outcome,
      'safe_outcome', v_event.safe_outcome
    );
  end if;
  if v_event.claim_token <> v_claim_token then
    return pg_catalog.jsonb_build_object('completed', false);
  end if;
  update integration.drs_line_webhook_events
    set processing_state = 'completed', safe_outcome = v_outcome,
      completed_at = v_now, updated_at = v_now
    where webhook_digest = v_event.webhook_digest;
  return pg_catalog.jsonb_build_object('completed', true, 'safe_outcome', v_outcome);
exception when others then
  return pg_catalog.jsonb_build_object('completed', false);
end;
$function$;

create function drs_line_private.drs_line_complete_account_link_event_v2(p_input jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_now timestamptz := pg_catalog.clock_timestamp();
  v_event integration.drs_line_webhook_events%rowtype;
  v_intent integration.drs_line_account_link_intents%rowtype;
  v_existing_line integration.drs_line_account_bindings%rowtype;
  v_existing_specialist integration.drs_line_account_bindings%rowtype;
  v_binding integration.drs_line_account_bindings%rowtype;
  v_authority_input jsonb;
  v_authority jsonb;
  v_claim_token uuid;
  v_version bigint;
  v_lock_a text;
  v_lock_b text;
  v_outcome text;
  v_existing_line_found boolean := false;
  v_existing_specialist_found boolean := false;
begin
  if not drs_line_private.drs_line_exact_json_keys_v2(p_input, array[
    'webhook_event_digest', 'claim_token', 'provider_channel_id', 'nonce_digest',
    'line_user_digest', 'line_user_ciphertext', 'line_user_iv', 'encryption_key_version'
  ]) or coalesce(p_input ->> 'webhook_event_digest', '') !~ '^[A-Za-z0-9_-]{43}$'
    or coalesce(p_input ->> 'provider_channel_id', '') !~ '^[0-9]{1,32}$'
    or coalesce(p_input ->> 'nonce_digest', '') !~ '^[A-Za-z0-9_-]{43}$'
    or coalesce(p_input ->> 'line_user_digest', '') !~ '^[A-Za-z0-9_-]{43}$'
    or coalesce(p_input ->> 'line_user_ciphertext', '') !~ '^[A-Za-z0-9_-]+$'
    or pg_catalog.char_length(coalesce(p_input ->> 'line_user_ciphertext', '')) not between 24 and 1024
    or coalesce(p_input ->> 'line_user_iv', '') !~ '^[A-Za-z0-9_-]{16}$'
    or coalesce(p_input ->> 'encryption_key_version', '') !~ '^[A-Za-z0-9._-]{1,64}$'
  then
    return pg_catalog.jsonb_build_object('completed', false);
  end if;
  v_claim_token := (p_input ->> 'claim_token')::uuid;
  select * into v_event from integration.drs_line_webhook_events
    where webhook_digest = p_input ->> 'webhook_event_digest' for update;
  v_now := pg_catalog.clock_timestamp();
  if not found then
    return pg_catalog.jsonb_build_object('completed', false);
  end if;
  if v_event.processing_state = 'completed' then
    return pg_catalog.jsonb_build_object(
      'completed', v_event.claim_token = v_claim_token,
      'safe_outcome', v_event.safe_outcome
    );
  end if;
  if v_event.claim_token <> v_claim_token or v_event.event_kind <> 'account_link' then
    return pg_catalog.jsonb_build_object('completed', false);
  end if;

  select * into v_intent
  from integration.drs_line_account_link_intents
  where provider_channel_id = p_input ->> 'provider_channel_id'
    and nonce_digest = p_input ->> 'nonce_digest'
    and intent_state = 'nonce_ready' and consumed_at is null
  for update;
  if not found then
    update integration.drs_line_webhook_events
      set processing_state = 'completed', safe_outcome = 'expired',
        completed_at = v_now, updated_at = v_now
      where webhook_digest = v_event.webhook_digest;
    return pg_catalog.jsonb_build_object('completed', true, 'safe_outcome', 'expired');
  end if;

  v_authority_input := pg_catalog.jsonb_build_object(
    'authenticated_user_id', v_intent.authenticated_user_id::text,
    'specialist_id', v_intent.specialist_id::text,
    'selected_case_id', v_intent.selected_case_id::text,
    'authorization_subject', v_intent.authorization_subject
  );
  v_authority := drs_line_private.drs_line_resolve_authority_v2(v_authority_input);
  if v_authority is null
    or (v_authority ->> 'authority_id')::uuid <> v_intent.authority_id
  then
    update integration.drs_line_account_link_intents
      set intent_state = 'specialist_inactive', failed_at = v_now, consumed_at = v_now,
        nonce_digest = null, nonce_expires_at = null
      where intent_id = v_intent.intent_id;
    insert into integration.drs_line_binding_audit(
      specialist_id, intent_id, event_type, safe_outcome, safe_payload, occurred_at
    ) values (
      v_intent.specialist_id, v_intent.intent_id, 'denied', 'specialist_inactive',
      pg_catalog.jsonb_build_object('state', 'specialist_inactive'), v_now
    );
    update integration.drs_line_webhook_events
      set processing_state = 'completed', safe_outcome = 'specialist_inactive',
        completed_at = v_now, updated_at = v_now
      where webhook_digest = v_event.webhook_digest;
    return pg_catalog.jsonb_build_object('completed', true, 'safe_outcome', 'specialist_inactive');
  end if;

  if v_intent.nonce_expires_at <= v_now or v_intent.expires_at <= v_now then
    update integration.drs_line_account_link_intents
      set intent_state = 'expired', failed_at = v_now, consumed_at = v_now,
        nonce_digest = null, nonce_expires_at = null
      where intent_id = v_intent.intent_id;
    insert into integration.drs_line_binding_audit(
      specialist_id, intent_id, event_type, safe_outcome, safe_payload, occurred_at
    ) values (
      v_intent.specialist_id, v_intent.intent_id, 'expired', 'expired',
      pg_catalog.jsonb_build_object('state', 'expired'), v_now
    );
    update integration.drs_line_webhook_events
      set processing_state = 'completed', safe_outcome = 'expired',
        completed_at = v_now, updated_at = v_now
      where webhook_digest = v_event.webhook_digest;
    return pg_catalog.jsonb_build_object('completed', true, 'safe_outcome', 'expired');
  end if;

  v_lock_a := 'drs-line:identity:' || (p_input ->> 'provider_channel_id') || ':' ||
    (p_input ->> 'line_user_digest');
  v_lock_b := 'drs-line:specialist:' || (p_input ->> 'provider_channel_id') || ':' ||
    v_intent.specialist_id::text;
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(least(v_lock_a, v_lock_b), 0)
  );
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(greatest(v_lock_a, v_lock_b), 0)
  );

  v_authority := drs_line_private.drs_line_resolve_authority_v2(v_authority_input);
  v_now := pg_catalog.clock_timestamp();
  if v_authority is null
    or (v_authority ->> 'authority_id')::uuid <> v_intent.authority_id
  then
    update integration.drs_line_account_link_intents
      set intent_state = 'specialist_inactive', failed_at = v_now, consumed_at = v_now,
        nonce_digest = null, nonce_expires_at = null
      where intent_id = v_intent.intent_id;
    insert into integration.drs_line_binding_audit(
      specialist_id, intent_id, event_type, safe_outcome, safe_payload, occurred_at
    ) values (
      v_intent.specialist_id, v_intent.intent_id, 'denied', 'specialist_inactive',
      pg_catalog.jsonb_build_object('state', 'specialist_inactive'), v_now
    );
    update integration.drs_line_webhook_events
      set processing_state = 'completed', safe_outcome = 'specialist_inactive',
        completed_at = v_now, updated_at = v_now
      where webhook_digest = v_event.webhook_digest;
    return pg_catalog.jsonb_build_object('completed', true, 'safe_outcome', 'specialist_inactive');
  end if;

  select * into v_existing_line
  from integration.drs_line_account_bindings
  where provider_channel_id = p_input ->> 'provider_channel_id'
    and line_user_digest = p_input ->> 'line_user_digest'
    and binding_state = 'active'
  for update;
  v_now := pg_catalog.clock_timestamp();
  v_existing_line_found := found;

  select * into v_existing_specialist
  from integration.drs_line_account_bindings
  where provider_channel_id = p_input ->> 'provider_channel_id'
    and specialist_id = v_intent.specialist_id and binding_state = 'active'
  for update;
  v_existing_specialist_found := found;

  -- All event, intent, advisory, authority, membership, and conflicting-binding
  -- locks are now held. Refresh time before any terminal nonce consumption.
  v_authority := drs_line_private.drs_line_resolve_authority_v2(v_authority_input);
  v_now := pg_catalog.clock_timestamp();
  if v_authority is null
    or (v_authority ->> 'authority_id')::uuid <> v_intent.authority_id
  then
    return pg_catalog.jsonb_build_object('completed', false);
  end if;
  if v_intent.nonce_expires_at <= v_now or v_intent.expires_at <= v_now then
    update integration.drs_line_account_link_intents
      set intent_state = 'expired', failed_at = v_now, consumed_at = v_now,
        nonce_digest = null, nonce_expires_at = null
      where intent_id = v_intent.intent_id;
    insert into integration.drs_line_binding_audit(
      specialist_id, intent_id, event_type, safe_outcome, safe_payload, occurred_at
    ) values (
      v_intent.specialist_id, v_intent.intent_id, 'expired', 'expired',
      pg_catalog.jsonb_build_object('state', 'expired'), v_now
    );
    update integration.drs_line_webhook_events
      set processing_state = 'completed', safe_outcome = 'expired',
        completed_at = v_now, updated_at = v_now
      where webhook_digest = v_event.webhook_digest;
    return pg_catalog.jsonb_build_object('completed', true, 'safe_outcome', 'expired');
  end if;

  if v_existing_line_found then
    v_outcome := case
      when v_existing_line.specialist_id = v_intent.specialist_id
        then 'conflict_drs_already_bound'
      else 'conflict_line_already_bound'
    end;
    update integration.drs_line_account_link_intents
      set intent_state = v_outcome, failed_at = v_now, consumed_at = v_now,
        nonce_digest = null, nonce_expires_at = null
      where intent_id = v_intent.intent_id;
    insert into integration.drs_line_binding_audit(
      specialist_id, intent_id, binding_id, event_type, safe_outcome, safe_payload, occurred_at
    ) values (
      v_intent.specialist_id, v_intent.intent_id, v_existing_line.binding_id,
      'conflict', v_outcome, pg_catalog.jsonb_build_object('state', v_outcome), v_now
    );
    update integration.drs_line_webhook_events
      set processing_state = 'completed', safe_outcome = v_outcome,
        completed_at = v_now, updated_at = v_now
      where webhook_digest = v_event.webhook_digest;
    return pg_catalog.jsonb_build_object('completed', true, 'safe_outcome', v_outcome);
  end if;

  if v_existing_specialist_found then
    v_outcome := 'conflict_drs_already_bound';
    update integration.drs_line_account_link_intents
      set intent_state = v_outcome, failed_at = v_now, consumed_at = v_now,
        nonce_digest = null, nonce_expires_at = null
      where intent_id = v_intent.intent_id;
    insert into integration.drs_line_binding_audit(
      specialist_id, intent_id, binding_id, event_type, safe_outcome, safe_payload, occurred_at
    ) values (
      v_intent.specialist_id, v_intent.intent_id, v_existing_specialist.binding_id,
      'conflict', v_outcome, pg_catalog.jsonb_build_object('state', v_outcome), v_now
    );
    update integration.drs_line_webhook_events
      set processing_state = 'completed', safe_outcome = v_outcome,
        completed_at = v_now, updated_at = v_now
      where webhook_digest = v_event.webhook_digest;
    return pg_catalog.jsonb_build_object('completed', true, 'safe_outcome', v_outcome);
  end if;

  select coalesce(pg_catalog.max(binding_version), 0) + 1
    into v_version
  from integration.drs_line_account_bindings
  where provider_channel_id = p_input ->> 'provider_channel_id'
    and specialist_id = v_intent.specialist_id;
  v_authority := drs_line_private.drs_line_resolve_authority_v2(v_authority_input);
  v_now := pg_catalog.clock_timestamp();
  if v_authority is null
    or (v_authority ->> 'authority_id')::uuid <> v_intent.authority_id
  then
    return pg_catalog.jsonb_build_object('completed', false);
  end if;
  if v_intent.nonce_expires_at <= v_now or v_intent.expires_at <= v_now then
    update integration.drs_line_account_link_intents
      set intent_state = 'expired', failed_at = v_now, consumed_at = v_now,
        nonce_digest = null, nonce_expires_at = null
      where intent_id = v_intent.intent_id;
    insert into integration.drs_line_binding_audit(
      specialist_id, intent_id, event_type, safe_outcome, safe_payload, occurred_at
    ) values (
      v_intent.specialist_id, v_intent.intent_id, 'expired', 'expired',
      pg_catalog.jsonb_build_object('state', 'expired'), v_now
    );
    update integration.drs_line_webhook_events
      set processing_state = 'completed', safe_outcome = 'expired',
        completed_at = v_now, updated_at = v_now
      where webhook_digest = v_event.webhook_digest;
    return pg_catalog.jsonb_build_object('completed', true, 'safe_outcome', 'expired');
  end if;
  insert into integration.drs_line_account_bindings(
    authenticated_user_id, specialist_id, authority_id, selected_case_id,
    authorization_subject, source_intent_id, provider_channel_id,
    line_user_digest, line_user_ciphertext, line_user_iv,
    encryption_key_version, binding_state, binding_version, linked_at
  ) values (
    v_intent.authenticated_user_id, v_intent.specialist_id, v_intent.authority_id,
    v_intent.selected_case_id, v_intent.authorization_subject, v_intent.intent_id,
    p_input ->> 'provider_channel_id', p_input ->> 'line_user_digest',
    p_input ->> 'line_user_ciphertext', p_input ->> 'line_user_iv',
    p_input ->> 'encryption_key_version', 'active', v_version, v_now
  ) returning * into v_binding;
  update integration.drs_line_account_link_intents
    set intent_state = 'linked', linked_at = v_now, consumed_at = v_now,
      nonce_digest = null, nonce_expires_at = null
    where intent_id = v_intent.intent_id;
  insert into integration.drs_line_binding_audit(
    specialist_id, intent_id, binding_id, event_type, safe_outcome, safe_payload, occurred_at
  ) values (
    v_intent.specialist_id, v_intent.intent_id, v_binding.binding_id,
    'linked', 'linked', pg_catalog.jsonb_build_object(
      'state', 'linked', 'binding_version', v_binding.binding_version::text
    ), v_now
  );
  update integration.drs_line_webhook_events
    set processing_state = 'completed', safe_outcome = 'linked',
      completed_at = v_now, updated_at = v_now
    where webhook_digest = v_event.webhook_digest;
  return pg_catalog.jsonb_build_object('completed', true, 'safe_outcome', 'linked');
exception when unique_violation then
  return pg_catalog.jsonb_build_object('completed', false);
when others then
  return pg_catalog.jsonb_build_object('completed', false);
end;
$function$;

create function drs_line_private.drs_line_unlink_by_line_identity_v2(p_input jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_now timestamptz := pg_catalog.clock_timestamp();
  v_binding integration.drs_line_account_bindings%rowtype;
begin
  if not drs_line_private.drs_line_exact_json_keys_v2(
    p_input, array['provider_channel_id', 'line_user_digest']
  ) or coalesce(p_input ->> 'provider_channel_id', '') !~ '^[0-9]{1,32}$'
    or coalesce(p_input ->> 'line_user_digest', '') !~ '^[A-Za-z0-9_-]{43}$'
  then
    return pg_catalog.jsonb_build_object('state', 'temporarily_unavailable', 'next_action', 'retry');
  end if;
  select * into v_binding
  from integration.drs_line_account_bindings
  where provider_channel_id = p_input ->> 'provider_channel_id'
    and line_user_digest = p_input ->> 'line_user_digest'
    and binding_state = 'active'
  for update;
  v_now := pg_catalog.clock_timestamp();
  if not found then
    return pg_catalog.jsonb_build_object('state', 'not_linked', 'next_action', 'relink');
  end if;
  update integration.drs_line_account_bindings
    set binding_state = 'revoked', revoked_at = v_now
    where binding_id = v_binding.binding_id;
  insert into integration.drs_line_binding_audit(
    specialist_id, binding_id, event_type, safe_outcome, safe_payload, occurred_at
  ) values (
    v_binding.specialist_id, v_binding.binding_id, 'revoked', 'revoked',
    pg_catalog.jsonb_build_object(
      'state', 'revoked', 'binding_version', v_binding.binding_version::text
    ), v_now
  );
  return pg_catalog.jsonb_build_object(
    'state', 'revoked', 'revoked_at', v_now, 'next_action', 'relink'
  );
exception when others then
  return pg_catalog.jsonb_build_object('state', 'temporarily_unavailable', 'next_action', 'retry');
end;
$function$;

create function public.drs_line_start_link_intent_v1(p_input jsonb)
returns jsonb language sql security invoker set search_path = ''
as $function$ select drs_line_private.drs_line_start_link_intent_v2(p_input) $function$;
create function public.drs_line_read_link_status_v1(p_input jsonb)
returns jsonb language sql security invoker set search_path = ''
as $function$ select drs_line_private.drs_line_read_link_status_v2(p_input) $function$;
create function public.drs_line_cancel_link_intent_v1(p_input jsonb)
returns jsonb language sql security invoker set search_path = ''
as $function$ select drs_line_private.drs_line_cancel_link_intent_v2(p_input) $function$;
create function public.drs_line_prepare_nonce_v1(p_input jsonb)
returns jsonb language sql security invoker set search_path = ''
as $function$ select drs_line_private.drs_line_prepare_nonce_v2(p_input) $function$;
create function public.drs_line_unlink_account_v1(p_input jsonb)
returns jsonb language sql security invoker set search_path = ''
as $function$ select drs_line_private.drs_line_unlink_account_v2(p_input) $function$;
create function public.drs_line_claim_webhook_v1(p_input jsonb)
returns jsonb language sql security invoker set search_path = ''
as $function$ select drs_line_private.drs_line_claim_webhook_v2(p_input) $function$;
create function public.drs_line_complete_webhook_v1(p_input jsonb)
returns jsonb language sql security invoker set search_path = ''
as $function$ select drs_line_private.drs_line_complete_webhook_v2(p_input) $function$;
create function public.drs_line_complete_account_link_event_v1(p_input jsonb)
returns jsonb language sql security invoker set search_path = ''
as $function$ select drs_line_private.drs_line_complete_account_link_event_v2(p_input) $function$;
create function public.drs_line_unlink_by_line_identity_v1(p_input jsonb)
returns jsonb language sql security invoker set search_path = ''
as $function$ select drs_line_private.drs_line_unlink_by_line_identity_v2(p_input) $function$;

alter table integration.drs_line_account_link_intents owner to postgres;
alter table integration.drs_line_account_bindings owner to postgres;
alter table integration.drs_line_binding_audit owner to postgres;
alter table integration.drs_line_webhook_events owner to postgres;

alter function drs_line_private.drs_line_append_only_v2() owner to postgres;
alter function drs_line_private.drs_line_exact_json_keys_v2(jsonb,text[]) owner to postgres;
alter function drs_line_private.drs_line_resolve_authority_v2(jsonb) owner to postgres;
alter function drs_line_private.drs_line_start_link_intent_v2(jsonb) owner to postgres;
alter function drs_line_private.drs_line_read_link_status_v2(jsonb) owner to postgres;
alter function drs_line_private.drs_line_cancel_link_intent_v2(jsonb) owner to postgres;
alter function drs_line_private.drs_line_prepare_nonce_v2(jsonb) owner to postgres;
alter function drs_line_private.drs_line_unlink_account_v2(jsonb) owner to postgres;
alter function drs_line_private.drs_line_claim_webhook_v2(jsonb) owner to postgres;
alter function drs_line_private.drs_line_complete_webhook_v2(jsonb) owner to postgres;
alter function drs_line_private.drs_line_complete_account_link_event_v2(jsonb) owner to postgres;
alter function drs_line_private.drs_line_unlink_by_line_identity_v2(jsonb) owner to postgres;

alter function public.drs_line_start_link_intent_v1(jsonb) owner to postgres;
alter function public.drs_line_read_link_status_v1(jsonb) owner to postgres;
alter function public.drs_line_cancel_link_intent_v1(jsonb) owner to postgres;
alter function public.drs_line_prepare_nonce_v1(jsonb) owner to postgres;
alter function public.drs_line_unlink_account_v1(jsonb) owner to postgres;
alter function public.drs_line_claim_webhook_v1(jsonb) owner to postgres;
alter function public.drs_line_complete_webhook_v1(jsonb) owner to postgres;
alter function public.drs_line_complete_account_link_event_v1(jsonb) owner to postgres;
alter function public.drs_line_unlink_by_line_identity_v1(jsonb) owner to postgres;

revoke all on schema drs_line_private from public, anon, authenticated, service_role;
revoke all on all functions in schema drs_line_private from public, anon, authenticated, service_role;
grant usage on schema drs_line_private to service_role;
grant execute on function drs_line_private.drs_line_start_link_intent_v2(jsonb) to service_role;
grant execute on function drs_line_private.drs_line_read_link_status_v2(jsonb) to service_role;
grant execute on function drs_line_private.drs_line_cancel_link_intent_v2(jsonb) to service_role;
grant execute on function drs_line_private.drs_line_prepare_nonce_v2(jsonb) to service_role;
grant execute on function drs_line_private.drs_line_unlink_account_v2(jsonb) to service_role;
grant execute on function drs_line_private.drs_line_claim_webhook_v2(jsonb) to service_role;
grant execute on function drs_line_private.drs_line_complete_webhook_v2(jsonb) to service_role;
grant execute on function drs_line_private.drs_line_complete_account_link_event_v2(jsonb) to service_role;
grant execute on function drs_line_private.drs_line_unlink_by_line_identity_v2(jsonb) to service_role;

revoke all on function public.drs_line_start_link_intent_v1(jsonb) from public, anon, authenticated;
revoke all on function public.drs_line_read_link_status_v1(jsonb) from public, anon, authenticated;
revoke all on function public.drs_line_cancel_link_intent_v1(jsonb) from public, anon, authenticated;
revoke all on function public.drs_line_prepare_nonce_v1(jsonb) from public, anon, authenticated;
revoke all on function public.drs_line_unlink_account_v1(jsonb) from public, anon, authenticated;
revoke all on function public.drs_line_claim_webhook_v1(jsonb) from public, anon, authenticated;
revoke all on function public.drs_line_complete_webhook_v1(jsonb) from public, anon, authenticated;
revoke all on function public.drs_line_complete_account_link_event_v1(jsonb) from public, anon, authenticated;
revoke all on function public.drs_line_unlink_by_line_identity_v1(jsonb) from public, anon, authenticated;

grant execute on function public.drs_line_start_link_intent_v1(jsonb) to service_role;
grant execute on function public.drs_line_read_link_status_v1(jsonb) to service_role;
grant execute on function public.drs_line_cancel_link_intent_v1(jsonb) to service_role;
grant execute on function public.drs_line_prepare_nonce_v1(jsonb) to service_role;
grant execute on function public.drs_line_unlink_account_v1(jsonb) to service_role;
grant execute on function public.drs_line_claim_webhook_v1(jsonb) to service_role;
grant execute on function public.drs_line_complete_webhook_v1(jsonb) to service_role;
grant execute on function public.drs_line_complete_account_link_event_v1(jsonb) to service_role;
grant execute on function public.drs_line_unlink_by_line_identity_v1(jsonb) to service_role;

commit;
