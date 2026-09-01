begin;

do $auth_r1_precondition$
declare
  unexpected_footprint bigint;
begin
  if to_regnamespace('drs_private') is null
    or to_regclass('casework.cases') is null
    or to_regclass('casework.case_members') is null
    or to_regclass('integration.drs_server_sessions') is null
    or to_regprocedure(
      'public.drs_server_session_verify_v1(uuid,text)'
    ) is null
  then
    raise exception 'AUTH_R1_A5_BRIDGE_REQUIRED';
  end if;

  if to_regclass('auth.users') is null
    or to_regclass('auth.sessions') is null
    or to_regprocedure('auth.uid()') is null
    or to_regprocedure('auth.jwt()') is null
    or not exists (
      select 1
      from information_schema.columns
      where table_schema = 'auth'
        and table_name = 'sessions'
        and column_name = 'id'
        and data_type = 'uuid'
        and is_nullable = 'NO'
    )
    or not exists (
      select 1
      from information_schema.columns
      where table_schema = 'auth'
        and table_name = 'sessions'
        and column_name = 'user_id'
        and data_type = 'uuid'
        and is_nullable = 'NO'
    )
    or not exists (
      select 1
      from information_schema.columns
      where table_schema = 'auth'
        and table_name = 'sessions'
        and column_name = 'not_after'
        and data_type = 'timestamp with time zone'
    )
  then
    raise exception 'AUTH_R1_GOTRUE_SESSION_PREIMAGE_MISMATCH';
  end if;

  if (select count(*) from information_schema.columns
      where table_schema = 'casework' and table_name = 'cases') <> 7
    or (select count(*) from information_schema.columns
      where table_schema = 'casework' and table_name = 'case_members') <> 5
    or not exists (
      select 1
      from information_schema.columns
      where table_schema = 'casework'
        and table_name = 'case_members'
        and column_name = 'role'
        and udt_schema = 'knowledge'
        and udt_name = 'case_role'
    )
  then
    raise exception 'AUTH_R1_A5_BRIDGE_SCHEMA_MISMATCH';
  end if;

  select
    (select count(*) from pg_catalog.pg_namespace schema_record
      where schema_record.nspname = 'drs_auth_private')
    +
    (select count(*) from pg_catalog.pg_class relation_record
      join pg_catalog.pg_namespace relation_namespace
        on relation_namespace.oid = relation_record.relnamespace
      where (relation_namespace.nspname, relation_record.relname) in (
        ('casework', 'drs_three_role_memberships'),
        ('casework', 'drs_three_role_case_authority'),
        ('integration', 'drs_three_role_oauth_states'),
        ('integration', 'drs_three_role_auth_session_bindings'),
        ('integration', 'drs_three_role_server_sessions')
      ))
    +
    (select count(*) from pg_catalog.pg_proc function_record
      join pg_catalog.pg_namespace function_namespace
        on function_namespace.oid = function_record.pronamespace
      where function_namespace.nspname = 'public'
        and function_record.proname like 'drs_three_role_%')
    +
    (select count(*) from pg_catalog.pg_proc function_record
      join pg_catalog.pg_namespace function_namespace
        on function_namespace.oid = function_record.pronamespace
      where function_namespace.nspname = 'drs_auth_private')
  into unexpected_footprint;

  if unexpected_footprint <> 0 then
    raise exception 'AUTH_R1_PARTIAL_FOOTPRINT';
  end if;
end;
$auth_r1_precondition$;

create schema drs_auth_private;
revoke all on schema drs_auth_private from public, anon;
grant usage on schema drs_auth_private to authenticated, service_role;

create table casework.drs_three_role_memberships (
  membership_id uuid primary key default extensions.gen_random_uuid(),
  case_id uuid not null,
  user_id uuid not null,
  role text not null,
  status text not null default 'active',
  valid_from timestamptz not null,
  revoked_at timestamptz,
  invited_by uuid not null references auth.users(id),
  authority_source text not null,
  authority_version bigint not null,
  created_at timestamptz not null default pg_catalog.clock_timestamp(),
  updated_at timestamptz not null default pg_catalog.clock_timestamp(),
  constraint drs_three_role_memberships_case_user_fkey
    foreign key (case_id, user_id)
    references casework.case_members(case_id, user_id)
    on delete restrict,
  constraint drs_three_role_memberships_role_check
    check (role in ('owner', 'vendor', 'drs')),
  constraint drs_three_role_memberships_status_check
    check (status in ('active', 'revoked')),
  constraint drs_three_role_memberships_lifecycle_check
    check (
      (status = 'active' and revoked_at is null)
      or (status = 'revoked' and revoked_at is not null and revoked_at >= valid_from)
    ),
  constraint drs_three_role_memberships_authority_source_check
    check (
      authority_source in (
        'case_creation',
        'case_invitation',
        'vendor_acceptance',
        'drs_assignment',
        'authorized_migration'
      )
    ),
  constraint drs_three_role_memberships_authority_version_check
    check (authority_version between 1 and 9007199254740991),
  constraint drs_three_role_memberships_updated_check
    check (updated_at >= created_at)
);

create unique index drs_three_role_memberships_one_active_case_user
  on casework.drs_three_role_memberships(case_id, user_id)
  where status = 'active' and revoked_at is null;

