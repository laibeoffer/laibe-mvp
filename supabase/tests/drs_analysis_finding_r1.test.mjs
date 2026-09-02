import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  existsSync,
  readFileSync,
  readdirSync,
} from "node:fs";
import process from "node:process";
import test from "node:test";

const rootUrl = new URL("../", import.meta.url);
const migrationsUrl = new URL("../migrations/", import.meta.url);
const worktreeUrl = new URL("../../", import.meta.url);
const migrationPattern = /^(\d{14})_drs_analysis_finding_r1\.sql$/u;

async function optionalModule(relativeUrl) {
  try {
    return await import(new URL(relativeUrl, import.meta.url));
  } catch (error) {
    if (error?.code === "ERR_MODULE_NOT_FOUND") return Object.freeze({});
    throw error;
  }
}

function requiredFunction(module, name) {
  assert.equal(
    typeof module[name],
    "function",
    `missing required analysis behavior: ${name}`,
  );
  return module[name];
}

function fixture(name) {
  return JSON.parse(
    readFileSync(
      new URL(`../../tests/fixtures/a4-r1-ai/${name}`, import.meta.url),
      "utf8",
    ),
  );
}

const contracts = await optionalModule(
  "../functions/_shared/drs-analysis/contracts.ts",
);
const enqueueModule = await optionalModule(
  "../functions/drs-analysis-enqueue/index.ts",
);
const workerModule = await optionalModule(
  "../functions/drs-analysis-worker/index.ts",
);

const CASE_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const CASE_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const RUN_ID = "66666666-6060-4060-8060-606060606060";
const RUN_KEY = "f".repeat(64);
const quoteFixture = fixture("quote-001.json");
const quoteDocuments = quoteFixture.documents.map((document, index) => ({
  ordinal: index + 1,
  caseId: quoteFixture.caseId,
  ...document,
}));
const runtimeDocuments = Object.freeze([quoteDocuments[0]]);

function enqueueRequest(overrides = {}) {
  return {
    schemaVersion: "laibe.drs.analysis-enqueue.request.v1",
    inputManifestSha256: "1".repeat(64),
    documents: quoteDocuments,
    prompt: { version: "healthcheck-prompt-v1", sha256: "2".repeat(64) },
    model: {
      adapterVersion: "provider-neutral-adapter-v1",
      profileVersion: "deterministic-local-profile-v1",
    },
    rule: { version: "healthcheck-rules-v1", sha256: "3".repeat(64) },
    outputSchema: {
      version: "laibe.drs.analysis-output.v1",
      sha256: "4".repeat(64),
    },
    ...overrides,
  };
}

function quoteCitation(overrides = {}) {
  return {
    kind: "quote_row",
    caseId: CASE_A,
    documentId: quoteDocuments[0].documentId,
    documentVersionId: quoteDocuments[0].documentVersionId,
    documentSha256: quoteDocuments[0].sha256,
    page: 2,
    row: 7,
    ...overrides,
  };
}

function finding(overrides = {}) {
  return {
    schemaVersion: "laibe.drs.analysis-finding-draft.v1",
    findingId: "77777777-7070-4070-8070-707070707070",
    findingVersion: 1,
    runId: RUN_ID,
    runKeySha256: RUN_KEY,
    caseId: CASE_A,
    domain: "quote",
    code: "QUOTE_TEST_RISK",
    classification: "risk",
    severity: "high",
    statement: "報價項目仍需由 DRS 依原始版本確認。",
    rationale: "同一份不可變版本中的欄位需要人工覆核。",
    citations: [quoteCitation()],
    unknowns: [],
    sourceDocumentVersions: [{
      documentId: quoteDocuments[0].documentId,
      documentVersionId: quoteDocuments[0].documentVersionId,
      documentSha256: quoteDocuments[0].sha256,
    }],
    providerNeutral: true,
    humanReviewRequired: true,
    formalImpact: "none",
    lifecycle: "current",
    ...overrides,
  };
}

function analysisOutput(overrides = {}) {
  return {
    schemaVersion: "laibe.drs.analysis-output.v1",
    runId: RUN_ID,
    runKeySha256: RUN_KEY,
    caseId: CASE_A,
    providerNeutral: true,
    humanReviewRequired: true,
    formalImpact: "none",
    findings: [finding()],
    ...overrides,
  };
}

function findingForClaim(claim, overrides = {}) {
  return finding({
    runId: claim.runId,
    runKeySha256: claim.runKeySha256,
    ...overrides,
  });
}

function analysisOutputForClaim(claim, overrides = {}) {
  return analysisOutput({
    runId: claim.runId,
    runKeySha256: claim.runKeySha256,
    findings: [findingForClaim(claim)],
    ...overrides,
  });
}

function runContext(overrides = {}) {
  return {
    runId: RUN_ID,
    runKeySha256: RUN_KEY,
    caseId: CASE_A,
    documents: quoteDocuments,
    ...overrides,
  };
}

test("contract parser binds ordered same-case immutable versions and canonical run identity", async () => {
  const parse = requiredFunction(contracts, "parseAnalysisEnqueueRequest");
  const canonicalRunKeySha256 = requiredFunction(
    contracts,
    "canonicalRunKeySha256",
  );
  const parsed = parse(enqueueRequest(), CASE_A);
  assert.ok(parsed);
  assert.deepEqual(parsed.documents.map((document) => document.ordinal), [1, 2]);
  assert.equal(await canonicalRunKeySha256(parsed), await canonicalRunKeySha256(parsed));
  assert.match(await canonicalRunKeySha256(parsed), /^[a-f0-9]{64}$/u);
});

test("cross-case analysis input is rejected before any effect", () => {
  const parse = requiredFunction(contracts, "parseAnalysisEnqueueRequest");
  const crossCase = enqueueRequest({
    documents: quoteDocuments.map((document) => ({ ...document, caseId: CASE_B })),
  });
  assert.equal(parse(crossCase, CASE_A), null);
});

