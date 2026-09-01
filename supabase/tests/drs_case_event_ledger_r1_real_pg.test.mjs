import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import { spawn, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  existsSync,
  readFileSync,
  readdirSync,
  statSync,
} from "node:fs";
import process from "node:process";
import test from "node:test";

const CATALOG_SCHEMA_VERSION =
  "laibe.drs.a4-transition-catalog.pre-ready.v1";
const CATALOG_SHA256 =
  "804bd327dcb67788b74aff9aabc7c4de0fda1fe2b1be0e8fe37a83445117865e";
const CATALOG_CANONICAL_BYTES = 6157;
const CATALOG_COLUMNS =
  "ordinal|step|fromState|commandType|eventType|allowedRoles|toState|nextActorRule|requiredEvidenceRefs|effects0DenialSets|boundary";

const CATALOG_ROWS = Object.freeze([
  "01|1|CASE_PREPARATION|RECORD_QUOTE_HEALTHCHECK_OUTCOME|QUOTE_HEALTHCHECK_OUTCOME_RECORDED|drs|QUOTE_HEALTHCHECK_RECORDED|DRS_IF_DRAWING_INPUT_READY_ELSE_OWNER|analysisRunRef,citationSetRef,quoteDocumentVersionRef,quoteSha256,reviewDecisionRef|D0,D1|PROVISIONAL_TASK5_6",
  "02|2|QUOTE_HEALTHCHECK_RECORDED|RECORD_DRAWING_HEALTHCHECK_OUTCOME|DRAWING_HEALTHCHECK_OUTCOME_RECORDED|drs|DRAWING_HEALTHCHECK_RECORDED|DRS_IF_CONTRACT_INPUT_READY_ELSE_OWNER|analysisRunRef,citationSetRef,drawingDocumentVersionRef,drawingSha256,reviewDecisionRef|D0,D1|PROVISIONAL_TASK5_6",
  "03|3|DRAWING_HEALTHCHECK_RECORDED|RECORD_CONTRACT_HEALTHCHECK_OUTCOME|CONTRACT_HEALTHCHECK_OUTCOME_RECORDED|drs|CONTRACT_HEALTHCHECK_RECORDED|owner|analysisRunRef,citationSetRef,contractDocumentVersionRef,contractSha256,reviewDecisionRef,rulesetRef|D0,D1|PROVISIONAL_TASK5_6_HUMAN_RULESET",
  "04|4|CONTRACT_HEALTHCHECK_RECORDED|SUBMIT_SERVICE_CONTRACT_INTENT|SERVICE_CONTRACT_INTENT_SUBMITTED|owner|SERVICE_CONTRACT_COUNTERSIGN_PENDING|drs|attachmentManifestSha256,ownerIntentReceiptRef,previewReceiptRef,serviceContractSha256,serviceContractVersionRef|D0,D2|PROVISIONAL_TASK7_HUMAN_PROVIDER",
  "05|5|SERVICE_CONTRACT_COUNTERSIGN_PENDING|RECORD_SERVICE_CONTRACT_COUNTERSIGN_INTENT|SERVICE_CONTRACT_COUNTERSIGN_INTENT_RECORDED|drs|SERVICE_CONTRACT_INTENTS_RECORDED|drs|attachmentManifestSha256,drsIntentReceiptRef,drsSignerAuthorityRef,ownerIntentReceiptRef,serviceContractSha256,serviceContractVersionRef|D0,D2|PROVISIONAL_TASK7_HUMAN_PROVIDER",
  "06|6|SERVICE_CONTRACT_INTENTS_RECORDED|CONFIRM_LINE_CASE_CHANNEL|LINE_CASE_CHANNEL_CONFIRMED|drs|LINE_CASE_CHANNEL_CONFIRMED|vendor|lineAccountBindingRefs,lineGroupBindingRef,threePartyConsentRefs|D0,D3|PROVISIONAL_TASK8_HUMAN_POLICY",
  "07|7|LINE_CASE_CHANNEL_CONFIRMED|SUBMIT_VENDOR_BUNDLE|VENDOR_BUNDLE_SUBMITTED|vendor|VENDOR_BUNDLE_SUBMITTED|OWNER_OR_VENDOR_UNFULFILLED_SIGNER|bundleManifestSha256,calendarEventLinkRefs,documentVersionRefs,submissionBundleRef|D0,D4|PROVISIONAL_TASK9_10",
  "08|8|VENDOR_BUNDLE_SUBMITTED|RECORD_OWNER_VENDOR_SIGNATURE_INTENT|OWNER_VENDOR_SIGNATURE_INTENT_RECORDED|owner,vendor|OWNER_VENDOR_COUNTERSIGN_PENDING|REMAINING_REQUIRED_SIGNER|attachmentManifestSha256,contractSha256,ownerVendorContractVersionRef,signerIntentReceiptRef|D0,D5|PROVISIONAL_TASK7_HUMAN_PROVIDER",
  "09|8|OWNER_VENDOR_COUNTERSIGN_PENDING|RECORD_OWNER_VENDOR_SIGNATURE_INTENT|OWNER_VENDOR_SIGNATURE_INTENT_RECORDED|owner,vendor|OWNER_VENDOR_INTENTS_RECORDED|owner|attachmentManifestSha256,contractSha256,ownerVendorContractVersionRef,priorSignerIntentReceiptRef,signerIntentReceiptRef|D0,D5|PROVISIONAL_TASK7_HUMAN_PROVIDER",
  "10|9|OWNER_VENDOR_INTENTS_RECORDED|RECORD_EXTERNAL_PAYMENT_EVIDENCE|EXTERNAL_PAYMENT_EVIDENCE_RECORDED|owner|PAYMENT_EVIDENCE_REVIEW_PENDING|drs|ownerStatementRef,paymentEvidenceSha256,paymentEvidenceVersionRef|D0,D6|PROVISIONAL_TASK10_HUMAN_PAYMENT_POLICY",
  "11|9|PAYMENT_EVIDENCE_REVIEW_PENDING|RECORD_PAYMENT_EVIDENCE_REVIEW|PAYMENT_EVIDENCE_REVIEW_RECORDED|drs|PAYMENT_EVIDENCE_REVIEWED|vendor|ownerStatementRef,paymentEvidenceReviewRef,paymentEvidenceSha256,paymentEvidenceVersionRef|D0,D6|PROVISIONAL_TASK10_HUMAN_PAYMENT_POLICY",
  "12|10|PAYMENT_EVIDENCE_REVIEWED|SUBMIT_MOBILIZATION_EVIDENCE|MOBILIZATION_EVIDENCE_SUBMITTED|vendor|MOBILIZATION_OWNER_CONFIRMATION_PENDING|owner|calendarEventReceiptRef,mobilizationEvidenceSha256,mobilizationEvidenceVersionRef,paymentEvidenceReviewRef|D0,D7|PROVISIONAL_TASK9_10",
  "13|10|MOBILIZATION_OWNER_CONFIRMATION_PENDING|RECORD_OWNER_MOBILIZATION_CONFIRMATION|OWNER_MOBILIZATION_CONFIRMATION_RECORDED|owner|MOBILIZATION_DRS_CONFIRMATION_PENDING|drs|calendarEventReceiptRef,mobilizationEvidenceSha256,mobilizationEvidenceVersionRef,ownerConfirmationRef,vendorMobilizationReceiptRef|D0,D7|PROVISIONAL_TASK10",
  "14|10|MOBILIZATION_DRS_CONFIRMATION_PENDING|RECORD_DRS_MOBILIZATION_CONFIRMATION|DRS_MOBILIZATION_CONFIRMATION_RECORDED|drs|MOBILIZATION_RECORDED|vendor|calendarEventReceiptRef,drsConfirmationRef,mobilizationEvidenceSha256,mobilizationEvidenceVersionRef,ownerConfirmationRef,vendorMobilizationReceiptRef|D0,D7|PROVISIONAL_TASK10",
  "15|11|MOBILIZATION_RECORDED|SUBMIT_FIRST_MILESTONE_EVIDENCE|FIRST_MILESTONE_EVIDENCE_SUBMITTED|vendor|FIRST_MILESTONE_REVIEW_PENDING|drs|milestoneEvidenceManifestSha256,milestoneEvidenceVersionRefs,milestoneRef,submissionReceiptRef|D0,D8|PROVISIONAL_TASK10",
  "16|11|FIRST_MILESTONE_REVIEW_PENDING|RECORD_FIRST_MILESTONE_WRITTEN_REVIEW|FIRST_MILESTONE_WRITTEN_REVIEW_RECORDED|drs|FIRST_MILESTONE_REVIEW_RECORDED|owner|citationSetRef,firstMilestoneSubmissionRef,reviewDecisionRef,writtenOutcomeRef|D0,D8|PROVISIONAL_TASK10",
  "17|11A|FIRST_MILESTONE_REVIEW_RECORDED|RECORD_OWNER_MILESTONE_DECISION|OWNER_MILESTONE_DECISION_RECORDED|owner|SECOND_MILESTONE_EVIDENCE_PENDING|vendor|firstMilestoneReviewRef,ownerDecisionRef|D0,D8|PROVISIONAL_TASK10",
  "18|12|SECOND_MILESTONE_EVIDENCE_PENDING|SUBMIT_SECOND_MILESTONE_EVIDENCE|SECOND_MILESTONE_EVIDENCE_SUBMITTED|vendor|SECOND_MILESTONE_REVIEW_PENDING|drs|milestoneEvidenceManifestSha256,milestoneEvidenceVersionRefs,secondMilestoneRef,submissionReceiptRef|D0,D8|PROVISIONAL_TASK10",
  "19|12|SECOND_MILESTONE_REVIEW_PENDING|REQUEST_SUPPLEMENT|SUPPLEMENT_REQUEST_RECORDED|drs|SUPPLEMENT_REQUESTED|vendor|dueTime,missingItemRefs,priorReviewRef,secondMilestoneSubmissionRef,supplementRequestRef|D0,D9|PROVISIONAL_TASK10",
  "20|13|SUPPLEMENT_REQUESTED|SUBMIT_SUPPLEMENT_VERSION|SUPPLEMENT_VERSION_SUBMITTED|vendor|SUPPLEMENT_REVIEW_PENDING|drs|priorReviewRef,supplementRequestRef,supplementSha256,supplementSubmissionReceiptRef,supplementVersionRef|D0,D10|PROVISIONAL_TASK10",
  "21|13|SUPPLEMENT_REVIEW_PENDING|RECORD_SUCCESSOR_REVIEW_OUTCOME|SUCCESSOR_REVIEW_OUTCOME_RECORDED|drs|SUCCESSOR_REVIEW_RECORDED|owner|citationSetRef,priorReviewRef,successorReviewRef,supplementRequestRef,supplementSha256,supplementVersionRef,writtenOutcomeRef|D0,D10|PROVISIONAL_TASK10",
  "22|13|SUPPLEMENT_REVIEW_PENDING|REQUEST_FURTHER_SUPPLEMENT|FURTHER_SUPPLEMENT_REQUEST_RECORDED|drs|SUPPLEMENT_REQUESTED|vendor|citationSetRef,dueTime,missingItemRefs,newSupplementRequestRef,priorReviewRef,supplementRequestRef,supplementSha256,supplementVersionRef|D0,D10|PROVISIONAL_TASK10",
]);

