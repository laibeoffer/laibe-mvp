import {
  createDemoPcmAdapter,
  validateSupplementRequest,
} from "./adapters/demo-adapter.js";

export const STATE_COPY = Object.freeze({
  loading: {
    title: "正在整理你的待審案件",
    body: "請稍候，案件狀態與下一步正在準備中。",
    actionLabel: null,
    recoveryAction: null,
  },
  empty: {
    title: "目前沒有待你處理的案件",
    body: "新的審查任務出現時，會在這裡顯示案件狀態與下一步。",
    actionLabel: "重新整理",
    recoveryAction: "reload-inbox",
  },
  error: {
    title: "案件資料暫時無法載入",
    body: "請保留目前頁面並再試一次；已建立的案件紀錄不會因此改變。",
    actionLabel: "再試一次",
    recoveryAction: "retry",
  },
  permission: {
    title: "你目前沒有此案件的檢視權限",
    body: "請回到案件列表，選擇已授權給你的案件。",
    actionLabel: "回到案件列表",
    recoveryAction: "back-inbox",
  },
  session: {
    title: "登入狀態已過期",
    body: "請重新載入登入狀態，再繼續處理案件。",
    actionLabel: "重新載入登入狀態",
    recoveryAction: "reload-session",
  },
});

const adapter = createDemoPcmAdapter();
const FIXED_PCM_ACTOR_ID = "pcm-reviewer-001";
const appState = {
  cases: [],
  currentCase: null,
  currentIdentity: null,
  activeFilter: "ALL",
  lastRetry: null,
};

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function riskClass(riskLevel) {
  return ["HIGH", "MEDIUM", "LOW"].includes(riskLevel)
    ? riskLevel.toLowerCase()
    : "medium";
}

function formatCaseStatusClass(status) {
  if (status === "WAITING_SUPPLEMENT") return "waiting";
  if (status === "WAITING_OWNER_DECISION") return "owner";
  return "review";
}

export function canReviewerAct(caseRecord, actorId) {
  return (
    caseRecord.status === "IN_REVIEW" &&
    caseRecord.handoffActorId === actorId
  );
}

export function renderInboxRow(caseRecord) {
  const reviewerOwnsNextStep = canReviewerAct(
    caseRecord,
    FIXED_PCM_ACTOR_ID,
  );
  return `
    <article class="case-row" data-case-id="${escapeHtml(caseRecord.caseId)}">
      <div class="case-row__identity">
        <span class="case-code">${escapeHtml(caseRecord.referenceCode)}</span>
        <h3>${escapeHtml(caseRecord.title)}</h3>
        <div class="case-row__tags">
          <span class="status-pill ${
    formatCaseStatusClass(caseRecord.status)
  }">${escapeHtml(caseRecord.statusLabel)}</span>
          <span class="risk-pill ${riskClass(caseRecord.riskLevel)}">${
    escapeHtml(caseRecord.riskLabel)
  }</span>
        </div>
      </div>
      <dl class="case-row__facts">
        <div>
          <dt>球在誰手上</dt>
          <dd>${escapeHtml(caseRecord.handoffLabel)}</dd>
        </div>
        <div>
          <dt>下一步</dt>
          <dd>${escapeHtml(caseRecord.nextAction)}</dd>
        </div>
        <div>
          <dt>文件版本</dt>
          <dd>${escapeHtml(caseRecord.documentVersion)}</dd>
        </div>
        <div>
          <dt>處理期限</dt>
          <dd>${escapeHtml(caseRecord.dueLabel)}</dd>
        </div>
      </dl>
      <button
        class="button ${
    reviewerOwnsNextStep ? "button--primary" : "button--secondary"
  } case-row__action"
        type="button"
        data-action="open-case"
        data-kind="${reviewerOwnsNextStep ? "primary" : "secondary"}"
        data-case-id="${escapeHtml(caseRecord.caseId)}"
      >
        ${reviewerOwnsNextStep ? "開始審查" : "查看案件"}
      </button>
    </article>
  `;
}

