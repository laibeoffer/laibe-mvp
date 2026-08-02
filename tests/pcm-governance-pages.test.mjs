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
  const decoded = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(rawBytes);
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

test("canonical receipt policy preserves a UTF-8 BOM as distinct evidence", () => {
  const withoutBom = Buffer.from("a", "utf8");
  const withBom = Buffer.from([0xef, 0xbb, 0xbf, 0x61]);
  assert.notDeepEqual(canonicalUtf8LfReceipt(withBom), canonicalUtf8LfReceipt(withoutBom));
});

test("canonical receipt policy preserves a lone carriage return byte-for-byte", () => {
  const raw = Buffer.from("first\rsecond", "utf8");
  const direct = {
    bytes: raw.length,
    sha256: createHash("sha256").update(raw).digest("hex"),
    gitBlobSha1: createHash("sha1")
      .update(Buffer.from(`blob ${raw.length}\0`))
      .update(raw)
      .digest("hex"),
  };
  assert.deepEqual(canonicalUtf8LfReceipt(raw), direct);
});

test("canonical receipt policy fatally rejects invalid UTF-8", () => {
  assert.throws(
    () => canonicalUtf8LfReceipt(Buffer.from([0xc3, 0x28])),
    { name: "TypeError" },
  );
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
    assignment: { actorId: "admin-user", scope: "pcm_internal_governance", status: "active", mode: "active" },
    records: [{ id: "record-01", category: "帳號" }],
  });
  assert.equal(ready.state, "GOVERNANCE_READY");
  assert.ok(ready.enabledActions.includes("manage_access"));
  assert.ok(ready.enabledActions.includes("manual_assignment"));
  assert.ok(!ready.enabledActions.includes("confirm_pcm_decision"));
});

function authorizedContext(overrides = {}) {
  return {
    sessionStatus: "ready",
    actor: { id: "pcm-user", role: "pcm" },
    membership: { actorId: "pcm-user", status: "active", caseIds: ["case-01"] },
    contract: { caseId: "case-01", status: "active" },
    caseBinding: { caseId: "case-01", status: "bound" },
    authorizedCases: [{ id: "case-01", status: "文件檢討中", nextOwner: "Human PCM" }],
    ...overrides,
  };
}

function governanceContext(overrides = {}) {
  return {
    sessionStatus: "ready",
    actor: { id: "admin-user", role: "governance_admin" },
    assignment: {
      actorId: "admin-user",
      scope: "pcm_internal_governance",
      status: "active",
      mode: "active",
    },
    records: [{ id: "record-01", category: "帳號" }],
    ...overrides,
  };
}

function assertClosed(result, payloadKey, deniedState) {
  assert.equal(result.state, deniedState);
  assert.deepEqual(result[payloadKey], []);
  assert.deepEqual(result.enabledActions, []);
}

test("adversarial PCM identifiers and membership values always fail closed", async () => {
  const module = await import(pathToFileURL(path.join(root, paths.consoleJs)).href);
  const sharedObjectId = {};
  const mutations = [
    { actor: { role: "pcm" } },
    { actor: { id: "", role: "pcm" } },
    { actor: { id: {}, role: "pcm" } },
    { caseBinding: { status: "bound" } },
    { caseBinding: { caseId: "", status: "bound" } },
    {
      actor: { id: sharedObjectId, role: "pcm" },
      membership: { actorId: sharedObjectId, status: "active", caseIds: [sharedObjectId] },
      contract: { caseId: sharedObjectId, status: "active" },
      caseBinding: { caseId: sharedObjectId, status: "bound" },
      authorizedCases: [{ id: sharedObjectId, status: "文件檢討中" }],
    },
    { contract: { status: "active" } },
    { contract: { caseId: "", status: "active" } },
    { contract: { caseId: {}, status: "active" } },
    { membership: { actorId: "pcm-user", status: "active" } },
    { membership: { actorId: "pcm-user", status: "active", caseIds: [undefined] } },
    { membership: { actorId: "pcm-user", status: "active", caseIds: [""] } },
    { membership: { actorId: "pcm-user", status: "active", caseIds: [{}] } },
    { authorizedCases: [{ status: "文件檢討中" }] },
    { authorizedCases: [{ id: "", status: "文件檢討中" }] },
    { authorizedCases: [{ id: {}, status: "文件檢討中" }] },
  ];

  for (const mutation of mutations) {
    assertClosed(
      module.resolvePcmAuthorizedConsoleState(authorizedContext(mutation)),
      "casePayload",
      "ACCESS_DENIED",
    );
  }
});