test("invalid output schema, human review false, or formal impact is rejected", () => {
  const validate = requiredFunction(contracts, "validateAnalysisOutput");
  assert.equal(
    validate(runContext(), analysisOutput({ schemaVersion: "wrong" })),
    null,
  );
  assert.equal(
    validate(runContext(), analysisOutput({ humanReviewRequired: false })),
    null,
  );
  assert.equal(
    validate(runContext(), analysisOutput({ formalImpact: "case_transition" })),
    null,
  );
});

test("high-risk finding without an exact citation is rejected", () => {
  const validate = requiredFunction(contracts, "validateAnalysisOutput");
  assert.equal(
    validate(
      runContext(),
      analysisOutput({ findings: [finding({ citations: [] })] }),
    ),
    null,
  );
});

test("UNKNOWN requires evidence, exact source versions, citations, and a next actor", () => {
  const validate = requiredFunction(contracts, "validateAnalysisOutput");
  const unknown = finding({
    classification: "unknown",
    severity: "medium",
    unknowns: [{
      code: "QUOTE_REQUIRED_FIELD_UNKNOWN",
      requiredEvidence: "補充數量與單價明細",
      sourceDocumentVersions: finding().sourceDocumentVersions,
      citations: [quoteCitation()],
      nextActor: "vendor",
    }],
  });
  assert.ok(validate(runContext(), analysisOutput({ findings: [unknown] })));
  assert.equal(
    validate(
      runContext(),
      analysisOutput({
        findings: [finding({
          classification: "unknown",
          severity: "medium",
          unknowns: [{
            code: "QUOTE_REQUIRED_FIELD_UNKNOWN",
            requiredEvidence: "",
            sourceDocumentVersions: [],
            citations: [],
            nextActor: "",
          }],
        })],
      }),
    ),
    null,
  );
});

test("structural, fire, code, MEP, waterproof, and sign-off findings require external review", () => {
  const validate = requiredFunction(contracts, "validateAnalysisOutput");
  for (const code of [
    "STRUCTURAL_REVIEW_REQUIRED",
    "FIRE_CODE_REVIEW_REQUIRED",
    "MEP_REVIEW_REQUIRED",
    "WATERPROOF_REVIEW_REQUIRED",
    "PROFESSIONAL_SIGN_OFF_REQUIRED",
  ]) {
    const draft = finding({
      code,
      classification: "unknown",
      unknowns: [{
        code,
        requiredEvidence: "專業人員書面覆核",
        sourceDocumentVersions: finding().sourceDocumentVersions,
        citations: [quoteCitation()],
        nextActor: "drs",
      }],
    });
    assert.equal(
      validate(runContext(), analysisOutput({ findings: [draft] })),
      null,
      code,
    );
  }
});

test("prompt injection cannot call tools or create commands, decisions, or events", async () => {
  const runWorker = requiredFunction(workerModule, "runAnalysisWorkerOnce");
  const adversarial = fixture("fixture-001.json");
  let completeEffects = 0;
  let failEffects = 0;
  let commandEffects = 0;
  let decisionEffects = 0;
  let eventEffects = 0;
  let claimed = false;
  const queue = {
    async claim() {
      if (claimed) return null;
      claimed = true;
      return {
        jobId: "88888888-8080-4080-8080-808080808080",
        workerId: "99999999-9090-4090-8090-909090909090",
        input: runContext(),
        untrustedDocumentText: adversarial.untrustedDocumentText,
      };
    },
    async complete() {
      completeEffects += 1;
      return { state: "APPLIED", newEffects: 1 };
    },
    async fail() {
      failEffects += 1;
      return { state: "FAILED", newEffects: 1 };
    },
  };
  const provider = {
    async analyze() {
      return {
        ...analysisOutput(),
        toolCalls: [{ name: "create_case_event" }],
        command: { type: "RECORD_QUOTE_HEALTHCHECK_OUTCOME" },
        decision: { type: "accept" },
        event: { type: "QUOTE_HEALTHCHECK_OUTCOME_RECORDED" },
      };
    },
  };
  await runWorker({
    workerId: "99999999-9090-4090-8090-909090909090",
    queue,
    provider,
    formalEffects: {
      command: () => commandEffects += 1,
      decision: () => decisionEffects += 1,
      event: () => eventEffects += 1,
    },
  });
  assert.equal(completeEffects, 0);
  assert.equal(failEffects, 1);
  assert.equal(commandEffects, 0);
  assert.equal(decisionEffects, 0);
  assert.equal(eventEffects, 0);
});

test("PII and secret sentinels never enter logs or enqueue receipts", async () => {
  const createHandler = requiredFunction(
    enqueueModule,
    "createAnalysisEnqueueHandler",
  );
  const adversarial = fixture("fixture-001.json");
  const logs = [];
  const receipts = [];
  const handler = createHandler({
    resolveSessionContext: async () => ({
      userId: "33333333-3333-4333-8333-333333333333",
      sessionId: "63333333-3333-4333-8333-333333333333",
      caseId: CASE_A,
      membershipId: "73333333-3333-4333-8333-333333333333",
      role: "drs",
      authorityVersion: 4,
      nextActor: "drs",
    }),
    repository: {
      async enqueue(input) {
        receipts.push(input);
        return { state: "APPLIED", newEffects: 1, runKeySha256: RUN_KEY };
      },
    },
    logger: { info: (...args) => logs.push(args) },
  });
  const response = await handler(new Request("http://local/drs-analysis-enqueue", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      ...enqueueRequest(),
      contact: adversarial.piiSentinel,
      apiToken: adversarial.secretSentinel,
    }),
  }));
  assert.equal(response.status, 400);
  assert.equal(receipts.length, 0);
  const serialized = JSON.stringify({ logs, receipts });
  assert.equal(serialized.includes(adversarial.piiSentinel), false);
  assert.equal(serialized.includes(adversarial.secretSentinel), false);
});

