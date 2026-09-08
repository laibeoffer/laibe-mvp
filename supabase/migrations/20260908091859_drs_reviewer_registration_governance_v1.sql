begin;

create table drs_forward_private.reviewer_registration_operation_grants (
 grant_id uuid primary key default gen_random_uuid(),
 actor_user_id uuid not null,
 operation text not null check(operation='reviewer_registration_decide'),
 scope text not null check(scope='reviewer_registration'),
 status text not null check(status in ('active','revoked')),
 version bigint not null default 1 check(version>=1),
 valid_from timestamptz not null,
 valid_until timestamptz not null,
 revoked_at timestamptz,
 granted_by uuid not null,
 authority_basis text not null check(char_length(btrim(authority_basis)) between 1 and 500 and authority_basis !~ '[[:cntrl:]]'),
 unique(actor_user_id,operation,scope),
 check(isfinite(valid_from) and isfinite(valid_until) and valid_until>valid_from),
 check((status='active' and revoked_at is null) or (status='revoked' and revoked_at is not null and isfinite(revoked_at) and revoked_at>=valid_from))
);
create table drs_forward_private.operation_grant_events (
 event_id uuid primary key default gen_random_uuid(),
 grant_id uuid not null,
 grant_version bigint not null,
 event_type text not null check(event_type in ('provisioned','changed','revoked')),
 recorded_at timestamptz not null default clock_timestamp(),
 database_actor text not null,
 granted_by uuid not null,
 before_value jsonb,
 after_value jsonb not null
);
create table drs_forward_private.reviewer_registration_decisions (
 decision_id uuid primary key,
 actor_user_id uuid not null,
 actor_auth_session_id uuid not null,
 operation_grant_id uuid not null,
 operation_grant_version bigint not null,
 application_id uuid not null,
 application_before_version integer not null,
 application_after_version integer not null,
 outcome text not null check(outcome in ('approve','reject')),
 reason text not null check(char_length(reason) between 1 and 500 and reason !~ '[[:cntrl:]]'),
 idempotency_key uuid not null,
 payload_digest text not null check(payload_digest ~ '^[0-9a-f]{64}$'),
 decided_at timestamptz not null,
 new_specialist_id uuid,
 new_auth_binding_id uuid,
 receipt jsonb not null,
 unique(actor_user_id,idempotency_key),
 unique(application_id,application_before_version),
 check(application_after_version=application_before_version+1),
 check((outcome='approve' and new_specialist_id is not null and new_auth_binding_id is not null)
    or (outcome='reject' and new_specialist_id is null and new_auth_binding_id is null))
);
create index reviewer_self_applications_pending_queue_idx
 on drs_forward_private.reviewer_self_applications(submitted_at,application_id) where status='pending';

alter table drs_forward_private.reviewer_registration_operation_grants enable row level security;
alter table drs_forward_private.reviewer_registration_operation_grants force row level security;
alter table drs_forward_private.operation_grant_events enable row level security;
alter table drs_forward_private.operation_grant_events force row level security;
alter table drs_forward_private.reviewer_registration_decisions enable row level security;
alter table drs_forward_private.reviewer_registration_decisions force row level security;
revoke all on drs_forward_private.reviewer_registration_operation_grants,
 drs_forward_private.operation_grant_events,drs_forward_private.reviewer_registration_decisions
 from public,anon,authenticated,service_role;

create function drs_forward_private.registration_append_only_v1()
 returns trigger language plpgsql set search_path='' as $function$
begin raise exception 'Append-only registration audit' using errcode='42501'; end;
$function$;
create trigger registration_decisions_append_only before update or delete or truncate
 on drs_forward_private.reviewer_registration_decisions for each statement
 execute function drs_forward_private.registration_append_only_v1();
create trigger registration_grant_events_append_only before update or delete or truncate
 on drs_forward_private.operation_grant_events for each statement
 execute function drs_forward_private.registration_append_only_v1();
create trigger registration_grants_no_delete before delete or truncate
 on drs_forward_private.reviewer_registration_operation_grants for each statement
 execute function drs_forward_private.registration_append_only_v1();

create function drs_forward_private.registration_operation_grant_event_v1()
 returns trigger language plpgsql security definer set search_path='' as $function$
