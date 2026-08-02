import {
  createIntakeRequest,
  getIntakeConfigReadiness,
  getSuccessViewModel,
  mapIntakeError,
  normalizeIntakeConfig,
  normalizeIntakePayload,
  validateIntake,
  validateSuccessResponse,
} from "../public/intake-contract.js";

const SECURITY_LOAD_ERROR = "安全驗證暫時無法載入，請稍後重試。";
const SECURITY_TIMEOUT_MS = 8000;

export function createSubmissionSession(
  uuidFactory = () => crypto.randomUUID(),
) {
  let id = "";
  let fingerprint = "";

  function renew(nextFingerprint) {
    id = uuidFactory();
    fingerprint = nextFingerprint;
    return id;
  }

  return Object.freeze({
    prepare(nextFingerprint) {
      return id && fingerprint === nextFingerprint
        ? id
        : renew(nextFingerprint);
    },
    restart(nextFingerprint = "") {
      return renew(nextFingerprint);
    },
    complete() {
      id = "";
      fingerprint = "";
    },
    current() {
      return id;
    },
  });
}

function readMeta(root, name) {
  return (
    root.querySelector(`meta[name="${name}"]`)?.getAttribute("content") ?? ""
  );
}

export function readRuntimeConfig(root, runtime = {}) {
  return normalizeIntakeConfig({
    meta: {
      endpoint: readMeta(root, "pcm-intake-endpoint"),
      turnstileSiteKey: readMeta(root, "pcm-turnstile-site-key"),
      providerName: readMeta(root, "pcm-service-provider-name"),
      privacyContact: readMeta(root, "pcm-privacy-rights-contact"),
      retentionPeriod: readMeta(root, "pcm-data-retention-period"),
    },
    runtime,
  });
}

function getFormValue(form, name) {
  return form.elements.namedItem(name)?.value ?? "";
}

function setText(root, selector, value) {
  const node = root.querySelector(selector);
  if (node) {
    node.textContent = value;
  }
}

