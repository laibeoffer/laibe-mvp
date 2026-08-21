begin;

do $$
begin
  if to_regclass('auth.users') is null
    or to_regclass('casework.cases') is null
    or to_regclass('integration.google_calendar_oauth_states') is null
    or to_regclass('integration.google_calendar_credentials') is null
    or to_regclass('integration.case_member_google_calendar_bindings') is null
    or to_regprocedure('public.case_member_google_calendar_authorize_v1(uuid,uuid,text)') is null
  then
    raise exception 'GOOGLE_CALENDAR_DRS_ACCOUNT_PREREQUISITE_MISSING';
  end if;
end;
$$;

alter table integration.google_calendar_oauth_states
  add column authorization_subject text;

update integration.google_calendar_oauth_states
set authorization_subject = format(
  'case-member:%s:%s:%s',
  account_role,
  user_id,
  case_id
)
where authorization_subject is null
  and account_role in ('owner', 'pro');

alter table integration.google_calendar_oauth_states
  alter column authorization_subject set not null,
  add constraint google_calendar_oauth_states_authorization_subject_check
    check (
      length(authorization_subject) between 1 and 512
      and authorization_subject !~ '[[:space:][:cntrl:]]'
    ),
  drop constraint if exists google_calendar_oauth_states_account_role_check,
  add constraint google_calendar_oauth_states_account_role_check
    check (account_role in ('owner', 'pro', 'drs'));

create table integration.drs_google_calendar_bindings (
  id uuid primary key default extensions.gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  case_id uuid not null references casework.cases(id) on delete cascade,
  account_role text not null check (account_role = 'drs'),
  authorization_subject text not null
    check (length(authorization_subject) between 1 and 512)
    check (authorization_subject !~ '[[:space:][:cntrl:]]'),
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
  foreign key (credential_id, user_id, google_subject)
    references integration.google_calendar_credentials(id, user_id, google_subject)
    on delete restrict,
  unique (user_id, case_id, account_role),
  check (
    (binding_status = 'active' and revoked_at is null)
    or (binding_status = 'revoked' and revoked_at is not null)
  )
);

create index drs_google_calendar_bindings_case_idx
  on integration.drs_google_calendar_bindings(
    case_id,
    user_id,
    authorization_subject
  )
  where binding_status = 'active';

alter table integration.drs_google_calendar_bindings enable row level security;
alter table integration.drs_google_calendar_bindings force row level security;
revoke all on table integration.drs_google_calendar_bindings
  from public, anon, authenticated;

