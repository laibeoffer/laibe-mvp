import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../src/stitch_laibe_landing_onboarding/pcm_standalone/account_access/", import.meta.url);
const html = await readFile(new URL("code.html", root), "utf8");
const css = await readFile(new URL("styles.css", root), "utf8");
const app = await readFile(new URL("app.js", root), "utf8");
const publicContract = await readFile(new URL("../public/public-contract.js", root), "utf8");
const routeManifest = await readFile(new URL("../public/pcm-flow-route-manifest.js", root), "utf8");
const { PUBLIC_ROUTES } = await import(new URL("../public/public-contract.js", root));

function canonicalLinkHref(linkId) {
  const record = routeManifest.match(
    new RegExp(`freezeRecord\\(\\{\\s*id: "${linkId}",([\\s\\S]*?)\\n  \\}\\),`),
  );
  assert.ok(record, `missing canonical link: ${linkId}`);
  const href = record[1].match(/relativeHref:\s*(null|"([^"]+)")/u);
  assert.ok(href, `missing canonical href: ${linkId}`);
  return href[1] === "null" ? null : href[2];
}

function runWithBrowserWindow(callback) {
  const hadWindow = Object.prototype.hasOwnProperty.call(globalThis, "window");
  const previousWindow = globalThis.window;
  globalThis.window = {
    location: { assign() {} },
    setTimeout(next) { next(); },
  };
  try {
    return callback();
  } finally {
    if (hadWindow) globalThis.window = previousWindow;
    else delete globalThis.window;
  }
}

function createRegistrationDomHarness() {
  const state = { activeElement: null };

  function element({ dataset = {}, type = "", value = "", checked = false, readOnly = false } = {}) {
    const attributes = new Map();
    const listeners = new Map();
    return {
      dataset: { ...dataset },
      type,
      value,
      checked,
      readOnly,
      hidden: false,
      disabled: false,
      textContent: "",
      classList: { toggle() {} },
      addEventListener(eventName, listener) {
        const handlers = listeners.get(eventName) ?? [];
        handlers.push(listener);
        listeners.set(eventName, handlers);
      },
      dispatch(eventName) {
        const event = { defaultPrevented: false, preventDefault() { this.defaultPrevented = true; } };
        for (const listener of listeners.get(eventName) ?? []) listener(event);
        return event;
      },
      setAttribute(name, nextValue) { attributes.set(name, String(nextValue)); },
      getAttribute(name) { return attributes.get(name) ?? null; },
      removeAttribute(name) { attributes.delete(name); },
      focus() { state.activeElement = this; },
    };
  }

  const fields = {
    accountType: element({ type: "hidden", value: "personal" }),
    company: element(),
    name: element({ value: "王小明" }),
    phone: element({ value: "0912345678" }),
    region: element({ value: "臺北市" }),
    email: element({ value: "owner@example.com" }),
    password: element({ type: "password", value: "account88" }),
    agree: element({ type: "checkbox", checked: true }),
    role: element({ type: "hidden" }),
  };
  const status = element({ dataset: {} });
  const loginFields = {
    email: element({ value: "member@example.com" }),
    password: element({ type: "password", value: "account88" }),
    role: element({ type: "hidden" }),
  };
  const loginStatus = element({ dataset: {} });
  const loginEmailError = element();
  const loginPasswordError = element();
  const forgotFields = {
    email: element({ value: "member@example.com" }),
  };
  const forgotStatus = element({ dataset: {} });
  const forgotEmailError = element();
  const recoveryFields = {
    email: element({ value: "", readOnly: true }),
    password: element({ type: "password", value: "new-account88" }),
    confirmPassword: element({ type: "password", value: "new-account88" }),
  };
  const recoveryStatus = element({ dataset: {} });
  const recoveryPasswordError = element();
  const recoveryConfirmPasswordError = element();
  const roleError = element();
  const roleBinding = element();
  const owner = element({ dataset: { roleOption: "owner" } });
  const invitedPartner = element({ dataset: { roleOption: "invited-partner" } });
  const registerTab = element({ dataset: { modeTab: "register" } });
  const loginTab = element({ dataset: { modeTab: "login" } });
  const forgotTab = element({ dataset: { modeTab: "forgot" } });
  const title = element();
  const switcher = element();
  const submit = element();
  submit.querySelector = () => null;
  const recoverySubmit = element();
  recoverySubmit.querySelector = () => null;

  const form = element({ dataset: { accountForm: "register" } });
  form.elements = { namedItem(name) { return fields[name] ?? null; } };
  form.querySelector = (selector) => {
    if (selector === "[data-form-status]") return status;
    if (selector === "[data-submit-button]") return submit;
    return null;
  };
  form.querySelectorAll = (selector) => selector === "[aria-invalid]"
    ? Object.values(fields).filter((field) => field.getAttribute("aria-invalid") !== null)
    : [];
  const loginForm = element({ dataset: { accountForm: "login" } });
  loginForm.elements = { namedItem(name) { return loginFields[name] ?? null; } };
  loginForm.querySelector = (selector) => {
    if (selector === "[data-form-status]") return loginStatus;
    if (selector === "[data-submit-button]") return submit;
    return null;
  };
  loginForm.querySelectorAll = (selector) => selector === "[aria-invalid]"
    ? Object.values(loginFields).filter((field) => field.getAttribute("aria-invalid") !== null)
    : [];
  const forgotForm = element({ dataset: { accountForm: "forgot" } });
  forgotForm.elements = { namedItem(name) { return forgotFields[name] ?? null; } };
  forgotForm.querySelector = (selector) => {
    if (selector === "[data-form-status]") return forgotStatus;
    if (selector === "[data-submit-button]") return submit;
    return null;
  };
  forgotForm.querySelectorAll = (selector) => selector === "[aria-invalid]"
    ? Object.values(forgotFields).filter((field) => field.getAttribute("aria-invalid") !== null)
    : [];
  const recoveryForm = element({ dataset: { accountForm: "recovery" } });
  recoveryForm.elements = { namedItem(name) { return recoveryFields[name] ?? null; } };
  recoveryForm.querySelector = (selector) => {
    if (selector === "[data-form-status]") return recoveryStatus;
    if (selector === "[data-submit-button]") return recoverySubmit;
    return null;
  };
  recoveryForm.querySelectorAll = (selector) => selector === "[aria-invalid]"
    ? Object.values(recoveryFields).filter((field) => field.getAttribute("aria-invalid") !== null)
    : [];

  const rootDocument = {
    documentElement: { dataset: {} },
    querySelector(selector) {
      if (selector === "[data-account-access-page]") return {};
      if (selector === '[data-account-form="register"]') return form;
      if (selector === '[data-account-form="login"]') return loginForm;
      if (selector === '[data-account-form="forgot"]') return forgotForm;
      if (selector === '[data-account-form="recovery"]') return recoveryForm;
      if (selector === ".role-binding") return roleBinding;
      if (selector === '[data-field-error="register-role"]') return roleError;
      if (selector === '[data-field-error="login-role"]') return roleError;
      if (selector === '[data-field-error="login-email"]') return loginEmailError;
      if (selector === '[data-field-error="login-password"]') return loginPasswordError;
      if (selector === '[data-field-error="forgot-email"]') return forgotEmailError;
      if (selector === '[data-field-error="recovery-password"]') return recoveryPasswordError;
      if (selector === '[data-field-error="recovery-confirm-password"]') return recoveryConfirmPasswordError;
      if (selector === "[data-role-error]") return roleError;
      if (selector === "[data-role-option]") return owner;
      if (selector === '[data-role-option="owner"]') return owner;
      if (selector === "#fcTitle") return title;
      if (selector === "#fcSwitch") return switcher;
      return null;
    },
    querySelectorAll(selector) {
      if (selector === "[data-role-option]") return [owner, invitedPartner];
      if (selector === "[data-mode-tab]") return [registerTab, loginTab, forgotTab];
      if (selector === "[data-account-form]") return [form, loginForm, forgotForm, recoveryForm];
      if (selector === '[data-field-error^="register-"]') return [roleError];
      if (selector === '[data-field-error^="login-"]') return [loginEmailError, loginPasswordError, roleError];
      if (selector === '[data-field-error^="forgot-"]') return [forgotEmailError];
      if (selector === '[data-field-error^="recovery-"]') return [recoveryPasswordError, recoveryConfirmPasswordError];
      return [];
    },
  };

  return {
    rootDocument,
    form,
    loginForm,
    forgotForm,
    recoveryForm,
    fields,
    loginFields,
    forgotFields,
    recoveryFields,
    status,
    loginStatus,
    forgotStatus,
    recoveryStatus,
    recoverySubmit,
    loginEmailError,
    loginPasswordError,
    forgotEmailError,
    recoveryPasswordError,
    recoveryConfirmPasswordError,
    roleError,
    roleBinding,
    owner,
    invitedPartner,
    registerTab,
    loginTab,
    forgotTab,
    title,
    switcher,
    state,
  };
}

