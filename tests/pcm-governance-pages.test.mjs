import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import { pathToFileURL } from "node:url";
import test from "node:test";

const root = path.resolve(import.meta.dirname, "..");
const seedCommit = "0b0037ff50a4dc5b1756fe3230588f12a01c5337";
const seedTree = "57bb0dc3775af085810a60a6719c5fa898e98a8d";

const paths = {
  consoleHtml: "src/stitch_laibe_landing_onboarding/pcm_standalone/pcm_authorized_console/code.html",
  consoleCss: "src/stitch_laibe_landing_onboarding/pcm_standalone/pcm_authorized_console/styles.css",
  consoleJs: "src/stitch_laibe_landing_onboarding/pcm_standalone/pcm_authorized_console/app.js",
  governanceHtml: "src/stitch_laibe_landing_onboarding/pcm_standalone/internal_governance/code.html",
  governanceCss: "src/stitch_laibe_landing_onboarding/pcm_standalone/internal_governance/styles.css",
  governanceJs: "src/stitch_laibe_landing_onboarding/pcm_standalone/internal_governance/app.js",
  test: "tests/pcm-governance-pages.test.mjs",
  spec: "docs/superpowers/specs/2026-08-02-pcm-governance-pages-design.md",
  plan: "docs/superpowers/plans/2026-08-02-pcm-governance-pages.md",
  manifest: "docs/governance/pcm-governance-pages-manifest.v1.json",
};

const expectedWriteSet = Object.values(paths);
const artifactPaths = expectedWriteSet.filter((entry) => entry !== paths.manifest);

async function text(relativePath) {
  return readFile(path.join(root, relativePath), "utf8");
}

