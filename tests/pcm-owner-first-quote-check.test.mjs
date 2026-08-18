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

const testDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(testDir, "..");
const quoteDir = resolve(
  repoRoot,
  "src/stitch_laibe_landing_onboarding/pcm_standalone/quote_check",
);
const htmlPath = resolve(quoteDir, "code.html");
const cssPath = resolve(quoteDir, "styles.css");
const appPath = resolve(quoteDir, "app.js");
const quotePdfFixtureDir = resolve(
  repoRoot,
  "tests/budget/fixtures/quote-healthcheck-pdf",
);
const sharedTokenPath = resolve(quoteDir, "../shared/owner-first-tokens.css");
const sharedShellPath = resolve(quoteDir, "../shared/owner-first-shell.css");
const routeManifestPath = resolve(
  repoRoot,
  "src/stitch_laibe_landing_onboarding/pcm_standalone/public/pcm-flow-route-manifest.js",
);
const publicContractPath = resolve(
  repoRoot,
  "src/stitch_laibe_landing_onboarding/pcm_standalone/public/public-contract.js",
);
const governancePath = resolve(
  repoRoot,
  "docs/governance/pcm-owner-first-execution-manifest.v1.json",
);
const planPath = resolve(
  repoRoot,
  "docs/superpowers/plans/2026-08-03-laibe-pcm-end-to-end-flow-integration.md",
);
const specPath = resolve(
  repoRoot,
  "docs/superpowers/specs/2026-08-03-pcm-owner-first-full-site-design.md",
);
const execFileAsync = promisify(execFile);
const immutableT3Candidate = "238f8180af9e6a1a8d7dd7a71303cd4031324775";
const immutableT3ContrastCandidate = "74b606297c391615d76de505759bceda4756ec57";
const immutableT3HeroActionCandidate = "e7a12315d5d7a8aff6b6d12778a9e404b68a96a6";

const exactNine = Object.freeze([
  "src/stitch_laibe_landing_onboarding/pcm_standalone/quote_check/code.html",
  "src/stitch_laibe_landing_onboarding/pcm_standalone/quote_check/styles.css",
  "src/stitch_laibe_landing_onboarding/pcm_standalone/quote_check/app.js",
  "tests/pcm-owner-first-quote-check.test.mjs",
  "src/stitch_laibe_landing_onboarding/pcm_standalone/public/pcm-flow-route-manifest.js",
  "src/stitch_laibe_landing_onboarding/pcm_standalone/public/public-contract.js",
  "docs/superpowers/specs/2026-08-03-pcm-owner-first-full-site-design.md",
  "docs/superpowers/plans/2026-08-03-laibe-pcm-end-to-end-flow-integration.md",
  "docs/governance/pcm-owner-first-execution-manifest.v1.json",
]);

const correctionEight = Object.freeze([
  "src/stitch_laibe_landing_onboarding/pcm_standalone/quote_check/app.js",
  "src/stitch_laibe_landing_onboarding/pcm_standalone/quote_check/code.html",
  "tests/pcm-owner-first-quote-check.test.mjs",
  "tests/pcm-owner-first-public-home.test.mjs",
  "tests/pcm-owner-first-route-manifest.test.mjs",
  "docs/governance/pcm-owner-first-execution-manifest.v1.json",
  "docs/superpowers/plans/2026-08-03-laibe-pcm-end-to-end-flow-integration.md",
  "docs/superpowers/specs/2026-08-03-pcm-owner-first-full-site-design.md",
]);

const inputSafetyFive = Object.freeze([
  "src/stitch_laibe_landing_onboarding/pcm_standalone/quote_check/app.js",
  "tests/pcm-owner-first-quote-check.test.mjs",
  "docs/governance/pcm-owner-first-execution-manifest.v1.json",
  "docs/superpowers/plans/2026-08-03-laibe-pcm-end-to-end-flow-integration.md",
  "docs/superpowers/specs/2026-08-03-pcm-owner-first-full-site-design.md",
]);

const ownDataBoundarySix = Object.freeze([
  "src/stitch_laibe_landing_onboarding/pcm_standalone/quote_check/app.js",
  "tests/pcm-owner-first-quote-check.test.mjs",
  "tests/pcm-governance-pages.test.mjs",
  "docs/governance/pcm-owner-first-execution-manifest.v1.json",
  "docs/superpowers/plans/2026-08-03-laibe-pcm-end-to-end-flow-integration.md",
  "docs/superpowers/specs/2026-08-03-pcm-owner-first-full-site-design.md",
]);

const finalExactSeven = Object.freeze([
  "src/stitch_laibe_landing_onboarding/pcm_standalone/quote_check/app.js",
  "src/stitch_laibe_landing_onboarding/pcm_standalone/quote_check/code.html",
  "src/stitch_laibe_landing_onboarding/pcm_standalone/quote_check/styles.css",
  "tests/pcm-owner-first-quote-check.test.mjs",
  "docs/governance/pcm-owner-first-execution-manifest.v1.json",
  "docs/superpowers/plans/2026-08-03-laibe-pcm-end-to-end-flow-integration.md",
  "docs/superpowers/specs/2026-08-03-pcm-owner-first-full-site-design.md",
]);

const contrastExactFive = Object.freeze([
  "src/stitch_laibe_landing_onboarding/pcm_standalone/quote_check/styles.css",
  "tests/pcm-owner-first-quote-check.test.mjs",
  "docs/governance/pcm-owner-first-execution-manifest.v1.json",
  "docs/superpowers/plans/2026-08-03-laibe-pcm-end-to-end-flow-integration.md",
  "docs/superpowers/specs/2026-08-03-pcm-owner-first-full-site-design.md",
]);

const heroActionExactFive = Object.freeze([
  "src/stitch_laibe_landing_onboarding/pcm_standalone/quote_check/app.js",
  "tests/pcm-owner-first-quote-check.test.mjs",
  "docs/governance/pcm-owner-first-execution-manifest.v1.json",
  "docs/superpowers/plans/2026-08-03-laibe-pcm-end-to-end-flow-integration.md",
  "docs/superpowers/specs/2026-08-03-pcm-owner-first-full-site-design.md",
]);

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
  "DUPLICATE_SUBMISSION",
  "VERSION_CONFLICT",
  "QUOTE_ONLY_DRAWING_MISSING",
]);

async function readOrEmpty(path) {
  try {
    return await readFile(path, "utf8");
  } catch {
    return "";
  }
}

async function immutableCommitBytes(commit, path) {
  const { stdout } = await execFileAsync(
    "git",
    ["show", `${commit}:${path}`],
    { cwd: repoRoot, encoding: null, maxBuffer: 16 * 1024 * 1024 },
  );
  return stdout;
}

async function immutableCandidateBytes(path) {
  return immutableCommitBytes(immutableT3Candidate, path);
}

async function immutableDeclaredBlobBytes(blob, label) {
  const { stdout } = await execFileAsync("git", ["cat-file", "blob", blob], {
    cwd: repoRoot,
    encoding: null,
    maxBuffer: 16 * 1024 * 1024,
  });
  assert.ok(Buffer.isBuffer(stdout), label);
  return stdout;
}

async function assertResolvableBlob(blob, label) {
  const { stdout } = await execFileAsync("git", ["cat-file", "-t", blob], {
    cwd: repoRoot,
    encoding: "utf8",
  });
  assert.equal(stdout.trim(), "blob", label);
}

