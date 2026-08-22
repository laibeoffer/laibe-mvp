import { getActiveCanonicalLinkHref } from "../public/pcm-flow-route-manifest.js";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const OWNER_CONTRACT_MANAGEMENT_INTENT = "owner-contract-management";
const AUTH_STORAGE_KEY = "laibe.auth.session.v1";
const CANONICAL_ACCOUNT_ACCESS_PATH = "/account/access/";
const CANONICAL_OWNER_WORKSPACE_PATH = "/pcm/owner/workspace/";
const CANONICAL_VENDOR_WORKSPACE_PATH = "/pcm/vendor/workspace/";
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const OWNER_GRANT_KEYS = Object.freeze([
  "authenticatedUserId",
  "case",
  "currentCaseId",
  "documents",
  "membership",
  "schemaVersion",
  "serviceContext",
  "state",
  "workspaceAccess",
]);
const OWNER_MEMBERSHIP_KEYS = Object.freeze(["caseId", "role", "status", "userId"]);
const OWNER_ACCESS_KEYS = Object.freeze([
  "mutationAllowed",
  "payloadPolicy",
  "role",
  "writeActionsEnabled",
]);
const OWNER_CASE_KEYS = Object.freeze(["caseId", "status", "title"]);
const OWNER_SERVICE_KEYS = Object.freeze(["contractStatus", "pcmStatus"]);
const ALLOWED_FUNCTION_ENDPOINTS = new Set([
  "vendor-workspace-grant",
  "vendor-google-calendar-grant",
  "vendor-google-calendar-oauth-start",
  "owner-workspace-grant",
  "owner-google-calendar-grant",
  "owner-google-calendar-oauth-start",
]);

export const SUPABASE_PROJECT_URL = "https://zdwuyomhswjcbbpbhpcq.supabase.co";
export const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_jU9DCme4-MBAc-kQuU2BQQ_gfmjzgLa";
export const SUPABASE_JS_MODULE_URL = "https://esm.sh/@supabase/supabase-js@2.112.3";
export const CANONICAL_ACCOUNT_ACCESS_URL = "http://127.0.0.1:4173/account/access/";

export const OWNER_CONTRACT_INTENT_MESSAGE = "登入後預計前往甲方工作台的契約管理。";

const DEFAULT_ROUTES = Object.freeze({
  accountAccessInvitedPartnerLoginToVendorWorkspace: getActiveCanonicalLinkHref(
    "accountAccessInvitedPartnerLoginToVendorWorkspace",
  ),
});

export function accountAccessIntentMessage(location = globalThis.location) {
  try {
    const search = typeof location?.search === "string" ? location.search : "";
    return new URLSearchParams(search).get("intent") === OWNER_CONTRACT_MANAGEMENT_INTENT
      ? OWNER_CONTRACT_INTENT_MESSAGE
      : "";
  } catch {
    return "";
  }
}

function valueOf(value) {
  return typeof value === "string" ? value.trim() : "";
}

function isPermittedRole(role) {
  return role === "owner" || role === "invited-partner";
}

function isIdentity(value) {
  return typeof value === "string"
    && value.length > 0
    && value.length <= 512
    && value.trim() === value;
}

function ownValue(record, key) {
  if (!record || (typeof record !== "object" && typeof record !== "function")) return undefined;
  try {
    return Object.getOwnPropertyDescriptor(record, key)?.value;
  } catch {
    return undefined;
  }
}

function isExactDataRecord(record, expectedKeys) {
  if (record === null || typeof record !== "object") return false;
  try {
    const prototype = Object.getPrototypeOf(record);
    if (prototype !== Object.prototype && prototype !== null) return false;
    const keys = Reflect.ownKeys(record);
    if (keys.length !== expectedKeys.length) return false;
    return keys.every((key) => {
      if (typeof key !== "string" || !expectedKeys.includes(key)) return false;
      const descriptor = Object.getOwnPropertyDescriptor(record, key);
      return Boolean(descriptor && Object.prototype.hasOwnProperty.call(descriptor, "value"));
    });
  } catch {
    return false;
  }
}

