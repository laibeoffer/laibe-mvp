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

const safeArrayIsArray = Array.isArray;
const SafeArray = Array;
const safeGetOwnPropertyDescriptor = Object.getOwnPropertyDescriptor;
const safeHasOwn = Object.hasOwn;
const safeDefineProperty = Object.defineProperty;
const safeReflectApply = Reflect.apply;
const safeStringTrim = String.prototype.trim;
const safeNumberIsSafeInteger = Number.isSafeInteger;
const noArguments = Object.freeze([]);
const MAX_AUTHORITY_ROWS = 1000;

const invalidField = Object.freeze({ ok: false, value: undefined });

function readOwnData(target, key, requireEnumerable = true) {
  if (target === null || (typeof target !== "object" && typeof target !== "function")) {
    return invalidField;
  }
  try {
    const descriptor = safeGetOwnPropertyDescriptor(target, key);
    if (
      !descriptor ||
      !safeHasOwn(descriptor, "value") ||
      (requireEnumerable && descriptor.enumerable !== true)
    ) {
      return invalidField;
    }
    return { ok: true, value: descriptor.value };
  } catch {
    return invalidField;
  }
}

function isNonEmptyString(value) {
  return typeof value === "string" && safeReflectApply(safeStringTrim, value, noArguments).length > 0;
}

function readDenseArray(value) {
  try {
    if (!safeArrayIsArray(value)) return { ok: false, length: 0, items: null };
    const lengthField = readOwnData(value, "length", false);
    const length = lengthField.value;
    if (
      !lengthField.ok ||
      typeof length !== "number" ||
      !safeNumberIsSafeInteger(length) ||
      length < 0 ||
      length > MAX_AUTHORITY_ROWS
    ) {
      return { ok: false, length: 0, items: null };
    }
    const items = new SafeArray(length);
    for (let index = 0; index < length; index += 1) {
      const itemField = readOwnData(value, index);
      if (!itemField.ok) return { ok: false, length: 0, items: null };
      safeDefineProperty(items, index, {
        value: itemField.value,
        enumerable: true,
        writable: true,
        configurable: true,
      });
    }
    return { ok: true, length, items };
  } catch {
    return { ok: false, length: 0, items: null };
  }
}

function makeActionsForStatus(status) {
  if (status === "已封存") return [];
  const actions = new SafeArray(3);
  safeDefineProperty(actions, 0, { value: "review_case", enumerable: true, writable: true, configurable: true });
  safeDefineProperty(actions, 1, { value: "request_documents", enumerable: true, writable: true, configurable: true });
  safeDefineProperty(actions, 2, { value: "record_decision", enumerable: true, writable: true, configurable: true });
  return actions;
}

export function resolvePcmAuthorizedConsoleState(context = INITIAL_PCM_CONSOLE_CONTEXT) {
  const sessionStatusField = readOwnData(context, "sessionStatus");
  if (!sessionStatusField.ok || sessionStatusField.value === "unavailable") {
    return denied("authorization_unavailable");
  }
  const sessionStatus = sessionStatusField.value;
  if (sessionStatus === "checking") {
    return {
      state: PCM_AUTHORIZED_CONSOLE_STATES.ACCESS_CHECKING,
      reasonCode: "authorization_checking",
      casePayload: [],
      enabledActions: [],
    };
  }
  if (sessionStatus === "error") {
    return {
      state: PCM_AUTHORIZED_CONSOLE_STATES.LOAD_FAILED_RETRYABLE,
      reasonCode: "authorization_check_failed",
      casePayload: [],
      enabledActions: [],
    };
  }

  const actorField = readOwnData(context, "actor");
  const membershipField = readOwnData(context, "membership");
  const contractField = readOwnData(context, "contract");
  const bindingField = readOwnData(context, "caseBinding");
  const casesField = readOwnData(context, "authorizedCases");
  if (!actorField.ok || !membershipField.ok || !contractField.ok || !bindingField.ok || !casesField.ok) {
    return denied("authorization_incomplete");
  }

  const actorIdField = readOwnData(actorField.value, "id");
  const actorRoleField = readOwnData(actorField.value, "role");
  const memberActorIdField = readOwnData(membershipField.value, "actorId");
  const memberStatusField = readOwnData(membershipField.value, "status");
  const memberCasesField = readOwnData(membershipField.value, "caseIds");
  const contractCaseIdField = readOwnData(contractField.value, "caseId");
  const contractStatusField = readOwnData(contractField.value, "status");
  const bindingCaseIdField = readOwnData(bindingField.value, "caseId");
  const bindingStatusField = readOwnData(bindingField.value, "status");
  if (
    sessionStatus !== "ready" ||
    !actorIdField.ok || !isNonEmptyString(actorIdField.value) ||
    !actorRoleField.ok || actorRoleField.value !== "pcm" ||
    !memberActorIdField.ok || !isNonEmptyString(memberActorIdField.value) ||
    memberActorIdField.value !== actorIdField.value ||
    !memberStatusField.ok || memberStatusField.value !== "active" ||
    !memberCasesField.ok ||
    !contractCaseIdField.ok || !isNonEmptyString(contractCaseIdField.value) ||
    !contractStatusField.ok || contractStatusField.value !== "active" ||
    !bindingCaseIdField.ok || !isNonEmptyString(bindingCaseIdField.value) ||
    !bindingStatusField.ok || bindingStatusField.value !== "bound" ||
    contractCaseIdField.value !== bindingCaseIdField.value
  ) {
    return denied("authorization_incomplete");
  }

  const caseId = bindingCaseIdField.value;
  const membershipCaseIds = readDenseArray(memberCasesField.value);
  if (!membershipCaseIds.ok) return denied("authorization_incomplete");
  let membershipMatches = 0;
  for (let index = 0; index < membershipCaseIds.length; index += 1) {
    const memberCaseId = membershipCaseIds.items[index];
    if (!isNonEmptyString(memberCaseId)) return denied("authorization_incomplete");
    if (memberCaseId === caseId) membershipMatches += 1;
  }
  if (membershipMatches !== 1) return denied("authorization_incomplete");

  const authorizedCases = readDenseArray(casesField.value);
  if (!authorizedCases.ok) return denied("authorized_rows_invalid");
  let authorizedMatchCount = 0;
  let authorizedCase = null;
  for (let index = 0; index < authorizedCases.length; index += 1) {
    const row = authorizedCases.items[index];
    const idField = readOwnData(row, "id");
    const statusField = readOwnData(row, "status");
    const nextOwnerField = readOwnData(row, "nextOwner");
    if (
      !idField.ok || !isNonEmptyString(idField.value) ||
      !statusField.ok || !isNonEmptyString(statusField.value) ||
      !nextOwnerField.ok || !isNonEmptyString(nextOwnerField.value)
    ) {
      return denied("authorized_rows_invalid");
    }
    if (idField.value === caseId) {
      authorizedMatchCount += 1;
      authorizedCase = { id: idField.value, status: statusField.value, nextOwner: nextOwnerField.value };
    }
  }

  if (authorizedMatchCount === 0) {
    return {
      state: PCM_AUTHORIZED_CONSOLE_STATES.AUTHORIZED_EMPTY,
      reasonCode: "no_authorized_cases",
      casePayload: [],
      enabledActions: [],
    };
  }

  if (authorizedMatchCount !== 1) return denied("authorized_row_cardinality_invalid");
  if (authorizedCase.status !== "文件檢討中" && authorizedCase.status !== "已封存") {
    return denied("authorized_status_invalid");
  }
  const isArchived = authorizedCase.status === "已封存";

  return {
    state: isArchived
      ? PCM_AUTHORIZED_CONSOLE_STATES.CASE_ARCHIVED_READ_ONLY
      : PCM_AUTHORIZED_CONSOLE_STATES.AUTHORIZED_READY,
    reasonCode: isArchived ? "authorized_read_only" : "authorized_ready",
    casePayload: [{
      id: authorizedCase.id,
      status: authorizedCase.status,
      nextOwner: authorizedCase.nextOwner,
    }],
    enabledActions: makeActionsForStatus(authorizedCase.status),
  };
}

