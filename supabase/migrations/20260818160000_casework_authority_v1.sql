begin;

create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;
create schema if not exists casework;

revoke all on schema casework from public, anon, authenticated, service_role;
grant usage on schema casework to service_role;

alter default privileges for role postgres in schema casework
  revoke all on tables from public, anon, authenticated, service_role;
alter default privileges for role postgres in schema casework
  revoke all on functions from public, anon, authenticated, service_role;

create table casework.cases (
  id uuid primary key default extensions.gen_random_uuid(),
  case_status text not null default 'active'
    check (case_status in ('active', 'on_hold', 'closed')),
  title text not null
    check (title = btrim(title))
    check (length(title) between 1 and 200)
    check (title !~ '[[:cntrl:]]'),
  created_by uuid not null references auth.users(id) on delete restrict,
  creation_idempotency_key text not null
    check (length(creation_idempotency_key) between 16 and 128)
    check (creation_idempotency_key !~ '[[:space:][:cntrl:]]'),
  creation_payload_sha256 text not null
    check (creation_payload_sha256 ~ '^[a-f0-9]{64}$'),
  created_at timestamptz not null default clock_timestamp()
    check (isfinite(created_at)),
  updated_at timestamptz not null default clock_timestamp()
    check (isfinite(updated_at)),
  unique (created_by, creation_idempotency_key)
);

create table casework.case_members (
  membership_id uuid primary key default extensions.gen_random_uuid(),
  case_id uuid not null references casework.cases(id) on delete restrict,
  user_id uuid not null references auth.users(id) on delete restrict,
  role text not null check (role in ('owner', 'pro')),
  membership_status text not null default 'active'
    check (membership_status in ('active', 'revoked')),
  valid_from timestamptz not null default clock_timestamp()
    check (isfinite(valid_from)),
  valid_until timestamptz check (valid_until is null or isfinite(valid_until)),
  revoked_at timestamptz check (revoked_at is null or isfinite(revoked_at)),
  authority_version bigint not null default 1 check (authority_version >= 1),
  added_by uuid not null references auth.users(id) on delete restrict,
  added_at timestamptz not null default clock_timestamp()
    check (isfinite(added_at)),
  updated_at timestamptz not null default clock_timestamp()
    check (isfinite(updated_at)),
  unique (case_id, user_id),
  unique (case_id, membership_id),
  check (valid_until is null or valid_until > valid_from),
  check (
    (membership_status = 'active' and revoked_at is null)
    or (
      membership_status = 'revoked'
      and revoked_at is not null
      and valid_until = revoked_at
    )
  )
);

create table casework.case_events (
  event_id uuid primary key default extensions.gen_random_uuid(),
  case_id uuid not null references casework.cases(id) on delete restrict,
  event_type text not null check (
    event_type in (
      'CASE_CREATED',
      'HIGHEST_REVIEWER_GRANTED',
      'HIGHEST_REVIEWER_REVOKED'
    )
  ),
  actor_user_id uuid not null references auth.users(id) on delete restrict,
  subject_user_id uuid references auth.users(id) on delete restrict,
  membership_id uuid,
  idempotency_key text not null
    check (length(idempotency_key) between 16 and 128)
    check (idempotency_key !~ '[[:space:][:cntrl:]]'),
  payload_sha256 text not null check (payload_sha256 ~ '^[a-f0-9]{64}$'),
  payload jsonb not null,
  occurred_at timestamptz not null default clock_timestamp()
    check (isfinite(occurred_at)),
  unique (case_id, event_id),
  unique (actor_user_id, event_type, idempotency_key),
  foreign key (case_id, membership_id)
    references casework.case_members (case_id, membership_id)
    on delete restrict
);

