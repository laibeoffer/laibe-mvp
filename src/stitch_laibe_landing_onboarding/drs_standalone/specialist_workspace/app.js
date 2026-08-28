import { initialWorkspaceState, renderWorkspaceModel } from "../shared/drs-workspace-renderer.js";
import { createSpecialistCalendarTransport } from "./calendar-transport.js";
import { createDrsSessionBootstrapResolver, createDrsSessionHeadersResolver } from "./drs-session-adapter.js";
import { createDrsWorkspaceTransport, mapWorkspaceGrantToSpecialistProjection } from "./drs-workspace-transport.js";

const CALENDAR_ENDPOINTS = Object.freeze({
  grant: "/functions/v1/drs-google-calendar-grant",
  eventsRead: "/functions/v1/drs-google-calendar-events-read",
  oauthStart: "/functions/v1/drs-google-calendar-oauth-start",
  revoke: "/functions/v1/drs-google-calendar-revoke",
});

const DRS_WORKSPACE_VIEW_MODEL = Object.freeze({
  role: "specialist",
  authorityClass: null,
  caseId: null,
  queueCount: 0,
  advisoryBoundary: "AI 只做提醒，不核准、不否決、不送出",
  unavailableMessage: "正式開放後才會送出並建立案件紀錄。",
});

const PRODUCT_STATES = Object.freeze({
  loading: "正在確認案件授權與可檢視內容，完成後才會顯示案件資料。",
  empty: "目前沒有待審核案件；有授權文件或正式紀錄後，這裡會顯示下一步。",
  "retryable-error": "暫時無法取得案件狀態，請稍後重新整理本頁。",
  "permission-denied": "你目前沒有此案件的檢視權限；未確認前不顯示案件、日曆或對話內容。",
  disconnected: "目前無法更新案件資料；本頁已隱藏先前內容，恢復連線後可重新整理。",
  ready: "案件狀態已整理完成，請依下一步責任人處理。",
});

const AI_REVIEW_STATES = Object.freeze({
  NO_FLAG: "REVIEW_COMPLETED_NO_FLAG",
  ATTENTION: "REVIEW_COMPLETED_ATTENTION",
  UNAVAILABLE: "REVIEW_SERVICE_UNAVAILABLE",
});

const REVIEW_DOCUMENTS = Object.freeze([]);

const SPECIALIST_SOURCE_CASE = Object.freeze({
  case: Object.freeze({
    caseId: null,
    caseName: "尚未取得正式案件",
    currentStatus: "正在確認案件授權",
    currentResponsibleRole: "尚未確認",
    waitingFor: "等待正式案件資料",
    nextAction: "完成身分與案件授權後，再顯示下一步。",
  }),
  reviewQueue: Object.freeze([]),
  traceEntries: Object.freeze([]),
  documents: Object.freeze({ state: "pending", label: "尚未取得正式文件", items: Object.freeze([]) }),
  submittedSnapshot: null,
  aiAdvisory: Object.freeze({
    state: AI_REVIEW_STATES.UNAVAILABLE,
    status: "尚未取得正式資料",
    findings: Object.freeze([]),
  }),
});

const DEFAULT_DECISION_CONTEXT = Object.freeze({
  reason: "此操作目前只保留在本頁。",
  referencedDocumentBasis: "尚未取得正式文件",
  currentState: "尚未取得正式案件資料",
  nextActor: "尚未確認",
});

let reviewBasis = [];
let selectedReviewMode = "";
let preSendSnapshot = null;
let stalePreSendSnapshot = null;
let reviewBasisSequence = 0;
let activeWorkbenchMode = "triage";
let workbenchModeChosen = false;
let activeGovernanceView = "inbox";
let governanceViewChosen = false;
let reviewDraftState = { dirty: false, revision: 0, savedAt: "" };
let documentProjectionReady = false;

function createInitialReviewIssue() {
  return {
    id: "review-issue-local-1",
    status: "草稿",
    revision: 0,
    author: "指派 DRS 專員",
    peerReviewer: "尚未指派",
    peerReviewResult: "尚未提出覆核",
    events: [],
  };
}

function transitionReviewIssueModel(issue, {
  status,
  actor = "指派 DRS 專員",
  detail = "本頁審查狀態已更新",
  peerReviewer = issue.peerReviewer,
  peerReviewResult = issue.peerReviewResult,
  time = "本頁操作",
} = {}) {
  const safePeerReviewer = peerReviewer === issue.author ? "待指派另一位 DRS 專員" : peerReviewer;
  const nextStatus = status || issue.status;
  return {
    ...issue,
    status: nextStatus,
    peerReviewer: safePeerReviewer,
    peerReviewResult,
    events: [
      ...issue.events,
      {
        from: issue.status,
        to: nextStatus,
        actor,
        time,
        detail,
        revision: issue.revision,
      },
    ],
  };
}

function invalidateSnapshotModel(snapshot, reason = "審查內容或引用依據已變更") {
  if (!snapshot) return null;
  return {
    ...snapshot,
    current: false,
    staleReason: reason,
    state: "此快照已過期，不可作為目前送出依據；請重新核對並建立新快照。",
  };
}

function reviewIssueAllowsPreSend(issue) {
  if (!issue) return false;
  if (["已撤回", "已被新版本取代", "證據失效"].includes(issue.status)) return false;
  if (issue.status !== "需另一位 DRS 覆核") return true;
  return issue.peerReviewResult === "已接受"
    && Boolean(issue.peerReviewer)
    && issue.peerReviewer !== issue.author
    && issue.peerReviewer !== "待指派另一位 DRS 專員";
}

let reviewIssue = createInitialReviewIssue();

function requestedWorkbenchMode(root = document) {
  const globalHash = typeof globalThis.location === "object" ? globalThis.location.hash : "";
  const hash = root.location?.hash ?? globalHash;
  return /^#case-review/u.test(hash) ? "review" : "triage";
}

