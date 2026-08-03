import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const pageRoot = new URL(
  "../src/stitch_laibe_landing_onboarding/pcm_standalone/public_home/",
  import.meta.url,
);
const htmlUrl = new URL("code.html", pageRoot);
const cssUrl = new URL("styles.css", pageRoot);
const appUrl = new URL("app.js", pageRoot);
const governanceUrl = new URL(
  "../docs/governance/pcm-owner-first-execution-manifest.v1.json",
  import.meta.url,
);

test("homepage follows the seven-section owner decision hierarchy", async () => {
  const html = await readFile(htmlUrl, "utf8");
  const ids = [
    "hero",
    "application-check",
    "pcm-scope",
    "result-example",
    "case-flow",
    "service-fee",
    "final-action",
  ];
  const positions = ids.map((id) => html.indexOf(`id="${id}"`));

  assert.ok(positions.every((position) => position >= 0));
  assert.deepEqual(positions, [...positions].sort((a, b) => a - b));
  assert.match(html, /PCM 是甲方的決策顧問/);
  assert.match(html, /給已取得乙方報價與施工圖的甲方/);
  assert.match(html, /先過濾差異與缺漏/);
  assert.match(html, /查看申請與文件準備/);
});

test("qualification appears beside the conversion path with three plain checks", async () => {
  const html = await readFile(htmlUrl, "utf8");
  const section = html.match(
    /<section id="application-check"[\s\S]*?<\/section>/,
  )?.[0] ?? "";

  assert.equal((section.match(/data-qualification-item/g) ?? []).length, 3);
  assert.match(section, /已取得乙方報價單 PDF/);
  assert.match(section, /已取得施工圖 PDF，至少包含平面圖/);
  assert.match(section, /希望先確認文件差異、缺漏與待釐清事項/);
});

test("homepage explains five PCM checks without asking the owner to infer the answer", async () => {
  const html = await readFile(htmlUrl, "utf8");
  const section = html.match(
    /<section id="pcm-scope"[\s\S]*?<\/section>/,
  )?.[0] ?? "";

  assert.equal((section.match(/data-pcm-check/g) ?? []).length, 5);
  for (const phrase of [
    "報價與圖說是否使用同一施工範圍",
    "是否有漏列、重複或說法不一致",
    "追加或變更前",
    "驗收及付款前",
    "甲方、乙方或 PCM 接續處理",
  ]) {
    assert.match(section, new RegExp(phrase));
  }
});

test("result example is explicitly synthetic and includes every decision fact", async () => {
  const html = await readFile(htmlUrl, "utf8");
  const section = html.match(
    /<section id="result-example"[\s\S]*?<\/section>/,
  )?.[0] ?? "";

  assert.match(section, /格式示意，非真實案件/);
  for (const label of [
    "引用版本",
    "已確認內容",
    "差異與缺漏",
    "仍不確定事項",
    "建議下一步",
    "下一責任人",
    "案件紀錄",
  ]) {
    assert.match(section, new RegExp(label));
  }
  assert.doesNotMatch(section, /王小明|陳先生|NT\$|\d{4}\/\d{1,2}\/\d{1,2}/);
});

test("visible service flow has four stages and old six-step details are non-rendering compatibility evidence", async () => {
  const html = await readFile(htmlUrl, "utf8");
  const section = html.match(/<section id="case-flow"[\s\S]*?<\/section>/)?.[0] ?? "";

  assert.deepEqual(
    [...section.matchAll(/data-home-stage="([1-4])"/g)].map((match) => match[1]),
    ["1", "2", "3", "4"],
  );
  for (const phrase of [
    "準備報價與圖說",
    "取得基本檢討結果",
    "決定是否申請正式 PCM 服務",
    "進入案件治理與紀錄",
  ]) {
    assert.match(section, new RegExp(phrase));
  }
  assert.match(html, /class="same-fact-rail"[^>]*hidden/);
  assert.match(section, /class="flow-list"[^>]*hidden/);
});

test("three canonical entry controls stay explicit and non-clickable while planned", async () => {
  const html = await readFile(htmlUrl, "utf8");

  for (const [route, label] of [
    ["quoteCheck", "查看報價健檢"],
    ["drawingCheck", "查看圖說檢討"],
    ["accountAccess", "註冊／登入"],
  ]) {
    const control = html.match(
      new RegExp(`<a\\b(?=[^>]*data-route="${route}")[^>]*>[\\s\\S]*?${label}[\\s\\S]*?<\\/a>`),
    )?.[0] ?? "";
    assert.match(control, /aria-disabled="true"/);
    assert.match(control, /data-route-state="planned"/);
    assert.doesNotMatch(control, /\shref=/);
  }
});

test("header exposes a visible shared account entry through the existing safe status source", async () => {
  const html = await readFile(htmlUrl, "utf8");
  const header = html.match(/<header\b[\s\S]*?<\/header>/)?.[0] ?? "";
  const accountEntry = header.match(
    /<a\b(?=[^>]*data-account-entry)(?=[^>]*data-canonical-route="\/account\/access")(?=[^>]*href="\.\.\/account_service_status\/code\.html")[^>]*>[\s\S]*?註冊／登入[\s\S]*?<\/a>/,
  )?.[0] ?? "";

  assert.notEqual(accountEntry, "");
  assert.doesNotMatch(accountEntry, /aria-disabled="true"|tabindex="-1"/);
  await access(new URL("../account_service_status/code.html", htmlUrl));
});

