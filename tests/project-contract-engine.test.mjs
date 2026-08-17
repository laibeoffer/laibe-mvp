import assert from "node:assert/strict";
import { createHash, webcrypto } from "node:crypto";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const require = createRequire(import.meta.url);
const sourcePath = new URL("../site/shared/laibe-project-contract-source.js", import.meta.url);
const enginePath = new URL("../site/shared/laibe-project-contract-engine.js", import.meta.url);
const source = require(fileURLToPath(sourcePath));
let engine;
let loadError;

try {
  engine = require(fileURLToPath(enginePath));
} catch (error) {
  loadError = error;
}

function getEngine() {
  assert.ifError(loadError);
  assert.ok(engine, "contract engine must be loadable in Node");
  return engine;
}

function sumMoney(values) {
  return values.reduce((sum, value) => sum + BigInt(value.replace(".", "")), 0n);
}

function scheduleNode(index, workValue = "100.00", overrides = {}) {
  return {
    nodeId: `NODE-${index}`,
    name: `施工節點 ${index}`,
    scheduleSemantic: `PHASE_${index}`,
    startAt: `2026-09-${String(index).padStart(2, "0")}T08:00:00+08:00`,
    dueAt: `2026-09-${String(index).padStart(2, "0")}T18:00:00+08:00`,
    workItems: [`WORK-${index}`],
    quotationRefs: [{ quotationId: "Q-1", version: "v1", itemId: `QI-${index}`, allocation: workValue }],
    drawingRefs: [{ drawingId: "D-1", version: "v1", sheetId: `S-${index}` }],
    workValue,
    requiredEvidence: [{ evidenceType: "PHOTO", basisRef: `ARTICLE-${index}` }],
    holdPoint: index === 3,
    ...overrides,
  };
}

function payableNodes(nodes) {
  return nodes.flatMap((node) => Array.isArray(node.children) && node.children.length ? payableNodes(node.children) : [node]);
}

function quotationFor(nodes, overrides = {}) {
  const leaves = payableNodes(nodes);
  const items = leaves.flatMap((node) => node.quotationRefs.map((ref) => ({
    itemId: ref.itemId,
    amount: ref.allocation,
  })));
  const totalCents = sumMoney(items.map((item) => item.amount));
  const total = `${totalCents / 100n}.${String(totalCents % 100n).padStart(2, "0")}`;
  return { quotationId: "Q-1", version: "v1", total, items, ...overrides };
}

function partyProof(role, suffix = role) {
  return {
    partyId: role === "OWNER" ? "OWNER-1" : "CONTRACTOR-1",
    proofId: `PROOF-${suffix}`,
    role,
    verified: true,
    createdAt: "2026-08-15T11:00:00+08:00",
  };
}

function finalStateInput(overrides = {}) {
  return {
    caseId: "CASE-1", subjectId: "FINAL-1", projectContractId: "CONTRACT-1", contractVersion: "CV-1",
    ownerId: "OWNER-1", contractorId: "CONTRACTOR-1", ...overrides,
  };
}

function finalAcceptanceRecord(overrides = {}) {
  return {
    acceptanceId: "ACCEPTANCE-1", caseId: "CASE-1", subjectId: "FINAL-1",
    projectContractId: "CONTRACT-1", contractVersion: "CV-1",
    documentRef: { documentId: "FINAL-ACCEPTANCE-DOC-1", version: "v1" },
    completedAt: "2026-08-15T12:55:00+08:00", ownerDecision: "ACCEPT",
    ownerDecisionEvidence: { documentId: "OWNER-ACCEPTANCE-DECISION-1", version: "v1" },
    ownerProof: { ...partyProof("OWNER", "FINAL-ACCEPTANCE"), createdAt: "2026-08-15T12:56:00+08:00" },
    ...overrides,
  };
}

function finalReview(overrides = {}) {
  return {
    ...validDomainInputs.DRSReview,
    reviewId: "FINAL-REV-1", caseId: "CASE-1", subjectId: "FINAL-1",
    status: "READY_FOR_OWNER_DECISION", createdAt: "2026-08-15T13:02:00+08:00",
    ...overrides,
  };
}

function finalDecision(review, decision = "APPROVE", overrides = {}) {
  return {
    ...validDomainInputs.OwnerDecision,
    decisionId: `FINAL-DEC-${decision}`, caseId: "CASE-1", subjectId: "FINAL-1",
    reviewId: review.reviewId, reviewVersion: review.reviewVersion, ownerId: "OWNER-1", decision,
    reason: decision === "APPROVE" ? "依實際審查紀錄核准" : "仍需補件",
    createdAt: "2026-08-15T13:04:00+08:00", review,
    ...overrides,
  };
}

function designSchedule(overrides = {}) {
  return {
    scheduleId: "DESIGN-SCH-1", version: "v1",
    DESIGN_DELIVERABLE_SCHEDULE: "DESIGN-SCH-1@v1",
    nodes: [
      {
        nodeId: "DESIGN-NODE-1", name: "第一次細部施工圖交付", dueAt: "2026-09-20T18:00:00+08:00",
        deliverableRefs: [{ documentId: "DESIGN-DELIVERABLE-1", version: "v1" }],
      },
    ],
    ...overrides,
  };
}

function worksAssemblyTruth(api, overrides = {}) {
  const nodes = Array.from({ length: 10 }, (_, index) => scheduleNode(index + 1));
  const quotation = quotationFor(nodes);
  const generated = api.generateWorksMilestones({
    caseId: "CASE-1", projectTotalAmount: quotation.total, quotation,
    schedule: { scheduleId: "SCH-1", version: "v1", nodes },
  });
  assert.equal(generated.ok, true);
  return {
    contractType: "WORKS", caseData: { caseId: "CASE-1" },
    values: {
      CASE_ID: "CASE-1", PROJECT_CONTRACT_ID: "CONTRACT-1", PROJECT_CONTRACT_VERSION: "CV-1",
      PROJECT_CONTRACT_TYPE: "WORKS", PROJECT_TOTAL_AMOUNT: quotation.total,
      CONSTRUCTION_SCHEDULE_ID: "SCH-1", CONSTRUCTION_SCHEDULE_VERSION: "v1",
      PROJECT_START_AT: "2026-09-01T08:00:00+08:00", PROJECT_END_AT: "2026-09-10T18:00:00+08:00",
    },
    versionMetadata: { versionId: "CV-1", status: "DRAFT" }, quotation,
    constructionSchedule: { scheduleId: "SCH-1", version: "v1", nodes },
    milestones: generated.milestones, paymentStages: generated.paymentStages, changes: [],
    warrantyTerms: { documentId: "WT-1", version: "v1" },
    ...overrides,
  };
}

function approvedFinalPaymentState(api) {
  let state = api.createFinalPaymentState(finalStateInput());
  const review = finalReview();
  state = api.applyFinalPaymentEvent(state, {
    type: "FINAL_ACCEPTANCE_COMPLETED", eventId: "ISSUED-A", acceptanceRecord: finalAcceptanceRecord(),
    occurredAt: "2026-08-15T13:00:00+08:00",
  });
  state = api.applyFinalPaymentEvent(state, {
    type: "WARRANTY_PLEDGE_SIGNED", eventId: "ISSUED-W", warrantyPledge: validDomainInputs.WarrantyPledge,
    occurredAt: "2026-08-15T13:01:00+08:00",
  });
  state = api.applyFinalPaymentEvent(state, {
    type: "DRS_DOCUMENT_AND_PROCEDURE_REVIEW_COMPLETED", eventId: "ISSUED-R", review,
    occurredAt: "2026-08-15T13:03:00+08:00",
  });
  return api.applyFinalPaymentEvent(state, {
    type: "OWNER_DECISION_RECORDED", eventId: "ISSUED-D", ownerDecision: finalDecision(review),
    occurredAt: "2026-08-15T13:05:00+08:00",
  });
}

const validDomainInputs = {
  Case: {
    caseId: "CASE-1", ownerId: "OWNER-1", projectName: "住家裝修", status: "CONTRACT_PREPARATION",
    createdAt: "2026-08-15T09:00:00+08:00",
  },
  Party: { partyId: "OWNER-1", role: "OWNER", legalName: "王小明" },
  ProjectContract: {
    contractId: "CONTRACT-1", caseId: "CASE-1", contractType: "DESIGN", templateVersion: "v0.2",
    status: "DRAFT", ownerId: "OWNER-1", contractorId: "CONTRACTOR-1",
  },
  ContractVersion: {
    versionId: "CV-1", contractId: "CONTRACT-1", parentVersionId: null, status: "DRAFT",
    createdAt: "2026-08-15T09:10:00+08:00", createdBy: "OWNER-1", changeSummary: "初稿",
    structuredContent: { articleIds: ["DESIGN-01-PARTIES"] },
  },
  Attachment: {
    attachmentId: "ATT-1", caseId: "CASE-1", contractId: "CONTRACT-1", attachmentType: "FORMAL_QUOTATION",
    documentId: "DOC-1", version: "v1",
  },
  Schedule: {
    scheduleId: "SCH-1", caseId: "CASE-1", version: "v1", nodes: [scheduleNode(1)],
  },
  Milestone: {
    milestoneId: "MS-1", caseId: "CASE-1", scheduleNodeId: "NODE-1", name: "施工節點 1",
    startAt: "2026-09-01T08:00:00+08:00", dueAt: "2026-09-01T18:00:00+08:00",
    workItems: ["WORK-1"], quotationRefs: [{ quotationId: "Q-1", version: "v1", itemId: "QI-1", allocation: "100.00" }],
    drawingRefs: [{ drawingId: "D-1", version: "v1", sheetId: "S-1" }], workValue: "100.00",
    paymentRate: 8, paymentAmount: "80.00", requiredEvidence: [{ evidenceType: "PHOTO", basisRef: "A-1" }],
    holdPoint: false, drsReviewState: "PENDING", ownerDecisionState: "PENDING", paymentState: "PENDING",
  },
  PaymentStage: {
    paymentStageId: "PS-1", caseId: "CASE-1", subjectId: "MS-1", stageType: "PROGRESS",
    rate: 8, amount: "80.00", currency: "TWD", state: "PENDING",
  },
  DRSReview: {
    reviewId: "REV-1", reviewVersion: "v1", caseId: "CASE-1", subjectId: "MS-1",
    status: "READY_FOR_OWNER_DECISION", basis: [{ documentId: "DOC-1", version: "v1" }],
    findings: [], createdAt: "2026-08-15T10:00:00+08:00", createdBy: "DRS-REVIEWER-1",
  },
  OwnerDecision: {
    decisionId: "DEC-1", caseId: "CASE-1", reviewId: "REV-1", reviewVersion: "v1", subjectId: "MS-1",
    ownerId: "OWNER-1", decision: "APPROVE", reason: "依據已核對", evidence: [{ documentId: "DOC-1", version: "v1" }],
    createdAt: "2026-08-15T10:30:00+08:00",
  },
  PartyAgreement: {
    agreementId: "AGR-1", caseId: "CASE-1", subjectId: "CHANGE-1",
    ownerId: "OWNER-1", contractorId: "CONTRACTOR-1",
    ownerProof: { partyId: "OWNER-1", proofId: "P-OWNER", role: "OWNER", verified: true, createdAt: "2026-08-15T11:00:00+08:00" },
    contractorProof: { partyId: "CONTRACTOR-1", proofId: "P-CONTRACTOR", role: "CONTRACTOR", verified: true, createdAt: "2026-08-15T11:01:00+08:00" },
  },
  ChangeRequest: {
    changeId: "CHANGE-1", caseId: "CASE-1", changeType: "WORK_CHANGE", requestedBy: "OWNER-1",
    reason: "調整櫃體", baselineVersion: "CV-1", quotationRefs: [{ quotationId: "Q-1", version: "v1" }],
    drawingRefs: [{ drawingId: "D-1", version: "v1" }], amountImpact: "1000.00", scheduleImpact: { days: 2 },
    versionImpact: { from: "CV-1", proposed: "CV-2" }, paymentImpacts: [{ paymentStageId: "PS-1", delta: "1000.00" }],
    status: "REQUESTED",
  },
  ChangeOrder: {
    changeOrderId: "CO-1", caseId: "CASE-1", changeType: "CHANGE_ORDER", changeRequestId: "CHANGE-1",
    baselineVersion: "CV-1", reason: "待雙方確認調整櫃體", amountImpact: "1000.00", scheduleImpact: { days: 2 },
    versionImpact: { from: "CV-1", proposed: "CV-2" }, paymentImpacts: [{ paymentStageId: "PS-1", delta: "1000.00" }],
    baselineIdentity: { contractId: "CONTRACT-1", versionId: "CV-1", sha256: "a".repeat(64) },
    status: "DRAFT", partyConfirmationStatus: "PENDING_BILATERAL_CONFIRMATION",
  },
  WarrantyPledge: {
    pledgeId: "WP-1", caseId: "CASE-1", projectContractId: "CONTRACT-1", contractVersion: "CV-1",
    warrantyTermsRef: { documentId: "WT-1", version: "v1" }, status: "SIGNED",
    signingProof: { partyId: "CONTRACTOR-1", proofId: "WP-PROOF", role: "CONTRACTOR", verified: true, createdAt: "2026-08-15T12:00:00+08:00" },
  },
  CaseEvent: {
    eventId: "EV-1", actorId: "OWNER-1", occurredAt: "2026-08-15T12:30:00+08:00", caseId: "CASE-1",
    action: "OWNER_DECISION_RECORDED", subjectId: "MS-1", basis: [{ documentId: "DOC-1", version: "v1" }],
    status: "RECORDED", nextActor: "CONTRACTOR-1",
  },
};

validDomainInputs.OwnerDecision.review = structuredClone(validDomainInputs.DRSReview);

