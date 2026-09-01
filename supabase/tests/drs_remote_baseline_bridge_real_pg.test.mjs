import assert from "node:assert/strict";

const dockerExecutable =
  "C:\\Users\\J\\AppData\\Local\\Programs\\DockerDesktop\\resources\\bin\\docker.exe";
const dockerBytes = 43_247_024;
const dockerSha256 =
  "0f97bc1111f59d859766ba938691ee07ed4e58d5fdaeb6f4dfb10a5ef5394753";
const imageTag = "public.ecr.aws/supabase/postgres:17.6.1.165";
const imageId =
  "sha256:28f0e16a019e648089fc1a6d333549a55548f6019c15ae4bd7cd58b989027518";
const migrationUrl = new URL(
  "../migrations/20260831182641_drs_remote_baseline_bridge_w2.sql",
  import.meta.url,
);

function taskId() {
  const values = Deno.args.filter((value) => value.startsWith("--task-id="));
  assert.equal(values.length <= 1, true, "at most one --task-id is allowed");
  if (values.length === 0) return "local";
  const value = values[0].slice("--task-id=".length);
  assert.match(value, /^[a-z0-9][a-z0-9_.-]{0,39}$/u);
  return value;
}

function encodeBase64(value) {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  for (let offset = 0; offset < bytes.length; offset += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
  }
  return btoa(binary);
}

async function sha256File(path) {
  const bytes = await Deno.readFile(path);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(
    new Uint8Array(digest),
    (byte) => byte.toString(16).padStart(2, "0"),
  ).join("");
}

const setupSql = String.raw`
drop schema if exists integration cascade;
drop schema if exists casework cascade;
drop schema if exists knowledge cascade;
drop schema if exists supabase_migrations cascade;

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon nologin;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then
    create role service_role nologin;
  end if;
end;
$$;

create schema if not exists extensions;
create schema knowledge;
create schema casework;
create schema integration;
create schema supabase_migrations;
create extension if not exists pgcrypto with schema extensions;
grant usage on schema integration to service_role;

create type knowledge.case_role as enum ('owner', 'pro', 'pcm', 'admin');

create table casework.cases (
  id uuid primary key,
  external_project_id text not null,
  title text not null,
  case_status text not null,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null,
  updated_at timestamptz not null
);

create table casework.case_members (
  case_id uuid not null references casework.cases(id),
  user_id uuid not null references auth.users(id),
  role knowledge.case_role not null,
  added_by uuid not null default auth.uid(),
  added_at timestamptz not null,
  primary key (case_id, user_id)
);

alter table casework.cases enable row level security;
alter table casework.case_members enable row level security;

create function integration.google_calendar_drs_authorize_transaction_v1(
  p_user_id uuid,
  p_case_id uuid,
  p_provider text,
  p_action text
)
returns jsonb
language sql
security definer
set search_path = ''
as $$
  select jsonb_build_object('authorized', false);
$$;
alter function integration.google_calendar_drs_authorize_transaction_v1(
  uuid, uuid, text, text
) owner to postgres;
revoke all on function integration.google_calendar_drs_authorize_transaction_v1(
  uuid, uuid, text, text
) from public, anon, authenticated, service_role;

create table supabase_migrations.schema_migrations (
  version text primary key
);
insert into supabase_migrations.schema_migrations(version) values
  ('20260820112418'),
  ('20260820112429'),
  ('20260820112430'),
  ('20260820112835'),
  ('20260824094039'),
  ('20260825065950'),
  ('20260826035856');
`;

