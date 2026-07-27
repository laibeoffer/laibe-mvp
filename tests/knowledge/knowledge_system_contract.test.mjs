import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const TEST_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(TEST_DIR, "..", "..");
const FIXTURE_DIR = join(TEST_DIR, "fixtures");
const MIGRATIONS_DIR = join(REPO_ROOT, "supabase", "migrations");
const POLICY_MODULE = join(
  REPO_ROOT,
  "scripts",
  "knowledge",
  "knowledge-policy.mjs",
);
const GATEWAY_DIR = join(
  REPO_ROOT,
  "supabase",
  "functions",
  "knowledge-gateway",
);
const STUDIO_DIR = join(REPO_ROOT, "site", "knowledge_studio");

const readJson = (name) =>
  JSON.parse(readFileSync(join(FIXTURE_DIR, name), "utf8"));

const listFiles = (root, predicate = () => true) => {
  if (!existsSync(root)) return [];
  const result = [];
  const visit = (current) => {
    for (const entry of readdirSync(current)) {
      const absolute = join(current, entry);
      if (statSync(absolute).isDirectory()) {
        visit(absolute);
      } else if (predicate(absolute)) {
        result.push(absolute);
      }
    }
  };
  visit(root);
  return result;
};

const readJoined = (files) =>
  files.map((file) => readFileSync(file, "utf8")).join("\n");

const requireFiles = (files, message) => {
  assert.ok(files.length > 0, `IMPLEMENTATION_MISSING: ${message}`);
  return files;
};

const loadPolicy = async () => {
  assert.ok(
    existsSync(POLICY_MODULE),
    "IMPLEMENTATION_MISSING: scripts/knowledge/knowledge-policy.mjs",
  );
  return import(`${pathToFileURL(POLICY_MODULE).href}?qa=${Date.now()}`);
};

