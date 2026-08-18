import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const TEST_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(TEST_DIR, "..", "..");
const INTAKE_PATH = resolve(
  REPO_ROOT,
  "src",
  "lib",
  "budget",
  "quote-healthcheck",
  "pdf",
  "intake.ts",
);
const FIXTURE_DIR = resolve(TEST_DIR, "fixtures", "quote-healthcheck-pdf");

const fixtureBytes = (name) =>
  new Uint8Array(readFileSync(resolve(FIXTURE_DIR, name)));
const sha256 = async (bytes) =>
  Array.from(
    new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)),
  ).map((byte) => byte.toString(16).padStart(2, "0")).join("");
const documentReference = async (bytes) => ({
  documentVersionId: "document_version_quote_pdf_001",
  caseId: "case_quote_pdf_001",
  sha256: await sha256(bytes),
});
const replaceAsciiInPlace = (bytes, from, to) => {
  const before = new TextEncoder().encode(from);
  const after = new TextEncoder().encode(to);
  assert.equal(
    after.byteLength,
    before.byteLength,
    "mutation must preserve byte length",
  );
  const index = bytes.findIndex((_value, candidate) =>
    candidate + before.length <= bytes.length &&
    before.every((value, offset) => bytes[candidate + offset] === value)
  );
  assert.notEqual(index, -1, `missing fixture token: ${from}`);
  bytes.set(after, index);
};
const loadIntake = async () => {
  assert.ok(existsSync(INTAKE_PATH), `IMPLEMENTATION_MISSING: ${INTAKE_PATH}`);
  return await import(
    `${pathToFileURL(INTAKE_PATH).href}?test=${crypto.randomUUID()}`
  );
};

Deno.test("PDF byte intake accepts a readable text-layer quote and binds every fact to its immutable document version", async () => {
  const intake = await loadIntake();
  const bytes = fixtureBytes("readable-quote.pdf");
  const result = await intake.inspectQuotePdfBytes({
    bytes,
    document: await documentReference(bytes),
  });
  assert.equal(result.accepted, true, JSON.stringify(result));
  assert.equal(result.inspection.pageCount, 1);
  assert.equal(result.inspection.readability, "TEXT_LAYER");
  assert.deepEqual(
    result.facts.rows.map((
      row,
    ) => [
      row.itemName,
      row.unit,
      row.quantity,
      row.unitPrice,
      row.declaredAmount,
    ]),
    [["拆除工程", "式", "2", "1200", "2400"], [
      "油漆工程",
      "坪",
      "10",
      "800",
      "8000",
    ]],
  );
  assert.ok(
    result.facts.rows.every((row) =>
      row.provenance.sourceDocumentVersionId ===
        "document_version_quote_pdf_001"
    ),
  );
});

Deno.test("image-only PDFs stay evidence-limited and never invent OCR facts", async () => {
  const intake = await loadIntake();
  const bytes = fixtureBytes("scanned-image-only.pdf");
  const result = await intake.inspectQuotePdfBytes({
    bytes,
    document: await documentReference(bytes),
  });
  assert.equal(result.accepted, true, JSON.stringify(result));
  assert.equal(result.inspection.readability, "IMAGE_ONLY");
  assert.equal(result.facts.rows.length, 0);
  assert.ok(
    result.limitations.some(({ code }) => code === "OCR_NOT_PERFORMED"),
  );
});

Deno.test("encrypted, corrupt, page-limited, oversize, and active-content PDF bytes fail closed with specific rejection reasons", async () => {
  const intake = await loadIntake();
  for (
    const [name, options, expected] of [
      ["encrypted.pdf", {}, "ENCRYPTED_PDF"],
      ["corrupt.pdf", {}, "CORRUPT_PDF"],
      ["three-pages.pdf", { maxPages: 2 }, "PAGE_LIMIT_EXCEEDED"],
      ["three-pages.pdf", { maxBytes: 32 }, "FILE_TOO_LARGE"],
      ["adversarial-action.pdf", {}, "UNSUPPORTED_ACTIVE_CONTENT"],
    ]
  ) {
    const bytes = fixtureBytes(name);
    const result = await intake.inspectQuotePdfBytes({
      bytes,
      document: await documentReference(bytes),
      options,
    });
    assert.equal(result.accepted, false, `${name}: ${JSON.stringify(result)}`);
    assert.equal(
      result.rejection.code,
      expected,
      `${name}: ${JSON.stringify(result)}`,
    );
  }
});

