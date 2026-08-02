import {
  getOwnerOnboardingReadiness,
  REQUIRED_OWNER_DOCUMENTS,
  validateOwnerDocuments,
} from "../public/owner-onboarding-contract.js";
import {
  getOwnerRegistrationReadiness,
  OWNER_REGISTRATION_FIELDS,
  validateOwnerRegistration,
} from "../public/owner-registration-contract.js";

const boundDocumentForms = new WeakMap();
const boundOwnerStarts = new WeakMap();

function collectOwnerDocuments(form) {
  const documents = {};

  for (const document of REQUIRED_OWNER_DOCUMENTS) {
    const input = form.elements?.namedItem?.(document.id) ??
      form.querySelector?.(`[name="${document.id}"]`);
    documents[document.id] = input?.files?.[0];
  }

  return Object.freeze(documents);
}

function setControlsDisabled(controls, disabled) {
  Array.from(controls ?? []).forEach((control) => {
    control.disabled = disabled;
  });
}

function bindOwnerSubmission(form, state) {
  const existing = boundDocumentForms.get(form);
  if (existing) {
    Object.assign(existing, state);
    return existing;
  }

  const binding = {
    ...state,
    submitted: false,
    submitting: false,
  };

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (
      binding.submitting ||
      binding.submitted ||
      !binding.readiness.ready ||
      typeof binding.writer !== "function"
    ) {
      return;
    }

    const documents = collectOwnerDocuments(form);
    const validation = validateOwnerDocuments(documents);
    if (!validation.valid) {
      binding.message.textContent = Object.values(validation.errors).join(" ");
      return;
    }

    binding.submitting = true;
    setControlsDisabled(binding.controls, true);
    binding.stateTarget.dataset.readiness = "submitting";
    binding.message.textContent = "文件送出中，請稍候。";

    try {
      await binding.writer(documents);
      binding.submitted = true;
      binding.stateTarget.dataset.readiness = "submitted";
      binding.message.textContent =
        "文件已送出，萊比將依本次提供的版本整理基本檢討報告。";
    } catch {
      binding.stateTarget.dataset.readiness = "ready";
      binding.message.textContent = "文件暫時無法送出，請確認連線後再試一次。";
      setControlsDisabled(binding.controls, false);
    } finally {
      binding.submitting = false;
    }
  });

  boundDocumentForms.set(form, binding);
  return binding;
}

export function applyOwnerOnboardingReadiness(
  root,
  config = globalThis.PCM_OWNER_ONBOARDING_CONFIG ?? {},
) {
  if (!root) {
    return getOwnerOnboardingReadiness(config);
  }

  const readiness = getOwnerOnboardingReadiness(config);
  const message = root.querySelector("[data-readiness-message]");
  const controls = root.querySelectorAll("[data-requires-readiness]");
  const form = root.querySelector("form.document-form");

  if (message) {
    message.textContent = readiness.message;
  }

  setControlsDisabled(controls, !readiness.ready);

  const stateTarget = root.documentElement ?? root;
  stateTarget.dataset.readiness = readiness.ready ? "ready" : "closed";

  if (
    message &&
    form &&
    typeof form.addEventListener === "function"
  ) {
    const binding = bindOwnerSubmission(form, {
      controls,
      message,
      readiness,
      stateTarget,
      writer: config.intakeWriter,
    });

    if (binding.submitted) {
      setControlsDisabled(controls, true);
      stateTarget.dataset.readiness = "submitted";
    }
  }

  return readiness;
}

function formControl(form, name) {
  return form?.elements?.namedItem?.(name) ??
    form?.querySelector?.(`[name="${name}"]`) ??
    null;
}

function collectRegistrationValues(form) {
  return {
    account_type: formControl(form, "account_type")?.value,
    company_name: formControl(form, "company_name")?.value,
    contact_name: formControl(form, "contact_name")?.value,
    mobile: formControl(form, "mobile")?.value,
    region: formControl(form, "region")?.value,
    email: formControl(form, "email")?.value,
    password: formControl(form, "password")?.value,
    terms_accepted: formControl(form, "terms_accepted")?.checked === true,
  };
}

function controlsFromField(field) {
  if (!field) {
    return [];
  }

  if (
    typeof field.length === "number" &&
    typeof field !== "string" &&
    typeof field.setAttribute !== "function"
  ) {
    return Array.from(field);
  }

  return [field];
}

function setFieldInvalid(field, invalid) {
  for (const control of controlsFromField(field)) {
    if (invalid) {
      control.setAttribute?.("aria-invalid", "true");
    } else {
      control.removeAttribute?.("aria-invalid");
    }
  }
}

function renderRegistrationErrors(root, form, errors = {}) {
  for (const { name } of OWNER_REGISTRATION_FIELDS) {
    const message = root.querySelector(`[data-error-for="${name}"]`);
    if (message) {
      message.textContent = errors[name] ?? "";
    }
    setFieldInvalid(formControl(form, name), Boolean(errors[name]));
  }
}

function isLoginReady(config) {
  return config.auth === true && typeof config.loginWriter === "function";
}

