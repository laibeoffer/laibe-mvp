import test from "node:test";
import assert from "node:assert/strict";
import { File } from "node:buffer";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { loadCanonicalUpper3fFixture } from "./helpers/canonical-pdf-scene.mjs";

const testDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(testDir, "..");
const adapterPath = resolve(
  repoRoot,
  "site/preview_floor_plan/browser-recognition-adapter.mjs",
);
const selectedSourcePresenterPath = resolve(
  repoRoot,
  "site/preview_floor_plan/pdf-plan-selected-source-presentation.mjs",
);
const pdfPath = resolve(repoRoot, "tests/fixtures/_qa_pdf_reference_3rf.pdf");
const realDrawingFixtures = Object.freeze([
  Object.freeze({
    path: "C:/CodexWork/訓練資料/2025.10.02-漢皇SUPER小伍哥/01-DWG圖檔/小伍哥0511.pdf",
    sha256: "727de4d175e0c831cf2eacef5f967f322e8b94dd829c9f1b004bc17191923459",
    pageCount: 28,
    objectCount: 183,
    unresolvedCount: 7,
  }),
  Object.freeze({
    path: "C:/CodexWork/訓練資料/2025.10.02-漢皇SUPER小伍哥/01-DWG圖檔/PDF/漢皇SUPER平面系列圖面.pdf",
    sha256: "1a470f432f4f956f4271c1a338186e12fa7ca3b99d70384e76e1f8c1fd90545c",
    pageCount: 16,
    objectCount: 167,
    unresolvedCount: 13,
  }),
]);
const adversarialFixtureDir = resolve(
  repoRoot,
  "tests/fixtures/a0-canonical-repair",
);
const activePdfFixtures = Object.freeze([
  ["Catalog OpenAction", "open-action.pdf"],
  ["Launch action", "launch.pdf"],
  ["URI action", "uri.pdf"],
  ["SubmitForm action", "submit-form.pdf"],
  ["page additional action", "page-action.pdf"],
  ["attachment and GoToR action", "attachment-gotor.pdf"],
  ["isolated Launch action", "launch-only.pdf"],
  ["isolated GoToR action", "gotor-only.pdf"],
  ["isolated attachment", "attachment-only.pdf"],
]);
const adapterUrl = pathToFileURL(adapterPath).href;
const canonicalPaths = {
  pdf: pdfPath,
  pdfJs: resolve(repoRoot, "site/preview_floor_plan/vendor/pdfjs/pdf.mjs"),
  extractor: resolve(repoRoot, "site/preview_floor_plan/pdf-plan-vector-extractor.js"),
  adapter: resolve(repoRoot, "site/preview_floor_plan/pdf-plan-objectization-adapter.js"),
  recognitionGate: resolve(repoRoot, "site/preview_floor_plan/pdf-recognition-gate.mjs"),
};

test.before(async () => {
  await loadCanonicalUpper3fFixture(canonicalPaths);
});

function a11Unavailable() {
  return { passed: false, reason: "a11_bundle_unavailable" };
}

function recognizedScene() {
  return {
    pageCount: 1,
    activeContent: false,
    scene: {
      source: {
        fileSha256: "A".repeat(64),
        pageNumber: 1,
        pageWidthPt: 842,
        pageHeightPt: 1191,
      },
      regions: [{
        sourceRegionId: "page-1-full",
        label: "第 1 頁",
        boundsPt: { x0: 0, y0: 0, x1: 842, y1: 1191 },
      }],
      structuralWalls: [{
        source_object_id: "wall-1",
        category: "wall",
        sourceRegionId: "page-1-full",
        sourceBBox: [10, 10, 100, 20],
      }],
    },
  };
}

function activePdfScenarios() {
  return activePdfFixtures.map(([name, fileName]) => ({
    name,
    bytes: readFileSync(resolve(adversarialFixtureDir, fileName)),
  }));
}

