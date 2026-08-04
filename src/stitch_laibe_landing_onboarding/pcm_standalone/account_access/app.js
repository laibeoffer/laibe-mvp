const safeCreate = Object.create;
const safeDefineProperty = Object.defineProperty;
const safeFreeze = Object.freeze;
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

const EMPTY_ACTIONS = safeCreate(null);
safeDefineProperty(EMPTY_ACTIONS, "length", {
  configurable: false,
  enumerable: false,
  value: 0,
  writable: false,
});
safeDefineProperty(EMPTY_ACTIONS, Symbol.iterator, {
  configurable: false,
  enumerable: false,
  value() {
    return EMPTY_ACTION_ITERATOR;
  },
  writable: false,
});
safeFreeze(EMPTY_ACTIONS);
const MAX_COLLECTION_SLOTS = 64;

function freezeClosedState({
  code,
  title,
  reason,
  nextAction,
  responsibleRole,
  recoveryPath,
}) {
  return Object.freeze({
    code,
    title,
    reason,
    nextAction,
    responsibleRole,
    recoveryPath,
    caseData: null,
    payload: null,
    mutationAllowed: false,
    writeActionsEnabled: false,
    actions: EMPTY_ACTIONS,
  });
}

export const CONTEXT_UNAVAILABLE = freezeClosedState({
  code: "CONTEXT_UNAVAILABLE",
  title: "帳號與契約服務尚未確認",
  reason: "目前沒有可用來確認身分、帳號服務或案件權限的可信情境。",
  nextAction: "閱讀入口說明，或安全返回 PCM 首頁。",
  responsibleRole: "目前使用者",
  recoveryPath: "共用入口 → PCM 首頁",
});

export const INITIAL_VIEW_STATE = CONTEXT_UNAVAILABLE;

export const ACCOUNT_ACCESS_FAILURES = Object.freeze({
  IDENTITY_UNCONFIRMED: freezeClosedState({
    code: "IDENTITY_UNCONFIRMED",
    title: "身分無法確認",
    reason: "目前無法確認使用者是不是帳號本人。",
    nextAction: "重新確認使用的 Email 與正式通知是否一致。",
    responsibleRole: "目前使用者",
    recoveryPath: "回到共用入口重新確認；仍無法處理時，安全返回 PCM 首頁。",
  }),
  MEMBERSHIP_UNCONFIRMED: freezeClosedState({
    code: "MEMBERSHIP_UNCONFIRMED",
    title: "案件成員無法確認",
    reason: "帳號目前無法證明是該案件的成員。",
    nextAction: "確認登入帳號與案件邀請使用的是同一個 Email。",
    responsibleRole: "目前使用者",
    recoveryPath: "回到共用入口等待案件成員確認；案件仍不顯示時，安全返回 PCM 首頁。",
  }),
  VENDOR_INVITATION_DECLINED: freezeClosedState({
    code: "VENDOR_INVITATION_DECLINED",
    title: "邀請已拒絕",
    reason: "乙方已婉拒這次案件邀請。",
    nextAction: "甲方決定是否改邀其他乙方，或先保留目前安排。",
    responsibleRole: "甲方",
    recoveryPath: "乙方目前不需處理；甲方待案件服務開放後重新安排，或安全返回 PCM 首頁。",
  }),
  VENDOR_INVITATION_EXPIRED: freezeClosedState({
    code: "VENDOR_INVITATION_EXPIRED",
    title: "邀請已逾期",
    reason: "原邀請已超過可使用期間，不能繼續確認。",
    nextAction: "甲方重新確認合作對象與聯絡資料。",
    responsibleRole: "甲方",
    recoveryPath: "正式服務開放後由甲方送出新邀請；現在先安全返回 PCM 首頁。",
  }),
  VENDOR_INVITATION_WITHDRAWN: freezeClosedState({
    code: "VENDOR_INVITATION_WITHDRAWN",
    title: "邀請已撤回",
    reason: "甲方已收回這次案件邀請。",
    nextAction: "乙方不需重複嘗試；由甲方決定是否再次邀請。",
    responsibleRole: "甲方",
    recoveryPath: "等待甲方的新通知；未收到前，安全返回 PCM 首頁。",
  }),
  VENDOR_INVITATION_RESEND_REQUIRED: freezeClosedState({
    code: "VENDOR_INVITATION_RESEND_REQUIRED",
    title: "邀請需要重發",
    reason: "原邀請資料不完整或已不能繼續使用。",
    nextAction: "甲方確認乙方 Email 後，重新送出案件邀請。",
    responsibleRole: "甲方",
    recoveryPath: "乙方等待新邀請；新通知尚未送達前，安全返回 PCM 首頁。",
  }),
  PERMISSION_UNCONFIRMED: freezeClosedState({
    code: "PERMISSION_UNCONFIRMED",
    title: "案件權限無法確認",
    reason: "目前無法確認這個帳號可以查看或處理哪些案件內容。",
    nextAction: "請甲方確認邀請對象與預計開放的案件範圍。",
    responsibleRole: "甲方",
    recoveryPath: "等待甲方完成權限確認；確認前不顯示案件內容，並可安全返回 PCM 首頁。",
  }),
});

