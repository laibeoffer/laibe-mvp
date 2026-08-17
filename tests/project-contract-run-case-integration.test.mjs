import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const require = createRequire(import.meta.url);
const pagePath = new URL("../site/pro_run_case/code.html", import.meta.url);
const source = require(fileURLToPath(new URL("../site/shared/laibe-project-contract-source.js", import.meta.url)));
const engine = require(fileURLToPath(new URL("../site/shared/laibe-project-contract-engine.js", import.meta.url)));

function pageSource() {
  return readFileSync(pagePath, "utf8");
}

function consumerApi() {
  const html = pageSource();
  const match = html.match(/<script id="contract-consumer-api">([\s\S]*?)<\/script>/);
  assert.ok(match, "page must expose a page-contained contract consumer API");
  const context = {
    module: { exports: {} },
    exports: {},
    structuredClone,
  };
  context.globalThis = context;
  vm.runInNewContext(match[1], context, { filename: "pro-run-case-consumer.js" });
  return context.module.exports;
}

function copy(value) {
  return structuredClone(value);
}

function asContractType(value, contractType) {
  const input = copy(value);
  input.contractType = contractType;
  input.values.PROJECT_CONTRACT_TYPE = contractType;
  if (contractType === "DESIGN") {
    for (const key of [
      "PROJECT_TOTAL_AMOUNT", "PROJECT_START_AT", "PROJECT_END_AT",
      "CONSTRUCTION_SCHEDULE_ID", "CONSTRUCTION_SCHEDULE_VERSION",
    ]) delete input.values[key];
    delete input.quotation;
    delete input.constructionSchedule;
    delete input.worksChanges;
    delete input.warranty;
  }
  if (contractType === "WORKS") {
    for (const key of ["DESIGN_AREA", "DESIGN_SCOPE", "DESIGN_DELIVERABLE_SCHEDULE", "TOTAL_DESIGN_FEE"]) {
      delete input.values[key];
    }
    delete input.designSchedule;
    delete input.designChanges;
  }
  return input;
}

function signedContractPledge(input) {
  return {
    ...copy(input.warranty.pledge),
    status: "SIGNED",
    signingProof: {
      partyId: input.parties.contractor.partyId,
      proofId: "PROOF-WARRANTY-DEMO-001",
      role: "CONTRACTOR",
      verified: true,
      createdAt: "2026-09-20T10:01:00+08:00",
    },
  };
}

function finalPaymentRecords(input) {
  const subjectId = "FINAL-DEMO-001";
  const review = {
    reviewId: "REVIEW-FINAL-DEMO-001",
    reviewVersion: "v1",
    caseId: input.caseData.caseId,
    subjectId,
    status: "READY_FOR_OWNER_DECISION",
    basis: [{ documentId: "FINAL-BASIS-DEMO-001", version: "v1" }],
    findings: [],
    createdAt: "2026-09-20T10:02:00+08:00",
    createdBy: "DRS-REVIEWER-DEMO-001",
  };
  const ownerDecision = {
    decisionId: "DECISION-FINAL-DEMO-001",
    caseId: input.caseData.caseId,
    reviewId: review.reviewId,
    reviewVersion: review.reviewVersion,
    subjectId,
    ownerId: input.parties.owner.partyId,
    decision: "APPROVE",
    reason: "依完整驗收、保固與審查紀錄決定",
    evidence: [{ documentId: "OWNER-DECISION-EVIDENCE-DEMO-001", version: "v1" }],
    createdAt: "2026-09-20T10:03:00+08:00",
    review,
  };
  return {
    subjectId,
    acceptanceEvent: {
      eventId: "EVENT-FINAL-ACCEPTANCE-DEMO-001",
      occurredAt: "2026-09-20T10:00:00+08:00",
      record: {
        acceptanceId: "ACCEPTANCE-DEMO-001",
        caseId: input.caseData.caseId,
        subjectId,
        projectContractId: input.caseData.projectContractId,
        contractVersion: input.versionMetadata.versionId,
        documentRef: { documentId: "FINAL-ACCEPTANCE-DEMO-001", version: "v1" },
        completedAt: "2026-09-20T09:58:00+08:00",
        ownerDecision: "ACCEPT",
        ownerDecisionEvidence: { documentId: "FINAL-ACCEPTANCE-OWNER-DEMO-001", version: "v1" },
        ownerProof: {
          partyId: input.parties.owner.partyId,
          proofId: "PROOF-FINAL-ACCEPTANCE-DEMO-001",
          role: "OWNER",
          verified: true,
          createdAt: "2026-09-20T09:59:00+08:00",
        },
      },
    },
    warrantyEvent: {
      eventId: "EVENT-WARRANTY-DEMO-001",
      occurredAt: "2026-09-20T10:01:00+08:00",
      record: signedContractPledge(input),
    },
    reviewEvent: {
      eventId: "EVENT-FINAL-REVIEW-DEMO-001",
      occurredAt: "2026-09-20T10:02:00+08:00",
      record: review,
    },
    decisionEvent: {
      eventId: "EVENT-FINAL-DECISION-DEMO-001",
      occurredAt: "2026-09-20T10:03:00+08:00",
      record: ownerDecision,
    },
  };
}

