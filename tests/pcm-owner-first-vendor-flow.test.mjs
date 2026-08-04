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
