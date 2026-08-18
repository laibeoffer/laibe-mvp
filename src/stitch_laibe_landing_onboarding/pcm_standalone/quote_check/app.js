import {
  inspectQuotePdfFile,
  QUOTE_BROWSER_RUNTIME_MODE,
} from "../../../lib/budget/quote-healthcheck/browser-adapter.js";

const safeArrayIsArray = Array.isArray;
const safeApply = Reflect.apply;
const safeCreate = Object.create;
const safeDefineProperty = Object.defineProperty;
const safeFreeze = Object.freeze;
const safeGetOwnPropertyDescriptor = Object.getOwnPropertyDescriptor;
const safeGetPrototypeOf = Object.getPrototypeOf;
const safeOwnKeys = Reflect.ownKeys;
const safeStructuredClone =
  typeof globalThis.structuredClone === "function"
    ? globalThis.structuredClone
    : null;
const ordinaryObjectPrototype = Object.prototype;
const EMPTY_ACTION_ITERATION_RESULT = safeCreate(null);
safeDefineProperty(EMPTY_ACTION_ITERATION_RESULT, "done", {
  configurable: false,
  enumerable: true,
  value: true,
  writable: false,
});
safeDefineProperty(EMPTY_ACTION_ITERATION_RESULT, "value", {
  configurable: false,
  enumerable: true,
  value: undefined,
  writable: false,
});
safeFreeze(EMPTY_ACTION_ITERATION_RESULT);

function finishEmptyActionIteration() {
  return EMPTY_ACTION_ITERATION_RESULT;
}

const EMPTY_ACTION_ITERATOR = safeCreate(null);
safeDefineProperty(EMPTY_ACTION_ITERATOR, "next", {
  configurable: false,
  enumerable: false,
  value: finishEmptyActionIteration,
  writable: false,
});
safeDefineProperty(EMPTY_ACTION_ITERATOR, Symbol.iterator, {
  configurable: false,
  enumerable: false,
  value() {
    return EMPTY_ACTION_ITERATOR;
  },
  writable: false,
});
safeFreeze(EMPTY_ACTION_ITERATOR);

const NO_ACTIONS = safeCreate(null);
safeDefineProperty(NO_ACTIONS, "length", {
  configurable: false,
  enumerable: false,
  value: 0,
  writable: false,
});
safeDefineProperty(NO_ACTIONS, Symbol.iterator, {
  configurable: false,
  enumerable: false,
  value() {
    return EMPTY_ACTION_ITERATOR;
  },
  writable: false,
});
safeFreeze(NO_ACTIONS);
const SAFE_EMPTY_ARGUMENTS = safeCreate(null);
safeDefineProperty(SAFE_EMPTY_ARGUMENTS, "length", {
  configurable: false,
  enumerable: false,
  value: 0,
  writable: false,
});
safeFreeze(SAFE_EMPTY_ARGUMENTS);
const SAFE_FILE_INDEX_ARGUMENTS = safeCreate(null);
safeDefineProperty(SAFE_FILE_INDEX_ARGUMENTS, "0", {
  configurable: false,
  enumerable: true,
  value: 0,
  writable: false,
});
safeDefineProperty(SAFE_FILE_INDEX_ARGUMENTS, "length", {
  configurable: false,
  enumerable: false,
  value: 1,
  writable: false,
});
safeFreeze(SAFE_FILE_INDEX_ARGUMENTS);
const SAFE_HREF_ARGUMENTS = safeCreate(null);
safeDefineProperty(SAFE_HREF_ARGUMENTS, "0", {
  configurable: false,
  enumerable: true,
  value: "href",
  writable: false,
});
safeDefineProperty(SAFE_HREF_ARGUMENTS, "length", {
  configurable: false,
  enumerable: false,
  value: 1,
  writable: false,
});
safeFreeze(SAFE_HREF_ARGUMENTS);
const nonWhitespaceFileNamePattern = /\S/u;
const safeHasNonWhitespaceFileName = RegExp.prototype.test.bind(
  nonWhitespaceFileNamePattern,
);
const pdfFileNamePattern = /\.pdf$/iu;
const safeHasPdfFileName = RegExp.prototype.test.bind(pdfFileNamePattern);

function readOwnDataValue(input, property) {
  if (
    input === null ||
    input === undefined ||
    (typeof input !== "object" && typeof input !== "function")
  ) {
    return null;
  }
  const descriptor = safeGetOwnPropertyDescriptor(input, property);
  if (!descriptor) return null;
  const valueDescriptor = safeGetOwnPropertyDescriptor(descriptor, "value");
  return valueDescriptor || null;
}

function readOwnGlobalFunction(name) {
  const valueDescriptor = readOwnDataValue(globalThis, name);
  return valueDescriptor && typeof valueDescriptor.value === "function"
    ? valueDescriptor.value
    : null;
}

function readConstructorPrototype(constructor) {
  if (!constructor) return null;
  const valueDescriptor = readOwnDataValue(constructor, "prototype");
  return valueDescriptor && valueDescriptor.value
    ? valueDescriptor.value
    : null;
}

function readOwnGetter(prototype, property) {
  if (!prototype) return null;
  const descriptor = safeGetOwnPropertyDescriptor(prototype, property);
  if (!descriptor) return null;
  const getterDescriptor = safeGetOwnPropertyDescriptor(descriptor, "get");
  return getterDescriptor && typeof getterDescriptor.value === "function"
    ? getterDescriptor.value
    : null;
}

const trustedFileListPrototype = readConstructorPrototype(
  readOwnGlobalFunction("FileList"),
);
const trustedFilePrototype = readConstructorPrototype(
  readOwnGlobalFunction("File"),
);
const trustedBlobPrototype = readConstructorPrototype(
  readOwnGlobalFunction("Blob"),
);
const trustedInputPrototype = readConstructorPrototype(
  readOwnGlobalFunction("HTMLInputElement"),
);
const trustedFileListLengthGetter = readOwnGetter(
  trustedFileListPrototype,
  "length",
);
const trustedFileListItemDescriptor = readOwnDataValue(
  trustedFileListPrototype,
  "item",
);
const trustedFileListItem =
  trustedFileListItemDescriptor &&
  typeof trustedFileListItemDescriptor.value === "function"
    ? trustedFileListItemDescriptor.value
    : null;
const trustedFileNameGetter = readOwnGetter(trustedFilePrototype, "name");
const trustedBlobTypeGetter = readOwnGetter(trustedBlobPrototype, "type");
const trustedInputFilesGetter = readOwnGetter(trustedInputPrototype, "files");
const trustedElementPrototype = readConstructorPrototype(
  readOwnGlobalFunction("Element"),
);
const trustedHtmlElementPrototype = readConstructorPrototype(
  readOwnGlobalFunction("HTMLElement"),
);
const trustedEventPrototype = readConstructorPrototype(
  readOwnGlobalFunction("Event"),
);
const trustedGetAttributeDescriptor = readOwnDataValue(
  trustedElementPrototype,
  "getAttribute",
);
const trustedGetAttribute =
  trustedGetAttributeDescriptor &&
  typeof trustedGetAttributeDescriptor.value === "function"
    ? trustedGetAttributeDescriptor.value
    : null;
const trustedClickDescriptor = readOwnDataValue(
  trustedHtmlElementPrototype,
  "click",
);
const trustedClick =
  trustedClickDescriptor && typeof trustedClickDescriptor.value === "function"
    ? trustedClickDescriptor.value
    : null;
const trustedPreventDefaultDescriptor = readOwnDataValue(
  trustedEventPrototype,
  "preventDefault",
);
const trustedPreventDefault =
  trustedPreventDefaultDescriptor &&
  typeof trustedPreventDefaultDescriptor.value === "function"
    ? trustedPreventDefaultDescriptor.value
    : null;

const DRAWING_CHECK_HREF = "../drawing_check/code.html";

export function resolveQuoteDrawingRoute(candidate) {
  return typeof candidate === "string" && candidate === DRAWING_CHECK_HREF
    ? DRAWING_CHECK_HREF
    : null;
}

function readDrawingCheckHref(link) {
  if (!link || !trustedGetAttribute) return null;
  try {
    return resolveQuoteDrawingRoute(
      safeApply(trustedGetAttribute, link, SAFE_HREF_ARGUMENTS),
    );
  } catch {
    return null;
  }
}

function preventUnsafeDrawingNavigation(event) {
  if (!event || !trustedPreventDefault) return;
  try {
    safeApply(trustedPreventDefault, event, SAFE_EMPTY_ARGUMENTS);
  } catch {
    // An unsafe or changed route remains closed.
  }
}

