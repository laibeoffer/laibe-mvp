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
const deterministicQuotePdf = ({
  additionalObjects = "",
  catalogEntry = "",
  pageEntry = "",
  stream,
}) => {
  const encoder = new TextEncoder();
  const streamByteLength = encoder.encode(stream).byteLength;
  return encoder.encode(
    `%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R${
      catalogEntry ? ` ${catalogEntry}` : ""
    } >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /Contents 4 0 R${
      pageEntry ? ` ${pageEntry}` : ""
    } >>\nendobj\n4 0 obj\n<< /Length ${streamByteLength} >>\nstream\n${stream}endstream\nendobj\n${additionalObjects}trailer\n<< /Root 1 0 R >>\n%%EOF`,
  );
};
const inspectStream = async (stream) => {
  const intake = await loadIntake();
  const bytes = deterministicQuotePdf({ stream });
  return {
    bytes,
    result: await intake.inspectQuotePdfBytes({
      bytes,
      document: await documentReference(bytes),
    }),
  };
};
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

Deno.test("structural open and additional-action triggers fail closed across action subtypes and name escapes", async () => {
  const intake = await loadIntake();
  const stream = "BT\n(VALID ITEM|unit|1|2|2) Tj\nET\n";
  const activeCatalogEntries = [
    "/OpenAction << /S /URI /URI (https://example.test) >>",
    "/Open#41ction << /S /URI /URI (https://example.test) >>",
    "/AA << /O << /S /SubmitForm /F (https://example.test) >> >>",
    "/#41A << /O << /S /ImportData /F (payload.fdf) >> >>",
  ];

  for (const catalogEntry of activeCatalogEntries) {
    const bytes = deterministicQuotePdf({ catalogEntry, stream });
    const result = await intake.inspectQuotePdfBytes({
      bytes,
      document: await documentReference(bytes),
    });

    assert.equal(result.accepted, false, catalogEntry);
    assert.equal(result.rejection?.code, "UNSUPPORTED_ACTIVE_CONTENT");
  }
});

Deno.test("commented text operators never create quote facts while percent signs inside literals remain data", async () => {
  const intake = await loadIntake();
  const bytes = deterministicQuotePdf({
    stream:
      "% BT\n% (COMMENT GHOST|unit|1|1|1) Tj\n% ET\nBT\n(VALID 10%|unit|1|2|2) Tj\nET\n",
  });
  const result = await intake.inspectQuotePdfBytes({
    bytes,
    document: await documentReference(bytes),
  });

  assert.equal(result.accepted, true, JSON.stringify(result));
  assert.deepEqual(
    result.facts.rows.map((row) => row.itemName),
    ["VALID 10%"],
  );
});

Deno.test("a balanced nested literal cannot expose an inner fake Tj operand", async () => {
  const { result } = await inspectStream(
    "BT\n((GHOST|unit|1|1|1) Tj) Tj\nET\n",
  );

  assert.equal(result.accepted, true, JSON.stringify(result));
  assert.deepEqual(result.facts.rows, []);
});

Deno.test("a legitimate quote row preserves nested literal parentheses", async () => {
  const { result } = await inspectStream(
    "BT\n(ITEM (nested)|unit|1|2|2) Tj\nET\n",
  );

  assert.equal(result.accepted, true, JSON.stringify(result));
  assert.deepEqual(
    result.facts.rows.map((row) => row.itemName),
    ["ITEM (nested)"],
  );
});

Deno.test("operator-shaped bytes inside a literal cannot fabricate a quote row", async () => {
  const { result } = await inspectStream(
    "BT\n(BT (GHOST|unit|1|1|1) Tj ET) Tc\nET\n",
  );

  assert.equal(result.accepted, true, JSON.stringify(result));
  assert.deepEqual(result.facts.rows, []);
});

Deno.test("ET text inside a literal does not close the active text object", async () => {
  const { result } = await inspectStream(
    "BT\n(VALID ET TOKEN|unit|1|2|2) Tj\nET\n",
  );

  assert.equal(result.accepted, true, JSON.stringify(result));
  assert.deepEqual(
    result.facts.rows.map((row) => row.itemName),
    ["VALID ET TOKEN"],
  );
});

Deno.test("hex, name, array, and dictionary contents are atomic to text operators", async () => {
  const { result } = await inspectStream(
    "BT\n<4554> /ET [(ARRAY GHOST|unit|1|1|1) /Tj] << /Key (BT ET Tj) >> q\n" +
      "(COMPOSITE SAFE|unit|1|2|2) Tj\nET\n",
  );

  assert.equal(result.accepted, true, JSON.stringify(result));
  assert.deepEqual(
    result.facts.rows.map((row) => row.itemName),
    ["COMPOSITE SAFE"],
  );
});

