import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const serviceContractDir = path.join(
  packageRoot,
  "src",
  "stitch_laibe_landing_onboarding",
  "pcm_standalone",
  "service_contract",
);

function moduleUrl(fileName, query = "") {
  return `${pathToFileURL(path.join(serviceContractDir, fileName)).href}${query}`;
}

class TestElement {
  constructor(tagName) {
    this.tagName = tagName.toUpperCase();
    this.children = [];
    this.attributes = new Map();
    this.className = "";
    this.textContent = "";
    this.hidden = false;
  }

  append(...children) {
    this.children.push(...children);
  }

  replaceChildren(...children) {
    this.children = [...children];
  }

  setAttribute(name, value) {
    this.attributes.set(name, String(value));
  }

  removeAttribute(name) {
    this.attributes.delete(name);
  }

  getAttribute(name) {
    return this.attributes.get(name) ?? null;
  }

  addEventListener() {}

  scrollTo() {}
}

function collectText(node) {
  return [node.textContent, ...node.children.flatMap(collectText)].join("\n");
}

function collectElements(node) {
  return [node, ...node.children.flatMap(collectElements)];
}

const MIXED_ENGLISH_INTERNAL_TERMS = Object.freeze([
  "AI Prompt",
  "DRS Review",
  "Review",
  "Objection",
  "Override",
  "Case Event",
  "append-only",
  "case ID",
  "document ID",
  "detail drawings",
  "detail",
  "document bytes",
  "PDF document ID",
  "version",
  "reference",
  "runtime event",
  "Stage Runtime Events",
  "source document",
  "source version",
  "successor version",
  "Contract",
  "Decision",
  "Record",
  "timestamp",
  "OCR",
  "ID",
  "binding fields",
  "portfolio",
  " vs ",
]);

function findMixedEnglishInternalTerms(text) {
  return MIXED_ENGLISH_INTERNAL_TERMS.filter((term) => text.includes(term));
}

function createContractDocument(contractRoot) {
  return {
    body: new TestElement("body"),
    title: "",
    createElement: (tagName) => new TestElement(tagName),
    querySelector: (selector) => selector === "[data-contract]" ? contractRoot : null,
    querySelectorAll: () => [],
  };
}

test("contract presentation formatter resolves known and unknown source tokens safely", async () => {
  const contractContent = await import(moduleUrl("contract-content.js"));

  assert.equal(typeof contractContent.formatContractPresentationText, "function");
  const { formatContractPresentationText } = contractContent;
  assert.equal(
    formatContractPresentationText("案件 {{CASE_ID}}；甲方 {{OWNER_LEGAL_NAME}}"),
    "案件 待綁定案件編號；甲方 待填寫業主名稱",
  );
  assert.equal(
    formatContractPresentationText("未知 {{FUTURE_REQUIRED_FACT}}"),
    "未知 待補齊必要資料",
  );
  for (const placeholder of [
    "{{future_required_fact}}",
    "{{CASE-ID}}",
    "{{X Y}}",
    "{{future_required_fact}",
    "{{CASE-ID",
  ]) {
    assert.equal(formatContractPresentationText(placeholder), "待補齊必要資料", placeholder);
  }
  assert.equal(formatContractPresentationText("法律文字 {甲方權利}"), "法律文字 {甲方權利}");
  assert.equal(
    formatContractPresentationText(
      "AI_PRELIMINARY → HUMAN_REVIEW → DRS_REVIEWED；DRS_SERVICE_TERMINATION；LAIBE PLATFORM ACCOUNT",
    ),
    "AI 初步分析 → 授權人工審查 → DRS 正式書面審查結果；終止 DRS 案件治理服務；萊比平台帳戶",
  );
  assert.equal(formatContractPresentationText("APPEND-ONLY RECORD"), "僅能追加的案件紀錄");
  for (const [source, expected] of [
    ["LaiBE Decision & Record System／裝潢決策系統", "LaiBE DRS 裝潢決策與案件紀錄系統"],
    ["Decision & Record System／裝潢決策系統", "裝潢決策與案件紀錄系統"],
    ["DRS Review、Review、Objection、Override", "DRS 書面審查、審查、異議、另行決策"],
    ["Owner Objection／Override；Review Record；Review ID", "業主異議／另行決策；審查紀錄；審查紀錄編號"],
    ["AI Prompt；Case Event；append-only", "AI 分析規則；案件事件；僅能追加"],
    ["case ID；document ID；source document；source version；successor version", "案件識別碼；文件識別碼；來源文件；來源版本；後續版本"],
    ["detail drawings；detail；document bytes；PDF document ID", "細部圖；施工細節；文件內容；PDF 文件識別碼"],
    ["Stage Runtime Events；runtime event；version；reference；timestamp；OCR", "階段後續案件事件；後續案件事件；版本；關聯；時間；文字辨識"],
    ["Contract、Decision、Record", "契約、決策、紀錄"],
    ["契約 ID；binding fields；portfolio", "契約識別碼；必要綁定欄位；作品集"],
    ["約定要交什麼 vs 實際交了什麼", "約定交付內容與實際交付內容"],
    ["目前有效版本 vs 前階段已確認內容", "目前有效版本與前階段已確認內容"],
  ]) {
    assert.equal(formatContractPresentationText(source), expected, source);
  }
  assert.equal(
    formatContractPresentationText("LaiBE DRS AI PDF SHA-256 LINE 3D"),
    "LaiBE DRS AI PDF SHA-256 LINE 3D",
    "approved brand and product acronyms remain intact",
  );
  assert.equal(
    formatContractPresentationText("DESIGN_FEE != DRS_REVIEW_FEE"),
    "設計費與 DRS 審查服務費為不同費用",
  );
  assert.equal(
    formatContractPresentationText("DRS REVIEW PASSED != DESIGN PAYMENT AUTOMATICALLY DUE"),
    "DRS 審查通過不代表設計費自動到期應付",
  );
  assert.equal(formatContractPresentationText("PART 01"), "第 1 部分");
});

