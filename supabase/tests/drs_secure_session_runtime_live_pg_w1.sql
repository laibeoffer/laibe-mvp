\set QUIET 1
\pset pager off
\pset tuples_only on
\pset format unaligned

\if :{?a17_phase}
\else
  \echo A17_S1AR_SQL_PHASE_REQUIRED
  \quit 3
\endif

select :'a17_phase' = 'catalog-lifecycle' as a17_phase_ok \gset
\if :a17_phase_ok
\else
  \echo A17_S1AR_SQL_PHASE_REJECTED
  \quit 3
\endif

-- MIG / CAT / RLS / ACL: prove the live catalog before exercising functions.
create temporary table expected_constraint_definitions (
  constraint_name text primary key,
  definition text not null
) on commit preserve rows;
insert into expected_constraint_definitions (constraint_name, definition) values
  ('drs_server_sessions_pkey', 'PRIMARY KEY (server_session_id)'),
  ('drs_server_sessions_access_token_digest_check', 'CHECK ((access_token_digest ~ ''^[A-Za-z0-9_-]{43}$''::text))'),
  ('drs_server_sessions_authenticated_user_id_fkey', 'FOREIGN KEY (authenticated_user_id) REFERENCES auth.users(id) ON DELETE RESTRICT'),
  ('drs_server_sessions_specialist_id_fkey', 'FOREIGN KEY (specialist_id) REFERENCES drs_specialists(specialist_id) ON DELETE RESTRICT'),
  ('drs_server_sessions_check', 'CHECK ((authorization_subject = (''drs-specialist:''::text || (specialist_id)::text)))'),
  ('drs_server_sessions_check1', 'CHECK ((expires_at > issued_at))'),
  ('drs_server_sessions_check2', 'CHECK ((expires_at <= (issued_at + ''00:15:00''::interval)))'),
  ('drs_server_sessions_check3', 'CHECK (((revoked_at IS NULL) OR (revoked_at >= issued_at)))');

create temporary table expected_partial_indexes (
  index_name text primary key,
  definition text not null
) on commit preserve rows;
insert into expected_partial_indexes (index_name, definition) values
  ('drs_server_sessions_authenticated_user_active_idx', 'CREATE INDEX drs_server_sessions_authenticated_user_active_idx ON integration.drs_server_sessions USING btree (authenticated_user_id, expires_at) WHERE (revoked_at IS NULL)'),
  ('drs_server_sessions_specialist_active_idx', 'CREATE INDEX drs_server_sessions_specialist_active_idx ON integration.drs_server_sessions USING btree (specialist_id, expires_at) WHERE (revoked_at IS NULL)'),
  ('drs_server_sessions_active_expiry_idx', 'CREATE INDEX drs_server_sessions_active_expiry_idx ON integration.drs_server_sessions USING btree (expires_at) WHERE (revoked_at IS NULL)');

create temporary table expected_column_metadata (
  ordinal smallint primary key,
  column_name text not null,
  format_type text not null,
  attnotnull boolean not null,
  default_expression text,
  identity_kind text not null,
  generated_kind text not null
) on commit preserve rows;
insert into expected_column_metadata (
  ordinal, column_name, format_type, attnotnull, default_expression,
  identity_kind, generated_kind
) values
  (1, 'server_session_id', 'uuid', true, null, '', ''),
  (2, 'access_token_digest', 'text', true, null, '', ''),
  (3, 'authenticated_user_id', 'uuid', true, null, '', ''),
  (4, 'specialist_id', 'uuid', true, null, '', ''),
  (5, 'authorization_subject', 'text', true, null, '', ''),
  (6, 'issued_at', 'timestamp with time zone', true, null, '', ''),
  (7, 'expires_at', 'timestamp with time zone', true, null, '', ''),
  (8, 'revoked_at', 'timestamp with time zone', false, null, '', '');

do $a17_catalog$
declare
  v_columns text[];
  v_acl jsonb;
  v_function record;
