import {
  createRecognitionOverlaySvg,
  selectRecognitionRegion,
  approveRecognitionManifest
} from "./pdf-recognition-gate.mjs";

const RUNTIME_VERSION = "0.3.0-recognition-gate-20260723";
const pendingRecognitionImportAuthorizations = new WeakMap();

function issueRecognitionImportAuthorization(scene, manifest, binding) {
  const token = Object.freeze({});
  pendingRecognitionImportAuthorizations.set(token, { scene, manifest, binding: { ...binding } });
  return token;
}

function consumeRecognitionImportAuthorization(token, request = {}) {
  if (!token || typeof token !== "object") return false;
  const authorization = pendingRecognitionImportAuthorizations.get(token);
  pendingRecognitionImportAuthorizations.delete(token);
  if (!authorization) return false;
  return authorization.scene === request.scene &&
    authorization.manifest === request.manifest &&
    String(authorization.binding.fileSha256) === String(request.binding && request.binding.fileSha256) &&
    String(authorization.binding.sourcePdfSha256) === String(request.binding && request.binding.sourcePdfSha256) &&
    Number(authorization.binding.pageNumber) === Number(request.binding && request.binding.pageNumber) &&
    String(authorization.binding.selectedRegionId) === String(request.binding && request.binding.selectedRegionId) &&
    String(authorization.binding.scaleDecisionSchema) === String(request.binding && request.binding.scaleDecisionSchema) &&
    String(authorization.binding.scaleDecisionHash) === String(request.binding && request.binding.scaleDecisionHash);
}
const QA_NODE_ID = "laibe-pdf-exact-source-qa-json";
const QA_PANEL_ID = "laibe-pdf-exact-source-qa-panel";
const QA_CANVAS_EXPORT_RECEIPT_NODE_ID = "laibe-pdf-qa-canvas-export-json";
const QA_CANVAS_EXPORT_RECEIPT_SCHEMA = "laibe.planPuzzle.qaCanvasPngExportReceipt.v1";
const GATE_B_R3_RECEIPT_NODE_ID = "laibe-pdf-gate-b-r3-import-json";
const GATE_B_R3_RECEIPT_SCHEMA = "laibe.planPuzzle.gateB.r3.importReceipt.v1";
const GATE_B_R3_1_RECEIPT_NODE_ID = "laibe-pdf-gate-b-r3-1-policy-ledger-json";
const GATE_B_R3_1_RECEIPT_SCHEMA = "laibe.planPuzzle.gateB.r3_1.policyIntegrityProvenanceLedgerReceipt.v1";
const GATE_B_R3_1_1_RECEIPT_NODE_ID = "laibe-pdf-gate-b-r3-1-1-policy-ledger-json";
const GATE_B_R3_1_1_RECEIPT_SCHEMA = "laibe.planPuzzle.gateB.r3_1_1.policyPredicateMappingProvenanceReceipt.v1";
const GATE_B_R3_1_2_RECEIPT_NODE_ID = "laibe-pdf-gate-b-r3-1-2-ledger-guard-json";
const GATE_B_R3_1_2_RECEIPT_SCHEMA = "laibe.planPuzzle.gateB.r3_1_2.ledgerAcceptanceInvariantGuardReceipt.v1";
const GATE_B_R3_2_1_RECEIPT_NODE_ID = "laibe-pdf-gate-b-r3-2-1-coordinate-live-geometry-json";
const GATE_B_R3_2_1_RECEIPT_SCHEMA = "laibe.planPuzzle.gateB.r3_2_1.coordinateFrameLiveGeometryReceipt.v1";
const GATE_B_R3_2_2_RECEIPT_NODE_ID = "laibe-pdf-gate-b-r3-2-2-predicate-dual-extraction-json";
const GATE_B_R3_2_2_RECEIPT_SCHEMA = "laibe.planPuzzle.gateB.r3_2_2.realPredicateDualExtractionClosureReceipt.v1";
const GATE_B_R3_2_3_RECEIPT_NODE_ID = "laibe-pdf-gate-b-r3-2-3-fixture-purity-json";
const GATE_B_R3_2_3_RECEIPT_SCHEMA = "laibe.planPuzzle.gateB.r3_2_3.fixtureInputLiveProjectPurityReceipt.v1";
const GATE_B_R3_2_4_RECEIPT_NODE_ID = "laibe-pdf-gate-b-r3-2-4-immutable-locator-json";
const GATE_B_R3_2_4_RECEIPT_SCHEMA = "laibe.planPuzzle.gateB.r3_2_4.immutableLocatorReceiptSuiteFingerprintReceipt.v1";
const GATE_B_R4A_RECEIPT_NODE_ID = "laibe-pdf-gate-b-r4a-semantic-category-json";
const GATE_B_R4A_RECEIPT_SCHEMA = "laibe.planPuzzle.gateB.r4a.semanticCategoryObjectizationReceipt.v1";
const GATE_B_R4A1_RECEIPT_NODE_ID = "laibe-pdf-gate-b-r4a-1-semantic-integrity-json";
const GATE_B_R4A1_RECEIPT_SCHEMA = "laibe.planPuzzle.gateB.r4a_1.semanticIntegrityFinalCompletenessReceipt.v1";
const GATE_B_R4B1_RECEIPT_NODE_ID = "laibe-pdf-gate-b-r4b-1-user-review-json";
const GATE_B_R4B1_RECEIPT_SCHEMA = "laibe.planPuzzle.gateB.r4b_1.userReviewScaleCalibrationReceipt.v1";
// The normal import route receives a user-selected source and derives all
// scale and region facts from its bytes; it has no protected-source profile.
const DEFAULT_QA_SOURCE = null;
const EXPECTED_SOURCE_SHA256 = null;
const PDF_PAGE_HEIGHT_PT = 0;
const GATE_A2_TO_SCENE_FRAME_TRANSFORM = Object.freeze({ retired: true });
const QA_CANVAS_EXPORT_SPECS = Object.freeze([]);
const HUMAN_VERIFIED_SOURCE_PROFILES = Object.freeze({});
const GATE_A2_SOURCE_RECORDS = Object.freeze([]);
const GATE_A2_SOURCE_INVENTORY_IDENTITY = Object.freeze({ retired: true });
const GATE_A2_SOURCE_GEOMETRY = Object.freeze({});

const R4B1_CANDIDATE_SOURCE_IDS = Object.freeze([]);
const R4B1_MANUAL_SOURCE_IDS = Object.freeze([]);
const R4B1_UNCERTAIN_SOURCE_IDS = Object.freeze([]);
const R4B1_ALLOWED_UNITS = Object.freeze({ mm: 1, cm: 10, m: 1000 });
const R4B1_POLICY = Object.freeze({
  source_kind: "pdf",
  object_status: "existing",
  work_action: "none",
  budget_trigger: "none",
  dbspec_projection: "excluded"
});

function hasGateBR4B1ReviewRoute() {
  return isLocalhost() && new URLSearchParams(location.search).get("laibePdfGateBR4B1") === "1";
}

function r4b1StableHash(value) {
  const text = typeof value === "string" ? value : stableStringify(value);
  let h1 = 0x811c9dc5;
  let h2 = 0x01000193;
  for (let index = 0; index < text.length; index += 1) {
    const code = text.charCodeAt(index);
    h1 ^= code;
    h1 = Math.imul(h1, 16777619);
    h2 ^= code + index;
    h2 = Math.imul(h2, 2246822519);
  }
  return `${(h1 >>> 0).toString(16).padStart(8, "0")}${(h2 >>> 0).toString(16).padStart(8, "0")}`.toUpperCase();
}

function createR4B1ReviewRecords() {
  const candidates = new Set(R4B1_CANDIDATE_SOURCE_IDS);
  const manual = new Set(R4B1_MANUAL_SOURCE_IDS);
  const uncertain = new Set(R4B1_UNCERTAIN_SOURCE_IDS);
  return GATE_A2_SOURCE_RECORDS
    .filter((record) => candidates.has(record.id) || manual.has(record.id) || uncertain.has(record.id))
    .map((record) => {
      const geometry = GATE_A2_SOURCE_GEOMETRY[record.id] || {};
      const disposition = candidates.has(record.id)
        ? "candidate_present_unaccepted"
        : manual.has(record.id)
          ? "missing_with_exact_reason"
          : "ignored_uncertain";
      const sourceBBox = Array.isArray(geometry.bbox) ? [...geometry.bbox] : null;
      const sceneBBox = sourceBBox ? [sourceBBox[0], PDF_PAGE_HEIGHT_PT - sourceBBox[3], sourceBBox[2], PDF_PAGE_HEIGHT_PT - sourceBBox[1]] : null;
      return {
        sourceId: record.id,
        sourceCategory: record.cat,
        sourceSubtype: record.sub || geometry.sub || (uncertain.has(record.id) ? "uncertain_source_marker" : "source_local_review"),
        sourceRegionId: record.region === "p1-3f" ? "page-1-region-3f" : "page-1-region-rf",
        page: 1,
        sourceBBox: sourceBBox,
        sourceBBoxSceneBottomLeftPt: sceneBBox,
        disposition,
        candidateIds: disposition === "candidate_present_unaccepted" ? [] : null,
        reviewStatus: disposition === "ignored_uncertain" ? "evidence_only" : "pending_user",
        nextResponsibleParty: disposition === "ignored_uncertain" ? "業主或指定圖面審閱者（有新證據時）" : "業主或指定圖面審閱者",
        policy: { ...R4B1_POLICY },
        mapping_state: "not_accepted",
        editable_object_id: null,
        acceptedTransformId: null
      };
    });
}

function evaluateR4B1CalibrationReceipt(receipt) {
  const failedRules = [];
  const points = receipt?.sourceEndpoints || {};
  const from = points.from;
  const to = points.to;
  const unit = String(receipt?.unit || "");
  const entered = Number(receipt?.userEnteredRealLength);
  const normalizedMm = Number(receipt?.normalizedMillimetres);
  const sourceDistance = Number(receipt?.computed?.sourceDistance);
  const transformId = receipt?.acceptedTransformId;
  const source = receipt?.source || {};
  if (!from || !to || !Number.isFinite(Number(from.x)) || !Number.isFinite(Number(from.y)) || !Number.isFinite(Number(to.x)) || !Number.isFinite(Number(to.y))) failedRules.push("two_distinct_source_endpoints_required");
  if (from && to && Number(from.x) === Number(to.x) && Number(from.y) === Number(to.y)) failedRules.push("source_endpoints_must_differ");
  if (!Number.isFinite(entered) || entered <= 0) failedRules.push("positive_finite_user_length_required");
  if (!Object.prototype.hasOwnProperty.call(R4B1_ALLOWED_UNITS, unit)) failedRules.push("explicit_unit_required");
  if (!Number.isFinite(normalizedMm) || normalizedMm <= 0 || (Object.prototype.hasOwnProperty.call(R4B1_ALLOWED_UNITS, unit) && normalizedMm !== Number((entered * R4B1_ALLOWED_UNITS[unit]).toFixed(3)))) failedRules.push("normalized_millimetres_must_match_unit_once");
  if (!Number.isFinite(sourceDistance) || sourceDistance <= 0) failedRules.push("computed_source_distance_required");
  if (!Number.isFinite(Number(receipt?.computed?.scale)) || Number(receipt.computed.scale) <= 0) failedRules.push("computed_scale_required");
  if (!receipt?.computed?.transform || !receipt.computed.transform.forward || !receipt.computed.transform.inverse) failedRules.push("computed_transform_required");
  if (!transformId || transformId !== r4b1StableHash({ sourceSha256: receipt?.sourceSha256 || source.pdfSha256, page: source.page, regionId: source.regionId, from, to, normalizedMm, unit })) failedRules.push("accepted_transform_id_must_be_deterministic");
  if (!receipt?.actor || !receipt?.reviewer || !receipt?.time || !receipt?.caseId) failedRules.push("actor_reviewer_time_case_required");
  if (receipt?.sourceSha256 !== EXPECTED_SOURCE_SHA256 || source.pdfSha256 !== EXPECTED_SOURCE_SHA256 || source.page !== 1 || !source.regionId) failedRules.push("source_pdf_page_region_binding_required");
  if (!receipt?.beforeProjectFingerprint?.sha256 || !receipt?.afterProjectFingerprint?.sha256) failedRules.push("before_after_project_fingerprints_required");
  if (receipt?.status !== "accepted_for_promotion_review") failedRules.push("calibration_receipt_must_be_accepted");
  if (!Number.isFinite(Number(receipt?.computed?.residual)) || !Number.isFinite(Number(receipt?.computed?.tolerance)) || Number(receipt.computed.residual) > Number(receipt.computed.tolerance)) failedRules.push("residual_must_be_within_declared_tolerance");
  if (receipt?.evidence?.source !== "user_selected_endpoints_and_entered_length") failedRules.push("user_entered_endpoint_evidence_required");
  return { schema: "laibe.planPuzzle.r4b1.calibrationPredicate.v1", pass: failedRules.length === 0, failedRules, rules: { acceptedReceiptRequired: true, autoSuggestionAdvisoryOnly: true, calibratedFlagAloneInsufficient: true } };
}

function evaluateR4B1PromotionEligibility(input = {}) {
  const failedRules = [];
  const receiptResult = evaluateR4B1CalibrationReceipt(input.calibrationReceipt);
  const review = input.reviewRecord || {};
  const project = input.project || {};
  if (!receiptResult.pass) failedRules.push("accepted_calibration_receipt_required");
  if (project.scale?.calibrated === true && !receiptResult.pass) failedRules.push("calibrated_flag_alone_is_insufficient");
  if (review.reviewStatus !== "confirmed_for_review" && review.reviewStatus !== "source_local_draft_reviewed") failedRules.push("individual_review_confirmation_required");
  if (review.disposition === "ignored_uncertain" || review.uncertain === true) failedRules.push("uncertain_record_cannot_auto_promote");
  if (review.source_kind !== "pdf" || review.object_status !== "existing" || review.work_action !== "none" || review.budget_trigger !== "none" || review.dbspec_projection !== "excluded") failedRules.push("existing_pdf_policy_required");
  if (review.mapping_state !== "not_accepted" || review.editable_object_id !== null) failedRules.push("mapping_must_remain_unaccepted_before_later_authorization");
  return { schema: "laibe.planPuzzle.r4b1.promotionPredicate.v1", pass: failedRules.length === 0, failedRules, calibration: receiptResult };
}

function createR4B1NegativeFixtures() {
  const source = { pdfSha256: EXPECTED_SOURCE_SHA256, page: 1, regionId: "page-1-region-3f", coordinateFrame: "page-top-left-pdf-pt" };
  const from = { x: 300, y: 100 };
  const to = { x: 500, y: 100 };
  const normalizedMillimetres = 200;
  const unit = "mm";
  const acceptedTransformId = r4b1StableHash({ sourceSha256: EXPECTED_SOURCE_SHA256, page: 1, regionId: source.regionId, from, to, normalizedMm: normalizedMillimetres, unit });
  const baseReceipt = {
    schema: "a9.r4b.user-scale-calibration-receipt.v1",
    actor: "owner_review_user",
    reviewer: "designated_plan_reviewer",
    time: "2026-07-17T00:00:00.000Z",
    caseId: "laibe-r4b1-case",
    sourceSha256: EXPECTED_SOURCE_SHA256,
    source,
    sourceEndpoints: { from, to },
    userEnteredRealLength: 200,
    unit,
    normalizedMillimetres,
    computed: { sourceDistance: 200, scale: 1, residual: 0, tolerance: 0.5, transform: { forward: { sourceToMm: 1 }, inverse: { mmToSource: 1 } } },
    acceptedTransformId,
    beforeProjectFingerprint: { sha256: "A".repeat(64) },
    afterProjectFingerprint: { sha256: "B".repeat(64) },
    status: "accepted_for_promotion_review",
    evidence: { source: "user_selected_endpoints_and_entered_length" }
  };
  const baseReview = {
    source_kind: "pdf", object_status: "existing", work_action: "none", budget_trigger: "none", dbspec_projection: "excluded",
    reviewStatus: "source_local_draft_reviewed", disposition: "missing_with_exact_reason", mapping_state: "not_accepted", editable_object_id: null
  };
  const clone = (value) => JSON.parse(JSON.stringify(value));
  const fixtures = [];
  const addCalibration = (id, label, mutate, expectedRule) => {
    const input = clone(baseReceipt);
    mutate(input);
    const result = evaluateR4B1CalibrationReceipt(input);
    fixtures.push({ id, label, predicate: "evaluateR4B1CalibrationReceipt", pass: result.pass, failedRules: result.failedRules, expectedRule, projectMutation: false });
  };
  addCalibration("filename-clue", "檔名提示不能接受校正", (input) => { input.evidence = { source: "filename_dimension_clue" }; }, "user_entered_endpoint_evidence_required");
  addCalibration("calibrated-flag-alone", "已校正旗標不能取代接受紀錄", (input) => { input.status = "pending_review"; input.project = { scale: { calibrated: true } }; }, "calibration_receipt_must_be_accepted");
  addCalibration("confirmed-review-without-receipt", "候選確認不能取代校正紀錄", (input) => { input.status = "pending_review"; input.reviewStatus = "confirmed_for_review"; }, "calibration_receipt_must_be_accepted");
  addCalibration("missing-endpoint", "缺少端點", (input) => { delete input.sourceEndpoints.to; }, "two_distinct_source_endpoints_required");
  addCalibration("duplicate-endpoint", "端點不可相同", (input) => { input.sourceEndpoints.to = { ...input.sourceEndpoints.from }; }, "source_endpoints_must_differ");
  addCalibration("invalid-length", "長度必須為正數", (input) => { input.userEnteredRealLength = 0; input.normalizedMillimetres = 0; }, "positive_finite_user_length_required");
  addCalibration("missing-unit", "必須選擇單位", (input) => { input.unit = ""; }, "explicit_unit_required");
  addCalibration("missing-context", "缺少審閱與案例脈絡", (input) => { delete input.actor; delete input.reviewer; delete input.caseId; delete input.source.regionId; delete input.beforeProjectFingerprint; }, "actor_reviewer_time_case_required");
  addCalibration("nondeterministic-transform", "校正識別不可來自工作階段", (input) => { input.acceptedTransformId = "session-derived-transform-id"; }, "accepted_transform_id_must_be_deterministic");
  const addPromotion = (id, label, mutate, expectedRule) => {
    const input = { calibrationReceipt: clone(baseReceipt), reviewRecord: clone(baseReview), project: { scale: { calibrated: false }, walls: [], openings: [], structures: [], zones: [] } };
    mutate(input);
    const result = evaluateR4B1PromotionEligibility(input);
    fixtures.push({ id, label, predicate: "evaluateR4B1PromotionEligibility", pass: result.pass, failedRules: result.failedRules, expectedRule, projectMutation: false });
  };
  addPromotion("manual-trace-new-policy", "來源描繪不可走新增物件政策", (input) => { input.reviewRecord.source_kind = "user"; input.reviewRecord.work_action = "create"; }, "existing_pdf_policy_required");
  addPromotion("early-live-array-promotion", "未接受校正不可進入編輯集合", (input) => { input.calibrationReceipt.status = "pending_review"; }, "accepted_calibration_receipt_required");
  addPromotion("uncertain-automatic-promotion", "不確定記錄不可自動升格", (input) => { input.reviewRecord.disposition = "ignored_uncertain"; input.reviewRecord.uncertain = true; }, "uncertain_record_cannot_auto_promote");
  addPromotion("automatic-budget-candidate", "來源存在不會建立預算候選", (input) => { input.reviewRecord.budget_trigger = "automatic"; }, "existing_pdf_policy_required");
  addPromotion("automatic-dbspec-projection", "來源存在不會建立資料投影", (input) => { input.reviewRecord.dbspec_projection = "included"; }, "existing_pdf_policy_required");
  return { schema: "laibe.planPuzzle.r4b1.negativeFixtures.v1", count: fixtures.length, fixtures, allFail: fixtures.every((fixture) => fixture.pass === false && fixture.failedRules.includes(fixture.expectedRule) && fixture.projectMutation === false) };
}

function createR4B1ReceiptNode() {
  let node = document.getElementById(GATE_B_R4B1_RECEIPT_NODE_ID);
  if (!node) {
    node = document.createElement("script");
    node.id = GATE_B_R4B1_RECEIPT_NODE_ID;
    node.type = "application/json";
    node.hidden = true;
    node.dataset.status = "pending";
    document.body.appendChild(node);
  }
  return node;
}

function writeR4B1Receipt(node, state = {}) {
  const receipt = {
    schema: GATE_B_R4B1_RECEIPT_SCHEMA,
    status: state.status || "pending",
    runtimeVersion: RUNTIME_VERSION,
    trigger: "localhost-r4b1-user-review-query",
    sourceSha256: EXPECTED_SOURCE_SHA256,
    recordCounts: { total: 19, candidate: 6, manual: 9, uncertain: 4 },
    calibration: state.calibration || null,
    reviewQueue: state.reviewQueue || null,
    reviewLedger: state.reviewLedger || [],
    manualTraces: state.manualTraces || {},
    caseEvents: state.caseEvents || [],
    promotion: state.promotion || null,
    projectFingerprints: state.projectFingerprints || null,
    policy: { ...R4B1_POLICY, automaticPromotionCount: 0, automaticBudgetCandidateCount: 0, automaticDbspecProjectionCount: 0 },
    importerInvocationCount: 0,
    projectMutation: state.projectMutation === true,
    negativeFixtures: state.negativeFixtures || createR4B1NegativeFixtures(),
    noClaims: ["Gate B", "mapping acceptance", "geometry fidelity", "Stage3", "Budget/DBSpec", "production readiness"]
  };
  node.dataset.status = receipt.status;
  node.textContent = JSON.stringify(receipt);
  return receipt;
}

function installR4B1ReviewRoute() {
  if (!hasGateBR4B1ReviewRoute()) return;
  const node = createR4B1ReceiptNode();
  const records = createR4B1ReviewRecords();
  const model = {
    schema: "laibe.planPuzzle.r4b1.userReviewSourceModel.v1",
    runtimeVersion: RUNTIME_VERSION,
    sourceSha256: EXPECTED_SOURCE_SHA256,
    records,
    policy: { ...R4B1_POLICY },
    allowedUnits: { ...R4B1_ALLOWED_UNITS },
    stableTransformId: (input) => r4b1StableHash(input),
    evaluateCalibrationReceipt: evaluateR4B1CalibrationReceipt,
    evaluatePromotionEligibility: evaluateR4B1PromotionEligibility,
    negativeFixtures: createR4B1NegativeFixtures(),
    updateReceipt: (state) => writeR4B1Receipt(node, state)
  };
  window.LaibeR4B1ReviewModel = model;
  writeR4B1Receipt(node, { status: "pending", reviewQueue: { total: 19, candidate: 6, manual: 9, uncertain: 4 } });
  window.addEventListener("laibe-r4b1-state-changed", (event) => {
    writeR4B1Receipt(node, event.detail || {});
  });
  window.dispatchEvent(new CustomEvent("laibe-r4b1-model-ready", { detail: model }));
}

function nowIso() {
  return new Date().toISOString();
}

function bytesToHex(buffer) {
  return Array.from(new Uint8Array(buffer)).map((byte) => byte.toString(16).padStart(2, "0")).join("").toUpperCase();
}

async function sha256Hex(buffer) {
  return bytesToHex(await crypto.subtle.digest("SHA-256", buffer));
}

function bytesToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x6000;
  let binary = "";
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
  }
  return btoa(binary);
}

function stableStringify(value) {
  return window.LaibePdfPlanObjectizationAdapter.stableStringify(value);
}

function isLocalhost() {
  return ["127.0.0.1", "localhost", "::1"].includes(location.hostname);
}

function hasExactSourceQaRoute() {
  return new URLSearchParams(location.search).get("laibePdfExactSourceQa") === "1";
}

function hasQaCanvasExportReceiptRoute() {
  const params = new URLSearchParams(location.search);
  return hasExactSourceQaRoute() && params.get("laibePdfQaCanvasExport") === "1";
}

function hasGateBR3ImportReceiptRoute() {
  const params = new URLSearchParams(location.search);
  return isLocalhost() && params.get("laibePdfGateBR3Import") === "1";
}

function hasGateBR31PolicyLedgerRoute() {
  const params = new URLSearchParams(location.search);
  return isLocalhost() && params.get("laibePdfGateBR31PolicyLedger") === "1";
}

function hasGateBR311PolicyLedgerRoute() {
  const params = new URLSearchParams(location.search);
  return isLocalhost() && params.get("laibePdfGateBR311PolicyLedger") === "1";
}

function hasGateBR312PolicyLedgerRoute() {
  const params = new URLSearchParams(location.search);
  return isLocalhost() && params.get("laibePdfGateBR312LedgerGuard") === "1";
}

function hasGateBR321CoordinateLiveGeometryRoute() {
  const params = new URLSearchParams(location.search);
  return isLocalhost() && params.get("laibePdfGateBR321CoordinateLiveGeometry") === "1";
}

function hasGateBR322PredicateDualExtractionRoute() {
  const params = new URLSearchParams(location.search);
  return isLocalhost() && params.get("laibePdfGateBR322PredicateDualClosure") === "1";
}

function hasGateBR323FixturePurityRoute() {
  const params = new URLSearchParams(location.search);
  return isLocalhost() && params.get("laibePdfGateBR323FixturePurity") === "1";
}

function hasGateBR324ImmutableLocatorReceiptRoute() {
  const params = new URLSearchParams(location.search);
  return isLocalhost() && params.get("laibePdfGateBR324ImmutableLocatorReceipt") === "1";
}

function hasGateBR4ASemanticCategoryRoute() {
  const params = new URLSearchParams(location.search);
  return isLocalhost() && params.get("laibePdfGateBR4A") === "1";
}

function hasGateBR4A1SemanticIntegrityRoute() {
  const params = new URLSearchParams(location.search);
  return isLocalhost() && params.get("laibePdfGateBR4A1") === "1";
}

function waitFor(predicate, label, timeoutMs = 10000) {
  const started = performance.now();
  return new Promise((resolve, reject) => {
    function tick() {
      const value = predicate();
      if (value) {
        resolve(value);
        return;
      }
      if (performance.now() - started > timeoutMs) {
        reject(new Error(label + " is unavailable."));
        return;
      }
      setTimeout(tick, 40);
    }
    tick();
  });
}

function getProjectCounts() {
  const project = window.laibePlanPuzzleProject || {};
  const review = project.pdfReviewObjects || {};
  return {
    walls: Array.isArray(project.walls) ? project.walls.length : null,
    structures: Array.isArray(project.structures) ? project.structures.length : null,
    structuralObjects: Array.isArray(project.structuralObjects) ? project.structuralObjects.length : null,
    zones: Array.isArray(project.zones) ? project.zones.length : null,
    openings: Array.isArray(project.openings) ? project.openings.length : null,
    furniture: Array.isArray(project.furniture) ? project.furniture.length : null,
    reviewText: Array.isArray(review.text) ? review.text.length : null,
    reviewLines: Array.isArray(review.lines) ? review.lines.length : null,
    reviewShapes: Array.isArray(review.shapes) ? review.shapes.length : null,
    importSourceKind: project.importSource && project.importSource.kind ? String(project.importSource.kind) : null
  };
}

function sameCounts(a, b) {
  return stableStringify(a) === stableStringify(b);
}

function projectMutationObservation(before, after) {
  const preserved = sameCounts(before, after);
  return {
    before,
    after,
    changed: preserved === false,
    preserved,
    expectedForFreshProductionImportRound: true
  };
}

function evaluateR4A1ProjectMutationReceipt(receipt) {
  const projectMutation = receipt && receipt.projectMutation || {};
  const run1 = projectMutation.run1 || {};
  const run2 = projectMutation.run2 || {};
  const beforeAfterEqual = sameCounts(run1.before, run1.after) && sameCounts(run2.before, run2.after);
  const rules = {
    run1ChangedFalse: run1.changed === false,
    run2ChangedFalse: run2.changed === false,
    aggregateChangedFalse: projectMutation.changed === false,
    preservedFlagTrue: projectMutation.preserved === true,
    beforeAfterEqual,
    runFlagsAgreeWithObservations: run1.preserved === beforeAfterEqual && run2.preserved === beforeAfterEqual
  };
  const failedRules = Object.keys(rules).filter((key) => rules[key] !== true);
  return {
    schema: "laibe.planPuzzle.gateB.r4a_1.projectMutationPredicate.v1",
    rules,
    failedRules,
    pass: failedRules.length === 0
  };
}

function createR4A1ProjectMutationNegativeGuards(receipt) {
  const changedFixture = structuredClone(receipt);
  changedFixture.projectMutation.run1.changed = true;
  const changedResult = evaluateR4A1ProjectMutationReceipt(changedFixture);
  const equalityFixture = structuredClone(receipt);
  equalityFixture.projectMutation.run2.after = { ...(equalityFixture.projectMutation.run2.after || {}), __r4a1MutationProbe: 1 };
  const equalityResult = evaluateR4A1ProjectMutationReceipt(equalityFixture);
  return {
    schema: "laibe.planPuzzle.gateB.r4a_1.projectMutationNegativeGuards.v1",
    changedRunGuard: changedResult,
    beforeAfterEqualityGuard: equalityResult,
    allGuardsPass: changedResult.pass === false && equalityResult.pass === false
  };
}

function textItemBox(item) {
  const tr = item && item.transform || [];
  const x = Number(tr[4]);
  const y = Number(tr[5]);
  const width = Math.max(1, Number(item && item.width) || 0);
  const height = Math.max(1, Math.abs(Number(tr[3]) || Number(item && item.height) || 0));
  if (![x, y].every(Number.isFinite)) return null;
  return { x, y, width, height, x0: x, y0: y, x1: x + width, y1: y + height, centerX: x + width / 2, centerY: y + height / 2 };
}

function boundsFromArray(bbox) {
  if (!Array.isArray(bbox) || bbox.length < 4) return null;
  const [x0Raw, y0Raw, x1Raw, y1Raw] = bbox.map(Number);
  if (![x0Raw, y0Raw, x1Raw, y1Raw].every(Number.isFinite)) return null;
  const x0 = Math.min(x0Raw, x1Raw);
  const y0 = Math.min(y0Raw, y1Raw);
  const x1 = Math.max(x0Raw, x1Raw);
  const y1 = Math.max(y0Raw, y1Raw);
  return { x: x0, y: y0, width: x1 - x0, height: y1 - y0, x0, y0, x1, y1 };
}

function roundFrame(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return null;
  return Math.round(number * 1000) / 1000;
}

function gateA2PointToScenePoint(point, pageHeightPt = PDF_PAGE_HEIGHT_PT) {
  if (!Array.isArray(point) || point.length < 2) return null;
  const x = Number(point[0]);
  const y = Number(point[1]);
  if (![x, y, pageHeightPt].every(Number.isFinite)) return null;
  return [roundFrame(x), roundFrame(pageHeightPt - y)];
}

function scenePointToGateA2Point(point, pageHeightPt = PDF_PAGE_HEIGHT_PT) {
  return gateA2PointToScenePoint(point, pageHeightPt);
}

function gateA2BboxToSceneBbox(bbox, pageHeightPt = PDF_PAGE_HEIGHT_PT) {
  if (!Array.isArray(bbox) || bbox.length < 4) return null;
  const [x0Raw, y0Raw, x1Raw, y1Raw] = bbox.map(Number);
  if (![x0Raw, y0Raw, x1Raw, y1Raw, pageHeightPt].every(Number.isFinite)) return null;
  const x0 = Math.min(x0Raw, x1Raw);
  const y0 = Math.min(y0Raw, y1Raw);
  const x1 = Math.max(x0Raw, x1Raw);
  const y1 = Math.max(y0Raw, y1Raw);
  return [roundFrame(x0), roundFrame(pageHeightPt - y1), roundFrame(x1), roundFrame(pageHeightPt - y0)];
}

function sceneBboxToGateA2Bbox(bbox, pageHeightPt = PDF_PAGE_HEIGHT_PT) {
  return gateA2BboxToSceneBbox(bbox, pageHeightPt);
}

function maxAbsResidual(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return null;
  let max = 0;
  for (let index = 0; index < a.length; index += 1) {
    const left = Number(a[index]);
    const right = Number(b[index]);
    if (![left, right].every(Number.isFinite)) return null;
    max = Math.max(max, Math.abs(left - right));
  }
  return roundFrame(max);
}

function coordinateFrameRoundTripForBbox(bbox, pageHeightPt = PDF_PAGE_HEIGHT_PT) {
  const sceneBbox = gateA2BboxToSceneBbox(bbox, pageHeightPt);
  const inverseBbox = sceneBboxToGateA2Bbox(sceneBbox, pageHeightPt);
  return {
    sourceBbox: Array.isArray(bbox) ? bbox.map(roundFrame) : null,
    sceneBbox,
    inverseBbox,
    maxResidualPt: maxAbsResidual(Array.isArray(bbox) ? bbox.map(Number) : null, inverseBbox)
  };
}

function pageBounds(viewport) {
  return { x: 0, y: 0, width: viewport.width, height: viewport.height, x0: 0, y0: 0, x1: viewport.width, y1: viewport.height };
}

function regionFromHit(id, label, hit, bounds, method, extra = {}) {
  const requestedPage = Math.floor(Number(extra && extra.pageNumber));
  const pageNumber = Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  return {
    sourceRegionId: id,
    label,
    pageIndex: pageNumber - 1,
    pageNumber,
    observed: true,
    method,
    labelText: hit && hit.text ? hit.text : null,
    labelBBoxPt: hit && hit.bbox ? hit.bbox : null,
    boundsPt: bounds,
    localCoordinateFrame: "page-" + String(pageNumber) + "-local-pt",
    coordinate_frame: "page-" + String(pageNumber) + "-local-pt",
    semantic_status: "unresolved",
    human_confirmation_required: true,
    ...extra
  };
}

async function detectRegions(page, viewport) {
  const fullBounds = pageBounds(viewport);
  const regions = [regionFromHit("page-1-full", "page-1-full", null, fullBounds, "pdfjs-page-viewport", {
    semantic_status: "page_reference",
    human_confirmation_required: false,
    floor_semantic: false
  })];
  const hits = { threeF: null, roofF: null };
  try {
    const text = await page.getTextContent({ includeMarkedContent: true, disableNormalization: false });
    (text.items || []).forEach((item) => {
      const normalized = String(item.str || "").replace(/\s+/g, " ").trim();
      if (!normalized) return;
      const bbox = textItemBox(item);
      if (!bbox) return;
      if (!hits.threeF && /(^|[^A-Z0-9])3\s*F([^A-Z0-9]|$)|3F|3樓|三樓/i.test(normalized)) {
        hits.threeF = { text: normalized, bbox };
      }
      if (!hits.roofF && /(^|[^A-Z0-9])R\s*F([^A-Z0-9]|$)|RF|roof|屋突|頂樓|頂層/i.test(normalized)) {
        hits.roofF = { text: normalized, bbox };
      }
    });
  } catch (error) {
    return { status: "text-region-error", regions, error: error && error.message ? error.message : String(error) };
  }
  return {
    status: hits.threeF || hits.roofF ? "text-label-hints-unresolved" : "semantic-region-unresolved",
    regions,
    hits,
    semantic_status: "unresolved",
    human_confirmation_required: true
  };
}

function pointFromCandidate(value) {
  if (!value || typeof value !== "object") return null;
  const x = Number(value.x);
  const y = Number(value.y);
  return Number.isFinite(x) && Number.isFinite(y) ? { x, y } : null;
}

function pushCandidatePoint(points, point) {
  if (point && Number.isFinite(point.x) && Number.isFinite(point.y)) {
    points.push(point);
  }
}

