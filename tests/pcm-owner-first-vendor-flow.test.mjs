import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { access, readFile, readdir } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

const repositoryRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const pcmRoot = path.join(
  repositoryRoot,
  "src",
  "stitch_laibe_landing_onboarding",
  "pcm_standalone",
);
const invitationDir = path.join(pcmRoot, "vendor_invitation");
const workspaceDir = path.join(pcmRoot, "vendor_workspace");
const expectedPackageFiles = Object.freeze(["app.js", "code.html", "styles.css"]);

const invitationCodes = Object.freeze([
  "INVITATION_PENDING",
  "DECLINED",
  "EXPIRED",
  "WITHDRAWN",
  "RESENT_PENDING",
  "ACCEPTANCE_PENDING_MEMBERSHIP",
  "MEMBERSHIP_UNCONFIRMED",
  "AUTHORIZED_VENDOR_WORKSPACE",
  "CONTEXT_UNAVAILABLE",
]);

const workspaceCodes = Object.freeze([
  "CONTEXT_UNAVAILABLE",
  "MEMBERSHIP_UNCONFIRMED",
  "AUTHORIZED_VENDOR_WORKSPACE",
  "PCM_EXITED_BILATERAL_CONTINUATION",
  "CASE_CLOSED_READ_ONLY",
  "CANCELLED",
]);

const resourceCodes = Object.freeze([
  "CONTRACT_DRAFT_VERSIONS",
  "ATTACHMENTS",
  "PUBLIC_PCM_REVIEWS",
  "SUPPLEMENTS",
  "SCHEDULES",
  "EVIDENCE",
  "ACCEPTANCE",
  "CHANGES",
  "ADDENDA",
  "CASE_RECORDS",
]);

function pagePath(directory, fileName) {
  return path.join(directory, fileName);
}

function moduleUrl(directory, marker) {
  return `${pathToFileURL(pagePath(directory, "app.js")).href}?${marker}=${Date.now()}`;
}

