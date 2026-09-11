import assert from "node:assert/strict";

const exact5MigrationUrl = new URL(
  "../../supabase/migrations/20260911031500_drs_line_account_link_private_routing_v2.sql",
  import.meta.url,
);
const w1MigrationUrl = new URL(
  "../../supabase/migrations/20260831050535_drs_gmail_line_private_routing_w1.sql",
  import.meta.url,
);
const exact5Bytes = 76_782;
const exact5Sha256 =
  "d3c7f0b908a672365965c02c513aa75a8030db18329657ff3fb1fed20fcfb607";
const w1Bytes = 91_486;
const w1Sha256 =
  "ffb7e58d31f68f37aafab35e796754ab0c59e56a06c7d563ec228489d245358f";
const psqlExecutable = String
  .raw`C:\CodexWork\08-Jacky\worktrees\laibe_MVP_project\a-plus-account-grant-prod-20260908\.codex-auth-r2\postgresql\bin\psql.exe`;
const pgDataDirectory = String
  .raw`C:\CodexWork\08-Jacky\worktrees\laibe_MVP_project\a14-line-case-review-rescue-20260911\.codex-validation\line-provider-rescue-20260911\pg-native\review-exact3-59370\data`;
const pgHost = "127.0.0.1";
const pgPort = "59370";
const systemRoot = String.raw`C:\WINDOWS`;
const decoder = new TextDecoder();
const encoder = new TextEncoder();

const taskMatch = /^--task-id=([a-z0-9][a-z0-9-]{7,47})$/u.exec(
  Deno.args[0] ?? "",
);
assert.equal(Deno.args.length, 1, "exactly one --task-id argument is required");
assert.ok(taskMatch, "task id must be a bounded lowercase task nonce");
const taskId = taskMatch[1];

const ids = Object.freeze({
  owner1: "10000000-0000-4000-8000-000000000001",
  owner2: "10000000-0000-4000-8000-000000000002",
  user1: "20000000-0000-4000-8000-000000000001",
  user2: "20000000-0000-4000-8000-000000000002",
  specialist1: "30000000-0000-4000-8000-000000000001",
  specialist2: "30000000-0000-4000-8000-000000000002",
  case1: "40000000-0000-4000-8000-000000000001",
  case2: "40000000-0000-4000-8000-000000000002",
  authority1: "50000000-0000-4000-8000-000000000001",
  authority2: "50000000-0000-4000-8000-000000000002",
  authBinding1: "60000000-0000-4000-8000-000000000001",
  authBinding2: "60000000-0000-4000-8000-000000000002",
});

function hex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join(
    "",
  );
}

async function sha256(bytes: Uint8Array): Promise<string> {
  const input = Uint8Array.from(bytes).buffer;
  return hex(new Uint8Array(await crypto.subtle.digest("SHA-256", input)));
}

async function assertFileIdentity(
  path: string | URL,
  expectedBytes: number,
  expectedSha256: string,
): Promise<void> {
  const bytes = await Deno.readFile(path);
  assert.equal(bytes.byteLength, expectedBytes);
  assert.equal(await sha256(bytes), expectedSha256);
}

type CommandOutput = Deno.CommandOutput;

function outputText(output: CommandOutput): string {
  return `${decoder.decode(output.stdout)}${decoder.decode(output.stderr)}`
    .trim();
}

async function psql(
  database: string,
  sql: string,
  required = true,
): Promise<CommandOutput> {
  const command = new Deno.Command(psqlExecutable, {
    args: [
      "--no-psqlrc",
      "--quiet",
      "--set=ON_ERROR_STOP=1",
      "--tuples-only",
      "--no-align",
      "--host",
      pgHost,
      "--port",
      pgPort,
      "--username",
      "postgres",
      "--dbname",
      database,
    ],
    clearEnv: true,
    env: { SystemRoot: systemRoot },
    stdin: "piped",
    stdout: "piped",
    stderr: "piped",
  });
  const child = command.spawn();
  const writer = child.stdin.getWriter();
  await writer.write(encoder.encode(sql));
  await writer.close();
  const output = await child.output();
  if (required) assert.equal(output.success, true, outputText(output));
  return output;
}

