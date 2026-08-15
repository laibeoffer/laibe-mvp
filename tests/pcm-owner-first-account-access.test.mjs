import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../src/stitch_laibe_landing_onboarding/pcm_standalone/account_access/", import.meta.url);
const html = await readFile(new URL("code.html", root), "utf8");
const css = await readFile(new URL("styles.css", root), "utf8");
const app = await readFile(new URL("app.js", root), "utf8");

function createRegistrationDomHarness() {
  const state = { activeElement: null };

  function element({ dataset = {}, type = "", value = "", checked = false } = {}) {
    const attributes = new Map();
    const listeners = new Map();
    return {
      dataset: { ...dataset },
      type,
      value,
      checked,
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
  const roleError = element();
  const roleBinding = element();
  const owner = element({ dataset: { roleOption: "owner" } });
  const invitedPartner = element({ dataset: { roleOption: "invited-partner" } });
  const registerTab = element({ dataset: { modeTab: "register" } });
  const loginTab = element({ dataset: { modeTab: "login" } });
  const title = element();
  const switcher = element();
  const submit = element();
  submit.querySelector = () => null;

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

  const rootDocument = {
    documentElement: { dataset: {} },
    querySelector(selector) {
      if (selector === "[data-account-access-page]") return {};
      if (selector === '[data-account-form="register"]') return form;
      if (selector === ".role-binding") return roleBinding;
      if (selector === '[data-field-error="register-role"]') return roleError;
      if (selector === "[data-role-option]") return owner;
      if (selector === "#fcTitle") return title;
      if (selector === "#fcSwitch") return switcher;
      return null;
    },
    querySelectorAll(selector) {
      if (selector === "[data-role-option]") return [owner, invitedPartner];
      if (selector === "[data-mode-tab]") return [registerTab, loginTab];
      if (selector === "[data-account-form]") return [form, loginForm];
      if (selector === '[data-field-error^="register-"]') return [roleError];
      return [];
    },
  };

  return { rootDocument, form, loginForm, fields, status, roleError, roleBinding, owner, invitedPartner, registerTab, loginTab, title, switcher, state };
}

test("account access is the canonical three-file registration surface", () => {
  assert.match(html, /href="\.\/styles\.css"/);
  assert.match(html, /src="\.\/app\.js"/);
  assert.ok(css.length > 1000);
  assert.ok(app.length > 500);
});

test("registration keeps the existing LaiBE DRS header and real navigation", () => {
  assert.match(html, /<header class="site-header" id="top">/);
  assert.match(html, /class="brand"[^>]*href="\.\.\/public_home\/code\.html#top"/);
  assert.match(html, /Decision &amp; Record System/);
  assert.match(html, /裝潢決策系統/);
  assert.match(html, /class="header-action"[^>]*href="\.\.\/public_home\/code\.html#top"[^>]*>返回 DRS 首頁<\/a>/);
  assert.match(html, /class="header-action header-action--primary"[^>]*href="\.\.\/quote_check\/code\.html"[^>]*>開始健檢<\/a>/);
  assert.match(css, /\.site-header\s*\{/);
  assert.match(css, /@media\s*\(max-width:\s*620px\)[\s\S]*\.site-header\s*\{/);
});

test("direct transplant preserves the canonical registration shell and left-hand explanation", () => {
  assert.match(html, /<body[^>]*data-laibe-page="register-owner"/);
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
  assert.match(html, /填寫資料[\s\S]*確認角色[\s\S]*完成申請/);
});

test("registration is first in the narrative while desktop keeps the explanation on the left", () => {
  assert.ok(
    html.indexOf('class="form-card"') < html.indexOf('class="intro"'),
    "the registration card must precede supporting explanation in DOM order",
  );
  assert.match(html, /<h1 id="fcTitle">建立 LaiBE DRS 帳號<\/h1>/);
  assert.match(html, /<h2 id="account-title">建立帳號，開始整理裝修決策。<\/h2>/);
  assert.equal((html.match(/<h1\b/g) ?? []).length, 1);
  assert.match(html, /<h3>填寫資料<\/h3>[\s\S]*<h3>確認角色<\/h3>[\s\S]*<h3>完成申請<\/h3>/);
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

test("registration binds the only permitted DRS roles outside the form with a visible error", () => {
  assert.match(html, /data-role-option="owner"/);
  assert.match(html, /甲方/);
  assert.match(html, /data-role-option="invited-partner"/);
  assert.match(html, /受邀乙方/);
  assert.match(html, /<input[^>]*name="role"[^>]*type="hidden"/);
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
  assert.equal(harness.owner.getAttribute("aria-pressed"), "true");
  assert.equal(harness.invitedPartner.getAttribute("aria-pressed"), "false");
  assert.equal(harness.roleError.textContent, "");
  assert.equal(harness.roleBinding.getAttribute("aria-invalid"), null);
  assert.equal(harness.status.textContent, "");

  harness.invitedPartner.dispatch("click");
  assert.equal(harness.fields.role.value, "invited-partner");
  assert.equal(harness.owner.getAttribute("aria-pressed"), "false");
  assert.equal(harness.invitedPartner.getAttribute("aria-pressed"), "true");
});

test("registration roles stay hidden while the login form is active", async () => {
  const module = await import(new URL(`../src/stitch_laibe_landing_onboarding/pcm_standalone/account_access/app.js?mode=${Date.now()}`, import.meta.url));
  const harness = createRegistrationDomHarness();
  module.initAccountAccess(harness.rootDocument);

  assert.equal(harness.roleBinding.hidden, false);
  assert.equal(harness.form.hidden, false);
  assert.equal(harness.loginForm.hidden, true);

  harness.loginTab.dispatch("click");
  assert.equal(harness.roleBinding.hidden, true);
  assert.equal(harness.form.hidden, true);
  assert.equal(harness.loginForm.hidden, false);

  harness.registerTab.dispatch("click");
  assert.equal(harness.roleBinding.hidden, false);
  assert.equal(harness.form.hidden, false);
  assert.equal(harness.loginForm.hidden, true);
  assert.match(css, /\.role-binding\[hidden\]\s*,\s*\.fc-b\[hidden\]\s*\{[^}]*display:\s*none/s);
});

test("registration stays a truthful unavailable account entry", async () => {
  const module = await import(new URL(`../src/stitch_laibe_landing_onboarding/pcm_standalone/account_access/app.js?test=${Date.now()}`, import.meta.url));
  assert.deepEqual(module.validateRegister({
    accountType: "company", company: "", name: "", phone: "", region: "", email: "x", password: "123", agree: false, role: "",
  }), {
    company: "請輸入公司名稱。", name: "請輸入姓名。", phone: "請輸入聯絡電話。", region: "請選擇所在縣市。", email: "請輸入有效的 Email。", password: "密碼至少需要 8 碼。", agree: "請先閱讀並同意使用說明。", role: "請選擇你目前的使用角色。",
  });
  assert.equal(module.UNAVAILABLE_MESSAGE, "帳號功能正在整理中，正式開放後會提供完整操作入口。");
});

test("canonical geometry and visual tokens survive the split", () => {
  assert.match(css, /--bg:\s*#06080a/i);
  assert.match(css, /--accent:\s*#ff8a2b/i);
  assert.match(css, /--accent-2:\s*#EB581E/i);
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
  assert.doesNotMatch(app, /fetch\s*\(|XMLHttpRequest|WebSocket|localStorage|sessionStorage|indexedDB/i);
  assert.doesNotMatch(app, /location\s*=|location\.href|window\.open|帳號已建立|登入成功/);
  assert.match(app, /UNAVAILABLE_MESSAGE/);
  assert.match(app, /password\.value\s*=\s*""/);
  const forbidden = ["媒合", "標案", "招標", "付款", "金流託管", "老屋投資", "投資報酬", "raw JSON", "stack trace", "mock-only", "debug", "無 DB", "API 未開", "案件", "工作台", "onboarding"];
  for (const term of forbidden) assert.equal(html.includes(term), false, `forbidden visible term: ${term}`);
});
