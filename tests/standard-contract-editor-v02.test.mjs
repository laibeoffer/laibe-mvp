import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const htmlPath = join(root, "site", "standard_contract_editor", "code.html");
const appPath = join(root, "site", "standard_contract_editor", "app.js");
const sourcePath = join(root, "site", "shared", "laibe-project-contract-source.js");
const enginePath = join(root, "site", "shared", "laibe-project-contract-engine.js");

const html = readFileSync(htmlPath, "utf8");
const app = readFileSync(appPath, "utf8");
const combined = `${html}\n${app}`;
const visibleHtml = html.replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, "").replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "");
const require = createRequire(import.meta.url);
const source = require(sourcePath);

function sha256(value) {
  return createHash("sha256").update(value).digest("hex").toUpperCase();
}

test("canonical source exposes only the three supported project-contract types", () => {
  assert.deepEqual(source.contractTypes, ["DESIGN", "WORKS", "DESIGN_BUILD"]);
  assert.equal(source.templates.DESIGN.title, "建築物室內裝修委託設計契約");
  assert.equal(source.templates.WORKS.title, "建築物室內裝修工程承攬契約");
  assert.equal(source.templates.DESIGN_BUILD.title, "建築物室內裝修設計委託及工程承攬契約");
});

test("design and works payment rules remain source truth", () => {
  const design = source.templates.DESIGN.paymentProfiles.designFee;
  assert.deepEqual(design.stages.map(({ trigger, rate }) => [trigger, rate]), [
    ["簽約", 20],
    ["3D＋平面／系統圖交付", 10],
    ["第一次細部施工圖＋報價單交付", 30],
    ["整體設計交付", 40],
  ]);

  const works = source.templates.WORKS.paymentProfiles.worksAmount;
  assert.equal(works.signingRate, 5);
  assert.equal(works.progressPoolRate, 80);
  assert.equal(works.maxProgressMilestoneRate, 10);
  assert.equal(works.progressMilestoneCountFixed, false);
  assert.deepEqual(works.progressMilestoneBasis, ["CONSTRUCTION_SCHEDULE", "QUOTATION_WORK_VALUE"]);
  assert.equal(works.finalRate, 15);
  assert.equal(works.finalPaymentReadiness.prerequisites.includes("FINAL_ACCEPTANCE_COMPLETED"), true);
  assert.equal(works.finalPaymentDecision.actor, "OWNER");
  assert.equal(works.finalPaymentDecision.explicitDecisionRequired, true);
  assert.equal(works.warrantyDeposit, "NONE");
});

test("design-build keeps design and works money separate and preserves the release gate", () => {
  const template = source.templates.DESIGN_BUILD;
  assert.ok(template.paymentProfiles.designFee);
  assert.ok(template.paymentProfiles.worksAmount);
  assert.equal(template.amountFields.designFee, "{{TOTAL_DESIGN_FEE}}");
  assert.equal(template.amountFields.worksAmount, "{{PROJECT_TOTAL_AMOUNT}}");
  assert.equal(template.designToConstructionGate.ownerDecision, "CONSTRUCTION_RELEASE");
});