function startPsql(
  database: string,
  sql: string,
): { child: Deno.ChildProcess; write: Promise<void> } {
  const child = new Deno.Command(psqlExecutable, {
    args: [
      "--no-psqlrc",
      "--quiet",
      "--set=ON_ERROR_STOP=1",
      "--tuples-only",
      "--no-align",
      "--host",
      pgHost,
      "--port",
      pgPort,
      "--username",
      "postgres",
      "--dbname",
      database,
    ],
    clearEnv: true,
    env: { SystemRoot: systemRoot },
    stdin: "piped",
    stdout: "piped",
    stderr: "piped",
  }).spawn();
  const write = (async () => {
    const writer = child.stdin.getWriter();
    await writer.write(encoder.encode(sql));
    await writer.close();
  })();
  return { child, write };
}

async function queryJson(
  database: string,
  sql: string,
): Promise<Record<string, unknown>> {
  const result = await psql(database, sql);
  return JSON.parse(decoder.decode(result.stdout).trim());
}

function jsonLiteral(value: unknown): string {
  return JSON.stringify(value).replaceAll("'", "''");
}

async function call(
  database: string,
  name: string,
  input: unknown,
): Promise<Record<string, unknown>> {
  return await queryJson(
    database,
    `set role service_role;
     select public.${name}('${jsonLiteral(input)}'::jsonb);
     reset role;`,
  );
}

function quoteIdentifier(value: string): string {
  assert.match(value, /^[a-z][a-z0-9_]{0,62}$/u);
  return `"${value}"`;
}

function databaseNames(
  nonce: string,
): Record<"fresh" | "legacy" | "drift" | "rollback", string> {
  const boundedTask = taskId.replaceAll("-", "_").slice(0, 12);
  const prefix = `a14e5_${boundedTask}_${nonce}`;
  return {
    fresh: `${prefix}_fresh`,
    legacy: `${prefix}_legacy`,
    drift: `${prefix}_drift`,
    rollback: `${prefix}_rollback`,
  };
}

async function targetSnapshot(
  database: string,
): Promise<Record<string, unknown>> {
  return await queryJson(
    database,
    `select jsonb_build_object(
      'intents', coalesce((select jsonb_agg(to_jsonb(row_data) order by row_data.intent_id) from integration.drs_line_account_link_intents row_data), '[]'::jsonb),
      'bindings', coalesce((select jsonb_agg(to_jsonb(row_data) order by row_data.binding_id) from integration.drs_line_account_bindings row_data), '[]'::jsonb),
      'audit', coalesce((select jsonb_agg(to_jsonb(row_data) order by row_data.audit_id) from integration.drs_line_binding_audit row_data), '[]'::jsonb),
      'webhooks', coalesce((select jsonb_agg(to_jsonb(row_data) order by row_data.webhook_digest) from integration.drs_line_webhook_events row_data), '[]'::jsonb)
    );`,
  );
}

