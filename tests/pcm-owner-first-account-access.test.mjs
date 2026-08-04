import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { readFile, readdir } from "node:fs/promises";
import test from "node:test";

const repositoryRoot = new URL("../", import.meta.url);
const pcmRoot = new URL(
  "src/stitch_laibe_landing_onboarding/pcm_standalone/",
  repositoryRoot,
);
const accountAccessRoot = new URL("account_access/", pcmRoot);
const htmlUrl = new URL("code.html", accountAccessRoot);
const cssUrl = new URL("styles.css", accountAccessRoot);
const appUrl = new URL("app.js", accountAccessRoot);
const routeManifestUrl = new URL("public/pcm-flow-route-manifest.js", pcmRoot);

const expectedRecoveryRecords = [
  {
    code: "IDENTITY_UNCONFIRMED",
    title: "身分無法確認",
    reason: "目前無法確認使用者是不是帳號本人。",
    nextAction: "重新確認使用的 Email 與正式通知是否一致。",
    responsibleRole: "目前使用者",
    recoveryPath: "回到共用入口重新確認；仍無法處理時，安全返回 PCM 首頁。",
  },
  {
    code: "MEMBERSHIP_UNCONFIRMED",
    title: "案件成員無法確認",
    reason: "帳號目前無法證明是該案件的成員。",
    nextAction: "確認登入帳號與案件邀請使用的是同一個 Email。",
    responsibleRole: "目前使用者",
    recoveryPath: "回到共用入口等待案件成員確認；案件仍不顯示時，安全返回 PCM 首頁。",
  },
  {
    code: "VENDOR_INVITATION_DECLINED",
    title: "邀請已拒絕",
    reason: "乙方已婉拒這次案件邀請。",
    nextAction: "甲方決定是否改邀其他乙方，或先保留目前安排。",
    responsibleRole: "甲方",
    recoveryPath: "乙方目前不需處理；甲方待案件服務開放後重新安排，或安全返回 PCM 首頁。",
  },
  {
    code: "VENDOR_INVITATION_EXPIRED",
    title: "邀請已逾期",
    reason: "原邀請已超過可使用期間，不能繼續確認。",
    nextAction: "甲方重新確認合作對象與聯絡資料。",
    responsibleRole: "甲方",
    recoveryPath: "正式服務開放後由甲方送出新邀請；現在先安全返回 PCM 首頁。",
  },
  {
    code: "VENDOR_INVITATION_WITHDRAWN",
    title: "邀請已撤回",
    reason: "甲方已收回這次案件邀請。",
    nextAction: "乙方不需重複嘗試；由甲方決定是否再次邀請。",
    responsibleRole: "甲方",
    recoveryPath: "等待甲方的新通知；未收到前，安全返回 PCM 首頁。",
  },
  {
    code: "VENDOR_INVITATION_RESEND_REQUIRED",
    title: "邀請需要重發",
    reason: "原邀請資料不完整或已不能繼續使用。",
    nextAction: "甲方確認乙方 Email 後，重新送出案件邀請。",
    responsibleRole: "甲方",
    recoveryPath: "乙方等待新邀請；新通知尚未送達前，安全返回 PCM 首頁。",
  },
  {
    code: "PERMISSION_UNCONFIRMED",
    title: "案件權限無法確認",
    reason: "目前無法確認這個帳號可以查看或處理哪些案件內容。",
    nextAction: "請甲方確認邀請對象與預計開放的案件範圍。",
    responsibleRole: "甲方",
    recoveryPath: "等待甲方完成權限確認；確認前不顯示案件內容，並可安全返回 PCM 首頁。",
  },
];

async function readSource(url) {
  if (!existsSync(url)) return "";
  return readFile(url, "utf8");
}

async function accountAccessFiles() {
  if (!existsSync(accountAccessRoot)) return [];
  return (await readdir(accountAccessRoot)).sort();
}

function visibleText(html) {
  return html
    .replace(/<script\b[\s\S]*?<\/script>/giu, " ")
    .replace(/<style\b[\s\S]*?<\/style>/giu, " ")
    .replace(/<[^>]+>/gu, " ")
    .replace(/\s+/gu, " ")
    .trim();
}

function restoreDescriptor(target, key, descriptor) {
  if (descriptor) {
    Object.defineProperty(target, key, descriptor);
  } else {
    delete target[key];
  }
}

test("account access starts as one exact three-file source package", async () => {
  assert.deepEqual(await accountAccessFiles(), ["app.js", "code.html", "styles.css"]);
});

