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

test("未簽 DRS 服務契約前只顯示誠實的註冊後準備預覽", async () => {
  const html = await readPageFile("code.html");

  assert.match(html, /註冊後，可以先把資料整理成可討論的決策基礎/);
  assert.match(html, /尚未驗證註冊/);
  assert.match(html, /摘要也尚未真正保存/);
  assert.match(html, /完整需求整理入口準備中/);
  assert.match(html, /補齊必要文件/);
  assert.match(html, /查看 DRS 服務方案/);
  assert.match(html, /確認 DRS 服務契約/);
  assert.match(html, /註冊與保存開放後才可正式保留/);
  assert.match(html, /尚未連結帳號或正式案件/);
  assert.doesNotMatch(html, /href="\.\.\/pcm_standalone\/owner_start\/code\.html"/);
});

test("頁面使用本地樣式與 module runtime，不依賴外部 UI CDN", async () => {
  const html = await readPageFile("code.html");

  assert.match(html, /href="\.\/styles\.css"/);
  assert.match(
    html,
    /type="module"\s+src="\.\/owner-workspace-bootstrap\.js"/,
  );
  assert.doesNotMatch(html, /type="module"\s+src="\.\/app\.js"/);
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
  assert.match(html, /href="\.\.\/pcm_standalone\/case_summary\/code\.html"/);
  assert.match(html, /href="\.\.\/pcm_standalone\/about_drs\/code\.html"/);
  assert.match(html, /href="\.\.\/pcm_standalone\/service_contract\/code\.html"/);
  assert.match(html, /href="#documents"/);
});

const CANONICAL_OWNER_CASE_ID = "9e000000-0000-4000-8000-000000000201";
const OWNER_USER_ID = "9e000000-0000-4000-8000-000000000001";
const SNAPSHOT_VERSION = "db19715d-deab-4a9f-8dc0-4502269e4702";
const SNAPSHOT_SHA256 =
  "2a30f7736c8a62f5ae7a3cc82fe1fe10270ae215d1f4c9ed35d843538badeb4c";
const SNAPSHOT_BYTES = 1535;
const READ_AT = "2026-08-09T11:30:00.000Z";
const GOLDEN_SNAPSHOT_PREIMAGE = '{"case": {"title": "Owner case", "caseId": "9e000000-0000-4000-8000-000000000201", "status": "active"}, "status": "CASE_DATA_AVAILABLE", "viewer": {"role": "owner", "userId": "9e000000-0000-4000-8000-000000000001", "identityStatus": "line_bound", "identityVerified": true}, "actions": ["view_case", "view_public_messages"], "pcmDomain": {"code": "contract"}, "schemaName": "laibe.owner-workspace-read.v1", "caseBinding": {"boundAt": "2026-08-09T11:29:44.000Z", "bindingStatus": "active", "assignmentKind": "participant"}, "schemaVersion": "laibe.owner-workspace-read.v1", "publicMessages": [{"body": "Owner workspace public message", "actor": {"role": "owner", "userId": "9e000000-0000-4000-8000-000000000001"}, "messageId": "9e000000-0000-4000-8000-000000000501", "bodySha256": "00ca5b0783937736eae3f21ed8fc46ad19214e9b768d9cf276ca292283ae3263", "recordReceipt": {"caseId": "9e000000-0000-4000-8000-000000000201", "messageId": "9e000000-0000-4000-8000-000000000501", "receiptId": "9e000000-0000-4000-8000-000000000601", "bodySha256": "00ca5b0783937736eae3f21ed8fc46ad19214e9b768d9cf276ca292283ae3263", "recordedAt": "2026-08-09T11:29:44.000Z", "schemaName": "laibe.owner-workspace-message-record-receipt.v1", "schemaVersion": "laibe.owner-workspace-message-record-receipt.v1"}}], "snapshotVersion": "db19715d-deab-4a9f-8dc0-4502269e4702", "serviceAgreement": {"status": "active", "endedAt": null, "agreementId": "9e000000-0000-4000-8000-000000000401", "versionNumber": 1, "agreementVersionId": "9e000000-0000-4000-8000-000000000301"}}';

function loadBootstrap() {
  return import(new URL("owner-workspace-bootstrap.js", pageRoot).href);
}