function isTrustedOwnerWorkspaceGrant(grant) {
  if (!isExactDataRecord(grant, OWNER_GRANT_KEYS)) return false;
  const userId = ownValue(grant, "authenticatedUserId");
  const caseId = ownValue(grant, "currentCaseId");
  const membership = ownValue(grant, "membership");
  const workspaceAccess = ownValue(grant, "workspaceAccess");
  const caseRecord = ownValue(grant, "case");
  const serviceContext = ownValue(grant, "serviceContext");
  const documents = ownValue(grant, "documents");
  const title = ownValue(caseRecord, "title");
  return ownValue(grant, "schemaVersion") === "laibe.owner-workspace-runtime.v1"
    && ownValue(grant, "state") === "AUTHORIZED_OWNER_WORKSPACE"
    && typeof userId === "string"
    && UUID_PATTERN.test(userId)
    && typeof caseId === "string"
    && UUID_PATTERN.test(caseId)
    && isExactDataRecord(membership, OWNER_MEMBERSHIP_KEYS)
    && ownValue(membership, "userId") === userId
    && ownValue(membership, "caseId") === caseId
    && ownValue(membership, "role") === "owner"
    && ownValue(membership, "status") === "active"
    && isExactDataRecord(workspaceAccess, OWNER_ACCESS_KEYS)
    && ownValue(workspaceAccess, "role") === "owner"
    && ownValue(workspaceAccess, "mutationAllowed") === false
    && ownValue(workspaceAccess, "writeActionsEnabled") === false
    && ownValue(workspaceAccess, "payloadPolicy") === "AUTHORIZED_SCOPE_ONLY"
    && isExactDataRecord(caseRecord, OWNER_CASE_KEYS)
    && ownValue(caseRecord, "caseId") === caseId
    && ownValue(caseRecord, "status") === "active"
    && typeof title === "string"
    && title.trim() === title
    && title.length > 0
    && title.length <= 240
    && isExactDataRecord(serviceContext, OWNER_SERVICE_KEYS)
    && ownValue(serviceContext, "pcmStatus") === "UNAVAILABLE"
    && ownValue(serviceContext, "contractStatus") === "UNAVAILABLE"
    && Array.isArray(documents)
    && documents.length <= 200;
}

function isTrustedVendorWorkspaceGrant(grant) {
  const userId = ownValue(grant, "authenticatedUserId");
  const caseId = ownValue(grant, "currentCaseId");
  const membership = ownValue(grant, "membership");
  const workspaceAccess = ownValue(grant, "workspaceAccess");
  return ownValue(grant, "state") === "AUTHORIZED_VENDOR_WORKSPACE"
    && isIdentity(userId)
    && isIdentity(caseId)
    && ownValue(membership, "userId") === userId
    && ownValue(membership, "caseId") === caseId
    && ownValue(membership, "role") === "pro"
    && ownValue(membership, "status") === "active"
    && ownValue(workspaceAccess, "role") === "pro"
    && ownValue(workspaceAccess, "mutationAllowed") === false
    && ownValue(workspaceAccess, "writeActionsEnabled") === false;
}

function defaultNavigate(href) {
  globalThis.location?.assign?.(href);
}

export function validateRegister(values = {}) {
  const errors = {};
  const accountType = valueOf(values.accountType) || "personal";
  const company = valueOf(values.company);
  const name = valueOf(values.name);
  const phone = valueOf(values.phone);
  const region = valueOf(values.region);
  const email = valueOf(values.email);
  const password = typeof values.password === "string" ? values.password : "";
  const role = valueOf(values.role);

  if (accountType === "company" && !company) errors.company = "請輸入公司名稱。";
  if (!name) errors.name = "請輸入姓名。";
  if (!phone) errors.phone = "請輸入聯絡電話。";
  if (!region) errors.region = "請選擇所在縣市。";
  if (!EMAIL_PATTERN.test(email)) errors.email = "請輸入有效的 Email。";
  if (password.length < 8) errors.password = "密碼至少需要 8 碼。";
  if (!values.agree) errors.agree = "請先閱讀並同意使用說明。";
  if (!isPermittedRole(role)) errors.role = "請選擇你目前的使用角色。";
  return errors;
}

