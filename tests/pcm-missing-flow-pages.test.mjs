import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { access, readFile, readdir } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

const repositoryRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const pcmRoot = path.join(
  repositoryRoot,
  "src",
  "stitch_laibe_landing_onboarding",
  "pcm_standalone",
);
const manifestPath = path.join(
  repositoryRoot,
  "docs",
  "governance",
  "pcm-missing-flow-pages-manifest.v1.json",
);

const pageContracts = Object.freeze({
  account_service_status: {
    role: "帳號申請人",
    phrases: ["帳號服務準備中", "不會顯示任何案件資料"],
    safeDestination: "../public_home/code.html",
  },
  access_unavailable: {
    role: "入口使用者",
    phrases: ["無法確認你的存取權限", "安全返回"],
    safeDestination: "../public_home/code.html",
  },
  document_corrections: {
    role: "甲方",
    phrases: ["文件修正清單", "PDF 格式", "檔案大小", "頁數", "可讀性"],
    safeDestination: "../owner_start/code.html",
  },
  self_service_archive: {
    role: "甲方",
    phrases: ["自行保留文件", "基本報告", "只讀封存"],
    safeDestination: "../public_home/code.html",
  },
  contract_prerequisites: {
    role: "甲方與受邀乙方",
    phrases: ["契約前提尚未齊備", "文件缺件", "單一版本", "雙方身分", "寫入準備"],
    safeDestination: "../service_contract/code.html",
  },
  case_closeout: {
    role: "案件三方",
    phrases: ["案件結案摘要", "三方確認狀態", "最近紀錄", "只讀封存"],
    safeDestination: "../public_home/code.html",
  },
});

const expectedWriteSet = Object.freeze([
  "src/stitch_laibe_landing_onboarding/pcm_standalone/account_service_status/code.html",
  "src/stitch_laibe_landing_onboarding/pcm_standalone/account_service_status/styles.css",
  "src/stitch_laibe_landing_onboarding/pcm_standalone/account_service_status/app.js",
  "src/stitch_laibe_landing_onboarding/pcm_standalone/access_unavailable/code.html",
  "src/stitch_laibe_landing_onboarding/pcm_standalone/access_unavailable/styles.css",
  "src/stitch_laibe_landing_onboarding/pcm_standalone/access_unavailable/app.js",
  "src/stitch_laibe_landing_onboarding/pcm_standalone/document_corrections/code.html",
  "src/stitch_laibe_landing_onboarding/pcm_standalone/document_corrections/styles.css",
  "src/stitch_laibe_landing_onboarding/pcm_standalone/document_corrections/app.js",
  "src/stitch_laibe_landing_onboarding/pcm_standalone/self_service_archive/code.html",
  "src/stitch_laibe_landing_onboarding/pcm_standalone/self_service_archive/styles.css",
  "src/stitch_laibe_landing_onboarding/pcm_standalone/self_service_archive/app.js",
  "src/stitch_laibe_landing_onboarding/pcm_standalone/contract_prerequisites/code.html",
  "src/stitch_laibe_landing_onboarding/pcm_standalone/contract_prerequisites/styles.css",
  "src/stitch_laibe_landing_onboarding/pcm_standalone/contract_prerequisites/app.js",
  "src/stitch_laibe_landing_onboarding/pcm_standalone/case_closeout/code.html",
  "src/stitch_laibe_landing_onboarding/pcm_standalone/case_closeout/styles.css",
  "src/stitch_laibe_landing_onboarding/pcm_standalone/case_closeout/app.js",
  "tests/pcm-missing-flow-pages.test.mjs",
  "docs/superpowers/specs/2026-08-02-pcm-missing-flow-pages-design.md",
  "docs/superpowers/plans/2026-08-02-pcm-missing-flow-pages.md",
  "docs/governance/pcm-missing-flow-pages-manifest.v1.json",
]);

export function canonicalUtf8LfBytes(inputBytes) {
  const bytes = inputBytes instanceof Uint8Array
    ? inputBytes
    : new Uint8Array(inputBytes);
  const text = new TextDecoder("utf-8", {
    fatal: true,
    ignoreBOM: true,
  }).decode(bytes);
  return new TextEncoder().encode(text.replace(/\r\n/g, "\n"));
}