function ownerRuntimeWorkspace(options = {}) {
  const payload = JSON.parse(GOLDEN_SNAPSHOT_PREIMAGE);
  if ("status" in options) payload.status = options.status;
  if ("agreementStatus" in options) {
    payload.serviceAgreement.status = options.agreementStatus;
    payload.serviceAgreement.endedAt = options.agreementStatus === "ended"
      ? "2026-08-09T11:29:59.000Z"
      : null;
  }
  if ("actions" in options) payload.actions = options.actions;
  if ("caseStatus" in options) payload.case.status = options.caseStatus;
  if ("publicMessages" in options) {
    payload.publicMessages = options.publicMessages;
  }
  if (payload.status === "ZERO_CASE_DATA") {
    payload.publicMessages = [];
    payload.actions = [];
  }
  if (payload.serviceAgreement.status === "ended") {
    payload.actions = [];
  }
  if (Reflect.ownKeys(options).length > 0) {
    payload.snapshotVersion =
      options.snapshotVersion ?? "aa000000-0000-4000-8000-000000000202";
  }
  const snapshotPreimage = Reflect.ownKeys(options).length === 0
    ? GOLDEN_SNAPSHOT_PREIMAGE
    : JSON.stringify(payload);
  const snapshotSha256 = sha256(snapshotPreimage);
  return {
    ...JSON.parse(snapshotPreimage),
    readAt: READ_AT,
    canonicalization: {
      id: "laibe.server-issued-json-text.utf8.v1",
      version: 1,
      encoding: "UTF-8",
    },
    snapshotPreimage,
    readReceipt: {
      schemaName: "laibe.owner-workspace-read-receipt.v1",
      schemaVersion: "laibe.owner-workspace-read-receipt.v1",
      receiptId: "9e000000-0000-4000-8000-000000000702",
      caseId: CANONICAL_OWNER_CASE_ID,
      snapshotVersion: payload.snapshotVersion,
      snapshotSha256,
      snapshotByteLength: Buffer.byteLength(snapshotPreimage, "utf8"),
      canonicalizationId: "laibe.server-issued-json-text.utf8.v1",
      canonicalizationVersion: 1,
      issuedAt: READ_AT,
    },
  };
}

function messageFor(index, body) {
  const suffix = String(index + 1).padStart(12, "0");
  const receiptSuffix = String(index + 1001).padStart(12, "0");
  const bodySha256 = sha256(body);
  const messageId = "9e000000-0000-4000-8000-" + suffix;
  return {
    body,
    actor: {
      role: "owner",
      userId: OWNER_USER_ID,
    },
    messageId,
    bodySha256,
    recordReceipt: {
      caseId: CANONICAL_OWNER_CASE_ID,
      messageId,
      receiptId: "9e000000-0000-4000-8000-" + receiptSuffix,
      bodySha256,
      recordedAt: "2026-08-09T11:29:44.000Z",
      schemaName: "laibe.owner-workspace-message-record-receipt.v1",
      schemaVersion: "laibe.owner-workspace-message-record-receipt.v1",
    },
  };
}

