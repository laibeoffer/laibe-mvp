import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const TEST_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(TEST_DIR, "..", "..");
const CORE_PATH = resolve(
  REPO_ROOT,
  "src",
  "lib",
  "budget",
  "quote-healthcheck",
  "index.ts",
);
const FIXTURE_PATH = resolve(
  TEST_DIR,
  "fixtures",
  "quote-healthcheck-synthetic-document-v1.json",
);
const fixture = JSON.parse(readFileSync(FIXTURE_PATH, "utf8"));

const loadCore = async () => {
  assert.ok(
    existsSync(CORE_PATH),
    "IMPLEMENTATION_MISSING: src/lib/budget/quote-healthcheck/index.ts",
  );
  return await import(
    `${pathToFileURL(CORE_PATH).href}?test=${crypto.randomUUID()}`
  );
};

Deno.test("synthetic fixture is prohibited from real-document or production acceptance use", () => {
  assert.equal(fixture.classification, "SYNTHETIC_DOMAIN_TEST_ONLY");
  assert.equal(fixture.formalCaseData, false);
  assert.equal(fixture.realDocumentEvidence, false);
  assert.equal(fixture.mayBeUsedForProductionAcceptance, false);
});

Deno.test("quote extraction packet conforms to the A0 minimum envelope and stays candidate-only", async () => {
  const core = await loadCore();
  const result = await core.buildQuoteExtractionPacketV1(fixture.packetInput);
  assert.equal(result.ok, true, JSON.stringify(result));
  assert.equal(result.value.schemaName, "laibe.quote-extraction-packet.v1");
  assert.equal(result.value.schemaVersion, 1);
  assert.equal(result.value.producerRole, "A1");
  assert.equal(result.value.processingStatus, "candidate_ready");
  assert.equal(result.value.reviewStage, "machine_candidate");
  assert.equal(result.value.humanReviewRequired, true);
  assert.equal(result.value.paymentAuthorization, false);
  assert.equal(result.value.contractorPaymentDue, "NOT_DETERMINED");
  assert.equal(result.value.pricedCandidateGenerated, false);
  assert.equal(
    (await core.validateQuoteExtractionPacketV1(result.value)).valid,
    true,
  );
});

Deno.test("missing document identity, authority, mismatch, unknown field, and unknown major fail closed", async () => {
  const core = await loadCore();
  const mutations = [
    (input) => delete input.document.documentVersionId,
    (input) => delete input.document.sha256,
    (input) => delete input.authority,
    (input) => input.document.caseId = "case_other",
    (input) => input.unknownField = true,
    (input) => input.document.wireIdentity = "laibe.document-version-ref.v2",
  ];
  for (const mutate of mutations) {
    const input = structuredClone(fixture.packetInput);
    mutate(input);
    const result = await core.buildQuoteExtractionPacketV1(input);
    assert.equal(result.ok, false, JSON.stringify(input));
  }
});

Deno.test("decimal arithmetic reproduces quantity times price times multiplier, subtotal, tax, total, and rounding", async () => {
  const core = await loadCore();
  assert.equal(core.multiplyQuoteDecimals(["3", "100.25", "1"], 2), "300.75");
  assert.equal(core.multiplyQuoteDecimals(["350.75", "0.05"], 2), "17.54");
  assert.equal(core.addQuoteDecimals(["350.75", "17.54"], 2), "368.29");
  assert.equal(core.roundQuoteDecimal("1.005", 2), "1.01");
});

