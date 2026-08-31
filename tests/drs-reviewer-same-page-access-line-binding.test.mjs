import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const sourceRoot = new URL(
  "../src/stitch_laibe_landing_onboarding/drs_standalone/reviewer_access/",
  import.meta.url,
);
const files = {
  html: new URL("code.html", sourceRoot),
  css: new URL("styles.css", sourceRoot),
  app: new URL("app.js", sourceRoot),
  transport: new URL("reviewer-access-transport.js", sourceRoot),
};

const exactDestination =
  "http://127.0.0.1:8766/drs_standalone/specialist_workspace/code.html?ui=obsidian-bloom-20260829";
const sessionUrl = "http://127.0.0.1:8766/functions/v1/drs-session-bootstrap";
const grantUrl = "http://127.0.0.1:8766/functions/v1/drs-workspace-grant";
const lineEndpoints = Object.freeze({
  start: "http://127.0.0.1:8766/functions/v1/drs-line-account-link-start",
  status: "http://127.0.0.1:8766/functions/v1/drs-line-account-link-status",
  cancel: "http://127.0.0.1:8766/functions/v1/drs-line-account-link-cancel",
  unlink: "http://127.0.0.1:8766/functions/v1/drs-line-account-link-unlink",
});
const caseId = "11111111-1111-4111-8111-111111111111";
const validToken = "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJkcnMifQ.signature_1";
const exactStates = [
  "not_linked",
  "awaiting_line_confirmation",
  "linked",
  "expired",
  "cancelled",
  "conflict_line_already_bound",
  "conflict_drs_already_bound",
  "permission_denied",
  "specialist_inactive",
  "temporarily_unavailable",
  "unlinking",
  "revoked",
];

function source(name) {
  return readFile(files[name], "utf8");
}

