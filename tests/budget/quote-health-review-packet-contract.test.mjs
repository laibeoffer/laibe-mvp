import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import * as core from "../../src/lib/budget/quote-healthcheck/index.ts";
import { sha256Canonical } from "../../src/lib/budget/quote-healthcheck/validation.ts";

const TEST_DIR = dirname(fileURLToPath(import.meta.url));
const synthetic = JSON.parse(
  readFileSync(
    resolve(TEST_DIR, "fixtures", "quote-healthcheck-synthetic-document-v1.json"),
    "utf8",
  ),
);

const buildReport = async (packetInput = synthetic.packetInput) => {
  const extraction = await core.buildQuoteExtractionPacketV1(
    structuredClone(packetInput),
  );
  assert.equal(extraction.ok, true, JSON.stringify(extraction));
  const report = await core.buildPreliminaryQuoteHealthReportV1({
    packetId: "packet_test_quote_review_report_001",
    producerVersion: "a1-review-packet-contract-test-1",
    createdAt: "2026-08-21T01:00:00.000Z",
    recordedAt: "2026-08-21T01:00:01.000Z",
    extractionPacket: extraction.value,
    mode: extraction.value.mode,
    dependencies: {},
  });
  assert.equal(report.ok, true, JSON.stringify(report));
  return report.value;
};

const reviewPacketInput = (quoteHealthReport, overrides = {}) => ({
  packetId: "packet_test_quote_review_packet_001",
  createdAt: "2026-08-21T01:01:00.000Z",
  recordedAt: "2026-08-21T01:01:01.000Z",
  quoteHealthReport,
  decisionRecordReferences: [{
    decisionRecordId: "decision_record_test_001",
    decisionRecordVersion: 1,
    decisionRecordSha256: "a".repeat(64),
  }],
  ...overrides,
});

const rehash = async (packet) => {
  const { factsHash: _factsHash, ...preimage } = packet;
  packet.factsHash = await sha256Canonical(preimage);
  return packet;
};

Deno.test("quote health review packet builds a closed traceable Human PCM review queue", async () => {
  const report = await buildReport();
  const result = await core.buildQuoteHealthReviewPacketV1(
    reviewPacketInput(report),
  );
  assert.equal(result.ok, true, JSON.stringify(result));
  const packet = result.value;
  assert.equal(packet.schemaName, "laibe.quote-health-review-packet.v1");
  assert.equal(packet.schemaVersion, 1);
  assert.equal(packet.caseId, report.caseId);
  assert.deepEqual(packet.quoteHealthReportReference, {
    schemaName: "laibe.quote-health-report.v1",
    schemaVersion: 1,
    packetId: report.packetId,
    factsHash: report.factsHash,
    caseId: report.caseId,
    sourceDocumentReferenceId: report.sourceDocumentReferenceId,
    sourceDocumentId: report.sourceDocumentId,
    sourceDocumentVersionId: report.sourceDocumentVersionId,
    sourceDocumentSha256: report.sourceDocumentSha256,
    lifecycleStatus: report.lifecycleStatus,
    overallStatus: report.overallStatus,
    reviewStage: "machine_candidate",
    reviewDisposition: "HUMAN_PCM_REVIEW_PENDING",
  });
  assert.equal(packet.sourceDocumentId, report.sourceDocumentId);
  assert.equal(packet.reviewStatus, "HUMAN_PCM_REVIEW_PENDING");
  assert.equal(packet.nextOwner, "HUMAN_PCM");
  assert.equal(packet.nextAction, "REVIEW_QUOTE_HEALTH_REPORT");
  assert.equal(
    (await core.validateQuoteHealthReviewPacketV1(packet, report)).valid,
    true,
  );
});

Deno.test("review packet factsHash is deterministic and covers the complete canonical preimage", async () => {
  const report = await buildReport();
  const input = reviewPacketInput(report);
  const first = await core.buildQuoteHealthReviewPacketV1(structuredClone(input));
  const second = await core.buildQuoteHealthReviewPacketV1(structuredClone(input));
  assert.equal(first.ok, true, JSON.stringify(first));
  assert.equal(second.ok, true, JSON.stringify(second));
  assert.equal(first.value.factsHash, second.value.factsHash);

  const tampered = structuredClone(first.value);
  tampered.decisionRecordReferences[0].decisionRecordSha256 = "b".repeat(64);
  assert.equal(
    (await core.validateQuoteHealthReviewPacketV1(tampered, report)).valid,
    false,
  );
});

Deno.test("review packet fails closed on unknown fields and embedded Human decision payloads", async () => {
  const report = await buildReport();
  const built = await core.buildQuoteHealthReviewPacketV1(reviewPacketInput(report));
  assert.equal(built.ok, true, JSON.stringify(built));
  for (const mutate of [
    (packet) => packet.unknownField = true,
    (packet) => packet.decisionRecordReferences[0].decision = { approved: true },
    (packet) => packet.humanDecision = { outcome: "approved" },
  ]) {
    const packet = structuredClone(built.value);
    mutate(packet);
    assert.equal(
      (await core.validateQuoteHealthReviewPacketV1(packet, report)).valid,
      false,
    );
  }
});

