create extension if not exists pgcrypto;
create extension if not exists btree_gist;

create schema if not exists drs_private;

create table if not exists public.drs_cases (
  case_id uuid primary key default gen_random_uuid(),
  case_number text not null unique,
  owner_id uuid not null,
  case_state text not null,
  opened_at timestamptz not null default now(),
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint drs_cases_state_check check (
    case_state in ('ACTIVE_REVIEW', 'ACTIVE_CONSTRUCTION', 'CLOSED')
  ),
  constraint drs_cases_closed_at_check check (
    closed_at is null or closed_at >= opened_at
  )
);

create table if not exists public.drs_specialists (
  specialist_id uuid primary key default gen_random_uuid(),
  display_name text not null,
  authority_state text not null default 'ACTIVE',
  created_at timestamptz not null default now(),
  constraint drs_specialists_authority_state_check check (
    authority_state in ('ACTIVE', 'SUSPENDED', 'RETIRED')
  )
);

create table if not exists public.drs_case_line_group_links (
  group_link_id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.drs_cases(case_id) on delete restrict,
  line_group_id text not null,
  group_kind text not null,
  linked_by_specialist_id uuid not null references public.drs_specialists(specialist_id) on delete restrict,
  valid_from timestamptz not null,
  valid_until timestamptz,
  created_at timestamptz not null default now(),
  constraint drs_case_line_group_links_kind_check check (
    group_kind = 'DRS_CASE_GROUP'
  ),
  constraint drs_case_line_group_links_interval_check check (
    valid_until is null or valid_until > valid_from
  )
);

create table if not exists public.drs_case_specialist_assignments (
  assignment_id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.drs_cases(case_id) on delete restrict,
  specialist_id uuid not null references public.drs_specialists(specialist_id) on delete restrict,
  assigned_by uuid not null,
  valid_from timestamptz not null,
  valid_until timestamptz,
  created_at timestamptz not null default now(),
  constraint drs_case_specialist_assignments_interval_check check (
    valid_until is null or valid_until > valid_from
  )
);

create table if not exists public.drs_case_line_group_link_terminations (
  termination_id uuid primary key default gen_random_uuid(),
  group_link_id uuid not null unique references public.drs_case_line_group_links(group_link_id) on delete restrict,
  case_id uuid not null references public.drs_cases(case_id) on delete restrict,
  line_group_id text not null,
  terminated_at timestamptz not null,
  terminated_by uuid not null,
  reason text not null,
  created_at timestamptz not null default now(),
  constraint drs_case_line_group_link_terminations_reason_check check (
    btrim(reason) <> ''
  )
);

create table if not exists public.drs_case_specialist_assignment_terminations (
  termination_id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null unique references public.drs_case_specialist_assignments(assignment_id) on delete restrict,
  case_id uuid not null references public.drs_cases(case_id) on delete restrict,
  specialist_id uuid not null references public.drs_specialists(specialist_id) on delete restrict,
  terminated_at timestamptz not null,
  terminated_by uuid not null,
  reason text not null,
  created_at timestamptz not null default now(),
  constraint drs_case_specialist_assignment_terminations_reason_check check (
    btrim(reason) <> ''
  )
);

create table if not exists public.drs_case_audit_events (
  event_id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.drs_cases(case_id) on delete restrict,
  previous_event_id uuid references public.drs_case_audit_events(event_id) on delete restrict,
  event_type text not null,
  occurred_at timestamptz not null,
  actor_type text not null,
  actor_id text not null,
  source_surface text not null,
  group_link_id uuid references public.drs_case_line_group_links(group_link_id) on delete restrict,
  transport_message_id text,
  payload jsonb not null default '{}'::jsonb,
  recipient_read boolean not null default false,
  created_at timestamptz not null default now(),
  constraint drs_case_audit_events_type_check check (
    event_type in (
      'LINE_SENT_EVENT',
      'AI_REVIEW',
      'HUMAN_DECISION',
      'FINAL_MESSAGE',
      'RECEIPT',
      'WORK_ITEM_TRANSITION'
    )
  ),
  constraint drs_case_audit_events_source_check check (
    source_surface in ('LINE', 'DRS_WORKSPACE', 'SYSTEM')
  ),
  constraint drs_case_audit_events_no_self_previous_check check (
    previous_event_id is null or previous_event_id <> event_id
  ),
  constraint drs_case_audit_events_line_sent_payload_check check (
    event_type <> 'LINE_SENT_EVENT'
    or (
      source_surface = 'LINE'
      and group_link_id is not null
      and coalesce(btrim(transport_message_id), '') <> ''
      and payload->>'message_state' = 'SENT'
    )
  ),
  constraint drs_case_audit_events_final_message_payload_check check (
    event_type <> 'FINAL_MESSAGE'
    or (
      source_surface = 'DRS_WORKSPACE'
      and payload ? 'decision_event_id'
      and payload ? 'final_snapshot_id'
      and coalesce(payload->>'final_text', '') <> ''
      and payload->>'transport_status' = 'ACCEPTED_BY_TRANSPORT'
    )
  ),
  constraint drs_case_audit_events_transport_read_check check (
    event_type <> 'RECEIPT'
    or coalesce(payload->>'receipt_kind', '') <> 'TRANSPORT_ACCEPTED'
    or recipient_read = false
  )
);

create table if not exists public.drs_review_work_items (
  work_item_id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.drs_cases(case_id) on delete restrict,
  work_item_type text not null,
  subject_ref jsonb not null,
  state text not null,
  next_actor text not null,
  requested_by uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint drs_review_work_items_type_check check (
    work_item_type in ('DOCUMENT_REVIEW', 'DRAWING_REVIEW')
  ),
  constraint drs_review_work_items_state_check check (
    state in (
      'WAITING_FOR_SPECIALIST_REVIEW',
      'WAITING_FOR_OWNER_DECISION',
      'CLOSED_RECORDED'
    )
  ),
  constraint drs_review_work_items_next_actor_check check (
    next_actor in ('DRS_SPECIALIST', 'OWNER', 'NONE')
  ),
  constraint drs_review_work_items_subject_ref_check check (
    (
      work_item_type = 'DOCUMENT_REVIEW'
      and jsonb_typeof(subject_ref) = 'object'
      and subject_ref ?& array['document_id', 'version']
      and subject_ref - array['document_id', 'version'] = '{}'::jsonb
      and jsonb_typeof(subject_ref->'document_id') = 'string'
      and subject_ref->>'document_id' ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
      and jsonb_typeof(subject_ref->'version') = 'string'
      and coalesce(btrim(subject_ref->>'version'), '') <> ''
    )
    or (
      work_item_type = 'DRAWING_REVIEW'
      and jsonb_typeof(subject_ref) = 'object'
      and subject_ref ?& array['drawing_id', 'version']
      and subject_ref - array['drawing_id', 'version'] = '{}'::jsonb
      and jsonb_typeof(subject_ref->'drawing_id') = 'string'
      and subject_ref->>'drawing_id' ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
      and jsonb_typeof(subject_ref->'version') = 'string'
      and coalesce(btrim(subject_ref->>'version'), '') <> ''
    )
  )
);

create table if not exists public.drs_review_work_item_transitions (
  transition_id uuid primary key default gen_random_uuid(),
  work_item_id uuid not null references public.drs_review_work_items(work_item_id) on delete restrict,
  case_id uuid not null references public.drs_cases(case_id) on delete restrict,
  audit_event_id uuid not null references public.drs_case_audit_events(event_id) on delete restrict,
  from_state text not null,
  to_state text not null,
  next_actor text not null,
  action text not null,
  actor_type text not null,
  actor_id text not null,
  occurred_at timestamptz not null,
  created_at timestamptz not null default now(),
  constraint drs_review_work_item_transitions_state_check check (
    from_state in (
      'WAITING_FOR_SPECIALIST_REVIEW',
      'WAITING_FOR_OWNER_DECISION',
      'CLOSED_RECORDED'
    )
    and to_state in (
      'WAITING_FOR_SPECIALIST_REVIEW',
      'WAITING_FOR_OWNER_DECISION',
      'CLOSED_RECORDED'
    )
    and next_actor in ('DRS_SPECIALIST', 'OWNER', 'NONE')
  )
);

create index if not exists drs_case_line_group_links_case_id_idx
  on public.drs_case_line_group_links(case_id);

create index if not exists drs_case_line_group_links_specialist_id_idx
  on public.drs_case_line_group_links(linked_by_specialist_id);

create index if not exists drs_case_line_group_link_terminations_case_id_idx
  on public.drs_case_line_group_link_terminations(case_id);

create index if not exists drs_case_line_group_link_terminations_line_group_id_idx
  on public.drs_case_line_group_link_terminations(line_group_id);

create index if not exists drs_case_specialist_assignments_case_id_idx
  on public.drs_case_specialist_assignments(case_id);

create index if not exists drs_case_specialist_assignments_specialist_id_idx
  on public.drs_case_specialist_assignments(specialist_id);

create index if not exists drs_case_specialist_assignment_terminations_case_id_idx
  on public.drs_case_specialist_assignment_terminations(case_id);

create index if not exists drs_case_specialist_assignment_terminations_specialist_id_idx
  on public.drs_case_specialist_assignment_terminations(specialist_id);

create index if not exists drs_case_audit_events_case_id_occurred_at_idx
  on public.drs_case_audit_events(case_id, occurred_at);

create unique index if not exists drs_case_audit_events_one_root_per_case
  on public.drs_case_audit_events(case_id)
  where previous_event_id is null;

create index if not exists drs_case_audit_events_previous_event_id_idx
  on public.drs_case_audit_events(previous_event_id);

create unique index if not exists drs_case_audit_events_previous_event_unique
  on public.drs_case_audit_events(previous_event_id)
  where previous_event_id is not null;

