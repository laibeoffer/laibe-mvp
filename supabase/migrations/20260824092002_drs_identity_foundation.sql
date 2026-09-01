begin;

create schema if not exists integration;
alter schema integration owner to postgres;
revoke all on schema integration from public, anon, authenticated;

do $$
begin
  if to_regclass('auth.users') is null
    or to_regclass('public.drs_specialists') is null
  then
    raise exception 'DRS_IDENTITY_PROVIDER_PREREQUISITE_MISSING';
  end if;
end;
$$;

create table integration.drs_identity_provider_bindings (
  binding_id uuid primary key default extensions.gen_random_uuid(),
  provider text not null,
  provider_subject text not null,
  authenticated_user_id uuid not null,
  specialist_id uuid not null,
  authorization_subject text not null,
  verified_email text,
  binding_status text not null default 'active',
  verified_at timestamptz not null,
  revoked_at timestamptz,
  created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp(),
  foreign key (authenticated_user_id)
    references auth.users(id) on delete restrict,
  foreign key (specialist_id)
    references public.drs_specialists(specialist_id) on delete restrict,
  unique (provider, provider_subject),
  constraint drs_identity_provider_bindings_provider_check check (
    provider in ('google', 'line')
  ),
  constraint drs_identity_provider_bindings_subject_check check (
    btrim(provider_subject) <> ''
  ),
  constraint drs_identity_provider_bindings_authorization_subject_check check (
    authorization_subject = 'drs-specialist:' || specialist_id::text
  ),
  constraint drs_identity_provider_bindings_status_check check (
    binding_status in ('active', 'revoked')
  ),
  constraint drs_identity_provider_bindings_revocation_check check (
    (binding_status = 'revoked' and revoked_at is not null)
    or (binding_status = 'active' and revoked_at is null)
  )
);

create unique index drs_identity_provider_bindings_active_user_idx
  on integration.drs_identity_provider_bindings (
    provider,
    authenticated_user_id
  )
  where binding_status = 'active' and revoked_at is null;

create unique index drs_identity_provider_bindings_active_specialist_idx
  on integration.drs_identity_provider_bindings (
    provider,
    specialist_id
  )
  where binding_status = 'active' and revoked_at is null;

create index drs_identity_provider_bindings_specialist_idx
  on integration.drs_identity_provider_bindings (specialist_id);

create table integration.drs_identity_link_states (
  state_id uuid primary key default extensions.gen_random_uuid(),
  state_digest text not null unique,
  nonce_digest text not null,
  pkce_verifier_ciphertext text not null,
  authenticated_user_id uuid,
  specialist_id uuid,
  authorization_subject text,
  provider text not null,
  intended_action text not null,
  redirect_uri text not null,
  expires_at timestamptz not null,
  claimed_at timestamptz,
  claim_token uuid unique,
  provider_exchange_started_at timestamptz,
  consumed_at timestamptz,
  failed_at timestamptz,
  terminal_status text not null default 'pending',
  failure_state text,
  created_at timestamptz not null default clock_timestamp(),
  foreign key (authenticated_user_id)
    references auth.users(id) on delete restrict,
  foreign key (specialist_id)
    references public.drs_specialists(specialist_id) on delete restrict,
  constraint drs_identity_link_states_provider_check check (
    provider in ('google', 'line')
  ),
  constraint drs_identity_link_states_action_check check (
    intended_action in ('login', 'bind')
  ),
  constraint drs_identity_link_states_context_check check (
    (
      intended_action = 'login'
      and authenticated_user_id is null
      and specialist_id is null
      and authorization_subject is null
    )
    or (
      intended_action = 'bind'
      and authenticated_user_id is not null
      and specialist_id is not null
      and authorization_subject =
        'drs-specialist:' || specialist_id::text
    )
  ),
  constraint drs_identity_link_states_ttl_check check (
    isfinite(created_at)
    and isfinite(expires_at)
    and expires_at > created_at
    and expires_at <= created_at + interval '15 minutes'
  ),
  constraint drs_identity_link_states_terminal_status_check check (
    terminal_status in ('pending', 'claimed', 'consumed', 'failed')
  ),
  constraint drs_identity_link_states_terminal_fields_check check (
    (
      terminal_status = 'pending'
      and claimed_at is null
      and claim_token is null
      and provider_exchange_started_at is null
      and consumed_at is null
      and failed_at is null
    )
    or (
      terminal_status = 'claimed'
      and claimed_at is not null
      and claim_token is not null
      and provider_exchange_started_at is not null
      and consumed_at is null
      and failed_at is null
    )
    or (
      terminal_status = 'consumed'
      and claimed_at is not null
      and claim_token is not null
      and provider_exchange_started_at is not null
      and consumed_at is not null
      and failed_at is null
    )
    or (
      terminal_status = 'failed'
      and claimed_at is not null
      and claim_token is not null
      and provider_exchange_started_at is not null
      and consumed_at is null
      and failed_at is not null
    )
  )
);

