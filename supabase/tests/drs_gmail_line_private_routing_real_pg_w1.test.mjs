import assert from "node:assert/strict";

const coreMigrationUrl = new URL(
  "../migrations/20260820090000_drs_core_case_audit_contract.sql",
  import.meta.url,
);
const identityMigrationUrl = new URL(
  "../migrations/20260824170000_drs_identity_google_line_w1.sql",
  import.meta.url,
);
const lineMigrationUrl = new URL(
  "../migrations/20260831050535_drs_gmail_line_private_routing_w1.sql",
  import.meta.url,
);
const approvedDockerExecutable = String
  .raw`C:\Users\J\AppData\Local\Programs\DockerDesktop\resources\bin\docker.exe`;
const approvedDockerExecutableBytes = 43_247_024;
const approvedDockerExecutableSha256 =
  "0f97bc1111f59d859766ba938691ee07ed4e58d5fdaeb6f4dfb10a5ef5394753";
const approvedLineMigrationBytes = 91_486;
const approvedLineMigrationSha256 =
  "ffb7e58d31f68f37aafab35e796754ab0c59e56a06c7d563ec228489d245358f";
const approvedSystemRoot = String.raw`C:\WINDOWS`;
const localDockerHost = "npipe:////./pipe/docker_engine";
const fixedImage = "public.ecr.aws/supabase/postgres:17.6.1.165";
const approvedImageId =
  "sha256:28f0e16a019e648089fc1a6d333549a55548f6019c15ae4bd7cd58b989027518";
const decoder = new TextDecoder();
const encoder = new TextEncoder();

const ids = Object.freeze({
  user: "10000000-0000-4000-8000-000000000001",
  caseworkCase: "20000000-0000-4000-8000-000000000001",
  drsCase: "30000000-0000-4000-8000-000000000001",
  specialist: "40000000-0000-4000-8000-000000000001",
  assignment: "50000000-0000-4000-8000-000000000001",
  mapping: "60000000-0000-4000-8000-000000000001",
  authBinding: "70000000-0000-4000-8000-000000000001",
  blockedTermination: "80000000-0000-4000-8000-000000000001",
});
const providerChannelId = "1234567890";
const nonceDigest = "n".repeat(43);
const lineUserDigest = "l".repeat(43);
const webhookDigest = "w".repeat(43);
const authorizationSubject = `drs-specialist:${ids.specialist}`;

function parseTaskId(args) {
  if (args.length === 0) return null;
  assert.equal(args.length, 1, "exactly one --task-id argument is required");
  const match = /^--task-id=([a-z0-9][a-z0-9-]{7,47})$/u.exec(args[0]);
  assert.ok(match, "task id must be a bounded lowercase task nonce");
  return match[1];
}

const taskId = parseTaskId(Deno.args);

function bytesToHex(bytes) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join(
    "",
  );
}

async function sha256Hex(bytes) {
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return bytesToHex(new Uint8Array(digest));
}

async function assertFileIdentity(path, expectedBytes, expectedSha256) {
  const bytes = await Deno.readFile(path);
  assert.equal(bytes.byteLength, expectedBytes);
  assert.equal(await sha256Hex(bytes), expectedSha256);
}

async function assertDockerExecutableIdentity() {
  const realPath = await Deno.realPath(approvedDockerExecutable);
  assert.equal(realPath, approvedDockerExecutable);
  await assertFileIdentity(
    approvedDockerExecutable,
    approvedDockerExecutableBytes,
    approvedDockerExecutableSha256,
  );
}

async function runDocker(args, stdin = null) {
  assert.equal(
    args.some((arg) =>
      ["--host", "-H", "--context", "-c", "--config"].includes(arg)
    ),
    false,
    "call-specific Docker routing overrides are forbidden",
  );
  const command = new Deno.Command(approvedDockerExecutable, {
    args: ["--host", localDockerHost, ...args],
    clearEnv: true,
    env: { SystemRoot: approvedSystemRoot },
    stdin: stdin === null ? "null" : "piped",
    stdout: "piped",
    stderr: "piped",
  });
  if (stdin === null) return await command.output();

  const child = command.spawn();
  const writer = child.stdin.getWriter();
  await writer.write(encoder.encode(stdin));
  await writer.close();
  return await child.output();
}

function outputText(output) {
  return `${decoder.decode(output.stdout)}${decoder.decode(output.stderr)}`
    .trim();
}

async function runDockerRequired(args, stdin = null) {
  const output = await runDocker(args, stdin);
  assert.equal(output.success, true, outputText(output));
  return output;
}

async function assertLocalImageIdentity() {
  const output = await runDockerRequired([
    "image",
    "inspect",
    fixedImage,
    "--format",
    "{{json .Id}}",
  ]);
  assert.equal(
    JSON.parse(decoder.decode(output.stdout).trim()),
    approvedImageId,
    "cached PostgreSQL image identity drifted",
  );
}

async function runPsql(
  containerName,
  sql,
  allowFailure = false,
  username = "postgres",
) {
  const output = await runDocker([
    "exec",
    "-i",
    containerName,
    "psql",
    "--no-psqlrc",
    "--quiet",
    "--set=ON_ERROR_STOP=1",
    "--tuples-only",
    "--no-align",
    "--username",
    username,
    "--dbname",
    "postgres",
  ], sql);
  if (!allowFailure) assert.equal(output.success, true, outputText(output));
  return output;
}

async function waitForHealthy(containerName) {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    const health = await runDocker([
      "inspect",
      "--format",
      "{{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}",
      containerName,
    ]);
    if (health.success && decoder.decode(health.stdout).trim() === "healthy") {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 1_000));
  }
  assert.fail("task-owned PostgreSQL container did not become healthy");
}

function assertContainerIdentity(inspectRecord, containerName, nonce) {
  assert.equal(inspectRecord.Name, `/${containerName}`);
  assert.equal(inspectRecord.Config.Image, approvedImageId);
  assert.equal(inspectRecord.Image, approvedImageId);
  assert.equal(
    inspectRecord.Config.Labels["laibe.test.kind"],
    "drs-gmail-line-private-routing-real-pg",
  );
  assert.equal(inspectRecord.Config.Labels["laibe.test.task"], taskId);
  assert.equal(inspectRecord.Config.Labels["laibe.test.nonce"], nonce);
  assert.equal(inspectRecord.HostConfig.NetworkMode, "none");
  assert.deepEqual(inspectRecord.Mounts, []);
  assert.deepEqual(inspectRecord.HostConfig.PortBindings ?? {}, {});
  for (
    const bindings of Object.values(inspectRecord.NetworkSettings.Ports ?? {})
  ) assert.equal(bindings, null);
}