test("adversarial PCM row cardinality and unknown status cannot become ready", async () => {
  const module = await import(pathToFileURL(path.join(root, paths.consoleJs)).href);
  const empty = module.resolvePcmAuthorizedConsoleState(authorizedContext({ authorizedCases: [] }));
  assert.equal(empty.state, "AUTHORIZED_EMPTY");
  assert.deepEqual(empty.casePayload, []);
  assert.deepEqual(empty.enabledActions, []);

  const duplicate = module.resolvePcmAuthorizedConsoleState(authorizedContext({
    authorizedCases: [
      { id: "case-01", status: "文件檢討中", nextOwner: "Human PCM" },
      { id: "case-01", status: "文件檢討中", nextOwner: "Human PCM" },
    ],
  }));
  assertClosed(duplicate, "casePayload", "ACCESS_DENIED");

  for (const status of ["ATTACKER", "toString", "__proto__"]) {
    let unknown;
    assert.doesNotThrow(() => {
      unknown = module.resolvePcmAuthorizedConsoleState(authorizedContext({
        authorizedCases: [{ id: "case-01", status, nextOwner: "Human PCM" }],
      }));
    });
    assertClosed(unknown, "casePayload", "ACCESS_DENIED");
  }

  assert.equal(
    module.resolvePcmAuthorizedConsoleState(authorizedContext()).state,
    "AUTHORIZED_READY",
  );
  const archived = module.resolvePcmAuthorizedConsoleState(authorizedContext({
    authorizedCases: [{ id: "case-01", status: "已封存", nextOwner: "Human PCM" }],
  }));
  assert.equal(archived.state, "CASE_ARCHIVED_READ_ONLY");
  assert.deepEqual(archived.enabledActions, []);
});

test("adversarial governance identifiers and modes fail closed before record branching", async () => {
  const module = await import(pathToFileURL(path.join(root, paths.governanceJs)).href);
  const sharedObjectId = {};
  const mutations = [
    { actor: { role: "governance_admin" } },
    { actor: { id: "", role: "governance_admin" } },
    { actor: { id: {}, role: "governance_admin" } },
    {
      actor: { id: sharedObjectId, role: "governance_admin" },
      assignment: {
        actorId: sharedObjectId,
        scope: "pcm_internal_governance",
        status: "active",
        mode: "active",
      },
    },
    { assignment: { actorId: "admin-user", scope: "pcm_internal_governance", status: "active" } },
    {
      assignment: {
        actorId: "admin-user",
        scope: "pcm_internal_governance",
        status: "active",
        mode: "ATTACKER",
      },
    },
  ];
  for (const mutation of mutations) {
    for (const records of [[], [{ id: "record-01", category: "帳號" }]]) {
      assertClosed(
        module.resolveInternalGovernanceState(governanceContext({ ...mutation, records })),
        "governancePayload",
        "GOVERNANCE_DENIED",
      );
    }
  }
});

test("governance active and read-only modes keep actions closed by explicit state", async () => {
  const module = await import(pathToFileURL(path.join(root, paths.governanceJs)).href);
  const activeEmpty = module.resolveInternalGovernanceState(governanceContext({ records: [] }));
  assert.equal(activeEmpty.state, "GOVERNANCE_EMPTY");
  assert.deepEqual(activeEmpty.governancePayload, []);
  assert.deepEqual(activeEmpty.enabledActions, ["manage_access", "manual_assignment"]);

  for (const records of [[], [{ id: "record-01", category: "帳號" }]]) {
    const readOnly = module.resolveInternalGovernanceState(governanceContext({
      assignment: {
        actorId: "admin-user",
        scope: "pcm_internal_governance",
        status: "active",
        mode: "read_only",
      },
      records,
    }));
    assert.equal(readOnly.state, "GOVERNANCE_READ_ONLY");
    assert.deepEqual(readOnly.enabledActions, []);
  }
});

