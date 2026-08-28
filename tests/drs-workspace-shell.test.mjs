import assert from "node:assert/strict";
import { access, readdir, readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const repositoryRoot = path.resolve(fileURLToPath(new URL("../", import.meta.url)));
const drsRoot = path.join(repositoryRoot, "src", "stitch_laibe_landing_onboarding", "drs_standalone");
const workspaceDocPath = path.join(repositoryRoot, "docs", "drs_backend", "workspace_ui_w1.md");
const workspaceW2DocPath = path.join(repositoryRoot, "docs", "drs_backend", "workspace_ui_w2.md");

const pages = Object.freeze([
  {
    key: "owner",
    directory: "owner_workspace",
    title: /甲方案件工作台｜LaiBE DRS/u,
    tabs: ["overview", "private", "shared", "trace"],
    initialTab: "overview",
    requiredCopy: [
      "我的 DRS 私有整理",
      "甲乙共用 LINE 群組",
      "決策留痕",
      "下一步責任人",
    ],
  },
  {
    key: "vendor",
    directory: "vendor_workspace",
    title: /乙方案件工作台｜LaiBE DRS/u,
    tabs: ["assigned", "line", "documents", "records"],
    initialTab: "assigned",
    requiredCopy: [
      "共用 LINE 群組",
      "受邀案件",
      "文件回覆",
      "下一步責任人",
    ],
  },
  {
    key: "specialist",
    directory: "specialist_workspace",
    title: /治理收件匣｜LaiBE DRS/u,
    tabs: ["documents", "sources", "opinion", "record"],
    initialTab: "documents",
    requiredCopy: [
      "案件決策審核桌",
      "文件審查",
      "訊息來源",
      "審查意見",
      "送出與留痕",
      "AI 初步檢核",
      "提交送出前審查",
      "覆核後送出",
      "建立人工例外紀錄",
      "複雜文件編輯",
      "批次圖面檢視",
      "AI 只提醒可能風險與缺漏，不能核准、否決、送出或覆核",
    ],
  },
]);

const forbiddenUserCopy = /\b(?:PCM|tender|bid|award|bidding|mock|API|DB|debug|disabled|production|n8n|escrow|payment|Budget Engine|PricingRule|BudgetEstimateLine|Plancraft|OWNER_DRS_PRIVATE|OWNER_VENDOR_DRS_SHARED|AI advisory statuses|Human final controls|EDIT_AND_SEND|OVERRIDE_AND_SEND|MANUAL_EXCEPTION_SEND|candidate|drafts?|typing|keystrokes?|hidden reasoning|intermediate edits?)\b|候選|投標|招標|決標|競標|金流託管|支付託管|代收代付|老屋煉金術|投資報酬/u;

async function readPageSource(directory, file) {
  return readFile(path.join(drsRoot, directory, file), "utf8");
}

function specialistWorkspaceGrantResponse() {
  return {
    schemaVersion: "laibe.drs-workspace-auth.v1",
    state: "AUTHORIZED_DRS_WORKSPACE",
    case: { id: "11111111-1111-4111-8111-111111111111", status: "REVIEW_IN_PROGRESS" },
    workspaceAccess: { accountRole: "drs", mode: "read_only", mutationAllowed: false, writeActionsEnabled: false },
    next: { actor: "drs_specialist", action: "REVIEW_AUTHORIZED_CASE_RECORDS" },
  };
}

function createSpecialistServerFetch(calls = []) {
  return async (url, options = {}) => {
    calls.push({ url, options });
    if (url === "/functions/v1/drs-session-bootstrap") {
      return {
        status: 204,
        headers: {
          get(name) {
            if (name === "authorization") return "Bearer header.payload.signature";
            if (name === "x-laibe-session-expires-at") return "2099-01-01T00:00:00Z";
            return null;
          },
        },
      };
    }
    if (url === "/functions/v1/drs-workspace-grant") {
      return { ok: true, async json() { return specialistWorkspaceGrantResponse(); } };
    }
    if (url === "/functions/v1/drs-google-calendar-grant") {
      return {
        ok: true,
        async json() {
          return {
            state: "READY",
            grant: {
              schemaVersion: "laibe.drs-calendar-read.v1",
              caseId: "11111111-1111-4111-8111-111111111111",
              accessMode: "read_only",
              connectionStatus: "connected",
              timeZone: "Asia/Taipei",
            },
          };
        },
      };
    }
    if (url === "/functions/v1/drs-google-calendar-events-read") {
      const window = JSON.parse(options.body);
      return {
        ok: true,
        async json() {
          return {
            state: "READY",
            caseId: "11111111-1111-4111-8111-111111111111",
            timeZone: "Asia/Taipei",
            window,
            events: [],
          };
        },
      };
    }
    throw new Error(`Unexpected specialist route: ${url}`);
  };
}

function extractOpeningTags(html, attributeName) {
  return [...html.matchAll(new RegExp(`<[^>]+\\b${attributeName}="([^"]+)"[^>]*>`, "gu"))].map((match) => ({
    value: match[1],
    tag: match[0],
  }));
}

function extractTagsWithAttribute(html, attributeName) {
  return [...html.matchAll(new RegExp(`<[^>]+\\b${attributeName}\\b[^>]*>`, "gu"))].map((match) => match[0]);
}

function attributeValue(tag, name) {
  return tag.match(new RegExp(`\\b${name}="([^"]*)"`, "u"))?.[1] ?? "";
}

function visibleHtmlText(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/giu, " ")
    .replace(/<style[\s\S]*?<\/style>/giu, " ")
    .replace(/<[^>]+>/gu, " ");
}

class FakeClassList {
  constructor() {
    this.values = new Set();
  }

  toggle(className, force) {
    if (force) this.values.add(className);
    else this.values.delete(className);
  }
}

class FakeElement {
  constructor({ dataset = {}, textContent = "", value = "", hidden = false, disabled = false } = {}) {
    this.dataset = dataset;
    this.textContent = textContent;
    this.value = value;
    this.innerHTML = "";
    this.hidden = hidden;
    this.disabled = disabled;
    this.tabIndex = 0;
    this.classList = new FakeClassList();
    this.attributes = new Map();
    this.listeners = new Map();
    this.scrollIntoViewCalls = [];
    this.focused = false;
  }

  addEventListener(type, handler) {
    const handlers = this.listeners.get(type) ?? [];
    handlers.push(handler);
    this.listeners.set(type, handlers);
  }

  click() {
    if (this.disabled) return;
    for (const handler of this.listeners.get("click") ?? []) handler();
  }

  dispatchKey(key) {
    for (const handler of this.listeners.get("keydown") ?? []) {
      handler({ key, preventDefault() {} });
    }
  }

  dispatchInput() {
    for (const handler of this.listeners.get("input") ?? []) handler();
  }

  dispatchChange() {
    for (const handler of this.listeners.get("change") ?? []) handler();
  }

  focus() {
    this.focused = true;
  }

  scrollIntoView(options) {
    this.scrollIntoViewCalls.push(options);
  }

  setAttribute(name, value) {
    this.attributes.set(name, value);
  }

  getAttribute(name) {
    return this.attributes.get(name) ?? null;
  }
}

class FakeDocument {
  constructor(
    page,
    {
      search = "",
      actionNames = [],
      stateOptions = [],
      readyContentCount = 0,
      readyContentPanels = [],
      manualFieldNames = [],
      cancelFieldNames = [],
      reviewFieldNames = [],
      failClosed = false,
      hasDecisionResult = false,
      hasCancelResult = false,
      hasControlResult = false,
    } = {},
  ) {
    this.location = { search };
    this.body = new FakeElement();
    this.tabs = page.tabs.map((tab, index) => {
      const element = new FakeElement({ dataset: { drsTab: tab }, textContent: tab, disabled: failClosed });
      element.tabIndex = failClosed ? -1 : index === 0 ? 0 : -1;
      element.setAttribute("aria-selected", index === 0 ? "true" : "false");
      element.setAttribute("aria-disabled", failClosed ? "true" : "false");
      return element;
    });
    this.panels = page.tabs.map((tab, index) => {
      const element = new FakeElement({ dataset: { drsPanel: tab } });
      element.hidden = failClosed ? true : index !== 0;
      return element;
    });
    this.live = new FakeElement();
    this.readyContent = [
      ...Array.from({ length: readyContentCount }, () => new FakeElement({ hidden: failClosed })),
      ...readyContentPanels.map((panelName) => this.panels.find((panel) => panel.dataset.drsPanel === panelName)).filter(Boolean),
    ];
    this.decisionResult = hasDecisionResult ? new FakeElement({ hidden: true }) : null;
    this.cancelResult = hasCancelResult ? new FakeElement({ hidden: true }) : null;
    this.controlResult = hasControlResult ? new FakeElement({ hidden: true }) : null;
    this.actions = actionNames.map((name) => new FakeElement({ dataset: { drsAction: name }, textContent: name }));
    this.stateOptions = stateOptions.map((name) => new FakeElement({ dataset: { drsStateOption: name }, textContent: name }));
    this.manualFields = new Map(manualFieldNames.map((name) => [name, new FakeElement({ dataset: { drsManualField: name } })]));
    this.cancelFields = new Map(cancelFieldNames.map((name) => [name, new FakeElement({ dataset: { drsCancelField: name } })]));
    this.reviewFields = new Map(reviewFieldNames.map((name) => [name, new FakeElement({ dataset: { reviewField: name } })]));
    this.bound = new Map();
    this.lists = new Map();
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
      this.bound.set(name, [new FakeElement()]);
    }
    for (const name of ["private-messages", "shared-messages", "review-queue", "trace", "ai-findings"]) {
      this.lists.set(name, [new FakeElement()]);
    }
  }

  querySelectorAll(selector) {
    const bind = selector.match(/^\[data-drs-bind="([^"]+)"\]$/u)?.[1];
    if (bind) return this.bound.get(bind) ?? [];
    const list = selector.match(/^\[data-drs-list="([^"]+)"\]$/u)?.[1];
    if (list) return this.lists.get(list) ?? [];
    if (selector === "[data-drs-tab]") return this.tabs;
    if (selector === "[data-drs-panel]") return this.panels;
    if (selector === "[data-drs-action]") return this.actions;
    if (selector === "[data-drs-state-option]") return this.stateOptions;
    if (selector === "[data-drs-ready-content], [data-drs-authorized-content]") return this.readyContent;
    if (selector === "[data-drs-manual-field]") return [...this.manualFields.values()];
    if (selector === "[data-drs-cancel-field]") return [...this.cancelFields.values()];
    if (selector === "[data-drs-review-item]") return [];
    return [];
  }

  querySelector(selector) {
    if (selector === "[data-drs-live]") return this.live;
    if (selector === "[data-drs-decision-result]") return this.decisionResult;
    if (selector === "[data-drs-cancel-result]") return this.cancelResult;
    if (selector === "[data-drs-control-result]") return this.controlResult;
    const manualField = selector.match(/^\[data-drs-manual-field="([^"]+)"\]$/u)?.[1];
    if (manualField) return this.manualFields.get(manualField) ?? null;
    const cancelField = selector.match(/^\[data-drs-cancel-field="([^"]+)"\]$/u)?.[1];
    if (cancelField) return this.cancelFields.get(cancelField) ?? null;
    const reviewField = selector.match(/^\[data-review-field="([^"]+)"\]$/u)?.[1];
    if (reviewField) return this.reviewFields.get(reviewField) ?? null;
    return null;
  }
}

