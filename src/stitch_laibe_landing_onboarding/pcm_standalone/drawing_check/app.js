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

function fileSelectionResult(kind, name = null, file = null) {
  const result = safeCreate(null);
  result.kind = kind;
  result.name = name;
  result.file = file;
  return safeFreeze(result);
}

const EMPTY_FILE_SELECTION = fileSelectionResult("EMPTY");
const INVALID_FILE_SELECTION = fileSelectionResult("INVALID");

function freezeState(record) {
  return safeFreeze({
    ...record,
    mutationAllowed: false,
    writeAuthority: "NONE",
    caseData: null,
    actions: NO_ACTIONS,
  });
}

export const CONTEXT_UNAVAILABLE = freezeState({
  code: "CONTEXT_UNAVAILABLE",
  type: "CLOSED",
  title: "目前無法判斷圖說檢討步驟",
  reason: "這個入口沒有可確認的操作狀態，因此不顯示任何案件或檔案內容。",
  nextAction: "返回服務說明，重新依畫面順序開始。",
  responsibleRole: "甲方",
  payloadPolicy: "ZERO_CASE_DATA",
  returnStep: "INTRODUCTION",
  recoveryStep: "INTRODUCTION",
});

export const DRAWING_CHECK_STATES = safeFreeze({
  INTRODUCTION: freezeState({
    code: "INTRODUCTION",
    type: "OPEN",
    title: "先看圖說能替下一步回答什麼",
    reason: "萊比會整理圖說版次、頁面範圍、可讀性與仍需報價或乙方說明的地方。",
    nextAction: "閱讀服務邊界後，進入同意步驟。",
    responsibleRole: "甲方",
    payloadPolicy: "NO_CASE_DATA",
  }),
  CONSENT: freezeState({
    code: "CONSENT",
    type: "OPEN",
    title: "確認本機檢視範圍",
    reason: "本頁會在瀏覽器內暫時讀取 PDF 內容，不會送出或保存。",
    nextAction: "勾選同意後選擇圖說 PDF。",
    responsibleRole: "甲方",
    payloadPolicy: "NO_CASE_DATA",
  }),
  SELECT_FILE: freezeState({
    code: "SELECT_FILE",
    type: "OPEN",
    title: "選擇圖說 PDF",
    reason: "選擇後會先檢查 PDF 內容，再整理頁數、圖面結構與仍需確認之處。",
    nextAction: "從你的裝置選擇一份圖說 PDF。",
    responsibleRole: "甲方",
    payloadPolicy: "LOCAL_FILE_METADATA_ONLY",
  }),
  VALIDATION_PENDING: freezeState({
    code: "VALIDATION_PENDING",
    type: "OPEN",
    title: "正在瀏覽器內整理圖說",
    reason: "正在讀取 PDF 內容並整理可辨識的圖面結構；本次不會保存或建立案件紀錄。",
    nextAction: "等待辨識完成，再查看摘要與待確認事項。",
    responsibleRole: "甲方",
    payloadPolicy: "LOCAL_FILE_METADATA_ONLY",
  }),
  CORRECTION_REQUIRED: freezeState({
    code: "CORRECTION_REQUIRED",
    type: "OPEN",
    title: "先把圖說待確認事項整理清楚",
    reason: "這些項目不是正式檢討結果，只是提醒正式收件前仍需確認的條件。",
    nextAction: "重新選擇檔案，或先查看結果會如何呈現。",
    responsibleRole: "甲方",
    payloadPolicy: "LOCAL_FILE_METADATA_ONLY",
  }),
  RESELECT_FILE: freezeState({
    code: "RESELECT_FILE",
    type: "OPEN",
    title: "重新選擇圖說 PDF",
    reason: "前一份檔案沒有送出或保存；你可以改選另一份 PDF。",
    nextAction: "選擇另一份檔案後，再查看格式確認狀態。",
    responsibleRole: "甲方",
    payloadPolicy: "LOCAL_FILE_METADATA_ONLY",
  }),
  RESULT_FORMAT: freezeState({
    code: "RESULT_FORMAT",
    type: "OPEN",
    title: "查看正式結果的資訊結構",
    reason: "這裡只說明未來圖說檢討結果的欄位，不含真實案件、版次判定或完成結論。",
    nextAction: "確認目前仍沒有正式案件結果，再決定是否重新選擇檔案。",
    responsibleRole: "甲方",
    payloadPolicy: "NO_CASE_DATA",
  }),
  RESULT_UNAVAILABLE: freezeState({
    code: "RESULT_UNAVAILABLE",
    type: "CLOSED",
    title: "尚未產生可保存的圖面辨識摘要",
    reason: "本次只在瀏覽器內整理圖面，尚未完成身分確認、文件送出或案件建立，因此尚未形成正式案件紀錄。",
    nextAction: "可重新選擇圖說 PDF，或先準備配對報價。",
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

export const DRAWING_CHECK_FAILURES = safeFreeze({
  FILE_FORMAT_INVALID: failureState({
    code: "FILE_FORMAT_INVALID",
    reason: "瀏覽器提供的檔案標示讀取失敗或不完整；內容格式仍未驗證。",
    nextAction: "回到檔案選擇，改選瀏覽器標示為 PDF 的施工圖檔。",
    responsibleRole: "甲方",
    payloadPolicy: "ZERO_CASE_DATA",
  }),
  FILE_TOO_LARGE: failureState({
    code: "FILE_TOO_LARGE",
    reason: "這份檔案超出本頁可安全整理的大小，因此沒有讀取圖面內容。",
    nextAction: "請向乙方取得較精簡的原始 PDF，再重新選擇。",
    responsibleRole: "甲方",
  }),
  PAGE_COUNT_INVALID: failureState({
    code: "PAGE_COUNT_INVALID",
    reason: "目前無法解析圖說頁數，也不能判定頁面是否齊全。",
    nextAction: "先向乙方確認圖號或頁面範圍，再重新選擇檔案。",
    responsibleRole: "甲方",
  }),
  FILE_UNREADABLE: failureState({
    code: "FILE_UNREADABLE",
    reason: "這份 PDF 沒有足夠的向量圖面結構可供本頁整理，可能是掃描影像或不支援的內容。",
    nextAction: "請乙方提供由繪圖軟體匯出的向量 PDF，再重新選擇。",
    responsibleRole: "甲方",
  }),
  FILE_CORRUPTED: failureState({
    code: "FILE_CORRUPTED",
    reason: "檔案若無法正常開啟，就不能進入後續書面檢討。",
    nextAction: "請乙方重新匯出可正常開啟的 PDF，再重新選擇。",
    responsibleRole: "乙方",
  }),
  FILE_ENCRYPTED: failureState({
    code: "FILE_ENCRYPTED",
    reason: "這份 PDF 需要密碼或受到內容保護，本頁不會嘗試解除限制。",
    nextAction: "請乙方提供可正常開啟且允許檢視的 PDF，再重新選擇。",
    responsibleRole: "乙方",
  }),
  ACTIVE_CONTENT_UNSUPPORTED: failureState({
    code: "ACTIVE_CONTENT_UNSUPPORTED",
    reason: "這份 PDF 已確認含有主動內容或外部動作，為保護本次檢視，本頁已停止處理。",
    nextAction: "請乙方重新匯出不含主動內容或外部動作的靜態 PDF，再重新選擇。",
    responsibleRole: "乙方",
  }),
  SECURITY_INSPECTION_UNAVAILABLE: failureState({
    code: "SECURITY_INSPECTION_UNAVAILABLE",
    reason: "瀏覽器目前無法完成這份 PDF 的安全檢查，因此不能判斷是否適合繼續讀取。",
    nextAction: "請重新選擇原始 PDF；若仍無法檢查，請乙方重新匯出靜態 PDF。",
    responsibleRole: "甲方",
  }),
  FILE_READ_FAILED: failureState({
    code: "FILE_READ_FAILED",
    reason: "瀏覽器目前無法安全讀取這份檔案，因此沒有產生任何辨識摘要。",
    nextAction: "重新選擇原始 PDF；若仍無法讀取，請乙方重新匯出。",
  }),
  DUPLICATE_SUBMISSION: failureState({
    code: "DUPLICATE_SUBMISSION",
    reason: "正式收件時若同一版圖說重複出現，必須先確認要採用哪一份。",
    nextAction: "保留一份明確版本，其他重複檔案先不要送出。",
    responsibleRole: "甲方",
    payloadPolicy: "SUBMISSION_REFERENCE_ONLY",
  }),
  VERSION_CONFLICT: failureState({
    code: "VERSION_CONFLICT",
    reason: "檔名、圖框或提供者若指向不同版次，就無法確認檢討依據。",
    nextAction: "請乙方確認唯一有效版次，再重新選擇。",
    responsibleRole: "乙方",
    payloadPolicy: "VERSION_REFERENCE_ONLY",
  }),
  DRAWING_ONLY_QUOTE_MISSING: failureState({
    code: "DRAWING_ONLY_QUOTE_MISSING",
    reason: "目前只有圖說，尚缺報價，不能把圖面範圍與報價項目放在同一個基準下核對。",
    nextAction: "先查看結果格式，再前往報價健檢準備乙方報價 PDF。",
    responsibleRole: "甲方",
    returnStep: "RESULT_FORMAT",
    recoveryStep: "RESULT_FORMAT",
    payloadPolicy: "ZERO_CASE_DATA",
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
HERO_ACTIONS.INTRODUCTION = createHeroAction(
  "開始圖說檢討準備",
  true,
  "CONSENT",
);
HERO_ACTIONS.CONSENT = createHeroAction("請先同意本機檢視", false);
HERO_ACTIONS.SELECT_FILE = createHeroAction(
  "選擇圖說 PDF",
  true,
  "OPEN_FILE",
);
HERO_ACTIONS.VALIDATION_PENDING = createHeroAction(
  "查看待確認清單",
  true,
  "CORRECTION_REQUIRED",
);
HERO_ACTIONS.CORRECTION_REQUIRED = createHeroAction(
  "重新選擇圖說 PDF",
  true,
  "RESELECT_FILE",
);
HERO_ACTIONS.RESELECT_FILE = createHeroAction(
  "選擇另一份 PDF",
  true,
  "OPEN_FILE",
);
HERO_ACTIONS.RESULT_FORMAT = createHeroAction(
  "查看目前結果狀態",
  true,
  "RESULT_UNAVAILABLE",
);
HERO_ACTIONS.RESULT_UNAVAILABLE = createHeroAction(
  "重新選擇圖說 PDF",
  true,
  "SELECT_FILE",
);
HERO_ACTIONS.FILE_FORMAT_INVALID = createHeroAction(
  "依建議恢復",
  true,
  "RESELECT_FILE",
);
HERO_ACTIONS.FILE_TOO_LARGE = HERO_ACTIONS.FILE_FORMAT_INVALID;
HERO_ACTIONS.PAGE_COUNT_INVALID = HERO_ACTIONS.FILE_FORMAT_INVALID;
HERO_ACTIONS.FILE_UNREADABLE = HERO_ACTIONS.FILE_FORMAT_INVALID;
HERO_ACTIONS.FILE_CORRUPTED = HERO_ACTIONS.FILE_FORMAT_INVALID;
HERO_ACTIONS.FILE_ENCRYPTED = HERO_ACTIONS.FILE_FORMAT_INVALID;
HERO_ACTIONS.ACTIVE_CONTENT_UNSUPPORTED = HERO_ACTIONS.FILE_FORMAT_INVALID;
HERO_ACTIONS.SECURITY_INSPECTION_UNAVAILABLE = HERO_ACTIONS.FILE_FORMAT_INVALID;
HERO_ACTIONS.FILE_READ_FAILED = HERO_ACTIONS.FILE_FORMAT_INVALID;
HERO_ACTIONS.DUPLICATE_SUBMISSION = HERO_ACTIONS.FILE_FORMAT_INVALID;
HERO_ACTIONS.VERSION_CONFLICT = HERO_ACTIONS.FILE_FORMAT_INVALID;
HERO_ACTIONS.DRAWING_ONLY_QUOTE_MISSING = createHeroAction(
  "查看結果格式與報價準備路徑",
  true,
  "RESULT_FORMAT",
);
safeFreeze(HERO_ACTIONS);
const NO_HERO_ACTION = createHeroAction("目前沒有可執行的下一步", false);

export function projectDrawingCheckHeroAction(state) {
  if (state === DRAWING_CHECK_STATES.INTRODUCTION) return HERO_ACTIONS.INTRODUCTION;
  if (state === DRAWING_CHECK_STATES.CONSENT) return HERO_ACTIONS.CONSENT;
  if (state === DRAWING_CHECK_STATES.SELECT_FILE) return HERO_ACTIONS.SELECT_FILE;
  if (state === DRAWING_CHECK_STATES.VALIDATION_PENDING) {
    return HERO_ACTIONS.VALIDATION_PENDING;
  }
  if (state === DRAWING_CHECK_STATES.CORRECTION_REQUIRED) {
    return HERO_ACTIONS.CORRECTION_REQUIRED;
  }
  if (state === DRAWING_CHECK_STATES.RESELECT_FILE) return HERO_ACTIONS.RESELECT_FILE;
  if (state === DRAWING_CHECK_STATES.RESULT_FORMAT) return HERO_ACTIONS.RESULT_FORMAT;
  if (state === DRAWING_CHECK_STATES.RESULT_UNAVAILABLE) {
    return HERO_ACTIONS.RESULT_UNAVAILABLE;
  }
  if (state === DRAWING_CHECK_FAILURES.FILE_FORMAT_INVALID) {
    return HERO_ACTIONS.FILE_FORMAT_INVALID;
  }
  if (state === DRAWING_CHECK_FAILURES.FILE_TOO_LARGE) {
    return HERO_ACTIONS.FILE_TOO_LARGE;
  }
  if (state === DRAWING_CHECK_FAILURES.PAGE_COUNT_INVALID) {
    return HERO_ACTIONS.PAGE_COUNT_INVALID;
  }
  if (state === DRAWING_CHECK_FAILURES.FILE_UNREADABLE) {
    return HERO_ACTIONS.FILE_UNREADABLE;
  }
  if (state === DRAWING_CHECK_FAILURES.FILE_CORRUPTED) {
    return HERO_ACTIONS.FILE_CORRUPTED;
  }
  if (state === DRAWING_CHECK_FAILURES.FILE_ENCRYPTED) {
    return HERO_ACTIONS.FILE_ENCRYPTED;
  }
  if (state === DRAWING_CHECK_FAILURES.ACTIVE_CONTENT_UNSUPPORTED) {
    return HERO_ACTIONS.ACTIVE_CONTENT_UNSUPPORTED;
  }
  if (state === DRAWING_CHECK_FAILURES.SECURITY_INSPECTION_UNAVAILABLE) {
    return HERO_ACTIONS.SECURITY_INSPECTION_UNAVAILABLE;
  }
  if (state === DRAWING_CHECK_FAILURES.FILE_READ_FAILED) {
    return HERO_ACTIONS.FILE_READ_FAILED;
  }
  if (state === DRAWING_CHECK_FAILURES.DUPLICATE_SUBMISSION) {
    return HERO_ACTIONS.DUPLICATE_SUBMISSION;
  }
  if (state === DRAWING_CHECK_FAILURES.VERSION_CONFLICT) {
    return HERO_ACTIONS.VERSION_CONFLICT;
  }
  if (state === DRAWING_CHECK_FAILURES.DRAWING_ONLY_QUOTE_MISSING) {
    return HERO_ACTIONS.DRAWING_ONLY_QUOTE_MISSING;
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
    case "INTRODUCTION": return DRAWING_CHECK_STATES.INTRODUCTION;
    case "CONSENT": return DRAWING_CHECK_STATES.CONSENT;
    case "SELECT_FILE": return DRAWING_CHECK_STATES.SELECT_FILE;
    case "VALIDATION_PENDING": return DRAWING_CHECK_STATES.VALIDATION_PENDING;
    case "CORRECTION_REQUIRED": return DRAWING_CHECK_STATES.CORRECTION_REQUIRED;
    case "RESELECT_FILE": return DRAWING_CHECK_STATES.RESELECT_FILE;
    case "RESULT_FORMAT": return DRAWING_CHECK_STATES.RESULT_FORMAT;
    case "RESULT_UNAVAILABLE": return DRAWING_CHECK_STATES.RESULT_UNAVAILABLE;
    default: return CONTEXT_UNAVAILABLE;
  }
}

function failureForCode(code) {
  switch (code) {
    case "FILE_FORMAT_INVALID": return DRAWING_CHECK_FAILURES.FILE_FORMAT_INVALID;
    case "FILE_TOO_LARGE": return DRAWING_CHECK_FAILURES.FILE_TOO_LARGE;
    case "PAGE_COUNT_INVALID": return DRAWING_CHECK_FAILURES.PAGE_COUNT_INVALID;
    case "FILE_UNREADABLE": return DRAWING_CHECK_FAILURES.FILE_UNREADABLE;
    case "FILE_CORRUPTED": return DRAWING_CHECK_FAILURES.FILE_CORRUPTED;
    case "FILE_ENCRYPTED": return DRAWING_CHECK_FAILURES.FILE_ENCRYPTED;
    case "ACTIVE_CONTENT_UNSUPPORTED": {
      return DRAWING_CHECK_FAILURES.ACTIVE_CONTENT_UNSUPPORTED;
    }
    case "SECURITY_INSPECTION_UNAVAILABLE": {
      return DRAWING_CHECK_FAILURES.SECURITY_INSPECTION_UNAVAILABLE;
    }
    case "FILE_READ_FAILED": return DRAWING_CHECK_FAILURES.FILE_READ_FAILED;
    case "DUPLICATE_SUBMISSION": return DRAWING_CHECK_FAILURES.DUPLICATE_SUBMISSION;
    case "VERSION_CONFLICT": return DRAWING_CHECK_FAILURES.VERSION_CONFLICT;
    case "DRAWING_ONLY_QUOTE_MISSING": {
      return DRAWING_CHECK_FAILURES.DRAWING_ONLY_QUOTE_MISSING;
    }
    default: return CONTEXT_UNAVAILABLE;
  }
}

export function resolveDrawingCheckState(input) {
  try {
    const context = readStrictContext(input);
    if (!context) return CONTEXT_UNAVAILABLE;
    if (context.step === "FAILURE") return failureForCode(context.failureCode);
    return stateForCode(context.step);
  } catch {
    return CONTEXT_UNAVAILABLE;
  }
}

const browserRecognitionAdapterUrl = new URL(
  "../../../../site/preview_floor_plan/browser-recognition-adapter.mjs",
  import.meta.url,
).href;

async function recognizeSelectedDrawingFile(file) {
  const adapter = await import(browserRecognitionAdapterUrl);
  return adapter.recognizeDrawingFile(file);
}

export function initializeDrawingCheckPage(options = {}) {
  const root = document.querySelector("[data-drawing-check-page]");
  if (!root) return;
  const recognizeFile = typeof options.recognizeFile === "function"
    ? options.recognizeFile
    : recognizeSelectedDrawingFile;

  const panels = root.querySelectorAll("[data-flow-panel]");
  const railItems = root.querySelectorAll("[data-flow-step]");
  const nextControls = root.querySelectorAll("[data-next-step]");
  const fileInput = root.querySelector("#drawing-file");
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
  const heroStart = root.querySelector("[data-hero-start]");
  const openFileControls = root.querySelectorAll("[data-open-file]");
  const recognitionOutput = root.querySelector("[data-recognition-output]");
  const recognitionKicker = root.querySelector("[data-recognition-kicker]");
  const recognitionTitle = root.querySelector("[data-recognition-title]");
  const recognitionMessage = root.querySelector("[data-recognition-message]");
  const recognitionContent = root.querySelector("[data-recognition-content]");
  const recognitionSize = root.querySelector("[data-recognition-size]");
  const recognitionPages = root.querySelector("[data-recognition-pages]");
  const recognitionObjects = root.querySelector("[data-recognition-objects]");
  const recognitionUncertainty = root.querySelector("[data-recognition-uncertainty]");
  const recognitionCounts = root.querySelector("[data-recognition-counts]");
  const recognitionItems = root.querySelector("[data-recognition-items]");
  const correctionRecognitionItems = root.querySelector("[data-correction-recognition-items]");
  const recognitionReference = root.querySelector("[data-recognition-reference]");
  const recognitionReferenceWrap = root.querySelector("[data-recognition-reference-wrap]");
  const recognitionReferenceCaption = root.querySelector("[data-recognition-reference-caption]");
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
  let recognitionSequence = 0;
  let latestRecognitionItemsText = "尚未完成本次辨識";

  function stepIndex(step) {
    for (let index = 0; index < stepOrder.length; index += 1) {
      if (stepOrder[index] === step) return index;
    }
    return -1;
  }

  function focusPanel(panel) {
    try {
      const focusTarget = panel && (
        panel.querySelector("[data-panel-focus]") ||
        panel.querySelector("[data-primary-operation]")
      );
      if (!focusTarget || typeof focusTarget.focus !== "function") return;
      try {
        focusTarget.focus({ preventScroll: true });
      } catch {
        focusTarget.focus();
      }
    } catch {
      // Keep the current state closed if surrounding document focus changed.
    }
  }

  function clearFileSelection() {
    recognitionSequence += 1;
    try {
      if (fileInput) fileInput.value = "";
    } catch {
      // A hostile input cannot preserve display authority.
    }
    for (let index = 0; index < fileNameTargets.length; index += 1) {
      try {
        fileNameTargets[index].textContent = "尚未選擇";
      } catch {
        // Continue clearing every remaining product label.
      }
    }
    renderRecognitionStatus("idle");
  }

  function setText(target, value) {
    if (target) target.textContent = value;
  }

  function setRecognitionState(value) {
    try {
      if (recognitionOutput) recognitionOutput.dataset.recognitionState = value;
      if (root.dataset) root.dataset.recognitionState = value;
    } catch {
      // Visible product state remains fail-closed if the document changes.
    }
  }

  function clearRecognitionReference() {
    try {
      if (recognitionReference) {
        recognitionReference.removeAttribute("src");
        recognitionReference.hidden = true;
      }
      if (recognitionReferenceWrap) recognitionReferenceWrap.hidden = true;
      setText(recognitionReferenceCaption, "來源頁預覽");
    } catch {
      // A reference preview never receives authority over the review status.
    }
  }

  function renderRecognitionReference(result) {
    clearRecognitionReference();
    const reference = result && result.presentationReference;
    const sourcePage = result && result.sourcePage;
    if (
      !reference ||
      reference.available !== true ||
      typeof reference.dataUrl !== "string" ||
      !reference.dataUrl.startsWith("data:image/png;base64,")
    ) return;
    try {
      recognitionReference.src = reference.dataUrl;
      recognitionReference.hidden = false;
      if (recognitionReferenceWrap) recognitionReferenceWrap.hidden = false;
      setText(
        recognitionReferenceCaption,
        `${sourcePage && sourcePage.label ? sourcePage.label : "來源頁"}預覽；僅供本次人工核對。`,
      );
    } catch {
      clearRecognitionReference();
    }
  }

  function renderRecognitionStatus(status, result = null) {
    setRecognitionState(status);
    if (status === "processing") {
      setText(recognitionKicker, "正在整理");
      setText(recognitionTitle, "正在讀取 PDF 圖面結構");
      setText(recognitionMessage, "請稍候；完成前不會形成任何圖說、尺寸或案件結論。");
      setText(recognitionContent, "正在檢查 PDF 內容");
      setText(recognitionSize, "正在確認");
      setText(recognitionPages, "正在確認");
      setText(recognitionObjects, "正在整理");
      setText(recognitionCounts, "辨識完成後顯示");
      setText(recognitionUncertainty, "辨識完成後顯示");
      setText(recognitionItems, "辨識完成後顯示");
      setText(correctionRecognitionItems, "辨識完成後顯示");
      clearRecognitionReference();
      return;
    }
    if (status === "partial") {
      const summary = result && result.summary;
      const file = result && result.file;
      const sourcePage = result && result.sourcePage;
      const classificationCounts = Array.isArray(result && result.classificationCounts)
        ? result.classificationCounts
        : [];
      const uncertaintyItems = Array.isArray(result && result.uncertainty)
        ? result.uncertainty
        : [];
      const pageCount = Number(summary && summary.pageCount);
      const objectCount = Number(summary && summary.objectCount);
      const unresolvedCount = Number(summary && summary.unresolvedCount);
      const byteLength = Number(file && file.byteLength);
      setText(recognitionKicker, "已整理，仍需確認");
      setText(
        recognitionTitle,
        "已找到圖面結構，仍有待確認內容",
      );
      setText(
        recognitionMessage,
        "這是本次瀏覽器內辨識摘要，不是正式圖面、尺寸確認或案件紀錄。",
      );
      setText(recognitionContent, "部分內容可辨識；目前僅供本機人工檢視");
      setText(
        recognitionSize,
        Number.isFinite(byteLength) ? `${(byteLength / 1024 / 1024).toFixed(1)} MB（本次讀取）` : "已讀取",
      );
      setText(
        recognitionPages,
        sourcePage && sourcePage.label
          ? `${pageCount} 頁；本次整理${sourcePage.label}`
          : "來源頁仍需確認",
      );
      setText(recognitionObjects, objectCount >= 0 ? `找到 ${objectCount} 個候選結構` : "仍需確認");
      setText(
        recognitionCounts,
        classificationCounts.length > 0
          ? classificationCounts.map((row) => `${row.label} ${row.count} 項`).join("、")
          : "尚未形成可顯示的分類摘要",
      );
      setText(
        recognitionUncertainty,
        unresolvedCount > 0 ? `${unresolvedCount} 項仍需人工確認` : "目前沒有列出重要待確認項目，仍需人工核對",
      );
      latestRecognitionItemsText = uncertaintyItems.length > 0
        ? uncertaintyItems.map((item, index) =>
          `${index + 1}. ${item.reason} ${item.nextAction}`).join(" ")
        : "目前沒有列出重要待確認項目；正式採用前仍須由甲方回看原始圖說。";
      setText(recognitionItems, latestRecognitionItemsText);
      setText(correctionRecognitionItems, latestRecognitionItemsText);
      renderRecognitionReference(result);
      const title = "圖面部分可辨識，請查看待確認事項";
      const next = "查看待確認清單；需要時可重新選擇原始 PDF。";
      for (let index = 0; index < statusTargets.length; index += 1) {
        statusTargets[index].textContent = title;
      }
      for (let index = 0; index < nextTargets.length; index += 1) {
        nextTargets[index].textContent = next;
      }
      if (liveTarget) liveTarget.textContent = `目前狀態：${title}。下一步：${next}`;
      return;
    }
    setText(recognitionKicker, "尚未開始");
    setText(recognitionTitle, "選擇 PDF 後顯示辨識狀態");
    setText(recognitionMessage, "檔案只在瀏覽器內暫時讀取，不會送出或保存。");
    setText(recognitionContent, "尚未選擇");
    setText(recognitionSize, "尚未選擇");
    setText(recognitionPages, "尚未選擇");
    setText(recognitionObjects, "尚未選擇");
    setText(recognitionCounts, "尚未選擇");
    setText(recognitionUncertainty, "尚未選擇");
    setText(recognitionItems, "尚未選擇");
    latestRecognitionItemsText = "尚未完成本次辨識";
    setText(correctionRecognitionItems, latestRecognitionItemsText);
    clearRecognitionReference();
  }

  function failureCodeForRecognition(result) {
    switch (result && result.reason) {
      case "oversize": return "FILE_TOO_LARGE";
      case "encrypted": return "FILE_ENCRYPTED";
      case "active_content": return "ACTIVE_CONTENT_UNSUPPORTED";
      case "security_inspection_unavailable": {
        return "SECURITY_INSPECTION_UNAVAILABLE";
      }
      case "scanned_or_non_vector": return "FILE_UNREADABLE";
      case "corrupt": return "FILE_CORRUPTED";
      default: return "FILE_READ_FAILED";
    }
  }

  async function runRecognition(file, token) {
    let result;
    try {
      result = await recognizeFile(file);
    } catch {
      result = { status: "error", reason: "read_failed" };
    }
    if (token !== recognitionSequence) return;
    if (result.status === "partial") {
      renderRecognitionStatus("partial", result);
      return;
    }
    setRecognitionState(result.status === "unsupported" ? "unsupported" : "error");
    showFailure(failureCodeForRecognition(result));
  }

  function renderHeroAction(action) {
    currentHeroAction = action;
    if (!heroStart) return;
    try {
      delete heroStart.dataset.nextStep;
      delete heroStart.dataset.heroTarget;
      heroStart.textContent = action.label;
      heroStart.disabled = !action.enabled;
      heroStart.setAttribute("aria-disabled", action.enabled ? "false" : "true");
      if (action.enabled && action.target) {
        heroStart.dataset.heroTarget = action.target;
      }
    } catch {
      currentHeroAction = NO_HERO_ACTION;
      try {
        heroStart.disabled = true;
        heroStart.setAttribute("aria-disabled", "true");
        delete heroStart.dataset.heroTarget;
      } catch {
        // No caller-controlled target is consulted by the click handler.
      }
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
    if (liveTarget) {
      liveTarget.textContent = `目前狀態：${state.title}。下一步：${state.nextAction}`;
    }
    renderHeroAction(projectDrawingCheckHeroAction(state));
    if (shouldFocus) focusPanel(activePanel);
  }

  function moveTo(step) {
    currentFailure = null;
    if (step === "SELECT_FILE" || step === "RESELECT_FILE") clearFileSelection();
    renderState(resolveDrawingCheckState({ step }), step, true);
  }

  function showFailure(code) {
    currentFailure = resolveDrawingCheckState({
      step: "FAILURE",
      failureCode: code,
    });
    if (failureTitle) failureTitle.textContent = currentFailure.title;
    if (failureReason) failureReason.textContent = currentFailure.reason;
    if (failureNext) failureNext.textContent = currentFailure.nextAction;
    if (failureRole) failureRole.textContent = currentFailure.responsibleRole;
    renderState(currentFailure, "FAILURE", true);
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
      if (!trustedFileListLengthGetter || !trustedFileListItem) {
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

      return fileSelectionResult("PDF_METADATA", name, file);
    } catch {
      return INVALID_FILE_SELECTION;
    }
  }

  function showFileSelectionFailure() {
    clearFileSelection();
    try {
      showFailure("FILE_FORMAT_INVALID");
    } catch {
      currentFailure = DRAWING_CHECK_FAILURES.FILE_FORMAT_INVALID;
      try {
        renderState(currentFailure, "FAILURE", true);
      } catch {
        // Keep the file event boundary closed if the document changed.
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
      case "RESELECT_FILE":
      case "RESULT_FORMAT":
      case "RESULT_UNAVAILABLE":
        moveTo(action.target);
        return;
      case "CORRECTION_REQUIRED":
        setText(correctionRecognitionItems, latestRecognitionItemsText);
        moveTo(action.target);
        return;
      case "OPEN_FILE":
        openFilePicker();
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
        renderRecognitionStatus("processing");
        recognitionSequence += 1;
        const token = recognitionSequence;
        void runRecognition(selection.file, token);
      } catch {
        showFileSelectionFailure();
      }
    });
  }

  if (failureRecover) {
    failureRecover.addEventListener("click", () => {
      if (currentFailure) moveTo(currentFailure.recoveryStep);
    });
  }

  if (failureReturn) {
    failureReturn.addEventListener("click", () => {
      if (currentFailure) moveTo(currentFailure.returnStep);
    });
  }

  renderState(resolveDrawingCheckState({ step: "INTRODUCTION" }));
}

if (typeof document !== "undefined") {
  initializeDrawingCheckPage();
}
