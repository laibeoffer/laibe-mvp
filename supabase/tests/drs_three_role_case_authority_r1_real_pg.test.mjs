import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import process from "node:process";
import test from "node:test";

const EXPECTED_BRIDGE_SHA256 =
  "e05e7facb968bcb07baa89494564197f5018d6e94dac787f5898a87aa5479f96";
const EXPECTED_DOCKER_SHA256 =
  "0f97bc1111f59d859766ba938691ee07ed4e58d5fdaeb6f4dfb10a5ef5394753";
const POSTGRES_IMAGE =
  "sha256:28f0e16a019e648089fc1a6d333549a55548f6019c15ae4bd7cd58b989027518";
const dockerPath = process.env.DRS_AUTH_R1_DOCKER ?? "";
const bridgePath = process.env.DRS_AUTH_R1_A5_BRIDGE_PATH ?? "";
const harnessConfirmed = process.env.DRS_AUTH_R1_DISPOSABLE_CONFIRMED === "YES";
const migrationsUrl = new URL("../migrations/", import.meta.url);
const migrationNames = readdirSync(migrationsUrl).filter((name) =>
  /^\d+_drs_three_role_case_authority_r1\.sql$/u.test(name)
);
const harnessAvailable = harnessConfirmed && dockerPath.length > 0 &&
  bridgePath.length > 0 && existsSync(dockerPath) && existsSync(bridgePath) &&
  migrationNames.length === 1;

const IDS = Object.freeze({
  caseA: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  caseB: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
  owner: "11111111-1111-4111-8111-111111111111",
  vendor: "22222222-2222-4222-8222-222222222222",
  drs: "33333333-3333-4333-8333-333333333333",
  ownerB: "12121212-1212-4212-8212-121212121212",
  wrongRole: "13131313-1313-4313-8313-131313131313",
  ownerSession: "44444444-4444-4444-8444-444444444444",
  vendorSession: "55555555-5555-4555-8555-555555555555",
  drsSession: "66666666-6666-4666-8666-666666666666",
  ownerBSession: "14141414-1414-4414-8414-141414141414",
  wrongRoleSession: "15151515-1515-4515-8515-151515151515",
  ownerSecondSession: "27272727-2727-4727-8727-272727272727",
  ownerRaceSession: "31313131-3131-4131-8131-313131313131",
  ownerMembership: "77777777-7777-4777-8777-777777777777",
  vendorMembership: "88888888-8888-4888-8888-888888888888",
  drsMembership: "99999999-9999-4999-8999-999999999999",
  ownerBMembership: "16161616-1616-4616-8616-161616161616",
  wrongRoleMembership: "17171717-1717-4717-8717-171717171717",
  ownerSecondMembership: "28282828-2828-4828-8828-282828282828",
  ownerTechnical: "18181818-1818-4818-8818-181818181818",
  vendorTechnical: "19191919-1919-4919-8919-191919191919",
  drsTechnical: "20202020-2020-4020-8020-202020202020",
  ownerBTechnical: "21212121-2121-4121-8121-212121212121",
  revokeTechnical: "22222222-aaaa-4222-8222-222222222222",
  versionTechnical: "23232323-2323-4323-8323-232323232323",
  signoutTechnical: "24242424-2424-4424-8424-242424242424",
  wrongRoleTechnical: "25252525-2525-4525-8525-252525252525",
  ownerSecondTechnical: "29292929-2929-4929-8929-292929292929",
  replayTechnical: "30303030-3030-4030-8030-303030303030",
  ownerRaceTechnical: "32323232-3232-4232-8232-323232323232",
});

const BASELINE_SETUP_SQL = String.raw`
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
revoke all on function casework.manifest_probe_trigger()
  from public, anon, authenticated, service_role;

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
create table supabase_migrations.schema_migrations(version text primary key);
insert into supabase_migrations.schema_migrations(version) values
  ('20260820112418'), ('20260820112429'), ('20260820112430'),
  ('20260820112835'), ('20260824094039'), ('20260825065950'),
  ('20260826035856');
`;