create table casework.highest_reviewer_case_grants (
  grant_id uuid primary key default extensions.gen_random_uuid(),
  grant_version bigint not null default 1 check (grant_version >= 1),
  case_id uuid not null references casework.cases(id) on delete restrict,
  user_id uuid not null references auth.users(id) on delete restrict,
  status text not null default 'active' check (status in ('active', 'revoked')),
  valid_from timestamptz not null check (isfinite(valid_from)),
  valid_until timestamptz not null check (isfinite(valid_until)),
  revoked_at timestamptz check (revoked_at is null or isfinite(revoked_at)),
  authority_basis text not null
    check (authority_basis = btrim(authority_basis))
    check (length(authority_basis) between 1 and 256)
    check (authority_basis !~ '[[:cntrl:]]'),
  created_event_id uuid not null,
  granted_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default clock_timestamp()
    check (isfinite(created_at)),
  updated_at timestamptz not null default clock_timestamp()
    check (isfinite(updated_at)),
  unique (case_id, grant_id),
  foreign key (case_id, created_event_id)
    references casework.case_events (case_id, event_id)
    on delete restrict,
  check (valid_until > valid_from),
  check (valid_until <= valid_from + interval '15 minutes'),
  check (
    (status = 'active' and revoked_at is null)
    or (
      status = 'revoked'
      and revoked_at is not null
      and valid_until = revoked_at
    )
  )
);

create index cases_created_by_idx on casework.cases(created_by);
create index case_members_user_id_idx on casework.case_members(user_id);
create index case_members_added_by_idx on casework.case_members(added_by);
create index case_members_current_lookup_idx
  on casework.case_members(user_id, role, case_id, valid_from, valid_until)
  where membership_status = 'active' and revoked_at is null;
create index case_events_case_id_idx on casework.case_events(case_id);
create index case_events_actor_user_id_idx on casework.case_events(actor_user_id);
create index case_events_subject_user_id_idx
  on casework.case_events(subject_user_id) where subject_user_id is not null;
create index case_events_membership_id_idx
  on casework.case_events(membership_id) where membership_id is not null;
create index highest_reviewer_case_grants_user_id_idx
  on casework.highest_reviewer_case_grants(user_id);
create index highest_reviewer_case_grants_case_id_idx
  on casework.highest_reviewer_case_grants(case_id);
create index highest_reviewer_case_grants_granted_by_idx
  on casework.highest_reviewer_case_grants(granted_by);
create index highest_reviewer_case_grants_created_event_idx
  on casework.highest_reviewer_case_grants(created_event_id);
create index highest_reviewer_case_grants_current_lookup_idx
  on casework.highest_reviewer_case_grants(user_id, case_id, valid_from, valid_until)
  where status = 'active' and revoked_at is null;

alter table casework.cases enable row level security;
alter table casework.cases force row level security;
alter table casework.case_members enable row level security;
alter table casework.case_members force row level security;
alter table casework.case_events enable row level security;
alter table casework.case_events force row level security;
alter table casework.highest_reviewer_case_grants enable row level security;
alter table casework.highest_reviewer_case_grants force row level security;

revoke all on table casework.cases from public, anon, authenticated, service_role;
revoke all on table casework.case_members from public, anon, authenticated, service_role;
revoke all on table casework.case_events from public, anon, authenticated, service_role;
revoke all on table casework.highest_reviewer_case_grants from public, anon, authenticated, service_role;

create or replace function casework.case_event_immutable_v1()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  raise exception 'CASE_EVENT_IMMUTABLE';
end;
$$;

alter function casework.case_event_immutable_v1() owner to postgres;
revoke all on function casework.case_event_immutable_v1()
  from public, anon, authenticated, service_role;

create trigger case_events_immutable_v1
before update or delete on casework.case_events
for each row execute function casework.case_event_immutable_v1();

