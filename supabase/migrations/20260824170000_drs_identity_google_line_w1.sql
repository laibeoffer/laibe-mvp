begin;

do $$
begin
  if to_regclass('auth.users') is null
    or to_regclass('casework.cases') is null
    or to_regclass('public.drs_cases') is null
    or to_regclass('public.drs_specialists') is null
    or to_regclass('public.drs_case_specialist_assignments') is null
    or to_regclass('public.drs_case_specialist_assignment_terminations') is null
    or to_regprocedure(
      'drs_private.is_current_actor_active_case_specialist(uuid)'
    ) is null
    or to_regprocedure(
      'integration.google_calendar_drs_authorize_transaction_v1(uuid,uuid,text,text)'
    ) is null
  then
    raise exception 'DRS_IDENTITY_AUTHORITY_PREREQUISITE_MISSING';
  end if;

  if to_regclass('integration.drs_auth_specialist_bindings') is not null
    or to_regclass('integration.drs_case_identity_bindings') is not null
  then
    raise exception 'DRS_IDENTITY_AUTHORITY_BRIDGE_ALREADY_EXISTS';
  end if;
end;
$$;

create table integration.drs_auth_specialist_bindings (
  binding_id uuid primary key default extensions.gen_random_uuid(),
  authenticated_user_id uuid not null,
  specialist_id uuid not null,
  selected_assignment_id uuid,
  authorization_subject text not null,
  binding_status text not null default 'active',
  valid_from timestamptz not null,
  valid_until timestamptz not null,
  revoked_at timestamptz,
  created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp(),
  foreign key (authenticated_user_id)
    references auth.users(id) on delete restrict,
  foreign key (specialist_id)
    references public.drs_specialists(specialist_id) on delete restrict,
  foreign key (selected_assignment_id)
    references public.drs_case_specialist_assignments(assignment_id)
    on delete restrict,
  unique (authenticated_user_id),
  unique (specialist_id),
  unique (authorization_subject),
  constraint drs_auth_specialist_bindings_subject_check check (
    authorization_subject = 'drs-specialist:' || specialist_id::text
  ),
  constraint drs_auth_specialist_bindings_status_check check (
    binding_status in ('active', 'suspended', 'revoked')
  ),
  constraint drs_auth_specialist_bindings_interval_check check (
    isfinite(valid_from)
    and isfinite(valid_until)
    and valid_until > valid_from
  ),
  constraint drs_auth_specialist_bindings_revocation_check check (
    (binding_status = 'revoked' and revoked_at is not null)
    or (binding_status <> 'revoked' and revoked_at is null)
  )
);

create index drs_auth_specialist_bindings_active_lookup_idx
  on integration.drs_auth_specialist_bindings (
    authenticated_user_id,
    specialist_id,
    selected_assignment_id
  )
  where binding_status = 'active' and revoked_at is null;

create index drs_auth_specialist_bindings_selected_assignment_idx
  on integration.drs_auth_specialist_bindings (selected_assignment_id)
  where selected_assignment_id is not null;

create table integration.drs_case_identity_bindings (
  case_identity_binding_id uuid primary key
    default extensions.gen_random_uuid(),
  drs_case_id uuid not null,
  casework_case_id uuid not null,
  mapping_status text not null default 'active',
  valid_from timestamptz not null,
  valid_until timestamptz not null,
  revoked_at timestamptz,
  created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp(),
  foreign key (drs_case_id)
    references public.drs_cases(case_id) on delete restrict,
  foreign key (casework_case_id)
    references casework.cases(id) on delete restrict,
  unique (drs_case_id),
  unique (casework_case_id),
  constraint drs_case_identity_bindings_status_check check (
    mapping_status in ('active', 'revoked')
  ),
  constraint drs_case_identity_bindings_interval_check check (
    isfinite(valid_from)
    and isfinite(valid_until)
    and valid_until > valid_from
  ),
  constraint drs_case_identity_bindings_revocation_check check (
    (mapping_status = 'revoked' and revoked_at is not null)
    or (mapping_status = 'active' and revoked_at is null)
  )
);

create index drs_case_identity_bindings_active_lookup_idx
  on integration.drs_case_identity_bindings (
    drs_case_id,
    casework_case_id
  )
  where mapping_status = 'active' and revoked_at is null;

alter table integration.drs_auth_specialist_bindings owner to postgres;
alter table integration.drs_case_identity_bindings owner to postgres;

alter table integration.drs_auth_specialist_bindings
  enable row level security;
alter table integration.drs_auth_specialist_bindings
  force row level security;
alter table integration.drs_case_identity_bindings
  enable row level security;
alter table integration.drs_case_identity_bindings
  force row level security;

