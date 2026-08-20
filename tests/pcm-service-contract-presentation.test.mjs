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
  assert.equal(
    formatContractPresentationText(
      "AI_PRELIMINARY → HUMAN_REVIEW → DRS_REVIEWED；DRS_SERVICE_TERMINATION；LAIBE PLATFORM ACCOUNT",
    ),
    "AI 初步分析 → 授權人工審查 → DRS 正式書面審查結果；終止 DRS 案件治理服務；萊比平台帳戶",
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
  }
});

test("rendered engineering contract DOM contains only presentation-safe contract text", async () => {
  const contractRoot = new TestElement("article");
  const body = new TestElement("body");
  const document = {
    body,
    title: "",
    createElement: (tagName) => new TestElement(tagName),
    querySelector: (selector) => selector === "[data-contract]" ? contractRoot : null,
    querySelectorAll: () => [],
  };

  const previousDocument = globalThis.document;
  const previousLocation = globalThis.location;
  globalThis.document = document;
  globalThis.location = { search: "" };
  try {
    await import(moduleUrl("app.js", `?presentation-test=${Date.now()}`));
    await new Promise((resolve) => setTimeout(resolve, 0));
    const renderedText = collectText(contractRoot);
    assert.doesNotMatch(renderedText, /\{\{[^}]+\}\}/u);
    assert.doesNotMatch(renderedText, /\b[A-Z][A-Z0-9]*(?:_[A-Z0-9]+)+\b/u);
    assert.doesNotMatch(renderedText, /\bPART\s+\d+\b/u);
    assert.match(renderedText, /待綁定案件編號/u);
    assert.match(renderedText, /AI 初步分析/u);
  } finally {
    if (previousDocument === undefined) delete globalThis.document;
    else globalThis.document = previousDocument;
    if (previousLocation === undefined) delete globalThis.location;
    else globalThis.location = previousLocation;
  }
});

test("signing readiness requires placeholder resolution proof for the exact contract version", async () => {
  const { CONTRACT_SOURCE_SHA256 } = await import(moduleUrl("contract-content.js"));
  const { evaluateSigningReadiness } = await import(moduleUrl("app.js"));
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