const rootUrl = new URL("../", import.meta.url);
const migrationUrl = new URL(
  "migrations/20260901192440_drs_case_event_ledger_r1.sql",
  rootUrl,
);
const bridgeUrl = new URL(
  "migrations/20260831182641_drs_remote_baseline_bridge_w2.sql",
  rootUrl,
);
const documentMigrationUrl = new URL(
  "migrations/20260826190000_drs_document_storage_w1.sql",
  rootUrl,
);
const authMigrationUrl = new URL(
  "migrations/20260901174523_drs_three_role_case_authority_r1.sql",
  rootUrl,
);
const contractsUrl = new URL(
  "functions/_shared/drs-case-command/contracts.ts",
  rootUrl,
);
const handlerUrl = new URL("functions/drs-case-command/index.ts", rootUrl);

const EXPECTED_BRIDGE_SHA256 =
  "e05e7facb968bcb07baa89494564197f5018d6e94dac787f5898a87aa5479f96";
const EXPECTED_DOCUMENT_MIGRATION_SHA256 =
  "684d9ff35f82f9483fc4c9bb87ad09b27ae20058a3d3008992f1f540990d7f3f";
const EXPECTED_AUTH_MIGRATION_SHA256 =
  "bddf258c51042be8421682c6e9d783bc0f374a6ecf973678c6badca104525b07";
const EXPECTED_DOCKER_SHA256 =
  "0f97bc1111f59d859766ba938691ee07ed4e58d5fdaeb6f4dfb10a5ef5394753";
const POSTGRES_IMAGE =
  "sha256:28f0e16a019e648089fc1a6d333549a55548f6019c15ae4bd7cd58b989027518";

const dockerPath = process.env.DRS_DATA_R1_DOCKER ?? "";
const denoPath = process.env.DRS_DATA_R1_DENO ?? "deno";
const harnessConfirmed =
  process.env.DRS_DATA_R1_DISPOSABLE_CONFIRMED === "YES";
const harnessAvailable = harnessConfirmed && dockerPath.length > 0 &&
  existsSync(dockerPath);

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function base64(value) {
  return Buffer.from(value, "utf8").toString("base64");
}

function parseRow(row) {
  const [
    ordinal,
    step,
    fromState,
    commandType,
    eventType,
    allowedRoles,
    toState,
    nextActorRule,
    requiredEvidenceRefs,
    effects0DenialSets,
    boundary,
  ] = row.split("|");
  return Object.freeze({
    ordinal: Number(ordinal),
    step,
    fromState,
    commandType,
    eventType,
    allowedRoles: Object.freeze(allowedRoles.split(",")),
    toState,
    nextActorRule,
    requiredEvidenceRefs: Object.freeze(requiredEvidenceRefs.split(",")),
    effects0DenialSets: Object.freeze(effects0DenialSets.split(",")),
    boundary,
  });
}

const parsedRows = Object.freeze(CATALOG_ROWS.map(parseRow));

const D1_D10_NEGATIVE_MATRIX = Object.freeze([
  Object.freeze({
    denialSet: "D1",
    ordinal: 1,
    condition: "missing DRS human review decision reference",
    mutate(evidence) {
      delete evidence.reviewDecisionRef;
      return evidence;
    },
  }),
  Object.freeze({
    denialSet: "D2",
    ordinal: 4,
    condition: "service-contract immutable hash drift",
    mutate(evidence) {
      evidence.serviceContractSha256 = "0".repeat(64);
      return evidence;
    },
  }),
  Object.freeze({
    denialSet: "D3",
    ordinal: 6,
    condition: "missing active three-party LINE consent references",
    mutate(evidence) {
      delete evidence.threePartyConsentRefs;
      return evidence;
    },
  }),
  Object.freeze({
    denialSet: "D4",
    ordinal: 7,
    condition: "vendor bundle contains a wrong-case document version",
    mutate(evidence) {
      evidence.documentVersionRefs = [DOCUMENTS.crossCase.ref];
      return evidence;
    },
  }),
  Object.freeze({
    denialSet: "D5",
    ordinal: 8,
    condition: "owner-vendor contract version and hash belong to another case",
    mutate(evidence) {
      evidence.ownerVendorContractVersionRef = DOCUMENTS.crossCase.ref;
      evidence.contractSha256 = DOCUMENTS.crossCase.sha;
      return evidence;
    },
  }),
  Object.freeze({
    denialSet: "D6",
    ordinal: 10,
    condition: "missing immutable payment evidence version",
    mutate(evidence) {
      delete evidence.paymentEvidenceVersionRef;
      return evidence;
    },
  }),
  Object.freeze({
    denialSet: "D7",
    ordinal: 12,
    condition: "missing immutable vendor mobilization evidence version",
    mutate(evidence) {
      delete evidence.mobilizationEvidenceVersionRef;
      return evidence;
    },
  }),
  Object.freeze({
    denialSet: "D8",
    ordinal: 15,
    condition: "milestone evidence version belongs to another case",
    mutate(evidence) {
      evidence.milestoneEvidenceVersionRefs = [DOCUMENTS.crossCase.ref];
      return evidence;
    },
  }),
  Object.freeze({
    denialSet: "D9",
    ordinal: 19,
    condition: "missing finite supplement due time",
    mutate(evidence) {
      delete evidence.dueTime;
      return evidence;
    },
  }),
  Object.freeze({
    denialSet: "D10",
    ordinal: 20,
    condition: "supplement version is stale against the current document version",
    mutate(evidence) {
      evidence.supplementVersionRef = DOCUMENTS.supplement2.ref;
      evidence.supplementSha256 = DOCUMENTS.supplement2.sha;
      return evidence;
    },
  }),
]);

test("WF receipt canonical catalog is exactly 22 rows / 6157 bytes / bound SHA", () => {
  const canonical = CATALOG_ROWS.join("\n");
  assert.equal(CATALOG_ROWS.length, 22);
  assert.equal(Buffer.byteLength(canonical, "utf8"), CATALOG_CANONICAL_BYTES);
  assert.equal(sha256(canonical), CATALOG_SHA256);
  assert.equal(parsedRows[19].commandType, "SUBMIT_SUPPLEMENT_VERSION");
  assert.equal(parsedRows[19].nextActorRule, "drs");
  assert.equal(parsedRows[20].commandType, "RECORD_SUCCESSOR_REVIEW_OUTCOME");
  assert.equal(parsedRows[20].nextActorRule, "owner");
  assert.equal(parsedRows[21].commandType, "REQUEST_FURTHER_SUPPLEMENT");
  assert.equal(parsedRows[21].nextActorRule, "vendor");
});

test("contracts module binds the exact catalog and exposes no caller authority", () => {
  assert.equal(
    existsSync(contractsUrl),
    true,
    "contracts.ts must exist before this selector can pass",
  );
  const source = readFileSync(contractsUrl, "utf8");
  assert.match(source, new RegExp(CATALOG_SCHEMA_VERSION.replaceAll(".", "\\."), "u"));
  assert.match(source, new RegExp(CATALOG_SHA256, "u"));
  assert.match(source, /TRANSITION_CATALOG_ROW_COUNT\s*=\s*22/u);
  assert.match(source, /TRANSITION_CATALOG_CANONICAL_BYTES\s*=\s*6157/u);
  for (const row of CATALOG_ROWS) assert.ok(source.includes(JSON.stringify(row)));
  assert.match(source, /WRONG_ACTOR_CHAIN/u);
  assert.match(source, /FORBIDDEN_CALLER_AUTHORITY_KEYS/u);
  assert.match(source, /resolveConcreteNextActor/u);
  assert.match(source, /DRS_IF_DRAWING_INPUT_READY_ELSE_OWNER/u);
  assert.match(source, /OWNER_OR_VENDOR_UNFULFILLED_SIGNER/u);

  const evaluation = [
    `import { TRANSITION_CATALOG_ROW_COUNT, TRANSITION_CATALOG_CANONICAL_BYTES, TRANSITION_CATALOG_SHA256, transitionCatalogCanonicalText, assertTransitionCatalogIntegrity } from ${JSON.stringify(contractsUrl.href)};`,
    "await assertTransitionCatalogIntegrity();",
    "console.log(JSON.stringify({rowCount:TRANSITION_CATALOG_ROW_COUNT,bytes:TRANSITION_CATALOG_CANONICAL_BYTES,hash:TRANSITION_CATALOG_SHA256,text:transitionCatalogCanonicalText()}));",
  ].join("\n");
  const result = spawnSync(denoPath, ["eval", evaluation], {
    encoding: "utf8",
    windowsHide: true,
  });
  assert.equal(result.status, 0, result.stderr);
  const projection = JSON.parse(result.stdout.trim());
  assert.equal(projection.rowCount, 22);
  assert.equal(projection.bytes, 6157);
  assert.equal(projection.hash, CATALOG_SHA256);
  assert.equal(projection.text, CATALOG_ROWS.join("\n"));
});

