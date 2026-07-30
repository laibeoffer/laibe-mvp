import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const supabaseRoot = resolve(here, "..");

function read(relativePath) {
  return readFileSync(resolve(supabaseRoot, relativePath), "utf8");
}

function readMigrationCorpus() {
  const migrationRoot = resolve(supabaseRoot, "migrations");
  return readdirSync(migrationRoot)
    .filter((name) => name.endsWith(".sql"))
    .sort()
    .map((name) => readFileSync(resolve(migrationRoot, name), "utf8"))
    .join("\n");
}

function expectAll(text, fragments, label) {
  for (const fragment of fragments) {
    assert.ok(
      text.toLowerCase().includes(fragment.toLowerCase()),
      `${label} is missing: ${fragment}`,
    );
  }
}

test("foundation migration defines the three governed schemas and required tables", () => {
  const sql = read("migrations/20260726000100_pcm_knowledge_foundation.sql");

  expectAll(
    sql,
    [
      "create schema if not exists knowledge_staging",
      "create schema if not exists knowledge",
      "create schema if not exists casework",
      "knowledge_staging.import_batches",
      "knowledge_staging.source_records",
      "knowledge_staging.budget_staging_items",
      "knowledge_staging.quality_issues",
      "knowledge.sources",
      "knowledge.entries",
      "knowledge.entry_versions",
      "knowledge.drawing_rules",
      "knowledge.budget_rules",
      "knowledge.acceptance_rules",
      "knowledge.contract_evidence_rules",
      "knowledge.price_observations",
      "knowledge.relations",
      "knowledge.publication_events",
      "casework.cases",
      "casework.case_members",
      "casework.documents",
      "casework.pdf_sheets",
      "casework.findings",
      "casework.missing_info_items",
      "casework.evidence_links",
      "casework.human_decisions",
      "casework.candidate_budget_lines",
      "casework.case_events",
    ],
    "foundation migration",
  );
});

test("lifecycle, publication, and append-only audit constraints are present", () => {
  const sql = read("migrations/20260726000100_pcm_knowledge_foundation.sql");

  expectAll(
    sql,
    [
      "'inbox'",
      "'draft'",
      "'pending_review'",
      "'approved'",
      "'retired'",
      "已核准",
      "pending_review",
      "guard_published_version_immutable",
      "guard_append_only",
      "publication_events_append_only",
      "case_events_append_only",
      "publish_entry_version",
      "current_app_role() in ('pcm', 'admin')",
    ],
    "lifecycle contract",
  );
});

test("knowledge and case audit events preserve a concrete next action", () => {
  const sql = readMigrationCorpus();
  const nextActionMigration = read(
    "migrations/20260727094259_knowledge_case_event_next_action.sql",
  );

  expectAll(
    sql,
    [
      "alter table knowledge.publication_events",
      "alter table casework.case_events",
      "add column if not exists next_action text",
      "fill_publication_event_next_action",
      "fill_case_event_next_action",
      "length(btrim(next_action)) > 0",
      "'nextAction', pe.next_action",
    ],
    "next-action audit contract",
  );
  assert.match(
    nextActionMigration,
    /add column if not exists next_action text\s+not null\s+default/i,
    "existing append-only events need a non-destructive defaulted column",
  );
  assert.doesNotMatch(
    nextActionMigration,
    /update\s+(knowledge\.publication_events|casework\.case_events)/i,
    "append-only event tables must not be backfilled with UPDATE",
  );
});

test("staging flags cannot authorize publication, candidate creation, or direct pricing", () => {
  const sql = read("migrations/20260726000100_pcm_knowledge_foundation.sql");

  expectAll(
    sql,
    [
      "is_budget_candidate",
      "auto_trigger_allowed",
      "publication_authorized boolean not null default false check (publication_authorized = false)",
      "candidate_creation_authorized boolean not null default false check (candidate_creation_authorized = false)",
      "direct_pricing_allowed boolean not null default false check (direct_pricing_allowed = false)",
      "source_object_origin = 'user_created'",
      "object_status = 'new'",
      "scope_confirmed = true",
      "human_decision_id is not null",
      "evidence_link_id is not null",
    ],
    "budget safety gate",
  );
});