async function assertPsqlFailure(containerName, sql, expected) {
  const output = await runPsql(containerName, sql, true);
  assert.equal(output.success, false, "SQL was expected to fail closed");
  assert.match(outputText(output), expected);
}

async function queryJson(containerName, sql) {
  const output = await runPsql(containerName, sql);
  return JSON.parse(decoder.decode(output.stdout).trim());
}

function jsonSql(value) {
  return `'${JSON.stringify(value).replaceAll("'", "''")}'::jsonb`;
}

async function callJson(containerName, functionName, input) {
  assert.match(functionName, /^drs_line_[a-z0-9_]+_v1$/u);
  return await queryJson(
    containerName,
    `select drs_private.${functionName}(${jsonSql(input)});`,
  );
}

function assertNoNotificationPayloadOrDestination(value) {
  for (
    const key of [
      "outbox_id",
      "claim_token",
      "binding_version",
      "line_user_ciphertext",
      "line_user_iv",
      "encryption_key_version",
      "case_label",
      "case_status",
      "next_action",
      "case_path",
    ]
  ) {
    assert.equal(
      Object.hasOwn(value, key),
      false,
      `stale authority response must not expose ${key}`,
    );
  }
}

const authIdentityPrerequisiteSql = `
  begin;
  set local role supabase_auth_admin;
  alter table auth.users
    add column if not exists deleted_at timestamptz,
    add column if not exists banned_until timestamptz;
  commit;
`;

const identityPrerequisiteSql = `
  create schema if not exists casework;
  create table casework.cases (
    id uuid primary key,
    case_status text not null
  );
  create schema if not exists integration;
  create or replace function integration.google_calendar_drs_authorize_transaction_v1(
    uuid, uuid, text, text
  ) returns jsonb language sql security definer set search_path = ''
    as 'select ''{}''::jsonb';
  revoke all on function integration.google_calendar_drs_authorize_transaction_v1(
    uuid, uuid, text, text
  ) from public, anon, authenticated, service_role;
`;

const fixtureSql = `
  begin;
  insert into auth.users(id) values ('${ids.user}');
  insert into casework.cases(id, case_status)
    values ('${ids.caseworkCase}', 'active');
  insert into public.drs_cases(case_id, case_number, owner_id, case_state)
    values ('${ids.drsCase}', 'LINE-REAL-PG-1', '${ids.user}', 'ACTIVE_REVIEW');
  insert into public.drs_specialists(
    specialist_id, display_name, authority_state
  ) values ('${ids.specialist}', 'Disposable LINE specialist', 'ACTIVE');
  insert into public.drs_case_specialist_assignments(
    assignment_id, case_id, specialist_id, assigned_by, valid_from, valid_until
  ) values (
    '${ids.assignment}', '${ids.drsCase}', '${ids.specialist}', '${ids.user}',
    clock_timestamp() - interval '1 hour', clock_timestamp() + interval '1 day'
  );
  insert into integration.drs_case_identity_bindings(
    case_identity_binding_id, drs_case_id, casework_case_id,
    mapping_status, valid_from, valid_until
  ) values (
    '${ids.mapping}', '${ids.drsCase}', '${ids.caseworkCase}', 'active',
    clock_timestamp() - interval '1 hour', clock_timestamp() + interval '1 day'
  );
  insert into integration.drs_auth_specialist_bindings(
    binding_id, authenticated_user_id, specialist_id, selected_assignment_id,
    authorization_subject, binding_status, valid_from, valid_until
  ) values (
    '${ids.authBinding}', '${ids.user}', '${ids.specialist}', '${ids.assignment}',
    '${authorizationSubject}', 'active',
    clock_timestamp() - interval '1 hour', clock_timestamp() + interval '1 day'
  );
  commit;
`;