const OWNER_GUIDE = Object.freeze({
  key: "owner",
  status: "正在查看甲方流程說明",
  title: "甲方先確認帳號，再另行確認案件建立條件",
  copy: "這項說明不會把目前使用者設為甲方，也不會建立案件。",
  next: "正式開放後：確認帳號情境 → 確認案件建立條件。",
});

const VENDOR_GUIDE = Object.freeze({
  key: "vendor",
  status: "正在查看乙方流程說明",
  title: "乙方先核對邀請，再確認案件成員與權限",
  copy: "這項說明不會把目前使用者設為乙方，也不會顯示受邀案件。",
  next: "正式開放後：核對甲方邀請 → 確認案件成員與權限。",
});

export const ACCOUNT_ACCESS_GUIDES = Object.freeze({
  owner: OWNER_GUIDE,
  vendor: VENDOR_GUIDE,
});

export function resolveAccountAccessState(_input) {
  return CONTEXT_UNAVAILABLE;
}

export function resolveAccountAccessFailure(input) {
  switch (input) {
    case ACCOUNT_ACCESS_FAILURES.IDENTITY_UNCONFIRMED:
    case "IDENTITY_UNCONFIRMED":
      return ACCOUNT_ACCESS_FAILURES.IDENTITY_UNCONFIRMED;
    case ACCOUNT_ACCESS_FAILURES.MEMBERSHIP_UNCONFIRMED:
    case "MEMBERSHIP_UNCONFIRMED":
      return ACCOUNT_ACCESS_FAILURES.MEMBERSHIP_UNCONFIRMED;
    case ACCOUNT_ACCESS_FAILURES.VENDOR_INVITATION_DECLINED:
    case "VENDOR_INVITATION_DECLINED":
      return ACCOUNT_ACCESS_FAILURES.VENDOR_INVITATION_DECLINED;
    case ACCOUNT_ACCESS_FAILURES.VENDOR_INVITATION_EXPIRED:
    case "VENDOR_INVITATION_EXPIRED":
      return ACCOUNT_ACCESS_FAILURES.VENDOR_INVITATION_EXPIRED;
    case ACCOUNT_ACCESS_FAILURES.VENDOR_INVITATION_WITHDRAWN:
    case "VENDOR_INVITATION_WITHDRAWN":
      return ACCOUNT_ACCESS_FAILURES.VENDOR_INVITATION_WITHDRAWN;
    case ACCOUNT_ACCESS_FAILURES.VENDOR_INVITATION_RESEND_REQUIRED:
    case "VENDOR_INVITATION_RESEND_REQUIRED":
      return ACCOUNT_ACCESS_FAILURES.VENDOR_INVITATION_RESEND_REQUIRED;
    case ACCOUNT_ACCESS_FAILURES.PERMISSION_UNCONFIRMED:
    case "PERMISSION_UNCONFIRMED":
      return ACCOUNT_ACCESS_FAILURES.PERMISSION_UNCONFIRMED;
    default:
      return CONTEXT_UNAVAILABLE;
  }
}

export function resolveAccountGuide(input) {
  switch (input) {
    case OWNER_GUIDE:
    case "owner":
      return OWNER_GUIDE;
    case VENDOR_GUIDE:
    case "vendor":
      return VENDOR_GUIDE;
    default:
      return null;
  }
}

function safeQuery(root, selector) {
  try {
    if (!root || typeof root.querySelector !== "function") return null;
    return root.querySelector(selector);
  } catch {
    return null;
  }
}

function safeQueryAll(root, selector) {
  try {
    if (!root || typeof root.querySelectorAll !== "function") return null;
    return root.querySelectorAll(selector);
  } catch {
    return null;
  }
}

function forEachNode(nodes, operation) {
  if (!nodes) return;

  let length = 0;
  try {
    length = nodes.length;
  } catch {
    length = MAX_COLLECTION_SLOTS;
  }

  if (
    typeof length !== "number" ||
    length < 0 ||
    length !== length ||
    length % 1 !== 0
  ) {
    length = MAX_COLLECTION_SLOTS;
  }

  if (length > MAX_COLLECTION_SLOTS) length = MAX_COLLECTION_SLOTS;

  for (let index = 0; index < length; index += 1) {
    let node = null;
    try {
      node = nodes[index];
    } catch {
      continue;
    }

    if (!node) continue;
    try {
      operation(node);
    } catch {
      continue;
    }
  }
}

