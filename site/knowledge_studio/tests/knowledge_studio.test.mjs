import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import * as Studio from "../app.js";

const {
  createDemoRecords,
  filterRecords,
  GatewayAdapter,
  LocalKnowledgeStore,
  resolveVisibleSelectionId,
  STATUS,
} = Studio;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const studioRoot = path.resolve(__dirname, "..");

function completeDraft(overrides = {}) {
  return {
    title: "電視櫃跨圖一致性",
    type: "圖說檢查規則",
    owner: "PCM 圖說組",
    summary: "比對家具、插座與弱電圖的必要出口。",
    criteria: "同一電視櫃位置應有電源、網路與電視出線。",
    nextOwner: "PCM 覆核人",
    evidence: "住宅圖說檢查基準／弱電章",
    sourceDate: "2026-07-27",
    actor: "目前使用者",
    ...overrides,
  };
}

test("new draft starts as a transient buffer and cancel leaves no record", async () => {
  const store = new LocalKnowledgeStore(createDemoRecords());
  const before = await store.list();

  const buffer = Studio.createDraftBuffer();
  assert.equal(buffer.id, null);
  assert.equal(buffer.persisted, false);
  assert.equal(buffer.dirty, false);
  assert.equal(buffer.title, "");

  const discarded = Studio.discardDraftBuffer(buffer);
  assert.equal(discarded, null);
  assert.equal((await store.list()).length, before.length);
});

test("draft validation reports every required field in human language", () => {
  const result = Studio.validateDraft({
    title: "",
    type: "",
    owner: "",
    summary: "",
    criteria: "",
    nextOwner: "",
    evidence: "",
  });

  assert.equal(result.valid, false);
  assert.deepEqual(Object.keys(result.errors), [
    "title",
    "type",
    "owner",
    "summary",
    "criteria",
    "nextOwner",
    "evidence",
  ]);
  assert.deepEqual(Object.values(result.errors), [
    "請填寫規則名稱。",
    "請選擇規則類型。",
    "請填寫負責人。",
    "請填寫規則摘要。",
    "請填寫判斷條件。",
    "請指定下一位處理者。",
    "請填寫來源依據。",
  ]);
  assert.equal(Studio.validateDraft(completeDraft()).valid, true);
});

test("save and submit atomically persists the latest edit", async () => {
  const store = new LocalKnowledgeStore(createDemoRecords());
  const draft = await store.createDraft(completeDraft());

  const submitted = await store.saveAndSubmitReview({
    ...completeDraft(),
    id: draft.id,
    title: "送審前最後版本",
  });

  assert.equal(submitted.status, STATUS.PENDING_REVIEW);
  assert.equal(submitted.title, "送審前最後版本");
  assert.equal(submitted.events.at(-1).action, "submit_review");
  assert.equal((await store.get(draft.id)).title, "送審前最後版本");
});

test("atomic submission failure restores the original draft and audit events", async () => {
  class FailingTransitionStore extends LocalKnowledgeStore {
    async transition(id, action, context) {
      if (action === "submit_review") {
        throw new Error("送交覆核失敗");
      }
      return super.transition(id, action, context);
    }
  }

  const store = new FailingTransitionStore(createDemoRecords());
  const draft = await store.createDraft(completeDraft());
  const before = await store.get(draft.id);

  await assert.rejects(
    () =>
      store.saveAndSubmitReview({
        ...completeDraft(),
        id: draft.id,
        title: "不應留下的半套更新",
      }),
    /送交覆核失敗/,
  );

  assert.deepEqual(await store.get(draft.id), before);
});

test("incomplete content cannot be submitted locally", async () => {
  const store = new LocalKnowledgeStore([]);
  const draft = await store.createDraft({
    title: "只有名稱",
    type: "圖說檢查規則",
  });

  await assert.rejects(
    () =>
      store.saveAndSubmitReview({
        ...draft,
        title: "只有名稱",
        type: "圖說檢查規則",
      }),
    /請填寫規則摘要/,
  );
  assert.equal((await store.get(draft.id)).status, STATUS.DRAFT);
});