test("own-data authority rejects sparse arrays, inherited fields, accessors, and malformed rows", async () => {
  const consoleModule = await import(pathToFileURL(path.join(root, paths.consoleJs)).href);
  const governanceModule = await import(pathToFileURL(path.join(root, paths.governanceJs)).href);

  const sparseMembership = new Array(2);
  sparseMembership[1] = "case-01";
  const sparseCases = new Array(2);
  sparseCases[1] = { id: "case-01", status: "文件檢討中", nextOwner: "Human PCM" };
  const sparseRecords = new Array(2);
  sparseRecords[1] = { id: "record-01", category: "帳號" };

  const inheritedActor = Object.create({ id: "pcm-user", role: "pcm" });
  const inheritedCase = Object.create({
    id: "case-01",
    status: "文件檢討中",
    nextOwner: "Human PCM",
  });
  const inheritedRecord = Object.create({ id: "record-01", category: "帳號" });

  let accessorReadCount = 0;
  const accessorActor = { role: "pcm" };
  Object.defineProperty(accessorActor, "id", {
    enumerable: true,
    get() {
      accessorReadCount += 1;
      throw new Error("authority accessor must not execute");
    },
  });
  const revokedMembership = Proxy.revocable([], {});
  revokedMembership.revoke();
  const revokedRecords = Proxy.revocable([], {});
  revokedRecords.revoke();

  const pcmInputs = [
    authorizedContext({ membership: { actorId: "pcm-user", status: "active", caseIds: sparseMembership } }),
    authorizedContext({ authorizedCases: sparseCases }),
    authorizedContext({ actor: inheritedActor }),
    authorizedContext({ authorizedCases: [inheritedCase] }),
    authorizedContext({ actor: accessorActor }),
    authorizedContext({
      membership: { actorId: "pcm-user", status: "active", caseIds: revokedMembership.proxy },
    }),
  ];
  for (const input of pcmInputs) {
    let result;
    assert.doesNotThrow(() => {
      result = consoleModule.resolvePcmAuthorizedConsoleState(input);
    });
    assertClosed(result, "casePayload", "ACCESS_DENIED");
  }

  const governanceInputs = [
    governanceContext({ records: sparseRecords }),
    governanceContext({ records: [null] }),
    governanceContext({ records: [inheritedRecord] }),
    governanceContext({ records: revokedRecords.proxy }),
  ];
  for (const input of governanceInputs) {
    let result;
    assert.doesNotThrow(() => {
      result = governanceModule.resolveInternalGovernanceState(input);
    });
    assertClosed(result, "governancePayload", "GOVERNANCE_DENIED");
  }
  assert.equal(accessorReadCount, 0);
});

test("authority evaluation is independent from post-load Array, Set, and iterator hooks", async () => {
  const consoleModule = await import(pathToFileURL(path.join(root, paths.consoleJs)).href);
  const governanceModule = await import(pathToFileURL(path.join(root, paths.governanceJs)).href);
  const pcmReadyInput = authorizedContext();
  const pcmSparseInput = authorizedContext({ authorizedCases: new Array(1) });
  const governanceReadyInput = governanceContext();
  const governanceReadOnlyInput = governanceContext({
    assignment: {
      actorId: "admin-user",
      scope: "pcm_internal_governance",
      status: "active",
      mode: "read_only",
    },
    records: [],
  });
  const governanceEvilInput = governanceContext({
    assignment: {
      actorId: "admin-user",
      scope: "pcm_internal_governance",
      status: "active",
      mode: "evil",
    },
    records: [],
  });

  const originals = {
    every: Array.prototype.every,
    filter: Array.prototype.filter,
    map: Array.prototype.map,
    includes: Array.prototype.includes,
    iterator: Array.prototype[Symbol.iterator],
    setHas: Set.prototype.has,
  };
  let authorityHookReads = 0;
  let results;
  try {
    for (const name of ["every", "filter", "map", "includes"]) {
      Array.prototype[name] = function (...args) {
        authorityHookReads += 1;
        return Reflect.apply(originals[name], this, args);
      };
    }
    Array.prototype[Symbol.iterator] = function (...args) {
      authorityHookReads += 1;
      return Reflect.apply(originals.iterator, this, args);
    };
    Set.prototype.has = function () {
      authorityHookReads += 1;
      return true;
    };

    results = {
      pcmReady: consoleModule.resolvePcmAuthorizedConsoleState(pcmReadyInput),
      pcmSparse: consoleModule.resolvePcmAuthorizedConsoleState(pcmSparseInput),
      governanceReady: governanceModule.resolveInternalGovernanceState(governanceReadyInput),
      governanceReadOnly: governanceModule.resolveInternalGovernanceState(governanceReadOnlyInput),
      governanceEvil: governanceModule.resolveInternalGovernanceState(governanceEvilInput),
    };
  } finally {
    Array.prototype.every = originals.every;
    Array.prototype.filter = originals.filter;
    Array.prototype.map = originals.map;
    Array.prototype.includes = originals.includes;
    Array.prototype[Symbol.iterator] = originals.iterator;
    Set.prototype.has = originals.setHas;
  }

  assert.equal(authorityHookReads, 0);
  assert.equal(results.pcmReady.state, "AUTHORIZED_READY");
  assertClosed(results.pcmSparse, "casePayload", "ACCESS_DENIED");
  assert.equal(results.governanceReady.state, "GOVERNANCE_READY");
  assert.equal(results.governanceReadOnly.state, "GOVERNANCE_READ_ONLY");
  assert.deepEqual(results.governanceReadOnly.enabledActions, []);
  assertClosed(results.governanceEvil, "governancePayload", "GOVERNANCE_DENIED");
});

