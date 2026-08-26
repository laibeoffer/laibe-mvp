import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

async function bytes(path) {
  return await readFile(new URL(path, root));
}

async function text(path) {
  return (await bytes(path)).toString("utf8");
}

test("focused RED: P1 source closure and config declarations are absent", async () => {
  const [migration, config] = await Promise.all([
    text("supabase/migrations/20260818160000_casework_authority_v1.sql"),
    text("supabase/config.toml"),
  ]);
  assert.match(migration, /create table casework\.case_members/u);
  assert.match(
    config,
    /\[functions\.casework-case-create\]\nverify_jwt = true/u,
  );
});

test("D5 durable authority bytes are exact", async () => {
  const packet = await bytes(
    "docs/drs_backend/contracts/d5_drs_data_authority_20260826_v2.txt",
  );
  assert.equal(packet.length, 23491);
  assert.equal(
    createHash("sha256").update(packet).digest("hex"),
    "4463d55e6c2204877b045024bc43151993d2c0aa56671a37499f0c213fef76f7",
  );
  assert.equal(
    packet.subarray(0, 3).equals(Buffer.from([0xef, 0xbb, 0xbf])),
    false,
  );
  assert.equal(packet.includes(0x0d), false);
  assert.notEqual(packet.at(-1), 0x0a);
  assert.doesNotMatch(packet.toString("utf8"), /CANONICAL_BODY_END/u);
});

test("P1 source paths close JWT identity before service RPC", async () => {
  const routes = [
    ["supabase/functions/casework-case-create/index.ts", "createCase("],
    [
      "supabase/functions/owner-workspace-grant/index.ts",
      "resolveWorkspaceGrant(",
    ],
    [
      "supabase/functions/vendor-workspace-grant/index.ts",
      "resolveWorkspaceGrant(",
    ],
    [
      "supabase/functions/highest-reviewer-workspace-grant/index.ts",
      "resolveWorkspaceGrant(",
    ],
  ];
  for (const [path, backendMarker] of routes) {
    const source = await text(path);
    assert.match(source, /VERIFY_JWT_REQUIRED = true/u);
    const identity = source.indexOf("resolveAuthenticatedIdentity(request)");
    const backend = source.indexOf(backendMarker);
    assert.notEqual(identity, -1, path);
    assert.notEqual(backend, -1, path);
    assert.ok(identity < backend, path);
    assert.doesNotMatch(source, /user_metadata|raw_user_meta_data/iu);
  }
});

test("P1 source excludes all document and Storage authority", async () => {
  const paths = [
    "supabase/config.toml",
    "supabase/migrations/20260818160000_casework_authority_v1.sql",
    "supabase/functions/_shared/casework-authority/contracts.ts",
    "supabase/functions/_shared/casework-authority/resolver.ts",
  ];
  const combined = (await Promise.all(paths.map(text))).join("\n");
  assert.doesNotMatch(
    combined,
    /server_document_operation|document_versions|document_upload|storage\.buckets|drs-case-intake-private|drs-case-records-private|drs-document-upload|drs-document-snapshot/iu,
  );
});

test("P1 migration is ordered before every accepted dependent migration", () => {
  const p1 = "20260818160000_casework_authority_v1.sql";
  for (
    const dependent of [
      "20260818165231_case_member_google_calendar_binding.sql",
      "20260820090000_drs_core_case_audit_contract.sql",
      "20260821170000_google_calendar_drs_account_contract.sql",
      "20260824090000_drs_google_calendar_api_w1.sql",
      "20260824092002_drs_identity_foundation.sql",
      "20260824170000_drs_identity_google_line_w1.sql",
      "20260824180000_drs_calendar_identity_composition_w1.sql",
    ]
  ) assert.ok(p1 < dependent, dependent);
});
