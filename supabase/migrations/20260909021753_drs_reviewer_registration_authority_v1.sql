begin;

create function public.drs_reviewer_registration_authority_v1()
returns jsonb language plpgsql stable security definer set search_path = '' as $function$
begin
  if current_setting('role', true) is distinct from 'service_role' then
    raise insufficient_privilege using message = 'service_role required';
  end if;
  return jsonb_build_object('configured', exists (
    select 1
    from drs_forward_private.reviewer_registration_operation_grants g
    join auth.users u on u.id = g.actor_user_id
    where g.operation = 'reviewer_registration_decide'
      and g.scope = 'reviewer_registration'
      and g.status = 'active' and g.revoked_at is null
      and g.valid_from <= statement_timestamp() and g.valid_until > statement_timestamp()
      and u.email is not null and btrim(u.email) <> ''
      and u.email_confirmed_at is not null and u.deleted_at is null
      and (u.banned_until is null or u.banned_until <= statement_timestamp())
  ));
end;
$function$;

revoke all on function public.drs_reviewer_registration_authority_v1() from public, anon, authenticated;
grant execute on function public.drs_reviewer_registration_authority_v1() to service_role;
comment on function public.drs_reviewer_registration_authority_v1() is
  'Read-only registration-review configuration status. No account, operator, application or case data is returned; no authority is granted.';

commit;