test("account access runtime identity pins the account-bound recovery app", () => {
  assert.match(html, /href="\.\/styles\.css\?v=20260824-account-access"/);
  assert.match(html, /src="\.\/app\.js\?v=20260824-account-access"/);
  assert.ok(css.length > 1000);
  assert.ok(app.length > 500);
});

test("registration keeps the existing LaiBE header and real navigation", () => {
  const startDocumentCheckHref = canonicalLinkHref("accountAccessHeaderStartDocumentCheckToQuoteCheck");

  assert.match(html, /<header class="site-header" id="top">/);
  assert.match(html, /<a class="brand" href="\.\.\/public_home\/code\.html#top" aria-label="LaiBE 首頁">/);
  assert.match(html, /Decision &amp; Record System/);
  assert.match(html, /裝潢決策系統/);
  assert.match(html, /class="header-action"[^>]*href="\.\.\/public_home\/code\.html#top"[^>]*>返回 LaiBE 首頁<\/a>/);
  assert.equal(startDocumentCheckHref, "../quote_check/code.html?mode=quote#document-workspace");
  assert.ok(html.includes(`<a class="header-action header-action--primary" href="${startDocumentCheckHref}">開始文件健檢</a>`));
  assert.match(css, /\.site-header\s*\{/);
  assert.match(css, /@media\s*\(max-width:\s*620px\)[\s\S]*\.site-header\s*\{/);
  assert.match(css, /@media\s*\(max-width:\s*620px\)[\s\S]*\.header-action\s*\{[^}]*min-height:\s*44px/s);
});

test("direct transplant preserves the canonical shared account shell and registration explanation", () => {
  assert.match(html, /<body[^>]*data-laibe-page="account-access"/);
  assert.match(html, /<main class="shell"[^>]*data-screen-label/);
  assert.match(html, /class="reg-grid"/);
  assert.match(html, /class="intro"/);
  assert.match(html, /class="eyebrow"/);
  assert.match(html, /class="lead"/);
  assert.match(html, /class="switch"/);
  assert.match(html, /class="steps"/);
  assert.match(html, /class="step"/);
  assert.match(html, /class="n"/);
  assert.match(html, /class="reassure"/);
  assert.match(html, /填寫資料[\s\S]*確認角色[\s\S]*完成 Email 驗證/);
});

test("shared account access starts with login while registration keeps its explanation", () => {
  assert.ok(
    html.indexOf('class="form-card"') < html.indexOf('class="intro"'),
    "the registration card must precede supporting explanation in DOM order",
  );
  assert.match(html, /<h1 id="fcTitle">登入 LaiBE 帳號<\/h1>/);
  assert.match(html, /<h2 id="account-title">建立帳號，開始整理裝修決策。<\/h2>/);
  assert.equal((html.match(/<h1\b/g) ?? []).length, 1);
  assert.match(html, /<h3>填寫資料<\/h3>[\s\S]*<h3>確認角色<\/h3>[\s\S]*<h3>完成 Email 驗證<\/h3>/);
  assert.match(css, /grid-template-areas:\s*"intro form"/);
  assert.match(css, /@media\s*\(max-width:\s*880px\)[\s\S]*grid-template-areas:\s*"form"\s*"intro"/);
});

test("the canonical form card keeps its account mode switch and field sequence", () => {
  assert.match(html, /class="form-card"/);
  assert.match(html, /id="fcHead"/);
  assert.match(html, /id="fcTitle"/);
  assert.match(html, /id="fcSwitch"/);
  assert.match(html, /id="toLogin"/);
  assert.match(html, /<form(?=[^>]*id="regForm")(?=[^>]*class="fc-b")/);
  assert.match(html, /id="loginForm"/);
  assert.match(html, /id="okState"/);
  assert.match(html, /<div(?=[^>]*id="acctType")(?=[^>]*class="acct-type")/);
  assert.match(html, /class="at on"[^>]*data-type="personal"/);
  assert.match(html, /class="at"[^>]*data-type="company"/);
  assert.match(html, /id="companyField"/);
  assert.match(html, /name="company"/);
  assert.match(html, /name="name"/);
  assert.match(html, /name="phone"/);
  assert.match(html, /name="region"/);
  assert.match(html, /<select[^>]*name="region"/);
  assert.match(html, /name="email"/);
  assert.match(html, /name="password"/);
  assert.match(html, /id="agree"/);
  assert.match(html, /class="btn primary"/);
  assert.match(html, /class="alt-line"/);
});

test("registration binds only the permitted owner and invited-partner roles outside the form", () => {
  assert.match(html, /data-role-option="owner"/);
  assert.match(html, /甲方/);
  assert.match(html, /data-role-option="invited-partner"/);
  assert.match(html, /受邀乙方/);
  assert.doesNotMatch(html, /data-role-option="drs-specialist"/u);
  assert.match(html, /<input[^>]*name="role"[^>]*type="hidden"/);
  assert.equal((html.match(/<input[^>]*name="role"[^>]*type="hidden"/g) ?? []).length, 2);
  assert.match(html, /data-field-error="register-role"/);
  assert.match(app, /function selectRole\(root, selected\)/);
  assert.match(app, /root\.querySelectorAll\("\[data-role-option\]"\)/);
  assert.match(app, /roleError\.textContent\s*=\s*""/);
});

test("missing role submit gives unmistakable role feedback and clears it when a role is selected", async () => {
  const module = await import(new URL(`../src/stitch_laibe_landing_onboarding/pcm_standalone/account_access/app.js?dom=${Date.now()}`, import.meta.url));
  const harness = createRegistrationDomHarness();
  module.initAccountAccess(harness.rootDocument);

  const submitEvent = harness.form.dispatch("submit");

  assert.equal(submitEvent.defaultPrevented, true);
  assert.equal(harness.status.textContent, "請先選擇使用角色後再送出。");
  assert.equal(harness.status.dataset.tone, "error");
  assert.equal(harness.roleError.textContent, "請選擇你目前的使用角色。");
  assert.equal(harness.roleBinding.getAttribute("aria-invalid"), "true");
  assert.equal(harness.state.activeElement, harness.owner);
  assert.match(css, /\.role-binding\[aria-invalid="true"\]\s*\{[^}]*outline:\s*2px solid var\(--danger\)/s);
  assert.match(css, /\.role-binding\[aria-invalid="true"\]\s*\{[^}]*padding-bottom:\s*16px/s);

  harness.owner.dispatch("click");
  assert.equal(harness.fields.role.value, "owner");
  assert.equal(harness.loginFields.role.value, "owner");
  assert.equal(harness.owner.getAttribute("aria-pressed"), "true");
  assert.equal(harness.invitedPartner.getAttribute("aria-pressed"), "false");
  assert.equal(harness.roleError.textContent, "");
  assert.equal(harness.roleBinding.getAttribute("aria-invalid"), null);
  assert.equal(harness.status.textContent, "");

  harness.invitedPartner.dispatch("click");
  assert.equal(harness.fields.role.value, "invited-partner");
  assert.equal(harness.loginFields.role.value, "invited-partner");
  assert.equal(harness.owner.getAttribute("aria-pressed"), "false");
  assert.equal(harness.invitedPartner.getAttribute("aria-pressed"), "true");
});

test("the same explicit role selector stays visible in registration and login modes", async () => {
  const module = await import(new URL(`../src/stitch_laibe_landing_onboarding/pcm_standalone/account_access/app.js?mode=${Date.now()}`, import.meta.url));
  const harness = createRegistrationDomHarness();
  module.initAccountAccess(harness.rootDocument);

  assert.equal(harness.roleBinding.hidden, false);
  assert.equal(harness.form.hidden, true);
  assert.equal(harness.loginForm.hidden, false);

  harness.registerTab.dispatch("click");
  assert.equal(harness.roleBinding.hidden, false);
  assert.equal(harness.form.hidden, false);
  assert.equal(harness.loginForm.hidden, true);

  harness.loginTab.dispatch("click");
  assert.equal(harness.roleBinding.hidden, false);
  assert.equal(harness.form.hidden, true);
  assert.equal(harness.loginForm.hidden, false);
  assert.match(css, /\.role-binding\[hidden\]\s*,\s*\.fc-b\[hidden\]\s*\{[^}]*display:\s*none/s);
});

test("login requires role intent Email and password without treating client role as authority", async () => {
  const module = await import(new URL(`../src/stitch_laibe_landing_onboarding/pcm_standalone/account_access/app.js?login-contract=${Date.now()}`, import.meta.url));

  assert.deepEqual(module.validateLogin({
    email: "member@example.com",
    password: "account88",
    role: "owner",
  }), {});
  assert.deepEqual(module.validateLogin({ email: "not-an-email", password: "", role: "" }), {
    email: "請輸入有效的 Email。",
    password: "請輸入密碼。",
    role: "請選擇你目前的使用角色。",
  });
});

test("forgot-password and new-password forms validate only the fields required for recovery", async () => {
  const module = await import(new URL(`../src/stitch_laibe_landing_onboarding/pcm_standalone/account_access/app.js?recovery-validation=${Date.now()}`, import.meta.url));

  assert.deepEqual(module.validatePasswordRecoveryRequest({ email: "member@example.com" }), {});
  assert.deepEqual(module.validatePasswordRecoveryRequest({ email: "not-an-email" }), {
    email: "請輸入有效的 Email。",
  });
  assert.deepEqual(module.validatePasswordUpdate({
    password: "new-account88",
    confirmPassword: "new-account88",
  }), {});
  assert.deepEqual(module.validatePasswordUpdate({
    password: "short",
    confirmPassword: "different",
  }), {
    password: "新密碼至少需要 8 碼。",
    confirmPassword: "兩次輸入的密碼不一致。",
  });
});

test("Account Access exposes real registration, forgot-password, and same-page password update controls", () => {
  assert.match(html, /data-account-form="register"[\s\S]*>建立帳號</u);
  assert.match(html, /data-mode-tab="forgot"[^>]*>忘記密碼<\/button>/u);
  assert.match(html, /data-account-form="forgot"/u);
  assert.match(html, /name="email"[^>]*autocomplete="email"/u);
  assert.match(html, />寄送重設信</u);
  assert.match(html, /data-account-form="recovery"/u);
  assert.match(html, /id="recovery-email"[^>]*name="email"[^>]*type="email"[^>]*readonly/u);
  assert.ok(
    html.indexOf('id="recovery-email"') < html.indexOf('id="recovery-password"'),
    "the verified recovery account must appear before the new-password fields",
  );
  assert.match(html, /name="password"[^>]*autocomplete="new-password"/u);
  assert.match(html, /name="confirmPassword"[^>]*autocomplete="new-password"/u);
  assert.match(html, />更新密碼</u);
  assert.doesNotMatch(html, /帳號功能尚未開放|建立帳號功能仍在整理|帳號入口開放後/u);
});

test("registration, forgot-password, and recovery forms call the real auth runtime without opening a workspace", async () => {
  const module = await import(new URL(`../src/stitch_laibe_landing_onboarding/pcm_standalone/account_access/app.js?account-form-flows=${Date.now()}`, import.meta.url));
  const harness = createRegistrationDomHarness();
  const signUpCalls = [];
  const resetCalls = [];
  const updateCalls = [];
  const navigations = [];
  const replacedUrls = [];
  let recoveryListener = null;
  const authRuntime = {
    async getSession() { return null; },
    async signUpWithPassword(values) { signUpCalls.push(values); return true; },
    async requestPasswordRecovery(email) { resetCalls.push(email); return true; },
    async updatePassword(password, email) { updateCalls.push({ password, email }); return true; },
    onPasswordRecovery(listener) {
      recoveryListener = listener;
      return () => {};
    },
  };

  module.initAccountAccess(harness.rootDocument, {
    authRuntimePromise: Promise.resolve(authRuntime),
    location: { pathname: "/account/access/", search: "", hash: "" },
    navigate: (href) => navigations.push(href),
    replaceUrl: (href) => replacedUrls.push(href),
    schedule(next) { next(); },
  });
  await new Promise((resolve) => setImmediate(resolve));

  harness.owner.dispatch("click");
  harness.registerTab.dispatch("click");
  runWithBrowserWindow(() => harness.form.dispatch("submit"));
  await new Promise((resolve) => setImmediate(resolve));

  assert.equal(signUpCalls.length, 1);
  assert.equal(signUpCalls[0].email, "owner@example.com");
  assert.equal(signUpCalls[0].role, "owner");
  assert.equal(harness.status.textContent, "請前往 Email 完成驗證，再回到此頁登入。");
  assert.equal(harness.status.dataset.tone, "success");
  assert.deepEqual(navigations, []);

  harness.forgotTab.dispatch("click");
  assert.equal(harness.rootDocument.documentElement.dataset.accountMode, "forgot");
  assert.equal(harness.roleBinding.hidden, true);
  runWithBrowserWindow(() => harness.forgotForm.dispatch("submit"));
  await new Promise((resolve) => setImmediate(resolve));

  assert.deepEqual(resetCalls, ["member@example.com"]);
  assert.equal(harness.forgotStatus.textContent, "如果這個 Email 已有帳號，我們已寄出重設密碼信。");
  assert.equal(harness.forgotStatus.dataset.tone, "success");

  assert.equal(typeof recoveryListener, "function");
  recoveryListener({ email: "member@example.com" });
  assert.equal(harness.rootDocument.documentElement.dataset.accountMode, "recovery");
  assert.equal(harness.recoveryForm.hidden, false);
  assert.equal(harness.recoveryFields.email.value, "member@example.com");
  assert.equal(harness.recoveryFields.email.readOnly, true);
  assert.equal(harness.recoveryFields.password.disabled, false);
  assert.equal(harness.recoverySubmit.disabled, false);
  assert.equal(harness.recoveryStatus.textContent, "已確認帳號，請設定新的登入密碼。");
  harness.loginFields.email.value = "";
  harness.loginFields.password.value = "stale-password";
  runWithBrowserWindow(() => harness.recoveryForm.dispatch("submit"));
  await new Promise((resolve) => setImmediate(resolve));

  assert.deepEqual(updateCalls, [{
    password: "new-account88",
    email: "member@example.com",
  }]);
  assert.deepEqual(replacedUrls, ["/account/access/"]);
  assert.equal(harness.rootDocument.documentElement.dataset.accountMode, "login");
  assert.equal(harness.loginFields.email.value, "member@example.com");
  assert.equal(harness.loginFields.password.value, "");
  assert.equal(harness.state.activeElement, harness.loginFields.password);
  assert.equal(harness.loginStatus.textContent, "密碼已更新，請使用新密碼登入。");
  assert.equal(harness.loginStatus.dataset.tone, "success");
  assert.deepEqual(navigations, []);
});

test("recovery explains rate limits and requires a password different from the current one", async () => {
  const module = await import(new URL(`../src/stitch_laibe_landing_onboarding/pcm_standalone/account_access/app.js?recovery-errors=${Date.now()}`, import.meta.url));
  const rateLimitHarness = createRegistrationDomHarness();
  module.initAccountAccess(rateLimitHarness.rootDocument, {
    authRuntimePromise: Promise.resolve({
      async getSession() { return null; },
      async requestPasswordRecovery() { throw new Error("PASSWORD_RECOVERY_RATE_LIMITED"); },
      onPasswordRecovery() { return () => {}; },
    }),
    location: { pathname: "/account/access/", search: "", hash: "" },
    schedule(next) { next(); },
  });
  await new Promise((resolve) => setImmediate(resolve));
  rateLimitHarness.forgotTab.dispatch("click");
  runWithBrowserWindow(() => rateLimitHarness.forgotForm.dispatch("submit"));
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(
    rateLimitHarness.forgotStatus.textContent,
    "重設信寄送次數已達上限，請稍候再試，並只使用最新一封信的連結。",
  );
  assert.equal(rateLimitHarness.forgotStatus.dataset.tone, "error");

  const samePasswordHarness = createRegistrationDomHarness();
  let recoveryListener = null;
  module.initAccountAccess(samePasswordHarness.rootDocument, {
    authRuntimePromise: Promise.resolve({
      async getSession() { return null; },
      onPasswordRecovery(listener) { recoveryListener = listener; return () => {}; },
      async updatePassword() { throw new Error("PASSWORD_SAME_AS_CURRENT"); },
    }),
    location: { pathname: "/account/access/", search: "?flow=password-recovery", hash: "" },
    schedule() {},
  });
  await new Promise((resolve) => setImmediate(resolve));
  recoveryListener({ email: "member@example.com" });
  runWithBrowserWindow(() => samePasswordHarness.recoveryForm.dispatch("submit"));
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(
    samePasswordHarness.recoveryStatus.textContent,
    "新密碼不可與目前密碼相同，請改用不同的密碼。",
  );
  assert.equal(samePasswordHarness.recoveryStatus.dataset.tone, "error");
});

test("a forged or expired recovery fragment never exposes an enabled password form or authorizes a workspace", async () => {
  const module = await import(new URL(`../src/stitch_laibe_landing_onboarding/pcm_standalone/account_access/app.js?recovery-fragment=${Date.now()}`, import.meta.url));
  const canonicalRecoveryLocation = {
    pathname: "/account/access/",
    search: "",
    hash: "#access_token=forged&type=recovery",
  };
  assert.equal(module.isPasswordRecoveryReturn(canonicalRecoveryLocation), true);
  assert.equal(module.isPasswordRecoveryReturn({
    ...canonicalRecoveryLocation,
    pathname: "/account/access",
  }), false);

  const harness = createRegistrationDomHarness();
  const navigations = [];
  let grantCalls = 0;
  module.initAccountAccess(harness.rootDocument, {
    authRuntimePromise: Promise.resolve({
      async getSession() { return { access_token: "forged-fragment-session" }; },
      async authenticatedFetch() { grantCalls += 1; return new Response("{}", { status: 200 }); },
      onPasswordRecovery() { return () => {}; },
    }),
    location: canonicalRecoveryLocation,
    navigate: (href) => navigations.push(href),
    schedule(next) { next(); },
  });
  await new Promise((resolve) => setImmediate(resolve));

  assert.equal(harness.rootDocument.documentElement.dataset.accountMode, "forgot");
  assert.equal(harness.recoveryForm.hidden, true);
  assert.equal(harness.recoveryFields.password.disabled, true);
  assert.equal(harness.recoverySubmit.disabled, true);
  assert.equal(
    harness.forgotStatus.textContent,
    "重設連結已失效，請輸入帳號 Email 重新寄送。",
  );
  assert.equal(harness.forgotStatus.dataset.tone, "error");
  assert.equal(grantCalls, 0);
  assert.deepEqual(navigations, []);
});

test("a recovery redirect marker shows the verified account only after the real recovery event", async () => {
  const module = await import(new URL(`../src/stitch_laibe_landing_onboarding/pcm_standalone/account_access/app.js?recovery-marker=${Date.now()}`, import.meta.url));
  const canonicalRecoveryLocation = {
    pathname: "/account/access/",
    search: "?flow=password-recovery",
    hash: "",
  };
  assert.equal(module.isPasswordRecoveryReturn(canonicalRecoveryLocation), true);

  const harness = createRegistrationDomHarness();
  const navigations = [];
  let grantCalls = 0;
  let recoveryListener = null;
  let recoveryTimeout = null;
  module.initAccountAccess(harness.rootDocument, {
    authRuntimePromise: Promise.resolve({
      async getSession() { return { access_token: "recovery-session" }; },
      async authenticatedFetch() { grantCalls += 1; return new Response("{}", { status: 200 }); },
      onPasswordRecovery(listener) {
        recoveryListener = listener;
        return () => {};
      },
    }),
    location: canonicalRecoveryLocation,
    navigate: (href) => navigations.push(href),
    schedule(next) { recoveryTimeout = next; },
  });
  await new Promise((resolve) => setImmediate(resolve));

  assert.equal(typeof recoveryTimeout, "function");
  assert.equal(harness.rootDocument.documentElement.dataset.accountMode, "recovery");
  assert.equal(harness.recoveryForm.hidden, false);
  assert.equal(harness.recoveryFields.email.value, "");
  assert.equal(harness.recoveryFields.password.disabled, true);
  assert.equal(harness.recoverySubmit.disabled, true);
  assert.equal(harness.recoveryStatus.textContent, "正在確認重設連結與帳號…");

  recoveryListener({ email: "member@example.com" });
  recoveryTimeout();

  assert.equal(harness.rootDocument.documentElement.dataset.accountMode, "recovery");
  assert.equal(harness.recoveryFields.email.value, "member@example.com");
  assert.equal(harness.recoveryFields.password.disabled, false);
  assert.equal(harness.recoverySubmit.disabled, false);
  assert.equal(harness.recoveryStatus.textContent, "已確認帳號，請設定新的登入密碼。");
  assert.equal(grantCalls, 0);
  assert.deepEqual(navigations, []);
});

test("a verified recovery session keeps the password form open when the transient recovery event was missed", async () => {
  const module = await import(new URL(`../src/stitch_laibe_landing_onboarding/pcm_standalone/account_access/app.js?recovery-session-fallback=${Date.now()}`, import.meta.url));
  const canonicalRecoveryLocation = {
    pathname: "/account/access/",
    search: "?flow=password-recovery",
    hash: "",
  };
  const harness = createRegistrationDomHarness();
  const navigations = [];
  let grantCalls = 0;
  let recoveryTimeout = null;

  module.initAccountAccess(harness.rootDocument, {
    authRuntimePromise: Promise.resolve({
      onPasswordRecovery() { return () => {}; },
      async resolvePasswordRecoverySession() {
        return Object.freeze({ email: "member@example.com" });
      },
      async authenticatedFetch() { grantCalls += 1; return new Response("{}", { status: 200 }); },
    }),
    location: canonicalRecoveryLocation,
    navigate: (href) => navigations.push(href),
    schedule(next) { recoveryTimeout = next; },
  });
  await new Promise((resolve) => setImmediate(resolve));

  assert.equal(typeof recoveryTimeout, "function");
  recoveryTimeout();
  assert.equal(harness.rootDocument.documentElement.dataset.accountMode, "recovery");
  assert.equal(harness.recoveryForm.hidden, false);
  assert.equal(harness.recoveryFields.email.value, "member@example.com");
  assert.equal(harness.recoveryFields.password.disabled, false);
  assert.equal(harness.recoverySubmit.disabled, false);
  assert.equal(harness.recoveryStatus.textContent, "已確認帳號，請設定新的登入密碼。");
  assert.equal(grantCalls, 0);
  assert.deepEqual(navigations, []);
});

test("a recovery redirect keeps the signed-in session emitted while persisted storage is still empty", async () => {
  const module = await import(new URL(`../src/stitch_laibe_landing_onboarding/pcm_standalone/account_access/app.js?recovery-signed-in-race=${Date.now()}`, import.meta.url));
  const harness = createRegistrationDomHarness();
  let authStateListener = null;
  let recoveryTimeout = null;
  const runtime = module.createSupabaseAuthRuntime({
    createClientImplementation() {
      return {
        auth: {
          async getSession() {
            return { data: { session: null }, error: null };
          },
          onAuthStateChange(listener) {
            authStateListener = listener;
            return { data: { subscription: { unsubscribe() {} } } };
          },
        },
      };
    },
    storage: {
      getItem() { return null; },
      setItem() {},
      removeItem() {},
    },
    fetchImplementation: async () => new Response("{}", { status: 200 }),
  });

  module.initAccountAccess(harness.rootDocument, {
    authRuntimePromise: Promise.resolve(runtime),
    location: {
      pathname: "/account/access/",
      search: "?flow=password-recovery",
      hash: "",
    },
    schedule(next) { recoveryTimeout = next; },
  });
  await new Promise((resolve) => setImmediate(resolve));

  const realisticAccessToken = [
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9",
    "eyJzdWIiOiIxMTExMTExMS0xMTExLTQxMTEtODExMS0xMTExMTExMTExMTEifQ".repeat(9),
    "verified-signature",
  ].join(".");
  assert.ok(realisticAccessToken.length > 512);
  authStateListener("SIGNED_IN", {
    access_token: realisticAccessToken,
    refresh_token: "verified-recovery-refresh",
    expires_in: 3600,
    expires_at: 1787548800,
    token_type: "bearer",
    user: {
      id: "11111111-1111-4111-8111-111111111111",
      aud: "authenticated",
      role: "authenticated",
      email: "member@example.com",
    },
  });
  recoveryTimeout();

  assert.equal(harness.rootDocument.documentElement.dataset.accountMode, "recovery");
  assert.equal(harness.recoveryFields.email.value, "member@example.com");
  assert.equal(harness.recoveryFields.password.disabled, false);
  assert.equal(harness.recoverySubmit.disabled, false);
  assert.equal(harness.recoveryStatus.textContent, "已確認帳號，請設定新的登入密碼。");
});

test("login submit rejects invalid fields before requesting a real password session", async () => {
  const module = await import(new URL(`../src/stitch_laibe_landing_onboarding/pcm_standalone/account_access/app.js?invalid-login-email=${Date.now()}`, import.meta.url));
  const harness = createRegistrationDomHarness();
  let authCalls = 0;
  module.initAccountAccess(harness.rootDocument, {
    authRuntimePromise: Promise.resolve({
      async signInWithPassword() { authCalls += 1; },
      async getSession() { return null; },
    }),
  });
  harness.loginTab.dispatch("click");
  harness.owner.dispatch("click");
  harness.loginFields.email.value = "not-an-email";

  const submitEvent = runWithBrowserWindow(() => harness.loginForm.dispatch("submit"));

  assert.equal(submitEvent.defaultPrevented, true);
  assert.equal(authCalls, 0);
  assert.equal(harness.loginFields.email.getAttribute("aria-invalid"), "true");
  assert.equal(harness.loginFields.password.getAttribute("aria-invalid"), null);
  assert.equal(harness.loginEmailError.textContent, "請輸入有效的 Email。");
  assert.equal(harness.loginStatus.textContent, "請確認標示欄位後再送出。");
  assert.equal(harness.loginStatus.dataset.tone, "error");
  assert.equal(harness.state.activeElement, harness.loginFields.email);
});

test("password login uses selected vendor intent but opens the workspace only after the real pro grant", async () => {
  const module = await import(new URL(`../src/stitch_laibe_landing_onboarding/pcm_standalone/account_access/app.js?vendor-password-login=${Date.now()}`, import.meta.url));
  const harness = createRegistrationDomHarness();
  const authCalls = [];
  const grantCalls = [];
  const navigations = [];
  let signedIn = false;
  const authRuntime = {
    async signInWithPassword(email, password) {
      authCalls.push({ email, password });
      signedIn = true;
      return true;
    },
    async getSession() {
      return signedIn ? { access_token: "real-session-token" } : null;
    },
    async authenticatedFetch(endpoint) {
      grantCalls.push(endpoint);
      assert.equal(endpoint, "vendor-workspace-grant");
      return new Response(JSON.stringify({
        schemaVersion: "laibe.vendor-workspace-auth.v1",
        state: "AUTHORIZED_VENDOR_WORKSPACE",
        authenticatedUserId: "vendor-42",
        currentCaseId: "case-7",
        membership: {
          userId: "vendor-42",
          caseId: "case-7",
          role: "pro",
          status: "active",
        },
        workspaceAccess: {
          role: "pro",
          mutationAllowed: false,
          writeActionsEnabled: false,
        },
      }), { status: 200, headers: { "content-type": "application/json" } });
    },
  };

  module.initAccountAccess(harness.rootDocument, {
    authRuntimePromise: Promise.resolve(authRuntime),
    navigate: (href) => navigations.push(href),
    location: { pathname: "/account/access/", search: "" },
  });
  await new Promise((resolve) => setImmediate(resolve));
  harness.invitedPartner.dispatch("click");
  harness.loginFields.email.value = " blueleft0120@gmail.com ";
  harness.loginFields.password.value = "account88";

  runWithBrowserWindow(() => harness.loginForm.dispatch("submit"));
  await new Promise((resolve) => setImmediate(resolve));

  assert.deepEqual(authCalls, [{ email: "blueleft0120@gmail.com", password: "account88" }]);
  assert.deepEqual(grantCalls, ["vendor-workspace-grant"]);
  assert.deepEqual(navigations, ["/pcm/vendor/workspace/"]);
});

test("Supabase runtime persists the browser session, signs in with Email and password, and authenticates exact workspace endpoints", async () => {
  const module = await import(new URL(`../src/stitch_laibe_landing_onboarding/pcm_standalone/account_access/app.js?runtime=${Date.now()}`, import.meta.url));
  const clientCalls = [];
  const passwordCalls = [];
  const fetchCalls = [];
  const storage = {
    values: new Map(),
    getItem(key) { return this.values.get(key) ?? null; },
    setItem(key, value) { this.values.set(key, value); },
    removeItem(key) { this.values.delete(key); },
  };
  const client = {
    auth: {
      async getSession() {
        return { data: { session: null }, error: null };
      },
      async signInWithPassword(input) {
        passwordCalls.push(input);
        return { data: { session: { access_token: "real-session-token" } }, error: null };
      },
    },
  };
  const runtime = module.createSupabaseAuthRuntime({
    createClientImplementation(url, key, options) {
      clientCalls.push({ url, key, options });
      return client;
    },
    storage,
    fetchImplementation: async (url, init) => {
      fetchCalls.push({ url, init });
      return new Response("{}", { status: 200 });
    },
  });

  await runtime.signInWithPassword(" member@example.com ", "account88");
  assert.equal(
    (await runtime.getSession())?.access_token,
    "real-session-token",
    "the verified password session must remain available while Supabase finishes persisting it",
  );
  await runtime.authenticatedFetch("vendor-workspace-grant", { method: "GET" });
  const ownerEndpoints = [
    "owner-workspace-grant",
    "owner-google-calendar-grant",
    "owner-google-calendar-oauth-start",
  ];
  const vendorCalendarSupportEndpoints = [
    "vendor-google-calendar-connect-start",
    "vendor-google-calendar-support-grant",
    "vendor-google-calendar-events-read",
    "vendor-google-calendar-events-create",
    "vendor-google-calendar-events-update",
    "vendor-google-calendar-events-cancel",
  ];
  const authenticatedEndpoints = [
    ...ownerEndpoints,
    ...vendorCalendarSupportEndpoints,
  ];
  for (const endpoint of authenticatedEndpoints) {
    await runtime.authenticatedFetch(endpoint, { method: "GET" });
  }

  assert.equal(clientCalls.length, 1);
  assert.equal(clientCalls[0].url, "https://zdwuyomhswjcbbpbhpcq.supabase.co");
  assert.match(clientCalls[0].key, /^sb_publishable_/u);
  assert.equal(clientCalls[0].options.auth.storage, storage);
  assert.equal(clientCalls[0].options.auth.storageKey, "laibe.auth.session.v1");
  assert.equal(clientCalls[0].options.auth.persistSession, true);
  assert.equal(clientCalls[0].options.auth.detectSessionInUrl, true);
  assert.deepEqual(passwordCalls, [{
    email: "member@example.com",
    password: "account88",
  }]);
  assert.equal(fetchCalls[0].url, "https://zdwuyomhswjcbbpbhpcq.supabase.co/functions/v1/vendor-workspace-grant");
  assert.equal(fetchCalls[0].init.headers.Authorization, "Bearer real-session-token");
  assert.match(fetchCalls[0].init.headers.apikey, /^sb_publishable_/u);
  assert.equal(fetchCalls.length, 10);
  for (let index = 0; index < authenticatedEndpoints.length; index += 1) {
    assert.equal(
      fetchCalls[index + 1].url,
      `https://zdwuyomhswjcbbpbhpcq.supabase.co/functions/v1/${authenticatedEndpoints[index]}`,
    );
    assert.equal(fetchCalls[index + 1].init.headers.Authorization, "Bearer real-session-token");
    assert.match(fetchCalls[index + 1].init.headers.apikey, /^sb_publishable_/u);
  }
  await assert.rejects(
    runtime.authenticatedFetch("owner-google-calendar-oauth-callback"),
    /FUNCTION_ENDPOINT_NOT_ALLOWED/u,
  );
  await assert.rejects(
    runtime.authenticatedFetch("https://attacker.test/functions/v1/vendor-workspace-grant"),
    /FUNCTION_ENDPOINT_NOT_ALLOWED/u,
  );
});

test("canonical Auth runtime keeps a verified Supabase session available across same-origin tabs", async () => {
  const localStorageDescriptor = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  const sessionStorageDescriptor = Object.getOwnPropertyDescriptor(globalThis, "sessionStorage");
  const persistentStorage = {
    getItem() { return null; },
    setItem() {},
    removeItem() {},
  };
  const tabStorage = {
    getItem() { return null; },
    setItem() {},
    removeItem() {},
  };
  let clientOptions = null;

  try {
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      value: persistentStorage,
    });
    Object.defineProperty(globalThis, "sessionStorage", {
      configurable: true,
      value: tabStorage,
    });
    const module = await import(new URL(`../src/stitch_laibe_landing_onboarding/pcm_standalone/account_access/app.js?persistent-auth-storage=${Date.now()}`, import.meta.url));
    await module.getSupabaseAuthRuntime({
      importImplementation: async () => ({
        createClient(_url, _key, options) {
          clientOptions = options;
          return {
            auth: {
              onAuthStateChange() {
                return { data: { subscription: { unsubscribe() {} } } };
              },
            },
          };
        },
      }),
      fetchImplementation: async () => new Response("{}", { status: 200 }),
    });

    assert.equal(
      clientOptions?.auth?.storage,
      persistentStorage,
      "the canonical runtime must not lose the verified session when the owner route opens in another tab",
    );
  } finally {
    if (localStorageDescriptor) {
      Object.defineProperty(globalThis, "localStorage", localStorageDescriptor);
    } else {
      delete globalThis.localStorage;
    }
    if (sessionStorageDescriptor) {
      Object.defineProperty(globalThis, "sessionStorage", sessionStorageDescriptor);
    } else {
      delete globalThis.sessionStorage;
    }
  }
});

