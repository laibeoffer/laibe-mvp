begin;

do $$
begin
  if to_regclass('integration.google_calendar_oauth_states') is null
    or to_regclass('integration.google_calendar_credentials') is null
    or to_regclass('integration.drs_google_calendar_bindings') is null
  then
    raise exception 'DRS_GOOGLE_CALENDAR_API_W1_PREREQUISITE_MISSING';
  end if;
end;
$$;

alter table integration.google_calendar_oauth_states
  add column assignment_id uuid,
  add column claimed_at timestamptz;

alter table integration.drs_google_calendar_bindings
  add column assignment_id uuid;

do $$
begin
  if exists (
    select 1
    from integration.google_calendar_oauth_states
    where account_role = 'drs'
      and assignment_id is null
  ) or exists (
    select 1
    from integration.drs_google_calendar_bindings
    where assignment_id is null
  ) then
    raise exception 'DRS_GOOGLE_CALENDAR_ASSIGNMENT_BACKFILL_REQUIRED';
  end if;
end;
$$;

alter table integration.google_calendar_oauth_states
  add constraint google_calendar_oauth_states_drs_assignment_check
  check (account_role <> 'drs' or assignment_id is not null);

alter table integration.drs_google_calendar_bindings
  alter column assignment_id set not null,
  drop constraint if exists drs_google_calendar_bindings_user_id_case_id_account_role_key,
  add constraint drs_google_calendar_bindings_assignment_key
    unique (user_id, case_id, account_role, assignment_id);

drop index if exists integration.drs_google_calendar_bindings_case_idx;
create index drs_google_calendar_bindings_assignment_active_idx
  on integration.drs_google_calendar_bindings(
    user_id,
    case_id,
    assignment_id,
    authorization_subject
  )
  where binding_status = 'active';

create index google_calendar_oauth_states_drs_claim_idx
  on integration.google_calendar_oauth_states(state_digest, expires_at)
  where account_role = 'drs'
    and claimed_at is null
    and consumed_at is null;

create table integration.drs_google_calendar_audit_events (
  id uuid primary key default extensions.gen_random_uuid(),
  event_key text not null
    check (length(event_key) between 1 and 512),
  authenticated_user_id uuid not null references auth.users(id) on delete restrict,
  specialist_id uuid not null,
  assignment_id uuid not null,
  case_id uuid not null references casework.cases(id) on delete restrict,
  authorization_subject text not null,
  event_type text not null
    check (event_type in ('calendar_connected', 'calendar_revoked')),
  occurred_at timestamptz not null default clock_timestamp(),
  unique (event_key)
);

create index drs_google_calendar_audit_assignment_idx
  on integration.drs_google_calendar_audit_events(
    assignment_id,
    case_id,
    occurred_at desc
  );

create index drs_google_calendar_audit_authenticated_user_idx
  on integration.drs_google_calendar_audit_events (authenticated_user_id);

create index drs_google_calendar_audit_case_idx
  on integration.drs_google_calendar_audit_events (case_id);

alter table integration.drs_google_calendar_audit_events enable row level security;
alter table integration.drs_google_calendar_audit_events force row level security;
revoke all on table integration.drs_google_calendar_audit_events
  from public, anon, authenticated, service_role;

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
begin
  -- The A14 LINE session -> specialist -> active assignment adapter is not yet
  -- delivered. This private port must be replaced by that server-owned resolver.
  -- It must never infer authority from email, LINE profile, user_metadata,
  -- client role, a raw case id, storage, or auth.uid() as specialist_id.
  return jsonb_build_object(
    'authorized', false,
    'state', 'DRS_AUTHORIZATION_ADAPTER_UNAVAILABLE'
  );
end;
$$;

comment on function integration.drs_specialist_calendar_authority_v1(
  uuid, uuid, text, uuid, boolean
) is
  'Private fail-closed A14 authority port. A successful replacement must atomically resolve authenticated_user_id to specialist_id, exact active assignment_id, server-selected case, active binding/specialist/assignment, valid_from/valid_until, terminated_at null, and lock_status locked when requested.';