test("focused real File route reads bytes and returns recognition-only summary", async () => {
  const {
    recognizeDrawingFile,
    createDrawingRecognitionRunGuard,
  } = await import(`${adapterUrl}?red-real-file-route=1`);
  const bytes = readFileSync(pdfPath);
  const file = new File([bytes], "真實圖說.pdf", { type: "application/pdf" });
  let presentedBytes = 0;
  let extractedBytes = 0;
  let recognizedCalls = 0;
  const result = await recognizeDrawingFile(file, {
    dependencies: {
      async presentSelectedPdfFile(snapshot) {
        const selected = await snapshot.arrayBuffer();
        presentedBytes = selected.byteLength;
        return { pageCount: 1, selectedPageNumber: 1 };
      },
      async extractScene(input) {
        extractedBytes = input.bytes.byteLength;
        return recognizedScene();
      },
      recognizePdfObjects(input) {
        recognizedCalls += 1;
        return {
          selection: { selectedRegionId: "page-1-full" },
          allObjects: [{
            sourceId: "wall-1",
            category: "unresolved_important",
            sourcePayload: { reason: "wall_endpoint_requires_review" },
          }],
          objects: [{ category: "unresolved_important" }],
          counts: { unresolved_important: 1 },
          recognition: { status: "needs_review", unresolvedIds: ["wall-1"] },
          conversionGate: { status: "blocked" },
          summaryRows: [{ label: "重要待確認", count: 1 }],
        };
      },
      validateA11Binding: a11Unavailable,
    },
  });

  assert.equal(presentedBytes, bytes.byteLength);
  assert.equal(extractedBytes, bytes.byteLength);
  assert.equal(recognizedCalls, 1);
  assert.equal(result.status, "partial");
  assert.equal(result.file.byteLength, bytes.byteLength);
  assert.match(result.file.sha256, /^[0-9a-f]{64}$/);
  assert.equal(result.summary.pageCount, 1);
  assert.equal(result.summary.objectCount, 1);
  assert.equal(result.summary.unresolvedCount, 1);
  assert.equal(result.mode, "local_review_only");
  assert.deepEqual(result.holds, ["A11_FORMAL_BINDING_HOLD"]);
  assert.equal(result.securityStatus, "NO_ACTIVE_CONTENT_TRIGGER_DETECTED");
  assert.deepEqual(result.sourcePage, {
    pageNumber: 1,
    pageCount: 1,
    label: "第 1 頁",
  });
  assert.deepEqual(result.classificationCounts, [{
    label: "重要待確認",
    count: 1,
  }]);
  assert.deepEqual(result.uncertainty, [{
    reason: "牆線端點或銜接關係仍需人工核對。",
    nextAction: "請人工核對原始圖說後再決定是否採用。",
  }]);
  assert.equal("id" in result.uncertainty[0], false);
  assert.equal("category" in result.uncertainty[0], false);
  assert.equal(result.conversionAllowed, false);
  assert.equal(result.projectMutationAllowed, false);
  assert.equal(result.uploaded, false);
  assert.equal(result.persisted, false);
  assert.equal(result.formalCaseRecord, false);
  assert.equal(Object.isFrozen(result), true);

  const guard = createDrawingRecognitionRunGuard();
  const first = guard.begin();
  const second = guard.begin();
  assert.equal(guard.isCurrent(first), false);
  assert.equal(guard.isCurrent(second), true);
  guard.cancel();
  assert.equal(guard.isCurrent(second), false);
});

test("trusted pre-read size and post-read cap fail closed", async () => {
  const { recognizeDrawingFile } = await import(`${adapterUrl}?red-size-cap=1`);
  let calls = 0;
  const dependencies = {
    async presentSelectedPdfFile() { calls += 1; },
    async extractScene() { calls += 1; return recognizedScene(); },
    recognizePdfObjects() { calls += 1; return {}; },
    validateA11Binding: a11Unavailable,
  };
  const oversized = new File([new Uint8Array(33)], "large.pdf", {
    type: "application/pdf",
  });
  const result = await recognizeDrawingFile(oversized, {
    maxBytes: 32,
    dependencies,
  });
  assert.equal(result.status, "unsupported");
  assert.equal(result.reason, "oversize");
  assert.equal(calls, 0);

  const source = readFileSync(adapterPath, "utf8");
  const sizeGate = source.indexOf("trustedBlobSizeGetter");
  const read = source.indexOf("trustedBlobArrayBuffer");
  const postRead = source.indexOf("bytes.byteLength > maxBytes", read);
  assert.ok(sizeGate >= 0 && sizeGate < read && read < postRead);
});

