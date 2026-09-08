import assert from "node:assert/strict";
import { readdir, readFile, realpath } from "node:fs/promises";
import { spawn, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import test from "node:test";

const psql = process.env.DRS_AUTH_S3_PSQL;
const port = process.env.DRS_AUTH_S3_PG_PORT;
const enabled = process.env.DRS_AUTH_S3_ALLOW_DISPOSABLE === "1";
const database = "laibe_self_application_s3_disposable";

test(
  "S3 P2 real PostgreSQL lock waits recheck JWT and session expiry before insert",
  {
    skip: !psql || !port || !enabled ? "REAL_PG_PENDING" : false,
  },
  async () => {
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
    assert.match(port, /^\d{4,5}$/u);
    const args = [
      "--host=127.0.0.1",
      "--port=" + port,
      "--dbname=" + database,
      "--no-psqlrc",
      "--set=ON_ERROR_STOP=1",
      "--quiet",
      "--tuples-only",
    ];
    const query = (sql) => {
      const result = spawnSync(psql, args, {
        input: sql,
        encoding: "utf8",
        timeout: 15000,
        windowsHide: true,
      });
      assert.ifError(result.error);
      assert.equal(result.status, 0, result.stderr);
      return result.stdout.trim();
    };
    const migrations = new URL("../migrations/", import.meta.url);
    const names = (await readdir(migrations)).filter((p) =>
      /^\d{14}_drs_reviewer_self_application_v1\.sql$/u.test(p)
    );
    assert.equal(names.length, 1);
    const migration = await readFile(new URL(names[0], migrations), "utf8");
    query(
      "do $guard$ begin if current_database()<>'" + database +
        "' or exists(select 1 from pg_namespace where nspname='auth') then raise exception 'Empty disposable target required';end if;end;$guard$;\n" +
        "create role anon nologin;create role authenticated nologin;create role service_role nologin;\n" +
        "create schema auth;create table auth.sessions(id uuid primary key,user_id uuid not null,not_after timestamptz);\n" +
        migration +
        "\ninsert into auth.sessions values('22222222-2222-4222-8222-222222222222','11111111-1111-4111-8111-111111111111',null);",
    );
    try {
      for (const scenario of ["jwtExpired", "sessionExpired", "stillLive"]) {
        query(
          "update auth.sessions set not_after=" + (scenario === "sessionExpired"
            ? "clock_timestamp()+interval '1 second'"
            : "null") +
            ";",
        );
        const holder = spawn(psql, args, {
          stdio: ["pipe", "pipe", "pipe"],
          windowsHide: true,
        });
        let stdout = "", stderr = "";
        const released = new Promise((resolve, reject) => {
          holder.on("error", reject);
          holder.on("close", (code) =>
            code === 0 ? resolve() : reject(new Error(stderr)));
        });
        const locked = new Promise((resolve, reject) => {
          const timer = setTimeout(() =>
            reject(new Error("Lock holder did not become ready")), 10000);
          holder.stdout.on("data", (chunk) => {
            stdout += chunk;
            if (stdout.includes("S3_LOCK_HELD")) {
              clearTimeout(timer);
              resolve();
            }
          });
          holder.stderr.on("data", (chunk) => {
            stderr += chunk;
          });
          holder.on("error", (error) => {
            clearTimeout(timer);
            reject(error);
          });
        });
        holder.stdin.end(
          "begin;select id from auth.sessions for update;\n\\echo S3_LOCK_HELD\nselect pg_sleep(2);commit;\n",
        );
        try {
          await locked;
          const expiry = Date.now() +
            (scenario === "jwtExpired" ? 1000 : 30000);
          const began = Date.now();
          const result = JSON.parse(
            query(
              "set role service_role;select public.drs_reviewer_self_application_v1('11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222222','" +
                new Date(expiry).toISOString() +
                "'::timestamptz,true,'Late Reviewer','','');",
            ),
          );
          const count = Number(
            query(
              "select count(*) from drs_forward_private.reviewer_self_applications;",
            ),
          );
          assert.ok(
            Date.now() - began >= 1000,
            "RPC must really wait for the Auth row lock",
          );
          if (scenario === "jwtExpired") {
            assert.ok(Date.now() >= expiry, "JWT deadline was not crossed");
          }
          assert.deepEqual(
            { state: result.state, count },
            scenario === "stillLive"
              ? { state: "APPLICATION_PENDING", count: 1 }
              : { state: "AUTH_REQUIRED", count: 0 },
            scenario,
          );
        } finally {
          await released;
        }
      }
    } finally {
      query(
        "drop function public.drs_reviewer_self_application_v1(uuid,uuid,timestamptz,boolean,text,text,text);drop schema drs_forward_private cascade;drop schema auth cascade;drop role anon;drop role authenticated;drop role service_role;",
      );
    }
  },
);
test(
  "S3 real PostgreSQL: self isolation, idempotency, live session, ACL and no qualification writes",
  {
    skip: !psql || !port || !enabled
      ? "REAL_PG_PENDING: task-owned PostgreSQL and explicit disposable target required"
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
    const migrations = new URL("../migrations/", import.meta.url);
    const paths = (await readdir(migrations)).filter((p) =>
      /^\d{14}_drs_reviewer_self_application_v1\.sql$/u.test(p)
    );
    assert.equal(paths.length, 1);
    const migration = await readFile(new URL(paths[0], migrations), "utf8");
    const body = migration.replace(/^begin;\s*/u, "").replace(
      /commit;\s*$/u,
      "",
    );
    const sql = `begin;
do $guard$ begin
 if current_database()<>'${database}' or current_setting('server_version_num')::int<150000 or exists(select 1 from pg_namespace where nspname='auth') then raise exception 'Empty task disposable PostgreSQL required';end if;
 create role anon nologin;create role authenticated nologin;create role service_role nologin;
end;$guard$;
create schema auth;
create table auth.sessions(id uuid primary key,user_id uuid not null,not_after timestamptz);
create table public.specialists(id int primary key,marker text);
create table public.auth_specialist_bindings(id int primary key,marker text);
create table public.case_members(id int primary key,marker text);
insert into public.specialists values(1,'unchanged');insert into public.auth_specialist_bindings values(1,'unchanged');insert into public.case_members values(1,'unchanged');
${body}
insert into auth.sessions values('22222222-2222-4222-8222-222222222222','11111111-1111-4111-8111-111111111111',null),('44444444-4444-4444-8444-444444444444','55555555-5555-4555-8555-555555555555',clock_timestamp()+interval '1 hour');
do $acl$ declare f oid:='public.drs_reviewer_self_application_v1(uuid,uuid,timestamptz,boolean,text,text,text)'::regprocedure;begin
 if not exists(select 1 from pg_class where oid='drs_forward_private.reviewer_self_applications'::regclass and relrowsecurity and relforcerowsecurity) then raise exception 'Forced RLS missing';end if;
 if exists(select 1 from pg_policy where polrelid='drs_forward_private.reviewer_self_applications'::regclass) then raise exception 'Unexpected direct policy';end if;
 if has_table_privilege('anon','drs_forward_private.reviewer_self_applications','SELECT,INSERT,UPDATE,DELETE') or has_table_privilege('authenticated','drs_forward_private.reviewer_self_applications','SELECT,INSERT,UPDATE,DELETE') or has_table_privilege('service_role','drs_forward_private.reviewer_self_applications','SELECT,INSERT,UPDATE,DELETE') then raise exception 'Unexpected table access';end if;
 if has_function_privilege('anon',f,'EXECUTE') or has_function_privilege('authenticated',f,'EXECUTE') or not has_function_privilege('service_role',f,'EXECUTE') or exists(select 1 from pg_proc p,lateral aclexplode(p.proacl) a where p.oid=f and a.grantee=0 and a.privilege_type='EXECUTE') then raise exception 'Unexpected function ACL';end if;
 if not exists(select 1 from pg_proc where oid=f and prosecdef and 'search_path=""'=any(proconfig)) then raise exception 'Function security settings missing';end if;
 begin perform public.drs_reviewer_self_application_v1(null,null,null,false);raise exception 'Non-service caller accepted';exception when insufficient_privilege then null;end;
end;$acl$;
set local role anon;
do $anon$ begin begin perform public.drs_reviewer_self_application_v1(null,null,null,false);raise exception 'anon accepted';exception when insufficient_privilege then null;end;end;$anon$;
reset role;
set local role authenticated;
do $authenticated$ begin begin perform public.drs_reviewer_self_application_v1(null,null,null,false);raise exception 'authenticated accepted';exception when insufficient_privilege then null;end;end;$authenticated$;
reset role;
set local role service_role;
do $self$ declare u uuid:='11111111-1111-4111-8111-111111111111';s uuid:='22222222-2222-4222-8222-222222222222';v jsonb;first jsonb;begin
 v:=public.drs_reviewer_self_application_v1(u,s,clock_timestamp()+interval '5 minutes',false);if v->>'state'<>'NO_APPLICATION' or v->'application'<>'null'::jsonb then raise exception 'Absence not explicit';end if;
 v:=public.drs_reviewer_self_application_v1('55555555-5555-4555-8555-555555555555',s,clock_timestamp()+interval '5 minutes',true,'Impersonate','','');if v->>'state'<>'AUTH_REQUIRED' then raise exception 'Cross-user session accepted';end if;
 first:=public.drs_reviewer_self_application_v1(u,s,clock_timestamp()+interval '5 minutes',true,'  Synthetic Reviewer  ',' Org ',' 123 ');if first->>'state'<>'APPLICATION_PENDING' or (first->>'created')::boolean is not true or first->'application'->>'status'<>'pending' then raise exception 'Pending creation failed';end if;
 v:=public.drs_reviewer_self_application_v1(u,s,clock_timestamp()+interval '5 minutes',true,'Overwrite','Changed','456');if v->'application'<>first->'application' or (v->>'created')::boolean is not false then raise exception 'Idempotency lost';end if;
 v:=public.drs_reviewer_self_application_v1('55555555-5555-4555-8555-555555555555','44444444-4444-4444-8444-444444444444',clock_timestamp()+interval '5 minutes',false);if v->>'state'<>'NO_APPLICATION' then raise exception 'Other caller leaked first application';end if;
 if first::text like '%Synthetic%' or first::text like '%user_id%' or first::text like '%qualification%' then raise exception 'DTO leaks private fields or qualification';end if;
 begin perform public.drs_reviewer_self_application_v1(u,s,clock_timestamp()+interval '5 minutes',true,E'bad\\nname','','');raise exception 'Control accepted';exception when invalid_parameter_value then null;end;
 begin perform public.drs_reviewer_self_application_v1(u,s,clock_timestamp()+interval '5 minutes',true,repeat('a',81),'','');raise exception 'Name bound accepted';exception when invalid_parameter_value then null;end;
 begin perform public.drs_reviewer_self_application_v1(u,s,clock_timestamp()+interval '5 minutes',false,'contact',null,null);raise exception 'GET contact accepted';exception when invalid_parameter_value then null;end;
end;$self$;
reset role;
do $stored$ begin
 if (select count(*) from drs_forward_private.reviewer_self_applications)<>1 or not exists(select 1 from drs_forward_private.reviewer_self_applications where display_name='Synthetic Reviewer' and organization='Org' and phone='123' and version=1 and status='pending') then raise exception 'Stored caller or contact mutated';end if;
 if (select marker from public.specialists where id=1)<>'unchanged' or (select marker from public.auth_specialist_bindings where id=1)<>'unchanged' or (select marker from public.case_members where id=1)<>'unchanged' then raise exception 'Protected authority table changed';end if;
end;$stored$;
update drs_forward_private.reviewer_self_applications set status='approved';
set local role service_role;
do $history$ begin if public.drs_reviewer_self_application_v1('11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222222',clock_timestamp()+interval '5 minutes',false)->>'state'<>'APPLICATION_APPROVED' then raise exception 'Self history missing';end if;end;$history$;
reset role;
update auth.sessions set not_after=clock_timestamp()-interval '1 second' where id='22222222-2222-4222-8222-222222222222';
set local role service_role;
do $expiry$ begin if public.drs_reviewer_self_application_v1('11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222222',clock_timestamp()+interval '5 minutes',false)->>'state'<>'AUTH_REQUIRED' then raise exception 'Expired session accepted';end if;end;$expiry$;
reset role;
delete from auth.sessions where id='22222222-2222-4222-8222-222222222222';
set local role service_role;
do $revoked$ begin if public.drs_reviewer_self_application_v1('11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222222',clock_timestamp()+interval '5 minutes',true,'New','','')->>'state'<>'AUTH_REQUIRED' then raise exception 'Revoked session accepted';end if;end;$revoked$;
reset role;
rollback;
select 'S3_REAL_PG_PASS';`;
    const result = spawnSync(psql, [
      "--host=127.0.0.1",
      `--port=${port}`,
      `--dbname=${database}`,
      "--no-psqlrc",
      "--set=ON_ERROR_STOP=1",
      "--quiet",
      "--tuples-only",
    ], {
      input: sql,
      encoding: "utf8",
      timeout: 30_000,
      maxBuffer: 1024 * 1024,
      windowsHide: true,
    });
    assert.ifError(result.error);
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /S3_REAL_PG_PASS/u);
  },
);
