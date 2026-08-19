import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import test from "node:test";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const testDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(testDir, "..", "..");
const adapterPath = resolve(
  repoRoot,
  "src/lib/budget/quote-healthcheck/browser-adapter.js",
);
const intakePath = resolve(
  repoRoot,
  "src/lib/budget/quote-healthcheck/pdf/intake.ts",
);
const appPath = resolve(
  repoRoot,
  "src/stitch_laibe_landing_onboarding/pcm_standalone/quote_check/app.js",
);
const fixtureDir = resolve(
  testDir,
  "fixtures/quote-healthcheck-pdf",
);

const fixtureFile = (fixtureName, browserName = "報價.pdf") =>
  new File([readFileSync(resolve(fixtureDir, fixtureName))], browserName, {
    type: "application/pdf",
  });

const loadAdapter = async () => {
  assert.equal(
    existsSync(adapterPath),
    true,
    "production browser adapter is missing",
  );
  return import(`${pathToFileURL(adapterPath).href}?test=${crypto.randomUUID()}`);
};

test("Quote Check exposes a parser-only summary and never fabricates a formal report", async () => {
  const appSource = readFileSync(appPath, "utf8");

  assert.match(
    appSource,
    /from "\.\.\/\.\.\/\.\.\/lib\/budget\/quote-healthcheck\/browser-adapter\.js"/u,
  );
  assert.match(appSource, /inspectSelectedQuoteFile\(selection\.file\)/u);

  const adapter = await loadAdapter();
  assert.equal(adapter.QUOTE_BROWSER_RUNTIME_MODE, "LOCAL_PARSER_SUMMARY_ONLY");
  const result = await adapter.inspectQuotePdfFile(
    fixtureFile("readable-quote.pdf"),
  );

  assert.equal(result.status, "PARSER_READY");
  assert.deepEqual(result.summary, {
    pageCount: 1,
    itemCount: 2,
    lineCount: 2,
    readability: "可讀文字層",
    comparison: "本次未提供比較基準",
  });
  assert.equal(result.report, null);
  assert.deepEqual(result.limitations, []);
  assert.match(result.nextAction, /本頁不會建立正式報告或案件紀錄/u);
  assert.doesNotMatch(
    JSON.stringify(result),
    /documentVersionId|caseId|sha256/u,
  );
  for (const domainField of ["packet", "policy", "findings", "schema"]) {
    assert.equal(Object.hasOwn(result, domainField), false, domainField);
  }
  assert.doesNotMatch(JSON.stringify(result), /拆除工程|油漆工程|1200|8000/u);
  assert.doesNotMatch(
    readFileSync(adapterPath, "utf8"),
    /local-browser-session|local-browser-document/u,
  );
});

test("契約 PDF 會回傳條款初步整理（HOLD）摘要而非正式法務結論", async () => {
  const adapter = await loadAdapter();
  const result = await adapter.inspectContractPdfFile(fixtureFile("readable-quote.pdf"));

  assert.equal(result.status, "PARSER_READY");
  assert.equal(typeof result.summary?.pageCount, "number");
  assert.equal(typeof result.summary?.lineCount, "number");
  assert.ok(result.summary.pageCount >= 0);
  assert.equal(result.summary.readability, "可讀文字層");
  assert.deepEqual(result.summary.clauseDraft.length, 7);
  assert.deepEqual(
    result.summary.clauseDraft.map((item) => item.key).sort(),
    [
      "acceptance",
      "change",
      "liability",
      "payment",
      "priority",
      "schedule",
      "termination",
    ],
  );
  for (const clause of result.summary.clauseDraft) {
    assert.match(clause.status, /^初步整理：/u, clause.key);
  }
  assert.equal(result.report, null);
  assert.equal(result.limitations.length, 0);
  assert.match(result.nextAction, /回到原始契約逐條確認|請回到原始契約逐條確認/u);
  assert.equal(result.message.includes("正式法務"), false);
  assert.match(adapterPath, /browser-adapter\.js$/u);
});

