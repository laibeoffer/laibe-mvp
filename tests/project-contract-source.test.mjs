import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { test } from "node:test";

const require = createRequire(import.meta.url);
let contractSource;
let loadError;

try {
  contractSource = require("../site/shared/laibe-project-contract-source.js");
} catch (error) {
  loadError = error;
}

const FORMAL_TYPES = ["DESIGN", "WORKS", "DESIGN_BUILD"];
const REQUIRED_SOURCE_TYPES = [
  "GOVERNMENT_BASE",
  "LAIBE_OWNER_PROTECTION",
  "DRS_GOVERNANCE",
  "CASE_GENERATED",
  "USER_EDITED",
];
const ALLOWED_SOURCE_TYPES = new Set(REQUIRED_SOURCE_TYPES);
const PLACEHOLDER_PATTERN = /^\{\{[A-Z][A-Z0-9_]*\}\}$/;

function getSource() {
  assert.ifError(loadError);
  assert.ok(contractSource, "contract source must be loadable in Node");
  return contractSource;
}

function getAllArticles(source = getSource()) {
  return [
    ...FORMAL_TYPES.flatMap((type) => source.templates[type].articles),
    ...source.commonProcedureAppendix.articles,
  ];
}

function bodyPlaceholders(body) {
  return body.match(/\{\{[^{}]+\}\}/g) ?? [];
}

test("source loads in Node and exposes the v0.2 browser global contract", () => {
  const source = getSource();
  assert.equal(source.templateVersion, "v0.2");
  assert.equal(source.browserGlobal, "LaibeProjectContractSource");
});

test("formal template keys use only DESIGN, WORKS, and DESIGN_BUILD", () => {
  const source = getSource();
  assert.deepEqual(Object.keys(source.templates), FORMAL_TYPES);
  assert.deepEqual(source.contractTypes, FORMAL_TYPES);
  assert.deepEqual(source.legacyContractTypeMap, {
    design: "DESIGN",
    works: "WORKS",
    dt: "DESIGN_BUILD",
  });
});

test("every article has the stable structured schema and a unique articleId", () => {
  const articles = getAllArticles();
  const ids = articles.map((article) => article.articleId);

  assert.equal(new Set(ids).size, ids.length, "article IDs must be globally unique");
  for (const article of articles) {
    assert.match(article.articleId, /^(DESIGN|WORKS|DESIGN_BUILD|COMMON)-\d{2}-[A-Z0-9-]+$/);
    assert.equal(typeof article.title, "string");
    assert.ok(article.title.length > 0);
    assert.equal(typeof article.body, "string");
    assert.ok(article.body.length > 0);
    assert.equal(typeof article.required, "boolean");
    assert.ok(ALLOWED_SOURCE_TYPES.has(article.sourceType), `invalid sourceType: ${article.sourceType}`);
    assert.ok(Array.isArray(article.placeholders));
    assert.ok(Array.isArray(article.attachments));
    assert.deepEqual([...article.placeholders].sort(), [...new Set(bodyPlaceholders(article.body))].sort());
  }
});

test("sourceType provenance vocabulary is exact and canonical articles are thoughtfully classified", () => {
  const source = getSource();
  const articles = getAllArticles(source);
  const articleById = Object.fromEntries(articles.map((item) => [item.articleId, item]));
  const represented = new Set(articles.map((item) => item.sourceType));

  assert.deepEqual(source.sourceTypes, REQUIRED_SOURCE_TYPES);
  assert.equal([...represented].every((sourceType) => ALLOWED_SOURCE_TYPES.has(sourceType)), true);
  assert.equal(represented.has("GOVERNMENT_BASE"), true);
  assert.equal(represented.has("LAIBE_OWNER_PROTECTION"), true);
  assert.equal(represented.has("DRS_GOVERNANCE"), true);
  assert.equal(represented.has("CASE_GENERATED"), false);
  assert.equal(represented.has("USER_EDITED"), false);

  assert.equal(articleById["DESIGN-01-PARTIES"].sourceType, "GOVERNMENT_BASE");
  assert.equal(articleById["DESIGN-06-FEE-PAYMENT"].sourceType, "LAIBE_OWNER_PROTECTION");
  assert.equal(articleById["DESIGN-08-DRS-PROCEDURE"].sourceType, "DRS_GOVERNANCE");
  assert.equal(articleById["WORKS-09-HOLD-POINT"].sourceType, "LAIBE_OWNER_PROTECTION");
  assert.equal(articleById["WORKS-08-DRS-PAYMENT-REVIEW"].sourceType, "DRS_GOVERNANCE");
  assert.equal(articleById["DESIGN_BUILD-04-RELEASE-GATE"].sourceType, "DRS_GOVERNANCE");
  assert.equal(source.commonProcedureAppendix.articles.every((item) => item.sourceType === "DRS_GOVERNANCE"), true);

  for (const type of FORMAL_TYPES) {
    assert.equal(source.templates[type].contractType, type);
    assert.ok(ALLOWED_SOURCE_TYPES.has(source.templates[type].sourceType));
  }
  assert.equal(source.commonProcedureAppendix.sourceType, "DRS_GOVERNANCE");
});