test("existing genuine PDF passes the local PDF.js vector and recognition chain", async () => {
  const { recognizeDrawingFile } = await import(`${adapterUrl}?genuine-local-chain=1`);
  const bytes = readFileSync(pdfPath);
  const file = new File([bytes], "任意使用者圖說.pdf", {
    type: "application/pdf",
  });
  const result = await recognizeDrawingFile(file, {
    dependencies: {
      async presentSelectedPdfFile(snapshot) {
        const selected = await snapshot.arrayBuffer();
        assert.equal(selected.byteLength, bytes.byteLength);
        return { pageCount: 1, selectedPageNumber: 1 };
      },
      validateA11Binding: a11Unavailable,
    },
  });
  assert.equal(result.status, "partial");
  assert.equal(result.summary.pageCount, 1);
  assert.ok(result.summary.objectCount > 0);
  assert.ok(result.classificationCounts.length > 0);
  assert.equal(result.sourcePage.pageNumber, 1);
  assert.equal(result.securityStatus, "NO_ACTIVE_CONTENT_TRIGGER_DETECTED");
  assert.equal(result.conversionAllowed, false);
});

test("production-safe presenter binds the genuine File SHA page and PDF.js raster", async () => {
  assert.equal(
    existsSync(selectedSourcePresenterPath),
    true,
    "production-safe selected-source presenter must exist",
  );
  const source = readFileSync(selectedSourcePresenterPath, "utf8");
  assert.doesNotMatch(
    source,
    /LaibePdfPlanExactSourceQa|localhost|Gate-B|gateB|pdf-plan-exact-source-runtime|native-import/i,
  );

  const bytes = readFileSync(pdfPath);
  const sourceSha256 = createHash("sha256").update(bytes).digest("hex");
  const renderCalls = [];
  const pdfDocument = {
    numPages: 1,
    async getPage(pageNumber) {
      assert.equal(pageNumber, 1);
      return {
        pageNumber,
        getViewport({ scale, rotation = 0 }) {
          return { width: 320 * scale, height: 240 * scale, rotation };
        },
        render(input) {
          renderCalls.push(input);
          return { promise: Promise.resolve() };
        },
      };
    },
    async destroy() {},
  };
  const pdfjsLib = {
    getDocument({ data }) {
      assert.equal(data.byteLength, bytes.byteLength);
      structuredClone(data, { transfer: [data] });
      return { promise: Promise.resolve(pdfDocument) };
    },
  };
  const context = {
    fillStyle: "",
    fillRect() {},
  };
  const documentBefore = globalThis.document;
  globalThis.document = {
    createElement(tagName) {
      assert.equal(tagName, "canvas");
      return {
        width: 0,
        height: 0,
        getContext(kind, options) {
          assert.equal(kind, "2d");
          assert.deepEqual(options, { alpha: false });
          return context;
        },
        toDataURL(type) {
          assert.equal(type, "image/png");
          return "data:image/png;base64,iVBORw0KGgo=";
        },
      };
    },
  };
  try {
    const { presentSelectedPdfFile } = await import(
      `${pathToFileURL(selectedSourcePresenterPath).href}?production-safe-presenter=1`
    );
    const result = await presentSelectedPdfFile(
      new File([bytes], "真實圖說.pdf", { type: "application/pdf" }),
      {
        pdfjsLib,
        expectedSha256: sourceSha256,
        pageNumber: 1,
        renderScale: 2,
      },
    );
    assert.equal(result.schema, "laibe.planPuzzle.pdfSourcePresentation.v1");
    assert.equal(result.route, "genuine-user-file-selection");
    assert.equal(result.selectedSha256, sourceSha256);
    assert.equal(result.selectedPageNumber, 1);
    assert.equal(result.pageCount, 1);
    assert.equal(result.file.byteLength, bytes.byteLength);
    assert.equal(result.referenceRaster.sourceDocumentSha256, sourceSha256);
    assert.equal(result.referenceRaster.pageNumber, 1);
    assert.equal(result.referenceRaster.naturalWidth, 640);
    assert.equal(result.referenceRaster.naturalHeight, 480);
    assert.equal(renderCalls.length, 1);
  } finally {
    if (documentBefore === undefined) delete globalThis.document;
    else globalThis.document = documentBefore;
  }
});

