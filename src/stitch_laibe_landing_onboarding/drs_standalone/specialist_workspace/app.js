import { createDrsDataClient, createLocalDrsTransport } from "../shared/drs-data-client.js";
import { renderWorkspaceModel, requestedWorkspaceState } from "../shared/drs-workspace-renderer.js";

const DRS_WORKSPACE_VIEW_MODEL = Object.freeze({
  role: "specialist",
  caseId: "CASE-A7",
  queueCount: 4,
  advisoryBoundary: "AI never sends by itself",
  unavailableMessage: "正式開放後才會送出並建立案件紀錄。",
});

const drsClient = createDrsDataClient({
  role: DRS_WORKSPACE_VIEW_MODEL.role,
  caseId: DRS_WORKSPACE_VIEW_MODEL.caseId,
  transport: createLocalDrsTransport({ role: DRS_WORKSPACE_VIEW_MODEL.role }),
});

const DEFAULT_DECISION_CONTEXT = Object.freeze({
  reason: "專員已依送出前快照確認需要建立本頁決策紀錄。",
  referencedDocumentBasis: "平面配置 v2、廚具尺寸表",
  currentState: "等待乙方補尺寸說明",
  nextActor: "DRS 專員",
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
  let label = "案件佇列";
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
      setWorkspaceState(root, "批次圖面檢視狀態已更新；正式開放後才會寫入案件紀錄。");
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
      if (intent === "open-control") activateTab(root, "control");
      if (intent === "open-editor") setWorkspaceState(root, "已開啟複雜文件編輯入口狀態；正式開放後可進行多文件比較。");
      if (intent === "edit-send") drsClient.recordHumanDecision({ decision: "EDIT_AND_SEND", ...DEFAULT_DECISION_CONTEXT, reason: "專員已編修文字與引用文件，建立本頁送出前決策紀錄。" }).then(() => loadWorkspaceState(root, "ready")).then(() => setWorkspaceState(root, "已建立編修後的本頁送出前紀錄，等待專員確認正式送出。"));
      if (intent === "override-send") drsClient.recordHumanDecision({ decision: "OVERRIDE_AND_SEND", ...DEFAULT_DECISION_CONTEXT, reason: "專員已確認 AI 提醒不適用，建立覆寫原因與文件依據。" }).then(() => loadWorkspaceState(root, "ready")).then(() => setWorkspaceState(root, "已建立覆寫提醒的本頁送出前紀錄，等待專員確認正式送出。"));
      if (intent === "manual-send") drsClient.recordHumanDecision({ decision: "MANUAL_EXCEPTION_SEND", ...DEFAULT_DECISION_CONTEXT, reason: "專員已確認特殊狀況需要例外紀錄，並保留服務事件脈絡。", urgency: "高", serviceIncidentId: "SERVICE-LOCAL-001" }).then(() => loadWorkspaceState(root, "ready")).then(() => setWorkspaceState(root, "已建立人工例外的本頁送出前紀錄，等待專員確認正式送出。"));
      if (intent === "editor-entry") setWorkspaceState(root, "複雜文件編輯入口正在整理中；正式開放後提供多文件比較與回覆編修。");
      if (intent === "drawing-entry") drsClient.transitionReviewItem({ itemId: "drawing-ceiling-v2", action: "mark-reviewed" }).then(() => loadWorkspaceState(root, "ready")).then(() => setWorkspaceState(root, "批次圖面檢視入口已更新本頁狀態；正式開放後提供批次標註與人工確認。"));
    });
  }
  for (const option of root.querySelectorAll("[data-drs-state-option]")) {
    option.addEventListener("click", () => loadWorkspaceState(root, option.dataset.drsStateOption));
  }
}

bindWorkspaceActions();
loadWorkspaceState();

export { DRS_WORKSPACE_VIEW_MODEL, bindWorkspaceActions, loadWorkspaceState, setWorkspaceState };
