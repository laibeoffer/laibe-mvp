import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const repositoryRoot = new URL("../", import.meta.url);
const pcmRoot = new URL(
  "src/stitch_laibe_landing_onboarding/pcm_standalone/",
  repositoryRoot,
);
const publicContractUrl = new URL("public/public-contract.js", pcmRoot);
const routeManifestUrl = new URL("public/pcm-flow-route-manifest.js", pcmRoot);
const governanceManifestUrl = new URL(
  "docs/governance/pcm-owner-first-execution-manifest.v1.json",
  repositoryRoot,
);

function gitBlobSha1(bytes) {
  return createHash("sha1")
    .update(`blob ${bytes.length}\0`)
    .update(bytes)
    .digest("hex");
}

function scanJsonObjectKeys(source) {
  let index = 0;
  const objectCounts = new Map();

  const skipWhitespace = () => {
    while (/\s/u.test(source[index] ?? "")) {
      index += 1;
    }
  };

  const parseString = () => {
    if (source[index] !== '"') {
      throw new SyntaxError(`Expected string at byte ${index}`);
    }
    const start = index;
    index += 1;
    while (index < source.length) {
      const character = source[index];
      if (character === "\\") {
        index += 2;
        continue;
      }
      index += 1;
      if (character === '"') {
        return JSON.parse(source.slice(start, index));
      }
    }
    throw new SyntaxError("Unterminated JSON string");
  };

  const parseValue = (path) => {
    skipWhitespace();
    if (source[index] === "{") {
      parseObject(path);
      return;
    }
    if (source[index] === "[") {
      parseArray(path);
      return;
    }
    if (source[index] === '"') {
      parseString();
      return;
    }
    const primitive = source
      .slice(index)
      .match(/^(?:true|false|null|-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?)/u);
    if (!primitive) {
      throw new SyntaxError(`Invalid JSON value at byte ${index}`);
    }
    index += primitive[0].length;
  };

  const parseObject = (path) => {
    index += 1;
    skipWhitespace();
    const counts = new Map();
    objectCounts.set(path, counts);
    if (source[index] === "}") {
      index += 1;
      return;
    }
    while (index < source.length) {
      skipWhitespace();
      const key = parseString();
      const count = (counts.get(key) ?? 0) + 1;
      counts.set(key, count);
      if (count !== 1) {
        throw new SyntaxError(`Duplicate JSON key at ${path}.${key}`);
      }
      skipWhitespace();
      if (source[index] !== ":") {
        throw new SyntaxError(`Expected colon at byte ${index}`);
      }
      index += 1;
      parseValue(`${path}.${key}`);
      skipWhitespace();
      if (source[index] === "}") {
        index += 1;
        return;
      }
      if (source[index] !== ",") {
        throw new SyntaxError(`Expected comma at byte ${index}`);
      }
      index += 1;
    }
    throw new SyntaxError("Unterminated JSON object");
  };

  const parseArray = (path) => {
    index += 1;
    skipWhitespace();
    if (source[index] === "]") {
      index += 1;
      return;
    }
    let itemIndex = 0;
    while (index < source.length) {
      parseValue(`${path}[${itemIndex}]`);
      itemIndex += 1;
      skipWhitespace();
      if (source[index] === "]") {
        index += 1;
        return;
      }
      if (source[index] !== ",") {
        throw new SyntaxError(`Expected comma at byte ${index}`);
      }
      index += 1;
    }
    throw new SyntaxError("Unterminated JSON array");
  };

  parseValue("$");
  skipWhitespace();
  if (index !== source.length) {
    throw new SyntaxError(`Unexpected JSON content at byte ${index}`);
  }
  return objectCounts;
}

const requiredCanonicalNodes = Object.freeze([
  "home",
  "quoteCheck",
  "drawingCheck",
  "accountAccess",
  "caseSetup",
  "serviceContract",
  "contractPrerequisites",
  "contractSigning",
  "ownerWorkspace",
  "vendorInvitation",
  "vendorWorkspace",
  "pcmAuthorizedList",
  "pcmCaseWorkspace",
  "internalGovernance",
  "caseRecordCenter",
  "caseCloseout",
  "accessUnavailable",
]);

