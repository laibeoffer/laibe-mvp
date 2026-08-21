-- A14 DRS LINE-first group + AI/Human review W1 local candidate.
-- Local authored contract only. This migration is not applied by this task.

create schema if not exists integration;
create extension if not exists pgcrypto with schema extensions;

do $$
begin
  if not exists (
    select 1 from pg_catalog.pg_roles
     where rolname = 'laibe_integration_migration_owner'
  ) then
    create role laibe_integration_migration_owner nologin;
  end if;
end;
$$;

alter role laibe_integration_migration_owner
  with nologin nobypassrls nosuperuser nocreatedb nocreaterole noreplication;

create table if not exists integration.drs_line_linked_groups (
  formal_link_id uuid primary key,
  case_id uuid not null,
  linked_group_id uuid not null unique,
  line_group_id text not null unique,
  group_type text not null check (group_type in ('OWNER_DRS_PRIVATE', 'OWNER_VENDOR_DRS_SHARED')),
  status text not null check (status in ('active', 'revoked', 'expired')),
  valid_from timestamptz not null,
  valid_to timestamptz not null,
  drs_member boolean not null default false,
  bot_presence_updated_at timestamptz,
  bot_presence_event_type text check (bot_presence_event_type in ('join', 'leave')),
  bot_presence_event_key text,
  owner_line_user_ids text[] not null default '{}',
  vendor_line_user_ids text[] not null default '{}',
  created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp(),
  check (valid_from < valid_to)
);

create table if not exists integration.drs_line_receipts (
  receipt_id uuid primary key,
  provider text not null check (provider = 'line'),
  provider_channel_id text not null,
  provider_receipt_key text not null unique,
  webhook_event_id text not null,
  line_message_id text not null,
  line_group_id text not null,
  line_sender_user_id text not null,
  linked_group_id uuid not null references integration.drs_line_linked_groups(linked_group_id),
  case_id uuid not null,
  group_type text not null check (group_type in ('OWNER_DRS_PRIVATE', 'OWNER_VENDOR_DRS_SHARED')),
  message_type text not null check (message_type in ('text', 'file', 'image')),
  actor_type text not null check (actor_type in ('OWNER', 'VENDOR', 'DRS')),
  occurred_at timestamptz not null,
  received_at timestamptz not null default clock_timestamp(),
  fingerprint_sha256 text not null check (fingerprint_sha256 ~ '^[0-9a-f]{64}$'),
  processing_state text not null check (processing_state in ('accepted', 'dead_letter')),
  unique (provider_channel_id, webhook_event_id, line_group_id, line_message_id)
);

create table if not exists integration.drs_line_attachment_staging (
  attachment_id uuid primary key,
  receipt_id uuid not null references integration.drs_line_receipts(receipt_id),
  provider text not null check (provider = 'line'),
  line_message_id text not null,
  mime_type text not null check (mime_type in ('application/pdf', 'image/jpeg', 'image/png')),
  byte_size bigint not null check (byte_size > 0 and byte_size <= 10485760),
  sha256 text not null check (sha256 ~ '^[0-9a-f]{64}$'),
  storage_ref text not null,
  status text not null check (status = 'private_staged'),
  canonical_document_id uuid,
  canonical_document_version_id uuid,
  created_at timestamptz not null default clock_timestamp(),
  unique (receipt_id, line_message_id),
  check (
    (mime_type in ('image/jpeg', 'image/png') and canonical_document_id is null and canonical_document_version_id is null)
    or mime_type = 'application/pdf'
  )
);

create table if not exists integration.drs_line_specialist_assignments (
  assignment_id uuid primary key,
  case_id uuid not null,
  specialist_id uuid not null,
  verified_auth_subject text not null,
  specialist_email_snapshot text not null,
  valid_from timestamptz not null,
  valid_to timestamptz not null,
  assigned_by uuid not null,
  status text not null check (status in ('active', 'revoked', 'expired')),
  private_control_line_user_id text not null,
  created_at timestamptz not null default clock_timestamp(),
  check (valid_from < valid_to)
);

create table if not exists integration.drs_line_ai_review_requests (
  review_request_id uuid primary key,
  case_id uuid not null,
  linked_group_id uuid not null references integration.drs_line_linked_groups(linked_group_id),
  submitted_snapshot_sha256 text not null check (submitted_snapshot_sha256 ~ '^[0-9a-f]{64}$'),
  submitted_body text,
  status text not null check (status in ('pending', 'completed')),
  completed_review_id uuid,
  created_at timestamptz not null default clock_timestamp(),
  completed_at timestamptz,
  submitted_body_cleared_at timestamptz,
  check (
    (status = 'pending' and submitted_body is not null and completed_review_id is null and completed_at is null and submitted_body_cleared_at is null)
    or (status = 'completed' and submitted_body is null and completed_review_id is not null and completed_at is not null and submitted_body_cleared_at is not null)
  )
);

create table if not exists integration.drs_line_ai_reviews (
  review_id uuid primary key,
  review_request_id uuid not null unique references integration.drs_line_ai_review_requests(review_request_id),
  case_id uuid not null,
  linked_group_id uuid not null references integration.drs_line_linked_groups(linked_group_id),
  status text not null check (
    status in ('REVIEW_COMPLETED_NO_FLAG', 'REVIEW_COMPLETED_ATTENTION', 'REVIEW_SERVICE_UNAVAILABLE')
  ),
  submitted_snapshot_sha256 text not null check (submitted_snapshot_sha256 ~ '^[0-9a-f]{64}$'),
  produced_by text not null check (produced_by = 'advisory_port'),
  findings jsonb not null default '[]'::jsonb,
  evidence_refs jsonb not null default '[]'::jsonb,
  recommendations jsonb not null default '[]'::jsonb,
  proposed_text_sha256 text not null check (proposed_text_sha256 ~ '^[0-9a-f]{64}$'),
  model text not null,
  model_version text not null,
  rag_version text not null,
  skill_version text not null,
  service_error_code text,
  review_consumed_by_decision_id uuid,
  consumed_at timestamptz,
  created_at timestamptz not null default clock_timestamp(),
  completed_at timestamptz not null default clock_timestamp()
);

create table if not exists integration.drs_line_human_decisions (
  decision_id uuid primary key,
  finalization_key text not null unique,
  assignment_id uuid not null references integration.drs_line_specialist_assignments(assignment_id),
  case_id uuid not null,
  linked_group_id uuid not null references integration.drs_line_linked_groups(linked_group_id),
  specialist_id uuid not null,
  specialist_email_snapshot text not null,
  ai_review_id uuid references integration.drs_line_ai_reviews(review_id),
  decision_type text not null check (
    decision_type in ('CANCEL', 'EDIT_AND_SEND', 'OVERRIDE_AND_SEND', 'MANUAL_EXCEPTION_SEND')
  ),
  reason text not null,
  final_body text,
  final_text_sha256 text check (final_text_sha256 ~ '^[0-9a-f]{64}$'),
  final_snapshot_sha256 text check (final_snapshot_sha256 ~ '^[0-9a-f]{64}$'),
  final_attachment_refs jsonb not null default '[]'::jsonb,
  urgency text check (urgency in ('normal', 'high', 'critical')),
  service_incident_id text,
  decision_payload_sha256 text not null check (decision_payload_sha256 ~ '^[0-9a-f]{64}$'),
  decided_at timestamptz not null default clock_timestamp(),
  check (
    (decision_type = 'CANCEL' and final_body is null and final_text_sha256 is null and final_snapshot_sha256 is null)
    or (decision_type <> 'CANCEL' and final_body is not null and final_text_sha256 is not null and final_snapshot_sha256 is not null)
  ),
  check (
    decision_type <> 'MANUAL_EXCEPTION_SEND'
    or (btrim(reason) <> '' and urgency is not null and service_incident_id is not null)
  )
);

create table if not exists integration.drs_line_final_messages (
  final_message_id uuid primary key,
  case_id uuid not null,
  linked_group_id uuid not null references integration.drs_line_linked_groups(linked_group_id),
  line_group_id text not null,
  assignment_id uuid not null references integration.drs_line_specialist_assignments(assignment_id),
  specialist_id uuid not null,
  final_body text not null,
  final_text_sha256 text not null check (final_text_sha256 ~ '^[0-9a-f]{64}$'),
  final_snapshot_sha256 text not null check (final_snapshot_sha256 ~ '^[0-9a-f]{64}$'),
  final_attachment_refs jsonb not null default '[]'::jsonb,
  deliverable_messages jsonb not null,
  ai_review_id uuid references integration.drs_line_ai_reviews(review_id),
  finalization_key text not null unique,
  pre_send_review_state text not null check (
    pre_send_review_state in (
      'REVIEW_COMPLETED_NO_FLAG',
      'REVIEW_COMPLETED_ATTENTION',
      'REVIEW_SERVICE_UNAVAILABLE',
      'PRE_SEND_REVIEW_NOT_PERFORMED_BREAK_GLASS'
    )
  ),
  queued_at timestamptz not null default clock_timestamp()
);

create table if not exists integration.drs_line_opaque_handles (
  token uuid primary key,
  token_type text not null check (
    token_type in ('account_link_continuation', 'complex_action_deep_link', 'specialist_postback')
  ),
  subject_type text check (subject_type in ('OWNER', 'VENDOR', 'SPECIALIST')),
  subject_id uuid,
  specialist_id uuid,
  verified_auth_subject text,
  case_id uuid,
  linked_group_id uuid references integration.drs_line_linked_groups(linked_group_id),
  review_id uuid references integration.drs_line_ai_reviews(review_id),
  action text check (action in ('CANCEL', 'EDIT_AND_SEND', 'OVERRIDE_AND_SEND', 'MANUAL_EXCEPTION_SEND')),
  action_context_id text not null,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  consumed_by text,
  created_at timestamptz not null default clock_timestamp()
);

create table if not exists integration.drs_line_outbox (
  outbox_id uuid primary key,
  case_id uuid not null,
  linked_group_id uuid not null references integration.drs_line_linked_groups(linked_group_id),
  target_type text not null check (target_type = 'group'),
  line_group_id text not null,
  retry_key uuid not null unique,
  final_message_id uuid not null unique references integration.drs_line_final_messages(final_message_id),
  status text not null check (status in ('queued', 'sending', 'sent', 'dead_letter', 'suppressed')),
  created_at timestamptz not null default clock_timestamp()
);

create table if not exists integration.drs_line_audit_events (
  audit_event_id uuid primary key,
  event_type text not null check (
    event_type in ('LINE_SENT_EVENT', 'AI_REVIEW', 'HUMAN_DECISION', 'FINAL_MESSAGE', 'RECEIPT')
  ),
  schema_version text not null check (schema_version = 'laibe.drs.audit.v1'),
  case_id uuid not null,
  linked_group_id uuid not null,
  correlation_id text not null,
  occurred_at timestamptz not null,
  recorded_at timestamptz not null default clock_timestamp(),
  actor_type text not null check (actor_type in ('OWNER', 'VENDOR', 'DRS', 'SYSTEM')),
  actor_id text not null,
  specialist_id uuid,
  specialist_email_snapshot text,
  visibility_scope text not null check (visibility_scope in ('DRS_INTERNAL', 'LINE_GROUP')),
  previous_event_id uuid references integration.drs_line_audit_events(audit_event_id),
  policy_version text not null check (policy_version = 'drs-line-w1'),
  payload_sha256 text not null check (payload_sha256 ~ '^[0-9a-f]{64}$'),
  unique (event_type, correlation_id)
);

