begin;

do $guard$
declare dependency record;
begin
  for dependency in select * from (values
    ('auth.users','id','uuid'), ('auth.users','email','text|varchar'),
    ('auth.users','email_confirmed_at','timestamptz'), ('auth.users','deleted_at','timestamptz'), ('auth.users','banned_until','timestamptz'),
    ('auth.sessions','id','uuid'), ('auth.sessions','user_id','uuid'), ('auth.sessions','not_after','timestamptz'),
    ('drs_forward_private.specialists','specialist_id','uuid'), ('drs_forward_private.specialists','specialist_status','text'),
    ('drs_forward_private.auth_specialist_bindings','auth_binding_id','uuid'),
    ('drs_forward_private.auth_specialist_bindings','authenticated_user_id','uuid'),
    ('drs_forward_private.auth_specialist_bindings','specialist_id','uuid'),
    ('drs_forward_private.auth_specialist_bindings','binding_status','text'),
    ('drs_forward_private.auth_specialist_bindings','binding_version','int8'),
    ('drs_forward_private.auth_specialist_bindings','valid_from','timestamptz'),
    ('drs_forward_private.auth_specialist_bindings','valid_until','timestamptz'),
    ('drs_forward_private.auth_specialist_bindings','revoked_at','timestamptz'),
    ('drs_forward_private.reviewer_registration_operation_grants','grant_id','uuid'),
    ('drs_forward_private.reviewer_registration_operation_grants','actor_user_id','uuid'),
    ('drs_forward_private.reviewer_registration_operation_grants','operation','text'),
    ('drs_forward_private.reviewer_registration_operation_grants','scope','text'),
    ('drs_forward_private.reviewer_registration_operation_grants','status','text'),
    ('drs_forward_private.reviewer_registration_operation_grants','version','int8'),
    ('drs_forward_private.reviewer_registration_operation_grants','valid_from','timestamptz'),
    ('drs_forward_private.reviewer_registration_operation_grants','valid_until','timestamptz'),
    ('drs_forward_private.reviewer_registration_operation_grants','revoked_at','timestamptz'),
    ('drs_forward_private.reviewer_registration_operation_grants','granted_by','uuid'),
    ('drs_forward_private.reviewer_registration_operation_grants','authority_basis','text'),
    ('drs_forward_private.reviewer_registration_operation_grants','specialist_id','uuid'),
    ('drs_forward_private.reviewer_registration_operation_grants','auth_binding_id','uuid'),
    ('drs_forward_private.reviewer_registration_operation_grants','auth_binding_version','int8'),
    ('drs_forward_private.reviewer_registration_operation_grants','legacy_identity_unresolved','bool'),
    ('drs_forward_private.operation_grant_events','grant_id','uuid'),
    ('drs_forward_private.operation_grant_events','grant_version','int8'),
    ('drs_forward_private.operation_grant_events','after_value','jsonb'),
    ('drs_forward_private.reviewer_self_applications','user_id','uuid'),
    ('drs_forward_private.reviewer_self_applications','display_name','text')
  ) as required(relation_name,column_name,type_names) loop
    if not exists(select 1 from pg_catalog.pg_attribute a join pg_catalog.pg_type t on t.oid=a.atttypid
      where a.attrelid=pg_catalog.to_regclass(dependency.relation_name) and a.attname=dependency.column_name
      and a.attnum>0 and not a.attisdropped and t.typname=any(pg_catalog.string_to_array(dependency.type_names,'|'))) then
      raise exception 'IDENTITY_AUTHORITY_SCHEMA_DRIFT' using errcode='55000';
    end if;
  end loop;
  if not exists(select 1 from pg_catalog.pg_extension e join pg_catalog.pg_namespace n on n.oid=e.extnamespace
    where e.extname='pgcrypto' and n.nspname='extensions') then
    raise exception 'IDENTITY_AUTHORITY_SCHEMA_DRIFT' using errcode='55000';
  end if;
  if exists(select 1 from drs_forward_private.reviewer_registration_operation_grants g where
    not ((not g.legacy_identity_unresolved and g.specialist_id is not null and g.auth_binding_id is not null and g.auth_binding_version is not null)
      or (g.legacy_identity_unresolved and g.status='revoked' and g.revoked_at is not null
        and g.specialist_id is null and g.auth_binding_id is null and g.auth_binding_version is null)))
    or exists(select 1 from drs_forward_private.reviewer_registration_operation_grants g
      where g.legacy_identity_unresolved and not exists(select 1 from drs_forward_private.operation_grant_events e
        where e.grant_id=g.grant_id and e.grant_version=g.version and e.after_value=pg_catalog.to_jsonb(g))) then
    raise exception 'LEGACY_GRANT_RECONCILIATION_REQUIRED: identity shape or audit missing' using errcode='55000';
  end if;