function isOwnerStartReady(config) {
  const intakeReady = getOwnerOnboardingReadiness(config).ready;

  if (config.authenticatedOwner === true) {
    return intakeReady;
  }

  return getOwnerRegistrationReadiness(config).ready &&
    intakeReady &&
    isLoginReady(config);
}

function setOwnerSurfaceMode(binding, ready) {
  binding.stateTarget.dataset.ownerMode = ready
    ? "ready"
    : "preparation-only";

  if (binding.preparationOnly) {
    binding.preparationOnly.hidden = ready;
  }
  if (binding.readyRegistration) {
    binding.readyRegistration.hidden = !ready;
  }
  if (binding.preparationNav) {
    binding.preparationNav.hidden = ready;
  }
  if (binding.readyNav) {
    binding.readyNav.hidden = !ready;
  }

  if (!ready) {
    binding.phase = "preparation";
    binding.stateTarget.dataset.ownerPhase = "preparation";
    if (binding.registrationPhase) {
      binding.registrationPhase.hidden = true;
    }
    if (binding.loginPhase) {
      binding.loginPhase.hidden = true;
    }
    if (binding.documentPhase) {
      binding.documentPhase.hidden = true;
    }
  }
}

function updateCompanyField(binding) {
  const accountType = formControl(
    binding.registrationForm,
    "account_type",
  )?.value;
  const companyInput = formControl(
    binding.registrationForm,
    "company_name",
  );
  const isCompany = accountType === "company";

  if (binding.companyField) {
    binding.companyField.hidden = !isCompany;
  }
  if (companyInput) {
    companyInput.required = isCompany;
  }
}

function setOwnerPhase(binding, phase) {
  const previousPhase = binding.phase;
  binding.phase = phase;
  binding.stateTarget.dataset.ownerPhase = phase;

  if (binding.registrationPhase) {
    binding.registrationPhase.hidden = phase !== "registration";
  }
  if (binding.loginPhase) {
    binding.loginPhase.hidden = phase !== "login";
  }
  if (binding.documentPhase) {
    binding.documentPhase.hidden = phase !== "documents";
  }

  if (binding.cardStage) {
    binding.cardStage.textContent = phase === "documents"
      ? "步驟 2／2"
      : phase === "login"
      ? "帳號確認"
      : "步驟 1／2";
  }
  if (binding.cardTitle) {
    binding.cardTitle.textContent = phase === "documents"
      ? "文件送件"
      : phase === "login"
      ? "甲方登入"
      : "甲方註冊";
  }
  if (binding.cardSwitch) {
    binding.cardSwitch.hidden = phase !== "registration";
  }

  if (phase === "documents") {
    applyOwnerOnboardingReadiness(binding.root, binding.config);
    if (previousPhase && previousPhase !== "documents") {
      binding.documentPhase?.focus?.({ preventScroll: false });
    }
  } else {
    applyOwnerOnboardingReadiness(binding.root, {
      ...binding.config,
      auth: false,
    });
  }
}

function refreshOwnerStart(binding) {
  const registrationReadiness = getOwnerRegistrationReadiness(binding.config);
  const surfaceReady = isOwnerStartReady(binding.config);
  binding.registrationReadiness = registrationReadiness;

  if (binding.registrationMessage && !binding.accountSubmitting) {
    binding.registrationMessage.textContent = registrationReadiness.message;
  }
  if (binding.accountSubmit) {
    binding.accountSubmit.disabled = binding.accountSubmitting ||
      !surfaceReady ||
      !registrationReadiness.ready;
  }

  const loginReady = isLoginReady(binding.config);
  if (binding.loginMessage && !binding.loginSubmitting) {
    binding.loginMessage.textContent = loginReady
      ? "輸入甲方帳號後，即可繼續準備案件文件。"
      : "正式登入設定完成後即可使用；目前不會建立示意登入狀態。";
  }
  if (binding.loginSubmit) {
    binding.loginSubmit.disabled = binding.loginSubmitting ||
      !surfaceReady ||
      !loginReady;
  }

  updateCompanyField(binding);
  setOwnerSurfaceMode(binding, surfaceReady);

  if (!surfaceReady) {
    applyOwnerOnboardingReadiness(binding.root, {
      ...binding.config,
      auth: false,
    });
    return;
  }

  setOwnerPhase(
    binding,
    binding.config.authenticatedOwner === true
      ? "documents"
      : binding.phase ?? "registration",
  );
}

