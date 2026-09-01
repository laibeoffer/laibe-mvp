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
  if not exists (select 1 from pg_roles where rolname = 'drs_manifest_drift_owner') then
    create role drs_manifest_drift_owner nologin;
  end if;
end;
$$;

grant drs_manifest_drift_owner to postgres;

create schema if not exists extensions;
create schema knowledge;
create schema casework;
create schema integration;
create schema supabase_migrations;
grant usage, create on schema casework to drs_manifest_drift_owner;
grant usage, create on schema integration to drs_manifest_drift_owner;
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

create function casework.manifest_probe_trigger()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  return new;
end;
$$;
revoke all on function casework.manifest_probe_trigger() from public, anon, authenticated, service_role;

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
    'acl', coalesce(c.relacl, acldefault('r', c.relowner))::text,
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
    'acl', coalesce(p.proacl, acldefault('f', p.proowner))::text
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
  (select count(*) from pg_namespace where nspname = 'drs_private')
  + (select count(*)
       from pg_class c
       join pg_namespace n on n.oid = c.relnamespace
      where n.nspname in ('public', 'integration', 'drs_private')
        and c.relname like 'drs\_%' escape E'\\')
  + (select count(*)
       from pg_proc p
       join pg_namespace n on n.oid = p.pronamespace
      where n.nspname in ('public', 'integration', 'drs_private')
        and (p.proname like 'drs\_%' escape E'\\'
          or p.proname = 'fail_identity_link_state_claim_v1'))
  + (select count(*)
       from pg_type t
       join pg_namespace n on n.oid = t.typnamespace
      where n.nspname in ('public', 'integration', 'drs_private')
        and t.typname like 'drs\_%' escape E'\\')
  + (select count(*) from pg_extension where extname = 'btree_gist')
)::bigint;
`;

const policyRoleNormalizationSql = String.raw`
create temporary table policy_role_probe (id integer);
alter table policy_role_probe enable row level security;
create temporary table policy_role_probe_results (
  phase text primary key,
  name_fingerprint text not null,
  oid_fingerprint text not null
);

create role drs_policy_probe_alpha nologin;
create role drs_policy_probe_beta nologin;
create policy drs_policy_probe_named on policy_role_probe
  for select to drs_policy_probe_alpha, drs_policy_probe_beta using (true);

insert into policy_role_probe_results
select
  'alpha-first',
  pg_catalog.encode(extensions.digest(pg_catalog.convert_to(
    pg_catalog.jsonb_agg(role_name order by role_name)::text,
    'UTF8'
  ), 'sha256'), 'hex'),
  pg_catalog.encode(extensions.digest(pg_catalog.convert_to(
    pg_catalog.jsonb_agg(role_name order by role_oid)::text,
    'UTF8'
  ), 'sha256'), 'hex')
from (
  select
    role_oid,
    case when role_oid = 0 then 'PUBLIC'
      else pg_catalog.pg_get_userbyid(role_oid) end as role_name
  from pg_catalog.pg_policy policy_record
  cross join lateral pg_catalog.unnest(policy_record.polroles) role_oid
  where policy_record.polrelid = 'policy_role_probe'::pg_catalog.regclass
    and policy_record.polname = 'drs_policy_probe_named'
) policy_roles;

drop policy drs_policy_probe_named on policy_role_probe;
drop role drs_policy_probe_alpha;
drop role drs_policy_probe_beta;

create role drs_policy_probe_beta nologin;
create role drs_policy_probe_alpha nologin;
create policy drs_policy_probe_named on policy_role_probe
  for select to drs_policy_probe_alpha, drs_policy_probe_beta using (true);
create policy drs_policy_probe_public on policy_role_probe
  for select to public using (false);

insert into policy_role_probe_results
select
  'beta-first',
  pg_catalog.encode(extensions.digest(pg_catalog.convert_to(
    pg_catalog.jsonb_agg(role_name order by role_name)::text,
    'UTF8'
  ), 'sha256'), 'hex'),
  pg_catalog.encode(extensions.digest(pg_catalog.convert_to(
    pg_catalog.jsonb_agg(role_name order by role_oid)::text,
    'UTF8'
  ), 'sha256'), 'hex')
from (
  select
    role_oid,
    case when role_oid = 0 then 'PUBLIC'
      else pg_catalog.pg_get_userbyid(role_oid) end as role_name
  from pg_catalog.pg_policy policy_record
  cross join lateral pg_catalog.unnest(policy_record.polroles) role_oid
  where policy_record.polrelid = 'policy_role_probe'::pg_catalog.regclass
    and policy_record.polname = 'drs_policy_probe_named'
) policy_roles;