function wireDrawingCheckRouteGuards(root) {
  const drawingCheckLinks = root.querySelectorAll("[data-drawing-check-link]");
  for (let index = 0; index < drawingCheckLinks.length; index += 1) {
    const link = drawingCheckLinks[index];
    link.addEventListener("click", (event) => {
      if (!readDrawingCheckHref(link)) preventUnsafeDrawingNavigation(event);
    });
  }
}

function fileSelectionResult(kind, name = null, file = null) {
  const result = safeCreate(null);
  result.kind = kind;
  result.name = name;
  if (file !== null) result.file = file;
  return safeFreeze(result);
}

const EMPTY_FILE_SELECTION = fileSelectionResult("EMPTY");
const INVALID_FILE_SELECTION = fileSelectionResult("INVALID");

function freezeState(record) {
  return safeFreeze({
    ...record,
    mutationAllowed: false,
    caseData: null,
    actions: NO_ACTIONS,
  });
}

export const CONTEXT_UNAVAILABLE = freezeState({
  code: "CONTEXT_UNAVAILABLE",
  type: "CLOSED",
  title: "目前無法判斷報價健檢步驟",
  reason: "這個入口沒有可確認的操作狀態，因此不顯示任何案件或檔案內容。",
  nextAction: "返回服務說明，重新依畫面順序開始。",
  responsibleRole: "甲方",
  payloadPolicy: "ZERO_CASE_DATA",
  returnStep: "INTRODUCTION",
  recoveryStep: "INTRODUCTION",
});

export const QUOTE_CHECK_STATES = safeFreeze({
  INTRODUCTION: freezeState({
    code: "INTRODUCTION",
    type: "OPEN",
    title: "先看報價能替下一步回答什麼",
    reason: "PCM 會整理報價範圍、項目說法、版本與仍需施工圖確認的地方。",
    nextAction: "閱讀服務邊界後，進入同意步驟。",
    responsibleRole: "甲方",
    payloadPolicy: "NO_CASE_DATA",
  }),
  CONSENT: freezeState({
    code: "CONSENT",
    type: "OPEN",
    title: "確認本機檢視範圍",
    reason: "本頁只暫時讀取你選擇的檔名與瀏覽器提供的檔案標示，不會送出或保存。",
    nextAction: "勾選同意後選擇報價 PDF。",
    responsibleRole: "甲方",
    payloadPolicy: "NO_CASE_DATA",
  }),
  SELECT_FILE: freezeState({
    code: "SELECT_FILE",
    type: "OPEN",
    title: "選擇報價 PDF",
    reason: "先查看瀏覽器提供的檔案標示；內容格式、大小、頁數與可讀性仍需正式規則與解析。",
    nextAction: "從你的裝置選擇一份報價 PDF。",
    responsibleRole: "甲方",
    payloadPolicy: "LOCAL_FILE_METADATA_ONLY",
  }),
  VALIDATION_PENDING: freezeState({
    code: "VALIDATION_PENDING",
    type: "OPEN",
    title: "PDF 標示已取得，內容格式待驗證",
    reason: "瀏覽器標示為 PDF；檔名僅供辨識，內容格式尚待驗證。大小、頁數、文字與圖面可讀性也尚未判定。",
    nextAction: "查看待確認清單，決定是否重新選擇檔案。",
    responsibleRole: "甲方",
    payloadPolicy: "LOCAL_FILE_METADATA_ONLY",
  }),
  CORRECTION_REQUIRED: freezeState({
    code: "CORRECTION_REQUIRED",
    type: "OPEN",
    title: "先把待確認事項整理清楚",
    reason: "這些項目不是正式檢查結果，只是提醒正式提交前仍需確認的條件。",
    nextAction: "重新選擇檔案，或先查看結果會如何呈現。",
    responsibleRole: "甲方",
    payloadPolicy: "LOCAL_FILE_METADATA_ONLY",
  }),
  RESELECT_FILE: freezeState({
    code: "RESELECT_FILE",
    type: "OPEN",
    title: "重新選擇報價 PDF",
    reason: "前一份檔案沒有送出或保存；你可以改選另一份 PDF。",
    nextAction: "選擇另一份檔案後，再查看格式確認狀態。",
    responsibleRole: "甲方",
    payloadPolicy: "LOCAL_FILE_METADATA_ONLY",
  }),
  RESULT_FORMAT: freezeState({
    code: "RESULT_FORMAT",
    type: "OPEN",
    title: "查看正式結果的資訊結構",
    reason: "這裡只說明未來報價健檢結果的欄位，不含真實案件、價格或判定。",
    nextAction: "確認目前仍沒有正式案件結果，再決定是否重新選擇檔案。",
    responsibleRole: "甲方",
    payloadPolicy: "NO_CASE_DATA",
  }),
  RESULT_UNAVAILABLE: freezeState({
    code: "RESULT_UNAVAILABLE",
    type: "CLOSED",
    title: "尚未形成正式案件結果",
    reason: "本頁沒有身分確認、文件送出與正式解析，因此不會產生報價健檢結論。",
    nextAction: "可重新選擇報價 PDF；正式收件開放後，再依入口建立案件。",
    responsibleRole: "甲方",
    payloadPolicy: "ZERO_CASE_DATA",
    returnStep: "RESULT_FORMAT",
    recoveryStep: "SELECT_FILE",
  }),
});

function failureState({
  code,
  reason,
  nextAction,
  responsibleRole = "甲方",
  returnStep = "SELECT_FILE",
  recoveryStep = "RESELECT_FILE",
  payloadPolicy = "FILE_METADATA_ONLY",
}) {
  return freezeState({
    code,
    type: "CLOSED",
    title: "這份檔案目前不能繼續",
    reason,
    nextAction,
    responsibleRole,
    returnStep,
    recoveryStep,
    payloadPolicy,
  });
}

export const QUOTE_CHECK_FAILURES = safeFreeze({
  FILE_FORMAT_INVALID: failureState({
    code: "FILE_FORMAT_INVALID",
    reason: "瀏覽器未提供可確認的 PDF 檔案標示；內容格式仍未驗證。",
    nextAction: "回到檔案選擇，改選瀏覽器標示為 PDF 的設計師／統包報價檔。",
    payloadPolicy: "ZERO_CASE_DATA",
  }),
  FILE_TOO_LARGE: failureState({
    code: "FILE_TOO_LARGE",
    reason: "正式檔案規則尚未確認，目前無法判定檔案大小是否符合條件。",
    nextAction: "先保留原始檔，正式規則開放後再確認是否需要調整。",
  }),
  PAGE_COUNT_INVALID: failureState({
    code: "PAGE_COUNT_INVALID",
    reason: "目前無法解析頁數，也不能判定頁面是否齊全。",
    nextAction: "回原提供者確認報價頁面完整，再重新選擇檔案。",
  }),
  FILE_UNREADABLE: failureState({
    code: "FILE_UNREADABLE",
    reason: "目前沒有正式解析能力，無法確認文字與表格是否清楚可讀。",
    nextAction: "先用一般 PDF 閱讀工具確認內容，再回來重新選擇。",
  }),
  FILE_CORRUPTED: failureState({
    code: "FILE_CORRUPTED",
    reason: "檔案若無法正常開啟，就不能進入後續書面核對。",
    nextAction: "請設計師／統包重新匯出可正常開啟的 PDF，再重新選擇。",
  }),
  DUPLICATE_SUBMISSION: failureState({
    code: "DUPLICATE_SUBMISSION",
    reason: "正式提交時若同一版本重複出現，必須先確認要採用哪一份。",
    nextAction: "保留一份明確版本，其他重複檔案先不要提交。",
    payloadPolicy: "SUBMISSION_REFERENCE_ONLY",
  }),
  VERSION_CONFLICT: failureState({
    code: "VERSION_CONFLICT",
    reason: "檔名或文件內容若指向不同版本，就無法確認核對依據。",
    nextAction: "請設計師／統包確認唯一有效版次，再重新選擇。",
    payloadPolicy: "VERSION_REFERENCE_ONLY",
  }),
  QUOTE_ONLY_DRAWING_MISSING: failureState({
    code: "QUOTE_ONLY_DRAWING_MISSING",
    reason: "目前只有報價，尚缺施工圖，不能形成完整的範圍核對。",
    nextAction: "前往圖說檢討準備施工圖；本頁不會送出或保存文件。",
    returnStep: "RESULT_FORMAT",
    recoveryStep: "DRAWING_CHECK",
    payloadPolicy: "FILE_METADATA_ONLY",
  }),
});

