import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";

const ROOT = new URL("../", import.meta.url);
const ADAPTER_PATH = "supabase/functions/_shared/drs-document-bff/adapter.ts";
const TEST_PATHS = Object.freeze([
  "supabase/tests/drs_document_bff_adapter_w1.test.mjs",
  "tests/drs-document-bff-adapter-source.test.mjs",
]);
const EXACT_CANDIDATE_PATHS = Object.freeze([
  ADAPTER_PATH,
  ...TEST_PATHS,
].sort((left, right) => Buffer.compare(Buffer.from(left), Buffer.from(right))));

const IMMUTABLE_INPUTS = Object.freeze({
  "supabase/functions/_shared/drs-auth/drs-session-bootstrap-bff.ts":
    "932d91aeae5a7f447c46859ce34b696cf2b76ab9ed3143d6b962f6a4dcaab486",
  "supabase/functions/_shared/drs-auth/versioned-workspace-grant.ts":
    "ce06e53322df7af6380a6edd7e044d01df875e12c3a5318ab80f858cfc1e5cc4",
  "supabase/functions/_shared/drs-document-storage/contracts.ts":
    "8a1276116185b31f1a30aa6dbdac49f3c245c495a13224dc710caf574896c632",
  "supabase/functions/_shared/drs-document-storage/request-guard.ts":
    "be0f95fe7d1bcceb4f9828d23d6b3b906e5f0fd52e4570dd4f0ebaf0e1d9701a",
  "supabase/functions/_shared/drs-document-storage/authority.ts":
    "abdd3ec57238d84cb2a0e2946d77b6513d0531d0559110e5cad2210b919de3d9",
  "supabase/functions/_shared/drs-document-storage/service.ts":
    "19f38e5ab0f5a97072e1fa6cd3b5faa54ecf1ceedb189a8e2ac65c8e6b6061cd",
  "supabase/functions/drs-document-upload-intent/index.ts":
    "57dbaf877af266953fbe6fe87e8f299b1d8d2e154376d8c277a02a4c6e2ef5a0",
  "supabase/functions/drs-document-upload-finalize/index.ts":
    "383a297e7a0cc7a9477b627b9712c34bb44a040b31efc91a3cff764d5f1a20e1",
  "supabase/functions/drs-document-version-download/index.ts":
    "080bab1f16f2c040eb75079a0fa617bc0e025fb607f8ea7c1cf725af00be2b90",
  "supabase/functions/drs-document-snapshot/index.ts":
    "d2883d6cf92e1d4aa6dfc572b8a56b9bc0b8ba3bfd17088c52ea5eb01fbf6139",
});

async function bytes(relativePath) {
  return await readFile(new URL(relativePath, ROOT));
}

async function source(relativePath) {
  return (await bytes(relativePath)).toString("utf8");
}

function sha256(input) {
  return createHash("sha256").update(input).digest("hex");
}

test("focused RED: the exact admitted adapter module exists", async () => {
  const adapter = await source(ADAPTER_PATH);
  assert.match(adapter, /export function createDrsDocumentBffAdapter/u);
});

test("candidate source set and immutable imports stay exact", async () => {
  for (const relativePath of EXACT_CANDIDATE_PATHS) {
    assert.ok((await bytes(relativePath)).byteLength > 0, relativePath);
  }

  const adapter = await source(ADAPTER_PATH);
  const imports = [...adapter.matchAll(/from\s+["']([^"']+)["']/gu)]
    .map((match) => match[1])
    .sort();
  assert.deepEqual(imports, [
    "../drs-auth/drs-session-bootstrap-bff.ts",
    "../drs-document-storage/contracts.ts",
  ]);
  assert.match(adapter, /\bcreateDrsBffGuard\s*\(/u);

  for (const [relativePath, expected] of Object.entries(IMMUTABLE_INPUTS)) {
    assert.equal(sha256(await bytes(relativePath)), expected, relativePath);
  }
});

test("source fixes the exact D5 logical and physical route table", async () => {
  const adapter = await source(ADAPTER_PATH);
  const logical = [
    "/api/drs/documents/upload-intents",
    "/api/drs/documents/upload-intents/finalize",
    "/api/drs/document-versions/",
    "/api/drs/document-snapshots",
  ];
  const physical = [
    "/functions/v1/drs-document-upload-intent",
    "/functions/v1/drs-document-upload-finalize",
    "/functions/v1/drs-document-version-download/",
    "/functions/v1/drs-document-snapshot",
  ];
  for (const literal of [...logical, ...physical]) {
    assert.ok(adapter.includes(`"${literal}"`), literal);
  }
  for (
    const superseded of [
      "/api/drs/document/upload-intent",
      "/api/drs/document/upload-finalize",
      "/api/drs/document/version-download",
      "/api/drs/document/snapshot",
    ]
  ) {
    assert.equal(adapter.includes(`"${superseded}"`), false, superseded);
  }
  assert.match(
    adapter,
    /POST\s*\/api\/drs\/_internal\/document-operation-authorize/u,
  );
  assert.match(
    adapter,
    /laibe\.drs-document-bff\.guard\.request\.v1/u,
  );
  for (
    const operation of [
      "UPLOAD_INTENT",
      "UPLOAD_FINALIZE",
      "VERSION_DOWNLOAD",
      "SNAPSHOT",
    ]
  ) {
    assert.match(adapter, new RegExp(`\\b${operation}\\b`, "u"));
  }
});

test("source contains closed validation, bounded streams, and sanitized policy", async () => {
  const adapter = await source(ADAPTER_PATH);
  for (
    const selector of [
      "LOGICAL_REQUEST_HEADER_ALLOWLIST",
      "FORBIDDEN_AUTHORITY_FIELDS",
      "hasDuplicateTopLevelJsonMemberName",
      "MAX_REQUEST_BODY_BYTES",
      "MAX_EDGE_JSON_RESPONSE_BYTES",
      "MAX_DOCUMENT_BYTES",
      "reader.cancel",
      "TextDecoder",
      "content-disposition",
      "attachment",
      "x-content-type-options",
      "nosniff",
      "private, no-store",
      "application/json;charset=utf-8",
      "INVALID_REQUEST",
      "AUTH_REQUIRED",
      "CONTEXT_UNAVAILABLE",
      "IDEMPOTENCY_CONFLICT",
      "VERSION_CONFLICT",
    ]
  ) {
    assert.ok(adapter.includes(selector), selector);
  }

  for (
    const forbiddenLiteral of [
      "userId",
      "caseId",
      "role",
      "memberId",
      "grantId",
      "grantVersion",
      "bucket",
      "path",
      "providerIdentity",
    ]
  ) {
    const quoted = new RegExp(
      `["']${forbiddenLiteral.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&")}["']`,
      "gu",
    );
    assert.equal(
      [...adapter.matchAll(quoted)].length,
      1,
      `${forbiddenLiteral} is declared only in the rejection set`,
    );
  }

  assert.doesNotMatch(
    adapter,
    /service_role|SUPABASE_SERVICE_ROLE_KEY|console\.|error\.message|\.stack|access-control-allow-origin[^\n]*\*/iu,
  );
  assert.doesNotMatch(adapter, /request\.(?:target|backend|function)/iu);
  assert.doesNotMatch(adapter, /selectedCaseId|specialistId|authorityDigest/iu);
});