Deno.test("missing fields, duplicate rows, and unit conflicts produce evidence-backed findings", async () => {
  const core = await loadCore();
  const input = structuredClone(fixture.packetInput);
  input.rows.push({
    ...structuredClone(input.rows[0]),
    lineId: "line_test_duplicate",
  });
  input.rows.push({
    ...structuredClone(input.rows[0]),
    lineId: "line_test_unit_conflict",
    unit: "?",
  });
  input.rows.push({
    ...structuredClone(input.rows[0]),
    lineId: "line_test_missing",
    itemName: null,
    unit: null,
    quantity: "",
    unitPrice: "NaN",
    declaredAmount: "Infinity",
  });
  const packet = await core.buildQuoteExtractionPacketV1(input);
  assert.equal(packet.ok, true, JSON.stringify(packet));
  const report = await core.buildPreliminaryQuoteHealthReportV1({
    packetId: "packet_test_health_findings",
    producerVersion: "a1-domain-core-test-1",
    createdAt: "2026-07-31T12:01:00.000Z",
    recordedAt: "2026-07-31T12:01:01.000Z",
    extractionPacket: packet.value,
    mode: "PRE_CONTRACT_QUOTE_HEALTHCHECK",
    dependencies: {},
  });
  assert.equal(report.ok, true, JSON.stringify(report));
  const codes = report.value.findings.map((finding) => finding.code);
  for (
    const code of [
      "MISSING_ITEM_NAME",
      "MISSING_UNIT",
      "UNKNOWN_QUANTITY",
      "UNKNOWN_UNIT_PRICE",
      "UNKNOWN_AMOUNT",
      "POSSIBLE_DUPLICATE",
      "UNIT_CONFLICT",
    ]
  ) assert.ok(codes.includes(code), `Missing finding: ${code}`);
  assert.ok(
    report.value.findings.every((finding) => finding.evidence.length > 0),
  );
});

Deno.test("scope wording produces preliminary ambiguity findings without price judgment", async () => {
  const core = await loadCore();
  const packet = await core.buildQuoteExtractionPacketV1(fixture.packetInput);
  assert.equal(packet.ok, true, JSON.stringify(packet));
  const report = await core.buildPreliminaryQuoteHealthReportV1({
    packetId: "packet_test_health_ambiguity",
    producerVersion: "a1-domain-core-test-1",
    createdAt: "2026-07-31T12:02:00.000Z",
    recordedAt: "2026-07-31T12:02:01.000Z",
    extractionPacket: packet.value,
    mode: "PRE_CONTRACT_QUOTE_HEALTHCHECK",
    dependencies: {},
  });
  assert.equal(report.ok, true, JSON.stringify(report));
  const codes = report.value.findings.map((finding) => finding.code);
  for (
    const code of [
      "AMBIGUOUS_LUMP_SUM",
      "SITE_DEPENDENT_SCOPE",
      "PROVISIONAL_AMOUNT",
      "SEPARATE_ESTIMATE",
      "EXCLUDED_SCOPE",
      "OWNER_SUPPLIED",
      "OPTIONAL_ITEM",
    ]
  ) assert.ok(codes.includes(code), `Missing finding: ${code}`);
  assert.equal(report.value.priceReasonablenessDecision, "NOT_DETERMINED");
});

Deno.test("empty, NaN, Infinity, and invalid numbers remain UNKNOWN and never become zero", async () => {
  const core = await loadCore();
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
    const parsed = core.parseQuoteNumber(value);
    assert.equal(parsed.status, "UNKNOWN");
    assert.equal(parsed.value, null);
  }
  assert.deepEqual(core.parseQuoteNumber("0"), { status: "KNOWN", value: "0" });
});

Deno.test("pre-contract mode keeps internal findings while optional comparisons are NOT_EVALUATED", async () => {
  const core = await loadCore();
  const packet = await core.buildQuoteExtractionPacketV1(fixture.packetInput);
  assert.equal(packet.ok, true, JSON.stringify(packet));
  const report = await core.buildPreliminaryQuoteHealthReportV1({
    packetId: "packet_test_health_precontract",
    producerVersion: "a1-domain-core-test-1",
    createdAt: "2026-07-31T12:03:00.000Z",
    recordedAt: "2026-07-31T12:03:01.000Z",
    extractionPacket: packet.value,
    mode: "PRE_CONTRACT_QUOTE_HEALTHCHECK",
    dependencies: {},
  });
  assert.equal(report.ok, true, JSON.stringify(report));
  assert.equal(report.value.overallStatus, "COMPLETE");
  assert.equal(
    report.value.sections.internalDocumentChecks.status,
    "EVALUATED",
  );
  assert.equal(report.value.sections.scopeComparison.status, "NOT_EVALUATED");
  assert.equal(report.value.sections.planComparison.status, "NOT_EVALUATED");
  assert.equal(
    report.value.sections.priceEvidenceComparison.status,
    "NOT_EVALUATED",
  );
  assert.ok(report.value.findings.length > 0);
});