test("契約 PDF 亦能 fail-closed：加密、互動內容、壓縮、掃描與損毀檔會回到明確 HOLD 理由", async () => {
  const adapter = await loadAdapter();
  const cases = [
    ["encrypted.pdf", "ENCRYPTED_PDF", /已加密/u],
    ["adversarial-action.pdf", "UNSUPPORTED_ACTIVE_CONTENT", /互動內容/u],
    ["filter-array.pdf", "UNSUPPORTED_COMPRESSED_CONTENT", /尚未支援的壓縮/u],
    ["scanned-image-only.pdf", "SCANNED_PDF", /掃描檔/u],
    ["corrupt.pdf", "CORRUPT_PDF", /無法安全讀取/u],
  ];

  for (const [fixtureName, status, visibleMessage] of cases) {
    const result = await adapter.inspectContractPdfFile(fixtureFile(fixtureName));
    assert.equal(result.status, status, fixtureName);
    assert.equal(result.summary, null, fixtureName);
    assert.equal(result.report, null, fixtureName);
    assert.match(`${result.title} ${result.message}`, visibleMessage, fixtureName);
  }
});

test("same-name browser Files are decided by bytes rather than filename", async () => {
  const adapter = await loadAdapter();
  const readable = await adapter.inspectQuotePdfFile(
    fixtureFile("readable-quote.pdf", "相同檔名.pdf"),
  );
  const corrupt = await adapter.inspectQuotePdfFile(
    fixtureFile("corrupt.pdf", "相同檔名.pdf"),
  );

  assert.equal(readable.status, "PARSER_READY");
  assert.equal(corrupt.status, "CORRUPT_PDF");
  assert.equal(corrupt.report, null);
});

test("encrypted corrupt active compressed and scanned PDFs fail closed with safe Traditional Chinese states", async () => {
  const adapter = await loadAdapter();
  const cases = [
    ["encrypted.pdf", "ENCRYPTED_PDF", /加密/u],
    ["corrupt.pdf", "CORRUPT_PDF", /無法安全讀取/u],
    ["adversarial-action.pdf", "UNSUPPORTED_ACTIVE_CONTENT", /互動內容/u],
    ["filter-array.pdf", "UNSUPPORTED_COMPRESSED_CONTENT", /壓縮格式/u],
    ["scanned-image-only.pdf", "SCANNED_PDF", /掃描檔/u],
  ];

  for (const [fixtureName, status, visibleMessage] of cases) {
    const result = await adapter.inspectQuotePdfFile(fixtureFile(fixtureName));
    assert.equal(result.status, status, fixtureName);
    assert.equal(result.summary, null, fixtureName);
    assert.equal(result.report, null, fixtureName);
    assert.match(`${result.title} ${result.message}`, visibleMessage, fixtureName);
    assert.doesNotMatch(JSON.stringify(result), /stack|exception|at file:|raw JSON/iu);
  }
});

test("active and encrypted PDFs stop before page and text parsing", async () => {
  const adapter = await loadAdapter();
  for (const fixtureName of ["adversarial-action.pdf", "encrypted.pdf"]) {
    let pageTextParserCalls = 0;
    const result = await adapter.inspectQuotePdfFile(
      fixtureFile(fixtureName),
      {
        onBeforePageTextParse() {
          pageTextParserCalls += 1;
          throw new Error("page/text parser must not run");
        },
      },
    );
    assert.equal(pageTextParserCalls, 0, fixtureName);
    assert.equal(result.report, null, fixtureName);
  }

  let readablePageTextParserCalls = 0;
  const readable = await adapter.inspectQuotePdfFile(
    fixtureFile("readable-quote.pdf"),
    {
      onBeforePageTextParse() {
        readablePageTextParserCalls += 1;
      },
    },
  );
  assert.equal(readablePageTextParserCalls, 1);
  assert.equal(readable.status, "PARSER_READY");
  assert.equal(readable.summary.itemCount, 2);
});