create or replace function casework.case_create_locked_v1(
  p_authenticated_user_id uuid,
  p_title text,
  p_idempotency_key text,
  p_payload_sha256 text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_now timestamptz := clock_timestamp();
  v_case_id uuid;
  v_membership_id uuid;
  v_event_id uuid;
  v_existing_payload_sha256 text;
begin
  if p_authenticated_user_id is null
    or p_title is null
    or p_title <> btrim(p_title)
    or length(p_title) not between 1 and 200
    or p_title ~ '[[:cntrl:]]'
    or p_idempotency_key is null
    or length(p_idempotency_key) not between 16 and 128
    or p_idempotency_key ~ '[[:space:][:cntrl:]]'
    or p_payload_sha256 is null
    or p_payload_sha256 !~ '^[a-f0-9]{64}$'
  then
    return jsonb_build_object('ok', false, 'state', 'INVALID_REQUEST');
  end if;

  perform 1
  from auth.users u
  where u.id = p_authenticated_user_id
    and u.deleted_at is null
    and (u.banned_until is null or u.banned_until <= v_now)
  for share;
  if not found then
    return jsonb_build_object('ok', false, 'state', 'AUTH_REQUIRED');
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended(
      p_authenticated_user_id::text || E'\\x1f' || p_idempotency_key,
      0
    )
  );

  select
    c.id,
    c.creation_payload_sha256,
    m.membership_id,
    e.event_id
  into
    v_case_id,
    v_existing_payload_sha256,
    v_membership_id,
    v_event_id
  from casework.cases c
  join casework.case_members m
    on m.case_id = c.id
   and m.user_id = c.created_by
   and m.role = 'owner'
  join casework.case_events e
    on e.case_id = c.id
   and e.membership_id = m.membership_id
   and e.event_type = 'CASE_CREATED'
  where c.created_by = p_authenticated_user_id
    and c.creation_idempotency_key = p_idempotency_key
  for share of c, m, e;

  if found then
    if v_existing_payload_sha256 <> p_payload_sha256 then
      return jsonb_build_object('ok', false, 'state', 'IDEMPOTENCY_CONFLICT');
    end if;
    return jsonb_build_object(
      'ok', true,
      'created', false,
      'state', 'CASE_CREATE_REPLAYED',
      'case_id', v_case_id,
      'case_status', 'active',
      'membership_id', v_membership_id,
      'membership_role', 'owner',
      'membership_status', 'active',
      'event_id', v_event_id
    );
  end if;

  v_case_id := extensions.gen_random_uuid();
  v_membership_id := extensions.gen_random_uuid();
  v_event_id := extensions.gen_random_uuid();

  insert into casework.cases (
    id,
    case_status,
    title,
    created_by,
    creation_idempotency_key,
    creation_payload_sha256,
    created_at,
    updated_at
  ) values (
    v_case_id,
    'active',
    p_title,
    p_authenticated_user_id,
    p_idempotency_key,
    p_payload_sha256,
    v_now,
    v_now
  );

  insert into casework.case_members (
    membership_id,
    case_id,
    user_id,
    role,
    membership_status,
    valid_from,
    authority_version,
    added_by,
    added_at,
    updated_at
  ) values (
    v_membership_id,
    v_case_id,
    p_authenticated_user_id,
    'owner',
    'active',
    v_now,
    1,
    p_authenticated_user_id,
    v_now,
    v_now
  );

  insert into casework.case_events (
    event_id,
    case_id,
    event_type,
    actor_user_id,
    subject_user_id,
    membership_id,
    idempotency_key,
    payload_sha256,
    payload,
    occurred_at
  ) values (
    v_event_id,
    v_case_id,
    'CASE_CREATED',
    p_authenticated_user_id,
    p_authenticated_user_id,
    v_membership_id,
    p_idempotency_key,
    p_payload_sha256,
    jsonb_build_object(
      'schemaVersion', 'laibe.case-event.v1',
      'caseId', v_case_id,
      'action', 'CASE_CREATED',
      'actorUserId', p_authenticated_user_id,
      'nextActor', 'owner',
      'nextAction', 'COMPLETE_CASE_REQUIREMENTS'
    ),
    v_now
  );

  return jsonb_build_object(
    'ok', true,
    'created', true,
    'state', 'CASE_CREATED',
    'case_id', v_case_id,
    'case_status', 'active',
    'membership_id', v_membership_id,
    'membership_role', 'owner',
    'membership_status', 'active',
    'event_id', v_event_id
  );
