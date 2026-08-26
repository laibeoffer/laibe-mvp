import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

const repositoryRoot = path.resolve(fileURLToPath(new URL("../", import.meta.url)));
const drsRoot = path.join(repositoryRoot, "src", "stitch_laibe_landing_onboarding", "drs_standalone");
const dataClientPath = path.join(drsRoot, "shared", "drs-data-client.js");
const rendererPath = path.join(drsRoot, "shared", "drs-workspace-renderer.js");

const forbiddenUserCopy = /\b(?:PCM|tender|bid|award|bidding|mock-only|API|DB|debug|disabled|production|n8n|escrow|payment|Budget Engine|PricingRule|BudgetEstimateLine|Plancraft|candidate|OWNER_DRS_PRIVATE|OWNER_VENDOR_DRS_SHARED|AI advisory statuses|Human final controls|EDIT_AND_SEND|OVERRIDE_AND_SEND|MANUAL_EXCEPTION_SEND)\b|候選|投標|招標|決標|競標|金流託管|支付託管|代收代付|老屋煉金術|投資報酬/u;

async function loadDataClient() {
  return import(`${pathToFileURL(dataClientPath).href}?case=${Date.now()}`);
}

async function loadRenderer() {
  return import(`${pathToFileURL(rendererPath).href}?case=${Date.now()}`);
}

class RenderElement {
  constructor({ dataset = {}, textContent = "" } = {}) {
    this.dataset = dataset;
    this.textContent = textContent;
    this.innerHTML = "";
    this.hidden = false;
    this.disabled = false;
    this.attributes = new Map();
  }

  setAttribute(name, value) {
    this.attributes.set(name, value);
  }

  getAttribute(name) {
    return this.attributes.get(name) ?? null;
  }
}

class RenderRoot {
  constructor() {
    this.body = new RenderElement();
    this.bound = new Map();
    this.lists = new Map();
    this.readyContent = [new RenderElement(), new RenderElement()];
    this.actions = [new RenderElement({ dataset: { drsAction: "edit-send" } }), new RenderElement({ dataset: { drsAction: "mark-next" } })];
    this.tabs = [new RenderElement({ dataset: { drsTab: "overview" } }), new RenderElement({ dataset: { drsTab: "private" } })];
    for (const name of [
      "state-label",
      "product-message",
      "case-name",
      "current-status",
      "responsible-role",
      "waiting-for",
      "next-action",
      "snapshot-title",
      "snapshot-documents",
      "snapshot-state",
      "snapshot-next",
      "ai-status",
      "final-receipt",
    ]) {
      this.bound.set(name, [new RenderElement()]);
    }
    for (const name of ["private-messages", "shared-messages", "review-queue", "trace", "ai-findings"]) {
      this.lists.set(name, [new RenderElement()]);
    }
  }

  querySelectorAll(selector) {
    const bind = selector.match(/^\[data-drs-bind="([^"]+)"\]$/u)?.[1];
    if (bind) return this.bound.get(bind) ?? [];
    const list = selector.match(/^\[data-drs-list="([^"]+)"\]$/u)?.[1];
    if (list) return this.lists.get(list) ?? [];
    if (selector === "[data-drs-ready-content], [data-drs-authorized-content]") return this.readyContent;
    if (selector === "[data-drs-action]") return this.actions;
    if (selector === "[data-drs-tab]") return this.tabs;
    return [];
  }
}

test("DRS W2 data client exposes an injectable local transport boundary", async () => {
  const source = await readFile(dataClientPath, "utf8");
  assert.match(source, /function createLocalDrsTransport/u);
  assert.match(source, /function createDrsDataClient/u);
  assert.match(source, /transport\.loadCaseSnapshot/u);
  assert.match(source, /transport\.recordLocalTransition/u);

  const { createDrsDataClient, createLocalDrsTransport } = await loadDataClient();
  const transport = createLocalDrsTransport();
  const client = createDrsDataClient({ role: "owner", caseId: "CASE-A7", transport });
  const model = await client.loadWorkspace({ state: "ready" });

  assert.equal(model.state, "ready");
  assert.equal(model.case.caseId, "CASE-A7");
  assert.equal(model.status.currentResponsibleRole, "乙方設計團隊");
  assert.equal(model.status.waitingFor, "屋主等待乙方補充尺寸說明");
  assert.ok(model.traceEntries.length >= 2);
});

