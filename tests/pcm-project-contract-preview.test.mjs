import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const html = readFileSync(join(root, "site", "standard_contract_editor", "code.html"), "utf8");
const app = readFileSync(join(root, "site", "standard_contract_editor", "app.js"), "utf8");
const surface = `${html}\n${app}`;
const require = createRequire(import.meta.url);
const projectContractEngine = require(join(root, "site", "shared", "laibe-project-contract-engine.js"));

function loadPreviewApi() {
  const sandbox = { module: { exports: {} }, URL, URLSearchParams };
  sandbox.globalThis = sandbox;
  vm.runInNewContext(app, sandbox, { filename: "standard_contract_editor/app.js" });
  return sandbox.module.exports.normalizePreviewContractType
    ? sandbox.module.exports
    : sandbox.LaibeProjectContractPreview;
}

test("pure preview helpers are exported without requiring a DOM", () => {
  const api = loadPreviewApi();
  assert.equal(typeof api.normalizePreviewContractType, "function");
  assert.equal(typeof api.resolveProjectContractPreviewContext, "function");
  assert.equal(typeof api.buildProjectContractPreviewHref, "function");
  assert.equal(typeof api.assembleProjectContractPreview, "function");
  assert.equal(typeof api.localizeProjectContractVisibleText, "function");
});

test("contract type normalization is an exact allowlist and unknown values fail to DESIGN", () => {
  const { normalizePreviewContractType } = loadPreviewApi();
  assert.equal(normalizePreviewContractType("DESIGN"), "DESIGN");
  assert.equal(normalizePreviewContractType("WORKS"), "WORKS");
  assert.equal(normalizePreviewContractType("DESIGN_BUILD"), "DESIGN_BUILD");
  for (const value of [undefined, null, "", "design", "WORKS ", "NONE", "UNKNOWN"]) {
    assert.equal(normalizePreviewContractType(value), "DESIGN");
  }
});

test("trusted preview context requires every non-empty field and readOnly true", () => {
  const { resolveProjectContractPreviewContext } = loadPreviewApi();
  const valid = {
    caseId: "CASE-2026-08",
    contractId: "CONTRACT-17",
    version: "v0.2-case-3",
    contractType: "WORKS",
    role: "OWNER",
    readOnly: true,
    ignored: "not exposed",
  };
  const resolved = resolveProjectContractPreviewContext(valid);
  assert.deepEqual(JSON.parse(JSON.stringify(resolved)), {
    caseId: "CASE-2026-08",
    contractId: "CONTRACT-17",
    version: "v0.2-case-3",
    contractType: "WORKS",
    role: "OWNER",
    readOnly: true,
  });
  assert.equal(Object.isFrozen(resolved), true);
});

test("invalid, inherited, partial, mutable, or unsupported preview context grants no authority", () => {
  const { resolveProjectContractPreviewContext } = loadPreviewApi();
  const base = {
    caseId: "CASE-1",
    contractId: "CONTRACT-1",
    version: "v0.2",
    contractType: "DESIGN",
    role: "OWNER",
    readOnly: true,
  };
  const invalid = [
    null,
    [],
    Object.assign(Object.create({ inherited: true }), base),
    { ...base, caseId: " " },
    { ...base, contractId: "" },
    { ...base, version: "\t" },
    { ...base, contractType: "UNKNOWN" },
    { ...base, role: "" },
    { ...base, role: "owner" },
    { ...base, role: "OWNER " },
    { ...base, role: "UNKNOWN" },
    { ...base, caseId: " CASE-1" },
    { ...base, contractId: "CONTRACT 1" },
    { ...base, version: "v0.2\n" },
    { ...base, readOnly: false },
    { ...base, readOnly: "true" },
  ];
  const getterRole = { ...base };
  Object.defineProperty(getterRole, "role", { get() { throw new Error("getter must not run"); } });
  invalid.push(getterRole);
  const nullPrototypeLayer = Object.create(Object.create(null));
  Object.assign(nullPrototypeLayer, base);
  invalid.push(nullPrototypeLayer);
  invalid.forEach((candidate) => assert.equal(resolveProjectContractPreviewContext(candidate), null));
});

