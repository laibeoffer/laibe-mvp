import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import * as core from "../../src/lib/budget/quote-healthcheck/index.ts";
import { sha256Canonical } from "../../src/lib/budget/quote-healthcheck/validation.ts";

const TEST_DIR = dirname(fileURLToPath(import.meta.url));
const synthetic = JSON.parse(
  readFileSync(
    resolve(
      TEST_DIR,
      "fixtures",
      "quote-healthcheck-synthetic-document-v1.json",
    ),
    "utf8",
  ),
);
const correctionFixture = JSON.parse(
  readFileSync(
    resolve(
      TEST_DIR,
      "fixtures",
      "quote-health-report-contract-correction-v1.json",
    ),
    "utf8",
  ),
);

const buildReport = async (packetInput = synthetic.packetInput) => {
  const packet = await core.buildQuoteExtractionPacketV1(
    structuredClone(packetInput),
  );
  assert.equal(packet.ok, true, JSON.stringify(packet));
  const report = await core.buildPreliminaryQuoteHealthReportV1({
    packetId: "packet_test_health_contract_correction_001",
    producerVersion: "a1-health-report-contract-test-1",
    createdAt: "2026-08-02T01:00:00.000Z",
    recordedAt: "2026-08-02T01:00:01.000Z",
    extractionPacket: packet.value,
    mode: packet.value.mode,
    dependencies: {},
  });
  assert.equal(report.ok, true, JSON.stringify(report));
  return { packet: packet.value, report: report.value };
};

Deno.test("health-report correction fixtures remain synthetic and inadmissible for production acceptance", () => {
  assert.equal(correctionFixture.classification, "SYNTHETIC_DOMAIN_TEST_ONLY");
  assert.equal(correctionFixture.formalCaseData, false);
  assert.equal(correctionFixture.realDocumentEvidence, false);
  assert.equal(correctionFixture.mayBeUsedForProductionAcceptance, false);
});

Deno.test("health report directly pins the admitted extraction packet provenance", async () => {
  const { packet, report } = await buildReport();
  assert.deepEqual(report.extractionPacketBasis, {
    schemaName: "laibe.quote-extraction-packet.v1",
    schemaVersion: 1,
    packetId: packet.packetId,
    factsHash: packet.factsHash,
    reviewStage: "machine_candidate",
    caseId: packet.caseId,
    sourceDocumentReferenceId: packet.sourceDocumentReferenceId,
    sourceDocumentId: packet.sourceDocumentId,
    sourceDocumentVersionId: packet.sourceDocumentVersionId,
    sourceDocumentCurrentVersionId: packet.sourceDocumentCurrentVersionId,
    sourceDocumentSupersededByVersionId:
      packet.sourceDocumentSupersededByVersionId,
    sourceDocumentSha256: packet.sourceDocumentSha256,
    dependencyBasis: packet.dependencyBasis,
  });
  assert.equal((await core.validateQuoteHealthReportV1(report)).valid, true);
});

Deno.test("health report schema closes direct extraction provenance", () => {
  const schema = JSON.parse(
    readFileSync(
      resolve(
        TEST_DIR,
        "..",
        "..",
        "src",
        "lib",
        "budget",
        "quote-healthcheck",
        "schemas",
        "quote-health-report-v1.schema.json",
      ),
      "utf8",
    ),
  );
  assert.ok(schema.required.includes("extractionPacketBasis"));
  assert.equal(
    schema.properties.extractionPacketBasis.$ref,
    "#/$defs/extractionPacketBasis",
  );
  assert.ok(schema.$defs.extractionPacketBasis.required.includes("caseId"));
  assert.equal(schema.properties.upstreamPacketIds.minItems, 1);
  assert.equal(schema.properties.upstreamPacketIds.maxItems, 1);
  for (
    const definition of [
      "extractionPacketBasis",
      "dependencyBasis",
      "planSnapshotReference",
      "knowledgeReleaseReference",
      "specReference",
    ]
  ) {
    assert.equal(schema.$defs[definition].additionalProperties, false);
  }
});

Deno.test("trusted health-report reader rejects provenance absence, drift, inactive inputs, unknown major, and unknown fields", async () => {
  const { report: base } = await buildReport();
  const mutations = {
    DELETE_EXTRACTION_BASIS: (report) => delete report.extractionPacketBasis,
    MISMATCH_PACKET_ID: (report) =>
      report.extractionPacketBasis.packetId = "packet_test_other",
    RETIRE_KNOWLEDGE_RELEASE: (report) =>
      report.extractionPacketBasis.dependencyBasis.knowledgeRelease
        .lifecycleState = "retired",
    STALE_PLAN_SNAPSHOT: (report) =>
      report.extractionPacketBasis.dependencyBasis.planSnapshot.current = false,
    UNKNOWN_EXTRACTION_MAJOR: (report) =>
      report.extractionPacketBasis.schemaVersion = 2,
    ADD_UNKNOWN_BASIS_FIELD: (report) =>
      report.extractionPacketBasis.unknownField = true,
    SET_NON_MACHINE_REVIEW_STAGE: (report) =>
      report.extractionPacketBasis.reviewStage = "human_approved",
  };
  for (const negativeCase of correctionFixture.negativeCases) {
    const report = structuredClone(base);
    mutations[negativeCase.mutation](report);
    const validation = await core.validateQuoteHealthReportV1(report);
    assert.equal(validation.valid, false, negativeCase.id);
  }
});

