create table integration.drs_server_sessions (
  server_session_id uuid primary key,
  access_token_digest text not null
    check (access_token_digest ~ '^[A-Za-z0-9_-]{43}$'),
  authenticated_user_id uuid not null references auth.users(id) on delete restrict,
  specialist_id uuid not null references public.drs_specialists(specialist_id) on delete restrict,
  authorization_subject text not null,
  issued_at timestamptz not null,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  check (authorization_subject = 'drs-specialist:' || specialist_id::text),
  check (expires_at > issued_at),
  check (expires_at <= issued_at + interval '15 minutes'),
  check (revoked_at is null or revoked_at >= issued_at)
);

alter table integration.drs_server_sessions owner to postgres;
alter table integration.drs_server_sessions enable row level security;
alter table integration.drs_server_sessions force row level security;

revoke all on table integration.drs_server_sessions from public, anon, authenticated, service_role;

create index drs_server_sessions_authenticated_user_active_idx
  on integration.drs_server_sessions (authenticated_user_id, expires_at)
  where revoked_at is null;

create index drs_server_sessions_specialist_active_idx
  on integration.drs_server_sessions (specialist_id, expires_at)
  where revoked_at is null;

create index drs_server_sessions_active_expiry_idx
  on integration.drs_server_sessions (expires_at)
  where revoked_at is null;

