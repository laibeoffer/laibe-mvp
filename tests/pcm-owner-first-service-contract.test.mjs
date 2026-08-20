import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
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
const frozenContractPath = path.join(serviceContractDir, "contract-content.js");
const FROZEN_CONTRACT_FILE_SHA256 =
  "6fe5fc0394db307f72a3e21424e0a13c9bbc16fbc221bb598dd60f9692133537";
const FROZEN_CONTRACT_SOURCE_SHA256 =
  "d398182f197a4d6e8f8adba08a8b720aab274f5e9a8756c49aef359b2bf78359";

function moduleUrl(fileName, query = "") {
  return `${pathToFileURL(path.join(serviceContractDir, fileName)).href}${query}`;
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function currentHtmlAnchor(html, marker) {
  const escapedMarker = marker.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
  const matches = html.match(
    new RegExp(`<a\\b[^>]*${escapedMarker}(?=\\s|>)[^>]*>[\\s\\S]*?<\\/a>`, "gu"),
  ) ?? [];
  assert.equal(matches.length, 1, `current HTML must contain one ${marker} anchor`);
  const source = matches[0];
  const opening = source.match(/^<a\b([^>]*)>/u);
  assert.ok(opening, `${marker} opening tag`);
  const attributes = new Map();
  for (const attribute of opening[1].matchAll(/([:\w-]+)(?:\s*=\s*"([^"]*)")?/gu)) {
    attributes.set(attribute[1], attribute[2] ?? "");
  }
  const classes = new Set((attributes.get("class") ?? "").split(/\s+/u).filter(Boolean));
  return {
    source,
    textContent: source.replace(/<[^>]+>/gu, " ").replace(/\s+/gu, " ").trim(),
    classList: {
      toggle(name, enabled) {
        if (enabled) classes.add(name);
        else classes.delete(name);
        attributes.set("class", [...classes].join(" "));
      },
    },
    setAttribute(name, value) {
      attributes.set(name, String(value));
    },
    getAttribute(name) {
      return attributes.get(name) ?? null;
    },
    hasAttribute(name) {
      return attributes.has(name);
    },
    removeAttribute(name) {
      attributes.delete(name);
    },
    get href() {
      return attributes.get("href") ?? "";
    },
    set href(value) {
      attributes.set("href", String(value));
    },
  };
}

function createServiceHeaderHarness(html) {
  const nodes = new Map([
    ["[data-service-brand-link]", currentHtmlAnchor(html, "data-service-brand-link")],
    ["[data-service-header-return]", currentHtmlAnchor(html, "data-service-header-return")],
  ]);
  return {
    nodes,
    root: {
      querySelector(selector) {
        return nodes.get(selector) ?? null;
      },
    },
  };
}

test("service contract header uses the official common lockup and manifest-owned links", async () => {
  const [html, ownerHtml, css] = await Promise.all([
    readFile(path.join(serviceContractDir, "code.html"), "utf8"),
    readFile(path.join(serviceContractDir, "..", "..", "client_awarding_dashboard", "code.html"), "utf8"),
    readFile(path.join(serviceContractDir, "styles.css"), "utf8"),
  ]);
  const header = html.slice(
    html.indexOf('<header class="site-header"'),
    html.indexOf("</header>"),
  );

  assert.match(header, /data-service-brand-link/u);
  assert.match(header, /class="drs-brand-lockup drs-brand-lockup--expanded"/u);
  assert.match(header, /aria-label="LaiBE DRS 首頁"/u);
  assert.match(header, /Decision[\s\S]*Record[\s\S]*System/u);
  assert.match(header, /class="drs-brand-name">裝潢決策系統<\/small>/u);
  assert.match(header, /data-service-header-return[^>]*>返回 DRS 首頁<\/a>/u);
  assert.doesNotMatch(header, /data-service-(?:brand-link|header-return)[^>]*\shref=/u);
  assert.match(header, /href="#contract-flow"[\s\S]*確認流程/u);
  assert.match(header, /href="#full-contract"[\s\S]*完整契約/u);
  assert.match(css, /\.site-header nav a\s*\{[^}]*min-height:\s*44px/is);
  assert.match(css, /@media\s*(?:screen\s*and\s*)?\(max-width:\s*620px\)[\s\S]*\.site-header[\s\S]*flex-wrap:\s*wrap/is);
  assert.match(css, /@media\s*(?:screen\s*and\s*)?\(max-width:\s*620px\)[\s\S]*\.site-header nav[\s\S]*width:\s*100%/is);

  const serviceBrand = currentHtmlAnchor(html, "data-service-brand-link");
  const ownerBrand = currentHtmlAnchor(ownerHtml, "data-owner-brand-link");
  const lockupPattern = /<span class="drs-brand-lockup drs-brand-lockup--expanded">[\s\S]*?<small class="drs-brand-name">裝潢決策系統<\/small>\s*<\/span>/u;
  assert.equal(serviceBrand.getAttribute("aria-label"), "LaiBE DRS 首頁");
  assert.equal(ownerBrand.getAttribute("aria-label"), "LaiBE DRS 首頁");
  assert.equal(
    serviceBrand.source.match(lockupPattern)?.[0].replace(/\s+/gu, " "),
    ownerBrand.source.match(lockupPattern)?.[0].replace(/\s+/gu, " "),
  );
});

test("service contract header resolves the exact single trusted owner return and keeps brand canonical", async () => {
  const { bindServiceContractHeaderRoutes } = await import(moduleUrl("app.js"));
  const html = await readFile(path.join(serviceContractDir, "code.html"), "utf8");

  for (const [search, expectedLabel, expectedHref] of [
    ["", "返回 DRS 首頁", "../public_home/code.html#top"],
    ["?returnTo=", "返回 DRS 首頁", "../public_home/code.html#top"],
    ["?returnTo=Owner-contract", "返回 DRS 首頁", "../public_home/code.html#top"],
    ["?returnTo=vendor", "返回 DRS 首頁", "../public_home/code.html#top"],
    ["?returnTo=owner-contract", "返回契約管理", "../../client_awarding_dashboard/code.html#owner-dashboard-panel-contract"],
    ["?contract=design&returnTo=owner-contract", "返回契約管理", "../../client_awarding_dashboard/code.html#owner-dashboard-panel-contract"],
    ["?returnTo=owner-contract&returnTo=owner-contract", "返回 DRS 首頁", "../public_home/code.html#top"],
    ["?returnTo=owner-contract&returnTo=vendor", "返回 DRS 首頁", "../public_home/code.html#top"],
  ]) {
    const { root, nodes } = createServiceHeaderHarness(html);
    assert.equal(bindServiceContractHeaderRoutes(root, { search }), true, search);
    assert.equal(nodes.get("[data-service-brand-link]").getAttribute("href"), "../public_home/code.html#top", search);
    assert.equal(nodes.get("[data-service-header-return]").textContent, expectedLabel, search);
    assert.equal(nodes.get("[data-service-header-return]").getAttribute("href"), expectedHref, search);
    assert.equal(nodes.get("[data-service-header-return]").hasAttribute("aria-disabled"), false, search);
    assert.equal(nodes.get("[data-service-header-return]").hasAttribute("tabindex"), false, search);
  }
});

test("service contract conditional return safely falls back to valid home and otherwise fails closed", async () => {
  const { bindServiceContractHeaderRoutes } = await import(moduleUrl("app.js"));
  const html = await readFile(path.join(serviceContractDir, "code.html"), "utf8");
  const homeHref = "../public_home/code.html#top";
  const defaultGetter = (id) => id === "serviceContractBrandToHome" || id === "serviceContractHeaderHomeToHome"
    ? homeHref
    : null;

  for (const conditionalFailure of [
    defaultGetter,
    (id) => {
      if (id === "serviceContractTrustedOwnerReturnToOwnerContractManagement") throw new Error("unavailable");
      return defaultGetter(id);
    },
    (id) => id === "serviceContractTrustedOwnerReturnToOwnerContractManagement"
      ? "../../wrong.html"
      : defaultGetter(id),
  ]) {
    const { root, nodes } = createServiceHeaderHarness(html);
    assert.equal(bindServiceContractHeaderRoutes(root, { search: "?returnTo=owner-contract" }, conditionalFailure), true);
    assert.equal(nodes.get("[data-service-header-return]").textContent, "返回 DRS 首頁");
    assert.equal(nodes.get("[data-service-header-return]").getAttribute("href"), homeHref);
  }

  for (const failedGetter of [() => "../wrong.html", () => { throw new Error("unavailable"); }]) {
    const { root, nodes } = createServiceHeaderHarness(html);
    assert.equal(bindServiceContractHeaderRoutes(root, { search: "?returnTo=owner-contract" }, failedGetter), false);
    assert.equal(nodes.get("[data-service-brand-link]").hasAttribute("href"), false);
    assert.equal(nodes.get("[data-service-header-return]").hasAttribute("href"), false);
    assert.equal(nodes.get("[data-service-header-return]").textContent, "返回 DRS 首頁");
    assert.equal(nodes.get("[data-service-header-return]").getAttribute("aria-disabled"), "true");
  }
});

test("trusted owner return survives engineering and design type journeys while invalid contexts are dropped", async () => {
  const {
    CONTRACT_TYPES,
    CONTRACT_VIEW_CONFIGS,
    applyContractView,
    buildContractTypeHref,
  } = await import(moduleUrl("app.js"));
  const html = await readFile(path.join(serviceContractDir, "code.html"), "utf8");
  const typeLinks = [
    currentHtmlAnchor(html, 'data-contract-type-link="engineering"'),
    currentHtmlAnchor(html, 'data-contract-type-link="design"'),
  ];
  const previousDocument = globalThis.document;
  globalThis.document = {
    body: { setAttribute() {} },
    querySelector() { return null; },
    querySelectorAll(selector) {
      return selector === "[data-contract-type-link]" ? typeLinks : [];
    },
  };

  try {
    for (const [search, trusted] of [
      ["?contract=engineering&returnTo=owner-contract", true],
      ["?contract=design&returnTo=owner-contract", true],
      ["", false],
      ["?returnTo=", false],
      ["?returnTo=Owner-contract", false],
      ["?returnTo=vendor", false],
      ["?returnTo=owner-contract&returnTo=owner-contract", false],
      ["?returnTo=owner-contract&returnTo=vendor", false],
    ]) {
      const locationLike = { search };
      const expectedSuffix = trusted ? "&returnTo=owner-contract#full-contract" : "#full-contract";
      assert.equal(
        buildContractTypeHref(CONTRACT_TYPES.ENGINEERING, locationLike),
        `./code.html?contract=engineering${expectedSuffix}`,
        search,
      );
      assert.equal(
        buildContractTypeHref(CONTRACT_TYPES.DESIGN, locationLike),
        `./code.html?contract=design${expectedSuffix}`,
        search,
      );

      applyContractView(CONTRACT_VIEW_CONFIGS[CONTRACT_TYPES.DESIGN], locationLike);
      assert.equal(typeLinks[0].href, `./code.html?contract=engineering${expectedSuffix}`, search);
      assert.equal(typeLinks[1].href, `./code.html?contract=design${expectedSuffix}`, search);
    }
  } finally {
    if (previousDocument === undefined) delete globalThis.document;
    else globalThis.document = previousDocument;
  }
});

test("T7 binds the complete v0.5 legal-review contract-content file byte-for-byte", async () => {
  const frozenBytes = await readFile(frozenContractPath);
  const { CONTRACT_META, CONTRACT_SOURCE, CONTRACT_SOURCE_SHA256 } = await import(
    moduleUrl("contract-content.js")
  );

  assert.equal(sha256(frozenBytes), FROZEN_CONTRACT_FILE_SHA256);
  assert.equal(CONTRACT_META.version, "v0.5");
  assert.equal(CONTRACT_META.legalReviewStatus, "LAWYER_FINAL_REVIEW_REQUIRED");
  assert.equal(CONTRACT_SOURCE_SHA256, FROZEN_CONTRACT_SOURCE_SHA256);
  assert.equal(sha256(Buffer.from(CONTRACT_SOURCE, "utf8")), CONTRACT_SOURCE_SHA256);
  assert.match(CONTRACT_SOURCE, /^# 萊比 DRS 案件治理資訊服務契約$/m);
  assert.match(CONTRACT_SOURCE, /^## 第二十八條[　\s]/m);
  assert.match(CONTRACT_SOURCE, /^# 附件十四[　\s]/m);
});

test("turnkey DRS fees separate design and engineering bases, additions, and termination settlement", async () => {
  const { CONTRACT_SOURCE, KEY_CLAUSES } = await import(moduleUrl("contract-content.js"));
  const appSource = await readFile(path.join(serviceContractDir, "app.js"), "utf8");
  const paymentClause = KEY_CLAUSES.find(({ id }) => id === "kc-pay");

  assert.match(CONTRACT_SOURCE, /DRS 統包審查服務費＝設計費 × 10%＋工程款 × 3\.5%/);
  assert.match(CONTRACT_SOURCE, /TOTAL_DESIGN_FEE 之 2%；3D 確認階段收 2%/);
  assert.match(CONTRACT_SOURCE, /PROJECT_TOTAL_AMOUNT 之 3\.5%/);
  assert.match(CONTRACT_SOURCE, /啟動預審收該項服務費之 10%/);
  assert.match(CONTRACT_SOURCE, /後續八期審查各收該項服務費之 10%/);
  assert.match(CONTRACT_SOURCE, /尾款審查收剩餘 10%/);
  assert.doesNotMatch(CONTRACT_SOURCE, /案件乙方(?: 5%|簽約款百分之五)/);
  assert.match(CONTRACT_SOURCE, /每次追加施工前/);
  assert.match(CONTRACT_SOURCE, /追加工程 DRS 服務費＝已確認追加報價 × 3\.5%/);
  assert.match(CONTRACT_SOURCE, /獨立計收，不納入原工程尾款/);
  assert.doesNotMatch(CONTRACT_SOURCE, /追加減服務費/);
  assert.match(CONTRACT_SOURCE, /尚未付費且尚未開始之後續階段，不再履行或計收/);
  assert.match(CONTRACT_SOURCE, /重複付款、計算錯誤或依法令強制規定/);
  assert.doesNotMatch(CONTRACT_SOURCE, /^## 第二十一條　退費$/m);
  assert.doesNotMatch(CONTRACT_SOURCE, /未履行部分是否按比例退還/);
  assert.ok(paymentClause);
  assert.match(paymentClause.title, /設計費 × 10%＋工程款 × 3\.5%/);
  assert.doesNotMatch(JSON.stringify(paymentClause.table), /案件乙方簽約|工程款 5%|不另計/);
  assert.match(appSource, /summary: "契約終止與服務費結算、責任限制、爭議處理/);
});

test("owner-first first fold states role, contract status, case status, responsibility and truthful actions", async () => {
  const html = await readFile(path.join(serviceContractDir, "code.html"), "utf8");
  const firstFold = html.slice(0, html.indexOf('id="contract-summary"'));

  assert.match(firstFold, /目前角色[\s\S]*甲方/);
  assert.match(firstFold, /契約狀態[\s\S]*v0\.5[\s\S]*法務審閱中/);
  assert.doesNotMatch(firstFold, /v0\.4/);
  assert.match(firstFold, /案件狀態[\s\S]*尚未載入案件資料/);
  assert.match(firstFold, /下一責任人[\s\S]*甲方[\s\S]*先閱讀契約與流程/);
  assert.match(firstFold, /最近紀錄[\s\S]*尚無可顯示的案件紀錄/);
  assert.match(firstFold, /class="contract-page-controls"[^>]*aria-label="契約分冊切換"/);
  assert.doesNotMatch(firstFold, /開始閱讀完整契約/);
  assert.match(firstFold, /data-print-button[\s\S]*列印 \/ 預覽/);
  assert.match(firstFold, /data-sign-button[^>]*\bdisabled\b[^>]*aria-disabled="true"/);
  assert.match(firstFold, /尚未進入簽署/);
  assert.doesNotMatch(firstFold, /甲方服務費|3\.5%/);

  for (const engineeringCopy of [
    "DB",
    "API",
    "n8n",
    "debug",
    "mock-only",
    "本機候選",
    "無 DB 寫入",
    "功能停用",
    "API 未開",
  ]) {
    assert.equal(html.includes(engineeringCopy), false, engineeringCopy);
  }
  assert.doesNotMatch(html, /託管|代收代付|最低價|競標|媒合|投資報酬|老屋煉金術/);
  assert.doesNotMatch(html, /https?:\/\/|\/\/cdn\.|scrollIntoView|localStorage/);
});

test("HERO is one physical contract-box reader without decorative rings and with four vertical contract tabs", async () => {
  const [html, css] = await Promise.all([
    readFile(path.join(serviceContractDir, "code.html"), "utf8"),
    readFile(path.join(serviceContractDir, "styles.css"), "utf8"),
  ]);

  const firstFold = html.slice(0, html.indexOf('id="contract-summary"'));
  assert.match(firstFold, /class="contract-dossier contract-book"/);
  assert.match(firstFold, /class="contract-book__spine"[^>]*aria-hidden="true"/);
  assert.equal((firstFold.match(/class="contract-ring"/g) ?? []).length, 0);
  assert.match(firstFold, /id="full-contract"[^>]*class="contract-book__reader contract-reading"/);
  assert.match(firstFold, /role="tablist"[^>]*aria-orientation="vertical"/);
  assert.equal((firstFold.match(/data-contract-tab=/g) ?? []).length, 4);
  assert.equal((firstFold.match(/data-contract-page=/g) ?? []).length, 0);
  for (const label of ["契約與服務", "費用與付款", "責任與紀錄", "權益與簽署"]) {
    assert.match(firstFold, new RegExp(label));
  }
  assert.doesNotMatch(html, /<section class="key-clauses section"/);
  assert.equal((html.match(/\sdata-contract(?:\s|=)/g) ?? []).length, 1);
  assert.match(
    html,
    /<script type="module" src="\.\/app\.js\?v=20260816-turnkey-fee-v5-static-fallback"><\/script>/,
  );

  assert.match(
    css,
    /\.contract-book\s*\{[\s\S]*?grid-template-columns:\s*minmax\(330px,\s*36fr\)\s+58px\s+minmax\(0,\s*64fr\)/,
  );
  assert.doesNotMatch(css, /\.contract-ring(?:\s|:)/);
  assert.match(css, /\.contract-page-tab\s*\{[^}]*writing-mode:\s*vertical-rl/);
  assert.match(
    css,
    /\.contract-page-tab\[aria-selected="true"\]\s*\{[^}]*background:\s*#FF5809/,
  );
  assert.match(css, /@keyframes contract-page-enter-next/);
  assert.match(css, /@keyframes contract-page-leave-next/);
  assert.match(css, /@keyframes contract-page-enter-previous/);
  assert.match(css, /@keyframes contract-page-leave-previous/);
});

test("contract reading uses an inner scrollbar and keeps page chaining at its boundaries", async () => {
  const [html, css] = await Promise.all([
    readFile(path.join(serviceContractDir, "code.html"), "utf8"),
    readFile(path.join(serviceContractDir, "styles.css"), "utf8"),
  ]);
  assert.match(html, /href="\.\/styles\.css\?v=20260815-w2-integrated-no-cache"/);
  assert.match(css, /\.contract-book__reader\s*\{[^}]*overflow:\s*hidden/s);
  assert.match(
    css,
    /\.contract-page-deck\s*\{[^}]*overflow-y:\s*auto[^}]*overscroll-behavior-y:\s*auto/s,
  );
  assert.match(
    css,
    /@media screen and \(max-width:\s*980px\)[\s\S]*\.contract-page-deck\s*\{[^}]*height:\s*min\(/s,
  );
});

test("left book directory stays concise and owns navigation and document actions", async () => {
  const [html, css] = await Promise.all([
    readFile(path.join(serviceContractDir, "code.html"), "utf8"),
    readFile(path.join(serviceContractDir, "styles.css"), "utf8"),
  ]);
  const bookStart = html.indexOf('<div class="contract-dossier contract-book">');
  const leftPageStart = html.indexOf('<aside class="status-board contract-book__page contract-book__page--index"', bookStart);
  const spineStart = html.indexOf('<div class="contract-book__spine"', leftPageStart);
  const readerStart = html.indexOf('<section id="full-contract"', spineStart);
  const readerEnd = html.indexOf("\n          </section>", readerStart);
  const footerStart = html.indexOf('<div class="contract-book-footer"');
  const summaryStart = html.indexOf('<section id="contract-summary"', readerEnd);

  assert.notEqual(bookStart, -1);
  assert.ok(leftPageStart > bookStart, "left book page follows the book shell");
  assert.ok(footerStart > leftPageStart && footerStart < spineStart, "contract tools live on the left book page");
  assert.ok(readerStart > spineStart && readerEnd > readerStart, "right reader follows the book spine");

  const leftPage = html.slice(leftPageStart, spineStart);
  assert.match(leftPage, /<h1 id="page-title" class="contract-book__brand-title" data-contract-view-title>萊比 DRS 案件治理資訊服務契約<\/h1>/);
  assert.match(leftPage, /class="contract-page-controls"[^>]*aria-label="契約分冊切換"/);
  assert.match(leftPage, /class="dossier-actions"/);
  assert.match(leftPage, /class="availability-note"/);
  assert.doesNotMatch(leftPage, /contract-reader__intro|LAIBE · DRS SERVICE CONTRACT/);
  assert.doesNotMatch(leftPage, /這是一份供甲方閱讀|紅色底線＝|甲方服務費|閱讀方式/);
  assert.doesNotMatch(leftPage, /開始閱讀完整契約/);

  const rightReader = html.slice(readerStart, readerEnd);
  assert.doesNotMatch(rightReader, /contract-reader__intro|contract-page-controls|dossier-actions|availability-note/);
  assert.doesNotMatch(html.slice(readerEnd, summaryStart), /contract-book-footer/);
  assert.doesNotMatch(css, /\.contract-book__page--index \.contract-reader__intro\s*\{/);
  assert.match(css, /\.contract-book__page--index \.contract-book-footer\s*\{[^}]*margin-top:\s*14px/);

  const printStart = css.indexOf("@media print");
  assert.match(css.slice(printStart), /\.contract-book-footer[\s\S]*display:\s*none\s*!important/);
});

test("left book cover removes the redundant introduction and brands the formal title in restrained foil", async () => {
  const [html, css] = await Promise.all([
    readFile(path.join(serviceContractDir, "code.html"), "utf8"),
    readFile(path.join(serviceContractDir, "styles.css"), "utf8"),
  ]);

  assert.doesNotMatch(html, /合約與履約審查|輔助工作台/);
  assert.match(
    html,
    /<div class="contract-book__brand">[\s\S]*<h1 id="page-title" class="contract-book__brand-title" data-contract-view-title>萊比 DRS 案件治理資訊服務契約<\/h1>/,
  );
  assert.match(css, /--book-gold:\s*#[0-9A-F]{6}/i);
  assert.match(
    css,
    /\.contract-book \.contract-book__brand-title\s*\{[^}]*color:\s*var\(--book-gold\)[^}]*text-shadow:/s,
  );
  assert.match(
    css,
    /\.contract-book__brand\s*\{[^}]*box-shadow:[^}]*inset/s,
  );
});

test("both contract titles use the full book-cover width with balanced line breaks", async () => {
  const [html, css] = await Promise.all([
    readFile(path.join(serviceContractDir, "code.html"), "utf8"),
    readFile(path.join(serviceContractDir, "styles.css"), "utf8"),
  ]);

  assert.match(html, /styles\.css\?v=20260815-w2-integrated-no-cache/);

  assert.match(
    css,
    /\.contract-book__title-row\s*\{[^}]*position:\s*relative[^}]*display:\s*block/s,
  );
  assert.match(
    css,
    /\.contract-book \.contract-book__brand-title\s*\{[^}]*width:\s*100%[^}]*max-width:\s*none[^}]*text-wrap:\s*balance/s,
  );
  assert.match(
    css,
    /\.contract-book \.contract-book__title-row\s*>\s*span\s*\{[^}]*position:\s*absolute[^}]*right:/s,
  );
  assert.doesNotMatch(
    css,
    /\.contract-book \.contract-book__brand-title\s*\{[^}]*max-width:\s*\d+ch/s,
  );
});

test("page explains the bounded draft-review-revision-confirmation sequence without claiming it is connected", async () => {
  const html = await readFile(path.join(serviceContractDir, "code.html"), "utf8");

  assert.match(html, /甲方僅提送合約簽署草稿/);
  assert.match(html, /其餘附件由乙方於平台編輯後提送/);
  assert.match(html, /DRS 公開提出審查意見/);
  assert.match(html, /因應工程的必然不確定性，乙方得依實際調度情況調整文件版本/);
  assert.doesNotMatch(html, /協商後，乙方可不限次修訂/);
  assert.match(html, /雙方對同一版本無異議/);
  assert.match(html, /甲方最終確認後，才會進入簽署準備/);
  assert.match(html, /本頁僅說明預定流程/);
  assert.match(html, /正式接受、簽署與可追溯收據尚未開放/);
  assert.match(html, /已生效的原契約維持不變/);
  assert.match(html, /補充契約草稿/);
  assert.match(html, /DRS 退出後[\s\S]*甲乙雙方可依既有紀錄繼續協商/);
  assert.match(html, /DRS 不成為締約、簽署或付款決定人/);
});

test("contract context fails closed with complete reason-next-responsible-recovery guidance", async () => {
  const appModule = await import(moduleUrl("app.js"));
  const {
    CONTRACT_FAILURE_STATES,
    G1_CAPABILITIES,
    INITIAL_CONTRACT_CONTEXT,
    resolveContractContext,
  } = appModule;

  assert.deepEqual(G1_CAPABILITIES, {
    ownerDraftSubmission: false,
    formalAcceptance: false,
    signing: false,
    authentication: false,
    durableReceipt: false,
  });
  assert.deepEqual(INITIAL_CONTRACT_CONTEXT, {
    caseId: "",
    prerequisitesComplete: false,
    ownerVersionHash: "",
    providerVersionHash: "",
    ownerAcceptedSameVersion: false,
    providerAcceptedSameVersion: false,
    pcmReviewState: "",
  });
  assert.equal(Object.isFrozen(G1_CAPABILITIES), true);
  assert.equal(Object.isFrozen(INITIAL_CONTRACT_CONTEXT), true);

  const expectedCodes = [
    "PREREQUISITES_MISSING",
    "VERSION_MISMATCH",
    "SAME_VERSION_NOT_ACCEPTED",
    "PCM_REVIEW_PENDING",
    "CONTEXT_UNAVAILABLE",
  ];
  assert.deepEqual(Object.keys(CONTRACT_FAILURE_STATES), expectedCodes);
  assert.equal(Object.isFrozen(CONTRACT_FAILURE_STATES), true);

  for (const code of expectedCodes) {
    const state = CONTRACT_FAILURE_STATES[code];
    assert.deepEqual(Object.keys(state), ["code", "reason", "next", "responsible", "recovery"]);
    assert.equal(state.code, code);
    for (const field of ["reason", "next", "responsible", "recovery"]) {
      assert.equal(typeof state[field], "string", `${code}.${field}`);
      assert.ok(state[field].trim().length > 0, `${code}.${field}`);
    }
    assert.equal(Object.isFrozen(state), true);
  }

  const base = {
    caseId: "case-001",
    prerequisitesComplete: true,
    ownerVersionHash: FROZEN_CONTRACT_SOURCE_SHA256,
    providerVersionHash: FROZEN_CONTRACT_SOURCE_SHA256,
    ownerAcceptedSameVersion: true,
    providerAcceptedSameVersion: true,
    pcmReviewState: "PUBLISHED_RESOLVED",
  };
  const scenarios = [
    ["CONTEXT_UNAVAILABLE", INITIAL_CONTRACT_CONTEXT],
    ["PREREQUISITES_MISSING", { ...base, prerequisitesComplete: false }],
    ["VERSION_MISMATCH", { ...base, providerVersionHash: "f".repeat(64) }],
    ["SAME_VERSION_NOT_ACCEPTED", { ...base, providerAcceptedSameVersion: false }],
    ["PCM_REVIEW_PENDING", { ...base, pcmReviewState: "PUBLISHED_PENDING" }],
  ];

  assert.equal(typeof resolveContractContext, "function");
  for (const [expectedCode, context] of scenarios) {
    let result;
    assert.doesNotThrow(() => {
      result = resolveContractContext(context);
    }, expectedCode);
    assert.equal(result.readyForFinalOwnerConfirmation, false, expectedCode);
    assert.equal(result.signingEnabled, false, expectedCode);
    assert.equal(result.failure.code, expectedCode);
    assert.equal(Object.isFrozen(result), true);
  }

  const reviewComplete = resolveContractContext(base);
  assert.equal(reviewComplete.readyForFinalOwnerConfirmation, true);
  assert.equal(reviewComplete.signingEnabled, false);
  assert.equal(reviewComplete.failure, null);
});

test("hostile contract context never throws, invokes no getters and resolves to CONTEXT_UNAVAILABLE", async () => {
  const { resolveContractContext } = await import(moduleUrl("app.js"));
  let getterReads = 0;
  const accessorContext = {};
  Object.defineProperty(accessorContext, "caseId", {
    enumerable: true,
    get() {
      getterReads += 1;
      return "case-hostile";
    },
  });
  const throwingProxy = new Proxy({}, {
    getPrototypeOf() {
      throw new Error("blocked prototype read");
    },
    getOwnPropertyDescriptor() {
      throw new Error("blocked descriptor read");
    },
    get() {
      throw new Error("blocked value read");
    },
  });
  const hostileInputs = [
    null,
    undefined,
    true,
    42,
    "case-hostile",
    Symbol("case-hostile"),
    [],
    new Date(0),
    accessorContext,
    throwingProxy,
  ];

  for (const input of hostileInputs) {
    let result;
    assert.doesNotThrow(() => {
      result = resolveContractContext(input);
    });
    assert.equal(result.readyForFinalOwnerConfirmation, false);
    assert.equal(result.signingEnabled, false);
    assert.equal(result.failure.code, "CONTEXT_UNAVAILABLE");
  }
  assert.equal(getterReads, 0);
});

test("post-load intrinsic pollution cannot promote signing readiness or contract context", () => {
  const appUrl = moduleUrl("app.js", `?intrinsic-hardening=${Date.now()}`);
  const probe = `
    import {
      CONTRACT_FAILURE_STATES,
      INITIAL_CONTRACT_CONTEXT,
      INITIAL_SIGNING_ENVELOPE,
      evaluateSigningReadiness,
      resolveContractContext,
    } from ${JSON.stringify(appUrl)};
    import { CONTRACT_SOURCE_SHA256 } from ${JSON.stringify(moduleUrl("contract-content.js"))};

    const readyEnvelope = {
      contractVersionHash: CONTRACT_SOURCE_SHA256,
      placeholdersResolvedForVersionHash: CONTRACT_SOURCE_SHA256,
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
    const readyContext = {
      caseId: "case-001",
      prerequisitesComplete: true,
      ownerVersionHash: CONTRACT_SOURCE_SHA256,
      providerVersionHash: CONTRACT_SOURCE_SHA256,
      ownerAcceptedSameVersion: true,
      providerAcceptedSameVersion: true,
      pcmReviewState: "PUBLISHED_RESOLVED",
    };
    const observation = {};

    const originalPush = Array.prototype.push;
    try {
      Array.prototype.push = function () { return this.length; };
      const result = evaluateSigningReadiness(INITIAL_SIGNING_ENVELOPE);
      observation.pushNoop = {
        ready: result.ready,
        reasonCount: result.reasons.length,
      };
    } finally {
      Array.prototype.push = originalPush;
    }

    try {
      Array.prototype.push = () => { throw new Error("poisoned push"); };
      try {
        const result = evaluateSigningReadiness(INITIAL_SIGNING_ENVELOPE);
        observation.pushThrow = {
          threw: false,
          ready: result.ready,
          reasonCount: result.reasons.length,
        };
      } catch {
        observation.pushThrow = { threw: true };
      }
    } finally {
      Array.prototype.push = originalPush;
    }

    const originalIterator = Array.prototype[Symbol.iterator];
    try {
      Array.prototype[Symbol.iterator] = function* () {
        yield CONTRACT_SOURCE_SHA256;
        yield true;
        yield "owner-forged";
        yield {
          partyType: "natural_person",
          partyId: "provider-forged",
          signatoryActorId: "actor-forged",
        };
        yield true;
        yield "LEGAL_FINAL";
        yield true;
      };
      observation.iterator = {
        signingReady: evaluateSigningReadiness(INITIAL_SIGNING_ENVELOPE).ready,
        contextReady: resolveContractContext(INITIAL_CONTRACT_CONTEXT)
          .readyForFinalOwnerConfirmation,
      };
    } finally {
      Array.prototype[Symbol.iterator] = originalIterator;
    }

    const originalTrim = String.prototype.trim;
    try {
      String.prototype.trim = () => "forged-nonempty";
      observation.trim = resolveContractContext({ ...readyContext, caseId: "   " })
        .readyForFinalOwnerConfirmation;
    } finally {
      String.prototype.trim = originalTrim;
    }

    try {
      String.prototype.trim = () => { throw new Error("poisoned trim"); };
      try {
        observation.trimThrow = {
          threw: false,
          validReady: resolveContractContext({ ...readyContext, caseId: "case-001" })
            .readyForFinalOwnerConfirmation,
          blankReady: resolveContractContext({ ...readyContext, caseId: "   " })
            .readyForFinalOwnerConfirmation,
        };
      } catch {
        observation.trimThrow = { threw: true };
      }
    } finally {
      String.prototype.trim = originalTrim;
    }

    const originalGetPrototypeOf = Object.getPrototypeOf;
    const originalGetOwnPropertyDescriptor = Object.getOwnPropertyDescriptor;
    const originalHasOwn = Object.hasOwn;
    const originalFreeze = Object.freeze;
    const originalReflectApply = Reflect.apply;
    try {
      Object.getPrototypeOf = () => { throw new Error("poisoned getPrototypeOf"); };
      Object.getOwnPropertyDescriptor = () => { throw new Error("poisoned descriptor"); };
      Object.hasOwn = () => { throw new Error("poisoned hasOwn"); };
      Object.freeze = () => { throw new Error("poisoned freeze"); };
      Reflect.apply = () => { throw new Error("poisoned Reflect.apply"); };
      try {
        observation.objectReflect = {
          threw: false,
          signingReady: evaluateSigningReadiness(readyEnvelope).ready,
          contextReady: resolveContractContext(readyContext).readyForFinalOwnerConfirmation,
          emptyContextFailure: resolveContractContext(INITIAL_CONTRACT_CONTEXT).failure.code,
        };
      } catch {
        observation.objectReflect = { threw: true };
      }
    } finally {
      Object.getPrototypeOf = originalGetPrototypeOf;
      Object.getOwnPropertyDescriptor = originalGetOwnPropertyDescriptor;
      Object.hasOwn = originalHasOwn;
      Object.freeze = originalFreeze;
      Reflect.apply = originalReflectApply;
    }

    observation.expectedFailure = CONTRACT_FAILURE_STATES.CONTEXT_UNAVAILABLE.code;
    process.stdout.write(JSON.stringify(observation));
  `;
  const observation = JSON.parse(execFileSync(
    process.execPath,
    ["--input-type=module", "--eval", probe],
    { encoding: "utf8", cwd: packageRoot },
  ));

  assert.equal(observation.pushNoop.ready, false);
  assert.ok(observation.pushNoop.reasonCount > 0);
  assert.equal(observation.pushThrow.threw, false);
  assert.equal(observation.pushThrow.ready, false);
  assert.ok(observation.pushThrow.reasonCount > 0);
  assert.deepEqual(observation.iterator, {
    signingReady: false,
    contextReady: false,
  });
  assert.equal(observation.trim, false);
  assert.deepEqual(observation.trimThrow, {
    threw: false,
    validReady: true,
    blankReady: false,
  });
  assert.deepEqual(observation.objectReflect, {
    threw: false,
    signingReady: true,
    contextReady: true,
    emptyContextFailure: observation.expectedFailure,
  });
});

class TestElement {
  constructor(tagName) {
    this.tagName = tagName.toUpperCase();
    this.children = [];
    this.attributes = new Map();
    this.listeners = new Map();
    this.className = "";
    this.disabled = false;
    this.href = "";
    this.id = "";
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

  activate(type = "click") {
    this.listeners.get(type)?.();
  }
}

class TestDocument {
  constructor(nodes) {
    this.nodes = nodes;
  }

  createElement(tagName) {
    return new TestElement(tagName);
  }

  querySelector(selector) {
    return this.nodes.get(selector) ?? null;
  }
}

test("complete DOM renders every frozen heading and print works while signing stays disabled", async () => {
  const { CONTRACT_SOURCE, formatContractPresentationText } = await import(
    moduleUrl("contract-content.js")
  );
  const nodes = new Map([
    ["[data-contract]", new TestElement("article")],
    ["[data-readiness-list]", new TestElement("ol")],
    ["[data-sign-button]", new TestElement("button")],
    ["[data-readiness-summary]", new TestElement("p")],
    ["[data-print-button]", new TestElement("button")],
    ["[data-lifecycle]", new TestElement("span")],
    ["[data-service-fee-summary]", new TestElement("dd")],
  ]);
  nodes.get("[data-sign-button]").disabled = true;
  let printCalls = 0;
  const previousDocument = globalThis.document;
  const previousWindow = globalThis.window;
  globalThis.document = new TestDocument(nodes);
  globalThis.window = {
    print() {
      printCalls += 1;
    },
  };

  try {
    await import(moduleUrl("app.js", `?dom=${Date.now()}`));
    const expectedHeadings = CONTRACT_SOURCE.split("\n")
      .filter((line) => /^(#{1,3})\s+/.test(line))
      .map((line) => formatContractPresentationText(line.replace(/^(#{1,3})\s+/, "")));
    const descendants = [];
    const collect = (element) => {
      for (const child of element.children) {
        descendants.push(child);
        collect(child);
      }
    };
    const contractBodies = [];
    for (const panel of nodes.get("[data-contract]").children) {
      for (const child of panel.children) {
        if (child.className === "contract-part__body") contractBodies.push(child);
      }
    }
    for (const body of contractBodies) collect(body);
    const renderedHeadings = descendants
      .filter((element) => /^H[2-4]$/.test(element.tagName))
      .map((element) => element.textContent);

    assert.deepEqual(renderedHeadings, expectedHeadings);
    assert.equal(
      nodes.get("[data-contract]").children.filter(
        (element) => element.getAttribute("role") === "tabpanel",
      ).length,
      4,
    );
    assert.equal(
      nodes.get("[data-lifecycle]").textContent,
      "v0.5 法務審閱稿 · 尚未進入簽署",
    );
    assert.equal(
      nodes.get("[data-service-fee-summary]").textContent,
      "DRS 統包審查服務費＝設計費 × 10%＋工程款 × 3.5%；兩項計價基準與 DRS 付款節點分開列示。",
    );
    assert.equal(nodes.get("[data-sign-button]").disabled, true);
    assert.equal(nodes.get("[data-sign-button]").getAttribute("aria-disabled"), "true");
    nodes.get("[data-print-button]").activate();
    assert.equal(printCalls, 1);
  } finally {
    if (previousDocument === undefined) delete globalThis.document;
    else globalThis.document = previousDocument;
    if (previousWindow === undefined) delete globalThis.window;
    else globalThis.window = previousWindow;
  }
});

test("print stylesheet emits only the complete contract and readiness notice", async () => {
  const css = await readFile(path.join(serviceContractDir, "styles.css"), "utf8");
  const printStart = css.indexOf("@media print");
  assert.notEqual(printStart, -1);
  const printCss = css.slice(printStart);

  assert.match(printCss, /@page\s*\{[^}]*size:\s*A4/);
  assert.match(printCss, /\.contract-paper\s*\{[^}]*box-shadow:\s*none/);
  assert.match(printCss, /\.contract-paper p\s*\{[^}]*break-inside:\s*avoid/);
  assert.match(printCss, /\.contract-reading\s*\{[^}]*padding-top:\s*0/);
  assert.match(printCss, /\.contract-page-panel\s*\{[^}]*display:\s*block\s*!important/);
  assert.match(printCss, /\.contract-book__spine[\s\S]*display:\s*none\s*!important/);
  assert.match(printCss, /\.site-header[\s\S]*display:\s*none\s*!important/);
  assert.doesNotMatch(printCss, /\.contract-paper[^}]*display:\s*none/);
});

test("200% reflow uses compact decision spacing before the mobile header breakpoint", async () => {
  const css = await readFile(path.join(serviceContractDir, "styles.css"), "utf8");
  const compactStart = css.indexOf("@media (max-width: 700px)");
  const mobileStart = css.indexOf("@media (max-width: 620px)");
  assert.notEqual(compactStart, -1);
  assert.ok(compactStart < mobileStart);
  const compactCss = css.slice(compactStart, mobileStart);

  assert.match(compactCss, /\.contract-scene\s*\{[^}]*padding:\s*20px 0 46px/);
  assert.match(compactCss, /\.contract-dossier\s*\{[^}]*padding:\s*12px/);
  assert.match(compactCss, /\.status-board\s*\{[^}]*padding:\s*18px/);
  assert.match(compactCss, /\.status-list div\s*\{[^}]*padding:\s*8px 0/);
});

test("contract section anchors clear the sticky header on desktop and mobile", async () => {
  const css = await readFile(path.join(serviceContractDir, "styles.css"), "utf8");
  assert.match(
    css,
    /\.contract-paper h2,\s*\.contract-paper h3,\s*\.contract-paper h4\s*\{[^}]*scroll-margin-top:\s*104px/,
  );

  const mobileStart = css.indexOf("@media (max-width: 620px)");
  const mobileEnd = css.indexOf("@media", mobileStart + 1);
  const mobileCss = css.slice(mobileStart, mobileEnd);
  assert.match(
    mobileCss,
    /\.contract-paper h2,\s*\.contract-paper h3,\s*\.contract-paper h4\s*\{[^}]*scroll-margin-top:\s*214px/,
  );
});