export function validateLogin(values = {}) {
  const errors = {};
  if (!EMAIL_PATTERN.test(valueOf(values.email))) errors.email = "請輸入有效的 Email。";
  if (typeof values.password !== "string" || values.password.length === 0) errors.password = "請輸入密碼。";
  if (!isPermittedRole(valueOf(values.role))) errors.role = "請選擇你目前的使用角色。";
  return errors;
}

export function validatePasswordRecoveryRequest(values = {}) {
  const errors = {};
  if (!EMAIL_PATTERN.test(valueOf(values.email))) errors.email = "請輸入有效的 Email。";
  return errors;
}

export function validatePasswordUpdate(values = {}) {
  const errors = {};
  const password = typeof values.password === "string" ? values.password : "";
  const confirmPassword = typeof values.confirmPassword === "string" ? values.confirmPassword : "";
  if (password.length < 8) errors.password = "新密碼至少需要 8 碼。";
  if (confirmPassword !== password) errors.confirmPassword = "兩次輸入的密碼不一致。";
  return errors;
}

export function isPasswordRecoveryReturn(location = globalThis.location) {
  if (location?.pathname !== CANONICAL_ACCOUNT_ACCESS_PATH) return false;
  const hash = typeof location?.hash === "string" ? location.hash.replace(/^#/u, "") : "";
  return new URLSearchParams(hash).get("type") === "recovery";
}

export function createSupabaseAuthRuntime({
  createClientImplementation,
  storage = globalThis.sessionStorage,
  fetchImplementation = globalThis.fetch,
  projectUrl = SUPABASE_PROJECT_URL,
  publishableKey = SUPABASE_PUBLISHABLE_KEY,
} = {}) {
  if (typeof createClientImplementation !== "function") throw new Error("AUTH_CLIENT_UNAVAILABLE");
  if (!storage || typeof fetchImplementation !== "function") throw new Error("AUTH_RUNTIME_UNAVAILABLE");

  const client = createClientImplementation(projectUrl, publishableKey, {
    auth: {
      storage,
      storageKey: AUTH_STORAGE_KEY,
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: "implicit",
    },
  });

  async function getSession() {
    const result = await client.auth.getSession();
    if (result?.error) throw new Error("AUTH_SESSION_UNAVAILABLE");
    return result?.data?.session ?? null;
  }

  async function signInWithPassword(email, password) {
    const result = await client.auth.signInWithPassword({
      email: valueOf(email),
      password: typeof password === "string" ? password : "",
    });
    if (result?.error || !result?.data?.session?.access_token) throw new Error("PASSWORD_SIGN_IN_UNAVAILABLE");
    return true;
  }

  async function signUpWithPassword(values = {}) {
    const result = await client.auth.signUp({
      email: valueOf(values.email),
      password: typeof values.password === "string" ? values.password : "",
      options: {
        emailRedirectTo: CANONICAL_ACCOUNT_ACCESS_URL,
        data: {
          account_type: valueOf(values.accountType) || "personal",
          company_name: valueOf(values.company),
          display_name: valueOf(values.name),
          phone: valueOf(values.phone),
          region: valueOf(values.region),
        },
      },
    });
    if (result?.error || !result?.data?.user) throw new Error("ACCOUNT_SIGN_UP_UNAVAILABLE");
    if (result?.data?.session?.access_token) {
      const signOutResult = await client.auth.signOut({ scope: "local" });
      if (signOutResult?.error) throw new Error("ACCOUNT_SIGN_UP_UNAVAILABLE");
    }
    return true;
  }

  async function requestPasswordRecovery(email) {
    const result = await client.auth.resetPasswordForEmail(valueOf(email), {
      redirectTo: CANONICAL_ACCOUNT_ACCESS_URL,
    });
    if (result?.error) throw new Error("PASSWORD_RECOVERY_UNAVAILABLE");
    return true;
  }

  function onPasswordRecovery(listener) {
    if (typeof listener !== "function" || typeof client.auth.onAuthStateChange !== "function") {
      throw new Error("PASSWORD_RECOVERY_LISTENER_UNAVAILABLE");
    }
    const result = client.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" && session?.access_token) listener();
    });
    const subscription = result?.data?.subscription;
    return () => subscription?.unsubscribe?.();
  }

  async function updatePassword(password) {
    if (typeof password !== "string" || password.length < 8) {
      throw new Error("PASSWORD_UPDATE_UNAVAILABLE");
    }
    const result = await client.auth.updateUser({ password });
    if (result?.error || !result?.data?.user) throw new Error("PASSWORD_UPDATE_UNAVAILABLE");
    const signOutResult = await client.auth.signOut({ scope: "local" });
    if (signOutResult?.error) throw new Error("PASSWORD_UPDATE_UNAVAILABLE");
    return true;
  }

  async function authenticatedFetch(endpoint, init = {}) {
    if (!ALLOWED_FUNCTION_ENDPOINTS.has(endpoint)) throw new Error("FUNCTION_ENDPOINT_NOT_ALLOWED");
    const session = await getSession();
    const accessToken = session?.access_token;
    if (!isIdentity(accessToken)) throw new Error("AUTH_REQUIRED");
    const headers = {
      ...(init.headers ?? {}),
      Authorization: `Bearer ${accessToken}`,
      apikey: publishableKey,
    };
    return fetchImplementation(`${projectUrl}/functions/v1/${endpoint}`, {
      ...init,
      credentials: "omit",
      headers,
    });
  }

  return Object.freeze({
    authenticatedFetch,
    getSession,
    onPasswordRecovery,
    requestPasswordRecovery,
    signInWithPassword,
    signUpWithPassword,
    updatePassword,
  });
}

