begin;

create or replace function casework.account_workspace_grant_resolve_v1(
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
  v_delegate jsonb;
  v_lifecycle_column_count integer := 0;
begin
  if p_authenticated_user_id is null or p_expected_role not in ('owner', 'pro') then
    return jsonb_build_object('authorized', false, 'state', 'CASE_NOT_AUTHORIZED');
  end if;

  if pg_catalog.to_regprocedure(
    'casework.case_member_workspace_grant_resolve_locked_v1(uuid,text)'
  ) is not null then
    execute 'select casework.case_member_workspace_grant_resolve_locked_v1($1, $2)'
      into v_delegate
      using p_authenticated_user_id, p_expected_role;
    return coalesce(
      v_delegate,
      jsonb_build_object('authorized', false, 'state', 'CONTEXT_UNAVAILABLE')
    );
  end if;

  select count(*)
    into v_lifecycle_column_count
  from information_schema.columns
  where table_schema = 'casework'
    and table_name = 'case_members'
    and column_name in (
      'membership_id',
      'membership_status',
      'valid_from',
      'valid_until',
      'revoked_at',
      'authority_version'
    );

  if v_lifecycle_column_count not in (0, 6) then
    return jsonb_build_object('authorized', false, 'state', 'CONTEXT_UNAVAILABLE');
  end if;

  for v_candidate in
    select
      m.user_id,
      m.case_id,
      m.role::text as account_role,
      c.title as case_title,
      to_jsonb(m) as membership_row
    from casework.case_members m
    join casework.cases c
      on c.id = m.case_id
     and c.case_status = 'active'
    join auth.users u
      on u.id = m.user_id
     and u.deleted_at is null
     and (u.banned_until is null or u.banned_until <= v_now)
    where m.user_id = p_authenticated_user_id
      and m.role::text = p_expected_role
      and coalesce(to_jsonb(m)->>'membership_status', 'active') = 'active'
      and nullif(to_jsonb(m)->>'revoked_at', '') is null
      and coalesce(
        nullif(to_jsonb(m)->>'valid_from', '')::timestamptz,
        '-infinity'::timestamptz
      ) <= v_now
      and (
        nullif(to_jsonb(m)->>'valid_until', '') is null
        or nullif(to_jsonb(m)->>'valid_until', '')::timestamptz > v_now
      )
    order by m.case_id, m.user_id
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
    'case_title', v_candidate.case_title,
    'account_role', v_candidate.account_role,
    'grant_id', coalesce(
      nullif(v_candidate.membership_row->>'membership_id', '')::uuid,
      v_candidate.user_id
    ),
    'grant_version', coalesce(
      nullif(v_candidate.membership_row->>'authority_version', '')::bigint,
      1
    ),
    'grant_expires_at', least(
      coalesce(
        nullif(v_candidate.membership_row->>'valid_until', '')::timestamptz,
        v_now + interval '15 minutes'
      ),
      v_now + interval '15 minutes'
    )
  );
exception
  when others then
    return jsonb_build_object('authorized', false, 'state', 'CONTEXT_UNAVAILABLE');
end;
$$;

alter function casework.account_workspace_grant_resolve_v1(uuid, text)
  owner to postgres;
revoke all on function casework.account_workspace_grant_resolve_v1(uuid, text)
  from public, anon, authenticated, service_role;
grant execute on function casework.account_workspace_grant_resolve_v1(uuid, text)
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
  select casework.account_workspace_grant_resolve_v1(
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
  select casework.account_workspace_grant_resolve_v1(
    p_authenticated_user_id,
    'pro'
  );
$$;

alter function public.vendor_workspace_grant_v1(uuid) owner to postgres;
revoke all on function public.vendor_workspace_grant_v1(uuid) from public, anon, authenticated, service_role;
grant execute on function public.vendor_workspace_grant_v1(uuid) to service_role;

commit;
