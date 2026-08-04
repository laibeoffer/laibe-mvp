const safeArrayIsArray = Array.isArray;
const safeCreate = Object.create;
const safeDefineProperty = Object.defineProperty;
const safeFreeze = Object.freeze;
const safeGetOwnPropertyDescriptor = Object.getOwnPropertyDescriptor;
const safeGetPrototypeOf = Object.getPrototypeOf;
const safeSetPrototypeOf = Object.setPrototypeOf;
const ordinaryObjectPrototype = Object.prototype;
const iteratorKey = Symbol.iterator;

function iteratorResult(done, value) {
  const result = safeCreate(null);
  safeDefineProperty(result, "done", { value: done, enumerable: true });
  safeDefineProperty(result, "value", { value, enumerable: true });
  return safeFreeze(result);
}

function freezeOwnList(...items) {
  const list = [];
  safeSetPrototypeOf(list, null);
  for (let index = 0; index < items.length; index += 1) {
    safeDefineProperty(list, String(index), {
      value: items[index],
      enumerable: true,
    });
  }
  safeDefineProperty(list, iteratorKey, {
    value: () => {
      let index = 0;
      const iterator = safeCreate(null);
      safeDefineProperty(iterator, "next", {
        value: () => index < list.length
          ? iteratorResult(false, list[index++])
          : iteratorResult(true, undefined),
      });
      safeDefineProperty(iterator, iteratorKey, { value: () => iterator });
      return safeFreeze(iterator);
    },
  });
  return safeFreeze(list);
}

const NO_ACTIONS = freezeOwnList();
const ORIGINAL_WORKSPACES = freezeOwnList("ownerWorkspace", "vendorWorkspace");
const BILATERAL_CONTINUATION_RESOURCES = freezeOwnList(
  "workspaces",
  "contract",
  "documents",
  "messages",
  "schedules",
  "evidence",
  "acceptance",
  "changes",
  "addenda",
  "caseRecords",
);

const freezeRecord = (record) => safeFreeze({
  ...record,
  actions: NO_ACTIONS,
  ...(record.workspaceRoutes ? { workspaceRoutes: ORIGINAL_WORKSPACES } : {}),
});

export const OWNER_FIRST_FACT_KEYS = Object.freeze([
  "role",
  "pcmContractStatus",
  "caseStatus",
  "nextResponsibility",
  "latestRecord",
]);

