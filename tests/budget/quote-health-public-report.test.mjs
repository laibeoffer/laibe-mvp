import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import * as core from "../../src/lib/budget/quote-healthcheck/index.ts";

const TEST_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(TEST_DIR, "..", "..");
const GOLDEN_PATH = resolve(
  REPO_ROOT,
  "tests",
  "fixtures",
  "quote-health-public-report",
  "golden-cases.v1.json",
);
const SCHEMA_PATH = resolve(
  REPO_ROOT,
  "src",
  "lib",
  "budget",
  "quote-healthcheck",
  "schemas",
  "quote-health-public-report-v1.schema.json",
);
const LEGACY_SCHEMA_PATH = resolve(
  REPO_ROOT,
  "src",
  "lib",
  "budget",
  "quote-healthcheck",
  "schemas",
  "quote-health-report-v1.schema.json",
);
const SYNTHETIC_PATH = resolve(
  TEST_DIR,
  "fixtures",
  "quote-healthcheck-synthetic-document-v1.json",
);
const LEGACY_SCHEMA_SHA256 =
  "596ce2b3d0f4c42d19ba68e43d4778f2470c2ebbf138651dde15ff0bb893b2a4";

const golden = JSON.parse(readFileSync(GOLDEN_PATH, "utf8"));
const synthetic = JSON.parse(readFileSync(SYNTHETIC_PATH, "utf8"));
const buildPublicReport = core["buildQuoteHealthPublicReportV1"];
const validatePublicReport = core["validateQuoteHealthPublicReportV1"];

const goldenCase = (id) => {
  const found = golden.cases.find((item) => item.goldenId === id);
  assert.ok(found, `missing golden case ${id}`);
  return found;
};

const noFindingPacketInput = () => {
  const input = structuredClone(synthetic.packetInput);
  input.rows = [input.rows[0]];
  input.totals = {
    declaredSubtotal: "300.75",
    taxRate: "0.05",
    declaredTax: "15.04",
    declaredTotal: "315.79",
    evidence: input.totals.evidence,
  };
  return input;
};

const pageEvidence = (sourceDocumentVersionId, page) => ({
  kind: "text_region",
  sourceDocumentVersionId,
  page,
  region: { x: 10, y: 20, width: 30, height: 40 },
});

const buildInternalReport = async (scenario) => {
  let input;
  if (scenario === "internal_report_no_findings") {
    input = noFindingPacketInput();
  } else if (scenario === "internal_report_unknown_quantity") {
    input = noFindingPacketInput();
    input.rows[0].quantity = "";
  } else {
    input = structuredClone(synthetic.packetInput);
    const versionId = input.document.documentVersionId;
    input.rows[1].evidence = [
      pageEvidence(versionId, 3),
      pageEvidence(versionId, 1),
      pageEvidence(versionId, 3),
    ];
  }
  const packet = await core.buildQuoteExtractionPacketV1(input);
  assert.equal(packet.ok, true, JSON.stringify(packet));
  const report = await core.buildPreliminaryQuoteHealthReportV1({
    packetId: `internal_${scenario}`,
    producerVersion: "a6-i1-public-report-test-v1",
    createdAt: "2026-09-03T00:00:00.000Z",
    recordedAt: "2026-09-03T00:00:01.000Z",
    extractionPacket: packet.value,
    mode: packet.value.mode,
    dependencies: {},
  });
  assert.equal(report.ok, true, JSON.stringify(report));
  return report.value;
};

const buildFromGolden = async (id, generatedAtOverride) => {
  const fixture = goldenCase(id);
  const source = fixture.sourceScenario.startsWith("internal_report_")
    ? {
      kind: "internal_report",
      value: await buildInternalReport(fixture.sourceScenario),
    }
    : {
      kind: "terminal_extraction_outcome",
      value: structuredClone(fixture.terminalOutcome),
    };
  return await buildPublicReport({
    artifactId: fixture.artifactId,
    generatedAt: generatedAtOverride ?? fixture.generatedAt,
    document: {
      displayName: fixture.documentDisplayName,
      mimeType: "application/pdf",
    },
    source,
  });
};

Deno.test("public report implementation and closed schema are exported", () => {
  assert.equal(typeof buildPublicReport, "function");
  assert.equal(typeof validatePublicReport, "function");
  assert.equal(existsSync(SCHEMA_PATH), true);
  const schema = JSON.parse(readFileSync(SCHEMA_PATH, "utf8"));
  assert.equal(schema.additionalProperties, false);
  assert.equal(
    schema.properties.schemaName.const,
    "laibe.quote-health-public-report.v1",
  );
  assert.equal(schema.properties.schemaVersion.const, "v1");
  assert.deepEqual(schema.required, [
    "schemaName",
    "schemaVersion",
    "artifactId",
    "generatedAt",
    "analysisStatus",
    "document",
    "summary",
    "findings",
    "limitations",
    "humanReviewRequired",
    "professionalReviewRequired",
    "disclaimerCode",
    "provenance",
  ]);
  assert.equal(schema.$defs.document.additionalProperties, false);
  assert.equal(schema.$defs.summary.additionalProperties, false);
  assert.equal(schema.$defs.finding.additionalProperties, false);
  assert.equal(schema.$defs.provenance.additionalProperties, false);
});