const copyByState = Object.freeze({
  ACCESS_CHECKING: ["正在確認案件授權", "請稍候，確認完成前不會顯示案件內容。"],
  ACCESS_DENIED: ["尚未取得授權案件", "目前沒有可調閱的案件內容或可執行的處理動作。"],
  AUTHORIZED_EMPTY: ["目前沒有待處理案件", "案件完成指派後，會在這裡顯示下一步與最近紀錄。"],
  AUTHORIZED_READY: ["案件授權已確認", "可依案件目前狀態開始文件檢討並留下判斷依據。"],
  CASE_ARCHIVED_READ_ONLY: ["案件已封存，限調閱", "可調閱既有文件與案件紀錄，目前不提供新的處理動作。"],
  LOAD_FAILED_RETRYABLE: ["暫時無法確認案件授權", "請稍後重新整理；確認完成前不會顯示案件內容。"],
});

function copyForState(state) {
  if (state === PCM_AUTHORIZED_CONSOLE_STATES.ACCESS_CHECKING) return copyByState.ACCESS_CHECKING;
  if (state === PCM_AUTHORIZED_CONSOLE_STATES.ACCESS_DENIED) return copyByState.ACCESS_DENIED;
  if (state === PCM_AUTHORIZED_CONSOLE_STATES.AUTHORIZED_EMPTY) return copyByState.AUTHORIZED_EMPTY;
  if (state === PCM_AUTHORIZED_CONSOLE_STATES.AUTHORIZED_READY) return copyByState.AUTHORIZED_READY;
  if (state === PCM_AUTHORIZED_CONSOLE_STATES.CASE_ARCHIVED_READ_ONLY) return copyByState.CASE_ARCHIVED_READ_ONLY;
  if (state === PCM_AUTHORIZED_CONSOLE_STATES.LOAD_FAILED_RETRYABLE) return copyByState.LOAD_FAILED_RETRYABLE;
  return copyByState.ACCESS_DENIED;
}

export function renderPcmAuthorizedConsole(result) {
  if (typeof document === "undefined") return;
  const stateField = readOwnData(result, "state");
  const state = stateField.ok && typeof stateField.value === "string"
    ? stateField.value
    : PCM_AUTHORIZED_CONSOLE_STATES.ACCESS_DENIED;
  const title = document.querySelector("[data-state-title]");
  const detail = document.querySelector("[data-state-detail]");
  const shell = document.querySelector("[data-authorized-shell]");
  const stateCopy = copyForState(state);
  if (title && detail) {
    title.textContent = stateCopy[0];
    detail.textContent = stateCopy[1];
  }
  if (shell) {
    shell.hidden = state !== PCM_AUTHORIZED_CONSOLE_STATES.AUTHORIZED_READY &&
      state !== PCM_AUTHORIZED_CONSOLE_STATES.CASE_ARCHIVED_READ_ONLY;
  }
  document.documentElement.dataset.consoleState = state;
}

if (typeof document !== "undefined") {
  renderPcmAuthorizedConsole(resolvePcmAuthorizedConsoleState());
}