test("first screen names the shared roles and exposes the five decision facts", async () => {
  const html = await readSource(htmlUrl);

  assert.match(html, /<html\s+lang="zh-Hant-TW"/u);
  assert.match(html, /<body[^>]+data-view-state="CONTEXT_UNAVAILABLE"/u);
  assert.match(html, /甲方與乙方，共用註冊／登入入口/u);
  assert.match(html, /帳號與契約服務尚未確認/u);

  const factRows = html.match(/data-owner-fact(?:\s|>)/gu) ?? [];
  assert.equal(factRows.length, 5);
  for (const label of [
    "角色",
    "帳號／契約服務",
    "案件狀態",
    "下一步／責任人",
    "最近紀錄",
  ]) {
    assert.match(html, new RegExp(label, "u"));
  }

  assert.match(html, /甲方與乙方/u);
  assert.match(html, /尚未取得案件資料/u);
  assert.match(html, /目前使用者/u);
  assert.match(html, /尚無可顯示紀錄/u);
});

test("the only primary CTA returns safely to the PCM homepage", async () => {
  const html = await readSource(htmlUrl);
  const primaryActions = html.match(/<a\b[^>]*data-primary-action[^>]*>/gu) ?? [];

  assert.equal(primaryActions.length, 1);
  assert.match(primaryActions[0], /href="\.\.\/public_home\/code\.html#top"/u);
  assert.match(html, />安全返回 PCM 首頁<\/a>/u);
  assert.doesNotMatch(html, /href=(?:""|'')/u);
  assert.doesNotMatch(html, /href="#"/u);
});

test("registration and sign-in preserve form semantics while every account write stays disabled", async () => {
  const html = await readSource(htmlUrl);

  assert.match(html, /<form[^>]+data-access-form="registration"/u);
  assert.match(html, /<form[^>]+data-access-form="login"/u);
  assert.match(html, /name="contact_name"[^>]+autocomplete="name"[^>]+disabled/u);
  assert.match(html, /name="registration_email"[^>]+type="email"[^>]+autocomplete="email"[^>]+disabled/u);
  assert.match(html, /name="registration_password"[^>]+type="password"[^>]+autocomplete="new-password"[^>]+disabled/u);
  assert.match(html, /name="login_email"[^>]+type="email"[^>]+autocomplete="email"[^>]+disabled/u);
  assert.match(html, /name="login_password"[^>]+type="password"[^>]+autocomplete="current-password"[^>]+disabled/u);
  assert.match(html, /data-mode-control="registration"/u);
  assert.match(html, /data-mode-control="login"/u);

  const writeControls = html.match(/<(?:input|button)\b[^>]*data-write-action[^>]*>/gu) ?? [];
  assert.ok(writeControls.length >= 7);
  for (const control of writeControls) {
    assert.match(control, /\sdisabled(?:\s|>|=)/u);
    assert.match(control, /aria-disabled="true"/u);
  }

  assert.match(html, /目前不會送出或保存帳號資料/u);
  assert.match(html, /正式開放後/u);
});

test("owner and invited-vendor guides describe future direction without granting identity", async () => {
  const html = await readSource(htmlUrl);

  assert.match(html, /data-role-guide="owner"/u);
  assert.match(html, /data-role-guide="vendor"/u);
  assert.match(html, /只說明未來去向，不會設定你的身分/u);
  assert.match(html, /甲方完成身分確認後，仍要另行確認案件建立條件/u);
  assert.match(html, /乙方須先收到甲方邀請/u);
  assert.match(html, /案件成員與權限確認後/u);
  assert.doesNotMatch(html, /name="(?:role|identity|case_id)"/u);
  assert.doesNotMatch(html, /data-(?:authorized|authenticated|case-id)=/u);
});

test("all required recovery outcomes state reason next actor and recovery path", async () => {
  const html = await readSource(htmlUrl);
  const recoveryRows = html.match(/data-recovery-code="[A-Z_]+"/gu) ?? [];

  assert.equal(recoveryRows.length, expectedRecoveryRecords.length);
  for (const record of expectedRecoveryRecords) {
    assert.match(html, new RegExp(`data-recovery-code="${record.code}"`, "u"));
    for (const field of [
      record.title,
      record.reason,
      record.nextAction,
      record.responsibleRole,
      record.recoveryPath,
    ]) {
      assert.ok(html.includes(field), `${record.code} missing exact copy: ${field}`);
    }
  }

  assert.match(html, /身分無法確認/u);
  assert.match(html, /案件成員無法確認/u);
  assert.match(html, /案件權限無法確認/u);
  assert.doesNotMatch(html, /案件成員／權限無法確認/u);
  assert.match(html, /邀請已拒絕/u);
  assert.match(html, /邀請已逾期/u);
  assert.match(html, /邀請已撤回/u);
  assert.match(html, /邀請需要重發/u);
  assert.equal((html.match(/<dt>原因<\/dt>/gu) ?? []).length, 7);
  assert.equal((html.match(/<dt>下一步<\/dt>/gu) ?? []).length, 7);
  assert.equal((html.match(/<dt>責任人<\/dt>/gu) ?? []).length, 7);
  assert.equal((html.match(/<dt>恢復路徑<\/dt>/gu) ?? []).length, 7);
  assert.match(html, /安全返回 PCM 首頁/u);
});