const AUTH_HARNESS_SQL = String.raw`
create table auth.sessions (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  not_after timestamptz
);
alter table auth.sessions owner to postgres;
create function auth.jwt()
returns jsonb
language sql
stable
as $function$
  select coalesce(
    nullif(current_setting('request.jwt.claims', true), ''),
    '{}'
  )::jsonb;
$function$;
`;

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function base64(value) {
  return Buffer.from(value, "utf8").toString("base64");
}

function runDocker(shell) {
  return new Promise((resolve, reject) => {
    const child = spawn(dockerPath, [
      "run",
      "--rm",
      "--pull",
      "never",
      "--network",
      "none",
      "--name",
      `laibe-auth-r1-${process.pid}`.slice(0, 63),
      "--label",
      "laibe.task=drs-three-role-case-authority-r1",
      "-e",
      "POSTGRES_PASSWORD=postgres",
      "-e",
      "POSTGRES_DB=postgres",
      "-e",
      "PGPASSWORD=postgres",
      "-i",
      "--entrypoint",
      "bash",
      POSTGRES_IMAGE,
      "-s",
    ], {
      env: process.env.SystemRoot ? { SystemRoot: process.env.SystemRoot } : {},
      stdio: ["pipe", "pipe", "pipe"],
      windowsHide: true,
    });
    let stdout = "";
    let stderr = "";
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => stdout += chunk);
    child.stderr.on("data", (chunk) => stderr += chunk);
    child.on("error", reject);
    child.on("close", (code) => resolve({ code, stdout, stderr }));
    child.stdin.end(shell);
  });
}

