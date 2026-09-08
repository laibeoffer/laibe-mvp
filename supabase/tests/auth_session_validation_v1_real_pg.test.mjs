import assert from "node:assert/strict";
import { readdir, readFile, realpath } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import process from "node:process";
import test from "node:test";

// Only the task-owned PostgreSQL executable may access this disposable local database.
const psql = process.env.DRS_AUTH_S1_PSQL;
const port = process.env.DRS_AUTH_S1_PG_PORT;
const enabled = process.env.DRS_AUTH_S1_ALLOW_DISPOSABLE === "1";
const database = "laibe_auth_session_s1_disposable";

function query(args, input) {
  const result = spawnSync(psql, args, {
    input,
    encoding: "utf8",
    timeout: 30_000,
    maxBuffer: 1024 * 1024,
    windowsHide: true,
  });
  assert.ifError(result.error);
  assert.equal(
    result.status,
    0,
    result.stderr || "psql did not complete",
  );
  return result.stdout.trim();
}

test(
  "S1 real PostgreSQL: session pairing, expiry, revocation and service-only ACL",
  {
    skip: !psql || !port || !enabled
      ? "REAL_PG_PENDING: set task-owned DRS_AUTH_S1_PSQL, DRS_AUTH_S1_PG_PORT and DRS_AUTH_S1_ALLOW_DISPOSABLE=1"
      : false,
  },
  async () => {
    assert.match(port, /^\d{4,5}$/u);
    assert.ok(Number(port) >= 1024 && Number(port) <= 65535);
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
      "psql must belong to this task",
    );
    const migrations = new URL("../migrations/", import.meta.url);
    const files = (await readdir(migrations))
      .filter((file) => /^\d{14}_auth_session_validation_v1\.sql$/u.test(file));
    assert.equal(files.length, 1);
    const migration = await readFile(new URL(files[0], migrations), "utf8");
    assert.match(migration, /^begin;[\s\S]*commit;\s*$/u);
    const body = migration.replace(/^begin;\s*/u, "").replace(
      /commit;\s*$/u,
      "",
    );
    const sql = `
begin;
do $check$
begin
  if current_database() <> '${database}'
    or current_setting('server_version_num')::integer < 150000
    or exists (select 1 from pg_namespace where nspname = 'auth')
  then raise exception 'An empty disposable PostgreSQL 15+ database is required'; end if;
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then create role service_role nologin; end if;
end;
$check$;
create schema auth;
create table auth.sessions (
  id uuid primary key,
  user_id uuid not null,
  not_after timestamptz
);
alter table auth.sessions enable row level security;
alter table auth.sessions force row level security;
${body}
insert into auth.sessions values
 ('22222222-2222-4222-8222-222222222222','11111111-1111-4111-8111-111111111111',null),
 ('33333333-3333-4333-8333-333333333333','11111111-1111-4111-8111-111111111111',statement_timestamp()),
 ('44444444-4444-4444-8444-444444444444','55555555-5555-4555-8555-555555555555',statement_timestamp()+interval '1 hour');
do $acl$
declare f oid := 'public.auth_session_validation_v1(uuid,uuid)'::regprocedure;
begin
  if has_function_privilege('anon',f,'EXECUTE') or has_function_privilege('authenticated',f,'EXECUTE')
    or not has_function_privilege('service_role',f,'EXECUTE')
    or exists (select 1 from pg_proc p, lateral aclexplode(p.proacl) a where p.oid=f and a.grantee=0 and a.privilege_type='EXECUTE')
  then raise exception 'Unexpected execute ACL'; end if;
  if not exists (select 1 from pg_proc where oid=f and prosecdef and provolatile='s' and 'search_path=""'=any(proconfig))
  then raise exception 'Function security configuration mismatch'; end if;
  begin
    perform public.auth_session_validation_v1(null,null);
    raise exception 'Non-service caller was accepted';
  exception when insufficient_privilege then null; end;
end;
$acl$;
set local role anon;
do $anon$
begin
  begin
    perform public.auth_session_validation_v1(null,null);
    raise exception 'anon was accepted';
  exception when insufficient_privilege then null; end;
end;
$anon$;
reset role;
set local role authenticated;
do $authenticated$
begin
  begin
    perform public.auth_session_validation_v1(null,null);
    raise exception 'authenticated was accepted';
  exception when insufficient_privilege then null; end;
end;
$authenticated$;
reset role;
set local role service_role;
do $validation$
declare
  u uuid := '11111111-1111-4111-8111-111111111111';
  allowed jsonb := '{"schemaVersion":"laibe.auth-session-validation.v1","active":true}';
  denied jsonb := '{"schemaVersion":"laibe.auth-session-validation.v1","active":false}';
begin
  if public.auth_session_validation_v1(u,'22222222-2222-4222-8222-222222222222') <> allowed then raise exception 'Active session rejected'; end if;
  if public.auth_session_validation_v1(u,'33333333-3333-4333-8333-333333333333') <> denied then raise exception 'not_after expiry accepted'; end if;
  if public.auth_session_validation_v1(u,'44444444-4444-4444-8444-444444444444') <> denied then raise exception 'Wrong user pairing accepted'; end if;
  if public.auth_session_validation_v1(u,'66666666-6666-4666-8666-666666666666') <> denied then raise exception 'Missing session accepted'; end if;
  if public.auth_session_validation_v1(null,null) <> denied then raise exception 'Null identity accepted'; end if;
  if public.auth_session_validation_v1('55555555-5555-4555-8555-555555555555','44444444-4444-4444-8444-444444444444') <> allowed then raise exception 'Future not_after rejected'; end if;
end;
$validation$;
reset role;
delete from auth.sessions where id='22222222-2222-4222-8222-222222222222';
set local role service_role;
do $revoked$
begin
  if public.auth_session_validation_v1('11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222222') <> '{"schemaVersion":"laibe.auth-session-validation.v1","active":false}'::jsonb
  then raise exception 'Revoked session accepted'; end if;
end;
$revoked$;
reset role;
do $unchanged$
begin
  if (select count(*) from auth.sessions) <> 2 then raise exception 'Read-only validation changed session rows'; end if;
end;
$unchanged$;
rollback;
select 'AUTH_SESSION_REAL_PG_PASS';
`;
    const result = query([
      "--no-psqlrc",
      "--no-password",
      "--set",
      "ON_ERROR_STOP=1",
      "--tuples-only",
      "--no-align",
      "--username",
      "auth_s1_runner",
      "--host",
      "127.0.0.1",
      "--port",
      port,
      "--dbname",
      database,
    ], sql);
    assert.match(result, /AUTH_SESSION_REAL_PG_PASS$/u);
  },
);
