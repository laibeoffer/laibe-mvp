const GOVERNANCE_DESTINATION =
  "http://127.0.0.1:8766/drs_standalone/specialist_workspace/code.html?ui=obsidian-bloom-20260829";
const DEFAULT_ORIGIN = "http://127.0.0.1:8766";
const SESSION_ENDPOINT = "/functions/v1/drs-session-bootstrap";
const REVIEWER_GRANT_ENDPOINT = "/functions/v1/drs-workspace-grant";
const LINE_ACCOUNT_LINK_ENDPOINTS = Object.freeze({
  start: "/functions/v1/drs-line-account-link-start",
  status: "/functions/v1/drs-line-account-link-status",
  cancel: "/functions/v1/drs-line-account-link-cancel",
  unlink: "/functions/v1/drs-line-account-link-unlink",
});
const LINE_NEXT_ACTIONS = Object.freeze({
  not_linked: "relink",
  expired: "relink",
  cancelled: "relink",
  conflict_line_already_bound: "relink",
  conflict_drs_already_bound: "relink",
  linked: "unlink",
  revoked: "relink",
  temporarily_unavailable: "retry",
});

const LINE_ACCOUNT_LINK_COPY = Object.freeze({
  not_linked: Object.freeze({
    title: "尚未連結 LINE",
    label: "尚未連結",
    message: "連結後，萊比才能把你有權處理的案件送到正確收件匣。",
    waitingOn: "正在等待你完成身分確認",
    action: "連結我的 LINE",
  }),
  awaiting_line_confirmation: Object.freeze({
    title: "等待 LINE 確認",
    label: "等待確認",
    message: "請回到 LINE 完成確認；完成前不會新增案件權限。",
    waitingOn: "正在等待 LINE 回覆確認",
    action: "重新查看狀態",
  }),
  linked: Object.freeze({
    title: "LINE 已連結",
    label: "已連結",
    message: "新案件預設由一般審查員處理，案件範圍仍由萊比確認。",
    waitingOn: "正在等待案件授權或新的審查通知",
    action: "解除連結",
  }),
  expired: Object.freeze({
    title: "確認時間已到",
    label: "已逾時",
    message: "本次確認已失效；重新開始前會再次核對你的登入狀態。",
    waitingOn: "正在等待你重新開始",
    action: "重新開始",
  }),
  cancelled: Object.freeze({
    title: "本次連結已取消",
    label: "已取消",
    message: "沒有建立新的連結，也沒有變更案件權限。",
    waitingOn: "正在等待你決定是否重新開始",
    action: "重新開始",
  }),
  conflict_line_already_bound: Object.freeze({
    title: "此 LINE 已有連結",
    label: "需要核對",
    message: "為保護案件資料，請由萊比協助核對既有連結。",
    waitingOn: "正在等待萊比核對身分",
    action: "查看處理方式",
  }),
  conflict_drs_already_bound: Object.freeze({
    title: "審查員身分已有連結",
    label: "需要核對",
    message: "目前身分已連結其他 LINE，變更前需要再次核對。",
    waitingOn: "正在等待萊比核對既有連結",
    action: "查看處理方式",
  }),
  permission_denied: Object.freeze({
    title: "目前無法進行連結",
    label: "尚未開放",
    message: "你的審查員資格或案件範圍尚未完成確認。",
    waitingOn: "正在等待資格與案件範圍確認",
    action: "重新確認登入狀態",
  }),
  specialist_inactive: Object.freeze({
    title: "審查員資格目前未啟用",
    label: "資格未啟用",
    message: "請先完成資格核對；LINE 連結不會自動建立審查權限。",
    waitingOn: "正在等待資格管理人員處理",
    action: "查看目前狀態",
  }),
  temporarily_unavailable: Object.freeze({
    title: "LINE 案件分流正在整理中",
    label: "請先完成 Gmail 登入",
    message:
      "請先完成 Gmail 登入；此功能正在整理中，正式開放後會提供完整操作入口。",
    waitingOn: "正在等待你完成 Gmail 登入或連結入口準備完成",
    action: "稍後再試",
  }),
  unlinking: Object.freeze({
    title: "正在解除連結",
    label: "處理中",
    message: "完成前不會改用其他 LINE 收件，也不會變更案件權限。",
    waitingOn: "正在等待解除作業完成",
    action: "重新查看狀態",
  }),
  revoked: Object.freeze({
    title: "LINE 連結已撤銷",
    label: "已撤銷",
    message: "不會再透過原連結分流案件；重新連結前會再次核對身分。",
    waitingOn: "正在等待你重新確認身分",
    action: "重新開始",
  }),
});

