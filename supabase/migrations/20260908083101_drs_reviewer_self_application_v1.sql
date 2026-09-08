begin;

create schema if not exists drs_forward_private;
create table drs_forward_private.reviewer_self_applications (
  application_id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique,
  display_name text not null check (char_length(display_name) between 1 and 80 and display_name !~ '[[:cntrl:]]'),
  organization text not null check (char_length(organization) <= 160 and organization !~ '[[:cntrl:]]'),
  phone text not null check (char_length(phone) <= 32 and phone !~ '[[:cntrl:]]'),
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  version integer not null default 1 check (version >= 1),
  submitted_at timestamptz not null default clock_timestamp()
);
comment on table drs_forward_private.reviewer_self_applications is
  'Self-reported application history only; contact fields are unverified and status is not current reviewer qualification.';
alter table drs_forward_private.reviewer_self_applications enable row level security;
alter table drs_forward_private.reviewer_self_applications force row level security;
revoke all on table drs_forward_private.reviewer_self_applications from public, anon, authenticated, service_role;

create function public.drs_reviewer_self_application_v1(
  p_authenticated_user_id uuid,
  p_auth_session_id uuid,
  p_jwt_expires_at timestamptz,
  p_create boolean,
  p_display_name text default null,
  p_organization text default null,
  p_phone text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_not_after timestamptz;
  v_now timestamptz;
  v_application drs_forward_private.reviewer_self_applications%rowtype;
  v_created boolean := false;
begin
  if current_setting('role', true) is distinct from 'service_role' then
    raise insufficient_privilege using message = 'service_role required';
  end if;
  select s.not_after into v_not_after from auth.sessions s
    where s.id=p_auth_session_id and s.user_id=p_authenticated_user_id for share;
  v_now := clock_timestamp();
  if not found or p_jwt_expires_at is null or not isfinite(p_jwt_expires_at)
    or p_jwt_expires_at <= v_now or (v_not_after is not null and v_not_after <= v_now) then
    return jsonb_build_object('schemaVersion','laibe.drs-reviewer-self-application.v1','state','AUTH_REQUIRED');
  end if;
  if p_create is null then raise invalid_parameter_value using message='Invalid self application request'; end if;
  if p_create then
    if p_display_name is null or p_organization is null or p_phone is null
      or char_length(btrim(p_display_name)) not between 1 and 80
      or char_length(btrim(p_organization)) > 160 or char_length(btrim(p_phone)) > 32
      or p_display_name ~ '[[:cntrl:]]' or p_organization ~ '[[:cntrl:]]' or p_phone ~ '[[:cntrl:]]'
    then raise invalid_parameter_value using message='Invalid contact fields'; end if;
    insert into drs_forward_private.reviewer_self_applications(user_id,display_name,organization,phone)
      values(p_authenticated_user_id,btrim(p_display_name),btrim(p_organization),btrim(p_phone))
      on conflict(user_id) do nothing returning * into v_application;
    v_created := found;
  elsif p_display_name is not null or p_organization is not null or p_phone is not null then
    raise invalid_parameter_value using message='GET accepts no contact fields';
  end if;
  if not v_created then
    select * into v_application from drs_forward_private.reviewer_self_applications where user_id=p_authenticated_user_id;
  end if;
  if v_application.application_id is null then
    return jsonb_build_object('schemaVersion','laibe.drs-reviewer-self-application.v1','state','NO_APPLICATION','application',null,'created',false);
  end if;
  return jsonb_build_object(
    'schemaVersion','laibe.drs-reviewer-self-application.v1',
    'state','APPLICATION_'||upper(v_application.status),
    'application',jsonb_build_object('applicationId',v_application.application_id,'submittedAt',v_application.submitted_at,'status',v_application.status),
    'created',v_created
  );
end;
$function$;
revoke all on function public.drs_reviewer_self_application_v1(uuid,uuid,timestamptz,boolean,text,text,text) from public,anon,authenticated;
grant execute on function public.drs_reviewer_self_application_v1(uuid,uuid,timestamptz,boolean,text,text,text) to service_role;
commit;