test("Supabase runtime creates an Email-verified account without granting a client-selected role", async () => {
  const module = await import(new URL(`../src/stitch_laibe_landing_onboarding/pcm_standalone/account_access/app.js?signup-runtime=${Date.now()}`, import.meta.url));
  const signUpCalls = [];
  const signOutCalls = [];
  const runtime = module.createSupabaseAuthRuntime({
    createClientImplementation() {
      return {
        auth: {
          async signUp(input) {
            signUpCalls.push(input);
            return {
              data: {
                user: { id: "11111111-1111-4111-8111-111111111111" },
                session: null,
              },
              error: null,
            };
          },
          async signOut(options) {
            signOutCalls.push(options);
            return { error: null };
          },
        },
      };
    },
    storage: {
      getItem() { return null; },
      setItem() {},
      removeItem() {},
    },
    fetchImplementation: async () => new Response("{}", { status: 200 }),
  });

  await runtime.signUpWithPassword({
    email: " owner@example.com ",
    password: "account88",
    accountType: "company",
    company: "萊比測試公司",
    name: "王小明",
    phone: "0912345678",
    region: "台北市",
    role: "owner",
  });

  assert.equal(module.CANONICAL_ACCOUNT_ACCESS_URL, "http://127.0.0.1:4173/account/access/");
  assert.deepEqual(signUpCalls, [{
    email: "owner@example.com",
    password: "account88",
    options: {
      emailRedirectTo: "http://127.0.0.1:4173/account/access/",
      data: {
        account_type: "company",
        company_name: "萊比測試公司",
        display_name: "王小明",
        phone: "0912345678",
        region: "台北市",
      },
    },
  }]);
  assert.equal(Object.hasOwn(signUpCalls[0].options.data, "role"), false);
  assert.equal(Object.hasOwn(signUpCalls[0].options.data, "caseId"), false);
  assert.deepEqual(signOutCalls, []);
});