Deno.test("PCM case mode with missing dependencies is PARTIAL and creates no priced candidate", async () => {
  const core = await loadCore();
  const packetInput = structuredClone(fixture.packetInput);
  packetInput.mode = "PCM_CASE_PRELIMINARY_QUOTE_REVIEW";
  const packet = await core.buildQuoteExtractionPacketV1(packetInput);
  assert.equal(packet.ok, true, JSON.stringify(packet));
  const report = await core.buildPreliminaryQuoteHealthReportV1({
    packetId: "packet_test_health_pcm_partial",
    producerVersion: "a1-domain-core-test-1",
    createdAt: "2026-07-31T12:04:00.000Z",
    recordedAt: "2026-07-31T12:04:01.000Z",
    extractionPacket: packet.value,
    mode: "PCM_CASE_PRELIMINARY_QUOTE_REVIEW",
    dependencies: { rawA11Present: true, rawA12Present: true },
  });
  assert.equal(report.ok, true, JSON.stringify(report));
  assert.equal(report.value.overallStatus, "PARTIAL");
  assert.equal(report.value.reviewDisposition, "HUMAN_PCM_REVIEW_PENDING");
  assert.equal(report.value.pricedCandidateGenerated, false);
  assert.equal(report.value.sections.planComparison.status, "NOT_EVALUATED");
  assert.ok(
    report.value.sections.planComparison.reasonCodes.includes(
      "DEPENDENCY_MISSING",
    ),
  );
  assert.ok(
    report.value.sections.planComparison.reasonCodes.includes(
      "RAW_A11_A12_NOT_ACCEPTED",
    ),
  );
});

Deno.test("a new document version makes the report stale without rewriting historical evidence", async () => {
  const core = await loadCore();
  const input = structuredClone(fixture.packetInput);
  input.document.currentDocumentVersionId =
    "document_version_test_quote_001_v2";
  input.document.supersededByDocumentVersionId =
    "document_version_test_quote_001_v2";
  const packet = await core.buildQuoteExtractionPacketV1(input);
  assert.equal(packet.ok, true, JSON.stringify(packet));
  const report = await core.buildPreliminaryQuoteHealthReportV1({
    packetId: "packet_test_health_stale",
    producerVersion: "a1-domain-core-test-1",
    createdAt: "2026-07-31T12:05:00.000Z",
    recordedAt: "2026-07-31T12:05:01.000Z",
    extractionPacket: packet.value,
    mode: "PRE_CONTRACT_QUOTE_HEALTHCHECK",
    dependencies: {},
  });
  assert.equal(report.ok, true, JSON.stringify(report));
  assert.equal(report.value.lifecycleStatus, "STALE");
  assert.equal(report.value.overallStatus, "STALE");
  assert.ok(
    report.value.findings.some((finding) =>
      finding.code === "DOCUMENT_VERSION_SUPERSEDED"
    ),
  );
  assert.equal(
    report.value.sourceDocumentVersionId,
    "document_version_test_quote_001_v1",
  );
});

Deno.test("A1 outputs are always preliminary and reject final decision or payment semantics", async () => {
  const core = await loadCore();
  const packet = await core.buildQuoteExtractionPacketV1(fixture.packetInput);
  assert.equal(packet.ok, true, JSON.stringify(packet));
  const invalid = {
    ...packet.value,
    schemaName: "laibe.pcm-human-review-decision.v1",
  };
  assert.equal(
    (await core.validateQuoteExtractionPacketV1(invalid)).valid,
    false,
  );
  const unknown = { ...packet.value, humanDecision: "human_pcm_approved" };
  assert.equal(
    (await core.validateQuoteExtractionPacketV1(unknown)).valid,
    false,
  );
  assert.equal(packet.value.humanReviewRequired, true);
  assert.equal(packet.value.paymentAuthorization, false);
  assert.equal(packet.value.contractorPaymentDue, "NOT_DETERMINED");
});

