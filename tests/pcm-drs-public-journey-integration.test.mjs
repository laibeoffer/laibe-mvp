import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const srcRoot = resolve(repoRoot, "src/stitch_laibe_landing_onboarding");
const pcmRoot = resolve(srcRoot, "pcm_standalone");

const paths = Object.freeze({
  publicHome: resolve(pcmRoot, "public_home/code.html"),
  quoteCheck: resolve(pcmRoot, "quote_check/code.html"),
  basicReport: resolve(pcmRoot, "basic_report/code.html"),
  caseSummary: resolve(pcmRoot, "case_summary/code.html"),
  caseSummaryApp: resolve(pcmRoot, "case_summary/app.js"),
  ownerStart: resolve(pcmRoot, "owner_start/code.html"),
  ownerStartCss: resolve(pcmRoot, "owner_start/styles.css"),
  accountAccess: resolve(pcmRoot, "account_access/code.html"),
  accountAccessApp: resolve(pcmRoot, "account_access/app.js"),
  ownerWorkspace: resolve(srcRoot, "client_awarding_dashboard/code.html"),
  ownerWorkspaceApp: resolve(srcRoot, "client_awarding_dashboard/app.js"),
});

function visibleText(markup) {
  return markup.replace(/<[^>]+>/gu, " ").replace(/\s+/gu, " ");
}

test("public journey reaches standalone account access without inventing persistence", async () => {
  const [quote, report, summaryApp, account, accountApp] = await Promise.all([
    readFile(paths.quoteCheck, "utf8"),
    readFile(paths.basicReport, "utf8"),
    readFile(paths.caseSummaryApp, "utf8"),
    readFile(paths.accountAccess, "utf8"),
    readFile(paths.accountAccessApp, "utf8"),
  ]);

  assert.match(quote, /href="\.\.\/basic_report\/code\.html"[^>]*>[^<]*查看基本報告範例/u);
  assert.match(report, /基本報告範例/u);
  assert.match(report, /閱讀指南/u);
  assert.match(report, /href="\.\.\/case_summary\/code\.html"[^>]*>[\s\S]*開始 2 分鐘案件摘要/u);
  assert.doesNotMatch(report, /本案報告|基本報告尚未發布|已完成個別分析/u);

  assert.match(summaryApp, /\.\.\/account_access\/code\.html\?/u);
  assert.doesNotMatch(summaryApp, /localStorage|sessionStorage/u);
  assert.match(account, /data-account-form="register"/u);
  assert.match(account, /data-account-form="login"/u);
  assert.match(account, /帳號功能正式開放後，會提供完整操作入口/u);
  assert.match(account, /目前不會建立帳號或傳送資料/u);
  assert.doesNotMatch(account, /data-browsing-draft|本次瀏覽草稿|註冊後準備工作台預覽/u);
  assert.doesNotMatch(accountApp, /URLSearchParams|client_awarding_dashboard|localStorage|sessionStorage/u);
});

test("account copy is PCM-free while public home keeps the approved contextual comparison hidden from the legacy rail", async () => {
  const [home, account] = await Promise.all([
    readFile(paths.publicHome, "utf8"),
    readFile(paths.accountAccess, "utf8"),
  ]);
  const accountText = visibleText(account);

  assert.doesNotMatch(accountText, /PCM|workspace|工作台/u);
  assert.match(home, /<span>在公共工程上，有PCM替政府審查專業流程。<\/span>/u);
  assert.match(home, /<span>在裝潢市場上，DRS系統是你做出決策的底氣。<\/span>/u);
  assert.match(home, /<div class="same-fact-rail" hidden/u);
  assert.match(account, /帳號功能正式開放後，會提供完整操作入口/u);
  assert.match(account, /目前不會建立帳號或傳送資料/u);
});

test("public home no longer requests the missing hero SVG", async () => {
  const home = await readFile(paths.publicHome, "utf8");
  assert.doesNotMatch(home, /d_rs_03_compact_d0e0e3\.svg/u);

  for (const path of Object.values(paths)) {
    assert.equal(existsSync(path), true, `${path} must exist`);
  }
});

test("public home omits rejected guest guidance and external contract copy hides internal enums", async () => {
  const [home, contract] = await Promise.all([
    readFile(paths.publicHome, "utf8"),
    readFile(resolve(pcmRoot, "service_contract/code.html"), "utf8"),
  ]);
  const homeText = visibleText(home);
  const contractText = visibleText(contract);

  assert.doesNotMatch(home, /id="guest-guidance"|guest-guidance__/u);
  assert.doesNotMatch(homeText, /建立案件協作|案件進行中/u);
  assert.match(contractText, /附約草案/u);
  assert.doesNotMatch(contractText, /ADDENDUM_DRAFT/u);
});

test("owner preparation header collapses the expanded brand before the 390px breakpoint", async () => {
  const [html, css] = await Promise.all([
    readFile(paths.ownerStart, "utf8"),
    readFile(paths.ownerStartCss, "utf8"),
  ]);
  assert.match(html, /href="\.\/styles\.css\?v=20260814-mobile-header-2"/u);
  assert.match(
    css,
    /@media\s*\(max-width:\s*680px\)[\s\S]*?\.registration-logo\s+\.drs-brand-lockup\.drs-brand-lockup\s*\{[^}]*display:\s*none/u,
  );
});