test("Supabase runtime sends a fixed recovery link and updates the password only in a recovery session", async () => {
  const module = await import(new URL(`../src/stitch_laibe_landing_onboarding/pcm_standalone/account_access/app.js?recovery-runtime=${Date.now()}`, import.meta.url));
  const resetCalls = [];
  const updateCalls = [];
  const signOutCalls = [];
  let authStateListener = null;
  let unsubscribed = false;
  let currentSession = null;
  let resetError = null;
  let updateError = null;
  const runtime = module.createSupabaseAuthRuntime({
    createClientImplementation() {
      return {
        auth: {
          async getSession() {
            return { data: { session: currentSession }, error: null };
          },
          async resetPasswordForEmail(email, options) {
            resetCalls.push({ email, options });
            return { data: {}, error: resetError };
          },
          async updateUser(input) {
            updateCalls.push(input);
            return updateError
              ? { data: { user: null }, error: updateError }
              : { data: { user: { id: "11111111-1111-4111-8111-111111111111" } }, error: null };
          },
          async signOut(options) {
            signOutCalls.push(options);
            return { error: null };
          },
          onAuthStateChange(listener) {
            authStateListener = listener;
            return { data: { subscription: { unsubscribe() { unsubscribed = true; } } } };
          },
        },
      };
    },
    storage: {
      getItem() { return null; },
      setItem() {},
      removeItem() {},
    },
    fetchImplementation: async () => new Response("{}", { status: 200 }),
  });
  const recoveryAccounts = [];
  const stopListening = runtime.onPasswordRecovery((account) => {
    recoveryAccounts.push(account);
  });

  resetError = { code: "over_email_send_rate_limit" };
  await assert.rejects(
    runtime.requestPasswordRecovery(" member@example.com "),
    /PASSWORD_RECOVERY_RATE_LIMITED/,
  );
  resetError = null;
  await runtime.requestPasswordRecovery(" member@example.com ");
  authStateListener("SIGNED_IN", { access_token: "normal-session" });
  currentSession = {
    access_token: "recovery-session",
    user: { email: "member@example.com" },
  };
  authStateListener("PASSWORD_RECOVERY", currentSession);
  await assert.rejects(
    runtime.updatePassword("new-account88", "another@example.com"),
    /PASSWORD_UPDATE_UNAVAILABLE/,
  );
  assert.deepEqual(updateCalls, []);
  updateError = { code: "same_password" };
  await assert.rejects(
    runtime.updatePassword("new-account88", "member@example.com"),
    /PASSWORD_SAME_AS_CURRENT/,
  );
  updateError = null;
  await runtime.updatePassword("new-account88", "member@example.com");
  stopListening();

  assert.deepEqual(resetCalls, [
    {
      email: "member@example.com",
      options: { redirectTo: "http://127.0.0.1:4173/account/access/?flow=password-recovery" },
    },
    {
      email: "member@example.com",
      options: { redirectTo: "http://127.0.0.1:4173/account/access/?flow=password-recovery" },
    },
  ]);
  assert.deepEqual(recoveryAccounts, [{ email: "member@example.com" }]);
  assert.deepEqual(updateCalls, [
    { password: "new-account88" },
    { password: "new-account88" },
  ]);
  assert.deepEqual(signOutCalls, [{ scope: "local" }]);
  assert.equal(unsubscribed, true);
});