create index drs_identity_link_states_authenticated_user_idx
  on integration.drs_identity_link_states (authenticated_user_id)
  where authenticated_user_id is not null;

create index drs_identity_link_states_specialist_idx
  on integration.drs_identity_link_states (specialist_id)
  where specialist_id is not null;

create table integration.drs_identity_provider_events (
  event_id uuid primary key default extensions.gen_random_uuid(),
  authenticated_user_id uuid,
  specialist_id uuid,
  provider text not null,
  event_type text not null,
  state_id uuid,
  occurred_at timestamptz not null,
  correlation_id uuid not null,
  foreign key (authenticated_user_id)
    references auth.users(id) on delete restrict,
  foreign key (specialist_id)
    references public.drs_specialists(specialist_id) on delete restrict,
  foreign key (state_id)
    references integration.drs_identity_link_states(state_id)
    on delete restrict,
  constraint drs_identity_provider_events_provider_check check (
    provider in ('google', 'line')
  ),
  constraint drs_identity_provider_events_type_check check (
    event_type in (
      'identity_binding_created',
      'identity_login',
      'identity_binding_revoked',
      'identity_callback_failed'
    )
  )
);

create index drs_identity_provider_events_authenticated_user_idx
  on integration.drs_identity_provider_events (
    authenticated_user_id,
    occurred_at desc
  );

create index drs_identity_provider_events_specialist_idx
  on integration.drs_identity_provider_events (
    specialist_id,
    occurred_at desc
  );

create index drs_identity_provider_events_state_idx
  on integration.drs_identity_provider_events (state_id);

alter table integration.drs_identity_provider_bindings owner to postgres;
alter table integration.drs_identity_link_states owner to postgres;
alter table integration.drs_identity_provider_events owner to postgres;

alter table integration.drs_identity_provider_bindings
  enable row level security;
alter table integration.drs_identity_provider_bindings
  force row level security;
alter table integration.drs_identity_link_states
  enable row level security;
alter table integration.drs_identity_link_states
  force row level security;
alter table integration.drs_identity_provider_events
  enable row level security;
alter table integration.drs_identity_provider_events
  force row level security;

create policy drs_identity_provider_bindings_deny_all
  on integration.drs_identity_provider_bindings
  for all to public using (false) with check (false);
create policy drs_identity_link_states_deny_all
  on integration.drs_identity_link_states
  for all to public using (false) with check (false);
create policy drs_identity_provider_events_deny_all
  on integration.drs_identity_provider_events
  for all to public using (false) with check (false);

revoke all on table integration.drs_identity_provider_bindings
  from public, anon, authenticated, service_role;
revoke all on table integration.drs_identity_link_states
  from public, anon, authenticated, service_role;
revoke all on table integration.drs_identity_provider_events
  from public, anon, authenticated, service_role;

