import { createDrsDataClient, createLocalDrsTransport } from "../shared/drs-data-client.js";
import { renderWorkspaceModel, requestedWorkspaceState } from "../shared/drs-workspace-renderer.js";

const DRS_WORKSPACE_VIEW_MODEL = Object.freeze({
  role: "vendor",
  caseId: "CASE-A7",
  caseName: "青埔 A7 新成屋",
  visibleGroup: "OWNER_VENDOR_DRS_SHARED",
  unavailableMessage: "正式開放後才會送出回覆並建立案件紀錄。",
});

const drsClient = createDrsDataClient({
  role: DRS_WORKSPACE_VIEW_MODEL.role,
  caseId: DRS_WORKSPACE_VIEW_MODEL.caseId,
  transport: createLocalDrsTransport({ role: DRS_WORKSPACE_VIEW_MODEL.role }),
});

function setWorkspaceState(root, message) {
  const live = root.querySelector("[data-drs-live]");
  if (live) live.textContent = message;
}

function activateTab(root, tabName) {
  if (root.body?.dataset.drsState && root.body.dataset.drsState !== "ready") {
    setWorkspaceState(root, "目前無法開啟案件分頁，請先確認本頁案件狀態。");
    return;
  }
  let label = "受邀案件";
  for (const tab of root.querySelectorAll("[data-drs-tab]")) {
    const active = tab.dataset.drsTab === tabName;
    tab.classList.toggle("is-active", active);
    tab.setAttribute("aria-selected", active ? "true" : "false");
    tab.tabIndex = active ? 0 : -1;
    if (active) label = tab.textContent.trim();
  }
  for (const panel of root.querySelectorAll("[data-drs-panel]")) {
    panel.hidden = panel.dataset.drsPanel !== tabName;
  }
  setWorkspaceState(root, `已切換至「${label}」面板。`);
}

function focusAdjacentTab(root, currentTab, key) {
  const tabs = [...root.querySelectorAll("[data-drs-tab]")];
  const currentIndex = tabs.indexOf(currentTab);
  if (currentIndex < 0) return;
  const lastIndex = tabs.length - 1;
  const nextIndex = key === "Home" ? 0 : key === "End" ? lastIndex : key === "ArrowLeft" ? (currentIndex + lastIndex) % tabs.length : (currentIndex + 1) % tabs.length;
  const nextTab = tabs[nextIndex];
  activateTab(root, nextTab.dataset.drsTab);
  nextTab.focus();
}

function bindRenderedReviewActions(root) {
  for (const button of root.querySelectorAll("[data-drs-review-item]")) {
    if (button.dataset.drsBound === "true") continue;
    button.dataset.drsBound = "true";
    button.addEventListener("click", async () => {
      await drsClient.transitionReviewItem({ itemId: button.dataset.drsReviewItem, action: "mark-reviewed" });
      await loadWorkspaceState(root, "ready");
      setWorkspaceState(root, "本頁已標記文件檢視狀態；正式開放後才會建立案件紀錄。");
    });
  }
}

async function loadWorkspaceState(root = document, state = requestedWorkspaceState(root)) {
  const model = await drsClient.loadWorkspace({ state });
  renderWorkspaceModel(root, model);
  bindRenderedReviewActions(root);
  setWorkspaceState(root, model.productMessage);
  return model;
}

function bindWorkspaceActions(root = document) {
  for (const tab of root.querySelectorAll("[data-drs-tab]")) {
    tab.addEventListener("click", () => activateTab(root, tab.dataset.drsTab));
    tab.addEventListener("keydown", (event) => {
      if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
      event.preventDefault();
      focusAdjacentTab(root, tab, event.key);
    });
  }
  for (const action of root.querySelectorAll("[data-drs-action]")) {
    action.addEventListener("click", () => {
      const intent = action.dataset.drsAction;
      if (intent === "retry-load") {
        loadWorkspaceState(root, root.body?.dataset.drsState === "permission-denied" ? "permission-denied" : "ready");
        return;
      }
      if (root.body?.dataset.drsState && root.body.dataset.drsState !== "ready") {
        setWorkspaceState(root, "目前無法操作案件內容，請先確認本頁案件狀態。");
        return;
      }
      if (intent === "open-reply") activateTab(root, "documents");
      if (intent === "open-line") activateTab(root, "line");
      if (intent === "line-response") setWorkspaceState(root, "已整理共用回覆草稿；正式開放後會附上引用文件與下一步責任人。");
      if (intent === "document-response") setWorkspaceState(root, "已標記文件回覆草稿；正式開放後送出才會留下案件紀錄。");
      if (intent === "mark-next") setWorkspaceState(root, "已確認下一步說明：乙方回覆後等待屋主確認。");
    });
  }
  for (const option of root.querySelectorAll("[data-drs-state-option]")) {
    option.addEventListener("click", () => loadWorkspaceState(root, option.dataset.drsStateOption));
  }
}

bindWorkspaceActions();
loadWorkspaceState();

export { DRS_WORKSPACE_VIEW_MODEL, bindWorkspaceActions, loadWorkspaceState, setWorkspaceState };