const baselineSql = String.raw`
do $roles$
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
$roles$;
create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;
create schema if not exists auth;
create schema if not exists integration;
create schema if not exists drs_private;
create schema if not exists drs_forward_private;
create schema if not exists casework;
create schema if not exists knowledge;

create table if not exists auth.users (id uuid primary key);
create type knowledge.case_role as enum ('owner', 'pro', 'pcm', 'admin');
create table casework.cases (
  id uuid primary key,
  case_status text not null default 'active'
);
create table casework.case_members (
  case_id uuid not null references casework.cases(id),
  user_id uuid not null references auth.users(id),
  role knowledge.case_role not null,
  added_by uuid not null references auth.users(id),
  added_at timestamptz not null default clock_timestamp(),
  primary key(case_id, user_id)
);
create table drs_forward_private.specialists (
  specialist_id uuid primary key,
  specialist_status text not null
);
create table drs_forward_private.auth_specialist_bindings (
  binding_id uuid primary key,
  authenticated_user_id uuid not null references auth.users(id),
  specialist_id uuid not null references drs_forward_private.specialists(specialist_id),
  binding_status text not null,
  revoked_at timestamptz,
  valid_from timestamptz not null,
  valid_until timestamptz not null
);
create table drs_forward_private.reviewer_case_authorities (
  authority_id uuid primary key,
  user_id uuid not null references auth.users(id),
  specialist_id uuid not null references drs_forward_private.specialists(specialist_id),
  legacy_case_id uuid not null references casework.cases(id),
  granted_by uuid not null references auth.users(id),
  authority_status text not null,
  revoked_at timestamptz,
  valid_from timestamptz not null,
  valid_until timestamptz not null
);

create table public.drs_cases (
  case_id uuid primary key,
  owner_account_id uuid,
  case_label text default 'Case',
  case_state text default 'active',
  next_action text default 'review',
  updated_at timestamptz default clock_timestamp()
);
create table public.drs_specialists (
  specialist_id uuid primary key,
  authority_state text default 'active'
);
create table public.drs_case_specialist_assignments (
  assignment_id uuid primary key,
  case_id uuid references public.drs_cases(case_id),
  specialist_id uuid references public.drs_specialists(specialist_id),
  valid_from timestamptz default clock_timestamp(),
  valid_until timestamptz
);
create table public.drs_case_specialist_assignment_terminations (
  termination_id uuid primary key default extensions.gen_random_uuid(),
  assignment_id uuid references public.drs_case_specialist_assignments(assignment_id)
);
create table public.drs_case_audit_events (
  event_id uuid primary key default extensions.gen_random_uuid(),
  case_id uuid,
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default clock_timestamp(),
  constraint drs_case_audit_events_type_check check (
    event_type in ('LINE_SENT_EVENT', 'AI_REVIEW', 'HUMAN_DECISION',
      'FINAL_MESSAGE', 'RECEIPT', 'WORK_ITEM_TRANSITION')
  )
);
create table integration.drs_auth_specialist_bindings (
  binding_id uuid primary key,
  authenticated_user_id uuid,
  specialist_id uuid,
  binding_status text default 'active',
  valid_from timestamptz default clock_timestamp(),
  valid_until timestamptz,
  revoked_at timestamptz,
  updated_at timestamptz default clock_timestamp()
);

create function integration.drs_identity_authority_resolve_locked_v1(uuid,uuid,text)
returns jsonb language plpgsql security definer set search_path = ''
as $$ begin raise exception 'IDENTITY_PROVIDER_PATH_FORBIDDEN'; end $$;

create function drs_forward_private.drs_password_authority_resolve_locked_v1(
  p_user uuid, p_case uuid, p_subject text
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare v record; v_now timestamptz := clock_timestamp();
begin
  if current_setting('role', true) is distinct from 'service_role' then
    raise insufficient_privilege;
  end if;
  select a.authority_id, a.user_id, a.specialist_id, a.legacy_case_id
    into v
  from drs_forward_private.reviewer_case_authorities a
  join drs_forward_private.auth_specialist_bindings b
    on b.authenticated_user_id = a.user_id and b.specialist_id = a.specialist_id
  join drs_forward_private.specialists s
    on s.specialist_id = a.specialist_id
  join casework.cases c on c.id = a.legacy_case_id
  where a.user_id = p_user and a.legacy_case_id = p_case
    and p_subject = 'drs-specialist:' || a.specialist_id::text
    and a.authority_status = 'active' and a.revoked_at is null
    and a.valid_from <= v_now and a.valid_until > v_now
    and b.binding_status = 'active' and b.revoked_at is null
    and b.valid_from <= v_now and b.valid_until > v_now
    and s.specialist_status = 'active' and c.case_status = 'active'
  for update of a, b, s, c;
  if not found then return jsonb_build_object('authorized', false); end if;
  return jsonb_build_object(
    'authorized', true,
    'authenticated_user_id', v.user_id::text,
    'specialist_id', v.specialist_id::text,
    'assignment_id', v.authority_id::text,
    'selected_case_id', v.legacy_case_id::text,
    'authorization_subject', 'drs-specialist:' || v.specialist_id::text
  );
end;
$$;
revoke all on function drs_forward_private.drs_password_authority_resolve_locked_v1(uuid,uuid,text)
  from public, anon, authenticated, service_role;
`;

