import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { createHash, createHmac } from "node:crypto";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import process from "node:process";
import test from "node:test";

const rootUrl = new URL("../", import.meta.url);
const rootPath = fileURLToPath(rootUrl);
const worktreePath = fileURLToPath(new URL("../../", import.meta.url));
const migrationsUrl = new URL("../migrations/", import.meta.url);
const migrationPattern =
  /^(\d{14})_drs_document_formalize_runtime_r1\.sql$/u;
const acceptedHarnessUrl = new URL(
  "tests/drs_case_event_ledger_r1_real_pg.test.mjs",
  rootUrl,
);

const IMAGES = Object.freeze({
  postgres:
    "public.ecr.aws/supabase/postgres@sha256:28f0e16a019e648089fc1a6d333549a55548f6019c15ae4bd7cd58b989027518",
  postgrest:
    "public.ecr.aws/supabase/postgrest@sha256:d2009b5c9deffc210c8a5592698472fede14fd9f6ca89823c8474ca54d58c012",
  storage:
    "public.ecr.aws/supabase/storage-api@sha256:528ec49c3c32561908b07ee91bced7f8456f3b688164e341eaa422441767a0bd",
  deno:
    "denoland/deno@sha256:1f45989701834cb616c368eda89797a8bfd48238ab5f18f67b8f4121c27f08a5",
});
const WRONG_POSTGREST_DIGEST =
  "d2007c289ff644f09709e411bb1311ab8024e56fc6b94b06ffda311865213c4b";
const RESOURCES = Object.freeze({
  network: "laibe-data-cont-r1-task4-internal",
  pgVolume: "laibe-data-cont-r1-task4-pgdata",
  objectVolume: "laibe-data-cont-r1-task4-objectdata",
  db: "laibe-data-cont-r1-task4-db",
  rest: "laibe-data-cont-r1-task4-rest",
  storage: "laibe-data-cont-r1-task4-storage",
  runner: "laibe-data-cont-r1-task4-runner",
});
const LABELS = Object.freeze({
  task: "com.laibe.task=data-cont-r1-task4",
  scope: "com.laibe.scope=disposable-db-storage-scanner-test",
  disposable: "com.laibe.disposable=true",
});
const JWT_SECRET =
  "task4-local-disposable-jwt-secret-20260902-minimum-32-characters";
const CATALOG_SHA256 =
  "804bd327dcb67788b74aff9aabc7c4de0fda1fe2b1be0e8fe37a83445117865e";
const CATALOG_SCHEMA_VERSION = "laibe.drs.a4-transition-catalog.pre-ready.v1";
const PDF_BYTES = Buffer.from("%PDF-1.7\nTask4 deterministic fixture", "utf8");
const PDF_SHA256 = createHash("sha256").update(PDF_BYTES).digest("hex");

const dockerPath = process.env.DRS_TASK4_DOCKER ?? "docker";
const candidate = process.env.DRS_TASK4_CANDIDATE ?? "";
const harnessConfirmed =
  process.env.DRS_TASK4_DISPOSABLE_CONFIRMED === "YES";
const harnessAvailable = harnessConfirmed && /^[a-f0-9]{40}$/u.test(candidate);

const IDS = Object.freeze({
  caseA: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  caseB: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
  caseC: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
  owner: "11111111-1111-4111-8111-111111111111",
  vendor: "22222222-2222-4222-8222-222222222222",
  drs: "33333333-3333-4333-8333-333333333333",
  ownerB: "44444444-4444-4444-8444-444444444444",
  ownerC: "55555555-5555-4555-8555-555555555555",
  ownerSession: "61111111-1111-4111-8111-111111111111",
  vendorSession: "62222222-2222-4222-8222-222222222222",
  drsSession: "63333333-3333-4333-8333-333333333333",
  ownerBSession: "64444444-4444-4444-8444-444444444444",
  ownerCSession: "65555555-5555-4555-8555-555555555555",
  ownerMembership: "71111111-1111-4111-8111-111111111111",
  vendorMembership: "72222222-2222-4222-8222-222222222222",
  drsMembership: "73333333-3333-4333-8333-333333333333",
  ownerBMembership: "74444444-4444-4444-8444-444444444444",
  ownerCMembership: "75555555-5555-4555-8555-555555555555",
  ownerTechnical: "81111111-1111-4111-8111-111111111111",
  vendorTechnical: "82222222-2222-4222-8222-222222222222",
  drsTechnical: "83333333-3333-4333-8333-333333333333",
  ownerBTechnical: "84444444-4444-4444-8444-444444444444",
  ownerCTechnical: "85555555-5555-4555-8555-555555555555",
});
const actors = Object.freeze({
  owner: Object.freeze({
    user: IDS.owner,
    session: IDS.ownerSession,
    membership: IDS.ownerMembership,
    technical: IDS.ownerTechnical,
    role: "owner",
    digest: "A".repeat(43),
  }),
  vendor: Object.freeze({
    user: IDS.vendor,
    session: IDS.vendorSession,
    membership: IDS.vendorMembership,
    technical: IDS.vendorTechnical,
    role: "vendor",
    digest: "B".repeat(43),
  }),
  drs: Object.freeze({
    user: IDS.drs,
    session: IDS.drsSession,
    membership: IDS.drsMembership,
    technical: IDS.drsTechnical,
    role: "drs",
    digest: "C".repeat(43),
  }),
  ownerB: Object.freeze({
    user: IDS.ownerB,
    session: IDS.ownerBSession,
    membership: IDS.ownerBMembership,
    technical: IDS.ownerBTechnical,
    role: "owner",
    digest: "D".repeat(43),
  }),
  ownerC: Object.freeze({
    user: IDS.ownerC,
    session: IDS.ownerCSession,
    membership: IDS.ownerCMembership,
    technical: IDS.ownerCTechnical,
    role: "owner",
    digest: "E".repeat(43),
  }),
});

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function sqlLiteral(value) {
  return `'${String(value).replaceAll("'", "''")}'`;
}

function extractRawSql(source, name) {
  const match = source.match(
    new RegExp("const " + name + " = String\\.raw`([\\s\\S]*?)`;", "u"),
  );
  assert.ok(match, `accepted harness constant missing: ${name}`);
  return match[1];
}

