import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const serviceContractDir = path.join(
  repoRoot,
  "src",
  "stitch_laibe_landing_onboarding",
  "pcm_standalone",
  "service_contract",
);
const designContractPath = path.join(serviceContractDir, "DRS_DESIGN_SERVICE_CONTRACT_v0.1.md");
const expectedDesignSha256 = "94ba48f0574bc59830716d447aedb3fa26b9e1d3a3d291fa06c445327a9452c3";
const standaloneFivePercent = /(?:^|[^\d.])5%(?!\d)|百分之五/u;

function moduleUrl(fileName) {
  return `${pathToFileURL(path.join(serviceContractDir, fileName)).href}?dual=${Date.now()}-${Math.random()}`;
}

test("authoritative design contract stays byte-exact and contains all 33 articles and 7 annexes", async () => {
  const bytes = await readFile(designContractPath);
  const source = bytes.toString("utf8");

  assert.equal(createHash("sha256").update(bytes).digest("hex"), expectedDesignSha256);
  assert.equal([...source.matchAll(/^## 第[^\n]+條[^\n]*$/gm)].length, 33);
  assert.equal([...source.matchAll(/^# 附件[一二三四五六七]｜/gm)].length, 7);
  assert.match(source, /設計簽約 \| 20%[\s\S]*3D 確認 \| 20%[\s\S]*平面／系統圖交付 \| 20%[\s\S]*細部圖交付 \| 40%/);
  assert.match(source, /DRS_DESIGN_REVIEW_RATE = 10%/);
  assert.match(source, /2% \+ 2% \+ 2% \+ 4% = TOTAL_DESIGN_FEE × 10%/);
  assert.match(source, /AI_PRELIMINARY[\s\S]*HUMAN_REVIEW[\s\S]*DRS_REVIEWED/);
  assert.match(source, /案件設計方：不是本契約當事人/);
  assert.match(source, /SIGNED_CONTRACT_IMMUTABLE = TRUE/);
  assert.match(source, /LAWYER_FINAL_REVIEW_REQUIRED/);
  assert.match(source, /DRS 不審查、評分或判斷：美不美、好不好看/);
});

test("engineering v0.5 separates turnkey design and engineering DRS fee bases without treating contractor payments as DRS income", async () => {
  const { CONTRACT_META, CONTRACT_SOURCE, KEY_CLAUSES } = await import(moduleUrl("contract-content.js"));
  const app = await import(moduleUrl("app.js"));
  const html = await readFile(path.join(serviceContractDir, "code.html"), "utf8");
  const paymentClause = KEY_CLAUSES.find(({ id }) => id === "kc-pay");

  assert.equal(CONTRACT_META.version, "v0.5");
  assert.equal(CONTRACT_META.designReviewFeeRate, "10%");
  assert.equal(CONTRACT_META.engineeringGovernanceFeeRate, "3.5%");
  assert.match(CONTRACT_SOURCE, /統包＝設計＋工程/);
  assert.match(CONTRACT_SOURCE, /DRS 統包審查服務費＝設計費 × 10%＋工程款 × 3\.5%/);
  assert.match(CONTRACT_SOURCE, /\{\{TOTAL_DESIGN_FEE\}\} × 10%/);
  assert.match(CONTRACT_SOURCE, /\{\{PROJECT_TOTAL_AMOUNT\}\} × 3\.5%/);
  assert.match(CONTRACT_SOURCE, /設計審查服務費＋工程審查／治理服務費/);
  assert.match(CONTRACT_SOURCE, /追加工程 DRS 服務費＝已確認追加報價 × 3\.5%/);
  assert.match(CONTRACT_SOURCE, /不收受工程款、不保管工程款、不控制工程款/);
  assert.doesNotMatch(CONTRACT_SOURCE, /source of truth/i);

  assert.ok(paymentClause);
  const feeTableText = JSON.stringify(paymentClause.table);
  assert.match(feeTableText, /設計審查/);
  assert.match(feeTableText, /工程審查／治理/);
  assert.match(feeTableText, /追加工程審查／治理/);
  assert.doesNotMatch(feeTableText, /案件乙方簽約|工程款 5%|不另計/);
  assert.match(app.CONTRACT_PARTS[1].summary, /設計審查 10%/);
  assert.match(app.CONTRACT_PARTS[1].summary, /工程審查／治理 3\.5%/);
  assert.match(app.CONTRACT_VIEW_CONFIGS.engineering.readinessSummary, /v0\.5 法務審閱稿/);
  assert.equal(
    app.CONTRACT_VIEW_CONFIGS.engineering.serviceFeeSummary,
    "DRS 統包審查服務費＝設計費 × 10%＋工程款 × 3.5%；兩項計價基準與 DRS 付款節點分開列示。",
  );
  assert.equal(app.CONTRACT_VIEW_CONFIGS.design.version, "v0.1");
  assert.equal(app.CONTRACT_VIEW_CONFIGS.design.sourceSha256, expectedDesignSha256);

  const drsSurfaces = {
    CONTRACT_SOURCE,
    KEY_CLAUSES: JSON.stringify(KEY_CLAUSES),
    appUserVisibleCopy: JSON.stringify({
      parts: app.CONTRACT_PARTS,
      engineering: app.CONTRACT_VIEW_CONFIGS.engineering,
      design: app.CONTRACT_VIEW_CONFIGS.design,
    }),
    codeHtml: html,
  };
  for (const [surface, copy] of Object.entries(drsSurfaces)) {
    assert.doesNotMatch(copy, standaloneFivePercent, `${surface} must not expose a standalone 5% fee`);
  }
});

test("contract type is URL-addressable with engineering as the fail-safe default", async () => {
  const app = await import(moduleUrl("app.js"));

  assert.equal(app.CONTRACT_TYPES.ENGINEERING, "engineering");
  assert.equal(app.CONTRACT_TYPES.DESIGN, "design");
  assert.equal(app.resolveContractTypeFromLocation({ search: "", hash: "#full-contract" }), "engineering");
  assert.equal(app.resolveContractTypeFromLocation({ search: "?contract=design", hash: "#full-contract" }), "design");
  assert.equal(app.resolveContractTypeFromLocation({ search: "?contract=unknown", hash: "#full-contract" }), "engineering");
  assert.equal(app.buildContractTypeHref("engineering"), "./code.html?contract=engineering#full-contract");
  assert.equal(app.buildContractTypeHref("design"), "./code.html?contract=design#full-contract");
});

test("design source loader verifies exact bytes and rejects tampering", async () => {
  const app = await import(moduleUrl("app.js"));
  const exactBytes = await readFile(designContractPath);
  const tamperedBytes = Buffer.concat([exactBytes, Buffer.from("\n")]);

  assert.equal(app.DESIGN_CONTRACT_SOURCE_SHA256, expectedDesignSha256);
  assert.equal(app.DESIGN_CONTRACT_SOURCE_PATH, "./DRS_DESIGN_SERVICE_CONTRACT_v0.1.md");
  assert.equal((await app.verifyDesignContractBytes(exactBytes)).ok, true);
  assert.equal((await app.verifyDesignContractBytes(tamperedBytes)).ok, false);
});

test("page exposes two native contract routes and keeps signing fail closed", async () => {
  const html = await readFile(path.join(serviceContractDir, "code.html"), "utf8");

  assert.match(html, /<title>萊比 DRS 案件治理資訊服務契約｜v0\.5 法務審閱稿<\/title>/);
  assert.match(html, /<span data-contract-version-label>v0\.5 法務審閱稿<\/span>/);
  assert.match(html, /<strong data-contract-version>v0\.5<\/strong>/);
  assert.match(html, /data-readiness-summary>目前是 v0\.5 法務審閱稿；設計費與工程款基準、必要欄位及正式簽署能力尚待確認。<\/p>/);
  assert.match(
    html,
    /<dd data-service-fee-summary>DRS 統包審查服務費＝設計費 × 10%＋工程款 × 3\.5%；兩項計價基準與 DRS 付款節點分開列示。<\/dd>/,
  );
  assert.doesNotMatch(html, /v0\.4|總工程款 × 3\.5%/);
  assert.match(html, /aria-label="契約類型切換"/);
  assert.match(html, /data-contract-type-link="engineering"[^>]*href="\.\/code\.html\?contract=engineering#full-contract"/);
  assert.match(html, /data-contract-type-link="design"[^>]*href="\.\/code\.html\?contract=design#full-contract"/);
  assert.match(html, /data-contract-view-title/);
  assert.match(html, /data-contract-version/);
  assert.match(html, /data-sign-button[^>]*\bdisabled\b[^>]*aria-disabled="true"/);
});

test("external contract actions use product language without local-preview jargon", async () => {
  const html = await readFile(path.join(serviceContractDir, "code.html"), "utf8");
  const app = await import(moduleUrl("app.js"));

  assert.match(html, /data-print-button>列印 \/ 預覽<\/button>/);
  assert.doesNotMatch(html, /本機預覽/);
  assert.equal(
    app.CONTRACT_VIEW_CONFIGS.design.availability,
    "設計契約仍待法務與政策確認，且沒有真實簽署能力；目前只提供完整閱讀與條文確認。",
  );
  assert.doesNotMatch(app.CONTRACT_VIEW_CONFIGS.design.availability, /本機預覽/);
});

test("service contract document and assets refuse stale preview caching", async () => {
  const html = await readFile(path.join(serviceContractDir, "code.html"), "utf8");

  assert.match(html, /<meta http-equiv="Cache-Control" content="no-store, no-cache, must-revalidate"\s*\/?>/);
  assert.match(html, /<meta http-equiv="Pragma" content="no-cache"\s*\/?>/);
  assert.match(html, /<meta http-equiv="Expires" content="0"\s*\/?>/);
  assert.match(html, /href="\.\/styles\.css\?v=20260815-w2-integrated-no-cache"/);
  assert.match(html, /src="\.\/app\.js\?v=20260816-turnkey-fee-v5-static-fallback"/);
});

test("contract view updates only the engineering static fee summary through a dedicated hook", async () => {
  const app = await import(moduleUrl("app.js"));
  const summary = { textContent: "靜態摘要" };
  const previousDocument = globalThis.document;
  globalThis.document = {
    querySelector(selector) {
      return selector === "[data-service-fee-summary]" ? summary : null;
    },
  };

  try {
    app.applyContractView(app.CONTRACT_VIEW_CONFIGS.engineering);
    assert.equal(summary.textContent, app.CONTRACT_VIEW_CONFIGS.engineering.serviceFeeSummary);

    summary.textContent = "設計契約不顯示工程服務費摘要";
    app.applyContractView(app.CONTRACT_VIEW_CONFIGS.design);
    assert.equal(summary.textContent, "設計契約不顯示工程服務費摘要");
  } finally {
    if (previousDocument === undefined) delete globalThis.document;
    else globalThis.document = previousDocument;
  }
});

test("both contract configurations remain independent and design keeps the aesthetic-review exclusion", async () => {
  const app = await import(moduleUrl("app.js"));
  const engineering = app.CONTRACT_VIEW_CONFIGS.engineering;
  const design = app.CONTRACT_VIEW_CONFIGS.design;

  assert.equal(engineering.version, "v0.5");
  assert.equal(engineering.sourceSha256, "d398182f197a4d6e8f8adba08a8b720aab274f5e9a8756c49aef359b2bf78359");
  assert.equal(design.version, "v0.1");
  assert.equal(design.sourceSha256, expectedDesignSha256);
  assert.match(design.boundaryNotice, /不審查美感、風格、配色、創意/);
  assert.match(design.boundaryNotice, /書面資訊是否足夠、一致、可追溯/);
  assert.notEqual(engineering.title, design.title);
  assert.equal(engineering.parts.length, 4);
  assert.equal(design.parts.length, 4);
});

test("contract reader owns vertical scrolling and leaves boundary wheel chaining available", async () => {
  const css = await readFile(path.join(serviceContractDir, "styles.css"), "utf8");

  assert.match(css, /\.contract-page-deck\s*\{[^}]*overflow-y:\s*auto[^}]*overscroll-behavior-y:\s*auto/s);
  assert.match(css, /\.contract-book__reader\s*\{[^}]*overflow:\s*hidden/s);
  assert.match(css, /@media screen and \(max-width:\s*980px\)[\s\S]*\.contract-page-deck\s*\{[^}]*height:\s*min\(/s);
});

class PagerElement {
  constructor(tagName) {
    this.tagName = tagName.toUpperCase();
    this.children = [];
    this.attributes = new Map();
    this.listeners = new Map();
    this.className = "";
    this.classList = {
      add() {},
      remove() {},
      toggle() {},
    };
    this.hidden = false;
    this.scrollTop = 0;
    this.tabIndex = 0;
    this.textContent = "";
  }

  append(...children) {
    this.children.push(...children);
  }

  setAttribute(name, value) {
    this.attributes.set(name, String(value));
  }

  getAttribute(name) {
    return this.attributes.get(name) ?? null;
  }

  addEventListener(type, listener) {
    this.listeners.set(type, listener);
  }

  querySelector() {
    return null;
  }

  activate() {
    this.listeners.get("click")?.();
  }
}

class PagerDocument {
  constructor(nodes, tabs) {
    this.nodes = nodes;
    this.tabs = tabs;
    this.body = null;
    this.title = "";
  }

  createElement(tagName) {
    return new PagerElement(tagName);
  }

  querySelector(selector) {
    return this.nodes.get(selector) ?? null;
  }

  querySelectorAll(selector) {
    return selector === "[data-contract-tab]" ? this.tabs : [];
  }
}

test("pager restores each book's independent deck scroll position", async () => {
  const deck = new PagerElement("section");
  const tabs = Array.from({ length: 4 }, () => new PagerElement("button"));
  const nodes = new Map([["[data-contract]", deck]]);
  const previousDocument = globalThis.document;
  const previousWindow = globalThis.window;
  const previousLocation = globalThis.location;
  globalThis.document = new PagerDocument(nodes, tabs);
  globalThis.window = {
    clearTimeout() {},
    setTimeout(handler) {
      handler();
      return 0;
    },
  };
  globalThis.location = { search: "", hash: "" };

  try {
    await import(moduleUrl("app.js"));
    deck.scrollTop = 120;
    tabs[1].activate();
    assert.equal(deck.scrollTop, 0);
    deck.scrollTop = 240;
    tabs[0].activate();
    assert.equal(deck.scrollTop, 120);
  } finally {
    if (previousDocument === undefined) delete globalThis.document;
    else globalThis.document = previousDocument;
    if (previousWindow === undefined) delete globalThis.window;
    else globalThis.window = previousWindow;
    if (previousLocation === undefined) delete globalThis.location;
    else globalThis.location = previousLocation;
  }
});