create table if not exists integration.drs_line_group_lifecycle_events (
  lifecycle_event_id uuid primary key,
  linked_group_id uuid not null references integration.drs_line_linked_groups(linked_group_id),
  line_group_id text not null,
  provider_event_key text not null unique,
  event_type text not null check (event_type in ('join', 'leave')),
  provider_occurred_at timestamptz not null,
  recorded_at timestamptz not null default clock_timestamp(),
  payload_sha256 text not null check (payload_sha256 ~ '^[0-9a-f]{64}$')
);

alter table integration.drs_line_linked_groups enable row level security;
alter table integration.drs_line_linked_groups force row level security;
alter table integration.drs_line_receipts enable row level security;
alter table integration.drs_line_receipts force row level security;
alter table integration.drs_line_attachment_staging enable row level security;
alter table integration.drs_line_attachment_staging force row level security;
alter table integration.drs_line_specialist_assignments enable row level security;
alter table integration.drs_line_specialist_assignments force row level security;
alter table integration.drs_line_ai_review_requests enable row level security;
alter table integration.drs_line_ai_review_requests force row level security;
alter table integration.drs_line_ai_reviews enable row level security;
alter table integration.drs_line_ai_reviews force row level security;
alter table integration.drs_line_human_decisions enable row level security;
alter table integration.drs_line_human_decisions force row level security;
alter table integration.drs_line_final_messages enable row level security;
alter table integration.drs_line_final_messages force row level security;
alter table integration.drs_line_outbox enable row level security;
alter table integration.drs_line_outbox force row level security;
alter table integration.drs_line_audit_events enable row level security;
alter table integration.drs_line_audit_events force row level security;
alter table integration.drs_line_opaque_handles enable row level security;
alter table integration.drs_line_opaque_handles force row level security;
alter table integration.drs_line_group_lifecycle_events enable row level security;
alter table integration.drs_line_group_lifecycle_events force row level security;

revoke all on schema integration from public;
revoke all on all tables in schema integration from public, anon, authenticated, service_role;
grant usage on schema integration to service_role;
grant usage on schema integration to laibe_integration_migration_owner;
grant usage on schema extensions to laibe_integration_migration_owner;
grant execute on function extensions.digest(bytea, text) to laibe_integration_migration_owner;
grant select, insert, update on integration.drs_line_linked_groups to laibe_integration_migration_owner;
grant select, insert, update on integration.drs_line_receipts to laibe_integration_migration_owner;
grant select, insert, update on integration.drs_line_attachment_staging to laibe_integration_migration_owner;
grant select, insert, update on integration.drs_line_specialist_assignments to laibe_integration_migration_owner;
grant select, insert, update on integration.drs_line_ai_review_requests to laibe_integration_migration_owner;
grant select, insert, update on integration.drs_line_ai_reviews to laibe_integration_migration_owner;
grant select, insert, update on integration.drs_line_human_decisions to laibe_integration_migration_owner;
grant select, insert, update on integration.drs_line_final_messages to laibe_integration_migration_owner;
grant select, insert, update on integration.drs_line_outbox to laibe_integration_migration_owner;
grant select, insert, update on integration.drs_line_audit_events to laibe_integration_migration_owner;
grant select, insert, update on integration.drs_line_opaque_handles to laibe_integration_migration_owner;
grant select, insert, update on integration.drs_line_group_lifecycle_events to laibe_integration_migration_owner;

create policy drs_line_linked_groups_definer_owner_rpc_policy on integration.drs_line_linked_groups
  for all to laibe_integration_migration_owner using (true) with check (true);
create policy drs_line_receipts_definer_owner_rpc_policy on integration.drs_line_receipts
  for all to laibe_integration_migration_owner using (true) with check (true);
create policy drs_line_attachment_staging_definer_owner_rpc_policy on integration.drs_line_attachment_staging
  for all to laibe_integration_migration_owner using (true) with check (true);
create policy drs_line_specialist_assignments_definer_owner_rpc_policy on integration.drs_line_specialist_assignments
  for all to laibe_integration_migration_owner using (true) with check (true);
create policy drs_line_ai_review_requests_definer_owner_rpc_policy on integration.drs_line_ai_review_requests
  for all to laibe_integration_migration_owner using (true) with check (true);
create policy drs_line_ai_reviews_definer_owner_rpc_policy on integration.drs_line_ai_reviews
  for all to laibe_integration_migration_owner using (true) with check (true);
create policy drs_line_human_decisions_definer_owner_rpc_policy on integration.drs_line_human_decisions
  for all to laibe_integration_migration_owner using (true) with check (true);
create policy drs_line_final_messages_definer_owner_rpc_policy on integration.drs_line_final_messages
  for all to laibe_integration_migration_owner using (true) with check (true);
create policy drs_line_outbox_definer_owner_rpc_policy on integration.drs_line_outbox
  for all to laibe_integration_migration_owner using (true) with check (true);
create policy drs_line_audit_events_definer_owner_rpc_policy on integration.drs_line_audit_events
  for all to laibe_integration_migration_owner using (true) with check (true);
create policy drs_line_opaque_handles_definer_owner_rpc_policy on integration.drs_line_opaque_handles
  for all to laibe_integration_migration_owner using (true) with check (true);
create policy drs_line_group_lifecycle_events_definer_owner_rpc_policy on integration.drs_line_group_lifecycle_events
  for all to laibe_integration_migration_owner using (true) with check (true);

create or replace function integration.drs_line_w1_canonical_json_text_v1(p_value jsonb)
returns text
language sql
immutable
security definer
set search_path = ''
as $$
  select case jsonb_typeof(p_value)
    when 'null' then 'null'
    when 'string' then p_value::text
    when 'number' then p_value::text
    when 'boolean' then p_value::text
    when 'array' then (
      select '[' || coalesce(string_agg(
        integration.drs_line_w1_canonical_json_text_v1(value),
        ',' order by ordinality
      ), '') || ']'
      from jsonb_array_elements(p_value) with ordinality
    )
    when 'object' then (
      select '{' || coalesce(string_agg(
        to_jsonb(key)::text || ':' ||
          integration.drs_line_w1_canonical_json_text_v1(value),
        ',' order by key
      ), '') || '}'
      from jsonb_each(p_value)
    )
    else 'null'
  end
$$;

-- drs_line_w1_canonical_json_sha256_v1
-- A14_W1_CANONICAL_JSON_GOLDEN_SHA256: TS canonicalJson(sorted keys/no spaces) == SQL canonical_json_text_v1.
create or replace function integration.drs_line_w1_canonical_json_sha256_v1(p_value jsonb)
returns text
language sql
immutable
security definer
set search_path = ''
as $$
  select encode(
    extensions.digest(
      convert_to(integration.drs_line_w1_canonical_json_text_v1(p_value), 'UTF8'),
      'sha256'
    ),
    'hex'
  )
$$;

create or replace function integration.drs_line_w1_sha256_json(p_value jsonb)
returns text
language sql
immutable
security definer
set search_path = ''
as $$
  select integration.drs_line_w1_canonical_json_sha256_v1(p_value)
$$;

create or replace function integration.drs_line_w1_sha256_text(p_value text)
returns text
language sql
immutable
security definer
set search_path = ''
as $$
  select encode(extensions.digest(convert_to(coalesce(p_value, ''), 'UTF8'), 'sha256'), 'hex')
$$;