create or replace function public.drs_server_session_issue_v1(
  p_server_session_id uuid,
  p_access_token_digest text,
  p_authenticated_user_id uuid,
  p_specialist_id uuid,
  p_authorization_subject text,
  p_issued_at timestamptz,
  p_expires_at timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_now timestamptz;
  v_authority jsonb;
  v_inserted integer := 0;
begin
  if p_server_session_id is null
    or p_access_token_digest is null
    or p_access_token_digest !~ '^[A-Za-z0-9_-]{43}$'
    or p_authenticated_user_id is null
    or p_specialist_id is null
    or p_authorization_subject is null
    or p_authorization_subject <> 'drs-specialist:' || p_specialist_id::text
    or p_issued_at is null
    or p_expires_at is null
  then
    raise exception using
      errcode = 'P0001',
      message = 'DRS_SESSION_ISSUE_REJECTED';
  end if;

  v_authority := integration.drs_identity_authority_resolve_locked_v1(
    p_authenticated_user_id,
    null,
    p_authorization_subject
  );

  v_now := clock_timestamp();

  if p_issued_at < v_now - interval '1 minute'
    or p_issued_at > v_now + interval '1 minute'
    or p_expires_at <= v_now
    or p_expires_at <= p_issued_at
    or p_expires_at > p_issued_at + interval '15 minutes'
    or p_expires_at > v_now + interval '15 minutes'
    or jsonb_typeof(v_authority) is distinct from 'object'
    or not (
      v_authority ?& array[
        'authorized',
        'authenticated_user_id',
        'specialist_id',
        'assignment_id',
        'selected_case_id',
        'account_role',
        'authorization_subject',
        'auth_binding_status',
        'specialist_status',
        'assignment_status',
        'valid_from',
        'valid_until',
        'terminated_at',
        'lock_status'
      ]
      and v_authority - array[
        'authorized',
        'authenticated_user_id',
        'specialist_id',
        'assignment_id',
        'selected_case_id',
        'account_role',
        'authorization_subject',
        'auth_binding_status',
        'specialist_status',
        'assignment_status',
        'valid_from',
        'valid_until',
        'terminated_at',
        'lock_status'
      ] = '{}'::jsonb
    )
    or v_authority -> 'authorized' is distinct from 'true'::jsonb
    or v_authority ->> 'authenticated_user_id' is distinct from p_authenticated_user_id::text
    or v_authority ->> 'specialist_id' is distinct from p_specialist_id::text
    or v_authority ->> 'authorization_subject' is distinct from p_authorization_subject
    or v_authority ->> 'account_role' is distinct from 'drs'
    or v_authority ->> 'auth_binding_status' is distinct from 'active'
    or v_authority ->> 'specialist_status' is distinct from 'active'
    or v_authority ->> 'assignment_status' is distinct from 'active'
    or v_authority ->> 'lock_status' is distinct from 'locked'
    or v_authority -> 'terminated_at' is distinct from 'null'::jsonb
    or v_authority ->> 'assignment_id' is null
    or v_authority ->> 'selected_case_id' is null
    or v_authority ->> 'valid_from' is null
    or v_authority ->> 'valid_until' is null
    or (v_authority ->> 'valid_from')::timestamptz > v_now
    or (v_authority ->> 'valid_until')::timestamptz <= v_now
  then
    raise exception using
      errcode = 'P0001',
      message = 'DRS_SESSION_ISSUE_REJECTED';
  end if;

  insert into integration.drs_server_sessions (
    server_session_id,
    access_token_digest,
    authenticated_user_id,
    specialist_id,
    authorization_subject,
    issued_at,
    expires_at,
    revoked_at
  ) values (
    p_server_session_id,
    p_access_token_digest,
    p_authenticated_user_id,
    p_specialist_id,
    p_authorization_subject,
    p_issued_at,
    p_expires_at,
    null
  )
  on conflict (server_session_id) do nothing;

  get diagnostics v_inserted = row_count;
  if v_inserted <> 1 then
    raise exception using
      errcode = 'P0001',
      message = 'DRS_SESSION_ISSUE_REJECTED';
  end if;

  return jsonb_build_object(
    'server_session_id', p_server_session_id::text,
    'expires_at', to_char(
      p_expires_at at time zone 'UTC',
      'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'
    )
  );
exception
  when others then
    raise exception using
      errcode = 'P0001',
      message = 'DRS_SESSION_ISSUE_REJECTED';
end;
$$;

alter function public.drs_server_session_issue_v1(uuid,text,uuid,uuid,text,timestamptz,timestamptz) owner to postgres;
revoke all on function public.drs_server_session_issue_v1(uuid,text,uuid,uuid,text,timestamptz,timestamptz) from public, anon, authenticated, service_role;
grant execute on function public.drs_server_session_issue_v1(uuid,text,uuid,uuid,text,timestamptz,timestamptz) to service_role;

create or replace function public.drs_server_session_verify_v1(
  p_server_session_id uuid,
  p_access_token_digest text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_now timestamptz;
  v_authority jsonb;
  v_session record;
begin
  if p_server_session_id is null
    or p_access_token_digest is null
    or p_access_token_digest !~ '^[A-Za-z0-9_-]{43}$'
  then
    raise exception using
      errcode = 'P0001',
      message = 'DRS_SESSION_VERIFY_REJECTED';
  end if;

  select
    s.authenticated_user_id,
    s.specialist_id,
    s.authorization_subject,
    s.expires_at,
    s.revoked_at
  into strict v_session
  from integration.drs_server_sessions s
  where s.server_session_id = p_server_session_id
    and s.access_token_digest = p_access_token_digest
  for update;

  v_authority := integration.drs_identity_authority_resolve_locked_v1(
    v_session.authenticated_user_id,
    null,
    v_session.authorization_subject
  );

  v_now := clock_timestamp();

  if v_session.revoked_at is not null
    or v_session.expires_at <= v_now
    or jsonb_typeof(v_authority) is distinct from 'object'
    or not (
      v_authority ?& array[
        'authorized',
        'authenticated_user_id',
        'specialist_id',
        'assignment_id',
        'selected_case_id',
        'account_role',
        'authorization_subject',
        'auth_binding_status',
        'specialist_status',
        'assignment_status',
        'valid_from',
        'valid_until',
        'terminated_at',
        'lock_status'
      ]
      and v_authority - array[
        'authorized',
        'authenticated_user_id',
        'specialist_id',
        'assignment_id',
        'selected_case_id',
        'account_role',
        'authorization_subject',
        'auth_binding_status',
        'specialist_status',
        'assignment_status',
        'valid_from',
        'valid_until',
        'terminated_at',
        'lock_status'
      ] = '{}'::jsonb
    )
    or v_authority -> 'authorized' is distinct from 'true'::jsonb
    or v_authority ->> 'authenticated_user_id' is distinct from v_session.authenticated_user_id::text
    or v_authority ->> 'specialist_id' is distinct from v_session.specialist_id::text
    or v_authority ->> 'authorization_subject' is distinct from v_session.authorization_subject
    or v_authority ->> 'account_role' is distinct from 'drs'
    or v_authority ->> 'auth_binding_status' is distinct from 'active'
    or v_authority ->> 'specialist_status' is distinct from 'active'
    or v_authority ->> 'assignment_status' is distinct from 'active'
    or v_authority ->> 'lock_status' is distinct from 'locked'
    or v_authority -> 'terminated_at' is distinct from 'null'::jsonb
    or v_authority ->> 'assignment_id' is null
    or v_authority ->> 'selected_case_id' is null
    or v_authority ->> 'valid_from' is null
    or v_authority ->> 'valid_until' is null
    or (v_authority ->> 'valid_from')::timestamptz > v_now
    or (v_authority ->> 'valid_until')::timestamptz <= v_now
  then
    raise exception using
      errcode = 'P0001',
      message = 'DRS_SESSION_VERIFY_REJECTED';
  end if;

  return jsonb_build_object(
    'authenticated_user_id', v_session.authenticated_user_id::text,
    'specialist_id', v_session.specialist_id::text,
    'authorization_subject', v_session.authorization_subject,
    'expires_at', to_char(
      v_session.expires_at at time zone 'UTC',
      'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'
    )
  );
exception
  when others then
    raise exception using
      errcode = 'P0001',
      message = 'DRS_SESSION_VERIFY_REJECTED';
end;
$$;

alter function public.drs_server_session_verify_v1(uuid,text) owner to postgres;
revoke all on function public.drs_server_session_verify_v1(uuid,text) from public, anon, authenticated, service_role;
grant execute on function public.drs_server_session_verify_v1(uuid,text) to service_role;

create or replace function public.drs_server_session_revoke_v1(
  p_server_session_id uuid,
  p_access_token_digest text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_now timestamptz;
  v_session record;
  v_updated integer := 0;
begin
  if p_server_session_id is null
    or p_access_token_digest is null
    or p_access_token_digest !~ '^[A-Za-z0-9_-]{43}$'
  then
    return jsonb_build_object('revoked', false);
  end if;

  select
    s.expires_at,
    s.revoked_at
  into strict v_session
  from integration.drs_server_sessions s
  where s.server_session_id = p_server_session_id
    and s.access_token_digest = p_access_token_digest
  for update;

  v_now := clock_timestamp();

  if v_session.revoked_at is not null
    or v_session.expires_at <= v_now
  then
    return jsonb_build_object('revoked', false);
  end if;

  update integration.drs_server_sessions
  set revoked_at = v_now
  where server_session_id = p_server_session_id
    and access_token_digest = p_access_token_digest
    and revoked_at is null
    and expires_at > v_now;

  get diagnostics v_updated = row_count;
  if v_updated = 1 then
    return jsonb_build_object('revoked', true);
  end if;
  return jsonb_build_object('revoked', false);
exception
  when others then
    return jsonb_build_object('revoked', false);
end;
$$;

alter function public.drs_server_session_revoke_v1(uuid,text) owner to postgres;
revoke all on function public.drs_server_session_revoke_v1(uuid,text) from public, anon, authenticated, service_role;
grant execute on function public.drs_server_session_revoke_v1(uuid,text) to service_role;