begin
  if not exists (
    select 1
    from supabase_migrations.schema_migrations
    where version = '20260827140000'
  ) then
    raise exception 'A17_MIG_MISSING';
  end if;

  if not exists (
    select 1
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'integration'
      and c.relname = 'drs_server_sessions'
      and c.relkind = 'r'
  ) then
    raise exception 'A17_CAT_RLS_TABLE_CONTRACT_FAILED';
  end if;
  if exists (
    select 1
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'integration'
      and c.relname = 'drs_server_sessions'
      and (
        pg_get_userbyid(c.relowner) is distinct from 'postgres'
        or coalesce(c.relrowsecurity, false) is distinct from true
        or coalesce(c.relforcerowsecurity, false) is distinct from true
      )
  ) then
    raise exception 'A17_CAT_RLS_OWNER_FLAGS_FAILED';
  end if;

  if exists (
    select 1
    from pg_policies
    where schemaname = 'integration'
      and tablename = 'drs_server_sessions'
  ) then
    raise exception 'A17_RLS_ZERO_POLICIES_FAILED';
  end if;

  select array_agg(a.attname order by a.attnum)
  into v_columns
  from pg_attribute a
  where a.attrelid = 'integration.drs_server_sessions'::regclass
    and a.attnum > 0
    and not a.attisdropped;

  if v_columns is distinct from array[
    'server_session_id',
    'access_token_digest',
    'authenticated_user_id',
    'specialist_id',
    'authorization_subject',
    'issued_at',
    'expires_at',
    'revoked_at'
  ]::text[] then
    raise exception 'A17_CAT_DIGEST_ONLY_COLUMNS_FAILED';
  end if;

  if exists (
    (select ordinal, column_name, format_type, attnotnull, default_expression,
            identity_kind, generated_kind
     from expected_column_metadata)
    except
    (select a.attnum::smallint, a.attname, pg_catalog.format_type(a.atttypid, a.atttypmod),
            coalesce(a.attnotnull, false), pg_get_expr(d.adbin, d.adrelid),
            coalesce(a.attidentity::text, ''), coalesce(a.attgenerated::text, '')
     from pg_attribute a
     left join pg_attrdef d on d.adrelid = a.attrelid and d.adnum = a.attnum
     where a.attrelid = 'integration.drs_server_sessions'::regclass
       and a.attnum > 0 and coalesce(a.attisdropped, false) is distinct from true)
  ) or exists (
    (select a.attnum::smallint, a.attname, pg_catalog.format_type(a.atttypid, a.atttypmod),
            coalesce(a.attnotnull, false), pg_get_expr(d.adbin, d.adrelid),
            coalesce(a.attidentity::text, ''), coalesce(a.attgenerated::text, '')
     from pg_attribute a
     left join pg_attrdef d on d.adrelid = a.attrelid and d.adnum = a.attnum
     where a.attrelid = 'integration.drs_server_sessions'::regclass
       and a.attnum > 0 and coalesce(a.attisdropped, false) is distinct from true)
    except
    (select ordinal, column_name, format_type, attnotnull, default_expression,
            identity_kind, generated_kind
     from expected_column_metadata)
  ) then
    raise exception 'A17_CAT_COLUMN_METADATA_CONTRACT_FAILED';
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'integration'
      and table_name = 'drs_server_sessions'
      and column_name in (
        'access_token', 'cookie', 'proof', 'encryption_key', 'signing_key',
        'case_id', 'grant_id', 'bucket', 'path'
      )
  ) then
    raise exception 'A17_CAT_FORBIDDEN_SECRET_OR_AUTHORITY_COLUMN';
  end if;

  select coalesce(
    jsonb_object_agg(
      coalesce(r.rolname, 'PUBLIC'),
      x.privilege_type
      order by coalesce(r.rolname, 'PUBLIC'), x.privilege_type
    ),
    '{}'::jsonb
  )
  into v_acl
  from pg_class c
  left join lateral aclexplode(coalesce(c.relacl, acldefault('r', c.relowner))) x
    on true
  left join pg_roles r on r.oid = x.grantee
  where c.oid = 'integration.drs_server_sessions'::regclass
    and coalesce(r.rolname, 'PUBLIC') in (
      'PUBLIC', 'anon', 'authenticated', 'service_role'
    );

  if v_acl is distinct from '{}'::jsonb
    or exists (
      with effective_privilege_matrix(role_name, privilege_name) as (
        select roles.role_name, privileges.privilege_name
        from (values ('anon'), ('authenticated'), ('service_role'))
          as roles(role_name)
        cross join (values ('SELECT'), ('INSERT'), ('UPDATE'), ('DELETE'))
          as privileges(privilege_name)
      )
      select 1
      from effective_privilege_matrix
      where has_table_privilege(
        role_name,
        'integration.drs_server_sessions',
        privilege_name
      )
    )
  then
    raise exception 'A17_ACL_TABLE_LEAST_PRIVILEGE_FAILED';
  end if;

  if (select count(*) from expected_partial_indexes) is distinct from 3
    or exists (
      (select index_name, definition from expected_partial_indexes)
      except
      (select c.relname, pg_get_indexdef(i.indexrelid)
       from pg_index i join pg_class c on c.oid = i.indexrelid
       where i.indrelid = 'integration.drs_server_sessions'::regclass
         and i.indisprimary is distinct from true)
    ) or exists (
      (select c.relname, pg_get_indexdef(i.indexrelid)
       from pg_index i join pg_class c on c.oid = i.indexrelid
       where i.indrelid = 'integration.drs_server_sessions'::regclass
         and i.indisprimary is distinct from true)
      except
      (select index_name, definition from expected_partial_indexes)
    ) then
    raise exception 'A17_CAT_INDEX_CONTRACT_FAILED';
  end if;

  if exists (
    (select constraint_name, definition from expected_constraint_definitions)
    except
    (select con.conname, pg_get_constraintdef(con.oid)
     from pg_constraint con
     where con.conrelid = 'integration.drs_server_sessions'::regclass)
  ) or exists (
    (select con.conname, pg_get_constraintdef(con.oid)
     from pg_constraint con
     where con.conrelid = 'integration.drs_server_sessions'::regclass)
    except
    (select constraint_name, definition from expected_constraint_definitions)
  ) then
    raise exception 'A17_CAT_CONSTRAINT_CONTRACT_FAILED';
  end if;

  for v_function in
    select
      p.oid,
      p.proname,
      pg_get_userbyid(p.proowner) as owner_name,
      p.prosecdef,
      p.proconfig
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.oid in (
        'public.drs_server_session_issue_v1(uuid,text,uuid,uuid,text,timestamptz,timestamptz)'::regprocedure,
        'public.drs_server_session_verify_v1(uuid,text)'::regprocedure,
        'public.drs_server_session_revoke_v1(uuid,text)'::regprocedure
      )
  loop
    if v_function.owner_name is distinct from 'postgres'
      or coalesce(v_function.prosecdef, false) is distinct from true
      or coalesce(v_function.proconfig @> array['search_path=""'], false) is distinct from true
      or exists (
        select 1
        from aclexplode(
          coalesce(
            (select p2.proacl from pg_proc p2 where p2.oid = v_function.oid),
            acldefault('f',
              (select p2.proowner from pg_proc p2 where p2.oid = v_function.oid)
            )
          )
        ) x
        where x.grantee = 0 and x.privilege_type = 'EXECUTE'
      )
      or has_function_privilege('anon', v_function.oid, 'EXECUTE')
      or has_function_privilege('authenticated', v_function.oid, 'EXECUTE')
      or not has_function_privilege('service_role', v_function.oid, 'EXECUTE')
    then
      raise exception 'A17_ACL_FUNCTION_CONTRACT_FAILED:%', v_function.proname;
    end if;
  end loop;

  if (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public' and p.proname in (
        'drs_server_session_issue_v1',
        'drs_server_session_verify_v1',
        'drs_server_session_revoke_v1'
      )) is distinct from 3 then
    raise exception 'A17_CAT_EXACT_THREE_FUNCTIONS_FAILED';
  end if;