test("local store supports the complete review lifecycle", async () => {
  const store = new LocalKnowledgeStore(createDemoRecords());
  const draft = await store.createDraft({
    ...completeDraft(),
    title: "電視櫃弱電出口檢查",
  });

  await store.transition(draft.id, "submit_review", {
    actor: "王專員",
    nextOwner: "PCM 覆核人",
  });
  const submitted = await store.get(draft.id);
  assert.equal(submitted.status, STATUS.PENDING_REVIEW);
  assert.equal(submitted.nextAction, "由 PCM 覆核內容與依據");
  assert.equal(
    submitted.events.at(-1).nextAction,
    "由 PCM 覆核內容與依據",
  );

  await store.transition(draft.id, "publish", {
    actor: "陳主任",
    nextOwner: "PCM 維護人",
  });
  const published = await store.get(draft.id);
  assert.equal(published.status, STATUS.APPROVED);
  assert.equal(published.version, 1);

  await store.transition(draft.id, "retire", {
    actor: "陳主任",
    nextOwner: "PCM 維護人",
  });
  assert.equal((await store.get(draft.id)).status, STATUS.RETIRED);
});

test("published content cannot be edited without a new draft version", async () => {
  const store = new LocalKnowledgeStore(createDemoRecords());
  const published = (await store.list()).find(
    (record) => record.status === STATUS.APPROVED,
  );

  await assert.rejects(
    () => store.saveDraft({ ...published, title: "直接改寫" }),
    /建立新版本/,
  );
  const nextVersion = await store.createRevision(published.id, "林專員");
  assert.equal(nextVersion.status, STATUS.DRAFT);
  assert.equal(nextVersion.version, published.version + 1);
});

test("filtering covers search, status, type and next owner", () => {
  const records = createDemoRecords();
  const result = filterRecords(records, {
    query: "防水",
    status: STATUS.PENDING_REVIEW,
    type: "驗收依據",
    nextOwner: "PCM 覆核人",
  });
  assert.equal(result.length, 1);
  assert.match(result[0].title, /防水/);
});

test("source-focused filtering keeps only records with traceable evidence", () => {
  const result = filterRecords(
    [
      { title: "有依據", evidence: "文件第 3 頁" },
      { title: "待補來源", evidence: "" },
    ],
    { evidenceOnly: true },
  );
  assert.deepEqual(
    result.map((record) => record.title),
    ["有依據"],
  );
});

test("filtered views do not keep a hidden record selected", () => {
  const records = createDemoRecords();
  const pending = filterRecords(records, {
    status: STATUS.PENDING_REVIEW,
  });
  const draft = records.find((record) => record.status === STATUS.DRAFT);

  assert.equal(
    resolveVisibleSelectionId(pending, draft.id),
    pending[0].id,
  );
  assert.equal(
    resolveVisibleSelectionId(pending, pending[0].id),
    pending[0].id,
  );
  assert.equal(resolveVisibleSelectionId([], pending[0].id), null);
  assert.equal(resolveVisibleSelectionId(pending, null), null);
});

