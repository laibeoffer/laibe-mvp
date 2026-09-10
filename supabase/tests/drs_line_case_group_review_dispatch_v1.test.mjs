import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import process from "node:process";
import test from "node:test";

const migration = new URL(
  "../migrations/20260911090000_drs_line_case_group_review_dispatch_v1.sql",
  import.meta.url,
);
const sql = readFileSync(migration, "utf8");

const TABLES = [
  "drs_line_case_group_binding_intents",
  "drs_line_case_group_bindings",
  "drs_line_case_group_webhook_events",
  "drs_line_review_notification_outbox",
  "drs_line_review_delivery_receipts",
  "drs_line_case_audit_events",
];
const RPCS = [
  "drs_line_case_group_binding_start_v1",
  "drs_line_case_group_bind_from_webhook_v1",
  "drs_line_review_notification_enqueue_v1",
  "drs_line_review_notification_claim_v1",
  "drs_line_review_notification_assert_current_v1",
  "drs_line_review_notification_complete_v1",
];

function functionSource(name) {
  const match = sql.match(
    new RegExp(
      `create function public\\.${name}\\(\\s*p_input jsonb\\s*\\)[\\s\\S]*?\\$function\\$;`,
      "iu",
    ),
  );
  assert.ok(match, `${name}(jsonb) must exist`);
  return match[0];
}

test("migration creates six private durable routing and audit relations", () => {
  for (const name of TABLES) {
    assert.match(sql, new RegExp(`create table integration\\.${name}`, "iu"));
    assert.match(
      sql,
      new RegExp(
        `alter table integration\\.${name} enable row level security`,
        "iu",
      ),
    );
    assert.match(
      sql,
      new RegExp(
        `alter table integration\\.${name} force row level security`,
        "iu",
      ),
    );
    assert.match(
      sql,
      new RegExp(
        `revoke all on table integration\\.${name}[\\s\\S]*?from public, anon, authenticated, service_role`,
        "iu",
      ),
    );
  }
});

test("group authority is stored encrypted and collision-safe without raw identifiers", () => {
  assert.match(sql, /line_group_digest\s+text\s+not null/iu);
  assert.match(sql, /line_group_ciphertext\s+text\s+not null/iu);
  assert.match(sql, /line_group_iv\s+text\s+not null/iu);
  assert.match(sql, /encryption_key_version\s+text\s+not null/iu);
  assert.match(
    sql,
    /unique index drs_line_case_group_bindings_one_active_case/iu,
  );
  assert.match(
    sql,
    /unique index drs_line_case_group_bindings_one_active_group/iu,
  );
  assert.doesNotMatch(sql, /line_group_id\s+text/iu);
  assert.doesNotMatch(sql, /\{24,256\}/u);
  assert.match(
    sql,
    /length\(line_group_ciphertext\) between 24 and 256[\s\S]*?line_group_ciphertext ~ '\^\[A-Za-z0-9_-\]\+\$'/iu,
  );
});