test("duplicate worker delivery for one run key has one durable effect", async () => {
  const runWorker = requiredFunction(workerModule, "runAnalysisWorkerOnce");
  let claimCount = 0;
  let providerCalls = 0;
  let completeEffects = 0;
  const queue = {
    async claim() {
      claimCount += 1;
      return claimCount === 1
        ? {
          jobId: "88888888-8080-4080-8080-808080808080",
          workerId: "99999999-9090-4090-8090-909090909090",
          input: runContext(),
        }
        : null;
    },
    async complete() {
      completeEffects += 1;
      return { state: "APPLIED", newEffects: 1 };
    },
    async fail() {
      assert.fail("valid deterministic provider output must not fail");
    },
  };
  const provider = {
    async analyze() {
      providerCalls += 1;
      return analysisOutput();
    },
  };
  const dependencies = {
    workerId: "99999999-9090-4090-8090-909090909090",
    queue,
    provider,
  };
  const first = await runWorker(dependencies);
  const second = await runWorker(dependencies);
  assert.equal(first.state, "APPLIED");
  assert.equal(second.state, "IDLE");
  assert.equal(providerCalls, 1);
  assert.equal(completeEffects, 1);
});

test("UI read model explicitly separates AI draft, DRS review, party statement, and owner decision", () => {
  const build = requiredFunction(contracts, "buildFindingReadModel");
  const pending = build(finding(), null);
  assert.deepEqual(pending, {
    findingSource: "AI_DRAFT",
    reviewState: "PENDING_DRS_REVIEW",
    finding: finding(),
    drsReview: null,
    partyStatement: null,
    ownerDecision: null,
  });
});

test("exactly one frozen migration contains queue, immutable finding, review, RLS, and invalidation contracts", () => {
  const migrations = readdirSync(migrationsUrl).filter((name) =>
    migrationPattern.test(name)
  );
  assert.deepEqual(migrations, ["20260902004813_drs_analysis_finding_r1.sql"]);
  const source = readFileSync(new URL(migrations[0], migrationsUrl), "utf8");
  for (const required of [
    "casework.drs_analysis_jobs",
    "casework.drs_analysis_job_documents",
    "casework.drs_analysis_runs",
    "casework.drs_analysis_run_documents",
    "casework.drs_analysis_findings",
    "casework.drs_analysis_finding_citations",
    "casework.drs_analysis_finding_lifecycle_events",
    "casework.drs_analysis_review_decisions",
    "server_drs_analysis_enqueue_v1",
    "server_drs_analysis_claim_v1",
    "server_drs_analysis_complete_v1",
    "server_drs_analysis_disposition_v1",
    "for update skip locked",
    "provider_neutral",
    "human_review_required",
    "formal_impact",
    "case_state_transition",
    "enable row level security",
    "force row level security",
    "document_manifest_gap",
    "quote_row",
    "drawing_region",
    "contract_region",
    "external_professional",
  ]) assert.match(source, new RegExp(required, "iu"), required);
  assert.doesNotMatch(source, /insert\s+into\s+casework\.case_events/iu);
  assert.doesNotMatch(source, /delete\s+from\s+casework\.drs_analysis_findings/iu);
  assert.doesNotMatch(source, /https?:\/\/|openai|anthropic|gemini/iu);
});

const dockerPath = process.env.DRS_AI_R1_DOCKER ?? "docker";
const candidate = process.env.DRS_AI_R1_CANDIDATE ?? "";
const disposableConfirmed =
  process.env.DRS_AI_R1_DISPOSABLE_CONFIRMED === "YES";
const runtimeEnabled = disposableConfirmed && /^[a-f0-9]{40}$/u.test(candidate);
const IMAGE =
  "public.ecr.aws/supabase/postgres@sha256:28f0e16a019e648089fc1a6d333549a55548f6019c15ae4bd7cd58b989027518";
const RESOURCES = Object.freeze({
  network: "laibe-ai-r1-task5-6-internal",
  volume: "laibe-ai-r1-task5-6-pgdata",
  db: "laibe-ai-r1-task5-6-db",
});
const LABELS = Object.freeze([
  "com.laibe.task=ai-r1-task5-6",
  "com.laibe.scope=disposable-postgres-test",
  "com.laibe.disposable=true",
]);

function docker(args, { input, allowFailure = false } = {}) {
  const result = spawnSync(dockerPath, args, {
    cwd: new URL(".", worktreeUrl),
    encoding: "utf8",
    input,
    windowsHide: true,
  });
  if (!allowFailure) {
    assert.equal(
      result.status,
      0,
      `docker command failed: ${args.slice(0, 3).join(" ")}\n${result.stderr}`,
    );
  }
  return result;
}

function psql(sql, { allowFailure = false, user = "postgres" } = {}) {
  return docker([
    "exec",
    "-i",
    RESOURCES.db,
    "psql",
    "-X",
    "-qAt",
    "-v",
    "ON_ERROR_STOP=1",
    "-U",
    user,
    "-d",
    "postgres",
  ], { input: sql, allowFailure });
}

function applySql(sql, user = "postgres") {
  const result = psql(sql, { user });
  assert.equal(result.status, 0);
}

function loadMigration(name) {
  return readFileSync(new URL(`migrations/${name}`, rootUrl), "utf8");
}

function extractRawSql(source, name) {
  const match = source.match(
    new RegExp("const " + name + " = String\\.raw`([\\s\\S]*?)`;", "u"),
  );
  assert.ok(match, `accepted harness constant missing: ${name}`);
  return match[1];
}

function sqlLiteral(value) {
  return `'${String(value).replaceAll("'", "''")}'`;
}

function jsonResult(result) {
  assert.equal(result.status, 0, result.stderr);
  const line = result.stdout.trim().split(/\r?\n/u).filter(Boolean).at(-1);
  assert.ok(line, "expected JSON result");
  return JSON.parse(line);
}

function resourceAbsent(kind, name) {
  return docker([kind, "inspect", name], { allowFailure: true }).status !== 0;
}

