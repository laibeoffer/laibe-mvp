const STATE_LABELS = Object.freeze({
  loading: "載入中",
  ready: "可檢視",
  empty: "尚無內容",
  "retryable-error": "暫時無法取得",
  "permission-denied": "未取得檢視權限",
});

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function initialWorkspaceState() {
  return "loading";
}

function requestedWorkspaceState() {
  return initialWorkspaceState();
}

function setText(root, name, value) {
  for (const element of root.querySelectorAll(`[data-drs-bind="${name}"]`)) {
    element.textContent = value ?? "";
  }
}

function renderMessages(root, name, messages) {
  for (const list of root.querySelectorAll(`[data-drs-list="${name}"]`)) {
    list.innerHTML = messages
      .map(
        (message) =>
          `<li><b>${escapeHtml(message.actor)}</b><span>${escapeHtml(message.body)}</span><em>${escapeHtml(message.status)}</em></li>`,
      )
      .join("");
  }
}

function renderReviewQueue(root, model) {
  for (const list of root.querySelectorAll('[data-drs-list="review-queue"]')) {
    list.innerHTML = model.reviewQueue
      .map(
        (item) =>
          `<li><span>${escapeHtml(item.label)}</span><strong>${escapeHtml(item.summary)}</strong><small>下一步責任人：${escapeHtml(item.nextOwner)}</small><em>${escapeHtml(item.status)}</em><button type="button" data-drs-review-item="${escapeHtml(item.id)}">標記本頁檢視</button></li>`,
      )
      .join("");
  }
}

function renderTrace(root, model) {
  for (const list of root.querySelectorAll('[data-drs-list="trace"]')) {
    list.innerHTML = model.traceEntries
      .map(
        (entry) =>
          `<li><time>${escapeHtml(entry.time)}</time><strong>${escapeHtml(entry.summary)}</strong><p>${escapeHtml(entry.detail)}</p></li>`,
      )
      .join("");
  }
}

function renderAiFindings(root, model) {
  for (const list of root.querySelectorAll('[data-drs-list="ai-findings"]')) {
    list.innerHTML = model.aiAdvisory.findings
      .map(
        (finding) =>
          `<li><span>${escapeHtml(finding.label)}</span><strong>${escapeHtml(finding.summary)}</strong><small>AI 初步提醒，仍需專員判斷並引用文件</small><em>${escapeHtml(finding.status)}</em></li>`,
      )
      .join("");
  }
}

function selectedPanelName(root) {
  const selectedTab = [...root.querySelectorAll("[data-drs-tab]")].find((tab) => tab.getAttribute("aria-selected") === "true");
  const firstPanel = [...root.querySelectorAll("[data-drs-panel]")][0];
  return selectedTab?.dataset.drsTab ?? firstPanel?.dataset.drsPanel ?? "";
}

function updateStateGate(root, model) {
  const ready = model.state === "ready";
  const selectedPanel = selectedPanelName(root);
  for (const element of root.querySelectorAll("[data-drs-ready-content], [data-drs-authorized-content]")) {
    if (!ready) {
      element.hidden = true;
      continue;
    }
    element.hidden = element.dataset?.drsPanel ? element.dataset.drsPanel !== selectedPanel : false;
  }
  for (const tab of root.querySelectorAll("[data-drs-tab]")) {
    const disabled = !ready;
    tab.disabled = disabled;
    tab.setAttribute("aria-disabled", disabled ? "true" : "false");
    tab.tabIndex = disabled ? -1 : tab.getAttribute("aria-selected") === "true" ? 0 : -1;
  }
  for (const action of root.querySelectorAll("[data-drs-action]")) {
    const disabled = !ready && action.dataset.drsAction !== "retry-load";
    action.disabled = disabled;
    action.setAttribute("aria-disabled", disabled ? "true" : "false");
  }
}

function renderWorkspaceModel(root, model) {
  const body = root.body ?? root.querySelector("body");
  if (body) body.dataset.drsState = model.state;

  setText(root, "state-label", STATE_LABELS[model.state] ?? "案件狀態");
  setText(root, "product-message", model.productMessage);
  setText(root, "case-name", model.case.caseName);
  setText(root, "current-status", model.case.currentStatus ?? model.productMessage);
  setText(root, "responsible-role", model.status.currentResponsibleRole);
  setText(root, "waiting-for", model.status.waitingFor);
  setText(root, "next-action", model.status.nextAction);
  setText(root, "snapshot-title", model.submittedSnapshot?.title ?? "送出前快照尚未整理");
  setText(root, "snapshot-documents", model.submittedSnapshot?.referencedDocuments ?? "尚未整理引用文件");
  setText(root, "snapshot-state", model.submittedSnapshot?.currentState ?? "等待案件狀態整理");
  setText(root, "snapshot-next", model.submittedSnapshot?.nextAction ?? "等待案件狀態整理");
  setText(root, "ai-status", model.aiAdvisory.status);
  setText(root, "final-receipt", model.finalTransportReceipt?.label ?? "尚未建立送出前收據；所有對外回覆仍需 DRS 專員確認。");

  const privateMessages = model.messages.filter((message) => message.group === "OWNER_DRS_PRIVATE");
  const sharedMessages = model.messages.filter((message) => message.group === "OWNER_VENDOR_DRS_SHARED");
  renderMessages(root, "private-messages", privateMessages);
  renderMessages(root, "shared-messages", sharedMessages);
  renderReviewQueue(root, model);
  renderTrace(root, model);
  renderAiFindings(root, model);
  updateStateGate(root, model);
}

export { initialWorkspaceState, renderWorkspaceModel, requestedWorkspaceState };
