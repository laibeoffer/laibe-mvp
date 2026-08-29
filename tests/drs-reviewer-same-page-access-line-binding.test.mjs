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

function exactJsonResponse(body, url) {
  const response = new Response(JSON.stringify(body), {
    status: 200,
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
  assert.equal(app.resolveAccessAnchor("#LOGIN"), "register");
  assert.equal(app.resolveAccessAnchor("javascript:alert(1)"), "register");
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
        message: "審查員帳號入口正在整理中，正式開放後會提供完整操作方式。",
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

test("navigation requires both strict secure-session bootstrap and strict server-owned reviewer grant", async () => {
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
  assert.deepEqual(calls, ["session", "grant"]);
  assert.deepEqual(navigations, [exactDestination]);

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
    const denied = module.createReviewerAccessTransport({
      ...input,
      now: () => now,
      navigate: (href) => deniedNavigations.push(href),
    });
    assert.deepEqual(await denied.resumeAccess(), { state: "denied" });
    assert.deepEqual(deniedNavigations, []);
  }
});

test("verified unexpired DRS session gates readiness while the account-link seam remains absent", async () => {
  const module = await import(
    new URL(
      `./reviewer-access-transport.js?line-gate=${Date.now()}`,
      sourceRoot,
    )
  );
  const adapter = module.createReviewerAccessTransport();
  assert.equal(
    adapter.getLineAccountLinkState().state,
    "temporarily_unavailable",
  );
  assert.equal(adapter.canRequestLineAccountLink(), false);
  assert.deepEqual(
    await adapter.requestLineAccountLink(),
    module.sanitizeLineAccountLinkState({ state: "temporarily_unavailable" }),
  );

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

test("source-only LINE actions stay disabled and never overload link start as unlink", async () => {
  const module = await import(
    new URL(
      `./reviewer-access-transport.js?line-operation=${Date.now()}`,
      sourceRoot,
    )
  );
  const now = Date.parse("2026-08-29T04:00:00.000Z");
  let startCalls = 0;
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
    lineAccountLinkStart: () => {
      startCalls += 1;
      return { state: "linked" };
    },
    navigate: () => {},
  });

  assert.deepEqual(await adapter.resumeAccess(), { state: "authorized" });
  assert.equal(
    module.sanitizeLineAccountLinkState({ state: "linked" }).action,
    "解除連結",
  );
  assert.equal(adapter.canRequestLineAccountLink(), false);
  assert.equal(
    (await adapter.requestLineAccountLink()).state,
    "temporarily_unavailable",
  );
  assert.equal(startCalls, 0);
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
    /最高審查員|全案件|萬用權限|API|後端|mock|debug|JSON|stack|token|nonce|provider|subject|user id|LINE id/iu,
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
  assert.match(html, /<label\b[^>]*for="register-email"/u);
  assert.match(
    html,
    /id="register-email"[^>]*type="email"[^>]*autocomplete="email"/u,
  );
  assert.match(
    html,
    /id="register-password"[^>]*type="password"[^>]*autocomplete="new-password"/u,
  );
  assert.match(
    html,
    /id="login-email"[^>]*type="email"[^>]*autocomplete="username"/u,
  );
  assert.match(
    html,
    /id="login-password"[^>]*type="password"[^>]*autocomplete="current-password"/u,
  );
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