test("every application table enables row-level security", () => {
  const sql = read("migrations/20260726000100_pcm_knowledge_foundation.sql");
  const tables = [
    "knowledge_staging.import_batches",
    "knowledge_staging.source_records",
    "knowledge_staging.budget_staging_items",
    "knowledge_staging.quality_issues",
    "knowledge.sources",
    "knowledge.entries",
    "knowledge.entry_versions",
    "knowledge.drawing_rules",
    "knowledge.budget_rules",
    "knowledge.acceptance_rules",
    "knowledge.contract_evidence_rules",
    "knowledge.price_observations",
    "knowledge.relations",
    "knowledge.publication_events",
    "casework.cases",
    "casework.case_members",
    "casework.documents",
    "casework.pdf_sheets",
    "casework.findings",
    "casework.missing_info_items",
    "casework.evidence_links",
    "casework.human_decisions",
    "casework.candidate_budget_lines",
    "casework.case_events",
  ];

  for (const table of tables) {
    assert.ok(
      sql.toLowerCase().includes(
        `alter table ${table} enable row level security`,
      ),
      `RLS is not enabled for ${table}`,
    );
  }
});

test("RLS policies initialize caller identity once per statement", () => {
  const sql = read("migrations/20260726000100_pcm_knowledge_foundation.sql");
  const policies = [...sql.matchAll(/create policy[\s\S]*?;\r?\n/gi)]
    .map((match) => match[0])
    .join("\n");

  assert.doesNotMatch(policies, /=\s*auth\.uid\(\)/i);
  assert.doesNotMatch(policies, /\bauth\.uid\(\)\s+is\s+not\s+null/i);
  assert.match(policies, /\(select auth\.uid\(\)\)/i);
});

test("storage remains private and case documents are membership scoped", () => {
  const sql = read("migrations/20260726000100_pcm_knowledge_foundation.sql");

  expectAll(
    sql,
    [
      "knowledge-source-private",
      "case-documents-private",
      "public = false",
      "case_document_member_read",
      "case_document_member_insert",
      "casework.is_case_member",
    ],
    "storage policy",
  );
});

test("gateway verifies JWT, preserves caller RLS, and exposes only approved knowledge operations", () => {
  const config = read("config.toml");
  const gateway = read("functions/knowledge-gateway/index.ts");

  expectAll(
    config,
    ["[functions.knowledge-gateway]", "verify_jwt = true"],
    "function config",
  );
  expectAll(
    gateway,
    [
      "searchKnowledge",
      "getKnowledgeEntry",
      "getCaseEvidence",
      "recordFinding",
      "drawing_review",
      "budget",
      "contract",
      "formalImpact",
      "none",
      "gateway_search_knowledge",
      "gateway_get_knowledge_entry",
      "gateway_get_case_evidence",
      "gateway_record_finding",
      "SUPABASE_PUBLISHABLE_KEY",
      "SUPABASE_PUBLISHABLE_KEYS",
      "x-client-info",
    ],
    "gateway",
  );
  assert.equal(
    gateway.includes("service_role"),
    false,
    "gateway must never expose or use a privileged browser credential",
  );
});

test("gateway SQL filters retired material and constrains contract output", () => {
  const sql = read("migrations/20260726000100_pcm_knowledge_foundation.sql");

  expectAll(
    sql,
    [
      "e.lifecycle_state = 'approved'",
      "ev.lifecycle_state = 'approved'",
      "allowed_output_kind",
      "'evidence'",
      "'comparison'",
      "'missing_information'",
      "'risk_note'",
      "formal_impact",
      "check (formal_impact = 'none')",
    ],
    "gateway output contract",
  );
});

test("local seed identifies the latest budget master as pending review only", () => {
  const seed = read("seed.sql");

  expectAll(
    seed,
    [
      "_AI_BUDGET_MASTER_INDEX_OUTPUT_20260617_132725",
      "laibe_budget_ai_master_index.xlsx",
      "fdca0a5bb14f66f6d55529c322d3e298cba2a4d4fb202531600a6337cd6d64b4",
      "19212",
      "pending_review",
      "is_budget_candidate",
      "auto_trigger_allowed",
      "publication_authorized",
      "candidate_creation_authorized",
      "direct_pricing_allowed",
    ],
    "local seed",
  );
});

