import assert from "node:assert/strict";
import { readFile, realpath } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import test from "node:test";
import process from "node:process";

const psql = process.env.DRS_AUTH_S2_PSQL;
const port = process.env.DRS_AUTH_S2_PG_PORT;
const enabled = process.env.DRS_AUTH_S2_ALLOW_DISPOSABLE === "1";
const database = "laibe_auth_session_s2_disposable";
const oldCoreDefinitions =
  "CREATE OR REPLACE FUNCTION drs_forward_private.drs_identity_authority_resolve_locked_v1(p_authenticated_user_id uuid, p_expected_case_id uuid, p_authorization_subject text)\n RETURNS jsonb\n LANGUAGE plpgsql\n SECURITY DEFINER\n SET search_path TO ''\nAS $function$\ndeclare\n  v_now timestamptz := clock_timestamp();\n  v_authority record;\n  v_count integer;\nbegin\n  if p_authenticated_user_id is null then\n    return jsonb_build_object('authorized', false, 'state', 'AUTH_REQUIRED');\n  end if;\n\n  select count(*) into v_count\n  from drs_forward_private.reviewer_case_authorities authority_record\n  join drs_forward_private.auth_specialist_bindings auth_binding\n    on auth_binding.authenticated_user_id = authority_record.user_id\n   and auth_binding.specialist_id = authority_record.specialist_id\n   and auth_binding.binding_status = 'active'\n   and auth_binding.revoked_at is null\n   and auth_binding.valid_from <= v_now\n   and auth_binding.valid_until > v_now\n  join drs_forward_private.identity_provider_bindings provider_binding\n    on provider_binding.authenticated_user_id = authority_record.user_id\n   and provider_binding.provider = 'google'\n   and provider_binding.binding_status = 'active'\n   and provider_binding.revoked_at is null\n   and provider_binding.valid_from <= v_now\n   and provider_binding.valid_until > v_now\n  join drs_forward_private.specialists specialist_record\n    on specialist_record.specialist_id = authority_record.specialist_id\n   and specialist_record.specialist_status = 'active'\n  join drs_forward_private.case_mappings mapping_record\n    on mapping_record.case_mapping_id = authority_record.case_mapping_id\n   and mapping_record.legacy_case_id = authority_record.legacy_case_id\n   and mapping_record.mapping_status = 'active'\n   and mapping_record.revoked_at is null\n   and mapping_record.valid_from <= v_now\n   and mapping_record.valid_until > v_now\n  join casework.cases legacy_case\n    on legacy_case.id = authority_record.legacy_case_id\n   and legacy_case.case_status = 'active'\n  join casework.case_members membership_record\n    on membership_record.case_id = authority_record.legacy_case_id\n   and membership_record.user_id = authority_record.granted_by\n  where authority_record.user_id = p_authenticated_user_id\n    and authority_record.authority_status = 'active'\n    and authority_record.revoked_at is null\n    and authority_record.valid_from <= v_now\n    and authority_record.valid_until > v_now\n    and (p_expected_case_id is null or authority_record.legacy_case_id = p_expected_case_id)\n    and (\n      p_authorization_subject is null\n      or p_authorization_subject = 'drs-specialist:' || authority_record.specialist_id::text\n    );\n\n  if v_count = 0 then\n    return jsonb_build_object('authorized', false, 'state', 'CASE_NOT_AUTHORIZED');\n  end if;\n  if v_count > 1 then\n    return jsonb_build_object('authorized', false, 'state', 'CASE_SELECTION_REQUIRED');\n  end if;\n\n  select\n    authority_record.authority_id,\n    authority_record.user_id,\n    authority_record.specialist_id,\n    authority_record.legacy_case_id,\n    authority_record.valid_from,\n    authority_record.valid_until\n  into strict v_authority\n  from drs_forward_private.reviewer_case_authorities authority_record\n  join drs_forward_private.auth_specialist_bindings auth_binding\n    on auth_binding.authenticated_user_id = authority_record.user_id\n   and auth_binding.specialist_id = authority_record.specialist_id\n   and auth_binding.binding_status = 'active'\n   and auth_binding.revoked_at is null\n   and auth_binding.valid_from <= v_now\n   and auth_binding.valid_until > v_now\n  join drs_forward_private.identity_provider_bindings provider_binding\n    on provider_binding.authenticated_user_id = authority_record.user_id\n   and provider_binding.provider = 'google'\n   and provider_binding.binding_status = 'active'\n   and provider_binding.revoked_at is null\n   and provider_binding.valid_from <= v_now\n   and provider_binding.valid_until > v_now\n  join drs_forward_private.specialists specialist_record\n    on specialist_record.specialist_id = authority_record.specialist_id\n   and specialist_record.specialist_status = 'active'\n  join drs_forward_private.case_mappings mapping_record\n    on mapping_record.case_mapping_id = authority_record.case_mapping_id\n   and mapping_record.legacy_case_id = authority_record.legacy_case_id\n   and mapping_record.mapping_status = 'active'\n   and mapping_record.revoked_at is null\n   and mapping_record.valid_from <= v_now\n   and mapping_record.valid_until > v_now\n  join casework.cases legacy_case\n    on legacy_case.id = authority_record.legacy_case_id\n   and legacy_case.case_status = 'active'\n  join casework.case_members membership_record\n    on membership_record.case_id = authority_record.legacy_case_id\n   and membership_record.user_id = authority_record.granted_by\n  where authority_record.user_id = p_authenticated_user_id\n    and authority_record.authority_status = 'active'\n    and authority_record.revoked_at is null\n    and authority_record.valid_from <= v_now\n    and authority_record.valid_until > v_now\n    and (p_expected_case_id is null or authority_record.legacy_case_id = p_expected_case_id)\n    and (\n      p_authorization_subject is null\n      or p_authorization_subject = 'drs-specialist:' || authority_record.specialist_id::text\n    )\n  for update of authority_record;\n\n  return jsonb_build_object(\n    'authorized', true,\n    'authenticated_user_id', v_authority.user_id::text,\n    'specialist_id', v_authority.specialist_id::text,\n    'assignment_id', v_authority.authority_id::text,\n    'selected_case_id', v_authority.legacy_case_id::text,\n    'account_role', 'drs',\n    'authorization_subject', 'drs-specialist:' || v_authority.specialist_id::text,\n    'auth_binding_status', 'active',\n    'specialist_status', 'active',\n    'assignment_status', 'active',\n    'valid_from', v_authority.valid_from,\n    'valid_until', v_authority.valid_until,\n    'terminated_at', null,\n    'lock_status', 'locked'\n  );\nexception\n  when others then\n    return jsonb_build_object('authorized', false, 'state', 'CONTEXT_UNAVAILABLE');\nend;\n$function$;\n\nCREATE OR REPLACE FUNCTION public.drs_server_session_issue_v1(p_server_session_id uuid, p_access_token_digest text, p_authenticated_user_id uuid, p_specialist_id uuid, p_authorization_subject text, p_issued_at timestamp with time zone, p_expires_at timestamp with time zone)\n RETURNS jsonb\n LANGUAGE plpgsql\n SECURITY DEFINER\n SET search_path TO ''\nAS $function$\ndeclare\n  v_now timestamptz := clock_timestamp();\n  v_authority jsonb;\n  v_authority_row drs_forward_private.reviewer_case_authorities%rowtype;\nbegin\n  if p_server_session_id is null\n    or p_access_token_digest !~ '^[A-Za-z0-9_-]{43}$'\n    or p_authenticated_user_id is null\n    or p_specialist_id is null\n    or p_authorization_subject is distinct from 'drs-specialist:' || p_specialist_id::text\n    or p_issued_at < v_now - interval '1 minute'\n    or p_issued_at > v_now + interval '1 minute'\n    or p_expires_at <= v_now\n    or p_expires_at <= p_issued_at\n    or p_expires_at > p_issued_at + interval '15 minutes'\n    or p_expires_at > v_now + interval '15 minutes'\n  then\n    raise exception using errcode = 'P0001', message = 'DRS_SESSION_ISSUE_REJECTED';\n  end if;\n\n  v_authority := drs_forward_private.drs_identity_authority_resolve_locked_v1(\n    p_authenticated_user_id, null, p_authorization_subject\n  );\n  if v_authority->'authorized' is distinct from 'true'::jsonb\n    or v_authority->>'specialist_id' is distinct from p_specialist_id::text\n  then\n    raise exception using errcode = 'P0001', message = 'DRS_SESSION_ISSUE_REJECTED';\n  end if;\n\n  select * into strict v_authority_row\n  from drs_forward_private.reviewer_case_authorities\n  where authority_id = (v_authority->>'assignment_id')::uuid\n  for update;\n\n  begin\n    insert into drs_forward_private.server_sessions (\n      server_session_id,\n      access_token_digest,\n      authority_id,\n      authority_version,\n      authenticated_user_id,\n      specialist_id,\n      legacy_case_id,\n      case_mapping_id,\n      authorization_subject,\n      issued_at,\n      expires_at\n    ) values (\n      p_server_session_id,\n      p_access_token_digest,\n      v_authority_row.authority_id,\n      v_authority_row.authority_version,\n      v_authority_row.user_id,\n      v_authority_row.specialist_id,\n      v_authority_row.legacy_case_id,\n      v_authority_row.case_mapping_id,\n      p_authorization_subject,\n      p_issued_at,\n      p_expires_at\n    );\n  exception when unique_violation then\n    raise exception using errcode = 'P0001', message = 'DRS_SESSION_REPLAY_REJECTED';\n  end;\n\n  return jsonb_build_object(\n    'server_session_id', p_server_session_id::text,\n    'expires_at', p_expires_at\n  );\nexception\n  when sqlstate 'P0001' then raise;\n  when others then\n    raise exception using errcode = 'P0001', message = 'DRS_SESSION_ISSUE_REJECTED';\nend;\n$function$;\n\nCREATE OR REPLACE FUNCTION public.drs_server_session_revoke_v1(p_server_session_id uuid, p_access_token_digest text)\n RETURNS jsonb\n LANGUAGE plpgsql\n SECURITY DEFINER\n SET search_path TO ''\nAS $function$\ndeclare\n  v_updated integer;\nbegin\n  if p_server_session_id is null or p_access_token_digest !~ '^[A-Za-z0-9_-]{43}$' then\n    raise exception using errcode = 'P0001', message = 'DRS_SESSION_REVOKE_REJECTED';\n  end if;\n  update drs_forward_private.server_sessions\n  set revoked_at = clock_timestamp(), revoke_reason = 'EXPLICIT_REVOKE'\n  where server_session_id = p_server_session_id\n    and access_token_digest = p_access_token_digest\n    and revoked_at is null\n    and expires_at > clock_timestamp();\n  get diagnostics v_updated = row_count;\n  if v_updated <> 1 then\n    return jsonb_build_object('revoked', false);\n  end if;\n  return jsonb_build_object('revoked', true);\nexception when others then\n  return jsonb_build_object('revoked', false);\nend;\n$function$;\n\nCREATE OR REPLACE FUNCTION public.drs_server_session_verify_v1(p_server_session_id uuid, p_access_token_digest text)\n RETURNS jsonb\n LANGUAGE plpgsql\n SECURITY DEFINER\n SET search_path TO ''\nAS $function$\ndeclare\n  v_now timestamptz := clock_timestamp();\n  v_session drs_forward_private.server_sessions%rowtype;\n  v_authority jsonb;\nbegin\n  if p_server_session_id is null or p_access_token_digest !~ '^[A-Za-z0-9_-]{43}$' then\n    raise exception using errcode = 'P0001', message = 'DRS_SESSION_VERIFY_REJECTED';\n  end if;\n  select * into strict v_session\n  from drs_forward_private.server_sessions\n  where server_session_id = p_server_session_id\n    and access_token_digest = p_access_token_digest\n  for update;\n  if v_session.revoked_at is not null or v_session.expires_at <= v_now then\n    raise exception using errcode = 'P0001', message = 'DRS_SESSION_VERIFY_REJECTED';\n  end if;\n  v_authority := drs_forward_private.drs_identity_authority_resolve_locked_v1(\n    v_session.authenticated_user_id,\n    v_session.legacy_case_id,\n    v_session.authorization_subject\n  );\n  if v_authority->'authorized' is distinct from 'true'::jsonb\n    or v_authority->>'assignment_id' is distinct from v_session.authority_id::text\n    or (select authority_version from drs_forward_private.reviewer_case_authorities\n      where authority_id = v_session.authority_id) is distinct from v_session.authority_version\n  then\n    update drs_forward_private.server_sessions\n    set revoked_at = coalesce(revoked_at, v_now),\n        revoke_reason = coalesce(revoke_reason, 'CURRENT_AUTHORITY_DENIED')\n    where server_session_id = p_server_session_id;\n    raise exception using errcode = 'P0001', message = 'DRS_SESSION_VERIFY_REJECTED';\n  end if;\n  update drs_forward_private.server_sessions\n  set verification_count = verification_count + 1,\n      last_verified_at = v_now\n  where server_session_id = p_server_session_id;\n  return jsonb_build_object(\n    'authenticated_user_id', v_session.authenticated_user_id::text,\n    'specialist_id', v_session.specialist_id::text,\n    'authorization_subject', v_session.authorization_subject,\n    'expires_at', v_session.expires_at\n  );\nexception\n  when sqlstate 'P0001' then raise;\n  when others then\n    raise exception using errcode = 'P0001', message = 'DRS_SESSION_VERIFY_REJECTED';\nend;\n$function$;\n";