end $guard$;

alter table drs_forward_private.reviewer_registration_operation_grants
  add constraint reviewer_registration_grant_identity_shape check (
    (not legacy_identity_unresolved and specialist_id is not null and auth_binding_id is not null and auth_binding_version is not null and auth_binding_version>=1)
    or (legacy_identity_unresolved and status='revoked' and revoked_at is not null
      and specialist_id is null and auth_binding_id is null and auth_binding_version is null)) not valid;
alter table drs_forward_private.reviewer_registration_operation_grants validate constraint reviewer_registration_grant_identity_shape;
alter table drs_forward_private.reviewer_registration_operation_grants
  add constraint reviewer_registration_grant_identity_fk foreign key(actor_user_id,specialist_id,auth_binding_id)
    references drs_forward_private.auth_specialist_bindings(authenticated_user_id,specialist_id,auth_binding_id) on delete restrict;

create table drs_forward_private.governance_owner_grants (
  owner_grant_id uuid primary key default pg_catalog.gen_random_uuid(),
  owner_user_id uuid not null unique,
  status text not null check(status in ('active','revoked')),
  version bigint not null default 1 check(version>=1),
  valid_from timestamptz not null,
  valid_until timestamptz not null,
  revoked_at timestamptz,
  provisioned_by uuid not null,
  authority_basis text not null check(pg_catalog.char_length(pg_catalog.btrim(authority_basis)) between 1 and 500),
  check(pg_catalog.isfinite(valid_from) and pg_catalog.isfinite(valid_until) and valid_until>valid_from),
  check((status='active' and revoked_at is null)
    or (status='revoked' and revoked_at is not null and pg_catalog.isfinite(revoked_at) and revoked_at>=valid_from))
);
create table drs_forward_private.governance_owner_grant_events (
  event_id uuid primary key default pg_catalog.gen_random_uuid(),
  owner_grant_id uuid not null,
  grant_version bigint not null,
  event_type text not null check(event_type in ('provisioned','changed','revoked')),
  recorded_at timestamptz not null default pg_catalog.clock_timestamp(),
  database_actor text not null,
  provisioned_by uuid not null,
  before_value jsonb,
  after_value jsonb not null
);
create table drs_forward_private.highest_reviewer_role_decisions (
  decision_id uuid primary key,
  owner_user_id uuid not null,
  subject_user_id uuid not null,
  specialist_id uuid not null,
  auth_binding_id uuid not null,
  auth_binding_version bigint not null,
  expected_grant_version bigint,
  outcome text not null check(outcome in ('grant','revoke')),
  reason text not null check(pg_catalog.char_length(reason) between 1 and 500 and reason=pg_catalog.btrim(reason)),
  idempotency_key uuid not null,
  payload_digest text not null check(payload_digest ~ '^[0-9a-f]{64}$'),
  grant_id uuid not null,
  grant_before_version bigint,
  grant_after_version bigint not null,
  decided_at timestamptz not null,
  receipt jsonb not null,
  unique(owner_user_id,idempotency_key)
);

alter table drs_forward_private.governance_owner_grants owner to postgres;
alter table drs_forward_private.governance_owner_grant_events owner to postgres;
alter table drs_forward_private.highest_reviewer_role_decisions owner to postgres;
alter table drs_forward_private.governance_owner_grants enable row level security;
alter table drs_forward_private.governance_owner_grants force row level security;
alter table drs_forward_private.governance_owner_grant_events enable row level security;
alter table drs_forward_private.governance_owner_grant_events force row level security;
alter table drs_forward_private.highest_reviewer_role_decisions enable row level security;
alter table drs_forward_private.highest_reviewer_role_decisions force row level security;
revoke all on drs_forward_private.governance_owner_grants,drs_forward_private.governance_owner_grant_events,
  drs_forward_private.highest_reviewer_role_decisions from public,anon,authenticated,service_role;

