import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";

const pageRoot = new URL(
  "../src/stitch_laibe_landing_onboarding/client_awarding_dashboard/",
  import.meta.url,
);
const routeManifestUrl = new URL(
  "../src/stitch_laibe_landing_onboarding/pcm_standalone/public/pcm-flow-route-manifest.js",
  import.meta.url,
);

function readPageFile(path) {
  return readFile(new URL(path, pageRoot), "utf8");
}

function loadRuntime() {
  return import(new URL("app.js", pageRoot).href);
}

function ownerContractPanel(html) {
  const start = html.indexOf('id="owner-dashboard-panel-contract"');
  const end = html.indexOf('data-layout="owner-tabbed-workbench"', start);
  return start >= 0 && end > start ? html.slice(start, end) : "";
}

function sha256(value) {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function currentHtmlElement(html, tagName, marker) {
  const escapedMarker = marker.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
  const matches = html.match(
    new RegExp(`<${tagName}\\b[^>]*${escapedMarker}(?=\\s|>)[^>]*>[\\s\\S]*?<\\/${tagName}>`, "gu"),
  ) ?? [];
  assert.equal(matches.length, 1, `current HTML must contain one ${marker} ${tagName}`);
  const source = matches[0];
  const opening = source.match(new RegExp(`^<${tagName}\\b([^>]*)>`, "u"));
  assert.ok(opening, `${marker} opening tag`);
  const attributes = new Map();
  for (const attribute of opening[1].matchAll(/([:\w-]+)(?:\s*=\s*"([^"]*)")?/gu)) {
    attributes.set(attribute[1], attribute[2] ?? "");
  }
  return {
    source,
    textContent: source.replace(/<[^>]+>/gu, " ").replace(/\s+/gu, " ").trim(),
    setAttribute(name, value) {
      attributes.set(name, String(value));
    },
    getAttribute(name) {
      return attributes.get(name) ?? null;
    },
    hasAttribute(name) {
      return attributes.has(name);
    },
    removeAttribute(name) {
      attributes.delete(name);
    },
  };
}

function createHeaderDomHarness(html) {
  const nodes = new Map([
    ["[data-owner-brand-link]", currentHtmlElement(html, "a", "data-owner-brand-link")],
    ["[data-owner-service-contract-link]", currentHtmlElement(html, "a", "data-owner-service-contract-link")],
    ['[data-header-context-value="case"]', currentHtmlElement(html, "span", 'data-header-context-value="case"')],
    ['[data-header-context-value="agreement"]', currentHtmlElement(html, "span", 'data-header-context-value="agreement"')],
  ]);
  return {
    nodes,
    root: {
      body: null,
      defaultView: null,
      querySelector(selector) {
        return nodes.get(selector) ?? null;
      },
      querySelectorAll() {
        return [];
      },
    },
  };
}

function createRenderNode(tagName = "div") {
  const node = {
    tagName,
    className: "",
    textContent: "",
    hidden: false,
    attributes: new Map(),
    dataset: {},
    children: [],
    append(...children) {
      this.children.push(...children);
    },
    removeChild(child) {
      const index = this.children.indexOf(child);
      if (index >= 0) this.children.splice(index, 1);
      return child;
    },
    setAttribute(name, value) {
      this.attributes.set(name, String(value));
    },
    getAttribute(name) {
      return this.attributes.get(name) ?? null;
    },
  };
  Object.defineProperty(node, "firstChild", {
    get() {
      return this.children[0] ?? null;
    },
  });
  return node;
}

function renderedText(node) {
  return [
    node.textContent,
    ...node.children.map((child) => renderedText(child)),
  ].filter(Boolean).join(" ");
}

function renderedNodes(node) {
  return [node, ...node.children.flatMap((child) => renderedNodes(child))];
}

function createOwnerWorkspaceRenderHarness() {
  const lists = new Map([
    ["documents", createRenderNode("ul")],
    ["calendarSubmissions", createRenderNode("ul")],
    ["designDecisionTrail", createRenderNode("ul")],
  ]);
  const designScheduleEmpty = createRenderNode("div");
  const root = {
    body: { dataset: {} },
    defaultView: null,
    createElement(tagName) {
      return createRenderNode(tagName);
    },
    querySelector(selector) {
      const listMatch = selector.match(/^\[data-list="([^"]+)"\]$/u);
      if (listMatch) return lists.get(listMatch[1]) ?? null;
      if (selector === '[data-calendar-empty="design-schedule"]') {
        return designScheduleEmpty;
      }
      return null;
    },
    querySelectorAll() {
      return [];
    },
  };
  return { root, lists, designScheduleEmpty };
}

function createInteractiveTabHarness({
  kind,
  initialHash,
  readyState = "complete",
}) {
  const keys = kind === "dashboard"
    ? ["design", "construction", "contract"]
    : ["overview", "facts", "changes", "records"];
  const datasetKey = kind === "dashboard" ? "ownerTab" : "ownerContractView";
  const panelDatasetKey = kind === "dashboard"
    ? "ownerPanel"
    : "ownerContractViewPanel";
  const listeners = new Map();
  const replacements = [];
  const scrollCalls = [];
  const frameCallbacks = [];
  let nextFrameId = 1;
  let frameExecutionCount = 0;

  function interactiveNode(key) {
    const nodeListeners = new Map();
    return {
      dataset: { [datasetKey]: key },
      tabIndex: key === keys[0] ? 0 : -1,
      focused: false,
      attributes: new Map(),
      addEventListener(type, listener) {
        const current = nodeListeners.get(type) ?? [];
        current.push(listener);
        nodeListeners.set(type, current);
      },
      dispatch(type, event = {}) {
        for (const listener of nodeListeners.get(type) ?? []) {
          listener({
            ...event,
            preventDefault() {
              event.defaultPrevented = true;
            },
          });
        }
      },
      setAttribute(name, value) {
        this.attributes.set(name, value);
      },
      getAttribute(name) {
        return this.attributes.get(name) ?? null;
      },
      focus() {
        this.focused = true;
      },
    };
  }

  const tabs = keys.map(interactiveNode);
  const panels = keys.map((key) => ({
    dataset: { [panelDatasetKey]: key },
    hidden: key !== keys[0],
  }));
  const container = {
    dataset: kind === "dashboard" ? { activeOwnerTab: "design" } : {},
    querySelectorAll(selector) {
      if (
        selector === "[data-owner-tab]" ||
        selector === "[data-owner-contract-view]"
      ) return tabs;
      if (
        selector === "[data-owner-panel]" ||
        selector === "[data-owner-contract-view-panel]"
      ) return panels;
      return [];
    },
  };
  const root = {
    readyState,
    documentElement: { dataset: {} },
    querySelector(selector) {
      return selector === '[data-layout="owner-hero-dashboard"]'
        ? container
        : null;
    },
  };
  const view = {
    location: { hash: initialHash },
    history: {
      replaceState(_state, _title, value) {
        replacements.push(value);
        view.location.hash = String(value).slice(String(value).indexOf("#"));
      },
    },
    addEventListener(type, listener, options = {}) {
      const current = listeners.get(type) ?? [];
      current.push({
        listener,
        once: Boolean(options?.once),
        capture: typeof options === "boolean"
          ? options
          : Boolean(options?.capture),
      });
      listeners.set(type, current);
    },
    removeEventListener(type, listener, options = {}) {
      const current = listeners.get(type) ?? [];
      const capture = typeof options === "boolean"
        ? options
        : Boolean(options?.capture);
      listeners.set(
        type,
        current.filter((entry) =>
          entry.listener !== listener || entry.capture !== capture
        ),
      );
    },
    scrollTo(options) {
      scrollCalls.push(options);
    },
    requestAnimationFrame(callback) {
      const id = nextFrameId;
      nextFrameId += 1;
      frameCallbacks.push({ id, callback });
      return id;
    },
    cancelAnimationFrame(id) {
      const index = frameCallbacks.findIndex((entry) => entry.id === id);
      if (index >= 0) frameCallbacks.splice(index, 1);
    },
    dispatch(type, event = {}) {
      for (const entry of [...(listeners.get(type) ?? [])]) {
        entry.listener(event);
        if (entry.once) view.removeEventListener(type, entry.listener);
      }
    },
    flushAnimationFrame() {
      const currentFrame = frameCallbacks.splice(0);
      for (const entry of currentFrame) {
        frameExecutionCount += 1;
        entry.callback();
      }
    },
    flushAnimationFrames() {
      while (frameCallbacks.length) this.flushAnimationFrame();
    },
  };

  return {
    container,
    root,
    view,
    tabs,
    panels,
    replacements,
    scrollCalls,
    frameCallbacks,
    get frameExecutionCount() {
      return frameExecutionCount;
    },
    listeners,
  };
}

function createOwnerSectionNavigationHarness(initialHash = "#overview") {
  const keys = [
    "overview",
    "documents",
    "submissions",
    "messages",
    "governance",
    "event-trail",
  ];
  const listeners = new Map();
  const replacements = [];

  function interactiveNode(key) {
    const nodeListeners = new Map();
    return {
      dataset: { ownerSectionTab: key },
      tabIndex: 0,
      focused: false,
      attributes: new Map(),
      addEventListener(type, listener) {
        const current = nodeListeners.get(type) ?? [];
        current.push(listener);
        nodeListeners.set(type, current);
      },
      dispatch(type, event = {}) {
        for (const listener of nodeListeners.get(type) ?? []) {
          listener({
            ...event,
            preventDefault() {
              event.defaultPrevented = true;
            },
          });
        }
      },
      setAttribute(name, value) {
        this.attributes.set(name, String(value));
      },
      getAttribute(name) {
        return this.attributes.get(name) ?? null;
      },
      removeAttribute(name) {
        this.attributes.delete(name);
      },
      focus() {
        this.focused = true;
      },
    };
  }

  const tabs = keys.map(interactiveNode);
  const panels = [
    ...["overview", "overview", "overview"].map((key) => ({
      dataset: { ownerSectionPanel: key },
      hidden: false,
    })),
    ...keys.slice(1).map((key) => ({
      dataset: { ownerSectionPanel: key },
      hidden: false,
    })),
  ];
  const workbench = {
    dataset: {},
    querySelectorAll(selector) {
      if (selector === "[data-owner-section-tab]") return tabs;
      if (selector === "[data-owner-section-panel]") return panels;
      return [];
    },
  };
  const root = {
    querySelector(selector) {
      return selector === '[data-layout="owner-tabbed-workbench"]'
        ? workbench
        : null;
    },
  };
  const view = {
    location: { hash: initialHash },
    history: {
      replaceState(_state, _title, value) {
        replacements.push(value);
        view.location.hash = String(value).slice(String(value).indexOf("#"));
      },
    },
    addEventListener(type, listener) {
      const current = listeners.get(type) ?? [];
      current.push(listener);
      listeners.set(type, current);
    },
    dispatch(type) {
      for (const listener of listeners.get(type) ?? []) listener();
    },
  };

  return { root, view, workbench, tabs, panels, replacements, listeners };
}

function authorizedContext(overrides = {}) {
  return {
    sessionStatus: "active",
    actor: {
      actorId: "actor-fixture-owner",
      role: "owner",
      displayLabel: "驗收用甲方",
    },
    membership: {
      status: "active",
      caseId: "case-fixture-owner-workspace",
    },
    serviceAgreement: {
      agreementId: "agreement-fixture",
      version: "v-fixture",
      status: "active",
      caseId: "case-fixture-owner-workspace",
    },
    caseBinding: {
      status: "bound",
      caseId: "case-fixture-owner-workspace",
    },
    domain: {
      status: "active",
      name: "pcm",
    },
    caseSummary: {
      caseId: "case-fixture-owner-workspace",
      displayName: "驗收用案件（非正式資料）",
      statusLabel: "文件檢查中",
      currentActorLabel: "PCM",
      nextActionLabel: "逐項回覆文件問題",
      nextDueLabel: "依案件通知",
      lastRecordedAtLabel: "依案件紀錄顯示",
    },
    documents: [],
    submissions: [],
    scheduledDesignItems: [],
    publicMessages: [],
    designDecisionTrail: [],
    events: [],
    permittedActions: [],
    ...overrides,
  };
}

test("未簽 DRS 服務契約前只顯示誠實的註冊後準備預覽", async () => {
  const html = await readPageFile("code.html");

  assert.match(html, /註冊後，可以先把資料整理成可討論的決策基礎/);
  assert.match(html, /尚未驗證註冊/);
  assert.match(html, /摘要也尚未真正保存/);
  assert.match(html, /完整需求整理入口準備中/);
  assert.match(html, /補齊必要文件/);
  assert.match(html, /查看 DRS 服務方案/);
  assert.match(html, /確認 DRS 服務契約/);
  assert.match(html, /註冊與保存開放後才可正式保留/);
  assert.match(html, /尚未連結帳號或正式案件/);
  assert.doesNotMatch(html, /href="\.\.\/pcm_standalone\/owner_start\/code\.html"/);
});

test("甲方工作台 final runtime asset identity 保留既有 module runtime", async () => {
  const html = await readPageFile("code.html");

  assert.match(html, /href="\.\/styles\.css\?v=20260815-final-runtime"/);
  assert.match(
    html,
    /type="module"\s+src="\.\/owner-workspace-bootstrap\.js"/,
  );
  assert.doesNotMatch(html, /type="module"\s+src="\.\/app\.js"/);
  assert.doesNotMatch(html, /tailwindcss|fonts\.googleapis|material-symbols/i);
});

test("正式身分入口未就緒時甲方工作台正常路徑維持 HOLD，deep link 不算通過", async () => {
  const [manifestSource, manifest] = await Promise.all([
    readFile(routeManifestUrl, "utf8"),
    import(`${routeManifestUrl.href}?owner-workspace-normal-route=${Date.now()}`),
  ]);
  const ownerWorkspace = manifest.PCM_FLOW_NODES.find(({ id }) => id === "ownerWorkspace");
  const normalRoute = manifest.PCM_FLOW_CANONICAL_LINKS.find(
    ({ id }) => id === "accountAccessOwnerLoginToOwnerWorkspace",
  );

  assert.match(manifestSource, /export const OWNER_WORKSPACE_NORMAL_ROUTE = "HOLD";/u);
  assert.deepEqual(ownerWorkspace, {
    id: "ownerWorkspace",
    publicPath: "/pcm/owner/workspace",
    label: "甲方案件工作台",
    role: "已授權甲方",
    owner: "A0",
    lifecycle: "active",
    gate: "G1_UI_SOURCE",
    href: "../../client_awarding_dashboard/code.html",
  });
  assert.equal(normalRoute.routeState, "hold");
  assert.equal(normalRoute.relativeHref, null);
  assert.equal(normalRoute.canonicalHttpUrl, null);
  assert.doesNotMatch(manifestSource, /accountAccessOwnerLoginToOwnerWorkspace[\s\S]{0,420}client_awarding_dashboard\/code\.html/u);
});

test("完整映射案件治理資訊架構與可達頁內錨點", async () => {
  const html = await readPageFile("code.html");
  const requiredSections = [
    ["overview", "案件總覽"],
    ["documents", "文件與報價"],
    ["submissions", "乙方提交與場勘"],
    ["messages", "三方書面紀錄"],
    ["governance", "治理檢查"],
    ["design-review", "設計送審"],
    ["construction-records", "施工與驗收紀錄"],
    ["event-trail", "案件留痕"],
  ];

  for (const [id, label] of requiredSections) {
    assert.match(html, new RegExp(`id="${id}"`));
    assert.match(html, new RegExp(label));
    assert.match(html, new RegExp(`href="#${id}"`));
  }
});

test("框選範圍改為桌機側欄與單一內容面板，手機保留可滑動分類", async () => {
  const [html, css, runtime] = await Promise.all([
    readPageFile("code.html"),
    readPageFile("styles.css"),
    readPageFile("app.js"),
  ]);

  assert.match(html, /data-layout="owner-tabbed-workbench"/u);
  assert.match(html, /class="section-nav owner-workbench-nav"/u);
  assert.match(html, /data-owner-section-stage="documents"[\s\S]*01[\s\S]*文件準備/u);
  assert.match(html, /data-owner-section-stage="overview"[\s\S]*02[\s\S]*案件總覽/u);
  assert.match(html, /data-owner-section-stage="design"[\s\S]*03[\s\S]*設計送審/u);
  assert.match(html, /data-owner-section-stage="construction"[\s\S]*04[\s\S]*施工與驗收/u);

  for (const key of [
    "overview",
    "documents",
    "submissions",
    "messages",
    "governance",
    "event-trail",
  ]) {
    assert.match(html, new RegExp(`data-owner-section-tab="${key}"`, "u"));
    assert.match(html, new RegExp(`data-owner-section-panel="${key}"`, "u"));
  }
  assert.match(html, /href="#design-review"\s+data-owner-dashboard-shortcut="design"/u);
  assert.match(html, /href="#construction-records"\s+data-owner-dashboard-shortcut="construction"/u);
  assert.doesNotMatch(html, /data-layout="owner-stage-summary"/u);

  assert.match(
    css,
    /\[data-layout="owner-tabbed-workbench"\]\s*\{[^}]*grid-template-columns:\s*minmax\(210px,\s*240px\)\s+minmax\(0,\s*1fr\)/u,
  );
  assert.match(css, /\.owner-workbench-nav\s*\{[^}]*display:\s*grid[^}]*position:\s*sticky/u);
  assert.match(
    css,
    /\.owner-workbench-nav a:focus-visible\s*\{[^}]*outline:\s*2px solid #ff7530/u,
  );
  assert.match(css, /\[data-owner-section-panel\]\[hidden\][^{]*\{[^}]*display:\s*none/u);
  assert.match(
    css,
    /@media\s*\(max-width:\s*760px\)[\s\S]*?\[data-layout="owner-tabbed-workbench"\]\s*\{[^}]*grid-template-columns:\s*1fr[\s\S]*?\.owner-workbench-nav\s*\{[^}]*grid-auto-flow:\s*column[^}]*overflow-x:\s*auto/u,
  );
  assert.match(runtime, /export function initializeOwnerSectionNavigation/u);
});

test("分類切換同步 hash、目前標記、鍵盤焦點與唯一可見面板", async () => {
  const { initializeOwnerSectionNavigation } = await loadRuntime();
  assert.equal(typeof initializeOwnerSectionNavigation, "function");
  const harness = createOwnerSectionNavigationHarness("#documents");

  const controller = initializeOwnerSectionNavigation(harness.root, harness.view);
  assert.equal(harness.workbench.dataset.activeOwnerSection, "documents");
  assert.equal(harness.tabs[1].getAttribute("aria-current"), "page");
  assert.equal(harness.tabs[1].tabIndex, 0);
  assert.equal(harness.tabs[0].getAttribute("aria-current"), null);
  assert.equal(
    harness.panels.filter((panel) => !panel.hidden).every(
      (panel) => panel.dataset.ownerSectionPanel === "documents",
    ),
    true,
  );

  harness.tabs[1].dispatch("keydown", { key: "ArrowDown" });
  assert.equal(harness.workbench.dataset.activeOwnerSection, "submissions");
  assert.equal(harness.tabs[2].focused, true);
  assert.equal(harness.replacements.at(-1), "#submissions");

  harness.tabs.at(-1).dispatch("keydown", { key: "Home" });
  assert.equal(harness.workbench.dataset.activeOwnerSection, "overview");
  assert.equal(
    harness.panels.filter((panel) => !panel.hidden).length,
    3,
    "overview keeps its status, four-stage explanation and case context together",
  );

  harness.view.location.hash = "#messages";
  harness.view.dispatch("hashchange");
  assert.equal(harness.workbench.dataset.activeOwnerSection, "messages");
  assert.equal(harness.tabs[3].getAttribute("aria-current"), "page");
  assert.equal(controller.selectSection("unknown"), false);
});

