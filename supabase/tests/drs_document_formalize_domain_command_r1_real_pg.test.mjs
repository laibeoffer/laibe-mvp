import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import {
  existsSync,
  readFileSync,
  readdirSync,
  statSync,
} from "node:fs";
import process from "node:process";
import test from "node:test";

const rootUrl = new URL("../", import.meta.url);
const migrationsUrl = new URL("migrations/", rootUrl);
const acceptedTask3TestUrl = new URL(
  "tests/drs_case_event_ledger_r1_real_pg.test.mjs",
  rootUrl,
);
const bridgeUrl = new URL(
  "migrations/20260831182641_drs_remote_baseline_bridge_w2.sql",
  rootUrl,
);
const authUrl = new URL(
  "migrations/20260901174523_drs_three_role_case_authority_r1.sql",
  rootUrl,
);
const documentUrl = new URL(
  "migrations/20260826190000_drs_document_storage_w1.sql",
  rootUrl,
);
const workspaceGrantUrl = new URL(
  "migrations/20260826183000_drs_workspace_grant_authority_v2.sql",
  rootUrl,
);
const task3Url = new URL(
  "migrations/20260901192440_drs_case_event_ledger_r1.sql",
  rootUrl,
);

const EXPECTED_SHA256 = Object.freeze({
  bridge: "e05e7facb968bcb07baa89494564197f5018d6e94dac787f5898a87aa5479f96",
  auth: "bddf258c51042be8421682c6e9d783bc0f374a6ecf973678c6badca104525b07",
  workspaceGrant: "8daad226340bd1403183c5083494dbb4dba95159336c3b69a0bee3496115294e",
  document: "684d9ff35f82f9483fc4c9bb87ad09b27ae20058a3d3008992f1f540990d7f3f",
  task3: "540ab3c762032cad1e18d0b5e939c4bca1d9db5c25781402eebbdb4874d4ba7c",
  docker: "0f97bc1111f59d859766ba938691ee07ed4e58d5fdaeb6f4dfb10a5ef5394753",
});
const POSTGRES_IMAGE =
  "sha256:28f0e16a019e648089fc1a6d333549a55548f6019c15ae4bd7cd58b989027518";
const DOMAIN_MIGRATION_PATTERN =
  /^\d{14}_drs_document_formalize_domain_command_r1\.sql$/u;
const CATALOG_SHA256 =
  "804bd327dcb67788b74aff9aabc7c4de0fda1fe2b1be0e8fe37a83445117865e";
const CATALOG_SCHEMA_VERSION =
  "laibe.drs.a4-transition-catalog.pre-ready.v1";

const dockerPath = process.env.DRS_DOCUMENT_DOMAIN_R1_DOCKER ?? "";
const harnessConfirmed =
  process.env.DRS_DOCUMENT_DOMAIN_R1_DISPOSABLE_CONFIRMED === "YES";
const harnessAvailable = harnessConfirmed && dockerPath.length > 0 &&
  existsSync(dockerPath);

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function base64(value) {
  return Buffer.from(value, "utf8").toString("base64");
}

function sqlLiteral(value) {
  return `'${String(value).replaceAll("'", "''")}'`;
}

function shellSqlLiteral(value) {
  return sqlLiteral(value).replaceAll('"', '\\"');
}

function extractRawSql(source, name) {
  const pattern = new RegExp(
    "const " + name + " = String\\.raw`([\\s\\S]*?)`;",
    "u",
  );
  const match = source.match(pattern);
  assert.ok(match, `accepted Task3 harness constant missing: ${name}`);
  return match[1];
}

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
  drsCSession: "65555555-5555-4555-8555-555555555555",
  ownerMembership: "71111111-1111-4111-8111-111111111111",
  vendorMembership: "72222222-2222-4222-8222-222222222222",
  drsMembership: "73333333-3333-4333-8333-333333333333",
  ownerBMembership: "74444444-4444-4444-8444-444444444444",
  drsCMembership: "75555555-5555-4555-8555-555555555555",
  ownerTechnical: "81111111-1111-4111-8111-111111111111",
  vendorTechnical: "82222222-2222-4222-8222-222222222222",
  drsTechnical: "83333333-3333-4333-8333-333333333333",
  ownerBTechnical: "84444444-4444-4444-8444-444444444444",
  drsCTechnical: "85555555-5555-4555-8555-555555555555",
  legacyDrsCase: "91111111-1111-4111-8111-111111111111",
  legacySpecialist: "92222222-2222-4222-8222-222222222222",
  legacyAssignment: "93333333-3333-4333-8333-333333333333",
  legacyIdentity: "94444444-4444-4444-8444-444444444444",
  legacyBinding: "95555555-5555-4555-8555-555555555555",
});

const actors = Object.freeze({
  owner: Object.freeze({
    user: IDS.owner,
    authSession: IDS.ownerSession,
    membership: IDS.ownerMembership,
    role: "owner",
    technical: IDS.ownerTechnical,
    digest: "A".repeat(43),
  }),
  vendor: Object.freeze({
    user: IDS.vendor,
    authSession: IDS.vendorSession,
    membership: IDS.vendorMembership,
    role: "vendor",
    technical: IDS.vendorTechnical,
    digest: "B".repeat(43),
  }),
  drs: Object.freeze({
    user: IDS.drs,
    authSession: IDS.drsSession,
    membership: IDS.drsMembership,
    role: "drs",
    technical: IDS.drsTechnical,
    digest: "C".repeat(43),
  }),
  ownerB: Object.freeze({
    user: IDS.ownerB,
    authSession: IDS.ownerBSession,
    membership: IDS.ownerBMembership,
    role: "owner",
    technical: IDS.ownerBTechnical,
    digest: "D".repeat(43),
  }),
  drsC: Object.freeze({
    user: IDS.drs,
    authSession: IDS.drsCSession,
    membership: IDS.drsCMembership,
    role: "drs",
    technical: IDS.drsCTechnical,
    digest: "E".repeat(43),
  }),
});