function requestedGovernanceView(root = document) {
  const globalHash = typeof globalThis.location === "object" ? globalThis.location.hash : "";
  const hash = root.location?.hash ?? globalHash;
  if (/^#(?:case-queue|completed-review)/u.test(hash)) return "reviews";
  if (hash === "#case-history") return "history";
  if (hash === "#reviewer-access") return "reviewers";
  if (hash === "#service-contracts") return "contracts";
  return "inbox";
}

function setGovernanceView(root, view, { userInitiated = false } = {}) {
  const allowedViews = new Set(["inbox", "reviews", "history", "reviewers", "contracts"]);
  const nextView = allowedViews.has(view) ? view : "inbox";
  activeGovernanceView = nextView;
  if (userInitiated) governanceViewChosen = true;
  if (root.body?.dataset) root.body.dataset.governanceView = nextView;
  for (const panel of root.querySelectorAll("[data-governance-panel]")) {
    const active = panel.dataset.governancePanel === nextView;
    panel.hidden = !active;
    panel.inert = !active;
  }
  for (const button of root.querySelectorAll("[data-governance-nav]")) {
    const active = button.dataset.governanceNav === nextView;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", active ? "true" : "false");
  }
  if (userInitiated) {
    const hashes = { inbox: "#governance-inbox", reviews: "#case-queue-engineering", history: "#case-history", reviewers: "#reviewer-access", contracts: "#service-contracts" };
    const history = root.defaultView?.history ?? globalThis.history;
    history?.replaceState?.(null, "", hashes[nextView]);
  }
  setWorkspaceState(root, nextView === "inbox" ? "已切換至治理收件匣。" : nextView === "reviews" ? "已切換至我的審查與案件治理日曆。" : "已切換治理工作區；正式資料接入後才會顯示內容。" );
}

function hideUnavailableGovernanceControls(root) {
  for (const element of root.querySelectorAll("[data-chief-only]")) {
    element.hidden = true;
    element.inert = true;
  }
}

function setWorkbenchMode(root, mode, { resetScroll = false, userInitiated = false } = {}) {
  const nextMode = mode === "triage" ? "triage" : "review";
  activeWorkbenchMode = nextMode;
  if (userInitiated) workbenchModeChosen = true;
  if (userInitiated) {
    const history = root.defaultView?.history ?? globalThis.history;
    history?.replaceState?.(null, "", nextMode === "triage" ? "#case-queue-engineering" : "#case-review-engineering");
  }
  if (root.body?.dataset) root.body.dataset.workbenchView = nextMode;
  for (const surface of root.querySelectorAll("[data-workbench-mode]")) {
    const active = surface.dataset.workbenchMode === nextMode;
    surface.hidden = !active;
    surface.inert = !active;
  }
  const inspector = root.querySelector("[data-review-inspector]");
  if (nextMode === "review" && inspector && root.defaultView?.matchMedia?.("(max-width: 680px)").matches) inspector.open = false;
  for (const button of root.querySelectorAll('[data-drs-action="show-triage"], [data-drs-action="enter-review"]')) {
    const active = button.dataset.drsAction === (nextMode === "triage" ? "show-triage" : "enter-review");
    button.setAttribute("aria-pressed", active ? "true" : "false");
  }
  if (resetScroll) root.defaultView?.scrollTo({ top: 0, left: 0, behavior: "instant" });
  setWorkspaceState(root, nextMode === "triage" ? "已返回治理工作區。" : "已切換至文件審查；文件與審查事項會保持在同一工作畫面。" );
}

function renderReviewIssue(root) {
  const values = {
    status: reviewIssue.status,
    revision: reviewIssue.revision > 0 ? `版本 ${reviewIssue.revision}` : "尚未儲存版本",
    author: reviewIssue.author,
    peer: reviewIssue.peerReviewer,
    "peer-result": reviewIssue.peerReviewResult,
  };
  for (const [name, value] of Object.entries(values)) setBoundText(root, `[data-review-issue-${name}]`, value);
  const lifecycleStatus = ["待送出", "等待回覆", "已回覆待複核", "待甲方決定", "已完成留痕"].includes(reviewIssue.status) ? reviewIssue.status : "草稿";
  for (const step of root.querySelectorAll("[data-review-lifecycle-state]")) step.classList.toggle("is-current", step.dataset.reviewLifecycleState === lifecycleStatus);
  const eventList = root.querySelector("[data-review-issue-events]");
  if (eventList) {
    eventList.innerHTML = reviewIssue.events.length
      ? reviewIssue.events.map((event) => `<li><strong>${escapeHtml(event.from)} → ${escapeHtml(event.to)}</strong><span>${escapeHtml(event.actor)}｜${escapeHtml(event.time)}</span><small>${escapeHtml(event.detail)}</small></li>`).join("")
      : "<li><strong>尚無狀態轉換</strong><small>儲存草稿或交由另一位 DRS 覆核後，才會產生本頁事件。</small></li>";
  }
}

function invalidatePreSendSnapshot(root, reason) {
  if (!preSendSnapshot) return;
  stalePreSendSnapshot = invalidateSnapshotModel(preSendSnapshot, reason);
  preSendSnapshot = null;
  renderPreSendSnapshot(root);
}

function markReviewDraftDirty(root, reason = "審查內容或引用依據已變更") {
  invalidatePreSendSnapshot(root, reason);
  if (reviewIssue.status !== "草稿") {
    reviewIssue = transitionReviewIssueModel(reviewIssue, {
      status: "草稿",
      detail: `${reason}；先前狀態已失效，需重新儲存與核對。`,
      peerReviewer: "尚未指派",
      peerReviewResult: "先前覆核要求因內容變更失效",
    });
  }
  reviewDraftState = { ...reviewDraftState, dirty: true };
  setBoundText(root, "[data-draft-status]", "有未儲存變更");
  setBoundText(root, "[data-review-mode-label]", "草稿");
  setTaskSummary(root, "opinion", reviewDraftState.revision > 0 ? `有未儲存變更｜前次版本 ${reviewDraftState.revision}` : "有未儲存變更｜尚未送出");
  renderReviewIssue(root);
  updateReviewActionState(root);
}

function reviewDraftHasContent(root) {
  return Boolean(reviewBasis.length || Object.values(reviewEditorValues(root)).some(Boolean));
}

function saveReviewDraft(root) {
  if (!reviewDraftHasContent(root)) {
    setDecisionResult(root, "請先填寫審查事項或加入依據，再儲存本頁草稿。");
    return;
  }
  const revision = reviewDraftState.revision + 1;
  const savedAt = new Intl.DateTimeFormat("zh-TW", { hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date());
  reviewDraftState = { dirty: false, revision, savedAt };
  reviewIssue = transitionReviewIssueModel({ ...reviewIssue, revision }, {
    status: "草稿",
    detail: `本頁草稿已儲存為版本 ${revision}；尚未對外送出。`,
  });
  setBoundText(root, "[data-draft-status]", `本頁草稿已儲存｜版本 ${revision}｜${savedAt}`);
  setTaskSummary(root, "opinion", `本頁草稿版本 ${revision}｜尚未送出`);
  setDecisionResult(root, `本頁草稿已儲存為版本 ${revision}；只保留在目前頁面，重新整理後不保留，也尚未送出或建立正式案件紀錄。`);
  renderReviewIssue(root);
  updateReviewActionState(root);
}

function requestPeerReview(root) {
  if (!reviewDraftState.revision || reviewDraftState.dirty) {
    setDecisionResult(root, "請先儲存目前版本，再交由另一位 DRS 覆核。");
    return;
  }
  invalidatePreSendSnapshot(root, "審查事項已改為需另一位 DRS 覆核");
  reviewIssue = transitionReviewIssueModel(reviewIssue, {
    status: "需另一位 DRS 覆核",
    detail: `本頁草稿版本 ${reviewDraftState.revision} 已標記送交另一位專員覆核。`,
    peerReviewer: "待指派另一位 DRS 專員",
    peerReviewResult: "等待另一位專員覆核",
  });
  setBoundText(root, "[data-review-mode-label]", "需另一位 DRS 覆核");
  setTaskSummary(root, "opinion", `需另一位 DRS 覆核｜本頁版本 ${reviewDraftState.revision}`);
  setDecisionResult(root, `本頁已標記需另一位 DRS 覆核；目前只建立覆核狀態，尚未通知、尚未送出，也尚未建立正式案件紀錄。`);
  renderReviewIssue(root);
  updateReviewActionState(root);
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function stateModel(state, productMessage = PRODUCT_STATES[state]) {
  return {
    state,
    role: DRS_WORKSPACE_VIEW_MODEL.role,
    case: { caseId: DRS_WORKSPACE_VIEW_MODEL.caseId, caseName: "尚未載入案件" },
    status: {
      currentResponsibleRole: "尚未確認",
      waitingFor: "等待案件狀態整理",
      nextAction: "請稍後重新整理本頁。",
    },
    authorizedGroups: [],
    messages: [],
    reviewQueue: [],
    traceEntries: [],
    documents: { state: "hidden", label: "尚未取得正式文件", items: [] },
    submittedSnapshot: null,
    aiAdvisory: { state: AI_REVIEW_STATES.UNAVAILABLE, status: "提醒服務目前無法使用", findings: [] },
    finalTransportReceipt: null,
    productMessage,
  };
}

function sourceCaseFromServerProjection(projection) {
  if (
    projection?.ok !== true
    || projection.kind !== "specialist-workspace-projection"
    || projection.schemaVersion !== "laibe.drs-specialist-workspace-projection.v1"
    || projection.authority?.state !== "authorized"
    || projection.authority?.mode !== "read_only"
    || typeof projection.case?.id !== "string"
    || typeof projection.case?.label !== "string"
    || typeof projection.case?.statusLabel !== "string"
    || projection.documents?.state !== "pending"
    || !Array.isArray(projection.documents?.items)
    || projection.documents.items.length !== 0
    || projection.next?.actor !== "drs_specialist"
    || typeof projection.next?.actorLabel !== "string"
    || typeof projection.next?.actionLabel !== "string"
  ) {
    return null;
  }
  return {
    case: {
      caseId: projection.case.id,
      caseName: projection.case.label,
      currentStatus: projection.case.statusLabel,
      currentResponsibleRole: projection.next.actorLabel,
      waitingFor: projection.documents.label,
      nextAction: projection.next.actionLabel,
    },
    reviewQueue: [],
    traceEntries: [],
    documents: clone(projection.documents),
    submittedSnapshot: null,
    aiAdvisory: {
      state: AI_REVIEW_STATES.UNAVAILABLE,
      status: "等待正式文件後再整理提醒",
      findings: [],
    },
  };
}

function createSpecialistWorkspaceClient() {
  let activeSourceCase = clone(SPECIALIST_SOURCE_CASE);
  let reviewQueue = clone(activeSourceCase.reviewQueue);
  let traceEntries = clone(activeSourceCase.traceEntries);

  function readyModel() {
    return {
      state: "ready",
      role: DRS_WORKSPACE_VIEW_MODEL.role,
      authorityClass: DRS_WORKSPACE_VIEW_MODEL.authorityClass,
      case: clone(activeSourceCase.case),
      status: {
        currentResponsibleRole: activeSourceCase.case.currentResponsibleRole,
        waitingFor: activeSourceCase.case.waitingFor,
        nextAction: activeSourceCase.case.nextAction,
      },
      authorizedGroups: [],
      messages: [],
      reviewQueue: clone(reviewQueue),
      traceEntries: clone(traceEntries),
      documents: clone(activeSourceCase.documents),
      submittedSnapshot: clone(activeSourceCase.submittedSnapshot),
      aiAdvisory: clone(activeSourceCase.aiAdvisory),
      finalTransportReceipt: null,
      productMessage: PRODUCT_STATES.ready,
    };
  }

  function acceptTransportProjection(projection) {
    const nextSourceCase = sourceCaseFromServerProjection(projection);
    if (!nextSourceCase) {
      activeSourceCase = clone(SPECIALIST_SOURCE_CASE);
      reviewQueue = [];
      traceEntries = [];
      return false;
    }
    activeSourceCase = nextSourceCase;
    reviewQueue = [];
    traceEntries = [];
    return true;
  }

  const client = Object.freeze({
    async loadWorkspace({ state = "ready" } = {}) {
      if (state === "loading" || state === "empty" || state === "retryable-error" || state === "permission-denied" || state === "disconnected") return stateModel(state);
      if (!activeSourceCase.case.caseId) return stateModel("permission-denied", PRODUCT_STATES["permission-denied"]);
      return readyModel();
    },

    async transitionReviewItem({ itemId, action }) {
      if (!activeSourceCase.case.caseId) return { ok: false, code: "WORKSPACE_UNAVAILABLE" };
      const nextStatus = action === "mark-reviewed" ? "已標記可供人工判斷" : "等待 DRS 專員判斷";
      reviewQueue = reviewQueue.map((item) => (item.id === itemId ? { ...item, status: nextStatus } : item));
      traceEntries = [
        ...traceEntries,
        {
          id: `trace-review-${itemId}`,
          time: "本頁操作",
          actor: "DRS 專員",
          summary: "批次圖面檢視狀態已更新",
          detail: "本頁只更新可檢視的文件與圖面狀態，保留處理人、狀態與下一步責任人。",
        },
      ];
      return {
        receipt: {
          transport: "page-state",
          transitionId: `page-${traceEntries.length}`,
          label: "本頁已準備文件與圖面檢視狀態；尚未建立正式案件紀錄。",
        },
      };
    },
  });

  return Object.freeze({ client, acceptTransportProjection });
}

function createSpecialistCalendarIntegration({ workspaceTransport, calendarTransport, navigate }) {
  if (
    typeof workspaceTransport?.loadWorkspaceGrant !== "function"
    || typeof calendarTransport?.loadGrant !== "function"
    || typeof calendarTransport?.loadEvents !== "function"
    || typeof calendarTransport?.beginConnection !== "function"
    || typeof calendarTransport?.revokeConnection !== "function"
    || typeof navigate !== "function"
  ) {
    throw new TypeError("Invalid specialist calendar integration configuration");
  }

  let currentState = {
    workspaceCaseId: null,
    workspaceStatus: null,
    workspaceProjection: null,
    calendarState: "unavailable",
    timeZone: null,
    window: null,
    events: [],
  };

  function clearAll() {
    currentState = {
      workspaceCaseId: null,
      workspaceStatus: null,
      workspaceProjection: null,
      calendarState: "unavailable",
      timeZone: null,
      window: null,
      events: [],
    };
  }

  function clearCalendar(calendarState = "unavailable") {
    currentState = {
      ...currentState,
      calendarState,
      timeZone: null,
      window: null,
      events: [],
    };
  }

  function isWorkspaceGrant(value) {
    return value?.ok === true
      && value.kind === "workspace"
      && value.state === "AUTHORIZED_DRS_WORKSPACE"
      && typeof value.case?.id === "string"
      && typeof value.case?.status === "string"
      && value.workspaceAccess?.accountRole === "drs"
      && value.workspaceAccess?.mode === "read_only"
      && value.workspaceAccess?.mutationAllowed === false
      && value.workspaceAccess?.writeActionsEnabled === false;
  }

  function isCalendarGrant(value) {
    return value?.ok === true
      && value.kind === "grant"
      && value.state === "READY"
      && value.accessMode === "read_only"
      && value.connectionStatus === "connected"
      && value.timeZone === "Asia/Taipei";
  }

  function isCalendarEvents(value, requestedWindow) {
    return value?.ok === true
      && value.kind === "events"
      && value.timeZone === "Asia/Taipei"
      && value.window?.timeMin === requestedWindow.timeMin
      && value.window?.timeMax === requestedWindow.timeMax
      && Array.isArray(value.events);
  }

  function failureCode(value) {
    return typeof value?.code === "string" ? value.code : "INVALID_RESPONSE";
  }

  async function initialize({ timeMin, timeMax, signal } = {}) {
    clearAll();
    let workspaceGrant;
    try {
      workspaceGrant = await workspaceTransport.loadWorkspaceGrant({ signal });
    } catch {
      return { ok: false, code: "NETWORK_ERROR" };
    }
    if (!isWorkspaceGrant(workspaceGrant)) {
      clearAll();
      return { ok: false, code: failureCode(workspaceGrant) };
    }

    const workspaceProjection = mapWorkspaceGrantToSpecialistProjection(workspaceGrant);
    if (!workspaceProjection.ok) {
      clearAll();
      return { ok: false, code: "INVALID_RESPONSE" };
    }

    currentState.workspaceCaseId = workspaceGrant.case.id;
    currentState.workspaceStatus = workspaceGrant.case.status;
    currentState.workspaceProjection = workspaceProjection;

    let calendarGrant;
    try {
      calendarGrant = await calendarTransport.loadGrant({ expectedCaseId: workspaceGrant.case.id, signal });
    } catch {
      clearCalendar();
      return { ok: false, code: "NETWORK_ERROR" };
    }
    if (!isCalendarGrant(calendarGrant)) {
      clearCalendar();
      return { ok: false, code: failureCode(calendarGrant) };
    }

    const requestedWindow = { timeMin, timeMax };
    let calendarEvents;
    try {
      calendarEvents = await calendarTransport.loadEvents({ expectedCaseId: workspaceGrant.case.id, ...requestedWindow, signal });
    } catch {
      clearCalendar();
      return { ok: false, code: "NETWORK_ERROR" };
    }
    if (!isCalendarEvents(calendarEvents, requestedWindow)) {
      clearCalendar();
      return { ok: false, code: failureCode(calendarEvents) };
    }

    currentState = {
      workspaceCaseId: workspaceGrant.case.id,
      workspaceStatus: workspaceGrant.case.status,
      workspaceProjection,
      calendarState: "connected",
      timeZone: calendarEvents.timeZone,
      window: Object.freeze({ ...calendarEvents.window }),
      events: Object.freeze(calendarEvents.events.map((event) => Object.freeze({ ...event }))),
    };
    return { ok: true };
  }

  async function requestConnection(mode, signal) {
    if (!currentState.workspaceCaseId) return { ok: false, code: "WORKSPACE_UNAVAILABLE" };
    let connection;
    try {
      connection = await calendarTransport.beginConnection({ mode, signal });
    } catch {
      return { ok: false, code: "NETWORK_ERROR" };
    }
    if (
      connection?.ok !== true
      || connection.kind !== "connection"
      || connection.state !== "OAUTH_REDIRECT_REQUIRED"
      || typeof connection.authorizationUrl !== "string"
    ) {
      return { ok: false, code: failureCode(connection) };
    }
    let authorizationUrl;
    try {
      authorizationUrl = new URL(connection.authorizationUrl);
    } catch {
      return { ok: false, code: "INVALID_RESPONSE" };
    }
    if (
      authorizationUrl.protocol !== "https:"
      || authorizationUrl.hostname !== "accounts.google.com"
      || authorizationUrl.username
      || authorizationUrl.password
      || authorizationUrl.port
    ) {
      return { ok: false, code: "INVALID_RESPONSE" };
    }
    try {
      navigate(authorizationUrl.href);
    } catch {
      return { ok: false, code: "NAVIGATION_UNAVAILABLE" };
    }
    return { ok: true, state: "OAUTH_REDIRECT_REQUIRED" };
  }

  return Object.freeze({
    initialize,
    connect({ signal } = {}) {
      return requestConnection("connect", signal);
    },
    reconnect({ signal } = {}) {
      return requestConnection("reconnect", signal);
    },
    async revoke({ signal } = {}) {
      if (!currentState.workspaceCaseId) return { ok: false, code: "WORKSPACE_UNAVAILABLE" };
      let connection;
      try {
        connection = await calendarTransport.revokeConnection({ signal });
      } catch {
        return { ok: false, code: "NETWORK_ERROR" };
      }
      if (connection?.ok !== true || connection.kind !== "connection" || connection.state !== "REVOKED") {
        return { ok: false, code: failureCode(connection) };
      }
      clearCalendar("disconnected");
      return { ok: true, state: "REVOKED" };
    },
    getWorkspaceProjection() {
      return currentState.workspaceProjection ? clone(currentState.workspaceProjection) : null;
    },
    getState() {
      const { workspaceProjection: _workspaceProjection, ...publicState } = currentState;
      return {
        ...publicState,
        window: currentState.window ? { ...currentState.window } : null,
        events: currentState.events.map((event) => ({ ...event })),
      };
    },
  });
}

const CALENDAR_STATE_COPY = Object.freeze({
  loading: Object.freeze({
    label: "確認中",
    title: "正在確認案件與日曆授權",
    message: "完成確認前，不顯示案件識別資料或日曆內容。",
  }),
  permission: Object.freeze({
    label: "尚未取得授權",
    title: "需要先確認 DRS 登入與案件指派",
    message: "目前不顯示案件與日曆內容；完成登入並取得案件指派後，再重新開啟本頁。",
  }),
  disconnected: Object.freeze({
    label: "尚未連結",
    title: "此案件目前沒有可檢視的 Google 日曆",
    message: "案件權限已確認；請由指派專員連結或重新連結日曆，完成前不顯示任何事件。",
  }),
  error: Object.freeze({
    label: "暫時無法取得",
    title: "目前無法更新 Google 日曆狀態",
    message: "先保留目前工作，稍後再重新連結；本頁已清除先前顯示的日曆內容。",
  }),
  connected: Object.freeze({
    label: "已連結・唯讀",
    title: "已取得此案件可檢視的 Google 日曆",
    message: "下方只顯示授權期間內的共享事件；本頁不會新增、修改或刪除日曆內容。",
  }),
});

function setCalendarText(root, selector, value) {
  const element = root.querySelector(selector);
  if (element) element.textContent = value;
}

function formatCalendarTime(event) {
  if (event.allDay) return `${event.startsAt} 至 ${event.endsAt}・全天`;
  try {
    const formatter = new Intl.DateTimeFormat("zh-TW", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "Asia/Taipei",
    });
    return `${formatter.format(new Date(event.startsAt))} 至 ${formatter.format(new Date(event.endsAt))}`;
  } catch {
    return "時間暫時無法整理";
  }
}

function renderCalendarEvents(root, integrationState) {
  const eventRegion = root.querySelector("[data-drs-calendar-events]");
  const emptyRegion = root.querySelector("[data-drs-calendar-empty]");
  const readOnlyNote = root.querySelector("[data-drs-calendar-readonly]");
  const eventList = root.querySelector("[data-drs-calendar-event-list]");
  if (eventList) eventList.replaceChildren();
  if (eventRegion) eventRegion.hidden = integrationState.events.length === 0;
  if (emptyRegion) emptyRegion.hidden = integrationState.events.length !== 0;
  if (readOnlyNote) readOnlyNote.hidden = false;
  if (integrationState.window) {
    setCalendarText(root, "[data-drs-calendar-window]", `${integrationState.window.timeMin} 至 ${integrationState.window.timeMax}`);
  }
  if (!eventList || typeof root.createElement !== "function") return;
  for (const event of integrationState.events) {
    const item = root.createElement("li");
    const time = root.createElement("time");
    const title = root.createElement("strong");
    time.dateTime = event.startsAt;
    time.textContent = formatCalendarTime(event);
    title.textContent = event.title;
    item.append(time, title);
    eventList.append(item);
  }
}

function renderCalendarState(root, stateName, integrationState = null) {
  const section = root.querySelector("[data-drs-calendar-state]");
  if (!section) return;
  const stateCopy = CALENDAR_STATE_COPY[stateName] ?? CALENDAR_STATE_COPY.error;
  section.dataset.drsCalendarState = stateName;
  setCalendarText(root, "[data-drs-calendar-state-label]", stateCopy.label);
  setCalendarText(root, "[data-drs-calendar-state-title]", stateCopy.title);
  setCalendarText(root, "[data-drs-calendar-state-message]", stateCopy.message);

  const eventRegion = root.querySelector("[data-drs-calendar-events]");
  const emptyRegion = root.querySelector("[data-drs-calendar-empty]");
  const readOnlyNote = root.querySelector("[data-drs-calendar-readonly]");
  if (eventRegion) eventRegion.hidden = true;
  if (emptyRegion) emptyRegion.hidden = true;
  if (readOnlyNote) readOnlyNote.hidden = true;
  const eventList = root.querySelector("[data-drs-calendar-event-list]");
  if (eventList) eventList.replaceChildren();

  const actionVisibility = {
    connect: stateName === "disconnected",
    reconnect: stateName === "disconnected" || stateName === "error" || stateName === "connected",
    revoke: stateName === "connected",
  };
  for (const button of root.querySelectorAll("[data-drs-calendar-action]")) {
    const visible = actionVisibility[button.dataset.drsCalendarAction] === true;
    button.hidden = !visible;
    button.disabled = !visible || stateName === "loading";
    button.setAttribute("aria-disabled", button.disabled ? "true" : "false");
  }
  if (stateName === "connected" && integrationState) renderCalendarEvents(root, integrationState);
}

function renderWorkspaceGate(root, state, productMessage) {
  renderWorkspaceModel(root, stateModel(state, productMessage));
  setWorkspaceState(root, productMessage);
}

function createCalendarWindow(now) {
  let currentTime;
  try {
    currentTime = Number(now());
  } catch {
    return null;
  }
  if (!Number.isFinite(currentTime)) return null;
  return Object.freeze({
    timeMin: new Date(currentTime).toISOString(),
    timeMax: new Date(currentTime + 30 * 24 * 60 * 60 * 1000).toISOString(),
  });
}

function createSpecialistCalendarRuntime({
  root,
  fetchImplementation,
  resolveVerifiedDrsSession,
  navigate,
  now = Date.now,
} = {}) {
  if (!root || typeof root.querySelector !== "function" || typeof root.querySelectorAll !== "function" || typeof fetchImplementation !== "function") {
    throw new TypeError("Invalid specialist calendar runtime configuration");
  }
  const resolveSessionHeaders = createDrsSessionHeadersResolver({ resolveVerifiedDrsSession, now });
  const workspaceTransport = createDrsWorkspaceTransport({ fetchImplementation, resolveSessionHeaders });
  const calendarTransport = createSpecialistCalendarTransport({
    fetchImplementation,
    endpoints: CALENDAR_ENDPOINTS,
    resolveSessionHeaders,
  });
  const navigateToAuthorization = typeof navigate === "function"
    ? navigate
    : (url) => {
        const pageLocation = root.defaultView?.location ?? root.location;
        if (typeof pageLocation?.assign !== "function") throw new TypeError("Navigation unavailable");
        pageLocation.assign(url);
      };
  const integration = createSpecialistCalendarIntegration({
    workspaceTransport,
    calendarTransport,
    navigate: navigateToAuthorization,
  });
  let actionPending = false;

  async function start() {
    const requestedWindow = createCalendarWindow(now);
    renderCalendarState(root, "loading");
    renderWorkspaceGate(root, "loading", PRODUCT_STATES.loading);
    if (!requestedWindow) {
      renderCalendarState(root, "error");
      renderWorkspaceGate(root, "retryable-error", "目前無法整理日曆檢視期間，請稍後重新開啟本頁。");
      return { ok: false, code: "INVALID_TIME" };
    }
    const result = await integration.initialize(requestedWindow);
    const integrationState = integration.getState();
    const projectionAccepted = specialistWorkspaceController.acceptTransportProjection(integration.getWorkspaceProjection());
    if (projectionAccepted) await loadWorkspaceState(root, "ready");
    if (result.ok) {
      renderCalendarState(root, "connected", integrationState);
      setWorkspaceState(root, "案件檢視權限已確認；日曆僅供檢視，正式文件資料尚未取得。");
      return result;
    }
    if (!projectionAccepted) {
      renderCalendarState(root, "permission");
      renderWorkspaceGate(root, "permission-denied", PRODUCT_STATES["permission-denied"]);
      return result;
    }
    const stateName = result.code === "HTTP_ERROR" || result.code === "NETWORK_ERROR" || result.code === "REQUEST_ABORTED" ? "error" : "disconnected";
    renderCalendarState(root, stateName);
    setWorkspaceState(root, stateName === "error"
      ? "案件檢視權限已確認，但日曆狀態暫時無法取得；文件審查仍維持停用。"
      : "案件檢視權限已確認；日曆尚未連結，正式文件資料也尚未取得。");
    return result;
  }

  async function runAction(actionName) {
    if (actionPending) return { ok: false, code: "ACTION_PENDING" };
    actionPending = true;
    renderCalendarState(root, "loading");
    let result;
    try {
      if (actionName === "connect") result = await integration.connect();
      if (actionName === "reconnect") result = await integration.reconnect();
      if (actionName === "revoke") result = await integration.revoke();
    } finally {
      actionPending = false;
    }
    if (result?.ok && result.state === "REVOKED") {
      renderCalendarState(root, "disconnected");
      return result;
    }
    if (result?.ok) return result;
    renderCalendarState(root, actionName === "revoke" ? "connected" : "error", integration.getState());
    return result ?? { ok: false, code: "INVALID_ACTION" };
  }

  for (const button of root.querySelectorAll("[data-drs-calendar-action]")) {
    if (button.dataset.drsCalendarBound === "true") continue;
    button.dataset.drsCalendarBound = "true";
    button.addEventListener("click", () => runAction(button.dataset.drsCalendarAction));
  }

  return Object.freeze({
    start,
    connect: () => runAction("connect"),
    reconnect: () => runAction("reconnect"),
    revoke: () => runAction("revoke"),
    getState: integration.getState,
  });
}

function bootstrapSpecialistCalendarRuntime(root = document) {
  const fetchImplementation = typeof globalThis.fetch === "function" ? globalThis.fetch.bind(globalThis) : null;
  if (!fetchImplementation) {
    renderCalendarState(root, "error");
    renderWorkspaceGate(root, "retryable-error", "目前無法確認案件與日曆狀態，請稍後重新開啟本頁。");
    return null;
  }
  const resolveVerifiedDrsSession = createDrsSessionBootstrapResolver({ fetchImplementation });
  const runtime = createSpecialistCalendarRuntime({ root, fetchImplementation, resolveVerifiedDrsSession });
  runtime.start();
  return runtime;
}

const specialistWorkspaceController = createSpecialistWorkspaceClient();
const drsClient = specialistWorkspaceController.client;

function setWorkspaceState(root, message) {
  const live = root.querySelector("[data-drs-live]");
  if (live) live.textContent = message;
}

function setDecisionResult(root, message) {
  const result = root.querySelector("[data-drs-decision-result]");
  if (result) {
    result.hidden = false;
    result.textContent = message;
  }
  setWorkspaceState(root, message);
}

function setControlResult(root, message) {
  const result = root.querySelector("[data-drs-control-result]");
  if (result) {
    result.hidden = false;
    result.textContent = message;
  }
  setWorkspaceState(root, message);
}

function auditFootprint(outcome, nextActor = "乙方設計團隊") {
  return `正式權限與稽核紀錄尚未取得；待治理功能完成授權並成功建立紀錄後，才會顯示可執行範圍與留痕。此操作目前只保留在本頁；尚未送出，尚未建立正式案件紀錄。處理摘要：${outcome}；下一步責任人：${nextActor}。`;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function setBoundText(root, selector, value) {
  for (const element of root.querySelectorAll(selector)) element.textContent = value;
}

function setTaskSummary(root, task, summary) {
  const tab = root.querySelector(`[data-drs-tab="${task}"]`);
  if (!tab) return;
  tab.dataset.taskSummary = summary;
  const summaryElement = tab.querySelector("small");
  if (summaryElement) summaryElement.textContent = summary;
}

function reviewDocumentById(documentId) {
  return REVIEW_DOCUMENTS.find((documentItem) => documentItem.id === documentId) ?? null;
}

function selectDocument(root, action) {
  const documentItem = reviewDocumentById(action.dataset.documentId);
  if (!documentItem) {
    setWorkspaceState(root, "尚未取得可審查的正式文件；請先等待文件資料與版本確認。");
    return;
  }
  for (const button of root.querySelectorAll("[data-review-document]")) {
    const selected = button.dataset.documentId === documentItem.id;
    button.classList.toggle("is-selected", selected);
    button.setAttribute("aria-pressed", selected ? "true" : "false");
  }
  const selector = root.querySelector("[data-review-document-select]");
  if (selector) selector.value = documentItem.id;
  setBoundText(root, "[data-selected-document-name]", documentItem.label);
  setBoundText(root, "[data-selected-document-state]", documentItem.state);
  setBoundText(root, '[data-selected-document-meta="type"]', documentItem.type);
  setBoundText(root, '[data-selected-document-meta="version"]', documentItem.version);
  setBoundText(root, '[data-selected-document-meta="proposer"]', documentItem.proposer);
  setBoundText(root, '[data-selected-document-meta="updated"]', documentItem.updated);
  setWorkspaceState(root, `已選取「${documentItem.label}」。請確認文件狀態並填寫可回查的引用位置。`);
}

function renderReviewBasis(root) {
  const list = root.querySelector("[data-review-basis-list]");
  const empty = root.querySelector("[data-review-basis-empty]");
  if (list) {
    list.innerHTML = reviewBasis
      .map(
        (basis) =>
          `<li><div><strong>${escapeHtml(basis.documentLabel)}</strong><span>${escapeHtml(basis.documentType)}｜${escapeHtml(basis.documentVersion)}｜${escapeHtml(basis.location)}</span></div><button type="button" data-remove-review-basis="${escapeHtml(basis.id)}" aria-label="移除 ${escapeHtml(basis.documentLabel)} 的審查依據">移除</button></li>`,
      )
      .join("");
  }
  if (empty) empty.hidden = reviewBasis.length > 0;
  const summary = root.querySelector('[data-review-field="basis-summary"]');
  if (summary) summary.value = reviewBasis.length > 0 ? reviewBasis.map((basis) => `${basis.documentLabel}｜${basis.documentVersion}｜${basis.location}`).join("；") : "加入審查依據後自動整理";
  for (const button of root.querySelectorAll("[data-remove-review-basis]")) {
    button.addEventListener("click", () => removeReviewBasis(root, button.dataset.removeReviewBasis));
  }
  updateReviewActionState(root);
}

function addReviewBasis(root) {
  const documentId = root.querySelector("[data-review-document-select]")?.value ?? "";
  const locationField = root.querySelector("[data-citation-location]");
  const location = locationField?.value?.trim() ?? "";
  if (!documentId || !location) {
    setDecisionResult(root, "請先選擇對應文件並填寫可回查的引用位置。");
    updateReviewActionState(root);
    return;
  }
  const documentItem = reviewDocumentById(documentId);
  if (!documentItem) {
    setDecisionResult(root, "尚未取得可引用的正式文件；請先等待文件資料與版本確認。");
    updateReviewActionState(root);
    return;
  }
  reviewBasisSequence += 1;
  reviewBasis = [...reviewBasis, {
    id: `basis-${reviewBasisSequence}`,
    documentId,
    documentLabel: documentItem.label,
    documentType: documentItem.type,
    documentVersion: documentItem.version,
    versionConfirmed: documentItem.versionConfirmed,
    evidenceState: documentItem.evidenceState,
    sourceProposer: documentItem.proposer,
    sourceUpdated: documentItem.updated,
    location,
  }];
  if (locationField) locationField.value = "";
  renderReviewBasis(root);
  markReviewDraftDirty(root);
  setDecisionResult(root, `已將「${documentItem.label}｜${location}」加入目前畫面的審查依據；尚未提交、尚未建立正式案件紀錄。`);
}

function removeReviewBasis(root, basisId) {
  reviewBasis = reviewBasis.filter((basis) => basis.id !== basisId);
  renderReviewBasis(root);
  markReviewDraftDirty(root);
  setDecisionResult(root, "已從目前畫面移除該項審查依據；尚未提交任何內容。");
}

function reviewEditorValues(root) {
  const value = (name) => root.querySelector(`[data-review-field="${name}"]`)?.value?.trim() ?? "";
  return {
    issueType: value("issue-type"),
    risk: value("risk"),
    impact: value("impact"),
    request: value("request"),
    audience: value("audience"),
    nextOwner: value("next-owner"),
    responseDue: value("response-due"),
    resolution: value("resolution"),
  };
}

function reviewEditorComplete(root) {
  const values = reviewEditorValues(root);
  return Boolean(reviewBasis.length && values.issueType && values.risk && values.impact && values.request && values.audience && values.nextOwner && values.responseDue);
}

function buildPreSendSnapshot({ values, basis, mode, caseName = "尚未取得正式案件", issue = reviewIssue }) {
  const missing = [];
  if (!basis?.length) missing.push("審查依據");
  if (basis?.some((item) => !item.documentVersion)) missing.push("引用文件版本");
  if (basis?.some((item) => item.versionConfirmed !== true || item.evidenceState !== "ready")) missing.push("已確認版本的正式審查依據");
  if (!issue?.revision) missing.push("已儲存的草稿版本");
  if (!reviewIssueAllowsPreSend(issue)) missing.push("另一位 DRS 覆核結果");
  for (const [name, label] of [["issueType", "審查問題類型"], ["risk", "可驗證的發現"], ["impact", "對決策的影響"], ["request", "確認或補正內容"], ["audience", "收件角色"], ["nextOwner", "下一步負責人"], ["responseDue", "回覆時間或案件節點"]]) {
    if (!values?.[name]) missing.push(label);
  }
  if (missing.length) return { ok: false, missing };
  return {
    ok: true,
    snapshot: {
      current: true,
      reviewer: issue.author,
      caseName,
      issueId: issue.id,
      issueRevision: issue.revision,
      issueStatus: "待送出",
      issueType: values.issueType,
      finding: values.risk,
      impact: values.impact,
      request: values.request,
      audience: values.audience,
      evidenceReferences: basis.map((item) => ({
        documentId: item.documentId,
        documentLabel: item.documentLabel,
        documentType: item.documentType,
        documentVersion: item.documentVersion,
        versionConfirmed: item.versionConfirmed,
        evidenceState: item.evidenceState,
        location: item.location,
      })),
      documents: basis.map((item) => `${item.documentLabel}｜${item.documentVersion}｜${item.location}`).join("；"),
      conversation: "預計引用甲方一對一 LINE 與三方 LINE 正式紀錄；尚未連結實際 LINE",
      outcome: `${mode || "查看並送出補件要求"}｜${values.resolution || "收到回覆後再決定最終處置"}`,
      nextOwner: values.nextOwner,
      responseDue: values.responseDue,
      state: "只建立目前畫面的送出前快照；尚未對外送出、尚未建立正式案件紀錄",
    },
  };
}

function renderPreSendSnapshot(root) {
  const empty = root.querySelector("[data-presend-snapshot-empty]");
  const content = root.querySelector("[data-presend-snapshot-content]");
  const stale = root.querySelector("[data-presend-snapshot-stale]");
  setBoundText(root, "[data-drs-bind=\"snapshot-title\"]", preSendSnapshot ? "送出前審查快照" : stalePreSendSnapshot ? "先前快照已過期" : "送出前快照尚未整理");
  setTaskSummary(root, "record", preSendSnapshot ? "快照已建立｜尚未對外送出" : stalePreSendSnapshot ? "快照已過期｜需重新建立" : "快照未建立｜尚未送出");
  if (empty) empty.hidden = Boolean(preSendSnapshot || stalePreSendSnapshot);
  if (content) content.hidden = !preSendSnapshot;
  if (stale) {
    stale.hidden = !stalePreSendSnapshot;
    setBoundText(stale, "[data-presend-stale-reason]", stalePreSendSnapshot?.staleReason ?? "");
  }
  if (!preSendSnapshot) return;
  const values = {
    reviewer: preSendSnapshot.reviewer,
    case: preSendSnapshot.caseName,
    documents: preSendSnapshot.documents,
    conversation: preSendSnapshot.conversation,
    "issue-version": `版本 ${preSendSnapshot.issueRevision}`,
    "issue-type": preSendSnapshot.issueType,
    finding: preSendSnapshot.finding,
    impact: preSendSnapshot.impact,
    request: preSendSnapshot.request,
    audience: preSendSnapshot.audience,
    outcome: preSendSnapshot.outcome,
    "next-owner": preSendSnapshot.nextOwner,
    "response-due": preSendSnapshot.responseDue,
    state: preSendSnapshot.state,
  };
  for (const [name, value] of Object.entries(values)) setBoundText(root, `[data-presend-bind="${name}"]`, value);
}

function setReviewMode(root, mode) {
  selectedReviewMode = mode;
  markReviewDraftDirty(root, "處理方式已變更");
  setBoundText(root, "[data-review-mode-label]", `已選擇：${mode}`);
  for (const button of root.querySelectorAll('[data-drs-action="edit-send"], [data-drs-action="override-send"]')) {
    const active = (button.dataset.drsAction === "edit-send" ? "編輯後送出" : "覆核後送出") === mode;
    button.setAttribute("aria-pressed", active ? "true" : "false");
  }
  updateReviewActionState(root);
  const message = auditFootprint(`本頁已準備${mode}；請完成可編輯審查意見並提交送出前審查，尚未送出、尚未建立正式案件紀錄，尚未建立送出前收據`, "DRS 專員");
  setDecisionResult(root, message);
  setControlResult(root, message);
}

function setReviewField(root, name, value) {
  const field = root.querySelector(`[data-review-field="${name}"]`);
  if (field) field.value = value;
}

function applyQuickReview(root, intent) {
  const templates = {
    "request-dimensions": { issueType: "尺寸缺漏", risk: "目前缺少可回查的尺寸依據，無法完成配置判斷。", impact: "甲方無法判斷動線是否可接受。", request: "請乙方提供標示位置、尺寸與文件版本。", audience: "乙方設計團隊", nextOwner: "乙方設計團隊", resolution: "收到正式文件後由 DRS 專員重新核對。" },
    "mark-mismatch": { issueType: "文件不一致", risk: "圖面與報價的對應條件尚無法由現有文件確認。", impact: "甲方可能依不同版本做出判斷。", request: "請乙方提供同一版次的圖面與報價修訂條件。", audience: "乙方設計團隊", nextOwner: "乙方設計團隊", resolution: "並列兩份可辨識版本後再標記差異。" },
    "request-owner-material": { issueType: "材料待確認", risk: "替代材料的影響尚未由甲方確認。", impact: "材料選擇與後續報價條件仍未確定。", request: "請甲方確認替代材料與可接受影響。", audience: "甲方", nextOwner: "甲方", resolution: "取得甲方確認後再整理三方共識。" },
    "create-consensus": { issueType: "三方共識", risk: "目前共識尚未形成可回查的正式紀錄。", impact: "三方可能引用不同版本或不同說法。", request: "請甲方與乙方確認同一份文件、版本與下一步。", audience: "甲乙雙方", nextOwner: "DRS 專員", resolution: "整理三方確認內容供送出前覆核。" },
  };
  const template = templates[intent];
  if (!template) return;
  const fieldNames = { issueType: "issue-type", nextOwner: "next-owner", responseDue: "response-due" };
  for (const [name, value] of Object.entries(template)) setReviewField(root, fieldNames[name] ?? name, value);
  markReviewDraftDirty(root);
}

function updateReviewActionState(root = document) {
  const ready = !root.body?.dataset.drsState || root.body.dataset.drsState === "ready";
  const location = root.querySelector("[data-citation-location]")?.value?.trim() ?? "";
  const documentCanvas = root.querySelector("[data-document-canvas]");
  const formalEvidenceReady = documentProjectionReady && (documentCanvas ? documentCanvas.dataset.evidenceState === "ready" : true);
  const everyBasisReady = reviewBasis.length > 0 && reviewBasis.every((basis) => basis.versionConfirmed === true && basis.evidenceState === "ready");
  const issueAllowsPreSend = reviewIssueAllowsPreSend(reviewIssue);
  const evidenceDependentActions = new Set([
    "request-dimensions",
    "mark-mismatch",
    "request-owner-material",
    "create-consensus",
    "save-review-draft",
    "request-peer-review",
    "submit-presend-review",
    "edit-send",
    "override-send",
  ]);
  for (const action of root.querySelectorAll("[data-drs-action]")) {
    if (action.dataset.drsAction === "add-review-basis") {
      const enabled = ready && formalEvidenceReady && Boolean(location) && Boolean(reviewDocumentById(root.querySelector("[data-review-document-select]")?.value));
      action.disabled = !enabled;
      action.setAttribute("aria-disabled", enabled ? "false" : "true");
    }
    if (action.dataset.drsAction === "submit-presend-review") {
      const enabled = ready && formalEvidenceReady && everyBasisReady && issueAllowsPreSend && reviewEditorComplete(root) && reviewDraftState.revision > 0 && !reviewDraftState.dirty;
      action.disabled = !enabled;
      action.setAttribute("aria-disabled", enabled ? "false" : "true");
    }
    if (action.dataset.drsAction === "save-review-draft") {
      const enabled = ready && formalEvidenceReady && reviewDraftState.dirty && reviewDraftHasContent(root);
      action.disabled = !enabled;
      action.setAttribute("aria-disabled", enabled ? "false" : "true");
    }
    if (action.dataset.drsAction === "request-peer-review") {
      const enabled = ready && formalEvidenceReady && reviewDraftState.revision > 0 && !reviewDraftState.dirty;
      action.disabled = !enabled;
      action.setAttribute("aria-disabled", enabled ? "false" : "true");
    }
    if (!formalEvidenceReady && evidenceDependentActions.has(action.dataset.drsAction)) {
      action.disabled = true;
      action.setAttribute("aria-disabled", "true");
    }
  }
}

function renderDocumentProjection(root, documentProjection) {
  const pending = documentProjection?.state === "pending" && Array.isArray(documentProjection.items) && documentProjection.items.length === 0;
  documentProjectionReady = documentProjection?.state === "ready" && Array.isArray(documentProjection.items) && documentProjection.items.length > 0;
  setBoundText(root, "[data-document-projection-label]", pending ? documentProjection.label : "尚未取得正式文件");
  setBoundText(root, "[data-document-risk-state]", pending ? "等待正式文件與版本資料" : "權限或資料狀態尚未確認");
  setBoundText(root, "[data-document-next-actor]", "DRS 專員");
  const canvas = root.querySelector("[data-document-canvas]");
  if (canvas?.dataset) canvas.dataset.evidenceState = "unavailable";
  const selector = root.querySelector("[data-review-document-select]");
  if (selector) {
    selector.value = "";
    selector.disabled = true;
    selector.setAttribute?.("aria-disabled", "true");
  }
  for (const control of root.querySelectorAll("[data-document-command], [data-document-route-action]")) {
    control.disabled = true;
    control.setAttribute?.("aria-disabled", "true");
  }
}

function submitPreSendReview(root) {
  const snapshotIssue = reviewIssue;
  const built = buildPreSendSnapshot({ values: reviewEditorValues(root), basis: reviewBasis, mode: selectedReviewMode, issue: snapshotIssue });
  if (!built.ok) {
    setDecisionResult(root, `尚不能建立送出前快照，請補齊：${built.missing.join("、")}。`);
    updateReviewActionState(root);
    return;
  }
  reviewIssue = transitionReviewIssueModel(reviewIssue, {
    status: "待送出",
    detail: `已建立本頁草稿版本 ${reviewIssue.revision} 的送出前快照；尚未對外傳送。`,
  });
  stalePreSendSnapshot = null;
  preSendSnapshot = built.snapshot;
  renderReviewIssue(root);
  renderPreSendSnapshot(root);
  activateTab(root, "record");
  setWorkspaceState(root, "已建立目前畫面的送出前快照；尚未對外送出、尚未建立正式案件紀錄。");
}

function cancelValues(root) {
  return {
    reason: root.querySelector('[data-drs-cancel-field="reason"]')?.value?.trim() ?? "",
    nextActor: root.querySelector('[data-drs-cancel-field="next-actor"]')?.value?.trim() ?? "",
  };
}

function cancelComplete(root) {
  const values = cancelValues(root);
  return Boolean(values.reason && values.nextActor);
}

function manualExceptionValues(root) {
  return {
    reason: root.querySelector('[data-drs-manual-field="exception-reason"]')?.value?.trim() ?? "",
    urgency: root.querySelector('[data-drs-manual-field="urgency"]')?.value?.trim() ?? "",
    serviceIncidentId: root.querySelector('[data-drs-manual-field="service-incident-id"]')?.value?.trim() ?? "",
    nextActor: root.querySelector('[data-drs-manual-field="next-actor"]')?.value?.trim() ?? "",
  };
}

function manualExceptionComplete(root) {
  const values = manualExceptionValues(root);
  return Boolean(values.reason && values.urgency && values.serviceIncidentId && values.nextActor);
}

function updateCancelAction(root = document) {
  const cancelAction = [...root.querySelectorAll("[data-drs-action]")].find((action) => action.dataset.drsAction === "cancel-send");
  if (!cancelAction) return;
  const ready = !root.body?.dataset.drsState || root.body.dataset.drsState === "ready";
  const enabled = ready && cancelComplete(root);
  cancelAction.disabled = !enabled;
  cancelAction.setAttribute("aria-disabled", enabled ? "false" : "true");
}

function updateManualExceptionAction(root = document) {
  const manualAction = [...root.querySelectorAll("[data-drs-action]")].find((action) => action.dataset.drsAction === "manual-send");
  if (!manualAction) return;
  const ready = !root.body?.dataset.drsState || root.body.dataset.drsState === "ready";
  const enabled = ready && manualExceptionComplete(root);
  manualAction.disabled = !enabled;
  manualAction.setAttribute("aria-disabled", enabled ? "false" : "true");
}

function activateTab(root, tabName) {
  if (root.body?.dataset.drsState && root.body.dataset.drsState !== "ready") {
    setWorkspaceState(root, "目前無法開啟案件分頁，請先確認本頁案件狀態。");
    return;
  }
  let label = "文件審查";
  for (const tab of root.querySelectorAll("[data-drs-tab]")) {
    const active = tab.dataset.drsTab === tabName;
    tab.classList.toggle("is-active", active);
    tab.setAttribute("aria-selected", active ? "true" : "false");
    tab.tabIndex = active ? 0 : -1;
    if (active) label = tab.dataset.taskLabel ?? tab.textContent.trim();
  }
  for (const panel of root.querySelectorAll("[data-drs-panel]")) {
    panel.hidden = panel.dataset.drsPanel !== tabName;
    panel.inert = panel.hidden;
  }
  setWorkspaceState(root, `已切換至「${label}」面板。`);
}

function activateSourceTab(root, tabName) {
  for (const tab of root.querySelectorAll("[data-source-tab]")) {
    const active = tab.dataset.sourceTab === tabName;
    tab.classList.toggle("is-active", active);
    tab.setAttribute("aria-selected", active ? "true" : "false");
    tab.tabIndex = active ? 0 : -1;
  }
  for (const panel of root.querySelectorAll("[data-source-panel]")) {
    panel.hidden = panel.dataset.sourcePanel !== tabName;
    panel.inert = panel.hidden;
  }
}

function focusAdjacentSourceTab(root, currentTab, key) {
  const tabs = [...root.querySelectorAll("[data-source-tab]")];
  const currentIndex = tabs.indexOf(currentTab);
  if (currentIndex < 0) return;
  const lastIndex = tabs.length - 1;
  const nextIndex = key === "Home" ? 0 : key === "End" ? lastIndex : key === "ArrowLeft" ? (currentIndex + lastIndex) % tabs.length : (currentIndex + 1) % tabs.length;
  const nextTab = tabs[nextIndex];
  activateSourceTab(root, nextTab.dataset.sourceTab);
  nextTab.focus();
}

function syncReadyInertState(root, state) {
  const ready = state === "ready";
  const tablist = root.querySelector(".rail-tabs");
  if (tablist) tablist.inert = !ready;
  for (const panel of root.querySelectorAll("[data-drs-panel]")) panel.inert = !ready || panel.hidden;
}

function syncRetryAction(root, state) {
  const retry = root.querySelector('[data-drs-action="retry-load"]');
  if (!retry) return;
  const recoverable = state === "retryable-error" || state === "disconnected";
  retry.hidden = !recoverable;
  retry.disabled = !recoverable;
  retry.setAttribute("aria-disabled", recoverable ? "false" : "true");
}

function resetTransientReviewState(root) {
  reviewBasis = [];
  selectedReviewMode = "";
  preSendSnapshot = null;
  stalePreSendSnapshot = null;
  reviewDraftState = { dirty: false, revision: 0, savedAt: "" };
  reviewIssue = createInitialReviewIssue();
  for (const field of root.querySelectorAll("[data-review-field]")) {
    if (!field.hasAttribute?.("readonly")) field.value = "";
  }
  const location = root.querySelector("[data-citation-location]");
  if (location) location.value = "";
  setBoundText(root, "[data-review-mode-label]", "草稿");
  setBoundText(root, "[data-draft-status]", "尚未儲存");
  renderReviewBasis(root);
  renderPreSendSnapshot(root);
  renderReviewIssue(root);
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
      setWorkspaceState(root, auditFootprint("批次圖面檢視狀態已更新", "DRS 專員"));
    });
  }
}

