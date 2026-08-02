import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";

const pageRoot = new URL(
  "../src/stitch_laibe_landing_onboarding/client_awarding_dashboard/",
  import.meta.url,
);

function readPageFile(path) {
  return readFile(new URL(path, pageRoot), "utf8");
}

function loadRuntime() {
  return import(new URL("app.js", pageRoot).href);
}

function sha256(value) {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function authorizedContext(overrides = {}) {
  return {
    sessionStatus: "active",
    actor: {
      actorId: "actor-fixture-owner",
      role: "owner",
      displayLabel: "驗收用甲方",
    },
    membership: {
      status: "active",
      caseId: "case-fixture-owner-workspace",
    },
    serviceAgreement: {
      agreementId: "agreement-fixture",
      version: "v-fixture",
      status: "active",
      caseId: "case-fixture-owner-workspace",
    },
    caseBinding: {
      status: "bound",
      caseId: "case-fixture-owner-workspace",
    },
    domain: {
      status: "active",
      name: "pcm",
    },
    caseSummary: {
      caseId: "case-fixture-owner-workspace",
      displayName: "驗收用案件（非正式資料）",
      statusLabel: "文件檢查中",
      currentActorLabel: "PCM",
      nextActionLabel: "逐項回覆文件問題",
      nextDueLabel: "依案件通知",
      lastRecordedAtLabel: "依案件紀錄顯示",
    },
    documents: [],
    submissions: [],
    publicMessages: [],
    events: [],
    permittedActions: [],
    ...overrides,
  };
}

test("頁面明確定位為完成 PCM 服務契約後的甲方工作台", async () => {
  const html = await readPageFile("code.html");

  assert.match(html, /甲方案件工作台/);
  assert.match(html, /完成 PCM 服務契約後/);
  assert.match(html, /只限已登入且具案件權限的甲方/);
  assert.match(html, /目前狀態/);
  assert.match(html, /下一步/);
  assert.match(html, /誰正在等待誰/);
});

test("頁面使用本地樣式與 module runtime，不依賴外部 UI CDN", async () => {
  const html = await readPageFile("code.html");

  assert.match(html, /href="\.\/styles\.css"/);
  assert.match(html, /type="module"\s+src="\.\/app\.js"/);
  assert.doesNotMatch(html, /tailwindcss|fonts\.googleapis|material-symbols/i);
});

test("完整映射案件治理資訊架構與可達頁內錨點", async () => {
  const html = await readPageFile("code.html");
  const requiredSections = [
    ["overview", "案件總覽"],
    ["documents", "文件與報價"],
    ["submissions", "乙方提交與場勘"],
    ["messages", "三方公開訊息"],
    ["governance", "治理檢查"],
    ["design-review", "設計送審"],
    ["construction-records", "施工與驗收紀錄"],
    ["event-trail", "案件留痕"],
  ];

  for (const [id, label] of requiredSections) {
    assert.match(html, new RegExp(`id="${id}"`));
    assert.match(html, new RegExp(label));
    assert.match(html, new RegExp(`href="#${id}"`));
  }
});

test("公開預設頁不含硬編案件、金額、身分或正式決定", async () => {
  const [html, runtime] = await Promise.all([
    readPageFile("code.html"),
    readPageFile("app.js"),
  ]);
  const source = `${html}\n${runtime}`;

  assert.doesNotMatch(source, /NT\$|TWD\s*\d|新台幣\s*\d/i);
  assert.doesNotMatch(
    source,
    /case-(?:pcm|owner|demo|test|\d)|owner-\d|document-\d|event-\d|decision-\d|王小明|林先生|測試案件已建立/i,
  );
  assert.doesNotMatch(
    source,
    /已完成付款|正式核准完成|人工決定已建立|已驗證身分|具法律效果/,
  );
});

test("頁面與 runtime 完全移除舊兩字發案詞彙", async () => {
  const legacyLiteral = String.fromCodePoint(0x62db, 0x6a19);
  const [html, css, runtime] = await Promise.all([
    readPageFile("code.html"),
    readPageFile("styles.css"),
    readPageFile("app.js"),
  ]);

  assert.equal(`${html}\n${css}\n${runtime}`.includes(legacyLiteral), false);
});

test("頁面沒有空連結，所有可見按鈕有行為或明確不可用", async () => {
  const html = await readPageFile("code.html");

  assert.doesNotMatch(html, /href=["']#["']/i);
  const buttons = [...html.matchAll(/<button\b([^>]*)>/gi)];
  assert.ok(buttons.length > 0);
  for (const [, attributes] of buttons) {
    assert.match(attributes, /\bdisabled\b|\bdata-action=/i);
  }
});

test("封閉狀態、角色與契約 gate 是 immutable contract", async () => {
  const {
    OWNER_WORKSPACE_STATES,
    OWNER_WORKSPACE_ACCESS,
  } = await loadRuntime();

  assert.deepEqual(OWNER_WORKSPACE_STATES, [
    "ACCESS_CHECKING",
    "ACCESS_DENIED",
    "CONTRACT_CONTEXT_UNAVAILABLE",
    "AUTHORIZED_EMPTY",
    "AUTHORIZED_READY",
    "PCM_SERVICE_ENDED_READ_ONLY",
    "LOAD_FAILED_RETRYABLE",
  ]);
  assert.deepEqual(OWNER_WORKSPACE_ACCESS, {
    sessionStatus: "active",
    actorRole: "owner",
    membershipStatus: "active",
    activeAgreementStatus: "active",
    endedAgreementStatus: "ended",
    caseBindingStatus: "bound",
    domainStatus: "active",
  });
  assert.equal(Object.isFrozen(OWNER_WORKSPACE_STATES), true);
  assert.equal(Object.isFrozen(OWNER_WORKSPACE_ACCESS), true);
});

test("未配置可信 adapter 時只顯示契約 context unavailable", async () => {
  const { resolveOwnerWorkspaceState } = await loadRuntime();

  assert.deepEqual(resolveOwnerWorkspaceState(), {
    state: "CONTRACT_CONTEXT_UNAVAILABLE",
    reasonCode: "TRUSTED_CONTEXT_NOT_AVAILABLE",
  });
});

test("只有 exact active owner tuple 可進 authorized ready", async () => {
  const { resolveOwnerWorkspaceState } = await loadRuntime();
  const result = resolveOwnerWorkspaceState(authorizedContext());

  assert.deepEqual(result, {
    state: "AUTHORIZED_READY",
    reasonCode: "OWNER_CASE_CONTEXT_CONFIRMED",
  });
});

test("錯角色、失效 membership、未簽契約與錯 case binding 均 fail closed", async () => {
  const { resolveOwnerWorkspaceState } = await loadRuntime();
  const cases = [
    authorizedContext({
      actor: { actorId: "actor-pro", role: "pro", displayLabel: "乙方" },
    }),
    authorizedContext({
      membership: { status: "revoked", caseId: "case-fixture-owner-workspace" },
    }),
    authorizedContext({
      serviceAgreement: {
        agreementId: "agreement",
        version: "v1",
        status: "pending",
      },
    }),
    authorizedContext({
      caseBinding: { status: "bound", caseId: "different-case" },
    }),
    authorizedContext({ domain: { status: "revoked", name: "pcm" } }),
  ];

  for (const input of cases) {
    assert.equal(resolveOwnerWorkspaceState(input).state, "ACCESS_DENIED");
  }
});

test("拒絕存取時不攜帶或呈現任何案件 payload", async () => {
  const { buildOwnerWorkspaceViewModel } = await loadRuntime();
  const context = authorizedContext({
    sessionStatus: "expired",
    documents: [{ title: "不得外洩的文件" }],
    submissions: [{ partyLabel: "不得外洩的乙方" }],
    publicMessages: [{
      actorLabel: "不得外洩的訊息",
      body: "不得外洩的內容",
      recordReceipt: {
        receiptId: "receipt-private",
        status: "recorded",
        recordedAt: "2026-08-02T00:00:00Z",
      },
    }],
    designReviews: [{ title: "不得外洩的送審" }],
    constructionRecords: [{ title: "不得外洩的施工紀錄" }],
    events: [{ title: "不得外洩的事件" }],
    processSteps: [{ key: "documents", statusLabel: "不得外洩" }],
    permittedActions: ["submit_correction"],
  });

  const model = buildOwnerWorkspaceViewModel(context);
  const serialized = JSON.stringify(model);

  assert.equal(model.state, "ACCESS_DENIED");
  assert.equal(model.caseName, "尚待案件資料");
  assert.equal(model.actorLabel, "尚待驗證");
  assert.deepEqual(model.documents, []);
  assert.deepEqual(model.submissions, []);
  assert.deepEqual(model.messages, []);
  assert.deepEqual(model.designReviews, []);
  assert.deepEqual(model.constructionRecords, []);
  assert.deepEqual(model.events, []);
  assert.deepEqual(model.processSteps, []);
  assert.deepEqual(model.permittedActions, []);
  assert.doesNotMatch(serialized, /不得外洩|submit_correction/);
});

test("服務結束的唯讀資料仍須綁定同一案件與契約", async () => {
  const { buildOwnerWorkspaceViewModel, resolveOwnerWorkspaceState } =
    await loadRuntime();
  const endedAgreement = {
    agreementId: "agreement-fixture",
    version: "v-fixture",
    status: "ended",
    caseId: "case-fixture-owner-workspace",
  };

  assert.equal(
    resolveOwnerWorkspaceState(
      authorizedContext({ serviceAgreement: endedAgreement }),
    ).state,
    "PCM_SERVICE_ENDED_READ_ONLY",
  );
  assert.equal(
    resolveOwnerWorkspaceState(
      authorizedContext({
        serviceAgreement: endedAgreement,
        caseSummary: {
          ...authorizedContext().caseSummary,
          caseId: "different-case",
        },
      }),
    ).state,
    "ACCESS_DENIED",
  );
  assert.equal(
    resolveOwnerWorkspaceState(
      authorizedContext({
        serviceAgreement: { ...endedAgreement, caseId: "different-case" },
      }),
    ).state,
    "ACCESS_DENIED",
  );

  const missingSummary = authorizedContext({
    serviceAgreement: endedAgreement,
    caseSummary: null,
    documents: [{ title: "沒有案件摘要時不得顯示" }],
  });
  assert.equal(
    resolveOwnerWorkspaceState(missingSummary).state,
    "AUTHORIZED_EMPTY",
  );
  assert.deepEqual(
    buildOwnerWorkspaceViewModel(missingSummary).documents,
    [],
  );
});

test("尚未生效的契約不得因缺少案件摘要而落入已授權狀態", async () => {
  const { buildOwnerWorkspaceViewModel, resolveOwnerWorkspaceState } =
    await loadRuntime();
  const pendingAgreement = authorizedContext({
    serviceAgreement: {
      agreementId: "agreement-fixture",
      version: "v-fixture",
      status: "pending",
      caseId: "case-fixture-owner-workspace",
    },
    caseSummary: null,
  });

  assert.equal(
    resolveOwnerWorkspaceState(pendingAgreement).state,
    "ACCESS_DENIED",
  );
  const model = buildOwnerWorkspaceViewModel(pendingAgreement);
  assert.equal(model.actorLabel, "尚待驗證");
  assert.equal(model.agreementVersion, "尚待載入");
});

test("服務結束只開放既有內容 read-only，不代表刪除案件紀錄", async () => {
  const { resolveOwnerWorkspaceState, buildOwnerWorkspaceViewModel } =
    await loadRuntime();
  const context = authorizedContext({
    serviceAgreement: {
      agreementId: "agreement-fixture",
      version: "v-fixture",
      status: "ended",
      caseId: "case-fixture-owner-workspace",
    },
  });

  assert.equal(
    resolveOwnerWorkspaceState(context).state,
    "PCM_SERVICE_ENDED_READ_ONLY",
  );
  const model = buildOwnerWorkspaceViewModel(context);
  assert.equal(model.readOnly, true);
  assert.equal(model.pcmInvolved, false);
  assert.match(model.statusMessage, /既有文件與紀錄仍可讀取/);
  assert.deepEqual(model.permittedActions, []);
});

test("404 不會被當成甲方身分已確認", async () => {
  const { createOwnerWorkspaceController } = await loadRuntime();
  const controller = createOwnerWorkspaceController({
    adapter: {
      loadOwnerWorkspace() {
        throw Object.assign(new Error("not found"), { status: 404 });
      },
    },
  });

  const model = await controller.initialize();
  assert.equal(model.state, "CONTRACT_CONTEXT_UNAVAILABLE");
  assert.equal(model.reasonCode, "CASE_CONTEXT_NOT_AVAILABLE");
  assert.doesNotMatch(model.statusMessage, /身分已確認/);
});

test("授權資料正規化不接受任意 redirect 或 browser authority", async () => {
  const { normalizeOwnerWorkspaceContext } = await loadRuntime();
  const result = normalizeOwnerWorkspaceContext({
    ...authorizedContext(),
    redirectUrl: "https://evil.example/owner",
    localStorageAuthorized: true,
    queryAuthorized: true,
    humanFinalDecision: "approved",
  });

  assert.equal("redirectUrl" in result, false);
  assert.equal("localStorageAuthorized" in result, false);
  assert.equal("queryAuthorized" in result, false);
  assert.equal("humanFinalDecision" in result, false);
});

test("runtime 不讀取瀏覽器 storage、query 或 raw HTML 注入", async () => {
  const runtime = await readPageFile("app.js");

  assert.doesNotMatch(
    runtime,
    /localStorage|sessionStorage|indexedDB|URLSearchParams|location\.search|document\.cookie/i,
  );
  assert.doesNotMatch(
    runtime,
    /\.innerHTML\s*=|insertAdjacentHTML|outerHTML\s*=/,
  );
});

test("三方訊息只有可信留痕憑證後才能顯示已記錄", async () => {
  const {
    buildOwnerWorkspaceViewModel,
    publicMessageRecordLabel,
  } = await loadRuntime();

  const recordedBody = "已記錄內容";
  const messageHash = sha256(recordedBody);
  const recordedMessage = {
    caseId: "case-fixture-owner-workspace",
    messageId: "message-recorded-fixture",
    bodySha256: messageHash,
    body: recordedBody,
    recordReceipt: {
      receiptId: "receipt-fixture",
      status: "recorded",
      recordedAt: "2026-08-02T02:00:00.000Z",
      caseId: "case-fixture-owner-workspace",
      messageId: "message-recorded-fixture",
      bodySha256: messageHash,
    },
  };

  assert.equal(publicMessageRecordLabel(), "尚未記錄");
  assert.equal(
    publicMessageRecordLabel(recordedMessage, "case-fixture-owner-workspace"),
    "已記錄於萊比後台",
  );
  const longBody = "甲".repeat(100);
  const longBodyHash = sha256(longBody);
  assert.equal(
    publicMessageRecordLabel(
      {
        ...recordedMessage,
        body: longBody,
        bodySha256: longBodyHash,
        recordReceipt: {
          ...recordedMessage.recordReceipt,
          bodySha256: longBodyHash,
        },
      },
      "case-fixture-owner-workspace",
    ),
    "已記錄於萊比後台",
  );
  assert.equal(
    publicMessageRecordLabel(
      {
        ...recordedMessage,
        recordReceipt: {
          ...recordedMessage.recordReceipt,
          status: "pending",
        },
      },
      "case-fixture-owner-workspace",
    ),
    "尚未記錄",
  );

  const invalidBindings = [
    {
      ...recordedMessage,
      recordReceipt: {
        ...recordedMessage.recordReceipt,
        caseId: "different-case",
      },
    },
    {
      ...recordedMessage,
      recordReceipt: {
        ...recordedMessage.recordReceipt,
        messageId: "different-message",
      },
    },
    {
      ...recordedMessage,
      recordReceipt: {
        ...recordedMessage.recordReceipt,
        bodySha256: "b".repeat(64),
      },
    },
    {
      ...recordedMessage,
      recordReceipt: {
        ...recordedMessage.recordReceipt,
        recordedAt: "not-a-time",
      },
    },
    {
      ...recordedMessage,
      body: "遭竄改的訊息內容",
    },
    {
      ...recordedMessage,
      recordReceipt: {
        ...recordedMessage.recordReceipt,
        recordedAt: "2026-02-31T00:00:00Z",
      },
    },
  ];
  for (const message of invalidBindings) {
    assert.equal(
      publicMessageRecordLabel(message, "case-fixture-owner-workspace"),
      "尚未記錄",
    );
  }

  const visibleBody = "只有這一筆可顯示";
  const visibleBodyHash = sha256(visibleBody);
  const model = buildOwnerWorkspaceViewModel(
    authorizedContext({
      publicMessages: [
        {
          actorLabel: "未留痕訊息",
          body: "不能靠傳入標籤宣稱已記錄",
          recordStatusLabel: "已記錄於萊比後台",
        },
        {
          actorLabel: "已留痕訊息",
          body: visibleBody,
          caseId: "case-fixture-owner-workspace",
          messageId: "message-recorded-fixture",
          bodySha256: visibleBodyHash,
          recordedAtLabel: "不得採用 caller 顯示時間",
          recordStatusLabel: "尚未記錄",
          recordReceipt: {
            receiptId: "receipt-recorded-message",
            status: "recorded",
            recordedAt: "2026-08-02T00:00:00Z",
            caseId: "case-fixture-owner-workspace",
            messageId: "message-recorded-fixture",
            bodySha256: visibleBodyHash,
          },
        },
      ],
    }),
  );

  assert.equal(model.messages.length, 1);
  assert.equal(model.messages[0].actorLabel, "已留痕訊息");
  assert.equal(model.messages[0].recordStatusLabel, "已記錄於萊比後台");
  assert.equal(model.messages[0].recordedAtLabel, "2026/08/02 08:00");
});

test("外部可見文案不含工程語、金流、AI最終裁決或投資承諾", async () => {
  const [html, runtime] = await Promise.all([
    readPageFile("code.html"),
    readPageFile("app.js"),
  ]);
  const externalCopySources = `${html}\n${runtime}`;

  assert.doesNotMatch(
    externalCopySources,
    /\bmock\b|\bAPI\b|\bDB\b|debug|raw JSON|stack trace|本機候選|無 DB 寫入|功能停用|API 未開/i,
  );
  assert.doesNotMatch(
    externalCopySources,
    /金流|付款授權|託管|代收代付|最低價|零風險|老屋投資|老屋煉金術|翻修獲利|裝修理財|AI\s*最終裁決/,
  );
});

test("文件下載尚未接線時只使用未來式說明", async () => {
  const html = await readPageFile("code.html");

  assert.doesNotMatch(html, /仍可讀取與下載既有文件/);
  assert.match(html, /下載入口正式開放後/);
});

test("外部頁面使用產品語，不顯示實作術語或英文區塊標籤", async () => {
  const html = await readPageFile("code.html");

  assert.doesNotMatch(
    html,
    />\s*(Overview|Exact version|Same facts|Open record|Written governance|Document decision|Today & next|Trace|Case context|Decision boundary|Quick links)\s*</i,
  );
  assert.doesNotMatch(
    html,
    /\bexact\b|read-only|瀏覽器|正式能力仍在接線|可信登入|Human PCM/i,
  );
});

test("已授權或服務結束時不顯示與案件狀態矛盾的未開放提示", async () => {
  const [html, css] = await Promise.all([
    readPageFile("code.html"),
    readPageFile("styles.css"),
  ]);

  assert.match(
    html,
    /class="aside-panel aside-panel--quiet workspace-readiness-note"/,
  );
  assert.match(
    css,
    /body\[data-workspace-state="AUTHORIZED_READY"\][\s\S]{0,180}\.workspace-readiness-note[\s\S]{0,80}display:\s*none/i,
  );
  assert.match(
    css,
    /body\[data-workspace-state="PCM_SERVICE_ENDED_READ_ONLY"\][\s\S]{0,180}\.workspace-readiness-note[\s\S]{0,80}display:\s*none/i,
  );
});

test("LaiBE 深色工具介面具三 breakpoint、focus、44px與 reduced motion", async () => {
  const css = await readPageFile("styles.css");

  for (const token of ["#090b0d", "#f4f1ea", "#9aa3ad", "#f2c14e", "#ff8a2b"]) {
    assert.match(css, new RegExp(token, "i"));
  }
  assert.match(css, /min-height:\s*44px/i);
  assert.match(css, /:focus-visible/);
  assert.match(css, /@media\s*\(max-width:\s*980px\)/i);
  assert.match(css, /@media\s*\(max-width:\s*620px\)/i);
  assert.match(css, /@media\s*\(prefers-reduced-motion:\s*reduce\)/i);
  assert.doesNotMatch(
    css,
    /context-chip:not\(\.context-chip--role\)[\s\S]{0,100}display:\s*none/i,
  );
  assert.match(
    css,
    /context-chip--state[\s\S]{0,160}text-overflow:\s*ellipsis/i,
  );
});

test("頁面保留 skip link 與真實同源快速入口", async () => {
  const html = await readPageFile("code.html");

  assert.match(html, /class="skip-link"\s+href="#main-content"/);
  assert.match(
    html,
    /href="\.\.\/pcm_standalone\/public_home\/code\.html#top"/,
  );
  assert.match(html, /href="\.\.\/pcm_standalone\/basic_report\/code\.html"/);
  assert.match(html, /href="#documents"/);
});
