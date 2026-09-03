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

const appendHashField = (preimage, name, value) =>
  `${preimage}${name}:${JSON.stringify(value)}\n`;

const publicFactsPreimage = (report) => {
  let value = "laibe.quote-health-public-report.v1|public-facts|v1\n";
  value = appendHashField(value, "schemaName", report.schemaName);
  value = appendHashField(value, "schemaVersion", report.schemaVersion);
  value = appendHashField(value, "artifactId", report.artifactId);
  value = appendHashField(value, "analysisStatus", report.analysisStatus);
  value = appendHashField(
    value,
    "document.displayName",
    report.document.displayName,
  );
  value = appendHashField(value, "document.mimeType", report.document.mimeType);
  value = appendHashField(
    value,
    "document.pageCount",
    report.document.pageCount,
  );
  value = appendHashField(value, "summary.headline", report.summary.headline);
  value = appendHashField(
    value,
    "summary.findingCount",
    report.summary.findingCount,
  );
  value = appendHashField(value, "summary.highCount", report.summary.highCount);
  value = appendHashField(
    value,
    "summary.mediumCount",
    report.summary.mediumCount,
  );
  value = appendHashField(value, "summary.lowCount", report.summary.lowCount);
  value = appendHashField(
    value,
    "summary.unconfirmedCount",
    report.summary.unconfirmedCount,
  );
  for (let index = 0; index < report.findings.length; index += 1) {
    const finding = report.findings[index];
    const prefix = `findings.${index}`;
    for (
      const key of [
        "findingId",
        "category",
        "severity",
        "title",
        "description",
        "evidenceStatus",
      ]
    ) value = appendHashField(value, `${prefix}.${key}`, finding[key]);
    for (
      let pageIndex = 0;
      pageIndex < finding.pageReferences.length;
      pageIndex += 1
    ) {
      value = appendHashField(
        value,
        `${prefix}.pageReferences.${pageIndex}`,
        finding.pageReferences[pageIndex],
      );
    }
    value = appendHashField(
      value,
      `${prefix}.pageReferences.length`,
      finding.pageReferences.length,
    );
    value = appendHashField(
      value,
      `${prefix}.suggestedNextStep`,
      finding.suggestedNextStep,
    );
  }
  value = appendHashField(value, "findings.length", report.findings.length);
  for (let index = 0; index < report.limitations.length; index += 1) {
    value = appendHashField(
      value,
      `limitations.${index}`,
      report.limitations[index],
    );
  }
  value = appendHashField(
    value,
    "limitations.length",
    report.limitations.length,
  );
  value = appendHashField(
    value,
    "humanReviewRequired",
    report.humanReviewRequired,
  );
  value = appendHashField(
    value,
    "professionalReviewRequired",
    report.professionalReviewRequired,
  );
  value = appendHashField(value, "disclaimerCode", report.disclaimerCode);
  for (
    const key of [
      "sourceKind",
      "sourceSchemaName",
      "sourceSchemaVersion",
      "sourceReportId",
      "sourceFactsHash",
    ]
  ) value = appendHashField(value, `provenance.${key}`, report.provenance[key]);
  return value;
};

const withSelfConsistentHash = async (report) => {
  const forged = structuredClone(report);
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(publicFactsPreimage(forged)),
  );
  forged.provenance.publicFactsHash = Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
  return forged;
};

const serializedByteLength = (report) =>
  new TextEncoder().encode(JSON.stringify(report)).byteLength;