async function flushAsyncWork() {
  await new Promise((resolve) => setTimeout(resolve, 0));
  await new Promise((resolve) => setTimeout(resolve, 0));
}

async function importWorkspaceForState(page, root, marker, state) {
  const previousFetch = globalThis.fetch;
  if (page.key === "specialist" && state === "ready") globalThis.fetch = createSpecialistServerFetch();
  try {
    const module = await import(`../src/stitch_laibe_landing_onboarding/drs_standalone/${page.directory}/app.js?${marker}=${Date.now()}-${page.key}`);
    await flushAsyncWork();
    if (state) {
      await module.loadWorkspaceState(root, state);
      await flushAsyncWork();
    }
    return module;
  } finally {
    if (previousFetch === undefined) delete globalThis.fetch;
    else globalThis.fetch = previousFetch;
  }
}

test("DRS W1 workspace candidate publishes three local static shells", async () => {
  for (const page of pages) {
    const pageRoot = path.join(drsRoot, page.directory);
    await access(path.join(pageRoot, "code.html"));
    await access(path.join(pageRoot, "styles.css"));
    await access(path.join(pageRoot, "app.js"));

    const html = await readPageSource(page.directory, "code.html");
    const script = await readPageSource(page.directory, "app.js");
    const styles = await readPageSource(page.directory, "styles.css");
    assert.match(html, page.title, page.key);
    assert.match(html, /<html\b[^>]*lang="zh-Hant-TW"/u, page.key);
    assert.match(html, /data-drs-workspace/u, page.key);
    assert.match(html, /data-view-model-boundary/u, page.key);
    assert.match(html, /isolated-data-client/u, page.key);
    assert.match(html, /data-drs-bind/u, `${page.key} data binding hooks`);
    assert.match(html, /data-drs-state-option/u, `${page.key} local state controls`);
    assert.match(script, /const DRS_WORKSPACE_VIEW_MODEL/u, `${page.key} view-model boundary`);
    if (page.key === "specialist") {
      assert.match(script, /createSpecialistWorkspaceClient/u, "specialist-only data client boundary");
      assert.doesNotMatch(script, /drs-data-client\.js|createLocalDrsTransport|createDrsDataClient/u, "specialist page does not load shared case fixture data");
    } else {
      assert.match(script, /createDrsDataClient/u, `${page.key} data client injection`);
    }
    assert.match(script, /renderWorkspaceModel/u, `${page.key} data render boundary`);
    assert.match(script, /function setWorkspaceState/u, `${page.key} local state behavior`);
    assert.match(script, /data-drs-action/u, `${page.key} CTA behavior`);
    assert.match(styles, /@media \(max-width: 680px\)/u, `${page.key} mobile layout`);
    for (const copy of page.requiredCopy) {
      assert.match(`${html}\n${script}`, new RegExp(copy, "u"), `${page.key}: ${copy}`);
    }
  }
});

