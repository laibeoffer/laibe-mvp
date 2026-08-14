import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../src/stitch_laibe_landing_onboarding/pcm_standalone/account_access/", import.meta.url);
const html = await readFile(new URL("code.html", root), "utf8");
const css = await readFile(new URL("styles.css", root), "utf8");
const app = await readFile(new URL("app.js", root), "utf8");

test("account access remains one exact three-file source package", () => {
  assert.match(html, /href="\.\/styles\.css"/);
  assert.match(html, /src="\.\/app\.js"/);
  assert.ok(css.length > 1000);
  assert.ok(app.length > 500);
});

test("first screen is a normal LaiBE account registration and login entry", () => {
  assert.match(html, /建立或登入 LaiBE 帳號/);
  assert.match(html, /role="tablist"/);
  assert.match(html, /data-mode-tab="register"[^>]*aria-selected="true"/);
  assert.match(html, /data-mode-tab="login"[^>]*aria-selected="false"/);
  assert.match(html, /data-account-form="register"/);
  assert.match(html, /data-account-form="login"/);
  assert.match(html, /返回 DRS 首頁/);
});

test("roles and three steps explain the account-only journey", () => {
  assert.match(html, /data-role-option="owner"/);
  assert.match(html, /甲方/);
  assert.match(html, /data-role-option="invited-partner"/);
  assert.match(html, /受邀乙方/);
  assert.match(html, /01[\s\S]*建立帳號/);
  assert.match(html, /02[\s\S]*確認使用角色/);
  assert.match(html, /03[\s\S]*開始整理資料/);
});

test("registration is not presented as a formal DRS case or contract", () => {
  assert.match(html, /註冊只會建立帳號與辨識使用角色/);
  assert.match(html, /不代表已建立正式 DRS 案件，也不代表已完成 DRS 服務契約/);
  assert.match(html, /專業檢討與正式案件協作只會在完成 DRS 服務契約後啟用/);
  assert.doesNotMatch(html, /帳號已建立|案件已建立|已完成簽約|已正式啟用/);
});

test("browsing draft stays URL-bound and leads only to a truthful preparation preview", () => {
  assert.match(html, /data-browsing-draft/);
  assert.match(html, /註冊後準備工作台預覽/);
  assert.match(app, /URLSearchParams/);
  assert.match(app, /client_awarding_dashboard\/code\.html/);
  assert.doesNotMatch(app, /localStorage|sessionStorage/);
});

test("forms expose understandable labels validation and status regions", () => {
  for (const label of ["姓名", "Email", "密碼", "確認密碼"]) {
    assert.match(html, new RegExp(`>${label}<`));
  }
  assert.match(html, /data-field-error="register-name"/);
  assert.match(html, /data-field-error="register-email"/);
  assert.match(html, /data-field-error="register-password"/);
  assert.match(html, /data-field-error="register-password-confirm"/);
  assert.match(html, /data-form-status="register"[^>]*aria-live="polite"/);
  assert.match(html, /data-form-status="login"[^>]*aria-live="polite"/);
  assert.match(html, /data-submit-label/);
});

test("runtime validates locally and ends in a truthful unavailable state", async () => {
  const module = await import(new URL(`../src/stitch_laibe_landing_onboarding/pcm_standalone/account_access/app.js?test=${Date.now()}`, import.meta.url));

  assert.deepEqual(module.validateRegister({ name: "", email: "x", password: "123", passwordConfirm: "456", role: "" }), {
    name: "請輸入姓名。",
    email: "請輸入有效的 Email。",
    password: "密碼至少需要 8 碼。",
    passwordConfirm: "兩次輸入的密碼不一致。",
    role: "請選擇你目前的使用角色。",
  });
  assert.deepEqual(module.validateLogin({ email: "", password: "" }), {
    email: "請輸入有效的 Email。",
    password: "請輸入密碼。",
  });
  assert.equal(module.UNAVAILABLE_MESSAGE, "帳號功能正在整理中，正式開放後會提供完整操作入口。");
});

test("registration asks for password confirmation when the field is empty", async () => {
  const module = await import(new URL(`../src/stitch_laibe_landing_onboarding/pcm_standalone/account_access/app.js?confirm=${Date.now()}`, import.meta.url));
  const errors = module.validateRegister({
    name: "測試使用者",
    email: "test@example.com",
    password: "testpass123",
    passwordConfirm: "",
    role: "owner",
  });
  assert.equal(errors.passwordConfirm, "請再次輸入密碼。");
});

test("camel case field names resolve to their visible error selectors", async () => {
  const module = await import(new URL(`../src/stitch_laibe_landing_onboarding/pcm_standalone/account_access/app.js?selector=${Date.now()}`, import.meta.url));
  assert.equal(module.errorFieldKey("passwordConfirm"), "password-confirm");
});

test("runtime has no persistence network redirect or fake success channel", () => {
  assert.doesNotMatch(app, /fetch\s*\(|XMLHttpRequest|WebSocket|localStorage|sessionStorage|indexedDB/i);
  assert.doesNotMatch(app, /location\s*=|location\.href|window\.open|帳號已建立|登入成功/);
  assert.match(app, /aria-busy/);
  assert.match(app, /UNAVAILABLE_MESSAGE/);
});

test("visible copy excludes matching payment investment and engineering language", () => {
  const forbidden = [
    "發案方",
    "接案方",
    "媒合",
    "標案",
    "招標",
    "上架費",
    "付款",
    "金流託管",
    "老屋投資",
    "投資報酬",
    "raw JSON",
    "stack trace",
    "mock-only",
    "debug",
    "無 DB",
    "API 未開",
  ];
  const visibleSource = html.replace(/<script[\s\S]*?<\/script>/g, "");
  for (const term of forbidden) assert.equal(visibleSource.includes(term), false, `forbidden visible term: ${term}`);
});

test("responsive CSS preserves one compact card and viewport-safe stacking", () => {
  assert.match(css, /grid-template-columns:\s*minmax\(0,\s*1fr\)\s+minmax\(360px,\s*440px\)/);
  assert.match(css, /@media\s*\(max-width:\s*880px\)/);
  assert.match(css, /grid-template-columns:\s*1fr/);
  assert.match(css, /overflow-x:\s*(?:clip|hidden)/);
  assert.match(css, /:focus-visible/);
  assert.match(css, /prefers-reduced-motion/);
});
