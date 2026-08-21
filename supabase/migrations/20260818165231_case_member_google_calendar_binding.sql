begin;

create schema if not exists integration;
create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;

do $$
begin
  if to_regclass('auth.users') is null
    or to_regclass('casework.cases') is null
    or to_regclass('casework.case_members') is null
    or not exists (
      select 1
      from information_schema.columns
      where table_schema = 'casework'
        and table_name = 'case_members'
        and column_name = 'membership_status'
    )
  then
    raise exception 'CASE_MEMBER_GOOGLE_CALENDAR_PREREQUISITE_MISSING';
  end if;
end;
$$;

create table integration.google_calendar_oauth_states (
  id uuid primary key default extensions.gen_random_uuid(),
  state_digest text not null unique
    check (length(state_digest) between 40 and 128)
    check (state_digest !~ '[[:space:][:cntrl:]]'),
  user_id uuid not null references auth.users(id) on delete cascade,
  case_id uuid not null references casework.cases(id) on delete cascade,
  account_role text not null check (account_role in ('owner', 'pro')),
  pkce_verifier_ciphertext text not null
    check (length(pkce_verifier_ciphertext) between 16 and 8192),
  redirect_uri text not null
    check (redirect_uri ~ '^https://'),
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default clock_timestamp(),
  check (expires_at > created_at),
  unique (id, user_id, case_id, account_role)
);

create table integration.google_calendar_credentials (
  id uuid primary key default extensions.gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  google_subject text not null
    check (length(google_subject) between 1 and 255)
    check (google_subject !~ '[[:space:][:cntrl:]]'),
  encrypted_access_token text not null
    check (length(encrypted_access_token) between 16 and 32768),
  encrypted_refresh_token text
    check (encrypted_refresh_token is null or length(encrypted_refresh_token) between 16 and 32768),
  token_expires_at timestamptz not null,
  granted_scopes text[] not null default '{}'::text[],
  credential_status text not null default 'active'
    check (credential_status in ('active', 'revoked', 'reconnect_required')),
  created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp(),
  unique (user_id, google_subject),
  unique (id, user_id, google_subject)
);

create table integration.case_member_google_calendar_bindings (
  id uuid primary key default extensions.gen_random_uuid(),
  user_id uuid not null,
  case_id uuid not null,
  account_role text not null check (account_role in ('owner', 'pro')),
  credential_id uuid not null,
  google_subject text not null,
  calendar_id text not null
    check (length(calendar_id) between 1 and 1024)
    check (calendar_id !~ '[[:space:][:cntrl:]]'),
  time_zone text not null default 'Asia/Taipei'
    check (time_zone = 'Asia/Taipei'),
  binding_status text not null default 'active'
    check (binding_status in ('active', 'revoked')),
  bound_at timestamptz not null default clock_timestamp(),
  revoked_at timestamptz,
  updated_at timestamptz not null default clock_timestamp(),
  foreign key (case_id, user_id)
    references casework.case_members(case_id, user_id) on delete cascade,
  foreign key (credential_id, user_id, google_subject)
    references integration.google_calendar_credentials(id, user_id, google_subject)
    on delete restrict,
  unique (user_id, case_id, account_role),
  check (
    (binding_status = 'active' and revoked_at is null)
    or (binding_status = 'revoked' and revoked_at is not null)
  )
);

create index google_calendar_oauth_states_active_idx
  on integration.google_calendar_oauth_states(state_digest, expires_at)
  where consumed_at is null;

create index case_member_google_calendar_bindings_case_idx
  on integration.case_member_google_calendar_bindings(case_id, user_id, account_role)
  where binding_status = 'active';

alter table integration.google_calendar_oauth_states enable row level security;
alter table integration.google_calendar_oauth_states force row level security;
alter table integration.google_calendar_credentials enable row level security;
alter table integration.google_calendar_credentials force row level security;
alter table integration.case_member_google_calendar_bindings enable row level security;
alter table integration.case_member_google_calendar_bindings force row level security;

revoke all on table integration.google_calendar_oauth_states from public, anon, authenticated;
revoke all on table integration.google_calendar_credentials from public, anon, authenticated;
revoke all on table integration.case_member_google_calendar_bindings from public, anon, authenticated;