function renderMetrics(cases) {
  const highRisk = cases.filter((item) => item.riskLevel === "HIGH").length;
  const waitingSupplement = cases.filter(
    (item) => item.status === "WAITING_SUPPLEMENT",
  ).length;
  const dueToday =
    cases.filter((item) => item.dueLabel.includes("今天")).length;
  const metrics = [
    [
      "待我處理",
      cases.filter((item) => item.handoffActorId === "pcm-reviewer-001").length,
    ],
    ["高風險案件", highRisk],
    ["等待補件", waitingSupplement],
    ["今日到期", dueToday],
  ];

  return metrics
    .map(
      ([label, value]) => `
        <div class="metric">
          <span>${escapeHtml(label)}</span>
          <strong>${escapeHtml(value)}</strong>
        </div>
      `,
    )
    .join("");
}

function renderProgress(progress) {
  return progress
    .map(
      (step, index) => `
        <li class="progress-step ${step.state.toLowerCase()}">
          <span class="progress-dot" aria-hidden="true">${
        step.state === "DONE" ? "✓" : index + 1
      }</span>
          <span class="progress-label">${escapeHtml(step.label)}</span>
        </li>
      `,
    )
    .join("");
}

function renderDocuments(documents) {
  if (documents.length === 0) {
    return `<p class="section-empty">文件正在整理中，完成後會在此列出審查版本。</p>`;
  }
  return documents
    .map(
      (document) => `
        <li class="document-row">
          <div>
            <strong>${escapeHtml(document.name)}</strong>
            <span>${escapeHtml(document.receivedLabel)}</span>
          </div>
          <div class="document-row__state">
            <span class="version-pill">${
        escapeHtml(document.versionLabel)
      }</span>
            <span>${escapeHtml(document.stateLabel)}</span>
          </div>
        </li>
      `,
    )
    .join("");
}

export function renderFindings(findings) {
  if (findings.length === 0) {
    return `<p class="section-empty">目前沒有待處理的審查標註。</p>`;
  }
  return findings
    .map(
      (finding) => `
        <li class="finding-row">
          <div class="finding-row__marker ${
        riskClass(finding.severity)
      }" aria-hidden="true"></div>
          <div class="finding-row__content">
            <div class="finding-row__heading">
              <strong>${escapeHtml(finding.title)}</strong>
              <span class="status-pill ${
        finding.status === "CONFIRMED" ? "confirmed" : "waiting"
      }">${escapeHtml(finding.statusLabel)}</span>
            </div>
            <p>${escapeHtml(finding.detail)}</p>
            <span class="finding-row__basis">依據文件：${
        escapeHtml(finding.basisLabel ?? "文件名稱待補充")
      }</span>
          </div>
        </li>
      `,
    )
    .join("");
}

function renderTimeline(events) {
  if (events.length === 0) {
    return `<p class="section-empty">案件的重要操作會依時間顯示在這裡。</p>`;
  }
  return [...events]
    .sort((left, right) => right.occurredAt.localeCompare(left.occurredAt))
    .map(
      (event) => `
        <li class="timeline-row">
          <span class="timeline-row__dot" aria-hidden="true"></span>
          <div>
            <div class="timeline-row__heading">
              <strong>${escapeHtml(event.actionLabel)}</strong>
              <time datetime="${escapeHtml(event.occurredAt)}">${
        escapeHtml(event.occurredAtLabel)
      }</time>
            </div>
            <p>${escapeHtml(event.actorLabel)} · 依據：${
        escapeHtml(event.basisLabel)
      }</p>
            <span>${escapeHtml(event.statusLabel)}</span>
          </div>
        </li>
      `,
    )
    .join("");
}

