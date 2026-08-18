const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const OWNER_CONTRACT_MANAGEMENT_INTENT = "owner-contract-management";

export const UNAVAILABLE_MESSAGE = "帳號功能尚未開放，正式開放後會先驗證角色，再進入相應工作台。";
export const OWNER_CONTRACT_INTENT_MESSAGE = "登入後預計前往甲方工作台的契約管理。";

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
  if (!valueOf(values.password)) errors.password = "請輸入密碼。";
  if (!isPermittedRole(valueOf(values.role))) errors.role = "請選擇你目前的使用角色。";
  return errors;
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
  if (label) label.textContent = busy ? "正在確認服務狀態…" : form.dataset.accountForm === "register" ? "送出申請" : "登入帳號";
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

function handleSubmit(root, form, runtime) {
  const mode = form.dataset.accountForm;
  const values = formValues(form);
  const errors = mode === "register" ? validateRegister(values) : validateLogin(values);
  showErrors(root, form, mode, errors);
  if (Object.keys(errors).length) {
    setStatus(form, errors.role ? "請先選擇使用角色後再送出。" : "請確認標示欄位後再送出。", "error");
    focusFirstError(root, form, errors);
    return;
  }

  if (mode === "login") {
    setStatus(form, UNAVAILABLE_MESSAGE, "notice");
    const password = form.elements.namedItem("password");
    if (password) password.value = "";
    return;
  }

  setBusy(form, true);
  setStatus(form, "正在確認帳號服務狀態…");
  runtime.schedule(() => {
    setBusy(form, false);
    setStatus(form, UNAVAILABLE_MESSAGE, "notice");
    const password = form.elements.namedItem("password");
    if (password) password.value = "";
  }, 360);
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
  if (roleBinding) roleBinding.hidden = false;
  const title = root.querySelector("#fcTitle");
  const switcher = root.querySelector("#fcSwitch");
  if (title) title.textContent = mode === "register" ? "建立 LaiBE DRS 帳號" : "登入 LaiBE DRS 帳號";
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

export function initAccountAccess(root = document, {
  schedule = defaultSchedule,
  location = globalThis.location,
} = {}) {
  const page = root.querySelector("[data-account-access-page]");
  if (!page) return;

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
      handleSubmit(root, form, { schedule });
    });
  });
  selectMode(root, intentMessage ? "login" : "register");
}

if (typeof document !== "undefined") initAccountAccess(document);