do $policy_probe$
declare
  alpha_first policy_role_probe_results%rowtype;
  beta_first policy_role_probe_results%rowtype;
  public_role_name text;
begin
  select * into strict alpha_first
  from policy_role_probe_results where phase = 'alpha-first';
  select * into strict beta_first
  from policy_role_probe_results where phase = 'beta-first';
  select case when role_oid = 0 then 'PUBLIC'
      else pg_catalog.pg_get_userbyid(role_oid) end
    into strict public_role_name
  from pg_catalog.pg_policy policy_record
  cross join lateral pg_catalog.unnest(policy_record.polroles) role_oid
  where policy_record.polrelid = 'policy_role_probe'::pg_catalog.regclass
    and policy_record.polname = 'drs_policy_probe_public';

  if alpha_first.name_fingerprint is distinct from beta_first.name_fingerprint then
    raise exception 'POLICY_ROLE_NAME_ORDER_UNSTABLE';
  end if;
  if alpha_first.oid_fingerprint is not distinct from beta_first.oid_fingerprint then
    raise exception 'POLICY_ROLE_OID_ORDER_DRIFT_NOT_REPRODUCED';
  end if;
  if public_role_name is distinct from 'PUBLIC' then
    raise exception 'POLICY_ROLE_PUBLIC_REPRESENTATION_INVALID';
  end if;
end;
$policy_probe$;

drop policy drs_policy_probe_named on policy_role_probe;
drop policy drs_policy_probe_public on policy_role_probe;
drop role drs_policy_probe_alpha;
drop role drs_policy_probe_beta;
`;

const hardenedFunctionAclSql = String.raw`
do $bridge$
declare
  expected record;
  function_record record;
begin
  for expected in
    select *
    from (values
      ('drs_private.is_authorized_case_specialist_at(uuid,uuid,timestamptz)', false, false),
      ('drs_private.is_current_actor_active_case_specialist(uuid)', true, false),
      ('drs_private.resolve_pgcrypto_schema()', false, false),
      ('drs_private.sha256_utf8(text)', false, false),
      ('drs_private.insert_drs_audit_event(uuid,uuid,uuid,text,timestamptz,text,text,text,uuid,text,jsonb,boolean,boolean)', false, false),
      ('public.drs_append_audit_event(uuid,uuid,uuid,text,text,text,text,text,uuid,text,jsonb,boolean)', false, true),
      ('public.drs_append_ai_review_event(uuid,uuid,uuid,text,uuid,text,uuid,jsonb,jsonb,text)', false, true)
    ) expected_contract(signature, allow_authenticated, allow_service_role)
  loop
    select p.* into strict function_record
    from pg_proc p
    where p.oid = to_regprocedure(expected.signature);

    if pg_get_userbyid(function_record.proowner) <> 'postgres'
      or coalesce(array_length(function_record.proconfig, 1), 0) <> 1
      or split_part(function_record.proconfig[1], '=', 1) <> 'search_path'
      or btrim(split_part(function_record.proconfig[1], '=', 2), '"') <> ''
      or exists (
        select 1
        from aclexplode(coalesce(
          function_record.proacl,
          acldefault('f', function_record.proowner)
        )) acl
        where acl.grantee = 0
          and acl.privilege_type = 'EXECUTE'
      )
      or has_function_privilege('anon', expected.signature, 'execute')
      or has_function_privilege('authenticated', expected.signature, 'execute')
        is distinct from expected.allow_authenticated
      or has_function_privilege('service_role', expected.signature, 'execute')
        is distinct from expected.allow_service_role
    then
      raise exception 'HARDENED_FUNCTION_CONTRACT_INVALID:%', expected.signature;
    end if;
  end loop;