test("設計與工程中央區都完整保留給案件日曆", async () => {
  const [html, css] = await Promise.all([
    readPageFile("code.html"),
    readPageFile("styles.css"),
  ]);

  const designStart = html.indexOf('id="owner-dashboard-panel-design"');
  const constructionStart = html.indexOf('id="owner-dashboard-panel-construction"');
  const contractStart = html.indexOf('id="owner-dashboard-panel-contract"');
  assert.ok(designStart >= 0, "visible design dashboard panel exists");
  assert.ok(constructionStart > designStart, "construction dashboard panel follows design panel");
  assert.ok(contractStart > constructionStart, "contract dashboard panel follows construction panel");

  const designPanel = html.slice(designStart, constructionStart);
  const constructionPanel = html.slice(constructionStart, contractStart);

  assert.match(designPanel, /data-calendar-workspace="design-review"/u);
  assert.match(designPanel, /data-list="calendarSubmissions"/u);
  assert.match(designPanel, /data-list="designReviews"/u);
  assert.match(designPanel, /data-list="designDecisionTrail"/u);
  assert.match(designPanel, /尚未取得已排程的設計事項/u);
  assert.match(designPanel, /尚未取得設計送審紀錄/u);
  assert.match(designPanel, /尚未取得設計決策紀錄/u);
  const designCalendarStart = designPanel.indexOf(
    'data-calendar-workspace="design-review"',
  );
  const designCalendarEnd = designPanel.indexOf(
    'class="owner-management-shell owner-management-shell--design"',
  );
  const designCalendar = designPanel.slice(
    designCalendarStart,
    designCalendarEnd,
  );
  assert.ok(designCalendarStart >= 0 && designCalendarEnd > designCalendarStart);
  assert.doesNotMatch(
    designCalendar,
    /owner-calendar__toolbar|owner-calendar__navigation|owner-calendar__view-switch|calendar-nav|calendar-view-option|owner-calendar__week|owner-calendar__agenda|data-calendar-empty/u,
  );
  assert.match(
    designPanel,
    /class="owner-calendar owner-calendar--hero owner-google-calendar-shell"/u,
  );
  assert.match(
    designCalendar,
    /data-owner-google-calendar(?=[\s=>])/u,
  );
  assert.match(designCalendar, /title="本案 Google Calendar"/u);
  assert.match(designCalendar, /data-calendar-state="CALENDAR_UNAVAILABLE_STATE_UI"/u);
  assert.match(designCalendar, /id="owner-google-calendar-title">把本案時程放回同一份決策依據/u);
  assert.match(designCalendar, /尚未連結 Google Calendar/u);
  assert.match(designCalendar, /<iframe[^>]*hidden(?![^>]*\bsrc=)[^>]*>/u);
  assert.doesNotMatch(designCalendar, /data-list="calendarSubmissions"|data-list="designReviews"/u);

  const designOperationsStart = designPanel.indexOf(
    'class="owner-management-shell owner-management-shell--design"',
  );
  assert.ok(designOperationsStart > designCalendarStart);
  assert.ok(designPanel.indexOf('data-list="calendarSubmissions"') > designOperationsStart);
  assert.ok(designPanel.indexOf('data-list="designReviews"') > designOperationsStart);
  assert.ok(designPanel.indexOf('data-list="designDecisionTrail"') > designOperationsStart);

  assert.match(constructionPanel, /data-calendar-workspace="construction"/u);
  assert.doesNotMatch(constructionPanel, /data-owner-google-calendar(?=[\s=>])/u);
  assert.match(constructionPanel, /data-owner-construction-calendar-frame/u);
  assert.match(constructionPanel, /data-calendar-state="CALENDAR_UNAVAILABLE_STATE_UI"/u);
  assert.match(constructionPanel, /尚未取得本案施工時程/u);
  assert.match(constructionPanel, /<iframe[^>]*hidden(?![^>]*\bsrc=)[^>]*>/u);
  assert.match(constructionPanel, /data-list="constructionRecords"/u);
  assert.match(constructionPanel, /下一位處理者/u);
  assert.match(constructionPanel, /尚未取得施工或驗收事件/u);
  const constructionCalendarStart = constructionPanel.indexOf(
    'id="owner-construction-view-today"',
  );
  const constructionCalendarEnd = constructionPanel.indexOf(
    'id="owner-construction-view-changes"',
  );
  const constructionCalendar = constructionPanel.slice(
    constructionCalendarStart,
    constructionCalendarEnd,
  );
  assert.doesNotMatch(
    constructionCalendar,
    /owner-calendar__toolbar|calendar-nav|calendar-view-option|owner-calendar__agenda|本週議程|今日責任與待補件/u,
  );

  assert.match(
    css,
    /#owner-dashboard-panel-construction\s+\.owner-hero-dashboard__body\s*\{[\s\S]{0,180}grid-column:\s*1[\s\S]{0,120}grid-row:\s*3/u,
  );
  assert.match(
    css,
    /#owner-dashboard-panel-design\s+\.owner-google-calendar-shell,\s*#owner-dashboard-panel-construction\s+\.owner-google-calendar-shell\s*\{[\s\S]{0,220}min-height:\s*720px/u,
  );
});

test("設計摘要與案件事實在桌機左側、手機依序排列", async () => {
  const [html, css] = await Promise.all([
    readPageFile("code.html"),
    readPageFile("styles.css"),
  ]);
  const designStart = html.indexOf('id="owner-dashboard-panel-design"');
  const constructionStart = html.indexOf('id="owner-dashboard-panel-construction"');
  const designPanel = html.slice(designStart, constructionStart);
  const summaryStart = designPanel.indexOf(
    'class="owner-hero-dashboard__summary"',
  );
  const factsStart = designPanel.indexOf(
    'class="owner-hero-dashboard__body"',
  );
  const calendarStart = designPanel.indexOf(
    'data-calendar-workspace="design-review"',
  );
  const operationsStart = designPanel.indexOf(
    'class="owner-management-shell owner-management-shell--design"',
  );

  assert.ok(
    summaryStart >= 0 &&
      factsStart > summaryStart &&
      calendarStart > factsStart &&
      operationsStart > calendarStart,
    "design summary, facts, calendar and lower operations keep a clear reading order",
  );
  const designFacts = designPanel.slice(factsStart, calendarStart);
  for (const copy of [
    "送審文件與版本",
    "書面確認與修改",
    "文件版本",
    "書面檢討",
    "待確認事項",
  ]) {
    assert.match(designFacts, new RegExp(copy, "u"));
  }

  assert.match(
    css,
    /#owner-dashboard-panel-design\s*\{[^}]*grid-template-columns:\s*252px\s+minmax\(0,\s*1fr\)[^}]*grid-template-rows:\s*auto\s+auto\s+auto/u,
  );
  assert.match(
    css,
    /#owner-dashboard-panel-design\s+\.owner-hero-dashboard__summary\s*\{[^}]*grid-column:\s*1[^}]*grid-row:\s*1/u,
  );
  assert.match(
    css,
    /#owner-dashboard-panel-design\s+\.owner-hero-dashboard__body\s*\{[^}]*grid-column:\s*1[^}]*grid-row:\s*2/u,
  );
  const designCalendarRule = css.match(
    /#owner-dashboard-panel-design\s+\.owner-calendar--hero\s*\{([^}]*)\}/u,
  )?.[1];
  assert.ok(designCalendarRule, "design calendar layout rule exists");
  assert.match(designCalendarRule, /grid-column:\s*2/u);
  assert.match(designCalendarRule, /grid-row:\s*1\s*\/\s*3/u);
  assert.match(designCalendarRule, /min-height:\s*720px/u);
  assert.match(
    css,
    /#owner-dashboard-panel-design\s+\.owner-management-shell--design\s*\{[^}]*grid-column:\s*1\s*\/\s*-1[^}]*grid-row:\s*3/u,
  );
  assert.match(
    css,
    /@media\s*\(max-width:\s*760px\)[\s\S]*?#owner-dashboard-panel-design\s*\{[^}]*grid-template-columns:\s*1fr[^}]*grid-template-rows:\s*auto/u,
  );
  assert.match(
    css,
    /@media\s*\(max-width:\s*760px\)[\s\S]*?#owner-dashboard-panel-design\s+\.owner-hero-dashboard__summary\s*\{[^}]*order:\s*1[\s\S]*?#owner-dashboard-panel-design\s+\.owner-hero-dashboard__body\s*\{[^}]*order:\s*2[\s\S]*?#owner-dashboard-panel-design\s+\.owner-calendar--hero\s*\{[^}]*order:\s*3[\s\S]*?#owner-dashboard-panel-design\s+\.owner-management-shell--design\s*\{[^}]*order:\s*4/u,
  );
});

test("日曆檢視按鈕會同步目前視圖與可及性狀態", async () => {
  const { initializeOwnerCalendarWorkspaces } = await loadRuntime();
  assert.equal(typeof initializeOwnerCalendarWorkspaces, "function");

  function viewButton(key) {
    const listeners = new Map();
    return {
      dataset: { calendarViewOption: key },
      focused: false,
      attributes: new Map(),
      addEventListener(type, listener) {
        listeners.set(type, listener);
      },
      dispatch(type, event = {}) {
        listeners.get(type)?.({
          ...event,
          preventDefault() {
            event.defaultPrevented = true;
          },
        });
      },
      setAttribute(name, value) {
        this.attributes.set(name, String(value));
      },
      getAttribute(name) {
        return this.attributes.get(name) ?? null;
      },
      focus() {
        this.focused = true;
      },
    };
  }

  const buttons = ["week", "month", "agenda"].map(viewButton);
  const workspace = {
    dataset: {
      calendarWorkspace: "design-review",
      calendarView: "week",
    },
    querySelectorAll(selector) {
      return selector === "[data-calendar-view-option]" ? buttons : [];
    },
  };
  const root = {
    querySelectorAll(selector) {
      return selector === "[data-calendar-workspace]" ? [workspace] : [];
    },
  };

  const controllers = initializeOwnerCalendarWorkspaces(root);
  assert.equal(controllers.length, 1);
  assert.equal(workspace.dataset.calendarView, "week");
  assert.equal(buttons[0].getAttribute("aria-pressed"), "true");
  assert.equal(buttons[1].getAttribute("aria-pressed"), "false");

  buttons[2].dispatch("click");
  assert.equal(workspace.dataset.calendarView, "agenda");
  assert.equal(buttons[0].getAttribute("aria-pressed"), "false");
  assert.equal(buttons[2].getAttribute("aria-pressed"), "true");

  buttons[2].dispatch("keydown", { key: "ArrowLeft" });
  assert.equal(workspace.dataset.calendarView, "month");
  assert.equal(buttons[1].focused, true);
});

