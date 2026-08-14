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

test("public journey links each truthful stage without inventing registration or persistence", async () => {
  const [quote, report, summaryApp, account, accountApp, workspace] = await Promise.all([
    readFile(paths.quoteCheck, "utf8"),
    readFile(paths.basicReport, "utf8"),
    readFile(paths.caseSummaryApp, "utf8"),
    readFile(paths.accountAccess, "utf8"),
    readFile(paths.accountAccessApp, "utf8"),
    readFile(paths.ownerWorkspace, "utf8"),
  ]);

  assert.match(quote, /href="\.\.\/basic_report\/code\.html"[^>]*>[^<]*查看基本報告範例/u);
  assert.match(report, /基本報告範例/u);
  assert.match(report, /閱讀指南/u);
  assert.match(report, /href="\.\.\/case_summary\/code\.html"[^>]*>[\s\S]*開始 2 分鐘案件摘要/u);
  assert.doesNotMatch(report, /本案報告|基本報告尚未發布|已完成個別分析/u);

  assert.match(summaryApp, /\.\.\/account_access\/code\.html\?/u);
  assert.doesNotMatch(summaryApp, /localStorage|sessionStorage/u);
  assert.match(account, /data-browsing-draft/u);
  assert.match(account, /註冊後準備工作台預覽/u);
  assert.match(accountApp, /URLSearchParams/u);
  assert.match(accountApp, /client_awarding_dashboard\/code\.html/u);
  assert.doesNotMatch(accountApp, /localStorage|sessionStorage/u);

  assert.match(workspace, /註冊後準備工作台預覽/u);
  assert.match(workspace, /尚未驗證註冊|尚未真正保存/u);
  assert.doesNotMatch(workspace, /href="\.\.\/pcm_standalone\/owner_start\/code\.html"/u);
  assert.match(workspace, /href="\.\.\/pcm_standalone\/case_summary\/code\.html/u);
  assert.match(workspace, /href="\.\.\/pcm_standalone\/about_drs\/code\.html"/u);
  assert.match(workspace, /href="\.\.\/pcm_standalone\/service_contract\/code\.html"/u);
});

test("public-facing pages remove PCM and workspace wording while keeping DRS contract boundaries", async () => {
  const files = [
    paths.publicHome,
    paths.basicReport,
    paths.ownerStart,
    paths.accountAccess,
    paths.ownerWorkspace,
  ];
  for (const path of files) {
    const text = visibleText(await readFile(path, "utf8"));
    assert.doesNotMatch(text, /PCM|workspace/u, `${path} must use public product language`);
  }

  const account = await readFile(paths.accountAccess, "utf8");
  assert.match(account, /註冊只會建立帳號與辨識使用角色/u);
  assert.match(account, /不代表已建立正式 DRS 案件，也不代表已完成 DRS 服務契約/u);

  const workspaceApp = await readFile(paths.ownerWorkspaceApp, "utf8");
  assert.match(workspaceApp, /REGISTERED != CONTRACTED/u);
});

test("public home no longer requests the missing hero SVG", async () => {
  const home = await readFile(paths.publicHome, "utf8");
  assert.doesNotMatch(home, /d_rs_03_compact_d0e0e3\.svg/u);

  for (const path of Object.values(paths)) {
    assert.equal(existsSync(path), true, `${path} must exist`);
  }
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