test(
  "S2 native PostgreSQL: password authority, opaque Auth binding, deletion, versions, logout and ACL",
  {
    skip: !psql || !port || !enabled
      ? "REAL_PG_PENDING: task-owned disposable PostgreSQL required"
      : false,
  },
  async () => {
    assert.match(port, /^\d{4,5}$/u);
    assert.equal(
      await realpath(psql),
      await realpath(
        fileURLToPath(
          new URL(
            "../../.codex-auth-r2/postgresql/bin/psql.exe",
            import.meta.url,
          ),
        ),
      ),
    );
    const migration = await readFile(
      new URL(
        "../migrations/20260908070633_drs_auth_session_binding_v1.sql",
        import.meta.url,
      ),
      "utf8",
    );
    assert.match(migration, /\bbegin;[\s\S]*commit;\s*$/u);
    const migrationBody = migration.replace(/^([\s\S]*?)\bbegin;/u, "$1")
      .replace(/commit;\s*$/u, "");
    const sql = `
begin;
do $safe$
begin
 if current_database()<>'${database}' or current_setting('server_version_num')::int<150000
   or exists(select 1 from pg_namespace where nspname in ('auth','casework','drs_forward_private'))
 then raise exception 'Empty disposable PostgreSQL 15+ required'; end if;
 create role anon nologin;
 create role authenticated nologin;
 create role service_role nologin;
end;
$safe$;
create schema auth;
create schema casework;
create schema drs_forward_private;
create table auth.sessions(id uuid primary key,user_id uuid not null,not_after timestamptz);
create table casework.cases(id uuid primary key,case_status text);
create table casework.case_members(case_id uuid,user_id uuid,role text,primary key(case_id,user_id));
create table drs_forward_private.specialists(specialist_id uuid primary key,specialist_status text,specialist_version bigint);
create table drs_forward_private.auth_specialist_bindings(
 auth_binding_id uuid primary key,authenticated_user_id uuid,specialist_id uuid,binding_status text,
 binding_version bigint,valid_from timestamptz,valid_until timestamptz,revoked_at timestamptz);
create table drs_forward_private.identity_provider_bindings(
 authenticated_user_id uuid,provider text,binding_status text,revoked_at timestamptz,valid_from timestamptz,valid_until timestamptz);
create table drs_forward_private.case_mappings(
 case_mapping_id uuid primary key,legacy_case_id uuid,mapping_status text,mapping_version bigint,
 revoked_at timestamptz,valid_from timestamptz,valid_until timestamptz);
create table drs_forward_private.reviewer_case_authorities(
 authority_id uuid primary key,user_id uuid,specialist_id uuid,legacy_case_id uuid,case_mapping_id uuid,
 authority_status text,authority_version bigint,valid_from timestamptz,valid_until timestamptz,
 revoked_at timestamptz,granted_by uuid,authority_basis text check(length(btrim(authority_basis)) between 1 and 256));
create table drs_forward_private.server_sessions(
 server_session_id uuid primary key,access_token_digest text,authority_id uuid,authority_version bigint,
 authenticated_user_id uuid,specialist_id uuid,legacy_case_id uuid,case_mapping_id uuid,authorization_subject text,
 issued_at timestamptz,expires_at timestamptz,revoked_at timestamptz,revoke_reason text,
 verification_count bigint not null default 0,last_verified_at timestamptz,replay_rejected_at timestamptz);
${oldCoreDefinitions}
create temporary table old_functions as
 select oid,md5(pg_get_functiondef(oid)) digest from pg_proc
 where proname in ('drs_identity_authority_resolve_locked_v1','drs_server_session_issue_v1','drs_server_session_verify_v1','drs_server_session_revoke_v1');
${migrationBody}
create temporary table assertions(label text);
create temporary sequence assertion_count;
create function pg_temp.check_ok(ok boolean,label text) returns void language plpgsql as $$
begin
 if ok is distinct from true then raise exception 'ASSERTION FAILED: %',label; end if;
 insert into assertions values(label);
 perform nextval('pg_temp.assertion_count');
end $$;
grant insert on assertions to service_role;
grant usage,select on sequence assertion_count to service_role;
select pg_temp.check_ok((select bool_and(digest=md5(pg_get_functiondef(oid))) from old_functions),'old Core provider function bytes unchanged');
select pg_temp.check_ok(not exists(select 1 from pg_constraint where conrelid='drs_forward_private.auth_bound_sessions'::regclass and confrelid='auth.sessions'::regclass),'no FK blocks Auth deletion');
select pg_temp.check_ok((select relrowsecurity and relforcerowsecurity from pg_class where oid='drs_forward_private.auth_bound_sessions'::regclass),'sidecar forced RLS');
do $acl$
declare f record;
begin
 for f in select oid,prosecdef,proconfig from pg_proc where proname in
 ('drs_password_session_authority_v1','drs_auth_bound_server_session_issue_v1','drs_auth_bound_server_session_verify_v1','drs_auth_bound_session_logout_v1')
 loop
  perform pg_temp.check_ok(not has_function_privilege('anon',f.oid,'EXECUTE')
   and not has_function_privilege('authenticated',f.oid,'EXECUTE') and has_function_privilege('service_role',f.oid,'EXECUTE')
   and not exists(select 1 from pg_proc p,lateral aclexplode(p.proacl) a where p.oid=f.oid and a.grantee=0),'service-only RPC ACL');
  perform pg_temp.check_ok(f.prosecdef and 'search_path=""'=any(f.proconfig),'definer fixed empty search path');
 end loop;
 perform pg_temp.check_ok(not has_table_privilege('anon','drs_forward_private.auth_bound_sessions','SELECT,INSERT,UPDATE,DELETE')
   and not has_table_privilege('authenticated','drs_forward_private.auth_bound_sessions','SELECT,INSERT,UPDATE,DELETE')
   and not has_table_privilege('service_role','drs_forward_private.auth_bound_sessions','SELECT,INSERT,UPDATE,DELETE'),'no direct table access');
 begin
  perform public.drs_password_session_authority_v1(null,null);
  raise exception 'Non-service effective caller accepted';
 exception when insufficient_privilege then null; end;
end $acl$;
set local role anon;
do $$begin
 begin perform public.drs_password_session_authority_v1(null,null); raise exception 'anon accepted';
 exception when insufficient_privilege then null; end;
end$$;
reset role;
set local role authenticated;
do $$begin
 begin perform public.drs_auth_bound_session_logout_v1(null,null,null,null,null,false); raise exception 'authenticated accepted';
 exception when insufficient_privilege then null; end;
end$$;
reset role;

insert into auth.sessions values('22222222-2222-4222-8222-222222222222','11111111-1111-4111-8111-111111111111',null);
insert into drs_forward_private.specialists values('33333333-3333-4333-8333-333333333333','active',1);
insert into drs_forward_private.auth_specialist_bindings values(
 '77777777-7777-4777-8777-777777777777','11111111-1111-4111-8111-111111111111','33333333-3333-4333-8333-333333333333','active',1,now()-interval '1 day',now()+interval '1 day',null);
insert into casework.cases values('44444444-4444-4444-8444-444444444444','active');
insert into casework.case_members values('44444444-4444-4444-8444-444444444444','88888888-8888-4888-8888-888888888888','pcm');
insert into drs_forward_private.case_mappings values('66666666-6666-4666-8666-666666666666','44444444-4444-4444-8444-444444444444','active',1,null,now()-interval '1 day',now()+interval '1 day');
insert into drs_forward_private.reviewer_case_authorities values(
 '55555555-5555-4555-8555-555555555555','11111111-1111-4111-8111-111111111111','33333333-3333-4333-8333-333333333333',
 '44444444-4444-4444-8444-444444444444','66666666-6666-4666-8666-666666666666','active',1,now()-interval '1 day',now()+interval '1 day',null,
 '88888888-8888-4888-8888-888888888888','synthetic existing case-member provenance');
create function pg_temp.authority() returns jsonb language sql as $$
 select public.drs_password_session_authority_v1('11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222222')
$$;
create function pg_temp.issue(sid uuid default 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',authsid uuid default '22222222-2222-4222-8222-222222222222',
 expiry timestamptz default clock_timestamp()+interval '5 minutes') returns jsonb language sql as $$
 select public.drs_auth_bound_server_session_issue_v1(sid,repeat('a',43),'11111111-1111-4111-8111-111111111111',authsid,repeat('b',43),
 '33333333-3333-4333-8333-333333333333','drs-specialist:33333333-3333-4333-8333-333333333333',clock_timestamp(),expiry,clock_timestamp()+interval '10 minutes')
$$;
create function pg_temp.verify(sid uuid default 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',authsid uuid default '22222222-2222-4222-8222-222222222222',
 uid uuid default '11111111-1111-4111-8111-111111111111',digest text default repeat('b',43)) returns jsonb language sql as $$
 select public.drs_auth_bound_server_session_verify_v1(sid,repeat('a',43),uid,authsid,digest)
$$;
create function pg_temp.logout(done boolean) returns jsonb language sql as $$
 select public.drs_auth_bound_session_logout_v1('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',repeat('a',43),
 '11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222222',repeat('b',43),done)
$$;

set local role service_role;
select pg_temp.check_ok(pg_temp.authority()->>'authorized'='true','password-only eligible without Google succeeds');
select pg_temp.check_ok(pg_temp.issue()->>'server_session_id'='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','qualified case issues Auth-bound session');
select pg_temp.check_ok(pg_temp.verify()->>'selected_case_id'='44444444-4444-4444-8444-444444444444','verify returns exact read-only case');
select pg_temp.check_ok(pg_temp.verify('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','99999999-9999-4999-8999-999999999999')->>'state'='AUTH_REQUIRED','wrong sid denied');
select pg_temp.check_ok(pg_temp.verify('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','22222222-2222-4222-8222-222222222222','99999999-9999-4999-8999-999999999999')->>'state'='AUTH_REQUIRED','wrong user denied');
select pg_temp.check_ok(pg_temp.verify('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','22222222-2222-4222-8222-222222222222','11111111-1111-4111-8111-111111111111',repeat('c',43))->>'state'='AUTH_REQUIRED','wrong JWT digest denied');
select pg_temp.check_ok(pg_temp.issue('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','99999999-9999-4999-8999-999999999999')->>'state'='AUTH_REQUIRED','wrong Auth pair cannot issue');
select pg_temp.check_ok(pg_temp.issue('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','22222222-2222-4222-8222-222222222222',clock_timestamp()-interval '1 second')->>'state'='AUTH_REQUIRED','expired JWT cannot issue');
reset role;
savepoint old_session;
delete from drs_forward_private.auth_bound_sessions;
set local role service_role;
select pg_temp.check_ok(pg_temp.verify()->>'state'='AUTH_REQUIRED','old unbound session requires re-login');
reset role;
rollback to old_session;
${
      [
        [
          "update drs_forward_private.auth_specialist_bindings set binding_status='revoked',revoked_at=clock_timestamp()",
          "REVIEWER_APPROVAL_REQUIRED",
          "revoked qualification",
        ],
        [
          "update drs_forward_private.specialists set specialist_status='inactive'",
          "REVIEWER_APPROVAL_REQUIRED",
          "inactive specialist",
        ],
        [
          "delete from drs_forward_private.auth_specialist_bindings",
          "REVIEWER_APPROVAL_REQUIRED",
          "Auth-only wrong requester role",
        ],
        [
          "update drs_forward_private.reviewer_case_authorities set authority_status='revoked',revoked_at=clock_timestamp()",
          "CASE_NOT_AUTHORIZED",
          "revoked case authority",
        ],
        [
          "update drs_forward_private.reviewer_case_authorities set valid_until=clock_timestamp()-interval '1 second'",
          "CASE_NOT_AUTHORIZED",
          "expired authority",
        ],
        [
          "update drs_forward_private.case_mappings set mapping_status='revoked'",
          "CASE_NOT_AUTHORIZED",
          "revoked case mapping",
        ],
        [
          "update drs_forward_private.case_mappings set legacy_case_id='99999999-9999-4999-8999-999999999999'",
          "CASE_NOT_AUTHORIZED",
          "cross-case mapping",
        ],
        [
          "delete from casework.case_members",
          "CASE_NOT_AUTHORIZED",
          "lost existing grant provenance",
        ],
        [
          "update casework.cases set case_status='closed'",
          "CASE_NOT_AUTHORIZED",
          "inactive case",
        ],
      ].map(([mutation, denial, label]) =>
        `savepoint scenario;
${mutation};
set local role service_role;
select pg_temp.check_ok(pg_temp.authority()->>'state'='${denial}','${label} authority denial');
select pg_temp.check_ok(pg_temp.verify()->>'state'='${denial}','${label} existing opaque denied');
select pg_temp.check_ok(pg_temp.issue('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb')->>'state'='${denial}','${label} no session issue');
reset role;
rollback to scenario;`
      ).join("\n")
    }
${
      [
        "update drs_forward_private.reviewer_case_authorities set authority_version=2",
        "update drs_forward_private.auth_specialist_bindings set binding_version=2",
        "update drs_forward_private.specialists set specialist_version=2",
        "update drs_forward_private.case_mappings set mapping_version=2",
      ].map((mutation) =>
        `savepoint version_change;
${mutation};
set local role service_role;
select pg_temp.check_ok(pg_temp.verify()->>'state'='CASE_NOT_AUTHORIZED','version rotation rejects old session');
reset role;
rollback to version_change;`
      ).join("\n")
    }
savepoint selection;
insert into drs_forward_private.reviewer_case_authorities
 select '99999999-9999-4999-8999-999999999999',user_id,specialist_id,legacy_case_id,case_mapping_id,authority_status,authority_version,valid_from,valid_until,revoked_at,granted_by,authority_basis
 from drs_forward_private.reviewer_case_authorities;
set local role service_role;
select pg_temp.check_ok(pg_temp.authority()->>'state'='CASE_SELECTION_REQUIRED','multiple eligible assignments require selection');
select pg_temp.check_ok(pg_temp.issue('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb')->>'state'='CASE_SELECTION_REQUIRED','selection state cannot mint');
reset role;
rollback to selection;
savepoint expiry;
update auth.sessions set not_after=clock_timestamp()-interval '1 second';
set local role service_role;
select pg_temp.check_ok(pg_temp.authority()->>'state'='AUTH_REQUIRED','Auth not_after denied');
select pg_temp.check_ok(pg_temp.verify()->>'state'='AUTH_REQUIRED','Auth not_after invalidates opaque');
reset role;
rollback to expiry;
savepoint unavailable;
alter table drs_forward_private.case_mappings rename to unavailable_case_mappings;
set local role service_role;
select pg_temp.check_ok(pg_temp.verify()->>'state'='CONTEXT_UNAVAILABLE','missing authority service stays unavailable');
reset role;
rollback to unavailable;
savepoint auth_removed;
delete from auth.sessions;
select pg_temp.check_ok((select revoked_at is null from drs_forward_private.server_sessions where server_session_id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),'opaque remains independently unrevoked before Auth deletion check');
set local role service_role;
select pg_temp.check_ok(pg_temp.verify()->>'state'='AUTH_REQUIRED','actual Auth deletion invalidates otherwise-live opaque');
reset role;
rollback to auth_removed;
set local role service_role;
select pg_temp.check_ok(pg_temp.logout(false)='{"revoked":true,"completed":false,"auth_session_active":true}'::jsonb,'logout revokes only exact DRS first');
select pg_temp.check_ok(pg_temp.logout(true)->>'completed'='false','cannot complete while Auth session remains active');
select pg_temp.check_ok(pg_temp.verify()->>'state'='AUTH_REQUIRED','explicit DRS revoke invalidates opaque');
reset role;
-- Synthetic Auth row deletion is a database causal test, not a provider logout implementation.
delete from auth.sessions;
set local role service_role;
select pg_temp.check_ok(pg_temp.authority()->>'state'='AUTH_REQUIRED','removed Auth session cannot resolve authority');
select pg_temp.check_ok(pg_temp.issue('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb')->>'state'='AUTH_REQUIRED','removed Auth session cannot issue');
select pg_temp.check_ok(pg_temp.logout(true)='{"revoked":true,"completed":true,"auth_session_active":false}'::jsonb,'provider removal permits exact completion');
select pg_temp.check_ok(pg_temp.logout(false)='{"revoked":true,"completed":true,"auth_session_active":false}'::jsonb,'completed exact logout is idempotent');
select pg_temp.check_ok(public.drs_auth_bound_session_logout_v1('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',repeat('x',43),'11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222222',repeat('b',43),true)->>'state'='AUTH_REQUIRED','wrong opaque cannot inherit completion');
reset role;
select json_build_object('assertions',(select last_value from assertion_count),'postgres',current_setting('server_version'),'auth_session_rows',(select count(*) from auth.sessions));
rollback;
`;
    const result = spawnSync(psql, [
      "--no-psqlrc",
      "--no-password",
      "--host=127.0.0.1",
      `--port=${port}`,
      "--username=auth_s2_runner",
      `--dbname=${database}`,
      "--set=ON_ERROR_STOP=1",
      "--tuples-only",
      "--no-align",
      "--quiet",
    ], {
      input: sql,
      encoding: "utf8",
      timeout: 30000,
      maxBuffer: 1024 * 1024,
      windowsHide: true,
    });
    assert.ifError(result.error);
    assert.equal(
      result.status,
      0,
      result.stderr || "PostgreSQL assertions failed",
    );
    const summary = result.stdout.trim().split("\n").filter((line) =>
      line.startsWith("{")
    ).at(-1);
    assert.ok(summary, "Missing SQL evidence summary");
    const evidence = JSON.parse(summary);
    assert.ok(evidence.assertions >= 20);
    assert.equal(evidence.auth_session_rows, 0);
    console.log("S2_REAL_POSTGRES", JSON.stringify(evidence));
  },
);
