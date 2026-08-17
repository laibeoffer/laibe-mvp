import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const require = createRequire(import.meta.url);
const sourcePath = new URL("../site/shared/laibe-project-contract-source.js", import.meta.url);
const enginePath = new URL("../site/shared/laibe-project-contract-engine.js", import.meta.url);
const htmlPath = new URL("../site/warranty_pledge/code.html", import.meta.url);
const source = require(fileURLToPath(sourcePath));
const engine = require(fileURLToPath(enginePath));
const html = readFileSync(htmlPath, "utf8");

function pageLogic() {
  const match = html.match(/<script id="warranty-pledge-page-logic">([\s\S]*?)<\/script>/);
  assert.ok(match, "warranty page must expose one bounded page-logic script");
  return match[1];
}

function loadConsumer() {
  const sandbox = {
    LaibeProjectContractSource: source,
    LaibeProjectContractEngine: engine,
    structuredClone,
    setTimeout,
    clearTimeout,
  };
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  vm.runInNewContext(pageLogic(), sandbox, { filename: "warranty-pledge-page-logic.js" });
  assert.ok(sandbox.LaibeWarrantyPledgeConsumer);
  return sandbox.LaibeWarrantyPledgeConsumer;
}

function mutable(value) {
  return JSON.parse(JSON.stringify(value));
}

function addExpectedReviewTruth(sample) {
  sample.context.contractType ??= "WORKS";
  sample.context.templateVersion ??= source.templateVersion;
  sample.context.status ??= "DRAFT";
  sample.context.warrantyTermsRef ??= { ...sample.pledge.warrantyTermsRef };
  sample.projectContract ??= {
    contractId: sample.context.projectContractId,
    caseId: sample.context.caseId,
    contractVersion: sample.context.contractVersion,
    ownerId: sample.context.ownerId,
    contractorId: sample.context.contractorId,
    contractType: sample.context.contractType,
    templateVersion: sample.context.templateVersion,
    status: sample.context.status,
  };
  return sample;
}

class TestClassList {
  constructor() { this.values = new Set(); }
  contains(value) { return this.values.has(value); }
  toggle(value, force) {
    const enabled = force === undefined ? !this.values.has(value) : Boolean(force);
    if (enabled) this.values.add(value); else this.values.delete(value);
    return enabled;
  }
}

class TestElement {
  constructor(id, tagName = "") {
    this.id = id;
    this.tagName = tagName;
    this.value = "";
    this.hidden = false;
    this.disabled = false;
    this.readOnly = false;
    this.textContent = "";
    this.listeners = {};
    this.attributes = {};
  }
  addEventListener(type, listener) { (this.listeners[type] ||= []).push(listener); }
  fire(type, overrides = {}) {
    if (this.disabled && ["input", "change", "keydown"].includes(type)) return;
    const event = { target: this, currentTarget: this, ...overrides };
    for (const listener of this.listeners[type] || []) listener(event);
  }
  keyboardSelect(value) {
    if (this.tagName !== "SELECT" || this.disabled) return;
    this.value = value;
    this.fire("input", { key: "ArrowDown" });
  }
  getAttribute(name) { return this.attributes[name] ?? null; }
  setAttribute(name, value) { this.attributes[name] = String(value); }
  scrollIntoView() {}
}

function createDomHarness() {
  const consumer = loadConsumer();
  const elements = new Map();
  for (const match of html.matchAll(/\bid="([^"]+)"/g)) elements.set(match[1], new TestElement(match[1]));
  const controls = [];
  for (const match of html.matchAll(/<(input|select|textarea)[^>]*\bid="([^"]+)"[^>]*\bdata-path="([^"]+)"/g)) {
    const control = elements.get(match[2]);
    control.tagName = match[1].toUpperCase();
    control.attributes["data-path"] = match[3];
    controls.push(control);
  }
  const document = {
    body: { classList: new TestClassList() },
    getElementById(id) { return elements.get(id); },
    querySelectorAll(selector) { return selector === "[data-path]" ? controls : []; },
  };
  const windowObject = { printCount: 0, print() { this.printCount += 1; } };
  consumer.bootstrap(document, windowObject);
  return { consumer, elements, windowObject };
}