const GRANT_KEYS = Object.freeze([
  "case",
  "next",
  "schemaVersion",
  "state",
  "workspaceAccess",
]);
const ACCESS_TOKEN = /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/u;
const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
const SAFE_STATUS = /^[A-Z][A-Z0-9_]{0,79}$/u;
const RFC3339 =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/u;

function owns(record, key) {
  return Object.prototype.hasOwnProperty.call(record, key);
}

function hasControlCharacter(value) {
  for (const character of value) {
    const code = character.codePointAt(0);
    if (code <= 31 || code === 127) return true;
  }
  return false;
}

function isPlainRecord(value) {
  return value !== null && typeof value === "object" &&
    Object.getPrototypeOf(value) === Object.prototype;
}

function hasExactKeys(record, keys) {
  if (!isPlainRecord(record)) return false;
  const actual = Object.keys(record).sort();
  return actual.length === keys.length &&
    keys.every((key, index) => actual[index] === key);
}

function isExactJsonResponse(response, expectedUrl) {
  if (
    !(response instanceof Response) || response.status !== 200 ||
    response.url !== expectedUrl
  ) return false;
  return response.headers.get("content-type")?.split(";", 1)[0]?.trim()
    .toLowerCase() === "application/json";
}

async function readExactJson(response, expectedUrl) {
  if (!isExactJsonResponse(response, expectedUrl)) return null;
  try {
    const body = await response.json();
    return isPlainRecord(body) ? body : null;
  } catch {
    return null;
  }
}

async function readLineStatusJson(response, expectedUrl) {
  if (
    !(response instanceof Response) || response.url !== expectedUrl ||
    response.headers.get("content-type")?.split(";", 1)[0]?.trim()
        .toLowerCase() !== "application/json"
  ) return null;
  let body;
  try {
    body = await response.json();
  } catch {
    return null;
  }
  if (!isPlainRecord(body)) return null;
  if (response.status === 200) return body;
  if (response.status === 401 || response.status === 403) {
    return hasExactKeys(body, ["state"]) &&
        body.state === "permission_denied"
      ? body
      : null;
  }
  if (response.status === 503) {
    return hasExactKeys(body, ["nextAction", "state"]) &&
        body.state === "temporarily_unavailable" &&
        body.nextAction === "retry"
      ? body
      : null;
  }
  return null;
}

function validSessionResponse(response, expectedUrl, now) {
  if (
    !(response instanceof Response) || response.status !== 204 ||
    response.url !== expectedUrl
  ) return null;
  const authorization = response.headers.get("authorization") ?? "";
  const expiresAtValue = response.headers.get("x-laibe-session-expires-at") ??
    "";
  if (
    !authorization.startsWith("Bearer ") ||
    !ACCESS_TOKEN.test(authorization.slice(7))
  ) return null;
  if (!RFC3339.test(expiresAtValue)) return null;
  const expiresAt = Date.parse(expiresAtValue);
  if (!Number.isFinite(expiresAt) || expiresAt <= now) return null;
  return Object.freeze({ authorization, expiresAt });
}

function validGrant(body) {
  return hasExactKeys(body, GRANT_KEYS) &&
    body.schemaVersion === "laibe.drs-workspace-auth.v1" &&
    body.state === "AUTHORIZED_DRS_WORKSPACE" &&
    hasExactKeys(body.case, ["id", "status"]) &&
    typeof body.case.id === "string" && UUID.test(body.case.id) &&
    typeof body.case.status === "string" &&
    SAFE_STATUS.test(body.case.status) &&
    hasExactKeys(body.workspaceAccess, [
      "accountRole",
      "mode",
      "mutationAllowed",
      "writeActionsEnabled",
    ]) &&
    body.workspaceAccess.accountRole === "drs" &&
    body.workspaceAccess.mode === "read_only" &&
    body.workspaceAccess.mutationAllowed === false &&
    body.workspaceAccess.writeActionsEnabled === false &&
    hasExactKeys(body.next, ["action", "actor"]) &&
    body.next.actor === "drs_specialist" &&
    body.next.action === "REVIEW_AUTHORIZED_CASE_RECORDS";
}

function sessionPost() {
  return fetch(SESSION_ENDPOINT, {
    method: "POST",
    credentials: "include",
    cache: "no-store",
    headers: Object.freeze({ "content-type": "application/json" }),
    body: "{}",
  });
}

function grantPost({ authorization }) {
  return fetch(REVIEWER_GRANT_ENDPOINT, {
    method: "POST",
    credentials: "include",
    cache: "no-store",
    headers: Object.freeze({
      authorization,
      "content-type": "application/json",
    }),
    body: "{}",
  });
}

function lineRequestFromBrowser({ method, url, headers }) {
  return fetch(url, {
    method,
    credentials: "include",
    cache: "no-store",
    headers,
    body: method === "POST" ? "{}" : undefined,
  });
}

