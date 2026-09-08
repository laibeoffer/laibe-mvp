begin;

do $guard$
declare
  v_expected record;
  v_matches boolean;
begin
  for v_expected in
    select *
    from (values
      (
        'public.owner_workspace_grant_v1(uuid)',
        'a1b0cb85290c337d4e623ec118101e2e',
        'sql',
        false,
        array['p_authenticated_user_id']::text[]
      ),
      (
        'public.vendor_workspace_grant_v1(uuid)',
        '68b1156d82fb7cfe64a428a86275b1c4',
        'sql',
        false,
        array['p_authenticated_user_id']::text[]
      ),
      (
        'casework.account_workspace_grant_resolve_v1(uuid,text)',
        'd6b2a70d680e3c86d767bbf9d58a055e',
        'plpgsql',
        true,
        array['p_authenticated_user_id', 'p_expected_role']::text[]
      )
    ) as expected(signature, body_md5, language_name, security_definer, argument_names)
  loop
    select coalesce(pg_catalog.bool_and(
      pg_catalog.md5(p.prosrc) = v_expected.body_md5
      and r.rolname = 'postgres'
      and l.lanname = v_expected.language_name
      and p.prosecdef = v_expected.security_definer
      and p.proconfig = array['search_path=""']::text[]
      and p.proacl::text = '{postgres=X/postgres,service_role=X/postgres}'
      and p.provolatile = 'v'
      and p.prokind = 'f'
      and p.prorettype = 'pg_catalog.jsonb'::pg_catalog.regtype
      and p.proargnames = v_expected.argument_names
    ), false)
    into v_matches
    from pg_catalog.pg_proc p
    join pg_catalog.pg_roles r on r.oid = p.proowner
    join pg_catalog.pg_language l on l.oid = p.prolang
    where p.oid = pg_catalog.to_regprocedure(v_expected.signature);

    if not v_matches then
      raise exception using
        errcode = '55000',
        message = 'ACCOUNT_WORKSPACE_RPC_EXECUTION_DRIFT: ' || v_expected.signature;
    end if;
  end loop;

  if pg_catalog.has_schema_privilege('service_role', 'casework', 'USAGE')
    is distinct from false
  then
    raise exception using
      errcode = '55000',
      message = 'ACCOUNT_WORKSPACE_RPC_EXECUTION_DRIFT: casework service_role USAGE';
  end if;
end;
$guard$;

-- Preserve the existing bodies, owner, fixed search_path and service-only ACL.
-- The owner executes each wrapper's private-schema call without exposing that schema.
alter function public.owner_workspace_grant_v1(uuid) security definer;
alter function public.vendor_workspace_grant_v1(uuid) security definer;

commit;