test("Supabase runtime preserves a recovery event that arrives before the page listener", async () => {
  const module = await import(new URL(`../src/stitch_laibe_landing_onboarding/pcm_standalone/account_access/app.js?early-recovery=${Date.now()}`, import.meta.url));
  let authStateListener = null;
  let subscriptionCalls = 0;
  const moduleRuntime = module.createSupabaseAuthRuntime({
    createClientImplementation() {
      return {
        auth: {
          onAuthStateChange(listener) {
            subscriptionCalls += 1;
            authStateListener = listener;
            return { data: { subscription: { unsubscribe() {} } } };
          },
        },
      };
    },
    storage: {
      getItem() { return null; },
      setItem() {},
      removeItem() {},
    },
    fetchImplementation: async () => new Response("{}", { status: 200 }),
  });

  assert.equal(
    subscriptionCalls,
    1,
    "the runtime must subscribe immediately so Supabase initialization cannot outrun the page",
  );
  authStateListener("PASSWORD_RECOVERY", {
    access_token: "early-recovery-session",
    user: { email: "member@example.com" },
  });

  const recoveryAccounts = [];
  moduleRuntime.onPasswordRecovery((account) => recoveryAccounts.push(account));

  assert.deepEqual(recoveryAccounts, [{ email: "member@example.com" }]);
});

