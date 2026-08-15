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

function browserFile(name, type) {
  return new File(["local test bytes"], name, { type });
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
  const executable = appSource.replace(/^export\s+/gm, "");
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

test("quote check final runtime asset identity binds only the changed stylesheet", async () => {
  const html = await readFile(htmlPath, "utf8");

  assert.match(html, /href="\.\/styles\.css\?v=20260815-final-runtime"/);
  assert.match(html, /src="\.\/app\.js\?v=20260814-context-journey-2"/);
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
    /class="quote-context-bar"[^>]*data-quote-context[\s\S]*?<strong>文件健檢<\/strong>[\s\S]*?data-current-status[\s\S]*?data-current-next/u,
  );
  assert.doesNotMatch(html, /PCM 首頁/u);
  assert.match(styles, /\.quote-header__nav a\s*\{[^}]*white-space:\s*nowrap;/u);
  assert.match(
    styles,
    /\.quote-header \.quote-brand \.drs-brand-lockup\s*\{[^}]*display:\s*none;/u,
  );
});

test("quote check completion path explains why to return home", async () => {
  const [html, app] = await Promise.all([
    readFile(htmlPath, "utf8"),
    readFile(appPath, "utf8"),
  ]);

  assert.match(
    html,
    /href="\.\.\/basic_report\/code\.html"[^>]*>查看基本報告範例<\/a>/u,
  );
  assert.match(html, /href="#document-workspace"[^>]*>回到文件選擇<\/a>/u);
  assert.match(
    app,
    /三類檢查方向已看完；回首頁確認案件是否適合使用 DRS。/u,
  );
});

