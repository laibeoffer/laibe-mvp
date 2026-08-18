import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const testDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(testDir, "..");

const bundleModule =
  "tools/a11_recognition/floor_plan_recognition_bundle_v1.mjs";
const gateModule = "tools/a11_recognition/floor_plan_recognition_gate_v1.mjs";
const consumerModule =
  "site/preview_floor_plan/a11-floor-plan-bundle-consumer.mjs";
const snapshotModule =
  "site/preview_floor_plan/plan-puzzle-snapshot-v1.mjs";
const runtimeModule =
  "site/preview_floor_plan/pdf-plan-exact-source-runtime.mjs";
const planPuzzleModule = "site/preview_floor_plan/plan-puzzle.js";
const codeHtmlModule = "tests/fixtures/preview-floor-plan-code.fixture.txt";
const directlyRoutableLegacyHtml = "site/preview_floor_plan/code.html";
const directlyRoutableQaPdf =
  "site/preview_floor_plan/_qa_pdf_reference_3rf.pdf";

function filePath(relativePath) {
  return path.join(rootDir, relativePath);
}

function source(relativePath) {
  const fullPath = filePath(relativePath);
  return fs.existsSync(fullPath) ? fs.readFileSync(fullPath, "utf8") : "";
}

function extractFunctionBody(text, declarationPattern, nextDeclarationPattern) {
  const declarationIndex = text.search(declarationPattern);
  assert.notEqual(declarationIndex, -1, `missing function declaration: ${declarationPattern}`);
  const remainder = text.slice(declarationIndex);
  const nextIndex = remainder.search(nextDeclarationPattern);
  assert.ok(nextIndex > 0, `missing next declaration after: ${declarationPattern}`);
  const block = remainder.slice(0, nextIndex);
  const openBrace = block.indexOf("{");
  const closeBrace = block.lastIndexOf("}");
  assert.ok(openBrace >= 0 && closeBrace > openBrace, `invalid function body: ${declarationPattern}`);
  return block.slice(openBrace + 1, closeBrace);
}

function countMatches(text, pattern) {
  return Array.from(text.matchAll(pattern)).length;
}

function extractFrozenGlobalBody(text, globalName) {
  const match = text.match(new RegExp(
    "window\\." + globalName +
      "\\s*=\\s*Object\\.freeze\\(\\{([\\s\\S]*?)\\n\\s*\\}\\);"
  ));
  assert.ok(match, "missing frozen global assignment: " + globalName);
  return match[1];
}

function frozenObjectKeys(body) {
  return body
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => entry.split(":")[0].trim());
}

test("A11 support exists without directly routable legacy product fixtures", () => {
  assert.equal(
    fs.existsSync(filePath(directlyRoutableLegacyHtml)),
    false,
    `legacy HTML must not be directly routable: ${directlyRoutableLegacyHtml}`
  );
  assert.equal(
    fs.existsSync(filePath(directlyRoutableQaPdf)),
    false,
    `QA PDF must not be directly routable: ${directlyRoutableQaPdf}`
  );

  for (const modulePath of [
    bundleModule,
    gateModule,
    consumerModule,
    snapshotModule,
  ]) {
    assert.equal(fs.existsSync(filePath(modulePath)), true, `missing ${modulePath}`);
  }
});

test("A11 recognition bundle owns its fixed public contract", () => {
  const text = source(bundleModule);

  for (const exportedName of [
    "FLOOR_PLAN_BUNDLE_SCHEMA_NAME",
    "FLOOR_PLAN_BUNDLE_SCHEMA_VERSION",
    "validateFloorPlanRecognitionBundle",
    "canonicalizeFloorPlanBundle",
    "hashFloorPlanRecognitionBundle",
    "createFloorPlanRecognitionBundle",
  ]) {
    assert.match(text, new RegExp(`export\\s+(?:const|function)\\s+${exportedName}\\b`));
  }

  assert.match(text, /laibe\.floor-plan-recognition-bundle\.v1/);
});

