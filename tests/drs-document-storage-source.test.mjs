import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const exact18 = [
  "supabase/functions/_shared/drs-document-storage/authority.ts",
  "supabase/functions/_shared/drs-document-storage/contracts.ts",
  "supabase/functions/_shared/drs-document-storage/ports.ts",
  "supabase/functions/_shared/drs-document-storage/request-guard.ts",
  "supabase/functions/_shared/drs-document-storage/service.ts",
  "supabase/functions/_shared/drs-document-storage/supabase-document-adapter.ts",
  "supabase/functions/_shared/drs-document-storage/supabase-storage-adapter.ts",
  "supabase/functions/_shared/drs-document-storage/validation.ts",
  "supabase/functions/drs-document-snapshot/index.ts",
  "supabase/functions/drs-document-upload-finalize/index.ts",
  "supabase/functions/drs-document-upload-intent/index.ts",
  "supabase/functions/drs-document-version-download/index.ts",
  "supabase/migrations/20260826190000_drs_document_storage_w1.sql",
  "supabase/tests/drs_document_storage_contract_w1.test.mjs",
  "supabase/tests/drs_document_storage_migration_w1.test.mjs",
  "supabase/tests/drs_document_storage_real_pg_w1.test.mjs",
  "supabase/tests/drs_document_storage_real_storage_w1.test.mjs",
  "tests/drs-document-storage-source.test.mjs",
];

async function text(path) {
  return await readFile(new URL(path, root), "utf8");
}

test("focused RED 5: exact18 production source and accepted config dependency are absent", async () => {
  for (const path of exact18) {
    assert.ok((await stat(new URL(path, root))).isFile(), path);
  }
  const config = await text("supabase/config.toml");
  for (
    const marker of [
      "[storage.buckets.drs-case-intake-private]",
      "[storage.buckets.drs-case-records-private]",
      "[functions.drs-document-upload-intent]",
      "[functions.drs-document-upload-finalize]",
      "[functions.drs-document-version-download]",
      "[functions.drs-document-snapshot]",
    ]
  ) assert.ok(config.includes(marker), marker);
});

test("source uses the accepted versioned grant seam and never projects capability internals", async () => {
  const production = await Promise.all(exact18.slice(0, 13).map(text));
  const source = production.join("\n");
  assert.match(source, /versioned-workspace-grant\.ts/u);
  assert.match(source, /grantVersion/u);
  assert.match(source, /server_document_operation_v1/u);
  const publicHandlersAndResponses = [
    production[4],
    ...production.slice(8, 12),
  ].join("\n");
  assert.doesNotMatch(
    publicHandlersAndResponses,
    /"(?:grantId|grantVersion|grantExpiresAt)"/u,
  );
  assert.doesNotMatch(
    publicHandlersAndResponses,
    /grant_(?:id|version|expires_at)\s*:/u,
  );
});

test("four handlers are source-only functions/v1 endpoints with closed failure states", async () => {
  const handlers = await Promise.all(exact18.slice(8, 12).map(text));
  const service = await text(
    "supabase/functions/_shared/drs-document-storage/service.ts",
  );
  for (const source of handlers) {
    assert.match(source, /\/functions\/v1\/drs-document-/u);
    assert.doesNotMatch(source, /\/api\/drs\//u);
    assert.doesNotMatch(source, /stack|raw provider|console\./iu);
  }
  for (
    const state of ["AUTH_REQUIRED", "INVALID_REQUEST", "CONTEXT_UNAVAILABLE"]
  ) {
    assert.match(service, new RegExp(state, "u"));
  }
});

test("Storage uses fixed private buckets, upsert false and no SQL metadata-row mutation", async () => {
  const [adapter, contracts, migration] = await Promise.all([
    text(
      "supabase/functions/_shared/drs-document-storage/supabase-storage-adapter.ts",
    ),
    text("supabase/functions/_shared/drs-document-storage/contracts.ts"),
    text("supabase/migrations/20260826190000_drs_document_storage_w1.sql"),
  ]);
  assert.match(`${contracts}\n${adapter}`, /drs-case-intake-private/u);
  assert.match(`${contracts}\n${adapter}`, /drs-case-records-private/u);
  assert.match(adapter, /upsert:\s*false/u);
  assert.doesNotMatch(
    migration,
    /(?:insert\s+into|update|delete\s+from)\s+storage\.(?:buckets|objects)/iu,
  );
});

test("scanner/provider gaps quarantine and orphan work remains queued rather than falsely completed", async () => {
  const [validation, service, documentAdapter, migration] = await Promise.all([
    text("supabase/functions/_shared/drs-document-storage/validation.ts"),
    text("supabase/functions/_shared/drs-document-storage/service.ts"),
    text(
      "supabase/functions/_shared/drs-document-storage/supabase-document-adapter.ts",
    ),
    text("supabase/migrations/20260826190000_drs_document_storage_w1.sql"),
  ]);
  assert.match(
    validation,
    /UNKNOWN[\s\S]*?QUARANTINED|QUARANTINED[\s\S]*?UNKNOWN/u,
  );
  assert.match(service, /queueOrphanCleanup/u);
  assert.match(documentAdapter, /crypto\.subtle\.digest/u);
  assert.match(documentAdapter, /orphanPayloadSha256/u);
  assert.match(migration, /document_orphan_cleanup_work_items/u);
  assert.doesNotMatch(migration, /DOCUMENT_ORPHAN_CLEANUP_COMPLETED/u);
});

test("bounded streams, byte-derived hashes and closed conflict states are visible in source", async () => {
  const [guard, adapter, service] = await Promise.all([
    text("supabase/functions/_shared/drs-document-storage/request-guard.ts"),
    text(
      "supabase/functions/_shared/drs-document-storage/supabase-storage-adapter.ts",
    ),
    text("supabase/functions/_shared/drs-document-storage/service.ts"),
  ]);
  assert.match(guard, /body\.getReader\(\)/u);
  assert.match(guard, /reader\.cancel\(/u);
  assert.doesNotMatch(guard, /clone\(\)\.arrayBuffer\(\)/u);
  assert.match(adapter, /candidate[\s\S]*?\.url/u);
  assert.doesNotMatch(adapter, /\.signedURL/u);
  assert.match(adapter, /method:\s*"GET"/u);
  assert.match(adapter, /crypto\.subtle\.digest/u);
  assert.doesNotMatch(adapter, /x-laibe-sha256/iu);
  assert.match(service, /IDEMPOTENCY_CONFLICT/u);
  assert.match(service, /VERSION_CONFLICT/u);
  assert.match(service, /\b409\b/u);
});

test("no external engineering, escrow/payment or old-house investment content is introduced", async () => {
  const source = (await Promise.all(exact18.slice(0, 13).map(text))).join("\n");
  assert.doesNotMatch(
    source,
    /escrow|payment custody|代收代付|金流託管|老屋煉金|投資報酬/iu,
  );
  assert.doesNotMatch(source, /mock success|API 未開|DB 未寫入/iu);
});
