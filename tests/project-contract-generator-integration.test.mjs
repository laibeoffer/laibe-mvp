import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const sourcePath = new URL("../site/shared/laibe-project-contract-source.js", import.meta.url);
const enginePath = new URL("../site/shared/laibe-project-contract-engine.js", import.meta.url);
const appPath = new URL("../site/pcm_contract_generator/app.js", import.meta.url);
const htmlPath = new URL("../site/pcm_contract_generator/code.html", import.meta.url);

const source = require(fileURLToPath(sourcePath));
const engine = require(fileURLToPath(enginePath));
const generator = require(fileURLToPath(appPath));
const appCode = readFileSync(appPath, "utf8");
const html = readFileSync(htmlPath, "utf8");

class TestElement {
  constructor(id) {
    this.id = id;
    this.value = "";
    this.hidden = false;
    this.disabled = false;
    this.className = "";
    this.dataset = {};
    this.listeners = {};
    this.attributes = {};
    this._innerHTML = "";
    this._textContent = "";
  }

  get innerHTML() { return this._innerHTML; }
  set innerHTML(value) { this._innerHTML = String(value); this._textContent = ""; }
  get textContent() { return this._textContent; }
  set textContent(value) { this._textContent = String(value); this._innerHTML = ""; }
  addEventListener(type, listener) { (this.listeners[type] ||= []).push(listener); }
  fire(type, overrides = {}) {
    const event = { target: this, currentTarget: this, ...overrides };
    for (const listener of this.listeners[type] || []) listener(event);
  }
  getAttribute(name) { return Object.hasOwn(this.attributes, name) ? this.attributes[name] : null; }
  setAttribute(name, value) { this.attributes[name] = String(value); }
  querySelectorAll() { return []; }
  querySelector() { return null; }
  closest() { return null; }
  focus() {}
}

function createDomHarness() {
  const elements = new Map();
  for (const match of html.matchAll(/\bid="([^"]+)"/g)) elements.set(match[1], new TestElement(match[1]));
  const dataControls = [];
  for (const match of html.matchAll(/<(?:input|select|textarea)[^>]*\bid="([^"]+)"[^>]*\bdata-path="([^"]+)"/g)) {
    const control = elements.get(match[1]);
    control.attributes["data-path"] = match[2];
    dataControls.push(control);
  }
  elements.get("contractType").value = "DESIGN";
  elements.get("expandPaymentsBtn").attributes["aria-expanded"] = "true";
  elements.get("expandArticlesBtn").attributes["aria-expanded"] = "true";
  const document = {
    getElementById(id) { return elements.get(id); },
    querySelectorAll(selector) { return selector === "[data-path]" ? dataControls : []; },
  };
  const windowObject = { requestAnimationFrame(callback) { callback(); }, print() {} };
  generator.bootstrap(document, windowObject);
  return { elements };
}

function prepareRenderedDraft(harness, contractType = "WORKS") {
  const type = harness.elements.get("contractType");
  type.value = contractType;
  type.fire("change");
  harness.elements.get("loadSampleBtn").fire("click");
  harness.elements.get("assembleBtn").fire("click");
  assert.match(harness.elements.get("articleContent").innerHTML, /<details>/);
  assert.doesNotMatch(harness.elements.get("draftPreview").textContent, /尚未產生草稿/);
  assert.equal(harness.elements.get("printDraftBtn").disabled, false);
}

function assertDraftInvalidated(harness) {
  assert.equal(harness.elements.get("articleContent").className, "empty");
  assert.match(harness.elements.get("articleContent").textContent, /產生草稿後/);
  assert.match(harness.elements.get("draftPreview").textContent, /尚未產生草稿/);
  assert.equal(harness.elements.get("printDraftBtn").disabled, true);
}

test("generator is a pure Node and browser consumer of the accepted source and engine", () => {
  assert.equal(generator.engine, engine);
  assert.equal(generator.source, source);
  assert.equal(generator.source, generator.engine.source);
  assert.equal(globalThis.LaibeProjectContractGenerator, generator);
  for (const method of [
    "createEmptyState", "createSampleState", "evaluateState", "assembleDraft",
    "addWorkRow", "removeWorkRow", "addDesignRow", "updateDesignRow", "removeDesignRow",
  ]) assert.equal(typeof generator[method], "function", method);
});