test("real target drawings keep their exact local-review-only regressions", async () => {
  const { recognizeDrawingFile } = await import(`${adapterUrl}?real-target-regressions=1`);
  for (const fixture of realDrawingFixtures) {
    assert.equal(existsSync(fixture.path), true, `FILE_NOT_FOUND: ${fixture.path}`);
    const bytes = readFileSync(fixture.path);
    assert.equal(createHash("sha256").update(bytes).digest("hex"), fixture.sha256, fixture.path);
    const result = await recognizeDrawingFile(
      new File([bytes], fixture.path.split("/").at(-1), { type: "application/pdf" }),
      {
        dependencies: {
          async presentSelectedPdfFile(snapshot) {
            const selected = await snapshot.arrayBuffer();
            assert.equal(selected.byteLength, bytes.byteLength);
            return { pageCount: fixture.pageCount, selectedPageNumber: 1 };
          },
        },
      },
    );
    assert.equal(result.status, "partial", fixture.path);
    assert.equal(result.reason, "A11_FORMAL_BINDING_HOLD", fixture.path);
    assert.equal(result.mode, "local_review_only", fixture.path);
    assert.deepEqual(result.holds, ["A11_FORMAL_BINDING_HOLD"], fixture.path);
    assert.equal(result.file.sha256, fixture.sha256, fixture.path);
    assert.equal(result.summary.pageCount, fixture.pageCount, fixture.path);
    assert.equal(result.summary.objectCount, fixture.objectCount, fixture.path);
    assert.equal(result.summary.unresolvedCount, fixture.unresolvedCount, fixture.path);
    assert.equal(result.conversionAllowed, false, fixture.path);
    assert.equal(result.projectMutationAllowed, false, fixture.path);
    assert.equal(result.uploaded, false, fixture.path);
    assert.equal(result.persisted, false, fixture.path);
    assert.equal(result.formalCaseRecord, false, fixture.path);
  }
});

test("normal caller and even caller-supplied A11 data remain local review only", async () => {
  const { recognizeDrawingFile } = await import(`${adapterUrl}?a11-hold-red=1`);
  const file = new File([readFileSync(pdfPath)], "drawing.pdf", {
    type: "application/pdf",
  });
  const result = await recognizeDrawingFile(file, {
    a11Binding: { callerSupplied: true },
    dependencies: {
      async inspectActiveContent() {
        return "NO_ACTIVE_CONTENT_TRIGGER_DETECTED";
      },
      async presentSelectedPdfFile() {
        return { pageCount: 1, selectedPageNumber: 1 };
      },
      async extractScene() {
        return recognizedScene();
      },
      recognizePdfObjects() {
        return {
          selection: { selectedRegionId: "page-1-full" },
          allObjects: [{ sourceId: "wall-1", category: "native_wall" }],
          objects: [{ sourceId: "wall-1", category: "native_wall" }],
          counts: { native_wall: 1 },
          summaryRows: [{ label: "牆線", count: 1 }],
          recognition: { unresolvedIds: [] },
        };
      },
      validateA11Binding() {
        return { passed: true, reason: "caller_claimed_pass" };
      },
    },
  });
  assert.equal(result.status, "partial");
  assert.equal(result.reason, "A11_FORMAL_BINDING_HOLD");
  assert.equal(result.mode, "local_review_only");
  assert.deepEqual(result.holds, ["A11_FORMAL_BINDING_HOLD"]);
});

test("security inspection unavailable is distinct from confirmed active content", async () => {
  const { recognizeDrawingFile } = await import(`${adapterUrl}?security-status-red=1`);
  const file = new File([readFileSync(pdfPath)], "drawing.pdf", {
    type: "application/pdf",
  });
  const calls = { presentation: 0, extraction: 0, recognition: 0 };
  const result = await recognizeDrawingFile(file, {
    dependencies: {
      async inspectActiveContent() {
        throw new Error("inspection unavailable");
      },
      async presentSelectedPdfFile() { calls.presentation += 1; },
      async extractScene() { calls.extraction += 1; },
      recognizePdfObjects() { calls.recognition += 1; },
    },
  });
  assert.equal(result.status, "unsupported");
  assert.equal(result.reason, "security_inspection_unavailable");
  assert.equal(result.securityStatus, "SECURITY_INSPECTION_UNAVAILABLE");
  assert.deepEqual(calls, { presentation: 0, extraction: 0, recognition: 0 });
});