test("visible copy stays in product language and excludes forbidden business promises", async () => {
  const html = await readSource(htmlUrl);
  const text = visibleText(html);

  for (const forbidden of [
    "媒合",
    "競標",
    "投標",
    "發案",
    "接案",
    "金流",
    "託管",
    "代收",
    "代付",
    "老屋投資",
    "投資報酬",
    "保證最低",
    "保證零風險",
    "Supabase",
    "raw JSON",
    "stack trace",
    "debug",
    "mock-only",
    "API 未開",
    "DB",
  ]) {
    assert.doesNotMatch(text, new RegExp(forbidden, "iu"));
  }
});

test("runtime exports immutable zero-authority account and recovery states", async () => {
  assert.ok(existsSync(appUrl), "account access runtime must exist");
  const module = await import(`${appUrl.href}?immutable=${Date.now()}`);

  assert.equal(module.CONTEXT_UNAVAILABLE.code, "CONTEXT_UNAVAILABLE");
  assert.equal(module.CONTEXT_UNAVAILABLE.caseData, null);
  assert.equal(module.CONTEXT_UNAVAILABLE.payload, null);
  assert.equal(module.CONTEXT_UNAVAILABLE.mutationAllowed, false);
  assert.equal(module.CONTEXT_UNAVAILABLE.writeActionsEnabled, false);
  assert.equal(module.CONTEXT_UNAVAILABLE.actions.length, 0);
  assert.ok(Object.isFrozen(module.CONTEXT_UNAVAILABLE));
  assert.ok(Object.isFrozen(module.CONTEXT_UNAVAILABLE.actions));
  assert.ok(Object.isFrozen(module.ACCOUNT_ACCESS_FAILURES));
  assert.ok(Object.isFrozen(module.ACCOUNT_ACCESS_GUIDES));

  const expectedCodes = expectedRecoveryRecords.map((record) => record.code);

  assert.deepEqual(Object.keys(module.ACCOUNT_ACCESS_FAILURES), expectedCodes);
  for (const record of expectedRecoveryRecords) {
    const failure = module.ACCOUNT_ACCESS_FAILURES[record.code];
    assert.equal(failure.code, record.code);
    assert.equal(failure.title, record.title);
    assert.equal(failure.reason, record.reason);
    assert.equal(failure.nextAction, record.nextAction);
    assert.equal(failure.responsibleRole, record.responsibleRole);
    assert.equal(failure.recoveryPath, record.recoveryPath);
    assert.equal(failure.caseData, null);
    assert.equal(failure.payload, null);
    assert.equal(failure.mutationAllowed, false);
    assert.equal(failure.writeActionsEnabled, false);
    assert.equal(failure.actions.length, 0);
    assert.ok(Object.isFrozen(failure));
    assert.ok(Object.isFrozen(failure.actions));
  }
});

test("zero-authority actions reject post-load array slot and iterator injection", async () => {
  const module = await import(`${appUrl.href}?zero-actions-pollution=${Date.now()}`);
  const actions = module.CONTEXT_UNAVAILABLE.actions;
  const indexDescriptor = Object.getOwnPropertyDescriptor(Array.prototype, "0");
  const iteratorDescriptor = Object.getOwnPropertyDescriptor(
    Array.prototype,
    Symbol.iterator,
  );
  const injectedAction = { action: "INJECTED_WRITE", enabled: true };
  const observations = Object.create(null);

  for (const failure of Object.values(module.ACCOUNT_ACCESS_FAILURES)) {
    assert.equal(failure.actions, actions);
  }

  try {
    Object.defineProperty(Array.prototype, "0", {
      configurable: true,
      value: injectedAction,
    });
    Object.defineProperty(Array.prototype, Symbol.iterator, {
      configurable: true,
      value: function* pollutedArrayIterator() {
        yield injectedAction;
      },
    });

    observations.prototype = Object.getPrototypeOf(actions);
    observations.index = actions[0];
    observations.spread = [...actions];
  } finally {
    restoreDescriptor(Array.prototype, "0", indexDescriptor);
    restoreDescriptor(Array.prototype, Symbol.iterator, iteratorDescriptor);
  }

  assert.equal(observations.prototype, null);
  assert.equal(observations.index, undefined);
  assert.deepEqual(observations.spread, []);
});