test("A11 recognition gate owns its fixed public contract", () => {
  const text = source(gateModule);

  for (const exportedName of [
    "A11_GATE_RECEIPT_SCHEMA_NAME",
    "validateA11RecognitionGateInput",
    "createA11RecognitionGateReceipt",
    "validateA11RecognitionGateReceipt",
  ]) {
    assert.match(text, new RegExp(`export\\s+(?:const|function)\\s+${exportedName}\\b`));
  }

  assert.match(text, /laibe\.floor-plan-recognition-gate-receipt\.v1/);
});

test("A11 consumer owns bundle binding, presentation, transform, and conversion", () => {
  const text = source(consumerModule);

  for (const exportedName of [
    "validateA11BundleBinding",
    "createPdfPresentationBinding",
    "transformSourcePointForDisplay",
    "transformDisplayPointForSource",
    "recordUserScaleConfirmation",
    "convertAcceptedBundleToNativePlan",
  ]) {
    assert.match(text, new RegExp(`export\\s+(?:const|function)\\s+${exportedName}\\b`));
  }
});

test("plan-puzzle snapshot owns its fixed public contract", () => {
  const text = source(snapshotModule);

  for (const exportedName of [
    "PLAN_PUZZLE_SNAPSHOT_SCHEMA_NAME",
    "validatePlanPuzzleSnapshot",
    "hashPlanPuzzleSnapshot",
    "createPlanPuzzleSnapshot",
  ]) {
    assert.match(text, new RegExp(`export\\s+(?:const|function)\\s+${exportedName}\\b`));
  }

  assert.match(text, /laibe\.plan-puzzle-snapshot\.v1/);
});

test("recognition bundle contains the required source, evidence, and release fields", () => {
  const text = source(bundleModule);

  for (const token of [
    "packetId",
    "schemaName",
    "schemaVersion",
    "caseId",
    "sourceDocumentId",
    "sourceDocumentVersionId",
    "sourceDocumentSha256",
    "pageNumber",
    "sourceFrame",
    "mediaBox",
    "cropBox",
    "userUnit",
    "rotationDegrees",
    "sourceToDisplayTransform",
    "displayToSourceTransform",
    "producerVersion",
    "algorithmVersion",
    "evidenceRegions",
    "objects",
    "relations",
    "relationId",
    "relationType",
    "sourceObjectId",
    "targetObjectId",
    "status",
    "confidence",
    "disposition",
    "scaleEvidence",
    "manifestHash",
    "releaseReceiptId",
    "supersedesPacketIds",
    "producerRole",
    "upstreamPacketIds",
    "evidenceReferences",
    "createdAt",
    "recordedAt",
    "processingStatus",
    "warnings",
    "humanReviewRequired",
    "modelVersion",
    "ruleVersion",
    "bundleFactsHash",
  ]) {
    assert.match(text, new RegExp(`\\b${token}\\b`), `missing bundle field ${token}`);
  }
});

test("snapshot preserves accepted A11 provenance and native-plan decision state", () => {
  const text = source(snapshotModule);

  for (const token of [
    "bundleId",
    "bundleHash",
    "gateReceiptId",
    "converterVersion",
    "nativeObjects",
    "topology",
    "scaleConfirmation",
    "evidenceBacklinks",
    "warnings",
    "unresolved",
    "persistence",
    "packetId",
    "caseId",
    "producerRole",
    "producerVersion",
    "sourceDocumentId",
    "sourceDocumentVersionId",
    "sourceDocumentSha256",
    "upstreamPacketIds",
    "evidenceReferences",
    "createdAt",
    "recordedAt",
    "processingStatus",
    "supersedesPacketIds",
    "humanReviewRequired",
    "a1BudgetFactsProjection",
    "a0IntegrationAcceptance",
    "hold",
    "pending",
  ]) {
    assert.match(text, new RegExp(`\\b${token}\\b`), `missing snapshot field ${token}`);
  }
});