test("DRS W2 role views expose only authorized case messages", async () => {
  const { createDrsDataClient, createLocalDrsTransport } = await loadDataClient();

  const owner = await createDrsDataClient({ role: "owner", caseId: "CASE-A7", transport: createLocalDrsTransport() }).loadWorkspace({ state: "ready" });
  assert.deepEqual(owner.authorizedGroups, ["OWNER_DRS_PRIVATE", "OWNER_VENDOR_DRS_SHARED"]);
  assert.ok(owner.messages.some((message) => message.group === "OWNER_DRS_PRIVATE"));
  assert.ok(owner.messages.some((message) => message.group === "OWNER_VENDOR_DRS_SHARED"));

  const vendor = await createDrsDataClient({ role: "vendor", caseId: "CASE-A7", transport: createLocalDrsTransport() }).loadWorkspace({ state: "ready" });
  assert.deepEqual(vendor.authorizedGroups, ["OWNER_VENDOR_DRS_SHARED"]);
  assert.ok(vendor.messages.every((message) => message.group === "OWNER_VENDOR_DRS_SHARED"));
  assert.doesNotMatch(JSON.stringify(vendor), /我的疑問草稿|OWNER_DRS_PRIVATE/u);

  const denied = await createDrsDataClient({ role: "vendor", caseId: "OWNER-PRIVATE-CASE", transport: createLocalDrsTransport() }).loadWorkspace({ state: "ready" });
  assert.equal(denied.state, "permission-denied");
  assert.match(denied.productMessage, /沒有此案件的共用檢視權限/u);
});

test("DRS W2 vendor transport payload is role scoped before model building", async () => {
  const { createLocalDrsTransport } = await loadDataClient();
  const vendorTransport = createLocalDrsTransport({ role: "vendor" });
  const rawSnapshot = await vendorTransport.loadCaseSnapshot({ caseId: "CASE-A7" });
  const rawPayload = JSON.stringify(rawSnapshot);

  assert.doesNotMatch(rawPayload, /OWNER_DRS_PRIVATE|private-1|我的疑問草稿/u);
  assert.match(rawPayload, /OWNER_VENDOR_DRS_SHARED/u);
});

test("DRS W2 owner and vendor clients cannot record specialist human decisions", async () => {
  const { createDrsDataClient, createLocalDrsTransport } = await loadDataClient();

  for (const role of ["owner", "vendor"]) {
    const client = createDrsDataClient({ role, caseId: "CASE-A7", transport: createLocalDrsTransport({ role }) });
    await assert.rejects(
      () => client.recordHumanDecision({ decision: "EDIT_AND_SEND", reason: "需要專員確認後才可建立送出前紀錄。" }),
      /只有 DRS 專員可以建立送出前決策紀錄/u,
      role,
    );
  }
});

test("DRS W2 product states are deterministic and user-facing", async () => {
  const { createDrsDataClient, createLocalDrsTransport } = await loadDataClient();
  const client = createDrsDataClient({ role: "owner", caseId: "CASE-A7", transport: createLocalDrsTransport() });

  for (const state of ["loading", "empty", "retryable-error", "permission-denied", "ready"]) {
    const model = await client.loadWorkspace({ state });
    assert.equal(model.state, state);
    assert.match(model.productMessage, /案件|整理|權限|稍後|等待|正式開放/u, state);
    assert.doesNotMatch(model.productMessage, forbiddenUserCopy, state);
  }
});