export function createDomView(root) {
  const form = root.querySelector("[data-intake-form]");
  if (!form) {
    return null;
  }

  const submitButton = form.querySelector("[data-submit]");
  const readinessNode = root.querySelector("[data-readiness]");
  const restartButton = root.querySelector("[data-restart]");
  const securityRetryButton = root.querySelector("[data-security-retry]");
  const anotherButton = root.querySelector("[data-another]");
  const contactType = form.elements.namedItem("contact_type");
  const contactValue = form.elements.namedItem("contact_value");

  function clearFieldErrors() {
    form.querySelectorAll("[data-field-error]").forEach((node) => {
      node.textContent = "";
    });
    form.querySelectorAll("[aria-invalid='true']").forEach((field) => {
      field.removeAttribute("aria-invalid");
    });
  }

  function setFormError(message) {
    setText(root, "[data-form-error]", message);
  }

  return {
    bind(handlers) {
      form.addEventListener("submit", (event) => {
        event.preventDefault();
        handlers.submit();
      });
      form.addEventListener("input", () => {
        clearFieldErrors();
        setFormError("");
      });
      securityRetryButton?.addEventListener("click", () => {
        handlers.retrySecurity();
      });
      restartButton?.addEventListener("click", () => {
        handlers.restartSubmission();
      });
      anotherButton?.addEventListener("click", () => {
        handlers.anotherSubmission();
      });
      contactType?.addEventListener("change", () => {
        handlers.contactTypeChange(contactType.value);
      });
    },
    readFormValue() {
      return {
        name: getFormValue(form, "name"),
        contact_type: getFormValue(form, "contact_type"),
        contact_value: getFormValue(form, "contact_value"),
        case_type: getFormValue(form, "case_type"),
        region: getFormValue(form, "region"),
        current_stage: getFormValue(form, "current_stage"),
        needs_summary: getFormValue(form, "needs_summary"),
        website: getFormValue(form, "website"),
      };
    },
    setReadiness({ message, ready }) {
      if (readinessNode) {
        readinessNode.textContent = message;
        readinessNode.dataset.ready = String(ready);
      }
    },
    setSubmitState({ disabled, busy, label }) {
      if (!submitButton) {
        return;
      }
      submitButton.disabled = disabled;
      submitButton.setAttribute("aria-busy", String(busy));
      submitButton.textContent = label;
    },
    setSecurityState({ message, retryVisible }) {
      setText(root, "[data-turnstile-error]", message);
      if (securityRetryButton) {
        securityRetryButton.toggleAttribute("hidden", !retryVisible);
      }
    },
    setFieldErrors(errors) {
      clearFieldErrors();
      let firstInvalidField = null;

      for (const [name, message] of Object.entries(errors)) {
        const field = form.elements.namedItem(name);
        const error = form.querySelector(`[data-field-error="${name}"]`);
        if (field) {
          field.setAttribute("aria-invalid", "true");
          firstInvalidField ??= field;
        }
        if (error) {
          error.textContent = message;
        }
      }

      firstInvalidField?.focus();
    },
    clearFieldErrors,
    setFormError,
    setRestartVisible(visible) {
      restartButton?.toggleAttribute("hidden", !visible);
    },
    setContactMode(type) {
      if (!contactValue) {
        return;
      }
      const mode = type === "phone" ? "tel" : "email";
      contactValue.setAttribute("autocomplete", mode);
      contactValue.setAttribute("inputmode", mode);
    },
    setPrivacy(config) {
      setText(root, "[data-privacy-title]", "個人資料蒐集告知");
      setText(root, "[data-provider-name]", config.providerName);
      setText(root, "[data-privacy-contact]", config.privacyContact);
      setText(root, "[data-retention-period]", config.retentionPeriod);
    },
    clearSensitiveFields() {
      form.reset();
      clearFieldErrors();
      setFormError("");
    },
    showForm() {
      root.querySelector("[data-success-panel]")?.setAttribute("hidden", "");
      root.querySelector("[data-form-panel]")?.removeAttribute("hidden");
      form.querySelector("[name='name']")?.focus();
    },
    showSuccess(model) {
      root.querySelector("[data-form-panel]")?.setAttribute("hidden", "");
      const successPanel = root.querySelector("[data-success-panel]");
      successPanel?.removeAttribute("hidden");
      setText(root, "[data-receipt-code]", model.receiptCode);
      setText(root, "[data-success-status]", model.statusLabel);
      setText(root, "[data-success-handler]", model.handlerLabel);
      setText(root, "[data-success-next]", model.nextStep);
      successPanel?.focus();
    },
  };
}

export function createTurnstileAdapter(
  root,
  globalObject = globalThis,
) {
  const host = root.querySelector("[data-turnstile]");
  let widgetId = "";
  let script = null;

  function removeWidget() {
    if (widgetId && globalObject.turnstile?.remove) {
      globalObject.turnstile.remove(widgetId);
    }
    widgetId = "";
    host?.replaceChildren();
  }

  function renderWidget(callbacks) {
    if (!host || !globalObject.turnstile?.render) {
      throw new Error("Turnstile renderer unavailable");
    }
    removeWidget();
    widgetId = globalObject.turnstile.render(host, {
      sitekey: callbacks.siteKey,
      action: "pcm_intake",
      callback: callbacks.onToken,
      "expired-callback": callbacks.onExpired,
      "error-callback": callbacks.onError,
      theme: "dark",
    });
    if (!widgetId) {
      throw new Error("Turnstile widget did not render");
    }
  }

  return {
    mount(callbacks) {
      if (globalObject.turnstile?.render) {
        renderWidget(callbacks);
        return Promise.resolve();
      }

      return new Promise((resolve, reject) => {
        script = root.createElement("script");
        script.src =
          "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
        script.async = true;
        script.defer = true;
        script.dataset.pcmTurnstileScript = "true";
        script.addEventListener(
          "load",
          () => {
            try {
              renderWidget(callbacks);
              resolve();
            } catch (error) {
              reject(error);
            }
          },
          { once: true },
        );
        script.addEventListener(
          "error",
          () => {
            script?.remove();
            script = null;
            reject(new Error("Turnstile script failed"));
          },
          { once: true },
        );
        root.head.append(script);
      });
    },
    reset() {
      if (widgetId && globalObject.turnstile?.reset) {
        globalObject.turnstile.reset(widgetId);
      }
      if (!globalObject.turnstile?.render && script) {
        script.remove();
        script = null;
      }
    },
  };
}