const buildSizedReport = async (targetBytes, multibyte = false) => {
  const result = await buildFromGolden("G2");
  assert.equal(result.ok, true, JSON.stringify(result));
  const template = result.value.findings[0];
  const report = structuredClone(result.value);
  report.findings = Array.from({ length: 256 }, (_, index) => ({
    ...structuredClone(template),
    findingId: `sized_finding_${index}`,
    title: `${multibyte && index === 0 ? "繁中🙂" : "T"}${index}`,
    description: `D${index}`,
    pageReferences: [],
    suggestedNextStep: `N${index}`,
  }));
  report.limitations = Array.from(
    { length: 128 },
    (_, index) => `L${index}`,
  );
  report.summary = {
    headline: "本次免費健檢發現 256 項待確認內容。",
    findingCount: 256,
    highCount: 256,
    mediumCount: 0,
    lowCount: 0,
    unconfirmedCount: 0,
  };
  report.provenance.publicFactsHash = "0".repeat(64);

  let remaining = targetBytes - serializedByteLength(report);
  assert.ok(
    remaining >= 0,
    `target ${targetBytes} is below minimum report size`,
  );
  for (const finding of report.findings) {
    for (const key of ["title", "description", "suggestedNextStep"]) {
      const room = 1200 - finding[key].length;
      const added = Math.min(room, remaining);
      finding[key] += "x".repeat(added);
      remaining -= added;
      if (remaining === 0) break;
    }
    if (remaining === 0) break;
  }
  for (
    let index = 0;
    remaining > 0 && index < report.limitations.length;
    index += 1
  ) {
    const room = 1200 - report.limitations[index].length;
    const added = Math.min(room, remaining);
    report.limitations[index] += "x".repeat(added);
    remaining -= added;
  }
  assert.equal(
    remaining,
    0,
    `insufficient display-text capacity for ${targetBytes}`,
  );
  const sized = await withSelfConsistentHash(report);
  assert.equal(serializedByteLength(sized), targetBytes);
  return sized;
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
  assert.equal(schema.$defs.provenance.oneOf.length, 2);
  const constantOrNonNull = (field) =>
    Object.hasOwn(field, "const") ? field.const : "non-null";
  assert.deepEqual(
    schema.$defs.provenance.oneOf.map((branch) => ({
      sourceKind: branch.properties.sourceKind.const,
      sourceSchemaName: constantOrNonNull(branch.properties.sourceSchemaName),
      sourceSchemaVersion: constantOrNonNull(
        branch.properties.sourceSchemaVersion,
      ),
      sourceReportId: constantOrNonNull(branch.properties.sourceReportId),
      sourceFactsHash: constantOrNonNull(branch.properties.sourceFactsHash),
    })),
    [
      {
        sourceKind: "internal_report",
        sourceSchemaName: "laibe.quote-health-report.v1",
        sourceSchemaVersion: 1,
        sourceReportId: "non-null",
        sourceFactsHash: "non-null",
      },
      {
        sourceKind: "terminal_extraction_outcome",
        sourceSchemaName: null,
        sourceSchemaVersion: null,
        sourceReportId: null,
        sourceFactsHash: null,
      },
    ],
  );
  assert.equal(schema.allOf.length, 3);
  assert.equal(
    schema.allOf[0].if.properties.provenance.properties.sourceKind.const,
    "terminal_extraction_outcome",
  );
  assert.deepEqual(schema.allOf[0].then.properties.analysisStatus.enum, [
    "limited",
    "unsupported",
    "failed",
  ]);
  assert.equal(schema.allOf[0].then.properties.findings.maxItems, 0);
  assert.equal(schema.allOf[0].then.properties.limitations.minItems, 1);
  assert.equal(
    schema.allOf[1].then.properties.provenance.properties.sourceKind.const,
    "internal_report",
  );
  assert.equal(schema.allOf[2].then.properties.limitations.minItems, 1);
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
  assert.equal(
    result.value.provenance.sourceSchemaName,
    "laibe.quote-health-report.v1",
  );
  assert.equal(result.value.provenance.sourceSchemaVersion, 1);
  assert.match(result.value.provenance.sourceReportId, /^[A-Za-z0-9][\w.:-]*$/);
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
  assert.deepEqual(result.value.provenance, {
    sourceKind: "terminal_extraction_outcome",
    sourceSchemaName: null,
    sourceSchemaVersion: null,
    sourceReportId: null,
    sourceFactsHash: null,
    publicFactsHash: result.value.provenance.publicFactsHash,
  });
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

Deno.test("provenance is a closed source-kind discriminator", async () => {
  const internal = await buildFromGolden("G1");
  const terminal = await buildFromGolden("G3");
  assert.equal(internal.ok, true, JSON.stringify(internal));
  assert.equal(terminal.ok, true, JSON.stringify(terminal));
  const invalid = [
    { ...structuredClone(internal.value.provenance), sourceSchemaName: null },
    {
      ...structuredClone(internal.value.provenance),
      sourceSchemaVersion: null,
    },
    { ...structuredClone(internal.value.provenance), sourceReportId: null },
    {
      ...structuredClone(terminal.value.provenance),
      sourceSchemaName: "laibe.quote-health-report.v1",
    },
    { ...structuredClone(terminal.value.provenance), sourceSchemaVersion: 1 },
    { ...structuredClone(terminal.value.provenance), sourceReportId: "forged" },
    {
      ...structuredClone(terminal.value.provenance),
      sourceFactsHash: "a".repeat(64),
    },
  ];
  for (const provenance of invalid) {
    const base = provenance.sourceKind === "internal_report"
      ? internal.value
      : terminal.value;
    const forged = await withSelfConsistentHash({
      ...structuredClone(base),
      provenance,
    });
    const validation = await validatePublicReport(forged);
    assert.equal(validation.valid, false, JSON.stringify(validation));
    assert.ok(
      validation.issues.some((issue) => issue.code === "PROVENANCE_INVALID"),
      JSON.stringify(validation),
    );
  }
});

Deno.test("internal provenance rejects non-string source report identities after rehash", async () => {
  const internal = await buildFromGolden("G1");
  assert.equal(internal.ok, true, JSON.stringify(internal));
  const validIdentity = internal.value.provenance.sourceReportId;
  const invalidIdentities = [7, Object(validIdentity), [validIdentity]];

  for (const sourceReportId of invalidIdentities) {
    const forged = await withSelfConsistentHash({
      ...structuredClone(internal.value),
      provenance: {
        ...structuredClone(internal.value.provenance),
        sourceReportId,
      },
    });
    const validation = await validatePublicReport(forged);
    assert.equal(
      validation.valid,
      false,
      `${Object.prototype.toString.call(sourceReportId)}: ${
        JSON.stringify(validation)
      }`,
    );
    assert.ok(
      validation.issues.some((issue) => issue.code === "PROVENANCE_INVALID"),
      JSON.stringify(validation),
    );
  }
});

Deno.test("generatedAt requires a real RFC3339 Gregorian timestamp", async () => {
  for (
    const generatedAt of [
      "2024-02-29T23:59:59Z",
      "2026-09-03T12:34:56.123+08:00",
      "2026-09-03T12:34:56+14:00",
      "2026-09-03T12:34:56-14:00",
    ]
  ) {
    const result = await buildFromGolden("G1", generatedAt);
    assert.equal(result.ok, true, `${generatedAt}: ${JSON.stringify(result)}`);
  }
  for (
    const generatedAt of [
      "2026-02-29T00:00:00Z",
      "2024-02-30T00:00:00Z",
      "2026-00-01T00:00:00Z",
      "2026-13-01T00:00:00Z",
      "2026-01-00T00:00:00Z",
      "2026-01-01T24:00:00Z",
      "2026-01-01T00:60:00Z",
      "2026-01-01T00:00:60Z",
      "2026-01-01T00:00:00+14:01",
      "2026-01-01T00:00:00+15:00",
      "2026-01-01T00:00:00-00:00",
      "2026-01-01T00:00:00",
      "2026-01-01t00:00:00z",
      " 2026-01-01T00:00:00Z",
      "2026-01-01T00:00:00Z ",
      "September 3, 2026",
    ]
  ) {
    const result = await buildFromGolden("G1", generatedAt);
    assert.equal(result.ok, false, `${generatedAt}: ${JSON.stringify(result)}`);
    assert.ok(
      result.issues.some((issue) => issue.code === "GENERATED_AT_INVALID"),
    );
  }
  const valid = await buildFromGolden("G1");
  assert.equal(valid.ok, true, JSON.stringify(valid));
  valid.value.generatedAt = "2026-02-30T00:00:00Z";
  const validation = await validatePublicReport(valid.value);
  assert.equal(validation.valid, false, JSON.stringify(validation));
  assert.ok(
    validation.issues.some((issue) => issue.code === "GENERATED_AT_INVALID"),
  );
});

Deno.test("payload accepts exact one-MiB UTF-8 bytes and rejects one byte more", async () => {
  for (const target of [1_048_575, 1_048_576]) {
    const report = await buildSizedReport(target, target === 1_048_576);
    assert.ok(
      new TextEncoder().encode(JSON.stringify(report)).byteLength >
        JSON.stringify(report).length,
    );
    const validation = await validatePublicReport(report);
    assert.equal(
      validation.valid,
      true,
      `${target}: ${JSON.stringify(validation)}`,
    );
  }
  const oversized = await buildSizedReport(1_048_577, true);
  const validation = await validatePublicReport(oversized);
  assert.equal(validation.valid, false, JSON.stringify(validation));
  assert.ok(
    validation.issues.some((issue) => issue.code === "PAYLOAD_TOO_LARGE"),
  );
});

Deno.test("every public display field rejects markup and Unicode category-C text", async () => {
  const result = await buildFromGolden("G2");
  assert.equal(result.ok, true, JSON.stringify(result));
  const fields = [
    [
      "document.displayName",
      (report, value) => report.document.displayName = value,
      "DISPLAY_NAME_INVALID",
    ],
    [
      "summary.headline",
      (report, value) => report.summary.headline = value,
      "DISPLAY_TEXT_INVALID",
    ],
    [
      "limitations[0]",
      (report, value) => report.limitations = [value],
      "LIMITATIONS_INVALID",
    ],
    [
      "findings[0].title",
      (report, value) => report.findings[0].title = value,
      "DISPLAY_TEXT_INVALID",
    ],
    [
      "findings[0].description",
      (report, value) => report.findings[0].description = value,
      "DISPLAY_TEXT_INVALID",
    ],
    [
      "findings[0].suggestedNextStep",
      (report, value) => report.findings[0].suggestedNextStep = value,
      "DISPLAY_TEXT_INVALID",
    ],
  ];
  const unsafeValues = [
    "<script>",
    "`template`",
    "控制\u0000字元",
    "雙向\u202e覆寫",
    "零寬\u200b字元",
    "未配對代理\ud800",
  ];
  for (const [path, mutate, issueCode] of fields) {
    for (const unsafe of unsafeValues) {
      const report = structuredClone(result.value);
      mutate(report, unsafe);
      const forged = await withSelfConsistentHash(report);
      const validation = await validatePublicReport(forged);
      assert.equal(
        validation.valid,
        false,
        `${path}: ${JSON.stringify(validation)}`,
      );
      assert.ok(
        validation.issues.some((issue) => issue.code === issueCode),
        `${path}: ${JSON.stringify(validation)}`,
      );
    }
  }
  for (
    const displayName of [
      "C:private.pdf",
      "https:private.pdf",
      "../private.pdf",
    ]
  ) {
    const build = await buildPublicReport({
      artifactId: "unsafe_path_like_name",
      generatedAt: "2026-09-03T04:00:00Z",
      document: { displayName, mimeType: "application/pdf" },
      source: {
        kind: "terminal_extraction_outcome",
        value: structuredClone(goldenCase("G3").terminalOutcome),
      },
    });
    assert.equal(build.ok, false, `${displayName}: ${JSON.stringify(build)}`);
  }
});

Deno.test("validator rejects a self-consistent terminal source forged as complete", async () => {
  const terminal = await buildFromGolden("G3");
  assert.equal(terminal.ok, true, JSON.stringify(terminal));
  terminal.value.analysisStatus = "complete";
  terminal.value.summary.headline = "本次免費健檢未發現需立即確認的報價項目。";
  const forged = await withSelfConsistentHash(terminal.value);
  const validation = await validatePublicReport(forged);
  assert.equal(validation.valid, false, JSON.stringify(validation));
  assert.ok(
    validation.issues.some((issue) => issue.code === "SOURCE_STATUS_MISMATCH"),
  );
});

Deno.test("validator rejects a self-consistent terminal source carrying findings", async () => {
  const terminal = await buildFromGolden("G3");
  const internal = await buildFromGolden("G2");
  assert.equal(terminal.ok, true, JSON.stringify(terminal));
  assert.equal(internal.ok, true, JSON.stringify(internal));
  terminal.value.findings = [structuredClone(internal.value.findings[0])];
  terminal.value.summary.findingCount = 1;
  terminal.value.summary.highCount = 1;
  const forged = await withSelfConsistentHash(terminal.value);
  const validation = await validatePublicReport(forged);
  assert.equal(validation.valid, false, JSON.stringify(validation));
  assert.ok(
    validation.issues.some((issue) =>
      issue.code === "TERMINAL_SOURCE_CONTENT_INVALID"
    ),
  );
});

Deno.test("validator rejects self-consistent non-complete artifacts without limitations", async () => {
  for (const goldenId of ["G3", "G4", "G5"]) {
    const result = await buildFromGolden(goldenId);
    assert.equal(result.ok, true, JSON.stringify(result));
    result.value.limitations = [];
    const forged = await withSelfConsistentHash(result.value);
    const validation = await validatePublicReport(forged);
    assert.equal(
      validation.valid,
      false,
      `${goldenId}: ${JSON.stringify(validation)}`,
    );
    assert.ok(
      validation.issues.some((issue) => issue.code === "LIMITATION_REQUIRED"),
      goldenId,
    );
  }
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