test("DRS W2 dynamic product strings do not expose engineering or candidate copy", async () => {
  const dynamicSource = `${await readFile(dataClientPath, "utf8")}\n${await readFile(rendererPath, "utf8")}`;
  const dynamicStrings = [...dynamicSource.matchAll(/"([^"\\]*(?:\\.[^"\\]*)*)"|'([^'\\]*(?:\\.[^'\\]*)*)'|`([^`\\]*(?:\\.[^`\\]*)*)`/gu)]
    .map((match) => match[1] ?? match[2] ?? match[3] ?? "")
    .filter((value) => /[\u4e00-\u9fff]|\s/u.test(value))
    .join("\n");
  assert.doesNotMatch(dynamicStrings, forbiddenUserCopy);
});

test("DRS W2 renderer gates case-specific controls and content for non-ready states", async () => {
  const { createDrsDataClient, createLocalDrsTransport } = await loadDataClient();
  const { renderWorkspaceModel } = await loadRenderer();
  const root = new RenderRoot();
  const denied = await createDrsDataClient({ role: "specialist", caseId: "CASE-A7", transport: createLocalDrsTransport() }).loadWorkspace({ state: "permission-denied" });

  renderWorkspaceModel(root, denied);

  assert.equal(root.body.dataset.drsState, "permission-denied");
  assert.ok(root.readyContent.every((element) => element.hidden), "case-specific ready content hidden");
  assert.ok(root.actions.every((element) => element.disabled), "actions disabled");
  assert.ok(root.tabs.every((element) => element.disabled), "all case-specific tabs disabled");
  assert.ok(root.tabs.every((element) => element.tabIndex === -1), "non-ready tabs leave the sequential tab order");
  assert.doesNotMatch(root.lists.get("review-queue")[0].innerHTML, /平面配置|天花圖|廚具尺寸表/u);
  assert.match(root.bound.get("product-message")[0].textContent, /沒有此案件/u);
});

test("DRS W2 document and drawing review transitions add local trace records", async () => {
  const { createDrsDataClient, createLocalDrsTransport } = await loadDataClient();
  const client = createDrsDataClient({ role: "specialist", caseId: "CASE-A7", transport: createLocalDrsTransport() });
  const before = await client.loadWorkspace({ state: "ready" });
  const transition = await client.transitionReviewItem({ itemId: "drawing-ceiling-v2", action: "mark-reviewed" });
  const after = await client.loadWorkspace({ state: "ready" });

  assert.equal(transition.receipt.transport, "local");
  assert.match(transition.receipt.label, /本頁已記錄/u);
  assert.equal(after.reviewQueue.find((item) => item.id === "drawing-ceiling-v2").status, "已標記可供人工判斷");
  assert.equal(after.traceEntries.length, before.traceEntries.length + 1);
  assert.match(after.traceEntries.at(-1).summary, /批次圖面檢視/u);
});

test("DRS W2 specialist human decisions produce final local transport receipts", async () => {
  const { createDrsDataClient, createLocalDrsTransport } = await loadDataClient();
  const client = createDrsDataClient({ role: "specialist", caseId: "CASE-A7", transport: createLocalDrsTransport({ role: "specialist" }) });

  await assert.rejects(
    () => client.recordHumanDecision({ decision: "OVERRIDE_AND_SEND" }),
    /請填寫人工判斷原因/u,
  );
  await assert.rejects(
    () =>
      client.recordHumanDecision({
        decision: "MANUAL_EXCEPTION_SEND",
        reason: "現場等待同一份文件基準，需先建立例外紀錄。",
        referencedDocumentBasis: "平面配置 v2",
        currentState: "等待乙方補尺寸說明",
        nextActor: "DRS 專員",
      }),
    /請填寫急迫程度與服務事件編號/u,
  );

  const result = await client.recordHumanDecision({
    decision: "MANUAL_EXCEPTION_SEND",
    reason: "現場等待同一份文件基準，需先建立例外紀錄。",
    referencedDocumentBasis: "平面配置 v2",
    currentState: "等待乙方補尺寸說明",
    nextActor: "DRS 專員",
    urgency: "高",
    serviceIncidentId: "SERVICE-LOCAL-001",
  });
  const model = await client.loadWorkspace({ state: "ready" });

  assert.equal(result.receipt.decision, "MANUAL_EXCEPTION_SEND");
  assert.equal(result.receipt.transport, "local");
  assert.match(result.receipt.label, /等待專員確認正式送出/u);
  assert.equal(result.receipt.reason, "現場等待同一份文件基準，需先建立例外紀錄。");
  assert.equal(result.receipt.referencedDocumentBasis, "平面配置 v2");
  assert.equal(result.receipt.currentState, "等待乙方補尺寸說明");
  assert.equal(result.receipt.nextActor, "DRS 專員");
  assert.equal(result.receipt.urgency, "高");
  assert.equal(result.receipt.serviceIncidentId, "SERVICE-LOCAL-001");
  assert.equal(model.finalTransportReceipt.decision, "MANUAL_EXCEPTION_SEND");
  assert.match(model.finalTransportReceipt.label, /等待專員確認正式送出/u);
  assert.match(model.traceEntries.at(-1).detail, /原因：現場等待同一份文件基準/u);
  assert.match(model.traceEntries.at(-1).detail, /依據文件：平面配置 v2/u);
  assert.match(model.traceEntries.at(-1).detail, /下一步責任人：DRS 專員/u);
  assert.match(model.submittedSnapshot.title, /送出前快照/u);
  assert.ok(model.aiAdvisory.findings.length >= 2);
});

test("DRS W2 specialist human decision trace text does not expose internal decision ids", async () => {
  const { createDrsDataClient, createLocalDrsTransport } = await loadDataClient();
  const decisions = [
    { decision: "EDIT_AND_SEND", expectedSummary: /編修後建立送出前紀錄/u },
    { decision: "OVERRIDE_AND_SEND", expectedSummary: /覆寫提醒後建立送出前紀錄/u },
    {
      decision: "MANUAL_EXCEPTION_SEND",
      expectedSummary: /人工例外建立送出前紀錄/u,
      urgency: "高",
      serviceIncidentId: "SERVICE-LOCAL-001",
    },
  ];

  for (const decision of decisions) {
    const client = createDrsDataClient({ role: "specialist", caseId: "CASE-A7", transport: createLocalDrsTransport({ role: "specialist" }) });
    await client.recordHumanDecision({
      decision: decision.decision,
      reason: "專員依送出前快照確認需建立本頁決策紀錄。",
      referencedDocumentBasis: "平面配置 v2",
      currentState: "等待乙方補尺寸說明",
      nextActor: "DRS 專員",
      urgency: decision.urgency,
      serviceIncidentId: decision.serviceIncidentId,
    });
    const model = await client.loadWorkspace({ state: "ready" });
    const latestTrace = model.traceEntries.at(-1);
    const traceText = [latestTrace.time, latestTrace.actor, latestTrace.summary, latestTrace.detail].join("\n");

    assert.match(latestTrace.summary, decision.expectedSummary, decision.decision);
    assert.doesNotMatch(traceText, /EDIT_AND_SEND|OVERRIDE_AND_SEND|MANUAL_EXCEPTION_SEND/u, decision.decision);
  }
});