create function drs_forward_private.governance_owner_grant_event_v1()
returns trigger language plpgsql security definer set search_path='' as $function$
begin
  if tg_op='UPDATE' and (new.owner_grant_id<>old.owner_grant_id or new.owner_user_id<>old.owner_user_id or new.version<>old.version+1) then
    raise exception 'Immutable owner identity and monotonic version required' using errcode='22023';
  end if;
  insert into drs_forward_private.governance_owner_grant_events(owner_grant_id,grant_version,event_type,database_actor,provisioned_by,before_value,after_value)
  values(new.owner_grant_id,new.version,case when tg_op='INSERT' then 'provisioned' when new.status='revoked' then 'revoked' else 'changed' end,
    session_user,new.provisioned_by,case when tg_op='UPDATE' then pg_catalog.to_jsonb(old) else null end,pg_catalog.to_jsonb(new));
  return new;
end $function$;
create trigger governance_owner_grant_event after insert or update on drs_forward_private.governance_owner_grants
  for each row execute function drs_forward_private.governance_owner_grant_event_v1();
create trigger governance_owner_grants_no_delete before delete or truncate on drs_forward_private.governance_owner_grants
  for each statement execute function drs_forward_private.registration_append_only_v1();
create trigger governance_owner_events_append_only before update or delete or truncate on drs_forward_private.governance_owner_grant_events
  for each statement execute function drs_forward_private.registration_append_only_v1();
create trigger highest_reviewer_decisions_append_only before update or delete or truncate on drs_forward_private.highest_reviewer_role_decisions
  for each statement execute function drs_forward_private.registration_append_only_v1();

create function drs_forward_private.highest_reviewer_error_v1(p_state text)
returns jsonb language sql immutable set search_path='' as $function$
  select pg_catalog.jsonb_build_object('schemaVersion','laibe.drs-highest-reviewer-governance.v1','state',p_state);
$function$;

create function drs_forward_private.governance_owner_actor_check_v1(p_owner_user_id uuid,p_auth_session_id uuid,p_jwt_expires_at timestamptz)
returns text language plpgsql security definer set search_path='' as $function$
declare v_session auth.sessions%rowtype; v_user auth.users%rowtype; v_owner drs_forward_private.governance_owner_grants%rowtype; v_now timestamptz;
begin
  select * into v_session from auth.sessions where id=p_auth_session_id and user_id=p_owner_user_id for share;
  select * into v_user from auth.users where id=p_owner_user_id for share;
  select * into v_owner from drs_forward_private.governance_owner_grants where owner_user_id=p_owner_user_id for share;
  v_now:=pg_catalog.clock_timestamp();
  if v_session.id is null or v_user.id is null or v_user.deleted_at is not null or v_user.email_confirmed_at is null
    or nullif(pg_catalog.btrim(v_user.email),'') is null or v_user.banned_until>v_now
    or p_jwt_expires_at is null or not pg_catalog.isfinite(p_jwt_expires_at) or p_jwt_expires_at<=v_now
    or (v_session.not_after is not null and (not pg_catalog.isfinite(v_session.not_after) or v_session.not_after<=v_now)) then return 'AUTH_REQUIRED'; end if;
  if v_owner.owner_grant_id is null or v_owner.status<>'active' or v_owner.revoked_at is not null
    or v_owner.valid_from>v_now or v_owner.valid_until<=v_now then return 'GOVERNANCE_OWNER_NOT_AUTHORIZED'; end if;
  return null;
end $function$;

create function drs_forward_private.reviewer_identity_check_v1(p_subject_user_id uuid,p_specialist_id uuid,p_auth_binding_id uuid,p_auth_binding_version bigint,p_checked_at timestamptz)
returns boolean language plpgsql security definer set search_path='' as $function$
declare v_user auth.users%rowtype; v_specialist drs_forward_private.specialists%rowtype; v_binding drs_forward_private.auth_specialist_bindings%rowtype; v_now timestamptz;
begin
  select * into v_user from auth.users where id=p_subject_user_id for share;
  select * into v_specialist from drs_forward_private.specialists where specialist_id=p_specialist_id for share;
  select * into v_binding from drs_forward_private.auth_specialist_bindings where auth_binding_id=p_auth_binding_id for share;
  v_now:=greatest(p_checked_at,pg_catalog.clock_timestamp());
  return coalesce(p_checked_at is not null and pg_catalog.isfinite(p_checked_at) and v_user.id is not null
    and v_user.deleted_at is null and v_user.email_confirmed_at is not null and nullif(pg_catalog.btrim(v_user.email),'') is not null
    and (v_user.banned_until is null or v_user.banned_until<=v_now)
    and v_specialist.specialist_status='active' and v_binding.authenticated_user_id=p_subject_user_id
    and v_binding.specialist_id=p_specialist_id and v_binding.binding_version=p_auth_binding_version
    and v_binding.binding_status='active' and v_binding.revoked_at is null
    and pg_catalog.isfinite(v_binding.valid_from) and pg_catalog.isfinite(v_binding.valid_until)
    and v_binding.valid_from<=v_now and v_binding.valid_until>v_now,false);