exception
  when unique_violation then
    return jsonb_build_object('ok', false, 'state', 'IDEMPOTENCY_CONFLICT');
  when others then
    return jsonb_build_object('ok', false, 'state', 'CONTEXT_UNAVAILABLE');
end;
$$;

alter function casework.case_create_locked_v1(uuid, text, text, text)
  owner to postgres;
revoke all on function casework.case_create_locked_v1(uuid, text, text, text)
  from public, anon, authenticated, service_role;
grant execute on function casework.case_create_locked_v1(uuid, text, text, text)
  to service_role;

create or replace function public.casework_case_create_v1(
  p_authenticated_user_id uuid,
  p_title text,
  p_idempotency_key text,
  p_payload_sha256 text
)
returns jsonb
language sql
volatile
security invoker
set search_path = ''
as $$
  select casework.case_create_locked_v1(
    p_authenticated_user_id,
    p_title,
    p_idempotency_key,
    p_payload_sha256
  );
$$;

alter function public.casework_case_create_v1(uuid, text, text, text) owner to postgres;
revoke all on function public.casework_case_create_v1(uuid, text, text, text) from public, anon, authenticated, service_role;
grant execute on function public.casework_case_create_v1(uuid, text, text, text) to service_role;

create or replace function casework.case_member_workspace_grant_resolve_locked_v1(
  p_authenticated_user_id uuid,
  p_expected_role text
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_now timestamptz := statement_timestamp();
  v_candidate record;
  v_candidate_count integer := 0;
begin
  if p_authenticated_user_id is null or p_expected_role not in ('owner', 'pro') then
    return jsonb_build_object('authorized', false, 'state', 'CASE_NOT_AUTHORIZED');
  end if;

  for v_candidate in
    select
      m.membership_id,
      m.authority_version,
      m.case_id,
      m.role,
      least(
        coalesce(m.valid_until, v_now + interval '15 minutes'),
        v_now + interval '15 minutes'
      ) as grant_expires_at
    from casework.case_members m
    join casework.cases c
      on c.id = m.case_id
     and c.case_status = 'active'
    join auth.users u
      on u.id = m.user_id
     and u.deleted_at is null
     and (u.banned_until is null or u.banned_until <= v_now)
    where m.user_id = p_authenticated_user_id
      and m.role = p_expected_role
      and m.membership_status = 'active'
      and m.revoked_at is null
      and m.valid_from <= v_now
      and (m.valid_until is null or m.valid_until > v_now)
    order by m.case_id, m.membership_id
    for share of m, c, u
  loop
    v_candidate_count := v_candidate_count + 1;
  end loop;

  if v_candidate_count = 0 then
    return jsonb_build_object('authorized', false, 'state', 'CASE_NOT_AUTHORIZED');
  end if;
  if v_candidate_count <> 1 then
    return jsonb_build_object('authorized', false, 'state', 'CASE_SELECTION_REQUIRED');
  end if;

  return jsonb_build_object(
    'authorized', true,
    'state', 'AUTHORIZED_CASEWORK_WORKSPACE',
    'case_id', v_candidate.case_id,
    'case_status', 'active',
    'account_role', v_candidate.role,
    'grant_id', v_candidate.membership_id,
    'grant_version', v_candidate.authority_version,
    'grant_expires_at', v_candidate.grant_expires_at
  );
exception
  when others then
    return jsonb_build_object('authorized', false, 'state', 'CONTEXT_UNAVAILABLE');
end;
$$;

alter function casework.case_member_workspace_grant_resolve_locked_v1(uuid, text)
  owner to postgres;
revoke all on function casework.case_member_workspace_grant_resolve_locked_v1(uuid, text)
  from public, anon, authenticated, service_role;
grant execute on function casework.case_member_workspace_grant_resolve_locked_v1(uuid, text)
  to service_role;

create or replace function public.owner_workspace_grant_v1(
  p_authenticated_user_id uuid
)
returns jsonb
language sql
volatile
security invoker
set search_path = ''
as $$
  select casework.case_member_workspace_grant_resolve_locked_v1(
    p_authenticated_user_id,
    'owner'
  );
$$;

alter function public.owner_workspace_grant_v1(uuid) owner to postgres;
revoke all on function public.owner_workspace_grant_v1(uuid) from public, anon, authenticated, service_role;
grant execute on function public.owner_workspace_grant_v1(uuid) to service_role;

create or replace function public.vendor_workspace_grant_v1(
  p_authenticated_user_id uuid
)
returns jsonb
language sql
volatile
security invoker
set search_path = ''
as $$
  select casework.case_member_workspace_grant_resolve_locked_v1(
    p_authenticated_user_id,
    'pro'
  );
$$;

alter function public.vendor_workspace_grant_v1(uuid) owner to postgres;
revoke all on function public.vendor_workspace_grant_v1(uuid) from public, anon, authenticated, service_role;
grant execute on function public.vendor_workspace_grant_v1(uuid) to service_role;

create or replace function casework.highest_reviewer_workspace_grant_resolve_locked_v1(
  p_authenticated_user_id uuid
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_now timestamptz := statement_timestamp();
  v_candidate record;
  v_candidate_count integer := 0;
begin
  if p_authenticated_user_id is null then
    return jsonb_build_object('authorized', false, 'state', 'AUTH_REQUIRED');
  end if;

  for v_candidate in
    select
      g.grant_id,
      g.grant_version,
      g.case_id,
      g.valid_until as grant_expires_at
    from casework.highest_reviewer_case_grants g
    join casework.cases c
      on c.id = g.case_id
     and c.case_status = 'active'
    join auth.users u
      on u.id = g.user_id
     and u.deleted_at is null
     and (u.banned_until is null or u.banned_until <= v_now)
    where g.user_id = p_authenticated_user_id
      and g.status = 'active'
      and g.revoked_at is null
      and g.valid_from <= v_now
      and g.valid_until > v_now
    order by g.case_id, g.grant_id
    for share of g, c, u
  loop
    v_candidate_count := v_candidate_count + 1;
  end loop;

  if v_candidate_count = 0 then
    return jsonb_build_object('authorized', false, 'state', 'CASE_NOT_AUTHORIZED');
  end if;
  if v_candidate_count <> 1 then
    return jsonb_build_object('authorized', false, 'state', 'CASE_SELECTION_REQUIRED');
  end if;

  return jsonb_build_object(
    'authorized', true,
    'state', 'AUTHORIZED_CASEWORK_WORKSPACE',
    'case_id', v_candidate.case_id,
    'case_status', 'active',
    'account_role', 'highest_reviewer',
    'grant_id', v_candidate.grant_id,
    'grant_version', v_candidate.grant_version,
    'grant_expires_at', v_candidate.grant_expires_at
  );
exception
  when others then
    return jsonb_build_object('authorized', false, 'state', 'CONTEXT_UNAVAILABLE');
end;
$$;

alter function casework.highest_reviewer_workspace_grant_resolve_locked_v1(uuid)
  owner to postgres;
revoke all on function casework.highest_reviewer_workspace_grant_resolve_locked_v1(uuid)
  from public, anon, authenticated, service_role;
grant execute on function casework.highest_reviewer_workspace_grant_resolve_locked_v1(uuid)
  to service_role;

create or replace function public.highest_reviewer_workspace_grant_v1(
  p_authenticated_user_id uuid
)
returns jsonb
language sql
volatile
security invoker
set search_path = ''
as $$
  select casework.highest_reviewer_workspace_grant_resolve_locked_v1(
    p_authenticated_user_id
  );
$$;

alter function public.highest_reviewer_workspace_grant_v1(uuid) owner to postgres;
revoke all on function public.highest_reviewer_workspace_grant_v1(uuid) from public, anon, authenticated, service_role;
grant execute on function public.highest_reviewer_workspace_grant_v1(uuid) to service_role;

commit;
