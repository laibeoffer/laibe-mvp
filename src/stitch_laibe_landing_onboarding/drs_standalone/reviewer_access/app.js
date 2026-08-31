import { createReviewerAccessTransport } from "./reviewer-access-transport.js";

const ACCESS_TYPES = Object.freeze(["register", "login"]);

export function resolveAccessAnchor(hash) {
  return ACCESS_TYPES.find((type) => hash === `#${type}`) ?? null;
}

function setText(node, value) {
  if (node) node.textContent = value;
}

function setStatus(node, message, tone = "neutral") {
  if (!node) return;
  node.textContent = message;
  node.dataset.tone = tone;
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
  const workspace = doc.querySelector("[data-access-workspace]");
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
    cancel: doc.querySelector("[data-line-cancel-action]"),
  });
  const enterWorkspace = doc.querySelector("[data-enter-workspace]");

  function renderWorkspaceAction() {
    const canEnter = transport.canEnterWorkspace();
    if (!enterWorkspace) return;
    enterWorkspace.hidden = !canEnter;
    enterWorkspace.disabled = !canEnter;
    enterWorkspace.setAttribute("aria-disabled", String(!canEnter));
  }

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
    const canCancel = transport.canCancelLineAccountLink();
    if (lineNodes.cancel) {
      lineNodes.cancel.hidden = !canCancel;
      lineNodes.cancel.disabled = !canCancel;
      lineNodes.cancel.setAttribute("aria-disabled", String(!canCancel));
    }
  }

  function activate(type, options = {}) {
    const selected = ACCESS_TYPES.includes(type) ? type : null;
    if (workspace) workspace.hidden = selected === null;
    for (const candidate of ACCESS_TYPES) {
      const isSelected = candidate === selected;
      const trigger = triggers.get(candidate);
      const panel = panels.get(candidate);
      trigger?.classList.toggle("is-selected", isSelected);
      trigger?.setAttribute("aria-expanded", String(isSelected));
      trigger?.setAttribute("aria-current", isSelected ? "location" : "false");
      if (panel) panel.hidden = !isSelected;
    }
    if (options.focus && selected) {
      const heading = panels.get(selected)?.querySelector("h2");
      heading?.focus({ preventScroll: true });
    }
    return selected;
  }

  function selectWithHash(type, focus = true) {
    const selected = ACCESS_TYPES.includes(type) ? type : null;
    if (!selected) return activate(null);
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
      setStatus(
        formStatus.get("register"),
        "正在確認 Gmail 身分入口…",
        "loading",
      );
      const result = await transport.register();
      setStatus(formStatus.get("register"), result.message, "neutral");
    },
  );

  doc.querySelector('[data-reviewer-form="login"]')?.addEventListener(
    "submit",
    async (event) => {
      event.preventDefault();

      setStatus(formStatus.get("login"), "正在確認身分與案件授權…", "loading");
      setText(doc.querySelector("[data-login-state]"), "正在確認登入身分");
      setText(
        doc.querySelector("[data-login-waiting]"),
        "正在等待萊比核對案件範圍",
      );
      const result = await transport.resumeAccess();
      renderLineState(transport.getLineAccountLinkState());
      renderWorkspaceAction();
      if (result.state === "authorized") {
        setText(
          doc.querySelector("[data-login-state]"),
          "身分與案件範圍已確認",
        );
        setText(
          doc.querySelector("[data-login-waiting]"),
          "可連結 LINE 或進入案件工作區",
        );
        setStatus(
          formStatus.get("login"),
          "身分確認完成。你可以連結 LINE，或進入案件工作區。",
        );
        return;
      }
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
        "請先完成 Gmail 身分確認；登入入口準備完成後可在此繼續。",
        "error",
      );
    },
  );

  enterWorkspace?.addEventListener("click", () => {
    renderLineState(transport.refreshLineAccess());
    renderWorkspaceAction();
    if (transport.enterWorkspace()) return;
    setStatus(
      formStatus.get("login"),
      "請先完成 Gmail 身分確認；登入入口準備完成後可在此繼續。",
      "error",
    );
  });

  lineNodes.action?.addEventListener("click", async () => {
    renderLineState(transport.refreshLineAccess());
    renderWorkspaceAction();
    if (!transport.canRequestLineAccountLink()) return;
    lineNodes.action.disabled = true;
    lineNodes.action.setAttribute("aria-disabled", "true");
    renderLineState(await transport.requestLineAccountLink());
  });

  lineNodes.cancel?.addEventListener("click", async () => {
    renderLineState(transport.refreshLineAccess());
    renderWorkspaceAction();
    if (!transport.canCancelLineAccountLink()) return;
    lineNodes.cancel.disabled = true;
    lineNodes.cancel.setAttribute("aria-disabled", "true");
    renderLineState(await transport.cancelLineAccountLink());
  });

  view.addEventListener(
    "hashchange",
    () => activate(resolveAccessAnchor(view.location.hash), { focus: true }),
  );
  activate(resolveAccessAnchor(view.location.hash));
  renderLineState(transport.refreshLineAccess());
  renderWorkspaceAction();

  return Object.freeze({ activate, renderLineState, renderWorkspaceAction });
}

if (typeof document !== "undefined" && typeof window !== "undefined") {
  const start = () =>
    createAccessController(document, window, createReviewerAccessTransport());
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else start();
}

export { createAccessController };
