import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";

const previewBudget = readFileSync(
  new URL("../src/stitch_laibe_landing_onboarding/preview_budget/code.html", import.meta.url),
  "utf8",
);
const onboarding = readFileSync(
  new URL("../src/stitch_laibe_landing_onboarding/onboard_ai_agent/code.html", import.meta.url),
  "utf8",
);

test("canonical preview budget contains the latest editor contracts", () => {
  assert.match(previewBudget, /id="budgetSearch"/);
  assert.match(previewBudget, /id="reviewOnly"/);
  assert.match(previewBudget, /laibePreviewBudgetDraftV1/);
  assert.match(previewBudget, /id="printReport"/);

  const headers = [...previewBudget.matchAll(/<th[^>]*>([\s\S]*?)<\/th>/gi)]
    .slice(0, 8)
    .map((match) => match[1].replace(/<[^>]+>/g, "").trim());
  assert.deepEqual(headers, [
    "項次",
    "品項",
    "單位",
    "數量",
    "單價",
    "複價",
    "規格說明",
    "工法說明",
  ]);
});

test("canonical preview budget keeps the required page order", () => {
  const markers = [
    'id="lb-owner-progress"',
    'class="readiness"',
    'class="topbar"',
    'class="plan-sync"',
    'class="trade-tabs-wrap"',
    'class="editor-layout"',
  ];
  const positions = markers.map((marker) => previewBudget.indexOf(marker));
  assert.ok(positions.every((position) => position >= 0));
  assert.deepEqual(positions, [...positions].sort((a, b) => a - b));
});

test("canonical preview budget omits retired operations", () => {
  assert.doesNotMatch(
    previewBudget,
    /匯入平面拼圖更新|貼上 Excel 資料|匯出標單 Excel/,
  );
});

test("onboarding routes STEP 03 to canonical preview budget", () => {
  assert.match(onboarding, /\.\.\/preview_budget\/code\.html/);
  assert.doesNotMatch(onboarding, /\.\.\/candidate_budget_output\/code\.html/);
});

test("inline scripts remain syntactically valid", () => {
  const scripts = [...previewBudget.matchAll(
    /<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi,
  )]
    .map((match) => match[1])
    .filter((script) => script.trim());
  scripts.forEach((script, index) => {
    new vm.Script(script, { filename: `preview-budget-inline-${index + 1}.js` });
  });
  assert.ok(scripts.length > 0);
});