test("remote adapter sends lifecycle operations to one protected endpoint", async () => {
  const calls = [];
  const entryId = "11111111-1111-4111-8111-111111111111";
  const versionId = "22222222-2222-4222-8222-222222222222";
  const adapter = new GatewayAdapter({
    endpoint: "https://example.test/knowledge-studio",
    projectKey: "sb_publishable_test",
    tokenProvider: async () => "short-lived-token",
    fetcher: async (url, options) => {
      calls.push({ url, options, body: JSON.parse(options.body) });
      return { ok: true, json: async () => ({ ok: true }) };
    },
  });

  await adapter.list({
    status: STATUS.PENDING_REVIEW,
    domain: "drawing_review",
    limit: 50,
  });
  await adapter.get(entryId);
  await adapter.createDraft({ title: "新規則", type: "驗收依據" });
  await adapter.saveDraft({
    id: entryId,
    versionId,
    title: "更新規則",
  });
  await adapter.createRevision(entryId, "王專員");
  await adapter.saveAndSubmitReview({
    ...completeDraft(),
    id: entryId,
    entryId,
    versionId,
    title: "送審前最後版本",
  });
  await adapter.transition(entryId, "submit_review", {
    versionId,
    actor: "王專員",
  });
  await adapter.transition(entryId, "return_revision", {
    versionId,
    actor: "陳主任",
  });
  await adapter.transition(entryId, "publish", {
    versionId,
    actor: "陳主任",
  });
  await adapter.transition(entryId, "retire", { actor: "陳主任" });

  assert.deepEqual(
    calls.map((call) => call.body.operation),
    [
      "listRecords",
      "getRecord",
      "createDraft",
      "updateDraft",
      "createRevision",
      "saveAndSubmitReview",
      "submitReview",
      "returnToDraft",
      "publish",
      "retire",
    ],
  );
  assert.deepEqual(calls[0].body, {
    operation: "listRecords",
    lifecycle: STATUS.PENDING_REVIEW,
    domain: "drawing_review",
    limit: 50,
  });
  assert.deepEqual(calls[1].body, {
    operation: "getRecord",
    entryId,
  });
  assert.equal(
    calls[2].body.payload.schema_version,
    "knowledge_studio.v1",
  );
  assert.equal(
    calls[2].body.payload.content.displayType,
    "驗收依據",
  );
  assert.equal(
    calls[2].body.payload.rule.ruleType,
    "acceptance_rule",
  );
  assert.equal(calls[3].body.entryId, entryId);
  assert.equal(calls[3].body.versionId, versionId);
  assert.equal(calls[3].body.payload.schema_version, "knowledge_studio.v1");
  assert.equal(calls[5].body.operation, "saveAndSubmitReview");
  assert.equal(calls[5].body.versionId, versionId);
  assert.equal(calls[5].body.payload.title, "送審前最後版本");
  assert.equal(calls[6].body.operation, "submitReview");
  assert.equal(calls[6].body.versionId, versionId);
  for (const call of calls) {
    assert.equal(call.url, "https://example.test/knowledge-studio");
    assert.equal(call.options.method, "POST");
    assert.equal(
      call.options.headers.Authorization,
      "Bearer short-lived-token",
    );
    assert.equal(call.options.headers.apikey, "sb_publishable_test");
  }
});

test("remote draft summaries preserve their studio display type", () => {
  const adapter = new GatewayAdapter({
    endpoint: "https://example.test/knowledge-studio",
    tokenProvider: async () => "short-lived-token",
  });
  const normalized = adapter.normalizeSummary({
    entryId: "11111111-1111-4111-8111-111111111111",
    versionId: "22222222-2222-4222-8222-222222222222",
    domain: "drawing_review",
    displayType: "驗收依據",
    lifecycleState: STATUS.PENDING_REVIEW,
    version: 1,
    title: "防水試水紀錄",
  });

  assert.equal(normalized.type, "驗收依據");
});

test("remote summaries keep next owner and next action as separate fields", () => {
  const adapter = new GatewayAdapter({
    endpoint: "https://example.test/knowledge-studio",
    tokenProvider: async () => "short-lived-token",
  });
  const normalized = adapter.normalizeSummary({
    entryId: "11111111-1111-4111-8111-111111111111",
    versionId: "22222222-2222-4222-8222-222222222222",
    domain: "drawing_review",
    lifecycleState: STATUS.PENDING_REVIEW,
    version: 1,
    title: "防水試水紀錄",
    nextOwnerRole: "PCM 覆核人",
    nextAction: "等待覆核決定",
  });

  assert.equal(normalized.nextOwner, "PCM 覆核人");
  assert.equal(normalized.nextAction, "等待覆核決定");
});

test("connected Studio payloads use only database-supported rule values", async () => {
  const adapter = new GatewayAdapter({
    endpoint: "https://example.test/knowledge-studio",
    tokenProvider: async () => "short-lived-token",
  });

  const drawing = await adapter.studioPayload(completeDraft({
    type: "圖說檢查規則",
  }));
  const budget = await adapter.studioPayload(completeDraft({
    type: "預算守門規則",
  }));
  const contract = await adapter.studioPayload(completeDraft({
    type: "契約邊界",
  }));

  assert.equal(drawing.rule.ruleKind, "cross_sheet_consistency");
  assert.equal(budget.rule.ruleKind, "scope_difference");
  assert.equal(contract.rule.allowedOutputKind, "comparison");
});

