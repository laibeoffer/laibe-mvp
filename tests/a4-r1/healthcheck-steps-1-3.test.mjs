import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

async function optionalModule(relativeUrl) {
  try {
    return await import(new URL(relativeUrl, import.meta.url));
  } catch (error) {
    if (error?.code === "ERR_MODULE_NOT_FOUND") return Object.freeze({});
    throw error;
  }
}

function fixture(name) {
  return JSON.parse(
    readFileSync(
      new URL(`../fixtures/a4-r1-ai/${name}`, import.meta.url),
      "utf8",
    ),
  );
}

function requiredFunction(module, name) {
  assert.equal(
    typeof module[name],
    "function",
    `missing required healthcheck behavior: ${name}`,
  );
  return module[name];
}

const quoteModule = await optionalModule(
  "../../supabase/functions/_shared/drs-analysis/quote-healthcheck.ts",
);
const drawingModule = await optionalModule(
  "../../supabase/functions/_shared/drs-analysis/drawing-healthcheck.ts",
);
const contractModule = await optionalModule(
  "../../supabase/functions/_shared/drs-analysis/contract-healthcheck.ts",
);

const CONTEXT = Object.freeze({
  caseId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  runId: "66666666-6060-4060-8060-606060606060",
  runKeySha256:
    "ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff",
});

test("steps 1-3 expose deterministic quote, drawing, and contract healthchecks", () => {
  requiredFunction(quoteModule, "runQuoteHealthcheck");
  requiredFunction(drawingModule, "runDrawingHealthcheck");
  requiredFunction(contractModule, "runContractHealthcheck");
});

test("quote same label with different immutable SHA values cites both versions", () => {
  const run = requiredFunction(quoteModule, "runQuoteHealthcheck");
  const result = run(fixture("quote-001.json"), CONTEXT);
  const conflict = result.find((finding) =>
    finding.code === "QUOTE_SAME_LABEL_VALUE_CONFLICT"
  );
  assert.ok(conflict);
  assert.equal(conflict.classification, "conflict");
  assert.equal(conflict.formalImpact, "none");
  assert.deepEqual(
    new Set(conflict.citations.map((citation) => citation.documentSha256)),
    new Set(["a".repeat(64), "b".repeat(64)]),
  );
  assert.deepEqual(
    new Set(conflict.citations.map((citation) => citation.documentVersionId)),
    new Set([
      "11111111-1010-4010-8010-101010101010",
      "22222222-2020-4020-8020-202020202020",
    ]),
  );
  assert.ok(conflict.citations.every((citation) =>
    citation.kind === "quote_row" &&
    Number.isInteger(citation.row) &&
    (Number.isInteger(citation.page) ||
      (typeof citation.sheet === "string" &&
        typeof citation.cellRange === "string"))
  ));
});

test("quote unknown row stays UNKNOWN and never becomes price approval", () => {
  const run = requiredFunction(quoteModule, "runQuoteHealthcheck");
  const result = run(fixture("quote-001.json"), CONTEXT);
  const unknown = result.find((finding) =>
    finding.code === "QUOTE_PRICE_BASIS_UNKNOWN"
  );
  assert.ok(unknown);
  assert.equal(unknown.classification, "unknown");
  assert.equal(unknown.humanReviewRequired, true);
  assert.equal(unknown.unknowns[0].nextActor, "vendor");
  assert.match(unknown.unknowns[0].requiredEvidence, /數量.*單價.*計價單位/u);
  assert.doesNotMatch(
    `${unknown.statement}\n${unknown.rationale}`,
    /核准|已確認合理|通過|approved/iu,
  );
});