const prohibitedCanonicalNodes = Object.freeze([
  "ownerStart",
  "documentCorrections",
  "basicReport",
  "readOnlyArchive",
  "selfServiceArchive",
]);

const requiredFailureCodes = Object.freeze([
  "VENDOR_INVITATION_DECLINED",
  "VENDOR_INVITATION_EXPIRED",
  "VENDOR_INVITATION_WITHDRAWN",
  "VENDOR_INVITATION_RESEND_REQUIRED",
  "QUOTE_ONLY_DRAWING_MISSING",
  "DRAWING_ONLY_QUOTE_MISSING",
  "FILE_FORMAT_INVALID",
  "FILE_TOO_LARGE",
  "PAGE_COUNT_INVALID",
  "FILE_UNREADABLE",
  "FILE_CORRUPTED",
  "DUPLICATE_SUBMISSION",
  "VERSION_CONFLICT",
  "CONTRACT_PREREQUISITES_MISSING",
  "CONTRACT_VERSION_NOT_MUTUALLY_ACCEPTED",
  "IDENTITY_UNCONFIRMED",
  "MEMBERSHIP_UNCONFIRMED",
  "ACCESS_UNCONFIRMED",
  "SUPPLEMENT_OVERDUE",
  "CASE_CANCELLED",
  "PCM_EXITED_READ_ONLY",
  "CASE_CLOSED_READ_ONLY",
]);

test("canonical graph uses one quote check, one drawing check, and one shared account entry", async () => {
  const { PCM_FLOW_ROUTE_MANIFEST } = await import(routeManifestUrl.href);
  const nodeIds = PCM_FLOW_ROUTE_MANIFEST.nodes.map(({ id }) => id);

  for (const routeId of requiredCanonicalNodes) {
    assert.equal(nodeIds.filter((id) => id === routeId).length, 1, routeId);
  }
  for (const routeId of prohibitedCanonicalNodes) {
    assert.equal(nodeIds.includes(routeId), false, routeId);
    assert.equal(
      PCM_FLOW_ROUTE_MANIFEST.edges.some(
        ({ from, to }) => from === routeId || to === routeId,
      ),
      false,
      `${routeId} must not appear in canonical edges`,
    );
  }

  assert.deepEqual(
    PCM_FLOW_ROUTE_MANIFEST.gates.map(({ id }) => id),
    ["G1_UI_SOURCE", "G2_AUTH_RUNTIME", "G3_DURABLE_DATA", "G4_PRODUCTION"],
  );
});