test("context authority ignores caller values getters proxies and inherited assertions", async () => {
  assert.ok(existsSync(appUrl), "account access runtime must exist");
  const module = await import(`${appUrl.href}?authority=${Date.now()}`);
  let getterCalls = 0;
  let proxyCalls = 0;
  const accessor = {};
  Object.defineProperty(accessor, "code", {
    get() {
      getterCalls += 1;
      throw new Error("must not be read");
    },
  });
  const proxy = new Proxy({}, {
    get() {
      proxyCalls += 1;
      throw new Error("must not be read");
    },
  });
  const revoked = Proxy.revocable({}, {});
  revoked.revoke();

  for (const input of [
    undefined,
    null,
    {},
    { code: "AUTHORIZED" },
    Object.create({ code: "AUTHORIZED" }),
    accessor,
    proxy,
    revoked.proxy,
  ]) {
    assert.equal(module.resolveAccountAccessState(input), module.CONTEXT_UNAVAILABLE);
  }

  assert.equal(getterCalls, 0);
  assert.equal(proxyCalls, 0);
  assert.equal(
    module.resolveAccountAccessFailure({ code: "IDENTITY_UNCONFIRMED" }),
    module.CONTEXT_UNAVAILABLE,
  );
  assert.equal(
    module.resolveAccountAccessFailure("IDENTITY_UNCONFIRMED"),
    module.ACCOUNT_ACCESS_FAILURES.IDENTITY_UNCONFIRMED,
  );
  assert.equal(
    module.resolveAccountAccessFailure("PERMISSION_UNCONFIRMED"),
    module.ACCOUNT_ACCESS_FAILURES.PERMISSION_UNCONFIRMED,
  );
  assert.equal(module.resolveAccountAccessFailure("UNKNOWN"), module.CONTEXT_UNAVAILABLE);
  assert.equal(module.resolveAccountAccessFailure(revoked.proxy), module.CONTEXT_UNAVAILABLE);
});

test("state and recovery resolution remain closed after shared intrinsic pollution", async () => {
  assert.ok(existsSync(appUrl), "account access runtime must exist");
  const module = await import(`${appUrl.href}?pollution=${Date.now()}`);
  const codeDescriptor = Object.getOwnPropertyDescriptor(Object.prototype, "code");
  const stateDescriptor = Object.getOwnPropertyDescriptor(Object.prototype, "state");
  const iteratorDescriptor = Object.getOwnPropertyDescriptor(Array.prototype, Symbol.iterator);
  let stateResult;
  let failureResult;

  try {
    Object.defineProperty(Object.prototype, "code", {
      configurable: true,
      value: "VENDOR_INVITATION_DECLINED",
    });
    Object.defineProperty(Object.prototype, "state", {
      configurable: true,
      get() {
        throw new Error("polluted state getter");
      },
    });
    Object.defineProperty(Array.prototype, Symbol.iterator, {
      configurable: true,
      value() {
        throw new Error("polluted iterator");
      },
    });
    stateResult = module.resolveAccountAccessState({});
    failureResult = module.resolveAccountAccessFailure({});
  } finally {
    restoreDescriptor(Object.prototype, "code", codeDescriptor);
    restoreDescriptor(Object.prototype, "state", stateDescriptor);
    restoreDescriptor(Array.prototype, Symbol.iterator, iteratorDescriptor);
  }

  assert.equal(stateResult, module.CONTEXT_UNAVAILABLE);
  assert.equal(failureResult, module.CONTEXT_UNAVAILABLE);
});

