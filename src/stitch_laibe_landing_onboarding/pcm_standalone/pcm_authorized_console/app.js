export const PCM_AUTHORIZED_CONSOLE_STATES = Object.freeze({
  ACCESS_CHECKING: "ACCESS_CHECKING",
  ACCESS_DENIED: "ACCESS_DENIED",
  AUTHORIZED_EMPTY: "AUTHORIZED_EMPTY",
  AUTHORIZED_READY: "AUTHORIZED_READY",
  CASE_ARCHIVED_READ_ONLY: "CASE_ARCHIVED_READ_ONLY",
  LOAD_FAILED_RETRYABLE: "LOAD_FAILED_RETRYABLE",
});

export const INITIAL_PCM_CONSOLE_CONTEXT = Object.freeze({
  sessionStatus: "unavailable",
  actor: null,
  membership: null,
  contract: null,
  caseBinding: null,
  authorizedCases: Object.freeze([]),
});

const denied = (reasonCode) => ({
  state: PCM_AUTHORIZED_CONSOLE_STATES.ACCESS_DENIED,
  reasonCode,
  casePayload: [],
  enabledActions: [],
});

export function resolvePcmAuthorizedConsoleState(context = INITIAL_PCM_CONSOLE_CONTEXT) {
  if (!context || context.sessionStatus === "unavailable") return denied("authorization_unavailable");
  if (context.sessionStatus === "checking") {
    return {
      state: PCM_AUTHORIZED_CONSOLE_STATES.ACCESS_CHECKING,
      reasonCode: "authorization_checking",
      casePayload: [],
      enabledActions: [],
    };
  }
  if (context.sessionStatus === "error") {
    return {
      state: PCM_AUTHORIZED_CONSOLE_STATES.LOAD_FAILED_RETRYABLE,
      reasonCode: "authorization_check_failed",
      casePayload: [],
      enabledActions: [],
    };
  }

  const actorId = context.actor?.id;
  const caseId = context.caseBinding?.caseId;
  const hasCompleteAuthority =
    context.sessionStatus === "ready" &&
    Boolean(actorId) &&
    context.actor?.role === "pcm" &&
    context.membership?.actorId === actorId &&
    context.membership?.status === "active" &&
    Array.isArray(context.membership?.caseIds) &&
    context.membership.caseIds.includes(caseId) &&
    context.caseBinding?.status === "bound" &&
    context.contract?.caseId === caseId &&
    context.contract?.status === "active";

  if (!hasCompleteAuthority) return denied("authorization_incomplete");

  const authorizedCases = Array.isArray(context.authorizedCases)
    ? context.authorizedCases.filter((item) => item?.id === caseId)
    : [];

  if (authorizedCases.length === 0) {
    return {
      state: PCM_AUTHORIZED_CONSOLE_STATES.AUTHORIZED_EMPTY,
      reasonCode: "no_authorized_cases",
      casePayload: [],
      enabledActions: [],
    };
  }

  const archived = authorizedCases.every((item) => item.status === "已封存");
  return {
    state: archived
      ? PCM_AUTHORIZED_CONSOLE_STATES.CASE_ARCHIVED_READ_ONLY
      : PCM_AUTHORIZED_CONSOLE_STATES.AUTHORIZED_READY,
    reasonCode: archived ? "authorized_read_only" : "authorized_ready",
    casePayload: authorizedCases.map(({ id, status, nextOwner }) => ({ id, status, nextOwner })),
    enabledActions: archived ? [] : ["review_case", "request_documents", "record_decision"],
  };
}

const copyByState = Object.freeze({
  ACCESS_CHECKING: ["正在確認案件授權", "請稍候，確認完成前不會顯示案件內容。"],
  ACCESS_DENIED: ["尚未取得授權案件", "目前沒有可調閱的案件內容或可執行的處理動作。"],
  AUTHORIZED_EMPTY: ["目前沒有待處理案件", "案件完成指派後，會在這裡顯示下一步與最近紀錄。"],
  LOAD_FAILED_RETRYABLE: ["暫時無法確認案件授權", "請稍後重新整理；確認完成前不會顯示案件內容。"],
});

export function renderPcmAuthorizedConsole(result) {
  if (typeof document === "undefined") return;
  const title = document.querySelector("[data-state-title]");
  const detail = document.querySelector("[data-state-detail]");
  const shell = document.querySelector("[data-authorized-shell]");
  const stateCopy = copyByState[result.state];
  if (title && detail && stateCopy) [title.textContent, detail.textContent] = stateCopy;
  if (shell) shell.hidden = ![
    PCM_AUTHORIZED_CONSOLE_STATES.AUTHORIZED_READY,
    PCM_AUTHORIZED_CONSOLE_STATES.CASE_ARCHIVED_READ_ONLY,
  ].includes(result.state);
  document.documentElement.dataset.consoleState = result.state;
}

if (typeof document !== "undefined") {
  renderPcmAuthorizedConsole(resolvePcmAuthorizedConsoleState());
}