function collectExtractorPoints(raw) {
  const points = [];
  (Array.isArray(raw && raw.walls) ? raw.walls : []).forEach((wall) => {
    pushCandidatePoint(points, pointFromCandidate(wall.pageFrom));
    pushCandidatePoint(points, pointFromCandidate(wall.pageTo));
  });
  (Array.isArray(raw && raw.columns) ? raw.columns : []).forEach((column) => {
    if (column.pageBox) {
      const x0 = Number(column.pageBox.x0);
      const y0 = Number(column.pageBox.y0);
      const x1 = Number(column.pageBox.x1);
      const y1 = Number(column.pageBox.y1);
      if ([x0, y0, x1, y1].every(Number.isFinite)) {
        pushCandidatePoint(points, { x: (x0 + x1) / 2, y: (y0 + y1) / 2 });
      }
    }
    pushCandidatePoint(points, pointFromCandidate(column.pageCenter));
  });
  (Array.isArray(raw && raw.axisLines) ? raw.axisLines : []).forEach((axis) => {
    pushCandidatePoint(points, pointFromCandidate(axis.pageFrom));
    pushCandidatePoint(points, pointFromCandidate(axis.pageTo));
  });
  return points;
}

function boundsFromPoints(points) {
  if (!points.length) return null;
  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  const x0 = Math.min(...xs);
  const x1 = Math.max(...xs);
  const y0 = Math.min(...ys);
  const y1 = Math.max(...ys);
  return { x: x0, y: y0, width: x1 - x0, height: y1 - y0, x0, y0, x1, y1 };
}

function bestSplit(points, axis, totalSpan) {
  const values = points.map((point) => point[axis]).filter(Number.isFinite).sort((a, b) => a - b);
  if (values.length < 12 || totalSpan <= 0) return null;
  let best = null;
  for (let index = 4; index < values.length - 4; index += 1) {
    const gap = values[index] - values[index - 1];
    if (!best || gap > best.gap) {
      best = { gap, at: (values[index] + values[index - 1]) / 2, leftCount: index, rightCount: values.length - index };
    }
  }
  if (!best || best.gap < totalSpan * 0.08) return null;
  return best;
}

function dimensionAxisCenter(axis) {
  const from = axis && axis.pageFrom;
  const to = axis && axis.pageTo;
  if (!from || !to || ![from.x, from.y, to.x, to.y].every((value) => Number.isFinite(Number(value)))) return null;
  return { x: (Number(from.x) + Number(to.x)) / 2, y: (Number(from.y) + Number(to.y)) / 2 };
}

function dimensionAxisSide(axis, coordinate, splitAt) {
  const from = axis && axis.pageFrom;
  const to = axis && axis.pageTo;
  if (!from || !to) return null;
  const first = Number(from[coordinate]);
  const second = Number(to[coordinate]);
  if (![first, second, splitAt].every(Number.isFinite)) return null;
  if (Math.max(first, second) <= splitAt) return "a";
  if (Math.min(first, second) >= splitAt) return "b";
  return null;
}

function sourcePageNumber(raw) {
  const pageNumber = Math.floor(Number(raw && raw.pageNumber));
  return Number.isInteger(pageNumber) && pageNumber > 0 ? pageNumber : 1;
}

function deriveDimensionEvidenceRegions(raw, viewport) {
  const pageNumber = sourcePageNumber(raw);
  const pagePrefix = "page-" + String(pageNumber);
  const pageMeta = { pageIndex: pageNumber - 1, pageNumber };
  const axes = (Array.isArray(raw && raw.axisLines) ? raw.axisLines : [])
    .filter((axis) => axis
      && ["horizontal", "vertical"].includes(axis.orientation)
      && Number(axis.axisSpanPt) > 0
      && (axis.regionSegmentationEligible === true || axis.dimensionAxisEvidence?.regionSegmentationEligible === true))
    .map((axis) => ({ axis, center: dimensionAxisCenter(axis) }))
    .filter((entry) => entry.center);
  if (axes.length < 4) return null;
  const candidates = ["x", "y"].flatMap((coordinate) => {
    const values = axes.slice().sort((left, right) => left.center[coordinate] - right.center[coordinate] || String(left.axis.id).localeCompare(String(right.axis.id)));
    const extent = Math.max(...values.map((entry) => entry.center[coordinate])) - Math.min(...values.map((entry) => entry.center[coordinate]));
    if (!(extent > 0)) return [];
    return values.slice(1, -1).flatMap((entry, index) => {
      const prior = values[index];
      const gap = entry.center[coordinate] - prior.center[coordinate];
      const splitAt = (entry.center[coordinate] + prior.center[coordinate]) / 2;
      if (!(gap > Math.max(6, extent * 0.06))) return [];
      const grouped = { a: [], b: [] };
      for (const item of axes) {
        const side = dimensionAxisSide(item.axis, coordinate, splitAt);
        if (!side) return [];
        grouped[side].push(item.axis);
      }
      const coversOrientations = (items) => ["horizontal", "vertical"].every((orientation) => items.some((axis) => axis.orientation === orientation));
      if (!coversOrientations(grouped.a) || !coversOrientations(grouped.b)) return [];
      return [{ coordinate, splitAt, gap, gapRatio: gap / extent, grouped }];
    });
  }).sort((left, right) => right.gapRatio - left.gapRatio || left.coordinate.localeCompare(right.coordinate) || left.splitAt - right.splitAt);
  const selected = candidates[0] || null;
  if (!selected) return null;
  const fullBounds = pageBounds(viewport);
  const firstBounds = selected.coordinate === "x"
    ? { x: 0, y: 0, width: selected.splitAt, height: viewport.height, x0: 0, y0: 0, x1: selected.splitAt, y1: viewport.height }
    : { x: 0, y: 0, width: viewport.width, height: selected.splitAt, x0: 0, y0: 0, x1: viewport.width, y1: selected.splitAt };
  const secondBounds = selected.coordinate === "x"
    ? { x: selected.splitAt, y: 0, width: viewport.width - selected.splitAt, height: viewport.height, x0: selected.splitAt, y0: 0, x1: viewport.width, y1: viewport.height }
    : { x: 0, y: selected.splitAt, width: viewport.width, height: viewport.height - selected.splitAt, x0: 0, y0: selected.splitAt, x1: viewport.width, y1: viewport.height };
  const method = "dimension-axis-orientation-complete-cluster-split-" + selected.coordinate;
  const firstRegionId = pagePrefix + "-dimension-cluster-a";
  const secondRegionId = pagePrefix + "-dimension-cluster-b";
  const regions = [
    regionFromHit(pagePrefix + "-full", pagePrefix + "-full", null, fullBounds, "pdfjs-page-viewport", { ...pageMeta, semantic_status: "page_reference", human_confirmation_required: false, floor_semantic: false }),
    regionFromHit(firstRegionId, "dimension evidence cluster A", null, firstBounds, method, { ...pageMeta, semantic_status: "geometry_evidence_bound", human_confirmation_required: true, floor_semantic: false, dimension_evidence_region: true }),
    regionFromHit(secondRegionId, "dimension evidence cluster B", null, secondBounds, method, { ...pageMeta, semantic_status: "geometry_evidence_bound", human_confirmation_required: true, floor_semantic: false, dimension_evidence_region: true }),
    regionFromHit(pagePrefix + "-unassigned", "unassigned/no dimension evidence region", null, fullBounds, method, { ...pageMeta, semantic_status: "unresolved", human_confirmation_required: true, floor_semantic: false, excluded_from_floor_assignment: true })
  ];
  return {
    status: "dimension-evidence-regions-derived",
    semantic_status: "geometry_evidence_bound",
    human_confirmation_required: true,
    profileApplied: false,
    regions,
    geometryCluster: {
      axis: selected.coordinate,
      splitAt: Number(selected.splitAt.toFixed(6)),
      gapRatio: Number(selected.gapRatio.toFixed(6)),
      sourceDimensionAxisCount: axes.length,
      regions: {
        [firstRegionId]: selected.grouped.a.map((axis) => axis.id).sort(),
        [secondRegionId]: selected.grouped.b.map((axis) => axis.id).sort()
      }
    }
  };
}

function finiteRegionBox(box) {
  if (!box || ![box.x0, box.y0, box.x1, box.y1].every((value) => Number.isFinite(Number(value)))) return null;
  const x0 = Math.min(Number(box.x0), Number(box.x1));
  const y0 = Math.min(Number(box.y0), Number(box.y1));
  const x1 = Math.max(Number(box.x0), Number(box.x1));
  const y1 = Math.max(Number(box.y0), Number(box.y1));
  return { x: x0, y: y0, width: x1 - x0, height: y1 - y0, x0, y0, x1, y1 };
}

function regionBoxCenter(box) {
  const normalized = finiteRegionBox(box);
  return normalized ? { x: (normalized.x0 + normalized.x1) / 2, y: (normalized.y0 + normalized.y1) / 2 } : null;
}

function pointInRegionBox(point, box) {
  const normalized = finiteRegionBox(box);
  return Boolean(point && normalized && point.x >= normalized.x0 && point.x <= normalized.x1 && point.y >= normalized.y0 && point.y <= normalized.y1);
}

function floorCandidateDescriptor(candidate) {
  const descriptor = candidate && candidate.floorDescriptor;
  const normalizedToken = String(candidate && candidate.normalizedFloorToken || "").trim();
  if (!descriptor || !normalizedToken || !["numbered_floor", "basement_floor", "roof_floor", "ground_floor", "mezzanine_floor", "penthouse_floor"].includes(descriptor.kind)) return null;
  const ordinal = descriptor.ordinal == null ? null : Number(descriptor.ordinal);
  if (ordinal != null && (!Number.isInteger(ordinal) || ordinal < 0)) return null;
  return { kind: descriptor.kind, ordinal, normalizedToken };
}

function normalizedFloorCandidate(candidate, rawPageNumber) {
  const box = finiteRegionBox(candidate && candidate.pageBox);
  const frame = String(candidate && (candidate.coordinateFrame || candidate.coordinate_frame) || "");
  const descriptor = floorCandidateDescriptor(candidate);
  if (!candidate || candidate.accepted !== true || candidate.rejected === true) return { candidate, box, descriptor, accepted: false, reason: "extractor_candidate_not_accepted" };
  const candidatePage = Math.floor(Number(candidate.page));
  if (!Number.isInteger(candidatePage) || candidatePage <= 0 || candidatePage !== rawPageNumber) return { candidate, box, descriptor, accepted: false, reason: "candidate_page_does_not_match_raw_page" };
  if (frame !== "page-bottom-left-pdf-pt") return { candidate, box, descriptor, accepted: false, reason: "unsupported_or_cross_frame_candidate" };
  if (!box || !descriptor) return { candidate, box, descriptor, accepted: false, reason: "malformed_floor_semantic_candidate" };
  const confidence = Number(candidate.confidence);
  const margin = Number(candidate.runnerUpMargin);
  if (!(confidence >= 0.5) || !(margin >= 0.04)) return { candidate, box, descriptor, accepted: false, reason: "extractor_confidence_or_margin_not_sufficient" };
  return { candidate, box, descriptor, accepted: true, reason: "extractor_floor_semantic_candidate_accepted" };
}

function axisSourcePage(axis, fallbackPageNumber) {
  const explicit = axis && (axis.pageNumber ?? axis.page);
  if (explicit == null) return fallbackPageNumber;
  const page = Math.floor(Number(explicit));
  return Number.isInteger(page) && page > 0 ? page : null;
}

function axisProjectionSupport(axis, candidateBox, regionBox) {
  const from = axis && axis.pageFrom;
  const to = axis && axis.pageTo;
  const candidateCenter = regionBoxCenter(candidateBox);
  const region = finiteRegionBox(regionBox);
  const orientation = axis && axis.orientation;
  if (!from || !to || !candidateCenter || !region || ![from.x, from.y, to.x, to.y].every((value) => Number.isFinite(Number(value))) || !["horizontal", "vertical"].includes(orientation)) return null;
  const horizontal = orientation === "horizontal";
  const mainStart = Math.min(Number(from[horizontal ? "x" : "y"]), Number(to[horizontal ? "x" : "y"]));
  const mainEnd = Math.max(Number(from[horizontal ? "x" : "y"]), Number(to[horizontal ? "x" : "y"]));
  const cross = (Number(from[horizontal ? "y" : "x"]) + Number(to[horizontal ? "y" : "x"])) / 2;
  const regionMainStart = horizontal ? region.x0 : region.y0;
  const regionMainEnd = horizontal ? region.x1 : region.y1;
  const regionCrossStart = horizontal ? region.y0 : region.x0;
  const regionCrossEnd = horizontal ? region.y1 : region.x1;
  const candidateMain = horizontal ? candidateCenter.x : candidateCenter.y;
  const axisSpan = Math.max(0.001, mainEnd - mainStart);
  const overlap = Math.max(0, Math.min(mainEnd, regionMainEnd) - Math.max(mainStart, regionMainStart));
  const regionSpan = Math.max(0.001, regionMainEnd - regionMainStart);
  const coverage = Math.min(1, overlap / Math.min(axisSpan, regionSpan));
  const candidateCovered = candidateMain >= mainStart && candidateMain <= mainEnd;
  const crossWithinRegion = cross >= regionCrossStart && cross <= regionCrossEnd;
  return {
    id: axis.id || null,
    orientation,
    candidateCovered,
    crossWithinRegion,
    coverage: Number(coverage.toFixed(6)),
    support: candidateCovered && crossWithinRegion && coverage > 0
  };
}

function floorTopologyEvidence(raw, dimensionRegions, region, candidateBox) {
  const rawPageNumber = sourcePageNumber(raw);
  const geometryCluster = dimensionRegions && dimensionRegions.geometryCluster || {};
  const memberMap = geometryCluster.regions || {};
  const memberIds = Array.isArray(memberMap[region && region.sourceRegionId]) ? memberMap[region.sourceRegionId].slice().sort() : [];
  const axisById = new Map((Array.isArray(raw && raw.axisLines) ? raw.axisLines : []).map((axis) => [axis && axis.id, axis]).filter(([id]) => Boolean(id)));
  const base = {
    topologyWitnessAxisIds: [],
    topologyOrientationCoverage: {
      horizontal: { axisCount: 0, supportCount: 0, coverage: 0, witnessAxisIds: [] },
      vertical: { axisCount: 0, supportCount: 0, coverage: 0, witnessAxisIds: [] }
    },
    topologySupportCount: 0,
    topologyScore: 0,
    topologyPass: false,
    topologyFailureReason: null
  };
  if (!region || Number(region.pageNumber) !== rawPageNumber) return { ...base, topologyFailureReason: "cross_page_geometry_cluster" };
  if (!memberIds.length) return { ...base, topologyFailureReason: "missing_geometry_cluster_axis_membership" };
  const missingAxisIds = memberIds.filter((id) => !axisById.has(id));
  if (missingAxisIds.length) return { ...base, topologyFailureReason: "unresolved_geometry_cluster_axis" };
  const axisRows = memberIds.map((id) => axisById.get(id));
  if (axisRows.some((axis) => axisSourcePage(axis, rawPageNumber) !== rawPageNumber)) return { ...base, topologyFailureReason: "cross_page_axis" };
  const supportRows = axisRows.map((axis) => axisProjectionSupport(axis, candidateBox, region.boundsPt)).filter(Boolean);
  const coverage = ["horizontal", "vertical"].reduce((result, orientation) => {
    const rows = supportRows.filter((row) => row.orientation === orientation);
    const witnesses = rows.filter((row) => row.support && row.id).map((row) => row.id).sort();
    result[orientation] = {
      axisCount: rows.length,
      supportCount: witnesses.length,
      coverage: rows.length ? Number((rows.reduce((sum, row) => sum + (row.support ? row.coverage : 0), 0) / rows.length).toFixed(6)) : 0,
      witnessAxisIds: witnesses
    };
    return result;
  }, {});
  const topologyWitnessAxisIds = coverage.horizontal.witnessAxisIds.concat(coverage.vertical.witnessAxisIds).sort();
  const minimumCoverage = Math.min(coverage.horizontal.coverage, coverage.vertical.coverage);
  const topologyPass = coverage.horizontal.supportCount > 0 && coverage.vertical.supportCount > 0;
  const topologyFailureReason = topologyPass ? null : (coverage.horizontal.supportCount === 0 ? "missing_horizontal_projection_support" : "missing_vertical_projection_support");
  return {
    topologyWitnessAxisIds,
    topologyOrientationCoverage: coverage,
    topologySupportCount: topologyWitnessAxisIds.length,
    topologyScore: topologyPass ? Number((0.5 + 0.5 * minimumCoverage).toFixed(6)) : 0,
    topologyPass,
    topologyFailureReason
  };
}

function floorClusterMatchScore(candidateBox, regionBox, topology) {
  const candidateCenter = regionBoxCenter(candidateBox);
  const center = regionBoxCenter(regionBox);
  const region = finiteRegionBox(regionBox);
  if (!candidateCenter || !center || !region) return null;
  const contained = pointInRegionBox(candidateCenter, region);
  const distance = Math.hypot(candidateCenter.x - center.x, candidateCenter.y - center.y);
  const radius = Math.max(1, Math.hypot(region.width, region.height) / 2);
  const proximity = Math.max(0, 1 - distance / radius);
  const terms = {
    containment: contained ? 1 : 0,
    proximity: Number(proximity.toFixed(6)),
    topology: Number(topology && topology.topologyScore || 0)
  };
  const weights = { containment: 0.5, proximity: 0.2, topology: 0.3 };
  const score = weights.containment * terms.containment + weights.proximity * terms.proximity + weights.topology * terms.topology;
  return { score: Number(score.toFixed(6)), scoreTerms: terms, scoreWeights: weights, contained, proximity: terms.proximity, distancePt: Number(distance.toFixed(6)), ...(topology || {}) };
}

function floorRegionSlug(value) {
  return String(value || "floor").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 48) || "floor";
}

function sourceDerivedFloorRegionId(candidate, descriptor) {
  const box = finiteRegionBox(candidate && candidate.pageBox);
  const sourceKey = [candidate && candidate.id, box && box.x0, box && box.y0, box && box.x1, box && box.y1].join(":");
  const geometryKey = sourceKey.replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(-56) || "glyph";
  return "page-" + String(candidate && candidate.page || 1) + "-floor-" + floorRegionSlug(descriptor.normalizedToken) + "-" + geometryKey;
}

function deriveFloorSemanticCorrespondence(raw, dimensionRegions) {
  const rawPageNumber = sourcePageNumber(raw);
  const regions = Array.isArray(dimensionRegions && dimensionRegions.regions) ? dimensionRegions.regions : [];
  const clusters = regions.filter((region) => region && region.dimension_evidence_region && finiteRegionBox(region.boundsPt));
  const allCandidates = Array.isArray(raw && raw.floorSemanticGlyphCandidates) ? raw.floorSemanticGlyphCandidates : [];
  const normalizedCandidates = allCandidates.map((candidate) => normalizedFloorCandidate(candidate, rawPageNumber));
  const rejectedCandidates = normalizedCandidates.filter((entry) => !entry.accepted).map((entry) => ({ id: entry.candidate && entry.candidate.id || null, reason: entry.reason })).sort((left, right) => String(left.id).localeCompare(String(right.id)));
  const candidates = normalizedCandidates.filter((entry) => entry.accepted).sort((left, right) => String(left.candidate.id).localeCompare(String(right.candidate.id)));
  const correspondence = {
    schema: "laibe.planPuzzle.floorSemanticGeometryCorrespondence.v1",
    coordinateFrame: "page-bottom-left-pdf-pt",
    page: rawPageNumber,
    candidateCount: allCandidates.length,
    acceptedCandidateCount: candidates.length,
    rejectedCandidates,
    clusterCount: clusters.length,
    assignments: []
  };
  if (clusters.length < 2 || candidates.length < clusters.length) {
    correspondence.status = "insufficient_floor_semantic_or_geometry_evidence";
    return { ...dimensionRegions, status: correspondence.status, human_confirmation_required: true, floorSemanticCorrespondence: correspondence };
  }
  const scores = clusters.flatMap((region) => candidates.map((entry) => {
    const topology = floorTopologyEvidence(raw, dimensionRegions, region, entry.box);
    const metrics = floorClusterMatchScore(entry.box, region.boundsPt, topology);
    return metrics ? { region, entry, ...metrics } : null;
  }).filter(Boolean));
  const candidateBest = new Map();
  const clusterBest = new Map();
  candidates.forEach((entry) => {
    const ranked = scores.filter((score) => score.entry === entry).sort((left, right) => right.score - left.score || right.topologyScore - left.topologyScore || String(left.region.sourceRegionId).localeCompare(String(right.region.sourceRegionId)));
    candidateBest.set(entry, { best: ranked[0] || null, runnerUp: ranked[1] || null });
  });
  clusters.forEach((region) => {
    const ranked = scores.filter((score) => score.region === region).sort((left, right) => right.score - left.score || right.topologyScore - left.topologyScore || String(left.entry.candidate.id).localeCompare(String(right.entry.candidate.id)));
    clusterBest.set(region, { best: ranked[0] || null, runnerUp: ranked[1] || null });
  });
  const usedCandidates = new Set();
  const replacements = new Map();
  clusters.slice().sort((left, right) => String(left.sourceRegionId).localeCompare(String(right.sourceRegionId))).forEach((region) => {
    const ranked = clusterBest.get(region) || {};
    const best = ranked.best;
    const runnerUp = ranked.runnerUp;
    const margin = best ? Number((best.score - (runnerUp ? runnerUp.score : 0)).toFixed(6)) : null;
    const topologyMargin = best ? Number((best.topologyScore - (runnerUp ? runnerUp.topologyScore : 0)).toFixed(6)) : null;
    const candidateRank = best && candidateBest.get(best.entry) || {};
    const reverseMargin = candidateRank.best ? Number((candidateRank.best.score - (candidateRank.runnerUp ? candidateRank.runnerUp.score : 0)).toFixed(6)) : null;
    const reverseTopologyMargin = candidateRank.best ? Number((candidateRank.best.topologyScore - (candidateRank.runnerUp ? candidateRank.runnerUp.topologyScore : 0)).toFixed(6)) : null;
    let reason = "unique_source_text_geometry_correspondence";
    if (!best) reason = "no_geometry_correspondence_candidate";
    else if (!best.topologyPass) reason = best.topologyFailureReason || "topology_projection_support_not_sufficient";
    else if (!best.contained) reason = "candidate_not_contained_by_geometry_cluster";
    else if (best.score < 0.7) reason = "minimum_geometry_correspondence_score";
    else if (runnerUp && runnerUp.topologyPass && topologyMargin === 0) reason = "equal_topology_support";
    else if (!(margin >= 0.12)) reason = "geometry_cluster_margin_not_unique";
    else if (candidateRank.runnerUp && candidateRank.runnerUp.topologyPass && reverseTopologyMargin === 0) reason = "equal_reverse_topology_support";
    else if (candidateRank.best !== best || !(reverseMargin >= 0.12)) reason = "candidate_to_cluster_margin_not_unique";
    else if (usedCandidates.has(best.entry)) reason = "candidate_already_assigned_to_another_cluster";
    const assignment = {
      geometryClusterId: region.sourceRegionId,
      candidateId: best && best.entry.candidate.id || null,
      score: best && best.score || null,
      scoreTerms: best && best.scoreTerms || null,
      scoreWeights: best && best.scoreWeights || null,
      competitorId: runnerUp && runnerUp.entry.candidate.id || null,
      margin,
      reverseMargin,
      topologyScore: best && best.topologyScore || 0,
      topologyPass: Boolean(best && best.topologyPass),
      topologyWitnessAxisIds: best && best.topologyWitnessAxisIds || [],
      topologyOrientationCoverage: best && best.topologyOrientationCoverage || null,
      topologySupportCount: best && best.topologySupportCount || 0,
      topologyFailureReason: best && best.topologyFailureReason || null,
      topologyMargin,
      reverseTopologyMargin,
      contained: Boolean(best && best.contained),
      proximity: best && best.proximity || null,
      distancePt: best && best.distancePt || null,
      accepted: reason === "unique_source_text_geometry_correspondence",
      reason
    };
    correspondence.assignments.push(assignment);
    if (!assignment.accepted) return;
    usedCandidates.add(best.entry);
    const candidate = best.entry.candidate;
    const descriptor = best.entry.descriptor;
    replacements.set(region.sourceRegionId, {
      ...region,
      sourceRegionId: sourceDerivedFloorRegionId(candidate, descriptor),
      label: candidate.rawToken,
      labelText: candidate.rawToken,
      labelBBoxPt: best.entry.box,
      sourceGlyphId: candidate.id,
      sourceGlyphBBoxPt: best.entry.box,
      floorDescriptor: descriptor,
      floor_semantic: true,
      semantic_status: "source_text_geometry_correspondence",
      human_confirmation_required: false,
      method: "outlined-floor-semantic-glyph-to-geometry-cluster-unique-best",
      correspondence: assignment
    });
  });
  const mappedRegions = regions.map((region) => replacements.get(region.sourceRegionId) || region);
  const acceptedCount = correspondence.assignments.filter((assignment) => assignment.accepted).length;
  correspondence.status = acceptedCount === clusters.length ? "source_text_geometry_correspondence" : "floor_semantic_correspondence_unresolved";
  return {
    ...dimensionRegions,
    status: correspondence.status,
    semantic_status: acceptedCount === clusters.length ? "source_text_geometry_correspondence" : dimensionRegions.semantic_status,
    human_confirmation_required: acceptedCount !== clusters.length,
    regions: mappedRegions,
    floorSemanticCorrespondence: correspondence
  };
}

function sourceDerivedNumberedFloor(region, ordinal) {
  const descriptor = region && region.floorDescriptor;
  return region && region.semantic_status === "source_text_geometry_correspondence" && descriptor && descriptor.kind === "numbered_floor" && Number(descriptor.ordinal) === ordinal;
}

function sourceDerivedRoofFloor(region) {
  const descriptor = region && region.floorDescriptor;
  return region && region.semantic_status === "source_text_geometry_correspondence" && descriptor && descriptor.kind === "roof_floor";
}

function applyHumanVerifiedSourceProfile(sourceSha256, viewport, currentResult) {
  const normalizedSha = String(sourceSha256 || "").toUpperCase();
  const profile = HUMAN_VERIFIED_SOURCE_PROFILES[normalizedSha];
  if (!profile) return null;
  const fullBounds = pageBounds(viewport);
  const fullVisualBounds = { ...fullBounds };
  const sceneAssignmentProfile = {
    schema: "laibe.planPuzzle.gateB.r3_2_1.sceneAssignmentProfile.v1",
    profile_source: profile.profile_source,
    source_sha256: profile.source_sha256,
    source_profile_id: profile.source_profile_id + "-scene-bottom-left",
    evidence_coordinate_frame: profile.coordinate_frame,
    scene_coordinate_frame: profile.runtime_coordinate_frame,
    transform: profile.coordinate_transform,
    regions: profile.regions.map((entry) => ({
      id: entry.id,
      label: entry.label,
      bbox_top_left_pdf_pt: Array.from(entry.bbox),
      bbox_scene_bottom_left_pdf_pt: gateA2BboxToSceneBbox(entry.bbox),
      roundTrip: coordinateFrameRoundTripForBbox(entry.bbox)
    })),
    excluded_areas: profile.excluded_areas.map((entry) => ({
      id: entry.id,
      reason: entry.reason,
      bbox_top_left_pdf_pt: Array.from(entry.bbox),
      bbox_scene_bottom_left_pdf_pt: gateA2BboxToSceneBbox(entry.bbox),
      roundTrip: coordinateFrameRoundTripForBbox(entry.bbox)
    }))
  };
  const regions = [regionFromHit("page-1-full", "page-1-full", null, fullBounds, "pdfjs-page-viewport", {
    semantic_status: "page_reference",
    human_confirmation_required: false,
    floor_semantic: false,
    localCoordinateFrame: profile.runtime_coordinate_frame,
    coordinate_frame: profile.runtime_coordinate_frame,
    visualBoundsPt: fullVisualBounds,
    visualCoordinateFrame: profile.coordinate_frame
  })];
  profile.regions.forEach((entry) => {
    const sceneBbox = gateA2BboxToSceneBbox(entry.bbox);
    regions.push(regionFromHit(entry.id, entry.label, { text: entry.label, bbox: null }, boundsFromArray(sceneBbox), profile.method, {
      profile_source: profile.profile_source,
      source_sha256: profile.source_sha256,
      source_profile_id: profile.source_profile_id,
      coordinate_frame: profile.runtime_coordinate_frame,
      localCoordinateFrame: profile.runtime_coordinate_frame,
      profile_coordinate_frame: profile.coordinate_frame,
      evidence_bbox_top_left_pdf_pt: Array.from(entry.bbox),
      scene_bbox_bottom_left_pdf_pt: sceneBbox,
      visualBoundsPt: boundsFromArray(entry.bbox),
      visualCoordinateFrame: profile.coordinate_frame,
      semantic_status: profile.semantic_status,
      human_confirmation_required: false,
      floor_semantic: true,
      coordinate_transform: profile.coordinate_transform,
      roundTrip: coordinateFrameRoundTripForBbox(entry.bbox)
    }));
  });
  regions.push(regionFromHit("page-1-unassigned", "unassigned/title-block/outside verified floor profile", null, fullBounds, "outside_sha256_bound_human_verified_source_profile", {
    profile_source: profile.profile_source,
    source_sha256: profile.source_sha256,
    source_profile_id: profile.source_profile_id,
    coordinate_frame: profile.runtime_coordinate_frame,
    localCoordinateFrame: profile.runtime_coordinate_frame,
    profile_coordinate_frame: profile.coordinate_frame,
    visualBoundsPt: fullVisualBounds,
    visualCoordinateFrame: profile.coordinate_frame,
    semantic_status: "unassigned_title_or_outside_verified_floor",
    human_confirmation_required: true,
    floor_semantic: false,
    excluded_from_floor_assignment: true,
    coordinate_transform: profile.coordinate_transform
  }));
  return {
    status: "sha256-bound-human-verified-profile-applied",
    semantic_status: "human_verified",
    human_confirmation_required: false,
    profileApplied: true,
    profile,
    sceneAssignmentProfile,
    coordinateTransform: profile.coordinate_transform,
    regions,
    hits: currentResult && currentResult.hits || null
  };
}

function deriveRegionsFromExtractor(raw, viewport, currentResult) {
  // Native import uses geometry clusters from the selected bytes. Historical profiles
  // remain query-gated QA material and cannot assign production source regions.
  const dimensionRegions = deriveDimensionEvidenceRegions(raw, viewport);
  if (dimensionRegions) return deriveFloorSemanticCorrespondence(raw, dimensionRegions);
  const points = collectExtractorPoints(raw);
  const pageNumber = sourcePageNumber(raw);
  const pagePrefix = "page-" + String(pageNumber);
  const pageMeta = { pageIndex: pageNumber - 1, pageNumber };
  const bounds = boundsFromPoints(points);
  if (!bounds) return currentResult;
  const fullBounds = pageBounds(viewport);
  const splitX = bestSplit(points, "x", bounds.width);
  const splitY = bestSplit(points, "y", bounds.height);
  const useX = splitX && (!splitY || splitX.gap / Math.max(1, bounds.width) >= splitY.gap / Math.max(1, bounds.height));
  const useY = !useX && splitY;
  if (!useX && !useY) return currentResult;
  const regions = [regionFromHit(pagePrefix + "-full", pagePrefix + "-full", null, fullBounds, "pdfjs-page-viewport", pageMeta)];
  if (useX) {
    const midX = Math.max(1, Math.min(viewport.width - 1, splitX.at));
    const left = { x: 0, y: 0, width: midX, height: viewport.height, x0: 0, y0: 0, x1: midX, y1: viewport.height };
    const right = { x: midX, y: 0, width: viewport.width - midX, height: viewport.height, x0: midX, y0: 0, x1: viewport.width, y1: viewport.height };
    regions.push(regionFromHit(pagePrefix + "-neutral-cluster-a", "neutral cluster A", { text: "neutral geometry cluster", bbox: null }, left, "extractor-geometry-cluster-split-x", pageMeta));
    regions.push(regionFromHit(pagePrefix + "-neutral-cluster-b", "neutral cluster B", { text: "neutral geometry cluster", bbox: null }, right, "extractor-geometry-cluster-split-x", pageMeta));
    regions.push(regionFromHit(pagePrefix + "-unassigned", "unassigned/no verified floor profile", null, fullBounds, "no_sha256_bound_profile", { ...pageMeta, excluded_from_floor_assignment: true }));
    return { status: "neutral-geometry-clusters-unresolved", semantic_status: "unresolved", human_confirmation_required: true, profileApplied: false, regions, hits: currentResult && currentResult.hits || null, geometryCluster: { axis: "x", splitAt: midX, sourcePointCount: points.length } };
  }
  const midY = Math.max(1, Math.min(viewport.height - 1, splitY.at));
  const lower = { x: 0, y: 0, width: viewport.width, height: midY, x0: 0, y0: 0, x1: viewport.width, y1: midY };
  const upper = { x: 0, y: midY, width: viewport.width, height: viewport.height - midY, x0: 0, y0: midY, x1: viewport.width, y1: viewport.height };
  regions.push(regionFromHit(pagePrefix + "-neutral-cluster-a", "neutral cluster A", { text: "neutral geometry cluster", bbox: null }, lower, "extractor-geometry-cluster-split-y", pageMeta));
  regions.push(regionFromHit(pagePrefix + "-neutral-cluster-b", "neutral cluster B", { text: "neutral geometry cluster", bbox: null }, upper, "extractor-geometry-cluster-split-y", pageMeta));
  regions.push(regionFromHit(pagePrefix + "-unassigned", "unassigned/no verified floor profile", null, fullBounds, "no_sha256_bound_profile", { ...pageMeta, excluded_from_floor_assignment: true }));
  return { status: "neutral-geometry-clusters-unresolved", semantic_status: "unresolved", human_confirmation_required: true, profileApplied: false, regions, hits: currentResult && currentResult.hits || null, geometryCluster: { axis: "y", splitAt: midY, sourcePointCount: points.length } };
}

function ensureQaNode() {
  let node = document.getElementById(QA_NODE_ID);
  if (!node) {
    node = document.createElement("script");
    node.type = "application/json";
    node.id = QA_NODE_ID;
    node.hidden = true;
    (document.head || document.documentElement).appendChild(node);
  }
  return node;
}

function mirrorQaJson(payload) {
  const node = ensureQaNode();
  node.dataset.status = payload && payload.status ? payload.status : "";
  node.dataset.updatedAt = nowIso();
  node.textContent = JSON.stringify(payload);
}

function drawRect(ctx, box, color, label) {
  if (!box || !Number.isFinite(Number(box.x)) || !Number.isFinite(Number(box.y))) return;
  const x = Math.max(0, Number(box.x));
  const y = Math.max(0, Number(box.y));
  const width = Math.max(1, Number(box.width));
  const height = Math.max(1, Number(box.height));
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.strokeRect(x, y, width, height);
  ctx.fillStyle = color;
  ctx.font = "700 18px system-ui, sans-serif";
  ctx.fillText(label, x + 10, Math.max(24, y + 24));
  ctx.restore();
}

function drawFilledRect(ctx, box, color, label) {
  if (!box || !Number.isFinite(Number(box.x)) || !Number.isFinite(Number(box.y))) return;
  const x = Math.max(0, Number(box.x));
  const y = Math.max(0, Number(box.y));
  const width = Math.max(1, Number(box.width));
  const height = Math.max(1, Number(box.height));
  ctx.save();
  ctx.fillStyle = color;
  ctx.fillRect(x, y, width, height);
  ctx.strokeStyle = "rgba(146,64,14,.85)";
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, width, height);
  if (label) {
    ctx.fillStyle = "rgba(146,64,14,.95)";
    ctx.font = "700 16px system-ui, sans-serif";
    ctx.fillText(label, x + 10, Math.max(22, y + 22));
  }
  ctx.restore();
}

function scaledBox(box, scale) {
  if (!box) return null;
  return {
    x: Number(box.x || box.x0 || 0) * scale,
    y: Number(box.y || box.y0 || 0) * scale,
    width: Number(box.width || ((box.x1 || 0) - (box.x0 || 0))) * scale,
    height: Number(box.height || ((box.y1 || 0) - (box.y0 || 0))) * scale
  };
}