const schemaFactsSql = `
  with expected_tables(name) as (
    values
      ('drs_line_account_link_intents'),
      ('drs_line_account_bindings'),
      ('drs_line_binding_audit'),
      ('drs_line_webhook_events'),
      ('drs_line_notification_outbox'),
      ('drs_line_delivery_receipts')
  ), expected_functions(name) as (
    values
      ('drs_line_start_link_intent_v1'),
      ('drs_line_read_link_status_v1'),
      ('drs_line_cancel_link_intent_v1'),
      ('drs_line_prepare_nonce_v1'),
      ('drs_line_complete_account_link_v1'),
      ('drs_line_unlink_account_v1'),
      ('drs_line_unlink_by_line_identity_v1'),
      ('drs_line_claim_webhook_v1'),
      ('drs_line_complete_webhook_v1'),
      ('drs_line_complete_account_link_event_v1'),
      ('drs_line_admit_case_notification_v1'),
      ('drs_line_claim_notification_v1'),
      ('drs_line_assert_notification_claim_v1'),
      ('drs_line_complete_notification_v1')
  ), expected_triggers(name) as (
    values
      ('drs_line_binding_audit_append_only'),
      ('drs_line_delivery_receipts_append_only'),
      ('drs_line_assignment_notification_producer'),
      ('drs_line_binding_notification_producer'),
      ('drs_line_assignment_termination_delivery_fence'),
      ('drs_line_assignment_update_delivery_fence'),
      ('drs_line_specialist_delivery_fence'),
      ('drs_line_case_delivery_fence'),
      ('drs_line_auth_binding_delivery_fence'),
      ('drs_line_binding_revoke_delivery_fence')
  )
  select jsonb_build_object(
    'table_count', (
      select count(*) from expected_tables expected
      join pg_class relation on relation.relname = expected.name
      join pg_namespace namespace on namespace.oid = relation.relnamespace
      where namespace.nspname = 'integration'
    ),
    'table_owner_rls', (
      select bool_and(
        pg_get_userbyid(relation.relowner) = 'postgres'
        and relation.relrowsecurity and relation.relforcerowsecurity
      ) from expected_tables expected
      join pg_class relation on relation.relname = expected.name
      join pg_namespace namespace on namespace.oid = relation.relnamespace
      where namespace.nspname = 'integration'
    ),
    'deny_policy_count', (
      select count(*) from pg_policy policy
      join pg_class relation on relation.oid = policy.polrelid
      join pg_namespace namespace on namespace.oid = relation.relnamespace
      join expected_tables expected on expected.name = relation.relname
      where namespace.nspname = 'integration'
    ),
    'service_table_dml', (
      select bool_or(
        has_table_privilege('service_role', relation.oid, 'SELECT')
        or has_table_privilege('service_role', relation.oid, 'INSERT')
        or has_table_privilege('service_role', relation.oid, 'UPDATE')
        or has_table_privilege('service_role', relation.oid, 'DELETE')
      ) from expected_tables expected
      join pg_class relation on relation.relname = expected.name
      join pg_namespace namespace on namespace.oid = relation.relnamespace
      where namespace.nspname = 'integration'
    ),
    'private_function_count', (
      select count(*) from expected_functions expected
      join pg_proc procedure on procedure.proname = expected.name
      join pg_namespace namespace on namespace.oid = procedure.pronamespace
      where namespace.nspname = 'drs_private'
        and pg_get_userbyid(procedure.proowner) = 'postgres'
        and has_function_privilege('service_role', procedure.oid, 'EXECUTE')
        and not has_function_privilege('anon', procedure.oid, 'EXECUTE')
        and not has_function_privilege('authenticated', procedure.oid, 'EXECUTE')
    ),
    'public_facade_count', (
      select count(*) from expected_functions expected
      join pg_proc procedure on procedure.proname = expected.name
      join pg_namespace namespace on namespace.oid = procedure.pronamespace
      where namespace.nspname = 'public'
        and pg_get_userbyid(procedure.proowner) = 'postgres'
        and has_function_privilege('service_role', procedure.oid, 'EXECUTE')
        and not has_function_privilege('anon', procedure.oid, 'EXECUTE')
        and not has_function_privilege('authenticated', procedure.oid, 'EXECUTE')
    ),
    'trigger_count', (
      select count(*) from expected_triggers expected
      join pg_trigger trigger_record on trigger_record.tgname = expected.name
      where not trigger_record.tgisinternal
    )
  );
`;

async function withFocusedDisposableDatabase(scenario, runAssertions) {
  assert.ok(taskId);
  assert.match(scenario, /^[a-z0-9-]{3,32}$/u);
  await assertDockerExecutableIdentity();
  await assertFileIdentity(
    lineMigrationUrl,
    approvedLineMigrationBytes,
    approvedLineMigrationSha256,
  );
  await assertLocalImageIdentity();

  const [coreMigration, identityMigration, lineMigration] = await Promise.all([
    Deno.readTextFile(coreMigrationUrl),
    Deno.readTextFile(identityMigrationUrl),
    Deno.readTextFile(lineMigrationUrl),
  ]);
  const nonce = crypto.randomUUID().replaceAll("-", "").slice(0, 12);
  const containerName = `laibe-a0-line-pg-${taskId}-${scenario}-${nonce}`;
  let created = false;

  try {
    const collision = await runDocker([
      "container",
      "inspect",
      containerName,
    ]);
    assert.equal(collision.success, false, "container name must be unused");

    await runDockerRequired([
      "run",
      "--pull",
      "never",
      "--detach",
      "--name",
      containerName,
      "--network",
      "none",
      "--label",
      "laibe.test.kind=drs-gmail-line-private-routing-real-pg",
      "--label",
      `laibe.test.task=${taskId}`,
      "--label",
      `laibe.test.nonce=${nonce}`,
      "--env",
      `POSTGRES_PASSWORD=${nonce}`,
      approvedImageId,
    ]);
    created = true;
    await waitForHealthy(containerName);

    const inspectOutput = await runDockerRequired(["inspect", containerName]);
    const [inspectRecord] = JSON.parse(decoder.decode(inspectOutput.stdout));
    assertContainerIdentity(inspectRecord, containerName, nonce);

    await runPsql(containerName, coreMigration);
    await runPsql(
      containerName,
      authIdentityPrerequisiteSql,
      false,
      "supabase_admin",
    );
    await runPsql(containerName, identityPrerequisiteSql);
    await runPsql(containerName, identityMigration);
    await runPsql(containerName, lineMigration);
    await runPsql(containerName, fixtureSql);
    await runPsql(
      containerName,
      `insert into integration.drs_line_account_bindings(
         specialist_id, provider_channel_id, line_user_digest,
         line_user_ciphertext, line_user_iv, encryption_key_version
       ) values (
         '${ids.specialist}', '${providerChannelId}', '${lineUserDigest}',
         '${"c".repeat(24)}', '${"i".repeat(16)}', 'line-key-v1'
       );`,
    );
    await runAssertions(containerName);
  } finally {
    if (created) {
      await runDockerRequired(["rm", "--force", containerName]);
      const remaining = await runDocker([
        "container",
        "inspect",
        containerName,
      ]);
      assert.equal(
        remaining.success,
        false,
        "task-owned container must be removed",
      );
    }
  }
}

function startPsql(containerName, sql) {
  const command = new Deno.Command(approvedDockerExecutable, {
    args: [
      "--host",
      localDockerHost,
      "exec",
      "-i",
      containerName,
      "psql",
      "--no-psqlrc",
      "--quiet",
      "--set=ON_ERROR_STOP=1",
      "--tuples-only",
      "--no-align",
      "--username",
      "postgres",
      "--dbname",
      "postgres",
    ],
    clearEnv: true,
    env: { SystemRoot: approvedSystemRoot },
    stdin: "piped",
    stdout: "piped",
    stderr: "piped",
  });
  const child = command.spawn();
  const write = async () => {
    const writer = child.stdin.getWriter();
    await writer.write(encoder.encode(sql));
    await writer.close();
  };
  return { child, write };
}