test("consumer and gate fail closed for invalid, stale, or superseded recognition state", () => {
  const text = [source(consumerModule), source(gateModule)].join("\n");

  for (const token of ["missing", "mismatch", "gate false", "stale", "superseded"]) {
    assert.match(text, new RegExp(token, "i"), `missing fail-closed behavior: ${token}`);
  }
});

test("A11 gate receipt contains the required authority binding fields", () => {
  const text = source(gateModule);

  for (const token of [
    "receiptId",
    "writerRole",
    "A11_VALIDATOR",
    "bundleId",
    "bundleHash",
    "sourceDocumentId",
    "sourceDocumentVersionId",
    "sourceDocumentSha256",
    "pageNumber",
    "policyVersion",
    "modelVersion",
    "ruleVersion",
    "result",
    "reasonCodes",
    "recordedAt",
    "validatorEvidence",
    "bundleSchemaValidated",
    "sourceIdentityValidated",
    "sourceFrameValidated",
    "evidenceBindingsValidated",
    "relationsValidated",
    "uncertaintyDispositionValidated",
    "releaseBindingsValidated",
    "validatorVersion",
    "validationRunId",
    "evidenceHash",
  ]) {
    assert.match(text, new RegExp(`\\b${token}\\b`), `missing gate field ${token}`);
  }
});

test("consumer and snapshot permit verified PDF presentation and explicit scale confirmation", () => {
  const text = [source(consumerModule), source(snapshotModule)].join("\n");

  for (const token of [
    "sourceDocumentSha256",
    "pageNumber",
    "validateFloorPlanRecognitionBundle",
    "pdf",
    "background",
    "sourceToDisplayTransform",
    "displayToSourceTransform",
    "userScaleConfirmation",
  ]) {
    assert.match(text, new RegExp(token, "i"), `missing permitted behavior: ${token}`);
  }
});