test("loads in Node and a browser-like VM without a second source truth", async () => {
  const api = getEngine();
  assert.equal(api.source, source);
  const context = { globalThis: { crypto: webcrypto, TextEncoder, structuredClone }, console };
  context.globalThis.LaibeProjectContractSource = source;
  vm.runInNewContext(readFileSync(enginePath, "utf8"), context);
  assert.equal(context.globalThis.LaibeProjectContractEngine.source, source);
  assert.equal(context.globalThis.LaibeProjectContractEngine.engineVersion, "v0.2");
  assert.equal(await context.globalThis.LaibeProjectContractEngine.sha256("abc"), "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
  const foreignForBrowserEngine = vm.runInNewContext("({ b: 2, a: [true] })");
  assert.throws(
    () => context.globalThis.LaibeProjectContractEngine.canonicalSerialize(foreignForBrowserEngine),
    /CANONICAL_NORMALIZATION_REQUIRED/,
  );
  const normalizedForBrowserEngine = context.globalThis.LaibeProjectContractEngine.normalizeCanonicalData(foreignForBrowserEngine);
  assert.equal(context.globalThis.LaibeProjectContractEngine.canonicalSerialize(normalizedForBrowserEngine), "{\"a\":[true],\"b\":2}");
});

test("normalizes only canonical contract types and source-owned legacy mappings", () => {
  const api = getEngine();
  assert.equal(api.normalizeContractType("DESIGN"), "DESIGN");
  assert.equal(api.normalizeContractType("works"), "WORKS");
  assert.equal(api.normalizeContractType("dt"), "DESIGN_BUILD");
  assert.throws(() => api.normalizeContractType("PCM"), /UNSUPPORTED_CONTRACT_TYPE/);
});

test("creates frozen normalized domain shapes and fails closed on bad types or missing references", () => {
  const api = getEngine();
  for (const [kind, input] of Object.entries(validDomainInputs)) {
    const result = api.createDomain(kind, input);
    assert.equal(result.kind, kind);
    assert.ok(Object.isFrozen(result));
  }
  assert.throws(() => api.createDomain("Unknown", {}), /UNSUPPORTED_DOMAIN_KIND/);
  assert.throws(() => api.createDomain("OwnerDecision", { ...validDomainInputs.OwnerDecision, reviewId: "" }), /MISSING_REQUIRED_FIELD.*reviewId/);
  assert.throws(() => api.createDomain("ProjectContract", { ...validDomainInputs.ProjectContract, contractType: "other" }), /UNSUPPORTED_CONTRACT_TYPE/);
  assert.throws(() => api.createDomain("ProjectContract", { ...validDomainInputs.ProjectContract, status: "ACTIVE_WITHOUT_SIGNATURE" }), /INVALID_ENUM_VALUE/);
  assert.throws(() => api.createDomain("ProjectContract", { ...validDomainInputs.ProjectContract, status: "SIGNED" }), /VERIFIED_SIGNED_PROJECT_CONTRACT_NOT_AVAILABLE/);
  assert.throws(() => api.createDomain("ContractVersion", { ...validDomainInputs.ContractVersion, status: "SIGNED" }), /VERIFIED_SIGNED_CONTRACT_VERSION_NOT_AVAILABLE/);
  assert.throws(() => api.createDomain("ChangeOrder", {
    ...validDomainInputs.ChangeOrder,
    baselineIdentity: { ...validDomainInputs.ChangeOrder.baselineIdentity, sha256: "not-a-hash" },
  }), /INVALID_BASELINE_IDENTITY/);
  assert.throws(() => api.createDomain("OwnerDecision", {
    ...validDomainInputs.OwnerDecision,
    decision: "OWNER_OVERRIDE",
  }), /OWNER_OVERRIDE_ORIGINAL_REVIEW_REQUIRED/);
});

test("exposes named domain factories for shared consumers", () => {
  const api = getEngine();
  const factories = {
    createCase: "Case",
    createParty: "Party",
    createProjectContract: "ProjectContract",
    createContractVersion: "ContractVersion",
    createAttachment: "Attachment",
    createSchedule: "Schedule",
    createMilestone: "Milestone",
    createPaymentStage: "PaymentStage",
    createDRSReview: "DRSReview",
    createOwnerDecision: "OwnerDecision",
    createChangeRequest: "ChangeRequest",
    createCaseEvent: "CaseEvent",
  };
  for (const [factory, kind] of Object.entries(factories)) {
    assert.equal(typeof api[factory], "function", `${factory} must be exposed`);
    assert.equal(api[factory](validDomainInputs[kind]).kind, kind);
  }
});

test("assembles canonical stable articles, a single common appendix reference, metadata, and unresolved placeholders", () => {
  const api = getEngine();
  const designPaymentStages = api.calculateDesignPayments("100000.00").stages;
  const assembled = api.assembleContract({
    contractType: "DESIGN",
    templateVersion: "v0.2",
    caseData: { caseId: "CASE-1" },
    values: {
      CASE_ID: "CASE-1", PROJECT_CONTRACT_ID: "CONTRACT-1", PROJECT_CONTRACT_TYPE: "DESIGN",
      PROJECT_CONTRACT_VERSION: "CV-1", PROJECT_CONTRACT_GENERATED_AT: "2026-08-15T09:00:00+08:00",
      OWNER_LEGAL_NAME: "王小明", CONTRACTOR_LEGAL_NAME: "好宅設計", PROJECT_NAME: "住家裝修",
      PROJECT_ADDRESS: "台北市", TOTAL_DESIGN_FEE: "100000.00",
      DESIGN_DELIVERABLE_SCHEDULE: "DESIGN-SCH-1@v1",
    },
    attachmentMetadata: [{ attachmentId: "ATT-1", documentId: "DOC-1", version: "v1" }],
    versionMetadata: { versionId: "CV-1", status: "DRAFT" },
    designSchedule: designSchedule(), designPaymentStages, changes: [],
  });
  assert.equal(assembled.contractType, "DESIGN");
  assert.equal(assembled.status, "DRAFT");
  assert.equal(assembled.signatureStatus, "NOT_SIGNED");
  assert.deepEqual(assembled.articles.map((article) => article.articleId), source.templates.DESIGN.articles.map((article) => article.articleId));
  assert.equal(assembled.commonAppendix.ref, source.commonProcedureAppendix.appendixId);
  assert.equal(assembled.commonAppendix.definition, source.commonProcedureAppendix);
  assert.ok(assembled.renderedContract.includes("王小明"));
  assert.ok(assembled.unresolvedPlaceholders.includes("{{OWNER_ID}}"));
  assert.equal(assembled.metadata.sourceId, source.sourceId);
  assert.deepEqual(assembled.metadata.attachments, [{ attachmentId: "ATT-1", documentId: "DOC-1", version: "v1" }]);
  assert.throws(() => api.assembleContract({ contractType: "DESIGN", values: { "owner-name": "x" } }), /INVALID_PLACEHOLDER_VALUE_KEY/);
});

test("calculates DESIGN 20/10/30/40 from TOTAL_DESIGN_FEE with exact Stage 3 wording and closed rounding", () => {
  const result = getEngine().calculateDesignPayments("1000.01");
  assert.deepEqual(result.stages.map((stage) => stage.rate), [20, 10, 30, 40]);
  assert.equal(result.stages[2].trigger, "第一次細部施工圖＋報價單交付");
  assert.deepEqual(result.stages.map((stage) => stage.amount), ["200.00", "100.00", "300.00", "400.01"]);
  assert.equal(sumMoney(result.stages.map((stage) => stage.amount)), 100001n);
  assert.equal(result.totalAmount, "1000.01");
});

test("generates dynamic WORKS milestones from schedule semantics and quotation references with 5/80/15 closure", () => {
  const nodes = Array.from({ length: 10 }, (_, index) => scheduleNode(index + 1));
  const quotation = quotationFor(nodes);
  const result = getEngine().generateWorksMilestones({
    caseId: "CASE-1", projectTotalAmount: quotation.total, quotation,
    schedule: { scheduleId: "SCH-1", version: "v1", nodes },
  });
  assert.equal(result.ok, true);
  assert.equal(result.milestones.length, 10);
  assert.equal(result.paymentStages[0].rate, 5);
  assert.equal(result.paymentStages.at(-1).rate, 15);
  assert.equal(result.milestones.reduce((sum, milestone) => sum + milestone.paymentRate, 0), 80);
  assert.ok(result.milestones.every((milestone) => milestone.paymentRate <= 10));
  assert.equal(sumMoney(result.paymentStages.map((stage) => stage.amount)), 100000n);
  assert.ok(result.milestones.every((milestone) => milestone.quotationRefs.length > 0 && milestone.scheduleSemantic));
});

test("fails procedurally with an actionable issue when a >10% node lacks semantic children", () => {
  const nodes = [scheduleNode(1, "20.00"), ...Array.from({ length: 8 }, (_, i) => scheduleNode(i + 2, "10.00"))];
  const quotation = quotationFor(nodes);
  const result = getEngine().generateWorksMilestones({
    caseId: "CASE-1", projectTotalAmount: quotation.total, quotation,
    schedule: { scheduleId: "SCH-1", version: "v1", nodes },
  });
  assert.equal(result.ok, false);
  assert.equal(result.status, "PROCEDURAL_INCOMPLETE");
  assert.ok(result.issues.some((issue) => issue.code === "PROGRESS_NODE_EXCEEDS_MAX_RATE_REQUIRES_SEMANTIC_CHILD_NODES" && issue.nodeId === "NODE-1"));
  assert.doesNotMatch(JSON.stringify(result), /QUALITY_FAIL/);
});

test("splits >10% work only through supplied semantic child nodes", () => {
  const parent = scheduleNode(1, "20.00", {
    quotationRefs: [
      { quotationId: "Q-1", version: "v1", itemId: "QI-1-A", allocation: "10.00" },
      { quotationId: "Q-1", version: "v1", itemId: "QI-1-B", allocation: "10.00" },
    ],
    children: [
      scheduleNode("1-A", "10.00", {
        scheduleSemantic: "PHASE_1_ROUGH_IN",
        startAt: "2026-09-01T08:00:00+08:00",
        dueAt: "2026-09-01T12:00:00+08:00",
      }),
      scheduleNode("1-B", "10.00", {
        scheduleSemantic: "PHASE_1_CLOSE_UP",
        startAt: "2026-09-01T13:00:00+08:00",
        dueAt: "2026-09-01T18:00:00+08:00",
      }),
    ],
  });
  const nodes = [parent, ...Array.from({ length: 8 }, (_, i) => scheduleNode(i + 2, "10.00"))];
  const quotation = quotationFor(nodes);
  const result = getEngine().generateWorksMilestones({
    caseId: "CASE-1", projectTotalAmount: quotation.total, quotation,
    schedule: { scheduleId: "SCH-1", version: "v1", nodes },
  });
  assert.equal(result.ok, true);
  assert.equal(result.milestones.length, 10);
  assert.ok(result.milestones.some((milestone) => milestone.scheduleSemantic === "PHASE_1_ROUGH_IN"));
  assert.ok(result.milestones.every((milestone) => milestone.paymentRate <= 10));
});

test("treats missing schedule or quotation basis as procedural incompleteness, never a quality judgment", () => {
  const badNode = scheduleNode(1, "100.00", { quotationRefs: [] });
  const quotation = quotationFor([scheduleNode(1, "100.00")]);
  const result = getEngine().generateWorksMilestones({
    caseId: "CASE-1", projectTotalAmount: quotation.total, quotation,
    schedule: { scheduleId: "SCH-1", version: "v1", nodes: [badNode] },
  });
  assert.equal(result.ok, false);
  assert.equal(result.status, "PROCEDURAL_INCOMPLETE");
  assert.ok(result.issues.some((issue) => issue.code === "MISSING_QUOTATION_REFS"));
  assert.doesNotMatch(JSON.stringify(result), /QUALITY_FAIL/);
});

test("rejects structurally incomplete quotation, drawing, and evidence references", () => {
  const invalidQuotation = scheduleNode(1, "50.00", { quotationRefs: [{ quotationId: "Q-1" }] });
  const invalidEvidence = scheduleNode(2, "50.00", {
    drawingRefs: [{ drawingId: "D-1" }],
    requiredEvidence: [{ evidenceType: "PHOTO" }],
  });
  const quotation = quotationFor([scheduleNode(1, "50.00"), scheduleNode(2, "50.00")]);
  const result = getEngine().generateWorksMilestones({
    caseId: "CASE-1",
    projectTotalAmount: quotation.total,
    quotation,
    schedule: { scheduleId: "SCH-1", version: "v1", nodes: [invalidQuotation, invalidEvidence] },
  });
  assert.equal(result.ok, false);
  assert.equal(result.status, "PROCEDURAL_INCOMPLETE");
  assert.ok(result.issues.some((issue) => issue.code === "INVALID_QUOTATION_REF"));
  assert.ok(result.issues.some((issue) => issue.code === "INVALID_DRAWING_REF"));
  assert.ok(result.issues.some((issue) => issue.code === "EVIDENCE_BASIS_REQUIRED"));
});

test("keeps final readiness, Owner Decision, and payment action as independent explicit events", () => {
  const api = getEngine();
  let state = api.createFinalPaymentState(finalStateInput());
  const review = finalReview();
  function advanceToReady(current, prefix) {
    current = api.applyFinalPaymentEvent(current, {
      type: "FINAL_ACCEPTANCE_COMPLETED", eventId: `${prefix}-A`, acceptanceRecord: finalAcceptanceRecord(),
      occurredAt: "2026-08-15T13:00:00+08:00",
    });
    current = api.applyFinalPaymentEvent(current, {
      type: "WARRANTY_PLEDGE_SIGNED", eventId: `${prefix}-W`, warrantyPledge: validDomainInputs.WarrantyPledge,
      occurredAt: "2026-08-15T13:01:00+08:00",
    });
    return api.applyFinalPaymentEvent(current, {
      type: "DRS_DOCUMENT_AND_PROCEDURE_REVIEW_COMPLETED", eventId: `${prefix}-R`, review,
      occurredAt: "2026-08-15T13:03:00+08:00",
    });
  }
  assert.throws(() => api.applyFinalPaymentEvent(state, {
    type: "DRS_DOCUMENT_AND_PROCEDURE_REVIEW_COMPLETED", eventId: "EV-R0",
    review: finalReview({ createdAt: "2026-08-15T12:58:00+08:00" }), occurredAt: "2026-08-15T12:59:00+08:00",
  }), /FINAL_PREREQUISITES_INCOMPLETE/);
  state = advanceToReady(state, "EV");
  assert.equal(state.status, "FINAL_PAYMENT_READY_FOR_OWNER_DECISION");
  assert.equal(state.paymentAction, null);
  const objected = api.applyFinalPaymentEvent(state, {
    type: "OWNER_DECISION_RECORDED", eventId: "EV-D1", ownerDecision: finalDecision(review, "OBJECT"),
    occurredAt: "2026-08-15T13:05:00+08:00",
  });
  assert.equal(objected.paymentAction, null);
  state = advanceToReady(api.createFinalPaymentState(finalStateInput()), "EV2");
  state = api.applyFinalPaymentEvent(state, {
    type: "OWNER_DECISION_RECORDED", eventId: "EV-D2", ownerDecision: finalDecision(review),
    occurredAt: "2026-08-15T13:05:00+08:00",
  });
  assert.equal(state.status, "FINAL_PAYMENT_APPROVED");
  state = api.applyFinalPaymentEvent(state, { type: "FINAL_PAYMENT_ACTION_RECORDED", eventId: "EV-P", actorId: "OWNER-1", occurredAt: "2026-08-15T13:06:00+08:00" });
  assert.equal(state.status, "FINAL_PAYMENT_ACTION");
  assert.equal(state.events.length, 5);
});

test("never converts silence, elapsed time, or a DRS Review into approval or payment", () => {
  const api = getEngine();
  const state = api.createFinalPaymentState(finalStateInput());
  for (const type of ["SILENCE", "TIME_ELAPSED", "DRS_REVIEW_APPROVE_PAYMENT"]) {
    assert.throws(() => api.applyFinalPaymentEvent(state, { type }), /UNSUPPORTED_FINAL_PAYMENT_EVENT/);
  }
});

test("keeps DESIGN_BUILD amounts and payment profiles separate and requires every release condition", () => {
  const api = getEngine();
  const profiles = api.createDesignBuildPaymentProfiles({ designFee: "100000.00", worksAmount: "900000.00" });
  assert.equal(profiles.design.designFee, "100000.00");
  assert.equal(profiles.works.worksAmount, "900000.00");
  assert.equal(Object.hasOwn(profiles, "combinedTotal"), false);
  const all = Object.fromEntries(api.DESIGN_BUILD_RELEASE_CONDITIONS.map((condition) => [condition, true]));
  assert.equal(api.evaluateDesignBuildReleaseGate(all).released, false);
  assert.equal(api.evaluateDesignBuildReleaseGate({ ...all, OWNER_DECISION: "CONSTRUCTION_RELEASE" }).released, true);
  assert.equal(api.evaluateDesignBuildReleaseGate({ ...all, DRAWING_VERSION_CONFIRMED: false, OWNER_DECISION: "CONSTRUCTION_RELEASE" }).released, false);
});

test("records early-construction override without rewriting missing conditions or original review", () => {
  const api = getEngine();
  const review = structuredClone(validDomainInputs.DRSReview);
  const override = api.createEarlyConstructionOverride({
    overrideId: "OV-1", caseId: "CASE-1", ownerId: "OWNER-1", contractorId: "CONTRACTOR-1",
    missingConditions: ["DRAWING_VERSION_CONFIRMED"],
    scope: ["拆除工程"], risks: ["圖說仍待確認"], originalReview: review,
    ownerProof: validDomainInputs.PartyAgreement.ownerProof,
    contractorProof: validDomainInputs.PartyAgreement.contractorProof,
    createdAt: "2026-08-15T14:00:00+08:00",
  });
  review.status = "SUPPLEMENT_REQUIRED";
  assert.equal(override.originalReview.status, "READY_FOR_OWNER_DECISION");
  assert.deepEqual(override.missingConditions, ["DRAWING_VERSION_CONFIRMED"]);
  assert.ok(Object.isFrozen(override.originalReview));
  assert.equal(override.status, "OWNER_EARLY_CONSTRUCTION_OVERRIDE");
});

test("keeps DRSReview and OwnerDecision independent with exact review references and immutable override history", () => {
  const api = getEngine();
  const review = api.createDomain("DRSReview", validDomainInputs.DRSReview);
  const decision = api.createDomain("OwnerDecision", validDomainInputs.OwnerDecision);
  assert.equal(Object.hasOwn(review, "decision"), false);
  assert.equal(decision.reviewId, review.reviewId);
  assert.equal(decision.reviewVersion, review.reviewVersion);
  const override = api.createOwnerOverride({ ...validDomainInputs.OwnerDecision, decision: "OWNER_OVERRIDE", originalReview: review });
  assert.equal(override.originalReview.status, "READY_FOR_OWNER_DECISION");
  assert.ok(Object.isFrozen(override.originalReview));
});

test("establishes PartyAgreement only from two verifiable party proofs", () => {
  const api = getEngine();
  const both = api.createPartyAgreement(validDomainInputs.PartyAgreement);
  assert.equal(both.status, "PARTY_AGREEMENT");
  const ownerOnly = api.createPartyAgreement({ ...validDomainInputs.PartyAgreement, contractorProof: null });
  assert.equal(ownerOnly.status, "OWNER_REPORTED_PRIVATE_AGREEMENT");
  assert.equal(ownerOnly.established, false);
  assert.equal(api.createDomain("PartyAgreement", { ...validDomainInputs.PartyAgreement, contractorProof: null }).status, "OWNER_REPORTED_PRIVATE_AGREEMENT");
  const contractorOnly = api.createPartyAgreement({ ...validDomainInputs.PartyAgreement, ownerProof: null });
  assert.equal(contractorOnly.status, "UNVERIFIED_PARTY_AGREEMENT");
});

test("types changes, preserves a draft ChangeOrder baseline identity, and refuses fake formalization", () => {
  const api = getEngine();
  for (const changeType of ["DESIGN_CHANGE", "WORK_CHANGE", "SCOPE_CHANGE", "CHANGE_REQUEST", "CHANGE_ORDER", "SCHEDULE_CHANGE"]) {
    const input = changeType === "CHANGE_ORDER"
      ? { ...validDomainInputs.ChangeOrder, changeType }
      : { ...validDomainInputs.ChangeRequest, changeType };
    assert.equal(api.createDomain(changeType === "CHANGE_ORDER" ? "ChangeOrder" : "ChangeRequest", input).changeType, changeType);
  }
  const baselineIdentity = structuredClone(validDomainInputs.ChangeOrder.baselineIdentity);
  const draft = api.createDraftChangeOrder(validDomainInputs.ChangeOrder);
  baselineIdentity.sha256 = "b".repeat(64);
  assert.equal(draft.baselineIdentity.sha256, "a".repeat(64));
  assert.equal(draft.baselineVersion, "CV-1");
  assert.equal(draft.status, "DRAFT");
  assert.ok(Object.isFrozen(draft.baselineIdentity));
  assert.throws(() => api.createChangeOrder({
    ...validDomainInputs.ChangeOrder,
    ownerProof: partyProof("OWNER"), contractorProof: partyProof("CONTRACTOR"),
  }), /FORMAL_CHANGE_ORDER_NOT_YET_IMPLEMENTED/);
});

test("uses WarrantyPledge only as a document gate and preserves fallback communication without payment", () => {
  const api = getEngine();
  const pledge = api.createWarrantyPledge(validDomainInputs.WarrantyPledge);
  assert.equal(pledge.status, "SIGNED");
  assert.equal(pledge.warrantyDeposit, "NONE");
  assert.throws(() => api.createWarrantyPledge({ ...validDomainInputs.WarrantyPledge, projectContractId: "" }), /MISSING_REQUIRED_FIELD.*projectContractId/);
  const fallback = api.createFallbackRecord({
    fallbackRecordId: "FB-1", caseId: "CASE-1", projectContractId: "CONTRACT-1", channel: "雙方指定電子郵件",
    action: "OWNER_DECISION_SUBMITTED", actorId: "OWNER-1", createdAt: "2026-08-15T15:00:00+08:00",
  });
  assert.equal(fallback.projectContractId, "CONTRACT-1");
  assert.equal(fallback.paymentState, "UNCHANGED");
  assert.equal(fallback.backfillStatus, "BACKFILLED_CASE_EVENT_PENDING");
});

test("canonical serialization is deterministic and SHA-256 matches the known vector", async () => {
  const api = getEngine();
  const left = { z: 1, nested: { b: 2, a: 1 }, list: [{ y: 2, x: 1 }] };
  const right = { list: [{ x: 1, y: 2 }], nested: { a: 1, b: 2 }, z: 1 };
  assert.equal(api.canonicalSerialize(left), api.canonicalSerialize(right));
  assert.equal(await api.sha256("abc"), "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
  assert.equal(await api.sha256(api.canonicalSerialize(left)), await api.sha256(api.canonicalSerialize(right)));
});

test("rejects replayed, duplicate-id, backward, and invalid-calendar final-payment events", () => {
  const api = getEngine();
  let state = api.createFinalPaymentState(finalStateInput());
  assert.throws(() => api.applyFinalPaymentEvent(state, {
    type: "FINAL_ACCEPTANCE_COMPLETED", eventId: "EV-BAD-DATE", acceptanceRecord: finalAcceptanceRecord(),
    occurredAt: "2026-02-31T13:00:00+08:00",
  }), /INVALID_ISO_DATETIME/);
  state = api.applyFinalPaymentEvent(state, {
    type: "FINAL_ACCEPTANCE_COMPLETED", eventId: "EV-1", acceptanceRecord: finalAcceptanceRecord(),
    occurredAt: "2026-08-15T13:00:00+08:00",
  });
  assert.throws(() => api.applyFinalPaymentEvent(state, {
    type: "FINAL_ACCEPTANCE_COMPLETED", eventId: "EV-2", acceptanceRecord: finalAcceptanceRecord(),
    occurredAt: "2026-08-15T13:01:00+08:00",
  }), /ILLEGAL_FINAL_PAYMENT_EVENT_ORDER/);
  assert.throws(() => api.applyFinalPaymentEvent(state, {
    type: "WARRANTY_PLEDGE_SIGNED", eventId: "EV-1", pledgeId: "WP-1", occurredAt: "2026-08-15T13:01:00+08:00",
  }), /DUPLICATE_FINAL_PAYMENT_EVENT_ID/);
  assert.throws(() => api.applyFinalPaymentEvent(state, {
    type: "WARRANTY_PLEDGE_SIGNED", eventId: "EV-3", pledgeId: "WP-1", occurredAt: "2026-08-15T12:59:59+08:00",
  }), /FINAL_PAYMENT_EVENT_TIME_REVERSED/);
});

test("requires the warranty final event to carry a verifiable contractor-signed pledge", () => {
  const api = getEngine();
  let state = api.createFinalPaymentState(finalStateInput());
  state = api.applyFinalPaymentEvent(state, {
    type: "FINAL_ACCEPTANCE_COMPLETED", eventId: "EV-A", acceptanceRecord: finalAcceptanceRecord(),
    occurredAt: "2026-08-15T13:00:00+08:00",
  });
  assert.throws(() => api.applyFinalPaymentEvent(state, {
    type: "WARRANTY_PLEDGE_SIGNED", eventId: "EV-W", pledgeId: "WP-ARBITRARY", occurredAt: "2026-08-15T13:01:00+08:00",
  }), /VERIFIABLE_WARRANTY_PLEDGE_REQUIRED/);
});

test("binds final-payment events to exact contract parties and retained verifiable domain records", () => {
  const api = getEngine();
  let state = api.createFinalPaymentState(finalStateInput());
  assert.equal(state.projectContractId, "CONTRACT-1");
  assert.equal(state.contractVersion, "CV-1");
  assert.equal(state.ownerId, "OWNER-1");
  assert.equal(state.contractorId, "CONTRACTOR-1");

  const forgedPrerequisites = {
    ...state, finalAcceptanceCompleted: true, warrantyPledgeSigned: true,
  };
  assert.throws(() => api.applyFinalPaymentEvent(forgedPrerequisites, {
    type: "DRS_DOCUMENT_AND_PROCEDURE_REVIEW_COMPLETED", eventId: "EV-FORGED-STATE", review: finalReview(),
    occurredAt: "2026-08-15T13:03:00+08:00",
  }), /FINAL_PAYMENT_STATE_NOT_RUNTIME_ISSUED/);

  assert.throws(() => api.applyFinalPaymentEvent(state, {
    type: "FINAL_ACCEPTANCE_COMPLETED", eventId: "EV-BARE", occurredAt: "2026-08-15T13:00:00+08:00",
  }), /FINAL_ACCEPTANCE_RECORD_REQUIRED/);
  assert.throws(() => api.applyFinalPaymentEvent(state, {
    type: "FINAL_ACCEPTANCE_COMPLETED", eventId: "EV-WRONG-CONTRACT",
    acceptanceRecord: finalAcceptanceRecord({ projectContractId: "CONTRACT-OTHER" }),
    occurredAt: "2026-08-15T13:00:00+08:00",
  }), /FINAL_ACCEPTANCE_BINDING_MISMATCH/);
  assert.throws(() => api.applyFinalPaymentEvent(state, {
    type: "FINAL_ACCEPTANCE_COMPLETED", eventId: "EV-EARLY", acceptanceRecord: finalAcceptanceRecord(),
    occurredAt: "2026-08-15T12:54:00+08:00",
  }), /FINAL_EVENT_PRECEDES_BOUND_RECORD/);

  state = api.applyFinalPaymentEvent(state, {
    type: "FINAL_ACCEPTANCE_COMPLETED", eventId: "EV-ACTUAL", acceptanceRecord: finalAcceptanceRecord(),
    occurredAt: "2026-08-15T13:00:00+08:00",
  });
  assert.ok(Object.isFrozen(state.finalAcceptance));
  assert.ok(Object.isFrozen(state.events[0].acceptanceRecord));

  assert.throws(() => api.applyFinalPaymentEvent(state, {
    type: "WARRANTY_PLEDGE_SIGNED", eventId: "EV-WRONG-PARTY",
    warrantyPledge: {
      ...validDomainInputs.WarrantyPledge,
      signingProof: { ...validDomainInputs.WarrantyPledge.signingProof, partyId: "CONTRACTOR-OTHER" },
    },
    occurredAt: "2026-08-15T13:01:00+08:00",
  }), /WARRANTY_PLEDGE_BINDING_MISMATCH/);
  assert.throws(() => api.applyFinalPaymentEvent(state, {
    type: "WARRANTY_PLEDGE_SIGNED", eventId: "EV-WARRANTY-EARLY",
    warrantyPledge: {
      ...validDomainInputs.WarrantyPledge,
      signingProof: { ...validDomainInputs.WarrantyPledge.signingProof, createdAt: "2026-08-15T13:02:00+08:00" },
    },
    occurredAt: "2026-08-15T13:01:00+08:00",
  }), /FINAL_EVENT_PRECEDES_BOUND_RECORD/);
  state = api.applyFinalPaymentEvent(state, {
    type: "WARRANTY_PLEDGE_SIGNED", eventId: "EV-WARRANTY-ACTUAL",
    warrantyPledge: validDomainInputs.WarrantyPledge, occurredAt: "2026-08-15T13:01:00+08:00",
  });

  assert.throws(() => api.applyFinalPaymentEvent(state, {
    type: "DRS_DOCUMENT_AND_PROCEDURE_REVIEW_COMPLETED", eventId: "EV-REVIEW-ID-ONLY",
    reviewId: "FINAL-REV-1", reviewVersion: "v1", occurredAt: "2026-08-15T13:03:00+08:00",
  }), /VERIFIABLE_DRS_REVIEW_REQUIRED/);
  assert.throws(() => api.applyFinalPaymentEvent(state, {
    type: "DRS_DOCUMENT_AND_PROCEDURE_REVIEW_COMPLETED", eventId: "EV-REVIEW-NOT-READY",
    review: finalReview({ status: "SUPPLEMENT_REQUIRED" }), occurredAt: "2026-08-15T13:03:00+08:00",
  }), /DRS_REVIEW_NOT_READY_FOR_OWNER_DECISION/);
  assert.throws(() => api.applyFinalPaymentEvent(state, {
    type: "DRS_DOCUMENT_AND_PROCEDURE_REVIEW_COMPLETED", eventId: "EV-REVIEW-WRONG-SUBJECT",
    review: finalReview({ subjectId: "FINAL-OTHER" }), occurredAt: "2026-08-15T13:03:00+08:00",
  }), /FINAL_REVIEW_BINDING_MISMATCH/);
  const review = finalReview();
  state = api.applyFinalPaymentEvent(state, {
    type: "DRS_DOCUMENT_AND_PROCEDURE_REVIEW_COMPLETED", eventId: "EV-REVIEW-ACTUAL", review,
    occurredAt: "2026-08-15T13:03:00+08:00",
  });

  const reviewBeforeWarrantyState = {
    ...state,
    events: [
      state.events[0],
      { ...state.events[2], occurredAt: "2026-08-15T13:02:00+08:00" },
      { ...state.events[1], occurredAt: "2026-08-15T13:03:00+08:00" },
    ],
    lastEventAt: "2026-08-15T13:03:00+08:00",
  };
  assert.throws(() => api.applyFinalPaymentEvent(reviewBeforeWarrantyState, {
    type: "OWNER_DECISION_RECORDED", eventId: "EV-ILLEGAL-HISTORY-DECISION",
    ownerDecision: finalDecision(review), occurredAt: "2026-08-15T13:05:00+08:00",
  }), /FINAL_PAYMENT_STATE_NOT_RUNTIME_ISSUED/);

  assert.throws(() => api.applyFinalPaymentEvent(state, {
    type: "OWNER_DECISION_RECORDED", eventId: "EV-DECISION-SCALARS", ownerId: "OWNER-1", decision: "APPROVE",
    reviewId: review.reviewId, reviewVersion: review.reviewVersion, occurredAt: "2026-08-15T13:05:00+08:00",
  }), /VERIFIABLE_OWNER_DECISION_REQUIRED/);
  assert.throws(() => api.applyFinalPaymentEvent(state, {
    type: "OWNER_DECISION_RECORDED", eventId: "EV-DECISION-WRONG-OWNER",
    ownerDecision: finalDecision(review, "APPROVE", { ownerId: "OWNER-OTHER" }),
    occurredAt: "2026-08-15T13:05:00+08:00",
  }), /FINAL_OWNER_DECISION_BINDING_MISMATCH/);
  state = api.applyFinalPaymentEvent(state, {
    type: "OWNER_DECISION_RECORDED", eventId: "EV-DECISION-ACTUAL", ownerDecision: finalDecision(review),
    occurredAt: "2026-08-15T13:05:00+08:00",
  });
  state = api.applyFinalPaymentEvent(state, {
    type: "FINAL_PAYMENT_ACTION_RECORDED", eventId: "EV-PAYMENT-ACTUAL", actorId: "OWNER-1",
    occurredAt: "2026-08-15T13:06:00+08:00",
  });
  assert.equal(state.status, "FINAL_PAYMENT_ACTION");
  assert.ok(Object.isFrozen(state.review));
  assert.ok(Object.isFrozen(state.ownerDecision));
  assert.ok(state.events.every((event) => Object.isFrozen(event)));
});

test("proof validation rejects role confusion, malformed time, and one proof impersonating both parties", () => {
  const api = getEngine();
  const owner = partyProof("OWNER", "SHARED");
  assert.throws(() => api.createPartyAgreement({
    agreementId: "AGR-X", caseId: "CASE-1", subjectId: "CHANGE-1",
    ownerId: "OWNER-1", contractorId: "CONTRACTOR-1",
    ownerProof: owner,
    contractorProof: owner,
  }), /BILATERAL_PROOFS_MUST_BE_DISTINCT/);
  assert.throws(() => api.createPartyAgreement({
    agreementId: "AGR-Y", caseId: "CASE-1", subjectId: "CHANGE-1",
    ownerId: "OWNER-1", contractorId: "CONTRACTOR-1",
    ownerProof: { ...partyProof("OWNER", "WRONG-ROLE"), role: "CONTRACTOR" },
    contractorProof: partyProof("CONTRACTOR"),
  }), /INVALID_PROOF_ROLE/);
  assert.throws(() => api.createPartyAgreement({
    agreementId: "AGR-Z", caseId: "CASE-1", subjectId: "CHANGE-1",
    ownerId: "OWNER-1", contractorId: "CONTRACTOR-1",
    ownerProof: { ...partyProof("OWNER"), createdAt: "2026-02-31T11:00:00+08:00" },
    contractorProof: partyProof("CONTRACTOR"),
  }), /INVALID_ISO_DATETIME/);
});

test("keeps ChangeOrder draft-only and refuses caller-asserted formal signed baselines", () => {
  const api = getEngine();
  const arbitraryFormal = {
    ...validDomainInputs.ChangeOrder,
    ownerProof: partyProof("OWNER"),
    contractorProof: partyProof("CONTRACTOR"),
    signedBaseSnapshot: { versionId: "CV-1", sha256: "a".repeat(64), content: { arbitrary: true } },
  };
  assert.throws(() => api.createChangeOrder(arbitraryFormal), /FORMAL_CHANGE_ORDER_NOT_YET_IMPLEMENTED/);
  assert.throws(() => api.createChangeOrder({
    ...arbitraryFormal,
    contractorProof: arbitraryFormal.ownerProof,
  }), /BILATERAL_PROOFS_MUST_BE_DISTINCT/);
  const draft = api.createDraftChangeOrder({
    changeOrderId: "CO-DRAFT-1", caseId: "CASE-1", changeRequestId: "CHANGE-1", reason: "待雙方確認",
    baselineIdentity: { contractId: "CONTRACT-1", versionId: "CV-1", sha256: "a".repeat(64) },
    amountImpact: "1000.00", scheduleImpact: { days: 2 }, versionImpact: { from: "CV-1", proposed: "CV-2" },
    paymentImpacts: [{ paymentStageId: "PS-1", delta: "1000.00" }],
  });
  assert.equal(draft.status, "DRAFT");
  assert.equal(draft.partyConfirmationStatus, "PENDING_BILATERAL_CONFIRMATION");
  assert.ok(Object.isFrozen(draft.baselineIdentity));
});

test("binds WORKS to a closed canonical quotation and rejects unknown, duplicate, and double-counted references", () => {
  const api = getEngine();
  const nodes = Array.from({ length: 10 }, (_, index) => scheduleNode(index + 1));
  const quotation = quotationFor(nodes);
  const unknown = structuredClone(nodes);
  unknown[0].quotationRefs[0].itemId = "QI-UNKNOWN";
  const unknownResult = api.generateWorksMilestones({
    caseId: "CASE-1", projectTotalAmount: quotation.total, quotation,
    schedule: { scheduleId: "SCH-1", version: "v1", nodes: unknown },
  });
  assert.equal(unknownResult.ok, false);
  assert.ok(unknownResult.issues.some((issue) => issue.code === "UNKNOWN_QUOTATION_ITEM_REF"));

  const duplicateIds = structuredClone(nodes);
  duplicateIds[1].nodeId = duplicateIds[0].nodeId;
  const duplicateResult = api.generateWorksMilestones({
    caseId: "CASE-1", projectTotalAmount: quotation.total, quotation,
    schedule: { scheduleId: "SCH-1", version: "v1", nodes: duplicateIds },
  });
  assert.equal(duplicateResult.ok, false);
  assert.ok(duplicateResult.issues.some((issue) => issue.code === "DUPLICATE_SCHEDULE_NODE_ID"));

  const doubleCounted = structuredClone(nodes);
  doubleCounted[1].quotationRefs[0] = { ...doubleCounted[0].quotationRefs[0] };
  const doubleResult = api.generateWorksMilestones({
    caseId: "CASE-1", projectTotalAmount: quotation.total, quotation,
    schedule: { scheduleId: "SCH-1", version: "v1", nodes: doubleCounted },
  });
  assert.equal(doubleResult.ok, false);
  assert.ok(doubleResult.issues.some((issue) => issue.code === "DUPLICATE_QUOTATION_ITEM_ALLOCATION"));
});

test("rejects zero totals, zero work, quotation mismatch, and calendar-invalid schedule dates", () => {
  const api = getEngine();
  const nodes = Array.from({ length: 10 }, (_, index) => scheduleNode(index + 1));
  const quotation = quotationFor(nodes);
  const zeroTotal = api.generateWorksMilestones({
    caseId: "CASE-1", projectTotalAmount: "0.00", quotation: { ...quotation, total: "0.00" },
    schedule: { scheduleId: "SCH-1", version: "v1", nodes },
  });
  assert.equal(zeroTotal.ok, false);
  assert.ok(zeroTotal.issues.some((issue) => issue.code === "PROJECT_TOTAL_AMOUNT_MUST_BE_POSITIVE"));

  const zeroWorkNodes = structuredClone(nodes);
  zeroWorkNodes[0].workValue = "0.00";
  zeroWorkNodes[0].quotationRefs[0].allocation = "0.00";
  const zeroWork = api.generateWorksMilestones({
    caseId: "CASE-1", projectTotalAmount: quotation.total, quotation,
    schedule: { scheduleId: "SCH-1", version: "v1", nodes: zeroWorkNodes },
  });
  assert.equal(zeroWork.ok, false);
  assert.ok(zeroWork.issues.some((issue) => issue.code === "NODE_WORK_VALUE_MUST_BE_POSITIVE"));

  const invalidDateNodes = structuredClone(nodes);
  invalidDateNodes[0].startAt = "2026-02-31T08:00:00+08:00";
  const invalidDate = api.generateWorksMilestones({
    caseId: "CASE-1", projectTotalAmount: quotation.total, quotation,
    schedule: { scheduleId: "SCH-1", version: "v1", nodes: invalidDateNodes },
  });
  assert.equal(invalidDate.ok, false);
  assert.ok(invalidDate.issues.some((issue) => issue.code === "INVALID_SCHEDULE_DATE_RANGE"));

  const mismatch = api.generateWorksMilestones({
    caseId: "CASE-1", projectTotalAmount: "999.99", quotation,
    schedule: { scheduleId: "SCH-1", version: "v1", nodes },
  });
  assert.equal(mismatch.ok, false);
  assert.ok(mismatch.issues.some((issue) => issue.code === "PROJECT_TOTAL_QUOTATION_TOTAL_MISMATCH"));
});

test("validates domain dates, basis entries, review-decision binding, warranty terms, and positive DESIGN fee", () => {
  const api = getEngine();
  assert.throws(() => api.createDomain("Case", {
    ...validDomainInputs.Case, createdAt: "2026-02-31T09:00:00+08:00",
  }), /INVALID_ISO_DATETIME/);
  assert.throws(() => api.createDomain("DRSReview", {
    ...validDomainInputs.DRSReview, basis: [null],
  }), /INVALID_BASIS_REFERENCE/);
  assert.throws(() => api.createDomain("Schedule", {
    ...validDomainInputs.Schedule, nodes: [null],
  }), /INVALID_SCHEDULE_NODE/);
  assert.throws(() => api.createDomain("Milestone", {
    ...validDomainInputs.Milestone, quotationRefs: [{}],
  }), /INVALID_QUOTATION_REF/);
  assert.throws(() => api.createDomain("ChangeRequest", {
    ...validDomainInputs.ChangeRequest, quotationRefs: [null],
  }), /INVALID_CHANGE_REFERENCE/);
  const { review: omittedReview, ...decisionWithoutReview } = validDomainInputs.OwnerDecision;
  assert.ok(omittedReview);
  assert.throws(() => api.createOwnerDecision(decisionWithoutReview), /OWNER_DECISION_REVIEW_REQUIRED/);
  assert.throws(() => api.createOwnerDecision({
    ...validDomainInputs.OwnerDecision,
    review: { ...validDomainInputs.DRSReview, subjectId: "OTHER-SUBJECT" },
  }), /OWNER_DECISION_REVIEW_REFERENCE_MISMATCH/);
  assert.throws(() => api.createWarrantyPledge({
    ...validDomainInputs.WarrantyPledge,
    warrantyTermsRef: {},
  }), /INVALID_WARRANTY_TERMS_REF/);
  assert.throws(() => api.calculateDesignPayments("0.00"), /TOTAL_DESIGN_FEE_MUST_BE_POSITIVE/);
});

test("binds assembly truth, reports incomplete WORKS drafts, and includes truth in draft identity", async () => {
  const api = getEngine();
  const incomplete = api.assembleContract({ contractType: "WORKS", templateVersion: "v0.2", values: {} });
  assert.equal(incomplete.status, "PROCEDURAL_INCOMPLETE");
  assert.ok(incomplete.unresolvedBindings.includes("quotation"));
  assert.ok(incomplete.unresolvedBindings.includes("milestones"));

  const nodes = Array.from({ length: 10 }, (_, index) => scheduleNode(index + 1));
  const quotation = quotationFor(nodes);
  const generated = api.generateWorksMilestones({
    caseId: "CASE-1", projectTotalAmount: quotation.total, quotation,
    schedule: { scheduleId: "SCH-1", version: "v1", nodes },
  });
  assert.equal(generated.ok, true);
  const baseOptions = {
    contractType: "WORKS", templateVersion: "v0.2", quotation,
    caseData: { caseId: "CASE-1" },
    values: {
      CASE_ID: "CASE-1", PROJECT_CONTRACT_ID: "CONTRACT-1", PROJECT_CONTRACT_TYPE: "WORKS", PROJECT_CONTRACT_VERSION: "CV-1",
      PROJECT_TOTAL_AMOUNT: quotation.total, CONSTRUCTION_SCHEDULE_ID: "SCH-1", CONSTRUCTION_SCHEDULE_VERSION: "v1",
      PROJECT_START_AT: "2026-09-01T08:00:00+08:00", PROJECT_END_AT: "2026-09-10T18:00:00+08:00",
    },
    versionMetadata: { versionId: "CV-1", status: "DRAFT" },
    constructionSchedule: { scheduleId: "SCH-1", version: "v1", nodes },
    milestones: generated.milestones, paymentStages: generated.paymentStages, changes: [],
    warrantyTerms: { documentId: "WT-1", version: "v1" },
  };
  const assembled = api.assembleContract(baseOptions);
  assert.equal(assembled.status, "DRAFT");
  assert.deepEqual(assembled.structuredContract.truthBindings.quotation, quotation);
  assert.deepEqual(assembled.structuredContract.truthBindings.milestones, generated.milestones);
  assert.match(assembled.structuredContract.truthIdentity, /^\{/);
  assert.ok(Object.isFrozen(assembled.structuredContract.truthBindings));

  const invalidTruth = api.assembleContract({
    ...baseOptions, milestones: [{}], paymentStages: [{}], changes: [{}],
  });
  assert.equal(invalidTruth.status, "PROCEDURAL_INCOMPLETE");
  assert.ok(invalidTruth.unresolvedBindings.includes("milestones"));
  assert.ok(invalidTruth.unresolvedBindings.includes("paymentStages"));
  assert.ok(invalidTruth.unresolvedBindings.includes("changes"));

  const firstDraft = await api.createDraftVersion({
    contractId: "CONTRACT-1", versionId: "CV-A", createdAt: "2026-08-15T16:00:00+08:00",
    createdBy: "OWNER-1", changeSummary: "A", structuredContent: assembled.structuredContract,
  });
  const changed = api.assembleContract({
    ...baseOptions,
    paymentStages: generated.paymentStages.map((stage, index) => index === 0 ? { ...stage, state: "UPDATED_DRAFT" } : stage),
  });
  const secondDraft = await api.createDraftVersion({
    contractId: "CONTRACT-1", versionId: "CV-A", createdAt: "2026-08-15T16:00:00+08:00",
    createdBy: "OWNER-1", changeSummary: "A", structuredContent: changed.structuredContract,
  });
  assert.notEqual(firstDraft.sha256, secondDraft.sha256);
});

test("requires canonical DESIGN and WORKS truth, separated DESIGN_BUILD profiles, and coherent change baselines", () => {
  const api = getEngine();
  const nodes = Array.from({ length: 10 }, (_, index) => scheduleNode(index + 1));
  const quotation = quotationFor(nodes);
  const generated = api.generateWorksMilestones({
    caseId: "CASE-1", projectTotalAmount: quotation.total, quotation,
    schedule: { scheduleId: "SCH-1", version: "v1", nodes },
  });
  assert.equal(generated.ok, true);
  const worksTruth = {
    caseData: { caseId: "CASE-1" },
    values: {
      CASE_ID: "CASE-1", PROJECT_CONTRACT_ID: "CONTRACT-1", PROJECT_CONTRACT_TYPE: "WORKS", PROJECT_CONTRACT_VERSION: "CV-1",
      PROJECT_TOTAL_AMOUNT: quotation.total, CONSTRUCTION_SCHEDULE_ID: "SCH-1", CONSTRUCTION_SCHEDULE_VERSION: "v1",
      PROJECT_START_AT: "2026-09-01T08:00:00+08:00", PROJECT_END_AT: "2026-09-10T18:00:00+08:00",
    },
    versionMetadata: { versionId: "CV-1", status: "DRAFT" }, quotation,
    constructionSchedule: { scheduleId: "SCH-1", version: "v1", nodes },
    milestones: generated.milestones, paymentStages: generated.paymentStages, changes: [],
    warrantyTerms: { documentId: "WT-1", version: "v1" },
  };

  const mismatchedMilestones = generated.milestones.map((milestone, index) => (
    index === 0 ? { ...milestone, name: "表面合法但非 canonical 名稱" } : milestone
  ));
  const milestoneMismatch = api.assembleContract({
    ...worksTruth, contractType: "WORKS", milestones: mismatchedMilestones,
  });
  assert.equal(milestoneMismatch.status, "PROCEDURAL_INCOMPLETE");
  assert.ok(milestoneMismatch.unresolvedBindings.includes("milestonesCanonicalMismatch"));

  const mismatchedPaymentStages = generated.paymentStages.map((stage, index) => (
    index === 0 ? { ...stage, amount: "1.00" } : stage
  ));
  const paymentMismatch = api.assembleContract({
    ...worksTruth, contractType: "WORKS", paymentStages: mismatchedPaymentStages,
  });
  assert.equal(paymentMismatch.status, "PROCEDURAL_INCOMPLETE");
  assert.ok(paymentMismatch.unresolvedBindings.includes("paymentStagesCanonicalMismatch"));

  const designPayments = api.calculateDesignPayments("1000.01").stages;
  const designTruth = {
    contractType: "DESIGN", caseData: { caseId: "CASE-1" },
    values: {
      CASE_ID: "CASE-1", PROJECT_CONTRACT_ID: "CONTRACT-1", PROJECT_CONTRACT_TYPE: "DESIGN", PROJECT_CONTRACT_VERSION: "CV-1",
      TOTAL_DESIGN_FEE: "1000.01", DESIGN_DELIVERABLE_SCHEDULE: "DESIGN-SCH-1@v1",
    },
    versionMetadata: { versionId: "CV-1", status: "DRAFT" },
    designSchedule: designSchedule(), designPaymentStages: designPayments, changes: [],
  };
  const designMissing = api.assembleContract({
    contractType: "DESIGN", values: { TOTAL_DESIGN_FEE: "1000.01" },
  });
  assert.equal(designMissing.status, "PROCEDURAL_INCOMPLETE");
  assert.ok(designMissing.unresolvedBindings.includes("designSchedule"));
  assert.ok(designMissing.unresolvedBindings.includes("designPaymentStages"));
  assert.equal(api.assembleContract(designTruth).status, "DRAFT");
  const designMismatch = api.assembleContract({
    ...designTruth,
    designPaymentStages: designPayments.map((stage, index) => index === 3 ? { ...stage, amount: "400.00" } : stage),
  });
  assert.equal(designMismatch.status, "PROCEDURAL_INCOMPLETE");
  assert.ok(designMismatch.unresolvedBindings.includes("designPaymentStagesCanonicalMismatch"));

  const designBuildMissingDesign = api.assembleContract({ ...worksTruth, contractType: "DESIGN_BUILD" });
  assert.equal(designBuildMissingDesign.status, "PROCEDURAL_INCOMPLETE");
  assert.ok(designBuildMissingDesign.unresolvedBindings.includes("designSchedule"));
  const designBuild = api.assembleContract({
    ...worksTruth, contractType: "DESIGN_BUILD", values: {
      ...worksTruth.values, PROJECT_CONTRACT_TYPE: "DESIGN_BUILD", TOTAL_DESIGN_FEE: "1000.01",
      DESIGN_DELIVERABLE_SCHEDULE: "DESIGN-SCH-1@v1",
    },
    designSchedule: designSchedule(), designPaymentStages: designPayments,
    designChanges: [], worksChanges: [],
  });
  assert.equal(designBuild.status, "DRAFT");
  assert.deepEqual(designBuild.structuredContract.truthBindings.design.paymentStages, designPayments);
  assert.deepEqual(designBuild.structuredContract.truthBindings.works.milestones, generated.milestones);

  const duplicateChange = { ...validDomainInputs.ChangeRequest };
  const duplicateChanges = api.assembleContract({
    ...worksTruth, contractType: "WORKS", changes: [validDomainInputs.ChangeRequest, duplicateChange],
  });
  assert.equal(duplicateChanges.status, "PROCEDURAL_INCOMPLETE");
  assert.ok(duplicateChanges.unresolvedBindings.includes("changesDuplicateId"));
  const baselineMismatch = api.assembleContract({
    ...worksTruth, contractType: "WORKS",
    changes: [{
      ...validDomainInputs.ChangeRequest, baselineVersion: "CV-OTHER",
      versionImpact: { ...validDomainInputs.ChangeRequest.versionImpact, from: "CV-OTHER" },
    }],
  });
  assert.equal(baselineMismatch.status, "PROCEDURAL_INCOMPLETE");
  assert.ok(baselineMismatch.unresolvedBindings.includes("changesBaselineMismatch"));
});

test("accepts only same-runtime issued final states and refuses JSON-cloned aggregate-plus-history tampering", () => {
  const api = getEngine();
  const approved = approvedFinalPaymentState(api);
  const restoredClone = JSON.parse(JSON.stringify(approved));
  assert.throws(() => api.applyFinalPaymentEvent(restoredClone, {
    type: "FINAL_PAYMENT_ACTION_RECORDED", eventId: "CLONE-PAY", actorId: "OWNER-1",
    occurredAt: "2026-08-15T13:06:00+08:00",
  }), /FINAL_PAYMENT_STATE_NOT_RUNTIME_ISSUED/);

  const synchronouslyTampered = JSON.parse(JSON.stringify(approved));
  synchronouslyTampered.ownerDecision.reason = "同步竄改 aggregate 與 history";
  synchronouslyTampered.events.find((event) => event.type === "OWNER_DECISION_RECORDED")
    .ownerDecision.reason = "同步竄改 aggregate 與 history";
  assert.throws(() => api.applyFinalPaymentEvent(synchronouslyTampered, {
    type: "FINAL_PAYMENT_ACTION_RECORDED", eventId: "TAMPERED-PAY", actorId: "OWNER-1",
    occurredAt: "2026-08-15T13:06:00+08:00",
  }), /FINAL_PAYMENT_STATE_NOT_RUNTIME_ISSUED/);
  const restore = api.restoreFinalPaymentState(restoredClone);
  assert.equal(restore.status, "NOT_YET_IMPLEMENTED");
  assert.equal(restore.issue, "DURABLE_FINAL_PAYMENT_STATE_RESTORE_ADAPTER_NOT_IMPLEMENTED");
});

test("enforces cross-record chronology before final review, decision, and payment", () => {
  const api = getEngine();
  let state = api.createFinalPaymentState(finalStateInput());
  assert.throws(() => api.applyFinalPaymentEvent(state, {
    type: "FINAL_ACCEPTANCE_COMPLETED", eventId: "CHRONOLOGY-A-BAD",
    acceptanceRecord: finalAcceptanceRecord({
      completedAt: "2026-08-15T11:00:00+08:00",
      ownerProof: { ...partyProof("OWNER", "CHRONOLOGY-A-BAD"), createdAt: "2026-08-15T10:00:00+08:00" },
    }),
    occurredAt: "2026-08-15T12:00:00+08:00",
  }), /FINAL_ACCEPTANCE_CHRONOLOGY_INVALID/);

  state = api.applyFinalPaymentEvent(state, {
    type: "FINAL_ACCEPTANCE_COMPLETED", eventId: "CHRONOLOGY-A",
    acceptanceRecord: finalAcceptanceRecord({
      completedAt: "2026-08-15T10:00:00+08:00",
      ownerProof: { ...partyProof("OWNER", "CHRONOLOGY-A"), createdAt: "2026-08-15T11:00:00+08:00" },
    }),
    occurredAt: "2026-08-15T12:00:00+08:00",
  });
  state = api.applyFinalPaymentEvent(state, {
    type: "WARRANTY_PLEDGE_SIGNED", eventId: "CHRONOLOGY-W",
    warrantyPledge: {
      ...validDomainInputs.WarrantyPledge,
      signingProof: { ...validDomainInputs.WarrantyPledge.signingProof, createdAt: "2026-08-15T09:00:00+08:00" },
    },
    occurredAt: "2026-08-15T12:00:00+08:00",
  });
  assert.throws(() => api.applyFinalPaymentEvent(state, {
    type: "DRS_DOCUMENT_AND_PROCEDURE_REVIEW_COMPLETED", eventId: "CHRONOLOGY-R",
    review: finalReview({ createdAt: "2026-08-15T08:00:00+08:00" }),
    occurredAt: "2026-08-15T12:00:00+08:00",
  }), /FINAL_REVIEW_PRECEDES_PREREQUISITE_RECORDS/);
});

test("requires exact assembly amount, case, version, and change-case bindings", () => {
  const api = getEngine();
  const worksTruth = worksAssemblyTruth(api);
  const amountMismatch = api.assembleContract({
    ...worksTruth, values: { ...worksTruth.values, PROJECT_TOTAL_AMOUNT: "999.99" },
  });
  assert.equal(amountMismatch.status, "PROCEDURAL_INCOMPLETE");
  assert.ok(amountMismatch.unresolvedBindings.includes("projectTotalAmountQuotationMismatch"));

  const missingBindings = api.assembleContract({
    ...worksTruth, caseData: undefined, versionMetadata: undefined,
    values: { PROJECT_TOTAL_AMOUNT: worksTruth.quotation.total },
  });
  assert.equal(missingBindings.status, "PROCEDURAL_INCOMPLETE");
  assert.ok(missingBindings.unresolvedBindings.includes("caseBinding"));
  assert.ok(missingBindings.unresolvedBindings.includes("contractVersionBinding"));

  const crossCaseChange = api.assembleContract({
    ...worksTruth,
    changes: [{ ...validDomainInputs.ChangeRequest, changeId: "CHANGE-CROSS-CASE", caseId: "CASE-OTHER" }],
  });
  assert.equal(crossCaseChange.status, "PROCEDURAL_INCOMPLETE");
  assert.ok(crossCaseChange.unresolvedBindings.includes("changesCaseMismatch"));
});

test("keeps DESIGN and WORKS assembly truth mutually exclusive while DESIGN_BUILD requires both", () => {
  const api = getEngine();
  const designPayments = api.calculateDesignPayments("1000.01").stages;
  const designTruth = {
    contractType: "DESIGN", caseData: { caseId: "CASE-1" },
    values: {
      CASE_ID: "CASE-1", PROJECT_CONTRACT_ID: "CONTRACT-1", PROJECT_CONTRACT_TYPE: "DESIGN", PROJECT_CONTRACT_VERSION: "CV-1",
      TOTAL_DESIGN_FEE: "1000.01", DESIGN_DELIVERABLE_SCHEDULE: "DESIGN-SCH-1@v1",
    },
    versionMetadata: { versionId: "CV-1", status: "DRAFT" },
    designSchedule: designSchedule(), designPaymentStages: designPayments, changes: [],
  };
  const worksTruth = worksAssemblyTruth(api);
  const designWithWorks = api.assembleContract({
    ...designTruth,
    quotation: worksTruth.quotation, constructionSchedule: worksTruth.constructionSchedule,
    milestones: worksTruth.milestones, paymentStages: worksTruth.paymentStages,
    warrantyTerms: worksTruth.warrantyTerms,
  });
  assert.equal(designWithWorks.status, "PROCEDURAL_INCOMPLETE");
  assert.ok(designWithWorks.unresolvedBindings.includes("unexpectedWorksTruth"));

  const worksWithDesign = api.assembleContract({
    ...worksTruth, values: { ...worksTruth.values, TOTAL_DESIGN_FEE: "1000.01" },
    designSchedule: designSchedule(), designPaymentStages: designPayments,
  });
  assert.equal(worksWithDesign.status, "PROCEDURAL_INCOMPLETE");
  assert.ok(worksWithDesign.unresolvedBindings.includes("unexpectedDesignTruth"));

  const designWithoutIdentity = api.assembleContract({
    ...designTruth, caseData: undefined, versionMetadata: undefined,
    values: { TOTAL_DESIGN_FEE: "1000.01" },
  });
  assert.equal(designWithoutIdentity.status, "PROCEDURAL_INCOMPLETE");
  assert.ok(designWithoutIdentity.unresolvedBindings.includes("caseBinding"));
  assert.ok(designWithoutIdentity.unresolvedBindings.includes("contractVersionBinding"));
});

test("rejects truthy but wrongly typed schedule-node fields and nested references", () => {
  const api = getEngine();
  const adversarial = [
    [{ nodeId: 1 }, "INVALID_SCHEDULE_NODE_ID"],
    [{ name: 123 }, "INVALID_SCHEDULE_NODE_NAME"],
    [{ scheduleSemantic: { value: "PHASE" } }, "INVALID_SCHEDULE_SEMANTICS"],
    [{ workItems: [null] }, "INVALID_WORK_ITEM_REF"],
    [{ quotationRefs: [{ quotationId: "Q-1", version: "v1", itemId: "QI-1", allocation: {} }] }, "INVALID_QUOTATION_REF"],
    [{ drawingRefs: [{ drawingId: 1, version: 1 }] }, "INVALID_DRAWING_REF"],
    [{ requiredEvidence: [{ evidenceType: 1, basisRef: 1 }] }, "INVALID_EVIDENCE_REQUIREMENT"],
    [{ workValue: {} }, "INVALID_NODE_WORK_VALUE"],
    [{ holdPoint: "false" }, "MISSING_HOLD_POINT_DECLARATION"],
  ];
  for (const [overrides, expectedCode] of adversarial) {
    const nodes = Array.from({ length: 10 }, (_, index) => scheduleNode(index + 1));
    const quotation = quotationFor(nodes);
    nodes[0] = { ...nodes[0], ...overrides };
    const result = api.generateWorksMilestones({
      caseId: "CASE-1", projectTotalAmount: quotation.total, quotation,
      schedule: { scheduleId: "SCH-STRICT", version: "v1", nodes },
    });
    assert.equal(result.ok, false, expectedCode);
    assert.ok(result.issues.some((issue) => issue.code === expectedCode), expectedCode);
  }

  const structuredBasis = api.createDomain("Milestone", {
    ...validDomainInputs.Milestone,
    requiredEvidence: [{ evidenceType: "PHOTO", basisRef: { documentId: "DOC-1", version: "v1" } }],
  });
  assert.deepEqual(structuredBasis.requiredEvidence[0].basisRef, { documentId: "DOC-1", version: "v1" });
  assert.throws(() => api.createDomain("Schedule", {
    ...validDomainInputs.Schedule,
    nodes: [scheduleNode(1, "100.00", { nodeId: 1 })],
  }), /INVALID_SCHEDULE_NODE/);
});

test("permits >10 splitting only for unique semantic children within the parent and exact quotation partition", () => {
  const api = getEngine();
  function splitParent(childOverrides = [], parentOverrides = {}) {
    return scheduleNode(1, "20.00", {
      quotationRefs: [
        { quotationId: "Q-1", version: "v1", itemId: "QI-1-A", allocation: "10.00" },
        { quotationId: "Q-1", version: "v1", itemId: "QI-1-B", allocation: "10.00" },
      ],
      children: [
        scheduleNode("1-A", "10.00", {
          scheduleSemantic: "PHASE_1_ROUGH_IN", startAt: "2026-09-01T08:00:00+08:00",
          dueAt: "2026-09-01T12:00:00+08:00", ...childOverrides[0],
        }),
        scheduleNode("1-B", "10.00", {
          scheduleSemantic: "PHASE_1_CLOSE_UP", startAt: "2026-09-01T13:00:00+08:00",
          dueAt: "2026-09-01T18:00:00+08:00", ...childOverrides[1],
        }),
      ],
      ...parentOverrides,
    });
  }
  const cases = [
    [splitParent([{}, { scheduleSemantic: "PHASE_1_ROUGH_IN" }]), "DUPLICATE_CHILD_SCHEDULE_SEMANTIC"],
    [splitParent([{ startAt: "2026-08-31T23:00:00+08:00" }, {}]), "CHILD_DATE_OUTSIDE_PARENT_RANGE"],
    [splitParent([], { quotationRefs: [{ quotationId: "Q-1", version: "v1", itemId: "QI-1-A", allocation: "20.00" }] }), "PARENT_CHILD_QUOTATION_PARTITION_MISMATCH"],
    [splitParent([], { quotationRefs: [] }), "PARENT_QUOTATION_BASIS_REQUIRED"],
  ];
  for (const [parent, expectedCode] of cases) {
    const nodes = [parent, ...Array.from({ length: 8 }, (_, index) => scheduleNode(index + 2, "10.00"))];
    const quotation = quotationFor(nodes);
    const result = api.generateWorksMilestones({
      caseId: "CASE-1", projectTotalAmount: quotation.total, quotation,
      schedule: { scheduleId: "SCH-SPLIT-STRICT", version: "v1", nodes },
    });
    assert.equal(result.ok, false, expectedCode);
    assert.ok(result.issues.some((issue) => issue.code === expectedCode), expectedCode);
  }
});

test("validates early-construction override content, review, parties, and chronology", () => {
  const api = getEngine();
  const valid = {
    overrideId: "OV-STRICT", caseId: "CASE-1", ownerId: "OWNER-1", contractorId: "CONTRACTOR-1",
    missingConditions: ["DRAWING_VERSION_CONFIRMED"], scope: ["拆除工程"], risks: ["圖說仍待確認"],
    originalReview: validDomainInputs.DRSReview,
    ownerProof: validDomainInputs.PartyAgreement.ownerProof,
    contractorProof: validDomainInputs.PartyAgreement.contractorProof,
    createdAt: "2026-08-15T14:00:00+08:00",
  };
  assert.throws(() => api.createEarlyConstructionOverride({ ...valid, contractorId: undefined }), /MISSING_REQUIRED_FIELD.*contractorId/);
  assert.throws(() => api.createEarlyConstructionOverride({ ...valid, scope: [] }), /INVALID_EARLY_OVERRIDE_CONTENT/);
  assert.throws(() => api.createEarlyConstructionOverride({
    ...valid, ownerProof: { ...valid.ownerProof, partyId: "OWNER-OTHER" },
  }), /EARLY_OVERRIDE_PROOF_PARTY_MISMATCH/);
  assert.throws(() => api.createEarlyConstructionOverride({ ...valid, originalReview: {} }), /INVALID_EARLY_OVERRIDE_REVIEW/);
  assert.throws(() => api.createEarlyConstructionOverride({
    ...valid, createdAt: "2026-08-15T09:00:00+08:00",
  }), /EARLY_OVERRIDE_CHRONOLOGY_INVALID/);
  const normalized = api.createEarlyConstructionOverride(valid);
  assert.equal(normalized.contractorId, "CONTRACTOR-1");
  assert.equal(normalized.originalReview.kind, "DRSReview");
});

test("rejects sparse or decorated arrays and canonicalizes cross-realm JSON only after normalization", async () => {
  const api = getEngine();
  assert.throws(() => api.canonicalSerialize(new Array(1)), /NON_CANONICAL_ARRAY/);
  class ArraySubclass extends Array {}
  const subclassed = new ArraySubclass();
  subclassed.push(1);
  assert.throws(() => api.canonicalSerialize(subclassed), /NON_CANONICAL_ARRAY/);
  const decorated = [1];
  decorated.extra = true;
  assert.throws(() => api.canonicalSerialize(decorated), /NON_CANONICAL_ARRAY/);
  const accessor = [1];
  Object.defineProperty(accessor, "0", { enumerable: true, get: () => 1 });
  assert.throws(() => api.canonicalSerialize(accessor), /NON_CANONICAL/);
  const symbolDecorated = [1];
  symbolDecorated[Symbol("extra")] = true;
  assert.throws(() => api.canonicalSerialize(symbolDecorated), /NON_CANONICAL/);
  const crossRealm = vm.runInNewContext("({ b: 2, a: [1, { x: true }] })");
  const local = { a: [1, { x: true }], b: 2 };
  assert.throws(() => api.canonicalSerialize(crossRealm), /CANONICAL_NORMALIZATION_REQUIRED/);
  const normalized = api.normalizeCanonicalData(crossRealm);
  assert.equal(api.canonicalSerialize(normalized), api.canonicalSerialize(local));
  assert.equal(await api.sha256(normalized), await api.sha256(local));
});

test("consumes every successful final-payment predecessor exactly once but leaves failed attempts retryable", () => {
  const api = getEngine();
  const initial = api.createFinalPaymentState(finalStateInput());
  assert.throws(() => api.applyFinalPaymentEvent(initial, {
    type: "FINAL_ACCEPTANCE_COMPLETED", eventId: "FAILED-FIRST", occurredAt: "2026-08-15T13:00:00+08:00",
  }), /FINAL_ACCEPTANCE_RECORD_REQUIRED/);
  const accepted = api.applyFinalPaymentEvent(initial, {
    type: "FINAL_ACCEPTANCE_COMPLETED", eventId: "RETRY-A", acceptanceRecord: finalAcceptanceRecord(),
    occurredAt: "2026-08-15T13:00:00+08:00",
  });
  assert.equal(accepted.finalAcceptanceCompleted, true);
  assert.throws(() => api.applyFinalPaymentEvent(initial, {
    type: "FINAL_ACCEPTANCE_COMPLETED", eventId: "STALE-A", acceptanceRecord: finalAcceptanceRecord(),
    occurredAt: "2026-08-15T13:00:00+08:00",
  }), /FINAL_PAYMENT_STATE_ALREADY_CONSUMED/);

  let ready = api.createFinalPaymentState(finalStateInput());
  const review = finalReview();
  ready = api.applyFinalPaymentEvent(ready, {
    type: "FINAL_ACCEPTANCE_COMPLETED", eventId: "BRANCH-A", acceptanceRecord: finalAcceptanceRecord(),
    occurredAt: "2026-08-15T13:00:00+08:00",
  });
  ready = api.applyFinalPaymentEvent(ready, {
    type: "WARRANTY_PLEDGE_SIGNED", eventId: "BRANCH-W", warrantyPledge: validDomainInputs.WarrantyPledge,
    occurredAt: "2026-08-15T13:01:00+08:00",
  });
  ready = api.applyFinalPaymentEvent(ready, {
    type: "DRS_DOCUMENT_AND_PROCEDURE_REVIEW_COMPLETED", eventId: "BRANCH-R", review,
    occurredAt: "2026-08-15T13:03:00+08:00",
  });
  const approved = api.applyFinalPaymentEvent(ready, {
    type: "OWNER_DECISION_RECORDED", eventId: "BRANCH-APPROVE", ownerDecision: finalDecision(review),
    occurredAt: "2026-08-15T13:05:00+08:00",
  });
  assert.throws(() => api.applyFinalPaymentEvent(ready, {
    type: "OWNER_DECISION_RECORDED", eventId: "BRANCH-OBJECT", ownerDecision: finalDecision(review, "REQUEST_CHANGES"),
    occurredAt: "2026-08-15T13:05:00+08:00",
  }), /FINAL_PAYMENT_STATE_ALREADY_CONSUMED/);
  api.applyFinalPaymentEvent(approved, {
    type: "FINAL_PAYMENT_ACTION_RECORDED", eventId: "BRANCH-PAY", actorId: "OWNER-1",
    occurredAt: "2026-08-15T13:06:00+08:00",
  });
  assert.throws(() => api.applyFinalPaymentEvent(approved, {
    type: "FINAL_PAYMENT_ACTION_RECORDED", eventId: "BRANCH-PAY-REPLAY", actorId: "OWNER-1",
    occurredAt: "2026-08-15T13:07:00+08:00",
  }), /FINAL_PAYMENT_STATE_ALREADY_CONSUMED/);
});

test("requires rendered placeholders to match exact canonical assembly truth before DRAFT", () => {
  const api = getEngine();
  const works = worksAssemblyTruth(api);
  assert.equal(api.assembleContract(works).status, "DRAFT");
  const mismatches = [
    [{ PROJECT_CONTRACT_TYPE: "DESIGN" }, "placeholderContractTypeMismatch"],
    [{ CASE_ID: "CASE-OTHER" }, "placeholderCaseIdMismatch"],
    [{ PROJECT_CONTRACT_VERSION: "CV-OTHER" }, "placeholderContractVersionMismatch"],
    [{ PROJECT_TOTAL_AMOUNT: "999.99" }, "projectTotalAmountQuotationMismatch"],
    [{ CONSTRUCTION_SCHEDULE_ID: "SCH-OTHER" }, "constructionScheduleIdPlaceholderMismatch"],
    [{ CONSTRUCTION_SCHEDULE_VERSION: "v2" }, "constructionScheduleVersionPlaceholderMismatch"],
  ];
  for (const [overrides, binding] of mismatches) {
    const assembled = api.assembleContract({ ...works, values: { ...works.values, ...overrides } });
    assert.equal(assembled.status, "PROCEDURAL_INCOMPLETE", binding);
    assert.ok(assembled.unresolvedBindings.includes(binding), binding);
  }
  const design = {
    contractType: "DESIGN", caseData: { caseId: "CASE-1" }, versionMetadata: { versionId: "CV-1", status: "DRAFT" },
    values: {
      CASE_ID: "CASE-1", PROJECT_CONTRACT_ID: "CONTRACT-1", PROJECT_CONTRACT_TYPE: "DESIGN", PROJECT_CONTRACT_VERSION: "CV-1",
      TOTAL_DESIGN_FEE: "1000.01", DESIGN_DELIVERABLE_SCHEDULE: "DESIGN-SCH-OTHER@v2",
    },
    designSchedule: designSchedule(), designPaymentStages: api.calculateDesignPayments("1000.01").stages, changes: [],
  };
  const designMismatch = api.assembleContract(design);
  assert.equal(designMismatch.status, "PROCEDURAL_INCOMPLETE");
  assert.ok(designMismatch.unresolvedBindings.includes("designSchedulePlaceholderMismatch"));
  const scheduleWithoutPlaceholderTruth = designSchedule();
  delete scheduleWithoutPlaceholderTruth.DESIGN_DELIVERABLE_SCHEDULE;
  const missingDesignScheduleTruth = api.assembleContract({
    ...design,
    values: { ...design.values, DESIGN_DELIVERABLE_SCHEDULE: "DESIGN-SCH-1@v1" },
    designSchedule: scheduleWithoutPlaceholderTruth,
  });
  assert.equal(missingDesignScheduleTruth.status, "PROCEDURAL_INCOMPLETE");
  assert.ok(missingDesignScheduleTruth.unresolvedBindings.includes("designSchedulePlaceholderTruthBinding"));
});

test("validates DESIGN changes through the common case baseline identity and type boundary", () => {
  const api = getEngine();
  const base = {
    contractType: "DESIGN", caseData: { caseId: "CASE-1" }, versionMetadata: { versionId: "CV-1", status: "DRAFT" },
    values: {
      CASE_ID: "CASE-1", PROJECT_CONTRACT_ID: "CONTRACT-1", PROJECT_CONTRACT_TYPE: "DESIGN", PROJECT_CONTRACT_VERSION: "CV-1",
      TOTAL_DESIGN_FEE: "1000.01", DESIGN_DELIVERABLE_SCHEDULE: "DESIGN-SCH-1@v1",
    },
    designSchedule: designSchedule(), designPaymentStages: api.calculateDesignPayments("1000.01").stages,
  };
  const designChanges = ["DESIGN_CHANGE", "SCOPE_CHANGE", "CHANGE_REQUEST"].map((changeType, index) => ({
    ...validDomainInputs.ChangeRequest, changeId: `DESIGN-CHANGE-${index + 1}`, changeType,
  }));
  assert.equal(api.assembleContract({ ...base, changes: designChanges }).status, "DRAFT");
  const adversarial = [
    [[{}], "changes"],
    [[designChanges[0], { ...designChanges[0] }], "changesDuplicateId"],
    [[{ ...designChanges[0], changeId: "CROSS-CASE", caseId: "CASE-OTHER" }], "changesCaseMismatch"],
    [[{ ...designChanges[0], changeId: "WRONG-BASE", baselineVersion: "CV-OTHER", versionImpact: { from: "CV-OTHER", proposed: "CV-2" } }], "changesBaselineMismatch"],
    [[{ ...designChanges[0], changeId: "WORK-TYPE", changeType: "WORK_CHANGE" }], "changesContractTypeMismatch"],
  ];
  for (const [changes, binding] of adversarial) {
    const assembled = api.assembleContract({ ...base, changes });
    assert.equal(assembled.status, "PROCEDURAL_INCOMPLETE", binding);
    assert.ok(assembled.unresolvedBindings.includes(binding), binding);
  }
});

test("validates semantic children and quotation partition even when the parent progress rate is at most ten", () => {
  const api = getEngine();
  const nodes = Array.from({ length: 10 }, (_, index) => scheduleNode(index + 1));
  nodes[0] = scheduleNode(1, "100.00", {
    quotationRefs: [
      { quotationId: "Q-1", version: "v1", itemId: "QI-1-A", allocation: "50.00" },
      { quotationId: "Q-1", version: "v1", itemId: "QI-1-B", allocation: "50.00" },
    ],
    children: [
      scheduleNode("1-A", "50.00", {
        scheduleSemantic: "PHASE_1_ROUGH_IN", startAt: "2026-09-01T08:00:00+08:00", dueAt: "2026-09-01T12:00:00+08:00",
        quotationRefs: [{ quotationId: "Q-1", version: "v1", itemId: "QI-1-A", allocation: "50.00" }],
      }),
      scheduleNode("1-B", "50.00", {
        scheduleSemantic: "PHASE_1_CLOSE_UP", startAt: "2026-09-01T13:00:00+08:00", dueAt: "2026-09-01T18:00:00+08:00",
        quotationRefs: [{ quotationId: "Q-1", version: "v1", itemId: "QI-1-B", allocation: "50.00" }],
      }),
    ],
  });
  const quotation = quotationFor(nodes);
  const input = {
    caseId: "CASE-1", projectTotalAmount: quotation.total, quotation,
    schedule: { scheduleId: "SCH-HIDDEN-CHILD", version: "v1", nodes },
  };
  const valid = api.generateWorksMilestones(input);
  assert.equal(valid.ok, true);
  assert.ok(valid.milestones.some((milestone) => milestone.scheduleNodeId === "NODE-1"));
  const adversarial = [
    [(copy) => { copy[0].children[1].scheduleSemantic = "PHASE_1_ROUGH_IN"; }, "DUPLICATE_CHILD_SCHEDULE_SEMANTIC"],
    [(copy) => { copy[0].children[0].startAt = "2026-08-31T08:00:00+08:00"; }, "CHILD_DATE_OUTSIDE_PARENT_RANGE"],
    [(copy) => { copy[0].children[1].quotationRefs[0].allocation = "49.99"; }, "PARENT_CHILD_QUOTATION_PARTITION_MISMATCH"],
  ];
  for (const [mutate, code] of adversarial) {
    const copy = structuredClone(nodes);
    mutate(copy);
    const result = api.generateWorksMilestones({ ...input, schedule: { ...input.schedule, nodes: copy } });
    assert.equal(result.ok, false, code);
    assert.ok(result.issues.some((issue) => issue.code === code), code);
  }

  const nestedNodes = structuredClone(nodes);
  nestedNodes[0].quotationRefs = [
    { quotationId: "Q-1", version: "v1", itemId: "QI-1-A-1", allocation: "25.00" },
    { quotationId: "Q-1", version: "v1", itemId: "QI-1-A-2", allocation: "25.00" },
    { quotationId: "Q-1", version: "v1", itemId: "QI-1-B", allocation: "50.00" },
  ];
  nestedNodes[0].children[0].quotationRefs = nestedNodes[0].quotationRefs.slice(0, 2);
  nestedNodes[0].children[0].children = [
    scheduleNode("1-A-1", "25.00", {
      scheduleSemantic: "PHASE_1_ROUGH_IN_LEFT", startAt: "2026-09-01T08:00:00+08:00", dueAt: "2026-09-01T10:00:00+08:00",
      quotationRefs: [{ quotationId: "Q-1", version: "v1", itemId: "QI-1-A-1", allocation: "25.00" }],
    }),
    scheduleNode("1-A-2", "25.00", {
      scheduleSemantic: "PHASE_1_ROUGH_IN_RIGHT", startAt: "2026-09-01T10:01:00+08:00", dueAt: "2026-09-01T12:00:00+08:00",
      quotationRefs: [{ quotationId: "Q-1", version: "v1", itemId: "QI-1-A-2", allocation: "25.00" }],
    }),
  ];
  const nestedQuotation = quotationFor(nestedNodes);
  nestedNodes[0].children[0].children[1].scheduleSemantic = "PHASE_1_ROUGH_IN_LEFT";
  const nestedInvalid = api.generateWorksMilestones({
    caseId: "CASE-1", projectTotalAmount: nestedQuotation.total, quotation: nestedQuotation,
    schedule: { scheduleId: "SCH-NESTED", version: "v1", nodes: nestedNodes },
  });
  assert.equal(nestedInvalid.ok, false);
  assert.ok(nestedInvalid.issues.some((issue) => issue.code === "DUPLICATE_CHILD_SCHEDULE_SEMANTIC"));
});

test("binds PartyAgreement proof parties to the expected distinct contract parties", () => {
  const api = getEngine();
  assert.equal(api.createPartyAgreement(validDomainInputs.PartyAgreement).established, true);
  assert.throws(() => api.createPartyAgreement({
    ...validDomainInputs.PartyAgreement,
    ownerProof: { ...validDomainInputs.PartyAgreement.ownerProof, partyId: "OWNER-OTHER" },
    contractorProof: { ...validDomainInputs.PartyAgreement.contractorProof, partyId: "CONTRACTOR-OTHER" },
  }), /PARTY_AGREEMENT_PROOF_PARTY_MISMATCH/);
  assert.throws(() => api.createPartyAgreement({
    ...validDomainInputs.PartyAgreement, contractorId: "OWNER-1",
  }), /PARTY_AGREEMENT_PARTIES_MUST_BE_DISTINCT/);
  const ownerOnly = api.createPartyAgreement({ ...validDomainInputs.PartyAgreement, contractorProof: null });
  assert.equal(ownerOnly.status, source.governance.partyAgreement.ownerOnlyReportStatus);
  assert.throws(() => api.createPartyAgreement({
    ...validDomainInputs.PartyAgreement, contractorProof: null,
    ownerProof: { ...validDomainInputs.PartyAgreement.ownerProof, partyId: "OWNER-OTHER" },
  }), /PARTY_AGREEMENT_PROOF_PARTY_MISMATCH/);
  const contractorOnly = api.createPartyAgreement({ ...validDomainInputs.PartyAgreement, ownerProof: null });
  assert.equal(contractorOnly.established, false);
  assert.notEqual(contractorOnly.status, source.governance.partyAgreement.status);
});

test("accepts local and null-prototype dictionaries but requires normalization for ordinary cross-realm objects", () => {
  const api = getEngine();
  const nullDictionary = Object.create(null);
  nullDictionary.a = 1;
  assert.equal(api.canonicalSerialize(nullDictionary), "{\"a\":1}");
  const foreign = vm.runInNewContext("({ b: 2, a: [1] })");
  assert.throws(() => api.canonicalSerialize(foreign), /CANONICAL_NORMALIZATION_REQUIRED/);
  assert.equal(api.canonicalSerialize(api.normalizeCanonicalData(foreign)), "{\"a\":[1],\"b\":2}");
  const foreignNullDictionary = vm.runInNewContext("(() => { const value = Object.create(null); value.a = 1; return value; })()");
  assert.equal(api.canonicalSerialize(foreignNullDictionary), "{\"a\":1}");
  const inheritedPrototype = Object.create(null);
  inheritedPrototype.secret = "must-not-disappear";
  const crafted = Object.create(inheritedPrototype);
  crafted.a = 1;
  assert.throws(() => api.canonicalSerialize(crafted), /NON_CANONICAL_OBJECT/);
  assert.throws(() => api.canonicalSerialize(Object.create({ secret: true })), /NON_CANONICAL_OBJECT/);
  const patchedPrototypeObject = vm.runInNewContext(`(() => {
    Object.defineProperty(Object.prototype, "toString", { value: function customToString() { return "custom"; } });
    return { a: 1 };
  })()`);
  assert.throws(() => api.canonicalSerialize(patchedPrototypeObject), /NON_CANONICAL_OBJECT/);
});

test("blocks reentrant final-payment transitions before touching untrusted event properties", () => {
  const api = getEngine();
  const predecessor = api.createFinalPaymentState(finalStateInput());
  let innerSuccessor = null;
  let innerError = null;
  const outerEvent = {
    eventId: "REENTRANT-OUTER", occurredAt: "2026-08-15T13:00:00+08:00",
    acceptanceRecord: finalAcceptanceRecord(),
  };
  Object.defineProperty(outerEvent, "type", {
    enumerable: true,
    configurable: true,
    get() {
      Object.defineProperty(outerEvent, "type", {
        value: "FINAL_ACCEPTANCE_COMPLETED", enumerable: true, configurable: true, writable: true,
      });
      try {
        innerSuccessor = api.applyFinalPaymentEvent(predecessor, {
          type: "FINAL_ACCEPTANCE_COMPLETED", eventId: "REENTRANT-INNER",
          acceptanceRecord: finalAcceptanceRecord(), occurredAt: "2026-08-15T13:00:00+08:00",
        });
      } catch (error) {
        innerError = error;
      }
      return "FINAL_ACCEPTANCE_COMPLETED";
    },
  });
  const outerSuccessor = api.applyFinalPaymentEvent(predecessor, outerEvent);
  assert.equal(outerSuccessor.finalAcceptanceCompleted, true);
  assert.equal(innerSuccessor, null);
  assert.equal(innerError?.code, "FINAL_PAYMENT_STATE_TRANSITION_IN_FLIGHT");
  assert.throws(() => api.applyFinalPaymentEvent(predecessor, {
    type: "FINAL_ACCEPTANCE_COMPLETED", eventId: "REENTRANT-BRANCH",
    acceptanceRecord: finalAcceptanceRecord(), occurredAt: "2026-08-15T13:00:00+08:00",
  }), /FINAL_PAYMENT_STATE_ALREADY_CONSUMED/);

  const retryable = api.createFinalPaymentState(finalStateInput());
  const throwingEvent = { eventId: "REENTRANT-THROW", occurredAt: "2026-08-15T13:00:00+08:00" };
  Object.defineProperty(throwingEvent, "type", {
    enumerable: true,
    get() {
      api.applyFinalPaymentEvent(retryable, {
        type: "FINAL_ACCEPTANCE_COMPLETED", eventId: "REENTRANT-THROW-INNER",
        acceptanceRecord: finalAcceptanceRecord(), occurredAt: "2026-08-15T13:00:00+08:00",
      });
      return "FINAL_ACCEPTANCE_COMPLETED";
    },
  });
  assert.throws(() => api.applyFinalPaymentEvent(retryable, throwingEvent), /FINAL_PAYMENT_STATE_TRANSITION_IN_FLIGHT/);
  const corrected = api.applyFinalPaymentEvent(retryable, {
    type: "FINAL_ACCEPTANCE_COMPLETED", eventId: "REENTRANT-CORRECTED",
    acceptanceRecord: finalAcceptanceRecord(), occurredAt: "2026-08-15T13:00:00+08:00",
  });
  assert.equal(corrected.finalAcceptanceCompleted, true);
});

test("binds rendered construction start and end placeholders to canonical schedule bounds", () => {
  const api = getEngine();
  const works = worksAssemblyTruth(api);
  assert.equal(api.assembleContract(works).status, "DRAFT");
  const wrongStart = api.assembleContract({
    ...works, values: { ...works.values, PROJECT_START_AT: "2099-01-01T08:00:00+08:00" },
  });
  assert.equal(wrongStart.status, "PROCEDURAL_INCOMPLETE");
  assert.ok(wrongStart.unresolvedBindings.includes("projectStartAtPlaceholderMismatch"));
  const wrongEnd = api.assembleContract({
    ...works, values: { ...works.values, PROJECT_END_AT: "2099-12-31T18:00:00+08:00" },
  });
  assert.equal(wrongEnd.status, "PROCEDURAL_INCOMPLETE");
  assert.ok(wrongEnd.unresolvedBindings.includes("projectEndAtPlaceholderMismatch"));
  for (const field of [
    "PROJECT_CONTRACT_TYPE", "CASE_ID", "PROJECT_CONTRACT_ID", "PROJECT_CONTRACT_VERSION",
    "PROJECT_TOTAL_AMOUNT", "CONSTRUCTION_SCHEDULE_ID", "CONSTRUCTION_SCHEDULE_VERSION",
    "PROJECT_START_AT", "PROJECT_END_AT",
  ]) {
    const values = { ...works.values };
    delete values[field];
    assert.equal(api.assembleContract({ ...works, values }).status, "PROCEDURAL_INCOMPLETE", field);
  }
});

test("binds a draft ChangeOrder baseline to the exact assembled project contract identity", () => {
  const api = getEngine();
  const works = worksAssemblyTruth(api);
  const valid = api.assembleContract({ ...works, changes: [validDomainInputs.ChangeOrder] });
  assert.equal(valid.status, "DRAFT");
  const crossContract = api.assembleContract({
    ...works,
    changes: [{
      ...validDomainInputs.ChangeOrder,
      changeOrderId: "CO-CROSS-CONTRACT",
      baselineIdentity: { ...validDomainInputs.ChangeOrder.baselineIdentity, contractId: "CONTRACT-OTHER" },
    }],
  });
  assert.equal(crossContract.status, "PROCEDURAL_INCOMPLETE");
  assert.ok(crossContract.unresolvedBindings.includes("changesContractMismatch"));
  const missingContractIdValues = { ...works.values };
  delete missingContractIdValues.PROJECT_CONTRACT_ID;
  const missingContractId = api.assembleContract({
    ...works, values: missingContractIdValues, changes: [validDomainInputs.ChangeOrder],
  });
  assert.equal(missingContractId.status, "PROCEDURAL_INCOMPLETE");
  assert.ok(missingContractId.unresolvedBindings.includes("projectContractIdBinding"));
});

test("uses structuredClone preflight to reject Proxy spoofing and unavailable canonical runtimes", () => {
  const api = getEngine();
  const nativeLookingProxy = new Proxy({ a: 1 }, {
    getPrototypeOf() { return Object.prototype; },
    getOwnPropertyDescriptor(target, property) { return Reflect.getOwnPropertyDescriptor(target, property); },
    ownKeys(target) { return Reflect.ownKeys(target); },
  });
  assert.throws(() => api.canonicalSerialize(nativeLookingProxy), /NON_CANONICAL_PROXY_OR_UNCLONEABLE/);
  assert.throws(() => api.canonicalSerialize({ nested: nativeLookingProxy }), /NON_CANONICAL_PROXY_OR_UNCLONEABLE/);
  assert.equal(api.canonicalSerialize({ a: 1 }), "{\"a\":1}");
  const foreign = vm.runInNewContext("({ a: 1, nested: [true] })");
  assert.throws(() => api.canonicalSerialize(foreign), /CANONICAL_NORMALIZATION_REQUIRED/);
  assert.equal(api.canonicalSerialize(api.normalizeCanonicalData(foreign)), "{\"a\":1,\"nested\":[true]}");
  const nullDictionary = Object.create(null);
  nullDictionary.a = 1;
  assert.equal(api.canonicalSerialize(nullDictionary), "{\"a\":1}");

  const context = { globalThis: { crypto: webcrypto, TextEncoder }, console };
  context.globalThis.LaibeProjectContractSource = source;
  vm.runInNewContext(readFileSync(enginePath, "utf8"), context);
  assert.throws(
    () => context.globalThis.LaibeProjectContractEngine.canonicalSerialize({ a: 1 }),
    /CANONICAL_STRUCTURED_CLONE_UNAVAILABLE/,
  );
});

test("requires explicit canonical normalization for cross-realm data and makes the normalized copy the only semantic input", async () => {
  const api = getEngine();
  const foreign = vm.runInNewContext("({ b: 2, a: [1, { x: true }] })");
  const local = { a: [1, { x: true }], b: 2 };
  assert.throws(() => api.canonicalSerialize(foreign), /CANONICAL_NORMALIZATION_REQUIRED/);
  const normalized = api.normalizeCanonicalData(foreign);
  assert.equal(Object.getPrototypeOf(normalized), Object.prototype);
  assert.ok(Object.isFrozen(normalized));
  assert.equal(api.canonicalSerialize(normalized), api.canonicalSerialize(local));
  assert.equal(await api.sha256(normalized), await api.sha256(local));

  const inherited = Object.create({ secret: "not-semantic" });
  inherited.a = 1;
  assert.throws(() => api.canonicalSerialize(inherited), /NON_CANONICAL_OBJECT/);
  const normalizedInherited = api.normalizeCanonicalData(inherited);
  assert.deepEqual(normalizedInherited, { a: 1 });
  assert.equal(api.canonicalSerialize(normalizedInherited), "{\"a\":1}");

  const spoof = new Proxy({ a: 1 }, {
    getPrototypeOf() { return Object.prototype; },
    ownKeys(target) { return Reflect.ownKeys(target); },
    getOwnPropertyDescriptor(target, key) { return Reflect.getOwnPropertyDescriptor(target, key); },
  });
  assert.throws(() => api.normalizeCanonicalData(spoof), /NON_CANONICAL_PROXY_OR_UNCLONEABLE/);
});

test("resolves canonical case party and contract placeholders without caller overwrite and binds rendered facts into truth identity", () => {
  const api = getEngine();
  const payments = api.calculateDesignPayments("1000.01").stages;
  const base = {
    contractType: "DESIGN",
    caseData: {
      caseId: "CASE-1", projectContractId: "CONTRACT-1",
      projectName: "忠實案件名稱", projectAddress: "台北市忠實路 1 號",
    },
    parties: {
      owner: { partyId: "OWNER-1", legalName: "忠實業主" },
      contractor: { partyId: "CONTRACTOR-1", legalName: "忠實設計方" },
    },
    versionMetadata: { versionId: "CV-1", status: "DRAFT" },
    designSchedule: designSchedule(), designPaymentStages: payments, changes: [],
    values: {
      CASE_ID: "CASE-OTHER", PROJECT_CONTRACT_ID: "CONTRACT-OTHER", PROJECT_CONTRACT_VERSION: "CV-OTHER",
      PROJECT_CONTRACT_TYPE: "WORKS", PROJECT_NAME: "偽造名稱", PROJECT_ADDRESS: "偽造地址",
      OWNER_ID: "OWNER-OTHER", OWNER_LEGAL_NAME: "偽造業主",
      CONTRACTOR_ID: "CONTRACTOR-OTHER", CONTRACTOR_LEGAL_NAME: "偽造設計方",
      TOTAL_DESIGN_FEE: "1000.01", DESIGN_DELIVERABLE_SCHEDULE: "DESIGN-SCH-1@v1",
      DESIGN_AREA: "30 坪", DESIGN_SCOPE: "住宅設計",
    },
  };
  const conflicted = api.assembleContract(base);
  assert.equal(conflicted.status, "PROCEDURAL_INCOMPLETE");
  for (const field of [
    "CASE_ID", "PROJECT_CONTRACT_ID", "PROJECT_CONTRACT_VERSION", "PROJECT_CONTRACT_TYPE",
    "PROJECT_NAME", "PROJECT_ADDRESS", "OWNER_ID", "OWNER_LEGAL_NAME", "CONTRACTOR_ID", "CONTRACTOR_LEGAL_NAME",
  ]) {
    assert.ok(conflicted.unresolvedBindings.includes(`placeholderConflict:${field}`), field);
  }
  assert.deepEqual(conflicted.structuredContract.resolvedPlaceholderValues, {
    ...base.values,
    CASE_ID: "CASE-1", PROJECT_CONTRACT_ID: "CONTRACT-1", PROJECT_CONTRACT_VERSION: "CV-1",
    PROJECT_CONTRACT_TYPE: "DESIGN", PROJECT_NAME: "忠實案件名稱", PROJECT_ADDRESS: "台北市忠實路 1 號",
    OWNER_ID: "OWNER-1", OWNER_LEGAL_NAME: "忠實業主",
    CONTRACTOR_ID: "CONTRACTOR-1", CONTRACTOR_LEGAL_NAME: "忠實設計方",
  });
  assert.match(conflicted.renderedContract, /忠實案件名稱/);
  assert.doesNotMatch(conflicted.renderedContract, /偽造名稱/);
  assert.ok(Object.isFrozen(conflicted.structuredContract.resolvedPlaceholderValues));

  const canonicalValues = conflicted.structuredContract.resolvedPlaceholderValues;
  const first = api.assembleContract({ ...base, values: { ...canonicalValues, DESIGN_SCOPE: "住宅設計" } });
  const second = api.assembleContract({ ...base, values: { ...canonicalValues, DESIGN_SCOPE: "住宅與工作室設計" } });
  assert.equal(first.status, "DRAFT");
  assert.equal(second.status, "DRAFT");
  assert.notEqual(first.structuredContract.truthIdentity, second.structuredContract.truthIdentity);
});

test("recursively validates design schedules and separates DESIGN_BUILD design and works change lanes", () => {
  const api = getEngine();
  const payments = api.calculateDesignPayments("1000.01").stages;
  const designBase = {
    contractType: "DESIGN", caseData: { caseId: "CASE-1" },
    values: {
      CASE_ID: "CASE-1", PROJECT_CONTRACT_ID: "CONTRACT-1", PROJECT_CONTRACT_VERSION: "CV-1",
      PROJECT_CONTRACT_TYPE: "DESIGN", TOTAL_DESIGN_FEE: "1000.01",
      DESIGN_DELIVERABLE_SCHEDULE: "DESIGN-SCH-1@v1",
    },
    versionMetadata: { versionId: "CV-1", status: "DRAFT" },
    designSchedule: designSchedule(), designPaymentStages: payments, changes: [],
  };
  const malformedNested = api.assembleContract({
    ...designBase,
    designSchedule: designSchedule({ nodes: [{
      ...designSchedule().nodes[0], children: [{ nodeId: "BAD-CHILD", name: "壞節點", dueAt: "2026-02-31T18:00:00+08:00", deliverableRefs: null }],
    }] }),
  });
  assert.equal(malformedNested.status, "PROCEDURAL_INCOMPLETE");
  assert.ok(malformedNested.unresolvedBindings.includes("designSchedule"));

  const works = worksAssemblyTruth(api);
  const designChange = { ...validDomainInputs.ChangeRequest, changeId: "DESIGN-CHANGE-1", changeType: "DESIGN_CHANGE" };
  const worksChange = { ...validDomainInputs.ChangeRequest, changeId: "WORK-CHANGE-1", changeType: "WORK_CHANGE" };
  const dbBase = {
    ...works,
    contractType: "DESIGN_BUILD",
    values: {
      ...works.values, PROJECT_CONTRACT_TYPE: "DESIGN_BUILD", TOTAL_DESIGN_FEE: "1000.01",
      DESIGN_DELIVERABLE_SCHEDULE: "DESIGN-SCH-1@v1",
    },
    designSchedule: designSchedule(), designPaymentStages: payments,
  };
  const ambiguous = api.assembleContract({ ...dbBase, changes: [designChange, worksChange] });
  assert.equal(ambiguous.status, "PROCEDURAL_INCOMPLETE");
  assert.ok(ambiguous.unresolvedBindings.includes("ambiguousDesignBuildChanges"));

  const separated = api.assembleContract({
    ...dbBase, changes: undefined, designChanges: [designChange], worksChanges: [worksChange],
  });
  assert.equal(separated.status, "DRAFT");
  assert.deepEqual(separated.structuredContract.truthBindings.design.changes, [designChange]);
  assert.deepEqual(separated.structuredContract.truthBindings.works.changes, [worksChange]);
  const wrongLane = api.assembleContract({
    ...dbBase, changes: [], designChanges: [worksChange], worksChanges: [designChange],
  });
  assert.equal(wrongLane.status, "PROCEDURAL_INCOMPLETE");
  assert.ok(wrongLane.unresolvedBindings.includes("designChangesContractTypeMismatch"));
  assert.ok(wrongLane.unresolvedBindings.includes("worksChangesContractTypeMismatch"));
});

test("rejects simultaneous legacy and lane change inputs without retaining unvalidated deprecated truth", () => {
  const api = getEngine();
  const design = {
    contractType: "DESIGN", caseData: { caseId: "CASE-1" },
    values: {
      CASE_ID: "CASE-1", PROJECT_CONTRACT_ID: "CONTRACT-1", PROJECT_CONTRACT_VERSION: "CV-1",
      PROJECT_CONTRACT_TYPE: "DESIGN", TOTAL_DESIGN_FEE: "1000.01",
      DESIGN_DELIVERABLE_SCHEDULE: "DESIGN-SCH-1@v1",
    },
    versionMetadata: { versionId: "CV-1", status: "DRAFT" },
    designSchedule: designSchedule(), designPaymentStages: api.calculateDesignPayments("1000.01").stages,
  };
  const ambiguousDesign = api.assembleContract({ ...design, changes: [{}], designChanges: [] });
  assert.equal(ambiguousDesign.status, "PROCEDURAL_INCOMPLETE");
  assert.ok(ambiguousDesign.unresolvedBindings.includes("ambiguousChangesInput"));
  assert.equal(ambiguousDesign.structuredContract.truthBindings.changes, null);
  assert.equal(ambiguousDesign.structuredContract.truthBindings.design.changes, null);

  const works = worksAssemblyTruth(api);
  const ambiguousWorks = api.assembleContract({ ...works, changes: [{}], worksChanges: [] });
  assert.equal(ambiguousWorks.status, "PROCEDURAL_INCOMPLETE");
  assert.ok(ambiguousWorks.unresolvedBindings.includes("ambiguousChangesInput"));
  assert.equal(ambiguousWorks.structuredContract.truthBindings.changes, null);
  assert.equal(ambiguousWorks.structuredContract.truthBindings.works.changes, null);

  const designChange = { ...validDomainInputs.ChangeRequest, changeId: "DESIGN-LANE-ONLY", changeType: "DESIGN_CHANGE" };
  const laneOnly = api.assembleContract({ ...design, designChanges: [designChange] });
  assert.equal(laneOnly.status, "DRAFT");
  assert.equal(laneOnly.structuredContract.truthBindings.changes, null);
  assert.deepEqual(laneOnly.structuredContract.truthBindings.design.changes, [designChange]);
  const legacyOnly = api.assembleContract({ ...design, changes: [designChange] });
  assert.equal(legacyOnly.status, "DRAFT");
  assert.equal(legacyOnly.structuredContract.truthBindings.changes, null);
  assert.deepEqual(legacyOnly.structuredContract.truthBindings.design.changes, [designChange]);
});

test("accepts prototype-like identifiers exactly once across duplicate-tracking boundaries", () => {
  const api = getEngine();
  const payments = api.calculateDesignPayments("1000.01").stages;
  const designBase = {
    contractType: "DESIGN", caseData: { caseId: "CASE-1" },
    values: {
      CASE_ID: "CASE-1", PROJECT_CONTRACT_ID: "CONTRACT-1", PROJECT_CONTRACT_VERSION: "CV-1",
      PROJECT_CONTRACT_TYPE: "DESIGN", TOTAL_DESIGN_FEE: "1000.01",
      DESIGN_DELIVERABLE_SCHEDULE: "DESIGN-SCH-1@v1",
    },
    versionMetadata: { versionId: "CV-1", status: "DRAFT" }, designPaymentStages: payments,
  };
  const prototypeNodeSchedule = designSchedule({
    nodes: [{ ...designSchedule().nodes[0], nodeId: "constructor" }],
  });
  assert.equal(api.assembleContract({ ...designBase, designSchedule: prototypeNodeSchedule, changes: [] }).status, "DRAFT");
  const prototypeChange = {
    ...validDomainInputs.ChangeRequest, changeId: "toString", changeType: "DESIGN_CHANGE",
  };
  assert.equal(api.assembleContract({ ...designBase, designSchedule: designSchedule(), changes: [prototypeChange] }).status, "DRAFT");
  const duplicatePrototypeChange = api.assembleContract({
    ...designBase, designSchedule: designSchedule(), changes: [prototypeChange, { ...prototypeChange }],
  });
  assert.ok(duplicatePrototypeChange.unresolvedBindings.includes("changesDuplicateId"));

  const quotationNodes = Array.from({ length: 10 }, (_, index) => {
    const itemId = index === 0 ? "constructor" : `QI-${index + 1}`;
    return scheduleNode(index + 1, "100.00", {
      quotationRefs: [{ quotationId: "Q-1", version: "v1", itemId, allocation: "100.00" }],
    });
  });
  const quotation = quotationFor(quotationNodes);
  const quotationPlan = api.generateWorksMilestones({
    caseId: "CASE-1", projectTotalAmount: quotation.total, quotation,
    schedule: { scheduleId: "SCH-PROTOTYPE-ID", version: "v1", nodes: quotationNodes },
  });
  assert.equal(quotationPlan.ok, true, JSON.stringify(quotationPlan.issues || []));
  const nodeIdNodes = Array.from({ length: 10 }, (_, index) => scheduleNode(index + 1, "100.00", {
    nodeId: index === 0 ? "toString" : `NODE-SAFE-${index + 1}`,
  }));
  const nodeIdQuotation = quotationFor(nodeIdNodes);
  assert.equal(api.generateWorksMilestones({
    caseId: "CASE-1", projectTotalAmount: nodeIdQuotation.total, quotation: nodeIdQuotation,
    schedule: { scheduleId: "SCH-PROTOTYPE-NODE", version: "v1", nodes: nodeIdNodes },
  }).ok, true);

  let state = api.createFinalPaymentState(finalStateInput());
  state = api.applyFinalPaymentEvent(state, {
    type: "FINAL_ACCEPTANCE_COMPLETED", eventId: "constructor",
    acceptanceRecord: finalAcceptanceRecord(), occurredAt: "2026-08-15T13:00:00+08:00",
  });
  state = api.applyFinalPaymentEvent(state, {
    type: "WARRANTY_PLEDGE_SIGNED", eventId: "toString",
    warrantyPledge: validDomainInputs.WarrantyPledge, occurredAt: "2026-08-15T13:01:00+08:00",
  });
  assert.equal(state.warrantyPledgeSigned, true);
});

test("rejects non-JSON-like and cyclic canonical data so Date cannot collide with an empty object", async () => {
  const api = getEngine();
  assert.throws(() => api.canonicalSerialize(new Date("2026-08-15T00:00:00.000Z")), /NON_CANONICAL/);
  assert.equal(api.canonicalSerialize({}), "{}");
  for (const value of [/x/, new Map([["a", 1]]), new Set([1]), 1n, undefined, () => 1, Symbol("x")]) {
    assert.throws(() => api.canonicalSerialize(value), /NON_CANONICAL/);
  }
  const cyclic = {};
  cyclic.self = cyclic;
  assert.throws(() => api.canonicalSerialize(cyclic), /NON_CANONICAL_CYCLE/);
  await assert.rejects(() => api.createDraftVersion({
    contractId: "CONTRACT-1", versionId: "CV-DATE", createdAt: "2026-08-15T16:00:00+08:00",
    createdBy: "OWNER-1", changeSummary: "bad", structuredContent: { when: new Date() },
  }), /NON_CANONICAL/);
});

test("consumes the new canonical provenance vocabulary without duplicating it in the engine", () => {
  const api = getEngine();
  assert.deepEqual(api.source.sourceTypes, [
    "GOVERNMENT_BASE", "LAIBE_OWNER_PROTECTION", "DRS_GOVERNANCE", "CASE_GENERATED", "USER_EDITED",
  ]);
  const assembled = api.assembleContract({ contractType: "DESIGN", values: {} });
  assert.deepEqual(
    assembled.articles.map((article) => article.sourceType),
    source.templates.DESIGN.articles.map((article) => article.sourceType),
  );
  assert.doesNotMatch(readFileSync(enginePath, "utf8"), /GOVERNMENT_BASE|LAIBE_OWNER_PROTECTION|DRS_GOVERNANCE|CASE_GENERATED|USER_EDITED/);
});

test("creates identity-bearing drafts but fails closed for a formal signed snapshot without real bilateral proof", async () => {
  const api = getEngine();
  const draft = await api.createDraftVersion({
    contractId: "CONTRACT-1", versionId: "CV-1", parentVersionId: null, createdAt: "2026-08-15T16:00:00+08:00",
    createdBy: "OWNER-1", changeSummary: "初稿", structuredContent: { contractType: "DESIGN", articles: [] },
  });
  assert.equal(draft.status, "DRAFT");
  assert.equal(draft.signatureStatus, "NOT_SIGNED");
  assert.match(draft.sha256, /^[a-f0-9]{64}$/);
  const signed = await api.createSignedSnapshot({ draftVersion: draft });
  assert.equal(signed.ok, false);
  assert.equal(signed.status, "NOT_YET_IMPLEMENTED");
  assert.equal(signed.signatureStatus, "NOT_SIGNED");
});

test("appends frozen CaseEvents without mutating the prior event array", () => {
  const api = getEngine();
  const first = validDomainInputs.CaseEvent;
  const history = api.appendCaseEvent(api.createCaseEventHistory("CASE-1"), first);
  const next = api.appendCaseEvent(history, { ...first, eventId: "EV-2", action: "CONTRACT_DRAFT_CREATED", nextActor: "CONTRACTOR-1" });
  assert.equal(history.length, 1);
  assert.equal(next.length, 2);
  assert.notEqual(next, history);
  assert.ok(Object.isFrozen(next));
  assert.ok(next.every((event) => Object.isFrozen(event)));
  assert.throws(() => api.appendCaseEvent(next, { ...first, eventId: "EV-3", basis: [] }), /MISSING_REQUIRED_FIELD.*basis/);
});

test("issues single-consumer CaseEvent histories and validates the complete append-only case chronology", () => {
  const api = getEngine();
  const baseEvent = validDomainInputs.CaseEvent;
  const bootstrap = api.createCaseEventHistory("CASE-1");
  assert.ok(Object.isFrozen(bootstrap));
  assert.equal(bootstrap.length, 0);
  assert.throws(() => api.appendCaseEvent([], baseEvent), /CASE_EVENT_HISTORY_NOT_RUNTIME_ISSUED/);

  const first = api.appendCaseEvent(bootstrap, baseEvent);
  assert.ok(Object.isFrozen(first));
  assert.ok(first.every((event) => Object.isFrozen(event)));
  assert.throws(() => api.appendCaseEvent(bootstrap, { ...baseEvent, eventId: "BOOTSTRAP-BRANCH" }), /CASE_EVENT_HISTORY_ALREADY_CONSUMED/);
  assert.throws(() => api.appendCaseEvent(first, {
    ...baseEvent, eventId: "EV-BACKWARD", occurredAt: "2026-08-15T12:29:59+08:00",
  }), /CASE_EVENT_CHRONOLOGY_REVERSED/);
  assert.throws(() => api.appendCaseEvent(first, { ...baseEvent }), /DUPLICATE_CASE_EVENT_ID/);
  const sameTime = api.appendCaseEvent(first, {
    ...baseEvent, eventId: "EV-SAME-TIME", action: "CONTRACT_DRAFT_CREATED",
  });
  assert.deepEqual(sameTime.map((event) => event.eventId), ["EV-1", "EV-SAME-TIME"]);
  assert.throws(() => api.appendCaseEvent(first, {
    ...baseEvent, eventId: "EV-STALE-BRANCH", occurredAt: "2026-08-15T12:31:00+08:00",
  }), /CASE_EVENT_HISTORY_ALREADY_CONSUMED/);
  assert.throws(() => api.appendCaseEvent(structuredClone(sameTime), {
    ...baseEvent, eventId: "EV-JSON-CLONE", occurredAt: "2026-08-15T12:31:00+08:00",
  }), /CASE_EVENT_HISTORY_NOT_RUNTIME_ISSUED/);
  assert.throws(() => api.appendCaseEvent(sameTime, {
    ...baseEvent, eventId: "EV-CROSS-CASE", caseId: "CASE-OTHER", occurredAt: "2026-08-15T12:31:00+08:00",
  }), /CASE_EVENT_CASE_MISMATCH/);
  assert.throws(() => api.appendCaseEvent(sameTime, {
    ...baseEvent, eventId: "EV-MALFORMED", basis: [], occurredAt: "2026-08-15T12:31:00+08:00",
  }), /MISSING_REQUIRED_FIELD.*basis/);
  const afterRetry = api.appendCaseEvent(sameTime, {
    ...baseEvent, eventId: "EV-RETRY", occurredAt: "2026-08-15T12:31:00+08:00",
  });
  assert.equal(afterRetry.length, 3);

  const reentrant = api.createCaseEventHistory("CASE-1");
  let innerError = null;
  const getterEvent = { ...baseEvent };
  Object.defineProperty(getterEvent, "eventId", {
    enumerable: true,
    get() {
      try { api.appendCaseEvent(reentrant, baseEvent); } catch (error) { innerError = error; }
      return "EV-GETTER";
    },
  });
  assert.throws(() => api.appendCaseEvent(reentrant, getterEvent), /NON_CANONICAL_PROPERTY/);
  assert.match(innerError && innerError.message, /CASE_EVENT_HISTORY_TRANSITION_IN_FLIGHT/);
  assert.equal(api.appendCaseEvent(reentrant, baseEvent).length, 1);

  const restore = api.restoreCaseEventHistory({ caseId: "CASE-1", events: afterRetry });
  assert.deepEqual(restore, {
    ok: false, status: "NOT_YET_IMPLEMENTED",
    issue: "DURABLE_CASE_EVENT_HISTORY_RESTORE_ADAPTER_NOT_IMPLEMENTED",
  });
  assert.ok(Object.isFrozen(restore));
});

test("does not embed prohibited runtime shortcuts and leaves the canonical source bytes untouched", () => {
  getEngine();
  const engineText = readFileSync(enginePath, "utf8");
  assert.doesNotMatch(engineText, /48\s*(?:h|hr|hour)|auto[-_ ]?(?:pay|approve)|fixed\s+eight|hardcoded\s+total|competitive\s+procurement|tender|escrow|cash\s+custody/i);
  const sourceBytes = readFileSync(sourcePath);
  assert.equal(sourceBytes.length, 29608);
  assert.equal(sourceBytes.toString("utf8").split(/\r?\n/).length - 1, 562);
  assert.equal(createHash("sha256").update(sourceBytes).digest("hex").toUpperCase(), "382F3A7F79FB8185DF03E6A45616B90C6CBD3FCDA0A65D9552DBFE1FEE9BC6FC");
});