function visibleText(markup) {
  return markup
    .replace(/<script\b[\s\S]*?<\/script>/giu, " ")
    .replace(/<style\b[\s\S]*?<\/style>/giu, " ")
    .replace(/<[^>]+>/gu, " ")
    .replace(/&(?:nbsp|amp|lt|gt|quot|#39);/gu, " ")
    .replace(/\s+/gu, " ")
    .trim();
}

function exactJsonResponse(body, url, status = 200) {
  const response = new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
  Object.defineProperty(response, "url", { configurable: true, value: url });
  return response;
}

function exactSessionResponse(
  {
    expiresAt = "2026-08-29T04:15:00.000Z",
    token = validToken,
    url = sessionUrl,
  } = {},
) {
  const response = new Response(null, {
    status: 204,
    headers: {
      authorization: `Bearer ${token}`,
      "x-laibe-session-expires-at": expiresAt,
    },
  });
  Object.defineProperty(response, "url", { configurable: true, value: url });
  return response;
}

test("reviewer access keeps registration and login as two same-document anchors", async () => {
  const html = await source("html");
  assert.match(
    html,
    /<section\b[^>]*id="register"[^>]*data-access-panel="register"/u,
  );
  assert.match(
    html,
    /<section\b[^>]*id="login"[^>]*data-access-panel="login"/u,
  );
  assert.match(html, /href="#register"/u);
  assert.match(html, /href="#login"/u);
  assert.match(html, /<form\b[^>]*data-reviewer-form="register"/u);
  assert.match(html, /<form\b[^>]*data-reviewer-form="login"/u);
  assert.doesNotMatch(html, /<iframe\b/iu);
  assert.doesNotMatch(
    html,
    /<form\b[^>]*\baction\s*=|href="[^"]*(?:register|login)[^"#]*\.html/iu,
  );

  const app = await import(
    new URL(`./app.js?same-page=${Date.now()}`, sourceRoot)
  );
  assert.equal(app.resolveAccessAnchor("#register"), "register");
  assert.equal(app.resolveAccessAnchor("#login"), "login");
  assert.equal(app.resolveAccessAnchor("#LOGIN"), null);
  assert.equal(app.resolveAccessAnchor(""), null);
  assert.equal(app.resolveAccessAnchor("javascript:alert(1)"), null);
});

test("registration stays fail-closed until a Gmail identity producer is available", async () => {
  const [html, appSource] = await Promise.all([
    source("html"),
    source("app"),
  ]);
  assert.match(html, />\s*使用 Gmail 確認身分\s*</u);
  assert.doesNotMatch(
    html,
    /<(?:input|textarea|select)\b[^>]*(?:password|line-id|role|case|member|grant)/iu,
  );
  assert.doesNotMatch(html, /建立登入密碼|再次確認密碼|手填 LINE ID/u);
  assert.match(appSource, /const result = await transport\.register\(\);/u);
  assert.doesNotMatch(appSource, /transport\.register\(\s*\{/u);
  assert.doesNotMatch(appSource, /validateReviewerRegistration|validGmail/u);
});

test("reviewer access preserves the supplied LaiBE launcher visual language around the same-page flows", async () => {
  const [html, css] = await Promise.all([source("html"), source("css")]);

  assert.match(
    html,
    /<link\b[^>]*href="\.\.\/\.\.\/pcm_standalone\/shared\/drs-brand\.css\?v=20260810-drs-full-name"/u,
  );
  assert.match(
    html,
    /<header class="vendor-header" id="top">[\s\S]*?<div class="vendor-header__inner">[\s\S]*?<a\b[\s\S]*?class="vendor-brand"/u,
  );
  assert.match(
    html,
    /<img\b[^>]*src="\.\.\/\.\.\/\.\.\/\.\.\/assets\/logo\/laibe_offer\.svg"[^>]*alt="LaiBE"/u,
  );
  assert.match(
    html,
    /class="drs-brand-lockup drs-brand-lockup--expanded"[\s\S]*?class="drs-brand-wordmark"[\s\S]*?class="drs-brand-name">裝潢決策系統/u,
  );
  assert.match(
    html,
    /class="vendor-header__context"[\s\S]*?<span>目前角色<\/span><strong[^>]*>一般審查員<\/strong>[\s\S]*?<span>授權狀態<\/span><strong[^>]*>身分與案件範圍尚待確認<\/strong>/u,
  );

  for (
    const token of [
      "--bg: oklch(0.1338 0.0101 308.88)",
      "--surface: oklch(0.2399 0.0449 317.89)",
      "--fg: oklch(0.9550 0.0107 316.49)",
      "--accent: oklch(0.7557 0.1848 345.61)",
      "--login-accent: oklch(0.6576 0.2139 38.30)",
      "--paper: oklch(0.9550 0.0107 316.49)",
      '--font-display: "Noto Serif TC", "Source Han Serif TC", "PMingLiU", serif',
      '--font-ui: "Noto Sans TC", "Microsoft JhengHei", sans-serif',
    ]
  ) assert.ok(css.includes(token), token);

  assert.match(
    css,
    /\.access-card\s*\{[\s\S]*?backdrop-filter:\s*blur\(18px\) saturate\(1\.2\)/u,
  );
  assert.match(
    css,
    /\.access-card\[data-access-trigger="register"\]\s*\{[\s\S]*?--card-accent:\s*var\(--accent\)/u,
  );
  assert.match(
    css,
    /\.access-card\[data-access-trigger="login"\]\s*\{[\s\S]*?--card-accent:\s*var\(--login-accent\)/u,
  );
  assert.match(
    css,
    /\.card-number\s*\{[\s\S]*?font-size:\s*clamp\(8rem,\s*14vw,\s*12\.5rem\)/u,
  );
  assert.match(
    css,
    /\.access-form\s*\{[\s\S]*?background:\s*var\(--paper\)[\s\S]*?color:\s*var\(--paper-ink\)[\s\S]*?border-radius:\s*10px/u,
  );
  assert.match(
    css,
    /\.vendor-header\s*\{[\s\S]*?position:\s*sticky[\s\S]*?min-block-size:\s*70px[\s\S]*?backdrop-filter:\s*blur\(16px\)/u,
  );
  assert.match(
    css,
    /\.vendor-header__inner\s*\{[\s\S]*?inline-size:\s*var\(--workspace-shell\)[\s\S]*?min-block-size:\s*70px/u,
  );
});

test("reviewer access presents compact registration and login forms side by side without explanatory panels", async () => {
  const [html, css, app] = await Promise.all([
    source("html"),
    source("css"),
    source("app"),
  ]);

  assert.match(
    html,
    /<section\b[^>]*class="inline-workspace access-form-grid"[^>]*>[\s\S]*?<section\b[^>]*id="register"[^>]*data-access-panel="register"[\s\S]*?<form\b[^>]*data-reviewer-form="register"[\s\S]*?<section\b[^>]*id="login"[^>]*data-access-panel="login"[\s\S]*?<form\b[^>]*data-reviewer-form="login"[\s\S]*?<section class="line-panel"/u,
  );
  assert.doesNotMatch(
    html,
    /class="(?:panel-heading|status-strip|process-steps|record-panel|login-state-guide|login-footer-grid|policy-note|line-policy|reviewer-policy)"|data-switch-access=/u,
  );
  assert.match(
    html,
    /id="register"[^>]*data-access-panel="register"[^>]*\bhidden\b/u,
  );
  assert.match(
    html,
    /id="login"[^>]*data-access-panel="login"[^>]*\bhidden\b/u,
  );
  assert.match(
    html,
    /data-access-trigger="register"[^>]*aria-expanded="false"/u,
  );
  assert.match(
    html,
    /data-access-trigger="login"[^>]*aria-expanded="false"/u,
  );
  assert.match(html, /data-login-state>尚未確認登入身分/u);
  assert.match(html, /data-login-waiting>請使用 Gmail 確認身分/u);
  assert.match(
    html,
    /data-enter-workspace[^>]*hidden[^>]*disabled[^>]*aria-disabled="true"/u,
  );
  assert.match(html, />\s*使用 Gmail 確認身分\s*</u);
  assert.doesNotMatch(html, /id="login-(?:email|password)"/u);
  assert.match(
    html,
    /data-line-cancel-action[^>]*hidden[^>]*disabled[^>]*aria-disabled="true"/u,
  );
  assert.match(
    css,
    /\.access-form-grid\s*\{[\s\S]*?display:\s*grid[\s\S]*?grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/u,
  );
  assert.match(app, /panel\.hidden\s*=\s*!isSelected/u);
  assert.match(app, /transport\.cancelLineAccountLink\(\)/u);
  assert.match(app, /transport\.enterWorkspace\(\)/u);
  assert.doesNotMatch(app, /scrollIntoView/u);
});

test("LINE account-link adapter has exactly the canonical twelve sanitized states", async () => {
  const transportSource = await source("transport");
  const mapping = transportSource.match(
    /const LINE_ACCOUNT_LINK_COPY = Object\.freeze\(\{([\s\S]*?)\n\}\);/u,
  )?.[1] ?? "";
  const mappedStates = [
    ...mapping.matchAll(/^\s{2}(?:"([^"]+)"|([a-z_]+)):\s*Object\.freeze\(/gmu),
  ]
    .map((match) => match[1] ?? match[2]);
  assert.deepEqual(mappedStates, exactStates);

  const transport = await import(
    new URL(`./reviewer-access-transport.js?states=${Date.now()}`, sourceRoot)
  );
  for (const state of exactStates) {
    const result = transport.sanitizeLineAccountLinkState({
      state,
      detail: "raw-provider-secret",
    });
    assert.equal(result.state, state);
    assert.match(result.label, /[\p{Script=Han}]/u);
    assert.match(result.title, /[\p{Script=Han}]/u);
    assert.match(result.message, /[\p{Script=Han}]/u);
    assert.match(result.waitingOn, /[\p{Script=Han}]/u);
    assert.doesNotMatch(
      JSON.stringify(result),
      /raw-provider-secret|token|nonce|provider|subject|user[_ -]?id|line[_ -]?id|https?:\/\//iu,
    );
  }

  for (
    const malformed of [
      null,
      undefined,
      {},
      { state: "unknown" },
      { state: "linked\u0000raw" },
      { state: "x".repeat(1000) },
      { state: "linked", detail: "\u0000" },
      Object.create({ state: "linked" }),
    ]
  ) {
    const result = transport.sanitizeLineAccountLinkState(malformed);
    assert.ok(
      ["temporarily_unavailable", "permission_denied"].includes(result.state),
    );
    assert.doesNotMatch(JSON.stringify(result), /unknown|raw|x{16}/iu);
    assert.equal(JSON.stringify(result).includes("\u0000"), false);
  }
});

test("absent register, login, and LINE account-link seams fail closed without network, storage, or logging", async () => {
  const fetchDescriptor = Object.getOwnPropertyDescriptor(globalThis, "fetch");
  const storageDescriptor = Object.getOwnPropertyDescriptor(
    globalThis,
    "localStorage",
  );
  const originalLog = console.log;
  const originalError = console.error;
  let fetchReads = 0;
  let storageReads = 0;
  let logCalls = 0;

  try {
    Object.defineProperty(globalThis, "fetch", {
      configurable: true,
      get() {
        fetchReads += 1;
        throw new Error("network must remain untouched");
      },
    });
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      get() {
        storageReads += 1;
        throw new Error("storage must remain untouched");
      },
    });
    console.log = () => {
      logCalls += 1;
    };
    console.error = () => {
      logCalls += 1;
    };

    const module = await import(
      new URL(`./reviewer-access-transport.js?closed=${Date.now()}`, sourceRoot)
    );
    const adapter = module.createReviewerAccessTransport();
    assert.deepEqual(
      await adapter.register({
        email: "reviewer@example.com",
        password: "not-authority",
      }),
      {
        state: "unavailable",
        message: "請先完成 Gmail 身分確認；註冊入口準備完成後可在此繼續。",
      },
    );
    assert.deepEqual(
      await adapter.login({
        email: "reviewer@example.com",
        password: "not-authority",
      }),
      {
        state: "unavailable",
        message: "審查員登入入口正在整理中，正式開放後會提供完整操作方式。",
      },
    );
    assert.equal(
      adapter.getLineAccountLinkState().state,
      "temporarily_unavailable",
    );
    assert.equal(adapter.canRequestLineAccountLink(), false);
    assert.equal(fetchReads, 0);
    assert.equal(storageReads, 0);
    assert.equal(logCalls, 0);
  } finally {
    if (fetchDescriptor) {
      Object.defineProperty(globalThis, "fetch", fetchDescriptor);
    } else delete globalThis.fetch;
    if (storageDescriptor) {
      Object.defineProperty(globalThis, "localStorage", storageDescriptor);
    } else delete globalThis.localStorage;
    console.log = originalLog;
    console.error = originalError;
  }
});

test("workspace entry requires strict session and grant but only navigates on a separate action", async () => {
  const module = await import(
    new URL(
      `./reviewer-access-transport.js?authority=${Date.now()}`,
      sourceRoot,
    )
  );
  const navigations = [];
  const calls = [];
  const now = Date.parse("2026-08-29T04:00:00.000Z");
  const grantPayload = {
    schemaVersion: "laibe.drs-workspace-auth.v1",
    state: "AUTHORIZED_DRS_WORKSPACE",
    case: { id: caseId, status: "REVIEW_IN_PROGRESS" },
    workspaceAccess: {
      accountRole: "drs",
      mode: "read_only",
      mutationAllowed: false,
      writeActionsEnabled: false,
    },
    next: { actor: "drs_specialist", action: "REVIEW_AUTHORIZED_CASE_RECORDS" },
  };
  const adapter = module.createReviewerAccessTransport({
    now: () => now,
    secureSessionBootstrap: () => {
      calls.push("session");
      return exactSessionResponse();
    },
    reviewerWorkspaceGrant: ({ authorization }) => {
      calls.push(
        authorization === `Bearer ${validToken}`
          ? "grant"
          : "grant-without-session",
      );
      return exactJsonResponse(grantPayload, grantUrl);
    },
    lineAccountLinkRequest: ({ operation, request }) => {
      calls.push(operation);
      assert.deepEqual(request, {
        method: "GET",
        url: lineEndpoints.status,
        headers: { authorization: `Bearer ${validToken}` },
      });
      return exactJsonResponse(
        { state: "not_linked", nextAction: "relink" },
        lineEndpoints.status,
      );
    },
    navigate: (href) => navigations.push(href),
  });

  assert.deepEqual(
    await adapter.resumeAccess({
      email: "forged@example.com",
      role: "highest-reviewer",
      hash: "#login?grant=all",
      dataset: { authority: "all" },
    }),
    { state: "authorized" },
  );
  assert.deepEqual(calls, ["session", "grant", "status"]);
  assert.deepEqual(navigations, []);
  assert.equal(adapter.canEnterWorkspace(), true);
  assert.equal(adapter.enterWorkspace(), true);
  assert.deepEqual(navigations, [exactDestination]);
  assert.doesNotMatch(JSON.stringify(adapter), new RegExp(validToken, "u"));
  assert.doesNotMatch(
    JSON.stringify(adapter.getLineAccountLinkState()),
    new RegExp(validToken, "u"),
  );

  const hostileInputs = [
    {
      secureSessionBootstrap: () => ({ status: 204, headers: new Headers() }),
      reviewerWorkspaceGrant: () => exactJsonResponse(grantPayload, grantUrl),
    },
    {
      secureSessionBootstrap: () =>
        exactSessionResponse({ token: "not-valid" }),
      reviewerWorkspaceGrant: () => exactJsonResponse(grantPayload, grantUrl),
    },
    {
      secureSessionBootstrap: () =>
        exactSessionResponse({ expiresAt: "2026-08-29T03:59:59.000Z" }),
      reviewerWorkspaceGrant: () => exactJsonResponse(grantPayload, grantUrl),
    },
    {
      secureSessionBootstrap: () =>
        exactSessionResponse({ url: "http://evil.test/session" }),
      reviewerWorkspaceGrant: () => exactJsonResponse(grantPayload, grantUrl),
    },
    {
      secureSessionBootstrap: () => exactSessionResponse(),
      reviewerWorkspaceGrant: () => grantPayload,
    },
    {
      secureSessionBootstrap: () => exactSessionResponse(),
      reviewerWorkspaceGrant: () =>
        exactJsonResponse(
          { ...grantPayload, destination: exactDestination },
          grantUrl,
        ),
    },
    {
      secureSessionBootstrap: () => exactSessionResponse(),
      reviewerWorkspaceGrant: () =>
        exactJsonResponse(grantPayload, "http://evil.test/grant"),
    },
  ];
  for (const input of hostileInputs) {
    const deniedNavigations = [];
    const deniedLineCalls = [];
    const denied = module.createReviewerAccessTransport({
      ...input,
      now: () => now,
      navigate: (href) => deniedNavigations.push(href),
      lineAccountLinkRequest: (request) => {
        deniedLineCalls.push(request);
        return exactJsonResponse(
          { state: "not_linked", nextAction: "relink" },
          lineEndpoints.status,
        );
      },
    });
    assert.deepEqual(await denied.resumeAccess(), { state: "denied" });
    assert.deepEqual(deniedNavigations, []);
    assert.equal(denied.canEnterWorkspace(), false);
    assert.equal(denied.enterWorkspace(), false);
    assert.deepEqual(deniedLineCalls, []);
  }
});

test("an expired or invalid session proof never reaches a LINE request", async () => {
  const module = await import(
    new URL(
      `./reviewer-access-transport.js?proof-expiry=${Date.now()}`,
      sourceRoot,
    )
  );
  let currentNow = Date.parse("2026-08-29T04:00:00.000Z");
  const lineCalls = [];
  const grantPayload = {
    schemaVersion: "laibe.drs-workspace-auth.v1",
    state: "AUTHORIZED_DRS_WORKSPACE",
    case: { id: caseId, status: "REVIEW_IN_PROGRESS" },
    workspaceAccess: {
      accountRole: "drs",
      mode: "read_only",
      mutationAllowed: false,
      writeActionsEnabled: false,
    },
    next: { actor: "drs_specialist", action: "REVIEW_AUTHORIZED_CASE_RECORDS" },
  };
  const adapter = module.createReviewerAccessTransport({
    now: () => currentNow,
    secureSessionBootstrap: () =>
      exactSessionResponse({
        expiresAt: "2026-08-29T04:01:00.000Z",
      }),
    reviewerWorkspaceGrant: () => exactJsonResponse(grantPayload, grantUrl),
    lineAccountLinkRequest: ({ operation, request }) => {
      lineCalls.push({ operation, request });
      return exactJsonResponse(
        { state: "not_linked", nextAction: "relink" },
        lineEndpoints.status,
      );
    },
    navigate: () => {},
  });
  assert.deepEqual(await adapter.resumeAccess(), { state: "authorized" });
  assert.equal(lineCalls.length, 1);
  currentNow = Date.parse("2026-08-29T04:01:00.000Z");
  assert.equal(adapter.canRequestLineAccountLink(), false);
  assert.equal(adapter.canEnterWorkspace(), false);
  await adapter.requestLineAccountLink();
  assert.equal(lineCalls.length, 1);

  const invalidLineCalls = [];
  const invalid = module.createReviewerAccessTransport({
    now: () => currentNow,
    secureSessionBootstrap: () =>
      exactSessionResponse({ token: "not-a-valid-proof" }),
    reviewerWorkspaceGrant: () => exactJsonResponse(grantPayload, grantUrl),
    lineAccountLinkRequest: (request) => invalidLineCalls.push(request),
    navigate: () => {},
  });
  assert.deepEqual(await invalid.resumeAccess(), { state: "denied" });
  assert.equal(invalid.canRequestLineAccountLink(), false);
  assert.deepEqual(invalidLineCalls, []);
});

test("the accepted camelCase LINE DTO starts linking while snake_case and extra keys fail closed", async () => {
  const module = await import(
    new URL(`./reviewer-access-transport.js?line-dto=${Date.now()}`, sourceRoot)
  );
  const grantPayload = {
    schemaVersion: "laibe.drs-workspace-auth.v1",
    state: "AUTHORIZED_DRS_WORKSPACE",
    case: { id: caseId, status: "REVIEW_IN_PROGRESS" },
    workspaceAccess: {
      accountRole: "drs",
      mode: "read_only",
      mutationAllowed: false,
      writeActionsEnabled: false,
    },
    next: { actor: "drs_specialist", action: "REVIEW_AUTHORIZED_CASE_RECORDS" },
  };
  const calls = [];
  const accepted = module.createReviewerAccessTransport({
    now: () => Date.parse("2026-08-29T04:00:00.000Z"),
    secureSessionBootstrap: () => exactSessionResponse(),
    reviewerWorkspaceGrant: () => exactJsonResponse(grantPayload, grantUrl),
    lineAccountLinkRequest: ({ operation }) => {
      calls.push(operation);
      return exactJsonResponse(
        operation === "status"
          ? { state: "not_linked", nextAction: "relink" }
          : {
            state: "awaiting_line_confirmation",
            expiresAt: "2026-08-29T04:10:00.000Z",
            nextAction: "continue_in_line",
            botLaunchUrl: "https://line.me/R/ti/p/%40laibe",
          },
        operation === "status" ? lineEndpoints.status : lineEndpoints.start,
      );
    },
    navigate: () => {},
    openLine: () => {},
  });
  assert.deepEqual(await accepted.resumeAccess(), { state: "authorized" });
  assert.equal(accepted.getLineAccountLinkState().state, "not_linked");
  assert.equal(
    (await accepted.requestLineAccountLink()).state,
    "awaiting_line_confirmation",
  );
  assert.deepEqual(calls, ["status", "start"]);

  for (
    const status of [
      { state: "not_linked", next_action: "relink" },
      { state: "not_linked", nextAction: "relink", extra: true },
    ]
  ) {
    const rejected = module.createReviewerAccessTransport({
      now: () => Date.parse("2026-08-29T04:00:00.000Z"),
      secureSessionBootstrap: () => exactSessionResponse(),
      reviewerWorkspaceGrant: () => exactJsonResponse(grantPayload, grantUrl),
      lineAccountLinkRequest: () =>
        exactJsonResponse(status, lineEndpoints.status),
      navigate: () => {},
    });
    assert.deepEqual(await rejected.resumeAccess(), { state: "authorized" });
    assert.equal(
      rejected.getLineAccountLinkState().state,
      "temporarily_unavailable",
    );
    assert.equal(rejected.canRequestLineAccountLink(), false);
  }
});

test("LINE transport failure never revokes an otherwise valid Gmail and DRS workspace grant", async () => {
  const module = await import(
    new URL(
      `./reviewer-access-transport.js?line-failure-isolation=${Date.now()}`,
      sourceRoot,
    )
  );
  const grantPayload = {
    schemaVersion: "laibe.drs-workspace-auth.v1",
    state: "AUTHORIZED_DRS_WORKSPACE",
    case: { id: caseId, status: "REVIEW_IN_PROGRESS" },
    workspaceAccess: {
      accountRole: "drs",
      mode: "read_only",
      mutationAllowed: false,
      writeActionsEnabled: false,
    },
    next: { actor: "drs_specialist", action: "REVIEW_AUTHORIZED_CASE_RECORDS" },
  };

  for (
    const lineResponse of [
      exactJsonResponse(
        { state: "temporarily_unavailable", nextAction: "retry" },
        lineEndpoints.status,
        503,
      ),
      exactJsonResponse(
        { state: "not_linked", nextAction: "relink", unexpected: true },
        lineEndpoints.status,
      ),
    ]
  ) {
    const navigations = [];
    const adapter = module.createReviewerAccessTransport({
      now: () => Date.parse("2026-08-29T04:00:00.000Z"),
      secureSessionBootstrap: () => exactSessionResponse(),
      reviewerWorkspaceGrant: () => exactJsonResponse(grantPayload, grantUrl),
      lineAccountLinkRequest: () => lineResponse.clone(),
      navigate: (href) => navigations.push(href),
    });

    assert.deepEqual(await adapter.resumeAccess(), { state: "authorized" });
    assert.equal(
      adapter.getLineAccountLinkState().state,
      "temporarily_unavailable",
    );
    assert.equal(adapter.canEnterWorkspace(), true);
    assert.equal(adapter.enterWorkspace(), true);
    assert.deepEqual(navigations, [exactDestination]);
  }
});

test("LINE BFF HTTP status and safe DTO pairs map permission denial exactly", async () => {
  const module = await import(
    new URL(
      `./reviewer-access-transport.js?line-http-status=${Date.now()}`,
      sourceRoot,
    )
  );
  const grantPayload = {
    schemaVersion: "laibe.drs-workspace-auth.v1",
    state: "AUTHORIZED_DRS_WORKSPACE",
    case: { id: caseId, status: "REVIEW_IN_PROGRESS" },
    workspaceAccess: {
      accountRole: "drs",
      mode: "read_only",
      mutationAllowed: false,
      writeActionsEnabled: false,
    },
    next: { actor: "drs_specialist", action: "REVIEW_AUTHORIZED_CASE_RECORDS" },
  };

  for (const status of [401, 403]) {
    const adapter = module.createReviewerAccessTransport({
      now: () => Date.parse("2026-08-29T04:00:00.000Z"),
      secureSessionBootstrap: () => exactSessionResponse(),
      reviewerWorkspaceGrant: () => exactJsonResponse(grantPayload, grantUrl),
      lineAccountLinkRequest: () =>
        exactJsonResponse(
          { state: "permission_denied" },
          lineEndpoints.status,
          status,
        ),
      navigate: () => {},
    });

    assert.deepEqual(await adapter.resumeAccess(), { state: "denied" });
    assert.equal(adapter.getLineAccountLinkState().state, "permission_denied");
    assert.equal(adapter.canRequestLineAccountLink(), false);
    assert.equal(adapter.canEnterWorkspace(), false);
  }

  const mismatched = module.createReviewerAccessTransport({
    now: () => Date.parse("2026-08-29T04:00:00.000Z"),
    secureSessionBootstrap: () => exactSessionResponse(),
    reviewerWorkspaceGrant: () => exactJsonResponse(grantPayload, grantUrl),
    lineAccountLinkRequest: () =>
      exactJsonResponse(
        { state: "permission_denied" },
        lineEndpoints.status,
        503,
      ),
    navigate: () => {},
  });
  assert.deepEqual(await mismatched.resumeAccess(), { state: "authorized" });
  assert.equal(
    mismatched.getLineAccountLinkState().state,
    "temporarily_unavailable",
  );
  assert.equal(mismatched.canEnterWorkspace(), true);
});

test("expired or denied renewal clears linked LINE state and stale actions refresh the UI contract", async () => {
  const [module, appSource] = await Promise.all([
    import(
      new URL(
        `./reviewer-access-transport.js?line-refresh=${Date.now()}`,
        sourceRoot,
      )
    ),
    source("app"),
  ]);
  let currentNow = Date.parse("2026-08-29T04:00:00.000Z");
  let sessionAttempt = 0;
  const calls = [];
  const grantPayload = {
    schemaVersion: "laibe.drs-workspace-auth.v1",
    state: "AUTHORIZED_DRS_WORKSPACE",
    case: { id: caseId, status: "REVIEW_IN_PROGRESS" },
    workspaceAccess: {
      accountRole: "drs",
      mode: "read_only",
      mutationAllowed: false,
      writeActionsEnabled: false,
    },
    next: { actor: "drs_specialist", action: "REVIEW_AUTHORIZED_CASE_RECORDS" },
  };
  const adapter = module.createReviewerAccessTransport({
    now: () => currentNow,
    secureSessionBootstrap: () => {
      sessionAttempt += 1;
      return sessionAttempt === 1
        ? exactSessionResponse({ expiresAt: "2026-08-29T04:01:00.000Z" })
        : exactSessionResponse({ token: "invalid-proof" });
    },
    reviewerWorkspaceGrant: () => exactJsonResponse(grantPayload, grantUrl),
    lineAccountLinkRequest: ({ operation }) => {
      calls.push(operation);
      return exactJsonResponse({
        state: "linked",
        linkedAt: "2026-08-29T04:00:00.000Z",
        nextAction: "unlink",
      }, lineEndpoints.status);
    },
    navigate: () => {},
  });
  assert.deepEqual(await adapter.resumeAccess(), { state: "authorized" });
  assert.equal(adapter.getLineAccountLinkState().state, "linked");
  assert.equal(adapter.canEnterWorkspace(), true);
  currentNow = Date.parse("2026-08-29T04:01:00.000Z");
  assert.equal(adapter.refreshLineAccess().state, "temporarily_unavailable");
  assert.equal(adapter.canRequestLineAccountLink(), false);
  assert.equal(adapter.canEnterWorkspace(), false);
  await adapter.requestLineAccountLink();
  assert.deepEqual(calls, ["status"]);

  currentNow = Date.parse("2026-08-29T04:00:30.000Z");
  assert.deepEqual(await adapter.resumeAccess(), { state: "denied" });
  assert.equal(
    adapter.getLineAccountLinkState().state,
    "temporarily_unavailable",
  );
  assert.equal(adapter.canEnterWorkspace(), false);
  assert.deepEqual(calls, ["status"]);
  assert.match(appSource, /transport\.refreshLineAccess\(\)/u);
  assert.match(
    appSource,
    /renderLineState\(transport\.refreshLineAccess\(\)\)/u,
  );
  assert.match(appSource, /renderWorkspaceAction\(\)/u);
});

test("verified DRS session opens the private LINE binding seam with only exact server-owned requests", async () => {
  const module = await import(
    new URL(
      `./reviewer-access-transport.js?line-gate=${Date.now()}`,
      sourceRoot,
    )
  );
  const now = Date.parse("2026-08-29T04:00:00.000Z");
  const calls = [];
  const launches = [];
  const adapter = module.createReviewerAccessTransport({
    now: () => now,
    secureSessionBootstrap: () => exactSessionResponse(),
    reviewerWorkspaceGrant: () =>
      exactJsonResponse({
        schemaVersion: "laibe.drs-workspace-auth.v1",
        state: "AUTHORIZED_DRS_WORKSPACE",
        case: { id: caseId, status: "REVIEW_IN_PROGRESS" },
        workspaceAccess: {
          accountRole: "drs",
          mode: "read_only",
          mutationAllowed: false,
          writeActionsEnabled: false,
        },
        next: {
          actor: "drs_specialist",
          action: "REVIEW_AUTHORIZED_CASE_RECORDS",
        },
      }, grantUrl),
    lineAccountLinkRequest: ({ operation, request }) => {
      calls.push({ operation, request });
      if (operation === "status") {
        return exactJsonResponse(
          { state: "not_linked", nextAction: "relink" },
          lineEndpoints.status,
        );
      }
      return exactJsonResponse(
        {
          state: "awaiting_line_confirmation",
          expiresAt: "2026-08-29T04:10:00.000Z",
          nextAction: "continue_in_line",
          botLaunchUrl: "https://line.me/R/ti/p/%40laibe",
        },
        lineEndpoints.start,
      );
    },
    openLine: (href) => launches.push(href),
    navigate: () => {},
  });

  assert.equal(
    adapter.getLineAccountLinkState().state,
    "temporarily_unavailable",
  );
  assert.equal(adapter.canRequestLineAccountLink(), false);
  assert.deepEqual(await adapter.resumeAccess(), { state: "authorized" });
  assert.deepEqual(calls, [{
    operation: "status",
    request: {
      method: "GET",
      url: lineEndpoints.status,
      headers: { authorization: `Bearer ${validToken}` },
    },
  }]);
  assert.equal(adapter.getLineAccountLinkState().state, "not_linked");
  assert.equal(adapter.canRequestLineAccountLink(), true);
  assert.equal(
    (await adapter.requestLineAccountLink()).state,
    "awaiting_line_confirmation",
  );
  assert.deepEqual(calls[1], {
    operation: "start",
    request: {
      method: "POST",
      url: lineEndpoints.start,
      body: "{}",
      headers: {
        authorization: `Bearer ${validToken}`,
        "content-type": "application/json",
      },
    },
  });
  assert.deepEqual(launches, ["https://line.me/R/ti/p/%40laibe"]);

  for (
    const state of [
      "not_linked",
      "awaiting_line_confirmation",
      "linked",
      "revoked",
    ]
  ) {
    const presentation = module.sanitizeLineAccountLinkState({ state });
    assert.equal(presentation.state, state);
    assert.equal(Object.hasOwn(presentation, "providerData"), false);
    assert.equal(Object.hasOwn(presentation, "token"), false);
    assert.equal(Object.hasOwn(presentation, "url"), false);
  }
});

test("LINE binding rejects unsafe DTOs, keeps calls in flight once, and uses distinct cancel and unlink routes", async () => {
  const module = await import(
    new URL(
      `./reviewer-access-transport.js?line-operations=${Date.now()}`,
      sourceRoot,
    )
  );
  const now = Date.parse("2026-08-29T04:00:00.000Z");
  const lineCalls = [];
  let resolveStart;
  const adapter = module.createReviewerAccessTransport({
    now: () => now,
    secureSessionBootstrap: () => exactSessionResponse(),
    reviewerWorkspaceGrant: () =>
      exactJsonResponse({
        schemaVersion: "laibe.drs-workspace-auth.v1",
        state: "AUTHORIZED_DRS_WORKSPACE",
        case: { id: caseId, status: "REVIEW_IN_PROGRESS" },
        workspaceAccess: {
          accountRole: "drs",
          mode: "read_only",
          mutationAllowed: false,
          writeActionsEnabled: false,
        },
        next: {
          actor: "drs_specialist",
          action: "REVIEW_AUTHORIZED_CASE_RECORDS",
        },
      }, grantUrl),
    lineAccountLinkRequest: ({ operation, request }) => {
      lineCalls.push({ operation, request });
      if (operation === "status") {
        return exactJsonResponse(
          { state: "not_linked", nextAction: "relink" },
          lineEndpoints.status,
        );
      }
      if (operation === "start") {
        return new Promise((resolve) => {
          resolveStart = () =>
            resolve(exactJsonResponse({
              state: "awaiting_line_confirmation",
              expiresAt: "2026-08-29T04:10:00.000Z",
              nextAction: "continue_in_line",
              botLaunchUrl: "https://line.me/R/ti/p/%40laibe",
            }, lineEndpoints.start));
        });
      }
      if (operation === "cancel") {
        return exactJsonResponse(
          { state: "cancelled", nextAction: "relink" },
          lineEndpoints.cancel,
        );
      }
      return exactJsonResponse({
        state: "revoked",
        revokedAt: "2026-08-29T04:05:00.000Z",
        nextAction: "relink",
      }, lineEndpoints.unlink);
    },
    navigate: () => {},
    openLine: () => {},
  });

  assert.equal(adapter.canRequestLineAccountLink(), false);
  assert.equal(
    (await adapter.requestLineAccountLink()).state,
    "temporarily_unavailable",
  );
  assert.deepEqual(lineCalls, []);

  await adapter.resumeAccess();
  const firstStart = adapter.requestLineAccountLink();
  const duplicateStart = adapter.requestLineAccountLink();
  assert.equal(adapter.canEnterWorkspace(), true);
  assert.equal(adapter.enterWorkspace(), true);
  assert.equal(
    lineCalls.filter(({ operation }) => operation === "start").length,
    1,
  );
  resolveStart();
  assert.equal((await firstStart).state, "awaiting_line_confirmation");
  assert.equal((await duplicateStart).state, "awaiting_line_confirmation");
  assert.equal(adapter.canCancelLineAccountLink(), true);
  assert.equal((await adapter.cancelLineAccountLink()).state, "cancelled");
  assert.deepEqual(lineCalls.at(-1), {
    operation: "cancel",
    request: {
      method: "POST",
      url: lineEndpoints.cancel,
      body: "{}",
      headers: {
        authorization: `Bearer ${validToken}`,
        "content-type": "application/json",
      },
    },
  });

  const linkedAdapter = module.createReviewerAccessTransport({
    now: () => now,
    secureSessionBootstrap: () => exactSessionResponse(),
    reviewerWorkspaceGrant: () =>
      exactJsonResponse({
        schemaVersion: "laibe.drs-workspace-auth.v1",
        state: "AUTHORIZED_DRS_WORKSPACE",
        case: { id: caseId, status: "REVIEW_IN_PROGRESS" },
        workspaceAccess: {
          accountRole: "drs",
          mode: "read_only",
          mutationAllowed: false,
          writeActionsEnabled: false,
        },
        next: {
          actor: "drs_specialist",
          action: "REVIEW_AUTHORIZED_CASE_RECORDS",
        },
      }, grantUrl),
    lineAccountLinkRequest: ({ operation, request }) => {
      if (operation === "status") {
        return exactJsonResponse({
          state: "linked",
          linkedAt: "2026-08-29T04:01:00.000Z",
          nextAction: "unlink",
        }, lineEndpoints.status);
      }
      assert.equal(operation, "unlink");
      assert.deepEqual(request, {
        method: "POST",
        url: lineEndpoints.unlink,
        body: "{}",
        headers: {
          authorization: `Bearer ${validToken}`,
          "content-type": "application/json",
        },
      });
      return exactJsonResponse({
        state: "revoked",
        revokedAt: "2026-08-29T04:05:00.000Z",
        nextAction: "relink",
      }, lineEndpoints.unlink);
    },
    navigate: () => {},
  });
  await linkedAdapter.resumeAccess();
  assert.equal(linkedAdapter.canRequestLineAccountLink(), true);
  assert.equal((await linkedAdapter.requestLineAccountLink()).state, "revoked");

  const unsafeAdapter = module.createReviewerAccessTransport({
    now: () => now,
    secureSessionBootstrap: () => exactSessionResponse(),
    reviewerWorkspaceGrant: () =>
      exactJsonResponse({
        schemaVersion: "laibe.drs-workspace-auth.v1",
        state: "AUTHORIZED_DRS_WORKSPACE",
        case: { id: caseId, status: "REVIEW_IN_PROGRESS" },
        workspaceAccess: {
          accountRole: "drs",
          mode: "read_only",
          mutationAllowed: false,
          writeActionsEnabled: false,
        },
        next: {
          actor: "drs_specialist",
          action: "REVIEW_AUTHORIZED_CASE_RECORDS",
        },
      }, grantUrl),
    lineAccountLinkRequest: ({ operation }) =>
      exactJsonResponse(
        operation === "status"
          ? { state: "not_linked", nextAction: "relink" }
          : {
            state: "awaiting_line_confirmation",
            expiresAt: "2026-08-29T04:10:00.000Z",
            nextAction: "continue_in_line",
            botLaunchUrl: "https://attacker.invalid/line",
          },
        operation === "status" ? lineEndpoints.status : lineEndpoints.start,
      ),
    navigate: () => {},
    openLine: () => assert.fail("unsafe URL must not be opened"),
  });
  await unsafeAdapter.resumeAccess();
  assert.equal(
    (await unsafeAdapter.requestLineAccountLink()).state,
    "temporarily_unavailable",
  );
});

test("a linked LINE state uses only the unlink route and never restarts linking", async () => {
  const module = await import(
    new URL(
      `./reviewer-access-transport.js?line-operation=${Date.now()}`,
      sourceRoot,
    )
  );
  const now = Date.parse("2026-08-29T04:00:00.000Z");
  const operations = [];
  const adapter = module.createReviewerAccessTransport({
    now: () => now,
    secureSessionBootstrap: () => exactSessionResponse(),
    reviewerWorkspaceGrant: () =>
      exactJsonResponse({
        schemaVersion: "laibe.drs-workspace-auth.v1",
        state: "AUTHORIZED_DRS_WORKSPACE",
        case: { id: caseId, status: "REVIEW_IN_PROGRESS" },
        workspaceAccess: {
          accountRole: "drs",
          mode: "read_only",
          mutationAllowed: false,
          writeActionsEnabled: false,
        },
        next: {
          actor: "drs_specialist",
          action: "REVIEW_AUTHORIZED_CASE_RECORDS",
        },
      }, grantUrl),
    lineAccountLinkRequest: ({ operation, request }) => {
      operations.push({ operation, request });
      if (operation === "status") {
        return exactJsonResponse({
          state: "linked",
          linkedAt: "2026-08-29T04:01:00.000Z",
          nextAction: "unlink",
        }, lineEndpoints.status);
      }
      assert.equal(operation, "unlink");
      return exactJsonResponse({
        state: "revoked",
        revokedAt: "2026-08-29T04:02:00.000Z",
        nextAction: "relink",
      }, lineEndpoints.unlink);
    },
    navigate: () => {},
  });

  assert.deepEqual(await adapter.resumeAccess(), { state: "authorized" });
  assert.equal(
    module.sanitizeLineAccountLinkState({ state: "linked" }).action,
    "解除連結",
  );
  assert.equal(adapter.canRequestLineAccountLink(), true);
  assert.equal(
    (await adapter.requestLineAccountLink()).state,
    "revoked",
  );
  assert.deepEqual(operations, [
    {
      operation: "status",
      request: {
        method: "GET",
        url: lineEndpoints.status,
        headers: { authorization: `Bearer ${validToken}` },
      },
    },
    {
      operation: "unlink",
      request: {
        method: "POST",
        url: lineEndpoints.unlink,
        body: "{}",
        headers: {
          authorization: `Bearer ${validToken}`,
          "content-type": "application/json",
        },
      },
    },
  ]);
});

test("source does not reuse LINE Login, webhook transport, client authority, storage, logs, or raw provider projection", async () => {
  const [html, app, transport] = await Promise.all([
    source("html"),
    source("app"),
    source("transport"),
  ]);
  const combined = `${html}\n${app}\n${transport}`;
  assert.doesNotMatch(
    combined,
    /drs-line-login-(?:start|callback)|LINE Login|oauth|\/line\/webhook|webhook transport|provider[_ -]?(?:url|code|subject)|localStorage|sessionStorage|console\.(?:log|error|warn)|innerHTML/iu,
  );
  assert.doesNotMatch(
    html,
    /name="(?:role|authority|reviewerClass|caseId)"|data-(?:role|authority)="(?:highest|all|wildcard)"/iu,
  );
  assert.doesNotMatch(
    visibleText(html),
    /最高審查員|全案件|萬用權限|API|後端|mock|debug|JSON|stack|token|nonce|provider|subject|user id/iu,
  );
  assert.doesNotMatch(
    combined,
    /payment|escrow|custody|金流託管|代收代付|老屋煉金術|投資報酬|翻修獲利/iu,
  );
  assert.match(
    transport,
    new RegExp(exactDestination.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "u"),
  );
  assert.equal(
    (transport.match(
      new RegExp(exactDestination.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gu"),
    ) ?? []).length,
    1,
  );
});

test("Traditional-Chinese product copy exposes role, state, next action, waiting owner, and accessible controls", async () => {
  const [html, css] = await Promise.all([source("html"), source("css")]);
  const text = visibleText(html);
  for (
    const copy of [
      "審查員帳號入口",
      "一般審查員",
      "目前狀態",
      "下一步",
      "正在等待",
      "建立審查員帳號",
      "登入審查員帳號",
      "LINE 帳號連結",
      "連結入口準備中",
    ]
  ) assert.match(text, new RegExp(copy, "u"), copy);

  assert.match(html, /<html\b[^>]*lang="zh-Hant-TW"/u);
  assert.match(html, /<a\b[^>]*class="skip-link"[^>]*href="#access-main"/u);
  assert.match(html, /<main\b[^>]*id="access-main"/u);
  assert.doesNotMatch(
    html,
    /id="register-(?:email|password|line-id|full-name)"/u,
  );
  assert.doesNotMatch(html, /id="login-(?:email|password)"/u);
  assert.match(html, />\s*使用 Gmail 確認身分\s*</u);
  assert.doesNotMatch(html, /Google OAuth|oauth|accounts\.google/iu);
  assert.match(html, /role="status"[^>]*aria-live="polite"/u);
  assert.match(
    html,
    /data-line-link-action[^>]*disabled[^>]*aria-disabled="true"/u,
  );
  assert.match(css, /:focus-visible\s*\{/u);
  assert.match(css, /@media\s*\(max-width:\s*760px\)/u);
  assert.match(css, /@media\s*\(prefers-reduced-motion:\s*reduce\)/u);
  assert.match(css, /min-height:\s*44px/u);
  assert.match(css, /overflow-x:\s*(?:hidden|clip)/u);
  assert.match(css, /text-wrap:\s*pretty/u);
});
