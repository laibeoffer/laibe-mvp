const safeCreate = Object.create;
const safeDefineProperty = Object.defineProperty;
const safeFreeze = Object.freeze;
const safeGetOwnPropertyDescriptor = Object.getOwnPropertyDescriptor;
const safeGetPrototypeOf = Object.getPrototypeOf;
const iteratorKey = Symbol.iterator;

function freezeRecord(entries) {
  const record = safeCreate(null);
  for (let index = 0; index < entries.length; index += 1) {
    const entry = entries[index];
    safeDefineProperty(record, entry[0], {
      configurable: false,
      enumerable: true,
      value: entry[1],
      writable: false,
    });
  }
  return safeFreeze(record);
}

function iteratorResult(done, value) {
  return freezeRecord([
    ["done", done],
    ["value", value],
  ]);
}

function freezeList(...items) {
  const list = safeCreate(null);
  const length = items.length;
  for (let index = 0; index < length; index += 1) {
    safeDefineProperty(list, String(index), {
      configurable: false,
      enumerable: true,
      value: items[index],
      writable: false,
    });
  }
  safeDefineProperty(list, "length", {
    configurable: false,
    enumerable: false,
    value: length,
    writable: false,
  });
  safeDefineProperty(list, iteratorKey, {
    configurable: false,
    enumerable: false,
    value() {
      let index = 0;
      const iterator = safeCreate(null);
      safeDefineProperty(iterator, "next", {
        configurable: false,
        enumerable: false,
        value() {
          if (index >= length) return iteratorResult(true, undefined);
          const value = list[index];
          index += 1;
          return iteratorResult(false, value);
        },
        writable: false,
      });
      safeDefineProperty(iterator, iteratorKey, {
        configurable: false,
        enumerable: false,
        value() {
          return iterator;
        },
        writable: false,
      });
      return safeFreeze(iterator);
    },
    writable: false,
  });
  return safeFreeze(list);
}

function freezeCompatibilityList(...items) {
  const list = [];
  const length = items.length;
  for (let index = 0; index < length; index += 1) {
    safeDefineProperty(list, String(index), {
      configurable: false,
      enumerable: true,
      value: items[index],
      writable: false,
    });
  }
  safeDefineProperty(list, iteratorKey, {
    configurable: false,
    enumerable: false,
    value() {
      let index = 0;
      const iterator = safeCreate(null);
      safeDefineProperty(iterator, "next", {
        configurable: false,
        enumerable: false,
        value() {
          if (index >= length) return iteratorResult(true, undefined);
          const value = list[index];
          index += 1;
          return iteratorResult(false, value);
        },
        writable: false,
      });
      safeDefineProperty(iterator, iteratorKey, {
        configurable: false,
        enumerable: false,
        value() {
          return iterator;
        },
        writable: false,
      });
      return safeFreeze(iterator);
    },
    writable: false,
  });
  return safeFreeze(list);
}

function resource(code, label, submissionBoundary, pcmExitMode) {
  return freezeRecord([
    ["code", code],
    ["label", label],
    ["submissionBoundary", submissionBoundary],
    ["pcmExitMode", pcmExitMode],
    ["defaultWriteEnabled", false],
  ]);
}

const CONTRACT_DRAFT_VERSIONS = resource(
  "CONTRACT_DRAFT_VERSIONS",
  "契約草稿版本",
  "OWNER_SIGNING_DRAFT_ONLY",
  "BILATERAL_CONTINUATION",
);
const ATTACHMENTS = resource(
  "ATTACHMENTS",
  "附件",
  "VENDOR_EDIT_AND_SUBMIT",
  "BILATERAL_CONTINUATION",
);
const PUBLIC_PCM_REVIEWS = resource(
  "PUBLIC_PCM_REVIEWS",
  "公開審查意見",
  "PCM_PUBLIC_REVIEW",
  "HISTORICAL_READ_ONLY",
);
const SUPPLEMENTS = resource(
  "SUPPLEMENTS",
  "補件",
  "VENDOR_EDIT_AND_SUBMIT",
  "BILATERAL_CONTINUATION",
);
const SCHEDULES = resource(
  "SCHEDULES",
  "排程",
  "BILATERAL_CASE_WORK",
  "BILATERAL_CONTINUATION",
);
const EVIDENCE = resource(
  "EVIDENCE",
  "證據",
  "BILATERAL_CASE_WORK",
  "BILATERAL_CONTINUATION",
);
const ACCEPTANCE = resource(
  "ACCEPTANCE",
  "驗收",
  "BILATERAL_CASE_WORK",
  "BILATERAL_CONTINUATION",
);
const CHANGES = resource(
  "CHANGES",
  "變更",
  "BILATERAL_CASE_WORK",
  "BILATERAL_CONTINUATION",
);
const ADDENDA = resource(
  "ADDENDA",
  "附約",
  "CREATE_ADDENDUM_DRAFT",
  "BILATERAL_CONTINUATION",
);
const CASE_RECORDS = resource(
  "CASE_RECORDS",
  "案件紀錄",
  "TRACEABLE_CASE_EVENT",
  "BILATERAL_CONTINUATION",
);