export const OWNER_FIRST_CLOSED_STATES = Object.freeze({
  CONTEXT_UNAVAILABLE: freezeRecord({
    code: "CONTEXT_UNAVAILABLE",
    type: "CLOSED",
    title: "目前無法確認案件資訊",
    reason: "這個入口沒有足夠資料可安全顯示案件內容。",
    nextAction: "請回到已確認的入口，再重新進入。",
    responsibleRole: "目前使用者",
    recoveryLabel: "返回安全入口",
    payloadPolicy: "ZERO_CASE_DATA",
    mutationAllowed: false,
  }),
  AUTH_REQUIRED: freezeRecord({
    code: "AUTH_REQUIRED",
    type: "CLOSED",
    title: "請先完成身分確認",
    reason: "目前尚未確認你的登入身分，因此不顯示案件內容。",
    nextAction: "前往共用註冊與登入入口完成確認。",
    responsibleRole: "目前使用者",
    recoveryLabel: "前往註冊與登入",
    payloadPolicy: "ZERO_CASE_DATA",
    mutationAllowed: false,
  }),
  ACCESS_DENIED: freezeRecord({
    code: "ACCESS_DENIED",
    type: "CLOSED",
    title: "目前不能查看這個案件",
    reason: "你目前的身分或案件成員關係尚未獲得確認。",
    nextAction: "請確認登入帳號與案件邀請是否一致。",
    responsibleRole: "目前使用者",
    recoveryLabel: "返回安全入口",
    payloadPolicy: "ZERO_CASE_DATA",
    mutationAllowed: false,
  }),
  PREREQUISITES_PENDING: freezeRecord({
    code: "PREREQUISITES_PENDING",
    type: "CLOSED",
    title: "仍有契約前置項目待補",
    reason: "必要的身分、文件或雙方確認尚未齊備。",
    nextAction: "依待補清單的責任人與順序逐項完成。",
    responsibleRole: "待補項目責任人",
    recoveryLabel: "查看待補項目",
    payloadPolicy: "ZERO_CASE_DATA",
    mutationAllowed: false,
  }),
  SERVICE_PREPARING: freezeRecord({
    code: "SERVICE_PREPARING",
    type: "CLOSED",
    title: "服務入口正在整理中",
    reason: "這個步驟尚未正式開放，目前不會建立案件或送出資料。",
    nextAction: "先返回上一個可使用的步驟，稍後再查看。",
    responsibleRole: "萊比",
    recoveryLabel: "返回上一個步驟",
    payloadPolicy: "ZERO_CASE_DATA",
    mutationAllowed: false,
  }),
  PCM_EXITED_BILATERAL_CONTINUATION: freezeRecord({
    code: "PCM_EXITED_BILATERAL_CONTINUATION",
    type: "CONTINUATION",
    title: "PCM 已退出，甲乙雙方繼續案件",
    reason: "原工作台、文件、訊息、排程、證據、驗收、變更、附約與案件紀錄持續可用；新的 PCM 操作停止。",
    nextAction: "甲乙雙方依原案件紀錄繼續處理；需要 PCM 重新加入時，另行取得新授權。",
    responsibleRole: "甲方與乙方",
    recoveryLabel: "返回原工作台",
    payloadPolicy: "PRESERVE_BILATERAL_CASE_CONTINUATION",
    mutationAllowed: false,
    workspaceRoutes: ORIGINAL_WORKSPACES,
    caseMode: "BILATERAL_CONTINUATION",
    pcmMode: "HISTORICAL_READ_ONLY",
    caseClosed: false,
    caseArchived: false,
    bilateralContinuationAllowed: true,
    newPcmOperationsAllowed: false,
    rejoinRequiresNewAuthorization: true,
    preserveResources: BILATERAL_CONTINUATION_RESOURCES,
  }),
  CASE_CLOSED_READ_ONLY: freezeRecord({
    code: "CASE_CLOSED_READ_ONLY",
    type: "CLOSED",
    title: "案件已結案，內容保留查閱",
    reason: "原工作台保留已授權的既有內容，供三方追溯結案依據。",
    nextAction: "查看結案狀態、三方確認與最近紀錄。",
    responsibleRole: "案件三方",
    recoveryLabel: "返回原工作台",
    payloadPolicy: "PRESERVE_AUTHORIZED_EXISTING_CONTENT",
    mutationAllowed: false,
    workspaceRoutes: ORIGINAL_WORKSPACES,
  }),
});

export const OWNER_FIRST_VIEW_STATES = Object.freeze({
  loading: freezeRecord({
    title: "正在確認目前狀態",
    message: "請稍候，我們正在整理這個入口可顯示的資訊。",
    nextAction: "確認完成後會顯示下一步。",
  }),
  empty: freezeRecord({
    title: "目前尚無可顯示的紀錄",
    message: "完成第一筆文件或決定後，會在這裡留下紀錄。",
    nextAction: "依頁面主要行動開始第一個步驟。",
  }),
  error: freezeRecord({
    title: "目前無法完成這次確認",
    message: "請保留現在的頁面狀態，再重新嘗試一次。",
    nextAction: "若仍無法繼續，請返回上一個可使用的入口。",
  }),
  recovery: freezeRecord({
    title: "返回可安全繼續的位置",
    message: "目前不顯示未確認的案件內容，也不會送出任何變更。",
    nextAction: "使用返回入口重新確認身分、案件與下一步。",
  }),
});

function readClosedStateCode(input) {
  if (input === null || typeof input !== "object") {
    return null;
  }

  try {
    if (safeArrayIsArray(input)) {
      return null;
    }
    const prototype = safeGetPrototypeOf(input);
    if (prototype !== ordinaryObjectPrototype && prototype !== null) {
      return null;
    }
    const descriptor = safeGetOwnPropertyDescriptor(input, "code");
    if (!descriptor || !("value" in descriptor) || typeof descriptor.value !== "string") {
      return null;
    }
    return descriptor.value;
  } catch {
    return null;
  }
}

export function resolveOwnerFirstState(input) {
  const code = readClosedStateCode(input);
  const descriptor = code
    ? safeGetOwnPropertyDescriptor(OWNER_FIRST_CLOSED_STATES, code)
    : null;
  return descriptor?.value ?? OWNER_FIRST_CLOSED_STATES.CONTEXT_UNAVAILABLE;
}