function visibleText(html) {
  return html
    .replace(/<script\b[\s\S]*?<\/script>/giu, " ")
    .replace(/<style\b[\s\S]*?<\/style>/giu, " ")
    .replace(/<[^>]+>/gu, " ")
    .replace(/&(?:nbsp|amp|lt|gt|quot|#\d+);/giu, " ")
    .replace(/\s+/gu, " ")
    .trim();
}

function count(source, pattern) {
  return source.match(pattern)?.length ?? 0;
}

function restoreDescriptor(target, key, descriptor) {
  if (descriptor) {
    Object.defineProperty(target, key, descriptor);
  } else {
    delete target[key];
  }
}

function assertFrozenNullRecord(record, label) {
  assert.equal(Object.getPrototypeOf(record), null, `${label} prototype`);
  assert.equal(Object.isFrozen(record), true, `${label} frozen`);
  for (const key of Object.keys(record)) {
    const descriptor = Object.getOwnPropertyDescriptor(record, key);
    assert.ok(descriptor, `${label}.${key} own descriptor`);
    assert.equal("value" in descriptor, true, `${label}.${key} own data`);
  }
}

function ownListValues(list, label) {
  assert.equal(Object.getPrototypeOf(list), null, `${label} prototype`);
  assert.equal(Object.isFrozen(list), true, `${label} frozen`);
  const lengthDescriptor = Object.getOwnPropertyDescriptor(list, "length");
  assert.ok(lengthDescriptor && "value" in lengthDescriptor, `${label}.length own data`);
  const values = [];
  for (let index = 0; index < lengthDescriptor.value; index += 1) {
    const descriptor = Object.getOwnPropertyDescriptor(list, String(index));
    assert.ok(descriptor && "value" in descriptor, `${label}[${index}] own data`);
    values.push(descriptor.value);
  }
  return values;
}

async function assertLocalReferences(directory) {
  const html = await readFile(pagePath(directory, "code.html"), "utf8");
  const references = [...html.matchAll(/\b(?:href|src)="([^"]+)"/giu)]
    .map((match) => match[1]);

  for (const reference of references) {
    assert.doesNotMatch(reference, /^(?:https?:)?\/\//iu, reference);
    const [relativePath, fragment] = reference.split("#");
    if (!relativePath) {
      assert.match(html, new RegExp(`id=["']${fragment}["']`, "u"), reference);
      continue;
    }
    const target = path.resolve(directory, relativePath);
    await access(target);
    if (fragment) {
      const targetHtml = await readFile(target, "utf8");
      assert.match(targetHtml, new RegExp(`id=["']${fragment}["']`, "u"), reference);
    }
  }
}

test("vendor invitation and workspace are exact local three-file packages", async () => {
  for (const directory of [invitationDir, workspaceDir]) {
    const entries = await readdir(directory, { withFileTypes: true });
    assert.deepEqual(
      entries.filter((entry) => entry.isFile()).map((entry) => entry.name).sort(),
      expectedPackageFiles,
      directory,
    );
    assert.equal(entries.some((entry) => entry.isDirectory()), false, directory);
  }
});

test("both first folds state role contract case responsibility record and one primary action", async () => {
  const [invitationHtml, workspaceHtml] = await Promise.all([
    readFile(pagePath(invitationDir, "code.html"), "utf8"),
    readFile(pagePath(workspaceDir, "code.html"), "utf8"),
  ]);
  const invitationFold = invitationHtml.slice(0, invitationHtml.indexOf('id="invitation-details"'));
  const workspaceFold = workspaceHtml.slice(0, workspaceHtml.indexOf('id="workspace-resources"'));

  for (const [label, fold] of [
    ["invitation", invitationFold],
    ["workspace", workspaceFold],
  ]) {
    assert.match(fold, /角色/u, label);
    assert.match(fold, /契約狀態/u, label);
    assert.match(fold, /案件狀態/u, label);
    assert.match(fold, /下一步[／/]責任人/u, label);
    assert.match(fold, /最近紀錄/u, label);
    assert.equal(count(fold, /\bdata-primary-action\b/gu), 1, label);
    assert.match(fold, /尚未(?:顯示|取得)案件資料/u, label);
    assert.match(fold, /尚無可顯示(?:的案件)?紀錄/u, label);
  }

  assert.match(invitationFold, /受邀乙方/u);
  assert.match(invitationFold, /href="\.\.\/account_access\/code\.html"/u);
  assert.match(invitationFold, /data-canonical-route="\/account\/access"/u);
  assert.match(workspaceFold, /href="\.\.\/vendor_invitation\/code\.html"/u);
});

test("every invitation outcome explains reason next responsible return and recovery", async () => {
  const html = await readFile(pagePath(invitationDir, "code.html"), "utf8");
  for (const code of invitationCodes) {
    const block = html.match(
      new RegExp(`<details[^>]*data-state-code=["']${code}["'][\\s\\S]*?<\\/details>`, "u"),
    )?.[0];
    assert.ok(block, code);
    for (const label of ["原因", "下一步", "責任人", "返回位置", "恢復方式"]) {
      assert.match(block, new RegExp(label, "u"), `${code}:${label}`);
    }
  }
});

test("invitation runtime exports immutable canonical states actions and transitions", async () => {
  const runtime = await import(moduleUrl(invitationDir, "canonical"));
  assertFrozenNullRecord(runtime.INVITATION_STATES, "INVITATION_STATES");
  assert.deepEqual(Object.keys(runtime.INVITATION_STATES), invitationCodes);

  for (const code of invitationCodes) {
    const state = runtime.INVITATION_STATES[code];
    assertFrozenNullRecord(state, code);
    assert.equal(state.code, code);
    assert.equal(typeof state.reason, "string");
    assert.equal(typeof state.nextAction, "string");
    assert.equal(typeof state.responsible, "string");
    assert.equal(typeof state.returnPath, "string");
    assert.equal(typeof state.recovery, "string");
    assert.equal(state.caseData, null);
    assert.equal(state.payload, null);
    assert.equal(state.mutationAllowed, false);
    assert.equal(state.writeActionsEnabled, false);
    assert.deepEqual(ownListValues(state.actions, `${code}.actions`), []);
  }

  assert.deepEqual(
    ownListValues(runtime.INVITATION_STATE_LIST, "INVITATION_STATE_LIST")
      .map((state) => state.code),
    invitationCodes,
  );
  assertFrozenNullRecord(runtime.INVITATION_EVENTS, "INVITATION_EVENTS");
  for (const event of Object.values(runtime.INVITATION_EVENTS)) {
    assertFrozenNullRecord(event, event.code);
    assert.equal(event.mutationAuthority, false);
  }
  for (const transition of ownListValues(runtime.INVITATION_TRANSITIONS, "INVITATION_TRANSITIONS")) {
    assertFrozenNullRecord(transition, `${transition.from}:${transition.event}`);
  }
});

test("invitation transitions close terminal stale duplicate and same-identity resend events", async () => {
  const runtime = await import(moduleUrl(invitationDir, "transitions"));
  const states = runtime.INVITATION_STATES;
  const events = runtime.INVITATION_EVENTS;
  const transition = runtime.previewInvitationTransition;

  assert.equal(transition(states.INVITATION_PENDING, events.ACCEPT), states.ACCEPTANCE_PENDING_MEMBERSHIP);
  assert.equal(transition(states.INVITATION_PENDING, events.DECLINE), states.DECLINED);
  assert.equal(transition(states.INVITATION_PENDING, events.EXPIRE), states.EXPIRED);
  assert.equal(transition(states.INVITATION_PENDING, events.WITHDRAW), states.WITHDRAWN);
  assert.equal(
    transition(states.ACCEPTANCE_PENDING_MEMBERSHIP, events.MEMBERSHIP_CONFIRMED),
    states.AUTHORIZED_VENDOR_WORKSPACE,
  );
  assert.equal(
    transition(states.ACCEPTANCE_PENDING_MEMBERSHIP, events.MEMBERSHIP_UNCONFIRMED),
    states.MEMBERSHIP_UNCONFIRMED,
  );

  for (const terminal of [states.DECLINED, states.EXPIRED, states.WITHDRAWN]) {
    assert.equal(transition(terminal, events.ACCEPT), terminal, terminal.code);
    assert.equal(transition(terminal, events.RESEND, "invite-1", "invite-1"), terminal, terminal.code);
    assert.equal(transition(terminal, events.RESEND, "invite-1"), terminal, terminal.code);
    assert.equal(
      transition(terminal, events.RESEND, "invite-1", "invite-2"),
      states.RESENT_PENDING,
      terminal.code,
    );
  }

  assert.equal(transition(states.RESENT_PENDING, events.ACCEPT), states.ACCEPTANCE_PENDING_MEMBERSHIP);
  assert.equal(
    transition(states.ACCEPTANCE_PENDING_MEMBERSHIP, events.ACCEPT),
    states.ACCEPTANCE_PENDING_MEMBERSHIP,
  );
  assert.equal(
    transition(states.AUTHORIZED_VENDOR_WORKSPACE, events.DECLINE),
    states.AUTHORIZED_VENDOR_WORKSPACE,
  );
});

test("unknown hostile invitation and workspace contexts are trap-zero zero-case-data", async () => {
  const [invitation, workspace] = await Promise.all([
    import(moduleUrl(invitationDir, "hostile")),
    import(moduleUrl(workspaceDir, "hostile")),
  ]);
  let getterCalls = 0;
  let trapCalls = 0;
  const accessor = Object.create(null);
  Object.defineProperty(accessor, "code", {
    get() {
      getterCalls += 1;
      throw new Error("must not read caller authority");
    },
  });
  const proxy = new Proxy({}, {
    get() {
      trapCalls += 1;
      throw new Error("must not get caller authority");
    },
    getOwnPropertyDescriptor() {
      trapCalls += 1;
      throw new Error("must not inspect caller authority");
    },
    getPrototypeOf() {
      trapCalls += 1;
      throw new Error("must not inspect caller prototype");
    },
    has() {
      trapCalls += 1;
      throw new Error("must not inspect caller membership");
    },
  });
  const revoked = Proxy.revocable({}, {});
  revoked.revoke();
  const hostileInputs = [
    undefined,
    null,
    false,
    1,
    "AUTHORIZED_VENDOR_WORKSPACE",
    {},
    { code: "AUTHORIZED_VENDOR_WORKSPACE" },
    Object.create({ code: "AUTHORIZED_VENDOR_WORKSPACE" }),
    accessor,
    proxy,
    revoked.proxy,
  ];

  for (const input of hostileInputs) {
    assert.doesNotThrow(() => invitation.resolveInvitationContext(input));
    assert.equal(invitation.resolveInvitationContext(input), invitation.CONTEXT_UNAVAILABLE);
    assert.doesNotThrow(() => workspace.resolveVendorWorkspaceAccess(input));
    assert.equal(workspace.resolveVendorWorkspaceAccess(input), workspace.CONTEXT_UNAVAILABLE);
  }
  assert.equal(getterCalls, 0);
  assert.equal(trapCalls, 0);
  assert.equal(invitation.CONTEXT_UNAVAILABLE.protectedRouteAllowed, false);
  assert.equal(workspace.CONTEXT_UNAVAILABLE.protectedRouteAllowed, false);
});

test("post-load intrinsic pollution cannot inject actions transitions resources or authority", async () => {
  const [invitation, workspace] = await Promise.all([
    import(moduleUrl(invitationDir, "pollution")),
    import(moduleUrl(workspaceDir, "pollution")),
  ]);
  const arrayIndex = Object.getOwnPropertyDescriptor(Array.prototype, "0");
  const arrayIterator = Object.getOwnPropertyDescriptor(Array.prototype, Symbol.iterator);
  const objectCode = Object.getOwnPropertyDescriptor(Object.prototype, "code");
  const stringTrim = Object.getOwnPropertyDescriptor(String.prototype, "trim");
  const reflectGet = Object.getOwnPropertyDescriptor(Reflect, "get");
  const injected = Object.freeze({ code: "INJECTED_WRITE", enabled: true });
  let observations;

  try {
    Object.defineProperty(Array.prototype, "0", { configurable: true, value: injected });
    Object.defineProperty(Array.prototype, Symbol.iterator, {
      configurable: true,
      value: function* pollutedIterator() {
        yield injected;
      },
    });
    Object.defineProperty(Object.prototype, "code", {
      configurable: true,
      value: "AUTHORIZED_VENDOR_WORKSPACE",
    });
    Object.defineProperty(String.prototype, "trim", {
      configurable: true,
      value() {
        throw new Error("polluted trim");
      },
    });
    Object.defineProperty(Reflect, "get", {
      configurable: true,
      value() {
        throw new Error("polluted Reflect.get");
      },
    });

    observations = {
      invitationActions: [...invitation.CONTEXT_UNAVAILABLE.actions],
      invitationIndex: invitation.CONTEXT_UNAVAILABLE.actions[0],
      legacyWorkspaceStates: [...workspace.VENDOR_WORKSPACE_STATES],
      workspaceActions: [...workspace.VENDOR_WORKSPACE_ACTIONS],
      resources: [...workspace.VENDOR_WORKSPACE_RESOURCES].map((resource) => resource.code),
      invitationAuthority: invitation.resolveInvitationContext({}),
      workspaceAuthority: workspace.resolveVendorWorkspaceAccess({}),
      resend: invitation.previewInvitationTransition(
        invitation.INVITATION_STATES.DECLINED,
        invitation.INVITATION_EVENTS.RESEND,
        "invite-a",
        "invite-b",
      ),
    };
  } finally {
    restoreDescriptor(Array.prototype, "0", arrayIndex);
    restoreDescriptor(Array.prototype, Symbol.iterator, arrayIterator);
    restoreDescriptor(Object.prototype, "code", objectCode);
    restoreDescriptor(String.prototype, "trim", stringTrim);
    restoreDescriptor(Reflect, "get", reflectGet);
  }

  assert.deepEqual(observations.invitationActions, []);
  assert.equal(observations.invitationIndex, undefined);
  assert.deepEqual(observations.legacyWorkspaceStates, [
    "ACCESS_CHECKING",
    "ACCESS_DENIED",
    "CONTRACT_PENDING",
    "AUTHORIZED_EMPTY",
    "AUTHORIZED_READY",
    "CASE_ARCHIVED_READ_ONLY",
    "LOAD_FAILED_RETRYABLE",
  ]);
  assert.deepEqual(observations.workspaceActions, ownListValues(workspace.VENDOR_WORKSPACE_ACTIONS, "actions"));
  assert.deepEqual(observations.resources, resourceCodes);
  assert.equal(observations.invitationAuthority, invitation.CONTEXT_UNAVAILABLE);
  assert.equal(observations.workspaceAuthority, workspace.CONTEXT_UNAVAILABLE);
  assert.equal(observations.resend, invitation.INVITATION_STATES.RESENT_PENDING);
});

test("workspace exports exact ten resources and keeps terminal states in the original workspace", async () => {
  const runtime = await import(moduleUrl(workspaceDir, "resources"));
  assertFrozenNullRecord(runtime.VENDOR_WORKSPACE_CANONICAL_STATES, "canonical states");
  assert.deepEqual(Object.keys(runtime.VENDOR_WORKSPACE_CANONICAL_STATES), workspaceCodes);
  assert.deepEqual(
    ownListValues(runtime.VENDOR_WORKSPACE_RESOURCES, "VENDOR_WORKSPACE_RESOURCES")
      .map((resource) => resource.code),
    resourceCodes,
  );
  for (const resource of ownListValues(runtime.VENDOR_WORKSPACE_RESOURCES, "resources")) {
    assertFrozenNullRecord(resource, resource.code);
    assert.equal(typeof resource.label, "string");
    assert.equal(resource.defaultWriteEnabled, false);
  }
  for (const action of ownListValues(runtime.VENDOR_WORKSPACE_ACTIONS, "VENDOR_WORKSPACE_ACTIONS")) {
    assertFrozenNullRecord(action, action.code);
    assert.equal(action.enabled, false);
    assert.equal(action.mutationAuthority, false);
  }

  for (const code of workspaceCodes) {
    const state = runtime.VENDOR_WORKSPACE_CANONICAL_STATES[code];
    assertFrozenNullRecord(state, code);
    assert.equal(typeof state.reason, "string");
    assert.equal(typeof state.nextAction, "string");
    assert.equal(typeof state.responsible, "string");
    assert.equal(typeof state.returnPath, "string");
    assert.equal(typeof state.recovery, "string");
    assert.equal(state.caseData, null);
    assert.equal(state.mutationAllowed, false);
  }

  const pcmExited = runtime.VENDOR_WORKSPACE_CANONICAL_STATES.PCM_EXITED_BILATERAL_CONTINUATION;
  assert.equal(pcmExited.caseMode, "BILATERAL_CONTINUATION");
  assert.equal(pcmExited.newPcmOperationsAllowed, false);
  assert.equal(pcmExited.historicalPcmDataMode, "READ_ONLY");
  assert.equal(pcmExited.rejoinRequiresNewAuthorization, true);
  assert.equal(pcmExited.preserveResources, runtime.VENDOR_WORKSPACE_RESOURCES);

  const closed = runtime.VENDOR_WORKSPACE_CANONICAL_STATES.CASE_CLOSED_READ_ONLY;
  const cancelled = runtime.VENDOR_WORKSPACE_CANONICAL_STATES.CANCELLED;
  assert.notEqual(closed, cancelled);
  assert.equal(closed.workspaceMode, "ORIGINAL_WORKSPACE_READ_ONLY");
  assert.equal(cancelled.workspaceMode, "ORIGINAL_WORKSPACE_READ_ONLY");
  assert.doesNotMatch(`${closed.title} ${cancelled.title}`, /封存工作台/u);
});

test("workspace copy preserves the contract attachment review and conversation boundaries", async () => {
  const html = await readFile(pagePath(workspaceDir, "code.html"), "utf8");
  for (const label of [
    "契約草稿版本",
    "附件",
    "公開審查意見",
    "補件",
    "排程",
    "證據",
    "驗收",
    "變更",
    "附約",
    "案件紀錄",
  ]) {
    assert.match(html, new RegExp(label, "u"), label);
  }
  assert.equal(count(html, /\bdata-resource-code=/gu), 10);
  assert.match(html, /甲方只提送[^<]*契約簽署草稿/u);
  assert.match(html, /乙方[^<]*附件[^<]*不限次數[^<]*PCM[^<]*審查/u);
  assert.match(html, /已執行[^<]*原契約[^<]*簽章[^<]*不可變/u);
  assert.match(html, /另建[^<]*附約草稿/u);
  assert.match(html, /公開[^<]*PCM[^<]*審查意見/u);
  assert.match(html, /平台外[^<]*協商/u);
  assert.match(html, /不顯示[^<]*甲乙[^<]*私人對話/u);
  assert.match(html, /甲方與 PCM[^<]*一對一介面[^<]*不會出現在乙方工作台/u);
});

test("vendor workspace exposes three accessible governance tabs with vendor-only selectors", async () => {
  const [html, css, runtimeSource] = await Promise.all([
    readFile(pagePath(workspaceDir, "code.html"), "utf8"),
    readFile(pagePath(workspaceDir, "styles.css"), "utf8"),
    readFile(pagePath(workspaceDir, "app.js"), "utf8"),
  ]);

  assert.match(html, /class="vendor-workspace-tabs"[^>]*role="tablist"/u);
  for (const [kind, label] of [
    ["design", "設計案管理"],
    ["construction", "工程案管理"],
    ["contract", "契約管理"],
  ]) {
    assert.match(
      html,
      new RegExp(`id="vendor-workspace-tab-${kind}"[\\s\\S]*?role="tab"[\\s\\S]*?data-vendor-workspace-tab="${kind}"[\\s\\S]*?aria-controls="vendor-workspace-panel-${kind}"[\\s\\S]*?${label}`, "u"),
      kind,
    );
    assert.match(
      html,
      new RegExp(`class="vendor-workspace-panel"[\\s\\S]*?id="vendor-workspace-panel-${kind}"[\\s\\S]*?role="tabpanel"[\\s\\S]*?aria-labelledby="vendor-workspace-tab-${kind}"[\\s\\S]*?data-vendor-workspace-panel="${kind}"`, "u"),
      kind,
    );
  }
  assert.equal(count(html, /class="vendor-workspace-panel__summary"/gu), 3);
  assert.equal(count(html, /class="vendor-workspace-panel__body"/gu), 3);
  assert.equal(count(html, /class="vendor-workspace-panel__next"/gu), 3);
  assert.equal(count(html, /\bdata-resource-code=/gu), 10);
  assert.doesNotMatch(`${html}\n${css}\n${runtimeSource}`, /\bowner-[a-z0-9_-]+/iu);
  assert.doesNotMatch(html, /data-document-(?:tab|panel|file|dropzone)|document-file-|PDF[^<]*拖/u);
  assert.match(css, /\.vendor-workspace-tabs\s*\{/u);
  assert.match(css, /\.vendor-workspace-panel\s*\{/u);
  assert.match(css, /\.vendor-workspace-panel__summary\s*[,\{]/u);
  assert.match(css, /\.vendor-workspace-panel__body\s*[,\{]/u);
  assert.match(css, /\.vendor-workspace-panel__next\s*\{/u);
});

test("vendor workspace tab keyboard contract supports arrows Home and End", async () => {
  const runtime = await import(moduleUrl(workspaceDir, "tabs"));
  assert.deepEqual(
    ownListValues(runtime.VENDOR_WORKSPACE_TAB_KEYS, "VENDOR_WORKSPACE_TAB_KEYS"),
    ["design", "construction", "contract"],
  );
  assert.equal(runtime.resolveVendorWorkspaceTabKey("design", "ArrowRight"), "construction");
  assert.equal(runtime.resolveVendorWorkspaceTabKey("design", "ArrowLeft"), "contract");
  assert.equal(runtime.resolveVendorWorkspaceTabKey("construction", "Home"), "design");
  assert.equal(runtime.resolveVendorWorkspaceTabKey("construction", "End"), "contract");
  assert.equal(runtime.resolveVendorWorkspaceTabKey("contract", "ArrowRight"), "design");
  assert.equal(runtime.resolveVendorWorkspaceTabKey("contract", "Escape"), "contract");
});

test("vendor document resolver accepts native-style accessors and rejects hostile values", async () => {
  const runtime = await import(moduleUrl(workspaceDir, "document-resolver"));
  const documentLike = {
    body: { setAttribute() {} },
    querySelector() { return null; },
    querySelectorAll() { return []; },
  };
  let receiver = null;
  const prototype = Object.create(null);
  Object.defineProperty(prototype, "document", {
    configurable: true,
    get() {
      receiver = this;
      return documentLike;
    },
  });
  const nativeLikeGlobal = Object.create(prototype);

  assert.equal(runtime.resolveVendorDocument(nativeLikeGlobal), documentLike);
  assert.equal(receiver, nativeLikeGlobal);

  const throwingPrototype = Object.create(null);
  Object.defineProperty(throwingPrototype, "document", {
    configurable: true,
    get() {
      throw new Error("hostile accessor");
    },
  });
  assert.equal(runtime.resolveVendorDocument(Object.create(throwingPrototype)), null);

  for (const invalid of [
    null,
    {},
    { body: {}, querySelector() {}, querySelectorAll() {} },
    { body: { setAttribute() {} }, querySelector: null, querySelectorAll() {} },
  ]) {
    assert.equal(runtime.resolveVendorDocument({ document: invalid }), null);
  }
});

test("vendor module auto-initializes through an accessor-backed document", async () => {
  const originalDocument = Object.getOwnPropertyDescriptor(globalThis, "document");
  const bodyAttributes = new Map();
  const controlAttributes = new Map();
  const control = {
    disabled: false,
    setAttribute(name, value) { controlAttributes.set(name, String(value)); },
  };
  const documentLike = {
    body: {
      setAttribute(name, value) { bodyAttributes.set(name, String(value)); },
    },
    querySelector() { return null; },
    querySelectorAll(selector) {
      if (selector === "[data-write-action]") return [control];
      return [];
    },
  };
  let receiver = null;
  Object.defineProperty(globalThis, "document", {
    configurable: true,
    get() {
      receiver = this;
      return documentLike;
    },
  });

  try {
    await import(moduleUrl(workspaceDir, "browser-auto-init"));
  } finally {
    if (originalDocument) {
      Object.defineProperty(globalThis, "document", originalDocument);
    } else {
      delete globalThis.document;
    }
  }

  assert.equal(receiver, globalThis);
  assert.equal(bodyAttributes.get("data-vendor-state"), "CONTEXT_UNAVAILABLE");
  assert.equal(control.disabled, true);
  assert.equal(controlAttributes.get("aria-disabled"), "true");
});

test("vendor tab initializer drives DOM state and maps current and legacy fragments", async () => {
  const runtime = await import(moduleUrl(workspaceDir, "tab-dom"));
  let focused = null;

  function element({ dataset = {}, href = null, hidden = false } = {}) {
    const attributes = new Map();
    const listeners = new Map();
    return {
      dataset: { ...dataset },
      disabled: false,
      hidden,
      tabIndex: 0,
      addEventListener(type, listener) { listeners.set(type, listener); },
      emit(type, event = {}) { listeners.get(type)?.(event); },
      focus() { focused = this; },
      getAttribute(name) {
        if (name === "href") return href;
        return attributes.get(name) ?? null;
      },
      getBoundingClientRect() { return { top: 120 }; },
      setAttribute(name, value) { attributes.set(name, String(value)); },
    };
  }

  const tabs = ["design", "construction", "contract"].map((kind) => element({
    dataset: { vendorWorkspaceTab: kind },
  }));
  const panels = ["design", "construction", "contract"].map((kind, index) => element({
    dataset: { vendorWorkspacePanel: kind },
    hidden: index !== 0,
  }));
  const links = ["#documents", "#execution", "#reviews", "#records"].map((href) => element({ href }));
  const targets = Object.fromEntries([
    ["#documents", panels[2]],
    ["#execution", panels[1]],
    ["#reviews", element()],
    ["#records", element()],
  ]);
  const live = element();
  const windowListeners = new Map();
  const view = {
    location: { hash: "#documents" },
    scrollY: 20,
    addEventListener(type, listener) { windowListeners.set(type, listener); },
    scrollTo() {},
  };
  const root = {
    defaultView: view,
    querySelector(selector) {
      if (selector === "[data-vendor-workspace-live]") return live;
      return targets[selector] ?? null;
    },
    querySelectorAll(selector) {
      if (selector === "[data-vendor-workspace-tab]") return tabs;
      if (selector === "[data-vendor-workspace-panel]") return panels;
      if (selector === "[data-vendor-workspace-route]") return links;
      return [];
    },
  };

  runtime.initializeVendorWorkspaceTabs(root);
  assert.equal(tabs[2].getAttribute("aria-selected"), "true");
  assert.equal(tabs[2].tabIndex, 0);
  assert.equal(panels[2].hidden, false);
  assert.equal(focused, tabs[2]);

  tabs[0].emit("click");
  assert.equal(tabs[0].getAttribute("aria-selected"), "true");
  assert.equal(panels[0].hidden, false);

  tabs[0].emit("keydown", { key: "ArrowRight", preventDefault() {} });
  assert.equal(focused, tabs[1]);
  assert.equal(panels[1].hidden, false);
  tabs[1].emit("keydown", { key: "End", preventDefault() {} });
  assert.equal(focused, tabs[2]);
  tabs[2].emit("keydown", { key: "Home", preventDefault() {} });
  assert.equal(focused, tabs[0]);
  tabs[0].emit("keydown", { key: "ArrowLeft", preventDefault() {} });
  assert.equal(focused, tabs[2]);

  let prevented = false;
  links[1].emit("click", { preventDefault() { prevented = true; } });
  assert.equal(prevented, false);
  assert.equal(focused, tabs[1]);
  assert.equal(panels[1].hidden, false);

  view.location.hash = "#reviews";
  windowListeners.get("hashchange")?.();
  assert.equal(focused, tabs[2]);
  assert.equal(panels[2].hidden, false);
  assert.equal(runtime.resolveVendorWorkspaceTabForFragment("#records"), "contract");
  assert.equal(runtime.resolveVendorWorkspaceTabForFragment("#execution"), "construction");
  assert.equal(runtime.resolveVendorWorkspaceTabForFragment("#case-focus"), null);
});

test("vendor resource ownership matches the three governance panels", async () => {
  const html = await readFile(pagePath(workspaceDir, "code.html"), "utf8");
  const panel = (kind) => html.match(
    new RegExp(`<section class="vendor-workspace-panel"[^>]*data-vendor-workspace-panel="${kind}"[\\s\\S]*?<\\/section>`, "u"),
  )?.[0] ?? "";
  const resourceCodes = (source) => [...source.matchAll(/data-resource-code="([A-Z_]+)"/gu)]
    .map((match) => match[1]);

  assert.deepEqual(resourceCodes(panel("design")), []);
  assert.deepEqual(resourceCodes(panel("construction")), [
    "SCHEDULES",
    "EVIDENCE",
    "CHANGES",
    "ACCEPTANCE",
  ]);
  assert.deepEqual(resourceCodes(panel("contract")), [
    "CONTRACT_DRAFT_VERSIONS",
    "ATTACHMENTS",
    "PUBLIC_PCM_REVIEWS",
    "SUPPLEMENTS",
    "ADDENDA",
    "CASE_RECORDS",
  ]);
  assert.match(panel("contract"), /雙方確認狀態/u);
  assert.match(panel("contract"), /決策依據/u);
  assert.match(panel("contract"), /下一步責任人/u);
  assert.doesNotMatch(panel("contract"), /class="message-panel"/u);
  for (const fragment of ["documents", "execution", "reviews", "records"]) {
    assert.match(html, new RegExp(`id="${fragment}"`, "u"), fragment);
    assert.match(html, new RegExp(`data-vendor-workspace-route[^>]*href="#${fragment}"|href="#${fragment}"[^>]*data-vendor-workspace-route`, "u"), fragment);
  }
});

test("vendor governance dashboard lives inside the hero and only the first active tab joins its panel", async () => {
  const [html, css] = await Promise.all([
    readFile(pagePath(workspaceDir, "code.html"), "utf8"),
    readFile(pagePath(workspaceDir, "styles.css"), "utf8"),
  ]);

  const heroStart = html.indexOf('<section class="vendor-shell workspace-intro"');
  const dashboardStart = html.indexOf('data-layout="vendor-hero-dashboard"');
  const heroEnd = html.indexOf("</section>", dashboardStart);
  assert.ok(heroStart >= 0, "hero exists");
  assert.ok(dashboardStart > heroStart, "dashboard starts inside hero");
  assert.ok(heroEnd > dashboardStart, "dashboard remains inside the hero section");
  assert.match(html, /class="vendor-workspace"[^>]*data-layout="vendor-hero-workspace"/u);
  assert.doesNotMatch(html, /<section class="workspace-resources"/u);

  assert.match(
    css,
    /\.vendor-workspace:has\(#vendor-workspace-tab-design\[aria-selected="true"\]\)[\s\S]*?\.vendor-workspace-panel:not\(\[hidden\]\)[\s\S]*?margin-block-start:\s*0[\s\S]*?border-radius:\s*0\s+30px\s+30px\s+30px/u,
  );
  assert.match(
    css,
    /\.vendor-workspace:has\(#vendor-workspace-tab-design\[aria-selected="true"\]\)[\s\S]*?#vendor-workspace-tab-design[\s\S]*?border-radius:\s*22px\s+22px\s+0\s+0/u,
  );
  assert.match(
    css,
    /\.vendor-hero-dashboard\s+\.vendor-workspace-heading\s+h2\s*\{[\s\S]*?font-size:\s*clamp\(1\.5rem,\s*2\.3vw,\s*2\.2rem\)/u,
  );
  assert.match(
    css,
    /@media\s*\(max-width:\s*768px\)[\s\S]*?\.vendor-workspace-panel\s*\{[\s\S]*?margin-block-start:\s*10px[\s\S]*?border-radius:\s*22px/u,
  );
  assert.match(
    css,
    /@media\s*\(max-width:\s*768px\)[\s\S]*?#vendor-workspace-tab-design\s*\{[\s\S]*?border-radius:\s*16px/u,
  );
  assert.match(
    css,
    /@media\s*\(max-width:\s*1040px\)[\s\S]*?\.vendor-hero-dashboard\s+\.vendor-workspace\s*\{[\s\S]*?order:\s*1/u,
  );
  assert.match(
    css,
    /@media\s*\(min-width:\s*1041px\)[\s\S]*?\.workspace-intro__hero\s*\{[\s\S]*?align-items:\s*center[\s\S]*?gap:\s*clamp\(24px,\s*4vw,\s*48px\)/u,
  );
  assert.match(
    css,
    /@media\s*\(min-width:\s*1041px\)[\s\S]*?\.workspace-intro\s+h1\s*\{[\s\S]*?max-inline-size:\s*18ch[\s\S]*?font-size:\s*clamp\(2\.25rem,\s*3\.4vw,\s*3\.25rem\)/u,
  );
  assert.match(
    css,
    /@media\s*\(min-width:\s*1041px\)[\s\S]*?\.workspace-intro\s+\.vendor-focus-grid\s*\{[\s\S]*?margin-block-start:\s*12px[\s\S]*?\.vendor-hero-dashboard\s*\{[\s\S]*?margin-block-start:\s*16px/u,
  );
});

test("vendor dashboard keeps the work surface first and places a truthful LINE conversation rail on the right", async () => {
  const [html, css] = await Promise.all([
    readFile(pagePath(workspaceDir, "code.html"), "utf8"),
    readFile(pagePath(workspaceDir, "styles.css"), "utf8"),
  ]);

  const dashboardStart = html.indexOf('data-layout="vendor-hero-dashboard"');
  const workspaceStart = html.indexOf('data-layout="vendor-hero-workspace"', dashboardStart);
  const conversationStart = html.indexOf('data-layout="vendor-line-conversation"', dashboardStart);
  assert.ok(dashboardStart >= 0, "vendor hero dashboard exists");
  assert.ok(workspaceStart > dashboardStart, "vendor workspace is inside the dashboard");
  assert.ok(conversationStart > workspaceStart, "LINE conversation follows the dashboard in reading order");

  assert.match(html, /data-layout="vendor-line-conversation"[^>]*aria-label="案件 LINE 對話"/u);
  assert.match(html, /尚未連結案件對話/u);
  assert.match(html, /目前沒有可顯示的對話/u);
  assert.match(html, /<textarea[^>]*disabled[^>]*aria-disabled="true"/u);
  assert.match(html, /<button[^>]*data-line-send[^>]*disabled[^>]*aria-disabled="true"/u);
  assert.doesNotMatch(html, /訊息已送出|已傳送訊息/u);

  assert.match(
    css,
    /\.vendor-app\s*\{[\s\S]{0,260}grid-template-columns:\s*minmax\(0,\s*1fr\)\s+minmax\(260px,\s*320px\)/u,
  );
  assert.match(
    css,
    /@media\s*\(max-width:\s*1040px\)[\s\S]*?\.vendor-hero-dashboard\s+\.vendor-workspace\s*\{[\s\S]{0,100}order:\s*1[\s\S]*?\.vendor-hero-dashboard\s+\.case-sidebar\s*\{[\s\S]{0,100}order:\s*2/u,
  );
});

test("all visible write controls stay disabled and browser-derived authority is absent", async () => {
  for (const directory of [invitationDir, workspaceDir]) {
    const [html, runtime] = await Promise.all([
      readFile(pagePath(directory, "code.html"), "utf8"),
      readFile(pagePath(directory, "app.js"), "utf8"),
    ]);
    const controls = html.match(/<(?:button|input|textarea|select)\b[^>]*\bdata-write-action\b[^>]*>/giu) ?? [];
    assert.ok(controls.length > 0, directory);
    for (const control of controls) {
      assert.match(control, /\bdisabled\b/iu, control);
      assert.match(control, /\baria-disabled="true"/iu, control);
    }
    assert.doesNotMatch(
      runtime,
      /\b(?:fetch|XMLHttpRequest|WebSocket|EventSource|localStorage|sessionStorage|indexedDB|URLSearchParams)\b|location\.(?:search|hash)|document\.cookie/iu,
      directory,
    );
    assert.doesNotMatch(runtime, /\.innerHTML\s*=|insertAdjacentHTML|eval\s*\(/iu, directory);
  }
});

test("local references language UTF-8 and accessibility source stay bounded", async () => {
  const forbiddenVisibleLanguage = /招標|投標|競標|媒合|最低價|金流託管|支付託管|代收代付|付款保障|老屋投資|投資報酬|翻修獲利|裝修理財|raw JSON|stack trace|debug|mock-only|無 DB 寫入|API 未開|404/iu;
  for (const directory of [invitationDir, workspaceDir]) {
    const [htmlBytes, css] = await Promise.all([
      readFile(pagePath(directory, "code.html")),
      readFile(pagePath(directory, "styles.css"), "utf8"),
    ]);
    const html = new TextDecoder("utf-8", { fatal: true }).decode(htmlBytes);
    assert.doesNotMatch(visibleText(html), forbiddenVisibleLanguage, directory);
    assert.match(css, /:focus-visible/iu, directory);
    assert.match(css, /min-(?:block-)?size:\s*(?:var\([^)]*44|44px)|--[^:]+:\s*44px/iu, directory);
    assert.match(css, /@media\s*\(max-width:\s*768px\)/iu, directory);
    assert.match(css, /@media\s*\(max-width:\s*420px\)/iu, directory);
    assert.match(css, /@media\s*\(prefers-reduced-motion:\s*reduce\)/iu, directory);
    assert.match(css, /overflow-x:\s*(?:clip|hidden)/iu, directory);
    await assertLocalReferences(directory);
    execFileSync(process.execPath, ["--check", pagePath(directory, "app.js")], {
      cwd: repositoryRoot,
      stdio: "pipe",
    });
  }
});