test("starts in an explicit empty state and makes sample loading an explicit action", () => {
  const html = pageSource();
  const api = consumerApi();
  const consumer = api.createConsumer({ source, engine });

  assert.deepEqual(JSON.parse(JSON.stringify(consumer.consume())), {
    state: "EMPTY",
    title: "尚未載入案件契約",
    message: "請載入已整理的案件資料，或先用教學範例了解這份總覽。",
  });
  assert.match(html, /id="loadSample"[^>]*>載入教學範例</);
  assert.match(html, /id="emptyState"/);
  assert.doesNotMatch(html, /consume\s*\(\s*(?:api\.)?createSampleInput\s*\(\s*\)\s*\)/);
  assert.doesNotMatch(html, /localStorage|sessionStorage/);
});

test("uses canonical normalization, engine calculation and assembly as the only runtime truth", () => {
  const api = consumerApi();
  const calls = { normalize: 0, design: 0, works: 0, assemble: 0 };
  const instrumented = { ...engine };
  instrumented.normalizeCanonicalData = (value) => {
    calls.normalize += 1;
    return engine.normalizeCanonicalData(value);
  };
  instrumented.calculateDesignPayments = (amount) => {
    calls.design += 1;
    return engine.calculateDesignPayments(amount);
  };
  instrumented.generateWorksMilestones = (input) => {
    calls.works += 1;
    return engine.generateWorksMilestones(input);
  };
  instrumented.assembleProjectContract = (input) => {
    calls.assemble += 1;
    return engine.assembleProjectContract(input);
  };

  const consumer = api.createConsumer({ source, engine: instrumented });
  const result = consumer.consume(api.createSampleInput());

  assert.equal(result.state, "READY");
  assert.equal(result.design.scheduleRef, "DESIGN-SCHEDULE-DEMO-001@v2");
  assert.ok(calls.normalize >= 4, "raw and derived cross-realm inputs must be explicitly canonicalized");
  assert.deepEqual(
    { design: calls.design, works: calls.works, assemble: calls.assemble },
    { design: 1, works: 1, assemble: 1 },
  );
  assert.equal(result.identity.sourceId, "LAIBE-PROJECT-CONTRACT-SOURCE-v0.2");
  assert.equal(result.identity.contractType, "DESIGN_BUILD");
  assert.equal(result.identity.caseId, "CASE-DEMO-001");
  assert.equal(result.identity.contractId, "CONTRACT-DEMO-001");
  assert.equal(result.identity.versionId, "CV-DEMO-001");
  assert.equal(result.identity.quotation, "QUOTATION-DEMO-001@v3");
  assert.equal(result.identity.constructionSchedule, "SCHEDULE-DEMO-001@v2");
  assert.match(result.identity.truthIdentity, /^\{/);
});

test("keeps DESIGN and WORKS truth separate and renders dynamic works stages from quotation plus schedule", () => {
  const api = consumerApi();
  const consumer = api.createConsumer({ source, engine });
  const result = consumer.consume(api.createSampleInput());

  assert.equal(result.state, "READY");
  assert.deepEqual(Array.from(result.design.paymentStages, (stage) => stage.rate), [20, 10, 30, 40]);
  assert.equal(result.design.paymentStages[2].trigger, "第一次細部施工圖＋報價單交付");
  assert.equal(result.works.milestones.length, 10);
  assert.ok(result.works.milestones.every((milestone) => milestone.paymentRate <= 10));
  assert.equal(result.works.paymentSummary.signingRate, 5);
  assert.equal(result.works.paymentSummary.progressRate, 80);
  assert.equal(result.works.paymentSummary.finalRate, 15);
  assert.equal(result.works.paymentSummary.totalRate, 100);
  assert.equal(result.works.paymentSummary.warrantyDeposit, "NONE");
  assert.equal(result.works.finalGate.ready, false);
  assert.deepEqual(Array.from(result.works.finalGate.requirements, (item) => item.key), [
    "FINAL_ACCEPTANCE_COMPLETED",
    "WARRANTY_PLEDGE_SIGNED",
    "OWNER_DECISION_APPROVE",
  ]);
  assert.ok(result.works.milestones.every((milestone) => (
    milestone.drsReviewState === "PENDING" && milestone.ownerDecisionState === "PENDING" &&
    milestone.paymentState === "PENDING"
  )));
});

test("assembles DESIGN, WORKS, and DESIGN_BUILD without undefined inactive-lane properties", () => {
  const api = consumerApi();
  const consumer = api.createConsumer({ source, engine });
  const expected = {
    DESIGN: { design: true, works: false },
    WORKS: { design: false, works: true },
    DESIGN_BUILD: { design: true, works: true },
  };

  for (const contractType of source.contractTypes) {
    const result = consumer.consume(asContractType(api.createSampleInput(), contractType));
    assert.equal(result.state, "READY", `${contractType} should consume only its active truth lanes`);
    assert.equal(Boolean(result.design), expected[contractType].design);
    assert.equal(Boolean(result.works), expected[contractType].works);
    assert.equal(result.identity.contractType, contractType);
  }
});

test("requires finalPaymentRecords to be completely absent from a pure DESIGN contract", () => {
  const api = consumerApi();
  const consumer = api.createConsumer({ source, engine });
  const absent = asContractType(api.createSampleInput(), "DESIGN");

  assert.equal(Object.hasOwn(absent, "finalPaymentRecords"), false);
  assert.equal(consumer.consume(absent).state, "READY");

  for (const inactiveValue of [undefined, null, {}, "NOT-A-RECORD", 1]) {
    const input = copy(absent);
    input.finalPaymentRecords = inactiveValue;
    assert.equal(Object.hasOwn(input, "finalPaymentRecords"), true);
    assert.equal(consumer.consume(input).state, "ERROR");
  }
});

test("binds the design schedule reference to the exact scheduleId and version", () => {
  const api = consumerApi();
  const consumer = api.createConsumer({ source, engine });
  const mutations = [
    (input) => { input.designSchedule.scheduleId = "DESIGN-SCHEDULE-OTHER"; },
    (input) => { input.designSchedule.version = "v3"; },
    (input) => {
      input.designSchedule.DESIGN_DELIVERABLE_SCHEDULE = "DESIGN-SCHEDULE-OTHER@v2";
      input.values.DESIGN_DELIVERABLE_SCHEDULE = "DESIGN-SCHEDULE-OTHER@v2";
    },
  ];

  for (const mutate of mutations) {
    const input = copy(api.createSampleInput());
    mutate(input);
    assert.equal(consumer.consume(input).state, "ERROR");
  }
});

test("never promotes primitive flags or a caller-signed contract pledge into final readiness", () => {
  const api = consumerApi();
  const consumer = api.createConsumer({ source, engine });
  const input = copy(api.createSampleInput());
  input.workflow.finalAcceptanceCompleted = true;
  input.workflow.ownerDecision = "APPROVE";
  input.warranty.pledge = signedContractPledge(input);

  const result = consumer.consume(input);
  assert.equal(result.state, "READY");
  assert.equal(result.works.finalGate.ready, false);
  assert.deepEqual(Array.from(result.works.finalGate.requirements, (item) => item.met), [false, false, false]);
  assert.equal(result.works.finalGate.status, "FORMAL_RECORD_ADAPTER_PENDING");
});

test("validates identity-bearing final records but stays not ready without a formal record adapter", () => {
  const api = consumerApi();
  const consumer = api.createConsumer({ source, engine });
  const input = copy(api.createSampleInput());
  input.finalPaymentRecords = finalPaymentRecords(input);

  const result = consumer.consume(input);
  assert.equal(result.state, "READY");
  assert.equal(result.works.finalGate.ready, false);
  assert.deepEqual(Array.from(result.works.finalGate.requirements, (item) => item.met), [true, true, true]);
  assert.equal(result.works.finalGate.status, "FORMAL_RECORD_ADAPTER_PENDING");
});

test("rejects reuse of one proofId for owner acceptance and contractor warranty signing", () => {
  const api = consumerApi();
  const consumer = api.createConsumer({ source, engine });
  const input = copy(api.createSampleInput());
  input.finalPaymentRecords = finalPaymentRecords(input);
  input.finalPaymentRecords.warrantyEvent.record.signingProof.proofId =
    input.finalPaymentRecords.acceptanceEvent.record.ownerProof.proofId;

  const result = consumer.consume(input);
  assert.equal(result.state, "ERROR");
  assert.equal(Object.hasOwn(result, "works"), false);
  assert.doesNotMatch(JSON.stringify(result), /requirements|甲方確認紀錄|乙方簽署紀錄/);
});

test("fails closed on nested final-record identity, evidence, and chronology mismatches", () => {
  const api = consumerApi();
  const consumer = api.createConsumer({ source, engine });
  const mutations = [
    (records) => { records.acceptanceEvent.record.projectContractId = "CONTRACT-OTHER"; },
    (records) => { records.acceptanceEvent.record.ownerProof.partyId = "OWNER-OTHER"; },
    (records) => { records.warrantyEvent.record.contractVersion = "CV-OTHER"; },
    (records) => { records.warrantyEvent.record.warrantyTermsRef.version = "v9"; },
    (records) => { records.reviewEvent.record.subjectId = "FINAL-OTHER"; },
    (records) => { records.decisionEvent.record.review.subjectId = "FINAL-OTHER"; },
    (records) => { records.decisionEvent.record.ownerId = "OWNER-OTHER"; },
    (records) => { records.decisionEvent.record.evidence = []; },
    (records) => { records.decisionEvent.occurredAt = "2026-09-20T09:57:00+08:00"; },
  ];

  for (const mutate of mutations) {
    const input = copy(api.createSampleInput());
    input.finalPaymentRecords = finalPaymentRecords(input);
    mutate(input.finalPaymentRecords);
    assert.equal(consumer.consume(input).state, "ERROR");
  }
});

test("fails closed on party, case, contract, version, quotation, schedule, change, and warranty mismatches", () => {
  const api = consumerApi();
  const consumer = api.createConsumer({ source, engine });
  const mutations = [
    (input) => { input.parties.owner.role = "CONTRACTOR"; },
    (input) => { input.caseData.ownerId = "OWNER-OTHER"; },
    (input) => { input.values.PROJECT_CONTRACT_ID = "CONTRACT-OTHER"; },
    (input) => { input.values.PROJECT_CONTRACT_VERSION = "CV-OTHER"; },
    (input) => { input.constructionSchedule.nodes[0].quotationRefs[0].quotationId = "QUOTATION-OTHER"; },
    (input) => { input.constructionSchedule.caseId = "CASE-OTHER"; },
    (input) => { input.worksChanges[0].caseId = "CASE-OTHER"; },
    (input) => { input.warranty.pledge.projectContractId = "CONTRACT-OTHER"; },
  ];

  for (const mutate of mutations) {
    const input = copy(api.createSampleInput());
    mutate(input);
    const result = consumer.consume(input);
    assert.equal(result.state, "ERROR");
    assert.equal(result.title, "案件資料無法安全顯示");
    assert.equal(result.message, "案件、當事人、契約版本或依據文件未能一致對上，請先確認資料後再載入。");
    assert.equal(Object.hasOwn(result, "stack"), false);
  }
});

test("fails closed when generated or assembled truth is incomplete instead of rendering guessed totals", () => {
  const api = consumerApi();
  const consumer = api.createConsumer({ source, engine });
  const overweight = copy(api.createSampleInput());
  overweight.constructionSchedule.nodes = overweight.constructionSchedule.nodes.slice(0, 4);
  overweight.quotation.items = overweight.quotation.items.slice(0, 4);
  overweight.quotation.total = "720000.00";

  const result = consumer.consume(overweight);
  assert.equal(result.state, "ERROR");
  assert.equal(result.title, "案件資料無法安全顯示");
  assert.doesNotMatch(JSON.stringify(result), /stack|ContractEngineValidationError|PROGRESS_NODE_EXCEEDS/);
});

test("loads canonical source before engine and keeps the consumer page-contained and CommonJS-friendly", () => {
  const html = pageSource();
  const sourceIndex = html.indexOf("../shared/laibe-project-contract-source.js");
  const engineIndex = html.indexOf("../shared/laibe-project-contract-engine.js");
  const consumerIndex = html.indexOf('id="contract-consumer-api"');

  assert.ok(sourceIndex > 0);
  assert.ok(engineIndex > sourceIndex);
  assert.ok(consumerIndex > engineIndex);
  assert.match(html, /module\.exports\s*=\s*api/);
  assert.equal(typeof consumerApi().createConsumer, "function");
  assert.equal(typeof consumerApi().createSampleInput, "function");
});

test("removes parallel page truth and legacy procurement or fake capability claims", () => {
  const html = pageSource();
  const forbidden = [
    /\bvar\s+CASES\b/,
    /\bvar\s+CALS\b/,
    /\bvar\s+PAYS\b/,
    /\bvar\s+MS\b/,
    /招標|投標|競標|決標|得標|標案雷達/,
    /同步至 Google|Google 日曆|Google同步/,
    /保固保證金|warranty deposit|warranty retention/i,
    /48\s*(?:小時|h).*?(?:自動|付款|核准)/i,
    /送審已建立|正式簽署完成|已正式保存|跨頁同步完成/,
    /雙方紀錄已確認|雙方證明已確認|甲乙雙方紀錄完成/,
  ];
  for (const pattern of forbidden) assert.doesNotMatch(html, pattern);
  assert.match(html, /目前只在本頁顯示，不會保存或同步到其他頁面/);
  assert.match(html, /尚未提供正式簽署與保存/);
});

test("provides safe, accessible empty, error, responsive and print states", () => {
  const html = pageSource();
  assert.match(html, /lang="zh-Hant"/);
  assert.match(html, /id="errorState"[^>]*role="alert"/);
  assert.match(html, /id="printSummary"[^>]*disabled/);
  assert.match(html, /aria-live="polite"/);
  assert.match(html, /:focus-visible/);
  assert.match(html, /@media\s*\(max-width:\s*720px\)/);
  assert.match(html, /@media\s+print/);
  assert.match(html, /textContent/);
  assert.match(html, /id="designBasis"/);
  assert.match(html, /stage\.state/);
  assert.match(html, /stage\.drsReviewState/);
  assert.match(html, /契約文字仍需依實際案件完成法律專業審查/);
  assert.match(html, /正式案件紀錄尚未接續/);
  assert.doesNotMatch(html, /innerHTML\s*=\s*(?:error|err|e)\.(?:message|stack)/);
});