export function createIntakeController({
  view,
  config,
  fetchImpl,
  turnstile,
  timers,
  uuidFactory,
  securityTimeoutMs = SECURITY_TIMEOUT_MS,
}) {
  const normalizedConfig = normalizeIntakeConfig({ runtime: config });
  const readiness = getIntakeConfigReadiness(normalizedConfig);
  const submissionSession = createSubmissionSession(uuidFactory);
  let securityAttempt = 0;
  let securityToken = "";
  let submitting = false;

  function setSubmitState() {
    view.setSubmitState({
      disabled: !readiness.ready || !securityToken || submitting,
      busy: submitting,
      label: submitting ? "正在送出申請" : "送出初步檢視申請",
    });
  }

  function setSecurityFailure(message = SECURITY_LOAD_ERROR) {
    securityToken = "";
    view.setSecurityState({
      message,
      retryVisible: true,
    });
    setSubmitState();
  }

  function mountSecurity() {
    if (!readiness.ready) {
      return Promise.resolve();
    }

    securityAttempt += 1;
    const attempt = securityAttempt;
    securityToken = "";
    view.setSecurityState({
      message: "正在載入安全驗證。",
      retryVisible: false,
    });
    setSubmitState();

    return new Promise((resolve) => {
      let settled = false;
      const finish = (callback) => {
        if (settled || attempt !== securityAttempt) {
          return;
        }
        settled = true;
        timers.clearTimeout(timeoutId);
        callback();
        resolve();
      };
      const timeoutId = timers.setTimeout(() => {
        finish(() => {
          turnstile.reset();
          setSecurityFailure();
        });
      }, securityTimeoutMs);
      const callbacks = {
        siteKey: normalizedConfig.turnstileSiteKey,
        onToken(token) {
          if (attempt !== securityAttempt) {
            return;
          }
          securityToken = String(token ?? "").trim();
          view.setSecurityState({
            message: securityToken
              ? "安全驗證完成。"
              : "請完成安全驗證後再送出。",
            retryVisible: false,
          });
          setSubmitState();
        },
        onExpired() {
          if (attempt !== securityAttempt) {
            return;
          }
          securityToken = "";
          view.setSecurityState({
            message: "安全驗證已失效，請重新完成驗證。",
            retryVisible: true,
          });
          setSubmitState();
        },
        onError() {
          if (attempt !== securityAttempt) {
            return;
          }
          setSecurityFailure();
        },
      };

      try {
        Promise.resolve(turnstile.mount(callbacks)).then(
          () => {
            finish(() => {
              view.setSecurityState({
                message: securityToken
                  ? "安全驗證完成。"
                  : "請完成安全驗證後再送出。",
                retryVisible: false,
              });
              setSubmitState();
            });
          },
          () => {
            finish(() => setSecurityFailure());
          },
        );
      } catch {
        finish(() => setSecurityFailure());
      }
    });
  }

  function resetSecurityForRetry() {
    securityToken = "";
    turnstile.reset();
    view.setSecurityState({
      message: "請重新完成安全驗證後再送出。",
      retryVisible: false,
    });
    setSubmitState();
  }

  async function submit() {
    if (submitting) {
      return;
    }
    if (!readiness.ready) {
      view.setFormError(readiness.message);
      return;
    }
    if (!securityToken) {
      view.setSecurityState({
        message: "請完成安全驗證後再送出。",
        retryVisible: false,
      });
      setSubmitState();
      return;
    }

    const validation = validateIntake(view.readFormValue());
    if (!validation.valid) {
      view.setFieldErrors(validation.errors);
      view.setFormError("請檢查標示欄位，修正後再送出。");
      return;
    }

    const fingerprint = JSON.stringify(validation.value);
    const request = createIntakeRequest({
      normalizedValue: validation.value,
      submissionId: submissionSession.prepare(fingerprint),
      turnstileToken: securityToken,
    });
    submitting = true;
    view.clearFieldErrors();
    view.setFormError("");
    view.setRestartVisible(false);
    setSubmitState();

    try {
      const response = await fetchImpl(normalizedConfig.endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(request),
        cache: "no-store",
        credentials: "omit",
      });
      const body = await response.json().catch(() => ({}));

      if (!response.ok) {
        const mapped = mapIntakeError({
          status: response.status,
          code: body.code,
          fieldErrors: body.fieldErrors,
        });
        view.setFieldErrors(mapped.fieldErrors);
        view.setFormError(mapped.message);
        view.setRestartVisible(mapped.shouldRestart);
        resetSecurityForRetry();
        return;
      }

      const success = validateSuccessResponse(body);
      if (!success.valid) {
        view.setFormError(
          "服務暫時無法完成，資料仍保留在畫面上，請稍後再試。",
        );
        resetSecurityForRetry();
        return;
      }

      view.clearSensitiveFields();
      view.clearFieldErrors();
      view.setFormError("");
      submissionSession.complete();
      securityToken = "";
      view.showSuccess(getSuccessViewModel(success.value));
    } catch {
      const mapped = mapIntakeError({ networkError: true });
      view.setFormError(mapped.message);
      resetSecurityForRetry();
    } finally {
      submitting = false;
      setSubmitState();
    }
  }

  function retrySecurity() {
    turnstile.reset();
    return mountSecurity();
  }

  function restartSubmission() {
    const normalized = normalizeIntakePayload(view.readFormValue());
    submissionSession.restart(JSON.stringify(normalized));
    view.setFormError("已重新開始，請確認內容後再送出。");
    view.setRestartVisible(false);
  }

  function anotherSubmission() {
    submissionSession.complete();
    view.clearSensitiveFields();
    view.clearFieldErrors();
    view.setFormError("");
    view.setRestartVisible(false);
    view.showForm();
    resetSecurityForRetry();
  }

  function contactTypeChange(type) {
    view.setContactMode(type);
  }

  async function init() {
    view.setReadiness({
      message: readiness.message,
      ready: readiness.ready,
    });
    view.setRestartVisible(false);
    view.setContactMode(view.readFormValue().contact_type);
    setSubmitState();

    if (!readiness.ready) {
      view.setSecurityState({ message: "", retryVisible: false });
      return;
    }

    view.setPrivacy(normalizedConfig);
    await mountSecurity();
  }

  return {
    init,
    submit,
    retrySecurity,
    restartSubmission,
    anotherSubmission,
    contactTypeChange,
  };
}