create or replace function integration.drs_line_w1_append_receipt(
  p_receipt_id uuid,
  p_receipt_audit_event_id uuid,
  p_line_sent_audit_event_id uuid,
  p_provider_channel_id text,
  p_provider_receipt_key text,
  p_webhook_event_id text,
  p_line_message_id text,
  p_line_group_id text,
  p_line_sender_user_id text,
  p_message_type text,
  p_sent_at timestamptz,
  p_fingerprint_sha256 text,
  p_attachments jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_now timestamptz := clock_timestamp();
  v_group record;
  v_actor_type text;
  v_existing record;
  v_attachment jsonb;
  v_attachment_id uuid;
  v_inserted_receipt_id uuid;
begin
  select *
    into v_group
    from integration.drs_line_linked_groups
   where line_group_id = p_line_group_id
     and status = 'active'
     and drs_member
      and valid_from <= p_sent_at
      and p_sent_at < valid_to
   for update;

  if not found then
    raise exception 'linked_group_not_active' using errcode = 'P0001';
  end if;

  if p_line_sender_user_id = any(v_group.owner_line_user_ids) then
    v_actor_type := 'OWNER';
  elsif p_line_sender_user_id = any(v_group.vendor_line_user_ids) then
    v_actor_type := 'VENDOR';
  else
    raise exception 'sender_not_authorized_for_linked_group' using errcode = 'P0001';
  end if;

  select receipt_id, fingerprint_sha256
    into v_existing
    from integration.drs_line_receipts
   where provider_receipt_key = p_provider_receipt_key
   for update;

  if found then
    if v_existing.fingerprint_sha256 is distinct from p_fingerprint_sha256 then
      raise exception 'receipt_fingerprint_collision' using errcode = '23505';
    end if;
    return v_existing.receipt_id;
  end if;

  insert into integration.drs_line_receipts (
    receipt_id, provider, provider_channel_id, provider_receipt_key,
    webhook_event_id, line_message_id, line_group_id, line_sender_user_id,
    linked_group_id, case_id, group_type, message_type, actor_type,
    occurred_at, received_at, fingerprint_sha256, processing_state
  ) values (
    p_receipt_id, 'line', p_provider_channel_id, p_provider_receipt_key,
    p_webhook_event_id, p_line_message_id, p_line_group_id, p_line_sender_user_id,
    v_group.linked_group_id, v_group.case_id, v_group.group_type, p_message_type, v_actor_type,
    p_sent_at, v_now, p_fingerprint_sha256, 'accepted'
  )
  on conflict (provider_receipt_key) do update
    set provider_receipt_key = integration.drs_line_receipts.provider_receipt_key
    where integration.drs_line_receipts.fingerprint_sha256 is not distinct from excluded.fingerprint_sha256
      and integration.drs_line_receipts.case_id is not distinct from excluded.case_id
      and integration.drs_line_receipts.linked_group_id is not distinct from excluded.linked_group_id
      and integration.drs_line_receipts.line_message_id is not distinct from excluded.line_message_id
  returning receipt_id into v_inserted_receipt_id;

  if v_inserted_receipt_id is null then
    raise exception 'receipt_fingerprint_collision' using errcode = '23505';
  end if;

  for v_attachment in select * from jsonb_array_elements(coalesce(p_attachments, '[]'::jsonb))
  loop
    if (v_attachment->>'byte_size')::bigint <= 0
       or (v_attachment->>'byte_size')::bigint > 10485760
       or coalesce(v_attachment->>'storage_ref', '') = '' then
      raise exception 'attachment_size_or_storage_invalid' using errcode = 'P0001';
    end if;

    insert into integration.drs_line_attachment_staging (
      attachment_id, receipt_id, provider, line_message_id, mime_type,
      byte_size, sha256, storage_ref, status
    ) values (
      (v_attachment->>'attachment_id')::uuid,
      v_inserted_receipt_id,
      'line',
      p_line_message_id,
      v_attachment->>'mime_type',
      (v_attachment->>'byte_size')::bigint,
      v_attachment->>'sha256',
      v_attachment->>'storage_ref',
      'private_staged'
    )
    on conflict (attachment_id) do update
      set attachment_id = excluded.attachment_id
      where integration.drs_line_attachment_staging.receipt_id is not distinct from excluded.receipt_id
        and integration.drs_line_attachment_staging.provider is not distinct from excluded.provider
        and integration.drs_line_attachment_staging.line_message_id is not distinct from excluded.line_message_id
        and integration.drs_line_attachment_staging.mime_type is not distinct from excluded.mime_type
        and integration.drs_line_attachment_staging.byte_size is not distinct from excluded.byte_size
        and integration.drs_line_attachment_staging.sha256 is not distinct from excluded.sha256
        and integration.drs_line_attachment_staging.storage_ref is not distinct from excluded.storage_ref
    returning attachment_id into v_attachment_id;

    if v_attachment_id is null then
      raise exception 'attachment_semantic_collision' using errcode = '23505';
    end if;
  end loop;

  insert into integration.drs_line_audit_events (
    audit_event_id, event_type, schema_version, case_id, linked_group_id,
    correlation_id, occurred_at, recorded_at, actor_type, actor_id,
    visibility_scope, policy_version, payload_sha256
  ) values (
    p_receipt_audit_event_id, 'RECEIPT', 'laibe.drs.audit.v1',
    v_group.case_id, v_group.linked_group_id, v_inserted_receipt_id::text,
    p_sent_at, v_now, v_actor_type, p_line_sender_user_id,
    'DRS_INTERNAL', 'drs-line-w1', p_fingerprint_sha256
  )
  on conflict (event_type, correlation_id) do update
    set audit_event_id = integration.drs_line_audit_events.audit_event_id
    where integration.drs_line_audit_events.payload_sha256 is not distinct from excluded.payload_sha256;

  insert into integration.drs_line_audit_events (
    audit_event_id, event_type, schema_version, case_id, linked_group_id,
    correlation_id, occurred_at, recorded_at, actor_type, actor_id,
    visibility_scope, policy_version, payload_sha256
  ) values (
    p_line_sent_audit_event_id, 'LINE_SENT_EVENT', 'laibe.drs.audit.v1',
    v_group.case_id, v_group.linked_group_id, v_inserted_receipt_id::text,
    p_sent_at, v_now, v_actor_type, p_line_sender_user_id,
    'DRS_INTERNAL', 'drs-line-w1', p_fingerprint_sha256
  )
  on conflict (event_type, correlation_id) do update
    set audit_event_id = integration.drs_line_audit_events.audit_event_id
    where integration.drs_line_audit_events.payload_sha256 is not distinct from excluded.payload_sha256;

  return v_inserted_receipt_id;
end;
$$;

create or replace function integration.drs_line_w1_request_ai_review(
  p_review_request_id uuid,
  p_case_id uuid,
  p_linked_group_id uuid,
  p_submitted_body text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_now timestamptz := clock_timestamp();
  v_submitted_snapshot_sha256 text;
  v_existing record;
  v_request_id uuid;
begin
  if p_submitted_body is null or p_submitted_body = '' then
    raise exception 'submitted_body_required' using errcode = 'P0001';
  end if;

  v_submitted_snapshot_sha256 := integration.drs_line_w1_sha256_text(p_submitted_body);

  if not exists (
    select 1
      from integration.drs_line_linked_groups
     where case_id = p_case_id
       and linked_group_id = p_linked_group_id
       and status = 'active'
  ) then
    raise exception 'linked_group_not_found_for_review' using errcode = 'P0001';
  end if;

  insert into integration.drs_line_ai_review_requests (
    review_request_id, case_id, linked_group_id, submitted_snapshot_sha256,
    submitted_body, status, created_at
  ) values (
    p_review_request_id, p_case_id, p_linked_group_id,
    v_submitted_snapshot_sha256, p_submitted_body, 'pending', v_now
  )
  on conflict (review_request_id) do update
    set review_request_id = integration.drs_line_ai_review_requests.review_request_id
    where integration.drs_line_ai_review_requests.case_id is not distinct from excluded.case_id
      and integration.drs_line_ai_review_requests.linked_group_id is not distinct from excluded.linked_group_id
      and integration.drs_line_ai_review_requests.submitted_snapshot_sha256 is not distinct from excluded.submitted_snapshot_sha256
      and (
        integration.drs_line_ai_review_requests.submitted_body is not distinct from excluded.submitted_body
        or integration.drs_line_ai_review_requests.status in ('pending', 'completed')
      )
      and integration.drs_line_ai_review_requests.status in ('pending', 'completed')
  returning review_request_id into v_request_id;

  if v_request_id is null then
    select *
      into v_existing
      from integration.drs_line_ai_review_requests
     where review_request_id = p_review_request_id
     for update;
    if found and (
      v_existing.case_id is distinct from p_case_id
      or v_existing.linked_group_id is distinct from p_linked_group_id
      or v_existing.submitted_snapshot_sha256 is distinct from v_submitted_snapshot_sha256
    ) then
      raise exception 'ai_review_request_replay_conflict' using errcode = '23505';
    end if;
    raise exception 'ai_review_request_replay_conflict' using errcode = '23505';
  end if;

  return v_request_id;
end;
$$;

create or replace function integration.drs_line_w1_persist_ai_review(
  p_review_id uuid,
  p_review_request_id uuid,
  p_status text,
  p_proposed_text_sha256 text,
  p_model text,
  p_model_version text,
  p_rag_version text,
  p_skill_version text,
  p_service_error_code text,
  p_findings jsonb,
  p_evidence_refs jsonb,
  p_recommendations jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_now timestamptz := clock_timestamp();
  v_request record;
  v_existing record;
  v_review_id uuid;
  v_safe_status text;
  v_safe_proposed_text_sha256 text;
  v_safe_model text;
  v_safe_model_version text;
  v_safe_rag_version text;
  v_safe_skill_version text;
  v_safe_service_error_code text;
  v_safe_findings jsonb;
  v_safe_evidence_refs jsonb;
  v_safe_recommendations jsonb;
begin
  select *
    into v_request
    from integration.drs_line_ai_review_requests
   where review_request_id = p_review_request_id
   for update;

  if not found then
    raise exception 'ai_review_request_not_found' using errcode = 'P0001';
  end if;

  v_safe_status := p_status;
  v_safe_proposed_text_sha256 := p_proposed_text_sha256;
  v_safe_model := p_model;
  v_safe_model_version := p_model_version;
  v_safe_rag_version := p_rag_version;
  v_safe_skill_version := p_skill_version;
  v_safe_service_error_code := p_service_error_code;
  v_safe_findings := coalesce(p_findings, '[]'::jsonb);
  v_safe_evidence_refs := coalesce(p_evidence_refs, '[]'::jsonb);
  v_safe_recommendations := coalesce(p_recommendations, '[]'::jsonb);

  if p_status is not distinct from 'REVIEW_SERVICE_UNAVAILABLE' then
    -- Unavailable review persistence is server-normalized; caller/provider
    -- metadata is not authority and must not retain submitted private body.
    v_safe_findings := '[]'::jsonb;
    v_safe_evidence_refs := '[]'::jsonb;
    v_safe_recommendations := jsonb_build_array(
      '審查服務暫時無法完成，需由已指派 DRS 人員走人工例外送出。'
    );
    v_safe_model := 'unavailable';
    v_safe_model_version := 'unavailable';
    v_safe_rag_version := 'unavailable';
    v_safe_skill_version := 'unavailable';
    v_safe_service_error_code := 'ADVISORY_PORT_UNAVAILABLE';
    v_safe_proposed_text_sha256 := integration.drs_line_w1_sha256_text(
      '審查服務暫時無法完成，請由已指派 DRS 人員走人工例外處理。'
    );
  end if;

  select review_id, status, submitted_snapshot_sha256, proposed_text_sha256,
         model, model_version, rag_version, skill_version,
         service_error_code, findings, evidence_refs, recommendations
    into v_existing
    from integration.drs_line_ai_reviews
   where review_request_id = p_review_request_id
   for update;

  if found then
    if v_existing.review_id is distinct from p_review_id
       or v_existing.status is distinct from v_safe_status
       or v_existing.submitted_snapshot_sha256 is distinct from v_request.submitted_snapshot_sha256
       or v_existing.proposed_text_sha256 is distinct from v_safe_proposed_text_sha256
       or v_existing.model is distinct from v_safe_model
       or v_existing.model_version is distinct from v_safe_model_version
       or v_existing.rag_version is distinct from v_safe_rag_version
       or v_existing.skill_version is distinct from v_safe_skill_version
       or v_existing.service_error_code is distinct from v_safe_service_error_code
       or v_existing.findings is distinct from v_safe_findings
       or v_existing.evidence_refs is distinct from v_safe_evidence_refs
       or v_existing.recommendations is distinct from v_safe_recommendations then
      raise exception 'ai_review_replay_conflict' using errcode = '23505';
    end if;
    return v_existing.review_id;
  end if;

  if v_request.status is distinct from 'pending' then
    raise exception 'ai_review_request_already_completed' using errcode = 'P0001';
  end if;

  insert into integration.drs_line_ai_reviews (
    review_id, review_request_id, case_id, linked_group_id, status,
    submitted_snapshot_sha256, produced_by, findings, evidence_refs,
    recommendations, proposed_text_sha256, model, model_version, rag_version,
    skill_version, service_error_code, created_at, completed_at
  ) values (
    p_review_id, p_review_request_id, v_request.case_id, v_request.linked_group_id,
    v_safe_status, v_request.submitted_snapshot_sha256, 'advisory_port',
    v_safe_findings, v_safe_evidence_refs,
    v_safe_recommendations, v_safe_proposed_text_sha256,
    v_safe_model, v_safe_model_version, v_safe_rag_version, v_safe_skill_version,
    v_safe_service_error_code, v_request.created_at, v_now
  )
  on conflict (review_request_id) do update
    set review_request_id = integration.drs_line_ai_reviews.review_request_id
    where integration.drs_line_ai_reviews.review_id is not distinct from excluded.review_id
      and integration.drs_line_ai_reviews.review_request_id is not distinct from excluded.review_request_id
      and integration.drs_line_ai_reviews.status is not distinct from excluded.status
      and integration.drs_line_ai_reviews.submitted_snapshot_sha256 is not distinct from excluded.submitted_snapshot_sha256
      and integration.drs_line_ai_reviews.proposed_text_sha256 is not distinct from excluded.proposed_text_sha256
      and integration.drs_line_ai_reviews.model is not distinct from excluded.model
      and integration.drs_line_ai_reviews.model_version is not distinct from excluded.model_version
      and integration.drs_line_ai_reviews.rag_version is not distinct from excluded.rag_version
      and integration.drs_line_ai_reviews.skill_version is not distinct from excluded.skill_version
      and integration.drs_line_ai_reviews.service_error_code is not distinct from excluded.service_error_code
      and integration.drs_line_ai_reviews.findings is not distinct from excluded.findings
      and integration.drs_line_ai_reviews.evidence_refs is not distinct from excluded.evidence_refs
      and integration.drs_line_ai_reviews.recommendations is not distinct from excluded.recommendations
  returning review_id into v_review_id;

  if v_review_id is null then
    raise exception 'ai_review_replay_conflict' using errcode = '23505';
  end if;

  update integration.drs_line_ai_review_requests
     set status = 'completed',
         completed_review_id = v_review_id,
         completed_at = v_now,
         submitted_body = null,
         submitted_body_cleared_at = v_now
   where review_request_id = p_review_request_id
     and status = 'pending';

  return v_review_id;
end;
$$;

create or replace function integration.drs_line_w1_record_human_decision(
  p_decision_id uuid,
  p_finalization_key text,
  p_case_id uuid,
  p_linked_group_id uuid,
  p_assignment_id uuid,
  p_verified_auth_subject text,
  p_ai_review_id uuid,
  p_decision_value text,
  p_reason text,
  p_final_body text,
  p_final_snapshot_sha256 text,
  p_final_attachment_refs jsonb,
  p_urgency text,
  p_service_incident_id text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_now timestamptz := clock_timestamp();
  v_assignment record;
  v_review record;
  v_existing record;
  v_final_text_sha256 text;
  v_decision_payload_sha256 text;
  v_decision_id uuid;
begin
  select *
    into v_assignment
    from integration.drs_line_specialist_assignments
   where assignment_id = p_assignment_id
     and case_id = p_case_id
     and verified_auth_subject = p_verified_auth_subject
     and status = 'active'
     and valid_from <= v_now
     and v_now < valid_to
   for update;

  if not found then
    raise exception 'assignment_not_active' using errcode = 'P0001';
  end if;

  select *
    into v_review
    from integration.drs_line_ai_reviews
   where review_id = p_ai_review_id
     and case_id = p_case_id
     and linked_group_id = p_linked_group_id
     and produced_by = 'advisory_port'
   for update;

  if not found then
    raise exception 'ai_review_not_persisted' using errcode = 'P0001';
  end if;

  select decision_id, decision_payload_sha256
    into v_existing
    from integration.drs_line_human_decisions
   where finalization_key = p_finalization_key
   for update;

  v_final_text_sha256 := case
    when p_decision_value = 'CANCEL' then null
    else integration.drs_line_w1_sha256_text(p_final_body)
  end;

  if p_decision_value is distinct from 'CANCEL'
     and (p_final_body is null or p_final_snapshot_sha256 is null) then
    raise exception 'final_snapshot_required' using errcode = 'P0001';
  end if;

  if v_review.review_consumed_by_decision_id is not null
     and v_review.review_consumed_by_decision_id is distinct from p_decision_id then
    raise exception 'ai_review_already_consumed' using errcode = 'P0001';
  end if;

  if v_review.status is distinct from 'REVIEW_SERVICE_UNAVAILABLE'
     and p_decision_value is not distinct from 'MANUAL_EXCEPTION_SEND' then
    raise exception 'manual_exception_not_allowed' using errcode = 'P0001';
  end if;

  if v_review.status is not distinct from 'REVIEW_SERVICE_UNAVAILABLE'
     and p_decision_value not in ('MANUAL_EXCEPTION_SEND', 'CANCEL') then
    raise exception 'manual_exception_required' using errcode = 'P0001';
  end if;

  if p_decision_value is not distinct from 'MANUAL_EXCEPTION_SEND'
     and (coalesce(p_reason, '') = ''
          or p_urgency is null
          or p_service_incident_id is null) then
    raise exception 'manual_exception_invalid' using errcode = 'P0001';
  end if;

  v_decision_payload_sha256 := integration.drs_line_w1_sha256_json(
    jsonb_build_object(
      'decisionType', p_decision_value,
      'reason', p_reason,
      'urgency', p_urgency,
      'serviceIncidentId', p_service_incident_id,
      'finalizationKey', p_finalization_key,
      'caseId', p_case_id,
      'linkedGroupId', p_linked_group_id,
      'assignmentId', p_assignment_id,
      'specialistId', v_assignment.specialist_id,
      'specialistEmailSnapshot', v_assignment.specialist_email_snapshot,
      'aiReviewId', p_ai_review_id,
      'finalTextSha256', v_final_text_sha256,
      'finalSnapshotSha256', p_final_snapshot_sha256,
      'finalAttachmentRefs', coalesce(p_final_attachment_refs, '[]'::jsonb)
    )
  );

  if found then
    if v_existing.decision_payload_sha256 is distinct from v_decision_payload_sha256 then
      raise exception 'finalization_replay_conflict' using errcode = '23505';
    end if;
    return v_existing.decision_id;
  end if;

  insert into integration.drs_line_human_decisions (
    decision_id, finalization_key, assignment_id, case_id, linked_group_id,
    specialist_id, specialist_email_snapshot, ai_review_id, decision_type,
    reason, final_body, final_text_sha256, final_snapshot_sha256,
    final_attachment_refs, urgency, service_incident_id,
    decision_payload_sha256, decided_at
  ) values (
    p_decision_id, p_finalization_key, p_assignment_id, p_case_id,
    p_linked_group_id, v_assignment.specialist_id,
    v_assignment.specialist_email_snapshot, p_ai_review_id, p_decision_value,
    p_reason, p_final_body, v_final_text_sha256, p_final_snapshot_sha256,
    coalesce(p_final_attachment_refs, '[]'::jsonb), p_urgency,
    p_service_incident_id, v_decision_payload_sha256, v_now
  )
  on conflict (finalization_key) do update
    set finalization_key = integration.drs_line_human_decisions.finalization_key
    where integration.drs_line_human_decisions.decision_payload_sha256 is not distinct from excluded.decision_payload_sha256
      and integration.drs_line_human_decisions.assignment_id is not distinct from excluded.assignment_id
      and integration.drs_line_human_decisions.case_id is not distinct from excluded.case_id
      and integration.drs_line_human_decisions.linked_group_id is not distinct from excluded.linked_group_id
      and integration.drs_line_human_decisions.ai_review_id is not distinct from excluded.ai_review_id
      and integration.drs_line_human_decisions.decision_type is not distinct from excluded.decision_type
  returning decision_id into v_decision_id;

  if v_decision_id is null then
    raise exception 'finalization_replay_conflict' using errcode = '23505';
  end if;

  update integration.drs_line_ai_reviews
     set review_consumed_by_decision_id = v_decision_id,
         consumed_at = v_now
    where review_id = p_ai_review_id
      and review_consumed_by_decision_id is null;

  return v_decision_id;
end;
$$;

create or replace function integration.drs_line_w1_finalize_message(
  p_decision_id uuid,
  p_final_message_id uuid,
  p_outbox_id uuid,
  p_retry_key uuid,
  p_final_audit_event_id uuid,
  p_expected_final_snapshot_sha256 text,
  p_deliverable_messages jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_now timestamptz := clock_timestamp();
  v_decision record;
  v_review record;
  v_group record;
  v_assignment record;
  v_existing_final record;
  v_existing_outbox record;
  v_recomputed_final_text_sha256 text;
  v_recomputed_final_snapshot_sha256 text;
  v_canonical_final_attachment_refs jsonb;
  v_final_message_id uuid;
  v_outbox_id uuid;
begin
  select *
    into v_decision
    from integration.drs_line_human_decisions
   where decision_id = p_decision_id
   for update;

  if not found then
    raise exception 'human_decision_not_persisted' using errcode = 'P0001';
  end if;

  if v_decision.decision_type = 'CANCEL' then
    -- cancel_creates_no_final_message
    return null;
  end if;

  select *
    into v_review
    from integration.drs_line_ai_reviews
   where review_id = v_decision.ai_review_id
     and case_id = v_decision.case_id
     and linked_group_id = v_decision.linked_group_id
     and review_consumed_by_decision_id = v_decision.decision_id
   for update;

  if not found then
    raise exception 'ai_review_decision_relationship_invalid' using errcode = 'P0001';
  end if;

  if v_review.status is not distinct from 'REVIEW_SERVICE_UNAVAILABLE'
     and v_decision.decision_type is distinct from 'MANUAL_EXCEPTION_SEND' then
    raise exception 'manual_exception_requires_unavailable_review' using errcode = 'P0001';
  end if;

  if v_review.status is distinct from 'REVIEW_SERVICE_UNAVAILABLE'
     and v_decision.decision_type is not distinct from 'MANUAL_EXCEPTION_SEND' then
    raise exception 'manual_exception_requires_unavailable_review' using errcode = 'P0001';
  end if;

  if v_review.status is not distinct from 'REVIEW_COMPLETED_NO_FLAG'
     and v_decision.decision_type is not distinct from 'OVERRIDE_AND_SEND' then
    raise exception 'override_not_allowed_for_no_flag' using errcode = 'P0001';
  end if;

  select *
    into v_assignment
    from integration.drs_line_specialist_assignments
   where assignment_id = v_decision.assignment_id
     and case_id = v_decision.case_id
     and specialist_id = v_decision.specialist_id
     and status = 'active'
     and valid_from <= v_now
     and v_now < valid_to
   for update;

  if not found then
    raise exception 'assignment_not_active' using errcode = 'P0001';
  end if;

  v_recomputed_final_text_sha256 := integration.drs_line_w1_sha256_text(v_decision.final_body);
  if p_deliverable_messages is null
     or jsonb_typeof(p_deliverable_messages) is distinct from 'array'
     or jsonb_array_length(p_deliverable_messages) = 0 then
    raise exception 'attachment_transport_unavailable' using errcode = 'P0001';
  end if;
  if p_deliverable_messages->0->>'type' is distinct from 'text'
     or p_deliverable_messages->0->>'purpose' is distinct from 'final_text'
     or p_deliverable_messages->0->>'text' is distinct from v_decision.final_body then
    raise exception 'final_text_deliverable_invalid' using errcode = 'P0001';
  end if;
  if jsonb_array_length(p_deliverable_messages) is distinct from 1 + jsonb_array_length(coalesce(v_decision.final_attachment_refs, '[]'::jsonb)) then
    raise exception 'attachment_payload_cardinality_invalid' using errcode = 'P0001';
  end if;
  if (
    select array_agg(key.name order by key.name)
      from jsonb_object_keys(p_deliverable_messages->0) as key(name)
  ) is distinct from array['purpose', 'text', 'type']::text[] then
    raise exception 'final_text_deliverable_invalid' using errcode = 'P0001';
  end if;
  if exists (
    select 1
      from jsonb_array_elements(p_deliverable_messages) with ordinality as message(value, ordinality)
     where message.ordinality > 1
       and message.value->>'purpose' is distinct from 'attachment_payload'
  ) then
    raise exception 'attachment_payload_cardinality_invalid' using errcode = 'P0001';
  end if;
  if exists (
    select 1
      from jsonb_array_elements(p_deliverable_messages) as message(value),
           jsonb_object_keys(message.value) as key(name)
     where key.name not in (
       'type', 'purpose', 'text', 'originalContentUrl', 'previewImageUrl',
       'attachmentRef', 'accessUrl', 'accessUrlKind'
     )
        or key.name = 'private_draft'
  ) then
    raise exception 'unknown_json_key' using errcode = 'P0001';
  end if;
  if exists (
    select 1
      from jsonb_array_elements(p_deliverable_messages) as message(value)
     where message.value->>'purpose' = 'attachment_payload'
       and (
         jsonb_typeof(message.value->'attachmentRef') is distinct from 'object'
         or exists (
           select 1
             from jsonb_object_keys(message.value->'attachmentRef') as key(name)
            where key.name not in ('attachmentId', 'mimeType', 'byteSize', 'sha256', 'storageRef')
               or key.name = 'private_draft'
         )
       )
  ) then
    raise exception 'unknown_json_key' using errcode = 'P0001';
  end if;
  if exists (
    select 1
      from jsonb_array_elements(coalesce(v_decision.final_attachment_refs, '[]'::jsonb)) as ref(value),
           jsonb_object_keys(ref.value) as key(name)
     where key.name not in ('attachmentId', 'mimeType', 'byteSize', 'sha256', 'storageRef')
        or key.name = 'private_draft'
  ) then
    raise exception 'unknown_json_key' using errcode = 'P0001';
  end if;
  if exists (
    select 1
      from jsonb_array_elements(coalesce(v_decision.final_attachment_refs, '[]'::jsonb)) as ref(value)
     where (
       select count(*) filter (
         where message.value->>'purpose' = 'attachment_payload'
           and message.value->'attachmentRef'->>'attachmentId' = ref.value->>'attachmentId'
       )
         from jsonb_array_elements(p_deliverable_messages) as message(value)
     ) <> 1
  ) then
    raise exception 'attachment_payload_cardinality_invalid' using errcode = 'P0001';
  end if;
  if exists (
    select 1
      from jsonb_array_elements(p_deliverable_messages) with ordinality as message(value, ordinality)
      left join jsonb_array_elements(coalesce(v_decision.final_attachment_refs, '[]'::jsonb)) as ref(value)
        on message.value->'attachmentRef'->>'attachmentId' = ref.value->>'attachmentId'
     where message.ordinality > 1
       and (
         ref.value is null
         or message.value->'attachmentRef' is distinct from ref.value
         or (
           select array_agg(key.name order by key.name)
             from jsonb_object_keys(message.value->'attachmentRef') as key(name)
         ) is distinct from array['attachmentId', 'byteSize', 'mimeType', 'sha256', 'storageRef']::text[]
         or jsonb_typeof(message.value->'attachmentRef'->'attachmentId') is distinct from 'string'
         or jsonb_typeof(message.value->'attachmentRef'->'mimeType') is distinct from 'string'
         or jsonb_typeof(message.value->'attachmentRef'->'byteSize') is distinct from 'number'
         or jsonb_typeof(message.value->'attachmentRef'->'sha256') is distinct from 'string'
         or jsonb_typeof(message.value->'attachmentRef'->'storageRef') is distinct from 'string'
         or message.value->'attachmentRef'->>'attachmentId' !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
         or message.value->'attachmentRef'->>'sha256' !~* '^[0-9a-f]{64}$'
         or message.value->'attachmentRef'->>'byteSize' !~ '^[1-9][0-9]*$'
         or nullif(message.value->'attachmentRef'->>'storageRef', '') is null
       )
  ) then
    raise exception 'attachment_ref_shape_invalid' using errcode = 'P0001';
  end if;
  if exists (
    select 1
      from jsonb_array_elements(p_deliverable_messages) as message(value)
      join jsonb_array_elements(coalesce(v_decision.final_attachment_refs, '[]'::jsonb)) as ref(value)
        on message.value->'attachmentRef'->>'attachmentId' = ref.value->>'attachmentId'
     where ref.value->>'mimeType' in ('image/jpeg', 'image/png')
       and (
         message.value->>'type' is distinct from 'image'
         or (
           select array_agg(key.name order by key.name)
             from jsonb_object_keys(message.value) as key(name)
         ) is distinct from array['attachmentRef', 'originalContentUrl', 'previewImageUrl', 'purpose', 'type']::text[]
         or nullif(message.value->>'originalContentUrl', '') is null
         or nullif(message.value->>'previewImageUrl', '') is null
         or message.value->>'originalContentUrl' not like 'https://%'
         or message.value->>'previewImageUrl' not like 'https://%'
       )
  ) then
    raise exception 'image_url_invalid' using errcode = 'P0001';
  end if;
  if exists (
    select 1
      from jsonb_array_elements(p_deliverable_messages) as message(value)
      join jsonb_array_elements(coalesce(v_decision.final_attachment_refs, '[]'::jsonb)) as ref(value)
        on message.value->'attachmentRef'->>'attachmentId' = ref.value->>'attachmentId'
     where ref.value->>'mimeType' = 'application/pdf'
       and (
          message.value->>'type' is distinct from 'text'
          or jsonb_typeof(message.value->'accessUrl') is distinct from 'string'
          or jsonb_typeof(message.value->'accessUrlKind') is distinct from 'string'
          or jsonb_typeof(message.value->'text') is distinct from 'string'
          or (
            select array_agg(key.name order by key.name)
              from jsonb_object_keys(message.value) as key(name)
          ) is distinct from array['accessUrl', 'accessUrlKind', 'attachmentRef', 'purpose', 'text', 'type']::text[]
          or message.value->>'accessUrlKind' is distinct from 'drs_opaque_attachment_access'
          -- pdf access URL rejects explicit port/userinfo/query/fragment and encoded path drift (%2f/%2F).
          or message.value->>'accessUrl' !~ ('^https://drs[.]local[.]invalid/access/' || (ref.value->>'attachmentId') || '$')
          or message.value->>'accessUrl' like '%://drs.local.invalid:%'
          or message.value->>'accessUrl' like '%@drs.local.invalid%'
          or message.value->>'accessUrl' like '%?%'
          or message.value->>'accessUrl' like '%#%'
          or lower(message.value->>'accessUrl') like '%2f%'
          or message.value->>'text' is distinct from ('PDF 附件安全連結：' || (message.value->>'accessUrl'))
          or position(ref.value->>'storageRef' in message.value->>'accessUrl') > 0
        )
  ) then
    raise exception 'pdf_opaque_access_url_invalid' using errcode = 'P0001';
  end if;
  select coalesce(
           jsonb_agg(ref.value order by ref.value->>'attachmentId', ref.value->>'sha256'),
           '[]'::jsonb
         )
    into v_canonical_final_attachment_refs
    from jsonb_array_elements(coalesce(v_decision.final_attachment_refs, '[]'::jsonb)) as ref(value);
  v_recomputed_final_snapshot_sha256 := integration.drs_line_w1_sha256_json(
    jsonb_build_object(
      'finalText', v_decision.final_body,
      'attachments', v_canonical_final_attachment_refs,
      'deliverableMessages', p_deliverable_messages
    )
  );

  if v_decision.final_text_sha256 is distinct from v_recomputed_final_text_sha256
     or v_decision.final_snapshot_sha256 is distinct from p_expected_final_snapshot_sha256
     or v_decision.final_snapshot_sha256 is distinct from v_recomputed_final_snapshot_sha256 then
    raise exception 'final_snapshot_mismatch' using errcode = 'P0001';
  end if;

  select *
    into v_group
    from integration.drs_line_linked_groups
   where linked_group_id = v_decision.linked_group_id
     and case_id = v_decision.case_id
     and status = 'active'
     and drs_member
     and valid_from <= v_now
     and v_now < valid_to
   for update;

  if not found then
    raise exception 'linked_group_not_sendable' using errcode = 'P0001';
  end if;

  if exists (
    select 1
      from jsonb_array_elements(coalesce(v_decision.final_attachment_refs, '[]'::jsonb)) as ref(value)
      left join integration.drs_line_attachment_staging a
        on a.attachment_id = (ref.value->>'attachmentId')::uuid
      left join integration.drs_line_receipts r
        on r.receipt_id = a.receipt_id
     where a.attachment_id is null
        or r.case_id is distinct from v_decision.case_id
        or r.linked_group_id is distinct from v_decision.linked_group_id
        or r.processing_state is distinct from 'accepted'
        or a.status is distinct from 'private_staged'
        or a.byte_size <= 0
        or a.byte_size > 10485760
        or a.sha256 is distinct from ref.value->>'sha256'
        or a.mime_type is distinct from ref.value->>'mimeType'
        or a.byte_size is distinct from (ref.value->>'byteSize')::bigint
        or a.storage_ref is distinct from ref.value->>'storageRef'
  ) then
    raise exception 'final_attachment_not_authorized' using errcode = 'P0001';
  end if;

  select *
    into v_existing_final
    from integration.drs_line_final_messages
   where finalization_key = v_decision.finalization_key
   for update;

  if found then
    if v_existing_final.final_snapshot_sha256 is distinct from v_decision.final_snapshot_sha256
       or v_existing_final.case_id is distinct from v_decision.case_id
       or v_existing_final.linked_group_id is distinct from v_decision.linked_group_id
       or v_existing_final.assignment_id is distinct from v_decision.assignment_id
       or v_existing_final.specialist_id is distinct from v_decision.specialist_id
       or v_existing_final.final_body is distinct from v_decision.final_body
       or v_existing_final.line_group_id is distinct from v_group.line_group_id
       or v_existing_final.deliverable_messages is distinct from p_deliverable_messages then
      raise exception 'final_message_replay_conflict' using errcode = '23505';
    end if;
    return v_existing_final.final_message_id;
  end if;

  insert into integration.drs_line_final_messages (
    final_message_id, case_id, linked_group_id, line_group_id, assignment_id,
    specialist_id, final_body, final_text_sha256, final_snapshot_sha256,
    final_attachment_refs, deliverable_messages, ai_review_id,
    finalization_key, pre_send_review_state, queued_at
  ) values (
    p_final_message_id, v_decision.case_id, v_decision.linked_group_id,
    v_group.line_group_id, v_decision.assignment_id, v_decision.specialist_id,
    v_decision.final_body, v_decision.final_text_sha256,
    v_decision.final_snapshot_sha256, v_decision.final_attachment_refs,
    coalesce(p_deliverable_messages, '[]'::jsonb), v_review.review_id,
    v_decision.finalization_key, v_review.status, v_now
  )
  on conflict (finalization_key) do update
    set finalization_key = integration.drs_line_final_messages.finalization_key
    where integration.drs_line_final_messages.final_snapshot_sha256 is not distinct from excluded.final_snapshot_sha256
      and integration.drs_line_final_messages.case_id is not distinct from excluded.case_id
      and integration.drs_line_final_messages.linked_group_id is not distinct from excluded.linked_group_id
      and integration.drs_line_final_messages.assignment_id is not distinct from excluded.assignment_id
      and integration.drs_line_final_messages.specialist_id is not distinct from excluded.specialist_id
      and integration.drs_line_final_messages.final_body is not distinct from excluded.final_body
      and integration.drs_line_final_messages.final_attachment_refs is not distinct from excluded.final_attachment_refs
      and integration.drs_line_final_messages.deliverable_messages is not distinct from excluded.deliverable_messages
      and integration.drs_line_final_messages.line_group_id is not distinct from excluded.line_group_id
      and integration.drs_line_final_messages.ai_review_id is not distinct from excluded.ai_review_id
  returning final_message_id into v_final_message_id;

  if v_final_message_id is null then
    raise exception 'final_message_replay_conflict' using errcode = '23505';
  end if;

  insert into integration.drs_line_outbox (
    outbox_id, case_id, linked_group_id, target_type, line_group_id,
    retry_key, final_message_id, status, created_at
  ) values (
    p_outbox_id, v_decision.case_id, v_decision.linked_group_id, 'group',
    v_group.line_group_id, p_retry_key, v_final_message_id, 'queued', v_now
  )
  on conflict (final_message_id) do update
    set final_message_id = integration.drs_line_outbox.final_message_id
    where integration.drs_line_outbox.case_id is not distinct from excluded.case_id
      and integration.drs_line_outbox.linked_group_id is not distinct from excluded.linked_group_id
      and integration.drs_line_outbox.line_group_id is not distinct from excluded.line_group_id
      and integration.drs_line_outbox.retry_key is not distinct from excluded.retry_key
      and integration.drs_line_outbox.status is not distinct from excluded.status
  returning outbox_id into v_outbox_id;

  if v_outbox_id is null then
    raise exception 'outbox_replay_conflict' using errcode = '23505';
  end if;

  select *
    into v_existing_outbox
    from integration.drs_line_outbox
   where final_message_id = v_final_message_id
   for update;

  if not found
     or v_existing_outbox.case_id is distinct from v_decision.case_id
     or v_existing_outbox.linked_group_id is distinct from v_decision.linked_group_id
     or v_existing_outbox.line_group_id is distinct from v_group.line_group_id then
    raise exception 'outbox_target_mismatch' using errcode = 'P0001';
  end if;

  insert into integration.drs_line_audit_events (
    audit_event_id, event_type, schema_version, case_id, linked_group_id,
    correlation_id, occurred_at, recorded_at, actor_type, actor_id,
    specialist_id, specialist_email_snapshot, visibility_scope,
    policy_version, payload_sha256
  ) values (
    p_final_audit_event_id, 'FINAL_MESSAGE', 'laibe.drs.audit.v1',
    v_decision.case_id, v_decision.linked_group_id, v_final_message_id::text,
    v_now, v_now, 'DRS', 'verified-specialist',
    v_decision.specialist_id, v_decision.specialist_email_snapshot,
    'LINE_GROUP', 'drs-line-w1', v_decision.final_snapshot_sha256
  )
  on conflict (event_type, correlation_id) do update
    set audit_event_id = integration.drs_line_audit_events.audit_event_id
    where integration.drs_line_audit_events.payload_sha256 is not distinct from excluded.payload_sha256;

  return v_final_message_id;
end;
$$;

create or replace function integration.drs_line_w1_issue_opaque_handle(
  p_token uuid,
  p_token_type text,
  p_subject_type text,
  p_subject_id uuid,
  p_specialist_id uuid,
  p_verified_auth_subject text,
  p_case_id uuid,
  p_linked_group_id uuid,
  p_review_id uuid,
  p_action text,
  p_action_context_id text,
  p_expires_at timestamptz
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_token uuid;
begin
  if p_token is null or p_token_type is null or p_action_context_id is null or p_expires_at is null then
    raise exception 'opaque_token_issue_required_fields' using errcode = 'P0001';
  end if;

  insert into integration.drs_line_opaque_handles (
    token, token_type, subject_type, subject_id, specialist_id,
    verified_auth_subject, case_id, linked_group_id, review_id, action,
    action_context_id, expires_at
  ) values (
    p_token, p_token_type, p_subject_type, p_subject_id, p_specialist_id,
    p_verified_auth_subject, p_case_id, p_linked_group_id, p_review_id,
    p_action, p_action_context_id, p_expires_at
  )
  on conflict (token) do update
    set token = integration.drs_line_opaque_handles.token
    where integration.drs_line_opaque_handles.token_type is not distinct from excluded.token_type
      and integration.drs_line_opaque_handles.subject_type is not distinct from excluded.subject_type
      and integration.drs_line_opaque_handles.subject_id is not distinct from excluded.subject_id
      and integration.drs_line_opaque_handles.specialist_id is not distinct from excluded.specialist_id
      and integration.drs_line_opaque_handles.verified_auth_subject is not distinct from excluded.verified_auth_subject
      and integration.drs_line_opaque_handles.case_id is not distinct from excluded.case_id
      and integration.drs_line_opaque_handles.linked_group_id is not distinct from excluded.linked_group_id
      and integration.drs_line_opaque_handles.review_id is not distinct from excluded.review_id
      and integration.drs_line_opaque_handles.action is not distinct from excluded.action
      and integration.drs_line_opaque_handles.action_context_id is not distinct from excluded.action_context_id
      and integration.drs_line_opaque_handles.expires_at is not distinct from excluded.expires_at
  returning token into v_token;

  if v_token is null then
    raise exception 'opaque_token_issue_conflict' using errcode = '23505';
  end if;

  return v_token;
end;
$$;

create or replace function integration.drs_line_w1_consume_opaque_handle(
  p_token uuid,
  p_token_type text,
  p_specialist_id uuid,
  p_verified_auth_subject text,
  p_case_id uuid,
  p_linked_group_id uuid,
  p_now timestamptz
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_now timestamptz := p_now;
  v_handle record;
begin
  if p_now is null then
    raise exception 'opaque_token_invalid_now' using errcode = 'P0001';
  end if;

  select *
    into v_handle
    from integration.drs_line_opaque_handles
   where token = p_token
     and token_type = p_token_type
   for update;

  if not found then
    raise exception 'opaque_token_unknown' using errcode = 'P0001';
  end if;

  if v_handle.consumed_at is not null then
    raise exception 'opaque_token_consumed' using errcode = 'P0001';
  end if;

  if v_now >= v_handle.expires_at then
    raise exception 'opaque_token_expired' using errcode = 'P0001';
  end if;

  if p_token_type = 'specialist_postback'
     and (v_handle.specialist_id is distinct from p_specialist_id
          or v_handle.verified_auth_subject is distinct from p_verified_auth_subject
          or v_handle.case_id is distinct from p_case_id
          or v_handle.linked_group_id is distinct from p_linked_group_id) then
    raise exception 'opaque_token_context_mismatch' using errcode = 'P0001';
  end if;

  update integration.drs_line_opaque_handles
     set consumed_at = v_now,
         consumed_by = p_verified_auth_subject
   where token = p_token
     and consumed_at is null;

  return v_handle.token;
end;
$$;

create or replace function integration.drs_line_w1_record_break_glass(
  p_provider_receipt_key text,
  p_receipt_id uuid,
  p_line_sent_audit_event_id uuid,
  p_human_decision_audit_event_id uuid,
  p_final_audit_event_id uuid,
  p_decision_id uuid,
  p_final_message_id uuid,
  p_case_id uuid,
  p_linked_group_id uuid,
  p_line_group_id text,
  p_private_control_line_user_id text,
  p_assignment_id uuid,
  p_verified_auth_subject text,
  p_line_message_id text,
  p_final_body text,
  p_final_attachment_refs jsonb,
  p_reason text,
  p_urgency text,
  p_service_incident_id text,
  p_fingerprint_sha256 text,
  p_final_snapshot_sha256 text,
  p_deliverable_messages jsonb,
  p_sent_at timestamptz
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_now timestamptz := clock_timestamp();
  v_group record;
  v_assignment record;
  v_existing record;
  v_final_text_sha256 text := integration.drs_line_w1_sha256_text(p_final_body);
  v_decision_payload_sha256 text;
  v_recomputed_final_snapshot_sha256 text;
  v_canonical_final_attachment_refs jsonb;
  v_provider_fingerprint text;
  v_final_message_id uuid;
  v_existing_final record;
  v_has_existing_receipt boolean := false;
begin
  perform pg_advisory_xact_lock(hashtextextended('drs_line_w1_break_glass:' || p_provider_receipt_key, 0));

  select *
    into v_existing
    from integration.drs_line_receipts
   where provider_receipt_key = p_provider_receipt_key
   for update;
  v_has_existing_receipt := found;

  if p_deliverable_messages is null
     or jsonb_typeof(p_deliverable_messages) is distinct from 'array'
     or jsonb_array_length(p_deliverable_messages) = 0 then
    raise exception 'attachment_transport_unavailable' using errcode = 'P0001';
  end if;
  if p_deliverable_messages->0->>'type' is distinct from 'text'
     or p_deliverable_messages->0->>'purpose' is distinct from 'final_text'
     or p_deliverable_messages->0->>'text' is distinct from p_final_body then
    raise exception 'final_text_deliverable_invalid' using errcode = 'P0001';
  end if;
  if jsonb_array_length(p_deliverable_messages) is distinct from 1 + jsonb_array_length(coalesce(p_final_attachment_refs, '[]'::jsonb)) then
    raise exception 'attachment_payload_cardinality_invalid' using errcode = 'P0001';
  end if;
  if (
    select array_agg(key.name order by key.name)
      from jsonb_object_keys(p_deliverable_messages->0) as key(name)
  ) is distinct from array['purpose', 'text', 'type']::text[] then
    raise exception 'final_text_deliverable_invalid' using errcode = 'P0001';
  end if;
  if exists (
    select 1
      from jsonb_array_elements(p_deliverable_messages) with ordinality as message(value, ordinality)
     where message.ordinality > 1
       and message.value->>'purpose' is distinct from 'attachment_payload'
  ) then
    raise exception 'attachment_payload_cardinality_invalid' using errcode = 'P0001';
  end if;
  if exists (
    select 1
      from jsonb_array_elements(p_deliverable_messages) as message(value),
           jsonb_object_keys(message.value) as key(name)
     where key.name not in (
       'type', 'purpose', 'text', 'originalContentUrl', 'previewImageUrl',
       'attachmentRef', 'accessUrl', 'accessUrlKind'
     )
        or key.name = 'private_draft'
  ) then
    raise exception 'unknown_json_key' using errcode = 'P0001';
  end if;
  if exists (
    select 1
      from jsonb_array_elements(p_deliverable_messages) as message(value)
     where message.value->>'purpose' = 'attachment_payload'
       and (
         jsonb_typeof(message.value->'attachmentRef') is distinct from 'object'
         or exists (
           select 1
             from jsonb_object_keys(message.value->'attachmentRef') as key(name)
            where key.name not in ('attachmentId', 'mimeType', 'byteSize', 'sha256', 'storageRef')
               or key.name = 'private_draft'
         )
       )
  ) then
    raise exception 'unknown_json_key' using errcode = 'P0001';
  end if;
  if exists (
    select 1
      from jsonb_array_elements(coalesce(p_final_attachment_refs, '[]'::jsonb)) as ref(value),
           jsonb_object_keys(ref.value) as key(name)
     where key.name not in ('attachmentId', 'mimeType', 'byteSize', 'sha256', 'storageRef')
        or key.name = 'private_draft'
  ) then
    raise exception 'unknown_json_key' using errcode = 'P0001';
  end if;
  if exists (
    select 1
      from jsonb_array_elements(coalesce(p_final_attachment_refs, '[]'::jsonb)) as ref(value)
     where (
       select count(*) filter (
         where message.value->>'purpose' = 'attachment_payload'
           and message.value->'attachmentRef'->>'attachmentId' = ref.value->>'attachmentId'
       )
         from jsonb_array_elements(p_deliverable_messages) as message(value)
     ) <> 1
  ) then
    raise exception 'attachment_payload_cardinality_invalid' using errcode = 'P0001';
  end if;
  if exists (
    select 1
      from jsonb_array_elements(p_deliverable_messages) with ordinality as message(value, ordinality)
      left join jsonb_array_elements(coalesce(p_final_attachment_refs, '[]'::jsonb)) as ref(value)
        on message.value->'attachmentRef'->>'attachmentId' = ref.value->>'attachmentId'
     where message.ordinality > 1
       and (
         ref.value is null
         or message.value->'attachmentRef' is distinct from ref.value
         or (
           select array_agg(key.name order by key.name)
             from jsonb_object_keys(message.value->'attachmentRef') as key(name)
         ) is distinct from array['attachmentId', 'byteSize', 'mimeType', 'sha256', 'storageRef']::text[]
         or jsonb_typeof(message.value->'attachmentRef'->'attachmentId') is distinct from 'string'
         or jsonb_typeof(message.value->'attachmentRef'->'mimeType') is distinct from 'string'
         or jsonb_typeof(message.value->'attachmentRef'->'byteSize') is distinct from 'number'
         or jsonb_typeof(message.value->'attachmentRef'->'sha256') is distinct from 'string'
         or jsonb_typeof(message.value->'attachmentRef'->'storageRef') is distinct from 'string'
         or message.value->'attachmentRef'->>'attachmentId' !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
         or message.value->'attachmentRef'->>'sha256' !~* '^[0-9a-f]{64}$'
         or message.value->'attachmentRef'->>'byteSize' !~ '^[1-9][0-9]*$'
         or nullif(message.value->'attachmentRef'->>'storageRef', '') is null
       )
  ) then
    raise exception 'attachment_ref_shape_invalid' using errcode = 'P0001';
  end if;
  if exists (
    select 1
      from jsonb_array_elements(p_deliverable_messages) as message(value)
      join jsonb_array_elements(coalesce(p_final_attachment_refs, '[]'::jsonb)) as ref(value)
        on message.value->'attachmentRef'->>'attachmentId' = ref.value->>'attachmentId'
     where ref.value->>'mimeType' in ('image/jpeg', 'image/png')
       and (
         message.value->>'type' is distinct from 'image'
         or (
           select array_agg(key.name order by key.name)
             from jsonb_object_keys(message.value) as key(name)
         ) is distinct from array['attachmentRef', 'originalContentUrl', 'previewImageUrl', 'purpose', 'type']::text[]
         or nullif(message.value->>'originalContentUrl', '') is null
         or nullif(message.value->>'previewImageUrl', '') is null
         or message.value->>'originalContentUrl' not like 'https://%'
         or message.value->>'previewImageUrl' not like 'https://%'
       )
  ) then
    raise exception 'image_url_invalid' using errcode = 'P0001';
  end if;
  if exists (
    select 1
      from jsonb_array_elements(p_deliverable_messages) as message(value)
      join jsonb_array_elements(coalesce(p_final_attachment_refs, '[]'::jsonb)) as ref(value)
        on message.value->'attachmentRef'->>'attachmentId' = ref.value->>'attachmentId'
     where ref.value->>'mimeType' = 'application/pdf'
       and (
          message.value->>'type' is distinct from 'text'
          or jsonb_typeof(message.value->'accessUrl') is distinct from 'string'
          or jsonb_typeof(message.value->'accessUrlKind') is distinct from 'string'
          or jsonb_typeof(message.value->'text') is distinct from 'string'
          or (
            select array_agg(key.name order by key.name)
              from jsonb_object_keys(message.value) as key(name)
          ) is distinct from array['accessUrl', 'accessUrlKind', 'attachmentRef', 'purpose', 'text', 'type']::text[]
          or message.value->>'accessUrlKind' is distinct from 'drs_opaque_attachment_access'
          -- pdf access URL rejects explicit port/userinfo/query/fragment and encoded path drift (%2f/%2F).
          or message.value->>'accessUrl' !~ ('^https://drs[.]local[.]invalid/access/' || (ref.value->>'attachmentId') || '$')
          or message.value->>'accessUrl' like '%://drs.local.invalid:%'
          or message.value->>'accessUrl' like '%@drs.local.invalid%'
          or message.value->>'accessUrl' like '%?%'
          or message.value->>'accessUrl' like '%#%'
          or lower(message.value->>'accessUrl') like '%2f%'
          or message.value->>'text' is distinct from ('PDF 附件安全連結：' || (message.value->>'accessUrl'))
          or position(ref.value->>'storageRef' in message.value->>'accessUrl') > 0
        )
  ) then
    raise exception 'pdf_opaque_access_url_invalid' using errcode = 'P0001';
  end if;
  select coalesce(
           jsonb_agg(ref.value order by ref.value->>'attachmentId', ref.value->>'sha256'),
           '[]'::jsonb
         )
    into v_canonical_final_attachment_refs
    from jsonb_array_elements(coalesce(p_final_attachment_refs, '[]'::jsonb)) as ref(value);

  v_recomputed_final_snapshot_sha256 := integration.drs_line_w1_sha256_json(
    jsonb_build_object(
      'finalText', p_final_body,
      'attachments', v_canonical_final_attachment_refs,
      'deliverableMessages', p_deliverable_messages
    )
  );

  if p_final_snapshot_sha256 is distinct from v_recomputed_final_snapshot_sha256 then
    raise exception 'final_snapshot_mismatch' using errcode = 'P0001';
  end if;

  select *
    into v_group
    from integration.drs_line_linked_groups
   where case_id = p_case_id
     and linked_group_id = p_linked_group_id
     and line_group_id = p_line_group_id
     and status = 'active'
     and drs_member
     and valid_from <= p_sent_at
     and p_sent_at < valid_to
    for update;

  if not found then
    raise exception 'linked_group_not_sendable' using errcode = 'P0001';
  end if;

  select *
    into v_assignment
    from integration.drs_line_specialist_assignments
   where assignment_id = p_assignment_id
     and case_id = p_case_id
     and verified_auth_subject = p_verified_auth_subject
     and private_control_line_user_id = p_private_control_line_user_id
     and status = 'active'
     and valid_from <= p_sent_at
     and p_sent_at < valid_to
    for update;

  if not found then
    raise exception 'assignment_not_active' using errcode = 'P0001';
  end if;

  if coalesce(p_reason, '') = '' or p_urgency is null or p_service_incident_id is null then
    raise exception 'manual_exception_invalid' using errcode = 'P0001';
  end if;

  if exists (
    select 1
      from jsonb_array_elements(coalesce(p_final_attachment_refs, '[]'::jsonb)) as ref(value)
      left join integration.drs_line_attachment_staging a
        on a.attachment_id = (ref.value->>'attachmentId')::uuid
      left join integration.drs_line_receipts r
        on r.receipt_id = a.receipt_id
     where a.attachment_id is null
        or r.case_id is distinct from p_case_id
        or r.linked_group_id is distinct from p_linked_group_id
        or r.processing_state is distinct from 'accepted'
        or a.status is distinct from 'private_staged'
        or a.byte_size <= 0
        or a.byte_size > 10485760
        or a.sha256 is distinct from ref.value->>'sha256'
        or a.mime_type is distinct from ref.value->>'mimeType'
        or a.byte_size is distinct from (ref.value->>'byteSize')::bigint
        or a.storage_ref is distinct from ref.value->>'storageRef'
  ) then
    raise exception 'final_attachment_not_authorized' using errcode = 'P0001';
  end if;

  v_provider_fingerprint := integration.drs_line_w1_sha256_json(
    jsonb_build_object(
      'provider', 'line',
      'lineMessageId', p_line_message_id,
      'lineGroupId', p_line_group_id,
      'caseId', p_case_id,
      'linkedGroupId', p_linked_group_id,
      'assignmentId', p_assignment_id,
      'finalText', p_final_body,
      'attachments', coalesce(p_final_attachment_refs, '[]'::jsonb),
      'deliverableMessages', p_deliverable_messages,
      'reason', p_reason,
      'urgency', p_urgency,
      'serviceIncidentId', p_service_incident_id,
      'sentAt', p_sent_at
    )
  );

  v_decision_payload_sha256 := integration.drs_line_w1_sha256_json(
    jsonb_build_object(
      'decisionType', 'MANUAL_EXCEPTION_SEND',
      'reason', p_reason,
      'urgency', p_urgency,
      'serviceIncidentId', p_service_incident_id,
      'finalizationKey', p_provider_receipt_key,
      'caseId', p_case_id,
      'linkedGroupId', p_linked_group_id,
      'assignmentId', p_assignment_id,
      'specialistId', v_assignment.specialist_id,
      'finalTextSha256', v_final_text_sha256,
      'finalSnapshotSha256', p_final_snapshot_sha256,
      'finalAttachmentRefs', coalesce(p_final_attachment_refs, '[]'::jsonb)
    )
  );

  if v_has_existing_receipt then
    if v_existing.fingerprint_sha256 is distinct from v_provider_fingerprint then
      raise exception 'break_glass_provider_replay_conflict' using errcode = '23505';
    end if;
    select *
      into v_existing_final
      from integration.drs_line_final_messages
     where finalization_key = p_provider_receipt_key
     for update;
    if not found then
      raise exception 'break_glass_missing_final_message' using errcode = 'P0001';
    end if;
    if v_existing_final.case_id is distinct from p_case_id
       or v_existing_final.linked_group_id is distinct from p_linked_group_id
       or v_existing_final.line_group_id is distinct from p_line_group_id
       or v_existing_final.assignment_id is distinct from p_assignment_id
       or v_existing_final.specialist_id is distinct from v_assignment.specialist_id
       or v_existing_final.final_body is distinct from p_final_body
       or v_existing_final.final_attachment_refs is distinct from coalesce(p_final_attachment_refs, '[]'::jsonb)
       or v_existing_final.deliverable_messages is distinct from p_deliverable_messages
       or v_existing_final.final_snapshot_sha256 is distinct from p_final_snapshot_sha256 then
      raise exception 'break_glass_provider_replay_conflict' using errcode = '23505';
    end if;
    -- return query select is intentionally after full semantic validation.
    return v_existing_final.final_message_id;
  end if;

  insert into integration.drs_line_receipts (
    receipt_id, provider, provider_channel_id, provider_receipt_key,
    webhook_event_id, line_message_id, line_group_id, line_sender_user_id,
    linked_group_id, case_id, group_type, message_type, actor_type,
    occurred_at, received_at, fingerprint_sha256, processing_state
  ) values (
    p_receipt_id, 'line', 'break_glass', p_provider_receipt_key,
    p_provider_receipt_key, p_line_message_id, p_line_group_id,
    p_private_control_line_user_id, p_linked_group_id, p_case_id,
    v_group.group_type, 'text', 'DRS', p_sent_at, v_now,
    v_provider_fingerprint, 'accepted'
  );

  insert into integration.drs_line_human_decisions (
    decision_id, finalization_key, assignment_id, case_id, linked_group_id,
    specialist_id, specialist_email_snapshot, ai_review_id, decision_type,
    reason, final_body, final_text_sha256, final_snapshot_sha256,
    final_attachment_refs, urgency, service_incident_id,
    decision_payload_sha256, decided_at
  ) values (
    p_decision_id, p_provider_receipt_key, p_assignment_id, p_case_id,
    p_linked_group_id, v_assignment.specialist_id,
    v_assignment.specialist_email_snapshot, null, 'MANUAL_EXCEPTION_SEND',
    p_reason, p_final_body, v_final_text_sha256, p_final_snapshot_sha256,
    coalesce(p_final_attachment_refs, '[]'::jsonb), p_urgency,
    p_service_incident_id, v_decision_payload_sha256, v_now
  );

  insert into integration.drs_line_final_messages (
    final_message_id, case_id, linked_group_id, line_group_id, assignment_id,
    specialist_id, final_body, final_text_sha256, final_snapshot_sha256,
    final_attachment_refs, deliverable_messages, ai_review_id,
    finalization_key, pre_send_review_state, queued_at
  ) values (
    p_final_message_id, p_case_id, p_linked_group_id, p_line_group_id,
    p_assignment_id, v_assignment.specialist_id, p_final_body,
    v_final_text_sha256, p_final_snapshot_sha256,
    coalesce(p_final_attachment_refs, '[]'::jsonb),
    coalesce(p_deliverable_messages, '[]'::jsonb), null,
    p_provider_receipt_key, 'PRE_SEND_REVIEW_NOT_PERFORMED_BREAK_GLASS', v_now
  )
  returning final_message_id into v_final_message_id;

  insert into integration.drs_line_audit_events (
    audit_event_id, event_type, schema_version, case_id, linked_group_id,
    correlation_id, occurred_at, recorded_at, actor_type, actor_id,
    specialist_id, specialist_email_snapshot, visibility_scope,
    policy_version, payload_sha256
  ) values
    (p_line_sent_audit_event_id, 'LINE_SENT_EVENT', 'laibe.drs.audit.v1',
     p_case_id, p_linked_group_id, p_receipt_id::text, p_sent_at, v_now,
     'DRS', p_verified_auth_subject, v_assignment.specialist_id,
     v_assignment.specialist_email_snapshot, 'DRS_INTERNAL',
     'drs-line-w1', v_provider_fingerprint),
    (p_human_decision_audit_event_id, 'HUMAN_DECISION', 'laibe.drs.audit.v1',
     p_case_id, p_linked_group_id, p_decision_id::text, v_now, v_now,
     'DRS', p_verified_auth_subject, v_assignment.specialist_id,
     v_assignment.specialist_email_snapshot, 'DRS_INTERNAL',
     'drs-line-w1', v_decision_payload_sha256),
    (p_final_audit_event_id, 'FINAL_MESSAGE', 'laibe.drs.audit.v1',
     p_case_id, p_linked_group_id, v_final_message_id::text, v_now, v_now,
     'DRS', p_verified_auth_subject, v_assignment.specialist_id,
     v_assignment.specialist_email_snapshot, 'LINE_GROUP',
     'drs-line-w1', p_final_snapshot_sha256);

  return v_final_message_id;
end;
$$;

create or replace function integration.drs_line_w1_record_group_lifecycle(
  p_lifecycle_event_id uuid,
  p_line_group_id text,
  p_provider_event_key text,
  p_event_type text,
  p_provider_occurred_at timestamptz,
  p_payload_sha256 text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_now timestamptz := clock_timestamp();
  v_group record;
  v_lifecycle_event_id uuid;
begin
  if p_event_type not in ('join', 'leave') then
    raise exception 'unsupported_group_lifecycle_event' using errcode = 'P0001';
  end if;

  select *
    into v_group
    from integration.drs_line_linked_groups
   where line_group_id = p_line_group_id
   for update;

  if not found then
    raise exception 'linked_group_not_found' using errcode = 'P0001';
  end if;

  insert into integration.drs_line_group_lifecycle_events (
    lifecycle_event_id, linked_group_id, line_group_id, provider_event_key,
    event_type, provider_occurred_at, recorded_at, payload_sha256
  ) values (
    p_lifecycle_event_id, v_group.linked_group_id, p_line_group_id,
    p_provider_event_key, p_event_type, p_provider_occurred_at, v_now,
    p_payload_sha256
  )
  on conflict (provider_event_key) do update
    set provider_event_key = integration.drs_line_group_lifecycle_events.provider_event_key
    where integration.drs_line_group_lifecycle_events.linked_group_id is not distinct from excluded.linked_group_id
      and integration.drs_line_group_lifecycle_events.event_type is not distinct from excluded.event_type
      and integration.drs_line_group_lifecycle_events.provider_occurred_at is not distinct from excluded.provider_occurred_at
      and integration.drs_line_group_lifecycle_events.payload_sha256 is not distinct from excluded.payload_sha256
  returning lifecycle_event_id into v_lifecycle_event_id;

  if v_lifecycle_event_id is null then
    raise exception 'group_lifecycle_event_collision' using errcode = '23505';
  end if;

  -- equal timestamp leave wins; formal authorization remains independent.
  if v_group.status = 'active'
     and (
       v_group.bot_presence_updated_at is null
       or p_provider_occurred_at > v_group.bot_presence_updated_at
       or (
         p_provider_occurred_at = v_group.bot_presence_updated_at
         and p_event_type = 'leave'
         and coalesce(v_group.bot_presence_event_type, '') <> 'leave'
       )
     ) then
    update integration.drs_line_linked_groups
       set drs_member = (p_event_type = 'join'),
           bot_presence_updated_at = p_provider_occurred_at,
           bot_presence_event_type = p_event_type,
           bot_presence_event_key = p_provider_event_key,
           updated_at = v_now
     where linked_group_id = v_group.linked_group_id;
  end if;

  return v_lifecycle_event_id;
end;
$$;

alter function integration.drs_line_w1_canonical_json_text_v1(jsonb) owner to laibe_integration_migration_owner;
alter function integration.drs_line_w1_canonical_json_sha256_v1(jsonb) owner to laibe_integration_migration_owner;
alter function integration.drs_line_w1_sha256_json(jsonb) owner to laibe_integration_migration_owner;
alter function integration.drs_line_w1_sha256_text(text) owner to laibe_integration_migration_owner;
alter function integration.drs_line_w1_append_receipt(
  uuid, uuid, uuid, text, text, text, text, text, text, text, timestamptz, text, jsonb
) owner to laibe_integration_migration_owner;
alter function integration.drs_line_w1_request_ai_review(
  uuid, uuid, uuid, text
) owner to laibe_integration_migration_owner;
alter function integration.drs_line_w1_persist_ai_review(
  uuid, uuid, text, text, text, text, text, text, text, jsonb, jsonb, jsonb
) owner to laibe_integration_migration_owner;
alter function integration.drs_line_w1_record_human_decision(
  uuid, text, uuid, uuid, uuid, text, uuid, text, text, text, text, jsonb, text, text
) owner to laibe_integration_migration_owner;
alter function integration.drs_line_w1_finalize_message(
  uuid, uuid, uuid, uuid, uuid, text, jsonb
) owner to laibe_integration_migration_owner;
alter function integration.drs_line_w1_issue_opaque_handle(
  uuid, text, text, uuid, uuid, text, uuid, uuid, uuid, text, text, timestamptz
) owner to laibe_integration_migration_owner;
alter function integration.drs_line_w1_consume_opaque_handle(
  uuid, text, uuid, text, uuid, uuid, timestamptz
) owner to laibe_integration_migration_owner;
alter function integration.drs_line_w1_record_break_glass(
  text, uuid, uuid, uuid, uuid, uuid, uuid, uuid, uuid, text, text, uuid, text, text, text, jsonb, text, text, text, text, text, jsonb, timestamptz
) owner to laibe_integration_migration_owner;
alter function integration.drs_line_w1_record_group_lifecycle(
  uuid, text, text, text, timestamptz, text
) owner to laibe_integration_migration_owner;

revoke all on function integration.drs_line_w1_canonical_json_text_v1(jsonb) from public, anon, authenticated, service_role;
revoke all on function integration.drs_line_w1_canonical_json_sha256_v1(jsonb) from public, anon, authenticated, service_role;
revoke all on function integration.drs_line_w1_sha256_json(jsonb) from public, anon, authenticated, service_role;
revoke all on function integration.drs_line_w1_sha256_text(text) from public, anon, authenticated, service_role;

revoke all on function integration.drs_line_w1_append_receipt(
  uuid, uuid, uuid, text, text, text, text, text, text, text, timestamptz, text, jsonb
) from public, anon, authenticated;
revoke all on function integration.drs_line_w1_request_ai_review(
  uuid, uuid, uuid, text
) from public, anon, authenticated;
revoke all on function integration.drs_line_w1_persist_ai_review(
  uuid, uuid, text, text, text, text, text, text, text, jsonb, jsonb, jsonb
) from public, anon, authenticated;
revoke all on function integration.drs_line_w1_record_human_decision(
  uuid, text, uuid, uuid, uuid, text, uuid, text, text, text, text, jsonb, text, text
) from public, anon, authenticated;
revoke all on function integration.drs_line_w1_finalize_message(
  uuid, uuid, uuid, uuid, uuid, text, jsonb
) from public, anon, authenticated;
revoke all on function integration.drs_line_w1_issue_opaque_handle(
  uuid, text, text, uuid, uuid, text, uuid, uuid, uuid, text, text, timestamptz
) from public, anon, authenticated;
revoke all on function integration.drs_line_w1_consume_opaque_handle(
  uuid, text, uuid, text, uuid, uuid, timestamptz
) from public, anon, authenticated;
revoke all on function integration.drs_line_w1_record_break_glass(
  text, uuid, uuid, uuid, uuid, uuid, uuid, uuid, uuid, text, text, uuid, text, text, text, jsonb, text, text, text, text, text, jsonb, timestamptz
) from public, anon, authenticated;
revoke all on function integration.drs_line_w1_record_group_lifecycle(
  uuid, text, text, text, timestamptz, text
) from public, anon, authenticated;

grant execute on function integration.drs_line_w1_append_receipt(
  uuid, uuid, uuid, text, text, text, text, text, text, text, timestamptz, text, jsonb
) to service_role;
grant execute on function integration.drs_line_w1_request_ai_review(
  uuid, uuid, uuid, text
) to service_role;
grant execute on function integration.drs_line_w1_persist_ai_review(
  uuid, uuid, text, text, text, text, text, text, text, jsonb, jsonb, jsonb
) to service_role;
grant execute on function integration.drs_line_w1_record_human_decision(
  uuid, text, uuid, uuid, uuid, text, uuid, text, text, text, text, jsonb, text, text
) to service_role;
grant execute on function integration.drs_line_w1_finalize_message(
  uuid, uuid, uuid, uuid, uuid, text, jsonb
) to service_role;
grant execute on function integration.drs_line_w1_issue_opaque_handle(
  uuid, text, text, uuid, uuid, text, uuid, uuid, uuid, text, text, timestamptz
) to service_role;
grant execute on function integration.drs_line_w1_consume_opaque_handle(
  uuid, text, uuid, text, uuid, uuid, timestamptz
) to service_role;
grant execute on function integration.drs_line_w1_record_break_glass(
  text, uuid, uuid, uuid, uuid, uuid, uuid, uuid, uuid, text, text, uuid, text, text, text, jsonb, text, text, text, text, text, jsonb, timestamptz
) to service_role;
grant execute on function integration.drs_line_w1_record_group_lifecycle(
  uuid, text, text, text, timestamptz, text
) to service_role;