async function renderRegionCrop(page, region, scale) {
  const box = region && (region.visualBoundsPt || region.boundsPt);
  if (!box) return null;
  const width = Math.max(1, Math.ceil(Number(box.width || (box.x1 - box.x0)) * scale));
  const height = Math.max(1, Math.ceil(Number(box.height || (box.y1 - box.y0)) * scale));
  const viewport = page.getViewport({ scale });
  const sourceCanvas = document.createElement("canvas");
  sourceCanvas.width = Math.ceil(viewport.width);
  sourceCanvas.height = Math.ceil(viewport.height);
  const sourceCtx = sourceCanvas.getContext("2d", { alpha: false });
  await page.render({ canvasContext: sourceCtx, viewport }).promise;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  canvas.dataset.regionId = region.sourceRegionId;
  canvas.dataset.scale = String(scale);
  canvas.style.cssText = "display:block;background:#fff;border:2px solid #0f172a;margin:8px 0;max-width:none";
  const ctx = canvas.getContext("2d", { alpha: false });
  ctx.drawImage(sourceCanvas, Number(box.x || box.x0 || 0) * scale, Number(box.y || box.y0 || 0) * scale, width, height, 0, 0, width, height);
  drawRect(ctx, { x: 4, y: 4, width: width - 8, height: height - 8 }, region.label === "RF" ? "#2563eb" : "#dc2626", region.label + " 4x");
  return canvas;
}

async function renderDiagnostics(page, regions, payload) {
  if (!isLocalhost()) return null;
  let panel = document.getElementById(QA_PANEL_ID);
  if (!panel) {
    panel = document.createElement("section");
    panel.id = QA_PANEL_ID;
    panel.setAttribute("aria-label", "PDF region truth QA");
    const mount = document.getElementById("planPuzzleCleanShell") || document.body;
    mount.insertBefore(panel, mount.firstChild || null);
  }
  panel.style.setProperty("display", "block", "important");
  panel.style.setProperty("position", "relative", "important");
  panel.style.setProperty("z-index", "2147483000", "important");
  panel.style.setProperty("overflow", "visible", "important");
  panel.style.setProperty("box-sizing", "border-box", "important");
  panel.style.setProperty("margin", "16px", "important");
  panel.style.setProperty("padding", "12px", "important");
  panel.style.setProperty("border", "1px solid rgba(13,148,136,.35)", "important");
  panel.style.setProperty("background", "#f8fafc", "important");
  panel.style.setProperty("color", "#0f172a", "important");
  panel.style.setProperty("font", "14px/1.4 system-ui,'Noto Sans TC',sans-serif", "important");
  panel.innerHTML = "";
  const title = document.createElement("h2");
  title.textContent = "PDF source-region truth QA";
  title.style.cssText = "margin:0 0 8px;font-size:18px";
  panel.appendChild(title);
  const summary = document.createElement("p");
  summary.textContent = "SHA-bound human-verified 3F/RF bboxes are shown below. Title bands remain unassigned.";
  summary.style.cssText = "margin:0 0 12px";
  panel.appendChild(summary);

  const viewport = page.getViewport({ scale: 1.4 });
  const canvas = document.createElement("canvas");
  canvas.width = Math.ceil(viewport.width);
  canvas.height = Math.ceil(viewport.height);
  canvas.style.cssText = "display:block;max-width:100%;background:#fff;border:1px solid #cbd5e1";
  const ctx = canvas.getContext("2d", { alpha: false });
  await page.render({ canvasContext: ctx, viewport }).promise;
  const scale = viewport.scale || 1.4;
  const floorRegions = (regions || []).filter((region) => region.semantic_status === "human_verified" && region.floor_semantic);
  const unassignedRegion = (regions || []).find((region) => region.sourceRegionId === "page-1-unassigned");
  ((payload && payload.regions && payload.regions.excludedAreas) || []).forEach((area) => {
    drawFilledRect(ctx, scaledBox(boundsFromArray(area.bbox), scale), "rgba(251,191,36,.20)", area.id);
  });
  floorRegions.forEach((region) => {
    drawRect(ctx, scaledBox(region.visualBoundsPt || region.boundsPt, scale), region.label === "RF" ? "#2563eb" : "#dc2626", region.label);
  });
  panel.appendChild(canvas);

  const crops = document.createElement("div");
  crops.id = "laibe-pdf-region-truth-crops";
  crops.style.cssText = "display:block;margin-top:14px";
  for (const region of floorRegions) {
    const heading = document.createElement("h3");
    heading.textContent = region.label + " verified 4x crop";
    heading.style.cssText = "margin:16px 0 6px;font-size:16px";
    crops.appendChild(heading);
    const crop = await renderRegionCrop(page, region, 4);
    if (crop) crops.appendChild(crop);
  }
  panel.appendChild(crops);

  const list = document.createElement("div");
  list.style.cssText = "display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:10px;margin-top:10px";
  (regions || []).filter((region) => region.sourceRegionId !== "page-1-full").forEach((region) => {
    const item = document.createElement("div");
    item.textContent = region.label + " / " + region.sourceRegionId + " / " + (region.semantic_status || "unresolved");
    item.style.cssText = "padding:8px;border:1px solid #cbd5e1;background:#fff";
    list.appendChild(item);
  });
  panel.appendChild(list);
  panel.dataset.qaStatus = payload && payload.status ? payload.status : "";
  return {
    panelId: QA_PANEL_ID,
    canvasWidth: canvas.width,
    canvasHeight: canvas.height,
    cropScale: 4,
    cropRegions: floorRegions.map((region) => region.sourceRegionId),
    unassignedRegionId: unassignedRegion && unassignedRegion.sourceRegionId || null
  };
}

async function fileHashFor(relativeUrl) {
  const url = new URL(relativeUrl, location.href);
  const response = await fetch(url.href, { cache: "no-store" });
  if (!response.ok) throw new Error("Unable to hash " + relativeUrl + ": " + response.status);
  const buffer = await response.arrayBuffer();
  return { url: url.href, size: buffer.byteLength, sha256: await sha256Hex(buffer) };
}

function collectSceneObjects(scene) {
  return []
    .concat(scene && scene.structuralWalls || [])
    .concat(scene && scene.columns || [])
    .concat(scene && scene.dimensionLines || []);
}

function collectSemanticSceneObjects(scene) {
  return []
    .concat(scene && scene.openingCandidates || [])
    .concat(scene && scene.stairCandidates || [])
    .concat(scene && scene.stairVoidCandidates || [])
    .concat(scene && scene.spaceBoundaryCandidates || []);
}

function semanticCategoryCounts(scene) {
  const openings = Array.isArray(scene && scene.openingCandidates) ? scene.openingCandidates : [];
  const stairs = Array.isArray(scene && scene.stairCandidates) ? scene.stairCandidates : [];
  const stairVoids = Array.isArray(scene && scene.stairVoidCandidates) ? scene.stairVoidCandidates : [];
  const spaces = Array.isArray(scene && scene.spaceBoundaryCandidates) ? scene.spaceBoundaryCandidates : [];
  return {
    openings: openings.length,
    doors: openings.filter((item) => item && item.subtype === "hinged_door").length,
    windows: openings.filter((item) => item && item.subtype === "window").length,
    stairRegions: stairs.length,
    stairVoids: stairVoids.length,
    spaceBoundaries: spaces.length,
    totalSemanticCandidates: openings.length + stairs.length + stairVoids.length + spaces.length
  };
}

function summarizeRegionAssignments(scene) {
  const objects = collectSceneObjects(scene);
  const objectCountByRegion = objects.reduce((counts, item) => {
    const key = item && item.sourceRegionId ? String(item.sourceRegionId) : "page-1-unassigned";
    counts[key] = (counts[key] || 0) + 1;
    return counts;
  }, {});
  const verifiedFloorObjectCountByRegion = {
    "page-1-region-3f": objectCountByRegion["page-1-region-3f"] || 0,
    "page-1-region-rf": objectCountByRegion["page-1-region-rf"] || 0
  };
  const unassignedObjectCount = objects.filter((item) => item.sourceRegionId !== "page-1-region-3f" && item.sourceRegionId !== "page-1-region-rf").length;
  return {
    totalPdfDerivedObjectCount: objects.length,
    objectCountByRegion,
    verifiedFloorObjectCountByRegion,
    unassignedObjectCount,
    titleBlockOrOutsideVerifiedFloorObjectCount: unassignedObjectCount
  };
}

function r7FinitePoint(value) {
  return Boolean(value && Number.isFinite(Number(value.x)) && Number.isFinite(Number(value.y)));
}

function r7Distance(from, to) {
  return r7FinitePoint(from) && r7FinitePoint(to)
    ? Math.hypot(Number(to.x) - Number(from.x), Number(to.y) - Number(from.y))
    : NaN;
}

function r7BoxCenter(box) {
  if (!box || ![box.x0, box.y0, box.x1, box.y1].every((value) => Number.isFinite(Number(value)))) return null;
  return { x: (Number(box.x0) + Number(box.x1)) / 2, y: (Number(box.y0) + Number(box.y1)) / 2 };
}

function r7Median(values) {
  const sorted = (values || []).filter((value) => Number.isFinite(Number(value))).map(Number).sort((a, b) => a - b);
  if (!sorted.length) return null;
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

function r7CoefficientOfVariation(values) {
  const finite = (values || []).filter((value) => Number.isFinite(Number(value))).map(Number);
  if (finite.length < 2) return null;
  const mean = finite.reduce((sum, value) => sum + value, 0) / finite.length;
  if (!(mean > 0)) return null;
  const variance = finite.reduce((sum, value) => sum + ((value - mean) ** 2), 0) / finite.length;
  return Math.sqrt(variance) / mean;
}

function r7AxisLabelScore(axis, label) {
  const start = axis && axis.p1;
  const end = axis && axis.p2;
  const center = r7BoxCenter(label && label.bbox);
  const spanPt = r7Distance(start, end);
  if (!center || !Number.isFinite(spanPt) || spanPt <= 0) return null;
  const horizontal = Math.abs(Number(end.x) - Number(start.x)) >= Math.abs(Number(end.y) - Number(start.y));
  const axisMinimum = horizontal ? Math.min(Number(start.x), Number(end.x)) : Math.min(Number(start.y), Number(end.y));
  const axisMaximum = horizontal ? Math.max(Number(start.x), Number(end.x)) : Math.max(Number(start.y), Number(end.y));
  const main = horizontal ? center.x : center.y;
  const perpendicular = horizontal ? Math.abs(center.y - Number(start.y)) : Math.abs(center.x - Number(start.x));
  const outsideDistance = main < axisMinimum ? axisMinimum - main : main > axisMaximum ? main - axisMaximum : 0;
  const inChain = outsideDistance <= spanPt * 0.08;
  const normalizedPerpendicular = perpendicular / Math.max(1, spanPt);
  const normalizedOutside = outsideDistance / Math.max(1, spanPt);
  const witnessBoost = axis.dimensionAxisEvidence && axis.dimensionAxisEvidence.chainCompatible ? 0.1 : 0;
  const uniqueLabelAssociationBoost = axis.dimensionAxisEvidence
    && axis.dimensionAxisEvidence.labelAssociationEligible === true
    && axis.dimensionAxisEvidence.labelAssociation
    && Number(axis.dimensionAxisEvidence.labelAssociation.runnerUpMargin) >= 0.08
    ? 0.05
    : 0;
  return {
    score: Number((1 - Math.min(1, normalizedPerpendicular * 3 + normalizedOutside * 4) + witnessBoost + uniqueLabelAssociationBoost).toFixed(6)),
    inChain,
    perpendicularDistancePt: Number(perpendicular.toFixed(6)),
    outsideDistancePt: Number(outsideDistance.toFixed(6)),
    spanPt: Number(spanPt.toFixed(6))
  };
}

function r7UnitHypothesis(scene, candidates, unit) {
  const multiplier = unit === "mm" ? 1 : unit === "cm" ? 10 : 1000;
  const scales = (candidates || []).map((candidate) => candidate.numericValue * multiplier / candidate.axisSpanPt);
  const median = r7Median(scales);
  const horizontalScales = (candidates || []).filter((candidate) => candidate.orientation === "horizontal").map((candidate) => candidate.numericValue * multiplier / candidate.axisSpanPt);
  const verticalScales = (candidates || []).filter((candidate) => candidate.orientation === "vertical").map((candidate) => candidate.numericValue * multiplier / candidate.axisSpanPt);
  const horizontalMedian = r7Median(horizontalScales);
  const verticalMedian = r7Median(verticalScales);
  const worldMmPerPtX = Number.isFinite(horizontalMedian) ? horizontalMedian : median;
  const worldMmPerPtY = Number.isFinite(verticalMedian) ? verticalMedian : median;
  const orientationCv = {
    horizontal: horizontalScales.length > 1 ? r7CoefficientOfVariation(horizontalScales) : 0,
    vertical: verticalScales.length > 1 ? r7CoefficientOfVariation(verticalScales) : 0
  };
  const cv = Math.max(Number(orientationCv.horizontal) || 0, Number(orientationCv.vertical) || 0);
  const pageRect = scene && scene.page && scene.page.rect || {};
  const pageWidthPt = Number(pageRect.width || (Number(pageRect.x1) - Number(pageRect.x0)));
  const pageHeightPt = Number(pageRect.height || (Number(pageRect.y1) - Number(pageRect.y0)));
  const planSpansMm = [pageWidthPt * worldMmPerPtX, pageHeightPt * worldMmPerPtY]
    .filter((value) => Number.isFinite(value) && value > 0)
    .sort((left, right) => left - right);
  const dimensionLengthsMm = (candidates || []).map((candidate) => candidate.numericValue * multiplier);
  const openingSpansMm = (Array.isArray(scene && scene.openingCandidates) ? scene.openingCandidates : [])
    .map((opening) => opening && (opening.sourceBBox || opening.bbox || opening.geometry && opening.geometry.bbox))
    .map((box) => box && Math.max(Number(box.width) || Math.abs(Number(box.x1) - Number(box.x0)), Number(box.height) || Math.abs(Number(box.y1) - Number(box.y0))))
    .filter((value) => Number.isFinite(value) && value > 0)
    .map((value) => value * median);
  const rejectionReasons = [];
  if (!(Number.isFinite(median) && median > 0)) rejectionReasons.push("non_finite_scale");
  if (!(Number.isFinite(cv) && cv <= 0.005)) rejectionReasons.push("dimension_consensus_cv_exceeded");
  if (planSpansMm.length !== 2 || planSpansMm[1] < 3000 || planSpansMm[1] > 100000 || planSpansMm[0] < 2000 || planSpansMm[0] > 100000) {
    rejectionReasons.push("source_plan_span_out_of_bounds");
  }
  if (!dimensionLengthsMm.length || dimensionLengthsMm.some((value) => !(value >= 100 && value <= 100000))) {
    rejectionReasons.push("printed_dimension_out_of_bounds");
  }
  if (openingSpansMm.some((value) => !(value >= 300 && value <= 6000))) {
    rejectionReasons.push("source_opening_span_out_of_bounds");
  }
  return {
    unit,
    multiplier,
    medianWorldMmPerPt: Number.isFinite(median) ? Number(median.toFixed(9)) : null,
    worldMmPerPtX: Number.isFinite(worldMmPerPtX) ? Number(worldMmPerPtX.toFixed(9)) : null,
    worldMmPerPtY: Number.isFinite(worldMmPerPtY) ? Number(worldMmPerPtY.toFixed(9)) : null,
    coefficientOfVariationByOrientation: orientationCv,
    coefficientOfVariation: Number.isFinite(cv) ? cv : null,
    planSpansMm: planSpansMm.map((value) => Number(value.toFixed(3))),
    dimensionLengthsMm: dimensionLengthsMm.map((value) => Number(value.toFixed(3))),
    openingSpansMm: openingSpansMm.map((value) => Number(value.toFixed(3))),
    plausible: rejectionReasons.length === 0,
    rejectionReasons
  };
}

function r7UnitProposal(candidates, scene) {
  const explicitUnits = Array.from(new Set((candidates || []).map((candidate) => candidate.explicitUnit).filter(Boolean))).sort();
  const hypotheses = ["mm", "cm", "m"].map((unit) => r7UnitHypothesis(scene, candidates, unit));
  if (explicitUnits.length > 1) {
    return {
      unit: null,
      source: "conflicting_explicit_units",
      requiresUserConfirmation: false,
      conclusive: false,
      explicitUnits,
      survivingHypothesisCount: 0,
      hypotheses
    };
  }
  if (explicitUnits.length === 1) {
    const explicit = hypotheses.find((hypothesis) => hypothesis.unit === explicitUnits[0]);
    const conclusive = Boolean(explicit && explicit.plausible);
    return {
      unit: conclusive ? explicitUnits[0] : null,
      source: conclusive ? "explicit_label_suffix" : "explicit_unit_geometry_conflict",
      requiresUserConfirmation: false,
      conclusive,
      explicitUnits,
      survivingHypothesisCount: conclusive ? 1 : 0,
      hypotheses
    };
  }
  const survivors = hypotheses.filter((hypothesis) => hypothesis.plausible);
  const conclusive = survivors.length === 1;
  return {
    unit: conclusive ? survivors[0].unit : null,
    source: conclusive ? "unique_geometry_bounded_hypothesis" : (survivors.length ? "ambiguous_unit_hypotheses" : "unit_not_inferable"),
    requiresUserConfirmation: false,
    conclusive,
    explicitUnits,
    survivingHypothesisCount: survivors.length,
    hypotheses
  };
}

function r7EligibleDimensionRegion(item) {
  const regionId = String(item && item.sourceRegionId || "");
  const status = String(item && item.sourceRegionSemanticStatus || "");
  const selectedNeutralGeometryCluster = /-neutral-cluster-[ab]$/.test(regionId);
  return Boolean(regionId) && !/-unassigned$/.test(regionId) && (status !== "unresolved" || selectedNeutralGeometryCluster);
}

function buildR7DimensionScaleEvidence(scene) {
  const axes = Array.isArray(scene && scene.dimensionLines) ? scene.dimensionLines : [];
  const labels = Array.isArray(scene && scene.dimensionLabelEvidence) ? scene.dimensionLabelEvidence : [];
  const pairRows = [];
  const pairingRejections = [];
  axes.forEach((axis) => {
    if (!r7EligibleDimensionRegion(axis)) return;
    if (!(axis && axis.dimensionAxisEvidence && axis.dimensionAxisEvidence.labelAssociationEligible === true)) {
      pairingRejections.push({
        axisId: axis && axis.id || null,
        reason: "dimension_axis_unique_label_association_required",
        labelAssociation: axis && axis.dimensionAxisEvidence && axis.dimensionAxisEvidence.labelAssociation || null
      });
      return;
    }
    const witnessLineIds = Array.from(new Set([
      ...(Array.isArray(axis && axis.dimensionAxisEvidence && axis.dimensionAxisEvidence.witnessLineIds)
        ? axis.dimensionAxisEvidence.witnessLineIds
        : []),
      ...(Array.isArray(axis && axis.dimensionAxisEvidence && axis.dimensionAxisEvidence.extensionLineIds)
        ? axis.dimensionAxisEvidence.extensionLineIds
        : []),
      ...(Array.isArray(axis && axis.dimensionAxisEvidence && axis.dimensionAxisEvidence.arrowLineIds)
        ? axis.dimensionAxisEvidence.arrowLineIds
        : [])
    ].map(String).filter(Boolean))).sort();
    if (!(axis && axis.dimensionAxisEvidence && axis.dimensionAxisEvidence.chainCompatible) || witnessLineIds.length < 2) {
      pairingRejections.push({
        axisId: axis && axis.id || null,
        reason: "dimension_axis_witnesses_insufficient",
        witnessLineIds,
        witnessCount: witnessLineIds.length
      });
      return;
    }
    const compatible = labels
      .filter((label) => label
        && r7EligibleDimensionRegion(label)
        && label.sourceRegionId === axis.sourceRegionId
        && Number(label.page || 1) === Number(axis.page || 1)
        && (!label.orientation || label.orientation === axis.orientation))
      .map((label) => ({ label, metrics: r7AxisLabelScore(axis, label) }))
      .filter((entry) => entry.metrics && entry.metrics.inChain)
      .sort((a, b) => b.metrics.score - a.metrics.score || String(a.label.id).localeCompare(String(b.label.id)));
    const best = compatible[0] || null;
    const runnerUp = compatible[1] || null;
    const margin = best ? best.metrics.score - (runnerUp ? runnerUp.metrics.score : 0) : null;
    if (!best || !(margin >= 0.12)) {
      pairingRejections.push({
        axisId: axis && axis.id || null,
        reason: best ? "dimension_label_pair_margin_insufficient" : "dimension_label_pair_missing",
        bestScore: best && best.metrics && best.metrics.score || null,
        runnerUpMargin: Number.isFinite(margin) ? Number(margin.toFixed(6)) : null,
        witnessLineIds,
        witnessCount: witnessLineIds.length
      });
      return;
    }
    const axisSpanPt = Number(axis.axisSpanPt || r7Distance(axis.p1, axis.p2));
    const numericValue = Number(best.label.normalizedNumericValue);
    if (!(axisSpanPt > 0) || !(numericValue > 0)) return;
    pairRows.push({
      id: `dimension-pair-${axis.id}-${best.label.id}`,
      page: Number(axis.page || scene && scene.page && scene.page.number || 1),
      sourceRegionId: axis.sourceRegionId,
      orientation: axis.orientation || (Math.abs(axis.p2.x - axis.p1.x) >= Math.abs(axis.p2.y - axis.p1.y) ? "horizontal" : "vertical"),
      axisId: axis.id,
      labelId: best.label.id,
      rawLabel: best.label.rawLabel,
      numericValue,
      explicitUnit: best.label.explicitUnit || null,
      endpointsPdfPt: { from: axis.p1, to: axis.p2 },
      axisSpanPt,
      pairScore: best.metrics.score,
      runnerUpMargin: Number(margin.toFixed(6)),
      chainCompatible: true,
      witnessLineIds,
      witnessCount: witnessLineIds.length,
      matching: best.metrics
    });
  });
  const assignedAxisIds = new Set();
  const assignedLabelIds = new Set();
  const uniquePairs = pairRows
    .sort((a, b) => b.pairScore - a.pairScore || a.id.localeCompare(b.id))
    .filter((row) => {
      if (assignedAxisIds.has(row.axisId) || assignedLabelIds.has(row.labelId)) return false;
      assignedAxisIds.add(row.axisId);
      assignedLabelIds.add(row.labelId);
      return true;
    })
    .sort((a, b) => a.sourceRegionId.localeCompare(b.sourceRegionId) || a.orientation.localeCompare(b.orientation) || a.id.localeCompare(b.id));
  const unitProposal = r7UnitProposal(uniquePairs, scene);
  const multiplier = unitProposal.unit === "mm" ? 1 : unitProposal.unit === "cm" ? 10 : unitProposal.unit === "m" ? 1000 : null;
  const candidates = multiplier ? uniquePairs.map((pair) => ({
    ...pair,
    proposedUnit: unitProposal.unit,
    normalizedLengthMm: Number((pair.numericValue * multiplier).toFixed(6)),
    worldMmPerPt: Number((pair.numericValue * multiplier / pair.axisSpanPt).toFixed(9))
  })) : [];
  const values = candidates.map((candidate) => candidate.worldMmPerPt);
  const medianWorldMmPerPt = r7Median(values);
  const medianWorldMmPerPtX = r7Median(candidates.filter((candidate) => candidate.orientation === "horizontal").map((candidate) => candidate.worldMmPerPt));
  const medianWorldMmPerPtY = r7Median(candidates.filter((candidate) => candidate.orientation === "vertical").map((candidate) => candidate.worldMmPerPt));
  const candidatesWithResiduals = candidates.map((candidate) => {
    const orientationMedian = candidate.orientation === "horizontal" ? medianWorldMmPerPtX : candidate.orientation === "vertical" ? medianWorldMmPerPtY : medianWorldMmPerPt;
    const reconstructedSpanPt = Number.isFinite(orientationMedian) && orientationMedian > 0
      ? candidate.normalizedLengthMm / orientationMedian
      : null;
    const residualPt = Number.isFinite(reconstructedSpanPt)
      ? Math.abs(candidate.axisSpanPt - reconstructedSpanPt)
      : null;
    return {
      ...candidate,
      sharedMedianMmPerPt: Number.isFinite(orientationMedian) ? Number(orientationMedian.toFixed(9)) : null,
      reconstructedAxisSpanPt: Number.isFinite(reconstructedSpanPt) ? Number(reconstructedSpanPt.toFixed(9)) : null,
      residualPt: Number.isFinite(residualPt) ? Number(residualPt.toFixed(9)) : null
    };
  });
  const residualThresholdPt = 0.25;
  const rejectedCandidates = [];
  // 尺寸線端帽與延伸線會讓長尺寸的可見端點產生少量偏移，因此使用有上限的
  // 相對容差；比例仍必須同時通過多方向覆蓋、變異率與相對偏差規則。
  // 個別配對超限時仍會保留明確拒絕原因，不會以放寬容差取代共識。
  const keptWorking = candidatesWithResiduals.slice();
  function recomputeResidualRows(rows) {
    const rowValues = rows.map((row) => row.worldMmPerPt);
    const med = r7Median(rowValues);
    const medX = r7Median(rows.filter((row) => row.orientation === "horizontal").map((row) => row.worldMmPerPt));
    const medY = r7Median(rows.filter((row) => row.orientation === "vertical").map((row) => row.worldMmPerPt));
    return rows.map((row) => {
      const orientationMedian = row.orientation === "horizontal" ? medX : row.orientation === "vertical" ? medY : med;
      const reconstructed = Number.isFinite(orientationMedian) && orientationMedian > 0 ? row.normalizedLengthMm / orientationMedian : null;
      const residual = Number.isFinite(reconstructed) ? Math.abs(row.axisSpanPt - reconstructed) : null;
      return {
        ...row,
        sharedMedianMmPerPt: Number.isFinite(orientationMedian) ? Number(orientationMedian.toFixed(9)) : null,
        reconstructedAxisSpanPt: Number.isFinite(reconstructed) ? Number(reconstructed.toFixed(9)) : null,
        residualPt: Number.isFinite(residual) ? Number(residual.toFixed(9)) : null
      };
    });
  }
  // Every valid uniquely paired row remains in the consensus. A disagreeing
  // dimension is a fail-closed result, never a row to prune into a pass.
  const keptCandidates = recomputeResidualRows(keptWorking);
  const keptValues = keptCandidates.map((candidate) => candidate.worldMmPerPt);
  const keptMedianWorldMmPerPt = r7Median(keptValues);
  const keptMedianWorldMmPerPtX = r7Median(keptCandidates.filter((candidate) => candidate.orientation === "horizontal").map((candidate) => candidate.worldMmPerPt));
  const keptMedianWorldMmPerPtY = r7Median(keptCandidates.filter((candidate) => candidate.orientation === "vertical").map((candidate) => candidate.worldMmPerPt));
  const residuals = keptCandidates.map((candidate) => candidate.residualPt);
  const maxResidualPt = residuals.length && residuals.every(Number.isFinite) ? Math.max(...residuals) : null;
  const residualPass = keptCandidates.length > 0 && Number.isFinite(maxResidualPt) && maxResidualPt <= residualThresholdPt;
  const coefficientOfVariationByOrientation = {
    horizontal: keptCandidates.filter((candidate) => candidate.orientation === "horizontal").length > 1
      ? r7CoefficientOfVariation(keptCandidates.filter((candidate) => candidate.orientation === "horizontal").map((candidate) => candidate.worldMmPerPt))
      : 0,
    vertical: keptCandidates.filter((candidate) => candidate.orientation === "vertical").length > 1
      ? r7CoefficientOfVariation(keptCandidates.filter((candidate) => candidate.orientation === "vertical").map((candidate) => candidate.worldMmPerPt))
      : 0
  };
  const cv = Math.max(Number(coefficientOfVariationByOrientation.horizontal) || 0, Number(coefficientOfVariationByOrientation.vertical) || 0);
  const deviations = keptCandidates.map((candidate) => {
    const orientationMedian = candidate.orientation === "horizontal" ? keptMedianWorldMmPerPtX : candidate.orientation === "vertical" ? keptMedianWorldMmPerPtY : keptMedianWorldMmPerPt;
    return { id: candidate.id, relativeDeviation: orientationMedian ? Math.abs(candidate.worldMmPerPt - orientationMedian) / orientationMedian : null };
  });
  const hasHorizontal = keptCandidates.some((candidate) => candidate.orientation === "horizontal");
  const hasVertical = keptCandidates.some((candidate) => candidate.orientation === "vertical");
  const regions = new Set(keptCandidates.map((candidate) => candidate.sourceRegionId));
  const availableOrientations = Array.from(new Set(axes
    .filter((axis) => r7EligibleDimensionRegion(axis)
      && ["horizontal", "vertical"].includes(axis && axis.orientation)
      && Number(axis && (axis.axisSpanPt || r7Distance(axis.p1, axis.p2))) > 0)
    .map((axis) => axis.orientation))).sort();
  const coveredOrientations = Array.from(new Set(keptCandidates.map((candidate) => candidate.orientation))).sort();
  const uncoveredOrientations = availableOrientations.filter((orientation) => !coveredOrientations.includes(orientation));
  const coveragePass = availableOrientations.length > 0 && uncoveredOrientations.length === 0;
  const horizontalCandidateCount = keptCandidates.filter((candidate) => candidate.orientation === "horizontal").length;
  const verticalCandidateCount = keptCandidates.filter((candidate) => candidate.orientation === "vertical").length;
  const crossAxisRelativeError = Number.isFinite(keptMedianWorldMmPerPtX) &&
    Number.isFinite(keptMedianWorldMmPerPtY) &&
    (keptMedianWorldMmPerPtX + keptMedianWorldMmPerPtY) > 0
    ? Math.abs(keptMedianWorldMmPerPtX - keptMedianWorldMmPerPtY) /
      ((keptMedianWorldMmPerPtX + keptMedianWorldMmPerPtY) / 2)
    : null;
  const crossAxisConsistencyPass = !availableOrientations.includes("horizontal") ||
    !availableOrientations.includes("vertical") ||
    (Number.isFinite(crossAxisRelativeError) && crossAxisRelativeError <= 0.01);
  const cardinalityPass = availableOrientations.includes("horizontal") && availableOrientations.includes("vertical")
    ? keptCandidates.length >= 3 && horizontalCandidateCount >= 1 && verticalCandidateCount >= 1
    : keptCandidates.length >= 3;
  const toleranceRulesPass = Number.isFinite(cv) &&
    cv <= 0.005 &&
    deviations.every((entry) => Number.isFinite(entry.relativeDeviation) && entry.relativeDeviation <= 0.0075) &&
    residualPass &&
    crossAxisConsistencyPass;
  const consensusPass = unitProposal.conclusive === true
    && unitProposal.survivingHypothesisCount === 1
    && cardinalityPass
    && coveragePass
    && rejectedCandidates.length === 0
    && toleranceRulesPass;
  const assistedPass = false;
  const assistedLimitations = null;
  return {
    schema: "laibe.planPuzzle.r7.dimensionScaleEvidence.v1",
    status: consensusPass ? "ready_for_scale_acceptance" : "insufficient_or_conflicting_dimension_evidence",
    labelsDetected: labels.length,
    axesDetected: axes.length,
    pairs: uniquePairs,
    pairingRejections,
    candidates: keptCandidates,
    rejectedCandidates,
    unitProposal,
    unitHypotheses: unitProposal.hypotheses,
    consensus: {
      candidateCount: keptCandidates.length,
      allPairCount: candidatesWithResiduals.length,
      rejectedCandidateCount: rejectedCandidates.length,
      regionCount: regions.size,
      transformMode: availableOrientations.includes("horizontal") && availableOrientations.includes("vertical") ? "axis_aligned_affine" : "uniform",
      horizontalCandidateCount,
      verticalCandidateCount,
      cardinalityPass,
      crossAxisRelativeError: Number.isFinite(crossAxisRelativeError)
        ? Number(crossAxisRelativeError.toFixed(9))
        : null,
      crossAxisConsistencyPass,
      horizontalEvidence: hasHorizontal,
      verticalEvidence: hasVertical,
      coveragePass,
      availableOrientations,
      coveredOrientations,
      uncoveredOrientations,
      medianWorldMmPerPt: keptMedianWorldMmPerPt,
      medianWorldMmPerPtX: Number.isFinite(keptMedianWorldMmPerPtX) ? keptMedianWorldMmPerPtX : keptMedianWorldMmPerPt,
      medianWorldMmPerPtY: Number.isFinite(keptMedianWorldMmPerPtY) ? keptMedianWorldMmPerPtY : keptMedianWorldMmPerPt,
      coefficientOfVariation: cv,
      coefficientOfVariationByOrientation,
      deviations,
      residualThresholdPt,
      maxResidualPt,
      residualPass,
      tolerance: {
        maxCoefficientOfVariation: 0.005,
        maxRelativeDeviation: 0.0075,
        maxRoundTripResidualPt: 0.25
      },
      pass: consensusPass,
      assistedPass,
      assistedLimitations,
      mode: consensusPass ? "strict_auto_consensus" : "insufficient"
    },
    policy: {
      automaticScaleRequiresNoManualUnitOrEndpointAction: true,
      ambiguousOrInsufficientEvidenceFailsClosed: true,
      acceptedTransformId: null,
      dimensionTextUsedAsProof: true,
      sourceSpecificInputsUsed: false
    }
  };
}

async function extractFromArrayBuffer(buffer, sourceInfo = {}, options = {}) {
  const pdfjsLib = await waitFor(() => window.pdfjsLib && window.pdfjsLib.getDocument && window.pdfjsLib, "Local PDF.js");
  const extractor = await waitFor(() => window.LaibePdfPlanVectorExtractor, "Laibe PDF vector extractor");
  const adapter = await waitFor(() => window.LaibePdfPlanObjectizationAdapter, "Laibe PDF objectization adapter");
  if (!(buffer instanceof ArrayBuffer) || buffer.byteLength === 0) {
    throw new Error("A non-empty selected PDF ArrayBuffer is required.");
  }
  const sourceName = String(sourceInfo.name || "selected-plan.pdf");
  const sourceUrl = sourceInfo.url ? String(sourceInfo.url) : "user-selected-file";
  const sourceRoute = String(sourceInfo.route || "user-file-selection");
  const beforeProject = getProjectCounts();
  const sourceByteLength = buffer.byteLength;
  const sourceSha256 = await sha256Hex(buffer);
  const expectedSha256 = options.expectedSha256 ? String(options.expectedSha256).toUpperCase() : null;
  if (expectedSha256 && sourceSha256 !== expectedSha256) {
    throw new Error("PDF source SHA-256 mismatch.");
  }
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
  const requestedPageNumber = sourcePageNumber({ pageNumber: options.pageNumber });
  const page = await pdf.getPage(requestedPageNumber);
  const viewport = page.getViewport({ scale: 1 });
  const pagePrefix = "page-" + String(requestedPageNumber);
  const regionResult = {
    status: "extractor_floor_semantic_evidence_pending",
    semantic_status: "unresolved",
    human_confirmation_required: true,
    profileApplied: false,
    regions: [regionFromHit(pagePrefix + "-full", pagePrefix + "-full", null, pageBounds(viewport), "pdfjs-page-viewport", {
      pageIndex: requestedPageNumber - 1,
      pageNumber: requestedPageNumber,
      semantic_status: "page_reference",
      human_confirmation_required: false,
      floor_semantic: false
    })],
    hits: null
  };
  const raw = await extractor.extractFromPage(page, {
    pdfjsLib,
    pdfDocument: pdf,
    sourceFileName: sourceName,
    pageNumber: requestedPageNumber
  });
  const boundRegionResult = deriveRegionsFromExtractor(raw, viewport, regionResult);
  const sourceProfileHash = null;
  const canonicalRawHash = await adapter.canonicalSha256(raw, { omitKeys: ["createdAt"] });
  const scene = await adapter.adaptExtractorOutput({
    raw,
    sourceSha256,
    sourceUrl,
    sourceName,
    pageIndex: requestedPageNumber - 1,
    pageNumber: requestedPageNumber,
    pdfjsVersion: pdfjsLib.version || null,
    regions: boundRegionResult.regions
  });
  scene.dimensionScaleEvidence = buildR7DimensionScaleEvidence(scene);
  const regionAssignment = summarizeRegionAssignments(scene);
  const derivedSceneHash = await adapter.canonicalSha256(scene);
  const referenceRaster = await renderSameSourcePageReferenceRaster(page, viewport, {
    sourceSha256,
    pageNumber: requestedPageNumber,
    worldMmPerPt: 10
  });
  const afterProject = getProjectCounts();
  const extractorFile = await fileHashFor("./pdf-plan-vector-extractor.js");
  const adapterFile = await fileHashFor("./pdf-plan-objectization-adapter.js");
  const runtimeFile = await fileHashFor("./pdf-plan-exact-source-runtime.mjs");
  const sourceIds = []
    .concat(collectSceneObjects(scene))
    .map((item) => item && item.source_object_id)
    .filter(Boolean);
  const semanticSourceIds = collectSemanticSceneObjects(scene)
    .map((item) => item && item.source_object_id)
    .filter(Boolean);
  const payload = {
    schema: "laibe.planPuzzle.exactSourceExtractionResult.v1",
    status: "ok",
    runtimeVersion: RUNTIME_VERSION,
    qaRunId: options.qaRunId || "gate-a1-capability-repair-r1",
    source: {
      url: sourceInfo.url ? sourceUrl : null,
      route: sourceRoute,
      sameOrigin: sourceInfo.sameOrigin !== false,
      name: sourceName,
      byteLength: sourceByteLength,
      sha256: sourceSha256,
      expectedSha256,
      expectedSha256Match: expectedSha256 ? sourceSha256 === expectedSha256 : null
    },
    pdfjs: {
      version: pdfjsLib.version || null,
      pageCount: pdf.numPages,
      page: {
        number: requestedPageNumber,
        width: viewport.width,
        height: viewport.height,
        rotation: page.rotate || 0
      },
      workerSrc: pdfjsLib.GlobalWorkerOptions && pdfjsLib.GlobalWorkerOptions.workerSrc || null
    },
    extractor: {
      filename: "pdf-plan-vector-extractor.js",
      version: raw.extractorVersion || null,
      api: "extractFromPage",
      file: extractorFile,
      status: raw.status || null,
      summary: raw.summary || null,
      semanticDetection: raw.semanticDetection || null,
      dimensionEvidence: raw.dimensionEvidence ? {
        schema: raw.dimensionEvidence.schema || null,
        status: raw.dimensionEvidence.status || null,
        labels: Array.isArray(raw.dimensionEvidence.labels) ? raw.dimensionEvidence.labels.map((label) => ({
          id: label.id || null,
          rawLabel: label.rawLabel || null,
          normalizedNumericValue: Number.isFinite(Number(label.normalizedNumericValue)) ? Number(label.normalizedNumericValue) : null,
          orientation: label.orientation || null,
          rotationDegrees: Number.isFinite(Number(label.rotationDegrees)) ? Number(label.rotationDegrees) : null,
          confidence: Number.isFinite(Number(label.confidence)) ? Number(label.confidence) : null,
          runnerUpMargin: Number.isFinite(Number(label.runnerUpMargin)) ? Number(label.runnerUpMargin) : null
        })) : [],
        outlinedDigitDecoder: raw.dimensionEvidence.outlinedDigitDecoder || null
      } : null,
      floorSemanticGlyphs: {
        candidates: Array.isArray(raw.floorSemanticGlyphCandidates) ? raw.floorSemanticGlyphCandidates : [],
        diagnostics: raw.floorSemanticGlyphDiagnostics || null
      },
      canonicalRawHash
    },
    adapter: {
      filename: "pdf-plan-objectization-adapter.js",
      version: adapter.VERSION,
      file: adapterFile,
      runtimeFile,
      derivedSceneHash,
      invokedImporter: false
    },
    dimensionScale: scene.dimensionScaleEvidence,
    regions: {
      status: boundRegionResult.status,
      semantic_status: boundRegionResult.semantic_status || "unresolved",
      human_confirmation_required: Boolean(boundRegionResult.human_confirmation_required),
      profileApplied: Boolean(boundRegionResult.profileApplied),
      profileSource: boundRegionResult.profile && boundRegionResult.profile.profile_source || null,
      sourceProfileHash,
      coordinateTransform: boundRegionResult.coordinateTransform || null,
      evidenceCoordinateFrame: boundRegionResult.profile && boundRegionResult.profile.coordinate_frame || null,
      sceneCoordinateFrame: boundRegionResult.profile && boundRegionResult.profile.runtime_coordinate_frame || null,
      sceneAssignmentProfile: boundRegionResult.sceneAssignmentProfile || null,
      records: boundRegionResult.regions,
      regionIds: (boundRegionResult.regions || []).map((region) => region.sourceRegionId),
      has3F: (boundRegionResult.regions || []).some((region) => sourceDerivedNumberedFloor(region, 3)),
      hasRF: (boundRegionResult.regions || []).some((region) => sourceDerivedRoofFloor(region)),
      geometryCluster: boundRegionResult.geometryCluster || null,
      floorSemanticCorrespondence: boundRegionResult.floorSemanticCorrespondence || null,
      excludedAreas: boundRegionResult.profile && boundRegionResult.profile.excluded_areas || [],
      assignment: regionAssignment
    },
    deterministicIds: {
      count: sourceIds.length,
      sourceIds,
      semanticCount: semanticSourceIds.length,
      semanticSourceIds,
      hasDateNowOrRandomPattern: sourceIds.some((id) => /date|random|session|tab|run/i.test(id))
        || semanticSourceIds.some((id) => /date|random|session|tab|run/i.test(id))
    },
      scene,
      semanticCategoryCounts: semanticCategoryCounts(scene),
    projectMutation: projectMutationObservation(beforeProject, afterProject),
    r1Boundary: {
      nativePickerAcceptanceClaimed: false,
      planPuzzleImporterInvoked: false,
      laibePlanImportGeometryInvoked: false,
      laibePlanImportPdfObjectizationSceneInvoked: false,
      importSessionId: null,
      acceptedTransformId: null,
      acceptedTransformStatus: "not-established",
      mapping_state: "not_accepted",
      future_editable_object_id: null
    },
    limitations: scene.r1Limitations,
    capturedAt: nowIso()
  };
  if (options.renderDiagnostics) {
    payload.diagnosticsView = await renderDiagnostics(page, boundRegionResult.regions, payload);
  }
  if (options.mirror !== false) {
    mirrorQaJson(payload);
  }
  // Keep the page image out of serialized QA payloads. It is only handed to
  // the production importer so the normal product route has source context.
  Object.defineProperty(payload, "referenceRaster", {
    value: referenceRaster,
    enumerable: false,
    configurable: false,
    writable: false
  });
  return payload;
}

async function renderSameSourcePageReferenceRaster(page, viewport, options = {}) {
  if (!page || !viewport || typeof document === "undefined") return null;
  const scale = 1.5;
  const renderedViewport = page.getViewport({ scale });
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(renderedViewport.width));
  canvas.height = Math.max(1, Math.round(renderedViewport.height));
  const context = canvas.getContext("2d", { alpha: false });
  if (!context) return null;
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  await page.render({ canvasContext: context, viewport: renderedViewport, background: "#ffffff" }).promise;
  const worldMmPerPt = Number(options.worldMmPerPt);
  const coordinateWidthMm = Number((Number(viewport.width) * worldMmPerPt).toFixed(3));
  const coordinateHeightMm = Number((Number(viewport.height) * worldMmPerPt).toFixed(3));
  if (!(coordinateWidthMm > 0) || !(coordinateHeightMm > 0)) return null;
  return {
    available: true,
    visibleDefault: true,
    dataUrl: canvas.toDataURL("image/png"),
    naturalWidth: canvas.width,
    naturalHeight: canvas.height,
    fileType: "png",
    source: "same-pdfjs-page-render",
    sourcePdfSha256: String(options.sourceSha256 || "").toUpperCase() || null,
    sourcePageNumber: Number(options.pageNumber || 1),
    sourceCoordinateFrame: "page-top-left-pdf-pt",
    coordinateFrame: "plan-puzzle-provisional-live-mm",
    renderMode: "pdf-vector-context",
    mmPerPt: worldMmPerPt,
    sourcePageWidth: Number(viewport.width),
    sourcePageHeight: Number(viewport.height),
    coordinateWidthMm,
    coordinateHeightMm,
    pageFrame: { xMm: 0, yMm: 0, widthMm: coordinateWidthMm, heightMm: coordinateHeightMm },
    visibleFrame: { xMm: 0, yMm: 0, widthMm: coordinateWidthMm, heightMm: coordinateHeightMm },
    worldFrame: { xMm: 0, yMm: 0, widthMm: coordinateWidthMm, heightMm: coordinateHeightMm }
  };
}

