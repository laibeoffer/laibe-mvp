import { createReviewerAccessTransport } from "./reviewer-access-transport.js";

const ACCESS_TYPES = Object.freeze(["register", "login"]);

export function resolveAccessAnchor(hash) {
  return hash === "#login" ? "login" : "register";
}

function setText(node, value) {
  if (node) node.textContent = value;
}

function setStatus(node, message, tone = "neutral") {
  if (!node) return;
  node.textContent = message;
  node.dataset.tone = tone;
}

function validGmail(value) {
  return /^[^\s@]+@gmail\.com$/iu.test(String(value).trim());
}

function createAccessController(doc, view, transport) {
  const triggers = new Map(
    [...doc.querySelectorAll("[data-access-trigger]")].map((
      node,
    ) => [node.dataset.accessTrigger, node]),
  );
  const panels = new Map(
    [...doc.querySelectorAll("[data-access-panel]")].map((
      node,
    ) => [node.dataset.accessPanel, node]),
  );
  const formStatus = new Map(
    [...doc.querySelectorAll("[data-form-status]")].map((
      node,
    ) => [node.dataset.formStatus, node]),
  );
  const lineNodes = Object.freeze({
    container: doc.querySelector("[data-line-state]"),
    label: doc.querySelector("[data-line-label]"),
    title: doc.querySelector("[data-line-title]"),
    message: doc.querySelector("[data-line-message]"),
    waiting: doc.querySelector("[data-line-waiting]"),
    action: doc.querySelector("[data-line-link-action]"),
  });

  function renderLineState(state) {
    if (lineNodes.container) {
      lineNodes.container.dataset.lineState = state.state;
    }
    setText(lineNodes.label, state.label);
    setText(lineNodes.title, state.title);
    setText(lineNodes.message, state.message);
    setText(lineNodes.waiting, state.waitingOn);
    setText(lineNodes.action, state.action);
    const canRequest = transport.canRequestLineAccountLink();
    if (lineNodes.action) {
      lineNodes.action.disabled = !canRequest;
      lineNodes.action.setAttribute("aria-disabled", String(!canRequest));
    }
  }

  function activate(type, options = {}) {
    const selected = ACCESS_TYPES.includes(type) ? type : "register";
    for (const candidate of ACCESS_TYPES) {
      const isSelected = candidate === selected;
      const trigger = triggers.get(candidate);
      const panel = panels.get(candidate);
      trigger?.classList.toggle("is-selected", isSelected);
      trigger?.setAttribute("aria-expanded", String(isSelected));
      if (panel) panel.hidden = !isSelected;
    }
    if (options.focus) {
      const heading = panels.get(selected)?.querySelector("h2");
      heading?.focus({ preventScroll: true });
      panels.get(selected)?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
    return selected;
  }

  function selectWithHash(type, focus = true) {
    const selected = ACCESS_TYPES.includes(type) ? type : "register";
    const nextHash = `#${selected}`;
    if (view.location.hash === nextHash) activate(selected, { focus });
    else view.location.hash = nextHash;
  }

  for (const [type, trigger] of triggers) {
    trigger.addEventListener("click", (event) => {
      event.preventDefault();
      selectWithHash(type);
    });
    trigger.addEventListener("keydown", (event) => {
      if (event.key !== " ") return;
      event.preventDefault();
      selectWithHash(type);
    });
  }

  for (const button of doc.querySelectorAll("[data-switch-access]")) {
    button.addEventListener(
      "click",
      () => selectWithHash(button.dataset.switchAccess),
    );
  }

  doc.querySelector('[data-reviewer-form="register"]')?.addEventListener(
    "submit",
    async (event) => {
      event.preventDefault();
      const form = event.currentTarget;
      const email = form.elements.namedItem("email");
      const password = form.elements.namedItem("password");
      const scopeConfirmation = form.elements.namedItem("scope-confirmation");
      if (!validGmail(email?.value)) {
        setStatus(
          formStatus.get("register"),
          "請輸入有效的 Gmail，再繼續建立審查員身分。",
          "error",
        );
        email?.focus();
        return;
      }
      if (String(password?.value ?? "").length < 8) {
        setStatus(
          formStatus.get("register"),
          "請設定至少 8 個字元的登入密碼。",
          "error",
        );
        password?.focus();
        return;
      }
      if (!scopeConfirmation?.checked) {
        setStatus(
          formStatus.get("register"),
          "請先確認你了解資格與案件權限需要另外核對。",
          "error",
        );
        scopeConfirmation?.focus();
        return;
      }
      setStatus(formStatus.get("register"), "正在確認帳號入口…", "loading");
      const result = await transport.register();
      setStatus(formStatus.get("register"), result.message, "neutral");
    },
  );

  doc.querySelector('[data-reviewer-form="login"]')?.addEventListener(
    "submit",
    async (event) => {
      event.preventDefault();
      const form = event.currentTarget;
      const email = form.elements.namedItem("email");
      const password = form.elements.namedItem("password");
      if (!validGmail(email?.value)) {
        setStatus(
          formStatus.get("login"),
          "請輸入有效的 Gmail，再確認登入狀態。",
          "error",
        );
        email?.focus();
        return;
      }
      if (String(password?.value ?? "").length === 0) {
        setStatus(
          formStatus.get("login"),
          "請輸入登入密碼，再確認身分。",
          "error",
        );
        password?.focus();
        return;
      }

      setStatus(formStatus.get("login"), "正在確認身分與案件授權…", "loading");
      setText(doc.querySelector("[data-login-state]"), "正在確認登入身分");
      setText(
        doc.querySelector("[data-login-waiting]"),
        "正在等待萊比核對案件範圍",
      );
      const result = await transport.resumeAccess();
      if (result.state === "authorized") return;
      setText(
        doc.querySelector("[data-login-state]"),
        "目前無法確認審查資格或授權案件",
      );
      setText(
        doc.querySelector("[data-login-waiting]"),
        "正在等待資格或案件授權完成",
      );
      setStatus(
        formStatus.get("login"),
        "目前無法進入治理頁。請確認既有帳號狀態，或稍後再試。",
        "error",
      );
      renderLineState(transport.getLineAccountLinkState());
    },
  );

  lineNodes.action?.addEventListener("click", async () => {
    if (!transport.canRequestLineAccountLink()) return;
    lineNodes.action.disabled = true;
    lineNodes.action.setAttribute("aria-disabled", "true");
    renderLineState(await transport.requestLineAccountLink());
  });

  view.addEventListener(
    "hashchange",
    () => activate(resolveAccessAnchor(view.location.hash), { focus: true }),
  );
  activate(resolveAccessAnchor(view.location.hash));
  renderLineState(transport.getLineAccountLinkState());

  return Object.freeze({ activate, renderLineState });
}

if (typeof document !== "undefined" && typeof window !== "undefined") {
  const start = () =>
    createAccessController(document, window, createReviewerAccessTransport());
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else start();
}

export { createAccessController };