test("Supabase runtime binds an already verified session to password recovery after the redirect event was missed", async () => {
  const module = await import(new URL(`../src/stitch_laibe_landing_onboarding/pcm_standalone/account_access/app.js?verified-recovery-session=${Date.now()}`, import.meta.url));
  const recoverySession = {
    access_token: "verified-recovery-session",
    user: { email: "member@example.com" },
  };
  const updateCalls = [];
  const runtime = module.createSupabaseAuthRuntime({
    createClientImplementation() {
      return {
        auth: {
          async getSession() {
            return { data: { session: recoverySession }, error: null };
          },
          async updateUser(input) {
            updateCalls.push(input);
            return { data: { user: { id: "11111111-1111-4111-8111-111111111111" } }, error: null };
          },
          async signOut() { return { error: null }; },
          onAuthStateChange() {
            return { data: { subscription: { unsubscribe() {} } } };
          },
        },
      };
    },
    storage: {
      getItem() { return null; },
      setItem() {},
      removeItem() {},
    },
    fetchImplementation: async () => new Response("{}", { status: 200 }),
  });

  const account = await runtime.resolvePasswordRecoverySession();
  await runtime.updatePassword("new-account88", account.email);

  assert.deepEqual(account, { email: "member@example.com" });
  assert.deepEqual(updateCalls, [{ password: "new-account88" }]);
});