test("remote detail keeps edited evidence and formal-action notes", () => {
  const adapter = new GatewayAdapter({
    endpoint: "https://example.test/knowledge-studio",
    tokenProvider: async () => "short-lived-token",
  });
  const normalized = adapter.normalizeDetail({
    entryId: "11111111-1111-4111-8111-111111111111",
    domain: "drawing_review",
    entryState: STATUS.PENDING_REVIEW,
    versions: [
      {
        versionId: "22222222-2222-4222-8222-222222222222",
        version: 2,
        title: "跨圖一致性",
        summary: "已更新",
        lifecycleState: STATUS.PENDING_REVIEW,
        content: {
          displayType: "圖說檢查規則",
          owner: "PCM 圖說組",
          criteria: "依最新內容檢查",
          nextOwner: "PCM 覆核人",
        },
        evidenceSummary: ["更新後來源／第 7 頁"],
        source: { locator: "更新後來源／第 7 頁" },
        rule: {
          ruleType: "drawing_rule",
          conditions: { criteria: "依最新內容檢查" },
        },
        createdAt: "2026-07-27T00:02:00.000Z",
      },
      {
        versionId: "11111111-2222-4222-8222-222222222222",
        version: 1,
        title: "跨圖一致性",
        summary: "原始內容",
        lifecycleState: STATUS.DRAFT,
        evidenceSummary: ["原始來源／第 1 頁"],
        source: { locator: "原始來源／第 1 頁" },
        rule: {
          ruleType: "drawing_rule",
          conditions: { criteria: "依原始內容檢查" },
        },
        createdAt: "2026-07-27T00:00:00.000Z",
      },
    ],
    events: [
      {
        eventType: "draft_created",
        versionId: "11111111-2222-4222-8222-222222222222",
        sourceDocument: "原始來源／第 1 頁",
        actorId: "33333333-3333-4333-8333-333333333333",
        actorLabel: "林專員",
        actorRole: "PCM 覆核人",
        occurredAt: "2026-07-27T00:01:00.000Z",
        afterState: STATUS.DRAFT,
        nextOwnerRole: "規則整理人",
        note: "建立草稿",
      },
      {
        eventType: "returned_to_draft",
        versionId: "22222222-2222-4222-8222-222222222222",
        sourceDocument: "更新後來源／第 7 頁",
        actorId: "33333333-3333-4333-8333-333333333333",
        actorLabel: "林專員",
        actorRole: "PCM 覆核人",
        occurredAt: "2026-07-27T00:03:00.000Z",
        afterState: STATUS.DRAFT,
        nextOwnerRole: "規則整理人",
        note: "請補充來源頁碼",
      },
    ],
  });

  assert.equal(normalized.evidence, "更新後來源／第 7 頁");
  assert.equal(
    normalized.events[1].actorId,
    "33333333-3333-4333-8333-333333333333",
  );
  assert.equal(normalized.events[1].actor, "林專員（PCM 覆核人）");
  assert.equal(normalized.events[1].note, "請補充來源頁碼");
  assert.deepEqual(
    normalized.events.map((event) => event.sourceDocument),
    ["原始來源／第 1 頁", "更新後來源／第 7 頁"],
  );
});

test("verified actor identity never renders email or a raw UUID", () => {
  assert.equal(
    Studio.formatActorIdentity({
      actorId: "33333333-3333-4333-8333-333333333333",
      actorLabel: "ADM-7C3A9E21",
      actorRole: "admin",
    }),
    "ADM-7C3A9E21（管理者）",
  );
  assert.equal(
    Studio.formatActorIdentity({
      actorId: "33333333-3333-4333-8333-333333333333",
      actorLabel: "reviewer@example.test",
      actorRole: "pcm",
    }),
    "PCM-33333333（PCM）",
  );
});

test("new and existing editors share one unsaved navigation decision", () => {
  for (const state of [
    { editorMode: "new", dirty: false },
    { editorMode: "edit", dirty: true },
  ]) {
    assert.deepEqual(
      Studio.decideUnsavedNavigation({
        ...state,
        discardConfirmed: false,
      }),
      { allow: false, discard: false },
    );
    assert.deepEqual(
      Studio.decideUnsavedNavigation({
        ...state,
        discardConfirmed: true,
      }),
      { allow: true, discard: true },
    );
  }
  assert.deepEqual(
    Studio.decideUnsavedNavigation({
      editorMode: "edit",
      dirty: false,
      discardConfirmed: false,
    }),
    { allow: true, discard: false },
  );
});

