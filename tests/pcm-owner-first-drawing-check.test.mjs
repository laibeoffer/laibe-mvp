import test from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { readFile, stat } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { promisify } from "node:util";
import { runInNewContext } from "node:vm";
import { loadCanonicalUpper3fFixture } from "./helpers/canonical-pdf-scene.mjs";

const testDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(testDir, "..");
const drawingDir = resolve(
  repoRoot,
  "src/stitch_laibe_landing_onboarding/pcm_standalone/drawing_check",
);
const htmlPath = resolve(drawingDir, "code.html");
const cssPath = resolve(drawingDir, "styles.css");
const appPath = resolve(drawingDir, "app.js");
const browserAdapterPath = resolve(
  repoRoot,
  "site/preview_floor_plan/browser-recognition-adapter.mjs",
);
const legacyPlanPuzzlePagePath = resolve(
  repoRoot,
  "site/preview_floor_plan/code.html",
);
const sharedTokenPath = resolve(drawingDir, "../shared/owner-first-tokens.css");
const sharedShellPath = resolve(drawingDir, "../shared/owner-first-shell.css");
const execFileAsync = promisify(execFile);

test.before(async () => {
  await loadCanonicalUpper3fFixture({
    pdf: resolve(repoRoot, "tests/fixtures/_qa_pdf_reference_3rf.pdf"),
    pdfJs: resolve(repoRoot, "site/preview_floor_plan/vendor/pdfjs/pdf.mjs"),
    extractor: resolve(repoRoot, "site/preview_floor_plan/pdf-plan-vector-extractor.js"),
    adapter: resolve(repoRoot, "site/preview_floor_plan/pdf-plan-objectization-adapter.js"),
    recognitionGate: resolve(repoRoot, "site/preview_floor_plan/pdf-recognition-gate.mjs"),
  });
});

const requiredSteps = Object.freeze([
  "INTRODUCTION",
  "CONSENT",
  "SELECT_FILE",
  "VALIDATION_PENDING",
  "CORRECTION_REQUIRED",
  "RESELECT_FILE",
  "RESULT_FORMAT",
  "RESULT_UNAVAILABLE",
]);

const requiredFailures = Object.freeze([
  "FILE_FORMAT_INVALID",
  "FILE_TOO_LARGE",
  "PAGE_COUNT_INVALID",
  "FILE_UNREADABLE",
  "FILE_CORRUPTED",
  "FILE_ENCRYPTED",
  "ACTIVE_CONTENT_UNSUPPORTED",
  "SECURITY_INSPECTION_UNAVAILABLE",
  "FILE_READ_FAILED",
  "DUPLICATE_SUBMISSION",
  "VERSION_CONFLICT",
  "DRAWING_ONLY_QUOTE_MISSING",
]);

async function readOrEmpty(path) {
  try {
    return await readFile(path, "utf8");
  } catch {
    return "";
  }
}