test("both canonical contract templates cross the safe presentation boundary without raw internal terms", async () => {
  const {
    CONTRACT_SOURCE,
    formatContractPresentationText,
  } = await import(moduleUrl("contract-content.js"));
  assert.equal(typeof formatContractPresentationText, "function");
  const designSource = await readFile(
    path.join(serviceContractDir, "DRS_DESIGN_SERVICE_CONTRACT_v0.1.md"),
    "utf8",
  );

  for (const [label, source] of [
    ["engineering", CONTRACT_SOURCE],
    ["design", designSource],
  ]) {
    const presented = formatContractPresentationText(source);
    assert.doesNotMatch(presented, /\{\{[^}]+\}\}/u, `${label} placeholder`);
    assert.doesNotMatch(
      presented,
      /\b[A-Z][A-Z0-9]*(?:_[A-Z0-9]+)+\b/u,
      `${label} internal term`,
    );
    assert.doesNotMatch(
      presented,
      /\b(?:DRS CASE GOVERNANCE SERVICE|LAIBE PLATFORM ACCOUNT|SIGNED CONTRACT)\b/u,
      `${label} internal phrase`,
    );
    assert.doesNotMatch(presented, /待補齊必要資料/u, `${label} known placeholder coverage`);
    assert.doesNotMatch(presented, /待法務確認的契約用語/u, `${label} known term coverage`);
    assert.doesNotMatch(presented, /APPEND-ONLY|```|!=/u, `${label} presentation syntax`);
    assert.deepEqual(
      findMixedEnglishInternalTerms(presented),
      [],
      `${label} mixed-English internal presentation terms`,
    );
  }
});

test("rendered engineering contract DOM contains only presentation-safe contract text", async () => {
  const contractRoot = new TestElement("article");
  const document = createContractDocument(contractRoot);

  const previousDocument = globalThis.document;
  const previousLocation = globalThis.location;
  globalThis.document = document;
  globalThis.location = { search: "" };
  try {
    const app = await import(moduleUrl("app.js", `?presentation-test=${Date.now()}`));
    await app.serviceContractPageReady;
    const renderedText = collectText(contractRoot);
    assert.doesNotMatch(renderedText, /\{\{[^}]+\}\}/u);
    assert.doesNotMatch(renderedText, /\b[A-Z][A-Z0-9]*(?:_[A-Z0-9]+)+\b/u);
    assert.doesNotMatch(renderedText, /\bPART\s+\d+\b/u);
    assert.doesNotMatch(renderedText, /```|`/u);
    assert.match(renderedText, /待綁定案件編號/u);
    assert.match(renderedText, /AI 初步分析/u);
  } finally {
    if (previousDocument === undefined) delete globalThis.document;
    else globalThis.document = previousDocument;
    if (previousLocation === undefined) delete globalThis.location;
    else globalThis.location = previousLocation;
  }
});

test("protected design contract production path renders natural contract language without Markdown artifacts", async () => {
  const contractRoot = new TestElement("article");
  const document = createContractDocument(contractRoot);
  const designBytes = await readFile(
    path.join(serviceContractDir, "DRS_DESIGN_SERVICE_CONTRACT_v0.1.md"),
  );
  const previousDocument = globalThis.document;
  const previousLocation = globalThis.location;
  const previousFetch = globalThis.fetch;
  globalThis.document = document;
  globalThis.location = { search: "?contract=design" };
  globalThis.fetch = async () => ({
    ok: true,
    arrayBuffer: async () => designBytes.buffer.slice(
      designBytes.byteOffset,
      designBytes.byteOffset + designBytes.byteLength,
    ),
  });
  try {
    const app = await import(moduleUrl("app.js", `?design-presentation-test=${Date.now()}`));
    await app.serviceContractPageReady;
    assert.ok(contractRoot.children.length > 0, "verified design source rendered");
    const renderedText = collectText(contractRoot);
    assert.doesNotMatch(renderedText, /\{\{/u);
    assert.doesNotMatch(renderedText, /\b[A-Z][A-Z0-9]*(?:_[A-Z0-9]+)+\b/u);
    assert.doesNotMatch(renderedText, /APPEND-ONLY|\bPART\s+\d+\b|```|`|!=/u);
    assert.doesNotMatch(renderedText, /^\s*(?:>|-)\s+/mu);
    assert.doesNotMatch(renderedText, /^\s*\d+\.\s+/mu);
    assert.doesNotMatch(renderedText, /^\s*\|.*\|\s*$/mu);
    assert.match(renderedText, /僅能追加的案件紀錄/u);
    assert.match(renderedText, /設計費與 DRS 審查服務費為不同費用/u);
    assert.match(renderedText, /DRS 審查通過不代表設計費自動到期應付/u);

    const elements = collectElements(contractRoot);
    assert.ok(elements.some(({ tagName }) => tagName === "UL"), "Markdown lists become semantic lists");
    assert.ok(elements.some(({ tagName }) => tagName === "OL"), "numbered Markdown lists become semantic lists");
    assert.ok(elements.some(({ tagName }) => tagName === "TABLE"), "Markdown tables become semantic tables");
    assert.equal(
      elements.some(({ tagName, textContent }) => tagName === "P" && textContent.trim() === "text"),
      false,
      "fence language never becomes an odd paragraph",
    );

    const page02 = contractRoot.children.find(
      (element) => element.getAttribute("data-contract-page") === "1",
    );
    assert.ok(page02, "design page 02 panel rendered");
    const page02Text = collectText(page02);
    assert.match(page02Text, /設計審查流程/u);
    assert.match(page02Text, /DRS 書面審查/u);
    assert.deepEqual(
      findMixedEnglishInternalTerms(page02Text),
      [],
      "design page 02 uses only product-facing contract language",
    );
  } finally {
    if (previousDocument === undefined) delete globalThis.document;
    else globalThis.document = previousDocument;
    if (previousLocation === undefined) delete globalThis.location;
    else globalThis.location = previousLocation;
    if (previousFetch === undefined) delete globalThis.fetch;
    else globalThis.fetch = previousFetch;
  }
});

test("production renderer fails malformed placeholder-like text closed without hiding ordinary braces", async () => {
  const app = await import(moduleUrl("app.js", `?malformed-placeholder-test=${Date.now()}`));
  assert.equal(typeof app.renderContract, "function");
  const contractRoot = new TestElement("article");
  const document = createContractDocument(contractRoot);
  const previousDocument = globalThis.document;
  globalThis.document = document;
  try {
    app.renderContract([
      "# 測試契約",
      "案件 {{future_required_fact}}",
      "版本 {{CASE-ID}",
      "備註 {{X Y",
      "法律文字 {甲方權利}",
    ].join("\n"));
    const renderedText = collectText(contractRoot);
    assert.doesNotMatch(renderedText, /\{\{/u);
    assert.equal((renderedText.match(/待補齊必要資料/gu) ?? []).length, 3);
    assert.match(renderedText, /法律文字 \{甲方權利\}/u);
  } finally {
    if (previousDocument === undefined) delete globalThis.document;
    else globalThis.document = previousDocument;
  }
});

test("signing readiness requires placeholder resolution proof for the exact contract version", async () => {
  const { CONTRACT_SOURCE_SHA256 } = await import(moduleUrl("contract-content.js"));
  const { evaluateSigningReadiness, serviceContractPageReady } = await import(moduleUrl("app.js"));
  assert.ok(
    serviceContractPageReady instanceof Promise,
    "page initialization is always represented by an exported Promise",
  );
  await serviceContractPageReady;
  const otherwiseComplete = {
    contractVersionHash: CONTRACT_SOURCE_SHA256,
    ownerIdentityVerified: true,
    ownerPartyId: "owner-001",
    serviceProviderPartySnapshot: {
      partyType: "natural_person",
      partyId: "provider-001",
      signatoryActorId: "actor-001",
    },
    writerReady: true,
    legalReviewStatus: "LEGAL_FINAL",
  };

  const omittedProof = evaluateSigningReadiness(otherwiseComplete);
  assert.equal(omittedProof.ready, false);
  assert.ok(omittedProof.reasons.includes("契約必要資料尚未依本版本完整帶入"));

  assert.deepEqual(
    evaluateSigningReadiness({
      ...otherwiseComplete,
      placeholdersResolvedForVersionHash: CONTRACT_SOURCE_SHA256,
    }),
    { ready: true, reasons: [] },
  );
  assert.equal(
    evaluateSigningReadiness({
      ...otherwiseComplete,
      placeholdersResolvedForVersionHash: "a".repeat(64),
    }).ready,
    false,
  );
});
