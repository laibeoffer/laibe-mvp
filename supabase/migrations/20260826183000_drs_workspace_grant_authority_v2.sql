begin;

do $$
begin
  if to_regclass('auth.users') is null
    or to_regclass('casework.cases') is null
    or to_regclass('integration.drs_auth_specialist_bindings') is null
    or to_regclass('integration.drs_case_identity_bindings') is null
    or to_regclass('public.drs_cases') is null
    or to_regclass('public.drs_specialists') is null
    or to_regclass('public.drs_case_specialist_assignments') is null
    or to_regclass(
      'public.drs_case_specialist_assignment_terminations'
    ) is null
    or to_regprocedure(
      'integration.drs_identity_authority_resolve_locked_v1(uuid,uuid,text)'
    ) is null
  then
    raise exception 'DRS_WORKSPACE_GRANT_AUTHORITY_V2_PREREQUISITE_MISSING';
  end if;

  if to_regclass('integration.drs_workspace_grants') is not null
    or to_regprocedure(
      'integration.drs_workspace_grant_issue_locked_v2(uuid,uuid,text)'
    ) is not null
    or to_regprocedure(
      'integration.drs_workspace_grant_assert_current_locked_v1(uuid,uuid,text,uuid,bigint)'
    ) is not null
    or to_regprocedure(
      'public.drs_workspace_grant_v2(uuid,uuid,text)'
    ) is not null
  then
    raise exception 'DRS_WORKSPACE_GRANT_AUTHORITY_V2_ALREADY_EXISTS';
  end if;
end;
$$;

create table integration.drs_workspace_grants (
  grant_id uuid primary key default extensions.gen_random_uuid(),
  grant_version bigint generated always as identity unique,
  binding_id uuid not null references
    integration.drs_auth_specialist_bindings(binding_id) on delete restrict,
  authenticated_user_id uuid not null references auth.users(id)
    on delete restrict,
  specialist_id uuid not null references public.drs_specialists(specialist_id)
    on delete restrict,
  assignment_id uuid not null references
    public.drs_case_specialist_assignments(assignment_id) on delete restrict,
  drs_case_id uuid not null references public.drs_cases(case_id)
    on delete restrict,
  casework_case_id uuid not null references casework.cases(id)
    on delete restrict,
  authorization_subject text not null,
  issued_at timestamptz not null default clock_timestamp(),
  expires_at timestamptz not null,
  invalidated_at timestamptz,
  invalidation_reason text,
  constraint drs_workspace_grants_subject_check check (
    authorization_subject = 'drs-specialist:' || specialist_id::text
  ),
  constraint drs_workspace_grants_interval_check check (
    isfinite(issued_at)
    and isfinite(expires_at)
    and expires_at > issued_at
    and expires_at <= issued_at + interval '15 minutes'
  ),
  constraint drs_workspace_grants_invalidation_check check (
    (invalidated_at is null and invalidation_reason is null)
    or (
      invalidated_at is not null
      and invalidation_reason is not null
      and isfinite(invalidated_at)
      and invalidated_at >= issued_at
      and btrim(invalidation_reason) <> ''
    )
  )
);

create unique index drs_workspace_grants_one_current_binding_idx
  on integration.drs_workspace_grants(binding_id)
  where invalidated_at is null;

create index drs_workspace_grants_current_assert_idx
  on integration.drs_workspace_grants(
    grant_id,
    grant_version,
    authenticated_user_id,
    casework_case_id,
    expires_at
  )
  where invalidated_at is null;

alter table integration.drs_workspace_grants owner to postgres;
alter table integration.drs_workspace_grants enable row level security;
alter table integration.drs_workspace_grants force row level security;

create policy drs_workspace_grants_deny_all
  on integration.drs_workspace_grants
  for all
  to public
  using (false)
  with check (false);

revoke all on table integration.drs_workspace_grants
  from public, anon, authenticated, service_role;
revoke all on sequence integration.drs_workspace_grants_grant_version_seq
  from public, anon, authenticated, service_role;