function stripNonVisibleHtml(html) {
  return html
    .replace(/<script\b[\s\S]*?<\/script>/gi, "")
    .replace(/<style\b[\s\S]*?<\/style>/gi, "")
    .replace(/<template\b[\s\S]*?<\/template>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ");
}

function rgbChannels(hex) {
  const normalized = hex.replace("#", "");
  return [0, 2, 4].map((offset) =>
    Number.parseInt(normalized.slice(offset, offset + 2), 16));
}

function relativeLuminance(hex) {
  const channels = rgbChannels(hex).map((channel) => {
    const value = channel / 255;
    return value <= 0.04045
      ? value / 12.92
      : ((value + 0.055) / 1.055) ** 2.4;
  });
  return (0.2126 * channels[0]) +
    (0.7152 * channels[1]) +
    (0.0722 * channels[2]);
}

function contrastRatio(foreground, background) {
  const light = Math.max(
    relativeLuminance(foreground),
    relativeLuminance(background),
  );
  const dark = Math.min(
    relativeLuminance(foreground),
    relativeLuminance(background),
  );
  return (light + 0.05) / (dark + 0.05);
}

function assertZeroAuthorityActions(actions, label) {
  assert.equal(Object.getPrototypeOf(actions), null, `${label} prototype`);
  assert.equal(actions.length, 0, `${label} length`);
  assert.equal(actions[0], undefined, `${label} index`);
  assert.deepEqual([...actions], [], `${label} spread`);
  assert.equal(Object.isFrozen(actions), true, `${label} frozen`);
}

const harnessDefineProperty = Object.defineProperty;
const harnessFileListData = new WeakMap();
const harnessInputFiles = new WeakMap();

class HarnessFileList {
  constructor(files) {
    const data = { length: files.length };
    for (let index = 0; index < files.length; index += 1) {
      data[index] = files[index];
      harnessDefineProperty(this, String(index), {
        configurable: true,
        enumerable: true,
        value: files[index],
        writable: false,
      });
    }
    harnessFileListData.set(this, data);
  }

  get length() {
    const data = harnessFileListData.get(this);
    if (!data) throw new TypeError("Illegal FileList receiver");
    return data.length;
  }

  item(index) {
    const data = harnessFileListData.get(this);
    if (!data) throw new TypeError("Illegal FileList receiver");
    return data[index] ?? null;
  }
}

class HarnessHtmlInputElement {
  constructor() {
    harnessInputFiles.set(this, new HarnessFileList([]));
  }

  get files() {
    if (!harnessInputFiles.has(this)) {
      throw new TypeError("Illegal HTMLInputElement receiver");
    }
    return harnessInputFiles.get(this);
  }

  set files(value) {
    if (!harnessInputFiles.has(this)) {
      throw new TypeError("Illegal HTMLInputElement receiver");
    }
    harnessInputFiles.set(this, value);
  }
}

function browserFile(name, type) {
  return new File(["local test bytes"], name, { type });
}

function createFileHandlerHarness() {
  let focusedPanelCode = null;
  let pickerClicks = 0;
  const stateCodes = [...requiredSteps, "FAILURE"];
  const panels = stateCodes.map((code) => {
    const focusTarget = {
      focus() {
        focusedPanelCode = code;
      },
    };
    return {
      dataset: { flowPanel: code },
      hidden: code !== "INTRODUCTION",
      querySelector(selector) {
        return selector === "[data-panel-focus]" ? focusTarget : null;
      },
    };
  });
  const railItems = requiredSteps.map((code) => ({
    dataset: { flowStep: code },
    setAttribute() {},
    removeAttribute() {},
  }));
  const fileNameTarget = { textContent: "尚未選擇" };
  const failureTargets = {
    "[data-failure-title]": { textContent: "" },
    "[data-failure-reason]": { textContent: "" },
    "[data-failure-next]": { textContent: "" },
    "[data-failure-role]": { textContent: "" },
  };
  const recognitionReference = {
    alt: "",
    hidden: true,
    src: "",
    removeAttribute(name) {
      if (name === "src") this.src = "";
    },
  };
  const recognitionTargets = {
    "[data-recognition-output]": { dataset: { recognitionState: "idle" } },
    "[data-recognition-kicker]": { textContent: "" },
    "[data-recognition-title]": { textContent: "" },
    "[data-recognition-message]": { textContent: "" },
    "[data-recognition-content]": { textContent: "" },
    "[data-recognition-size]": { textContent: "" },
    "[data-recognition-pages]": { textContent: "" },
    "[data-recognition-objects]": { textContent: "" },
    "[data-recognition-uncertainty]": { textContent: "" },
    "[data-recognition-counts]": { textContent: "" },
    "[data-recognition-items]": { textContent: "" },
    "[data-recognition-reference]": recognitionReference,
  };
  const listeners = new Map();
  const heroStart = {
    attributes: new Map(),
    dataset: { heroStart: "", nextStep: "CONSENT" },
    disabled: false,
    textContent: "開始圖說檢討準備",
    addEventListener(type, listener) {
      listeners.set(`heroStart:${type}`, listener);
    },
    setAttribute(name, value) {
      this.attributes.set(name, String(value));
    },
    removeAttribute(name) {
      this.attributes.delete(name);
    },
  };
  const failureRecover = {
    addEventListener(type, listener) {
      listeners.set(`failureRecover:${type}`, listener);
    },
  };
  const failureReturn = {
    addEventListener(type, listener) {
      listeners.set(`failureReturn:${type}`, listener);
    },
  };
  const fileInput = new HarnessHtmlInputElement();
  fileInput.value = "";
  fileInput.addEventListener = (type, listener) => {
    listeners.set(type, listener);
  };
  fileInput.click = () => {
    pickerClicks += 1;
  };
  const root = {
    dataset: {},
    querySelector(selector) {
      if (selector === "#drawing-file") return fileInput;
      if (selector === "[data-hero-start]") return heroStart;
      if (selector === "[data-failure-recover]") return failureRecover;
      if (selector === "[data-failure-return]") return failureReturn;
      return failureTargets[selector] ?? recognitionTargets[selector] ?? null;
    },
    querySelectorAll(selector) {
      if (selector === "[data-flow-panel]") return panels;
      if (selector === "[data-flow-step]") return railItems;
      if (selector === "[data-next-step]") return [heroStart];
      if (selector === "[data-selected-file-name]") return [fileNameTarget];
      return [];
    },
  };
  return {
    document: {
      querySelector(selector) {
        return selector === "[data-drawing-check-page]" ? root : null;
      },
    },
    fileInput,
    dispatchFile(file) {
      fileInput.value = file ? "C:\\fakepath\\selection.pdf" : "";
      fileInput.files = new HarnessFileList(file ? [file] : []);
      return listeners.get("change")?.();
    },
    dispatchFiles(files) {
      fileInput.value = "C:\\fakepath\\selection.pdf";
      fileInput.files = files;
      return listeners.get("change")?.();
    },
    dispatchChange() {
      return listeners.get("change")?.();
    },
    dispatchHero() {
      return listeners.get("heroStart:click")?.();
    },
    dispatchRecover() {
      return listeners.get("failureRecover:click")?.();
    },
    dispatchReturn() {
      return listeners.get("failureReturn:click")?.();
    },
    visibleState() {
      return panels.find((panel) => panel.hidden === false)?.dataset.flowPanel;
    },
    failureReason() {
      return failureTargets["[data-failure-reason]"].textContent;
    },
    recognitionState() {
      return recognitionTargets["[data-recognition-output]"].dataset.recognitionState;
    },
    recognitionText(selector) {
      return recognitionTargets[selector]?.textContent ?? "";
    },
    recognitionReference() {
      return { ...recognitionReference };
    },
    selectedName() {
      return fileNameTarget.textContent;
    },
    inputValue() {
      return fileInput.value;
    },
    focusedPanel() {
      return focusedPanelCode;
    },
    pickerClicks() {
      return pickerClicks;
    },
    heroAction() {
      return {
        ariaDisabled: heroStart.attributes.get("aria-disabled") ?? null,
        disabled: heroStart.disabled,
        label: heroStart.textContent,
        target: heroStart.dataset.heroTarget ?? null,
      };
    },
  };
}

async function initializeManualFileHandlerHarness(tag, recognizeFile) {
  const harness = createFileHandlerHarness();
  const documentDescriptor = Object.getOwnPropertyDescriptor(globalThis, "document");
  const fileListDescriptor = Object.getOwnPropertyDescriptor(globalThis, "FileList");
  const inputDescriptor = Object.getOwnPropertyDescriptor(globalThis, "HTMLInputElement");
  Object.defineProperty(globalThis, "document", {
    configurable: true,
    value: { querySelector() { return null; } },
  });
  Object.defineProperty(globalThis, "FileList", {
    configurable: true,
    value: HarnessFileList,
  });
  Object.defineProperty(globalThis, "HTMLInputElement", {
    configurable: true,
    value: HarnessHtmlInputElement,
  });
  try {
    const module = await import(`${pathToFileURL(appPath).href}?manual-${tag}`);
    Object.defineProperty(globalThis, "document", {
      configurable: true,
      value: harness.document,
    });
    module.initializeDrawingCheckPage({ recognizeFile });
  } finally {
    if (documentDescriptor) Object.defineProperty(globalThis, "document", documentDescriptor);
    else delete globalThis.document;
    if (fileListDescriptor) Object.defineProperty(globalThis, "FileList", fileListDescriptor);
    else delete globalThis.FileList;
    if (inputDescriptor) Object.defineProperty(globalThis, "HTMLInputElement", inputDescriptor);
    else delete globalThis.HTMLInputElement;
  }
  return harness;
}

function nextTurn() {
  return new Promise((resolveTurn) => setImmediate(resolveTurn));
}

async function initializeFileHandlerHarness(tag) {
  assert.equal(existsSync(appPath), true, "app.js must exist before import");
  const harness = createFileHandlerHarness();
  const documentDescriptor = Object.getOwnPropertyDescriptor(globalThis, "document");
  const fileListDescriptor = Object.getOwnPropertyDescriptor(globalThis, "FileList");
  const inputDescriptor = Object.getOwnPropertyDescriptor(
    globalThis,
    "HTMLInputElement",
  );
  Object.defineProperty(globalThis, "document", {
    configurable: true,
    value: harness.document,
  });
  Object.defineProperty(globalThis, "FileList", {
    configurable: true,
    value: HarnessFileList,
  });
  Object.defineProperty(globalThis, "HTMLInputElement", {
    configurable: true,
    value: HarnessHtmlInputElement,
  });
  try {
    await import(`${pathToFileURL(appPath).href}?${tag}`);
  } finally {
    if (documentDescriptor) {
      Object.defineProperty(globalThis, "document", documentDescriptor);
    } else {
      delete globalThis.document;
    }
    if (fileListDescriptor) {
      Object.defineProperty(globalThis, "FileList", fileListDescriptor);
    } else {
      delete globalThis.FileList;
    }
    if (inputDescriptor) {
      Object.defineProperty(globalThis, "HTMLInputElement", inputDescriptor);
    } else {
      delete globalThis.HTMLInputElement;
    }
  }
  return harness;
}

async function importDrawingModule(tag) {
  assert.equal(existsSync(appPath), true, "app.js must exist before import");
  return import(`${pathToFileURL(appPath).href}?${tag}`);
}

test("drawing check starts as one bounded three-file source page", async () => {
  assert.equal(existsSync(drawingDir), true, "drawing_check directory must exist");
  for (const path of [htmlPath, cssPath, appPath]) {
    assert.equal(existsSync(path), true, path);
    assert.equal((await stat(path)).isFile(), true, path);
  }
});

test("one page exposes the complete drawing-review state sequence", async () => {
  const [html, app] = await Promise.all([
    readOrEmpty(htmlPath),
    readOrEmpty(appPath),
  ]);
  assert.match(html, /data-drawing-check-page/);
  for (const step of requiredSteps) {
    assert.match(`${html}\n${app}`, new RegExp(step), step);
  }
  assert.match(html, /給準備施工圖 PDF 的甲方/);
  assert.match(html, /服務說明/);
  assert.match(html, /同意本機檢視/);
  assert.match(html, /選擇圖說 PDF/);
  assert.match(html, /圖說內容與後續確認/);
  assert.match(html, /待確認清單/);
  assert.match(html, /重新選擇/);
  assert.match(html, /結果格式示意/);
  assert.doesNotMatch(html, /匿名版|註冊版|登入後版本/);
});

test("first screen exposes five owner facts and one primary continuation", async () => {
  const html = await readOrEmpty(htmlPath);
  const hero = html.match(/<section class="drawing-hero"[\s\S]*?<\/section>/)?.[0] ?? "";
  const facts = html.match(/<section class="owner-first-facts"[\s\S]*?<\/section>/)?.[0] ?? "";
  assert.match(hero, /data-hero-start/);
  assert.equal(
    (hero.match(/owner-first-primary-action/g) ?? []).length,
    1,
    "the first-screen hero has one primary CTA",
  );
  for (const label of ["角色", "PCM 契約", "案件狀態", "下一步／責任人", "最近紀錄"]) {
    assert.match(facts, new RegExp(label), label);
  }
  assert.equal((facts.match(/data-owner-fact/g) ?? []).length, 5);
  assert.match(facts, /甲方／圖說準備者/);
  assert.match(facts, /尚未進入正式服務/);
  assert.match(facts, /尚未建立案件/);
  assert.match(facts, /尚無案件紀錄/);
});

test("selection stays local and cannot imply upload parsing persistence or a formal result", async () => {
  const [html, app] = await Promise.all([
    readOrEmpty(htmlPath),
    readOrEmpty(appPath),
  ]);
  const visible = stripNonVisibleHtml(html);
  assert.match(html, /type="file"/);
  assert.match(html, /accept="application\/pdf,\.pdf"/);
  assert.match(visible, /只在本頁暫時檢視/);
  assert.match(visible, /尚未送出或保存/);
  assert.match(visible, /尚未產生可保存的圖面辨識摘要/);
  assert.match(visible, /結果格式示意，非真實案件/);
  assert.doesNotMatch(
    visible,
    /上傳成功|已保存|已建立案件|圖說檢討完成|已產生正式檢討結果|解析完成/,
  );
  assert.doesNotMatch(
    app,
    /localStorage|sessionStorage|URLSearchParams|location\.(?:search|hash)|\bfetch\b|XMLHttpRequest|FileReader|\.arrayBuffer\s*\(|\.stream\s*\(/i,
  );
});

test("processing and recognition summary stay local honest and review-bound", async () => {
  const [html, app, css] = await Promise.all([
    readOrEmpty(htmlPath),
    readOrEmpty(appPath),
    readOrEmpty(cssPath),
  ]);
  const visible = stripNonVisibleHtml(html);
  assert.match(visible, /正在讀取 PDF 圖面結構/);
  assert.match(visible, /本次只在瀏覽器內整理，尚未保存案件/);
  assert.match(visible, /不等於正式圖面、比例、尺寸或案件紀錄/);
  assert.match(app, /"processing"/);
  assert.doesNotMatch(app, /status === "recognized"|\? "recognized"/);
  assert.doesNotMatch(css, /data-recognition-state=["']recognized["']/);
  assert.match(app, /"partial"/);
  assert.match(app, /"unsupported"/);
  assert.match(app, /"error"/);
  assert.match(app, /token !== recognitionSequence/);
  assert.match(app, /browser-recognition-adapter\.mjs/);
  assert.match(html, /data-recognition-counts/);
  assert.match(html, /data-recognition-items/);
  assert.match(html, /data-recognition-reference/);
});

test("async app to real adapter renders bytes-derived safe partial details", async () => {
  const adapter = await import(`${pathToFileURL(browserAdapterPath).href}?dom-safe-partial=1`);
  const bytes = await readFile(resolve(repoRoot, "tests/fixtures/_qa_pdf_reference_3rf.pdf"));
  const file = new File([bytes], "實際圖說.pdf", { type: "application/pdf" });
  const sourceSha256 = createHash("sha256").update(bytes).digest("hex").toUpperCase();
  let result;
  let settled;
  const settledPromise = new Promise((resolveSettled) => { settled = resolveSettled; });
  const harness = await initializeManualFileHandlerHarness(
    "safe-partial",
    async (selectedFile) => {
      result = await adapter.recognizeDrawingFile(selectedFile, {
        dependencies: {
          async presentSelectedPdfFile() {
            return {
              pageCount: 1,
              selectedPageNumber: 1,
              referenceRaster: {
                available: true,
                dataUrl: "data:image/png;base64,iVBORw0KGgo=",
                naturalWidth: 320,
                naturalHeight: 240,
                pageNumber: 1,
                sourceDocumentSha256: sourceSha256,
              },
            };
          },
        },
      });
      settled();
      return result;
    },
  );
  harness.dispatchFile(file);
  await settledPromise;
  await nextTurn();
  assert.equal(result.status, "partial");
  assert.equal(harness.recognitionState(), "partial");
  assert.match(harness.recognitionText("[data-recognition-pages]"), /第 1 頁/);
  for (const row of result.classificationCounts) {
    assert.match(
      harness.recognitionText("[data-recognition-counts]"),
      new RegExp(`${row.label}[^0-9]*${row.count}`),
    );
  }
  const visibleUncertainty = harness.recognitionText("[data-recognition-items]");
  assert.ok(result.uncertainty.length > 0, "fixture must expose a representative uncertainty");
  for (const item of result.uncertainty) {
    assert.match(visibleUncertainty, new RegExp(item.reason));
    assert.match(visibleUncertainty, new RegExp(item.nextAction));
  }
  assert.equal(
    visibleUncertainty.includes(result.uncertainty[0].id),
    false,
    "internal source/object ID must not appear in visible DOM text",
  );
  assert.equal(
    harness.recognitionReference().src,
    result.presentationReference.dataUrl,
  );
  assert.equal(harness.recognitionReference().hidden, false);
});

test("missing or mismatched presentation SHA never reaches the UI image", async () => {
  const adapter = await import(`${pathToFileURL(browserAdapterPath).href}?dom-reference-sha=1`);
  const bytes = await readFile(resolve(repoRoot, "tests/fixtures/_qa_pdf_reference_3rf.pdf"));
  for (const [label, sourceDocumentSha256] of [
    ["missing", undefined],
    ["mismatch", "B".repeat(64)],
  ]) {
    let result;
    let settled;
    const settledPromise = new Promise((resolveSettled) => { settled = resolveSettled; });
    const harness = await initializeManualFileHandlerHarness(
      `reference-${label}`,
      async (selectedFile) => {
        result = await adapter.recognizeDrawingFile(selectedFile, {
          dependencies: {
            async presentSelectedPdfFile() {
              return {
                pageCount: 1,
                selectedPageNumber: 1,
                referenceRaster: {
                  available: true,
                  dataUrl: "data:image/png;base64,iVBORw0KGgo=",
                  naturalWidth: 320,
                  naturalHeight: 240,
                  pageNumber: 1,
                  sourceDocumentSha256,
                },
              };
            },
          },
        });
        settled();
        return result;
      },
    );
    harness.dispatchFile(new File([bytes], `${label}.pdf`, { type: "application/pdf" }));
    await settledPromise;
    await nextTurn();
    assert.equal(result.presentationReference.available, false, label);
    assert.equal(result.presentationReference.dataUrl, null, label);
    assert.equal(harness.recognitionReference().src, "", label);
    assert.equal(harness.recognitionReference().hidden, true, label);
  }
});

test("async app to real adapter shows active rejection without downstream parsing", async () => {
  const adapter = await import(`${pathToFileURL(browserAdapterPath).href}?dom-active=1`);
  const bytes = await readFile(resolve(
    repoRoot,
    "tests/fixtures/a0-canonical-repair/launch.pdf",
  ));
  const calls = { presentation: 0, extraction: 0, recognition: 0 };
  let settled;
  const settledPromise = new Promise((resolveSettled) => { settled = resolveSettled; });
  const harness = await initializeManualFileHandlerHarness(
    "active-rejection",
    async (selectedFile) => {
      const result = await adapter.recognizeDrawingFile(selectedFile, {
        dependencies: {
          async presentSelectedPdfFile() { calls.presentation += 1; },
          async extractScene() { calls.extraction += 1; },
          recognizePdfObjects() { calls.recognition += 1; },
        },
      });
      settled();
      return result;
    },
  );
  harness.dispatchFile(new File([bytes], "含動作圖說.pdf", { type: "application/pdf" }));
  await settledPromise;
  await nextTurn();
  assert.equal(harness.visibleState(), "FAILURE");
  assert.equal(harness.recognitionState(), "unsupported");
  assert.match(harness.failureReason(), /主動內容|外部動作/);
  assert.deepEqual(calls, { presentation: 0, extraction: 0, recognition: 0 });
});

test("inspection unavailable has distinct product copy and never claims active content", async () => {
  const adapter = await import(`${pathToFileURL(browserAdapterPath).href}?dom-inspection-unavailable=1`);
  const bytes = await readFile(resolve(repoRoot, "tests/fixtures/_qa_pdf_reference_3rf.pdf"));
  let settled;
  const settledPromise = new Promise((resolveSettled) => { settled = resolveSettled; });
  const harness = await initializeManualFileHandlerHarness(
    "inspection-unavailable",
    async (selectedFile) => {
      const result = await adapter.recognizeDrawingFile(selectedFile, {
        dependencies: {
          async inspectActiveContent() {
            throw new Error("inspection unavailable");
          },
        },
      });
      settled();
      return result;
    },
  );
  harness.dispatchFile(new File([bytes], "待檢查圖說.pdf", { type: "application/pdf" }));
  await settledPromise;
  await nextTurn();
  assert.equal(harness.visibleState(), "FAILURE");
  assert.match(harness.failureReason(), /安全檢查.*無法完成|無法完成.*安全檢查/);
  assert.doesNotMatch(harness.failureReason(), /已確認.*主動內容|含有主動內容|外部動作/);
});

test("async stale first selection cannot overwrite newer active rejection", async () => {
  const adapter = await import(`${pathToFileURL(browserAdapterPath).href}?dom-stale=1`);
  const safeBytes = await readFile(resolve(repoRoot, "tests/fixtures/_qa_pdf_reference_3rf.pdf"));
  const activeBytes = await readFile(resolve(
    repoRoot,
    "tests/fixtures/a0-canonical-repair/uri.pdf",
  ));
  let releaseFirst;
  const firstGate = new Promise((resolveFirst) => { releaseFirst = resolveFirst; });
  let callCount = 0;
  let secondSettled;
  const secondSettledPromise = new Promise((resolveSecond) => { secondSettled = resolveSecond; });
  const harness = await initializeManualFileHandlerHarness(
    "stale-selection",
    async (selectedFile) => {
      callCount += 1;
      if (callCount === 1) await firstGate;
      const result = await adapter.recognizeDrawingFile(selectedFile, {
        dependencies: {
          async presentSelectedPdfFile() {
            return { pageCount: 1, selectedPageNumber: 1 };
          },
        },
      });
      if (callCount === 2) secondSettled();
      return result;
    },
  );
  harness.dispatchFile(new File([safeBytes], "舊圖說.pdf", { type: "application/pdf" }));
  harness.dispatchFile(new File([activeBytes], "新圖說.pdf", { type: "application/pdf" }));
  await secondSettledPromise;
  await nextTurn();
  assert.equal(harness.visibleState(), "FAILURE");
  assert.equal(harness.recognitionState(), "unsupported");
  releaseFirst();
  await nextTurn();
  await nextTurn();
  assert.equal(harness.visibleState(), "FAILURE");
  assert.equal(harness.recognitionState(), "unsupported");
  assert.equal(harness.selectedName(), "新圖說.pdf");
});

test("DRS route shell recovery links and reload reset remain intact", async () => {
  const [html, app] = await Promise.all([readOrEmpty(htmlPath), readOrEmpty(appPath)]);
  const visible = stripNonVisibleHtml(html);
  assert.equal(existsSync(browserAdapterPath), true);
  assert.equal(existsSync(legacyPlanPuzzlePagePath), false);
  assert.match(html, /href="\.\.\/public_home\/code\.html#top"/);
  assert.match(html, /href="\.\.\/quote_check\/code\.html"/);
  assert.match(visible, /萊比 DRS/);
  assert.match(visible, /返回萊比首頁/);
  assert.doesNotMatch(visible, /AI PCM|返回 PCM 首頁/);
  assert.match(app, /renderState\(resolveDrawingCheckState\(\{ step: "INTRODUCTION" \}\)\)/);
  assert.doesNotMatch(app, /localStorage|sessionStorage/);
});

test("closed result copy acknowledges local recognition without claiming a saved record", async () => {
  const [html, app] = await Promise.all([readOrEmpty(htmlPath), readOrEmpty(appPath)]);
  const visible = stripNonVisibleHtml(html);
  assert.match(visible, /尚未產生可保存的圖面辨識摘要/);
  assert.match(visible, /尚未形成正式案件紀錄/);
  assert.match(app, /尚未產生可保存的圖面辨識摘要/);
  assert.doesNotMatch(visible, /本頁沒有[^。]*圖面解析/);
  assert.doesNotMatch(app, /本頁沒有[^。]*正式解析/);
});

test("result boundary includes drawing-only recovery to the existing quote check", async () => {
  const html = await readOrEmpty(htmlPath);
  const visible = stripNonVisibleHtml(html);
  assert.match(visible, /只有圖說，尚缺報價/);
  assert.match(visible, /引用圖說/);
  assert.match(visible, /仍不確定事項/);
  assert.match(visible, /下一責任人/);
  assert.match(visible, /案件紀錄/);
  assert.match(html, /href="\.\.\/quote_check\/code\.html"/);
});

test("failure states are closed actionable responsible and recoverable", async () => {
  const module = await importDrawingModule("failure-contract");
  const failures = module.DRAWING_CHECK_FAILURES;
  assert.ok(Object.isFrozen(failures));
  assert.deepEqual(Object.keys(failures).sort(), [...requiredFailures].sort());
  for (const code of requiredFailures) {
    const state = failures[code];
    assert.equal(state.code, code);
    assert.equal(state.type, "CLOSED");
    assert.equal(typeof state.reason, "string");
    assert.ok(state.reason.length > 0, `${code} reason`);
    assert.equal(typeof state.nextAction, "string");
    assert.ok(state.nextAction.length > 0, `${code} nextAction`);
    assert.equal(typeof state.responsibleRole, "string");
    assert.ok(state.responsibleRole.length > 0, `${code} responsibleRole`);
    assert.match(state.returnStep, /^[A-Z_]+$/);
    assert.match(state.recoveryStep, /^[A-Z_]+$/);
    assert.equal(typeof state.payloadPolicy, "string");
    assert.equal(state.mutationAllowed, false);
    assert.equal(state.writeAuthority, "NONE");
    assert.equal(state.caseData, null);
    assertZeroAuthorityActions(state.actions, code);
    assert.ok(Object.isFrozen(state));
  }
  assert.match(
    failures.FILE_FORMAT_INVALID.reason,
    /瀏覽器.*檔案標示|檔案標示.*讀取/,
  );
  assert.match(failures.DRAWING_ONLY_QUOTE_MISSING.reason, /只有圖說|尚缺報價/);
  assert.match(
    failures.SECURITY_INSPECTION_UNAVAILABLE.reason,
    /安全檢查.*無法完成|無法完成.*安全檢查/,
  );
  assert.doesNotMatch(
    failures.SECURITY_INSPECTION_UNAVAILABLE.reason,
    /已確認.*主動內容|含有主動內容|外部動作/,
  );
});

test("state resolver is strict zero-case-data and survives hostile context", async () => {
  const module = await importDrawingModule("hostile-state-contract");
  const resolveState = module.resolveDrawingCheckState;
  assert.equal(typeof resolveState, "function");
  const getterInput = {};
  let getterCalls = 0;
  Object.defineProperty(getterInput, "step", {
    configurable: true,
    get() {
      getterCalls += 1;
      return "RESULT_FORMAT";
    },
  });
  const revoked = Proxy.revocable({ step: "RESULT_FORMAT" }, {});
  revoked.revoke();
  assert.equal(resolveState({ step: "UNKNOWN" }).code, "CONTEXT_UNAVAILABLE");
  assert.equal(resolveState({}).code, "CONTEXT_UNAVAILABLE");
  assert.equal(resolveState(null).code, "CONTEXT_UNAVAILABLE");
  assert.equal(
    resolveState(Object.create({ step: "RESULT_FORMAT" })).code,
    "CONTEXT_UNAVAILABLE",
  );
  assert.equal(
    resolveState({ step: "INTRODUCTION", extra: true }).code,
    "CONTEXT_UNAVAILABLE",
  );
  assert.equal(resolveState(getterInput).code, "CONTEXT_UNAVAILABLE");
  assert.equal(getterCalls, 0);
  assert.doesNotThrow(() => resolveState(revoked.proxy));
  assert.equal(resolveState(revoked.proxy).code, "CONTEXT_UNAVAILABLE");
  assert.equal(resolveState({ step: "INTRODUCTION" }).code, "INTRODUCTION");
  assert.equal(
    resolveState({
      step: "FAILURE",
      failureCode: "DRAWING_ONLY_QUOTE_MISSING",
    }).code,
    "DRAWING_ONLY_QUOTE_MISSING",
  );
  const unknown = resolveState({ step: "UNKNOWN" });
  assert.equal(unknown.caseData, null);
  assert.equal(unknown.mutationAllowed, false);
  assert.equal(unknown.writeAuthority, "NONE");
  assertZeroAuthorityActions(unknown.actions, "unknown state");
});

test("zero-authority actions ignore inherited array slots and iterator injection", async () => {
  const module = await importDrawingModule("zero-actions-pollution");
  const indexDescriptor = Object.getOwnPropertyDescriptor(Array.prototype, "0");
  const iteratorDescriptor = Object.getOwnPropertyDescriptor(
    Array.prototype,
    Symbol.iterator,
  );
  Object.defineProperty(Array.prototype, "0", {
    configurable: true,
    value: { action: "INJECTED" },
  });
  Object.defineProperty(Array.prototype, Symbol.iterator, {
    configurable: true,
    value: function* poisonedArrayIterator() {
      yield { action: "INJECTED" };
    },
  });
  const observations = Object.create(null);
  try {
    const introductionActions = module.DRAWING_CHECK_STATES.INTRODUCTION.actions;
    observations.introduction = {
      prototype: Object.getPrototypeOf(introductionActions),
      index: introductionActions[0],
      spread: [...introductionActions],
    };
    const failureActions = module.DRAWING_CHECK_FAILURES.FILE_FORMAT_INVALID.actions;
    observations.failure = {
      prototype: Object.getPrototypeOf(failureActions),
      index: failureActions[0],
      spread: [...failureActions],
    };
    const unknownActions = module.resolveDrawingCheckState({ step: "UNKNOWN" }).actions;
    observations.unknown = {
      prototype: Object.getPrototypeOf(unknownActions),
      index: unknownActions[0],
      spread: [...unknownActions],
    };
  } finally {
    if (indexDescriptor) Object.defineProperty(Array.prototype, "0", indexDescriptor);
    else delete Array.prototype[0];
    if (iteratorDescriptor) {
      Object.defineProperty(Array.prototype, Symbol.iterator, iteratorDescriptor);
    } else {
      delete Array.prototype[Symbol.iterator];
    }
  }
  for (const [label, observation] of Object.entries(observations)) {
    assert.equal(observation.prototype, null, `${label} prototype`);
    assert.equal(observation.index, undefined, `${label} index`);
    assert.deepEqual(observation.spread, [], `${label} spread`);
  }
});

test("hero projection is canonical state-owned and cannot move backward", async () => {
  const module = await importDrawingModule("hero-contract");
  const project = module.projectDrawingCheckHeroAction;
  const validationAction = project(module.DRAWING_CHECK_STATES.VALIDATION_PENDING);
  assert.deepEqual(
    { enabled: validationAction.enabled, target: validationAction.target },
    { enabled: true, target: "CORRECTION_REQUIRED" },
  );
  const consentAction = project(module.DRAWING_CHECK_STATES.CONSENT);
  assert.equal(consentAction.enabled, false);
  assert.equal(consentAction.target, null);

  let proxyGets = 0;
  const lookalike = new Proxy({ code: "INTRODUCTION" }, {
    get() {
      proxyGets += 1;
      throw new Error("projection must not read caller properties");
    },
  });
  const unknownAction = project(lookalike);
  assert.equal(proxyGets, 0);
  assert.equal(unknownAction.enabled, false);
  assert.equal(unknownAction.target, null);
  assert.equal(Object.isFrozen(unknownAction), true);
});

test("actual file handler rejects non-PDF metadata and renamed text", async () => {
  const harness = await initializeFileHandlerHarness("renamed-text-handler");
  harness.dispatchFile(browserFile("圖說.txt", "text/plain"));
  assert.equal(harness.visibleState(), "FAILURE");
  assert.doesNotThrow(() => {
    harness.dispatchFile(browserFile("圖說.pdf", "text/plain"));
  });
  assert.equal(harness.visibleState(), "FAILURE");
  assert.match(harness.failureReason(), /檔案標示|PDF/);
  assert.equal(harness.selectedName(), "尚未選擇");
  assert.equal(harness.inputValue(), "");
});

test("actual file handler fails closed for hostile lists getters and proxies", async () => {
  const throwingFiles = await initializeFileHandlerHarness("throwing-files-getter");
  Object.defineProperty(throwingFiles.fileInput, "files", {
    configurable: true,
    get() {
      throw new Error("files getter must not escape");
    },
  });
  assert.doesNotThrow(() => throwingFiles.dispatchChange());
  assert.equal(throwingFiles.visibleState(), "FAILURE");

  const sparseList = await initializeFileHandlerHarness("sparse-files-list");
  assert.doesNotThrow(() => sparseList.dispatchFiles(new Array(1)));
  assert.equal(sparseList.visibleState(), "FAILURE");

  const revokedList = await initializeFileHandlerHarness("revoked-files-proxy");
  const revoked = Proxy.revocable({ length: 1 }, {});
  revoked.revoke();
  assert.doesNotThrow(() => revokedList.dispatchFiles(revoked.proxy));
  assert.equal(revokedList.visibleState(), "FAILURE");

  const multiple = await initializeFileHandlerHarness("multiple-files-list");
  assert.doesNotThrow(() => multiple.dispatchFiles(new HarnessFileList([
    browserFile("A.pdf", "application/pdf"),
    browserFile("B.pdf", "application/pdf"),
  ])));
  assert.equal(multiple.visibleState(), "FAILURE");
});

test("actual file handler rejects inherited slots and own metadata shadows", async () => {
  const inherited = await initializeFileHandlerHarness("inherited-array-slot");
  const inheritedFiles = runInNewContext(
    "Array.prototype[0] = file; new Array(1)",
    { file: browserFile("繼承圖說.pdf", "application/pdf") },
  );
  assert.doesNotThrow(() => inherited.dispatchFiles(inheritedFiles));
  assert.equal(inherited.visibleState(), "FAILURE");

  const shadowed = await initializeFileHandlerHarness("own-metadata-shadow");
  const shadowedFile = browserFile("原始文字.txt", "text/plain");
  Object.defineProperty(shadowedFile, "name", {
    configurable: true,
    enumerable: true,
    value: "偽造圖說.pdf",
  });
  Object.defineProperty(shadowedFile, "type", {
    configurable: true,
    enumerable: true,
    value: "application/pdf",
  });
  assert.doesNotThrow(() => shadowed.dispatchFile(shadowedFile));
  assert.equal(shadowed.visibleState(), "FAILURE");
  assert.equal(shadowed.selectedName(), "尚未選擇");
});

test("actual file handler accepts a genuine branded File subclass as metadata pending", async () => {
  class BrowserFileSubclass extends File {}
  const harness = await initializeFileHandlerHarness("genuine-file-subclass");
  const file = new BrowserFileSubclass(
    ["local test bytes"],
    "施工圖_A03.pdf",
    { type: "application/pdf" },
  );
  assert.doesNotThrow(() => harness.dispatchFile(file));
  assert.equal(harness.visibleState(), "VALIDATION_PENDING");
  assert.equal(harness.selectedName(), "施工圖_A03.pdf");
  assert.equal(harness.focusedPanel(), "VALIDATION_PENDING");
  assert.deepEqual(harness.heroAction(), {
    ariaDisabled: "false",
    disabled: false,
    label: "查看待確認清單",
    target: "CORRECTION_REQUIRED",
  });
  harness.dispatchHero();
  assert.equal(harness.visibleState(), "CORRECTION_REQUIRED");
  assert.equal(harness.focusedPanel(), "CORRECTION_REQUIRED");
});

test("unsafe file metadata never calls throwing own getters or leaks", async () => {
  const harness = await initializeFileHandlerHarness("throwing-metadata");
  const file = browserFile("原始圖說.pdf", "application/pdf");
  let getterCalls = 0;
  Object.defineProperty(file, "name", {
    configurable: true,
    get() {
      getterCalls += 1;
      throw new Error("name getter must not escape");
    },
  });
  assert.doesNotThrow(() => harness.dispatchFile(file));
  assert.equal(getterCalls, 0);
  assert.equal(harness.visibleState(), "FAILURE");
  assert.match(harness.failureReason(), /內容格式仍未驗證/);
});

test("post-load shared intrinsic pollution cannot rewrite file selection", async () => {
  const harness = await initializeFileHandlerHarness("post-load-intrinsics");
  const descriptors = {
    test: Object.getOwnPropertyDescriptor(RegExp.prototype, "test"),
    trim: Object.getOwnPropertyDescriptor(String.prototype, "trim"),
    lower: Object.getOwnPropertyDescriptor(String.prototype, "toLowerCase"),
  };
  Object.defineProperty(RegExp.prototype, "test", {
    configurable: true,
    value() {
      throw new Error("poisoned test");
    },
  });
  Object.defineProperty(String.prototype, "trim", {
    configurable: true,
    value() {
      throw new Error("poisoned trim");
    },
  });
  Object.defineProperty(String.prototype, "toLowerCase", {
    configurable: true,
    value() {
      return "application/pdf";
    },
  });
  try {
    assert.doesNotThrow(() => {
      harness.dispatchFile(browserFile("施工圖.pdf", "application/pdf"));
    });
    assert.equal(harness.visibleState(), "VALIDATION_PENDING");
  } finally {
    Object.defineProperty(RegExp.prototype, "test", descriptors.test);
    Object.defineProperty(String.prototype, "trim", descriptors.trim);
    Object.defineProperty(String.prototype, "toLowerCase", descriptors.lower);
  }
});

test("invalid replacement clears stale name input and recovery moves focus", async () => {
  const harness = await initializeFileHandlerHarness("stale-replacement");
  harness.dispatchFile(browserFile("施工圖_A03.pdf", "application/pdf"));
  assert.equal(harness.selectedName(), "施工圖_A03.pdf");
  harness.dispatchFile(browserFile("替換檔.pdf", "text/plain"));
  assert.equal(harness.visibleState(), "FAILURE");
  assert.equal(harness.selectedName(), "尚未選擇");
  assert.equal(harness.inputValue(), "");
  assert.equal(harness.focusedPanel(), "FAILURE");
  harness.dispatchRecover();
  assert.equal(harness.visibleState(), "RESELECT_FILE");
  assert.equal(harness.focusedPanel(), "RESELECT_FILE");
  assert.notEqual(harness.focusedPanel(), undefined);
});

test("empty selection cancels safely without stale identity or CTA regression", async () => {
  const harness = await initializeFileHandlerHarness("empty-selection");
  harness.dispatchFile(browserFile("施工圖_A03.pdf", "application/pdf"));
  assert.equal(harness.visibleState(), "VALIDATION_PENDING");
  harness.dispatchFile(null);
  assert.equal(harness.visibleState(), "SELECT_FILE");
  assert.equal(harness.selectedName(), "尚未選擇");
  assert.equal(harness.inputValue(), "");
  assert.deepEqual(harness.heroAction(), {
    ariaDisabled: "false",
    disabled: false,
    label: "選擇圖說 PDF",
    target: "OPEN_FILE",
  });
  harness.dispatchHero();
  assert.equal(harness.visibleState(), "SELECT_FILE");
  assert.equal(harness.pickerClicks(), 1);
});

test("responsive visual source keeps contrast focus 44px and narrow-viewport facts", async () => {
  const [css, sharedTokens, sharedShell] = await Promise.all([
    readOrEmpty(cssPath),
    readFile(sharedTokenPath, "utf8"),
    readFile(sharedShellPath, "utf8"),
  ]);
  assert.match(css, /@media\s*\(max-width:\s*900px\)/);
  assert.match(css, /@media\s*\(max-width:\s*620px\)/);
  assert.match(
    css,
    /@media\s*\(max-width:\s*620px\)\s*and\s*\(max-height:\s*900px\)/,
  );
  assert.match(css, /@media\s*\(prefers-reduced-motion:\s*reduce\)/);
  assert.match(`${css}\n${sharedShell}`, /:focus-visible/);
  assert.match(`${css}\n${sharedShell}`, /44px|--owner-first-control-min/);
  assert.match(sharedShell, /overflow-x:\s*clip/);
  assert.match(css, /\.owner-first-facts/);
  assert.match(css, /\.drawing-hero__continuation/);

  const textColor = css.match(
    /\[data-drawing-check-page\]\s+\.owner-first-primary-action\s*\{[^}]*color:\s*(#[0-9a-f]{6})/i,
  )?.[1]?.toLowerCase();
  assert.equal(textColor, "#080b0d");
  for (const name of ["start", "mid", "end"]) {
    const background = sharedTokens.match(
      new RegExp(`--owner-first-primary-${name}:\\s*(#[0-9a-f]{6})`, "i"),
    )?.[1]?.toLowerCase();
    assert.ok(background, `${name} gradient stop`);
    assert.ok(
      contrastRatio(textColor, background) >= 4.5,
      `${textColor} on ${background}`,
    );
  }
});

test("all local references resolve and no CDN is introduced", async () => {
  const html = await readOrEmpty(htmlPath);
  const references = [...html.matchAll(/(?:href|src)="([^"]+)"/g)]
    .map((match) => match[1])
    .filter((value) => !value.startsWith("#"));
  assert.ok(references.length >= 5, "expected local logo, styles, script, and routes");
  for (const reference of references) {
    assert.doesNotMatch(reference, /^(?:https?:)?\/\//i, reference);
    const [fileReference] = reference.split("#");
    assert.equal(
      existsSync(resolve(drawingDir, fileReference)),
      true,
      reference,
    );
  }
});

test("visible language stays owner-first and excludes forbidden claims", async () => {
  const html = await readOrEmpty(htmlPath);
  const visible = stripNonVisibleHtml(html);
  assert.match(visible, /決策|確認/);
  assert.match(visible, /文件|圖說/);
  assert.match(visible, /紀錄/);
  assert.doesNotMatch(
    visible,
    /媒合|低價競標|保證最低價|保證最好|零風險|消滅詐騙|金流託管|支付託管|代收代付|老屋煉金|投資報酬/,
  );
  assert.doesNotMatch(
    visible,
    /\bDB\b|\bAPI\b|n8n|GitHub truth|source clean|debug|mock-only|本機候選|無 DB 寫入|功能停用|API 未開|raw JSON|stack trace/i,
  );
});

test("drawing source JavaScript passes syntax validation", async () => {
  assert.equal(existsSync(appPath), true, "app.js must exist before syntax check");
  const result = await execFileAsync(process.execPath, ["--check", appPath], {
    cwd: repoRoot,
    encoding: "utf8",
  });
  assert.equal(result.stderr, "");
});