end $function$;

create or replace function drs_forward_private.registration_actor_check_v1(p_actor uuid,p_session uuid,p_expiry timestamptz,p_grant uuid)
returns text language plpgsql security definer set search_path='' as $function$
declare v_session auth.sessions%rowtype; v_user auth.users%rowtype; v_grant drs_forward_private.reviewer_registration_operation_grants%rowtype; v_now timestamptz;
begin
  select * into v_session from auth.sessions where id=p_session and user_id=p_actor for share;
  select * into v_user from auth.users where id=p_actor for share;
  select * into v_grant from drs_forward_private.reviewer_registration_operation_grants where grant_id=p_grant for share;
  v_now:=pg_catalog.clock_timestamp();
  if v_session.id is null or v_user.id is null or v_user.deleted_at is not null or v_user.email_confirmed_at is null
    or nullif(pg_catalog.btrim(v_user.email),'') is null or v_user.banned_until>v_now
    or p_expiry is null or not pg_catalog.isfinite(p_expiry) or p_expiry<=v_now
    or (v_session.not_after is not null and (not pg_catalog.isfinite(v_session.not_after) or v_session.not_after<=v_now)) then return 'AUTH_REQUIRED'; end if;
  if v_grant.grant_id is null or v_grant.actor_user_id is distinct from p_actor or v_grant.legacy_identity_unresolved
    or v_grant.operation<>'reviewer_registration_decide' or v_grant.scope<>'reviewer_registration'
    or v_grant.status<>'active' or v_grant.revoked_at is not null or v_grant.valid_from>v_now or v_grant.valid_until<=v_now
    or not drs_forward_private.reviewer_identity_check_v1(p_actor,v_grant.specialist_id,v_grant.auth_binding_id,v_grant.auth_binding_version,v_now) then
    return 'REGISTRATION_OPERATION_NOT_AUTHORIZED';
  end if;
  -- Qualification locks may have waited past a session or grant deadline.
  v_now:=pg_catalog.clock_timestamp();
  if p_expiry<=v_now or v_session.not_after<=v_now then return 'AUTH_REQUIRED'; end if;
  if v_grant.valid_until<=v_now then return 'REGISTRATION_OPERATION_NOT_AUTHORIZED'; end if;
  return null;
end $function$;

create function public.drs_highest_reviewer_candidates_v1(
  p_owner_user_id uuid,p_auth_session_id uuid,p_jwt_expires_at timestamptz,
  p_cursor_sort_key text default null,p_cursor_candidate_key uuid default null)