Deno.test("Golden Set G1-G6 remains synthetic, complete, and versioned", () => {
  assert.equal(
    golden.goldenSetVersion,
    "laibe.quote-health-public-report.golden.v1",
  );
  assert.equal(golden.classification, "SYNTHETIC_PUBLIC_CONTRACT_TEST_ONLY");
  assert.equal(golden.formalCaseData, false);
  assert.equal(golden.realDocumentEvidence, false);
  assert.equal(golden.mayBeUsedForProductionAcceptance, false);
  assert.deepEqual(
    golden.cases.map((item) => item.goldenId),
    ["G1", "G2", "G3", "G4", "G5", "G6"],
  );
});

Deno.test("G1 valid current complete report has no findings", async () => {
  const fixture = goldenCase("G1");
  const result = await buildFromGolden("G1");
  assert.equal(result.ok, true, JSON.stringify(result));
  assert.equal((await validatePublicReport(result.value)).valid, true);
  assert.equal(result.value.analysisStatus, fixture.expected.analysisStatus);
  assert.deepEqual(result.value.findings, []);
  assert.equal(result.value.summary.findingCount, 0);
  assert.equal(result.value.provenance.sourceKind, "internal_report");
  assert.match(result.value.provenance.sourceFactsHash, /^[a-f\d]{64}$/);
});

Deno.test("G2 valid report projects fixed public semantics and sorted page references", async () => {
  const fixture = goldenCase("G2");
  const result = await buildFromGolden("G2");
  assert.equal(result.ok, true, JSON.stringify(result));
  assert.equal(result.value.analysisStatus, fixture.expected.analysisStatus);
  assert.equal(
    result.value.summary.findingCount,
    fixture.expected.findingCount,
  );
  assert.equal(result.value.summary.highCount, fixture.expected.highCount);
  assert.equal(result.value.summary.mediumCount, fixture.expected.mediumCount);
  assert.equal(result.value.summary.lowCount, 0);
  assert.equal(result.value.summary.unconfirmedCount, 0);
  for (const finding of result.value.findings) {
    assert.equal(finding.category, "scope");
    assert.equal(finding.severity, "high");
    assert.equal(finding.evidenceStatus, "observed");
    assert.deepEqual(finding.pageReferences, fixture.expected.pageReferences);
    assert.ok(finding.title.length > 0);
    assert.ok(finding.description.length > 0);
    assert.ok(finding.suggestedNextStep.length > 0);
  }
});

Deno.test("G3 parse failure is limited with no stale findings", async () => {
  const fixture = goldenCase("G3");
  const result = await buildFromGolden("G3");
  assert.equal(result.ok, true, JSON.stringify(result));
  assert.equal(result.value.analysisStatus, fixture.expected.analysisStatus);
  assert.deepEqual(result.value.findings, []);
  assert.deepEqual(result.value.summary, {
    headline: result.value.summary.headline,
    findingCount: 0,
    highCount: 0,
    mediumCount: 0,
    lowCount: 0,
    unconfirmedCount: 0,
  });
  assert.ok(result.value.limitations.length > 0);
});

Deno.test("G4 scanned PDF before OCR is unsupported with zero counts", async () => {
  const fixture = goldenCase("G4");
  const result = await buildFromGolden("G4");
  assert.equal(result.ok, true, JSON.stringify(result));
  assert.equal(result.value.analysisStatus, fixture.expected.analysisStatus);
  assert.equal(result.value.document.pageCount, fixture.expected.pageCount);
  assert.deepEqual(result.value.findings, []);
  assert.equal(result.value.summary.findingCount, 0);
  assert.equal(result.value.summary.highCount, 0);
  assert.equal(result.value.summary.mediumCount, 0);
  assert.equal(result.value.summary.lowCount, 0);
  assert.equal(result.value.summary.unconfirmedCount, 0);
  assert.ok(result.value.limitations.some((item) => item.includes("影像")));
});

Deno.test("G5 failed run cannot leak a prior successful result", async () => {
  const prior = await buildFromGolden("G2");
  assert.equal(prior.ok, true, JSON.stringify(prior));
  assert.ok(prior.value.findings.length > 0);
  const failed = await buildFromGolden("G5");
  assert.equal(failed.ok, true, JSON.stringify(failed));
  assert.equal(failed.value.analysisStatus, "failed");
  assert.deepEqual(failed.value.findings, []);
  assert.equal(failed.value.summary.findingCount, 0);
  assert.ok(failed.value.limitations.length > 0);
  assert.notEqual(
    failed.value.provenance.publicFactsHash,
    prior.value.provenance.publicFactsHash,
  );
});