const fingerprintSql = String.raw`
with protected_tables as (
  select jsonb_build_object(
    'relation', n.nspname || '.' || c.relname,
    'oid', c.oid,
    'owner', c.relowner,
    'acl', coalesce(c.relacl::text, ''),
    'rls', c.relrowsecurity,
    'force_rls', c.relforcerowsecurity,
    'columns', (
      select coalesce(jsonb_agg(jsonb_build_array(
        a.attname, format_type(a.atttypid, a.atttypmod), a.attnotnull,
        pg_get_expr(d.adbin, d.adrelid)
      ) order by a.attnum), '[]'::jsonb)
      from pg_attribute a
      left join pg_attrdef d on d.adrelid = a.attrelid and d.adnum = a.attnum
      where a.attrelid = c.oid and a.attnum > 0 and not a.attisdropped
    ),
    'constraints', (
      select coalesce(jsonb_agg(jsonb_build_array(
        x.conname, x.contype, x.convalidated, x.condeferrable,
        x.condeferred, pg_get_constraintdef(x.oid)
      ) order by x.conname), '[]'::jsonb)
      from pg_constraint x where x.conrelid = c.oid
    ),
    'triggers', (
      select coalesce(jsonb_agg(jsonb_build_array(
        t.tgname, t.tgenabled, t.tgisinternal, pg_get_triggerdef(t.oid)
      ) order by t.tgname), '[]'::jsonb)
      from pg_trigger t where t.tgrelid = c.oid
    ),
    'policies', (
      select coalesce(jsonb_agg(jsonb_build_array(
        p.polname, p.polcmd, p.polpermissive, p.polroles::text,
        pg_get_expr(p.polqual, p.polrelid),
        pg_get_expr(p.polwithcheck, p.polrelid)
      ) order by p.polname), '[]'::jsonb)
      from pg_policy p where p.polrelid = c.oid
    )
  ) as fact
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where (n.nspname, c.relname) in (
    ('casework', 'cases'), ('casework', 'case_members')
  )
), calendar as (
  select jsonb_build_object(
    'definition', pg_get_functiondef(p.oid),
    'owner', p.proowner,
    'acl', coalesce(p.proacl::text, '')
  ) as fact
  from pg_proc p
  where p.oid = 'integration.google_calendar_drs_authorize_transaction_v1(uuid,uuid,text,text)'::regprocedure
)
select jsonb_build_object(
  'ledger', (
    select jsonb_agg(version order by version)
    from supabase_migrations.schema_migrations
  ),
  'tables', (select jsonb_agg(fact order by fact->>'relation') from protected_tables),
  'calendar', (select fact from calendar)
)::text;
`;

const footprintSql = String.raw`
select (
  to_regnamespace('drs_private') is null
  and to_regclass('public.drs_cases') is null
  and to_regclass('public.drs_specialists') is null
  and to_regclass('integration.drs_identity_link_states') is null
  and to_regclass('integration.drs_auth_specialist_bindings') is null
  and to_regclass('integration.drs_case_identity_bindings') is null
  and to_regclass('integration.drs_server_sessions') is null
  and to_regclass('integration.drs_line_account_bindings') is null
  and to_regprocedure('public.drs_identity_link_state_create_v1(text,text,text,uuid,uuid,text,text,text,text,timestamptz,timestamptz)') is null
  and to_regprocedure('public.drs_identity_link_state_claim_v1(text,text,text,timestamptz)') is null
  and to_regprocedure('public.drs_identity_link_state_fail_v1(uuid,timestamptz,text)') is null
  and to_regprocedure('public.drs_identity_callback_prepare_v1(uuid,text,text,text,timestamptz)') is null
  and to_regprocedure('public.drs_identity_callback_finalize_v1(uuid,text,text,text,uuid,uuid,text,text,timestamptz,uuid)') is null
)::int;
`;

