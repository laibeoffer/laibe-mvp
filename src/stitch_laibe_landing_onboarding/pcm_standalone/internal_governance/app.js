export const INTERNAL_GOVERNANCE_STATES = Object.freeze({
  GOVERNANCE_CHECKING: "GOVERNANCE_CHECKING",
  GOVERNANCE_DENIED: "GOVERNANCE_DENIED",
  GOVERNANCE_EMPTY: "GOVERNANCE_EMPTY",
  GOVERNANCE_READY: "GOVERNANCE_READY",
  GOVERNANCE_READ_ONLY: "GOVERNANCE_READ_ONLY",
  GOVERNANCE_LOAD_FAILED: "GOVERNANCE_LOAD_FAILED",
});

export const INITIAL_GOVERNANCE_CONTEXT = Object.freeze({
  sessionStatus: "unavailable",
  actor: null,
  assignment: null,
  records: Object.freeze([]),
});

const denied = (reasonCode) => ({
  state: INTERNAL_GOVERNANCE_STATES.GOVERNANCE_DENIED,
  reasonCode,
  governancePayload: [],
  enabledActions: [],
});

export function resolveInternalGovernanceState(context = INITIAL_GOVERNANCE_CONTEXT) {
  if (!context || context.sessionStatus === "unavailable") return denied("governance_unavailable");
  if (context.sessionStatus === "checking") {
    return {
      state: INTERNAL_GOVERNANCE_STATES.GOVERNANCE_CHECKING,
      reasonCode: "governance_checking",
      governancePayload: [],
      enabledActions: [],
    };
  }
  if (context.sessionStatus === "error") {
    return {
      state: INTERNAL_GOVERNANCE_STATES.GOVERNANCE_LOAD_FAILED,
      reasonCode: "governance_check_failed",
      governancePayload: [],
      enabledActions: [],
    };
  }

  const actorId = context.actor?.id;
  const hasCompleteAuthority =
    context.sessionStatus === "ready" &&
    Boolean(actorId) &&
    context.actor?.role === "governance_admin" &&
    context.assignment?.actorId === actorId &&
    context.assignment?.scope === "pcm_internal_governance" &&
    context.assignment?.status === "active";

  if (!hasCompleteAuthority) return denied("governance_authorization_incomplete");

  const records = Array.isArray(context.records) ? context.records : [];
  if (records.length === 0) {
    return {
      state: INTERNAL_GOVERNANCE_STATES.GOVERNANCE_EMPTY,
      reasonCode: "no_governance_records",
      governancePayload: [],
      enabledActions: ["manage_access", "manual_assignment"],
    };
  }

  return {
    state: context.assignment?.mode === "read_only"
      ? INTERNAL_GOVERNANCE_STATES.GOVERNANCE_READ_ONLY
      : INTERNAL_GOVERNANCE_STATES.GOVERNANCE_READY,
    reasonCode: "governance_ready",
    governancePayload: records.map(({ id, category }) => ({ id, category })),
    enabledActions: context.assignment?.mode === "read_only"
      ? []
      : ["manage_access", "manual_assignment", "record_reason"],
  };
}

const copyByState = Object.freeze({
  GOVERNANCE_CHECKING: ["正在確認管理權限", "確認完成前，不會顯示帳號、成員或契約紀錄。"],
  GOVERNANCE_DENIED: ["尚未取得內部治理權限", "目前沒有可調閱的內部紀錄或可執行的管理動作。"],
  GOVERNANCE_EMPTY: ["目前沒有治理紀錄", "建立受邀帳號或人工指派案件後，變更原因會依序留存。"],
  GOVERNANCE_LOAD_FAILED: ["暫時無法確認管理權限", "請稍後重新整理；確認完成前不會顯示內部紀錄。"],
});

export function renderInternalGovernance(result) {
  if (typeof document === "undefined") return;
  const title = document.querySelector("[data-state-title]");
  const detail = document.querySelector("[data-state-detail]");
  const shell = document.querySelector("[data-governance-shell]");
  const stateCopy = copyByState[result.state];
  if (title && detail && stateCopy) [title.textContent, detail.textContent] = stateCopy;
  if (shell) shell.hidden = ![
    INTERNAL_GOVERNANCE_STATES.GOVERNANCE_READY,
    INTERNAL_GOVERNANCE_STATES.GOVERNANCE_READ_ONLY,
  ].includes(result.state);
  document.documentElement.dataset.governanceState = result.state;
}

if (typeof document !== "undefined") {
  renderInternalGovernance(resolveInternalGovernanceState());
}