create unique index if not exists drs_case_audit_events_line_transport_identity_unique
  on public.drs_case_audit_events(group_link_id, transport_message_id)
  where event_type = 'LINE_SENT_EVENT'
    and source_surface = 'LINE'
    and group_link_id is not null
    and transport_message_id is not null;

create index if not exists drs_case_audit_events_group_link_id_idx
  on public.drs_case_audit_events(group_link_id);

create index if not exists drs_review_work_items_case_id_state_idx
  on public.drs_review_work_items(case_id, state);

create index if not exists drs_review_work_item_transitions_work_item_id_idx
  on public.drs_review_work_item_transitions(work_item_id);

create index if not exists drs_review_work_item_transitions_case_id_idx
  on public.drs_review_work_item_transitions(case_id);

create index if not exists drs_review_work_item_transitions_audit_event_id_idx
  on public.drs_review_work_item_transitions(audit_event_id);

create or replace function drs_private.is_authorized_case_specialist_at(
  target_case_id uuid,
  target_specialist_id uuid,
  checked_at timestamptz
)
returns boolean
language sql
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.drs_case_specialist_assignments active_assignment
    join public.drs_specialists specialist
      on specialist.specialist_id = active_assignment.specialist_id
    where active_assignment.case_id = target_case_id
      and active_assignment.specialist_id = target_specialist_id
      and specialist.authority_state = 'ACTIVE'
      and active_assignment.valid_from <= checked_at
      and least(
        coalesce(active_assignment.valid_until, 'infinity'::timestamptz),
        coalesce((
          select min(termination.terminated_at)
          from public.drs_case_specialist_assignment_terminations termination
          where termination.assignment_id = active_assignment.assignment_id
        ), 'infinity'::timestamptz)
      ) > checked_at
  );
$$;