function fakeRenderDocument(shellSelector, datasetKey) {
  const title = { textContent: "尚未取得授權" };
  const detail = { textContent: "目前未授權。" };
  const shell = { hidden: true };
  return {
    nodes: { title, detail, shell },
    document: {
      querySelector(selector) {
        if (selector === "[data-state-title]") return title;
        if (selector === "[data-state-detail]") return detail;
        if (selector === shellSelector) return shell;
        return null;
      },
      documentElement: { dataset: { [datasetKey]: "" } },
    },
  };
}

test("authorized and archived renderers replace denied copy whenever the shell is visible", async () => {
  const module = await import(pathToFileURL(path.join(root, paths.consoleJs)).href);
  const expected = [
    ["AUTHORIZED_READY", "案件授權已確認", "可依案件目前狀態開始文件檢討並留下判斷依據。"],
    ["CASE_ARCHIVED_READ_ONLY", "案件已封存，限調閱", "可調閱既有文件與案件紀錄，目前不提供新的處理動作。"],
  ];
  try {
    for (const [state, titleCopy, detailCopy] of expected) {
      const fake = fakeRenderDocument("[data-authorized-shell]", "consoleState");
      globalThis.document = fake.document;
      module.renderPcmAuthorizedConsole({ state });
      assert.equal(fake.nodes.shell.hidden, false);
      assert.equal(fake.nodes.title.textContent, titleCopy);
      assert.equal(fake.nodes.detail.textContent, detailCopy);
      assert.doesNotMatch(`${titleCopy} ${detailCopy}`, /未授權|尚未取得/);
    }
  } finally {
    delete globalThis.document;
  }
});

test("governance ready and read-only renderers replace denied copy whenever the shell is visible", async () => {
  const module = await import(pathToFileURL(path.join(root, paths.governanceJs)).href);
  const expected = [
    ["GOVERNANCE_READY", "內部治理權限已確認", "可依責任範圍管理帳號、人工指派與異動原因。"],
    ["GOVERNANCE_READ_ONLY", "內部治理為唯讀", "可調閱既有治理紀錄，目前不提供異動操作。"],
  ];
  try {
    for (const [state, titleCopy, detailCopy] of expected) {
      const fake = fakeRenderDocument("[data-governance-shell]", "governanceState");
      globalThis.document = fake.document;
      module.renderInternalGovernance({ state });
      assert.equal(fake.nodes.shell.hidden, false);
      assert.equal(fake.nodes.title.textContent, titleCopy);
      assert.equal(fake.nodes.detail.textContent, detailCopy);
      assert.doesNotMatch(`${titleCopy} ${detailCopy}`, /未授權|尚未取得/);
    }
  } finally {
    delete globalThis.document;
  }
});
