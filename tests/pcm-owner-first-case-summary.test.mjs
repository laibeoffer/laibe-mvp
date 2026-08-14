import test from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const testDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(testDir, "..");
const pcmRoot = resolve(
  repoRoot,
  "src/stitch_laibe_landing_onboarding/pcm_standalone",
);
const caseSummaryDir = resolve(pcmRoot, "case_summary");
const caseSummaryHtml = resolve(caseSummaryDir, "code.html");
const caseSummaryCss = resolve(caseSummaryDir, "styles.css");
const caseSummaryApp = resolve(caseSummaryDir, "app.js");
const basicReportHtml = resolve(pcmRoot, "basic_report/code.html");
const accountAccessHtml = resolve(pcmRoot, "account_access/code.html");
const accountAccessApp = resolve(pcmRoot, "account_access/app.js");

test("basic report leads to a dedicated five-question case-summary route", async () => {
  for (const path of [caseSummaryHtml, caseSummaryCss, caseSummaryApp]) {
    assert.equal(existsSync(path), true, `${path} must exist`);
  }

  const [report, summary] = await Promise.all([
    readFile(basicReportHtml, "utf8"),
    readFile(caseSummaryHtml, "utf8"),
  ]);

  assert.match(report, /href="\.\.\/case_summary\/code\.html"/u);
  for (const question of [
    "主要處理空間",
    "現有文件",
    "預算區間",
    "是否已有設計／施工方",
    "最困擾問題",
  ]) {
    assert.match(summary, new RegExp(question, "u"));
  }
  assert.match(summary, /本次瀏覽草稿/u);
  assert.doesNotMatch(summary, /正式案件已建立|已保存到案件/u);
});

test("case summary hands the explicit browsing draft to the account entry without browser storage", async () => {
  const [summaryApp, accountHtml, accountApp] = await Promise.all([
    readFile(caseSummaryApp, "utf8"),
    readFile(accountAccessHtml, "utf8"),
    readFile(accountAccessApp, "utf8"),
  ]);

  assert.match(summaryApp, /\.\.\/account_access\/code\.html\?/u);
  assert.match(summaryApp, /URLSearchParams/u);
  assert.doesNotMatch(summaryApp, /localStorage|sessionStorage/u);
  assert.match(accountHtml, /本次瀏覽草稿/u);
  assert.match(accountHtml, /註冊後準備工作台預覽/u);
  assert.match(accountApp, /URLSearchParams/u);
  assert.doesNotMatch(accountApp, /localStorage|sessionStorage/u);
});