function formalFixture({
  suffix,
  caseId,
  actor,
  sourceRole,
  kind = "drs_review",
  payloadChar,
  requestChar,
  current = true,
}) {
  const number = suffix.toString().padStart(12, "0");
  const documentId = `d${number.slice(0, 7)}-0000-4000-8000-${number}`;
  const versionId = `e${number.slice(0, 7)}-0000-4000-8000-${number}`;
  const intentId = `f${number.slice(0, 7)}-0000-4000-8000-${number}`;
  const receiptId = `a${number.slice(0, 7)}-0000-4000-8000-${number}`;
  const documentRef = `doc_formalref${number}`;
  const versionRef = `dvr_formalref${number}`;
  const intentRef = `int_formalref${number}`;
  const receiptRef = `rcp_formalref${number}`;
  const key = `formalize-domain-key-${number}`;
  const payload = payloadChar.repeat(64);
  const requestPayload = requestChar.repeat(64);
  const recordsObjectKey =
    `cases/${caseId}/documents/${documentId}/versions/${versionId}/source.pdf`;
  const intakeObjectKey = `intents/${intentId}/${receiptId}.pdf`;
  return Object.freeze({
    suffix,
    caseId,
    actor,
    sourceRole,
    kind,
    documentId,
    versionId,
    intentId,
    receiptId,
    documentRef,
    versionRef,
    intentRef,
    receiptRef,
    key,
    payload,
    requestPayload,
    recordsObjectKey,
    intakeObjectKey,
    current,
  });
}

const docs = Object.freeze({
  owner: formalFixture({
    suffix: 1,
    caseId: IDS.caseA,
    actor: actors.owner,
    sourceRole: "OWNER",
    payloadChar: "1",
    requestChar: "a",
  }),
  vendor: formalFixture({
    suffix: 2,
    caseId: IDS.caseA,
    actor: actors.vendor,
    sourceRole: "VENDOR",
    payloadChar: "2",
    requestChar: "b",
  }),
  drs: formalFixture({
    suffix: 3,
    caseId: IDS.caseA,
    actor: actors.drs,
    sourceRole: "DRS",
    payloadChar: "3",
    requestChar: "c",
  }),
  conflict: formalFixture({
    suffix: 4,
    caseId: IDS.caseA,
    actor: actors.owner,
    sourceRole: "OWNER",
    payloadChar: "4",
    requestChar: "d",
    current: false,
  }),
  concurrent: formalFixture({
    suffix: 5,
    caseId: IDS.caseB,
    actor: actors.ownerB,
    sourceRole: "OWNER",
    payloadChar: "5",
    requestChar: "e",
  }),
  lockRace: formalFixture({
    suffix: 6,
    caseId: IDS.caseC,
    actor: actors.drsC,
    sourceRole: "DRS",
    payloadChar: "6",
    requestChar: "f",
  }),
});

function fixtureSql(document) {
  const currentVersion = document.current
    ? sqlLiteral(document.versionId)
    : "null";
  return `
insert into casework.documents(
  id,case_id,document_ref,document_kind,visibility,source_role,
  document_status,current_version_id,created_by
) values (
  '${document.documentId}','${document.caseId}','${document.documentRef}',
  '${document.kind}','PARTY_VISIBLE','${document.sourceRole}','ACTIVE',
  ${currentVersion},'${document.actor.user}'
);
insert into casework.document_versions(
  id,case_id,document_id,version_ref,version_no,created_by,sha256,size_bytes,
  detected_mime,validation_state,lifecycle_state,idempotency_key,payload_sha256
) values (
  '${document.versionId}','${document.caseId}','${document.documentId}',
  '${document.versionRef}',1,'${document.actor.user}','${document.payload}',128,
  'application/pdf','FORMAL','ACTIVE','${document.key}','${document.payload}'
);
insert into casework.document_version_sources(
  case_id,document_id,version_id,bucket_id,object_key,sha256,size_bytes,
  detected_mime,validation_state
) values (
  '${document.caseId}','${document.documentId}','${document.versionId}',
  'drs-case-records-private','${document.recordsObjectKey}',
  '${document.payload}',128,'application/pdf','CLEAN'
);
insert into casework.document_upload_intents(
  intent_id,intent_ref,case_id,document_id,planned_version_id,
  planned_version_ref,mode,document_kind,original_filename,declared_mime,
  declared_size_bytes,declared_sha256,intake_bucket,intake_object_key,
  records_bucket,records_object_key,intent_state,expected_payload_sha256,
  finalize_idempotency_key,finalize_request_payload_sha256,created_by,
  created_at,expires_at,finalized_at
) values (
  '${document.intentId}','${document.intentRef}','${document.caseId}',
  '${document.documentId}','${document.versionId}','${document.versionRef}',
  'NEW_DOCUMENT','drs_review','sanitized-${document.suffix}.pdf',
  'application/pdf',128,'${document.payload}','drs-case-intake-private',
  '${document.intakeObjectKey}','drs-case-records-private',
  '${document.recordsObjectKey}','FORMALIZED','${document.payload}',
  '${document.key}','${document.requestPayload}','${document.actor.user}',
  clock_timestamp()-interval '5 minutes',clock_timestamp()+interval '5 minutes',
  clock_timestamp()-interval '1 minute'
);
insert into casework.document_operation_receipts(
  id,receipt_ref,case_id,operation,receipt_state,actor_user_id,idempotency_key,
  payload_sha256,document_id,document_version_id
) values (
  '${document.receiptId}','${document.receiptRef}','${document.caseId}',
  'FINALIZE_UPLOAD','FORMAL_VERSION_CREATED','${document.actor.user}',
  '${document.key}','${document.payload}','${document.documentId}',
  '${document.versionId}'
);
`;
}

function evidence(document, overrides = {}) {
  return {
    uploadIntentRef: document.intentRef,
    documentRef: document.documentRef,
    documentVersionRef: document.versionRef,
    documentSha256: document.payload,
    documentOperationReceiptRef: document.receiptRef,
    recordsObjectKey: document.recordsObjectKey,
    finalizeRequestPayloadSha256: document.requestPayload,
    ...overrides,
  };
}

function domainSql(
  document,
  commandId,
  expectedVersion,
  evidenceValue = evidence(document),
  actor = document.actor,
  key = document.key,
  payload = document.payload,
) {
  return `select public.test_document_formalize_apply_v1(
    '${document.caseId}','${actor.user}','${actor.authSession}',
    '${actor.membership}','${actor.role}',4,'${commandId}',
    '${key}',${expectedVersion},'${payload}',
    ${shellSqlLiteral(JSON.stringify(evidenceValue))}::jsonb,
    '${document.intentId}','${document.documentId}','${document.versionId}',
    '${document.receiptId}'
  )`;
}