test("Edge command handler derives authority from the accepted Task2 session seam", () => {
  assert.equal(
    existsSync(handlerUrl),
    true,
    "drs-case-command/index.ts must exist before this selector can pass",
  );
  const source = readFileSync(handlerUrl, "utf8");
  assert.match(source, /createDrsThreeRoleSecureSessionRuntime/u);
  assert.match(source, /verifyThreeRoleSession/u);
  assert.match(source, /openTechnicalSessionCookie/u);
  assert.match(source, /DRS_THREE_ROLE_SESSION_CONTEXT_KEYS/u);
  assert.match(source, /drs_case_command_apply_v1/u);
  assert.match(source, /FORBIDDEN_CALLER_AUTHORITY_KEYS/u);
  assert.doesNotMatch(source, /LINE_CHANNEL_ACCESS_TOKEN|CALENDAR_CLIENT_SECRET|payment[_-]?provider/iu);
});

test("migration is additive, preimage guarded, append-only and least-privilege", () => {
  const migration = readFileSync(migrationUrl, "utf8");
  assert.ok(migration.length > 0, "Task3 migration is still the empty C1 preimage");
  assert.doesNotMatch(migration, /create table casework\.case_events/iu);
  assert.match(migration, /alter table casework\.case_events/iu);
  assert.match(migration, /create table casework\.case_commands/iu);
  assert.match(migration, /unique\s*\(case_id,\s*command_type,\s*idempotency_key\)/iu);
  assert.match(migration, /unique\s*\(case_id,\s*command_id\)/iu);
  assert.match(migration, /create table casework\.case_state_projection/iu);
  assert.match(migration, /create table casework\.case_transition_catalog/iu);
  assert.match(migration, /TASK3_PREDECESSOR_PREIMAGE_MISMATCH/u);
  assert.match(migration, /security definer[\s\S]*?set search_path\s*=\s*''/iu);
  assert.match(migration, /revoke all on function public\.drs_case_command_apply_v1/iu);
  assert.match(migration, /grant execute on function public\.drs_case_command_apply_v1[\s\S]*?to service_role/iu);
  assert.match(migration, /casework\.case_event_immutable_v1/u);
  assert.match(migration, /CASE_EVENT_CORRECTION_RECORDED/u);
  assert.match(migration, /journey_state_impact/iu);
  assert.match(migration, /sequence_no/iu);
  assert.match(migration, /drs_case_projection_replay_v1/iu);
  assert.match(migration, new RegExp(CATALOG_SHA256, "u"));
  assert.doesNotMatch(migration, /grant\s+(insert|update|delete)[\s\S]*?to authenticated/iu);
});

test("CommandReceipt core is immutable and replay metadata stays in an envelope", () => {
  const contracts = readFileSync(contractsUrl, "utf8");
  const migration = readFileSync(migrationUrl, "utf8");
  assert.match(contracts, /COMMAND_RECEIPT_SCHEMA_VERSION/u);
  assert.match(contracts, /COMMAND_RECEIPT_CORE_FIELDS/u);
  assert.match(contracts, /DrsCaseCommandExecutionEnvelope/u);
  assert.match(migration, /receipt_canonical\s+text\s+not\s+null/iu);
  assert.match(migration, /receipt_sha256\s+text\s+not\s+null/iu);
  assert.match(migration, /command_receipt_canonical_v1/iu);
  assert.doesNotMatch(
    migration,
    /existing_command\.receipt\s*\|\|\s*jsonb_build_object/iu,
  );
});

test("correction authorization and lineage are independent of current nextActor", () => {
  const migration = readFileSync(migrationUrl, "utf8");
  assert.match(migration, /CASE_EVENT_CORRECTION_TARGET_INVALID/u);
  assert.match(migration, /CASE_EVENT_CORRECTION_LINEAGE_INVALID/u);
  assert.match(migration, /CASE_EVENT_CORRECTION_NOT_AUTHORIZED/u);
  assert.match(migration, /CASE_EVENT_CORRECTION_VALUE_INVALID/u);
  assert.match(migration, /correction_actor_authorized_v1/iu);
  assert.match(migration, /correction_reason_valid_v1/iu);
  assert.match(
    migration,
    /order\s+by\s+event_id[\s\S]*?for\s+share/iu,
  );
});