let authRuntimePromise = null;

export function getSupabaseAuthRuntime({
  importImplementation = (moduleUrl) => import(moduleUrl),
  storage = globalThis.sessionStorage,
  fetchImplementation = globalThis.fetch,
} = {}) {
  if (!authRuntimePromise) {
    authRuntimePromise = Promise.resolve(importImplementation(SUPABASE_JS_MODULE_URL)).then((module) => (
      createSupabaseAuthRuntime({
        createClientImplementation: module?.createClient,
        storage,
        fetchImplementation,
      })
    ));
  }
  return authRuntimePromise;
}

export async function resumeVendorSession({
  authRuntime,
  navigate = defaultNavigate,
  routes = DEFAULT_ROUTES,
  location = globalThis.location,
} = {}) {
  try {
    const session = await authRuntime?.getSession?.();
    if (!session?.access_token) return Object.freeze({ state: "SIGNED_OUT" });
    const response = await authRuntime.authenticatedFetch("vendor-workspace-grant", { method: "GET" });
    if (!response?.ok) return Object.freeze({ state: "VENDOR_ACCESS_DENIED" });
    const grant = await response.json();
    if (!isTrustedVendorWorkspaceGrant(grant)) {
      return Object.freeze({ state: "VENDOR_ACCESS_DENIED" });
    }
    const pathname = typeof location?.pathname === "string" ? location.pathname : "";
    if (pathname !== CANONICAL_ACCOUNT_ACCESS_PATH) {
      return Object.freeze({ state: "VENDOR_ACCESS_DENIED" });
    }
    navigate(CANONICAL_VENDOR_WORKSPACE_PATH);
    return Object.freeze({ state: "VENDOR_GRANTED" });
  } catch {
    return Object.freeze({ state: "VENDOR_ACCESS_DENIED" });
  }
}

export async function resumeAuthorizedSession({
  authRuntime,
  navigate = defaultNavigate,
  routes = DEFAULT_ROUTES,
  location = globalThis.location,
  roleIntent = "",
} = {}) {
  const pathname = typeof location?.pathname === "string" ? location.pathname : "";
  if (pathname !== CANONICAL_ACCOUNT_ACCESS_PATH) {
    return Object.freeze({ state: "ACCESS_DENIED" });
  }

  try {
    const session = await authRuntime?.getSession?.();
    if (!session?.access_token) return Object.freeze({ state: "SIGNED_OUT" });

    if (roleIntent === "invited-partner") {
      const vendorResult = await resumeVendorSession({ authRuntime, navigate, routes, location });
      return vendorResult.state === "VENDOR_GRANTED"
        ? vendorResult
        : Object.freeze({ state: "ACCESS_DENIED" });
    }

    const ownerResponse = await authRuntime.authenticatedFetch("owner-workspace-grant", { method: "GET" });
    if (ownerResponse?.ok) {
      const ownerGrant = await ownerResponse.json();
      if (!isTrustedOwnerWorkspaceGrant(ownerGrant)) {
        return Object.freeze({ state: "ACCESS_DENIED" });
      }
      navigate(CANONICAL_OWNER_WORKSPACE_PATH);
      return Object.freeze({ state: "OWNER_GRANTED" });
    }
    if (ownerResponse?.status !== 403) {
      return Object.freeze({ state: "ACCESS_DENIED" });
    }

    if (roleIntent === "owner") {
      return Object.freeze({ state: "ACCESS_DENIED" });
    }

    const vendorResult = await resumeVendorSession({ authRuntime, navigate, routes, location });
    return vendorResult.state === "VENDOR_GRANTED"
      ? vendorResult
      : Object.freeze({ state: "ACCESS_DENIED" });
  } catch {
    return Object.freeze({ state: "ACCESS_DENIED" });
  }
}