test("presentation reference requires the exact selected PDF SHA", async () => {
  const { recognizeDrawingFile } = await import(`${adapterUrl}?presentation-sha-red=1`);
  const bytes = readFileSync(pdfPath);
  const sourceSha256 = createHash("sha256").update(bytes).digest("hex");
  const cases = [
    {
      label: "canonical lowercase binding",
      upstreamAvailable: true,
      sourceDocumentSha256: sourceSha256,
      rasterPageNumber: 1,
      presentationPageNumber: 1,
      extractionPageNumber: 1,
      available: true,
    },
    {
      label: "upstream unavailable with residual reference data",
      upstreamAvailable: false,
      sourceDocumentSha256: sourceSha256,
      rasterPageNumber: 1,
      presentationPageNumber: 1,
      extractionPageNumber: 1,
      available: false,
    },
    {
      label: "missing SHA",
      upstreamAvailable: true,
      sourceDocumentSha256: undefined,
      rasterPageNumber: 1,
      presentationPageNumber: 1,
      extractionPageNumber: 1,
      available: false,
    },
    {
      label: "uppercase noncanonical SHA",
      upstreamAvailable: true,
      sourceDocumentSha256: sourceSha256.toUpperCase(),
      rasterPageNumber: 1,
      presentationPageNumber: 1,
      extractionPageNumber: 1,
      available: false,
    },
    {
      label: "raster page mismatch",
      upstreamAvailable: true,
      sourceDocumentSha256: sourceSha256,
      rasterPageNumber: 2,
      presentationPageNumber: 1,
      extractionPageNumber: 1,
      available: false,
    },
    {
      label: "presentation page mismatch",
      upstreamAvailable: true,
      sourceDocumentSha256: sourceSha256,
      rasterPageNumber: 1,
      presentationPageNumber: 2,
      extractionPageNumber: 1,
      available: false,
    },
    {
      label: "extraction page mismatch",
      upstreamAvailable: true,
      sourceDocumentSha256: sourceSha256,
      rasterPageNumber: 1,
      presentationPageNumber: 1,
      extractionPageNumber: 2,
      available: false,
    },
  ];
  for (const entry of cases) {
    const result = await recognizeDrawingFile(
      new File([bytes], "drawing.pdf", { type: "application/pdf" }),
      {
        dependencies: {
          async inspectActiveContent() {
            return "NO_ACTIVE_CONTENT_TRIGGER_DETECTED";
          },
          async presentSelectedPdfFile() {
            return {
              pageCount: 1,
              referenceRaster: {
                available: entry.upstreamAvailable,
                dataUrl: "data:image/png;base64,iVBORw0KGgo=",
                naturalWidth: 320,
                naturalHeight: 240,
                pageNumber: entry.rasterPageNumber,
                sourceDocumentSha256: entry.sourceDocumentSha256,
              },
              selectedPageNumber: entry.presentationPageNumber,
            };
          },
          async extractScene() {
            const extraction = recognizedScene();
            extraction.scene.source.pageNumber = entry.extractionPageNumber;
            return extraction;
          },
          recognizePdfObjects() {
            return {
              allObjects: [{ sourceId: "wall-1", category: "native_wall" }],
              counts: { native_wall: 1 },
              summaryRows: [{ label: "牆線", count: 1 }],
              recognition: { unresolvedIds: [] },
            };
          },
        },
      },
    );
    assert.equal(result.status, "partial", entry.label);
    assert.equal(result.file.sha256, sourceSha256, entry.label);
    assert.equal(result.presentationReference.available, entry.available, entry.label);
    assert.equal(
      result.presentationReference.dataUrl,
      entry.available ? "data:image/png;base64,iVBORw0KGgo=" : null,
      entry.label,
    );
    assert.equal(
      result.presentationReference.pageNumber,
      entry.available ? 1 : null,
      entry.label,
    );
    assert.equal(
      result.presentationReference.naturalWidth,
      entry.available ? 320 : null,
      entry.label,
    );
    assert.equal(
      result.presentationReference.naturalHeight,
      entry.available ? 240 : null,
      entry.label,
    );
  }
});

