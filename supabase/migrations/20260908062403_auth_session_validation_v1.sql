begin;

create function public.auth_session_validation_v1(
  p_authenticated_user_id uuid,
  p_auth_session_id uuid
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $function$
begin
  -- PostgREST selects the caller role before entering this privileged lookup.
  if current_setting('role', true) is distinct from 'service_role' then
    raise insufficient_privilege using message = 'service_role required';
  end if;

  return jsonb_build_object(
    'schemaVersion', 'laibe.auth-session-validation.v1',
    'active', exists (
      select 1
      from auth.sessions as session
      where session.id = p_auth_session_id
        and session.user_id = p_authenticated_user_id
        and (session.not_after is null or session.not_after > statement_timestamp())
    )
  );
end;
$function$;

revoke all on function public.auth_session_validation_v1(uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.auth_session_validation_v1(uuid, uuid)
  to service_role;

commit;