test("甲方工作台以設計管理、工程管理、契約管理作為三個同級主區", async () => {
  const [html, css, runtime] = await Promise.all([
    readPageFile("code.html"),
    readPageFile("styles.css"),
    readPageFile("app.js"),
  ]);

  const heroIndex = html.indexOf('data-layout="owner-command-header"');
  const dashboardIndex = html.indexOf('data-layout="owner-hero-dashboard"');
  const workbenchIndex = html.indexOf('data-layout="owner-tabbed-workbench"');
  assert.ok(heroIndex >= 0 && dashboardIndex > heroIndex);
  assert.ok(workbenchIndex > dashboardIndex);

  for (const [key, label] of [
    ["design", "設計管理"],
    ["construction", "工程管理"],
    ["contract", "契約管理"],
  ]) {
    const tab = currentHtmlElement(html, "button", `data-owner-tab="${key}"`);
    const panel = currentHtmlElement(html, "section", `data-owner-panel="${key}"`);
    assert.match(tab.source, new RegExp(`<strong>${label}</strong>`, "u"));
    assert.equal(tab.getAttribute("role"), "tab");
    assert.equal(tab.getAttribute("aria-controls"), `owner-dashboard-panel-${key}`);
    assert.equal(panel.getAttribute("id"), `owner-dashboard-panel-${key}`);
    assert.equal(panel.getAttribute("role"), "tabpanel");
    assert.equal(panel.getAttribute("aria-labelledby"), `owner-dashboard-tab-${key}`);
  }
  assert.equal((html.match(/data-owner-tab=/g) || []).length, 3);
  assert.equal((html.match(/data-owner-panel=/g) || []).length, 3);
  assert.match(
    css,
    /\.owner-dashboard-tab\[aria-selected="true"\]\s*\{[\s\S]{0,520}border-color:\s*var\(--source-active\)[\s\S]{0,520}box-shadow:/i,
  );
  assert.doesNotMatch(
    html,
    /<strong>設計案管理<\/strong>|<strong>工程案管理<\/strong>|class="eyebrow">(?:設計案管理|工程案管理)<\/p>/u,
  );
  assert.doesNotMatch(
    css,
    /\[data-active-owner-tab="design"\][\s\S]{0,420}\.owner-dashboard-tab\[data-owner-tab="design"\][\s\S]{0,260}(?:margin-bottom:\s*-|border-radius:\s*[^;]*0\s+0)/i,
  );
  assert.doesNotMatch(
    css,
    /\[data-active-owner-tab="design"\]\s+\.owner-hero-dashboard__panel:not\(\[hidden\]\)[\s\S]{0,120}border-top-left-radius:\s*0/i,
  );
  assert.match(
    css,
    /\[data-layout="owner-section-tabs"\]\s*\{[\s\S]{0,180}margin:\s*0\s+0\s+12px/u,
  );
  assert.match(
    css,
    /\.owner-dashboard-tab\s*\{[\s\S]{0,260}border-radius:\s*15px/u,
  );
  assert.match(
    css,
    /@media\s*\(max-width:\s*760px\)[\s\S]*\.owner-hero-dashboard__panel[\s\S]{0,260}border-radius:/i,
  );
  assert.match(runtime, /export function initializeOwnerDashboardTabs/);
  assert.match(runtime, /ArrowRight|ArrowLeft/);
});

test("設計與工程主區承接母版案件功能且只保留甲方需要的內容", async () => {
  const [html, css, runtime] = await Promise.all([
    readPageFile("code.html"),
    readPageFile("styles.css"),
    readPageFile("app.js"),
  ]);
  const designStart = html.indexOf('id="owner-dashboard-panel-design"');
  const constructionStart = html.indexOf('id="owner-dashboard-panel-construction"');
  const contractStart = html.indexOf('id="owner-dashboard-panel-contract"');
  const designPanel = html.slice(designStart, constructionStart);
  const constructionPanel = html.slice(constructionStart, contractStart);
  for (const copy of [
    "案件摘要", "共同案件日曆", "送審文件與版本", "書面確認與修改", "設計決策留痕",
  ]) assert.match(designPanel, new RegExp(copy, "u"));
  assert.match(designPanel, /data-owner-management-layout="design"/u);
  assert.match(designPanel, /data-list="calendarSubmissions"/u);
  assert.match(designPanel, /data-list="designReviews"/u);
  assert.match(designPanel, /data-list="designDecisionTrail"/u);
  assert.match(designPanel, /data-action="open-owner-design-revision"/u);
  assert.match(designPanel, /data-owner-design-revision-panel/u);
  for (const copy of [
    "案件摘要", "案件日曆", "本日重要項目", "變更與驗收", "歷史文件版本", "案件留痕",
  ]) assert.match(constructionPanel, new RegExp(copy, "u"));
  assert.match(constructionPanel, /data-owner-management-layout="construction"/u);
  assert.match(constructionPanel, /data-layout="owner-construction-navigation"/u);
  assert.equal((constructionPanel.match(/data-owner-construction-view=/gu) ?? []).length, 4);
  assert.equal((constructionPanel.match(/data-owner-construction-view-panel=/gu) ?? []).length, 4);
  assert.match(constructionPanel, /data-list="constructionRecords"/u);
  assert.match(css, /\.owner-management-shell\s*\{/u);
  assert.match(css, /\.owner-management-card\s*\{/u);
  assert.match(css, /\.owner-construction-nav\s*\{/u);
  assert.match(runtime, /export function initializeOwnerManagementInteractions/u);
  assert.doesNotMatch(
    `${designPanel}\n${constructionPanel}`,
    /金流|撥款|託管|投資報酬|本機示意頁|已同步 LINE|已建立 Google 日曆同步/u,
  );
});

test("工程管理把下方案件內容收進左側標籤並將四個工程分類改為右側橫向分頁", async () => {
  const [html, css, runtime] = await Promise.all([
    readPageFile("code.html"),
    readPageFile("styles.css"),
    readPageFile("app.js"),
  ]);
  const constructionStart = html.indexOf('id="owner-dashboard-panel-construction"');
  const contractStart = html.indexOf('id="owner-dashboard-panel-contract"');
  const constructionPanel = html.slice(constructionStart, contractStart);

  assert.match(constructionPanel, /data-owner-collection-nav-host/u);
  assert.match(constructionPanel, /data-owner-collected-workbench-host/u);
  assert.match(
    constructionPanel,
    /data-layout="owner-construction-navigation"[^>]*role="tablist"/u,
  );
  assert.equal((constructionPanel.match(/role="tab"/gu) ?? []).length, 4);
  assert.equal((constructionPanel.match(/aria-selected=/gu) ?? []).length, 4);
  assert.doesNotMatch(constructionPanel, /data-owner-construction-view=[^>]*aria-pressed=/u);

  assert.match(runtime, /function collectOwnerWorkbenchIntoConstruction/u);
  assert.match(runtime, /ownerConstructionMode\s*=\s*["']collection["']/u);
  assert.match(runtime, /ownerConstructionMode\s*=\s*["']construction["']/u);
  assert.match(runtime, /collectionNavHost\.append\(navigation\)/u);
  assert.match(runtime, /collectionContentHost\.append\(stage\)/u);

  assert.match(
    css,
    /#owner-dashboard-panel-construction\s+\.owner-construction-nav\s*\{[^}]*grid-template-columns:\s*repeat\(4,\s*minmax\(0,\s*1fr\)\)/u,
  );
  assert.match(
    css,
    /data-owner-construction-mode="construction"[\s\S]{0,260}data-owner-collected-workbench-host/u,
  );
  assert.match(
    css,
    /data-owner-construction-mode="collection"[\s\S]{0,260}data-owner-construction-view-panel/u,
  );
});

test("工程管理首屏以 Dusk Ember 語意壓縮日曆空態並降低橘框噪音", async () => {
  const [html, css] = await Promise.all([
    readPageFile("code.html"),
    readPageFile("styles.css"),
  ]);
  const constructionStart = html.indexOf('id="owner-dashboard-panel-construction"');
  const contractStart = html.indexOf('id="owner-dashboard-panel-contract"');
  const constructionPanel = html.slice(constructionStart, contractStart);
  const contractPanel = html.slice(contractStart);

  assert.doesNotMatch(
    constructionPanel,
    /owner-construction-primary-action|查看 DRS 服務契約全文/u,
  );
  assert.match(
    contractPanel,
    /data-owner-service-contract-link[^>]*>[\s\S]{0,80}查看 DRS 服務契約全文/u,
  );
  assert.match(
    html,
    /owner-construction-rail/u,
  );
  assert.match(
    html,
    /owner-construction-stage[\s\S]{0,220}owner-construction-nav/u,
  );

  assert.match(
    css,
    /#owner-dashboard-panel-construction\s*\{[^}]*border:\s*1px solid rgb\(243 238 245 \/ 12%\)/u,
  );
  assert.match(
    css,
    /#owner-dashboard-panel-construction\s+\.owner-google-calendar-unavailable\s*\{[^}]*min-height:\s*360px/u,
  );
  assert.match(
    css,
    /#owner-dashboard-panel-construction\s+\.owner-construction-rail\s*\{[^}]*max-height:\s*560px[^}]*overflow:\s*auto/u,
  );
  assert.match(
    css,
    /#owner-dashboard-panel-construction[\s\S]{0,260}\.owner-construction-collection-nav[\s\S]{0,260}\.owner-workbench-nav\s*\{[^}]*max-height:\s*none/u,
  );
  assert.match(
    css,
    /#owner-dashboard-panel-construction\s+\.owner-dashboard-facts div,[\s\S]{0,220}min-height:\s*42px/u,
  );
  assert.match(
    css,
    /#owner-dashboard-panel-construction\s+\.owner-construction-stage\s*\{[^}]*grid-template-rows:\s*auto minmax\(0,\s*1fr\)/u,
  );
  assert.doesNotMatch(css, /\.owner-construction-primary-action/u);
  assert.match(
    css,
    /#owner-dashboard-panel-construction\s+\.owner-dashboard-facts div:nth-child\(2\) dd\s*\{[^}]*#e65a9f/u,
  );
  assert.match(
    css,
    /#owner-dashboard-panel-construction\s+\.owner-dashboard-facts div:last-child\s*\{[^}]*#c26ae6/u,
  );
  assert.match(
    css,
    /body:has\(#owner-dashboard-panel-construction:not\(\[hidden\]\)\)\s+\.workspace-header__context/u,
  );
  assert.match(
    css,
    /body:has\(#owner-dashboard-panel-construction:not\(\[hidden\]\)\)[\s\S]{0,180}\.workspace-header__context\s+\.context-chip\s*\{[^}]*width:\s*auto/u,
  );
  assert.match(
    css,
    /\.workspace-header__context\s+\.context-chip--agreement\s*\{[^}]*grid-column:\s*2/u,
  );
  assert.match(
    css,
    /@media \(max-width:\s*760px\)[\s\S]*?#owner-dashboard-panel-construction\s+\.owner-construction-collection-nav\s*\{[^}]*order:\s*4/u,
  );
  assert.doesNotMatch(
    css,
    /#owner-dashboard-panel-construction\s+\.owner-google-calendar-unavailable\s*\{[^}]*linear-gradient\(rgb\(255 255 255 \/ 3%\) 1px/u,
  );
});

test("甲方儀表板完全移除 LINE 對話框並把主視覺空間交給案件日曆", async () => {
  const [html, css] = await Promise.all([
    readPageFile("code.html"),
    readPageFile("styles.css"),
  ]);

  const dashboardStart = html.indexOf('data-layout="owner-hero-dashboard"');
  const workspaceStart = html.indexOf('data-layout="owner-hero-workspace"', dashboardStart);
  assert.ok(dashboardStart >= 0, "owner hero dashboard exists");
  assert.ok(workspaceStart > dashboardStart, "owner workspace is inside the dashboard");

  assert.doesNotMatch(
    html,
    /owner-line-conversation|data-owner-chat-channel|data-owner-line-trusted-content|data-line-send|LINE｜DRS|LINE｜案件三方群組/u,
  );
  assert.doesNotMatch(css, /owner-line-conversation|owner-chat-channel/u);

  assert.match(
    css,
    /\.owner-hero-dashboard\s*\{[\s\S]{0,360}grid-template-columns:\s*minmax\(0,\s*1fr\)/u,
  );
  assert.match(
    css,
    /\.owner-hero-workspace\s*\{[^}]*width:\s*100%/u,
  );
});

test("甲方工作台採用緊湊案件指揮層級並保留既有資料契約", async () => {
  const [html, css] = await Promise.all([
    readPageFile("code.html"),
    readPageFile("styles.css"),
  ]);

  const hierarchy = [
    ["workspace-intro", "owner-command-header"],
    ["handoff-panel", "owner-responsibility-panel"],
    ["workspace-tabs", "owner-section-tabs"],
    ["process-poster", "owner-stage-detail"],
    ["owner-operational-workbench", "owner-tabbed-workbench"],
    ["section-nav owner-workbench-nav", "owner-section-nav"],
    ["owner-shell-grid", "owner-operational-shell"],
    ["workspace-layout", "owner-workspace-split"],
    ["workspace-main", "owner-workspace-main"],
    ["summary-grid", "owner-status-summary"],
    ["owner-sidebar", "owner-context-rail"],
  ];

  for (const [className, layoutRole] of hierarchy) {
    assert.match(
      html,
      new RegExp(`class="${className}"\\s+data-layout="${layoutRole}"`),
    );
  }

  const commandIndex = html.indexOf('data-layout="owner-command-header"');
  const workbenchIndex = html.indexOf('data-layout="owner-tabbed-workbench"');
  const sectionNavIndex = html.indexOf('data-layout="owner-section-nav"');
  const shellIndex = html.indexOf('data-layout="owner-operational-shell"');
  assert.ok(commandIndex < workbenchIndex);
  assert.ok(workbenchIndex < sectionNavIndex);
  assert.ok(sectionNavIndex < shellIndex);

  assert.match(
    html,
    /class="handoff-panel"\s+data-layout="owner-responsibility-panel"[\s\S]*data-slot="current-actor"[\s\S]*data-slot="next-action"[\s\S]*data-slot="waiting-relationship"[\s\S]*data-slot="next-due"[\s\S]*data-slot="last-recorded"/,
  );
  assert.match(html, /class="precontract-command-summary"/);
  assert.match(html, /目前由誰處理[\s\S]*建議下一步[\s\S]*紀錄界線/);

  for (const slot of [
    "case-name",
    "state-label",
    "agreement-label",
    "document-summary",
    "review-summary",
    "issue-summary",
    "next-summary",
  ]) {
    assert.match(html, new RegExp(`data-slot="${slot}"`));
  }
  for (const list of [
    "process-steps",
    "documents",
    "submissions",
    "messages",
    "designReviews",
    "constructionRecords",
    "events",
  ]) {
    assert.match(html, new RegExp(`data-list="${list}"`));
  }

  assert.match(css, /\[data-layout="owner-command-header"\]\s*\{[\s\S]{0,500}grid-template-columns:/i);
  assert.match(css, /\[data-layout="owner-status-summary"\]\s*\{[\s\S]{0,320}grid-template-columns:\s*repeat\(4,/i);
  assert.match(css, /\[data-layout="owner-workspace-split"\]\s*\{[\s\S]{0,320}grid-template-columns:/i);
  assert.match(css, /\[data-layout="owner-context-rail"\]\s*\{[\s\S]{0,320}position:\s*sticky/i);
  assert.match(
    css,
    /@media\s*\(max-width:\s*980px\)[\s\S]*\[data-layout="owner-workspace-split"\]\s*\{[\s\S]{0,180}grid-template-columns:\s*1fr/i,
  );
});

test("公開預設頁不含硬編案件、金額、身分或正式決定", async () => {
  const [html, runtime] = await Promise.all([
    readPageFile("code.html"),
    readPageFile("app.js"),
  ]);
  const source = `${html}\n${runtime}`;

  assert.doesNotMatch(source, /NT\$|TWD\s*\d|新台幣\s*\d/i);
  assert.doesNotMatch(
    source,
    /case-(?:pcm|owner|demo|test|\d)|owner-\d|document-\d|event-\d|decision-\d|王小明|林先生|測試案件已建立/i,
  );
  assert.doesNotMatch(
    source,
    /已完成付款|正式核准完成|人工決定已建立|已驗證身分|具法律效果/,
  );
});

test("頁面與 runtime 完全移除舊兩字發案詞彙", async () => {
  const legacyLiteral = String.fromCodePoint(0x62db, 0x6a19);
  const [html, css, runtime] = await Promise.all([
    readPageFile("code.html"),
    readPageFile("styles.css"),
    readPageFile("app.js"),
  ]);

  assert.equal(`${html}\n${css}\n${runtime}`.includes(legacyLiteral), false);
});

test("頁面沒有空連結，所有可見按鈕有行為或明確不可用", async () => {
  const html = await readPageFile("code.html");

  assert.doesNotMatch(html, /href=["']#["']/i);
  const buttons = [...html.matchAll(/<button\b([^>]*)>/gi)];
  assert.ok(buttons.length > 0);
  for (const [, attributes] of buttons) {
    assert.match(attributes, /\bdisabled\b|\bdata-action=/i);
  }
});

test("封閉狀態、角色與契約 gate 是 immutable contract", async () => {
  const {
    OWNER_WORKSPACE_STATES,
    OWNER_WORKSPACE_ACCESS,
  } = await loadRuntime();

  assert.deepEqual(OWNER_WORKSPACE_STATES, [
    "ACCESS_CHECKING",
    "ACCESS_DENIED",
    "CONTRACT_CONTEXT_UNAVAILABLE",
    "AUTHORIZED_EMPTY",
    "AUTHORIZED_READY",
    "PCM_SERVICE_ENDED_READ_ONLY",
    "LOAD_FAILED_RETRYABLE",
  ]);
  assert.deepEqual(OWNER_WORKSPACE_ACCESS, {
    sessionStatus: "active",
    actorRole: "owner",
    membershipStatus: "active",
    activeAgreementStatus: "active",
    endedAgreementStatus: "ended",
    caseBindingStatus: "bound",
    domainStatus: "active",
  });
  assert.equal(Object.isFrozen(OWNER_WORKSPACE_STATES), true);
  assert.equal(Object.isFrozen(OWNER_WORKSPACE_ACCESS), true);
});

test("未配置可信 adapter 時只顯示契約 context unavailable", async () => {
  const { resolveOwnerWorkspaceState } = await loadRuntime();

  assert.deepEqual(resolveOwnerWorkspaceState(), {
    state: "CONTRACT_CONTEXT_UNAVAILABLE",
    reasonCode: "TRUSTED_CONTEXT_NOT_AVAILABLE",
  });
});

test("只有 exact active owner tuple 可進 authorized ready", async () => {
  const { resolveOwnerWorkspaceState } = await loadRuntime();
  const result = resolveOwnerWorkspaceState(authorizedContext());

  assert.deepEqual(result, {
    state: "AUTHORIZED_READY",
    reasonCode: "OWNER_CASE_CONTEXT_CONFIRMED",
  });
});

test("錯角色、失效 membership、未簽契約與錯 case binding 均 fail closed", async () => {
  const { resolveOwnerWorkspaceState } = await loadRuntime();
  const cases = [
    authorizedContext({
      actor: { actorId: "actor-pro", role: "pro", displayLabel: "乙方" },
    }),
    authorizedContext({
      membership: { status: "revoked", caseId: "case-fixture-owner-workspace" },
    }),
    authorizedContext({
      serviceAgreement: {
        agreementId: "agreement",
        version: "v1",
        status: "pending",
      },
    }),
    authorizedContext({
      caseBinding: { status: "bound", caseId: "different-case" },
    }),
    authorizedContext({ domain: { status: "revoked", name: "pcm" } }),
  ];

  for (const input of cases) {
    assert.equal(resolveOwnerWorkspaceState(input).state, "ACCESS_DENIED");
  }
});

test("拒絕存取時不攜帶或呈現任何案件 payload", async () => {
  const { buildOwnerWorkspaceViewModel } = await loadRuntime();
  const context = authorizedContext({
    sessionStatus: "expired",
    documents: [{ title: "不得外洩的文件" }],
    submissions: [{ partyLabel: "不得外洩的乙方" }],
    scheduledDesignItems: [{
      scope: "design",
      title: "不得外洩的設計排程",
      scheduledAt: "2026-08-18T01:00:00.000Z",
    }],
    publicMessages: [{
      actorLabel: "不得外洩的訊息",
      body: "不得外洩的內容",
      recordReceipt: {
        receiptId: "receipt-private",
        status: "recorded",
        recordedAt: "2026-08-02T00:00:00Z",
      },
    }],
    designReviews: [{ title: "不得外洩的送審" }],
    designDecisionTrail: [{
      scope: "design",
      title: "不得外洩的設計決策",
    }],
    constructionRecords: [{ title: "不得外洩的施工紀錄" }],
    events: [{ title: "不得外洩的事件" }],
    processSteps: [{ key: "documents", statusLabel: "不得外洩" }],
    permittedActions: ["submit_correction"],
  });

  const model = buildOwnerWorkspaceViewModel(context);
  const serialized = JSON.stringify(model);

  assert.equal(model.state, "ACCESS_DENIED");
  assert.equal(model.caseName, "尚待案件資料");
  assert.equal(model.actorLabel, "尚待驗證");
  assert.deepEqual(model.documents, []);
  assert.deepEqual(model.submissions, []);
  assert.deepEqual(model.scheduledDesignItems, []);
  assert.deepEqual(model.messages, []);
  assert.deepEqual(model.designReviews, []);
  assert.deepEqual(model.designDecisionTrail, []);
  assert.deepEqual(model.constructionRecords, []);
  assert.deepEqual(model.events, []);
  assert.deepEqual(model.processSteps, []);
  assert.deepEqual(model.permittedActions, []);
  assert.doesNotMatch(serialized, /不得外洩|submit_correction/);
});

test("服務結束的唯讀資料仍須綁定同一案件與契約", async () => {
  const { buildOwnerWorkspaceViewModel, resolveOwnerWorkspaceState } =
    await loadRuntime();
  const endedAgreement = {
    agreementId: "agreement-fixture",
    version: "v-fixture",
    status: "ended",
    caseId: "case-fixture-owner-workspace",
  };

  assert.equal(
    resolveOwnerWorkspaceState(
      authorizedContext({ serviceAgreement: endedAgreement }),
    ).state,
    "PCM_SERVICE_ENDED_READ_ONLY",
  );
  assert.equal(
    resolveOwnerWorkspaceState(
      authorizedContext({
        serviceAgreement: endedAgreement,
        caseSummary: {
          ...authorizedContext().caseSummary,
          caseId: "different-case",
        },
      }),
    ).state,
    "ACCESS_DENIED",
  );
  assert.equal(
    resolveOwnerWorkspaceState(
      authorizedContext({
        serviceAgreement: { ...endedAgreement, caseId: "different-case" },
      }),
    ).state,
    "ACCESS_DENIED",
  );

  const missingSummary = authorizedContext({
    serviceAgreement: endedAgreement,
    caseSummary: null,
    documents: [{ title: "沒有案件摘要時不得顯示" }],
  });
  assert.equal(
    resolveOwnerWorkspaceState(missingSummary).state,
    "AUTHORIZED_EMPTY",
  );
  assert.deepEqual(
    buildOwnerWorkspaceViewModel(missingSummary).documents,
    [],
  );
});

test("尚未生效的契約不得因缺少案件摘要而落入已授權狀態", async () => {
  const { buildOwnerWorkspaceViewModel, resolveOwnerWorkspaceState } =
    await loadRuntime();
  const pendingAgreement = authorizedContext({
    serviceAgreement: {
      agreementId: "agreement-fixture",
      version: "v-fixture",
      status: "pending",
      caseId: "case-fixture-owner-workspace",
    },
    caseSummary: null,
  });

  assert.equal(
    resolveOwnerWorkspaceState(pendingAgreement).state,
    "ACCESS_DENIED",
  );
  const model = buildOwnerWorkspaceViewModel(pendingAgreement);
  assert.equal(model.actorLabel, "尚待驗證");
  assert.equal(model.agreementVersion, "尚未確認服務版本");
});

test("服務結束只開放既有內容 read-only，不代表刪除案件紀錄", async () => {
  const { resolveOwnerWorkspaceState, buildOwnerWorkspaceViewModel } =
    await loadRuntime();
  const context = authorizedContext({
    serviceAgreement: {
      agreementId: "agreement-fixture",
      version: "v-fixture",
      status: "ended",
      caseId: "case-fixture-owner-workspace",
    },
  });

  assert.equal(
    resolveOwnerWorkspaceState(context).state,
    "PCM_SERVICE_ENDED_READ_ONLY",
  );
  const model = buildOwnerWorkspaceViewModel(context);
  assert.equal(model.readOnly, true);
  assert.equal(model.pcmInvolved, false);
  assert.match(model.statusMessage, /既有文件與紀錄仍可讀取/);
  assert.deepEqual(model.permittedActions, []);
});

test("404 不會被當成甲方身分已確認", async () => {
  const { createOwnerWorkspaceController } = await loadRuntime();
  const controller = createOwnerWorkspaceController({
    adapter: {
      loadOwnerWorkspace() {
        throw Object.assign(new Error("not found"), { status: 404 });
      },
    },
  });

  const model = await controller.initialize();
  assert.equal(model.state, "CONTRACT_CONTEXT_UNAVAILABLE");
  assert.equal(model.reasonCode, "CASE_CONTEXT_NOT_AVAILABLE");
  assert.doesNotMatch(model.statusMessage, /身分已確認/);
});

test("授權資料正規化不接受任意 redirect 或 browser authority", async () => {
  const { normalizeOwnerWorkspaceContext } = await loadRuntime();
  const result = normalizeOwnerWorkspaceContext({
    ...authorizedContext(),
    redirectUrl: "https://evil.example/owner",
    localStorageAuthorized: true,
    queryAuthorized: true,
    humanFinalDecision: "approved",
  });

  assert.equal("redirectUrl" in result, false);
  assert.equal("localStorageAuthorized" in result, false);
  assert.equal("queryAuthorized" in result, false);
  assert.equal("humanFinalDecision" in result, false);
});

test("設計決策留痕只呈現獨立欄位中明確標為 design 的事件", async () => {
  const {
    buildOwnerWorkspaceViewModel,
    createOwnerWorkspaceController,
  } = await loadRuntime();
  const mixedContext = authorizedContext({
    designDecisionTrail: [
      {
        scope: "design",
        title: "設計版次確認",
        resultLabel: "要求修改",
        documentVersionLabel: "平面配置 v3",
      },
      { scope: "construction", title: "施工缺失確認" },
      { scope: "contract", title: "契約條款確認" },
      { title: "未標示範圍的事件" },
      { scope: "unknown", title: "未知範圍事件" },
    ],
    events: [
      { title: "通用設計事件不應自動進入設計決策" },
      { title: "通用施工事件" },
      { title: "通用契約事件" },
    ],
  });

  const model = buildOwnerWorkspaceViewModel(mixedContext);
  assert.deepEqual(
    model.designDecisionTrail.map((record) => record.title),
    ["設計版次確認"],
  );

  const harness = createOwnerWorkspaceRenderHarness();
  const controller = createOwnerWorkspaceController({
    root: harness.root,
    adapter: { loadOwnerWorkspace: async () => mixedContext },
  });
  await controller.initialize();
  const trailText = renderedText(harness.lists.get("designDecisionTrail"));
  assert.match(trailText, /設計版次確認/u);
  assert.doesNotMatch(
    trailText,
    /施工缺失|契約條款|未標示範圍|未知範圍|通用設計|通用施工|通用契約/u,
  );
});

test("設計決策留痕缺少有效 design scope 時保留誠實空狀態", async () => {
  const { createOwnerWorkspaceController } = await loadRuntime();
  const harness = createOwnerWorkspaceRenderHarness();
  const controller = createOwnerWorkspaceController({
    root: harness.root,
    adapter: {
      loadOwnerWorkspace: async () => authorizedContext({
        designDecisionTrail: [
          { scope: "design" },
          { title: "缺少範圍" },
          { scope: "unknown", title: "未知範圍" },
        ],
      }),
    },
  });

  await controller.initialize();
  assert.match(
    renderedText(harness.lists.get("designDecisionTrail")),
    /尚未取得設計決策紀錄/u,
  );
});

test("設計日曆沒有有效 scheduledAt 排程時顯示誠實空狀態", async () => {
  const { createOwnerWorkspaceController } = await loadRuntime();
  const harness = createOwnerWorkspaceRenderHarness();
  const controller = createOwnerWorkspaceController({
    root: harness.root,
    adapter: {
      loadOwnerWorkspace: async () => authorizedContext({
        scheduledDesignItems: [
          {
            scope: "design",
            scheduledAt: "2026-08-18T01:00:00.000Z",
          },
          {
            scope: "design",
            title: "只有提交時間的文件",
            submittedAtLabel: "2026/08/18 09:00",
          },
          {
            scope: "unknown",
            title: "未知範圍排程",
            scheduledAt: "2026-08-18T01:00:00.000Z",
          },
        ],
      }),
    },
  });

  await controller.initialize();
  assert.equal(harness.designScheduleEmpty.hidden, false);
  assert.match(
    renderedText(harness.lists.get("calendarSubmissions")),
    /尚未取得已排程的設計事項/u,
  );
});

test("設計日曆有明確 design scheduledAt 排程時隱藏空狀態並呈現日期", async () => {
  const { createOwnerWorkspaceController } = await loadRuntime();
  const harness = createOwnerWorkspaceRenderHarness();
  const controller = createOwnerWorkspaceController({
    root: harness.root,
    adapter: {
      loadOwnerWorkspace: async () => authorizedContext({
        scheduledDesignItems: [{
          scope: "design",
          title: "甲方檢閱平面配置",
          versionLabel: "平面配置 v3",
          statusLabel: "待檢閱",
          scheduledAt: "2026-08-18T01:00:00.000Z",
          submittedAtLabel: "不可冒充排程的提交時間",
          nextActionLabel: "甲方書面回覆",
        }],
      }),
    },
  });

  await controller.initialize();
  const scheduleText = renderedText(harness.lists.get("calendarSubmissions"));
  assert.equal(harness.designScheduleEmpty.hidden, true);
  assert.match(scheduleText, /甲方檢閱平面配置/u);
  assert.match(scheduleText, /2026\/08\/18 09:00/u);
  assert.doesNotMatch(scheduleText, /不可冒充排程的提交時間/u);
});

test("runtime 不讀取瀏覽器 storage、query 或 raw HTML 注入", async () => {
  const runtime = await readPageFile("app.js");

  assert.doesNotMatch(
    runtime,
    /localStorage|sessionStorage|indexedDB|URLSearchParams|location\.search|document\.cookie/i,
  );
  assert.doesNotMatch(
    runtime,
    /\.innerHTML\s*=|insertAdjacentHTML|outerHTML\s*=/,
  );
});

test("三方訊息只有可信留痕憑證後才能顯示已記錄", async () => {
  const {
    buildOwnerWorkspaceViewModel,
    publicMessageRecordLabel,
  } = await loadRuntime();

  const recordedBody = "已記錄內容";
  const messageHash = sha256(recordedBody);
  const recordedMessage = {
    caseId: "case-fixture-owner-workspace",
    messageId: "message-recorded-fixture",
    bodySha256: messageHash,
    body: recordedBody,
    recordReceipt: {
      receiptId: "receipt-fixture",
      status: "recorded",
      recordedAt: "2026-08-02T02:00:00.000Z",
      caseId: "case-fixture-owner-workspace",
      messageId: "message-recorded-fixture",
      bodySha256: messageHash,
    },
  };

  assert.equal(publicMessageRecordLabel(), "尚未記錄");
  assert.equal(
    publicMessageRecordLabel(recordedMessage, "case-fixture-owner-workspace"),
    "已記錄於萊比後台",
  );
  const longBody = "甲".repeat(100);
  const longBodyHash = sha256(longBody);
  assert.equal(
    publicMessageRecordLabel(
      {
        ...recordedMessage,
        body: longBody,
        bodySha256: longBodyHash,
        recordReceipt: {
          ...recordedMessage.recordReceipt,
          bodySha256: longBodyHash,
        },
      },
      "case-fixture-owner-workspace",
    ),
    "已記錄於萊比後台",
  );
  assert.equal(
    publicMessageRecordLabel(
      {
        ...recordedMessage,
        recordReceipt: {
          ...recordedMessage.recordReceipt,
          status: "pending",
        },
      },
      "case-fixture-owner-workspace",
    ),
    "尚未記錄",
  );

  const invalidBindings = [
    {
      ...recordedMessage,
      recordReceipt: {
        ...recordedMessage.recordReceipt,
        caseId: "different-case",
      },
    },
    {
      ...recordedMessage,
      recordReceipt: {
        ...recordedMessage.recordReceipt,
        messageId: "different-message",
      },
    },
    {
      ...recordedMessage,
      recordReceipt: {
        ...recordedMessage.recordReceipt,
        bodySha256: "b".repeat(64),
      },
    },
    {
      ...recordedMessage,
      recordReceipt: {
        ...recordedMessage.recordReceipt,
        recordedAt: "not-a-time",
      },
    },
    {
      ...recordedMessage,
      body: "遭竄改的訊息內容",
    },
    {
      ...recordedMessage,
      recordReceipt: {
        ...recordedMessage.recordReceipt,
        recordedAt: "2026-02-31T00:00:00Z",
      },
    },
  ];
  for (const message of invalidBindings) {
    assert.equal(
      publicMessageRecordLabel(message, "case-fixture-owner-workspace"),
      "尚未記錄",
    );
  }

  const visibleBody = "只有這一筆可顯示";
  const visibleBodyHash = sha256(visibleBody);
  const model = buildOwnerWorkspaceViewModel(
    authorizedContext({
      publicMessages: [
        {
          actorLabel: "未留痕訊息",
          body: "不能靠傳入標籤宣稱已記錄",
          recordStatusLabel: "已記錄於萊比後台",
        },
        {
          actorLabel: "已留痕訊息",
          body: visibleBody,
          caseId: "case-fixture-owner-workspace",
          messageId: "message-recorded-fixture",
          bodySha256: visibleBodyHash,
          recordedAtLabel: "不得採用 caller 顯示時間",
          recordStatusLabel: "尚未記錄",
          recordReceipt: {
            receiptId: "receipt-recorded-message",
            status: "recorded",
            recordedAt: "2026-08-02T00:00:00Z",
            caseId: "case-fixture-owner-workspace",
            messageId: "message-recorded-fixture",
            bodySha256: visibleBodyHash,
          },
        },
      ],
    }),
  );

  assert.equal(model.messages.length, 1);
  assert.equal(model.messages[0].actorLabel, "已留痕訊息");
  assert.equal(model.messages[0].recordStatusLabel, "已記錄於萊比後台");
  assert.equal(model.messages[0].recordedAtLabel, "2026/08/02 08:00");
});

test("外部可見文案不含工程語、金流、AI最終裁決或投資承諾", async () => {
  const [html, runtime] = await Promise.all([
    readPageFile("code.html"),
    readPageFile("app.js"),
  ]);
  const externalCopySources = `${html}\n${runtime}`;

  assert.doesNotMatch(
    externalCopySources,
    /\bmock\b|\bAPI\b|\bDB\b|debug|raw JSON|stack trace|本機候選|無 DB 寫入|功能停用|API 未開/i,
  );
  assert.doesNotMatch(
    externalCopySources,
    /金流|付款授權|託管|代收代付|最低價|零風險|老屋投資|老屋煉金術|翻修獲利|裝修理財|AI\s*最終裁決/,
  );
});

test("文件下載尚未接線時只使用未來式說明", async () => {
  const html = await readPageFile("code.html");

  assert.doesNotMatch(html, /仍可讀取與下載既有文件/);
  assert.match(html, /下載入口正式開放後/);
});

test("外部頁面使用產品語，不顯示實作術語或英文區塊標籤", async () => {
  const html = await readPageFile("code.html");

  assert.doesNotMatch(
    html,
    />\s*(Overview|Exact version|Same facts|Open record|Written governance|Document decision|Today & next|Trace|Case context|Decision boundary|Quick links)\s*</i,
  );
  assert.doesNotMatch(
    html,
    /\bexact\b|read-only|瀏覽器|正式能力仍在接線|可信登入|Human PCM/i,
  );
});

test("已授權或服務結束時不顯示與案件狀態矛盾的未開放提示", async () => {
  const [html, css] = await Promise.all([
    readPageFile("code.html"),
    readPageFile("styles.css"),
  ]);

  assert.match(
    html,
    /class="aside-panel aside-panel--quiet workspace-readiness-note"/,
  );
  assert.match(
    css,
    /body\[data-workspace-state="AUTHORIZED_READY"\][\s\S]{0,180}\.workspace-readiness-note[\s\S]{0,80}display:\s*none/i,
  );
  assert.match(
    css,
    /body\[data-workspace-state="PCM_SERVICE_ENDED_READ_ONLY"\][\s\S]{0,180}\.workspace-readiness-note[\s\S]{0,80}display:\s*none/i,
  );
});

test("LaiBE 深色工具介面具三 breakpoint、focus、44px與 reduced motion", async () => {
  const css = await readPageFile("styles.css");

  for (const token of ["#090b0d", "#f4f1ea", "#9aa3ad", "#f2c14e", "#ff8a2b"]) {
    assert.match(css, new RegExp(token, "i"));
  }
  assert.match(css, /min-height:\s*44px/i);
  assert.match(css, /:focus-visible/);
  assert.match(css, /@media\s*\(max-width:\s*980px\)/i);
  assert.match(css, /@media\s*\(max-width:\s*620px\)/i);
  assert.match(css, /@media\s*\(prefers-reduced-motion:\s*reduce\)/i);
  assert.doesNotMatch(
    css,
    /context-chip:not\(\.context-chip--role\)[\s\S]{0,100}display:\s*none/i,
  );
  assert.match(
    css,
    /context-chip--state[\s\S]{0,160}text-overflow:\s*ellipsis/i,
  );
});

test("頁面保留 skip link 與真實同源快速入口", async () => {
  const html = await readPageFile("code.html");

  assert.match(html, /class="skip-link"\s+href="#main-content"/);
  assert.match(
    html,
    /href="\.\.\/pcm_standalone\/public_home\/code\.html#top"/,
  );
  assert.match(html, /href="\.\.\/pcm_standalone\/case_summary\/code\.html"/);
  assert.match(html, /href="\.\.\/pcm_standalone\/about_drs\/code\.html"/);
  assert.match(html, /href="\.\.\/pcm_standalone\/service_contract\/code\.html"/);
  assert.match(html, /href="#documents"/);
});

const CANONICAL_OWNER_CASE_ID = "9e000000-0000-4000-8000-000000000201";
const OWNER_USER_ID = "9e000000-0000-4000-8000-000000000001";
const SNAPSHOT_VERSION = "db19715d-deab-4a9f-8dc0-4502269e4702";
const SNAPSHOT_SHA256 =
  "2a30f7736c8a62f5ae7a3cc82fe1fe10270ae215d1f4c9ed35d843538badeb4c";
const SNAPSHOT_BYTES = 1535;
const READ_AT = "2026-08-09T11:30:00.000Z";
const GOLDEN_SNAPSHOT_PREIMAGE = '{"case": {"title": "Owner case", "caseId": "9e000000-0000-4000-8000-000000000201", "status": "active"}, "status": "CASE_DATA_AVAILABLE", "viewer": {"role": "owner", "userId": "9e000000-0000-4000-8000-000000000001", "identityStatus": "line_bound", "identityVerified": true}, "actions": ["view_case", "view_public_messages"], "pcmDomain": {"code": "contract"}, "schemaName": "laibe.owner-workspace-read.v1", "caseBinding": {"boundAt": "2026-08-09T11:29:44.000Z", "bindingStatus": "active", "assignmentKind": "participant"}, "schemaVersion": "laibe.owner-workspace-read.v1", "publicMessages": [{"body": "Owner workspace public message", "actor": {"role": "owner", "userId": "9e000000-0000-4000-8000-000000000001"}, "messageId": "9e000000-0000-4000-8000-000000000501", "bodySha256": "00ca5b0783937736eae3f21ed8fc46ad19214e9b768d9cf276ca292283ae3263", "recordReceipt": {"caseId": "9e000000-0000-4000-8000-000000000201", "messageId": "9e000000-0000-4000-8000-000000000501", "receiptId": "9e000000-0000-4000-8000-000000000601", "bodySha256": "00ca5b0783937736eae3f21ed8fc46ad19214e9b768d9cf276ca292283ae3263", "recordedAt": "2026-08-09T11:29:44.000Z", "schemaName": "laibe.owner-workspace-message-record-receipt.v1", "schemaVersion": "laibe.owner-workspace-message-record-receipt.v1"}}], "snapshotVersion": "db19715d-deab-4a9f-8dc0-4502269e4702", "serviceAgreement": {"status": "active", "endedAt": null, "agreementId": "9e000000-0000-4000-8000-000000000401", "versionNumber": 1, "agreementVersionId": "9e000000-0000-4000-8000-000000000301"}}';

function loadBootstrap() {
  return import(new URL("owner-workspace-bootstrap.js", pageRoot).href);
}

function ownerRuntimeWorkspace(options = {}) {
  const payload = JSON.parse(GOLDEN_SNAPSHOT_PREIMAGE);
  if ("status" in options) payload.status = options.status;
  if ("agreementStatus" in options) {
    payload.serviceAgreement.status = options.agreementStatus;
    payload.serviceAgreement.endedAt = options.agreementStatus === "ended"
      ? "2026-08-09T11:29:59.000Z"
      : null;
  }
  if ("actions" in options) payload.actions = options.actions;
  if ("caseStatus" in options) payload.case.status = options.caseStatus;
  if ("publicMessages" in options) {
    payload.publicMessages = options.publicMessages;
  }
  if (payload.status === "ZERO_CASE_DATA") {
    payload.publicMessages = [];
    payload.actions = [];
  }
  if (payload.serviceAgreement.status === "ended") {
    payload.actions = [];
  }
  if (Reflect.ownKeys(options).length > 0) {
    payload.snapshotVersion =
      options.snapshotVersion ?? "aa000000-0000-4000-8000-000000000202";
  }
  const snapshotPreimage = Reflect.ownKeys(options).length === 0
    ? GOLDEN_SNAPSHOT_PREIMAGE
    : JSON.stringify(payload);
  const snapshotSha256 = sha256(snapshotPreimage);
  return {
    ...JSON.parse(snapshotPreimage),
    readAt: READ_AT,
    canonicalization: {
      id: "laibe.server-issued-json-text.utf8.v1",
      version: 1,
      encoding: "UTF-8",
    },
    snapshotPreimage,
    readReceipt: {
      schemaName: "laibe.owner-workspace-read-receipt.v1",
      schemaVersion: "laibe.owner-workspace-read-receipt.v1",
      receiptId: "9e000000-0000-4000-8000-000000000702",
      caseId: CANONICAL_OWNER_CASE_ID,
      snapshotVersion: payload.snapshotVersion,
      snapshotSha256,
      snapshotByteLength: Buffer.byteLength(snapshotPreimage, "utf8"),
      canonicalizationId: "laibe.server-issued-json-text.utf8.v1",
      canonicalizationVersion: 1,
      issuedAt: READ_AT,
    },
  };
}

function messageFor(index, body) {
  const suffix = String(index + 1).padStart(12, "0");
  const receiptSuffix = String(index + 1001).padStart(12, "0");
  const bodySha256 = sha256(body);
  const messageId = "9e000000-0000-4000-8000-" + suffix;
  return {
    body,
    actor: {
      role: "owner",
      userId: OWNER_USER_ID,
    },
    messageId,
    bodySha256,
    recordReceipt: {
      caseId: CANONICAL_OWNER_CASE_ID,
      messageId,
      receiptId: "9e000000-0000-4000-8000-" + receiptSuffix,
      bodySha256,
      recordedAt: "2026-08-09T11:29:44.000Z",
      schemaName: "laibe.owner-workspace-message-record-receipt.v1",
      schemaVersion: "laibe.owner-workspace-message-record-receipt.v1",
    },
  };
}

test("canonical owner workspace bootstrap uses only explicit trusted injection", async () => {
  const source = await readPageFile("owner-workspace-bootstrap.js");

  assert.doesNotMatch(
    source,
    /URLSearchParams|location\.|document\.cookie|localStorage|sessionStorage|indexedDB|dataset|querySelector\([^)]*script|LaibePcmCanonicalRuntime|globalThis\[/i,
  );
  assert.match(source, /authorizedCaseId/);
  assert.match(source, /loadOwnerWorkspace/);
});

test("invalid bootstrap dependencies fail closed before provider invocation", async () => {
  const { createOwnerWorkspaceBootstrap } = await loadBootstrap();
  let calls = 0;
  const loadOwnerWorkspace = async () => {
    calls += 1;
    return ownerRuntimeWorkspace();
  };
  const accessorInput = { root: null, loadOwnerWorkspace };
  Object.defineProperty(accessorInput, "authorizedCaseId", {
    enumerable: true,
    get() {
      calls += 100;
      return CANONICAL_OWNER_CASE_ID;
    },
  });
  const proxyInput = new Proxy({}, {
    ownKeys() {
      throw new Error("private trap detail");
    },
  });
  const cases = [
    undefined,
    {
      root: null,
      authorizedCaseId: CANONICAL_OWNER_CASE_ID.toUpperCase(),
      loadOwnerWorkspace,
    },
    {
      root: null,
      authorizedCaseId: new String(CANONICAL_OWNER_CASE_ID),
      loadOwnerWorkspace,
    },
    accessorInput,
    proxyInput,
  ];

  for (const input of cases) {
    const controller = createOwnerWorkspaceBootstrap(input);
    const model = await controller.initialize();
    assert.equal(model.state, "CONTRACT_CONTEXT_UNAVAILABLE");
    assert.deepEqual(model.documents, []);
    assert.deepEqual(model.messages, []);
  }
  assert.equal(calls, 0);
});

test("bootstrap sends the canonical selector and maps ready zero and ended states", async () => {
  const { createOwnerWorkspaceBootstrap } = await loadBootstrap();
  const observed = [];
  const run = async (workspace) => {
    const controller = createOwnerWorkspaceBootstrap({
      root: null,
      authorizedCaseId: CANONICAL_OWNER_CASE_ID,
      async loadOwnerWorkspace(selector) {
        observed.push(selector);
        return workspace;
      },
    });
    return controller.initialize();
  };

  const ready = await run(ownerRuntimeWorkspace());
  assert.equal(ready.state, "AUTHORIZED_READY");
  assert.equal(ready.caseName, "Owner case");
  assert.equal(ready.messages.length, 1);

  const zero = await run(ownerRuntimeWorkspace({ status: "ZERO_CASE_DATA" }));
  assert.equal(zero.state, "AUTHORIZED_EMPTY");
  assert.deepEqual(zero.messages, []);

  const ended = await run(ownerRuntimeWorkspace({ agreementStatus: "ended" }));
  assert.equal(ended.state, "PCM_SERVICE_ENDED_READ_ONLY");
  assert.equal(ended.readOnly, true);
  assert.deepEqual(ended.permittedActions, []);

  assert.equal(observed.length, 3);
  for (const selector of observed) {
    assert.deepEqual(Reflect.ownKeys(selector), ["caseId"]);
    assert.equal(selector.caseId, CANONICAL_OWNER_CASE_ID);
  }
});

test("denied and retryable provider results expose fixed product states without stale data", async () => {
  const { createOwnerWorkspaceBootstrap } = await loadBootstrap();
  let turn = 0;
  const controller = createOwnerWorkspaceBootstrap({
    root: null,
    authorizedCaseId: CANONICAL_OWNER_CASE_ID,
    async loadOwnerWorkspace() {
      turn += 1;
      if (turn === 1) return ownerRuntimeWorkspace();
      if (turn === 2) {
        throw Object.assign(new Error("server secret"), {
          code: "OWNER_ACCESS_DENIED",
        });
      }
      throw Object.assign(new Error("transport secret"), {
        code: "OWNER_WORKSPACE_READ_RETRYABLE",
      });
    },
  });

  const ready = await controller.initialize();
  assert.equal(ready.state, "AUTHORIZED_READY");
  assert.equal(ready.messages.length, 1);

  const denied = await controller.initialize();
  assert.equal(denied.state, "ACCESS_DENIED");
  assert.deepEqual(denied.documents, []);
  assert.deepEqual(denied.messages, []);
  assert.doesNotMatch(JSON.stringify(denied), /server secret/);

  const retryable = await controller.initialize();
  assert.equal(retryable.state, "LOAD_FAILED_RETRYABLE");
  assert.deepEqual(retryable.documents, []);
  assert.deepEqual(retryable.messages, []);
  assert.doesNotMatch(JSON.stringify(retryable), /transport secret/);
});
test("replays the exact accepted A6 normalized vector", async () => {
  assert.equal(sha256(GOLDEN_SNAPSHOT_PREIMAGE), SNAPSHOT_SHA256);
  assert.equal(
    Buffer.byteLength(GOLDEN_SNAPSHOT_PREIMAGE, "utf8"),
    SNAPSHOT_BYTES,
  );
  const { createOwnerWorkspaceBootstrap } = await loadBootstrap();
  const controller = createOwnerWorkspaceBootstrap({
    root: null,
    authorizedCaseId: CANONICAL_OWNER_CASE_ID,
    async loadOwnerWorkspace() {
      return ownerRuntimeWorkspace();
    },
  });
  const model = await controller.initialize();

  assert.equal(model.state, "AUTHORIZED_READY");
  assert.equal(model.caseName, "Owner case");
  assert.equal(model.messages.length, 1);
  assert.equal(model.messages[0].body, "Owner workspace public message");
});

test("preserves complete message bytes and the full A6 message collection", async () => {
  const { createOwnerWorkspaceBootstrap } = await loadBootstrap();
  const longBody = "Line one  with  spaces\n" + "x".repeat(600);
  const messages = Array.from(
    { length: 101 },
    (_, index) => messageFor(index, index === 0 ? longBody : "message " + index),
  );
  const controller = createOwnerWorkspaceBootstrap({
    root: null,
    authorizedCaseId: CANONICAL_OWNER_CASE_ID,
    async loadOwnerWorkspace() {
      return ownerRuntimeWorkspace({ publicMessages: messages });
    },
  });
  const model = await controller.initialize();

  assert.equal(model.state, "AUTHORIZED_READY");
  assert.equal(model.messages.length, 101);
  assert.equal(model.messages[0].body, longBody);
  assert.equal(model.messages[0].bodySha256, sha256(longBody));
});

test("keeps one controller and one retry listener across trusted injection", async () => {
  const { createOwnerWorkspaceBootstrap } = await loadBootstrap();
  const listeners = [];
  const retry = {
    hidden: true,
    addEventListener(type, listener) {
      listeners.push([type, listener]);
    },
  };
  const root = {
    body: { dataset: {} },
    querySelector(selector) {
      return selector === '[data-action="retry"]' ? retry : null;
    },
    querySelectorAll() {
      return [];
    },
  };
  let calls = 0;
  const page = createOwnerWorkspaceBootstrap({
    root,
    authorizedCaseId: null,
    loadOwnerWorkspace: null,
  });

  assert.equal((await page.initialize()).state, "CONTRACT_CONTEXT_UNAVAILABLE");
  const ready = await page.configureOwnerWorkspace({
    authorizedCaseId: CANONICAL_OWNER_CASE_ID,
    async loadOwnerWorkspace() {
      calls += 1;
      return ownerRuntimeWorkspace();
    },
  });
  assert.equal(ready.state, "AUTHORIZED_READY");
  assert.equal(calls, 1);
  assert.equal(listeners.length, 1);
  assert.equal(listeners[0][0], "click");

  listeners[0][1]();
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(calls, 2);
  assert.equal(listeners.length, 1);
});

test("rejects receipt drift and coercive normalized fields without invoking hooks", async () => {
  const { createOwnerWorkspaceBootstrap } = await loadBootstrap();
  let coercions = 0;
  const cases = [];

  const badDigest = ownerRuntimeWorkspace();
  badDigest.readReceipt.snapshotSha256 = "b".repeat(64);
  cases.push(badDigest);

  const badSchema = ownerRuntimeWorkspace();
  badSchema.schemaName = "browser.workspace";
  cases.push(badSchema);

  const badVersion = ownerRuntimeWorkspace();
  badVersion.serviceAgreement.versionNumber = {
    [Symbol.toPrimitive]() {
      coercions += 1;
      throw new Error("private coercion detail");
    },
  };
  cases.push(badVersion);

  for (const workspace of cases) {
    const controller = createOwnerWorkspaceBootstrap({
      root: null,
      authorizedCaseId: CANONICAL_OWNER_CASE_ID,
      async loadOwnerWorkspace() {
        return workspace;
      },
    });
    const model = await controller.initialize();
    assert.equal(model.state, "ACCESS_DENIED");
    assert.deepEqual(model.messages, []);
  }
  assert.equal(coercions, 0);
});
// WEB-STITCH-REWORK2-RACE-RED
function deferredResult() {
  let resolve;
  let reject;
  const promise = new Promise((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, reject, resolve };
}

test("latest owner workspace load wins across authoritative reconfiguration", async () => {
  const { createOwnerWorkspaceBootstrap } = await loadBootstrap();
  const older = deferredResult();
  const page = createOwnerWorkspaceBootstrap({
    root: null,
    authorizedCaseId: CANONICAL_OWNER_CASE_ID,
    async loadOwnerWorkspace() {
      return older.promise;
    },
  });

  const olderLoad = page.initialize();
  const newer = await page.configureOwnerWorkspace({
    authorizedCaseId: CANONICAL_OWNER_CASE_ID,
    async loadOwnerWorkspace() {
      const workspace = ownerRuntimeWorkspace({ caseStatus: "on_hold" });
      workspace.case.title = "Newer owner case";
      const payload = JSON.parse(workspace.snapshotPreimage);
      payload.case.title = "Newer owner case";
      workspace.snapshotPreimage = JSON.stringify(payload);
      workspace.readReceipt.snapshotSha256 = sha256(workspace.snapshotPreimage);
      workspace.readReceipt.snapshotByteLength = Buffer.byteLength(
        workspace.snapshotPreimage,
        "utf8",
      );
      return workspace;
    },
  });
  assert.equal(newer.state, "AUTHORIZED_READY");
  assert.equal(newer.caseName, "Newer owner case");

  older.resolve(ownerRuntimeWorkspace());
  const staleCompletion = await olderLoad;
  assert.equal(staleCompletion.state, "AUTHORIZED_READY");
  assert.equal(staleCompletion.caseName, "Newer owner case");
});

test("late authorized data cannot overwrite a newer denial or retry result", async () => {
  const { createOwnerWorkspaceBootstrap } = await loadBootstrap();
  const first = deferredResult();
  const second = deferredResult();
  let call = 0;
  const page = createOwnerWorkspaceBootstrap({
    root: null,
    authorizedCaseId: CANONICAL_OWNER_CASE_ID,
    async loadOwnerWorkspace() {
      call += 1;
      return call === 1 ? first.promise : second.promise;
    },
  });

  const olderLoad = page.initialize();
  const newerLoad = page.initialize();
  second.reject(Object.assign(new Error("new denial"), {
    code: "OWNER_ACCESS_DENIED",
  }));
  const denied = await newerLoad;
  assert.equal(denied.state, "ACCESS_DENIED");

  first.resolve(ownerRuntimeWorkspace());
  const staleCompletion = await olderLoad;
  assert.equal(staleCompletion.state, "ACCESS_DENIED");
  assert.deepEqual(staleCompletion.messages, []);
});

test("bootstrap mirrors the closed A6 action message and case-state invariants", async () => {
  const { createOwnerWorkspaceBootstrap } = await loadBootstrap();
  const validActions = ownerRuntimeWorkspace({
    actions: ["view_case", "view_documents", "view_public_messages"],
  });
  const validController = createOwnerWorkspaceBootstrap({
    root: null,
    authorizedCaseId: CANONICAL_OWNER_CASE_ID,
    async loadOwnerWorkspace() {
      return validActions;
    },
  });
  assert.equal((await validController.initialize()).state, "AUTHORIZED_READY");

  const duplicateActions = ownerRuntimeWorkspace({
    actions: ["view_case", "view_case"],
  });
  const unknownAction = ownerRuntimeWorkspace({ actions: ["view_case", "edit_case"] });
  const invalidActorId = messageFor(20, "valid body");
  invalidActorId.actor.userId = invalidActorId.actor.userId.toUpperCase();
  const invalidActorRole = messageFor(21, "valid body");
  invalidActorRole.actor.role = "designer";
  const malformedBody = messageFor(22, "\ud800");
  const overlongBody = messageFor(23, "x".repeat(20001));
  const invalidCases = [
    duplicateActions,
    unknownAction,
    ownerRuntimeWorkspace({ publicMessages: [invalidActorId] }),
    ownerRuntimeWorkspace({ publicMessages: [invalidActorRole] }),
    ownerRuntimeWorkspace({ publicMessages: [malformedBody] }),
    ownerRuntimeWorkspace({ publicMessages: [overlongBody] }),
    ownerRuntimeWorkspace({ caseStatus: "archived" }),
  ];

  for (const workspace of invalidCases) {
    const controller = createOwnerWorkspaceBootstrap({
      root: null,
      authorizedCaseId: CANONICAL_OWNER_CASE_ID,
      async loadOwnerWorkspace() {
        return workspace;
      },
    });
    const model = await controller.initialize();
    assert.equal(model.state, "ACCESS_DENIED");
    assert.deepEqual(model.messages, []);
  }
});

test("valid A6 roles and case states retain precise Traditional Chinese meaning", async () => {
  const { createOwnerWorkspaceBootstrap } = await loadBootstrap();
  const roleCases = [
    ["owner", "\u696d\u4e3b"],
    ["pro", "\u8a2d\u8a08\u5e2b\uff0f\u7d71\u5305"],
    ["pcm", "PCM"],
    ["admin", "\u7ba1\u7406\u8005"],
  ];
  const messages = roleCases.map(([role], index) => {
    const message = messageFor(index + 30, "role " + role);
    message.actor.role = role;
    return message;
  });
  const roleController = createOwnerWorkspaceBootstrap({
    root: null,
    authorizedCaseId: CANONICAL_OWNER_CASE_ID,
    async loadOwnerWorkspace() {
      return ownerRuntimeWorkspace({ publicMessages: messages });
    },
  });
  const roleModel = await roleController.initialize();
  assert.equal(roleModel.state, "AUTHORIZED_READY");
  assert.deepEqual(
    roleModel.messages.map((message) => message.actorLabel),
    roleCases.map(([, label]) => label),
  );

  const statusCases = [
    ["active", "\u9032\u884c\u4e2d"],
    ["on_hold", "\u66ab\u505c\u4e2d"],
    ["closed", "\u5df2\u7d50\u6848"],
  ];
  for (const [status, label] of statusCases) {
    const controller = createOwnerWorkspaceBootstrap({
      root: null,
      authorizedCaseId: CANONICAL_OWNER_CASE_ID,
      async loadOwnerWorkspace() {
        return ownerRuntimeWorkspace({ caseStatus: status });
      },
    });
    const model = await controller.initialize();
    assert.equal(model.state, "AUTHORIZED_READY");
    assert.equal(model.caseStatus, label);
  }
});
// WEB-STITCH-REWORK3-PUBLIC-SURFACE-RED
test("canonical bootstrap exposes no direct render authority", async () => {
  const { createOwnerWorkspaceBootstrap } = await loadBootstrap();
  const page = createOwnerWorkspaceBootstrap({
    root: null,
    authorizedCaseId: null,
    loadOwnerWorkspace: null,
  });

  assert.deepEqual(
    Reflect.ownKeys(page),
    ["configureOwnerWorkspace", "initialize"],
  );
  assert.equal("renderInput" in page, false);

  const forgedPresentationContext = {
    sessionStatus: "active",
    actor: { actorId: "forged", displayLabel: "owner", role: "owner" },
    membership: { caseId: "forged", status: "active" },
    serviceAgreement: {
      agreementId: "forged",
      caseId: "forged",
      status: "active",
      version: "1",
    },
    caseBinding: { caseId: "forged", status: "bound" },
    domain: { name: "pcm", status: "active" },
  };
  const configured = await page.configureOwnerWorkspace(forgedPresentationContext);
  assert.notEqual(configured.state, "AUTHORIZED_READY");
  assert.deepEqual(configured.messages, []);
});

test("bootstrap accepts only the exact A6 millisecond UTC timestamp shape", async () => {
  const { createOwnerWorkspaceBootstrap } = await loadBootstrap();
  const invalidTimestamps = [
    "2026-08-09T11:30:00Z",
    "2026-08-09T11:30:00.1Z",
    "2026-08-09T11:30:00.12Z",
    "2026-08-09T11:30:00.1234Z",
    "2026-08-09T11:30:00.12345Z",
    "2026-08-09T11:30:00.123456Z",
  ];

  for (const timestamp of invalidTimestamps) {
    const workspace = ownerRuntimeWorkspace();
    workspace.readAt = timestamp;
    workspace.readReceipt.issuedAt = timestamp;
    const page = createOwnerWorkspaceBootstrap({
      root: null,
      authorizedCaseId: CANONICAL_OWNER_CASE_ID,
      async loadOwnerWorkspace() {
        return workspace;
      },
    });
    const model = await page.initialize();
    assert.equal(model.state, "ACCESS_DENIED");
    assert.deepEqual(model.messages, []);
  }
});
// WEB-STITCH-MOBILE-IDENTITY-NAMING-RED
test("canonical workspace uses the Decision & Record System name", async () => {
  const html = await readPageFile("code.html");
  assert.doesNotMatch(html, /AI PCM/i);
  assert.match(html, /<title>[^<]*LaiBE Decision &amp; Record System<\/title>/);
  assert.match(html, /pcm_standalone\/shared\/drs-brand\.css/u);
  assert.match(html, /class="drs-brand-lockup drs-brand-lockup--expanded"/u);
  assert.match(html, /Decision[\s\S]*Record[\s\S]*System/u);
  assert.match(html, /class="drs-brand-name">裝潢決策系統<\/small>/u);
  assert.match(html, /aria-label="LaiBE DRS 首頁"/u);
});

test("workspace header keeps role, case, and service-agreement context distinct on desktop and mobile", async () => {
  const [html, css] = await Promise.all([
    readPageFile("code.html"),
    readPageFile("styles.css"),
  ]);
  const header = html.slice(
    html.indexOf('<header class="workspace-header"'),
    html.indexOf("</header>"),
  );

  assert.match(header, /工作台角色[\s\S]*甲方/u);
  assert.match(header, /案件[\s\S]*data-slot="case-name"[^>]*data-header-context-value="case"[^>]*>尚未連結正式案件/u);
  assert.match(header, /服務契約[\s\S]*data-slot="agreement-label"[^>]*data-header-context-value="agreement"[^>]*>尚未確認/u);
  assert.doesNotMatch(header, /data-slot="header-state"/u);
  assert.doesNotMatch(css, /context-chip\[data-slot="case-name"\]\s*\{[^}]*display:\s*none/i);
  assert.match(css, /\.workspace-header__context\s*\{[^}]*flex-wrap:\s*wrap/is);
  assert.match(css, /@media\s*\(max-width:\s*760px\)[\s\S]*\.workspace-header__context[\s\S]*grid-template-columns:\s*1fr/is);
  assert.match(css, /\.brand\s*\{[^}]*min-height:\s*44px/is);
});

test("owner header runtime binds manifest routes fail closed and updates only context values", async () => {
  const {
    bindOwnerWorkspaceCanonicalLinks,
    renderOwnerHeaderContext,
  } = await loadRuntime();
  const { createOwnerWorkspaceBootstrap } = await loadBootstrap();
  const html = await readPageFile("code.html");
  const { root, nodes } = createHeaderDomHarness(html);

  createOwnerWorkspaceBootstrap({
    root,
    authorizedCaseId: null,
    loadOwnerWorkspace: null,
  });
  assert.equal(nodes.get("[data-owner-brand-link]").getAttribute("href"), "../public_home/code.html#top");
  assert.equal(
    nodes.get("[data-owner-service-contract-link]").getAttribute("href"),
    "../pcm_standalone/service_contract/code.html?returnTo=owner-contract#full-contract",
  );
  assert.equal(nodes.get("[data-owner-brand-link]").hasAttribute("aria-disabled"), false);
  assert.equal(nodes.get("[data-owner-brand-link]").hasAttribute("tabindex"), false);

  renderOwnerHeaderContext(root, {
    caseName: "新竹住宅案",
    agreementLabel: "DRS 服務契約：有效",
  });
  assert.equal(nodes.get('[data-header-context-value="case"]').textContent, "新竹住宅案");
  assert.equal(nodes.get('[data-header-context-value="agreement"]').textContent, "有效");

  assert.equal(bindOwnerWorkspaceCanonicalLinks(root, () => "../wrong.html"), false);
  assert.equal(nodes.get("[data-owner-brand-link]").hasAttribute("href"), false);
  assert.equal(nodes.get("[data-owner-service-contract-link]").hasAttribute("href"), false);
  assert.equal(nodes.get("[data-owner-brand-link]").getAttribute("aria-disabled"), "true");
  assert.equal(bindOwnerWorkspaceCanonicalLinks(root, () => { throw new Error("route unavailable"); }), false);
  assert.equal(nodes.get("[data-owner-service-contract-link]").hasAttribute("href"), false);
});

test("甲方契約工作區先交代角色、版本、狀態、責任與唯一主要行動", async () => {
  const html = await readPageFile("code.html");
  const panel = ownerContractPanel(html);

  assert.ok(panel, "contract panel exists");
  assert.match(panel, /目前角色/u);
  assert.match(panel, /甲方（業主）/u);
  assert.match(panel, /本案契約/u);
  assert.match(panel, /目前狀態/u);
  assert.match(panel, /下一位處理者/u);
  assert.match(panel, /查看 DRS 服務契約全文/u);
  assert.match(panel, /data-owner-service-contract-link[^>]*>\s*查看 DRS 服務契約全文/u);
  assert.doesNotMatch(panel, /data-owner-service-contract-link[^>]*\shref=/u);
  assert.equal((panel.match(/owner-contract-recovery-action/g) || []).length, 1);
  assert.match(panel, /data-owner-contract-trusted-action[^>]*disabled[^>]*aria-disabled="true"/u);
});

test("甲方契約工作區先顯示甲乙共用契約全文，再進入補充或變更草稿", async () => {
  const html = await readPageFile("code.html");
  const panel = ownerContractPanel(html);
  const sharedContractStart = panel.indexOf("data-shared-contract");
  const draftEditorStart = panel.indexOf("data-owner-contract-editor");

  assert.ok(sharedContractStart >= 0, "shared contract card exists");
  assert.ok(draftEditorStart > sharedContractStart, "shared contract precedes the draft editor");
  assert.match(panel, /data-shared-contract-id="LAIBE-DESIGN-BUILD-V02"/u);
  assert.match(panel, /data-shared-contract-type="DESIGN_BUILD"/u);
  assert.match(panel, /建築物室內裝修設計及工程承攬契約/u);
  assert.match(panel, /目前顯示中性契約範本；尚未連結案件，也尚未分享給乙方/u);
  assert.match(
    panel,
    /data-shared-contract-preview[^>]*href="\.\.\/\.\.\/\.\.\/site\/standard_contract_editor\/code\.html\?contractType=DESIGN_BUILD&amp;returnTo=owner"/u,
  );
  assert.match(panel, /查看契約全文/u);
});

test("甲方契約編輯依總覽、待填、變更與紀錄分頁呈現且草稿編輯器預設展開", async () => {
  const html = await readPageFile("code.html");
  const panel = ownerContractPanel(html);
  const previewStart = panel.indexOf("data-shared-contract");
  const factsStart = panel.indexOf('data-owner-contract-view-panel="facts"');
  const editorStart = panel.indexOf("data-owner-contract-editor");
  const recordsStart = panel.indexOf('data-owner-contract-view-panel="records"');

  assert.ok(previewStart >= 0, "shared preview exists");
  assert.ok(factsStart > previewStart, "facts task follows the preview");
  assert.ok(editorStart > factsStart, "change editor follows the facts task");
  assert.ok(recordsStart > editorStart, "records follow the change editor");
  assert.match(panel, /本案契約資料草稿/u);
  assert.match(panel, /雙方與專案/u);
  assert.match(panel, /工作範圍、價金與工期/u);
  assert.match(panel, /付款、驗收與保固/u);
  assert.match(panel, /<details[^>]*data-owner-contract-editor[^>]*open/u);
  assert.match(panel, /不會直接改動契約全文/u);
  assert.match(panel, /目前只保留在這個頁面/u);
});

test("甲方契約工作區以漸進方式涵蓋七類影響、四方責任與 session 邊界", async () => {
  const html = await readPageFile("code.html");
  const requiredImpactKeys = [
    "scope",
    "price",
    "time",
    "payment",
    "acceptance",
    "material",
    "warranty",
  ];

  for (const key of requiredImpactKeys) {
    assert.match(html, new RegExp(`data-owner-contract-impact="${key}"`));
  }
  for (const label of ["萊比風險整理", "甲方提出", "乙方回覆", "雙方確認"]) {
    assert.match(html, new RegExp(label));
  }
  assert.match(html, /版本與案件紀錄/u);
  assert.match(html, /補充與變更/u);
  assert.match(html, /附件資訊草稿/u);
  assert.match(html, /本次草稿預覽/u);
  assert.match(html, /尚未正式儲存或送出/u);
  assert.match(html, /重新整理後不會保留/u);
  assert.match(html, /只記錄檔名與說明，不會上傳檔案/u);
  assert.doesNotMatch(html, /上傳成功|已簽署|付款完成|正式合意/u);
});

test("甲方契約分類只有七類影響且任何一類都會成為變更提案", async () => {
  const {
    OWNER_CONTRACT_IMPACT_KEYS,
    classifyOwnerContractEntry,
  } = await loadRuntime();

  assert.deepEqual(OWNER_CONTRACT_IMPACT_KEYS, [
    "scope",
    "price",
    "time",
    "payment",
    "acceptance",
    "material",
    "warranty",
  ]);
  assert.equal(Object.isFrozen(OWNER_CONTRACT_IMPACT_KEYS), true);
  assert.equal(classifyOwnerContractEntry([]), "SUPPLEMENT");
  for (const key of OWNER_CONTRACT_IMPACT_KEYS) {
    assert.equal(classifyOwnerContractEntry([key]), "CHANGE_PROPOSAL");
  }
  assert.equal(classifyOwnerContractEntry(["unknown"]), "SUPPLEMENT");
});

test("甲方契約草稿初始為空且所有可變容器都不可變", async () => {
  const { createOwnerContractDraftState } = await loadRuntime();
  const draft = createOwnerContractDraftState();

  assert.deepEqual(draft, {
    title: "",
    detail: "",
    impactKeys: [],
    classification: "SUPPLEMENT",
    attachments: [],
    ownerConfirmationIntent: false,
    partyAgreement: false,
    formallyPersisted: false,
  });
  assert.equal(Object.isFrozen(draft), true);
  assert.equal(Object.isFrozen(draft.impactKeys), true);
  assert.equal(Object.isFrozen(draft.attachments), true);
});

test("甲方契約 reducer 只維護本次草稿且永不建立雙方合意或正式保存", async () => {
  const {
    createOwnerContractDraftState,
    reduceOwnerContractDraft,
  } = await loadRuntime();
  const initial = createOwnerContractDraftState();
  const withTitle = reduceOwnerContractDraft(initial, {
    type: "SET_TITLE",
    value: "調整廚房櫃體範圍",
  });
  const withDetail = reduceOwnerContractDraft(withTitle, {
    type: "SET_DETAIL",
    value: "請依目前圖面逐項確認。",
  });
  const withImpact = reduceOwnerContractDraft(withDetail, {
    type: "TOGGLE_IMPACT",
    key: "scope",
  });
  const withAttachment = reduceOwnerContractDraft(withImpact, {
    type: "ADD_ATTACHMENT_METADATA",
    name: "廚房圖面.pdf",
    note: "本次討論參考名稱",
  });
  const withIntent = reduceOwnerContractDraft(withAttachment, {
    type: "SET_OWNER_CONFIRMATION_INTENT",
    value: true,
    partyAgreement: true,
    formallyPersisted: true,
  });

  assert.equal(initial.title, "", "previous state remains unchanged");
  assert.equal(withIntent.title, "調整廚房櫃體範圍");
  assert.equal(withIntent.detail, "請依目前圖面逐項確認。");
  assert.deepEqual(withIntent.impactKeys, ["scope"]);
  assert.equal(withIntent.classification, "CHANGE_PROPOSAL");
  assert.deepEqual(withIntent.attachments, [{
    name: "廚房圖面.pdf",
    note: "本次討論參考名稱",
  }]);
  assert.equal(Object.isFrozen(withIntent.attachments[0]), true);
  assert.equal(withIntent.ownerConfirmationIntent, true);
  assert.equal(withIntent.partyAgreement, false);
  assert.equal(withIntent.formallyPersisted, false);

  const toggledOff = reduceOwnerContractDraft(withIntent, {
    type: "TOGGLE_IMPACT",
    key: "scope",
  });
  assert.deepEqual(toggledOff.impactKeys, []);
  assert.equal(toggledOff.classification, "SUPPLEMENT");

  const cleared = reduceOwnerContractDraft(withIntent, { type: "CLEAR" });
  assert.deepEqual(cleared, createOwnerContractDraftState());
});

test("甲方契約編輯權只由 AUTHORIZED_READY render path 切換", async () => {
  const runtime = await readPageFile("app.js");

  assert.match(
    runtime,
    /setEnabled\(model\.state === "AUTHORIZED_READY"\)/,
  );
  assert.doesNotMatch(
    runtime,
    /localStorage|sessionStorage|indexedDB|URLSearchParams|location\.search|document\.cookie/i,
  );
});

test("甲方契約 reviewer journey 不提供會假裝前往正式紀錄的入口", async () => {
  const html = await readPageFile("code.html");
  const panel = ownerContractPanel(html);

  assert.doesNotMatch(panel, /<a[^>]*>\s*查看契約治理紀錄/u);
  assert.match(panel, /尚未建立可查看的契約治理紀錄/u);
  assert.equal((panel.match(/owner-contract-recovery-action/g) || []).length, 1);
});

test("甲方契約 reviewer overflow guard 與草稿長度契約限制極端內容", async () => {
  const [html, css, runtime] = await Promise.all([
    readPageFile("code.html"),
    readPageFile("styles.css"),
    readPageFile("app.js"),
  ]);

  assert.match(
    css,
    /\.owner-contract-status dd,\s*\.owner-contract-preview dd,\s*\.owner-contract-version-line dd\s*\{[^}]*overflow-wrap:\s*anywhere/iu,
  );
  assert.match(html, /data-owner-contract-title[\s\S]{0,180}maxlength="120"|maxlength="120"[\s\S]{0,180}data-owner-contract-title/u);
  assert.match(html, /data-owner-contract-detail[\s\S]{0,180}maxlength="2000"|maxlength="2000"[\s\S]{0,180}data-owner-contract-detail/u);
  assert.match(runtime, /title:\s*ownerContractText\(source\.title,\s*120\)/u);
  assert.match(runtime, /detail:\s*ownerContractText\(source\.detail,\s*2000\)/u);
  assert.match(runtime, /name:\s*ownerContractText\(attachment\?\.name,\s*180\)/u);
  assert.match(runtime, /note:\s*ownerContractText\(attachment\?\.note,\s*300\)/u);
});

test("甲方契約管理以四個小白任務分頁分開服務資格、專案契約與本次草稿", async () => {
  const [html, css] = await Promise.all([
    readPageFile("code.html"),
    readPageFile("styles.css"),
  ]);
  const panelStart = html.indexOf('id="owner-dashboard-panel-contract"');
  const panel = html.slice(panelStart, html.indexOf("</section>", panelStart));

  assert.equal((panel.match(/data-owner-contract-view="(?:overview|facts|changes|records)"/g) || []).length, 4);
  for (const label of ["契約總覽", "待我填寫", "補充與變更", "版本與紀錄"]) {
    assert.match(panel, new RegExp(label));
  }
  assert.match(panel, /DRS 服務契約/u);
  assert.match(panel, /本案甲乙契約/u);
  assert.match(panel, /查看 DRS 服務契約全文/u);
  assert.doesNotMatch(panel, /開始編輯契約資料/u);
  assert.match(panel, /contractType=DESIGN_BUILD&amp;returnTo=owner/u);
  assert.match(panel, /目前顯示中性契約範本；尚未連結案件，也尚未分享給乙方/u);
  assert.match(css, /\.owner-contract-view-tabs\s*\{/u);
});

test("甲方契約總覽直接接上 DRS 服務契約全文並保留真實待確認狀態", async () => {
  const [html, css] = await Promise.all([
    readPageFile("code.html"),
    readPageFile("styles.css"),
  ]);
  const panel = ownerContractPanel(html);
  const cardStart = panel.indexOf("contract-kind-card--service");
  const cardEnd = panel.indexOf("</article>", cardStart);
  const serviceContractCard = panel.slice(cardStart, cardEnd);

  assert.ok(cardStart >= 0 && cardEnd > cardStart, "DRS service contract card exists");
  assert.match(serviceContractCard, /DRS 服務契約/u);
  assert.match(serviceContractCard, /data-slot="agreement-state">尚待確認/u);
  assert.match(serviceContractCard, /data-slot="agreement-version">尚未確認服務版本/u);
  assert.match(
    serviceContractCard,
    /data-owner-service-contract-link[^>]*>\s*查看 DRS 服務契約全文/u,
  );
  assert.equal((panel.match(/data-owner-service-contract-link/g) || []).length, 1);
  assert.match(css, /\.owner-service-contract-entry\s*\{[^}]*display:\s*inline-flex/isu);
});

test("契約預覽返回甲方工作台時直接開啟待我填寫而不是契約總覽", async () => {
  const runtime = await loadRuntime();

  assert.equal(
    runtime.resolveOwnerDashboardTabFromHash("#owner-contract-view-panel-facts"),
    "contract",
  );
  assert.equal(
    runtime.resolveOwnerContractViewFromHash("#owner-contract-view-panel-facts"),
    "facts",
  );
  assert.equal(
    runtime.resolveOwnerContractViewFromHash("#owner-contract-view-panel-changes"),
    "changes",
  );
  assert.equal(
    runtime.resolveOwnerContractViewFromHash("#owner-contract-view-panel-records"),
    "records",
  );
  assert.equal(runtime.resolveOwnerContractViewFromHash("#design-review"), null);
});

test("甲方本案契約資料草稿涵蓋雙方、專案、價金工期、付款驗收與保固", async () => {
  const html = await readPageFile("code.html");
  const requiredFields = [
    "ownerName",
    "vendorName",
    "projectName",
    "projectAddress",
    "designScope",
    "worksScope",
    "designAmount",
    "worksAmount",
    "startDate",
    "endDate",
    "paymentBasis",
    "acceptanceBasis",
    "warrantyBasis",
  ];
  for (const field of requiredFields) {
    assert.match(html, new RegExp(`data-owner-contract-fact="${field}"`));
  }
  assert.match(html, /目前只保留在這個頁面/u);
  assert.match(html, /重新整理後需重新輸入/u);
  assert.doesNotMatch(html, /已同步給乙方|已正式儲存|已建立正式版本/u);
});

test("甲方契約資料 reducer 只維護本頁草稿並計算完成進度", async () => {
  const {
    OWNER_CONTRACT_FACT_KEYS,
    createOwnerContractFactsDraftState,
    reduceOwnerContractFactsDraft,
    summarizeOwnerContractFactsDraft,
  } = await loadRuntime();

  assert.equal(OWNER_CONTRACT_FACT_KEYS.length, 13);
  const initial = createOwnerContractFactsDraftState();
  const withOwner = reduceOwnerContractFactsDraft(initial, {
    type: "SET_FIELD",
    field: "ownerName",
    value: "  林小姐  ",
  });
  const withProject = reduceOwnerContractFactsDraft(withOwner, {
    type: "SET_FIELD",
    field: "projectName",
    value: "自宅裝修",
  });
  const ignored = reduceOwnerContractFactsDraft(withProject, {
    type: "SET_FIELD",
    field: "unknown",
    value: "不得寫入",
  });

  assert.equal(initial.ownerName, "");
  assert.equal(withOwner.ownerName, "林小姐");
  assert.equal(Object.hasOwn(ignored, "unknown"), false);
  assert.deepEqual(summarizeOwnerContractFactsDraft(withProject), {
    completed: 2,
    total: 13,
    nextField: "vendorName",
    formallyPersisted: false,
    sharedWithVendor: false,
  });
  assert.equal(Object.isFrozen(withProject), true);
});

test("甲方工作台可由契約預覽返回連結直接開啟契約管理", async () => {
  const { resolveOwnerDashboardTabFromHash } = await loadRuntime();
  assert.equal(resolveOwnerDashboardTabFromHash("#owner-dashboard-panel-contract"), "contract");
  assert.equal(resolveOwnerDashboardTabFromHash("#governance"), "construction");
  assert.equal(resolveOwnerDashboardTabFromHash("#construction-records"), "construction");
  assert.equal(resolveOwnerDashboardTabFromHash("#design-review"), "design");
  assert.equal(resolveOwnerDashboardTabFromHash("#unknown"), null);
});

test("legacy governance direct entry and history keep construction collection and governance visible", async () => {
  const {
    collectOwnerWorkbenchIntoConstruction,
    initializeOwnerDashboardTabs,
    initializeOwnerSectionNavigation,
  } = await loadRuntime();
  const dashboard = createInteractiveTabHarness({
    kind: "dashboard",
    initialHash: "#governance",
  });
  const section = createOwnerSectionNavigationHarness("#governance");
  const navigation = {
    querySelectorAll(selector) {
      return selector === "[data-owner-section-tab]" ? section.tabs : [];
    },
  };
  const stage = {};
  const collectionNavHost = {
    child: null,
    append(node) {
      this.child = node;
    },
  };
  const collectedContentHost = {
    child: null,
    dataset: {},
    hidden: true,
    append(node) {
      this.child = node;
    },
  };
  const construction = {
    dataset: {},
    querySelector(selector) {
      if (selector === "[data-owner-collection-nav-host]") return collectionNavHost;
      if (selector === "[data-owner-collected-workbench-host]") {
        return collectedContentHost;
      }
      return null;
    },
  };
  section.workbench.querySelector = (selector) => {
    if (selector === '[data-layout="owner-section-nav"]') return navigation;
    if (selector === ".owner-workbench-stage") return stage;
    return null;
  };
  const root = {
    ...dashboard.root,
    querySelector(selector) {
      if (selector === '[data-layout="owner-hero-dashboard"]') {
        return dashboard.container;
      }
      if (selector === '[data-layout="owner-tabbed-workbench"]') {
        return section.workbench;
      }
      if (selector === '[data-owner-management-layout="construction"]') {
        return construction;
      }
      if (selector === "[data-owner-collected-workbench-host]") {
        return collectedContentHost;
      }
      return null;
    },
  };

  initializeOwnerDashboardTabs(root, dashboard.view);
  initializeOwnerSectionNavigation(root, dashboard.view);
  collectOwnerWorkbenchIntoConstruction(root, dashboard.view);

  function assertGovernanceState() {
    assert.equal(dashboard.container.dataset.activeOwnerTab, "construction");
    assert.equal(dashboard.panels[1].hidden, false, "construction panel is visible");
    assert.equal(dashboard.panels[2].hidden, true, "contract panel is hidden");
    assert.equal(construction.dataset.ownerConstructionMode, "collection");
    assert.equal(collectedContentHost.hidden, false, "collection is visible");
    assert.equal(section.workbench.dataset.activeOwnerSection, "governance");
    assert.equal(
      section.panels.find((panel) =>
        panel.dataset.ownerSectionPanel === "governance"
      )?.hidden,
      false,
      "governance section is visible",
    );
  }

  assertGovernanceState();
  dashboard.view.location.hash = "#owner-dashboard-panel-contract";
  dashboard.view.dispatch("hashchange");
  assert.equal(dashboard.container.dataset.activeOwnerTab, "contract");
  dashboard.view.location.hash = "#governance";
  dashboard.view.dispatch("hashchange");
  assertGovernanceState();
});

test("未連結正式案件時說清楚原因、處理者、最近留痕與可恢復下一步", async () => {
  const [html, runtime] = await Promise.all([
    readPageFile("code.html"),
    loadRuntime(),
  ]);
  const model = runtime.buildOwnerWorkspaceViewModel();

  assert.equal(model.state, "CONTRACT_CONTEXT_UNAVAILABLE");
  assert.equal(model.stateLabel, "尚未連結正式案件");
  assert.match(model.statusMessage, /甲方身分、DRS 服務契約與案件權限尚未完成確認/u);
  assert.equal(model.currentActor, "由甲方先確認 DRS 服務與案件入口");
  assert.equal(model.lastRecorded, "尚未建立正式案件紀錄");
  assert.equal(model.nextAction, "查看 DRS 服務契約全文");
  assert.match(html, /完成後才會開放本案契約、文件分享與案件留痕/u);
  assert.match(html, /data-owner-service-contract-link[^>]*>\s*查看 DRS 服務契約全文/u);
  assert.doesNotMatch(model.statusMessage, /已保存/u);
});

test("主分頁是分類而非 01 到 03 流程，且三個假紀錄入口不再可點", async () => {
  const html = await readPageFile("code.html");
  const dashboardStart = html.indexOf('data-layout="owner-section-tabs"');
  const dashboardEnd = html.indexOf("</div>", dashboardStart);
  const mainTabs = html.slice(dashboardStart, dashboardEnd);

  assert.doesNotMatch(mainTabs, />\s*0[123]\s*</u);
  for (const label of ["查看設計案紀錄", "查看工程案紀錄", "查看契約治理紀錄"]) {
    assert.doesNotMatch(html, new RegExp(`<a[^>]*>[^<]*${label}`, "u"));
  }
  assert.match(
    html,
    /href="\.\.\/\.\.\/\.\.\/site\/standard_contract_editor\/code\.html\?contractType=DESIGN_BUILD&amp;returnTo=owner"/u,
  );
});

test("七種 workspace state 都有 truthful 待填狀態，只有 trusted case 顯示完整表單與進度", async () => {
  const [html, css] = await Promise.all([
    readPageFile("code.html"),
    readPageFile("styles.css"),
  ]);
  const panel = ownerContractPanel(html);

  assert.match(panel, /data-owner-contract-unavailable-preparation/u);
  assert.match(panel, /data-slot="access-message"/u);
  assert.match(panel, /正式案件可編輯後，才會開放 13 項資料/u);
  assert.match(panel, /查看之後需要準備的資料/u);
  assert.match(panel, /雙方與專案[\s\S]*甲方可先準備/u);
  assert.match(panel, /工作範圍、價金與工期[\s\S]*依雙方文件核對/u);
  assert.match(panel, /付款、驗收與保固[\s\S]*不知道時保留待確認，不要自行猜測/u);
  assert.match(panel, /data-owner-contract-trusted-facts/u);
  assert.equal((panel.match(/data-owner-contract-fact=/g) || []).length, 13);
  assert.match(
    css,
    /\[data-owner-contract-trusted-facts\]\s*\{\s*display:\s*none/u,
  );
  assert.match(
    css,
    /body\[data-workspace-state="AUTHORIZED_READY"\][\s\S]{0,220}\[data-owner-contract-trusted-facts\][\s\S]{0,80}display:\s*block/u,
  );
  for (const state of [
    "ACCESS_CHECKING",
    "ACCESS_DENIED",
    "CONTRACT_CONTEXT_UNAVAILABLE",
    "AUTHORIZED_EMPTY",
    "LOAD_FAILED_RETRYABLE",
  ]) {
    assert.match(
      css,
      new RegExp(`body\\[data-workspace-state="${state}"\\][\\s\\S]{0,120}\\[data-owner-contract-unavailable-preparation\\]`, "u"),
    );
  }
  for (const state of ["AUTHORIZED_READY", "PCM_SERVICE_ENDED_READ_ONLY"]) {
    assert.match(
      css,
      new RegExp(`body\\[data-workspace-state="${state}"\\][\\s\\S]{0,180}\\[data-owner-contract-unavailable-preparation\\][\\s\\S]{0,80}display:\\s*none`, "u"),
    );
    assert.match(
      css,
      new RegExp(`body\\[data-workspace-state="${state}"\\][\\s\\S]{0,220}\\[data-owner-contract-trusted-facts\\][\\s\\S]{0,80}display:\\s*block`, "u"),
    );
  }
  assert.match(css, /\[data-owner-contract-facts-progress\]\s*\{\s*display:\s*none/u);
  assert.match(
    css,
    /body\[data-workspace-state="AUTHORIZED_READY"\][\s\S]{0,220}\[data-owner-contract-facts-progress\][\s\S]{0,80}display:\s*inline/u,
  );
});

test("mobile 在主分頁前保留精簡責任摘要，核心文案與觸控目標維持可讀", async () => {
  const [html, css] = await Promise.all([
    readPageFile("code.html"),
    readPageFile("styles.css"),
  ]);
  const responsibility = html.indexOf('data-layout="owner-responsibility-panel"');
  const tabs = html.indexOf('data-layout="owner-section-tabs"');

  assert.ok(responsibility >= 0 && responsibility < tabs);
  assert.match(html, /data-layout="owner-responsibility-mobile-summary"/u);
  for (const label of [
    "目前狀態",
    "現在由誰處理",
    "下一步",
    "尚未開放原因",
    "完成後",
    "最近留痕",
  ]) {
    assert.match(html, new RegExp(label, "u"));
  }
  const hiddenResponsibilityRule = css.indexOf(
    '[data-layout="owner-command-header"] [data-layout="owner-responsibility-panel"] {\n    display: none;',
  );
  const visibleResponsibilityRule = css.lastIndexOf(
    '[data-layout="owner-command-header"] [data-layout="owner-responsibility-panel"] {\n    display: grid;',
  );
  assert.ok(hiddenResponsibilityRule >= 0);
  assert.ok(
    visibleResponsibilityRule > hiddenResponsibilityRule,
    "mobile responsibility summary is restored by the final cascade",
  );
  assert.match(
    css,
    /@media\s*\(max-width:\s*760px\)[\s\S]*?\.owner-dashboard-tab[\s\S]{0,180}min-height:\s*(?:44|[5-9]\d)px/u,
  );
  assert.match(css, /overflow-x:\s*(?:clip|hidden)/u);
  assert.match(
    css,
    /@media\s*\(max-width:\s*760px\)[\s\S]*?\[data-layout="owner-responsibility-mobile-summary"\][\s\S]{0,100}display:\s*block/u,
  );
  assert.match(
    css,
    /@media\s*\(max-width:\s*760px\)[\s\S]*?\[data-layout="owner-responsibility-panel"\]\s+\.handoff-panel__facts[\s\S]{0,80}display:\s*none/u,
  );
});

test("desktop 與 mobile 的核心狀態、分類、說明及行動文字都至少 14px", async () => {
  const css = await readPageFile("styles.css");
  const start = css.indexOf("/* Core owner-workspace text is never auxiliary-sized. */");
  const end = css.indexOf("/* End core owner-workspace typography. */", start);
  const rule = start >= 0 && end > start ? css.slice(start, end) : "";

  for (const selector of [
    '[data-layout="owner-responsibility-panel"] dd',
    ".workspace-intro__meta",
    ".state-pill",
    ".owner-dashboard-tab strong",
    ".owner-dashboard-tab small",
    ".owner-contract-command > div > p:last-child",
    ".owner-contract-primary-action",
    ".owner-contract-view-tabs button",
    ".shared-contract-card__action",
    ".owner-hero-dashboard__next strong",
    ".owner-dashboard-static-note",
    ".owner-contract-status dd",
    ".owner-contract-facts-form input",
    ".owner-contract-detail-body button",
  ]) {
    assert.match(rule, new RegExp(selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "u"));
  }
  assert.match(rule, /font-size:\s*\.875rem/u);
});

test("契約主標題不會暗示本案契約早於 DRS 服務與案件確認", async () => {
  const html = await readPageFile("code.html");
  assert.match(html, /先確認目前可進行的步驟，再整理本案契約。/u);
  assert.doesNotMatch(html, /先完成本案契約，再處理補充或變更。/u);
});

test("主分頁 click、鍵盤與 hashchange 同步 canonical hash 且不在一般切換強制捲動", async () => {
  const { initializeOwnerDashboardTabs } = await loadRuntime();
  const harness = createInteractiveTabHarness({
    kind: "dashboard",
    initialHash: "#owner-dashboard-panel-contract",
    readyState: "loading",
  });
  const controller = initializeOwnerDashboardTabs(harness.root, harness.view);

  assert.equal(harness.container.dataset.activeOwnerTab, "contract");
  assert.equal(harness.tabs[2].getAttribute("aria-selected"), "true");
  const directEntryScrollCount = harness.scrollCalls.length;
  assert.equal(directEntryScrollCount, 1, "contract direct entry stabilizes once");
  assert.deepEqual(harness.scrollCalls[0], {
    top: 0,
    left: 0,
    behavior: "auto",
  });
  harness.view.dispatch("load");
  assert.equal(harness.frameCallbacks.length, 1);
  assert.equal(harness.scrollCalls.length, 1);
  harness.view.flushAnimationFrame();
  assert.equal(harness.frameCallbacks.length, 1);
  assert.equal(harness.scrollCalls.length, 1);
  harness.view.flushAnimationFrame();
  assert.equal(harness.frameCallbacks.length, 0);
  assert.equal(harness.scrollCalls.length, 2);
  assert.deepEqual(harness.scrollCalls, [
    { top: 0, left: 0, behavior: "auto" },
    { top: 0, left: 0, behavior: "auto" },
  ]);
  assert.equal(harness.listeners.get("pointerdown")?.length, 0);
  assert.equal(harness.listeners.get("hashchange")?.length, 1);

  harness.tabs[0].dispatch("click");
  assert.equal(harness.view.location.hash, "#design-review");
  assert.equal(harness.container.dataset.activeOwnerTab, "design");
  harness.tabs[0].dispatch("keydown", { key: "End" });
  assert.equal(harness.view.location.hash, "#owner-dashboard-panel-contract");
  assert.equal(harness.tabs[2].focused, true);
  harness.tabs[2].dispatch("keydown", { key: "ArrowLeft" });
  assert.equal(harness.view.location.hash, "#construction-records");
  assert.equal(harness.tabs[1].tabIndex, 0);
  assert.equal(harness.panels[1].hidden, false);
  assert.equal(harness.scrollCalls.length, 2);

  harness.view.location.hash = "#design-review";
  harness.view.dispatch("hashchange");
  assert.equal(harness.container.dataset.activeOwnerTab, "design");
  assert.equal(harness.replacements.at(-1), "#construction-records");
  assert.equal(controller.selectTab("unknown"), false);
});

test("contract direct-entry 的延遲 settle 會在任何互動或 route 變更後取消", async () => {
  const { initializeOwnerDashboardTabs } = await loadRuntime();
  for (const type of [
    "pointerdown",
    "keydown",
    "wheel",
    "touchstart",
    "hashchange",
  ]) {
    const harness = createInteractiveTabHarness({
      kind: "dashboard",
      initialHash: "#owner-dashboard-panel-contract",
      readyState: "loading",
    });
    initializeOwnerDashboardTabs(harness.root, harness.view);
    assert.equal(harness.scrollCalls.length, 1, type);
    if (type === "hashchange") harness.view.location.hash = "#design-review";
    harness.view.dispatch(type);
    harness.view.dispatch("load");
    const executionCountAtCancellation = harness.frameExecutionCount;
    harness.view.flushAnimationFrames();
    assert.equal(harness.scrollCalls.length, 1, type);
    assert.equal(harness.frameCallbacks.length, 0, type);
    assert.equal(
      harness.frameExecutionCount,
      executionCountAtCancellation,
      type,
    );
    assert.equal(harness.listeners.get("pointerdown")?.length, 0, type);
  }

  for (const type of [
    "pointerdown",
    "keydown",
    "wheel",
    "touchstart",
    "hashchange",
  ]) {
    const afterFirstFrame = createInteractiveTabHarness({
      kind: "dashboard",
      initialHash: "#owner-dashboard-panel-contract",
      readyState: "complete",
    });
    initializeOwnerDashboardTabs(afterFirstFrame.root, afterFirstFrame.view);
    assert.equal(afterFirstFrame.frameCallbacks.length, 1, type);
    afterFirstFrame.view.flushAnimationFrame();
    assert.equal(afterFirstFrame.frameCallbacks.length, 1, type);
    if (type === "hashchange") {
      afterFirstFrame.view.location.hash = "#design-review";
    }
    afterFirstFrame.view.dispatch(type);
    const executionCountAtCancellation = afterFirstFrame.frameExecutionCount;
    assert.equal(afterFirstFrame.frameCallbacks.length, 0, type);
    afterFirstFrame.view.flushAnimationFrames();
    assert.equal(afterFirstFrame.frameExecutionCount, executionCountAtCancellation, type);
    assert.equal(afterFirstFrame.scrollCalls.length, 1, type);
    assert.equal(afterFirstFrame.listeners.get("pointerdown")?.length, 0, type);
  }
});

test("非契約 hash 不做 direct-entry top reset，也不留下延遲 scroll callback", async () => {
  const { initializeOwnerDashboardTabs } = await loadRuntime();
  for (const hash of [
    "#design-review",
    "#construction-records",
    "#governance",
    "#unknown",
  ]) {
    const harness = createInteractiveTabHarness({ kind: "dashboard", initialHash: hash });
    initializeOwnerDashboardTabs(harness.root, harness.view);
    assert.equal(harness.scrollCalls.length, 0, hash);
    assert.equal(harness.frameCallbacks.length, 0, hash);
    harness.view.flushAnimationFrames();
    harness.view.dispatch("load");
    assert.equal(harness.scrollCalls.length, 0, hash);
  }
});

test("records → construction → contract 跨層 journey 回到 overview 且兩個 hashchange listener 並存", async () => {
  const {
    initializeOwnerContractViewTabs,
    initializeOwnerDashboardTabs,
  } = await loadRuntime();
  const main = createInteractiveTabHarness({
    kind: "dashboard",
    initialHash: "#owner-contract-view-panel-records",
  });
  const contract = createInteractiveTabHarness({
    kind: "contract",
    initialHash: "#owner-contract-view-panel-records",
  });
  const contractController = initializeOwnerContractViewTabs(contract.container, main.view);
  initializeOwnerDashboardTabs(main.root, main.view, {
    onContractMainSelected() {
      contractController.selectView("overview", { syncHash: false });
    },
  });

  assert.equal(
    main.listeners.get("hashchange")?.length,
    3,
    "contract subview, direct-entry cancellation, and main tab listeners coexist",
  );
  assert.equal(contract.container.dataset.activeOwnerContractView, "records");
  const initialScrollCount = main.scrollCalls.length;

  main.tabs[1].dispatch("click");
  assert.equal(main.view.location.hash, "#construction-records");
  assert.equal(contract.container.dataset.activeOwnerContractView, "records");
  main.view.flushAnimationFrames();
  assert.equal(main.scrollCalls.length, initialScrollCount);
  assert.equal(main.listeners.get("hashchange")?.length, 2);
  main.tabs[2].dispatch("click");
  assert.equal(main.view.location.hash, "#owner-dashboard-panel-contract");
  assert.equal(main.container.dataset.activeOwnerTab, "contract");
  assert.equal(contract.container.dataset.activeOwnerContractView, "overview");
  assert.equal(contract.tabs[0].getAttribute("aria-selected"), "true");
  assert.equal(contract.panels[0].hidden, false);
  assert.equal(contract.tabs.some((tab) => tab.focused), false);

  contractController.selectView("records");
  main.tabs[1].dispatch("click");
  main.tabs[1].dispatch("keydown", { key: "ArrowRight" });
  assert.equal(main.view.location.hash, "#owner-dashboard-panel-contract");
  assert.equal(contract.container.dataset.activeOwnerContractView, "overview");
  assert.equal(contract.tabs.some((tab) => tab.focused), false);
  assert.equal(main.scrollCalls.length, initialScrollCount);

  main.view.location.hash = "#owner-contract-view-panel-changes";
  main.view.dispatch("hashchange");
  assert.equal(main.container.dataset.activeOwnerTab, "contract");
  assert.equal(contract.container.dataset.activeOwnerContractView, "changes");
});

test("契約子分頁 click、Arrow、Home、End 與 hashchange 維持 ARIA 及 canonical hash", async () => {
  const { initializeOwnerContractViewTabs } = await loadRuntime();
  const harness = createInteractiveTabHarness({
    kind: "contract",
    initialHash: "#owner-contract-view-panel-facts",
  });
  const controller = initializeOwnerContractViewTabs(harness.container, harness.view);

  assert.equal(harness.container.dataset.activeOwnerContractView, "facts");
  assert.equal(harness.tabs[1].getAttribute("aria-selected"), "true");
  harness.tabs[1].dispatch("click");
  assert.equal(harness.view.location.hash, "#owner-contract-view-panel-facts");
  harness.tabs[1].dispatch("keydown", { key: "End" });
  assert.equal(harness.view.location.hash, "#owner-contract-view-panel-records");
  assert.equal(harness.tabs[3].focused, true);
  harness.tabs[3].dispatch("keydown", { key: "Home" });
  assert.equal(harness.view.location.hash, "#owner-contract-view-panel-overview");
  harness.tabs[0].dispatch("keydown", { key: "ArrowRight" });
  assert.equal(harness.view.location.hash, "#owner-contract-view-panel-facts");
  assert.equal(harness.panels[1].hidden, false);
  assert.equal(harness.scrollCalls.length, 0);

  harness.view.location.hash = "#owner-contract-view-panel-changes";
  harness.view.dispatch("hashchange");
  assert.equal(harness.container.dataset.activeOwnerContractView, "changes");
  assert.equal(harness.tabs[2].tabIndex, 0);
  assert.equal(controller.selectView("unknown"), false);
});

test("only the exact authorized owner grant can initialize the strict existing bootstrap", async () => {
  const { validateAndMapOwnerWorkspaceGrant } = await loadBootstrap();
  const grant = {
    schemaVersion: "laibe.owner-workspace-runtime.v1",
    state: "AUTHORIZED_OWNER_WORKSPACE",
    authenticatedUserId: "11111111-1111-4111-8111-111111111111",
    currentCaseId: "22222222-2222-4222-8222-222222222222",
    membership: {
      userId: "11111111-1111-4111-8111-111111111111",
      caseId: "22222222-2222-4222-8222-222222222222",
      role: "owner",
      status: "active",
    },
    workspaceAccess: {
      role: "owner",
      mutationAllowed: false,
      writeActionsEnabled: false,
      payloadPolicy: "AUTHORIZED_SCOPE_ONLY",
    },
    case: {
      caseId: "22222222-2222-4222-8222-222222222222",
      title: "住宅修改工程",
      status: "active",
    },
    serviceContext: { pcmStatus: "UNAVAILABLE", contractStatus: "UNAVAILABLE" },
    documents: [],
  };

  assert.equal(validateAndMapOwnerWorkspaceGrant(grant).state, "AUTHORIZED_READY");
  for (const mutate of [
    (value) => { value.membership.role = "pro"; },
    (value) => { value.case.caseId = "99999999-9999-4999-8999-999999999999"; },
    (value) => { value.extra = true; },
  ]) {
    const malformed = structuredClone(grant);
    mutate(malformed);
    assert.equal(validateAndMapOwnerWorkspaceGrant(malformed), null);
  }
});

test("Calendar stays in the main owner workspace with no initial iframe source, controlled sharing, and protected grant routes", async () => {
  const [html, bootstrap] = await Promise.all([
    readPageFile("code.html"),
    readPageFile("owner-workspace-bootstrap.js"),
  ]);
  const workspaceStart = html.indexOf('data-layout="owner-hero-workspace"');
  const calendarStart = html.indexOf("data-owner-google-calendar", workspaceStart);
  const calendarEnd = html.indexOf(
    'class="owner-management-shell owner-management-shell--design"',
    calendarStart,
  );
  assert.ok(calendarStart > workspaceStart, "Calendar belongs to the main workspace");
  assert.ok(calendarEnd > calendarStart, "Calendar ends before Design operations");
  assert.equal(
    html.match(/data-owner-google-calendar(?=[\s=>])/gu)?.length,
    1,
    "only the Design management Calendar is controlled",
  );
  assert.equal(html.match(/id="owner-google-calendar-title"/gu)?.length, 1);
  const controlledMarkup = html.slice(calendarStart, calendarEnd);
  assert.match(controlledMarkup, /<iframe[^>]*data-owner-calendar-frame[^>]*(?!\bsrc=)[^>]*>/u);
  assert.match(controlledMarkup, /data-owner-calendar-state[^>]*>\s*尚未連結 Google Calendar/u);
  assert.match(controlledMarkup, /data-owner-calendar-connect[^>]*disabled[^>]*aria-disabled="true"/u);
  assert.match(controlledMarkup, /data-owner-calendar-share="vendor"[^>]*disabled[^>]*aria-disabled="true"/u);
  assert.match(controlledMarkup, /data-owner-calendar-share="drs"[^>]*disabled[^>]*aria-disabled="true"/u);
  assert.match(bootstrap, /removeAttribute\(["']src["']\)/u);
  assert.match(bootstrap, /owner-google-calendar-grant/u);
  assert.match(bootstrap, /owner-google-calendar-oauth-start/u);
  assert.match(bootstrap, /http:\/\/127\.0\.0\.1:4173\/account\/access\//u);
  assert.doesNotMatch(bootstrap, /127\.0\.0\.1:4194|[?&](?:case|returnTo|next)=/u);
});

test("每份案件文件都提供受權限保護的 LINE 分享連結", async () => {
  const [html, runtime] = await Promise.all([
    readPageFile("code.html"),
    loadRuntime(),
  ]);
  assert.equal(typeof runtime.createOwnerDocumentLineShareUrl, "function");
  assert.match(html, /data-owner-document-share-guide/u);
  assert.match(html, /接收者仍須登入並具有本案權限/u);

  const shareUrl = runtime.createOwnerDocumentLineShareUrl({
    title: "平面配置圖",
    versionLabel: "第 3 版・甲方確認版",
  });
  const parsed = new URL(shareUrl);
  assert.equal(parsed.origin, "https://social-plugins.line.me");
  assert.equal(parsed.pathname, "/lineit/share");
  assert.equal(
    parsed.searchParams.get("url"),
    "http://127.0.0.1:4173/pcm/owner/workspace/#documents",
  );
  assert.match(parsed.searchParams.get("text"), /平面配置圖/u);
  assert.match(parsed.searchParams.get("text"), /第 3 版・甲方確認版/u);
  assert.match(parsed.searchParams.get("text"), /登入並具有本案權限/u);
  assert.equal(runtime.createOwnerDocumentLineShareUrl({ title: "" }), null);

  const harness = createOwnerWorkspaceRenderHarness();
  const controller = runtime.createOwnerWorkspaceController({
    root: harness.root,
    adapter: {
      loadOwnerWorkspace: async () => authorizedContext({
        documents: [
          {
            title: "平面配置圖",
            kindLabel: "圖面",
            versionLabel: "第 3 版・甲方確認版",
            statusLabel: "已記錄",
          },
          {
            title: "工程報價單",
            kindLabel: "報價文件",
            versionLabel: "第 2 版・待確認",
            statusLabel: "已記錄",
          },
        ],
      }),
    },
  });
  await controller.initialize();
  const documentNodes = renderedNodes(harness.lists.get("documents"));
  const shareActions = documentNodes.filter(
    (node) => node.getAttribute?.("data-owner-document-line-share") === "true",
  );
  assert.equal(shareActions.length, 2);
  for (const action of shareActions) {
    assert.equal(action.tagName, "a");
    assert.equal(action.textContent, "分享至 LINE");
    assert.equal(action.getAttribute("target"), "_blank");
    assert.equal(action.getAttribute("rel"), "noopener noreferrer");
    assert.match(action.getAttribute("href"), /^https:\/\/social-plugins\.line\.me\/lineit\/share\?/u);
  }
});

test("owner Supabase workspace bootstrap gates session, owner grant shape, strict snapshot, and Calendar failure cleanup", async () => {
  const runtime = await loadBootstrap();
  assert.equal(typeof runtime.createOwnerSupabaseWorkspaceBootstrap, "function");

  const ownerGrant = {
    schemaVersion: "laibe.owner-workspace-runtime.v1",
    state: "AUTHORIZED_OWNER_WORKSPACE",
    authenticatedUserId: OWNER_USER_ID,
    currentCaseId: CANONICAL_OWNER_CASE_ID,
    membership: {
      userId: OWNER_USER_ID,
      caseId: CANONICAL_OWNER_CASE_ID,
      role: "owner",
      status: "active",
    },
    workspaceAccess: {
      role: "owner",
      mutationAllowed: false,
      writeActionsEnabled: false,
      payloadPolicy: "AUTHORIZED_SCOPE_ONLY",
    },
    case: {
      caseId: CANONICAL_OWNER_CASE_ID,
      title: "Owner case",
      status: "active",
    },
    serviceContext: { pcmStatus: "UNAVAILABLE", contractStatus: "UNAVAILABLE" },
    documents: [],
  };
  const frame = {
    src: "https://calendar.google.test/embed",
    removeAttribute(name) {
      if (name === "src") delete this.src;
    },
  };
  const root = {
    querySelector(selector) {
      return selector === "[data-owner-calendar-frame]" ? frame : null;
    },
    querySelectorAll() {
      return [];
    },
  };
  const calls = [];
  const authRuntime = {
    async getSession() {
      return { access_token: "owner-session" };
    },
    async authenticatedFetch(endpoint, init = {}) {
      calls.push({ endpoint, init });
      if (endpoint === "owner-workspace-grant") {
        return new Response(JSON.stringify(ownerGrant), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ state: "GRANT_UNAVAILABLE" }), { status: 503 });
    },
  };
  const bootstrap = runtime.createOwnerSupabaseWorkspaceBootstrap({
    root,
    authRuntime,
    authorizedCaseId: CANONICAL_OWNER_CASE_ID,
  });

  assert.equal(
    (await runtime.createOwnerSupabaseWorkspaceBootstrap({
      root: null,
      authRuntime: { async getSession() { return null; }, async authenticatedFetch() { throw new Error("must not call"); } },
      authorizedCaseId: CANONICAL_OWNER_CASE_ID,
    }).initialize()).state,
    "ACCESS_DENIED",
  );
  assert.equal(
    (await runtime.createOwnerSupabaseWorkspaceBootstrap({
      root: null,
      authRuntime: {
        async getSession() { return { access_token: "wrong-role" }; },
        async authenticatedFetch() {
          return new Response(JSON.stringify({ ...ownerGrant, membership: { ...ownerGrant.membership, role: "pro" } }), { status: 200 });
        },
      },
      authorizedCaseId: CANONICAL_OWNER_CASE_ID,
    }).initialize()).state,
    "ACCESS_DENIED",
  );
  assert.equal(
    (await runtime.createOwnerSupabaseWorkspaceBootstrap({
      root: null,
      authRuntime: {
        async getSession() { return { access_token: "malformed" }; },
        async authenticatedFetch() { return new Response(JSON.stringify({ state: "AUTHORIZED_OWNER_WORKSPACE" }), { status: 200 }); },
      },
      authorizedCaseId: CANONICAL_OWNER_CASE_ID,
    }).initialize()).state,
    "ACCESS_DENIED",
  );

  await bootstrap.initialize();
  assert.equal(calls[0].endpoint, "owner-workspace-grant");
  assert.equal(calls[0].init.method, "GET");
  assert.equal(frame.src, undefined, "Calendar grant failure clears iframe src");
});

function ownerGrantPayload({
  userId = OWNER_USER_ID,
  caseId = CANONICAL_OWNER_CASE_ID,
  title = "Owner case",
} = {}) {
  return {
    schemaVersion: "laibe.owner-workspace-runtime.v1",
    state: "AUTHORIZED_OWNER_WORKSPACE",
    authenticatedUserId: userId,
    currentCaseId: caseId,
    membership: { userId, caseId, role: "owner", status: "active" },
    workspaceAccess: {
      role: "owner",
      mutationAllowed: false,
      writeActionsEnabled: false,
      payloadPolicy: "AUTHORIZED_SCOPE_ONLY",
    },
    case: { caseId, title, status: "active" },
    serviceContext: { pcmStatus: "UNAVAILABLE", contractStatus: "UNAVAILABLE" },
    documents: [],
  };
}

function ownerCalendarGrant({
  userId = OWNER_USER_ID,
  caseId = CANONICAL_OWNER_CASE_ID,
  calendarId = "owner-calendar@example.test",
} = {}) {
  return {
    schemaVersion: "laibe.owner-calendar-embed.v1",
    authenticatedUserId: userId,
    currentCaseId: caseId,
    membership: { userId, caseId, role: "owner", status: "active" },
    calendarBinding: {
      userId,
      caseId,
      accountRole: "owner",
      connectionStatus: "connected",
      bindingStatus: "active",
      calendarId,
      timeZone: "Asia/Taipei",
    },
  };
}

function ownerCalendarHarness() {
  const listeners = new Map();
  const assigned = [];
  const state = { textContent: "" };
  const note = { textContent: "" };
  const frame = {
    hidden: true,
    removeAttribute(name) {
      if (name === "src") delete this.src;
    },
  };
  const connect = {
    disabled: true,
    textContent: "",
    attributes: new Map(),
    addEventListener(type, listener) {
      listeners.set(type, listener);
    },
    setAttribute(name, value) {
      this.attributes.set(name, String(value));
    },
    async click() {
      return listeners.get("click")?.();
    },
  };
  const root = {
    defaultView: { location: { assign(url) { assigned.push(url); } } },
    querySelector(selector) {
      return new Map([
        ["[data-owner-calendar-state]", state],
        ["[data-owner-calendar-note]", note],
        ["[data-owner-calendar-frame]", frame],
        ["[data-owner-calendar-connect]", connect],
      ]).get(selector) ?? null;
    },
    querySelectorAll() {
      return [];
    },
  };
  return { assigned, connect, frame, root, state };
}

function deferred() {
  let resolve;
  const promise = new Promise((nextResolve) => {
    resolve = nextResolve;
  });
  return { promise, resolve };
}

test("owner Calendar accepts only matching grants and an exact Google OAuth authority", async () => {
  const runtime = await loadBootstrap();
  const harness = ownerCalendarHarness();
  let calendarResponse = ownerCalendarGrant();
  let oauthResponse = {
    state: "OAUTH_REDIRECT_REQUIRED",
    authorizationUrl: "https://user@accounts.google.com/o/oauth2/v2/auth?state=owner",
  };
  const authRuntime = {
    async getSession() { return { access_token: "owner-session" }; },
    async authenticatedFetch(endpoint) {
      if (endpoint === "owner-workspace-grant") {
        return new Response(JSON.stringify(ownerGrantPayload()), { status: 200 });
      }
      if (endpoint === "owner-google-calendar-grant") {
        return new Response(JSON.stringify(calendarResponse), { status: 200 });
      }
      return new Response(JSON.stringify(oauthResponse), { status: 200 });
    },
  };
  const bootstrap = runtime.createOwnerSupabaseWorkspaceBootstrap({
    root: harness.root,
    authRuntime,
  });

  await bootstrap.initialize();
  assert.match(harness.frame.src, /calendar\.google\.com\/calendar\/embed/u);
  await harness.connect.click();
  assert.deepEqual(harness.assigned, [], "credentialed OAuth URLs are rejected");

  calendarResponse = ownerCalendarGrant({
    caseId: "9e000000-0000-4000-8000-000000000299",
  });
  await bootstrap.initialize();
  assert.equal(harness.frame.src, undefined, "case mismatch clears Calendar bytes");
  assert.equal(harness.connect.disabled, false, "only an authorized owner may retry connection");

  calendarResponse = ownerCalendarGrant({
    userId: "9e000000-0000-4000-8000-000000000099",
  });
  await bootstrap.initialize();
  assert.equal(harness.frame.src, undefined, "user mismatch clears Calendar bytes");

  calendarResponse = ownerCalendarGrant();
  oauthResponse = {
    state: "OAUTH_REDIRECT_REQUIRED",
    authorizationUrl: "https://accounts.google.com/o/oauth2/v2/auth?state=owner",
  };
  await bootstrap.initialize();
  await harness.connect.click();
  assert.deepEqual(harness.assigned, [oauthResponse.authorizationUrl]);

  const signedOut = ownerCalendarHarness();
  await runtime.createOwnerSupabaseWorkspaceBootstrap({
    root: signedOut.root,
    authRuntime: {
      async getSession() { return null; },
      async authenticatedFetch() { throw new Error("must not fetch"); },
    },
  }).initialize();
  assert.deepEqual(signedOut.assigned, [
    "http://127.0.0.1:4173/account/access/",
  ]);
});

test("concurrent owner initialization and Calendar responses cannot overwrite the latest authorized scope", async () => {
  const runtime = await loadBootstrap();
  const harness = ownerCalendarHarness();
  const oldOwner = deferred();
  const oldCalendar = deferred();
  const oldCalendarRequested = deferred();
  const newUserId = "9e000000-0000-4000-8000-000000000003";
  const newCaseId = "9e000000-0000-4000-8000-000000000203";
  let ownerCalls = 0;
  let calendarCalls = 0;
  const authRuntime = {
    async getSession() { return { access_token: "owner-session" }; },
    async authenticatedFetch(endpoint) {
      if (endpoint === "owner-workspace-grant") {
        ownerCalls += 1;
        if (ownerCalls === 1) return oldOwner.promise;
        return new Response(JSON.stringify(ownerGrantPayload({
          userId: newUserId,
          caseId: newCaseId,
          title: "New case",
        })), { status: 200 });
      }
      if (endpoint === "owner-google-calendar-grant") {
        calendarCalls += 1;
        if (calendarCalls === 2) {
          oldCalendarRequested.resolve();
          return oldCalendar.promise;
        }
        return new Response(JSON.stringify(ownerCalendarGrant({
          userId: newUserId,
          caseId: newCaseId,
          calendarId: "new-calendar@example.test",
        })), { status: 200 });
      }
      throw new Error("unexpected endpoint");
    },
  };
  const bootstrap = runtime.createOwnerSupabaseWorkspaceBootstrap({
    root: harness.root,
    authRuntime,
  });

  const first = bootstrap.initialize();
  const second = bootstrap.initialize();
  await second;
  oldOwner.resolve(new Response(JSON.stringify(ownerGrantPayload()), { status: 200 }));
  await first;
  assert.match(harness.frame.src, /new-calendar/u);

  const staleCalendarRun = bootstrap.initialize();
  await oldCalendarRequested.promise;
  const latest = bootstrap.initialize();
  await latest;
  oldCalendar.resolve(new Response(JSON.stringify(ownerCalendarGrant()), { status: 200 }));
  await staleCalendarRun;
  assert.match(harness.frame.src, /new-calendar/u);
  assert.equal(harness.state.textContent, "本案 Google Calendar 已連結");
});

test("文件 consumer 首屏說清案件、狀態、責任人、下一步與留痕依據", async () => {
  const [html, runtime] = await Promise.all([
    readPageFile("code.html"),
    loadRuntime(),
  ]);
  const documentsId = html.indexOf('id="documents"');
  const documentsStart = html.lastIndexOf("<section", documentsId);
  const documentsEnd = html.indexOf('id="submissions"', documentsStart);
  const documentsPanel = html.slice(documentsStart, documentsEnd);

  for (const slot of [
    "document-workbench-case",
    "document-workbench-status",
    "document-workbench-updated",
    "document-workbench-actor",
    "document-workbench-next",
    "document-workbench-trace",
  ]) {
    assert.match(documentsPanel, new RegExp(`data-slot="${slot}"`, "u"));
  }
  for (const label of [
    "目前案件",
    "文件狀態",
    "最近更新",
    "目前責任人",
    "下一步",
    "案件紀錄",
  ]) {
    assert.match(documentsPanel, new RegExp(label, "u"));
  }

  const emptyModel = runtime.buildOwnerWorkspaceViewModel(authorizedContext());
  assert.equal(emptyModel.documentCase, "驗收用案件（非正式資料）");
  assert.equal(emptyModel.documentStatus, "尚無文件");
  assert.equal(emptyModel.documentUpdated, "依案件紀錄顯示");
  assert.equal(emptyModel.documentActor, "PCM");
  assert.equal(emptyModel.documentNext, "逐項回覆文件問題");
  assert.equal(emptyModel.documentTrace, "目前沒有可確認的正式文件紀錄");

  const readyModel = runtime.buildOwnerWorkspaceViewModel(authorizedContext({
    documents: [{
      title: "平面配置圖",
      kindLabel: "圖面",
      versionLabel: "第 3 版・甲方確認版",
      submittedByLabel: "提供者：案件成員",
      submittedAtLabel: "更新時間：2026/08/28",
      statusLabel: "文件可檢視",
      nextActorLabel: "下一步責任人：甲方確認",
      traceabilityLabel: "已留下正式案件紀錄",
    }],
  }));
  assert.equal(readyModel.documentStatus, "文件可檢視");
  assert.equal(readyModel.documentTrace, "已留下正式案件紀錄");
  assert.equal(readyModel.documents[0].nextActorLabel, "下一步責任人：甲方確認");
  assert.equal(readyModel.documents[0].traceabilityLabel, "已留下正式案件紀錄");
});

test("文件 consumer 對每種 fail-closed 狀態使用可理解的產品語", async () => {
  const runtime = await loadRuntime();
  assert.equal(
    runtime.buildOwnerWorkspaceViewModel().documentStatus,
    "正在確認案件授權",
  );
  assert.equal(
    runtime.buildOwnerWorkspaceViewModel(authorizedContext({ caseSummary: null }))
      .documentStatus,
    "文件整理中",
  );
  assert.equal(
    runtime.buildOwnerWorkspaceViewModel(authorizedContext({ sessionStatus: "expired" }))
      .documentStatus,
    "無權限",
  );

  const unavailable = runtime.createOwnerWorkspaceController({
    adapter: {
      loadOwnerWorkspace() {
        throw Object.assign(new Error("unavailable"), { status: 503 });
      },
    },
  });
  assert.equal((await unavailable.initialize()).documentStatus, "暫時無法取得");
});

test("未開放的文件操作保持停用、沒有 browser authority 或虛構成功", async () => {
  const [html, runtimeSource] = await Promise.all([
    readPageFile("code.html"),
    readPageFile("app.js"),
  ]);
  const documentsId = html.indexOf('id="documents"');
  const documentsStart = html.lastIndexOf("<section", documentsId);
  const documentsEnd = html.indexOf('id="submissions"', documentsStart);
  const documentsPanel = html.slice(documentsStart, documentsEnd);
  const pendingControls = documentsPanel.match(
    /<button\b[^>]*data-owner-document-pending-action="[^"]+"[^>]*>/gu,
  ) ?? [];

  assert.equal(pendingControls.length, 3);
  for (const control of pendingControls) {
    assert.match(control, /\bdisabled\b/u);
    assert.match(control, /aria-disabled="true"/u);
  }
  assert.match(documentsPanel, /尚待案件授權與文件服務開放/u);
  assert.doesNotMatch(
    documentsPanel,
    /\/api\/|\bAPI\b|\bDB\b|debug|mock|source|上傳完成|下載完成|版本組合已固定/u,
  );
  assert.doesNotMatch(
    `${documentsPanel}\n${runtimeSource}`,
    /(?:searchParams|localStorage|dataset)\.(?:userId|caseId|role|memberId|grant|bucket|path|documentRef)\b/u,
  );
});

test("可信 server projection 才能把文件列標為正式案件紀錄", async () => {
  const { validateAndMapOwnerWorkspaceGrant } = await loadBootstrap();
  const payload = ownerGrantPayload({ title: "住宅修改工程" });
  payload.documents.push({
    caseId: CANONICAL_OWNER_CASE_ID,
    category: "drawing",
    fileId: "9e000000-0000-4000-8000-000000000701",
    name: "平面配置圖",
    recordStatus: "active",
    uploadedAt: "2026-08-28T02:30:00.000Z",
    versionLabel: "甲方確認版",
    versionNumber: 3,
  });

  const mapped = validateAndMapOwnerWorkspaceGrant(payload);
  assert.equal(mapped.documents.length, 1);
  assert.deepEqual(mapped.documents[0], {
    title: "平面配置圖",
    kindLabel: "圖面",
    versionLabel: "第 3 版・甲方確認版",
    submittedByLabel: "提供者：案件成員",
    submittedAtLabel: "更新時間：2026/08/28",
    statusLabel: "文件可檢視",
    sourceLabel: "依據：案件文件紀錄",
    nextActorLabel: "下一步責任人：甲方確認",
    traceabilityLabel: "已留下正式案件紀錄",
  });

  const notRecorded = structuredClone(payload);
  notRecorded.documents[0].recordStatus = "pending";
  assert.equal(validateAndMapOwnerWorkspaceGrant(notRecorded), null);
});

test("甲方文件區以橘焰 first-fold 工作台呈現狀態、依據與既有契約入口", async () => {
  const [html, css] = await Promise.all([
    readPageFile("code.html"),
    readPageFile("styles.css"),
  ]);
  const documentsId = html.indexOf('id="documents"');
  const documentsStart = html.lastIndexOf("<section", documentsId);
  const documentsEnd = html.indexOf('id="submissions"', documentsStart);
  const documentsPanel = html.slice(documentsStart, documentsEnd);

  assert.ok(documentsStart > 0 && documentsEnd > documentsStart);
  assert.match(documentsPanel, /class="workspace-section owner-document-workbench"/u);
  assert.match(documentsPanel, /owner-document-workbench__heading/u);
  assert.match(documentsPanel, /owner-document-status-band/u);
  assert.match(documentsPanel, /owner-document-pending-actions/u);
  assert.match(documentsPanel, /owner-document-workbench__evidence/u);
  assert.match(documentsPanel, /owner-document-workbench__footer/u);
  assert.match(
    documentsPanel,
    /data-owner-document-primary-action[^>]*href="\.\.\/pcm_standalone\/service_contract\/code\.html\?returnTo=owner-contract#full-contract"[^>]*>[\s\S]*查看 DRS 服務契約全文/u,
  );
  assert.match(documentsPanel, /data-owner-document-share-guide/u);
  assert.match(documentsPanel, /data-list="documents"/u);

  assert.match(css, /\.owner-document-workbench\s*\{[\s\S]*grid-template-rows:/u);
  assert.match(css, /\.owner-document-workbench__actions\s*\{[\s\S]*display:\s*grid/u);
  assert.match(css, /\.owner-document-status-band\s*\{[\s\S]*display:\s*grid/u);
  assert.match(css, /\.owner-document-pending-actions\s*\{[\s\S]*display:\s*grid/u);
  assert.match(css, /\.owner-document-pending-actions button\s*\{[\s\S]*min-height:\s*44px/u);
  assert.match(css, /\.owner-document-status-band__facts dd\s*\{[\s\S]*font-size:\s*\.875rem/u);
  assert.match(css, /\.owner-document-pending-actions button\s*\{[\s\S]*font-size:\s*\.875rem/u);
  assert.match(css, /\.owner-document-workbench__evidence\s*\{[\s\S]*min-height:/u);
  assert.match(css, /data-active-owner-section="documents"[\s\S]*owner-workbench-nav/u);
  assert.match(
    css,
    /@media \(max-width: 760px\)[\s\S]*\.owner-document-workbench__heading\s*\{[\s\S]*grid-template-columns:\s*1fr/u,
  );
  assert.match(
    css,
    /@media \(max-width: 760px\)[\s\S]*#documents\.owner-document-workbench\s*\{[^}]*scroll-margin-top:\s*18\.5rem/u,
  );
  assert.match(css, /\.owner-document-workbench__primary-action\s*\{[\s\S]*min-height:\s*44px/u);
  assert.doesNotMatch(css, /\.owner-construction-primary-action/u);
  assert.match(
    css,
    /@media \(max-width: 760px\)[\s\S]*data-owner-construction-mode="collection"[\s\S]{0,220}data-active-owner-section="documents"[\s\S]{0,180}\.owner-construction-stage\s*\{[^}]*order:\s*1/u,
  );
  assert.match(
    css,
    /data-owner-construction-mode="collection"[\s\S]{0,220}data-active-owner-section="documents"[\s\S]{0,180}\.owner-construction-nav\s*\{[^}]*display:\s*none/u,
  );
});
