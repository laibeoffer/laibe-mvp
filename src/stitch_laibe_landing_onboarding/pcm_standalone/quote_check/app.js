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

const CONTEXT_UNAVAILABLE = freezeState({
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
    nextAction: "先查看結果格式；圖說檢討入口開放後，再準備施工圖。",
    returnStep: "RESULT_FORMAT",
    recoveryStep: "RESULT_FORMAT",
    payloadPolicy: "FILE_METADATA_ONLY",
  }),
});

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

function initializeQuoteCheckPage() {
  const root = document.querySelector("[data-quote-check-page]");
  if (!root) return;

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

  for (let index = 0; index < nextControls.length; index += 1) {
    nextControls[index].addEventListener("click", () => {
      moveTo(nextControls[index].dataset.nextStep);
    });
  }

  if (consent && consentContinue) {
    consent.addEventListener("change", () => {
      consentContinue.disabled = !consent.checked;
    });
  }

  for (let index = 0; index < openFileControls.length; index += 1) {
    openFileControls[index].addEventListener("click", () => {
      if (fileInput) {
        fileInput.value = "";
        fileInput.click();
      }
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
      if (currentFailure) moveTo(currentFailure.recoveryStep);
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
