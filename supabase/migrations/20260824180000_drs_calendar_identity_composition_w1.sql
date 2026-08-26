begin;

do $$
begin
  if to_regprocedure(
    'integration.drs_identity_authority_resolve_locked_v1(uuid,uuid,text)'
  ) is null
    or to_regprocedure(
      'integration.drs_specialist_calendar_authority_v1(uuid,uuid,text,uuid,boolean)'
    ) is null
    or to_regprocedure(
      'public.drs_google_calendar_authorize_v1(uuid,uuid,text,uuid)'
    ) is null
  then
    raise exception 'DRS_CALENDAR_IDENTITY_COMPOSITION_PREREQUISITE_MISSING';
  end if;
end;
$$;

create or replace function integration.drs_specialist_calendar_authority_v1(
  p_authenticated_user_id uuid,
  p_expected_case_id uuid default null,
  p_expected_authorization_subject text default null,
  p_expected_assignment_id uuid default null,
  p_lock_required boolean default true
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_authority jsonb;
  v_now timestamptz := clock_timestamp();
begin
  if p_lock_required is distinct from true then
    return jsonb_build_object(
      'authorized', false,
      'state', 'CASE_NOT_AUTHORIZED'
    );
  end if;

  if p_authenticated_user_id is null then
    return jsonb_build_object(
      'authorized', false,
      'state', 'CASE_NOT_AUTHORIZED'
    );
  end if;

  begin
    v_authority := integration.drs_identity_authority_resolve_locked_v1(
      p_authenticated_user_id,
      p_expected_case_id,
      p_expected_authorization_subject
    );
  exception
    when others then
      return jsonb_build_object(
        'authorized', false,
        'state', 'CASE_NOT_AUTHORIZED'
      );
  end;

  if v_authority -> 'authorized' is distinct from 'true'::jsonb
    or v_authority ->> 'authenticated_user_id'
      is distinct from p_authenticated_user_id::text
    or nullif(v_authority ->> 'specialist_id', '') is null
    or (v_authority ->> 'specialist_id') !~*
      '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    or nullif(v_authority ->> 'assignment_id', '') is null
    or (v_authority ->> 'assignment_id') !~*
      '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    or nullif(v_authority ->> 'selected_case_id', '') is null
    or (v_authority ->> 'selected_case_id') !~*
      '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    or v_authority ->> 'account_role' is distinct from 'drs'
    or v_authority ->> 'authorization_subject' is distinct from
      'drs-specialist:' || (v_authority ->> 'specialist_id')
    or v_authority ->> 'auth_binding_status' is distinct from 'active'
    or v_authority ->> 'specialist_status' is distinct from 'active'
    or v_authority ->> 'assignment_status' is distinct from 'active'
    or v_authority ->> 'lock_status' is distinct from 'locked'
    or nullif(v_authority ->> 'valid_from', '') is null
    or nullif(v_authority ->> 'valid_until', '') is null
    or not isfinite((v_authority ->> 'valid_from')::timestamptz)
    or not isfinite((v_authority ->> 'valid_until')::timestamptz)
    or (v_authority ->> 'valid_from')::timestamptz > v_now
    or (v_authority ->> 'valid_until')::timestamptz <= v_now
    or v_authority -> 'terminated_at' is distinct from 'null'::jsonb
    or (
      p_expected_case_id is not null
      and v_authority ->> 'selected_case_id'
        is distinct from p_expected_case_id::text
    )
    or (
      p_expected_assignment_id is not null
      and v_authority ->> 'assignment_id'
        is distinct from p_expected_assignment_id::text
    )
    or (
      p_expected_authorization_subject is not null
      and v_authority ->> 'authorization_subject'
        is distinct from p_expected_authorization_subject
    )
  then
    return jsonb_build_object(
      'authorized', false,
      'state', 'CASE_NOT_AUTHORIZED'
    );
  end if;

  return v_authority;
exception
  when others then
    return jsonb_build_object(
      'authorized', false,
      'state', 'CASE_NOT_AUTHORIZED'
    );
end;
$$;

alter function integration.drs_specialist_calendar_authority_v1(
  uuid, uuid, text, uuid, boolean
) owner to postgres;

alter function public.drs_google_calendar_authorize_v1(
  uuid, uuid, text, uuid
) owner to postgres;

comment on function integration.drs_specialist_calendar_authority_v1(
  uuid, uuid, text, uuid, boolean
) is
  'Private Calendar-to-Identity composition bridge. It accepts only locked, current, exact DRS authority facts from the server-owned Identity resolver and exposes no direct role grant.';

revoke all on function integration.drs_specialist_calendar_authority_v1(
  uuid, uuid, text, uuid, boolean
) from public, anon, authenticated, service_role;

commit;