async function loadWorkspaceState(root = document, state = initialWorkspaceState()) {
  const model = await drsClient.loadWorkspace({ state });
  if (model.state !== "ready") {
    workbenchModeChosen = false;
    resetTransientReviewState(root);
  }
  renderWorkspaceModel(root, model);
  renderDocumentProjection(root, model.documents);
  syncReadyInertState(root, model.state);
  syncRetryAction(root, model.state);
  bindRenderedReviewActions(root);
  updateCancelAction(root);
  updateManualExceptionAction(root);
  renderReviewBasis(root);
  renderPreSendSnapshot(root);
  renderReviewIssue(root);
  updateReviewActionState(root);
  if (model.state === "ready") {
    hideUnavailableGovernanceControls(root);
    const nextWorkbenchMode = workbenchModeChosen ? activeWorkbenchMode : requestedWorkbenchMode(root);
    setWorkbenchMode(root, nextWorkbenchMode);
    if (nextWorkbenchMode === "triage") setGovernanceView(root, governanceViewChosen ? activeGovernanceView : requestedGovernanceView(root));
  }
  setWorkspaceState(root, model.productMessage);
  return model;
}

function bindWorkspaceActions(root = document) {
  for (const button of root.querySelectorAll("[data-governance-nav]")) {
    button.addEventListener("click", () => {
      if (root.body?.dataset.drsState !== "ready") {
        setWorkspaceState(root, "目前無法開啟治理內容，請先確認身分與案件授權。");
        return;
      }
      setWorkbenchMode(root, "triage", { resetScroll: true });
      setGovernanceView(root, button.dataset.governanceNav, { userInitiated: true });
    });
  }
  for (const button of root.querySelectorAll("[data-calendar-view]")) {
    button.addEventListener("click", () => {
      for (const option of root.querySelectorAll("[data-calendar-view]")) {
        const active = option === button;
        option.classList.toggle("is-active", active);
        option.setAttribute("aria-pressed", active ? "true" : "false");
      }
      setWorkspaceState(root, "日曆檢視已切換；尚未取得正式事件時不會顯示推測資料。");
    });
  }
  for (const field of root.querySelectorAll("[data-drs-cancel-field]")) {
    field.addEventListener("input", () => updateCancelAction(root));
    field.addEventListener("change", () => updateCancelAction(root));
  }
  for (const field of root.querySelectorAll("[data-drs-manual-field]")) {
    field.addEventListener("input", () => updateManualExceptionAction(root));
    field.addEventListener("change", () => updateManualExceptionAction(root));
  }
  for (const field of root.querySelectorAll("[data-review-field], [data-citation-location], [data-review-document-select]")) {
    field.addEventListener("input", () => {
      if (field.matches?.("[data-review-field]")) markReviewDraftDirty(root);
      else updateReviewActionState(root);
    });
    field.addEventListener("change", () => {
      if (field.matches?.("[data-review-field]")) markReviewDraftDirty(root);
      else updateReviewActionState(root);
    });
  }
  updateCancelAction(root);
  updateManualExceptionAction(root);
  updateReviewActionState(root);
  for (const tab of root.querySelectorAll("[data-drs-tab]")) {
    tab.addEventListener("click", () => activateTab(root, tab.dataset.drsTab));
    tab.addEventListener("keydown", (event) => {
      if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
      event.preventDefault();
      focusAdjacentTab(root, tab, event.key);
    });
  }
  for (const tab of root.querySelectorAll("[data-source-tab]")) {
    tab.addEventListener("click", () => activateSourceTab(root, tab.dataset.sourceTab));
    tab.addEventListener("keydown", (event) => {
      if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
      event.preventDefault();
      focusAdjacentSourceTab(root, tab, event.key);
    });
  }
  for (const action of root.querySelectorAll("[data-drs-action]")) {
    action.addEventListener("click", () => {
      const intent = action.dataset.drsAction;
      if (intent === "retry-load") {
        bootstrapSpecialistCalendarRuntime(root);
        return;
      }
      if (root.body?.dataset.drsState && root.body.dataset.drsState !== "ready") {
        setWorkspaceState(root, "目前無法操作案件內容，請先確認本頁案件狀態。");
        return;
      }
      if (intent === "show-triage") {
        setWorkbenchMode(root, "triage", { resetScroll: true, userInitiated: true });
        setGovernanceView(root, "reviews");
      }
      if (intent === "enter-review" || intent === "select-case") setWorkbenchMode(root, "review", { resetScroll: true, userInitiated: true });
      if (intent === "open-review-editor") {
        setWorkbenchMode(root, "review", { resetScroll: true, userInitiated: true });
        activateTab(root, "opinion");
        const reviewInspector = root.querySelector("[data-review-inspector]");
        if (reviewInspector) reviewInspector.open = true;
      }
      if (intent === "select-document") selectDocument(root, action);
      if (intent === "add-review-basis") addReviewBasis(root);
      if (intent === "save-review-draft") saveReviewDraft(root);
      if (intent === "request-peer-review") requestPeerReview(root);
      if (["request-dimensions", "mark-mismatch", "request-owner-material", "create-consensus"].includes(intent)) applyQuickReview(root, intent);
      if (intent === "request-dimensions") setDecisionResult(root, auditFootprint("本頁已準備「要求乙方補尺寸」建議，尚未通知乙方", "乙方設計團隊"));
      if (intent === "mark-mismatch") setDecisionResult(root, auditFootprint("本頁已準備圖面與報價差異標記，尚未建立正式案件紀錄", "乙方設計團隊"));
      if (intent === "request-owner-material") setDecisionResult(root, auditFootprint("本頁已準備請甲方確認替代材料，尚未通知甲方", "甲方"));
      if (intent === "create-consensus") setDecisionResult(root, auditFootprint("本頁已準備三方共識紀錄內容，尚未建立正式案件紀錄", "DRS 專員"));
      if (intent === "cancel-send") {
        const values = cancelValues(root);
        if (!cancelComplete(root)) {
          updateCancelAction(root);
          setWorkspaceState(root, "請先填寫取消原因與取消後下一步責任人。");
          return;
        }
        setControlResult(root, auditFootprint(`本頁已準備取消本次送出；取消原因：${values.reason}；尚未送出、尚未建立正式案件紀錄，尚未建立送出前收據`, values.nextActor));
      }
      if (intent === "edit-send") setReviewMode(root, "編輯後送出");
      if (intent === "override-send") setReviewMode(root, "覆核後送出");
      if (intent === "submit-presend-review") submitPreSendReview(root);
      if (intent === "open-editor") {
        setReviewMode(root, action.dataset.reviewMode === "override" ? "覆核後送出" : "編輯後送出");
        activateTab(root, "opinion");
      }
      if (intent === "manual-send") {
        const values = manualExceptionValues(root);
        if (!manualExceptionComplete(root)) {
          updateManualExceptionAction(root);
          setWorkspaceState(root, "請先填寫人工例外原因、急迫程度、服務事件編號與下一步責任人。");
          return;
        }
        setControlResult(
          root,
          auditFootprint(
            `本頁已準備人工例外紀錄；原因：${values.reason}；急迫程度：${values.urgency}；服務事件編號：${values.serviceIncidentId}；尚未送出、尚未建立正式案件紀錄，尚未建立送出前收據`,
            values.nextActor,
          ),
        );
      }
      if (intent === "editor-entry") setWorkspaceState(root, "複雜文件編輯入口正在整理中；目前僅顯示本頁可用狀態，不會離開案件或建立正式紀錄。");
      if (intent === "drawing-entry") drsClient.transitionReviewItem({ itemId: "drawing-ceiling-v2", action: "mark-reviewed" }).then(() => loadWorkspaceState(root, "ready")).then(() => setWorkspaceState(root, auditFootprint("批次圖面檢視入口已更新本頁狀態", "DRS 專員")));
    });
  }
  for (const option of root.querySelectorAll("[data-drs-state-option]")) {
    option.addEventListener("click", () => loadWorkspaceState(root, option.dataset.drsStateOption));
  }
}

bindWorkspaceActions();
bootstrapSpecialistCalendarRuntime();

export { AI_REVIEW_STATES, DRS_WORKSPACE_VIEW_MODEL, bindWorkspaceActions, buildPreSendSnapshot, cancelValues, createInitialReviewIssue, createSpecialistCalendarIntegration, invalidateSnapshotModel, loadWorkspaceState, manualExceptionValues, markReviewDraftDirty, renderCalendarState, requestPeerReview, reviewIssueAllowsPreSend, saveReviewDraft, setGovernanceView, setWorkbenchMode, setWorkspaceState, transitionReviewIssueModel, updateCancelAction, updateManualExceptionAction };