create or replace function public.google_calendar_account_begin_oauth_v2(
  p_user_id uuid,
  p_case_id uuid,
  p_account_role text,
  p_authorization_subject text,
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
  if p_account_role not in ('owner', 'pro', 'drs')
    or p_authorization_subject is null
    or length(p_authorization_subject) not between 1 and 512
    or p_authorization_subject ~ '[[:space:][:cntrl:]]'
    or p_redirect_uri !~ '^https://'
  then
    return jsonb_build_object('ok', false, 'state', 'CASE_NOT_AUTHORIZED');
  end if;

  if p_account_role in ('owner', 'pro') then
    if p_authorization_subject <> format(
      'case-member:%s:%s:%s',
      p_account_role,
      p_user_id,
      p_case_id
    ) then
      return jsonb_build_object('ok', false, 'state', 'IDENTITY_MISMATCH');
    end if;
    v_authorization := public.case_member_google_calendar_authorize_v1(
      p_user_id,
      p_case_id,
      p_account_role
    );
    if coalesce((v_authorization ->> 'authorized')::boolean, false) is not true then
      return jsonb_build_object('ok', false, 'state', 'CASE_NOT_AUTHORIZED');
    end if;
  else
    perform 1
    from auth.users u
    join casework.cases c
      on c.id = p_case_id
     and c.case_status = 'active'
    where u.id = p_user_id
      and u.deleted_at is null
      and (u.banned_until is null or u.banned_until <= clock_timestamp());
    if not found then
      return jsonb_build_object('ok', false, 'state', 'CASE_NOT_AUTHORIZED');
    end if;
  end if;

  if p_expires_at <= clock_timestamp()
    or p_expires_at > clock_timestamp() + interval '15 minutes'
  then
    return jsonb_build_object('ok', false, 'state', 'CONTEXT_UNAVAILABLE');
  end if;

  insert into integration.google_calendar_oauth_states (
    state_digest,
    user_id,
    case_id,
    account_role,
    authorization_subject,
    pkce_verifier_ciphertext,
    redirect_uri,
    expires_at
  ) values (
    p_state_digest,
    p_user_id,
    p_case_id,
    p_account_role,
    p_authorization_subject,
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

create or replace function public.google_calendar_account_get_oauth_state_v2(
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
      authorization_subject,
      pkce_verifier_ciphertext as sealed_verifier,
      redirect_uri,
      expires_at,
      consumed_at
    from integration.google_calendar_oauth_states
    where state_digest = p_state_digest
  ) s;
$$;

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
  return jsonb_build_object(
    'authorized', false,
    'state', 'DRS_AUTHORIZATION_HOOK_UNAVAILABLE'
  );
end;
$$;

comment on function integration.google_calendar_drs_authorize_transaction_v1(
  uuid, uuid, text, text
) is
  'Private fail-closed DRS Google Calendar callback authorization contract. A successor DRS Core migration must replace this stub with a resolver that uses FOR UPDATE or an equivalent serialization contract across the auth-user-to-specialist binding, ACTIVE specialist authority, selected-case assignment, and any authority termination or revocation changes. The resolver must return authenticated_user_id, selected_case_id, account_role, authorization_subject, auth_binding_status, specialist_status, assignment_status, and lock_status with exact active/locked facts.';

revoke all on function integration.google_calendar_drs_authorize_transaction_v1(
  uuid, uuid, text, text
) from public, anon, authenticated, service_role;

create or replace function public.google_calendar_account_commit_callback_v2(
  p_state_digest text,
  p_user_id uuid,
  p_account_role text,
  p_authorization_subject text,
  p_redirect_uri text,
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
    or v_state.user_id is distinct from p_user_id
    or v_state.account_role is distinct from p_account_role
    or v_state.authorization_subject is distinct from p_authorization_subject
    or v_state.redirect_uri is distinct from p_redirect_uri
  then
    return jsonb_build_object('ok', false, 'state', 'IDENTITY_MISMATCH');
  end if;

  if v_state.account_role in ('owner', 'pro') then
    v_authorization := public.case_member_google_calendar_authorize_v1(
      v_state.user_id,
      v_state.case_id,
      v_state.account_role
    );
    if coalesce((v_authorization ->> 'authorized')::boolean, false) is not true then
      return jsonb_build_object('ok', false, 'state', 'MEMBERSHIP_INACTIVE');
    end if;
  elsif v_state.account_role = 'drs' then
    begin
      if to_regprocedure('integration.google_calendar_drs_authorize_transaction_v1(uuid,uuid,text,text)') is null then
        return jsonb_build_object('ok', false, 'state', 'CASE_NOT_AUTHORIZED');
      end if;

      v_authorization := integration.google_calendar_drs_authorize_transaction_v1(
        v_state.user_id,
        v_state.case_id,
        v_state.account_role,
        v_state.authorization_subject
      );

      if v_authorization -> 'authorized' is distinct from 'true'::jsonb
        or v_authorization -> 'authenticated_user_id' is distinct from to_jsonb(v_state.user_id::text)
        or v_authorization -> 'selected_case_id' is distinct from to_jsonb(v_state.case_id::text)
        or v_authorization -> 'account_role' is distinct from to_jsonb(v_state.account_role)
        or v_authorization -> 'authorization_subject' is distinct from to_jsonb(v_state.authorization_subject)
        or v_authorization -> 'auth_binding_status' is distinct from to_jsonb('active'::text)
        or v_authorization -> 'specialist_status' is distinct from to_jsonb('active'::text)
        or v_authorization -> 'assignment_status' is distinct from to_jsonb('active'::text)
        or v_authorization -> 'lock_status' is distinct from to_jsonb('locked'::text)
      then
        return jsonb_build_object('ok', false, 'state', 'CASE_NOT_AUTHORIZED');
      end if;
    exception
      when others then
        return jsonb_build_object('ok', false, 'state', 'CASE_NOT_AUTHORIZED');
    end;
  else
    return jsonb_build_object('ok', false, 'state', 'CASE_NOT_AUTHORIZED');
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
    v_state.user_id,
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

  if v_state.account_role in ('owner', 'pro') then
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
      v_state.user_id,
      v_state.case_id,
      v_state.account_role,
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
  else
    insert into integration.drs_google_calendar_bindings (
      user_id,
      case_id,
      account_role,
      authorization_subject,
      credential_id,
      google_subject,
      calendar_id,
      time_zone,
      binding_status
    ) values (
      v_state.user_id,
      v_state.case_id,
      v_state.account_role,
      v_state.authorization_subject,
      v_credential_id,
      p_google_subject,
      p_calendar_id,
      'Asia/Taipei',
      'active'
    )
    on conflict (user_id, case_id, account_role) do update
    set authorization_subject = excluded.authorization_subject,
        credential_id = excluded.credential_id,
        google_subject = excluded.google_subject,
        calendar_id = excluded.calendar_id,
        time_zone = 'Asia/Taipei',
        binding_status = 'active',
        revoked_at = null,
        updated_at = v_now;
  end if;

  update integration.google_calendar_oauth_states
  set consumed_at = v_now
  where id = v_state.id;

  return jsonb_build_object('ok', true, 'state', 'CONNECTED');
end;
$$;

revoke all on function public.google_calendar_account_begin_oauth_v2(
  uuid, uuid, text, text, text, text, text, timestamptz
) from public, anon, authenticated;
revoke all on function public.google_calendar_account_get_oauth_state_v2(text)
  from public, anon, authenticated;
revoke all on function public.google_calendar_account_commit_callback_v2(
  text, uuid, text, text, text, text, text, text, timestamptz, text[], text
) from public, anon, authenticated;

grant execute on function public.google_calendar_account_begin_oauth_v2(
  uuid, uuid, text, text, text, text, text, timestamptz
) to service_role;
grant execute on function public.google_calendar_account_get_oauth_state_v2(text)
  to service_role;
grant execute on function public.google_calendar_account_commit_callback_v2(
  text, uuid, text, text, text, text, text, text, timestamptz, text[], text
) to service_role;

commit;