test("empty state is canonical, insufficient, and never auto-loads sample data", () => {
  const state = generator.createEmptyState();
  assert.equal(state.contractType, "DESIGN");
  assert.equal(state.sampleFixture, false);
  assert.deepEqual(Object.keys(state).sort(), [
    "case", "constructionSchedule", "contractType", "contractor", "designChanges",
    "designSchedule", "owner", "quotation", "sampleFixture", "values", "warrantyTerms",
    "worksChanges",
  ].sort());
  assert.equal(state.quotation.items.length, 0);
  assert.equal(state.constructionSchedule.nodes.length, 0);
  const evaluation = generator.evaluateState(state);
  assert.equal(evaluation.status, "DATA_INSUFFICIENT");
  assert.ok(evaluation.missing.length > 0);
  assert.equal(evaluation.assembled, null);
});

test("sample loading is explicit and all three contract types use engine calculations and assembly", () => {
  for (const contractType of ["DESIGN", "WORKS", "DESIGN_BUILD"]) {
    const state = generator.createSampleState(contractType);
    assert.equal(state.sampleFixture, true);
    assert.equal(state.contractType, contractType);
    const evaluation = generator.evaluateState(state);

    if (contractType !== "WORKS") {
      assert.deepEqual(evaluation.designPayments.stages.map((stage) => stage.rate), [20, 10, 30, 40]);
      assert.equal(evaluation.designPayments.stages[2].trigger, "第一次細部施工圖＋報價單交付");
    }
    if (contractType !== "DESIGN") {
      assert.equal(evaluation.worksPlan.ok, true);
      assert.equal(evaluation.worksPlan.totals.signingRate, 5);
      assert.equal(evaluation.worksPlan.totals.progressRate, 80);
      assert.equal(evaluation.worksPlan.totals.finalRate, 15);
      assert.ok(evaluation.worksPlan.milestones.every((milestone) => milestone.paymentRate <= 10));
    }

    const draft = generator.assembleDraft(state);
    assert.equal(draft.contractType, contractType);
    assert.equal(draft.status, "DRAFT");
    assert.equal(draft.commonAppendix.ref, source.commonProcedureAppendix.appendixId);
    assert.deepEqual(
      draft.articles.map((article) => article.articleId),
      source.templates[contractType].articles.map((article) => article.articleId),
    );
  }
});

test("work rows preserve quotation, schedule, semantic, date, drawing, evidence and hold-point truth", () => {
  const state = generator.createEmptyState("WORKS");
  const added = generator.addWorkRow(state, {
    itemName: "防水層施作",
    workValue: "100000.00",
    scheduleSemantic: "WATERPROOFING_APPLICATION",
    startAt: "2026-09-01",
    dueAt: "2026-09-03",
    drawingRef: { drawingId: "DWG-WP-01", version: "REV-07", sheetId: "A-501" },
    evidenceBasis: "EVIDENCE-WP-01",
    holdPoint: true,
  });
  assert.equal(added.quotation.items.length, 1);
  assert.equal(added.constructionSchedule.nodes.length, 1);
  assert.equal(added.quotation.items[0].amount, "100000.00");
  assert.equal(added.constructionSchedule.nodes[0].scheduleSemantic, "WATERPROOFING_APPLICATION");
  assert.deepEqual(added.constructionSchedule.nodes[0].drawingRefs[0], {
    drawingId: "DWG-WP-01", version: "REV-07", sheetId: "A-501",
  });
  assert.equal(added.constructionSchedule.nodes[0].requiredEvidence[0].basisRef, "EVIDENCE-WP-01");
  assert.equal(added.constructionSchedule.nodes[0].holdPoint, true);
  const removed = generator.removeWorkRow(added, added.quotation.items[0].itemId);
  assert.equal(removed.quotation.items.length, 0);
  assert.equal(removed.constructionSchedule.nodes.length, 0);
});

