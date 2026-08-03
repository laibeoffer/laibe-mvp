export const INITIAL_VIEW_STATE = Object.freeze({
  state: "CONTEXT_UNAVAILABLE",
  payload: null,
  writeActionsEnabled: false,
});

export function applyInitialViewState(root = globalThis.document) {
  if (!root) return INITIAL_VIEW_STATE;
  root.body?.setAttribute("data-view-state", INITIAL_VIEW_STATE.state);
  for (const node of root.querySelectorAll("[data-context-state]")) {
    node.textContent = "尚未取得案件資料";
  }
  for (const control of root.querySelectorAll("[data-write-action]")) {
    control.disabled = true;
    control.setAttribute("aria-disabled", "true");
  }
  return INITIAL_VIEW_STATE;
}

if (typeof document !== "undefined") {
  document.addEventListener("DOMContentLoaded", () => applyInitialViewState(), { once: true });
}