end;
$a17_catalog$;

-- ISS / REV / EXP / REPLAY / TAMPER / JSON / SAN use task-owned UUIDs only.
create temporary table before_function_definitions on commit preserve rows as
select p.oid, pg_get_functiondef(p.oid) as definition
from pg_proc p
where p.oid in (
  'integration.drs_identity_authority_resolve_locked_v1(uuid,uuid,text)'::regprocedure,
  'public.drs_server_session_issue_v1(uuid,text,uuid,uuid,text,timestamptz,timestamptz)'::regprocedure,
  'public.drs_server_session_verify_v1(uuid,text)'::regprocedure,
  'public.drs_server_session_revoke_v1(uuid,text)'::regprocedure
);

begin;
set local statement_timeout = '15s';
set local lock_timeout = '5s';
set local session_replication_role = replica;

create or replace function integration.drs_identity_authority_resolve_locked_v1(
  p_authenticated_user_id uuid,
  p_expected_case_id uuid,
  p_authorization_subject text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $a17_shim$
declare
  v_mode text := current_setting('a17.authority_json_mode', true);
  v_exact jsonb := jsonb_build_object(
    'authorized', true,
    'authenticated_user_id', p_authenticated_user_id::text,
    'specialist_id', 'a1700000-0000-4000-8000-00000000000a',
    'assignment_id', 'a1700000-0000-4000-8000-000000000011',
    'selected_case_id', 'a1700000-0000-4000-8000-000000000021',
    'account_role', 'drs',
    'authorization_subject', p_authorization_subject,
    'auth_binding_status', 'active',
    'specialist_status', 'active',
    'assignment_status', 'active',
    'valid_from', clock_timestamp() - interval '1 minute',
    'valid_until', clock_timestamp() + interval '10 minutes',
    'terminated_at', null,
    'lock_status', 'locked'
  );
begin
  return case v_mode
    when 'null-lock' then jsonb_set(v_exact, '{lock_status}', 'null'::jsonb)
    when 'authorized-json-null' then jsonb_set(v_exact, '{authorized}', 'null'::jsonb)
    when 'authenticated-user-id-json-null' then jsonb_set(v_exact, '{authenticated_user_id}', 'null'::jsonb)
    when 'specialist-id-json-null' then jsonb_set(v_exact, '{specialist_id}', 'null'::jsonb)
    when 'assignment-id-json-null' then jsonb_set(v_exact, '{assignment_id}', 'null'::jsonb)
    when 'selected-case-id-json-null' then jsonb_set(v_exact, '{selected_case_id}', 'null'::jsonb)
    when 'account-role-json-null' then jsonb_set(v_exact, '{account_role}', 'null'::jsonb)
    when 'authorization-subject-json-null' then jsonb_set(v_exact, '{authorization_subject}', 'null'::jsonb)
    when 'auth-binding-status-json-null' then jsonb_set(v_exact, '{auth_binding_status}', 'null'::jsonb)
    when 'specialist-status-json-null' then jsonb_set(v_exact, '{specialist_status}', 'null'::jsonb)
    when 'assignment-status-json-null' then jsonb_set(v_exact, '{assignment_status}', 'null'::jsonb)
    when 'valid-from-json-null' then jsonb_set(v_exact, '{valid_from}', 'null'::jsonb)
    when 'valid-until-json-null' then jsonb_set(v_exact, '{valid_until}', 'null'::jsonb)
    when 'lock-status-json-null' then jsonb_set(v_exact, '{lock_status}', 'null'::jsonb)
    when 'invalid-status' then jsonb_set(v_exact, '{auth_binding_status}', '"suspended"'::jsonb)
    when 'invalid-subject' then jsonb_set(v_exact, '{authorization_subject}', '"drs-specialist:invalid"'::jsonb)
    when 'invalid-time' then jsonb_set(v_exact, '{valid_until}', '"not-a-time"'::jsonb)
    when 'extra-key' then v_exact || jsonb_build_object('browser_case_id', p_expected_case_id)
    when 'missing-key' then v_exact - 'assignment_id'
    when 'rotated-specialist' then jsonb_set(
      v_exact,
      '{specialist_id}',
      to_jsonb('a1700000-0000-4000-8000-00000000000b'::text)
    )
    else v_exact
  end;
end;
$a17_shim$;

alter function integration.drs_identity_authority_resolve_locked_v1(
  uuid, uuid, text
) owner to postgres;

create function pg_temp.a17_expect_issue_rejected(
  p_mode text,
  p_session_id uuid
)
returns void
language plpgsql
set search_path = ''
as $a17_expect$
begin
  perform set_config('a17.authority_json_mode', p_mode, true);
  begin
    perform public.drs_server_session_issue_v1(
      p_session_id,
      repeat('A', 43),
      'a1700000-0000-4000-8000-000000000001',
      'a1700000-0000-4000-8000-00000000000a',
      'drs-specialist:a1700000-0000-4000-8000-00000000000a',
      clock_timestamp(),
      clock_timestamp() + interval '5 minutes'
    );
    raise exception 'A17_JSON_SHIM_ACCEPTED:%', p_mode;
  exception
    when sqlstate 'P0001' then
      if sqlerrm is distinct from 'DRS_SESSION_ISSUE_REJECTED' then
        raise;
      end if;
  end;
end;
$a17_expect$;

select pg_temp.a17_expect_issue_rejected(
  'null-lock', 'a1700000-0000-4000-8000-000000000101'
);
select pg_temp.a17_expect_issue_rejected(
  'extra-key', 'a1700000-0000-4000-8000-000000000102'
);
select pg_temp.a17_expect_issue_rejected(
  'missing-key', 'a1700000-0000-4000-8000-000000000103'
);
select pg_temp.a17_expect_issue_rejected(
  'rotated-specialist', 'a1700000-0000-4000-8000-000000000104'
);
select pg_temp.a17_expect_issue_rejected('authorized-json-null', 'a1700000-0000-4000-8000-000000000105');
select pg_temp.a17_expect_issue_rejected('authenticated-user-id-json-null', 'a1700000-0000-4000-8000-000000000106');
select pg_temp.a17_expect_issue_rejected('specialist-id-json-null', 'a1700000-0000-4000-8000-000000000107');
select pg_temp.a17_expect_issue_rejected('assignment-id-json-null', 'a1700000-0000-4000-8000-000000000108');
select pg_temp.a17_expect_issue_rejected('selected-case-id-json-null', 'a1700000-0000-4000-8000-000000000109');
select pg_temp.a17_expect_issue_rejected('account-role-json-null', 'a1700000-0000-4000-8000-00000000010a');
select pg_temp.a17_expect_issue_rejected('authorization-subject-json-null', 'a1700000-0000-4000-8000-00000000010b');
select pg_temp.a17_expect_issue_rejected('auth-binding-status-json-null', 'a1700000-0000-4000-8000-00000000010c');
select pg_temp.a17_expect_issue_rejected('specialist-status-json-null', 'a1700000-0000-4000-8000-00000000010d');
select pg_temp.a17_expect_issue_rejected('assignment-status-json-null', 'a1700000-0000-4000-8000-00000000010e');
select pg_temp.a17_expect_issue_rejected('valid-from-json-null', 'a1700000-0000-4000-8000-00000000010f');
select pg_temp.a17_expect_issue_rejected('valid-until-json-null', 'a1700000-0000-4000-8000-000000000110');
select pg_temp.a17_expect_issue_rejected('lock-status-json-null', 'a1700000-0000-4000-8000-000000000113');
select pg_temp.a17_expect_issue_rejected('invalid-status', 'a1700000-0000-4000-8000-000000000114');
select pg_temp.a17_expect_issue_rejected('invalid-subject', 'a1700000-0000-4000-8000-000000000115');
select pg_temp.a17_expect_issue_rejected('invalid-time', 'a1700000-0000-4000-8000-000000000116');

select set_config('a17.authority_json_mode', 'exact', true);

do $a17_lifecycle$
declare
  v_issue jsonb;
  v_verify jsonb;
  v_revoke jsonb;
begin
  v_issue := public.drs_server_session_issue_v1(
    'a1700000-0000-4000-8000-000000000111',
    repeat('B', 43),
    'a1700000-0000-4000-8000-000000000001',
    'a1700000-0000-4000-8000-00000000000a',
    'drs-specialist:a1700000-0000-4000-8000-00000000000a',
    clock_timestamp(),
    clock_timestamp() + interval '5 minutes'
  );
  if v_issue ->> 'server_session_id' is distinct from 'a1700000-0000-4000-8000-000000000111'
    or v_issue ?& array['server_session_id', 'expires_at'] is not true
    or v_issue - array['server_session_id', 'expires_at'] is distinct from '{}'::jsonb
  then
    raise exception 'A17_ISS_PROJECTION_FAILED';
  end if;

  v_verify := public.drs_server_session_verify_v1(
    'a1700000-0000-4000-8000-000000000111',
    repeat('B', 43)
  );
  if v_verify ->> 'authenticated_user_id' is distinct from 'a1700000-0000-4000-8000-000000000001'
    or v_verify ->> 'specialist_id' is distinct from 'a1700000-0000-4000-8000-00000000000a'
    or v_verify ?& array[
      'authenticated_user_id', 'specialist_id', 'authorization_subject', 'expires_at'
    ] is not true
    or v_verify - array[
      'authenticated_user_id', 'specialist_id', 'authorization_subject', 'expires_at'
    ] is distinct from '{}'::jsonb
  then
    raise exception 'A17_VERIFY_PROJECTION_FAILED';
  end if;

  begin
    perform public.drs_server_session_verify_v1(
      'a1700000-0000-4000-8000-000000000111', repeat('C', 43)
    );
    raise exception 'A17_TAMPER_ACCEPTED';
  exception
    when sqlstate 'P0001' then
      if sqlerrm is distinct from 'DRS_SESSION_VERIFY_REJECTED' then raise; end if;
  end;

  begin
    perform public.drs_server_session_issue_v1(
      'a1700000-0000-4000-8000-000000000111',
      repeat('B', 43),
      'a1700000-0000-4000-8000-000000000001',
      'a1700000-0000-4000-8000-00000000000a',
      'drs-specialist:a1700000-0000-4000-8000-00000000000a',
      clock_timestamp(),
      clock_timestamp() + interval '5 minutes'
    );
    raise exception 'A17_REPLAY_ACCEPTED';
  exception
    when sqlstate 'P0001' then
      if sqlerrm is distinct from 'DRS_SESSION_ISSUE_REJECTED' then raise; end if;
  end;

  v_revoke := public.drs_server_session_revoke_v1(
    'a1700000-0000-4000-8000-000000000111', repeat('B', 43)
  );
  if v_revoke is distinct from '{"revoked": true}'::jsonb then
    raise exception 'A17_REV_FIRST_FAILED';
  end if;
  if public.drs_server_session_revoke_v1(
    'a1700000-0000-4000-8000-000000000111', repeat('B', 43)
  ) is distinct from '{"revoked": false}'::jsonb then
    raise exception 'A17_REV_REPLAY_FAILED';
  end if;

  insert into integration.drs_server_sessions (
    server_session_id,
    access_token_digest,
    authenticated_user_id,
    specialist_id,
    authorization_subject,
    issued_at,
    expires_at
  ) values (
    'a1700000-0000-4000-8000-000000000112',
    repeat('D', 43),
    'a1700000-0000-4000-8000-000000000001',
    'a1700000-0000-4000-8000-00000000000a',
    'drs-specialist:a1700000-0000-4000-8000-00000000000a',
    clock_timestamp() - interval '2 minutes',
    clock_timestamp() - interval '1 minute'
  );
  if public.drs_server_session_revoke_v1(
    'a1700000-0000-4000-8000-000000000112', repeat('D', 43)
  ) is distinct from '{"revoked": false}'::jsonb then
    raise exception 'A17_EXP_REVOKE_ACCEPTED';
  end if;
  begin
    perform public.drs_server_session_verify_v1(
      'a1700000-0000-4000-8000-000000000112', repeat('D', 43)
    );
    raise exception 'A17_EXP_VERIFY_ACCEPTED';
  exception
    when sqlstate 'P0001' then
      if sqlerrm is distinct from 'DRS_SESSION_VERIFY_REJECTED' then raise; end if;
  end;

  delete from integration.drs_server_sessions
  where server_session_id in (
    'a1700000-0000-4000-8000-000000000111',
    'a1700000-0000-4000-8000-000000000112'
  );
  if not found then
    raise exception 'A17_CLEAN_SEED_DELETE_FAILED';
  end if;
end;
$a17_lifecycle$;

rollback;

create temporary table after_function_definitions on commit preserve rows as
select p.oid, pg_get_functiondef(p.oid) as definition
from pg_proc p
where p.oid in (select oid from before_function_definitions);
do $a17_function_identity$
begin
  if exists (
    select 1 from before_function_definitions b
    full join after_function_definitions a using (oid)
    where b.definition is distinct from a.definition
  ) then
    raise exception 'A17_FUNCTION_IDENTITY_NOT_TRANSACTION_LOCAL';
  end if;
end;
$a17_function_identity$;

do $a17_clean$
begin
  if exists (
    select 1
    from integration.drs_server_sessions
    where server_session_id::text like 'a1700000-0000-4000-8000-%'
  ) then
    raise exception 'A17_CLEAN_READBACK_FAILED';
  end if;
end;
$a17_clean$;

\echo A17_S1AR_SQL_MIG_CAT_RLS_ACL_ISS_REV_EXP_REPLAY_TAMPER_JSON_SAN_CLEAN_PASS