test("drawing references preserve explicit id, version, and sheet through pure API and UI edits", () => {
  const sample = generator.createSampleState("WORKS");
  const firstItemId = sample.quotation.items[0].itemId;
  const changed = generator.updateWorkRow(sample, firstItemId, {
    drawingId: "DRAWING-ACTUAL-09", drawingVersion: "REV-09", drawingSheetId: "A-909",
  });
  assert.deepEqual(changed.constructionSchedule.nodes[0].drawingRefs, [{
    drawingId: "DRAWING-ACTUAL-09", version: "REV-09", sheetId: "A-909",
  }]);
  const incomplete = generator.updateWorkRow(changed, firstItemId, { drawingVersion: "" });
  const evaluation = generator.evaluateState(incomplete);
  assert.equal(evaluation.status, "PROCEDURAL_INCOMPLETE");
  assert.ok(evaluation.issues.some((issue) => /圖說.*版本.*圖號/.test(issue)));

  const harness = createDomHarness();
  const type = harness.elements.get("contractType");
  type.value = "WORKS";
  type.fire("change");
  harness.elements.get("loadSampleBtn").fire("click");
  assert.match(harness.elements.get("workRows").innerHTML, /data-work-field="drawingId"/);
  assert.match(harness.elements.get("workRows").innerHTML, /data-work-field="drawingVersion"/);
  assert.match(harness.elements.get("workRows").innerHTML, /data-work-field="drawingSheetId"/);
  const row = { getAttribute() { return "ITEM-1"; } };
  const target = {
    type: "text", value: "",
    getAttribute(name) { return name === "data-work-field" ? "drawingVersion" : null; },
    closest() { return row; },
  };
  harness.elements.get("workRows").fire("input", { target });
  harness.elements.get("assembleBtn").fire("click");
  assert.equal(harness.elements.get("errorState").hidden, false);
  assert.equal(harness.elements.get("printDraftBtn").disabled, true);
});

test("design schedule consumes explicit user nodes, preserves document refs, and keeps empty nodes incomplete", () => {
  const state = generator.createSampleState("DESIGN");
  const explicitNodes = [{
    nodeId: "OWNER-DESIGN-NODE-09",
    name: "業主指定細部圖交付",
    startAt: "2026-09-18T08:00:00+08:00",
    dueAt: "2026-09-20T18:00:00+08:00",
    deliverableRefs: [{ documentId: "OWNER-DESIGN-DOC-09", version: "REV-C" }],
  }];
  state.designSchedule.nodes = structuredClone(explicitNodes);
  const draft = generator.assembleDraft(state);
  assert.equal(draft.status, "DRAFT");
  assert.deepEqual(draft.structuredContract.truthBindings.design.schedule.nodes, explicitNodes);

  state.designSchedule.nodes = [];
  const evaluation = generator.evaluateState(state);
  assert.equal(evaluation.status, "DATA_INSUFFICIENT");
  assert.ok(evaluation.missing.includes("設計交付節點"));
  const incompleteDraft = generator.assembleDraft(state);
  assert.equal(incompleteDraft.status, "PROCEDURAL_INCOMPLETE");
  assert.ok(incompleteDraft.unresolvedBindings.includes("designSchedule"));
});

test("non-sample users can add, edit, and remove canonical design deliverable rows", () => {
  let state = generator.createEmptyState("DESIGN");
  state = generator.addDesignRow(state, {
    nodeId: "DESIGN-NODE-USER-1", name: "第一次細部施工圖與報價單交付",
    startAt: "2026-09-18", dueAt: "2026-09-20",
    documentId: "DESIGN-DOC-USER-1", documentVersion: "REV-A",
  });
  assert.deepEqual(state.designSchedule.nodes[0], {
    nodeId: "DESIGN-NODE-USER-1", name: "第一次細部施工圖與報價單交付",
    startAt: "2026-09-18T08:00:00+08:00", dueAt: "2026-09-20T18:00:00+08:00",
    deliverableRefs: [{ documentId: "DESIGN-DOC-USER-1", version: "REV-A" }],
  });
  state = generator.updateDesignRow(state, 0, { documentVersion: "REV-B" });
  assert.equal(state.designSchedule.nodes[0].deliverableRefs[0].version, "REV-B");
  state = generator.removeDesignRow(state, 0);
  assert.equal(state.designSchedule.nodes.length, 0);

  assert.match(html, /id="addDesignRowBtn"/);
  assert.match(html, /id="designRows"/);
  const harness = createDomHarness();
  harness.elements.get("loadSampleBtn").fire("click");
  assert.match(harness.elements.get("designRows").innerHTML, /data-design-field="documentVersion"/);
  const row = { getAttribute() { return "0"; } };
  const target = {
    type: "text", value: "",
    getAttribute(name) { return name === "data-design-field" ? "documentVersion" : null; },
    closest() { return row; },
  };
  harness.elements.get("designRows").fire("input", { target });
  harness.elements.get("assembleBtn").fire("click");
  assert.equal(harness.elements.get("errorState").hidden, false);
  assert.equal(harness.elements.get("printDraftBtn").disabled, true);
});

