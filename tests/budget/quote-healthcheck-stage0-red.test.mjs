import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const TEST_DIR = dirname(fileURLToPath(import.meta.url));
const FIXTURE_PATH = join(
  TEST_DIR,
  "fixtures",
  "quote-healthcheck-stage0-domain-cases.json",
);
const SYNTHETIC_PATH = join(
  TEST_DIR,
  "fixtures",
  "quote-healthcheck-synthetic-document-v1.json",
);
const SUBJECT_ADAPTER = join(TEST_DIR, "quote-healthcheck-subject-adapter.mjs");
const fixture = JSON.parse(readFileSync(FIXTURE_PATH, "utf8"));
const synthetic = JSON.parse(readFileSync(SYNTHETIC_PATH, "utf8"));

const loadSubject = async () => {
  assert.ok(
    existsSync(SUBJECT_ADAPTER),
    "IMPLEMENTATION_MISSING: production-backed Stage 0 subject adapter",
  );
  return await import(
    `${pathToFileURL(SUBJECT_ADAPTER).href}?qa=${Date.now()}`
  );
};

const buildReport = async (subject, packetInput, options = {}) => {
  const packet = await subject.buildQuoteExtractionPacketV1(packetInput);
  assert.equal(packet.ok, true, JSON.stringify(packet));
  return await subject.buildPreliminaryQuoteHealthReportV1({
    packetId: options.packetId ?? "packet_node_health_001",
    producerVersion: "a1-domain-core-node-test-1",
    createdAt: "2026-07-31T13:00:00.000Z",
    recordedAt: "2026-07-31T13:00:01.000Z",
    extractionPacket: packet.value,
    mode: options.mode ?? packetInput.mode,
    dependencies: options.dependencies ?? {},
  });
};

test("Stage 0 fixtures are synthetic-only and cover every required domain scenario", () => {
  assert.equal(fixture.classification, "SYNTHETIC_DOMAIN_TEST_ONLY");
  assert.equal(fixture.formalCaseData, false);
  assert.equal(fixture.realDocumentEvidence, false);
  assert.equal(fixture.mayBeUsedForProductionAcceptance, false);
  assert.equal(synthetic.classification, "SYNTHETIC_DOMAIN_TEST_ONLY");
  assert.equal(synthetic.realDocumentEvidence, false);
  assert.equal(synthetic.mayBeUsedForProductionAcceptance, false);
  assert.ok(fixture.cases.length >= 25);
});

test("identity and authority validation fail closed by product mode", async () => {
  const subject = await loadSubject();
  for (
    const path of ["authority", "document.documentVersionId", "document.sha256"]
  ) {
    const input = structuredClone(synthetic.packetInput);
    const segments = path.split(".");
    const key = segments.pop();
    let target = input;
    for (const segment of segments) target = target[segment];
    delete target[key];
    assert.equal((await subject.buildQuoteExtractionPacketV1(input)).ok, false);
  }
});

test("quote decimal arithmetic is reproducible", async () => {
  const subject = await loadSubject();
  assert.equal(
    subject.multiplyQuoteDecimals(["3", "100.25", "1"], 2),
    "300.75",
  );
  assert.equal(subject.multiplyQuoteDecimals(["350.75", "0.05"], 2), "17.54");
  assert.equal(subject.addQuoteDecimals(["350.75", "17.54"], 2), "368.29");
  assert.equal(subject.roundQuoteDecimal("1.005", 2), "1.01");
});

test("completeness, duplicate, and unit conflict findings retain evidence", async () => {
  const subject = await loadSubject();
  const input = structuredClone(synthetic.packetInput);
  input.rows.push({
    ...structuredClone(input.rows[0]),
    lineId: "node_duplicate",
  });
  input.rows.push({
    ...structuredClone(input.rows[0]),
    lineId: "node_unit",
    unit: "?",
  });
  const report = await buildReport(subject, input);
  assert.equal(report.ok, true, JSON.stringify(report));
  const codes = report.value.findings.map(({ code }) => code);
  assert.ok(codes.includes("POSSIBLE_DUPLICATE"));
  assert.ok(codes.includes("UNIT_CONFLICT"));
  assert.ok(report.value.findings.every(({ evidence }) => evidence.length > 0));
});

test("scope wording findings remain preliminary", async () => {
  const subject = await loadSubject();
  const report = await buildReport(subject, synthetic.packetInput);
  assert.equal(report.ok, true, JSON.stringify(report));
  const codes = report.value.findings.map(({ code }) => code);
  for (
    const code of [
      "AMBIGUOUS_LUMP_SUM",
      "PROVISIONAL_AMOUNT",
      "SEPARATE_ESTIMATE",
      "EXCLUDED_SCOPE",
      "OWNER_SUPPLIED",
      "OPTIONAL_ITEM",
    ]
  ) {
    assert.ok(codes.includes(code), code);
  }
  assert.equal(report.value.priceReasonablenessDecision, "NOT_DETERMINED");
});

test("unknown numbers never become zero", async () => {
  const subject = await loadSubject();
  for (
    const value of [
      "",
      "NaN",
      "Infinity",
      Number.NaN,
      Number.POSITIVE_INFINITY,
      "invalid",
    ]
  ) {
    const parsed = subject.parseQuoteNumber(value);
    assert.equal(parsed.status, "UNKNOWN");
    assert.equal(parsed.value, null);
  }
  assert.deepEqual(subject.parseQuoteNumber("0"), {
    status: "KNOWN",
    value: "0",
  });
});

test("pre-contract preserves internal checks while optional comparisons are not evaluated", async () => {
  const subject = await loadSubject();
  const report = await buildReport(subject, synthetic.packetInput);
  assert.equal(report.ok, true, JSON.stringify(report));
  assert.equal(report.value.overallStatus, "COMPLETE");
  assert.equal(
    report.value.sections.internalDocumentChecks.status,
    "EVALUATED",
  );
  assert.equal(report.value.sections.planComparison.status, "NOT_EVALUATED");
  assert.equal(
    report.value.sections.priceEvidenceComparison.status,
    "NOT_EVALUATED",
  );
});

test("raw A11 or A12 cannot replace A9 and PCM missing dependencies remains PARTIAL", async () => {
  const subject = await loadSubject();
  const input = structuredClone(synthetic.packetInput);
  input.mode = "PCM_CASE_PRELIMINARY_QUOTE_REVIEW";
  const report = await buildReport(subject, input, {
    mode: "PCM_CASE_PRELIMINARY_QUOTE_REVIEW",
    dependencies: { rawA11Present: true, rawA12Present: true },
  });
  assert.equal(report.ok, true, JSON.stringify(report));
  assert.equal(report.value.overallStatus, "PARTIAL");
  assert.equal(report.value.pricedCandidateGenerated, false);
  assert.equal(report.value.sections.planComparison.status, "NOT_EVALUATED");
  assert.ok(
    report.value.sections.planComparison.reasonCodes.includes(
      "RAW_A11_A12_NOT_ACCEPTED",
    ),
  );
});
