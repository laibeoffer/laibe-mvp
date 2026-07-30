import test from "node:test";
import assert from "node:assert/strict";
import {
  readdirSync,
  readFileSync,
} from "node:fs";
import {
  dirname,
  resolve,
} from "node:path";
import {
  fileURLToPath,
} from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, "..", "..");
const SUPABASE_ROOT = resolve(REPO_ROOT, "supabase");
const MIGRATIONS_DIR = resolve(SUPABASE_ROOT, "migrations");
const CONTRACT_PATH = resolve(
  SUPABASE_ROOT,
  "contracts",
  "knowledge_staging.v1.schema.json",
);
const EDGE_PATH = resolve(
  SUPABASE_ROOT,
  "functions",
  "knowledge-ingest",
  "index.ts",
);
const BUCKETS = [
  "eligible_candidate_reference",
  "requires_image_or_quote_confirmation",
  "not_grade_applicable",
  "needs_manual_review",
];

const migrationCorpus = readdirSync(MIGRATIONS_DIR)
  .filter((name) => name.endsWith(".sql"))
  .sort()
  .map((name) => readFileSync(resolve(MIGRATIONS_DIR, name), "utf8"))
  .join("\n");
const migrationCorpusLower = migrationCorpus.toLowerCase();
const stagingContract = JSON.parse(readFileSync(CONTRACT_PATH, "utf8"));
const edgeSource = readFileSync(EDGE_PATH, "utf8");

function expectFragments(text, fragments, label) {
  const lower = text.toLowerCase();
  for (const fragment of fragments) {
    assert.ok(
      lower.includes(fragment.toLowerCase()),
      `${label} is missing: ${fragment}`,
    );
  }
}

function extractSqlFunction(sql, qualifiedName) {
  const escaped = qualifiedName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return sql.match(
    new RegExp(
      `create\\s+or\\s+replace\\s+function\\s+${escaped}` +
        `[\\s\\S]*?\\n\\$\\$;`,
      "i",
    ),
  )?.[0] ?? "";
}

function expectPattern(text, pattern, message) {
  assert.ok(pattern.test(text), message);
}

test("migration corpus defines governed woodwork_candidates with immutable staging flags", () => {
  expectFragments(
    migrationCorpus,
    [
      "create table knowledge_staging.woodwork_candidates",
      "import_batch_id",
      "mapping_id",
      "source_record_id",
      "row_identity",
      "source_kind",
      "bucket",
      "pricing_trigger_policy",
      "source_ref",
      "raw_payload",
      "publication_authorized",
      "candidate_creation_authorized",
      "direct_pricing_allowed",
    ],
    "woodwork staging table",
  );

  for (const bucket of BUCKETS) {
    assert.ok(
      migrationCorpusLower.includes(`'${bucket}'`),
      `woodwork bucket check is missing ${bucket}`,
    );
  }

  expectPattern(
    migrationCorpus,
    /pricing_trigger_policy\s+text\s+not\s+null[\s\S]*?check\s*\(\s*pricing_trigger_policy\s*=\s*'not_a_pricing_trigger'\s*\)/i,
    "woodwork pricing_trigger_policy immutable check is missing",
  );
  expectPattern(
    migrationCorpus,
    /publication_authorized\s+boolean\s+not\s+null\s+default\s+false[\s\S]*?check\s*\(\s*publication_authorized\s*=\s*false\s*\)/i,
    "woodwork publication_authorized immutable check is missing",
  );
  expectPattern(
    migrationCorpus,
    /candidate_creation_authorized\s+boolean\s+not\s+null\s+default\s+false[\s\S]*?check\s*\(\s*candidate_creation_authorized\s*=\s*false\s*\)/i,
    "woodwork candidate_creation_authorized immutable check is missing",
  );
  expectPattern(
    migrationCorpus,
    /direct_pricing_allowed\s+boolean\s+not\s+null\s+default\s+false[\s\S]*?check\s*\(\s*direct_pricing_allowed\s*=\s*false\s*\)/i,
    "woodwork direct_pricing_allowed immutable check is missing",
  );
});

test("woodwork_candidates has four-bucket enforcement, RLS, and query indexes", () => {
  const tableDefinition = migrationCorpus.match(
    /create\s+table\s+knowledge_staging\.woodwork_candidates\s*\([\s\S]*?\n\);/i,
  )?.[0] ?? "";
  assert.ok(tableDefinition, "woodwork_candidates table definition is missing");

  expectPattern(
    migrationCorpus,
    /bucket\s+text\s+not\s+null[\s\S]*?check\s*\(\s*bucket\s+in\s*\([\s\S]*?'eligible_candidate_reference'[\s\S]*?'requires_image_or_quote_confirmation'[\s\S]*?'not_grade_applicable'[\s\S]*?'needs_manual_review'[\s\S]*?\)\s*\)/i,
    "woodwork four-bucket check is missing or incomplete",
  );
  expectPattern(
    migrationCorpus,
    /alter\s+table\s+knowledge_staging\.woodwork_candidates\s+enable\s+row\s+level\s+security/i,
    "woodwork_candidates RLS enablement is missing",
  );
  expectPattern(
    tableDefinition,
    /unique\s*\(\s*import_batch_id\s*,\s*mapping_id\s*\)/i,
    "woodwork mapping_id unique index contract is missing",
  );
  expectPattern(
    tableDefinition,
    /unique\s*\(\s*import_batch_id\s*,\s*source_row_identity\s*\)/i,
    "woodwork source_row_identity unique index contract is missing",
  );
  expectPattern(
    migrationCorpus,
    /create\s+(unique\s+)?index[\s\S]*?on\s+knowledge_staging\.woodwork_candidates\s*\([^;]*bucket[^;]*\)/i,
    "woodwork bucket review index is missing",
  );
});