test("WORKS and DESIGN_BUILD require a user-editable warranty terms version before assembly readiness", () => {
  for (const contractType of ["WORKS", "DESIGN_BUILD"]) {
    const state = generator.createSampleState(contractType);
    state.warrantyTerms.version = "";
    const evaluation = generator.evaluateState(state);
    assert.equal(evaluation.status, "DATA_INSUFFICIENT");
    assert.ok(evaluation.missing.includes("保固條款文件版本"));
    const draft = generator.assembleDraft(state);
    assert.equal(draft.status, "PROCEDURAL_INCOMPLETE");
    assert.ok(draft.unresolvedBindings.includes("warrantyTerms"));
  }
  assert.match(html, /id="warrantyVersion"[^>]*data-path="warrantyTerms\.version"/);
});

test("every field and work-row mutation immediately clears rendered draft truth and printing", () => {
  {
    const harness = createDomHarness();
    prepareRenderedDraft(harness);
    const field = harness.elements.get("caseId");
    field.value = "CHANGED-CASE";
    field.fire("input");
    assertDraftInvalidated(harness);
  }
  {
    const harness = createDomHarness();
    prepareRenderedDraft(harness);
    harness.elements.get("loadSampleBtn").fire("click");
    assertDraftInvalidated(harness);
  }
  {
    const harness = createDomHarness();
    prepareRenderedDraft(harness);
    const type = harness.elements.get("contractType");
    type.value = "DESIGN";
    type.fire("change");
    assertDraftInvalidated(harness);
  }
  {
    const harness = createDomHarness();
    prepareRenderedDraft(harness);
    harness.elements.get("addWorkRowBtn").fire("click");
    assertDraftInvalidated(harness);
  }
  {
    const harness = createDomHarness();
    prepareRenderedDraft(harness);
    const row = { getAttribute() { return "ITEM-1"; } };
    const target = {
      type: "text", value: "120000.00",
      getAttribute(name) { return name === "data-work-field" ? "workValue" : null; },
      closest() { return row; },
    };
    harness.elements.get("workRows").fire("input", { target });
    assertDraftInvalidated(harness);
  }
  {
    const harness = createDomHarness();
    prepareRenderedDraft(harness);
    const row = { getAttribute() { return "ITEM-1"; } };
    const button = { closest() { return row; } };
    const target = { closest(selector) { return selector === "[data-remove-row]" ? button : null; } };
    harness.elements.get("workRows").fire("click", { target });
    assertDraftInvalidated(harness);
  }
});

test("HTML exposes an understandable bilateral assembly journey and canonical loading order", () => {
  assert.match(html, /設計及工程甲乙主契約|設計甲乙主契約|工程甲乙主契約/);
  assert.match(html, /目前狀態/);
  assert.match(html, /下一步/);
  assert.match(html, /資料不足/);
  assert.match(html, /正式建立版本與簽署入口尚未開放/);
  assert.match(html, /草稿預覽，尚未完成正式保存或簽署/);
  for (const id of [
    "contractType", "loadSampleBtn", "assembleBtn", "caseForm", "ownerForm", "contractorForm",
    "addWorkRowBtn", "workRows", "paymentPanel", "articlePanel", "draftPreview", "printDraftBtn",
    "permissionState", "loadingState", "errorState",
  ]) assert.match(html, new RegExp(`id=["']${id}["']`), id);
  const sourceIndex = html.indexOf("../shared/laibe-project-contract-source.js");
  const engineIndex = html.indexOf("../shared/laibe-project-contract-engine.js");
  const appIndex = html.indexOf("app.js");
  assert.ok(sourceIndex >= 0 && sourceIndex < engineIndex && engineIndex < appIndex);
  assert.match(html, /@media \(max-width:/);
  assert.match(html, /prefers-reduced-motion/);
  assert.match(html, /@media print/);
});

test("consumer contains no legacy scenario truth, duplicated policy, fake signing, or forbidden product semantics", () => {
  assert.doesNotMatch(appCode, /\bTOTAL\s*=|\bSCENARIOS\b|seedMilestones|laibePcmContract:|AUTO_(?:PAYMENT|APPROVE)/);
  assert.doesNotMatch(appCode, /48\s*h|fake/i);
  assert.doesNotMatch(appCode, /20\s*\/\s*10\s*\/\s*30\s*\/\s*40|signingRate\s*:\s*5|progressPoolRate\s*:\s*80|finalRate\s*:\s*15/);
  assert.doesNotMatch(`${html}\n${appCode}`, /AI\s*PCM|三方簽署|招標|投標|競標|金流託管|保固保證金|warranty deposit/i);
  assert.doesNotMatch(appCode, /createSignedSnapshot|createContractVersion|createPartyAgreement|createOwnerDecision|localStorage\.setItem/);
});
