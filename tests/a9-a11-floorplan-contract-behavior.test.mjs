import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const testDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(testDir, "..");
const paths = {
  bundle: "tools/a11_recognition/floor_plan_recognition_bundle_v1.mjs",
  gate: "tools/a11_recognition/floor_plan_recognition_gate_v1.mjs",
  consumer: "site/preview_floor_plan/a11-floor-plan-bundle-consumer.mjs",
  snapshot: "site/preview_floor_plan/plan-puzzle-snapshot-v1.mjs",
};

function filePath(relativePath) {
  return path.join(rootDir, relativePath);
}

function moduleUrl(relativePath) {
  const fullPath = filePath(relativePath);
  assert.equal(fs.existsSync(fullPath), true, "missing " + relativePath);
  return pathToFileURL(fullPath).href;
}

async function loadA11Modules() {
  const [bundle, gate] = await Promise.all([
    import(moduleUrl(paths.bundle)),
    import(moduleUrl(paths.gate)),
  ]);
  return { bundle, gate };
}

async function loadConsumerModule() {
  return import(moduleUrl(paths.consumer));
}

async function loadSnapshotModule() {
  return import(moduleUrl(paths.snapshot));
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function expectCode(code, action) {
  try {
    action();
  } catch (error) {
    assert.equal(error?.code, code, "unexpected contract error: " + error?.message);
    return;
  }
  assert.fail("expected contract error " + code);
}

const sha = "a".repeat(64);
const otherSha = "b".repeat(64);

function validSourceFrame() {
  return {
    mediaBox: [0, 0, 200, 100],
    cropBox: [0, 0, 200, 100],
    userUnit: 1,
    rotationDegrees: 90,
    sourceBounds: [0, 0, 200, 100],
    displayBounds: [0, 0, 100, 200],
    sourceToDisplayTransform: [0, 1, -1, 0, 100, 0],
    displayToSourceTransform: [0, -1, 1, 0, 0, 100],
    roundTripTolerance: 0.001,
  };
}

function validBundleInput(overrides = {}) {
  return {
    packetId: "bundle-001",
    schemaName: "laibe.floor-plan-recognition-bundle.v1",
    schemaVersion: 1,
    caseId: "case-001",
    sourceDocumentId: "document-001",
    sourceDocumentVersionId: "document-001-v1",
    sourceDocumentSha256: sha,
    pageNumber: 1,
    sourceFrame: validSourceFrame(),
    producerRole: "A11_RECOGNIZER",
    producerVersion: "a11.1.0",
    algorithmVersion: "algorithm.1",
    modelVersion: "model.1",
    ruleVersion: "rule.1",
    upstreamPacketIds: ["release-packet-001"],
    evidenceReferences: ["evidence-001"],
    evidenceRegions: [{
      evidenceId: "evidence-001",
      bounds: [1, 2, 90, 80],
      evidenceHash: "d".repeat(64),
    }],
    uncertainty: [],
    validationRoleBindings: { technicalGateWriter: "A11_VALIDATOR" },
    objects: [
      {
        objectId: "w1",
        classToken: "wall",
        wallThicknessPt: 10,
        sourceGeometry: {
          kind: "polygon",
          points: [[0, 0], [100, 0], [100, 10], [0, 10]],
        },
        confidence: 0.9,
        disposition: "native_object_candidate",
        evidenceRegionIds: ["evidence-001"],
      },
      {
        objectId: "d1",
        classToken: "door",
        sourceGeometry: { kind: "segment", points: [[20, 0], [40, 0]] },
        confidence: 0.8,
        disposition: "native_object_candidate",
        evidenceRegionIds: ["evidence-001"],
      },
    ],
    relations: [{
      relationId: "r1",
      relationType: "opening_hosted_by_wall",
      sourceObjectId: "d1",
      targetObjectId: "w1",
      status: "confirmed",
      confidence: 0.9,
      evidenceRegionIds: ["evidence-001"],
    }],
    scaleEvidence: [{ evidenceId: "evidence-001", confidence: 0.8 }],
    manifestHash: "c".repeat(64),
    releaseReceiptId: "release-001",
    supersedesPacketIds: [],
    createdAt: "2026-07-31T00:00:00.000Z",
    recordedAt: "2026-07-31T00:00:01.000Z",
    processingStatus: "candidate_ready",
    warnings: [],
    humanReviewRequired: true,
    ...overrides,
  };
}

function bundleInputWithLockedReferences(overrides = {}) {
  const input = validBundleInput(overrides);
  input.objects.push(
    {
      objectId: "dimension-1",
      classToken: "dimension",
      sourceGeometry: { kind: "segment", points: [[10, 30], [70, 30]] },
      confidence: 0.88,
      disposition: "retained_locked_reference",
      evidenceRegionIds: ["evidence-001"],
    },
    {
      objectId: "text-1",
      classToken: "necessary_text",
      sourceGeometry: { kind: "point", points: [[50, 40]] },
      confidence: 0.86,
      disposition: "retained_locked_reference",
      evidenceRegionIds: ["evidence-001"],
    },
  );
  return input;
}

function unsignedValidatorEvidence(overrides = {}) {
  return {
    validatorVersion: "a11-validator.1.0",
    validationRunId: "validation-run-001",
    bundleSchemaValidated: true,
    sourceIdentityValidated: true,
    sourceFrameValidated: true,
    evidenceBindingsValidated: true,
    relationsValidated: true,
    uncertaintyDispositionValidated: true,
    releaseBindingsValidated: true,
    ...overrides,
  };
}

function validatorEvidence(gate, overrides = {}) {
  const unsigned = unsignedValidatorEvidence(overrides);
  return {
    ...unsigned,
    evidenceHash: gate.hashA11ValidatorEvidence(unsigned),
  };
}

function createGate(gate, bundleApi, bundle, options = {}) {
  const bundleHash = bundleApi.hashFloorPlanRecognitionBundle(bundle);
  const gateReceipt = gate.createA11RecognitionGateReceipt({
    receiptId: options.receiptId || "gate-001",
    bundle,
    bundleHash,
    policyVersion: options.policyVersion || "policy.1",
    validatorEvidence: validatorEvidence(gate, options.evidenceOverrides),
    recordedAt: options.recordedAt || "2026-07-31T00:00:02.000Z",
  });
  return { bundleHash, gateReceipt };
}

function scaleConfirmation() {
  return {
    actorId: "owner-001",
    confirmedAt: "2026-07-31T00:00:03.000Z",
    method: "manual_user_confirmation",
    scale: 0.01,
    status: "confirmed",
  };
}

function acceptedBinding(bundle, bundleHash, gateReceipt, overrides = {}) {
  return {
    bundle,
    bundleHash,
    gateReceipt,
    caseId: bundle.caseId,
    sourceDocumentId: bundle.sourceDocumentId,
    sourceDocumentVersionId: bundle.sourceDocumentVersionId,
    sourceDocumentSha256: bundle.sourceDocumentSha256,
    pageNumber: bundle.pageNumber,
    modelVersion: bundle.modelVersion,
    ruleVersion: bundle.ruleVersion,
    userScaleConfirmation: scaleConfirmation(),
    ...overrides,
  };
}

function snapshotInput(binding, nativePlan, overrides = {}) {
  return {
    acceptedBinding: binding,
    converterVersion: "converter.1",
    createdAt: "2026-07-31T00:00:03.000Z",
    nativePlan,
    packetId: "snapshot-001",
    persistence: { status: "candidate", version: 1 },
    producerVersion: "a9.1.0",
    recordedAt: "2026-07-31T00:00:04.000Z",
    supersedesPacketIds: [],
    topology: {
      closureStatus: "closed",
      roomLoops: [],
      unresolvedTopologyIssueIds: [],
    },
    ...overrides,
  };
}

test("bundle creator owns facts hash and closed schemas reject unknown or tampered facts", async () => {
  const { bundle } = await loadA11Modules();
  const input = validBundleInput();
  assert.equal(Object.hasOwn(input, "bundleFactsHash"), false);

  const created = bundle.createFloorPlanRecognitionBundle(input);
  assert.match(created.bundleFactsHash, /^[0-9a-f]{64}$/);
  assert.equal(
    created.bundleFactsHash,
    bundle.computeFloorPlanBundleFactsHash(created),
  );
  assert.deepEqual(bundle.validateFloorPlanRecognitionBundle(created), created);
  assert.equal(
    bundle.hashFloorPlanRecognitionBundle(created),
    bundle.hashFloorPlanRecognitionBundle(bundle.canonicalizeFloorPlanBundle(created)),
  );

  expectCode("BUNDLE_FACTS_HASH_CALLER_FORBIDDEN", () =>
    bundle.createFloorPlanRecognitionBundle({
      ...validBundleInput(),
      bundleFactsHash: "f".repeat(64),
    }),
  );
  const tampered = clone(created);
  tampered.warnings.push("tampered");
  expectCode("BUNDLE_FACTS_HASH_MISMATCH", () =>
    bundle.validateFloorPlanRecognitionBundle(tampered),
  );
  expectCode("SCHEMA_UNKNOWN_FIELD", () =>
    bundle.createFloorPlanRecognitionBundle(validBundleInput({ unknownField: true })),
  );
  const nestedUnknown = validBundleInput();
  nestedUnknown.objects[0].unknownField = true;
  expectCode("SCHEMA_UNKNOWN_FIELD", () =>
    bundle.createFloorPlanRecognitionBundle(nestedUnknown),
  );
  expectCode("SOURCE_SHA256_INVALID", () =>
    bundle.createFloorPlanRecognitionBundle(
      validBundleInput({ sourceDocumentSha256: "A".repeat(64) }),
    ),
  );
  expectCode("TIMESTAMP_INVALID", () =>
    bundle.createFloorPlanRecognitionBundle(
      validBundleInput({ createdAt: "2026-02-30T00:00:00.000Z" }),
    ),
  );
});

test("CropBox and exact 90-degree matrices round trip without fixed page fallback", async () => {
  const { bundle } = await loadA11Modules();
  const frame = validSourceFrame();
  assert.deepEqual(frame.sourceToDisplayTransform, [0, 1, -1, 0, 100, 0]);
  assert.deepEqual(frame.displayToSourceTransform, [0, -1, 1, 0, 0, 100]);
  bundle.createFloorPlanRecognitionBundle(validBundleInput());

  const cropOutside = validSourceFrame();
  cropOutside.cropBox = [-1, 0, 200, 100];
  cropOutside.sourceBounds = [-1, 0, 200, 100];
  expectCode("SOURCE_FRAME_CROP_OUTSIDE_MEDIA_BOX", () =>
    bundle.createFloorPlanRecognitionBundle(validBundleInput({ sourceFrame: cropOutside })),
  );

  const wrongInverse = validSourceFrame();
  wrongInverse.displayToSourceTransform = [0, -1, 1, 0, 0, 99];
  expectCode("SOURCE_FRAME_ROUND_TRIP_INVALID", () =>
    bundle.createFloorPlanRecognitionBundle(validBundleInput({ sourceFrame: wrongInverse })),
  );

  const wrongExtent = validSourceFrame();
  wrongExtent.displayBounds = [0, 0, 101, 200];
  expectCode("SOURCE_FRAME_DISPLAY_BOUNDS_MISMATCH", () =>
    bundle.createFloorPlanRecognitionBundle(validBundleInput({ sourceFrame: wrongExtent })),
  );

  const fixedFallback = validSourceFrame();
  fixedFallback.defaultPageSize = [842, 1191];
  expectCode("SCHEMA_UNKNOWN_FIELD", () =>
    bundle.createFloorPlanRecognitionBundle(validBundleInput({ sourceFrame: fixedFallback })),
  );
  assert.doesNotMatch(JSON.stringify(frame), /\b842\b|\b1191\b/);
});

test("gate decision is derived from complete validator checks and exactly bound", async () => {
  const { bundle, gate } = await loadA11Modules();
  const created = bundle.createFloorPlanRecognitionBundle(validBundleInput());
  const bundleHash = bundle.hashFloorPlanRecognitionBundle(created);
  const evidence = validatorEvidence(gate);
  const input = {
    receiptId: "gate-001",
    bundle: created,
    bundleHash,
    policyVersion: "policy.1",
    validatorEvidence: evidence,
    recordedAt: "2026-07-31T00:00:02.000Z",
  };
  const receipt = gate.createA11RecognitionGateReceipt(input);

  assert.equal(receipt.result, "passed");
  assert.deepEqual(receipt.reasonCodes, []);
  assert.equal(receipt.bundleId, created.packetId);
  assert.equal(receipt.sourceDocumentVersionId, created.sourceDocumentVersionId);
  assert.equal(receipt.trustState, "technical_candidate_only");
  assert.deepEqual(
    gate.validateA11RecognitionGateReceipt(receipt, {
      bundle: created,
      policyVersion: "policy.1",
    }),
    receipt,
  );

  const failedReceipt = gate.createA11RecognitionGateReceipt({
    ...input,
    receiptId: "gate-failed",
    validatorEvidence: validatorEvidence(gate, {
      sourceFrameValidated: false,
      relationsValidated: false,
    }),
  });
  assert.equal(failedReceipt.result, "failed");
  assert.deepEqual(failedReceipt.reasonCodes, [
    "SOURCE_FRAME_VALIDATION_FAILED",
    "RELATIONS_VALIDATION_FAILED",
  ]);

  expectCode("SCHEMA_UNKNOWN_FIELD", () =>
    gate.createA11RecognitionGateReceipt({ ...input, result: "passed" }),
  );
  expectCode("BUNDLE_HASH_MISMATCH", () =>
    gate.validateA11RecognitionGateInput({ ...input, bundleHash: "f".repeat(64) }),
  );
  expectCode("GATE_POLICY_MISMATCH", () =>
    gate.validateA11RecognitionGateReceipt(receipt, { policyVersion: "policy.2" }),
  );
  expectCode("SOURCE_DOCUMENT_HASH_MISMATCH", () =>
    gate.validateA11RecognitionGateReceipt(receipt, {
      bundle: created,
      sourceDocumentSha256: otherSha,
    }),
  );
  expectCode("GATE_RECORDED_AT_PRECEDES_BUNDLE", () =>
    gate.createA11RecognitionGateReceipt({
      ...input,
      recordedAt: "2026-07-30T23:59:59.999Z",
    }),
  );
  expectCode("GATE_RESULT_EVIDENCE_MISMATCH", () =>
    gate.validateA11RecognitionGateReceipt({ ...failedReceipt, result: "passed" }),
  );
  const incompleteEvidence = unsignedValidatorEvidence();
  delete incompleteEvidence.releaseBindingsValidated;
  expectCode("VALIDATOR_EVIDENCE_INVALID", () =>
    gate.hashA11ValidatorEvidence(incompleteEvidence),
  );
});

test("A9 binding fails closed for missing, mismatch, failed gate, stale, and superseded inputs", async () => {
  const { bundle, gate } = await loadA11Modules();
  const consumer = await loadConsumerModule();
  const created = bundle.createFloorPlanRecognitionBundle(validBundleInput());
  const { bundleHash, gateReceipt } = createGate(gate, bundle, created);
  const binding = acceptedBinding(created, bundleHash, gateReceipt);
  assert.deepEqual(consumer.validateA11BundleBinding(binding), binding);

  const missing = { ...binding };
  delete missing.sourceDocumentId;
  expectCode("SOURCE_DOCUMENT_ID_REQUIRED", () =>
    consumer.validateA11BundleBinding(missing),
  );
  const missingGate = { ...binding };
  delete missingGate.gateReceipt;
  expectCode("GATE_RECEIPT_REQUIRED", () =>
    consumer.validateA11BundleBinding(missingGate),
  );
  expectCode("BUNDLE_HASH_MISMATCH", () =>
    consumer.validateA11BundleBinding({ ...binding, bundleHash: "f".repeat(64) }),
  );
  expectCode("CASE_ID_MISMATCH", () =>
    consumer.validateA11BundleBinding({ ...binding, caseId: "case-other" }),
  );
  for (const [field, value, code] of [
    ["sourceDocumentId", "document-other", "SOURCE_DOCUMENT_ID_MISMATCH"],
    ["sourceDocumentVersionId", "document-001-v2", "SOURCE_DOCUMENT_VERSION_ID_MISMATCH"],
    ["sourceDocumentSha256", otherSha, "SOURCE_DOCUMENT_HASH_MISMATCH"],
    ["pageNumber", 2, "PAGE_NUMBER_MISMATCH"],
  ]) {
    expectCode(code, () =>
      consumer.validateA11BundleBinding({ ...binding, [field]: value }),
    );
  }
  expectCode("MODEL_VERSION_MISMATCH", () =>
    consumer.validateA11BundleBinding({ ...binding, modelVersion: "model.2" }),
  );
  expectCode("RULE_VERSION_MISMATCH", () =>
    consumer.validateA11BundleBinding({ ...binding, ruleVersion: "rule.2" }),
  );

  const failedGate = createGate(gate, bundle, created, {
    receiptId: "gate-failed",
    evidenceOverrides: { releaseBindingsValidated: false },
  });
  expectCode("GATE_NOT_PASSED", () =>
    consumer.validateA11BundleBinding({
      ...binding,
      gateReceipt: failedGate.gateReceipt,
    }),
  );
  expectCode("SOURCE_VERSION_STALE", () =>
    consumer.validateA11BundleBinding({ ...binding, stale: true }),
  );
  expectCode("BUNDLE_SUPERSEDED", () =>
    consumer.validateA11BundleBinding({ ...binding, superseded: true }),
  );
});

test("presentation uses accepted source frame and transform helpers round trip exactly", async () => {
  const { bundle, gate } = await loadA11Modules();
  const consumer = await loadConsumerModule();
  const created = bundle.createFloorPlanRecognitionBundle(validBundleInput());
  const { bundleHash, gateReceipt } = createGate(gate, bundle, created);
  const binding = acceptedBinding(created, bundleHash, gateReceipt);
  const point = [20, 40];
  const display = consumer.transformSourcePointForDisplay(point, created.sourceFrame);
  assert.deepEqual(display, [60, 20]);
  assert.deepEqual(
    consumer.transformDisplayPointForSource(display, created.sourceFrame),
    point,
  );

  const presentation = consumer.createPdfPresentationBinding({
    acceptedBinding: binding,
    background: { kind: "pdf", objectUrl: "blob:source-pdf" },
  });
  assert.deepEqual(presentation.sourceFrame, created.sourceFrame);
  assert.equal(presentation.bundleHash, bundleHash);
  assert.equal(presentation.gateReceiptId, gateReceipt.receiptId);
  assert.doesNotMatch(JSON.stringify(presentation), /\b842\b|\b1191\b/);
  expectCode("INPUT_REQUIRED", () =>
    consumer.createPdfPresentationBinding({ background: { kind: "pdf" } }),
  );
});

test("scale confirmation is manual-only and requires actor, value, and timestamp", async () => {
  const consumer = await loadConsumerModule();
  const confirmed = consumer.recordUserScaleConfirmation({
    actorId: "owner-001",
    scale: 0.01,
    confirmedAt: "2026-07-31T00:00:03.000Z",
  });
  assert.deepEqual(confirmed, scaleConfirmation());

  expectCode("AUTOMATIC_SCALE_FORBIDDEN", () =>
    consumer.recordUserScaleConfirmation({
      actorId: "system",
      automatic: true,
      scale: 0.01,
      confirmedAt: "2026-07-31T00:00:03.000Z",
    }),
  );
  expectCode("SCALE_ACTOR_REQUIRED", () =>
    consumer.recordUserScaleConfirmation({
      scale: 0.01,
      confirmedAt: "2026-07-31T00:00:03.000Z",
    }),
  );
  expectCode("SCALE_CONFIRMED_AT_REQUIRED", () =>
    consumer.recordUserScaleConfirmation({ actorId: "owner-001", scale: 0.01 }),
  );
});

test("native conversion uses one confirmed host and retains dimension and necessary text locked", async () => {
  const { bundle, gate } = await loadA11Modules();
  const consumer = await loadConsumerModule();
  const input = bundleInputWithLockedReferences();
  input.relations.push({
    ...input.relations[0],
    relationId: "r-candidate",
    status: "candidate",
  });
  assert.deepEqual(input.relations[0].evidenceRegionIds, ["evidence-001"]);
  const created = bundle.createFloorPlanRecognitionBundle(input);
  const { bundleHash, gateReceipt } = createGate(gate, bundle, created);
  const nativePlan = consumer.convertAcceptedBundleToNativePlan(
    acceptedBinding(created, bundleHash, gateReceipt),
  );

  const door = nativePlan.objects.find((object) => object.objectId === "d1");
  assert.equal(door.hostWallId, "w1");
  assert.deepEqual(door.evidenceRegionIds, ["evidence-001"]);
  assert.equal(nativePlan.provenance.bundleHash, bundleHash);
  assert.equal(nativePlan.provenance.gateReceiptId, gateReceipt.receiptId);
  assert.equal(door.relationId, "r1");
  for (const objectId of ["dimension-1", "text-1"]) {
    const reference = nativePlan.objects.find((object) => object.objectId === objectId);
    assert.equal(reference.disposition, "retained_locked_reference");
    assert.equal(reference.locked, true);
    assert.equal(reference.editable, false);
    assert.deepEqual(reference.evidenceRegionIds, ["evidence-001"]);
  }

  const noConfirmedHost = validBundleInput({
    relations: [{
      ...validBundleInput().relations[0],
      status: "candidate",
    }],
  });
  expectCode("CONFIRMED_HOST_RELATION_REQUIRED", () =>
    bundle.createFloorPlanRecognitionBundle(noConfirmedHost),
  );
});

test("snapshot creator derives authority fields and rejects supplied native provenance tamper", async () => {
  const { bundle, gate } = await loadA11Modules();
  const consumer = await loadConsumerModule();
  const snapshot = await loadSnapshotModule();
  const bundleInput = bundleInputWithLockedReferences({
    uncertainty: [{
      uncertaintyId: "uncertainty-001",
      code: "TEXT_REVIEW",
      severity: "warning",
      disposition: "retained_locked_reference",
      objectId: "text-1",
      evidenceRegionIds: ["evidence-001"],
    }],
  });
  const createdBundle = bundle.createFloorPlanRecognitionBundle(bundleInput);
  const { bundleHash, gateReceipt } = createGate(gate, bundle, createdBundle);
  const binding = acceptedBinding(createdBundle, bundleHash, gateReceipt);
  const nativePlan = consumer.convertAcceptedBundleToNativePlan(binding);
  const createdSnapshot = snapshot.createPlanPuzzleSnapshot(
    snapshotInput(binding, nativePlan),
  );

  assert.equal(createdSnapshot.caseId, binding.caseId);
  assert.equal(createdSnapshot.sourceDocumentId, binding.sourceDocumentId);
  assert.equal(createdSnapshot.sourceDocumentVersionId, binding.sourceDocumentVersionId);
  assert.equal(createdSnapshot.sourceDocumentSha256, binding.sourceDocumentSha256);
  assert.equal(createdSnapshot.pageNumber, binding.pageNumber);
  assert.equal(createdSnapshot.bundleId, createdBundle.packetId);
  assert.equal(createdSnapshot.bundleHash, bundleHash);
  assert.equal(createdSnapshot.gateReceiptId, gateReceipt.receiptId);
  assert.equal(
    nativePlan.provenance.sourceDocumentVersionId,
    createdSnapshot.sourceDocumentVersionId,
  );
  assert.deepEqual(createdSnapshot.nativeObjects, nativePlan.objects);
  assert.deepEqual(createdSnapshot.uncertainty, createdBundle.uncertainty);
  assert.deepEqual(createdSnapshot.evidenceBacklinks, createdBundle.evidenceRegions);
  assert.ok(createdSnapshot.upstreamPacketIds.includes(createdBundle.packetId));
  assert.ok(createdSnapshot.upstreamPacketIds.includes(gateReceipt.receiptId));
  assert.deepEqual(snapshot.validatePlanPuzzleSnapshot(createdSnapshot), createdSnapshot);
  assert.equal(
    snapshot.hashPlanPuzzleSnapshot(createdSnapshot),
    snapshot.hashPlanPuzzleSnapshot(clone(createdSnapshot)),
  );

  expectCode("CREATOR_INPUT_INVALID", () =>
    snapshot.createPlanPuzzleSnapshot({
      ...snapshotInput(binding, nativePlan),
      bundleHash,
    }),
  );
  const tamperedNative = clone(nativePlan);
  tamperedNative.provenance.bundleHash = "f".repeat(64);
  expectCode("NATIVE_PLAN_PROVENANCE_MISMATCH", () =>
    snapshot.createPlanPuzzleSnapshot(snapshotInput(binding, tamperedNative)),
  );
});

test("snapshot validator rejects authority tamper, unknown, shallow topology, persistence, upstream, and time errors", async () => {
  const { bundle, gate } = await loadA11Modules();
  const consumer = await loadConsumerModule();
  const snapshot = await loadSnapshotModule();
  const createdBundle = bundle.createFloorPlanRecognitionBundle(
    bundleInputWithLockedReferences(),
  );
  const { bundleHash, gateReceipt } = createGate(gate, bundle, createdBundle);
  const binding = acceptedBinding(createdBundle, bundleHash, gateReceipt);
  const nativePlan = consumer.convertAcceptedBundleToNativePlan(binding);
  const value = snapshot.createPlanPuzzleSnapshot(snapshotInput(binding, nativePlan));

  expectCode("SNAPSHOT_STATUS_INVALID", () =>
    snapshot.validatePlanPuzzleSnapshot({
      ...value,
      a0IntegrationAcceptance: "accepted",
    }),
  );
  expectCode("SNAPSHOT_UNKNOWN_FIELD", () =>
    snapshot.validatePlanPuzzleSnapshot({ ...value, unknownField: true }),
  );
  expectCode("SNAPSHOT_OBJECT_REQUIRED", () =>
    snapshot.validatePlanPuzzleSnapshot({
      ...value,
      topology: { closureStatus: "closed" },
    }),
  );
  expectCode("SNAPSHOT_STATUS_INVALID", () =>
    snapshot.validatePlanPuzzleSnapshot({
      ...value,
      persistence: { status: "persisted", version: 1 },
    }),
  );
  expectCode("SNAPSHOT_UPSTREAM_INVALID", () =>
    snapshot.validatePlanPuzzleSnapshot({
      ...value,
      upstreamPacketIds: value.upstreamPacketIds.filter(
        (packetId) => packetId !== value.gateReceiptId,
      ),
    }),
  );
  expectCode("SNAPSHOT_TIMESTAMP_INVALID", () =>
    snapshot.validatePlanPuzzleSnapshot({
      ...value,
      recordedAt: "2026-07-31T00:00:02.000Z",
    }),
  );
  expectCode("SNAPSHOT_TIMESTAMP_INVALID", () =>
    snapshot.validatePlanPuzzleSnapshot({
      ...value,
      createdAt: "2026-02-30T00:00:00.000Z",
    }),
  );
});

test("A12 strings are absent from all A11 and A9 contract modules", () => {
  for (const relativePath of Object.values(paths)) {
    const fullPath = filePath(relativePath);
    assert.equal(fs.existsSync(fullPath), true, "missing " + relativePath);
    assert.doesNotMatch(fs.readFileSync(fullPath, "utf8"), /\bA12\b/);
  }
});