export const VENDOR_WORKSPACE_RESOURCES = freezeList(
  CONTRACT_DRAFT_VERSIONS,
  ATTACHMENTS,
  PUBLIC_PCM_REVIEWS,
  SUPPLEMENTS,
  SCHEDULES,
  EVIDENCE,
  ACCEPTANCE,
  CHANGES,
  ADDENDA,
  CASE_RECORDS,
);

function closedAction(code, label) {
  return freezeRecord([
    ["code", code],
    ["label", label],
    ["enabled", false],
    ["mutationAuthority", false],
  ]);
}

export const VENDOR_WORKSPACE_ACTIONS = freezeList(
  closedAction("EDIT_ATTACHMENT", "編輯附件"),
  closedAction("SUBMIT_FOR_PCM_REVIEW", "提送 PCM 審查"),
  closedAction("SAVE_SCHEDULE", "儲存排程"),
  closedAction("ADD_EVIDENCE", "新增證據"),
  closedAction("CONFIRM_ACCEPTANCE", "確認驗收"),
  closedAction("CREATE_CHANGE", "建立變更"),
  closedAction("CREATE_ADDENDUM_DRAFT", "建立附約草稿"),
  closedAction("SIGN_CONTRACT", "簽署契約"),
);

function workspaceState({
  code,
  title,
  reason,
  nextAction,
  responsible,
  returnPath,
  recovery,
  protectedRouteAllowed = false,
  workspaceMode = "NO_WORKSPACE",
  caseMode = "ZERO_CASE_DATA",
  newPcmOperationsAllowed = false,
  historicalPcmDataMode = "UNAVAILABLE",
  rejoinRequiresNewAuthorization = false,
  preserveResources = null,
}) {
  return freezeRecord([
    ["code", code],
    ["title", title],
    ["reason", reason],
    ["nextAction", nextAction],
    ["responsible", responsible],
    ["returnPath", returnPath],
    ["recovery", recovery],
    ["payloadPolicy", caseMode === "ZERO_CASE_DATA" ? "ZERO_CASE_DATA" : "AUTHORIZED_SCOPE_ONLY"],
    ["caseData", null],
    ["payload", null],
    ["mutationAllowed", false],
    ["writeActionsEnabled", false],
    ["protectedRouteAllowed", protectedRouteAllowed],
    ["workspaceMode", workspaceMode],
    ["caseMode", caseMode],
    ["newPcmOperationsAllowed", newPcmOperationsAllowed],
    ["historicalPcmDataMode", historicalPcmDataMode],
    ["rejoinRequiresNewAuthorization", rejoinRequiresNewAuthorization],
    ["preserveResources", preserveResources],
    ["actions", VENDOR_WORKSPACE_ACTIONS],
  ]);
}

export const CONTEXT_UNAVAILABLE = workspaceState({
  code: "CONTEXT_UNAVAILABLE",
  title: "目前無法確認乙方工作台情境",
  reason: "沒有足夠資料可確認身分、案件成員或案件權限。",
  nextAction: "返回乙方邀請入口重新確認。",
  responsible: "目前使用者",
  returnPath: "乙方邀請入口",
  recovery: "從甲方正式通知重新進入；確認完成前維持零案件資料。",
});

const MEMBERSHIP_UNCONFIRMED = workspaceState({
  code: "MEMBERSHIP_UNCONFIRMED",
  title: "案件成員仍無法確認",
  reason: "目前帳號無法證明是被邀請或已加入這個案件的乙方。",
  nextAction: "甲方核對邀請對象與案件成員資料。",
  responsible: "甲方",
  returnPath: "乙方邀請入口",
  recovery: "成員資料一致後，再由邀請入口重新確認。",
});

const AUTHORIZED_VENDOR_WORKSPACE = workspaceState({
  code: "AUTHORIZED_VENDOR_WORKSPACE",
  title: "乙方案件授權已確認",
  reason: "可信流程已確認身分、案件成員與可查看的案件範圍。",
  nextAction: "在原乙方工作台依案件紀錄處理下一項責任。",
  responsible: "受邀乙方",
  returnPath: "原乙方工作台",
  recovery: "權限出現差異時停止操作，回到邀請入口重新確認。",
  protectedRouteAllowed: true,
  workspaceMode: "ORIGINAL_VENDOR_WORKSPACE",
  caseMode: "AUTHORIZED_VENDOR_SCOPE",
  newPcmOperationsAllowed: true,
  historicalPcmDataMode: "CURRENT_AND_HISTORY",
  preserveResources: VENDOR_WORKSPACE_RESOURCES,
});