test("production PDF chooser is presentation-only and scoped to its function body", () => {
  const planPuzzle = source(planPuzzleModule);
  const chooserBody = extractFunctionBody(
    planPuzzle,
    /async function importSelectedR6Pdf\s*\(/,
    /\n\s*function r6SelectedRecord\s*\(/
  );

  assert.match(chooserBody, /\bapi\.presentSelectedPdfFile\s*\(/);
  assert.match(chooserBody, /\breferenceRaster\b/);
  assert.match(chooserBody, /\bsourceDocumentSha256\b/);
  assert.match(chooserBody, /\bsourcePageNumber\b/);
  assert.match(chooserBody, /awaiting_a11_bundle_and_user_scale_confirmation/);
  assert.match(chooserBody, /userScaleConfirmationStatus:\s*"pending"/);

  const apiCalls = Array.from(
    chooserBody.matchAll(/\bapi\.([A-Za-z_$][\w$]*)\s*\(/g),
    (match) => match[1]
  );
  assert.deepEqual(Array.from(new Set(apiCalls)), ["presentSelectedPdfFile"]);

  for (const prohibited of [
    "recognizeSelectedPdfFile",
    "importSelectedPdfFile",
    "showPdfRecognitionOverlay",
    "r7TryAutomaticDimensionScale",
    "automatic-recognition-gate",
    "automatic_candidate_conservation",
  ]) {
    assert.doesNotMatch(chooserBody, new RegExp(prohibited));
  }
  assert.doesNotMatch(
    chooserBody,
    /\bautomatic(?:[_-]|\w)*(?:gate|scale)|\b(?:gate|scale)(?:[_-]|\w)*automatic/i
  );
  assert.doesNotMatch(
    chooserBody,
    /\bproject\.(?:walls|openings|zones|furniture|structures|columns)\.push\s*\(/
  );
});

test("runtime exports presentation and keeps legacy selection routes fail closed", () => {
  const runtime = source(runtimeModule);
  const productionKeys = frozenObjectKeys(
    extractFrozenGlobalBody(runtime, "LaibePdfPlanExactSource")
  );
  const qaKeys = frozenObjectKeys(
    extractFrozenGlobalBody(runtime, "LaibePdfPlanExactSourceQa")
  );
  const qaGuard = runtime.match(
    /if\s*\(isLocalhost\(\)\s*&&\s*hasExactSourceQaRoute\(\)\)\s*\{([\s\S]*?)\n\}/
  );
  assert.ok(qaGuard, "missing localhost exact-source QA guard");
  assert.match(
    qaGuard[1],
    /window\.LaibePdfPlanExactSourceQa\s*=\s*Object\.freeze\s*\(\{/
  );
  assert.deepEqual(productionKeys, [
    "VERSION",
    "presentSelectedPdfFile",
    "recognizeSelectedPdfFile",
    "importSelectedPdfFile",
  ]);
  assert.deepEqual(qaKeys, [
    "VERSION",
    "extractFromUrl",
    "extractFromArrayBuffer",
    "extractFromSelectedFile",
    "selectRecognitionRegion",
    "approveRecognitionManifest",
    "createRecognitionOverlaySvg",
    "consumeRecognitionImportAuthorization",
    "runLocalhostQa",
    "exportLocalhostQaCanvasPngs",
  ]);

  const codeHtml = source(codeHtmlModule);
  const qaProbeStart = codeHtml.indexOf("const r7D3Key=");
  const qaProbeEnd = codeHtml.indexOf("</script>", qaProbeStart);
  assert.notEqual(qaProbeStart, -1, "missing R7D3 localhost QA probe");
  assert.ok(qaProbeEnd > qaProbeStart, "missing R7D3 localhost QA probe boundary");
  const qaProbe = codeHtml.slice(qaProbeStart, qaProbeEnd);
  assert.match(qaProbe, /const api=window\.LaibePdfPlanExactSourceQa;/);
  assert.doesNotMatch(qaProbe, /const api=window\.LaibePdfPlanExactSource;/);

  const recognizeBody = extractFunctionBody(
    runtime,
    /async function recognizeSelectedPdfFile\s*\(/,
    /\nconst R6_EXISTING_OBJECT_POLICY\b/
  );
  const importBody = extractFunctionBody(
    runtime,
    /async function importSelectedPdfFile\s*\(/,
    /\nfunction summarizeForComparison\s*\(/
  );

  assert.match(runtime, /export\s+async\s+function\s+presentSelectedPdfFile\s*\(/);
  assert.match(runtime, /error\.code\s*=\s*"A11_BUNDLE_REQUIRED"/);
  assert.match(
    recognizeBody,
    /^\s*throw\s+a11BundleRequiredError\("recognizeSelectedPdfFile"\);\s*$/
  );
  assert.match(
    importBody,
    /^\s*throw\s+a11BundleRequiredError\("importSelectedPdfFile"\);\s*$/
  );
  assert.doesNotMatch(runtime, /\brecognizePdfObjects\s*\(/);
  assert.doesNotMatch(runtime, /\|\|\s*(?:842|1191)\b/);
});

test("opening host resolver fails closed while retaining the legacy QA helper definition", () => {
  const planPuzzle = source(planPuzzleModule);
  const resolverBody = extractFunctionBody(
    planPuzzle,
    /function findSceneCandidateHost\s*\(/,
    /\n\s*function findSceneCandidateGeometricHost\s*\(/
  );

  assert.match(resolverBody, /if\s*\(!edges\.length\)\s*return\s+null\s*;/);
  assert.doesNotMatch(resolverBody, /\bfindSceneCandidateGeometricHost\s*\(/);
  assert.equal(
    countMatches(planPuzzle, /\bfindSceneCandidateGeometricHost\s*\(/g),
    countMatches(planPuzzle, /\bfunction\s+findSceneCandidateGeometricHost\s*\(/g),
    "geometric host helper may remain defined but must have no caller"
  );
});

test("A9/A11 production contract modules contain no A12 authority", () => {
  for (const modulePath of [
    bundleModule,
    gateModule,
    consumerModule,
    snapshotModule,
  ]) {
    assert.doesNotMatch(source(modulePath), /\bA12\b/, `unexpected A12 token in ${modulePath}`);
  }
});