Deno.test("arithmetic mismatches are separated into line, subtotal, tax, and total findings", async () => {
  const core = await loadCore();
  const input = structuredClone(fixture.packetInput);
  input.rows[0].declaredAmount = "300.74";
  input.totals.declaredSubtotal = "350.74";
  input.totals.declaredTax = "17.53";
  input.totals.declaredTotal = "368.28";
  const packet = await core.buildQuoteExtractionPacketV1(input);
  assert.equal(packet.ok, true, JSON.stringify(packet));
  const report = await core.buildPreliminaryQuoteHealthReportV1({
    packetId: "packet_test_health_arithmetic",
    producerVersion: "a1-domain-core-test-1",
    createdAt: "2026-07-31T12:06:00.000Z",
    recordedAt: "2026-07-31T12:06:01.000Z",
    extractionPacket: packet.value,
    mode: "PRE_CONTRACT_QUOTE_HEALTHCHECK",
    dependencies: {},
  });
  assert.equal(report.ok, true, JSON.stringify(report));
  const codes = report.value.findings.map(({ code }) => code);
  for (
    const code of [
      "LINE_AMOUNT_MISMATCH",
      "SUBTOTAL_MISMATCH",
      "TAX_MISMATCH",
      "TOTAL_MISMATCH",
    ]
  ) {
    assert.ok(codes.includes(code), `Missing arithmetic finding: ${code}`);
  }
});

Deno.test("missing or mismatched evidence fails packet construction", async () => {
  const core = await loadCore();
  const missing = structuredClone(fixture.packetInput);
  missing.rows[0].evidence = [];
  assert.equal((await core.buildQuoteExtractionPacketV1(missing)).ok, false);
  const mismatch = structuredClone(fixture.packetInput);
  mismatch.rows[0].evidence[0].sourceDocumentVersionId =
    "document_version_other";
  assert.equal((await core.buildQuoteExtractionPacketV1(mismatch)).ok, false);
});

Deno.test("candidate outputs are deterministic and report validation rejects final-decision fields", async () => {
  const core = await loadCore();
  const first = await core.buildQuoteExtractionPacketV1(
    structuredClone(fixture.packetInput),
  );
  const second = await core.buildQuoteExtractionPacketV1(
    structuredClone(fixture.packetInput),
  );
  assert.equal(first.ok, true, JSON.stringify(first));
  assert.equal(second.ok, true, JSON.stringify(second));
  assert.equal(first.value.factsHash, second.value.factsHash);
  const reportInput = {
    packetId: "packet_test_health_deterministic",
    producerVersion: "a1-domain-core-test-1",
    createdAt: "2026-07-31T12:07:00.000Z",
    recordedAt: "2026-07-31T12:07:01.000Z",
    extractionPacket: first.value,
    mode: "PRE_CONTRACT_QUOTE_HEALTHCHECK",
    dependencies: {},
  };
  const report = await core.buildPreliminaryQuoteHealthReportV1(reportInput);
  const repeated = await core.buildPreliminaryQuoteHealthReportV1(
    structuredClone(reportInput),
  );
  assert.equal(report.ok, true, JSON.stringify(report));
  assert.equal(repeated.ok, true, JSON.stringify(repeated));
  assert.equal(report.value.factsHash, repeated.value.factsHash);
  assert.equal(report.value.humanReviewRequired, true);
  assert.equal(report.value.paymentAuthorization, false);
  assert.equal(report.value.contractorPaymentDue, "NOT_DETERMINED");
  assert.equal(report.value.pricedCandidateGenerated, false);
  assert.equal(
    (await core.validateQuoteHealthReportV1({
      ...report.value,
      humanDecision: "approved",
    })).valid,
    false,
  );
  assert.equal(
    (await core.validateQuoteHealthReportV1({
      ...report.value,
      schemaName: "laibe.pcm-human-review-decision.v1",
    })).valid,
    false,
  );
});