function renderCaseWorkbench(caseRecord) {
  const reviewerCanAct = canReviewerAct(
    caseRecord,
    appState.currentIdentity?.actorId ?? "pcm-reviewer-001",
  );
  return `
    <div class="case-heading">
      <button class="text-action" type="button" data-action="back-inbox">返回案件列表</button>
      <div class="case-heading__topline">
        <span class="case-code">${escapeHtml(caseRecord.referenceCode)}</span>
        <span class="status-pill ${formatCaseStatusClass(caseRecord.status)}">${
    escapeHtml(caseRecord.statusLabel)
  }</span>
        <span class="risk-pill ${riskClass(caseRecord.riskLevel)}">${
    escapeHtml(caseRecord.riskLabel)
  }</span>
      </div>
      <h2>${escapeHtml(caseRecord.title)}</h2>
      <p>${escapeHtml(caseRecord.summary)}</p>
    </div>

    <ol class="case-progress" aria-label="案件進度">
      ${renderProgress(caseRecord.progress)}
    </ol>

    <div class="workbench-grid">
      <div class="evidence-surface">
        <section class="work-section" aria-labelledby="documents-title">
          <div class="section-heading">
            <div>
              <span>本次審查依據</span>
              <h3 id="documents-title">文件與版本</h3>
            </div>
            <strong>${escapeHtml(caseRecord.documentVersion)}</strong>
          </div>
          <ul class="document-list">${
    renderDocuments(caseRecord.documents)
  }</ul>
        </section>

        <section class="work-section" aria-labelledby="findings-title">
          <div class="section-heading">
            <div>
              <span>人工判讀</span>
              <h3 id="findings-title">風險與待確認事項</h3>
            </div>
            <strong>${escapeHtml(caseRecord.findings.length)} 項</strong>
          </div>
          <ul class="finding-list">${renderFindings(caseRecord.findings)}</ul>
        </section>

        <details class="timeline-section" open>
          <summary>
            <span>案件時間線</span>
            <strong>${escapeHtml(caseRecord.events.length)} 筆紀錄</strong>
          </summary>
          <ul class="timeline-list">${renderTimeline(caseRecord.events)}</ul>
        </details>
      </div>

      <aside class="decision-rail" aria-labelledby="next-action-title">
        <div class="identity-kicker">
          <span aria-hidden="true"></span>
          PCM 人工審查
        </div>
        <h3 id="next-action-title">下一步由誰處理</h3>
        <div class="handoff-band">
          <span>球在誰手上</span>
          <strong>${escapeHtml(caseRecord.handoffLabel)}</strong>
          <p>${escapeHtml(caseRecord.nextAction)}</p>
          <small>處理期限：${escapeHtml(caseRecord.dueLabel)}</small>
        </div>

        <div class="rail-actions">
          <button
            class="button button--primary"
            type="button"
            data-action="open-supplement"
            ${reviewerCanAct ? "" : "disabled"}
          >
            要求補件
          </button>
          <label for="review-summary">人工審查摘要</label>
          <textarea
            id="review-summary"
            rows="4"
            placeholder="寫下判讀依據、仍待誰決定，以及後續需留意的事項"
            ${reviewerCanAct ? "" : "disabled"}
          ></textarea>
          <p class="field-message" id="review-summary-message"></p>
          <button
            class="button button--secondary"
            type="button"
            data-action="complete-review"
            ${reviewerCanAct ? "" : "disabled"}
          >
            完成人工審查
          </button>
        </div>
        <p class="rail-note">
          人工審查會建立案件紀錄，風險取捨與是否採用目前版本仍由業主決定。
        </p>
      </aside>
    </div>
  `;
}

function renderStatePanel(stateName) {
  const copy = STATE_COPY[stateName];
  const action = copy.actionLabel
    ? `
      <button
        class="button button--secondary"
        type="button"
        data-action="${escapeHtml(copy.recoveryAction)}"
      >
        ${escapeHtml(copy.actionLabel)}
      </button>
    `
    : `<span class="state-loader" aria-hidden="true"></span>`;
  return `
    <section class="state-panel" data-state="${escapeHtml(stateName)}">
      <h2>${escapeHtml(copy.title)}</h2>
      <p>${escapeHtml(copy.body)}</p>
      ${action}
    </section>
  `;
}

function getElements() {
  return {
    inboxView: document.querySelector("#inbox-view"),
    caseView: document.querySelector("#case-view"),
    stateView: document.querySelector("#state-view"),
    metrics: document.querySelector("#case-metrics"),
    caseList: document.querySelector("#case-list"),
    caseCount: document.querySelector("#case-count"),
    dialog: document.querySelector("#supplement-dialog"),
    supplementForm: document.querySelector("#supplement-form"),
    supplementError: document.querySelector("#supplement-form-error"),
    documentSelect: document.querySelector("#supplement-document"),
    recipientSelect: document.querySelector("#supplement-recipient"),
    toast: document.querySelector("#toast"),
  };
}