test("page loads the canonical source, engine, then page logic and starts from a truthful missing state", () => {
  const sourceAt = html.indexOf("../shared/laibe-project-contract-source.js");
  const engineAt = html.indexOf("../shared/laibe-project-contract-engine.js");
  const pageAt = html.indexOf('id="warranty-pledge-page-logic"');
  assert.ok(sourceAt >= 0 && sourceAt < engineAt && engineAt < pageAt);
  assert.match(html, /目前缺少案件契約資料/);
  assert.match(html, /載入範例資料/);
  assert.match(html, /正式保存、雙方同意與簽署尚未開放/);
  assert.match(html, /不設保固金/);
  assert.doesNotMatch(html, /localStorage|sessionStorage|已同步|同步成功|已正式保存|已完成簽署/);
  assert.doesNotMatch(html, /金流託管|支付託管|代收代付|48\s*小時|自動付款|自動同意|低價競標/);
});

test("empty state never auto-loads fixture data or creates a pledge", () => {
  const consumer = loadConsumer();
  const state = consumer.createEmptyState();
  assert.equal(state.sampleFixture, false);
  assert.equal(state.context.caseId, "");
  assert.equal(state.pledge.status, "DRAFT");
  const evaluation = consumer.evaluateState(state);
  assert.equal(evaluation.status, "DATA_INSUFFICIENT");
  assert.ok(evaluation.missing.length > 0);
  assert.throws(() => consumer.createDraft(state), /WARRANTY_DRAFT_INVALID/);
});

test("explicit sample consumes the canonical warranty article and creates only an engine-validated DRAFT", () => {
  const consumer = loadConsumer();
  const sample = consumer.createSampleState();
  const canonicalArticle = source.templates.WORKS.articles.find((article) => article.articleId === "WORKS-13-WARRANTY");
  assert.equal(sample.sampleFixture, true);
  assert.equal(sample.canonicalArticle.articleId, canonicalArticle.articleId);
  assert.equal(sample.canonicalArticle.body, canonicalArticle.body);
  const draft = consumer.createDraft(sample);
  assert.equal(draft.kind, "WarrantyPledge");
  assert.equal(draft.status, "DRAFT");
  assert.equal(draft.caseId, sample.context.caseId);
  assert.equal(draft.projectContractId, sample.context.projectContractId);
  assert.equal(draft.contractVersion, sample.context.contractVersion);
  assert.equal(draft.ownerId, sample.context.ownerId);
  assert.equal(draft.contractorId, sample.context.contractorId);
  assert.equal(draft.warrantyDeposit, "NONE");
  assert.equal(draft.signingProof.status, "NOT_AVAILABLE");
  assert.equal(draft.ownerDecision.status, "NOT_AVAILABLE");
  assert.equal(draft.partyAgreement.status, "NOT_AVAILABLE");
  assert.equal(draft.formalVersion.status, "NOT_AVAILABLE");
});

test("all five pledge bindings fail closed when they diverge from the project contract context", () => {
  const consumer = loadConsumer();
  for (const field of ["caseId", "projectContractId", "contractVersion", "ownerId", "contractorId"]) {
    const sample = mutable(consumer.createSampleState());
    sample.pledge[field] = `OTHER-${field}`;
    assert.throws(
      () => consumer.createDraft(sample),
      /WARRANTY_PLEDGE_BINDING_MISMATCH/,
      field,
    );
  }
});

test("invalid identifiers, calendar dates, parties, and warranty record references fail closed", () => {
  const consumer = loadConsumer();

  const invalidContextId = mutable(consumer.createSampleState());
  invalidContextId.context.projectContractId = "bad id";
  assert.throws(() => consumer.createDraft(invalidContextId), /INVALID_IDENTIFIER/);

  const invalidPledgeId = mutable(consumer.createSampleState());
  invalidPledgeId.pledge.pledgeId = "";
  assert.throws(() => consumer.createDraft(invalidPledgeId), /WARRANTY_DRAFT_INVALID|MISSING_REQUIRED_FIELD/);

  const invalidDate = mutable(consumer.createSampleState());
  invalidDate.pledge.warrantyStartDate = "2026-02-30";
  assert.throws(() => consumer.createDraft(invalidDate), /INVALID_WARRANTY_DATE/);

  const wrongPartyRole = mutable(consumer.createSampleState());
  wrongPartyRole.parties.owner.role = "CONTRACTOR";
  assert.throws(() => consumer.createDraft(wrongPartyRole), /INVALID_ENUM_VALUE/);

  const sameParty = mutable(consumer.createSampleState());
  sameParty.parties.contractor.partyId = sameParty.parties.owner.partyId;
  sameParty.context.contractorId = sameParty.context.ownerId;
  sameParty.pledge.contractorId = sameParty.pledge.ownerId;
  assert.throws(() => consumer.createDraft(sameParty), /WARRANTY_PARTIES_MUST_BE_DISTINCT/);

  const invalidRecordRef = mutable(consumer.createSampleState());
  invalidRecordRef.pledge.warrantyTermsRef.version = "";
  assert.throws(() => consumer.createDraft(invalidRecordRef), /WARRANTY_DRAFT_INVALID|INVALID_WARRANTY_TERMS_REF/);
});