function stripNonVisibleHtml(html) {
  return html
    .replace(/<script\b[\s\S]*?<\/script>/gi, "")
    .replace(/<style\b[\s\S]*?<\/style>/gi, "")
    .replace(/<template\b[\s\S]*?<\/template>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ");
}

function gitBlobSha1(bytes) {
  return createHash("sha1")
    .update(`blob ${bytes.length}\0`)
    .update(bytes)
    .digest("hex");
}

function rgbChannels(hex) {
  const normalized = hex.replace("#", "");
  return [0, 2, 4].map((offset) => Number.parseInt(normalized.slice(offset, offset + 2), 16));
}

function relativeLuminance(hex) {
  const channels = rgbChannels(hex).map((channel) => {
    const value = channel / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return (0.2126 * channels[0]) + (0.7152 * channels[1]) + (0.0722 * channels[2]);
}

function contrastRatio(foreground, background) {
  const light = Math.max(relativeLuminance(foreground), relativeLuminance(background));
  const dark = Math.min(relativeLuminance(foreground), relativeLuminance(background));
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

class HarnessElement {
  getAttribute(name) {
    return this.attributes.get(name) ?? null;
  }
}

function browserFile(name, type) {
  return new File(["local test bytes"], name, { type });
}

async function readableQuoteFile(name = "報價.pdf", type = "application/pdf") {
  return quoteFixtureFile("readable-quote.pdf", name, type);
}

async function quoteFixtureFile(
  fixtureName,
  name = "報價.pdf",
  type = "application/pdf",
) {
  return new File(
    [await readFile(resolve(quotePdfFixtureDir, fixtureName))],
    name,
    { type },
  );
}

function createFileHandlerHarness() {
  let focusedPanelCode = null;
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
  const listeners = new Map();
  const heroStart = {
    attributes: new Map(),
    dataset: { heroStart: "", nextStep: "CONSENT" },
    disabled: false,
    textContent: "開始報價健檢準備",
    addEventListener(type, listener) {
      const key = `heroStart:${type}`;
      const prior = listeners.get(key);
      listeners.set(
        key,
        prior
          ? (...args) => {
            prior(...args);
            listener(...args);
          }
          : listener,
      );
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
  fileInput.click = () => {};
  const root = {
    querySelector(selector) {
      if (selector === "#quote-file") return fileInput;
      if (selector === "[data-hero-start]") return heroStart;
      if (selector === "[data-failure-recover]") return failureRecover;
      if (selector === "[data-failure-return]") return failureReturn;
      return failureTargets[selector] ?? null;
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
        return selector === "[data-quote-check-page]" ? root : null;
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
    selectedName() {
      return fileNameTarget.textContent;
    },
    inputValue() {
      return fileInput.value;
    },
    focusedPanel() {
      return focusedPanelCode;
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

async function importDocumentWorkspaceApp(tag) {
  const elementDescriptor = Object.getOwnPropertyDescriptor(globalThis, "Element");
  const fileListDescriptor = Object.getOwnPropertyDescriptor(globalThis, "FileList");
  const inputDescriptor = Object.getOwnPropertyDescriptor(globalThis, "HTMLInputElement");
  Object.defineProperty(globalThis, "Element", {
    configurable: true,
    value: HarnessElement,
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
    return await import(`${pathToFileURL(appPath).href}?${tag}-${Date.now()}`);
  } finally {
    if (elementDescriptor) {
      Object.defineProperty(globalThis, "Element", elementDescriptor);
    } else {
      delete globalThis.Element;
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
}

function createDocumentWorkspaceHarness() {
  let activeElement = null;
  const registeredNodes = new Set();
  const nodesById = new Map();

  function createNode(initial = {}, target = new HarnessElement()) {
    const listeners = new Map();
    Object.assign(target, {
      attributes: new Map(),
      children: [],
      dataset: {},
      disabled: false,
      hidden: false,
      id: "",
      tabIndex: 0,
      textContent: "",
      value: "",
    }, initial);
    target.addEventListener = (type, listener) => {
      const current = listeners.get(type) ?? [];
      current.push(listener);
      listeners.set(type, current);
    };
    target.dispatch = async (type, event = {}) => {
      const normalizedEvent = typeof Event !== "undefined" && event instanceof Event
        ? event
        : {
          preventDefault() {},
          ...event,
        };
      for (const listener of listeners.get(type) ?? []) {
        await listener(normalizedEvent);
      }
    };
    target.setAttribute = (name, value) => {
      target.attributes.set(name, String(value));
    };
    target.getAttribute = (name) => target.attributes.get(name) ?? null;
    target.removeAttribute = (name) => target.attributes.delete(name);
    target.focus = () => {
      activeElement = target;
    };
    target.append = (...children) => {
      target.children.push(...children);
    };
    target.replaceChildren = (...children) => {
      target.children = [...children];
    };
    target.querySelector = () => null;
    target.querySelectorAll = () => [];
    target.closest = () => null;
    target.getBoundingClientRect = () => ({ top: 120 });
    registeredNodes.add(target);
    if (target.id) nodesById.set(target.id, target);
    return target;
  }

  const kinds = ["quote", "contract", "drawing"];
  const tabs = Object.fromEntries(kinds.map((kind) => [kind, createNode({
    dataset: { documentTab: kind },
    id: `document-tab-${kind}`,
    tabIndex: kind === "quote" ? 0 : -1,
  })]));
  const panels = Object.fromEntries(kinds.map((kind) => [kind, createNode({
    dataset: { documentPanel: kind },
    hidden: kind !== "quote",
    id: `document-panel-${kind}`,
  })]));
  const feedback = Object.fromEntries(kinds.map((kind) => [kind, createNode({
    dataset: { documentFeedback: kind },
    id: `document-feedback-${kind}`,
    textContent: "尚未選擇檔案。",
  })]));
  const filename = Object.fromEntries(kinds.map((kind) => [kind, createNode({
    dataset: { documentFilename: kind },
  })]));
  const selectedRows = Object.fromEntries(kinds.map((kind) => [kind, createNode({
    dataset: { selectedFile: kind },
    hidden: true,
  })]));
  const dropzones = Object.fromEntries(kinds.map((kind) => [kind, createNode({
    dataset: { documentDropzone: kind },
  })]));
  const fileInputs = Object.fromEntries(kinds.map((kind) => {
    const input = createNode({
      dataset: { documentFile: kind },
      value: "",
    }, new HarnessHtmlInputElement());
    input.setAttribute("aria-describedby", `document-feedback-${kind}`);
    input.setAttribute("aria-invalid", "false");
    return [kind, input];
  }));
  const reportKinds = ["contract", "drawing"];
  const reportActions = Object.fromEntries(reportKinds.map((kind) => [kind, createNode({
    dataset: { aiReportAction: kind },
    disabled: true,
  })]));
  const reportStatuses = Object.fromEntries(reportKinds.map((kind) => [kind, createNode({
    dataset: { aiReportStatus: kind, reportState: "waiting-file" },
    textContent: "請先選擇 PDF。",
  })]));
  const parserStatuses = {
    quote: createNode({
      dataset: { parserStatus: "quote", parserState: "waiting-file" },
      textContent: "請先選擇 PDF。",
    }),
  };
  const parserSummary = createNode({
    dataset: { parserSummary: "quote" },
    hidden: true,
  });
  const summaryFields = {
    "[data-summary-page-count]": createNode({ textContent: "—" }),
    "[data-summary-item-count]": createNode({ textContent: "—" }),
    "[data-summary-readability]": createNode({ textContent: "—" }),
    "[data-summary-comparison]": createNode({ textContent: "—" }),
    "[data-summary-limitations]": createNode({
      textContent: "這份本機解析摘要不是案件正式報告。",
    }),
  };
  const itemSpecs = [
    ["quote", "quote-scope", "報價內容", "是否有項目只寫名稱，沒有規格或範圍？"],
    ["contract", "contract-change", "契約條款", "追加與變更由誰提出、誰確認？"],
    ["drawing", "drawing-version", "施工圖說", "圖名、日期與版次是否能辨識？"],
  ];
  const checkItems = itemSpecs.map(([kind, id, category, question]) => {
    const radios = ["unconfirmed", "clear", "needs-info", "uncertain"].map((value) =>
      createNode({ checked: value === "unconfirmed", value }));
    const legend = createNode({ textContent: `01 ${question}` });
    const note = createNode({ value: "" });
    const owner = createNode({ value: "owner" });
    const details = createNode({ hidden: true });
    const item = createNode({
      dataset: {
        checkCategory: category,
        checkId: id,
        checkKind: kind,
      },
      id: `check-${id}`,
      tabIndex: -1,
    });
    item.querySelector = (selector) => {
      if (selector === 'input[type="radio"]:checked') {
        return radios.find((radio) => radio.checked) ?? null;
      }
      if (selector === "legend") return legend;
      if (selector === "[data-check-note]") return note;
      if (selector === "[data-check-owner]") return owner;
      if (selector === "[data-check-details]") return details;
      return null;
    };
    item.closest = (selector) => selector === "[data-document-panel]" ? panels[kind] : null;
    item.radios = radios;
    item.note = note;
    item.owner = owner;
    item.details = details;
    return item;
  });
  const items = Object.fromEntries(checkItems.map((item) => [item.dataset.checkKind, item]));
  const summaryTargets = {
    "[data-summary-confirmed]": createNode(),
    "[data-summary-needs-info]": createNode(),
    "[data-summary-uncertain]": createNode(),
    "[data-summary-owner]": createNode(),
    "[data-summary-provider]": createNode(),
  };
  const tabStatus = Object.fromEntries(kinds.map((kind) => [kind, createNode()]));
  const currentStatus = createNode();
  const currentNext = createNode();
  const currentResponsibility = createNode();
  const fileSelectionSummary = createNode();
  const live = createNode();
  const start = createNode();
  const pendingList = createNode({ hidden: true });
  const pendingEmpty = createNode({ hidden: false });
  const copyPending = createNode({ disabled: true });
  const copyFeedback = createNode();
  const summary = createNode({ id: "self-check-summary", tabIndex: -1 });
  const workspaceRoot = createNode({ id: "document-workspace" });
  const drawingCheckLink = createNode();
  drawingCheckLink.setAttribute("href", "../drawing_check/code.html");

  const documentRoot = {
    createElement() {
      return createNode();
    },
    getElementById(id) {
      return nodesById.get(id) ?? null;
    },
    querySelector(selector) {
      return selector === "[data-quote-check-page]" ? pageRoot : null;
    },
  };
  const pageRoot = createNode();
  pageRoot.ownerDocument = documentRoot;
  pageRoot.contains = (target) => registeredNodes.has(target);
  pageRoot.querySelectorAll = (selector) => {
    if (selector === "[data-document-tab]") return Object.values(tabs);
    if (selector === "[data-document-panel]") return Object.values(panels);
    if (selector === "[data-document-file]") return Object.values(fileInputs);
    if (selector === "[data-document-dropzone]") return Object.values(dropzones);
    if (selector === "[data-ai-report-action]") return Object.values(reportActions);
    if (selector === "[data-drawing-check-link]") return [drawingCheckLink];
    if (selector === "[data-check-item]") return checkItems;
    if (selector === "[data-current-status]") return [currentStatus];
    if (selector === "[data-current-next]") return [currentNext];
    if (selector === "[data-current-responsibility]") return [currentResponsibility];
    if (selector === "[data-file-selection-summary]") return [fileSelectionSummary];
    if (Object.hasOwn(summaryFields, selector)) return [summaryFields[selector]];
    if (Object.hasOwn(summaryTargets, selector)) return [summaryTargets[selector]];
    const tabMatch = selector.match(/^\[data-tab-status="(quote|contract|drawing)"\]$/u);
    return tabMatch ? [tabStatus[tabMatch[1]]] : [];
  };
  pageRoot.querySelector = (selector) => {
    if (selector === "[data-document-workspace-root]") return workspaceRoot;
    if (selector === "[data-state-live]") return live;
    if (selector === "[data-start-upload]") return start;
    if (selector === "[data-pending-list]") return pendingList;
    if (selector === "[data-pending-empty]") return pendingEmpty;
    if (selector === "[data-copy-pending]") return copyPending;
    if (selector === "[data-copy-feedback]") return copyFeedback;
    if (selector === "[data-self-check-summary]") return summary;
    if (selector === '[data-parser-summary="quote"]') return parserSummary;
    const selectors = [
      ["document-feedback", feedback],
      ["document-filename", filename],
      ["selected-file", selectedRows],
      ["document-file", fileInputs],
      ["ai-report-action", reportActions],
      ["ai-report-status", reportStatuses],
      ["parser-status", parserStatuses],
    ];
    for (const [attribute, values] of selectors) {
      const match = selector.match(new RegExp(`^\\[data-${attribute}="(quote|contract|drawing)"\\]$`, "u"));
      if (match) return values[match[1]];
    }
    return null;
  };

  return {
    activeElement: () => activeElement,
    copyFeedback,
    copyPending,
    currentStatus,
    documentRoot,
    dropzones,
    drawingCheckLink,
    feedback,
    fileInputs,
    fileSelectionSummary,
    filename,
    items,
    live,
    panels,
    pageRoot,
    pendingEmpty,
    pendingList,
    reportActions,
    parserSummary,
    parserStatuses,
    reportStatuses,
    selectedRows,
    start,
    summaryTargets,
    summaryFields,
    tabs,
    async chooseFile(kind, file) {
      const input = fileInputs[kind];
      input.value = file ? `C:\\fakepath\\${file.name}` : "";
      input.files = new HarnessFileList(file ? [file] : []);
      await input.dispatch("change");
    },
    async cancelFilePicker(kind) {
      fileInputs[kind].files = new HarnessFileList([]);
      await fileInputs[kind].dispatch("change");
    },
    async dropFile(kind, file) {
      await dropzones[kind].dispatch("drop", {
        dataTransfer: { files: new HarnessFileList(file ? [file] : []) },
      });
    },
    async requestAiReport(kind) {
      await reportActions[kind].dispatch("click");
    },
    async selectStatus(kind, status, { note = "", owner = "owner" } = {}) {
      const item = items[kind];
      for (const radio of item.radios) radio.checked = radio.value === status;
      item.note.value = note;
      item.owner.value = owner;
      await item.dispatch("change");
    },
  };
}

function runProductionDrawingRouteListenerProbe(appSource) {
  const listeners = new WeakMap();

  class RouteEvent {
    constructor() {
      this.defaultPrevented = false;
    }

    preventDefault() {
      this.defaultPrevented = true;
    }
  }

  class RouteElement {
    constructor(href) {
      this.hrefValue = href;
      this.navigationCount = 0;
      listeners.set(this, new Map());
    }

    getAttribute(name) {
      return name === "href" ? this.hrefValue : null;
    }

    addEventListener(type, listener) {
      listeners.get(this).set(type, listener);
    }
  }

  class RouteHtmlElement extends RouteElement {
    click() {
      const event = new RouteEvent();
      listeners.get(this).get("click")?.(event);
      if (!event.defaultPrevented) this.navigationCount += 1;
    }
  }

  const dispatchTrustedClick = RouteHtmlElement.prototype.click;
  const primary = new RouteHtmlElement("../drawing_check/code.html");
  const failure = new RouteHtmlElement("../drawing_check/code.html");
  primary.hidden = false;
  failure.hidden = true;
  const root = {
    querySelector(selector) {
      if (selector === "[data-drawing-check-primary]") return primary;
      if (selector === "[data-failure-drawing-recover]") return failure;
      return null;
    },
    querySelectorAll(selector) {
      if (selector === "[data-drawing-check-link]") return [primary, failure];
      return [];
    },
  };
  const document = {
    querySelector(selector) {
      return selector === "[data-quote-check-page]" ? root : null;
    },
  };
  const executable = appSource
    .replace(/^import\s+[^;]+;\s*$/gm, "")
    .replace(/^export\s+/gm, "");
  runInNewContext(executable, {
    Blob,
    Event: RouteEvent,
    Element: RouteElement,
    File,
    FileList: HarnessFileList,
    HTMLElement: RouteHtmlElement,
    HTMLInputElement: HarnessHtmlInputElement,
    console,
    document,
    structuredClone,
  }, { timeout: 1000 });

  return {
    classes: {
      Element: RouteElement,
      Event: RouteEvent,
      HTMLElement: RouteHtmlElement,
    },
    dispatchPrimary() {
      dispatchTrustedClick.call(primary);
      return primary.navigationCount;
    },
    primary,
  };
}

async function initializeFileHandlerHarness(tag) {
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

test("quote check starts as one canonical three-file page", async () => {
  assert.equal(existsSync(quoteDir), true, "quote_check directory must exist");
  const files = [htmlPath, cssPath, appPath];
  for (const path of files) {
    assert.equal(existsSync(path), true, path);
    assert.equal((await stat(path)).isFile(), true, path);
  }
});

test("quote check final runtime asset identity binds the changed page assets", async () => {
  const html = await readFile(htmlPath, "utf8");

  assert.match(html, /href="\.\/styles\.css\?v=20260818-parser-summary-v2"/);
  assert.match(html, /src="\.\/app\.js\?v=20260818-parser-summary-v2"/);
});

test("legacy owner journey is absent", async () => {
  const html = await readFile(htmlPath, "utf8");

  assert.doesNotMatch(html, /owner-journey/u);
  assert.doesNotMatch(html, /文件健檢三個階段/u);
  assert.doesNotMatch(html, /data-stage-item/u);
});

test("quote check header keeps the current page and DRS home visible", async () => {
  const [html, styles] = await Promise.all([
    readFile(htmlPath, "utf8"),
    readFile(cssPath, "utf8"),
  ]);

  assert.match(
    html,
    /<nav class="quote-header__nav" aria-label="DRS 主要導覽">[\s\S]*?href="\.\.\/public_home\/code\.html#top"[\s\S]*?>DRS 首頁<\/a>[\s\S]*?aria-current="page"[\s\S]*?>文件健檢<\/a>[\s\S]*?<\/nav>/u,
  );
  assert.match(
    html,
    /<a\b(?=[^>]*class="quote-brand")(?=[^>]*href="\.\.\/public_home\/code\.html#top")(?=[^>]*aria-label="LaiBE DRS 首頁")[^>]*>[\s\S]*?laibe_offer\.svg[\s\S]*?drs-brand-lockup drs-brand-lockup--expanded/u,
  );
  assert.doesNotMatch(html, /quote-context-bar|data-quote-context/u);
  assert.doesNotMatch(html, /PCM 首頁/u);
  assert.match(styles, /\.quote-header__nav a\s*\{[^}]*white-space:\s*nowrap;/u);
  assert.match(
    styles,
    /\.quote-header \.quote-brand \.drs-brand-lockup\s*\{[^}]*display:\s*none;/u,
  );
  assert.match(
    styles,
    /@media\s*\(max-width:\s*760px\)[\s\S]*?\.quote-header__nav a\s*\{[^}]*min-block-size:\s*44px;/u,
  );
});

test("approved two-function workspace is visible truthful and memory only", async () => {
  const [html, app, styles] = await Promise.all([
    readFile(htmlPath, "utf8"),
    readFile(appPath, "utf8"),
    readFile(cssPath, "utf8"),
  ]);
  const visible = stripNonVisibleHtml(html);

  assert.match(html, /<h1[^>]*>報價文件檢查<\/h1>/u);
  assert.match(
    visible,
    /目前只讀取未加密、未壓縮且含文字層的報價 PDF；檔案不會上傳或保存，也不會對掃描檔執行 OCR。重新整理或離開頁面後，本次結果就會消失。/u,
  );
  assert.doesNotMatch(visible, /上傳成功|已上傳/u, "本機讀取流程不得對使用者宣稱已上傳");
  assert.match(html, /data-start-upload[^>]*>\s*選擇第一份 PDF\s*<\/button>/u);
  assert.equal((html.match(/data-document-upload-step\b/gu) ?? []).length, 3);
  assert.equal((html.match(/data-parser-summary-step\b/gu) ?? []).length, 1);
  assert.equal((html.match(/data-ai-report-step\b/gu) ?? []).length, 2);
  assert.equal((html.match(/data-ai-report-action=/gu) ?? []).length, 2);
  assert.equal((html.match(/data-ai-report-status=/gu) ?? []).length, 2);
  assert.match(html, /data-parser-status="quote"[^>]*data-parser-state="waiting-file"/u);
  assert.doesNotMatch(html, /data-ai-report-action="quote"/u);
  assert.match(html, /data-quote-runtime-mode="LOCAL_PARSER_SUMMARY_ONLY"/u);
  assert.match(visible, /目前只提供本機解析摘要，不會建立正式報告或案件紀錄。/u);
  assert.match(html, /data-parser-summary="quote"[^>]*hidden/u);
  assert.doesNotMatch(html, /data-ai-report-output="quote"/u);
  assert.equal((html.match(/class="document-action-step(?:\s|")/gu) ?? []).length, 6);
  assert.doesNotMatch(html, /data-check-item\b|type="radio"|data-check-note|data-check-owner/u);
  assert.doesNotMatch(html, /data-self-check-summary|data-summary-confirmed|data-summary-needs-info|data-summary-uncertain/u);
  assert.match(html, /data-file-selection-summary/u);
  assert.doesNotMatch(html, /data-pending-list|data-copy-pending/u);
  assert.match(visible, /請先選擇 PDF。/u);
  assert.match(visible, /AI 檢查報告功能正在整理中，正式開放後會提供完整操作入口。/u);
  assert.match(
    visible,
    /本次選擇只保留在目前頁面；重新整理或離開後會消失，尚未建立案件紀錄。/u,
  );
  assert.equal((html.match(/aria-live=/gu) ?? []).length, 1);
  assert.doesNotMatch(visible, /風險評分|已建立案件正式結果/u);

  assert.match(app, /application\/pdf/u);
  assert.match(app, /\.pdf\$/u);
  assert.match(app, /inspectSelectedQuoteFile\(selection\.file\)/u);
  assert.match(app, /QUOTE_BROWSER_RUNTIME_MODE/u);
  assert.doesNotMatch(app, /local-browser-session|local-browser-document/u);
  assert.match(app, /正在本機讀取 PDF；檔案不會上傳或保存。/u);
  assert.doesNotMatch(app, /上傳成功|已上傳/u, "動態可見文案不得宣稱已上傳");
  assert.match(app, /請先選擇 PDF。/u);
  assert.match(app, /ArrowLeft[\s\S]*ArrowRight[\s\S]*Home[\s\S]*End/u);
  assert.match(app, /location\.hash/u);
  assert.match(app, /requestAnimationFrame\(applyInitialHash\)/u);
  assert.match(app, /aria-invalid/u);
  assert.doesNotMatch(app, /localStorage|sessionStorage|FileReader/u);

  assert.match(styles, /\.ai-report-action[^}]*min-(?:block-)?size:\s*48px/u);
  assert.match(styles, /@media\s*\(max-width:\s*760px\)/u);
  assert.match(styles, /@media\s*\(prefers-reduced-motion:\s*reduce\)/u);
});

test("mode query maps quote drawing and contract before the document workspace renders", async () => {
  const app = await import(`${pathToFileURL(appPath).href}?document-mode-map=${Date.now()}`);
  assert.equal(typeof app.resolveDocumentWorkspaceMode, "function");
  assert.equal(app.resolveDocumentWorkspaceMode("?mode=quote"), "quote");
  assert.equal(app.resolveDocumentWorkspaceMode("?mode=drawing"), "drawing");
  assert.equal(app.resolveDocumentWorkspaceMode("?mode=contract"), "contract");
  assert.equal(app.resolveDocumentWorkspaceHash("#check-contract-change"), "contract");
  assert.equal(app.resolveDocumentWorkspaceHash("#document-panel-drawing"), "drawing");
  assert.equal(app.resolveDocumentWorkspaceHash("#self-check-summary"), null);

  const source = await readFile(appPath, "utf8");
  assert.match(source, /new URLSearchParams\(/u);
  assert.match(
    source,
    /let workspaceState = createDocumentWorkspaceState\(initialMode\);[\s\S]*?render\(\);/u,
  );
});

test("production bootstrap applies mode to the first rendered tab and panel state", async () => {
  const app = await import(`${pathToFileURL(appPath).href}?document-bootstrap=${Date.now()}`);
  assert.equal(typeof app.initializeQuoteCheckPage, "function");

  function createBootstrapHarness() {
    const tabs = ["quote", "contract", "drawing"].map((kind) => ({
      dataset: { documentTab: kind },
      attributes: new Map(),
      tabIndex: -1,
      addEventListener() {},
      focus() {},
      setAttribute(name, value) {
        this.attributes.set(name, String(value));
      },
      getAttribute(name) {
        return this.attributes.get(name) ?? null;
      },
    }));
    const panels = ["quote", "contract", "drawing"].map((kind) => ({
      dataset: { documentPanel: kind },
      hidden: true,
    }));
    const workspaceRoot = {};
    const pageRoot = {
      querySelectorAll(selector) {
        if (selector === "[data-document-tab]") return tabs;
        if (selector === "[data-document-panel]") return panels;
        return [];
      },
      querySelector(selector) {
        if (selector === "[data-document-workspace-root]") return workspaceRoot;
        return null;
      },
    };
    const documentRoot = {
      querySelector(selector) {
        return selector === "[data-quote-check-page]" ? pageRoot : null;
      },
    };
    return { documentRoot, panels, tabs };
  }

  const cases = [
    ["?mode=quote", "quote"],
    ["?mode=drawing", "drawing"],
    ["?mode=contract", "contract"],
    ["", "quote"],
    ["?mode=", "quote"],
    ["?mode=specification", "quote"],
    ["?mode=QUOTE", "quote"],
  ];

  for (const [search, expectedKind] of cases) {
    const harness = createBootstrapHarness();
    app.initializeQuoteCheckPage(harness.documentRoot, { search });
    for (const tab of harness.tabs) {
      const active = tab.dataset.documentTab === expectedKind;
      assert.equal(tab.getAttribute("aria-selected"), active ? "true" : "false", search);
      assert.equal(tab.tabIndex, active ? 0 : -1, search);
    }
    for (const panel of harness.panels) {
      const active = panel.dataset.documentPanel === expectedKind;
      assert.equal(panel.hidden, !active, search);
    }
  }
});

test("production workspace renders parser-only facts without a formal report CTA", async () => {
  const app = await importDocumentWorkspaceApp("workspace-dom-listeners");
  const harness = createDocumentWorkspaceHarness();
  app.initializeQuoteCheckPage(harness.documentRoot, {
    hash: "#document-panel-contract",
    search: "?mode=quote",
  });

  assert.equal(harness.tabs.contract.getAttribute("aria-selected"), "true");
  assert.equal(harness.pageRoot.dataset.quoteRuntimeMode, "LOCAL_PARSER_SUMMARY_ONLY");
  assert.equal(harness.tabs.contract.tabIndex, 0);
  assert.equal(harness.panels.contract.hidden, false);
  assert.equal(harness.panels.quote.hidden, true);
  assert.equal(harness.activeElement(), harness.panels.contract);

  let prevented = false;
  await harness.tabs.contract.dispatch("keydown", {
    key: "ArrowRight",
    preventDefault() {
      prevented = true;
    },
  });
  assert.equal(prevented, true);
  assert.equal(harness.tabs.drawing.getAttribute("aria-selected"), "true");
  assert.equal(harness.panels.drawing.hidden, false);
  assert.equal(harness.activeElement(), harness.tabs.drawing);

  await harness.tabs.drawing.dispatch("keydown", { key: "Home" });
  assert.equal(harness.tabs.quote.getAttribute("aria-selected"), "true");
  assert.equal(harness.activeElement(), harness.tabs.quote);
  await harness.tabs.quote.dispatch("keydown", { key: "End" });
  assert.equal(harness.tabs.drawing.getAttribute("aria-selected"), "true");
  await harness.tabs.drawing.dispatch("keydown", { key: "ArrowLeft" });
  assert.equal(harness.tabs.contract.getAttribute("aria-selected"), "true");
  await harness.tabs.quote.dispatch("click");
  assert.equal(harness.tabs.quote.getAttribute("aria-selected"), "true");
  assert.equal(harness.panels.quote.hidden, false);

  await harness.start.dispatch("click");
  assert.equal(harness.activeElement(), harness.fileInputs.quote);
  assert.match(harness.live.textContent, /選擇報價內容 PDF/u);

  await harness.chooseFile("quote", await readableQuoteFile());
  assert.equal(harness.parserStatuses.quote.dataset.parserState, "parser-ready");
  assert.match(harness.parserStatuses.quote.textContent, /本機解析摘要已完成/u);
  assert.equal(harness.parserSummary.hidden, false);
  assert.equal(harness.summaryFields["[data-summary-page-count]"].textContent, "1");
  assert.equal(harness.summaryFields["[data-summary-item-count]"].textContent, "2");
  assert.equal(harness.summaryFields["[data-summary-readability]"].textContent, "可讀文字層");
  assert.match(harness.live.textContent, /不是案件正式報告/u);
});

test("production document workspace guards a tampered drawing-check CTA and preserves its exact local href", async () => {
  const app = await importDocumentWorkspaceApp("workspace-drawing-route-guard");
  const harness = createDocumentWorkspaceHarness();
  app.initializeQuoteCheckPage(harness.documentRoot, { hash: "", search: "?mode=quote" });

  const exactEvent = new Event("click", { cancelable: true });
  await harness.drawingCheckLink.dispatch("click", exactEvent);
  assert.equal(exactEvent.defaultPrevented, false, "exact local drawing href remains usable");

  harness.drawingCheckLink.setAttribute("href", "javascript:alert(1)");
  const tamperedEvent = new Event("click", { cancelable: true });
  await harness.drawingCheckLink.dispatch("click", tamperedEvent);
  assert.equal(tamperedEvent.defaultPrevented, true, "tampered drawing href must fail closed");
});

test("production workspace file events keep one truth across cancel invalid drop and recovery", async () => {
  const app = await importDocumentWorkspaceApp("workspace-file-events");
  const harness = createDocumentWorkspaceHarness();
  app.initializeQuoteCheckPage(harness.documentRoot, { hash: "", search: "?mode=quote" });

  const quotePdf = await readableQuoteFile("A.pdf");
  await harness.chooseFile("quote", quotePdf);
  assert.equal(harness.filename.quote.textContent, "A.pdf");
  assert.equal(harness.selectedRows.quote.hidden, false);
  assert.equal(harness.feedback.quote.textContent, "已完成本機解析摘要；重新選擇可改看另一份 PDF。");
  assert.equal(harness.fileInputs.quote.getAttribute("aria-invalid"), "false");
  assert.equal(harness.fileInputs.quote.getAttribute("aria-describedby"), "document-feedback-quote");

  await harness.cancelFilePicker("quote");
  assert.equal(harness.filename.quote.textContent, "A.pdf");
  assert.equal(harness.selectedRows.quote.hidden, false);
  assert.equal(harness.feedback.quote.textContent, "已完成本機解析摘要；重新選擇可改看另一份 PDF。");

  await harness.dropFile("quote", browserFile("不是PDF.txt", "text/plain"));
  assert.equal(harness.filename.quote.textContent, "");
  assert.equal(harness.selectedRows.quote.hidden, true);
  assert.equal(harness.feedback.quote.textContent, "無法選用此檔案，請重新選擇 PDF。");
  assert.equal(harness.fileInputs.quote.getAttribute("aria-invalid"), "true");
  assert.equal(harness.fileInputs.quote.value, "");

  await harness.chooseFile("quote", await readableQuoteFile("A.pdf", ""));
  assert.equal(harness.filename.quote.textContent, "A.pdf");
  assert.equal(harness.selectedRows.quote.hidden, false);
  assert.equal(harness.feedback.quote.textContent, "已完成本機解析摘要；重新選擇可改看另一份 PDF。");
  assert.equal(harness.fileInputs.quote.getAttribute("aria-invalid"), "false");

  await harness.chooseFile("contract", browserFile("契約.pdf", "application/pdf"));
  await harness.chooseFile("drawing", browserFile("圖說.PDF", "text/plain"));
  assert.equal(harness.fileSelectionSummary.textContent, "三類檔案已選擇；目前僅報價 PDF 可產生本機解析摘要。");
});

test("production workspace fails closed for scanned bytes, recovers on reselect, and resets on a fresh page", async () => {
  const app = await importDocumentWorkspaceApp("workspace-byte-state-recovery");
  const firstPage = createDocumentWorkspaceHarness();
  app.initializeQuoteCheckPage(firstPage.documentRoot, { hash: "", search: "?mode=quote" });

  await firstPage.chooseFile(
    "quote",
    await quoteFixtureFile("scanned-image-only.pdf", "掃描報價.pdf"),
  );
  assert.equal(firstPage.parserStatuses.quote.dataset.parserState, "scanned");
  assert.match(firstPage.parserStatuses.quote.textContent, /掃描檔[\s\S]*不會執行 OCR/u);
  assert.equal(firstPage.parserSummary.hidden, true);

  await firstPage.chooseFile("quote", await readableQuoteFile("可讀報價.pdf"));
  assert.equal(firstPage.parserStatuses.quote.dataset.parserState, "parser-ready");
  assert.equal(firstPage.parserSummary.hidden, false);

  const freshPage = createDocumentWorkspaceHarness();
  app.initializeQuoteCheckPage(freshPage.documentRoot, { hash: "", search: "?mode=quote" });
  assert.equal(freshPage.parserStatuses.quote.dataset.parserState, "waiting-file");
  assert.equal(freshPage.parserSummary.hidden, true);
  assert.equal(freshPage.fileSelectionSummary.textContent, "目前尚未選擇檔案。");
});

test("production workspace maps unsafe and fake-text bytes to safe parser-only recovery states", async () => {
  const app = await importDocumentWorkspaceApp("workspace-byte-rejections");
  const cases = [
    ["encrypted.pdf", /這份 PDF 已加密/u],
    ["adversarial-action.pdf", /這份 PDF 含有互動內容/u],
    ["filter-array.pdf", /這份 PDF 使用尚未支援的壓縮格式/u],
    ["corrupt.pdf", /無法安全讀取這份 PDF/u],
    ["metadata-fake-tj.pdf", /尚未找到可整理的報價列/u],
  ];

  for (const [fixtureName, visibleMessage] of cases) {
    const harness = createDocumentWorkspaceHarness();
    app.initializeQuoteCheckPage(harness.documentRoot, { hash: "", search: "?mode=quote" });
    await harness.chooseFile(
      "quote",
      await quoteFixtureFile(fixtureName, "相同顯示檔名.pdf"),
    );
    assert.equal(harness.parserStatuses.quote.dataset.parserState, "error", fixtureName);
    assert.match(harness.parserStatuses.quote.textContent, visibleMessage, fixtureName);
    assert.equal(harness.parserSummary.hidden, true, fixtureName);
    assert.equal(harness.feedback.quote.dataset.feedbackState, "error", fixtureName);
    assert.match(harness.live.textContent, /下一步/u, fixtureName);
    assert.doesNotMatch(
      `${harness.parserStatuses.quote.textContent} ${harness.live.textContent}`,
      /stack|exception|raw JSON|CORRUPT_PDF|UNSUPPORTED_/iu,
      fixtureName,
    );
    assert.equal(Object.hasOwn(harness.reportActions, "quote"), false, fixtureName);
  }
});

test("same filename renders different parser summaries from different PDF bytes", async () => {
  const app = await importDocumentWorkspaceApp("workspace-byte-derived-summary");
  const harness = createDocumentWorkspaceHarness();
  app.initializeQuoteCheckPage(harness.documentRoot, { hash: "", search: "?mode=quote" });

  await harness.chooseFile(
    "quote",
    await quoteFixtureFile("readable-quote.pdf", "同名報價.pdf"),
  );
  assert.equal(harness.summaryFields["[data-summary-page-count]"].textContent, "1");
  assert.equal(harness.summaryFields["[data-summary-item-count]"].textContent, "2");

  await harness.chooseFile(
    "quote",
    await quoteFixtureFile("toctou-quote.pdf", "同名報價.pdf"),
  );
  assert.equal(harness.filename.quote.textContent, "同名報價.pdf");
  assert.equal(harness.summaryFields["[data-summary-page-count]"].textContent, "1");
  assert.equal(harness.summaryFields["[data-summary-item-count]"].textContent, "1");
  assert.equal(harness.parserStatuses.quote.dataset.parserState, "parser-ready");
});

test("a deferred older parser result cannot replace the newer file truth", async () => {
  const app = await importDocumentWorkspaceApp("workspace-stale-parser-result");
  const harness = createDocumentWorkspaceHarness();
  const pending = [];
  const inspectDeferred = (file) => new Promise((resolveResult) => {
    pending.push({ file, resolveResult });
  });
  app.initializeQuoteCheckPage(
    harness.documentRoot,
    { hash: "", search: "?mode=quote" },
    { inspectQuotePdfFile: inspectDeferred },
  );

  const firstSelection = harness.chooseFile("quote", await readableQuoteFile("A.pdf"));
  await Promise.resolve();
  const secondSelection = harness.chooseFile("quote", await readableQuoteFile("B.pdf"));
  await Promise.resolve();
  assert.equal(pending.length, 2);

  pending[1].resolveResult({
    status: "PARSER_READY",
    title: "本機解析摘要已完成",
    message: "B bytes",
    nextAction: "核對 B",
    summary: {
      pageCount: 1,
      itemCount: 1,
      readability: "可讀文字層",
      comparison: "本次未提供比較基準",
    },
    limitations: [],
    report: null,
  });
  await secondSelection;
  assert.equal(harness.filename.quote.textContent, "B.pdf");
  assert.equal(harness.summaryFields["[data-summary-item-count]"].textContent, "1");

  pending[0].resolveResult({
    status: "PARSER_READY",
    title: "本機解析摘要已完成",
    message: "stale A bytes",
    nextAction: "不應顯示",
    summary: {
      pageCount: 9,
      itemCount: 99,
      readability: "不應顯示",
      comparison: "不應顯示",
    },
    limitations: [],
    report: null,
  });
  await firstSelection;
  assert.equal(harness.filename.quote.textContent, "B.pdf");
  assert.equal(harness.summaryFields["[data-summary-page-count]"].textContent, "1");
  assert.equal(harness.summaryFields["[data-summary-item-count]"].textContent, "1");
  assert.doesNotMatch(harness.live.textContent, /不應顯示|stale A/u);
});

test("missing or invalid mode query falls back quietly to quote", async () => {
  const app = await import(`${pathToFileURL(appPath).href}?document-mode-fallback=${Date.now()}`);
  assert.equal(typeof app.resolveDocumentWorkspaceMode, "function");
  for (const search of ["", "?mode=", "?mode=specification", "?mode=QUOTE", "?other=drawing"]) {
    assert.equal(app.resolveDocumentWorkspaceMode(search), "quote", search);
  }
});

test("quote check two-function path stays on the page and keeps DRS home available", async () => {
  const [html, app] = await Promise.all([
    readFile(htmlPath, "utf8"),
    readFile(appPath, "utf8"),
  ]);

  assert.equal((html.match(/data-document-upload-step\b/gu) ?? []).length, 3);
  assert.equal((html.match(/data-parser-summary-step\b/gu) ?? []).length, 1);
  assert.equal((html.match(/data-ai-report-step\b/gu) ?? []).length, 2);
  assert.doesNotMatch(html, /data-self-check-summary|data-copy-pending/u);
  assert.match(html, /href="\.\.\/public_home\/code\.html#top"[^>]*>DRS 首頁<\/a>/u);
  assert.doesNotMatch(html, /href="\.\.\/basic_report\/code\.html"/u);
  assert.match(app, /inspectQuotePdfFile/u);
});

test("file-check hero is the first surface and keeps the two-function document workspace below it", async () => {
  const html = await readFile(htmlPath, "utf8");
  const mainSource = html.match(
    /<main\b[^>]*data-quote-check-page[^>]*>([\s\S]*?)<\/main>/u,
  )?.[1];

  assert.ok(mainSource, "quote check main content must exist");
  assert.match(
    html,
    /<\/header>\s*<main\b[^>]*data-quote-check-page[^>]*>\s*<section class="self-check-hero" aria-labelledby="workspace-title">/u,
  );
  assert.match(
    mainSource,
    /^\s*<section class="self-check-hero" aria-labelledby="workspace-title">[\s\S]*?<h1 id="workspace-title">報價文件檢查<\/h1>[\s\S]*?data-start-upload/u,
  );
  assert.equal((html.match(/<h1\b/gu) ?? []).length, 1);
  assert.equal((html.match(/選擇第一份 PDF/gu) ?? []).length, 1);
  assert.equal((html.match(/class="workspace-now"/gu) ?? []).length, 1);
  assert.equal((html.match(/role="tablist"/gu) ?? []).length, 1);
  assert.equal((html.match(/data-document-tab=/gu) ?? []).length, 3);
  assert.equal((html.match(/data-document-panel=/gu) ?? []).length, 3);
  assert.equal((html.match(/data-document-file=/gu) ?? []).length, 3);
  assert.equal((html.match(/data-document-dropzone=/gu) ?? []).length, 3);
  for (const id of [
    "document-workspace",
    "workspace-title",
    "document-tab-quote",
    "document-tab-contract",
    "document-tab-drawing",
    "document-panel-quote",
    "document-panel-contract",
    "document-panel-drawing",
    "document-file-quote",
    "document-file-contract",
    "document-file-drawing",
  ]) {
    assert.equal((html.match(new RegExp(`id="${id}"`, "gu")) ?? []).length, 1, id);
  }
  assert.match(html, /<section class="document-workspace" id="document-workspace" data-document-workspace-root/u);
  assert.doesNotMatch(html, /id="quote-title"|quote-hero__copy|quote-assurances|document-ledger|data-hero-start|data-workspace-start/u);
});

test("one page keeps the legacy closed-state contract while exposing only file selection and bounded report actions", async () => {
  const [html, app] = await Promise.all([
    readOrEmpty(htmlPath),
    readOrEmpty(appPath),
  ]);
  assert.match(html, /data-quote-check-page/);
  for (const step of requiredSteps) {
    assert.match(`${html}\n${app}`, new RegExp(step), step);
  }
  assert.match(html, /給已取得設計師或統包報價單的甲方/);
  assert.match(html, /服務說明/);
  assert.match(html, /同意本機檢視/);
  assert.match(html, /選擇報價 PDF/);
  assert.match(html, /檔案標示與後續確認/);
  assert.match(html, /待確認清單/);
  assert.match(html, /重新選擇/);
  assert.match(html, /結果格式示意/);
  assert.match(html, /選擇檔案/u);
  assert.match(html, /本機解析摘要/u);
  assert.doesNotMatch(html, /固定自查清單|data-check-item|選擇 PDF（選填）/u);
});

test("first screen states role status next responsibility and trace boundary", async () => {
  const html = await readOrEmpty(htmlPath);
  const visible = stripNonVisibleHtml(html);
  assert.match(visible, /甲方/);
  assert.match(visible, /目前狀態/);
  assert.match(visible, /下一步/);
  assert.match(visible, /責任人/);
  assert.match(visible, /案件紀錄/);
  assert.match(visible, /尚未建立案件紀錄/);
  assert.match(visible, /DRS 首頁/);
});

test("primary CTA 14px text keeps 4.5 to 1 contrast at every gradient stop", async () => {
  const [css, sharedTokens, sharedShell] = await Promise.all([
    readFile(cssPath, "utf8"),
    readFile(sharedTokenPath, "utf8"),
    readFile(sharedShellPath, "utf8"),
  ]);
  const localColor = css.match(
    /\[data-quote-check-page\]\s+\.owner-first-primary-action\s*\{[^}]*color:\s*(#[0-9a-f]{6})/i,
  )?.[1]?.toLowerCase();
  const inheritedColorVariable = sharedShell.match(
    /\.owner-first-control,[\s\S]*?\.owner-first-secondary-action\s*\{[^}]*color:\s*var\((--[a-z0-9-]+)\)/i,
  )?.[1];
  assert.ok(inheritedColorVariable, "shared primary action text color must stay traceable");
  const inheritedColor = sharedTokens.match(
    new RegExp(`${inheritedColorVariable}:\\s*(#[0-9a-f]{6})`, "i"),
  )?.[1]?.toLowerCase();
  const textColor = localColor ?? inheritedColor;
  assert.ok(textColor, "effective primary CTA text color must resolve to a hex value");
  assert.match(sharedShell, /font:\s*900\s+0\.875rem\/1\s+var\(--owner-first-font\)/i);

  const stops = ["start", "mid", "end"].map((name) => {
    const value = sharedTokens.match(
      new RegExp(`--owner-first-primary-${name}:\\s*(#[0-9a-f]{6})`, "i"),
    )?.[1]?.toLowerCase();
    assert.ok(value, `primary gradient ${name} stop must exist`);
    return value;
  });
  const results = stops.map((background) => ({
    background,
    contrast: Number(contrastRatio(textColor, background).toFixed(2)),
    foreground: textColor,
  }));
  const failures = results.filter(({ contrast }) => contrast < 4.5);
  assert.deepEqual(failures, [], `CTA contrast nodes: ${JSON.stringify(results)}`);
});

test("document tabs stay standalone above an independent neutral glass panel", async () => {
  const css = await readFile(cssPath, "utf8");
  const glassStart = css.indexOf(".document-workspace {");
  const glassEnd = css.indexOf(".inspection-output {");
  const glassSource = css.slice(glassStart, glassEnd);
  const workspaceSurface = css.match(/\.document-workspace\s*\{([^}]*)\}/u)?.[1] ?? "";
  const greenDominantColors = [...glassSource.matchAll(/rgba\(\s*(\d+),\s*(\d+),\s*(\d+),/gu)]
    .map((match) => match.slice(1, 4).map(Number))
    .filter(([red, green, blue]) => green > red + 4 && green > blue + 4);
  const greenDominantHexColors = [...glassSource.matchAll(/#([\da-f]{2})([\da-f]{2})([\da-f]{2})\b/giu)]
    .map((match) => match.slice(1, 4).map((channel) => Number.parseInt(channel, 16)))
    .filter(([red, green, blue]) => green > red + 4 && green > blue + 4);

  assert.ok(glassStart >= 0 && glassEnd > glassStart);
  assert.deepEqual(greenDominantColors, []);
  assert.deepEqual(greenDominantHexColors, []);
  assert.match(css, /\.document-workspace\s*\{[^}]*--workspace-glass-core:\s*rgba\(8,\s*11,\s*13,\s*0\.62\);[^}]*--workspace-glass-edge:\s*rgba\(255,\s*255,\s*255,\s*0\.24\);/u);
  assert.doesNotMatch(workspaceSurface, /display:\s*grid|grid-template/u);
  assert.doesNotMatch(css, /\.document-workspace::before\s*\{/u);
  assert.doesNotMatch(css, /\.document-tabs,\s*\.document-panel\s*\{[^}]*inline-size:/u);
  assert.match(css, /\.document-tabs\s*\{[^}]*--tab-panel-surface:/u);
  assert.match(css, /\.document-tabs\s*\{[^}]*--tab-neon-cool:\s*#8b82ff;[^}]*--tab-neon-pink:\s*#ff70c7;[^}]*--tab-edge-clearance:\s*32px;[^}]*align-items:\s*start;[^}]*gap:\s*28px;[^}]*min-height:\s*84px;[^}]*margin-block-end:\s*18px;[^}]*padding:\s*0 var\(--tab-edge-clearance\);[^}]*border:\s*0;[^}]*background:\s*transparent;/u);
  assert.match(css, /\.document-tabs button\s*\{[^}]*border:\s*1px solid transparent;[^}]*border-radius:\s*22px;[^}]*background:[^}]*repeating-linear-gradient/u);
  assert.match(css, /\.document-tabs button::before\s*\{[^}]*inset:\s*0;[^}]*padding:\s*1px;[^}]*background:\s*linear-gradient\(105deg,[^}]*mask-composite:\s*exclude;[^}]*pointer-events:\s*none;/u);
  assert.match(css, /\.document-tabs button\[aria-selected="true"\]\s*\{[^}]*border-radius:\s*22px;[^}]*background:[^}]*rgba\(255,\s*255,\s*255,\s*0\.11\)[^}]*animation:\s*document-tab-backlight/u);
  assert.doesNotMatch(css, /#document-tab-quote\[aria-selected="true"\](?:::(?:before|after))?\s*\{/u);
  assert.doesNotMatch(css, /\.document-tabs:has\(/u);
  assert.match(css, /\.document-panel\s*\{[^}]*border:\s*1px solid var\(--workspace-glass-edge\);[^}]*border-radius:\s*36px;[^}]*background:[^}]*repeating-linear-gradient[^}]*backdrop-filter:\s*blur\(30px\)[^}]*box-shadow:/u);
  assert.doesNotMatch(css.match(/\.document-panel\s*\{([^}]*)\}/u)?.[1] ?? "", /border-top:\s*0/u);
  assert.match(css, /\.document-panel::after\s*\{[^}]*inset:\s*0;[^}]*border:\s*1px solid rgba\(255,\s*255,\s*255,\s*0\.08\);[^}]*box-shadow:/u);
  assert.doesNotMatch(css.match(/\.document-panel::after\s*\{([^}]*)\}/u)?.[1] ?? "", /border-top:\s*0/u);
  assert.match(css, /\.document-panel__intro\s*\{[^}]*border-inline-end:\s*0;/u);
  assert.doesNotMatch(css, /\.document-panel__next\s*\{/u);
  assert.match(css, /@keyframes\s+document-tab-backlight/u);
  assert.match(css, /@media\s*\(prefers-reduced-motion:\s*reduce\)[\s\S]*?\.document-tabs button\[aria-selected="true"\]\s*\{[^}]*animation:\s*none/u);
  assert.match(css, /\.document-tabs button:focus-visible/u);
});

test("self-check projection counts real states and formats only actionable pending items", async () => {
  const [html, app, styles] = await Promise.all([
    readFile(htmlPath, "utf8"),
    import(`${pathToFileURL(appPath).href}?self-check-projection=${Date.now()}`),
    readFile(cssPath, "utf8"),
  ]);

  assert.doesNotMatch(html, /quote-context-bar|data-quote-context/u);
  assert.doesNotMatch(html, /document-panel__next|data-next-document-tab|data-view-cross-summary/u);
  assert.doesNotMatch(html, /檢查報告輸出|文件基礎已建立|查看跨文件整理/u);

  const items = [
    { category: "報價內容", id: "a", note: "", owner: "owner", question: "規格是否完整？", status: "clear" },
    { category: "報價內容", id: "b", note: "缺少材質", owner: "provider", question: "材質是否明確？", status: "needs-info" },
    { category: "契約條款", id: "c", note: "", owner: "owner", question: "付款節點是否明確？", status: "uncertain" },
    { category: "施工圖說", id: "d", note: "", owner: "owner", question: "版次是否一致？", status: "unconfirmed" },
  ];
  const projection = app.projectSelfCheckItems(items);
  assert.deepEqual(
    {
      clear: projection.clear,
      confirmed: projection.confirmed,
      needsInfo: projection.needsInfo,
      owner: projection.owner,
      pending: projection.pending.length,
      provider: projection.provider,
      total: projection.total,
      uncertain: projection.uncertain,
      unconfirmed: projection.unconfirmed,
    },
    { clear: 1, confirmed: 3, needsInfo: 1, owner: 1, pending: 2, provider: 1, total: 4, uncertain: 1, unconfirmed: 1 },
  );
  const copy = app.formatPendingItems(items);
  assert.match(copy, /報價內容｜需要補件[\s\S]*材質是否明確？[\s\S]*缺少材質[\s\S]*設計師／統包/u);
  assert.match(copy, /契約條款｜我不確定[\s\S]*付款節點是否明確？[\s\S]*我（甲方）/u);
  assert.doesNotMatch(copy, /規格是否完整|版次是否一致/u);

  const appSource = await readFile(appPath, "utf8");
  assert.match(appSource, /已複製待確認事項。/u);
  assert.match(appSource, /目前無法自動複製，請手動選取待確認事項。/u);
  assert.match(styles, /\.self-check-summary\s*,\s*\.pending-items\s*\{/u);
  assert.match(styles, /\.pending-items__list\s*\{/u);

  const visible = stripNonVisibleHtml(html);
  assert.doesNotMatch(visible, /健檢完成|正式健檢結果|已完成 PDF 分析|風險評分|已產生報告/u);
});

test("document tabs use a restrained cool-to-magenta neon outline with distinct states", async () => {
  const css = await readFile(cssPath, "utf8");
  const inactiveSurface = css.match(/\.document-tabs button\s*\{([^}]*)\}/u)?.[1] ?? "";
  const hoverSurface = css.match(/\.document-tabs button:hover\s*\{([^}]*)\}/u)?.[1] ?? "";
  const activeSurface =
    css.match(/\.document-tabs button\[aria-selected="true"\]\s*\{([^}]*)\}/u)?.[1] ?? "";
  const focusSurface = css.match(/\.document-tabs button:focus-visible\s*\{([^}]*)\}/u)?.[1] ?? "";
  const neonRing = css.match(/\.document-tabs button::before\s*\{([^}]*)\}/u)?.[1] ?? "";

  assert.match(inactiveSurface, /border:\s*1px solid transparent/u);
  assert.match(inactiveSurface, /--tab-neon-start:\s*rgba\(139,\s*130,\s*255,\s*0\.58\);[\s\S]*--tab-neon-end:\s*rgba\(255,\s*112,\s*199,\s*0\.58\);/u);
  assert.match(inactiveSurface, /background:\s*radial-gradient\(circle at 72% -20%,[\s\S]*repeating-linear-gradient/u);
  assert.doesNotMatch(inactiveSurface, /linear-gradient\(105deg/u);
  assert.match(inactiveSurface, /backdrop-filter:\s*blur\(22px\) saturate\(135%\)/u);
  assert.match(inactiveSurface, /box-shadow:[\s\S]*-4px 0 12px rgba\(139,\s*130,\s*255,\s*0\.1\)[\s\S]*4px 0 12px rgba\(255,\s*112,\s*199,\s*0\.08\)[\s\S]*inset 5px 0 14px rgba\(139,\s*130,\s*255,\s*0\.04\)[\s\S]*inset -5px 0 14px rgba\(255,\s*112,\s*199,\s*0\.035\)/u);
  assert.match(neonRing, /background:\s*linear-gradient\(105deg,\s*var\(--tab-neon-start\),\s*var\(--tab-neon-mid\) 50%,\s*var\(--tab-neon-end\)\)/u);
  assert.match(neonRing, /-webkit-mask:[\s\S]*content-box[\s\S]*-webkit-mask-composite:\s*xor;[\s\S]*mask-composite:\s*exclude;/u);

  assert.match(hoverSurface, /--tab-neon-start:\s*rgba\(139,\s*130,\s*255,\s*0\.78\);[\s\S]*--tab-neon-end:\s*rgba\(255,\s*112,\s*199,\s*0\.78\);/u);
  assert.match(hoverSurface, /box-shadow:[\s\S]*-5px 0 14px rgba\(139,\s*130,\s*255,\s*0\.17\)[\s\S]*5px 0 14px rgba\(255,\s*112,\s*199,\s*0\.15\)/u);

  assert.match(activeSurface, /border-color:\s*transparent/u);
  assert.match(activeSurface, /--tab-neon-start:\s*var\(--tab-neon-cool\);[\s\S]*--tab-neon-end:\s*var\(--tab-neon-pink\);/u);
  assert.match(activeSurface, /background:[\s\S]*var\(--tab-panel-surface\)/u);
  assert.match(
    activeSurface,
    /box-shadow:[\s\S]*-6px 0 14px rgba\(139,\s*130,\s*255,\s*0\.26\)[\s\S]*6px 0 14px rgba\(255,\s*112,\s*199,\s*0\.24\)[\s\S]*inset 7px 0 16px rgba\(139,\s*130,\s*255,\s*0\.1\)[\s\S]*inset -7px 0 16px rgba\(255,\s*112,\s*199,\s*0\.09\)/u,
  );
  assert.match(focusSurface, /outline:\s*2px solid #f3f5ff;[^}]*outline-offset:\s*3px;/u);
  assert.doesNotMatch(focusSurface, /box-shadow|filter|drop-shadow/u);
  assert.match(
    activeSurface,
    /animation:\s*document-tab-backlight 360ms cubic-bezier\(0\.22,\s*1,\s*0\.36,\s*1\)/u,
  );
  assert.match(
    css,
    /@keyframes document-tab-backlight\s*\{[\s\S]*?0%\s*\{[^}]*box-shadow:[^}]*\}[\s\S]*?54%\s*\{[^}]*box-shadow:/u,
  );
  assert.match(
    css,
    /@media\s*\(prefers-reduced-motion:\s*reduce\)[\s\S]*?\.document-tabs button\[aria-selected="true"\]\s*\{[^}]*animation:\s*none !important/u,
  );
});

test("tab edge clearance contains the strongest halo animation and focus indicator", async () => {
  const css = await readFile(cssPath, "utf8");
  const tabsSurface = css.match(/\.document-tabs\s*\{([^}]*)\}/u)?.[1] ?? "";
  const activeSurface =
    css.match(/\.document-tabs button\[aria-selected="true"\]\s*\{([^}]*)\}/u)?.[1] ?? "";
  const focusSurface = css.match(/\.document-tabs button:focus-visible\s*\{([^}]*)\}/u)?.[1] ?? "";
  const animationPeak = css.match(
    /@keyframes document-tab-backlight\s*\{[\s\S]*?54%\s*\{[^}]*box-shadow:\s*(-?\d+)px\s+0\s+(\d+)px/u,
  );
  const activeHalo = activeSurface.match(/box-shadow:\s*(-?\d+)px\s+0\s+(\d+)px/u);
  const edgeClearance = Number(tabsSurface.match(/--tab-edge-clearance:\s*(\d+)px/u)?.[1]);
  const focusWidth = Number(focusSurface.match(/outline:\s*(\d+)px/u)?.[1]);
  const focusOffset = Number(focusSurface.match(/outline-offset:\s*(\d+)px/u)?.[1]);
  const activeExtent = Math.abs(Number(activeHalo?.[1])) + Number(activeHalo?.[2]);
  const animatedExtent = Math.abs(Number(animationPeak?.[1])) + Number(animationPeak?.[2]);
  const focusExtent = focusWidth + focusOffset;

  assert.equal(edgeClearance, 32);
  assert.equal(activeExtent, 20);
  assert.equal(animatedExtent, 26);
  assert.equal(focusExtent, 5);
  assert.ok(edgeClearance > activeExtent, "steady halo must remain inside the shell gutter");
  assert.ok(edgeClearance > animatedExtent, "animated halo peak must remain inside the shell gutter");
  assert.ok(edgeClearance > focusExtent, "focus ring must remain inside the shell gutter");
  assert.match(tabsSurface, /padding:\s*0 var\(--tab-edge-clearance\)/u);
  assert.match(
    css,
    /@media\s*\(max-width:\s*760px\)[\s\S]*?\.document-tabs\s*\{[^}]*gap:\s*28px;[^}]*margin-block-end:\s*12px;[^}]*padding:\s*8px var\(--tab-edge-clearance\);/u,
  );
});