test("D1-D10 evidence-negative matrix binds every denial set to the catalog", () => {
  const migration = readFileSync(migrationUrl, "utf8");
  assert.deepEqual(
    D1_D10_NEGATIVE_MATRIX.map(({ denialSet }) => denialSet),
    ["D1", "D2", "D3", "D4", "D5", "D6", "D7", "D8", "D9", "D10"],
  );
  for (const entry of D1_D10_NEGATIVE_MATRIX) {
    const row = parsedRows.find(({ ordinal }) => ordinal === entry.ordinal);
    assert.ok(row?.effects0DenialSets.includes(entry.denialSet));
    assert.match(entry.condition, /missing|drift|wrong-case|another case|stale/iu);
  }
  assert.match(
    migration,
    /'denialSet'\s*,\s*transition\.effects0_denial_sets\[2\]/u,
  );
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
returns trigger language plpgsql set search_path = '' as $$ begin return new; end; $$;
revoke all on function casework.manifest_probe_trigger()
  from public, anon, authenticated, service_role;
create function integration.google_calendar_drs_authorize_transaction_v1(
  p_user_id uuid, p_case_id uuid, p_provider text, p_action text
) returns jsonb language sql security definer set search_path = '' as $$
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

const STORAGE_PREDECESSOR_SQL = String.raw`
create schema if not exists storage;
create table if not exists storage.objects(id uuid primary key);
alter table storage.objects owner to postgres;
alter table storage.objects enable row level security;
`;

const CASEWORK_PREDECESSOR_SQL = String.raw`
alter table casework.case_members
  add column membership_id uuid not null default extensions.gen_random_uuid(),
  add constraint case_members_case_membership_unique unique (case_id, membership_id);
create table casework.case_events (
  event_id uuid primary key default extensions.gen_random_uuid(),
  case_id uuid not null references casework.cases(id) on delete restrict,
  event_type text not null check (
    event_type in ('CASE_CREATED','HIGHEST_REVIEWER_GRANTED','HIGHEST_REVIEWER_REVOKED')
  ),
  actor_user_id uuid not null references auth.users(id) on delete restrict,
  subject_user_id uuid references auth.users(id) on delete restrict,
  membership_id uuid,
  idempotency_key text not null
    check (length(idempotency_key) between 16 and 128)
    check (idempotency_key !~ '[[:space:][:cntrl:]]'),
  payload_sha256 text not null check (payload_sha256 ~ '^[a-f0-9]{64}$'),
  payload jsonb not null,
  occurred_at timestamptz not null default clock_timestamp(),
  unique (case_id, event_id),
  unique (actor_user_id, event_type, idempotency_key),
  foreign key (case_id, membership_id)
    references casework.case_members(case_id, membership_id) on delete restrict
);
create function casework.case_event_immutable_v1()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin raise exception 'CASE_EVENT_IMMUTABLE'; end;
$$;
create trigger case_events_immutable_v1
before update or delete on casework.case_events
for each row execute function casework.case_event_immutable_v1();
alter table casework.case_events enable row level security;
`;

const AUTH_HARNESS_SQL = String.raw`
create table auth.sessions (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  not_after timestamptz
);
alter table auth.sessions owner to postgres;
create function auth.jwt() returns jsonb language sql stable as $function$
  select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb;
$function$;
`;

const IDS = Object.freeze({
  caseA: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  caseB: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
  caseC: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
  owner: "11111111-1111-4111-8111-111111111111",
  vendor: "22222222-2222-4222-8222-222222222222",
  drs: "33333333-3333-4333-8333-333333333333",
  ownerB: "44444444-4444-4444-8444-444444444444",
  ownerC: "77777777-7777-4777-8777-777777777777",
  ownerSession: "51111111-1111-4111-8111-111111111111",
  vendorSession: "52222222-2222-4222-8222-222222222222",
  drsSession: "53333333-3333-4333-8333-333333333333",
  ownerBSession: "54444444-4444-4444-8444-444444444444",
  drsBSession1: "55555555-5555-4555-8555-555555555551",
  drsBSession2: "55555555-5555-4555-8555-555555555552",
  ownerMembership: "61111111-1111-4111-8111-111111111111",
  vendorMembership: "62222222-2222-4222-8222-222222222222",
  drsMembership: "63333333-3333-4333-8333-333333333333",
  ownerBMembership: "64444444-4444-4444-8444-444444444444",
  drsBMembership: "65555555-5555-4555-8555-555555555555",
  ownerTechnical: "71111111-1111-4111-8111-111111111111",
  vendorTechnical: "72222222-2222-4222-8222-222222222222",
  drsTechnical: "73333333-3333-4333-8333-333333333333",
  ownerBTechnical: "74444444-4444-4444-8444-444444444444",
  drsBTechnical1: "75555555-5555-4555-8555-555555555551",
  drsBTechnical2: "75555555-5555-4555-8555-555555555552",
});

const digests = Object.freeze({
  owner: "A".repeat(43),
  vendor: "B".repeat(43),
  drs: "C".repeat(43),
  ownerB: "D".repeat(43),
  drsB1: "E".repeat(43),
  drsB2: "F".repeat(43),
});

const DOCUMENTS = Object.freeze({
  quote: Object.freeze({
    id: "81111111-1111-4111-8111-111111111111",
    versionId: "91111111-1111-4111-8111-111111111111",
    ref: "dvr_11111111111111111111111111111111",
    sha: "a".repeat(64),
    kind: "quote",
  }),
  drawing: Object.freeze({
    id: "82222222-2222-4222-8222-222222222222",
    versionId: "92222222-2222-4222-8222-222222222222",
    ref: "dvr_22222222222222222222222222222222",
    sha: "b".repeat(64),
    kind: "drawing",
  }),
  contract: Object.freeze({
    id: "83333333-3333-4333-8333-333333333333",
    versionId: "93333333-3333-4333-8333-333333333333",
    ref: "dvr_33333333333333333333333333333333",
    sha: "c".repeat(64),
    kind: "contract",
  }),
  supplement1: Object.freeze({
    id: "84444444-4444-4444-8444-444444444444",
    versionId: "94444444-4444-4444-8444-444444444441",
    ref: "dvr_44444444444444444444444444444441",
    sha: "d".repeat(64),
    kind: "other_case_evidence",
  }),
  supplement2: Object.freeze({
    id: "84444444-4444-4444-8444-444444444444",
    versionId: "94444444-4444-4444-8444-444444444442",
    ref: "dvr_44444444444444444444444444444442",
    sha: "e".repeat(64),
    kind: "other_case_evidence",
  }),
  crossCase: Object.freeze({
    id: "85555555-5555-4555-8555-555555555555",
    versionId: "95555555-5555-4555-8555-555555555555",
    ref: "dvr_55555555555555555555555555555555",
    sha: "f".repeat(64),
    kind: "quote",
  }),
});

function evidenceFor(row, supplementIndex = 1) {
  const selectedSupplement = supplementIndex === 2
    ? DOCUMENTS.supplement2
    : DOCUMENTS.supplement1;
  const evidence = {};
  for (const key of row.requiredEvidenceRefs) {
    if (key === "dueTime") {
      evidence[key] = "2030-01-01T00:00:00.000Z";
    } else if (key === "quoteDocumentVersionRef") {
      evidence[key] = DOCUMENTS.quote.ref;
    } else if (key === "quoteSha256") {
      evidence[key] = DOCUMENTS.quote.sha;
    } else if (key === "drawingDocumentVersionRef") {
      evidence[key] = DOCUMENTS.drawing.ref;
    } else if (key === "drawingSha256") {
      evidence[key] = DOCUMENTS.drawing.sha;
    } else if (
      key === "contractDocumentVersionRef" ||
      key === "serviceContractVersionRef" ||
      key === "ownerVendorContractVersionRef"
    ) {
      evidence[key] = DOCUMENTS.contract.ref;
    } else if (
      key === "contractSha256" || key === "serviceContractSha256"
    ) {
      evidence[key] = DOCUMENTS.contract.sha;
    } else if (key === "paymentEvidenceVersionRef") {
      evidence[key] = DOCUMENTS.quote.ref;
    } else if (key === "paymentEvidenceSha256") {
      evidence[key] = DOCUMENTS.quote.sha;
    } else if (key === "mobilizationEvidenceVersionRef") {
      evidence[key] = DOCUMENTS.drawing.ref;
    } else if (key === "mobilizationEvidenceSha256") {
      evidence[key] = DOCUMENTS.drawing.sha;
    } else if (key === "supplementVersionRef") {
      evidence[key] = selectedSupplement.ref;
    } else if (key === "supplementSha256") {
      evidence[key] = selectedSupplement.sha;
    } else if (
      key === "documentVersionRefs" || key === "milestoneEvidenceVersionRefs"
    ) {
      evidence[key] = [DOCUMENTS.drawing.ref];
    } else if (key.endsWith("Refs")) {
      evidence[key] = [`ref_${row.ordinal}_${key}`];
    } else if (key.endsWith("Sha256")) {
      evidence[key] = "9".repeat(64);
    } else {
      evidence[key] = `ref_${row.ordinal}_${key}`;
    }
  }
  return evidence;
}

function commandIdentity(ordinal, suffix = 0) {
  const tail = String(ordinal * 10 + suffix).padStart(12, "0");
  return Object.freeze({
    commandId: `10000000-0000-4000-8000-${tail}`,
    idempotencyKey: `task3-case-a-${String(ordinal).padStart(2, "0")}-${suffix}-command`,
  });
}

const actors = Object.freeze({
  owner: Object.freeze({
    userId: IDS.owner,
    authSessionId: IDS.ownerSession,
    serverSessionId: IDS.ownerTechnical,
    digest: digests.owner,
  }),
  vendor: Object.freeze({
    userId: IDS.vendor,
    authSessionId: IDS.vendorSession,
    serverSessionId: IDS.vendorTechnical,
    digest: digests.vendor,
  }),
  drs: Object.freeze({
    userId: IDS.drs,
    authSessionId: IDS.drsSession,
    serverSessionId: IDS.drsTechnical,
    digest: digests.drs,
  }),
});

function rpcSql(actor, commandType, identity, expectedVersion, evidence, payloadOverride) {
  const payload = payloadOverride ?? sha256(
    `${commandType}\n${JSON.stringify(evidence)}`,
  );
  const dueTime = typeof evidence.dueTime === "string"
    ? `'${evidence.dueTime}'::timestamptz`
    : "null";
  const evidenceJson = JSON.stringify(evidence).replaceAll("'", "''")
    .replaceAll('"', '\\"');
  return `set role service_role; select public.drs_case_command_apply_v1('${actor.serverSessionId}','${actor.digest}','${actor.userId}','${actor.authSessionId}','${identity.commandId}','${commandType}','${identity.idempotencyKey}',${expectedVersion},'${payload}','${evidenceJson}'::jsonb,${dueTime})`;
}

function fixtureDocumentSql(
  document,
  caseId,
  creator,
  versionNo = 1,
  options = {},
) {
  const docRef = `doc_${document.id.replaceAll("-", "")}`;
  const objectKey = `cases/${caseId}/documents/${document.id}/versions/${document.versionId}/source.pdf`;
  const currentVersionId = options.currentVersionId ?? document.versionId;
  const documentInsert = options.includeDocument === false
    ? ""
    : String.raw`
insert into casework.documents(
  id, case_id, document_ref, document_kind, visibility, source_role,
  document_status, current_version_id, created_by
) values (
  '${document.id}', '${caseId}', '${docRef}', '${document.kind}',
  'PARTY_VISIBLE', 'OWNER', 'ACTIVE', '${currentVersionId}', '${creator}'
);`;
  return String.raw`
${documentInsert}
insert into casework.document_versions(
  id, case_id, document_id, version_ref, version_no, created_by, sha256,
  size_bytes, detected_mime, validation_state, lifecycle_state,
  idempotency_key, payload_sha256
) values (
  '${document.versionId}', '${caseId}', '${document.id}', '${document.ref}',
  ${versionNo}, '${creator}', '${document.sha}', 128, 'application/pdf',
  'FORMAL', 'ACTIVE', 'fixture-version-${document.versionId}', '${document.sha}'
);
insert into casework.document_version_sources(
  case_id, document_id, version_id, bucket_id, object_key, sha256,
  size_bytes, detected_mime, validation_state
) values (
  '${caseId}', '${document.id}', '${document.versionId}',
  'drs-case-records-private', '${objectKey}', '${document.sha}', 128,
  'application/pdf', 'CLEAN'
);
`;
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
      `laibe-data-r1-task3-${process.pid}`.slice(0, 63),
      "--label",
      "laibe.task=drs-case-event-ledger-r1",
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
  "real PostgreSQL: Task2 sessions drive gap-free Task3 journey, denials, replay, concurrency and correction",
  {
    skip: harnessAvailable
      ? false
      : "HOLD_DATA_R1_DISPOSABLE_PG_HARNESS_NOT_CONFIRMED",
    timeout: 180_000,
  },
  async () => {
    assert.equal(statSync(dockerPath).size, 43_247_024);
    assert.equal(sha256(readFileSync(dockerPath)), EXPECTED_DOCKER_SHA256);
    const bridge = readFileSync(bridgeUrl, "utf8");
    const documentMigration = readFileSync(documentMigrationUrl, "utf8");
    const authMigration = readFileSync(authMigrationUrl, "utf8");
    const task3Migration = readFileSync(migrationUrl, "utf8");
    assert.equal(sha256(bridge), EXPECTED_BRIDGE_SHA256);
    assert.equal(
      sha256(documentMigration),
      EXPECTED_DOCUMENT_MIGRATION_SHA256,
    );
    assert.equal(sha256(authMigration), EXPECTED_AUTH_MIGRATION_SHA256);
    assert.ok(task3Migration.length > 0);
    assert.doesNotMatch(task3Migration, /C:\\/u);

    const fixtureSql = String.raw`
insert into auth.users(id) values
  ('${IDS.owner}'), ('${IDS.vendor}'), ('${IDS.drs}'), ('${IDS.ownerB}'),
  ('${IDS.ownerC}');
insert into auth.sessions(id, user_id, not_after) values
  ('${IDS.ownerSession}', '${IDS.owner}', clock_timestamp() + interval '1 hour'),
  ('${IDS.vendorSession}', '${IDS.vendor}', clock_timestamp() + interval '1 hour'),
  ('${IDS.drsSession}', '${IDS.drs}', clock_timestamp() + interval '1 hour'),
  ('${IDS.ownerBSession}', '${IDS.ownerB}', clock_timestamp() + interval '1 hour'),
  ('${IDS.drsBSession1}', '${IDS.drs}', clock_timestamp() + interval '1 hour'),
  ('${IDS.drsBSession2}', '${IDS.drs}', clock_timestamp() + interval '1 hour');
insert into casework.cases(
  id, external_project_id, title, case_status, created_by, created_at, updated_at
) values
  ('${IDS.caseA}', 'DATA-R1-A', 'Sanitized Case A', 'active', '${IDS.owner}', clock_timestamp(), clock_timestamp()),
  ('${IDS.caseB}', 'DATA-R1-B', 'Sanitized Case B', 'active', '${IDS.ownerB}', clock_timestamp(), clock_timestamp());
insert into casework.case_members(case_id, user_id, role, added_by, added_at) values
  ('${IDS.caseA}', '${IDS.owner}', 'owner', '${IDS.owner}', clock_timestamp()),
  ('${IDS.caseA}', '${IDS.vendor}', 'pro', '${IDS.owner}', clock_timestamp()),
  ('${IDS.caseA}', '${IDS.drs}', 'pcm', '${IDS.owner}', clock_timestamp()),
  ('${IDS.caseB}', '${IDS.ownerB}', 'owner', '${IDS.ownerB}', clock_timestamp()),
  ('${IDS.caseB}', '${IDS.drs}', 'pcm', '${IDS.ownerB}', clock_timestamp());
insert into casework.drs_three_role_case_authority(
  case_id, authority_version, next_actor, updated_by, authority_basis
) values
  ('${IDS.caseA}', 4, 'drs', '${IDS.owner}', 'sanitized-task3-fixture'),
  ('${IDS.caseB}', 4, 'drs', '${IDS.ownerB}', 'sanitized-task3-fixture');
insert into casework.drs_three_role_memberships(
  membership_id, case_id, user_id, role, status, valid_from,
  invited_by, authority_source, authority_version
) values
  ('${IDS.ownerMembership}', '${IDS.caseA}', '${IDS.owner}', 'owner', 'active', clock_timestamp() - interval '1 minute', '${IDS.owner}', 'case_creation', 4),
  ('${IDS.vendorMembership}', '${IDS.caseA}', '${IDS.vendor}', 'vendor', 'active', clock_timestamp() - interval '1 minute', '${IDS.owner}', 'case_invitation', 4),
  ('${IDS.drsMembership}', '${IDS.caseA}', '${IDS.drs}', 'drs', 'active', clock_timestamp() - interval '1 minute', '${IDS.owner}', 'drs_assignment', 4),
  ('${IDS.ownerBMembership}', '${IDS.caseB}', '${IDS.ownerB}', 'owner', 'active', clock_timestamp() - interval '1 minute', '${IDS.ownerB}', 'case_creation', 4),
  ('${IDS.drsBMembership}', '${IDS.caseB}', '${IDS.drs}', 'drs', 'active', clock_timestamp() - interval '1 minute', '${IDS.ownerB}', 'drs_assignment', 4);
insert into casework.case_events(
  case_id, event_type, actor_user_id, idempotency_key, payload_sha256, payload
) values
  ('${IDS.caseA}', 'CASE_CREATED', '${IDS.owner}', 'task3-case-a-genesis', '${"1".repeat(64)}', '{"fixture":"genesis-a"}'::jsonb),
  ('${IDS.caseB}', 'CASE_CREATED', '${IDS.ownerB}', 'task3-case-b-genesis', '${"2".repeat(64)}', '{"fixture":"genesis-b"}'::jsonb);
insert into casework.case_events(
  case_id, event_type, actor_user_id, subject_user_id, membership_id,
  idempotency_key, payload_sha256, payload
)
select '${IDS.caseA}', 'HIGHEST_REVIEWER_GRANTED', '${IDS.owner}', '${IDS.drs}',
  membership_id, 'task3-authority-event-a', '${"3".repeat(64)}',
  '{"fixture":"authority-only"}'::jsonb
from casework.case_members
where case_id='${IDS.caseA}' and user_id='${IDS.drs}';
`;

    const documentSql = [
      "begin;",
      fixtureDocumentSql(DOCUMENTS.quote, IDS.caseA, IDS.owner),
      fixtureDocumentSql(DOCUMENTS.drawing, IDS.caseA, IDS.owner),
      fixtureDocumentSql(DOCUMENTS.contract, IDS.caseA, IDS.owner),
      fixtureDocumentSql(DOCUMENTS.supplement1, IDS.caseA, IDS.vendor, 1),
      fixtureDocumentSql(DOCUMENTS.supplement2, IDS.caseA, IDS.vendor, 2, {
        includeDocument: false,
      }),
      fixtureDocumentSql(DOCUMENTS.crossCase, IDS.caseB, IDS.ownerB),
      "commit;",
    ].join("\n");

    const shell = [
      "set -euo pipefail",
      "trap 'echo TASK3_HARNESS_FAILED_LINE=$LINENO >&2' ERR",
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
      "cat >/tmp/casework-predecessor.b64 <<'B64'",
      base64(CASEWORK_PREDECESSOR_SQL),
      "B64",
      "base64 -d /tmp/casework-predecessor.b64 >/tmp/casework-predecessor.sql",
      "cat >/tmp/storage-predecessor.b64 <<'B64'",
      base64(STORAGE_PREDECESSOR_SQL),
      "B64",
      "base64 -d /tmp/storage-predecessor.b64 >/tmp/storage-predecessor.sql",
      "cat >/tmp/bridge.b64 <<'B64'",
      base64(bridge),
      "B64",
      "base64 -d /tmp/bridge.b64 >/tmp/bridge.sql",
      "cat >/tmp/auth-r1.b64 <<'B64'",
      base64(authMigration),
      "B64",
      "base64 -d /tmp/auth-r1.b64 >/tmp/auth-r1.sql",
      "cat >/tmp/document-storage.b64 <<'B64'",
      base64(documentMigration),
      "B64",
      "base64 -d /tmp/document-storage.b64 >/tmp/document-storage.sql",
      "cat >/tmp/task3.b64 <<'B64'",
      base64(task3Migration),
      "B64",
      "base64 -d /tmp/task3.b64 >/tmp/task3.sql",
      "cat >/tmp/fixtures.b64 <<'B64'",
      base64(fixtureSql),
      "B64",
      "base64 -d /tmp/fixtures.b64 >/tmp/fixtures.sql",
      "cat >/tmp/documents.b64 <<'B64'",
      base64(documentSql),
      "B64",
      "base64 -d /tmp/documents.b64 >/tmp/documents.sql",
      "psql -X -qAt -v ON_ERROR_STOP=1 -f /tmp/setup.sql >/dev/null",
      "PGUSER=supabase_admin psql -X -qAt -v ON_ERROR_STOP=1 -f /tmp/auth-harness.sql >/dev/null",
      'sql() { psql -X -qAt -v ON_ERROR_STOP=1 -c "$1"; }',
      'apply_file() { psql -X -qAt -v ON_ERROR_STOP=1 -f "$1"; }',
      'expect_file_failure() { local file=$1 marker=$2 output status; set +e; output=$(apply_file "$file" 2>&1); status=$?; set -e; test $status -ne 0 || { echo "expected file failure: $marker" >&2; exit 71; }; grep -F "$marker" <<<"$output" >/dev/null || { echo "wrong SQL failure: $output" >&2; exit 72; }; }',
      'expect_sql_failure() { local statement=$1 marker=$2 output status; set +e; output=$(sql "$statement" 2>&1); status=$?; set -e; test $status -ne 0 || { echo "expected SQL failure: $marker" >&2; exit 73; }; grep -Fi "$marker" <<<"$output" >/dev/null || { echo "wrong SQL failure: $output" >&2; exit 74; }; }',
      "apply_file /tmp/bridge.sql >/dev/null",
      "apply_file /tmp/auth-r1.sql >/dev/null",
      "PGUSER=supabase_admin psql -X -qAt -v ON_ERROR_STOP=1 -f /tmp/storage-predecessor.sql >/dev/null",
      "apply_file /tmp/casework-predecessor.sql >/dev/null",
      "apply_file /tmp/document-storage.sql >/dev/null",
      "apply_file /tmp/fixtures.sql >/dev/null",
      'sql "alter table casework.case_events rename column payload_sha256 to payload_sha256_drift" >/dev/null',
      "expect_file_failure /tmp/task3.sql TASK3_PREDECESSOR_PREIMAGE_MISMATCH",
      'test "$(sql "select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname=\'casework\' and c.relname in (\'case_commands\',\'case_state_projection\',\'case_transition_catalog\')")" = "0"',
      'test "$(sql "select count(*) from information_schema.columns where table_schema=\'casework\' and table_name=\'case_events\' and column_name=\'sequence_no\'")" = "0"',
      'sql "alter table casework.case_events rename column payload_sha256_drift to payload_sha256" >/dev/null',
      "apply_file /tmp/task3.sql >/dev/null",
      "apply_file /tmp/documents.sql >/dev/null",
      "sql \"create function public.task3_test_relation_count(p_name text) returns bigint language plpgsql set search_path='' as \\\$function\\\$ declare count_value bigint; begin if to_regclass(p_name) is null then return 0; end if; execute format('select count(*) from %s',p_name) into count_value; return count_value; end \\\$function\\\$\" >/dev/null",
      'test "$(sql "select count(*) from casework.case_transition_catalog")" = "22"',
      `test "$(sql "select count(*) from casework.case_transition_catalog where catalog_hash='${CATALOG_SHA256}'")" = "22"`,
      `test "$(sql "select encode(extensions.digest(convert_to(string_agg(lpad(ordinal::text,2,'0')||'|'||step||'|'||from_state||'|'||command_type||'|'||event_type||'|'||array_to_string(allowed_roles,',')||'|'||to_state||'|'||next_actor_rule||'|'||array_to_string(required_evidence_refs,',')||'|'||array_to_string(effects0_denial_sets,',')||'|'||boundary,E'\\n' order by ordinal),'UTF8'),'sha256'),'hex') from casework.case_transition_catalog")" = "${CATALOG_SHA256}"`,
      `bind() { sql "set role service_role; select public.drs_three_role_auth_session_bind_v1('$1','$2','$3',clock_timestamp())" >/dev/null; }`,
      `issue() { sql "set role service_role; select public.drs_three_role_server_session_issue_v1('$1','$2','$3','$4',clock_timestamp(),clock_timestamp()+interval '30 minutes')" >/dev/null; }`,
      `bind '${IDS.owner}' '${IDS.ownerSession}' '${IDS.ownerMembership}'`,
      `bind '${IDS.vendor}' '${IDS.vendorSession}' '${IDS.vendorMembership}'`,
      `bind '${IDS.drs}' '${IDS.drsSession}' '${IDS.drsMembership}'`,
      `bind '${IDS.ownerB}' '${IDS.ownerBSession}' '${IDS.ownerBMembership}'`,
      `bind '${IDS.drs}' '${IDS.drsBSession1}' '${IDS.drsBMembership}'`,
      `bind '${IDS.drs}' '${IDS.drsBSession2}' '${IDS.drsBMembership}'`,
      `issue '${IDS.ownerTechnical}' '${digests.owner}' '${IDS.owner}' '${IDS.ownerSession}'`,
      `issue '${IDS.vendorTechnical}' '${digests.vendor}' '${IDS.vendor}' '${IDS.vendorSession}'`,
      `issue '${IDS.drsTechnical}' '${digests.drs}' '${IDS.drs}' '${IDS.drsSession}'`,
      `issue '${IDS.ownerBTechnical}' '${digests.ownerB}' '${IDS.ownerB}' '${IDS.ownerBSession}'`,
      `issue '${IDS.drsBTechnical1}' '${digests.drsB1}' '${IDS.drs}' '${IDS.drsBSession1}'`,
      `issue '${IDS.drsBTechnical2}' '${digests.drsB2}' '${IDS.drs}' '${IDS.drsBSession2}'`,
      `rls_scalar() { sql "begin; set local role authenticated; select set_config('request.jwt.claim.sub','$1',true); select set_config('request.jwt.claims',jsonb_build_object('sub','$1','session_id','$2')::text,true); $3; rollback" | tail -n1; }`,
      'effects() { sql "select jsonb_build_object(\'commands\',(select count(*) from casework.case_commands),\'events\',(select count(*) from casework.case_events),\'projections\',(select count(*) from casework.case_state_projection),\'versions\',(select coalesce(sum(case_version),0) from casework.case_state_projection),\'projectionHashes\',(select coalesce(string_agg(case_id::text||\':\'||projection_sha256,\',\' order by case_id),\'\') from casework.case_state_projection),\'authorityVersions\',(select coalesce(sum(authority_version),0) from casework.drs_three_role_case_authority),\'outbox\',jsonb_build_object(\'caseCommandOutbox\',public.task3_test_relation_count(\'casework.case_command_outbox\'),\'outboxMessages\',public.task3_test_relation_count(\'casework.outbox_messages\')),\'domain\',jsonb_build_object(\'submissionBundles\',public.task3_test_relation_count(\'casework.submission_bundles\'),\'reviewCycles\',public.task3_test_relation_count(\'casework.review_cycles\'),\'supplementRequests\',public.task3_test_relation_count(\'casework.supplement_requests\'),\'paymentEvidence\',public.task3_test_relation_count(\'casework.payment_evidence_records\'),\'mobilization\',public.task3_test_relation_count(\'casework.mobilization_records\')))"; }',
      'event_fingerprint() { sql "select encode(extensions.digest(convert_to(row_to_json(event_record)::text,\'UTF8\'),\'sha256\'),\'hex\') from casework.case_events event_record where event_id=\'$1\'"; }',
    ];

    const firstRow = parsedRows[0];
    const firstEvidence = evidenceFor(firstRow);
    const wrongIdentity = commandIdentity(90, 1);
    const staleIdentity = commandIdentity(90, 2);
    const crossIdentity = commandIdentity(90, 3);
    shell.push(
      "echo TASK3_STAGE=DENIALS >&2",
      "before_denials=$(effects)",
      `wrong=$(sql "${rpcSql(actors.owner, firstRow.commandType, wrongIdentity, 2, firstEvidence)}")`,
      'test "$(sql "select \'$wrong\'::jsonb->>\'state\'")" = "CASE_TRANSITION_NOT_AUTHORIZED"',
      `stale=$(sql "${rpcSql(actors.drs, firstRow.commandType, staleIdentity, 1, firstEvidence)}")`,
      'test "$(sql "select \'$stale\'::jsonb->>\'state\'")" = "CASE_VERSION_CONFLICT"',
    );
    const crossEvidence = {
      ...firstEvidence,
      quoteDocumentVersionRef: DOCUMENTS.crossCase.ref,
      quoteSha256: DOCUMENTS.crossCase.sha,
    };
    shell.push(
      `cross=$(sql "${rpcSql(actors.drs, firstRow.commandType, crossIdentity, 2, crossEvidence)}")`,
      'test "$(sql "select \'$cross\'::jsonb->>\'state\'")" = "EVIDENCE_REF_INVALID"',
      `combined=$(sql "${rpcSql(actors.drs, "SUBMIT_SUPPLEMENT_VERSION_AND_RECORD_SUCCESSOR_REVIEW_OUTCOME", commandIdentity(90, 4), 2, {}, "8".repeat(64))}")`,
      'test "$(sql "select \'$combined\'::jsonb->>\'state\'")" = "WRONG_ACTOR_CHAIN"',
      'test "$(effects)" = "$before_denials"',
      "echo TASK3_STAGE=JOURNEY >&2",
    );

    let expectedVersion = 2;
    const journey = [
      ...parsedRows.slice(0, 20).map((row) => ({ row, supplement: 1 })),
      { row: parsedRows[21], supplement: 1 },
      { row: parsedRows[19], supplement: 2 },
      { row: parsedRows[20], supplement: 2 },
    ];
    const actorChoice = [
      "drs", "drs", "drs", "owner", "drs", "drs", "vendor", "owner",
      "vendor", "owner", "drs", "vendor", "owner", "drs", "vendor", "drs",
      "owner", "vendor", "drs", "vendor", "drs", "vendor", "drs",
    ];
    const appliedCommands = [];
    const exercisedDenialSets = new Set();
    for (let index = 0; index < journey.length; index += 1) {
      const { row, supplement } = journey[index];
      const identity = commandIdentity(row.ordinal, index >= 20 ? index - 19 : 0);
      const evidence = evidenceFor(row, supplement);
      const actor = actors[actorChoice[index]];
      const variable = `journey_${index + 1}`;
      if (row.ordinal === 20 && supplement === 2) {
        shell.push(
          `sql "update casework.documents set current_version_id='${DOCUMENTS.supplement2.versionId}', updated_at=clock_timestamp() where id='${DOCUMENTS.supplement2.id}'" >/dev/null`,
        );
      }
      for (let matrixIndex = 0; matrixIndex < D1_D10_NEGATIVE_MATRIX.length; matrixIndex += 1) {
        const denial = D1_D10_NEGATIVE_MATRIX[matrixIndex];
        if (
          denial.ordinal !== row.ordinal ||
          exercisedDenialSets.has(denial.denialSet)
        ) continue;
        const invalidEvidence = denial.mutate({ ...evidence });
        const denialIdentity = commandIdentity(110 + matrixIndex, index);
        const denialVariable = `denial_${denial.denialSet}`;
        shell.push(
          `echo TASK3_NEGATIVE_${denial.denialSet}=${denial.condition.replaceAll(" ", "_")} >&2`,
          `before_${denial.denialSet}=$(effects)`,
          `${denialVariable}=$(sql "${rpcSql(actor, row.commandType, denialIdentity, expectedVersion, invalidEvidence)}")`,
          `test "$(sql "select '\$${denialVariable}'::jsonb->>'state'")" = "EVIDENCE_REF_INVALID"`,
          `test "$(sql "select '\$${denialVariable}'::jsonb->>'denialSet'")" = "${denial.denialSet}"`,
          `test "$(sql "select '\$${denialVariable}'::jsonb->>'newEffects'")" = "0"`,
          `test "$(effects)" = "$before_${denial.denialSet}"`,
        );
        exercisedDenialSets.add(denial.denialSet);
      }
      shell.push(
        `echo TASK3_JOURNEY_ORDINAL=${row.ordinal} >&2`,
        `${variable}=$(sql "${rpcSql(actor, row.commandType, identity, expectedVersion, evidence)}")`,
        `echo TASK3_JOURNEY_STATE=$(sql "select '\$${variable}'::jsonb->>'state'") NEW_EFFECTS=$(sql "select '\$${variable}'::jsonb->>'newEffects'") >&2`,
        `test "$(sql "select '\$${variable}'::jsonb->>'state'")" = "APPLIED"`,
        `test "$(sql "select '\$${variable}'::jsonb->>'newEffects'")" = "1"`,
      );
      appliedCommands.push({
        row,
        identity,
        evidence,
        actor,
        expectedVersion,
        variable,
      });
      expectedVersion += 1;
    }
    assert.deepEqual(
      [...exercisedDenialSets],
      D1_D10_NEGATIVE_MATRIX.map(({ denialSet }) => denialSet),
    );

    const replayed = appliedCommands[3];
    shell.push(
      "echo TASK3_STAGE=REPLAY_CORRECTION >&2",
      `replay=$(sql "${rpcSql(replayed.actor, replayed.row.commandType, replayed.identity, replayed.expectedVersion, replayed.evidence)}")`,
      'test "$(sql "select \'$replay\'::jsonb->>\'state\'")" = "REPLAYED"',
      'test "$(sql "select \'$replay\'::jsonb->>\'newEffects\'")" = "0"',
      "echo TASK3_RECEIPT_ASSERT=ENVELOPE_STATE >&2",
      `test "$(sql "select ('\$${replayed.variable}'::jsonb->'receipt')=('\$replay'::jsonb->'receipt')")" = "t"`,
      "echo TASK3_RECEIPT_ASSERT=CORE_EQUAL >&2",
      `test "$(sql "select ('\$${replayed.variable}'::jsonb->>'receiptCanonical')=('\$replay'::jsonb->>'receiptCanonical')")" = "t"`,
      "echo TASK3_RECEIPT_ASSERT=CANONICAL_EQUAL >&2",
      `test "$(sql "select ('\$${replayed.variable}'::jsonb->>'receiptSha256')=('\$replay'::jsonb->>'receiptSha256')")" = "t"`,
      "echo TASK3_RECEIPT_ASSERT=HASH_EQUAL >&2",
      `test "$(sql "select receipt=('\$replay'::jsonb->'receipt') and receipt_canonical=('\$replay'::jsonb->>'receiptCanonical') and receipt_sha256=('\$replay'::jsonb->>'receiptSha256') from casework.case_commands where case_id='${IDS.caseA}' and command_id='${replayed.identity.commandId}'")" = "t"`,
      "echo TASK3_RECEIPT_ASSERT=STORED_EQUAL >&2",
      `test "$(sql "select not (receipt ?| array['state','newEffects']) from casework.case_commands where case_id='${IDS.caseA}' and command_id='${replayed.identity.commandId}'")" = "t"`,
      "echo TASK3_RECEIPT_ASSERT=CORE_METADATA_FREE >&2",
      `test "$(sql "select receipt_sha256=drs_case_command_private.sha256_hex_v1(receipt_canonical) from casework.case_commands where case_id='${IDS.caseA}' and command_id='${replayed.identity.commandId}'")" = "t"`,
      "echo TASK3_RECEIPT_ASSERT=HASH_RECOMPUTED >&2",
      `test "$(sql "select (receipt->>'recordedAt')::timestamptz=date_trunc('milliseconds',recorded_at) from casework.case_commands where case_id='${IDS.caseA}' and command_id='${replayed.identity.commandId}'")" = "t"`,
      "echo TASK3_RECEIPT_ASSERT=RECORDED_AT_EQUAL >&2",
      `conflict=$(sql "${rpcSql(replayed.actor, replayed.row.commandType, { ...replayed.identity, commandId: commandIdentity(91, 1).commandId }, replayed.expectedVersion, replayed.evidence, "7".repeat(64))}")`,
      'test "$(sql "select \'$conflict\'::jsonb->>\'state\'")" = "IDEMPOTENCY_CONFLICT"',
      `owner_target_event=$(sql "select event_id from casework.case_events where case_id='${IDS.caseA}' and command_type='SUBMIT_SERVICE_CONTRACT_INTENT'")`,
      `vendor_target_event=$(sql "select event_id from casework.case_events where case_id='${IDS.caseA}' and command_type='SUBMIT_SUPPLEMENT_VERSION' order by sequence_no desc limit 1")`,
      `drs_target_event=$(sql "select event_id from casework.case_events where case_id='${IDS.caseA}' and command_type='RECORD_SUCCESSOR_REVIEW_OUTCOME' order by sequence_no desc limit 1")`,
      `unrelated_root_event=$(sql "select event_id from casework.case_events where case_id='${IDS.caseA}' and command_type='RECORD_FIRST_MILESTONE_WRITTEN_REVIEW'")`,
      `cross_case_event=$(sql "select event_id from casework.case_events where case_id='${IDS.caseB}' and event_type='CASE_CREATED'")`,
      "echo TASK3_RECEIPT_REPLAY_VERIFIED >&2",
    );

    function correctionSql(
      actor,
      identity,
      version,
      targetVariable,
      rootVariable,
      reasonCode,
      replacementEvidenceRef,
    ) {
      return rpcSql(
        actor,
        "RECORD_CASE_EVENT_CORRECTION",
        identity,
        version,
        {
          correctsEventId: "__TARGET_EVENT__",
          rootEventId: "__ROOT_EVENT__",
          reasonCode,
          replacementEvidenceRef,
        },
      ).replaceAll("__TARGET_EVENT__", `$${targetVariable}`)
        .replaceAll("__ROOT_EVENT__", `$${rootVariable}`);
    }

    function pushCorrectionDenial(
      variable,
      actor,
      identity,
      targetVariable,
      rootVariable,
      reasonCode,
      replacementEvidenceRef,
      expectedState,
    ) {
      shell.push(
        `echo TASK3_CORRECTION_DENIAL=${variable} >&2`,
        `before_${variable}=$(effects)`,
        `${variable}=$(sql "${correctionSql(actor, identity, expectedVersion, targetVariable, rootVariable, reasonCode, replacementEvidenceRef)}")`,
        `test "$(sql "select '\$${variable}'::jsonb->>'state'")" = "${expectedState}"`,
        `test "$(sql "select '\$${variable}'::jsonb->>'newEffects'")" = "0"`,
        `test "$(effects)" = "$before_${variable}"`,
      );
    }

    pushCorrectionDenial(
      "correction_wrong_actor",
      actors.vendor,
      commandIdentity(120, 1),
      "owner_target_event",
      "owner_target_event",
      "FACTUAL_EVIDENCE_REFERENCE_WRONG",
      "ref_vendor_cannot_correct_owner_fact",
      "CASE_EVENT_CORRECTION_NOT_AUTHORIZED",
    );
    pushCorrectionDenial(
      "correction_current_next_actor_not_owner",
      actors.owner,
      commandIdentity(120, 2),
      "vendor_target_event",
      "vendor_target_event",
      "FACTUAL_EVIDENCE_REFERENCE_WRONG",
      "ref_owner_cannot_correct_vendor_fact",
      "CASE_EVENT_CORRECTION_NOT_AUTHORIZED",
    );
    pushCorrectionDenial(
      "correction_drs_over_owner_fact",
      actors.drs,
      commandIdentity(120, 3),
      "owner_target_event",
      "owner_target_event",
      "DRS_RECORDING_ERROR",
      "ref_drs_cannot_correct_owner_fact",
      "CASE_EVENT_CORRECTION_NOT_AUTHORIZED",
    );
    pushCorrectionDenial(
      "correction_unrelated_root",
      actors.drs,
      commandIdentity(120, 4),
      "drs_target_event",
      "unrelated_root_event",
      "DRS_RECORDING_ERROR",
      "ref_unrelated_root_rejected",
      "CASE_EVENT_CORRECTION_LINEAGE_INVALID",
    );
    pushCorrectionDenial(
      "correction_cross_case",
      actors.drs,
      commandIdentity(120, 5),
      "cross_case_event",
      "cross_case_event",
      "DRS_RECORDING_ERROR",
      "ref_cross_case_rejected",
      "CASE_EVENT_CORRECTION_TARGET_INVALID",
    );
    pushCorrectionDenial(
      "correction_invalid_reason",
      actors.drs,
      commandIdentity(120, 6),
      "drs_target_event",
      "drs_target_event",
      "FACTUAL_EVIDENCE_REFERENCE_WRONG",
      "ref_invalid_drs_reason",
      "CASE_EVENT_CORRECTION_VALUE_INVALID",
    );
    pushCorrectionDenial(
      "correction_invalid_value",
      actors.drs,
      commandIdentity(120, 7),
      "drs_target_event",
      "drs_target_event",
      "DRS_RECORDING_ERROR",
      "",
      "CASE_EVENT_CORRECTION_VALUE_INVALID",
    );

    shell.push(
      `state_before_corrections=$(sql "select current_state||'|'||next_actor||'|'||coalesce(due_time::text,'') from casework.case_state_projection where case_id='${IDS.caseA}'")`,
      'drs_original_before=$(event_fingerprint "$drs_target_event")',
      `drs_correction=$(sql "${correctionSql(actors.drs, commandIdentity(121, 1), expectedVersion, "drs_target_event", "drs_target_event", "DRS_RECORDING_ERROR", "ref_corrected_drs_recording_evidence")}")`,
      'test "$(sql "select \'$drs_correction\'::jsonb->>\'state\'")" = "APPLIED"',
      'test "$(sql "select \'$drs_correction\'::jsonb->>\'newEffects\'")" = "1"',
      'drs_correction_event=$(sql "select \'$drs_correction\'::jsonb->\'receipt\'->>\'eventId\'")',
      'test "$(event_fingerprint "$drs_target_event")" = "$drs_original_before"',
      `test "$(sql "select count(*) from casework.case_events where case_id='${IDS.caseA}' and event_id='$drs_correction_event' and corrects_event_id='$drs_target_event' and root_event_id='$drs_target_event' and event_type='CASE_EVENT_CORRECTION_RECORDED' and journey_state_impact='NONE'")" = "1"`,
      `test "$(sql "select current_state||'|'||next_actor||'|'||coalesce(due_time::text,'') from casework.case_state_projection where case_id='${IDS.caseA}'")" = "$state_before_corrections"`,
    );
    expectedVersion += 1;

    pushCorrectionDenial(
      "correction_root_cycle",
      actors.drs,
      commandIdentity(121, 2),
      "drs_correction_event",
      "drs_correction_event",
      "DRS_RECORDING_ERROR",
      "ref_correction_root_cycle_rejected",
      "CASE_EVENT_CORRECTION_LINEAGE_INVALID",
    );

    shell.push(
      `drs_chain_correction=$(sql "${correctionSql(actors.drs, commandIdentity(121, 3), expectedVersion, "drs_correction_event", "drs_target_event", "DRS_RECORDING_ERROR", "ref_corrected_drs_chain_evidence")}")`,
      'test "$(sql "select \'$drs_chain_correction\'::jsonb->>\'state\'")" = "APPLIED"',
      'test "$(sql "select \'$drs_chain_correction\'::jsonb->>\'newEffects\'")" = "1"',
      'drs_chain_correction_event=$(sql "select \'$drs_chain_correction\'::jsonb->\'receipt\'->>\'eventId\'")',
      'test "$(event_fingerprint "$drs_target_event")" = "$drs_original_before"',
      `test "$(sql "select count(*) from casework.case_events where case_id='${IDS.caseA}' and event_id='$drs_chain_correction_event' and corrects_event_id='$drs_correction_event' and root_event_id='$drs_target_event' and event_type='CASE_EVENT_CORRECTION_RECORDED' and journey_state_impact='NONE'")" = "1"`,
      `test "$(sql "select current_state||'|'||next_actor||'|'||coalesce(due_time::text,'') from casework.case_state_projection where case_id='${IDS.caseA}'")" = "$state_before_corrections"`,
    );
    expectedVersion += 1;

    shell.push(
      'owner_original_before=$(event_fingerprint "$owner_target_event")',
      `owner_correction=$(sql "${correctionSql(actors.owner, commandIdentity(122, 1), expectedVersion, "owner_target_event", "owner_target_event", "FACTUAL_EVIDENCE_REFERENCE_WRONG", "ref_corrected_service_contract_evidence")}")`,
      'test "$(sql "select \'$owner_correction\'::jsonb->>\'state\'")" = "APPLIED"',
      'test "$(sql "select \'$owner_correction\'::jsonb->>\'newEffects\'")" = "1"',
      'owner_correction_event=$(sql "select \'$owner_correction\'::jsonb->\'receipt\'->>\'eventId\'")',
      'test "$(event_fingerprint "$owner_target_event")" = "$owner_original_before"',
      `test "$(sql "select count(*) from casework.case_events where case_id='${IDS.caseA}' and event_id='$owner_correction_event' and corrects_event_id='$owner_target_event' and root_event_id='$owner_target_event' and event_type='CASE_EVENT_CORRECTION_RECORDED' and journey_state_impact='NONE'")" = "1"`,
      `test "$(sql "select current_state||'|'||next_actor||'|'||coalesce(due_time::text,'') from casework.case_state_projection where case_id='${IDS.caseA}'")" = "$state_before_corrections"`,
      `test "$(sql "select receipt->>'catalogSchemaVersion' is null and receipt->>'catalogHash' is null from casework.case_commands where case_id='${IDS.caseA}' and command_id='${commandIdentity(122, 1).commandId}'")" = "t"`,
      `expect_sql_failure "update casework.case_events set payload='{}'::jsonb where event_id='$owner_target_event'" CASE_EVENT_IMMUTABLE`,
      `expect_sql_failure "delete from casework.case_events where event_id='$owner_target_event'" CASE_EVENT_IMMUTABLE`,
      `test "$(sql "select (casework.drs_case_projection_replay_v1('${IDS.caseA}')->>'projectionSha256' = projection_sha256)::text from casework.case_state_projection where case_id='${IDS.caseA}'")" = "true"`,
      `test "$(sql "select count(*)=max(sequence_no) and count(*)=count(distinct sequence_no) from casework.case_events where case_id='${IDS.caseA}'")" = "t"`,
      `test "$(sql "select count(*) from casework.case_events where case_id='${IDS.caseA}' and event_type='HIGHEST_REVIEWER_GRANTED' and journey_state_impact='NONE'")" = "1"`,
      "echo TASK3_STAGE=RACE_RLS_INVALIDATION >&2",
    );
    expectedVersion += 1;

    const correctionEvidence = {
      correctsEventId: "__TARGET_EVENT__",
      rootEventId: "__TARGET_EVENT__",
      reasonCode: "FACTUAL_EVIDENCE_REFERENCE_WRONG",
      replacementEvidenceRef: "ref_corrected_service_contract_evidence",
    };

    const raceEvidence = {
      ...evidenceFor(firstRow),
      quoteDocumentVersionRef: DOCUMENTS.crossCase.ref,
      quoteSha256: DOCUMENTS.crossCase.sha,
    };
    const raceA = rpcSql(
      {
        userId: IDS.drs,
        authSessionId: IDS.drsBSession1,
        serverSessionId: IDS.drsBTechnical1,
        digest: digests.drsB1,
      },
      firstRow.commandType,
      commandIdentity(93, 1),
      1,
      raceEvidence,
    );
    const raceB = rpcSql(
      {
        userId: IDS.drs,
        authSessionId: IDS.drsBSession2,
        serverSessionId: IDS.drsBTechnical2,
        digest: digests.drsB2,
      },
      firstRow.commandType,
      commandIdentity(93, 2),
      1,
      raceEvidence,
    );
    shell.push(
      `PGAPPNAME=task3_race_a psql -X -qAt -v ON_ERROR_STOP=1 -c "${raceA}" >/tmp/race-a.out & race_a=$!`,
      `PGAPPNAME=task3_race_b psql -X -qAt -v ON_ERROR_STOP=1 -c "${raceB}" >/tmp/race-b.out & race_b=$!`,
      'wait "$race_a"; wait "$race_b"',
      "cat /tmp/race-a.out /tmp/race-b.out >&2",
      'race_applied=$(grep -h -o \'"state": "APPLIED"\' /tmp/race-a.out /tmp/race-b.out | wc -l || true)',
      'race_conflict=$(grep -h -o \'"state": "CASE_VERSION_CONFLICT"\' /tmp/race-a.out /tmp/race-b.out | wc -l || true)',
      'echo TASK3_RACE_APPLIED=$race_applied TASK3_RACE_CONFLICT=$race_conflict >&2',
      'test "$race_applied" = "1"',
      'test "$race_conflict" = "1"',
      `test "$(sql "select count(*) from casework.case_commands where case_id='${IDS.caseB}'")" = "1"`,
      `test "$(sql "select count(*) from casework.case_events where case_id='${IDS.caseB}'")" = "2"`,
      `test "$(rls_scalar '${IDS.owner}' '${IDS.ownerSession}' "select count(*) from casework.case_state_projection where case_id='${IDS.caseA}'")" = "1"`,
      `test "$(rls_scalar '${IDS.owner}' '${IDS.ownerSession}' "select count(*) from casework.case_state_projection where case_id='${IDS.caseB}'")" = "0"`,
      `test "$(rls_scalar '${IDS.vendor}' '${IDS.vendorSession}' "select count(*) from casework.case_events where case_id='${IDS.caseA}'")" -gt "0"`,
      `test "$(rls_scalar '${IDS.drs}' '${IDS.drsSession}' "select count(*) from casework.case_events where case_id='${IDS.caseB}'")" = "0"`,
      `sql "update casework.drs_three_role_memberships set status='revoked', revoked_at=clock_timestamp(), updated_at=clock_timestamp() where membership_id='${IDS.drsMembership}'" >/dev/null`,
      `before_revoked=$(effects)`,
      `revoked=$(sql "${rpcSql(actors.drs, "RECORD_CASE_EVENT_CORRECTION", commandIdentity(94, 1), expectedVersion, correctionEvidence).replaceAll("__TARGET_EVENT__", "$owner_target_event")}")`,
      'test "$(sql "select \'$revoked\'::jsonb->>\'state\'")" = "AUTH_SESSION_OR_CASE_AUTHORITY_INVALID"',
      'test "$(effects)" = "$before_revoked"',
      `sql "update auth.sessions set not_after=clock_timestamp()-interval '1 minute' where id='${IDS.ownerBSession}'" >/dev/null`,
      `before_expired=$(effects)`,
      `expired=$(sql "${rpcSql({ userId: IDS.ownerB, authSessionId: IDS.ownerBSession, serverSessionId: IDS.ownerBTechnical, digest: digests.ownerB }, "RECORD_CASE_EVENT_CORRECTION", commandIdentity(94, 2), 2, correctionEvidence).replaceAll("__TARGET_EVENT__", "$owner_target_event")}")`,
      'test "$(sql "select \'$expired\'::jsonb->>\'state\'")" = "AUTH_SESSION_OR_CASE_AUTHORITY_INVALID"',
      'test "$(effects)" = "$before_expired"',
      `sql "update casework.drs_three_role_memberships set authority_version=5, updated_at=clock_timestamp() where membership_id='${IDS.vendorMembership}'; update casework.drs_three_role_case_authority set authority_version=5, updated_at=clock_timestamp() where case_id='${IDS.caseA}'" >/dev/null`,
      `before_stale_authority=$(effects)`,
      `stale_authority=$(sql "${rpcSql(actors.vendor, "RECORD_CASE_EVENT_CORRECTION", commandIdentity(94, 3), expectedVersion, correctionEvidence).replaceAll("__TARGET_EVENT__", "$owner_target_event")}")`,
      'test "$(sql "select \'$stale_authority\'::jsonb->>\'state\'")" = "AUTH_SESSION_OR_CASE_AUTHORITY_INVALID"',
      'test "$(effects)" = "$before_stale_authority"',
      `legacy_before=$(sql "select case_version from casework.case_state_projection where case_id='${IDS.caseA}'")`,
      `sql "insert into casework.case_events(case_id,event_type,actor_user_id,idempotency_key,payload_sha256,payload,document_id,document_version_id) values ('${IDS.caseA}','DOCUMENT_DOWNLOAD_ACCESSED','${IDS.owner}','task3-legacy-event-after-ledger','${"6".repeat(64)}','{\\"fixture\\":\\"legacy-compatible\\"}'::jsonb,'${DOCUMENTS.quote.id}','${DOCUMENTS.quote.versionId}')" >/dev/null`,
      `test "$(sql "select case_version from casework.case_state_projection where case_id='${IDS.caseA}'")" = "$((legacy_before+1))"`,
      `test "$(sql "select journey_state_impact from casework.case_events where case_id='${IDS.caseA}' order by sequence_no desc limit 1")" = "NONE"`,
      `test "$(sql "select (casework.drs_case_projection_replay_v1('${IDS.caseA}')->>'projectionSha256'=projection_sha256)::text from casework.case_state_projection where case_id='${IDS.caseA}'")" = "true"`,
      "echo TASK3_STAGE=FUTURE_CASE_LIFECYCLE >&2",
      `sql "insert into casework.cases(id,external_project_id,title,case_status,created_by,created_at,updated_at) values ('${IDS.caseC}','DATA-R1-C','Sanitized Future Case','active','${IDS.ownerC}',clock_timestamp(),clock_timestamp()); insert into casework.case_members(case_id,user_id,role,added_by,added_at) values ('${IDS.caseC}','${IDS.ownerC}','owner','${IDS.ownerC}',clock_timestamp()); insert into casework.case_events(case_id,event_type,actor_user_id,idempotency_key,payload_sha256,payload) values ('${IDS.caseC}','CASE_CREATED','${IDS.ownerC}','task3-future-case-created-event','${"5".repeat(64)}','{\\"fixture\\":\\"future-case\\"}'::jsonb)" >/dev/null`,
      `echo TASK3_FUTURE_AFTER_EVENT=$(sql "select count(*) from casework.case_state_projection where case_id='${IDS.caseC}'") >&2`,
      `test "$(sql "select count(*) from casework.case_state_projection where case_id='${IDS.caseC}'")" = "0"`,
      `sql "insert into casework.drs_three_role_case_authority(case_id,authority_version,next_actor,updated_by,authority_basis) values ('${IDS.caseC}',1,'drs','${IDS.ownerC}','sanitized-task3-future-case')" >/dev/null`,
      `echo TASK3_FUTURE_AFTER_AUTHORITY=$(sql "select case_version||'|'||current_state||'|'||next_actor||'|'||last_sequence_no from casework.case_state_projection where case_id='${IDS.caseC}'") >&2`,
      `test "$(sql "select case_version||'|'||current_state||'|'||next_actor||'|'||last_sequence_no from casework.case_state_projection where case_id='${IDS.caseC}'")" = "2|CASE_PREPARATION|drs|2"`,
      `test "$(sql "select event_type||'|'||journey_state_impact from casework.case_events where case_id='${IDS.caseC}' order by sequence_no desc limit 1")" = "CASE_AUTHORITY_CONTEXT_RECORDED|NONE"`,
      `test "$(sql "select (casework.drs_case_projection_replay_v1('${IDS.caseC}')->>'projectionSha256'=projection_sha256)::text from casework.case_state_projection where case_id='${IDS.caseC}'")" = "true"`,
      "echo DATA_R1_TASK3_REAL_PG_PASS",
    );

    const result = await runDocker(shell.join("\n"));
    assert.equal(
      result.code,
      0,
      `disposable PostgreSQL harness failed\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`,
    );
    assert.match(result.stdout, /DATA_R1_TASK3_REAL_PG_PASS/u);
  },
);

test("Task3 migration discovery remains exactly one generated path", () => {
  const names = readdirSync(new URL("migrations/", rootUrl)).filter((name) =>
    /^\d+_drs_case_event_ledger_r1\.sql$/u.test(name)
  );
  assert.deepEqual(names, ["20260901192440_drs_case_event_ledger_r1.sql"]);
});