async function extractFromUrl(sourceUrl, options = {}) {
  const url = new URL(sourceUrl || DEFAULT_QA_SOURCE, location.href);
  if (url.origin !== location.origin) {
    throw new Error("Only same-origin PDF sources are allowed.");
  }
  const response = await fetch(url.href, { cache: "no-store" });
  if (!response.ok) throw new Error("PDF fetch failed: " + response.status);
  const buffer = await response.arrayBuffer();
  return extractFromArrayBuffer(buffer, {
    url: url.href,
    name: decodeURIComponent(url.pathname.split("/").pop() || "source.pdf"),
    route: "same-origin-url",
    sameOrigin: true
  }, options);
}

async function extractFromSelectedFile(file, options = {}) {
  if (!file || typeof file.arrayBuffer !== "function") {
    throw new Error("A genuine PDF file selection is required.");
  }
  const name = String(file.name || "selected-plan.pdf");
  const type = String(file.type || "").toLowerCase();
  if (!/\.pdf$/i.test(name) && type !== "application/pdf") {
    throw new Error("Only PDF files can use the governed import flow.");
  }
  const buffer = await file.arrayBuffer();
  return extractFromArrayBuffer(buffer, {
    name,
    route: "genuine-user-file-selection",
    sameOrigin: true,
    byteLengthFromFile: Number(file.size) || buffer.byteLength,
    mimeType: type || "application/pdf"
  }, options);
}

export async function presentSelectedPdfFile(file, options = {}) {
  if (!file || typeof file.arrayBuffer !== "function") {
    throw new Error("A genuine PDF file selection is required.");
  }
  const name = String(file.name || "selected-plan.pdf");
  const mimeType = String(file.type || "").toLowerCase();
  if (!/\.pdf$/i.test(name) && mimeType !== "application/pdf") {
    throw new Error("Only PDF files can use the governed presentation flow.");
  }
  const selectedBytes = await file.arrayBuffer();
  if (!(selectedBytes instanceof ArrayBuffer) || selectedBytes.byteLength === 0) {
    throw new Error("A non-empty selected PDF ArrayBuffer is required.");
  }
  const selectedByteLength = selectedBytes.byteLength;
  const selectedSha256 = (await sha256Hex(selectedBytes)).toLowerCase();
  const expectedSha256 = options.expectedSha256
    ? String(options.expectedSha256).trim().toLowerCase()
    : null;
  if (expectedSha256 && selectedSha256 !== expectedSha256) {
    throw new Error("PDF source SHA-256 mismatch.");
  }

  const pdfjsLib = await waitFor(
    () => window.pdfjsLib && window.pdfjsLib.getDocument && window.pdfjsLib,
    "Local PDF.js"
  );
  const pdfDocument = await pdfjsLib.getDocument({ data: selectedBytes }).promise;
  try {
    const pageCount = Number(pdfDocument.numPages);
    if (!Number.isInteger(pageCount) || pageCount < 1) {
      throw new Error("PDF.js did not provide a valid page count.");
    }
    const requestedPageNumber = options.pageNumber === undefined
      ? 1
      : Number(options.pageNumber);
    if (
      !Number.isInteger(requestedPageNumber) ||
      requestedPageNumber < 1 ||
      requestedPageNumber > pageCount
    ) {
      throw new Error("Selected PDF page number is outside the document.");
    }
    const page = await pdfDocument.getPage(requestedPageNumber);
    const selectedPageNumber = Number(page.pageNumber);
    if (selectedPageNumber !== requestedPageNumber) {
      throw new Error("PDF.js returned a different page than requested.");
    }
    const viewport = page.getViewport({ scale: 1 });
    const displayWidth = Number(viewport.width);
    const displayHeight = Number(viewport.height);
    const rotation = Number(viewport.rotation);
    if (!(displayWidth > 0) || !(displayHeight > 0) || !Number.isFinite(rotation)) {
      throw new Error("PDF.js did not provide valid page display metadata.");
    }
    if (typeof document === "undefined") {
      throw new Error("PDF presentation requires a browser document.");
    }

    const optionScale = Number(options.renderScale);
    const renderScale = options.renderScale === undefined
      ? Number(window.devicePixelRatio) || 1
      : optionScale;
    if (!Number.isFinite(renderScale) || renderScale <= 0) {
      throw new Error("PDF presentation render scale must be positive.");
    }
    const rasterViewport = page.getViewport({ scale: renderScale, rotation });
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(rasterViewport.width));
    canvas.height = Math.max(1, Math.round(rasterViewport.height));
    const context = canvas.getContext("2d", { alpha: false });
    if (!context) {
      throw new Error("PDF presentation canvas is unavailable.");
    }
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    await page.render({
      canvasContext: context,
      viewport: rasterViewport,
      background: "#ffffff"
    }).promise;

    const referenceRaster = {
      available: true,
      dataUrl: canvas.toDataURL("image/png"),
      naturalWidth: canvas.width,
      naturalHeight: canvas.height,
      fileType: "png",
      source: "browser-pdfjs-selected-page-render",
      sourceDocumentSha256: selectedSha256,
      pageNumber: selectedPageNumber,
      displayWidth,
      displayHeight,
      rotation
    };
    return {
      schema: "laibe.planPuzzle.pdfSourcePresentation.v1",
      status: "source_presentation_ready",
      route: "genuine-user-file-selection",
      file: {
        name,
        byteLength: selectedByteLength,
        mimeType: mimeType || "application/pdf"
      },
      selectedSha256,
      selectedPageNumber,
      pageCount,
      displayWidth,
      displayHeight,
      rotation,
      referenceRaster,
      capturedAt: nowIso()
    };
  } finally {
    if (pdfDocument && typeof pdfDocument.destroy === "function") {
      await pdfDocument.destroy();
    }
  }
}

function a11BundleRequiredError(operation) {
  const error = new Error("An accepted A11 recognition bundle and passed gate receipt are required.");
  error.code = "A11_BUNDLE_REQUIRED";
  error.operation = operation;
  return error;
}

async function recognizeSelectedPdfFile() {
  throw a11BundleRequiredError("recognizeSelectedPdfFile");
}

const R6_EXISTING_OBJECT_POLICY = Object.freeze({
  source_kind: "pdf",
  object_status: "existing",
  work_action: "none",
  budget_trigger: "none",
  dbspec_projection: "excluded"
});

function createR6SessionToken(prefix) {
  const token = globalThis.crypto && typeof globalThis.crypto.randomUUID === "function"
    ? globalThis.crypto.randomUUID()
    : `${Date.now()}-${Math.floor(Math.random() * 1e9)}`;
  return `${prefix}-${token}`;
}

function r6SemanticReviewRows(scene) {
  const entries = []
    .concat(Array.isArray(scene && scene.openingCandidates) ? scene.openingCandidates.map((item) => ["opening", item]) : [])
    .concat(Array.isArray(scene && scene.stairCandidates) ? scene.stairCandidates.map((item) => ["stair", item]) : [])
    .concat(Array.isArray(scene && scene.stairVoidCandidates) ? scene.stairVoidCandidates.map((item) => ["stairVoid", item]) : [])
    .concat(Array.isArray(scene && scene.spaceBoundaryCandidates) ? scene.spaceBoundaryCandidates.map((item) => ["spaceBoundary", item]) : []);
  return entries.map(([kind, item]) => ({
    sourceId: item && (item.source_object_id || item.sourceId || item.id) || null,
    sourceRegionId: item && item.sourceRegionId || "page-1-unassigned",
    page: Number(item && item.page || scene && scene.page && scene.page.number || 1),
    category: kind,
    subtype: item && item.subtype || null,
    sourceBBox: item && (item.sourceBBox || item.bbox) || null,
    evidence: item && item.evidence || null,
    confidence: item && item.confidence || "candidate",
    machineStatus: "candidate_awaiting_user_review",
    userDecision: "pending",
    editableObjectId: null,
    mapping_state: "not_accepted",
    acceptedTransformId: null,
    policy: { ...R6_EXISTING_OBJECT_POLICY }
  })).filter((row) => Boolean(row.sourceId));
}

function r6WallBodyReviewSets(scene) {
  const groups = new Map();
  (Array.isArray(scene && scene.structuralWalls) ? scene.structuralWalls : []).forEach((wall) => {
    const p1 = wall && wall.p1;
    const p2 = wall && wall.p2;
    if (!p1 || !p2) return;
    const orientation = Math.abs(Number(p2.x) - Number(p1.x)) >= Math.abs(Number(p2.y) - Number(p1.y)) ? "horizontal" : "vertical";
    const key = `${wall.sourceRegionId || "page-1-unassigned"}:${orientation}`;
    const current = groups.get(key) || [];
    current.push(wall);
    groups.set(key, current);
  });
  return Array.from(groups.entries())
    .filter(([, walls]) => walls.length >= 2)
    .sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]))
    .slice(0, 2)
    .map(([key, walls], index) => ({
      reviewSetId: `wall-body-review-set-${index + 1}-${r4b1StableHash({ key, ids: walls.map((wall) => wall.source_object_id).sort() })}`,
      sourceRegionId: walls[0].sourceRegionId || "page-1-unassigned",
      method: "region-orientation-continuity-review-set",
      selectionRule: "user-reviewed-1-to-many-only",
      sourceObjectIds: walls.map((wall) => wall.source_object_id).filter(Boolean).sort(),
      candidateEditableObjectIds: [],
      decision: "pending_user_review",
      policy: { ...R6_EXISTING_OBJECT_POLICY }
    }));
}

async function importSelectedPdfFile() {
  throw a11BundleRequiredError("importSelectedPdfFile");
}

function summarizeForComparison(result) {
  return {
    sourceSha256: result.source.sha256,
    canonicalRawHash: result.extractor.canonicalRawHash,
    derivedSceneHash: result.adapter.derivedSceneHash,
    regionIds: result.regions.regionIds,
    sourceIds: result.deterministicIds.sourceIds,
    projectMutationChanged: result.projectMutation.changed
  };
}

function categoryCountsForScene(scene) {
  return {
    structuralWalls: Array.isArray(scene && scene.structuralWalls) ? scene.structuralWalls.length : 0,
    columns: Array.isArray(scene && scene.columns) ? scene.columns.length : 0,
    dimensionLines: Array.isArray(scene && scene.dimensionLines) ? scene.dimensionLines.length : 0,
    totalSourceRecords: sceneSourceRecords(scene).length
  };
}

function sortedSceneSourceIds(scene) {
  return sceneSourceRecords(scene).map((record) => record.sourceId).filter(Boolean).sort();
}

function regionCountsForScene(scene) {
  return sceneSourceRecords(scene).reduce((counts, record) => {
    const key = record.sourceRegionId || "page-1-unassigned";
    counts[key] = (counts[key] || 0) + 1;
    return counts;
  }, {});
}

function createDualExtractionStabilityComparison(first, second) {
  const firstIds = sortedSceneSourceIds(first && first.scene);
  const secondIds = sortedSceneSourceIds(second && second.scene);
  const firstCategoryCounts = categoryCountsForScene(first && first.scene);
  const secondCategoryCounts = categoryCountsForScene(second && second.scene);
  const firstRegionCounts = regionCountsForScene(first && first.scene);
  const secondRegionCounts = regionCountsForScene(second && second.scene);
  const checks = {
    sourceByteLengthStable: first.source.byteLength === second.source.byteLength,
    sourceSha256Stable: first.source.sha256 === second.source.sha256 && first.source.sha256 === EXPECTED_SOURCE_SHA256,
    pdfjsVersionStable: first.pdfjs.version === second.pdfjs.version,
    pageCountStable: first.pdfjs.pageCount === second.pdfjs.pageCount,
    pageDimensionsStable: sameJsonValue(first.pdfjs.page, second.pdfjs.page),
    extractorApiStable: first.extractor.api === second.extractor.api,
    extractorVersionStable: first.extractor.version === second.extractor.version,
    extractorFileHashStable: first.extractor.file && second.extractor.file && first.extractor.file.sha256 === second.extractor.file.sha256,
    canonicalRawHashStable: first.extractor.canonicalRawHash === second.extractor.canonicalRawHash,
    transformProfileStable: sameJsonValue(first.regions.coordinateTransform, second.regions.coordinateTransform),
    transformMatrixAndPageHeightExact: first.regions.coordinateTransform &&
      Number(first.regions.coordinateTransform.pageHeightPt) === PDF_PAGE_HEIGHT_PT &&
      transformMatrixMatches(first.regions.coordinateTransform.matrix),
    correctedSourceProfileHashStable: first.regions.sourceProfileHash === second.regions.sourceProfileHash,
    correctedSceneHashStable: first.adapter.derivedSceneHash === second.adapter.derivedSceneHash,
    regionIdsStable: sameJsonValue(first.regions.regionIds, second.regions.regionIds),
    regionCountsStable: sameJsonValue(firstRegionCounts, secondRegionCounts),
    categoryCountsStable: sameJsonValue(firstCategoryCounts, secondCategoryCounts),
    sortedSourceIdSetStable: sameJsonValue(firstIds, secondIds),
    sortedSourceIdSetCount244: firstIds.length === 244 && secondIds.length === 244,
    noRunDerivedSourceIdPatterns: first.deterministicIds.hasDateNowOrRandomPattern === false && second.deterministicIds.hasDateNowOrRandomPattern === false,
    readOnlySecondRunNoProjectMutation: second.projectMutation.changed === false
  };
  const failedChecks = Object.keys(checks).filter((key) => checks[key] !== true);
  return {
    schema: "laibe.planPuzzle.gateB.r3_2_2.dualExactSourceExtractionStability.v1",
    run1: {
      qaRunId: first.qaRunId,
      sourceByteLength: first.source.byteLength,
      sourceSha256: first.source.sha256,
      pdfjs: first.pdfjs,
      extractorApi: first.extractor.api,
      extractorVersion: first.extractor.version,
      extractorFile: first.extractor.file,
      canonicalRawHash: first.extractor.canonicalRawHash,
      sourceProfileHash: first.regions.sourceProfileHash,
      sceneHash: first.adapter.derivedSceneHash,
      regionIds: first.regions.regionIds,
      regionCounts: firstRegionCounts,
      categoryCounts: firstCategoryCounts,
      sortedSourceIds: firstIds,
      hasDateNowOrRandomPattern: first.deterministicIds.hasDateNowOrRandomPattern
    },
    run2: {
      qaRunId: second.qaRunId,
      sourceByteLength: second.source.byteLength,
      sourceSha256: second.source.sha256,
      pdfjs: second.pdfjs,
      extractorApi: second.extractor.api,
      extractorVersion: second.extractor.version,
      extractorFile: second.extractor.file,
      canonicalRawHash: second.extractor.canonicalRawHash,
      sourceProfileHash: second.regions.sourceProfileHash,
      sceneHash: second.adapter.derivedSceneHash,
      regionIds: second.regions.regionIds,
      regionCounts: secondRegionCounts,
      categoryCounts: secondCategoryCounts,
      sortedSourceIds: secondIds,
      hasDateNowOrRandomPattern: second.deterministicIds.hasDateNowOrRandomPattern
    },
    checks,
    failedChecks,
    pass: failedChecks.length === 0
  };
}

async function runLocalhostQa() {
  if (!isLocalhost()) {
    throw new Error("The exact-source QA trigger is available only on localhost.");
  }
  const params = new URLSearchParams(location.search);
  const source = params.get("laibePdfExactSource") || DEFAULT_QA_SOURCE;
  const first = await extractFromUrl(source, {
    qaRunId: "gate-a1-capability-repair-r1-run-1",
    expectedSha256: EXPECTED_SOURCE_SHA256,
    mirror: false,
    renderDiagnostics: false
  });
  const second = await extractFromUrl(source, {
    qaRunId: "gate-a1-capability-repair-r1-run-2",
    expectedSha256: EXPECTED_SOURCE_SHA256,
    mirror: false,
    renderDiagnostics: true
  });
  const firstSummary = summarizeForComparison(first);
  const secondSummary = summarizeForComparison(second);
  const comparison = {
    sourceSha256Stable: firstSummary.sourceSha256 === secondSummary.sourceSha256,
    canonicalRawHashStable: firstSummary.canonicalRawHash === secondSummary.canonicalRawHash,
    derivedSceneHashStable: firstSummary.derivedSceneHash === secondSummary.derivedSceneHash,
    regionIdsStable: stableStringify(firstSummary.regionIds) === stableStringify(secondSummary.regionIds),
    sourceIdsStable: stableStringify(firstSummary.sourceIds) === stableStringify(secondSummary.sourceIds),
    noProjectMutationBothRuns: !first.projectMutation.changed && !second.projectMutation.changed
  };
  const regionTruthOk = Boolean(
    second.regions.profileApplied &&
    second.regions.profileSource === "AA_ACCEPTED_GATE_A2_SOURCE_ONLY_20260716" &&
    second.regions.has3F &&
    second.regions.hasRF &&
    second.regions.status === "sha256-bound-human-verified-profile-applied"
  );
  const payload = {
    schema: "laibe.planPuzzle.exactSourceQaDualRun.v1",
    status: Object.values(comparison).every(Boolean) && regionTruthOk ? "ok" : "partial",
    runtimeVersion: RUNTIME_VERSION,
    source,
    runs: [first, second],
    comparison,
    regionTruthOk,
    capturedAt: nowIso()
  };
  mirrorQaJson(payload);
  window.__laibePdfExactSourceQaLastResult = payload;
  return payload;
}

function requireQaCanvasExportRoute() {
  if (!isLocalhost()) {
    throw new Error("QA canvas export is available only on localhost.");
  }
  if (!hasExactSourceQaRoute()) {
    throw new Error("QA canvas export requires the localhost exact-source QA route.");
  }
}

function latestQaRun(result) {
  if (!result || typeof result !== "object") {
    throw new Error("Fresh exact-source QA result is unavailable.");
  }
  if (result.status !== "ok" || result.regionTruthOk !== true) {
    throw new Error("Exact-source QA result is not ready for canvas export.");
  }
  if (!Array.isArray(result.runs) || result.runs.length < 2) {
    throw new Error("Exact-source QA dual-run payload is incomplete.");
  }
  const finalRun = result.runs[result.runs.length - 1];
  const regions = finalRun && finalRun.regions || {};
  const source = finalRun && finalRun.source || {};
  const comparison = result.comparison || {};
  const projectMutation = result.runs.some((run) => run && run.projectMutation && run.projectMutation.changed);
  if (source.sha256 !== EXPECTED_SOURCE_SHA256 || source.expectedSha256Match !== true) {
    throw new Error("Exact-source QA result does not match the protected PDF SHA.");
  }
  if (
    regions.profileApplied !== true ||
    regions.profileSource !== "AA_ACCEPTED_GATE_A2_SOURCE_ONLY_20260716" ||
    regions.status !== "sha256-bound-human-verified-profile-applied" ||
    regions.has3F !== true ||
    regions.hasRF !== true ||
    !regions.sourceProfileHash
  ) {
    throw new Error("Exact-source QA result does not have the protected human-verified source profile.");
  }
  if (comparison.noProjectMutationBothRuns !== true || projectMutation) {
    throw new Error("Exact-source QA result indicates Plan Puzzle project mutation.");
  }
  if (!finalRun.adapter || !finalRun.adapter.derivedSceneHash) {
    throw new Error("Exact-source QA result is missing the derived scene hash.");
  }
  return finalRun;
}

function summarizePdfObjectPolicy(scene) {
  const objects = collectSceneObjects(scene);
  const countMatching = (predicate) => objects.filter(predicate).length;
  const policy = scene && scene.pdfObjectPolicy || {};
  const qaCounters = scene && scene.qaCounters || {};
  return {
    totalPdfDerivedObjectCount: objects.length,
    sourceKindPdfCount: countMatching((item) => item && item.source_kind === "pdf"),
    objectStatusExistingCount: countMatching((item) => item && item.object_status === "existing"),
    workActionNoneCount: countMatching((item) => item && item.work_action === "none"),
    budgetTriggerNoneCount: countMatching((item) => item && item.budget_trigger === "none"),
    dbspecProjectionExcludedCount: countMatching((item) => item && item.dbspec_projection === "excluded"),
    editableObjectIdNullCount: countMatching((item) => item && item.editable_object_id === null),
    mappingStateNotAcceptedCount: countMatching((item) => item && item.mapping_state === "not_accepted"),
    objectCountByRegion: qaCounters.objectCountByRegion || {},
    packageCounters: {
      pdf_derived_new_object_count: Number(policy.pdf_derived_new_object_count || qaCounters.pdf_derived_new_object_count || 0),
      automatic_budget_candidate_count: Number(policy.automatic_budget_candidate_count || qaCounters.automatic_budget_candidate_count || 0),
      automatic_dbspec_projection_count: Number(policy.automatic_dbspec_projection_count || qaCounters.automatic_dbspec_projection_count || 0)
    }
  };
}

function resolveQaCanvases() {
  const panel = document.querySelector('[aria-label="PDF region truth QA"]');
  if (!panel || panel.id !== QA_PANEL_ID) {
    throw new Error("PDF region truth QA panel is unavailable.");
  }
  const canvases = Array.from(panel.querySelectorAll("canvas"));
  if (canvases.length !== QA_CANVAS_EXPORT_SPECS.length) {
    throw new Error("Expected exactly three rendered QA canvases.");
  }
  return QA_CANVAS_EXPORT_SPECS.map((spec, index) => {
    const canvas = canvases[index];
    if (!(canvas instanceof HTMLCanvasElement)) {
      throw new Error("QA export target is not an HTMLCanvasElement.");
    }
    if (canvas.width !== spec.width || canvas.height !== spec.height) {
      throw new Error(spec.role + " QA canvas has unexpected intrinsic dimensions.");
    }
    if (spec.ordinal > 0 && canvas.dataset.regionId !== spec.sourceRegionId) {
      throw new Error(spec.role + " QA canvas is bound to the wrong source region.");
    }
    return canvas;
  });
}

async function canvasToPngExportRecord(canvas, spec) {
  if (!HTMLCanvasElement.prototype || typeof HTMLCanvasElement.prototype.toBlob !== "function") {
    throw new Error("HTMLCanvasElement.toBlob is unavailable.");
  }
  let invocationCount = 0;
  const blob = await new Promise((resolve, reject) => {
    invocationCount += 1;
    HTMLCanvasElement.prototype.toBlob.call(canvas, (candidate) => {
      if (!candidate) {
        reject(new Error(spec.role + " QA canvas did not produce a PNG blob."));
        return;
      }
      resolve(candidate);
    }, "image/png");
  });
  if (invocationCount !== 1) {
    throw new Error(spec.role + " QA canvas export invocation count drifted.");
  }
  if (blob.type !== "image/png") {
    throw new Error(spec.role + " QA canvas export returned a non-PNG blob.");
  }
  const buffer = await blob.arrayBuffer();
  return {
    role: spec.role,
    ordinal: spec.ordinal,
    sourceRegionId: spec.sourceRegionId,
    intrinsicWidth: canvas.width,
    intrinsicHeight: canvas.height,
    mime: blob.type,
    byteLength: buffer.byteLength,
    sha256: await sha256Hex(buffer),
    invocationCount,
    base64: bytesToBase64(buffer)
  };
}

async function exportLocalhostQaCanvasPngs() {
  requireQaCanvasExportRoute();
  const qaPromise = window.__laibePdfExactSourceQaPromise;
  if (!qaPromise || typeof qaPromise.then !== "function") {
    throw new Error("Fresh exact-source QA promise is unavailable.");
  }
  const qaResult = await qaPromise;
  const finalRun = latestQaRun(qaResult);
  const canvases = resolveQaCanvases();
  const exports = [];
  for (let index = 0; index < QA_CANVAS_EXPORT_SPECS.length; index += 1) {
    exports.push(await canvasToPngExportRecord(canvases[index], QA_CANVAS_EXPORT_SPECS[index]));
  }
  return {
    schema: "laibe.planPuzzle.qaCanvasPngExport.v1",
    status: "ok",
    runtimeVersion: RUNTIME_VERSION,
    sourceSha256: finalRun.source.sha256,
    profileHash: finalRun.regions.sourceProfileHash,
    sceneHash: finalRun.adapter.derivedSceneHash,
    screenshotCallCount: 0,
    projectMutation: false,
    policyBinding: summarizePdfObjectPolicy(finalRun.scene),
    exports
  };
}

function sanitizedQaCanvasExportError(error) {
  const message = error && error.message ? String(error.message) : String(error || "QA canvas export receipt failed.");
  return message.replace(/\s+/g, " ").slice(0, 220);
}

function createQaCanvasExportReceiptNode() {
  let node = document.getElementById(QA_CANVAS_EXPORT_RECEIPT_NODE_ID);
  if (node) return node;
  node = document.createElement("script");
  node.id = QA_CANVAS_EXPORT_RECEIPT_NODE_ID;
  node.type = "application/json";
  node.hidden = true;
  node.dataset.status = "pending";
  node.textContent = JSON.stringify({
    schema: QA_CANVAS_EXPORT_RECEIPT_SCHEMA,
    status: "pending",
    trigger: "localhost-qa-query",
    exportInvocationCount: 0
  });
  document.documentElement.appendChild(node);
  return node;
}

function writeQaCanvasExportReceipt(node, receipt) {
  const status = receipt && receipt.status === "ok" ? "ok" : "error";
  node.dataset.status = status;
  node.textContent = JSON.stringify(receipt);
}

async function runLocalhostQaCanvasExportReceipt(qaPromise) {
  if (!isLocalhost() || !hasQaCanvasExportReceiptRoute()) return;
  const node = createQaCanvasExportReceiptNode();
  let exportInvocationCount = 0;
  try {
    const qaResult = await qaPromise;
    if (!qaResult || qaResult.status !== "ok" || qaResult.regionTruthOk !== true) {
      throw new Error("Exact-source QA result is not ready for canvas export receipt.");
    }
    exportInvocationCount += 1;
    const payload = await exportLocalhostQaCanvasPngs();
    writeQaCanvasExportReceipt(node, {
      schema: QA_CANVAS_EXPORT_RECEIPT_SCHEMA,
      status: "ok",
      trigger: "localhost-qa-query",
      exportInvocationCount,
      payload
    });
  } catch (error) {
    writeQaCanvasExportReceipt(node, {
      schema: QA_CANVAS_EXPORT_RECEIPT_SCHEMA,
      status: "error",
      trigger: "localhost-qa-query",
      exportInvocationCount,
      error: sanitizedQaCanvasExportError(error)
    });
  }
}

function gateA2RegionToSceneRegion(region) {
  if (region === "p1-3f") return "page-1-region-3f";
  if (region === "p1-rf") return "page-1-region-rf";
  return "page-1-unassigned";
}

function boxFromArray(value) {
  if (!Array.isArray(value) || value.length < 4) return null;
  const nums = value.slice(0, 4).map(Number);
  if (!nums.every(Number.isFinite)) return null;
  return {
    x0: Math.min(nums[0], nums[2]),
    y0: Math.min(nums[1], nums[3]),
    x1: Math.max(nums[0], nums[2]),
    y1: Math.max(nums[1], nums[3])
  };
}

function boxCenter(box) {
  return box ? { x: (box.x0 + box.x1) / 2, y: (box.y0 + box.y1) / 2 } : null;
}