create index drs_three_role_memberships_active_user_lookup
  on casework.drs_three_role_memberships(user_id, case_id, authority_version)
  where status = 'active' and revoked_at is null;

create index drs_three_role_memberships_case_lookup
  on casework.drs_three_role_memberships(case_id, role, user_id);

create table casework.drs_three_role_case_authority (
  case_id uuid primary key references casework.cases(id) on delete restrict,
  authority_version bigint not null,
  next_actor text not null,
  updated_by uuid not null references auth.users(id),
  updated_at timestamptz not null default pg_catalog.clock_timestamp(),
  authority_basis text not null,
  constraint drs_three_role_case_authority_version_check
    check (authority_version between 1 and 9007199254740991),
  constraint drs_three_role_case_authority_next_actor_check
    check (next_actor in ('owner', 'vendor', 'drs')),
  constraint drs_three_role_case_authority_basis_check
    check (pg_catalog.length(pg_catalog.btrim(authority_basis)) between 1 and 200)
);

create table integration.drs_three_role_oauth_states (
  state_digest text primary key,
  provider text not null,
  redirect_uri text not null,
  pkce_verifier_ciphertext text,
  claim_token uuid unique,
  created_at timestamptz not null,
  expires_at timestamptz not null,
  claimed_at timestamptz,
  consumed_at timestamptz,
  failed_at timestamptz,
  constraint drs_three_role_oauth_states_digest_check
    check (state_digest ~ '^[A-Za-z0-9_-]{43}$'),
  constraint drs_three_role_oauth_states_provider_check
    check (provider = 'google'),
  constraint drs_three_role_oauth_states_redirect_check
    check (redirect_uri ~ '^https://'),
  constraint drs_three_role_oauth_states_ciphertext_check
    check (
      (
        consumed_at is null
        and failed_at is null
        and pg_catalog.length(pkce_verifier_ciphertext) between 16 and 8192
      )
      or (
        (consumed_at is not null or failed_at is not null)
        and pkce_verifier_ciphertext is null
      )
    ),
  constraint drs_three_role_oauth_states_ttl_check
    check (expires_at > created_at and expires_at <= created_at + interval '10 minutes'),
  constraint drs_three_role_oauth_states_claim_check
    check ((claim_token is null) = (claimed_at is null)),
  constraint drs_three_role_oauth_states_terminal_check
    check (not (consumed_at is not null and failed_at is not null))
);

create index drs_three_role_oauth_states_claimable_lookup
  on integration.drs_three_role_oauth_states(state_digest, provider, expires_at)
  where claim_token is null and consumed_at is null and failed_at is null;

create table integration.drs_three_role_auth_session_bindings (
  auth_session_id uuid primary key references auth.sessions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  membership_id uuid not null
    references casework.drs_three_role_memberships(membership_id) on delete restrict,
  authority_version bigint not null,
  bound_at timestamptz not null,
  constraint drs_three_role_auth_session_bindings_version_check
    check (authority_version between 1 and 9007199254740991),
  constraint drs_three_role_auth_session_bindings_user_session_unique
    unique (auth_session_id, user_id)
);

create index drs_three_role_auth_session_bindings_membership_lookup
  on integration.drs_three_role_auth_session_bindings(membership_id, user_id);

create table integration.drs_three_role_server_sessions (
  server_session_id uuid primary key,
  access_token_digest text not null unique,
  user_id uuid not null references auth.users(id) on delete cascade,
  auth_session_id uuid not null references auth.sessions(id) on delete cascade,
  membership_id uuid not null
    references casework.drs_three_role_memberships(membership_id) on delete restrict,
  authority_version bigint not null,
  issued_at timestamptz not null,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  constraint drs_three_role_server_sessions_digest_check
    check (access_token_digest ~ '^[A-Za-z0-9_-]{43}$'),
  constraint drs_three_role_server_sessions_ttl_check
    check (expires_at > issued_at and expires_at <= issued_at + interval '1 hour'),
  constraint drs_three_role_server_sessions_revoke_check
    check (revoked_at is null or revoked_at >= issued_at),
  constraint drs_three_role_server_sessions_authority_version_check
    check (authority_version between 1 and 9007199254740991),
  constraint drs_three_role_server_sessions_auth_pair_unique
    unique (server_session_id, user_id, auth_session_id)
);

create index drs_three_role_server_sessions_auth_lookup
  on integration.drs_three_role_server_sessions(auth_session_id, user_id)
  where revoked_at is null;

create unique index drs_three_role_server_sessions_one_active_binding
  on integration.drs_three_role_server_sessions(auth_session_id)
  where revoked_at is null;

alter table casework.drs_three_role_memberships enable row level security;
alter table casework.drs_three_role_case_authority enable row level security;
alter table integration.drs_three_role_oauth_states enable row level security;
alter table integration.drs_three_role_oauth_states force row level security;
alter table integration.drs_three_role_auth_session_bindings enable row level security;
alter table integration.drs_three_role_auth_session_bindings force row level security;
alter table integration.drs_three_role_server_sessions enable row level security;
alter table integration.drs_three_role_server_sessions force row level security;