begin
 if tg_op='UPDATE' and (new.grant_id<>old.grant_id or new.actor_user_id<>old.actor_user_id
 or new.operation<>old.operation or new.scope<>old.scope or new.version<>old.version+1) then
 raise exception 'Immutable grant identity and monotonic version required' using errcode='22023'; end if;
 insert into drs_forward_private.operation_grant_events(grant_id,grant_version,event_type,database_actor,granted_by,before_value,after_value)
 values(new.grant_id,new.version,case when tg_op='INSERT' then 'provisioned' when new.status='revoked' then 'revoked' else 'changed' end,
 session_user,new.granted_by,case when tg_op='UPDATE' then to_jsonb(old) else null end,to_jsonb(new));
 return new;
end;
$function$;
create trigger registration_operation_grant_event after insert or update
 on drs_forward_private.reviewer_registration_operation_grants for each row
 execute function drs_forward_private.registration_operation_grant_event_v1();

create function drs_forward_private.registration_error_v1(p_state text)
 returns jsonb language sql immutable set search_path='' as $function$
 select jsonb_build_object('schemaVersion','laibe.drs-reviewer-registration-governance.v1','state',p_state);
$function$;

-- Call only after acquiring the operation grant and every decision-specific blocking lock.
create function drs_forward_private.registration_actor_check_v1(p_actor uuid,p_session uuid,p_expiry timestamptz,p_grant uuid)
 returns text language plpgsql security definer set search_path='' as $function$
declare v_session auth.sessions%rowtype; v_grant drs_forward_private.reviewer_registration_operation_grants%rowtype; v_now timestamptz;
begin
 select * into v_session from auth.sessions where id=p_session and user_id=p_actor for share;
 select * into v_grant from drs_forward_private.reviewer_registration_operation_grants where grant_id=p_grant;
 v_now:=clock_timestamp();
 if v_session.id is null or p_expiry is null or not isfinite(p_expiry) or p_expiry<=v_now
 or (v_session.not_after is not null and v_session.not_after<=v_now) then return 'AUTH_REQUIRED'; end if;
 if v_grant.grant_id is null or v_grant.actor_user_id is distinct from p_actor
 or v_grant.operation<>'reviewer_registration_decide' or v_grant.scope<>'reviewer_registration'
 or v_grant.status<>'active' or v_grant.revoked_at is not null
 or v_grant.valid_from>v_now or v_grant.valid_until<=v_now then return 'REGISTRATION_OPERATION_NOT_AUTHORIZED'; end if;
 return null;
end;
$function$;

create function public.drs_reviewer_registration_queue_v1(
 p_actor_user_id uuid,p_auth_session_id uuid,p_jwt_expires_at timestamptz,
 p_cursor_submitted_at timestamptz default null,p_cursor_application_id uuid default null)
 returns jsonb language plpgsql security definer set search_path='' as $function$
declare v_grant uuid; v_error text; v_rows jsonb; v_next jsonb;
begin
 if current_setting('role',true) is distinct from 'service_role' then raise insufficient_privilege using message='service_role required';end if;
 if (p_cursor_submitted_at is null)<>(p_cursor_application_id is null) or (p_cursor_submitted_at is not null and not isfinite(p_cursor_submitted_at)) then
 return drs_forward_private.registration_error_v1('INVALID_REQUEST');end if;
 select grant_id into v_grant from drs_forward_private.reviewer_registration_operation_grants
 where actor_user_id=p_actor_user_id and operation='reviewer_registration_decide' and scope='reviewer_registration' for share;
 if v_grant is null then return drs_forward_private.registration_error_v1('REGISTRATION_OPERATION_NOT_AUTHORIZED');end if;
 lock table drs_forward_private.reviewer_self_applications,auth.users in access share mode;
 v_error:=drs_forward_private.registration_actor_check_v1(p_actor_user_id,p_auth_session_id,p_jwt_expires_at,v_grant);
 if v_error is not null then return drs_forward_private.registration_error_v1(v_error);end if;
 with candidates as materialized(
 select a.*,coalesce(u.email,'') account_email,(u.email_confirmed_at is not null) email_confirmed
 from drs_forward_private.reviewer_self_applications a left join auth.users u on u.id=a.user_id
 where a.status='pending' and (p_cursor_submitted_at is null or (a.submitted_at,a.application_id)>(p_cursor_submitted_at,p_cursor_application_id))
 order by a.submitted_at,a.application_id limit 26
 ), page as(select * from candidates order by submitted_at,application_id limit 25)
 select coalesce((select jsonb_agg(jsonb_build_object('applicationId',application_id,'version',version,'status',status,
 'submittedAt',submitted_at,'displayName',display_name,'organization',organization,'phone',phone,'accountEmail',account_email,'emailConfirmed',email_confirmed)
 order by submitted_at,application_id) from page),'[]'::jsonb),
 case when (select count(*) from candidates)>25 then
 (select jsonb_build_object('submittedAt',submitted_at,'applicationId',application_id) from page order by submitted_at desc,application_id desc limit 1)
 else null end into v_rows,v_next;
 return jsonb_build_object('schemaVersion','laibe.drs-reviewer-registration-governance.v1','state','REGISTRATION_QUEUE_READY','applications',v_rows,'nextCursor',v_next);