test("canonical owner workspace bootstrap uses only explicit trusted injection", async () => {
  const source = await readPageFile("owner-workspace-bootstrap.js");

  assert.doesNotMatch(
    source,
    /URLSearchParams|location\.|document\.cookie|localStorage|sessionStorage|indexedDB|dataset|querySelector\([^)]*script|LaibePcmCanonicalRuntime|globalThis\[/i,
  );
  assert.match(source, /authorizedCaseId/);
  assert.match(source, /loadOwnerWorkspace/);
});

test("invalid bootstrap dependencies fail closed before provider invocation", async () => {
  const { createOwnerWorkspaceBootstrap } = await loadBootstrap();
  let calls = 0;
  const loadOwnerWorkspace = async () => {
    calls += 1;
    return ownerRuntimeWorkspace();
  };
  const accessorInput = { root: null, loadOwnerWorkspace };
  Object.defineProperty(accessorInput, "authorizedCaseId", {
    enumerable: true,
    get() {
      calls += 100;
      return CANONICAL_OWNER_CASE_ID;
    },
  });
  const proxyInput = new Proxy({}, {
    ownKeys() {
      throw new Error("private trap detail");
    },
  });
  const cases = [
    undefined,
    {
      root: null,
      authorizedCaseId: CANONICAL_OWNER_CASE_ID.toUpperCase(),
      loadOwnerWorkspace,
    },
    {
      root: null,
      authorizedCaseId: new String(CANONICAL_OWNER_CASE_ID),
      loadOwnerWorkspace,
    },
    accessorInput,
    proxyInput,
  ];

  for (const input of cases) {
    const controller = createOwnerWorkspaceBootstrap(input);
    const model = await controller.initialize();
    assert.equal(model.state, "CONTRACT_CONTEXT_UNAVAILABLE");
    assert.deepEqual(model.documents, []);
    assert.deepEqual(model.messages, []);
  }
  assert.equal(calls, 0);
});

test("bootstrap sends the canonical selector and maps ready zero and ended states", async () => {
  const { createOwnerWorkspaceBootstrap } = await loadBootstrap();
  const observed = [];
  const run = async (workspace) => {
    const controller = createOwnerWorkspaceBootstrap({
      root: null,
      authorizedCaseId: CANONICAL_OWNER_CASE_ID,
      async loadOwnerWorkspace(selector) {
        observed.push(selector);
        return workspace;
      },
    });
    return controller.initialize();
  };

  const ready = await run(ownerRuntimeWorkspace());
  assert.equal(ready.state, "AUTHORIZED_READY");
  assert.equal(ready.caseName, "Owner case");
  assert.equal(ready.messages.length, 1);

  const zero = await run(ownerRuntimeWorkspace({ status: "ZERO_CASE_DATA" }));
  assert.equal(zero.state, "AUTHORIZED_EMPTY");
  assert.deepEqual(zero.messages, []);

  const ended = await run(ownerRuntimeWorkspace({ agreementStatus: "ended" }));
  assert.equal(ended.state, "PCM_SERVICE_ENDED_READ_ONLY");
  assert.equal(ended.readOnly, true);
  assert.deepEqual(ended.permittedActions, []);

  assert.equal(observed.length, 3);
  for (const selector of observed) {
    assert.deepEqual(Reflect.ownKeys(selector), ["caseId"]);
    assert.equal(selector.caseId, CANONICAL_OWNER_CASE_ID);
  }
});

test("denied and retryable provider results expose fixed product states without stale data", async () => {
  const { createOwnerWorkspaceBootstrap } = await loadBootstrap();
  let turn = 0;
  const controller = createOwnerWorkspaceBootstrap({
    root: null,
    authorizedCaseId: CANONICAL_OWNER_CASE_ID,
    async loadOwnerWorkspace() {
      turn += 1;
      if (turn === 1) return ownerRuntimeWorkspace();
      if (turn === 2) {
        throw Object.assign(new Error("server secret"), {
          code: "OWNER_ACCESS_DENIED",
        });
      }
      throw Object.assign(new Error("transport secret"), {
        code: "OWNER_WORKSPACE_READ_RETRYABLE",
      });
    },
  });

  const ready = await controller.initialize();
  assert.equal(ready.state, "AUTHORIZED_READY");
  assert.equal(ready.messages.length, 1);

  const denied = await controller.initialize();
  assert.equal(denied.state, "ACCESS_DENIED");
  assert.deepEqual(denied.documents, []);
  assert.deepEqual(denied.messages, []);
  assert.doesNotMatch(JSON.stringify(denied), /server secret/);

  const retryable = await controller.initialize();
  assert.equal(retryable.state, "LOAD_FAILED_RETRYABLE");
  assert.deepEqual(retryable.documents, []);
  assert.deepEqual(retryable.messages, []);
  assert.doesNotMatch(JSON.stringify(retryable), /transport secret/);
});
test("replays the exact accepted A6 normalized vector", async () => {
  assert.equal(sha256(GOLDEN_SNAPSHOT_PREIMAGE), SNAPSHOT_SHA256);
  assert.equal(
    Buffer.byteLength(GOLDEN_SNAPSHOT_PREIMAGE, "utf8"),
    SNAPSHOT_BYTES,
  );
  const { createOwnerWorkspaceBootstrap } = await loadBootstrap();
  const controller = createOwnerWorkspaceBootstrap({
    root: null,
    authorizedCaseId: CANONICAL_OWNER_CASE_ID,
    async loadOwnerWorkspace() {
      return ownerRuntimeWorkspace();
    },
  });
  const model = await controller.initialize();

  assert.equal(model.state, "AUTHORIZED_READY");
  assert.equal(model.caseName, "Owner case");
  assert.equal(model.messages.length, 1);
  assert.equal(model.messages[0].body, "Owner workspace public message");
});

test("preserves complete message bytes and the full A6 message collection", async () => {
  const { createOwnerWorkspaceBootstrap } = await loadBootstrap();
  const longBody = "Line one  with  spaces\n" + "x".repeat(600);
  const messages = Array.from(
    { length: 101 },
    (_, index) => messageFor(index, index === 0 ? longBody : "message " + index),
  );
  const controller = createOwnerWorkspaceBootstrap({
    root: null,
    authorizedCaseId: CANONICAL_OWNER_CASE_ID,
    async loadOwnerWorkspace() {
      return ownerRuntimeWorkspace({ publicMessages: messages });
    },
  });
  const model = await controller.initialize();

  assert.equal(model.state, "AUTHORIZED_READY");
  assert.equal(model.messages.length, 101);
  assert.equal(model.messages[0].body, longBody);
  assert.equal(model.messages[0].bodySha256, sha256(longBody));
});

test("keeps one controller and one retry listener across trusted injection", async () => {
  const { createOwnerWorkspaceBootstrap } = await loadBootstrap();
  const listeners = [];
  const retry = {
    hidden: true,
    addEventListener(type, listener) {
      listeners.push([type, listener]);
    },
  };
  const root = {
    body: { dataset: {} },
    querySelector(selector) {
      return selector === '[data-action="retry"]' ? retry : null;
    },
    querySelectorAll() {
      return [];
    },
  };
  let calls = 0;
  const page = createOwnerWorkspaceBootstrap({
    root,
    authorizedCaseId: null,
    loadOwnerWorkspace: null,
  });

  assert.equal((await page.initialize()).state, "CONTRACT_CONTEXT_UNAVAILABLE");
  const ready = await page.configureOwnerWorkspace({
    authorizedCaseId: CANONICAL_OWNER_CASE_ID,
    async loadOwnerWorkspace() {
      calls += 1;
      return ownerRuntimeWorkspace();
    },
  });
  assert.equal(ready.state, "AUTHORIZED_READY");
  assert.equal(calls, 1);
  assert.equal(listeners.length, 1);
  assert.equal(listeners[0][0], "click");

  listeners[0][1]();
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(calls, 2);
  assert.equal(listeners.length, 1);
});

test("rejects receipt drift and coercive normalized fields without invoking hooks", async () => {
  const { createOwnerWorkspaceBootstrap } = await loadBootstrap();
  let coercions = 0;
  const cases = [];

  const badDigest = ownerRuntimeWorkspace();
  badDigest.readReceipt.snapshotSha256 = "b".repeat(64);
  cases.push(badDigest);

  const badSchema = ownerRuntimeWorkspace();
  badSchema.schemaName = "browser.workspace";
  cases.push(badSchema);

  const badVersion = ownerRuntimeWorkspace();
  badVersion.serviceAgreement.versionNumber = {
    [Symbol.toPrimitive]() {
      coercions += 1;
      throw new Error("private coercion detail");
    },
  };
  cases.push(badVersion);

  for (const workspace of cases) {
    const controller = createOwnerWorkspaceBootstrap({
      root: null,
      authorizedCaseId: CANONICAL_OWNER_CASE_ID,
      async loadOwnerWorkspace() {
        return workspace;
      },
    });
    const model = await controller.initialize();
    assert.equal(model.state, "ACCESS_DENIED");
    assert.deepEqual(model.messages, []);
  }
  assert.equal(coercions, 0);
});
// WEB-STITCH-REWORK2-RACE-RED
function deferredResult() {
  let resolve;
  let reject;
  const promise = new Promise((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, reject, resolve };
}

test("latest owner workspace load wins across authoritative reconfiguration", async () => {
  const { createOwnerWorkspaceBootstrap } = await loadBootstrap();
  const older = deferredResult();
  const page = createOwnerWorkspaceBootstrap({
    root: null,
    authorizedCaseId: CANONICAL_OWNER_CASE_ID,
    async loadOwnerWorkspace() {
      return older.promise;
    },
  });

  const olderLoad = page.initialize();
  const newer = await page.configureOwnerWorkspace({
    authorizedCaseId: CANONICAL_OWNER_CASE_ID,
    async loadOwnerWorkspace() {
      const workspace = ownerRuntimeWorkspace({ caseStatus: "on_hold" });
      workspace.case.title = "Newer owner case";
      const payload = JSON.parse(workspace.snapshotPreimage);
      payload.case.title = "Newer owner case";
      workspace.snapshotPreimage = JSON.stringify(payload);
      workspace.readReceipt.snapshotSha256 = sha256(workspace.snapshotPreimage);
      workspace.readReceipt.snapshotByteLength = Buffer.byteLength(
        workspace.snapshotPreimage,
        "utf8",
      );
      return workspace;
    },
  });
  assert.equal(newer.state, "AUTHORIZED_READY");
  assert.equal(newer.caseName, "Newer owner case");

  older.resolve(ownerRuntimeWorkspace());
  const staleCompletion = await olderLoad;
  assert.equal(staleCompletion.state, "AUTHORIZED_READY");
  assert.equal(staleCompletion.caseName, "Newer owner case");
});

test("late authorized data cannot overwrite a newer denial or retry result", async () => {
  const { createOwnerWorkspaceBootstrap } = await loadBootstrap();
  const first = deferredResult();
  const second = deferredResult();
  let call = 0;
  const page = createOwnerWorkspaceBootstrap({
    root: null,
    authorizedCaseId: CANONICAL_OWNER_CASE_ID,
    async loadOwnerWorkspace() {
      call += 1;
      return call === 1 ? first.promise : second.promise;
    },
  });

  const olderLoad = page.initialize();
  const newerLoad = page.initialize();
  second.reject(Object.assign(new Error("new denial"), {
    code: "OWNER_ACCESS_DENIED",
  }));
  const denied = await newerLoad;
  assert.equal(denied.state, "ACCESS_DENIED");

  first.resolve(ownerRuntimeWorkspace());
  const staleCompletion = await olderLoad;
  assert.equal(staleCompletion.state, "ACCESS_DENIED");
  assert.deepEqual(staleCompletion.messages, []);
});

test("bootstrap mirrors the closed A6 action message and case-state invariants", async () => {
  const { createOwnerWorkspaceBootstrap } = await loadBootstrap();
  const validActions = ownerRuntimeWorkspace({
    actions: ["view_case", "view_documents", "view_public_messages"],
  });
  const validController = createOwnerWorkspaceBootstrap({
    root: null,
    authorizedCaseId: CANONICAL_OWNER_CASE_ID,
    async loadOwnerWorkspace() {
      return validActions;
    },
  });
  assert.equal((await validController.initialize()).state, "AUTHORIZED_READY");

  const duplicateActions = ownerRuntimeWorkspace({
    actions: ["view_case", "view_case"],
  });
  const unknownAction = ownerRuntimeWorkspace({ actions: ["view_case", "edit_case"] });
  const invalidActorId = messageFor(20, "valid body");
  invalidActorId.actor.userId = invalidActorId.actor.userId.toUpperCase();
  const invalidActorRole = messageFor(21, "valid body");
  invalidActorRole.actor.role = "designer";
  const malformedBody = messageFor(22, "\ud800");
  const overlongBody = messageFor(23, "x".repeat(20001));
  const invalidCases = [
    duplicateActions,
    unknownAction,
    ownerRuntimeWorkspace({ publicMessages: [invalidActorId] }),
    ownerRuntimeWorkspace({ publicMessages: [invalidActorRole] }),
    ownerRuntimeWorkspace({ publicMessages: [malformedBody] }),
    ownerRuntimeWorkspace({ publicMessages: [overlongBody] }),
    ownerRuntimeWorkspace({ caseStatus: "archived" }),
  ];

  for (const workspace of invalidCases) {
    const controller = createOwnerWorkspaceBootstrap({
      root: null,
      authorizedCaseId: CANONICAL_OWNER_CASE_ID,
      async loadOwnerWorkspace() {
        return workspace;
      },
    });
    const model = await controller.initialize();
    assert.equal(model.state, "ACCESS_DENIED");
    assert.deepEqual(model.messages, []);
  }
});

test("valid A6 roles and case states retain precise Traditional Chinese meaning", async () => {
  const { createOwnerWorkspaceBootstrap } = await loadBootstrap();
  const roleCases = [
    ["owner", "\u696d\u4e3b"],
    ["pro", "\u8a2d\u8a08\u5e2b\uff0f\u7d71\u5305"],
    ["pcm", "PCM"],
    ["admin", "\u7ba1\u7406\u8005"],
  ];
  const messages = roleCases.map(([role], index) => {
    const message = messageFor(index + 30, "role " + role);
    message.actor.role = role;
    return message;
  });
  const roleController = createOwnerWorkspaceBootstrap({
    root: null,
    authorizedCaseId: CANONICAL_OWNER_CASE_ID,
    async loadOwnerWorkspace() {
      return ownerRuntimeWorkspace({ publicMessages: messages });
    },
  });
  const roleModel = await roleController.initialize();
  assert.equal(roleModel.state, "AUTHORIZED_READY");
  assert.deepEqual(
    roleModel.messages.map((message) => message.actorLabel),
    roleCases.map(([, label]) => label),
  );

  const statusCases = [
    ["active", "\u9032\u884c\u4e2d"],
    ["on_hold", "\u66ab\u505c\u4e2d"],
    ["closed", "\u5df2\u7d50\u6848"],
  ];
  for (const [status, label] of statusCases) {
    const controller = createOwnerWorkspaceBootstrap({
      root: null,
      authorizedCaseId: CANONICAL_OWNER_CASE_ID,
      async loadOwnerWorkspace() {
        return ownerRuntimeWorkspace({ caseStatus: status });
      },
    });
    const model = await controller.initialize();
    assert.equal(model.state, "AUTHORIZED_READY");
    assert.equal(model.caseStatus, label);
  }
});
// WEB-STITCH-REWORK3-PUBLIC-SURFACE-RED
test("canonical bootstrap exposes no direct render authority", async () => {
  const { createOwnerWorkspaceBootstrap } = await loadBootstrap();
  const page = createOwnerWorkspaceBootstrap({
    root: null,
    authorizedCaseId: null,
    loadOwnerWorkspace: null,
  });

  assert.deepEqual(
    Reflect.ownKeys(page),
    ["configureOwnerWorkspace", "initialize"],
  );
  assert.equal("renderInput" in page, false);

  const forgedPresentationContext = {
    sessionStatus: "active",
    actor: { actorId: "forged", displayLabel: "owner", role: "owner" },
    membership: { caseId: "forged", status: "active" },
    serviceAgreement: {
      agreementId: "forged",
      caseId: "forged",
      status: "active",
      version: "1",
    },
    caseBinding: { caseId: "forged", status: "bound" },
    domain: { name: "pcm", status: "active" },
  };
  const configured = await page.configureOwnerWorkspace(forgedPresentationContext);
  assert.notEqual(configured.state, "AUTHORIZED_READY");
  assert.deepEqual(configured.messages, []);
});

test("bootstrap accepts only the exact A6 millisecond UTC timestamp shape", async () => {
  const { createOwnerWorkspaceBootstrap } = await loadBootstrap();
  const invalidTimestamps = [
    "2026-08-09T11:30:00Z",
    "2026-08-09T11:30:00.1Z",
    "2026-08-09T11:30:00.12Z",
    "2026-08-09T11:30:00.1234Z",
    "2026-08-09T11:30:00.12345Z",
    "2026-08-09T11:30:00.123456Z",
  ];

  for (const timestamp of invalidTimestamps) {
    const workspace = ownerRuntimeWorkspace();
    workspace.readAt = timestamp;
    workspace.readReceipt.issuedAt = timestamp;
    const page = createOwnerWorkspaceBootstrap({
      root: null,
      authorizedCaseId: CANONICAL_OWNER_CASE_ID,
      async loadOwnerWorkspace() {
        return workspace;
      },
    });
    const model = await page.initialize();
    assert.equal(model.state, "ACCESS_DENIED");
    assert.deepEqual(model.messages, []);
  }
});
// WEB-STITCH-MOBILE-IDENTITY-NAMING-RED
test("canonical workspace uses the Decision & Record System name", async () => {
  const html = await readPageFile("code.html");
  assert.doesNotMatch(html, /AI PCM/i);
  assert.match(html, /<title>[^<]*LaiBE Decision &amp; Record System<\/title>/);
  assert.match(html, /class="brand__product">Decision &amp; Record System<\/span>/);
  assert.match(html, /aria-label="回到 LaiBE Decision &amp; Record System 首頁"/);
});

test("mobile header keeps the current case identity visible", async () => {
  const css = await readPageFile("styles.css");
  assert.doesNotMatch(
    css,
    /context-chip\[data-slot="case-name"\]\s*\{[^}]*display:\s*none/i,
  );
  assert.match(
    css,
    /@media\s*\(max-width:\s*760px\)[\s\S]*context-chip\[data-slot="case-name"\][\s\S]*grid-column:\s*1\s*\/\s*-1/i,
  );
});
