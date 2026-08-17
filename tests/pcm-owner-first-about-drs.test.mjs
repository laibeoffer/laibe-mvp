import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import test from "node:test";

const repositoryRoot = new URL("../", import.meta.url);
const pcmRoot = new URL("src/stitch_laibe_landing_onboarding/pcm_standalone/", repositoryRoot);
const aboutRoot = new URL("about_drs/", pcmRoot);
const aboutHtmlUrl = new URL("code.html", aboutRoot);
const aboutCssUrl = new URL("styles.css", aboutRoot);
const homeHtmlUrl = new URL("public_home/code.html", pcmRoot);
const routeManifestUrl = new URL("public/pcm-flow-route-manifest.js", pcmRoot);

async function source(url) {
  return existsSync(url) ? readFile(url, "utf8") : "";
}

function visibleText(html) {
  return html
    .replace(/<script\b[\s\S]*?<\/script>/giu, " ")
    .replace(/<style\b[\s\S]*?<\/style>/giu, " ")
    .replace(/<[^>]+>/gu, " ")
    .replace(/\s+/gu, " ")
    .trim();
}

function canonicalLinkHref(routeManifest, linkId) {
  const match = routeManifest.match(new RegExp(`id: "${linkId}"[\\s\\S]*?relativeHref: "([^"]+)"`));
  assert.ok(match, `missing canonical link: ${linkId}`);
  return match[1];
}

test("about DRS page is a complete local public route with a beginner-first DRS shell", async () => {
  const [html, css, home, routeManifest] = await Promise.all([source(aboutHtmlUrl), source(aboutCssUrl), source(homeHtmlUrl), source(routeManifestUrl)]);
  const headerHomeHref = canonicalLinkHref(routeManifest, "aboutDrsHeaderHomeToHome");
  const startDocumentCheckHref = canonicalLinkHref(routeManifest, "aboutDrsHeaderStartDocumentCheckToQuoteCheck");

  assert.ok(html.length > 0, "missing about DRS page");
  assert.ok(css.length > 0, "missing about DRS styles");
  assert.match(html, /<html\s+lang="zh-Hant"/u);
  assert.match(html, /Decision\s*&amp;\s*Record\s*System/u);
  assert.match(html, /先把裝修資料核對清楚，再由你決定下一步。/u);
  assert.match(html, /DRS 是甲方委託使用的裝修書面資料核對與決策留痕系統/u);
  assert.match(html, /專業的事，讓專業彼此核對；重要的決定，由你來做/u);
  assert.match(html, /class="about-header"/u);
  assert.match(html, /<a class="about-brand" href="\.\.\/public_home\/code\.html#top" aria-label="LaiBE DRS 首頁">/u);
  assert.match(html, /<span(?=[^>]*class="[^"]*is-active[^"]*")(?=[^>]*aria-current="page")[^>]*>關於 DRS<\/span>/u);
  assert.doesNotMatch(html, /<a[^>]*aria-current="page"/u);
  assert.doesNotMatch(html, /<a\b[^>]*>\s*關於 DRS\s*<\/a>/u);
  assert.equal(headerHomeHref, "../public_home/code.html#top");
  assert.ok(html.includes(`<a class="about-header__home" href="${headerHomeHref}">DRS 首頁</a>`));
  assert.equal(startDocumentCheckHref, "../quote_check/code.html?mode=quote#document-workspace");
  assert.ok(html.includes(`<a class="about-header__cta" href="${startDocumentCheckHref}">開始文件健檢</a>`));
  assert.match(html, /返回 DRS 首頁/u);
  assert.match(home, /<a class="header-action header-action--context" href="\.\.\/about_drs\/code\.html">關於 DRS<\/a>/u);
  assert.match(css, /\.about-brand\s*\{[^}]*min-block-size:\s*44px/su);
});

test("about DRS puts the definition, outcomes, collaboration, and service boundaries in decision order", async () => {
  const html = await source(aboutHtmlUrl);

  for (const copy of [
    "差異與缺漏清單",
    "決策影響整理",
    "案件紀錄",
    "乙方提出專業內容與文件",
    "DRS 核對差異、缺漏與影響",
    "甲方掌握結果並作最後決定",
    "付款時間到了，但完成依據還不清楚",
    "總價看得到，項目、數量與計價方式卻對不起來",
    "這筆追加是新增工作，還是原本就該包含",
    "封板前，照片是否足以對回約定工項",
    "目前進度落後，可能影響哪個下一階段",
    "決定作成後，版本、回覆與責任如何留下來",
    "DRS 的服務邊界",
    "不單方面修改甲乙雙方合約",
    "不保證施工品質、最低價格或如期完工",
    "不收受、不保管，也不分配甲乙雙方的工程款項。",
    "讓每一次裝修決策都有依據，讓每一段案件過程都有紀錄。",
  ]) {
    assert.match(html, new RegExp(copy.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&"), "u"));
  }
  assert.equal((html.match(/data-drs-outcome=/gu) ?? []).length, 3);
  assert.equal((html.match(/data-collaboration-role=/gu) ?? []).length, 3);
  assert.equal((html.match(/data-drs-service=/gu) ?? []).length, 6);
  assert.ok(
    html.indexOf("DRS 是甲方委託使用的裝修書面資料核對與決策留痕系統") < html.indexOf("專業的事，讓專業彼此核對；重要的決定，由你來做"),
    "the beginner definition must appear before the brand promise",
  );
  assert.ok(html.indexOf("差異與缺漏清單") < html.indexOf("為什麼叫 Decision &amp; Record System"));
});

test("about DRS explains the truthful document-check start before asking owners to act", async () => {
  const html = await source(aboutHtmlUrl);

  for (const copy of [
    "報價、契約或施工圖都可以先開始，不必一次備齊",
    "不用先註冊，也不會通知乙方",
    "放入手邊任一份資料",
    "先看待確認問題",
    "再由甲方決定下一步",
    "本次瀏覽暫時檢視，尚未保存",
  ]) {
    assert.match(html, new RegExp(copy.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&"), "u"));
  }
  assert.equal((html.match(/data-start-step=/gu) ?? []).length, 3);
  assert.equal((html.match(/>開始文件健檢</gu) ?? []).length, 2);
});

test("about DRS excludes unsupported claims and preserves the restrained public visual system", async () => {
  const [html, css] = await Promise.all([source(aboutHtmlUrl), source(aboutCssUrl)]);
  const text = visibleText(html);

  for (const forbidden of ["PCM", "AI PCM", "招標", "投標", "競標", "決標", "金流託管", "代收代付", "老屋", "投資", "保證最低價", "保證如期完工", "現場監工服務"]) {
    assert.doesNotMatch(text, new RegExp(forbidden, "u"));
  }
  assert.doesNotMatch(html, /href="#"/u);
  assert.match(css, /#ff5809/iu);
  assert.match(css, /#0[3-9][0-9a-f]{3,5}/iu);
  assert.match(css, /@media\s*\(max-width:\s*760px\)/u);
  assert.match(css, /@media\s*\(max-width:\s*440px\)/u);
  assert.match(css, /overflow-x:\s*(?:clip|hidden)/u);
  assert.match(css, /:focus-visible/u);
  assert.doesNotMatch(css, /\.about-services\s+li:nth-child\(3\)/u);
  assert.match(css, /\.about-header__cta[^}]*min-block-size:\s*44px/su);
});