create or replace function public.case_member_google_calendar_authorize_v1(
  p_user_id uuid,
  p_case_id uuid,
  p_account_role text
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_role text;
  v_membership_status text;
begin
  if p_account_role not in ('owner', 'pro') then
    return jsonb_build_object('authorized', false, 'state', 'CASE_NOT_AUTHORIZED');
  end if;

  select m.role::text, m.membership_status::text
    into v_role, v_membership_status
  from casework.case_members m
  join casework.cases c
    on c.id = m.case_id
   and c.case_status = 'active'
  join auth.users u
    on u.id = m.user_id
   and u.deleted_at is null
   and (u.banned_until is null or u.banned_until <= clock_timestamp())
  where m.case_id = p_case_id
    and m.user_id = p_user_id
    and m.role::text = p_account_role
    and m.membership_status::text = 'active';

  if not found then
    return jsonb_build_object('authorized', false, 'state', 'CASE_NOT_AUTHORIZED');
  end if;

  return jsonb_build_object(
    'authorized', true,
    'user_id', p_user_id,
    'case_id', p_case_id,
    'account_role', v_role,
    'membership_status', v_membership_status
  );
end;
$$;

create or replace function public.case_member_google_calendar_begin_oauth_v1(
  p_user_id uuid,
  p_case_id uuid,
  p_account_role text,
  p_state_digest text,
  p_pkce_verifier_ciphertext text,
  p_redirect_uri text,
  p_expires_at timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_authorization jsonb;
  v_id uuid;
begin
  v_authorization := public.case_member_google_calendar_authorize_v1(
    p_user_id,
    p_case_id,
    p_account_role
  );
  if coalesce((v_authorization ->> 'authorized')::boolean, false) is not true then
    return jsonb_build_object('ok', false, 'state', 'CASE_NOT_AUTHORIZED');
  end if;
  if p_expires_at <= clock_timestamp() or p_expires_at > clock_timestamp() + interval '15 minutes' then
    return jsonb_build_object('ok', false, 'state', 'CONTEXT_UNAVAILABLE');
  end if;

  insert into integration.google_calendar_oauth_states (
    state_digest,
    user_id,
    case_id,
    account_role,
    pkce_verifier_ciphertext,
    redirect_uri,
    expires_at
  ) values (
    p_state_digest,
    p_user_id,
    p_case_id,
    p_account_role,
    p_pkce_verifier_ciphertext,
    p_redirect_uri,
    p_expires_at
  )
  returning id into v_id;

  return jsonb_build_object('ok', true, 'oauth_state_id', v_id);
exception
  when unique_violation then
    return jsonb_build_object('ok', false, 'state', 'CONTEXT_UNAVAILABLE');
end;
$$;

create or replace function public.case_member_google_calendar_get_oauth_state_v1(
  p_state_digest text
)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select to_jsonb(s)
  from (
    select
      state_digest,
      user_id as authenticated_user_id,
      case_id,
      account_role,
      pkce_verifier_ciphertext as sealed_verifier,
      redirect_uri,
      expires_at,
      consumed_at
    from integration.google_calendar_oauth_states
    where state_digest = p_state_digest
  ) s;
$$;

create or replace function public.case_member_google_calendar_commit_callback_v1(
  p_state_digest text,
  p_user_id uuid,
  p_account_role text,
  p_google_subject text,
  p_encrypted_access_token text,
  p_encrypted_refresh_token text,
  p_token_expires_at timestamptz,
  p_granted_scopes text[],
  p_calendar_id text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_state integration.google_calendar_oauth_states%rowtype;
  v_authorization jsonb;
  v_credential_id uuid;
  v_now timestamptz := clock_timestamp();
begin
  select * into v_state
  from integration.google_calendar_oauth_states
  where state_digest = p_state_digest
  for update;

  if not found
    or v_state.consumed_at is not null
    or v_state.expires_at <= v_now
    or v_state.user_id <> p_user_id
    or v_state.account_role <> p_account_role
  then
    return jsonb_build_object('ok', false, 'state', 'IDENTITY_MISMATCH');
  end if;

  v_authorization := public.case_member_google_calendar_authorize_v1(
    p_user_id,
    v_state.case_id,
    p_account_role
  );
  if coalesce((v_authorization ->> 'authorized')::boolean, false) is not true then
    return jsonb_build_object('ok', false, 'state', 'MEMBERSHIP_INACTIVE');
  end if;

  insert into integration.google_calendar_credentials (
    user_id,
    google_subject,
    encrypted_access_token,
    encrypted_refresh_token,
    token_expires_at,
    granted_scopes,
    credential_status
  ) values (
    p_user_id,
    p_google_subject,
    p_encrypted_access_token,
    p_encrypted_refresh_token,
    p_token_expires_at,
    coalesce(p_granted_scopes, '{}'::text[]),
    'active'
  )
  on conflict (user_id, google_subject) do update
  set encrypted_access_token = excluded.encrypted_access_token,
      encrypted_refresh_token = coalesce(
        excluded.encrypted_refresh_token,
        integration.google_calendar_credentials.encrypted_refresh_token
      ),
      token_expires_at = excluded.token_expires_at,
      granted_scopes = excluded.granted_scopes,
      credential_status = 'active',
      updated_at = v_now
  returning id into v_credential_id;

  insert into integration.case_member_google_calendar_bindings (
    user_id,
    case_id,
    account_role,
    credential_id,
    google_subject,
    calendar_id,
    time_zone,
    binding_status
  ) values (
    p_user_id,
    v_state.case_id,
    p_account_role,
    v_credential_id,
    p_google_subject,
    p_calendar_id,
    'Asia/Taipei',
    'active'
  )
  on conflict (user_id, case_id, account_role) do update
  set credential_id = excluded.credential_id,
      google_subject = excluded.google_subject,
      calendar_id = excluded.calendar_id,
      time_zone = 'Asia/Taipei',
      binding_status = 'active',
      revoked_at = null,
      updated_at = v_now;

  update integration.google_calendar_oauth_states
  set consumed_at = v_now
  where id = v_state.id;

  return jsonb_build_object(
    'ok', true,
    'state', 'CONNECTED',
    'user_id', p_user_id,
    'case_id', v_state.case_id,
    'account_role', p_account_role
  );
end;
$$;

create or replace function public.case_member_google_calendar_grant_v1(
  p_user_id uuid,
  p_case_id uuid,
  p_account_role text
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_authorization jsonb;
  v_binding record;
  v_schema_version text;
begin
  v_authorization := public.case_member_google_calendar_authorize_v1(
    p_user_id,
    p_case_id,
    p_account_role
  );
  if coalesce((v_authorization ->> 'authorized')::boolean, false) is not true then
    return jsonb_build_object('ok', false, 'state', 'CASE_NOT_AUTHORIZED');
  end if;

  select
    b.calendar_id,
    b.time_zone,
    b.binding_status,
    c.credential_status
  into v_binding
  from integration.case_member_google_calendar_bindings b
  join integration.google_calendar_credentials c
    on c.id = b.credential_id
   and c.user_id = b.user_id
   and c.google_subject = b.google_subject
  where b.user_id = p_user_id
    and b.case_id = p_case_id
    and b.account_role = p_account_role;

  if not found then
    return jsonb_build_object('ok', false, 'state', 'GOOGLE_CALENDAR_NOT_CONNECTED');
  end if;
  if v_binding.binding_status = 'revoked' then
    return jsonb_build_object('ok', false, 'state', 'GOOGLE_CALENDAR_BINDING_REVOKED');
  end if;
  if v_binding.credential_status <> 'active' then
    return jsonb_build_object('ok', false, 'state', 'GOOGLE_CALENDAR_RECONNECT_REQUIRED');
  end if;

  v_schema_version := case p_account_role
    when 'owner' then 'laibe.owner-calendar-embed.v1'
    else 'laibe.vendor-calendar-embed.v1'
  end;

  return jsonb_build_object(
    'ok', true,
    'grant', jsonb_build_object(
      'schemaVersion', v_schema_version,
      'authenticatedUserId', p_user_id,
      'currentCaseId', p_case_id,
      'membership', jsonb_build_object(
        'userId', p_user_id,
        'caseId', p_case_id,
        'role', p_account_role,
        'status', 'active'
      ),
      'calendarBinding', jsonb_build_object(
        'userId', p_user_id,
        'caseId', p_case_id,
        'accountRole', p_account_role,
        'connectionStatus', 'connected',
        'bindingStatus', 'active',
        'calendarId', v_binding.calendar_id,
        'timeZone', v_binding.time_zone
      )
    )
  );
end;
$$;

create or replace function public.case_member_google_calendar_revoke_v1(
  p_user_id uuid,
  p_case_id uuid,
  p_account_role text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_now timestamptz := clock_timestamp();
begin
  update integration.case_member_google_calendar_bindings
  set binding_status = 'revoked',
      revoked_at = v_now,
      updated_at = v_now
  where user_id = p_user_id
    and case_id = p_case_id
    and account_role = p_account_role
    and binding_status = 'active';
  return jsonb_build_object('ok', found, 'state', case when found then 'REVOKED' else 'GOOGLE_CALENDAR_NOT_CONNECTED' end);
end;
$$;

revoke all on function public.case_member_google_calendar_authorize_v1(uuid, uuid, text) from public, anon, authenticated;
revoke all on function public.case_member_google_calendar_begin_oauth_v1(uuid, uuid, text, text, text, text, timestamptz) from public, anon, authenticated;
revoke all on function public.case_member_google_calendar_get_oauth_state_v1(text) from public, anon, authenticated;
revoke all on function public.case_member_google_calendar_commit_callback_v1(text, uuid, text, text, text, text, timestamptz, text[], text) from public, anon, authenticated;
revoke all on function public.case_member_google_calendar_grant_v1(uuid, uuid, text) from public, anon, authenticated;
revoke all on function public.case_member_google_calendar_revoke_v1(uuid, uuid, text) from public, anon, authenticated;

grant execute on function public.case_member_google_calendar_authorize_v1(uuid, uuid, text) to service_role;
grant execute on function public.case_member_google_calendar_begin_oauth_v1(uuid, uuid, text, text, text, text, timestamptz) to service_role;
grant execute on function public.case_member_google_calendar_get_oauth_state_v1(text) to service_role;
grant execute on function public.case_member_google_calendar_commit_callback_v1(text, uuid, text, text, text, text, timestamptz, text[], text) to service_role;
grant execute on function public.case_member_google_calendar_grant_v1(uuid, uuid, text) to service_role;
grant execute on function public.case_member_google_calendar_revoke_v1(uuid, uuid, text) to service_role;

commit;