export function errorFieldKey(fieldName) {
  return fieldName.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
}

function formValues(form) {
  return {
    accountType: form.elements.namedItem("accountType")?.value ?? "personal",
    company: form.elements.namedItem("company")?.value ?? "",
    name: form.elements.namedItem("name")?.value ?? "",
    phone: form.elements.namedItem("phone")?.value ?? "",
    region: form.elements.namedItem("region")?.value ?? "",
    email: form.elements.namedItem("email")?.value ?? "",
    password: form.elements.namedItem("password")?.value ?? "",
    confirmPassword: form.elements.namedItem("confirmPassword")?.value ?? "",
    agree: form.elements.namedItem("agree")?.checked ?? false,
    role: form.elements.namedItem("role")?.value ?? "",
  };
}

function clearErrors(root, form, mode) {
  form.querySelectorAll("[aria-invalid]").forEach((field) => field.removeAttribute("aria-invalid"));
  root.querySelectorAll(`[data-field-error^="${mode}-"]`).forEach((target) => { target.textContent = ""; });
  const roleError = root.querySelector("[data-role-error]");
  if (roleError) roleError.textContent = "";
  root.querySelector(".role-binding")?.removeAttribute("aria-invalid");
}

function showErrors(root, form, mode, errors) {
  clearErrors(root, form, mode);
  for (const [fieldName, message] of Object.entries(errors)) {
    const input = form.elements.namedItem(fieldName);
    if (input && input.type !== "hidden") input.setAttribute("aria-invalid", "true");
    if (fieldName === "role") root.querySelector(".role-binding")?.setAttribute("aria-invalid", "true");
    const target = fieldName === "role"
      ? root.querySelector("[data-role-error]")
      : root.querySelector(`[data-field-error="${mode}-${errorFieldKey(fieldName)}"]`);
    if (target) target.textContent = message;
  }
}

function setStatus(form, message, tone = "") {
  const status = form.querySelector("[data-form-status]");
  if (!status) return;
  status.textContent = message;
  if (tone) status.dataset.tone = tone;
  else delete status.dataset.tone;
}

function setBusy(form, busy) {
  const submit = form.querySelector("[data-submit-button]");
  const label = submit?.querySelector("[data-submit-label]");
  form.setAttribute("aria-busy", String(busy));
  if (submit) submit.disabled = busy;
  if (label) {
    const mode = form.dataset.accountForm;
    const busyLabels = {
      forgot: "正在寄送…",
      login: "正在登入…",
      recovery: "正在更新…",
      register: "正在建立…",
    };
    const readyLabels = {
      forgot: "寄送重設信",
      login: "登入帳號",
      recovery: "更新密碼",
      register: "建立帳號",
    };
    label.textContent = busy ? busyLabels[mode] : readyLabels[mode];
  }
}

function focusFirstError(root, form, errors) {
  if (errors.role) {
    root.querySelector("[data-role-option]")?.focus();
    return;
  }
  const first = Object.keys(errors).find((name) => name !== "role" && name !== "agree");
  if (first) form.elements.namedItem(first)?.focus();
  else form.elements.namedItem("agree")?.focus();
}

