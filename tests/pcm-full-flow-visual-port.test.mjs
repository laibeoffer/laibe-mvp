import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { access, readFile, readdir } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

const repositoryRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const sourceRoot = path.join(
  repositoryRoot,
  "src",
  "stitch_laibe_landing_onboarding",
);
const pcmRoot = path.join(sourceRoot, "pcm_standalone");
const VISUAL_PORT_EVIDENCE_COMMIT = "7c033382164e8f29218bf6ffb4afd3c953e88da6";

const targets = Object.freeze({
  service: path.join(pcmRoot, "service_contract"),
  owner: path.join(sourceRoot, "client_awarding_dashboard"),
  vendor: path.join(pcmRoot, "vendor_workspace"),
  signing: path.join(pcmRoot, "contract_signing"),
});

function readTarget(target, fileName) {
  return readFile(path.join(targets[target], fileName), "utf8");
}

function moduleUrl(target) {
  return pathToFileURL(path.join(targets[target], "app.js")).href;
}

function count(source, pattern) {
  return source.match(pattern)?.length ?? 0;
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

async function collectPageAssets(root) {
  const entries = await readdir(root, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(root, entry.name);
    if (entry.isDirectory()) {
      files.push(...await collectPageAssets(fullPath));
    } else if (/\.(?:html|css|js|mjs)$/i.test(entry.name)) {
      files.push(fullPath);
    }
  }
  return files;
}

test("four canonical PCM visual-port pages exist with local CSS and module runtime", async () => {
  for (const target of Object.keys(targets)) {
    await access(path.join(targets[target], "code.html"));
    await access(path.join(targets[target], "styles.css"));
    await access(path.join(targets[target], "app.js"));
    const html = await readTarget(target, "code.html");
    assert.match(html, /href="\.\/styles\.css"/, target);
    assert.match(html, /type="module"\s+src="\.\/app\.js"/, target);
    assert.doesNotMatch(html, /tailwindcss|fonts\.googleapis|material-symbols/i);
  }
});

test("service contract preserves the orange contract language and current decision-first reading controls", async () => {
  const [html, css] = await Promise.all([
    readTarget("service", "code.html"),
    readTarget("service", "styles.css"),
  ]);

  for (const landmark of [
    "contract-scene",
    "contract-dossier",
    "status-board",
    "dossier-copy",
    "contract-paper",
    "完整契約",
    "列印 / 本機預覽",
    "尚未進入簽署",
  ]) {
    assert.match(html, new RegExp(landmark));
  }
  assert.equal(count(html, /data-contract/g), 1);
  assert.match(css, /--source-orange:\s*#e5581e/i);
  assert.match(css, /\.contract-scene\s*\{/);
  assert.match(css, /\.contract-dossier\s*\{/);
  assert.match(css, /\.contract-paper\s*\{/);
  assert.match(css, /@media\s+print/);
});

test("owner workspace ports the source journey, tabs and dense dashboard without weakening its content map", async () => {
  const [html, css] = await Promise.all([
    readTarget("owner", "code.html"),
    readTarget("owner", "styles.css"),
  ]);

  assert.match(html, /class="journey-banner"/);
  assert.equal(count(html, /class="journey-step/g), 4);
  assert.match(html, /class="workspace-tabs"/);
  for (const label of [
    "文件準備",
    "案件總覽",
    "設計送審",
    "施工與驗收",
  ]) {
    assert.match(html, new RegExp(label));
  }
  assert.match(html, /class="owner-shell-grid"/);
  assert.match(html, /class="owner-sidebar"/);
  assert.match(css, /--source-active:\s*#ff5809/i);
  assert.match(css, /\.journey-banner\s*\{/);
  assert.match(css, /\.workspace-tabs\s*\{/);
  assert.match(css, /\.owner-shell-grid\s*\{/);
});

test("vendor workspace keeps the source shell and fails closed without a trusted adapter", async () => {
  const [html, css, runtime] = await Promise.all([
    readTarget("vendor", "code.html"),
    readTarget("vendor", "styles.css"),
    import(moduleUrl("vendor")),
  ]);

  for (const label of [
    "受邀案件",
    "文件準備",
    "合作工作台",
    "執行中工作台",
  ]) {
    assert.match(html, new RegExp(label));
  }
  for (const landmark of [
    "vendor-app",
    "main-tabs",
    "case-sidebar",
    "vendor-focus-grid",
    "calendar-panel",
    "message-panel",
  ]) {
    assert.match(html, new RegExp(landmark));
  }
  assert.match(css, /--workspace-orange:\s*#f16001/i);
  assert.deepEqual(runtime.VENDOR_WORKSPACE_STATES, [
    "ACCESS_CHECKING",
    "ACCESS_DENIED",
    "CONTRACT_PENDING",
    "AUTHORIZED_EMPTY",
    "AUTHORIZED_READY",
    "CASE_ARCHIVED_READ_ONLY",
    "LOAD_FAILED_RETRYABLE",
  ]);
  assert.deepEqual(runtime.resolveVendorWorkspaceState(), {
    state: "ACCESS_DENIED",
    reasonCode: "TRUSTED_VENDOR_CONTEXT_REQUIRED",
  });
});

test("vendor workspace accepts only an exact active invited-vendor tuple", async () => {
  const { resolveVendorWorkspaceState } = await import(moduleUrl("vendor"));
  const valid = {
    sessionStatus: "active",
    actor: { actorId: "vendor-actor-001", role: "vendor" },
    membership: {
      actorId: "vendor-actor-001",
      caseId: "case-001",
      role: "vendor",
      status: "active",
      invitationStatus: "accepted",
    },
    caseBinding: { caseId: "case-001", status: "bound" },
    agreement: {
      caseId: "case-001",
      version: "v1",
      status: "active",
      vendorAccepted: true,
      vendorActorId: "vendor-actor-001",
    },
    caseStatus: "active",
    caseSummary: { caseId: "case-001" },
  };

  assert.deepEqual(resolveVendorWorkspaceState(valid), {
    state: "AUTHORIZED_READY",
    reasonCode: "VENDOR_CASE_CONTEXT_CONFIRMED",
  });

  for (const mutate of [
    (value) => { value.actor.role = "owner"; },
    (value) => { value.membership.actorId = "other-vendor"; },
    (value) => { value.membership.status = "revoked"; },
    (value) => { value.membership.invitationStatus = "pending"; },
    (value) => { value.caseBinding.caseId = "other-case"; },
    (value) => { value.agreement.status = "pending"; },
    (value) => { value.agreement.vendorAccepted = false; },
    (value) => { value.agreement.vendorActorId = "other-vendor"; },
    (value) => { value.caseSummary.caseId = "other-case"; },
  ]) {
    const candidate = structuredClone(valid);
    mutate(candidate);
    assert.notEqual(
      resolveVendorWorkspaceState(candidate).state,
      "AUTHORIZED_READY",
    );
  }

  const archived = structuredClone(valid);
  archived.caseStatus = "archived";
  assert.equal(
    resolveVendorWorkspaceState(archived).state,
    "CASE_ARCHIVED_READ_ONLY",
  );

  const archivedWithoutSummary = structuredClone(archived);
  archivedWithoutSummary.caseSummary = null;
  assert.equal(
    resolveVendorWorkspaceState(archivedWithoutSummary).state,
    "AUTHORIZED_EMPTY",
  );

  const archivedWithWrongSummary = structuredClone(archived);
  archivedWithWrongSummary.caseSummary.caseId = "other-case";
  assert.equal(
    resolveVendorWorkspaceState(archivedWithWrongSummary).state,
    "ACCESS_DENIED",
  );
});

test("owner-vendor contract workspace mirrors the seven-step source rail and defaults to disabled signing", async () => {
  const [html, css, appSource, runtime] = await Promise.all([
    readTarget("signing", "code.html"),
    readTarget("signing", "styles.css"),
    readTarget("signing", "app.js"),
    import(moduleUrl("signing")),
  ]);

  for (const landmark of [
    "contract-summary-strip",
    "contract-rail",
    "contract-view-tabs",
    "signature-grid",
    "signContractButton",
  ]) {
    assert.match(html, new RegExp(landmark));
  }
  assert.equal(count(html, /class="contract-step/g), 7);
  assert.match(html, /id="signContractButton"[^>]*disabled/);
  assert.match(appSource, /signButton\.disabled\s*=\s*true/);
  assert.match(css, /--contract-orange:\s*#f16001/i);
  assert.deepEqual(runtime.CONTRACT_SIGNING_STATES, [
    "CONTEXT_UNAVAILABLE",
    "PREREQUISITES_PENDING",
    "READY_TO_SIGN",
    "SIGNED_READ_ONLY",
    "LOAD_FAILED_RETRYABLE",
  ]);
  assert.equal(
    runtime.evaluateContractSigningReadiness(
      runtime.INITIAL_CONTRACT_SIGNING_CONTEXT,
    ).ready,
    false,
  );
});

test("contract signing readiness requires one canonical version and exact dual-party acceptance", async () => {
  const {
    buildContractSigningViewModel,
    evaluateContractSigningReadiness,
  } = await import(moduleUrl("signing"));
  const valid = {
    caseId: "case-001",
    contractId: "contract-001",
    contractVersion: "v1",
    contractVersionHash: "a".repeat(64),
    ownerIdentity: {
      actorId: "owner-actor-001",
      partyId: "owner-party-001",
      verified: true,
    },
    vendorPartySnapshot: {
      partyType: "natural_person",
      partyId: "vendor-party-001",
      signatoryActorId: "vendor-actor-001",
    },
    ownerAcceptance: {
      caseId: "case-001",
      contractId: "contract-001",
      partyId: "owner-party-001",
      actorId: "owner-actor-001",
      contractVersion: "v1",
      contractVersionHash: "a".repeat(64),
      accepted: true,
    },
    vendorAcceptance: {
      caseId: "case-001",
      contractId: "contract-001",
      partyId: "vendor-party-001",
      actorId: "vendor-actor-001",
      contractVersion: "v1",
      contractVersionHash: "a".repeat(64),
      accepted: true,
    },
    writerReady: true,
    signedRecord: null,
  };

  assert.deepEqual(evaluateContractSigningReadiness(valid), {
    state: "READY_TO_SIGN",
    ready: true,
    reasonCodes: [],
  });

  for (const mutate of [
    (value) => { value.caseId = ""; },
    (value) => { value.contractVersionHash = "A".repeat(64); },
    (value) => { value.ownerIdentity.verified = false; },
    (value) => { value.vendorPartySnapshot.partyType = "organization"; },
    (value) => { value.ownerAcceptance.partyId = "other-owner"; },
    (value) => { value.ownerAcceptance.contractVersion = "v2"; },
    (value) => { value.vendorAcceptance.actorId = "other-vendor"; },
    (value) => { value.vendorAcceptance.contractVersionHash = "b".repeat(64); },
    (value) => { value.vendorAcceptance.accepted = false; },
    (value) => { value.writerReady = false; },
  ]) {
    const candidate = structuredClone(valid);
    mutate(candidate);
    const result = evaluateContractSigningReadiness(candidate);
    assert.equal(result.ready, false);
    assert.notEqual(result.state, "READY_TO_SIGN");
    assert.ok(result.reasonCodes.length > 0);
  }

  const signed = structuredClone(valid);
  signed.signedRecord = {
    status: "signed",
    caseId: "case-001",
    contractId: "contract-001",
    contractVersion: "v1",
    contractVersionHash: "a".repeat(64),
  };
  assert.equal(evaluateContractSigningReadiness(signed).state, "SIGNED_READ_ONLY");
  signed.signedRecord.caseId = "other-case";
  assert.equal(
    evaluateContractSigningReadiness(signed).state,
    "PREREQUISITES_PENDING",
  );

  assert.equal(
    buildContractSigningViewModel(
      { state: "PREREQUISITES_PENDING", ready: false },
      { caseName: "不得顯示的案件", contractId: "private-contract" },
    ),
    null,
  );
  assert.equal(
    buildContractSigningViewModel(
      { state: "READY_TO_SIGN", ready: true },
      { ...valid, caseName: "已驗證案件" },
    ).caseName,
    "已驗證案件",
  );
});

test("four target pages contain no marketplace vocabulary, browser authority, engineering copy or dead href", async () => {
  const forbiddenMarketplace = [
    "招標",
    "投標",
    "競標",
    "標案",
    "開標",
    "決標",
    "得標",
    "押標",
    "流標",
    "中標",
  ];
  const forbiddenExternalCopy =
    /(?:\bDB\b|\bAPI\b|localStorage|sessionStorage|mock-only|debug|source clean|GitHub truth|無 DB 寫入|老屋煉金術|裝修投資報酬|金流託管|支付託管|代收代付)/i;

  for (const target of Object.keys(targets)) {
    const targetFiles = [
      "code.html",
      "styles.css",
      "app.js",
      ...(target === "service" ? ["contract-content.js"] : []),
    ];
    const sources = await Promise.all(targetFiles.map((fileName) =>
      readTarget(target, fileName),
    ));
    const source = sources.join("\n");
    for (const term of forbiddenMarketplace) {
      assert.equal(source.includes(term), false, `${target}: ${term}`);
    }
    assert.doesNotMatch(source, forbiddenExternalCopy, target);
    assert.doesNotMatch(sources[0], /href=["']#["']/i, target);
    assert.doesNotMatch(sources[0], /javascript:/i, target);
  }
});

test("the complete PCM page source tree contains no legacy marketplace vocabulary", async () => {
  const forbiddenMarketplace =
    /招標|投標|競標|決標|得標|標案|標書|標價|邀標|發包/u;
  const files = [
    ...await collectPageAssets(pcmRoot),
    ...await collectPageAssets(targets.owner),
  ];

  for (const filePath of files) {
    const source = await readFile(filePath, "utf8");
    assert.doesNotMatch(
      source,
      forbiddenMarketplace,
      path.relative(repositoryRoot, filePath),
    );
  }
});

test("four target pages resolve every local href, image, stylesheet and fragment", async () => {
  for (const [target, directory] of Object.entries(targets)) {
    const html = await readTarget(target, "code.html");
    const ids = new Set(
      [...html.matchAll(/\bid=["']([^"']+)["']/gi)].map((match) => match[1]),
    );
    const references = [
      ...html.matchAll(/\b(?:href|src)=["']([^"']+)["']/gi),
    ].map((match) => match[1]);

    for (const reference of references) {
      if (/^(?:https?:|mailto:|tel:|data:)/i.test(reference)) continue;
      if (reference.startsWith("#")) {
        assert.ok(ids.has(reference.slice(1)), `${target}: ${reference}`);
        continue;
      }
      const localPath = reference.split(/[?#]/u, 1)[0];
      await access(path.resolve(directory, localPath));
    }
  }
});

test("visual ports retain responsive, focus, disabled and reduced-motion states", async () => {
  for (const target of Object.keys(targets)) {
    const css = await readTarget(target, "styles.css");
    assert.match(css, /:focus-visible/, target);
    assert.match(css, /min-height:\s*44px/, target);
    assert.match(css, /@media\s*\(max-width:/, target);
    assert.match(css, /prefers-reduced-motion/, target);
  }
});

test("historical visual-port manifest stays bound to its immutable evidence commit", async () => {
  const manifestRelativePath = "docs/governance/pcm-full-flow-visual-port-manifest.v1.json";
  const manifestBytes = execFileSync(
    "git",
    ["show", `${VISUAL_PORT_EVIDENCE_COMMIT}:${manifestRelativePath}`],
    { cwd: repositoryRoot, encoding: null },
  );
  const manifest = JSON.parse(manifestBytes.toString("utf8"));
  const expectedWriteSet = [
    "docs/governance/pcm-full-flow-visual-port-manifest.v1.json",
    "docs/superpowers/plans/2026-08-02-pcm-full-flow-visual-port.md",
    "docs/superpowers/specs/2026-08-02-pcm-full-flow-visual-port-design.md",
    "src/stitch_laibe_landing_onboarding/client_awarding_dashboard/code.html",
    "src/stitch_laibe_landing_onboarding/client_awarding_dashboard/styles.css",
    "src/stitch_laibe_landing_onboarding/pcm_standalone/contract_signing/app.js",
    "src/stitch_laibe_landing_onboarding/pcm_standalone/contract_signing/code.html",
    "src/stitch_laibe_landing_onboarding/pcm_standalone/contract_signing/styles.css",
    "src/stitch_laibe_landing_onboarding/pcm_standalone/service_contract/code.html",
    "src/stitch_laibe_landing_onboarding/pcm_standalone/service_contract/contract-content.js",
    "src/stitch_laibe_landing_onboarding/pcm_standalone/service_contract/styles.css",
    "src/stitch_laibe_landing_onboarding/pcm_standalone/vendor_workspace/app.js",
    "src/stitch_laibe_landing_onboarding/pcm_standalone/vendor_workspace/code.html",
    "src/stitch_laibe_landing_onboarding/pcm_standalone/vendor_workspace/styles.css",
    "tests/pcm-full-flow-visual-port.test.mjs",
    "tests/pcm-service-contract.test.mjs",
  ];

  assert.deepEqual(manifest.writeSet, expectedWriteSet);
  assert.equal(manifest.artifactReceiptPolicy, "UTF8_LF_CANONICAL_BYTES_GIT_BLOB_SHA1_V1");
  assert.equal(manifest.artifactReceipts.length, expectedWriteSet.length - 1);
  assert.deepEqual(
    manifest.artifactReceipts.map(({ path: receiptPath }) => receiptPath),
    expectedWriteSet.slice(1),
  );

  for (const receipt of manifest.artifactReceipts) {
    const historicalBytes = execFileSync(
      "git",
      ["show", `${VISUAL_PORT_EVIDENCE_COMMIT}:${receipt.path}`],
      { cwd: repositoryRoot, encoding: null },
    );
    const canonical = canonicalUtf8LfReceipt(historicalBytes);
    assert.equal(canonical.bytes, receipt.bytes, receipt.path);
    assert.equal(canonical.sha256, receipt.sha256, receipt.path);
    assert.equal(canonical.gitBlobSha1, receipt.gitBlobSha1, receipt.path);
  }
});
