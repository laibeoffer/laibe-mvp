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
  assert.match(html, /關於 LaiBE DRS｜屋主的裝修決策與案件紀錄系統/u);
  assert.match(html, /給屋主的裝修決策與案件紀錄系統。/u);
  assert.match(html, /LaiBE DRS（Decision &amp; Record System）是給屋主（甲方）使用的裝修決策與案件紀錄系統/u);
  assert.match(html, /最後仍由你決定/u);
  assert.match(html, /class="about-header"/u);
  assert.match(html, /<a class="about-brand" href="\.\.\/public_home\/code\.html#top" aria-label="LaiBE DRS 首頁">/u);
  assert.match(html, /<span(?=[^>]*class="[^"]*is-active[^"]*")(?=[^>]*aria-current="page")[^>]*>關於 DRS<\/span>/u);
  assert.doesNotMatch(html, /<a[^>]*aria-current="page"/u);
  assert.doesNotMatch(html, /<a\b[^>]*>\s*關於 DRS\s*<\/a>/u);
  assert.equal(headerHomeHref, "../public_home/code.html#top");
  assert.ok(html.includes(`<a class="about-header__home" href="${headerHomeHref}">DRS 首頁</a>`));
  assert.equal(startDocumentCheckHref, "../quote_check/code.html?mode=quote#document-workspace");
  assert.ok(html.includes(`<a class="about-header__cta" href="${startDocumentCheckHref}">查看文件健檢開放狀態</a>`));
  assert.match(html, /<a class="about-cta__primary about-hero__cta" href="\.\.\/quote_check\/code\.html">/u);
  assert.match(html, /返回 DRS 首頁/u);
  assert.match(home, /<a class="header-action header-action--context header-action--about" href="\.\.\/about_drs\/code\.html">關於 DRS<\/a>/u);
  assert.match(css, /\.about-brand\s*\{[^}]*min-block-size:\s*44px/su);
});

test("about DRS puts the definition, outcomes, collaboration, and service boundaries in decision order", async () => {
  const html = await source(aboutHtmlUrl);

  for (const copy of [
    "DRS 是什麼",
    "正式案件會整理哪些結果",
    "差異與缺漏清單",
    "風險與決策影響",
    "可追溯的案件紀錄",
    "你、設計師／統包與 LaiBE DRS 如何分工",
    "設計師／統包",
    "DRS 系統與 DRS／AI DRS",
    "你（甲方）",
    "哪些裝修節點適合使用",
    "裝修前",
    "比較與簽約前",
    "施工中到驗收結案",
    "DRS 的服務邊界",
    "不替你作最終決定",
    "不保證施工品質、最低價格、零風險或如期完工",
    "不收受、保管或分配你與設計師／統包之間的工程款項",
    "讓每一次裝修決策都有依據，讓每一段案件過程都有紀錄。",
  ]) {
    assert.match(html, new RegExp(copy.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&"), "u"));
  }
  assert.equal((html.match(/data-drs-outcome=/gu) ?? []).length, 3);
  assert.equal((html.match(/data-collaboration-role=/gu) ?? []).length, 3);
  assert.equal((html.match(/data-drs-service=/gu) ?? []).length, 3);
  assert.equal((html.match(/<details class="about-accordion__item"/gu) ?? []).length, 6);
  assert.ok(html.indexOf("DRS 是什麼") < html.indexOf("正式案件會整理哪些結果"));
  assert.ok(html.indexOf("正式案件會整理哪些結果") < html.indexOf("你、設計師／統包與 LaiBE DRS 如何分工"));
  assert.ok(html.indexOf("哪些裝修節點適合使用") < html.indexOf("DRS 的服務邊界"));
});

test("about DRS explains the truthful document-check start before asking owners to act", async () => {
  const html = await source(aboutHtmlUrl);

  for (const copy of [
    "目前如何查看文件健檢開放狀態",
    "目前只有報價 PDF 會在瀏覽器本機讀取文字層並產生解析摘要",
    "只讀取未加密、未壓縮且含文字層的報價 PDF",
    "檔案不會上傳或保存",
    "不會對掃描檔執行 OCR",
    "這不是案件正式報告",
    "契約與施工圖仍只顯示入口狀態",
    "重新整理或離開後，本次結果就會消失",
    "不會通知設計師／統包",
  ]) {
    assert.match(html, new RegExp(copy.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&"), "u"));
  }
  assert.equal((html.match(/data-start-step=/gu) ?? []).length, 3);
  assert.equal((html.match(/>查看文件健檢開放狀態</gu) ?? []).length, 3);
});

test("about DRS excludes unsupported claims and preserves the restrained public visual system", async () => {
  const [html, css] = await Promise.all([source(aboutHtmlUrl), source(aboutCssUrl)]);
  const text = visibleText(html);
  const productGuardrails = [
    "LaiBE DRS 不是裝修媒合、低價競標、聊天工具或雲端硬碟",
    "不保證施工品質、最低價格、零風險或如期完工",
  ];

  for (const guardrail of productGuardrails) {
    assert.match(text, new RegExp(guardrail.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&"), "u"));
  }

  const claimsOnly = productGuardrails.reduce((copy, guardrail) => copy.replace(guardrail, ""), text);

  for (const forbidden of [
    "PCM",
    "AI PCM",
    "招標",
    "投標",
    "決標",
    "金流託管",
    "代收代付",
    "老屋",
    "投資",
    "低價競標",
    "低價競標平台",
    "最低價",
    "保證",
    "現場監工服務",
    "DB",
    "API",
    "n8n",
    "GitHub truth",
    "source clean",
    "debug",
    "mock-only",
    "本機候選",
    "raw JSON",
    "stack trace",
  ]) {
    assert.doesNotMatch(claimsOnly, new RegExp(forbidden, "iu"));
  }
  assert.doesNotMatch(html, /href="#"/u);
  assert.match(css, /--about-orange:\s*#ff6b1a/iu);
  assert.match(css, /#0[3-9][0-9a-f]{3,5}/iu);
  assert.match(css, /@media\s*\(max-width:\s*900px\)/u);
  assert.match(css, /@media\s*\(max-width:\s*700px\)/u);
  assert.match(css, /@media\s*\(max-width:\s*390px\)/u);
  assert.match(css, /overflow-x:\s*(?:clip|hidden)/u);
  assert.match(css, /:focus-visible/u);
  assert.match(css, /\.about-accordion__item/u);
  assert.match(css, /\.about-accordion__summary/u);
  assert.match(css, /\.about-header__cta[^}]*min-block-size:\s*44px/su);
});