Deno.test("health report factsHash covers exact extraction and dependency provenance", async () => {
  const { report: base } = await buildReport();
  for (
    const mutate of [
      (report) => report.extractionPacketBasis.factsHash = "d".repeat(64),
      (report) =>
        report.extractionPacketBasis.dependencyBasis.knowledgeRelease
          .releaseId = "knowledge_release_test_tampered",
      (report) =>
        report.extractionPacketBasis.dependencyBasis.specReference.referenceId =
          "spec_test_tampered",
    ]
  ) {
    const report = structuredClone(base);
    mutate(report);
    const validation = await core.validateQuoteHealthReportV1(report);
    assert.equal(validation.valid, false);
    assert.ok(
      validation.issues.some(({ code }) => code === "FACTS_HASH_MISMATCH"),
      JSON.stringify(validation.issues),
    );
  }
});

Deno.test("canonical rehash cannot bind one extraction identity to another case", async () => {
  const { packet, report: original } = await buildReport();
  const rebound = structuredClone(original);
  rebound.caseId = correctionFixture.crossCaseProbe.reboundCaseId;
  rebound.extractionPacketBasis.dependencyBasis.planSnapshot.caseId =
    rebound.caseId;
  rebound.extractionPacketBasis.dependencyBasis.specReference.caseId =
    rebound.caseId;
  const { factsHash: _oldHash, ...preimage } = rebound;
  rebound.factsHash = await sha256Canonical(preimage);

  assert.equal(rebound.extractionPacketBasis.packetId, packet.packetId);
  assert.equal(rebound.extractionPacketBasis.factsHash, packet.factsHash);
  assert.equal(
    rebound.extractionPacketBasis.sourceDocumentVersionId,
    packet.sourceDocumentVersionId,
  );
  const validation = await core.validateQuoteHealthReportV1(rebound);
  assert.equal(validation.valid, false, JSON.stringify(validation));
  assert.ok(
    validation.issues.some(({ code }) =>
      code === correctionFixture.crossCaseProbe.expectedIssueCode
    ),
    JSON.stringify(validation.issues),
  );
});

Deno.test("document supersession is pinned and stale reports cannot claim current status", async () => {
  const packetInput = structuredClone(synthetic.packetInput);
  packetInput.document.currentDocumentVersionId =
    "document_version_test_quote_001_v2";
  packetInput.document.supersededByDocumentVersionId =
    "document_version_test_quote_001_v2";
  const { report } = await buildReport(packetInput);
  assert.equal(report.lifecycleStatus, "STALE");
  assert.equal(report.overallStatus, "STALE");
  assert.equal(
    report.extractionPacketBasis.sourceDocumentCurrentVersionId,
    "document_version_test_quote_001_v2",
  );
  assert.equal((await core.validateQuoteHealthReportV1(report)).valid, true);

  const falseCurrent = structuredClone(report);
  falseCurrent.lifecycleStatus = "CURRENT";
  falseCurrent.overallStatus = "COMPLETE";
  const validation = await core.validateQuoteHealthReportV1(falseCurrent);
  assert.equal(validation.valid, false);
  assert.ok(
    validation.issues.some(({ code }) => code === "STALE_STATUS_MISMATCH"),
    JSON.stringify(validation.issues),
  );
});

Deno.test("health report remains machine-candidate-only and cannot create Human PCM decisions", async () => {
  const { report } = await buildReport();
  assert.equal(report.reviewStage, "machine_candidate");
  assert.equal(report.reviewDisposition, "HUMAN_PCM_REVIEW_PENDING");
  assert.equal(report.humanReviewRequired, true);
  assert.equal(report.paymentAuthorization, false);
  assert.equal(report.contractorPaymentDue, "NOT_DETERMINED");
  assert.equal(report.pricedCandidateGenerated, false);

  const illegal = structuredClone(report);
  illegal.humanDecision = {
    schemaName: "laibe.pcm-human-review-decision.v1",
    decision: "approved",
  };
  assert.equal((await core.validateQuoteHealthReportV1(illegal)).valid, false);
});