create policy drs_auth_specialist_bindings_deny_all
  on integration.drs_auth_specialist_bindings
  for all
  to public
  using (false)
  with check (false);

create policy drs_case_identity_bindings_deny_all
  on integration.drs_case_identity_bindings
  for all
  to public
  using (false)
  with check (false);

revoke all on table integration.drs_auth_specialist_bindings
  from public, anon, authenticated, service_role;
revoke all on table integration.drs_case_identity_bindings
  from public, anon, authenticated, service_role;

create or replace function drs_private.is_current_actor_active_specialist(
  target_specialist_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_now timestamptz := clock_timestamp();
  v_authenticated_user_id uuid := (select auth.uid());
begin
  if v_authenticated_user_id is null or target_specialist_id is null then
    return false;
  end if;

  return exists (
    select 1
    from integration.drs_auth_specialist_bindings b
    join public.drs_specialists s
      on s.specialist_id = b.specialist_id
    where b.authenticated_user_id = v_authenticated_user_id
      and b.specialist_id = target_specialist_id
      and b.authorization_subject =
        'drs-specialist:' || b.specialist_id::text
      and b.binding_status = 'active'
      and b.revoked_at is null
      and b.valid_from <= v_now
      and b.valid_until > v_now
      and s.authority_state = 'ACTIVE'
  );
end;
$$;

alter function drs_private.is_current_actor_active_specialist(uuid)
  owner to postgres;
revoke all on function drs_private.is_current_actor_active_specialist(uuid)
  from public, anon, authenticated, service_role;
grant execute on function drs_private.is_current_actor_active_specialist(uuid)
  to authenticated;

create or replace function drs_private.is_current_actor_active_case_specialist(
  target_case_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_now timestamptz := clock_timestamp();
  v_authenticated_user_id uuid := (select auth.uid());
begin
  if v_authenticated_user_id is null or target_case_id is null then
    return false;
  end if;

  return exists (
    select 1
    from integration.drs_auth_specialist_bindings b
    join public.drs_specialists s
      on s.specialist_id = b.specialist_id
    join public.drs_case_specialist_assignments a
      on b.selected_assignment_id = a.assignment_id
      and a.specialist_id = b.specialist_id
    join integration.drs_case_identity_bindings m
      on m.drs_case_id = a.case_id
    join casework.cases c
      on m.casework_case_id = c.id
    where b.authenticated_user_id = (select auth.uid())
      and b.authenticated_user_id = v_authenticated_user_id
      and b.selected_assignment_id is not null
      and b.authorization_subject =
        'drs-specialist:' || b.specialist_id::text
      and b.binding_status = 'active'
      and b.revoked_at is null
      and b.valid_from <= v_now
      and b.valid_until > v_now
      and s.authority_state = 'ACTIVE'
      and m.drs_case_id = target_case_id
      and m.mapping_status = 'active'
      and m.revoked_at is null
      and m.valid_from <= v_now
      and m.valid_until > v_now
      and a.valid_from <= v_now
      and (a.valid_until is null or a.valid_until > v_now)
      and c.case_status = 'active'
      and not exists (
        select 1
        from public.drs_case_specialist_assignment_terminations t
        where t.assignment_id = a.assignment_id
          and t.terminated_at <= v_now
      )
  );
end;
$$;

alter function drs_private.is_current_actor_active_case_specialist(uuid)
  owner to postgres;
revoke all on function drs_private.is_current_actor_active_case_specialist(uuid)
  from public, anon, authenticated, service_role;
grant execute on function drs_private.is_current_actor_active_case_specialist(uuid)
  to authenticated;

drop policy if exists drs_specialists_self_select on public.drs_specialists;
create policy drs_specialists_self_select
  on public.drs_specialists
  for select
  to authenticated
  using (
    drs_private.is_current_actor_active_specialist(specialist_id)
  );

create or replace function integration.drs_identity_authority_resolve_locked_v1(
  p_authenticated_user_id uuid,
  p_expected_case_id uuid,
  p_authorization_subject text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_now timestamptz := clock_timestamp();
  v_verified_user_id uuid;
  v_specialist_id uuid;
  v_selected_assignment_id uuid;
  v_authorization_subject text;
  v_binding_status text;
  v_binding_valid_from timestamptz;
  v_binding_valid_until timestamptz;
  v_binding_revoked_at timestamptz;
  v_specialist_state text;
  v_candidate record;
  v_candidate_count integer := 0;
  v_assignment_id uuid;
  v_assignment_valid_from timestamptz;
  v_assignment_valid_until timestamptz;
  v_mapping_valid_from timestamptz;
  v_mapping_valid_until timestamptz;
  v_effective_valid_from timestamptz;
  v_effective_valid_until timestamptz;
  v_selected_case_id uuid;
  v_termination_at timestamptz;
begin
  if p_authenticated_user_id is null then
    return jsonb_build_object(
      'authorized', false,
      'state', 'AUTH_REQUIRED'
    );
  end if;

  select u.id
  into v_verified_user_id
  from auth.users u
  where u.id = p_authenticated_user_id
    and u.deleted_at is null
    and (u.banned_until is null or u.banned_until <= v_now)
  for update;

  if not found then
    return jsonb_build_object(
      'authorized', false,
      'state', 'CASE_NOT_AUTHORIZED'
    );
  end if;

  select
    b.specialist_id,
    b.selected_assignment_id,
    b.authorization_subject,
    b.binding_status,
    b.valid_from,
    b.valid_until,
    b.revoked_at
  into
    v_specialist_id,
    v_selected_assignment_id,
    v_authorization_subject,
    v_binding_status,
    v_binding_valid_from,
    v_binding_valid_until,
    v_binding_revoked_at
  from integration.drs_auth_specialist_bindings b
  where b.authenticated_user_id = v_verified_user_id
  for update;

  if not found
    or v_binding_status <> 'active'
    or v_binding_revoked_at is not null
    or v_binding_valid_from > v_now
    or v_binding_valid_until <= v_now
  then
    return jsonb_build_object(
      'authorized', false,
      'state', 'CASE_NOT_AUTHORIZED'
    );
  end if;

  if v_authorization_subject <> 'drs-specialist:' || v_specialist_id::text
    or (
      p_authorization_subject is not null
      and p_authorization_subject <> v_authorization_subject
    )
  then
    return jsonb_build_object(
      'authorized', false,
      'state', 'IDENTITY_MISMATCH'
    );
  end if;

  select s.authority_state
  into v_specialist_state
  from public.drs_specialists s
  where s.specialist_id = v_specialist_id
  for update;

  if not found or v_specialist_state <> 'ACTIVE' then
    return jsonb_build_object(
      'authorized', false,
      'state', 'CASE_NOT_AUTHORIZED'
    );
  end if;

  if v_selected_assignment_id is null then
    return jsonb_build_object(
      'authorized', false,
      'state', 'CASE_SELECTION_REQUIRED'
    );
  end if;

  for v_candidate in
    select
      a.assignment_id,
      a.valid_from as assignment_valid_from,
      a.valid_until as assignment_valid_until,
      m.valid_from as mapping_valid_from,
      m.valid_until as mapping_valid_until,
      m.casework_case_id
    from public.drs_case_specialist_assignments a
    join integration.drs_case_identity_bindings m
      on m.drs_case_id = a.case_id
    join casework.cases c
      on c.id = m.casework_case_id
    where a.specialist_id = v_specialist_id
      and a.assignment_id = v_selected_assignment_id
      and a.valid_from <= v_now
      and (a.valid_until is null or a.valid_until > v_now)
      and m.mapping_status = 'active'
      and m.revoked_at is null
      and m.valid_from <= v_now
      and m.valid_until > v_now
      and c.case_status = 'active'
    order by a.assignment_id, m.case_identity_binding_id
    for update of a, m, c
  loop
    v_termination_at := null;
    select t.terminated_at
    into v_termination_at
    from public.drs_case_specialist_assignment_terminations t
    where t.assignment_id = v_candidate.assignment_id
    for update;

    if v_termination_at <= v_now then
      continue;
    end if;

    v_assignment_id := v_candidate.assignment_id;
    v_assignment_valid_from := v_candidate.assignment_valid_from;
    v_assignment_valid_until := v_candidate.assignment_valid_until;
    v_mapping_valid_from := v_candidate.mapping_valid_from;
    v_mapping_valid_until := v_candidate.mapping_valid_until;
    v_effective_valid_from := greatest(
      v_binding_valid_from,
      v_mapping_valid_from,
      v_assignment_valid_from
    );
    v_effective_valid_until := least(
      v_binding_valid_until,
      v_mapping_valid_until,
      coalesce(v_assignment_valid_until, 'infinity'::timestamptz),
      coalesce(v_termination_at, 'infinity'::timestamptz)
    );
    if v_effective_valid_from > v_now
      or v_effective_valid_until <= v_now
    then
      continue;
    end if;

    v_candidate_count := v_candidate_count + 1;
    v_selected_case_id := v_candidate.casework_case_id;
  end loop;

  if v_candidate_count = 0 then
    return jsonb_build_object(
      'authorized', false,
      'state', 'CASE_NOT_AUTHORIZED'
    );
  end if;

  if v_candidate_count <> 1
    or v_assignment_id <> v_selected_assignment_id
    or (
      p_expected_case_id is not null
      and v_selected_case_id <> p_expected_case_id
    )
  then
    return jsonb_build_object(
      'authorized', false,
      'state', 'CASE_NOT_AUTHORIZED'
    );
  end if;

  return jsonb_build_object(
    'authorized', true,
    'authenticated_user_id', v_verified_user_id::text,
    'specialist_id', v_specialist_id::text,
    'assignment_id', v_assignment_id::text,
    'selected_case_id', v_selected_case_id::text,
    'account_role', 'drs',
    'authorization_subject', v_authorization_subject,
    'auth_binding_status', 'active',
    'specialist_status', 'active',
    'assignment_status', 'active',
    'valid_from', v_effective_valid_from,
    'valid_until', v_effective_valid_until,
    'terminated_at', null,
    'lock_status', 'locked'
  );
exception
  when others then
    return jsonb_build_object(
      'authorized', false,
      'state', 'CONTEXT_UNAVAILABLE'
    );
end;
$$;

alter function integration.drs_identity_authority_resolve_locked_v1(
  uuid, uuid, text
) owner to postgres;

comment on function integration.drs_identity_authority_resolve_locked_v1(
  uuid, uuid, text
) is
  'Private locked DRS authority resolver. It derives one mapped case from a verified auth-user binding, ACTIVE specialist, explicit DRS-to-casework mapping, active exact assignment, and no termination. It never treats auth.uid(), LINE identity, caller case values, or UUID equality as specialist authority.';

revoke all on function integration.drs_identity_authority_resolve_locked_v1(
  uuid, uuid, text
) from public, anon, authenticated, service_role;

create or replace function public.drs_workspace_grant_v1(
  p_authenticated_user_id uuid,
  p_expected_case_id uuid,
  p_authorization_subject text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_authority jsonb;
  v_state text;
begin
  v_authority := integration.drs_identity_authority_resolve_locked_v1(
    p_authenticated_user_id,
    p_expected_case_id,
    p_authorization_subject
  );

  if v_authority -> 'authorized' is distinct from 'true'::jsonb then
    v_state := case v_authority ->> 'state'
      when 'AUTH_REQUIRED' then 'AUTH_REQUIRED'
      when 'CONTEXT_UNAVAILABLE' then 'CONTEXT_UNAVAILABLE'
      when 'CASE_SELECTION_REQUIRED' then 'CASE_SELECTION_REQUIRED'
      when 'IDENTITY_MISMATCH' then 'IDENTITY_MISMATCH'
      else 'CASE_NOT_AUTHORIZED'
    end;
    return jsonb_build_object(
      'authorized', false,
      'state', v_state
    );
  end if;

  return jsonb_build_object(
    'authorized', true,
    'state', 'AUTHORIZED_DRS_WORKSPACE',
    'case_id', v_authority ->> 'selected_case_id',
    'case_status', 'active',
    'access_mode', 'read_only'
  );
exception
  when others then
    return jsonb_build_object(
      'authorized', false,
      'state', 'CONTEXT_UNAVAILABLE'
    );
end;
$$;

alter function public.drs_workspace_grant_v1(
  uuid, uuid, text
) owner to postgres;

comment on function public.drs_workspace_grant_v1(uuid, uuid, text) is
  'Service-only minimal DRS read grant. It returns only authorization state, selected case, active case status, and read-only access mode; private specialist and assignment facts remain inside the locked resolver.';

revoke all on function public.drs_workspace_grant_v1(
  uuid, uuid, text
) from public, anon, authenticated, service_role;
grant execute on function public.drs_workspace_grant_v1(
  uuid, uuid, text
) to service_role;

create or replace function integration.google_calendar_drs_authorize_transaction_v1(
  p_user_id uuid,
  p_case_id uuid,
  p_account_role text,
  p_authorization_subject text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_account_role <> 'drs' then
    return jsonb_build_object(
      'authorized', false,
      'state', 'CASE_NOT_AUTHORIZED'
    );
  end if;

  return integration.drs_identity_authority_resolve_locked_v1(
    p_user_id,
    p_case_id,
    p_authorization_subject
  );
exception
  when others then
    return jsonb_build_object(
      'authorized', false,
      'state', 'CASE_NOT_AUTHORIZED'
    );
end;
$$;

alter function integration.google_calendar_drs_authorize_transaction_v1(
  uuid, uuid, text, text
) owner to postgres;

comment on function integration.google_calendar_drs_authorize_transaction_v1(
  uuid, uuid, text, text
) is
  'Private Google Calendar DRS callback hook. It reauthorizes and locks the exact auth binding, ACTIVE specialist, explicit case mapping, selected assignment, and termination state before returning locked authority facts.';

revoke all on function integration.google_calendar_drs_authorize_transaction_v1(
  uuid, uuid, text, text
) from public, anon, authenticated, service_role;

commit;