returns jsonb language plpgsql security definer set search_path='' as $function$
declare v_error text; v_now timestamptz; v_rows jsonb; v_page jsonb; v_next jsonb; v_count integer;
begin
  if pg_catalog.current_setting('role',true) is distinct from 'service_role' then
    raise insufficient_privilege using message='service_role required';
  end if;
  v_error:=drs_forward_private.governance_owner_actor_check_v1(p_owner_user_id,p_auth_session_id,p_jwt_expires_at);
  if v_error is not null then return drs_forward_private.highest_reviewer_error_v1(v_error); end if;
  if (p_cursor_sort_key is null)<>(p_cursor_candidate_key is null) or pg_catalog.char_length(p_cursor_sort_key)>320 then
    return drs_forward_private.highest_reviewer_error_v1('INVALID_REQUEST');
  end if;
  v_now:=pg_catalog.clock_timestamp();
  with live as materialized (
    select b.* from drs_forward_private.auth_specialist_bindings b
      join auth.users u on u.id=b.authenticated_user_id join drs_forward_private.specialists s on s.specialist_id=b.specialist_id
    where u.deleted_at is null and u.email_confirmed_at is not null and nullif(pg_catalog.btrim(u.email),'') is not null
      and (u.banned_until is null or u.banned_until<=v_now) and s.specialist_status='active'
      and b.binding_status='active' and b.revoked_at is null and b.valid_from<=v_now and b.valid_until>v_now
      and pg_catalog.isfinite(b.valid_from) and pg_catalog.isfinite(b.valid_until)
  ), subjects as (
    select g.actor_user_id as user_id,g.grant_id,g.version as grant_version,g.status,g.valid_from,g.valid_until,g.revoked_at,g.legacy_identity_unresolved,
      case when g.legacy_identity_unresolved then null else coalesce(chosen.auth_binding_id,g.auth_binding_id) end as binding_id,
      case when g.legacy_identity_unresolved then null else coalesce(chosen.binding_version,g.auth_binding_version) end as binding_version,
      g.auth_binding_id as stored_binding_id,g.auth_binding_version as stored_binding_version
    from drs_forward_private.reviewer_registration_operation_grants g
      left join lateral (select b.* from live b where b.authenticated_user_id=g.actor_user_id
        and not g.legacy_identity_unresolved and (g.status='revoked' or g.valid_until<=v_now)
        order by b.valid_from desc,b.auth_binding_id limit 1) chosen on true
    union all
    select b.authenticated_user_id,null::uuid,null::bigint,null::text,null::timestamptz,null::timestamptz,null::timestamptz,false,
      b.auth_binding_id,b.binding_version,null::uuid,null::bigint
    from live b where not exists(select 1 from drs_forward_private.reviewer_registration_operation_grants g where g.actor_user_id=b.authenticated_user_id)
  ), joined as (
    select x.*,b.binding_status,b.valid_from as binding_from,b.valid_until as binding_until,b.revoked_at as binding_revoked_at,
      b.binding_version as live_version,s.specialist_status,u.email,u.email_confirmed_at,u.deleted_at,u.banned_until,a.display_name,
      coalesce(b.auth_binding_id,x.grant_id) as candidate_key,
      coalesce(not x.legacy_identity_unresolved and u.id is not null and u.deleted_at is null and u.email_confirmed_at is not null
        and nullif(pg_catalog.btrim(u.email),'') is not null and (u.banned_until is null or u.banned_until<=v_now)
        and s.specialist_status='active' and b.authenticated_user_id=x.user_id and b.binding_status='active' and b.revoked_at is null
        and b.binding_version=x.binding_version and b.valid_from<=v_now and b.valid_until>v_now,false) as qualified,
      coalesce(x.status='active' and x.revoked_at is null and x.valid_from<=v_now and x.valid_until>v_now,false) as grant_active
    from subjects x left join drs_forward_private.auth_specialist_bindings b on b.auth_binding_id=x.binding_id
      left join drs_forward_private.specialists s on s.specialist_id=b.specialist_id
      left join auth.users u on u.id=x.user_id left join drs_forward_private.reviewer_self_applications a on a.user_id=x.user_id
  ), rows as (
    select case when legacy_identity_unresolved or deleted_at is not null or email_confirmed_at is null then '' else coalesce(pg_catalog.lower(pg_catalog.btrim(email)),'') end as sort_key,
      candidate_key,
      pg_catalog.jsonb_build_object('candidateKey',candidate_key,
        'displayName',case when qualified then coalesce(display_name,'審查員') when not legacy_identity_unresolved and deleted_at is null then display_name else null end,
        'accountEmail',case when not legacy_identity_unresolved and deleted_at is null and email_confirmed_at is not null then email else null end,
        'subject',pg_catalog.jsonb_build_object('authBindingId',binding_id,'bindingVersion',binding_version,'grantId',grant_id,'grantVersion',grant_version),
        'qualification',pg_catalog.jsonb_build_object('state',case when legacy_identity_unresolved then 'unresolved' when qualified then 'active'
          when binding_status='revoked' or binding_revoked_at is not null then 'revoked' when binding_until<=v_now then 'expired' else 'inactive' end,
          'validUntil',case when legacy_identity_unresolved then null else binding_until end),
        'governanceGrant',pg_catalog.jsonb_build_object('state',case when legacy_identity_unresolved then 'legacy_identity_unresolved' when grant_id is null then 'never_granted'
          when status='revoked' then 'revoked' when valid_until<=v_now then 'expired' else 'active' end,'validUntil',case when legacy_identity_unresolved then null else valid_until end),
        'effectiveHighestReviewer',qualified and grant_active and binding_id=stored_binding_id and binding_version=stored_binding_version,
        'availableAction',case when legacy_identity_unresolved then 'reconciliation_required' when grant_active then 'revoke' when qualified then 'grant' else null end) as value
    from joined
  ) select coalesce(pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object('sortKey',sort_key,'candidateKey',candidate_key,'value',value) order by sort_key,candidate_key),'[]'::jsonb) into v_rows from rows;
  if p_cursor_candidate_key is not null and not exists(select 1 from pg_catalog.jsonb_array_elements(v_rows) r
    where r->>'sortKey'=p_cursor_sort_key and (r->>'candidateKey')::uuid=p_cursor_candidate_key) then
    return drs_forward_private.highest_reviewer_error_v1('INVALID_REQUEST');
  end if;
  select coalesce(pg_catalog.jsonb_agg(r order by r->>'sortKey',(r->>'candidateKey')::uuid),'[]'::jsonb) into v_page
    from (select r from pg_catalog.jsonb_array_elements(v_rows) r where p_cursor_candidate_key is null
      or (r->>'sortKey',(r->>'candidateKey')::uuid)>(p_cursor_sort_key,p_cursor_candidate_key)
      order by r->>'sortKey',(r->>'candidateKey')::uuid limit 26) page;
  v_count:=pg_catalog.jsonb_array_length(v_page);
  v_next:=case when v_count>25 then pg_catalog.jsonb_build_object('sortKey',v_page->24->>'sortKey','candidateKey',v_page->24->'candidateKey') else null end;
  select coalesce(pg_catalog.jsonb_agg(r->'value' order by position),'[]'::jsonb) into v_page
    from pg_catalog.jsonb_array_elements(v_page) with ordinality as rows(r,position) where position<=25;
  v_error:=drs_forward_private.governance_owner_actor_check_v1(p_owner_user_id,p_auth_session_id,p_jwt_expires_at);
  if v_error is not null then return drs_forward_private.highest_reviewer_error_v1(v_error); end if;
  return pg_catalog.jsonb_build_object('schemaVersion','laibe.drs-highest-reviewer-governance.v1',
    'state',case when pg_catalog.jsonb_array_length(v_page)=0 then 'NO_ELIGIBLE_REVIEWERS' else 'HIGHEST_REVIEWER_CANDIDATES_READY' end,
    'candidates',v_page,'nextCursor',v_next);
