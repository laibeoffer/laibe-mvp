import assert from "node:assert/strict";

const STORAGE_URL = new URL(
  "../functions/_shared/drs-document-storage/supabase-storage-adapter.ts",
  import.meta.url,
);
const VALIDATION_URL = new URL(
  "../functions/_shared/drs-document-storage/validation.ts",
  import.meta.url,
);

Deno.test("focused RED 4: signed capability and scanner fail-closed seams are absent", async () => {
  const storage = await import(STORAGE_URL.href);
  const validation = await import(VALIDATION_URL.href);
  assert.equal(typeof storage.createSupabaseDocumentStoragePort, "function");
  assert.equal(typeof validation.evaluateHostileFileReport, "function");
});

Deno.test("server-owned intake path cannot be replaced by a caller path", async () => {
  const { buildIntakeObjectPath } = await import(STORAGE_URL.href);
  assert.equal(
    buildIntakeObjectPath(
      "11111111-1111-4111-8111-111111111111",
      "22222222-2222-4222-8222-222222222222",
      "pdf",
    ),
    "intents/11111111-1111-4111-8111-111111111111/22222222-2222-4222-8222-222222222222.pdf",
  );
  for (const ext of ["../pdf", "svg", "PDF", "pdf/evil"]) {
    assert.throws(() =>
      buildIntakeObjectPath(
        "11111111-1111-4111-8111-111111111111",
        "22222222-2222-4222-8222-222222222222",
        ext,
      )
    );
  }
});

Deno.test({
  name:
    "real Storage: private buckets, capability expiry/replay and negative uploads",
  ignore: Deno.env.get("DRS_DOCUMENT_REAL_STORAGE_CONFIRMED") !== "1",
  sanitizeResources: false,
  sanitizeOps: false,
  fn() {
    const url = Deno.env.get("DRS_DOCUMENT_REAL_STORAGE_URL");
    assert.ok(url);
    assert.match(
      url,
      /(?:127\.0\.0\.1|localhost)/u,
      "disposable local Storage only",
    );
    throw new Error(
      "REAL_STORAGE_HARNESS_REQUIRES_DISPOSABLE_PROVIDER; source-only admission cannot claim runtime proof",
    );
  },
});