Deno.test("LF, CR, and CRLF comments are skipped while literal percent signs remain data", async () => {
  const { result } = await inspectStream(
    "% LF BT (GHOST|unit|1|1|1) Tj ET\n" +
      "% CR BT (GHOST|unit|1|1|1) Tj ET\r" +
      "% CRLF BT (GHOST|unit|1|1|1) Tj ET\r\n" +
      "BT\n(VALID 10%|unit|1|2|2) Tj\nET\n",
  );

  assert.equal(result.accepted, true, JSON.stringify(result));
  assert.deepEqual(
    result.facts.rows.map((row) => row.itemName),
    ["VALID 10%"],
  );
});

Deno.test("literal escapes, octal bytes, and line continuations decode linearly", async () => {
  const encodedItem = "Escaped \\(paren\\) \\\\ slash \\101\\102\\103 line\\" +
    "\n" + "joined\\" + "\r" + "joined\\" + "\r\n" + "end";
  const { result } = await inspectStream(
    `BT\n(${encodedItem}|unit|1|2|2) Tj\nET\n`,
  );

  assert.equal(result.accepted, true, JSON.stringify(result));
  assert.deepEqual(
    result.facts.rows.map((row) => row.itemName),
    ["Escaped (paren) \\ slash ABC linejoinedjoinedend"],
  );
});

Deno.test("operator names require exact tokens while delimiter adjacency remains valid", async () => {
  const { result } = await inspectStream(
    "/BT (NAME GHOST|unit|1|1|1) Tj\n" +
      "BTx (PREFIX GHOST|unit|1|1|1) Tj\n" +
      "BT-evil (HYPHEN GHOST|unit|1|1|1) Tj\n" +
      "BT\n(TJ EXTRA GHOST|unit|1|1|1) Tj-extra\n" +
      "(DELIMITER SAFE|unit|1|2|2)Tj\nET\n",
  );

  assert.equal(result.accepted, true, JSON.stringify(result));
  assert.deepEqual(
    result.facts.rows.map((row) => row.itemName),
    ["DELIMITER SAFE"],
  );
});

Deno.test("uppercase TJ, outside Tj, and non-literal Tj operands create no facts", async () => {
  const { result } = await inspectStream(
    "(OUTSIDE GHOST|unit|1|1|1) Tj\n" +
      "BT\n/Name Tj\n(UPPERCASE GHOST|unit|1|1|1) TJ\nET\n",
  );

  assert.equal(result.accepted, true, JSON.stringify(result));
  assert.deepEqual(result.facts.rows, []);
});

Deno.test("lexically incomplete or structurally invalid text objects fail closed", async () => {
  for (
    const [name, stream] of [
      ["unterminated literal", "BT\n(ROW|unit|1|2|2 Tj\nET\n"],
      ["unterminated hex", "BT\n<524f57\nET\n"],
      ["nested BT", "BT\nBT\n(ROW|unit|1|2|2) Tj\nET\nET\n"],
      ["orphan ET", "ET\n"],
      ["unclosed BT", "BT\n(ROW|unit|1|2|2) Tj\n"],
    ]
  ) {
    const { result } = await inspectStream(stream);
    assert.equal(result.accepted, false, `${name}: ${JSON.stringify(result)}`);
    assert.equal(result.rejection?.code, "CORRUPT_PDF", name);
  }
});

Deno.test("multibyte stream prefixes preserve the exact outer-literal byte offset", async () => {
  const literal = "(多位元項目|式|1|2|2)";
  const { bytes, result } = await inspectStream(
    `% 前綴\nBT\n${literal} Tj\nET\n`,
  );
  const marker = new TextEncoder().encode(literal);
  const expectedOffset = bytes.findIndex((_value, candidate) =>
    candidate + marker.length <= bytes.length &&
    marker.every((value, offset) => bytes[candidate + offset] === value)
  );

  assert.notEqual(expectedOffset, -1);
  assert.equal(result.accepted, true, JSON.stringify(result));
  assert.equal(result.facts.rows.length, 1);
  assert.equal(result.facts.rows[0].provenance.textOffset, expectedOffset);
});

for (
  const [name, annotationAction, actionObject] of [
    [
      "inline URI action",
      "/A << /S /URI /URI (https://example.test) >>",
      "",
    ],
    [
      "indirect SubmitForm action",
      "/A 9 0 R",
      "9 0 obj\n<< /S /SubmitForm /F (https://example.test) >>\nendobj\n",
    ],
    [
      "encoded A key",
      "/#41 << /S /URI /URI (https://example.test) >>",
      "",
    ],
  ]
) {
  Deno.test(`standard page annotation ${name} fails closed`, async () => {
    const intake = await loadIntake();
    const bytes = deterministicQuotePdf({
      additionalObjects:
        `5 0 obj\n<< /Type /Annot /Subtype /Link /Rect [0 0 10 10] ${annotationAction} >>\nendobj\n${actionObject}`,
      pageEntry: "/Annots [5 0 R]",
      stream: "BT\n(VALID ITEM|unit|1|2|2) Tj\nET\n",
    });
    const result = await intake.inspectQuotePdfBytes({
      bytes,
      document: await documentReference(bytes),
    });

    assert.equal(result.accepted, false, name);
    assert.equal(result.rejection?.code, "UNSUPPORTED_ACTIVE_CONTENT");
  });
}
