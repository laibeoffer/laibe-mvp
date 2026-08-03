import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { readFile, stat } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const testDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(testDir, "..");
const quoteDir = resolve(
  repoRoot,
  "src/stitch_laibe_landing_onboarding/pcm_standalone/quote_check",
);
const htmlPath = resolve(quoteDir, "code.html");
const cssPath = resolve(quoteDir, "styles.css");
const appPath = resolve(quoteDir, "app.js");
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

function createFileHandlerHarness() {
  const stateCodes = [...requiredSteps, "FAILURE"];
  const panels = stateCodes.map((code) => ({
    dataset: { flowPanel: code },
    hidden: code !== "INTRODUCTION",
  }));
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
  const fileInput = {
    files: [],
    value: "",
    addEventListener(type, listener) {
      listeners.set(type, listener);
    },
    click() {},
  };
  const root = {
    querySelector(selector) {
      if (selector === "#quote-file") return fileInput;
      return failureTargets[selector] ?? null;
    },
    querySelectorAll(selector) {
      if (selector === "[data-flow-panel]") return panels;
      if (selector === "[data-flow-step]") return railItems;
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
      fileInput.files = file ? [file] : [];
      return listeners.get("change")?.();
    },
    dispatchFiles(files) {
      fileInput.files = files;
      return listeners.get("change")?.();
    },
    dispatchChange() {
      return listeners.get("change")?.();
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
  };
}

async function initializeFileHandlerHarness(tag) {
  const harness = createFileHandlerHarness();
  const documentDescriptor = Object.getOwnPropertyDescriptor(globalThis, "document");
  Object.defineProperty(globalThis, "document", {
    configurable: true,
    value: harness.document,
  });
  try {
    await import(`${pathToFileURL(appPath).href}?${tag}`);
  } finally {
    if (documentDescriptor) {
      Object.defineProperty(globalThis, "document", documentDescriptor);
    } else {
      delete globalThis.document;
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

test("one page exposes the complete owner-first state sequence", async () => {
  const [html, app] = await Promise.all([
    readOrEmpty(htmlPath),
    readOrEmpty(appPath),
  ]);
  assert.match(html, /data-quote-check-page/);
  for (const step of requiredSteps) {
    assert.match(`${html}\n${app}`, new RegExp(step), step);
  }
  assert.match(html, /給已取得乙方報價單的甲方/);
  assert.match(html, /服務說明/);
  assert.match(html, /同意本機檢視/);
  assert.match(html, /選擇報價 PDF/);
  assert.match(html, /檔案標示與後續確認/);
  assert.match(html, /待確認清單/);
  assert.match(html, /重新選擇/);
  assert.match(html, /結果格式示意/);
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
  assert.match(visible, /返回 PCM 首頁/);
});

test("selection stays local and never claims durable upload or a formal result", async () => {
  const html = await readOrEmpty(htmlPath);
  const visible = stripNonVisibleHtml(html);
  assert.match(html, /type="file"/);
  assert.match(html, /accept="application\/pdf,\.pdf"/);
  assert.match(visible, /只在本頁暫時檢視/);
  assert.match(visible, /尚未送出或保存/);
  assert.match(visible, /尚未形成正式案件結果/);
  assert.match(visible, /結果格式示意，非真實案件/);
  assert.doesNotMatch(visible, /上傳成功|已保存|已建立案件|健檢完成|正式健檢結果/);
  assert.doesNotMatch(
    `${html}\n${await readOrEmpty(appPath)}`,
    /localStorage|sessionStorage|URLSearchParams|location\.(?:search|hash)|raw JSON/i,
  );
});

test("unknown file rules stay pending instead of inventing numeric limits", async () => {
  const html = await readOrEmpty(htmlPath);
  const visible = stripNonVisibleHtml(html);
  assert.match(visible, /瀏覽器標示為 PDF；檔名僅供辨識，內容格式尚待驗證/);
  assert.doesNotMatch(visible, /格式已辨識|已在本機辨識/);
  assert.match(visible, /大小待正式規則確認/);
  assert.match(visible, /頁數待正式解析/);
  assert.match(visible, /可讀性待正式解析/);
  assert.doesNotMatch(visible, /(?:MB|GB|頁)\s*(?:上限|以內|以下|不得超過)/i);
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
    assert.deepEqual(state.actions, []);
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
    assert.deepEqual(unknown.actions, []);
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

test("actual file handler rejects ordinary text and text renamed as PDF", async () => {
  assert.equal(existsSync(appPath), true, "app.js must exist before import");
  const harness = await initializeFileHandlerHarness("renamed-text-handler");
  harness.dispatchFile({ name: "報價.txt", type: "text/plain" });
  assert.equal(harness.visibleState(), "FAILURE");
  assert.doesNotThrow(() => {
    harness.dispatchFile({ name: "報價.pdf", type: "text/plain" });
  });
  assert.equal(harness.visibleState(), "FAILURE");
  assert.match(harness.failureReason(), /PDF/);
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
  assert.doesNotThrow(() => emptyList.dispatchFiles([]));
  assert.equal(emptyList.visibleState(), "SELECT_FILE");
});

test("actual file handler rejects unsafe metadata without claiming file bytes are not PDF", async () => {
  const throwingName = {};
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

  const throwingType = { name: "estimate.pdf" };
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
      harness.dispatchFile({ name: "報價.txt", type: "text/plain" });
    });
    assert.equal(harness.visibleState(), "FAILURE");
    assert.doesNotThrow(() => {
      harness.dispatchFile({ name: "報價.pdf", type: "application/pdf" });
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
      harness.dispatchFile({ name: "報價.txt", type: "text/plain" });
    });
    assert.equal(harness.visibleState(), "FAILURE");
    assert.doesNotThrow(() => {
      harness.dispatchFile({ name: "報價.pdf", type: "application/pdf" });
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
    harness.dispatchFile({ name: "報價.pdf", type: "application/pdf" });
  });
  assert.equal(harness.visibleState(), "VALIDATION_PENDING");
  assert.equal(harness.selectedName(), "報價.pdf");
  assert.doesNotThrow(() => {
    harness.dispatchFile({ name: "報價.txt", type: "application/pdf" });
  });
  assert.equal(harness.visibleState(), "VALIDATION_PENDING");
  assert.equal(harness.selectedName(), "報價.txt");
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

test("only quoteCheck activates and compatibility pages remain aliases", async () => {
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
  assert.equal(byId.drawingCheck.lifecycle, "planned");
  assert.equal(byId.drawingCheck.href, null);
  assert.equal(byId.accountAccess.lifecycle, "planned");
  assert.equal(byId.accountAccess.href, null);
  const quoteEdge = manifestModule.PCM_FLOW_EDGES.find(
    (edge) => edge.from === "home" && edge.to === "quoteCheck",
  );
  assert.equal(quoteEdge.clickable, true);
  assert.equal(contractModule.PUBLIC_ROUTES.quoteCheck, "../quote_check/code.html");
  assert.equal(contractModule.PUBLIC_ROUTES.drawingCheck, null);
  assert.equal(contractModule.PUBLIC_ROUTES.accountAccess, null);
  const canonicalIds = new Set(nodes.map((node) => node.id));
  for (const alias of ["ownerStart", "documentCorrections", "basicReport", "selfServiceArchive"]) {
    assert.equal(canonicalIds.has(alias), false, alias);
  }
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
    const [path, fragment] = reference.split("#");
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
    const bytes = await readFile(resolve(repoRoot, receipt.path));
    assert.equal(receipt.bytes, bytes.length, receipt.path);
    assert.equal(
      receipt.sha256,
      createHash("sha256").update(bytes).digest("hex"),
      receipt.path,
    );
    assert.equal(receipt.gitBlobSha1, gitBlobSha1(bytes), receipt.path);
    assert.equal(receipt.scope, "current_worktree_bytes");
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
    const bytes = await readFile(resolve(repoRoot, receipt.path));
    assert.equal(receipt.bytes, bytes.length, receipt.path);
    assert.equal(receipt.sha256, createHash("sha256").update(bytes).digest("hex"), receipt.path);
    assert.equal(receipt.gitBlobSha1, gitBlobSha1(bytes), receipt.path);
    assert.equal(receipt.scope, "current_worktree_bytes");
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
    const bytes = await readFile(resolve(repoRoot, receipt.path));
    assert.equal(receipt.bytes, bytes.length, receipt.path);
    assert.equal(receipt.sha256, createHash("sha256").update(bytes).digest("hex"), receipt.path);
    assert.equal(receipt.gitBlobSha1, gitBlobSha1(bytes), receipt.path);
    assert.equal(receipt.scope, "current_worktree_bytes");
  }
  assert.equal(inputSafety.independentReview.critical, 0);
  assert.equal(inputSafety.independentReview.important, 0);
});