test("fixtures capture source-state mapping and candidate gate cases", () => {
  const statusMap = JSON.parse(read("tests/fixtures/source_status_map.json"));
  const gateCases = JSON.parse(
    read("tests/fixtures/budget_candidate_gate_cases.json"),
  );

  assert.equal(statusMap["已核准"], "pending_review");
  assert.equal(statusMap["已停用"], "retired");

  const allowed = gateCases.filter((item) => item.expected === "allow");
  assert.equal(allowed.length, 1);
  assert.deepEqual(allowed[0], {
    name: "user new object with confirmed scope, decision, and evidence",
    source_object_origin: "user_created",
    object_status: "new",
    scope_confirmed: true,
    human_decision_id: "present",
    evidence_link_id: "present",
    direct_pricing_allowed: false,
    expected: "allow",
  });
  for (const item of gateCases.filter((entry) => entry.expected === "deny")) {
    assert.ok(
      item.source_object_origin !== "user_created" ||
        item.object_status !== "new" ||
        item.scope_confirmed !== true ||
        item.human_decision_id !== "present" ||
        item.evidence_link_id !== "present" ||
        item.direct_pricing_allowed !== false,
      `${item.name} does not exercise a deny condition`,
    );
  }
});

test("A12 drawing-review records retain the PDF evidence and human-review fields", () => {
  const sql = read("migrations/20260726000100_pcm_knowledge_foundation.sql");

  expectAll(
    sql,
    [
      "a12.drawing_review_queue.v1",
      "leakage_group",
      "pdf_id",
      "source_document_id",
      "vault_sha256",
      "page_number",
      "source_candidate_class",
      "page_type_candidate",
      "applicable_rule_id",
      "drawing_identity",
      "review_checks",
      "sheet_completeness_candidate",
      "cross_sheet_consistency_status",
      "candidate_risk_note",
      "requested_supplement_candidate",
      "evidence_basis",
      "evidence_review_status",
      "confidence",
      "priority",
      "next_reviewer_role",
      "review_state",
      "reviewer_class",
      "reviewer_id",
      "reviewed_at",
      "review_authorizations",
      "human_review_required",
      "trainable",
      "exclusion_reason",
      "decision_provenance",
    ],
    "A12 compatibility contract",
  );
});

test("new casework remains independent from existing public business tables", () => {
  const sql = read("migrations/20260726000100_pcm_knowledge_foundation.sql");
  const existingPublicTables = [
    "profiles",
    "projects",
    "bids",
    "tender_files",
    "tender_unlocks",
    "project_drafts",
  ];

  assert.ok(sql.includes("external_project_id text"));
  for (const table of existingPublicTables) {
    assert.equal(
      new RegExp(
        `(references|from|join)\\s+public\\.${table}\\b`,
        "i",
      ).test(sql),
      false,
      `foundation migration depends on public.${table}`,
    );
  }
});

test("public gateway functions are JWT-scoped security invokers and no public view is created", () => {
  const sql = read("migrations/20260726000100_pcm_knowledge_foundation.sql");
  const publicFunctions = [
    "gateway_search_knowledge",
    "gateway_get_knowledge_entry",
    "gateway_get_case_evidence",
    "gateway_record_finding",
    "knowledge_submit_for_review",
    "knowledge_publish_entry_version",
    "knowledge_retire_entry",
  ];

  assert.equal(
    /create\s+(or\s+replace\s+)?view\s+public\./i.test(sql),
    false,
    "foundation must not add a public view",
  );
  for (const functionName of publicFunctions) {
    const pattern = new RegExp(
      `create\\s+or\\s+replace\\s+function\\s+public\\.${functionName}` +
        `[\\s\\S]*?security\\s+invoker[\\s\\S]*?as\\s+\\$\\$`,
      "i",
    );
    assert.ok(pattern.test(sql), `${functionName} is not a security invoker`);
  }
});