test("dynamic fields use only {{FIELD_NAME}} and include every required contract field", () => {
  const source = getSource();
  const serialized = JSON.stringify(source);
  const tokens = serialized.match(/\{\{[^{}]+\}\}/g) ?? [];

  assert.ok(tokens.length > 0);
  tokens.forEach((token) => assert.match(token, PLACEHOLDER_PATTERN));
  assert.doesNotMatch(serialized, /待填|_{4,}|demo\s*value|假資料/i);

  const requiredFields = [
    "CASE_ID", "PROJECT_CONTRACT_ID", "PROJECT_CONTRACT_TYPE", "PROJECT_CONTRACT_VERSION",
    "PROJECT_CONTRACT_GENERATED_AT", "OWNER_ID", "OWNER_LEGAL_NAME", "OWNER_ID_NUMBER",
    "OWNER_PHONE", "OWNER_EMAIL", "OWNER_ADDRESS", "CONTRACTOR_ID", "CONTRACTOR_LEGAL_NAME",
    "CONTRACTOR_REGISTRATION_NUMBER", "CONTRACTOR_REPRESENTATIVE", "CONTRACTOR_PHONE",
    "CONTRACTOR_EMAIL", "CONTRACTOR_ADDRESS", "PROJECT_NAME", "PROJECT_ADDRESS", "DRS_ENABLED",
    "DRS_SERVICE_CONTRACT_ID", "DRS_PROCEDURE_VERSION", "DESIGNATED_COMMUNICATION_CHANNEL",
    "DRS_FALLBACK_CHANNEL", "PROJECT_CONTRACT_SIGNED_AT", "SIGNED_CONTRACT_VERSION",
    "SIGNED_CONTRACT_SHA256", "SIGNED_PDF_DOCUMENT_ID",
  ];

  for (const field of requiredFields) {
    assert.ok(serialized.includes(`{{${field}}}`), `missing required field: ${field}`);
  }
});

test("common DRS procedure appendix is referenced as a single source of truth", () => {
  const source = getSource();
  assert.equal(source.commonProcedureAppendix.appendixId, "COMMON-DRS-PROCEDURE-v0.2");
  assert.equal(source.commonProcedureAppendix.articles.length, 10);

  for (const template of Object.values(source.templates)) {
    assert.equal(template.commonAppendixRef, source.commonProcedureAppendix.appendixId);
    assert.equal(Object.hasOwn(template, "commonProcedureAppendix"), false);
    assert.equal(template.articles.some((article) => article.articleId.startsWith("COMMON-")), false);
  }
});

test("DESIGN uses the exact 20/10/30/40 profile and first-detail-drawing Stage 3 meaning", () => {
  const profile = getSource().templates.DESIGN.paymentProfiles.designFee;
  assert.deepEqual(profile.stages.map(({ stageId, rate }) => [stageId, rate]), [
    ["DESIGN_STAGE_1", 20],
    ["DESIGN_STAGE_2", 10],
    ["DESIGN_STAGE_3", 30],
    ["DESIGN_STAGE_4", 40],
  ]);
  assert.equal(profile.totalRate, 100);
  assert.equal(profile.stages[2].trigger, "第一次細部施工圖＋報價單交付");
  assert.doesNotMatch(profile.stages[2].trigger, /全部細部施工圖/);
});

test("WORKS separates the final payment readiness gate from explicit Owner Decision", () => {
  const profile = getSource().templates.WORKS.paymentProfiles.worksAmount;
  assert.equal(profile.signingRate, 5);
  assert.equal(profile.progressPoolRate, 80);
  assert.equal(profile.maxProgressMilestoneRate, 10);
  assert.equal(profile.progressMilestoneCountFixed, false);
  assert.equal(profile.finalRate, 15);
  assert.deepEqual(profile.finalPaymentReadiness, {
    prerequisites: ["FINAL_ACCEPTANCE_COMPLETED", "WARRANTY_PLEDGE_SIGNED"],
    drsReview: "DRS_DOCUMENT_AND_PROCEDURE_REVIEW",
    readyStatus: "FINAL_PAYMENT_READY_FOR_OWNER_DECISION",
  });
  assert.deepEqual(profile.finalPaymentDecision, {
    actor: "OWNER",
    explicitDecisionRequired: true,
    approvalValue: "APPROVE",
    paymentAction: "FINAL_PAYMENT_ACTION",
  });
  assert.equal(Object.hasOwn(profile, "finalConditions"), false);
  assert.equal(profile.warrantyDeposit, "NONE");
});