function createHeroAction(label, enabled, target = null) {
  const action = safeCreate(null);
  action.label = label;
  action.enabled = enabled;
  action.target = target;
  return safeFreeze(action);
}

const HERO_ACTIONS = safeCreate(null);
HERO_ACTIONS.INTRODUCTION = createHeroAction("開始報價健檢準備", true, "CONSENT");
HERO_ACTIONS.CONSENT = createHeroAction("請先同意本機檢視", false);
HERO_ACTIONS.SELECT_FILE = createHeroAction("選擇報價 PDF", true, "OPEN_FILE");
HERO_ACTIONS.VALIDATION_PENDING = createHeroAction("查看待確認清單", true, "CORRECTION_REQUIRED");
HERO_ACTIONS.CORRECTION_REQUIRED = createHeroAction("重新選擇報價 PDF", true, "RESELECT_FILE");
HERO_ACTIONS.RESELECT_FILE = createHeroAction("選擇另一份 PDF", true, "OPEN_FILE");
HERO_ACTIONS.RESULT_FORMAT = createHeroAction("查看目前結果狀態", true, "RESULT_UNAVAILABLE");
HERO_ACTIONS.RESULT_UNAVAILABLE = createHeroAction("重新選擇報價 PDF", true, "SELECT_FILE");
HERO_ACTIONS.FILE_FORMAT_INVALID = createHeroAction("依建議恢復", true, "RESELECT_FILE");
HERO_ACTIONS.FILE_TOO_LARGE = createHeroAction("依建議恢復", true, "RESELECT_FILE");
HERO_ACTIONS.PAGE_COUNT_INVALID = createHeroAction("依建議恢復", true, "RESELECT_FILE");
HERO_ACTIONS.FILE_UNREADABLE = createHeroAction("依建議恢復", true, "RESELECT_FILE");
HERO_ACTIONS.FILE_CORRUPTED = createHeroAction("依建議恢復", true, "RESELECT_FILE");
HERO_ACTIONS.DUPLICATE_SUBMISSION = createHeroAction("依建議恢復", true, "RESELECT_FILE");
HERO_ACTIONS.VERSION_CONFLICT = createHeroAction("依建議恢復", true, "RESELECT_FILE");
HERO_ACTIONS.QUOTE_ONLY_DRAWING_MISSING = createHeroAction("前往圖說檢討", true, "DRAWING_CHECK");
safeFreeze(HERO_ACTIONS);
const NO_HERO_ACTION = createHeroAction("目前沒有可執行的下一步", false);

export function projectQuoteCheckHeroAction(state) {
  if (state === QUOTE_CHECK_STATES.INTRODUCTION) return HERO_ACTIONS.INTRODUCTION;
  if (state === QUOTE_CHECK_STATES.CONSENT) return HERO_ACTIONS.CONSENT;
  if (state === QUOTE_CHECK_STATES.SELECT_FILE) return HERO_ACTIONS.SELECT_FILE;
  if (state === QUOTE_CHECK_STATES.VALIDATION_PENDING) return HERO_ACTIONS.VALIDATION_PENDING;
  if (state === QUOTE_CHECK_STATES.CORRECTION_REQUIRED) return HERO_ACTIONS.CORRECTION_REQUIRED;
  if (state === QUOTE_CHECK_STATES.RESELECT_FILE) return HERO_ACTIONS.RESELECT_FILE;
  if (state === QUOTE_CHECK_STATES.RESULT_FORMAT) return HERO_ACTIONS.RESULT_FORMAT;
  if (state === QUOTE_CHECK_STATES.RESULT_UNAVAILABLE) return HERO_ACTIONS.RESULT_UNAVAILABLE;
  if (state === QUOTE_CHECK_FAILURES.FILE_FORMAT_INVALID) return HERO_ACTIONS.FILE_FORMAT_INVALID;
  if (state === QUOTE_CHECK_FAILURES.FILE_TOO_LARGE) return HERO_ACTIONS.FILE_TOO_LARGE;
  if (state === QUOTE_CHECK_FAILURES.PAGE_COUNT_INVALID) return HERO_ACTIONS.PAGE_COUNT_INVALID;
  if (state === QUOTE_CHECK_FAILURES.FILE_UNREADABLE) return HERO_ACTIONS.FILE_UNREADABLE;
  if (state === QUOTE_CHECK_FAILURES.FILE_CORRUPTED) return HERO_ACTIONS.FILE_CORRUPTED;
  if (state === QUOTE_CHECK_FAILURES.DUPLICATE_SUBMISSION) return HERO_ACTIONS.DUPLICATE_SUBMISSION;
  if (state === QUOTE_CHECK_FAILURES.VERSION_CONFLICT) return HERO_ACTIONS.VERSION_CONFLICT;
  if (state === QUOTE_CHECK_FAILURES.QUOTE_ONLY_DRAWING_MISSING) {
    return HERO_ACTIONS.QUOTE_ONLY_DRAWING_MISSING;
  }
  return NO_HERO_ACTION;
}

function readOwnDataString(input, property) {
  const descriptor = safeGetOwnPropertyDescriptor(input, property);
  if (!descriptor) return null;
  const valueDescriptor = safeGetOwnPropertyDescriptor(descriptor, "value");
  return valueDescriptor && typeof valueDescriptor.value === "string"
    ? valueDescriptor.value
    : null;
}

function readStrictContext(input) {
  if (input === null || typeof input !== "object") return null;
  try {
    if (safeArrayIsArray(input)) return null;
    const prototype = safeGetPrototypeOf(input);
    if (prototype !== ordinaryObjectPrototype && prototype !== null) return null;
    if (!safeStructuredClone) return null;
    const keys = safeOwnKeys(input);
    const step = readOwnDataString(input, "step");
    if (!step) return null;
    let failureCode = null;
    if (step === "FAILURE") {
      if (
        keys.length !== 2 ||
        !(
          (keys[0] === "step" && keys[1] === "failureCode") ||
          (keys[0] === "failureCode" && keys[1] === "step")
        )
      ) {
        return null;
      }
      failureCode = readOwnDataString(input, "failureCode");
      if (!failureCode) return null;
    } else if (keys.length !== 1 || keys[0] !== "step") {
      return null;
    }
    safeStructuredClone(input);
    const context = safeCreate(null);
    context.step = step;
    context.failureCode = failureCode;
    return safeFreeze(context);
  } catch {
    return null;
  }
}

function stateForCode(code) {
  switch (code) {
    case "INTRODUCTION": return QUOTE_CHECK_STATES.INTRODUCTION;
    case "CONSENT": return QUOTE_CHECK_STATES.CONSENT;
    case "SELECT_FILE": return QUOTE_CHECK_STATES.SELECT_FILE;
    case "VALIDATION_PENDING": return QUOTE_CHECK_STATES.VALIDATION_PENDING;
    case "CORRECTION_REQUIRED": return QUOTE_CHECK_STATES.CORRECTION_REQUIRED;
    case "RESELECT_FILE": return QUOTE_CHECK_STATES.RESELECT_FILE;
    case "RESULT_FORMAT": return QUOTE_CHECK_STATES.RESULT_FORMAT;
    case "RESULT_UNAVAILABLE": return QUOTE_CHECK_STATES.RESULT_UNAVAILABLE;
    default: return CONTEXT_UNAVAILABLE;
  }
}

function failureForCode(code) {
  switch (code) {
    case "FILE_FORMAT_INVALID": return QUOTE_CHECK_FAILURES.FILE_FORMAT_INVALID;
    case "FILE_TOO_LARGE": return QUOTE_CHECK_FAILURES.FILE_TOO_LARGE;
    case "PAGE_COUNT_INVALID": return QUOTE_CHECK_FAILURES.PAGE_COUNT_INVALID;
    case "FILE_UNREADABLE": return QUOTE_CHECK_FAILURES.FILE_UNREADABLE;
    case "FILE_CORRUPTED": return QUOTE_CHECK_FAILURES.FILE_CORRUPTED;
    case "DUPLICATE_SUBMISSION": return QUOTE_CHECK_FAILURES.DUPLICATE_SUBMISSION;
    case "VERSION_CONFLICT": return QUOTE_CHECK_FAILURES.VERSION_CONFLICT;
    case "QUOTE_ONLY_DRAWING_MISSING": return QUOTE_CHECK_FAILURES.QUOTE_ONLY_DRAWING_MISSING;
    default: return CONTEXT_UNAVAILABLE;
  }
}

