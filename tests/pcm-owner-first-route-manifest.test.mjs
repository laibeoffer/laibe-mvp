import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const repositoryRoot = new URL("../", import.meta.url);
const pcmRoot = new URL(
  "src/stitch_laibe_landing_onboarding/pcm_standalone/",
  repositoryRoot,
);
const publicContractUrl = new URL("public/public-contract.js", pcmRoot);
const routeManifestUrl = new URL("public/pcm-flow-route-manifest.js", pcmRoot);

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

test("future canonical entry routes are planned, non-clickable, and 404-safe", async () => {
  const { PCM_FLOW_ROUTE_MANIFEST } = await import(routeManifestUrl.href);
  const byId = new Map(PCM_FLOW_ROUTE_MANIFEST.nodes.map((node) => [node.id, node]));

  for (const routeId of ["quoteCheck", "drawingCheck", "accountAccess"]) {
    const node = byId.get(routeId);
    assert.equal(node.lifecycle, "planned");
    assert.equal(node.href, null);
  }
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

test("public contract exposes future entries without turning planned routes into links", async () => {
  const { PUBLIC_ROUTES, resolvePcmFlowContinuation } = await import(
    publicContractUrl.href
  );

  assert.equal(PUBLIC_ROUTES.quoteCheck, null);
  assert.equal(PUBLIC_ROUTES.drawingCheck, null);
  assert.equal(PUBLIC_ROUTES.accountAccess, null);
  assert.equal(PUBLIC_ROUTES.ownerStart, "../owner_start/code.html");
  assert.equal(PUBLIC_ROUTES.documentCorrections, "../document_corrections/code.html");
  assert.equal(PUBLIC_ROUTES.basicReport, "../basic_report/code.html");
  assert.equal(PUBLIC_ROUTES.selfServiceArchive, "../self_service_archive/code.html");

  for (const intent of [
    "START_QUOTE_CHECK",
    "START_DRAWING_CHECK",
    "OPEN_ACCOUNT_ACCESS",
  ]) {
    const result = resolvePcmFlowContinuation({ intent });
    assert.equal(result.routeKey, "accessUnavailable");
    assert.equal(result.reason, "ROUTE_PREPARING");
    assert.equal(result.canMutate, false);
  }

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