test("A12 ingestion versions documents and never overwrites prior page evidence", () => {
  const sql = read("migrations/20260726000100_pcm_knowledge_foundation.sql");

  expectAll(
    sql,
    [
      "unique (case_id, source_document_id, vault_sha256)",
      "source_queue_identity",
      "ingest_fingerprint",
      "unique (document_id, page_number, ingest_fingerprint)",
      "knowledge.current_client_id() <> 'a12'",
      "knowledge.current_app_role() <> 'pcm'",
      "drawing_finding_reused",
      "before_state",
      "source_version",
    ],
    "A12 traceability contract",
  );

  const documentUpsert = sql.match(
    /insert into casework\.documents[\s\S]*?returning id into v_document_id;/i,
  )?.[0];
  const sheetUpsert = sql.match(
    /insert into casework\.pdf_sheets[\s\S]*?returning id into v_sheet_id;/i,
  )?.[0];
  assert.ok(documentUpsert, "document ingest block is missing");
  assert.ok(sheetUpsert, "sheet ingest block is missing");
  assert.match(documentUpsert, /on conflict[\s\S]*?do nothing/i);
  assert.doesNotMatch(documentUpsert, /do update set/i);
  assert.match(sheetUpsert, /on conflict[\s\S]*?do nothing/i);
  assert.doesNotMatch(sheetUpsert, /do update set/i);
});

test("one approved source can support publishing more than one reviewed entry", () => {
  const sql = read("migrations/20260726000100_pcm_knowledge_foundation.sql");
  const publishFunction = sql.match(
    /create or replace function knowledge\.publish_entry_version[\s\S]*?\n\$\$;/i,
  )?.[0];

  assert.ok(publishFunction, "publish_entry_version is missing");
  assert.match(
    publishFunction,
    /v_source_state\s+not\s+in\s*\(\s*'pending_review'\s*,\s*'approved'\s*\)/i,
  );
  assert.match(
    publishFunction,
    /where id = v_source_id[\s\S]*?and lifecycle_state = 'pending_review'/i,
  );
  assert.doesNotMatch(
    publishFunction,
    /v_source_state\s*<>\s*'pending_review'/i,
  );
  assert.match(
    sql,
    /s\.lifecycle_state = 'approved'/i,
    "Gateway must retain its approved-source filter",
  );
});

test("server-side caller matrix denies cross-domain knowledge access", () => {
  const sql = read("migrations/20260726000100_pcm_knowledge_foundation.sql");

  expectAll(
    sql,
    [
      "knowledge.can_access_domain",
      "allowed_knowledge_domains",
      "v_client_id = 'a12'",
      "p_domain = 'drawing_review'",
      "v_client_id = 'budget'",
      "p_domain = 'budget'",
      "v_client_id = 'contract'",
      "p_domain = 'contract'",
      "v_role in ('pcm', 'admin')",
      "knowledge.can_access_domain(e.domain)",
    ],
    "caller/domain authorization matrix",
  );

  const searchFunction = sql.match(
    /create or replace function public\.gateway_search_knowledge[\s\S]*?\n\$\$;/i,
  )?.[0];
  const entryFunction = sql.match(
    /create or replace function public\.gateway_get_knowledge_entry[\s\S]*?\n\$\$;/i,
  )?.[0];

  assert.ok(searchFunction, "searchKnowledge RPC is missing");
  assert.ok(entryFunction, "getKnowledgeEntry RPC is missing");
  assert.match(
    searchFunction,
    /knowledge\.can_access_domain\(e\.domain\)/i,
  );
  assert.match(
    entryFunction,
    /knowledge\.can_access_domain\(e\.domain\)/i,
  );
});

test("knowledge ingest is JWT verified, idempotent, reviewer-only, and staging-safe", () => {
  const sql = read("migrations/20260726000100_pcm_knowledge_foundation.sql");
  const config = read("config.toml");
  const ingest = read("functions/knowledge-ingest/index.ts");
  const contract = JSON.parse(
    read("contracts/knowledge_staging.v1.schema.json"),
  );

  expectAll(
    config,
    ["[functions.knowledge-ingest]", "verify_jwt = true"],
    "knowledge ingest config",
  );
  expectAll(
    sql,
    [
      "public.knowledge_ingest_batch",
      "knowledge_staging.v1",
      "idempotency_key",
      "correlation_key",
      "source_sha256",
      "source_locator",
      "knowledge.is_interactive_reviewer()",
      "knowledge.map_source_status",
      "publication_authorized",
      "candidate_creation_authorized",
      "direct_pricing_allowed",
      "on conflict (idempotency_key)",
    ],
    "knowledge ingest RPC",
  );
  expectAll(
    ingest,
    [
      "knowledge_staging.v1",
      "idempotency_key",
      "correlation_key",
      "source_manifest",
      "records",
      "budget_items",
      "woodwork_candidates",
      "quality_issues",
      "knowledge_ingest_batch",
      "knowledge_ingest_woodwork_batch",
      "SUPABASE_PUBLISHABLE_KEY",
      "SUPABASE_PUBLISHABLE_KEYS",
    ],
    "knowledge ingest Edge Function",
  );
  assert.equal(
    ingest.includes("service_role"),
    false,
    "knowledge ingest must preserve caller RLS",
  );

  assert.equal(contract.$id, "knowledge_staging.v1");
  assert.deepEqual(
    contract.required,
    [
      "schema_version",
      "idempotency_key",
      "correlation_key",
      "source_manifest",
      "records",
      "budget_items",
      "woodwork_candidates",
      "quality_issues",
    ],
  );
});