function boxArea(box) {
  return box ? Math.max(0, box.x1 - box.x0) * Math.max(0, box.y1 - box.y0) : 0;
}

function boxIntersectionArea(a, b) {
  if (!a || !b) return 0;
  const x0 = Math.max(a.x0, b.x0);
  const y0 = Math.max(a.y0, b.y0);
  const x1 = Math.min(a.x1, b.x1);
  const y1 = Math.min(a.y1, b.y1);
  return Math.max(0, x1 - x0) * Math.max(0, y1 - y0);
}

function boxIou(a, b) {
  const intersection = boxIntersectionArea(a, b);
  const union = boxArea(a) + boxArea(b) - intersection;
  return union > 0 ? intersection / union : 0;
}

function boxContainmentRatio(a, b) {
  const intersection = boxIntersectionArea(a, b);
  const sourceArea = boxArea(a);
  const candidateArea = boxArea(b);
  const denominator = Math.min(sourceArea || Infinity, candidateArea || Infinity);
  return Number.isFinite(denominator) && denominator > 0 ? intersection / denominator : 0;
}

function centerDistance(a, b) {
  const ac = boxCenter(a);
  const bc = boxCenter(b);
  if (!ac || !bc) return Infinity;
  return Math.hypot(ac.x - bc.x, ac.y - bc.y);
}

function sourceBoxOfSceneItem(item) {
  if (!item) return null;
  if (item.sourceBBox) return boxFromArray([item.sourceBBox.x0, item.sourceBBox.y0, item.sourceBBox.x1, item.sourceBBox.y1]);
  if (item.bbox) return boxFromArray([item.bbox.x0, item.bbox.y0, item.bbox.x1, item.bbox.y1]);
  if (item.p1 && item.p2) {
    const pad = Math.max(0.25, Number(item.width) || 0);
    return boxFromArray([
      Math.min(Number(item.p1.x), Number(item.p2.x)) - pad,
      Math.min(Number(item.p1.y), Number(item.p2.y)) - pad,
      Math.max(Number(item.p1.x), Number(item.p2.x)) + pad,
      Math.max(Number(item.p1.y), Number(item.p2.y)) + pad
    ]);
  }
  return null;
}

function sceneItemsForGateA2Category(scene, category) {
  if (category === "wall_body") return Array.isArray(scene && scene.structuralWalls) ? scene.structuralWalls : [];
  if (category === "column") return Array.isArray(scene && scene.columns) ? scene.columns : [];
  if (category === "dimension_anchor") return Array.isArray(scene && scene.dimensionLines) ? scene.dimensionLines : [];
  return [];
}

function gateA2MatchTolerance(category) {
  if (category === "column") return { centerDistancePt: 48, minIou: 0.02, minContainment: 0.2 };
  if (category === "dimension_anchor") return { centerDistancePt: 95, minIou: 0.005, minContainment: 0.1 };
  return { centerDistancePt: 90, minIou: 0.005, minContainment: 0.1 };
}

function hydrateGateA2Record(record) {
  const geometry = GATE_A2_SOURCE_GEOMETRY[record.id] || {};
  const topLeftBbox = Array.isArray(geometry.bbox) ? Array.from(geometry.bbox) : null;
  const topLeftEndpoints = Array.isArray(geometry.endpoints) ? geometry.endpoints.map((point) => Array.from(point)) : null;
  return {
    ...record,
    sub: geometry.sub || record.sub || null,
    state: geometry.state || null,
    conf: geometry.conf == null ? null : geometry.conf,
    source_bbox_pdf_pt_top_left: topLeftBbox,
    source_bbox_pdf_pt_scene_bottom_left: topLeftBbox ? gateA2BboxToSceneBbox(topLeftBbox) : null,
    bboxTransformRoundTrip: topLeftBbox ? coordinateFrameRoundTripForBbox(topLeftBbox) : null,
    endpoints_pdf_pt_top_left: topLeftEndpoints,
    endpoints_pdf_pt_scene_bottom_left: topLeftEndpoints ? topLeftEndpoints.map((point) => gateA2PointToScenePoint(point)) : null,
    uncertain: Boolean(record.uncertain || geometry.uncertain)
  };
}

function scoreGateA2CandidateWithBox(record, item, sourceBox, options = {}) {
  const expectedRegionId = gateA2RegionToSceneRegion(record.region);
  const candidateRegionId = item && item.sourceRegionId || "page-1-unassigned";
  const candidateBox = sourceBoxOfSceneItem(item);
  const distance = centerDistance(sourceBox, candidateBox);
  const overlap = boxIou(sourceBox, candidateBox);
  const intersectionArea = boxIntersectionArea(sourceBox, candidateBox);
  const containmentRatio = boxContainmentRatio(sourceBox, candidateBox);
  const tolerance = gateA2MatchTolerance(record.cat);
  const positiveGeometryGate = intersectionArea > 0 &&
    (overlap >= tolerance.minIou || containmentRatio >= tolerance.minContainment);
  const requireRegionCompatibility = options.requireRegionCompatibility !== false;
  const regionCompatible = candidateRegionId === expectedRegionId;
  const distanceWithinRankingTolerance = Number.isFinite(distance) && distance <= tolerance.centerDistancePt;
  return {
    sourceObjectId: item && (item.source_object_id || item.sourceId || item.id) || null,
    expectedRegionId,
    candidateRegionId,
    regionCompatible,
    sourceBox,
    candidateBox,
    centerDistancePt: Number.isFinite(distance) ? Math.round(distance * 1000) / 1000 : null,
    overlapRatio: Math.round(overlap * 1000000) / 1000000,
    intersectionArea: Math.round(intersectionArea * 1000000) / 1000000,
    containmentRatio: Math.round(containmentRatio * 1000000) / 1000000,
    tolerance,
    positiveGeometryGate,
    distanceWithinRankingTolerance,
    pass: positiveGeometryGate && (!requireRegionCompatibility || regionCompatible),
    failedRule: !positiveGeometryGate
      ? "requires_nonzero_intersection_and_minimum_overlap_or_containment"
      : (regionCompatible || !requireRegionCompatibility ? null : "corrected_region_metadata_mismatch")
  };
}

function scoreGateA2Candidate(record, item) {
  return scoreGateA2CandidateWithBox(record, item, boxFromArray(record.source_bbox_pdf_pt_scene_bottom_left || record.source_bbox_pdf_pt_top_left), {
    requireRegionCompatibility: true
  });
}

function findGateA2CoordinateMatchWithBox(scene, record, sourceBox, options = {}) {
  const sourceRegionId = gateA2RegionToSceneRegion(record.region);
  const candidates = sceneItemsForGateA2Category(scene, record.cat)
    .map((item) => ({ item, score: scoreGateA2CandidateWithBox(record, item, sourceBox, options) }))
    .filter((entry) => entry.score.sourceObjectId);
  const passing = candidates.filter((entry) => entry.score.pass)
    .sort((a, b) => (b.score.overlapRatio - a.score.overlapRatio) || ((a.score.centerDistancePt || Infinity) - (b.score.centerDistancePt || Infinity)));
  return {
    sourceRegionId,
    tolerance: gateA2MatchTolerance(record.cat),
    candidateSet: candidates.map((entry) => entry.score),
    ambiguityCount: passing.length,
    matched: passing.length === 1 ? passing[0] : null
  };
}

function findGateA2CoordinateMatch(scene, record) {
  return findGateA2CoordinateMatchWithBox(scene, record, boxFromArray(record.source_bbox_pdf_pt_scene_bottom_left || record.source_bbox_pdf_pt_top_left), {
    requireRegionCompatibility: true
  });
}

function firstRuntimeRowForSource(runtimeIndex, sourceId, requireEditable) {
  const rows = runtimeIndex && runtimeIndex.bySourceId && runtimeIndex.bySourceId[sourceId] || [];
  if (requireEditable) {
    return rows.find((row) => row && row.editableObjectId) || null;
  }
  return rows[0] || null;
}

function createGateA2Dispositions(scene, runtimeIndex) {
  const usedEditableIds = new Set();
  return GATE_A2_SOURCE_RECORDS.map((baseRecord) => {
    const record = hydrateGateA2Record(baseRecord);
    const sourceRegionId = gateA2RegionToSceneRegion(record.region);
    const common = {
      sourceId: record.id,
      category: record.cat,
      sub: record.sub,
      sourceRegionId,
      source_bbox_pdf_pt_top_left: record.source_bbox_pdf_pt_top_left,
      source_bbox_pdf_pt_scene_bottom_left: record.source_bbox_pdf_pt_scene_bottom_left,
      endpoints_pdf_pt_top_left: record.endpoints_pdf_pt_top_left,
      endpoints_pdf_pt_scene_bottom_left: record.endpoints_pdf_pt_scene_bottom_left,
      coordinateFrameTransform: GATE_A2_TO_SCENE_FRAME_TRANSFORM,
      bboxTransformRoundTrip: record.bboxTransformRoundTrip,
      mapping_state: "not_accepted",
      profile: GATE_A2_SOURCE_INVENTORY_IDENTITY
    };
    if (record.uncertain || record.cat === "opening_or_marker" || record.cat === "opening_or_boundary") {
      return {
        ...common,
        disposition: "ignored_uncertain",
        reason: "gate_a2_uncertain_source_symbol_not_promoted"
      };
    }
    if (record.cat === "opening" || record.cat === "stair_region" || record.cat === "space_boundary_sample") {
      return {
        ...common,
        disposition: "unmapped_with_reason",
        reason: "production_extractor_adapter_has_no_truthful_" + record.cat + "_output"
      };
    }
    const match = findGateA2CoordinateMatch(scene, record);
    if (!match.matched) {
      return {
        ...common,
        disposition: "unmapped_with_reason",
        reason: match.ambiguityCount > 1 ? "coordinate_match_ambiguous" : "no_coordinate_match_within_tolerance",
        coordinateMatch: match
      };
    }
    const matchedSourceId = match.matched.score.sourceObjectId;
    const runtimeRow = firstRuntimeRowForSource(runtimeIndex, matchedSourceId, record.cat !== "dimension_anchor");
    if (record.cat === "dimension_anchor") {
      return {
        ...common,
        disposition: "evidence_only",
        mappedRuntimeSourceId: matchedSourceId,
        editableObjectId: null,
        runtimeRow: runtimeRow || null,
        coordinateMatch: match
      };
    }
    if (!runtimeRow || !runtimeRow.editableObjectId) {
      return {
        ...common,
        disposition: "unmapped_with_reason",
        mappedRuntimeSourceId: matchedSourceId,
        editableObjectId: null,
        reason: "coordinate_matched_scene_record_not_promoted_to_live_editable",
        runtimeRow: runtimeRow || null,
        coordinateMatch: match
      };
    }
    if (usedEditableIds.has(runtimeRow.editableObjectId)) {
      return {
        ...common,
        disposition: "unmapped_with_reason",
        mappedRuntimeSourceId: matchedSourceId,
        editableObjectId: runtimeRow.editableObjectId,
        reason: "duplicate_live_object_mapping_without_reviewed_one_to_many_relationship",
        runtimeRow,
        coordinateMatch: match
      };
    }
    usedEditableIds.add(runtimeRow.editableObjectId);
    return {
      ...common,
      disposition: "candidate_mapped_unaccepted",
      mappedRuntimeSourceId: matchedSourceId,
      editableObjectId: runtimeRow.editableObjectId,
      runtimeRow,
      coordinateMatch: match
    };
  });
}

function summarizeGateA2Dispositions(dispositions) {
  const counts = {};
  (dispositions || []).forEach((item) => {
    counts[item.disposition] = (counts[item.disposition] || 0) + 1;
  });
  const ids = (dispositions || []).map((item) => item.sourceId);
  const uniqueIds = new Set(ids);
  return {
    total: (dispositions || []).length,
    counts,
    uniqueSourceIdCount: uniqueIds.size,
    duplicateSourceIds: ids.filter((id, index) => ids.indexOf(id) !== index),
    allRecordsResolvedToOneDisposition: (dispositions || []).length === GATE_A2_SOURCE_RECORDS.length &&
      uniqueIds.size === GATE_A2_SOURCE_RECORDS.length &&
      (dispositions || []).every((item) => ["candidate_mapped_unaccepted", "evidence_only", "ignored_uncertain", "unmapped_with_reason"].includes(item.disposition)),
    unmappedSourceIds: (dispositions || []).filter((item) => item.disposition === "unmapped_with_reason").map((item) => item.sourceId),
    candidateMappedWithoutEditableId: (dispositions || []).filter((item) => item.disposition === "candidate_mapped_unaccepted" && !item.editableObjectId).map((item) => item.sourceId)
  };
}

function representativeGateA2Records() {
  return GATE_A2_SOURCE_RECORDS
    .filter((record) => record.cat === "wall_body" || record.cat === "column" || record.cat === "dimension_anchor")
    .map(hydrateGateA2Record);
}

function evaluateRepresentativeCorrespondence(scene, options = {}) {
  const mode = options.mode || "correct_transform";
  const records = representativeGateA2Records();
  const rows = records.map((record) => {
    let sourceBox = boxFromArray(record.source_bbox_pdf_pt_scene_bottom_left);
    if (mode === "identity_top_left") {
      sourceBox = boxFromArray(record.source_bbox_pdf_pt_top_left);
    } else if (mode === "wrong_page_height") {
      sourceBox = boxFromArray(gateA2BboxToSceneBbox(record.source_bbox_pdf_pt_top_left, PDF_PAGE_HEIGHT_PT + 9));
    } else if (mode === "wrong_direction") {
      const bbox = record.source_bbox_pdf_pt_top_left || [];
      sourceBox = boxFromArray([bbox[0], PDF_PAGE_HEIGHT_PT + Number(bbox[1]), bbox[2], PDF_PAGE_HEIGHT_PT + Number(bbox[3])]);
    }
    const match = findGateA2CoordinateMatchWithBox(scene, record, sourceBox, {
      requireRegionCompatibility: mode === "correct_transform"
    });
    const positiveCandidateCount = match.candidateSet.filter((candidate) => candidate.positiveGeometryGate).length;
    return {
      sourceId: record.id,
      category: record.cat,
      expectedRegionId: gateA2RegionToSceneRegion(record.region),
      mode,
      sourceBox,
      positiveCandidateCount,
      positiveGeometryObserved: positiveCandidateCount > 0,
      uniqueAcceptanceMatch: Boolean(match.matched),
      ambiguityCount: match.ambiguityCount,
      matchedSourceObjectId: match.matched && match.matched.score && match.matched.score.sourceObjectId || null,
      candidateSet: match.candidateSet
    };
  });
  return {
    schema: "laibe.planPuzzle.gateB.r3_2_1.representativeCorrespondence.v1",
    mode,
    expectedCount: 10,
    total: rows.length,
    positiveGeometryCount: rows.filter((row) => row.positiveGeometryObserved).length,
    uniqueAcceptanceMatchCount: rows.filter((row) => row.uniqueAcceptanceMatch).length,
    pass: mode === "correct_transform" && rows.length === 10 && rows.every((row) => row.positiveGeometryObserved),
    rows
  };
}

function createRegionMetadataAudit(gateA2Ledger) {
  const rows = (gateA2Ledger || [])
    .filter((record) => record.category === "column" || record.category === "dimension_anchor")
    .map((record) => {
      const matchedScore = record.coordinateMatch && record.coordinateMatch.matched && record.coordinateMatch.matched.score || null;
      const candidateScores = record.coordinateMatch && Array.isArray(record.coordinateMatch.candidateSet) ? record.coordinateMatch.candidateSet : [];
      const regionCompatibleCandidate = matchedScore || candidateScores.find((candidate) => candidate.positiveGeometryGate && candidate.regionCompatible) || null;
      return {
        sourceId: record.sourceId,
        category: record.category,
        expectedRegionId: record.sourceRegionId,
        observedRegionId: regionCompatibleCandidate && regionCompatibleCandidate.candidateRegionId || null,
        positiveGeometryGate: Boolean(regionCompatibleCandidate && regionCompatibleCandidate.positiveGeometryGate),
        regionCompatible: Boolean(regionCompatibleCandidate && regionCompatibleCandidate.regionCompatible),
        pass: Boolean(regionCompatibleCandidate && regionCompatibleCandidate.positiveGeometryGate && regionCompatibleCandidate.regionCompatible)
      };
    });
  return {
    schema: "laibe.planPuzzle.gateB.r3_2_1.regionMetadataAudit.v1",
    expectedCount: 8,
    total: rows.length,
    passCount: rows.filter((row) => row.pass).length,
    pass: rows.length === 8 && rows.every((row) => row.pass),
    rows
  };
}

function createLiveGeometryBinding(runtimeIndex, importSessionId) {
  const rows = (runtimeIndex && Array.isArray(runtimeIndex.rows) ? runtimeIndex.rows : [])
    .filter((row) => (row.runtimeKind === "wall" || row.runtimeKind === "structure") && row.editableObjectId)
    .map((row) => ({
      sourceId: row.sourceId,
      editableObjectId: row.editableObjectId,
      itemId: row.itemId,
      freshImportSessionId: row.importSessionId,
      runtimeKind: row.runtimeKind,
      runtimeCategory: row.actualLiveGeometry && row.actualLiveGeometry.structure && row.actualLiveGeometry.structure.category || row.runtimeKind,
      actualLiveGeometry: row.actualLiveGeometry || null,
      provenanceSourceBBox: row.provenanceSourceBBox || null,
      provenance: row.provenance || null,
      sceneToLiveProjection: row.sceneToLiveProjection || null,
      status: "observed_not_accepted",
      mapping_state: row.provenance && row.provenance.mapping_state || "not_accepted",
      sourceBBoxEchoUsedAsLiveGeometry: row.provenanceSourceBBoxEchoedAsLiveGeometry === true
    }));
  return {
    schema: "laibe.planPuzzle.gateB.r3_2_1.liveGeometryBinding.v1",
    expectedFreshImportSessionId: importSessionId,
    total: rows.length,
    wallCount: rows.filter((row) => row.runtimeKind === "wall").length,
    structureCount: rows.filter((row) => row.runtimeKind === "structure").length,
    allRowsFreshSession: rows.every((row) => row.freshImportSessionId === importSessionId),
    allRowsHaveLiveGeometry: rows.every((row) => row.actualLiveGeometry && row.actualLiveGeometry.hasCanonicalLiveGeometry === true),
    allRowsObservedNotAccepted: rows.every((row) => row.status === "observed_not_accepted" && row.mapping_state === "not_accepted"),
    allRowsHaveProjectionMetadata: rows.every((row) => row.sceneToLiveProjection && row.sceneToLiveProjection.status === "observed_unaccepted"),
    noSourceBBoxEchoAsLiveGeometry: rows.every((row) => row.sourceBBoxEchoUsedAsLiveGeometry === false),
    pass: rows.length > 0 &&
      rows.every((row) => row.freshImportSessionId === importSessionId) &&
      rows.every((row) => row.actualLiveGeometry && row.actualLiveGeometry.hasCanonicalLiveGeometry === true) &&
      rows.every((row) => row.sceneToLiveProjection && row.sceneToLiveProjection.status === "observed_unaccepted") &&
      rows.every((row) => row.sourceBBoxEchoUsedAsLiveGeometry === false),
    rows
  };
}

function deepCloneJson(value) {
  return JSON.parse(JSON.stringify(value));
}

function sameJsonValue(a, b) {
  return stableStringify(a) === stableStringify(b);
}

function transformMatrixMatches(matrix) {
  return sameJsonValue(matrix, GATE_A2_TO_SCENE_FRAME_TRANSFORM.matrix);
}

function createTransformRoundTripAudit() {
  const rows = Object.keys(GATE_A2_SOURCE_GEOMETRY).map((sourceId) => {
    const geometry = GATE_A2_SOURCE_GEOMETRY[sourceId] || {};
    const roundTrip = coordinateFrameRoundTripForBbox(geometry.bbox);
    return {
      sourceId,
      sourceBbox: Array.isArray(geometry.bbox) ? Array.from(geometry.bbox) : null,
      roundTrip,
      pass: Boolean(roundTrip && roundTrip.maxResidualPt === 0)
    };
  });
  return {
    schema: "laibe.planPuzzle.gateB.r3_2_2.transformRoundTripAudit.v1",
    pageHeightPt: PDF_PAGE_HEIGHT_PT,
    total: rows.length,
    maxResidualPt: rows.reduce((max, row) => Math.max(max, Number(row.roundTrip && row.roundTrip.maxResidualPt) || 0), 0),
    pass: rows.length === Object.keys(GATE_A2_SOURCE_GEOMETRY).length && rows.every((row) => row.pass),
    rows
  };
}

function createExcludedAreaInvariantAudit(scene) {
  const records = sceneSourceRecords(scene);
  const profile = HUMAN_VERIFIED_SOURCE_PROFILES[EXPECTED_SOURCE_SHA256];
  const excludedAreas = profile ? profile.excluded_areas.map((area) => ({
    id: area.id,
    reason: area.reason,
    bbox_scene_bottom_left_pdf_pt: gateA2BboxToSceneBbox(area.bbox)
  })) : [];
  const rows = excludedAreas.map((area) => {
    const areaBox = boxFromArray(area.bbox_scene_bottom_left_pdf_pt);
    const contained = records.filter((record) => {
      const center = boxCenter(record.sourceBBox);
      return Boolean(center && areaBox && center.x >= areaBox.x0 && center.x <= areaBox.x1 && center.y >= areaBox.y0 && center.y <= areaBox.y1);
    });
    const wronglyFloorAssigned = contained.filter((record) => record.sourceRegionId === "page-1-region-3f" || record.sourceRegionId === "page-1-region-rf");
    return {
      areaId: area.id,
      reason: area.reason,
      containedSourceRecordCount: contained.length,
      wronglyFloorAssignedCount: wronglyFloorAssigned.length,
      wronglyFloorAssignedSourceIds: wronglyFloorAssigned.map((record) => record.sourceId),
      pass: wronglyFloorAssigned.length === 0
    };
  });
  return {
    schema: "laibe.planPuzzle.gateB.r3_2_2.excludedAreaInvariantAudit.v1",
    expectedAreaCount: 2,
    total: rows.length,
    pass: rows.length === 2 && rows.every((row) => row.pass),
    rows
  };
}

function finitePoint(point) {
  return Boolean(point && Number.isFinite(Number(point.x)) && Number.isFinite(Number(point.y)));
}

function liveGeometryHasFiniteNativeShape(geometry) {
  if (!geometry || geometry.hasCanonicalLiveGeometry !== true) return false;
  if (geometry.nativeFrame !== "plan-puzzle-project-mm" || geometry.nativeUnits !== "mm") return false;
  if (geometry.geometrySource !== "actual_live_project_object") return false;
  if (geometry.runtimeKind === "wall") {
    const wall = geometry.wall || {};
    return finitePoint(wall.from) && finitePoint(wall.to) && Number.isFinite(Number(wall.thickness));
  }
  if (geometry.runtimeKind === "structure") {
    const structure = geometry.structure || {};
    const width = Number.isFinite(Number(structure.width)) ? Number(structure.width) : Number(structure.widthMm);
    const depth = Number.isFinite(Number(structure.depth)) ? Number(structure.depth) : Number(structure.depthMm);
    return ["x", "y"].every((key) => Number.isFinite(Number(structure[key]))) &&
      Number.isFinite(width) &&
      Number.isFinite(depth);
  }
  return false;
}

function sourceIdSet(rows, key) {
  return (Array.isArray(rows) ? rows : []).map((row) => row && row[key]).filter(Boolean);
}

function allUniqueTruthy(values) {
  return values.length > 0 && values.every(Boolean) && new Set(values).size === values.length;
}

function createCoordinateLiveGeometryPredicateInput(details) {
  const scene = details && details.scene || null;
  return {
    schema: "laibe.planPuzzle.gateB.r3_2_2.coordinateLiveGeometryPredicateInput.v1",
    runtimeVersion: RUNTIME_VERSION,
    importSessionId: details.importSessionId,
    transform: details.transform || GATE_A2_TO_SCENE_FRAME_TRANSFORM,
    transformRoundTripAudit: details.transformRoundTripAudit || createTransformRoundTripAudit(),
    representativeCorrespondence: details.representativeCorrespondence,
    identityComparison: details.identityComparison,
    regionMetadataAudit: details.regionMetadataAudit,
    excludedAreaInvariantAudit: details.excludedAreaInvariantAudit || createExcludedAreaInvariantAudit(scene),
    liveGeometryBinding: details.liveGeometryBinding,
    gateA2Summary: details.gateA2Summary,
    sceneLedger: details.sceneLedger,
    phaseA: details.phaseA,
    transformStatus: details.transformStatus || {
      acceptedTransformId: null,
      acceptedTransformStatus: "not-established",
      scaleCalibrated: false
    }
  };
}

async function sha256ForString(value) {
  const bytes = new TextEncoder().encode(String(value));
  return {
    sha256: await sha256Hex(bytes),
    byteLength: bytes.byteLength
  };
}

function sortedByStableIdentity(rows, selectId) {
  return (Array.isArray(rows) ? rows : [])
    .slice()
    .sort((a, b) => String(selectId(a) || "").localeCompare(String(selectId(b) || "")));
}

function createLiveProjectPuritySnapshot(planQa) {
  const projectCounts = getProjectCounts();
  const importState = planQa && typeof planQa.getGateBR3ImportState === "function" ? planQa.getGateBR3ImportState() : null;
  const runtimeIndex = planQa && typeof planQa.getGateBR31RuntimeProvenanceIndex === "function" ? planQa.getGateBR31RuntimeProvenanceIndex() : null;
  const liveRows = sortedByStableIdentity(
    (runtimeIndex && Array.isArray(runtimeIndex.rows) ? runtimeIndex.rows : [])
      .filter((row) => row && (row.runtimeKind === "wall" || row.runtimeKind === "structure") && row.editableObjectId)
      .map((row) => ({
        sourceId: row.sourceId,
        editableObjectId: row.editableObjectId,
        itemId: row.itemId,
        importSessionId: row.importSessionId,
        runtimeKind: row.runtimeKind,
        actualLiveGeometry: row.actualLiveGeometry || null,
        sceneToLiveProjection: row.sceneToLiveProjection || null,
        provenanceSourceBBox: row.provenanceSourceBBox || null,
        sourceBBoxEchoUsedAsLiveGeometry: row.provenanceSourceBBoxEchoedAsLiveGeometry === true
      })),
    (row) => [row.sourceId, row.editableObjectId, row.itemId].join("|")
  );
  const wallRows = liveRows.filter((row) => row.runtimeKind === "wall");
  const structureRows = liveRows.filter((row) => row.runtimeKind === "structure");
  return {
    schema: "laibe.planPuzzle.gateB.r3_2_3.liveProjectPuritySnapshotSource.v1",
    projectCounts,
    importState,
    runtimeIndexSummary: runtimeIndex ? {
      importSessionId: runtimeIndex.importSessionId,
      rowCount: runtimeIndex.rowCount,
      liveGeometrySchema: runtimeIndex.liveGeometrySchema || null
    } : null,
    liveGeometryRows: liveRows,
    liveIdSets: {
      sourceIds: liveRows.map((row) => row.sourceId),
      editableObjectIds: liveRows.map((row) => row.editableObjectId),
      itemIds: liveRows.map((row) => row.itemId)
    },
    liveGeometryCounts: {
      total: liveRows.length,
      walls: wallRows.length,
      structures: structureRows.length
    }
  };
}

async function createCanonicalPurityFingerprint(label, value, includedSourceFields) {
  const canonical = stableStringify(value);
  const hash = await sha256ForString(canonical);
  return {
    schema: "laibe.planPuzzle.gateB.r3_2_3.canonicalPurityFingerprint.v1",
    label,
    sha256: hash.sha256,
    byteLength: hash.byteLength,
    serialization: "stableStringify-sorted-source-snapshot",
    includedSourceFields
  };
}

async function observeFixturePurityFingerprints(label, planQa, productionPredicateInput) {
  const projectSnapshot = createLiveProjectPuritySnapshot(planQa);
  const productionFingerprint = await createCanonicalPurityFingerprint(
    label + ":productionPredicateInput",
    productionPredicateInput,
    [
      "runtimeVersion",
      "importSessionId",
      "transform",
      "transformRoundTripAudit",
      "representativeCorrespondence",
      "identityComparison",
      "regionMetadataAudit",
      "excludedAreaInvariantAudit",
      "liveGeometryBinding",
      "gateA2Summary",
      "sceneLedger",
      "phaseA",
      "transformStatus"
    ]
  );
  const liveProjectFingerprint = await createCanonicalPurityFingerprint(
    label + ":liveProjectState",
    projectSnapshot,
    [
      "getProjectCounts()",
      "getGateBR3ImportState()",
      "getGateBR31RuntimeProvenanceIndex().runtimeIndexSummary",
      "getGateBR31RuntimeProvenanceIndex().rows filtered to live wall/structure rows",
      "live source/editable/item IDs",
      "actual wall/structure geometry",
      "scene-to-live projection metadata"
    ]
  );
  return {
    schema: "laibe.planPuzzle.gateB.r3_2_3.fixturePurityObservation.v1",
    label,
    productionPredicateInput: productionFingerprint,
    liveProjectState: {
      ...liveProjectFingerprint,
      observedLiveGeometryCounts: projectSnapshot.liveGeometryCounts,
      observedRuntimeImportSessionId: projectSnapshot.runtimeIndexSummary && projectSnapshot.runtimeIndexSummary.importSessionId || null,
      fullSerializedProjectDataOmittedFromReceipt: true
    }
  };
}

function sameFingerprint(left, right) {
  return Boolean(left && right && left.sha256 === right.sha256 && left.byteLength === right.byteLength);
}

function evaluateCoordinateLiveGeometryFixtureSuiteAcceptance(input) {
  const fixtures = Array.isArray(input && input.fixtures) ? input.fixtures : [];
  const fixtureRows = fixtures.map((fixture) => {
    const productionInputPreserved = sameFingerprint(
      fixture.before && fixture.before.productionPredicateInput,
      fixture.after && fixture.after.productionPredicateInput
    );
    const projectLiveStatePreserved = sameFingerprint(
      fixture.before && fixture.before.liveProjectState,
      fixture.after && fixture.after.liveProjectState
    );
    const projectMutated = !projectLiveStatePreserved;
    const predicateFailedAsExpected = Boolean(
      fixture.predicate &&
      fixture.predicate.pass === false &&
      Array.isArray(fixture.predicate.failedRules) &&
      fixture.predicate.failedRules.includes(fixture.expectedFailedRule)
    );
    return {
      name: fixture.name,
      expectedFailedRule: fixture.expectedFailedRule,
      productionInputPreserved,
      projectLiveStatePreserved,
      projectMutated,
      predicateFailedAsExpected,
      predicatePass: fixture.predicate && fixture.predicate.pass === true,
      predicateFailedRules: fixture.predicate && fixture.predicate.failedRules || []
    };
  });
  const rules = {
    fixtureCountExactly9: fixtures.length === 9,
    everyFixturePredicateFailureAndExpectedDetector: fixtureRows.every((row) => row.predicateFailedAsExpected === true),
    everyFixtureProductionInputPreserved: fixtureRows.every((row) => row.productionInputPreserved === true),
    everyFixtureProjectLivePreserved: fixtureRows.every((row) => row.projectLiveStatePreserved === true && row.projectMutated === false),
    productionReceiptInputsPreserved: sameFingerprint(
      input && input.suiteBefore && input.suiteBefore.productionPredicateInput,
      input && input.suiteAfter && input.suiteAfter.productionPredicateInput
    ),
    projectLiveInputsPreserved: sameFingerprint(
      input && input.suiteBefore && input.suiteBefore.liveProjectState,
      input && input.suiteAfter && input.suiteAfter.liveProjectState
    )
  };
  const failedRules = Object.keys(rules).filter((key) => rules[key] !== true);
  return {
    schema: "laibe.planPuzzle.gateB.r3_2_3.fixtureSuiteAcceptance.v1",
    sharedEvaluator: "evaluateCoordinateLiveGeometryFixtureSuiteAcceptance",
    pass: failedRules.length === 0,
    failedRules,
    rules,
    derived: {
      productionReceiptInputsPreserved: rules.productionReceiptInputsPreserved,
      projectLiveInputsPreserved: rules.projectLiveInputsPreserved,
      fixtureCount: fixtures.length,
      projectMutatedFixtureCount: fixtureRows.filter((row) => row.projectMutated).length
    },
    fixtureRows
  };
}

function createFixtureSuiteAcceptanceNegativeGuards(suiteInput) {
  function mutateFingerprint(fingerprint, suffix) {
    if (!fingerprint) return;
    fingerprint.sha256 = String(fingerprint.sha256 || "") + suffix;
  }
  function makeGuard(name, expectedFailedRule, mutate) {
    const cloned = deepCloneJson(suiteInput);
    mutate(cloned);
    const result = evaluateCoordinateLiveGeometryFixtureSuiteAcceptance(cloned);
    return {
      name,
      expectedFailedRule,
      evaluator: "evaluateCoordinateLiveGeometryFixtureSuiteAcceptance",
      result,
      pass: result.pass === false && result.failedRules.includes(expectedFailedRule)
    };
  }
  const guards = [
    makeGuard("changed_suite_production_input_after_fingerprint", "productionReceiptInputsPreserved", (cloned) => {
      mutateFingerprint(cloned.suiteAfter && cloned.suiteAfter.productionPredicateInput, "-fixture-guard-suite-production");
    }),
    makeGuard("changed_suite_project_live_after_fingerprint", "projectLiveInputsPreserved", (cloned) => {
      mutateFingerprint(cloned.suiteAfter && cloned.suiteAfter.liveProjectState, "-fixture-guard-suite-project");
    }),
    makeGuard("changed_one_fixture_production_input_after_fingerprint", "everyFixtureProductionInputPreserved", (cloned) => {
      mutateFingerprint(cloned.fixtures && cloned.fixtures[0] && cloned.fixtures[0].after && cloned.fixtures[0].after.productionPredicateInput, "-fixture-guard-row-production");
    }),
    makeGuard("changed_one_fixture_project_live_after_fingerprint", "everyFixtureProjectLivePreserved", (cloned) => {
      mutateFingerprint(cloned.fixtures && cloned.fixtures[0] && cloned.fixtures[0].after && cloned.fixtures[0].after.liveProjectState, "-fixture-guard-row-project");
    })
  ];
  return {
    schema: "laibe.planPuzzle.gateB.r3_2_3.fixtureSuiteAcceptanceNegativeGuards.v1",
    evaluator: "evaluateCoordinateLiveGeometryFixtureSuiteAcceptance",
    guards,
    allAcceptanceChainGuardsPass: guards.length === 4 && guards.every((guard) => guard.pass === true)
  };
}

function suiteFingerprintRecordsFromFixtureSuite(suiteBefore, suiteAfter) {
  return {
    schema: "laibe.planPuzzle.gateB.r3_2_4.fixtureSuiteFingerprintRecords.v1",
    productionPredicateInput: {
      before: suiteBefore && suiteBefore.productionPredicateInput || null,
      after: suiteAfter && suiteAfter.productionPredicateInput || null
    },
    projectLiveState: {
      before: suiteBefore && suiteBefore.liveProjectState || null,
      after: suiteAfter && suiteAfter.liveProjectState || null
    }
  };
}

async function createSerializedFingerprintSummary(label, value, serializationSource) {
  const text = String(value || "");
  const hash = await sha256ForString(text);
  return {
    schema: "laibe.planPuzzle.gateB.r3_2_4.receiptSafeSerializedFingerprintSummary.v1",
    label,
    sha256: hash.sha256,
    utf8ByteLength: hash.byteLength,
    serializationSource,
    omittedFullSerializedProjectData: true
  };
}