revoke all on function integration.drs_specialist_calendar_authority_v1(
  uuid, uuid, text, uuid, boolean
) from public, anon, authenticated, service_role;

create or replace function public.drs_google_calendar_authorize_v1(
  p_authenticated_user_id uuid,
  p_expected_case_id uuid default null,
  p_expected_authorization_subject text default null,
  p_expected_assignment_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_authorization jsonb;
  v_now timestamptz := clock_timestamp();
begin
  if p_authenticated_user_id is null then
    return jsonb_build_object('authorized', false, 'state', 'CASE_NOT_AUTHORIZED');
  end if;

  begin
    v_authorization := integration.drs_specialist_calendar_authority_v1(
      p_authenticated_user_id,
      p_expected_case_id,
      p_expected_authorization_subject,
      p_expected_assignment_id,
      true
    );
  exception
    when others then
      return jsonb_build_object('authorized', false, 'state', 'CASE_NOT_AUTHORIZED');
  end;

  if v_authorization -> 'authorized' is distinct from 'true'::jsonb
    or v_authorization ->> 'authenticated_user_id' is distinct from p_authenticated_user_id::text
    or nullif(v_authorization ->> 'specialist_id', '') is null
    or nullif(v_authorization ->> 'assignment_id', '') is null
    or nullif(v_authorization ->> 'selected_case_id', '') is null
    or v_authorization ->> 'account_role' is distinct from 'drs'
    or nullif(v_authorization ->> 'authorization_subject', '') is null
    or v_authorization ->> 'auth_binding_status' is distinct from 'active'
    or v_authorization ->> 'specialist_status' is distinct from 'active'
    or v_authorization ->> 'assignment_status' is distinct from 'active'
    or v_authorization ->> 'lock_status' is distinct from 'locked'
    or nullif(v_authorization ->> 'valid_from', '') is null
    or nullif(v_authorization ->> 'valid_until', '') is null
    or (v_authorization ->> 'valid_from')::timestamptz > v_now
    or (v_authorization ->> 'valid_until')::timestamptz <= v_now
    or v_authorization -> 'terminated_at' is distinct from 'null'::jsonb
    or (
      p_expected_case_id is not null
      and v_authorization ->> 'selected_case_id' is distinct from p_expected_case_id::text
    )
    or (
      p_expected_assignment_id is not null
      and v_authorization ->> 'assignment_id' is distinct from p_expected_assignment_id::text
    )
    or (
      p_expected_authorization_subject is not null
      and v_authorization ->> 'authorization_subject'
        is distinct from p_expected_authorization_subject
    )
  then
    return jsonb_build_object('authorized', false, 'state', 'CASE_NOT_AUTHORIZED');
  end if;

  return v_authorization;
exception
  when others then
    return jsonb_build_object('authorized', false, 'state', 'CASE_NOT_AUTHORIZED');
end;
$$;

create or replace function public.drs_google_calendar_begin_oauth_v1(
  p_authenticated_user_id uuid,
  p_selected_case_id uuid,
  p_assignment_id uuid,
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
begin
  if p_account_role is distinct from 'drs'
    or p_redirect_uri !~ '^https://'
    or p_expires_at <= clock_timestamp()
    or p_expires_at > clock_timestamp() + interval '15 minutes'
  then
    return jsonb_build_object('ok', false, 'state', 'CASE_NOT_AUTHORIZED');
  end if;

  v_authorization := public.drs_google_calendar_authorize_v1(
    p_authenticated_user_id,
    p_selected_case_id,
    p_authorization_subject,
    p_assignment_id
  );
  if v_authorization -> 'authorized' is distinct from 'true'::jsonb then
    return jsonb_build_object('ok', false, 'state', 'CASE_NOT_AUTHORIZED');
  end if;

  insert into integration.google_calendar_oauth_states (
    state_digest,
    user_id,
    case_id,
    account_role,
    authorization_subject,
    assignment_id,
    pkce_verifier_ciphertext,
    redirect_uri,
    expires_at
  ) values (
    p_state_digest,
    p_authenticated_user_id,
    p_selected_case_id,
    'drs',
    p_authorization_subject,
    p_assignment_id,
    p_pkce_verifier_ciphertext,
    p_redirect_uri,
    p_expires_at
  );
  return jsonb_build_object('ok', true, 'state', 'PENDING');
exception
  when unique_violation then
    return jsonb_build_object('ok', false, 'state', 'CONTEXT_UNAVAILABLE');
  when others then
    return jsonb_build_object('ok', false, 'state', 'CONTEXT_UNAVAILABLE');
end;
$$;

create or replace function public.drs_google_calendar_get_oauth_state_v1(
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
      assignment_id,
      pkce_verifier_ciphertext as sealed_verifier,
      redirect_uri,
      expires_at,
      claimed_at,
      consumed_at
    from integration.google_calendar_oauth_states
    where state_digest = p_state_digest
      and account_role = 'drs'
  ) s;
$$;

create or replace function public.drs_google_calendar_claim_callback_v1(
  p_state_digest text,
  p_authenticated_user_id uuid,
  p_selected_case_id uuid,
  p_assignment_id uuid,
  p_account_role text,
  p_authorization_subject text,
  p_redirect_uri text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_state integration.google_calendar_oauth_states%rowtype;
  v_authorization jsonb;
  v_now timestamptz := clock_timestamp();
begin
  select * into v_state
  from integration.google_calendar_oauth_states
  where state_digest = p_state_digest
  for update;

  if not found
    or v_state.account_role is distinct from 'drs'
    or p_account_role is distinct from 'drs'
    or v_state.user_id is distinct from p_authenticated_user_id
    or v_state.case_id is distinct from p_selected_case_id
    or v_state.assignment_id is distinct from p_assignment_id
    or v_state.authorization_subject is distinct from p_authorization_subject
    or v_state.redirect_uri is distinct from p_redirect_uri
    or v_state.expires_at <= v_now
    or v_state.claimed_at is not null
    or v_state.consumed_at is not null
  then
    return jsonb_build_object('ok', false, 'state', 'OAUTH_STATE_ALREADY_USED');
  end if;

  v_authorization := public.drs_google_calendar_authorize_v1(
    v_state.user_id,
    v_state.case_id,
    v_state.authorization_subject,
    v_state.assignment_id
  );
  if v_authorization -> 'authorized' is distinct from 'true'::jsonb
    or v_authorization ->> 'lock_status' is distinct from 'locked'
  then
    return jsonb_build_object('ok', false, 'state', 'CASE_NOT_AUTHORIZED');
  end if;

  update integration.google_calendar_oauth_states
  set claimed_at = v_now
  where id = v_state.id
    and claimed_at is null
    and consumed_at is null;
  if not found then
    return jsonb_build_object('ok', false, 'state', 'OAUTH_STATE_ALREADY_USED');
  end if;

  return jsonb_build_object('ok', true, 'state', 'CLAIMED');
end;
$$;

create or replace function public.drs_google_calendar_commit_callback_v1(
  p_state_digest text,
  p_authenticated_user_id uuid,
  p_assignment_id uuid,
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
    or v_state.account_role is distinct from 'drs'
    or p_account_role is distinct from 'drs'
    or v_state.user_id is distinct from p_authenticated_user_id
    or v_state.assignment_id is distinct from p_assignment_id
    or v_state.authorization_subject is distinct from p_authorization_subject
    or v_state.redirect_uri is distinct from p_redirect_uri
    or v_state.expires_at <= v_now
    or v_state.claimed_at is null
    or v_state.consumed_at is not null
    or cardinality(coalesce(p_granted_scopes, '{}'::text[])) <> 2
    or (
      select count(*)
      from unnest(coalesce(p_granted_scopes, '{}'::text[])) as granted_scope
      where granted_scope = 'openid'
    ) <> 1
    or (
      select count(*)
      from unnest(coalesce(p_granted_scopes, '{}'::text[])) as granted_scope
      where granted_scope = 'https://www.googleapis.com/auth/calendar.readonly'
    ) <> 1
  then
    return jsonb_build_object('ok', false, 'state', 'IDENTITY_MISMATCH');
  end if;

  v_authorization := public.drs_google_calendar_authorize_v1(
    v_state.user_id,
    v_state.case_id,
    v_state.authorization_subject,
    v_state.assignment_id
  );
  if v_authorization -> 'authorized' is distinct from 'true'::jsonb
    or v_authorization ->> 'lock_status' is distinct from 'locked'
  then
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

  insert into integration.drs_google_calendar_bindings (
    user_id,
    case_id,
    account_role,
    authorization_subject,
    assignment_id,
    credential_id,
    google_subject,
    calendar_id,
    time_zone,
    binding_status,
    bound_at,
    revoked_at,
    updated_at
  ) values (
    v_state.user_id,
    v_state.case_id,
    'drs',
    v_state.authorization_subject,
    v_state.assignment_id,
    v_credential_id,
    p_google_subject,
    p_calendar_id,
    'Asia/Taipei',
    'active',
    v_now,
    null,
    v_now
  )
  on conflict (user_id, case_id, account_role, assignment_id) do update
  set authorization_subject = excluded.authorization_subject,
      credential_id = excluded.credential_id,
      google_subject = excluded.google_subject,
      calendar_id = excluded.calendar_id,
      time_zone = 'Asia/Taipei',
      binding_status = 'active',
      bound_at = v_now,
      revoked_at = null,
      updated_at = v_now;

  update integration.google_calendar_oauth_states
  set consumed_at = v_now
  where id = v_state.id
    and claimed_at is not null
    and consumed_at is null;
  if not found then
    return jsonb_build_object('ok', false, 'state', 'OAUTH_STATE_ALREADY_USED');
  end if;

  insert into integration.drs_google_calendar_audit_events (
    event_key,
    authenticated_user_id,
    specialist_id,
    assignment_id,
    case_id,
    authorization_subject,
    event_type,
    occurred_at
  ) values (
    'calendar:callback:' || p_state_digest,
    v_state.user_id,
    (v_authorization ->> 'specialist_id')::uuid,
    v_state.assignment_id,
    v_state.case_id,
    v_state.authorization_subject,
    'calendar_connected',
    v_now
  ) on conflict (event_key) do nothing;

  return jsonb_build_object('ok', true, 'state', 'CONNECTED');
end;
$$;

create or replace function public.drs_google_calendar_grant_v1(
  p_authenticated_user_id uuid,
  p_selected_case_id uuid,
  p_assignment_id uuid,
  p_authorization_subject text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_authorization jsonb;
  v_grant record;
begin
  v_authorization := public.drs_google_calendar_authorize_v1(
    p_authenticated_user_id,
    p_selected_case_id,
    p_authorization_subject,
    p_assignment_id
  );
  if v_authorization -> 'authorized' is distinct from 'true'::jsonb then
    return jsonb_build_object('ok', false, 'state', 'CASE_NOT_AUTHORIZED');
  end if;

  select
    b.user_id as binding_user_id,
    b.case_id as binding_case_id,
    b.assignment_id as binding_assignment_id,
    b.authorization_subject as binding_authorization_subject,
    b.binding_status,
    b.calendar_id,
    c.credential_status
  into v_grant
  from integration.drs_google_calendar_bindings b
  join integration.google_calendar_credentials c
    on c.id = b.credential_id
   and c.user_id = b.user_id
   and c.google_subject = b.google_subject
  where b.user_id = p_authenticated_user_id
    and b.case_id = p_selected_case_id
    and b.assignment_id = p_assignment_id
    and b.authorization_subject = p_authorization_subject;

  if not found then
    return jsonb_build_object('ok', false, 'state', 'GOOGLE_CALENDAR_NOT_CONNECTED');
  end if;
  if v_grant.binding_status <> 'active' then
    return jsonb_build_object('ok', false, 'state', 'GOOGLE_CALENDAR_BINDING_REVOKED');
  end if;
  if v_grant.credential_status <> 'active' then
    return jsonb_build_object('ok', false, 'state', 'GOOGLE_CALENDAR_RECONNECT_REQUIRED');
  end if;

  return jsonb_build_object(
    'ok', true,
    'state', 'CONNECTED',
    'grant', jsonb_build_object(
      'authenticatedUserId', v_grant.binding_user_id,
      'selectedCaseId', v_grant.binding_case_id,
      'assignmentId', v_grant.binding_assignment_id,
      'accountRole', 'drs',
      'authorizationSubject', v_grant.binding_authorization_subject,
      'connectionStatus', 'connected',
      'bindingStatus', 'active',
      'calendarId', v_grant.calendar_id,
      'timeZone', 'Asia/Taipei'
    )
  );
end;
$$;

create or replace function public.drs_google_calendar_revoke_v1(
  p_authenticated_user_id uuid,
  p_selected_case_id uuid,
  p_assignment_id uuid,
  p_authorization_subject text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_authorization jsonb;
  v_binding integration.drs_google_calendar_bindings%rowtype;
  v_now timestamptz := clock_timestamp();
begin
  v_authorization := public.drs_google_calendar_authorize_v1(
    p_authenticated_user_id,
    p_selected_case_id,
    p_authorization_subject,
    p_assignment_id
  );
  if v_authorization -> 'authorized' is distinct from 'true'::jsonb then
    return jsonb_build_object('ok', false, 'state', 'CASE_NOT_AUTHORIZED');
  end if;

  select * into v_binding
  from integration.drs_google_calendar_bindings
  where user_id = p_authenticated_user_id
    and case_id = p_selected_case_id
    and assignment_id = p_assignment_id
    and authorization_subject = p_authorization_subject
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'state', 'GOOGLE_CALENDAR_NOT_CONNECTED');
  end if;

  if v_binding.binding_status = 'active' then
    update integration.drs_google_calendar_bindings
    set binding_status = 'revoked',
        revoked_at = v_now,
        updated_at = v_now
    where id = v_binding.id
      and binding_status = 'active';

    insert into integration.drs_google_calendar_audit_events (
      event_key,
      authenticated_user_id,
      specialist_id,
      assignment_id,
      case_id,
      authorization_subject,
      event_type,
      occurred_at
    ) values (
      'calendar:revoke:' || v_binding.id::text || ':' || extract(epoch from v_binding.bound_at)::text,
      p_authenticated_user_id,
      (v_authorization ->> 'specialist_id')::uuid,
      p_assignment_id,
      p_selected_case_id,
      p_authorization_subject,
      'calendar_revoked',
      v_now
    ) on conflict (event_key) do nothing;
  end if;

  return jsonb_build_object(
    'ok', true,
    'state', 'REVOKED',
    'authenticatedUserId', p_authenticated_user_id,
    'selectedCaseId', p_selected_case_id,
    'assignmentId', p_assignment_id,
    'accountRole', 'drs',
    'authorizationSubject', p_authorization_subject
  );
end;
$$;

create or replace function public.drs_google_calendar_events_context_v1(
  p_authenticated_user_id uuid,
  p_selected_case_id uuid,
  p_assignment_id uuid,
  p_authorization_subject text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_authorization jsonb;
  v_context record;
begin
  v_authorization := public.drs_google_calendar_authorize_v1(
    p_authenticated_user_id,
    p_selected_case_id,
    p_authorization_subject,
    p_assignment_id
  );
  if v_authorization -> 'authorized' is distinct from 'true'::jsonb then
    return jsonb_build_object('ok', false, 'state', 'CASE_NOT_AUTHORIZED');
  end if;

  select
    b.user_id as binding_user_id,
    b.case_id as binding_case_id,
    b.assignment_id as binding_assignment_id,
    b.authorization_subject as binding_authorization_subject,
    b.binding_status,
    b.time_zone,
    b.calendar_id,
    c.credential_status,
    c.encrypted_access_token,
    c.token_expires_at,
    c.granted_scopes
  into v_context
  from integration.drs_google_calendar_bindings b
  join integration.google_calendar_credentials c
    on c.id = b.credential_id
   and c.user_id = b.user_id
   and c.google_subject = b.google_subject
  where b.user_id = p_authenticated_user_id
    and b.case_id = p_selected_case_id
    and b.assignment_id = p_assignment_id
    and b.authorization_subject = p_authorization_subject
    and b.binding_status = 'active'
    and c.credential_status = 'active';

  if not found then
    return jsonb_build_object('ok', false, 'state', 'GOOGLE_CALENDAR_NOT_CONNECTED');
  end if;

  return jsonb_build_object(
    'ok', true,
    'state', 'CONNECTED',
    'authenticatedUserId', v_context.binding_user_id,
    'selectedCaseId', v_context.binding_case_id,
    'assignmentId', v_context.binding_assignment_id,
    'accountRole', 'drs',
    'authorizationSubject', v_context.binding_authorization_subject,
    'bindingStatus', v_context.binding_status,
    'credentialStatus', v_context.credential_status,
    'timeZone', v_context.time_zone,
    'calendarId', v_context.calendar_id,
    'encryptedAccessToken', v_context.encrypted_access_token,
    'tokenExpiresAt', v_context.token_expires_at,
    'grantedScopes', v_context.granted_scopes
  );
end;
$$;

revoke all on function public.drs_google_calendar_authorize_v1(
  uuid, uuid, text, uuid
) from public, anon, authenticated;
revoke all on function public.drs_google_calendar_begin_oauth_v1(
  uuid, uuid, uuid, text, text, text, text, text, timestamptz
) from public, anon, authenticated;
revoke all on function public.drs_google_calendar_get_oauth_state_v1(text)
  from public, anon, authenticated;
revoke all on function public.drs_google_calendar_claim_callback_v1(
  text, uuid, uuid, uuid, text, text, text
) from public, anon, authenticated;
revoke all on function public.drs_google_calendar_commit_callback_v1(
  text, uuid, uuid, text, text, text, text, text, text, timestamptz, text[], text
) from public, anon, authenticated;
revoke all on function public.drs_google_calendar_grant_v1(
  uuid, uuid, uuid, text
) from public, anon, authenticated;
revoke all on function public.drs_google_calendar_revoke_v1(
  uuid, uuid, uuid, text
) from public, anon, authenticated;
revoke all on function public.drs_google_calendar_events_context_v1(
  uuid, uuid, uuid, text
) from public, anon, authenticated;

grant execute on function public.drs_google_calendar_authorize_v1(
  uuid, uuid, text, uuid
) to service_role;
grant execute on function public.drs_google_calendar_begin_oauth_v1(
  uuid, uuid, uuid, text, text, text, text, text, timestamptz
) to service_role;
grant execute on function public.drs_google_calendar_get_oauth_state_v1(text)
  to service_role;
grant execute on function public.drs_google_calendar_claim_callback_v1(
  text, uuid, uuid, uuid, text, text, text
) to service_role;
grant execute on function public.drs_google_calendar_commit_callback_v1(
  text, uuid, uuid, text, text, text, text, text, text, timestamptz, text[], text
) to service_role;
grant execute on function public.drs_google_calendar_grant_v1(
  uuid, uuid, uuid, text
) to service_role;
grant execute on function public.drs_google_calendar_revoke_v1(
  uuid, uuid, uuid, text
) to service_role;
grant execute on function public.drs_google_calendar_events_context_v1(
  uuid, uuid, uuid, text
) to service_role;

commit;