Deno.test({
  name:
    "focused RED: deleting an authorization binding is rejected without lifecycle side effects",
  ignore: taskId === null,
  sanitizeResources: false,
  sanitizeOps: false,
  async fn() {
    await withFocusedDisposableDatabase(
      "delete-reject",
      async (containerName) => {
        const admitted = await callJson(
          containerName,
          "drs_line_admit_case_notification_v1",
          {
            assignment_id: ids.assignment,
            provider_channel_id: providerChannelId,
            template_version: "delete-reject-v1",
          },
        );
        assert.equal(admitted.admitted, true);
        const before = await queryJson(
          containerName,
          `select jsonb_build_object(
          'binding', (select count(*) from integration.drs_auth_specialist_bindings where binding_id = '${ids.authBinding}'),
          'state', (select delivery_state from integration.drs_line_notification_outbox where template_version = 'delete-reject-v1'),
          'receipts', (select count(*) from integration.drs_line_delivery_receipts receipt join integration.drs_line_notification_outbox outbox using(outbox_id) where outbox.template_version = 'delete-reject-v1'),
          'audits', (select count(*) from public.drs_case_audit_events audit join integration.drs_line_notification_outbox outbox on audit.payload ->> 'outbox_id' = outbox.outbox_id::text where outbox.template_version = 'delete-reject-v1')
        );`,
        );
        assert.deepEqual(before, {
          binding: 1,
          state: "pending",
          receipts: 0,
          audits: 0,
        });
        await assertPsqlFailure(
          containerName,
          `delete from integration.drs_auth_specialist_bindings where binding_id = '${ids.authBinding}';`,
          /DRS_AUTH_BINDING_DELETE_FORBIDDEN/u,
        );
        const after = await queryJson(
          containerName,
          `select jsonb_build_object(
          'binding', (select count(*) from integration.drs_auth_specialist_bindings where binding_id = '${ids.authBinding}'),
          'state', (select delivery_state from integration.drs_line_notification_outbox where template_version = 'delete-reject-v1'),
          'receipts', (select count(*) from integration.drs_line_delivery_receipts receipt join integration.drs_line_notification_outbox outbox using(outbox_id) where outbox.template_version = 'delete-reject-v1'),
          'audits', (select count(*) from public.drs_case_audit_events audit join integration.drs_line_notification_outbox outbox on audit.payload ->> 'outbox_id' = outbox.outbox_id::text where outbox.template_version = 'delete-reject-v1')
        );`,
        );
        assert.deepEqual(after, before);
      },
    );
  },
});

Deno.test({
  name:
    "focused RED: lock wait crossing authorization expiry fails at post-lock decision time",
  ignore: taskId === null,
  sanitizeResources: false,
  sanitizeOps: false,
  async fn() {
    await withFocusedDisposableDatabase(
      "expiry-lock",
      async (containerName) => {
        await runPsql(
          containerName,
          `update integration.drs_auth_specialist_bindings
         set valid_until = clock_timestamp() + interval '1.5 seconds',
           updated_at = clock_timestamp()
         where binding_id = '${ids.authBinding}';`,
        );
        const admitted = await callJson(
          containerName,
          "drs_line_admit_case_notification_v1",
          {
            assignment_id: ids.assignment,
            provider_channel_id: providerChannelId,
            template_version: "expiry-lock-v1",
          },
        );
        assert.equal(admitted.admitted, true);

        const locker = startPsql(
          containerName,
          `begin;
         select 1 from integration.drs_auth_specialist_bindings
         where binding_id = '${ids.authBinding}' for update;
         select pg_sleep(2.5);
         commit;`,
        );
        await locker.write();
        await new Promise((resolve) => setTimeout(resolve, 300));
        const claim = await callJson(
          containerName,
          "drs_line_claim_notification_v1",
          {},
        );
        const lockerOutput = await locker.child.output();
        assert.equal(lockerOutput.success, true, outputText(lockerOutput));
        assert.deepEqual(claim, {
          admitted: false,
          state: "suppressed_authority",
          assignment_status: "not_current",
        });
        assertNoNotificationPayloadOrDestination(claim);
        const facts = await queryJson(
          containerName,
          `select jsonb_build_object(
          'state', outbox.delivery_state,
          'claim_token', outbox.claim_token::text,
          'receipts', (select count(*) from integration.drs_line_delivery_receipts receipt where receipt.outbox_id = outbox.outbox_id),
          'audits', (select count(*) from public.drs_case_audit_events audit where audit.event_type = 'PRIVATE_LINE_NOTIFICATION' and audit.payload ->> 'outbox_id' = outbox.outbox_id::text)
        ) from integration.drs_line_notification_outbox outbox
        where outbox.template_version = 'expiry-lock-v1';`,
        );
        assert.deepEqual(facts, {
          state: "suppressed",
          claim_token: null,
          receipts: 1,
          audits: 1,
        });
      },
    );
  },
});

