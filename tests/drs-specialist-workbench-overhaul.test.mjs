import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const repositoryRoot = path.resolve(fileURLToPath(new URL("../", import.meta.url)));
const workspaceRoot = path.join(
  repositoryRoot,
  "src",
  "stitch_laibe_landing_onboarding",
  "drs_standalone",
  "specialist_workspace",
);

async function readWorkspaceFile(name) {
  return readFile(path.join(workspaceRoot, name), "utf8");
}

async function importWorkbenchModule() {
  const previousDocument = globalThis.document;
  const previousLocation = globalThis.location;
  const root = {
    body: { dataset: {}, querySelectorAll() { return []; } },
    location: { search: "?drs_state=ready", hash: "#case-review-engineering" },
    defaultView: {
      matchMedia() { return { matches: false }; },
      scrollTo() {},
      history: { replaceState() {} },
    },
    querySelector() { return null; },
    querySelectorAll() { return []; },
  };
  globalThis.document = root;
  globalThis.location = root.location;
  try {
    return await import(`../src/stitch_laibe_landing_onboarding/drs_standalone/specialist_workspace/app.js?overhaul-contract=${Date.now()}`);
  } finally {
    globalThis.document = previousDocument;
    globalThis.location = previousLocation;
  }
}

function visibleText(html) {
  return html.replace(/<script[\s\S]*?<\/script>/giu, " ").replace(/<[^>]+>/gu, " ");
}