test("initialization reinforces the closed DOM and never leaks raw exceptions", async () => {
  assert.ok(existsSync(appUrl), "account access runtime must exist");
  const module = await import(`${appUrl.href}?dom=${Date.now()}`);
  const bodyAttributes = Object.create(null);
  const writeAttributes = Object.create(null);
  const writeControl = {
    disabled: false,
    setAttribute(name, value) {
      writeAttributes[name] = value;
    },
  };
  const root = {
    body: {
      setAttribute(name, value) {
        bodyAttributes[name] = value;
      },
    },
    documentElement: { dataset: {} },
    querySelector() {
      return null;
    },
    querySelectorAll(selector) {
      return selector === "[data-write-action]" ? [writeControl] : [];
    },
  };

  assert.equal(module.initializeAccountAccess(root), module.CONTEXT_UNAVAILABLE);
  assert.equal(bodyAttributes["data-view-state"], "CONTEXT_UNAVAILABLE");
  assert.equal(root.documentElement.dataset.viewState, "CONTEXT_UNAVAILABLE");
  assert.equal(writeControl.disabled, true);
  assert.equal(writeAttributes["aria-disabled"], "true");

  const hostileRoot = new Proxy({}, {
    get() {
      throw new Error("hostile DOM boundary");
    },
  });
  assert.doesNotThrow(() => module.initializeAccountAccess(hostileRoot));
  assert.equal(module.initializeAccountAccess(hostileRoot), module.CONTEXT_UNAVAILABLE);
});

test("module import contains a throwing global document accessor", async () => {
  const documentDescriptor = Object.getOwnPropertyDescriptor(globalThis, "document");

  try {
    Object.defineProperty(globalThis, "document", {
      configurable: true,
      get() {
        throw new Error("global document must stay contained");
      },
    });

    let module;
    await assert.doesNotReject(async () => {
      module = await import(`${appUrl.href}?throwing-document=${Date.now()}`);
    });
    assert.equal(module.initializeAccountAccess(), module.CONTEXT_UNAVAILABLE);
  } finally {
    restoreDescriptor(globalThis, "document", documentDescriptor);
  }
});

test("no-argument initialization fails closed for missing inherited and accessor documents", async () => {
  assert.ok(existsSync(appUrl), "account access runtime must exist");
  const module = await import(`${appUrl.href}?safe-global-document=${Date.now()}`);
  const documentDescriptor = Object.getOwnPropertyDescriptor(globalThis, "document");
  const globalPrototype = Object.getPrototypeOf(globalThis);
  const inheritedDescriptor = Object.getOwnPropertyDescriptor(globalPrototype, "document");

  try {
    delete globalThis.document;
    delete globalPrototype.document;
    assert.equal(module.initializeAccountAccess(), module.CONTEXT_UNAVAILABLE);

    Object.defineProperty(globalThis, "document", {
      configurable: true,
      get() {
        throw new Error("own document accessor must stay contained");
      },
    });
    assert.doesNotThrow(() => module.initializeAccountAccess());
    assert.equal(module.initializeAccountAccess(), module.CONTEXT_UNAVAILABLE);

    delete globalThis.document;
    Object.defineProperty(globalPrototype, "document", {
      configurable: true,
      get() {
        throw new Error("inherited document accessor must not run");
      },
    });
    assert.doesNotThrow(() => module.initializeAccountAccess());
    assert.equal(module.initializeAccountAccess(), module.CONTEXT_UNAVAILABLE);
  } finally {
    restoreDescriptor(globalThis, "document", documentDescriptor);
    restoreDescriptor(globalPrototype, "document", inheritedDescriptor);
  }
});

function makeWriteControl() {
  const attributes = Object.create(null);
  return {
    attributes,
    disabled: false,
    setAttribute(name, value) {
      attributes[name] = value;
    },
  };
}

function makeCollectionRoot(collection) {
  return {
    body: { setAttribute() {} },
    documentElement: { dataset: {} },
    querySelector() {
      return null;
    },
    querySelectorAll(selector) {
      return selector === "[data-write-action]" ? collection : [];
    },
  };
}