create or replace function integration.drs_workspace_grant_enforce_immutable_v1()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    raise exception 'DRS_WORKSPACE_GRANT_DELETE_DENIED';
  end if;

  if old.invalidated_at is not null then
    raise exception 'DRS_WORKSPACE_GRANT_ALREADY_INVALIDATED';
  end if;

  if old.grant_id is distinct from new.grant_id
    or old.grant_version is distinct from new.grant_version
    or old.binding_id is distinct from new.binding_id
    or old.authenticated_user_id is distinct from new.authenticated_user_id
    or old.specialist_id is distinct from new.specialist_id
    or old.assignment_id is distinct from new.assignment_id
    or old.drs_case_id is distinct from new.drs_case_id
    or old.casework_case_id is distinct from new.casework_case_id
    or old.authorization_subject is distinct from new.authorization_subject
    or old.issued_at is distinct from new.issued_at
    or old.expires_at is distinct from new.expires_at
  then
    raise exception 'DRS_WORKSPACE_GRANT_IMMUTABLE_FACT_DENIED';
  end if;

  if old.invalidation_reason is not null
    or new.invalidated_at is null
    or new.invalidation_reason is null
    or btrim(new.invalidation_reason) = ''
  then
    raise exception 'DRS_WORKSPACE_GRANT_INVALIDATION_TRANSITION_DENIED';
  end if;

  return new;
end;
$$;

alter function integration.drs_workspace_grant_enforce_immutable_v1()
  owner to postgres;

revoke all on function integration.drs_workspace_grant_enforce_immutable_v1()
  from public, anon, authenticated, service_role;

create trigger drs_workspace_grants_enforce_immutable
  before update or delete
  on integration.drs_workspace_grants
  for each row execute function
    integration.drs_workspace_grant_enforce_immutable_v1();