function commandId(n) {
  return `c${String(n).padStart(7, "0")}-0000-4000-8000-${String(n).padStart(12, "0")}`;
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
      `laibe-doc-domain-r1-${process.pid}`.slice(0, 63),
      "--label",
      "laibe.task=drs-document-formalize-domain-command-r1",
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

test("source contract is exact2-bound and preserves accepted predecessor bytes", () => {
  const migrationNames = readdirSync(migrationsUrl)
    .filter((name) => DOMAIN_MIGRATION_PATTERN.test(name));
  assert.ok(migrationNames.length <= 1, "at most one CLI-bound migration is allowed");
  assert.equal(sha256(readFileSync(bridgeUrl)), EXPECTED_SHA256.bridge);
  assert.equal(sha256(readFileSync(authUrl)), EXPECTED_SHA256.auth);
  assert.equal(
    sha256(readFileSync(workspaceGrantUrl)),
    EXPECTED_SHA256.workspaceGrant,
  );
  assert.equal(sha256(readFileSync(documentUrl)), EXPECTED_SHA256.document);
  assert.equal(sha256(readFileSync(task3Url)), EXPECTED_SHA256.task3);
  const source = readFileSync(new URL(import.meta.url), "utf8");
  for (const token of [
    "FORMALIZE_DOCUMENT_VERSION",
    "DOCUMENT_VERSION_FORMALIZED",
    "DOCUMENT_FINALIZE_NOT_AUTHORIZED",
    "DOCUMENT_FINALIZE_EVIDENCE_INVALID",
    "DOCUMENT_FINALIZE_CONFLICT",
    "TASK4_BRIDGE_REQUIRED=TRUE",
    "RED_LEGACY_FINALIZE_NULL_COMMAND_CONFIRMED",
    "REPLAYED",
    "42501",
  ]) assert.match(source, new RegExp(token, "u"));
  assert.doesNotMatch(
    source,
    new RegExp(["scan", "ReceiptRef"].join(""), "u"),
  );
});

test(
  "real disconnected PostgreSQL: document formalization becomes a replay-safe state-neutral domain command",
  {
    skip: harnessAvailable
      ? false
      : "HOLD_DOCUMENT_DOMAIN_R1_DISPOSABLE_PG_HARNESS_NOT_CONFIRMED",
    timeout: 180_000,
  },
  async () => {
    assert.equal(statSync(dockerPath).size, 43_247_024);
    assert.equal(sha256(readFileSync(dockerPath)), EXPECTED_SHA256.docker);

    const acceptedHarness = readFileSync(acceptedTask3TestUrl, "utf8");
    const baseline = extractRawSql(acceptedHarness, "BASELINE_SETUP_SQL");
    const storagePredecessor = extractRawSql(
      acceptedHarness,
      "STORAGE_PREDECESSOR_SQL",
    );
    const caseworkPredecessor = extractRawSql(
      acceptedHarness,
      "CASEWORK_PREDECESSOR_SQL",
    );
    const authHarness = extractRawSql(acceptedHarness, "AUTH_HARNESS_SQL");
    const bridge = readFileSync(bridgeUrl, "utf8");
    const auth = readFileSync(authUrl, "utf8");
    const workspaceGrant = readFileSync(workspaceGrantUrl, "utf8");
    const document = readFileSync(documentUrl, "utf8");
    const task3 = readFileSync(task3Url, "utf8");
    const migrationNames = readdirSync(migrationsUrl)
      .filter((name) => DOMAIN_MIGRATION_PATTERN.test(name));
    assert.ok(migrationNames.length <= 1);
    const domainMigration = migrationNames.length === 1
      ? readFileSync(new URL(migrationNames[0], migrationsUrl), "utf8")
      : "";

    const fixture = `
begin;
insert into auth.users(id) values
  ('${IDS.owner}'),('${IDS.vendor}'),('${IDS.drs}'),('${IDS.ownerB}'),
  ('${IDS.ownerC}');
insert into auth.sessions(id,user_id,not_after) values
  ('${IDS.ownerSession}','${IDS.owner}',clock_timestamp()+interval '1 hour'),
  ('${IDS.vendorSession}','${IDS.vendor}',clock_timestamp()+interval '1 hour'),
  ('${IDS.drsSession}','${IDS.drs}',clock_timestamp()+interval '1 hour'),
  ('${IDS.ownerBSession}','${IDS.ownerB}',clock_timestamp()+interval '1 hour'),
  ('${IDS.drsCSession}','${IDS.drs}',clock_timestamp()+interval '1 hour');
insert into casework.cases(
  id,external_project_id,title,case_status,created_by,created_at,updated_at
) values
  ('${IDS.caseA}','DATA-R1-DOC-A','Sanitized document case A','active','${IDS.owner}',clock_timestamp(),clock_timestamp()),
  ('${IDS.caseB}','DATA-R1-DOC-B','Sanitized document case B','active','${IDS.ownerB}',clock_timestamp(),clock_timestamp()),
  ('${IDS.caseC}','DATA-R1-DOC-C','Sanitized lock-order case','active','${IDS.ownerC}',clock_timestamp(),clock_timestamp());
insert into casework.case_members(case_id,user_id,role,added_by,added_at) values
  ('${IDS.caseA}','${IDS.owner}','owner','${IDS.owner}',clock_timestamp()),
  ('${IDS.caseA}','${IDS.vendor}','pro','${IDS.owner}',clock_timestamp()),
  ('${IDS.caseA}','${IDS.drs}','pcm','${IDS.owner}',clock_timestamp()),
  ('${IDS.caseB}','${IDS.ownerB}','owner','${IDS.ownerB}',clock_timestamp()),
  ('${IDS.caseC}','${IDS.ownerC}','owner','${IDS.ownerC}',clock_timestamp()),
  ('${IDS.caseC}','${IDS.drs}','pcm','${IDS.ownerC}',clock_timestamp());
insert into casework.drs_three_role_case_authority(
  case_id,authority_version,next_actor,updated_by,authority_basis
) values
  ('${IDS.caseA}',4,'drs','${IDS.owner}','sanitized-domain-fixture'),
  ('${IDS.caseB}',4,'owner','${IDS.ownerB}','sanitized-domain-fixture'),
  ('${IDS.caseC}',4,'drs','${IDS.ownerC}','sanitized-domain-fixture');
insert into casework.drs_three_role_memberships(
  membership_id,case_id,user_id,role,status,valid_from,invited_by,
  authority_source,authority_version
) values
  ('${IDS.ownerMembership}','${IDS.caseA}','${IDS.owner}','owner','active',clock_timestamp()-interval '1 minute','${IDS.owner}','case_creation',4),
  ('${IDS.vendorMembership}','${IDS.caseA}','${IDS.vendor}','vendor','active',clock_timestamp()-interval '1 minute','${IDS.owner}','case_invitation',4),
  ('${IDS.drsMembership}','${IDS.caseA}','${IDS.drs}','drs','active',clock_timestamp()-interval '1 minute','${IDS.owner}','drs_assignment',4),
  ('${IDS.ownerBMembership}','${IDS.caseB}','${IDS.ownerB}','owner','active',clock_timestamp()-interval '1 minute','${IDS.ownerB}','case_creation',4),
  ('${IDS.drsCMembership}','${IDS.caseC}','${IDS.drs}','drs','active',clock_timestamp()-interval '1 minute','${IDS.ownerC}','drs_assignment',4);
insert into casework.case_events(
  case_id,event_type,actor_user_id,idempotency_key,payload_sha256,payload
) values
  ('${IDS.caseA}','CASE_CREATED','${IDS.owner}','domain-case-a-genesis','${"7".repeat(64)}','{"fixture":"genesis-a"}'::jsonb),
  ('${IDS.caseB}','CASE_CREATED','${IDS.ownerB}','domain-case-b-genesis','${"8".repeat(64)}','{"fixture":"genesis-b"}'::jsonb),
  ('${IDS.caseC}','CASE_CREATED','${IDS.ownerC}','domain-case-c-genesis','${"9".repeat(64)}','{"fixture":"genesis-c"}'::jsonb);
insert into public.drs_cases(case_id,case_number,owner_id,case_state)
values ('${IDS.legacyDrsCase}','DOMAIN-LEGACY-A','${IDS.owner}','ACTIVE_REVIEW');
insert into public.drs_specialists(specialist_id,display_name,authority_state)
values ('${IDS.legacySpecialist}','Sanitized DRS specialist','ACTIVE');
insert into public.drs_case_specialist_assignments(
  assignment_id,case_id,specialist_id,assigned_by,valid_from,valid_until
) values (
  '${IDS.legacyAssignment}','${IDS.legacyDrsCase}','${IDS.legacySpecialist}',
  '${IDS.owner}',clock_timestamp()-interval '1 hour',
  clock_timestamp()+interval '1 day'
);
insert into integration.drs_case_identity_bindings(
  case_identity_binding_id,drs_case_id,casework_case_id,mapping_status,
  valid_from,valid_until
) values (
  '${IDS.legacyIdentity}','${IDS.legacyDrsCase}','${IDS.caseA}','active',
  clock_timestamp()-interval '1 hour',clock_timestamp()+interval '1 day'
);
insert into integration.drs_auth_specialist_bindings(
  binding_id,authenticated_user_id,specialist_id,selected_assignment_id,
  authorization_subject,binding_status,valid_from,valid_until
) values (
  '${IDS.legacyBinding}','${IDS.drs}','${IDS.legacySpecialist}',
  '${IDS.legacyAssignment}','drs-specialist:${IDS.legacySpecialist}','active',
  clock_timestamp()-interval '1 hour',clock_timestamp()+interval '1 day'
);
commit;
`;

    const legacy = formalFixture({
      suffix: 90,
      caseId: IDS.caseA,
      actor: actors.drs,
      sourceRole: "DRS",
      payloadChar: "9",
      requestChar: "0",
      current: false,
    });
    const quote = Object.freeze({
      documentId: "b0000000-0000-4000-8000-000000000001",
      versionId: "b0000000-0000-4000-8000-000000000002",
      documentRef: "doc_lockracequote000000000001",
      versionRef: "dvr_lockracequote000000000001",
      payload: "a".repeat(64),
      objectKey:
        `cases/${IDS.caseC}/documents/b0000000-0000-4000-8000-000000000001/versions/b0000000-0000-4000-8000-000000000002/source.pdf`,
    });
    const allFormalFixtures = Object.values(docs).map(fixtureSql).join("\n");
    const domainFixtures = `
begin;
${allFormalFixtures}
insert into casework.documents(
  id,case_id,document_ref,document_kind,visibility,source_role,
  document_status,current_version_id,created_by
) values (
  '${quote.documentId}','${IDS.caseC}','${quote.documentRef}','quote',
  'PARTY_VISIBLE','DRS','ACTIVE','${quote.versionId}','${IDS.drs}'
);
insert into casework.document_versions(
  id,case_id,document_id,version_ref,version_no,created_by,sha256,size_bytes,
  detected_mime,validation_state,lifecycle_state,idempotency_key,payload_sha256
) values (
  '${quote.versionId}','${IDS.caseC}','${quote.documentId}',
  '${quote.versionRef}',1,'${IDS.drs}','${quote.payload}',128,
  'application/pdf','FORMAL','ACTIVE','lock-race-quote-fixture','${quote.payload}'
);
insert into casework.document_version_sources(
  case_id,document_id,version_id,bucket_id,object_key,sha256,size_bytes,
  detected_mime,validation_state
) values (
  '${IDS.caseC}','${quote.documentId}','${quote.versionId}',
  'drs-case-records-private','${quote.objectKey}','${quote.payload}',128,
  'application/pdf','CLEAN'
);
commit;
`;

    const shell = [
      "set -euo pipefail",
      "trap 'echo DOCUMENT_DOMAIN_HARNESS_FAILED_LINE=$LINENO >&2' ERR",
      "export PGHOST=127.0.0.1 PGPORT=5432 PGUSER=postgres PGDATABASE=postgres PGPASSWORD=postgres",
      "docker-entrypoint.sh postgres >/tmp/postgres.log 2>&1 &",
      "postgres_pid=$!",
      'cleanup() { pg_ctl -D "${PGDATA}" -m fast stop >/dev/null 2>&1 || kill "${postgres_pid}" >/dev/null 2>&1 || true; }',
      "trap cleanup EXIT",
      "for attempt in $(seq 1 90); do pg_isready -h 127.0.0.1 -U postgres -d postgres >/dev/null 2>&1 && break; sleep 1; done",
      "pg_isready -h 127.0.0.1 -U postgres -d postgres >/dev/null 2>&1 || { cat /tmp/postgres.log >&2; exit 70; }",
    ];
    const files = [
      ["setup", baseline],
      ["auth-harness", authHarness],
      ["storage-predecessor", storagePredecessor],
      ["casework-predecessor", caseworkPredecessor],
      ["bridge", bridge],
      ["auth-r1", auth],
      ["workspace-grant", workspaceGrant],
      ["document-storage", document],
      ["task3", task3],
      ["fixture", fixture],
      ["domain-fixtures", domainFixtures],
      ["domain-migration", domainMigration],
    ];
    for (const [name, contents] of files) {
      shell.push(
        `cat >/tmp/${name}.b64 <<'B64'`,
        base64(contents),
        "B64",
        `base64 -d /tmp/${name}.b64 >/tmp/${name}.sql`,
      );
    }
    shell.push(
      "psql -X -qAt -v ON_ERROR_STOP=1 -f /tmp/setup.sql >/dev/null",
      "PGUSER=supabase_admin psql -X -qAt -v ON_ERROR_STOP=1 -f /tmp/auth-harness.sql >/dev/null",
      'sql() { psql -X -qAt -v ON_ERROR_STOP=1 -c "$1"; }',
      'apply_file() { psql -X -qAt -v ON_ERROR_STOP=1 -f "$1"; }',
      'json_field() { sql "select (\'$1\'::jsonb)->>\'$2\'"; }',
      'effects() { sql "select jsonb_build_object(\'commands\',(select count(*) from casework.case_commands),\'events\',(select count(*) from casework.case_events),\'projectionVersions\',(select coalesce(sum(case_version),0) from casework.case_state_projection),\'projectionHashes\',(select coalesce(string_agg(case_id::text||\':\'||projection_sha256,\',\' order by case_id),\'\') from casework.case_state_projection),\'authority\',(select coalesce(string_agg(case_id::text||\':\'||authority_version::text||\':\'||next_actor,\',\' order by case_id),\'\') from casework.drs_three_role_case_authority),\'documents\',(select count(*) from casework.documents),\'versions\',(select count(*) from casework.document_versions),\'receipts\',(select count(*) from casework.document_operation_receipts))"; }',
      "apply_file /tmp/bridge.sql >/dev/null",
      "apply_file /tmp/auth-r1.sql >/dev/null",
      "apply_file /tmp/workspace-grant.sql >/dev/null",
      "PGUSER=supabase_admin apply_file /tmp/storage-predecessor.sql >/dev/null",
      "apply_file /tmp/casework-predecessor.sql >/dev/null",
      "apply_file /tmp/document-storage.sql >/dev/null",
      "apply_file /tmp/fixture.sql >/dev/null",
      `sql "create or replace function integration.drs_workspace_grant_assert_current_locked_v1(p_authenticated_user_id uuid,p_expected_case_id uuid,p_authorization_subject text,p_grant_id uuid,p_grant_version bigint) returns jsonb language sql security definer set search_path='' as \\\$function\\\$ select jsonb_build_object('authorized',true,'authenticated_user_id',p_authenticated_user_id::text,'case_id',p_expected_case_id::text,'authorization_subject',p_authorization_subject) \\\$function\\\$; alter function integration.drs_workspace_grant_assert_current_locked_v1(uuid,uuid,text,uuid,bigint) owner to postgres; revoke all on function integration.drs_workspace_grant_assert_current_locked_v1(uuid,uuid,text,uuid,bigint) from public,anon,authenticated,service_role" >/dev/null`,
      "echo LEGACY_AUTHORITY_TEST_STUB=POSTGRES_OWNED >&2",
      `legacy_create_resource=$(sql "select jsonb_build_object('schemaVersion','laibe.drs-document-upload-intent.internal.v1','mode','NEW_DOCUMENT','intentId','${legacy.intentId}','intentRef','${legacy.intentRef}','documentKind','drs_review','originalFilename','legacy-causal-red.pdf','declaredMime','application/pdf','declaredSizeBytes',128,'declaredSha256','${legacy.payload}','objectKey','${legacy.intakeObjectKey}','expiresAt',(clock_timestamp()+interval '10 minutes')::text)::text")`,
      `legacy_create_payload=$(sql "select encode(extensions.digest(convert_to('\$legacy_create_resource','UTF8'),'sha256'),'hex')")`,
      `legacy_create=$(sql "select casework.server_document_operation_locked_v1('${IDS.drs}','${IDS.caseA}','drs-specialist:${IDS.legacySpecialist}','99999999-9999-4999-8999-999999999999',1,'CREATE_UPLOAD_INTENT','\$legacy_create_resource','legacy-create-intent-key-000090','\$legacy_create_payload')")`,
      "echo LEGACY_CREATE_STATE=$(json_field \"$legacy_create\" state) >&2",
      "test \"$(json_field \"$legacy_create\" state)\" = \"UPLOAD_INTENT_CREATED\"",
      `legacy_phase=$(sql "select casework.server_document_operation_locked_v1('${IDS.drs}','${IDS.caseA}','drs-specialist:${IDS.legacySpecialist}','99999999-9999-4999-8999-999999999999',1,'FINALIZE_UPLOAD','${legacy.intentRef}','${legacy.key}','${legacy.requestPayload}')")`,
      "echo LEGACY_PHASE_STATE=$(json_field \"$legacy_phase\" state) >&2",
      "test \"$(json_field \"$legacy_phase\" state)\" = \"VALIDATION_REQUIRED\"",
      "legacy_records_key=$(json_field \"$legacy_phase\" records_object_key)",
      `legacy_resource=$(sql "select jsonb_build_object('schemaVersion','laibe.drs-document-finalize.internal.v1','intentRef','${legacy.intentRef}','recordsBucket','drs-case-records-private','recordsObjectKey','\$legacy_records_key','requestPayloadSha256','${legacy.requestPayload}','verifiedSha256','${legacy.payload}','verifiedSizeBytes',128,'detectedMime','application/pdf')::text")`,
      `legacy_payload=$(sql "select encode(extensions.digest(convert_to('\$legacy_resource','UTF8'),'sha256'),'hex')")`,
      `legacy_result=$(sql "select casework.server_document_operation_locked_v1('${IDS.drs}','${IDS.caseA}','drs-specialist:${IDS.legacySpecialist}','99999999-9999-4999-8999-999999999999',1,'FINALIZE_UPLOAD','\$legacy_resource','${legacy.key}','\$legacy_payload')")`,
      "echo LEGACY_FINALIZE_STATE=$(json_field \"$legacy_result\" state) >&2",
      "test \"$(json_field \"$legacy_result\" state)\" = \"FORMAL_VERSION_CREATED\"",
      "apply_file /tmp/task3.sql >/dev/null",
      `test "$(sql "select count(*) from casework.case_transition_catalog where catalog_hash='${CATALOG_SHA256}' and schema_version='${CATALOG_SCHEMA_VERSION}'")" = "22"`,
      `test "$(sql "select count(*) from casework.case_events where case_id='${IDS.caseA}' and event_type='DOCUMENT_VERSION_FORMALIZED' and command_id is null and command_type is null")" = "1"`,
      `test "$(sql "select count(*) from casework.case_commands where case_id='${IDS.caseA}' and command_type='FORMALIZE_DOCUMENT_VERSION'")" = "0"`,
      "echo RED_LEGACY_FINALIZE_NULL_COMMAND_CONFIRMED >&2",
      `if test "${domainMigration.length > 0 ? "1" : "0"}" != "1"; then echo RED_PRIVATE_DOMAIN_COMMAND_SEAM_ABSENT >&2; exit 91; fi`,
      "apply_file /tmp/domain-migration.sql >/dev/null",
      "echo GREEN_PRIVATE_DOMAIN_COMMAND_SEAM_PRESENT >&2",
      "apply_file /tmp/domain-fixtures.sql >/dev/null",
      "sql \"create function public.test_document_formalize_apply_v1(p_case_id uuid,p_actor_user_id uuid,p_actor_auth_session_id uuid,p_actor_authority_membership_id uuid,p_actor_role text,p_authority_version bigint,p_command_id uuid,p_idempotency_key text,p_expected_case_version bigint,p_canonical_payload_sha256 text,p_evidence_refs jsonb,p_upload_intent_id uuid,p_document_id uuid,p_document_version_id uuid,p_document_receipt_id uuid) returns jsonb language sql security definer set search_path='' as \\\$function\\\$ select drs_case_command_private.apply_document_version_formalized_v1(p_case_id,p_actor_user_id,p_actor_auth_session_id,p_actor_authority_membership_id,p_actor_role,p_authority_version,p_command_id,p_idempotency_key,p_expected_case_version,p_canonical_payload_sha256,p_evidence_refs,p_upload_intent_id,p_document_id,p_document_version_id,p_document_receipt_id) \\\$function\\\$\" >/dev/null",
      "sql \"alter function public.test_document_formalize_apply_v1(uuid,uuid,uuid,uuid,text,bigint,uuid,text,bigint,text,jsonb,uuid,uuid,uuid,uuid) owner to postgres; revoke all on function public.test_document_formalize_apply_v1(uuid,uuid,uuid,uuid,text,bigint,uuid,text,bigint,text,jsonb,uuid,uuid,uuid,uuid) from public,anon,authenticated,service_role\" >/dev/null",
      `bind() { sql "set role service_role; select public.drs_three_role_auth_session_bind_v1('$1','$2','$3',clock_timestamp())" >/dev/null; }`,
      `issue() { sql "set role service_role; select public.drs_three_role_server_session_issue_v1('$1','$2','$3','$4',clock_timestamp(),clock_timestamp()+interval '30 minutes')" >/dev/null; }`,
    );
    for (const actor of Object.values(actors)) {
      shell.push(
        `bind '${actor.user}' '${actor.authSession}' '${actor.membership}'`,
        `issue '${actor.technical}' '${actor.digest}' '${actor.user}' '${actor.authSession}'`,
      );
    }
    shell.push(
      "echo DOCUMENT_DOMAIN_STAGE=IDENTITY_ACL >&2",
      `identity_count=$(sql "select count(*) from pg_proc p where p.oid in (to_regprocedure('drs_case_command_private.lock_case_command_v1(uuid)'),to_regprocedure('drs_case_command_private.apply_document_version_formalized_v1(uuid,uuid,uuid,uuid,text,bigint,uuid,text,bigint,text,jsonb,uuid,uuid,uuid,uuid)')) and pg_get_userbyid(p.proowner)='postgres' and p.prosecdef and p.proconfig=array['search_path='||chr(34)||chr(34)]")`,
      "echo DOMAIN_FUNCTION_IDENTITY_COUNT=$identity_count >&2",
      "test \"$identity_count\" = \"2\"",
      `acl_count=$(sql "select count(*) from pg_proc p where p.oid in (to_regprocedure('drs_case_command_private.lock_case_command_v1(uuid)'),to_regprocedure('drs_case_command_private.apply_document_version_formalized_v1(uuid,uuid,uuid,uuid,text,bigint,uuid,text,bigint,text,jsonb,uuid,uuid,uuid,uuid)')) and not exists (select 1 from aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) privilege where privilege.grantee=0 and privilege.privilege_type='EXECUTE') and not has_function_privilege('anon',p.oid,'EXECUTE') and not has_function_privilege('authenticated',p.oid,'EXECUTE') and not has_function_privilege('service_role',p.oid,'EXECUTE')")`,
      "echo DOMAIN_FUNCTION_ACL_COUNT=$acl_count >&2",
      "test \"$acl_count\" = \"2\"",
      `private_calls=("select drs_case_command_private.lock_case_command_v1('${IDS.caseA}')" "select drs_case_command_private.apply_document_version_formalized_v1(null::uuid,null::uuid,null::uuid,null::uuid,null::text,null::bigint,null::uuid,null::text,null::bigint,null::text,null::jsonb,null::uuid,null::uuid,null::uuid,null::uuid)"); for role_name in anon authenticated service_role; do for private_call in "\${private_calls[@]}"; do if acl_output=$(psql -X -qAt -v ON_ERROR_STOP=1 -v VERBOSITY=verbose -c "begin; set local role $role_name; $private_call; rollback" 2>&1); then echo DIRECT_PRIVATE_CALL_UNEXPECTED_SUCCESS >&2; exit 78; fi; grep -F 42501 <<<"$acl_output" >/dev/null; done; done`,
      "echo DIRECT_PRIVATE_CALL_SQLSTATE=42501 >&2",
      "echo DOCUMENT_DOMAIN_STAGE=THREE_ROLES >&2",
    );

    const applied = [];
    let commandOrdinal = 1;
    for (const documentFixture of [docs.owner, docs.vendor, docs.drs]) {
      const result = `role_result_${documentFixture.actor.role}`;
      const before = `role_before_${documentFixture.actor.role}`;
      const version = `role_version_${documentFixture.actor.role}`;
      const authority = `role_authority_${documentFixture.actor.role}`;
      const command = commandId(commandOrdinal);
      shell.push(
        `${before}=$(sql "select row_to_json(p)::text from casework.case_state_projection p where case_id='${IDS.caseA}'")`,
        `${version}=$(sql "select case_version from casework.case_state_projection where case_id='${IDS.caseA}'")`,
        `${authority}=$(sql "select authority_version::text||':'||next_actor from casework.drs_three_role_case_authority where case_id='${IDS.caseA}'")`,
        `${result}=$(sql "${domainSql(documentFixture, command, `\$${version}`)}")`,
        `test "$(json_field "\$${result}" state)" = "APPLIED"`,
        `test "$(json_field "\$${result}" newEffects)" = "1"`,
        `test "$(sql "select '\$${result}'::jsonb->'receipt'->>'schemaVersion'")" = "laibe.drs.command-receipt.v1"`,
        `test "$(sql "select not ('\$${result}'::jsonb->'receipt' ?| array['state','newEffects'])")" = "t"`,
        `test "$(sql "select event_type='DOCUMENT_VERSION_FORMALIZED' and journey_state_impact='NONE' and command_type='FORMALIZE_DOCUMENT_VERSION' and catalog_ordinal is null and catalog_schema_version is null and catalog_hash is null and from_state=to_state and actor_role='${documentFixture.actor.role}' and evidence_refs=${shellSqlLiteral(JSON.stringify(evidence(documentFixture)))}::jsonb from casework.case_events where case_id='${documentFixture.caseId}' and command_id='${command}'")" = "t"`,
        `test "$(sql "select before_row.current_state=after_row.current_state and before_row.next_actor=after_row.next_actor and before_row.due_time is not distinct from after_row.due_time and before_row.catalog_schema_version=after_row.catalog_schema_version and before_row.catalog_hash=after_row.catalog_hash and after_row.case_version=before_row.case_version+1 and after_row.last_sequence_no=before_row.last_sequence_no+1 from json_populate_record(null::casework.case_state_projection,'\$${before}'::json) before_row cross join casework.case_state_projection after_row where after_row.case_id='${IDS.caseA}'")" = "t"`,
        `test "$(sql "select authority_version::text||':'||next_actor from casework.drs_three_role_case_authority where case_id='${IDS.caseA}'")" = "\$${authority}"`,
        `test "$(sql "select receipt=('\$${result}'::jsonb->'receipt') and receipt_canonical=('\$${result}'::jsonb->>'receiptCanonical') and receipt_sha256=('\$${result}'::jsonb->>'receiptSha256') and receipt_sha256=drs_case_command_private.sha256_hex_v1(receipt_canonical) from casework.case_commands where case_id='${documentFixture.caseId}' and command_id='${command}'")" = "t"`,
      );
      applied.push({ documentFixture, result, version, command });
      commandOrdinal += 1;
    }

    const replayed = applied[0];
    shell.push(
      "echo DOCUMENT_DOMAIN_STAGE=REPLAY_DENIALS >&2",
      `replay=$(sql "${domainSql(replayed.documentFixture, replayed.command, `\$${replayed.version}`)}")`,
      'test "$(json_field "$replay" state)" = "REPLAYED"',
      'test "$(json_field "$replay" newEffects)" = "0"',
      `test "$(sql "select ('$replay'::jsonb->'receipt')=('$${replayed.result}'::jsonb->'receipt') and ('$replay'::jsonb->>'receiptCanonical')=('$${replayed.result}'::jsonb->>'receiptCanonical') and ('$replay'::jsonb->>'receiptSha256')=('$${replayed.result}'::jsonb->>'receiptSha256')")" = "t"`,
      "before_denials=$(effects)",
      `denial_version=$(sql "select case_version from casework.case_state_projection where case_id='${IDS.caseA}'")`,
      `invalid=$(sql "${domainSql(docs.owner, commandId(20), "1", evidence(docs.owner), actors.owner, "short", docs.owner.payload)}")`,
      'echo DENIAL_INVALID=$(json_field "$invalid" state) >&2',
      'test "$(json_field "$invalid" state)" = "INVALID_REQUEST"',
      'test "$(json_field "$invalid" newEffects)" = "0"',
      `auth_invalid=$(sql "${domainSql(docs.owner, commandId(21), "999", evidence(docs.owner), { ...actors.owner, authSession: "99999999-9999-4999-8999-999999999999" }, "another-domain-key-000021", docs.owner.payload)}")`,
      'echo DENIAL_AUTH=$(json_field "$auth_invalid" state) >&2',
      'test "$(json_field "$auth_invalid" state)" = "AUTH_SESSION_OR_CASE_AUTHORITY_INVALID"',
      `not_authorized=$(sql "${domainSql(docs.vendor, commandId(22), "$denial_version", evidence(docs.vendor), actors.owner, "another-domain-key-000022", docs.vendor.payload)}")`,
      'echo DENIAL_NOT_AUTHORIZED=$(json_field "$not_authorized" state) >&2',
      'test "$(json_field "$not_authorized" state)" = "DOCUMENT_FINALIZE_NOT_AUTHORIZED"',
      `stale=$(sql "${domainSql(docs.owner, commandId(23), "1", evidence(docs.owner), actors.owner, "another-domain-key-000023", docs.owner.payload)}")`,
      'echo DENIAL_STALE=$(json_field "$stale" state) >&2',
      'test "$(json_field "$stale" state)" = "CASE_VERSION_CONFLICT"',
      `idempotency_conflict=$(sql "${domainSql(docs.owner, commandId(24), `\$${replayed.version}`)}")`,
      'echo DENIAL_IDEMPOTENCY=$(json_field "$idempotency_conflict" state) >&2',
      'test "$(json_field "$idempotency_conflict" state)" = "IDEMPOTENCY_CONFLICT"',
      `payload_conflict=$(sql "${domainSql(docs.owner, replayed.command, `\$${replayed.version}`, evidence(docs.owner), actors.owner, docs.owner.key, "f".repeat(64))}")`,
      'test "$(json_field "$payload_conflict" state)" = "IDEMPOTENCY_CONFLICT"',
      `key_conflict=$(sql "${domainSql(docs.owner, replayed.command, "$denial_version", evidence(docs.owner), actors.owner, "different-domain-key-000024", docs.owner.payload)}")`,
      'test "$(json_field "$key_conflict" state)" = "IDEMPOTENCY_CONFLICT"',
      `bad_evidence=$(sql "${domainSql(docs.conflict, commandId(25), "$denial_version", { ...evidence(docs.conflict), documentSha256: "" }, actors.owner)}")`,
      'echo DENIAL_EVIDENCE=$(json_field "$bad_evidence" state) >&2',
      'test "$(json_field "$bad_evidence" state)" = "DOCUMENT_FINALIZE_EVIDENCE_INVALID"',
      `finalize_conflict=$(sql "${domainSql(docs.conflict, commandId(26), "$denial_version")}")`,
      'echo DENIAL_FINALIZE_CONFLICT=$(json_field "$finalize_conflict" state) >&2',
      'test "$(json_field "$finalize_conflict" state)" = "DOCUMENT_FINALIZE_CONFLICT"',
      `for denial in "$invalid" "$auth_invalid" "$not_authorized" "$stale" "$idempotency_conflict" "$payload_conflict" "$key_conflict" "$bad_evidence" "$finalize_conflict"; do test "$(json_field "$denial" newEffects)" = "0"; done`,
      'test "$(effects)" = "$before_denials"',
      "echo DOCUMENT_DOMAIN_DENIALS_EFFECTS0=PASS >&2",
      "echo DOCUMENT_DOMAIN_STAGE=ROLLBACK_CONCURRENCY >&2",
      `rollback_version=$(sql "select case_version from casework.case_state_projection where case_id='${IDS.caseB}'")`,
      "before_rollback=$(effects)",
      `rollback_result=$(sql "begin; ${domainSql(docs.concurrent, commandId(27), "$rollback_version")}; rollback")`,
      'test "$(json_field "$rollback_result" state)" = "APPLIED"',
      'test "$(effects)" = "$before_rollback"',
      `concurrent_version=$(sql "select case_version from casework.case_state_projection where case_id='${IDS.caseB}'")`,
      `(${domainSql(docs.concurrent, commandId(30), "$concurrent_version")};) >/tmp/domain-a.out & domain_a=$!`,
      `(${domainSql(docs.concurrent, commandId(30), "$concurrent_version")};) >/tmp/domain-b.out & domain_b=$!`,
    );
    // Replace the bare SQL subshells with psql invocations after interpolation.
    shell.splice(shell.length - 2, 2,
      `psql -X -qAt -v ON_ERROR_STOP=1 -c "${domainSql(docs.concurrent, commandId(30), "\$concurrent_version")}" >/tmp/domain-a.out & domain_a=$!`,
      `psql -X -qAt -v ON_ERROR_STOP=1 -c "${domainSql(docs.concurrent, commandId(30), "\$concurrent_version")}" >/tmp/domain-b.out & domain_b=$!`,
    );
    shell.push(
      "wait $domain_a; wait $domain_b",
      "domain_a_result=$(cat /tmp/domain-a.out)",
      "domain_b_result=$(cat /tmp/domain-b.out)",
      "domain_states=$(sql \"select string_agg(value,',' order by value) from jsonb_array_elements_text(jsonb_build_array('$domain_a_result'::jsonb->>'state','$domain_b_result'::jsonb->>'state')) item(value)\")",
      'test "$domain_states" = "APPLIED,REPLAYED"',
      `test "$(sql "select count(*) from casework.case_commands where case_id='${IDS.caseB}' and command_type='FORMALIZE_DOCUMENT_VERSION'")" = "1"`,
      "echo DOCUMENT_DOMAIN_CONCURRENCY=ONE_APPLIED_ONE_REPLAYED >&2",
      "echo DOCUMENT_DOMAIN_STAGE=LOCK_ORDER >&2",
      `race_version=$(sql "select case_version from casework.case_state_projection where case_id='${IDS.caseC}'")`,
    );
    const transitionEvidence = JSON.stringify({
      analysisRunRef: "analysis_lock_order_0001",
      citationSetRef: "citations_lock_order_0001",
      quoteDocumentVersionRef: quote.versionRef,
      quoteSha256: quote.payload,
      reviewDecisionRef: "decision_lock_order_0001",
    });
    const transitionSql = `select public.drs_case_command_apply_v1(
      '${actors.drsC.technical}','${actors.drsC.digest}','${actors.drsC.user}',
      '${actors.drsC.authSession}','${commandId(40)}',
      'RECORD_QUOTE_HEALTHCHECK_OUTCOME','lock-order-task3-key-000040',
      $race_version,'${"b".repeat(64)}',${shellSqlLiteral(transitionEvidence)}::jsonb,null
    )`;
    shell.push(
      `psql -X -qAt -v ON_ERROR_STOP=1 -c "${domainSql(docs.lockRace, commandId(41), "\$race_version")}" >/tmp/race-domain.out & race_domain=$!`,
      `psql -X -qAt -v ON_ERROR_STOP=1 -c "set role service_role; ${transitionSql}" >/tmp/race-task3.out & race_task3=$!`,
      "wait $race_domain; wait $race_task3",
      "race_domain_result=$(cat /tmp/race-domain.out)",
      "race_task3_result=$(cat /tmp/race-task3.out)",
      "race_states=$(sql \"select string_agg(value,',' order by value) from jsonb_array_elements_text(jsonb_build_array('$race_domain_result'::jsonb->>'state','$race_task3_result'::jsonb->>'state')) item(value)\")",
      'test "$race_states" = "APPLIED,CASE_VERSION_CONFLICT"',
      "echo TASK3_TRANSITION_VS_FINALIZE_NO_DEADLOCK=PASS >&2",
      `test "$(sql "select count(*) from casework.case_transition_catalog where catalog_hash='${CATALOG_SHA256}' and schema_version='${CATALOG_SCHEMA_VERSION}'")" = "22"`,
      "echo TASK4_BRIDGE_REQUIRED=TRUE >&2",
      "echo DOCUMENT_DOMAIN_REAL_PG_GREEN=PASS >&2",
    );

    const result = await runDocker(shell.join("\n"));
    assert.equal(
      result.code,
      0,
      `disconnected PostgreSQL domain-command harness failed\n${result.stderr}\n${result.stdout}`,
    );
    for (const marker of [
      "RED_LEGACY_FINALIZE_NULL_COMMAND_CONFIRMED",
      "GREEN_PRIVATE_DOMAIN_COMMAND_SEAM_PRESENT",
      "DIRECT_PRIVATE_CALL_SQLSTATE=42501",
      "DOCUMENT_DOMAIN_DENIALS_EFFECTS0=PASS",
      "DOCUMENT_DOMAIN_CONCURRENCY=ONE_APPLIED_ONE_REPLAYED",
      "TASK3_TRANSITION_VS_FINALIZE_NO_DEADLOCK=PASS",
      "TASK4_BRIDGE_REQUIRED=TRUE",
      "DOCUMENT_DOMAIN_REAL_PG_GREEN=PASS",
    ]) assert.match(result.stderr, new RegExp(marker, "u"));
  },
);