test("quote and drawing checks are active while account access remains planned and 404-safe", async () => {
  const { PCM_FLOW_ROUTE_MANIFEST } = await import(routeManifestUrl.href);
  const byId = new Map(PCM_FLOW_ROUTE_MANIFEST.nodes.map((node) => [node.id, node]));

  const quoteCheck = byId.get("quoteCheck");
  assert.equal(quoteCheck.lifecycle, "active");
  assert.equal(quoteCheck.href, "../quote_check/code.html");
  await access(new URL(quoteCheck.href, routeManifestUrl));

  const drawingCheck = byId.get("drawingCheck");
  assert.equal(drawingCheck.lifecycle, "active");
  assert.equal(drawingCheck.href, "../drawing_check/code.html");
  await access(new URL(drawingCheck.href, routeManifestUrl));

  const accountAccess = byId.get("accountAccess");
  assert.equal(accountAccess.lifecycle, "planned");
  assert.equal(accountAccess.href, null);
  assert.equal(byId.get("quoteCheck").publicPath, "/pcm/quote-check");
  assert.equal(byId.get("drawingCheck").publicPath, "/pcm/drawing-check");
  assert.equal(byId.get("accountAccess").publicPath, "/account/access");

  for (const node of PCM_FLOW_ROUTE_MANIFEST.nodes) {
    if (node.lifecycle === "active") {
      assert.equal(typeof node.href, "string", node.id);
      await access(new URL(node.href.split(/[?#]/, 1)[0], routeManifestUrl));
    }
    if (node.lifecycle === "planned") {
      assert.equal(node.href, null, `${node.id} planned href`);
    }
  }

  for (const edge of PCM_FLOW_ROUTE_MANIFEST.edges) {
    const target = byId.get(edge.to);
    assert.equal(Boolean(target), true, `${edge.from} -> ${edge.to}`);
    if (target.lifecycle === "planned") {
      assert.equal(edge.clickable, false, `${edge.from} -> ${edge.to}`);
    }
  }

  for (const [from, to] of [
    ["home", "drawingCheck"],
    ["quoteCheck", "drawingCheck"],
    ["drawingCheck", "quoteCheck"],
  ]) {
    const edge = PCM_FLOW_ROUTE_MANIFEST.edges.find(
      (candidate) => candidate.from === from && candidate.to === to,
    );
    assert.equal(edge?.clickable, true, `${from} -> ${to}`);
  }
});

test("canonical route graph retains forward, back, pending, and recovery coverage", async () => {
  const { PCM_FLOW_ROUTE_MANIFEST } = await import(routeManifestUrl.href);
  const nodeIds = new Set(PCM_FLOW_ROUTE_MANIFEST.nodes.map(({ id }) => id));
  const edgeKinds = new Set(PCM_FLOW_ROUTE_MANIFEST.edges.map(({ kind }) => kind));

  assert.deepEqual(
    edgeKinds,
    new Set(["forward", "back", "pending", "recovery"]),
  );
  assert.equal(
    PCM_FLOW_ROUTE_MANIFEST.edges.every(
      ({ from, to, gate, owner }) =>
        nodeIds.has(from) && nodeIds.has(to) && gate && owner,
    ),
    true,
  );
});

test("legacy pages remain compatibility aliases and never become canonical steps", async () => {
  const { PCM_FLOW_ROUTE_MANIFEST } = await import(routeManifestUrl.href);
  const aliasIds = PCM_FLOW_ROUTE_MANIFEST.compatibilityAliases.map(({ id }) => id);

  assert.deepEqual(aliasIds, [
    "ownerStart",
    "documentCorrections",
    "basicReport",
    "selfServiceArchive",
  ]);
  for (const alias of PCM_FLOW_ROUTE_MANIFEST.compatibilityAliases) {
    assert.equal(alias.lifecycle, "RETIRED_COMPATIBILITY");
    assert.equal(alias.canonicalHref, null);
    assert.equal(typeof alias.compatibilityHref, "string");
    await access(new URL(alias.compatibilityHref, routeManifestUrl));
  }
});

test("failure matrix is complete, typed closed, actionable, and recoverable", async () => {
  const { PCM_FLOW_ROUTE_MANIFEST } = await import(routeManifestUrl.href);
  const matrix = PCM_FLOW_ROUTE_MANIFEST.failureMatrix;
  const edges = PCM_FLOW_ROUTE_MANIFEST.failureEdges;
  const nodeIds = new Set(PCM_FLOW_ROUTE_MANIFEST.nodes.map(({ id }) => id));

  assert.deepEqual(Object.keys(matrix), requiredFailureCodes);
  for (const code of requiredFailureCodes) {
    const state = matrix[code];
    assert.equal(state.code, code);
    assert.equal(state.type, "CLOSED");
    assert.equal(state.mutationAllowed, false);
    assert.equal(typeof state.reason, "string");
    assert.notEqual(state.reason.trim(), "");
    assert.equal(typeof state.nextAction, "string");
    assert.notEqual(state.nextAction.trim(), "");
    assert.equal(typeof state.responsibleRole, "string");
    assert.notEqual(state.responsibleRole.trim(), "");
    assert.equal(state.responsibleActor, state.responsibleRole);
    assert.equal(nodeIds.has(state.returnRoute), true, `${code}.returnRoute`);
    assert.equal(nodeIds.has(state.recoveryRoute), true, `${code}.recoveryRoute`);
    assert.equal(typeof state.payloadPolicy, "string");
    assert.notEqual(state.payloadPolicy.trim(), "");
    assert.equal(
      edges.some(
        (edge) =>
          edge.stateCode === code &&
          edge.kind === "recovery" &&
          edge.to === state.recoveryRoute &&
          edge.mutationAllowed === false,
      ),
      true,
      `${code} recovery edge`,
    );
  }

  for (const code of [
    "IDENTITY_UNCONFIRMED",
    "MEMBERSHIP_UNCONFIRMED",
    "ACCESS_UNCONFIRMED",
  ]) {
    assert.equal(matrix[code].payloadPolicy, "ZERO_CASE_DATA");
  }
});

test("read-only outcomes stay in original workspaces with no mutation actions", async () => {
  const { PCM_FLOW_ROUTE_MANIFEST } = await import(routeManifestUrl.href);

  for (const code of ["PCM_EXITED_READ_ONLY", "CASE_CLOSED_READ_ONLY"]) {
    const state = PCM_FLOW_ROUTE_MANIFEST.failureMatrix[code];
    assert.equal(state.returnRoute, "accessUnavailable");
    assert.equal(state.recoveryRoute, "accessUnavailable");
    assert.equal(state.payloadPolicy, "PRESERVE_EXISTING_CASE_READ_ONLY");
    assert.equal(state.mutationAllowed, false);
    assert.deepEqual(state.actions, []);
    assert.deepEqual(state.workspaceByRole, {
      owner: "ownerWorkspace",
      vendor: "vendorWorkspace",
    });
  }

  const overdue = PCM_FLOW_ROUTE_MANIFEST.failureMatrix.SUPPLEMENT_OVERDUE;
  assert.equal(overdue.responsibleActor, overdue.responsibleRole);
  assert.equal(overdue.mutationAllowed, false);
  assert.equal(overdue.payloadPolicy, "PRESERVE_EXISTING_CASE_READ_ONLY");
  assert.equal(overdue.returnRoute, "ownerWorkspace");
  assert.equal(overdue.recoveryRoute, "ownerWorkspace");
  assert.doesNotMatch(overdue.nextAction, /留下|新增|寫入|記錄|提交|更新/);
  assert.match(overdue.nextAction, /查看|聯絡|返回/);

  const cancelled = PCM_FLOW_ROUTE_MANIFEST.failureMatrix.CASE_CANCELLED;
  assert.equal(cancelled.returnRoute, "accessUnavailable");
  assert.equal(cancelled.recoveryRoute, "accessUnavailable");
  assert.deepEqual(cancelled.workspaceByRole, {
    owner: "ownerWorkspace",
    vendor: "vendorWorkspace",
  });
});

test("read-only outcomes bind exact primitive roles without vendor-to-owner fallback", async () => {
  const { resolvePcmFlowContinuation } = await import(publicContractUrl.href);

  for (const intent of ["PCM_EXITED_READ_ONLY", "CASE_CLOSED_READ_ONLY"]) {
    const owner = resolvePcmFlowContinuation({ intent, role: "owner" });
    assert.equal(owner.routeKey, "ownerWorkspace");
    assert.equal(typeof owner.href, "string");
    assert.equal(owner.authorityGate, "G2_AUTH_RUNTIME");
    assert.equal(owner.payloadPolicy, "PRESERVE_EXISTING_CASE_READ_ONLY");
    assert.equal(owner.canMutate, false);

    const vendor = resolvePcmFlowContinuation({ intent, role: "vendor" });
    assert.equal(vendor.routeKey, "vendorWorkspace");
    assert.notEqual(vendor.routeKey, "ownerWorkspace");
    assert.equal(vendor.href, null);
    assert.equal(vendor.authorityGate, "G2_AUTH_RUNTIME");
    assert.equal(vendor.payloadPolicy, "PRESERVE_EXISTING_CASE_READ_ONLY");
    assert.equal(vendor.canMutate, false);

    const inherited = Object.create({ role: "owner" });
    Object.defineProperty(inherited, "intent", { value: intent, enumerable: true });
    const accessor = { intent };
    Object.defineProperty(accessor, "role", { get: () => "owner" });

    for (const context of [
      { intent },
      { intent, role: "pcm" },
      { intent, role: { id: "owner" } },
      inherited,
      accessor,
    ]) {
      const result = resolvePcmFlowContinuation(context);
      assert.equal(result.routeKey, "accessUnavailable");
      assert.equal(result.payloadPolicy, "ZERO_CASE_DATA");
      assert.equal(result.canMutate, false);
    }
  }
});

test("resolver remains closed after prototype and intrinsic pollution", async () => {
  const { resolvePcmFlowContinuation } = await import(publicContractUrl.href);
  const forgedProxy = new Proxy({}, {
    getPrototypeOf: () => Object.prototype,
    getOwnPropertyDescriptor: (_target, property) => {
      if (property === "intent") {
        return { configurable: true, enumerable: true, value: "PCM_EXITED_READ_ONLY" };
      }
      if (property === "role") {
        return { configurable: true, enumerable: true, value: "owner" };
      }
      return undefined;
    },
    ownKeys: () => ["intent", "role"],
  });
  const injectedDescriptor = Object.getOwnPropertyDescriptor(
    Object.prototype,
    "INJECTED_INTENT",
  );
  const originalSetHas = Set.prototype.has;
  const originalGetPrototypeOf = Object.getPrototypeOf;
  const originalGetOwnPropertyDescriptor = Object.getOwnPropertyDescriptor;

  try {
    const forgedResult = resolvePcmFlowContinuation(forgedProxy);
    assert.equal(forgedResult.routeKey, "accessUnavailable");
    assert.equal(forgedResult.payloadPolicy, "ZERO_CASE_DATA");

    Object.defineProperty(Object.prototype, "INJECTED_INTENT", {
      configurable: true,
      value: "ownerWorkspace",
    });
    let result = resolvePcmFlowContinuation({ intent: "INJECTED_INTENT" });
    assert.equal(result.routeKey, "accessUnavailable");
    assert.equal(result.payloadPolicy, "ZERO_CASE_DATA");

    Set.prototype.has = () => {
      throw new Error("poisoned Set.prototype.has");
    };
    Object.getPrototypeOf = () => Object.prototype;
    Object.getOwnPropertyDescriptor = (_target, property) =>
      property === "intent" ? { value: "READ_CONTRACT" } : undefined;

    assert.doesNotThrow(() => {
      result = resolvePcmFlowContinuation({ intent: "UNKNOWN" });
    });
    assert.equal(result.routeKey, "accessUnavailable");
    assert.equal(result.payloadPolicy, "ZERO_CASE_DATA");

    Object.getPrototypeOf = () => {
      throw new Error("poisoned Object.getPrototypeOf");
    };
    Object.getOwnPropertyDescriptor = () => {
      throw new Error("poisoned Object.getOwnPropertyDescriptor");
    };
    assert.doesNotThrow(() => {
      result = resolvePcmFlowContinuation({ intent: "READ_CONTRACT" });
    });
    assert.equal(result.routeKey, "serviceContract");
  } finally {
    Set.prototype.has = originalSetHas;
    Object.getPrototypeOf = originalGetPrototypeOf;
    Object.getOwnPropertyDescriptor = originalGetOwnPropertyDescriptor;
    if (injectedDescriptor) {
      Object.defineProperty(Object.prototype, "INJECTED_INTENT", injectedDescriptor);
    } else {
      delete Object.prototype.INJECTED_INTENT;
    }
  }
});

test("resolver ignores post-load Array iterator pollution for internal context", async () => {
  const { resolvePcmFlowContinuation } = await import(publicContractUrl.href);
  const originalDescriptor = Object.getOwnPropertyDescriptor(
    Array.prototype,
    Symbol.iterator,
  );
  let thrown = null;
  let unknown;
  let owner;
  let vendor;

  try {
    Object.defineProperty(Array.prototype, Symbol.iterator, {
      configurable: true,
      writable: true,
      value: function* poisonedAuthorityIterator() {
        yield "PCM_EXITED_READ_ONLY";
        yield "owner";
      },
    });
    try {
      unknown = resolvePcmFlowContinuation({ intent: "UNKNOWN" });
      owner = resolvePcmFlowContinuation({
        intent: "PCM_EXITED_READ_ONLY",
        role: "owner",
      });
      vendor = resolvePcmFlowContinuation({
        intent: "CASE_CLOSED_READ_ONLY",
        role: "vendor",
      });
    } catch (error) {
      thrown = error;
    }
  } finally {
    if (originalDescriptor) {
      Object.defineProperty(
        Array.prototype,
        Symbol.iterator,
        originalDescriptor,
      );
    } else {
      delete Array.prototype[Symbol.iterator];
    }
  }

  assert.equal(thrown, null);
  assert.equal(unknown.routeKey, "accessUnavailable");
  assert.equal(unknown.payloadPolicy, "ZERO_CASE_DATA");
  assert.equal(unknown.canMutate, false);
  assert.equal(owner.routeKey, "ownerWorkspace");
  assert.equal(owner.canMutate, false);
  assert.equal(vendor.routeKey, "vendorWorkspace");
  assert.equal(vendor.canMutate, false);
});

test("trusted route lookup ignores post-load Array.find pollution before consumers load", () => {
  const childSource = `
    const route = await import(${JSON.stringify(routeManifestUrl.href)});
    const originalFind = Array.prototype.find;
    let findCalls = 0;
    Object.defineProperty(Array.prototype, "find", {
      configurable: true,
      writable: true,
      value: function (...args) {
        findCalls += 1;
        if (this === route.PCM_FLOW_NODES) {
          return Object.freeze({ id: "drawingCheck", lifecycle: "active", href: "javascript:alert(1)" });
        }
        if (this === route.PCM_FLOW_COMPATIBILITY_ALIASES) {
          return Object.freeze({ id: "ownerStart", compatibilityHref: "javascript:alert(2)" });
        }
        return Reflect.apply(originalFind, this, args);
      },
    });
    const contract = await import(${JSON.stringify(`${publicContractUrl.href}?array-find-child`)});
    const result = contract.resolvePcmFlowContinuation({ intent: "START_DRAWING_CHECK" });
    process.stdout.write(JSON.stringify({
      findCalls,
      drawingHref: contract.PUBLIC_ROUTES.drawingCheck,
      compatibilityHref: contract.PUBLIC_ROUTES.ownerStart,
      result,
    }));
  `;
  const child = spawnSync(
    process.execPath,
    ["--input-type=module", "--eval", childSource],
    { encoding: "utf8" },
  );

  assert.equal(child.status, 0, child.stderr);
  const evidence = JSON.parse(child.stdout);
  assert.equal(evidence.findCalls, 0);
  assert.equal(evidence.drawingHref, "../drawing_check/code.html");
  assert.equal(evidence.compatibilityHref, "../owner_start/code.html");
  assert.deepEqual(evidence.result, {
    routeKey: "drawingCheck",
    href: "../drawing_check/code.html",
    gate: "G1_UI_SOURCE",
    reason: "PUBLIC_ROUTE",
    payloadPolicy: "NO_CASE_DATA",
    canMutate: false,
  });
});

test("governance manifest raw JSON has no duplicate object keys", async () => {
  const raw = await readFile(governanceManifestUrl, "utf8");
  const objectCounts = scanJsonObjectKeys(raw);
  const t0Counts = objectCounts.get("$.t0");

  for (const key of [
    "currentTrainRegression",
    "fullSuiteTruth",
    "staticGates",
    "independentReview",
  ]) {
    assert.equal(t0Counts.get(key), 1, `$.t0.${key}`);
  }
});

test("T4 serial integration evidence binds admitted source, exact-seven bytes, and closed downstream gates", async () => {
  const manifest = JSON.parse(await readFile(governanceManifestUrl, "utf8"));
  const integration = manifest.t4SourceIntegration;
  const expectedWriteSet = [
    "src/stitch_laibe_landing_onboarding/pcm_standalone/public/pcm-flow-route-manifest.js",
    "tests/pcm-owner-first-route-manifest.test.mjs",
    "tests/pcm-owner-first-public-home.test.mjs",
    "tests/pcm-owner-first-quote-check.test.mjs",
    "docs/superpowers/specs/2026-08-03-pcm-owner-first-full-site-design.md",
    "docs/superpowers/plans/2026-08-03-laibe-pcm-end-to-end-flow-integration.md",
    "docs/governance/pcm-owner-first-execution-manifest.v1.json",
  ];

  assert.equal(integration.status, "ready_for_a0_focused_review");
  assert.equal(integration.sourceAdmission, "ADMITTED_G1_UI_SOURCE_ONLY");
  assert.equal(integration.sourceCommit, "ca90ecdd3fb0191c8f3ae4f420c2011758908521");
  assert.equal(integration.integrationParent, "7464e8332932ce48b48044d5b738a2534335156b");
  assert.deepEqual(integration.integrationWriteSet, expectedWriteSet);
  assert.equal(integration.outsideWriteSet, 0);
  assert.equal(integration.publicContractByteFrozen, true);
  assert.deepEqual(integration.fullSuite, {
    command: "node --test tests/pcm-*.test.mjs",
    files: 11,
    tests: 213,
    passed: 213,
    failed: 0,
    exitCode: 0,
  });
  assert.equal(integration.browser.drawingEntryActive, "5/5");
  assert.equal(integration.browser.horizontalOverflow, 0);
  assert.equal(integration.browser.visibleControlsUnder44, 0);
  assert.equal(integration.browser.consoleWarningsOrErrors, 0);
  assert.equal(integration.browser.networkFailuresOrNon2xx, 0);
  assert.equal(integration.independentReview.critical, 0);
  assert.equal(integration.independentReview.important, 0);
  assert.equal(integration.gates.G2_AUTH_RUNTIME, "closed");
  assert.equal(integration.gates.G3_DURABLE_DATA, "closed");
  assert.equal(integration.gates.G4_PRODUCTION, "closed");

  const artifactPaths = expectedWriteSet.filter(
    (path) => path !== "docs/governance/pcm-owner-first-execution-manifest.v1.json",
  );
  assert.deepEqual(
    integration.artifactReceipts.map(({ path }) => path),
    artifactPaths,
  );
  for (const receipt of integration.artifactReceipts) {
    const bytes = await readFile(new URL(receipt.path, repositoryRoot));
    assert.equal(receipt.bytes, bytes.length, receipt.path);
    assert.equal(
      receipt.sha256,
      createHash("sha256").update(bytes).digest("hex"),
      receipt.path,
    );
    assert.equal(receipt.gitBlobSha1, gitBlobSha1(bytes), receipt.path);
    assert.equal(receipt.scope, "candidate_git_blob_bytes", receipt.path);
  }
});

test("governance manifest t0 exposes one current evidence truth", async () => {
  const manifest = JSON.parse(await readFile(governanceManifestUrl, "utf8"));

  assert.deepEqual(manifest.t0.currentTrainRegression, {
    tests: 65,
    passed: 65,
    failed: 0,
    exitCode: 0,
  });
  assert.deepEqual(manifest.t0.fullSuiteTruth, {
    files: 9,
    tests: 134,
    passed: 133,
    failed: 1,
    exitCode: 1,
    onlyFailure:
      "tests/pcm-governance-pages.test.mjs frozen A3 cumulative-path admission assertion",
  });
  assert.deepEqual(manifest.t0.staticGates, {
    strictUtf8: "6/6",
    json: "valid",
    localRouteReferences: 22,
    localFragments: 3,
    missingLocalReferences: 0,
    plannedClickable: 0,
    forbiddenProductTerms: 0,
    deprecatedReadOnlyState: 0,
    gitDiffCheck: "clean",
  });
  assert.deepEqual(manifest.t0.independentReview, {
    critical: 0,
    important: 0,
    adversarialMatrix: "pass",
  });
});

test("public contract exposes quote and drawing checks while keeping account access non-clickable", async () => {
  const { PUBLIC_ROUTES, resolvePcmFlowContinuation } = await import(
    publicContractUrl.href
  );

  assert.equal(PUBLIC_ROUTES.quoteCheck, "../quote_check/code.html");
  assert.equal(PUBLIC_ROUTES.drawingCheck, "../drawing_check/code.html");
  assert.equal(PUBLIC_ROUTES.accountAccess, null);
  assert.equal(PUBLIC_ROUTES.ownerStart, "../owner_start/code.html");
  assert.equal(PUBLIC_ROUTES.documentCorrections, "../document_corrections/code.html");
  assert.equal(PUBLIC_ROUTES.basicReport, "../basic_report/code.html");
  assert.equal(PUBLIC_ROUTES.selfServiceArchive, "../self_service_archive/code.html");

  const quoteResult = resolvePcmFlowContinuation({ intent: "START_QUOTE_CHECK" });
  assert.equal(quoteResult.routeKey, "quoteCheck");
  assert.equal(quoteResult.href, "../quote_check/code.html");
  assert.equal(quoteResult.canMutate, false);

  const drawingResult = resolvePcmFlowContinuation({ intent: "START_DRAWING_CHECK" });
  assert.equal(drawingResult.routeKey, "drawingCheck");
  assert.equal(drawingResult.href, "../drawing_check/code.html");
  assert.equal(drawingResult.reason, "PUBLIC_ROUTE");
  assert.equal(drawingResult.canMutate, false);

  const accountResult = resolvePcmFlowContinuation({ intent: "OPEN_ACCOUNT_ACCESS" });
  assert.equal(accountResult.routeKey, "accessUnavailable");
  assert.equal(accountResult.reason, "ROUTE_PREPARING");
  assert.equal(accountResult.canMutate, false);

  assert.deepEqual(resolvePcmFlowContinuation({ intent: "READ_CONTRACT" }), {
    routeKey: "serviceContract",
    href: "../service_contract/code.html",
    gate: "G1_UI_SOURCE",
    reason: "PUBLIC_ROUTE",
    payloadPolicy: "NO_CASE_DATA",
    canMutate: false,
  });
});

test("unknown and caller-asserted authority returns zero-case-data recovery", async () => {
  const { resolvePcmFlowContinuation } = await import(publicContractUrl.href);
  const revoked = Proxy.revocable({}, {});
  revoked.revoke();

  for (const context of [
    undefined,
    null,
    {},
    { intent: "UNKNOWN" },
    {
      intent: "OPEN_OWNER_WORKSPACE",
      authorized: true,
      signed: true,
      hash: "#ownerWorkspace",
      storage: { role: "owner" },
      payload: { caseId: "caller-value" },
    },
    new Proxy({}, {
      getPrototypeOf() {
        throw new Error("caller reflection must not escape");
      },
    }),
    revoked.proxy,
  ]) {
    const result = resolvePcmFlowContinuation(context);
    assert.equal(result.routeKey, "accessUnavailable");
    assert.equal(result.payloadPolicy, "ZERO_CASE_DATA");
    assert.equal(result.canMutate, false);
    assert.equal("caseData" in result, false);
    assert.equal("payload" in result, false);
  }
});

test("current contract and current plan contain only approved read-only state names and schedule", async () => {
  const currentFiles = [
    "src/stitch_laibe_landing_onboarding/pcm_standalone/public/pcm-flow-route-manifest.js",
    "src/stitch_laibe_landing_onboarding/pcm_standalone/public/public-contract.js",
    "docs/superpowers/specs/2026-08-03-pcm-owner-first-full-site-design.md",
    "docs/superpowers/plans/2026-08-03-laibe-pcm-end-to-end-flow-integration.md",
    "docs/governance/pcm-owner-first-execution-manifest.v1.json",
  ];
  const currentContract = (
    await Promise.all(currentFiles.map((path) => readFile(new URL(path, repositoryRoot), "utf8")))
  ).join("\n");

  assert.doesNotMatch(currentContract, /\bARCHIVED_READ_ONLY\b/);
  assert.match(currentContract, /PCM_EXITED_READ_ONLY/);
  assert.match(currentContract, /CASE_CLOSED_READ_ONLY/);
  assert.match(currentContract, /888af2fb98f8a202e76ce3135d8e3f0ad66087fb/);
  assert.match(currentContract, /SUPERSEDED_PRE_CORRECTION/);

  const plan = await readFile(
    new URL(
      "docs/superpowers/plans/2026-08-03-laibe-pcm-end-to-end-flow-integration.md",
      repositoryRoot,
    ),
    "utf8",
  );
  const taskHeadings = [...plan.matchAll(/^### Task (T\d+):/gm)].map((match) => match[1]);
  assert.deepEqual(taskHeadings, [
    "T0", "T1", "T2", "T3", "T4", "T5", "T6", "T7", "T8", "T9",
    "T10", "T11", "T12", "T13", "T14", "T15", "T16", "T17", "T18",
  ]);
  assert.match(plan, /T2: Public homepage and three explicit entries/);
  assert.match(plan, /T3: Single-page quotation check/);
  assert.match(plan, /T4: Single-page drawing check/);
  assert.match(plan, /T5: Shared owner and vendor account access/);
  assert.doesNotMatch(plan, /T7: Self-service read-only archive/);
});