test("adapter output is a safe summary generated from the accepted intake and never leaks raw failures", async () => {
  const adapterSource = readFileSync(adapterPath, "utf8");
  const adapter = await loadAdapter();
  const hostile = Object.create(null);
  Object.defineProperty(hostile, "name", {
    get() {
      throw new Error("RAW_SECRET_FROM_HOST");
    },
  });

  const result = await adapter.inspectQuotePdfFile(hostile);

  assert.equal(result.status, "INVALID_FILE");
  assert.equal(result.summary, null);
  assert.equal(result.report, null);
  assert.doesNotMatch(JSON.stringify(result), /RAW_SECRET_FROM_HOST/u);
  assert.match(adapterSource, /BEGIN GENERATED INTAKE BUNDLE/u);
  assert.match(adapterSource, /inspectQuotePdfBytes/u);
  assert.doesNotMatch(adapterSource, /https?:\/\/|from\s+["'](?:npm:|jsr:)/u);
});

test("Blob size is checked against 10 MiB before any arrayBuffer read", async () => {
  const adapterSource = readFileSync(adapterPath, "utf8");
  const adapter = await loadAdapter();
  const tooLarge = new File(
    [new Uint8Array((10 * 1024 * 1024) + 1)],
    "過大報價.pdf",
    { type: "application/pdf" },
  );

  const result = await adapter.inspectQuotePdfFile(tooLarge);

  assert.equal(result.status, "FILE_TOO_LARGE");
  assert.equal(result.summary, null);
  assert.equal(result.report, null);
  assert.ok(
    adapterSource.indexOf("trustedBlobSizeGetter") <
      adapterSource.indexOf("trustedBlobArrayBuffer, file"),
    "trusted Blob.size must be evaluated before the captured arrayBuffer call",
  );
});

test("embedded parser bundle is deterministic and parser-only results match all 18 accepted fixtures", async () => {
  const envPermission = await Deno.permissions.query({ name: "env" });
  const runPermission = await Deno.permissions.query({ name: "run", command: "deno" });
  if (envPermission.state !== "granted" || runPermission.state !== "granted") {
    console.log("[skip] bundle drift test requires --allow-env and --allow-run=deno");
    return;
  }

  const adapterSource = readFileSync(adapterPath, "utf8");
  const generatedBundle = execFileSync(
    "deno",
    [
      "bundle",
      "--quiet",
      "--platform",
      "browser",
      "--no-config",
      "--no-lock",
      "--no-remote",
      intakePath,
    ],
    { cwd: repoRoot, encoding: "utf8" },
  );
  const startMarker = "// BEGIN GENERATED INTAKE BUNDLE\n";
  const endMarker = "// END GENERATED INTAKE BUNDLE\n";
  const start = adapterSource.indexOf(startMarker);
  const end = adapterSource.indexOf(endMarker);
  assert.notEqual(start, -1, "generated bundle start marker is missing");
  assert.notEqual(end, -1, "generated bundle end marker is missing");
  assert.equal(
    adapterSource.slice(start + startMarker.length, end),
    generatedBundle,
    "browser parser bundle drifted from accepted intake.ts",
  );
  const sourceDigest = createHash("sha256")
    .update(readFileSync(intakePath))
    .digest("hex");
  assert.match(adapterSource, new RegExp(`Accepted source SHA-256: ${sourceDigest}`, "u"));

  const adapter = await loadAdapter();
  const fixtureNames = readdirSync(fixtureDir)
    .filter((name) => name.endsWith(".pdf"))
    .sort();
  assert.equal(fixtureNames.length, 18);
  for (const fixtureName of fixtureNames) {
    const bytes = new Uint8Array(readFileSync(resolve(fixtureDir, fixtureName)));
    const digest = createHash("sha256").update(bytes).digest("hex");
    const accepted = await adapter.inspectQuotePdfBytes({
      bytes,
      document: {
        caseId: "fixture-parity-case",
        documentVersionId: `fixture-${digest.slice(0, 16)}`,
        sha256: digest,
      },
    });
    const parserOnly = await adapter.inspectQuotePdfFile(
      new File([bytes], fixtureName, { type: "application/pdf" }),
    );
    const expectedStatus = accepted.accepted
      ? accepted.inspection.readability === "IMAGE_ONLY"
        ? "SCANNED_PDF"
        : accepted.facts.rows.length > 0
          ? "PARSER_READY"
          : "UNSUPPORTED_LAYOUT"
      : accepted.rejection.code;
    assert.equal(parserOnly.status, expectedStatus, fixtureName);
    assert.equal(parserOnly.report, null, fixtureName);
    if (expectedStatus === "PARSER_READY") {
      assert.equal(parserOnly.summary.itemCount, accepted.facts.rows.length, fixtureName);
      assert.equal(parserOnly.summary.pageCount, accepted.inspection.pageCount, fixtureName);
    }
  }
});
