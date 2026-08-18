import assert from "node:assert/strict";
import { File } from "node:buffer";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const testDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(testDir, "..", "..");
const adapterPath = resolve(
  repoRoot,
  "src/lib/budget/quote-healthcheck/browser-adapter.js",
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

test("Quote Check wires genuine browser File bytes into the accepted PDF intake", async () => {
  const appSource = readFileSync(appPath, "utf8");

  assert.match(
    appSource,
    /from "\.\.\/\.\.\/\.\.\/lib\/budget\/quote-healthcheck\/browser-adapter\.js"/u,
  );
  assert.match(appSource, /inspectQuotePdfFile\(/u);

  const adapter = await loadAdapter();
  const result = await adapter.inspectQuotePdfFile(
    fixtureFile("readable-quote.pdf"),
  );

  assert.equal(result.status, "READY");
  assert.deepEqual(result.report, {
    pageCount: 1,
    itemCount: 2,
    readability: "可讀文字層",
    comparison: "本次未提供比較基準",
  });
  assert.deepEqual(result.limitations, []);
  assert.doesNotMatch(JSON.stringify(result), /拆除工程|油漆工程|1200|8000/u);
});

test("same-name browser Files are decided by bytes rather than filename", async () => {
  const adapter = await loadAdapter();
  const readable = await adapter.inspectQuotePdfFile(
    fixtureFile("readable-quote.pdf", "相同檔名.pdf"),
  );
  const corrupt = await adapter.inspectQuotePdfFile(
    fixtureFile("corrupt.pdf", "相同檔名.pdf"),
  );

  assert.equal(readable.status, "READY");
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
    assert.equal(result.report, null, fixtureName);
    assert.match(`${result.title} ${result.message}`, visibleMessage, fixtureName);
    assert.doesNotMatch(JSON.stringify(result), /stack|exception|at file:|raw JSON/iu);
  }
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
  assert.equal(result.report, null);
  assert.doesNotMatch(JSON.stringify(result), /RAW_SECRET_FROM_HOST/u);
  assert.match(
    adapterSource,
    /Generated from \.\/pdf\/intake\.ts/u,
  );
  assert.match(adapterSource, /inspectQuotePdfBytes/u);
  assert.doesNotMatch(adapterSource, /https?:\/\/|from\s+["'](?:npm:|jsr:)/u);
});