function setView(viewName) {
  const elements = getElements();
  elements.inboxView.hidden = viewName !== "inbox";
  elements.caseView.hidden = viewName !== "case";
  elements.stateView.hidden = viewName !== "state";
}

function showState(stateName, retryOperation = null) {
  const elements = getElements();
  appState.lastRetry = retryOperation;
  elements.stateView.innerHTML = renderStatePanel(stateName);
  setView("state");
}

function visibleCases() {
  if (appState.activeFilter === "ALL") return appState.cases;
  return appState.cases.filter(
    (caseRecord) => caseRecord.status === appState.activeFilter,
  );
}

function renderInbox() {
  const elements = getElements();
  const cases = visibleCases();
  elements.metrics.innerHTML = renderMetrics(appState.cases);
  elements.caseCount.textContent = `${cases.length} 件`;
  elements.caseList.innerHTML = cases.length > 0
    ? cases.map((caseRecord) => renderInboxRow(caseRecord)).join("")
    : renderStatePanel("empty");
  setView("inbox");
}

function syncCaseIntoList(caseRecord) {
  const index = appState.cases.findIndex(
    (item) => item.caseId === caseRecord.caseId,
  );
  if (index >= 0) {
    appState.cases[index] = caseRecord;
  }
}

function showToast(message) {
  const { toast } = getElements();
  toast.textContent = message;
  toast.hidden = false;
  globalThis.setTimeout(() => {
    toast.hidden = true;
  }, 4200);
}

function updateRoute(fragment) {
  globalThis.history.pushState(null, "", `#${fragment}`);
}

async function loadInbox() {
  showState("loading");
  try {
    appState.currentIdentity = await adapter.getCurrentIdentity();
    appState.cases = await adapter.listCases();
    if (appState.cases.length === 0) {
      showState("empty", loadInbox);
      return;
    }
    renderInbox();
  } catch (error) {
    showState(
      error.code === "SESSION_EXPIRED" ? "session" : "error",
      loadInbox,
    );
  }
}

async function openCase(caseId, shouldUpdateRoute = true) {
  showState("loading");
  try {
    const caseRecord = await adapter.getCase(caseId);
    appState.currentCase = caseRecord;
    const { caseView } = getElements();
    caseView.innerHTML = renderCaseWorkbench(caseRecord);
    setView("case");
    if (shouldUpdateRoute) updateRoute(`case/${caseId}`);
  } catch (error) {
    const stateName =
      error.code === "PERMISSION_DENIED" || error.code === "CASE_NOT_FOUND"
        ? "permission"
        : "error";
    showState(stateName, () => openCase(caseId, false));
  }
}

function populateSupplementForm() {
  const caseRecord = appState.currentCase;
  const elements = getElements();
  elements.documentSelect.innerHTML = `
    <option value="">選擇本次補件依據</option>
    ${
    caseRecord.documents
      .map(
        (document) =>
          `<option value="${escapeHtml(document.documentId)}">${
            escapeHtml(document.name)
          } ${escapeHtml(document.versionLabel)}</option>`,
      )
      .join("")
  }
  `;
  elements.recipientSelect.innerHTML = `
    <option value="">選擇下一位處理者</option>
    ${
    caseRecord.parties
      .filter((party) => party.actorId !== appState.currentIdentity.actorId)
      .map(
        (party) =>
          `<option value="${escapeHtml(party.actorId)}">${
            escapeHtml(party.roleLabel)
          }｜${escapeHtml(party.displayName)}</option>`,
      )
      .join("")
  }
  `;
  elements.supplementError.textContent = "";
}

function openSupplementDialog() {
  const elements = getElements();
  elements.supplementForm.reset();
  populateSupplementForm();
  elements.dialog.showModal();
}