end;
$bridge$;
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
    "cat >/tmp/policy-role-normalization.sql <<'SQL'",
    policyRoleNormalizationSql,
    "SQL",
    "cat >/tmp/hardened-function-acl.sql <<'SQL'",
    hardenedFunctionAclSql,
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
    "footprint_count() { psql -X -qAt -v ON_ERROR_STOP=1 -f /tmp/footprint.sql; }",
    'assert_zero_footprint() { local observed; observed=$(footprint_count); test "$observed" = 0 || { echo "unexpected DRS footprint: $observed" >&2; exit 75; }; }',
    "baseline=$(fingerprint)",
    "calendar_definition=$(sql \"select pg_get_functiondef('integration.google_calendar_drs_authorize_transaction_v1(uuid,uuid,text,text)'::regprocedure)\")",
    'assert_zero_footprint',
    "apply_file /tmp/policy-role-normalization.sql >/dev/null",
    "sql \"delete from supabase_migrations.schema_migrations where version='20260820112418'\" >/dev/null",
    "expect_file_failure /tmp/bridge.sql DRS_REMOTE_BASELINE_LEDGER_MISMATCH",
    'assert_zero_footprint',
    "sql \"insert into supabase_migrations.schema_migrations(version) values ('20260820112418')\" >/dev/null",
    'test "$(fingerprint)" = "$baseline"',
    "sql \"insert into supabase_migrations.schema_migrations(version) values ('20990101000000')\" >/dev/null",
    "expect_file_failure /tmp/bridge.sql DRS_REMOTE_BASELINE_LEDGER_MISMATCH",
    'assert_zero_footprint',
    "sql \"delete from supabase_migrations.schema_migrations where version='20990101000000'\" >/dev/null",
    'test "$(fingerprint)" = "$baseline"',
    'sql "grant select on casework.cases to authenticated" >/dev/null',
    "expect_file_failure /tmp/bridge.sql DRS_REMOTE_BASELINE_SCHEMA_MANIFEST_MISMATCH",
    'assert_zero_footprint',
    'sql "revoke select on casework.cases from authenticated" >/dev/null',
    'test "$(fingerprint)" = "$baseline"',
    'sql "grant select on casework.case_members to authenticated" >/dev/null',
    "expect_file_failure /tmp/bridge.sql DRS_REMOTE_BASELINE_SCHEMA_MANIFEST_MISMATCH",
    'assert_zero_footprint',
    'sql "revoke select on casework.case_members from authenticated" >/dev/null',
    'test "$(fingerprint)" = "$baseline"',
    'sql "alter table casework.cases owner to drs_manifest_drift_owner" >/dev/null',
    "expect_file_failure /tmp/bridge.sql DRS_REMOTE_BASELINE_SCHEMA_MANIFEST_MISMATCH",
    'assert_zero_footprint',
    'sql "alter table casework.cases owner to postgres" >/dev/null',
    'test "$(fingerprint)" = "$baseline"',
    'sql "alter table casework.case_members owner to drs_manifest_drift_owner" >/dev/null',
    "expect_file_failure /tmp/bridge.sql DRS_REMOTE_BASELINE_SCHEMA_MANIFEST_MISMATCH",
    'assert_zero_footprint',
    'sql "alter table casework.case_members owner to postgres" >/dev/null',
    'test "$(fingerprint)" = "$baseline"',
    'sql "alter table casework.cases disable row level security" >/dev/null',
    "expect_file_failure /tmp/bridge.sql DRS_REMOTE_BASELINE_SCHEMA_MANIFEST_MISMATCH",
    'assert_zero_footprint',
    'sql "alter table casework.cases enable row level security" >/dev/null',
    'test "$(fingerprint)" = "$baseline"',
    'sql "alter table casework.case_members disable row level security" >/dev/null',
    "expect_file_failure /tmp/bridge.sql DRS_REMOTE_BASELINE_SCHEMA_MANIFEST_MISMATCH",
    'assert_zero_footprint',
    'sql "alter table casework.case_members enable row level security" >/dev/null',
    'test "$(fingerprint)" = "$baseline"',
    'sql "alter table casework.cases force row level security" >/dev/null',
    "expect_file_failure /tmp/bridge.sql DRS_REMOTE_BASELINE_SCHEMA_MANIFEST_MISMATCH",
    'assert_zero_footprint',
    'sql "alter table casework.cases no force row level security" >/dev/null',
    'test "$(fingerprint)" = "$baseline"',
    'sql "alter table casework.case_members force row level security" >/dev/null',
    "expect_file_failure /tmp/bridge.sql DRS_REMOTE_BASELINE_SCHEMA_MANIFEST_MISMATCH",
    'assert_zero_footprint',
    'sql "alter table casework.case_members no force row level security" >/dev/null',
    'test "$(fingerprint)" = "$baseline"',
    'sql "alter table casework.cases add constraint drs_manifest_drift_check check (true)" >/dev/null',
    "expect_file_failure /tmp/bridge.sql DRS_REMOTE_BASELINE_SCHEMA_MANIFEST_MISMATCH",
    'assert_zero_footprint',
    'sql "alter table casework.cases drop constraint drs_manifest_drift_check" >/dev/null',
    'test "$(fingerprint)" = "$baseline"',
    'sql "alter table casework.case_members add constraint drs_manifest_drift_check check (true)" >/dev/null',
    "expect_file_failure /tmp/bridge.sql DRS_REMOTE_BASELINE_SCHEMA_MANIFEST_MISMATCH",
    'assert_zero_footprint',
    'sql "alter table casework.case_members drop constraint drs_manifest_drift_check" >/dev/null',
    'test "$(fingerprint)" = "$baseline"',
    'sql "create trigger drs_manifest_drift_trigger before update on casework.cases for each row execute function casework.manifest_probe_trigger()" >/dev/null',
    "expect_file_failure /tmp/bridge.sql DRS_REMOTE_BASELINE_SCHEMA_MANIFEST_MISMATCH",
    'assert_zero_footprint',
    'sql "drop trigger drs_manifest_drift_trigger on casework.cases" >/dev/null',
    'test "$(fingerprint)" = "$baseline"',
    'sql "create trigger drs_manifest_drift_trigger before update on casework.case_members for each row execute function casework.manifest_probe_trigger()" >/dev/null',
    "expect_file_failure /tmp/bridge.sql DRS_REMOTE_BASELINE_SCHEMA_MANIFEST_MISMATCH",
    'assert_zero_footprint',
    'sql "drop trigger drs_manifest_drift_trigger on casework.case_members" >/dev/null',
    'test "$(fingerprint)" = "$baseline"',
    'sql "create policy drs_manifest_allow_all on casework.cases for select to authenticated using (true)" >/dev/null',
    "expect_file_failure /tmp/bridge.sql DRS_REMOTE_BASELINE_SCHEMA_MANIFEST_MISMATCH",
    'assert_zero_footprint',
    'sql "drop policy drs_manifest_allow_all on casework.cases" >/dev/null',
    'test "$(fingerprint)" = "$baseline"',
    'sql "create policy drs_manifest_allow_all on casework.case_members for select to authenticated using (true)" >/dev/null',
    "expect_file_failure /tmp/bridge.sql DRS_REMOTE_BASELINE_SCHEMA_MANIFEST_MISMATCH",
    'assert_zero_footprint',
    'sql "drop policy drs_manifest_allow_all on casework.case_members" >/dev/null',
    'test "$(fingerprint)" = "$baseline"',
    "sql \"create or replace function integration.google_calendar_drs_authorize_transaction_v1(p_user_id uuid,p_case_id uuid,p_provider text,p_action text) returns jsonb language sql security definer set search_path = '' as \\\$\\\$ select jsonb_build_object('authorized', true); \\\$\\\$\" >/dev/null",
    "expect_file_failure /tmp/bridge.sql DRS_REMOTE_BASELINE_SCHEMA_MANIFEST_MISMATCH",
    'assert_zero_footprint',
    'sql "$calendar_definition" >/dev/null',
    'test "$(fingerprint)" = "$baseline"',
    'sql "alter function integration.google_calendar_drs_authorize_transaction_v1(uuid,uuid,text,text) owner to drs_manifest_drift_owner" >/dev/null',
    "expect_file_failure /tmp/bridge.sql DRS_REMOTE_BASELINE_SCHEMA_MANIFEST_MISMATCH",
    'assert_zero_footprint',
    'sql "alter function integration.google_calendar_drs_authorize_transaction_v1(uuid,uuid,text,text) owner to postgres" >/dev/null',
    'test "$(fingerprint)" = "$baseline"',
    'sql "grant execute on function integration.google_calendar_drs_authorize_transaction_v1(uuid,uuid,text,text) to authenticated" >/dev/null',
    "expect_file_failure /tmp/bridge.sql DRS_REMOTE_BASELINE_SCHEMA_MANIFEST_MISMATCH",
    'assert_zero_footprint',
    'sql "revoke execute on function integration.google_calendar_drs_authorize_transaction_v1(uuid,uuid,text,text) from authenticated" >/dev/null',
    'test "$(fingerprint)" = "$baseline"',
    'sql "create schema drs_private" >/dev/null',
    "expect_file_failure /tmp/bridge.sql DRS_REMOTE_BASELINE_PARTIAL_FOOTPRINT",
    'sql "drop schema drs_private" >/dev/null',
    'assert_zero_footprint',
    "expect_file_failure /tmp/injected.sql BRIDGE_INJECTED_FAILURE",
    'test "$(fingerprint)" = "$baseline"',
    'assert_zero_footprint',
    "apply_file /tmp/bridge.sql >/dev/null",
    'test "$(fingerprint)" = "$baseline"',
    'test "$(footprint_count)" -gt 0',
    "apply_file /tmp/hardened-function-acl.sql >/dev/null",
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