test("DESIGN_BUILD keeps design and works amounts, profiles, and release gate separate", () => {
  const template = getSource().templates.DESIGN_BUILD;
  assert.equal(template.amountFields.designFee, "{{TOTAL_DESIGN_FEE}}");
  assert.equal(template.amountFields.worksAmount, "{{PROJECT_TOTAL_AMOUNT}}");
  assert.deepEqual(template.paymentProfiles.designFee.stages.map((stage) => stage.rate), [20, 10, 30, 40]);
  assert.deepEqual(
    {
      signingRate: template.paymentProfiles.worksAmount.signingRate,
      progressPoolRate: template.paymentProfiles.worksAmount.progressPoolRate,
      finalRate: template.paymentProfiles.worksAmount.finalRate,
    },
    { signingRate: 5, progressPoolRate: 80, finalRate: 15 },
  );
  assert.equal(template.designToConstructionGate.ownerDecision, "CONSTRUCTION_RELEASE");
  assert.deepEqual(template.designToConstructionGate.requiredBasis, [
    "CONFIRMED_DESIGN_BASELINE",
    "FORMAL_CONSTRUCTION_DRAWINGS",
    "FORMAL_WORKS_QUOTATION",
    "CONSTRUCTION_SCHEDULE",
    "WORKS_PAYMENT_MILESTONES",
  ]);
  assert.deepEqual(
    template.paymentProfiles.worksAmount.finalPaymentReadiness,
    {
      prerequisites: ["FINAL_ACCEPTANCE_COMPLETED", "WARRANTY_PLEDGE_SIGNED"],
      drsReview: "DRS_DOCUMENT_AND_PROCEDURE_REVIEW",
      readyStatus: "FINAL_PAYMENT_READY_FOR_OWNER_DECISION",
    },
  );
  assert.deepEqual(
    template.paymentProfiles.worksAmount.finalPaymentDecision,
    {
      actor: "OWNER",
      explicitDecisionRequired: true,
      approvalValue: "APPROVE",
      paymentAction: "FINAL_PAYMENT_ACTION",
    },
  );
});

test("DRS governance preserves Review, explicit Owner Decision, Party Agreement, and Override history", () => {
  const governance = getSource().governance;
  assert.equal(governance.drsIsContractingParty, false);
  assert.equal(governance.reviewIsOwnerDecision, false);
  assert.equal(governance.reviewTriggersPayment, false);
  assert.equal(governance.silenceIsApproval, false);
  assert.equal(governance.partyAgreement.requiresVerifiableIntentFromOwnerAndContractor, true);
  assert.equal(governance.ownerOverride.preservesOriginalReview, true);
  assert.deepEqual(governance.ownerDecisionOptions, [
    "APPROVE", "OBJECT", "REQUEST_SUPPLEMENT", "APPROVE_WITH_RESERVATION", "OWNER_OVERRIDE",
  ]);
  assert.deepEqual(governance.prohibitedDrsRoles, [
    "CONTRACTING_PARTY", "DESIGNER", "CONTRACTOR", "SITE_SUPERVISOR", "SITE_ACCEPTANCE_INSPECTOR",
    "ENGINEERING_APPRAISER", "LEGAL_ADJUDICATOR", "PAYMENT_AGENT", "FUNDS_CUSTODIAN", "QUALITY_GUARANTOR",
  ]);
});

test("all Part A/B/C and common appendix articles are present with legal-review boundary", () => {
  const source = getSource();
  assert.equal(source.legalStatus, "LEGAL_REVIEW_REQUIRED");
  assert.equal(source.legalReviewCompleted, false);
  assert.equal(source.templates.DESIGN.articles.length, 14);
  assert.equal(source.templates.WORKS.articles.length, 14);
  assert.equal(source.templates.DESIGN_BUILD.articles.length, 7);

  const text = getAllArticles(source).map((article) => `${article.title}\n${article.body}`).join("\n");
  for (const phrase of [
    "DRS 不審美感", "第一次細部施工圖＋報價單交付", "不可逆工序 Hold Point",
    "PAYMENT_APPLICATION_PROCEDURALLY_INCOMPLETE", "OWNER_EARLY_CONSTRUCTION_OVERRIDE",
    "OWNER_REPORTED_PRIVATE_AGREEMENT", "重要紀錄不得無痕覆寫",
  ]) {
    assert.ok(text.includes(phrase), `missing substantive clause: ${phrase}`);
  }
});

test("source forbids time-based auto approval/payment, warranty deposits, and fixed progress counts", () => {
  const source = getSource();
  const serialized = JSON.stringify(source);

  assert.doesNotMatch(serialized, /48\s*(?:h|hr|hour|小時)/i);
  assert.doesNotMatch(serialized, /auto[-_ ]?(?:pay|approve)/i);
  assert.doesNotMatch(serialized, /保固(?:保證)?金.{0,12}(?:5%|百分之五)/);
  assert.equal(source.templates.WORKS.paymentProfiles.worksAmount.warrantyDeposit, "NONE");
  assert.equal(source.templates.WORKS.paymentProfiles.worksAmount.progressMilestoneCountFixed, false);
});
