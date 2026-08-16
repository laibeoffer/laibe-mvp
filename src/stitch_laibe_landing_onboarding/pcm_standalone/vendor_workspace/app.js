const safeCreate = Object.create;
const safeDefineProperty = Object.defineProperty;
const safeFreeze = Object.freeze;
const safeGetOwnPropertyDescriptor = Object.getOwnPropertyDescriptor;
const safeGetPrototypeOf = Object.getPrototypeOf;
const safeApply = Reflect.apply;
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

export const VENDOR_WORKSPACE_TAB_KEYS = freezeList(
  "design",
  "construction",
  "contract",
);

function isVendorWorkspaceTabKey(value) {
  return value === "design" || value === "construction" || value === "contract";
}

export function resolveVendorWorkspaceTabKey(activeTab, key) {
  const current = isVendorWorkspaceTabKey(activeTab) ? activeTab : "design";
  if (key === "Home") return "design";
  if (key === "End") return "contract";
  if (key !== "ArrowLeft" && key !== "ArrowRight") return current;
  let currentIndex = 0;
  for (let index = 0; index < VENDOR_WORKSPACE_TAB_KEYS.length; index += 1) {
    if (VENDOR_WORKSPACE_TAB_KEYS[index] === current) {
      currentIndex = index;
      break;
    }
  }
  const offset = key === "ArrowRight" ? 1 : -1;
  const nextIndex = (
    currentIndex + offset + VENDOR_WORKSPACE_TAB_KEYS.length
  ) % VENDOR_WORKSPACE_TAB_KEYS.length;
  return VENDOR_WORKSPACE_TAB_KEYS[nextIndex];
}

export const VENDOR_CONTRACT_IMPACT_KEYS = freezeList(
  "SCOPE",
  "PRICE",
  "TIME",
  "PAYMENT",
  "ACCEPTANCE",
  "MATERIAL",
  "WARRANTY",
);

function ownValue(record, key) {
  if (!record || (typeof record !== "object" && typeof record !== "function")) {
    return undefined;
  }
  try {
    return safeGetOwnPropertyDescriptor(record, key)?.value;
  } catch {
    return undefined;
  }
}

function ownListLength(list) {
  const length = ownValue(list, "length");
  return typeof length === "number" && length >= 0 && length <= 32 && length % 1 === 0
    ? length
    : null;
}

function isVendorContractImpactKey(value) {
  for (let index = 0; index < VENDOR_CONTRACT_IMPACT_KEYS.length; index += 1) {
    if (VENDOR_CONTRACT_IMPACT_KEYS[index] === value) return true;
  }
  return false;
}

export function classifyVendorContractEntry(impactKeys) {
  const length = ownListLength(impactKeys);
  if (length === 0) return "SUPPLEMENT";
  if (length === null) return "CHANGE_PROPOSAL";
  for (let index = 0; index < length; index += 1) {
    const key = ownValue(impactKeys, String(index));
    if (!isVendorContractImpactKey(key)) return "CHANGE_PROPOSAL";
  }
  return "CHANGE_PROPOSAL";
}

function textValue(value) {
  return typeof value === "string" ? value : "";
}

function vendorResponseIntentValue(value) {
  if (
    value === "PROVIDE_INFORMATION"
    || value === "REQUEST_OWNER_REVIEW"
    || value === "REQUEST_DRS_REVIEW"
  ) {
    return value;
  }
  return "";
}

function attachmentMetadata(source) {
  return freezeRecord([
    ["fileName", textValue(ownValue(source, "fileName"))],
    ["versionLabel", textValue(ownValue(source, "versionLabel"))],
    ["note", textValue(ownValue(source, "note"))],
  ]);
}

function normalizedImpactKeys(source) {
  const nextKeys = [];
  const length = ownListLength(source);
  if (length === null) return freezeList();
  for (let index = 0; index < length; index += 1) {
    const key = ownValue(source, String(index));
    if (!isVendorContractImpactKey(key)) continue;
    let duplicate = false;
    for (let nextIndex = 0; nextIndex < nextKeys.length; nextIndex += 1) {
      if (nextKeys[nextIndex] === key) duplicate = true;
    }
    if (!duplicate) nextKeys.push(key);
  }
  return freezeList(...nextKeys);
}