test("browser-adjacent RPCs derive authority from verified sessions and server records", () => {
  const start = functionSource("drs_line_case_group_binding_start_v1");
  assert.match(start, /drs_auth_session_lock_v1/iu);
  assert.match(start, /owner_workspace_grant_v1/iu);
  assert.doesNotMatch(start, /p_input\s*->>\s*'case_id'/iu);
  assert.doesNotMatch(start, /p_input\s*->>\s*'line_group/iu);

  const enqueue = functionSource("drs_line_review_notification_enqueue_v1");
  assert.match(enqueue, /drs_auth_bound_server_session_verify_v1/iu);
  assert.match(enqueue, /casework\.case_events/iu);
  assert.match(enqueue, /drs_forward_private\.document_reviews/iu);
  assert.match(enqueue, /\^\[A-Za-z0-9_-\]\{43\}\$/u);
  assert.match(enqueue, /v_verified\s*->>\s*'auth_session_id'/iu);
  assert.match(enqueue, /v_verified\s*->>\s*'specialist_id'/iu);
  assert.match(enqueue, /v_verified\s*->>\s*'authorization_subject'/iu);
  assert.doesNotMatch(enqueue, /v_verified\s*->>\s*'account_role'/iu);
  assert.doesNotMatch(enqueue, /p_input\s*->>\s*'case_id'/iu);
  assert.doesNotMatch(enqueue, /p_input\s*->>\s*'line_group/iu);
  assert.doesNotMatch(enqueue, /p_input\s*->>\s*'email'/iu);
});

test("webhook binding is one-time, signed-edge-derived, and replay resistant", () => {
  const bind = functionSource("drs_line_case_group_bind_from_webhook_v1");
  assert.match(bind, /webhook_event_digest/iu);
  assert.match(bind, /challenge_digest/iu);
  assert.match(bind, /for update/iu);
  assert.match(bind, /intent_state\s*=\s*'pending'/iu);
  assert.match(bind, /expires_at\s*>\s*v_now/iu);
  assert.match(bind, /drs_auth_session_lock_v1/iu);
  assert.match(bind, /owner_workspace_grant_v1/iu);
  assert.match(bind, /v_grant[\s\S]*?case_id[\s\S]*?v_intent\.case_id/iu);
  assert.match(
    bind,
    /v_existing_webhook[\s\S]*?provider_channel_digest[\s\S]*?challenge_digest[\s\S]*?line_group_digest/iu,
  );
  assert.match(sql, /unique\s*\(webhook_event_digest\)/iu);
});

test("review event derives the expected case before specialist authorization", () => {
  const enqueue = functionSource("drs_line_review_notification_enqueue_v1");
  assert.match(enqueue, /where id = v_review_event_id/iu);
  assert.match(enqueue, /where event_id = v_review_event_id/iu);
  assert.match(
    enqueue,
    /v_event\.event_type is distinct from 'DOCUMENT_REVIEW_SUBMITTED'/iu,
  );
  assert.match(
    enqueue,
    /v_review\.case_id is distinct from v_event\.case_id/iu,
  );
  assert.match(
    enqueue,
    /v_review\.reviewer_user_id is distinct from v_event\.actor_id/iu,
  );
  assert.doesNotMatch(
    enqueue,
    /v_event\.(?:event_id|actor_user_id|payload_sha256|payload)\b/iu,
  );
});

test("dispatch revalidates reviewer event, assignment, case, and active group binding", () => {
  const claim = functionSource("drs_line_review_notification_claim_v1");
  const assertCurrent = functionSource(
    "drs_line_review_notification_assert_current_v1",
  );
  for (const source of [claim, assertCurrent]) {
    assert.match(source, /drs_password_authority_resolve_locked_v1/iu);
    assert.match(source, /casework\.case_events/iu);
    assert.match(source, /drs_forward_private\.document_reviews/iu);
    assert.match(source, /drs_line_case_group_bindings/iu);
    assert.match(source, /binding_version/iu);
    assert.doesNotMatch(
      source,
      /v_event\.(?:event_id|actor_user_id|payload_sha256|payload)\b/iu,
    );
  }
});

test("migration targets the deployed document review schema without shared-table rewrites", () => {
  assert.match(sql, /to_regclass\('drs_forward_private\.document_reviews'\)/iu);
  assert.match(
    sql,
    /to_regprocedure\(\s*'public\.drs_auth_bound_server_session_verify_v1\(uuid,text,uuid,uuid,text\)'\s*\)/iu,
  );
  assert.match(
    sql,
    /review_event_id uuid not null[\s\S]*?references casework\.case_events\(id\)/iu,
  );
  assert.doesNotMatch(
    sql,
    /references casework\.case_events\(case_id,\s*event_id\)/iu,
  );
  assert.doesNotMatch(sql, /alter table casework\.case_events/iu);
});

test("a crashed twentieth provider attempt can reclaim the same retry key", () => {
  const claim = functionSource("drs_line_review_notification_claim_v1");
  assert.match(
    claim,
    /delivery_state = 'dispatching'[\s\S]*?attempt_count <= 20/iu,
  );
  assert.match(
    claim,
    /attempt_count = case[\s\S]*?delivery_state = 'dispatching'[\s\S]*?then attempt_count[\s\S]*?else attempt_count \+ 1[\s\S]*?end/iu,
  );
});

test("provider acceptance writes an append-only delivery receipt and audit event", () => {
  const complete = functionSource("drs_line_review_notification_complete_v1");
  assert.match(complete, /drs_line_review_delivery_receipts/iu);
  assert.match(complete, /provider_request_id/iu);
  assert.match(complete, /provider_accepted_request_id/iu);
  assert.match(complete, /provider_message_id/iu);
  assert.match(complete, /LINE_REVIEW_NOTIFICATION_SENT/iu);
  assert.match(sql, /raise exception 'DRS_LINE_CASE_APPEND_ONLY'/iu);
  for (
    const table of [
      "drs_line_review_delivery_receipts",
      "drs_line_case_audit_events",
    ]
  ) {
    assert.match(
      sql,
      new RegExp(
        `create trigger ${table}_append_only[\\s\\S]*?before update or delete[\\s\\S]*?on integration\\.${table}`,
        "iu",
      ),
    );
  }
});

test("review notifications preserve intended LINE breaks but reject other controls", () => {
  assert.match(
    sql,
    /translate\(message_text,\s*E'\\t\\n\\r',\s*''\)\s*!~\s*'\[\[:cntrl:\]\]'/iu,
  );
  assert.match(
    sql,
    /translate\(v_message,\s*E'\\t\\n\\r',\s*''\)\s*~\s*'\[\[:cntrl:\]\]'/iu,
  );
});

test("database message limits use the LINE UTF-16 code-unit boundary", () => {
  assert.match(
    sql,
    /create function integration\.drs_line_utf16_length_v1\(p_value text\)/iu,
  );
  assert.match(
    sql,
    /drs_line_utf16_length_v1\(message_text\) between 1 and 5000/iu,
  );
  assert.match(
    sql,
    /drs_line_utf16_length_v1\(v_message\) not between 1 and 5000/iu,
  );
});

test("all public RPCs are service-role-only security definer functions", () => {
  for (const name of RPCS) {
    const source = functionSource(name);
    assert.match(source, /security definer/iu);
    assert.match(source, /set search_path = ''/iu);
    assert.match(source, /current_setting\('role', true\)/iu);
    assert.match(
      sql,
      new RegExp(
        `revoke all on function public\\.${name}\\(jsonb\\)[\\s\\S]*?from public, anon, authenticated, service_role`,
        "iu",
      ),
    );
    assert.match(
      sql,
      new RegExp(
        `grant execute on function public\\.${name}\\(jsonb\\) to service_role`,
        "iu",
      ),
    );
  }
});

const realPgPsql = process.env.DRS_LINE_A14_PSQL;
const realPgPort = process.env.DRS_LINE_A14_PG_PORT;
const realPgEnabled = process.env.DRS_LINE_A14_ALLOW_DISPOSABLE === "1";
const realPgDatabase = "laibe_a14_line_disposable";

function realPgArgs(extra = []) {
  return [
    "--no-psqlrc",
    "--no-password",
    "--set",
    "ON_ERROR_STOP=1",
    "--quiet",
    "--tuples-only",
    "--no-align",
    "--username",
    "postgres",
    "--host",
    "127.0.0.1",
    "--port",
    realPgPort,
    "--dbname",
    realPgDatabase,
    ...extra,
  ];
}

function realPgQuery(input) {
  const result = spawnSync(realPgPsql, realPgArgs(), {
    input,
    encoding: "utf8",
    timeout: 60_000,
    maxBuffer: 4 * 1024 * 1024,
    windowsHide: true,
  });
  assert.ifError(result.error);
  assert.equal(result.status, 0, result.stderr || "psql did not complete");
  return result.stdout.trim();
}

function realPgCommandAsync(command) {
  return new Promise((resolve, reject) => {
    const child = spawn(realPgPsql, realPgArgs(["--command", command]), {
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => {
      child.kill();
      reject(new Error("parallel psql timed out"));
    }, 30_000);
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => stdout += chunk);
    child.stderr.on("data", (chunk) => stderr += chunk);
    child.once("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.once("close", (code) => {
      clearTimeout(timer);
      code === 0 ? resolve(stdout.trim()) : reject(
        new Error(stderr || `parallel psql exited ${code}`),
      );
    });
  });
}

test(
  "A14 real PostgreSQL: migration, authority, RLS, replay and concurrent claims",
  {
    skip: !realPgPsql || !realPgPort || !realPgEnabled
      ? "REAL_PG_PENDING: set task-owned DRS_LINE_A14_PSQL, DRS_LINE_A14_PG_PORT and DRS_LINE_A14_ALLOW_DISPOSABLE=1"
      : false,
  },
  async () => {
    assert.match(realPgPort, /^\d{4,5}$/u);
    assert.ok(Number(realPgPort) >= 1024 && Number(realPgPort) <= 65535);
    const bootstrap = String.raw`
begin;
do $roles$
begin
  if not exists (select 1 from pg_roles where rolname='anon') then
    create role anon nologin;
  end if;
  if not exists (select 1 from pg_roles where rolname='authenticated') then
    create role authenticated nologin;
  end if;
  if not exists (select 1 from pg_roles where rolname='service_role') then
    create role service_role nologin;
  end if;
end;
$roles$;
create schema extensions;
create extension pgcrypto with schema extensions;
create schema auth;
create schema casework;
create schema integration;
create schema drs_forward_private;
create schema drs_test;
create table auth.users (
  id uuid primary key,
  deleted_at timestamptz,
  banned_until timestamptz
);
create table auth.sessions (
  id uuid primary key,
  user_id uuid not null references auth.users(id),
  not_after timestamptz
);
create table casework.cases (
  id uuid primary key,
  case_status text not null,
  title text not null
);
create table casework.case_members (
  membership_id uuid primary key,
  case_id uuid not null references casework.cases(id),
  user_id uuid not null references auth.users(id),
  role text not null,
  membership_status text not null default 'active',
  valid_from timestamptz not null default clock_timestamp(),
  valid_until timestamptz,
  revoked_at timestamptz,
  authority_version bigint not null default 1,
  unique(case_id, user_id)
);
create table casework.case_events (
  id uuid primary key,
  case_id uuid not null references casework.cases(id),
  actor_id uuid not null references auth.users(id),
  actor_role text,
  event_type text not null,
  source_document_id text,
  source_version text,
  source_queue_identity text,
  action_summary text not null default '',
  before_state jsonb,
  after_state jsonb,
  next_owner_role text,
  formal_impact text not null default 'none',
  occurred_at timestamptz not null default clock_timestamp()
);
create table drs_test.reviewer_assignments (
  user_id uuid not null references auth.users(id),
  case_id uuid not null references casework.cases(id),
  active boolean not null default true,
  primary key(user_id, case_id)
);
create table drs_forward_private.document_reviews (
  review_id uuid primary key,
  event_id uuid not null unique references casework.case_events(id),
  case_id uuid not null references casework.cases(id),
  file_version_id uuid,
  file_sha256 text,
  version_number bigint,
  reviewer_user_id uuid not null references auth.users(id),
  permission_id uuid,
  permission_version bigint,
  authority_id uuid,
  authority_version bigint,
  idempotency_key text,
  request_sha256 text not null check (request_sha256 ~ '^[a-f0-9]{64}$'),
  review_text text not null check (review_text = btrim(review_text)),
  created_at timestamptz not null default clock_timestamp()
);
alter table drs_forward_private.document_reviews enable row level security;
alter table drs_forward_private.document_reviews force row level security;
revoke all on table drs_forward_private.document_reviews
  from public, anon, authenticated, service_role;
create table drs_forward_private.server_sessions (
  server_session_id uuid primary key,
  access_token_digest text not null,
  authenticated_user_id uuid not null references auth.users(id),
  auth_session_id uuid not null references auth.sessions(id),
  auth_token_digest text not null,
  selected_case_id uuid not null references casework.cases(id),
  active boolean not null default true
);
create function drs_forward_private.drs_auth_session_lock_v1(
  p_user uuid, p_session uuid
) returns boolean language plpgsql security definer set search_path = '' as $fn$
declare v_not_after timestamptz;
begin
  if current_setting('role', true) is distinct from 'service_role' then
    raise insufficient_privilege;
  end if;
  select not_after into v_not_after from auth.sessions
  where id = p_session and user_id = p_user for share;
  return found and (v_not_after is null or v_not_after > clock_timestamp());
end;
$fn$;
create function public.owner_workspace_grant_v1(p_user uuid)
returns jsonb language plpgsql security definer set search_path = '' as $fn$
declare v_count integer; v_case uuid;
begin
  select count(*) into v_count
  from casework.case_members m join casework.cases c on c.id = m.case_id
  join auth.users u on u.id = m.user_id
  where m.user_id = p_user and m.role = 'owner'
    and m.membership_status = 'active' and m.revoked_at is null
    and m.valid_from <= clock_timestamp()
    and (m.valid_until is null or m.valid_until > clock_timestamp())
    and c.case_status = 'active' and u.deleted_at is null
    and (u.banned_until is null or u.banned_until <= clock_timestamp());
  if v_count = 0 then
    return jsonb_build_object('authorized',false,'state','CASE_NOT_AUTHORIZED');
  end if;
  if v_count <> 1 then
    return jsonb_build_object('authorized',false,'state','CASE_SELECTION_REQUIRED');
  end if;
  select m.case_id into v_case from casework.case_members m
  join casework.cases c on c.id = m.case_id
  where m.user_id = p_user and m.role = 'owner'
    and m.membership_status = 'active' and m.revoked_at is null
    and m.valid_from <= clock_timestamp()
    and (m.valid_until is null or m.valid_until > clock_timestamp())
    and c.case_status = 'active' for share of m, c;
  return jsonb_build_object(
    'authorized',true,'state','AUTHORIZED_CASEWORK_WORKSPACE',
    'case_id',v_case,'account_role','owner'
  );
end;
$fn$;
create function drs_forward_private.drs_password_authority_resolve_locked_v1(
  p_user uuid, p_expected_case uuid, p_subject text
) returns jsonb language plpgsql security definer set search_path = '' as $fn$
begin
  if current_setting('role', true) is distinct from 'service_role' then
    raise insufficient_privilege;
  end if;
  if p_expected_case is null or not exists (
    select 1 from drs_test.reviewer_assignments
    where user_id = p_user and case_id = p_expected_case and active for share
  ) then
    return jsonb_build_object('authorized',false,'state','CASE_NOT_AUTHORIZED');
  end if;
  return jsonb_build_object(
    'authorized',true,'state','AUTHORIZED_DRS_CASEWORK',
    'account_role','drs','selected_case_id',p_expected_case
  );
end;
$fn$;
create function public.drs_auth_bound_server_session_verify_v1(
  p_server_session_id uuid,
  p_access_token_digest text,
  p_authenticated_user_id uuid,
  p_auth_session_id uuid,
  p_auth_token_digest text
) returns jsonb language plpgsql security definer set search_path = '' as $fn$
declare v_case uuid;
begin
  if current_setting('role', true) is distinct from 'service_role' then
    raise insufficient_privilege;
  end if;
  select s.selected_case_id into v_case
  from drs_forward_private.server_sessions s
  join auth.sessions a on a.id = s.auth_session_id
    and a.user_id = s.authenticated_user_id
  join drs_test.reviewer_assignments r
    on r.user_id = s.authenticated_user_id
    and r.case_id = s.selected_case_id and r.active
  where s.server_session_id = p_server_session_id
    and s.access_token_digest = p_access_token_digest
    and s.authenticated_user_id = p_authenticated_user_id
    and s.auth_session_id = p_auth_session_id
    and s.auth_token_digest = p_auth_token_digest
    and s.active
    and (a.not_after is null or a.not_after > clock_timestamp())
  for share of s, a, r;
  if not found then
    return jsonb_build_object('verified',false,'state','SESSION_NOT_AUTHORIZED');
  end if;
  return jsonb_build_object(
    'verified',true,
    'authenticated_user_id',p_authenticated_user_id,
    'auth_session_id',p_auth_session_id,
    'specialist_id','80000000-0000-4000-8000-000000000001',
    'authorization_subject','drs-specialist:80000000-0000-4000-8000-000000000001',
    'expires_at',clock_timestamp()+interval '5 minutes',
    'selected_case_id',v_case,
    'case_status','active',
    'access_mode','read_only'
  );
end;
$fn$;
revoke all on function public.drs_auth_bound_server_session_verify_v1(
  uuid,text,uuid,uuid,text
) from public, anon, authenticated;
grant execute on function public.drs_auth_bound_server_session_verify_v1(
  uuid,text,uuid,uuid,text
) to service_role;
commit;
${sql}
`;
    realPgQuery(bootstrap);

    const seeded = realPgQuery(String.raw`
insert into auth.users(id) values
  ('10000000-0000-4000-8000-000000000001'),
  ('10000000-0000-4000-8000-000000000002');
insert into auth.sessions(id,user_id,not_after) values
  ('20000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001',clock_timestamp()+interval '1 hour'),
  ('20000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000002',clock_timestamp()+interval '1 hour');
insert into casework.cases(id,case_status,title) values
  ('30000000-0000-4000-8000-000000000001','active','Case One'),
  ('30000000-0000-4000-8000-000000000002','active','Case Two');
insert into casework.case_members(membership_id,case_id,user_id,role)
values ('40000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','owner');
insert into drs_test.reviewer_assignments(user_id,case_id)
values ('10000000-0000-4000-8000-000000000002','30000000-0000-4000-8000-000000000001');
insert into drs_forward_private.server_sessions(
  server_session_id,access_token_digest,authenticated_user_id,auth_session_id,
  auth_token_digest,selected_case_id
) values (
  '60000000-0000-4000-8000-000000000001',repeat('A',43),
  '10000000-0000-4000-8000-000000000002',
  '20000000-0000-4000-8000-000000000002',repeat('B',43),
  '30000000-0000-4000-8000-000000000001'
);
set role service_role;
do $test$
declare start_result jsonb; bind_result jsonb;
begin
  start_result := public.drs_line_case_group_binding_start_v1(jsonb_build_object(
    'authenticated_user_id','10000000-0000-4000-8000-000000000001',
    'auth_session_id','20000000-0000-4000-8000-000000000001',
    'provider_channel_digest',repeat('A',43),
    'challenge_digest',repeat('B',43),
    'expires_at',to_char(
      (clock_timestamp()+interval '5 minutes') at time zone 'UTC',
      'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'
    )
  ));
  if start_result->>'state' <> 'AWAITING_LINE_GROUP'
    or start_result->>'case_id' <> '30000000-0000-4000-8000-000000000001'
  then raise exception 'owner case was not server-derived'; end if;
end;
$test$;
reset role;
delete from auth.sessions where id='20000000-0000-4000-8000-000000000001';
set role service_role;
do $test$
declare result jsonb;
begin
  result := public.drs_line_case_group_bind_from_webhook_v1(jsonb_build_object(
    'provider_channel_digest',repeat('A',43),'webhook_event_digest',repeat('C',43),
    'challenge_digest',repeat('B',43),'line_group_digest',repeat('D',43),
    'line_group_ciphertext',repeat('E',32),'line_group_iv',repeat('F',16),
    'line_user_digest',repeat('G',43),'encryption_key_version','local-v1',
    'provider_timestamp_ms',1789099200000,'is_redelivery',false
  ));
  if result->>'state' <> 'IGNORED' then raise exception 'revoked session bound a group'; end if;
end;
$test$;
reset role;
do $test$
begin
  if exists(select 1 from integration.drs_line_case_group_bindings) then
    raise exception 'revoked session persisted a binding';
  end if;
end;
$test$;
insert into auth.sessions(id,user_id,not_after)
values ('20000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001',clock_timestamp()+interval '1 hour');
set role service_role;
do $test$
declare start_result jsonb; bind_input jsonb; result jsonb;
begin
  start_result := public.drs_line_case_group_binding_start_v1(jsonb_build_object(
    'authenticated_user_id','10000000-0000-4000-8000-000000000001',
    'auth_session_id','20000000-0000-4000-8000-000000000001',
    'provider_channel_digest',repeat('A',43),'challenge_digest',repeat('H',43),
    'expires_at',to_char(
      (clock_timestamp()+interval '5 minutes') at time zone 'UTC',
      'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'
    )
  ));
  if start_result->>'state' <> 'AWAITING_LINE_GROUP' then raise exception 'binding start failed'; end if;
  bind_input := jsonb_build_object(
    'provider_channel_digest',repeat('A',43),'webhook_event_digest',repeat('I',43),
    'challenge_digest',repeat('H',43),'line_group_digest',repeat('J',43),
    'line_group_ciphertext',repeat('K',32),'line_group_iv',repeat('L',16),
    'line_user_digest',repeat('M',43),'encryption_key_version','local-v1',
    'provider_timestamp_ms',1789099200001,'is_redelivery',false
  );
  result := public.drs_line_case_group_bind_from_webhook_v1(bind_input);
  if result->>'state' <> 'BOUND' then raise exception 'signed group was not bound'; end if;
  if public.drs_line_case_group_bind_from_webhook_v1(bind_input)->>'state' <> 'REDELIVERED'
  then raise exception 'exact replay was not deduplicated'; end if;
  if public.drs_line_case_group_bind_from_webhook_v1(
    bind_input || jsonb_build_object('line_group_digest',repeat('N',43))
  )->>'state' <> 'IGNORED' then raise exception 'semantic replay mismatch accepted'; end if;
end;
$test$;
reset role;
insert into casework.case_members(membership_id,case_id,user_id,role)
values ('40000000-0000-4000-8000-000000000002','30000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000001','owner');
set role service_role;
do $test$
declare result jsonb;
begin
  result := public.drs_line_case_group_binding_start_v1(jsonb_build_object(
    'authenticated_user_id','10000000-0000-4000-8000-000000000001',
    'auth_session_id','20000000-0000-4000-8000-000000000001',
    'provider_channel_digest',repeat('A',43),'challenge_digest',repeat('O',43),
    'expires_at',to_char(
      (clock_timestamp()+interval '5 minutes') at time zone 'UTC',
      'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'
    )
  ));
  if result->>'state' <> 'CASE_NOT_AUTHORIZED' then
    raise exception 'multi-case owner was not fail-closed';
  end if;
end;
$test$;
reset role;
delete from casework.case_members where membership_id='40000000-0000-4000-8000-000000000002';
insert into casework.case_events(id,case_id,actor_id,actor_role,event_type,action_summary) values
  ('50000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000002','drs','DOCUMENT_REVIEW_SUBMITTED','Review one'),
  ('50000000-0000-4000-8000-000000000002','30000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000002','drs','DOCUMENT_REVIEW_SUBMITTED','Wrong case'),
  ('50000000-0000-4000-8000-000000000003','30000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000002','drs','DOCUMENT_REVIEW_SUBMITTED','UTF-16 max'),
  ('50000000-0000-4000-8000-000000000004','30000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000002','drs','DOCUMENT_REVIEW_SUBMITTED','UTF-16 overflow'),
  ('50000000-0000-4000-8000-000000000005','30000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000002','drs','DOCUMENT_REVIEW_RECORDED','Wrong event type'),
  ('50000000-0000-4000-8000-000000000006','30000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000002','drs','DOCUMENT_REVIEW_SUBMITTED','Missing review row');
insert into drs_forward_private.document_reviews(
  review_id,event_id,case_id,reviewer_user_id,request_sha256,review_text
) values
  ('70000000-0000-4000-8000-000000000001','50000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000002',repeat('a',64),'Review one'),
  ('70000000-0000-4000-8000-000000000002','50000000-0000-4000-8000-000000000002','30000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000002',repeat('b',64),'Wrong case'),
  ('70000000-0000-4000-8000-000000000003','50000000-0000-4000-8000-000000000003','30000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000002',repeat('c',64),repeat('😀',2500)),
  ('70000000-0000-4000-8000-000000000004','50000000-0000-4000-8000-000000000004','30000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000002',repeat('d',64),repeat('😀',2501)),
  ('70000000-0000-4000-8000-000000000005','50000000-0000-4000-8000-000000000005','30000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000002',repeat('e',64),'Wrong event type');
do $utf16$
begin
  if integration.drs_line_utf16_length_v1(repeat('😀',2500)) <> 5000
    or integration.drs_line_utf16_length_v1(repeat('😀',2501)) <> 5002
  then raise exception 'UTF-16 boundary mismatch'; end if;
end;
$utf16$;
set role service_role;
do $test$
declare result jsonb;
begin
  result := public.drs_line_review_notification_enqueue_v1(jsonb_build_object(
    'server_session_id','60000000-0000-4000-8000-000000000001',
    'access_token_digest',repeat('A',43),
    'authenticated_user_id','10000000-0000-4000-8000-000000000002',
    'auth_session_id','20000000-0000-4000-8000-000000000002',
    'auth_token_digest',repeat('B',43),
    'review_event_id','50000000-0000-4000-8000-000000000001',
    'provider_channel_digest',repeat('A',43)
  ));
  if result->>'state' <> 'ENQUEUED' then raise exception 'assigned review was not enqueued'; end if;
  result := public.drs_line_review_notification_enqueue_v1(jsonb_build_object(
    'server_session_id','60000000-0000-4000-8000-000000000001',
    'access_token_digest',repeat('A',43),
    'authenticated_user_id','10000000-0000-4000-8000-000000000002',
    'auth_session_id','20000000-0000-4000-8000-000000000002',
    'auth_token_digest',repeat('B',43),
    'review_event_id','50000000-0000-4000-8000-000000000002',
    'provider_channel_digest',repeat('A',43)
  ));
  if result->>'state' <> 'CASE_NOT_AUTHORIZED' then raise exception 'cross-case review was accepted'; end if;
  result := public.drs_line_review_notification_enqueue_v1(jsonb_build_object(
    'server_session_id','60000000-0000-4000-8000-000000000001',
    'access_token_digest',repeat('A',43),
    'authenticated_user_id','10000000-0000-4000-8000-000000000002',
    'auth_session_id','20000000-0000-4000-8000-000000000002',
    'auth_token_digest',repeat('B',43),
    'review_event_id','50000000-0000-4000-8000-000000000003',
    'provider_channel_digest',repeat('A',43)
  ));
  if result->>'state' <> 'ENQUEUED' then raise exception '5000 UTF-16 units were rejected'; end if;
  result := public.drs_line_review_notification_enqueue_v1(jsonb_build_object(
    'server_session_id','60000000-0000-4000-8000-000000000001',
    'access_token_digest',repeat('A',43),
    'authenticated_user_id','10000000-0000-4000-8000-000000000002',
    'auth_session_id','20000000-0000-4000-8000-000000000002',
    'auth_token_digest',repeat('B',43),
    'review_event_id','50000000-0000-4000-8000-000000000004',
    'provider_channel_digest',repeat('A',43)
  ));
  if result->>'state' <> 'CASE_NOT_AUTHORIZED' then raise exception '5002 UTF-16 units were accepted'; end if;
  result := public.drs_line_review_notification_enqueue_v1(jsonb_build_object(
    'server_session_id','60000000-0000-4000-8000-000000000001',
    'access_token_digest',repeat('A',43),
    'authenticated_user_id','10000000-0000-4000-8000-000000000002',
    'auth_session_id','20000000-0000-4000-8000-000000000002',
    'auth_token_digest',repeat('B',43),
    'review_event_id','50000000-0000-4000-8000-000000000005',
    'provider_channel_digest',repeat('A',43)
  ));
  if result->>'state' <> 'CASE_NOT_AUTHORIZED' then raise exception 'legacy review event type was accepted'; end if;
  result := public.drs_line_review_notification_enqueue_v1(jsonb_build_object(
    'server_session_id','60000000-0000-4000-8000-000000000001',
    'access_token_digest',repeat('A',43),
    'authenticated_user_id','10000000-0000-4000-8000-000000000002',
    'auth_session_id','20000000-0000-4000-8000-000000000002',
    'auth_token_digest',repeat('B',43),
    'review_event_id','50000000-0000-4000-8000-000000000006',
    'provider_channel_digest',repeat('A',43)
  ));
  if result->>'state' <> 'CASE_NOT_AUTHORIZED' then raise exception 'missing immutable review row was accepted'; end if;
end;
$test$;
reset role;
select 'A14_LINE_REAL_PG_SEEDED';
`);
    assert.match(seeded, /A14_LINE_REAL_PG_SEEDED$/u);

    const claimCommand =
      "set role service_role; select public.drs_line_review_notification_claim_v1('{}'::jsonb)::text;";
    const claims = await Promise.all([
      realPgCommandAsync(claimCommand),
      realPgCommandAsync(claimCommand),
    ]);
    const parsedClaims = claims.map((value) => JSON.parse(value));
    assert.equal(
      parsedClaims.every((claim) => claim.state === "CLAIMED"),
      true,
    );
    assert.notEqual(parsedClaims[0].outbox_id, parsedClaims[1].outbox_id);

    const accepted = parsedClaims[0];
    const failed = parsedClaims[1];
    const completion = realPgQuery(`
set role service_role;
select public.drs_line_review_notification_assert_current_v1(jsonb_build_object(
  'outbox_id','${accepted.outbox_id}','claim_token','${accepted.claim_token}'
))::text;
select public.drs_line_review_notification_complete_v1(jsonb_build_object(
  'outbox_id','${accepted.outbox_id}','claim_token','${accepted.claim_token}',
  'outcome','accepted','provider_request_id','provider-observed-409',
  'provider_accepted_request_id','provider-accepted-before',
  'provider_message_id',null,'provider_status_class','4xx',
  'reason_code','RETRY_KEY_ALREADY_ACCEPTED','duration_ms',17
))::text;
select public.drs_line_review_notification_complete_v1(jsonb_build_object(
  'outbox_id','${failed.outbox_id}','claim_token','${failed.claim_token}',
  'outcome','permanent_failure','provider_request_id',null,
  'provider_accepted_request_id',null,'provider_message_id',null,
  'provider_status_class','none','reason_code','INVALID_CLAIM_CONTRACT','duration_ms',2
))::text;
reset role;
grant usage on schema integration to authenticated;
grant select on integration.drs_line_review_notification_outbox to authenticated;
set role authenticated;
select count(*) from integration.drs_line_review_notification_outbox;
reset role;
do $verify$
declare denied boolean := false;
begin
  if has_table_privilege('service_role','integration.drs_line_review_notification_outbox','SELECT')
    or has_function_privilege('anon','public.drs_line_review_notification_claim_v1(jsonb)','EXECUTE')
    or has_function_privilege('authenticated','public.drs_line_review_notification_claim_v1(jsonb)','EXECUTE')
    or not has_function_privilege('service_role','public.drs_line_review_notification_claim_v1(jsonb)','EXECUTE')
  then raise exception 'ACL boundary mismatch'; end if;
  if (select count(*) from integration.drs_line_review_delivery_receipts) <> 2
    or (select count(*) from integration.drs_line_review_notification_outbox where delivery_state='sent') <> 1
    or (select count(*) from integration.drs_line_review_notification_outbox where delivery_state='failed') <> 1
  then raise exception 'delivery completion mismatch'; end if;
  begin
    update integration.drs_line_review_delivery_receipts set reason_code='MUTATED';
  exception when others then
    denied := sqlerrm = 'DRS_LINE_CASE_APPEND_ONLY';
  end;
  if not denied then raise exception 'receipt mutation was not denied'; end if;
end;
$verify$;
select 'A14_LINE_REAL_PG_PASS';
`);
    const rows = completion.split(/\r?\n/u).filter(Boolean);
    assert.equal(JSON.parse(rows[0]).state, "CURRENT");
    assert.equal(JSON.parse(rows[1]).state, "SENT");
    assert.equal(JSON.parse(rows[2]).state, "FAILED");
    assert.equal(rows[3], "0", "forced RLS must hide outbox rows");
    assert.equal(rows.at(-1), "A14_LINE_REAL_PG_PASS");
  },
);