export function canonicalReceipt(inputBytes) {
  const bytes = canonicalUtf8LfBytes(inputBytes);
  const gitBlobSha1 = createHash("sha1")
    .update(`blob ${bytes.length}\0`)
    .update(bytes)
    .digest("hex");
  return Object.freeze({
    bytes: bytes.length,
    sha256: createHash("sha256").update(bytes).digest("hex"),
    gitBlobSha1,
  });
}

function pagePath(pageName, fileName) {
  return path.join(pcmRoot, pageName, fileName);
}

function moduleUrl(pageName) {
  return `${pathToFileURL(pagePath(pageName, "app.js")).href}?receipt-test`;
}

async function collectFiles(root) {
  const entries = await readdir(root, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(root, entry.name);
    if (entry.isDirectory()) {
      files.push(...await collectFiles(fullPath));
    } else if (/\.(?:html|css|js|mjs)$/iu.test(entry.name)) {
      files.push(fullPath);
    }
  }
  return files;
}

test("UTF8_LF canonical receipt treats LF and CRLF as the same content", () => {
  const lf = new TextEncoder().encode("甲方\n案件狀態\n");
  const crlf = new TextEncoder().encode("甲方\r\n案件狀態\r\n");
  assert.deepEqual(canonicalReceipt(lf), canonicalReceipt(crlf));
});

test("UTF8_LF canonical receipt preserves BOM as meaningful content", () => {
  const plain = new TextEncoder().encode("甲方\n");
  const withBom = Uint8Array.from([0xef, 0xbb, 0xbf, ...plain]);
  assert.notDeepEqual(canonicalReceipt(plain), canonicalReceipt(withBom));
  assert.equal(
    new TextDecoder("utf-8", { ignoreBOM: true })
      .decode(canonicalUtf8LfBytes(withBom)).charCodeAt(0),
    0xfeff,
  );
});

test("UTF8_LF canonical receipt preserves a lone carriage return", () => {
  const bytes = new TextEncoder().encode("甲方\r案件\r\n狀態");
  assert.equal(
    new TextDecoder().decode(canonicalUtf8LfBytes(bytes)),
    "甲方\r案件\n狀態",
  );
});

test("UTF8_LF canonical receipt rejects invalid UTF-8", () => {
  assert.throws(
    () => canonicalReceipt(Uint8Array.from([0xc3, 0x28])),
    TypeError,
  );
});

test("six missing-flow folders contain exactly the three source files", async () => {
  for (const pageName of Object.keys(pageContracts)) {
    const files = (await readdir(path.join(pcmRoot, pageName))).sort();
    assert.deepEqual(files, ["app.js", "code.html", "styles.css"], pageName);
  }
});

test("every page exposes the fixed first-screen state contract and its page-specific truth", async () => {
  for (const [pageName, contract] of Object.entries(pageContracts)) {
    const html = await readFile(pagePath(pageName, "code.html"), "utf8");
    assert.match(html, /<body[^>]+data-view-state="CONTEXT_UNAVAILABLE"/u, pageName);
    assert.match(html, new RegExp(`使用角色[\\s\\S]*${contract.role}`, "u"), pageName);
    for (const label of ["PCM 契約狀態", "案件狀態", "下一步責任人", "最近紀錄"]) {
      assert.match(html, new RegExp(label, "u"), `${pageName}: ${label}`);
    }
    for (const phrase of contract.phrases) {
      assert.match(html, new RegExp(phrase, "u"), `${pageName}: ${phrase}`);
    }
    assert.match(html, /尚未取得案件資料/u, pageName);
    assert.match(html, new RegExp(`href="${contract.safeDestination.replaceAll(".", "\\.")}`), pageName);
  }
});

test("unknown context has zero payload and zero enabled write action", async () => {
  for (const pageName of Object.keys(pageContracts)) {
    const [html, runtime] = await Promise.all([
      readFile(pagePath(pageName, "code.html"), "utf8"),
      import(moduleUrl(pageName)),
    ]);
    assert.deepEqual(runtime.INITIAL_VIEW_STATE, {
      state: "CONTEXT_UNAVAILABLE",
      payload: null,
      writeActionsEnabled: false,
    }, pageName);
    assert.equal(Object.isFrozen(runtime.INITIAL_VIEW_STATE), true, pageName);
    assert.doesNotMatch(html, /\bcase[-_][a-z0-9]+\b|\bNT\$|\d{4}[-/]\d{1,2}[-/]\d{1,2}/iu, pageName);
    for (const match of html.matchAll(/<button\b[^>]*data-write-action[^>]*>/giu)) {
      assert.match(match[0], /\bdisabled\b/iu, pageName);
      assert.match(match[0], /aria-disabled="true"/iu, pageName);
    }
    assert.doesNotMatch(
      await readFile(pagePath(pageName, "app.js"), "utf8"),
      /localStorage|sessionStorage|location\.search|URLSearchParams|innerHTML|insertAdjacentHTML/iu,
      pageName,
    );
  }
});

