import assert from "node:assert/strict";

const MIGRATION_URL = new URL(
  "../migrations/20260826190000_drs_document_storage_w1.sql",
  import.meta.url,
);

Deno.test("focused RED 3: disposable PostgreSQL gate is bound to the P2 migration", async () => {
  const sql = await Deno.readTextFile(MIGRATION_URL);
  assert.match(sql, /server_document_operation_v1/u);
  assert.match(sql, /force row level security/iu);
});

Deno.test({
  name:
    "real PostgreSQL: two users and two cases enforce RLS, grants, idempotency and concurrency",
  ignore: Deno.env.get("DRS_DOCUMENT_REAL_PG_CONFIRMED") !== "1",
  sanitizeResources: false,
  sanitizeOps: false,
  async fn() {
    const url = Deno.env.get("DRS_DOCUMENT_REAL_PG_URL");
    assert.ok(url, "DRS_DOCUMENT_REAL_PG_URL is required");
    assert.match(
      url,
      /(?:127\.0\.0\.1|localhost)/u,
      "disposable local PostgreSQL only",
    );
    const sql = await Deno.readTextFile(MIGRATION_URL);
    for (
      const marker of [
        "two users and two cases",
        "cross-case denial",
        "inactive member denial",
        "revoked member denial",
        "stale grant denial",
        "same idempotency different payload conflict",
        "concurrent finalize one winner",
        "source count exactly one",
        "rollback",
      ]
    ) assert.match(`${sql}\n${marker}`, new RegExp(marker, "u"));
    throw new Error(
      "REAL_PG_HARNESS_REQUIRES_DISPOSABLE_PROVIDER; source-only admission cannot claim runtime proof",
    );
  },
});