test("password account access is exposed only at the canonical 4173 route", async () => {
  const module = await import(new URL(`../src/stitch_laibe_landing_onboarding/pcm_standalone/account_access/app.js?canonical-login=${Date.now()}`, import.meta.url));
  assert.match(app, /const CANONICAL_ACCOUNT_ACCESS_PATH = "\/account\/access\/"/u);
  assert.match(app, /signInWithPassword/u);
  assert.match(app, /signUpWithPassword/u);
  assert.match(app, /resetPasswordForEmail/u);
  assert.match(app, /updatePassword/u);
  assert.match(app, /emailRedirectTo:\s*CANONICAL_ACCOUNT_ACCESS_URL/u);
  assert.doesNotMatch(app, /signInWithOtp|requestEmailSignIn/u);

  for (const forbiddenLoginSurface of [
    "127.0.0.1:4194",
    "localhost:",
    "/src/stitch_laibe_landing_onboarding/pcm_standalone/account_access/code.html",
    "?role=",
    "?caseId=",
  ]) {
    assert.equal(app.includes(forbiddenLoginSurface), false, `alternate login surface: ${forbiddenLoginSurface}`);
  }

  assert.match(html, /<button[^>]+data-mode-tab="login"[^>]*>登入<\/button>/u);
  assert.doesNotMatch(html, /<a[^>]+(?:href|action)="[^"]*(?:account_access\/code\.html|127\.0\.0\.1:\d+)[^"]*"/u);
});

test("only a real active pro server grant opens the canonical A0 vendor workspace", async () => {
  const module = await import(new URL(`../src/stitch_laibe_landing_onboarding/pcm_standalone/account_access/app.js?grant=${Date.now()}`, import.meta.url));
  const navigations = [];
  const runtime = {
    async getSession() { return { access_token: "real-session-token" }; },
    async authenticatedFetch(endpoint) {
      assert.equal(endpoint, "vendor-workspace-grant");
      return new Response(JSON.stringify({
        state: "AUTHORIZED_VENDOR_WORKSPACE",
        authenticatedUserId: "vendor-42",
        currentCaseId: "case-7",
        membership: {
          userId: "vendor-42",
          caseId: "case-7",
          role: "pro",
          status: "active",
        },
        workspaceAccess: {
          role: "pro",
          mutationAllowed: false,
          writeActionsEnabled: false,
        },
      }), { status: 200, headers: { "content-type": "application/json" } });
    },
  };

  const granted = await module.resumeVendorSession({
    authRuntime: runtime,
    navigate: (href) => navigations.push(href),
    routes: { accountAccessInvitedPartnerLoginToVendorWorkspace: "../vendor_workspace/code.html" },
    location: { pathname: "/account/access/" },
  });

  assert.equal(granted.state, "VENDOR_GRANTED");
  assert.deepEqual(navigations, ["/pcm/vendor/workspace/"]);

  for (const nonCanonicalPathname of [
    "/account/access",
    "/src/stitch_laibe_landing_onboarding/pcm_standalone/account_access/code.html",
  ]) {
    const alternateNavigations = [];
    const alternate = await module.resumeVendorSession({
      authRuntime: runtime,
      navigate: (href) => alternateNavigations.push(href),
      routes: { accountAccessInvitedPartnerLoginToVendorWorkspace: "../vendor_workspace/code.html" },
      location: { pathname: nonCanonicalPathname, search: "?role=pro&caseId=forged" },
    });
    assert.equal(alternate.state, "VENDOR_ACCESS_DENIED");
    assert.deepEqual(alternateNavigations, []);
  }

  const deniedNavigations = [];
  const denied = await module.resumeVendorSession({
    authRuntime: {
      ...runtime,
      async authenticatedFetch() {
        return new Response(JSON.stringify({ state: "CASE_NOT_AUTHORIZED" }), { status: 403 });
      },
    },
    navigate: (href) => deniedNavigations.push(href),
    routes: { accountAccessInvitedPartnerLoginToVendorWorkspace: "../vendor_workspace/code.html" },
    location: { pathname: "/account/access/", search: "?role=pro&caseId=forged" },
  });
  assert.equal(denied.state, "VENDOR_ACCESS_DENIED");
  assert.deepEqual(deniedNavigations, []);
});