function docker(args, options = {}) {
  const result = spawnSync(dockerPath, args, {
    cwd: rootPath,
    encoding: "utf8",
    input: options.input,
    windowsHide: true,
  });
  if (!options.allowFailure) {
    assert.equal(
      result.status,
      0,
      `docker ${args.join(" ")} failed\n${result.stderr}\n${result.stdout}`,
    );
  }
  return result;
}

function dockerAsync(args, input = "") {
  return new Promise((resolve, reject) => {
    const child = spawn(dockerPath, args, {
      cwd: rootPath,
      windowsHide: true,
      stdio: ["pipe", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => stdout += chunk);
    child.stderr.on("data", (chunk) => stderr += chunk);
    child.on("error", reject);
    child.on("close", (status) => resolve({ status, stdout, stderr }));
    child.stdin.end(input);
  });
}

function psqlArgs(user = "postgres") {
  return [
    "exec",
    "-i",
    "-e",
    "PGPASSWORD=postgres",
    "-e",
    `PGUSER=${user}`,
    "-e",
    "PGDATABASE=postgres",
    RESOURCES.db,
    "psql",
    "-X",
    "-qAt",
    "-v",
    "ON_ERROR_STOP=1",
  ];
}

function psql(sql, user = "postgres", allowFailure = false) {
  const result = docker(psqlArgs(user), { input: sql, allowFailure });
  return {
    status: result.status,
    stdout: result.stdout.trim(),
    stderr: result.stderr.trim(),
  };
}

async function psqlAsync(sql) {
  const result = await dockerAsync(psqlArgs(), sql);
  assert.equal(
    result.status,
    0,
    `concurrent psql failed\n${result.stderr}\n${result.stdout}`,
  );
  return result.stdout.trim();
}

function jsonResult(output) {
  const line = output.split(/\r?\n/u).findLast((value) =>
    value.trimStart().startsWith("{") || value.trimStart().startsWith("[")
  );
  assert.ok(line, `JSON result missing from ${output}`);
  return JSON.parse(line);
}

function labelArgs() {
  return [
    "--label",
    LABELS.task,
    "--label",
    `com.laibe.candidate=${candidate}`,
    "--label",
    LABELS.scope,
    "--label",
    LABELS.disposable,
  ];
}

function jwt(role) {
  const now = Math.floor(Date.now() / 1000);
  const encode = (value) => Buffer.from(JSON.stringify(value)).toString("base64url");
  const header = encode({ alg: "HS256", typ: "JWT" });
  const payload = encode({
    iss: "supabase",
    ref: "data-cont-r1-task4",
    role,
    iat: now - 60,
    exp: now + 3600,
  });
  const input = `${header}.${payload}`;
  const signature = createHmac("sha256", JWT_SECRET)
    .update(input)
    .digest("base64url");
  return `${input}.${signature}`;
}

function canonicalRequest(document, expectedCaseVersion) {
  return [
    "schemaVersion=laibe.drs-document-upload-finalize.request.v2",
    `intentRef=${document.intentRef}`,
    `idempotencyKey=${document.key}`,
    `commandId=${document.commandId}`,
    `expectedCaseVersion=${expectedCaseVersion}`,
  ].join("\n");
}

function canonicalResource(document, requestHash) {
  return [
    "schemaVersion=laibe.drs-document-finalize-domain-command.internal.v1",
    `intentRef=${document.intentRef}`,
    "recordsBucket=drs-case-records-private",
    `recordsObjectKey=${document.recordsKey}`,
    `verifiedSha256=${PDF_SHA256}`,
    `verifiedSizeBytes=${PDF_BYTES.byteLength}`,
    "detectedMime=application/pdf",
    `requestPayloadSha256=${requestHash}`,
  ].join("\n");
}

function documentFixture({
  ordinal,
  caseId,
  actor,
  kind = "drawing",
  visibility = "PARTY_VISIBLE",
  sourceRole = "OWNER",
}) {
  const suffix = String(ordinal).padStart(12, "0");
  return Object.freeze({
    caseId,
    actor,
    kind,
    visibility,
    sourceRole,
    documentId: `d${suffix.slice(0, 7)}-0000-4000-8000-${suffix}`,
    versionId: `e${suffix.slice(0, 7)}-0000-4000-8000-${suffix}`,
    intentId: `f${suffix.slice(0, 7)}-0000-4000-8000-${suffix}`,
    commandId: `c${suffix.slice(0, 7)}-0000-4000-8000-${suffix}`,
    documentRef: `doc_task4runtime${suffix}`,
    versionRef: `dvr_task4runtime${suffix}`,
    intentRef: `int_task4runtime${suffix}`,
    key: `task4-finalize-key-${suffix}`,
    intakeKey:
      `intents/f${suffix.slice(0, 7)}-0000-4000-8000-${suffix}/e${suffix.slice(0, 7)}-0000-4000-8000-${suffix}.pdf`,
    recordsKey:
      `cases/${caseId}/documents/d${suffix.slice(0, 7)}-0000-4000-8000-${suffix}/versions/e${suffix.slice(0, 7)}-0000-4000-8000-${suffix}/source.pdf`,
  });
}

const documents = Object.freeze({
  primary: documentFixture({
    ordinal: 1,
    caseId: IDS.caseA,
    actor: actors.owner,
  }),
  concurrent: documentFixture({
    ordinal: 2,
    caseId: IDS.caseB,
    actor: actors.ownerB,
  }),
  storage: documentFixture({
    ordinal: 3,
    caseId: IDS.caseC,
    actor: actors.ownerC,
  }),
});

function documentFixtureSql(document) {
  return `
insert into casework.documents(
  id,case_id,document_ref,document_kind,visibility,source_role,
  document_status,current_version_id,created_by
) values (
  '${document.documentId}','${document.caseId}','${document.documentRef}',
  '${document.kind}','${document.visibility}','${document.sourceRole}',
  'DRAFT',null,'${document.actor.user}'
);
insert into casework.document_upload_intents(
  intent_id,intent_ref,case_id,document_id,planned_version_id,
  planned_version_ref,mode,document_kind,original_filename,declared_mime,
  declared_size_bytes,declared_sha256,intake_bucket,intake_object_key,
  records_bucket,records_object_key,intent_state,expected_payload_sha256,
  created_by,created_at,expires_at
) values (
  '${document.intentId}','${document.intentRef}','${document.caseId}',
  '${document.documentId}','${document.versionId}','${document.versionRef}',
  'NEW_DOCUMENT','${document.kind}','task4-sanitized-${document.documentId}.pdf',
  'application/pdf',${PDF_BYTES.byteLength},'${PDF_SHA256}',
  'drs-case-intake-private','${document.intakeKey}',
  'drs-case-records-private','${document.recordsKey}','INTENT_CREATED',
  '${PDF_SHA256}','${document.actor.user}',clock_timestamp(),
  clock_timestamp()+interval '10 minutes'
);
`;
}

function finalizeSql(document, expectedCaseVersion, action = "COMMIT") {
  const requestHash = sha256(canonicalRequest(document, expectedCaseVersion));
  const resourceHash = sha256(canonicalResource(document, requestHash));
  const isCommit = action === "COMMIT";
  return `begin;
set local role service_role;
select public.server_document_finalize_domain_command_v1(
  '${action}','${document.actor.user}','${document.actor.session}',
  '${document.caseId}','${document.actor.membership}',
  '${document.actor.role}',4,'${document.caseId === IDS.caseA ? "drs" : "owner"}',
  '${document.intentRef}','${document.key}','${document.commandId}',
  ${expectedCaseVersion},'${requestHash}',
  ${isCommit ? sqlLiteral(resourceHash) : "null"},
  ${isCommit ? "'drs-case-records-private'" : "null"},
  ${isCommit ? sqlLiteral(document.recordsKey) : "null"},
  ${isCommit ? sqlLiteral(PDF_SHA256) : "null"},
  ${isCommit ? String(PDF_BYTES.byteLength) : "null"},
  ${isCommit ? "'application/pdf'" : "null"}
);
commit;`;
}

function resourceAbsent(kind, name) {
  const command = kind === "container"
    ? ["container", "inspect", name]
    : kind === "network"
    ? ["network", "inspect", name]
    : ["volume", "inspect", name];
  return docker(command, { allowFailure: true }).status !== 0;
}

function cleanupExactTopology() {
  for (
    const container of [
      RESOURCES.runner,
      RESOURCES.storage,
      RESOURCES.rest,
      RESOURCES.db,
    ]
  ) {
    docker(["rm", "-f", container], { allowFailure: true });
  }
  for (const volume of [RESOURCES.objectVolume, RESOURCES.pgVolume]) {
    docker(["volume", "rm", volume], { allowFailure: true });
  }
  docker(["network", "rm", RESOURCES.network], { allowFailure: true });
}

function assertExactTopologyAbsent() {
  for (
    const container of [
      RESOURCES.db,
      RESOURCES.rest,
      RESOURCES.storage,
      RESOURCES.runner,
    ]
  ) assert.equal(resourceAbsent("container", container), true, container);
  assert.equal(resourceAbsent("network", RESOURCES.network), true);
  assert.equal(resourceAbsent("volume", RESOURCES.pgVolume), true);
  assert.equal(resourceAbsent("volume", RESOURCES.objectVolume), true);
}

function createExactDatabaseTopology() {
  assertExactTopologyAbsent();
  docker([
    "network",
    "create",
    "--internal",
    ...labelArgs(),
    RESOURCES.network,
  ]);
  docker(["volume", "create", ...labelArgs(), RESOURCES.pgVolume]);
  docker(["volume", "create", ...labelArgs(), RESOURCES.objectVolume]);
  docker([
    "run",
    "-d",
    "--pull",
    "never",
    "--name",
    RESOURCES.db,
    "--network",
    RESOURCES.network,
    "--network-alias",
    "db",
    ...labelArgs(),
    "--mount",
    `type=volume,src=${RESOURCES.pgVolume},dst=/var/lib/postgresql/data`,
    "-e",
    "POSTGRES_PASSWORD=postgres",
    "-e",
    "POSTGRES_DB=postgres",
    "-e",
    "PGPASSWORD=postgres",
    IMAGES.postgres,
  ]);
}

async function waitForPostgres() {
  for (let attempt = 0; attempt < 90; attempt += 1) {
    const ready = docker(
      [
        "exec",
        RESOURCES.db,
        "pg_isready",
        "-h",
        "127.0.0.1",
        "-U",
        "postgres",
        "-d",
        "postgres",
      ],
      { allowFailure: true },
    );
    if (ready.status === 0) return;
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  const logs = docker(["logs", RESOURCES.db], { allowFailure: true });
  assert.fail(`PostgreSQL readiness timeout\n${logs.stderr}\n${logs.stdout}`);
}

function applySql(sql, user = "postgres") {
  const result = psql(sql, user);
  assert.equal(result.status, 0);
}

function loadMigration(name) {
  return readFileSync(new URL(`migrations/${name}`, rootUrl), "utf8");
}

function applyAcceptedPreStorageSchema() {
  const acceptedHarness = readFileSync(acceptedHarnessUrl, "utf8");
  applySql(extractRawSql(acceptedHarness, "BASELINE_SETUP_SQL"));
  applySql(extractRawSql(acceptedHarness, "AUTH_HARNESS_SQL"), "supabase_admin");
  applySql(loadMigration("20260831182641_drs_remote_baseline_bridge_w2.sql"));
  applySql(loadMigration("20260901174523_drs_three_role_case_authority_r1.sql"));
  applySql(loadMigration("20260826183000_drs_workspace_grant_authority_v2.sql"));
  applySql(extractRawSql(acceptedHarness, "CASEWORK_PREDECESSOR_SQL"));
  applySql(`
do $roles$
begin
  if not exists (select 1 from pg_roles where rolname = 'authenticator') then
    raise exception 'TASK4_AUTHENTICATOR_ROLE_MISSING';
  end if;
  if not exists (
    select 1 from pg_roles where rolname = 'supabase_storage_admin'
  ) then
    raise exception 'TASK4_STORAGE_ADMIN_ROLE_MISSING';
  end if;
end;
$roles$;
alter role authenticator with login password 'postgres';
alter role supabase_storage_admin with login password 'postgres';
grant anon, authenticated, service_role to authenticator;
`, "supabase_admin");
}

function startDataServices(anonKey, serviceKey) {
  docker([
    "run",
    "-d",
    "--pull",
    "never",
    "--name",
    RESOURCES.rest,
    "--network",
    RESOURCES.network,
    "--network-alias",
    "rest",
    ...labelArgs(),
    "-e",
    "PGRST_DB_URI=postgres://authenticator:postgres@db:5432/postgres",
    "-e",
    "PGRST_DB_SCHEMAS=public,storage",
    "-e",
    "PGRST_DB_ANON_ROLE=anon",
    "-e",
    `PGRST_JWT_SECRET=${JWT_SECRET}`,
    "-e",
    "PGRST_DB_USE_LEGACY_GUCS=false",
    IMAGES.postgrest,
  ]);
  docker([
    "run",
    "-d",
    "--pull",
    "never",
    "--name",
    RESOURCES.storage,
    "--network",
    RESOURCES.network,
    "--network-alias",
    "storage",
    ...labelArgs(),
    "--mount",
    `type=volume,src=${RESOURCES.objectVolume},dst=/var/lib/storage`,
    "-e",
    `ANON_KEY=${anonKey}`,
    "-e",
    `SERVICE_KEY=${serviceKey}`,
    "-e",
    "POSTGREST_URL=http://rest:3000",
    "-e",
    `AUTH_JWT_SECRET=${JWT_SECRET}`,
    "-e",
    "DATABASE_URL=postgres://supabase_storage_admin:postgres@db:5432/postgres",
    "-e",
    "STORAGE_PUBLIC_URL=http://storage:5000",
    "-e",
    "REQUEST_ALLOW_X_FORWARDED_PATH=true",
    "-e",
    "FILE_SIZE_LIMIT=26214400",
    "-e",
    "STORAGE_BACKEND=file",
    "-e",
    "GLOBAL_S3_BUCKET=task4-local",
    "-e",
    "FILE_STORAGE_BACKEND_PATH=/var/lib/storage",
    "-e",
    "TENANT_ID=task4-local",
    "-e",
    "REGION=local",
    "-e",
    "ENABLE_IMAGE_TRANSFORMATION=false",
    IMAGES.storage,
  ]);
}

async function waitForStorageApi() {
  for (let attempt = 0; attempt < 120; attempt += 1) {
    const status = docker(
      [
        "exec",
        RESOURCES.storage,
        "wget",
        "--no-verbose",
        "--tries=1",
        "--spider",
        "http://127.0.0.1:5000/status",
      ],
      { allowFailure: true },
    );
    if (status.status === 0) return;
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  const storageLogs = docker(["logs", RESOURCES.storage], {
    allowFailure: true,
  });
  const restLogs = docker(["logs", RESOURCES.rest], { allowFailure: true });
  assert.fail(
    `Storage readiness timeout\n${storageLogs.stderr}\n${storageLogs.stdout}` +
      `\nPostgREST logs\n${restLogs.stderr}\n${restLogs.stdout}`,
  );
}

function baseFixtureSql() {
  return `
begin;
insert into auth.users(id) values
  ('${IDS.owner}'),('${IDS.vendor}'),('${IDS.drs}'),('${IDS.ownerB}'),
  ('${IDS.ownerC}');
insert into auth.sessions(id,user_id,not_after) values
  ('${IDS.ownerSession}','${IDS.owner}',clock_timestamp()+interval '1 hour'),
  ('${IDS.vendorSession}','${IDS.vendor}',clock_timestamp()+interval '1 hour'),
  ('${IDS.drsSession}','${IDS.drs}',clock_timestamp()+interval '1 hour'),
  ('${IDS.ownerBSession}','${IDS.ownerB}',clock_timestamp()+interval '1 hour'),
  ('${IDS.ownerCSession}','${IDS.ownerC}',clock_timestamp()+interval '1 hour');
insert into casework.cases(
  id,external_project_id,title,case_status,created_by,created_at,updated_at
) values
  ('${IDS.caseA}','DATA-R1-TASK4-A','Sanitized Task4 case A','active','${IDS.owner}',clock_timestamp(),clock_timestamp()),
  ('${IDS.caseB}','DATA-R1-TASK4-B','Sanitized Task4 concurrency case','active','${IDS.ownerB}',clock_timestamp(),clock_timestamp()),
  ('${IDS.caseC}','DATA-R1-TASK4-C','Sanitized Task4 Storage case','active','${IDS.ownerC}',clock_timestamp(),clock_timestamp());
insert into casework.case_members(case_id,user_id,role,added_by,added_at) values
  ('${IDS.caseA}','${IDS.owner}','owner','${IDS.owner}',clock_timestamp()),
  ('${IDS.caseA}','${IDS.vendor}','pro','${IDS.owner}',clock_timestamp()),
  ('${IDS.caseA}','${IDS.drs}','pcm','${IDS.owner}',clock_timestamp()),
  ('${IDS.caseB}','${IDS.ownerB}','owner','${IDS.ownerB}',clock_timestamp()),
  ('${IDS.caseC}','${IDS.ownerC}','owner','${IDS.ownerC}',clock_timestamp());
insert into casework.drs_three_role_case_authority(
  case_id,authority_version,next_actor,updated_by,authority_basis
) values
  ('${IDS.caseA}',4,'drs','${IDS.owner}','task4-disposable'),
  ('${IDS.caseB}',4,'owner','${IDS.ownerB}','task4-disposable'),
  ('${IDS.caseC}',4,'owner','${IDS.ownerC}','task4-disposable');
insert into casework.drs_three_role_memberships(
  membership_id,case_id,user_id,role,status,valid_from,invited_by,
  authority_source,authority_version
) values
  ('${IDS.ownerMembership}','${IDS.caseA}','${IDS.owner}','owner','active',clock_timestamp()-interval '1 minute','${IDS.owner}','case_creation',4),
  ('${IDS.vendorMembership}','${IDS.caseA}','${IDS.vendor}','vendor','active',clock_timestamp()-interval '1 minute','${IDS.owner}','case_invitation',4),
  ('${IDS.drsMembership}','${IDS.caseA}','${IDS.drs}','drs','active',clock_timestamp()-interval '1 minute','${IDS.owner}','drs_assignment',4),
  ('${IDS.ownerBMembership}','${IDS.caseB}','${IDS.ownerB}','owner','active',clock_timestamp()-interval '1 minute','${IDS.ownerB}','case_creation',4),
  ('${IDS.ownerCMembership}','${IDS.caseC}','${IDS.ownerC}','owner','active',clock_timestamp()-interval '1 minute','${IDS.ownerC}','case_creation',4);
insert into casework.case_events(
  case_id,event_type,actor_user_id,idempotency_key,payload_sha256,payload
) values
  ('${IDS.caseA}','CASE_CREATED','${IDS.owner}','task4-case-a-genesis','${"7".repeat(64)}','{"fixture":"task4-a"}'::jsonb),
  ('${IDS.caseB}','CASE_CREATED','${IDS.ownerB}','task4-case-b-genesis','${"8".repeat(64)}','{"fixture":"task4-b"}'::jsonb),
  ('${IDS.caseC}','CASE_CREATED','${IDS.ownerC}','task4-case-c-genesis','${"9".repeat(64)}','{"fixture":"task4-c"}'::jsonb);
commit;
`;
}

function bindActorsSql() {
  return Object.values(actors).map((actor) => `
set role service_role;
select public.drs_three_role_auth_session_bind_v1(
  '${actor.user}','${actor.session}','${actor.membership}',clock_timestamp()
);
select public.drs_three_role_server_session_issue_v1(
  '${actor.technical}','${actor.digest}','${actor.user}','${actor.session}',
  clock_timestamp(),clock_timestamp()+interval '30 minutes'
);
reset role;
`).join("\n");
}

function applyTask4SchemaAndFixtures() {
  applySql(loadMigration("20260826190000_drs_document_storage_w1.sql"));
  applySql(baseFixtureSql());
  applySql(loadMigration("20260901192440_drs_case_event_ledger_r1.sql"));
  applySql(
    loadMigration("20260901214241_drs_document_formalize_domain_command_r1.sql"),
  );
  const task4Migration = readdirSync(migrationsUrl)
    .filter((name) => migrationPattern.test(name));
  assert.equal(task4Migration.length, 1);
  applySql(readFileSync(new URL(task4Migration[0], migrationsUrl), "utf8"));
  applySql(bindActorsSql());
  applySql(
    `begin;${Object.values(documents).map(documentFixtureSql).join("\n")}commit;`,
  );
  applySql("notify pgrst, 'reload schema';");
}

function effects(caseId) {
  return jsonResult(psql(`select pg_catalog.jsonb_build_object(
    'commands',(select count(*) from casework.case_commands where case_id='${caseId}'),
    'events',(select count(*) from casework.case_events where case_id='${caseId}'),
    'versions',(select count(*) from casework.document_versions where case_id='${caseId}'),
    'sources',(select count(*) from casework.document_version_sources where case_id='${caseId}'),
    'receipts',(select count(*) from casework.document_operation_receipts where case_id='${caseId}'),
    'readProjections',(select count(*) from casework.document_audience_read_projections where case_id='${caseId}'),
    'caseVersion',(select case_version from casework.case_state_projection where case_id='${caseId}'),
    'currentState',(select current_state from casework.case_state_projection where case_id='${caseId}'),
    'nextActor',(select next_actor from casework.case_state_projection where case_id='${caseId}'),
    'authority',(select authority_version::text||':'||next_actor from casework.drs_three_role_case_authority where case_id='${caseId}')
  );`).stdout);
}

function runStorageRunner({ anonKey, serviceKey, expectedVersion }) {
  docker([
    "run",
    "--rm",
    "--pull",
    "never",
    "--name",
    RESOURCES.runner,
    "--network",
    RESOURCES.network,
    ...labelArgs(),
    "--read-only",
    "--tmpfs",
    "/tmp:rw,noexec,nosuid,nodev,size=64m",
    "--tmpfs",
    "/deno-dir:rw,noexec,nosuid,nodev,size=256m",
    "--cap-drop",
    "ALL",
    "--security-opt",
    "no-new-privileges",
    "--mount",
    `type=bind,src=${worktreePath},dst=/workspace,readonly`,
    "-e",
    "DENO_DIR=/deno-dir",
    "-e",
    "DRS_TASK4_REAL_STORAGE=YES",
    "-e",
    "DRS_TASK4_STORAGE_URL=http://storage:5000",
    "-e",
    "DRS_TASK4_REST_URL=http://rest:3000",
    "-e",
    `DRS_TASK4_SERVICE_ROLE_KEY=${serviceKey}`,
    "-e",
    `DRS_TASK4_ANON_KEY=${anonKey}`,
    "-e",
    `DRS_TASK4_STORAGE_CASE_ID=${IDS.caseC}`,
    "-e",
    `DRS_TASK4_STORAGE_USER_ID=${IDS.ownerC}`,
    "-e",
    `DRS_TASK4_STORAGE_SESSION_ID=${IDS.ownerCSession}`,
    "-e",
    `DRS_TASK4_STORAGE_MEMBERSHIP_ID=${IDS.ownerCMembership}`,
    "-e",
    `DRS_TASK4_STORAGE_EXPECTED_VERSION=${expectedVersion}`,
    "-e",
    `DRS_TASK4_STORAGE_INTENT_REF=${documents.storage.intentRef}`,
    "-e",
    `DRS_TASK4_STORAGE_COMMAND_ID=${documents.storage.commandId}`,
    "-e",
    `DRS_TASK4_STORAGE_IDEMPOTENCY_KEY=${documents.storage.key}`,
    "-e",
    `DRS_TASK4_STORAGE_INTAKE_KEY=${documents.storage.intakeKey}`,
    "-e",
    `DRS_TASK4_STORAGE_RECORDS_KEY=${documents.storage.recordsKey}`,
    IMAGES.deno,
    "deno",
    "test",
    "--no-lock",
    "--allow-read=/workspace",
    "--allow-net=storage:5000,rest:3000",
    "--allow-env=DRS_TASK4_REAL_STORAGE,DRS_TASK4_STORAGE_URL,DRS_TASK4_REST_URL,DRS_TASK4_SERVICE_ROLE_KEY,DRS_TASK4_ANON_KEY,DRS_TASK4_STORAGE_CASE_ID,DRS_TASK4_STORAGE_USER_ID,DRS_TASK4_STORAGE_SESSION_ID,DRS_TASK4_STORAGE_MEMBERSHIP_ID,DRS_TASK4_STORAGE_EXPECTED_VERSION,DRS_TASK4_STORAGE_INTENT_REF,DRS_TASK4_STORAGE_COMMAND_ID,DRS_TASK4_STORAGE_IDEMPOTENCY_KEY,DRS_TASK4_STORAGE_INTAKE_KEY,DRS_TASK4_STORAGE_RECORDS_KEY",
    "/workspace/supabase/tests/drs_document_formalize_runtime_r1_real_storage.test.mjs",
  ]);
}

function rlsRows({ actor, view, caseId, mutation = "" }) {
  assert.ok([
    "public.drs_owner_document_read_v1",
    "public.drs_vendor_document_read_v1",
    "public.drs_specialist_document_read_v1",
  ].includes(view));
  const claims = JSON.stringify({
    sub: actor.user,
    session_id: actor.session,
    role: "authenticated",
  });
  const output = psql(`begin;
${mutation}
set local role authenticated;
select set_config('request.jwt.claim.sub','${actor.user}',true);
select set_config('request.jwt.claims',${sqlLiteral(claims)},true);
select pg_catalog.coalesce(
  pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
    'documentRef',document_ref,'sha256',sha256
  ) order by document_ref),
  '[]'::jsonb
) from ${view} where case_id='${caseId}';
rollback;`).stdout;
  return jsonResult(output);
}

test("Task4 binds exactly one CLI-created document runtime migration after Task3", () => {
  const matches = readdirSync(migrationsUrl)
    .map((name) => ({ name, match: name.match(migrationPattern) }))
    .filter((entry) => entry.match !== null);

  assert.equal(matches.length, 1, "one exact Task4 runtime migration is required");
  assert.ok(
    matches[0].match[1] > "20260901214241",
    "Task4 migration must be a direct successor to the accepted Task3 migration",
  );
});

test("Task4 migration remains resolvable with an empty security-definer search path", () => {
  const [migration] = readdirSync(migrationsUrl)
    .filter((name) => migrationPattern.test(name));
  const source = readFileSync(new URL(migration, migrationsUrl), "utf8");

  assert.doesNotMatch(source, /\|\|\s*chr\(10\)/u);
  assert.doesNotMatch(source, /pg_catalog\.coalesce\(/u);
  assert.match(source, /\|\|\s*pg_catalog\.chr\(10\)/u);
  assert.match(
    source,
    /from pg_catalog\.unnest\(array\['owner', 'vendor', 'drs'\]\)\s+as audience\(role\)/u,
  );
  assert.match(
    source,
    /v_intent\.planned_version_id,\s*audience\.role,\s*v_receipt_id/u,
  );
});

test("Task4 harness is bound to the exact isolated disposable topology", () => {
  const source = readFileSync(new URL(import.meta.url), "utf8");
  for (const value of [...Object.values(IMAGES), ...Object.values(RESOURCES)]) {
    assert.equal(source.includes(value), true, value);
  }
  for (const value of Object.values(LABELS)) {
    assert.equal(source.includes(value), true, value);
  }
  assert.equal(source.includes(WRONG_POSTGREST_DIGEST), true);
  for (
    const forbidden of [
      ["--", "publish"].join(""),
      ["--", "privileged"].join(""),
      ["docker", ".sock"].join(""),
    ]
  ) assert.equal(source.includes(`"${forbidden}"`), false, forbidden);
  assert.match(source, /"--internal"/u);
  assert.match(source, /"--read-only"/u);
  assert.match(source, /"--cap-drop"[\s\S]*?"ALL"/u);
  assert.match(source, /no-new-privileges/u);
  assert.match(source, /type=bind[\s\S]*?dst=\/workspace[\s\S]*?readonly/u);
});

test(
  "exact disposable PostgreSQL: fresh finalize and replay are one atomic domain effect",
  {
    skip: harnessAvailable
      ? false
      : "HOLD_TASK4_EXACT_DISPOSABLE_TOPOLOGY_NOT_CONFIRMED",
    timeout: 300_000,
  },
  async () => {
    const head = spawnSync("git", ["rev-parse", "HEAD"], {
      cwd: rootPath,
      encoding: "utf8",
      windowsHide: true,
    });
    assert.equal(head.status, 0, head.stderr);
    assert.equal(head.stdout.trim(), candidate, "candidate label must bind HEAD");
    assert.equal(existsSync(rootPath), true);
    docker(["version"]);
    for (const image of Object.values(IMAGES)) {
      docker(["image", "inspect", image]);
    }
    const wrongDigest = docker([
      "image",
      "ls",
      "--digests",
      "--no-trunc",
      "--format",
      "{{.Repository}}@{{.Digest}}",
    ]).stdout;
    assert.equal(wrongDigest.includes(WRONG_POSTGREST_DIGEST), false);

    const anonKey = jwt("anon");
    const serviceKey = jwt("service_role");
    let primaryFailure = null;
    try {
      createExactDatabaseTopology();
      await waitForPostgres();
      applyAcceptedPreStorageSchema();
      startDataServices(anonKey, serviceKey);
      await waitForStorageApi();
      applyTask4SchemaAndFixtures();

      const expectedVersion = Number(
        psql(
          `select case_version from casework.case_state_projection where case_id='${IDS.caseA}';`,
        ).stdout,
      );
      assert.equal(Number.isSafeInteger(expectedVersion), true);
      const beforeAuthorize = effects(IDS.caseA);
      const authorized = jsonResult(
        psql(finalizeSql(documents.primary, expectedVersion, "AUTHORIZE")).stdout,
      );
      assert.equal(authorized.state, "VALIDATION_REQUIRED");
      assert.equal(authorized.newEffects, 0);
      assert.equal(authorized.intake_bucket, "drs-case-intake-private");
      assert.equal(authorized.intake_object_key, documents.primary.intakeKey);
      assert.deepEqual(effects(IDS.caseA), beforeAuthorize);

      const applied = jsonResult(
        psql(finalizeSql(documents.primary, expectedVersion)).stdout,
      );
      assert.equal(applied.state, "APPLIED");
      assert.equal(applied.newEffects, 1);
      const afterApplied = effects(IDS.caseA);
      assert.equal(afterApplied.commands, beforeAuthorize.commands + 1);
      assert.equal(afterApplied.events, beforeAuthorize.events + 1);
      assert.equal(afterApplied.versions, beforeAuthorize.versions + 1);
      assert.equal(afterApplied.sources, beforeAuthorize.sources + 1);
      assert.equal(afterApplied.receipts, beforeAuthorize.receipts + 1);
      assert.equal(afterApplied.readProjections, 3);
      assert.equal(afterApplied.caseVersion, beforeAuthorize.caseVersion + 1);
      assert.equal(afterApplied.currentState, beforeAuthorize.currentState);
      assert.equal(afterApplied.nextActor, beforeAuthorize.nextActor);
      assert.equal(afterApplied.authority, beforeAuthorize.authority);

      const replayed = jsonResult(
        psql(finalizeSql(documents.primary, expectedVersion)).stdout,
      );
      assert.equal(replayed.state, "REPLAYED");
      assert.equal(replayed.newEffects, 0);
      assert.deepEqual(effects(IDS.caseA), afterApplied);
      assert.deepEqual(replayed.receipt, applied.receipt);
      assert.equal(replayed.receiptCanonical, applied.receiptCanonical);
      assert.equal(replayed.receiptSha256, applied.receiptSha256);

      const legacyBefore = effects(IDS.caseA);
      const legacyClosed = jsonResult(psql(`begin;
set local role service_role;
select public.server_document_operation_v1(
  '${IDS.owner}','${IDS.caseA}',
  'drs-specialist:${IDS.owner}','${IDS.ownerMembership}',4,
  'FINALIZE_UPLOAD','${documents.primary.intentRef}',
  'task4-legacy-finalize-closed','${"0".repeat(64)}'
);
commit;`).stdout);
      assert.equal(legacyClosed.state, "DOCUMENT_FINALIZE_RUNTIME_V2_REQUIRED");
      assert.deepEqual(effects(IDS.caseA), legacyBefore);

      const beforeRollback = effects(IDS.caseB);
      const concurrentVersion = beforeRollback.caseVersion;
      const rolledBack = jsonResult(psql(
        finalizeSql(documents.concurrent, concurrentVersion)
          .replace(/commit;$/u, "rollback;"),
      ).stdout);
      assert.equal(rolledBack.state, "APPLIED");
      assert.deepEqual(effects(IDS.caseB), beforeRollback);

      const [concurrentA, concurrentB] = await Promise.all([
        psqlAsync(finalizeSql(documents.concurrent, concurrentVersion)),
        psqlAsync(finalizeSql(documents.concurrent, concurrentVersion)),
      ]);
      const concurrentResults = [
        jsonResult(concurrentA),
        jsonResult(concurrentB),
      ];
      assert.deepEqual(
        concurrentResults.map(({ state }) => state).sort(),
        ["APPLIED", "REPLAYED"],
      );
      assert.deepEqual(
        concurrentResults.map(({ newEffects }) => newEffects).sort(),
        [0, 1],
      );
      const afterConcurrency = effects(IDS.caseB);
      assert.equal(afterConcurrency.commands, beforeRollback.commands + 1);
      assert.equal(afterConcurrency.events, beforeRollback.events + 1);
      assert.equal(afterConcurrency.versions, beforeRollback.versions + 1);
      assert.equal(afterConcurrency.sources, beforeRollback.sources + 1);
      assert.equal(afterConcurrency.receipts, beforeRollback.receipts + 1);
      assert.equal(afterConcurrency.readProjections, 3);
      assert.equal(afterConcurrency.caseVersion, beforeRollback.caseVersion + 1);
      assert.equal(afterConcurrency.currentState, beforeRollback.currentState);
      assert.equal(afterConcurrency.nextActor, beforeRollback.nextActor);
      assert.equal(afterConcurrency.authority, beforeRollback.authority);

      const expectedProjection = [{
        documentRef: documents.primary.documentRef,
        sha256: PDF_SHA256,
      }];
      assert.deepEqual(rlsRows({
        actor: actors.owner,
        view: "public.drs_owner_document_read_v1",
        caseId: IDS.caseA,
      }), expectedProjection);
      assert.deepEqual(rlsRows({
        actor: actors.vendor,
        view: "public.drs_vendor_document_read_v1",
        caseId: IDS.caseA,
      }), expectedProjection);
      assert.deepEqual(rlsRows({
        actor: actors.drs,
        view: "public.drs_specialist_document_read_v1",
        caseId: IDS.caseA,
      }), expectedProjection);
      assert.deepEqual(rlsRows({
        actor: actors.ownerB,
        view: "public.drs_owner_document_read_v1",
        caseId: IDS.caseA,
      }), []);
      assert.deepEqual(rlsRows({
        actor: actors.owner,
        view: "public.drs_vendor_document_read_v1",
        caseId: IDS.caseA,
      }), []);
      assert.deepEqual(rlsRows({
        actor: actors.owner,
        view: "public.drs_owner_document_read_v1",
        caseId: IDS.caseA,
        mutation: `update casework.drs_three_role_memberships
          set status='revoked',revoked_at=clock_timestamp()
          where membership_id='${IDS.ownerMembership}';`,
      }), []);
      assert.deepEqual(rlsRows({
        actor: actors.owner,
        view: "public.drs_owner_document_read_v1",
        caseId: IDS.caseA,
        mutation: `update auth.sessions set not_after=clock_timestamp()-interval '1 second'
          where id='${IDS.ownerSession}';`,
      }), []);
      assert.deepEqual(rlsRows({
        actor: actors.owner,
        view: "public.drs_owner_document_read_v1",
        caseId: IDS.caseA,
        mutation: `update casework.drs_three_role_case_authority
          set authority_version=5 where case_id='${IDS.caseA}';`,
      }), []);
      assert.deepEqual(rlsRows({
        actor: actors.owner,
        view: "public.drs_owner_document_read_v1",
        caseId: IDS.caseA,
        mutation: `update integration.drs_three_role_server_sessions
          set revoked_at=clock_timestamp()
          where auth_session_id='${IDS.ownerSession}';`,
      }), []);

      const privateDenied = psql(`\\set VERBOSITY verbose
begin;
set local role service_role;
select drs_document_storage_private.finalize_domain_command_v1(
  null::text,null::uuid,null::uuid,null::uuid,null::uuid,null::text,
  null::bigint,null::text,null::text,null::text,null::uuid,null::bigint,
  null::text,null::text,null::text,null::text,null::text,null::bigint,null::text
);
rollback;`, "postgres", true);
      assert.notEqual(privateDenied.status, 0);
      assert.match(privateDenied.stderr, /42501/u);

      const immutableDenied = psql(`begin;
update casework.document_audience_read_projections set sha256='${"f".repeat(64)}'
where case_id='${IDS.caseA}';
rollback;`, "postgres", true);
      assert.notEqual(immutableDenied.status, 0);
      assert.match(
        immutableDenied.stderr,
        /DOCUMENT_AUDIENCE_PROJECTION_IMMUTABLE/u,
      );

      const identity = jsonResult(psql(`select pg_catalog.jsonb_build_object(
        'task3_private_count',(
          select count(*) from pg_proc p where p.oid in (
            to_regprocedure('drs_case_command_private.lock_case_command_v1(uuid)'),
            to_regprocedure('drs_case_command_private.apply_document_version_formalized_v1(uuid,uuid,uuid,uuid,text,bigint,uuid,text,bigint,text,jsonb,uuid,uuid,uuid,uuid)')
          ) and pg_get_userbyid(p.proowner)='postgres' and p.prosecdef
            and p.proconfig=array['search_path='||chr(34)||chr(34)]
            and not has_function_privilege('service_role',p.oid,'EXECUTE')
        ),
        'runtime_private_locked',(
          select pg_get_userbyid(p.proowner)='postgres' and p.prosecdef
            and p.proconfig=array['search_path='||chr(34)||chr(34)]
            and not has_function_privilege('service_role',p.oid,'EXECUTE')
          from pg_proc p where p.oid=to_regprocedure(
            'drs_document_storage_private.finalize_domain_command_v1(text,uuid,uuid,uuid,uuid,text,bigint,text,text,text,uuid,bigint,text,text,text,text,text,bigint,text)'
          )
        ),
        'public_service_only',(
          select pg_get_userbyid(p.proowner)='postgres' and p.prosecdef
            and p.proconfig=array['search_path='||chr(34)||chr(34)]
            and has_function_privilege('service_role',p.oid,'EXECUTE')
            and not has_function_privilege('anon',p.oid,'EXECUTE')
            and not has_function_privilege('authenticated',p.oid,'EXECUTE')
          from pg_proc p where p.oid=to_regprocedure(
            'public.server_document_finalize_domain_command_v1(text,uuid,uuid,uuid,uuid,text,bigint,text,text,text,uuid,bigint,text,text,text,text,text,bigint,text)'
          )
        ),
        'projection_rls',(
          select c.relrowsecurity and c.relforcerowsecurity
          from pg_class c
          where c.oid='casework.document_audience_read_projections'::regclass
        ),
        'security_invoker_views',(
          select count(*) from pg_class c
          join pg_namespace n on n.oid=c.relnamespace
          where n.nspname='public'
            and c.relname in (
              'drs_owner_document_read_v1','drs_vendor_document_read_v1',
              'drs_specialist_document_read_v1'
            )
            and c.reloptions @> array['security_invoker=true']
        ),
        'forbidden_view_columns',(
          select count(*) from information_schema.columns
          where table_schema='public'
            and table_name in (
              'drs_owner_document_read_v1','drs_vendor_document_read_v1',
              'drs_specialist_document_read_v1'
            )
            and column_name in (
              'bucket','bucket_id','object','object_key','document_id',
              'version_id','receipt_id','created_by','actor_user_id'
            )
        ),
        'event_binding',(
          select event_type='DOCUMENT_VERSION_FORMALIZED'
            and command_type='FORMALIZE_DOCUMENT_VERSION'
            and journey_state_impact='NONE'
            and document_id='${documents.primary.documentId}'::uuid
            and document_version_id='${documents.primary.versionId}'::uuid
          from casework.case_events
          where case_id='${IDS.caseA}'
            and command_id='${documents.primary.commandId}'::uuid
        ),
        'legacy_impl_service_execute',(
          select has_function_privilege('service_role',p.oid,'EXECUTE')
          from pg_proc p where p.oid=to_regprocedure(
            'public.server_document_operation_legacy_impl_v1(uuid,uuid,text,uuid,bigint,text,text,text,text)'
          )
        ),
        'catalog22',(
          select count(*) from casework.case_transition_catalog
          where catalog_hash='${CATALOG_SHA256}'
            and schema_version='${CATALOG_SCHEMA_VERSION}'
        )
      );`).stdout);
      assert.equal(identity.task3_private_count, 2);
      assert.equal(identity.runtime_private_locked, true);
      assert.equal(identity.public_service_only, true);
      assert.equal(identity.projection_rls, true);
      assert.equal(identity.security_invoker_views, 3);
      assert.equal(identity.forbidden_view_columns, 0);
      assert.equal(identity.event_binding, true);
      assert.equal(identity.legacy_impl_service_execute, false);
      assert.equal(identity.catalog22, 22);

      const storageExpectedVersion = Number(psql(
        `select case_version from casework.case_state_projection where case_id='${IDS.caseC}';`,
      ).stdout);
      assert.equal(Number.isSafeInteger(storageExpectedVersion), true);
      runStorageRunner({
        anonKey,
        serviceKey,
        expectedVersion: storageExpectedVersion,
      });
      const storageEffects = effects(IDS.caseC);
      assert.equal(storageEffects.commands, 1);
      assert.equal(storageEffects.versions, 1);
      assert.equal(storageEffects.sources, 1);
      assert.equal(storageEffects.receipts, 1);
      assert.equal(storageEffects.readProjections, 3);
    } catch (error) {
      primaryFailure = error;
    } finally {
      cleanupExactTopology();
    }
    assertExactTopologyAbsent();
    if (primaryFailure) throw primaryFailure;
  },
);
