import assert from "node:assert/strict";
import { readFile, realpath } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import test from "node:test";

const database = "laibe_registration_authority_disposable";
const port = process.env.DRS_REGISTRATION_AUTHORITY_PG_PORT;
const enabled = process.env.DRS_REGISTRATION_AUTHORITY_ALLOW_DISPOSABLE === "1";
const psql = fileURLToPath(new URL("../../.codex-auth-r2/postgresql/bin/psql.exe", import.meta.url));
const migrationUrl = new URL("../migrations/20260909021753_drs_reviewer_registration_authority_v1.sql", import.meta.url);
const actor = "11111111-1111-4111-8111-111111111111";

test("registration authority uses live grants without disclosing or writing authority", { skip: !port || !enabled ? "REAL_PG_PENDING" : false }, async (t) => {
  assert.equal(port, "55439", "Only the dedicated disposable listener is allowed");
  await realpath(psql);
  const execute = (sql) => spawnSync(psql, ["--host=127.0.0.1", "--port=" + port, "--username=postgres", "--dbname=" + database, "--no-psqlrc", "--set=ON_ERROR_STOP=1", "--quiet", "--tuples-only", "--no-align"], { input: sql, encoding: "utf8", windowsHide: true, timeout: 10000 });
  const query = (sql) => {
    const result = execute(sql);
    assert.ifError(result.error);
    assert.equal(result.status, 0, result.stderr);
    return result.stdout.trim();
  };
  query(`do $guard$ begin if current_database()<>'${database}' or exists(select 1 from pg_namespace where nspname='auth') then raise exception 'Empty disposable target required';end if;end;$guard$;
    create role anon nologin; create role authenticated nologin; create role service_role nologin;
    create schema auth; create schema drs_forward_private;
    create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz,deleted_at timestamptz,banned_until timestamptz);
    create table drs_forward_private.reviewer_registration_operation_grants(actor_user_id uuid,operation text,scope text,status text,revoked_at timestamptz,valid_from timestamptz,valid_until timestamptz);
    alter table drs_forward_private.reviewer_registration_operation_grants enable row level security;
    alter table drs_forward_private.reviewer_registration_operation_grants force row level security;
    revoke all on drs_forward_private.reviewer_registration_operation_grants from public,anon,authenticated,service_role;`);
  query(await readFile(migrationUrl, "utf8"));
  const status = () => JSON.parse(query("begin read only;set local role service_role;select public.drs_reviewer_registration_authority_v1();rollback;"));
  await t.test("no operator is not configured", () => assert.deepEqual(status(), { configured: false }));
  query(`insert into auth.users values('${actor}','synthetic@example.test',now(),null,null);
    insert into drs_forward_private.reviewer_registration_operation_grants values('${actor}','reviewer_registration_decide','reviewer_registration','active',null,now()-interval '1 day',now()+interval '1 day');`);
  await t.test("eligible operator is configured in read-only transaction", () => assert.deepEqual(status(), { configured: true }));
  const grantChecks = [
    ["status='revoked'", "status='active'", "revoked status"],
    ["revoked_at=now()", "revoked_at=null", "revocation timestamp"],
    ["valid_until=now()", "valid_until=now()+interval '1 day'", "expired grant"],
    ["valid_from=now()+interval '1 hour'", "valid_from=now()-interval '1 day'", "future grant"],
    ["scope='case'", "scope='reviewer_registration'", "case scope cannot substitute"],
    ["operation='read_only'", "operation='reviewer_registration_decide'", "read-only operation cannot substitute"],
    ["actor_user_id='22222222-2222-4222-8222-222222222222'", `actor_user_id='${actor}'`, "missing Auth actor"],
  ];
  for (const [change, restore, label] of grantChecks) await t.test(label, () => {
    query("update drs_forward_private.reviewer_registration_operation_grants set " + change);
    assert.deepEqual(status(), { configured: false });
    query("update drs_forward_private.reviewer_registration_operation_grants set " + restore);
    assert.deepEqual(status(), { configured: true });
  });
  const userChecks = [
    ["email_confirmed_at=null", "email_confirmed_at=now()", "unverified email"],
    ["email=' '", "email='synthetic@example.test'", "empty email"],
    ["deleted_at=now()", "deleted_at=null", "deleted user"],
    ["banned_until=now()+interval '1 hour'", "banned_until=null", "banned user"],
  ];
  for (const [change, restore, label] of userChecks) await t.test(label, () => {
    query("update auth.users set " + change);
    assert.deepEqual(status(), { configured: false });
    query("update auth.users set " + restore);
  });
  for (const role of ["anon", "authenticated"]) await t.test(role + " cannot execute the privileged RPC", () => {
    const result = execute(`begin;set local role ${role};select public.drs_reviewer_registration_authority_v1();rollback;`);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /permission denied for function/);
  });
  await t.test("service role cannot inspect raw operator records", () => {
    const result = execute("begin;set local role service_role;select * from drs_forward_private.reviewer_registration_operation_grants;rollback;");
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /permission denied/);
  });
  await t.test("privileged callers also need the explicit service role", () => {
    const result = execute("select public.drs_reviewer_registration_authority_v1();");
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /service_role required/);
  });
  await t.test("status reflects removal without cached or invented assignment", () => {
    query("delete from drs_forward_private.reviewer_registration_operation_grants;");
    assert.deepEqual(status(), { configured: false });
    assert.equal(query("select count(*) from auth.users"), "1");
  });
});