test("DRS W1 CTAs are either real local UI behavior or truthful product-state responses", async () => {
  for (const page of pages) {
    const html = await readPageSource(page.directory, "code.html");
    const script = await readPageSource(page.directory, "app.js");
    assert.doesNotMatch(html, /\bhref=(["'])#\1|\bhref=(["'])\2/u, `${page.key} dead href`);
    assert.doesNotMatch(html, /\bonclick=/iu, `${page.key} inline onclick`);
    assert.match(html, /aria-live="polite"/u, `${page.key} live product-state response`);
    assert.match(script, /addEventListener\("click"/u, `${page.key} click bindings`);
    assert.match(script, /正式開放後/u, `${page.key} truthful unavailable state`);
    assert.match(script, /已切換/u, `${page.key} local state transition`);
  }
});

test("DRS W1 workspace tabs expose accessible deterministic panels", async () => {
  for (const page of pages) {
    const html = await readPageSource(page.directory, "code.html");
    const script = await readPageSource(page.directory, "app.js");
    const tabTags = extractOpeningTags(html, "data-drs-tab");
    const panelTags = extractOpeningTags(html, "data-drs-panel");

    assert.match(html, /<nav\b[^>]*class="rail-tabs"[^>]*role="tablist"/u, `${page.key} tablist`);
    assert.deepEqual(tabTags.map((tab) => tab.value), page.tabs, `${page.key} tab order`);
    assert.deepEqual(panelTags.map((panel) => panel.value), page.tabs, `${page.key} panel order`);

    for (const tab of page.tabs) {
      const tabTag = tabTags.find((candidate) => candidate.value === tab)?.tag ?? "";
      const panelTag = panelTags.find((candidate) => candidate.value === tab)?.tag ?? "";
      assert.match(tabTag, /\brole="tab"/u, `${page.key} ${tab} tab role`);
      assert.match(tabTag, new RegExp(`\\bid="${page.key}-tab-${tab}"`, "u"), `${page.key} ${tab} tab id`);
      assert.match(tabTag, new RegExp(`\\baria-controls="${page.key}-panel-${tab}"`, "u"), `${page.key} ${tab} aria-controls`);
      assert.match(panelTag, /\brole="tabpanel"/u, `${page.key} ${tab} panel role`);
      assert.match(panelTag, new RegExp(`\\bid="${page.key}-panel-${tab}"`, "u"), `${page.key} ${tab} panel id`);
      assert.match(panelTag, new RegExp(`\\baria-labelledby="${page.key}-tab-${tab}"`, "u"), `${page.key} ${tab} aria-labelledby`);
      if (page.key === "specialist") {
        assert.match(tabTag, /\bdisabled\b/u, `${page.key} ${tab} tab fails closed before controller load`);
        assert.equal(attributeValue(tabTag, "aria-disabled"), "true", `${page.key} ${tab} tab is inert before controller load`);
        assert.equal(attributeValue(tabTag, "tabindex"), "-1", `${page.key} ${tab} tab is removed from sequence before controller load`);
        assert.match(panelTag, /\bhidden\b/u, `${page.key} ${tab} panel fails closed before controller load`);
        continue;
      }
      if (tab === page.initialTab) {
        assert.match(tabTag, /\baria-selected="true"/u, `${page.key} initial selected tab`);
        assert.equal(attributeValue(tabTag, "tabindex"), "0", `${page.key} initial roving tab stop`);
        assert.doesNotMatch(panelTag, /\bhidden\b/u, `${page.key} initial panel visible`);
      } else {
        assert.match(tabTag, /\baria-selected="false"/u, `${page.key} inactive tab state`);
        assert.equal(attributeValue(tabTag, "tabindex"), "-1", `${page.key} inactive tab removed from sequence`);
        assert.match(panelTag, /\bhidden\b/u, `${page.key} inactive panel hidden`);
      }
    }

    assert.match(script, /panel\.hidden\s=/u, `${page.key} hides inactive panels`);
    assert.match(script, /aria-selected/u, `${page.key} updates selected state`);
    assert.match(script, /tab\.tabIndex\s*=/u, `${page.key} updates roving tabindex`);
    assert.match(script, /addEventListener\("keydown"/u, `${page.key} keyboard tabs`);
    assert.match(script, /已切換至「\$\{label\}」面板。/u, `${page.key} live region panel completion`);
  }
});

test("DRS specialist static HTML fails closed before controller completion", async () => {
  const html = await readPageSource("specialist_workspace", "code.html");
  const readyOnlyTags = extractTagsWithAttribute(html, "data-drs-ready-content");
  const tabTags = extractOpeningTags(html, "data-drs-tab");

  assert.match(html, /<body\b[^>]*data-drs-state="loading"/u, "specialist body starts in neutral loading state before controller completion");
  assert.ok(readyOnlyTags.length >= 12, "specialist has ready-only case content");
  for (const tag of readyOnlyTags) {
    assert.match(tag, /\bhidden\b/u, `ready-only tag is hidden by default: ${tag}`);
  }
  assert.equal(tabTags.length, 4, "specialist has four main tabs");
  for (const tab of tabTags) {
    assert.match(tab.tag, /\bdisabled\b/u, `${tab.value} tab starts disabled`);
    assert.equal(attributeValue(tab.tag, "aria-disabled"), "true", `${tab.value} tab starts inert`);
    assert.equal(attributeValue(tab.tag, "tabindex"), "-1", `${tab.value} tab starts outside sequential focus`);
  }
  assert.match(html, /<div><dt>身分與權限<\/dt><dd>正在確認正式 DRS 授權<\/dd><\/div>/u, "static identity stays neutral before server authority");
  assert.doesNotMatch(html, /data-role-authority=|CHIEF_REVIEWER|最高審查官/u, "static source cannot infer chief authority");
});

test("DRS specialist non-ready layout gives status copy readable width", async () => {
  const styles = await readPageSource("specialist_workspace", "styles.css");

  assert.match(styles, /body:not\(\[data-drs-state="ready"\]\)\s+\.workspace-shell\s*\{[\s\S]*?grid-template-columns:\s*minmax\(0,\s*1fr\)/u, "non-ready workspace uses one usable column");
  assert.match(styles, /body:not\(\[data-drs-state="ready"\]\)\s+\.decision-desk\s*\{[\s\S]*?grid-column:\s*1\s*\/\s*-1/u, "non-ready decision desk spans the available width");
  assert.match(styles, /body:not\(\[data-drs-state="ready"\]\)\s+\.workspace-status\s*\{[\s\S]*?grid-template-columns:\s*minmax\(0,\s*1fr\)/u, "non-ready status region uses one readable column");
});

test("DRS specialist mobile permission state stays inside the workspace shell", async () => {
  const styles = await readPageSource("specialist_workspace", "styles.css");

  assert.match(
    styles,
    /@media \(max-width: 680px\)[\s\S]*?\.workspace-status\s*\{[^}]*width:\s*auto;[^}]*margin:\s*4px\s+0;/u,
    "the mobile status region must use the shell track instead of adding a fixed width to its horizontal margins",
  );
  assert.doesNotMatch(
    styles,
    /\.workspace-status\s*\{[^}]*width:\s*calc\(100%\s*-\s*8px\)/u,
    "the mobile status region must not overflow its already inset workspace shell",
  );
});

test("DRS specialist mobile header keeps title and authority status on separate rows", async () => {
  const styles = await readPageSource("specialist_workspace", "styles.css");
  const mobileStyles = styles.slice(styles.lastIndexOf("@media (max-width: 680px)"));
  const mobileTopbarRules = [...mobileStyles.matchAll(/\.topbar\s*\{([^}]*)\}/gu)].map((match) => match[1]);

  assert.ok(mobileTopbarRules.length > 0, "the mobile layout defines a topbar geometry contract");
  for (const rule of mobileTopbarRules) {
    assert.match(
      rule,
      /grid-template-columns:\s*minmax\(0,\s*1fr\)/u,
      "the mobile title and authority status occupy separate full-width grid rows",
    );
    assert.doesNotMatch(
      rule,
      /grid-template-columns:\s*108px\s+minmax\(0,\s*1fr\)/u,
      "the mobile header must not place the title and authority status in intersecting columns",
    );
  }
});

test("DRS specialist static default status waits for authorization before case data", async () => {
  const html = await readPageSource("specialist_workspace", "code.html");
  const statusRegion = html.match(/<section\b[^>]*class="workspace-status"[\s\S]*?<\/section>/u)?.[0] ?? "";
  const liveRegion = html.match(/<p\b[^>]*data-drs-live[^>]*>[\s\S]*?<\/p>/u)?.[0] ?? "";
  const statusText = visibleHtmlText(statusRegion);

  assert.match(statusRegion, /data-drs-bind="state-label">確認中</u, "controller-unavailable status is neutral");
  assert.match(statusRegion, /data-drs-bind="product-message">正在確認案件授權與可檢視內容，完成後才會顯示案件資料。/u, "controller-unavailable message does not claim ready");
  assert.doesNotMatch(statusRegion, /data-drs-bind="state-label">可檢視</u, "static default does not use the ready label");
  assert.doesNotMatch(statusText, /案件狀態已整理完成/u, "static default does not falsely signal ready completion");
  assert.match(liveRegion, /正在載入 DRS 專員案件決策審核桌。/u, "controller-unavailable live region remains neutral");
  assert.doesNotMatch(liveRegion, /已載入/u, "controller-unavailable live region does not claim completion");
});

test("DRS W1 runtime tab activation keeps one tab in sequential order", async () => {
  const previousDocument = globalThis.document;

  try {
    for (const page of pages) {
      const fakeDocument = new FakeDocument(page);
      globalThis.document = fakeDocument;
      await importWorkspaceForState(page, fakeDocument, "tabindex", "ready");

      assert.deepEqual(
        fakeDocument.tabs.map((tab) => tab.tabIndex),
        [0, -1, -1, -1],
        `${page.key} initial runtime tabIndex vector`,
      );

      fakeDocument.tabs[2].click();
      assert.deepEqual(
        fakeDocument.tabs.map((tab) => tab.tabIndex),
        [-1, -1, 0, -1],
        `${page.key} pointer activation tabIndex vector`,
      );
      assert.deepEqual(
        fakeDocument.panels.map((panel) => panel.hidden),
        [true, true, false, true],
        `${page.key} pointer activation panel vector`,
      );

      fakeDocument.tabs[2].dispatchKey("Home");
      assert.deepEqual(
        fakeDocument.tabs.map((tab) => tab.tabIndex),
        [0, -1, -1, -1],
        `${page.key} Home key tabIndex vector`,
      );
      assert.equal(fakeDocument.tabs[0].focused, true, `${page.key} Home key moves focus`);

      fakeDocument.tabs[0].dispatchKey("End");
      assert.deepEqual(
        fakeDocument.tabs.map((tab) => tab.tabIndex),
        [-1, -1, -1, 0],
        `${page.key} End key tabIndex vector`,
      );
      assert.equal(fakeDocument.tabs[3].focused, true, `${page.key} End key moves focus`);
    }
  } finally {
    if (previousDocument === undefined) delete globalThis.document;
    else globalThis.document = previousDocument;
  }
});

test("DRS W2 permission denied blocks case-specific navigation and specialist human decisions", async () => {
  const previousDocument = globalThis.document;

  try {
    const specialist = pages.find((page) => page.key === "specialist");
    const fakeDocument = new FakeDocument(specialist, {
      search: "?drs_state=permission-denied",
      actionNames: ["retry-load", "edit-send", "override-send", "manual-send"],
      readyContentCount: 3,
      readyContentPanels: specialist.tabs,
    });
    globalThis.document = fakeDocument;
    await importWorkspaceForState(specialist, fakeDocument, "permission", "permission-denied");

    assert.equal(fakeDocument.body.dataset.drsState, "permission-denied");
    assert.ok(fakeDocument.readyContent.every((element) => element.hidden), "ready-only specialist content is hidden");
    assert.equal(fakeDocument.actions[0].disabled, false, "retry remains available");
    assert.ok(fakeDocument.actions.slice(1).every((element) => element.disabled), "specialist human controls are disabled");
    assert.ok(fakeDocument.tabs.every((tab) => tab.disabled), "all case-specific tabs are disabled");
    assert.ok(fakeDocument.panels.every((panel) => panel.hidden), "permission denied starts with no case panels");
    fakeDocument.tabs[0].click();
    assert.ok(fakeDocument.panels.every((panel) => panel.hidden), "disabled first tab cannot reveal case panels");

    fakeDocument.actions[0].click();
    await flushAsyncWork();
    assert.equal(fakeDocument.body.dataset.drsState, "permission-denied", "retry does not manufacture ready access");

    fakeDocument.actions[1].click();
    await flushAsyncWork();
    assert.equal(fakeDocument.body.dataset.drsState, "permission-denied");
    assert.doesNotMatch(fakeDocument.live.textContent, /EDIT_AND_SEND|OVERRIDE_AND_SEND|MANUAL_EXCEPTION_SEND/u);
    assert.doesNotMatch(fakeDocument.bound.get("final-receipt")[0].textContent, /已建立本頁送出前收據/u);
  } finally {
    if (previousDocument === undefined) delete globalThis.document;
    else globalThis.document = previousDocument;
  }
});

test("DRS specialist ready renderer opens only one panel from fail-closed markup", async () => {
  const previousDocument = globalThis.document;

  try {
    const specialist = pages.find((page) => page.key === "specialist");
    const fakeDocument = new FakeDocument(specialist, {
      search: "?drs_state=ready",
      actionNames: ["request-dimensions"],
      readyContentCount: 4,
      readyContentPanels: specialist.tabs,
      failClosed: true,
    });

    assert.ok(fakeDocument.readyContent.every((element) => element.hidden), "fake static ready content starts closed");
    assert.ok(fakeDocument.tabs.every((tab) => tab.disabled), "fake static tabs start disabled");
    assert.ok(fakeDocument.panels.every((panel) => panel.hidden), "fake static panels start hidden");

    globalThis.document = fakeDocument;
    await importWorkspaceForState(specialist, fakeDocument, "fail-closed-ready", "ready");

    assert.equal(fakeDocument.body.dataset.drsState, "ready");
    assert.ok(fakeDocument.tabs.every((tab) => !tab.disabled), "ready render enables case tabs");
    assert.deepEqual(fakeDocument.tabs.map((tab) => tab.tabIndex), [0, -1, -1, -1], "ready render restores one roving tab stop");
    assert.deepEqual(fakeDocument.panels.map((panel) => panel.hidden), [false, true, true, true], "ready render shows exactly one main panel");
    assert.ok(fakeDocument.readyContent.filter((element) => !fakeDocument.panels.includes(element)).every((element) => !element.hidden), "ready render reveals non-panel case content");
  } finally {
    if (previousDocument === undefined) delete globalThis.document;
    else globalThis.document = previousDocument;
  }
});

test("DRS specialist non-ready states gate every static case-specific region", async () => {
  const html = await readPageSource("specialist_workspace", "code.html");
  const identityStrip = html.match(/<dl\b[^>]*class="identity-strip"[\s\S]*?<\/dl>/u)?.[0] ?? "";

  assert.match(html, /<section\b[^>]*class="decision-band"[^>]*\bdata-drs-ready-content\b[^>]*\bhidden\b/u, "blocked decision band is hidden and ready-only");
  assert.match(html, /<section\b[^>]*class="triage-mode"[^>]*\bdata-drs-ready-content\b[^>]*\bhidden\b/u, "governance inbox and case queue are hidden and ready-only");
  assert.match(identityStrip, /<div><dt>身分與權限<\/dt><dd>正在確認正式 DRS 授權<\/dd><\/div>/u, "identity remains neutral outside ready gate");
  assert.match(identityStrip, /<div\b[^>]*\bdata-drs-ready-content\b[^>]*\bhidden\b[^>]*><dt>選定案件<\/dt><dd data-drs-bind="case-name">/u, "case name identity cell is hidden and ready-only");
  assert.match(identityStrip, /<div\b[^>]*\bdata-drs-ready-content\b[^>]*\bhidden\b[^>]*><dt>案件狀態<\/dt><dd data-drs-bind="current-status">/u, "case status identity cell is hidden and ready-only");
  assert.match(identityStrip, /<div\b[^>]*\bdata-drs-ready-content\b[^>]*\bhidden\b[^>]*><dt>下一步責任人<\/dt><dd data-drs-bind="responsible-role">/u, "next actor identity cell is hidden and ready-only");
});

test("DRS specialist document-derived actions stay inert until a formal document projection exists", async () => {
  const previousDocument = globalThis.document;
  const script = await readPageSource("specialist_workspace", "app.js");

  assert.doesNotMatch(script, /scrollIntoView/u, "embedded review feedback must stay in place without moving the outer preview");

  try {
    const specialist = pages.find((page) => page.key === "specialist");
    const actions = ["request-dimensions", "mark-mismatch", "request-owner-material", "create-consensus"];
    const fakeDocument = new FakeDocument(specialist, {
      search: "?drs_state=ready",
      actionNames: actions,
      readyContentPanels: specialist.tabs,
      hasDecisionResult: true,
    });
    globalThis.document = fakeDocument;
    await importWorkspaceForState(specialist, fakeDocument, "local-truth", "ready");

    for (const [index, actionName] of actions.entries()) {
      const before = fakeDocument.live.textContent;
      assert.equal(fakeDocument.actions[index].disabled, true, `${actionName} is disabled while formal document content is absent`);
      assert.equal(fakeDocument.actions[index].getAttribute("aria-disabled"), "true", `${actionName} exposes its pending state`);
      fakeDocument.actions[index].click();
      assert.equal(fakeDocument.live.textContent, before, `${actionName} cannot create page state without formal evidence`);
      assert.equal(fakeDocument.decisionResult.hidden, true, `${actionName} cannot imply a prepared decision`);
      assert.equal(fakeDocument.decisionResult.scrollIntoViewCalls.length, 0, `${actionName} keeps in-context feedback stationary`);
    }
  } finally {
    if (previousDocument === undefined) delete globalThis.document;
    else globalThis.document = previousDocument;
  }
});

test("DRS specialist quick review cannot fill editor fields without formal document evidence", async () => {
  const previousDocument = globalThis.document;

  try {
    const specialist = pages.find((page) => page.key === "specialist");
    const fakeDocument = new FakeDocument(specialist, {
      search: "?drs_state=ready",
      actionNames: ["mark-mismatch"],
      reviewFieldNames: ["issue-type", "basis-summary", "risk", "request", "next-owner", "response-due", "resolution"],
      readyContentPanels: specialist.tabs,
      hasDecisionResult: true,
    });
    globalThis.document = fakeDocument;
    await importWorkspaceForState(specialist, fakeDocument, "quick-review-fields", "ready");

    fakeDocument.actions[0].click();

    assert.equal(fakeDocument.actions[0].disabled, true, "quick review stays disabled while formal evidence is unavailable");
    for (const name of ["issue-type", "risk", "request", "next-owner", "response-due", "resolution"]) {
      assert.equal(fakeDocument.reviewFields.get(name).value, "", `${name} is not fabricated from a case-only grant`);
    }
  } finally {
    if (previousDocument === undefined) delete globalThis.document;
    else globalThis.document = previousDocument;
  }
});

test("DRS specialist UI human controls do not create final receipts without complete acknowledgement", async () => {
  const previousDocument = globalThis.document;
  const script = await readPageSource("specialist_workspace", "app.js");

  assert.doesNotMatch(script, /\.recordHumanDecision\s*\(/u, "specialist UI must not create final receipt transitions before complete acknowledgement exists");

  try {
    const specialist = pages.find((page) => page.key === "specialist");
    const fakeDocument = new FakeDocument(specialist, {
      search: "?drs_state=ready",
      actionNames: ["edit-send", "override-send", "manual-send"],
      manualFieldNames: ["exception-reason", "urgency", "service-incident-id", "next-actor"],
      readyContentPanels: specialist.tabs,
      hasControlResult: true,
    });
    globalThis.document = fakeDocument;
    await importWorkspaceForState(specialist, fakeDocument, "no-final-receipt", "ready");

    const finalReceipt = fakeDocument.bound.get("final-receipt")[0];
    assert.match(finalReceipt.textContent, /尚未建立送出前收據/u, "ready state starts without final receipt");

    for (const action of fakeDocument.actions.slice(0, 2)) {
      assert.equal(action.disabled, true, `${action.dataset.drsAction} stays disabled without formal evidence`);
      const before = fakeDocument.live.textContent;
      action.click();
      await flushAsyncWork();
      assert.equal(fakeDocument.live.textContent, before, `${action.dataset.drsAction} cannot prepare a send mode`);
    }
    assert.equal(fakeDocument.controlResult.hidden, true, "disabled document send controls do not show a result");
    assert.match(finalReceipt.textContent, /尚未建立送出前收據/u, "disabled controls leave final receipt unchanged");
    assert.doesNotMatch(finalReceipt.textContent, /已建立本頁送出前收據|已完成/u);

    fakeDocument.manualFields.get("exception-reason").value = "需保留人工判斷脈絡。";
    fakeDocument.manualFields.get("urgency").value = "中";
    fakeDocument.manualFields.get("service-incident-id").value = "INC-9123";
    fakeDocument.manualFields.get("next-actor").value = "乙方設計團隊";
    fakeDocument.manualFields.get("next-actor").dispatchInput();
    fakeDocument.actions[2].click();
    await flushAsyncWork();
    assert.match(fakeDocument.live.textContent, /本頁已準備人工例外紀錄/u);
    assert.match(fakeDocument.live.textContent, /原因：需保留人工判斷脈絡/u);
    assert.match(fakeDocument.live.textContent, /急迫程度：中/u);
    assert.match(fakeDocument.live.textContent, /服務事件編號：INC-9123/u);
    assert.match(fakeDocument.live.textContent, /下一步責任人：乙方設計團隊/u);
    assert.match(fakeDocument.live.textContent, /尚未送出、尚未建立正式案件紀錄/u);
    assert.equal(fakeDocument.controlResult.hidden, false, "manual-send shows shared Human-control result");
    assert.match(fakeDocument.controlResult.textContent, /本頁已準備人工例外紀錄/u);
    assert.match(fakeDocument.controlResult.textContent, /原因：需保留人工判斷脈絡/u);
    assert.match(fakeDocument.controlResult.textContent, /急迫程度：中/u);
    assert.match(fakeDocument.controlResult.textContent, /服務事件編號：INC-9123/u);
    assert.match(fakeDocument.controlResult.textContent, /下一步責任人：乙方設計團隊/u);
    assert.match(fakeDocument.controlResult.textContent, /尚未送出、尚未建立正式案件紀錄/u);
    assert.match(fakeDocument.controlResult.textContent, /尚未建立送出前收據/u);
    assert.match(fakeDocument.controlResult.textContent, /此操作目前只保留在本頁；尚未送出，尚未建立正式案件紀錄/u);
    assert.equal(fakeDocument.controlResult.scrollIntoViewCalls.length, 0, "manual-send keeps shared result stationary");
    assert.match(finalReceipt.textContent, /尚未建立送出前收據/u, "manual-send leaves final receipt unchanged");
  } finally {
    if (previousDocument === undefined) delete globalThis.document;
    else globalThis.document = previousDocument;
  }
});

test("DRS specialist runtime model excludes draft or unsent message data before rendering", async () => {
  const previousDocument = globalThis.document;
  const script = await readPageSource("specialist_workspace", "app.js");

  assert.doesNotMatch(script, /drs-data-client\.js|createLocalDrsTransport|createDrsDataClient/u, "specialist page does not request the shared data-client fixture");

  try {
    const specialist = pages.find((page) => page.key === "specialist");
    const fakeDocument = new FakeDocument(specialist, {
      search: "?drs_state=ready",
      readyContentPanels: specialist.tabs,
    });
    globalThis.document = fakeDocument;
    const module = await importWorkspaceForState(specialist, fakeDocument, "privacy-model", "ready");
    const model = await module.loadWorkspaceState(fakeDocument, "ready");
    const serialized = JSON.stringify(model);

    assert.deepEqual(model.messages, [], "specialist ready model does not receive owner/vendor message bodies");
    assert.doesNotMatch(serialized, /草稿|尚未公開|\bunsent\b|\bdraft\b|\btyping\b|hidden reasoning/u, "specialist ready model excludes draft or unsent payloads");
  } finally {
    if (previousDocument === undefined) delete globalThis.document;
    else globalThis.document = previousDocument;
  }
});

test("DRS specialist module import exposes no local authority mutation client", async () => {
  const previousDocument = globalThis.document;

  try {
    const specialist = pages.find((page) => page.key === "specialist");
    const fakeDocument = new FakeDocument(specialist, {
      search: "?drs_state=ready",
      readyContentPanels: specialist.tabs,
    });
    globalThis.document = fakeDocument;
    const module = await importWorkspaceForState(specialist, fakeDocument, "local-client-transition");
    assert.equal(module.createSpecialistWorkspaceClient, undefined, "module callers cannot create or seed an authority-bearing workspace client");
    assert.equal(module.bindSpecialistWorkspaceProjection, undefined, "module callers cannot bind a projection");
    assert.equal(module.createSpecialistCalendarRuntime, undefined, "module callers cannot inject an authority transport");
    assert.equal(module.bootstrapSpecialistCalendarRuntime, undefined, "module callers cannot restart the authority bootstrap");

    const model = await module.loadWorkspaceState(fakeDocument, "ready");
    assert.equal(model.state, "permission-denied", "module import alone cannot manufacture an authorized case");
  } finally {
    if (previousDocument === undefined) delete globalThis.document;
    else globalThis.document = previousDocument;
  }
});

test("DRS specialist cancel control requires Human reason and next actor before local pre-send state", async () => {
  const html = await readPageSource("specialist_workspace", "code.html");
  const previousDocument = globalThis.document;
  const controlPanel = html.match(/<section\b[^>]*id="specialist-panel-control"[\s\S]*?<\/section>/u)?.[0] ?? "";
  const cancelSection = html.match(/<article\b[^>]*data-drs-cancel-control[\s\S]*?<\/article>/u)?.[0] ?? "";

  assert.match(controlPanel, /<p\b[^>]*data-drs-control-result\b[^>]*aria-live="polite"[^>]*hidden/u, "Human control panel has one shared hidden live result");
  assert.match(controlPanel, /data-drs-control-result[\s\S]*?<div class="control-grid">/u, "shared Human-control result sits before the card grid");
  assert.doesNotMatch(controlPanel, /data-drs-cancel-result/u, "cancel no longer uses a narrow card-local result");
  assert.match(cancelSection, /取消原因/u, "cancel section labels reason field");
  assert.match(cancelSection, /取消後下一步責任人/u, "cancel section labels next actor field");
  for (const field of ["reason", "next-actor"]) {
    assert.match(cancelSection, new RegExp(`data-drs-cancel-field="${field}"[\\s\\S]*?\\brequired\\b`, "u"), `cancel field is required: ${field}`);
  }
  assert.match(cancelSection, /data-drs-action="cancel-send"[^>]*\bdisabled\b[^>]*\baria-disabled="true"/u, "cancel action starts disabled");

  try {
    const specialist = pages.find((page) => page.key === "specialist");
    const fakeDocument = new FakeDocument(specialist, {
      search: "?drs_state=ready",
      actionNames: ["cancel-send"],
      cancelFieldNames: ["reason", "next-actor"],
      readyContentPanels: specialist.tabs,
      hasControlResult: true,
    });
    globalThis.document = fakeDocument;
    await importWorkspaceForState(specialist, fakeDocument, "cancel-fields", "ready");

    const cancelButton = fakeDocument.actions[0];
    const finalReceipt = fakeDocument.bound.get("final-receipt")[0];
    assert.equal(cancelButton.disabled, true, "cancel action remains disabled until required fields are filled");
    assert.equal(cancelButton.getAttribute("aria-disabled"), "true");
    assert.match(finalReceipt.textContent, /尚未建立送出前收據/u);

    cancelButton.click();
    assert.doesNotMatch(fakeDocument.live.textContent, /取消本次送出/u, "incomplete cancel action stays inert");

    fakeDocument.cancelFields.get("reason").value = "屋主要求先確認替代材料。";
    fakeDocument.cancelFields.get("next-actor").value = "甲方";
    fakeDocument.cancelFields.get("next-actor").dispatchInput();

    assert.equal(cancelButton.disabled, false, "cancel action enables after reason and next actor are filled");
    assert.equal(cancelButton.getAttribute("aria-disabled"), "false");

    cancelButton.click();
    assert.match(fakeDocument.live.textContent, /本頁已準備取消本次送出/u);
    assert.match(fakeDocument.live.textContent, /取消原因：屋主要求先確認替代材料/u);
    assert.match(fakeDocument.live.textContent, /下一步責任人：甲方/u);
    assert.match(fakeDocument.live.textContent, /尚未送出、尚未建立正式案件紀錄/u);
    assert.equal(fakeDocument.controlResult.hidden, false, "cancel result is shown in the shared Human-control result");
    assert.match(fakeDocument.controlResult.textContent, /本頁已準備取消本次送出/u);
    assert.match(fakeDocument.controlResult.textContent, /取消原因：屋主要求先確認替代材料/u);
    assert.match(fakeDocument.controlResult.textContent, /下一步責任人：甲方/u);
    assert.match(fakeDocument.controlResult.textContent, /尚未送出、尚未建立正式案件紀錄/u);
    assert.match(fakeDocument.controlResult.textContent, /尚未建立送出前收據/u);
    assert.match(fakeDocument.controlResult.textContent, /此操作目前只保留在本頁；尚未送出，尚未建立正式案件紀錄/u);
    assert.equal(fakeDocument.controlResult.scrollIntoViewCalls.length, 0, "cancel keeps shared result stationary");
    assert.match(finalReceipt.textContent, /尚未建立送出前收據/u, "cancel does not create final receipt");
  } finally {
    if (previousDocument === undefined) delete globalThis.document;
    else globalThis.document = previousDocument;
  }
});

test("DRS specialist manual exception uses required Human-entered metadata", async () => {
  const html = await readPageSource("specialist_workspace", "code.html");
  const script = await readPageSource("specialist_workspace", "app.js");
  const visibleText = visibleHtmlText(html);
  const manualSection = html.match(/<article\b[^>]*data-drs-manual-exception[\s\S]*?<\/article>/u)?.[0] ?? "";

  for (const copy of ["人工例外原因", "急迫程度", "服務事件編號", "下一步責任人"]) {
    assert.match(visibleText, new RegExp(copy, "u"), `manual field label: ${copy}`);
  }
  for (const field of ["exception-reason", "urgency", "service-incident-id", "next-actor"]) {
    assert.match(manualSection, new RegExp(`data-drs-manual-field="${field}"[\\s\\S]*?\\brequired\\b`, "u"), `manual field is required: ${field}`);
  }
  assert.match(manualSection, /data-drs-action="manual-send"[^>]*\bdisabled\b[^>]*\baria-disabled="true"/u, "manual action starts disabled");
  assert.doesNotMatch(script, /SERVICE-LOCAL-001|urgency:\s*"高"|專員已確認特殊狀況需要例外紀錄/u, "controller must not fabricate manual exception metadata");
  assert.match(script, /data-drs-manual-field="exception-reason"[\s\S]*?\.value/u, "controller reads reason value");
  assert.match(script, /data-drs-manual-field="urgency"[\s\S]*?\.value/u, "controller reads urgency value");
  assert.match(script, /data-drs-manual-field="service-incident-id"[\s\S]*?\.value/u, "controller reads incident id value");
  assert.match(script, /data-drs-manual-field="next-actor"[\s\S]*?\.value/u, "controller reads next actor value");
});

test("DRS specialist manual exception controller blocks incomplete input and submits entered values", async () => {
  const previousDocument = globalThis.document;

  try {
    const specialist = pages.find((page) => page.key === "specialist");
    const fakeDocument = new FakeDocument(specialist, {
      search: "?drs_state=ready",
      actionNames: ["manual-send"],
      manualFieldNames: ["exception-reason", "urgency", "service-incident-id", "next-actor"],
      readyContentPanels: specialist.tabs,
    });
    globalThis.document = fakeDocument;
    await importWorkspaceForState(specialist, fakeDocument, "manual-fields", "ready");

    const manualButton = fakeDocument.actions[0];
    assert.equal(manualButton.disabled, true, "manual action remains disabled until all required fields are filled");
    assert.equal(manualButton.getAttribute("aria-disabled"), "true");

    manualButton.click();
    await flushAsyncWork();
    assert.doesNotMatch(fakeDocument.live.textContent, /人工例外的本頁送出前紀錄/u, "incomplete manual action does not call decision transition");

    fakeDocument.manualFields.get("exception-reason").value = "現場需要保留人工例外脈絡。";
    fakeDocument.manualFields.get("urgency").value = "中";
    fakeDocument.manualFields.get("service-incident-id").value = "INC-7788";
    fakeDocument.manualFields.get("next-actor").value = "甲方";
    fakeDocument.manualFields.get("next-actor").dispatchInput();

    assert.equal(manualButton.disabled, false, "manual action enables after all required fields are filled");
    assert.equal(manualButton.getAttribute("aria-disabled"), "false");

    manualButton.click();
    await flushAsyncWork();
    assert.match(fakeDocument.live.textContent, /原因：現場需要保留人工例外脈絡/u);
    assert.match(fakeDocument.live.textContent, /急迫程度：中/u);
    assert.match(fakeDocument.live.textContent, /服務事件編號：INC-7788/u);
    assert.match(fakeDocument.live.textContent, /下一步責任人：甲方/u);
    assert.doesNotMatch(fakeDocument.live.textContent, /SERVICE-LOCAL-001|急迫程度：高/u);
  } finally {
    if (previousDocument === undefined) delete globalThis.document;
    else globalThis.document = previousDocument;
  }
});

test("DRS specialist source task separates calendar and authorized LINE context without a permanent side rail", async () => {
  const html = await readPageSource("specialist_workspace", "code.html");
  const visibleText = visibleHtmlText(html);
  const contextTags = extractOpeningTags(html, "data-specialist-context");
  const lineContextTags = contextTags.filter((tag) => tag.value.startsWith("line-"));
  const metaDescription = html.match(/<meta\s+name="description"\s+content="([^"]+)"/u)?.[1] ?? "";

  assert.match(visibleText, /案件決策審核桌/u);
  assert.match(visibleText, /目前審核依據/u);
  assert.match(visibleText, /乙方分享的 Google 日曆/u);
  assert.match(visibleText, /甲方一對一 LINE 對話/u);
  assert.match(visibleText, /甲方 \/ 乙方 \/ DRS 三方群組 LINE 對話/u);
  assert.match(visibleText, /尚未取得事件日期/u);
  assert.match(visibleText, /不顯示推測日期或事件/u);
  assert.match(visibleText, /尚未連結實際 Google 日曆/u);
  assert.match(visibleText, /未連結實際 LINE/u);
  assert.doesNotMatch(visibleText, /正式內容只會在完成授權連結後顯示/u);
  assert.equal(lineContextTags.length, 2, "exactly two LINE context modules");
  assert.deepEqual(lineContextTags.map((tag) => tag.value), ["line-owner", "line-shared"]);
  assert.match(visibleText, /尚未連結或取得此案件的正式 LINE 內容/u);
  assert.match(visibleText, /尚未納入案件依據/u);
  assert.match(visibleText, /尚未連結或取得此案件的三方正式訊息/u);
  assert.match(visibleText, /尚未建立可回查的共用案件紀錄/u);
  assert.doesNotMatch(visibleText, /示意：|甲方詢問 90cm 通道|替代材料影響清潔與檯面高度/u);
  for (const contextName of ["line-owner", "line-shared"]) {
    const moduleHtml = html.match(new RegExp(`<section[^>]+data-specialist-context="${contextName}"[\\s\\S]*?</section>`, "u"))?.[0] ?? "";
    const moduleText = visibleHtmlText(moduleHtml);
    assert.match(moduleText, /尚未連結或取得/u, `${contextName} does not imply real LINE linkage`);
    assert.match(moduleText, /只顯示取得狀態/u, `${contextName} covers unavailable state`);
    assert.match(moduleText, /不顯示(?:訊息)?內容或操作/u, `${contextName} promises no unavailable content or CTA`);
  }
  for (const copy of ["未連結", "無正式紀錄", "未授權"]) {
    assert.match(visibleText, new RegExp(copy, "u"), `LINE unavailable copy: ${copy}`);
  }
  for (const tag of contextTags) {
    assert.match(tag.tag, /\bdata-drs-ready-content\b/u, `${tag.value} is hidden outside ready state`);
    assert.match(tag.tag, /\btabindex="0"/u, `${tag.value} can receive keyboard focus when its compact content scrolls`);
  }
  assert.doesNotMatch(html, /<aside\b[^>]*class="evidence-rail"/u, "Calendar and LINE are not a permanent right rail");
  const sourcesPanel = html.match(/<section\b[^>]*id="specialist-panel-sources"[\s\S]*?<section\b[^>]*id="specialist-panel-opinion"/u)?.[0] ?? "";
  for (const contextName of ["calendar", "line-owner", "line-shared"]) {
    assert.match(sourcesPanel, new RegExp(`data-specialist-context="${contextName}"`, "u"), `${contextName} lives inside the source task panel`);
  }
  assert.doesNotMatch(metaDescription, /assigned Human reviewer/u);
});

test("DRS specialist normal ready layout keeps one primary task and replaces the permanent information wall with explicit work modes", async () => {
  const html = await readPageSource("specialist_workspace", "code.html");
  const styles = await readPageSource("specialist_workspace", "styles.css");
  const stateGridTag = html.match(/<section\b[^>]*class="state-grid"[^>]*>/u)?.[0] ?? "";

  assert.match(stateGridTag, /\bdata-drs-state-fixtures\b/u, "state fixture grid remains addressable in source");
  assert.match(stateGridTag, /\bhidden\b/u, "normal ready render does not expose the state fixture grid");
  assert.doesNotMatch(stateGridTag, /\bdata-drs-ready-content\b/u, "renderer must not unhide state fixtures during ready rendering");
  assert.match(styles, /@media \(max-width: 680px\)/u, "mobile breakpoint exists");
  assert.doesNotMatch(html, /class="case-rail"|class="evidence-rail"/u, "legacy permanent queue and context rails are removed");
  assert.match(styles, /\.workspace-shell\s*\{[\s\S]*?grid-template-columns:\s*minmax\(0,\s*1fr\)/u, "desktop workspace has one primary work column");
  assert.doesNotMatch(styles, /grid-template-columns:\s*250px minmax\(0,\s*1fr\) 400px/u, "rejected three-column layout is removed");
  assert.doesNotMatch(styles, /\.evidence-rail\s*\{[\s\S]*?position:\s*sticky/u, "context does not remain as a sticky side rail");
  assert.match(styles, /\.task-tabs\s*\{[\s\S]*?position:\s*sticky/u, "primary task switch remains available while working");
  assert.match(html, /data-workbench-mode="triage"/u, "case triage is a distinct work mode");
  assert.match(html, /data-workbench-mode="review"/u, "document review is a distinct work mode");
  assert.match(styles, /\.review-focus-shell\s*\{[\s\S]*?grid-template-columns:\s*72px minmax\(720px,\s*1fr\) minmax\(360px,\s*420px\)/u, "focused review gives the document a protected minimum width");
});

test("DRS specialist exposes four progressive-disclosure task groups with collapsed summaries", async () => {
  const html = await readPageSource("specialist_workspace", "code.html");
  const tabTags = extractOpeningTags(html, "data-drs-tab");

  assert.deepEqual(tabTags.map((tab) => tab.value), ["documents", "sources", "opinion", "record"]);
  assert.deepEqual(tabTags.map((tab) => attributeValue(tab.tag, "data-task-label")), ["文件審查", "訊息來源", "審查意見", "送出與留痕"]);
  for (const tab of tabTags) {
    assert.match(tab.tag, /data-task-summary="[^"]+"/u, `${tab.value} preserves a collapsed summary`);
    assert.match(tab.tag, /data-task-status="(?:REVIEW|ACTION|COMPLETE)"/u, `${tab.value} exposes a text status role`);
  }
  assert.equal((html.match(/\bdata-primary-action\b/gu) ?? []).length, 1, "one clear primary action exists across the work surface");
});

test("DRS specialist message sources separate party A, party B, DRS output, formal record and schedule", async () => {
  const html = await readPageSource("specialist_workspace", "code.html");
  const sourceTabs = extractOpeningTags(html, "data-source-tab");
  const sourcePanels = extractOpeningTags(html, "data-source-panel");

  assert.deepEqual(sourceTabs.map((tab) => tab.value), ["party-a", "party-b", "drs-output", "formal-record", "schedule"]);
  assert.deepEqual(sourcePanels.map((panel) => panel.value), ["party-a", "party-b", "drs-output", "formal-record", "schedule"]);
  for (const label of ["甲方輸入", "乙方輸入", "DRS 輸出", "三方正式紀錄", "時程"]) {
    assert.match(visibleHtmlText(html), new RegExp(label, "u"), `source direction label: ${label}`);
  }
  assert.match(html, /data-source-role="甲方輸入"[\s\S]*data-source-sender="屋主"/u, "party A identity uses readable role and sender labels");
  assert.match(html, /data-source-role="乙方輸入"[\s\S]*data-source-sender="乙方設計團隊"/u, "party B identity uses readable role and sender labels");
  assert.match(html, /data-source-role="DRS 輸出"[\s\S]*data-source-sender="指派 DRS 專員"/u, "DRS output stays separate from formal records");
  assert.match(html, /data-source-role="三方正式紀錄"/u, "formal case records are distinct from messages");
});

test("DRS specialist review opinion follows evidence, request, response lifecycle and sends through one primary entry", async () => {
  const html = await readPageSource("specialist_workspace", "code.html");
  const opinionPanel = html.match(/<section\b[^>]*id="specialist-panel-opinion"[\s\S]*?<\/section>/u)?.[0] ?? "";

  const opinionText = visibleHtmlText(opinionPanel);
  assert.match(opinionText, /01\s+問題與依據/u);
  assert.match(opinionText, /02\s+要求與責任/u);
  assert.match(opinionText, /03\s+回覆與完成/u);
  assert.match(opinionPanel, /data-drs-action="save-review-draft"/u);
  assert.match(opinionPanel, /data-drs-action="request-peer-review"/u);
  assert.match(opinionPanel, /data-drs-action="edit-send"/u);
  assert.match(opinionPanel, /data-drs-action="override-send"/u);
  assert.match(opinionPanel, /data-drs-action="submit-presend-review"[^>]*data-primary-action/u, "presend review is the single primary entry");
  assert.match(html, /<details\b[^>]*class="low-frequency-controls"/u, "manual exceptions and cancel actions are disclosed only when needed");
});

test("DRS specialist implements OBSIDIAN BLOOM semantic tokens without legacy green dashboard accents", async () => {
  const styles = await readPageSource("specialist_workspace", "styles.css");

  for (const [token, value] of [["obsidian", "#09070b"], ["night-plum", "#161019"], ["plum-surface", "#28182d"], ["violet-plum", "#5a2f66"], ["twilight-blush", "#c26ac6"], ["dark-rose", "#ff79c9"], ["paper", "#f3eef5"]]) {
    assert.match(styles.toLowerCase(), new RegExp(`--${token}:\\s*${value}`, "u"), `OBSIDIAN BLOOM token ${token}`);
  }
  assert.doesNotMatch(styles, /--green:|--amber:|--clay:|--blue:/u, "legacy palette roles are removed from this page");
  assert.match(styles, /\[data-task-status="REVIEW"\]/u, "review status has an explicit selector");
  assert.match(styles, /\[data-task-status="ACTION"\]/u, "action status has an explicit selector");
  assert.match(styles, /\[data-task-status="COMPLETE"\]/u, "complete status has an explicit selector");
});

test("DRS specialist maps moodboard signals to semantic review action and complete roles", async () => {
  const html = await readPageSource("specialist_workspace", "code.html");
  const styles = await readPageSource("specialist_workspace", "styles.css");
  const lowerStyles = styles.toLowerCase();

  for (const [token, value] of [
    ["signal-review", "#c26ac6"],
    ["signal-action", "#ff79c9"],
    ["signal-complete", "#c8c2cd"],
    ["signal-blocker", "#f75000"],
    ["signal-attention", "#ffaa45"],
  ]) {
    assert.match(
      lowerStyles,
      new RegExp(`--${token}:\\s*${value}`, "u"),
      `semantic OBSIDIAN BLOOM token ${token}`,
    );
  }

  for (const [status, role] of [
    ["REVIEW", "review"],
    ["ACTION", "action"],
    ["COMPLETE", "complete"],
  ]) {
    assert.match(
      styles,
      new RegExp(
        `\\[data-task-status="${status}"\\]\\s*\\{[^}]*--task-signal:\\s*var\\(--signal-${role}\\)`,
        "u",
      ),
      `${status} maps to its moodboard signal`,
    );
  }

  assert.match(
    html,
    /<div\b[^>]*data-signal="blocker"[^>]*>\s*<dt>最高優先卡點<\/dt>/u,
    "the governance inbox exposes a semantic blocker hook",
  );

  assert.doesNotMatch(
    lowerStyles,
    /\[data-task-status="(?:review|action|complete)"\][^}]*#[0-9a-f]{6}/u,
    "task states do not use page-local hard-coded colors",
  );
});

test("DRS specialist reserves high-chroma accents for semantic state and focus", async () => {
  const styles = await readPageSource("specialist_workspace", "styles.css");

  assert.match(
    styles,
    /dt\s*\{[^}]*color:\s*var\(--dim\)/u,
    "ordinary definition labels use a neutral text role",
  );

  assert.match(
    styles,
    /\.blocked-grid\s+\[data-signal\]\s+dt\s*\{[^}]*color:\s*var\(--decision-signal\)/u,
    "semantic decision labels recover their state color",
  );

  assert.match(
    styles,
    /\.source-identity\s*\{[^}]*border-left:\s*3px solid var\(--edge-strong\)/u,
    "source identity uses a neutral grouping edge",
  );

  for (const selector of [
    "context-state",
    "record-boundary",
    "editor-boundary",
    "boundary",
  ]) {
    assert.match(
      styles,
      new RegExp(`\\.${selector}[^}]*border-left:\\s*3px solid var\\(--edge-strong\\)`, "u"),
      `${selector} uses a neutral information boundary`,
    );
  }
});

test("DRS specialist quiet depth uses surfaces and spacing before container borders", async () => {
  const styles = await readPageSource("specialist_workspace", "styles.css");

  assert.match(
    styles,
    /\.workspace-status\s*\{[^}]*border:\s*0/u,
    "workspace status sits in the main surface without another card border",
  );

  assert.match(
    styles,
    /\.blocked-grid\s*\{[^}]*background:\s*transparent/u,
    "decision facts do not form a card sea",
  );

  assert.match(
    styles,
    /\.blocked-grid div[^}]*background:\s*transparent/u,
    "individual decision facts use shared surface depth",
  );

  assert.match(
    styles,
    /\.main-tab-panel\s*\{[^}]*border-color:\s*var\(--edge-default\)/u,
    "the active work panel keeps one quiet boundary",
  );
});

test("DRS specialist desk keeps AI advisory and Human audit authority product-safe", async () => {
  const html = await readPageSource("specialist_workspace", "code.html");
  const script = await readPageSource("specialist_workspace", "app.js");
  const visibleText = visibleHtmlText(html);
  const decisionBand = html.match(/<section\b[^>]*class="decision-band"[\s\S]*?<\/section>/u)?.[0] ?? "";
  const decisionBandText = visibleHtmlText(decisionBand);

  assert.match(visibleText, /AI 只提醒可能風險與缺漏，不能核准、否決、送出或覆核/u);
  assert.match(decisionBand, /\bdata-drs-ready-content\b[^>]*\bhidden\b/u, "authority summary lives inside the ready-only first-view decision band");
  assert.match(decisionBandText, /AI 只提醒可能風險與缺漏/u, "first-view decision band explains AI advisory boundary");
  assert.match(decisionBandText, /不能核准、否決、送出或覆核/u, "first-view decision band says AI cannot approve, veto, send, or review");
  assert.match(decisionBandText, /所有決策與留痕都由人類 DRS 完成/u, "first-view decision band explains Human-only control authority");
  assert.equal((decisionBandText.match(/AI 只/gu) ?? []).length, 1, "the first-view AI authority restriction is stated once without duplicate copy");
  assert.match(visibleText, /取消本次送出|編輯後送出|覆核後送出|建立人工例外紀錄/u, "the review desk names Human-only decisions");
  assert.doesNotMatch(visibleText, /AI\s*(?:核准|否決|送出)|自動核准|自動否決|自動送出/u);
  for (const copy of ["正式權限與稽核紀錄尚未取得", "此操作目前只保留在本頁", "目前審核依據", "對話來源", "處理結果", "下一步責任人"]) {
    assert.match(`${visibleText}\n${script}`, new RegExp(copy, "u"), `audit footprint includes ${copy}`);
  }
  assert.doesNotMatch(`${visibleText}\n${script}`, /完成操作時記錄|不可變更稽核/u);
  assert.doesNotMatch(`${visibleText}\n${script}`, /本頁操作時間：本頁操作/u);
  for (const copy of ["要求乙方補尺寸", "標記圖面與報價不一致", "要求甲方確認替代材料", "建立三方共識紀錄", "取消本次送出", "編輯後送出", "覆核後送出", "建立人工例外紀錄"]) {
    assert.match(visibleText, new RegExp(copy, "u"), `decision operation ${copy}`);
  }
  assert.match(visibleText, /儲存草稿/u, "DRS can keep a bounded local review draft");
  assert.doesNotMatch(visibleText, /打字中|按鍵|隱藏推理|中間編修/u);
  assert.doesNotMatch(script, /AI never sends by itself/u);
});

test("DRS specialist document workspace identifies every review source and its honest availability", async () => {
  const html = await readPageSource("specialist_workspace", "code.html");
  const documentTags = extractOpeningTags(html, "data-review-document");
  const selectedDocument = html.match(/<section\b[^>]*data-selected-document[\s\S]*?<\/section>/u)?.[0] ?? "";
  const unavailableStates = html.match(/<section\b[^>]*data-document-unavailable[\s\S]*?<\/section>/u)?.[0] ?? "";

  assert.deepEqual(documentTags, [], "no document item exists before an admitted document projection");
  for (const label of ["文件種類", "版本", "提供者", "更新時間", "是否已取得正式內容", "目前風險／待補狀態", "下一步責任人"]) {
    assert.match(visibleHtmlText(selectedDocument), new RegExp(label, "u"), `selected document shows ${label}`);
  }
  for (const copy of ["尚未取得正式文件", "等待補件", "可開始審查", "審查草稿", "尚未送出", "已有正式留痕", "暫時不可用", "權限不足"]) {
    assert.match(visibleHtmlText(unavailableStates), new RegExp(copy, "u"), `honest document state: ${copy}`);
  }
  assert.match(visibleHtmlText(html), /尚未讀取正式文件內容/u, "document preview does not fabricate source content");
  assert.doesNotMatch(visibleHtmlText(html), /已完成真實文件比對|已讀取正式 PDF/u);
});

test("focused RED: specialist ready state requires strict server transport and exposes no authority binder", async () => {
  const previousDocument = globalThis.document;
  const previousFetch = globalThis.fetch;
  const previousLocalStorage = globalThis.localStorage;
  const previousSessionStorage = globalThis.sessionStorage;
  try {
    const specialist = pages.find((page) => page.key === "specialist");
    const deniedDocument = new FakeDocument(specialist, {
      search: "?caseId=attacker&specialistId=attacker&grant=attacker",
      readyContentCount: 3,
      readyContentPanels: specialist.tabs,
      failClosed: true,
    });
    deniedDocument.body.dataset.caseId = "attacker";
    deniedDocument.body.dataset.specialistId = "attacker";
    deniedDocument.body.dataset.grant = "attacker";
    globalThis.document = deniedDocument;
    globalThis.localStorage = { getItem: () => JSON.stringify({ caseId: "attacker", grant: "attacker" }) };
    globalThis.sessionStorage = { getItem: () => JSON.stringify({ caseId: "attacker", grant: "attacker" }) };
    globalThis.fetch = async () => { throw new Error("server unavailable"); };
    const deniedModule = await importWorkspaceForState(specialist, deniedDocument, "projection-gate-denied");

    const denied = await deniedModule.loadWorkspaceState(deniedDocument, "ready");
    assert.equal(denied.state, "permission-denied");
    assert.ok(deniedDocument.readyContent.every((element) => element.hidden));
    for (const exportedAuthoritySeam of ["bindSpecialistWorkspaceProjection", "createSpecialistWorkspaceClient", "createSpecialistCalendarRuntime", "bootstrapSpecialistCalendarRuntime"]) {
      assert.equal(deniedModule[exportedAuthoritySeam], undefined, `${exportedAuthoritySeam} is private to the production bootstrap`);
    }

    const serverCalls = [];
    const admittedDocument = new FakeDocument(specialist, {
      search: "?caseId=attacker&specialistId=attacker&grant=attacker",
      readyContentCount: 3,
      readyContentPanels: specialist.tabs,
      failClosed: true,
    });
    globalThis.document = admittedDocument;
    globalThis.fetch = createSpecialistServerFetch(serverCalls);
    const admittedModule = await import(`../src/stitch_laibe_landing_onboarding/drs_standalone/${specialist.directory}/app.js?projection-gate-admitted=${Date.now()}`);
    await flushAsyncWork();
    const admitted = await admittedModule.loadWorkspaceState(admittedDocument, "ready");
    assert.equal(admitted.state, "ready");
    assert.deepEqual(admitted.case, {
      caseId: "11111111-1111-4111-8111-111111111111",
      caseName: "已授權案件",
      currentStatus: "審查進行中",
      currentResponsibleRole: "DRS 專員",
      waitingFor: "尚未取得正式文件",
      nextAction: "先核對文件來源與版本；正式文件資料尚未取得前，審查與送出維持停用。",
    });
    assert.deepEqual(admitted.documents, { state: "pending", label: "尚未取得正式文件", items: [] });
    assert.doesNotMatch(admittedDocument.bound.get("case-name")[0].textContent, /11111111|attacker/u);
    assert.deepEqual(serverCalls.filter(({ url }) => url === "/functions/v1/drs-workspace-grant").map(({ options }) => ({
      method: options.method,
      credentials: options.credentials,
      body: options.body,
    })), [{ method: "POST", credentials: "same-origin", body: "{}" }], "ready follows exactly one strict workspace-grant transport call");
    assert.equal(serverCalls.some(({ url }) => /\/api\/drs\/(?:documents|document-versions|document-snapshots)/u.test(url)), false, "authority bootstrap makes no document route call");

    const script = await readPageSource("specialist_workspace", "app.js");
    assert.doesNotMatch(script, /URLSearchParams|location\.search|localStorage|sessionStorage|dataset\.(?:caseId|specialistId|assignmentId|grant|documentRef|bucket|path)/u);
  } finally {
    if (previousDocument === undefined) delete globalThis.document;
    else globalThis.document = previousDocument;
    if (previousFetch === undefined) delete globalThis.fetch;
    else globalThis.fetch = previousFetch;
    if (previousLocalStorage === undefined) delete globalThis.localStorage;
    else globalThis.localStorage = previousLocalStorage;
    if (previousSessionStorage === undefined) delete globalThis.sessionStorage;
    else globalThis.sessionStorage = previousSessionStorage;
  }
});

test("focused RED: document review stays pending without route calls and names every decision state", async () => {
  const html = await readPageSource("specialist_workspace", "code.html");
  const script = await readPageSource("specialist_workspace", "app.js");
  const transport = await readPageSource("specialist_workspace", "drs-workspace-transport.js");
  const visibleText = visibleHtmlText(html);

  assert.match(html, /id="governance-inbox"/u);
  assert.match(html, /id="case-review-engineering"/u);
  assert.match(html, /data-document-contract="blocked"/u);
  assert.doesNotMatch(`${script}\n${transport}`, /\/api\/drs\/(?:documents|document-versions|document-snapshots)/u);
  assert.doesNotMatch(visibleText, /廚具項目與修訂條件|平面配置|三方 LINE 正式紀錄/u, "no fabricated document or review item appears before the read model");
  for (const copy of ["尚未取得正式文件", "等待補件", "可開始審查", "審查草稿", "尚未送出", "已有正式留痕", "暫時不可用", "權限不足"]) {
    assert.match(visibleText, new RegExp(copy, "u"), `document decision state ${copy}`);
  }
  assert.match(visibleText, /草稿不是正式案件紀錄/u);
  assert.match(visibleText, /AI 只提醒可能風險與缺漏，不能核准、否決、送出或覆核/u);
  assert.doesNotMatch(visibleText, forbiddenUserCopy);
});

test("DRS specialist review basis supports an explicit location and removable evidence", async () => {
  const html = await readPageSource("specialist_workspace", "code.html");
  const script = await readPageSource("specialist_workspace", "app.js");
  const basisWorkspace = html.match(/<section\b[^>]*data-review-basis-workspace[\s\S]*?<\/section>/u)?.[0] ?? "";

  assert.match(basisWorkspace, /data-review-document-select/u, "basis editor selects a source document");
  assert.match(basisWorkspace, /data-citation-location/u, "basis editor captures page, drawing area, quotation item, or message time");
  assert.match(basisWorkspace, /data-drs-action="add-review-basis"[^>]*\bdisabled\b/u, "adding basis starts disabled until a location is entered");
  assert.match(basisWorkspace, /data-review-basis-list/u, "selected evidence has a dedicated list");
  assert.match(script, /data-remove-review-basis/u, "selected evidence can be removed");
  assert.match(script, /function addReviewBasis/u, "basis addition has a real controller flow");
  assert.match(script, /function removeReviewBasis/u, "basis removal has a real controller flow");
});

test("DRS specialist review comment editor requires complete Human input before a presend snapshot", async () => {
  const html = await readPageSource("specialist_workspace", "code.html");
  const script = await readPageSource("specialist_workspace", "app.js");
  const editor = html.match(/<section\b[^>]*data-review-editor[\s\S]*?<\/section>/u)?.[0] ?? "";
  const snapshotPanel = html.match(/<section\b[^>]*id="specialist-panel-snapshot"[\s\S]*?<\/section>/u)?.[0] ?? "";

  for (const field of ["issue-type", "risk", "request", "next-owner", "response-due", "resolution"]) {
    assert.match(editor, new RegExp(`data-review-field="${field}"`, "u"), `editable review field: ${field}`);
  }
  for (const action of ["edit-send", "override-send", "submit-presend-review"]) {
    assert.match(editor, new RegExp(`data-drs-action="${action}"`, "u"), `review editor action: ${action}`);
  }
  assert.match(editor, /data-drs-action="submit-presend-review"[^>]*\bdisabled\b/u, "presend submission starts disabled");
  assert.match(snapshotPanel, /data-presend-snapshot-empty/u, "snapshot starts with an honest empty state");
  assert.match(snapshotPanel, /data-presend-snapshot-content[^>]*\bhidden\b/u, "snapshot details are hidden before explicit Human submission");
  for (const field of ["reviewer", "case", "documents", "conversation", "outcome", "next-owner"]) {
    assert.match(snapshotPanel, new RegExp(`data-presend-bind="${field}"`, "u"), `snapshot field: ${field}`);
  }
  assert.match(script, /function buildPreSendSnapshot/u, "snapshot is built from explicit editor values");
  assert.match(script, /intent === "submit-presend-review"/u, "only the explicit submission action creates the snapshot state");
  assert.match(script, /setBoundText\(root,\s*"\[data-drs-bind=\\"snapshot-title\\"\]"/u, "local snapshot rendering updates the shared title bind");
  assert.match(script, /function setTaskSummary\(root,\s*task,\s*summary\)/u, "collapsed task summaries have a dedicated state synchronizer");
  assert.match(script, /setTaskSummary\(root,\s*"record",\s*preSendSnapshot\s*\?\s*"快照已建立｜尚未對外送出"\s*:\s*stalePreSendSnapshot\s*\?\s*"快照已過期｜需重新建立"\s*:\s*"快照未建立｜尚未送出"\)/u, "record task summary distinguishes current, stale and absent snapshots");
  assert.doesNotMatch(script, /localStorage|sessionStorage/u, "editing state is not persisted in browser storage");
});

test("DRS specialist source constrains AI states and covers disconnected privacy", async () => {
  const html = await readPageSource("specialist_workspace", "code.html");
  const script = await readPageSource("specialist_workspace", "app.js");
  const visibleText = visibleHtmlText(html);

  for (const state of ["REVIEW_COMPLETED_NO_FLAG", "REVIEW_COMPLETED_ATTENTION", "REVIEW_SERVICE_UNAVAILABLE"]) {
    assert.match(script, new RegExp(state, "u"), `allowed AI state ${state}`);
  }
  assert.match(html, /data-drs-state-option="disconnected"/u, "disconnected state is exercisable");
  assert.match(script, /disconnected:/u, "disconnected product copy is modeled");
  assert.match(html, /<nav\b[^>]*class="rail-tabs"[^>]*\binert\b/u, "main tabs fail closed as inert in static markup");
  assert.doesNotMatch(`${visibleText}\n${script}`, /按鍵|打字中|未送出文字|隱藏推理|中間編修/u);
});

test("DRS specialist retry action is generic and available only for recoverable states", async () => {
  const html = await readPageSource("specialist_workspace", "code.html");
  const script = await readPageSource("specialist_workspace", "app.js");
  const retryTag = html.match(/<button\b[^>]*data-drs-action="retry-load"[^>]*>/u)?.[0] ?? "";

  assert.match(retryTag, /\bhidden\b/u, "retry starts hidden before controller state resolves");
  assert.doesNotMatch(retryTag, /data-drs-ready-content/u, "generic retry is not trapped inside ready-only content");
  assert.match(script, /function syncRetryAction/u, "controller owns retry visibility by product state");
  assert.match(script, /retryable-error[\s\S]*disconnected/u, "only recoverable states expose retry");
});

test("DRS W2 user-facing source and runtime strings hide internal enums and engineering copy", async () => {
  const dynamicFiles = [
    path.join(drsRoot, "shared", "drs-data-client.js"),
    path.join(drsRoot, "shared", "drs-workspace-renderer.js"),
    path.join(drsRoot, "owner_workspace", "app.js"),
    path.join(drsRoot, "vendor_workspace", "app.js"),
    path.join(drsRoot, "specialist_workspace", "app.js"),
  ];

  for (const page of pages) {
    const html = await readPageSource(page.directory, "code.html");
    const visibleText = visibleHtmlText(html);
    assert.doesNotMatch(visibleText, forbiddenUserCopy, `${page.key} visible HTML`);
  }

  for (const file of dynamicFiles) {
    const source = await readFile(file, "utf8");
    const stringLiterals = [...source.matchAll(/"([^"\\]*(?:\\.[^"\\]*)*)"|'([^'\\]*(?:\\.[^'\\]*)*)'|`([^`\\]*(?:\\.[^`\\]*)*)`/gu)]
      .map((match) => match[1] ?? match[2] ?? match[3] ?? "")
      .filter((value) => /[\u4e00-\u9fff]|\s/u.test(value))
      .join("\n");
    assert.doesNotMatch(stringLiterals, forbiddenUserCopy, path.relative(repositoryRoot, file));
  }
});

test("DRS W2 ready initial render keeps exactly one registered panel visible", async () => {
  const previousDocument = globalThis.document;

  try {
    for (const page of pages) {
      const fakeDocument = new FakeDocument(page, {
        search: "?drs_state=ready",
        readyContentPanels: page.tabs,
      });
      globalThis.document = fakeDocument;
      await importWorkspaceForState(page, fakeDocument, "ready-initial", "ready");

      assert.equal(fakeDocument.tabs.filter((tab) => tab.getAttribute("aria-selected") === "true").length, 1, `${page.key} one initial selected tab`);
      assert.equal(fakeDocument.tabs.filter((tab) => tab.tabIndex === 0).length, 1, `${page.key} one initial tab stop`);
      assert.equal(fakeDocument.panels.filter((panel) => !panel.hidden).length, 1, `${page.key} one initial visible panel`);
      assert.deepEqual(
        fakeDocument.panels.map((panel) => panel.hidden),
        page.tabs.map((tab) => tab !== page.initialTab),
        `${page.key} initial registered panel visibility`,
      );
    }
  } finally {
    if (previousDocument === undefined) delete globalThis.document;
    else globalThis.document = previousDocument;
  }
});

test("DRS W2 permission denied hides vendor document content while ready tabs still work", async () => {
  const previousDocument = globalThis.document;

  try {
    const vendor = pages.find((page) => page.key === "vendor");
    const deniedDocument = new FakeDocument(vendor, {
      search: "?drs_state=permission-denied",
      actionNames: ["open-reply", "document-response"],
      readyContentCount: 2,
      readyContentPanels: vendor.tabs,
    });
    globalThis.document = deniedDocument;
    await importWorkspaceForState(vendor, deniedDocument, "vendor-denied", "permission-denied");

    assert.equal(deniedDocument.body.dataset.drsState, "permission-denied");
    assert.ok(deniedDocument.readyContent.every((element) => element.hidden), "vendor document content hidden");
    assert.ok(deniedDocument.actions.every((element) => element.disabled), "vendor document actions disabled");
    deniedDocument.actions[0].click();
    assert.ok(deniedDocument.panels.every((panel) => panel.hidden), "denied action does not reveal case panels");

    const readyDocument = new FakeDocument(vendor, {
      search: "?drs_state=ready",
      actionNames: ["open-reply"],
      readyContentCount: 2,
    });
    globalThis.document = readyDocument;
    await importWorkspaceForState(vendor, readyDocument, "vendor-ready", "ready");
    readyDocument.actions[0].click();
    assert.deepEqual(readyDocument.panels.map((panel) => panel.hidden), [true, true, false, true], "ready action still opens documents panel");
    assert.deepEqual(readyDocument.tabs.map((tab) => tab.tabIndex), [-1, -1, 0, -1], "ready roving tabindex remains intact");
  } finally {
    if (previousDocument === undefined) delete globalThis.document;
    else globalThis.document = previousDocument;
  }
});

test("DRS W1 owner live feedback does not use a mobile fixed overlay", async () => {
  const styles = await readPageSource("owner_workspace", "styles.css");
  const liveRegionRule = styles.match(/\.live-region\s*\{[^}]+\}/u)?.[0] ?? "";
  assert.doesNotMatch(liveRegionRule, /position:\s*fixed/u);
  assert.match(liveRegionRule, /min-height:\s*44px/u);
  assert.match(styles, /\[hidden\]\s*\{\s*display:\s*none\s*!important;\s*\}/u);
});

test("DRS W1 user-facing source removes forbidden engineering and bidding/payment copy", async () => {
  for (const page of pages) {
    const html = await readPageSource(page.directory, "code.html");
    const visibleText = visibleHtmlText(html);
    assert.doesNotMatch(visibleText, forbiddenUserCopy, page.key);
  }
});

test("DRS W1 documentation records mock boundary, validations, gaps, and next safe action", async () => {
  const doc = await readFile(workspaceDocPath, "utf8");
  assert.match(doc, /W1 local static candidate/u);
  assert.match(doc, /mock data boundary/u);
  assert.match(doc, /OWNER_DRS_PRIVATE/u);
  assert.match(doc, /OWNER_VENDOR_DRS_SHARED/u);
  assert.match(doc, /AI never sends by itself/u);
  assert.match(doc, /Next safe action/u);
  assert.match(doc, /A0 existing website UI is immutable/u);
  assert.match(doc, /candidate must stay isolated/u);
  assert.match(doc, /read-only re-review and candidate freeze only/u);
  assert.doesNotMatch(doc, /route[- ]integration|page registry|CTA map|canonical UI integration|canonical browser runtime/iu);
});

test("DRS W1/W2 write set stays inside the explicit standalone workspace allowlist", async () => {
  const top = await readdir(drsRoot);
  assert.deepEqual(
    top.sort(),
    ["owner_workspace", "shared", "specialist_workspace", "vendor_workspace"],
  );
});

test("DRS W2 documentation records isolated data binding and external holds", async () => {
  const doc = await readFile(workspaceW2DocPath, "utf8");
  assert.match(doc, /local data-client boundary/u);
  assert.match(doc, /createDrsDataClient/u);
  assert.match(doc, /createLocalDrsTransport/u);
  assert.match(doc, /permission denied/u);
  assert.match(doc, /owner sees `OWNER_DRS_PRIVATE` and `OWNER_VENDOR_DRS_SHARED`/u);
  assert.match(doc, /vendor sees only `OWNER_VENDOR_DRS_SHARED`/u);
  assert.match(doc, /No canonical admission/u);
});