test("owner-first canonical login opens the owner workspace before considering vendor access", async () => {
  const module = await import(new URL(`../src/stitch_laibe_landing_onboarding/pcm_standalone/account_access/app.js?owner-first=${Date.now()}`, import.meta.url));
  const ownerGrant = {
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
  const vendorGrant = {
    state: "AUTHORIZED_VENDOR_WORKSPACE",
    authenticatedUserId: "vendor-42",
    currentCaseId: "case-7",
    membership: {
      userId: "vendor-42",
      caseId: "case-7",
      role: "pro",
      status: "active",
    },
    workspaceAccess: {
      role: "pro",
      mutationAllowed: false,
      writeActionsEnabled: false,
    },
  };
  const calls = [];
  const navigations = [];
  const result = await module.resumeAuthorizedSession({
    authRuntime: {
      async getSession() { return { access_token: "real-session-token" }; },
      async authenticatedFetch(endpoint) {
        calls.push(endpoint);
        if (endpoint === "owner-workspace-grant") {
          return new Response(JSON.stringify(ownerGrant), {
            status: 200,
            headers: { "content-type": "application/json" },
          });
        }
        return new Response(JSON.stringify(vendorGrant), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      },
    },
    navigate: (href) => navigations.push(href),
    location: { pathname: "/account/access/", search: "?role=pro&caseId=forged" },
  });

  assert.equal(result.state, "OWNER_GRANTED");
  assert.deepEqual(calls, ["owner-workspace-grant"]);
  assert.deepEqual(navigations, ["/pcm/owner/workspace/"]);

  const fallbackCalls = [];
  const fallbackNavigations = [];
  const fallback = await module.resumeAuthorizedSession({
    authRuntime: {
      async getSession() { return { access_token: "real-session-token" }; },
      async authenticatedFetch(endpoint) {
        fallbackCalls.push(endpoint);
        if (endpoint === "owner-workspace-grant") {
          return new Response(JSON.stringify({ state: "CASE_NOT_AUTHORIZED" }), { status: 403 });
        }
        return new Response(JSON.stringify(vendorGrant), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      },
    },
    navigate: (href) => fallbackNavigations.push(href),
    location: { pathname: "/account/access/" },
  });

  assert.equal(fallback.state, "VENDOR_GRANTED");
  assert.deepEqual(fallbackCalls, ["owner-workspace-grant", "vendor-workspace-grant"]);
  assert.deepEqual(fallbackNavigations, ["/pcm/vendor/workspace/"]);

  let nonCanonicalSessionCalls = 0;
  let nonCanonicalFetchCalls = 0;
  const nonCanonicalNavigations = [];
  const nonCanonical = await module.resumeAuthorizedSession({
    authRuntime: {
      async getSession() {
        nonCanonicalSessionCalls += 1;
        return { access_token: "real-session-token" };
      },
      async authenticatedFetch() {
        nonCanonicalFetchCalls += 1;
        return new Response(JSON.stringify(ownerGrant), { status: 200 });
      },
    },
    navigate: (href) => nonCanonicalNavigations.push(href),
    location: { pathname: "/account/access", search: "?role=owner&caseId=forged" },
  });

  assert.equal(nonCanonical.state, "ACCESS_DENIED");
  assert.equal(nonCanonicalSessionCalls, 0);
  assert.equal(nonCanonicalFetchCalls, 0);
  assert.deepEqual(nonCanonicalNavigations, []);

  const harness = createRegistrationDomHarness();
  const initializedCalls = [];
  const initializedNavigations = [];
  module.initAccountAccess(harness.rootDocument, {
    authRuntimePromise: Promise.resolve({
      async getSession() { return { access_token: "real-session-token" }; },
      async authenticatedFetch(endpoint) {
        initializedCalls.push(endpoint);
        return new Response(JSON.stringify(ownerGrant), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      },
    }),
    navigate: (href) => initializedNavigations.push(href),
    location: { pathname: "/account/access/", search: "?role=invited-partner&caseId=forged" },
  });
  await new Promise((resolve) => setImmediate(resolve));

  assert.deepEqual(initializedCalls, ["owner-workspace-grant"]);
  assert.deepEqual(initializedNavigations, ["/pcm/owner/workspace/"]);
});

test("registration validates the real account fields before creating a Supabase account", async () => {
  const module = await import(new URL(`../src/stitch_laibe_landing_onboarding/pcm_standalone/account_access/app.js?test=${Date.now()}`, import.meta.url));
  assert.deepEqual(module.validateRegister({
    accountType: "company", company: "", name: "", phone: "", region: "", email: "x", password: "123", agree: false, role: "",
  }), {
    company: "請輸入公司名稱。", name: "請輸入姓名。", phone: "請輸入聯絡電話。", region: "請選擇所在縣市。", email: "請輸入有效的 Email。", password: "密碼至少需要 8 碼。", agree: "請先閱讀並同意使用說明。", role: "請選擇你目前的使用角色。",
  });
  assert.equal(app.includes("UNAVAILABLE_MESSAGE"), false);
  assert.match(app, /signUpWithPassword/u);
});

test("A0 keeps one shared owner and vendor login with Email password and one login action", () => {
  assert.match(html, /建立帳號，開始整理裝修決策。/u);
  assert.match(html, /data-mode-tab="register"[\s\S]*data-mode-tab="login"/u);
  const loginMarkup = html.match(/<form class="fc-b" id="loginForm"[\s\S]*?<\/form>/u)?.[0] ?? "";
  assert.match(loginMarkup, /Email/u);
  assert.match(loginMarkup, /type="password"/u);
  assert.match(loginMarkup, /name="password"/u);
  assert.match(loginMarkup, /autocomplete="current-password"/u);
  assert.match(loginMarkup, /登入帳號/u);
  assert.doesNotMatch(loginMarkup, /寄送登入連結/u);
  assert.match(loginMarkup, /案件權限/u);
});

test("Account Access presents the owner contract-management purpose only for its fixed intent", async () => {
  const module = await import(new URL(`../src/stitch_laibe_landing_onboarding/pcm_standalone/account_access/app.js?intent=${Date.now()}`, import.meta.url));

  assert.equal(
    module.accountAccessIntentMessage({ search: "?intent=owner-contract-management" }),
    "登入後預計前往甲方工作台的契約管理。",
  );
  assert.equal(module.accountAccessIntentMessage({ search: "?intent=unexpected" }), "");
  assert.match(html, /data-account-intent/);
});

test("canonical Account Access opens the shared login mode while registration remains available", async () => {
  const module = await import(new URL(`../src/stitch_laibe_landing_onboarding/pcm_standalone/account_access/app.js?intent-mode=${Date.now()}`, import.meta.url));
  const intended = createRegistrationDomHarness();
  module.initAccountAccess(intended.rootDocument, {
    location: { search: "?intent=owner-contract-management" },
  });

  assert.equal(intended.rootDocument.documentElement.dataset.accountMode, "login");
  assert.equal(intended.loginForm.hidden, false);
  assert.equal(intended.form.hidden, true);
  assert.equal(intended.title.textContent, "登入 LaiBE 帳號");

  const defaultEntry = createRegistrationDomHarness();
  module.initAccountAccess(defaultEntry.rootDocument, { location: { search: "" } });
  assert.equal(defaultEntry.rootDocument.documentElement.dataset.accountMode, "login");
  assert.equal(defaultEntry.form.hidden, true);
  assert.equal(defaultEntry.loginForm.hidden, false);

  defaultEntry.registerTab.dispatch("click");
  assert.equal(defaultEntry.rootDocument.documentElement.dataset.accountMode, "register");
  assert.equal(defaultEntry.form.hidden, false);
  assert.equal(defaultEntry.loginForm.hidden, true);
});

test("canonical geometry and visual tokens survive the split", () => {
  assert.match(css, /--bg:\s*#06080a/i);
  assert.match(css, /--accent:\s*#ff8a2b/i);
  assert.match(css, /--accent-2:\s*#EB581E/i);
  assert.match(
    css,
    /html\[data-account-mode="login"\]\s+\.reg-grid\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*540px\)\s+minmax\(0,\s*1fr\)/s,
  );
  assert.match(css, /html\[data-account-mode="login"\]\s+\.intro\s*\{[^}]*display:\s*none/s);
  assert.match(css, /\.shell\s*\{[^}]*width:\s*min\(1080px,\s*calc\(100vw\s*-\s*44px\)\)/s);
  assert.match(css, /\.reg-grid\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\)\s+minmax\(380px,\s*440px\)/s);
  assert.match(css, /\.reg-grid\s*\{[^}]*gap:\s*32px/s);
  assert.match(css, /\.form-card\s*\{[^}]*border-radius:\s*20px/s);
  assert.match(css, /\.field input,\s*\.field select\s*\{[^}]*min-height:\s*46px/s);
  assert.match(css, /\.field input,\s*\.field select\s*\{[^}]*border-radius:\s*11px/s);
  assert.match(css, /\.btn\.primary\s*\{[^}]*border-radius:\s*999px/s);
  assert.match(css, /@media\s*\(max-width:\s*880px\)/);
});

test("hidden company field cannot be made visible by the field grid rule", () => {
  assert.match(css, /#companyField\[hidden\]\s*\{[^}]*display:\s*none\s*!important/s);
});

test("no untruthful integration, prohibited product framing, or engineering language is introduced", () => {
  assert.doesNotMatch(app, /XMLHttpRequest|WebSocket|sessionStorage|indexedDB|帳號已建立/u);
  assert.match(app, /localStorage/u);
  assert.match(app, /signInWithPassword/u);
  assert.match(app, /signUpWithPassword|resetPasswordForEmail|updatePassword/u);
  assert.doesNotMatch(app, /signInWithOtp|shouldCreateUser/u);
  assert.doesNotMatch(app, /service[_-]?role|secret[_-]?key/iu);
  assert.doesNotMatch(app, /user_metadata|app_metadata/u);
  for (const forbiddenTarget of [
    "../../client_awarding_dashboard/code.html",
    "../vendor_workspace/code.html",
  ]) {
    assert.equal(html.includes(forbiddenTarget), false, `html duplicates canonical href: ${forbiddenTarget}`);
    assert.equal(publicContract.includes(forbiddenTarget), false, `public contract duplicates canonical href: ${forbiddenTarget}`);
    assert.equal(routeManifest.includes(forbiddenTarget), true, `manifest owns canonical href: ${forbiddenTarget}`);
  }
  assert.doesNotMatch(app, /UNAVAILABLE_MESSAGE/u);
  const forbidden = ["媒合", "標案", "招標", "付款", "金流託管", "老屋投資", "投資報酬", "raw JSON", "stack trace", "mock-only", "debug", "無 DB", "API 未開", "onboarding"];
  for (const term of forbidden) assert.equal(html.includes(term), false, `forbidden visible term: ${term}`);
});

test("Account Access exposes no DRS copy or DRS login role", async () => {
  const module = await import(new URL(`../src/stitch_laibe_landing_onboarding/pcm_standalone/account_access/app.js?account-roles=${Date.now()}`, import.meta.url));

  assert.doesNotMatch(html, /\bDRS\b/u);
  assert.doesNotMatch(app, /\bDRS\b|drs-specialist|data-drs-channel-note/u);
  assert.deepEqual(module.validateLogin({
    email: "reviewer@example.com",
    password: "account88",
    role: "drs-specialist",
  }), { role: "請選擇你目前的使用角色。" });
});