async function createReceiptSafePhaseA(phaseA) {
  const safePhaseA = deepCloneJson(phaseA || {});
  if (safePhaseA.mixedControl) {
    if (typeof safePhaseA.mixedControl.beforeFingerprint === "string") {
      safePhaseA.mixedControl.beforeFingerprint = await createSerializedFingerprintSummary(
        "phaseA.mixedControl.beforeFingerprint",
        safePhaseA.mixedControl.beforeFingerprint,
        "internal_phaseA_mixed_control_before_project_state_stable_serialization"
      );
    }
    if (typeof safePhaseA.mixedControl.afterFingerprint === "string") {
      safePhaseA.mixedControl.afterFingerprint = await createSerializedFingerprintSummary(
        "phaseA.mixedControl.afterFingerprint",
        safePhaseA.mixedControl.afterFingerprint,
        "internal_phaseA_mixed_control_after_project_state_stable_serialization"
      );
    }
  }
  return safePhaseA;
}

function utf8StringByteLength(value) {
  return new TextEncoder().encode(String(value)).byteLength;
}

function isHexSha256(value) {
  return typeof value === "string" && /^[A-Fa-f0-9]{64}$/.test(value);
}

function valueAtPath(root, dottedPath) {
  return String(dottedPath || "").split(".").reduce((value, key) => value && value[key], root);
}

function isReceiptSafeSerializedFingerprintSummary(value) {
  return Boolean(
    value &&
    typeof value === "object" &&
    typeof value !== "string" &&
    value.schema === "laibe.planPuzzle.gateB.r3_2_4.receiptSafeSerializedFingerprintSummary.v1" &&
    isHexSha256(value.sha256) &&
    Number(value.utf8ByteLength) > 0 &&
    value.omittedFullSerializedProjectData === true &&
    typeof value.serializationSource === "string" &&
    !("samplePrefix" in value)
  );
}

function isSuiteFingerprintRecord(value) {
  return Boolean(
    value &&
    typeof value === "object" &&
    typeof value !== "string" &&
    typeof value.schema === "string" &&
    typeof value.label === "string" &&
    isHexSha256(value.sha256) &&
    Number(value.byteLength) > 0 &&
    typeof value.serialization === "string" &&
    Array.isArray(value.includedSourceFields)
  );
}