test("document tabs keep every actionable target fully visible on mobile and respect reduced motion", async () => {
  const css = await readFile(cssPath, "utf8");
  const mobileSource = css.match(/@media\s*\(max-width:\s*760px\)\s*\{([\s\S]*?)\n\}/u)?.[1] ?? "";

  assert.match(
    css,
    /@media\s*\(max-width:\s*760px\)[\s\S]*?\.document-tabs\s*\{[^}]*grid-template-columns:\s*1fr;[^}]*gap:\s*28px;[^}]*margin-block-end:\s*12px;[^}]*overflow-x:\s*visible/u,
  );
  assert.match(
    css,
    /@media\s*\(max-width:\s*760px\)[\s\S]*?\.document-tabs button\s*\{[^}]*width:\s*100%;[^}]*min-width:\s*0/u,
  );
  assert.doesNotMatch(mobileSource, /border-bottom:/u);
  assert.match(css, /@media\s*\(prefers-reduced-motion:\s*reduce\)/u);
});

test("selection stays local and never claims durable upload or a formal result", async () => {
  const html = await readOrEmpty(htmlPath);
  const visible = stripNonVisibleHtml(html);
  assert.match(html, /type="file"/);
  assert.match(html, /accept="application\/pdf,\.pdf"/);
  assert.match(visible, /檔案不會上傳或保存，也不會對掃描檔執行 OCR/);
  assert.match(visible, /本次選擇只保留在目前頁面；重新整理或離開後會消失，尚未建立案件紀錄/);
  assert.doesNotMatch(visible, /上傳成功|已保存|已建立案件|健檢完成|正式健檢結果/);
  assert.doesNotMatch(
    `${html}\n${await readOrEmpty(appPath)}`,
    /localStorage|sessionStorage|FileReader|raw JSON/i,
  );
  assert.match(await readOrEmpty(appPath), /location\.hash/u);
  assert.match(await readOrEmpty(appPath), /URLSearchParams/u);
});