test("request gate rejects an out-of-order response", async () => {
  const gate = Studio.createRequestGate();
  const commits = [];
  let releaseFirst;
  let releaseSecond;
  const firstResponse = new Promise((resolve) => {
    releaseFirst = resolve;
  });
  const secondResponse = new Promise((resolve) => {
    releaseSecond = resolve;
  });

  async function load(response) {
    const request = gate.begin();
    const value = await response;
    if (gate.isCurrent(request)) commits.push(value);
    gate.finish(request);
  }

  const first = load(firstResponse);
  const second = load(secondResponse);
  releaseSecond("latest");
  await second;
  releaseFirst("stale");
  await first;

  assert.deepEqual(commits, ["latest"]);
});

for (const action of ["create", "save", "submit", "publish"]) {
  test(`${action} write success with reload failure retries read only`, async () => {
    let writes = 0;
    let reads = 0;
    const coordinator = new Studio.CommittedMutationCoordinator(
      async (record) => {
        reads += 1;
        if (reads === 1) throw new Error("同步失敗");
        return { ...record, synced: true };
      },
    );

    const result = await coordinator.run(action, async () => {
      writes += 1;
      return {
        id: "11111111-1111-4111-8111-111111111111",
        versionId: "22222222-2222-4222-8222-222222222222",
        status: action === "submit" ? STATUS.PENDING_REVIEW : STATUS.DRAFT,
      };
    });

    assert.equal(result.status, "sync_failed");
    assert.equal(writes, 1);
    assert.equal(coordinator.pending.action, action);

    const blocked = await coordinator.run(action, async () => {
      writes += 1;
      return {};
    });
    assert.equal(blocked.status, "blocked");
    assert.equal(writes, 1);

    const retried = await coordinator.retry();
    assert.equal(retried.status, "synced");
    assert.equal(retried.record.synced, true);
    assert.equal(writes, 1);
    assert.equal(reads, 2);
    assert.equal(coordinator.pending, null);
  });
}

test("mobile back never hides an unsaved editor without an explicit discard", () => {
  assert.deepEqual(
    Studio.decideMobileBack({
      editorMode: "new",
      dirty: false,
      discardConfirmed: false,
    }),
    { action: "stay", discard: false },
  );
  assert.deepEqual(
    Studio.decideMobileBack({
      editorMode: "new",
      dirty: false,
      discardConfirmed: true,
    }),
    { action: "list", discard: true },
  );
  assert.deepEqual(
    Studio.decideMobileBack({
      editorMode: "edit",
      dirty: true,
      discardConfirmed: false,
    }),
    { action: "stay", discard: false },
  );
  assert.deepEqual(
    Studio.decideMobileBack({
      editorMode: "edit",
      dirty: false,
      discardConfirmed: false,
    }),
    { action: "list", discard: false },
  );
});

test("visible studio copy contains no prohibited engineering or legal claims", () => {
  const visibleSources = ["code.html", "app.js"]
    .map((file) => fs.readFileSync(path.join(studioRoot, file), "utf8"))
    .join("\n");
  const prohibited = [
    /\bDB\b/i,
    /\bAPI\b/i,
    /\bmock\b/i,
    /\bdebug\b/i,
    /raw JSON/i,
    /真電子簽章/,
    /法律認證/,
    /正式工程核准/,
    /付款保障/,
    /代收代付/,
    /託管/,
    new RegExp(`\\b${"D"}${"WG"}\\b`, "i"),
  ];

  for (const pattern of prohibited) {
    assert.doesNotMatch(visibleSources, pattern);
  }
});

test("studio navigation exposes all, review and source-focused views", () => {
  const html = fs.readFileSync(path.join(studioRoot, "code.html"), "utf8");
  assert.match(html, /data-view="all"/);
  assert.match(html, /data-view="review"/);
  assert.match(html, /data-view="source"/);
  assert.match(html, /只有完成覆核並發布的規則/);
  assert.match(html, /app\.js\?v=\d+/);
});
