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

const NO_ACTIONS = freezeList();

function invitationState({
  code,
  title,
  reason,
  nextAction,
  responsible,
  returnPath,
  recovery,
  protectedRouteAllowed = false,
}) {
  return freezeRecord([
    ["code", code],
    ["title", title],
    ["reason", reason],
    ["nextAction", nextAction],
    ["responsible", responsible],
    ["returnPath", returnPath],
    ["recovery", recovery],
    ["payloadPolicy", "ZERO_CASE_DATA"],
    ["caseData", null],
    ["payload", null],
    ["mutationAllowed", false],
    ["writeActionsEnabled", false],
    ["protectedRouteAllowed", protectedRouteAllowed],
    ["actions", NO_ACTIONS],
  ]);
}

const INVITATION_PENDING = invitationState({
  code: "INVITATION_PENDING",
  title: "邀請等待乙方回覆",
  reason: "甲方已提出案件邀請，乙方尚未完成回覆。",
  nextAction: "乙方先從共用帳號入口確認身分，再閱讀邀請內容。",
  responsible: "受邀乙方",
  returnPath: "共用帳號入口",
  recovery: "確認帳號與通知一致後，由原邀請入口重新進入。",
});

const DECLINED = invitationState({
  code: "DECLINED",
  title: "邀請已被婉拒",
  reason: "乙方已拒絕這次案件邀請，原邀請不能再接受。",
  nextAction: "甲方決定是否改邀其他乙方，或建立全新的邀請。",
  responsible: "甲方",
  returnPath: "共用帳號入口或 PCM 首頁",
  recovery: "若雙方重新確認合作，由甲方使用新的邀請識別重新邀請。",
});

const EXPIRED = invitationState({
  code: "EXPIRED",
  title: "邀請已逾期",
  reason: "原邀請已超過可回覆期間，不能用原入口繼續接受。",
  nextAction: "甲方重新確認合作對象與聯絡資料。",
  responsible: "甲方",
  returnPath: "共用帳號入口或 PCM 首頁",
  recovery: "由甲方建立新的邀請識別後，再通知乙方重新進入。",
});

const WITHDRAWN = invitationState({
  code: "WITHDRAWN",
  title: "邀請已由甲方撤回",
  reason: "甲方已收回這次案件邀請，原邀請不再有效。",
  nextAction: "乙方不需重複嘗試；由甲方決定後續安排。",
  responsible: "甲方",
  returnPath: "共用帳號入口或 PCM 首頁",
  recovery: "若要再次合作，甲方必須建立新的邀請識別。",
});

const RESENT_PENDING = invitationState({
  code: "RESENT_PENDING",
  title: "新邀請等待乙方回覆",
  reason: "甲方已用新的邀請識別重新提出案件邀請。",
  nextAction: "乙方核對新通知、身分與案件摘要後再決定。",
  responsible: "受邀乙方",
  returnPath: "新邀請入口",
  recovery: "新通知無法使用時，回到共用帳號入口重新確認。",
});

const ACCEPTANCE_PENDING_MEMBERSHIP = invitationState({
  code: "ACCEPTANCE_PENDING_MEMBERSHIP",
  title: "已回覆接受，等待成員確認",
  reason: "接受意向不等於已取得案件權限，案件成員關係仍待確認。",
  nextAction: "確認帳號、邀請對象與案件成員資料是否一致。",
  responsible: "甲方與萊比",
  returnPath: "乙方邀請狀態頁",
  recovery: "成員確認完成後才會提供正式工作台入口。",
});

const MEMBERSHIP_UNCONFIRMED = invitationState({
  code: "MEMBERSHIP_UNCONFIRMED",
  title: "案件成員仍無法確認",
  reason: "目前無法證明這個帳號是該案件受邀加入的乙方。",
  nextAction: "甲方核對受邀 Email 與案件成員資料。",
  responsible: "甲方",
  returnPath: "乙方邀請狀態頁",
  recovery: "資料一致後重新確認；確認前維持零案件資料。",
});