function makeEventLifecycleHarness() {
  const listeners = Object.create(null);
  const makeEventNode = (name) => ({
    attributes: Object.create(null),
    hidden: false,
    textContent: "",
    addEventListener(type, listener) {
      listeners[`${name}:${type}`] = listener;
    },
    setAttribute(attribute, value) {
      this.attributes[attribute] = value;
    },
  });

  const fixedEntries = [
    ["#contact-name[data-write-action]", makeWriteControl()],
    ["#registration-email[data-write-action]", makeWriteControl()],
    ["#registration-password[data-write-action]", makeWriteControl()],
    ['#registration-form > button[type="submit"][data-write-action]', makeWriteControl()],
    ["#login-email[data-write-action]", makeWriteControl()],
    ["#login-password[data-write-action]", makeWriteControl()],
    ['#login-form > button[type="submit"][data-write-action]', makeWriteControl()],
  ];
  const fixedBySelector = Object.fromEntries(fixedEntries);
  const fixedControls = fixedEntries.map(([, control]) => control);
  const eventNodes = {
    registrationMode: makeEventNode("registrationMode"),
    loginMode: makeEventNode("loginMode"),
    ownerGuide: makeEventNode("ownerGuide"),
    vendorGuide: makeEventNode("vendorGuide"),
    registrationForm: makeEventNode("registrationForm"),
    loginForm: makeEventNode("loginForm"),
  };
  const auxiliaryNodes = {
    note: makeEventNode("note"),
    live: makeEventNode("live"),
    guideStatus: makeEventNode("guideStatus"),
    guideTitle: makeEventNode("guideTitle"),
    guideCopy: makeEventNode("guideCopy"),
    guideNext: makeEventNode("guideNext"),
  };
  const nodes = {
    ...fixedBySelector,
    '[data-mode-control="registration"]': eventNodes.registrationMode,
    '[data-mode-control="login"]': eventNodes.loginMode,
    '[data-role-guide="owner"]': eventNodes.ownerGuide,
    '[data-role-guide="vendor"]': eventNodes.vendorGuide,
    '[data-access-form="registration"]': eventNodes.registrationForm,
    '[data-access-form="login"]': eventNodes.loginForm,
    "[data-account-mode-note]": auxiliaryNodes.note,
    "[data-account-live]": auxiliaryNodes.live,
    "[data-guide-status]": auxiliaryNodes.guideStatus,
    "[data-guide-title]": auxiliaryNodes.guideTitle,
    "[data-guide-copy]": auxiliaryNodes.guideCopy,
    "[data-guide-next]": auxiliaryNodes.guideNext,
  };
  const root = {
    body: { setAttribute() {} },
    documentElement: { dataset: {} },
    querySelector(selector) {
      return nodes[selector] ?? null;
    },
    querySelectorAll() {
      return [];
    },
  };
  const reopenAll = () => {
    for (const control of fixedControls) {
      control.disabled = false;
      delete control.attributes["aria-disabled"];
    }
  };

  return { eventNodes, fixedControls, listeners, reopenAll, root };
}

function hostileCollection(kind, reopenAll) {
  if (kind === "unavailable") return null;
  if (kind === "throw") {
    return () => {
      reopenAll();
      throw new Error("collection lookup unavailable");
    };
  }
  if (kind === "slot0") {
    const collection = new Proxy({ length: 1 }, {
      get(target, key) {
        if (key === "0") reopenAll();
        return target[key];
      },
    });
    return () => collection;
  }
  if (kind === "slot63") {
    const collection = new Proxy({ length: Number.MAX_SAFE_INTEGER }, {
      get(target, key) {
        if (key === "63") reopenAll();
        return target[key];
      },
    });
    return () => collection;
  }
  if (kind === "lengthThrow") {
    const collection = new Proxy({}, {
      get(target, key) {
        if (key === "length") throw new Error("hostile length");
        if (key === "0") reopenAll();
        return target[key];
      },
    });
    return () => collection;
  }

  const collection = { length: 64 };
  Object.defineProperty(collection, "63", {
    get() {
      reopenAll();
      return null;
    },
  });
  return () => collection;
}

test("one hostile collection slot cannot skip a later write control", async () => {
  const module = await import(`${appUrl.href}?slot-isolation=${Date.now()}`);
  const tailControl = makeWriteControl();
  const collection = new Proxy({ length: 4, 3: tailControl }, {
    get(target, key) {
      if (key === "1") throw new Error("hostile collection slot");
      return target[key];
    },
  });

  assert.doesNotThrow(() => module.initializeAccountAccess(makeCollectionRoot(collection)));
  assert.equal(tailControl.disabled, true);
  assert.equal(tailControl.attributes["aria-disabled"], "true");
});

test("throwing collection length still receives a bounded fail-closed scan", async () => {
  const module = await import(`${appUrl.href}?length-isolation=${Date.now()}`);
  const tailControl = makeWriteControl();
  const collection = new Proxy({ 5: tailControl }, {
    get(target, key) {
      if (key === "length") throw new Error("hostile collection length");
      return target[key];
    },
  });

  assert.doesNotThrow(() => module.initializeAccountAccess(makeCollectionRoot(collection)));
  assert.equal(tailControl.disabled, true);
  assert.equal(tailControl.attributes["aria-disabled"], "true");
});