test("unsupported scanned encrypted corrupt and active inputs stay closed", async () => {
  const { recognizeDrawingFile } = await import(`${adapterUrl}?red-fail-closed=1`);
  const file = new File(["%PDF-1.7\nfixture"], "plan.pdf", {
    type: "application/pdf",
  });
  const base = {
    async inspectActiveContent() { return false; },
    async presentSelectedPdfFile() { return { pageCount: 1 }; },
    validateA11Binding: a11Unavailable,
  };
  const cases = [
    {
      reason: "scanned_or_non_vector",
      dependencies: {
        ...base,
        async extractScene() { return { pageCount: 1, activeContent: false, scene: {} }; },
        recognizePdfObjects() {
          return { allObjects: [], objects: [], counts: {}, recognition: { unresolvedIds: [] } };
        },
      },
    },
    {
      reason: "encrypted",
      dependencies: {
        ...base,
        async extractScene() {
          const error = new Error("secret");
          error.name = "PasswordException";
          throw error;
        },
        recognizePdfObjects() { throw new Error("must not run"); },
      },
    },
    {
      reason: "corrupt",
      dependencies: {
        ...base,
        async extractScene() { throw new Error("broken"); },
        recognizePdfObjects() { throw new Error("must not run"); },
      },
    },
    {
      reason: "active_content",
      dependencies: {
        ...base,
        async extractScene() {
          return { ...recognizedScene(), activeContent: true };
        },
        recognizePdfObjects() { throw new Error("must not run"); },
      },
    },
  ];

  for (const entry of cases) {
    const result = await recognizeDrawingFile(file, {
      dependencies: entry.dependencies,
    });
    assert.equal(result.status, "unsupported", entry.reason);
    assert.equal(result.reason, entry.reason, entry.reason);
    assert.equal(result.conversionAllowed, false, entry.reason);
  }
});

test("valid adversarial PDFs stop before presentation extraction or recognition", async () => {
  const {
    inspectDrawingPdfActiveContent,
    recognizeDrawingFile,
  } = await import(`${adapterUrl}?active-structure-red=1`);
  const pdfjs = await import(pathToFileURL(canonicalPaths.pdfJs).href);
  const scenarios = activePdfScenarios();
  for (const scenario of scenarios) {
    const parsed = await pdfjs.getDocument({
      data: new Uint8Array(scenario.bytes),
      disableWorker: true,
    }).promise;
    assert.equal(parsed.numPages, 1, `${scenario.name} must be a valid PDF`);
    await parsed.destroy();
    assert.equal(
      await inspectDrawingPdfActiveContent({ bytes: new Uint8Array(scenario.bytes) }),
      "CONFIRMED_ACTIVE_CONTENT",
      scenario.name,
    );
  }
  for (const scenario of scenarios) {
    const calls = { presentation: 0, extraction: 0, recognition: 0 };
    const result = await recognizeDrawingFile(
      new File([scenario.bytes], "drawing.pdf", { type: "application/pdf" }),
      {
        dependencies: {
          async presentSelectedPdfFile() {
            calls.presentation += 1;
            throw new Error("active PDF reached presentation");
          },
          async extractScene() {
            calls.extraction += 1;
            throw new Error("active PDF reached extraction");
          },
          recognizePdfObjects() {
            calls.recognition += 1;
            throw new Error("active PDF reached recognition");
          },
          validateA11Binding: a11Unavailable,
        },
      },
    );
    assert.equal(result.status, "unsupported", scenario.name);
    assert.equal(result.reason, "active_content", scenario.name);
    assert.equal(result.securityStatus, "CONFIRMED_ACTIVE_CONTENT", scenario.name);
    assert.deepEqual(calls, {
      presentation: 0,
      extraction: 0,
      recognition: 0,
    }, scenario.name);
    assert.equal(result.conversionAllowed, false, scenario.name);
    assert.equal(result.projectMutationAllowed, false, scenario.name);
  }
});

test("accepted contracts are reused without conversion or fixture-name branching", async () => {
  const source = readFileSync(adapterPath, "utf8");
  for (const acceptedModule of [
    "vendor/pdfjs/pdf.mjs",
    "pdf-plan-vector-extractor.js",
    "pdf-plan-objectization-adapter.js",
    "pdf-plan-selected-source-presentation.mjs",
    "pdf-recognition-gate.mjs",
  ]) {
    assert.match(source, new RegExp(acceptedModule.replaceAll(".", "\\.")));
  }
  assert.doesNotMatch(source, /_qa_pdf_reference_3rf|0312\.pdf|fixture/i);
  assert.doesNotMatch(
    source,
    /pdf-plan-exact-source-runtime|convertAcceptedBundleToNativePlan|importSelectedPdfFile|importPdfObjectizationScene|laibePlanImport/i,
  );
});