async function submitSupplement(form) {
  const elements = getElements();
  const values = Object.fromEntries(new FormData(form));
  const validation = validateSupplementRequest(values);
  form
    .querySelectorAll("[aria-invalid]")
    .forEach((field) => field.removeAttribute("aria-invalid"));

  if (!validation.valid) {
    for (const fieldName of Object.keys(validation.errors)) {
      form.elements[fieldName]?.setAttribute("aria-invalid", "true");
    }
    elements.supplementError.textContent =
      "請完整填寫原因、說明、文件、收件者與期限。";
    return;
  }

  const submitButton = form.querySelector('[type="submit"]');
  submitButton.disabled = true;
  submitButton.textContent = "建立紀錄中";
  try {
    const result = await adapter.requestSupplement({
      ...values,
      caseId: appState.currentCase.caseId,
      actorId: appState.currentIdentity.actorId,
    });
    appState.currentCase = result.caseRecord;
    syncCaseIntoList(result.caseRecord);
    elements.dialog.close();
    elements.caseView.innerHTML = renderCaseWorkbench(result.caseRecord);
    showToast("補件紀錄已建立，案件下一步已交給指定收件者。");
  } catch (error) {
    elements.supplementError.textContent = error.message ||
      "補件紀錄尚未建立，請確認內容後再試一次。";
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = "建立補件紀錄";
  }
}

async function completeReview() {
  const summary = document.querySelector("#review-summary");
  const message = document.querySelector("#review-summary-message");
  const button = document.querySelector('[data-action="complete-review"]');
  if (!summary.value.trim()) {
    summary.setAttribute("aria-invalid", "true");
    message.textContent = "請先寫下人工審查摘要。";
    summary.focus();
    return;
  }

  summary.removeAttribute("aria-invalid");
  message.textContent = "";
  button.disabled = true;
  button.textContent = "建立紀錄中";
  try {
    const result = await adapter.completeHumanReview({
      caseId: appState.currentCase.caseId,
      actorId: appState.currentIdentity.actorId,
      summary: summary.value,
    });
    appState.currentCase = result.caseRecord;
    syncCaseIntoList(result.caseRecord);
    getElements().caseView.innerHTML = renderCaseWorkbench(result.caseRecord);
    showToast(
      "人工審查紀錄已建立，案件下一步由業主處理；這不代表業主已作出決定。",
    );
  } catch (error) {
    button.disabled = false;
    button.textContent = "完成人工審查";
    message.textContent = error.message ||
      "人工審查紀錄尚未建立，請確認內容後再試一次。";
  }
}

function handleFilter(button) {
  appState.activeFilter = button.dataset.filter;
  document.querySelectorAll("[data-filter]").forEach((item) => {
    item.setAttribute(
      "aria-pressed",
      String(item.dataset.filter === appState.activeFilter),
    );
  });
  renderInbox();
}

async function handleAction(button) {
  const action = button.dataset.action;
  if (action === "open-case") {
    await openCase(button.dataset.caseId);
    return;
  }
  if (action === "back-inbox") {
    updateRoute("inbox");
    renderInbox();
    return;
  }
  if (action === "open-supplement") {
    openSupplementDialog();
    return;
  }
  if (action === "close-supplement") {
    getElements().dialog.close();
    return;
  }
  if (action === "complete-review") {
    await completeReview();
    return;
  }
  if (action === "filter") {
    handleFilter(button);
    return;
  }
  if (action === "reload-inbox") {
    await loadInbox();
    return;
  }
  if (action === "retry") {
    await (appState.lastRetry?.() ?? loadInbox());
    return;
  }
  if (action === "reload-session") {
    globalThis.location.reload();
  }
}

async function start() {
  document.addEventListener("click", async (event) => {
    const actionButton = event.target.closest("[data-action]");
    if (actionButton) {
      await handleAction(actionButton);
    }
  });
  getElements().supplementForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    await submitSupplement(event.currentTarget);
  });
  globalThis.addEventListener("popstate", async () => {
    const match = globalThis.location.hash.match(/^#case\/([^/]+)$/);
    if (match) {
      await openCase(match[1], false);
    } else {
      renderInbox();
    }
  });

  await loadInbox();
  const caseMatch = globalThis.location.hash.match(/^#case\/([^/]+)$/);
  if (caseMatch) {
    await openCase(caseMatch[1], false);
  } else if (!globalThis.location.hash) {
    globalThis.history.replaceState(null, "", "#inbox");
  }
}

if (typeof document !== "undefined") {
  start();
}