const visibleHtmlText = (html) =>
  html
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<script\b[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;|&#160;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();

test("QA fixtures lock the 76-file budget source to staging with row-level provenance", () => {
  const fixture = readJson("budget-source-provenance.fixture.json");
  assert.deepEqual(fixture.expected_inventory, {
    total: 76,
    xlsx: 69,
    md: 4,
    json: 3,
  });
  assert.equal(fixture.target_schema, "knowledge_staging");
  assert.deepEqual(fixture.required_provenance_fields, [
    "relative_path",
    "file_sha256",
    "worksheet_name",
    "row_number",
  ]);
  assert.match(fixture.valid_row.file_sha256, /^[a-f0-9]{64}$/);
  assert.ok(fixture.valid_row.relative_path);
  assert.ok(fixture.valid_row.worksheet_name);
  assert.ok(Number.isInteger(fixture.valid_row.row_number));
});

test("migration creates knowledge_staging, knowledge, and casework schemas", () => {
  const sqlFiles = requireFiles(
    listFiles(MIGRATIONS_DIR, (file) => file.endsWith(".sql")),
    "Supabase migration SQL under supabase/migrations",
  );
  const sql = readJoined(sqlFiles);
  for (const schema of ["knowledge_staging", "knowledge", "casework"]) {
    assert.match(
      sql,
      new RegExp(
        `create\\s+schema\\s+(if\\s+not\\s+exists\\s+)?${schema}`,
        "i",
      ),
      `Missing schema: ${schema}`,
    );
  }
});

test("migration defines lifecycle states and prevents source-approved auto publication", () => {
  const sql = readJoined(
    requireFiles(
      listFiles(MIGRATIONS_DIR, (file) => file.endsWith(".sql")),
      "Supabase migration SQL under supabase/migrations",
    ),
  );
  for (
    const state of [
      "inbox",
      "draft",
      "pending_review",
      "approved",
      "retired",
    ]
  ) {
    assert.match(sql, new RegExp(`['\"]${state}['\"]`, "i"));
  }
  assert.match(sql, /source_status|source_state|obsidian_status/i);
  assert.match(sql, /pending_review/i);
});

test("migration enables RLS and authorizes owner, pro, pcm, admin from app metadata", () => {
  const sql = readJoined(
    requireFiles(
      listFiles(MIGRATIONS_DIR, (file) => file.endsWith(".sql")),
      "Supabase migration SQL under supabase/migrations",
    ),
  );
  assert.match(sql, /enable\s+row\s+level\s+security/i);
  for (const role of ["owner", "pro", "pcm", "admin"]) {
    assert.match(sql, new RegExp(`['\"]${role}['\"]`, "i"));
  }
  assert.match(sql, /app_metadata|raw_app_meta_data/i);
  assert.doesNotMatch(sql, /user_metadata|raw_user_meta_data/i);
  assert.match(sql, /create\s+policy/i);
  assert.match(sql, /using\s*\(/i);
  assert.match(sql, /with\s+check\s*\(/i);
});

test("migration makes audit events append-only", () => {
  const sql = readJoined(
    requireFiles(
      listFiles(MIGRATIONS_DIR, (file) => file.endsWith(".sql")),
      "Supabase migration SQL under supabase/migrations",
    ),
  );
  assert.match(sql, /audit_events|case_events|knowledge_events/i);
  assert.match(
    sql,
    /revoke\s+(update\s*,\s*delete|delete\s*,\s*update)|raise\s+exception|append[_ -]?only/i,
    "Audit tables need explicit update/delete denial or a rejecting trigger",
  );
});

test("Obsidian import is one-way to staging and maps source approval to pending review", async () => {
  const fixture = readJson("obsidian-status.fixture.json");
  const policy = await loadPolicy();
  assert.equal(typeof policy.mapObsidianStatus, "function");
  assert.equal(typeof policy.normalizeObsidianRecord, "function");

  for (const item of fixture.cases) {
    assert.equal(
      policy.mapObsidianStatus(item.source_status),
      item.expected_status,
    );
  }

  const normalized = policy.normalizeObsidianRecord({
    source_status: "已核准",
    relative_path: "01_統一工項/固定收納櫃.md",
    source_ref: "obsidian:固定收納櫃",
  });
  assert.equal(normalized.target_schema, "knowledge_staging");
  assert.equal(normalized.status, "pending_review");
  assert.equal(normalized.auto_publish, false);
});

test("budget source normalization preserves traceability and quarantines missing/conflicting rows", async () => {
  const fixture = readJson("budget-source-provenance.fixture.json");
  const policy = await loadPolicy();
  assert.equal(typeof policy.normalizeBudgetSourceRecord, "function");

  const valid = policy.normalizeBudgetSourceRecord(fixture.valid_row);
  assert.equal(valid.target_schema, "knowledge_staging");
  assert.equal(valid.direct_pricing_allowed, false);
  assert.equal(valid.candidate_budget_line_allowed, false);
  assert.equal(valid.provenance.relative_path, fixture.valid_row.relative_path);
  assert.equal(valid.provenance.file_sha256, fixture.valid_row.file_sha256);
  assert.equal(
    valid.provenance.worksheet_name,
    fixture.valid_row.worksheet_name,
  );
  assert.equal(valid.provenance.row_number, fixture.valid_row.row_number);
  assert.equal(valid.unified_item_name, fixture.valid_row.unified_item_name);
  assert.deepEqual(
    valid.classification_path,
    fixture.valid_row.classification_path,
  );

  const missing = policy.normalizeBudgetSourceRecord(
    fixture.missing_field_row,
  );
  assert.equal(missing.status, "pending_review");
  assert.ok(missing.quality_issues.includes("missing_required_field"));

  const conflict = policy.normalizeBudgetSourceRecord(fixture.conflict_row);
  assert.equal(conflict.status, "pending_review");
  assert.ok(conflict.quality_issues.includes("classification_conflict"));
});

test("A12 may record PDF evidence/findings but may not create budget, price, or contract decisions", async () => {
  const fixture = readJson("gateway-policy.fixture.json");
  const policy = await loadPolicy();
  assert.equal(typeof policy.authorizeA12Action, "function");

  for (const action of fixture.a12_allowed_actions) {
    assert.equal(policy.authorizeA12Action(action), true, action);
  }
  for (const action of fixture.a12_forbidden_actions) {
    assert.equal(policy.authorizeA12Action(action), false, action);
  }
});

test("Gateway returns only approved active cited versioned formalImpact-none records in the requested domain", async () => {
  const fixture = readJson("gateway-policy.fixture.json");
  const policy = await loadPolicy();
  assert.equal(typeof policy.filterGatewayRecords, "function");

  const drawing = policy.filterGatewayRecords(fixture.records, {
    actorRole: "a12",
    domain: "drawing_review",
    allowedDomains: ["drawing_review"],
  });
  assert.deepEqual(
    drawing.map((record) => record.id),
    ["drawing-approved"],
  );
  for (const record of drawing) {
    assert.equal(record.status, "approved");
    assert.equal(record.retired_at, null);
    assert.ok(record.source_ref);
    assert.ok(record.version);
    assert.equal(record.formalImpact, "none");
    assert.equal(record.domain, "drawing_review");
  }

  assert.throws(
    () =>
      policy.filterGatewayRecords(fixture.records, {
        actorRole: "a12",
        domain: "budget",
        allowedDomains: ["drawing_review"],
      }),
    /domain|permission|not allowed|forbidden/i,
  );
});

test("Gateway implementation exists without browser service credentials", () => {
  const files = requireFiles(
    listFiles(GATEWAY_DIR, (file) => /\.(ts|js|mjs|json)$/i.test(file)),
    "Knowledge Gateway under supabase/functions/knowledge-gateway",
  );
  const source = readJoined(files);
  assert.doesNotMatch(source, /service[_-]?role/i);
  assert.match(source, /drawing_review/);
  assert.match(source, /budget/);
  assert.match(source, /contract/);
  assert.match(source, /formalImpact/);
});

test("budget candidates reject historical prices and existing PDF objects", async () => {
  const policy = await loadPolicy();
  assert.equal(typeof policy.canCreateBudgetCandidate, "function");

  assert.equal(
    policy.canCreateBudgetCandidate({
      source_kind: "historical_budget_source",
      object_status: "existing",
      human_confirmed: true,
    }),
    false,
  );
  assert.equal(
    policy.canCreateBudgetCandidate({
      source_kind: "pdf_existing_object",
      object_status: "existing",
      human_confirmed: true,
    }),
    false,
  );
  assert.equal(
    policy.canCreateBudgetCandidate({
      source_kind: "user_created_plan_object",
      object_status: "new",
      human_confirmed: true,
    }),
    true,
  );
});

test("Knowledge Studio visible copy excludes engineering and prohibited legal/payment claims", () => {
  const htmlFiles = requireFiles(
    listFiles(STUDIO_DIR, (file) => file.endsWith(".html")),
    "Knowledge Studio HTML under site/knowledge_studio",
  );
  const visible = htmlFiles
    .map((file) => visibleHtmlText(readFileSync(file, "utf8")))
    .join(" ");
  const prohibited = [
    /\bDB\b/i,
    /\bAPI\b/i,
    /\bmock\b/i,
    /\bdebug\b/i,
    /託管/,
    /代收代付/,
    /付款保障/,
    /真電子簽章/,
    /法律認證/,
  ];
  for (const pattern of prohibited) {
    assert.doesNotMatch(visible, pattern);
  }
});

test("Knowledge Studio caller sends user JWT and publishable project key", async () => {
  const moduleUrl = `${
    pathToFileURL(
      join(STUDIO_DIR, "app.js"),
    ).href
  }?test=${Date.now()}`;
  const { GatewayAdapter } = await import(moduleUrl);
  let capturedRequest;
  const adapter = new GatewayAdapter({
    endpoint: "https://example.test/functions/v1/knowledge-studio",
    projectKey: "sb_publishable_test",
    tokenProvider: async () => "user-session-jwt",
    fetcher: async (url, init) => {
      capturedRequest = { url, init };
      return {
        ok: true,
        json: async () => ({ data: { lifecycleState: "draft" } }),
      };
    },
  });

  await adapter.request({ operation: "listRecords" });

  assert.equal(
    capturedRequest.url,
    "https://example.test/functions/v1/knowledge-studio",
  );
  assert.equal(
    capturedRequest.init.headers.Authorization,
    "Bearer user-session-jwt",
  );
  assert.equal(
    capturedRequest.init.headers.apikey,
    "sb_publishable_test",
  );
  assert.doesNotMatch(
    JSON.stringify(capturedRequest),
    /service[_-]?role/i,
  );
});

test("Knowledge Studio local lifecycle keeps review and audit transitions explicit", async () => {
  const moduleUrl = `${
    pathToFileURL(
      join(STUDIO_DIR, "app.js"),
    ).href
  }?lifecycle=${Date.now()}`;
  const { LocalKnowledgeStore, STATUS } = await import(moduleUrl);
  const store = new LocalKnowledgeStore();
  const draft = await store.createDraft({
    title: "測試規則",
    type: "圖說檢查規則",
    owner: "PCM 圖說組",
    nextOwner: "規則整理人",
    actor: "建立者",
    evidence: "測試文件／第 1 頁",
  });
  const saved = await store.saveDraft({
    ...draft,
    summary: "保留來源與補件判斷。",
    criteria: "缺少證據時只能列為待確認。",
    actor: "整理者",
  });
  const pending = await store.transition(saved.id, "submit_review", {
    actor: "整理者",
    nextOwner: "PCM 覆核人",
  });
  const returned = await store.transition(pending.id, "return_revision", {
    actor: "覆核者",
    nextOwner: "規則整理人",
  });
  const resubmitted = await store.transition(returned.id, "submit_review", {
    actor: "整理者",
    nextOwner: "PCM 覆核人",
  });
  const published = await store.transition(resubmitted.id, "publish", {
    actor: "覆核者",
    nextOwner: "PCM 維護人",
  });
  const revision = await store.createRevision(published.id, "維護者");
  const retired = await store.transition(published.id, "retire", {
    actor: "維護者",
    nextOwner: "PCM 維護人",
  });

  assert.equal(draft.status, STATUS.DRAFT);
  assert.equal(pending.status, STATUS.PENDING_REVIEW);
  assert.equal(returned.status, STATUS.DRAFT);
  assert.equal(published.status, STATUS.APPROVED);
  assert.equal(published.version, 1);
  assert.equal(revision.status, STATUS.DRAFT);
  assert.equal(revision.version, 2);
  assert.equal(retired.status, STATUS.RETIRED);
  assert.ok(
    retired.events.every(
      (item) =>
        item.actor &&
        item.time &&
        item.status &&
        item.nextOwner &&
        item.formalImpact === "none",
    ),
  );
});

test("Knowledge product implementation exposes no DWG field or route", () => {
  const implementationRoots = [
    join(REPO_ROOT, "supabase"),
    join(REPO_ROOT, "scripts", "knowledge"),
    join(REPO_ROOT, "site", "knowledge_studio"),
  ];
  const files = implementationRoots.flatMap((root) =>
    listFiles(root, (file) => /\.(sql|ts|js|mjs|json|html|md)$/i.test(file))
  );
  requireFiles(files, "Knowledge implementation files for PDF-only validation");
  const source = readJoined(files);
  assert.doesNotMatch(source, /\bdwg\b|dwg_|_dwg/i);
});