create or replace function integration.drs_workspace_grant_issue_locked_v2(
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
  v_authority jsonb;
  v_state text;
  v_binding_id uuid;
  v_specialist_id uuid;
  v_assignment_id uuid;
  v_drs_case_id uuid;
  v_casework_case_id uuid;
  v_authorization_subject text;
  v_authority_expires_at timestamptz;
  v_grant_expires_at timestamptz;
  v_grant integration.drs_workspace_grants%rowtype;
begin
  if p_authenticated_user_id is null
    or p_expected_case_id is null
    or p_authorization_subject is null
    or btrim(p_authorization_subject) = ''
  then
    return jsonb_build_object(
      'authorized', false,
      'state', 'CASE_NOT_AUTHORIZED'
    );
  end if;

  v_authority := integration.drs_identity_authority_resolve_locked_v1(
    p_authenticated_user_id,
    p_expected_case_id,
    p_authorization_subject
  );

  v_now := clock_timestamp();

  if v_authority -> 'authorized' is distinct from 'true'::jsonb then
    v_state := case v_authority ->> 'state'
      when 'AUTH_REQUIRED' then 'AUTH_REQUIRED'
      when 'CONTEXT_UNAVAILABLE' then 'CONTEXT_UNAVAILABLE'
      when 'CASE_SELECTION_REQUIRED' then 'CASE_SELECTION_REQUIRED'
      when 'IDENTITY_MISMATCH' then 'IDENTITY_MISMATCH'
      else 'CASE_NOT_AUTHORIZED'
    end;
    return jsonb_build_object('authorized', false, 'state', v_state);
  end if;

  v_specialist_id := (v_authority ->> 'specialist_id')::uuid;
  v_assignment_id := (v_authority ->> 'assignment_id')::uuid;
  v_casework_case_id := (v_authority ->> 'selected_case_id')::uuid;
  v_authorization_subject := v_authority ->> 'authorization_subject';
  v_authority_expires_at := (v_authority ->> 'valid_until')::timestamptz;

  select b.binding_id, a.case_id, m.casework_case_id
  into v_binding_id, v_drs_case_id, v_casework_case_id
  from integration.drs_auth_specialist_bindings b
  join public.drs_specialists s
    on s.specialist_id = b.specialist_id
  join public.drs_case_specialist_assignments a
    on a.assignment_id = b.selected_assignment_id
    and a.specialist_id = b.specialist_id
  join integration.drs_case_identity_bindings m
    on m.drs_case_id = a.case_id
  join public.drs_cases d
    on d.case_id = a.case_id
  join casework.cases c
    on c.id = m.casework_case_id
  where b.authenticated_user_id = p_authenticated_user_id
    and b.specialist_id = v_specialist_id
    and b.selected_assignment_id = v_assignment_id
    and b.authorization_subject = p_authorization_subject
    and b.binding_status = 'active'
    and b.revoked_at is null
    and b.valid_from <= v_now
    and b.valid_until > v_now
    and s.authority_state = 'ACTIVE'
    and a.valid_from <= v_now
    and (a.valid_until is null or a.valid_until > v_now)
    and not exists (
      select 1
      from public.drs_case_specialist_assignment_terminations t
      where t.assignment_id = a.assignment_id
        and t.terminated_at <= v_now
    )
    and m.casework_case_id = p_expected_case_id
    and m.mapping_status = 'active'
    and m.revoked_at is null
    and m.valid_from <= v_now
    and m.valid_until > v_now
    and d.case_state in ('ACTIVE_REVIEW', 'ACTIVE_CONSTRUCTION')
    and c.case_status = 'active'
  for update of b, s, a, m, d, c;

  if not found
    or v_casework_case_id <> p_expected_case_id
    or v_authorization_subject <> p_authorization_subject
    or v_authority_expires_at <= v_now
  then
    return jsonb_build_object(
      'authorized', false,
      'state', 'CASE_NOT_AUTHORIZED'
    );
  end if;

  v_grant_expires_at := least(
    v_authority_expires_at,
    v_now + interval '15 minutes'
  );

  update integration.drs_workspace_grants
  set
    invalidated_at = coalesce(invalidated_at, v_now),
    invalidation_reason = coalesce(
      invalidation_reason,
      'AUTHORITY_ROTATED_OR_STALE'
    )
  where binding_id = v_binding_id
    and invalidated_at is null
    and (
      authenticated_user_id <> p_authenticated_user_id
      or specialist_id <> v_specialist_id
      or assignment_id <> v_assignment_id
      or drs_case_id <> v_drs_case_id
      or casework_case_id <> v_casework_case_id
      or authorization_subject <> v_authorization_subject
      or expires_at <= v_now
      or expires_at > v_authority_expires_at
    );

  select *
  into v_grant
  from integration.drs_workspace_grants g
  where g.binding_id = v_binding_id
    and g.authenticated_user_id = p_authenticated_user_id
    and g.specialist_id = v_specialist_id
    and g.assignment_id = v_assignment_id
    and g.drs_case_id = v_drs_case_id
    and g.casework_case_id = v_casework_case_id
    and g.authorization_subject = v_authorization_subject
    and g.invalidated_at is null
    and g.expires_at > v_now
    and g.expires_at <= v_authority_expires_at
  for update;

  if not found then
    update integration.drs_workspace_grants
    set
      invalidated_at = coalesce(invalidated_at, v_now),
      invalidation_reason = coalesce(
        invalidation_reason,
        'SUPERSEDED_BY_NEW_GRANT'
      )
    where binding_id = v_binding_id
      and invalidated_at is null;

    insert into integration.drs_workspace_grants (
      binding_id,
      authenticated_user_id,
      specialist_id,
      assignment_id,
      drs_case_id,
      casework_case_id,
      authorization_subject,
      issued_at,
      expires_at
    ) values (
      v_binding_id,
      p_authenticated_user_id,
      v_specialist_id,
      v_assignment_id,
      v_drs_case_id,
      v_casework_case_id,
      v_authorization_subject,
      v_now,
      v_grant_expires_at
    )
    returning * into v_grant;
  end if;

  return jsonb_build_object(
    'authorized', true,
    'state', 'AUTHORIZED_DRS_VERSIONED_WORKSPACE',
    'authenticated_user_id', v_grant.authenticated_user_id::text,
    'case_id', v_grant.casework_case_id::text,
    'authorization_subject', v_grant.authorization_subject,
    'grant_id', v_grant.grant_id::text,
    'grant_version', v_grant.grant_version::text,
    'grant_expires_at', v_grant.expires_at
  );
exception
  when others then
    return jsonb_build_object(
      'authorized', false,
      'state', 'CONTEXT_UNAVAILABLE'
    );
end;
$$;

alter function integration.drs_workspace_grant_issue_locked_v2(
  uuid, uuid, text
) owner to postgres;

revoke all on function integration.drs_workspace_grant_issue_locked_v2(
  uuid, uuid, text
) from public, anon, authenticated, service_role;
grant usage on schema integration to service_role;
grant execute on function integration.drs_workspace_grant_issue_locked_v2(
  uuid, uuid, text
) to service_role;

create or replace function integration.drs_workspace_grant_assert_current_locked_v1(
  p_authenticated_user_id uuid,
  p_expected_case_id uuid,
  p_authorization_subject text,
  p_grant_id uuid,
  p_grant_version bigint
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_now timestamptz := clock_timestamp();
  v_authority jsonb;
  v_binding_id uuid;
  v_specialist_id uuid;
  v_assignment_id uuid;
  v_drs_case_id uuid;
  v_casework_case_id uuid;
  v_grant integration.drs_workspace_grants%rowtype;
begin
  if p_authenticated_user_id is null
    or p_expected_case_id is null
    or p_authorization_subject is null
    or p_grant_id is null
    or p_grant_version is null
    or p_grant_version < 1
  then
    return jsonb_build_object(
      'authorized', false,
      'state', 'CASE_NOT_AUTHORIZED'
    );
  end if;

  v_authority := integration.drs_identity_authority_resolve_locked_v1(
    p_authenticated_user_id,
    p_expected_case_id,
    p_authorization_subject
  );

  v_now := clock_timestamp();

  select *
  into v_grant
  from integration.drs_workspace_grants g
  where g.grant_id = p_grant_id
    and g.grant_version = p_grant_version
  for update;

  if not found then
    return jsonb_build_object(
      'authorized', false,
      'state', 'CASE_NOT_AUTHORIZED'
    );
  end if;

  if v_grant.invalidated_at is not null then
    return jsonb_build_object(
      'authorized', false,
      'state', 'CASE_NOT_AUTHORIZED'
    );
  end if;

  if v_authority -> 'authorized' is distinct from 'true'::jsonb
    or v_grant.expires_at <= v_now
  then
    update integration.drs_workspace_grants
    set
      invalidated_at = coalesce(invalidated_at, v_now),
      invalidation_reason = coalesce(
        invalidation_reason,
        'CURRENT_AUTHORITY_DENIED'
      )
    where grant_id = v_grant.grant_id
      and invalidated_at is null;
    return jsonb_build_object(
      'authorized', false,
      'state', 'CASE_NOT_AUTHORIZED'
    );
  end if;

  v_specialist_id := (v_authority ->> 'specialist_id')::uuid;
  v_assignment_id := (v_authority ->> 'assignment_id')::uuid;
  v_casework_case_id := (v_authority ->> 'selected_case_id')::uuid;

  select b.binding_id, a.case_id, m.casework_case_id
  into v_binding_id, v_drs_case_id, v_casework_case_id
  from integration.drs_auth_specialist_bindings b
  join public.drs_specialists s
    on s.specialist_id = b.specialist_id
  join public.drs_case_specialist_assignments a
    on a.assignment_id = b.selected_assignment_id
    and a.specialist_id = b.specialist_id
  join integration.drs_case_identity_bindings m
    on m.drs_case_id = a.case_id
  join public.drs_cases d
    on d.case_id = a.case_id
  join casework.cases c
    on c.id = m.casework_case_id
  where b.authenticated_user_id = p_authenticated_user_id
    and b.specialist_id = v_specialist_id
    and b.selected_assignment_id = v_assignment_id
    and b.authorization_subject = p_authorization_subject
    and b.binding_status = 'active'
    and b.revoked_at is null
    and b.valid_from <= v_now
    and b.valid_until > v_now
    and s.authority_state = 'ACTIVE'
    and a.valid_from <= v_now
    and (a.valid_until is null or a.valid_until > v_now)
    and not exists (
      select 1
      from public.drs_case_specialist_assignment_terminations t
      where t.assignment_id = a.assignment_id
        and t.terminated_at <= v_now
    )
    and m.casework_case_id = p_expected_case_id
    and m.mapping_status = 'active'
    and m.revoked_at is null
    and m.valid_from <= v_now
    and m.valid_until > v_now
    and d.case_state in ('ACTIVE_REVIEW', 'ACTIVE_CONSTRUCTION')
    and c.case_status = 'active'
  for update of b, s, a, m, d, c;

  if not found
    or v_grant.binding_id <> v_binding_id
    or v_grant.authenticated_user_id <> p_authenticated_user_id
    or v_grant.specialist_id <> v_specialist_id
    or v_grant.assignment_id <> v_assignment_id
    or v_grant.drs_case_id <> v_drs_case_id
    or v_grant.casework_case_id <> v_casework_case_id
    or v_grant.casework_case_id <> p_expected_case_id
    or v_grant.authorization_subject <> p_authorization_subject
    or v_grant.expires_at > (v_authority ->> 'valid_until')::timestamptz
  then
    update integration.drs_workspace_grants
    set
      invalidated_at = coalesce(invalidated_at, v_now),
      invalidation_reason = coalesce(
        invalidation_reason,
        'CURRENT_AUTHORITY_FACTS_CHANGED'
      )
    where grant_id = v_grant.grant_id
      and invalidated_at is null;
    return jsonb_build_object(
      'authorized', false,
      'state', 'CASE_NOT_AUTHORIZED'
    );
  end if;

  return jsonb_build_object(
    'authorized', true,
    'state', 'AUTHORIZED_DRS_VERSIONED_WORKSPACE',
    'authenticated_user_id', v_grant.authenticated_user_id::text,
    'case_id', v_grant.casework_case_id::text,
    'authorization_subject', v_grant.authorization_subject
  );
exception
  when others then
    return jsonb_build_object(
      'authorized', false,
      'state', 'CONTEXT_UNAVAILABLE'
    );
end;
$$;

alter function integration.drs_workspace_grant_assert_current_locked_v1(
  uuid, uuid, text, uuid, bigint
) owner to postgres;

revoke all on function integration.drs_workspace_grant_assert_current_locked_v1(
  uuid, uuid, text, uuid, bigint
) from public, anon, authenticated, service_role;

create or replace function public.drs_workspace_grant_v2(
  p_authenticated_user_id uuid,
  p_expected_case_id uuid,
  p_authorization_subject text
)
returns jsonb
language sql
security invoker
set search_path = ''
as $$
  select integration.drs_workspace_grant_issue_locked_v2(
    p_authenticated_user_id,
    p_expected_case_id,
    p_authorization_subject
  );
$$;

alter function public.drs_workspace_grant_v2(
  uuid, uuid, text
) owner to postgres;

revoke all on function public.drs_workspace_grant_v2(
  uuid, uuid, text
) from public, anon, authenticated, service_role;
grant execute on function public.drs_workspace_grant_v2(
  uuid, uuid, text
) to service_role;

create or replace function integration.drs_workspace_grant_invalidate_from_authority_change_v1()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_old jsonb := case
    when tg_op = 'INSERT' then '{}'::jsonb
    else to_jsonb(old)
  end;
  v_new jsonb := case
    when tg_op = 'DELETE' then '{}'::jsonb
    else to_jsonb(new)
  end;
begin
  update integration.drs_workspace_grants g
  set
    invalidated_at = coalesce(invalidated_at, clock_timestamp()),
    invalidation_reason = coalesce(
      invalidation_reason,
      'AUTHORITY_SOURCE_CHANGED'
    )
  where g.invalidated_at is null
    and (
      (
        tg_table_schema = 'integration'
        and tg_table_name = 'drs_auth_specialist_bindings'
        and g.binding_id::text in (
          coalesce(v_old ->> 'binding_id', ''),
          coalesce(v_new ->> 'binding_id', '')
        )
      )
      or (
        tg_table_schema = 'integration'
        and tg_table_name = 'drs_case_identity_bindings'
        and (
          g.drs_case_id::text in (
            coalesce(v_old ->> 'drs_case_id', ''),
            coalesce(v_new ->> 'drs_case_id', '')
          )
          or g.casework_case_id::text in (
            coalesce(v_old ->> 'casework_case_id', ''),
            coalesce(v_new ->> 'casework_case_id', '')
          )
        )
      )
      or (
        tg_table_schema = 'public'
        and tg_table_name = 'drs_specialists'
        and g.specialist_id::text in (
          coalesce(v_old ->> 'specialist_id', ''),
          coalesce(v_new ->> 'specialist_id', '')
        )
      )
      or (
        tg_table_schema = 'public'
        and tg_table_name = 'drs_case_specialist_assignments'
        and g.assignment_id::text in (
          coalesce(v_old ->> 'assignment_id', ''),
          coalesce(v_new ->> 'assignment_id', '')
        )
      )
      or (
        tg_table_schema = 'public'
        and tg_table_name = 'drs_case_specialist_assignment_terminations'
        and g.assignment_id::text in (
          coalesce(v_old ->> 'assignment_id', ''),
          coalesce(v_new ->> 'assignment_id', '')
        )
      )
      or (
        tg_table_schema = 'public'
        and tg_table_name = 'drs_cases'
        and g.drs_case_id::text in (
          coalesce(v_old ->> 'case_id', ''),
          coalesce(v_new ->> 'case_id', '')
        )
      )
      or (
        tg_table_schema = 'casework'
        and tg_table_name = 'cases'
        and g.casework_case_id::text in (
          coalesce(v_old ->> 'id', ''),
          coalesce(v_new ->> 'id', '')
        )
      )
    );

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

alter function integration.drs_workspace_grant_invalidate_from_authority_change_v1()
  owner to postgres;

revoke all on function integration.drs_workspace_grant_invalidate_from_authority_change_v1()
  from public, anon, authenticated, service_role;

create trigger drs_workspace_grants_invalidate_binding_change
  after insert or update or delete
  on integration.drs_auth_specialist_bindings
  for each row execute function
    integration.drs_workspace_grant_invalidate_from_authority_change_v1();

create trigger drs_workspace_grants_invalidate_mapping_change
  after insert or update or delete
  on integration.drs_case_identity_bindings
  for each row execute function
    integration.drs_workspace_grant_invalidate_from_authority_change_v1();

create trigger drs_workspace_grants_invalidate_specialist_change
  after insert or update or delete
  on public.drs_specialists
  for each row execute function
    integration.drs_workspace_grant_invalidate_from_authority_change_v1();

create trigger drs_workspace_grants_invalidate_assignment_change
  after insert or update or delete
  on public.drs_case_specialist_assignments
  for each row execute function
    integration.drs_workspace_grant_invalidate_from_authority_change_v1();

create trigger drs_workspace_grants_invalidate_termination_change
  after insert or update or delete
  on public.drs_case_specialist_assignment_terminations
  for each row execute function
    integration.drs_workspace_grant_invalidate_from_authority_change_v1();

create trigger drs_workspace_grants_invalidate_drs_case_change
  after insert or update or delete
  on public.drs_cases
  for each row execute function
    integration.drs_workspace_grant_invalidate_from_authority_change_v1();

create trigger drs_workspace_grants_invalidate_casework_case_change
  after insert or update or delete
  on casework.cases
  for each row execute function
    integration.drs_workspace_grant_invalidate_from_authority_change_v1();

comment on table integration.drs_workspace_grants is
  'Private, short-lived DRS capability state. The database owns its monotonic bigint version; callers cannot supply or reset it.';
comment on function public.drs_workspace_grant_v2(uuid, uuid, text) is
  'Service-only issuer for a private versioned DRS workspace capability. Browser-facing v1 projections remain unchanged.';
comment on function integration.drs_workspace_grant_assert_current_locked_v1(
  uuid, uuid, text, uuid, bigint
) is
  'Postgres-private assertion seam for future server document operations. It rechecks current DRS authority and all persisted grant facts.';

commit;