const AUTHORIZED_VENDOR_WORKSPACE = invitationState({
  code: "AUTHORIZED_VENDOR_WORKSPACE",
  title: "乙方工作台資格已確認",
  reason: "身分、案件成員與案件授權均已由可信流程確認。",
  nextAction: "由正式案件入口進入原乙方工作台。",
  responsible: "受邀乙方",
  returnPath: "乙方邀請狀態頁",
  recovery: "權限出現差異時停止進入，回到邀請狀態重新確認。",
  protectedRouteAllowed: true,
});

export const CONTEXT_UNAVAILABLE = invitationState({
  code: "CONTEXT_UNAVAILABLE",
  title: "目前無法確認邀請情境",
  reason: "這個入口沒有足夠資料可確認身分、邀請或案件成員關係。",
  nextAction: "先前往共用帳號入口確認目前使用者。",
  responsible: "目前使用者",
  returnPath: "共用帳號入口",
  recovery: "確認帳號後，從甲方正式通知的邀請入口重新進入。",
});

export const INVITATION_STATES = freezeRecord([
  ["INVITATION_PENDING", INVITATION_PENDING],
  ["DECLINED", DECLINED],
  ["EXPIRED", EXPIRED],
  ["WITHDRAWN", WITHDRAWN],
  ["RESENT_PENDING", RESENT_PENDING],
  ["ACCEPTANCE_PENDING_MEMBERSHIP", ACCEPTANCE_PENDING_MEMBERSHIP],
  ["MEMBERSHIP_UNCONFIRMED", MEMBERSHIP_UNCONFIRMED],
  ["AUTHORIZED_VENDOR_WORKSPACE", AUTHORIZED_VENDOR_WORKSPACE],
  ["CONTEXT_UNAVAILABLE", CONTEXT_UNAVAILABLE],
]);

export const INVITATION_STATE_LIST = freezeList(
  INVITATION_PENDING,
  DECLINED,
  EXPIRED,
  WITHDRAWN,
  RESENT_PENDING,
  ACCEPTANCE_PENDING_MEMBERSHIP,
  MEMBERSHIP_UNCONFIRMED,
  AUTHORIZED_VENDOR_WORKSPACE,
  CONTEXT_UNAVAILABLE,
);

function invitationEvent(code) {
  return freezeRecord([
    ["code", code],
    ["mutationAuthority", false],
  ]);
}

const ACCEPT = invitationEvent("ACCEPT");
const DECLINE = invitationEvent("DECLINE");
const EXPIRE = invitationEvent("EXPIRE");
const WITHDRAW = invitationEvent("WITHDRAW");
const RESEND = invitationEvent("RESEND");
const MEMBERSHIP_CONFIRMED = invitationEvent("MEMBERSHIP_CONFIRMED");
const MEMBERSHIP_NOT_CONFIRMED = invitationEvent("MEMBERSHIP_UNCONFIRMED");

export const INVITATION_EVENTS = freezeRecord([
  ["ACCEPT", ACCEPT],
  ["DECLINE", DECLINE],
  ["EXPIRE", EXPIRE],
  ["WITHDRAW", WITHDRAW],
  ["RESEND", RESEND],
  ["MEMBERSHIP_CONFIRMED", MEMBERSHIP_CONFIRMED],
  ["MEMBERSHIP_UNCONFIRMED", MEMBERSHIP_NOT_CONFIRMED],
]);

function transitionRecord(from, event, to, requiresNewInvitationIdentity = false) {
  return freezeRecord([
    ["from", from],
    ["event", event],
    ["to", to],
    ["requiresNewInvitationIdentity", requiresNewInvitationIdentity],
    ["mutationAuthority", false],
  ]);
}