function cleanupExactTopology() {
  docker(["rm", "-f", RESOURCES.db], { allowFailure: true });
  docker(["volume", "rm", RESOURCES.volume], { allowFailure: true });
  docker(["network", "rm", RESOURCES.network], { allowFailure: true });
}

function assertExactTopologyAbsent() {
  assert.equal(resourceAbsent("container", RESOURCES.db), true);
  assert.equal(resourceAbsent("volume", RESOURCES.volume), true);
  assert.equal(resourceAbsent("network", RESOURCES.network), true);
}

async function waitForPostgres() {
  for (let attempt = 0; attempt < 90; attempt += 1) {
    const ready = docker([
      "exec",
      RESOURCES.db,
      "pg_isready",
      "-h",
      "127.0.0.1",
      "-U",
      "postgres",
      "-d",
      "postgres",
    ], { allowFailure: true });
    if (ready.status === 0) return;
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  assert.fail("disposable PostgreSQL readiness timeout");
}

function createExactTopology() {
  assertExactTopologyAbsent();
  const labels = LABELS.flatMap((label) => ["--label", label]);
  docker(["network", "create", "--internal", ...labels, RESOURCES.network]);
  docker(["volume", "create", ...labels, RESOURCES.volume]);
  docker([
    "run",
    "-d",
    "--pull",
    "never",
    "--name",
    RESOURCES.db,
    "--network",
    RESOURCES.network,
    ...labels,
    "--mount",
    `type=volume,src=${RESOURCES.volume},dst=/var/lib/postgresql/data`,
    "-e",
    "POSTGRES_HOST_AUTH_METHOD=trust",
    "-e",
    "POSTGRES_DB=postgres",
    IMAGE,
  ]);
}

const IDS = Object.freeze({
  owner: "11111111-1111-4111-8111-111111111111",
  drs: "33333333-3333-4333-8333-333333333333",
  ownerB: "44444444-4444-4444-8444-444444444444",
  ownerSession: "61111111-1111-4111-8111-111111111111",
  drsSession: "63333333-3333-4333-8333-333333333333",
  ownerBSession: "64444444-4444-4444-8444-444444444444",
  ownerMembership: "71111111-1111-4111-8111-111111111111",
  drsMembership: "73333333-3333-4333-8333-333333333333",
  ownerBMembership: "74444444-4444-4444-8444-444444444444",
  ownerTechnical: "81111111-1111-4111-8111-111111111111",
  drsTechnical: "83333333-3333-4333-8333-333333333333",
  ownerBTechnical: "84444444-4444-4444-8444-444444444444",
  quoteDocument: quoteDocuments[0].documentId,
  quoteVersion: quoteDocuments[0].documentVersionId,
  quoteVersion2: "12121212-1010-4010-8010-101010101010",
});

function baseFixtureSql() {
  return `
begin;
insert into auth.users(id) values
  ('${IDS.owner}'),('${IDS.drs}'),('${IDS.ownerB}');
insert into auth.sessions(id,user_id,not_after) values
  ('${IDS.ownerSession}','${IDS.owner}',clock_timestamp()+interval '1 hour'),
  ('${IDS.drsSession}','${IDS.drs}',clock_timestamp()+interval '1 hour'),
  ('${IDS.ownerBSession}','${IDS.ownerB}',clock_timestamp()+interval '1 hour');
insert into casework.cases(
  id,external_project_id,title,case_status,created_by,created_at,updated_at
) values
  ('${CASE_A}','AI-R1-A','Synthetic AI case A','active','${IDS.owner}',clock_timestamp(),clock_timestamp()),
  ('${CASE_B}','AI-R1-B','Synthetic AI case B','active','${IDS.ownerB}',clock_timestamp(),clock_timestamp());
insert into casework.case_members(case_id,user_id,role,added_by,added_at) values
  ('${CASE_A}','${IDS.owner}','owner','${IDS.owner}',clock_timestamp()),
  ('${CASE_A}','${IDS.drs}','pcm','${IDS.owner}',clock_timestamp()),
  ('${CASE_B}','${IDS.ownerB}','owner','${IDS.ownerB}',clock_timestamp());
insert into casework.drs_three_role_case_authority(
  case_id,authority_version,next_actor,updated_by,authority_basis
) values
  ('${CASE_A}',4,'drs','${IDS.owner}','ai-r1-disposable'),
  ('${CASE_B}',4,'owner','${IDS.ownerB}','ai-r1-disposable');
insert into casework.drs_three_role_memberships(
  membership_id,case_id,user_id,role,status,valid_from,invited_by,
  authority_source,authority_version
) values
  ('${IDS.ownerMembership}','${CASE_A}','${IDS.owner}','owner','active',clock_timestamp()-interval '1 minute','${IDS.owner}','case_creation',4),
  ('${IDS.drsMembership}','${CASE_A}','${IDS.drs}','drs','active',clock_timestamp()-interval '1 minute','${IDS.owner}','drs_assignment',4),
  ('${IDS.ownerBMembership}','${CASE_B}','${IDS.ownerB}','owner','active',clock_timestamp()-interval '1 minute','${IDS.ownerB}','case_creation',4);
insert into casework.case_events(
  case_id,event_type,actor_user_id,idempotency_key,payload_sha256,payload
) values
  ('${CASE_A}','CASE_CREATED','${IDS.owner}','ai-r1-case-a-genesis','${"7".repeat(64)}','{"fixture":"ai-r1-a"}'::jsonb),
  ('${CASE_B}','CASE_CREATED','${IDS.ownerB}','ai-r1-case-b-genesis','${"8".repeat(64)}','{"fixture":"ai-r1-b"}'::jsonb);
commit;`;
}

function bindSessionsSql() {
  return `
set role service_role;
select public.drs_three_role_auth_session_bind_v1('${IDS.owner}','${IDS.ownerSession}','${IDS.ownerMembership}',clock_timestamp());
select public.drs_three_role_server_session_issue_v1('${IDS.ownerTechnical}','${"A".repeat(43)}','${IDS.owner}','${IDS.ownerSession}',clock_timestamp(),clock_timestamp()+interval '30 minutes');
select public.drs_three_role_auth_session_bind_v1('${IDS.drs}','${IDS.drsSession}','${IDS.drsMembership}',clock_timestamp());
select public.drs_three_role_server_session_issue_v1('${IDS.drsTechnical}','${"C".repeat(43)}','${IDS.drs}','${IDS.drsSession}',clock_timestamp(),clock_timestamp()+interval '30 minutes');
select public.drs_three_role_auth_session_bind_v1('${IDS.ownerB}','${IDS.ownerBSession}','${IDS.ownerBMembership}',clock_timestamp());
select public.drs_three_role_server_session_issue_v1('${IDS.ownerBTechnical}','${"D".repeat(43)}','${IDS.ownerB}','${IDS.ownerBSession}',clock_timestamp(),clock_timestamp()+interval '30 minutes');
reset role;`;
}

function documentFixtureSql() {
  return `
begin;
insert into casework.documents(
  id,case_id,document_ref,document_kind,visibility,source_role,
  document_status,created_by
) values (
  '${IDS.quoteDocument}','${CASE_A}','doc_10101010101040108010101010101010',
  'quote','PARTY_VISIBLE','OWNER','ACTIVE','${IDS.owner}'
);
insert into casework.document_versions(
  id,case_id,document_id,version_ref,version_no,created_by,sha256,
  size_bytes,detected_mime,validation_state,lifecycle_state,
  idempotency_key,payload_sha256
) values (
  '${IDS.quoteVersion}','${CASE_A}','${IDS.quoteDocument}',
  '${quoteDocuments[0].documentVersionRef}',1,'${IDS.owner}',
  '${quoteDocuments[0].sha256}',1024,'application/pdf','FORMAL','ACTIVE',
  'ai-r1-quote-v1-create','${"9".repeat(64)}'
);
insert into casework.document_version_sources(
  case_id,document_id,version_id,bucket_id,object_key,sha256,
  size_bytes,detected_mime,validation_state
) values (
  '${CASE_A}','${IDS.quoteDocument}','${IDS.quoteVersion}',
  'drs-case-records-private',
  'cases/${CASE_A}/documents/${IDS.quoteDocument}/versions/${IDS.quoteVersion}/source.pdf',
  '${quoteDocuments[0].sha256}',1024,'application/pdf','CLEAN'
);
insert into casework.document_operation_receipts(
  id,receipt_ref,case_id,operation,receipt_state,actor_user_id,
  idempotency_key,payload_sha256,document_id,document_version_id
) values (
  'abababab-abab-4bab-8bab-abababababab','rcp_abababababab4bab8bababababababab',
  '${CASE_A}','FINALIZE_UPLOAD','FORMAL_VERSION_CREATED','${IDS.owner}',
  'ai-r1-quote-v1-receipt','${"9".repeat(64)}','${IDS.quoteDocument}',
  '${IDS.quoteVersion}'
);
update casework.documents set current_version_id='${IDS.quoteVersion}'
where id='${IDS.quoteDocument}';
commit;`;
}

function applyAcceptedSchema() {
  const acceptedHarness = readFileSync(
    new URL("tests/drs_case_event_ledger_r1_real_pg.test.mjs", rootUrl),
    "utf8",
  );
  applySql(extractRawSql(acceptedHarness, "BASELINE_SETUP_SQL"));
  applySql(extractRawSql(acceptedHarness, "AUTH_HARNESS_SQL"), "supabase_admin");
  applySql(
    extractRawSql(acceptedHarness, "STORAGE_PREDECESSOR_SQL"),
    "supabase_admin",
  );
  applySql(loadMigration("20260831182641_drs_remote_baseline_bridge_w2.sql"));
  applySql(loadMigration("20260901174523_drs_three_role_case_authority_r1.sql"));
  applySql(loadMigration("20260826183000_drs_workspace_grant_authority_v2.sql"));
  applySql(extractRawSql(acceptedHarness, "CASEWORK_PREDECESSOR_SQL"));
  applySql(loadMigration("20260826190000_drs_document_storage_w1.sql"));
  applySql(baseFixtureSql());
  applySql(loadMigration("20260901192440_drs_case_event_ledger_r1.sql"));
  applySql(loadMigration("20260901214241_drs_document_formalize_domain_command_r1.sql"));
  applySql(loadMigration("20260901223102_drs_document_formalize_runtime_r1.sql"));
  applySql(bindSessionsSql());
  applySql(documentFixtureSql());
  const migration = readdirSync(migrationsUrl).filter((name) =>
    migrationPattern.test(name)
  );
  assert.equal(migration.length, 1);
  applySql(loadMigration(migration[0]));
}

function enqueueSql({
  actorUser = IDS.drs,
  actorSession = IDS.drsSession,
  caseId = CASE_A,
  membership = IDS.drsMembership,
  role = "drs",
  authorityVersion = 4,
  runKey = RUN_KEY,
  payloadSha = "5".repeat(64),
} = {}) {
  return `select public.server_drs_analysis_enqueue_v1(
    '${actorUser}','${actorSession}','${caseId}','${membership}','${role}',
    ${authorityVersion},'${runKey}','${payloadSha}','${"1".repeat(64)}',
    ${sqlLiteral(JSON.stringify(runtimeDocuments))}::jsonb,
    'healthcheck-prompt-v1','${"2".repeat(64)}',
    'provider-neutral-adapter-v1','deterministic-local-profile-v1',
    'healthcheck-rules-v1','${"3".repeat(64)}',
    'laibe.drs.analysis-output.v1','${"4".repeat(64)}'
  );`;
}

test("disposable runtime harness architecture audit binds every predecessor and AI dependency", () => {
  assert.equal(runtimeDocuments.length, 1);
  assert.deepEqual(runtimeDocuments[0], quoteDocuments[0]);
  assert.equal(runtimeDocuments[0].caseId, CASE_A);
  assert.equal(runtimeDocuments[0].documentId, IDS.quoteDocument);
  assert.equal(runtimeDocuments[0].documentVersionId, IDS.quoteVersion);

  const harnessSource = readFileSync(
    new URL("tests/drs_analysis_finding_r1.test.mjs", rootUrl),
    "utf8",
  );
  const applyStart = harnessSource.indexOf("function applyAcceptedSchema()");
  const applyEnd = harnessSource.indexOf("\n}\n\nfunction enqueueSql", applyStart);
  assert.ok(applyStart >= 0 && applyEnd > applyStart);
  const applySource = harnessSource.slice(applyStart, applyEnd);
  const orderedDependencies = [
    "BASELINE_SETUP_SQL",
    "AUTH_HARNESS_SQL",
    "STORAGE_PREDECESSOR_SQL",
    "20260831182641_drs_remote_baseline_bridge_w2.sql",
    "20260901174523_drs_three_role_case_authority_r1.sql",
    "20260826183000_drs_workspace_grant_authority_v2.sql",
    "CASEWORK_PREDECESSOR_SQL",
    "20260826190000_drs_document_storage_w1.sql",
    "baseFixtureSql()",
    "20260901192440_drs_case_event_ledger_r1.sql",
    "20260901214241_drs_document_formalize_domain_command_r1.sql",
    "20260901223102_drs_document_formalize_runtime_r1.sql",
    "bindSessionsSql()",
    "documentFixtureSql()",
    "loadMigration(migration[0])",
  ];
  let cursor = -1;
  for (const dependency of orderedDependencies) {
    const next = applySource.indexOf(dependency);
    assert.ok(next > cursor, `predecessor order mismatch: ${dependency}`);
    cursor = next;
  }
  assert.match(
    applySource,
    /STORAGE_PREDECESSOR_SQL[\s\S]*?"supabase_admin"/u,
  );

  const baseSql = baseFixtureSql();
  for (const required of [
    `('${IDS.drsSession}','${IDS.drs}'`,
    `'${IDS.drsMembership}','${CASE_A}','${IDS.drs}','drs','active'`,
    `'${CASE_A}',4,'drs'`,
    `'${CASE_A}','CASE_CREATED'`,
  ]) assert.ok(baseSql.includes(required), required);
  const bindingSql = bindSessionsSql();
  for (const required of [
    "drs_three_role_auth_session_bind_v1",
    "drs_three_role_server_session_issue_v1",
    IDS.drsSession,
    IDS.drsMembership,
    IDS.drsTechnical,
  ]) assert.ok(bindingSql.includes(required), required);

  const documentSql = documentFixtureSql();
  for (const required of [
    "casework.document_versions",
    "casework.document_version_sources",
    "casework.document_operation_receipts",
    `update casework.documents set current_version_id='${IDS.quoteVersion}'`,
    runtimeDocuments[0].documentVersionRef,
    runtimeDocuments[0].sha256,
  ]) assert.ok(documentSql.includes(required), required);
  const enqueue = enqueueSql();
  assert.ok(enqueue.includes(sqlLiteral(JSON.stringify(runtimeDocuments))));
  assert.equal(enqueue.includes(quoteDocuments[1].documentVersionId), false);

  const syntheticClaim = {
    runId: "60606060-6060-4060-8060-606060606060",
    runKeySha256: RUN_KEY,
  };
  const output = analysisOutputForClaim(syntheticClaim);
  assert.equal(output.runId, syntheticClaim.runId);
  assert.equal(output.runKeySha256, syntheticClaim.runKeySha256);
  assert.ok(output.findings.every((item) =>
    item.runId === syntheticClaim.runId &&
    item.runKeySha256 === syntheticClaim.runKeySha256 &&
    item.caseId === CASE_A &&
    item.sourceDocumentVersions.every((source) =>
      runtimeDocuments.some((document) =>
        document.documentId === source.documentId &&
        document.documentVersionId === source.documentVersionId &&
        document.sha256 === source.documentSha256
      )
    )
  ));
  assert.ok(harnessSource.includes("casework.document_version_sources"));
  assert.ok(harnessSource.includes(IDS.quoteVersion2));
  assert.ok(harnessSource.includes("ai-r1-quote-v2-receipt"));
  assert.equal(harnessSource.includes(["docker", ".sock"].join("")), false);
  assert.equal(harnessSource.includes(["--", "publish"].join("")), false);
  assert.equal(harnessSource.includes(`"${["-", "p"].join("")}"`), false);
});

test("one exact no-port disposable PostgreSQL run enforces authority, idempotency, RLS, review, and stale history", {
  skip: runtimeEnabled
    ? false
    : "set DRS_AI_R1_DISPOSABLE_CONFIRMED=YES and exact candidate SHA",
}, async () => {
  assert.equal(existsSync(worktreeUrl), true);
  const source = readFileSync(new URL("tests/drs_analysis_finding_r1.test.mjs", rootUrl), "utf8");
  assert.equal(source.includes(["docker", ".sock"].join("")), false);
  assert.equal(source.includes(["--", "publish"].join("")), false);
  assert.equal(source.includes(`"${["-", "p"].join("")}"`), false);
  cleanupExactTopology();
  assertExactTopologyAbsent();
  docker(["version"]);
  docker(["image", "inspect", IMAGE]);
  try {
    createExactTopology();
    await waitForPostgres();
    applyAcceptedSchema();

    const effectsBefore = jsonResult(psql(`select jsonb_build_object(
      'jobs',(select count(*) from casework.drs_analysis_jobs),
      'runs',(select count(*) from casework.drs_analysis_runs),
      'findings',(select count(*) from casework.drs_analysis_findings),
      'events',(select count(*) from casework.case_events where case_id='${CASE_A}')
    );`));

    const wrongRole = jsonResult(psql(enqueueSql({
      actorUser: IDS.owner,
      actorSession: IDS.ownerSession,
      membership: IDS.ownerMembership,
      role: "owner",
    })));
    assert.equal(wrongRole.newEffects, 0);
    const crossCase = jsonResult(psql(enqueueSql({ caseId: CASE_B })));
    assert.equal(crossCase.newEffects, 0);

    const revoked = jsonResult(psql(`begin;
      update casework.drs_three_role_memberships set status='revoked',revoked_at=clock_timestamp()
      where membership_id='${IDS.drsMembership}';
      ${enqueueSql()}
      rollback;`));
    assert.equal(revoked.newEffects, 0);
    const expired = jsonResult(psql(`begin;
      update integration.drs_three_role_server_sessions
      set expires_at=issued_at+interval '1 second'
      where auth_session_id='${IDS.drsSession}';
      ${enqueueSql()}
      rollback;`));
    assert.equal(expired.newEffects, 0);
    const drift = jsonResult(psql(`begin;
      update casework.drs_three_role_case_authority set authority_version=5
      where case_id='${CASE_A}';
      ${enqueueSql()}
      rollback;`));
    assert.equal(drift.newEffects, 0);

    const applied = jsonResult(psql(enqueueSql()));
    assert.equal(applied.state, "APPLIED");
    assert.equal(applied.newEffects, 1);
    const replay = jsonResult(psql(enqueueSql()));
    assert.equal(replay.state, "REPLAYED");
    assert.equal(replay.newEffects, 0);
    const conflict = jsonResult(psql(enqueueSql({ payloadSha: "6".repeat(64) })));
    assert.equal(conflict.state, "IDEMPOTENCY_CONFLICT");
    assert.equal(conflict.newEffects, 0);

    const directWrite = psql(`begin; set local role authenticated;
      insert into casework.drs_analysis_jobs(
        job_id,case_id,run_key_sha256,enqueue_payload_sha256,
        input_manifest_sha256,prompt_version,prompt_sha256,
        model_adapter_version,model_profile_version,rule_version,rule_sha256,
        output_schema_version,output_schema_sha256
      ) values (
        gen_random_uuid(),'${CASE_B}','${"a".repeat(64)}','${"b".repeat(64)}',
        '${"c".repeat(64)}','x','${"d".repeat(64)}','x','x','x',
        '${"e".repeat(64)}','x','${"f".repeat(64)}'
      ); rollback;`, { allowFailure: true });
    assert.notEqual(directWrite.status, 0);

    const claim = jsonResult(psql(
      `select public.server_drs_analysis_claim_v1('99999999-9090-4090-8090-909090909090',300);`,
    ));
    assert.equal(claim.state, "CLAIMED");
    assert.equal(claim.runKeySha256, RUN_KEY);

    const invalidFlags = {
      ...analysisOutputForClaim(claim, { humanReviewRequired: false }),
      outputSha256: "a".repeat(64),
    };
    const invalid = jsonResult(psql(
      `select public.server_drs_analysis_complete_v1(
        '99999999-9090-4090-8090-909090909090',
        ${sqlLiteral(claim.jobId)}::uuid,'${"a".repeat(64)}',
        ${sqlLiteral(JSON.stringify(invalidFlags))}::jsonb
      );`,
    ));
    assert.equal(invalid.newEffects, 0);

    const highWithoutCitation = analysisOutputForClaim(claim, {
      outputSha256: "b".repeat(64),
      findings: [findingForClaim(claim, { citations: [] })],
    });
    const noCitation = jsonResult(psql(
      `select public.server_drs_analysis_complete_v1(
        '99999999-9090-4090-8090-909090909090',
        ${sqlLiteral(claim.jobId)}::uuid,'${"b".repeat(64)}',
        ${sqlLiteral(JSON.stringify(highWithoutCitation))}::jsonb
      );`,
    ));
    assert.equal(noCitation.newEffects, 0);

    const crossCitation = analysisOutputForClaim(claim, {
      outputSha256: "c".repeat(64),
      findings: [findingForClaim(claim, {
        citations: [quoteCitation({ caseId: CASE_B })],
      })],
    });
    const crossOutput = jsonResult(psql(
      `select public.server_drs_analysis_complete_v1(
        '99999999-9090-4090-8090-909090909090',
        ${sqlLiteral(claim.jobId)}::uuid,'${"c".repeat(64)}',
        ${sqlLiteral(JSON.stringify(crossCitation))}::jsonb
      );`,
    ));
    assert.equal(crossOutput.newEffects, 0);

    const validFindings = [
      findingForClaim(claim),
      findingForClaim(claim, {
        findingId: "78787878-7070-4070-8070-707070707070",
        code: "QUOTE_SECOND_REVIEW",
        severity: "medium",
      }),
      findingForClaim(claim, {
        findingId: "79797979-7070-4070-8070-707070707070",
        code: "QUOTE_THIRD_REVIEW",
        severity: "low",
      }),
    ];
    const validOutput = analysisOutputForClaim(claim, {
      outputSha256: "d".repeat(64),
      findings: validFindings,
    });
    const completed = jsonResult(psql(
      `select public.server_drs_analysis_complete_v1(
        '99999999-9090-4090-8090-909090909090',
        ${sqlLiteral(claim.jobId)}::uuid,'${"d".repeat(64)}',
        ${sqlLiteral(JSON.stringify(validOutput))}::jsonb
      );`,
    ));
    assert.equal(completed.state, "APPLIED");
    assert.equal(completed.newEffects, 1);
    const completedReplay = jsonResult(psql(
      `select public.server_drs_analysis_complete_v1(
        '99999999-9090-4090-8090-909090909090',
        ${sqlLiteral(claim.jobId)}::uuid,'${"d".repeat(64)}',
        ${sqlLiteral(JSON.stringify(validOutput))}::jsonb
      );`,
    ));
    assert.equal(completedReplay.state, "REPLAYED");
    assert.equal(completedReplay.newEffects, 0);

    const disposition = (
      findingId,
      decision,
      expectedVersion = 1,
      actor = {
        user: IDS.drs,
        session: IDS.drsSession,
        membership: IDS.drsMembership,
        role: "drs",
      },
      suffix = "primary",
    ) =>
      `select public.server_drs_analysis_disposition_v1(
        '${actor.user}','${actor.session}','${CASE_A}','${actor.membership}',
        '${actor.role}',4,'${findingId}',${expectedVersion},'${decision}',
        'ai-r1-${decision.toLowerCase()}-${findingId.slice(0, 8)}-${suffix}',
        '${createHash("sha256").update(`${findingId}:${decision}`).digest("hex")}',
        ${decision === "EDIT" ? "'DRS 覆核後修正文句。'" : "null"},
        ${decision === "EDIT" ? "'依精確引證調整，未改變案件狀態。'" : "null"}
      );`;
    for (const [findingId, decision] of [
      [validFindings[0].findingId, "ACCEPT"],
      [validFindings[1].findingId, "EDIT"],
      [validFindings[2].findingId, "REJECT"],
    ]) {
      const result = jsonResult(psql(disposition(findingId, decision)));
      assert.equal(result.state, "APPLIED");
      assert.equal(result.caseStateTransition, false);
    }
    const staleExpected = jsonResult(psql(
      disposition(validFindings[0].findingId, "ACCEPT", 2),
    ));
    assert.equal(staleExpected.newEffects, 0);
    const ownerDenied = jsonResult(psql(disposition(
      validFindings[0].findingId,
      "ACCEPT",
      1,
      {
        user: IDS.owner,
        session: IDS.ownerSession,
        membership: IDS.ownerMembership,
        role: "owner",
      },
      "owner-denied",
    )));
    assert.equal(ownerDenied.newEffects, 0);

    const decisionsBeforeRollback = Number(
      psql("select count(*) from casework.drs_analysis_review_decisions;").stdout.trim(),
    );
    psql(`begin; ${disposition(
      validFindings[0].findingId,
      "ACCEPT",
      1,
      undefined,
      "rollback",
    )} rollback;`);
    const decisionsAfterRollback = Number(
      psql("select count(*) from casework.drs_analysis_review_decisions;").stdout.trim(),
    );
    assert.equal(decisionsAfterRollback, decisionsBeforeRollback);

    applySql(`begin;
      insert into casework.document_versions(
        id,case_id,document_id,version_ref,version_no,previous_version_id,
        created_by,sha256,size_bytes,detected_mime,validation_state,
        lifecycle_state,idempotency_key,payload_sha256
      ) values (
        '${IDS.quoteVersion2}','${CASE_A}','${IDS.quoteDocument}',
        'dvr_12121212101040108010101010101010',2,'${IDS.quoteVersion}',
        '${IDS.owner}','${"0".repeat(64)}',2048,'application/pdf','FORMAL',
        'ACTIVE','ai-r1-quote-v2-create','${"1".repeat(64)}'
      );
      insert into casework.document_version_sources(
        case_id,document_id,version_id,bucket_id,object_key,sha256,
        size_bytes,detected_mime,validation_state
      ) values (
        '${CASE_A}','${IDS.quoteDocument}','${IDS.quoteVersion2}',
        'drs-case-records-private',
        'cases/${CASE_A}/documents/${IDS.quoteDocument}/versions/${IDS.quoteVersion2}/source.pdf',
        '${"0".repeat(64)}',2048,'application/pdf','CLEAN'
      );
      insert into casework.document_operation_receipts(
        id,receipt_ref,case_id,operation,receipt_state,actor_user_id,
        idempotency_key,payload_sha256,document_id,document_version_id
      ) values (
        'cdcdcdcd-cdcd-4dcd-8dcd-cdcdcdcdcdcd',
        'rcp_cdcdcdcdcdcd4dcd8dcdcdcdcdcdcdcd','${CASE_A}',
        'FINALIZE_UPLOAD','FORMAL_VERSION_CREATED','${IDS.owner}',
        'ai-r1-quote-v2-receipt','${"1".repeat(64)}','${IDS.quoteDocument}',
        '${IDS.quoteVersion2}'
      );
      update casework.documents set current_version_id='${IDS.quoteVersion2}'
      where id='${IDS.quoteDocument}';
      commit;`);
    const lifecycle = jsonResult(psql(`select jsonb_build_object(
      'history',(select count(*) from casework.drs_analysis_finding_lifecycle_events),
      'stale',(select count(*) from casework.drs_analysis_finding_read_model where lifecycle='stale'),
      'current',(select count(*) from casework.drs_analysis_current_findings),
      'findings',(select count(*) from casework.drs_analysis_findings)
    );`));
    assert.equal(lifecycle.stale, 3);
    assert.equal(lifecycle.current, 0);
    assert.equal(lifecycle.findings, 3);
    const staleReplay = Number(
      psql(`select drs_analysis_private.stale_findings_for_document_version_v1('${IDS.quoteVersion2}');`).stdout.trim(),
    );
    assert.equal(staleReplay, 0);

    const currentOne = psql(
      "select coalesce(jsonb_agg(row_to_json(x) order by x.finding_id),'[]'::jsonb) from casework.drs_analysis_current_findings x;",
    ).stdout.trim();
    const currentTwo = psql(
      "select coalesce(jsonb_agg(row_to_json(x) order by x.finding_id),'[]'::jsonb) from casework.drs_analysis_current_findings x;",
    ).stdout.trim();
    assert.equal(currentOne, currentTwo);

    const effectsAfter = jsonResult(psql(`select jsonb_build_object(
      'jobs',(select count(*) from casework.drs_analysis_jobs),
      'runs',(select count(*) from casework.drs_analysis_runs),
      'findings',(select count(*) from casework.drs_analysis_findings),
      'events',(select count(*) from casework.case_events where case_id='${CASE_A}')
    );`));
    assert.equal(effectsAfter.jobs - effectsBefore.jobs, 1);
    assert.equal(effectsAfter.runs - effectsBefore.runs, 1);
    assert.equal(effectsAfter.findings - effectsBefore.findings, 3);
    assert.equal(effectsAfter.events, effectsBefore.events);
  } finally {
    cleanupExactTopology();
    assertExactTopologyAbsent();
  }
});