create or replace function drs_private.is_current_actor_active_case_specialist(target_case_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  target_specialist_id uuid;
begin
  target_specialist_id := (select auth.uid());

  if target_specialist_id is null then
    return false;
  end if;

  return drs_private.is_authorized_case_specialist_at(target_case_id, target_specialist_id, now());
end;
$$;

alter function drs_private.is_authorized_case_specialist_at(uuid, uuid, timestamptz) owner to postgres;
alter function drs_private.is_current_actor_active_case_specialist(uuid) owner to postgres;

revoke all on schema drs_private from public;
grant usage on schema drs_private to authenticated;
revoke execute on function drs_private.is_authorized_case_specialist_at(uuid, uuid, timestamptz) from public, anon, authenticated;
revoke execute on function drs_private.is_current_actor_active_case_specialist(uuid) from public, anon;
grant execute on function drs_private.is_current_actor_active_case_specialist(uuid) to authenticated;

create or replace function drs_private.jsonb_has_only_keys(target jsonb, allowed_keys text[])
returns boolean
language plpgsql
immutable
set search_path = public, pg_temp
as $$
declare
  entry record;
begin
  if target is null or jsonb_typeof(target) <> 'object' then
    return false;
  end if;

  for entry in select key from jsonb_each(target) loop
    if not entry.key = any(allowed_keys) then
      return false;
    end if;
  end loop;

  return true;
end;
$$;

revoke execute on function drs_private.jsonb_has_only_keys(jsonb, text[]) from public, anon, authenticated;

create or replace function drs_private.resolve_pgcrypto_schema()
returns name
language plpgsql
stable
security definer
set search_path = pg_catalog, pg_temp
as $$
declare
  pgcrypto_schema name;
begin
  select namespace.nspname::name
    into pgcrypto_schema
    from pg_catalog.pg_extension extension
    join pg_catalog.pg_namespace namespace
      on namespace.oid = extension.extnamespace
   where extension.extname = 'pgcrypto';

  if pgcrypto_schema is null then
    raise exception 'PGCRYPTO_EXTENSION_REQUIRED';
  end if;

  return pgcrypto_schema;
end;
$$;

alter function drs_private.resolve_pgcrypto_schema() owner to postgres;
revoke execute on function drs_private.resolve_pgcrypto_schema() from public, anon, authenticated;

create or replace function drs_private.sha256_utf8(input_text text)
returns text
language plpgsql
stable
strict
security definer
set search_path = pg_catalog, pg_temp
as $$
declare
  pgcrypto_schema name;
  digest_hex text;
begin
  pgcrypto_schema := drs_private.resolve_pgcrypto_schema();
  execute format('select encode(%I.digest(convert_to($1, ''UTF8''), ''sha256''), ''hex'')', pgcrypto_schema)
    into digest_hex
    using input_text;
  return digest_hex;
end;
$$;

alter function drs_private.sha256_utf8(text) owner to postgres;
revoke execute on function drs_private.sha256_utf8(text) from public, anon, authenticated;

create or replace function drs_private.parse_rfc3339_millis(input_text text)
returns timestamptz
language plpgsql
immutable
set search_path = pg_catalog, pg_temp
as $$
declare
  match_parts text[];
  normalized_local text;
  normalized_utc text;
  local_roundtrip text;
  parsed_timestamp timestamptz;
  offset_minutes integer := 0;
  local_time_millis bigint;
begin
  if input_text is null
    or coalesce(btrim(input_text), '') = ''
    or input_text <> btrim(input_text) then
    raise exception 'AUDIT_EVENT_OCCURRED_AT_INVALID';
  end if;

  if input_text !~ '^([0-9]{4})-([0-9]{2})-([0-9]{2})T([0-9]{2}):([0-9]{2}):([0-9]{2})(?:\.([0-9]{1,3}))?(Z|([+-])([0-9]{2}):([0-9]{2}))$' then
    raise exception 'AUDIT_EVENT_OCCURRED_AT_INVALID';
  end if;

  match_parts := regexp_match(
    input_text,
    '^([0-9]{4})-([0-9]{2})-([0-9]{2})T([0-9]{2}):([0-9]{2}):([0-9]{2})(?:\.([0-9]{1,3}))?(Z|([+-])([0-9]{2}):([0-9]{2}))$'
  );

  if match_parts[1] = '0000' then
    raise exception 'AUDIT_EVENT_OCCURRED_AT_INVALID';
  end if;

  if match_parts[2]::integer not between 1 and 12 then
    raise exception 'AUDIT_EVENT_OCCURRED_AT_INVALID';
  end if;

  if match_parts[3]::integer < 1
    or match_parts[3]::integer > extract(
      day from (
        make_date(match_parts[1]::integer, match_parts[2]::integer, 1)
        + interval '1 month - 1 day'
      )
    )::integer then
    raise exception 'AUDIT_EVENT_OCCURRED_AT_INVALID';
  end if;

  if match_parts[4]::integer > 23
    or match_parts[5]::integer > 59
    or match_parts[6]::integer > 59 then
    raise exception 'AUDIT_EVENT_OCCURRED_AT_INVALID';
  end if;

  if match_parts[8] <> 'Z' then
    if match_parts[10]::integer > 23
      or match_parts[11]::integer > 59 then
      raise exception 'AUDIT_EVENT_OCCURRED_AT_INVALID';
    end if;

    offset_minutes := (
      (match_parts[10]::integer * 60) + match_parts[11]::integer
    ) * case when match_parts[9] = '+' then 1 else -1 end;
  end if;

  if abs(offset_minutes) > 14 * 60 then
    raise exception 'AUDIT_EVENT_OCCURRED_AT_INVALID';
  end if;

  normalized_local := format(
    '%s-%s-%sT%s:%s:%s.%s',
    match_parts[1],
    match_parts[2],
    match_parts[3],
    match_parts[4],
    match_parts[5],
    match_parts[6],
    rpad(coalesce(match_parts[7], ''), 3, '0')
  );

  local_time_millis := (
    (
      (
        (match_parts[4]::bigint * 60)
        + match_parts[5]::bigint
      ) * 60
      + match_parts[6]::bigint
    ) * 1000
  ) + rpad(coalesce(match_parts[7], ''), 3, '0')::bigint;

  if match_parts[1] = '0001'
    and match_parts[2]::integer = 1
    and match_parts[3]::integer = 1
    and offset_minutes > 0
    and local_time_millis < (offset_minutes::bigint * 60 * 1000) then
    raise exception 'AUDIT_EVENT_OCCURRED_AT_INVALID';
  end if;

  if match_parts[1] = '9999'
    and match_parts[2]::integer = 12
    and match_parts[3]::integer = 31
    and offset_minutes < 0
    and local_time_millis > (86399999 + (offset_minutes::bigint * 60 * 1000)) then
    raise exception 'AUDIT_EVENT_OCCURRED_AT_INVALID';
  end if;

  begin
    parsed_timestamp := input_text::timestamptz;
  exception when others then
    raise exception 'AUDIT_EVENT_OCCURRED_AT_INVALID';
  end;

  parsed_timestamp := date_trunc('milliseconds', parsed_timestamp);
  local_roundtrip := to_char(
    (parsed_timestamp at time zone 'UTC') + make_interval(mins => offset_minutes),
    'YYYY-MM-DD"T"HH24:MI:SS.MS'
  );
  normalized_utc := to_char(parsed_timestamp at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"');

  if normalized_utc !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}\.[0-9]{3}Z$' then
    raise exception 'AUDIT_EVENT_OCCURRED_AT_INVALID';
  end if;

  if local_roundtrip <> normalized_local
    or normalized_utc <> to_char(parsed_timestamp at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') then
    raise exception 'AUDIT_EVENT_OCCURRED_AT_INVALID';
  end if;

  return parsed_timestamp;
end;
$$;

alter function drs_private.parse_rfc3339_millis(text) owner to postgres;
revoke execute on function drs_private.parse_rfc3339_millis(text) from public, anon, authenticated;

create or replace function drs_private.insert_drs_audit_event(
  input_event_id uuid,
  input_case_id uuid,
  input_previous_event_id uuid,
  input_event_type text,
  input_occurred_at timestamptz,
  input_actor_type text,
  input_actor_id text,
  input_source_surface text,
  input_group_link_id uuid,
  input_transport_message_id text,
  input_payload jsonb,
  input_recipient_read boolean,
  input_allow_ai_review boolean default false
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  existing_event public.drs_case_audit_events%rowtype;
  persisted_event_id uuid;
begin
  if input_event_type = 'AI_REVIEW'
    and input_allow_ai_review is not true then
    raise exception 'AI_REVIEW_REQUIRES_TRUSTED_APPEND_PATH';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(input_event_id::text, 0));

  select *
    into existing_event
    from public.drs_case_audit_events
    where event_id = input_event_id;

  if existing_event.event_id is not null then
    if existing_event.case_id is distinct from input_case_id
      or existing_event.previous_event_id is distinct from input_previous_event_id
      or existing_event.event_type is distinct from input_event_type
      or existing_event.occurred_at is distinct from input_occurred_at
      or existing_event.actor_type is distinct from input_actor_type
      or existing_event.actor_id is distinct from input_actor_id
      or existing_event.source_surface is distinct from input_source_surface
      or existing_event.group_link_id is distinct from input_group_link_id
      or existing_event.transport_message_id is distinct from input_transport_message_id
      or existing_event.payload is distinct from input_payload
      or existing_event.recipient_read is distinct from input_recipient_read then
      raise exception 'AUDIT_EVENT_IDENTITY_REUSE_CONFLICT';
    end if;

    return existing_event.event_id;
  end if;

  if input_event_type = 'LINE_SENT_EVENT' then
    if input_group_link_id is not null
      and coalesce(btrim(input_transport_message_id), '') <> '' then
      perform pg_advisory_xact_lock(hashtextextended('drs_line_transport:' || input_group_link_id::text || ':' || input_transport_message_id, 0));
    end if;

    select *
      into existing_event
      from public.drs_case_audit_events
      where event_type = 'LINE_SENT_EVENT'
        and source_surface = 'LINE'
        and group_link_id = input_group_link_id
        and transport_message_id = input_transport_message_id;

    if existing_event.event_id is not null then
      if existing_event.event_id is distinct from input_event_id
        or existing_event.case_id is distinct from input_case_id
        or existing_event.previous_event_id is distinct from input_previous_event_id
        or existing_event.occurred_at is distinct from input_occurred_at
        or existing_event.actor_type is distinct from input_actor_type
        or existing_event.actor_id is distinct from input_actor_id
        or existing_event.payload is distinct from input_payload
        or existing_event.recipient_read is distinct from input_recipient_read then
        raise exception 'LINE_TRANSPORT_IDENTITY_REUSE_CONFLICT';
      end if;

      return existing_event.event_id;
    end if;
  end if;

  begin
    insert into public.drs_case_audit_events (
      event_id,
      case_id,
      previous_event_id,
      event_type,
      occurred_at,
      actor_type,
      actor_id,
      source_surface,
      group_link_id,
      transport_message_id,
      payload,
      recipient_read
    ) values (
      input_event_id,
      input_case_id,
      input_previous_event_id,
      input_event_type,
      input_occurred_at,
      input_actor_type,
      input_actor_id,
      input_source_surface,
      input_group_link_id,
      input_transport_message_id,
      input_payload,
      input_recipient_read
    )
    returning event_id into persisted_event_id;
  exception when unique_violation then
    select *
      into existing_event
      from public.drs_case_audit_events
      where event_id = input_event_id;

    if existing_event.event_id is not null then
      if existing_event.case_id is not distinct from input_case_id
        and existing_event.previous_event_id is not distinct from input_previous_event_id
        and existing_event.event_type is not distinct from input_event_type
        and existing_event.occurred_at is not distinct from input_occurred_at
        and existing_event.actor_type is not distinct from input_actor_type
        and existing_event.actor_id is not distinct from input_actor_id
        and existing_event.source_surface is not distinct from input_source_surface
        and existing_event.group_link_id is not distinct from input_group_link_id
        and existing_event.transport_message_id is not distinct from input_transport_message_id
        and existing_event.payload is not distinct from input_payload
        and existing_event.recipient_read is not distinct from input_recipient_read then
        return existing_event.event_id;
      end if;

      raise exception 'AUDIT_EVENT_IDENTITY_REUSE_CONFLICT';
    end if;

    if input_event_type = 'LINE_SENT_EVENT' then
      select *
        into existing_event
        from public.drs_case_audit_events
        where event_type = 'LINE_SENT_EVENT'
          and source_surface = 'LINE'
          and group_link_id = input_group_link_id
          and transport_message_id = input_transport_message_id;

      if existing_event.event_id is not null then
        if existing_event.event_id is not distinct from input_event_id
          and existing_event.case_id is not distinct from input_case_id
          and existing_event.previous_event_id is not distinct from input_previous_event_id
          and existing_event.occurred_at is not distinct from input_occurred_at
          and existing_event.actor_type is not distinct from input_actor_type
          and existing_event.actor_id is not distinct from input_actor_id
          and existing_event.payload is not distinct from input_payload
          and existing_event.recipient_read is not distinct from input_recipient_read then
          return existing_event.event_id;
        end if;

        raise exception 'LINE_TRANSPORT_IDENTITY_REUSE_CONFLICT';
      end if;
    end if;

    if input_previous_event_id is null then
      raise exception 'AUDIT_CHAIN_ROOT_ALREADY_EXISTS';
    end if;

    if input_previous_event_id is not null then
      raise exception 'PREVIOUS_EVENT_ALREADY_HAS_SUCCESSOR';
    end if;

    raise exception 'AUDIT_EVENT_UNIQUE_CONFLICT';
  end;

  return persisted_event_id;
end;
$$;

alter function drs_private.insert_drs_audit_event(uuid, uuid, uuid, text, timestamptz, text, text, text, uuid, text, jsonb, boolean, boolean) owner to postgres;
revoke execute on function drs_private.insert_drs_audit_event(uuid, uuid, uuid, text, timestamptz, text, text, text, uuid, text, jsonb, boolean, boolean) from public, anon, authenticated;

create or replace function public.drs_append_audit_event(
  input_event_id uuid,
  input_case_id uuid,
  input_previous_event_id uuid,
  input_event_type text,
  input_occurred_at text,
  input_actor_type text,
  input_actor_id text,
  input_source_surface text,
  input_group_link_id uuid,
  input_transport_message_id text,
  input_payload jsonb,
  input_recipient_read boolean
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  parsed_occurred_at timestamptz;
begin
  parsed_occurred_at := drs_private.parse_rfc3339_millis(input_occurred_at);

  return drs_private.insert_drs_audit_event(
    input_event_id,
    input_case_id,
    input_previous_event_id,
    input_event_type,
    parsed_occurred_at,
    input_actor_type,
    input_actor_id,
    input_source_surface,
    input_group_link_id,
    input_transport_message_id,
    input_payload,
    input_recipient_read,
    false
  );
end;
$$;

alter function public.drs_append_audit_event(uuid, uuid, uuid, text, text, text, text, text, uuid, text, jsonb, boolean) owner to postgres;
revoke execute on function public.drs_append_audit_event(uuid, uuid, uuid, text, text, text, text, text, uuid, text, jsonb, boolean) from public, anon, authenticated;
grant execute on function public.drs_append_audit_event(uuid, uuid, uuid, text, text, text, text, text, uuid, text, jsonb, boolean) to service_role;

create or replace function public.drs_append_ai_review_event(
  input_event_id uuid,
  input_case_id uuid,
  input_previous_event_id uuid,
  input_occurred_at text,
  input_review_id uuid,
  input_review_status text,
  input_reviewed_event_id uuid,
  input_flags jsonb,
  input_findings jsonb,
  input_submitted_snapshot_body text
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  input_payload jsonb;
  parsed_occurred_at timestamptz;
begin
  if input_submitted_snapshot_body is null then
    raise exception 'AI_REVIEW_SUBMITTED_SNAPSHOT_BODY_REQUIRED';
  end if;

  parsed_occurred_at := drs_private.parse_rfc3339_millis(input_occurred_at);

  input_payload := jsonb_build_object(
    'review_id', input_review_id::text,
    'review_status', input_review_status,
    'submitted_snapshot_sha256', drs_private.sha256_utf8(input_submitted_snapshot_body),
    'reviewed_event_id', input_reviewed_event_id::text,
    'flags', coalesce(input_flags, '[]'::jsonb),
    'findings', coalesce(input_findings, '[]'::jsonb)
  );

  return drs_private.insert_drs_audit_event(
    input_event_id,
    input_case_id,
    input_previous_event_id,
    'AI_REVIEW',
    parsed_occurred_at,
    'ai_service',
    'drs-ai-review-service',
    'SYSTEM',
    null,
    null,
    input_payload,
    false,
    true
  );
end;
$$;

alter function public.drs_append_ai_review_event(uuid, uuid, uuid, text, uuid, text, uuid, jsonb, jsonb, text) owner to postgres;
revoke execute on function public.drs_append_ai_review_event(uuid, uuid, uuid, text, uuid, text, uuid, jsonb, jsonb, text) from public, anon, authenticated;
grant execute on function public.drs_append_ai_review_event(uuid, uuid, uuid, text, uuid, text, uuid, jsonb, jsonb, text) to service_role;

create or replace function drs_private.reject_drs_record_mutation()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  raise exception 'DRS_RECORD_IMMUTABLE';
end;
$$;

create or replace function drs_private.enforce_drs_line_group_link_insert()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  perform pg_advisory_xact_lock(hashtextextended(new.line_group_id, 0));

  if exists (
    select 1
    from public.drs_case_line_group_links existing_link
    left join public.drs_case_line_group_link_terminations existing_termination
      on existing_termination.group_link_id = existing_link.group_link_id
    where existing_link.group_link_id <> new.group_link_id
      and existing_link.line_group_id = new.line_group_id
      and tstzrange(
        existing_link.valid_from,
        least(
          coalesce(existing_link.valid_until, 'infinity'::timestamptz),
          coalesce(existing_termination.terminated_at, 'infinity'::timestamptz)
        ),
        '[)'
      ) && tstzrange(new.valid_from, coalesce(new.valid_until, 'infinity'::timestamptz), '[)')
  ) then
    raise exception 'LINE_GROUP_LINK_INTERVAL_OVERLAP';
  end if;

  return new;
end;
$$;

create or replace function drs_private.enforce_drs_line_group_link_termination_insert()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  linked_group public.drs_case_line_group_links%rowtype;
begin
  perform pg_advisory_xact_lock(hashtextextended(new.group_link_id::text, 0));

  select *
    into linked_group
    from public.drs_case_line_group_links
    where group_link_id = new.group_link_id
    for update;

  if linked_group.group_link_id is null then
    raise exception 'GROUP_LINK_NOT_FOUND';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(linked_group.group_link_id::text, 0));

  if linked_group.case_id <> new.case_id
    or linked_group.line_group_id <> new.line_group_id then
    raise exception 'GROUP_LINK_TERMINATION_IDENTITY_MISMATCH';
  end if;

  if new.terminated_at <= linked_group.valid_from
    or (
      linked_group.valid_until is not null
      and new.terminated_at > linked_group.valid_until
    ) then
    raise exception 'GROUP_LINK_TERMINATION_TIME_INVALID';
  end if;

  if exists (
    select 1
    from public.drs_case_audit_events accepted_event
    where accepted_event.event_type = 'LINE_SENT_EVENT'
      and accepted_event.case_id = linked_group.case_id
      and accepted_event.group_link_id = linked_group.group_link_id
      and accepted_event.occurred_at >= new.terminated_at
  ) then
    raise exception 'GROUP_LINK_TERMINATION_AFTER_DEPENDENT_EVENT_REQUIRED';
  end if;

  return new;
end;
$$;

create or replace function drs_private.enforce_drs_specialist_assignment_insert()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  perform pg_advisory_xact_lock(hashtextextended(new.case_id::text, 0));

  if exists (
    select 1
    from public.drs_case_specialist_assignments existing_assignment
    left join public.drs_case_specialist_assignment_terminations existing_termination
      on existing_termination.assignment_id = existing_assignment.assignment_id
    where existing_assignment.assignment_id <> new.assignment_id
      and existing_assignment.case_id = new.case_id
      and tstzrange(
        existing_assignment.valid_from,
        least(
          coalesce(existing_assignment.valid_until, 'infinity'::timestamptz),
          coalesce(existing_termination.terminated_at, 'infinity'::timestamptz)
        ),
        '[)'
      ) && tstzrange(new.valid_from, coalesce(new.valid_until, 'infinity'::timestamptz), '[)')
  ) then
    raise exception 'SPECIALIST_ASSIGNMENT_INTERVAL_OVERLAP';
  end if;

  return new;
end;
$$;

create or replace function drs_private.enforce_drs_specialist_assignment_termination_insert()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  assignment public.drs_case_specialist_assignments%rowtype;
begin
  perform pg_advisory_xact_lock(hashtextextended(new.assignment_id::text, 0));

  select *
    into assignment
    from public.drs_case_specialist_assignments
    where assignment_id = new.assignment_id
    for update;

  if assignment.assignment_id is null then
    raise exception 'SPECIALIST_ASSIGNMENT_NOT_FOUND';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(assignment.assignment_id::text, 0));

  if assignment.case_id <> new.case_id
    or assignment.specialist_id <> new.specialist_id then
    raise exception 'SPECIALIST_ASSIGNMENT_TERMINATION_IDENTITY_MISMATCH';
  end if;

  if new.terminated_at <= assignment.valid_from
    or (
      assignment.valid_until is not null
      and new.terminated_at > assignment.valid_until
    ) then
    raise exception 'SPECIALIST_ASSIGNMENT_TERMINATION_TIME_INVALID';
  end if;

  if exists (
    select 1
    from public.drs_case_audit_events accepted_event
    where accepted_event.case_id = assignment.case_id
      and accepted_event.event_type in ('HUMAN_DECISION', 'FINAL_MESSAGE', 'WORK_ITEM_TRANSITION')
      and accepted_event.actor_type = 'drs_specialist'
      and accepted_event.actor_id = assignment.specialist_id::text
      and accepted_event.occurred_at >= new.terminated_at
  ) then
    raise exception 'ASSIGNMENT_TERMINATION_AFTER_DEPENDENT_EVENT_REQUIRED';
  end if;

  return new;
end;
$$;

create or replace function drs_private.enforce_drs_audit_event_insert()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  previous_event public.drs_case_audit_events%rowtype;
  decision_event public.drs_case_audit_events%rowtype;
  reviewed_source public.drs_case_audit_events%rowtype;
  ai_review_event public.drs_case_audit_events%rowtype;
  receipt_final public.drs_case_audit_events%rowtype;
  audit_work_item public.drs_review_work_items%rowtype;
  linked_group public.drs_case_line_group_links%rowtype;
  linked_group_effective_until timestamptz;
  receipt_accepted_at timestamptz;
  receipt_ingested_at timestamptz;
  active_assignment_id uuid;
begin
  if new.occurred_at = 'infinity'::timestamptz
    or new.occurred_at = '-infinity'::timestamptz then
    raise exception 'AUDIT_EVENT_OCCURRED_AT_INVALID';
  end if;

  if new.previous_event_id is not null then
    select *
      into previous_event
      from public.drs_case_audit_events
      where event_id = new.previous_event_id;

    if previous_event.event_id is null then
      raise exception 'PREVIOUS_EVENT_NOT_FOUND';
    end if;

    if previous_event.case_id <> new.case_id then
      raise exception 'PREVIOUS_EVENT_CASE_MISMATCH';
    end if;

    if previous_event.occurred_at > new.occurred_at then
      raise exception 'PREVIOUS_EVENT_CHRONOLOGY_INVALID';
    end if;
  elsif exists (
    select 1
    from public.drs_case_audit_events existing_root
    where existing_root.case_id = new.case_id
      and existing_root.previous_event_id is null
  ) then
    raise exception 'AUDIT_CHAIN_ROOT_ALREADY_EXISTS';
  end if;

  if new.event_type = 'LINE_SENT_EVENT' then
    if not drs_private.jsonb_has_only_keys(new.payload, array['message_state', 'message_kind', 'sent_text', 'attachment_refs'])
      or jsonb_typeof(new.payload->'message_state') is distinct from 'string'
      or jsonb_typeof(new.payload->'message_kind') is distinct from 'string'
      or jsonb_typeof(new.payload->'sent_text') is distinct from 'string'
      or jsonb_typeof(new.payload->'attachment_refs') is distinct from 'array' then
      raise exception 'LINE_SENT_PAYLOAD_SCHEMA_INVALID';
    end if;

    if new.payload->>'message_state' is distinct from 'SENT' then
      raise exception 'ONLY_SENT_LINE_EVENTS_CAN_BE_INGESTED';
    end if;

    if new.payload->>'message_kind' not in ('TEXT', 'ATTACHMENT', 'TEXT_AND_ATTACHMENT') then
      raise exception 'LINE_MESSAGE_KIND_INVALID';
    end if;

    if exists (
      select 1
      from jsonb_array_elements(new.payload->'attachment_refs') attachment_ref(value)
      where jsonb_typeof(attachment_ref.value) is distinct from 'object'
        or not drs_private.jsonb_has_only_keys(attachment_ref.value, array['attachment_id', 'attachment_kind', 'sha256'])
        or jsonb_typeof(attachment_ref.value->'attachment_id') is distinct from 'string'
        or coalesce(btrim(attachment_ref.value->>'attachment_id'), '') = ''
        or jsonb_typeof(attachment_ref.value->'attachment_kind') is distinct from 'string'
        or attachment_ref.value->>'attachment_kind' not in ('IMAGE', 'DOCUMENT', 'DRAWING', 'OTHER')
        or (
          attachment_ref.value ? 'sha256'
          and (
            jsonb_typeof(attachment_ref.value->'sha256') is distinct from 'string'
            or attachment_ref.value->>'sha256' !~* '^[0-9a-f]{64}$'
          )
        )
    ) then
      raise exception 'LINE_ATTACHMENT_REFS_INVALID';
    end if;

    if coalesce(btrim(new.transport_message_id), '') = '' then
      raise exception 'LINE_SENT_TRANSPORT_ID_REQUIRED';
    end if;

    if new.group_link_id is null then
      raise exception 'LINE_GROUP_NOT_FORMALLY_LINKED';
    end if;

    perform pg_advisory_xact_lock(hashtextextended(new.group_link_id::text, 0));

    select *
      into linked_group
      from public.drs_case_line_group_links
      where group_link_id = new.group_link_id
      for update;

    select least(
        coalesce(drs_case_line_group_links.valid_until, 'infinity'::timestamptz),
        coalesce(linked_group_termination.terminated_at, 'infinity'::timestamptz)
      )
      into linked_group_effective_until
      from public.drs_case_line_group_links
      left join public.drs_case_line_group_link_terminations linked_group_termination
        on linked_group_termination.group_link_id = drs_case_line_group_links.group_link_id
      where drs_case_line_group_links.group_link_id = new.group_link_id;

    if linked_group.group_link_id is null then
      raise exception 'LINE_GROUP_NOT_FORMALLY_LINKED';
    end if;

    perform pg_advisory_xact_lock(hashtextextended(linked_group.group_link_id::text, 0));

    if linked_group.case_id <> new.case_id then
      raise exception 'LINE_GROUP_CASE_MISMATCH';
    end if;

    if new.occurred_at < linked_group.valid_from
      or linked_group_effective_until <= new.occurred_at then
      raise exception 'LINE_GROUP_LINK_NOT_ACTIVE';
    end if;
  end if;

  if new.event_type = 'AI_REVIEW' then
    if coalesce(btrim(new.actor_type), '') <> 'ai_service'
      or coalesce(btrim(new.actor_id), '') = '' then
      raise exception 'AI_REVIEW_ACTOR_INVALID';
    end if;

    if coalesce(btrim(new.source_surface), '') <> 'SYSTEM' then
      raise exception 'AI_REVIEW_SOURCE_INVALID';
    end if;

    if not drs_private.jsonb_has_only_keys(
        new.payload,
        array['review_id', 'review_status', 'submitted_snapshot_sha256', 'reviewed_event_id', 'flags', 'findings']
      )
      or jsonb_typeof(new.payload->'review_id') is distinct from 'string'
      or jsonb_typeof(new.payload->'review_status') is distinct from 'string'
      or jsonb_typeof(new.payload->'submitted_snapshot_sha256') is distinct from 'string'
      or jsonb_typeof(new.payload->'reviewed_event_id') is distinct from 'string'
      or jsonb_typeof(new.payload->'flags') is distinct from 'array'
      or jsonb_typeof(new.payload->'findings') is distinct from 'array'
      or new.payload->>'review_id' !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
      or new.payload->>'reviewed_event_id' !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
      or new.payload->>'submitted_snapshot_sha256' !~* '^[0-9a-f]{64}$'
      or new.payload->>'review_status' not in (
        'REVIEW_COMPLETED_NO_FLAG',
        'REVIEW_COMPLETED_ATTENTION',
        'REVIEW_SERVICE_UNAVAILABLE'
      ) then
      raise exception 'AI_REVIEW_PAYLOAD_SCHEMA_INVALID';
    end if;

    select *
      into reviewed_source
      from public.drs_case_audit_events
      where event_id = (new.payload->>'reviewed_event_id')::uuid;

    if reviewed_source.event_id is null then
      raise exception 'AI_REVIEW_TARGET_NOT_FOUND';
    end if;

    if reviewed_source.case_id <> new.case_id then
      raise exception 'AI_REVIEW_TARGET_CASE_MISMATCH';
    end if;

    if reviewed_source.event_type not in ('LINE_SENT_EVENT', 'WORK_ITEM_TRANSITION') then
      raise exception 'AI_REVIEW_TARGET_EVENT_TYPE_INVALID';
    end if;

    if exists (
      select 1
      from jsonb_array_elements(new.payload->'flags') review_flag(value)
      where jsonb_typeof(review_flag.value) is distinct from 'object'
        or not drs_private.jsonb_has_only_keys(review_flag.value, array['code', 'severity'])
        or jsonb_typeof(review_flag.value->'code') is distinct from 'string'
        or coalesce(btrim(review_flag.value->>'code'), '') = ''
        or jsonb_typeof(review_flag.value->'severity') is distinct from 'string'
        or coalesce(btrim(review_flag.value->>'severity'), '') = ''
    ) then
      raise exception 'AI_REVIEW_PAYLOAD_SCHEMA_INVALID';
    end if;

    if exists (
      select 1
      from jsonb_array_elements(new.payload->'findings') review_finding(value)
      where jsonb_typeof(review_finding.value) is distinct from 'object'
        or not drs_private.jsonb_has_only_keys(review_finding.value, array['finding_id', 'severity', 'summary'])
        or jsonb_typeof(review_finding.value->'finding_id') is distinct from 'string'
        or coalesce(btrim(review_finding.value->>'finding_id'), '') = ''
        or jsonb_typeof(review_finding.value->'severity') is distinct from 'string'
        or coalesce(btrim(review_finding.value->>'severity'), '') = ''
        or jsonb_typeof(review_finding.value->'summary') is distinct from 'string'
        or coalesce(btrim(review_finding.value->>'summary'), '') = ''
    ) then
      raise exception 'AI_REVIEW_PAYLOAD_SCHEMA_INVALID';
    end if;
  end if;

  if new.event_type = 'HUMAN_DECISION' then
    if new.source_surface <> 'DRS_WORKSPACE' then
      raise exception 'HUMAN_DECISION_SOURCE_INVALID';
    end if;

    if new.actor_type <> 'drs_specialist' then
      raise exception 'HUMAN_DECISION_ACTOR_MUST_BE_ASSIGNED_SPECIALIST';
    end if;

    if exists (
      select 1
      from public.drs_specialists specialist
      where specialist.specialist_id = new.actor_id::uuid
        and specialist.authority_state <> 'ACTIVE'
    ) then
      raise exception 'SPECIALIST_AUTHORITY_NOT_ACTIVE';
    end if;

    if not drs_private.jsonb_has_only_keys(
      new.payload,
      array['decision', 'reason', 'urgency', 'incident_id', 'ai_review_event_id', 'final_snapshot_id', 'result_difference', 'break_glass_result']
    )
      or jsonb_typeof(new.payload->'decision') is distinct from 'string'
      or jsonb_typeof(new.payload->'reason') is distinct from 'string'
      or jsonb_typeof(new.payload->'urgency') is distinct from 'string'
      or jsonb_typeof(new.payload->'final_snapshot_id') is distinct from 'string'
      or new.payload->>'final_snapshot_id' !~* '^[0-9a-f]{64}$'
      or not (new.payload ? 'incident_id')
      or jsonb_typeof(new.payload->'incident_id') not in ('string', 'null')
      or (
        new.payload ? 'ai_review_event_id'
        and jsonb_typeof(new.payload->'ai_review_event_id') not in ('string', 'null')
      )
      or (
        jsonb_typeof(new.payload->'ai_review_event_id') = 'string'
        and new.payload->>'ai_review_event_id' !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
      ) then
      raise exception 'HUMAN_DECISION_PAYLOAD_SCHEMA_INVALID';
    end if;

    if coalesce(new.payload->>'final_snapshot_id', '') = '' then
      raise exception 'HUMAN_DECISION_FINAL_SNAPSHOT_REQUIRED';
    end if;

    if coalesce(new.payload->>'decision', '') not in (
      'EDIT_AND_SEND',
      'OVERRIDE_AND_SEND',
      'MANUAL_EXCEPTION_SEND',
      'PRE_SEND_REVIEW_NOT_PERFORMED_BREAK_GLASS'
    ) then
      raise exception 'HUMAN_DECISION_INVALID';
    end if;

    if coalesce(new.payload->>'decision', '') in ('EDIT_AND_SEND', 'OVERRIDE_AND_SEND', 'MANUAL_EXCEPTION_SEND', 'PRE_SEND_REVIEW_NOT_PERFORMED_BREAK_GLASS')
      and coalesce(btrim(new.payload->>'reason'), '') = '' then
      raise exception 'HUMAN_DECISION_REASON_REQUIRED';
    end if;

    if coalesce(new.payload->>'decision', '') in ('MANUAL_EXCEPTION_SEND', 'PRE_SEND_REVIEW_NOT_PERFORMED_BREAK_GLASS')
      and coalesce(btrim(new.payload->>'urgency'), '') = '' then
      raise exception 'MANUAL_EXCEPTION_URGENCY_REQUIRED';
    end if;

    if coalesce(new.payload->>'decision', '') in ('MANUAL_EXCEPTION_SEND', 'PRE_SEND_REVIEW_NOT_PERFORMED_BREAK_GLASS')
      and coalesce(btrim(new.payload->>'incident_id'), '') = '' then
      raise exception 'MANUAL_EXCEPTION_INCIDENT_REQUIRED';
    end if;

    if coalesce(new.payload->>'decision', '') = 'PRE_SEND_REVIEW_NOT_PERFORMED_BREAK_GLASS' then
      if jsonb_typeof(new.payload->'ai_review_event_id') = 'string' then
        raise exception 'BREAK_GLASS_AI_REVIEW_FORBIDDEN';
      end if;

      if new.payload ? 'result_difference' then
        raise exception 'BREAK_GLASS_RESULT_SCHEMA_INVALID';
      end if;

      if not (
        jsonb_typeof(new.payload->'break_glass_result') is not distinct from 'object'
        and drs_private.jsonb_has_only_keys(new.payload->'break_glass_result', array['ai_review_performed', 'final_snapshot_sha256'])
        and new.payload->'break_glass_result'->'ai_review_performed' is not distinct from 'false'::jsonb
        and jsonb_typeof(new.payload->'break_glass_result'->'final_snapshot_sha256') is not distinct from 'string'
        and new.payload->'break_glass_result'->>'final_snapshot_sha256' ~* '^[0-9a-f]{64}$'
      ) then
        raise exception 'BREAK_GLASS_RESULT_REQUIRED';
      end if;

      if new.payload->'break_glass_result'->>'final_snapshot_sha256' is distinct from new.payload->>'final_snapshot_id' then
        raise exception 'BREAK_GLASS_RESULT_FINAL_SNAPSHOT_MISMATCH';
      end if;
    else
      if new.payload ? 'break_glass_result' then
        raise exception 'HUMAN_DECISION_RESULT_DIFFERENCE_REQUIRED';
      end if;

      if not (new.payload ? 'result_difference') then
        raise exception 'HUMAN_DECISION_RESULT_DIFFERENCE_REQUIRED';
      end if;

      if not (
        jsonb_typeof(new.payload->'result_difference') is not distinct from 'object'
        and drs_private.jsonb_has_only_keys(new.payload->'result_difference', array['submitted_snapshot_sha256', 'final_snapshot_sha256', 'content_changed'])
        and jsonb_typeof(new.payload->'result_difference'->'submitted_snapshot_sha256') is not distinct from 'string'
        and new.payload->'result_difference'->>'submitted_snapshot_sha256' ~* '^[0-9a-f]{64}$'
        and jsonb_typeof(new.payload->'result_difference'->'final_snapshot_sha256') is not distinct from 'string'
        and new.payload->'result_difference'->>'final_snapshot_sha256' ~* '^[0-9a-f]{64}$'
        and jsonb_typeof(new.payload->'result_difference'->'content_changed') is not distinct from 'boolean'
      ) then
        raise exception 'HUMAN_DECISION_RESULT_DIFFERENCE_SCHEMA_INVALID';
      end if;

      if new.payload->'result_difference'->>'final_snapshot_sha256' is distinct from new.payload->>'final_snapshot_id' then
        raise exception 'HUMAN_DECISION_RESULT_DIFFERENCE_FINAL_SNAPSHOT_MISMATCH';
      end if;

      if (new.payload->'result_difference'->>'content_changed')::boolean is distinct from (
        new.payload->'result_difference'->>'submitted_snapshot_sha256' is distinct from new.payload->'result_difference'->>'final_snapshot_sha256'
      ) then
        raise exception 'HUMAN_DECISION_RESULT_DIFFERENCE_CHANGED_FLAG_MISMATCH';
      end if;

      if coalesce(new.payload->>'decision', '') = 'EDIT_AND_SEND'
        and (new.payload->'result_difference'->>'content_changed')::boolean is not true then
        raise exception 'EDIT_AND_SEND_REQUIRES_CONTENT_CHANGE';
      end if;
    end if;

    if coalesce(new.payload->>'decision', '') <> 'PRE_SEND_REVIEW_NOT_PERFORMED_BREAK_GLASS'
      and (
        jsonb_typeof(new.payload->'ai_review_event_id') is distinct from 'string'
        or coalesce(new.payload->>'ai_review_event_id', '') = ''
      ) then
      raise exception 'HUMAN_DECISION_REQUIRES_AI_REVIEW';
    end if;

    if jsonb_typeof(new.payload->'ai_review_event_id') = 'string' then
      select *
        into ai_review_event
        from public.drs_case_audit_events
        where event_id = (new.payload->>'ai_review_event_id')::uuid;

      if ai_review_event.event_id is null
        or ai_review_event.event_type <> 'AI_REVIEW' then
        raise exception 'HUMAN_DECISION_REQUIRES_AI_REVIEW';
      end if;

      if ai_review_event.case_id <> new.case_id then
        raise exception 'HUMAN_DECISION_AI_REVIEW_CASE_MISMATCH';
      end if;

      if coalesce(new.payload->>'decision', '') <> 'PRE_SEND_REVIEW_NOT_PERFORMED_BREAK_GLASS'
        and new.payload->'result_difference'->>'submitted_snapshot_sha256' is distinct from ai_review_event.payload->>'submitted_snapshot_sha256' then
        raise exception 'HUMAN_DECISION_RESULT_DIFFERENCE_AI_SNAPSHOT_MISMATCH';
      end if;

      if coalesce(new.payload->>'decision', '') in ('EDIT_AND_SEND', 'OVERRIDE_AND_SEND')
        and ai_review_event.payload->>'review_status' = 'REVIEW_SERVICE_UNAVAILABLE' then
        raise exception 'HUMAN_DECISION_AI_REVIEW_STATUS_INVALID';
      end if;

      if coalesce(new.payload->>'decision', '') = 'MANUAL_EXCEPTION_SEND'
        and ai_review_event.payload->>'review_status' <> 'REVIEW_SERVICE_UNAVAILABLE' then
        raise exception 'HUMAN_DECISION_AI_REVIEW_STATUS_INVALID';
      end if;
    end if;

    select active_assignment.assignment_id
      into active_assignment_id
      from public.drs_case_specialist_assignments active_assignment
      where active_assignment.case_id = new.case_id
        and active_assignment.specialist_id = new.actor_id::uuid
        and active_assignment.valid_from <= new.occurred_at
      order by active_assignment.valid_from desc
      limit 1;

    if active_assignment_id is not null then
      perform pg_advisory_xact_lock(hashtextextended(active_assignment_id::text, 0));
    end if;

    if not drs_private.is_authorized_case_specialist_at(new.case_id, new.actor_id::uuid, new.occurred_at) then
      raise exception 'SPECIALIST_ASSIGNMENT_NOT_ACTIVE';
    end if;
  end if;

  if new.event_type = 'FINAL_MESSAGE' then
    if not drs_private.jsonb_has_only_keys(
      new.payload,
      array['decision_event_id', 'final_snapshot_id', 'final_text', 'transport_status']
    )
      or jsonb_typeof(new.payload->'decision_event_id') is distinct from 'string'
      or jsonb_typeof(new.payload->'final_snapshot_id') is distinct from 'string'
      or new.payload->>'final_snapshot_id' !~* '^[0-9a-f]{64}$'
      or jsonb_typeof(new.payload->'final_text') is distinct from 'string'
      or coalesce(btrim(new.payload->>'final_text'), '') = ''
      or jsonb_typeof(new.payload->'transport_status') is distinct from 'string' then
      raise exception 'FINAL_MESSAGE_PAYLOAD_SCHEMA_INVALID';
    end if;

    if new.payload->>'final_snapshot_id' is distinct from drs_private.sha256_utf8(new.payload->>'final_text') then
      raise exception 'FINAL_MESSAGE_BODY_HASH_MISMATCH';
    end if;

    select *
      into decision_event
      from public.drs_case_audit_events
      where event_id = (new.payload->>'decision_event_id')::uuid;

    if decision_event.event_id is null
      or decision_event.case_id <> new.case_id
      or decision_event.event_type <> 'HUMAN_DECISION' then
      raise exception 'FINAL_MESSAGE_REQUIRES_HUMAN_DECISION';
    end if;

    if decision_event.actor_type <> 'drs_specialist' then
      raise exception 'FINAL_MESSAGE_REQUIRES_SPECIALIST_DECISION';
    end if;

    if coalesce(decision_event.payload->>'decision', '') not in (
      'EDIT_AND_SEND',
      'OVERRIDE_AND_SEND',
      'MANUAL_EXCEPTION_SEND',
      'PRE_SEND_REVIEW_NOT_PERFORMED_BREAK_GLASS'
    ) then
      raise exception 'FINAL_MESSAGE_REQUIRES_VALID_HUMAN_DECISION';
    end if;

    if coalesce(decision_event.payload->>'final_snapshot_id', '') = '' then
      raise exception 'FINAL_MESSAGE_DECISION_SNAPSHOT_REQUIRED';
    end if;

    if decision_event.payload->>'final_snapshot_id' is distinct from new.payload->>'final_snapshot_id' then
      raise exception 'FINAL_MESSAGE_SNAPSHOT_MISMATCH';
    end if;

    if coalesce(decision_event.payload->>'decision', '') = 'PRE_SEND_REVIEW_NOT_PERFORMED_BREAK_GLASS'
      and decision_event.payload->'break_glass_result'->>'final_snapshot_sha256' is distinct from new.payload->>'final_snapshot_id' then
      raise exception 'FINAL_MESSAGE_SNAPSHOT_MISMATCH';
    end if;

    if coalesce(decision_event.payload->>'decision', '') <> 'PRE_SEND_REVIEW_NOT_PERFORMED_BREAK_GLASS'
      and decision_event.payload->'result_difference'->>'final_snapshot_sha256' is distinct from new.payload->>'final_snapshot_id' then
      raise exception 'FINAL_MESSAGE_SNAPSHOT_MISMATCH';
    end if;

    if decision_event.occurred_at > new.occurred_at then
      raise exception 'FINAL_MESSAGE_DECISION_CHRONOLOGY_INVALID';
    end if;

    if not drs_private.is_authorized_case_specialist_at(
      new.case_id,
      decision_event.actor_id::uuid,
      decision_event.occurred_at
    ) then
      raise exception 'FINAL_MESSAGE_DECISION_SPECIALIST_NOT_ACTIVE';
    end if;

    if new.actor_type <> 'drs_specialist' then
      raise exception 'FINAL_MESSAGE_SENDER_MUST_BE_ASSIGNED_SPECIALIST';
    end if;

    if decision_event.actor_id <> new.actor_id then
      raise exception 'FINAL_MESSAGE_DECISION_SPECIALIST_MISMATCH';
    end if;

    select active_assignment.assignment_id
      into active_assignment_id
      from public.drs_case_specialist_assignments active_assignment
      where active_assignment.case_id = new.case_id
        and active_assignment.specialist_id = new.actor_id::uuid
        and active_assignment.valid_from <= new.occurred_at
      order by active_assignment.valid_from desc
      limit 1;

    if active_assignment_id is not null then
      perform pg_advisory_xact_lock(hashtextextended(active_assignment_id::text, 0));
    end if;

    if not drs_private.is_authorized_case_specialist_at(new.case_id, new.actor_id::uuid, new.occurred_at) then
      raise exception 'FINAL_MESSAGE_SENDER_MUST_BE_ASSIGNED_SPECIALIST';
    end if;
  end if;

  if new.event_type = 'RECEIPT' then
    if not drs_private.jsonb_has_only_keys(
        new.payload,
        array['final_message_event_id', 'receipt_kind', 'recipient_read', 'transport_message_id', 'accepted_at', 'ingested_at']
      )
      or jsonb_typeof(new.payload->'final_message_event_id') is distinct from 'string'
      or jsonb_typeof(new.payload->'receipt_kind') is distinct from 'string'
      or jsonb_typeof(new.payload->'recipient_read') is distinct from 'boolean'
      or jsonb_typeof(new.payload->'transport_message_id') is distinct from 'string'
      or coalesce(btrim(new.payload->>'transport_message_id'), '') = ''
      or jsonb_typeof(new.payload->'accepted_at') is distinct from 'string'
      or jsonb_typeof(new.payload->'ingested_at') is distinct from 'string' then
      raise exception 'RECEIPT_PAYLOAD_SCHEMA_INVALID';
    end if;

    if new.payload->>'receipt_kind' <> 'TRANSPORT_ACCEPTED' then
      raise exception 'RECEIPT_KIND_INVALID';
    end if;

    if new.recipient_read is distinct from false
      or new.payload->'recipient_read' is distinct from to_jsonb(new.recipient_read) then
      raise exception 'TRANSPORT_ACCEPTED_IS_NOT_RECIPIENT_READ';
    end if;

    receipt_accepted_at := drs_private.parse_rfc3339_millis(new.payload->>'accepted_at');
    receipt_ingested_at := drs_private.parse_rfc3339_millis(new.payload->>'ingested_at');

    if receipt_accepted_at > receipt_ingested_at
      or receipt_ingested_at > new.occurred_at then
      raise exception 'RECEIPT_TRANSPORT_TIME_INVALID';
    end if;

    select *
      into receipt_final
      from public.drs_case_audit_events
      where event_id = (new.payload->>'final_message_event_id')::uuid;

    if receipt_final.event_id is null
      or receipt_final.event_type <> 'FINAL_MESSAGE' then
      raise exception 'RECEIPT_FINAL_MESSAGE_REQUIRED';
    end if;

    if receipt_final.case_id <> new.case_id then
      raise exception 'RECEIPT_FINAL_MESSAGE_CASE_MISMATCH';
    end if;
  end if;

  if new.event_type = 'WORK_ITEM_TRANSITION' then
    if not drs_private.jsonb_has_only_keys(new.payload, array['work_item_id', 'action', 'subject_ref'])
      or jsonb_typeof(new.payload->'work_item_id') is distinct from 'string'
      or jsonb_typeof(new.payload->'action') is distinct from 'string'
      or jsonb_typeof(new.payload->'subject_ref') is distinct from 'object'
      or new.payload->>'work_item_id' !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
      or coalesce(btrim(new.payload->>'work_item_id'), '') = ''
      or coalesce(btrim(new.payload->>'action'), '') = ''
      or not (
        (
          drs_private.jsonb_has_only_keys(new.payload->'subject_ref', array['document_id', 'version'])
          and jsonb_typeof(new.payload->'subject_ref'->'document_id') is not distinct from 'string'
          and new.payload->'subject_ref'->>'document_id' ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
          and coalesce(btrim(new.payload->'subject_ref'->>'document_id'), '') <> ''
          and jsonb_typeof(new.payload->'subject_ref'->'version') is not distinct from 'string'
          and coalesce(btrim(new.payload->'subject_ref'->>'version'), '') <> ''
        )
        or (
          drs_private.jsonb_has_only_keys(new.payload->'subject_ref', array['drawing_id', 'version'])
          and jsonb_typeof(new.payload->'subject_ref'->'drawing_id') is not distinct from 'string'
          and new.payload->'subject_ref'->>'drawing_id' ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
          and coalesce(btrim(new.payload->'subject_ref'->>'drawing_id'), '') <> ''
          and jsonb_typeof(new.payload->'subject_ref'->'version') is not distinct from 'string'
          and coalesce(btrim(new.payload->'subject_ref'->>'version'), '') <> ''
        )
    ) then
      raise exception 'WORK_ITEM_TRANSITION_PAYLOAD_SCHEMA_INVALID';
    end if;

    select *
      into audit_work_item
      from public.drs_review_work_items
      where work_item_id = (new.payload->>'work_item_id')::uuid;

    if audit_work_item.work_item_id is null then
      raise exception 'WORK_ITEM_NOT_FOUND';
    end if;

    if audit_work_item.case_id <> new.case_id then
      raise exception 'WORK_ITEM_TRANSITION_CASE_MISMATCH';
    end if;

    if audit_work_item.subject_ref is distinct from new.payload->'subject_ref' then
      raise exception 'WORK_ITEM_TRANSITION_AUDIT_SUBJECT_MISMATCH';
    end if;

    if new.actor_type = 'drs_specialist' then
      select active_assignment.assignment_id
        into active_assignment_id
        from public.drs_case_specialist_assignments active_assignment
        where active_assignment.case_id = new.case_id
          and active_assignment.specialist_id = new.actor_id::uuid
          and active_assignment.valid_from <= new.occurred_at
        order by active_assignment.valid_from desc
        limit 1;

      if active_assignment_id is not null then
        perform pg_advisory_xact_lock(hashtextextended(active_assignment_id::text, 0));
      end if;

      if not drs_private.is_authorized_case_specialist_at(new.case_id, new.actor_id::uuid, new.occurred_at) then
        raise exception 'WORK_ITEM_TRANSITION_SPECIALIST_NOT_ACTIVE';
      end if;
    end if;
  end if;

  return new;
end;
$$;

create or replace function drs_private.enforce_drs_work_item_update()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if not exists (
    select 1
    from public.drs_review_work_item_transitions guarded_transition
    where guarded_transition.work_item_id = new.work_item_id
      and guarded_transition.case_id = new.case_id
      and guarded_transition.from_state = old.state
      and guarded_transition.to_state = new.state
      and guarded_transition.next_actor = new.next_actor
      and guarded_transition.occurred_at = new.updated_at
  ) then
    raise exception 'WORK_ITEM_STATE_REQUIRES_TRANSITION_RECORD';
  end if;
  return new;
end;
$$;

create or replace function drs_private.enforce_drs_work_item_transition_insert()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  work_item public.drs_review_work_items%rowtype;
  audit_event public.drs_case_audit_events%rowtype;
  case_record public.drs_cases%rowtype;
  active_assignment_id uuid;
  expected_to_state text;
  expected_next_actor text;
begin
  select *
    into work_item
    from public.drs_review_work_items
    where work_item_id = new.work_item_id
    for update;

  if work_item.work_item_id is null then
    raise exception 'WORK_ITEM_NOT_FOUND';
  end if;

  if work_item.case_id <> new.case_id then
    raise exception 'WORK_ITEM_TRANSITION_CASE_MISMATCH';
  end if;

  if new.occurred_at = 'infinity'::timestamptz
    or new.occurred_at = '-infinity'::timestamptz then
    raise exception 'WORK_ITEM_TRANSITION_OCCURRED_AT_INVALID';
  end if;

  select *
    into case_record
    from public.drs_cases
    where case_id = new.case_id;

  select *
    into audit_event
    from public.drs_case_audit_events
    where event_id = new.audit_event_id;

  if audit_event.event_id is null then
    raise exception 'WORK_ITEM_TRANSITION_AUDIT_EVENT_REQUIRED';
  end if;

  if audit_event.case_id <> new.case_id then
    raise exception 'WORK_ITEM_TRANSITION_AUDIT_EVENT_CASE_MISMATCH';
  end if;

  if audit_event.event_type <> 'WORK_ITEM_TRANSITION' then
    raise exception 'WORK_ITEM_TRANSITION_AUDIT_EVENT_TYPE_INVALID';
  end if;

  if audit_event.actor_type <> new.actor_type
    or audit_event.actor_id <> new.actor_id then
    raise exception 'WORK_ITEM_TRANSITION_AUDIT_ACTOR_MISMATCH';
  end if;

  if audit_event.payload->>'work_item_id' is distinct from new.work_item_id::text then
    raise exception 'WORK_ITEM_TRANSITION_AUDIT_EVENT_REQUIRED';
  end if;

  if audit_event.payload->>'action' is distinct from new.action then
    raise exception 'WORK_ITEM_TRANSITION_AUDIT_ACTION_MISMATCH';
  end if;

  if audit_event.payload->'subject_ref' is distinct from work_item.subject_ref then
    raise exception 'WORK_ITEM_TRANSITION_AUDIT_SUBJECT_MISMATCH';
  end if;

  if audit_event.occurred_at is distinct from new.occurred_at then
    raise exception 'WORK_ITEM_TRANSITION_EVIDENCE_TIME_MISMATCH';
  end if;

  if new.actor_type = 'owner'
    and new.actor_id <> case_record.owner_id::text then
    raise exception 'WORK_ITEM_TRANSITION_OWNER_REQUIRED';
  end if;

  if new.actor_type = 'drs_specialist' then
    select active_assignment.assignment_id
      into active_assignment_id
      from public.drs_case_specialist_assignments active_assignment
      where active_assignment.case_id = new.case_id
        and active_assignment.specialist_id = new.actor_id::uuid
        and active_assignment.valid_from <= new.occurred_at
      order by active_assignment.valid_from desc
      limit 1;

    if active_assignment_id is not null then
      perform pg_advisory_xact_lock(hashtextextended(active_assignment_id::text, 0));
    end if;

    if not drs_private.is_authorized_case_specialist_at(new.case_id, new.actor_id::uuid, new.occurred_at) then
      raise exception 'WORK_ITEM_TRANSITION_SPECIALIST_NOT_ACTIVE';
    end if;
  end if;

  if new.from_state <> work_item.state then
    raise exception 'WORK_ITEM_TRANSITION_FROM_STATE_MISMATCH';
  end if;

  if new.from_state = 'WAITING_FOR_SPECIALIST_REVIEW'
    and new.action in ('MARK_REVIEW_COMPLETED_ATTENTION', 'MARK_REVIEW_COMPLETED_NO_FLAG')
    and new.actor_type = 'drs_specialist' then
    expected_to_state := 'WAITING_FOR_OWNER_DECISION';
    expected_next_actor := 'OWNER';
  elsif new.from_state = 'WAITING_FOR_OWNER_DECISION'
    and new.action = 'OWNER_CONFIRMED'
    and new.actor_type = 'owner' then
    expected_to_state := 'CLOSED_RECORDED';
    expected_next_actor := 'NONE';
  else
    raise exception 'WORK_ITEM_TRANSITION_INVALID';
  end if;

  if new.to_state <> expected_to_state or new.next_actor <> expected_next_actor then
    raise exception 'WORK_ITEM_TRANSITION_STATE_MISMATCH';
  end if;

  update public.drs_review_work_items
    set state = new.to_state,
        next_actor = new.next_actor,
        updated_at = new.occurred_at
    where work_item_id = new.work_item_id;

  return new;
end;
$$;

drop trigger if exists drs_case_audit_events_insert_guard on public.drs_case_audit_events;
create trigger drs_case_audit_events_insert_guard
  before insert on public.drs_case_audit_events
  for each row
  execute function drs_private.enforce_drs_audit_event_insert();

drop trigger if exists drs_case_audit_events_no_update on public.drs_case_audit_events;
create trigger drs_case_audit_events_no_update
  before update on public.drs_case_audit_events
  for each row
  execute function drs_private.reject_drs_record_mutation();

drop trigger if exists drs_case_audit_events_no_delete on public.drs_case_audit_events;
create trigger drs_case_audit_events_no_delete
  before delete on public.drs_case_audit_events
  for each row
  execute function drs_private.reject_drs_record_mutation();

drop trigger if exists drs_case_line_group_links_insert_guard on public.drs_case_line_group_links;
create trigger drs_case_line_group_links_insert_guard
  before insert on public.drs_case_line_group_links
  for each row
  execute function drs_private.enforce_drs_line_group_link_insert();

drop trigger if exists drs_case_line_group_links_no_update on public.drs_case_line_group_links;
create trigger drs_case_line_group_links_no_update
  before update on public.drs_case_line_group_links
  for each row
  execute function drs_private.reject_drs_record_mutation();

drop trigger if exists drs_case_line_group_links_no_delete on public.drs_case_line_group_links;
create trigger drs_case_line_group_links_no_delete
  before delete on public.drs_case_line_group_links
  for each row
  execute function drs_private.reject_drs_record_mutation();

drop trigger if exists drs_case_line_group_link_terminations_insert_guard on public.drs_case_line_group_link_terminations;
create trigger drs_case_line_group_link_terminations_insert_guard
  before insert on public.drs_case_line_group_link_terminations
  for each row
  execute function drs_private.enforce_drs_line_group_link_termination_insert();

drop trigger if exists drs_case_line_group_link_terminations_no_update on public.drs_case_line_group_link_terminations;
create trigger drs_case_line_group_link_terminations_no_update
  before update on public.drs_case_line_group_link_terminations
  for each row
  execute function drs_private.reject_drs_record_mutation();

drop trigger if exists drs_case_line_group_link_terminations_no_delete on public.drs_case_line_group_link_terminations;
create trigger drs_case_line_group_link_terminations_no_delete
  before delete on public.drs_case_line_group_link_terminations
  for each row
  execute function drs_private.reject_drs_record_mutation();

drop trigger if exists drs_case_specialist_assignments_insert_guard on public.drs_case_specialist_assignments;
create trigger drs_case_specialist_assignments_insert_guard
  before insert on public.drs_case_specialist_assignments
  for each row
  execute function drs_private.enforce_drs_specialist_assignment_insert();

drop trigger if exists drs_case_specialist_assignments_no_update on public.drs_case_specialist_assignments;
create trigger drs_case_specialist_assignments_no_update
  before update on public.drs_case_specialist_assignments
  for each row
  execute function drs_private.reject_drs_record_mutation();

drop trigger if exists drs_case_specialist_assignments_no_delete on public.drs_case_specialist_assignments;
create trigger drs_case_specialist_assignments_no_delete
  before delete on public.drs_case_specialist_assignments
  for each row
  execute function drs_private.reject_drs_record_mutation();

drop trigger if exists drs_case_specialist_assignment_terminations_insert_guard on public.drs_case_specialist_assignment_terminations;
create trigger drs_case_specialist_assignment_terminations_insert_guard
  before insert on public.drs_case_specialist_assignment_terminations
  for each row
  execute function drs_private.enforce_drs_specialist_assignment_termination_insert();

drop trigger if exists drs_case_specialist_assignment_terminations_no_update on public.drs_case_specialist_assignment_terminations;
create trigger drs_case_specialist_assignment_terminations_no_update
  before update on public.drs_case_specialist_assignment_terminations
  for each row
  execute function drs_private.reject_drs_record_mutation();

drop trigger if exists drs_case_specialist_assignment_terminations_no_delete on public.drs_case_specialist_assignment_terminations;
create trigger drs_case_specialist_assignment_terminations_no_delete
  before delete on public.drs_case_specialist_assignment_terminations
  for each row
  execute function drs_private.reject_drs_record_mutation();

drop trigger if exists drs_review_work_items_state_update_guard on public.drs_review_work_items;
create trigger drs_review_work_items_state_update_guard
  before update of state, next_actor on public.drs_review_work_items
  for each row
  execute function drs_private.enforce_drs_work_item_update();

drop trigger if exists drs_review_work_item_transitions_insert_guard on public.drs_review_work_item_transitions;
create trigger drs_review_work_item_transitions_insert_guard
  after insert on public.drs_review_work_item_transitions
  for each row
  execute function drs_private.enforce_drs_work_item_transition_insert();

drop trigger if exists drs_review_work_item_transitions_no_update on public.drs_review_work_item_transitions;
create trigger drs_review_work_item_transitions_no_update
  before update on public.drs_review_work_item_transitions
  for each row
  execute function drs_private.reject_drs_record_mutation();

drop trigger if exists drs_review_work_item_transitions_no_delete on public.drs_review_work_item_transitions;
create trigger drs_review_work_item_transitions_no_delete
  before delete on public.drs_review_work_item_transitions
  for each row
  execute function drs_private.reject_drs_record_mutation();

alter table public.drs_cases enable row level security;
alter table public.drs_cases force row level security;

alter table public.drs_specialists enable row level security;
alter table public.drs_specialists force row level security;

alter table public.drs_case_line_group_links enable row level security;
alter table public.drs_case_line_group_links force row level security;

alter table public.drs_case_line_group_link_terminations enable row level security;
alter table public.drs_case_line_group_link_terminations force row level security;

alter table public.drs_case_specialist_assignments enable row level security;
alter table public.drs_case_specialist_assignments force row level security;

alter table public.drs_case_specialist_assignment_terminations enable row level security;
alter table public.drs_case_specialist_assignment_terminations force row level security;

alter table public.drs_case_audit_events enable row level security;
alter table public.drs_case_audit_events force row level security;
revoke insert, update, delete on public.drs_case_audit_events from public, anon, authenticated, service_role;

alter table public.drs_review_work_items enable row level security;
alter table public.drs_review_work_items force row level security;

alter table public.drs_review_work_item_transitions enable row level security;
alter table public.drs_review_work_item_transitions force row level security;

drop policy if exists drs_cases_owner_or_assigned_specialist on public.drs_cases;
create policy drs_cases_owner_or_assigned_specialist
  on public.drs_cases
  for select
  to authenticated
  using (
    owner_id = (select auth.uid())
    or drs_private.is_current_actor_active_case_specialist(case_id)
  );

drop policy if exists drs_specialists_self_select on public.drs_specialists;
create policy drs_specialists_self_select
  on public.drs_specialists
  for select
  to authenticated
  using (
    specialist_id = (select auth.uid())
  );

drop policy if exists drs_case_line_group_links_case_participant_select on public.drs_case_line_group_links;
create policy drs_case_line_group_links_case_participant_select
  on public.drs_case_line_group_links
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.drs_cases visible_case
      where visible_case.case_id = drs_case_line_group_links.case_id
        and visible_case.owner_id = (select auth.uid())
    )
    or drs_private.is_current_actor_active_case_specialist(case_id)
  );

