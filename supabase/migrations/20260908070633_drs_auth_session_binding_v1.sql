-- Core forward-only Auth binding. Old provider RPCs and old session rows are unchanged.
begin;

create table drs_forward_private.auth_bound_sessions (
  server_session_id uuid primary key references drs_forward_private.server_sessions(server_session_id) on delete restrict,
  authenticated_user_id uuid not null,
  auth_session_id uuid not null,
  auth_token_digest text not null check (auth_token_digest ~ '^[A-Za-z0-9_-]{43}$'),
  auth_expires_at timestamptz not null,
  auth_binding_id uuid not null,
  auth_binding_version bigint not null,
  specialist_version bigint not null,
  mapping_version bigint not null,
  logout_completed_at timestamptz
);
-- Keep proof after provider logout removes auth.sessions. No FK or backfill to auth.sessions.
alter table drs_forward_private.auth_bound_sessions enable row level security;
alter table drs_forward_private.auth_bound_sessions force row level security;
revoke all on drs_forward_private.auth_bound_sessions from public, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION drs_forward_private.drs_password_authority_resolve_locked_v1(p_authenticated_user_id uuid, p_expected_case_id uuid, p_authorization_subject text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_now timestamptz := clock_timestamp();
  v_authority record;
  v_count integer;
begin
  if current_setting('role', true) is distinct from 'service_role' then
    raise insufficient_privilege;
  end if;
  if p_authenticated_user_id is null then
    return jsonb_build_object('authorized', false, 'state', 'AUTH_REQUIRED');
  end if;

  if not exists (
    select 1 from drs_forward_private.auth_specialist_bindings binding
    join drs_forward_private.specialists specialist using (specialist_id)
    where binding.authenticated_user_id = p_authenticated_user_id
      and binding.binding_status = 'active' and binding.revoked_at is null
      and binding.valid_from <= v_now and binding.valid_until > v_now
      and specialist.specialist_status = 'active'
  ) then
    return jsonb_build_object('authorized', false, 'state', 'REVIEWER_APPROVAL_REQUIRED');
  end if;

  select count(*) into v_count
  from drs_forward_private.reviewer_case_authorities authority_record
  join drs_forward_private.auth_specialist_bindings auth_binding
    on auth_binding.authenticated_user_id = authority_record.user_id
   and auth_binding.specialist_id = authority_record.specialist_id
   and auth_binding.binding_status = 'active'
   and auth_binding.revoked_at is null
   and auth_binding.valid_from <= v_now
   and auth_binding.valid_until > v_now
  join drs_forward_private.specialists specialist_record
    on specialist_record.specialist_id = authority_record.specialist_id
   and specialist_record.specialist_status = 'active'
  join drs_forward_private.case_mappings mapping_record
    on mapping_record.case_mapping_id = authority_record.case_mapping_id
   and mapping_record.legacy_case_id = authority_record.legacy_case_id
   and mapping_record.mapping_status = 'active'
   and mapping_record.revoked_at is null
   and mapping_record.valid_from <= v_now
   and mapping_record.valid_until > v_now
  join casework.cases legacy_case
    on legacy_case.id = authority_record.legacy_case_id
   and legacy_case.case_status = 'active'
  join casework.case_members membership_record
    on membership_record.case_id = authority_record.legacy_case_id
   and membership_record.user_id = authority_record.granted_by
  where authority_record.user_id = p_authenticated_user_id
    and authority_record.authority_status = 'active'
    and authority_record.revoked_at is null
    and authority_record.valid_from <= v_now
    and authority_record.valid_until > v_now
    and (p_expected_case_id is null or authority_record.legacy_case_id = p_expected_case_id)
    and (
      p_authorization_subject is null
      or p_authorization_subject = 'drs-specialist:' || authority_record.specialist_id::text
    );

  if v_count = 0 then
    return jsonb_build_object('authorized', false, 'state', 'CASE_NOT_AUTHORIZED');
  end if;
  if v_count > 1 then
    return jsonb_build_object('authorized', false, 'state', 'CASE_SELECTION_REQUIRED');
  end if;

  select
    authority_record.authority_id,
    authority_record.user_id,
    authority_record.specialist_id,
    authority_record.legacy_case_id,
    authority_record.valid_from,
    authority_record.valid_until,
    auth_binding.valid_from as binding_valid_from,
    auth_binding.valid_until as binding_valid_until,
    mapping_record.valid_from as mapping_valid_from,
    mapping_record.valid_until as mapping_valid_until
  into strict v_authority
  from drs_forward_private.reviewer_case_authorities authority_record
  join drs_forward_private.auth_specialist_bindings auth_binding
    on auth_binding.authenticated_user_id = authority_record.user_id
   and auth_binding.specialist_id = authority_record.specialist_id
   and auth_binding.binding_status = 'active'
   and auth_binding.revoked_at is null
   and auth_binding.valid_from <= v_now
   and auth_binding.valid_until > v_now
  join drs_forward_private.specialists specialist_record
    on specialist_record.specialist_id = authority_record.specialist_id
   and specialist_record.specialist_status = 'active'
  join drs_forward_private.case_mappings mapping_record
    on mapping_record.case_mapping_id = authority_record.case_mapping_id
   and mapping_record.legacy_case_id = authority_record.legacy_case_id
   and mapping_record.mapping_status = 'active'
   and mapping_record.revoked_at is null
   and mapping_record.valid_from <= v_now
   and mapping_record.valid_until > v_now
  join casework.cases legacy_case
    on legacy_case.id = authority_record.legacy_case_id
   and legacy_case.case_status = 'active'
  join casework.case_members membership_record
    on membership_record.case_id = authority_record.legacy_case_id
   and membership_record.user_id = authority_record.granted_by
  where authority_record.user_id = p_authenticated_user_id
    and authority_record.authority_status = 'active'
    and authority_record.revoked_at is null
    and authority_record.valid_from <= v_now
    and authority_record.valid_until > v_now
    and (p_expected_case_id is null or authority_record.legacy_case_id = p_expected_case_id)
    and (
      p_authorization_subject is null
      or p_authorization_subject = 'drs-specialist:' || authority_record.specialist_id::text
    )
  for update of authority_record, auth_binding, specialist_record, mapping_record, legacy_case, membership_record;

  v_now := clock_timestamp();
  if v_authority.valid_from > v_now or v_authority.valid_until <= v_now
    or v_authority.binding_valid_from > v_now or v_authority.binding_valid_until <= v_now
    or v_authority.mapping_valid_from > v_now or v_authority.mapping_valid_until <= v_now
  then return jsonb_build_object('authorized', false, 'state', 'CASE_NOT_AUTHORIZED'); end if;

  return jsonb_build_object(
    'authorized', true,
    'authenticated_user_id', v_authority.user_id::text,
    'specialist_id', v_authority.specialist_id::text,
    'assignment_id', v_authority.authority_id::text,
    'selected_case_id', v_authority.legacy_case_id::text,
    'account_role', 'drs',
    'authorization_subject', 'drs-specialist:' || v_authority.specialist_id::text,
    'auth_binding_status', 'active',
    'specialist_status', 'active',
    'assignment_status', 'active',
    'valid_from', v_authority.valid_from,
    'valid_until', v_authority.valid_until,
    'terminated_at', null,
    'lock_status', 'locked'
  );
exception
  when insufficient_privilege then raise;
  when others then
    return jsonb_build_object('authorized', false, 'state', 'CONTEXT_UNAVAILABLE');
end;
$function$;


create function drs_forward_private.drs_auth_session_lock_v1(p_user uuid, p_session uuid)
returns boolean language plpgsql security definer set search_path = '' as $$
declare v_not_after timestamptz;
begin
  if current_setting('role', true) is distinct from 'service_role' then raise insufficient_privilege; end if;
  select not_after into v_not_after from auth.sessions
    where id = p_session and user_id = p_user for share;
  return found and (v_not_after is null or v_not_after > clock_timestamp());
end;
$$;

create function public.drs_password_session_authority_v1(p_authenticated_user_id uuid, p_auth_session_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
begin
  if current_setting('role', true) is distinct from 'service_role' then raise insufficient_privilege; end if;
  if not drs_forward_private.drs_auth_session_lock_v1(p_authenticated_user_id, p_auth_session_id) then
    return jsonb_build_object('authorized', false, 'state', 'AUTH_REQUIRED');
  end if;
  return drs_forward_private.drs_password_authority_resolve_locked_v1(p_authenticated_user_id, null, null);
end;
$$;

create function public.drs_auth_bound_server_session_issue_v1(
  p_server_session_id uuid, p_access_token_digest text, p_authenticated_user_id uuid,
  p_auth_session_id uuid, p_auth_token_digest text, p_specialist_id uuid,
  p_authorization_subject text, p_issued_at timestamptz, p_expires_at timestamptz, p_auth_expires_at timestamptz
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_now timestamptz := clock_timestamp();
  v_authority jsonb;
  v_row drs_forward_private.reviewer_case_authorities%rowtype;
  v_binding drs_forward_private.auth_specialist_bindings%rowtype;
  v_specialist_version bigint;
  v_mapping_version bigint;
begin
  if current_setting('role', true) is distinct from 'service_role' then raise insufficient_privilege; end if;
  if p_server_session_id is null or p_access_token_digest is null or p_access_token_digest !~ '^[A-Za-z0-9_-]{43}$'
    or p_auth_token_digest is null or p_auth_token_digest !~ '^[A-Za-z0-9_-]{43}$'
    or p_authenticated_user_id is null or p_auth_session_id is null or p_specialist_id is null
    or p_authorization_subject is distinct from 'drs-specialist:' || p_specialist_id::text
    or p_issued_at is null or p_expires_at is null or p_auth_expires_at is null
    or p_issued_at < v_now - interval '1 minute' or p_issued_at > v_now + interval '1 minute'
    or p_expires_at <= v_now or p_expires_at <= p_issued_at
    or p_expires_at > p_issued_at + interval '15 minutes' or p_expires_at > v_now + interval '15 minutes'
    or p_expires_at > p_auth_expires_at
    or not drs_forward_private.drs_auth_session_lock_v1(p_authenticated_user_id, p_auth_session_id)
  then return jsonb_build_object('authorized', false, 'state', 'AUTH_REQUIRED'); end if;
  v_authority := drs_forward_private.drs_password_authority_resolve_locked_v1(p_authenticated_user_id, null, p_authorization_subject);
  if v_authority->'authorized' is distinct from 'true'::jsonb then return v_authority; end if;
  if v_authority->>'specialist_id' is distinct from p_specialist_id::text then
    return jsonb_build_object('authorized', false, 'state', 'IDENTITY_MISMATCH');
  end if;
  select * into strict v_row from drs_forward_private.reviewer_case_authorities
    where authority_id = (v_authority->>'assignment_id')::uuid for update;
  select * into strict v_binding from drs_forward_private.auth_specialist_bindings
    where authenticated_user_id = p_authenticated_user_id and specialist_id = p_specialist_id
      and binding_status = 'active' and revoked_at is null
      and valid_from <= v_now and valid_until > v_now for share;
  select specialist_version into strict v_specialist_version from drs_forward_private.specialists
    where specialist_id = p_specialist_id;
  select mapping_version into strict v_mapping_version from drs_forward_private.case_mappings
    where case_mapping_id = v_row.case_mapping_id;

  if p_expires_at <= clock_timestamp() or
    not drs_forward_private.drs_auth_session_lock_v1(p_authenticated_user_id, p_auth_session_id)
  then return jsonb_build_object('authorized', false, 'state', 'AUTH_REQUIRED'); end if;

  insert into drs_forward_private.server_sessions(
    server_session_id, access_token_digest, authority_id, authority_version, authenticated_user_id,
    specialist_id, legacy_case_id, case_mapping_id, authorization_subject, issued_at, expires_at
  ) values (
    p_server_session_id, p_access_token_digest, v_row.authority_id, v_row.authority_version,
    p_authenticated_user_id, p_specialist_id, v_row.legacy_case_id, v_row.case_mapping_id,
    p_authorization_subject, p_issued_at, p_expires_at
  );
  insert into drs_forward_private.auth_bound_sessions values (
    p_server_session_id, p_authenticated_user_id, p_auth_session_id, p_auth_token_digest,
    p_auth_expires_at, v_binding.auth_binding_id, v_binding.binding_version,
    v_specialist_version, v_mapping_version, null
  );
  return jsonb_build_object('server_session_id', p_server_session_id::text, 'expires_at', p_expires_at);
exception
  when insufficient_privilege then raise;
  when unique_violation then return jsonb_build_object('authorized', false, 'state', 'AUTH_REQUIRED');
  when others then return jsonb_build_object('authorized', false, 'state', 'CONTEXT_UNAVAILABLE');
end;
$$;

create function public.drs_auth_bound_server_session_verify_v1(
  p_server_session_id uuid, p_access_token_digest text, p_authenticated_user_id uuid,
  p_auth_session_id uuid, p_auth_token_digest text
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_now timestamptz := clock_timestamp();
  v_session drs_forward_private.server_sessions%rowtype;
  v_binding drs_forward_private.auth_bound_sessions%rowtype;
  v_authority jsonb;
begin
  if current_setting('role', true) is distinct from 'service_role' then raise insufficient_privilege; end if;
  select * into v_session from drs_forward_private.server_sessions
    where server_session_id = p_server_session_id and access_token_digest = p_access_token_digest for update;
  if not found or v_session.revoked_at is not null or v_session.expires_at <= v_now then
    return jsonb_build_object('authorized', false, 'state', 'AUTH_REQUIRED');
  end if;
  select * into v_binding from drs_forward_private.auth_bound_sessions
    where server_session_id = p_server_session_id and authenticated_user_id = p_authenticated_user_id
      and auth_session_id = p_auth_session_id and auth_token_digest = p_auth_token_digest for update;
  if not found or v_session.authenticated_user_id is distinct from p_authenticated_user_id
    or v_binding.auth_expires_at <= v_now or v_session.expires_at > v_binding.auth_expires_at
    or not drs_forward_private.drs_auth_session_lock_v1(p_authenticated_user_id, p_auth_session_id)
  then return jsonb_build_object('authorized', false, 'state', 'AUTH_REQUIRED'); end if;

  v_authority := drs_forward_private.drs_password_authority_resolve_locked_v1(
    v_session.authenticated_user_id, v_session.legacy_case_id, v_session.authorization_subject
  );
  if v_authority->'authorized' is distinct from 'true'::jsonb then return v_authority; end if;
  if v_authority->>'assignment_id' is distinct from v_session.authority_id::text
    or not exists (
      select 1 from drs_forward_private.reviewer_case_authorities authority_record
      join drs_forward_private.auth_specialist_bindings auth_binding
        on auth_binding.auth_binding_id = v_binding.auth_binding_id
       and auth_binding.authenticated_user_id = v_session.authenticated_user_id
       and auth_binding.specialist_id = v_session.specialist_id
      join drs_forward_private.specialists specialist on specialist.specialist_id = v_session.specialist_id
      join drs_forward_private.case_mappings mapping on mapping.case_mapping_id = v_session.case_mapping_id
      where authority_record.authority_id = v_session.authority_id
        and authority_record.authority_version = v_session.authority_version
        and authority_record.case_mapping_id = v_session.case_mapping_id
        and auth_binding.binding_version = v_binding.auth_binding_version
        and specialist.specialist_version = v_binding.specialist_version
        and mapping.mapping_version = v_binding.mapping_version
    )
  then return jsonb_build_object('authorized', false, 'state', 'CASE_NOT_AUTHORIZED'); end if;
  v_now := clock_timestamp();
  if v_session.expires_at <= v_now or v_binding.auth_expires_at <= v_now or
    not drs_forward_private.drs_auth_session_lock_v1(p_authenticated_user_id, p_auth_session_id)
  then return jsonb_build_object('authorized', false, 'state', 'AUTH_REQUIRED'); end if;
  update drs_forward_private.server_sessions set verification_count = verification_count + 1, last_verified_at = v_now
    where server_session_id = p_server_session_id;
  return jsonb_build_object(
    'authenticated_user_id', v_session.authenticated_user_id::text, 'auth_session_id', v_binding.auth_session_id::text,
    'specialist_id', v_session.specialist_id::text, 'authorization_subject', v_session.authorization_subject,
    'expires_at', v_session.expires_at, 'selected_case_id', v_session.legacy_case_id::text,
    'case_status', 'active', 'access_mode', 'read_only'
  );
exception
  when insufficient_privilege then raise;
  when others then return jsonb_build_object('authorized', false, 'state', 'CONTEXT_UNAVAILABLE');
end;
$$;

create function public.drs_auth_bound_session_logout_v1(
  p_server_session_id uuid, p_access_token_digest text, p_authenticated_user_id uuid,
  p_auth_session_id uuid, p_auth_token_digest text, p_complete boolean
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_session drs_forward_private.server_sessions%rowtype;
  v_binding drs_forward_private.auth_bound_sessions%rowtype;
  v_active boolean;
begin
  if current_setting('role', true) is distinct from 'service_role' then raise insufficient_privilege; end if;
  select * into v_session from drs_forward_private.server_sessions
    where server_session_id = p_server_session_id and access_token_digest = p_access_token_digest
      and authenticated_user_id = p_authenticated_user_id for update;
  if not found then return jsonb_build_object('authorized', false, 'state', 'AUTH_REQUIRED'); end if;
  select * into v_binding from drs_forward_private.auth_bound_sessions
    where server_session_id = p_server_session_id and authenticated_user_id = p_authenticated_user_id
      and auth_session_id = p_auth_session_id and auth_token_digest = p_auth_token_digest for update;
  if not found or p_complete is null then
    return jsonb_build_object('authorized', false, 'state', 'AUTH_REQUIRED');
  end if;
  -- Proof of this exact opaque session survives expiry, lost case authority, and prior logout.
  update drs_forward_private.server_sessions
    set revoked_at = coalesce(revoked_at, clock_timestamp()), revoke_reason = coalesce(revoke_reason, 'EXPLICIT_REVOKE')
    where server_session_id = p_server_session_id;
  v_active := drs_forward_private.drs_auth_session_lock_v1(p_authenticated_user_id, p_auth_session_id);
  if p_complete and not v_active then
    update drs_forward_private.auth_bound_sessions
      set logout_completed_at = coalesce(logout_completed_at, clock_timestamp())
      where server_session_id = p_server_session_id
      returning * into v_binding;
  end if;
  return jsonb_build_object('revoked', true, 'completed', v_binding.logout_completed_at is not null, 'auth_session_active', v_active);
exception
  when insufficient_privilege then raise;
  when others then return jsonb_build_object('authorized', false, 'state', 'CONTEXT_UNAVAILABLE');
end;
$$;

revoke all on function drs_forward_private.drs_password_authority_resolve_locked_v1(uuid,uuid,text) from public, anon, authenticated, service_role;
revoke all on function drs_forward_private.drs_auth_session_lock_v1(uuid,uuid) from public, anon, authenticated, service_role;
revoke all on function public.drs_password_session_authority_v1(uuid,uuid) from public, anon, authenticated, service_role;
grant execute on function public.drs_password_session_authority_v1(uuid,uuid) to service_role;
revoke all on function public.drs_auth_bound_server_session_issue_v1(uuid,text,uuid,uuid,text,uuid,text,timestamptz,timestamptz,timestamptz) from public, anon, authenticated, service_role;
grant execute on function public.drs_auth_bound_server_session_issue_v1(uuid,text,uuid,uuid,text,uuid,text,timestamptz,timestamptz,timestamptz) to service_role;
revoke all on function public.drs_auth_bound_server_session_verify_v1(uuid,text,uuid,uuid,text) from public, anon, authenticated, service_role;
grant execute on function public.drs_auth_bound_server_session_verify_v1(uuid,text,uuid,uuid,text) to service_role;
revoke all on function public.drs_auth_bound_session_logout_v1(uuid,text,uuid,uuid,text,boolean) from public, anon, authenticated, service_role;
grant execute on function public.drs_auth_bound_session_logout_v1(uuid,text,uuid,uuid,text,boolean) to service_role;
commit;