test("drawing missing scale is unresolved and carries an exact region citation", () => {
  const run = requiredFunction(drawingModule, "runDrawingHealthcheck");
  const result = run(fixture("drawing-001.json"), CONTEXT);
  const missing = result.find((finding) =>
    finding.code === "DRAWING_SCALE_MISSING"
  );
  assert.ok(missing);
  assert.equal(missing.classification, "unknown");
  assert.equal(missing.citations.length, 1);
  assert.deepEqual(missing.citations[0], {
    kind: "drawing_region",
    caseId: CONTEXT.caseId,
    documentId: "30303030-3030-4030-8030-303030303030",
    documentVersionId: "33333333-3030-4030-8030-303030303030",
    documentSha256: "c".repeat(64),
    setName: "配置圖",
    sheet: "A-01",
    page: 1,
    scaleStatus: "missing",
    scaleValue: null,
    coordinateRegion: { x: 0.72, y: 0.86, width: 0.22, height: 0.1 },
  });
});

test("unreadable drawing scan remains UNKNOWN with no drawing approval", () => {
  const run = requiredFunction(drawingModule, "runDrawingHealthcheck");
  const result = run(fixture("drawing-001.json"), CONTEXT);
  const unreadable = result.find((finding) =>
    finding.code === "DRAWING_SCAN_UNREADABLE"
  );
  assert.ok(unreadable);
  assert.equal(unreadable.classification, "unknown");
  assert.equal(unreadable.unknowns[0].nextActor, "owner");
  assert.doesNotMatch(
    `${unreadable.statement}\n${unreadable.rationale}`,
    /圖面已核准|可施工|approved/iu,
  );
});

test("contract missing page uses manifest plus clause basis and makes no legal opinion", () => {
  const run = requiredFunction(contractModule, "runContractHealthcheck");
  const result = run(fixture("document-001.json"), CONTEXT);
  const missing = result.find((finding) =>
    finding.code === "CONTRACT_PAGE_OR_CLAUSE_MISSING"
  );
  assert.ok(missing);
  assert.equal(missing.classification, "unknown");
  assert.deepEqual(
    new Set(missing.citations.map((citation) => citation.kind)),
    new Set(["document_manifest_gap", "contract_region"]),
  );
  assert.equal(missing.unknowns[0].nextActor, "external_professional");
  assert.doesNotMatch(
    `${missing.statement}\n${missing.rationale}`,
    /合法|違法|法律意見|具有法律效力/u,
  );
});

test("cross-document contract conflict cites each exact immutable version", () => {
  const run = requiredFunction(contractModule, "runContractHealthcheck");
  const result = run(fixture("document-001.json"), CONTEXT);
  const conflict = result.find((finding) =>
    finding.code === "CONTRACT_CLAUSE_VALUE_CONFLICT"
  );
  assert.ok(conflict);
  assert.equal(conflict.classification, "conflict");
  assert.equal(conflict.citations.length, 2);
  assert.deepEqual(
    conflict.citations.map((citation) => ({
      kind: citation.kind,
      documentVersionId: citation.documentVersionId,
      documentSha256: citation.documentSha256,
      clause: citation.clause,
    })),
    [
      {
        kind: "contract_region",
        documentVersionId: "44444444-4040-4040-8040-404040404040",
        documentSha256: "d".repeat(64),
        clause: "保固期間",
      },
      {
        kind: "contract_region",
        documentVersionId: "55555555-5050-4050-8050-505050505050",
        documentSha256: "e".repeat(64),
        clause: "保固期間",
      },
    ],
  );
});

test("healthcheck outputs are byte-order deterministic for identical inputs", () => {
  const quote = requiredFunction(quoteModule, "runQuoteHealthcheck");
  const drawing = requiredFunction(drawingModule, "runDrawingHealthcheck");
  const contract = requiredFunction(contractModule, "runContractHealthcheck");
  for (const [run, name] of [
    [quote, "quote-001.json"],
    [drawing, "drawing-001.json"],
    [contract, "document-001.json"],
  ]) {
    const input = fixture(name);
    assert.equal(
      JSON.stringify(run(input, CONTEXT)),
      JSON.stringify(run(input, CONTEXT)),
    );
  }
});