drop policy if exists drs_case_specialist_assignments_case_participant_select on public.drs_case_specialist_assignments;
create policy drs_case_specialist_assignments_case_participant_select
  on public.drs_case_specialist_assignments
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.drs_cases visible_case
      where visible_case.case_id = drs_case_specialist_assignments.case_id
        and visible_case.owner_id = (select auth.uid())
    )
    or drs_private.is_current_actor_active_case_specialist(case_id)
  );

drop policy if exists drs_case_line_group_link_terminations_case_participant_select on public.drs_case_line_group_link_terminations;
create policy drs_case_line_group_link_terminations_case_participant_select
  on public.drs_case_line_group_link_terminations
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.drs_cases visible_case
      where visible_case.case_id = drs_case_line_group_link_terminations.case_id
        and visible_case.owner_id = (select auth.uid())
    )
    or drs_private.is_current_actor_active_case_specialist(case_id)
  );

drop policy if exists drs_case_specialist_assignment_terminations_case_participant_select on public.drs_case_specialist_assignment_terminations;
create policy drs_case_specialist_assignment_terminations_case_participant_select
  on public.drs_case_specialist_assignment_terminations
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.drs_cases visible_case
      where visible_case.case_id = drs_case_specialist_assignment_terminations.case_id
        and visible_case.owner_id = (select auth.uid())
    )
    or drs_private.is_current_actor_active_case_specialist(case_id)
  );

drop policy if exists drs_case_audit_events_case_participant_select on public.drs_case_audit_events;
create policy drs_case_audit_events_case_participant_select
  on public.drs_case_audit_events
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.drs_cases visible_case
      where visible_case.case_id = drs_case_audit_events.case_id
        and visible_case.owner_id = (select auth.uid())
    )
    or drs_private.is_current_actor_active_case_specialist(case_id)
  );

drop policy if exists drs_review_work_items_case_participant_select on public.drs_review_work_items;
create policy drs_review_work_items_case_participant_select
  on public.drs_review_work_items
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.drs_cases visible_case
      where visible_case.case_id = drs_review_work_items.case_id
        and visible_case.owner_id = (select auth.uid())
    )
    or drs_private.is_current_actor_active_case_specialist(case_id)
  );

drop policy if exists drs_review_work_item_transitions_case_participant_select on public.drs_review_work_item_transitions;
create policy drs_review_work_item_transitions_case_participant_select
  on public.drs_review_work_item_transitions
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.drs_cases visible_case
      where visible_case.case_id = drs_review_work_item_transitions.case_id
        and visible_case.owner_id = (select auth.uid())
    )
    or drs_private.is_current_actor_active_case_specialist(case_id)
  );