export const INVITATION_TRANSITIONS = freezeList(
  transitionRecord("INVITATION_PENDING", "ACCEPT", "ACCEPTANCE_PENDING_MEMBERSHIP"),
  transitionRecord("INVITATION_PENDING", "DECLINE", "DECLINED"),
  transitionRecord("INVITATION_PENDING", "EXPIRE", "EXPIRED"),
  transitionRecord("INVITATION_PENDING", "WITHDRAW", "WITHDRAWN"),
  transitionRecord("DECLINED", "RESEND", "RESENT_PENDING", true),
  transitionRecord("EXPIRED", "RESEND", "RESENT_PENDING", true),
  transitionRecord("WITHDRAWN", "RESEND", "RESENT_PENDING", true),
  transitionRecord("RESENT_PENDING", "ACCEPT", "ACCEPTANCE_PENDING_MEMBERSHIP"),
  transitionRecord(
    "ACCEPTANCE_PENDING_MEMBERSHIP",
    "MEMBERSHIP_CONFIRMED",
    "AUTHORIZED_VENDOR_WORKSPACE",
  ),
  transitionRecord(
    "ACCEPTANCE_PENDING_MEMBERSHIP",
    "MEMBERSHIP_UNCONFIRMED",
    "MEMBERSHIP_UNCONFIRMED",
  ),
);

function hasUsableInvitationIdentity(value) {
  return typeof value === "string" && value.length > 0 && value.length <= 160;
}

export function previewInvitationTransition(
  currentState,
  event,
  currentInvitationIdentity,
  replacementInvitationIdentity,
) {
  if (currentState === INVITATION_PENDING) {
    if (event === ACCEPT) return ACCEPTANCE_PENDING_MEMBERSHIP;
    if (event === DECLINE) return DECLINED;
    if (event === EXPIRE) return EXPIRED;
    if (event === WITHDRAW) return WITHDRAWN;
    return INVITATION_PENDING;
  }

  if (currentState === DECLINED || currentState === EXPIRED || currentState === WITHDRAWN) {
    if (
      event === RESEND
      && hasUsableInvitationIdentity(currentInvitationIdentity)
      && hasUsableInvitationIdentity(replacementInvitationIdentity)
      && currentInvitationIdentity !== replacementInvitationIdentity
    ) {
      return RESENT_PENDING;
    }
    return currentState;
  }

  if (currentState === RESENT_PENDING) {
    if (event === ACCEPT) return ACCEPTANCE_PENDING_MEMBERSHIP;
    if (event === DECLINE) return DECLINED;
    if (event === EXPIRE) return EXPIRED;
    if (event === WITHDRAW) return WITHDRAWN;
    return RESENT_PENDING;
  }

  if (currentState === ACCEPTANCE_PENDING_MEMBERSHIP) {
    if (event === MEMBERSHIP_CONFIRMED) return AUTHORIZED_VENDOR_WORKSPACE;
    if (event === MEMBERSHIP_NOT_CONFIRMED) return MEMBERSHIP_UNCONFIRMED;
    return ACCEPTANCE_PENDING_MEMBERSHIP;
  }

  if (currentState === MEMBERSHIP_UNCONFIRMED) return MEMBERSHIP_UNCONFIRMED;
  if (currentState === AUTHORIZED_VENDOR_WORKSPACE) return AUTHORIZED_VENDOR_WORKSPACE;
  if (currentState === CONTEXT_UNAVAILABLE) return CONTEXT_UNAVAILABLE;
  return CONTEXT_UNAVAILABLE;
}

export function resolveInvitationContext(_input) {
  return CONTEXT_UNAVAILABLE;
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

export function initializeVendorInvitation(root) {
  if (!root) return CONTEXT_UNAVAILABLE;
  try {
    root.body?.setAttribute("data-invitation-state", CONTEXT_UNAVAILABLE.code);
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
  if (typeof length !== "number" || length < 0 || length > 48 || length % 1 !== 0) {
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
if (documentRoot) initializeVendorInvitation(documentRoot);
