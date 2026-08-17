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

function fileSelectionResult(kind, name = null) {
  const result = safeCreate(null);
  result.kind = kind;
  result.name = name;
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
    nextAction: "回到檔案選擇，改選瀏覽器標示為 PDF 的乙方報價檔。",
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
    nextAction: "請乙方重新匯出可正常開啟的 PDF，再重新選擇。",
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
    nextAction: "請乙方確認唯一有效版次，再重新選擇。",
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

function isDocumentWorkspaceKind(kind) {
  return kind === "quote" || kind === "contract" || kind === "drawing";
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

export function createDocumentWorkspaceState() {
  return freezeDocumentWorkspaceState("quote", {
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
    if (
      typeof name !== "string" ||
      !safeHasNonWhitespaceFileName(name) ||
      type !== "application/pdf"
    ) {
      return INVALID_FILE_SELECTION;
    }
    return fileSelectionResult("PDF_METADATA", name);
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

function initializeDocumentWorkspace(root, workspaceRoot) {
  const tabs = root.querySelectorAll("[data-document-tab]");
  const panels = root.querySelectorAll("[data-document-panel]");
  const fileInputs = root.querySelectorAll("[data-document-file]");
  const dropzones = root.querySelectorAll("[data-document-dropzone]");
  const statusTargets = root.querySelectorAll("[data-current-status]");
  const nextTargets = root.querySelectorAll("[data-current-next]");
  const liveTarget = root.querySelector("[data-state-live]");
  const crossSummary = root.querySelector("[data-cross-file-summary]");
  const inspectionReportStatus = root.querySelector("[data-inspection-report-status]");
  const inspectionReportType = root.querySelector("[data-inspection-report-type]");
  const inspectionReportFilename = root.querySelector("[data-inspection-report-filename]");
  const inspectionReportDirections = root.querySelector("[data-inspection-report-directions]");
  const inspectionReportNext = root.querySelector("[data-inspection-report-next]");
  const workspaceStart = root.querySelector("[data-workspace-start]");
  const saveReport = root.querySelector("[data-save-report]");
  const saveGate = root.querySelector("[data-save-gate]");
  let workspaceState = createDocumentWorkspaceState();

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
    if (!target) return;
    const targetTop = window.scrollY + target.getBoundingClientRect().top - 92;
    window.scrollTo({
      top: Math.max(0, targetTop),
      behavior: "smooth",
    });
  }

  function describeNextStep(projection) {
    if (projection.uploadedCount === 0) return "先從手上已有的 PDF 開始。";
    if (projection.crossFileReady) return "三類檢查方向已看完；回首頁確認案件是否適合使用 DRS。";
    if (projection.nextMissing === "quote") return "補上報價，讓施工範圍有計價依據。";
    if (projection.nextMissing === "contract") return "接著補上契約，核對責任與付款條件。";
    return "接著補上施工圖，核對實際施工範圍。";
  }

  function describeInspectionType(kind) {
    if (kind === "contract") return "契約健檢";
    if (kind === "drawing") return "圖說健檢";
    return "報價健檢";
  }

  function describeInspectionDirections(kind) {
    if (kind === "contract") return "服務範圍、付款節點、工期與延誤、變更追加、驗收方式與雙方責任。";
    if (kind === "drawing") return "圖名與版次、必要平面圖、缺少圖面、施工範圍、模糊漏標與跨文件對照。";
    return "缺漏項目、模糊說明、數量與單位、追加風險、圖說核對。";
  }

  function describeInspectionNext(kind, selected) {
    if (selected) return "依檢查方向逐項確認，並記下需要乙方補充的資料。";
    if (kind === "contract") return "先選擇契約 PDF，再依檢查方向逐項確認。";
    if (kind === "drawing") return "先選擇施工圖 PDF，再依檢查方向逐項確認。";
    return "先選擇報價 PDF，再依檢查方向逐項確認。";
  }

  function renderInspectionReport() {
    const kind = workspaceState.activeTab;
    const documentSelection = workspaceState.documents[kind];
    const selected = Boolean(documentSelection);
    if (inspectionReportStatus) {
      inspectionReportStatus.textContent = selected ? "已建立檢查方向摘要" : "等待選擇 PDF";
      inspectionReportStatus.dataset.reportState = selected ? "direction-ready" : "waiting";
    }
    if (inspectionReportType) inspectionReportType.textContent = describeInspectionType(kind);
    if (inspectionReportFilename) {
      inspectionReportFilename.textContent = selected ? documentSelection.name : "尚未選擇";
    }
    if (inspectionReportDirections) {
      inspectionReportDirections.textContent = describeInspectionDirections(kind);
    }
    if (inspectionReportNext) {
      inspectionReportNext.textContent = describeInspectionNext(kind, selected);
    }
  }

  function renderDocumentStatus(kind) {
    const documentSelection = workspaceState.documents[kind];
    const selected = Boolean(documentSelection);
    setTextFor(
      `[data-document-status="${kind}"]`,
      selected ? "已選擇（尚未送出）" : "尚未選擇",
    );
    setTextFor(
      `[data-document-filename="${kind}"]`,
      selected ? documentSelection.name : "尚未選擇檔案",
    );
    setTextFor(
      `[data-tab-status="${kind}"]`,
      selected ? "本次瀏覽已選擇" : "尚未選擇",
    );
    const ledger = root.querySelector(`[data-ledger-kind="${kind}"]`);
    if (ledger) ledger.dataset.documentState = selected ? "selected" : "empty";
    const report = root.querySelector(`[data-basic-report="${kind}"]`);
    if (report) report.hidden = !selected;
  }

  function render() {
    const projection = projectDocumentWorkspace(workspaceState);
    for (let index = 0; index < tabs.length; index += 1) {
      const tab = tabs[index];
      const active = tabKind(tab) === workspaceState.activeTab;
      tab.setAttribute("aria-selected", active ? "true" : "false");
      tab.tabIndex = active ? 0 : -1;
    }
    for (let index = 0; index < panels.length; index += 1) {
      panels[index].hidden = panels[index].dataset.documentPanel !== workspaceState.activeTab;
    }
    for (const kind of DOCUMENT_WORKSPACE_KINDS) renderDocumentStatus(kind);
    renderInspectionReport();

    setTextFor(
      '[data-prior-file-status="quote"]',
      workspaceState.documents.quote ? "已取得報價 ✓" : "報價尚未選擇",
    );
    setTextFor(
      '[data-prior-file-status="contract"]',
      workspaceState.documents.contract ? "已取得契約 ✓" : "契約尚未選擇",
    );

    const currentStatus = projection.uploadedCount === 0
      ? "尚未選擇文件"
      : projection.crossFileReady
        ? "本次瀏覽已選齊三份文件"
        : `已選擇 ${projection.uploadedCount}／3 份文件`;
    for (let index = 0; index < statusTargets.length; index += 1) {
      statusTargets[index].textContent = currentStatus;
    }
    for (let index = 0; index < nextTargets.length; index += 1) {
      nextTargets[index].textContent = describeNextStep(projection);
    }
    if (crossSummary) crossSummary.hidden = !projection.crossFileReady;
    if (liveTarget) {
      liveTarget.textContent = `目前狀態：${currentStatus}。下一步：${describeNextStep(projection)}`;
    }
  }

  function activateTab(kind, shouldFocus = true) {
    const nextState = selectDocumentWorkspaceTab(workspaceState, kind);
    if (nextState === workspaceState && workspaceState.activeTab !== kind) return;
    workspaceState = nextState;
    render();
    if (!shouldFocus) return;
    for (let index = 0; index < tabs.length; index += 1) {
      if (tabKind(tabs[index]) === kind) {
        tabs[index].focus();
        break;
      }
    }
  }

  function acceptSelection(kind, selection) {
    const feedback = root.querySelector(`[data-document-feedback="${kind}"]`);
    if (selection === EMPTY_FILE_SELECTION) {
      if (feedback) feedback.textContent = "沒有選擇檔案；原本的本次瀏覽狀態未變更。";
      return;
    }
    if (selection.kind !== "PDF_METADATA") {
      if (feedback) {
        feedback.textContent = "這份檔案目前不能繼續：請改選瀏覽器標示為 PDF 的文件。檔案沒有送出。";
        feedback.dataset.feedbackState = "error";
      }
      return;
    }
    workspaceState = recordDocumentSelection(workspaceState, kind, selection);
    if (feedback) {
      feedback.textContent = `本次瀏覽已選擇：${selection.name}。內容格式仍待正式分析。`;
      feedback.dataset.feedbackState = "selected";
    }
    render();
  }

  for (let index = 0; index < tabs.length; index += 1) {
    const tab = tabs[index];
    tab.addEventListener("click", () => {
      const kind = tabKind(tab);
      if (kind) activateTab(kind, false);
    });
    tab.addEventListener("keydown", (event) => {
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
      event.preventDefault();
      const offset = event.key === "ArrowRight" ? 1 : -1;
      const nextIndex = (index + offset + tabs.length) % tabs.length;
      const kind = tabKind(tabs[nextIndex]);
      if (kind) activateTab(kind);
    });
  }

  for (let index = 0; index < fileInputs.length; index += 1) {
    const input = fileInputs[index];
    input.addEventListener("change", () => {
      const kind = input.dataset.documentFile;
      if (!isDocumentWorkspaceKind(kind)) return;
      acceptSelection(kind, readDocumentInputSelection(input));
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
    dropzone.addEventListener("drop", (event) => {
      event.preventDefault();
      delete dropzone.dataset.dragState;
      let files = null;
      try {
        files = event.dataTransfer ? event.dataTransfer.files : null;
      } catch {
        files = null;
      }
      acceptSelection(kind, readTrustedPdfFileList(files));
    });
  }

  if (workspaceStart) {
    workspaceStart.addEventListener("click", () => {
      activateTab("quote", false);
      moveViewportTo(workspaceRoot);
      const activeTab = root.querySelector('[data-document-tab="quote"]');
      if (activeTab) activeTab.focus();
    });
  }

  if (saveReport && saveGate) {
    saveReport.addEventListener("click", () => {
      saveGate.hidden = false;
      saveGate.setAttribute("tabindex", "-1");
      saveGate.focus();
    });
  }

  render();
}

function initializeQuoteCheckPage() {
  const root = document.querySelector("[data-quote-check-page]");
  if (!root) return;

  const workspaceRoot = root.querySelector("[data-document-workspace-root]");
  if (workspaceRoot) {
    initializeDocumentWorkspace(root, workspaceRoot);
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
  const drawingCheckLinks = root.querySelectorAll("[data-drawing-check-link]");
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
      if (
        typeof name !== "string" ||
        !safeHasNonWhitespaceFileName(name) ||
        typeof type !== "string" ||
        type !== "application/pdf"
      ) {
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

  for (let index = 0; index < drawingCheckLinks.length; index += 1) {
    const link = drawingCheckLinks[index];
    link.addEventListener("click", (event) => {
      if (!readDrawingCheckHref(link)) preventUnsafeDrawingNavigation(event);
    });
  }

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