const fixtureSql = `
insert into auth.users(id) values
  ('${ids.owner1}'), ('${ids.owner2}'), ('${ids.user1}'), ('${ids.user2}')
on conflict do nothing;
insert into casework.cases(id, case_status) values
  ('${ids.case1}', 'active'), ('${ids.case2}', 'active');
insert into casework.case_members(
  case_id, user_id, role, added_by
) values
  ('${ids.case1}', '${ids.owner1}', 'owner', '${ids.owner1}'),
  ('${ids.case2}', '${ids.owner2}', 'owner', '${ids.owner2}');
insert into drs_forward_private.specialists values
  ('${ids.specialist1}', 'active'), ('${ids.specialist2}', 'active');
insert into drs_forward_private.auth_specialist_bindings values
  ('${ids.authBinding1}', '${ids.user1}', '${ids.specialist1}', 'active', null, clock_timestamp() - interval '1 hour', clock_timestamp() + interval '1 hour'),
  ('${ids.authBinding2}', '${ids.user2}', '${ids.specialist2}', 'active', null, clock_timestamp() - interval '1 hour', clock_timestamp() + interval '1 hour');
insert into drs_forward_private.reviewer_case_authorities values
  ('${ids.authority1}', '${ids.user1}', '${ids.specialist1}', '${ids.case1}', '${ids.owner1}', 'active', null, clock_timestamp() - interval '1 hour', clock_timestamp() + interval '1 hour'),
  ('${ids.authority2}', '${ids.user2}', '${ids.specialist2}', '${ids.case2}', '${ids.owner2}', 'active', null, clock_timestamp() - interval '1 hour', clock_timestamp() + interval '1 hour');
`;

function authorityInput(which: 1 | 2, channel = "1234567890") {
  const suffix = String(which) as "1" | "2";
  return {
    authenticated_user_id: ids[`user${suffix}`],
    specialist_id: ids[`specialist${suffix}`],
    selected_case_id: ids[`case${suffix}`],
    authorization_subject: `drs-specialist:${ids[`specialist${suffix}`]}`,
    provider_channel_id: channel,
  };
}

function normalizedPath(value: string): string {
  return value.replaceAll("\\", "/").toLowerCase();
}

