import { getActiveCanonicalLinkHref } from "../public/pcm-flow-route-manifest.js";
import { getSupabaseAuthRuntime } from "../account_access/app.js";

const safeCreate = Object.create;
const safeDefineProperty = Object.defineProperty;
const safeFreeze = Object.freeze;
const safeGetOwnPropertyDescriptor = Object.getOwnPropertyDescriptor;
const safeGetPrototypeOf = Object.getPrototypeOf;
const safeApply = Reflect.apply;
const safeBtoa = globalThis.btoa;
const safeEncodeURIComponent = globalThis.encodeURIComponent;
const SafeUrl = globalThis.URL;
const safeStringReplace = String.prototype.replace;
const safeStringTrim = String.prototype.trim;
const safeRegExpTest = RegExp.prototype.test;
const unsafeCalendarIdPattern = /[\u0000-\u001f\u007f]/u;
const primaryGmailCalendarIdPattern = /^[A-Za-z0-9._%+-]+@gmail\.com$/iu;
const base64PaddingPattern = /=+$/u;
const iteratorKey = Symbol.iterator;

export const VENDOR_WORKSPACE_ACCESS_RECOVERY_LINK_ID =
  "vendorWorkspaceAccessRecoveryToAccountAccess";
const VENDOR_WORKSPACE_ACCESS_RECOVERY_MANIFEST_HREF = "../account_access/code.html#top";
const VENDOR_WORKSPACE_ACCESS_RECOVERY_CANONICAL_HREF = "/account/access/?intent=invited-partner";
export const VENDOR_WORKSPACE_GRANT_ENDPOINT = "vendor-workspace-grant";
export const VENDOR_GOOGLE_CALENDAR_CONNECT_START_ENDPOINT =
  "vendor-google-calendar-connect-start";
export const VENDOR_GOOGLE_CALENDAR_CONNECT_CALLBACK_ENDPOINT =
  "vendor-google-calendar-connect-callback";
export const VENDOR_GOOGLE_CALENDAR_SUPPORT_GRANT_ENDPOINT =
  "vendor-google-calendar-support-grant";
export const VENDOR_GOOGLE_CALENDAR_EVENTS_READ_ENDPOINT =
  "vendor-google-calendar-events-read";
export const VENDOR_GOOGLE_CALENDAR_EVENTS_CREATE_ENDPOINT =
  "vendor-google-calendar-events-create";
export const VENDOR_GOOGLE_CALENDAR_EVENTS_UPDATE_ENDPOINT =
  "vendor-google-calendar-events-update";
export const VENDOR_GOOGLE_CALENDAR_EVENTS_CANCEL_ENDPOINT =
  "vendor-google-calendar-events-cancel";
// Retained only for compatibility with the frozen pre-A15 resolver tests. The
// formal workspace boot no longer calls either legacy route or consumes a
// browser-visible calendar id as authority.
export const VENDOR_GOOGLE_CALENDAR_GRANT_ENDPOINT =
  "vendor-google-calendar-grant";
export const VENDOR_GOOGLE_CALENDAR_OAUTH_START_ENDPOINT =
  "vendor-google-calendar-oauth-start";

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
  "contract",
  "construction",
);

export const VENDOR_DESIGN_SUBTAB_KEYS = freezeList(
  "today",
  "drawings",
  "contract",
  "records",
);

export const VENDOR_CONSTRUCTION_SUBTAB_KEYS = freezeList(
  "today",
  "changes",
  "files",
  "records",
);

export const VENDOR_CONTRACT_VIEW_KEYS = freezeList(
  "overview",
  "reply",
  "decision",
  "records",
);

function isVendorContractViewKey(value) {
  return value === "overview"
    || value === "reply"
    || value === "decision"
    || value === "records";
}

export function resolveVendorContractViewKey(activeView, key) {
  const current = isVendorContractViewKey(activeView) ? activeView : "overview";
  if (key === "Home") return "overview";
  if (key === "End") return "records";
  if (
    key !== "ArrowLeft"
    && key !== "ArrowRight"
    && key !== "ArrowUp"
    && key !== "ArrowDown"
  ) {
    return current;
  }
  let currentIndex = 0;
  for (let index = 0; index < VENDOR_CONTRACT_VIEW_KEYS.length; index += 1) {
    if (VENDOR_CONTRACT_VIEW_KEYS[index] === current) {
      currentIndex = index;
      break;
    }
  }
  const forward = key === "ArrowRight" || key === "ArrowDown";
  const offset = forward ? 1 : -1;
  const nextIndex = (
    currentIndex + offset + VENDOR_CONTRACT_VIEW_KEYS.length
  ) % VENDOR_CONTRACT_VIEW_KEYS.length;
  return VENDOR_CONTRACT_VIEW_KEYS[nextIndex];
}

function isVendorWorkspaceTabKey(value) {
  return value === "design" || value === "contract" || value === "construction";
}