test("hero assurances put document risk before registration and assisted decisions", async () => {
  const html = await readFile(htmlPath, "utf8");

  assert.match(
    html,
    /<ul class="quote-assurances"[^>]*>[\s\S]*?<li>先不著急註冊<\/li>[\s\S]*?<li>檢查手上資料漏洞要緊<\/li>[\s\S]*?<li>了解DRS隨時可叫停的契約方案<\/li>[\s\S]*?<li>再決定要不要我們輔助你的決策<\/li>[\s\S]*?<\/ul>/u,
  );
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

test("document tabs use a coordinated radius scale while connecting the active panel", async () => {
  const css = await readFile(cssPath, "utf8");

  assert.match(css, /\.document-tabs\s*\{[^}]*--tab-panel-surface:/u);
  assert.match(css, /\.document-tabs\s*\{[^}]*border-radius:\s*22px 22px 0 0;/u);
  assert.match(css, /\.document-tabs button\s*\{[^}]*border-radius:\s*18px;/u);
  assert.match(css, /\.document-tabs button\[aria-selected="true"\]\s*\{[^}]*border-radius:\s*18px 18px 0 0;/u);
  assert.match(css, /\.document-tabs button\[aria-selected="true"\]::before/u);
  assert.match(css, /\.document-tabs button\[aria-selected="true"\]::after/u);
  assert.match(css, /\.document-tabs button:focus-visible/u);
});

test("document tabs move a restrained one-shot LaiBE backlight with aria-selected state", async () => {
  const css = await readFile(cssPath, "utf8");
  const inactiveSurface = css.match(/\.document-tabs button\s*\{([^}]*)\}/u)?.[1] ?? "";
  const activeSurface =
    css.match(/\.document-tabs button\[aria-selected="true"\]\s*\{([^}]*)\}/u)?.[1] ?? "";

  assert.match(inactiveSurface, /border:\s*1px solid rgba\(255,\s*255,\s*255,\s*0\.1\)/u);
  assert.match(inactiveSurface, /background:\s*linear-gradient\(180deg,[\s\S]*linear-gradient\(112deg,/u);
  assert.match(inactiveSurface, /backdrop-filter:\s*blur\(14px\) saturate\(125%\)/u);
  assert.match(inactiveSurface, /box-shadow:[\s\S]*inset 0 1px 0[\s\S]*inset 0 -12px 18px/u);
  assert.doesNotMatch(inactiveSurface, /0 0 18px rgba\(255,\s*88,\s*9,/u);

  assert.match(activeSurface, /border-color:\s*rgba\(255,\s*88,\s*9,\s*0\.88\)/u);
  assert.match(activeSurface, /background:[\s\S]*var\(--tab-panel-surface\)/u);
  assert.match(
    activeSurface,
    /box-shadow:[\s\S]*0 0 0 1px rgba\(255,\s*122,\s*56,[\s\S]*0 0 18px rgba\(255,\s*88,\s*9,[\s\S]*0 18px 30px -14px rgba\(255,\s*88,\s*9,[\s\S]*inset 0 0 18px rgba\(255,\s*88,\s*9,/u,
  );
  assert.match(
    activeSurface,
    /animation:\s*quote-tab-backlight-settle 420ms cubic-bezier\(0\.22,\s*1,\s*0\.36,\s*1\) 1 both/u,
  );
  assert.match(
    css,
    /@keyframes quote-tab-backlight-settle\s*\{[\s\S]*?from\s*\{[^}]*box-shadow:[^}]*\}[\s\S]*?to\s*\{[^}]*box-shadow:/u,
  );
  assert.match(
    css,
    /@media\s*\(prefers-reduced-motion:\s*reduce\)[\s\S]*?\.document-tabs button\[aria-selected="true"\]\s*\{[^}]*animation:\s*none !important/u,
  );
});

test("document tabs keep every actionable target fully visible on mobile and respect reduced motion", async () => {
  const css = await readFile(cssPath, "utf8");

  assert.match(
    css,
    /@media\s*\(max-width:\s*760px\)[\s\S]*?\.document-tabs\s*\{[^}]*grid-template-columns:\s*1fr;[^}]*overflow-x:\s*visible/u,
  );
  assert.match(
    css,
    /@media\s*\(max-width:\s*760px\)[\s\S]*?\.document-tabs button\s*\{[^}]*width:\s*100%;[^}]*min-width:\s*0/u,
  );
  assert.match(css, /@media\s*\(prefers-reduced-motion:\s*reduce\)/u);
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

test("actual file handler rejects ordinary text and text renamed as PDF", async () => {
  assert.equal(existsSync(appPath), true, "app.js must exist before import");
  const harness = await initializeFileHandlerHarness("renamed-text-handler");
  harness.dispatchFile(browserFile("報價.txt", "text/plain"));
  assert.equal(harness.visibleState(), "FAILURE");
  assert.doesNotThrow(() => {
    harness.dispatchFile(browserFile("報價.pdf", "text/plain"));
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

test("quote-only recovery exposes one exact guarded drawing-check route", async () => {
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

test("continuation facts and focus targets stay visible at short viewports", async () => {
  const [html, styles] = await Promise.all([
    readOrEmpty(htmlPath),
    readOrEmpty(cssPath),
  ]);
  assert.equal((html.match(/data-current-status/g) ?? []).length, 3);
  assert.equal((html.match(/data-current-next/g) ?? []).length, 3);
  assert.match(html, /data-hero-start/);
  assert.equal((html.match(/data-panel-focus/g) ?? []).length, 9);
  assert.equal((html.match(/data-panel-focus[^>]*tabindex="-1"|tabindex="-1"[^>]*data-panel-focus/g) ?? []).length, 9);
  assert.match(styles, /\[data-panel-focus\]:focus/);
  assert.match(styles, /max-height:\s*700px/);
  assert.match(styles, /quote-hero__continuation/);
  assert.match(styles, /\.quote-context-bar\s*\{[^}]*position:\s*sticky;/u);
  assert.match(
    styles,
    /\.quote-context-bar p:last-child strong\s*\{[^}]*white-space:\s*normal;/u,
  );
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