function validLineDate(value) {
  if (
    typeof value !== "string" || !RFC3339.test(value) ||
    !Number.isFinite(Date.parse(value))
  ) return false;
  return true;
}

function validLineLaunchUrl(value) {
  if (typeof value !== "string" || value.length < 1 || value.length > 512) {
    return false;
  }
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.username === "" &&
      url.password === "" && url.port === "" &&
      (url.hostname === "line.me" || url.hostname.endsWith(".line.me"));
  } catch {
    return false;
  }
}

function validLineStatus(body) {
  if (!isPlainRecord(body) || typeof body.state !== "string") return null;
  const { state } = body;
  if (!owns(LINE_ACCOUNT_LINK_COPY, state)) return null;
  if (state === "awaiting_line_confirmation") {
    if (
      !hasExactKeys(body, [
        "botLaunchUrl",
        "expiresAt",
        "nextAction",
        "state",
      ]) || !validLineDate(body.expiresAt) ||
      body.nextAction !== "continue_in_line" ||
      !validLineLaunchUrl(body.botLaunchUrl)
    ) return null;
    return Object.freeze({ state, botLaunchUrl: body.botLaunchUrl });
  }
  if (state === "linked") {
    if (
      !hasExactKeys(body, ["linkedAt", "nextAction", "state"]) ||
      !validLineDate(body.linkedAt) || body.nextAction !== "unlink"
    ) return null;
    return Object.freeze({ state });
  }
  if (state === "revoked") {
    if (
      !hasExactKeys(body, ["nextAction", "revokedAt", "state"]) ||
      !validLineDate(body.revokedAt) || body.nextAction !== "relink"
    ) return null;
    return Object.freeze({ state });
  }
  const nextAction = LINE_NEXT_ACTIONS[state];
  if (nextAction !== undefined) {
    if (
      !hasExactKeys(body, ["state"]) &&
      (!hasExactKeys(body, ["nextAction", "state"]) ||
        body.nextAction !== nextAction)
    ) return null;
    return Object.freeze({ state });
  }
  return hasExactKeys(body, ["state"]) ? Object.freeze({ state }) : null;
}

function defaultNavigate(href) {
  globalThis.location?.assign?.(href);
}

export function sanitizeLineAccountLinkState(input) {
  if (!isPlainRecord(input) || !owns(input, "state")) {
    return Object.freeze({
      state: "temporarily_unavailable",
      ...LINE_ACCOUNT_LINK_COPY.temporarily_unavailable,
    });
  }
  for (const value of Object.values(input)) {
    if (typeof value === "string" && hasControlCharacter(value)) {
      return Object.freeze({
        state: "permission_denied",
        ...LINE_ACCOUNT_LINK_COPY.permission_denied,
      });
    }
  }
  const state =
    typeof input.state === "string" && owns(LINE_ACCOUNT_LINK_COPY, input.state)
      ? input.state
      : "temporarily_unavailable";
  return Object.freeze({ state, ...LINE_ACCOUNT_LINK_COPY[state] });
}