function auditReceiptPayloadHygiene(receiptCore) {
  const stringFindings = [];
  function walk(value, path) {
    if (typeof value === "string") {
      const byteLength = utf8StringByteLength(value);
      const looksLikeFullProjectPayload = /^\s*\{/.test(value) &&
        (value.includes("\"project\"") || value.includes("\"projectCounts\"") || value.includes("\"currentPrompt\"") || value.includes("\"liveGeometryRows\""));
      stringFindings.push({
        path,
        byteLength,
        oversized: byteLength > 65536,
        looksLikeFullProjectPayload
      });
      return;
    }
    if (!value || typeof value !== "object") return;
    Object.keys(value).forEach((key) => walk(value[key], path ? path + "." + key : key));
  }
  walk(receiptCore, "receipt");
  const maximum = stringFindings.reduce((max, row) => row.byteLength > max.byteLength ? row : max, {
    path: null,
    byteLength: 0
  });
  const oversizedStrings = stringFindings.filter((row) => row.oversized);
  const fullProjectPayloadStrings = stringFindings.filter((row) => row.looksLikeFullProjectPayload);
  const phaseABefore = valueAtPath(receiptCore, "phaseA.mixedControl.beforeFingerprint");
  const phaseAAfter = valueAtPath(receiptCore, "phaseA.mixedControl.afterFingerprint");
  const suitePaths = [
    "fixturePurityAcceptanceChainClosure.suiteFingerprints.productionPredicateInput.before",
    "fixturePurityAcceptanceChainClosure.suiteFingerprints.productionPredicateInput.after",
    "fixturePurityAcceptanceChainClosure.suiteFingerprints.projectLiveState.before",
    "fixturePurityAcceptanceChainClosure.suiteFingerprints.projectLiveState.after"
  ];
  const suitePathChecks = suitePaths.map((path) => ({
    path: "receipt." + path,
    pass: isSuiteFingerprintRecord(valueAtPath(receiptCore, path))
  }));
  let stringifyParsePass = false;
  try {
    const parsed = JSON.parse(JSON.stringify(receiptCore));
    stringifyParsePass = Boolean(parsed && parsed.schema === receiptCore.schema && parsed.status === receiptCore.status);
  } catch (error) {
    stringifyParsePass = false;
  }
  const rules = {
    phaseAMixedControlFingerprintsAreSummaryObjects: isReceiptSafeSerializedFingerprintSummary(phaseABefore) && isReceiptSafeSerializedFingerprintSummary(phaseAAfter),
    allFourSuiteFingerprintRecordsExist: suitePathChecks.every((row) => row.pass === true),
    noFullSerializedProjectOrInputPayloadStrings: fullProjectPayloadStrings.length === 0,
    noIndividualReceiptStringExceeds65536Utf8Bytes: oversizedStrings.length === 0,
    jsonStringifyParseRoundTripPreservesSchemaStatus: stringifyParsePass
  };
  const failedRules = Object.keys(rules).filter((key) => rules[key] !== true);
  return {
    schema: "laibe.planPuzzle.gateB.r3_2_4.receiptHygieneAudit.v1",
    auditFieldExcludedFromSelfAudit: "receipt.receiptHygieneAudit",
    pass: failedRules.length === 0,
    failedRules,
    rules,
    maximumStringByteLength: maximum.byteLength,
    maximumStringByteLengthPath: maximum.path,
    oversizedStringCount: oversizedStrings.length,
    oversizedStringPaths: oversizedStrings.map((row) => row.path),
    fullProjectPayloadStringCount: fullProjectPayloadStrings.length,
    fullProjectPayloadStringPaths: fullProjectPayloadStrings.map((row) => row.path),
    suitePathChecks,
    phaseASummaryPathChecks: [
      { path: "receipt.phaseA.mixedControl.beforeFingerprint", pass: isReceiptSafeSerializedFingerprintSummary(phaseABefore) },
      { path: "receipt.phaseA.mixedControl.afterFingerprint", pass: isReceiptSafeSerializedFingerprintSummary(phaseAAfter) }
    ]
  };
}

function createReceiptHygieneNegativeGuards(receiptCore) {
  function makeGuard(name, expectedFailedRule, mutate) {
    const cloned = deepCloneJson(receiptCore);
    mutate(cloned);
    const result = auditReceiptPayloadHygiene(cloned);
    return {
      name,
      expectedFailedRule,
      evaluator: "auditReceiptPayloadHygiene",
      result,
      pass: result.pass === false && result.failedRules.includes(expectedFailedRule),
      projectMutationEvidence: "pure_cloned_receipt_core_no_project_api_invoked"
    };
  }
  const guards = [
    makeGuard("inject_oversized_serialized_project_string_into_phase_a_mixed_control", "phaseAMixedControlFingerprintsAreSummaryObjects", (cloned) => {
      if (!cloned.phaseA) cloned.phaseA = {};
      if (!cloned.phaseA.mixedControl) cloned.phaseA.mixedControl = {};
      cloned.phaseA.mixedControl.beforeFingerprint = "{\"project\":\"" + "x".repeat(70000) + "\"}";
    }),
    makeGuard("remove_required_suite_project_live_after_fingerprint_record", "allFourSuiteFingerprintRecordsExist", (cloned) => {
      if (cloned.fixturePurityAcceptanceChainClosure &&
          cloned.fixturePurityAcceptanceChainClosure.suiteFingerprints &&
          cloned.fixturePurityAcceptanceChainClosure.suiteFingerprints.projectLiveState) {
        delete cloned.fixturePurityAcceptanceChainClosure.suiteFingerprints.projectLiveState.after;
      }
    })
  ];
  return {
    schema: "laibe.planPuzzle.gateB.r3_2_4.receiptHygieneNegativeGuards.v1",
    evaluator: "auditReceiptPayloadHygiene",
    guards,
    allReceiptHygieneGuardsPass: guards.length === 2 && guards.every((guard) => guard.pass === true)
  };
}

function evaluateCoordinateLiveGeometryContract(input) {
  const transform = input && input.transform || {};
  const liveBinding = input && input.liveGeometryBinding || {};
  const liveRows = Array.isArray(liveBinding.rows) ? liveBinding.rows : [];
  const sceneLedger = input && input.sceneLedger || {};
  const sceneRows = Array.isArray(sceneLedger.rows) ? sceneLedger.rows : [];
  const gateA2Summary = input && input.gateA2Summary || {};
  const phaseA = input && input.phaseA || {};
  const phaseAPdfOnly = phaseA.finalPolicy || phaseA.pdfOnly || {};
  const phaseAAssertions = phaseAPdfOnly.assertions || {};
  const transformStatus = input && input.transformStatus || {};
  const sourceIds = sourceIdSet(liveRows, "sourceId");
  const editableIds = sourceIdSet(liveRows, "editableObjectId");
  const itemIds = sourceIdSet(liveRows, "itemId");
  const sessionIds = sourceIdSet(liveRows, "freshImportSessionId");
  const liveRowPolicyPass = liveRows.every((row) => {
    const provenance = row && row.provenance || {};
    return provenance.source_kind === "pdf" &&
      provenance.object_status === "existing" &&
      provenance.work_action === "none" &&
      provenance.budget_trigger === "none" &&
      provenance.dbspec_projection === "excluded" &&
      (row.mapping_state || provenance.mapping_state) === "not_accepted";
  });
  const sceneRowPolicyPass = sceneRows.every((row) => {
    const policy = row && row.policy || {};
    return policy.source_kind === "pdf" &&
      policy.object_status === "existing" &&
      policy.work_action === "none" &&
      policy.budget_trigger === "none" &&
      policy.dbspec_projection === "excluded" &&
      policy.mapping_state === "not_accepted";
  });
  const automaticCountersZero = [
    phaseAAssertions.pdf_derived_new_object_count,
    phaseAAssertions.automatic_budget_candidate_count,
    phaseAAssertions.automatic_dbspec_projection_count
  ].every((value) => Number(value) === 0);
  const rules = {
    exactTransformSchema: transform.schema === GATE_A2_TO_SCENE_FRAME_TRANSFORM.schema,
    exactTransformDirection: transform.from === "page-top-left-pdf-pt" && transform.to === "page-bottom-left-pdf-pt",
    exactPageHeightPt: Number(transform.pageHeightPt) === PDF_PAGE_HEIGHT_PT,
    exactTransformMatrix: transformMatrixMatches(transform.matrix),
    inverseRoundTripResidualsZero: Boolean(input && input.transformRoundTripAudit && input.transformRoundTripAudit.pass === true && Number(input.transformRoundTripAudit.maxResidualPt) === 0),
    representativeCorrespondence10Of10: Boolean(input && input.representativeCorrespondence && input.representativeCorrespondence.pass === true && input.representativeCorrespondence.total === 10 && input.representativeCorrespondence.positiveGeometryCount === 10),
    identityPathDoesNotPass: Boolean(input && input.identityComparison && input.identityComparison.pass === false),
    regionMetadata8Of8: Boolean(input && input.regionMetadataAudit && input.regionMetadataAudit.pass === true && input.regionMetadataAudit.total === 8 && input.regionMetadataAudit.passCount === 8),
    excludedTitleBandsRemainUnassigned: Boolean(input && input.excludedAreaInvariantAudit && input.excludedAreaInvariantAudit.pass === true),
    uniqueSourceIds: allUniqueTruthy(sourceIds),
    uniqueLiveEditableIds: allUniqueTruthy(editableIds),
    uniqueItemIds: allUniqueTruthy(itemIds),
    exactlyOneFreshImportSessionId: sessionIds.length === liveRows.length && new Set(sessionIds).size === 1 && sessionIds[0] === input.importSessionId,
    finiteActualLiveGeometry: liveRows.length > 0 && liveRows.every((row) => liveGeometryHasFiniteNativeShape(row.actualLiveGeometry)),
    approvedNativeFrameAndUnits: liveRows.length > 0 && liveRows.every((row) => row.actualLiveGeometry && row.actualLiveGeometry.nativeFrame === "plan-puzzle-project-mm" && row.actualLiveGeometry.nativeUnits === "mm"),
    observedNotAcceptedProjection: liveRows.length > 0 && liveRows.every((row) => row.sceneToLiveProjection && row.sceneToLiveProjection.status === "observed_unaccepted" && row.status === "observed_not_accepted"),
    provenanceSourceBBoxNotLiveGeometry: liveRows.length > 0 && liveRows.every((row) => row.sourceBBoxEchoUsedAsLiveGeometry === false && row.actualLiveGeometry && row.actualLiveGeometry.sourceBBoxEchoUsedAsLiveGeometry === false),
    acceptedTransformNull: transformStatus.acceptedTransformId == null && transformStatus.acceptedTransformStatus === "not-established" && transformStatus.scaleCalibrated === false,
    mappingStateNotAccepted: liveRows.length > 0 && liveRows.every((row) => row.mapping_state === "not_accepted"),
    pdfExistingNoWorkNoBudgetNoDbspecPolicy: liveRowPolicyPass && sceneRowPolicyPass && automaticCountersZero,
    gateA2Closure29: Boolean(gateA2Summary.total === 29 && gateA2Summary.uniqueSourceIdCount === 29 && gateA2Summary.allRecordsResolvedToOneDisposition === true && Array.isArray(gateA2Summary.candidateMappedWithoutEditableId) && gateA2Summary.candidateMappedWithoutEditableId.length === 0),
    sceneLedgerClosure244: Boolean(sceneLedger.total === 244 && sceneLedger.uniqueSourceIdCount === 244 && Array.isArray(sceneLedger.duplicateSourceIds) && sceneLedger.duplicateSourceIds.length === 0 && sceneLedger.totalsSumToExpected === true && sceneLedger.allRowsResolvedToOneDisposition === true),
    liveGeometryClosure128: liveBinding.total === 128 && liveBinding.wallCount === 121 && liveBinding.structureCount === 7 && liveBinding.pass === true,
    r312StructuralAndQuantityGuards: Boolean(phaseA.phaseAPass === true && sceneLedger.structuralWallReconciliation && sceneLedger.structuralWallReconciliation.structuralWallReconciliationPass === true && sceneLedger.structuralWallNegativeFixtures && sceneLedger.structuralWallNegativeFixtures.allFixturesPass === true)
  };
  const failedRules = Object.keys(rules).filter((key) => rules[key] !== true);
  return {
    schema: "laibe.planPuzzle.gateB.r3_2_2.coordinateLiveGeometryContractPredicate.v1",
    pass: failedRules.length === 0,
    failedRules,
    rules,
    counts: {
      liveRows: liveRows.length,
      liveWallRows: liveRows.filter((row) => row.runtimeKind === "wall").length,
      liveStructureRows: liveRows.filter((row) => row.runtimeKind === "structure").length,
      gateA2Rows: gateA2Summary.total || 0,
      sceneLedgerRows: sceneLedger.total || 0,
      uniqueFreshImportSessionIds: new Set(sessionIds).size
    }
  };
}

async function createCoordinateLiveGeometryContractNegativeFixtures(freshInput, planQa) {
  const fixtures = [];
  async function pushFixture(name, mutate, expectedFailedRule) {
    const before = await observeFixturePurityFingerprints(name + ":before", planQa, freshInput);
    const cloned = deepCloneJson(freshInput);
    mutate(cloned);
    const predicate = evaluateCoordinateLiveGeometryContract(cloned);
    const after = await observeFixturePurityFingerprints(name + ":after", planQa, freshInput);
    fixtures.push({
      name,
      semanticStatus: "COORDINATE_FRAME_OR_POLICY_VIOLATION_PERSISTS",
      expectedFailedRule,
      predicate,
      before,
      after
    });
  }
  const suiteBefore = await observeFixturePurityFingerprints("suite:before", planQa, freshInput);
  await pushFixture("identity_declared_as_gate_a2_to_scene_transform", (fixture) => {
    fixture.transform = {
      ...fixture.transform,
      from: "page-top-left-pdf-pt",
      to: "page-top-left-pdf-pt",
      pageHeightPt: PDF_PAGE_HEIGHT_PT,
      matrix: [[1, 0, 0], [0, 1, 0], [0, 0, 1]],
      formula: "fixture_identity_no_frame_conversion"
    };
  }, "exactTransformDirection");
  await pushFixture("wrong_page_height", (fixture) => {
    fixture.transform.pageHeightPt = PDF_PAGE_HEIGHT_PT + 9;
    fixture.transform.matrix = [[1, 0, 0], [0, -1, PDF_PAGE_HEIGHT_PT + 9], [0, 0, 1]];
  }, "exactPageHeightPt");
  await pushFixture("wrong_transform_direction_or_matrix", (fixture) => {
    fixture.transform.matrix = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
    fixture.transform.formula = "fixture_wrong_direction";
  }, "exactTransformMatrix");
  await pushFixture("stale_wrong_verified_region_metadata", (fixture) => {
    if (fixture.regionMetadataAudit && Array.isArray(fixture.regionMetadataAudit.rows) && fixture.regionMetadataAudit.rows.length) {
      fixture.regionMetadataAudit.rows[0].observedRegionId = fixture.regionMetadataAudit.rows[0].expectedRegionId === "page-1-region-3f" ? "page-1-region-rf" : "page-1-region-3f";
      fixture.regionMetadataAudit.rows[0].regionCompatible = false;
      fixture.regionMetadataAudit.rows[0].pass = false;
      fixture.regionMetadataAudit.passCount = fixture.regionMetadataAudit.rows.filter((row) => row.pass).length;
      fixture.regionMetadataAudit.pass = false;
    }
  }, "regionMetadata8Of8");
  await pushFixture("duplicate_live_editable_id", (fixture) => {
    const rows = fixture.liveGeometryBinding && fixture.liveGeometryBinding.rows || [];
    if (rows.length > 1) {
      rows[1].editableObjectId = rows[0].editableObjectId;
    }
  }, "uniqueLiveEditableIds");
  await pushFixture("stale_mismatched_import_session_id", (fixture) => {
    const rows = fixture.liveGeometryBinding && fixture.liveGeometryBinding.rows || [];
    if (rows.length) {
      rows[0].freshImportSessionId = "stale-import-session-fixture";
    }
  }, "exactlyOneFreshImportSessionId");
  await pushFixture("provenance_source_bbox_echo_substituted_for_actual_live_geometry", (fixture) => {
    const rows = fixture.liveGeometryBinding && fixture.liveGeometryBinding.rows || [];
    if (rows.length) {
      rows[0].actualLiveGeometry = {
        status: "observed_not_accepted",
        geometrySource: "provenance_source_bbox_echo",
        nativeUnits: "pdf_pt",
        nativeFrame: "page-bottom-left-pdf-pt",
        acceptedTransformId: null,
        acceptedTransformStatus: "not-established",
        sourceBBoxIsProvenanceOnly: false,
        sourceBBoxEchoUsedAsLiveGeometry: true,
        runtimeKind: rows[0].runtimeKind,
        hasCanonicalLiveGeometry: true,
        sourceBBoxEcho: rows[0].provenanceSourceBBox
      };
      rows[0].sourceBBoxEchoUsedAsLiveGeometry = true;
    }
  }, "finiteActualLiveGeometry");
  await pushFixture("missing_actual_live_geometry", (fixture) => {
    const rows = fixture.liveGeometryBinding && fixture.liveGeometryBinding.rows || [];
    if (rows.length) {
      rows[0].actualLiveGeometry = null;
    }
  }, "finiteActualLiveGeometry");
  await pushFixture("unknown_live_coordinate_frame_or_units", (fixture) => {
    const rows = fixture.liveGeometryBinding && fixture.liveGeometryBinding.rows || [];
    if (rows.length && rows[0].actualLiveGeometry) {
      rows[0].actualLiveGeometry.nativeFrame = "unknown-live-frame";
      rows[0].actualLiveGeometry.nativeUnits = "px";
    }
  }, "finiteActualLiveGeometry");
  const suiteAfter = await observeFixturePurityFingerprints("suite:after", planQa, freshInput);
  const suiteInput = {
    schema: "laibe.planPuzzle.gateB.r3_2_3.fixtureSuiteAcceptanceInput.v1",
    suiteBefore,
    suiteAfter,
    fixtures
  };
  const suiteAcceptance = evaluateCoordinateLiveGeometryFixtureSuiteAcceptance(suiteInput);
  const acceptanceChainGuards = createFixtureSuiteAcceptanceNegativeGuards(suiteInput);
  return {
    schema: "laibe.planPuzzle.gateB.r3_2_3.coordinateLiveGeometryContractNegativeFixtures.v1",
    sharedPredicate: "evaluateCoordinateLiveGeometryContract",
    suiteEvaluator: "evaluateCoordinateLiveGeometryFixtureSuiteAcceptance",
    suiteBefore,
    suiteAfter,
    suiteFingerprints: suiteFingerprintRecordsFromFixtureSuite(suiteBefore, suiteAfter),
    productionReceiptInputsPreserved: suiteAcceptance.derived.productionReceiptInputsPreserved,
    projectLiveInputsPreserved: suiteAcceptance.derived.projectLiveInputsPreserved,
    fixtures,
    suiteAcceptance,
    acceptanceChainGuards,
    allAcceptanceChainGuardsPass: acceptanceChainGuards.allAcceptanceChainGuardsPass,
    allFixturesPass: suiteAcceptance.pass === true && acceptanceChainGuards.allAcceptanceChainGuardsPass === true
  };
}

async function createCoordinateLiveGeometryNegativeFixtures(predicateInput, planQa) {
  return createCoordinateLiveGeometryContractNegativeFixtures(predicateInput, planQa);
}

function sceneSourceRecords(scene) {
  function withKind(kind, category, items) {
    return (Array.isArray(items) ? items : []).map((item, index) => ({
      kind,
      category,
      index,
      sourceId: item && (item.source_object_id || item.sourceId || item.id) || null,
      sourceRegionId: item && item.sourceRegionId || "page-1-unassigned",
      sourceBBox: sourceBoxOfSceneItem(item),
      item
    })).filter((record) => record.sourceId);
  }
  return []
    .concat(withKind("structuralWall", "structural_wall_candidate", scene && scene.structuralWalls))
    .concat(withKind("column", "column_candidate", scene && scene.columns))
    .concat(withKind("dimensionLine", "dimension_or_axis_evidence", scene && scene.dimensionLines));
}

function cloneLedgerJson(value) {
  return JSON.parse(JSON.stringify(value));
}

function countByKey(items, selectKey) {
  const counts = {};
  (Array.isArray(items) ? items : []).forEach((item) => {
    const key = selectKey(item);
    const normalized = key || "missing";
    counts[normalized] = (counts[normalized] || 0) + 1;
  });
  return counts;
}

function sameCountMap(a, b) {
  const left = a || {};
  const right = b || {};
  const leftKeys = Object.keys(left).sort();
  const rightKeys = Object.keys(right).sort();
  if (leftKeys.length !== rightKeys.length) return false;
  return leftKeys.every((key, index) => key === rightKeys[index] && Number.isInteger(left[key]) && left[key] === right[key]);
}

function hasUniqueTruthyIds(ids) {
  const values = Array.isArray(ids) ? ids : [];
  return values.length > 0 && values.every(Boolean) && new Set(values).size === values.length;
}

function sameIdSet(leftIds, rightIds) {
  const left = new Set((Array.isArray(leftIds) ? leftIds : []).filter(Boolean));
  const right = new Set((Array.isArray(rightIds) ? rightIds : []).filter(Boolean));
  if (left.size !== right.size) return false;
  for (const id of left) {
    if (!right.has(id)) return false;
  }
  return true;
}

function importerDecisionDisposition(decision) {
  if (decision === "promoted_editable") return "promoted_editable";
  if (decision === "suppressed_duplicate") return "suppressed_duplicate";
  if (decision === "below_minimum_geometry") return "below_minimum_geometry";
  if (decision === "invalid_wall_geometry") return "unsupported";
  return null;
}

function finiteNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function structuralRowIsUnresolved(row) {
  if (!row || row.kind !== "structuralWall") return false;
  if (row.disposition === "unmapped") return true;
  if (!row.importerDecision) return true;
  if (row.reason === "missing_importer_wall_disposition_record") return true;
  return !["promoted_editable", "suppressed_duplicate", "below_minimum_geometry", "unsupported"].includes(row.disposition);
}

function duplicateRowHasExactController(row) {
  if (!row || row.disposition !== "suppressed_duplicate") return true;
  const decision = row.importerDecision || {};
  return Boolean(
    row.controllingSourceId &&
    row.controllingLiveObjectId &&
    decision.controllingSourceId === row.controllingSourceId &&
    decision.controllingEditableId === row.controllingLiveObjectId &&
    decision.duplicateKey &&
    decision.thresholds &&
    finiteNumber(decision.thresholds.duplicateKeyGridMm) !== null
  );
}

function belowMinimumRowHasExactMetric(row) {
  if (!row || row.disposition !== "below_minimum_geometry") return true;
  const metrics = row.suppressionMetrics || {};
  const thresholds = row.suppressionThresholds || {};
  const lengthMm = finiteNumber(metrics.lengthMm);
  const minimumLengthMm = finiteNumber(thresholds.minimumLengthMm);
  return Boolean(lengthMm !== null && minimumLengthMm !== null && lengthMm < minimumLengthMm);
}

function createStructuralWallReconciliation(wallDispositionRecords, rows) {
  const decisions = Array.isArray(wallDispositionRecords) ? wallDispositionRecords : [];
  const structuralRows = (Array.isArray(rows) ? rows : []).filter((row) => row && row.kind === "structuralWall");
  const decisionSourceIds = decisions.map((record) => record && record.sourceId).filter(Boolean);
  const structuralWallSourceIds = structuralRows.map((row) => row && row.sourceId).filter(Boolean);
  const decisionBySourceId = {};
  decisions.forEach((record) => {
    if (!record || !record.sourceId || decisionBySourceId[record.sourceId]) return;
    decisionBySourceId[record.sourceId] = record;
  });
  const rowBySourceId = {};
  structuralRows.forEach((row) => {
    if (!row || !row.sourceId || rowBySourceId[row.sourceId]) return;
    rowBySourceId[row.sourceId] = row;
  });
  const importerDecisionSourceIdsUnique = hasUniqueTruthyIds(decisionSourceIds);
  const structuralWallSourceIdsUnique = hasUniqueTruthyIds(structuralWallSourceIds);
  const exactSourceIdSetEquality = sameIdSet(decisionSourceIds, structuralWallSourceIds);
  const unresolvedRows = structuralRows.filter(structuralRowIsUnresolved);
  const everyStructuralWallHasMatchingDecision = structuralRows.every((row) => Boolean(row && row.sourceId && decisionBySourceId[row.sourceId]));
  const everyStructuralDecisionMatchesRow = decisions.every((decision) => {
    const sourceId = decision && decision.sourceId;
    const row = sourceId ? rowBySourceId[sourceId] : null;
    const expectedDisposition = importerDecisionDisposition(decision && decision.decision);
    return Boolean(
      row &&
      expectedDisposition &&
      row.sourceId === sourceId &&
      row.importerDecision &&
      row.importerDecision.sourceId === sourceId &&
      row.importerDecision.decision === decision.decision &&
      row.disposition === expectedDisposition &&
      !structuralRowIsUnresolved(row)
    );
  });
  const importerDecisionCountMap = countByKey(decisions, (record) => importerDecisionDisposition(record && record.decision) || "unsupported_importer_decision");
  const ledgerStructuralWallCountMap = countByKey(structuralRows, (row) => row && row.disposition);
  const exactPerReasonCountMapEquality = sameCountMap(importerDecisionCountMap, ledgerStructuralWallCountMap);
  const duplicateRowsHaveExactControllers = structuralRows.every(duplicateRowHasExactController);
  const belowMinimumRowsHaveExactMetrics = structuralRows.every(belowMinimumRowHasExactMetric);
  const unresolvedStructuralWallCount = unresolvedRows.length;
  const missingDecisionForStructuralSourceIds = structuralRows.filter((row) => !decisionBySourceId[row.sourceId]).map((row) => row.sourceId);
  const importerDecisionsWithoutLedgerRows = decisions.filter((record) => !rowBySourceId[record && record.sourceId]).map((record) => record && record.sourceId || null);
  const unresolvedStructuralWallSourceIds = unresolvedRows.map((row) => row.sourceId);
  const unmatchedOrUnresolvedStructuralWallCount = new Set(missingDecisionForStructuralSourceIds.concat(unresolvedStructuralWallSourceIds)).size;
  const structuralWallReconciliationPass = Boolean(
    importerDecisionSourceIdsUnique &&
    structuralWallSourceIdsUnique &&
    exactSourceIdSetEquality &&
    everyStructuralWallHasMatchingDecision &&
    everyStructuralDecisionMatchesRow &&
    exactPerReasonCountMapEquality &&
    unresolvedStructuralWallCount === 0 &&
    duplicateRowsHaveExactControllers &&
    belowMinimumRowsHaveExactMetrics
  );
  return {
    schema: "laibe.planPuzzle.gateB.r3_1_2.structuralWallReconciliation.v1",
    importerDecisionRecordCount: decisions.length,
    structuralWallLedgerRowCount: structuralRows.length,
    importerDecisionSourceIdsUnique,
    structuralWallSourceIdsUnique,
    exactSourceIdSetEquality,
    everyStructuralWallHasMatchingDecision,
    everyStructuralDecisionMatchesRow,
    exactPerReasonCountMapEquality,
    unresolvedStructuralWallCount,
    duplicateRowsHaveExactControllers,
    belowMinimumRowsHaveExactMetrics,
    structuralWallReconciliationPass,
    importerDecisionCountMap,
    ledgerStructuralWallCountMap,
    missingDecisionForStructuralSourceIds,
    importerDecisionsWithoutLedgerRows,
    unresolvedStructuralWallSourceIds,
    unmatchedOrUnresolvedStructuralWallCount
  };
}

function createStructuralWallNegativeFixtures(wallDispositionRecords, rows) {
  const originalDecisionHash = stableStringify(wallDispositionRecords || []);
  const originalRowsHash = stableStringify(rows || []);
  const sourceRows = Array.isArray(rows) ? rows : [];
  const sourceDecisions = Array.isArray(wallDispositionRecords) ? wallDispositionRecords : [];
  const fixtures = [];
  const structuralFixtureInputsMutated = () => originalDecisionHash !== stableStringify(wallDispositionRecords || []) ||
    originalRowsHash !== stableStringify(rows || []);

  const countDriftRows = cloneLedgerJson(sourceRows);
  const driftRow = countDriftRows.find((row) => row && row.kind === "structuralWall" && row.disposition === "below_minimum_geometry") ||
    countDriftRows.find((row) => row && row.kind === "structuralWall");
  if (driftRow) {
    driftRow.disposition = driftRow.disposition === "suppressed_duplicate" ? "below_minimum_geometry" : "suppressed_duplicate";
    driftRow.reason = "fixture_per_reason_count_map_drift";
  }
  const countDrift = createStructuralWallReconciliation(cloneLedgerJson(sourceDecisions), countDriftRows);
  fixtures.push({
    name: "per_reason_count_map_drift",
    semanticStatus: "LEDGER_INTEGRITY_VIOLATION_PERSISTS",
    projectMutated: structuralFixtureInputsMutated(),
    preservedStructuralRowCount: countDrift.structuralWallLedgerRowCount === 224,
    expected: {
      exactPerReasonCountMapEquality: false,
      structuralWallReconciliationPass: false
    },
    observed: {
      exactPerReasonCountMapEquality: countDrift.exactPerReasonCountMapEquality,
      structuralWallReconciliationPass: countDrift.structuralWallReconciliationPass
    },
    pass: countDrift.exactPerReasonCountMapEquality === false && countDrift.structuralWallReconciliationPass === false,
    reconciliation: countDrift
  });

  const duplicateDecisionRows = cloneLedgerJson(sourceRows);
  const duplicateDecisionRecords = cloneLedgerJson(sourceDecisions);
  if (duplicateDecisionRecords.length > 1) {
    duplicateDecisionRecords[1].sourceId = duplicateDecisionRecords[0].sourceId;
  }
  const duplicateDecision = createStructuralWallReconciliation(duplicateDecisionRecords, duplicateDecisionRows);
  fixtures.push({
    name: "missing_duplicate_decision_identity",
    semanticStatus: "LEDGER_INTEGRITY_VIOLATION_PERSISTS",
    projectMutated: structuralFixtureInputsMutated(),
    expected: {
      importerDecisionSourceIdsUnique: false,
      structuralWallReconciliationPass: false,
      structuralRowUnmatchedOrUnresolved: true
    },
    observed: {
      importerDecisionSourceIdsUnique: duplicateDecision.importerDecisionSourceIdsUnique,
      exactSourceIdSetEquality: duplicateDecision.exactSourceIdSetEquality,
      everyStructuralWallHasMatchingDecision: duplicateDecision.everyStructuralWallHasMatchingDecision,
      unresolvedStructuralWallCount: duplicateDecision.unresolvedStructuralWallCount,
      unmatchedOrUnresolvedStructuralWallCount: duplicateDecision.unmatchedOrUnresolvedStructuralWallCount,
      structuralWallReconciliationPass: duplicateDecision.structuralWallReconciliationPass
    },
    pass: duplicateDecision.importerDecisionSourceIdsUnique === false &&
      duplicateDecision.structuralWallReconciliationPass === false &&
      duplicateDecision.unmatchedOrUnresolvedStructuralWallCount > 0,
    reconciliation: duplicateDecision
  });

  const unmappedRows = cloneLedgerJson(sourceRows);
  const unmappedRow = unmappedRows.find((row) => row && row.kind === "structuralWall");
  if (unmappedRow) {
    unmappedRow.disposition = "unmapped";
    unmappedRow.reason = "fixture_forced_unmapped_structural_wall";
  }
  const unmapped = createStructuralWallReconciliation(cloneLedgerJson(sourceDecisions), unmappedRows);
  fixtures.push({
    name: "explicit_unmapped_structural_row",
    semanticStatus: "LEDGER_INTEGRITY_VIOLATION_PERSISTS",
    projectMutated: structuralFixtureInputsMutated(),
    expected: {
      unresolvedStructuralWallCountGreaterThanZero: true,
      structuralWallReconciliationPass: false
    },
    observed: {
      unresolvedStructuralWallCount: unmapped.unresolvedStructuralWallCount,
      structuralWallReconciliationPass: unmapped.structuralWallReconciliationPass
    },
    pass: unmapped.unresolvedStructuralWallCount > 0 && unmapped.structuralWallReconciliationPass === false,
    reconciliation: unmapped
  });

  return {
    schema: "laibe.planPuzzle.gateB.r3_1_2.structuralWallNegativeFixtures.v1",
    projectMutated: fixtures.some((fixture) => fixture.projectMutated === true),
    liveInputsUnchanged: originalDecisionHash === stableStringify(wallDispositionRecords || []) &&
      originalRowsHash === stableStringify(rows || []),
    fixtures,
    allFixturesPass: fixtures.length === 3 && fixtures.every((fixture) => fixture.pass === true && fixture.projectMutated === false)
  };
}

function createSceneRecordLedger(scene, runtimeIndex, importSessionId, hashes) {
  const records = sceneSourceRecords(scene);
  const sourceIds = records.map((record) => record.sourceId);
  const duplicateSourceIds = sourceIds.filter((id, index) => sourceIds.indexOf(id) !== index);
  const wallDispositionBySourceId = runtimeIndex && runtimeIndex.wallDispositionBySourceId || {};
  const rows = records.map((record) => {
    const runtimeRows = runtimeIndex && runtimeIndex.bySourceId && runtimeIndex.bySourceId[record.sourceId] || [];
    const promoted = runtimeRows.find((row) => row && row.editableObjectId) || null;
    const evidence = runtimeRows.find((row) => row && !row.editableObjectId) || null;
    const importerDecision = record.kind === "structuralWall" ? wallDispositionBySourceId[record.sourceId] || null : null;
    let disposition = "unmapped";
    let reason = null;
    let controllingLiveObjectId = null;
    let controllingSourceId = null;
    let suppressionMetrics = null;
    let suppressionThresholds = null;
    if (promoted) {
      disposition = "promoted_editable";
      reason = importerDecision && importerDecision.reason || "promoted_editable";
      controllingLiveObjectId = promoted.editableObjectId;
    } else if (evidence) {
      disposition = "review_evidence_only";
    } else if (record.kind === "structuralWall") {
      suppressionMetrics = importerDecision && importerDecision.metrics || null;
      suppressionThresholds = importerDecision && importerDecision.thresholds || null;
      if (importerDecision && importerDecision.decision === "suppressed_duplicate") {
        disposition = "suppressed_duplicate";
        reason = "suppressed_duplicate";
        controllingSourceId = importerDecision.controllingSourceId || null;
        controllingLiveObjectId = importerDecision.controllingEditableId || null;
      } else if (importerDecision && importerDecision.decision === "below_minimum_geometry") {
        disposition = "below_minimum_geometry";
        reason = "below_minimum_geometry";
      } else if (importerDecision && importerDecision.decision === "invalid_wall_geometry") {
        disposition = "unsupported";
        reason = "invalid_wall_geometry";
      } else {
        disposition = "unmapped";
        reason = "missing_importer_wall_disposition_record";
      }
    } else if (record.kind === "column") {
      disposition = "suppressed_duplicate_noise";
      reason = "not_promoted_column_retained_as_review_or_rejected_by_promotability_filter";
    } else if (record.kind === "dimensionLine") {
      disposition = "review_evidence_only";
      reason = "dimension_anchor_evidence_not_editable_object";
    }
    return {
      sourceId: record.sourceId,
      kind: record.kind,
      sourceCategory: record.category,
      sourceRegionId: record.sourceRegionId,
      sourceBBox: record.sourceBBox,
      disposition,
      reason,
      mappedRuntimeSourceId: record.sourceId,
      editableObjectId: promoted ? promoted.editableObjectId : null,
      controllingLiveObjectId,
      controllingSourceId,
      importerDecision,
      suppressionMetrics,
      suppressionThresholds,
      runtimeRows,
      policy: {
        source_kind: "pdf",
        object_status: "existing",
        work_action: "none",
        budget_trigger: "none",
        dbspec_projection: "excluded",
        mapping_state: "not_accepted"
      },
      provenance: promoted && promoted.provenance || evidence && evidence.provenance || {
        source_object_id: record.sourceId,
        source_object_ids: [record.sourceId],
        sourceRegionId: record.sourceRegionId,
        page: 1,
        sourceBBox: record.sourceBBox,
        sourcePdfSha256: hashes.sourceSha256,
        sourceProfileHash: hashes.sourceProfileHash,
        sourceSceneHash: hashes.sceneHash,
        importSessionId,
        acceptedTransformId: null,
        acceptedTransformStatus: "not-established"
      }
    };
  });
  const counts = {};
  rows.forEach((row) => {
    counts[row.disposition] = (counts[row.disposition] || 0) + 1;
  });
  const totalFromCounts = Object.keys(counts).reduce((sum, key) => sum + counts[key], 0);
  const wallDispositionRecords = runtimeIndex && Array.isArray(runtimeIndex.wallDispositionRecords) ? runtimeIndex.wallDispositionRecords : [];
  const importerWallDecisionCounts = {};
  wallDispositionRecords.forEach((record) => {
    const key = record && record.decision || "missing";
    importerWallDecisionCounts[key] = (importerWallDecisionCounts[key] || 0) + 1;
  });
  const ledgerStructuralWallCounts = {};
  rows.filter((row) => row.kind === "structuralWall").forEach((row) => {
    ledgerStructuralWallCounts[row.disposition] = (ledgerStructuralWallCounts[row.disposition] || 0) + 1;
  });
  const structuralWallReconciliation = createStructuralWallReconciliation(wallDispositionRecords, rows);
  const structuralWallNegativeFixtures = createStructuralWallNegativeFixtures(wallDispositionRecords, rows);
  return {
    schema: "laibe.planPuzzle.gateB.r3_1_2.sceneSourceLedger.v1",
    expectedTotal: 244,
    total: rows.length,
    uniqueSourceIdCount: new Set(sourceIds).size,
    duplicateSourceIds,
    missingSourceIdCount: rows.filter((row) => !row.sourceId).length,
    counts,
    totalsSumToExpected: totalFromCounts === rows.length && rows.length === 244,
    allRowsResolvedToOneDisposition: rows.every((row) => {
      if (row.kind === "structuralWall" && row.disposition === "unmapped") return false;
      return ["promoted_editable", "review_evidence_only", "suppressed_duplicate", "below_minimum_geometry", "suppressed_duplicate_noise", "unsupported", "uncertain_excluded", "unmapped"].includes(row.disposition);
    }),
    promotedRowsResolveToLiveEditableIds: rows.filter((row) => row.disposition === "promoted_editable").every((row) => Boolean(row.editableObjectId)),
    suppressionReconciliation: {
      importerWallDecisionCounts,
      ledgerStructuralWallCounts,
      importerWallRecordCount: wallDispositionRecords.length,
      structuralWallLedgerCount: rows.filter((row) => row.kind === "structuralWall").length,
      duplicateRowsHaveControllers: rows.filter((row) => row.disposition === "suppressed_duplicate").every((row) => Boolean(row.controllingSourceId && row.controllingLiveObjectId)),
      belowMinimumRowsHaveMeasuredMetrics: rows.filter((row) => row.disposition === "below_minimum_geometry").every((row) => Boolean(row.suppressionMetrics && row.suppressionThresholds)),
      structuralWallReconciliationPass: structuralWallReconciliation.structuralWallReconciliationPass
    },
    structuralWallReconciliation,
    structuralWallNegativeFixtures,
    rows
  };
}

function createGateBR3ReceiptNode() {
  let node = document.getElementById(GATE_B_R3_RECEIPT_NODE_ID);
  if (node) return node;
  node = document.createElement("script");
  node.id = GATE_B_R3_RECEIPT_NODE_ID;
  node.type = "application/json";
  node.hidden = true;
  node.dataset.status = "pending";
  node.textContent = JSON.stringify({
    schema: GATE_B_R3_RECEIPT_SCHEMA,
    status: "pending",
    trigger: "localhost-gate-b-r3-query"
  });
  document.documentElement.appendChild(node);
  return node;
}

function writeGateBR3Receipt(node, receipt) {
  node.dataset.status = receipt && receipt.status ? receipt.status : "error";
  node.textContent = JSON.stringify(receipt);
}

function sanitizeGateBR3Error(error) {
  const message = error && error.message ? String(error.message) : String(error || "Gate B R3 receipt failed.");
  return message.replace(/\s+/g, " ").slice(0, 260);
}

async function runGateBR3ImportReceipt() {
  if (!hasGateBR3ImportReceiptRoute()) return;
  const node = createGateBR3ReceiptNode();
  const params = new URLSearchParams(location.search);
  const source = params.get("laibePdfGateBSource") || DEFAULT_QA_SOURCE;
  const qaRunId = "gate-b-r3-existing-object-import-integration-" + Date.now().toString(36);
  const importSessionId = "gate-b-r3-import-session-" + Date.now().toString(36);
  try {
    const importer = await waitFor(() => typeof window.laibePlanImportPdfObjectizationScene === "function" && window.laibePlanImportPdfObjectizationScene, "Plan Puzzle PDF objectization importer", 60000);
    const planQa = await waitFor(() => window.LaibePlanPuzzleQa && typeof window.LaibePlanPuzzleQa.getGateBR3ImportState === "function" && window.LaibePlanPuzzleQa, "Plan Puzzle Gate B QA surface", 60000);
    const beforeProject = getProjectCounts();
    const extraction = await extractFromUrl(source, {
      qaRunId,
      expectedSha256: EXPECTED_SOURCE_SHA256,
      mirror: false,
      renderDiagnostics: true
    });
    const importerFile = await fileHashFor("./plan-puzzle.js");
    const codeHtmlFile = await fileHashFor("./code.html");
    const importerResult = await importer(extraction.scene, {
      importSessionId,
      qaRunId,
      sourceSha256: extraction.source.sha256,
      sourceProfileHash: extraction.regions.sourceProfileHash,
      sceneHash: extraction.adapter.derivedSceneHash,
      derivedSceneHash: extraction.adapter.derivedSceneHash,
      rawHash: extraction.extractor.canonicalRawHash,
      plotScaleDenominator: null
    });
    const afterProject = getProjectCounts();
    const importState = planQa.getGateBR3ImportState();
    const editabilityProbe = planQa.runGateBR3EditabilityProbe();
    const finalImportState = planQa.getGateBR3ImportState();
    const dispositions = createGateA2Dispositions(extraction.scene);
    const dispositionSummary = summarizeGateA2Dispositions(dispositions);
    const blockers = []
      .concat(dispositionSummary.unmappedSourceIds.map((id) => "unmapped_gate_a2_source:" + id))
      .concat((editabilityProbe.probes || []).filter((probe) => probe && probe.blocker && !probe.found).map((probe) => probe.category + ":" + probe.blocker));
    const receipt = {
      schema: GATE_B_R3_RECEIPT_SCHEMA,
      status: blockers.length ? "partial" : "ok",
      runtimeVersion: RUNTIME_VERSION,
      trigger: "localhost-gate-b-r3-query",
      qaRunId,
      importSessionId,
      source: extraction.source,
      pdfjs: extraction.pdfjs,
      extractor: extraction.extractor,
      adapter: extraction.adapter,
      runtime: {
        exactSourceRuntimeFile: extraction.adapter.runtimeFile,
        importerFile,
        codeHtmlFile
      },
      productionChain: {
        sameOrigin: extraction.source.sameOrigin,
        sameBufferSourceSha256: extraction.source.sha256,
        localPdfjs: true,
        extractorApi: extraction.extractor.api,
        adapterSceneSchema: extraction.scene && extraction.scene.schema || null,
        importerName: "window.laibePlanImportPdfObjectizationScene",
        importerInvocationCount: 1,
        importerResult
      },
      transform: {
        acceptedTransformId: null,
        acceptedTransformStatus: "not-established",
        scaleCalibrated: false,
        dimensionLabelsRemainAnnotations: true
      },
      projectMutation: {
        before: beforeProject,
        after: afterProject,
        changed: !sameCounts(beforeProject, afterProject),
        expectedForGateBImport: true
      },
      importState,
      editabilityProbe,
      finalImportState,
      gateA2Dispositions: {
        source: "AA_ACCEPTED_GATE_A2_SOURCE_ONLY_20260716",
        usage: "read_only_verification_ledger_not_runtime_geometry_payload",
        records: dispositions,
        summary: dispositionSummary
      },
      r3Blockers: blockers,
      noClaims: {
        gateBReadyClaimedByRuntime: blockers.length === 0,
        stage3Acceptance: false,
        geometryFidelityAcceptance: false,
        budgetOrDbspecProjection: false,
        nativePickerAcceptance: false
      },
      capturedAt: nowIso()
    };
    writeGateBR3Receipt(node, receipt);
    window.__laibePdfGateBR3ImportReceipt = receipt;
  } catch (error) {
    writeGateBR3Receipt(node, {
      schema: GATE_B_R3_RECEIPT_SCHEMA,
      status: "error",
      runtimeVersion: RUNTIME_VERSION,
      trigger: "localhost-gate-b-r3-query",
      error: sanitizeGateBR3Error(error),
      capturedAt: nowIso()
    });
  }
}

function gateBR31ReceiptRouteMode() {
  if (hasGateBR324ImmutableLocatorReceiptRoute()) return "r3_2_4";
  if (hasGateBR323FixturePurityRoute()) return "r3_2_3";
  if (hasGateBR322PredicateDualExtractionRoute()) return "r3_2_2";
  if (hasGateBR321CoordinateLiveGeometryRoute()) return "r3_2_1";
  if (hasGateBR312PolicyLedgerRoute()) return "r3_1_2";
  if (hasGateBR311PolicyLedgerRoute()) return "r3_1_1";
  if (hasGateBR31PolicyLedgerRoute()) return "r3_1";
  return null;
}

function gateBR31ReceiptConfig(mode) {
  if (mode === "r3_2_4") {
    return {
      nodeId: GATE_B_R3_2_4_RECEIPT_NODE_ID,
      schema: GATE_B_R3_2_4_RECEIPT_SCHEMA,
      trigger: "localhost-gate-b-r3-2-4-immutable-locator-receipt-suite-fingerprint-query",
      runIdPrefix: "gate-b-r3-2-4-immutable-locator-receipt-",
      importSessionPrefix: "gate-b-r3-2-4-import-session-"
    };
  }
  if (mode === "r3_2_3") {
    return {
      nodeId: GATE_B_R3_2_3_RECEIPT_NODE_ID,
      schema: GATE_B_R3_2_3_RECEIPT_SCHEMA,
      trigger: "localhost-gate-b-r3-2-3-fixture-purity-acceptance-chain-query",
      runIdPrefix: "gate-b-r3-2-3-fixture-purity-",
      importSessionPrefix: "gate-b-r3-2-3-import-session-"
    };
  }
  if (mode === "r3_2_2") {
    return {
      nodeId: GATE_B_R3_2_2_RECEIPT_NODE_ID,
      schema: GATE_B_R3_2_2_RECEIPT_SCHEMA,
      trigger: "localhost-gate-b-r3-2-2-real-predicate-dual-extraction-query",
      runIdPrefix: "gate-b-r3-2-2-predicate-dual-extraction-",
      importSessionPrefix: "gate-b-r3-2-2-import-session-"
    };
  }
  if (mode === "r3_2_1") {
    return {
      nodeId: GATE_B_R3_2_1_RECEIPT_NODE_ID,
      schema: GATE_B_R3_2_1_RECEIPT_SCHEMA,
      trigger: "localhost-gate-b-r3-2-1-coordinate-frame-live-geometry-query",
      runIdPrefix: "gate-b-r3-2-1-coordinate-live-geometry-",
      importSessionPrefix: "gate-b-r3-2-1-import-session-"
    };
  }
  if (mode === "r3_1_2") {
    return {
      nodeId: GATE_B_R3_1_2_RECEIPT_NODE_ID,
      schema: GATE_B_R3_1_2_RECEIPT_SCHEMA,
      trigger: "localhost-gate-b-r3-1-2-ledger-acceptance-guard-query",
      runIdPrefix: "gate-b-r3-1-2-ledger-guard-",
      importSessionPrefix: "gate-b-r3-1-2-import-session-"
    };
  }
  if (mode === "r3_1_1") {
    return {
      nodeId: GATE_B_R3_1_1_RECEIPT_NODE_ID,
      schema: GATE_B_R3_1_1_RECEIPT_SCHEMA,
      trigger: "localhost-gate-b-r3-1-1-policy-ledger-query",
      runIdPrefix: "gate-b-r3-1-1-policy-ledger-",
      importSessionPrefix: "gate-b-r3-1-1-import-session-"
    };
  }
  return {
    nodeId: GATE_B_R3_1_RECEIPT_NODE_ID,
    schema: GATE_B_R3_1_RECEIPT_SCHEMA,
    trigger: "localhost-gate-b-r3-1-policy-ledger-query",
    runIdPrefix: "gate-b-r3-1-policy-ledger-",
    importSessionPrefix: "gate-b-r3-1-import-session-"
  };
}

function createGateBR31ReceiptNode(mode = "r3_1") {
  const config = gateBR31ReceiptConfig(mode);
  const nodeId = config.nodeId;
  const schema = config.schema;
  const trigger = config.trigger;
  let node = document.getElementById(nodeId);
  if (node) return node;
  node = document.createElement("script");
  node.id = nodeId;
  node.type = "application/json";
  node.hidden = true;
  node.dataset.status = "pending";
  node.textContent = JSON.stringify({
    schema,
    status: "pending",
    trigger
  });
  document.documentElement.appendChild(node);
  return node;
}

function writeGateBR31Receipt(node, receipt) {
  node.dataset.status = receipt && receipt.status ? receipt.status : "error";
  node.textContent = JSON.stringify(receipt);
}

async function runGateBR31PolicyLedgerReceipt() {
  const routeMode = gateBR31ReceiptRouteMode();
  if (!routeMode) return;
  const isR311 = routeMode === "r3_1_1";
  const isR312 = routeMode === "r3_1_2";
  const isR321 = routeMode === "r3_2_1";
  const isR322 = routeMode === "r3_2_2";
  const isR323 = routeMode === "r3_2_3";
  const isR324 = routeMode === "r3_2_4";
  const needsFixturePurityClosure = isR323 || isR324;
  const needsCoordinateLiveGeometry = isR321 || isR322 || needsFixturePurityClosure;
  const needsDualExtractionClosure = isR322 || needsFixturePurityClosure;
  const config = gateBR31ReceiptConfig(routeMode);
  const receiptSchema = config.schema;
  const receiptTrigger = config.trigger;
  const node = createGateBR31ReceiptNode(routeMode);
  const params = new URLSearchParams(location.search);
  const source = params.get("laibePdfGateBSource") || DEFAULT_QA_SOURCE;
  const qaRunId = config.runIdPrefix + Date.now().toString(36);
  const importSessionId = config.importSessionPrefix + Date.now().toString(36);
  try {
    const importer = await waitFor(() => typeof window.laibePlanImportPdfObjectizationScene === "function" && window.laibePlanImportPdfObjectizationScene, "Plan Puzzle PDF objectization importer", 60000);
    const planQa = await waitFor(() => window.LaibePlanPuzzleQa &&
      typeof window.LaibePlanPuzzleQa.getGateBR3ImportState === "function" &&
      typeof window.LaibePlanPuzzleQa.runGateBR31PolicyIntegrityProbe === "function" &&
      typeof window.LaibePlanPuzzleQa.getGateBR31RuntimeProvenanceIndex === "function" &&
      window.LaibePlanPuzzleQa, "Plan Puzzle Gate B R3.1 QA surface", 60000);
    const beforeProject = getProjectCounts();
    const extraction = await extractFromUrl(source, {
      qaRunId: needsDualExtractionClosure ? qaRunId + "-extraction-1-designated-import" : qaRunId,
      expectedSha256: EXPECTED_SOURCE_SHA256,
      mirror: false,
      renderDiagnostics: false
    });
    let stabilityExtraction = null;
    let dualExtractionStability = null;
    if (needsDualExtractionClosure) {
      stabilityExtraction = await extractFromUrl(source, {
        qaRunId: qaRunId + "-extraction-2-read-only-stability",
        expectedSha256: EXPECTED_SOURCE_SHA256,
        mirror: false,
        renderDiagnostics: false
      });
      dualExtractionStability = createDualExtractionStabilityComparison(extraction, stabilityExtraction);
    }
    const importerFile = await fileHashFor("./plan-puzzle.js");
    const codeHtmlFile = await fileHashFor("./code.html");
    const importerResult = await importer(extraction.scene, {
      importSessionId,
      qaRunId,
      sourceSha256: extraction.source.sha256,
      sourceProfileHash: extraction.regions.sourceProfileHash,
      sceneHash: extraction.adapter.derivedSceneHash,
      derivedSceneHash: extraction.adapter.derivedSceneHash,
      rawHash: extraction.extractor.canonicalRawHash,
      plotScaleDenominator: null
    });
    const afterProject = getProjectCounts();
    const importState = planQa.getGateBR3ImportState();
    const phaseA = planQa.runGateBR31PolicyIntegrityProbe();
    const finalImportState = planQa.getGateBR3ImportState();
    let runtimeIndex = null;
    let gateA2Ledger = null;
    let gateA2Summary = null;
    let sceneLedger = null;
    let representativeCorrespondence = null;
    let identityComparison = null;
    let regionMetadataAudit = null;
    let liveGeometryBinding = null;
    let coordinateLiveGeometryNegativeFixtures = null;
    let freshLivePredicateInput = null;
    let freshLivePredicate = null;
    if (phaseA.phaseAPass) {
      runtimeIndex = planQa.getGateBR31RuntimeProvenanceIndex();
      const ledgerHashes = {
        sourceSha256: extraction.source.sha256,
        sourceProfileHash: extraction.regions.sourceProfileHash,
        sceneHash: extraction.adapter.derivedSceneHash
      };
      gateA2Ledger = createGateA2Dispositions(extraction.scene, runtimeIndex);
      gateA2Summary = summarizeGateA2Dispositions(gateA2Ledger);
      sceneLedger = createSceneRecordLedger(extraction.scene, runtimeIndex, importSessionId, ledgerHashes);
      if (needsCoordinateLiveGeometry) {
        representativeCorrespondence = evaluateRepresentativeCorrespondence(extraction.scene, { mode: "correct_transform" });
        identityComparison = evaluateRepresentativeCorrespondence(extraction.scene, { mode: "identity_top_left" });
        regionMetadataAudit = createRegionMetadataAudit(gateA2Ledger);
        liveGeometryBinding = createLiveGeometryBinding(runtimeIndex, importSessionId);
        freshLivePredicateInput = createCoordinateLiveGeometryPredicateInput({
          scene: extraction.scene,
          importSessionId,
          transform: GATE_A2_TO_SCENE_FRAME_TRANSFORM,
          representativeCorrespondence,
          identityComparison,
          regionMetadataAudit,
          liveGeometryBinding,
          gateA2Summary,
          sceneLedger,
          phaseA,
          transformStatus: {
            acceptedTransformId: null,
            acceptedTransformStatus: "not-established",
            scaleCalibrated: false
          }
        });
        freshLivePredicate = evaluateCoordinateLiveGeometryContract(freshLivePredicateInput);
        coordinateLiveGeometryNegativeFixtures = await createCoordinateLiveGeometryNegativeFixtures(freshLivePredicateInput, planQa);
      }
    }
    const r311SuppressionPass = Boolean(sceneLedger &&
      sceneLedger.suppressionReconciliation &&
      sceneLedger.suppressionReconciliation.importerWallRecordCount === 224 &&
      sceneLedger.suppressionReconciliation.structuralWallLedgerCount === 224 &&
      sceneLedger.suppressionReconciliation.duplicateRowsHaveControllers &&
      sceneLedger.suppressionReconciliation.belowMinimumRowsHaveMeasuredMetrics);
    const r312StructuralWallGuardPass = Boolean(sceneLedger &&
      sceneLedger.structuralWallReconciliation &&
      sceneLedger.structuralWallReconciliation.structuralWallReconciliationPass === true &&
      sceneLedger.structuralWallNegativeFixtures &&
      sceneLedger.structuralWallNegativeFixtures.allFixturesPass === true);
    const r321CoordinateLiveGeometryPass = Boolean(freshLivePredicate &&
      freshLivePredicate.pass === true &&
      coordinateLiveGeometryNegativeFixtures &&
      coordinateLiveGeometryNegativeFixtures.allFixturesPass === true &&
      gateA2Summary &&
      gateA2Summary.candidateMappedWithoutEditableId.length === 0);
    const r322RealPredicateDualExtractionPass = Boolean(r321CoordinateLiveGeometryPass &&
      dualExtractionStability &&
      dualExtractionStability.pass === true);
    const r323FixturePurityAcceptanceChainPass = Boolean(freshLivePredicate &&
      freshLivePredicate.pass === true &&
      coordinateLiveGeometryNegativeFixtures &&
      coordinateLiveGeometryNegativeFixtures.suiteAcceptance &&
      coordinateLiveGeometryNegativeFixtures.suiteAcceptance.pass === true &&
      coordinateLiveGeometryNegativeFixtures.acceptanceChainGuards &&
      coordinateLiveGeometryNegativeFixtures.acceptanceChainGuards.allAcceptanceChainGuardsPass === true &&
      dualExtractionStability &&
      dualExtractionStability.pass === true);
    const ledgerPassCore = Boolean(phaseA.phaseAPass &&
      gateA2Summary &&
      gateA2Summary.total === 29 &&
      gateA2Summary.uniqueSourceIdCount === 29 &&
      gateA2Summary.allRecordsResolvedToOneDisposition &&
      gateA2Summary.candidateMappedWithoutEditableId.length === 0 &&
      sceneLedger &&
      sceneLedger.total === 244 &&
      sceneLedger.uniqueSourceIdCount === 244 &&
      sceneLedger.duplicateSourceIds.length === 0 &&
      sceneLedger.totalsSumToExpected &&
      sceneLedger.allRowsResolvedToOneDisposition &&
      sceneLedger.promotedRowsResolveToLiveEditableIds &&
      (!isR311 || r311SuppressionPass) &&
      (!isR312 || (r311SuppressionPass && r312StructuralWallGuardPass)) &&
      (!isR321 || (r311SuppressionPass && r312StructuralWallGuardPass && r321CoordinateLiveGeometryPass)) &&
      (!isR322 || (r311SuppressionPass && r312StructuralWallGuardPass && r322RealPredicateDualExtractionPass)) &&
      (!needsFixturePurityClosure || (r311SuppressionPass && r312StructuralWallGuardPass && r323FixturePurityAcceptanceChainPass)));
    let ledgerPass = ledgerPassCore;
    const blockers = [];
    if (!phaseA.phaseAPass) blockers.push("phase_a_policy_integrity_assertion_failed");
    const receiptPhaseA = isR324 ? await createReceiptSafePhaseA(phaseA) : phaseA;
    const suiteFingerprints = coordinateLiveGeometryNegativeFixtures && coordinateLiveGeometryNegativeFixtures.suiteFingerprints || null;
    const suiteFingerprintComparisons = suiteFingerprints ? {
      schema: "laibe.planPuzzle.gateB.r3_2_4.exposedSuiteFingerprintComparison.v1",
      productionPredicateInputPreservedFromExposedRecords: sameFingerprint(
        suiteFingerprints.productionPredicateInput && suiteFingerprints.productionPredicateInput.before,
        suiteFingerprints.productionPredicateInput && suiteFingerprints.productionPredicateInput.after
      ),
      projectLiveInputsPreservedFromExposedRecords: sameFingerprint(
        suiteFingerprints.projectLiveState && suiteFingerprints.projectLiveState.before,
        suiteFingerprints.projectLiveState && suiteFingerprints.projectLiveState.after
      ),
      derivedProductionPreservationMatchesSuiteAcceptance: sameFingerprint(
        suiteFingerprints.productionPredicateInput && suiteFingerprints.productionPredicateInput.before,
        suiteFingerprints.productionPredicateInput && suiteFingerprints.productionPredicateInput.after
      ) === (coordinateLiveGeometryNegativeFixtures && coordinateLiveGeometryNegativeFixtures.productionReceiptInputsPreserved === true),
      derivedProjectLivePreservationMatchesSuiteAcceptance: sameFingerprint(
        suiteFingerprints.projectLiveState && suiteFingerprints.projectLiveState.before,
        suiteFingerprints.projectLiveState && suiteFingerprints.projectLiveState.after
      ) === (coordinateLiveGeometryNegativeFixtures && coordinateLiveGeometryNegativeFixtures.projectLiveInputsPreserved === true)
    } : null;
    const suiteFingerprintComparisonsPass = Boolean(suiteFingerprintComparisons &&
      suiteFingerprintComparisons.productionPredicateInputPreservedFromExposedRecords === true &&
      suiteFingerprintComparisons.projectLiveInputsPreservedFromExposedRecords === true &&
      suiteFingerprintComparisons.derivedProductionPreservationMatchesSuiteAcceptance === true &&
      suiteFingerprintComparisons.derivedProjectLivePreservationMatchesSuiteAcceptance === true);
    const receipt = {
      schema: receiptSchema,
      status: phaseA.phaseAPass ? (ledgerPass ? "ok" : "partial") : "policy_violation_persists",
      runtimeVersion: RUNTIME_VERSION,
      trigger: receiptTrigger,
      qaRunId,
      importSessionId,
      source: extraction.source,
      pdfjs: extraction.pdfjs,
      extractor: extraction.extractor,
      adapter: extraction.adapter,
      runtime: {
        exactSourceRuntimeFile: extraction.adapter.runtimeFile,
        importerFile,
        codeHtmlFile
      },
      productionChain: {
        sameOrigin: extraction.source.sameOrigin,
        sameBufferSourceSha256: extraction.source.sha256,
        localPdfjs: true,
        extractorApi: extraction.extractor.api,
        adapterSceneSchema: extraction.scene && extraction.scene.schema || null,
        importerName: "window.laibePlanImportPdfObjectizationScene",
        importerInvocationCount: 1,
        importerResult
      },
      transform: {
        acceptedTransformId: null,
        acceptedTransformStatus: "not-established",
        scaleCalibrated: false,
        dimensionLabelsRemainAnnotations: true
      },
      projectMutation: {
        before: beforeProject,
        after: afterProject,
        changed: !sameCounts(beforeProject, afterProject),
        expectedForFreshProductionImportRound: true
      },
      importState,
      phaseA: receiptPhaseA,
      finalImportState,
      runtimeIndexSummary: runtimeIndex ? {
        importSessionId: runtimeIndex.importSessionId,
        rowCount: runtimeIndex.rowCount
      } : null,
      ledgerAcceptanceGuard: (isR312 || isR321 || isR322 || needsFixturePurityClosure) && sceneLedger ? {
        structuralWallReconciliation: sceneLedger.structuralWallReconciliation,
        structuralWallNegativeFixtures: sceneLedger.structuralWallNegativeFixtures,
        r311SuppressionPass,
        r312StructuralWallGuardPass
      } : null,
      coordinateFrameLiveGeometryRepair: needsCoordinateLiveGeometry ? {
        transform: GATE_A2_TO_SCENE_FRAME_TRANSFORM,
        representativeCorrespondence,
        identityComparison,
        regionMetadataAudit,
        liveGeometryBinding,
        excludedAreaInvariantAudit: freshLivePredicateInput && freshLivePredicateInput.excludedAreaInvariantAudit || null,
        sharedPredicateName: "evaluateCoordinateLiveGeometryContract",
        freshLivePredicate,
        negativeFixtures: coordinateLiveGeometryNegativeFixtures,
        r311SuppressionPass,
        r312StructuralWallGuardPass,
        r321CoordinateLiveGeometryPass
      } : null,
      realPredicateDualExtractionClosure: needsDualExtractionClosure ? {
        sharedPredicateName: "evaluateCoordinateLiveGeometryContract",
        freshLivePredicate,
        allFixturesPass: coordinateLiveGeometryNegativeFixtures && coordinateLiveGeometryNegativeFixtures.allFixturesPass === true,
        dualExtractionStability,
        importerInvocationCountTotal: 1,
        designatedImportExtractionQaRunId: extraction.qaRunId,
        readOnlyStabilityExtractionQaRunId: stabilityExtraction && stabilityExtraction.qaRunId || null,
        readOnlySecondExtractionImported: false,
        topLevelPassRequiresFreshPredicateAndFixturesAndDualStability: true,
        topLevelPass: needsFixturePurityClosure ? r323FixturePurityAcceptanceChainPass : r322RealPredicateDualExtractionPass,
        historicalR312DifferenceRecord: {
          status: needsFixturePurityClosure ? "current_fresh_dual_runs_stable_with_fixture_purity_acceptance_chain" : "current_fresh_dual_runs_stable_after_r3_2_1_coordinate_region_correction",
          sealedR312EvidenceUse: "read_only_dependency_only_no_runtime_filesystem_dependency",
          currentSceneHash: extraction.adapter.derivedSceneHash,
          currentSourceProfileHash: extraction.regions.sourceProfileHash,
          reason: needsFixturePurityClosure ?
            "R3.2.4 retains corrected region semantics and adds immutable locator receipt plus suite-fingerprint evidence closure; acceptance is based on fresh dual extraction and fresh hidden receipt evidence." :
            "R3.2.2 retains corrected region semantics introduced after R3.1.2; acceptance is based on exact stability between the two new fresh extractions."
        }
      } : null,
      fixturePurityAcceptanceChainClosure: needsFixturePurityClosure ? {
        suiteEvaluator: "evaluateCoordinateLiveGeometryFixtureSuiteAcceptance",
        suiteFingerprints,
        suiteFingerprintComparisons,
        productionReceiptInputsPreserved: coordinateLiveGeometryNegativeFixtures && coordinateLiveGeometryNegativeFixtures.productionReceiptInputsPreserved === true,
        projectLiveInputsPreserved: coordinateLiveGeometryNegativeFixtures && coordinateLiveGeometryNegativeFixtures.projectLiveInputsPreserved === true,
        suiteAcceptance: coordinateLiveGeometryNegativeFixtures && coordinateLiveGeometryNegativeFixtures.suiteAcceptance || null,
        acceptanceChainGuards: coordinateLiveGeometryNegativeFixtures && coordinateLiveGeometryNegativeFixtures.acceptanceChainGuards || null,
        allAcceptanceChainGuardsPass: coordinateLiveGeometryNegativeFixtures && coordinateLiveGeometryNegativeFixtures.allAcceptanceChainGuardsPass === true,
        topLevelPassRequiresSuiteAcceptanceAndAcceptanceChainGuards: true,
        topLevelPass: r323FixturePurityAcceptanceChainPass
      } : null,
      gateA2Ledger: gateA2Ledger ? {
        source: GATE_A2_SOURCE_INVENTORY_IDENTITY,
        usage: "localhost_qa_only_verification_constants_not_product_runtime_geometry_payload",
        records: gateA2Ledger,
        summary: gateA2Summary
      } : null,
      sceneSourceLedger: sceneLedger,
      blockers,
      noClaims: {
        gateBAcceptance: false,
        stage3Acceptance: false,
        geometryFidelityAcceptance: false,
        budgetOrDbspecProjection: false,
        productionAcceptance: false,
        parentCompletion: false
      },
      capturedAt: nowIso()
    };
    if (isR324) {
      const receiptHygieneAudit = auditReceiptPayloadHygiene(receipt);
      const receiptHygieneNegativeGuards = createReceiptHygieneNegativeGuards(receipt);
      const allReceiptHygieneGuardsPass = receiptHygieneNegativeGuards.allReceiptHygieneGuardsPass === true;
      const r324ImmutableLocatorReceiptSuiteFingerprintPass = Boolean(
        r323FixturePurityAcceptanceChainPass &&
        suiteFingerprintComparisonsPass &&
        receiptHygieneAudit.pass === true &&
        allReceiptHygieneGuardsPass
      );
      ledgerPass = Boolean(ledgerPassCore && r324ImmutableLocatorReceiptSuiteFingerprintPass);
      if (!receiptHygieneAudit.pass) blockers.push("receipt_hygiene_audit_failed");
      if (!allReceiptHygieneGuardsPass) blockers.push("receipt_hygiene_negative_guards_failed");
      receipt.receiptHygieneAudit = receiptHygieneAudit;
      receipt.receiptHygieneNegativeGuards = receiptHygieneNegativeGuards;
      receipt.immutableLocatorReceiptSuiteFingerprintClosure = {
        schema: "laibe.planPuzzle.gateB.r3_2_4.immutableLocatorReceiptSuiteFingerprintClosure.v1",
        receiptHygieneAuditPassRequiredByTopLevel: true,
        allReceiptHygieneGuardsPassRequiredByTopLevel: true,
        suiteFingerprintComparisonsPassRequiredByTopLevel: true,
        ledgerPassRequiresReceiptHygieneAuditPass: true,
        statusOkRequiresReceiptHygieneAuditPass: true,
        r324ImmutableLocatorReceiptSuiteFingerprintPass,
        suiteFingerprintComparisonsPass,
        allReceiptHygieneGuardsPass
      };
      if (receipt.fixturePurityAcceptanceChainClosure) {
        receipt.fixturePurityAcceptanceChainClosure.topLevelPassRequiresReceiptHygieneAuditAndGuards = true;
        receipt.fixturePurityAcceptanceChainClosure.topLevelPass = r324ImmutableLocatorReceiptSuiteFingerprintPass;
      }
    }
    if (phaseA.phaseAPass && !ledgerPass) blockers.push("phase_b_ledger_integrity_assertion_failed");
    receipt.ledgerPass = ledgerPass;
    receipt.status = phaseA.phaseAPass ? (ledgerPass ? "ok" : "partial") : "policy_violation_persists";
    writeGateBR31Receipt(node, receipt);
    window.__laibePdfGateBR31PolicyLedgerReceipt = receipt;
    if (isR311) window.__laibePdfGateBR311PolicyLedgerReceipt = receipt;
    if (isR312) window.__laibePdfGateBR312LedgerGuardReceipt = receipt;
    if (isR321) window.__laibePdfGateBR321CoordinateLiveGeometryReceipt = receipt;
    if (isR322) window.__laibePdfGateBR322PredicateDualExtractionReceipt = receipt;
    if (isR323) window.__laibePdfGateBR323FixturePurityReceipt = receipt;
    if (isR324) window.__laibePdfGateBR324ImmutableLocatorReceipt = receipt;
  } catch (error) {
    writeGateBR31Receipt(node, {
      schema: receiptSchema,
      status: "error",
      runtimeVersion: RUNTIME_VERSION,
      trigger: receiptTrigger,
      error: sanitizeGateBR3Error(error),
      capturedAt: nowIso()
    });
  }
}

function createGateBR4AReceiptNode() {
  let node = document.getElementById(GATE_B_R4A_RECEIPT_NODE_ID);
  if (node) return node;
  node = document.createElement("script");
  node.id = GATE_B_R4A_RECEIPT_NODE_ID;
  node.type = "application/json";
  node.hidden = true;
  node.dataset.status = "pending";
  node.textContent = JSON.stringify({
    schema: GATE_B_R4A_RECEIPT_SCHEMA,
    status: "pending",
    trigger: "localhost-gate-b-r4a-semantic-category-query"
  });
  document.documentElement.appendChild(node);
  return node;
}

function writeGateBR4AReceipt(node, receipt) {
  node.dataset.status = receipt && receipt.status ? receipt.status : "error";
  node.textContent = JSON.stringify(receipt);
}

function r4aSemanticCategoryForRecord(record) {
  if (!record) return null;
  if (record.cat === "stair_region") return "stairCandidates";
  if (record.cat === "space_boundary_sample") return "spaceBoundaryCandidates";
  if (record.cat === "opening" && (record.sub === "stair_void" || record.sub === "vertical_stair_void")) return "stairVoidCandidates";
  if (record.cat === "opening") return "openingCandidates";
  return null;
}

function r4aExpectedSubtype(record) {
  const geometry = record && GATE_A2_SOURCE_GEOMETRY[record.id] || {};
  if (record && (record.sub === "stair_void" || record.sub === "vertical_stair_void")) return "independently_bounded_stair_void";
  if (geometry.sub === "vertical_stair_void") return "independently_bounded_stair_void";
  if (geometry.sub === "hinged_door") return "hinged_door";
  if (geometry.sub === "window") return "window";
  return null;
}

function r4aSemanticCandidatePredicate(candidate) {
  const category = candidate && (candidate.category || candidate.sourceCategory) || "";
  const evidence = candidate && candidate.evidence || {};
  const rules = {
    candidateOnly: candidate && candidate.semantic_status === "candidate_unaccepted" && candidate.human_confirmation_required === true,
    notAccepted: candidate && candidate.mapping_state === "not_accepted" && candidate.editable_object_id === null && candidate.acceptedTransformId === null,
    existingPolicy: candidate && candidate.source_kind === "pdf" && candidate.object_status === "existing" && candidate.work_action === "none" && candidate.budget_trigger === "none" && candidate.dbspec_projection === "excluded"
  };
  if (category === "opening" || category === "opening_candidate") {
    if (candidate.subtype === "hinged_door") {
      rules.geometryProof = Boolean(evidence.curvedArc && evidence.curvedArc.hasCurve && evidence.leaf && evidence.hinge && evidence.hostWallGap && evidence.hostWallGap.wallIds && evidence.hostWallGap.wallIds.length >= 2 && evidence.hostWallGap.candidateFitPass === true && evidence.doorArcLeafFit === true);
    } else if (candidate.subtype === "window") {
      rules.geometryProof = Boolean(Array.isArray(evidence.parallelLines) && evidence.parallelLines.length >= 2 && Number(evidence.overlapRatio) >= 0.55 && Number(evidence.separationPdf) > 0 && evidence.hostWallGap && evidence.hostWallGap.wallIds && evidence.hostWallGap.wallIds.length >= 2 && evidence.hostWallGap.candidateFitPass === true && evidence.windowFrameFitPass === true && Number(evidence.parallelNeighborCount || 0) <= Math.max(2, Number(evidence.maximumParallelRailCount || 2)));
    } else {
      rules.geometryProof = false;
    }
  } else if (category === "stair" || category === "stair_candidate") {
    rules.geometryProof = Boolean(Number(evidence.treadCount) >= 5 && Number(evidence.spacingPdf) > 0 && Number(evidence.regularSpacingRatio) >= 0.7 && evidence.boundedEnvelope && evidence.boundedEnvelope.bounded === true && (Number(evidence.boundedEnvelope.sideCount) >= 3 || evidence.landingLineId));
  } else if (category === "stairVoid" || category === "stair_void_candidate") {
    rules.geometryProof = Boolean(evidence.closedPath === true && Number(evidence.boundarySegmentCount) >= 4 && Number(evidence.hostWallContactCount) >= 3 && evidence.relatedStairId);
  } else if (category === "spaceBoundary" || category === "space_boundary_candidate") {
    rules.geometryProof = Boolean(evidence.closedPath === true && Number(evidence.boundarySegmentCount) >= 4 && Number(evidence.hostWallContactCount) >= 3 && evidence.openingTreatment === true);
  } else {
    rules.geometryProof = false;
  }
  const failedRules = Object.keys(rules).filter((key) => rules[key] !== true);
  return {
    schema: "laibe.planPuzzle.pdfSemanticCandidatePredicate.v1",
    category,
    subtype: candidate && candidate.subtype || null,
    rules,
    failedRules,
    pass: failedRules.length === 0
  };
}

function createR4ASemanticDetectorFixtures() {
  const fixtureDefinitions = [
    { id: "isolated-arc-no-host", category: "opening", subtype: "hinged_door", candidate: { semantic_status: "candidate_unaccepted", human_confirmation_required: true, mapping_state: "not_accepted", editable_object_id: null, acceptedTransformId: null, source_kind: "pdf", object_status: "existing", work_action: "none", budget_trigger: "none", dbspec_projection: "excluded", evidence: { curvedArc: { hasCurve: true }, leaf: { lineId: "fixture-leaf" }, hinge: { point: { x: 1, y: 1 } } } } },
    { id: "text-only-label", category: "opening", subtype: "window", candidate: { semantic_status: "candidate_unaccepted", human_confirmation_required: true, mapping_state: "not_accepted", editable_object_id: null, acceptedTransformId: null, source_kind: "pdf", object_status: "existing", work_action: "none", budget_trigger: "none", dbspec_projection: "excluded", text: "WINDOW" } },
    { id: "black-wedge", category: "opening", subtype: "black_wedge_on_wall", candidate: { semantic_status: "candidate_unaccepted", human_confirmation_required: true, mapping_state: "not_accepted", editable_object_id: null, acceptedTransformId: null, source_kind: "pdf", object_status: "existing", work_action: "none", budget_trigger: "none", dbspec_projection: "excluded", evidence: {} } },
    { id: "title-parallel-lines", category: "opening", subtype: "window", candidate: { semantic_status: "candidate_unaccepted", human_confirmation_required: true, mapping_state: "not_accepted", editable_object_id: null, acceptedTransformId: null, source_kind: "pdf", object_status: "existing", work_action: "none", budget_trigger: "none", dbspec_projection: "excluded", evidence: { parallelLines: ["a", "b"], overlapRatio: 1, separationPdf: 4, parallelNeighborCount: 2 } } },
    { id: "repeated-lines-no-envelope", category: "stair", subtype: "treads_landing_direction_envelope", candidate: { semantic_status: "candidate_unaccepted", human_confirmation_required: true, mapping_state: "not_accepted", editable_object_id: null, acceptedTransformId: null, source_kind: "pdf", object_status: "existing", work_action: "none", budget_trigger: "none", dbspec_projection: "excluded", evidence: { treadCount: 8, spacingPdf: 7, regularSpacingRatio: 0.9, boundedEnvelope: { bounded: false, sideCount: 0 } } } },
    { id: "open-space-boundary", category: "spaceBoundary", subtype: "closed_host_related_topology_with_opening_treatment", candidate: { semantic_status: "candidate_unaccepted", human_confirmation_required: true, mapping_state: "not_accepted", editable_object_id: null, acceptedTransformId: null, source_kind: "pdf", object_status: "existing", work_action: "none", budget_trigger: "none", dbspec_projection: "excluded", evidence: { closedPath: false, boundarySegmentCount: 3, hostWallContactCount: 3, openingTreatment: true } } },
    { id: "positive-door", category: "opening", subtype: "hinged_door", candidate: { semantic_status: "candidate_unaccepted", human_confirmation_required: true, mapping_state: "not_accepted", editable_object_id: null, acceptedTransformId: null, source_kind: "pdf", object_status: "existing", work_action: "none", budget_trigger: "none", dbspec_projection: "excluded", evidence: { curvedArc: { hasCurve: true }, leaf: { lineId: "fixture-leaf" }, hinge: { point: { x: 1, y: 1 } }, doorArcLeafFit: true, hostWallGap: { wallIds: ["wall-a", "wall-b"], candidateFitPass: true } } } },
    { id: "positive-window", category: "opening", subtype: "window", candidate: { semantic_status: "candidate_unaccepted", human_confirmation_required: true, mapping_state: "not_accepted", editable_object_id: null, acceptedTransformId: null, source_kind: "pdf", object_status: "existing", work_action: "none", budget_trigger: "none", dbspec_projection: "excluded", evidence: { parallelLines: ["a", "b"], overlapRatio: 0.9, separationPdf: 4, parallelNeighborCount: 2, windowFrameFitPass: true, hostWallGap: { wallIds: ["wall-a", "wall-b"], candidateFitPass: true } } } },
    { id: "positive-stair", category: "stair", subtype: "treads_landing_direction_envelope", candidate: { semantic_status: "candidate_unaccepted", human_confirmation_required: true, mapping_state: "not_accepted", editable_object_id: null, acceptedTransformId: null, source_kind: "pdf", object_status: "existing", work_action: "none", budget_trigger: "none", dbspec_projection: "excluded", evidence: { treadCount: 8, spacingPdf: 7, regularSpacingRatio: 0.9, landingLineId: "landing", boundedEnvelope: { bounded: true, sideCount: 2 } } } }
  ];
  const production = window.LaibePdfPlanVectorExtractor && window.LaibePdfPlanVectorExtractor.semanticDetectorPredicates;
  const contract = window.LaibePdfPlanVectorExtractor && window.LaibePdfPlanVectorExtractor.semanticDetectorPredicateContract;
  if (!production || !contract) throw new Error("Production semantic detector predicates are unavailable.");
  const predicateNameFor = (definition) => {
    if (definition.subtype === "hinged_door") return "door";
    if (definition.subtype === "window") return "window";
    if (definition.category === "stair") return "stair";
    if (definition.category === "spaceBoundary") return "space";
    return "window";
  };
  return fixtureDefinitions.map((definition) => {
    const candidate = { ...definition.candidate, category: definition.category, subtype: definition.subtype };
    const predicateName = predicateNameFor(definition);
    const productionPredicate = production[predicateName](candidate.evidence || {});
    const policyPredicate = r4aSemanticCandidatePredicate(candidate);
    const expectedPass = definition.id.startsWith("positive-");
    return {
      id: definition.id,
      category: definition.category,
      subtype: definition.subtype,
      expectedPass,
      predicateFunctionName: "LaibePdfPlanVectorExtractor.semanticDetectorPredicates." + predicateName,
      predicateContract: contract,
      productionPredicate,
      policyPredicate,
      pass: productionPredicate.pass === expectedPass,
      input: candidate.evidence || {}
    };
  });
}

function r4aSemanticLedgerForScene(scene) {
  const clearRecords = GATE_A2_SOURCE_RECORDS.filter((record) => !record.uncertain && (record.cat === "opening" || record.cat === "stair_region" || record.cat === "space_boundary_sample"));
  const uncertainRecords = GATE_A2_SOURCE_RECORDS.filter((record) => record.uncertain);
  const rows = clearRecords.map((baseRecord) => {
    const record = hydrateGateA2Record(baseRecord);
    const arrayKey = r4aSemanticCategoryForRecord(record);
    const expectedSubtype = r4aExpectedSubtype(record);
    const candidates = arrayKey && Array.isArray(scene && scene[arrayKey]) ? scene[arrayKey] : [];
    const candidateRows = candidates.filter((candidate) => !expectedSubtype || candidate.subtype === expectedSubtype).map((candidate) => {
      const score = scoreGateA2CandidateWithBox(record, candidate, boxFromArray(record.source_bbox_pdf_pt_scene_bottom_left), { requireRegionCompatibility: true });
      const predicate = r4aSemanticCandidatePredicate(candidate);
      return { candidateSourceId: candidate.source_object_id || null, candidateSubtype: candidate.subtype || null, predicate, score };
    });
    const positive = candidateRows.filter((row) => row.predicate.pass === true && row.score.pass === true);
    return {
      sourceId: record.id,
      sourceCategory: record.cat,
      sourceSubtype: GATE_A2_SOURCE_GEOMETRY[record.id] && GATE_A2_SOURCE_GEOMETRY[record.id].sub || record.sub || null,
      sourceRegionId: gateA2RegionToSceneRegion(record.region),
      sourceBBoxSceneBottomLeftPt: record.source_bbox_pdf_pt_scene_bottom_left,
      candidateArray: arrayKey,
      expectedSubtype,
      candidateCount: candidateRows.length,
      candidateRows,
      disposition: positive.length ? "candidate_present_unaccepted" : "missing_with_exact_reason",
      reason: positive.length ? "geometry_derived_candidate_meets_detector_and_region_gates" : "no_geometry_derived_candidate_meets_subtype_region_and_overlap_gates",
      acceptedMappingCount: 0,
      mapping_state: "not_accepted"
    };
  });
  const uncertainRows = uncertainRecords.map((record) => ({
    sourceBBoxSceneBottomLeftPt: GATE_A2_SOURCE_GEOMETRY[record.id] && Array.isArray(GATE_A2_SOURCE_GEOMETRY[record.id].bbox)
      ? gateA2BboxToSceneBbox(GATE_A2_SOURCE_GEOMETRY[record.id].bbox)
      : null,
    sourceId: record.id,
    sourceCategory: record.cat,
    sourceSubtype: GATE_A2_SOURCE_GEOMETRY[record.id] && GATE_A2_SOURCE_GEOMETRY[record.id].sub || null,
    sourceRegionId: gateA2RegionToSceneRegion(record.region),
    disposition: "ignored_uncertain",
    promoted: false,
    reason: "uncertain_symbol_remains_unpromoted",
    mapping_state: "not_accepted"
  }));
  const counts = rows.concat(uncertainRows).reduce((result, row) => {
    result[row.disposition] = (result[row.disposition] || 0) + 1;
    return result;
  }, {});
  return {
    schema: "laibe.planPuzzle.gateB.r4a.semanticCategoryLedger.v1",
    clearRecordCount: rows.length,
    uncertainRecordCount: uncertainRows.length,
    exactClearRecordCount: rows.length === 15,
    exactUncertainRecordCount: uncertainRows.length === 4,
    acceptedMappingCount: 0,
    candidatePresentCount: rows.filter((row) => row.disposition === "candidate_present_unaccepted").length,
    missingWithExactReasonCount: rows.filter((row) => row.disposition === "missing_with_exact_reason").length,
    uncertainPromotedCount: uncertainRows.filter((row) => row.promoted).length,
    counts,
    clearRecords: rows,
    uncertainRecords: uncertainRows,
    pass: rows.length === 15 && uncertainRows.length === 4 && rows.every((row) => ["candidate_present_unaccepted", "missing_with_exact_reason"].includes(row.disposition)) && uncertainRows.every((row) => row.disposition === "ignored_uncertain" && row.promoted === false)
  };
}

function r4aSemanticFingerprint(scene) {
  return collectSemanticSceneObjects(scene).map((item) => ({
    sourceId: item && item.source_object_id || null,
    category: item && item.category || null,
    subtype: item && item.subtype || null,
    region: item && item.sourceRegionId || null,
    bbox: item && item.sourceBBox || item && item.bbox || null,
    evidence: item && item.evidence || null
  })).filter((row) => row.sourceId).sort((a, b) => a.sourceId.localeCompare(b.sourceId));
}

function r4aExistingRegressionFingerprint(scene) {
  return ["structuralWalls", "columns", "dimensionLines"].reduce((result, key) => {
    result[key] = (Array.isArray(scene && scene[key]) ? scene[key] : []).map((item) => ({
      id: item && item.source_object_id || null,
      sourceRegionId: item && item.sourceRegionId || null,
      p1: item && item.p1 || null,
      p2: item && item.p2 || null,
      bbox: item && (item.sourceBBox || item.bbox) || null
    })).sort((a, b) => String(a.id).localeCompare(String(b.id)));
    return result;
  }, {});
}

async function auditR4AGenericity() {
  const readText = async (relativeUrl) => {
    const response = await fetch(new URL(relativeUrl, location.href).href, { cache: "no-store" });
    if (!response.ok) throw new Error("Unable to audit " + relativeUrl + ".");
    return response.text();
  };
  const forbidden = ["_qa_evidence", "gate_a2", "r3_3", EXPECTED_SOURCE_SHA256.toLowerCase()];
  const files = ["./pdf-plan-vector-extractor.js", "./pdf-plan-objectization-adapter.js"];
  const scans = {};
  for (const relativeUrl of files) {
    const text = (await readText(relativeUrl)).toLowerCase();
    scans[relativeUrl] = { forbiddenMatches: forbidden.filter((token) => text.includes(token)), candidateLogicPresent: /openingcandidates|staircandidates|spaceboundarycandidates|vector-operator-list-geometry-relations/i.test(text) };
  }
  return {
    schema: "laibe.planPuzzle.gateB.r4a.genericityAudit.v1",
    files: scans,
    noEvidenceOrSourceSpecificIdentifiers: Object.values(scans).every((scan) => scan.forbiddenMatches.length === 0),
    candidateLogicPresent: Object.values(scans).every((scan) => scan.candidateLogicPresent)
  };
}

function r4aDualStability(first, second) {
  const firstSemantic = r4aSemanticFingerprint(first.scene);
  const secondSemantic = r4aSemanticFingerprint(second.scene);
  const firstExisting = r4aExistingRegressionFingerprint(first.scene);
  const secondExisting = r4aExistingRegressionFingerprint(second.scene);
  const checks = {
    sourceByteLengthStable: first.source.byteLength === second.source.byteLength,
    sourceShaStable: first.source.sha256 === second.source.sha256 && first.source.sha256 === EXPECTED_SOURCE_SHA256,
    pdfjsStable: stableStringify(first.pdfjs) === stableStringify(second.pdfjs),
    extractorStable: stableStringify({ version: first.extractor.version, api: first.extractor.api, file: first.extractor.file, raw: first.extractor.canonicalRawHash }) === stableStringify({ version: second.extractor.version, api: second.extractor.api, file: second.extractor.file, raw: second.extractor.canonicalRawHash }),
    adapterStable: stableStringify({ version: first.adapter.version, file: first.adapter.file }) === stableStringify({ version: second.adapter.version, file: second.adapter.file }),
    profileStable: first.regions.sourceProfileHash === second.regions.sourceProfileHash,
    sceneStable: first.adapter.derivedSceneHash === second.adapter.derivedSceneHash,
    semanticCategoryCountsStable: stableStringify(first.semanticCategoryCounts) === stableStringify(second.semanticCategoryCounts),
    semanticIdsAndGeometryStable: stableStringify(firstSemantic) === stableStringify(secondSemantic),
    existingRegressionStable: stableStringify(firstExisting) === stableStringify(secondExisting),
    existingWallCount: first.scene.structuralWalls.length === 224 && second.scene.structuralWalls.length === 224,
    existingColumnCount: first.scene.columns.length === 16 && second.scene.columns.length === 16,
    existingDimensionCount: first.scene.dimensionLines.length === 4 && second.scene.dimensionLines.length === 4,
    noUnstableSemanticIds: firstSemantic.concat(secondSemantic).every((row) => !/date|random|session|tab|run/i.test(row.sourceId)),
    noProjectMutation: first.projectMutation.changed === false && second.projectMutation.changed === false
  };
  return { schema: "laibe.planPuzzle.gateB.r4a.dualExactSourceSemanticStability.v1", checks, failedChecks: Object.keys(checks).filter((key) => checks[key] !== true), run1: { qaRunId: first.qaRunId, source: first.source, pdfjs: first.pdfjs, extractor: first.extractor, adapter: first.adapter, profileHash: first.regions.sourceProfileHash, semanticCategoryCounts: first.semanticCategoryCounts, semanticFingerprint: firstSemantic }, run2: { qaRunId: second.qaRunId, source: second.source, pdfjs: second.pdfjs, extractor: second.extractor, adapter: second.adapter, profileHash: second.regions.sourceProfileHash, semanticCategoryCounts: second.semanticCategoryCounts, semanticFingerprint: secondSemantic }, pass: Object.keys(checks).every((key) => checks[key] === true) };
}

async function runGateBR4ASemanticCategoryReceipt() {
  if (!hasGateBR4ASemanticCategoryRoute()) return;
  const node = createGateBR4AReceiptNode();
  const source = new URLSearchParams(location.search).get("laibePdfGateBR4ASource") || DEFAULT_QA_SOURCE;
  try {
    const first = await extractFromUrl(source, { qaRunId: "gate-b-r4a-semantic-run-1-designated", expectedSha256: EXPECTED_SOURCE_SHA256, mirror: false });
    const second = await extractFromUrl(source, { qaRunId: "gate-b-r4a-semantic-run-2-read-only", expectedSha256: EXPECTED_SOURCE_SHA256, mirror: false });
    const dualStability = r4aDualStability(first, second);
    const semanticLedger = r4aSemanticLedgerForScene(first.scene);
    const fixtures = createR4ASemanticDetectorFixtures();
    const negativeFixtures = fixtures.filter((fixture) => !fixture.id.startsWith("positive-"));
    const positiveFixtures = fixtures.filter((fixture) => fixture.id.startsWith("positive-"));
    const fixturePass = fixtures.every((fixture) => fixture.pass === true);
    const genericityAudit = await auditR4AGenericity();
    const projectMutation = first.projectMutation.changed === false && second.projectMutation.changed === false;
    const policy = first.scene.pdfObjectPolicy || {};
    const policyPass = Number(policy.pdf_derived_new_object_count || 0) === 0 && Number(policy.automatic_budget_candidate_count || 0) === 0 && Number(policy.automatic_dbspec_projection_count || 0) === 0 && first.scene.page.acceptedTransformId === null && first.scene.page.acceptedTransformStatus === "not-established";
    const mandatoryCategoryBlockers = semanticLedger.clearRecords.filter((row) => row.disposition === "missing_with_exact_reason").map((row) => ({ sourceId: row.sourceId, reason: row.reason }));
    const checks = {
      dualStability: dualStability.pass === true,
      exactClearLedger: semanticLedger.exactClearRecordCount === true,
      exactUncertainLedger: semanticLedger.exactUncertainRecordCount === true,
      acceptedMappingsZero: semanticLedger.acceptedMappingCount === 0,
      uncertainPromotionsZero: semanticLedger.uncertainPromotedCount === 0,
      detectorFixtures: fixturePass,
      genericity: genericityAudit.noEvidenceOrSourceSpecificIdentifiers === true && genericityAudit.candidateLogicPresent === true,
      existingRegression: dualStability.checks.existingWallCount && dualStability.checks.existingColumnCount && dualStability.checks.existingDimensionCount && dualStability.checks.existingRegressionStable,
      policyGuards: policyPass,
      projectMutationFalse: projectMutation,
      projectMutationPreserved: first.projectMutation.preserved === true && second.projectMutation.preserved === true && first.projectMutation.changed === false && second.projectMutation.changed === false,
      noImporter: first.r1Boundary.laibePlanImportPdfObjectizationSceneInvoked === false && second.r1Boundary.laibePlanImportPdfObjectizationSceneInvoked === false
    };
    const receipt = {
      schema: GATE_B_R4A_RECEIPT_SCHEMA,
      status: Object.values(checks).every(Boolean) && mandatoryCategoryBlockers.length === 0 ? "ok" : "partial_with_exact_blocker",
      trigger: "localhost-gate-b-r4a-semantic-category-query",
      runtimeVersion: RUNTIME_VERSION,
      source: first.source,
      dualStability,
      existingRegression: { structuralWalls: first.scene.structuralWalls.length, columns: first.scene.columns.length, dimensions: first.scene.dimensionLines.length, exactSortedExistingIdsStable: dualStability.checks.existingRegressionStable },
      semanticCategoryCounts: first.semanticCategoryCounts,
      semanticCandidateSummary: {
        openings: first.scene.openingCandidates.map((candidate) => ({ sourceId: candidate.sourceId, extractorId: candidate.sourceExtractorId, subtype: candidate.subtype, sourceRegionId: candidate.sourceRegionId, sourceBBox: candidate.sourceBBox })),
        stairs: first.scene.stairCandidates.map((candidate) => ({ sourceId: candidate.sourceId, extractorId: candidate.sourceExtractorId, subtype: candidate.subtype, sourceRegionId: candidate.sourceRegionId, sourceBBox: candidate.sourceBBox })),
        stairVoids: first.scene.stairVoidCandidates.map((candidate) => ({ sourceId: candidate.sourceId, extractorId: candidate.sourceExtractorId, subtype: candidate.subtype, sourceRegionId: candidate.sourceRegionId, sourceBBox: candidate.sourceBBox })),
        spaces: first.scene.spaceBoundaryCandidates.map((candidate) => ({ sourceId: candidate.sourceId, extractorId: candidate.sourceExtractorId, subtype: candidate.subtype, sourceRegionId: candidate.sourceRegionId, sourceBBox: candidate.sourceBBox }))
      },
      semanticDetection: first.extractor.semanticDetection || null,
      clearRecordLedger: semanticLedger,
      detectorFixtures: { schema: "laibe.planPuzzle.gateB.r4a.sharedDetectorFixtureSuite.v1", sharedPredicate: "LaibePdfPlanVectorExtractor.semanticDetectorPredicates", policyPredicate: "r4aSemanticCandidatePredicate", rows: fixtures, pass: fixturePass },
      genericityAudit,
      policy: { source_kind: "pdf", object_status: "existing", work_action: "none", budget_trigger: "none", dbspec_projection: "excluded", pdf_derived_new_object_count: 0, automatic_budget_candidate_count: 0, automatic_dbspec_projection_count: 0, acceptedTransformId: null, acceptedTransformStatus: "not-established" },
      projectMutation: { run1: first.projectMutation, run2: second.projectMutation, changed: first.projectMutation.changed || second.projectMutation.changed, preserved: first.projectMutation.preserved && second.projectMutation.preserved },
      checks,
      mandatoryCategoryBlockers,
      noClaims: { gateA2MappingAcceptance: false, gateBAcceptance: false, geometryFidelityAcceptance: false, stage3Acceptance: false, budgetOrDbspecProjection: false, productionAcceptance: false, parentCompletion: false },
      capturedAt: nowIso()
    };
    writeGateBR4AReceipt(node, receipt);
    window.__laibePdfGateBR4ASemanticCategoryReceipt = receipt;
  } catch (error) {
    writeGateBR4AReceipt(node, { schema: GATE_B_R4A_RECEIPT_SCHEMA, status: "error", trigger: "localhost-gate-b-r4a-semantic-category-query", runtimeVersion: RUNTIME_VERSION, error: sanitizeGateBR3Error(error), capturedAt: nowIso() });
  }
}

function createGateBR4A1ReceiptNode() {
  let node = document.getElementById(GATE_B_R4A1_RECEIPT_NODE_ID);
  if (node) return node;
  node = document.createElement("script");
  node.id = GATE_B_R4A1_RECEIPT_NODE_ID;
  node.type = "application/json";
  node.hidden = true;
  node.dataset.status = "pending";
  node.textContent = JSON.stringify({
    schema: GATE_B_R4A1_RECEIPT_SCHEMA,
    status: "pending",
    trigger: "localhost-gate-b-r4a-1-semantic-integrity-query"
  });
  document.documentElement.appendChild(node);
  return node;
}

async function runGateBR4A1SemanticIntegrityReceipt() {
  if (!hasGateBR4A1SemanticIntegrityRoute()) return;
  const node = createGateBR4A1ReceiptNode();
  const source = new URLSearchParams(location.search).get("laibePdfGateBR4ASource") || DEFAULT_QA_SOURCE;
  try {
    const first = await extractFromUrl(source, { qaRunId: "gate-b-r4a-1-semantic-run-1-designated", expectedSha256: EXPECTED_SOURCE_SHA256, mirror: false });
    const second = await extractFromUrl(source, { qaRunId: "gate-b-r4a-1-semantic-run-2-read-only", expectedSha256: EXPECTED_SOURCE_SHA256, mirror: false });
    const dualStability = r4aDualStability(first, second);
    const semanticLedger = r4aSemanticLedgerForScene(first.scene);
    const fixtures = createR4ASemanticDetectorFixtures();
    const fixturePass = fixtures.every((fixture) => fixture.pass === true);
    const genericityAudit = await auditR4AGenericity();
    const aggregateChanged = first.projectMutation.changed || second.projectMutation.changed;
    const aggregatePreserved = first.projectMutation.preserved === true && second.projectMutation.preserved === true && aggregateChanged === false;
    const projectMutation = {
      run1: first.projectMutation,
      run2: second.projectMutation,
      changed: aggregateChanged,
      preserved: aggregatePreserved
    };
    const mutationPredicate = evaluateR4A1ProjectMutationReceipt({ projectMutation });
    const mutationNegativeGuards = createR4A1ProjectMutationNegativeGuards({ projectMutation });
    const policy = first.scene.pdfObjectPolicy || {};
    const policyPass = Number(policy.pdf_derived_new_object_count || 0) === 0 &&
      Number(policy.automatic_budget_candidate_count || 0) === 0 &&
      Number(policy.automatic_dbspec_projection_count || 0) === 0 &&
      first.scene.page.acceptedTransformId === null &&
      first.scene.page.acceptedTransformStatus === "not-established";
    const mandatoryCategoryBlockers = semanticLedger.clearRecords
      .filter((row) => row.disposition === "missing_with_exact_reason")
      .map((row) => ({ sourceId: row.sourceId, sourceSubtype: row.sourceSubtype, candidateArray: row.candidateArray, reason: row.reason }));
    const checks = {
      dualStability: dualStability.pass === true,
      exactClearLedger: semanticLedger.exactClearRecordCount === true,
      exactUncertainLedger: semanticLedger.exactUncertainRecordCount === true,
      acceptedMappingsZero: semanticLedger.acceptedMappingCount === 0,
      uncertainPromotionsZero: semanticLedger.uncertainPromotedCount === 0,
      detectorFixtures: fixturePass,
      genericity: genericityAudit.noEvidenceOrSourceSpecificIdentifiers === true && genericityAudit.candidateLogicPresent === true,
      existingRegression: dualStability.checks.existingWallCount && dualStability.checks.existingColumnCount && dualStability.checks.existingDimensionCount && dualStability.checks.existingRegressionStable,
      policyGuards: policyPass,
      projectMutationFalse: first.projectMutation.changed === false && second.projectMutation.changed === false && projectMutation.changed === false,
      projectMutationPreserved: projectMutation.preserved === true && mutationPredicate.rules.beforeAfterEqual === true,
      projectMutationNegativeGuards: mutationNegativeGuards.allGuardsPass === true,
      noImporter: first.r1Boundary.laibePlanImportPdfObjectizationSceneInvoked === false && second.r1Boundary.laibePlanImportPdfObjectizationSceneInvoked === false
    };
    const receipt = {
      schema: GATE_B_R4A1_RECEIPT_SCHEMA,
      status: Object.values(checks).every(Boolean) && mandatoryCategoryBlockers.length === 0 ? "ok" : "partial_with_exact_blocker",
      trigger: "localhost-gate-b-r4a-1-semantic-integrity-query",
      runtimeVersion: RUNTIME_VERSION,
      source: first.source,
      dualStability,
      existingRegression: {
        structuralWalls: first.scene.structuralWalls.length,
        columns: first.scene.columns.length,
        dimensions: first.scene.dimensionLines.length,
        exactSortedExistingIdsStable: dualStability.checks.existingRegressionStable
      },
      semanticCategoryCounts: first.semanticCategoryCounts,
      semanticDetection: first.extractor.semanticDetection || null,
      clearRecordLedger: semanticLedger,
      detectorFixtures: {
        schema: "laibe.planPuzzle.gateB.r4a_1.productionDetectorFixtureSuite.v1",
        productionPredicateSource: "LaibePdfPlanVectorExtractor.semanticDetectorPredicates",
        policyPredicate: "r4aSemanticCandidatePredicate",
        rows: fixtures,
        pass: fixturePass
      },
      genericityAudit,
      policy: {
        source_kind: "pdf",
        object_status: "existing",
        work_action: "none",
        budget_trigger: "none",
        dbspec_projection: "excluded",
        pdf_derived_new_object_count: 0,
        automatic_budget_candidate_count: 0,
        automatic_dbspec_projection_count: 0,
        acceptedTransformId: null,
        acceptedTransformStatus: "not-established"
      },
      projectMutation,
      projectMutationPredicate: mutationPredicate,
      projectMutationNegativeGuards: mutationNegativeGuards,
      checks,
      mandatoryCategoryBlockers,
      finalCompletenessAttempt: {
        exactClearRecordCount: 15,
        exactUncertainRecordCount: 4,
        acceptedMappingCount: 0,
        stairVoidRows: semanticLedger.clearRecords.filter((row) => row.sourceSubtype === "vertical_stair_void").map((row) => ({ sourceId: row.sourceId, candidateArray: row.candidateArray, expectedSubtype: row.expectedSubtype, disposition: row.disposition, reason: row.reason })),
        status: mandatoryCategoryBlockers.length === 0 ? "all_clear_records_candidate_or_reviewed" : "missing_categories_remain_truthfully_unmapped"
      },
      noClaims: {
        gateA2MappingAcceptance: false,
        gateBAcceptance: false,
        geometryFidelityAcceptance: false,
        stage3Acceptance: false,
        budgetOrDbspecProjection: false,
        productionAcceptance: false,
        parentCompletion: false
      },
      capturedAt: nowIso()
    };
    writeGateBR4AReceipt(node, receipt);
    window.__laibePdfGateBR4A1SemanticIntegrityReceipt = receipt;
  } catch (error) {
    writeGateBR4AReceipt(node, {
      schema: GATE_B_R4A1_RECEIPT_SCHEMA,
      status: "error",
      trigger: "localhost-gate-b-r4a-1-semantic-integrity-query",
      runtimeVersion: RUNTIME_VERSION,
      error: sanitizeGateBR3Error(error),
      capturedAt: nowIso()
    });
  }
}

window.LaibePdfPlanExactSource = Object.freeze({
  VERSION: RUNTIME_VERSION,
  presentSelectedPdfFile,
  recognizeSelectedPdfFile,
  importSelectedPdfFile
});

if (isLocalhost() && hasExactSourceQaRoute()) {
  window.LaibePdfPlanExactSourceQa = Object.freeze({
    VERSION: RUNTIME_VERSION,
  extractFromUrl,
  extractFromArrayBuffer,
  extractFromSelectedFile,
  selectRecognitionRegion,
  approveRecognitionManifest,
  createRecognitionOverlaySvg,
  consumeRecognitionImportAuthorization,
  runLocalhostQa,
  exportLocalhostQaCanvasPngs
  });
  window.__laibePdfExactSourceQaPromise = runLocalhostQa().catch((error) => {
    const payload = {
      schema: "laibe.planPuzzle.exactSourceQaDualRun.v1",
      status: "error",
      error: error && error.message ? error.message : String(error),
      capturedAt: nowIso()
    };
    mirrorQaJson(payload);
    throw error;
  });
  runLocalhostQaCanvasExportReceipt(window.__laibePdfExactSourceQaPromise);
}

runGateBR3ImportReceipt();
runGateBR31PolicyLedgerReceipt();
runGateBR4ASemanticCategoryReceipt();
runGateBR4A1SemanticIntegrityReceipt();
installR4B1ReviewRoute();