function contractDraftState(fields) {
  const impactKeys = normalizedImpactKeys(ownValue(fields, "impactKeys"));
  return freezeRecord([
    ["description", textValue(ownValue(fields, "description"))],
    ["impactKeys", impactKeys],
    ["classification", classifyVendorContractEntry(impactKeys)],
    ["relatedVersion", textValue(ownValue(fields, "relatedVersion"))],
    ["attachmentMetadata", attachmentMetadata(ownValue(fields, "attachmentMetadata"))],
    ["vendorResponseIntent", vendorResponseIntentValue(ownValue(fields, "vendorResponseIntent"))],
    ["ownerDecisionStatus", "NOT_RECORDED"],
    ["partyAgreementStatus", "NOT_RECORDED"],
    ["drsReviewStatus", "NOT_REQUESTED"],
    ["paymentStatus", "NOT_RECORDED"],
    ["persistenceStatus", "SESSION_ONLY"],
  ]);
}

export function createVendorContractDraftState() {
  return contractDraftState(freezeRecord([
    ["description", ""],
    ["impactKeys", freezeList()],
    ["relatedVersion", ""],
    ["attachmentMetadata", attachmentMetadata(null)],
    ["vendorResponseIntent", ""],
  ]));
}

function normalizeVendorContractDraftState(state) {
  return contractDraftState(freezeRecord([
    ["description", ownValue(state, "description")],
    ["impactKeys", ownValue(state, "impactKeys")],
    ["relatedVersion", ownValue(state, "relatedVersion")],
    ["attachmentMetadata", ownValue(state, "attachmentMetadata")],
    ["vendorResponseIntent", ownValue(state, "vendorResponseIntent")],
  ]));
}

function replaceDraft(current, changes) {
  return contractDraftState(freezeRecord([
    ["description", ownValue(changes, "description") ?? ownValue(current, "description")],
    ["impactKeys", ownValue(changes, "impactKeys") ?? ownValue(current, "impactKeys")],
    ["relatedVersion", ownValue(changes, "relatedVersion") ?? ownValue(current, "relatedVersion")],
    ["attachmentMetadata", ownValue(changes, "attachmentMetadata") ?? ownValue(current, "attachmentMetadata")],
    ["vendorResponseIntent", ownValue(changes, "vendorResponseIntent") ?? ownValue(current, "vendorResponseIntent")],
  ]));
}

function toggleImpactKeys(currentKeys, key) {
  if (!isVendorContractImpactKey(key)) return currentKeys;
  const nextKeys = [];
  let removed = false;
  const length = ownListLength(currentKeys) ?? 0;
  for (let index = 0; index < length; index += 1) {
    const currentKey = ownValue(currentKeys, String(index));
    if (currentKey === key) {
      removed = true;
    } else if (isVendorContractImpactKey(currentKey)) {
      nextKeys.push(currentKey);
    }
  }
  if (!removed) nextKeys.push(key);
  return freezeList(...nextKeys);
}