Deno.test("PCM dependencies never turn the candidate-only core into an implemented comparison engine", async () => {
  const core = await loadCore();
  const packetInput = structuredClone(fixture.packetInput);
  packetInput.mode = "PCM_CASE_PRELIMINARY_QUOTE_REVIEW";
  const packet = await core.buildQuoteExtractionPacketV1(packetInput);
  assert.equal(packet.ok, true, JSON.stringify(packet));
  const dependencies = {
    a0Case: {
      caseId: packetInput.caseId,
      status: "TEST_ONLY_CONFORMING_REFERENCE",
    },
    spec: structuredClone(packet.value.dependencyBasis.specReference),
    planSnapshot: structuredClone(packet.value.dependencyBasis.planSnapshot),
    knowledgeRelease: structuredClone(
      packet.value.dependencyBasis.knowledgeRelease,
    ),
  };
  const report = await core.buildPreliminaryQuoteHealthReportV1({
    packetId: "packet_test_health_pcm_bindings",
    producerVersion: "a1-domain-core-test-1",
    createdAt: "2026-07-31T12:08:00.000Z",
    recordedAt: "2026-07-31T12:08:01.000Z",
    extractionPacket: packet.value,
    mode: "PCM_CASE_PRELIMINARY_QUOTE_REVIEW",
    dependencies,
  });
  assert.equal(report.ok, true, JSON.stringify(report));
  assert.equal(report.value.overallStatus, "PARTIAL");
  for (
    const sectionName of [
      "scopeComparison",
      "planComparison",
      "priceEvidenceComparison",
    ]
  ) {
    assert.equal(report.value.sections[sectionName].status, "NOT_EVALUATED");
    assert.ok(
      report.value.sections[sectionName].reasonCodes.includes(
        "COMPARISON_ENGINE_NOT_IMPLEMENTED",
      ),
    );
  }
});

Deno.test("packet output validator fails closed on nested rows, totals, and evidence", async () => {
  const core = await loadCore();
  const built = await core.buildQuoteExtractionPacketV1(fixture.packetInput);
  assert.equal(built.ok, true, JSON.stringify(built));
  const mutations = [
    (packet) => packet.rows[0].unknownNested = true,
    (packet) => packet.rows[0].evidence = [],
    (packet) =>
      packet.totals.declaredSubtotal = {
        status: "KNOWN",
        value: "not-a-decimal",
      },
    (packet) =>
      packet.upstreamPacketIds = [{
        schemaName: "wire",
        packetId: "id",
        unknownNested: true,
      }],
  ];
  for (const mutate of mutations) {
    const packet = structuredClone(built.value);
    mutate(packet);
    assert.equal(
      (await core.validateQuoteExtractionPacketV1(packet)).valid,
      false,
    );
  }
});

Deno.test("health report output validator fails closed on nested findings and sections", async () => {
  const core = await loadCore();
  const packet = await core.buildQuoteExtractionPacketV1(fixture.packetInput);
  assert.equal(packet.ok, true, JSON.stringify(packet));
  const built = await core.buildPreliminaryQuoteHealthReportV1({
    packetId: "packet_test_health_nested_validation",
    producerVersion: "a1-domain-core-test-1",
    createdAt: "2026-07-31T12:09:00.000Z",
    recordedAt: "2026-07-31T12:09:01.000Z",
    extractionPacket: packet.value,
    mode: "PRE_CONTRACT_QUOTE_HEALTHCHECK",
    dependencies: {},
  });
  assert.equal(built.ok, true, JSON.stringify(built));
  const mutations = [
    (report) => report.findings[0].unknownNested = true,
    (report) => report.findings[0].evidence = [],
    (report) => report.sections.scopeComparison.unknownNested = true,
    (report) =>
      report.sections.scopeComparison.reasonCodes = ["UNKNOWN_REASON"],
  ];
  for (const mutate of mutations) {
    const report = structuredClone(built.value);
    mutate(report);
    assert.equal((await core.validateQuoteHealthReportV1(report)).valid, false);
  }
});

Deno.test("extraction packet pins exact A9, KnowledgeRelease, and SPEC provenance", async () => {
  const core = await loadCore();
  const result = await core.buildQuoteExtractionPacketV1(fixture.packetInput);
  assert.equal(result.ok, true, JSON.stringify(result));
  assert.deepEqual(
    result.value.upstreamPacketIds,
    [result.value.dependencyBasis.planSnapshot],
  );
  assert.equal(
    result.value.dependencyBasis.planSnapshot.schemaName,
    "laibe.plan-puzzle-snapshot.v1",
  );
  assert.equal(result.value.dependencyBasis.planSnapshot.schemaVersion, 1);
  assert.equal(result.value.dependencyBasis.planSnapshot.packetVersion, 1);
  assert.equal(
    result.value.dependencyBasis.knowledgeRelease.schemaVersion,
    "laibe.knowledge-release.v1",
  );
  assert.equal(result.value.dependencyBasis.knowledgeRelease.releaseVersion, 1);
  assert.equal(
    result.value.dependencyBasis.specReference.referenceType,
    "A0_PINNED_SPEC_REFERENCE",
  );
});