export function resolveQuoteCheckState(input) {
  try {
    const context = readStrictContext(input);
    if (!context) return CONTEXT_UNAVAILABLE;
    if (context.step === "FAILURE") return failureForCode(context.failureCode);
    return stateForCode(context.step);
  } catch {
    return CONTEXT_UNAVAILABLE;
  }
}

export const DOCUMENT_WORKSPACE_KINDS = safeFreeze([
  "quote",
  "contract",
  "drawing",
]);

const SELF_CHECK_STATUS_LABELS = safeFreeze({
  unconfirmed: "尚未確認",
  clear: "已說清楚",
  "needs-info": "需要補件",
  uncertain: "我不確定",
});

const SELF_CHECK_OWNER_LABELS = safeFreeze({
  owner: "我（甲方）",
  provider: "設計師／統包",
});

function isDocumentWorkspaceKind(kind) {
  return kind === "quote" || kind === "contract" || kind === "drawing";
}

export function resolveDocumentWorkspaceMode(search = "") {
  try {
    if (typeof search !== "string") return "quote";
    const mode = new URLSearchParams(search).get("mode");
    return isDocumentWorkspaceKind(mode) ? mode : "quote";
  } catch {
    return "quote";
  }
}

export function resolveDocumentWorkspaceHash(hash = "") {
  if (typeof hash !== "string" || hash.length < 2) return null;
  let id = "";
  try {
    id = decodeURIComponent(hash.slice(1));
  } catch {
    return null;
  }
  if (/^(?:document-(?:tab|panel)-quote|check-quote-)/u.test(id)) return "quote";
  if (/^(?:document-(?:tab|panel)-contract|check-contract-)/u.test(id)) return "contract";
  if (/^(?:document-(?:tab|panel)-drawing|check-drawing-)/u.test(id)) return "drawing";
  return null;
}

function freezeDocumentSelection(selection) {
  if (!selection) return null;
  return safeFreeze({ name: selection.name });
}

function freezeDocumentWorkspaceState(activeTab, documents) {
  return safeFreeze({
    activeTab,
    documents: safeFreeze({
      quote: freezeDocumentSelection(documents.quote),
      contract: freezeDocumentSelection(documents.contract),
      drawing: freezeDocumentSelection(documents.drawing),
    }),
  });
}

export function createDocumentWorkspaceState(initialMode = "quote") {
  return freezeDocumentWorkspaceState(isDocumentWorkspaceKind(initialMode) ? initialMode : "quote", {
    quote: null,
    contract: null,
    drawing: null,
  });
}

export function selectDocumentWorkspaceTab(state, kind) {
  if (!state || !state.documents || !isDocumentWorkspaceKind(kind)) return state;
  if (state.activeTab === kind) return state;
  return freezeDocumentWorkspaceState(kind, state.documents);
}

export function recordDocumentSelection(state, kind, selection) {
  if (!state || !state.documents || !isDocumentWorkspaceKind(kind)) return state;
  const selectionKind = readOwnDataString(selection, "kind");
  const selectionName = readOwnDataString(selection, "name");
  if (
    selectionKind !== "PDF_METADATA" ||
    !selectionName ||
    !safeHasNonWhitespaceFileName(selectionName)
  ) {
    return state;
  }
  return freezeDocumentWorkspaceState(kind, {
    ...state.documents,
    [kind]: { name: selectionName },
  });
}

export function clearDocumentSelection(state, kind) {
  if (!state || !state.documents || !isDocumentWorkspaceKind(kind)) return state;
  if (!state.documents[kind]) return state;
  return freezeDocumentWorkspaceState(state.activeTab, {
    ...state.documents,
    [kind]: null,
  });
}

export function projectDocumentWorkspace(state) {
  const documents = state && state.documents ? state.documents : createDocumentWorkspaceState().documents;
  let uploadedCount = 0;
  if (documents.quote) uploadedCount += 1;
  if (documents.contract) uploadedCount += 1;
  if (documents.drawing) uploadedCount += 1;
  return safeFreeze({
    uploadedCount,
    stage: uploadedCount === 0 ? 1 : uploadedCount === 3 ? 3 : 2,
    crossFileReady: uploadedCount === 3,
    nextMissing: !documents.quote
      ? "quote"
      : !documents.contract
        ? "contract"
        : !documents.drawing
          ? "drawing"
          : null,
  });
}

export function isAcceptedPdfFileMetadata(name, type = "") {
  return typeof name === "string" &&
    typeof type === "string" &&
    safeHasNonWhitespaceFileName(name) &&
    (type === "application/pdf" || safeHasPdfFileName(name));
}

export function projectSelfCheckItems(items = []) {
  const summary = {
    total: 0,
    confirmed: 0,
    clear: 0,
    needsInfo: 0,
    uncertain: 0,
    unconfirmed: 0,
    owner: 0,
    provider: 0,
  };
  const pending = [];
  if (!safeArrayIsArray(items)) return safeFreeze({ ...summary, pending: safeFreeze(pending) });

  for (let index = 0; index < items.length; index += 1) {
    const item = items[index];
    if (!item || typeof item !== "object") continue;
    const status = item.status;
    if (!Object.hasOwn(SELF_CHECK_STATUS_LABELS, status)) continue;
    summary.total += 1;
    if (status === "unconfirmed") {
      summary.unconfirmed += 1;
      continue;
    }
    summary.confirmed += 1;
    if (status === "clear") summary.clear += 1;
    if (status === "needs-info") summary.needsInfo += 1;
    if (status === "uncertain") summary.uncertain += 1;
    if (status !== "needs-info" && status !== "uncertain") continue;
    const owner = item.owner === "provider" ? "provider" : "owner";
    summary[owner] += 1;
    pending.push(safeFreeze({
      category: typeof item.category === "string" ? item.category : "文件自查",
      id: typeof item.id === "string" ? item.id : "",
      note: typeof item.note === "string" ? item.note : "",
      owner,
      question: typeof item.question === "string" ? item.question : "待確認項目",
      status,
    }));
  }

  return safeFreeze({ ...summary, pending: safeFreeze(pending) });
}

export function formatPendingItems(items = []) {
  const projection = projectSelfCheckItems(items);
  if (projection.pending.length === 0) return "";
  const lines = ["待確認事項"];
  for (let index = 0; index < projection.pending.length; index += 1) {
    const item = projection.pending[index];
    lines.push(`${index + 1}. 【${item.category}｜${SELF_CHECK_STATUS_LABELS[item.status]}】${item.question}`);
    lines.push(`備註：${item.note || "未填寫"}`);
    lines.push(`下一步：${SELF_CHECK_OWNER_LABELS[item.owner]}`);
  }
  return lines.join("\n");
}

function readTrustedPdfFileList(files) {
  try {
    if (
      files === null ||
      files === undefined ||
      !trustedFileListLengthGetter ||
      !trustedFileListItem
    ) {
      return INVALID_FILE_SELECTION;
    }
    const length = safeApply(
      trustedFileListLengthGetter,
      files,
      SAFE_EMPTY_ARGUMENTS,
    );
    if (length === 0) return EMPTY_FILE_SELECTION;
    if (length !== 1) return INVALID_FILE_SELECTION;

    const slotDescriptor = readOwnDataValue(files, "0");
    if (!slotDescriptor) return INVALID_FILE_SELECTION;
    const file = slotDescriptor.value;
    const itemFile = safeApply(
      trustedFileListItem,
      files,
      SAFE_FILE_INDEX_ARGUMENTS,
    );
    if (
      itemFile !== file ||
      file === null ||
      file === undefined ||
      typeof file !== "object" ||
      !trustedFileNameGetter ||
      !trustedBlobTypeGetter ||
      safeGetOwnPropertyDescriptor(file, "name") ||
      safeGetOwnPropertyDescriptor(file, "type")
    ) {
      return INVALID_FILE_SELECTION;
    }
    const name = safeApply(trustedFileNameGetter, file, SAFE_EMPTY_ARGUMENTS);
    const type = safeApply(trustedBlobTypeGetter, file, SAFE_EMPTY_ARGUMENTS);
    if (!isAcceptedPdfFileMetadata(name, type)) {
      return INVALID_FILE_SELECTION;
    }
    return fileSelectionResult("PDF_METADATA", name, file);
  } catch {
    return INVALID_FILE_SELECTION;
  }
}

function readDocumentInputSelection(input) {
  try {
    if (
      !input ||
      !trustedInputFilesGetter ||
      safeGetOwnPropertyDescriptor(input, "files")
    ) {
      return INVALID_FILE_SELECTION;
    }
    const files = safeApply(
      trustedInputFilesGetter,
      input,
      SAFE_EMPTY_ARGUMENTS,
    );
    return readTrustedPdfFileList(files);
  } catch {
    return INVALID_FILE_SELECTION;
  }
}

