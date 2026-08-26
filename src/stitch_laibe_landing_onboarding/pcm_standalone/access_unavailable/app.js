export const INITIAL_VIEW_STATE = Object.freeze({
  state: "CONTEXT_UNAVAILABLE",
  payload: null,
  writeActionsEnabled: false,
});

const DEFAULT_RETURN_ACTION = Object.freeze({
  label: "安全返回 PCM 首頁",
  href: "/pcm/",
  description: "返回 PCM 首頁後，可從正式服務通知或正確入口重新進入。",
});

const OWNER_RETURN_ACTION = Object.freeze({
  label: "返回工作台",
  href: "/pcm/owner/workspace/#overview",
  description: "返回甲方工作台後，可從案件入口重新確認目前的存取權限。",
});

export function resolveAccessUnavailableReturn(locationLike = globalThis.location) {
  let locationHref;
  try {
    locationHref = locationLike?.href;
  } catch {
    return DEFAULT_RETURN_ACTION;
  }
  if (typeof locationHref !== "string") return DEFAULT_RETURN_ACTION;

  try {
    const returnValues = new URL(locationHref).searchParams.getAll("returnTo");
    if (returnValues.length === 1 && returnValues[0] === "owner") {
      return OWNER_RETURN_ACTION;
    }
  } catch {
    return DEFAULT_RETURN_ACTION;
  }
  return DEFAULT_RETURN_ACTION;
}

export function bindAccessUnavailableReturn(
  root = globalThis.document,
  locationLike = globalThis.location,
) {
  const action = resolveAccessUnavailableReturn(locationLike);
  const link = root?.querySelector?.("[data-return-action]");
  const description = root?.querySelector?.("[data-return-description]");
  if (link) {
    link.textContent = action.label;
    link.setAttribute("href", action.href);
  }
  if (description) description.textContent = action.description;
  return action;
}

export function applyInitialViewState(
  root = globalThis.document,
  locationLike = globalThis.location,
) {
  if (!root) return INITIAL_VIEW_STATE;
  root.body?.setAttribute("data-view-state", INITIAL_VIEW_STATE.state);
  for (const node of root.querySelectorAll("[data-context-state]")) {
    node.textContent = "尚未取得案件資料";
  }
  for (const control of root.querySelectorAll("[data-write-action]")) {
    control.disabled = true;
    control.setAttribute("aria-disabled", "true");
  }
  bindAccessUnavailableReturn(root, locationLike);
  return INITIAL_VIEW_STATE;
}

if (typeof document !== "undefined") {
  document.addEventListener("DOMContentLoaded", () => applyInitialViewState(), { once: true });
}