test("file metadata policy accepts MIME or pdf extension before byte-level intake", async () => {
  const [html, app] = await Promise.all([
    readOrEmpty(htmlPath),
    import(`${pathToFileURL(appPath).href}?pdf-metadata-policy=${Date.now()}`),
  ]);
  const visible = stripNonVisibleHtml(html);
  assert.equal(app.isAcceptedPdfFileMetadata("報價.txt", "application/pdf"), true);
  assert.equal(app.isAcceptedPdfFileMetadata("報價.PDF", "text/plain"), true);
  assert.equal(app.isAcceptedPdfFileMetadata("報價.txt", "text/plain"), false);
  assert.equal(app.isAcceptedPdfFileMetadata("   ", "application/pdf"), false);
  assert.match(visible, /不會上傳或保存[\s\S]*不會對掃描檔執行 OCR/u);
  assert.doesNotMatch(visible, /已保存|已建立案件|(?:MB|GB|頁)\s*(?:上限|以內|以下|不得超過)/i);
});

test("failure states are closed actionable responsible and recoverable", async () => {
  assert.equal(existsSync(appPath), true, "app.js must exist before import");
  const module = await import(`${pathToFileURL(appPath).href}?failure-contract`);
  const failures = module.QUOTE_CHECK_FAILURES;
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
    assert.equal(state.caseData, null);
    assertZeroAuthorityActions(state.actions, code);
    assert.ok(Object.isFrozen(state));
  }
});