function initializeDocumentWorkspace(
  root,
  workspaceRoot,
  initialMode,
  initialHash = "",
  dependencies = null,
) {
  const tabs = root.querySelectorAll("[data-document-tab]");
  const panels = root.querySelectorAll("[data-document-panel]");
  const fileInputs = root.querySelectorAll("[data-document-file]");
  const dropzones = root.querySelectorAll("[data-document-dropzone]");
  const checkItems = root.querySelectorAll("[data-check-item]");
  const statusTargets = root.querySelectorAll("[data-current-status]");
  const nextTargets = root.querySelectorAll("[data-current-next]");
  const responsibilityTargets = root.querySelectorAll("[data-current-responsibility]");
  const liveTarget = root.querySelector("[data-state-live]");
  const workspaceStart = root.querySelector("[data-start-upload]");
  const pendingList = root.querySelector("[data-pending-list]");
  const pendingEmpty = root.querySelector("[data-pending-empty]");
  const copyPending = root.querySelector("[data-copy-pending]");
  const copyFeedback = root.querySelector("[data-copy-feedback]");
  const domFactory = root.ownerDocument || null;
  const inspectorDescriptor = readOwnDataValue(dependencies, "inspectQuotePdfFile");
  const inspectSelectedQuoteFile = inspectorDescriptor &&
      typeof inspectorDescriptor.value === "function"
    ? inspectorDescriptor.value
    : inspectQuotePdfFile;
  try {
    root.dataset.quoteRuntimeMode = QUOTE_BROWSER_RUNTIME_MODE;
  } catch {
    // The runtime marker is informative; a hostile DOM host must not stop the workspace.
  }
  let workspaceState = createDocumentWorkspaceState(initialMode);
  let pendingCopyText = "";
  const parserResults = {
    quote: null,
    contract: null,
    drawing: null,
  };
  const analysisRuns = {
    quote: 0,
    contract: 0,
    drawing: 0,
  };

  function tabKind(tab) {
    const candidate = tab && tab.dataset ? tab.dataset.documentTab : null;
    return isDocumentWorkspaceKind(candidate) ? candidate : null;
  }

  function setTextFor(selector, text) {
    const targets = root.querySelectorAll(selector);
    for (let index = 0; index < targets.length; index += 1) {
      targets[index].textContent = text;
    }
  }

  function moveViewportTo(target) {
    if (!target || typeof target.getBoundingClientRect !== "function") return;
    if (typeof window === "undefined" || typeof window.scrollTo !== "function") return;
    const targetTop = window.scrollY + target.getBoundingClientRect().top - 92;
    const reduceMotion = typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({
      top: Math.max(0, targetTop),
      behavior: reduceMotion ? "auto" : "smooth",
    });
  }

  function readCheckItem(item) {
    const selected = item.querySelector('input[type="radio"]:checked');
    const legend = item.querySelector("legend");
    const note = item.querySelector("[data-check-note]");
    const owner = item.querySelector("[data-check-owner]");
    const question = legend && typeof legend.textContent === "string"
      ? legend.textContent.replace(/^\s*\d+\s*/u, "").trim()
      : "待確認項目";
    return {
      category: item.dataset.checkCategory || "文件自查",
      id: item.dataset.checkId || "",
      kind: item.dataset.checkKind || "quote",
      note: note && typeof note.value === "string" ? note.value.trim() : "",
      owner: owner && owner.value === "provider" ? "provider" : "owner",
      question,
      status: selected && Object.hasOwn(SELF_CHECK_STATUS_LABELS, selected.value)
        ? selected.value
        : "unconfirmed",
    };
  }

  function readAllCheckItems() {
    const records = [];
    for (let index = 0; index < checkItems.length; index += 1) {
      records.push(readCheckItem(checkItems[index]));
    }
    return records;
  }

  function renderDocumentSelection(kind) {
    const documentSelection = workspaceState.documents[kind];
    const selected = Boolean(documentSelection);
    const parserResult = parserResults[kind];
    const filename = root.querySelector(`[data-document-filename="${kind}"]`);
    const filenameRow = root.querySelector(`[data-selected-file="${kind}"]`);
    const reportAction = kind === "quote"
      ? null
      : root.querySelector(`[data-ai-report-action="${kind}"]`);
    const reportStatus = kind === "quote"
      ? null
      : root.querySelector(`[data-ai-report-status="${kind}"]`);
    const parserStatus = kind === "quote"
      ? root.querySelector('[data-parser-status="quote"]')
      : null;
    if (filename) filename.textContent = selected ? documentSelection.name : "";
    if (filenameRow) filenameRow.hidden = !selected;
    if (!selected) {
      if (reportAction) {
        reportAction.disabled = true;
        reportAction.textContent = "檢查報告尚未開放";
      }
      if (reportStatus) {
        reportStatus.dataset.reportState = "waiting-file";
        reportStatus.textContent = "請先選擇 PDF。";
      }
      if (parserStatus) {
        parserStatus.dataset.parserState = "waiting-file";
        parserStatus.textContent = "請先選擇 PDF。";
      }
      return;
    }
    if (kind !== "quote") {
      if (reportAction) {
        reportAction.disabled = true;
        reportAction.textContent = "檢查報告尚未開放";
      }
      if (reportStatus) {
        reportStatus.dataset.reportState = "unavailable";
        reportStatus.textContent = "已選擇檔案；這類文件的檢查功能仍在整理中。";
      }
      return;
    }
    if (!parserResult || parserResult.status === "PROCESSING") {
      if (parserStatus) {
        parserStatus.dataset.parserState = "processing";
        parserStatus.textContent = "正在本機讀取 PDF；檔案不會上傳或保存。";
      }
      return;
    }
    const ready = parserResult.status === "PARSER_READY" && Boolean(parserResult.summary);
    if (parserStatus) {
      parserStatus.dataset.parserState = ready
        ? "parser-ready"
        : parserResult.status === "SCANNED_PDF"
          ? "scanned"
          : "error";
      parserStatus.textContent = ready
        ? "本機解析摘要已完成；這不是案件正式報告，請回到原始文件確認。"
        : `${parserResult.title}：${parserResult.message}`;
    }
  }

  function renderQuoteParserSummary() {
    const output = root.querySelector('[data-parser-summary="quote"]');
    const result = parserResults.quote;
    const ready = result?.status === "PARSER_READY" && Boolean(result.summary);
    if (output) output.hidden = !ready;
    if (!ready) return;
    setTextFor("[data-summary-page-count]", String(result.summary.pageCount));
    setTextFor("[data-summary-item-count]", String(result.summary.itemCount));
    setTextFor("[data-summary-readability]", result.summary.readability);
    setTextFor("[data-summary-comparison]", result.summary.comparison);
    setTextFor(
      "[data-summary-limitations]",
      result.limitations.length > 0
        ? result.limitations.join(" ")
        : "這份本機解析摘要不會保存，也不是案件正式報告。",
    );
  }

  function renderTabsAndPanels() {
    for (let index = 0; index < tabs.length; index += 1) {
      const tab = tabs[index];
      const active = tabKind(tab) === workspaceState.activeTab;
      tab.setAttribute("aria-selected", active ? "true" : "false");
      tab.tabIndex = active ? 0 : -1;
    }
    for (let index = 0; index < panels.length; index += 1) {
      panels[index].hidden = panels[index].dataset.documentPanel !== workspaceState.activeTab;
    }
  }

  function renderPendingItems(records, projection) {
    pendingCopyText = formatPendingItems(records);
    if (pendingEmpty) pendingEmpty.hidden = projection.pending.length > 0;
    if (pendingList) {
      pendingList.hidden = projection.pending.length === 0;
      if (typeof pendingList.replaceChildren === "function") pendingList.replaceChildren();
      if (domFactory && typeof domFactory.createElement === "function") {
        for (let index = 0; index < projection.pending.length; index += 1) {
          const item = projection.pending[index];
          const row = domFactory.createElement("li");
          const heading = domFactory.createElement("strong");
          const question = domFactory.createElement("p");
          const note = domFactory.createElement("p");
          const owner = domFactory.createElement("p");
          heading.textContent = `${item.category}｜${SELF_CHECK_STATUS_LABELS[item.status]}`;
          question.textContent = item.question;
          note.textContent = `備註：${item.note || "未填寫"}`;
          owner.textContent = `下一步：${SELF_CHECK_OWNER_LABELS[item.owner]}`;
          row.append(heading, question, note, owner);
          pendingList.append(row);
        }
      }
    }
    if (copyPending) copyPending.disabled = projection.pending.length === 0;
  }

  function renderSelfCheck() {
    const records = readAllCheckItems();
    const projection = projectSelfCheckItems(records);
    for (let index = 0; index < checkItems.length; index += 1) {
      const item = checkItems[index];
      const details = item.querySelector("[data-check-details]");
      const status = records[index]?.status || "unconfirmed";
      if (details) details.hidden = status !== "needs-info" && status !== "uncertain";
      item.dataset.checkState = status;
    }

    for (const kind of DOCUMENT_WORKSPACE_KINDS) {
      let completed = 0;
      for (let index = 0; index < records.length; index += 1) {
        if (records[index].kind === kind && records[index].status !== "unconfirmed") completed += 1;
      }
      setTextFor(`[data-tab-status="${kind}"]`, `${completed}/3 已確認`);
    }

    setTextFor("[data-summary-confirmed]", `${projection.confirmed}/${projection.total || 9}`);
    setTextFor("[data-summary-needs-info]", String(projection.needsInfo));
    setTextFor("[data-summary-uncertain]", String(projection.uncertain));
    setTextFor("[data-summary-owner]", String(projection.owner));
    setTextFor("[data-summary-provider]", String(projection.provider));
    renderPendingItems(records, projection);

    const currentStatus = projection.unconfirmed > 0
      ? `${projection.unconfirmed} 項尚未確認`
      : projection.pending.length > 0
        ? `${projection.total} 項已確認，${projection.pending.length} 項待處理`
        : `${projection.total} 項已確認，沒有待確認事項`;
    const firstUnconfirmed = records.find((item) => item.status === "unconfirmed");
    const firstPending = projection.pending[0] || null;
    const nextStep = firstUnconfirmed
      ? `繼續確認「${firstUnconfirmed.question}」`
      : firstPending
        ? `處理「${firstPending.question}」`
        : "可複製整理結果，或返回 DRS 首頁。";
    const responsibleRole = firstUnconfirmed
      ? "我（甲方）"
      : firstPending
        ? SELF_CHECK_OWNER_LABELS[firstPending.owner]
        : "我（甲方）";
    for (let index = 0; index < statusTargets.length; index += 1) {
      statusTargets[index].textContent = currentStatus;
    }
    for (let index = 0; index < nextTargets.length; index += 1) {
      nextTargets[index].textContent = nextStep;
    }
    for (let index = 0; index < responsibilityTargets.length; index += 1) {
      responsibilityTargets[index].textContent = responsibleRole;
    }
    return { currentStatus, nextStep, projection, records };
  }

  function render() {
    renderTabsAndPanels();
    for (const kind of DOCUMENT_WORKSPACE_KINDS) renderDocumentSelection(kind);
    renderQuoteParserSummary();
    const documentProjection = projectDocumentWorkspace(workspaceState);
    const fileSummary = documentProjection.uploadedCount === 0
      ? "目前尚未選擇檔案。"
      : documentProjection.uploadedCount === 3
        ? "三類檔案已選擇；目前僅報價 PDF 可產生本機解析摘要。"
        : `${documentProjection.uploadedCount}/3 類檔案已選擇；目前僅報價 PDF 可產生本機解析摘要。`;
    setTextFor("[data-file-selection-summary]", fileSummary);
    for (const kind of DOCUMENT_WORKSPACE_KINDS) {
      setTextFor(`[data-tab-status="${kind}"]`, workspaceState.documents[kind] ? "檔案已就緒" : "尚未選擇");
    }
    const currentStatus = documentProjection.uploadedCount === 0
      ? "尚未選擇檔案"
      : `${documentProjection.uploadedCount}/3 類檔案已選擇`;
    const nextStep = documentProjection.uploadedCount === 0
      ? "選擇一類文件後，選擇 PDF。"
      : parserResults.quote?.status === "PARSER_READY"
        ? "查看本機解析摘要，並回到原始文件確認。"
        : "確認目前文件狀態，必要時重新選擇。";
    for (let index = 0; index < statusTargets.length; index += 1) {
      statusTargets[index].textContent = currentStatus;
    }
    for (let index = 0; index < nextTargets.length; index += 1) {
      nextTargets[index].textContent = nextStep;
    }
    for (let index = 0; index < responsibilityTargets.length; index += 1) {
      responsibilityTargets[index].textContent = "我（甲方）";
    }
    return { currentStatus, documentProjection, nextStep };
  }

  function announce(message) {
    if (liveTarget) liveTarget.textContent = message;
  }

  function activateTab(kind, shouldFocus = true) {
    const nextState = selectDocumentWorkspaceTab(workspaceState, kind);
    if (nextState === workspaceState && workspaceState.activeTab !== kind) return;
    workspaceState = nextState;
    renderTabsAndPanels();
    if (!shouldFocus) return;
    for (let index = 0; index < tabs.length; index += 1) {
      if (tabKind(tabs[index]) === kind) {
        if (typeof tabs[index].focus === "function") tabs[index].focus();
        break;
      }
    }
  }

  async function acceptSelection(kind, selection, input = null) {
    const feedback = root.querySelector(`[data-document-feedback="${kind}"]`);
    if (selection === EMPTY_FILE_SELECTION) return;
    if (!selection || selection.kind !== "PDF_METADATA") {
      analysisRuns[kind] += 1;
      parserResults[kind] = null;
      workspaceState = clearDocumentSelection(workspaceState, kind);
      if (input) {
        try {
          input.value = "";
        } catch {
          // Browsers allow clearing a file input, but keep the visible state truthful if a host blocks it.
        }
      }
      if (feedback) {
        feedback.textContent = "無法選用此檔案，請重新選擇 PDF。";
        feedback.dataset.feedbackState = "error";
      }
      if (input && typeof input.setAttribute === "function") input.setAttribute("aria-invalid", "true");
      render();
      announce("無法選用此檔案，請重新選擇 PDF。");
      return;
    }
    workspaceState = recordDocumentSelection(workspaceState, kind, selection);
    if (feedback) {
      feedback.textContent = kind === "quote"
        ? "已選擇檔案，正在本機讀取內容。"
        : "已選擇檔案；這類文件目前只顯示檔名。";
      feedback.dataset.feedbackState = "selected";
    }
    if (input && typeof input.setAttribute === "function") input.setAttribute("aria-invalid", "false");
    if (kind !== "quote") {
      analysisRuns[kind] += 1;
      parserResults[kind] = null;
      render();
      announce("已選擇檔案；這類文件的檢查功能仍在整理中。");
      return;
    }

    const runId = analysisRuns.quote + 1;
    analysisRuns.quote = runId;
    parserResults.quote = { status: "PROCESSING", summary: null };
    render();
    announce("正在本機讀取報價 PDF；檔案不會上傳或保存。");
    const parserResult = await inspectSelectedQuoteFile(selection.file);
    if (analysisRuns.quote !== runId) return;
    parserResults.quote = parserResult;
    if (feedback) {
      feedback.textContent = parserResult.status === "PARSER_READY"
        ? "已完成本機解析摘要；重新選擇可改看另一份 PDF。"
        : `${parserResult.title}；可重新選擇另一份 PDF。`;
      feedback.dataset.feedbackState = parserResult.status === "PARSER_READY" ? "selected" : "error";
    }
    render();
    announce(parserResult.status === "PARSER_READY"
      ? "本機解析摘要已完成；這不是案件正式報告，請回到原始文件確認。"
      : `${parserResult.title}。下一步：${parserResult.nextAction}`);
  }

  function focusFirstUnconfirmed() {
    for (let index = 0; index < checkItems.length; index += 1) {
      const record = readCheckItem(checkItems[index]);
      if (record.status !== "unconfirmed") continue;
      activateTab(record.kind, false);
      moveViewportTo(checkItems[index]);
      if (typeof checkItems[index].focus === "function") checkItems[index].focus();
      announce(`已移到第一個尚未確認項目：${record.question}`);
      return;
    }
    const summary = root.querySelector("[data-self-check-summary]");
    moveViewportTo(summary);
    if (summary && typeof summary.focus === "function") summary.focus();
    announce("所有項目都已確認，已移到本次自查進度。");
  }

  function applyHashTarget(hash) {
    if (typeof hash !== "string" || hash.length < 2) return;
    let id = "";
    try {
      id = decodeURIComponent(hash.slice(1));
    } catch {
      return;
    }
    if (!/^[A-Za-z][A-Za-z0-9:_-]*$/u.test(id)) return;
    const target = domFactory && typeof domFactory.getElementById === "function"
      ? domFactory.getElementById(id)
      : null;
    if (!target || !root.contains?.(target)) return;
    const panel = typeof target.closest === "function" ? target.closest("[data-document-panel]") : null;
    const kind = panel?.dataset?.documentPanel;
    if (isDocumentWorkspaceKind(kind)) activateTab(kind, false);
    const focusTarget = () => {
      moveViewportTo(target);
      if (typeof target.focus === "function") target.focus({ preventScroll: true });
    };
    if (typeof globalThis.requestAnimationFrame === "function") {
      globalThis.requestAnimationFrame(focusTarget);
    } else {
      focusTarget();
    }
  }

  for (let index = 0; index < tabs.length; index += 1) {
    const tab = tabs[index];
    tab.addEventListener("click", () => {
      const kind = tabKind(tab);
      if (kind) activateTab(kind, false);
    });
    tab.addEventListener("keydown", (event) => {
      if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
      event.preventDefault();
      let nextIndex = index;
      if (event.key === "ArrowRight") nextIndex = (index + 1) % tabs.length;
      if (event.key === "ArrowLeft") nextIndex = (index - 1 + tabs.length) % tabs.length;
      if (event.key === "Home") nextIndex = 0;
      if (event.key === "End") nextIndex = tabs.length - 1;
      const kind = tabKind(tabs[nextIndex]);
      if (kind) activateTab(kind);
    });
  }

  for (let index = 0; index < fileInputs.length; index += 1) {
    const input = fileInputs[index];
    input.addEventListener("change", async () => {
      const kind = input.dataset.documentFile;
      if (!isDocumentWorkspaceKind(kind)) return;
      await acceptSelection(kind, readDocumentInputSelection(input), input);
    });
  }

  for (let index = 0; index < dropzones.length; index += 1) {
    const dropzone = dropzones[index];
    const kind = dropzone.dataset.documentDropzone;
    if (!isDocumentWorkspaceKind(kind)) continue;
    dropzone.addEventListener("dragover", (event) => {
      event.preventDefault();
      dropzone.dataset.dragState = "over";
    });
    dropzone.addEventListener("dragleave", () => {
      delete dropzone.dataset.dragState;
    });
    dropzone.addEventListener("drop", async (event) => {
      event.preventDefault();
      delete dropzone.dataset.dragState;
      let files = null;
      try {
        files = event.dataTransfer ? event.dataTransfer.files : null;
      } catch {
        files = null;
      }
      const input = root.querySelector(`[data-document-file="${kind}"]`);
      await acceptSelection(kind, readTrustedPdfFileList(files), input);
    });
  }

  for (let index = 0; index < checkItems.length; index += 1) {
    const item = checkItems[index];
    item.addEventListener("change", () => {
      const state = renderSelfCheck();
      const record = readCheckItem(item);
      announce(`${record.question}：${SELF_CHECK_STATUS_LABELS[record.status]}。${state.currentStatus}。`);
    });
    item.addEventListener("input", () => {
      renderSelfCheck();
    });
  }

  if (workspaceStart) {
    workspaceStart.addEventListener("click", () => {
      const firstInput = fileInputs[0] || null;
      if (firstInput && typeof firstInput.focus === "function") firstInput.focus();
      announce("請選擇報價內容 PDF。");
    });
  }

  if (copyPending) {
    copyPending.addEventListener("click", async () => {
      if (!pendingCopyText) return;
      try {
        if (!globalThis.navigator?.clipboard || typeof globalThis.navigator.clipboard.writeText !== "function") {
          throw new Error("clipboard unavailable");
        }
        await globalThis.navigator.clipboard.writeText(pendingCopyText);
        if (copyFeedback) copyFeedback.textContent = "已複製待確認事項。";
        announce("已複製待確認事項。");
      } catch {
        if (copyFeedback) copyFeedback.textContent = "目前無法自動複製，請手動選取待確認事項。";
        announce("目前無法自動複製，請手動選取待確認事項。");
      }
    });
  }

  render();
  if (initialHash) {
    const applyInitialHash = () => applyHashTarget(initialHash);
    if (typeof globalThis.requestAnimationFrame === "function") {
      globalThis.requestAnimationFrame(applyInitialHash);
    } else {
      applyInitialHash();
    }
  }
  if (typeof globalThis.addEventListener === "function") {
    globalThis.addEventListener("hashchange", () => {
      try {
        applyHashTarget(typeof location !== "undefined" ? location.hash : "");
      } catch {
        applyHashTarget("");
      }
    });
  }
}