function safeSetAttribute(node, name, value) {
  try {
    if (node && typeof node.setAttribute === "function") {
      node.setAttribute(name, value);
    }
  } catch {
    return;
  }
}

function closeWriteControl(control) {
  try {
    if (control) control.disabled = true;
  } catch {
    // Aria state is still reinforced independently below.
  }
  safeSetAttribute(control, "aria-disabled", "true");
}

function captureTrustedWriteControls(root) {
  const controls = safeCreate(null);
  controls.contactName = safeQuery(root, "#contact-name[data-write-action]");
  controls.registrationEmail = safeQuery(root, "#registration-email[data-write-action]");
  controls.registrationPassword = safeQuery(root, "#registration-password[data-write-action]");
  controls.registrationSubmit = safeQuery(
    root,
    '#registration-form > button[type="submit"][data-write-action]',
  );
  controls.loginEmail = safeQuery(root, "#login-email[data-write-action]");
  controls.loginPassword = safeQuery(root, "#login-password[data-write-action]");
  controls.loginSubmit = safeQuery(
    root,
    '#login-form > button[type="submit"][data-write-action]',
  );
  return safeFreeze(controls);
}

function closeTrustedWriteControls(controls) {
  closeWriteControl(controls.contactName);
  closeWriteControl(controls.registrationEmail);
  closeWriteControl(controls.registrationPassword);
  closeWriteControl(controls.registrationSubmit);
  closeWriteControl(controls.loginEmail);
  closeWriteControl(controls.loginPassword);
  closeWriteControl(controls.loginSubmit);
}

function safeSetText(node, value) {
  try {
    if (node) node.textContent = value;
  } catch {
    return;
  }
}

function safeSetHidden(node, hidden) {
  try {
    if (node) node.hidden = hidden;
  } catch {
    return;
  }
}

function safeListen(node, type, listener, options) {
  try {
    if (node && typeof node.addEventListener === "function") {
      node.addEventListener(type, listener, options);
      return true;
    }
  } catch {
    return false;
  }
  return false;
}

function safeGlobalDocument() {
  let owner = globalThis;

  for (let depth = 0; depth < 4 && owner; depth += 1) {
    let descriptor = null;
    try {
      descriptor = Object.getOwnPropertyDescriptor(owner, "document");
    } catch {
      return null;
    }

    if (descriptor) {
      try {
        if ("value" in descriptor) return descriptor.value ?? null;
        if (typeof descriptor.get !== "function") return null;
        return descriptor.get.call(globalThis) ?? null;
      } catch {
        return null;
      }
    }

    try {
      owner = Object.getPrototypeOf(owner);
    } catch {
      return null;
    }
  }

  return null;
}

function enforceClosed(root, capturedWriteControls) {
  const trustedWriteControls = capturedWriteControls === undefined
    ? captureTrustedWriteControls(root)
    : capturedWriteControls;

  try {
    safeSetAttribute(root?.body, "data-view-state", CONTEXT_UNAVAILABLE.code);
  } catch {
    // Static HTML already carries the closed state.
  }

  try {
    if (root?.documentElement?.dataset) {
      root.documentElement.dataset.viewState = CONTEXT_UNAVAILABLE.code;
    }
  } catch {
    // Static HTML already carries the closed state.
  }

  closeTrustedWriteControls(trustedWriteControls);
  const writeControls = safeQueryAll(root, "[data-write-action]");
  forEachNode(writeControls, closeWriteControl);
  closeTrustedWriteControls(trustedWriteControls);
}

function runClosedInteraction(root, trustedWriteControls, operation) {
  try {
    closeTrustedWriteControls(trustedWriteControls);
    operation();
  } catch {
    // The closed product state is re-established below with captured identities.
  } finally {
    enforceClosed(root, trustedWriteControls);
  }
}

function updateMode(root, mode) {
  if (mode !== "registration" && mode !== "login") return;

  const registrationForm = safeQuery(root, '[data-access-form="registration"]');
  const loginForm = safeQuery(root, '[data-access-form="login"]');
  const registrationButton = safeQuery(root, '[data-mode-control="registration"]');
  const loginButton = safeQuery(root, '[data-mode-control="login"]');
  const note = safeQuery(root, "[data-account-mode-note]");

  safeSetHidden(registrationForm, mode !== "registration");
  safeSetHidden(loginForm, mode !== "login");
  safeSetAttribute(registrationButton, "aria-selected", mode === "registration" ? "true" : "false");
  safeSetAttribute(loginButton, "aria-selected", mode === "login" ? "true" : "false");
  safeSetText(
    note,
    mode === "registration"
      ? "正式開放後才會提供完整註冊入口；目前不會送出或保存帳號資料。"
      : "正式開放後才會處理登入與身分確認；目前不會送出或保存帳號資料。",
  );

  try {
    if (root?.documentElement?.dataset) {
      root.documentElement.dataset.accountMode = mode;
    }
  } catch {
    return;
  }
}