test(
  "real PostgreSQL: isolated owner/vendor/DRS accounts, second-case RLS and invalidation effects=0",
  {
    skip: harnessAvailable
      ? false
      : "HOLD_AUTH_R1_DISPOSABLE_PG_HARNESS_NOT_CONFIRMED",
    timeout: 120_000,
  },
  async () => {
    assert.deepEqual(migrationNames, [
      "20260901174523_drs_three_role_case_authority_r1.sql",
    ]);
    assert.equal(statSync(dockerPath).size, 43_247_024);
    assert.equal(sha256(readFileSync(dockerPath)), EXPECTED_DOCKER_SHA256);
    const bridge = readFileSync(bridgePath, "utf8");
    assert.equal(sha256(bridge), EXPECTED_BRIDGE_SHA256);
    const migration = readFileSync(
      new URL(migrationNames[0], migrationsUrl),
      "utf8",
    );
    assert.doesNotMatch(migration, /C:\\/u);

    const digests = Object.freeze({
      owner: "A".repeat(43),
      vendor: "C".repeat(43),
      drs: "D".repeat(43),
      ownerB: "E".repeat(43),
      ownerSecond: "F".repeat(43),
      replay: "G".repeat(43),
      wrongRole: "H".repeat(43),
      ownerRace: "I".repeat(43),
    });
    const oauthDigest = "B".repeat(43);
    const fixtureSql = String.raw`
insert into auth.users(id) values
  ('${IDS.owner}'), ('${IDS.vendor}'), ('${IDS.drs}'),
  ('${IDS.ownerB}'), ('${IDS.wrongRole}');
insert into auth.sessions(id, user_id, not_after) values
  ('${IDS.ownerSession}', '${IDS.owner}', clock_timestamp() + interval '1 hour'),
  ('${IDS.vendorSession}', '${IDS.vendor}', clock_timestamp() + interval '1 hour'),
  ('${IDS.drsSession}', '${IDS.drs}', clock_timestamp() + interval '1 hour'),
  ('${IDS.ownerBSession}', '${IDS.ownerB}', clock_timestamp() + interval '1 hour'),
  ('${IDS.wrongRoleSession}', '${IDS.wrongRole}', clock_timestamp() + interval '1 hour'),
  ('${IDS.ownerSecondSession}', '${IDS.owner}', clock_timestamp() + interval '1 hour'),
  ('${IDS.ownerRaceSession}', '${IDS.owner}', clock_timestamp() + interval '1 hour');
insert into casework.cases(
  id, external_project_id, title, case_status, created_by, created_at, updated_at
) values
  ('${IDS.caseA}', 'AUTH-R1-A', 'Sanitized Case A', 'active', '${IDS.owner}', clock_timestamp(), clock_timestamp()),
  ('${IDS.caseB}', 'AUTH-R1-B', 'Sanitized Case B', 'active', '${IDS.ownerB}', clock_timestamp(), clock_timestamp());
insert into casework.case_members(case_id, user_id, role, added_by, added_at) values
  ('${IDS.caseA}', '${IDS.owner}', 'owner', '${IDS.owner}', clock_timestamp()),
  ('${IDS.caseA}', '${IDS.vendor}', 'pro', '${IDS.owner}', clock_timestamp()),
  ('${IDS.caseA}', '${IDS.drs}', 'pcm', '${IDS.owner}', clock_timestamp()),
  ('${IDS.caseB}', '${IDS.ownerB}', 'owner', '${IDS.ownerB}', clock_timestamp()),
  ('${IDS.caseB}', '${IDS.wrongRole}', 'pro', '${IDS.ownerB}', clock_timestamp()),
  ('${IDS.caseB}', '${IDS.owner}', 'owner', '${IDS.ownerB}', clock_timestamp());
insert into casework.drs_three_role_case_authority(
  case_id, authority_version, next_actor, updated_by, authority_basis
) values
  ('${IDS.caseA}', 4, 'vendor', '${IDS.owner}', 'sanitized-fixture'),
  ('${IDS.caseB}', 4, 'drs', '${IDS.ownerB}', 'sanitized-fixture');
insert into casework.drs_three_role_memberships(
  membership_id, case_id, user_id, role, status, valid_from,
  invited_by, authority_source, authority_version
) values
  ('${IDS.ownerMembership}', '${IDS.caseA}', '${IDS.owner}', 'owner', 'active', clock_timestamp() - interval '1 minute', '${IDS.owner}', 'case_creation', 4),
  ('${IDS.vendorMembership}', '${IDS.caseA}', '${IDS.vendor}', 'vendor', 'active', clock_timestamp() - interval '1 minute', '${IDS.owner}', 'case_invitation', 4),
  ('${IDS.drsMembership}', '${IDS.caseA}', '${IDS.drs}', 'drs', 'active', clock_timestamp() - interval '1 minute', '${IDS.owner}', 'drs_assignment', 4),
  ('${IDS.ownerBMembership}', '${IDS.caseB}', '${IDS.ownerB}', 'owner', 'active', clock_timestamp() - interval '1 minute', '${IDS.ownerB}', 'case_creation', 4),
  ('${IDS.wrongRoleMembership}', '${IDS.caseB}', '${IDS.wrongRole}', 'owner', 'active', clock_timestamp() - interval '1 minute', '${IDS.ownerB}', 'case_invitation', 4),
  ('${IDS.ownerSecondMembership}', '${IDS.caseB}', '${IDS.owner}', 'owner', 'active', clock_timestamp() - interval '1 minute', '${IDS.ownerB}', 'case_invitation', 4);
`;
    const shell = [
      "set -euo pipefail",
      "export PGHOST=127.0.0.1 PGPORT=5432 PGUSER=postgres PGDATABASE=postgres PGPASSWORD=postgres",
      "docker-entrypoint.sh postgres >/tmp/postgres.log 2>&1 &",
      "postgres_pid=$!",
      'cleanup() { pg_ctl -D "${PGDATA}" -m fast stop >/dev/null 2>&1 || kill "${postgres_pid}" >/dev/null 2>&1 || true; }',
      "trap cleanup EXIT",
      "for attempt in $(seq 1 90); do pg_isready -h 127.0.0.1 -U postgres -d postgres >/dev/null 2>&1 && break; sleep 1; done",
      "pg_isready -h 127.0.0.1 -U postgres -d postgres >/dev/null 2>&1 || { cat /tmp/postgres.log >&2; exit 70; }",
      "cat >/tmp/setup.b64 <<'B64'",
      base64(BASELINE_SETUP_SQL),
      "B64",
      "base64 -d /tmp/setup.b64 >/tmp/setup.sql",
      "cat >/tmp/auth-harness.b64 <<'B64'",
      base64(AUTH_HARNESS_SQL),
      "B64",
      "base64 -d /tmp/auth-harness.b64 >/tmp/auth-harness.sql",
      "cat >/tmp/bridge.b64 <<'B64'",
      base64(bridge),
      "B64",
      "base64 -d /tmp/bridge.b64 >/tmp/bridge.sql",
      "cat >/tmp/auth-r1.b64 <<'B64'",
      base64(migration),
      "B64",
      "base64 -d /tmp/auth-r1.b64 >/tmp/auth-r1.sql",
      "cat >/tmp/fixtures.b64 <<'B64'",
      base64(fixtureSql),
      "B64",
      "base64 -d /tmp/fixtures.b64 >/tmp/fixtures.sql",
      "psql -X -qAt -v ON_ERROR_STOP=1 -f /tmp/setup.sql >/dev/null",
      "PGUSER=supabase_admin psql -X -qAt -v ON_ERROR_STOP=1 -f /tmp/auth-harness.sql >/dev/null",
      'sql() { psql -X -qAt -v ON_ERROR_STOP=1 -c "$1"; }',
      'apply_file() { psql -X -qAt -v ON_ERROR_STOP=1 -f "$1"; }',
      'expect_sql_failure() { local statement=$1 marker=$2 output status; set +e; output=$(sql "$statement" 2>&1); status=$?; set -e; test $status -ne 0 || { echo "expected SQL failure: $marker" >&2; exit 71; }; grep -Fi "$marker" <<<"$output" >/dev/null || { echo "wrong SQL failure: $output" >&2; exit 72; }; }',
      'expect_file_failure() { local file=$1 marker=$2 output status; set +e; output=$(apply_file "$file" 2>&1); status=$?; set -e; test $status -ne 0 || { echo "expected file failure: $marker" >&2; exit 73; }; grep -F "$marker" <<<"$output" >/dev/null || { echo "wrong file failure: $output" >&2; exit 74; }; }',
      "apply_file /tmp/bridge.sql >/dev/null",
      "bridge_cases_columns=$(sql \"select count(*) from information_schema.columns where table_schema='casework' and table_name='cases'\")",
      "bridge_members_columns=$(sql \"select count(*) from information_schema.columns where table_schema='casework' and table_name='case_members'\")",
      'sql "alter table auth.sessions rename column not_after to not_after_drift" >/dev/null',
      "expect_file_failure /tmp/auth-r1.sql AUTH_R1_GOTRUE_SESSION_PREIMAGE_MISMATCH",
      "test \"$(sql \"select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname in ('casework','integration') and c.relname in ('drs_three_role_memberships','drs_three_role_case_authority','drs_three_role_oauth_states','drs_three_role_auth_session_bindings','drs_three_role_server_sessions')\")\" = \"0\"",
      'test "$(sql "select count(*) from pg_namespace where nspname=\'drs_auth_private\'")" = "0"',
      'sql "alter table auth.sessions rename column not_after_drift to not_after" >/dev/null',
      "apply_file /tmp/auth-r1.sql >/dev/null",
      'test "$(sql "select count(*) from information_schema.columns where table_schema=\'casework\' and table_name=\'cases\'")" = "$bridge_cases_columns"',
      'test "$(sql "select count(*) from information_schema.columns where table_schema=\'casework\' and table_name=\'case_members\'")" = "$bridge_members_columns"',
      'test "$(sql "select count(*) from pg_proc where oid=to_regprocedure(\'public.drs_server_session_verify_v1(uuid,text)\')")" = "1"',
      "apply_file /tmp/fixtures.sql >/dev/null",
      `sql "set role service_role; select public.drs_three_role_oauth_state_create_v1('${oauthDigest}','google','https://app.invalid/callback','ciphertext-fixture-value',clock_timestamp(),clock_timestamp()+interval '5 minutes')" >/dev/null`,
      `claim_token=$(sql "set role service_role; select public.drs_three_role_oauth_state_claim_v1('${oauthDigest}','google','https://app.invalid/callback',clock_timestamp())->>'claim_token'")`,
      'test -n "$claim_token"',
      "sql \"set role service_role; select public.drs_three_role_oauth_state_finalize_v1('$claim_token',clock_timestamp())\" >/dev/null",
      `test "$(sql "select (pkce_verifier_ciphertext is null)::text from integration.drs_three_role_oauth_states where state_digest='${oauthDigest}'")" = "true"`,
      `oauth_count_before=$(sql "select count(*) from integration.drs_three_role_oauth_states where state_digest='${oauthDigest}'")`,
      `expect_sql_failure "set role service_role; select * from public.drs_three_role_oauth_state_claim_v1('${oauthDigest}','google','https://app.invalid/callback',clock_timestamp())" OAUTH_STATE_INVALID_OR_CONSUMED`,
      `test "$(sql "select count(*) from integration.drs_three_role_oauth_states where state_digest='${oauthDigest}'")" = "$oauth_count_before"`,
      `bind() { sql "set role service_role; select public.drs_three_role_auth_session_bind_v1('$1','$2','$3',clock_timestamp())" >/dev/null; }`,
      `issue() { sql "set role service_role; select public.drs_three_role_server_session_issue_v1('$1','$2','$3','$4',clock_timestamp(),clock_timestamp()+interval '30 minutes')" >/dev/null; }`,
      `verify() { sql "set role service_role; select public.drs_three_role_server_session_verify_v1('$1','$2','$3','$4')"; }`,
      `rls_scalar() { sql "begin; set local role authenticated; select set_config('request.jwt.claim.sub','$1',true); select set_config('request.jwt.claims',jsonb_build_object('sub','$1','session_id','$2')::text,true); $3; rollback" | tail -n1; }`,
      `expect_sql_failure "set role service_role; select public.drs_three_role_server_session_issue_v1('${IDS.ownerTechnical}','${digests.owner}','${IDS.owner}','${IDS.ownerSession}',clock_timestamp(),clock_timestamp()+interval '30 minutes')" CASE_CONTEXT_REQUIRED`,
      `bind '${IDS.owner}' '${IDS.ownerSession}' '${IDS.ownerMembership}'`,
      `bind '${IDS.owner}' '${IDS.ownerSecondSession}' '${IDS.ownerSecondMembership}'`,
      `bind '${IDS.owner}' '${IDS.ownerRaceSession}' '${IDS.ownerMembership}'`,
      `PGAPPNAME=drs_race_bind psql -X -qAt -v ON_ERROR_STOP=1 -c "begin; set role service_role; select public.drs_three_role_auth_session_bind_v1('${IDS.owner}','${IDS.ownerRaceSession}','${IDS.ownerSecondMembership}',clock_timestamp()); select pg_sleep(2); commit" >/tmp/race-bind.out 2>/tmp/race-bind.err & race_bind_pid=$!`,
      'race_bind_sleeping=0; for attempt in $(seq 1 100); do race_bind_sleeping=$(sql "select count(*) from pg_stat_activity where application_name=\'drs_race_bind\' and wait_event_type=\'Timeout\' and query like \'%pg_sleep(2)%\'"); test "$race_bind_sleeping" = "1" && break; sleep 0.05; done; test "$race_bind_sleeping" = "1"',
      `issue '${IDS.ownerRaceTechnical}' '${digests.ownerRace}' '${IDS.owner}' '${IDS.ownerRaceSession}'`,
      'wait "$race_bind_pid"',
      `race_projection=$(verify '${IDS.ownerRaceTechnical}' '${digests.ownerRace}' '${IDS.owner}' '${IDS.ownerRaceSession}')`,
      `test "$(sql "select '$race_projection'::jsonb->>'case_id'")" = "${IDS.caseB}"`,
      `test "$(sql "select count(*) from integration.drs_three_role_server_sessions where auth_session_id='${IDS.ownerRaceSession}' and revoked_at is null and membership_id<>'${IDS.ownerSecondMembership}'")" = "0"`,
      `issue '${IDS.ownerTechnical}' '${digests.owner}' '${IDS.owner}' '${IDS.ownerSession}'`,
      `issue '${IDS.vendorTechnical}' '${digests.vendor}' '${IDS.vendor}' '${IDS.vendorSession}'`,
      `issue '${IDS.drsTechnical}' '${digests.drs}' '${IDS.drs}' '${IDS.drsSession}'`,
      `issue '${IDS.ownerBTechnical}' '${digests.ownerB}' '${IDS.ownerB}' '${IDS.ownerBSession}'`,
      `issue '${IDS.ownerSecondTechnical}' '${digests.ownerSecond}' '${IDS.owner}' '${IDS.ownerSecondSession}'`,
      `owner_projection=$(verify '${IDS.ownerTechnical}' '${digests.owner}' '${IDS.owner}' '${IDS.ownerSession}')`,
      `vendor_projection=$(verify '${IDS.vendorTechnical}' '${digests.vendor}' '${IDS.vendor}' '${IDS.vendorSession}')`,
      `drs_projection=$(verify '${IDS.drsTechnical}' '${digests.drs}' '${IDS.drs}' '${IDS.drsSession}')`,
      `owner_b_projection=$(verify '${IDS.ownerBTechnical}' '${digests.ownerB}' '${IDS.ownerB}' '${IDS.ownerBSession}')`,
      `owner_second_projection=$(verify '${IDS.ownerSecondTechnical}' '${digests.ownerSecond}' '${IDS.owner}' '${IDS.ownerSecondSession}')`,
      `test "$(sql "select count(*) from jsonb_object_keys('$owner_projection'::jsonb)")" = "8"`,
      `test "$(sql "select ('$owner_projection'::jsonb ? 'expires_at')::text")" = "true"`,
      `test "$(sql "select count(*) from jsonb_object_keys('$owner_projection'::jsonb - 'expires_at')")" = "7"`,
      `test "$(sql "select '$owner_projection'::jsonb->>'case_id'")" = "${IDS.caseA}"`,
      `test "$(sql "select '$vendor_projection'::jsonb->>'role'")" = "vendor"`,
      `test "$(sql "select '$drs_projection'::jsonb->>'role'")" = "drs"`,
      `test "$(sql "select '$owner_b_projection'::jsonb->>'case_id'")" = "${IDS.caseB}"`,
      `test "$(sql "select '$owner_second_projection'::jsonb->>'case_id'")" = "${IDS.caseB}"`,
      `test "$(rls_scalar '${IDS.owner}' '${IDS.ownerSession}' "select count(*) from casework.drs_three_role_memberships")" = "3"`,
      `test "$(rls_scalar '${IDS.owner}' '${IDS.ownerSession}' "select string_agg(distinct case_id::text,',' order by case_id::text) from casework.drs_three_role_memberships")" = "${IDS.caseA}"`,
      `test "$(rls_scalar '${IDS.owner}' '${IDS.ownerSession}' "select count(*) from casework.drs_three_role_memberships where case_id='${IDS.caseB}'")" = "0"`,
      `test "$(rls_scalar '${IDS.owner}' '${IDS.ownerSecondSession}' "select count(*) from casework.drs_three_role_memberships")" = "3"`,
      `test "$(rls_scalar '${IDS.owner}' '${IDS.ownerSecondSession}' "select string_agg(distinct case_id::text,',' order by case_id::text) from casework.drs_three_role_memberships")" = "${IDS.caseB}"`,
      `test "$(rls_scalar '${IDS.ownerB}' '${IDS.ownerBSession}' "select string_agg(distinct case_id::text,',' order by case_id::text) from casework.drs_three_role_memberships")" = "${IDS.caseB}"`,
      `test "$(rls_scalar '${IDS.vendor}' '${IDS.vendorSession}' "select string_agg(distinct case_id::text,',' order by case_id::text) from casework.drs_three_role_memberships")" = "${IDS.caseA}"`,
      `test "$(rls_scalar '${IDS.drs}' '${IDS.drsSession}' "select string_agg(distinct case_id::text,',' order by case_id::text) from casework.drs_three_role_memberships")" = "${IDS.caseA}"`,
      `test "$(rls_scalar '${IDS.wrongRole}' '${IDS.wrongRoleSession}' "select count(*) from casework.drs_three_role_memberships")" = "0"`,
      `test "$(rls_scalar '${IDS.owner}' '${IDS.ownerSession}' "select count(*) from casework.drs_three_role_case_authority where case_id='${IDS.caseA}'")" = "1"`,
      `test "$(rls_scalar '${IDS.owner}' '${IDS.ownerSession}' "with changed as (update casework.drs_three_role_memberships set role='drs' where case_id='${IDS.caseA}' returning 1) select count(*) from changed")" = "0"`,
      `test "$(rls_scalar '${IDS.owner}' '${IDS.ownerSession}' "with changed as (delete from casework.drs_three_role_memberships where case_id='${IDS.caseA}' returning 1) select count(*) from changed")" = "0"`,
      "expect_sql_failure \"set role anon; select count(*) from casework.drs_three_role_memberships\" 'permission denied'",
      'membership_count_before=$(sql "select count(*) from casework.drs_three_role_memberships")',
      `expect_sql_failure "begin; set local role authenticated; select set_config('request.jwt.claim.sub','${IDS.owner}',true); select set_config('request.jwt.claims',jsonb_build_object('sub','${IDS.owner}','session_id','${IDS.ownerSession}')::text,true); insert into casework.drs_three_role_memberships(membership_id,case_id,user_id,role,status,valid_from,invited_by,authority_source,authority_version) values ('26262626-2626-4626-8626-262626262626','${IDS.caseA}','${IDS.owner}','owner','active',clock_timestamp(),'${IDS.owner}','case_invitation',4)" 'row-level security policy'`,
      'test "$(sql "select count(*) from casework.drs_three_role_memberships")" = "$membership_count_before"',
      'session_count_before=$(sql "select count(*) from integration.drs_three_role_server_sessions")',
      `expect_sql_failure "set role service_role; select public.drs_three_role_server_session_issue_v1('${IDS.ownerTechnical}','${digests.owner}','${IDS.owner}','${IDS.ownerSession}',clock_timestamp(),clock_timestamp()+interval '30 minutes')" AUTH_SESSION_REPLAYED`,
      `expect_sql_failure "set role service_role; select public.drs_three_role_server_session_issue_v1('${IDS.replayTechnical}','${digests.owner}','${IDS.owner}','${IDS.ownerSession}',clock_timestamp(),clock_timestamp()+interval '30 minutes')" AUTH_SESSION_REPLAYED`,
      `expect_sql_failure "set role service_role; select public.drs_three_role_server_session_issue_v1('${IDS.replayTechnical}','${digests.replay}','${IDS.owner}','${IDS.ownerSession}',clock_timestamp(),clock_timestamp()+interval '30 minutes')" AUTH_SESSION_REPLAYED`,
      'test "$(sql "select count(*) from integration.drs_three_role_server_sessions")" = "$session_count_before"',
      `expect_sql_failure "set role service_role; select public.drs_three_role_server_session_issue_v1('${IDS.wrongRoleTechnical}','${digests.wrongRole}','${IDS.wrongRole}','${IDS.wrongRoleSession}',clock_timestamp(),clock_timestamp()+interval '30 minutes')" CASE_AUTHORITY_INVALID`,
      'test "$(sql "select count(*) from integration.drs_three_role_server_sessions")" = "$session_count_before"',
      `sql "set role service_role; select public.drs_three_role_server_session_revoke_v1('${IDS.ownerTechnical}',clock_timestamp())" >/dev/null`,
      `expect_sql_failure "set role service_role; select public.drs_three_role_server_session_verify_v1('${IDS.ownerTechnical}','${digests.owner}','${IDS.owner}','${IDS.ownerSession}')" AUTH_SESSION_OR_CASE_AUTHORITY_INVALID`,
      `test "$(rls_scalar '${IDS.owner}' '${IDS.ownerSession}' "select count(*) from casework.drs_three_role_memberships")" = "0"`,
      `sql "update auth.sessions set not_after=clock_timestamp()-interval '1 minute' where id='${IDS.ownerSecondSession}'" >/dev/null`,
      `expect_sql_failure "set role service_role; select public.drs_three_role_server_session_verify_v1('${IDS.ownerSecondTechnical}','${digests.ownerSecond}','${IDS.owner}','${IDS.ownerSecondSession}')" AUTH_SESSION_OR_CASE_AUTHORITY_INVALID`,
      `test "$(rls_scalar '${IDS.owner}' '${IDS.ownerSecondSession}' "select count(*) from casework.drs_three_role_memberships")" = "0"`,
      `sql "update casework.drs_three_role_memberships set status='revoked', revoked_at=clock_timestamp(), updated_at=clock_timestamp() where membership_id='${IDS.drsMembership}'" >/dev/null`,
      `expect_sql_failure "set role service_role; select public.drs_three_role_server_session_verify_v1('${IDS.drsTechnical}','${digests.drs}','${IDS.drs}','${IDS.drsSession}')" AUTH_SESSION_OR_CASE_AUTHORITY_INVALID`,
      `test "$(rls_scalar '${IDS.drs}' '${IDS.drsSession}' "select count(*) from casework.drs_three_role_memberships")" = "0"`,
      `sql "update casework.drs_three_role_memberships set authority_version=5, updated_at=clock_timestamp() where membership_id='${IDS.vendorMembership}'; update casework.drs_three_role_case_authority set authority_version=5, updated_at=clock_timestamp() where case_id='${IDS.caseA}'" >/dev/null`,
      `expect_sql_failure "set role service_role; select public.drs_three_role_server_session_verify_v1('${IDS.vendorTechnical}','${digests.vendor}','${IDS.vendor}','${IDS.vendorSession}')" AUTH_SESSION_OR_CASE_AUTHORITY_INVALID`,
      `test "$(rls_scalar '${IDS.vendor}' '${IDS.vendorSession}' "select count(*) from casework.drs_three_role_memberships")" = "0"`,
      `sql "delete from auth.sessions where id='${IDS.ownerBSession}'" >/dev/null`,
      `expect_sql_failure "set role service_role; select public.drs_three_role_server_session_verify_v1('${IDS.ownerBTechnical}','${digests.ownerB}','${IDS.ownerB}','${IDS.ownerBSession}')" AUTH_SESSION_OR_CASE_AUTHORITY_INVALID`,
      `test "$(rls_scalar '${IDS.ownerB}' '${IDS.ownerBSession}' "select count(*) from casework.drs_three_role_memberships")" = "0"`,
      `test "$(sql "select count(*) from integration.drs_three_role_server_sessions where server_session_id='${IDS.ownerBTechnical}'")" = "0"`,
      'test "$(sql "select count(*) from casework.drs_three_role_memberships where status=\'active\' and revoked_at is not null")" = "0"',
      "echo AUTH_R1_REAL_PG_PASS",
    ].join("\n");

    const result = await runDocker(shell);
    assert.equal(
      result.code,
      0,
      `disposable PostgreSQL harness failed\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`,
    );
    assert.match(result.stdout, /AUTH_R1_REAL_PG_PASS/u);
  },
);