function visibleCopy(html) {
  return html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function canonicalUtf8LfReceipt(rawBytes) {
  const decoded = new TextDecoder("utf-8", { fatal: true }).decode(rawBytes);
  const bytes = Buffer.from(new TextEncoder().encode(decoded.replace(/\r\n/g, "\n")));
  return {
    bytes: bytes.length,
    sha256: createHash("sha256").update(bytes).digest("hex"),
    gitBlobSha1: createHash("sha1")
      .update(Buffer.from(`blob ${bytes.length}\0`))
      .update(bytes)
      .digest("hex"),
  };
}

test("canonical receipt policy treats in-memory LF and CRLF UTF-8 as identical", () => {
  const lf = Buffer.from("第一行\nsecond line\n", "utf8");
  const crlf = Buffer.from("第一行\r\nsecond line\r\n", "utf8");
  assert.deepEqual(canonicalUtf8LfReceipt(crlf), canonicalUtf8LfReceipt(lf));
});

test("the package is limited to the exact ten approved new paths", async () => {
  for (const relativePath of expectedWriteSet) {
    assert.equal((await stat(path.join(root, relativePath))).isFile(), true, relativePath);
  }

  const manifest = JSON.parse(await text(paths.manifest));
  assert.deepEqual(manifest.writeSet, expectedWriteSet);
  assert.equal(manifest.artifactReceiptPolicy, "UTF8_LF_CANONICAL_BYTES_GIT_BLOB_SHA1_V1");
  assert.equal(manifest.baseline.commit, seedCommit);
  assert.equal(manifest.baseline.tree, seedTree);
  assert.equal(manifest.artifactReceipts.length, 9);
  assert.deepEqual(manifest.artifactReceipts.map(({ path: receiptPath }) => receiptPath), artifactPaths);

  for (const receipt of manifest.artifactReceipts) {
    const canonical = canonicalUtf8LfReceipt(await readFile(path.join(root, receipt.path)));
    assert.equal(receipt.bytes, canonical.bytes, `${receipt.path} canonical byte count`);
    assert.equal(receipt.sha256, canonical.sha256, `${receipt.path} canonical SHA-256`);
    assert.equal(receipt.gitBlobSha1, canonical.gitBlobSha1, `${receipt.path} canonical Git blob SHA-1`);
  }
});

test("authorized console exposes the complete PCM decision workflow without enabled default actions", async () => {
  const html = await text(paths.consoleHtml);
  const css = await text(paths.consoleCss);
  const visible = visibleCopy(html);

  assert.match(html, /<html[^>]+lang="zh-Hant"/);
  assert.match(html, /\.\.\/\.\.\/\.\.\/\.\.\/assets\/logo\/laibe_offer\.svg/);
  assert.match(html, /<link[^>]+href="\.\/styles\.css"/);
  assert.match(html, /<script[^>]+type="module"[^>]+src="\.\/app\.js"/);

  for (const fact of ["角色", "契約狀態", "案件狀態", "下一步責任人", "最近紀錄"]) {
    assert.match(visible, new RegExp(fact));
  }
  for (const sectionId of [
    "authorized-cases",
    "case-workbench",
    "document-integrity",
    "risk-comparison",
    "supplement-request",
    "written-review",
    "milestone-governance",
    "communication-replies",
    "case-records",
  ]) {
    assert.match(html, new RegExp(`id="${sectionId}"`));
  }

  const buttons = [...html.matchAll(/<button\b([^>]*)>/g)];
  assert.ok(buttons.length > 0);
  assert.ok(buttons.every(([, attributes]) => /\bdisabled\b/.test(attributes)), "all default controls must fail closed");
  assert.match(html, /data-authorized-shell[^>]+hidden/);
  assert.match(css, /min-height:\s*44px/);
  assert.match(css, /:focus-visible/);
  assert.match(css, /overflow-x:\s*(?:hidden|clip)/);
  assert.match(css, /@media\s*\(max-width:\s*900px\)/);
  assert.match(css, /@media\s*\(max-width:\s*620px\)/);
});

test("internal governance keeps administrative authority separate from Human PCM decisions", async () => {
  const html = await text(paths.governanceHtml);
  const visible = visibleCopy(html);

  for (const sectionId of ["accounts", "case-members", "role-permissions", "contract-governance", "access-change-records"]) {
    assert.match(html, new RegExp(`id="${sectionId}"`));
  }
  assert.match(visible, /管理者[^。]*不得取代 Human PCM/);
  assert.match(visible, /人工指派/);
  assert.match(visible, /不依專業分科/);
  assert.doesNotMatch(visible, /自動分流|專長標籤|依工種媒合/);
  assert.match(html, /data-governance-shell[^>]+hidden/);

  const buttons = [...html.matchAll(/<button\b([^>]*)>/g)];
  assert.ok(buttons.length > 0);
  assert.ok(buttons.every(([, attributes]) => /\bdisabled\b/.test(attributes)), "all default controls must fail closed");
});

test("visible product language contains no marketplace, escrow, or engineering vocabulary", async () => {
  const visible = `${visibleCopy(await text(paths.consoleHtml))} ${visibleCopy(await text(paths.governanceHtml))}`;
  const forbidden = [
    /marketplace/i,
    /sourceDocumentVersionId/i,
    /machine_candidate/i,
    /case_event/i,
    /raw JSON/i,
    /stack trace/i,
    /debug/i,
    /mock-only/i,
    /媒合平台/,
    /低價競標/,
    /金流託管/,
    /支付託管/,
    /代收代付/,
    /老屋煉金術/,
    /AI[^。；，]*最終決定/,
  ];
  for (const expression of forbidden) assert.doesNotMatch(visible, expression);
});

test("authorized console state resolver defaults to zero payload and enables data only after complete authorization", async () => {
  const module = await import(pathToFileURL(path.join(root, paths.consoleJs)).href);
  const denied = module.resolvePcmAuthorizedConsoleState();
  assert.equal(denied.state, "ACCESS_DENIED");
  assert.deepEqual(denied.casePayload, []);
  assert.deepEqual(denied.enabledActions, []);

  const ready = module.resolvePcmAuthorizedConsoleState({
    sessionStatus: "ready",
    actor: { id: "pcm-user", role: "pcm" },
    membership: { actorId: "pcm-user", status: "active", caseIds: ["case-01"] },
    contract: { caseId: "case-01", status: "active", versionLabel: "契約第 2 版" },
    caseBinding: { caseId: "case-01", status: "bound" },
    authorizedCases: [{ id: "case-01", status: "文件檢討中", nextOwner: "Human PCM" }],
  });
  assert.equal(ready.state, "AUTHORIZED_READY");
  assert.equal(ready.casePayload.length, 1);
  assert.ok(ready.enabledActions.length > 0);

  const mismatched = module.resolvePcmAuthorizedConsoleState({
    sessionStatus: "ready",
    actor: { id: "pcm-user", role: "pcm" },
    membership: { actorId: "another-user", status: "active", caseIds: ["case-01"] },
    contract: { caseId: "case-01", status: "active" },
    caseBinding: { caseId: "case-01", status: "bound" },
    authorizedCases: [{ id: "case-01" }],
  });
  assert.equal(mismatched.state, "ACCESS_DENIED");
  assert.deepEqual(mismatched.casePayload, []);
});

test("governance resolver defaults to zero payload and never grants PCM decision authority", async () => {
  const module = await import(pathToFileURL(path.join(root, paths.governanceJs)).href);
  const denied = module.resolveInternalGovernanceState();
  assert.equal(denied.state, "GOVERNANCE_DENIED");
  assert.deepEqual(denied.governancePayload, []);
  assert.deepEqual(denied.enabledActions, []);

  const ready = module.resolveInternalGovernanceState({
    sessionStatus: "ready",
    actor: { id: "admin-user", role: "governance_admin" },
    assignment: { actorId: "admin-user", scope: "pcm_internal_governance", status: "active" },
    records: [{ id: "record-01", category: "帳號" }],
  });
  assert.equal(ready.state, "GOVERNANCE_READY");
  assert.ok(ready.enabledActions.includes("manage_access"));
  assert.ok(ready.enabledActions.includes("manual_assignment"));
  assert.ok(!ready.enabledActions.includes("confirm_pcm_decision"));
});