test("page loads source then engine then app and duplicates no legal article body", () => {
  const sourceScript = html.indexOf("../shared/laibe-project-contract-source.js");
  const engineScript = html.indexOf("../shared/laibe-project-contract-engine.js");
  const appScript = html.indexOf("./app.js");
  assert.ok(sourceScript >= 0, "canonical source script must be loaded");
  assert.ok(engineScript > sourceScript, "engine must load after source");
  assert.ok(appScript > engineScript, "app must load after engine");
  assert.doesNotMatch(html, /DESIGN-0[1-9]-|WORKS-0[1-9]-|DESIGN_BUILD-0[1-9]-/);
  assert.match(app, /globalThis\.LaibeProjectContractSource|root\.LaibeProjectContractSource/);
  assert.match(app, /engine\.normalizeContractType\(/);
  assert.match(app, /engine\.assembleProjectContract\(/);
  assert.doesNotMatch(app, /source\.templates|source\.commonProcedureAppendix|source\.governance/);
});

test("approved physical orange-red book shell and four accessible sections remain", () => {
  for (const className of [
    "contract-dossier contract-book",
    "status-board contract-book__page contract-book__page--index",
    "contract-book__spine",
    "contract-book__reader",
    "contract-reader__layout",
    "contract-page-deck",
  ]) {
    className.split(" ").forEach((token) => assert.match(html, new RegExp(`\\b${token}\\b`)));
  }
  assert.equal((html.match(/class=["']contract-page-tab["']/g) || []).length, 4);
  assert.match(html, /aria-label=["']契約內容分冊["']/);
  assert.match(html, /--book-cover:\s*#C94318/);
  assert.match(html, /--book-cover-deep:\s*#75220D/);
  assert.match(html, /--book-paper:\s*#F5F0E7/);
});

test("preview surface contains no editing, persistence, signature, payment, reset, or mutable attachment control", () => {
  assert.doesNotMatch(html, /<(?:input|textarea)\b/i);
  assert.doesNotMatch(combined, /contenteditable|localStorage|sessionStorage/i);
  assert.doesNotMatch(combined, /save-local-draft|toggle-draft-edit|data-formal-action|reset-(?:draft|contract)/i);
  assert.doesNotMatch(html, /<button\b[^>]*>[^<]*(?:簽署|付款|附件上傳|儲存|暫存|重設)/i);
  assert.doesNotMatch(combined, /草稿已暫存|開啟草稿編輯|正式儲存/);
});

test("articles retain structured source identities and the shared appendix is mounted once", () => {
  assert.match(app, /data-article-id/);
  assert.match(app, /state\.contract\.articles/);
  assert.match(app, /state\.contract\.commonAppendix/);
  assert.match(app, /state\.contract\.attachmentRefs/);
  assert.doesNotMatch(app, /source\.templates|source\.commonProcedureAppendix|source\.governance/);
  assert.equal((html.match(/id=["']appendix-render-root["']/g) || []).length, 1);
});

test("DRS Review, Owner Decision, Vendor Response, Party Agreement, and payment stay distinct", () => {
  for (const term of ["DRS 文件審閱", "甲方決策", "乙方回應", "雙方合意", "付款"]) {
    assert.match(combined, new RegExp(term), `missing separation copy: ${term}`);
  }
  assert.match(combined, /不會自動(?:觸發|成立).*付款|不會自動觸發付款/);
  assert.match(app, /unresolvedBindings|PROCEDURAL_INCOMPLETE/);
});

test("unavailable dependency state is truthful and external copy exposes no engineering language", () => {
  assert.match(combined, /契約內容暫時無法顯示/);
  assert.match(combined, /既有文件不受影響/);
  assert.doesNotMatch(visibleHtml, />[^<]*(?:API|DB|n8n|GitHub truth|source clean|debug|mock-only|無 DB 寫入)[^<]*</i);
  assert.doesNotMatch(combined, /ENGINE_INTEGRATION_PENDING|SOURCE_INTEGRATION_READY/);
});

test("responsive layout, focus, keyboard tabs, reduced motion, and current-version print are covered", () => {
  assert.match(html, /@media\s+screen\s+and\s+\(max-width:\s*620px\)/);
  assert.match(html, /@media\s*\(prefers-reduced-motion:\s*reduce\)/);
  assert.match(html, /@media\s+print/);
  assert.match(html, /:focus-visible/);
  assert.match(app, /ArrowLeft|ArrowRight/);
  assert.match(app, /beforeprint/);
  assert.match(app, /data-print-contract-type|printContractType/);
  assert.match(app, /data-print-contract-version|printContractVersion/);
});

test("source-driven content and named mobile sections fit inside the contract page", () => {
  assert.match(html, /\.article-body\s*\{[^}]*overflow-wrap:\s*anywhere;/);
  assert.match(html, /\.document-note[^\n]*overflow-wrap:\s*anywhere;/);
  assert.match(html, /@media screen and \(max-width: 620px\)[\s\S]*\.contract-page-tab__label\s*\{[^}]*display:\s*(?:inline|block)/);
});

test("protected source and engine identities remain exact and prohibited claims stay absent", () => {
  assert.equal(sha256(readFileSync(sourcePath)), "382F3A7F79FB8185DF03E6A45616B90C6CBD3FCDA0A65D9552DBFE1FEE9BC6FC");
  assert.equal(sha256(readFileSync(enginePath)), "7CAF26BDD2D55B088D4133E1F41A11268A5FC1B2DE9CA6C924F54719B0334EB2");
  assert.doesNotMatch(combined, /金流託管|代收代付|第三方付款保障|保證最低價|保證零風險|老屋煉金術|投資報酬/);
  assert.doesNotMatch(combined, /SIGNED_CONTRACT_SHA256\s*[:=]\s*["'][a-f0-9]{16,}/i);
  assert.doesNotMatch(combined, /王小明|陳大華|範例有限公司/);
});

test("preview provides a prominent role-aware return to the exact editing task without treating the URL as case authority", () => {
  assert.match(html, /id=["']return-to-workspace["']/);
  assert.match(html, /class=["'][^"']*primary-action[^"']*["'][^>]*id=["']reader-return-to-workspace["'][^>]*hidden|id=["']reader-return-to-workspace["'][^>]*class=["'][^"']*primary-action[^"']*["'][^>]*hidden/);
  assert.match(html, /id=["']mobile-return-to-workspace["']/);
  assert.match(app, /function normalizePreviewReturnTarget/);
  assert.match(app, /owner[\s\S]{0,260}label:\s*["']回甲方工作台繼續填寫["'][\s\S]{0,260}client_awarding_dashboard\/code\.html#owner-contract-view-panel-facts/);
  assert.match(app, /vendor[\s\S]{0,260}label:\s*["']回乙方工作台繼續回覆["'][\s\S]{0,260}vendor_workspace\/code\.html#vendor-contract-view-panel-reply/);
  assert.match(app, /service-contract[\s\S]{0,260}label:\s*["']回 DRS 服務契約["'][\s\S]{0,260}service_contract\/code\.html\?contract=engineering#full-contract/);
  assert.match(app, /refs\["reader-return-to-workspace"\]/);
  assert.match(app, /buildProjectContractPreviewHref\(selectedType,\s*state\.returnTarget\)/);
  assert.doesNotMatch(app, /returnTarget[\s\S]{0,120}(?:caseId|contractId|version)/);
});

test("preview accepts service contract as a neutral return target only", () => {
  const { normalizePreviewReturnTarget, buildProjectContractPreviewHref } = require(appPath);

  assert.equal(normalizePreviewReturnTarget("service-contract"), "service-contract");
  assert.equal(
    buildProjectContractPreviewHref("DESIGN_BUILD", "service-contract"),
    "/site/standard_contract_editor/code.html?contractType=DESIGN_BUILD&returnTo=service-contract",
  );
});

test("mobile book keeps the orange cover but uses horizontal section tabs and a direct return action", () => {
  const mobile = html.match(/@media screen and \(max-width: 620px\) \{[\s\S]*?\n\s*\}/u)?.[0] ?? "";
  assert.match(html, /@media screen and \(max-width: 620px\)[\s\S]*\.contract-reader__layout\s*\{[^}]*grid-template-columns:\s*1fr/);
  assert.match(html, /@media screen and \(max-width: 620px\)[\s\S]*\.contract-page-tabs\s*\{[^}]*width:\s*100%[^}]*flex-direction:\s*row/);
  assert.match(html, /@media screen and \(max-width: 620px\)[\s\S]*\.contract-page-tab\s*\{[^}]*writing-mode:\s*horizontal-tb/);
  assert.match(html, /@media screen and \(max-width: 620px\)[\s\S]*\.contract-book__page--index\s*>\s*h2[^}]*display:\s*none/);
  assert.ok(mobile.length > 0);
});

test("trusted case preview locks unrelated contract types while neutral templates stay switchable", () => {
  assert.match(app, /button\.disabled\s*=\s*Boolean\(context\s*&&\s*button\.dataset\.contractType\s*!==\s*context\.contractType\)/);
  assert.match(app, /只切換範本，不會修改案件/);
});
