import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const supabaseRoot = resolve(here, "..");
const hardeningPath = resolve(
  supabaseRoot,
  "migrations",
  "20260727193000_pcm_knowledge_rpc_surface_hardening.sql",
);

function read(relativePath) {
  return readFileSync(resolve(supabaseRoot, relativePath), "utf8");
}

function readHardening() {
  assert.ok(
    existsSync(hardeningPath),
    "RPC-surface hardening migration has not been created",
  );
  return readFileSync(hardeningPath, "utf8");
}

function readMigrationBySuffix(suffix) {
  const migrationRoot = resolve(supabaseRoot, "migrations");
  const matches = readdirSync(migrationRoot)
    .filter((name) => name.endsWith(suffix));
  assert.equal(
    matches.length,
    1,
    `Expected exactly one migration ending in ${suffix}`,
  );
  return {
    name: matches[0],
    sql: readFileSync(resolve(migrationRoot, matches[0]), "utf8"),
  };
}

function normalizeSignature(value) {
  return value
    .replace(/\s+/g, "")
    .replace(/"/g, "")
    .toLowerCase();
}

const allowedAuthenticatedExecute = [
  "casework.can_access_case_document(text,boolean)",
  "knowledge.is_interactive_reviewer()",
  "public.gateway_get_case_evidence(uuid)",
  "public.gateway_get_knowledge_entry(uuid)",
  "public.gateway_record_finding(uuid,jsonb)",
  "public.gateway_search_knowledge(text,text,integer)",
  "public.knowledge_ingest_batch(jsonb)",
  "public.knowledge_ingest_woodwork_batch(jsonb)",
  "public.knowledge_publish_entry_version(uuid,uuid,text)",
  "public.knowledge_retire_entry(uuid,text)",
  "public.knowledge_return_to_draft(uuid,uuid,text)",
  "public.knowledge_studio_create_draft(jsonb)",
  "public.knowledge_studio_create_revision(uuid,jsonb,text)",
  "public.knowledge_studio_get(uuid)",
  "public.knowledge_studio_list(text,text,integer)",
  "public.knowledge_studio_save_and_submit(uuid,uuid,jsonb,text)",
  "public.knowledge_studio_update_draft(uuid,uuid,jsonb)",
  "public.knowledge_submit_for_review(uuid,uuid,text)",
]
  .map(normalizeSignature)
  .sort();

test("hardening removes direct client access to all A5 tables and sequences", () => {
  const sql = readHardening();
  for (const schema of ["knowledge", "knowledge_staging", "casework"]) {
    assert.match(
      sql,
      new RegExp(
        `revoke\\s+all\\s+privileges\\s+on\\s+all\\s+tables\\s+in\\s+schema\\s+${schema}\\s+from\\s+public\\s*,\\s*anon\\s*,\\s*authenticated`,
        "i",
      ),
    );
    assert.match(
      sql,
      new RegExp(
        `revoke\\s+all\\s+privileges\\s+on\\s+all\\s+sequences\\s+in\\s+schema\\s+${schema}\\s+from\\s+public\\s*,\\s*anon\\s*,\\s*authenticated`,
        "i",
      ),
    );
    assert.match(
      sql,
      new RegExp(
        `alter\\s+default\\s+privileges\\s+in\\s+schema\\s+${schema}[\\s\\S]*?revoke\\s+all\\s+on\\s+tables\\s+from\\s+public\\s*,\\s*anon\\s*,\\s*authenticated`,
        "i",
      ),
    );
  }
  assert.doesNotMatch(sql, /grant\s+execute\s+on\s+all\s+functions/i);
  assert.doesNotMatch(
    sql,
    /alter\s+default\s+privileges\s+in\s+schema\s+\w+[\s\S]*?revoke\s+execute\s+on\s+functions/i,
  );
});

test("authenticated receives only the reviewed RPC and Storage-helper allowlist", () => {
  const sql = readHardening();
  const actual = [
    ...sql.matchAll(
      /grant\s+execute\s+on\s+function\s+([\s\S]*?)\s+to\s+authenticated\s*;/gi,
    ),
  ]
    .map((match) => normalizeSignature(match[1]))
    .sort();

  assert.deepEqual(actual, allowedAuthenticatedExecute);
  assert.match(
    sql,
    /revoke\s+all\s+on\s+function[\s\S]*?from\s+public\s*,\s*anon\s*,\s*authenticated/gi,
  );
  assert.doesNotMatch(
    sql,
    /grant\s+execute\s+on\s+function[\s\S]*?\s+to\s+(public|anon)\s*;/i,
  );
});

test("reviewed RPCs are security definer boundaries with fixed search paths", () => {
  const sql = readHardening();
  const publicSignatures = allowedAuthenticatedExecute.filter((signature) =>
    signature.startsWith("public.")
  );
  for (const signature of publicSignatures) {
    const readable = signature
      .replace("integer", "integer")
      .replace("knowledge.case_role[]", "knowledge.case_role[]");
    const escaped = readable.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    assert.match(
      normalizeSignature(sql),
      new RegExp(
        `alterfunction${escaped}securitydefiner;`,
        "i",
      ),
      `${signature} is not explicitly SECURITY DEFINER`,
    );
    assert.match(
      normalizeSignature(sql),
      new RegExp(
        `alterfunction${escaped}setsearch_path=''`,
        "i",
      ),
      `${signature} does not fix an empty search_path`,
    );
  }
});

test("Studio authorization stays fail-closed for owner, pro and inactive sessions", () => {
  const activeSession = read(
    "migrations/20260727072627_pcm_knowledge_active_session_hardening.sql",
  );
  const hardening = readHardening();
  const corpus = `${activeSession}\n${hardening}`;
  const reviewerFunction = activeSession.match(
    /create\s+or\s+replace\s+function\s+knowledge\.is_interactive_reviewer\(\)[\s\S]*?\n\$\$;/i,
  )?.[0];

  assert.ok(reviewerFunction, "interactive reviewer helper is missing");
  assert.match(corpus, /knowledge\.has_active_session\(\)/i);
  assert.match(
    reviewerFunction,
    /knowledge\.current_app_role\(\)\s+in\s+\('pcm',\s*'admin'\)/i,
  );
  assert.match(
    reviewerFunction,
    /knowledge\.current_client_id\(\)\s+not\s+in\s+\('a12',\s*'budget',\s*'contract'\)/i,
  );
  assert.doesNotMatch(
    reviewerFunction,
    /current_app_role\(\)\s+in\s+\([^)]*'owner'/i,
  );
  assert.match(
    hardening,
    /knowledge_studio_save_and_submit[\s\S]*?knowledge\.is_interactive_reviewer\(\)/i,
  );
});

test("atomic submission and publication share one server completeness gate", () => {
  const sql = readHardening();
  const requiredFields = [
    "title",
    "displayType",
    "owner",
    "summary",
    "criteria",
    "nextOwner",
    "evidence_summary",
  ];

  assert.match(
    sql,
    /create\s+or\s+replace\s+function\s+knowledge\.assert_studio_payload_complete/i,
  );
  for (const field of requiredFields) {
    assert.ok(
      sql.includes(field),
      `server completeness gate does not inspect ${field}`,
    );
  }
  assert.match(
    sql,
    /create\s+or\s+replace\s+function\s+public\.knowledge_studio_save_and_submit/i,
  );
  assert.match(
    sql,
    /knowledge_studio_save_and_submit[\s\S]*?knowledge\.assert_studio_payload_complete[\s\S]*?knowledge_studio_update_draft[\s\S]*?submit_entry_version_for_review/i,
  );
  assert.match(
    sql,
    /knowledge_publish_entry_version[\s\S]*?knowledge\.assert_studio_version_complete/i,
  );
});

test("draft source changes create immutable provenance and rebind the version", () => {
  const { sql } = readMigrationBySuffix(
    "_studio_traceability_a14_core_reconciliation.sql",
  );

  assert.match(
    sql,
    /create\s+or\s+replace\s+function\s+knowledge\.resolve_studio_source_revision/i,
  );
  assert.match(
    sql,
    /knowledge\.create_studio_source\s*\(\s*p_payload\s*->\s*'source'\s*\)/i,
  );
  assert.match(
    sql,
    /update\s+knowledge\.entry_versions[\s\S]*?source_id\s*=\s*v_next_source_id/i,
  );
  assert.doesNotMatch(
    sql,
    /update\s+knowledge\.sources[\s\S]*?source_(location|sha256|type|title)\s*=/i,
    "existing source identity must remain immutable",
  );
  assert.match(
    sql,
    /create\s+or\s+replace\s+function\s+public\.gateway_get_knowledge_entry/i,
  );
  assert.match(
    sql,
    /join\s+knowledge\.sources\s+s\s+on\s+s\.id\s*=\s*ev\.source_id/i,
  );
});

test("Studio session and event actor identity remain verified and non-sensitive", () => {
  const { sql } = readMigrationBySuffix(
    "_studio_traceability_a14_core_reconciliation.sql",
  );

  assert.match(
    sql,
    /create\s+or\s+replace\s+function\s+public\.knowledge_studio_session_context\(\)/i,
  );
  assert.match(sql, /knowledge\.has_active_session\(\)/i);
  assert.match(sql, /raw_app_meta_data\s*->>\s*'display_name'/i);
  assert.match(sql, /substr\s*\(\s*md5\s*\(\s*pe\.actor_id::text\s*\)/i);
  assert.doesNotMatch(sql, /'email'\s*,|u\.email/i);
  assert.match(sql, /'actorId'\s*,\s*pe\.actor_id/i);
  assert.match(sql, /'actorLabel'/i);
  assert.match(sql, /'actorRole'/i);
});

test("A14 reconciliation adds immutable versions and explicit workstream membership", () => {
  const { sql } = readMigrationBySuffix(
    "_studio_traceability_a14_core_reconciliation.sql",
  );

  for (const fragment of [
    "casework.document_versions",
    "document_id uuid",
    "version_number integer",
    "storage_object_path text",
    "sha256 text",
    "mime_type text",
    "size_bytes bigint",
    "casework.case_member_workstreams",
    "workstream_type text",
    "primary key (case_id, user_id, workstream_type)",
    "foreign key (case_id, user_id)",
    "references casework.case_members",
    "workstream_type in ('design', 'construction')",
    "enable row level security",
    "guard_document_versions_immutable",
    "has_current_case_workstream",
    "remote_applied=false",
  ]) {
    assert.ok(
      sql.toLowerCase().includes(fragment.toLowerCase()),
      `A14 reconciliation is missing ${fragment}`,
    );
  }
  assert.doesNotMatch(
    sql,
    /alter\s+table\s+casework\.case_members[\s\S]*?add\s+column[\s\S]*?workstream/i,
  );
  assert.match(
    sql,
    /from\s+casework\.case_members\s+m[\s\S]*?join\s+casework\.case_member_workstreams\s+w/i,
  );
  assert.match(
    sql,
    /revoke\s+all\s+privileges\s+on\s+casework\.(document_versions|case_member_workstreams)\s+from\s+public\s*,\s*anon\s*,\s*authenticated/i,
  );
});

test("Studio JSON schema exposes atomic submit and server-required fields", () => {
  const schema = JSON.parse(
    read("contracts/knowledge_studio.v1.schema.json"),
  );
  assert.ok(
    schema.properties.operation.enum.includes("saveAndSubmitReview"),
  );
  assert.ok(
    schema.properties.operation.enum.includes("getSessionContext"),
  );
  assert.ok(schema.$defs.draft.required.includes("source"));
  assert.equal(schema.$defs.draft.properties.summary.minLength, 1);
  assert.deepEqual(
    schema.$defs.draft.properties.content.required,
    ["displayType", "owner", "criteria", "nextOwner"],
  );
  assert.equal(
    schema.$defs.draft.properties.evidence_summary.minItems,
    1,
  );
  assert.equal(
    schema.$defs.draft.properties.evidence_summary.items.minLength,
    1,
  );
});

test("Studio and Gateway CORS reject missing configuration and unlisted origins", () => {
  const studio = read("functions/knowledge-studio/index.ts");
  const gateway = read("functions/knowledge-gateway/index.ts");

  for (const [name, source, envName] of [
    ["Studio", studio, "KNOWLEDGE_STUDIO_ALLOWED_ORIGINS"],
    ["Gateway", gateway, "KNOWLEDGE_GATEWAY_ALLOWED_ORIGINS"],
  ]) {
    assert.ok(source.includes(envName), `${name} allowlist env is missing`);
    assert.ok(
      source.includes("CORS_CONFIGURATION_MISSING"),
      `${name} does not fail closed when the allowlist is empty`,
    );
    assert.ok(
      source.includes("ORIGIN_NOT_ALLOWED"),
      `${name} does not reject an unlisted origin`,
    );
    assert.doesNotMatch(
      source,
      /allowedOrigins\[0\]\s*\?\?/,
      `${name} still falls back to the first configured origin`,
    );
    assert.match(
      source,
      /request\.method\s*===\s*"OPTIONS"[\s\S]*?403/i,
      `${name} preflight does not reject an unlisted origin`,
    );
  }
});

test("private Storage policies retain reviewer and case-membership checks", () => {
  const sql = readHardening();
  const storageHelper = sql.match(
    /create\s+or\s+replace\s+function\s+casework\.can_access_case_document[\s\S]*?\n\$\$;/i,
  )?.[0];
  assert.ok(storageHelper, "case document Storage helper is missing");
  assert.match(
    sql,
    /alter\s+policy\s+knowledge_source_reviewer_read[\s\S]*?knowledge\.is_interactive_reviewer\(\)/i,
  );
  assert.match(
    sql,
    /alter\s+policy\s+case_document_member_read[\s\S]*?casework\.can_access_case_document\s*\(\s*name\s*,\s*false\s*\)/i,
  );
  assert.match(
    sql,
    /alter\s+policy\s+case_document_member_insert[\s\S]*?casework\.can_access_case_document\s*\(\s*name\s*,\s*true\s*\)/i,
  );
  assert.match(storageHelper, /casework\.is_case_member/i);
  assert.match(storageHelper, /casework\.has_case_role/i);
  assert.match(
    sql,
    /create\s+policy\s+a5_storage_read_guard\s+on\s+storage\.objects\s+as\s+restrictive\s+for\s+select\s+to\s+public[\s\S]*?bucket_id\s+not\s+in[\s\S]*?knowledge-source-private[\s\S]*?case-documents-private/i,
  );
  assert.match(
    sql,
    /create\s+policy\s+a5_storage_insert_guard\s+on\s+storage\.objects\s+as\s+restrictive\s+for\s+insert\s+to\s+public[\s\S]*?bucket_id\s+not\s+in[\s\S]*?knowledge-source-private[\s\S]*?case-documents-private/i,
  );
  assert.match(
    sql,
    /create\s+policy\s+a5_storage_update_guard[\s\S]*?for\s+update\s+to\s+public/i,
  );
  assert.match(
    sql,
    /create\s+policy\s+a5_storage_delete_guard[\s\S]*?for\s+delete\s+to\s+public/i,
  );
});

test("case evidence RPC filters drawing documents, findings, and links by domain", () => {
  const sql = readHardening();
  const rpc = sql.match(
    /create\s+or\s+replace\s+function\s+public\.gateway_get_case_evidence[\s\S]*?\n\$\$;/i,
  )?.[0];
  assert.ok(rpc, "gateway_get_case_evidence hardening definition is missing");
  assert.match(
    rpc,
    /from\s+casework\.findings\s+f[\s\S]*?knowledge\.can_access_domain\(f\.domain\)/i,
  );
  assert.match(
    rpc,
    /from\s+casework\.evidence_links\s+e[\s\S]*?join\s+casework\.findings\s+f[\s\S]*?knowledge\.can_access_domain\(f\.domain\)/i,
  );
  assert.match(
    rpc,
    /from\s+casework\.documents\s+d[\s\S]*?knowledge\.can_access_domain\(\s*'drawing_review'/i,
  );
  assert.match(
    rpc,
    /from\s+casework\.pdf_sheets\s+s[\s\S]*?knowledge\.can_access_domain\(\s*'drawing_review'/i,
  );
});