async function handleSubmit(root, form, runtime) {
  const mode = form.dataset.accountForm;
  const values = formValues(form);
  const validators = {
    forgot: validatePasswordRecoveryRequest,
    login: validateLogin,
    recovery: validatePasswordUpdate,
    register: validateRegister,
  };
  const errors = (validators[mode] ?? (() => ({ form: "無法辨識這次操作。" })))(values);
  showErrors(root, form, mode, errors);
  if (Object.keys(errors).length) {
    setStatus(form, errors.role ? "請先選擇使用角色後再送出。" : "請確認標示欄位後再送出。", "error");
    focusFirstError(root, form, errors);
    return;
  }

  if (mode === "login") {
    setBusy(form, true);
    setStatus(form, "正在確認帳號與案件資格…");
    try {
      const authRuntime = await runtime.authRuntimePromise;
      await authRuntime.signInWithPassword(valueOf(values.email), values.password);
      const result = await resumeAuthorizedSession({
        authRuntime,
        navigate: runtime.navigate,
        routes: runtime.routes,
        location: runtime.location,
        roleIntent: values.role,
      });
      if (result.state === "OWNER_GRANTED" || result.state === "VENDOR_GRANTED") {
        setStatus(form, "登入成功，正在開啟工作台…", "success");
      } else {
        setStatus(form, "帳號已登入，但目前沒有可開啟的案件。請確認選擇的角色與案件資格。", "notice");
      }
    } catch {
      setStatus(form, "登入失敗，請確認 Email 與密碼後再試。", "error");
    } finally {
      setBusy(form, false);
    }
    return;
  }

  if (mode === "register") {
    setBusy(form, true);
    setStatus(form, "正在建立帳號並準備驗證信…");
    try {
      const authRuntime = await runtime.authRuntimePromise;
      await authRuntime.signUpWithPassword(values);
      setStatus(form, "請前往 Email 完成驗證，再回到此頁登入。", "success");
      const password = form.elements.namedItem("password");
      if (password) password.value = "";
    } catch {
      setStatus(form, "目前無法建立帳號，請稍後再試。", "error");
    } finally {
      setBusy(form, false);
    }
    return;
  }

  if (mode === "forgot") {
    setBusy(form, true);
    setStatus(form, "正在準備重設密碼信…");
    try {
      const authRuntime = await runtime.authRuntimePromise;
      await authRuntime.requestPasswordRecovery(valueOf(values.email));
      setStatus(form, "如果這個 Email 已有帳號，我們已寄出重設密碼信。", "success");
    } catch {
      setStatus(form, "目前無法寄出重設密碼信，請稍後再試。", "error");
    } finally {
      setBusy(form, false);
    }
    return;
  }

  setBusy(form, true);
  setStatus(form, "正在更新密碼…");
  try {
    const authRuntime = await runtime.authRuntimePromise;
    await authRuntime.updatePassword(values.password);
    runtime.replaceUrl(CANONICAL_ACCOUNT_ACCESS_PATH);
    const password = form.elements.namedItem("password");
    const confirmPassword = form.elements.namedItem("confirmPassword");
    if (password) password.value = "";
    if (confirmPassword) confirmPassword.value = "";
    selectMode(root, "login");
    const loginForm = root.querySelector('[data-account-form="login"]');
    if (loginForm) setStatus(loginForm, "密碼已更新，請使用新密碼登入。", "success");
  } catch {
    setStatus(form, "重設連結可能已失效，請重新寄送重設密碼信。", "error");
  } finally {
    setBusy(form, false);
  }
}

function selectMode(root, mode) {
  root.documentElement.dataset.accountMode = mode;
  root.querySelectorAll("[data-mode-tab]").forEach((button) => {
    const active = button.dataset.modeTab === mode;
    button.classList.toggle("on", active);
    button.setAttribute("aria-pressed", String(active));
  });
  root.querySelectorAll("[data-account-form]").forEach((form) => { form.hidden = form.dataset.accountForm !== mode; });
  const roleBinding = root.querySelector(".role-binding");
  if (roleBinding) roleBinding.hidden = mode !== "login" && mode !== "register";
  const title = root.querySelector("#fcTitle");
  const switcher = root.querySelector("#fcSwitch");
  const titles = {
    forgot: "找回 LaiBE DRS 帳號",
    login: "登入 LaiBE DRS 帳號",
    recovery: "設定新的登入密碼",
    register: "建立 LaiBE DRS 帳號",
  };
  if (title) title.textContent = titles[mode] ?? titles.login;
  if (switcher) switcher.hidden = mode !== "register";
}