export function createReviewerAccessTransport(options = {}) {
  const now = typeof options.now === "function" ? options.now : Date.now;
  const browserOrigin = typeof globalThis.location?.origin === "string" &&
      globalThis.location.origin !== "null"
    ? globalThis.location.origin
    : DEFAULT_ORIGIN;
  const expectedSessionUrl = new URL(SESSION_ENDPOINT, browserOrigin).href;
  const expectedGrantUrl = new URL(REVIEWER_GRANT_ENDPOINT, browserOrigin).href;
  const secureSessionBootstrap =
    typeof options.secureSessionBootstrap === "function"
      ? options.secureSessionBootstrap
      : sessionPost;
  const reviewerWorkspaceGrant =
    typeof options.reviewerWorkspaceGrant === "function"
      ? options.reviewerWorkspaceGrant
      : grantPost;
  const navigate = typeof options.navigate === "function"
    ? options.navigate
    : defaultNavigate;
  const openLine = typeof options.openLine === "function"
    ? options.openLine
    : defaultNavigate;
  const lineAccountLinkRequest =
    typeof options.lineAccountLinkRequest === "function"
      ? options.lineAccountLinkRequest
      : ({ request }) => lineRequestFromBrowser(request);
  const expectedLineUrls = Object.freeze(
    Object.fromEntries(
      Object.entries(LINE_ACCOUNT_LINK_ENDPOINTS).map(([operation, path]) => [
        operation,
        new URL(path, browserOrigin).href,
      ]),
    ),
  );
  let lineState = sanitizeLineAccountLinkState({
    state: "temporarily_unavailable",
  });
  let workspaceAuthority = null;
  let lineAuthority = null;
  let lineOperation = null;

  function unavailable(message) {
    return Promise.resolve(Object.freeze({ state: "unavailable", message }));
  }

  function resetWorkspaceAccess() {
    workspaceAuthority = null;
    lineAuthority = null;
    lineState = sanitizeLineAccountLinkState({
      state: "temporarily_unavailable",
    });
    return lineState;
  }

  function currentWorkspaceAuthority() {
    if (workspaceAuthority === null) return null;
    if (workspaceAuthority.expiresAt <= now()) {
      resetWorkspaceAccess();
      return null;
    }
    return workspaceAuthority;
  }

  function currentLineAuthority() {
    const authority = currentWorkspaceAuthority();
    if (authority === null || lineAuthority === null) return null;
    return lineAuthority;
  }

  async function invokeLineOperation(operation) {
    const authority = currentLineAuthority();
    if (authority === null) return lineState;
    const endpoint = expectedLineUrls[operation];
    const method = operation === "status" ? "GET" : "POST";
    const request = method === "POST"
      ? Object.freeze({
        method,
        url: endpoint,
        body: "{}",
        headers: Object.freeze({
          authorization: authority.authorization,
          "content-type": "application/json",
        }),
      })
      : Object.freeze({
        method,
        url: endpoint,
        headers: Object.freeze({ authorization: authority.authorization }),
      });
    try {
      const response = await lineAccountLinkRequest(
        Object.freeze({ operation, request }),
      );
      const body = await readLineStatusJson(response, endpoint);
      const next = validLineStatus(body);
      if (next === null) throw new Error("line_status_unavailable");
      lineState = sanitizeLineAccountLinkState({ state: next.state });
      if (next.state === "permission_denied") {
        workspaceAuthority = null;
        lineAuthority = null;
      }
      if (operation === "start" && next.botLaunchUrl !== undefined) {
        openLine(next.botLaunchUrl);
      }
      return lineState;
    } catch {
      lineAuthority = null;
      lineState = sanitizeLineAccountLinkState({
        state: "temporarily_unavailable",
      });
      return lineState;
    }
  }

  function runLineOperation(operation) {
    if (lineOperation !== null) return lineOperation;
    lineOperation = invokeLineOperation(operation).finally(() => {
      lineOperation = null;
    });
    return lineOperation;
  }

  function lineOperationForCurrentState() {
    switch (lineState.state) {
      case "linked":
        return "unlink";
      case "awaiting_line_confirmation":
      case "unlinking":
      case "temporarily_unavailable":
        return "status";
      case "not_linked":
      case "expired":
      case "cancelled":
      case "revoked":
        return "start";
      default:
        return null;
    }
  }

  return Object.freeze({
    register() {
      return unavailable(
        "請先完成 Gmail 身分確認；註冊入口準備完成後可在此繼續。",
      );
    },
    login() {
      return unavailable(
        "審查員登入入口正在整理中，正式開放後會提供完整操作方式。",
      );
    },
    async resumeAccess() {
      resetWorkspaceAccess();
      try {
        const session = validSessionResponse(
          await secureSessionBootstrap(),
          expectedSessionUrl,
          now(),
        );
        if (session === null) return Object.freeze({ state: "denied" });
        const grant = await readExactJson(
          await reviewerWorkspaceGrant(session),
          expectedGrantUrl,
        );
        if (!validGrant(grant)) return Object.freeze({ state: "denied" });
        workspaceAuthority = session;
        lineAuthority = session;
        await runLineOperation("status");
        return Object.freeze({
          state: currentWorkspaceAuthority() === null ? "denied" : "authorized",
        });
      } catch {
        resetWorkspaceAccess();
        return Object.freeze({ state: "denied" });
      }
    },
    getLineAccountLinkState() {
      currentWorkspaceAuthority();
      return lineState;
    },
    refreshLineAccess() {
      currentWorkspaceAuthority();
      return lineState;
    },
    canRequestLineAccountLink() {
      return currentLineAuthority() !== null && lineOperation === null &&
        lineOperationForCurrentState() !== null;
    },
    requestLineAccountLink() {
      const operation = currentLineAuthority() !== null
        ? lineOperationForCurrentState()
        : null;
      return operation === null
        ? Promise.resolve(lineState)
        : runLineOperation(operation);
    },
    canCancelLineAccountLink() {
      return currentLineAuthority() !== null && lineOperation === null &&
        lineState.state === "awaiting_line_confirmation";
    },
    cancelLineAccountLink() {
      return currentLineAuthority() !== null && lineOperation === null &&
          lineState.state === "awaiting_line_confirmation"
        ? runLineOperation("cancel")
        : Promise.resolve(lineState);
    },
    canEnterWorkspace() {
      return currentWorkspaceAuthority() !== null;
    },
    enterWorkspace() {
      if (currentWorkspaceAuthority() === null) return false;
      navigate(GOVERNANCE_DESTINATION);
      return true;
    },
  });
}