end;
$function$;

create function public.drs_reviewer_registration_decision_v1(
 p_actor_user_id uuid,p_auth_session_id uuid,p_jwt_expires_at timestamptz,
 p_application_id uuid,p_expected_version integer,p_decision text,p_reason text,
 p_idempotency_key uuid,p_binding_valid_until timestamptz)
 returns jsonb language plpgsql security definer set search_path='' as $function$
declare
 v_grant drs_forward_private.reviewer_registration_operation_grants%rowtype;
 v_application drs_forward_private.reviewer_self_applications%rowtype;
 v_user auth.users%rowtype;
 v_prior drs_forward_private.reviewer_registration_decisions%rowtype;
 v_error text;v_now timestamptz;v_digest text;v_receipt jsonb;
 v_specialist uuid;v_binding uuid;v_decision uuid:=gen_random_uuid();
begin
 if current_setting('role',true) is distinct from 'service_role' then raise insufficient_privilege using message='service_role required';end if;
 if p_actor_user_id is null or p_auth_session_id is null or p_application_id is null or p_idempotency_key is null
 or p_expected_version is null or p_expected_version<1 or p_expected_version>=2147483647
 or p_decision is null or p_decision not in ('approve','reject') or p_reason is null
 or char_length(p_reason) not between 1 and 500 or p_reason<>btrim(p_reason) or p_reason ~ '[[:cntrl:]]'
 or (p_decision='reject' and p_binding_valid_until is not null)
 or (p_decision='approve' and (p_binding_valid_until is null or not isfinite(p_binding_valid_until))) then
 return drs_forward_private.registration_error_v1('INVALID_REQUEST');end if;
 lock table drs_forward_private.specialists,drs_forward_private.auth_specialist_bindings,
 drs_forward_private.reviewer_registration_decisions in row exclusive mode;
 select * into v_grant from drs_forward_private.reviewer_registration_operation_grants
 where actor_user_id=p_actor_user_id and operation='reviewer_registration_decide' and scope='reviewer_registration' for update;
 if v_grant.grant_id is null then return drs_forward_private.registration_error_v1('REGISTRATION_OPERATION_NOT_AUTHORIZED');end if;
 select * into v_application from drs_forward_private.reviewer_self_applications where application_id=p_application_id for update;
 -- The existing binding FK takes a key-share lock on this same Auth identity during competing inserts.
 select * into v_user from auth.users where id=v_application.user_id for update;
 perform auth_binding_id from drs_forward_private.auth_specialist_bindings where authenticated_user_id=v_application.user_id for update;
 v_error:=drs_forward_private.registration_actor_check_v1(p_actor_user_id,p_auth_session_id,p_jwt_expires_at,v_grant.grant_id);
 v_now:=clock_timestamp();
 if v_error is not null then return drs_forward_private.registration_error_v1(v_error);end if;
 if v_application.user_id=p_actor_user_id then return drs_forward_private.registration_error_v1('SELF_APPROVAL_NOT_ALLOWED');end if;
 v_digest:=encode(sha256(convert_to(jsonb_build_object('applicationId',p_application_id,'expectedVersion',p_expected_version,
 'decision',p_decision,'reason',p_reason,'bindingValidUntil',p_binding_valid_until)::text,'UTF8')),'hex');
 select * into v_prior from drs_forward_private.reviewer_registration_decisions where actor_user_id=p_actor_user_id and idempotency_key=p_idempotency_key;
 if found then
 if v_prior.payload_digest<>v_digest then return drs_forward_private.registration_error_v1('IDEMPOTENCY_CONFLICT');end if;
 return jsonb_set(v_prior.receipt,'{replayed}','true'::jsonb);
 end if;
 if v_application.application_id is null or v_application.status<>'pending' or v_application.version<>p_expected_version then
 return drs_forward_private.registration_error_v1('APPLICATION_CONFLICT');end if;
 if p_decision='approve' then
 if p_binding_valid_until<=v_now or p_binding_valid_until>v_now+interval '365 days' then
 return drs_forward_private.registration_error_v1('INVALID_REQUEST');end if;
 if v_user.id is null or v_user.email is null or btrim(v_user.email)='' or v_user.email_confirmed_at is null
 or v_user.deleted_at is not null or (v_user.banned_until is not null and v_user.banned_until>v_now) then
 return drs_forward_private.registration_error_v1('APPLICANT_NOT_ELIGIBLE');end if;
 if exists(select 1 from drs_forward_private.auth_specialist_bindings where authenticated_user_id=v_application.user_id) then
 return drs_forward_private.registration_error_v1('EXISTING_IDENTITY_REQUIRES_REVIEW');end if;
 v_specialist:=gen_random_uuid();v_binding:=gen_random_uuid();
 insert into drs_forward_private.specialists(specialist_id,specialist_status,specialist_version) values(v_specialist,'active',1);
 insert into drs_forward_private.auth_specialist_bindings(auth_binding_id,authenticated_user_id,specialist_id,binding_status,binding_version,valid_from,valid_until)
 values(v_binding,v_user.id,v_specialist,'active',1,v_now,p_binding_valid_until);
 end if;
 update drs_forward_private.reviewer_self_applications set status=case when p_decision='approve' then 'approved' else 'rejected' end,version=version+1
 where application_id=p_application_id;
 v_receipt:=jsonb_build_object('schemaVersion','laibe.drs-reviewer-registration-governance.v1','state','REGISTRATION_DECIDED',
 'application',jsonb_build_object('applicationId',p_application_id,'status',case when p_decision='approve' then 'approved' else 'rejected' end,'version',v_application.version+1),
 'decision',jsonb_build_object('decisionId',v_decision,'outcome',p_decision,'decidedAt',v_now),
 'qualification',jsonb_build_object('effect',case when p_decision='approve' then 'granted' else 'not_granted' end,'validUntil',p_binding_valid_until),
 'caseAccessGranted',false,'replayed',false);
 insert into drs_forward_private.reviewer_registration_decisions(decision_id,actor_user_id,actor_auth_session_id,operation_grant_id,operation_grant_version,
 application_id,application_before_version,application_after_version,outcome,reason,idempotency_key,payload_digest,decided_at,new_specialist_id,new_auth_binding_id,receipt)
 values(v_decision,p_actor_user_id,p_auth_session_id,v_grant.grant_id,v_grant.version,p_application_id,v_application.version,v_application.version+1,
 p_decision,p_reason,p_idempotency_key,v_digest,v_now,v_specialist,v_binding,v_receipt);
 return v_receipt;
end;
$function$;

revoke all on function drs_forward_private.registration_append_only_v1(),
 drs_forward_private.registration_operation_grant_event_v1(),
 drs_forward_private.registration_error_v1(text),
 drs_forward_private.registration_actor_check_v1(uuid,uuid,timestamptz,uuid)
 from public,anon,authenticated,service_role;
revoke all on function public.drs_reviewer_registration_queue_v1(uuid,uuid,timestamptz,timestamptz,uuid),
 public.drs_reviewer_registration_decision_v1(uuid,uuid,timestamptz,uuid,integer,text,text,uuid,timestamptz)
 from public,anon,authenticated;
grant execute on function public.drs_reviewer_registration_queue_v1(uuid,uuid,timestamptz,timestamptz,uuid),
 public.drs_reviewer_registration_decision_v1(uuid,uuid,timestamptz,uuid,integer,text,text,uuid,timestamptz) to service_role;

comment on table drs_forward_private.reviewer_registration_operation_grants is
 'Controlled provision only; no seed or grant endpoint. Row changes append operation_grant_events. This operation grants no case access.';
comment on table drs_forward_private.reviewer_registration_decisions is
 'Immutable decision history. Qualification effect is historical and never proves current qualification or case authority.';
commit;