test("dedicated woodwork ingest RPC is security-invoker and queues demolition anomalies", () => {
  const rpc = extractSqlFunction(
    migrationCorpus,
    "public.knowledge_ingest_woodwork_batch",
  );

  assert.ok(rpc, "knowledge_ingest_woodwork_batch RPC is missing");
  expectFragments(
    rpc,
    [
      "p_envelope jsonb",
      "security invoker",
      "knowledge.is_interactive_reviewer()",
      "knowledge_staging.woodwork_candidates",
      "knowledge_staging.quality_issues",
      "woodwork_mapping",
      "source_record_key",
      "mapping_id",
      "not_a_pricing_trigger",
      "pricing_trigger_note",
      "direct_pricing_allowed",
      "formalImpact",
      "none",
    ],
    "woodwork ingest RPC",
  );
});

test("knowledge_staging JSON contract accepts strict woodwork_candidates", () => {
  assert.ok(
    stagingContract.required.includes("woodwork_candidates"),
    "woodwork_candidates must be a required envelope collection",
  );
  assert.ok(
    stagingContract.properties.source_manifest.properties.source_kind.enum
      .includes("woodwork_mapping"),
    "woodwork_mapping must be an accepted source_kind",
  );

  const candidates = stagingContract.properties.woodwork_candidates;
  assert.equal(candidates.type, "array");
  assert.equal(candidates.maxItems, 1000);
  assert.equal(candidates.items.type, "object");
  assert.deepEqual(
    new Set(candidates.items.required),
    new Set([
      "source_record_key",
      "mapping_id",
      "bucket",
      "pricing_trigger_policy",
      "source_ref",
      "original_item",
      "candidate_evidence",
      "grade_fields",
      "evidence_priority_used",
      "confidence_grade",
      "review_state_label",
      "review_reason",
      "missing_info_items",
      "next_use",
    ]),
  );
  assert.deepEqual(candidates.items.properties.bucket.enum, BUCKETS);
  assert.equal(
    candidates.items.properties.pricing_trigger_policy.const,
    "not_a_pricing_trigger",
  );
  assert.equal(
    candidates.items.properties.next_use.properties
      .direct_pricing_allowed.const,
    false,
  );
  assert.ok(
    (stagingContract.allOf ?? []).some(
      (rule) =>
        rule.if?.properties?.source_manifest?.properties?.source_kind?.const ===
          "woodwork_mapping" &&
        rule.then?.properties?.budget_items?.maxItems === 0,
    ),
    "woodwork_mapping envelopes must force budget_items to an empty array",
  );
});

test("knowledge-ingest Edge contract validates woodwork candidates and routes the dedicated RPC", () => {
  expectFragments(
    edgeSource,
    [
      "woodwork_candidates",
      "woodwork_mapping",
      "knowledge_ingest_woodwork_batch",
    ],
    "knowledge-ingest Edge Function",
  );
  expectPattern(
    edgeSource,
    /array\.isarray\s*\(\s*value\.woodwork_candidates\s*\)/i,
    "Edge does not validate woodwork_candidates as an array",
  );
  expectPattern(
    edgeSource,
    /value\.woodwork_candidates\.length\s*(?:<=\s*1000|>\s*1000)/i,
    "Edge does not enforce the woodwork candidate batch limit",
  );
  expectPattern(
    edgeSource,
    /source_record_key[\s\S]*?mapping_id[\s\S]*?===|mapping_id[\s\S]*?source_record_key[\s\S]*?===/i,
    "Edge does not enforce source_record_key === mapping_id",
  );
  expectPattern(
    edgeSource,
    /source_kind\s*===\s*["']woodwork_mapping["'][\s\S]*?budget_items\.length\s*===\s*0/i,
    "Edge does not reject non-empty budget_items for woodwork_mapping",
  );
  expectPattern(
    edgeSource,
    /source_kind\s*===\s*["']woodwork_mapping["'][\s\S]*?knowledge_ingest_woodwork_batch/i,
    "Edge does not route woodwork_mapping to the dedicated RPC",
  );
  expectPattern(
    edgeSource,
    /\/rest\/v1\/rpc\/knowledge_ingest_woodwork_batch/i,
    "Edge dedicated woodwork RPC endpoint is missing",
  );
});