test("sparse and oversized collections stay bounded while closing reachable controls", async () => {
  const module = await import(`${appUrl.href}?bounded-collection=${Date.now()}`);
  const sparseTail = makeWriteControl();
  const oversizedTail = makeWriteControl();
  let highestIndexRead = -1;
  const sparseCollection = { length: 6, 5: sparseTail };
  const oversizedCollection = new Proxy({ 63: oversizedTail }, {
    get(target, key) {
      if (key === "length") return 1000000;
      if (/^\d+$/u.test(String(key))) {
        highestIndexRead = Math.max(highestIndexRead, Number(key));
      }
      return target[key];
    },
  });

  assert.doesNotThrow(() => module.initializeAccountAccess(makeCollectionRoot(sparseCollection)));
  assert.doesNotThrow(() => module.initializeAccountAccess(makeCollectionRoot(oversizedCollection)));
  assert.equal(sparseTail.disabled, true);
  assert.equal(sparseTail.attributes["aria-disabled"], "true");
  assert.equal(oversizedTail.disabled, true);
  assert.equal(oversizedTail.attributes["aria-disabled"], "true");
  assert.equal(highestIndexRead, 63);
});

test("arbitrary oversized collections close every fixed write control without unbounded scanning", async () => {
  const module = await import(`${appUrl.href}?fixed-control-identity=${Date.now()}`);
  const controlsBySelector = Object.create(null);
  const fixedControlEntries = [
    ["#contact-name[data-write-action]", makeWriteControl()],
    ["#registration-email[data-write-action]", makeWriteControl()],
    ["#registration-password[data-write-action]", makeWriteControl()],
    ['#registration-form > button[type="submit"][data-write-action]', makeWriteControl()],
    ["#login-email[data-write-action]", makeWriteControl()],
    ["#login-password[data-write-action]", makeWriteControl()],
    ['#login-form > button[type="submit"][data-write-action]', makeWriteControl()],
  ];
  let highestIndexRead = -1;
  const collectionTarget = { length: Number.MAX_SAFE_INTEGER };

  for (let index = 0; index < fixedControlEntries.length; index += 1) {
    const [selector, control] = fixedControlEntries[index];
    controlsBySelector[selector] = control;
    collectionTarget[index + 64] = control;
  }

  const oversizedCollection = new Proxy(collectionTarget, {
    get(target, key) {
      if (/^\d+$/u.test(String(key))) {
        highestIndexRead = Math.max(highestIndexRead, Number(key));
      }
      return target[key];
    },
  });
  const root = makeCollectionRoot(oversizedCollection);
  root.querySelector = (selector) => controlsBySelector[selector] ?? null;

  assert.doesNotThrow(() => module.initializeAccountAccess(root));
  assert.equal(highestIndexRead, 63);
  for (const [, control] of fixedControlEntries) {
    assert.equal(control.disabled, true);
    assert.equal(control.attributes["aria-disabled"], "true");
  }
});

test("captured fixed write control stays closed after scan breaks selector lookup", async () => {
  const module = await import(`${appUrl.href}?collection-side-effect=${Date.now()}`);
  const control = makeWriteControl();
  let selectorAvailable = true;
  let highestIndexRead = -1;
  const collection = new Proxy({ length: Number.MAX_SAFE_INTEGER }, {
    get(target, key) {
      if (/^\d+$/u.test(String(key))) {
        highestIndexRead = Math.max(highestIndexRead, Number(key));
      }
      if (key === "0") {
        control.disabled = false;
        delete control.attributes["aria-disabled"];
        selectorAvailable = false;
      }
      return target[key];
    },
  });
  const root = makeCollectionRoot(collection);
  root.querySelector = (selector) => {
    if (!selectorAvailable) throw new Error("selector lookup unavailable after scan");
    return selector === "#contact-name[data-write-action]" ? control : null;
  };

  assert.doesNotThrow(() => module.initializeAccountAccess(root));
  assert.equal(highestIndexRead, 63);
  assert.equal(control.disabled, true);
  assert.equal(control.attributes["aria-disabled"], "true");
});

test("all six post-initialization handlers finally close the captured control identities", async () => {
  const module = await import(`${appUrl.href}?event-lifecycle=${Date.now()}`);
  const harness = makeEventLifecycleHarness();
  assert.doesNotThrow(() => module.initializeAccountAccess(harness.root));

  const cases = [
    ["registrationMode:click", "throw", "slot0", false],
    ["loginMode:click", "unavailable", "slot63", false],
    ["ownerGuide:click", "throw", "lengthThrow", false],
    ["vendorGuide:click", "unavailable", "sparse", false],
    ["registrationForm:submit", "throw", "throw", true],
    ["loginForm:submit", "unavailable", "unavailable", true],
  ];

  for (const [listenerKey, selectorMode, collectionMode, isSubmit] of cases) {
    const listener = harness.listeners[listenerKey];
    assert.equal(typeof listener, "function", listenerKey);
    harness.reopenAll();

    if (selectorMode === "throw") {
      harness.root.querySelector = () => {
        harness.reopenAll();
        throw new Error("selector lookup unavailable after initialization");
      };
    } else {
      harness.root.querySelector = null;
    }
    harness.root.querySelectorAll = hostileCollection(
      collectionMode,
      harness.reopenAll,
    );

    let prevented = 0;
    const event = {
      preventDefault() {
        prevented += 1;
      },
    };
    assert.doesNotThrow(() => listener(event), listenerKey);
    assert.equal(prevented, isSubmit ? 1 : 0, `${listenerKey} preventDefault`);
    for (const control of harness.fixedControls) {
      assert.equal(control.disabled, true, `${listenerKey} disabled`);
      assert.equal(
        control.attributes["aria-disabled"],
        "true",
        `${listenerKey} aria-disabled`,
      );
    }
  }
});