end $function$;

create function public.drs_highest_reviewer_role_decision_v1(
  p_owner_user_id uuid,p_auth_session_id uuid,p_jwt_expires_at timestamptz,
  p_auth_binding_id uuid,p_binding_version bigint,p_grant_id uuid,p_expected_grant_version bigint,
  p_decision text,p_reason text,p_idempotency_key uuid)
returns jsonb language plpgsql security definer set search_path='' as $function$
declare v_error text; v_reason text:=pg_catalog.btrim(p_reason); v_digest text; v_subject uuid; v_now timestamptz;
  v_binding drs_forward_private.auth_specialist_bindings%rowtype;
  v_grant drs_forward_private.reviewer_registration_operation_grants%rowtype;
  v_prior drs_forward_private.highest_reviewer_role_decisions%rowtype;
  v_before bigint; v_decision uuid:=pg_catalog.gen_random_uuid(); v_receipt jsonb; v_until timestamptz;
begin
  if pg_catalog.current_setting('role',true) is distinct from 'service_role' then
    raise insufficient_privilege using message='service_role required';
  end if;
  if p_owner_user_id is null or p_auth_session_id is null or p_idempotency_key is null
    or p_decision is null or p_decision not in ('grant','revoke') or v_reason is null or pg_catalog.char_length(v_reason) not between 1 and 500
    or (p_grant_id is null)<>(p_expected_grant_version is null) or p_expected_grant_version<0
    or (p_decision='grant' and (p_auth_binding_id is null or p_binding_version is null or p_binding_version<1))
    or (p_decision='revoke' and p_grant_id is null) then
    return drs_forward_private.highest_reviewer_error_v1('INVALID_REQUEST');
  end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('drs-highest-owner-command:'||p_owner_user_id::text||':'||p_idempotency_key::text,0));
  v_digest:=pg_catalog.encode(extensions.digest(pg_catalog.convert_to(pg_catalog.jsonb_build_object(
    'authBindingId',p_auth_binding_id,'bindingVersion',p_binding_version,'grantId',p_grant_id,
    'expectedGrantVersion',p_expected_grant_version,'decision',p_decision,'reason',v_reason)::text,'UTF8'),'sha256'),'hex');
  select * into v_prior from drs_forward_private.highest_reviewer_role_decisions where owner_user_id=p_owner_user_id and idempotency_key=p_idempotency_key;
  if v_prior.decision_id is not null then
    v_subject:=v_prior.subject_user_id;
  elsif p_decision='grant' then
    select authenticated_user_id into v_subject from drs_forward_private.auth_specialist_bindings where auth_binding_id=p_auth_binding_id;
  else
    select actor_user_id into v_subject from drs_forward_private.reviewer_registration_operation_grants where grant_id=p_grant_id;
  end if;
  if v_subject is null then
    v_error:=drs_forward_private.governance_owner_actor_check_v1(p_owner_user_id,p_auth_session_id,p_jwt_expires_at);
    return drs_forward_private.highest_reviewer_error_v1(coalesce(v_error,
      case when p_decision='grant' then 'REVIEWER_QUALIFICATION_CONFLICT' else 'HIGHEST_REVIEWER_GRANT_CONFLICT' end));
  end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('drs-highest-subject:'||v_subject::text||':reviewer-registration:global',0));
  -- Registration decisions lock the reviewer's grant before the applicant's Auth
  -- row. That applicant may be this owner, so keep the same shared-resource order.
  select * into v_grant from drs_forward_private.reviewer_registration_operation_grants
    where actor_user_id=v_subject and operation='reviewer_registration_decide' and scope='reviewer_registration' for update;
  v_error:=drs_forward_private.governance_owner_actor_check_v1(p_owner_user_id,p_auth_session_id,p_jwt_expires_at);
  if v_error is not null then return drs_forward_private.highest_reviewer_error_v1(v_error); end if;
  if v_prior.decision_id is not null then
    if v_prior.payload_digest<>v_digest then return drs_forward_private.highest_reviewer_error_v1('IDEMPOTENCY_CONFLICT'); end if;
    return v_prior.receipt||pg_catalog.jsonb_build_object('replayed',true);
  end if;
  if v_grant.legacy_identity_unresolved then return drs_forward_private.highest_reviewer_error_v1('LEGACY_GRANT_RECONCILIATION_REQUIRED'); end if;
  if (v_grant.grant_id is null and (p_grant_id is not null or p_expected_grant_version is not null))
    or (v_grant.grant_id is not null and (v_grant.grant_id is distinct from p_grant_id or v_grant.version is distinct from p_expected_grant_version)) then
    return drs_forward_private.highest_reviewer_error_v1('HIGHEST_REVIEWER_GRANT_CONFLICT');
  end if;
  if p_decision='grant' then
    -- Resolve the specialist without a row lock; the helper locks and validates
    -- Auth user -> specialist -> binding, matching registration approval replay.
    select * into v_binding from drs_forward_private.auth_specialist_bindings where auth_binding_id=p_auth_binding_id;
    if v_binding.authenticated_user_id is distinct from v_subject or not drs_forward_private.reviewer_identity_check_v1(
      v_subject,v_binding.specialist_id,p_auth_binding_id,p_binding_version,pg_catalog.clock_timestamp()) then
      return drs_forward_private.highest_reviewer_error_v1('REVIEWER_QUALIFICATION_CONFLICT');
    end if;
    -- The helper now holds all identity rows; use their post-wait values.
    select * into v_binding from drs_forward_private.auth_specialist_bindings where auth_binding_id=p_auth_binding_id;
  elsif v_grant.auth_binding_id is distinct from p_auth_binding_id or v_grant.auth_binding_version is distinct from p_binding_version then
    return drs_forward_private.highest_reviewer_error_v1('HIGHEST_REVIEWER_GRANT_CONFLICT');
  end if;
  v_error:=drs_forward_private.governance_owner_actor_check_v1(p_owner_user_id,p_auth_session_id,p_jwt_expires_at);
  if v_error is not null then return drs_forward_private.highest_reviewer_error_v1(v_error); end if;
  v_now:=pg_catalog.clock_timestamp();
  if p_decision='grant' and v_binding.valid_until<=v_now then return drs_forward_private.highest_reviewer_error_v1('REVIEWER_QUALIFICATION_CONFLICT'); end if;
  v_before:=v_grant.version;
  if p_decision='grant' then
    v_until:=least(v_binding.valid_until,v_now+interval '365 days');
    if v_grant.grant_id is null then
      insert into drs_forward_private.reviewer_registration_operation_grants(actor_user_id,operation,scope,status,valid_from,valid_until,granted_by,authority_basis,specialist_id,auth_binding_id,auth_binding_version)
      values(v_subject,'reviewer_registration_decide','reviewer_registration','active',v_now,v_until,p_owner_user_id,v_reason,v_binding.specialist_id,p_auth_binding_id,p_binding_version)
      returning * into v_grant;
    elsif not (v_grant.status='active' and v_grant.revoked_at is null and v_grant.valid_from<=v_now and v_grant.valid_until>v_now) then
      update drs_forward_private.reviewer_registration_operation_grants set status='active',version=version+1,valid_from=v_now,valid_until=v_until,revoked_at=null,
        granted_by=p_owner_user_id,authority_basis=v_reason,specialist_id=v_binding.specialist_id,auth_binding_id=p_auth_binding_id,auth_binding_version=p_binding_version
        where grant_id=v_grant.grant_id returning * into v_grant;
    elsif v_grant.auth_binding_id is distinct from p_auth_binding_id or v_grant.auth_binding_version is distinct from p_binding_version then
      return drs_forward_private.highest_reviewer_error_v1('HIGHEST_REVIEWER_GRANT_CONFLICT');
    end if;
  elsif v_grant.status<>'revoked' then
    update drs_forward_private.reviewer_registration_operation_grants set status='revoked',version=version+1,revoked_at=v_now,
      granted_by=p_owner_user_id,authority_basis=v_reason where grant_id=v_grant.grant_id returning * into v_grant;
  end if;
  v_receipt:=pg_catalog.jsonb_build_object('schemaVersion','laibe.drs-highest-reviewer-governance.v1',
    'state',case when p_decision='grant' then 'HIGHEST_REVIEWER_GRANTED' else 'HIGHEST_REVIEWER_REVOKED' end,
    'subject',pg_catalog.jsonb_build_object('authBindingId',v_grant.auth_binding_id,'bindingVersion',v_grant.auth_binding_version,'grantId',v_grant.grant_id,'grantVersion',v_grant.version),
    'decision',pg_catalog.jsonb_build_object('decisionId',v_decision,'outcome',p_decision,'decidedAt',v_now),
    'governanceGrant',pg_catalog.jsonb_build_object('state',v_grant.status,'validUntil',v_grant.valid_until),
    'caseAccessChanged',false,'replayed',false);
  insert into drs_forward_private.highest_reviewer_role_decisions(decision_id,owner_user_id,subject_user_id,specialist_id,auth_binding_id,auth_binding_version,
    expected_grant_version,outcome,reason,idempotency_key,payload_digest,grant_id,grant_before_version,grant_after_version,decided_at,receipt)
    values(v_decision,p_owner_user_id,v_subject,v_grant.specialist_id,v_grant.auth_binding_id,v_grant.auth_binding_version,
      p_expected_grant_version,p_decision,v_reason,p_idempotency_key,v_digest,v_grant.grant_id,v_before,v_grant.version,v_now,v_receipt);
  return v_receipt;