Deno.test("difference and missing-item findings require an explicit baseline and preserve row provenance", async () => {
  const intake = await loadIntake();
  const bytes = fixtureBytes("readable-quote.pdf");
  const result = await intake.inspectQuotePdfBytes({
    bytes,
    document: await documentReference(bytes),
    baseline: {
      baselineId: "baseline_room_scope_001",
      items: ["拆除工程", "防水工程"],
    },
  });
  assert.equal(result.accepted, true, JSON.stringify(result));
  assert.equal(result.comparison.status, "EVALUATED");
  assert.ok(
    result.comparison.findings.some(({ code }) =>
      code === "BASELINE_ITEM_MISSING"
    ),
  );
  assert.ok(
    result.comparison.findings.every((finding) =>
      finding.baselineId === "baseline_room_scope_001"
    ),
  );
});

Deno.test("without an explicit baseline, a PDF intake reports comparison as not evaluated instead of fabricating a difference", async () => {
  const intake = await loadIntake();
  const bytes = fixtureBytes("readable-quote.pdf");
  const result = await intake.inspectQuotePdfBytes({
    bytes,
    document: await documentReference(bytes),
  });
  assert.equal(result.accepted, true, JSON.stringify(result));
  assert.equal(result.comparison.status, "NOT_EVALUATED");
  assert.deepEqual(result.comparison.findings, []);
});

Deno.test("PDF intake parses only the frozen bytes whose SHA-256 was verified even when the caller mutates its buffer during digest await", async () => {
  const intake = await loadIntake();
  const bytes = fixtureBytes("toctou-quote.pdf");
  const document = await documentReference(bytes);
  const pending = intake.inspectQuotePdfBytes({ bytes, document });
  replaceAsciiInPlace(bytes, "ORIGINALITEM", "MUTATED_ITEM");
  const result = await pending;
  assert.equal(result.accepted, true, JSON.stringify(result));
  assert.deepEqual(result.facts.rows.map(({ itemName }) => itemName), [
    "ORIGINALITEM",
  ]);
  assert.ok(
    result.facts.rows.every(({ provenance }) =>
      provenance.sourceDocumentSha256 === document.sha256
    ),
  );
});

Deno.test("Tj-shaped metadata outside a referenced page content stream never becomes a quote fact", async () => {
  const intake = await loadIntake();
  const bytes = fixtureBytes("metadata-fake-tj.pdf");
  const result = await intake.inspectQuotePdfBytes({
    bytes,
    document: await documentReference(bytes),
  });
  assert.equal(result.accepted, true, JSON.stringify(result));
  assert.deepEqual(result.facts.rows, []);
  assert.equal(result.inspection.readability, "NO_EXTRACTABLE_TEXT");
});

Deno.test("filter arrays and hex-escaped dangerous PDF names fail closed before content extraction", async () => {
  const intake = await loadIntake();
  for (
    const [name, expected] of [
      ["filter-array.pdf", "UNSUPPORTED_COMPRESSED_CONTENT"],
      ["escaped-action.pdf", "UNSUPPORTED_ACTIVE_CONTENT"],
      ["escaped-encrypted.pdf", "ENCRYPTED_PDF"],
    ]
  ) {
    const bytes = fixtureBytes(name);
    const result = await intake.inspectQuotePdfBytes({
      bytes,
      document: await documentReference(bytes),
    });
    assert.equal(result.accepted, false, `${name}: ${JSON.stringify(result)}`);
    assert.equal(
      result.rejection.code,
      expected,
      `${name}: ${JSON.stringify(result)}`,
    );
  }
});

Deno.test("literal fake stream markers cannot hide active, encrypted, or filtered dictionary names", async () => {
  const intake = await loadIntake();
  for (
    const [name, expected] of [
      ["r2-literal-fake-active.pdf", "UNSUPPORTED_ACTIVE_CONTENT"],
      ["r2-literal-fake-encrypt.pdf", "ENCRYPTED_PDF"],
      ["r2-literal-fake-filter.pdf", "UNSUPPORTED_COMPRESSED_CONTENT"],
    ]
  ) {
    const bytes = fixtureBytes(name);
    const result = await intake.inspectQuotePdfBytes({
      bytes,
      document: await documentReference(bytes),
    });
    assert.equal(result.accepted, false, `${name}: ${JSON.stringify(result)}`);
    assert.equal(
      result.rejection.code,
      expected,
      `${name}: ${JSON.stringify(result)}`,
    );
  }
});