test("state resolver is strict closed and survives hostile post-load intrinsics", async () => {
  assert.equal(existsSync(appPath), true, "app.js must exist before import");
  const module = await import(`${pathToFileURL(appPath).href}?hostile-contract`);
  const resolveState = module.resolveQuoteCheckState;
  assert.equal(typeof resolveState, "function");

  const descriptors = {
    trim: Object.getOwnPropertyDescriptor(String.prototype, "trim"),
    test: Object.getOwnPropertyDescriptor(RegExp.prototype, "test"),
    forEach: Object.getOwnPropertyDescriptor(Array.prototype, "forEach"),
    has: Object.getOwnPropertyDescriptor(Set.prototype, "has"),
    injected: Object.getOwnPropertyDescriptor(Object.prototype, "step"),
  };
  Object.defineProperty(String.prototype, "trim", {
    configurable: true,
    value() {
      throw new Error("poisoned trim");
    },
  });
  Object.defineProperty(RegExp.prototype, "test", {
    configurable: true,
    value() {
      throw new Error("poisoned test");
    },
  });
  Object.defineProperty(Array.prototype, "forEach", {
    configurable: true,
    value() {
      throw new Error("poisoned forEach");
    },
  });
  Object.defineProperty(Set.prototype, "has", {
    configurable: true,
    value() {
      throw new Error("poisoned has");
    },
  });
  Object.defineProperty(Object.prototype, "step", {
    configurable: true,
    value: "RESULT_FORMAT",
  });

  try {
    const unknown = resolveState({ step: "UNKNOWN" });
    assert.equal(unknown.code, "CONTEXT_UNAVAILABLE");
    assert.equal(unknown.payloadPolicy, "ZERO_CASE_DATA");
    assert.equal(unknown.caseData, null);
    assert.equal(unknown.mutationAllowed, false);
    assertZeroAuthorityActions(unknown.actions, "unknown state");
    assert.equal(resolveState({}).code, "CONTEXT_UNAVAILABLE");
    assert.equal(resolveState(null).code, "CONTEXT_UNAVAILABLE");
    assert.equal(resolveState(Object.create({ step: "RESULT_FORMAT" })).code, "CONTEXT_UNAVAILABLE");
    assert.equal(resolveState({ step: "INTRODUCTION", extra: true }).code, "CONTEXT_UNAVAILABLE");
    assert.equal(resolveState(new Proxy({ step: "RESULT_FORMAT" }, {})).code, "CONTEXT_UNAVAILABLE");
    const revoked = Proxy.revocable({ step: "RESULT_FORMAT" }, {});
    revoked.revoke();
    assert.doesNotThrow(() => resolveState(revoked.proxy));
    assert.equal(resolveState(revoked.proxy).code, "CONTEXT_UNAVAILABLE");
    assert.equal(resolveState({ step: "INTRODUCTION" }).code, "INTRODUCTION");
    assert.equal(
      resolveState({ step: "FAILURE", failureCode: "FILE_FORMAT_INVALID" }).code,
      "FILE_FORMAT_INVALID",
    );
  } finally {
    for (const [key, target, property] of [
      ["trim", String.prototype, "trim"],
      ["test", RegExp.prototype, "test"],
      ["forEach", Array.prototype, "forEach"],
      ["has", Set.prototype, "has"],
      ["injected", Object.prototype, "step"],
    ]) {
      const descriptor = descriptors[key];
      if (descriptor) Object.defineProperty(target, property, descriptor);
      else delete target[property];
    }
  }
});