export function resolveVendorWorkspaceTabKey(activeTab, key) {
  const current = isVendorWorkspaceTabKey(activeTab) ? activeTab : "design";
  if (key === "Home") return "design";
  if (key === "End") return "construction";
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

function vendorWorkSubtabKeys(scope) {
  if (scope === "design") return VENDOR_DESIGN_SUBTAB_KEYS;
  if (scope === "construction") return VENDOR_CONSTRUCTION_SUBTAB_KEYS;
  return null;
}

function isVendorWorkSubtabKey(scope, value) {
  const keys = vendorWorkSubtabKeys(scope);
  if (!keys) return false;
  for (let index = 0; index < keys.length; index += 1) {
    if (keys[index] === value) return true;
  }
  return false;
}

export function resolveVendorWorkSubtabKey(scope, activeKey, key) {
  const keys = vendorWorkSubtabKeys(scope);
  if (!keys) return null;
  const current = isVendorWorkSubtabKey(scope, activeKey) ? activeKey : keys[0];
  if (key === "Home") return keys[0];
  if (key === "End") return keys[keys.length - 1];
  if (
    key !== "ArrowLeft"
    && key !== "ArrowRight"
    && key !== "ArrowUp"
    && key !== "ArrowDown"
  ) {
    return current;
  }
  let currentIndex = 0;
  for (let index = 0; index < keys.length; index += 1) {
    if (keys[index] === current) {
      currentIndex = index;
      break;
    }
  }
  const forward = key === "ArrowRight" || key === "ArrowDown";
  const offset = forward ? 1 : -1;
  return keys[(currentIndex + offset + keys.length) % keys.length];
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

function calendarEmbedResult(
  state,
  iframeSrc = null,
  calendarHref = null,
  settingsHref = null,
) {
  return freezeRecord([
    ["state", state],
    ["iframeSrc", iframeSrc],
    ["calendarHref", calendarHref],
    ["settingsHref", settingsHref],
  ]);
}

function safeIdentityText(value) {
  if (typeof value !== "string") return false;
  try {
    return value.length > 0
      && value.length <= 512
      && safeApply(safeStringTrim, value, []) === value
      && !safeApply(safeRegExpTest, unsafeCalendarIdPattern, [value]);
  } catch {
    return false;
  }
}

function resolvePrimaryGoogleCalendarLinks(calendarId) {
  if (
    typeof safeBtoa !== "function"
    || !safeIdentityText(calendarId)
    || !safeApply(safeRegExpTest, primaryGmailCalendarIdPattern, [calendarId])
  ) {
    return null;
  }

  try {
    const encodedAccount = safeApply(safeEncodeURIComponent, undefined, [calendarId]);
    const encodedCalendarId = safeApply(safeStringReplace, safeApply(safeBtoa, undefined, [calendarId]), [
      base64PaddingPattern,
      "",
    ]);
    return freezeRecord([
      ["calendarHref", `https://calendar.google.com/calendar/r?authuser=${encodedAccount}&cid=${encodedCalendarId}`],
      ["settingsHref", `https://calendar.google.com/calendar/r/settings/calendar/${encodedCalendarId}?authuser=${encodedAccount}`],
    ]);
  } catch {
    return null;
  }
}

export function resolveVendorCalendarEmbed(trustedGrant) {
  const schemaVersion = ownValue(trustedGrant, "schemaVersion");
  const authenticatedUserId = ownValue(trustedGrant, "authenticatedUserId");
  const currentCaseId = ownValue(trustedGrant, "currentCaseId");
  const membership = ownValue(trustedGrant, "membership");
  const calendarBinding = ownValue(trustedGrant, "calendarBinding");

  if (
    schemaVersion !== "laibe.vendor-calendar-embed.v1"
    || !safeIdentityText(authenticatedUserId)
    || !safeIdentityText(currentCaseId)
    || !membership
    || !calendarBinding
  ) {
    return calendarEmbedResult("CONTEXT_UNAVAILABLE");
  }

  const membershipUserId = ownValue(membership, "userId");
  const bindingUserId = ownValue(calendarBinding, "userId");
  if (
    membershipUserId !== authenticatedUserId
    || bindingUserId !== authenticatedUserId
  ) {
    return calendarEmbedResult("IDENTITY_MISMATCH");
  }

  if (
    ownValue(membership, "caseId") !== currentCaseId
    || ownValue(calendarBinding, "caseId") !== currentCaseId
    || ownValue(membership, "role") !== "pro"
    || ownValue(membership, "status") !== "active"
  ) {
    return calendarEmbedResult("CASE_NOT_AUTHORIZED");
  }

  const connectionStatus = ownValue(calendarBinding, "connectionStatus");
  if (connectionStatus === "expired") {
    return calendarEmbedResult("CALENDAR_CONNECTION_EXPIRED");
  }
  if (connectionStatus !== "connected") {
    return calendarEmbedResult("CALENDAR_NOT_CONNECTED");
  }

  const calendarId = ownValue(calendarBinding, "calendarId");
  if (
    ownValue(calendarBinding, "bindingStatus") !== "active"
    || ownValue(calendarBinding, "timeZone") !== "Asia/Taipei"
    || !safeIdentityText(calendarId)
  ) {
    return calendarEmbedResult("INVALID_CALENDAR_BINDING");
  }

  try {
    const encodedCalendarId = safeApply(safeEncodeURIComponent, undefined, [calendarId]);
    const primaryCalendarLinks = resolvePrimaryGoogleCalendarLinks(calendarId);
    return calendarEmbedResult(
      "READY",
      `https://calendar.google.com/calendar/embed?src=${encodedCalendarId}&ctz=Asia%2FTaipei&hl=zh_TW&mode=AGENDA&showTitle=0&showPrint=0&showTabs=0&showCalendars=0`,
      ownValue(primaryCalendarLinks, "calendarHref") ?? null,
      ownValue(primaryCalendarLinks, "settingsHref") ?? null,
    );
  } catch {
    return calendarEmbedResult("INVALID_CALENDAR_BINDING");
  }
}

function setVendorCalendarHeroState(root, result) {
  let hero;
  let status;
  let emptyTitle;
  let emptyCopy;
  let connect;
  let today;
  let sevenDays;
  let nextStep;
  let responsibility;
  let descriptionLink;
  let notificationLink;
  let openLink;
  let linkStatus;
  try {
    hero = root?.querySelector?.("[data-vendor-calendar-hero]");
    status = root?.querySelector?.("[data-vendor-calendar-status]");
    emptyTitle = root?.querySelector?.("[data-vendor-calendar-empty-title]");
    emptyCopy = root?.querySelector?.("[data-vendor-calendar-empty-copy]");
    connect = root?.querySelector?.("[data-vendor-calendar-connect]");
    today = root?.querySelector?.("[data-vendor-calendar-today]");
    sevenDays = root?.querySelector?.("[data-vendor-calendar-seven-days]");
    nextStep = root?.querySelector?.("[data-vendor-calendar-next-step]");
    responsibility = root?.querySelector?.("[data-vendor-calendar-responsibility]");
    descriptionLink = root?.querySelector?.("[data-vendor-calendar-description-link]");
    notificationLink = root?.querySelector?.("[data-vendor-calendar-notification-link]");
    openLink = root?.querySelector?.("[data-vendor-calendar-open-link]");
    linkStatus = root?.querySelector?.("[data-vendor-calendar-link-status]");
  } catch {
    return;
  }

  const resultState = ownValue(result, "state");
  let productState = "not_connected";
  let statusText = "尚未連結乙方 Google 日曆";
  let titleText = "尚無可顯示的乙方案件行程";
  let copyText = "完成 Google 日曆連線，且本案件授權核對成功後，這裡才會顯示行程；不會載入甲方、平台方或其他乙方帳號。";
  let connectDisabled = false;
  let todayText = "尚待日曆連線";
  let sevenDaysText = "連線後顯示";
  let nextStepText = "依案件紀錄顯示";
  let responsibilityText = "依授權案件顯示";
  let linkStatusText = "日曆連線後開啟工作說明、工種備註與完整行程。";

  if (resultState === "LOADING") {
    productState = "loading";
    statusText = "正在核對 Google 日曆連線";
    titleText = "正在核對案件與日曆授權";
    copyText = "核對完成前不會載入任何日曆或案件行程。";
    connectDisabled = true;
    todayText = "正在核對行程";
  } else if (resultState === "READY") {
    productState = "connected";
    statusText = "已連結目前乙方的 Google 日曆";
    connectDisabled = true;
    todayText = "查看已核對日曆";
    sevenDaysText = "查看下方行程";
    nextStepText = "依案件紀錄與日曆確認";
    responsibilityText = "依授權案件紀錄顯示";
    linkStatusText = ownValue(result, "settingsHref") && ownValue(result, "calendarHref")
      ? "已核對目前乙方日曆；工作說明、工種備註與通知設定皆開啟同一份來源。"
      : "已載入目前登入乙方的案件行程；工作說明顯示於每一筆行程卡。";
  } else if (resultState === "CALENDAR_CONNECTION_EXPIRED") {
    productState = "error";
    statusText = "Google 日曆連線已到期";
    titleText = "請重新連結乙方 Google 日曆";
    copyText = "重新完成授權後，系統會再次核對目前登入乙方與本案件的日曆範圍。";
    todayText = "連線已到期";
  } else if (resultState === "OAUTH_PENDING") {
    productState = "oauth_pending";
    statusText = "等待 Google 授權完成";
    titleText = "請在 Google 視窗完成授權";
    copyText = "完成後，本頁會重新核對案件與日曆授權，再載入可顯示的行程。";
    connectDisabled = true;
    todayText = "等待授權完成";
  } else if (resultState === "OAUTH_ERROR") {
    productState = "error";
    statusText = "目前無法完成 Google 日曆連線";
    titleText = "日曆連線尚未完成";
    copyText = "請稍後再試；連線完成前不會顯示任何日曆或案件行程。";
    todayText = "連線未完成";
  } else if (resultState === "CALENDAR_READ_UNAVAILABLE") {
    productState = "error";
    statusText = "目前暫時無法載入案件行程";
    titleText = "日曆連線已核對，行程稍後再試";
    copyText = "目前不顯示未完成核對的行程；重新整理後會再次向案件日曆讀取。";
    connectDisabled = true;
    todayText = "行程讀取暫停";
    sevenDaysText = "稍後重新核對";
  } else if (
    resultState === "IDENTITY_MISMATCH"
    || resultState === "CASE_NOT_AUTHORIZED"
    || resultState === "INVALID_CALENDAR_BINDING"
  ) {
    productState = "error";
    statusText = "目前案件的日曆授權未通過核對";
    titleText = "這個案件暫時無法顯示日曆";
    copyText = "請確認登入帳號與案件邀請；核對通過前不會載入任何日曆內容。";
    connectDisabled = true;
    todayText = "授權待確認";
  }

  try {
    if (hero?.dataset) hero.dataset.vendorCalendarState = productState;
    if (status) status.textContent = statusText;
    if (emptyTitle) emptyTitle.textContent = titleText;
    if (emptyCopy) emptyCopy.textContent = copyText;
    if (today) today.textContent = todayText;
    if (sevenDays) sevenDays.textContent = sevenDaysText;
    if (nextStep) nextStep.textContent = nextStepText;
    if (responsibility) responsibility.textContent = responsibilityText;
    if (linkStatus) linkStatus.textContent = linkStatusText;
    for (const [link, href] of [
      [descriptionLink, ownValue(result, "settingsHref")],
      [notificationLink, ownValue(result, "settingsHref")],
      [openLink, ownValue(result, "calendarHref")],
    ]) {
      const enabled = resultState === "READY" && typeof href === "string";
      if (!link) continue;
      if (enabled) link.setAttribute?.("href", href);
      else link.removeAttribute?.("href");
      link.setAttribute?.("aria-disabled", enabled ? "false" : "true");
      link.setAttribute?.("tabindex", enabled ? "0" : "-1");
    }
    if (connect) {
      connect.disabled = connectDisabled;
      connect.setAttribute?.("aria-disabled", connectDisabled ? "true" : "false");
    }
  } catch {
    // The static loading state remains fail-closed if presentation nodes change.
  }
}

function initializeVendorCalendarLoading(root) {
  const result = calendarEmbedResult("LOADING");
  setVendorCalendarHeroState(root, result);
  return result;
}

export function initializeVendorCalendarEmbed(root, trustedGrant = null) {
  let frame;
  let emptyState;
  let status;
  try {
    frame = root?.querySelector?.("[data-vendor-calendar-frame]");
    emptyState = root?.querySelector?.("[data-vendor-calendar-empty]");
    status = root?.querySelector?.("[data-vendor-calendar-status]");
  } catch {
    return calendarEmbedResult("CONTEXT_UNAVAILABLE");
  }

  const result = resolveVendorCalendarEmbed(trustedGrant);
  try {
    frame?.removeAttribute?.("src");
    if (frame) frame.hidden = true;
    if (emptyState) emptyState.hidden = false;
    setVendorCalendarHeroState(root, result);
    if (result.state !== "READY" || !frame) return result;

    frame.setAttribute("src", result.iframeSrc);
    frame.hidden = false;
    if (emptyState) emptyState.hidden = true;
    return result;
  } catch {
    try {
      frame?.removeAttribute?.("src");
      if (frame) frame.hidden = true;
      if (emptyState) emptyState.hidden = false;
      setVendorCalendarHeroState(root, calendarEmbedResult("CONTEXT_UNAVAILABLE"));
    } catch {
      // The static closed calendar state remains the source of truth.
    }
    return calendarEmbedResult("CONTEXT_UNAVAILABLE");
  }
}

function formatTaipeiCalendarInstant(epochMilliseconds) {
  try {
    const shifted = new Date(epochMilliseconds + (8 * 60 * 60 * 1000));
    return `${shifted.toISOString().slice(0, -1)}+08:00`;
  } catch {
    return null;
  }
}

export function createVendorCalendarReadWindow(now = Date.now()) {
  const start = Number(now);
  const end = start + (7 * 24 * 60 * 60 * 1000);
  const timeMin = Number.isFinite(start) ? formatTaipeiCalendarInstant(start) : null;
  const timeMax = Number.isFinite(end) ? formatTaipeiCalendarInstant(end) : null;
  return timeMin && timeMax
    ? freezeRecord([
      ["timeMin", timeMin],
      ["timeMax", timeMax],
    ])
    : null;
}

function safeCalendarEventText(value, maximum = 4000) {
  return typeof value === "string"
    && value.length <= maximum
    && !safeApply(safeRegExpTest, unsafeCalendarIdPattern, [value]);
}

function isDisplayableVendorCalendarEvent(event) {
  const title = ownValue(event, "title");
  const description = ownValue(event, "description");
  const start = ownValue(event, "start");
  const end = ownValue(event, "end");
  const status = ownValue(event, "status");
  return safeCalendarEventText(title, 240)
    && safeCalendarEventText(description ?? "", 4000)
    && safeCalendarEventText(start, 64)
    && safeCalendarEventText(end, 64)
    && safeCalendarEventText(status, 64)
    && Number.isFinite(Date.parse(start))
    && Number.isFinite(Date.parse(end));
}

function formatVendorCalendarEventRange(start, end) {
  try {
    const formatter = new Intl.DateTimeFormat("zh-TW", {
      timeZone: "Asia/Taipei",
      month: "numeric",
      day: "numeric",
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    return `${formatter.format(new Date(start))}－${formatter.format(new Date(end))}`;
  } catch {
    return "台北時間依案件日曆顯示";
  }
}

export function initializeVendorCalendarEvents(root, trustedPayload = null) {
  let frame;
  let emptyState;
  let liveEvents;
  let eventList;
  let eventsEmpty;
  let today;
  let sevenDays;
  let nextStep;
  let responsibility;
  try {
    frame = root?.querySelector?.("[data-vendor-calendar-frame]");
    emptyState = root?.querySelector?.("[data-vendor-calendar-empty]");
    liveEvents = root?.querySelector?.("[data-vendor-calendar-live-events]");
    eventList = root?.querySelector?.("[data-vendor-calendar-events]");
    eventsEmpty = root?.querySelector?.("[data-vendor-calendar-events-empty]");
    today = root?.querySelector?.("[data-vendor-calendar-today]");
    sevenDays = root?.querySelector?.("[data-vendor-calendar-seven-days]");
    nextStep = root?.querySelector?.("[data-vendor-calendar-next-step]");
    responsibility = root?.querySelector?.("[data-vendor-calendar-responsibility]");
  } catch {
    return calendarEmbedResult("CONTEXT_UNAVAILABLE");
  }

  const events = ownValue(trustedPayload, "events");
  if (
    ownValue(trustedPayload, "state") !== "ready"
    || ownValue(trustedPayload, "timeZone") !== "Asia/Taipei"
    || !Array.isArray(events)
    || !liveEvents
    || !eventList
    || typeof eventList.replaceChildren !== "function"
  ) {
    try {
      frame?.removeAttribute?.("src");
      if (frame) frame.hidden = true;
      if (liveEvents) liveEvents.hidden = true;
      if (emptyState) emptyState.hidden = false;
      setVendorCalendarHeroState(root, calendarEmbedResult("CALENDAR_READ_UNAVAILABLE"));
    } catch {
      // Keep the static fail-closed calendar state.
    }
    return calendarEmbedResult("CALENDAR_READ_UNAVAILABLE");
  }

  try {
    const ownerDocument = eventList.ownerDocument;
    if (!ownerDocument || typeof ownerDocument.createElement !== "function") {
      throw new Error("CALENDAR_EVENT_DOCUMENT_UNAVAILABLE");
    }
    const items = [];
    for (let index = 0; index < events.length && items.length < 50; index += 1) {
      const event = events[index];
      if (!isDisplayableVendorCalendarEvent(event)) continue;
      const item = ownerDocument.createElement("li");
      item.className = "vendor-calendar-event";

      const time = ownerDocument.createElement("time");
      time.dateTime = ownValue(event, "start");
      time.textContent = formatVendorCalendarEventRange(
        ownValue(event, "start"),
        ownValue(event, "end"),
      );

      const title = ownerDocument.createElement("strong");
      title.textContent = ownValue(event, "title");

      const description = ownerDocument.createElement("p");
      description.textContent = ownValue(event, "description") || "本日工作說明尚未補充。";

      const status = ownerDocument.createElement("small");
      status.textContent = ownValue(event, "status") === "cancelled"
        ? "此行程已取消"
        : "已列入目前案件日曆";

      item.append(time, title, description, status);
      items.push(item);
    }

    eventList.replaceChildren(...items);
    frame?.removeAttribute?.("src");
    if (frame) frame.hidden = true;
    if (emptyState) emptyState.hidden = true;
    liveEvents.hidden = false;
    if (eventsEmpty) eventsEmpty.hidden = items.length > 0;
    setVendorCalendarHeroState(root, calendarEmbedResult("READY"));
    if (today) today.textContent = items.length > 0 ? `今日起共有 ${items.length} 筆案件行程` : "未來 7 天暫無案件行程";
    if (sevenDays) sevenDays.textContent = items.length > 0 ? `${items.length} 筆已核對行程` : "目前沒有待執行行程";
    if (nextStep) nextStep.textContent = items.length > 0 ? "依最早一筆行程準備施工資料" : "等待案件排程更新";
    if (responsibility) responsibility.textContent = items.length > 0 ? "乙方依行程與案件文件執行" : "案件排程更新者";
    return calendarEmbedResult("READY");
  } catch {
    try {
      eventList.replaceChildren();
      liveEvents.hidden = true;
      if (emptyState) emptyState.hidden = false;
      setVendorCalendarHeroState(root, calendarEmbedResult("CALENDAR_READ_UNAVAILABLE"));
    } catch {
      // Keep the static fail-closed calendar state.
    }
    return calendarEmbedResult("CALENDAR_READ_UNAVAILABLE");
  }
}

function isTrustedVendorWorkspaceGrant(grant) {
  const authenticatedUserId = ownValue(grant, "authenticatedUserId");
  const currentCaseId = ownValue(grant, "currentCaseId");
  const membership = ownValue(grant, "membership");
  const workspaceAccess = ownValue(grant, "workspaceAccess");
  return ownValue(grant, "schemaVersion") === "laibe.vendor-workspace-auth.v1"
    && ownValue(grant, "state") === "AUTHORIZED_VENDOR_WORKSPACE"
    && safeIdentityText(authenticatedUserId)
    && safeIdentityText(currentCaseId)
    && ownValue(membership, "userId") === authenticatedUserId
    && ownValue(membership, "caseId") === currentCaseId
    && ownValue(membership, "role") === "pro"
    && ownValue(membership, "status") === "active"
    && ownValue(workspaceAccess, "role") === "pro"
    && ownValue(workspaceAccess, "mutationAllowed") === false
    && ownValue(workspaceAccess, "writeActionsEnabled") === false;
}

async function resolveAuthenticatedRuntime(candidate) {
  const runtime = await (candidate ?? getSupabaseAuthRuntime());
  return typeof ownValue(runtime, "authenticatedFetch") === "function" ? runtime : null;
}

export async function fetchVendorWorkspaceGrant(authRuntime = null) {
  try {
    const runtime = await resolveAuthenticatedRuntime(authRuntime);
    if (!runtime) return null;
    const response = await safeApply(ownValue(runtime, "authenticatedFetch"), runtime, [
      VENDOR_WORKSPACE_GRANT_ENDPOINT,
      {
        method: "GET",
        headers: { "accept": "application/json" },
      },
    ]);
    if (!response?.ok) return null;
    const grant = await response.json();
    return isTrustedVendorWorkspaceGrant(grant) ? grant : null;
  } catch {
    return null;
  }
}

async function postVendorGoogleCalendarJson(
  endpoint,
  payload,
  authRuntime = null,
) {
  try {
    const runtime = await resolveAuthenticatedRuntime(authRuntime);
    if (!runtime) return null;
    const response = await safeApply(ownValue(runtime, "authenticatedFetch"), runtime, [
      endpoint,
      {
        method: "POST",
        headers: {
          "accept": "application/json",
          "content-type": "application/json",
        },
        body: JSON.stringify(payload),
      },
    ]);
    if (!response?.ok) return null;
    const value = await response.json();
    return value && typeof value === "object" && !Array.isArray(value) ? value : null;
  } catch {
    return null;
  }
}

function hasExactVendorCalendarCapabilities(capabilities) {
  return Array.isArray(capabilities)
    && capabilities.length === 4
    && capabilities[0] === "read"
    && capabilities[1] === "create"
    && capabilities[2] === "update"
    && capabilities[3] === "cancel";
}

function copyVendorCalendarPayload(input, keys) {
  const payload = safeCreate(null);
  for (let index = 0; index < keys.length; index += 1) {
    const key = keys[index];
    safeDefineProperty(payload, key, {
      configurable: true,
      enumerable: true,
      value: ownValue(input, key),
      writable: true,
    });
  }
  return payload;
}

export async function fetchVendorGoogleCalendarSupportGrant(authRuntime = null) {
  const payload = await postVendorGoogleCalendarJson(
    VENDOR_GOOGLE_CALENDAR_SUPPORT_GRANT_ENDPOINT,
    safeCreate(null),
    authRuntime,
  );
  return ownValue(payload, "state") === "connected"
      && ownValue(payload, "timeZone") === "Asia/Taipei"
      && hasExactVendorCalendarCapabilities(ownValue(payload, "capabilities"))
    ? payload
    : null;
}

export async function fetchVendorGoogleCalendarEvents(
  authRuntime = null,
  window = null,
) {
  const payload = await postVendorGoogleCalendarJson(
    VENDOR_GOOGLE_CALENDAR_EVENTS_READ_ENDPOINT,
    copyVendorCalendarPayload(window, ["timeMin", "timeMax"]),
    authRuntime,
  );
  const events = ownValue(payload, "events");
  return ownValue(payload, "state") === "ready"
      && ownValue(payload, "timeZone") === "Asia/Taipei"
      && Array.isArray(events)
    ? payload
    : null;
}

export async function createVendorGoogleCalendarEvent(authRuntime = null, input = null) {
  const payload = await postVendorGoogleCalendarJson(
    VENDOR_GOOGLE_CALENDAR_EVENTS_CREATE_ENDPOINT,
    copyVendorCalendarPayload(input, [
      "idempotencyKey",
      "title",
      "description",
      "start",
      "end",
      "basis",
      "workNotes",
      "tradeNotes",
      "nextOwner",
    ]),
    authRuntime,
  );
  return ownValue(payload, "state") === "created" ? payload : null;
}

export async function updateVendorGoogleCalendarEvent(authRuntime = null, input = null) {
  const payload = await postVendorGoogleCalendarJson(
    VENDOR_GOOGLE_CALENDAR_EVENTS_UPDATE_ENDPOINT,
    copyVendorCalendarPayload(input, [
      "idempotencyKey",
      "title",
      "description",
      "start",
      "end",
      "basis",
      "workNotes",
      "tradeNotes",
      "nextOwner",
      "eventId",
      "etag",
    ]),
    authRuntime,
  );
  return ownValue(payload, "state") === "updated" ? payload : null;
}

export async function cancelVendorGoogleCalendarEvent(authRuntime = null, input = null) {
  const payload = await postVendorGoogleCalendarJson(
    VENDOR_GOOGLE_CALENDAR_EVENTS_CANCEL_ENDPOINT,
    copyVendorCalendarPayload(input, [
      "idempotencyKey",
      "eventId",
      "etag",
      "reason",
      "basis",
      "workNotes",
      "tradeNotes",
      "nextOwner",
    ]),
    authRuntime,
  );
  return ownValue(payload, "state") === "cancelled" ? payload : null;
}

export async function fetchVendorGoogleCalendarGrant(authRuntime = null) {
  try {
    const runtime = await resolveAuthenticatedRuntime(authRuntime);
    if (!runtime) return null;
    const response = await safeApply(ownValue(runtime, "authenticatedFetch"), runtime, [
      VENDOR_GOOGLE_CALENDAR_GRANT_ENDPOINT,
      {
        method: "GET",
        headers: { "accept": "application/json" },
      },
    ]);
    if (!response?.ok) return null;
    const grant = await response.json();
    return resolveVendorCalendarEmbed(grant).state === "READY" ? grant : null;
  } catch {
    return null;
  }
}

export async function startVendorGoogleCalendarOAuth(authRuntime = null) {
  try {
    const payload = await postVendorGoogleCalendarJson(
      VENDOR_GOOGLE_CALENDAR_CONNECT_START_ENDPOINT,
      safeCreate(null),
      authRuntime,
    );
    const state = ownValue(payload, "state");
    const authorizationUrl = ownValue(payload, "authorizationUrl");
    if (
      state !== "oauth_pending" ||
      typeof authorizationUrl !== "string" ||
      !authorizationUrl.startsWith("https://accounts.google.com/")
    ) {
      return null;
    }
    return freezeRecord([
      ["state", state],
      ["authorizationUrl", authorizationUrl],
    ]);
  } catch {
    return null;
  }
}

function openVendorGoogleCalendarAuthorizationWindow() {
  try {
    return globalThis.open?.(
      "about:blank",
      "laibeVendorGoogleCalendarOAuth",
      "popup=yes,width=640,height=760,resizable=yes,scrollbars=yes",
    ) ?? null;
  } catch {
    return null;
  }
}

function closeAuthorizationWindow(authorizationWindow) {
  try {
    if (authorizationWindow && !authorizationWindow.closed) authorizationWindow.close?.();
  } catch {
    // The external authorization window may already be outside our origin.
  }
}

function navigateAuthorizationWindow(authorizationWindow, authorizationUrl) {
  try {
    authorizationWindow.location.assign(authorizationUrl);
    return true;
  } catch {
    return false;
  }
}

function waitForCalendarPoll(delayMs) {
  return new Promise((resolve) => globalThis.setTimeout(resolve, delayMs));
}

export async function waitForVendorCalendarGrant(
  authRuntime,
  {
    authorizationWindow = null,
    wait = waitForCalendarPoll,
    pollIntervalMs = 1250,
    maxPollAttempts = 240,
  } = {},
) {
  const attempts = Number.isInteger(maxPollAttempts)
    && maxPollAttempts > 0
    && maxPollAttempts <= 360
    ? maxPollAttempts
    : 240;
  const interval = Number.isFinite(pollIntervalMs)
    && pollIntervalMs >= 0
    && pollIntervalMs <= 5000
    ? pollIntervalMs
    : 1250;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const grant = await fetchVendorGoogleCalendarSupportGrant(authRuntime);
    if (grant) return grant;
    if (attempt + 1 >= attempts) {
      return null;
    }
    try {
      await wait(interval);
    } catch {
      return null;
    }
  }
  return null;
}

export function initializeVendorGoogleCalendarActions(root, {
  authRuntime = null,
  openAuthorizationWindow = openVendorGoogleCalendarAuthorizationWindow,
  wait = waitForCalendarPoll,
  pollIntervalMs = 1250,
  maxPollAttempts = 240,
} = {}) {
  let connect;
  let status;
  try {
    connect = root?.querySelector?.("[data-vendor-calendar-connect]");
    status = root?.querySelector?.("[data-vendor-calendar-action-status]");
  } catch {
    return freezeRecord([["state", "CONTEXT_UNAVAILABLE"]]);
  }
  if (!connect || typeof connect.addEventListener !== "function") {
    return freezeRecord([["state", "CONTEXT_UNAVAILABLE"]]);
  }

  connect.addEventListener("click", async (event) => {
    let authorizationWindow = null;
    try {
      event?.preventDefault?.();
      authorizationWindow = openAuthorizationWindow();
      if (!authorizationWindow) {
        setVendorCalendarHeroState(root, calendarEmbedResult("OAUTH_ERROR"));
        if (status) status.textContent = "請允許瀏覽器開啟 Google 授權視窗後再試一次。";
        return;
      }
      connect.disabled = true;
      connect.setAttribute?.("aria-disabled", "true");
      setVendorCalendarHeroState(root, calendarEmbedResult("OAUTH_PENDING"));
      if (status) status.textContent = "正在建立安全的 Google 日曆連線…";
      const result = await startVendorGoogleCalendarOAuth(authRuntime);
      if (!result) throw new Error("CALENDAR_CONNECTION_UNAVAILABLE");
      if (!navigateAuthorizationWindow(authorizationWindow, result.authorizationUrl)) {
        throw new Error("CALENDAR_AUTHORIZATION_WINDOW_UNAVAILABLE");
      }
      if (status) status.textContent = "請在 Google 視窗完成授權，完成後日曆會自動載入。";
      const grant = await waitForVendorCalendarGrant(authRuntime, {
        authorizationWindow,
        wait,
        pollIntervalMs,
        maxPollAttempts,
      });
      if (!grant) throw new Error("CALENDAR_CONNECTION_NOT_CONFIRMED");
      const readWindow = createVendorCalendarReadWindow();
      const events = readWindow
        ? await fetchVendorGoogleCalendarEvents(authRuntime, readWindow)
        : null;
      const rendered = initializeVendorCalendarEvents(root, events);
      if (rendered.state !== "READY") throw new Error("CALENDAR_EVENTS_UNAVAILABLE");
      closeAuthorizationWindow(authorizationWindow);
    } catch {
      closeAuthorizationWindow(authorizationWindow);
      setVendorCalendarHeroState(root, calendarEmbedResult("OAUTH_ERROR"));
      if (status) status.textContent = "目前無法開始日曆連線，請稍後再試。";
    }
  });

  return freezeRecord([["state", "READY"]]);
}

export async function refreshVendorCalendarEmbedFromServer(
  root,
  authRuntime = null,
) {
  const grant = await fetchVendorGoogleCalendarGrant(authRuntime);
  return initializeVendorCalendarEmbed(root, grant);
}

export async function refreshVendorCalendarSupportFromServer(
  root,
  authRuntime = null,
) {
  const grant = await fetchVendorGoogleCalendarSupportGrant(authRuntime);
  if (!grant) return initializeVendorCalendarEmbed(root, null);
  const readWindow = createVendorCalendarReadWindow();
  const events = readWindow
    ? await fetchVendorGoogleCalendarEvents(authRuntime, readWindow)
    : null;
  return initializeVendorCalendarEvents(root, events);
}

function describeVendorDocumentFile(file, source) {
  let name;
  let size;
  let type;
  let lastModified;
  try {
    name = file?.name;
    size = file?.size;
    type = file?.type;
    lastModified = file?.lastModified;
  } catch {
    return null;
  }
  if (
    typeof name !== "string"
    || name.length < 1
    || name.length > 240
    || typeof size !== "number"
    || size < 0
    || !Number.isFinite(size)
  ) {
    return null;
  }

  const lowerName = name.toLowerCase();
  const pdf = type === "application/pdf" || lowerName.endsWith(".pdf");
  const jpeg = type === "image/jpeg" || lowerName.endsWith(".jpg") || lowerName.endsWith(".jpeg");
  const png = type === "image/png" || lowerName.endsWith(".png");
  if (!pdf && !jpeg && !png) return null;

  return {
    file,
    key: `${name}\u0000${size}\u0000${typeof lastModified === "number" ? lastModified : 0}`,
    kind: pdf ? "PDF 文件" : "影像文件・待確認",
    name,
    size,
    source,
  };
}

function formatVendorDocumentSize(size) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${Math.max(1, Math.round(size / 1024))} KB`;
  return `${(size / (1024 * 1024)).toFixed(size < 10 * 1024 * 1024 ? 1 : 0)} MB`;
}

export function initializeVendorDocumentStorage(root) {
  let storage;
  let panel;
  let toggle;
  let add;
  let picker;
  try {
    storage = root?.querySelector?.("[data-vendor-document-storage]");
    panel = root?.querySelector?.("#vendor-document-storage-panel");
    toggle = root?.querySelector?.("[data-vendor-document-toggle]");
    add = root?.querySelector?.("[data-vendor-document-add]");
    picker = root?.querySelector?.("[data-vendor-document-picker]");
  } catch {
    return freezeRecord([["state", "CONTEXT_UNAVAILABLE"]]);
  }
  if (
    !storage
    || !panel
    || !toggle
    || !add
    || !picker
    || typeof toggle.addEventListener !== "function"
    || typeof add.addEventListener !== "function"
  ) {
    return freezeRecord([["state", "CONTEXT_UNAVAILABLE"]]);
  }

  let expanded = false;
  function setExpanded(nextExpanded) {
    expanded = nextExpanded === true;
    try {
      storage.dataset.expanded = expanded ? "true" : "false";
      panel.hidden = !expanded;
      toggle.setAttribute("aria-expanded", expanded ? "true" : "false");
      toggle.textContent = expanded ? "收起本機整理區" : "查看本機整理區";
    } catch {
      return false;
    }
    return true;
  }

  function expand() {
    return setExpanded(true);
  }

  function collapse() {
    return setExpanded(false);
  }

  toggle.addEventListener("click", () => setExpanded(!expanded));
  add.addEventListener("click", () => {
    expand();
    try {
      picker.click();
    } catch {
      // The expanded dropzone remains a non-authoritative local staging path.
    }
  });
  collapse();
  return freezeRecord([
    ["state", "READY"],
    ["setExpanded", setExpanded],
    ["expand", expand],
    ["collapse", collapse],
  ]);
}

export function initializeVendorDocumentImport(root, storageController = null) {
  let dropzone;
  let picker;
  let queue;
  let empty;
  let count;
  let status;
  let currentCase;
  try {
    dropzone = root?.querySelector?.("[data-vendor-document-dropzone]");
    picker = root?.querySelector?.("[data-vendor-document-picker]");
    queue = root?.querySelector?.("[data-vendor-document-queue]");
    empty = root?.querySelector?.("[data-vendor-document-empty]");
    count = root?.querySelector?.("[data-vendor-document-count]");
    status = root?.querySelector?.("[data-vendor-document-import-status]");
    currentCase = root?.querySelector?.("[data-vendor-active-case-name]");
  } catch {
    return freezeRecord([["state", "CONTEXT_UNAVAILABLE"]]);
  }
  if (
    !dropzone
    || !picker
    || !queue
    || typeof dropzone.addEventListener !== "function"
    || typeof picker.addEventListener !== "function"
    || typeof queue.replaceChildren !== "function"
  ) {
    return freezeRecord([["state", "CONTEXT_UNAVAILABLE"]]);
  }

  const entries = [];
  let nextEntryId = 1;

  function renderQueue() {
    let ownerDocument;
    try {
      ownerDocument = queue.ownerDocument;
    } catch {
      ownerDocument = null;
    }
    if (!ownerDocument || typeof ownerDocument.createElement !== "function") return false;

    const items = [];
    for (let index = 0; index < entries.length; index += 1) {
      const entry = entries[index];
      const item = ownerDocument.createElement("li");
      item.className = "vendor-document-import__item";

      const file = ownerDocument.createElement("div");
      file.className = "vendor-document-import__file";
      const name = ownerDocument.createElement("strong");
      name.textContent = entry.name;
      const meta = ownerDocument.createElement("div");
      meta.className = "vendor-document-import__meta";
      const currentCaseName = typeof currentCase?.textContent === "string" && currentCase.textContent.length > 0
        ? currentCase.textContent
        : "目前授權案件";
      for (const value of [
        formatVendorDocumentSize(entry.size),
        `來源：${entry.source}`,
        entry.kind,
        `目前案件：${currentCaseName}`,
        "文件種類：待確認",
        "版本關係：新文件／新版本待確認",
        "下一步：確認文件種類與版本關係",
        "送出狀態：尚未送出",
        "留痕狀態：尚未建立案件紀錄",
      ]) {
        const detail = ownerDocument.createElement("span");
        detail.textContent = value;
        meta.appendChild(detail);
      }
      file.append(name, meta);

      const remove = ownerDocument.createElement("button");
      remove.className = "vendor-document-import__remove";
      remove.type = "button";
      remove.textContent = "移出清單";
      remove.setAttribute("aria-label", `將 ${entry.name} 移出待分類清單`);
      remove.addEventListener("click", () => {
        const entryIndex = entries.findIndex((candidate) => candidate.id === entry.id);
        if (entryIndex >= 0) entries.splice(entryIndex, 1);
        renderQueue();
        if (status) status.textContent = "已從目前頁面的待分類清單移除文件。";
      });

      item.append(file, remove);
      items.push(item);
    }

    queue.replaceChildren(...items);
    if (empty) empty.hidden = entries.length > 0;
    if (count) {
      count.textContent = entries.length > 0
        ? `本機選取 ${entries.length} 份・尚未送出`
        : "尚未選取檔案";
    }
    return true;
  }

  function stageFiles(fileList, source) {
    let length = 0;
    try {
      length = Number(fileList?.length ?? 0);
    } catch {
      length = 0;
    }
    if (!Number.isInteger(length) || length < 0) length = 0;
    const boundedLength = Math.min(length, 50);
    let added = 0;
    let skipped = 0;
    for (let index = 0; index < boundedLength; index += 1) {
      let candidate;
      try {
        candidate = describeVendorDocumentFile(fileList[index], source);
      } catch {
        candidate = null;
      }
      if (!candidate || entries.some((entry) => entry.key === candidate.key)) {
        skipped += 1;
        continue;
      }
      candidate.id = nextEntryId;
      nextEntryId += 1;
      entries.push(candidate);
      added += 1;
    }
    renderQueue();
    if (added > 0) {
      try {
        storageController?.expand?.();
      } catch {
        // The staged queue remains available if the disclosure controller changes.
      }
    }
    if (status) {
      if (added > 0) {
        status.textContent = `已在本機選取 ${added} 份檔案；請確認文件種類與版本關係。這些檔案只在本機整理，尚未送出。`;
      } else if (skipped > 0) {
        status.textContent = "沒有加入新檔案；目前只接受 PDF、JPG 或 PNG，重複檔案也不會再次加入。";
      }
    }
    return added;
  }

  dropzone.addEventListener("click", (event) => {
    const target = event?.target;
    if (target === picker || target?.htmlFor === picker.id) return;
    try {
      picker.click();
    } catch {
      // The visible file label remains available.
    }
  });
  dropzone.addEventListener("keydown", (event) => {
    if (event?.key !== "Enter" && event?.key !== " ") return;
    event.preventDefault?.();
    try {
      picker.click();
    } catch {
      // Keyboard activation stays fail-closed if the picker is unavailable.
    }
  });
  dropzone.addEventListener("dragenter", (event) => {
    event?.preventDefault?.();
    dropzone.classList?.add?.("is-dragging");
  });
  dropzone.addEventListener("dragover", (event) => {
    event?.preventDefault?.();
    try {
      if (event?.dataTransfer) event.dataTransfer.dropEffect = "copy";
    } catch {
      // Visual drag feedback remains available.
    }
  });
  dropzone.addEventListener("dragleave", () => dropzone.classList?.remove?.("is-dragging"));
  dropzone.addEventListener("drop", (event) => {
    event?.preventDefault?.();
    dropzone.classList?.remove?.("is-dragging");
    stageFiles(event?.dataTransfer?.files, "拖曳加入");
  });
  picker.addEventListener("change", () => {
    stageFiles(picker.files, "裝置選擇");
    try {
      picker.value = "";
    } catch {
      // The staged list remains the source of truth for this page session.
    }
  });

  renderQueue();
  return freezeRecord([
    ["state", "READY"],
    ["stageFiles", stageFiles],
  ]);
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

export const VENDOR_DOCUMENT_SHARE_TARGETS = freezeRecord([
  ["CONTRACT_DRAFT_VERSIONS", freezeRecord([["title", "契約版本"], ["fragment", "#documents"]])],
  ["ATTACHMENTS", freezeRecord([["title", "契約附件"], ["fragment", "#documents"]])],
  ["PUBLIC_PCM_REVIEWS", freezeRecord([["title", "公開審查"], ["fragment", "#reviews"]])],
  ["SUPPLEMENTS", freezeRecord([["title", "補件"], ["fragment", "#reviews"]])],
  ["SCHEDULES", freezeRecord([["title", "施工任務"], ["fragment", "#execution"]])],
  ["EVIDENCE", freezeRecord([["title", "施工照片"], ["fragment", "#execution"]])],
  ["ACCEPTANCE", freezeRecord([["title", "驗收資料"], ["fragment", "#execution"]])],
  ["CHANGES", freezeRecord([["title", "追加減項"], ["fragment", "#execution"]])],
  ["ADDENDA", freezeRecord([["title", "附約"], ["fragment", "#reviews"]])],
  ["CASE_RECORDS", freezeRecord([["title", "案件紀錄"], ["fragment", "#records"]])],
]);

export function resolveVendorDocumentShareTarget(code, currentHref) {
  const descriptor = ownValue(VENDOR_DOCUMENT_SHARE_TARGETS, code);
  if (!descriptor || typeof currentHref !== "string" || typeof SafeUrl !== "function") {
    return null;
  }
  try {
    const url = new SafeUrl(currentHref);
    if (
      (url.protocol !== "http:" && url.protocol !== "https:")
      || url.pathname !== "/pcm/vendor/workspace/"
      || url.username !== ""
      || url.password !== ""
    ) {
      return null;
    }
    url.search = "";
    url.hash = ownValue(descriptor, "fragment");
    const title = ownValue(descriptor, "title");
    return freezeRecord([
      ["title", `LaiBE 乙方工作台｜${title}`],
      ["text", `分享「${title}」的受權入口。收件者仍須登入並具備案件權限。`],
      ["url", url.href],
    ]);
  } catch {
    return null;
  }
}

function browserNativeShare(payload) {
  const browserNavigator = globalThis.navigator;
  const method = browserNavigator?.share;
  return typeof method === "function"
    ? safeApply(method, browserNavigator, [payload])
    : null;
}

function browserClipboardCopy(url) {
  const browserNavigator = globalThis.navigator;
  const clipboard = browserNavigator?.clipboard;
  const method = clipboard?.writeText;
  return typeof method === "function"
    ? safeApply(method, clipboard, [url])
    : null;
}

function setVendorShareStatus(status, message) {
  try {
    if (status) status.textContent = message;
  } catch {
    // The visible item remains available even if the live region is missing.
  }
}

function vendorShareWasCancelled(error) {
  return ownValue(error, "name") === "AbortError";
}

export function initializeVendorDocumentSharing(root, {
  share = browserNativeShare,
  copy = browserClipboardCopy,
  locationHref = globalThis.location?.href ?? "",
} = {}) {
  let buttons;
  let status;
  try {
    buttons = root?.querySelectorAll?.("[data-vendor-document-share]");
    status = root?.querySelector?.("[data-vendor-workspace-live]");
  } catch {
    return freezeRecord([["state", "CONTEXT_UNAVAILABLE"], ["boundCount", 0]]);
  }
  const length = ownListLength(buttons);
  if (length === null || length === 0) {
    return freezeRecord([["state", "CONTEXT_UNAVAILABLE"], ["boundCount", 0]]);
  }

  let boundCount = 0;
  for (let index = 0; index < length; index += 1) {
    const button = ownValue(buttons, String(index));
    if (!button || typeof button.addEventListener !== "function") continue;
    let code = null;
    try {
      code = button.getAttribute("data-vendor-document-share");
    } catch {
      code = null;
    }
    const target = resolveVendorDocumentShareTarget(code, locationHref);
    if (!target) continue;
    try {
      button.addEventListener("click", async (event) => {
        event?.preventDefault?.();
        try {
          button.disabled = true;
        } catch {
          // Sharing can still proceed when the custom control cannot be disabled.
        }
        try {
          if (typeof share === "function") {
            try {
              const shared = safeApply(share, undefined, [target]);
              if (shared) {
                await shared;
                setVendorShareStatus(status, "已開啟系統分享選單。");
                return;
              }
            } catch (error) {
              if (vendorShareWasCancelled(error)) {
                setVendorShareStatus(status, "已取消分享。");
                return;
              }
            }
          }
          if (typeof copy === "function") {
            const copied = safeApply(copy, undefined, [ownValue(target, "url")]);
            if (copied) {
              await copied;
              setVendorShareStatus(status, "已複製受權連結；收件者仍須登入並有案件權限。");
              return;
            }
          }
          setVendorShareStatus(status, "目前無法開啟分享，請稍後再試。");
        } catch {
          setVendorShareStatus(status, "目前無法開啟分享，請稍後再試。");
        } finally {
          try {
            button.disabled = false;
          } catch {
            // The share attempt has already ended.
          }
        }
      });
      boundCount += 1;
    } catch {
      continue;
    }
  }
  return freezeRecord([
    ["state", boundCount === length ? "READY" : "PARTIAL"],
    ["boundCount", boundCount],
  ]);
}

function closedAction(code, label) {
  return freezeRecord([
    ["code", code],
    ["label", label],
    ["enabled", false],
    ["mutationAuthority", false],
  ]);
}

function vendorCaseBindingState({
  code,
  statusLabel,
  title,
  summary,
  responsible,
  nextStep,
  recordTruth,
  actionMode = "none",
}) {
  return freezeRecord([
    ["code", code],
    ["statusLabel", statusLabel],
    ["title", title],
    ["summary", summary],
    ["responsible", responsible],
    ["nextStep", nextStep],
    ["recordTruth", recordTruth],
    ["actionMode", actionMode],
    ["workspaceAuthority", false],
    ["fullCaseContentAllowed", false],
    ["mutationAllowed", false],
  ]);
}

export const VENDOR_CASE_BINDING_ACTIONS = freezeList(
  closedAction("ACCEPT_INVITATION", "確認承接邀請"),
  closedAction("DECLINE_INVITATION", "婉拒本次邀請"),
  closedAction("CONFIRM_MUTUAL_TERMINATION", "確認雙方終止"),
  closedAction("REPORT_NO_TERMINATION_CONSENSUS", "尚未達成終止共識"),
);

export const VENDOR_CASE_BINDING_CONTEXT_UNAVAILABLE = vendorCaseBindingState({
  code: "CONTEXT_UNAVAILABLE",
  statusLabel: "等待核對",
  title: "案件綁定狀態待確認",
  summary: "完成身分與邀請紀錄核對前，不會顯示案件內容或代替你回覆邀請。",
  responsible: "目前使用者",
  nextStep: "登入並從甲方正式通知重新確認邀請",
  recordTruth: "尚未取得可顯示的正式案件事件",
});

const VALID_INVITE = vendorCaseBindingState({
  code: "VALID_INVITE",
  statusLabel: "有效邀請待回覆",
  title: "請確認是否承接這個案件",
  summary: "邀請內容已核對；你可以確認或婉拒本次承接邀請，完整案件內容仍保持關閉。",
  responsible: "受邀乙方",
  nextStep: "確認或婉拒本次案件邀請",
  recordTruth: "正式邀請事件已列入案件紀錄",
  actionMode: "invite",
});

const BINDING_DECLINED = vendorCaseBindingState({
  code: "DECLINED",
  statusLabel: "邀請已婉拒",
  title: "已婉拒本次邀請",
  summary: "本次邀請不會建立案件成員關係，也不會取得案件內容。",
  responsible: "甲方",
  nextStep: "由甲方決定是否另行邀請乙方",
  recordTruth: "婉拒結果已列入案件紀錄",
});

const ACCEPTED_AWAITING_OWNER = vendorCaseBindingState({
  code: "ACCEPTED_AWAITING_OWNER",
  statusLabel: "乙方已回覆",
  title: "等待業主最後確認",
  summary: "你已回覆願意承接；業主完成最後確認前，尚未開放完整案件內容。",
  responsible: "業主",
  nextStep: "等待業主確認唯一主要乙方",
  recordTruth: "乙方回覆已列入案件紀錄",
});

const FORMALLY_BOUND = vendorCaseBindingState({
  code: "FORMALLY_BOUND",
  statusLabel: "正式綁定",
  title: "正式綁定已確認",
  summary: "你已是本案件唯一主要乙方；進入完整內容仍須通過工作台授權核對。",
  responsible: "受邀乙方",
  nextStep: "核對工作台授權後處理第一項案件責任",
  recordTruth: "甲乙方正式綁定事件已列入案件紀錄",
});

const ACCESS_STOPPED = vendorCaseBindingState({
  code: "ACCESS_STOPPED",
  statusLabel: "存取已停止",
  title: "案件存取已停止",
  summary: "業主已停止你查看與處理後續案件內容；這不代表雙方已確認終止合作。",
  responsible: "甲乙雙方",
  nextStep: "確認雙方是否同意終止，或註明尚未取得共識",
  recordTruth: "存取停止事件已列入案件紀錄；終止共識仍待確認",
  actionMode: "termination",
});

const TERMINATION_CONFIRMED = vendorCaseBindingState({
  code: "TERMINATION_CONFIRMED",
  statusLabel: "雙方已確認終止",
  title: "雙方終止已確認",
  summary: "甲乙雙方都已確認終止合作；後續不再開放案件操作，並保留既有案件紀錄。",
  responsible: "案件雙方",
  nextStep: "依既有紀錄完成必要的後續交接",
  recordTruth: "雙方終止確認事件已列入案件紀錄",
});

const TERMINATION_DISPUTED = vendorCaseBindingState({
  code: "TERMINATION_DISPUTED",
  statusLabel: "終止共識待釐清",
  title: "尚未取得終止共識",
  summary: "目前只有存取停止或單方說明；不得顯示為雙方終止完成。",
  responsible: "甲乙雙方",
  nextStep: "回到原始依據釐清雙方立場與下一步",
  recordTruth: "無共識狀態已列入案件紀錄",
});

export const VENDOR_CASE_BINDING_STATES = freezeRecord([
  ["VALID_INVITE", VALID_INVITE],
  ["DECLINED", BINDING_DECLINED],
  ["ACCEPTED_AWAITING_OWNER", ACCEPTED_AWAITING_OWNER],
  ["FORMALLY_BOUND", FORMALLY_BOUND],
  ["ACCESS_STOPPED", ACCESS_STOPPED],
  ["TERMINATION_CONFIRMED", TERMINATION_CONFIRMED],
  ["TERMINATION_DISPUTED", TERMINATION_DISPUTED],
]);

export const VENDOR_CASE_BINDING_STATE_LIST = freezeList(
  VALID_INVITE,
  BINDING_DECLINED,
  ACCEPTED_AWAITING_OWNER,
  FORMALLY_BOUND,
  ACCESS_STOPPED,
  TERMINATION_CONFIRMED,
  TERMINATION_DISPUTED,
);

function vendorCaseBindingProjectionResult(
  state,
  caseLabel = "尚未取得可顯示案件",
  basisLabel = "等待正式邀請紀錄",
  updatedAtLabel = "尚未取得正式事件",
  recordedEvent = false,
) {
  return freezeRecord([
    ["state", state],
    ["caseLabel", caseLabel],
    ["basisLabel", basisLabel],
    ["updatedAtLabel", updatedAtLabel],
    ["recordedEvent", recordedEvent],
    ["workspaceAuthority", false],
    ["mutationAllowed", false],
  ]);
}

function unavailableVendorCaseBindingProjection() {
  return vendorCaseBindingProjectionResult(VENDOR_CASE_BINDING_CONTEXT_UNAVAILABLE);
}

export function resolveVendorCaseBindingProjection(projection) {
  const schemaVersion = ownValue(projection, "schemaVersion");
  const authoritySource = ownValue(projection, "authoritySource");
  const role = ownValue(projection, "role");
  const code = ownValue(projection, "state");
  const caseLabel = ownValue(projection, "caseLabel");
  const basisLabel = ownValue(projection, "basisLabel");
  const updatedAtLabel = ownValue(projection, "updatedAtLabel");
  const recordedEvent = ownValue(projection, "recordedEvent");
  const activePrimaryVendorCount = ownValue(projection, "activePrimaryVendorCount");
  const viewerIsPrimaryVendor = ownValue(projection, "viewerIsPrimaryVendor");
  const accessStatus = ownValue(projection, "accessStatus");
  const state = ownValue(VENDOR_CASE_BINDING_STATES, code);

  if (
    schemaVersion !== "laibe.vendor-case-binding-read.v1"
    || authoritySource !== "SAME_ORIGIN_SERVER_PROJECTION"
    || role !== "pro"
    || !state
    || !safeIdentityText(caseLabel)
    || !safeIdentityText(basisLabel)
    || !safeIdentityText(updatedAtLabel)
    || recordedEvent !== true
  ) {
    return unavailableVendorCaseBindingProjection();
  }

  const isPreBinding = code === "VALID_INVITE"
    || code === "DECLINED"
    || code === "ACCEPTED_AWAITING_OWNER";
  const isFormallyBound = code === "FORMALLY_BOUND";
  const isStopped = code === "ACCESS_STOPPED"
    || code === "TERMINATION_CONFIRMED"
    || code === "TERMINATION_DISPUTED";
  const primaryVendorExact = isFormallyBound
    ? activePrimaryVendorCount === 1 && viewerIsPrimaryVendor === true && accessStatus === "active"
    : activePrimaryVendorCount === 0
      && viewerIsPrimaryVendor === false
      && ((isPreBinding && accessStatus === "not-yet-granted") || (isStopped && accessStatus === "stopped"));

  if (!primaryVendorExact) return unavailableVendorCaseBindingProjection();
  return vendorCaseBindingProjectionResult(
    state,
    caseLabel,
    basisLabel,
    updatedAtLabel,
    true,
  );
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

export const AUTHORIZED_VENDOR_WORKSPACE = workspaceState({
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

function closeWriteControls(scope) {
  let controls;
  try {
    controls = scope.querySelectorAll("[data-write-action]");
  } catch {
    return false;
  }
  let length = 0;
  try {
    length = controls.length;
  } catch {
    return false;
  }
  if (typeof length !== "number" || length < 0 || length > 64 || length % 1 !== 0) {
    return false;
  }
  for (let index = 0; index < length; index += 1) closeControl(controls[index]);
  return true;
}

function vendorCaseBindingNode(root, selector) {
  try {
    return root?.querySelector?.(selector) ?? null;
  } catch {
    return null;
  }
}

function setVendorCaseBindingText(root, selector, value) {
  const node = vendorCaseBindingNode(root, selector);
  if (!node) return;
  try {
    node.textContent = value;
  } catch {
    // Static product copy remains available when a node cannot be updated.
  }
}

function setVendorCaseBindingGroupVisibility(root, mode, visible) {
  const group = vendorCaseBindingNode(root, `[data-vendor-binding-actions="${mode}"]`);
  if (!group) return;
  try {
    group.hidden = !visible;
  } catch {
    // The static groups are hidden, so a failed update stays fail-closed.
  }
}

export function renderVendorCaseBinding(root, projection = null) {
  const view = resolveVendorCaseBindingProjection(projection);
  const state = ownValue(view, "state") ?? VENDOR_CASE_BINDING_CONTEXT_UNAVAILABLE;
  const panel = vendorCaseBindingNode(root, "[data-vendor-case-binding-panel]");
  try {
    panel?.setAttribute?.("data-vendor-binding-state", ownValue(state, "code"));
  } catch {
    // The panel starts in the unavailable state.
  }

  setVendorCaseBindingText(root, "[data-vendor-binding-case]", ownValue(view, "caseLabel"));
  setVendorCaseBindingText(root, "[data-vendor-binding-title]", ownValue(state, "title"));
  setVendorCaseBindingText(root, "[data-vendor-binding-summary]", ownValue(state, "summary"));
  setVendorCaseBindingText(root, "[data-vendor-binding-status]", ownValue(state, "statusLabel"));
  setVendorCaseBindingText(root, "[data-vendor-binding-responsible]", ownValue(state, "responsible"));
  setVendorCaseBindingText(root, "[data-vendor-binding-next-step]", ownValue(state, "nextStep"));
  setVendorCaseBindingText(root, "[data-vendor-binding-record]", ownValue(state, "recordTruth"));
  setVendorCaseBindingText(root, "[data-vendor-binding-basis]", ownValue(view, "basisLabel"));
  setVendorCaseBindingText(root, "[data-vendor-binding-updated]", ownValue(view, "updatedAtLabel"));
  setVendorCaseBindingText(
    root,
    "[data-vendor-binding-action-status]",
    "正式回覆入口開放後，才會依你的選擇更新案件紀錄。",
  );

  let actions = null;
  try {
    actions = root?.querySelectorAll?.("[data-vendor-binding-action]") ?? null;
  } catch {
    actions = null;
  }
  let actionCount = null;
  try {
    const length = actions?.length;
    if (typeof length === "number" && length >= 0 && length <= 16 && length % 1 === 0) {
      actionCount = length;
    }
  } catch {
    actionCount = null;
  }
  if (actionCount !== null) {
    for (let index = 0; index < actionCount; index += 1) closeControl(actions[index]);
  }

  const actionMode = ownValue(state, "actionMode");
  setVendorCaseBindingGroupVisibility(root, "invite", actionMode === "invite");
  setVendorCaseBindingGroupVisibility(root, "termination", actionMode === "termination");
  return view;
}

function resolveVendorView(root) {
  try {
    if (root.defaultView) return root.defaultView;
  } catch {
    // A cloned Element normally resolves its view through ownerDocument.
  }
  try {
    return root.ownerDocument?.defaultView ?? null;
  } catch {
    return null;
  }
}

export function bindVendorWorkspaceRecoveryRoute(
  root,
  routeGetter = getActiveCanonicalLinkHref,
) {
  let action = null;
  try {
    action = root?.querySelector?.("[data-vendor-access-recovery]") ?? null;
  } catch {
    action = null;
  }
  if (!action) return null;

  let href = null;
  try {
    href = typeof routeGetter === "function"
      ? routeGetter(VENDOR_WORKSPACE_ACCESS_RECOVERY_LINK_ID)
      : null;
  } catch {
    href = null;
  }

  if (href === VENDOR_WORKSPACE_ACCESS_RECOVERY_MANIFEST_HREF) {
    try {
      action.setAttribute("href", VENDOR_WORKSPACE_ACCESS_RECOVERY_CANONICAL_HREF);
      action.setAttribute("aria-disabled", "false");
      return VENDOR_WORKSPACE_ACCESS_RECOVERY_CANONICAL_HREF;
    } catch {
      // Fall through and remove any partial or stale navigation target.
    }
  }

  try {
    action.removeAttribute("href");
  } catch {
    // Static markup has no fallback href, so navigation remains closed.
  }
  try {
    action.setAttribute("aria-disabled", "true");
  } catch {
    // Missing route state must never create a guessed destination.
  }
  return null;
}

function resetVendorWorkspace(root) {
  try {
    root.body?.setAttribute("data-vendor-state", CONTEXT_UNAVAILABLE.code);
  } catch {
    // Continue clearing any previously published authorized surface.
  }

  renderVendorCaseBinding(root);
  closeWriteControls(root);

  let mount = null;
  let gate = null;
  let headerState = null;
  try {
    mount = root.querySelector("#vendor-authorized-workspace-mount");
  } catch {
    mount = null;
  }
  try {
    gate = root.querySelector("#invited-cases");
  } catch {
    gate = null;
  }
  try {
    headerState = root.querySelector("[data-vendor-header-state]");
  } catch {
    headerState = null;
  }

  try {
    mount?.replaceChildren();
  } catch {
    // Controls were closed before the failed clear attempt.
  }
  try {
    if (mount) mount.hidden = true;
  } catch {
    // Clearing remains the primary stale-workspace revocation.
  }
  try {
    if (gate) gate.hidden = false;
  } catch {
    // The static gate is visible unless an earlier authorized render hid it.
  }
  try {
    if (headerState) headerState.textContent = "身分與案件範圍尚待確認";
  } catch {
    // The static header already carries the closed-state copy.
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
  if (intent === "REQUEST_DRS_REVIEW") return "請萊比協助整理風險";
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
  if (fragment === "#contracts") return "contract";
  if (
    fragment === "#documents" ||
    fragment === "#reviews" ||
    fragment === "#records" ||
    resolveVendorContractViewFromFragment(fragment)
  ) {
    return "design";
  }
  return null;
}

export function resolveVendorContractViewFromFragment(fragment) {
  if (fragment === "#reviews" || fragment === "#records") return "records";
  if (fragment === "#documents") return "overview";
  if (fragment === "#vendor-contract-view-panel-overview") return "overview";
  if (fragment === "#vendor-contract-view-panel-reply") return "reply";
  if (fragment === "#vendor-contract-view-panel-decision") return "decision";
  if (fragment === "#vendor-contract-view-panel-records") return "records";
  return null;
}

export function resolveVendorWorkSubtabFromFragment(fragment) {
  if (fragment === "#documents") {
    return freezeRecord([["scope", "design"], ["key", "drawings"]]);
  }
  if (fragment === "#reviews" || fragment === "#records") {
    return freezeRecord([["scope", "design"], ["key", "records"]]);
  }
  if (fragment === "#execution") {
    return freezeRecord([["scope", "construction"], ["key", "today"]]);
  }
  if (
    fragment === "#vendor-contract-view-panel-overview"
    || fragment === "#vendor-contract-view-panel-reply"
    || fragment === "#vendor-contract-view-panel-decision"
  ) {
    return freezeRecord([["scope", "design"], ["key", "contract"]]);
  }
  if (fragment === "#vendor-contract-view-panel-records") {
    return freezeRecord([["scope", "design"], ["key", "records"]]);
  }
  return null;
}

function vendorWorkSubtabLabel(scope, key) {
  if (scope === "design") {
    if (key === "today") return "今日待辦";
    if (key === "drawings") return "圖面與版本";
    if (key === "contract") return "契約與回覆";
    return "決策留痕";
  }
  if (key === "today") return "今日任務";
  if (key === "changes") return "變更與驗收";
  if (key === "files") return "施工文件與照片";
  return "案件留痕";
}

export function initializeVendorWorkSubtabs(root) {
  let tabs;
  let panels;
  let liveTarget;
  try {
    tabs = root.querySelectorAll("[data-vendor-work-subtab]");
    panels = root.querySelectorAll("[data-vendor-work-subpanel]");
    liveTarget = root.querySelector("[data-vendor-workspace-live]");
  } catch {
    return null;
  }
  if (!tabs || !panels || tabs.length !== 8 || panels.length !== 8) return null;

  const activeKeys = {
    design: "today",
    construction: "today",
  };

  function activate(scope, nextKey, shouldFocus = false) {
    if (!isVendorWorkSubtabKey(scope, nextKey)) return false;
    activeKeys[scope] = nextKey;
    for (let index = 0; index < tabs.length; index += 1) {
      const tab = tabs[index];
      try {
        if (tab.dataset.vendorWorkScope !== scope) continue;
        const selected = tab.dataset.vendorWorkSubtab === nextKey;
        tab.setAttribute("aria-selected", selected ? "true" : "false");
        tab.tabIndex = selected ? 0 : -1;
        if (selected && shouldFocus) tab.focus();
      } catch {
        // Static tab state remains readable.
      }
    }
    for (let index = 0; index < panels.length; index += 1) {
      const panel = panels[index];
      try {
        if (panel.dataset.vendorWorkScope !== scope) continue;
        panel.hidden = panel.dataset.vendorWorkSubpanel !== nextKey;
      } catch {
        // Unknown panels remain in their static hidden state.
      }
    }
    if (liveTarget) {
      try {
        liveTarget.textContent = `已切換至${vendorWorkSubtabLabel(scope, nextKey)}。`;
      } catch {
        // Visible selected state remains the primary announcement.
      }
    }
    return true;
  }

  function activateFromFragment(fragment, shouldFocus = false) {
    const selection = resolveVendorWorkSubtabFromFragment(fragment);
    if (!selection) return false;
    return activate(selection.scope, selection.key, shouldFocus);
  }

  for (let index = 0; index < tabs.length; index += 1) {
    const tab = tabs[index];
    try {
      tab.addEventListener("click", () => {
        activate(tab.dataset.vendorWorkScope, tab.dataset.vendorWorkSubtab, false);
      });
      tab.addEventListener("keydown", (event) => {
        const scope = tab.dataset.vendorWorkScope;
        const current = activeKeys[scope];
        const nextKey = resolveVendorWorkSubtabKey(scope, current, event?.key);
        if (!nextKey || nextKey === current) return;
        event?.preventDefault?.();
        activate(scope, nextKey, true);
      });
    } catch {
      continue;
    }
  }

  activate("design", "today", false);
  activate("construction", "today", false);
  return freezeRecord([
    ["activate", activate],
    ["activateFromFragment", activateFromFragment],
  ]);
}

export function initializeVendorContractViewTabs(root) {
  let tabs;
  let panels;
  let liveTarget;
  try {
    tabs = root.querySelectorAll("[data-vendor-contract-view]");
    panels = root.querySelectorAll("[data-vendor-contract-view-panel]");
    liveTarget = root.querySelector("[data-vendor-workspace-live]");
  } catch {
    return null;
  }
  if (
    !tabs
    || !panels
    || tabs.length !== VENDOR_CONTRACT_VIEW_KEYS.length
    || panels.length !== VENDOR_CONTRACT_VIEW_KEYS.length
  ) {
    return null;
  }

  let activeView = "overview";

  function activate(nextView, shouldFocus = false) {
    if (!isVendorContractViewKey(nextView)) return false;
    activeView = nextView;
    for (let index = 0; index < tabs.length; index += 1) {
      const tab = tabs[index];
      try {
        const selected = tab.dataset.vendorContractView === activeView;
        tab.setAttribute("aria-selected", selected ? "true" : "false");
        tab.tabIndex = selected ? 0 : -1;
        if (selected && shouldFocus) tab.focus();
      } catch {
        // Static tab state remains readable.
      }
    }
    for (let index = 0; index < panels.length; index += 1) {
      try {
        panels[index].hidden = panels[index].dataset.vendorContractViewPanel !== activeView;
      } catch {
        // Unknown panels remain in their static hidden state.
      }
    }
    if (liveTarget) {
      const label = activeView === "overview"
        ? "契約總覽"
        : activeView === "reply"
          ? "待我回覆"
          : activeView === "decision"
            ? "變更與決定"
            : "版本與紀錄";
      try {
        liveTarget.textContent = `已切換至${label}。`;
      } catch {
        // The selected tab and visible panel remain the primary state.
      }
    }
    return true;
  }

  for (let index = 0; index < tabs.length; index += 1) {
    const tab = tabs[index];
    try {
      tab.addEventListener("click", () => {
        activate(tab.dataset.vendorContractView, false);
      });
      tab.addEventListener("keydown", (event) => {
        const nextView = resolveVendorContractViewKey(activeView, event?.key);
        if (nextView === activeView) return;
        event.preventDefault?.();
        activate(nextView, true);
      });
    } catch {
      continue;
    }
  }

  const view = resolveVendorView(root);
  const selectFromFragment = () => {
    let fragment = "";
    try {
      fragment = view?.location?.["hash"] ?? "";
    } catch {
      fragment = "";
    }
    const nextView = resolveVendorContractViewFromFragment(fragment);
    if (nextView) activate(nextView, false);
  };
  try {
    view?.addEventListener("hashchange", selectFromFragment);
  } catch {
    // Manual task tabs remain available.
  }

  activate("overview", false);
  selectFromFragment();
  return freezeRecord([["activate", activate]]);
}

export function initializeVendorWorkspaceTabs(
  root,
  contractController = null,
  workSubtabController = null,
) {
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
  if (
    !tabs
    || !panels
    || tabs.length !== VENDOR_WORKSPACE_TAB_KEYS.length
    || panels.length !== VENDOR_WORKSPACE_TAB_KEYS.length
  ) return;

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
        tab.classList?.toggle?.("on", active);
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
        ? "設計管理"
        : activeTab === "contract"
          ? "契約管理"
          : "工程管理";
      try {
        liveTarget.textContent = `已切換至${label}。`;
      } catch {
        // Live-region failure does not grant workspace authority.
      }
    }
  }

  function updateRouteCurrent(fragment) {
    if (!routeLinks) return;
    let routeLength = 0;
    try {
      routeLength = routeLinks.length;
    } catch {
      return;
    }
    for (let index = 0; index < routeLength; index += 1) {
      const link = routeLinks[index];
      let selected = false;
      try {
        selected = link.getAttribute("href") === fragment;
        if (selected) {
          link.setAttribute("aria-current", "location");
        } else if (typeof link.removeAttribute === "function") {
          link.removeAttribute("aria-current");
        } else {
          link.setAttribute("aria-current", "false");
        }
      } catch {
        continue;
      }
    }
  }

  function activateFragment(fragment, shouldFocus) {
    const key = resolveVendorWorkspaceTabForFragment(fragment);
    if (!key) return false;
    activate(key, shouldFocus);
    const childView = resolveVendorContractViewFromFragment(fragment);
    if (childView) {
      try {
        contractController?.activate?.(childView, false);
      } catch {
        // Parent panel remains visible if the child controller is unavailable.
      }
    }
    try {
      workSubtabController?.activateFromFragment?.(fragment, false);
    } catch {
      // Parent panel and direct fragment target remain available.
    }
    updateRouteCurrent(fragment);
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
        if (key) {
          activate(key, false);
          updateRouteCurrent("");
        }
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
        updateRouteCurrent("");
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

  const view = resolveVendorView(root);
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

export function initializeVendorWorkspace(
  root,
  renderState = CONTEXT_UNAVAILABLE,
  _vendorCalendarGrant = undefined,
  vendorAuthRuntime = null,
) {
  if (!root) return CONTEXT_UNAVAILABLE;
  const trustedAuthorized = renderState === AUTHORIZED_VENDOR_WORKSPACE;
  resetVendorWorkspace(root);
  bindVendorWorkspaceRecoveryRoute(root);
  if (!trustedAuthorized) {
    return CONTEXT_UNAVAILABLE;
  }

  let template;
  let mount;
  try {
    template = root.querySelector("#vendor-authorized-workspace-template");
    mount = root.querySelector("#vendor-authorized-workspace-mount");
  } catch {
    return CONTEXT_UNAVAILABLE;
  }
  if (!template?.content || !mount || typeof mount.replaceChildren !== "function") {
    return CONTEXT_UNAVAILABLE;
  }
  let fragment;
  try {
    fragment = template.content.cloneNode(true);
    if (!closeWriteControls(fragment)) return CONTEXT_UNAVAILABLE;
    mount.replaceChildren(fragment);
  } catch {
    resetVendorWorkspace(root);
    return CONTEXT_UNAVAILABLE;
  }

  try {
    if (!closeWriteControls(mount)) throw new Error("workspace controls unavailable");
    const contractController = initializeVendorContractViewTabs(mount);
    const workSubtabController = initializeVendorWorkSubtabs(mount);
    initializeVendorWorkspaceTabs(mount, contractController, workSubtabController);
    initializeVendorDocumentSharing(mount);
    const documentStorageController = initializeVendorDocumentStorage(mount);
    initializeVendorDocumentImport(mount, documentStorageController);
    initializeVendorCalendarLoading(mount);
    initializeVendorGoogleCalendarActions(mount, { authRuntime: vendorAuthRuntime });
    root.body?.setAttribute("data-vendor-state", AUTHORIZED_VENDOR_WORKSPACE.code);
    const gate = root.querySelector("#invited-cases");
    if (gate) gate.hidden = true;
    const headerState = root.querySelector("[data-vendor-header-state]");
    if (headerState) headerState.textContent = "案件工作台已開啟";
    mount.hidden = false;
  } catch {
    resetVendorWorkspace(root);
    return CONTEXT_UNAVAILABLE;
  }
  return AUTHORIZED_VENDOR_WORKSPACE;
}

export async function initializeVendorWorkspaceFromServer(root, authRuntime = null) {
  initializeVendorWorkspace(root);
  const grant = await fetchVendorWorkspaceGrant(authRuntime);
  if (!grant) return CONTEXT_UNAVAILABLE;

  const workspaceState = initializeVendorWorkspace(
    root,
    AUTHORIZED_VENDOR_WORKSPACE,
    undefined,
    authRuntime,
  );
  if (workspaceState !== AUTHORIZED_VENDOR_WORKSPACE) {
    return workspaceState;
  }
  await refreshVendorCalendarSupportFromServer(root, authRuntime);
  return workspaceState;
}

const documentRoot = resolveVendorDocument(globalThis);
if (documentRoot) void initializeVendorWorkspaceFromServer(documentRoot);