Deno.test("only an actual page-object dictionary contributes to page enumeration", async () => {
  const intake = await loadIntake();
  const bytes = fixtureBytes("r2-type-page-contamination.pdf");
  const result = await intake.inspectQuotePdfBytes({
    bytes,
    document: await documentReference(bytes),
  });
  assert.equal(result.accepted, true, JSON.stringify(result));
  assert.equal(result.inspection.pageCount, 1);
  assert.equal(result.inspection.readability, "TEXT_LAYER");
});

Deno.test("invalid UTF-8 in a content stream is evidence-limited and never decoded as Latin-1 quote facts", async () => {
  const intake = await loadIntake();
  const bytes = fixtureBytes("toctou-quote.pdf");
  replaceAsciiInPlace(bytes, "ORIGINALITEM", "MUTATED_ITEM");
  const marker = new TextEncoder().encode("MUTATED_ITEM");
  const index = bytes.findIndex((_value, candidate) =>
    candidate + marker.length <= bytes.length &&
    marker.every((value, offset) => bytes[candidate + offset] === value)
  );
  assert.notEqual(index, -1);
  bytes[index] = 0xff;
  const result = await intake.inspectQuotePdfBytes({
    bytes,
    document: await documentReference(bytes),
  });
  assert.equal(result.accepted, true, JSON.stringify(result));
  assert.deepEqual(result.facts.rows, []);
  assert.equal(result.inspection.readability, "NO_EXTRACTABLE_TEXT");
  assert.ok(
    result.limitations.some(({ code }) => code === "INVALID_TEXT_ENCODING"),
  );
});

Deno.test("blank, malformed, open, or non-string baseline inputs remain not evaluated and never fabricate findings", async () => {
  const intake = await loadIntake();
  const bytes = fixtureBytes("readable-quote.pdf");
  const invalidBaselines = [
    { baselineId: " ", items: ["waterproofing"] },
    { baselineId: "baseline with spaces", items: ["waterproofing"] },
    { baselineId: "baseline_scope_001", items: [] },
    { baselineId: "baseline_scope_001", items: [""] },
    { baselineId: "baseline_scope_001", items: [42] },
    {
      baselineId: "baseline_scope_001",
      items: ["waterproofing"],
      mutableLabel: "extra",
    },
  ];
  for (const baseline of invalidBaselines) {
    const result = await intake.inspectQuotePdfBytes({
      bytes,
      document: await documentReference(bytes),
      baseline,
    });
    assert.equal(result.accepted, true, JSON.stringify(result));
    assert.equal(
      result.comparison.status,
      "NOT_EVALUATED",
      JSON.stringify(baseline),
    );
    assert.deepEqual(result.comparison.findings, []);
    assert.ok(
      result.limitations.some(({ code }) => code === "BASELINE_INVALID"),
    );
  }
});

Deno.test("a nested /Contents entry cannot become a page content-stream reference", async () => {
  const intake = await loadIntake();
  const bytes = fixtureBytes("r3-nested-contents.pdf");
  const result = await intake.inspectQuotePdfBytes({
    bytes,
    document: await documentReference(bytes),
  });

  assert.equal(result.accepted, false, JSON.stringify(result));
  assert.equal(result.rejection?.code, "CORRUPT_PDF");
});

Deno.test("a duplicate top-level /Type key cannot classify an object as a page", async () => {
  const intake = await loadIntake();
  const bytes = fixtureBytes("r3-duplicate-type.pdf");
  const result = await intake.inspectQuotePdfBytes({
    bytes,
    document: await documentReference(bytes),
  });

  assert.equal(result.accepted, false, JSON.stringify(result));
  assert.equal(result.rejection?.code, "CORRUPT_PDF");
});

Deno.test("an unterminated literal cannot supply a fake endstream terminator", async () => {
  const intake = await loadIntake();
  const bytes = fixtureBytes("r3-unterminated-literal-endstream.pdf");
  const result = await intake.inspectQuotePdfBytes({
    bytes,
    document: await documentReference(bytes),
  });

  assert.equal(result.accepted, false, JSON.stringify(result));
  assert.equal(result.rejection?.code, "CORRUPT_PDF");
});