Deno.test("G6 unknown quantity stays unconfirmed and is never guessed", async () => {
  const fixture = goldenCase("G6");
  const result = await buildFromGolden("G6");
  assert.equal(result.ok, true, JSON.stringify(result));
  assert.equal(result.value.findings.length, 1);
  assert.equal(result.value.findings[0].title, fixture.expected.title);
  assert.equal(
    result.value.findings[0].evidenceStatus,
    fixture.expected.evidenceStatus,
  );
  assert.equal(result.value.summary.unconfirmedCount, 1);
  const serialized = JSON.stringify(result.value);
  assert.equal(serialized.includes('"value":'), false);
  assert.equal(serialized.includes("300.75"), false);
});

Deno.test("publicFactsHash is deterministic and excludes generatedAt only", async () => {
  const first = await buildFromGolden("G2", "2026-09-03T02:00:00.000Z");
  const second = await buildFromGolden("G2", "2026-09-03T03:00:00.000Z");
  assert.equal(first.ok, true, JSON.stringify(first));
  assert.equal(second.ok, true, JSON.stringify(second));
  assert.notEqual(first.value.generatedAt, second.value.generatedAt);
  assert.equal(
    first.value.provenance.publicFactsHash,
    second.value.provenance.publicFactsHash,
  );
  const changed = structuredClone(second.value);
  changed.summary.headline += "變更";
  assert.equal((await validatePublicReport(changed)).valid, false);
});

Deno.test("validator rejects unknown fields, unsafe display names, and invalid references", async () => {
  const result = await buildFromGolden("G2");
  assert.equal(result.ok, true, JSON.stringify(result));
  const extra = structuredClone(result.value);
  extra.status = "complete";
  assert.equal((await validatePublicReport(extra)).valid, false);
  const badPages = structuredClone(result.value);
  badPages.findings[0].pageReferences = [3, 1, 1, 0];
  assert.equal((await validatePublicReport(badPages)).valid, false);
  const unsafe = await buildPublicReport({
    artifactId: "unsafe_display_name",
    generatedAt: "2026-09-03T04:00:00.000Z",
    document: {
      displayName: "C:\\private\\raw.pdf",
      mimeType: "application/pdf",
    },
    source: {
      kind: "terminal_extraction_outcome",
      value: structuredClone(goldenCase("G3").terminalOutcome),
    },
  });
  assert.equal(unsafe.ok, false);
});

Deno.test("privacy projection excludes source identifiers, raw messages, paths, and debug data", async () => {
  const failed = await buildFromGolden("G5");
  assert.equal(failed.ok, true, JSON.stringify(failed));
  const serialized = JSON.stringify(failed.value);
  for (
    const forbidden of [
      "caseId",
      "documentVersionId",
      "sourceDocumentVersionId",
      "C:\\private",
      "CASE-123",
      "secret-token",
      "stack",
      "raw OCR",
    ]
  ) assert.equal(serialized.includes(forbidden), false, forbidden);
  assert.equal(failed.value.provenance.sourceReportId, null);
  assert.equal(failed.value.provenance.sourceFactsHash, null);
});

Deno.test("all Golden artifacts validate and remain below one MiB", async () => {
  for (const fixture of golden.cases) {
    const result = await buildFromGolden(fixture.goldenId);
    assert.equal(
      result.ok,
      true,
      `${fixture.goldenId}: ${JSON.stringify(result)}`,
    );
    const validation = await validatePublicReport(result.value);
    assert.equal(
      validation.valid,
      true,
      `${fixture.goldenId}: ${JSON.stringify(validation)}`,
    );
    assert.ok(
      new TextEncoder().encode(JSON.stringify(result.value)).length < 1_048_576,
    );
    assert.equal(result.value.humanReviewRequired, true);
    assert.equal(result.value.professionalReviewRequired, true);
    assert.equal(
      result.value.disclaimerCode,
      "FREE_HEALTHCHECK_NOT_PROFESSIONAL_APPROVAL",
    );
  }
});

Deno.test("legacy DRS report schema bytes and validation remain unchanged", async () => {
  const legacyBytes = readFileSync(LEGACY_SCHEMA_PATH);
  assert.equal(
    createHash("sha256").update(legacyBytes).digest("hex"),
    LEGACY_SCHEMA_SHA256,
  );
  const report = await buildInternalReport("internal_report_with_findings");
  assert.equal((await core.validateQuoteHealthReportV1(report)).valid, true);
  assert.equal(report.schemaName, "laibe.quote-health-report.v1");
});