create function drs_auth_private.drs_three_role_has_active_case_membership_v1(
  p_case_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  with request_identity as (
    select
      (select auth.uid()) as user_id,
      case
        when coalesce((select auth.jwt()->>'session_id'), '') ~
          '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
        then ((select auth.jwt()->>'session_id'))::uuid
        else null::uuid
      end as auth_session_id
  )
  select exists (
    select 1
    from casework.drs_three_role_memberships membership_record
    join casework.case_members baseline_member
      on baseline_member.case_id = membership_record.case_id
      and baseline_member.user_id = membership_record.user_id
    join casework.drs_three_role_case_authority authority_record
      on authority_record.case_id = membership_record.case_id
      and authority_record.authority_version = membership_record.authority_version
    join integration.drs_three_role_auth_session_bindings binding_record
      on binding_record.membership_id = membership_record.membership_id
      and binding_record.user_id = membership_record.user_id
      and binding_record.authority_version = membership_record.authority_version
    join request_identity request_record
      on request_record.user_id = membership_record.user_id
      and request_record.auth_session_id = binding_record.auth_session_id
    join auth.sessions auth_session
      on auth_session.id = binding_record.auth_session_id
      and auth_session.user_id = membership_record.user_id
      and (
        auth_session.not_after is null
        or auth_session.not_after > pg_catalog.statement_timestamp()
      )
    join integration.drs_three_role_server_sessions technical_session
      on technical_session.auth_session_id = binding_record.auth_session_id
      and technical_session.user_id = membership_record.user_id
      and technical_session.membership_id = membership_record.membership_id
      and technical_session.authority_version = membership_record.authority_version
      and technical_session.revoked_at is null
      and technical_session.expires_at > pg_catalog.statement_timestamp()
    where membership_record.case_id = p_case_id
      and membership_record.status = 'active'
      and membership_record.valid_from <= pg_catalog.statement_timestamp()
      and membership_record.revoked_at is null
      and baseline_member.role::text = case membership_record.role
        when 'owner' then 'owner'
        when 'vendor' then 'pro'
        when 'drs' then 'pcm'
        else '__invalid__'
      end
  );
$function$;

alter function drs_auth_private.drs_three_role_has_active_case_membership_v1(uuid)
  owner to postgres;
revoke all on function drs_auth_private.drs_three_role_has_active_case_membership_v1(uuid)
  from public, anon;
grant execute on function drs_auth_private.drs_three_role_has_active_case_membership_v1(uuid)
  to authenticated, service_role;

create policy drs_three_role_memberships_select_active_case
  on casework.drs_three_role_memberships
  for select
  to authenticated
  using (
    drs_auth_private.drs_three_role_has_active_case_membership_v1(case_id)
  );

create policy drs_three_role_memberships_insert_deny
  on casework.drs_three_role_memberships
  for insert
  to authenticated
  with check (false);

create policy drs_three_role_memberships_update_deny
  on casework.drs_three_role_memberships
  for update
  to authenticated
  using (false)
  with check (false);

create policy drs_three_role_memberships_delete_deny
  on casework.drs_three_role_memberships
  for delete
  to authenticated
  using (false);

create policy drs_three_role_case_authority_select_active_case
  on casework.drs_three_role_case_authority
  for select
  to authenticated
  using (
    drs_auth_private.drs_three_role_has_active_case_membership_v1(case_id)
  );

create policy drs_three_role_case_authority_insert_deny
  on casework.drs_three_role_case_authority
  for insert
  to authenticated
  with check (false);

create policy drs_three_role_case_authority_update_deny
  on casework.drs_three_role_case_authority
  for update
  to authenticated
  using (false)
  with check (false);

create policy drs_three_role_case_authority_delete_deny
  on casework.drs_three_role_case_authority
  for delete
  to authenticated
  using (false);

create policy drs_three_role_oauth_states_select_deny
  on integration.drs_three_role_oauth_states
  for select to public using (false);
create policy drs_three_role_oauth_states_insert_deny
  on integration.drs_three_role_oauth_states
  for insert to public with check (false);
create policy drs_three_role_oauth_states_update_deny
  on integration.drs_three_role_oauth_states
  for update to public using (false) with check (false);
create policy drs_three_role_oauth_states_delete_deny
  on integration.drs_three_role_oauth_states
  for delete to public using (false);

create policy drs_three_role_auth_session_bindings_select_deny
  on integration.drs_three_role_auth_session_bindings
  for select to public using (false);
create policy drs_three_role_auth_session_bindings_insert_deny
  on integration.drs_three_role_auth_session_bindings
  for insert to public with check (false);
create policy drs_three_role_auth_session_bindings_update_deny
  on integration.drs_three_role_auth_session_bindings
  for update to public using (false) with check (false);
create policy drs_three_role_auth_session_bindings_delete_deny
  on integration.drs_three_role_auth_session_bindings
  for delete to public using (false);

create policy drs_three_role_server_sessions_select_deny
  on integration.drs_three_role_server_sessions
  for select to public using (false);
create policy drs_three_role_server_sessions_insert_deny
  on integration.drs_three_role_server_sessions
  for insert to public with check (false);
create policy drs_three_role_server_sessions_update_deny
  on integration.drs_three_role_server_sessions
  for update to public using (false) with check (false);
create policy drs_three_role_server_sessions_delete_deny
  on integration.drs_three_role_server_sessions
  for delete to public using (false);

grant usage on schema casework to authenticated, service_role;
grant select, insert, update, delete
  on casework.drs_three_role_memberships
  to authenticated;
grant select, insert, update, delete
  on casework.drs_three_role_case_authority
  to authenticated;
revoke all on integration.drs_three_role_oauth_states
  from public, anon, authenticated, service_role;
revoke all on integration.drs_three_role_auth_session_bindings
  from public, anon, authenticated, service_role;
revoke all on integration.drs_three_role_server_sessions
  from public, anon, authenticated, service_role;

create function public.drs_three_role_oauth_state_create_v1(
  p_state_digest text,
  p_provider text,
  p_redirect_uri text,
  p_pkce_verifier_ciphertext text,
  p_created_at timestamptz,
  p_expires_at timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  inserted_count bigint;
begin
  if p_state_digest is null
    or p_state_digest !~ '^[A-Za-z0-9_-]{43}$'
    or p_provider is distinct from 'google'
    or p_redirect_uri is null
    or p_redirect_uri !~ '^https://'
    or p_pkce_verifier_ciphertext is null
    or pg_catalog.length(p_pkce_verifier_ciphertext) not between 16 and 8192
    or p_created_at is null
    or p_expires_at is null
    or p_expires_at <= p_created_at
    or p_expires_at > p_created_at + interval '10 minutes'
  then
    raise exception 'OAUTH_STATE_INVALID';
  end if;

  insert into integration.drs_three_role_oauth_states (
    state_digest,
    provider,
    redirect_uri,
    pkce_verifier_ciphertext,
    created_at,
    expires_at
  ) values (
    p_state_digest,
    p_provider,
    p_redirect_uri,
    p_pkce_verifier_ciphertext,
    p_created_at,
    p_expires_at
  )
  on conflict (state_digest) do nothing;

  get diagnostics inserted_count = row_count;
  if inserted_count <> 1 then
    raise exception 'OAUTH_STATE_REPLAYED';
  end if;

  return pg_catalog.jsonb_build_object('created', true);
end;
$function$;

create function public.drs_three_role_oauth_state_claim_v1(
  p_state_digest text,
  p_provider text,
  p_redirect_uri text,
  p_now timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  claimed_record record;
begin
  if p_state_digest is null
    or p_provider is null
    or p_redirect_uri is null
    or p_now is null
  then
    raise exception 'OAUTH_STATE_INVALID';
  end if;

  update integration.drs_three_role_oauth_states state_record
  set
    claim_token = extensions.gen_random_uuid(),
    claimed_at = p_now
  where state_record.state_digest = p_state_digest
    and state_record.provider = p_provider
    and state_record.redirect_uri = p_redirect_uri
    and state_record.created_at <= p_now
    and state_record.expires_at > p_now
    and state_record.claim_token is null
    and state_record.consumed_at is null
    and state_record.failed_at is null
  returning
    state_record.claim_token,
    state_record.pkce_verifier_ciphertext,
    state_record.expires_at
  into claimed_record;

  if not found then
    raise exception 'OAUTH_STATE_INVALID_OR_CONSUMED';
  end if;

  return pg_catalog.jsonb_build_object(
    'claim_token', claimed_record.claim_token::text,
    'pkce_verifier_ciphertext', claimed_record.pkce_verifier_ciphertext,
    'expires_at', pg_catalog.to_char(
      claimed_record.expires_at at time zone 'UTC',
      'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'
    )
  );
end;
$function$;

create function public.drs_three_role_oauth_state_finalize_v1(
  p_claim_token uuid,
  p_now timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  changed_count bigint;
begin
  if p_claim_token is null or p_now is null then
    raise exception 'OAUTH_STATE_INVALID';
  end if;

  update integration.drs_three_role_oauth_states state_record
  set
    consumed_at = p_now,
    pkce_verifier_ciphertext = null
  where state_record.claim_token = p_claim_token
    and state_record.claimed_at is not null
    and state_record.claimed_at <= p_now
    and state_record.expires_at > p_now
    and state_record.consumed_at is null
    and state_record.failed_at is null;

  get diagnostics changed_count = row_count;
  if changed_count <> 1 then
    raise exception 'OAUTH_STATE_INVALID_OR_CONSUMED';
  end if;

  return pg_catalog.jsonb_build_object('consumed', true);
end;
$function$;

create function public.drs_three_role_oauth_state_fail_v1(
  p_claim_token uuid,
  p_now timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  changed_count bigint;
begin
  if p_claim_token is null or p_now is null then
    raise exception 'OAUTH_STATE_INVALID';
  end if;

  update integration.drs_three_role_oauth_states state_record
  set
    failed_at = p_now,
    pkce_verifier_ciphertext = null
  where state_record.claim_token = p_claim_token
    and state_record.claimed_at is not null
    and state_record.claimed_at <= p_now
    and state_record.expires_at >= p_now
    and state_record.consumed_at is null
    and state_record.failed_at is null;

  get diagnostics changed_count = row_count;
  if changed_count <> 1 then
    raise exception 'OAUTH_STATE_INVALID_OR_CONSUMED';
  end if;

  return pg_catalog.jsonb_build_object('failed', true);
end;
$function$;

create function public.drs_three_role_auth_session_bind_v1(
  p_user_id uuid,
  p_auth_session_id uuid,
  p_membership_id uuid,
  p_bound_at timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  candidate_membership record;
begin
  if p_user_id is null
    or p_auth_session_id is null
    or p_membership_id is null
    or p_bound_at is null
  then
    raise exception 'CASE_CONTEXT_INVALID';
  end if;

  perform 1
  from auth.sessions auth_session
  where auth_session.id = p_auth_session_id
    and auth_session.user_id = p_user_id
    and (
      auth_session.not_after is null
      or auth_session.not_after > p_bound_at
    )
  for update;

  if not found then
    raise exception 'AUTH_SESSION_INVALID';
  end if;

  select
    membership_record.membership_id,
    membership_record.authority_version
  into strict candidate_membership
  from casework.drs_three_role_memberships membership_record
  join casework.case_members baseline_member
    on baseline_member.case_id = membership_record.case_id
    and baseline_member.user_id = membership_record.user_id
  join casework.drs_three_role_case_authority authority_record
    on authority_record.case_id = membership_record.case_id
    and authority_record.authority_version = membership_record.authority_version
  where membership_record.membership_id = p_membership_id
    and membership_record.user_id = p_user_id
    and membership_record.status = 'active'
    and membership_record.valid_from <= p_bound_at
    and membership_record.revoked_at is null
    and baseline_member.role::text = case membership_record.role
      when 'owner' then 'owner'
      when 'vendor' then 'pro'
      when 'drs' then 'pcm'
      else '__invalid__'
    end;

  update integration.drs_three_role_server_sessions session_record
  set revoked_at = p_bound_at
  where session_record.auth_session_id = p_auth_session_id
    and session_record.user_id = p_user_id
    and session_record.revoked_at is null
    and session_record.issued_at <= p_bound_at;

  insert into integration.drs_three_role_auth_session_bindings (
    auth_session_id,
    user_id,
    membership_id,
    authority_version,
    bound_at
  ) values (
    p_auth_session_id,
    p_user_id,
    candidate_membership.membership_id,
    candidate_membership.authority_version,
    p_bound_at
  )
  on conflict (auth_session_id) do update
  set
    user_id = excluded.user_id,
    membership_id = excluded.membership_id,
    authority_version = excluded.authority_version,
    bound_at = excluded.bound_at;

  return pg_catalog.jsonb_build_object(
    'bound', true,
    'auth_session_id', p_auth_session_id::text,
    'membership_id', candidate_membership.membership_id::text,
    'authority_version', candidate_membership.authority_version
  );
exception
  when no_data_found or too_many_rows then
    raise exception 'CASE_CONTEXT_INVALID';
end;
$function$;

create function public.drs_three_role_server_session_issue_v1(
  p_server_session_id uuid,
  p_access_token_digest text,
  p_user_id uuid,
  p_auth_session_id uuid,
  p_issued_at timestamptz,
  p_expires_at timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  candidate_count bigint;
  candidate_membership record;
  inserted_count bigint;
begin
  if p_server_session_id is null
    or p_access_token_digest is null
    or p_access_token_digest !~ '^[A-Za-z0-9_-]{43}$'
    or p_user_id is null
    or p_auth_session_id is null
    or p_issued_at is null
    or p_expires_at is null
    or p_expires_at <= p_issued_at
    or p_expires_at > p_issued_at + interval '1 hour'
  then
    raise exception 'AUTH_SESSION_INVALID';
  end if;

  perform 1
  from auth.sessions auth_session
  where auth_session.id = p_auth_session_id
    and auth_session.user_id = p_user_id
    and (
      auth_session.not_after is null
      or auth_session.not_after > p_issued_at
    )
  for update;

  if not found then
    raise exception 'AUTH_SESSION_INVALID';
  end if;

  if not exists (
    select 1
    from integration.drs_three_role_auth_session_bindings binding_record
    where binding_record.auth_session_id = p_auth_session_id
      and binding_record.user_id = p_user_id
  ) then
    select pg_catalog.count(*)
    into candidate_count
    from casework.drs_three_role_memberships membership_record
    join casework.case_members baseline_member
      on baseline_member.case_id = membership_record.case_id
      and baseline_member.user_id = membership_record.user_id
    join casework.drs_three_role_case_authority authority_record
      on authority_record.case_id = membership_record.case_id
      and authority_record.authority_version = membership_record.authority_version
    where membership_record.user_id = p_user_id
      and membership_record.status = 'active'
      and membership_record.valid_from <= p_issued_at
      and membership_record.revoked_at is null
      and baseline_member.role::text = case membership_record.role
        when 'owner' then 'owner'
        when 'vendor' then 'pro'
        when 'drs' then 'pcm'
        else '__invalid__'
      end;

    if candidate_count = 0 then
      raise exception 'CASE_AUTHORITY_INVALID';
    elsif candidate_count > 1 then
      raise exception 'CASE_CONTEXT_REQUIRED';
    end if;

    insert into integration.drs_three_role_auth_session_bindings (
      auth_session_id,
      user_id,
      membership_id,
      authority_version,
      bound_at
    )
    select
      p_auth_session_id,
      p_user_id,
      membership_record.membership_id,
      membership_record.authority_version,
      p_issued_at
    from casework.drs_three_role_memberships membership_record
    join casework.case_members baseline_member
      on baseline_member.case_id = membership_record.case_id
      and baseline_member.user_id = membership_record.user_id
    join casework.drs_three_role_case_authority authority_record
      on authority_record.case_id = membership_record.case_id
      and authority_record.authority_version = membership_record.authority_version
    where membership_record.user_id = p_user_id
      and membership_record.status = 'active'
      and membership_record.valid_from <= p_issued_at
      and membership_record.revoked_at is null
      and baseline_member.role::text = case membership_record.role
        when 'owner' then 'owner'
        when 'vendor' then 'pro'
        when 'drs' then 'pcm'
        else '__invalid__'
      end
    on conflict (auth_session_id) do nothing;
  end if;

  select
    membership_record.membership_id,
    membership_record.authority_version
  into strict candidate_membership
  from integration.drs_three_role_auth_session_bindings binding_record
  join casework.drs_three_role_memberships membership_record
    on membership_record.membership_id = binding_record.membership_id
    and membership_record.user_id = binding_record.user_id
    and membership_record.authority_version = binding_record.authority_version
  join casework.case_members baseline_member
    on baseline_member.case_id = membership_record.case_id
    and baseline_member.user_id = membership_record.user_id
  join casework.drs_three_role_case_authority authority_record
    on authority_record.case_id = membership_record.case_id
    and authority_record.authority_version = membership_record.authority_version
  where binding_record.auth_session_id = p_auth_session_id
    and binding_record.user_id = p_user_id
    and membership_record.status = 'active'
    and membership_record.valid_from <= p_issued_at
    and membership_record.revoked_at is null
    and baseline_member.role::text = case membership_record.role
      when 'owner' then 'owner'
      when 'vendor' then 'pro'
      when 'drs' then 'pcm'
      else '__invalid__'
    end;

  insert into integration.drs_three_role_server_sessions (
    server_session_id,
    access_token_digest,
    user_id,
    auth_session_id,
    membership_id,
    authority_version,
    issued_at,
    expires_at
  ) values (
    p_server_session_id,
    p_access_token_digest,
    p_user_id,
    p_auth_session_id,
    candidate_membership.membership_id,
    candidate_membership.authority_version,
    p_issued_at,
    p_expires_at
  )
  on conflict do nothing;

  get diagnostics inserted_count = row_count;
  if inserted_count <> 1 then
    raise exception 'AUTH_SESSION_REPLAYED';
  end if;

  return pg_catalog.jsonb_build_object(
    'server_session_id', p_server_session_id::text,
    'expires_at', pg_catalog.to_char(
      p_expires_at at time zone 'UTC',
      'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'
    )
  );
exception
  when no_data_found or too_many_rows then
    raise exception 'CASE_AUTHORITY_INVALID';
end;
$function$;

create function public.drs_three_role_server_session_verify_v1(
  p_server_session_id uuid,
  p_access_token_digest text,
  p_expected_user_id uuid,
  p_expected_auth_session_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  projection record;
begin
  if p_server_session_id is null
    or p_access_token_digest is null
    or p_access_token_digest !~ '^[A-Za-z0-9_-]{43}$'
    or p_expected_user_id is null
    or p_expected_auth_session_id is null
  then
    raise exception 'AUTH_SESSION_INVALID';
  end if;

  select
    session_record.user_id,
    session_record.auth_session_id as session_id,
    membership_record.case_id,
    membership_record.membership_id,
    membership_record.role,
    membership_record.authority_version,
    authority_record.next_actor,
    session_record.expires_at
  into strict projection
  from integration.drs_three_role_server_sessions session_record
  join auth.sessions auth_session
    on auth_session.id = session_record.auth_session_id
    and auth_session.user_id = session_record.user_id
  join integration.drs_three_role_auth_session_bindings binding_record
    on binding_record.auth_session_id = session_record.auth_session_id
    and binding_record.user_id = session_record.user_id
    and binding_record.membership_id = session_record.membership_id
    and binding_record.authority_version = session_record.authority_version
  join casework.drs_three_role_memberships membership_record
    on membership_record.membership_id = session_record.membership_id
  join casework.case_members baseline_member
    on baseline_member.case_id = membership_record.case_id
    and baseline_member.user_id = membership_record.user_id
  join casework.drs_three_role_case_authority authority_record
    on authority_record.case_id = membership_record.case_id
  where session_record.server_session_id = p_server_session_id
    and session_record.access_token_digest = p_access_token_digest
    and session_record.user_id = p_expected_user_id
    and session_record.auth_session_id = p_expected_auth_session_id
    and session_record.revoked_at is null
    and session_record.expires_at > pg_catalog.clock_timestamp()
    and (
      auth_session.not_after is null
      or auth_session.not_after > pg_catalog.clock_timestamp()
    )
    and membership_record.user_id = p_expected_user_id
    and membership_record.status = 'active'
    and membership_record.valid_from <= pg_catalog.clock_timestamp()
    and membership_record.revoked_at is null
    and membership_record.authority_version = session_record.authority_version
    and authority_record.authority_version = session_record.authority_version
    and baseline_member.role::text = case membership_record.role
      when 'owner' then 'owner'
      when 'vendor' then 'pro'
      when 'drs' then 'pcm'
      else '__invalid__'
    end;

  return pg_catalog.jsonb_build_object(
    'user_id', projection.user_id::text,
    'session_id', projection.session_id::text,
    'case_id', projection.case_id::text,
    'membership_id', projection.membership_id::text,
    'role', projection.role,
    'authority_version', projection.authority_version,
    'next_actor', projection.next_actor,
    'expires_at', pg_catalog.to_char(
      projection.expires_at at time zone 'UTC',
      'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'
    )
  );
exception
  when no_data_found or too_many_rows then
    raise exception 'AUTH_SESSION_OR_CASE_AUTHORITY_INVALID';
end;
$function$;

create function public.drs_three_role_server_session_revoke_v1(
  p_server_session_id uuid,
  p_revoked_at timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  changed_count bigint;
begin
  if p_server_session_id is null or p_revoked_at is null then
    raise exception 'AUTH_SESSION_INVALID';
  end if;

  update integration.drs_three_role_server_sessions session_record
  set revoked_at = p_revoked_at
  where session_record.server_session_id = p_server_session_id
    and session_record.revoked_at is null
    and p_revoked_at >= session_record.issued_at;

  get diagnostics changed_count = row_count;
  if changed_count <> 1 then
    raise exception 'AUTH_SESSION_INVALID_OR_REVOKED';
  end if;

  return pg_catalog.jsonb_build_object('revoked', true);
end;
$function$;

alter function public.drs_three_role_oauth_state_create_v1(
  text, text, text, text, timestamptz, timestamptz
) owner to postgres;
alter function public.drs_three_role_oauth_state_claim_v1(
  text, text, text, timestamptz
) owner to postgres;
alter function public.drs_three_role_oauth_state_finalize_v1(
  uuid, timestamptz
) owner to postgres;
alter function public.drs_three_role_oauth_state_fail_v1(
  uuid, timestamptz
) owner to postgres;
alter function public.drs_three_role_auth_session_bind_v1(
  uuid, uuid, uuid, timestamptz
) owner to postgres;
alter function public.drs_three_role_server_session_issue_v1(
  uuid, text, uuid, uuid, timestamptz, timestamptz
) owner to postgres;
alter function public.drs_three_role_server_session_verify_v1(
  uuid, text, uuid, uuid
) owner to postgres;
alter function public.drs_three_role_server_session_revoke_v1(
  uuid, timestamptz
) owner to postgres;

revoke all on function public.drs_three_role_oauth_state_create_v1(
  text, text, text, text, timestamptz, timestamptz
) from public, anon, authenticated;
revoke all on function public.drs_three_role_oauth_state_claim_v1(
  text, text, text, timestamptz
) from public, anon, authenticated;
revoke all on function public.drs_three_role_oauth_state_finalize_v1(
  uuid, timestamptz
) from public, anon, authenticated;
revoke all on function public.drs_three_role_oauth_state_fail_v1(
  uuid, timestamptz
) from public, anon, authenticated;
revoke all on function public.drs_three_role_auth_session_bind_v1(
  uuid, uuid, uuid, timestamptz
) from public, anon, authenticated;
revoke all on function public.drs_three_role_server_session_issue_v1(
  uuid, text, uuid, uuid, timestamptz, timestamptz
) from public, anon, authenticated;
revoke all on function public.drs_three_role_server_session_verify_v1(
  uuid, text, uuid, uuid
) from public, anon, authenticated;
revoke all on function public.drs_three_role_server_session_revoke_v1(
  uuid, timestamptz
) from public, anon, authenticated;

grant execute on function public.drs_three_role_oauth_state_create_v1(
  text, text, text, text, timestamptz, timestamptz
) to service_role;
grant execute on function public.drs_three_role_oauth_state_claim_v1(
  text, text, text, timestamptz
) to service_role;
grant execute on function public.drs_three_role_oauth_state_finalize_v1(
  uuid, timestamptz
) to service_role;
grant execute on function public.drs_three_role_oauth_state_fail_v1(
  uuid, timestamptz
) to service_role;
grant execute on function public.drs_three_role_auth_session_bind_v1(
  uuid, uuid, uuid, timestamptz
) to service_role;
grant execute on function public.drs_three_role_server_session_issue_v1(
  uuid, text, uuid, uuid, timestamptz, timestamptz
) to service_role;
grant execute on function public.drs_three_role_server_session_verify_v1(
  uuid, text, uuid, uuid
) to service_role;
grant execute on function public.drs_three_role_server_session_revoke_v1(
  uuid, timestamptz
) to service_role;

do $auth_r1_postcondition$
declare
  protected_function text;
  function_record record;
  protected_table text;
begin
  if to_regclass('casework.drs_three_role_memberships') is null
    or to_regclass('casework.drs_three_role_case_authority') is null
    or to_regclass('integration.drs_three_role_oauth_states') is null
    or to_regclass('integration.drs_three_role_auth_session_bindings') is null
    or to_regclass('integration.drs_three_role_server_sessions') is null
    or to_regnamespace('drs_auth_private') is null
  then
    raise exception 'AUTH_R1_POSTCONDITION_TABLE_MISSING';
  end if;

  foreach protected_table in array array[
    'casework.drs_three_role_memberships',
    'casework.drs_three_role_case_authority',
    'integration.drs_three_role_oauth_states',
    'integration.drs_three_role_auth_session_bindings',
    'integration.drs_three_role_server_sessions'
  ]
  loop
    if not exists (
      select 1
      from pg_catalog.pg_class relation_record
      where relation_record.oid = protected_table::pg_catalog.regclass
        and relation_record.relrowsecurity
    )
      or (select pg_catalog.count(*)
          from pg_catalog.pg_policy policy_record
          where policy_record.polrelid = protected_table::pg_catalog.regclass) <> 4
    then
      raise exception 'AUTH_R1_POSTCONDITION_RLS_INVALID:%', protected_table;
    end if;
  end loop;

  if not exists (
    select 1 from pg_catalog.pg_class relation_record
    where relation_record.oid =
      'integration.drs_three_role_oauth_states'::pg_catalog.regclass
      and relation_record.relforcerowsecurity
  )
    or not exists (
      select 1 from pg_catalog.pg_class relation_record
      where relation_record.oid =
        'integration.drs_three_role_auth_session_bindings'::pg_catalog.regclass
        and relation_record.relforcerowsecurity
    )
    or not exists (
      select 1 from pg_catalog.pg_class relation_record
      where relation_record.oid =
        'integration.drs_three_role_server_sessions'::pg_catalog.regclass
        and relation_record.relforcerowsecurity
    )
  then
    raise exception 'AUTH_R1_POSTCONDITION_PRIVATE_RLS_INVALID';
  end if;

  foreach protected_function in array array[
    'public.drs_three_role_oauth_state_create_v1(text,text,text,text,timestamp with time zone,timestamp with time zone)',
    'public.drs_three_role_oauth_state_claim_v1(text,text,text,timestamp with time zone)',
    'public.drs_three_role_oauth_state_finalize_v1(uuid,timestamp with time zone)',
    'public.drs_three_role_oauth_state_fail_v1(uuid,timestamp with time zone)',
    'public.drs_three_role_auth_session_bind_v1(uuid,uuid,uuid,timestamp with time zone)',
    'public.drs_three_role_server_session_issue_v1(uuid,text,uuid,uuid,timestamp with time zone,timestamp with time zone)',
    'public.drs_three_role_server_session_verify_v1(uuid,text,uuid,uuid)',
    'public.drs_three_role_server_session_revoke_v1(uuid,timestamp with time zone)'
  ]
  loop
    select function_source.*
    into strict function_record
    from pg_catalog.pg_proc function_source
    where function_source.oid = pg_catalog.to_regprocedure(protected_function);

    if pg_catalog.pg_get_userbyid(function_record.proowner) <> 'postgres'
      or not function_record.prosecdef
      or coalesce(pg_catalog.array_length(function_record.proconfig, 1), 0) <> 1
      or function_record.proconfig[1] <> 'search_path=""'
      or exists (
        select 1
        from pg_catalog.aclexplode(coalesce(
          function_record.proacl,
          pg_catalog.acldefault('f', function_record.proowner)
        )) acl_record
        where acl_record.grantee = 0
          and acl_record.privilege_type = 'EXECUTE'
      )
      or pg_catalog.has_function_privilege('anon', protected_function, 'execute')
      or pg_catalog.has_function_privilege('authenticated', protected_function, 'execute')
      or not pg_catalog.has_function_privilege('service_role', protected_function, 'execute')
    then
      raise exception 'AUTH_R1_POSTCONDITION_FUNCTION_INVALID:%', protected_function;
    end if;
  end loop;

  select function_source.*
  into strict function_record
  from pg_catalog.pg_proc function_source
  where function_source.oid = pg_catalog.to_regprocedure(
    'drs_auth_private.drs_three_role_has_active_case_membership_v1(uuid)'
  );

  if pg_catalog.pg_get_userbyid(function_record.proowner) <> 'postgres'
    or not function_record.prosecdef
    or coalesce(pg_catalog.array_length(function_record.proconfig, 1), 0) <> 1
    or function_record.proconfig[1] <> 'search_path=""'
    or exists (
      select 1
      from pg_catalog.aclexplode(coalesce(
        function_record.proacl,
        pg_catalog.acldefault('f', function_record.proowner)
      )) acl_record
      where acl_record.grantee = 0
        and acl_record.privilege_type = 'EXECUTE'
    )
    or pg_catalog.has_function_privilege(
      'anon',
      'drs_auth_private.drs_three_role_has_active_case_membership_v1(uuid)',
      'execute'
    )
    or not pg_catalog.has_function_privilege(
      'authenticated',
      'drs_auth_private.drs_three_role_has_active_case_membership_v1(uuid)',
      'execute'
    )
    or not pg_catalog.has_function_privilege(
      'service_role',
      'drs_auth_private.drs_three_role_has_active_case_membership_v1(uuid)',
      'execute'
    )
    or pg_catalog.to_regprocedure(
      'public.drs_three_role_has_active_case_membership_v1(uuid)'
    ) is not null
    or pg_catalog.has_schema_privilege('anon', 'drs_auth_private', 'usage')
  then
    raise exception 'AUTH_R1_POSTCONDITION_PRIVATE_HELPER_INVALID';
  end if;

  if (select count(*) from information_schema.columns
      where table_schema = 'casework' and table_name = 'cases') <> 7
    or (select count(*) from information_schema.columns
      where table_schema = 'casework' and table_name = 'case_members') <> 5
    or to_regprocedure(
      'public.drs_server_session_verify_v1(uuid,text)'
    ) is null
  then
    raise exception 'AUTH_R1_A5_BRIDGE_PRESERVATION_FAILED';
  end if;
end;
$auth_r1_postcondition$;

commit;
