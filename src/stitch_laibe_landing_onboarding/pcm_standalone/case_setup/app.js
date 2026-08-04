const safeCreate = Object.create;
const safeDefineProperty = Object.defineProperty;
const safeFreeze = Object.freeze;

const EMPTY_ITERATION = safeCreate(null);
safeDefineProperty(EMPTY_ITERATION, "done", {
  enumerable: true,
  value: true,
});
safeDefineProperty(EMPTY_ITERATION, "value", {
  enumerable: true,
  value: undefined,
});
safeFreeze(EMPTY_ITERATION);

const EMPTY_ITERATOR = safeCreate(null);
safeDefineProperty(EMPTY_ITERATOR, "next", {
  value() {
    return EMPTY_ITERATION;
  },
});
safeDefineProperty(EMPTY_ITERATOR, Symbol.iterator, {
  value() {
    return EMPTY_ITERATOR;
  },
});
safeFreeze(EMPTY_ITERATOR);

const NO_ACTIONS = safeCreate(null);
safeDefineProperty(NO_ACTIONS, "length", {
  value: 0,
});
safeDefineProperty(NO_ACTIONS, Symbol.iterator, {
  value() {
    return EMPTY_ITERATOR;
  },
});
safeFreeze(NO_ACTIONS);

function closedState(input) {
  const state = safeCreate(null);
  state.code = input.code;
  state.title = input.title;
  state.reason = input.reason;
  state.nextAction = input.nextAction;
  state.responsibleRole = input.responsibleRole;
  state.returnRoute = input.returnRoute;
  state.recoveryRoute = input.recoveryRoute;
  state.payloadPolicy = "ZERO_CASE_DATA";
  state.mutationAllowed = false;
  state.writeAuthority = "NONE";
  state.caseData = null;
  state.actions = NO_ACTIONS;
  return safeFreeze(state);
}

function closedTable(entries) {
  const table = safeCreate(null);
  for (let index = 0; index < entries.length; index += 1) {
    const entry = entries[index];
    safeDefineProperty(table, entry[0], {
      enumerable: true,
      value: entry[1],
    });
  }
  return safeFreeze(table);
}

export const CONTEXT_UNAVAILABLE = closedState({
  code: "CONTEXT_UNAVAILABLE",
  title: "尚未確認案件使用權限",
  reason: "目前無法確認身分、案件成員與案件權限，因此不顯示任何案件資料。",
  nextAction: "先返回 PCM 首頁整理報價與圖說；帳號服務開放後再確認案件資格。",
  responsibleRole: "甲方",
  returnRoute: "../public_home/code.html#case-flow",
  recoveryRoute: "../account_access/code.html",
});

export const CASE_SETUP_STATES = closedTable([
  ["PREPARATION_PENDING", closedState({
    code: "PREPARATION_PENDING",
    title: "案件資料準備中",
    reason: "報價與圖說需先整理成同一個可比較的準備基準。",
    nextAction: "逐項確認報價、圖說與契約前置資料。",
    responsibleRole: "甲方",
    returnRoute: "#preparation",
    recoveryRoute: "#preparation",
  })],
  ["PCM_DECISION_PENDING", closedState({
    code: "PCM_DECISION_PENDING",
    title: "等待甲方決定是否申請正式 PCM 服務",
    reason: "資料準備完成後，甲方才需要決定是否進入正式服務。",
    nextAction: "待身分與案件權限可確認後，再提出正式申請。",
    responsibleRole: "甲方",
    returnRoute: "#pcm-decision",
    recoveryRoute: "#preparation",
  })],
]);

export const CASE_SETUP_FAILURES = closedTable([
  ["QUOTE_ONLY_DRAWING_MISSING", closedState({
    code: "QUOTE_ONLY_DRAWING_MISSING",
    title: "只有報價、缺圖說",
    reason: "目前只有報價資料，尚無法和施工圖說放在同一基準檢查。",
    nextAction: "前往圖說檢討頁整理圖說資料。",
    responsibleRole: "甲方",
    returnRoute: "#preparation",
    recoveryRoute: "../drawing_check/code.html",
  })],
  ["DRAWING_ONLY_QUOTE_MISSING", closedState({
    code: "DRAWING_ONLY_QUOTE_MISSING",
    title: "只有圖說、缺報價",
    reason: "目前只有圖說資料，尚無法確認報價條件是否一致。",
    nextAction: "前往報價健檢頁整理報價資料。",
    responsibleRole: "甲方",
    returnRoute: "#preparation",
    recoveryRoute: "../quote_check/code.html",
  })],
  ["BOTH_DOCUMENTS_MISSING", closedState({
    code: "BOTH_DOCUMENTS_MISSING",
    title: "兩份資料都尚未準備",
    reason: "報價與圖說都尚未形成可引用的準備資料。",
    nextAction: "先從報價健檢或圖說檢討任一頁開始整理。",
    responsibleRole: "甲方",
    returnRoute: "../public_home/code.html#case-flow",
    recoveryRoute: "../quote_check/code.html",
  })],
  ["FILE_METADATA_UNCONFIRMED", closedState({
    code: "FILE_METADATA_UNCONFIRMED",
    title: "文件條件仍待確認",
    reason: "檔案格式、大小、頁數或可讀性尚未由可信流程確認。",
    nextAction: "返回原健檢頁查看待補條件並重新準備。",
    responsibleRole: "甲方",
    returnRoute: "#preparation",
    recoveryRoute: "../public_home/code.html#case-flow",
  })],
  ["VERSION_CONFLICT", closedState({
    code: "VERSION_CONFLICT",
    title: "文件版本不一致",
    reason: "報價、圖說或前置資料引用的版本不同，不能建立同一案件基準。",
    nextAction: "確認雙方要採用的版本，再回到本頁重新核對。",
    responsibleRole: "甲方與乙方",
    returnRoute: "#preparation",
    recoveryRoute: "#preparation",
  })],
  ["PREREQUISITE_DATA_MISSING", closedState({
    code: "PREREQUISITE_DATA_MISSING",
    title: "契約前置資料缺漏",
    reason: "案件基本資料、參與角色或契約前置項目仍有缺漏。",
    nextAction: "依缺漏清單補齊後，再決定是否申請正式 PCM 服務。",
    responsibleRole: "甲方；乙方依被要求項目補充",
    returnRoute: "#pcm-decision",
    recoveryRoute: "#preparation",
  })],
]);

export function resolveCaseSetupContext(_input) {
  return CONTEXT_UNAVAILABLE;
}

export function initializeCaseSetup(_root) {
  return CONTEXT_UNAVAILABLE;
}

const documentDescriptor = Object.getOwnPropertyDescriptor(globalThis, "document");
if (documentDescriptor && "value" in documentDescriptor) {
  initializeCaseSetup(documentDescriptor.value);
}