test("Knowledge Studio uses reviewer-only lifecycle RPCs without direct table writes", () => {
  const sql = read("migrations/20260726000100_pcm_knowledge_foundation.sql");
  const config = read("config.toml");
  const studio = read("functions/knowledge-studio/index.ts");
  const studioClient = readFileSync(
    resolve(supabaseRoot, "..", "site", "knowledge_studio", "app.js"),
    "utf8",
  );
  const studioPage = readFileSync(
    resolve(supabaseRoot, "..", "site", "knowledge_studio", "code.html"),
    "utf8",
  );
  const contract = JSON.parse(
    read("contracts/knowledge_studio.v1.schema.json"),
  );

  expectAll(
    config,
    ["[functions.knowledge-studio]", "verify_jwt = true"],
    "Knowledge Studio config",
  );
  expectAll(
    sql,
    [
      "public.knowledge_studio_list",
      "public.knowledge_studio_get",
      "public.knowledge_studio_create_draft",
      "public.knowledge_studio_update_draft",
      "public.knowledge_studio_create_revision",
      "public.knowledge_submit_for_review",
      "public.knowledge_return_to_draft",
      "public.knowledge_publish_entry_version",
      "public.knowledge_retire_entry",
      "draft_created",
      "draft_updated",
      "revision_created",
      "returned_to_draft",
      "knowledge.is_interactive_reviewer()",
    ],
    "Knowledge Studio RPC contract",
  );
  expectAll(
    studio,
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
      "knowledge_studio_list",
      "knowledge_studio_get",
      "knowledge_studio_create_draft",
      "knowledge_studio_update_draft",
      "knowledge_studio_create_revision",
      "knowledge_submit_for_review",
      "knowledge_return_to_draft",
      "knowledge_publish_entry_version",
      "knowledge_retire_entry",
      "KNOWLEDGE_STUDIO_ALLOWED_ORIGINS",
      "Access-Control-Allow-Origin",
      "x-client-info",
      "SUPABASE_PUBLISHABLE_KEY",
      "SUPABASE_PUBLISHABLE_KEYS",
      'request.method === "OPTIONS"',
    ],
    "Knowledge Studio Edge Function",
  );
  assert.equal(studio.includes("service_role"), false);
  expectAll(
    studioClient,
    ["knowledge-project-key", "projectKey", "apikey"],
    "Knowledge Studio browser caller",
  );
  assert.ok(
    studioPage.includes('meta name="knowledge-project-key"'),
    "Knowledge Studio must expose a publishable-key configuration slot",
  );
  assert.equal(/service[_-]?role/i.test(studioClient + studioPage), false);
  assert.equal(
    /\/rest\/v1\/(knowledge|casework|knowledge_staging)\b/i.test(studio),
    false,
    "Knowledge Studio browser adapter must not write private tables directly",
  );
  assert.equal(contract.$id, "knowledge_studio.v1");
  assert.equal(
    contract.$defs.draft.properties.content.properties.displayType.type,
    "string",
  );
  expectAll(
    sql,
    [
      "'displayType', coalesce(",
      "ev.content ->> 'displayType'",
      "then '驗收依據'",
      "insert into knowledge.entry_versions",
      "p_payload -> 'content'",
      "content = p_payload -> 'content'",
    ],
    "Knowledge Studio display type persistence",
  );
});