test("hostile reflective preview context always fails closed", () => {
  const { resolveProjectContractPreviewContext } = loadPreviewApi();
  const base = {
    caseId: "CASE-1",
    contractId: "CONTRACT-1",
    version: "v0.2",
    contractType: "DESIGN",
    role: "OWNER",
    readOnly: true,
  };
  let toStringTagReads = 0;
  const tagged = { ...base };
  Object.defineProperty(tagged, Symbol.toStringTag, {
    get() {
      toStringTagReads += 1;
      throw new Error("Symbol.toStringTag getter must not run");
    },
  });
  const getPrototypeTrap = new Proxy({ ...base }, {
    getPrototypeOf() {
      throw new Error("getPrototypeOf trap");
    },
  });
  const descriptorTrap = new Proxy({ ...base }, {
    getOwnPropertyDescriptor(target, field) {
      if (field === "role") throw new Error("getOwnPropertyDescriptor trap");
      return Reflect.getOwnPropertyDescriptor(target, field);
    },
  });

  assert.doesNotThrow(() => resolveProjectContractPreviewContext(tagged));
  assert.equal(resolveProjectContractPreviewContext(tagged), null);
  assert.equal(toStringTagReads, 0);
  assert.doesNotThrow(() => resolveProjectContractPreviewContext(getPrototypeTrap));
  assert.equal(resolveProjectContractPreviewContext(getPrototypeTrap), null);
  assert.doesNotThrow(() => resolveProjectContractPreviewContext(descriptorTrap));
  assert.equal(resolveProjectContractPreviewContext(descriptorTrap), null);
});

test("visible contract text uses exact Traditional Chinese semantic labels", () => {
  const { localizeProjectContractVisibleText } = loadPreviewApi();
  const visible = localizeProjectContractVisibleText(
    "DESIGN_STAGE_1 / READY_FOR_OWNER_DECISION / OWNER_OVERRIDE / FINAL_ACCEPTANCE_COMPLETED / FINAL_PAYMENT_ACTION / CHANGE_ORDER / document_id / submitted_at / Owner Decision / DRS Review / DESIGN DOMAIN"
  );

  assert.equal(
    visible,
    "設計第一階段 / 資料已整理，可交由甲方決策 / 甲方例外決策 / 最終驗收已完成 / 尾款付款程序 / 正式變更單 / 文件識別 / 提交時間 / 甲方決策 / DRS 文件審閱 / 設計契約範圍"
  );
  assert.equal(
    localizeProjectContractVisibleText("LaiBE DRS 於第 3 階段保留 20% 款項"),
    "LaiBE DRS 於第 3 階段保留 20% 款項"
  );
});