test("page logic uses safe text rendering and exposes honest decision gates and responsive print states", () => {
  const logic = pageLogic();
  assert.doesNotMatch(logic, /\.innerHTML\s*=|insertAdjacentHTML|document\.write/);
  assert.match(logic, /\.textContent\s*=/);
  assert.match(html, /id="ownerDecisionGate"/);
  assert.match(html, /id="partyAgreementGate"/);
  assert.match(html, /id="formalVersionGate"/);
  assert.match(html, /下一步由乙方/);
  assert.match(html, /@media \(max-width: 760px\)/);
  assert.match(html, /@media print/);
});

test("visible copy translates domain tokens without changing the canonical article identity", () => {
  const consumer = loadConsumer();
  const presentation = consumer.presentWarrantyArticle();
  assert.equal(presentation.articleId, "WORKS-13-WARRANTY");
  assert.doesNotMatch(presentation.body, /WARRANTY_OBLIGATION|WARRANTY_PLEDGE_SIGNED/);
  assert.match(presentation.body, /保固責任/);
  const visibleMarkup = html
    .replace(/<style>[\s\S]*?<\/style>/g, "")
    .replace(/<script[\s\S]*?<\/script>/g, "");
  assert.doesNotMatch(visibleMarkup, /consumer|DRAFT|DATA_INSUFFICIENT|WARRANTY_OBLIGATION|WARRANTY_PLEDGE_SIGNED/);
});

test("review rework: state holds an applicable contract type and the actual ProjectContract record", () => {
  const consumer = loadConsumer();
  const sample = consumer.createSampleState();
  assert.equal(sample.context.contractType, "WORKS");
  assert.equal(sample.projectContract.contractType, "WORKS");
  const draft = consumer.createDraft(sample);
  for (const [field, expected] of Object.entries({
    contractId: sample.context.projectContractId,
    caseId: sample.context.caseId,
    contractVersion: sample.context.contractVersion,
    ownerId: sample.context.ownerId,
    contractorId: sample.context.contractorId,
    contractType: sample.context.contractType,
    templateVersion: source.templateVersion,
    status: sample.context.status,
  })) assert.equal(draft.projectContract[field], expected, field);
  assert.equal(draft.projectContract.kind, "ProjectContract");
});

test("review rework: invalid and DESIGN contexts cannot generate an engineering warranty pledge", () => {
  const consumer = loadConsumer();
  for (const contractType of ["NOT_A_CONTRACT_TYPE", "DESIGN"]) {
    const sample = addExpectedReviewTruth(mutable(consumer.createSampleState()));
    sample.context.contractType = contractType;
    sample.projectContract.contractType = contractType;
    assert.throws(() => consumer.createDraft(sample), /WARRANTY_CONTRACT_TYPE_NOT_APPLICABLE/);
  }
});

test("review rework: every actual ProjectContract identity field is bound exactly", () => {
  const consumer = loadConsumer();
  const mutations = {
    contractId: "PC-OTHER",
    caseId: "CASE-OTHER",
    contractVersion: "CV-OTHER",
    ownerId: "OWNER-OTHER",
    contractorId: "CONTRACTOR-OTHER",
    contractType: "DESIGN_BUILD",
    templateVersion: "v9.9",
    status: "NOT_SIGNED",
  };
  for (const [field, value] of Object.entries(mutations)) {
    const sample = addExpectedReviewTruth(mutable(consumer.createSampleState()));
    sample.projectContract[field] = value;
    assert.throws(() => consumer.createDraft(sample), /WARRANTY_PROJECT_CONTRACT_BINDING_MISMATCH/, field);
  }
});