function bindOwnerStartEvents(binding) {
  binding.registrationForm?.addEventListener?.("change", () => {
    updateCompanyField(binding);
  });

  binding.showLogin?.addEventListener?.("click", () => {
    setOwnerPhase(binding, "login");
  });

  binding.showRegistration?.addEventListener?.("click", () => {
    setOwnerPhase(binding, "registration");
  });

  binding.registrationForm?.addEventListener?.("submit", async (event) => {
    event.preventDefault();

    const readiness = getOwnerRegistrationReadiness(binding.config);
    if (
      binding.accountSubmitting ||
      !readiness.ready ||
      !isOwnerStartReady(binding.config)
    ) {
      return;
    }

    const validation = validateOwnerRegistration(
      collectRegistrationValues(binding.registrationForm),
    );
    renderRegistrationErrors(
      binding.root,
      binding.registrationForm,
      validation.errors,
    );

    if (!validation.valid) {
      if (binding.registrationMessage) {
        binding.registrationMessage.textContent =
          "請確認標示欄位後，再建立甲方帳號。";
      }
      return;
    }

    binding.accountSubmitting = true;
    if (binding.accountSubmit) {
      binding.accountSubmit.disabled = true;
    }
    if (binding.registrationMessage) {
      binding.registrationMessage.textContent = "甲方帳號建立中，請稍候。";
    }

    try {
      await binding.config.accountWriter(validation.values);
      const password = formControl(binding.registrationForm, "password");
      if (password) {
        password.value = "";
      }
      if (binding.registrationMessage) {
        binding.registrationMessage.textContent =
          "甲方帳號已建立，請接著提供兩份案件文件。";
      }
      setOwnerPhase(binding, "documents");
    } catch {
      const password = formControl(binding.registrationForm, "password");
      if (password) {
        password.value = "";
      }
      if (binding.registrationMessage) {
        binding.registrationMessage.textContent =
          "暫時無法建立帳號，請確認資料後再試一次。";
      }
      setOwnerPhase(binding, "registration");
    } finally {
      binding.accountSubmitting = false;
      if (binding.accountSubmit && binding.phase === "registration") {
        binding.accountSubmit.disabled = !getOwnerRegistrationReadiness(
          binding.config,
        ).ready;
      }
    }
  });

  binding.loginForm?.addEventListener?.("submit", async (event) => {
    event.preventDefault();

    if (
      binding.loginSubmitting ||
      !isLoginReady(binding.config) ||
      !isOwnerStartReady(binding.config)
    ) {
      return;
    }

    const emailControl = formControl(binding.loginForm, "email");
    const passwordControl = formControl(binding.loginForm, "password");
    const email = typeof emailControl?.value === "string"
      ? emailControl.value.trim().toLowerCase()
      : "";
    const password = typeof passwordControl?.value === "string"
      ? passwordControl.value
      : "";

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || password.length === 0) {
      if (binding.loginMessage) {
        binding.loginMessage.textContent = "請填寫正確的 Email 與密碼。";
      }
      return;
    }

    binding.loginSubmitting = true;
    if (binding.loginSubmit) {
      binding.loginSubmit.disabled = true;
    }
    if (binding.loginMessage) {
      binding.loginMessage.textContent = "帳號確認中，請稍候。";
    }

    try {
      await binding.config.loginWriter({ email, password });
      passwordControl.value = "";
      setOwnerPhase(binding, "documents");
    } catch {
      passwordControl.value = "";
      if (binding.loginMessage) {
        binding.loginMessage.textContent =
          "暫時無法登入，請確認帳號資料後再試一次。";
      }
      setOwnerPhase(binding, "login");
    } finally {
      binding.loginSubmitting = false;
      if (binding.loginSubmit && binding.phase === "login") {
        binding.loginSubmit.disabled = !isLoginReady(binding.config);
      }
    }
  });
}

export function initializeOwnerStart(
  root,
  config = globalThis.PCM_OWNER_ONBOARDING_CONFIG ?? {},
) {
  if (!root) {
    return null;
  }

  const existing = boundOwnerStarts.get(root);
  if (existing) {
    existing.config = config;
    refreshOwnerStart(existing);
    return existing;
  }

  const binding = {
    root,
    config,
    stateTarget: root.documentElement ?? root,
    preparationOnly: root.querySelector("[data-preparation-only]"),
    readyRegistration: root.querySelector("[data-ready-registration]"),
    preparationNav: root.querySelector("[data-preparation-nav]"),
    readyNav: root.querySelector("[data-ready-nav]"),
    registrationPhase: root.querySelector("[data-registration-phase]"),
    loginPhase: root.querySelector("[data-login-phase]"),
    documentPhase: root.querySelector("[data-document-phase]"),
    registrationForm: root.querySelector("[data-registration-form]"),
    loginForm: root.querySelector("[data-login-form]"),
    registrationMessage: root.querySelector("[data-registration-message]"),
    loginMessage: root.querySelector("[data-login-message]"),
    cardStage: root.querySelector("[data-card-stage]"),
    cardTitle: root.querySelector("[data-card-title]"),
    cardSwitch: root.querySelector("[data-card-switch]"),
    companyField: root.querySelector("[data-company-field]"),
    accountSubmit: root.querySelector("[data-account-submit]"),
    loginSubmit: root.querySelector("[data-login-submit]"),
    showLogin: root.querySelector("[data-show-login]"),
    showRegistration: root.querySelector("[data-show-registration]"),
    accountSubmitting: false,
    loginSubmitting: false,
    phase: null,
  };

  bindOwnerStartEvents(binding);
  boundOwnerStarts.set(root, binding);
  refreshOwnerStart(binding);
  return binding;
}

if (typeof document !== "undefined") {
  initializeOwnerStart(document);
}