function updateGuide(root, guide) {
  const resolvedGuide = resolveAccountGuide(guide);
  if (!resolvedGuide) return;

  const ownerButton = safeQuery(root, '[data-role-guide="owner"]');
  const vendorButton = safeQuery(root, '[data-role-guide="vendor"]');
  safeSetAttribute(ownerButton, "aria-pressed", resolvedGuide === OWNER_GUIDE ? "true" : "false");
  safeSetAttribute(vendorButton, "aria-pressed", resolvedGuide === VENDOR_GUIDE ? "true" : "false");
  safeSetText(safeQuery(root, "[data-guide-status]"), resolvedGuide.status);
  safeSetText(safeQuery(root, "[data-guide-title]"), resolvedGuide.title);
  safeSetText(safeQuery(root, "[data-guide-copy]"), resolvedGuide.copy);
  safeSetText(safeQuery(root, "[data-guide-next]"), resolvedGuide.next);

  try {
    if (root?.documentElement?.dataset) {
      root.documentElement.dataset.guideView = resolvedGuide.key;
    }
  } catch {
    return;
  }
}

function preventClosedSubmission(root, event) {
  try {
    event?.preventDefault?.();
  } catch {
    // Submission stays unavailable through native disabled controls.
  }
  safeSetText(
    safeQuery(root, "[data-account-live]"),
    "帳號服務尚未開放；目前沒有送出或保存任何資料。",
  );
}

let initializedRoot = null;

export function initializeAccountAccess(root) {
  const resolvedRoot = root === undefined ? safeGlobalDocument() : root;
  const trustedWriteControls = captureTrustedWriteControls(resolvedRoot);
  enforceClosed(resolvedRoot, trustedWriteControls);
  if (!resolvedRoot || resolvedRoot === initializedRoot) return CONTEXT_UNAVAILABLE;
  initializedRoot = resolvedRoot;

  const registrationButton = safeQuery(resolvedRoot, '[data-mode-control="registration"]');
  const loginButton = safeQuery(resolvedRoot, '[data-mode-control="login"]');
  const ownerButton = safeQuery(resolvedRoot, '[data-role-guide="owner"]');
  const vendorButton = safeQuery(resolvedRoot, '[data-role-guide="vendor"]');
  const registrationForm = safeQuery(resolvedRoot, '[data-access-form="registration"]');
  const loginForm = safeQuery(resolvedRoot, '[data-access-form="login"]');

  safeListen(registrationButton, "click", () => runClosedInteraction(
    resolvedRoot,
    trustedWriteControls,
    () => updateMode(resolvedRoot, "registration"),
  ));
  safeListen(loginButton, "click", () => runClosedInteraction(
    resolvedRoot,
    trustedWriteControls,
    () => updateMode(resolvedRoot, "login"),
  ));
  safeListen(ownerButton, "click", () => runClosedInteraction(
    resolvedRoot,
    trustedWriteControls,
    () => updateGuide(resolvedRoot, OWNER_GUIDE),
  ));
  safeListen(vendorButton, "click", () => runClosedInteraction(
    resolvedRoot,
    trustedWriteControls,
    () => updateGuide(resolvedRoot, VENDOR_GUIDE),
  ));
  safeListen(registrationForm, "submit", (event) => runClosedInteraction(
    resolvedRoot,
    trustedWriteControls,
    () => preventClosedSubmission(resolvedRoot, event),
  ));
  safeListen(loginForm, "submit", (event) => runClosedInteraction(
    resolvedRoot,
    trustedWriteControls,
    () => preventClosedSubmission(resolvedRoot, event),
  ));

  updateMode(resolvedRoot, "registration");
  enforceClosed(resolvedRoot, trustedWriteControls);
  return CONTEXT_UNAVAILABLE;
}

function autoInitializeAccountAccess() {
  const root = safeGlobalDocument();
  if (!root) return CONTEXT_UNAVAILABLE;

  try {
    if (root.readyState === "loading") {
      safeListen(root, "DOMContentLoaded", () => initializeAccountAccess(root), { once: true });
      return CONTEXT_UNAVAILABLE;
    }
  } catch {
    return CONTEXT_UNAVAILABLE;
  }

  return initializeAccountAccess(root);
}

autoInitializeAccountAccess();