function defaultTimers() {
  return {
    setTimeout(callback, delay) {
      return globalThis.setTimeout(callback, delay);
    },
    clearTimeout(id) {
      globalThis.clearTimeout(id);
    },
  };
}

export function initPublicIntake(
  root = document,
  dependencies = {},
) {
  const view = dependencies.view ?? createDomView(root);
  if (!view) {
    return null;
  }
  const config = dependencies.config ??
    readRuntimeConfig(root, globalThis.PCM_INTAKE_CONFIG ?? {});
  const controller = createIntakeController({
    view,
    config,
    fetchImpl: dependencies.fetchImpl ?? globalThis.fetch.bind(globalThis),
    turnstile: dependencies.turnstile ?? createTurnstileAdapter(root),
    timers: dependencies.timers ?? defaultTimers(),
    uuidFactory: dependencies.uuidFactory ?? (() => crypto.randomUUID()),
    securityTimeoutMs: dependencies.securityTimeoutMs ?? SECURITY_TIMEOUT_MS,
  });

  view.bind({
    submit: controller.submit,
    retrySecurity: controller.retrySecurity,
    restartSubmission: controller.restartSubmission,
    anotherSubmission: controller.anotherSubmission,
    contactTypeChange: controller.contactTypeChange,
  });
  controller.initialization = controller.init();
  return controller;
}

if (typeof document !== "undefined") {
  initPublicIntake(document);
}