Deno.test({
  name: "real gate: private LINE routing migration state machine",
  ignore: taskId === null,
  sanitizeResources: false,
  sanitizeOps: false,
  async fn() {
    assert.ok(taskId);
    await assertDockerExecutableIdentity();
    await assertFileIdentity(
      lineMigrationUrl,
      approvedLineMigrationBytes,
      approvedLineMigrationSha256,
    );
    await assertLocalImageIdentity();

    const [coreMigration, identityMigration, lineMigration] = await Promise.all(
      [
        Deno.readTextFile(coreMigrationUrl),
        Deno.readTextFile(identityMigrationUrl),
        Deno.readTextFile(lineMigrationUrl),
      ],
    );
    const nonce = crypto.randomUUID().replaceAll("-", "").slice(0, 12);
    const containerName = `laibe-a0-line-pg-${taskId}-${nonce}`;
    let created = false;

    try {
      const collision = await runDocker([
        "container",
        "inspect",
        containerName,
      ]);
      assert.equal(collision.success, false, "container name must be unused");

      await runDockerRequired([
        "run",
        "--pull",
        "never",
        "--detach",
        "--name",
        containerName,
        "--network",
        "none",
        "--label",
        "laibe.test.kind=drs-gmail-line-private-routing-real-pg",
        "--label",
        `laibe.test.task=${taskId}`,
        "--label",
        `laibe.test.nonce=${nonce}`,
        "--env",
        `POSTGRES_PASSWORD=${nonce}`,
        approvedImageId,
      ]);
      created = true;
      await waitForHealthy(containerName);

      const inspectOutput = await runDockerRequired(["inspect", containerName]);
      const [inspectRecord] = JSON.parse(decoder.decode(inspectOutput.stdout));
      assertContainerIdentity(inspectRecord, containerName, nonce);

      const databaseIdentity = await runPsql(
        containerName,
        "select current_database(), current_user, has_database_privilege(current_user, current_database(), 'create');",
      );
      assert.equal(
        decoder.decode(databaseIdentity.stdout).trim(),
        "postgres|postgres|t",
      );

      await assertPsqlFailure(
        containerName,
        lineMigration,
        /DRS_LINE_PRIVATE_ROUTING_PREREQUISITE_MISSING/u,
      );
      assert.equal(
        await queryJson(
          containerName,
          "select jsonb_build_object('line_tables', count(*)) from pg_class relation join pg_namespace namespace on namespace.oid = relation.relnamespace where namespace.nspname = 'integration' and relation.relname like 'drs_line_%';",
        ).then((facts) => facts.line_tables),
        0,
      );

      await runPsql(containerName, coreMigration);
      await assertPsqlFailure(
        containerName,
        lineMigration,
        /DRS_LINE_PRIVATE_ROUTING_PREREQUISITE_MISSING/u,
      );
      await runPsql(
        containerName,
        authIdentityPrerequisiteSql,
        false,
        "supabase_admin",
      );
      await runPsql(containerName, identityPrerequisiteSql);
      await runPsql(containerName, identityMigration);
      await runPsql(containerName, lineMigration);
      await assertPsqlFailure(
        containerName,
        lineMigration,
        /DRS_LINE_PRIVATE_ROUTING_ALREADY_EXISTS/u,
      );

      const schemaFacts = await queryJson(containerName, schemaFactsSql);
      assert.deepEqual(schemaFacts, {
        table_count: 6,
        table_owner_rls: true,
        deny_policy_count: 6,
        service_table_dml: false,
        private_function_count: 14,
        public_facade_count: 14,
        trigger_count: 10,
      });

      await runPsql(containerName, fixtureSql);
      const authority = await queryJson(
        containerName,
        `select integration.drs_identity_authority_resolve_locked_v1(
          '${ids.user}', '${ids.caseworkCase}', '${authorizationSubject}'
        );`,
      );
      assert.equal(authority.authorized, true, JSON.stringify(authority));
      const startPayload = {
        authenticated_user_id: ids.user,
        specialist_id: ids.specialist,
        selected_case_id: ids.caseworkCase,
        authorization_subject: authorizationSubject,
        provider_channel_id: providerChannelId,
        bot_launch_url: "https://line.me/R/ti/p/@laibe",
      };
      const start = await callJson(
        containerName,
        "drs_line_start_link_intent_v1",
        startPayload,
      );
      assert.equal(start.state, "awaiting_line_confirmation");

      const prepared = await callJson(
        containerName,
        "drs_line_prepare_nonce_v1",
        {
          ...startPayload,
          bot_launch_url: undefined,
          nonce_digest: nonceDigest,
          nonce_expires_at: new Date(Date.now() + 5 * 60_000).toISOString(),
        },
      );
      assert.deepEqual(prepared, {
        accepted: true,
        state: "awaiting_line_confirmation",
      });

      const linkPayload = {
        provider_channel_id: providerChannelId,
        nonce_digest: nonceDigest,
        line_user_digest: lineUserDigest,
        line_user_ciphertext: "c".repeat(24),
        line_user_iv: "i".repeat(16),
        encryption_key_version: "test-key-v1",
      };
      const linked = await callJson(
        containerName,
        "drs_line_complete_account_link_v1",
        linkPayload,
      );
      assert.equal(linked.state, "linked");
      const replayedNonce = await callJson(
        containerName,
        "drs_line_complete_account_link_v1",
        linkPayload,
      );
      assert.equal(replayedNonce.state, "expired");

      const durableLinkFacts = await queryJson(
        containerName,
        `select jsonb_build_object(
          'bindings', (select count(*) from integration.drs_line_account_bindings),
          'consumed_intents', (select count(*) from integration.drs_line_account_link_intents where intent_state = 'linked' and consumed_at is not null and nonce_digest is null),
          'outbox', (select count(*) from integration.drs_line_notification_outbox)
        );`,
      );
      assert.deepEqual(durableLinkFacts, {
        bindings: 1,
        consumed_intents: 1,
        outbox: 1,
      });

      const webhookInput = {
        webhook_event_digest: webhookDigest,
        event_kind: "verify",
      };
      const webhookClaim = await callJson(
        containerName,
        "drs_line_claim_webhook_v1",
        webhookInput,
      );
      assert.equal(webhookClaim.admission, "claimed");
      const duplicateClaim = await callJson(
        containerName,
        "drs_line_claim_webhook_v1",
        webhookInput,
      );
      assert.equal(duplicateClaim.admission, "in_progress");
      const webhookCompletion = await callJson(
        containerName,
        "drs_line_complete_webhook_v1",
        {
          webhook_event_digest: webhookDigest,
          claim_token: webhookClaim.claim_token,
          safe_outcome: "verified",
        },
      );
      assert.deepEqual(webhookCompletion, {
        completed: true,
        safe_outcome: "verified",
      });
      const completedReplay = await callJson(
        containerName,
        "drs_line_claim_webhook_v1",
        webhookInput,
      );
      assert.deepEqual(completedReplay, {
        admission: "already_completed",
        safe_outcome: "verified",
      });

      const notificationClaim = await callJson(
        containerName,
        "drs_line_claim_notification_v1",
        {},
      );
      assert.equal(notificationClaim.admitted, true);
      const claimCurrent = await callJson(
        containerName,
        "drs_line_assert_notification_claim_v1",
        {
          outbox_id: notificationClaim.outbox_id,
          claim_token: notificationClaim.claim_token,
        },
      );
      assert.deepEqual(claimCurrent, { current: true });

      const unlinkPayload = {
        authenticated_user_id: ids.user,
        specialist_id: ids.specialist,
        selected_case_id: ids.caseworkCase,
        authorization_subject: authorizationSubject,
        provider_channel_id: providerChannelId,
      };
      const blockedUnlink = await callJson(
        containerName,
        "drs_line_unlink_account_v1",
        unlinkPayload,
      );
      assert.equal(blockedUnlink.state, "temporarily_unavailable");
      await assertPsqlFailure(
        containerName,
        `update integration.drs_line_account_bindings
          set binding_state = 'revoked', revoked_at = clock_timestamp()
          where specialist_id = '${ids.specialist}';`,
        /DRS_LINE_DELIVERY_IN_FLIGHT/u,
      );
      await assertPsqlFailure(
        containerName,
        `insert into public.drs_case_specialist_assignment_terminations(
          termination_id, assignment_id, case_id, specialist_id,
          terminated_at, terminated_by, reason
        ) values (
          '${ids.blockedTermination}', '${ids.assignment}', '${ids.drsCase}',
          '${ids.specialist}', clock_timestamp(), '${ids.user}',
          'must be fenced while delivery is claimed'
        );`,
        /DRS_LINE_DELIVERY_IN_FLIGHT/u,
      );

      await runPsql(
        containerName,
        `create function public.drs_line_test_reject_receipt_audit()
          returns trigger language plpgsql as $$
          begin
            if new.event_type = 'PRIVATE_LINE_NOTIFICATION' then
              raise exception 'TEST_RECEIPT_AUDIT_BLOCK';
            end if;
            return new;
          end;
          $$;
          create trigger drs_line_test_reject_receipt_audit
            before insert on public.drs_case_audit_events
            for each row execute function public.drs_line_test_reject_receipt_audit();`,
      );
      const completionPayload = {
        outbox_id: notificationClaim.outbox_id,
        claim_token: notificationClaim.claim_token,
        outcome: "accepted",
        http_status_class: "2xx",
        provider_request_id: "request-1",
        reason_code: "accepted_by_provider",
        duration_ms: 12,
        retry_after_seconds: 5,
      };
      const blockedCompletion = await callJson(
        containerName,
        "drs_line_complete_notification_v1",
        completionPayload,
      );
      assert.deepEqual(blockedCompletion, { completed: false });
      const rollbackFacts = await queryJson(
        containerName,
        `select jsonb_build_object(
          'state', (select delivery_state from integration.drs_line_notification_outbox where outbox_id = '${notificationClaim.outbox_id}'),
          'claim_token', (select claim_token::text from integration.drs_line_notification_outbox where outbox_id = '${notificationClaim.outbox_id}'),
          'receipts', (select count(*) from integration.drs_line_delivery_receipts),
          'audits', (select count(*) from public.drs_case_audit_events where event_type = 'PRIVATE_LINE_NOTIFICATION')
        );`,
      );
      assert.deepEqual(rollbackFacts, {
        state: "claimed",
        claim_token: notificationClaim.claim_token,
        receipts: 0,
        audits: 0,
      });

      await runPsql(
        containerName,
        `drop trigger drs_line_test_reject_receipt_audit on public.drs_case_audit_events;
         drop function public.drs_line_test_reject_receipt_audit();`,
      );
      const completed = await callJson(
        containerName,
        "drs_line_complete_notification_v1",
        completionPayload,
      );
      assert.deepEqual(completed, { completed: true, state: "accepted" });
      const duplicateCompletion = await callJson(
        containerName,
        "drs_line_complete_notification_v1",
        completionPayload,
      );
      assert.deepEqual(duplicateCompletion, { completed: false });

      const receiptFacts = await queryJson(
        containerName,
        `select jsonb_build_object(
          'state', (select delivery_state from integration.drs_line_notification_outbox where outbox_id = '${notificationClaim.outbox_id}'),
          'receipts', (select count(*) from integration.drs_line_delivery_receipts where outbox_id = '${notificationClaim.outbox_id}'),
          'audits', (select count(*) from public.drs_case_audit_events where event_type = 'PRIVATE_LINE_NOTIFICATION'),
          'terminations', (select count(*) from public.drs_case_specialist_assignment_terminations)
        );`,
      );
      assert.deepEqual(receiptFacts, {
        state: "accepted",
        receipts: 1,
        audits: 1,
        terminations: 0,
      });

      await assertPsqlFailure(
        containerName,
        "update integration.drs_line_delivery_receipts set reason_code = 'changed';",
        /DRS_LINE_APPEND_ONLY/u,
      );
      await assertPsqlFailure(
        containerName,
        "update integration.drs_line_binding_audit set safe_outcome = 'changed';",
        /DRS_LINE_APPEND_ONLY/u,
      );

      await runPsql(
        containerName,
        `insert into integration.drs_line_notification_outbox(
          case_id, assignment_id, specialist_id, auth_binding_id,
          binding_id, binding_version, provider_channel_id, template_version,
          idempotency_key, case_label, case_status, next_action, case_path,
          delivery_state, attempt_count, next_attempt_at, created_at
        )
        select case_id, assignment_id, specialist_id, auth_binding_id,
          binding_id, binding_version, provider_channel_id, 'auth-rotation-v1',
          'auth-rotation-before-claim-v1', case_label, case_status,
          next_action, case_path, 'pending', 0, clock_timestamp(),
          clock_timestamp()
        from integration.drs_line_notification_outbox
        where template_version = 'assignment-v1';`,
      );
      await runPsql(
        containerName,
        `create function public.drs_line_test_reject_auth_suppression_audit()
          returns trigger language plpgsql as $$
          begin
            if new.event_type = 'PRIVATE_LINE_NOTIFICATION' then
              raise exception 'TEST_AUTH_SUPPRESSION_AUDIT_BLOCK';
            end if;
            return new;
          end;
          $$;
          create trigger drs_line_test_reject_auth_suppression_audit
            before insert on public.drs_case_audit_events
            for each row execute function
              public.drs_line_test_reject_auth_suppression_audit();`,
      );
      await assertPsqlFailure(
        containerName,
        `update integration.drs_auth_specialist_bindings
         set updated_at = clock_timestamp() + interval '1 second'
         where binding_id = '${ids.authBinding}';`,
        /TEST_AUTH_SUPPRESSION_AUDIT_BLOCK/u,
      );
      const atomicSuppressionRollback = await queryJson(
        containerName,
        `select jsonb_build_object(
          'state', outbox.delivery_state,
          'receipts', (
            select count(*) from integration.drs_line_delivery_receipts receipt
            where receipt.outbox_id = outbox.outbox_id
          ),
          'audits', (
            select count(*) from public.drs_case_audit_events audit
            where audit.event_type = 'PRIVATE_LINE_NOTIFICATION'
              and audit.payload ->> 'outbox_id' = outbox.outbox_id::text
          )
        )
        from integration.drs_line_notification_outbox outbox
        where template_version = 'auth-rotation-v1';`,
      );
      assert.deepEqual(atomicSuppressionRollback, {
        state: "pending",
        receipts: 0,
        audits: 0,
      });
      await runPsql(
        containerName,
        `drop trigger drs_line_test_reject_auth_suppression_audit
           on public.drs_case_audit_events;
         drop function public.drs_line_test_reject_auth_suppression_audit();
         update integration.drs_auth_specialist_bindings
         set updated_at = clock_timestamp() + interval '1 second'
         where binding_id = '${ids.authBinding}';`,
      );
      const rotatedBeforeFirstClaim = await queryJson(
        containerName,
        `select jsonb_build_object(
          'state', outbox.delivery_state,
          'claim_token', outbox.claim_token::text,
          'receipts', (
            select count(*) from integration.drs_line_delivery_receipts receipt
            where receipt.outbox_id = outbox.outbox_id
          ),
          'audits', (
            select count(*) from public.drs_case_audit_events audit
            where audit.event_type = 'PRIVATE_LINE_NOTIFICATION'
              and audit.payload ->> 'outbox_id' = outbox.outbox_id::text
          )
        )
        from integration.drs_line_notification_outbox outbox
        where template_version = 'auth-rotation-v1';`,
      );
      assert.deepEqual(rotatedBeforeFirstClaim, {
        state: "suppressed",
        claim_token: null,
        receipts: 1,
        audits: 1,
      });
      await runPsql(
        containerName,
        `update integration.drs_auth_specialist_bindings
         set updated_at = updated_at + interval '1 second'
         where binding_id = '${ids.authBinding}';`,
      );
      const rotationRepeatFacts = await queryJson(
        containerName,
        `select jsonb_build_object(
          'receipts', (
            select count(*) from integration.drs_line_delivery_receipts receipt
            join integration.drs_line_notification_outbox outbox
              on outbox.outbox_id = receipt.outbox_id
            where outbox.template_version = 'auth-rotation-v1'
          ),
          'audits', (
            select count(*) from public.drs_case_audit_events audit
            join integration.drs_line_notification_outbox outbox
              on audit.payload ->> 'outbox_id' = outbox.outbox_id::text
            where outbox.template_version = 'auth-rotation-v1'
          )
        );`,
      );
      assert.deepEqual(rotationRepeatFacts, { receipts: 1, audits: 1 });

      await runPsql(
        containerName,
        `update integration.drs_auth_specialist_bindings
         set valid_until = clock_timestamp() + interval '1 second',
           updated_at = clock_timestamp()
         where binding_id = '${ids.authBinding}';

         insert into integration.drs_line_notification_outbox(
           case_id, assignment_id, specialist_id, auth_binding_id,
           binding_id, binding_version, provider_channel_id, template_version,
           idempotency_key, case_label, case_status, next_action, case_path,
           delivery_state, attempt_count, next_attempt_at, created_at
         )
         select case_id, assignment_id, specialist_id, auth_binding_id,
           binding_id, binding_version, provider_channel_id, 'auth-expiry-v1',
           'auth-expiry-before-claim-v1', case_label, case_status,
           next_action, case_path, 'pending', 0, clock_timestamp(),
           clock_timestamp()
         from integration.drs_line_notification_outbox
         where template_version = 'assignment-v1';`,
      );
      await new Promise((resolve) => setTimeout(resolve, 1_500));
      const expiredBeforeFirstClaim = await callJson(
        containerName,
        "drs_line_claim_notification_v1",
        {},
      );
      assert.deepEqual(expiredBeforeFirstClaim, {
        admitted: false,
        state: "suppressed_authority",
        assignment_status: "not_current",
      });
      assertNoNotificationPayloadOrDestination(expiredBeforeFirstClaim);
      const expiryFacts = await queryJson(
        containerName,
        `select jsonb_build_object(
          'state', outbox.delivery_state,
          'claim_token', outbox.claim_token::text,
          'receipts', (
            select count(*) from integration.drs_line_delivery_receipts receipt
            where receipt.outbox_id = outbox.outbox_id
          ),
          'audits', (
            select count(*) from public.drs_case_audit_events audit
            where audit.event_type = 'PRIVATE_LINE_NOTIFICATION'
              and audit.payload ->> 'outbox_id' = outbox.outbox_id::text
          )
        )
        from integration.drs_line_notification_outbox outbox
        where template_version = 'auth-expiry-v1';`,
      );
      assert.deepEqual(expiryFacts, {
        state: "suppressed",
        claim_token: null,
        receipts: 1,
        audits: 1,
      });
      const repeatedAfterExpirySuppression = await callJson(
        containerName,
        "drs_line_claim_notification_v1",
        {},
      );
      assert.deepEqual(repeatedAfterExpirySuppression, {
        admitted: false,
        state: "empty",
      });
      assertNoNotificationPayloadOrDestination(repeatedAfterExpirySuppression);
      await runPsql(
        containerName,
        `update integration.drs_auth_specialist_bindings
         set valid_until = clock_timestamp() + interval '1 day',
           updated_at = clock_timestamp()
         where binding_id = '${ids.authBinding}';`,
      );

      const secondAdmission = await callJson(
        containerName,
        "drs_line_admit_case_notification_v1",
        {
          assignment_id: ids.assignment,
          provider_channel_id: providerChannelId,
          template_version: "manual-v2",
        },
      );
      assert.equal(secondAdmission.admitted, true);
      const unlinked = await callJson(
        containerName,
        "drs_line_unlink_account_v1",
        unlinkPayload,
      );
      assert.equal(unlinked.state, "revoked");
      const unlinkFacts = await queryJson(
        containerName,
        `select jsonb_build_object(
          'binding_state', (select binding_state from integration.drs_line_account_bindings where specialist_id = '${ids.specialist}'),
          'suppressed_pending', (select count(*) from integration.drs_line_notification_outbox where template_version = 'manual-v2' and delivery_state = 'suppressed'),
          'receipt_count', (select count(*) from integration.drs_line_delivery_receipts)
        );`,
      );
      assert.deepEqual(unlinkFacts, {
        binding_state: "revoked",
        suppressed_pending: 1,
        receipt_count: 3,
      });

      await runPsql(
        containerName,
        `insert into integration.drs_line_notification_outbox(
          case_id, assignment_id, specialist_id, auth_binding_id,
          binding_id, binding_version, provider_channel_id, template_version, idempotency_key,
          case_label, case_status, next_action, case_path,
          delivery_state, attempt_count, next_attempt_at, created_at
        )
        select case_id, assignment_id, specialist_id, auth_binding_id,
          binding_id, binding_version, provider_channel_id, 'auth-revoke-v1',
          'auth-revoke-before-claim-v1', case_label, case_status,
          next_action, case_path, 'pending', 0, clock_timestamp(),
          clock_timestamp()
        from integration.drs_line_notification_outbox
        where template_version = 'assignment-v1';

        insert into integration.drs_line_notification_outbox(
          case_id, assignment_id, specialist_id, auth_binding_id,
          binding_id, binding_version, provider_channel_id, template_version, idempotency_key,
          case_label, case_status, next_action, case_path,
          delivery_state, attempt_count, next_attempt_at, created_at
        )
        select case_id, assignment_id, specialist_id, auth_binding_id,
          binding_id, binding_version, provider_channel_id, 'auth-retry-v1',
          'auth-revoke-before-retry-v1', case_label, case_status,
          next_action, case_path, 'retry', 1,
          clock_timestamp() + interval '5 minutes', clock_timestamp()
        from integration.drs_line_notification_outbox
        where template_version = 'assignment-v1';

        insert into integration.drs_line_delivery_receipts(
          outbox_id, case_id, specialist_id, attempt_number, outcome,
          http_status_class, provider_request_id, reason_code, duration_ms,
          attempted_at
        )
        select outbox_id, case_id, specialist_id, 1, 'retryable_failure',
          '5xx', null, 'provider_retry_scheduled', 0, clock_timestamp()
        from integration.drs_line_notification_outbox
        where template_version = 'auth-retry-v1';

        select drs_private.drs_line_append_case_receipt_v1(
          outbox_id, 'retry', 'provider_retry_scheduled', clock_timestamp()
        )
        from integration.drs_line_notification_outbox
        where template_version = 'auth-retry-v1';

        update integration.drs_auth_specialist_bindings
        set binding_status = 'revoked', revoked_at = clock_timestamp(),
          updated_at = clock_timestamp()
        where binding_id = '${ids.authBinding}';`,
      );
      const revokedBeforeClaimOrRetry = await queryJson(
        containerName,
        `select jsonb_build_object(
          'pending_state', (
            select delivery_state from integration.drs_line_notification_outbox
            where template_version = 'auth-revoke-v1'
          ),
          'pending_claim_token', (
            select claim_token::text from integration.drs_line_notification_outbox
            where template_version = 'auth-revoke-v1'
          ),
          'pending_receipts', (
            select count(*) from integration.drs_line_delivery_receipts receipt
            join integration.drs_line_notification_outbox outbox
              on outbox.outbox_id = receipt.outbox_id
            where outbox.template_version = 'auth-revoke-v1'
          ),
          'pending_audits', (
            select count(*) from public.drs_case_audit_events audit
            join integration.drs_line_notification_outbox outbox
              on audit.payload ->> 'outbox_id' = outbox.outbox_id::text
            where outbox.template_version = 'auth-revoke-v1'
          ),
          'retry_state', (
            select delivery_state from integration.drs_line_notification_outbox
            where template_version = 'auth-retry-v1'
          ),
          'retry_claim_token', (
            select claim_token::text from integration.drs_line_notification_outbox
            where template_version = 'auth-retry-v1'
          ),
          'retry_receipts', (
            select count(*) from integration.drs_line_delivery_receipts receipt
            join integration.drs_line_notification_outbox outbox
              on outbox.outbox_id = receipt.outbox_id
            where outbox.template_version = 'auth-retry-v1'
          ),
          'retry_audits', (
            select count(*) from public.drs_case_audit_events audit
            join integration.drs_line_notification_outbox outbox
              on audit.payload ->> 'outbox_id' = outbox.outbox_id::text
            where outbox.template_version = 'auth-retry-v1'
          )
        );`,
      );
      assert.deepEqual(revokedBeforeClaimOrRetry, {
        pending_state: "suppressed",
        pending_claim_token: null,
        pending_receipts: 1,
        pending_audits: 1,
        retry_state: "suppressed",
        retry_claim_token: null,
        retry_receipts: 2,
        retry_audits: 2,
      });
      const repeatedAfterRevokeSuppression = await callJson(
        containerName,
        "drs_line_claim_notification_v1",
        {},
      );
      assert.deepEqual(repeatedAfterRevokeSuppression, {
        admitted: false,
        state: "empty",
      });
      assertNoNotificationPayloadOrDestination(repeatedAfterRevokeSuppression);
      await runPsql(
        containerName,
        `update integration.drs_auth_specialist_bindings
         set updated_at = updated_at + interval '1 second'
         where binding_id = '${ids.authBinding}';`,
      );
      const repeatedSuppressionFacts = await queryJson(
        containerName,
        `select jsonb_build_object(
          'receipts', (
            select count(*) from integration.drs_line_delivery_receipts receipt
            join integration.drs_line_notification_outbox outbox
              on outbox.outbox_id = receipt.outbox_id
            where outbox.template_version in ('auth-revoke-v1', 'auth-retry-v1')
          ),
          'audits', (
            select count(*) from public.drs_case_audit_events audit
            join integration.drs_line_notification_outbox outbox
              on audit.payload ->> 'outbox_id' = outbox.outbox_id::text
            where outbox.template_version in ('auth-revoke-v1', 'auth-retry-v1')
          )
        );`,
      );
      assert.deepEqual(repeatedSuppressionFacts, { receipts: 3, audits: 3 });
    } finally {
      if (created) {
        await runDockerRequired(["rm", "--force", containerName]);
        const remaining = await runDocker([
          "container",
          "inspect",
          containerName,
        ]);
        assert.equal(
          remaining.success,
          false,
          "task-owned container must be removed",
        );
      }
    }
  },
});
