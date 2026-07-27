import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  createDemoRecords,
  filterRecords,
  GatewayAdapter,
  LocalKnowledgeStore,
  resolveVisibleSelectionId,
  STATUS,
} from "../app.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const studioRoot = path.resolve(__dirname, "..");

test("local store supports the complete review lifecycle", async () => {
  const store = new LocalKnowledgeStore(createDemoRecords());
  const draft = await store.createDraft({
    title: "電視櫃弱電出口檢查",
    type: "圖說檢查規則",
    owner: "PCM",
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
  assert.equal(calls[5].body.operation, "submitReview");
  assert.equal(calls[5].body.versionId, versionId);
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