test("zero-authority actions reject inherited array slots and iterator injection", async () => {
  const module = await import(`${pathToFileURL(appPath).href}?zero-actions-pollution`);
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
    const introductionActions = module.QUOTE_CHECK_STATES.INTRODUCTION.actions;
    const failureActions = module.QUOTE_CHECK_FAILURES.FILE_FORMAT_INVALID.actions;
    const unknownActions = module.resolveQuoteCheckState({ step: "UNKNOWN" }).actions;
    observations.introduction = {
      prototype: Object.getPrototypeOf(introductionActions),
      index: introductionActions[0],
      spread: [...introductionActions],
    };
    observations.failure = {
      prototype: Object.getPrototypeOf(failureActions),
      index: failureActions[0],
      spread: [...failureActions],
    };
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

test("zero-authority actions remain safely iterable when the shared iterator throws", async () => {
  const module = await import(`${pathToFileURL(appPath).href}?zero-actions-throwing-iterator`);
  const iteratorDescriptor = Object.getOwnPropertyDescriptor(
    Array.prototype,
    Symbol.iterator,
  );
  Object.defineProperty(Array.prototype, Symbol.iterator, {
    configurable: true,
    value() {
      throw new Error("shared array iterator must not be consulted");
    },
  });
  let spreadResult;
  let spreadError = null;
  try {
    try {
      spreadResult = [...module.QUOTE_CHECK_STATES.INTRODUCTION.actions];
    } catch (error) {
      spreadError = error;
    }
  } finally {
    Object.defineProperty(Array.prototype, Symbol.iterator, iteratorDescriptor);
  }
  assert.equal(spreadError, null);
  assert.deepEqual(spreadResult, []);
});

test("actual file handler rejects ordinary text and accepts a pdf filename without reading bytes", async () => {
  assert.equal(existsSync(appPath), true, "app.js must exist before import");
  const harness = await initializeFileHandlerHarness("renamed-text-handler");
  harness.dispatchFile(browserFile("報價.txt", "text/plain"));
  assert.equal(harness.visibleState(), "FAILURE");
  assert.doesNotThrow(() => {
    harness.dispatchFile(browserFile("報價.pdf", "text/plain"));
  });
  assert.equal(harness.visibleState(), "VALIDATION_PENDING");
});

test("actual file handler fails closed when the selected file list is hostile", async () => {
  const throwingFiles = await initializeFileHandlerHarness("throwing-files-getter");
  Object.defineProperty(throwingFiles.fileInput, "files", {
    configurable: true,
    get() {
      throw new Error("files getter must not escape");
    },
  });
  assert.doesNotThrow(() => throwingFiles.dispatchChange());
  assert.equal(throwingFiles.visibleState(), "FAILURE");

  const throwingLength = await initializeFileHandlerHarness("throwing-files-length");
  throwingLength.fileInput.files = new Proxy({}, {
    get(_target, property) {
      if (property === "length") throw new Error("length must not escape");
      return undefined;
    },
  });
  assert.doesNotThrow(() => throwingLength.dispatchChange());
  assert.equal(throwingLength.visibleState(), "FAILURE");

  const sparseList = await initializeFileHandlerHarness("sparse-files-list");
  assert.doesNotThrow(() => sparseList.dispatchFiles(new Array(1)));
  assert.equal(sparseList.visibleState(), "FAILURE");

  const throwingIndex = await initializeFileHandlerHarness("throwing-files-index");
  const hostileIndex = { length: 1 };
  Object.defineProperty(hostileIndex, "0", {
    configurable: true,
    get() {
      throw new Error("index must not escape");
    },
  });
  assert.doesNotThrow(() => throwingIndex.dispatchFiles(hostileIndex));
  assert.equal(throwingIndex.visibleState(), "FAILURE");

  const revokedList = await initializeFileHandlerHarness("revoked-files-proxy");
  const revoked = Proxy.revocable({ 0: { name: "estimate.pdf", type: "application/pdf" }, length: 1 }, {});
  revoked.revoke();
  assert.doesNotThrow(() => revokedList.dispatchFiles(revoked.proxy));
  assert.equal(revokedList.visibleState(), "FAILURE");

  const emptyList = await initializeFileHandlerHarness("empty-files-list");
  assert.doesNotThrow(() => emptyList.dispatchFile(null));
  assert.equal(emptyList.visibleState(), "SELECT_FILE");
});

test("actual file handler rejects inherited Array file slots", async () => {
  const harness = await initializeFileHandlerHarness("inherited-array-slot");
  const inheritedFiles = runInNewContext(
    "Array.prototype[0] = file; new Array(1)",
    { file: browserFile("繼承報價.pdf", "application/pdf") },
  );
  assert.doesNotThrow(() => harness.dispatchFiles(inheritedFiles));
  assert.equal(harness.visibleState(), "FAILURE");
  assert.equal(harness.selectedName(), "尚未選擇");
});

test("actual file handler rejects inherited file metadata", async () => {
  const harness = await initializeFileHandlerHarness("inherited-file-metadata");
  const inheritedMetadata = runInNewContext(
    'Object.prototype.name = "繼承報價.pdf"; Object.prototype.type = "application/pdf"; ({})',
  );
  assert.doesNotThrow(() => harness.dispatchFile(inheritedMetadata));
  assert.equal(harness.visibleState(), "FAILURE");
  assert.equal(harness.selectedName(), "尚未選擇");
});

test("actual file handler rejects inherited file-list length", async () => {
  const harness = await initializeFileHandlerHarness("inherited-file-list-length");
  const inheritedList = Object.create({ length: 1 });
  Object.defineProperty(inheritedList, "0", {
    configurable: true,
    enumerable: true,
    value: browserFile("繼承長度.pdf", "application/pdf"),
  });
  assert.doesNotThrow(() => harness.dispatchFiles(inheritedList));
  assert.equal(harness.visibleState(), "FAILURE");
  assert.equal(harness.selectedName(), "尚未選擇");
});

test("actual file handler rejects forged File prototype identity", async () => {
  const harness = await initializeFileHandlerHarness("forged-file-prototype");
  const forgedFile = Object.create(File.prototype);
  Object.defineProperty(forgedFile, "name", {
    configurable: true,
    enumerable: true,
    value: "偽造報價.pdf",
  });
  Object.defineProperty(forgedFile, "type", {
    configurable: true,
    enumerable: true,
    value: "application/pdf",
  });
  assert.doesNotThrow(() => harness.dispatchFile(forgedFile));
  assert.equal(harness.visibleState(), "FAILURE");
  assert.equal(harness.selectedName(), "尚未選擇");
});

test("actual file handler rejects own metadata shadows on a genuine File", async () => {
  const harness = await initializeFileHandlerHarness("genuine-file-own-shadows");
  const shadowedFile = browserFile("原始文字.txt", "text/plain");
  Object.defineProperty(shadowedFile, "name", {
    configurable: true,
    enumerable: true,
    value: "偽造報價.pdf",
  });
  Object.defineProperty(shadowedFile, "type", {
    configurable: true,
    enumerable: true,
    value: "application/pdf",
  });
  assert.doesNotThrow(() => harness.dispatchFile(shadowedFile));
  assert.equal(harness.visibleState(), "FAILURE");
  assert.equal(harness.selectedName(), "尚未選擇");
});

test("actual file handler accepts a genuine branded File subclass", async () => {
  class BrowserFileSubclass extends File {}
  const harness = await initializeFileHandlerHarness("genuine-file-subclass");
  const file = new BrowserFileSubclass(
    ["local test bytes"],
    "子類報價.pdf",
    { type: "application/pdf" },
  );
  assert.doesNotThrow(() => harness.dispatchFile(file));
  assert.equal(harness.visibleState(), "VALIDATION_PENDING");
  assert.equal(harness.selectedName(), "子類報價.pdf");
});

test("actual file handler rejects unsafe metadata without claiming file bytes are not PDF", async () => {
  const throwingName = browserFile("estimate.pdf", "application/pdf");
  Object.defineProperty(throwingName, "name", {
    configurable: true,
    get() {
      throw new Error("name must not escape");
    },
  });
  Object.defineProperty(throwingName, "type", {
    configurable: true,
    value: "application/pdf",
  });

  const throwingType = browserFile("estimate.pdf", "application/pdf");
  Object.defineProperty(throwingType, "type", {
    configurable: true,
    get() {
      throw new Error("type must not escape");
    },
  });

  const invalidMetadata = [
    ["throwing-name", throwingName],
    ["throwing-type", throwingType],
    ["blank-name", { name: "", type: "application/pdf" }],
    ["whitespace-name", { name: " \t\n", type: "application/pdf" }],
    ["non-string-name", { name: 42, type: "application/pdf" }],
    ["missing-type", { name: "estimate.pdf" }],
    ["empty-type", { name: "estimate.pdf", type: "" }],
    ["whitespace-type", { name: "estimate.pdf", type: "   " }],
    ["non-string-type", { name: "estimate.pdf", type: 42 }],
    ["non-pdf-type", { name: "estimate.pdf", type: "text/plain" }],
  ];

  for (const [tag, file] of invalidMetadata) {
    const harness = await initializeFileHandlerHarness(`invalid-metadata-${tag}`);
    assert.doesNotThrow(() => harness.dispatchFile(file), tag);
    assert.equal(harness.visibleState(), "FAILURE", tag);
    assert.match(harness.failureReason(), /瀏覽器.*未提供.*PDF.*內容格式.*仍未驗證/, tag);
    assert.doesNotMatch(harness.failureReason(), /檔案內容.*不是 PDF|不是可辨識的 PDF/, tag);
  }
});

test("actual file handler ignores post-load slice and lowercase rewriting", async () => {
  const harness = await initializeFileHandlerHarness("rewritten-string-handler");
  const sliceDescriptor = Object.getOwnPropertyDescriptor(String.prototype, "slice");
  const lowerDescriptor = Object.getOwnPropertyDescriptor(
    String.prototype,
    "toLowerCase",
  );
  Object.defineProperty(String.prototype, "slice", {
    configurable: true,
    value() {
      return ".pdf";
    },
  });
  Object.defineProperty(String.prototype, "toLowerCase", {
    configurable: true,
    value() {
      return ".pdf";
    },
  });
  try {
    assert.doesNotThrow(() => {
      harness.dispatchFile(browserFile("報價.txt", "text/plain"));
    });
    assert.equal(harness.visibleState(), "FAILURE");
    assert.doesNotThrow(() => {
      harness.dispatchFile(browserFile("報價.pdf", "application/pdf"));
    });
    assert.equal(harness.visibleState(), "VALIDATION_PENDING");
  } finally {
    Object.defineProperty(String.prototype, "slice", sliceDescriptor);
    Object.defineProperty(String.prototype, "toLowerCase", lowerDescriptor);
  }
});

test("actual file handler stays closed when post-load string methods throw", async () => {
  const harness = await initializeFileHandlerHarness("throwing-string-handler");
  const sliceDescriptor = Object.getOwnPropertyDescriptor(String.prototype, "slice");
  const lowerDescriptor = Object.getOwnPropertyDescriptor(
    String.prototype,
    "toLowerCase",
  );
  Object.defineProperty(String.prototype, "slice", {
    configurable: true,
    value() {
      throw new Error("poisoned slice");
    },
  });
  Object.defineProperty(String.prototype, "toLowerCase", {
    configurable: true,
    value() {
      throw new Error("poisoned toLowerCase");
    },
  });
  try {
    assert.doesNotThrow(() => {
      harness.dispatchFile(browserFile("報價.txt", "text/plain"));
    });
    assert.equal(harness.visibleState(), "FAILURE");
    assert.doesNotThrow(() => {
      harness.dispatchFile(browserFile("報價.pdf", "application/pdf"));
    });
    assert.equal(harness.visibleState(), "VALIDATION_PENDING");
  } finally {
    Object.defineProperty(String.prototype, "slice", sliceDescriptor);
    Object.defineProperty(String.prototype, "toLowerCase", lowerDescriptor);
  }
});

test("actual file handler keeps browser PDF metadata in validation pending", async () => {
  const harness = await initializeFileHandlerHarness("pdf-metadata-handler");
  assert.doesNotThrow(() => {
    harness.dispatchFile(browserFile("報價.pdf", "application/pdf"));
  });
  assert.equal(harness.visibleState(), "VALIDATION_PENDING");
  assert.equal(harness.selectedName(), "報價.pdf");
  assert.doesNotThrow(() => {
    harness.dispatchFile(browserFile("報價.txt", "application/pdf"));
  });
  assert.equal(harness.visibleState(), "VALIDATION_PENDING");
  assert.equal(harness.selectedName(), "報價.txt");
});

test("actual hero listener projects validation pending to its legal next step instead of CONSENT", async () => {
  const harness = await initializeFileHandlerHarness("hero-validation-pending-listener");

  assert.deepEqual(harness.heroAction(), {
    ariaDisabled: "false",
    disabled: false,
    label: "開始報價健檢準備",
    target: "CONSENT",
  });
  harness.dispatchHero();
  assert.equal(harness.visibleState(), "CONSENT");

  harness.dispatchFile(browserFile("報價.pdf", "application/pdf"));
  assert.equal(harness.visibleState(), "VALIDATION_PENDING");
  assert.deepEqual(harness.heroAction(), {
    ariaDisabled: "false",
    disabled: false,
    label: "查看待確認清單",
    target: "CORRECTION_REQUIRED",
  });

  harness.dispatchHero();
  assert.equal(harness.visibleState(), "CORRECTION_REQUIRED");
  assert.notEqual(harness.visibleState(), "CONSENT");
});

test("hero action projection is closed, state-owned, and leaves no target when a next step is gated", async () => {
  const appModule = await import(
    `${pathToFileURL(appPath).href}?hero-action-projection-contract`,
  );
  const expectedOpenStates = [
    ["INTRODUCTION", "開始報價健檢準備", true, "CONSENT"],
    ["CONSENT", "請先同意本機檢視", false, null],
    ["SELECT_FILE", "選擇報價 PDF", true, "OPEN_FILE"],
    ["VALIDATION_PENDING", "查看待確認清單", true, "CORRECTION_REQUIRED"],
    ["CORRECTION_REQUIRED", "重新選擇報價 PDF", true, "RESELECT_FILE"],
    ["RESELECT_FILE", "選擇另一份 PDF", true, "OPEN_FILE"],
    ["RESULT_FORMAT", "查看目前結果狀態", true, "RESULT_UNAVAILABLE"],
    ["RESULT_UNAVAILABLE", "重新選擇報價 PDF", true, "SELECT_FILE"],
  ];

  for (const [code, label, enabled, target] of expectedOpenStates) {
    const action = appModule.projectQuoteCheckHeroAction(
      appModule.QUOTE_CHECK_STATES[code],
    );
    assert.deepEqual(
      { label: action.label, enabled: action.enabled, target: action.target },
      { label, enabled, target },
      code,
    );
  }

  for (const failure of Object.values(appModule.QUOTE_CHECK_FAILURES)) {
    const action = appModule.projectQuoteCheckHeroAction(failure);
    const label = failure === appModule.QUOTE_CHECK_FAILURES.QUOTE_ONLY_DRAWING_MISSING
      ? "前往圖說檢討"
      : "依建議恢復";
    assert.deepEqual(
      { label: action.label, enabled: action.enabled, target: action.target },
      { label, enabled: true, target: failure.recoveryStep },
      failure.code,
    );
  }

  const unavailable = appModule.projectQuoteCheckHeroAction(
    appModule.CONTEXT_UNAVAILABLE,
  );
  assert.deepEqual(
    { label: unavailable.label, enabled: unavailable.enabled, target: unavailable.target },
    { label: "目前沒有可執行的下一步", enabled: false, target: null },
  );
});

test("hero action projection rejects hostile caller lookalikes without reading caller properties", async () => {
  const appModule = await import(
    `${pathToFileURL(appPath).href}?hero-action-canonical-identity-boundary`,
  );
  let getterCalls = 0;
  let proxyGetCalls = 0;
  const ownAccessor = {};
  Object.defineProperty(ownAccessor, "code", {
    configurable: true,
    get() {
      getterCalls += 1;
      return "INTRODUCTION";
    },
  });
  const proxyCaller = new Proxy({}, {
    get() {
      proxyGetCalls += 1;
      return "INTRODUCTION";
    },
  });
  const functionCaller = function hostileCaller() {};
  Object.defineProperty(functionCaller, "code", {
    configurable: true,
    value: "INTRODUCTION",
  });
  const priorObjectPrototypeCode = Object.getOwnPropertyDescriptor(
    Object.prototype,
    "code",
  );
  Object.defineProperty(Object.prototype, "code", {
    configurable: true,
    value: "INTRODUCTION",
    writable: true,
  });

  try {
    const hostileCallers = [
      {},
      Object.create({ code: "INTRODUCTION" }),
      ownAccessor,
      proxyCaller,
      { code: "INTRODUCTION" },
      { code: "INTRODUCTION", extra: true },
      Object.assign(Object.create(null), { code: "INTRODUCTION" }),
      functionCaller,
    ];

    for (const caller of hostileCallers) {
      const action = appModule.projectQuoteCheckHeroAction(caller);
      assert.equal(action.enabled, false);
      assert.equal(action.target, null);
    }
  } finally {
    if (priorObjectPrototypeCode) {
      Object.defineProperty(Object.prototype, "code", priorObjectPrototypeCode);
    } else {
      delete Object.prototype.code;
    }
  }

  assert.equal(getterCalls, 0);
  assert.equal(proxyGetCalls, 0);
});

test("invalid replacement clears stale file identity and recovery moves focus", async () => {
  const harness = await initializeFileHandlerHarness("clear-stale-file-and-focus");
  harness.dispatchFile(browserFile("目前報價.pdf", "application/pdf"));
  assert.equal(harness.visibleState(), "VALIDATION_PENDING");
  assert.equal(harness.selectedName(), "目前報價.pdf");

  harness.dispatchFile(browserFile("錯誤格式.txt", "text/plain"));
  assert.equal(harness.visibleState(), "FAILURE");
  assert.equal(harness.selectedName(), "尚未選擇");
  assert.equal(harness.inputValue(), "");
  assert.equal(harness.focusedPanel(), "FAILURE");

  harness.dispatchRecover();
  assert.equal(harness.visibleState(), "RESELECT_FILE");
  assert.equal(harness.selectedName(), "尚未選擇");
  assert.equal(harness.inputValue(), "");
  assert.equal(harness.focusedPanel(), "RESELECT_FILE");
});

test("validation pending state describes metadata without claiming content recognition", async () => {
  const appModule = await import(
    `${pathToFileURL(appPath).href}?truthful-validation-copy`
  );
  const pending = appModule.QUOTE_CHECK_STATES.VALIDATION_PENDING;
  assert.match(pending.title, /標示.*內容格式待驗證/);
  assert.match(pending.reason, /瀏覽器標示為 PDF；檔名僅供辨識，內容格式尚待驗證/);
  assert.doesNotMatch(pending.reason, /檔名.*為 PDF/);
  assert.doesNotMatch(`${pending.title} ${pending.reason}`, /格式已辨識|已在本機辨識/);
});

test("quote drawing and account routes remain active while compatibility pages remain aliases", async () => {
  const manifestModule = await import(
    `${pathToFileURL(routeManifestPath).href}?t3-route-contract`
  );
  const contractModule = await import(
    `${pathToFileURL(publicContractPath).href}?t3-public-contract`
  );
  const nodes = manifestModule.PCM_FLOW_NODES;
  const byId = Object.fromEntries(nodes.map((node) => [node.id, node]));
  assert.deepEqual(byId.quoteCheck, {
    id: "quoteCheck",
    publicPath: "/pcm/quote-check",
    label: "報價健檢",
    role: "甲方",
    owner: "A0",
    lifecycle: "active",
    gate: "G1_UI_SOURCE",
    href: "../quote_check/code.html",
  });
  assert.equal(byId.drawingCheck.lifecycle, "active");
  assert.equal(byId.drawingCheck.href, "../drawing_check/code.html");
  assert.equal(byId.accountAccess.lifecycle, "active");
  assert.equal(byId.accountAccess.href, "../account_access/code.html");
  const quoteEdge = manifestModule.PCM_FLOW_EDGES.find(
    (edge) => edge.from === "home" && edge.to === "quoteCheck",
  );
  assert.equal(quoteEdge.clickable, true);
  assert.equal(contractModule.PUBLIC_ROUTES.quoteCheck, "../quote_check/code.html");
  assert.equal(contractModule.PUBLIC_ROUTES.drawingCheck, "../drawing_check/code.html");
  assert.equal(contractModule.PUBLIC_ROUTES.accountAccess, "../account_access/code.html");
  const canonicalIds = new Set(nodes.map((node) => node.id));
  for (const alias of ["ownerStart", "documentCorrections", "basicReport", "selfServiceArchive"]) {
    assert.equal(canonicalIds.has(alias), false, alias);
  }
});

test("normal quote workflow exposes one visible exact guarded drawing-check CTA", async () => {
  const [html, appModule, manifestModule] = await Promise.all([
    readOrEmpty(htmlPath),
    import(`${pathToFileURL(appPath).href}?drawing-recovery-contract`),
    import(`${pathToFileURL(routeManifestPath).href}?drawing-recovery-route`),
  ]);
  const visible = stripNonVisibleHtml(html);
  const exactHref = "../drawing_check/code.html";
  const hrefs = [...html.matchAll(/<a\b[^>]*\bhref="([^"]*)"[^>]*\bdata-drawing-check-link\b[^>]*>/gi)]
    .map((match) => match[1]);

  assert.ok(hrefs.length >= 2, "result and failure recovery both expose an anchor");
  assert.deepEqual(new Set(hrefs), new Set([exactHref]));
  assert.match(
    html,
    /<a\b(?=[^>]*\bhref="\.\.\/drawing_check\/code\.html")(?=[^>]*\bdata-drawing-check-link)(?=[^>]*\bdata-drawing-check-primary)[^>]*>前往圖說檢討<\/a>/u,
  );
  assert.match(visible, /前往圖說檢討/u);
  assert.doesNotMatch(
    html,
    /<div hidden data-legacy-page-contract>[\s\S]*?data-drawing-check-primary/u,
  );
  assert.doesNotMatch(
    visible,
    /圖說檢討(?:入口)?尚未開放|圖說檢討正在整理中|目前沒有可點入口|圖說檢討入口開放後/,
  );
  assert.equal(
    appModule.QUOTE_CHECK_FAILURES.QUOTE_ONLY_DRAWING_MISSING.recoveryStep,
    "DRAWING_CHECK",
  );
  assert.match(
    appModule.QUOTE_CHECK_FAILURES.QUOTE_ONLY_DRAWING_MISSING.nextAction,
    /前往圖說檢討/,
  );
  const action = appModule.projectQuoteCheckHeroAction(
    appModule.QUOTE_CHECK_FAILURES.QUOTE_ONLY_DRAWING_MISSING,
  );
  assert.equal(action.label, "前往圖說檢討");
  assert.equal(action.enabled, true);
  assert.equal(action.target, "DRAWING_CHECK");

  assert.equal(appModule.resolveQuoteDrawingRoute(exactHref), exactHref);
  for (const unsafe of [
    null,
    undefined,
    "",
    "drawing_check/code.html",
    "../../outside.html",
    "javascript:alert(1)",
    "data:text/html,unsafe",
    "https://example.com/drawing",
    Object.create({ toString: () => exactHref }),
    new Proxy({}, { get() { throw new Error("route getter"); } }),
  ]) {
    assert.equal(appModule.resolveQuoteDrawingRoute(unsafe), null);
  }

  const edge = manifestModule.PCM_FLOW_EDGES.find(
    (candidate) => candidate.from === "quoteCheck" && candidate.to === "drawingCheck",
  );
  assert.equal(edge.clickable, true);
});

test("production drawing listener closes hostile hrefs after post-load intrinsic pollution", async () => {
  const source = await readFile(appPath, "utf8");
  const mutant = source.replace(
    "if (!readDrawingCheckHref(link)) preventUnsafeDrawingNavigation(event);",
    "void event;",
  );
  assert.notEqual(mutant, source, "mutation probe must remove the production guard");
  const mutated = runProductionDrawingRouteListenerProbe(mutant);
  mutated.primary.hrefValue = "javascript:alert(1)";
  assert.equal(
    mutated.dispatchPrimary(),
    1,
    "the mutation probe proves the regression test can observe unsafe navigation",
  );

  const probe = runProductionDrawingRouteListenerProbe(source);
  assert.equal(probe.dispatchPrimary(), 1, "exact local href remains keyboard/click operable");
  for (const href of [
    null,
    "",
    "../../outside.html",
    "javascript:alert(1)",
    "data:text/html,unsafe",
    "https://example.com/drawing",
  ]) {
    probe.primary.hrefValue = href;
    assert.equal(probe.dispatchPrimary(), 1, String(href));
  }

  const descriptors = {
    click: Object.getOwnPropertyDescriptor(probe.classes.HTMLElement.prototype, "click"),
    getAttribute: Object.getOwnPropertyDescriptor(probe.classes.Element.prototype, "getAttribute"),
    preventDefault: Object.getOwnPropertyDescriptor(probe.classes.Event.prototype, "preventDefault"),
  };
  let pollutedCalls = 0;
  try {
    Object.defineProperty(probe.classes.Element.prototype, "getAttribute", {
      configurable: true,
      value() {
        pollutedCalls += 1;
        return "../drawing_check/code.html";
      },
    });
    Object.defineProperty(probe.classes.Event.prototype, "preventDefault", {
      configurable: true,
      value() {
        pollutedCalls += 1;
      },
    });
    Object.defineProperty(probe.classes.HTMLElement.prototype, "click", {
      configurable: true,
      value() {
        pollutedCalls += 1;
      },
    });
    probe.primary.hrefValue = "javascript:alert(1)";
    assert.equal(probe.dispatchPrimary(), 1);
    assert.equal(pollutedCalls, 0, "post-load intrinsic pollution has zero authority");
  } finally {
    Object.defineProperty(probe.classes.HTMLElement.prototype, "click", descriptors.click);
    Object.defineProperty(probe.classes.Element.prototype, "getAttribute", descriptors.getAttribute);
    Object.defineProperty(probe.classes.Event.prototype, "preventDefault", descriptors.preventDefault);
  }
});

test("promoted workspace facts and focus targets stay visible at short viewports", async () => {
  const [html, styles] = await Promise.all([
    readOrEmpty(htmlPath),
    readOrEmpty(cssPath),
  ]);
  assert.equal((html.match(/data-current-status/g) ?? []).length, 2);
  assert.equal((html.match(/data-current-next/g) ?? []).length, 2);
  assert.doesNotMatch(html, /data-hero-start/);
  assert.equal((html.match(/data-panel-focus/g) ?? []).length, 9);
  assert.equal((html.match(/data-panel-focus[^>]*tabindex="-1"|tabindex="-1"[^>]*data-panel-focus/g) ?? []).length, 9);
  assert.match(styles, /\[data-panel-focus\]:focus/);
  assert.match(styles, /max-height:\s*700px/);
  assert.match(styles, /document-workspace--hero/);
  assert.doesNotMatch(styles, /\.quote-context-bar\s*\{/u);
  assert.match(
    styles,
    /@media\s*\(max-width:\s*760px\)[\s\S]*?\.quote-header__nav\s*\{[^}]*display:\s*grid;/u,
  );
});

test("visible product language excludes market payment and implementation vocabulary", async () => {
  const html = await readOrEmpty(htmlPath);
  const visible = stripNonVisibleHtml(html);
  assert.doesNotMatch(
    visible,
    /招標|投標|發標|決標|競標|標案|最低價保證|零風險|金流託管|支付託管|代收代付|付款保障|老屋煉金術|AI 最終裁決/i,
  );
  assert.doesNotMatch(
    visible,
    /\b(?:DB|API|mock|debug|runtime|source clean|raw JSON)\b/i,
  );
  for (const internalLabel of [
    ...requiredSteps,
    "FILE_RECOVERY",
    "TRACE BOUNDARY",
  ]) {
    assert.doesNotMatch(
      html,
      new RegExp(`>\\s*${internalLabel}\\s*<`),
      `visible internal label: ${internalLabel}`,
    );
  }
  assert.doesNotMatch(html, /https?:\/\//i);
  assert.doesNotMatch(html, /<script[^>]+src=["']https?:\/\//i);
  assert.doesNotMatch(html, /<link[^>]+href=["']https?:\/\//i);
  const styles = await readOrEmpty(cssPath);
  assert.match(
    styles,
    /\.file-choice:has\(\+\s*\.visually-hidden-file:focus-visible\)/,
  );
});

test("all local page references and fragments resolve", async () => {
  const html = await readOrEmpty(htmlPath);
  assert.ok(html.length > 0, "page HTML must exist");
  const references = [
    ...html.matchAll(/(?:href|src)=["']([^"']+)["']/g),
  ].map((match) => match[1]);
  for (const reference of references) {
    if (reference.startsWith("#")) {
      assert.match(html, new RegExp(`id=["']${reference.slice(1)}["']`), reference);
      continue;
    }
    const [pathAndQuery, fragment] = reference.split("#");
    const path = pathAndQuery.split("?")[0];
    const target = resolve(quoteDir, path);
    assert.equal(existsSync(target), true, reference);
    if (fragment) {
      const targetHtml = await readFile(target, "utf8");
      assert.match(targetHtml, new RegExp(`id=["']${fragment}["']`), reference);
    }
  }
});

test("T3 governance evidence closes exact-nine current receipts", async () => {
  const [manifestBytes, plan] = await Promise.all([
    readFile(governancePath),
    readFile(planPath, "utf8"),
  ]);
  const governance = JSON.parse(manifestBytes.toString("utf8"));
  const t3 = governance.t3;
  assert.ok(t3, "t3 evidence must exist");
  assert.equal(t3.parent, "3c525bb6625e8a6a8c30fecc1f9b7f506f313ad7");
  assert.deepEqual([...t3.writeSet].sort(), [...exactNine].sort());
  assert.equal(t3.outsideWriteSet, 0);
  assert.equal(t3.tdd.red.exitCode, 1);
  assert.equal(t3.tdd.green.failed, 0);
  assert.equal(t3.independentReview.critical, 0);
  assert.equal(t3.independentReview.important, 0);

  assert.equal(t3.artifactReceipts.length, 8);
  for (const receipt of t3.artifactReceipts) {
    const bytes = await immutableCandidateBytes(receipt.path);
    assert.equal(receipt.bytes, bytes.length, receipt.path);
    assert.equal(
      receipt.sha256,
      createHash("sha256").update(bytes).digest("hex"),
      receipt.path,
    );
    assert.equal(receipt.gitBlobSha1, gitBlobSha1(bytes), receipt.path);
    assert.equal(receipt.scope, "immutable_git_object_bytes");
    await assertResolvableBlob(receipt.gitBlobSha1, receipt.path);
  }

  const normalized = JSON.parse(manifestBytes.toString("utf8"));
  normalized.t3.selfRecorderReceipt.sha256 = "0".repeat(64);
  normalized.t3.selfRecorderReceipt.gitBlobSha1 = "0".repeat(40);
  const normalizedBytes = Buffer.from(`${JSON.stringify(normalized, null, 2)}\n`, "utf8");
  const selfReceipt = t3.selfRecorderReceipt;
  assert.equal(selfReceipt.bytes, manifestBytes.length);
  assert.equal(selfReceipt.normalizedBytes, normalizedBytes.length);
  assert.equal(
    selfReceipt.sha256,
    createHash("sha256").update(normalizedBytes).digest("hex"),
  );
  assert.equal(selfReceipt.gitBlobSha1, gitBlobSha1(normalizedBytes));
  assert.equal(
    selfReceipt.convention,
    "ZERO_SELF_HASH_FIELDS_JSON_2SP_UTF8_LF_ONE_TRAILING_LF",
  );
  assert.match(plan, /### Task T3:[\s\S]*?Actual bounded write set/);
  assert.match(plan, /### Task T3:[\s\S]*?focused[^\n]*PASS/i);

  const correction = governance.t3Correction;
  assert.ok(correction, "T3 correction evidence must exist");
  assert.equal(correction.parent, "b54f9a51c968640541f4e69ee3ad75a22dc46dc2");
  assert.equal(correction.parentTree, "950f0043ffe6fd992b2b04384734b181ceb54817");
  assert.deepEqual([...correction.immediateWriteSet].sort(), [...correctionEight].sort());
  assert.equal(correction.outsideWriteSet, 0);
  assert.deepEqual(correction.tdd.red, {
    tests: 15,
    passed: 11,
    failed: 4,
    exitCode: 1,
  });
  assert.deepEqual(correction.tdd.green, {
    tests: 16,
    passed: 16,
    failed: 0,
    exitCode: 0,
  });
  assert.deepEqual(correction.freshVerification.currentTrain, {
    files: 4,
    tests: 54,
    passed: 54,
    failed: 0,
    exitCode: 0,
  });
  assert.deepEqual(correction.freshVerification.fullSuiteTruth, {
    files: 11,
    tests: 169,
    passed: 168,
    failed: 1,
    exitCode: 1,
    onlyFailure: "tests/pcm-governance-pages.test.mjs frozen A3 cumulative-path admission assertion",
  });
  assert.equal(correction.manifestReceiptRef, "t3.selfRecorderReceipt");
  const correctionArtifactPaths = correctionEight.filter(
    (path) => path !== "docs/governance/pcm-owner-first-execution-manifest.v1.json",
  );
  assert.deepEqual(
    correction.artifactReceipts.map((receipt) => receipt.path).sort(),
    correctionArtifactPaths.sort(),
  );
  for (const receipt of correction.artifactReceipts) {
    const bytes = await immutableCandidateBytes(receipt.path);
    assert.equal(receipt.bytes, bytes.length, receipt.path);
    assert.equal(receipt.sha256, createHash("sha256").update(bytes).digest("hex"), receipt.path);
    assert.equal(receipt.gitBlobSha1, gitBlobSha1(bytes), receipt.path);
    assert.equal(receipt.scope, "immutable_git_object_bytes");
    await assertResolvableBlob(receipt.gitBlobSha1, receipt.path);
  }
  assert.equal(correction.independentReview.critical, 0);
  assert.equal(correction.independentReview.important, 0);

  const inputSafety = governance.t3InputSafetyCorrection;
  assert.ok(inputSafety, "T3 input safety correction evidence must exist");
  assert.equal(inputSafety.parent, "ece1fb380c9a1a5ab85b98a20175773cb3f8006f");
  assert.equal(inputSafety.parentTree, "186f27de8d7f6b96e557cb53e90a8736aaed8006");
  assert.deepEqual([...inputSafety.immediateWriteSet].sort(), [...inputSafetyFive].sort());
  assert.equal(inputSafety.outsideWriteSet, 0);
  assert.deepEqual(inputSafety.tdd.red, {
    tests: 18,
    passed: 15,
    failed: 3,
    exitCode: 1,
  });
  assert.deepEqual(inputSafety.tdd.productGreenBeforeReceipts, {
    tests: 18,
    passed: 17,
    failed: 1,
    exitCode: 1,
    onlyFailure: "current receipt evidence pending",
  });
  assert.deepEqual(inputSafety.tdd.green, {
    tests: 18,
    passed: 18,
    failed: 0,
    exitCode: 0,
  });
  assert.equal(inputSafety.inputPolicy.browserPdfLabel, "application/pdf");
  assert.equal(inputSafety.inputPolicy.blankNameAccepted, false);
  assert.equal(inputSafety.inputPolicy.unsafeAccess, "FAILURE_ZERO_CASE_DATA_NO_THROW");
  assert.equal(inputSafety.inputPolicy.contentBytesClassified, false);
  assert.equal(inputSafety.manifestReceiptRef, "t3.selfRecorderReceipt");
  const inputSafetyArtifactPaths = inputSafetyFive.filter(
    (path) => path !== "docs/governance/pcm-owner-first-execution-manifest.v1.json",
  );
  assert.deepEqual(
    inputSafety.artifactReceipts.map((receipt) => receipt.path).sort(),
    inputSafetyArtifactPaths.sort(),
  );
  for (const receipt of inputSafety.artifactReceipts) {
    const bytes = await immutableCandidateBytes(receipt.path);
    assert.equal(receipt.bytes, bytes.length, receipt.path);
    assert.equal(receipt.sha256, createHash("sha256").update(bytes).digest("hex"), receipt.path);
    assert.equal(receipt.gitBlobSha1, gitBlobSha1(bytes), receipt.path);
    assert.equal(receipt.scope, "immutable_git_object_bytes");
    await assertResolvableBlob(receipt.gitBlobSha1, receipt.path);
  }
  assert.equal(inputSafety.independentReview.critical, 0);
  assert.equal(inputSafety.independentReview.important, 0);
});

test("T3 own-data boundary correction closes exact-six evidence", async () => {
  const [manifestBytes, plan, spec] = await Promise.all([
    readFile(governancePath),
    readFile(planPath, "utf8"),
    readFile(specPath, "utf8"),
  ]);
  const governance = JSON.parse(manifestBytes.toString("utf8"));
  const correction = governance.t3OwnDataBoundaryCorrection;

  assert.ok(correction, "own-data boundary correction evidence must exist");
  assert.equal(correction.parent, "3b856f9ebd82daf1991ab436c959aca8e634eba2");
  assert.equal(correction.parentTree, "5b79d78e8379e4e1d80c46bb7814457aaf6d852a");
  assert.deepEqual(
    [...correction.immediateWriteSet].sort(),
    [...ownDataBoundarySix].sort(),
  );
  assert.equal(correction.outsideWriteSet, 0);
  assert.deepEqual(correction.tdd.baselineFullRed, {
    files: 11,
    tests: 171,
    passed: 170,
    failed: 1,
    exitCode: 1,
    onlyFailure: "open-ended historical A3 cumulative-path assertion",
  });
  assert.deepEqual(correction.tdd.inheritedAuthorityRed, {
    tests: 21,
    passed: 17,
    failed: 4,
    exitCode: 1,
  });
  assert.deepEqual(correction.tdd.brandIdentityRed, {
    tests: 23,
    passed: 20,
    failed: 3,
    exitCode: 1,
  });
  assert.deepEqual(correction.tdd.productGreenBeforeReceipts, {
    tests: 24,
    passed: 23,
    failed: 1,
    exitCode: 1,
    onlyFailure: "current receipt evidence pending",
  });
  assert.deepEqual(correction.tdd.evidenceRed, {
    tests: 25,
    passed: 23,
    failed: 2,
    exitCode: 1,
  });
  assert.deepEqual(correction.tdd.green, {
    tests: 25,
    passed: 25,
    failed: 0,
    exitCode: 0,
  });

  assert.deepEqual(correction.historicalCandidate, {
    upperBound: "3f6bddea936bdebd36846a239bc5d13c37e1d331",
    parent: "ae4f575a3062a48c6f08cc708738e14518f4df72",
    tree: "9f30aff364f3f0f9ed513098a2f7ae24962627d5",
    immediateRange: "ae4f575a3062a48c6f08cc708738e14518f4df72..3f6bddea936bdebd36846a239bc5d13c37e1d331",
    cumulativeRange: "0b0037ff50a4dc5b1756fe3230588f12a01c5337..3f6bddea936bdebd36846a239bc5d13c37e1d331",
    receiptScope: "immutable_git_object_bytes",
  });
  assert.equal(correction.inputPolicy.selectedFileList, "CAPTURED_WEBIDL_BRAND_CHECK");
  assert.equal(correction.inputPolicy.selectedSlot, "OWN_FILELIST_DATA_SLOT_CORROBORATED_BY_ITEM");
  assert.equal(correction.inputPolicy.selectedFile, "CAPTURED_FILE_AND_BLOB_WEBIDL_BRAND_CHECKS");
  assert.equal(correction.inputPolicy.ownMetadataShadowsAccepted, false);
  assert.equal(correction.inputPolicy.inheritedMetadataAccepted, false);
  assert.equal(correction.inputPolicy.plainObjectIdentityAccepted, false);
  assert.equal(correction.inputPolicy.failurePayloadPolicy, "ZERO_CASE_DATA");

  assert.deepEqual(correction.freshVerification.focused, {
    files: 1,
    tests: 25,
    passed: 25,
    failed: 0,
    exitCode: 0,
  });
  assert.deepEqual(correction.freshVerification.currentTrain, {
    files: 4,
    tests: 63,
    passed: 63,
    failed: 0,
    exitCode: 0,
  });
  assert.deepEqual(correction.freshVerification.fullSuiteTruth, {
    files: 11,
    tests: 178,
    passed: 178,
    failed: 0,
    exitCode: 0,
  });

  const artifactPaths = ownDataBoundarySix.filter(
    (path) => path !== "docs/governance/pcm-owner-first-execution-manifest.v1.json",
  );
  assert.deepEqual(
    correction.artifactReceipts.map((receipt) => receipt.path).sort(),
    artifactPaths.sort(),
  );
  for (const receipt of correction.artifactReceipts) {
    const bytes = await immutableCandidateBytes(receipt.path);
    assert.equal(receipt.bytes, bytes.length, receipt.path);
    assert.equal(receipt.sha256, createHash("sha256").update(bytes).digest("hex"), receipt.path);
    assert.equal(receipt.gitBlobSha1, gitBlobSha1(bytes), receipt.path);
    assert.equal(receipt.scope, "immutable_git_object_bytes");
    await assertResolvableBlob(receipt.gitBlobSha1, receipt.path);
  }
  const governanceTestReceipt = correction.artifactReceipts.find(
    (receipt) => receipt.path === "tests/pcm-governance-pages.test.mjs",
  );
  assert.deepEqual(governanceTestReceipt, {
    path: "tests/pcm-governance-pages.test.mjs",
    bytes: 35231,
    sha256: "c2439594515904fa3f62b5f7dc54ccccfa2d935f6f7b277819ff7aa3f1dd54f1",
    gitBlobSha1: "fe869c3bbeed3c371be91f21d20d208400377e54",
    scope: "immutable_git_object_bytes",
  });
  assert.equal(correction.manifestReceiptRef, "t3.selfRecorderReceipt");
  assert.equal(correction.independentReview.critical, 0);
  assert.equal(correction.independentReview.important, 0);
  assert.match(plan, /Actual bounded own-data boundary correction write set/);
  assert.match(plan, /immutable historical candidate/);
  assert.match(spec, /captured WebIDL/i);
  assert.match(spec, /immutable Git object/i);
});

test("T3 final exact-seven correction records the bounded product and receipt closure", async () => {
  const [manifestBytes, plan, spec] = await Promise.all([
    readFile(governancePath),
    readFile(planPath, "utf8"),
    readFile(specPath, "utf8"),
  ]);
  const governance = JSON.parse(manifestBytes.toString("utf8"));
  const correction = governance.t3FinalExact7Correction;
  assert.ok(correction, "final exact-seven correction evidence must exist");
  assert.equal(correction.parent, immutableT3Candidate);
  assert.equal(correction.parentTree, "2b7587f85c893b7571305ce3edf37007c605e869");
  assert.deepEqual(
    [...correction.immediateWriteSet].sort(),
    [...finalExactSeven].sort(),
  );
  assert.equal(correction.outsideWriteSet, 0);
  assert.deepEqual(correction.tdd.red, {
    tests: 29,
    passed: 21,
    failed: 8,
    exitCode: 1,
  });
  assert.equal(correction.zeroAuthorityActions.prototype, "NULL");
  assert.equal(correction.zeroAuthorityActions.length, 0);
  assert.equal(correction.zeroAuthorityActions.sharedArrayIteratorConsulted, false);
  assert.equal(correction.fileRecovery.staleFileNameCleared, true);
  assert.equal(correction.fileRecovery.inputValueCleared, true);
  assert.equal(correction.focusPolicy.transitionTarget, "ACTIVE_PANEL_HEADING_OR_PRIMARY_OPERATION");
  assert.equal(correction.receiptAuthority.commit, immutableT3Candidate);
  assert.equal(correction.receiptAuthority.receipts, "5/5");
  assert.equal(correction.receiptAuthority.checkoutBytesTrusted, false);
  assert.deepEqual(correction.freshVerification.focused, {
    files: 1,
    tests: 30,
    passed: 30,
    failed: 0,
    exitCode: 0,
  });
  assert.deepEqual(correction.freshVerification.currentTrain, {
    files: 4,
    tests: 68,
    passed: 68,
    failed: 0,
    exitCode: 0,
  });
  assert.deepEqual(correction.freshVerification.fullSuiteTruth, {
    files: 11,
    tests: 183,
    passed: 183,
    failed: 0,
    exitCode: 0,
  });
  assert.equal(correction.browser.horizontalOverflow, 0);
  assert.equal(correction.browser.visibleControlsUnder44, 0);
  assert.equal(correction.browser.consoleWarningsOrErrors, 0);
  assert.equal(correction.browser.networkFailures, 0);
  assert.equal(correction.browser.previewListenerAfterCleanup, 0);
  assert.equal(correction.independentReview.critical, 0);
  assert.equal(correction.independentReview.important, 0);
  assert.equal(correction.independentReview.minor, 0);
  assert.match(plan, /Actual bounded final exact-seven correction write set/);
  assert.match(spec, /null-prototype zero-action iterable/i);
  assert.match(spec, /short-viewport continuation/i);
});

test("T3 CTA contrast correction records bounded quantitative evidence", async () => {
  const [manifestBytes, plan, spec] = await Promise.all([
    readFile(governancePath),
    readFile(planPath, "utf8"),
    readFile(specPath, "utf8"),
  ]);
  const governance = JSON.parse(manifestBytes.toString("utf8"));
  const correction = governance.t3ContrastCorrection;
  assert.ok(correction, "CTA contrast correction evidence must exist");
  assert.equal(correction.commit, immutableT3ContrastCandidate);
  assert.equal(correction.parent, "0b4aecee2bd7e4317a4734dbcf9c7b1096b269fc");
  assert.equal(correction.parentTree, "833efce0e6af27992c1a7f668a6bc7ef8d018cc2");
  assert.deepEqual([...correction.writeSet].sort(), [...contrastExactFive].sort());
  assert.equal(correction.outsideWriteSet, 0);
  assert.deepEqual(correction.tdd.red, {
    tests: 31,
    passed: 30,
    failed: 1,
    exitCode: 1,
    ratios: [1.7, 2.58, 3.16],
  });
  assert.deepEqual(correction.tdd.green, {
    tests: 32,
    passed: 32,
    failed: 0,
    exitCode: 0,
    ratios: [10.93, 7.17, 5.86],
  });
  assert.equal(correction.contrast.fontSize, "14px");
  assert.equal(correction.contrast.foreground, "#080b0d");
  assert.deepEqual(correction.contrast.gradientStops, ["#ffb145", "#ff711f", "#ff4925"]);
  assert.equal(correction.contrast.minimumRequired, 4.5);
  assert.equal(correction.contrast.minimumMeasured, 5.86);
  assert.deepEqual(correction.freshVerification.focused, {
    files: 1,
    tests: 32,
    passed: 32,
    failed: 0,
    exitCode: 0,
  });
  assert.deepEqual(correction.freshVerification.currentTrain, {
    files: 4,
    tests: 70,
    passed: 70,
    failed: 0,
    exitCode: 0,
  });
  assert.deepEqual(correction.freshVerification.fullSuiteTruth, {
    files: 11,
    tests: 185,
    passed: 185,
    failed: 0,
    exitCode: 0,
  });
  assert.deepEqual(correction.browser.viewports, [
    "1280x900",
    "768x1024",
    "390x844",
    "390x640",
    "1280x768",
    "640x450",
  ]);
  assert.equal(correction.browser.horizontalOverflow, 0);
  assert.equal(correction.browser.visibleControlsUnder44, 0);
  assert.equal(correction.browser.consoleWarningsOrErrors, 0);
  assert.equal(correction.browser.networkFailures, 0);
  assert.equal(correction.browser.brokenAssets, 0);
  assert.equal(correction.browser.plannedClickableControls, 0);
  assert.equal(correction.browser.failureRecoveryFocus, "reselect-title");

  const artifactPaths = contrastExactFive.filter(
    (path) => path !== "docs/governance/pcm-owner-first-execution-manifest.v1.json",
  );
  assert.deepEqual(
    correction.artifactReceipts.map((receipt) => receipt.path).sort(),
    [...artifactPaths].sort(),
  );
  for (const receipt of correction.artifactReceipts) {
    const bytes = await immutableCommitBytes(immutableT3ContrastCandidate, receipt.path);
    assert.equal(receipt.bytes, bytes.length, receipt.path);
    assert.equal(receipt.sha256, createHash("sha256").update(bytes).digest("hex"), receipt.path);
    assert.equal(receipt.gitBlobSha1, gitBlobSha1(bytes), receipt.path);
    assert.equal(receipt.scope, "candidate_git_blob_bytes");
  }
  assert.equal(correction.manifestReceiptRef, "t3.selfRecorderReceipt");
  assert.equal(correction.independentReview.critical, 0);
  assert.equal(correction.independentReview.important, 0);
  assert.match(plan, /Actual bounded CTA contrast correction write set/);
  assert.match(spec, /quantitative CTA contrast/i);
});

test("T3 preserves the historical hero candidate and records the current canonical identity correction", async () => {
  const [manifestBytes, plan, spec] = await Promise.all([
    readFile(governancePath),
    readFile(planPath, "utf8"),
    readFile(specPath, "utf8"),
  ]);
  const governance = JSON.parse(manifestBytes.toString("utf8"));
  const correction = governance.t3HeroActionCorrection;
  assert.ok(correction, "hero action correction evidence must exist");
  assert.equal(correction.parent, immutableT3ContrastCandidate);
  assert.equal(correction.parentTree, "5eff127610e86b85667e4d2e8d523c082ea9db00");
  assert.deepEqual([...correction.writeSet].sort(), [...heroActionExactFive].sort());
  assert.equal(correction.outsideWriteSet, 0);
  assert.deepEqual(correction.tdd.red, {
    tests: 35,
    passed: 33,
    failed: 2,
    exitCode: 1,
  });
  assert.deepEqual(correction.tdd.green, {
    tests: 35,
    passed: 35,
    failed: 0,
    exitCode: 0,
  });
  assert.equal(correction.heroAction.authority, "CLOSED_STATE_PROJECTION_ONLY");
  assert.equal(correction.heroAction.validationPending.target, "CORRECTION_REQUIRED");
  assert.equal(correction.heroAction.consent.enabled, false);
  assert.equal(correction.heroAction.consent.target, null);
  assert.equal(correction.heroAction.noAction.target, null);
  assert.equal(correction.heroAction.noAction.ariaDisabled, true);
  assert.equal(correction.manifestReceiptRef, "t3.selfRecorderReceipt");
  const artifactPaths = heroActionExactFive.filter(
    (path) => path !== "docs/governance/pcm-owner-first-execution-manifest.v1.json",
  );
  assert.deepEqual(
    correction.artifactReceipts.map((receipt) => receipt.path).sort(),
    [...artifactPaths].sort(),
  );
  const driftedCheckoutPaths = [];
  for (const receipt of correction.artifactReceipts) {
    const bytes = await immutableDeclaredBlobBytes(receipt.gitBlobSha1, receipt.path);
    assert.equal(receipt.bytes, bytes.length, receipt.path);
    assert.equal(receipt.sha256, createHash("sha256").update(bytes).digest("hex"), receipt.path);
    assert.equal(receipt.gitBlobSha1, gitBlobSha1(bytes), receipt.path);
    assert.equal(receipt.scope, "declared_git_blob_bytes");
    await assertResolvableBlob(receipt.gitBlobSha1, receipt.path);
    const checkoutBytes = await readFile(resolve(repoRoot, receipt.path));
    if (!checkoutBytes.equals(bytes)) driftedCheckoutPaths.push(receipt.path);
  }
  assert.ok(
    driftedCheckoutPaths.includes(
      "src/stitch_laibe_landing_onboarding/pcm_standalone/quote_check/app.js",
    ),
  );
  assert.ok(
    driftedCheckoutPaths.includes("tests/pcm-owner-first-quote-check.test.mjs"),
  );
  assert.equal(correction.independentReview.critical, 0);
  assert.equal(correction.independentReview.important, 0);
  assert.match(plan, /T3 hero action correction/);
  assert.match(spec, /state-owned hero action projection/i);

  const current = governance.t3CanonicalIdentityCorrection;
  assert.ok(current, "current canonical-identity correction evidence must exist");
  assert.equal(current.parent, immutableT3HeroActionCandidate);
  assert.equal(current.parentTree, "70bca99a98baeb3d5157320905b6a54af2da905f");
  assert.deepEqual([...current.immediateWriteSet].sort(), [...heroActionExactFive].sort());
  assert.equal(current.outsideWriteSet, 0);
  assert.deepEqual(current.tdd.causalRed, {
    tests: 1,
    passed: 0,
    failed: 1,
    exitCode: 1,
    failure: "hostile lookalike projected an enabled INTRODUCTION action",
  });
  assert.deepEqual(current.tdd.green, {
    tests: 36,
    passed: 36,
    failed: 0,
    exitCode: 0,
  });
  assert.equal(current.heroAction.authority, "CANONICAL_OBJECT_IDENTITY_ONLY");
  assert.equal(current.heroAction.hostileVariants, 8);
  assert.equal(current.heroAction.getterCalls, 0);
  assert.equal(current.heroAction.proxyGetCalls, 0);
  assert.equal(current.heroAction.mutableCollectionAuthority, false);
  assert.equal(current.receiptAuthority.source, "DECLARED_GIT_BLOB_BYTES");
  assert.equal(current.receiptAuthority.checkoutBytesTrusted, false);
  assert.equal(current.receiptAuthority.declaredBlobExistenceRequired, true);
  assert.deepEqual(current.freshVerification.currentTrain, {
    files: 4,
    tests: 74,
    passed: 74,
    failed: 0,
    exitCode: 0,
  });
  assert.deepEqual(current.freshVerification.fullSuiteTruth, {
    files: 11,
    tests: 189,
    passed: 189,
    failed: 0,
    exitCode: 0,
    parentBaseline: "188/188",
  });
  assert.deepEqual(current.browser.viewports, ["390x640", "1280x768"]);
  assert.equal(current.browser.pageStatus, 200);
  assert.equal(current.browser.logoStatus, 200);
  assert.equal(current.browser.horizontalOverflow, 0);
  assert.equal(current.browser.visibleControlsUnder44, 0);
  assert.equal(current.browser.consoleWarningsOrErrors, 0);
  assert.equal(current.browser.networkFailures, 0);
  assert.equal(current.browser.staleDatasetResult, "CORRECTION_REQUIRED");
  assert.equal(current.browser.failureRecoveryFocus, "reselect-title");
  const currentArtifactPaths = heroActionExactFive.filter(
    (path) => path !== "docs/governance/pcm-owner-first-execution-manifest.v1.json",
  );
  assert.deepEqual(
    current.artifactReceipts.map((receipt) => receipt.path).sort(),
    [...currentArtifactPaths].sort(),
  );
  for (const receipt of current.artifactReceipts) {
    const bytes = await immutableDeclaredBlobBytes(receipt.gitBlobSha1, receipt.path);
    assert.equal(receipt.bytes, bytes.length, receipt.path);
    assert.equal(receipt.sha256, createHash("sha256").update(bytes).digest("hex"), receipt.path);
    assert.equal(receipt.gitBlobSha1, gitBlobSha1(bytes), receipt.path);
    assert.equal(receipt.scope, "declared_git_blob_bytes");
    await assertResolvableBlob(receipt.gitBlobSha1, receipt.path);
  }
  assert.equal(current.manifestReceiptRef, "t3.selfRecorderReceipt");
  assert.equal(current.independentReview.critical, 0);
  assert.equal(current.independentReview.important, 0);
  assert.equal(current.independentReview.minor, 0);
  assert.match(plan, /T3 final bounded canonical identity correction/i);
  assert.match(spec, /canonical object identity/i);
});