const PCM_EXITED_BILATERAL_CONTINUATION = workspaceState({
  code: "PCM_EXITED_BILATERAL_CONTINUATION",
  title: "PCM 已退出，甲乙雙方繼續案件",
  reason: "原工作台與十項案件資源繼續運作；停止新的 PCM 操作，歷史 PCM 資料只供查閱。",
  nextAction: "甲乙雙方依原案件紀錄繼續處理；需要 PCM 再加入時取得新授權。",
  responsible: "甲方與乙方",
  returnPath: "原甲乙工作台",
  recovery: "保留原案件脈絡；PCM 再加入必須完成新的授權。",
  protectedRouteAllowed: true,
  workspaceMode: "ORIGINAL_VENDOR_WORKSPACE",
  caseMode: "BILATERAL_CONTINUATION",
  newPcmOperationsAllowed: false,
  historicalPcmDataMode: "READ_ONLY",
  rejoinRequiresNewAuthorization: true,
  preserveResources: VENDOR_WORKSPACE_RESOURCES,
});

const CASE_CLOSED_READ_ONLY = workspaceState({
  code: "CASE_CLOSED_READ_ONLY",
  title: "案件已結案，原工作台保留查閱",
  reason: "案件已完成結案，既有文件、決定與案件紀錄留在原工作台供追溯。",
  nextAction: "查看結案依據、確認結果與最近紀錄。",
  responsible: "案件甲乙雙方",
  returnPath: "原乙方工作台",
  recovery: "需要後續處理時另建可追溯事項，不修改既有結案內容。",
  protectedRouteAllowed: true,
  workspaceMode: "ORIGINAL_WORKSPACE_READ_ONLY",
  caseMode: "CASE_CLOSED",
  historicalPcmDataMode: "READ_ONLY",
  preserveResources: VENDOR_WORKSPACE_RESOURCES,
});

const CANCELLED = workspaceState({
  code: "CANCELLED",
  title: "案件已取消，原工作台保留取消依據",
  reason: "案件在結案前取消；取消原因、已存在文件與案件紀錄仍保留追溯。",
  nextAction: "查看取消依據與最後一筆有效紀錄。",
  responsible: "案件甲乙雙方",
  returnPath: "原乙方工作台",
  recovery: "若日後重新合作，另以新的案件與授權開始，不改寫已取消案件。",
  protectedRouteAllowed: true,
  workspaceMode: "ORIGINAL_WORKSPACE_READ_ONLY",
  caseMode: "CANCELLED",
  historicalPcmDataMode: "READ_ONLY",
  preserveResources: VENDOR_WORKSPACE_RESOURCES,
});

export const VENDOR_WORKSPACE_CANONICAL_STATES = freezeRecord([
  ["CONTEXT_UNAVAILABLE", CONTEXT_UNAVAILABLE],
  ["MEMBERSHIP_UNCONFIRMED", MEMBERSHIP_UNCONFIRMED],
  ["AUTHORIZED_VENDOR_WORKSPACE", AUTHORIZED_VENDOR_WORKSPACE],
  ["PCM_EXITED_BILATERAL_CONTINUATION", PCM_EXITED_BILATERAL_CONTINUATION],
  ["CASE_CLOSED_READ_ONLY", CASE_CLOSED_READ_ONLY],
  ["CANCELLED", CANCELLED],
]);

export const VENDOR_WORKSPACE_STATE_LIST = freezeList(
  CONTEXT_UNAVAILABLE,
  MEMBERSHIP_UNCONFIRMED,
  AUTHORIZED_VENDOR_WORKSPACE,
  PCM_EXITED_BILATERAL_CONTINUATION,
  CASE_CLOSED_READ_ONLY,
  CANCELLED,
);

export function resolveVendorWorkspaceAccess(_input) {
  return CONTEXT_UNAVAILABLE;
}

export const VENDOR_WORKSPACE_STATES = freezeCompatibilityList(
  "ACCESS_CHECKING",
  "ACCESS_DENIED",
  "CONTRACT_PENDING",
  "AUTHORIZED_EMPTY",
  "AUTHORIZED_READY",
  "CASE_ARCHIVED_READ_ONLY",
  "LOAD_FAILED_RETRYABLE",
);

function isLegacyRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isLegacyText(value) {
  return typeof value === "string" && value.length > 0;
}

function legacyResult(state, reasonCode) {
  return { state, reasonCode };
}

export function resolveVendorWorkspaceState(context) {
  try {
    if (!isLegacyRecord(context)) {
      return legacyResult("ACCESS_DENIED", "TRUSTED_VENDOR_CONTEXT_REQUIRED");
    }
    if (context.loadStatus === "checking") {
      return legacyResult("ACCESS_CHECKING", "VENDOR_CONTEXT_CHECKING");
    }
    if (context.loadStatus === "failed") {
      return legacyResult("LOAD_FAILED_RETRYABLE", "VENDOR_CONTEXT_LOAD_FAILED");
    }

    const actor = context.actor;
    const membership = context.membership;
    const binding = context.caseBinding;
    const agreement = context.agreement;
    const caseId = membership?.caseId;
    const identityValid =
      context.sessionStatus === "active"
      && isLegacyRecord(actor)
      && isLegacyText(actor.actorId)
      && actor.role === "vendor"
      && isLegacyRecord(membership)
      && membership.actorId === actor.actorId
      && membership.role === "vendor"
      && membership.status === "active"
      && membership.invitationStatus === "accepted"
      && isLegacyText(caseId)
      && isLegacyRecord(binding)
      && binding.status === "bound"
      && binding.caseId === caseId;

    if (!identityValid) {
      return legacyResult("ACCESS_DENIED", "VENDOR_CASE_ACCESS_DENIED");
    }

    const agreementExact =
      isLegacyRecord(agreement)
      && agreement.caseId === caseId
      && isLegacyText(agreement.version)
      && agreement.status === "active"
      && agreement.vendorAccepted === true
      && agreement.vendorActorId === actor.actorId;
    if (!agreementExact) {
      return legacyResult("CONTRACT_PENDING", "VENDOR_AGREEMENT_PENDING");
    }

    if (context.caseStatus !== "active" && context.caseStatus !== "archived") {
      return legacyResult("ACCESS_DENIED", "VENDOR_CASE_STATE_INVALID");
    }
    if (!isLegacyRecord(context.caseSummary)) {
      return legacyResult("AUTHORIZED_EMPTY", "VENDOR_CASE_SUMMARY_PENDING");
    }
    if (context.caseSummary.caseId !== caseId) {
      return legacyResult("ACCESS_DENIED", "VENDOR_CASE_SUMMARY_MISMATCH");
    }
    if (context.caseStatus === "archived") {
      return legacyResult("CASE_ARCHIVED_READ_ONLY", "VENDOR_CASE_ARCHIVED");
    }
    return legacyResult("AUTHORIZED_READY", "VENDOR_CASE_CONTEXT_CONFIRMED");
  } catch {
    return legacyResult("ACCESS_DENIED", "TRUSTED_VENDOR_CONTEXT_REQUIRED");
  }
}

function safeGlobalDocument() {
  let owner = globalThis;
  for (let depth = 0; depth < 4 && owner; depth += 1) {
    let descriptor;
    try {
      descriptor = safeGetOwnPropertyDescriptor(owner, "document");
    } catch {
      return null;
    }
    if (descriptor) {
      if (!("value" in descriptor)) return null;
      return descriptor.value ?? null;
    }
    try {
      owner = safeGetPrototypeOf(owner);
    } catch {
      return null;
    }
  }
  return null;
}

function closeControl(control) {
  try {
    control.disabled = true;
  } catch {
    // Static markup remains closed.
  }
  try {
    control.setAttribute("aria-disabled", "true");
  } catch {
    // Static markup remains closed.
  }
}

export function initializeVendorWorkspace(root) {
  if (!root) return CONTEXT_UNAVAILABLE;
  try {
    root.body?.setAttribute("data-vendor-state", CONTEXT_UNAVAILABLE.code);
  } catch {
    // Static markup already declares the closed state.
  }
  let controls;
  try {
    controls = root.querySelectorAll("[data-write-action]");
  } catch {
    return CONTEXT_UNAVAILABLE;
  }
  let length = 0;
  try {
    length = controls.length;
  } catch {
    return CONTEXT_UNAVAILABLE;
  }
  if (typeof length !== "number" || length < 0 || length > 64 || length % 1 !== 0) {
    return CONTEXT_UNAVAILABLE;
  }
  for (let index = 0; index < length; index += 1) {
    try {
      closeControl(controls[index]);
    } catch {
      continue;
    }
  }
  return CONTEXT_UNAVAILABLE;
}

const documentRoot = safeGlobalDocument();
if (documentRoot) initializeVendorWorkspace(documentRoot);
