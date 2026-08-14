const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const UNAVAILABLE_MESSAGE = "帳號功能正在整理中，正式開放後會提供完整操作入口。";

function valueOf(value) {
  return typeof value === "string" ? value.trim() : "";
}

export function validateRegister(values = {}) {
  const errors = {};
  const name = valueOf(values.name);
  const email = valueOf(values.email);
  const password = typeof values.password === "string" ? values.password : "";
  const passwordConfirm = typeof values.passwordConfirm === "string" ? values.passwordConfirm : "";
  const role = valueOf(values.role);

  if (!name) errors.name = "請輸入姓名。";
  if (!EMAIL_PATTERN.test(email)) errors.email = "請輸入有效的 Email。";
  if (password.length < 8) errors.password = "密碼至少需要 8 碼。";
  if (!passwordConfirm) errors.passwordConfirm = "請再次輸入密碼。";
  else if (passwordConfirm !== password) errors.passwordConfirm = "兩次輸入的密碼不一致。";
  if (!role) errors.role = "請選擇你目前的使用角色。";

  return errors;
}

export function validateLogin(values = {}) {
  const errors = {};
  const email = valueOf(values.email);
  const password = typeof values.password === "string" ? values.password : "";

  if (!EMAIL_PATTERN.test(email)) errors.email = "請輸入有效的 Email。";
  if (!password) errors.password = "請輸入密碼。";

  return errors;
}

export function errorFieldKey(fieldName) {
  return fieldName.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
}

function formValues(form) {
  return {
    name: form.elements.namedItem("name")?.value ?? "",
    email: form.elements.namedItem("email")?.value ?? "",
    password: form.elements.namedItem("password")?.value ?? "",
    passwordConfirm: form.elements.namedItem("passwordConfirm")?.value ?? "",
    role: form.elements.namedItem("role")?.value ?? "",
  };
}

function clearErrors(form, mode) {
  form.querySelectorAll("[aria-invalid]").forEach((field) => field.removeAttribute("aria-invalid"));
  form.querySelectorAll(`[data-field-error^="${mode}-"]`).forEach((target) => {
    target.textContent = "";
  });
}

function showErrors(form, mode, errors) {
  clearErrors(form, mode);
  for (const [fieldName, message] of Object.entries(errors)) {
    const input = form.elements.namedItem(fieldName);
    if (input && input.type !== "hidden") input.setAttribute("aria-invalid", "true");
    const target = form.querySelector(`[data-field-error="${mode}-${errorFieldKey(fieldName)}"]`);
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
    label.textContent = busy
      ? "正在確認服務狀態…"
      : form.dataset.accountForm === "register"
        ? "建立帳號"
        : "登入帳號";
  }
}

function focusFirstError(form, errors) {
  const firstName = Object.keys(errors).find((name) => name !== "role");
  if (firstName) form.elements.namedItem(firstName)?.focus();
  else form.querySelector("[data-role-option]")?.focus();
}

function handleSubmit(form) {
  const mode = form.dataset.accountForm;
  const values = formValues(form);
  const errors = mode === "register" ? validateRegister(values) : validateLogin(values);

  showErrors(form, mode, errors);
  if (Object.keys(errors).length) {
    setStatus(form, "請確認標示欄位後再送出。", "error");
    focusFirstError(form, errors);
    return;
  }

  setBusy(form, true);
  setStatus(form, "正在確認帳號服務狀態…");
  window.setTimeout(() => {
    setBusy(form, false);
    setStatus(form, UNAVAILABLE_MESSAGE, "notice");
    const password = form.elements.namedItem("password");
    const passwordConfirm = form.elements.namedItem("passwordConfirm");
    if (password) password.value = "";
    if (passwordConfirm) passwordConfirm.value = "";
  }, 360);
}

function selectMode(root, mode) {
  root.documentElement.dataset.accountMode = mode;
  root.querySelectorAll("[data-mode-tab]").forEach((tab) => {
    const active = tab.dataset.modeTab === mode;
    tab.setAttribute("aria-selected", String(active));
    tab.tabIndex = active ? 0 : -1;
  });
  root.querySelectorAll("[data-account-form]").forEach((form) => {
    form.hidden = form.dataset.accountForm !== mode;
  });

  const isRegister = mode === "register";
  const title = root.querySelector("[data-card-title]");
  const badge = root.querySelector("[data-mode-badge]");
  const description = root.querySelector("[data-mode-description]");
  if (title) title.textContent = isRegister ? "建立 LaiBE 帳號" : "登入 LaiBE 帳號";
  if (badge) badge.textContent = isRegister ? "註冊" : "登入";
  if (description) description.textContent = isRegister
    ? "第一次使用？先選擇角色並填寫基本資料。"
    : "已有帳號？輸入 Email 與密碼繼續。";
}

function selectRole(form, selected) {
  const roleInput = form.elements.namedItem("role");
  form.querySelectorAll("[data-role-option]").forEach((button) => {
    button.setAttribute("aria-pressed", String(button === selected));
  });
  if (roleInput) roleInput.value = selected.dataset.roleOption ?? "";
  const roleError = form.querySelector('[data-field-error="register-role"]');
  if (roleError) roleError.textContent = "";
}

export function initAccountAccess(root = document) {
  const page = root.querySelector("[data-account-access-page]");
  if (!page) return;

  root.querySelectorAll("[data-mode-tab]").forEach((tab) => {
    tab.addEventListener("click", () => selectMode(root, tab.dataset.modeTab));
    tab.addEventListener("keydown", (event) => {
      if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
      event.preventDefault();
      const nextMode = tab.dataset.modeTab === "register" ? "login" : "register";
      selectMode(root, nextMode);
      root.querySelector(`[data-mode-tab="${nextMode}"]`)?.focus();
    });
  });

  const registerForm = root.querySelector('[data-account-form="register"]');
  registerForm?.querySelectorAll("[data-role-option]").forEach((button) => {
    button.addEventListener("click", () => selectRole(registerForm, button));
  });

  root.querySelectorAll("[data-account-form]").forEach((form) => {
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      handleSubmit(form);
    });
  });

  selectMode(root, "register");
}

if (typeof document !== "undefined") initAccountAccess(document);