Deno.test("disposable exact-seven bridge applies atomically and fails closed", async () => {
  const dockerStat = await Deno.stat(dockerExecutable);
  assert.equal(
    dockerStat.size,
    dockerBytes,
    "pinned Docker executable byte drift",
  );
  assert.equal(
    await sha256File(dockerExecutable),
    dockerSha256,
    "pinned Docker executable hash drift",
  );

  const migration = await Deno.readTextFile(migrationUrl);
  assert.match(migration, /DRS_REMOTE_BASELINE_LEDGER_MISMATCH/u);
  const injected = migration.replace(
    "-- BRIDGE_PHASE_IDENTITY_FOUNDATION",
    "do $$ begin raise exception 'BRIDGE_INJECTED_FAILURE'; end $$;\n-- BRIDGE_PHASE_IDENTITY_FOUNDATION",
  );
  assert.notEqual(injected, migration);

  const runId = `${taskId()}-${crypto.randomUUID().slice(0, 8)}`;
  const containerName = `laibe-a5-bridge-${runId}`.slice(0, 63);
  const shell = [
    "set -euo pipefail",
    "export PGHOST=127.0.0.1 PGPORT=5432 PGUSER=postgres PGDATABASE=postgres PGPASSWORD=postgres",
    "docker-entrypoint.sh postgres >/tmp/postgres.log 2>&1 &",
    "postgres_pid=$!",
    'cleanup() { pg_ctl -D "${PGDATA}" -m fast stop >/dev/null 2>&1 || kill "${postgres_pid}" >/dev/null 2>&1 || true; }',
    "trap cleanup EXIT",
    "for attempt in $(seq 1 90); do pg_isready -h 127.0.0.1 -U postgres -d postgres >/dev/null 2>&1 && break; sleep 1; done",
    "pg_isready -h 127.0.0.1 -U postgres -d postgres >/dev/null 2>&1 || { cat /tmp/postgres.log >&2; exit 70; }",
    "cat >/tmp/setup.sql <<'SQL'",
    setupSql,
    "SQL",
    "cat >/tmp/fingerprint.sql <<'SQL'",
    fingerprintSql,
    "SQL",
    "cat >/tmp/footprint.sql <<'SQL'",
    footprintSql,
    "SQL",
    "cat >/tmp/bridge.b64 <<'B64'",
    encodeBase64(migration),
    "B64",
    "base64 -d /tmp/bridge.b64 >/tmp/bridge.sql",
    "cat >/tmp/injected.b64 <<'B64'",
    encodeBase64(injected),
    "B64",
    "base64 -d /tmp/injected.b64 >/tmp/injected.sql",
    "psql -X -v ON_ERROR_STOP=1 -f /tmp/setup.sql >/dev/null",
    'sql() { psql -X -qAt -v ON_ERROR_STOP=1 -c "$1"; }',
    'apply_file() { psql -X -qAt -v ON_ERROR_STOP=1 -f "$1"; }',
    'expect_file_failure() { local file=$1 marker=$2 output status; set +e; output=$(apply_file "$file" 2>&1); status=$?; set -e; test $status -ne 0 || { echo "expected failure: $marker" >&2; exit 71; }; grep -F "$marker" <<<"$output" >/dev/null || { echo "wrong failure: $output" >&2; exit 72; }; }',
    'expect_sql_failure() { local statement=$1 marker=$2 output status; set +e; output=$(sql "$statement" 2>&1); status=$?; set -e; test $status -ne 0 || { echo "expected SQL failure: $marker" >&2; exit 73; }; grep -Fi "$marker" <<<"$output" >/dev/null || { echo "wrong SQL failure: $output" >&2; exit 74; }; }',
    "fingerprint() { psql -X -qAt -v ON_ERROR_STOP=1 -f /tmp/fingerprint.sql; }",
    "footprint() { psql -X -qAt -v ON_ERROR_STOP=1 -f /tmp/footprint.sql; }",
    "baseline=$(fingerprint)",
    'test "$(footprint)" = 1',
    "sql \"delete from supabase_migrations.schema_migrations where version='20260820112418'\" >/dev/null",
    "expect_file_failure /tmp/bridge.sql DRS_REMOTE_BASELINE_LEDGER_MISMATCH",
    "sql \"insert into supabase_migrations.schema_migrations(version) values ('20260820112418')\" >/dev/null",
    'test "$(fingerprint)" = "$baseline"',
    "sql \"insert into supabase_migrations.schema_migrations(version) values ('20990101000000')\" >/dev/null",
    "expect_file_failure /tmp/bridge.sql DRS_REMOTE_BASELINE_LEDGER_MISMATCH",
    "sql \"delete from supabase_migrations.schema_migrations where version='20990101000000'\" >/dev/null",
    'test "$(fingerprint)" = "$baseline"',
    'sql "alter table casework.cases force row level security" >/dev/null',
    "expect_file_failure /tmp/bridge.sql DRS_REMOTE_BASELINE_SCHEMA_MANIFEST_MISMATCH",
    'sql "alter table casework.cases no force row level security" >/dev/null',
    'test "$(fingerprint)" = "$baseline"',
    'sql "create schema drs_private" >/dev/null',
    "expect_file_failure /tmp/bridge.sql DRS_REMOTE_BASELINE_PARTIAL_FOOTPRINT",
    'sql "drop schema drs_private" >/dev/null',
    'test "$(footprint)" = 1',
    "expect_file_failure /tmp/injected.sql BRIDGE_INJECTED_FAILURE",
    'test "$(fingerprint)" = "$baseline"',
    'test "$(footprint)" = 1',
    "apply_file /tmp/bridge.sql >/dev/null",
    'test "$(fingerprint)" = "$baseline"',
    'test "$(footprint)" = 0',
    "sql \"do \\\$\\\$ declare s text; begin foreach s in array array['public.drs_identity_link_state_create_v1(text,text,text,uuid,uuid,text,text,text,text,timestamptz,timestamptz)','public.drs_identity_link_state_claim_v1(text,text,text,timestamptz)','public.drs_identity_link_state_fail_v1(uuid,timestamptz,text)','public.drs_identity_callback_prepare_v1(uuid,text,text,text,timestamptz)','public.drs_identity_callback_finalize_v1(uuid,text,text,text,uuid,uuid,text,text,timestamptz,uuid)'] loop if to_regprocedure(s) is null or not has_function_privilege('service_role',s,'execute') or has_function_privilege('anon',s,'execute') or has_function_privilege('authenticated',s,'execute') then raise exception 'WRAPPER_ACL_INVALID'; end if; end loop; end \\\$\\\$\" >/dev/null",
    "sql \"do \\\$\\\$ declare s text; begin if has_schema_privilege('service_role','integration','usage') then raise exception 'PRIVATE_SCHEMA_EXPOSED'; end if; foreach s in array array['integration.drs_identity_link_state_create_v1(text,text,text,uuid,uuid,text,text,text,text,timestamptz,timestamptz)','integration.drs_identity_link_state_claim_v1(text,text,text,timestamptz)','integration.fail_identity_link_state_claim_v1(uuid,timestamptz,text)','integration.drs_identity_callback_prepare_v1(uuid,text,text,text,timestamptz)','integration.drs_identity_callback_finalize_v1(uuid,text,text,text,uuid,uuid,text,text,timestamptz,uuid)','integration.drs_identity_provider_revoke_v1(uuid,text,timestamptz,uuid)'] loop if has_function_privilege('service_role',s,'execute') then raise exception 'PRIVATE_FUNCTION_EXPOSED'; end if; end loop; end \\\$\\\$\" >/dev/null",
    "sql \"set role service_role; select public.drs_identity_link_state_create_v1('state-digest-a','nonce-digest-a','ciphertext-a',null,null,null,'line','login','https://local.invalid/callback',clock_timestamp()+interval '10 minutes',clock_timestamp())\" >/dev/null",
    "claim_token=$(sql \"set role service_role; select claim_token::text from public.drs_identity_link_state_claim_v1('state-digest-a','line','https://local.invalid/callback',clock_timestamp())\")",
    'test -n "$claim_token"',
    "sql \"set role service_role; select public.drs_identity_link_state_fail_v1('$claim_token',clock_timestamp(),'LOCAL_TEST_FAILURE')\" >/dev/null",
    "expect_sql_failure \"set role service_role; select * from public.drs_identity_link_state_claim_v1('state-digest-a','line','https://local.invalid/callback',clock_timestamp())\" OAUTH_STATE_CONSUMED",
    "expect_sql_failure \"set role service_role; insert into integration.drs_identity_link_states(state_digest,nonce_digest,pkce_verifier_ciphertext,provider,intended_action,redirect_uri,expires_at) values ('forbidden','forbidden','forbidden','line','login','https://local.invalid/callback',clock_timestamp()+interval '1 minute')\" 'permission denied'",
    'state_before=$(sql "select count(*) from integration.drs_identity_link_states")',
    "expect_file_failure /tmp/bridge.sql DRS_REMOTE_BASELINE_PARTIAL_FOOTPRINT",
    'test "$(sql "select count(*) from integration.drs_identity_link_states")" = "$state_before"',
    'test "$(fingerprint)" = "$baseline"',
    "echo BRIDGE_REAL_PG_PASS",
  ].join("\n");

  const command = new Deno.Command(dockerExecutable, {
    args: [
      "run",
      "--rm",
      "--pull",
      "never",
      "--network",
      "none",
      "--name",
      containerName,
      "--label",
      "laibe.task=drs-remote-baseline-bridge-w2",
      "--label",
      `laibe.run=${runId}`,
      "-e",
      "POSTGRES_PASSWORD=postgres",
      "-e",
      "POSTGRES_DB=postgres",
      "-e",
      "PGPASSWORD=postgres",
      "-i",
      "--entrypoint",
      "bash",
      imageId,
      "-s",
    ],
    clearEnv: true,
    env: { SystemRoot: "C:\\WINDOWS" },
    stdin: "piped",
    stdout: "piped",
    stderr: "piped",
  });
  const child = command.spawn();
  const writer = child.stdin.getWriter();
  await writer.write(new TextEncoder().encode(shell));
  await writer.close();
  const output = await child.output();
  const stdout = new TextDecoder().decode(output.stdout);
  const stderr = new TextDecoder().decode(output.stderr);
  assert.equal(
    output.success,
    true,
    `disposable PostgreSQL harness failed\nstdout:\n${stdout}\nstderr:\n${stderr}`,
  );
  assert.match(stdout, /BRIDGE_REAL_PG_PASS/u);
  assert.equal(imageTag, "public.ecr.aws/supabase/postgres:17.6.1.165");
});