test("specialist workspace exposes distinct triage and focused document-review modes", async () => {
  const html = await readWorkspaceFile("code.html");
  const script = await readWorkspaceFile("app.js");

  assert.match(html, /data-workbench-mode="triage"/u);
  assert.match(html, /data-workbench-mode="review"/u);
  assert.match(html, /data-drs-action="show-triage"/u);
  assert.match(html, /data-drs-action="enter-review"/u);
  assert.match(html, /data-review-tool-rail/u);
  assert.match(html, /data-document-canvas/u);
  assert.match(html, /data-review-inspector/u);
  assert.match(script, /function setWorkbenchMode\(/u);
  assert.match(script, /location\.hash/u, "deep-link mode is resolved from the existing hash contract");
});

test("focused review makes the unavailable document canvas primary without fabricating content", async () => {
  const html = await readWorkspaceFile("code.html");
  const text = visibleText(html);

  assert.match(html, /class="document-canvas"[^>]*data-document-canvas/u);
  assert.match(html, /data-document-command="fit-width"/u);
  assert.match(html, /data-document-command="compare"[^>]*disabled/u);
  assert.match(html, /data-document-drawer/u);
  assert.match(text, /尚未取得正式圖面/u);
  assert.match(text, /取得正式文件與案件授權後/u);
  assert.doesNotMatch(text, /已完成真實文件比對|已讀取正式 PDF/u);
});

test("review issue editor models evidence, impact, audience, responsibility and lifecycle", async () => {
  const html = await readWorkspaceFile("code.html");
  const text = visibleText(html);

  for (const field of [
    "issue-type",
    "risk",
    "impact",
    "request",
    "audience",
    "next-owner",
    "response-due",
    "resolution",
  ]) {
    assert.match(html, new RegExp(`data-review-field="${field}"`, "u"), `review field ${field}`);
  }

  for (const state of ["草稿", "待送出", "等待回覆", "已回覆待複核", "待甲方決定", "已完成留痕"]) {
    assert.match(text, new RegExp(state, "u"), `review lifecycle state ${state}`);
  }

  for (const state of ["已撤回", "已被新版本取代", "需另一位 DRS 覆核", "證據失效"]) {
    assert.match(text, new RegExp(state, "u"), `exception state ${state}`);
  }
});

test("draft, peer review and presend actions stay distinct and truthful", async () => {
  const html = await readWorkspaceFile("code.html");
  const script = await readWorkspaceFile("app.js");

  assert.match(html, /data-drs-action="save-review-draft"/u);
  assert.match(html, /data-drs-action="request-peer-review"/u);
  assert.match(html, /data-drs-action="submit-presend-review"[^>]*data-primary-action/u);
  assert.match(html, /data-draft-status/u);
  assert.match(html, /class="low-frequency-controls"/u);
  assert.match(script, /function markReviewDraftDirty\(/u);
  assert.match(script, /function saveReviewDraft\(/u);
  assert.match(script, /function requestPeerReview\(/u);
  assert.match(script, /本頁草稿/u);
  assert.doesNotMatch(script, /localStorage|sessionStorage/u, "local-only draft is not misrepresented as durable storage");
});

test("presend snapshot preserves the complete request, audience, issue revision and version-bound evidence", async () => {
  const module = await importWorkbenchModule();
  const issue = module.createInitialReviewIssue();
  const basis = [{
    id: "basis-1",
    documentId: "plan-v2",
    documentLabel: "平面配置 v2",
    documentType: "圖面",
    documentVersion: "v2",
    versionConfirmed: true,
    evidenceState: "ready",
    location: "圖 A-02／中島區",
  }];
  const values = {
    issueType: "尺寸缺漏",
    risk: "圖面未標示中島淨距。",
    impact: "甲方無法判斷動線。",
    request: "請乙方補上尺寸。",
    audience: "乙方設計團隊",
    nextOwner: "乙方設計團隊",
    responseDue: "開工前確認前",
    resolution: "收到新版後複核。",
  };

  issue.revision = 2;
  const result = module.buildPreSendSnapshot({ values, basis, mode: "補件要求", issue });

  assert.equal(result.ok, true);
  assert.equal(result.snapshot.issueRevision, 2);
  assert.equal(result.snapshot.issueType, values.issueType);
  assert.equal(result.snapshot.finding, values.risk);
  assert.equal(result.snapshot.impact, values.impact);
  assert.equal(result.snapshot.request, values.request);
  assert.equal(result.snapshot.audience, values.audience);
  assert.equal(result.snapshot.evidenceReferences[0].documentVersion, "v2");
  assert.equal(result.snapshot.evidenceReferences[0].versionConfirmed, true);
  assert.match(result.snapshot.documents, /平面配置 v2｜v2｜圖 A-02／中島區/u);
});

test("placeholder versions and peer-review holds fail closed before a presend snapshot", async () => {
  const module = await importWorkbenchModule();
  const values = {
    issueType: "尺寸缺漏",
    risk: "圖面未標示中島淨距。",
    impact: "甲方無法判斷動線。",
    request: "請乙方補上尺寸。",
    audience: "乙方設計團隊",
    nextOwner: "乙方設計團隊",
    responseDue: "開工前確認前",
    resolution: "",
  };
  const placeholders = ["v2（待正式文件確認）", "版本待提供", "紀錄版本待確認"];
  for (const documentVersion of placeholders) {
    const issue = { ...module.createInitialReviewIssue(), revision: 1 };
    const result = module.buildPreSendSnapshot({
      values,
      issue,
      basis: [{ documentId: "source", documentLabel: "待確認來源", documentType: "文件", documentVersion, versionConfirmed: false, evidenceState: "unavailable", location: "待確認位置" }],
    });
    assert.equal(result.ok, false, documentVersion);
    assert.match(result.missing.join("、"), /已確認版本的正式審查依據/u);
  }

  const peerIssue = {
    ...module.createInitialReviewIssue(),
    revision: 1,
    status: "需另一位 DRS 覆核",
    peerReviewer: "待指派另一位 DRS 專員",
    peerReviewResult: "等待另一位專員覆核",
  };
  const peerResult = module.buildPreSendSnapshot({
    values,
    issue: peerIssue,
    basis: [{ documentId: "plan-v2", documentLabel: "平面配置 v2", documentType: "圖面", documentVersion: "v2", versionConfirmed: true, evidenceState: "ready", location: "圖 A-02" }],
  });
  assert.equal(peerResult.ok, false);
  assert.match(peerResult.missing.join("、"), /另一位 DRS 覆核結果/u);
  assert.equal(module.reviewIssueAllowsPreSend(peerIssue), false);
  const script = await readWorkspaceFile("app.js");
  assert.doesNotMatch(script, /snapshotIssue\s*=\s*\{\s*\.\.\.reviewIssue,\s*status:\s*"待送出"/u, "submit path must not rewrite a pending peer-review status before validation");
});

test("snapshot invalidation and peer-review transitions are explicit audit states", async () => {
  const module = await importWorkbenchModule();
  const issue = module.createInitialReviewIssue();
  const peerReview = module.transitionReviewIssueModel(issue, {
    status: "需另一位 DRS 覆核",
    actor: issue.author,
    detail: "本頁草稿版本 1 送交覆核",
    peerReviewer: "待指派另一位 DRS 專員",
    peerReviewResult: "等待另一位專員覆核",
  });
  const stale = module.invalidateSnapshotModel({ current: true, issueRevision: 1 }, "審查內容已變更");

  assert.equal(peerReview.status, "需另一位 DRS 覆核");
  assert.notEqual(peerReview.peerReviewer, peerReview.author);
  assert.equal(peerReview.events.at(-1).from, "草稿");
  assert.equal(peerReview.events.at(-1).to, "需另一位 DRS 覆核");
  assert.equal(stale.current, false);
  assert.equal(stale.staleReason, "審查內容已變更");
});

test("record state, unavailable sources, mobile case identity and restorable mode remain truthful", async () => {
  const html = await readWorkspaceFile("code.html");
  const styles = await readWorkspaceFile("styles.css");
  const script = await readWorkspaceFile("app.js");

  assert.match(html, /data-drs-tab="record"[^>]*data-task-status="REVIEW"/u);
  assert.match(html, /data-review-issue-status/u);
  assert.match(html, /data-presend-snapshot-stale/u);
  assert.match(html, /class="compact-case-name">尚未取得正式案件</u);
  assert.doesNotMatch(visibleText(html), /示意：/u);
  assert.doesNotMatch(styles, /@media \(max-width: 680px\)[\s\S]*?\.identity-strip div:nth-child\(2\)\s*\{\s*display:\s*none/u);
  assert.match(script, /history\?\.replaceState\?\.\([^)]*#case-review-engineering/u);
  assert.match(script, /empty\.hidden\s*=\s*Boolean\(preSendSnapshot\s*\|\|\s*stalePreSendSnapshot\)/u);
});

test("governance inbox is the default surface and unproven chief authority stays unavailable", async () => {
  const html = await readWorkspaceFile("code.html");
  const text = visibleText(html);

  assert.match(html, /<body\b[^>]*data-workbench-view="triage"/u);
  assert.match(html, /data-governance-home/u);
  assert.match(text, /治理收件匣/u);
  assert.doesNotMatch(html, /data-role-authority=|CHIEF_REVIEWER|最高審查官/u);
  assert.match(text, /正在確認正式 DRS 授權/u);
  assert.match(html, /data-chief-only="service-contracts"/u);
  assert.match(html, /data-chief-only="reviewer-access"/u);
  assert.match(text, /停權／撤回未來權限/u);
  assert.match(text, /既有留痕不會被刪除/u);
});

test("intake exposes no governed decision before formal authority and keeps the boundary explicit", async () => {
  const html = await readWorkspaceFile("code.html");
  const text = visibleText(html);

  assert.equal((html.match(/data-intake-decision=/gu) ?? []).length, 0);
  assert.match(text, /正式治理功能尚未開放/u);
  assert.match(text, /正式權限確認前不提供接案、補件或案件處置/u);
  assert.match(text, /只有接案成功後/u);
  assert.match(text, /邀請乙方加入/u);
  assert.match(text, /送出前快照/u);
  assert.match(text, /尚未建立案件/u);
});

test("calendar is the case-governance primary canvas and fails closed without a grant", async () => {
  const html = await readWorkspaceFile("code.html");
  const text = visibleText(html);

  assert.match(html, /data-case-governance-calendar/u);
  assert.match(html, /data-calendar-canvas/u);
  assert.match(html, /data-calendar-view="month"/u);
  assert.match(html, /data-calendar-view="week"/u);
  assert.match(html, /data-calendar-view="agenda"/u);
  assert.match(html, /data-calendar-state="permission"/u);
  assert.match(text, /Google Calendar 是案件治理索引/u);
  assert.match(text, /尚未取得正式日曆資料/u);
  assert.match(text, /DRS 保存正式狀態、責任人、證據、決策與留痕/u);
  assert.doesNotMatch(html, /data-calendar-event="(?:fixture|mock|sample)"/u);
});

test("document review keeps source gates, peer-review separation and dual-output contract", async () => {
  const html = await readWorkspaceFile("code.html");
  const text = visibleText(html);

  assert.match(html, /data-document-canvas/u);
  assert.match(text, /沒有正式版本或引用不能送出/u);
  assert.match(text, /審查報告 PDF/u);
  assert.match(text, /帶標註的原始 PDF/u);
  assert.match(text, /同一來源版本與事項版次/u);
  assert.match(text, /覆核者不可等於原作者/u);
  assert.match(text, /傳送失敗/u);
  assert.match(text, /保留草稿與送出前快照/u);
});

test("Obsidian Bloom overhaul uses quiet plum depth, editorial CJK type and semantic signal edges", async () => {
  const styles = (await readWorkspaceFile("styles.css")).toLowerCase();

  for (const [token, value] of [
    ["obsidian", "#09070b"],
    ["plum-surface", "#28182d"],
    ["paper", "#f3eef5"],
    ["signal-review", "#c26ac6"],
    ["signal-action", "#ff79c9"],
    ["signal-complete", "#c8c2cd"],
    ["signal-blocker", "#f75000"],
  ]) {
    assert.match(styles, new RegExp(`--${token}:\\s*${value}`, "u"), token);
  }

  assert.match(styles, /--font-display:[^;]*"noto serif tc"/u);
  assert.match(styles, /--font-ui:[^;]*"noto sans tc"/u);
  assert.match(styles, /\.review-focus-shell\s*\{[^}]*grid-template-columns:\s*72px minmax\(720px,\s*1fr\) minmax\(360px,\s*420px\)/u);
  assert.match(styles, /body::before\s*\{[^}]*content:\s*none/u, "the full-page background glow is removed from dense work surfaces");
  assert.doesNotMatch(styles, /body::before\s*\{[^}]*border-radius:\s*50%/u, "the former background light ring does not return");
  assert.doesNotMatch(styles, /117,\s*175,\s*248|repeating-linear-gradient\(32deg/u, "legacy blue circuit grid is removed");
});

test("client source cannot create intake decisions or infer chief authority", async () => {
  const module = await importWorkbenchModule();
  const script = await readWorkspaceFile("app.js");

  assert.equal(module.createIntakeDecisionModel, undefined);
  assert.equal(module.applyIntakeDecisionModel, undefined);
  assert.equal(module.authorityCanAccessSection, undefined);
  assert.equal(module.createChiefCaseAccessAudit, undefined);
  assert.doesNotMatch(script, /CHIEF_REVIEWER|ACCEPT_ASSIGN_SELF|REQUEST_SUPPLEMENT|createChiefCaseAccessAudit/u);
});

test("responsive review collapses to one task surface and preserves 44px controls", async () => {
  const styles = await readWorkspaceFile("styles.css");
  const script = await readWorkspaceFile("app.js");

  assert.match(styles, /@media \(max-width: 1180px\)[\s\S]*?\.review-focus-shell\s*\{[^}]*grid-template-columns:\s*64px minmax\(0,\s*1fr\)/u);
  assert.match(styles, /@media \(max-width: 680px\)[\s\S]*?\.review-focus-shell\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\)/u);
  assert.match(styles, /@media \(max-width: 680px\)[\s\S]*?\.workflow-stepper\s*\{[^}]*grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/u);
  assert.match(
    styles,
    /@media \(max-width: 680px\)[\s\S]*?\.review-mode:has\(\.review-inspector\[open\]\)\s+\.document-workspace\s*\{[^}]*position:\s*fixed[^}]*top:\s*199px[^}]*bottom:\s*44vh/u,
    "the expanded mobile inspector must reserve a separate upper document viewport below the case bar",
  );
  assert.match(
    styles,
    /@media \(max-width: 680px\)[\s\S]*?\.review-inspector\[open\]\s*\{[^}]*position:\s*fixed[^}]*top:\s*58vh[^}]*bottom:\s*12px/u,
    "the expanded mobile inspector must occupy a distinct lower review viewport",
  );
  assert.match(styles, /@media \(max-width: 680px\)[\s\S]*?\.review-inspector:not\(\[open\]\)\s*\{[^}]*width:\s*min\(210px,/u);
  assert.match(script, /matchMedia\?\.\("\(max-width: 680px\)"\)[\s\S]*?inspector\.open\s*=\s*false/u, "mobile issue editor starts collapsed");
  assert.match(styles, /button, input, select, textarea\s*\{[^}]*min-height:\s*44px/u);
  assert.match(styles, /\.case-type-nav a\s*\{[^}]*min-height:\s*44px/u);
  assert.match(styles, /\.calendar-view-switch button\s*\{[^}]*min-height:\s*44px/u);
  assert.match(styles, /@media \(prefers-reduced-motion: reduce\)/u);
});

test("focused review first fold keeps the document visible and applies one active Obsidian signal", async () => {
  const html = await readWorkspaceFile("code.html");
  const styles = await readWorkspaceFile("styles.css");

  assert.equal(
    (html.match(/class="review-contract-item(?:\s|")/gu) ?? []).length,
    3,
    "the three protected review contracts need bounded layout groups",
  );
  assert.match(
    styles,
    /\.document-workspace::before\s*\{[^}]*linear-gradient\(90deg,[^}]*var\(--signal-review\)[^}]*var\(--signal-action\)/u,
    "the active review surface needs one restrained signal edge",
  );
  assert.match(
    styles,
    /\.rail-tabs button\.is-active\s*\{[^}]*box-shadow:[^}]*var\(--signal-review\)/u,
    "the current review stage needs a bounded working-state backlight",
  );

  const mobileRules = styles.slice(styles.indexOf("@media (max-width: 680px)"));
  assert.match(
    mobileRules,
    /\.case-milestones\s*\{[^}]*grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)[^}]*overflow-x:\s*visible/u,
    "mobile milestones must become a readable triage grid without a horizontal scrollbar",
  );
  assert.match(mobileRules, /\.case-milestones div:nth-child\(3\)\s*\{[^}]*grid-column:\s*1\s*\/\s*-1/u);
  assert.match(
    mobileRules,
    /\.review-contract-strip\s*\{[^}]*grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)[^}]*overflow-x:\s*visible/u,
    "mobile review contracts must become a readable triage grid without a horizontal scrollbar",
  );
  assert.match(mobileRules, /\.review-contract-item:nth-child\(3\)\s*\{[^}]*grid-column:\s*1\s*\/\s*-1/u);
  assert.match(
    mobileRules,
    /\.review-contract-strip\s*>\s*small\s*\{[^}]*display:\s*none/u,
    "secondary delivery detail must not displace the document from the mobile first fold",
  );
  assert.match(
    mobileRules,
    /body\[data-workbench-view="review"\]\s+\.case-command-bar\s*\{[^}]*grid-template-columns:\s*auto minmax\(0,\s*1fr\)/u,
    "review mode must collapse the duplicated global case summary on mobile",
  );
  assert.match(
    mobileRules,
    /body\[data-workbench-view="review"\]\s+\.identity-strip div:nth-child\(2\),[^{]*nth-child\(3\)[^{]*\{[^}]*display:\s*none/u,
    "the compact case bar owns the duplicated case and state values in mobile review mode",
  );
  assert.match(
    mobileRules,
    /\.document-workspace:has\(\.document-canvas\[data-evidence-state="unavailable"\]\)\s+\.document-commands\s*\{[^}]*display:\s*none/u,
    "unavailable documents must not display a dense disabled tool cluster",
  );
  assert.match(
    mobileRules,
    /\.review-inspector:not\(\[open\]\)\s*\{[^}]*left:\s*auto[^}]*width:\s*min\(210px,\s*calc\(100vw\s*-\s*24px\)\)/u,
    "the collapsed mobile issue dock must not cover the full document width",
  );
});
