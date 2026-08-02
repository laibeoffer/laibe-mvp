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

const safeArrayIsArray = Array.isArray;
const SafeArray = Array;
const safeGetOwnPropertyDescriptor = Object.getOwnPropertyDescriptor;
const safeHasOwn = Object.hasOwn;
const safeDefineProperty = Object.defineProperty;
const safeReflectApply = Reflect.apply;
const safeStringTrim = String.prototype.trim;
const noArguments = Object.freeze([]);

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
  } catch {
    return { ok: false, length: 0, items: null };
  }
  const lengthField = readOwnData(value, "length", false);
  if (!lengthField.ok) return { ok: false, length: 0, items: null };
  const items = new SafeArray(lengthField.value);
  for (let index = 0; index < lengthField.value; index += 1) {
    const itemField = readOwnData(value, index);
    if (!itemField.ok) return { ok: false, length: 0, items: null };
    safeDefineProperty(items, index, {
      value: itemField.value,
      enumerable: true,
      writable: true,
      configurable: true,
    });
  }
  return { ok: true, length: lengthField.value, items };
}

function makeGovernanceActions(includeReason) {
  const actions = new SafeArray(includeReason ? 3 : 2);
  safeDefineProperty(actions, 0, { value: "manage_access", enumerable: true, writable: true, configurable: true });
  safeDefineProperty(actions, 1, { value: "manual_assignment", enumerable: true, writable: true, configurable: true });
  if (includeReason) {
    safeDefineProperty(actions, 2, { value: "record_reason", enumerable: true, writable: true, configurable: true });
  }
  return actions;
}

export function resolveInternalGovernanceState(context = INITIAL_GOVERNANCE_CONTEXT) {
  const sessionStatusField = readOwnData(context, "sessionStatus");
  if (!sessionStatusField.ok || sessionStatusField.value === "unavailable") {
    return denied("governance_unavailable");
  }
  const sessionStatus = sessionStatusField.value;
  if (sessionStatus === "checking") {
    return {
      state: INTERNAL_GOVERNANCE_STATES.GOVERNANCE_CHECKING,
      reasonCode: "governance_checking",
      governancePayload: [],
      enabledActions: [],
    };
  }
  if (sessionStatus === "error") {
    return {
      state: INTERNAL_GOVERNANCE_STATES.GOVERNANCE_LOAD_FAILED,
      reasonCode: "governance_check_failed",
      governancePayload: [],
      enabledActions: [],
    };
  }

  const actorField = readOwnData(context, "actor");
  const assignmentField = readOwnData(context, "assignment");
  const recordsField = readOwnData(context, "records");
  if (!actorField.ok || !assignmentField.ok || !recordsField.ok) {
    return denied("governance_authorization_incomplete");
  }
  const actorIdField = readOwnData(actorField.value, "id");
  const actorRoleField = readOwnData(actorField.value, "role");
  const assignmentActorIdField = readOwnData(assignmentField.value, "actorId");
  const assignmentScopeField = readOwnData(assignmentField.value, "scope");
  const assignmentStatusField = readOwnData(assignmentField.value, "status");
  const assignmentModeField = readOwnData(assignmentField.value, "mode");
  if (
    sessionStatus !== "ready" ||
    !actorIdField.ok || !isNonEmptyString(actorIdField.value) ||
    !actorRoleField.ok || actorRoleField.value !== "governance_admin" ||
    !assignmentActorIdField.ok || !isNonEmptyString(assignmentActorIdField.value) ||
    assignmentActorIdField.value !== actorIdField.value ||
    !assignmentScopeField.ok || assignmentScopeField.value !== "pcm_internal_governance" ||
    !assignmentStatusField.ok || assignmentStatusField.value !== "active" ||
    !assignmentModeField.ok ||
    (assignmentModeField.value !== "active" && assignmentModeField.value !== "read_only")
  ) {
    return denied("governance_authorization_incomplete");
  }

  const assignmentMode = assignmentModeField.value;
  const sourceRecords = readDenseArray(recordsField.value);
  if (!sourceRecords.ok) return denied("governance_records_invalid");
  const records = new SafeArray(sourceRecords.length);
  for (let index = 0; index < sourceRecords.length; index += 1) {
    const row = sourceRecords.items[index];
    const idField = readOwnData(row, "id");
    const categoryField = readOwnData(row, "category");
    if (
      !idField.ok || !isNonEmptyString(idField.value) ||
      !categoryField.ok || !isNonEmptyString(categoryField.value)
    ) {
      return denied("governance_records_invalid");
    }
    safeDefineProperty(records, index, {
      value: { id: idField.value, category: categoryField.value },
      enumerable: true,
      writable: true,
      configurable: true,
    });
  }

  if (assignmentMode === "read_only") {
    return {
      state: INTERNAL_GOVERNANCE_STATES.GOVERNANCE_READ_ONLY,
      reasonCode: "governance_read_only",
      governancePayload: records,
      enabledActions: [],
    };
  }

  if (records.length === 0) {
    return {
      state: INTERNAL_GOVERNANCE_STATES.GOVERNANCE_EMPTY,
      reasonCode: "no_governance_records",
      governancePayload: [],
      enabledActions: makeGovernanceActions(false),
    };
  }

  return {
    state: INTERNAL_GOVERNANCE_STATES.GOVERNANCE_READY,
    reasonCode: "governance_ready",
    governancePayload: records,
    enabledActions: makeGovernanceActions(true),
  };
}

const copyByState = Object.freeze({
  GOVERNANCE_CHECKING: ["正在確認管理權限", "確認完成前，不會顯示帳號、成員或契約紀錄。"],
  GOVERNANCE_DENIED: ["尚未取得內部治理權限", "目前沒有可調閱的內部紀錄或可執行的管理動作。"],
  GOVERNANCE_EMPTY: ["目前沒有治理紀錄", "建立受邀帳號或人工指派案件後，變更原因會依序留存。"],
  GOVERNANCE_READY: ["內部治理權限已確認", "可依責任範圍管理帳號、人工指派與異動原因。"],
  GOVERNANCE_READ_ONLY: ["內部治理為唯讀", "可調閱既有治理紀錄，目前不提供異動操作。"],
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