end $function$;

alter function drs_forward_private.governance_owner_grant_event_v1() owner to postgres;
alter function drs_forward_private.highest_reviewer_error_v1(text) owner to postgres;
alter function drs_forward_private.governance_owner_actor_check_v1(uuid,uuid,timestamptz) owner to postgres;
alter function drs_forward_private.reviewer_identity_check_v1(uuid,uuid,uuid,bigint,timestamptz) owner to postgres;
alter function drs_forward_private.registration_actor_check_v1(uuid,uuid,timestamptz,uuid) owner to postgres;
alter function public.drs_highest_reviewer_candidates_v1(uuid,uuid,timestamptz,text,uuid) owner to postgres;
alter function public.drs_highest_reviewer_role_decision_v1(uuid,uuid,timestamptz,uuid,bigint,uuid,bigint,text,text,uuid) owner to postgres;
revoke all on function drs_forward_private.governance_owner_grant_event_v1(),drs_forward_private.highest_reviewer_error_v1(text),
  drs_forward_private.governance_owner_actor_check_v1(uuid,uuid,timestamptz),drs_forward_private.reviewer_identity_check_v1(uuid,uuid,uuid,bigint,timestamptz),
  drs_forward_private.registration_actor_check_v1(uuid,uuid,timestamptz,uuid) from public,anon,authenticated,service_role;
revoke all on function public.drs_highest_reviewer_candidates_v1(uuid,uuid,timestamptz,text,uuid),
  public.drs_highest_reviewer_role_decision_v1(uuid,uuid,timestamptz,uuid,bigint,uuid,bigint,text,text,uuid) from public,anon,authenticated,service_role;
grant execute on function public.drs_highest_reviewer_candidates_v1(uuid,uuid,timestamptz,text,uuid),
  public.drs_highest_reviewer_role_decision_v1(uuid,uuid,timestamptz,uuid,bigint,uuid,bigint,text,text,uuid) to service_role;
grant usage on schema public to service_role;

commit;