Deno.test("dependency provenance fails closed when missing, mismatched, inactive, stale, unknown-major, or unknown-field", async () => {
  const core = await loadCore();
  const mutations = {
    DELETE_PLAN_SNAPSHOT: (input) => delete input.dependencyBasis.planSnapshot,
    MISMATCH_UPSTREAM_HASH: (input) =>
      input.upstreamPacketIds[0].packetSha256 = "d".repeat(64),
    RETIRE_KNOWLEDGE_RELEASE: (input) =>
      input.dependencyBasis.knowledgeRelease.lifecycleState = "retired",
    STALE_PLAN_SNAPSHOT: (input) =>
      input.dependencyBasis.planSnapshot.current = false,
    UNKNOWN_PLAN_MAJOR: (input) =>
      input.dependencyBasis.planSnapshot.schemaName =
        "laibe.plan-puzzle-snapshot.v2",
    ADD_UNKNOWN_PLAN_FIELD: (input) =>
      input.dependencyBasis.planSnapshot.unknownField = true,
    ZERO_KNOWLEDGE_VERSION: (input) =>
      input.dependencyBasis.knowledgeRelease.releaseVersion = 0,
    MISMATCH_SPEC_CASE: (input) =>
      input.dependencyBasis.specReference.caseId = "case_other",
  };
  for (const negativeCase of fixture.dependencyNegativeCases) {
    const input = structuredClone(fixture.packetInput);
    const mutate = mutations[negativeCase.mutation];
    assert.equal(typeof mutate, "function", negativeCase.id);
    mutate(input);
    const result = await core.buildQuoteExtractionPacketV1(input);
    assert.equal(result.ok, false, JSON.stringify(input));
  }
});

Deno.test("trusted extraction reader recomputes factsHash with dependency provenance", async () => {
  const core = await loadCore();
  const built = await core.buildQuoteExtractionPacketV1(fixture.packetInput);
  assert.equal(built.ok, true, JSON.stringify(built));
  const mutations = [
    (packet) => {
      packet.dependencyBasis.planSnapshot.packetSha256 = "d".repeat(64);
      packet.upstreamPacketIds[0].packetSha256 = "d".repeat(64);
    },
    (packet) =>
      packet.dependencyBasis.knowledgeRelease.releaseId =
        "knowledge_release_tampered",
    (packet) =>
      packet.dependencyBasis.specReference.referenceId = "spec_tampered",
  ];
  for (const mutate of mutations) {
    const tampered = structuredClone(built.value);
    mutate(tampered);
    const validation = await core.validateQuoteExtractionPacketV1(tampered);
    assert.equal(validation.valid, false);
    assert.ok(
      validation.issues.some(({ code }) => code === "FACTS_HASH_MISMATCH"),
    );
  }
});

Deno.test("report reader rejects dependency references that drift from the extraction packet basis", async () => {
  const core = await loadCore();
  const packetInput = structuredClone(fixture.packetInput);
  packetInput.mode = "PCM_CASE_PRELIMINARY_QUOTE_REVIEW";
  const packet = await core.buildQuoteExtractionPacketV1(packetInput);
  assert.equal(packet.ok, true, JSON.stringify(packet));
  const dependencies = {
    a0Case: {
      caseId: packet.value.caseId,
      status: "TEST_ONLY_CONFORMING_REFERENCE",
    },
    spec: structuredClone(packet.value.dependencyBasis.specReference),
    planSnapshot: structuredClone(packet.value.dependencyBasis.planSnapshot),
    knowledgeRelease: structuredClone(
      packet.value.dependencyBasis.knowledgeRelease,
    ),
  };
  dependencies.knowledgeRelease.releaseId = "knowledge_release_other";
  const report = await core.buildPreliminaryQuoteHealthReportV1({
    packetId: "packet_test_health_dependency_drift",
    producerVersion: "a1-domain-core-test-2",
    createdAt: "2026-08-01T01:00:00.000Z",
    recordedAt: "2026-08-01T01:00:01.000Z",
    extractionPacket: packet.value,
    mode: "PCM_CASE_PRELIMINARY_QUOTE_REVIEW",
    dependencies,
  });
  assert.equal(report.ok, false, JSON.stringify(report));
  assert.ok(
    report.issues.some(({ code }) => code === "DEPENDENCY_BASIS_MISMATCH"),
  );
});