function selectAccountType(root, selected) {
  const form = root.querySelector('[data-account-form="register"]');
  const accountType = form?.elements.namedItem("accountType");
  root.querySelectorAll("#acctType [data-type]").forEach((button) => {
    const active = button === selected;
    button.classList.toggle("on", active);
    button.setAttribute("aria-pressed", String(active));
  });
  if (accountType) accountType.value = selected.dataset.type ?? "personal";
  const company = root.querySelector("#companyField");
  if (company) company.hidden = accountType?.value !== "company";
}

function selectRole(root, selected) {
  const role = selected.dataset.roleOption ?? "";
  root.querySelectorAll("[data-role-option]").forEach((button) => {
    button.setAttribute("aria-pressed", String(button === selected));
  });
  root.querySelectorAll("[data-account-form]").forEach((form) => {
    const roleInput = form.elements.namedItem("role");
    if (roleInput) roleInput.value = role;
  });
  const roleError = root.querySelector("[data-role-error]");
  if (roleError) roleError.textContent = "";
  root.querySelector(".role-binding")?.removeAttribute("aria-invalid");
  root.querySelectorAll("[data-account-form]").forEach((form) => {
    const status = form.querySelector("[data-form-status]");
    if (status?.dataset.tone === "error" && status.textContent.includes("使用角色")) setStatus(form, "");
  });
}

const defaultSchedule = (next, delay) => window.setTimeout(next, delay);
const defaultReplaceUrl = (href) => globalThis.history?.replaceState?.(null, "", href);

export function initAccountAccess(root = document, {
  schedule = defaultSchedule,
  location = globalThis.location,
  navigate = defaultNavigate,
  routes = DEFAULT_ROUTES,
  replaceUrl = defaultReplaceUrl,
  authRuntimePromise: suppliedAuthRuntimePromise = null,
} = {}) {
  const page = root.querySelector("[data-account-access-page]");
  if (!page) return;

  const runtimePromise = suppliedAuthRuntimePromise
    ?? (root === globalThis.document ? getSupabaseAuthRuntime() : null);

  const intent = root.querySelector("[data-account-intent]");
  const intentMessage = accountAccessIntentMessage(location);
  if (intent) {
    intent.textContent = intentMessage;
    intent.hidden = !intentMessage;
  }

  root.querySelectorAll("[data-mode-tab]").forEach((button) => {
    button.addEventListener("click", () => selectMode(root, button.dataset.modeTab));
  });
  root.querySelectorAll("#acctType [data-type]").forEach((button) => {
    button.addEventListener("click", () => selectAccountType(root, button));
  });
  root.querySelectorAll("[data-role-option]").forEach((button) => {
    button.addEventListener("click", () => selectRole(root, button));
  });
  root.querySelectorAll("[data-account-form]").forEach((form) => {
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      void handleSubmit(root, form, {
        schedule,
        authRuntimePromise: runtimePromise,
        navigate,
        routes,
        location,
        replaceUrl,
      });
    });
  });
  const recoveryReturn = isPasswordRecoveryReturn(location);
  selectMode(root, recoveryReturn ? "recovery" : "login");

  if (runtimePromise) {
    void Promise.resolve(runtimePromise)
      .then((authRuntime) => {
        try {
          authRuntime.onPasswordRecovery(() => selectMode(root, "recovery"));
        } catch {
          // The visible form remains fail-closed if the auth listener is unavailable.
        }
        return recoveryReturn
          ? Object.freeze({ state: "PASSWORD_RECOVERY" })
          : resumeAuthorizedSession({ authRuntime, navigate, routes, location });
      })
      .then((result) => {
        if (result.state !== "ACCESS_DENIED") return;
        const loginForm = root.querySelector('[data-account-form="login"]');
        if (loginForm) {
          selectMode(root, "login");
          setStatus(loginForm, "已完成登入，但目前沒有可開啟的案件。請確認登入 Email 與案件資格。", "notice");
        }
      })
      .catch(() => {});
  }
}

if (typeof document !== "undefined") initAccountAccess(document);
