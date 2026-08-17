(function exposeGenerator(root, factory) {
  "use strict";

  var isCommonJs = typeof module === "object" && module.exports;
  var contractEngine = isCommonJs
    ? require("../shared/laibe-project-contract-engine.js")
    : root.LaibeProjectContractEngine;
  var generator = factory(contractEngine);

  root.LaibeProjectContractGenerator = generator;
  if (isCommonJs) module.exports = generator;
  if (!isCommonJs && root.document) generator.bootstrap(root.document, root);
})(typeof globalThis !== "undefined" ? globalThis : this, function createGenerator(engine) {
  "use strict";

  if (!engine || !engine.source || typeof engine.assembleContract !== "function") {
    throw new Error("CANONICAL_CONTRACT_ENGINE_REQUIRED");
  }

  var source = engine.source;
  var TITLES = {
    DESIGN: "設計甲乙主契約草稿組裝",
    WORKS: "工程甲乙主契約草稿組裝",
    DESIGN_BUILD: "設計及工程甲乙主契約草稿組裝",
  };
  var ISSUE_COPY = {
    MISSING_CONSTRUCTION_SCHEDULE: "請新增施工節點，並填寫施工進度表識別與版本。",
    MISSING_QUOTATION: "請填寫報價單識別、版本與工項金額。",
    MISSING_QUOTATION_REFS: "施工節點尚未連結報價工項。",
    INVALID_QUOTATION_REF: "報價工項的識別或金額不完整。",
    INVALID_DRAWING_REF: "圖說依據不完整，請補齊圖說識別、版本與圖號。",
    EVIDENCE_BASIS_REQUIRED: "請說明這個節點要依據哪一項佐證。",
    PROGRESS_NODE_EXCEEDS_MAX_RATE_REQUIRES_SEMANTIC_CHILD_NODES: "這個施工節點占比過高，請依實際工序拆成更細的施工節點。",
    QUOTATION_TOTAL_MISMATCH: "工程總價與報價工項合計不同，請核對金額。",
    PROJECT_TOTAL_AMOUNT_MUST_BE_POSITIVE: "請填寫大於零的工程總價。",
    MISSING_CASE_ID: "請填寫案件識別。",
  };

  function copy(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function hasValue(value) {
    return value !== undefined && value !== null && String(value).trim() !== "";
  }

  function canonicalType(value) {
    var type = value || "DESIGN";
    return engine.normalizeContractType(type);
  }

  function createEmptyState(contractType) {
    return {
      contractType: canonicalType(contractType),
      case: { caseId: "", projectContractId: "", contractVersion: "", projectName: "", projectAddress: "" },
      owner: { partyId: "", legalName: "", phone: "", email: "", address: "" },
      contractor: { partyId: "", legalName: "", representative: "", phone: "", email: "", address: "" },
      values: { designFee: "", worksAmount: "", designArea: "", designScope: "" },
      designSchedule: { scheduleId: "", version: "", nodes: [] },
      quotation: { quotationId: "", version: "", total: "", items: [] },
      constructionSchedule: { scheduleId: "", version: "", nodes: [] },
      designChanges: [],
      worksChanges: [],
      warrantyTerms: { documentId: "", version: "" },
      sampleFixture: false,
    };
  }

  function parseCents(value) {
    var text = String(value === undefined ? "" : value).replace(/,/g, "").trim();
    if (!/^\d+(?:\.\d{1,2})?$/.test(text)) return null;
    var parts = text.split(".");
    return BigInt(parts[0]) * 100n + BigInt((parts[1] || "").padEnd(2, "0"));
  }

  function centsToMoney(cents) {
    return String(cents / 100n) + "." + String(cents % 100n).padStart(2, "0");
  }

  function totalQuotation(items) {
    var cents = 0n;
    for (var index = 0; index < items.length; index += 1) {
      var amount = parseCents(items[index].amount);
      if (amount === null) return "";
      cents += amount;
    }
    return centsToMoney(cents);
  }

  function asStart(value) {
    if (!hasValue(value)) return "";
    return String(value).indexOf("T") >= 0 ? String(value) : String(value) + "T08:00:00+08:00";
  }

  function asDue(value) {
    if (!hasValue(value)) return "";
    return String(value).indexOf("T") >= 0 ? String(value) : String(value) + "T18:00:00+08:00";
  }

  function dateOnly(value) {
    return hasValue(value) ? String(value).slice(0, 10) : "";
  }

  function nextRowNumber(state) {
    var used = new Set(state.quotation.items.map(function itemNumber(item) { return item.itemId; }));
    var number = 1;
    while (used.has("ITEM-" + number)) number += 1;
    return number;
  }

  function addWorkRow(inputState, values) {
    var state = copy(inputState);
    var row = values || {};
    var number = nextRowNumber(state);
    var itemId = "ITEM-" + number;
    var nodeId = "NODE-" + number;
    var itemName = row.itemName || "";
    var workValue = row.workValue || "";
    var drawing = row.drawingRef || {};
    var drawingId = row.drawingId !== undefined ? row.drawingId : (drawing.drawingId || "");
    var drawingVersion = row.drawingVersion !== undefined ? row.drawingVersion : (drawing.version || "");
    var drawingSheetId = row.drawingSheetId !== undefined ? row.drawingSheetId : (drawing.sheetId || "");
    var evidenceBasis = row.evidenceBasis || "";
    var quotationId = state.quotation.quotationId || "QUOTATION-PENDING";
    var quotationVersion = state.quotation.version || "PREVIEW";

    state.quotation.items.push({ itemId: itemId, name: itemName, amount: workValue });
    state.constructionSchedule.nodes.push({
      nodeId: nodeId,
      name: itemName,
      scheduleSemantic: row.scheduleSemantic || "",
      startAt: asStart(row.startAt),
      dueAt: asDue(row.dueAt),
      workItems: [{ workItemId: itemId }],
      quotationRefs: [{ quotationId: quotationId, version: quotationVersion, itemId: itemId, allocation: workValue }],
      drawingRefs: drawingId || drawingVersion || drawingSheetId
        ? [{ drawingId: drawingId, version: drawingVersion, sheetId: drawingSheetId }]
        : [],
      workValue: workValue,
      requiredEvidence: evidenceBasis ? [{ evidenceType: "DOCUMENT_OR_PHOTO", basisRef: evidenceBasis }] : [],
      holdPoint: row.holdPoint === true,
    });
    state.quotation.total = totalQuotation(state.quotation.items);
    return state;
  }

  function updateWorkRow(inputState, itemId, changes) {
    var state = copy(inputState);
    var item = state.quotation.items.filter(function sameItem(candidate) { return candidate.itemId === itemId; })[0];
    var node = state.constructionSchedule.nodes.filter(function sameNode(candidate) {
      return candidate.quotationRefs.some(function sameReference(reference) { return reference.itemId === itemId; });
    })[0];
    if (!item || !node) return state;
    var patch = changes || {};
    if (Object.prototype.hasOwnProperty.call(patch, "itemName")) {
      item.name = patch.itemName;
      node.name = patch.itemName;
    }
    if (Object.prototype.hasOwnProperty.call(patch, "workValue")) {
      item.amount = patch.workValue;
      node.workValue = patch.workValue;
      node.quotationRefs[0].allocation = patch.workValue;
    }
    if (Object.prototype.hasOwnProperty.call(patch, "scheduleSemantic")) node.scheduleSemantic = patch.scheduleSemantic;
    if (Object.prototype.hasOwnProperty.call(patch, "startAt")) node.startAt = asStart(patch.startAt);
    if (Object.prototype.hasOwnProperty.call(patch, "dueAt")) node.dueAt = asDue(patch.dueAt);
    if (["drawingId", "drawingVersion", "drawingSheetId"].some(function hasDrawingChange(field) {
      return Object.prototype.hasOwnProperty.call(patch, field);
    })) {
      var drawing = node.drawingRefs[0] || { drawingId: "", version: "", sheetId: "" };
      if (Object.prototype.hasOwnProperty.call(patch, "drawingId")) drawing.drawingId = patch.drawingId;
      if (Object.prototype.hasOwnProperty.call(patch, "drawingVersion")) drawing.version = patch.drawingVersion;
      if (Object.prototype.hasOwnProperty.call(patch, "drawingSheetId")) drawing.sheetId = patch.drawingSheetId;
      node.drawingRefs = drawing.drawingId || drawing.version || drawing.sheetId ? [drawing] : [];
    }
    if (Object.prototype.hasOwnProperty.call(patch, "evidenceBasis")) {
      node.requiredEvidence = patch.evidenceBasis ? [{ evidenceType: "DOCUMENT_OR_PHOTO", basisRef: patch.evidenceBasis }] : [];
    }
    if (Object.prototype.hasOwnProperty.call(patch, "holdPoint")) node.holdPoint = patch.holdPoint === true;
    state.quotation.total = totalQuotation(state.quotation.items);
    return state;
  }

  function removeWorkRow(inputState, itemId) {
    var state = copy(inputState);
    state.quotation.items = state.quotation.items.filter(function keepItem(item) { return item.itemId !== itemId; });
    state.constructionSchedule.nodes = state.constructionSchedule.nodes.filter(function keepNode(node) {
      return !node.quotationRefs.some(function sameReference(reference) { return reference.itemId === itemId; });
    });
    state.quotation.total = totalQuotation(state.quotation.items);
    return state;
  }

  function addDesignRow(inputState, values) {
    var state = copy(inputState);
    var row = values || {};
    var node = {
      nodeId: row.nodeId || "",
      name: row.name || "",
      dueAt: asDue(row.dueAt),
      deliverableRefs: row.documentId || row.documentVersion
        ? [{ documentId: row.documentId || "", version: row.documentVersion || "" }]
        : [],
    };
    if (hasValue(row.startAt)) node.startAt = asStart(row.startAt);
    state.designSchedule.nodes.push(node);
    return state;
  }

  function updateDesignRow(inputState, index, changes) {
    var state = copy(inputState);
    var node = state.designSchedule.nodes[index];
    if (!node) return state;
    var patch = changes || {};
    if (Object.prototype.hasOwnProperty.call(patch, "nodeId")) node.nodeId = patch.nodeId;
    if (Object.prototype.hasOwnProperty.call(patch, "name")) node.name = patch.name;
    if (Object.prototype.hasOwnProperty.call(patch, "startAt")) {
      if (hasValue(patch.startAt)) node.startAt = asStart(patch.startAt); else delete node.startAt;
    }
    if (Object.prototype.hasOwnProperty.call(patch, "dueAt")) node.dueAt = asDue(patch.dueAt);
    if (Object.prototype.hasOwnProperty.call(patch, "documentId") ||
        Object.prototype.hasOwnProperty.call(patch, "documentVersion")) {
      var documentRef = node.deliverableRefs[0] || { documentId: "", version: "" };
      if (Object.prototype.hasOwnProperty.call(patch, "documentId")) documentRef.documentId = patch.documentId;
      if (Object.prototype.hasOwnProperty.call(patch, "documentVersion")) documentRef.version = patch.documentVersion;
      node.deliverableRefs = documentRef.documentId || documentRef.version ? [documentRef] : [];
    }
    return state;
  }

  function removeDesignRow(inputState, index) {
    var state = copy(inputState);
    state.designSchedule.nodes.splice(index, 1);
    return state;
  }

  function syncWorkTruth(inputState) {
    var state = copy(inputState);
    var itemMap = {};
    state.quotation.items.forEach(function mapItem(item) { itemMap[item.itemId] = item; });
    state.constructionSchedule.nodes.forEach(function syncNode(node) {
      node.quotationRefs.forEach(function syncReference(reference) {
        var item = itemMap[reference.itemId];
        reference.quotationId = state.quotation.quotationId;
        reference.version = state.quotation.version;
        if (item) {
          reference.allocation = item.amount;
          node.workValue = item.amount;
        }
      });
    });
    state.quotation.total = totalQuotation(state.quotation.items);
    return state;
  }

  function buildDesignSchedule(state) {
    var schedule = copy(state.designSchedule);
    schedule.DESIGN_DELIVERABLE_SCHEDULE = schedule.scheduleId && schedule.version
      ? schedule.scheduleId + "@" + schedule.version
      : "";
    return schedule;
  }

  function workBounds(state) {
    var nodes = state.constructionSchedule.nodes;
    if (!nodes.length) return { startAt: "", endAt: "" };
    var starts = nodes.map(function start(node) { return node.startAt; }).filter(hasValue).sort();
    var dues = nodes.map(function due(node) { return node.dueAt; }).filter(hasValue).sort();
    return { startAt: starts[0] || "", endAt: dues[dues.length - 1] || "" };
  }

  function buildValues(state) {
    var bounds = workBounds(state);
    var values = {
      CASE_ID: state.case.caseId,
      PROJECT_CONTRACT_ID: state.case.projectContractId,
      PROJECT_CONTRACT_TYPE: state.contractType,
      PROJECT_CONTRACT_VERSION: state.case.contractVersion,
      OWNER_ID: state.owner.partyId,
      OWNER_LEGAL_NAME: state.owner.legalName,
      OWNER_PHONE: state.owner.phone,
      OWNER_EMAIL: state.owner.email,
      OWNER_ADDRESS: state.owner.address,
      CONTRACTOR_ID: state.contractor.partyId,
      CONTRACTOR_LEGAL_NAME: state.contractor.legalName,
      CONTRACTOR_REPRESENTATIVE: state.contractor.representative,
      CONTRACTOR_PHONE: state.contractor.phone,
      CONTRACTOR_EMAIL: state.contractor.email,
      CONTRACTOR_ADDRESS: state.contractor.address,
      PROJECT_NAME: state.case.projectName,
      PROJECT_ADDRESS: state.case.projectAddress,
    };
    if (state.contractType !== "WORKS") {
      values.DESIGN_AREA = state.values.designArea;
      values.DESIGN_SCOPE = state.values.designScope;
      values.DESIGN_DELIVERABLE_SCHEDULE = state.designSchedule.scheduleId + "@" + state.designSchedule.version;
      values.TOTAL_DESIGN_FEE = state.values.designFee;
    }
    if (state.contractType !== "DESIGN") {
      values.PROJECT_TOTAL_AMOUNT = state.values.worksAmount;
      values.PROJECT_START_AT = bounds.startAt;
      values.PROJECT_END_AT = bounds.endAt;
      values.CONSTRUCTION_SCHEDULE_ID = state.constructionSchedule.scheduleId;
      values.CONSTRUCTION_SCHEDULE_VERSION = state.constructionSchedule.version;
    }
    return values;
  }

  function presentValues(state) {
    var values = buildValues(state);
    var result = {};
    Object.keys(values).forEach(function retainPresent(key) {
      if (hasValue(values[key])) result[key] = values[key];
    });
    return result;
  }

  function baseAssemblyOptions(state) {
    return {
      contractType: state.contractType,
      templateVersion: source.templates[state.contractType].templateVersion,
      caseData: {
        caseId: state.case.caseId,
        projectContractId: state.case.projectContractId,
        projectName: state.case.projectName,
        projectAddress: state.case.projectAddress,
      },
      parties: {
        owner: { partyId: state.owner.partyId, legalName: state.owner.legalName },
        contractor: { partyId: state.contractor.partyId, legalName: state.contractor.legalName },
      },
      versionMetadata: { versionId: state.case.contractVersion, status: "DRAFT" },
      values: presentValues(state),
    };
  }

  function calculateDesign(state) {
    if (!hasValue(state.values.designFee)) return null;
    try {
      return engine.calculateDesignPayments(state.values.designFee);
    } catch (error) {
      return null;
    }
  }

  function calculateWorks(inputState) {
    var state = syncWorkTruth(inputState);
    return engine.generateWorksMilestones({
      caseId: state.case.caseId,
      projectTotalAmount: state.values.worksAmount,
      quotation: state.quotation,
      schedule: state.constructionSchedule,
    });
  }

  function missingFields(state) {
    var missing = [];
    var common = [
      [state.case.caseId, "案件識別"], [state.case.projectContractId, "草稿識別"],
      [state.case.contractVersion, "草稿代號"], [state.case.projectName, "案件名稱"],
      [state.case.projectAddress, "工程地址"], [state.owner.partyId, "甲方識別"],
      [state.owner.legalName, "甲方姓名／名稱"], [state.contractor.partyId, "乙方識別"],
      [state.contractor.legalName, "乙方姓名／公司名稱"],
    ];
    common.forEach(function inspect(entry) { if (!hasValue(entry[0])) missing.push(entry[1]); });
    if (state.contractType !== "WORKS") {
      [
        [state.values.designFee, "設計費"], [state.values.designArea, "設計範圍"],
        [state.values.designScope, "設計工作範圍"], [state.designSchedule.scheduleId, "設計交付表識別"],
        [state.designSchedule.version, "設計交付表版本"], [state.designSchedule.nodes.length ? "present" : "", "設計交付節點"],
      ].forEach(function inspect(entry) { if (!hasValue(entry[0])) missing.push(entry[1]); });
      state.designSchedule.nodes.forEach(function inspectDesignNode(node, index) {
        var number = index + 1;
        if (!hasValue(node.nodeId)) missing.push("設計交付節點 " + number + " 的識別");
        if (!hasValue(node.name)) missing.push("設計交付節點 " + number + " 的名稱");
        if (!hasValue(node.dueAt)) missing.push("設計交付節點 " + number + " 的交付日");
        var documentRef = node.deliverableRefs && node.deliverableRefs[0];
        if (!documentRef || !hasValue(documentRef.documentId)) missing.push("設計交付節點 " + number + " 的文件識別");
        if (!documentRef || !hasValue(documentRef.version)) missing.push("設計交付節點 " + number + " 的文件版本");
      });
    }
    if (state.contractType !== "DESIGN") {
      [
        [state.values.worksAmount, "工程總價"], [state.quotation.quotationId, "報價單識別"],
        [state.quotation.version, "報價單版本"], [state.constructionSchedule.scheduleId, "施工進度表識別"],
        [state.constructionSchedule.version, "施工進度表版本"], [state.warrantyTerms.documentId, "保固條款文件識別"],
        [state.warrantyTerms.version, "保固條款文件版本"],
        [state.constructionSchedule.nodes.length, "報價工項與施工節點"],
      ].forEach(function inspect(entry) { if (!entry[0]) missing.push(entry[1]); });
    }
    return missing;
  }

  function issueText(issue) {
    return ISSUE_COPY[issue.code] || "目前資料仍不足以建立這個工程付款節點，請核對報價與進度內容。";
  }

  function evaluateState(inputState) {
    var state = syncWorkTruth(inputState);
    var missing = missingFields(state);
    var designPayments = state.contractType === "WORKS" ? null : calculateDesign(state);
    if (state.contractType !== "WORKS" && hasValue(state.values.designFee) && !designPayments) missing.push("可計算的設計費金額");
    var worksPlan = null;
    var issues = [];
    if (state.contractType !== "DESIGN") {
      worksPlan = calculateWorks(state);
      if (!worksPlan.ok) issues = worksPlan.issues.map(issueText);
    }
    var status = missing.length ? "DATA_INSUFFICIENT" : (issues.length ? "PROCEDURAL_INCOMPLETE" : "READY_TO_ASSEMBLE");
    return {
      status: status,
      missing: Array.from(new Set(missing)),
      issues: Array.from(new Set(issues)),
      designPayments: designPayments,
      worksPlan: worksPlan,
      assembled: null,
      nextOwner: status === "READY_TO_ASSEMBLE" ? "甲乙雙方共同檢視草稿" : "業主與設計師／統包共同補齊資料",
    };
  }

  function assembleDraft(inputState) {
    var state = syncWorkTruth(inputState);
    var options = baseAssemblyOptions(state);
    if (state.contractType !== "WORKS") {
      options.designSchedule = buildDesignSchedule(state);
      options.designPaymentStages = engine.calculateDesignPayments(state.values.designFee).stages;
      options.designChanges = copy(state.designChanges);
    }
    if (state.contractType !== "DESIGN") {
      var worksPlan = calculateWorks(state);
      options.quotation = copy(state.quotation);
      options.constructionSchedule = copy(state.constructionSchedule);
      options.milestones = worksPlan.ok ? copy(worksPlan.milestones) : [];
      options.paymentStages = worksPlan.ok ? copy(worksPlan.paymentStages) : [];
      options.worksChanges = copy(state.worksChanges);
      options.warrantyTerms = copy(state.warrantyTerms);
    }
    return engine.assembleContract(options);
  }

  function createSampleState(contractType) {
    var state = createEmptyState(contractType);
    state.case = {
      caseId: "SAMPLE-CASE-01",
      projectContractId: "SAMPLE-DRAFT-01",
      contractVersion: "SAMPLE-PREVIEW-A",
      projectName: "範例住宅裝修",
      projectAddress: "台北市中山區範例路 1 號",
    };
    state.owner = { partyId: "SAMPLE-OWNER-01", legalName: "王範例", phone: "02-2345-6789", email: "owner@example.test", address: "" };
    state.contractor = { partyId: "SAMPLE-CONTRACTOR-01", legalName: "範例設計工程有限公司", representative: "林範例", phone: "02-2765-4321", email: "", address: "" };
    state.values = { designFee: "300000.00", worksAmount: "", designArea: "室內 30 坪", designScope: "全室室內設計與施工圖說" };
    state.designSchedule = {
      scheduleId: "SAMPLE-DESIGN-SCHEDULE", version: "v1", nodes: [{
        nodeId: "SAMPLE-DESIGN-NODE-3", name: "第一次細部施工圖與報價單交付",
        startAt: "2026-09-18T08:00:00+08:00", dueAt: "2026-09-20T18:00:00+08:00",
        deliverableRefs: [{ documentId: "SAMPLE-DESIGN-DOCUMENT-3", version: "SAMPLE-REV-A" }],
      }],
    };
    state.quotation = { quotationId: "SAMPLE-QUOTATION", version: "v1", total: "", items: [] };
    state.constructionSchedule = { scheduleId: "SAMPLE-WORKS-SCHEDULE", version: "v1", nodes: [] };
    state.warrantyTerms = { documentId: "SAMPLE-WARRANTY-TERMS", version: "v1" };
    state.sampleFixture = true;

    var rows = [
      ["拆除與保護", "SITE_PREPARATION"], ["水電配管", "MEP_ROUGH_IN"],
      ["泥作與防水", "WATERPROOFING"], ["木作基礎", "CARPENTRY_ROUGH_IN"],
      ["門窗安裝", "OPENING_INSTALLATION"], ["天花與封板", "CEILING_CLOSE_UP"],
      ["地坪施作", "FLOORING"], ["塗裝工程", "FINISHING"],
      ["設備安裝", "FIXTURE_INSTALLATION"], ["清潔與驗收準備", "HANDOVER_PREPARATION"],
    ];
    rows.forEach(function addSampleRow(row, index) {
      var day = String(index + 1).padStart(2, "0");
      state = addWorkRow(state, {
        itemName: row[0], workValue: "100000.00", scheduleSemantic: row[1],
        startAt: "2026-10-" + day, dueAt: "2026-10-" + day,
        drawingRef: {
          drawingId: "SAMPLE-DRAWING-" + String(index + 1),
          version: "SAMPLE-REV-" + String(index + 1),
          sheetId: "SAMPLE-SHEET-" + String(index + 1),
        },
        evidenceBasis: "SAMPLE-EVIDENCE-" + String(index + 1), holdPoint: row[1] === "WATERPROOFING" || row[1] === "CEILING_CLOSE_UP",
      });
    });
    state.values.worksAmount = state.quotation.total;
    return state;
  }

  function escapeHtml(value) {
    return String(value === undefined || value === null ? "" : value)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }

  function formatMoney(value) {
    var cents = parseCents(value);
    if (cents === null) return "—";
    return "NT$ " + (Number(cents) / 100).toLocaleString("zh-TW", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  }

  function getPath(object, path) {
    return path.split(".").reduce(function read(value, key) { return value && value[key]; }, object);
  }

  function setPath(object, path, value) {
    var keys = path.split(".");
    var target = object;
    for (var index = 0; index < keys.length - 1; index += 1) target = target[keys[index]];
    target[keys[keys.length - 1]] = value;
  }

  function bootstrap(document, windowObject) {
    var state = createEmptyState();
    var draft = null;
    var element = function byId(id) { return document.getElementById(id); };
    var emptyDraftMessage = "尚未產生草稿。請先補齊資料，再選擇「產生／更新草稿」。";

    function clearError() {
      element("errorState").hidden = true;
      element("errorState").textContent = "";
    }

    function showError(message) {
      element("errorState").textContent = message;
      element("errorState").hidden = false;
    }

    function invalidateDraft() {
      draft = null;
      renderArticles();
      element("draftPreview").textContent = emptyDraftMessage;
      element("printDraftBtn").disabled = true;
      element("draftStatusTag").textContent = "尚未組裝";
      element("reviewState").textContent = "尚未進入審查";
      element("ownerDecisionState").textContent = "尚未作成";
      element("partyAgreementState").textContent = "尚未成立";
    }

    function syncInputs() {
      element("contractType").value = state.contractType;
      Array.prototype.forEach.call(document.querySelectorAll("[data-path]"), function applyValue(control) {
        var value = getPath(state, control.getAttribute("data-path"));
        if (control.value !== String(value || "")) control.value = value || "";
      });
    }

    function renderDesignRows() {
      var hasRows = state.designSchedule.nodes.length > 0;
      element("designRowsEmpty").hidden = hasRows;
      element("designRowsWrap").hidden = !hasRows;
      element("designRows").innerHTML = state.designSchedule.nodes.map(function designRow(node, index) {
        var documentRef = node.deliverableRefs[0] || {};
        return '<tr data-design-index="' + index + '">' +
          '<td><label>節點識別<input data-design-field="nodeId" value="' + escapeHtml(node.nodeId || "") + '"></label>' +
          '<label>交付名稱<input class="wide" data-design-field="name" value="' + escapeHtml(node.name || "") + '"></label></td>' +
          '<td><label>開始日（選填）<input data-design-field="startAt" type="date" value="' + escapeHtml(dateOnly(node.startAt)) + '"></label>' +
          '<label>交付日<input data-design-field="dueAt" type="date" value="' + escapeHtml(dateOnly(node.dueAt)) + '"></label></td>' +
          '<td><label>交付文件識別<input data-design-field="documentId" value="' + escapeHtml(documentRef.documentId || "") + '"></label>' +
          '<label>交付文件版本<input data-design-field="documentVersion" value="' + escapeHtml(documentRef.version || "") + '"></label></td>' +
          '<td><button class="btn danger" type="button" data-remove-design>刪除</button></td></tr>';
      }).join("");
    }

    function renderWorkRows() {
      var hasRows = state.quotation.items.length > 0;
      element("workRowsEmpty").hidden = hasRows;
      element("workRowsWrap").hidden = !hasRows;
      var nodesByItem = {};
      state.constructionSchedule.nodes.forEach(function mapNode(node) {
        node.quotationRefs.forEach(function mapReference(reference) { nodesByItem[reference.itemId] = node; });
      });
      element("workRows").innerHTML = state.quotation.items.map(function workRow(item) {
        var node = nodesByItem[item.itemId];
        var drawing = node.drawingRefs[0] || {};
        var evidence = node.requiredEvidence[0] ? node.requiredEvidence[0].basisRef : "";
        return '<tr data-item-id="' + escapeHtml(item.itemId) + '">' +
          '<td><label>報價工項<input class="wide" data-work-field="itemName" value="' + escapeHtml(item.name) + '"></label>' +
          '<label>工程價值<input data-work-field="workValue" inputmode="decimal" value="' + escapeHtml(item.amount) + '"></label></td>' +
          '<td><label>施工語意<input class="wide" data-work-field="scheduleSemantic" value="' + escapeHtml(node.scheduleSemantic) + '"></label>' +
          '<label>開始日<input data-work-field="startAt" type="date" value="' + escapeHtml(dateOnly(node.startAt)) + '"></label>' +
          '<label>預定完成日<input data-work-field="dueAt" type="date" value="' + escapeHtml(dateOnly(node.dueAt)) + '"></label></td>' +
          '<td><label>圖說識別<input data-work-field="drawingId" value="' + escapeHtml(drawing.drawingId || "") + '"></label>' +
          '<label>圖說版本<input data-work-field="drawingVersion" value="' + escapeHtml(drawing.version || "") + '"></label>' +
          '<label>圖號<input data-work-field="drawingSheetId" value="' + escapeHtml(drawing.sheetId || "") + '"></label>' +
          '<label>佐證依據<input class="wide" data-work-field="evidenceBasis" value="' + escapeHtml(evidence) + '"></label></td>' +
          '<td class="check-cell"><label>停留點<input data-work-field="holdPoint" type="checkbox"' + (node.holdPoint ? " checked" : "") + '></label></td>' +
          '<td><button class="btn danger" type="button" data-remove-row>刪除</button></td></tr>';
      }).join("");
    }

    function renderPayments(evaluation) {
      var groups = [];
      if (evaluation.designPayments) {
        groups.push('<h3>設計費付款節點</h3>' + evaluation.designPayments.stages.map(function designStage(stage) {
          return '<div class="status-line"><span>' + escapeHtml(stage.trigger) + ' · ' + escapeHtml(stage.rate) + '%</span><strong>' + escapeHtml(formatMoney(stage.amount)) + '</strong></div>';
        }).join(""));
      }
      if (evaluation.worksPlan && evaluation.worksPlan.ok) {
        groups.push('<h3 style="margin-top:18px">工程款付款節點</h3>' + evaluation.worksPlan.paymentStages.map(function worksStage(stage) {
          var label = stage.stageType === "SIGNING" ? "簽約款" : (stage.stageType === "FINAL" ? "驗收後尾款" : "施工進度款");
          return '<div class="status-line"><span>' + label + ' · ' + escapeHtml(stage.rate) + '%</span><strong>' + escapeHtml(formatMoney(stage.amount)) + '</strong></div>';
        }).join(""));
      } else if (evaluation.issues.length) {
        groups.push('<div class="notice">工程付款節點尚不能成立，這是程序資料未齊，不代表工程品質判定。</div><ul class="issue-list">' +
          evaluation.issues.map(function issue(item) { return "<li>" + escapeHtml(item) + "</li>"; }).join("") + "</ul>");
      }
      element("paymentContent").className = groups.length ? "" : "empty";
      element("paymentContent").innerHTML = groups.length ? groups.join("") : "填寫價金後，這裡會依契約類型顯示付款節點。";
    }

    function renderArticles() {
      if (!draft) {
        element("articleContent").className = "empty";
        element("articleContent").textContent = "產生草稿後，可展開查看條文識別、來源類型與尚未帶入的欄位。";
        return;
      }
      var unresolved = draft.unresolvedPlaceholders.length
        ? "尚有 " + draft.unresolvedPlaceholders.length + " 個欄位未帶入"
        : "目前欄位已帶入";
      var bindings = draft.unresolvedBindings.length
        ? "；另有 " + draft.unresolvedBindings.length + " 項依據待補"
        : "";
      element("articleContent").className = "";
      element("articleContent").innerHTML = '<div class="notice">共同程序附錄：' + escapeHtml(draft.commonAppendix.ref) + '（單一引用）<br>' + escapeHtml(unresolved + bindings) + '</div>' +
        draft.articles.map(function articleView(article) {
          return '<details><summary>' + escapeHtml(article.title) + '</summary><div class="detail-body"><div class="article-meta"><code>' +
            escapeHtml(article.articleId) + '</code><code>' + escapeHtml(article.sourceType) + '</code></div>' +
            escapeHtml(article.renderedBody || article.body) + '</div></details>';
        }).join("");
    }

    function renderStatus(evaluation) {
      var statusText = evaluation.status === "READY_TO_ASSEMBLE" ? "資料可供組裝草稿" :
        (evaluation.status === "PROCEDURAL_INCOMPLETE" ? "工程依據仍需補齊" : "資料不足");
      element("currentStatus").textContent = draft && draft.status === "DRAFT" ? "草稿已依目前資料更新" : statusText;
      element("currentStatus").dataset.tone = evaluation.status === "READY_TO_ASSEMBLE" || (draft && draft.status === "DRAFT") ? "ok" : "warn";
      var gaps = evaluation.missing.concat(evaluation.issues);
      element("missingSummary").textContent = gaps.length ? gaps.slice(0, 3).join("、") + (gaps.length > 3 ? "，另有 " + (gaps.length - 3) + " 項" : "") : "目前未發現組裝所需缺件";
      element("nextOwner").textContent = evaluation.nextOwner;
      element("draftStatusTag").textContent = draft ? (draft.status === "DRAFT" ? "草稿可供檢視" : "草稿仍有缺件") : "尚未組裝";
    }

    function render() {
      var evaluation = evaluateState(state);
      var needsDesign = state.contractType !== "WORKS";
      var needsWorks = state.contractType !== "DESIGN";
      element("designBasis").hidden = !needsDesign;
      element("worksBasis").hidden = !needsWorks;
      element("basisTag").textContent = needsDesign && needsWorks ? "設計與工程分開" : (needsDesign ? "設計資料" : "工程資料");
      element("pageTitle").textContent = TITLES[state.contractType];
      element("sampleNotice").textContent = state.sampleFixture
        ? "目前顯示的是你主動載入的範例資料，只供理解欄位與草稿呈現，不會成為正式資料。"
        : "範例只會在你主動載入後出現，用來了解欄位與草稿呈現；不代表正式案件資料，也不會自動保存。";
      syncInputs();
      renderDesignRows();
      renderWorkRows();
      renderPayments(evaluation);
      renderArticles();
      renderStatus(evaluation);
      element("printDraftBtn").disabled = !draft;
      return evaluation;
    }

    element("contractType").addEventListener("change", function changeType(event) {
      state.contractType = canonicalType(event.target.value);
      state.sampleFixture = false;
      invalidateDraft();
      clearError();
      render();
    });

    Array.prototype.forEach.call(document.querySelectorAll("[data-path]"), function bindControl(control) {
      control.addEventListener("input", function updateValue(event) {
        setPath(state, event.currentTarget.getAttribute("data-path"), event.currentTarget.value);
        state.sampleFixture = false;
        invalidateDraft();
        clearError();
        renderStatus(evaluateState(state));
        renderPayments(evaluateState(state));
      });
    });

    element("loadSampleBtn").addEventListener("click", function loadSample() {
      state = createSampleState(element("contractType").value);
      invalidateDraft();
      clearError();
      render();
    });

    element("addDesignRowBtn").addEventListener("click", function addBlankDesignRow() {
      state = addDesignRow(state, {});
      state.sampleFixture = false;
      invalidateDraft();
      clearError();
      render();
      var rows = element("designRows").querySelectorAll("tr");
      if (rows.length) rows[rows.length - 1].querySelector("input").focus();
    });

    element("designRows").addEventListener("input", function editDesignRow(event) {
      var field = event.target.getAttribute("data-design-field");
      if (!field) return;
      var row = event.target.closest("tr");
      var patch = {};
      patch[field] = event.target.value;
      state = updateDesignRow(state, parseInt(row.getAttribute("data-design-index"), 10), patch);
      state.sampleFixture = false;
      invalidateDraft();
      clearError();
      renderStatus(evaluateState(state));
      renderPayments(evaluateState(state));
    });

    element("designRows").addEventListener("click", function removeDesign(event) {
      var button = event.target.closest("[data-remove-design]");
      if (!button) return;
      var row = button.closest("tr");
      state = removeDesignRow(state, parseInt(row.getAttribute("data-design-index"), 10));
      state.sampleFixture = false;
      invalidateDraft();
      clearError();
      render();
    });

    element("addWorkRowBtn").addEventListener("click", function addBlankRow() {
      state = addWorkRow(state, {});
      state.sampleFixture = false;
      invalidateDraft();
      clearError();
      render();
      var rows = element("workRows").querySelectorAll("tr");
      if (rows.length) rows[rows.length - 1].querySelector("input").focus();
    });

    element("workRows").addEventListener("input", function editWorkRow(event) {
      var field = event.target.getAttribute("data-work-field");
      if (!field) return;
      var row = event.target.closest("tr");
      var value = event.target.type === "checkbox" ? event.target.checked : event.target.value;
      var patch = {};
      patch[field] = value;
      state = updateWorkRow(state, row.getAttribute("data-item-id"), patch);
      state.sampleFixture = false;
      invalidateDraft();
      clearError();
      renderPayments(evaluateState(state));
      renderStatus(evaluateState(state));
    });

    element("workRows").addEventListener("click", function removeRow(event) {
      var button = event.target.closest("[data-remove-row]");
      if (!button) return;
      var row = button.closest("tr");
      state = removeWorkRow(state, row.getAttribute("data-item-id"));
      state.sampleFixture = false;
      invalidateDraft();
      clearError();
      render();
    });

    element("assembleBtn").addEventListener("click", function assemble() {
      clearError();
      element("loadingState").hidden = false;
      windowObject.requestAnimationFrame(function assembleNextFrame() {
        try {
          var evaluation = evaluateState(state);
          if (evaluation.status !== "READY_TO_ASSEMBLE") {
            showError("目前還不能產生完整草稿。請依上方缺件提示補齊案件、價金、報價與進度資料。");
            invalidateDraft();
          } else {
            draft = assembleDraft(state);
            if (draft.status !== "DRAFT") {
              showError("草稿已整理，但仍有依據未完成連結。請查看條文區的待補項目。");
            }
          }
        } catch (error) {
          invalidateDraft();
          showError("目前資料無法完成草稿組裝。請核對金額、日期與案件識別後再試一次。");
        } finally {
          element("loadingState").hidden = true;
          render();
          if (draft) {
            element("draftPreview").textContent = draft.renderedContract;
            element("reviewState").textContent = "草稿依據已整理，尚未進入正式審查";
            element("ownerDecisionState").textContent = "等待正式流程明示記錄";
            element("partyAgreementState").textContent = "等待甲乙雙方正式確認";
          } else {
            element("draftPreview").textContent = emptyDraftMessage;
          }
        }
      });
    });

    function togglePanel(buttonId, panelId, openText, closedText) {
      element(buttonId).addEventListener("click", function toggle() {
        var panel = element(panelId);
        var expanded = element(buttonId).getAttribute("aria-expanded") === "true";
        panel.hidden = expanded;
        element(buttonId).setAttribute("aria-expanded", String(!expanded));
        element(buttonId).textContent = expanded ? openText : closedText;
      });
    }
    togglePanel("expandPaymentsBtn", "paymentPanel", "展開付款節點", "收合付款節點");
    togglePanel("expandArticlesBtn", "articlePanel", "展開條文", "收合條文");
    element("printDraftBtn").addEventListener("click", function printDraft() { if (draft) windowObject.print(); });

    render();
  }

  return Object.freeze({
    engine: engine,
    source: source,
    createEmptyState: createEmptyState,
    createSampleState: createSampleState,
    evaluateState: evaluateState,
    assembleDraft: assembleDraft,
    addWorkRow: addWorkRow,
    updateWorkRow: updateWorkRow,
    removeWorkRow: removeWorkRow,
    addDesignRow: addDesignRow,
    updateDesignRow: updateDesignRow,
    removeDesignRow: removeDesignRow,
    bootstrap: bootstrap,
  });
});