Deno.test({
  name:
    "Exact5 native PostgreSQL authorization, upgrade, replay, lease, and expiry closure",
  sanitizeResources: false,
  sanitizeOps: false,
  async fn() {
    assert.equal(
      normalizedPath(await Deno.realPath(psqlExecutable)),
      normalizedPath(psqlExecutable),
      "psql executable identity must match the reviewed native path",
    );
    await assertFileIdentity(exact5MigrationUrl, exact5Bytes, exact5Sha256);
    await assertFileIdentity(w1MigrationUrl, w1Bytes, w1Sha256);
    const [exact5, w1] = await Promise.all([
      Deno.readTextFile(exact5MigrationUrl),
      Deno.readTextFile(w1MigrationUrl),
    ]);
    assert.match(exact5, /LEGACY_W1_EXACT/u);

    const runtime = await queryJson(
      "postgres",
      `select jsonb_build_object(
        'server_version_num', current_setting('server_version_num')::integer,
        'port', current_setting('port')::integer,
        'data_directory', current_setting('data_directory')
      );`,
    );
    assert.ok(
      Number(runtime.server_version_num) >= 180000 &&
        Number(runtime.server_version_num) < 190000,
      "reviewed runtime must be PostgreSQL 18.x",
    );
    assert.equal(runtime.port, Number(pgPort));
    assert.equal(
      normalizedPath(String(runtime.data_directory)),
      normalizedPath(pgDataDirectory),
      "listener must use the task-owned PostgreSQL data directory",
    );

    const nonce = crypto.randomUUID().replaceAll("-", "").slice(0, 12);
    const databases = databaseNames(nonce);
    const createdDatabases: string[] = [];
    try {
      for (const database of Object.values(databases)) {
        const collision = await queryJson(
          "postgres",
          `select jsonb_build_object('exists', exists(
            select 1 from pg_database where datname='${database}'
          ));`,
        );
        assert.equal(
          collision.exists,
          false,
          `database ${database} must be unused`,
        );
        await psql(
          "postgres",
          `create database ${quoteIdentifier(database)};`,
        );
        createdDatabases.push(database);
        await psql(database, baselineSql);
      }

      await psql(databases.fresh, exact5);
      await psql(databases.fresh, fixtureSql);

      const catalog = await queryJson(
        databases.fresh,
        `select jsonb_build_object(
          'tables', (select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='integration' and c.relkind='r' and c.relname like 'drs_line_%'),
          'public_functions', (select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname like 'drs_line_%'),
          'rls', (select bool_and(relrowsecurity and relforcerowsecurity) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='integration' and c.relname in ('drs_line_account_link_intents','drs_line_account_bindings','drs_line_binding_audit','drs_line_webhook_events')),
          'anon_execute', has_function_privilege('anon','public.drs_line_start_link_intent_v1(jsonb)','execute'),
          'service_execute', has_function_privilege('service_role','public.drs_line_start_link_intent_v1(jsonb)','execute'),
          'service_table', has_table_privilege('service_role','integration.drs_line_account_bindings','select')
        );`,
      );
      assert.deepEqual(catalog, {
        tables: 4,
        public_functions: 9,
        rls: true,
        anon_execute: false,
        service_execute: true,
        service_table: false,
      });

      const startInput = {
        ...authorityInput(1),
        bot_launch_url: "https://line.me/R/ti/p/@laibe",
      };
      const start = await call(
        databases.fresh,
        "drs_line_start_link_intent_v1",
        startInput,
      );
      assert.equal(start.state, "awaiting_line_confirmation");

      const beforeWrongRole = await targetSnapshot(databases.fresh);
      const wrongRoleBlocker = startPsql(
        databases.fresh,
        `begin;
         select 1 from casework.case_members
          where case_id='${ids.case1}' and user_id='${ids.owner1}'
          for update;
         select pg_sleep(1.5);
         update casework.case_members set role='pro'
          where case_id='${ids.case1}' and user_id='${ids.owner1}';
         commit;`,
      );
      await wrongRoleBlocker.write;
      await new Promise((resolve) => setTimeout(resolve, 250));
      const wrongRoleWaitStarted = performance.now();
      const wrongRoleFinalizer = startPsql(
        databases.fresh,
        `set role service_role;
         select public.drs_line_start_link_intent_v1('${
          jsonLiteral(startInput)
        }'::jsonb);
         reset role;`,
      );
      await wrongRoleFinalizer.write;
      const wrongRoleBlockerOutput = await wrongRoleBlocker.child.output();
      assert.equal(
        wrongRoleBlockerOutput.success,
        true,
        outputText(wrongRoleBlockerOutput),
      );
      const wrongRoleFinalizerOutput = await wrongRoleFinalizer.child.output();
      assert.equal(
        wrongRoleFinalizerOutput.success,
        true,
        outputText(wrongRoleFinalizerOutput),
      );
      assert.ok(
        performance.now() - wrongRoleWaitStarted >= 750,
        "wrong-role finalizer must wait for the membership row lock",
      );
      assert.equal(
        JSON.parse(decoder.decode(wrongRoleFinalizerOutput.stdout).trim())
          .state,
        "permission_denied",
      );
      const afterWrongRole = await targetSnapshot(databases.fresh);
      assert.deepEqual(afterWrongRole, beforeWrongRole);
      await psql(
        databases.fresh,
        `update casework.case_members set role='owner'
          where case_id='${ids.case1}' and user_id='${ids.owner1}';`,
      );

      const beforeDeleteMembership = await targetSnapshot(databases.fresh);
      const deleteMembershipBlocker = startPsql(
        databases.fresh,
        `begin;
         select 1 from casework.case_members
          where case_id='${ids.case1}' and user_id='${ids.owner1}'
          for update;
         select pg_sleep(1.5);
         delete from casework.case_members
          where case_id='${ids.case1}' and user_id='${ids.owner1}';
         commit;`,
      );
      await deleteMembershipBlocker.write;
      await new Promise((resolve) => setTimeout(resolve, 250));
      const deleteMembershipWaitStarted = performance.now();
      const deleteMembershipFinalizer = startPsql(
        databases.fresh,
        `set role service_role;
         select public.drs_line_start_link_intent_v1('${
          jsonLiteral(startInput)
        }'::jsonb);
         reset role;`,
      );
      await deleteMembershipFinalizer.write;
      const deleteMembershipBlockerOutput = await deleteMembershipBlocker.child
        .output();
      assert.equal(
        deleteMembershipBlockerOutput.success,
        true,
        outputText(deleteMembershipBlockerOutput),
      );
      const deleteMembershipFinalizerOutput = await deleteMembershipFinalizer
        .child.output();
      assert.equal(
        deleteMembershipFinalizerOutput.success,
        true,
        outputText(deleteMembershipFinalizerOutput),
      );
      assert.ok(
        performance.now() - deleteMembershipWaitStarted >= 750,
        "deleted-membership finalizer must wait for the membership row lock",
      );
      assert.equal(
        JSON.parse(
          decoder.decode(deleteMembershipFinalizerOutput.stdout).trim(),
        ).state,
        "permission_denied",
      );
      const afterDeleteMembership = await targetSnapshot(databases.fresh);
      assert.deepEqual(afterDeleteMembership, beforeDeleteMembership);
      await psql(
        databases.fresh,
        `insert into casework.case_members(case_id, user_id, role, added_by)
         values ('${ids.case1}', '${ids.owner1}', 'owner', '${ids.owner1}');`,
      );

      const crossCase = { ...startInput, selected_case_id: ids.case2 };
      const beforeCrossCase = await targetSnapshot(databases.fresh);
      assert.equal(
        (await call(
          databases.fresh,
          "drs_line_start_link_intent_v1",
          crossCase,
        )).state,
        "permission_denied",
      );
      const afterCrossCase = await targetSnapshot(databases.fresh);
      assert.deepEqual(afterCrossCase, beforeCrossCase);

      const nonceDigest = "n".repeat(43);
      const nonceExpiry = new Date(Date.now() + 60_000).toISOString();
      assert.equal(
        (await call(
          databases.fresh,
          "drs_line_prepare_nonce_v1",
          {
            ...authorityInput(1),
            nonce_digest: nonceDigest,
            nonce_expires_at: nonceExpiry,
          },
        )).accepted,
        true,
      );
      const webhookDigest = "w".repeat(43);
      const claim = await call(
        databases.fresh,
        "drs_line_claim_webhook_v1",
        { webhook_event_digest: webhookDigest, event_kind: "account_link" },
      );
      assert.equal(claim.admission, "claimed");
      const completed = await call(
        databases.fresh,
        "drs_line_complete_account_link_event_v1",
        {
          webhook_event_digest: webhookDigest,
          claim_token: claim.claim_token,
          provider_channel_id: "1234567890",
          nonce_digest: nonceDigest,
          line_user_digest: "l".repeat(43),
          line_user_ciphertext: "c".repeat(24),
          line_user_iv: "i".repeat(16),
          encryption_key_version: "line-key-v1",
        },
      );
      assert.deepEqual(completed, { completed: true, safe_outcome: "linked" });

      const retryDigest = "r".repeat(43);
      const firstClaim = await call(
        databases.fresh,
        "drs_line_claim_webhook_v1",
        { webhook_event_digest: retryDigest, event_kind: "verify" },
      );
      await psql(
        databases.fresh,
        `update integration.drs_line_webhook_events
           set first_received_at=clock_timestamp()-interval '4 minutes',
               claimed_at=clock_timestamp()-interval '3 minutes',
               updated_at=clock_timestamp()-interval '3 minutes'
         where webhook_digest='${retryDigest}';`,
      );
      const secondClaim = await call(
        databases.fresh,
        "drs_line_claim_webhook_v1",
        { webhook_event_digest: retryDigest, event_kind: "verify" },
      );
      assert.notEqual(secondClaim.claim_token, firstClaim.claim_token);
      assert.equal(
        secondClaim.provider_retry_key,
        firstClaim.provider_retry_key,
      );
      assert.equal(
        (await call(
          databases.fresh,
          "drs_line_complete_webhook_v1",
          {
            webhook_event_digest: retryDigest,
            claim_token: firstClaim.claim_token,
            safe_outcome: "verified",
          },
        )).completed,
        false,
      );
      assert.equal(
        (await call(
          databases.fresh,
          "drs_line_complete_webhook_v1",
          {
            webhook_event_digest: retryDigest,
            claim_token: secondClaim.claim_token,
            safe_outcome: "verified",
          },
        )).completed,
        true,
      );

      const auditUpdate = await psql(
        databases.fresh,
        "update integration.drs_line_binding_audit set safe_outcome='revoked';",
        false,
      );
      assert.equal(auditUpdate.success, false);
      assert.match(
        outputText(auditUpdate),
        /DRS_LINE_BINDING_AUDIT_APPEND_ONLY/u,
      );
      const auditDelete = await psql(
        databases.fresh,
        "delete from integration.drs_line_binding_audit;",
        false,
      );
      assert.equal(auditDelete.success, false);
      assert.match(
        outputText(auditDelete),
        /DRS_LINE_BINDING_AUDIT_APPEND_ONLY/u,
      );

      const secondStart = await call(
        databases.fresh,
        "drs_line_start_link_intent_v1",
        {
          ...authorityInput(2),
          bot_launch_url: "https://line.me/R/ti/p/@laibe",
        },
      );
      assert.equal(secondStart.state, "awaiting_line_confirmation");
      const expiringNonce = "e".repeat(43);
      assert.equal(
        (await call(
          databases.fresh,
          "drs_line_prepare_nonce_v1",
          {
            ...authorityInput(2),
            nonce_digest: expiringNonce,
            nonce_expires_at: new Date(Date.now() + 1_500).toISOString(),
          },
        )).accepted,
        true,
      );
      const expiryWebhook = "x".repeat(43);
      const expiryClaim = await call(
        databases.fresh,
        "drs_line_claim_webhook_v1",
        { webhook_event_digest: expiryWebhook, event_kind: "account_link" },
      );
      const blocker = startPsql(
        databases.fresh,
        `begin;
         select 1 from integration.drs_line_account_link_intents
          where nonce_digest='${expiringNonce}' for update;
         select pg_sleep(2.5);
         commit;`,
      );
      await blocker.write;
      await new Promise((resolve) => setTimeout(resolve, 250));
      const finalizer = startPsql(
        databases.fresh,
        `set role service_role;
         select public.drs_line_complete_account_link_event_v1('${
          jsonLiteral({
            webhook_event_digest: expiryWebhook,
            claim_token: expiryClaim.claim_token,
            provider_channel_id: "1234567890",
            nonce_digest: expiringNonce,
            line_user_digest: "z".repeat(43),
            line_user_ciphertext: "d".repeat(24),
            line_user_iv: "j".repeat(16),
            encryption_key_version: "line-key-v1",
          })
        }'::jsonb);`,
      );
      await finalizer.write;
      const blockerOutput = await blocker.child.output();
      assert.equal(blockerOutput.success, true, outputText(blockerOutput));
      const finalizerOutput = await finalizer.child.output();
      assert.equal(finalizerOutput.success, true, outputText(finalizerOutput));
      assert.deepEqual(
        JSON.parse(decoder.decode(finalizerOutput.stdout).trim()),
        { completed: true, safe_outcome: "expired" },
      );
      assert.deepEqual(
        await queryJson(
          databases.fresh,
          `select jsonb_build_object(
            'binding_count',(select count(*) from integration.drs_line_account_bindings where specialist_id='${ids.specialist2}'),
            'intent_state',(select intent_state from integration.drs_line_account_link_intents where specialist_id='${ids.specialist2}'),
            'nonce_cleared',(select nonce_digest is null from integration.drs_line_account_link_intents where specialist_id='${ids.specialist2}')
          );`,
        ),
        { binding_count: 0, intent_state: "expired", nonce_cleared: true },
      );

      const reapply = await psql(databases.fresh, exact5, false);
      assert.equal(reapply.success, false);
      assert.match(outputText(reapply), /UNKNOWN_LINE_DRIFT/u);
      assert.equal(
        (await queryJson(
          databases.fresh,
          "select jsonb_build_object('tables',count(*)) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='integration' and c.relkind='r' and c.relname like 'drs_line_%';",
        )).tables,
        4,
      );

      await psql(databases.legacy, w1);
      await psql(databases.legacy, exact5);
      assert.deepEqual(
        await queryJson(
          databases.legacy,
          `select jsonb_build_object(
            'tables',(select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='integration' and c.relkind='r' and c.relname like 'drs_line_%'),
            'outbox',to_regclass('integration.drs_line_notification_outbox') is not null,
            'authority_column',exists(select 1 from information_schema.columns where table_schema='integration' and table_name='drs_line_account_link_intents' and column_name='authority_id'),
            'legacy_assignment_column',exists(select 1 from information_schema.columns where table_schema='integration' and table_name='drs_line_account_link_intents' and column_name='assignment_id')
          );`,
        ),
        {
          tables: 4,
          outbox: false,
          authority_column: true,
          legacy_assignment_column: false,
        },
      );

      await psql(
        databases.drift,
        "create table integration.drs_line_notification_outbox(dummy integer);",
      );
      const drift = await psql(databases.drift, exact5, false);
      assert.equal(drift.success, false);
      assert.match(outputText(drift), /UNKNOWN_LINE_DRIFT/u);
      assert.deepEqual(
        await queryJson(
          databases.drift,
          "select jsonb_build_object('residual',to_regclass('integration.drs_line_notification_outbox') is not null,'target_schema',exists(select 1 from pg_namespace where nspname='drs_line_private'));",
        ),
        { residual: true, target_schema: false },
      );

      const injected = exact5.replace(
        "create schema drs_line_private authorization postgres;",
        "create schema drs_line_private authorization postgres;\nselect 1 / 0;",
      );
      assert.notEqual(injected, exact5);
      const rolledBack = await psql(databases.rollback, injected, false);
      assert.equal(rolledBack.success, false);
      assert.deepEqual(
        await queryJson(
          databases.rollback,
          "select jsonb_build_object('tables',count(*),'target_schema',exists(select 1 from pg_namespace where nspname='drs_line_private')) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='integration' and c.relkind='r' and c.relname like 'drs_line_%';",
        ),
        { tables: 0, target_schema: false },
      );
    } finally {
      const cleanupErrors: string[] = [];
      for (const database of createdDatabases.reverse()) {
        const cleanup = await psql(
          "postgres",
          `select pg_terminate_backend(pid)
             from pg_stat_activity
            where datname='${database}' and pid <> pg_backend_pid();
           drop database if exists ${quoteIdentifier(database)} with (force);`,
          false,
        );
        if (!cleanup.success) cleanupErrors.push(outputText(cleanup));
      }
      const databaseList = Object.values(databases)
        .map((database) => `'${database}'`)
        .join(",");
      const remaining = await queryJson(
        "postgres",
        `select jsonb_build_object(
          'count', count(*),
          'names', coalesce(jsonb_agg(datname order by datname), '[]'::jsonb)
        ) from pg_database where datname in (${databaseList});`,
      );
      assert.deepEqual(
        remaining,
        { count: 0, names: [] },
        `task-owned databases must be removed: ${cleanupErrors.join(" | ")}`,
      );
      assert.deepEqual(
        cleanupErrors,
        [],
        "task-owned database cleanup must succeed",
      );
    }
  },
});