export function initializeQuoteCheckPage(
  documentRoot = document,
  locationSource = globalThis.location,
  dependencies = null,
) {
  const root = documentRoot.querySelector("[data-quote-check-page]");
  if (!root) return;

  const workspaceRoot = root.querySelector("[data-document-workspace-root]");
  if (workspaceRoot) {
    let search = "";
    try {
      search = typeof locationSource?.search === "string"
        ? locationSource.search
        : "";
    } catch {
      search = "";
    }
    let hash = "";
    try {
      hash = typeof locationSource?.hash === "string" ? locationSource.hash : "";
    } catch {
      hash = "";
    }
    const initialMode = resolveDocumentWorkspaceHash(hash) || resolveDocumentWorkspaceMode(search);
    initializeDocumentWorkspace(root, workspaceRoot, initialMode, hash, dependencies);
    wireDrawingCheckRouteGuards(root);
    return;
  }

  const panels = root.querySelectorAll("[data-flow-panel]");
  const railItems = root.querySelectorAll("[data-flow-step]");
  const nextControls = root.querySelectorAll("[data-next-step]");
  const fileInput = root.querySelector("#quote-file");
  const consent = root.querySelector("#local-consent");
  const consentContinue = root.querySelector("[data-consent-continue]");
  const fileNameTargets = root.querySelectorAll("[data-selected-file-name]");
  const statusTargets = root.querySelectorAll("[data-current-status]");
  const nextTargets = root.querySelectorAll("[data-current-next]");
  const roleTargets = root.querySelectorAll("[data-current-responsibility]");
  const liveTarget = root.querySelector("[data-state-live]");
  const failureTitle = root.querySelector("[data-failure-title]");
  const failureReason = root.querySelector("[data-failure-reason]");
  const failureNext = root.querySelector("[data-failure-next]");
  const failureRole = root.querySelector("[data-failure-role]");
  const failureRecover = root.querySelector("[data-failure-recover]");
  const failureReturn = root.querySelector("[data-failure-return]");
  const failureDrawingRecover = root.querySelector("[data-failure-drawing-recover]");
  const primaryDrawingCheckLink = root.querySelector("[data-drawing-check-primary]");
  const heroStart = root.querySelector("[data-hero-start]");
  const openFileControls = root.querySelectorAll("[data-open-file]");
  const stepOrder = safeFreeze([
    "INTRODUCTION",
    "CONSENT",
    "SELECT_FILE",
    "VALIDATION_PENDING",
    "CORRECTION_REQUIRED",
    "RESELECT_FILE",
    "RESULT_FORMAT",
    "RESULT_UNAVAILABLE",
  ]);
  let currentStep = "INTRODUCTION";
  let currentFailure = null;
  let currentHeroAction = NO_HERO_ACTION;

  function stepIndex(step) {
    for (let index = 0; index < stepOrder.length; index += 1) {
      if (stepOrder[index] === step) return index;
    }
    return -1;
  }

  function focusPanel(panel) {
    try {
      const focusTarget = panel && panel.querySelector("[data-panel-focus]");
      if (!focusTarget || typeof focusTarget.focus !== "function") return;
      try {
        focusTarget.focus({ preventScroll: true });
      } catch {
        focusTarget.focus();
      }
    } catch {
      // The state remains closed if the surrounding document changed.
    }
  }

  function clearFileSelection() {
    try {
      if (fileInput) fileInput.value = "";
    } catch {
      // A hostile input cannot preserve display authority.
    }
    for (let index = 0; index < fileNameTargets.length; index += 1) {
      try {
        fileNameTargets[index].textContent = "尚未選擇";
      } catch {
        // Keep clearing the remaining product labels.
      }
    }
  }

  function renderHeroAction(action) {
    currentHeroAction = action;
    if (!heroStart) return;
    try {
      heroStart.textContent = action.label;
      heroStart.disabled = !action.enabled;
      heroStart.setAttribute("aria-disabled", action.enabled ? "false" : "true");
      delete heroStart.dataset.nextStep;
      if (action.enabled && action.target) {
        heroStart.dataset.heroTarget = action.target;
      } else {
        delete heroStart.dataset.heroTarget;
      }
    } catch {
      currentHeroAction = NO_HERO_ACTION;
    }
  }

  function renderState(state, panelCode = state.code, shouldFocus = false) {
    currentStep = panelCode;
    let activePanel = null;
    for (let index = 0; index < panels.length; index += 1) {
      panels[index].hidden = panels[index].dataset.flowPanel !== panelCode;
      if (!panels[index].hidden) activePanel = panels[index];
    }
    const activeIndex = stepIndex(panelCode);
    for (let index = 0; index < railItems.length; index += 1) {
      const item = railItems[index];
      const itemIndex = stepIndex(item.dataset.flowStep);
      item.dataset.stepState = itemIndex < activeIndex
        ? "complete"
        : itemIndex === activeIndex
          ? "current"
          : "upcoming";
      if (itemIndex === activeIndex) item.setAttribute("aria-current", "step");
      else item.removeAttribute("aria-current");
    }
    for (let index = 0; index < statusTargets.length; index += 1) {
      statusTargets[index].textContent = state.title;
    }
    for (let index = 0; index < nextTargets.length; index += 1) {
      nextTargets[index].textContent = state.nextAction;
    }
    for (let index = 0; index < roleTargets.length; index += 1) {
      roleTargets[index].textContent = state.responsibleRole;
    }
    if (liveTarget) liveTarget.textContent = `目前狀態：${state.title}。下一步：${state.nextAction}`;
    renderHeroAction(projectQuoteCheckHeroAction(state));
    if (shouldFocus) focusPanel(activePanel);
  }

  function moveTo(step) {
    currentFailure = null;
    renderState(resolveQuoteCheckState({ step }), step, true);
  }

  function showFailure(code) {
    currentFailure = resolveQuoteCheckState({ step: "FAILURE", failureCode: code });
    if (failureTitle) failureTitle.textContent = currentFailure.title;
    if (failureReason) failureReason.textContent = currentFailure.reason;
    if (failureNext) failureNext.textContent = currentFailure.nextAction;
    if (failureRole) failureRole.textContent = currentFailure.responsibleRole;
    const usesDrawingRecovery =
      currentFailure === QUOTE_CHECK_FAILURES.QUOTE_ONLY_DRAWING_MISSING;
    if (failureRecover) failureRecover.hidden = usesDrawingRecovery;
    if (failureDrawingRecover) failureDrawingRecover.hidden = !usesDrawingRecovery;
    renderState(currentFailure, "FAILURE", true);
  }

  function navigateToDrawingCheck() {
    const link = currentFailure === QUOTE_CHECK_FAILURES.QUOTE_ONLY_DRAWING_MISSING
      ? failureDrawingRecover
      : primaryDrawingCheckLink;
    if (!readDrawingCheckHref(link) || !trustedClick) return;
    try {
      safeApply(trustedClick, link, SAFE_EMPTY_ARGUMENTS);
    } catch {
      // Navigation stays closed if the trusted browser primitive is unavailable.
    }
  }

  function readSelectedFileMetadata(input) {
    try {
      if (
        !trustedInputFilesGetter ||
        safeGetOwnPropertyDescriptor(input, "files")
      ) {
        return INVALID_FILE_SELECTION;
      }
      const files = safeApply(
        trustedInputFilesGetter,
        input,
        SAFE_EMPTY_ARGUMENTS,
      );
      if (files === null || files === undefined) return INVALID_FILE_SELECTION;
      if (
        !trustedFileListLengthGetter ||
        !trustedFileListItem
      ) {
        return INVALID_FILE_SELECTION;
      }

      const length = safeApply(
        trustedFileListLengthGetter,
        files,
        SAFE_EMPTY_ARGUMENTS,
      );
      if (length === 0) return EMPTY_FILE_SELECTION;
      if (length !== 1) return INVALID_FILE_SELECTION;

      const slotDescriptor = readOwnDataValue(files, "0");
      if (!slotDescriptor) return INVALID_FILE_SELECTION;
      const file = slotDescriptor.value;
      const itemFile = safeApply(
        trustedFileListItem,
        files,
        SAFE_FILE_INDEX_ARGUMENTS,
      );
      if (
        itemFile !== file ||
        file === null ||
        file === undefined ||
        typeof file !== "object" ||
        !trustedFileNameGetter ||
        !trustedBlobTypeGetter
      ) {
        return INVALID_FILE_SELECTION;
      }

      const ownNameDescriptor = safeGetOwnPropertyDescriptor(file, "name");
      const ownTypeDescriptor = safeGetOwnPropertyDescriptor(file, "type");
      if (ownNameDescriptor || ownTypeDescriptor) {
        return INVALID_FILE_SELECTION;
      }

      const name = safeApply(
        trustedFileNameGetter,
        file,
        SAFE_EMPTY_ARGUMENTS,
      );
      const type = safeApply(
        trustedBlobTypeGetter,
        file,
        SAFE_EMPTY_ARGUMENTS,
      );
      if (!isAcceptedPdfFileMetadata(name, type)) {
        return INVALID_FILE_SELECTION;
      }

      return fileSelectionResult("PDF_METADATA", name);
    } catch {
      return INVALID_FILE_SELECTION;
    }
  }

  function showFileSelectionFailure() {
    clearFileSelection();
    try {
      showFailure("FILE_FORMAT_INVALID");
    } catch {
      currentFailure = QUOTE_CHECK_FAILURES.FILE_FORMAT_INVALID;
      try {
        renderState(currentFailure, "FAILURE", true);
      } catch {
        // Keep the event boundary closed even if the surrounding DOM changed.
      }
    }
  }

  function openFilePicker() {
    try {
      if (!fileInput) return;
      fileInput.value = "";
      fileInput.click();
    } catch {
      showFileSelectionFailure();
    }
  }

  function runHeroAction(action) {
    if (!action.enabled || !action.target) return;
    switch (action.target) {
      case "CONSENT":
      case "SELECT_FILE":
      case "CORRECTION_REQUIRED":
      case "RESELECT_FILE":
      case "RESULT_FORMAT":
      case "RESULT_UNAVAILABLE":
        moveTo(action.target);
        return;
      case "OPEN_FILE":
        openFilePicker();
        return;
      case "DRAWING_CHECK":
        navigateToDrawingCheck();
        return;
      default:
        return;
    }
  }

  for (let index = 0; index < nextControls.length; index += 1) {
    const nextControl = nextControls[index];
    if (nextControl === heroStart) continue;
    nextControl.addEventListener("click", () => {
      moveTo(nextControl.dataset.nextStep);
    });
  }

  if (consent && consentContinue) {
    consent.addEventListener("change", () => {
      consentContinue.disabled = !consent.checked;
    });
  }

  for (let index = 0; index < openFileControls.length; index += 1) {
    openFileControls[index].addEventListener("click", () => {
      openFilePicker();
    });
  }

  wireDrawingCheckRouteGuards(root);

  if (heroStart) {
    heroStart.addEventListener("click", () => {
      runHeroAction(currentHeroAction);
    });
  }

  if (fileInput) {
    fileInput.addEventListener("change", () => {
      const selection = readSelectedFileMetadata(fileInput);
      if (selection === EMPTY_FILE_SELECTION) {
        clearFileSelection();
        moveTo(currentStep === "RESELECT_FILE" ? "RESELECT_FILE" : "SELECT_FILE");
        return;
      }
      if (selection.kind !== "PDF_METADATA") {
        showFileSelectionFailure();
        return;
      }
      try {
        for (let index = 0; index < fileNameTargets.length; index += 1) {
          fileNameTargets[index].textContent = selection.name;
        }
        moveTo("VALIDATION_PENDING");
      } catch {
        showFileSelectionFailure();
      }
    });
  }

  if (failureRecover) {
    failureRecover.addEventListener("click", () => {
      if (!currentFailure) return;
      if (currentFailure.recoveryStep === "DRAWING_CHECK") {
        navigateToDrawingCheck();
        return;
      }
      moveTo(currentFailure.recoveryStep);
    });
  }
  if (failureReturn) {
    failureReturn.addEventListener("click", () => {
      if (currentFailure) moveTo(currentFailure.returnStep);
    });
  }

  renderState(resolveQuoteCheckState({ step: "INTRODUCTION" }));
}

if (typeof document !== "undefined") {
  initializeQuoteCheckPage();
}