test("real engine visible articles and procedures expose no placeholders or raw procedure tokens", () => {
  const { localizeProjectContractVisibleText } = loadPreviewApi();
  const forbiddenEnglishProcedures = /Owner Decision|DRS Review|DESIGN DOMAIN|WORKS DOMAIN|Change Order|Payment Action|Source Evidence|Hold Point|Party Agreement|Owner Override|Decision & Record|Decision Owner|Design-to-Construction Gate|\b(?:Evidence|VERSION|version|Change|Record|case|document|action|review|decision|milestone|TRUE)\b/i;
  const allVisibleTexts = [];

  for (const contractType of ["DESIGN", "WORKS", "DESIGN_BUILD"]) {
    const assembled = projectContractEngine.assembleProjectContract({ contractType });
    const sourceTexts = [
      ...assembled.articles.flatMap((article) => [article.title, article.body]),
      assembled.commonAppendix.definition.title,
      ...assembled.commonAppendix.renderedArticles.flatMap((article) => [article.title, article.body]),
    ];
    const visibleTexts = sourceTexts.map(localizeProjectContractVisibleText);
    visibleTexts.forEach((visibleText) => {
      assert.doesNotMatch(visibleText, /[\p{Script=Han}）]\s+(?=[\p{Script=Han}（])/u, `${contractType} CJK spacing leaked`);
    });
    const visibleText = visibleTexts.join("\n");
    allVisibleTexts.push(visibleText);

    assert.doesNotMatch(visibleText, /\{\{[A-Z][A-Z0-9_]*\}\}/, `${contractType} placeholder leaked`);
    assert.doesNotMatch(visibleText, /\b[A-Z][A-Z0-9]+(?:_[A-Z0-9]+)+\b/, `${contractType} enum leaked`);
    assert.doesNotMatch(visibleText, /\b[a-z][a-z0-9]+(?:_[a-z0-9]+)+\b/, `${contractType} snake_case leaked`);
    assert.doesNotMatch(visibleText, forbiddenEnglishProcedures, `${contractType} English procedure leaked`);
  }

  const allVisibleText = allVisibleTexts.join("\n");
  assert.doesNotMatch(allVisibleText, /正式\s+正式變更單/);
  assert.doesNotMatch(allVisibleText, /設計成果交付\s+時程/);
  assert.doesNotMatch(allVisibleText, /里程碑\s+程序核對/);
  assert.doesNotMatch(allVisibleText, /各\s+契約範圍\s+的版本/);
  assert.match(allVisibleText, /設計成果交付時程/);
  assert.match(allVisibleText, /里程碑程序核對/);
  assert.match(allVisibleText, /各契約範圍的版本/);
});

test("instrumented engine is the only assembly boundary for preview content", () => {
  const { assembleProjectContractPreview, resolveProjectContractPreviewContext } = loadPreviewApi();
  const calls = [];
  const assembled = Object.freeze({
    contractType: "WORKS",
    templateVersion: "engine-v9",
    title: "引擎組裝契約",
    status: "PROCEDURAL_INCOMPLETE",
    articles: [{ articleId: "ENGINE-ONLY", title: "引擎條文", body: "引擎內容", placeholders: [], attachments: [], sourceType: "ENGINE", required: true }],
    commonAppendix: { definition: { title: "引擎程序附件" }, renderedArticles: [] },
    attachmentRefs: ["ENGINE-ATTACHMENT"],
    unresolvedPlaceholders: [],
    unresolvedBindings: ["ENGINE-PROCEDURE"],
    metadata: { legalStatus: "LEGAL_REVIEW_REQUIRED", caseId: "CASE-9" },
  });
  const engine = {
    normalizeContractType(value) {
      calls.push(["normalize", value]);
      return "WORKS";
    },
    assembleProjectContract(options) {
      calls.push(["assemble", JSON.parse(JSON.stringify(options))]);
      return assembled;
    },
  };
  const context = resolveProjectContractPreviewContext({
    caseId: "CASE-9",
    contractId: "CONTRACT-9",
    version: "case-v3",
    contractType: "WORKS",
    role: "OWNER",
    readOnly: true,
  });

  assert.equal(assembleProjectContractPreview(engine, "WORKS", context), assembled);
  assert.deepEqual(calls, [
    ["normalize", "WORKS"],
    ["assemble", {
      contractType: "WORKS",
      caseData: { caseId: "CASE-9", contractId: "CONTRACT-9" },
      versionMetadata: { versionId: "case-v3" },
    }],
  ]);
});

test("preview href always targets the exact route with the normalized type", () => {
  const { buildProjectContractPreviewHref } = loadPreviewApi();
  assert.equal(buildProjectContractPreviewHref("WORKS"), "/site/standard_contract_editor/code.html?contractType=WORKS");
  assert.equal(buildProjectContractPreviewHref("DESIGN_BUILD"), "/site/standard_contract_editor/code.html?contractType=DESIGN_BUILD");
  assert.equal(buildProjectContractPreviewHref("unknown"), "/site/standard_contract_editor/code.html?contractType=DESIGN");
});

