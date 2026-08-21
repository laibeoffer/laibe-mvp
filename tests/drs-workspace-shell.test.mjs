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
    title: /DRS 專員工作台｜LaiBE DRS/u,
    tabs: ["queue", "snapshot", "control", "timeline"],
    initialTab: "queue",
    requiredCopy: [
      "案件佇列",
      "AI 初步檢核",
      "編修後建立送出前紀錄",
      "覆寫提醒並建立紀錄",
      "人工例外紀錄",
      "複雜文件編輯",
      "批次圖面檢視",
      "AI 不會自行送出，也不是核准者",
    ],
  },
]);

const forbiddenUserCopy = /\b(?:PCM|tender|bid|award|bidding|mock|API|DB|debug|disabled|production|n8n|escrow|payment|Budget Engine|PricingRule|BudgetEstimateLine|Plancraft|OWNER_DRS_PRIVATE|OWNER_VENDOR_DRS_SHARED|AI advisory statuses|Human final controls|EDIT_AND_SEND|OVERRIDE_AND_SEND|MANUAL_EXCEPTION_SEND|candidate)\b|候選|投標|招標|決標|競標|金流託管|支付託管|代收代付|老屋煉金術|投資報酬/u;

async function readPageSource(directory, file) {
  return readFile(path.join(drsRoot, directory, file), "utf8");
}

function extractOpeningTags(html, attributeName) {
  return [...html.matchAll(new RegExp(`<[^>]+\\b${attributeName}="([^"]+)"[^>]*>`, "gu"))].map((match) => ({
    value: match[1],
    tag: match[0],
  }));
}

function attributeValue(tag, name) {
  return tag.match(new RegExp(`\\b${name}="([^"]*)"`, "u"))?.[1] ?? "";
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
  constructor({ dataset = {}, textContent = "" } = {}) {
    this.dataset = dataset;
    this.textContent = textContent;
    this.innerHTML = "";
    this.hidden = false;
    this.disabled = false;
    this.tabIndex = 0;
    this.classList = new FakeClassList();
    this.attributes = new Map();
    this.listeners = new Map();
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

  focus() {
    this.focused = true;
  }

  setAttribute(name, value) {
    this.attributes.set(name, value);
  }

  getAttribute(name) {
    return this.attributes.get(name) ?? null;
  }
}

class FakeDocument {
  constructor(page, { search = "", actionNames = [], stateOptions = [], readyContentCount = 0, readyContentPanels = [] } = {}) {
    this.location = { search };
    this.body = new FakeElement();
    this.tabs = page.tabs.map((tab, index) => {
      const element = new FakeElement({ dataset: { drsTab: tab }, textContent: tab });
      element.tabIndex = index === 0 ? 0 : -1;
      element.setAttribute("aria-selected", index === 0 ? "true" : "false");
      return element;
    });
    this.panels = page.tabs.map((tab, index) => {
      const element = new FakeElement({ dataset: { drsPanel: tab } });
      element.hidden = index !== 0;
      return element;
    });
    this.live = new FakeElement();
    this.readyContent = [
      ...Array.from({ length: readyContentCount }, () => new FakeElement()),
      ...readyContentPanels.map((panelName) => this.panels.find((panel) => panel.dataset.drsPanel === panelName)).filter(Boolean),
    ];
    this.actions = actionNames.map((name) => new FakeElement({ dataset: { drsAction: name }, textContent: name }));
    this.stateOptions = stateOptions.map((name) => new FakeElement({ dataset: { drsStateOption: name }, textContent: name }));
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
    if (selector === "[data-drs-ready-content]") return this.readyContent;
    if (selector === "[data-drs-review-item]") return [];
    return [];
  }

  querySelector(selector) {
    if (selector === "[data-drs-live]") return this.live;
    return null;
  }
}

async function flushAsyncWork() {
  await new Promise((resolve) => setTimeout(resolve, 0));
  await new Promise((resolve) => setTimeout(resolve, 0));
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
    assert.match(script, /createDrsDataClient/u, `${page.key} data client injection`);
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

test("DRS W1 runtime tab activation keeps one tab in sequential order", async () => {
  const previousDocument = globalThis.document;

  try {
    for (const page of pages) {
      const fakeDocument = new FakeDocument(page);
      globalThis.document = fakeDocument;
      await import(`../src/stitch_laibe_landing_onboarding/drs_standalone/${page.directory}/app.js?tabindex=${Date.now()}-${page.key}`);

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
    await import(`../src/stitch_laibe_landing_onboarding/drs_standalone/${specialist.directory}/app.js?permission=${Date.now()}`);
    await flushAsyncWork();

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
    const visibleText = html
      .replace(/<script[\s\S]*?<\/script>/giu, " ")
      .replace(/<style[\s\S]*?<\/style>/giu, " ")
      .replace(/<[^>]+>/gu, " ");
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
      await import(`../src/stitch_laibe_landing_onboarding/drs_standalone/${page.directory}/app.js?ready-initial=${Date.now()}-${page.key}`);
      await flushAsyncWork();

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
    await import(`../src/stitch_laibe_landing_onboarding/drs_standalone/${vendor.directory}/app.js?vendor-denied=${Date.now()}`);
    await flushAsyncWork();

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
    await import(`../src/stitch_laibe_landing_onboarding/drs_standalone/${vendor.directory}/app.js?vendor-ready=${Date.now()}`);
    await flushAsyncWork();
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
    const visibleText = html
      .replace(/<script[\s\S]*?<\/script>/giu, " ")
      .replace(/<style[\s\S]*?<\/style>/giu, " ")
      .replace(/<[^>]+>/gu, " ");
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