Deno.test("review packet rejects malformed and duplicate decision record references", async () => {
  const report = await buildReport();
  const malformed = await core.buildQuoteHealthReviewPacketV1(
    reviewPacketInput(report, {
      decisionRecordReferences: [{
        decisionRecordId: "decision_record_test_001",
        decisionRecordVersion: 1,
        decisionRecordSha256: "A".repeat(64),
      }],
    }),
  );
  assert.equal(malformed.ok, false);

  const duplicate = await core.buildQuoteHealthReviewPacketV1(
    reviewPacketInput(report, {
      decisionRecordReferences: [{
        decisionRecordId: "decision_record_test_001",
        decisionRecordVersion: 1,
        decisionRecordSha256: "a".repeat(64),
      }, {
        decisionRecordId: "decision_record_test_001",
        decisionRecordVersion: 1,
        decisionRecordSha256: "b".repeat(64),
      }],
    }),
  );
  assert.equal(duplicate.ok, false);

  const sparse = [];
  sparse[1] = {
    decisionRecordId: "decision_record_test_002",
    decisionRecordVersion: 1,
    decisionRecordSha256: "c".repeat(64),
  };
  const sparseResult = await core.buildQuoteHealthReviewPacketV1(
    reviewPacketInput(report, { decisionRecordReferences: sparse }),
  );
  assert.equal(sparseResult.ok, false);
});

Deno.test("review packet rejects report, case, and source binding drift even after rehash", async () => {
  const report = await buildReport();
  const built = await core.buildQuoteHealthReviewPacketV1(reviewPacketInput(report));
  assert.equal(built.ok, true, JSON.stringify(built));
  for (const mutate of [
    (packet) => packet.caseId = "case_test_other",
    (packet) => packet.quoteHealthReportReference.packetId = "packet_test_other",
    (packet) => packet.sourceDocumentId = "document_test_other",
  ]) {
    const packet = await rehash(structuredClone(built.value));
    mutate(packet);
    await rehash(packet);
    assert.equal(
      (await core.validateQuoteHealthReviewPacketV1(packet, report)).valid,
      false,
    );
  }
});

Deno.test("review packet revalidates invalid reports and preserves CURRENT and STALE report states", async () => {
  const current = await buildReport();
  const invalid = structuredClone(current);
  invalid.factsHash = "d".repeat(64);
  assert.equal(
    (await core.buildQuoteHealthReviewPacketV1(reviewPacketInput(invalid))).ok,
    false,
  );

  const staleInput = structuredClone(synthetic.packetInput);
  staleInput.document.currentDocumentVersionId = "document_version_test_quote_001_v2";
  staleInput.document.supersededByDocumentVersionId = "document_version_test_quote_001_v2";
  const stale = await buildReport(staleInput);
  assert.equal(current.lifecycleStatus, "CURRENT");
  assert.equal(stale.lifecycleStatus, "STALE");
  for (const report of [current, stale]) {
    const packet = await core.buildQuoteHealthReviewPacketV1(reviewPacketInput(report));
    assert.equal(packet.ok, true, JSON.stringify(packet));
    assert.equal(
      packet.value.quoteHealthReportReference.lifecycleStatus,
      report.lifecycleStatus,
    );
    assert.equal(
      (await core.validateQuoteHealthReviewPacketV1(packet.value, report)).valid,
      true,
    );
  }
});

Deno.test("review packet rejects RFC3339 ordering reversal", async () => {
  const report = await buildReport();
  const result = await core.buildQuoteHealthReviewPacketV1(reviewPacketInput(report, {
    createdAt: "2026-08-21T01:02:00.000Z",
    recordedAt: "2026-08-21T01:01:00.000Z",
  }));
  assert.equal(result.ok, false);
});

Deno.test("review packet rejects non-existent RFC3339 calendar and offset values", async () => {
  const report = await buildReport();
  for (const timestamp of [
    "2026-02-29T01:01:00.000Z",
    "2026-13-01T01:01:00.000Z",
    "2026-01-32T01:01:00.000Z",
    "2026-01-01T24:00:00.000Z",
    "2026-01-01T01:60:00.000Z",
    "2026-01-01T01:01:60.000Z",
    "2026-01-01T01:01:00.000+24:00",
    "2026-01-01T01:01:00.000+01:60",
  ]) {
    const result = await core.buildQuoteHealthReviewPacketV1(
      reviewPacketInput(report, { createdAt: timestamp }),
    );
    assert.equal(result.ok, false, timestamp);
  }
});

Deno.test("review packet validator binds lifecycle to a trusted complete report", async () => {
  const report = await buildReport();
  const built = await core.buildQuoteHealthReviewPacketV1(reviewPacketInput(report));
  assert.equal(built.ok, true, JSON.stringify(built));

  const staleReport = structuredClone(report);
  staleReport.lifecycleStatus = "STALE";
  staleReport.overallStatus = "STALE";
  const packet = structuredClone(built.value);
  packet.quoteHealthReportReference.lifecycleStatus = "STALE";
  packet.quoteHealthReportReference.overallStatus = "STALE";
  await rehash(packet);

  assert.equal(
    (await core.validateQuoteHealthReviewPacketV1(packet, staleReport)).valid,
    false,
  );
});

Deno.test("review packet schema closes packet and decision-reference objects", () => {
  const schema = JSON.parse(readFileSync(resolve(
    TEST_DIR,
    "..",
    "..",
    "src",
    "lib",
    "budget",
    "quote-healthcheck",
    "schemas",
    "quote-health-review-packet-v1.schema.json",
  ), "utf8"));
  assert.equal(schema.additionalProperties, false);
  assert.equal(schema.properties.decisionRecordReferences.minItems, 0);
  assert.equal(schema.$defs.decisionRecordReference.additionalProperties, false);
  assert.equal(schema.properties.reviewStatus.const, "HUMAN_PCM_REVIEW_PENDING");
  assert.equal(schema.properties.nextOwner.const, "HUMAN_PCM");
  assert.equal(schema.properties.nextAction.const, "REVIEW_QUOTE_HEALTH_REPORT");
});