test("runtime has no browser-derived authority persistence network or raw error channel", async () => {
  const source = await readSource(appUrl);

  assert.doesNotMatch(source, /initializeAccountAccess\s*\(\s*root\s*=\s*globalThis\.document/u);
  assert.doesNotMatch(source, /\bglobalThis\.document\b/u);
  assert.doesNotMatch(source, /\btypeof\s+document\b/u);

  for (const forbidden of [
    /location(?:\.|\[)/u,
    /URLSearchParams/u,
    /localStorage/u,
    /sessionStorage/u,
    /document\.cookie/u,
    /indexedDB/u,
    /\bfetch\s*\(/u,
    /XMLHttpRequest/u,
    /WebSocket/u,
    /innerHTML/u,
    /outerHTML/u,
    /insertAdjacentHTML/u,
    /console\./u,
    /\beval\s*\(/u,
    /new\s+Function/u,
  ]) {
    assert.doesNotMatch(source, forbidden);
  }
});

test("layout covers all requested responsive accessibility and short-screen floors", async () => {
  const css = await readSource(cssUrl);

  assert.match(css, /overflow-x:\s*(?:clip|hidden)/u);
  assert.match(css, /min-(?:block-)?size:\s*(?:var\(--owner-first-control-min\)|44px)/u);
  assert.match(css, /:focus-visible/u);
  assert.match(css, /@media\s*\(max-width:\s*900px\)/u);
  assert.match(css, /@media\s*\(max-width:\s*680px\)/u);
  assert.match(css, /@media\s*\(max-width:\s*420px\)/u);
  assert.match(css, /max-height:\s*700px/u);
  assert.match(css, /prefers-reduced-motion:\s*reduce/u);
  assert.match(css, /grid-template-columns/u);
  assert.match(css, /text-wrap:\s*pretty/u);
  assert.match(
    css,
    /details\[data-recovery-code="PERMISSION_UNCONFIRMED"\]\s*\{[^}]*grid-column:\s*1\s*\/\s*-1/su,
  );
});

test("all local page resources links and fragments resolve without external requests", async () => {
  const html = await readSource(htmlUrl);
  const references = [
    ...html.matchAll(/\b(?:href|src)="([^"]+)"/gu),
  ].map((match) => match[1]);

  assert.ok(references.length >= 5);
  for (const reference of references) {
    assert.doesNotMatch(reference, /^(?:https?:)?\/\//iu);
    const [pathname, fragment] = reference.split("#", 2);
    const targetUrl = pathname ? new URL(pathname, htmlUrl) : htmlUrl;
    assert.ok(existsSync(targetUrl), `missing local reference: ${reference}`);
    if (fragment) {
      const targetSource = await readSource(targetUrl);
      assert.match(
        targetSource,
        new RegExp(`id=["']${fragment.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&")}["']`, "u"),
        `missing local fragment: ${reference}`,
      );
    }
  }
});

test("G1 account access route can activate without granting Auth case data or write authority", async () => {
  const { PCM_FLOW_ROUTE_MANIFEST } = await import(
    `${routeManifestUrl.href}?source-only=${Date.now()}`
  );
  let accountAccess = null;
  for (let index = 0; index < PCM_FLOW_ROUTE_MANIFEST.nodes.length; index += 1) {
    const node = PCM_FLOW_ROUTE_MANIFEST.nodes[index];
    if (node.id === "accountAccess") accountAccess = node;
  }

  assert.ok(accountAccess);
  assert.equal(accountAccess.publicPath, "/account/access");
  assert.equal(accountAccess.lifecycle, "active");
  assert.equal(accountAccess.gate, "G1_UI_SOURCE");
  assert.equal(accountAccess.href, "../account_access/code.html");
});