test("review rework: nested warranty terms reference must match the UI context exactly", () => {
  const consumer = loadConsumer();
  for (const field of ["documentId", "version"]) {
    const contextMismatch = addExpectedReviewTruth(mutable(consumer.createSampleState()));
    contextMismatch.context.warrantyTermsRef[field] = `OTHER-${field}`;
    assert.throws(() => consumer.createDraft(contextMismatch), /WARRANTY_TERMS_BINDING_MISMATCH/, `context ${field}`);

    const pledgeMismatch = addExpectedReviewTruth(mutable(consumer.createSampleState()));
    pledgeMismatch.pledge.warrantyTermsRef[field] = `OTHER-${field}`;
    assert.throws(() => consumer.createDraft(pledgeMismatch), /WARRANTY_TERMS_BINDING_MISMATCH/, `pledge ${field}`);
  }
});

test("review rework: changing contract context or warranty reference clears stale preview and print", () => {
  const { elements } = createDomHarness();
  assert.ok(elements.get("contractType"), "contract type must be an explicit UI control");
  elements.get("loadSampleBtn").fire("click");
  elements.get("createDraftBtn").fire("click");
  assert.equal(elements.get("printDraftBtn").disabled, false);
  assert.equal(elements.get("draftBody").hidden, false);

  elements.get("contractType").value = "DESIGN_BUILD";
  elements.get("contractType").fire("input");
  assert.equal(elements.get("printDraftBtn").disabled, true);
  assert.equal(elements.get("draftBody").hidden, true);

  elements.get("createDraftBtn").fire("click");
  assert.equal(elements.get("printDraftBtn").disabled, false);
  elements.get("warrantyDocumentVersion").value = "WT-v2";
  elements.get("warrantyDocumentVersion").fire("input");
  assert.equal(elements.get("printDraftBtn").disabled, true);
  assert.equal(elements.get("draftBody").hidden, true);
});

test("second rereview: view mode disables select keyboard changes and restores edit semantics", () => {
  const { elements } = createDomHarness();
  const mode = elements.get("modeBtn");
  const contractType = elements.get("contractType");
  const caseId = elements.get("caseId");
  const scope = elements.get("warrantyScope");

  assert.equal(contractType.tagName, "SELECT");
  assert.equal(caseId.tagName, "INPUT");
  assert.equal(scope.tagName, "TEXTAREA");
  elements.get("loadSampleBtn").fire("click");
  elements.get("createDraftBtn").fire("click");
  assert.equal(elements.get("printDraftBtn").disabled, false);

  mode.fire("click");
  assert.equal(contractType.disabled, true);
  assert.equal(contractType.getAttribute("aria-disabled"), "true");
  assert.equal(caseId.disabled, false);
  assert.equal(caseId.readOnly, true);
  assert.equal(caseId.getAttribute("aria-readonly"), "true");
  assert.equal(scope.disabled, false);
  assert.equal(scope.readOnly, true);
  assert.equal(scope.getAttribute("aria-readonly"), "true");

  const selectedBeforeKeyboard = contractType.value;
  contractType.keyboardSelect("DESIGN_BUILD");
  assert.equal(contractType.value, selectedBeforeKeyboard);
  assert.equal(elements.get("printDraftBtn").disabled, false, "blocked select input must not invalidate the assembled draft");

  mode.fire("click");
  assert.equal(contractType.disabled, false);
  assert.equal(contractType.getAttribute("aria-disabled"), "false");
  assert.equal(caseId.readOnly, false);
  assert.equal(caseId.getAttribute("aria-readonly"), "false");
  assert.equal(scope.readOnly, false);
  contractType.keyboardSelect("DESIGN_BUILD");
  assert.equal(contractType.value, "DESIGN_BUILD");
  assert.equal(elements.get("printDraftBtn").disabled, true, "enabled select input must invalidate the stale draft");

  elements.get("createDraftBtn").fire("click");
  assert.equal(elements.get("printDraftBtn").disabled, false);
  assert.equal(elements.get("previewContractType").textContent, "設計統包契約的工程部分");
});

test("browser micro-fix: mobile warranty buttons meet the 44px touch target without changing desktop", () => {
  const baseButton = html.match(/\.btn\s*\{[^}]*min-height:\s*(\d+)px/);
  assert.ok(baseButton);
  assert.equal(Number(baseButton[1]), 42, "desktop button sizing remains unchanged");

  const mobileStart = html.indexOf("@media (max-width: 760px)");
  const printStart = html.indexOf("@media print", mobileStart);
  assert.ok(mobileStart >= 0 && printStart > mobileStart);
  const mobileCss = html.slice(mobileStart, printStart);
  assert.match(mobileCss, /\.btn\s*\{\s*min-height:\s*44px;\s*\}/);
  assert.match(html.slice(printStart), /\.topbar[^}]*display:\s*none\s*!important/);
});