create or replace function integration.drs_identity_link_state_create_v1(
  p_state_digest text,
  p_nonce_digest text,
  p_pkce_verifier_ciphertext text,
  p_authenticated_user_id uuid,
  p_specialist_id uuid,
  p_authorization_subject text,
  p_provider text,
  p_intended_action text,
  p_redirect_uri text,
  p_expires_at timestamptz,
  p_now timestamptz
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_authority jsonb;
begin
  if p_now is null or not isfinite(p_now)
    or p_expires_at is null or not isfinite(p_expires_at)
    or p_expires_at <= p_now
    or p_expires_at > p_now + interval '15 minutes'
    or nullif(btrim(p_state_digest), '') is null
    or nullif(btrim(p_nonce_digest), '') is null
    or nullif(btrim(p_pkce_verifier_ciphertext), '') is null
    or nullif(btrim(p_redirect_uri), '') is null
    or p_provider not in ('google', 'line')
    or p_intended_action not in ('login', 'bind')
  then
    raise exception using errcode = 'P0001', message = 'CONTEXT_UNAVAILABLE';
  end if;

  if p_intended_action = 'login' then
    if p_authenticated_user_id is not null
      or p_specialist_id is not null
      or p_authorization_subject is not null
    then
      raise exception using errcode = 'P0001', message = 'IDENTITY_MISMATCH';
    end if;
  else
    if to_regprocedure(
      'integration.drs_identity_authority_resolve_locked_v1(uuid,uuid,text)'
    ) is null
    then
      raise exception using errcode = 'P0001', message = 'CONTEXT_UNAVAILABLE';
    end if;
    v_authority := integration.drs_identity_authority_resolve_locked_v1(
      p_authenticated_user_id,
      null,
      p_authorization_subject
    );
    if v_authority -> 'authorized' is distinct from 'true'::jsonb
      or v_authority ->> 'authenticated_user_id'
        is distinct from p_authenticated_user_id::text
      or v_authority ->> 'specialist_id'
        is distinct from p_specialist_id::text
      or v_authority ->> 'authorization_subject'
        is distinct from p_authorization_subject
      or v_authority ->> 'lock_status' is distinct from 'locked'
    then
      raise exception using errcode = 'P0001', message = 'IDENTITY_MISMATCH';
    end if;
  end if;

  insert into integration.drs_identity_link_states (
    state_digest,
    nonce_digest,
    pkce_verifier_ciphertext,
    authenticated_user_id,
    specialist_id,
    authorization_subject,
    provider,
    intended_action,
    redirect_uri,
    expires_at,
    created_at
  ) values (
    p_state_digest,
    p_nonce_digest,
    p_pkce_verifier_ciphertext,
    p_authenticated_user_id,
    p_specialist_id,
    p_authorization_subject,
    p_provider,
    p_intended_action,
    p_redirect_uri,
    p_expires_at,
    p_now
  );
end;
$$;

create or replace function integration.drs_identity_link_state_claim_v1(
  p_state_digest text,
  p_provider text,
  p_redirect_uri text,
  p_now timestamptz
)
returns table (
  state_id uuid,
  nonce_digest text,
  pkce_verifier_ciphertext text,
  authenticated_user_id uuid,
  specialist_id uuid,
  authorization_subject text,
  intended_action text,
  claim_token uuid
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_state integration.drs_identity_link_states%rowtype;
  v_claim_token uuid := extensions.gen_random_uuid();
begin
  select s.*
  into v_state
  from integration.drs_identity_link_states s
  where s.state_digest = p_state_digest
  for update;

  if not found then
    raise exception using errcode = 'P0001', message = 'OAUTH_STATE_INVALID';
  elsif v_state.provider <> p_provider then
    raise exception using errcode = 'P0001', message = 'OAUTH_PROVIDER_MISMATCH';
  elsif v_state.redirect_uri <> p_redirect_uri then
    raise exception using errcode = 'P0001', message = 'OAUTH_REDIRECT_MISMATCH';
  elsif v_state.expires_at <= p_now then
    raise exception using errcode = 'P0001', message = 'OAUTH_STATE_EXPIRED';
  elsif v_state.terminal_status <> 'pending' then
    raise exception using errcode = 'P0001', message = 'OAUTH_STATE_CONSUMED';
  end if;

  update integration.drs_identity_link_states s
  set claimed_at = p_now,
      claim_token = v_claim_token,
      provider_exchange_started_at = p_now,
      terminal_status = 'claimed'
  where s.state_id = v_state.state_id
    and s.terminal_status = 'pending';

  if not found then
    raise exception using errcode = 'P0001', message = 'OAUTH_STATE_CONSUMED';
  end if;

  return query
  select
    v_state.state_id,
    v_state.nonce_digest,
    v_state.pkce_verifier_ciphertext,
    v_state.authenticated_user_id,
    v_state.specialist_id,
    v_state.authorization_subject,
    v_state.intended_action,
    v_claim_token;
end;
$$;

create or replace function integration.fail_identity_link_state_claim_v1(
  p_claim_token uuid,
  p_now timestamptz,
  p_failure_state text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_state_id uuid;
  v_provider text;
  v_authenticated_user_id uuid;
  v_specialist_id uuid;
begin
  update integration.drs_identity_link_states s
  set failed_at = p_now,
      failure_state = left(coalesce(p_failure_state, 'CONTEXT_UNAVAILABLE'), 128),
      terminal_status = 'failed'
  where s.claim_token = p_claim_token
    and s.terminal_status = 'claimed'
  returning
    s.state_id,
    s.provider,
    s.authenticated_user_id,
    s.specialist_id
  into
    v_state_id,
    v_provider,
    v_authenticated_user_id,
    v_specialist_id;

  if found then
    insert into integration.drs_identity_provider_events (
      authenticated_user_id,
      specialist_id,
      provider,
      event_type,
      state_id,
      occurred_at,
      correlation_id
    ) values (
      v_authenticated_user_id,
      v_specialist_id,
      v_provider,
      'identity_callback_failed',
      v_state_id,
      p_now,
      extensions.gen_random_uuid()
    );
  end if;
end;
$$;

create or replace function integration.drs_identity_callback_prepare_v1(
  p_claim_token uuid,
  p_provider text,
  p_provider_subject text,
  p_verified_email text,
  p_now timestamptz
)
returns table (
  authenticated_user_id uuid,
  specialist_id uuid,
  authorization_subject text,
  intended_action text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_state integration.drs_identity_link_states%rowtype;
  v_authenticated_user_id uuid;
  v_specialist_id uuid;
  v_authorization_subject text;
  v_authority jsonb;
begin
  select s.*
  into v_state
  from integration.drs_identity_link_states s
  where s.claim_token = p_claim_token
  for update;

  if not found or v_state.terminal_status <> 'claimed' then
    raise exception using errcode = 'P0001', message = 'OAUTH_STATE_CONSUMED';
  elsif v_state.provider <> p_provider then
    raise exception using errcode = 'P0001', message = 'OAUTH_PROVIDER_MISMATCH';
  elsif v_state.expires_at <= p_now then
    raise exception using errcode = 'P0001', message = 'OAUTH_STATE_EXPIRED';
  elsif nullif(btrim(p_provider_subject), '') is null then
    raise exception using errcode = 'P0001', message = 'TOKEN_VERIFICATION_FAILED';
  end if;

  if v_state.intended_action = 'login' then
    select
      b.authenticated_user_id,
      b.specialist_id,
      b.authorization_subject
    into
      v_authenticated_user_id,
      v_specialist_id,
      v_authorization_subject
    from integration.drs_identity_provider_bindings b
    where b.provider = p_provider
      and b.provider_subject = p_provider_subject
      and b.binding_status = 'active'
      and b.revoked_at is null
    for update;
    if not found then
      raise exception using errcode = 'P0001', message =
        case
          when p_provider = 'google' then 'GOOGLE_IDENTITY_NOT_BOUND'
          else 'LINE_IDENTITY_NOT_BOUND'
        end;
    end if;
  else
    v_authenticated_user_id := v_state.authenticated_user_id;
    v_specialist_id := v_state.specialist_id;
    v_authorization_subject := v_state.authorization_subject;
    if exists (
      select 1
      from integration.drs_identity_provider_bindings b
      where b.provider = p_provider
        and b.provider_subject = p_provider_subject
        and (
          b.authenticated_user_id <> v_authenticated_user_id
          or b.specialist_id <> v_specialist_id
        )
    ) then
      raise exception using errcode = 'P0001', message = 'IDENTITY_CONFLICT';
    end if;
  end if;

  if to_regprocedure(
    'integration.drs_identity_authority_resolve_locked_v1(uuid,uuid,text)'
  ) is null
    or to_regclass('integration.drs_auth_specialist_bindings') is null
    or to_regclass('integration.drs_case_identity_bindings') is null
  then
    raise exception using errcode = 'P0001', message = 'CONTEXT_UNAVAILABLE';
  end if;

  if not exists (
    select 1
    from integration.drs_auth_specialist_bindings b
    where b.authenticated_user_id = v_authenticated_user_id
      and b.specialist_id = v_specialist_id
      and b.authorization_subject = v_authorization_subject
      and b.binding_status = 'active'
      and b.revoked_at is null
      and b.valid_from <= p_now
      and b.valid_until > p_now
    for update
  ) then
    raise exception using errcode = 'P0001', message = 'IDENTITY_MISMATCH';
  end if;

  v_authority := integration.drs_identity_authority_resolve_locked_v1(
    v_authenticated_user_id,
    null,
    v_authorization_subject
  );
  if v_authority -> 'authorized' is distinct from 'true'::jsonb
    or v_authority ->> 'authenticated_user_id'
      is distinct from v_authenticated_user_id::text
    or v_authority ->> 'specialist_id'
      is distinct from v_specialist_id::text
    or v_authority ->> 'authorization_subject'
      is distinct from v_authorization_subject
    or v_authority ->> 'account_role' is distinct from 'drs'
    or v_authority ->> 'auth_binding_status' is distinct from 'active'
    or v_authority ->> 'specialist_status' is distinct from 'active'
    or v_authority ->> 'assignment_status' is distinct from 'active'
    or v_authority ->> 'lock_status' is distinct from 'locked'
  then
    raise exception using errcode = 'P0001', message = 'IDENTITY_MISMATCH';
  end if;

  return query
  select
    v_authenticated_user_id,
    v_specialist_id,
    v_authorization_subject,
    v_state.intended_action;
end;
$$;

create or replace function integration.drs_identity_callback_finalize_v1(
  p_claim_token uuid,
  p_provider text,
  p_provider_subject text,
  p_verified_email text,
  p_expected_authenticated_user_id uuid,
  p_expected_specialist_id uuid,
  p_expected_authorization_subject text,
  p_expected_intended_action text,
  p_now timestamptz,
  p_correlation_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_state integration.drs_identity_link_states%rowtype;
  v_authenticated_user_id uuid;
  v_specialist_id uuid;
  v_authorization_subject text;
  v_intended_action text;
begin
  select
    prepared.authenticated_user_id,
    prepared.specialist_id,
    prepared.authorization_subject,
    prepared.intended_action
  into
    v_authenticated_user_id,
    v_specialist_id,
    v_authorization_subject,
    v_intended_action
  from integration.drs_identity_callback_prepare_v1(
    p_claim_token,
    p_provider,
    p_provider_subject,
    p_verified_email,
    p_now
  ) prepared;

  if not found
    or v_authenticated_user_id is distinct from
      p_expected_authenticated_user_id
    or v_specialist_id is distinct from p_expected_specialist_id
    or v_authorization_subject is distinct from
      p_expected_authorization_subject
    or v_intended_action is distinct from p_expected_intended_action
  then
    raise exception using errcode = 'P0001', message = 'IDENTITY_MISMATCH';
  end if;

  select s.*
  into v_state
  from integration.drs_identity_link_states s
  where s.claim_token = p_claim_token
    and s.terminal_status = 'claimed'
  for update;
  if not found then
    raise exception using errcode = 'P0001', message = 'OAUTH_STATE_CONSUMED';
  end if;

  if v_intended_action = 'bind' then
    insert into integration.drs_identity_provider_bindings (
      provider,
      provider_subject,
      authenticated_user_id,
      specialist_id,
      authorization_subject,
      verified_email,
      binding_status,
      verified_at
    ) values (
      p_provider,
      p_provider_subject,
      v_authenticated_user_id,
      v_specialist_id,
      v_authorization_subject,
      case when p_provider = 'google' then p_verified_email else null end,
      'active',
      p_now
    )
    on conflict (provider, provider_subject) do update
      set verified_email = excluded.verified_email,
          binding_status = 'active',
          verified_at = excluded.verified_at,
          revoked_at = null,
          updated_at = p_now
      where integration.drs_identity_provider_bindings.authenticated_user_id =
          excluded.authenticated_user_id
        and integration.drs_identity_provider_bindings.specialist_id =
          excluded.specialist_id
        and integration.drs_identity_provider_bindings.authorization_subject =
          excluded.authorization_subject;
    if not found then
      raise exception using errcode = 'P0001', message = 'IDENTITY_CONFLICT';
    end if;
  end if;

  update integration.drs_identity_link_states s
  set consumed_at = p_now,
      terminal_status = 'consumed'
  where s.state_id = v_state.state_id
    and s.terminal_status = 'claimed';
  if not found then
    raise exception using errcode = 'P0001', message = 'OAUTH_STATE_CONSUMED';
  end if;

  insert into integration.drs_identity_provider_events (
    authenticated_user_id,
    specialist_id,
    provider,
    event_type,
    state_id,
    occurred_at,
    correlation_id
  ) values (
    v_authenticated_user_id,
    v_specialist_id,
    p_provider,
    case
      when v_intended_action = 'bind' then 'identity_binding_created'
      else 'identity_login'
    end,
    v_state.state_id,
    p_now,
    p_correlation_id
  );
end;
$$;

create or replace function integration.drs_identity_provider_revoke_v1(
  p_authenticated_user_id uuid,
  p_provider text,
  p_now timestamptz,
  p_correlation_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_specialist_id uuid;
begin
  update integration.drs_identity_provider_bindings b
  set binding_status = 'revoked',
      revoked_at = p_now,
      updated_at = p_now
  where b.authenticated_user_id = p_authenticated_user_id
    and b.provider = p_provider
    and b.binding_status = 'active'
    and b.revoked_at is null
  returning b.specialist_id into v_specialist_id;

  if found then
    insert into integration.drs_identity_provider_events (
      authenticated_user_id,
      specialist_id,
      provider,
      event_type,
      occurred_at,
      correlation_id
    ) values (
      p_authenticated_user_id,
      v_specialist_id,
      p_provider,
      'identity_binding_revoked',
      p_now,
      p_correlation_id
    );
  end if;
end;
$$;

alter function integration.drs_identity_link_state_create_v1(
  text, text, text, uuid, uuid, text, text, text, text, timestamptz, timestamptz
) owner to postgres;
alter function integration.drs_identity_link_state_claim_v1(
  text, text, text, timestamptz
) owner to postgres;
alter function integration.fail_identity_link_state_claim_v1(
  uuid, timestamptz, text
) owner to postgres;
alter function integration.drs_identity_callback_prepare_v1(
  uuid, text, text, text, timestamptz
) owner to postgres;
alter function integration.drs_identity_callback_finalize_v1(
  uuid, text, text, text, uuid, uuid, text, text, timestamptz, uuid
) owner to postgres;
alter function integration.drs_identity_provider_revoke_v1(
  uuid, text, timestamptz, uuid
) owner to postgres;

revoke all on function integration.drs_identity_link_state_create_v1(
  text, text, text, uuid, uuid, text, text, text, text, timestamptz, timestamptz
) from public, anon, authenticated;
revoke all on function integration.drs_identity_link_state_claim_v1(
  text, text, text, timestamptz
) from public, anon, authenticated;
revoke all on function integration.fail_identity_link_state_claim_v1(
  uuid, timestamptz, text
) from public, anon, authenticated;
revoke all on function integration.drs_identity_callback_prepare_v1(
  uuid, text, text, text, timestamptz
) from public, anon, authenticated;
revoke all on function integration.drs_identity_callback_finalize_v1(
  uuid, text, text, text, uuid, uuid, text, text, timestamptz, uuid
) from public, anon, authenticated;
revoke all on function integration.drs_identity_provider_revoke_v1(
  uuid, text, timestamptz, uuid
) from public, anon, authenticated;

grant execute on function integration.drs_identity_link_state_create_v1(
  text, text, text, uuid, uuid, text, text, text, text, timestamptz, timestamptz
) to service_role;
grant execute on function integration.drs_identity_link_state_claim_v1(
  text, text, text, timestamptz
) to service_role;
grant execute on function integration.fail_identity_link_state_claim_v1(
  uuid, timestamptz, text
) to service_role;
grant execute on function integration.drs_identity_callback_prepare_v1(
  uuid, text, text, text, timestamptz
) to service_role;
grant execute on function integration.drs_identity_callback_finalize_v1(
  uuid, text, text, text, uuid, uuid, text, text, timestamptz, uuid
) to service_role;
grant execute on function integration.drs_identity_provider_revoke_v1(
  uuid, text, timestamptz, uuid
) to service_role;

commit;