test("contract prerequisite signing remains unavailable", async () => {
  const html = await readFile(pagePath("contract_prerequisites", "code.html"), "utf8");
  assert.match(html, /data-write-action[^>]*disabled[^>]*aria-disabled="true"/u);
  assert.match(html, />目前不能簽署</u);
  assert.doesNotMatch(html, />開始簽署</u);
});

test("document correction page describes requirements without claiming an upload event", async () => {
  const html = await readFile(pagePath("document_corrections", "code.html"), "utf8");
  assert.doesNotMatch(html, /已上傳|已重傳|上傳成功|重傳成功/u);
});

test("new pages use local sources, resolvable references and accessible responsive states", async () => {
  for (const pageName of Object.keys(pageContracts)) {
    const [html, css] = await Promise.all([
      readFile(pagePath(pageName, "code.html"), "utf8"),
      readFile(pagePath(pageName, "styles.css"), "utf8"),
    ]);
    assert.match(html, /href="\.\/styles\.css"/u, pageName);
    assert.match(html, /type="module"\s+src="\.\/app\.js"/u, pageName);
    assert.doesNotMatch(html, /href=["']#["']|javascript:|https?:\/\//iu, pageName);
    assert.doesNotMatch(html, /\bDB\b|\bAPI\b|mock-only|source clean|debug|GitHub truth|localStorage/iu, pageName);
    assert.match(css, /overflow-x:\s*hidden/iu, pageName);
    assert.match(css, /min-height:\s*44px/iu, pageName);
    assert.match(css, /:focus-visible/iu, pageName);
    assert.match(css, /@media\s*\(max-width:\s*900px\)/iu, pageName);
    assert.match(css, /@media\s*\(max-width:\s*560px\)/iu, pageName);
    assert.match(css, /prefers-reduced-motion/iu, pageName);

    const ids = new Set(
      [...html.matchAll(/\bid=["']([^"']+)["']/giu)].map((match) => match[1]),
    );
    const references = [...html.matchAll(/\b(?:href|src)=["']([^"']+)["']/giu)]
      .map((match) => match[1]);
    for (const reference of references) {
      if (reference.startsWith("#")) {
        assert.ok(ids.has(reference.slice(1)), `${pageName}: ${reference}`);
        continue;
      }
      const localPath = reference.split(/[?#]/u, 1)[0];
      await access(path.resolve(path.join(pcmRoot, pageName), localPath));
    }
  }
});

test("complete PCM source remains free of marketplace vocabulary", async () => {
  const forbidden = /招標|投標|競標|決標|得標|標案|標書|標價|邀標|發包/u;
  for (const filePath of await collectFiles(pcmRoot)) {
    assert.doesNotMatch(
      await readFile(filePath, "utf8"),
      forbidden,
      path.relative(repositoryRoot, filePath),
    );
  }
});

test("manifest closes the exact 22 paths with UTF8_LF canonical receipts", async () => {
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  assert.deepEqual(manifest.writeSet, expectedWriteSet);
  assert.deepEqual(manifest.receiptConvention, {
    id: "UTF8_LF",
    decoder: "TextDecoder('utf-8',{fatal:true,ignoreBOM:true})",
    newlineNormalization: "CRLF_TO_LF_LONE_CR_PRESERVED",
    bom: "PRESERVED",
    hashes: ["SHA256", "GIT_BLOB_SHA1"],
  });
  assert.equal(manifest.artifactReceipts.length, expectedWriteSet.length - 1);
  assert.deepEqual(
    manifest.artifactReceipts.map(({ path: receiptPath }) => receiptPath),
    expectedWriteSet.slice(0, -1),
  );

  for (const receipt of manifest.artifactReceipts) {
    const bytes = await readFile(path.join(repositoryRoot, receipt.path));
    assert.deepEqual(canonicalReceipt(bytes), {
      bytes: receipt.bytes,
      sha256: receipt.sha256,
      gitBlobSha1: receipt.gitBlobSha1,
    }, receipt.path);
  }
});