test("mobile header keeps account and decision actions without stacking secondary anchors", async () => {
  const css = await readFile(cssUrl, "utf8");

  assert.match(
    css,
    /@media\s*\(max-width:\s*620px\)[\s\S]*?\.site-header nav\s*>\s*a:nth-child\(-n\s*\+\s*3\)\s*\{[^}]*display:\s*none;/,
  );
  assert.match(
    css,
    /@media\s*\(max-width:\s*620px\)[\s\S]*?\.site-header nav\s*>\s*a:nth-child\(5\)\s*\{[^}]*grid-column:\s*auto;/,
  );
});

test("route binding activates only routes with a real href", async () => {
  const { bindPublicRoutes } = await import(`${appUrl.href}?bind=${Date.now()}`);
  const makeControl = (route) => ({
    dataset: { route },
    attributes: new Map(),
    setAttribute(name, value) { this.attributes.set(name, String(value)); },
    removeAttribute(name) { this.attributes.delete(name); },
    getAttribute(name) { return this.attributes.get(name) ?? null; },
  });
  const planned = makeControl("quoteCheck");
  const active = makeControl("serviceContract");
  const root = { querySelectorAll: () => [planned, active] };

  bindPublicRoutes(root, {
    quoteCheck: null,
    serviceContract: "../service_contract/code.html",
  });

  assert.equal(planned.getAttribute("href"), null);
  assert.equal(planned.getAttribute("aria-disabled"), "true");
  assert.equal(planned.getAttribute("tabindex"), "-1");
  assert.equal(planned.dataset.routeState, "planned");
  assert.equal(active.getAttribute("href"), "../service_contract/code.html");
  assert.equal(active.getAttribute("aria-disabled"), null);
  assert.equal(active.getAttribute("tabindex"), null);
  assert.equal(active.dataset.routeState, "active");
});

test("route binding rejects inherited, non-string, non-local, and unknown href values", async () => {
  const { bindPublicRoutes } = await import(`${appUrl.href}?closed=${Date.now()}`);
  const makeControl = (route) => ({
    dataset: { route },
    attributes: new Map(),
    setAttribute(name, value) { this.attributes.set(name, String(value)); },
    removeAttribute(name) { this.attributes.delete(name); },
    getAttribute(name) { return this.attributes.get(name) ?? null; },
  });
  const cases = [
    { control: makeControl("quoteCheck"), routes: Object.create({ quoteCheck: "javascript:alert(1)" }) },
    { control: makeControl("quoteCheck"), routes: { quoteCheck: "javascript:alert(1)" } },
    { control: makeControl("quoteCheck"), routes: { quoteCheck: { href: "../quote_check/code.html" } } },
    { control: makeControl("quoteCheck"), routes: { quoteCheck: " ../quote_check/code.html" } },
    { control: makeControl("unknownRoute"), routes: { serviceContract: "../service_contract/code.html" } },
  ];

  for (const item of cases) {
    bindPublicRoutes({ querySelectorAll: () => [item.control] }, item.routes);
    assert.equal(item.control.getAttribute("href"), null);
    assert.equal(item.control.getAttribute("aria-disabled"), "true");
    assert.equal(item.control.dataset.routeState, "planned");
  }
});

test("footer links only to visible owner-first sections", async () => {
  const html = await readFile(htmlUrl, "utf8");
  const footer = html.match(/<footer\b[\s\S]*?<\/footer>/)?.[0] ?? "";

  assert.match(footer, /href="#case-flow"[^>]*>\s*服務流程\s*<\/a>/);
  assert.match(footer, /href="#service-fee"[^>]*>\s*費用與服務邊界\s*<\/a>/);
  assert.match(html, /<section\s+id="case-flow"/);
  assert.match(html, /<section\s+id="service-fee"/);
});

test("T2 evidence distinguishes current exact-five writes from the authorized historical hold", async () => {
  const manifest = JSON.parse(await readFile(governanceUrl, "utf8"));

  assert.equal(manifest.t2.outsideWriteSet, 0);
  assert.equal(manifest.t2.outsideWriteSetScope, "current_repository_git_diff_only");
  assert.equal(manifest.t2.recovery.currentWrite, false);
  assert.equal(manifest.t2.recovery.classification, "authorized_historical_external_hold");
});

test("fee, boundaries, final actions, local links, and accessible control floors remain truthful", async () => {
  const html = await readFile(htmlUrl, "utf8");
  const css = await readFile(cssUrl, "utf8");
  const visibleText = html.replace(/<[^>]+>/g, "").replace(/\s+/g, " ");

  assert.match(html, /費用以正式 PCM 服務契約所載版本為準/);
  assert.doesNotMatch(visibleText, /canonical/i);
  assert.match(visibleText, /PCM 不保管工程款/);
  assert.match(visibleText, /不提供金流託管、代收代付或付款保障/);
  assert.match(html, /PCM 協助核對與整理，不取代甲方作最後決定/);
  assert.match(html, /不取代設計師、統包或施工單位履行專業責任/);
  assert.match(html, /正式權利義務以服務契約為準/);
  assert.match(html, /id="final-action"[\s\S]*查看申請與文件準備[\s\S]*閱讀 PCM 服務契約/);
  assert.match(html, /\.\.\/shared\/owner-first-shell\.css/);
  const entryMinimum = css.match(
    /\.entry-choice\s*\{[^}]*min-height:\s*(\d+)px/,
  );
  assert.ok(Number(entryMinimum?.[1]) >= 44);
  assert.match(css, /@media\s*\(max-width:\s*768px\)/);
  assert.match(css, /@media\s*\(max-width:\s*420px\)/);

  for (const href of [...html.matchAll(/href="([^"]+)"/g)].map((match) => match[1])) {
    if (href.startsWith("#")) {
      assert.match(html, new RegExp(`id="${href.slice(1)}"`));
      continue;
    }
    await access(new URL(href.split("#")[0], htmlUrl));
  }
});