test("query selection and trusted context stay separate so switching cannot grant case context", () => {
  assert.match(app, /context\.contractType\s*===\s*(?:type|selectedType)/);
  assert.match(app, /LaibeProjectContractPreviewContext/);
  assert.doesNotMatch(app, /searchParams\.get\(["']caseId|searchParams\.get\(["']contractId/);
});

test("page retains one source-driven legal body and exact dependency order", () => {
  const sourceScript = html.indexOf("../shared/laibe-project-contract-source.js");
  const engineScript = html.indexOf("../shared/laibe-project-contract-engine.js");
  const appScript = html.indexOf("./app.js");
  assert.ok(sourceScript >= 0 && engineScript > sourceScript && appScript > engineScript);
  assert.doesNotMatch(html, /DESIGN-0[1-9]-|WORKS-0[1-9]-|DESIGN_BUILD-0[1-9]-/);
  assert.match(app, /engine\.normalizeContractType\(/);
  assert.match(app, /engine\.assembleProjectContract\(/);
  assert.doesNotMatch(app, /source\.templates|source\.commonProcedureAppendix|source\.governance/);
});

test("case status strip names role, selected version, status, and next responsible party", () => {
  for (const id of ["preview-context-kind", "preview-role", "preview-version", "preview-status", "preview-next-owner"]) {
    assert.match(html, new RegExp(`id=["']${id}["']`), `missing #${id}`);
  }
  assert.match(html, /中性範本預覽/);
  assert.match(surface, /未連結案件/);
});

test("four section tabs expose focusable navigation and print reflects selected type and version", () => {
  assert.equal((html.match(/class=["']contract-page-tab["']/g) || []).length, 4);
  assert.match(html, /href=["']#party-project-summary["']/);
  assert.match(html, /href=["']#payment-stages["']/);
  assert.match(html, /href=["']#contract-articles["']/);
  assert.match(html, /href=["']#common-procedure["']/);
  assert.match(app, /history\.replaceState/);
  assert.match(app, /document\.title/);
  assert.match(app, /beforeprint/);
  for (const label of ["第 1 冊：雙方與專案", "第 2 冊：付款與階段", "第 3 冊：契約條文", "第 4 冊：附件與程序"]) {
    assert.match(html, new RegExp(`aria-label=["']${label}["']`));
  }
  const mobileCss = html.slice(html.indexOf("@media screen and (max-width: 620px)"), html.indexOf("@media (prefers-reduced-motion"));
  assert.doesNotMatch(mobileCss, /\.contract-page-tab__label[^}]*display:\s*none/);
});

test("preview copy distinguishes every governance and money state without persistence claims", () => {
  for (const term of ["DRS 文件審閱", "甲方決策", "乙方回應", "雙方合意", "付款"]) {
    assert.match(surface, new RegExp(term));
  }
  assert.doesNotMatch(surface, /localStorage|sessionStorage|正式儲存|草稿已暫存|自動儲存/);
});

test("visible chrome is Taiwanese Traditional Chinese and never exposes raw source tokens", () => {
  const visibleHtml = html.replace(/<style[\s\S]*?<\/style>/gi, "").replace(/<script[\s\S]*?<\/script>/gi, "");
  const visibleText = visibleHtml.replace(/<[^>]+>/g, " ");
  assert.doesNotMatch(visibleText, /Project contract|read-only|PARTIES|PAYMENT BASIS|ARTICLES|COMMON PROCEDURE|PREVIEW BOUNDARY|Basis documents|Decision separation|Next owner|PROJECT MASTER CONTRACT/i);
  assert.doesNotMatch(app, /el\([^\n]*article\.articleId|["']來源：["']\s*\+\s*article\.sourceType|唯讀引用[^\n]*attachmentId|el\([^\n]*placeholder\)/);
  assert.match(app, /授權案件版本/);
});