export function reduceVendorContractDraft(state, event) {
  const current = normalizeVendorContractDraftState(state);
  const type = ownValue(event, "type");
  if (type === "CLEAR") return createVendorContractDraftState();
  if (type === "DESCRIPTION_CHANGED") {
    return replaceDraft(current, freezeRecord([["description", textValue(ownValue(event, "value"))]]));
  }
  if (type === "IMPACT_TOGGLED") {
    return replaceDraft(current, freezeRecord([[
      "impactKeys",
      toggleImpactKeys(ownValue(current, "impactKeys"), ownValue(event, "key")),
    ]]));
  }
  if (type === "RELATED_VERSION_CHANGED") {
    return replaceDraft(current, freezeRecord([["relatedVersion", textValue(ownValue(event, "value"))]]));
  }
  if (type === "ATTACHMENT_METADATA_CHANGED") {
    const field = ownValue(event, "field");
    if (field !== "fileName" && field !== "versionLabel" && field !== "note") return current;
    const existing = ownValue(current, "attachmentMetadata");
    const changed = freezeRecord([
      ["fileName", field === "fileName" ? textValue(ownValue(event, "value")) : ownValue(existing, "fileName")],
      ["versionLabel", field === "versionLabel" ? textValue(ownValue(event, "value")) : ownValue(existing, "versionLabel")],
      ["note", field === "note" ? textValue(ownValue(event, "value")) : ownValue(existing, "note")],
    ]);
    return replaceDraft(current, freezeRecord([["attachmentMetadata", changed]]));
  }
  if (type === "VENDOR_RESPONSE_INTENT_CHANGED") {
    return replaceDraft(current, freezeRecord([["vendorResponseIntent", textValue(ownValue(event, "value"))]]));
  }
  return current;
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

const EMPTY_ARGUMENTS = freezeList();

function safeMethod(candidate, key) {
  try {
    return typeof candidate[key] === "function";
  } catch {
    return false;
  }
}

function isVendorDocument(candidate) {
  if (!candidate || (typeof candidate !== "object" && typeof candidate !== "function")) {
    return false;
  }
  let body;
  try {
    body = candidate.body;
  } catch {
    return false;
  }
  return Boolean(body)
    && safeMethod(body, "setAttribute")
    && safeMethod(candidate, "querySelector")
    && safeMethod(candidate, "querySelectorAll");
}

export function resolveVendorDocument(globalObject) {
  if (!globalObject || (typeof globalObject !== "object" && typeof globalObject !== "function")) {
    return null;
  }
  const receiver = globalObject;
  let owner = globalObject;
  for (let depth = 0; depth < 6 && owner; depth += 1) {
    let descriptor;
    try {
      descriptor = safeGetOwnPropertyDescriptor(owner, "document");
    } catch {
      return null;
    }
    if (descriptor) {
      let candidate;
      try {
        const valueDescriptor = safeGetOwnPropertyDescriptor(descriptor, "value");
        if (valueDescriptor) {
          candidate = valueDescriptor.value;
        } else {
          const getterDescriptor = safeGetOwnPropertyDescriptor(descriptor, "get");
          const getter = getterDescriptor?.value;
          if (typeof getter !== "function") return null;
          candidate = safeApply(getter, receiver, EMPTY_ARGUMENTS);
        }
      } catch {
        return null;
      }
      return isVendorDocument(candidate) ? candidate : null;
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

function enableSessionControl(control) {
  try {
    control.disabled = false;
  } catch {
    return;
  }
  try {
    control.setAttribute("aria-disabled", "false");
  } catch {
    // Native disabled state is the authority boundary.
  }
}

function vendorContractNode(root, selector) {
  try {
    return root.querySelector(selector);
  } catch {
    return null;
  }
}

function vendorContractNodes(root, selector) {
  try {
    return root.querySelectorAll(selector);
  } catch {
    return null;
  }
}

function vendorContractNodeValue(node) {
  try {
    return typeof node?.value === "string" ? node.value : "";
  } catch {
    return "";
  }
}

function vendorContractNodeChecked(node) {
  try {
    return node?.checked === true;
  } catch {
    return false;
  }
}

function setVendorContractText(node, value) {
  if (!node) return;
  try {
    node.textContent = value;
  } catch {
    // Missing status output cannot create formal state.
  }
}

function listenVendorContract(node, eventName, listener) {
  if (!node) return;
  try {
    node.addEventListener(eventName, listener);
  } catch {
    // The remaining session fields stay native and non-persistent.
  }
}

function vendorResponseLabel(intent) {
  if (intent === "PROVIDE_INFORMATION") return "補充資料供確認";
  if (intent === "REQUEST_OWNER_REVIEW") return "請甲方決定";
  if (intent === "REQUEST_DRS_REVIEW") return "請 DRS 協助整理風險";
  return "尚未選擇";
}

function draftHasImpact(state, key) {
  const impactKeys = ownValue(state, "impactKeys");
  const length = ownListLength(impactKeys) ?? 0;
  for (let index = 0; index < length; index += 1) {
    if (ownValue(impactKeys, String(index)) === key) return true;
  }
  return false;
}

function initializeVendorContractSession(root) {
  const form = vendorContractNode(root, "[data-vendor-contract-form]");
  const classificationOutput = vendorContractNode(
    root,
    "[data-vendor-contract-classification]",
  );
  const responseOutput = vendorContractNode(root, "[data-vendor-contract-response-status]");
  const draftStatusOutput = vendorContractNode(root, "[data-vendor-contract-draft-status]");
  const hierarchyStatusOutput = vendorContractNode(
    root,
    "[data-vendor-contract-hierarchy-status]",
  );
  if (
    !form
    || !classificationOutput
    || !responseOutput
    || !draftStatusOutput
    || !hierarchyStatusOutput
  ) {
    return;
  }

  let state = createVendorContractDraftState();
  let dirty = false;

  function render() {
    setVendorContractText(
      classificationOutput,
      ownValue(state, "classification") === "CHANGE_PROPOSAL" ? "變更提案" : "補件",
    );
    setVendorContractText(
      responseOutput,
      vendorResponseLabel(ownValue(state, "vendorResponseIntent")),
    );
    setVendorContractText(
      draftStatusOutput,
      dirty ? "本頁草稿已修改（尚未送出或保存）" : "本頁草稿尚未修改",
    );
    setVendorContractText(
      hierarchyStatusOutput,
      dirty
        ? "本次補件／變更草稿已修改（尚未送出或保存）"
        : "尚未建立本次補件／變更草稿",
    );
  }

  function dispatch(event) {
    state = reduceVendorContractDraft(state, event);
    dirty = true;
    render();
  }

  const description = vendorContractNode(root, "[data-vendor-contract-description]");
  listenVendorContract(description, "input", () => {
    dispatch(freezeRecord([
      ["type", "DESCRIPTION_CHANGED"],
      ["value", vendorContractNodeValue(description)],
    ]));
  });

  const impacts = vendorContractNodes(root, "[data-vendor-contract-impact]");
  let impactLength = 0;
  try {
    impactLength = impacts?.length ?? 0;
  } catch {
    impactLength = 0;
  }
  if (
    typeof impactLength === "number"
    && impactLength >= 0
    && impactLength <= VENDOR_CONTRACT_IMPACT_KEYS.length
    && impactLength % 1 === 0
  ) {
    for (let index = 0; index < impactLength; index += 1) {
      const impact = impacts[index];
      listenVendorContract(impact, "change", () => {
        const key = vendorContractNodeValue(impact);
        if (vendorContractNodeChecked(impact) === draftHasImpact(state, key)) return;
        dispatch(freezeRecord([
          ["type", "IMPACT_TOGGLED"],
          ["key", key],
        ]));
      });
    }
  }

  const relatedVersion = vendorContractNode(root, "[data-vendor-contract-related-version]");
  listenVendorContract(relatedVersion, "input", () => {
    dispatch(freezeRecord([
      ["type", "RELATED_VERSION_CHANGED"],
      ["value", vendorContractNodeValue(relatedVersion)],
    ]));
  });

  function bindAttachmentInput(selector, field) {
    const attachmentInput = vendorContractNode(root, selector);
    listenVendorContract(attachmentInput, "input", () => {
      dispatch(freezeRecord([
        ["type", "ATTACHMENT_METADATA_CHANGED"],
        ["field", field],
        ["value", vendorContractNodeValue(attachmentInput)],
      ]));
    });
  }
  bindAttachmentInput("[data-vendor-contract-attachment-file-name]", "fileName");
  bindAttachmentInput("[data-vendor-contract-attachment-version-label]", "versionLabel");
  bindAttachmentInput("[data-vendor-contract-attachment-note]", "note");

  const response = vendorContractNode(root, "[data-vendor-contract-response]");
  listenVendorContract(response, "change", () => {
    dispatch(freezeRecord([
      ["type", "VENDOR_RESPONSE_INTENT_CHANGED"],
      ["value", vendorContractNodeValue(response)],
    ]));
  });

  listenVendorContract(form, "reset", () => {
    state = reduceVendorContractDraft(state, freezeRecord([["type", "CLEAR"]]));
    dirty = false;
    render();
  });
  render();
}

export function resolveVendorWorkspaceTabForFragment(fragment) {
  if (fragment === "#execution") return "construction";
  if (fragment === "#documents" || fragment === "#reviews" || fragment === "#records") {
    return "contract";
  }
  return null;
}

export function initializeVendorWorkspaceTabs(root) {
  let tabs;
  let panels;
  let liveTarget;
  let routeLinks;
  try {
    tabs = root.querySelectorAll("[data-vendor-workspace-tab]");
    panels = root.querySelectorAll("[data-vendor-workspace-panel]");
    liveTarget = root.querySelector("[data-vendor-workspace-live]");
    routeLinks = root.querySelectorAll("[data-vendor-workspace-route]");
  } catch {
    return;
  }
  if (!tabs || !panels || tabs.length !== 3 || panels.length !== 3) return;

  let activeTab = "design";

  function tabKey(tab) {
    try {
      const key = tab.dataset.vendorWorkspaceTab;
      return isVendorWorkspaceTabKey(key) ? key : null;
    } catch {
      return null;
    }
  }

  function activate(nextTab, shouldFocus) {
    if (!isVendorWorkspaceTabKey(nextTab)) return;
    activeTab = nextTab;
    for (let index = 0; index < tabs.length; index += 1) {
      const tab = tabs[index];
      const active = tabKey(tab) === activeTab;
      try {
        tab.setAttribute("aria-selected", active ? "true" : "false");
        tab.tabIndex = active ? 0 : -1;
        if (active && shouldFocus) tab.focus();
      } catch {
        // The static fail-closed page remains usable if a node changes.
      }
    }
    for (let index = 0; index < panels.length; index += 1) {
      try {
        panels[index].hidden = panels[index].dataset.vendorWorkspacePanel !== activeTab;
      } catch {
        // Unknown panels stay in their static hidden state.
      }
    }
    if (liveTarget) {
      const label = activeTab === "design"
        ? "設計案管理"
        : activeTab === "construction"
          ? "工程案管理"
          : "契約管理";
      try {
        liveTarget.textContent = `已切換至${label}。目前仍需先確認案件授權。`;
      } catch {
        // Live-region failure does not grant workspace authority.
      }
    }
  }

  function activateFragment(fragment, shouldFocus) {
    const key = resolveVendorWorkspaceTabForFragment(fragment);
    if (!key) return false;
    activate(key, shouldFocus);
    return true;
  }

  function currentFragment(view) {
    try {
      return view?.location?.["hash"] ?? "";
    } catch {
      return "";
    }
  }

  function moveToCurrentFragment(view) {
    const fragment = currentFragment(view);
    if (!resolveVendorWorkspaceTabForFragment(fragment)) return;
    let target;
    try {
      target = root.querySelector(fragment);
    } catch {
      return;
    }
    if (!target) return;
    try {
      const top = view.scrollY + target.getBoundingClientRect().top - 80;
      view.scrollTo({ top: top > 0 ? top : 0, behavior: "auto" });
    } catch {
      // The correct panel remains active even when fragment movement is unavailable.
    }
  }

  for (let index = 0; index < tabs.length; index += 1) {
    const tab = tabs[index];
    try {
      tab.addEventListener("click", () => {
        const key = tabKey(tab);
        if (key) activate(key, false);
      });
      tab.addEventListener("keydown", (event) => {
        const key = event && event.key;
        if (
          key !== "ArrowLeft"
          && key !== "ArrowRight"
          && key !== "Home"
          && key !== "End"
        ) {
          return;
        }
        try {
          event.preventDefault();
        } catch {
          // Navigation remains bounded to the current tab.
        }
        activate(resolveVendorWorkspaceTabKey(activeTab, key), true);
      });
    } catch {
      continue;
    }
  }

  if (routeLinks) {
    let routeLength = 0;
    try {
      routeLength = routeLinks.length;
    } catch {
      routeLength = 0;
    }
    if (typeof routeLength === "number" && routeLength >= 0 && routeLength <= 16) {
      for (let index = 0; index < routeLength; index += 1) {
        const link = routeLinks[index];
        try {
          link.addEventListener("click", () => {
            const fragment = link.getAttribute("href");
            activateFragment(fragment, true);
          });
        } catch {
          continue;
        }
      }
    }
  }

  let view = null;
  try {
    view = root.defaultView;
  } catch {
    view = null;
  }
  if (view) {
    try {
      view.addEventListener("hashchange", () => {
        if (activateFragment(currentFragment(view), true)) moveToCurrentFragment(view);
      });
    } catch {
      // Tab interaction remains available without a window event target.
    }
  }

  if (activateFragment(currentFragment(view), true)) {
    moveToCurrentFragment(view);
  } else {
    activate("design", false);
  }
}

export function initializeVendorWorkspace(root, renderState = CONTEXT_UNAVAILABLE) {
  if (!root) return CONTEXT_UNAVAILABLE;
  const trustedAuthorized = renderState === AUTHORIZED_VENDOR_WORKSPACE;
  try {
    root.body?.setAttribute(
      "data-vendor-state",
      trustedAuthorized ? AUTHORIZED_VENDOR_WORKSPACE.code : CONTEXT_UNAVAILABLE.code,
    );
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
  if (trustedAuthorized) {
    let contractControls;
    try {
      contractControls = root.querySelectorAll("[data-vendor-contract-control]");
    } catch {
      return CONTEXT_UNAVAILABLE;
    }
    let contractLength = 0;
    try {
      contractLength = contractControls.length;
    } catch {
      return CONTEXT_UNAVAILABLE;
    }
    if (
      typeof contractLength !== "number"
      || contractLength < 0
      || contractLength > 32
      || contractLength % 1 !== 0
    ) {
      return CONTEXT_UNAVAILABLE;
    }
    for (let index = 0; index < contractLength; index += 1) {
      enableSessionControl(contractControls[index]);
    }
    initializeVendorContractSession(root);
  }
  initializeVendorWorkspaceTabs(root);
  return trustedAuthorized ? AUTHORIZED_VENDOR_WORKSPACE : CONTEXT_UNAVAILABLE;
}

const documentRoot = resolveVendorDocument(globalThis);
if (documentRoot) initializeVendorWorkspace(documentRoot);
