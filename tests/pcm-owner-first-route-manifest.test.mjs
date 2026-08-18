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
  "aboutDrs",
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
  "PCM_EXITED_BILATERAL_CONTINUATION",
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

test("Public Home service confirmation publishes one explicit owner contract-management link", async () => {
  const {
    PCM_FLOW_ROUTE_MANIFEST,
    getActiveCanonicalLinkHref,
  } = await import(`${routeManifestUrl.href}?home-contract-management=${Date.now()}`);
  const routeId = "homeServiceConfirmationToOwnerContractManagement";

  assert.ok(Array.isArray(PCM_FLOW_ROUTE_MANIFEST.canonicalLinks));
  const matches = PCM_FLOW_ROUTE_MANIFEST.canonicalLinks.filter(
    (link) => link.id === routeId,
  );
  assert.equal(matches.length, 1);
  assert.deepEqual(matches[0], {
    id: routeId,
    fromPage: "home",
    trigger: "前往契約管理",
    toPage: "ownerWorkspace",
    targetAnchor: "#owner-dashboard-panel-contract",
    relativeHref: "../../client_awarding_dashboard/code.html#owner-dashboard-panel-contract",
    canonicalHttpUrl: "http://127.0.0.1:4173/src/stitch_laibe_landing_onboarding/client_awarding_dashboard/code.html#owner-dashboard-panel-contract",
    expectedVisibleState: "甲方工作台「契約管理」主分頁已選取，預設子分頁「契約總覽」可見，案件仍保留未確認或空白的誠實狀態。",
    returnRoute: "home",
    routeState: "active",
  });
  assert.equal(
    getActiveCanonicalLinkHref(routeId),
    matches[0].relativeHref,
  );
  await access(new URL(matches[0].relativeHref.split(/[?#]/, 1)[0], routeManifestUrl));

  const serviceContract = PCM_FLOW_ROUTE_MANIFEST.nodes.find(
    (node) => node.id === "serviceContract",
  );
  assert.equal(serviceContract.href, "../service_contract/code.html");
  assert.notEqual(serviceContract.href, matches[0].relativeHref);
});

test("Public Home header DRS service contract publishes its own owner contract-management link", async () => {
  const {
    PCM_FLOW_ROUTE_MANIFEST,
    getActiveCanonicalLinkHref,
  } = await import(`${routeManifestUrl.href}?home-header-contract-management=${Date.now()}`);
  const routeId = "homeHeaderServiceContractToOwnerContractManagement";
  const expected = {
    id: routeId,
    fromPage: "home",
    trigger: "DRS 契約管理",
    toPage: "ownerWorkspace",
    targetAnchor: "#owner-dashboard-panel-contract",
    relativeHref: "../../client_awarding_dashboard/code.html#owner-dashboard-panel-contract",
    canonicalHttpUrl: "http://127.0.0.1:4173/src/stitch_laibe_landing_onboarding/client_awarding_dashboard/code.html#owner-dashboard-panel-contract",
    expectedVisibleState: "甲方工作台「契約管理」主分頁已選取，預設子分頁「契約總覽」可見，案件仍保留未確認或空白的誠實狀態。",
    returnRoute: "home",
    routeState: "active",
  };
  const matches = PCM_FLOW_ROUTE_MANIFEST.canonicalLinks.filter(
    (link) => link.id === routeId,
  );

  assert.equal(matches.length, 1);
  assert.deepEqual(matches[0], expected);
  assert.equal(getActiveCanonicalLinkHref(routeId), expected.relativeHref);
  await access(new URL(expected.relativeHref.split(/[?#]/, 1)[0], routeManifestUrl));
  assert.equal(PCM_FLOW_ROUTE_MANIFEST.version, "1.9.1");

  const selectedCardLink = PCM_FLOW_ROUTE_MANIFEST.canonicalLinks.find(
    (link) => link.id === "homeServiceConfirmationToOwnerContractManagement",
  );
  assert.equal(selectedCardLink.trigger, "前往契約管理");
  assert.equal(selectedCardLink.relativeHref, expected.relativeHref);
  assert.notEqual(selectedCardLink.id, routeId);

  const serviceContract = PCM_FLOW_ROUTE_MANIFEST.nodes.find(
    (node) => node.id === "serviceContract",
  );
  assert.equal(serviceContract.href, "../service_contract/code.html");
  assert.notEqual(serviceContract.href, expected.relativeHref);
});

test("Public Home decision controls publish exactly three real quote-check modes", async () => {
  const {
    PCM_FLOW_ROUTE_MANIFEST,
    getActiveCanonicalLinkHref,
  } = await import(`${routeManifestUrl.href}?home-decision-quote-check=${Date.now()}`);
  const expectedLinks = [
    {
      id: "homeDecisionQuoteCheckToQuoteCheck",
      trigger: "報價健檢",
      relativeHref: "../quote_check/code.html?mode=quote#document-workspace",
    },
    {
      id: "homeDecisionDrawingCheckToQuoteCheck",
      trigger: "圖說檢查",
      relativeHref: "../quote_check/code.html?mode=drawing#document-workspace",
    },
    {
      id: "homeDecisionCustomContractToQuoteCheck",
      trigger: "契約健檢",
      relativeHref: "../quote_check/code.html?mode=contract#document-workspace",
    },
  ];

  assert.equal(PCM_FLOW_ROUTE_MANIFEST.version, "1.9.1");
  assert.equal(
    PCM_FLOW_ROUTE_MANIFEST.canonicalLinks.some(
      ({ id }) => id === "homeDecisionSpecificationCheckToQuoteCheck",
    ),
    false,
  );
  assert.equal(
    getActiveCanonicalLinkHref("homeDecisionSpecificationCheckToQuoteCheck"),
    null,
  );
  for (const expected of expectedLinks) {
    const ownedLinks = PCM_FLOW_ROUTE_MANIFEST.canonicalLinks.filter(
      (link) => link.id === expected.id,
    );
    assert.equal(ownedLinks.length, 1, expected.id);
    assert.equal(ownedLinks[0].fromPage, "home");
    assert.equal(ownedLinks[0].trigger, expected.trigger);
    assert.equal(ownedLinks[0].toPage, "quoteCheck");
    assert.equal(ownedLinks[0].targetAnchor, "#document-workspace");
    assert.equal(ownedLinks[0].relativeHref, expected.relativeHref);
    assert.equal(
      ownedLinks[0].canonicalHttpUrl,
      new URL(
        expected.relativeHref,
        "http://127.0.0.1:4173/src/stitch_laibe_landing_onboarding/pcm_standalone/public/pcm-flow-route-manifest.js",
      ).href,
    );
    assert.equal(ownedLinks[0].returnRoute, "home");
    assert.equal(ownedLinks[0].routeState, "active");
    assert.equal(getActiveCanonicalLinkHref(expected.id), expected.relativeHref);
    await access(new URL(expected.relativeHref.split(/[?#]/, 1)[0], routeManifestUrl));
  }

  assert.deepEqual(
    expectedLinks.map(({ id }) => id),
    [...new Set(expectedLinks.map(({ id }) => id))],
  );
  assert.deepEqual(
    expectedLinks.map(({ trigger }) => trigger),
    [...new Set(expectedLinks.map(({ trigger }) => trigger))],
  );

  const serviceContract = PCM_FLOW_ROUTE_MANIFEST.nodes.find(
    (node) => node.id === "serviceContract",
  );
  assert.equal(serviceContract.href, "../service_contract/code.html");
  assert.notEqual(serviceContract.href, expectedLinks[0].relativeHref);
});

test("canonical header brand and CTA links cover public returns without inventing invitation access", async () => {
  const {
    PCM_FLOW_ROUTE_MANIFEST,
    getActiveCanonicalLinkHref,
  } = await import(`${routeManifestUrl.href}?canonical-header-routes=${Date.now()}`);
  const byNodeId = new Map(PCM_FLOW_ROUTE_MANIFEST.nodes.map((node) => [node.id, node]));
  const byLinkId = new Map(PCM_FLOW_ROUTE_MANIFEST.canonicalLinks.map((link) => [link.id, link]));
  const homeHref = "../public_home/code.html#top";

  assert.deepEqual(byNodeId.get("aboutDrs"), {
    id: "aboutDrs",
    publicPath: "/pcm/about-drs",
    label: "關於 DRS",
    role: "一般屋主",
    owner: "A0",
    lifecycle: "active",
    gate: "G1_UI_SOURCE",
    href: "../about_drs/code.html",
  });
  assert.equal(byLinkId.get("homeHeaderAboutDrsToAboutDrs")?.relativeHref, "../about_drs/code.html");
  assert.equal(byLinkId.get("homeHeaderAboutDrsToAboutDrs")?.trigger, "關於 DRS");

  for (const id of [
    "quoteCheckBrandToHome",
    "quoteCheckHeaderHomeToHome",
    "accountAccessBrandToHome",
    "accountAccessHeaderHomeToHome",
    "aboutDrsBrandToHome",
    "aboutDrsHeaderHomeToHome",
    "serviceContractBrandToHome",
    "serviceContractHeaderHomeToHome",
    "ownerWorkspaceBrandToHome",
    "vendorWorkspaceBrandToHome",
  ]) {
    const link = byLinkId.get(id);
    assert.equal(link?.toPage, "home", id);
    assert.equal(link?.relativeHref, homeHref, id);
    assert.equal(link?.routeState, "active", id);
    assert.equal(getActiveCanonicalLinkHref(id), homeHref, id);
  }

  const accountCheck = byLinkId.get("accountAccessHeaderStartDocumentCheckToQuoteCheck");
  assert.equal(accountCheck?.trigger, "開始文件健檢");
  assert.equal(accountCheck?.relativeHref, "../quote_check/code.html?mode=quote#document-workspace");
  assert.equal(accountCheck?.targetAnchor, "#document-workspace");

  const conditionalOwnerReturn = byLinkId.get("serviceContractTrustedOwnerReturnToOwnerContractManagement");
  assert.equal(conditionalOwnerReturn?.relativeHref, "../../client_awarding_dashboard/code.html#owner-dashboard-panel-contract");
  assert.equal(conditionalOwnerReturn?.trigger, "returnTo=owner-contract");
  assert.equal(conditionalOwnerReturn?.routeState, "conditional");
  assert.equal(
    getActiveCanonicalLinkHref("serviceContractTrustedOwnerReturnToOwnerContractManagement"),
    null,
  );
  assert.equal(
    getActiveCanonicalLinkHref(
      "serviceContractTrustedOwnerReturnToOwnerContractManagement",
      "returnTo=owner-contract",
    ),
    conditionalOwnerReturn.relativeHref,
  );
  assert.equal(
    getActiveCanonicalLinkHref(
      "serviceContractTrustedOwnerReturnToOwnerContractManagement",
      "returnTo=vendor",
    ),
    null,
  );

  assert.equal(byNodeId.get("vendorInvitation")?.lifecycle, "planned");
  assert.equal(byNodeId.get("vendorInvitation")?.href, null);
});

test("Owner Workspace publishes one service-contract entry with a trusted contract-management return", async () => {
  const {
    PCM_FLOW_ROUTE_MANIFEST,
    getActiveCanonicalLinkHref,
  } = await import(`${routeManifestUrl.href}?owner-service-contract=${Date.now()}`);
  const routeId = "ownerWorkspaceContractManagementToServiceContract";
  const matches = PCM_FLOW_ROUTE_MANIFEST.canonicalLinks.filter(
    (link) => link.id === routeId,
  );

  assert.equal(PCM_FLOW_ROUTE_MANIFEST.version, "1.9.1");
  assert.equal(matches.length, 1);
  assert.deepEqual(matches[0], {
    id: routeId,
    fromPage: "ownerWorkspace",
    trigger: "了解並確認 DRS 服務契約",
    toPage: "serviceContract",
    targetAnchor: "#full-contract",
    relativeHref: "../pcm_standalone/service_contract/code.html?returnTo=owner-contract#full-contract",
    canonicalHttpUrl: "http://127.0.0.1:4173/src/stitch_laibe_landing_onboarding/pcm_standalone/service_contract/code.html?returnTo=owner-contract#full-contract",
    expectedVisibleState: "從甲方工作台契約管理進入 DRS 服務契約完整內容；服務契約頁可返回甲方契約管理。",
    returnRoute: "ownerWorkspace",
    routeState: "active",
  });
  assert.equal(getActiveCanonicalLinkHref(routeId), matches[0].relativeHref);
  const ownerWorkspacePageUrl = new URL(
    "src/stitch_laibe_landing_onboarding/client_awarding_dashboard/code.html",
    repositoryRoot,
  );
  await access(new URL(matches[0].relativeHref.split(/[?#]/, 1)[0], ownerWorkspacePageUrl));

  const conditionalOwnerReturn = PCM_FLOW_ROUTE_MANIFEST.canonicalLinks.find(
    (link) => link.id === "serviceContractTrustedOwnerReturnToOwnerContractManagement",
  );
  assert.equal(conditionalOwnerReturn.trigger, "returnTo=owner-contract");
  assert.equal(conditionalOwnerReturn.routeState, "conditional");
  assert.notEqual(matches[0].id, conditionalOwnerReturn.id);
});

test("Vendor Workspace publishes one active account-access recovery link while invitation stays planned", async () => {
  const {
    PCM_FLOW_ROUTE_MANIFEST,
    getActiveCanonicalLinkHref,
  } = await import(`${routeManifestUrl.href}?vendor-access-recovery=${Date.now()}`);
  const routeId = "vendorWorkspaceAccessRecoveryToAccountAccess";
  const expected = {
    id: routeId,
    fromPage: "vendorWorkspace",
    trigger: "返回登入／帳號入口",
    toPage: "accountAccess",
    targetAnchor: "#top",
    relativeHref: "../account_access/code.html#top",
    canonicalHttpUrl: "http://127.0.0.1:4173/src/stitch_laibe_landing_onboarding/pcm_standalone/account_access/code.html#top",
    expectedVisibleState: "使用者回到帳號入口選擇或確認角色，不帶入任何案件資料。",
    returnRoute: "vendorWorkspace",
    routeState: "active",
  };
  const matches = PCM_FLOW_ROUTE_MANIFEST.canonicalLinks.filter(
    (link) => link.id === routeId,
  );
  const invitation = PCM_FLOW_ROUTE_MANIFEST.nodes.find(
    (node) => node.id === "vendorInvitation",
  );

  assert.equal(PCM_FLOW_ROUTE_MANIFEST.version, "1.9.1");
  assert.equal(matches.length, 1);
  assert.deepEqual(matches[0], expected);
  assert.equal(getActiveCanonicalLinkHref(routeId), expected.relativeHref);
  assert.equal(invitation?.lifecycle, "planned");
  assert.equal(invitation?.href, null);
  await access(new URL(expected.relativeHref.split(/[?#]/, 1)[0], routeManifestUrl));
});

test("Account Access holds the Owner normal route while the Vendor route remains active", async () => {
  const {
    PCM_FLOW_ROUTE_MANIFEST,
    getActiveCanonicalLinkHref,
  } = await import(`${routeManifestUrl.href}?account-role-routes=${Date.now()}`);
  const expectedLinks = [
    {
      id: "accountAccessOwnerLoginToOwnerWorkspace",
      fromPage: "accountAccess",
      trigger: "valid login submit with owner role selected",
      toPage: "ownerWorkspace",
      targetAnchor: null,
      relativeHref: null,
      canonicalHttpUrl: null,
      expectedVisibleState: "正式身分入口尚未完成，甲方案件工作台正常入口仍在等待。",
      returnRoute: "accountAccess",
      routeState: "hold",
    },
    {
      id: "accountAccessInvitedPartnerLoginToVendorWorkspace",
      fromPage: "accountAccess",
      trigger: "valid login submit with invited-partner role selected",
      toPage: "vendorWorkspace",
      targetAnchor: null,
      relativeHref: "../vendor_workspace/code.html",
      canonicalHttpUrl: "http://127.0.0.1:4173/src/stitch_laibe_landing_onboarding/pcm_standalone/vendor_workspace/code.html",
      expectedVisibleState: "乙方案件工作台載入；身分與案件範圍未確認時維持零案件資料與安全空狀態。",
      returnRoute: "accountAccess",
      routeState: "active",
    },
  ];

  assert.equal(PCM_FLOW_ROUTE_MANIFEST.version, "1.9.1");
  for (const expected of expectedLinks) {
    const matches = PCM_FLOW_ROUTE_MANIFEST.canonicalLinks.filter(
      (link) => link.id === expected.id,
    );
    assert.equal(matches.length, 1, expected.id);
    assert.deepEqual(matches[0], expected);
    assert.equal(
      getActiveCanonicalLinkHref(expected.id),
      expected.routeState === "active" ? expected.relativeHref : null,
    );
    if (expected.relativeHref) {
      await access(new URL(expected.relativeHref, routeManifestUrl));
    }
  }

  const byId = new Map(PCM_FLOW_ROUTE_MANIFEST.nodes.map((node) => [node.id, node]));
  assert.deepEqual(byId.get("vendorWorkspace"), {
    id: "vendorWorkspace",
    publicPath: "/pcm/vendor/workspace",
    label: "乙方案件工作台",
    role: "已授權乙方",
    owner: "A6",
    lifecycle: "active",
    gate: "G1_UI_SOURCE",
    href: "../vendor_workspace/code.html",
  });
});

test("admitted UI routes are active while the remaining runtime routes stay planned and 404-safe", async () => {
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
  assert.equal(accountAccess.lifecycle, "active");
  assert.equal(accountAccess.href, "../account_access/code.html");
  await access(new URL(accountAccess.href, routeManifestUrl));
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
    ["home", "accountAccess"],
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

test("failure and continuation matrix is complete, typed, actionable, and recoverable", async () => {
  const { PCM_FLOW_ROUTE_MANIFEST } = await import(routeManifestUrl.href);
  const matrix = PCM_FLOW_ROUTE_MANIFEST.failureMatrix;
  const edges = PCM_FLOW_ROUTE_MANIFEST.failureEdges;
  const nodeIds = new Set(PCM_FLOW_ROUTE_MANIFEST.nodes.map(({ id }) => id));

  assert.deepEqual(Object.keys(matrix), requiredFailureCodes);
  for (const code of requiredFailureCodes) {
    const state = matrix[code];
    assert.equal(state.code, code);
    assert.equal(state.type, code === "PCM_EXITED_BILATERAL_CONTINUATION" ? "CONTINUATION" : "CLOSED");
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

test("PCM exit preserves bilateral continuation while closed cases remain read-only", async () => {
  const { PCM_FLOW_ROUTE_MANIFEST } = await import(routeManifestUrl.href);

  const continuation = PCM_FLOW_ROUTE_MANIFEST.failureMatrix.PCM_EXITED_BILATERAL_CONTINUATION;
  assert.equal(continuation.type, "CONTINUATION");
  assert.equal(continuation.payloadPolicy, "PRESERVE_BILATERAL_CASE_CONTINUATION");
  assert.equal(continuation.mutationAllowed, false);
  assert.equal(continuation.caseMode, "BILATERAL_CONTINUATION");
  assert.equal(continuation.pcmMode, "HISTORICAL_READ_ONLY");
  assert.equal(continuation.caseClosed, false);
  assert.equal(continuation.caseArchived, false);
  assert.equal(continuation.bilateralContinuationAllowed, true);
  assert.equal(continuation.newPcmOperationsAllowed, false);
  assert.equal(continuation.rejoinRequiresNewAuthorization, true);
  assert.deepEqual([...continuation.preserveResources], [
    "workspaces", "contract", "documents", "messages", "schedules",
    "evidence", "acceptance", "changes", "addenda", "caseRecords",
  ]);
  assert.deepEqual(continuation.workspaceByRole, { owner: "ownerWorkspace", vendor: "vendorWorkspace" });

  const closed = PCM_FLOW_ROUTE_MANIFEST.failureMatrix.CASE_CLOSED_READ_ONLY;
  assert.equal(closed.payloadPolicy, "PRESERVE_EXISTING_CASE_READ_ONLY");
  assert.equal(closed.mutationAllowed, false);
  assert.deepEqual([...closed.actions], []);
  assert.deepEqual(closed.workspaceByRole, { owner: "ownerWorkspace", vendor: "vendorWorkspace" });

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

test("PCM continuation actions and exact resource list reject post-load Array pollution", async () => {
  const { PCM_FLOW_ROUTE_MANIFEST } = await import(`${routeManifestUrl.href}?continuation-list=${Date.now()}`);
  const { resolvePcmFlowContinuation } = await import(`${publicContractUrl.href}?continuation-list=${Date.now()}`);
  const originalIndex = Object.getOwnPropertyDescriptor(Array.prototype, "0");
  const originalIterator = Object.getOwnPropertyDescriptor(Array.prototype, Symbol.iterator);
  let manifestAction;
  let manifestResources;
  let resolverResources;

  try {
    Object.defineProperty(Array.prototype, "0", {
      configurable: true,
      value: "forged-action",
    });
    Object.defineProperty(Array.prototype, Symbol.iterator, {
      configurable: true,
      value: function* forgedContinuationIterator() {
        yield "forged-resource";
      },
    });

    const continuation = PCM_FLOW_ROUTE_MANIFEST.failureMatrix.PCM_EXITED_BILATERAL_CONTINUATION;
    manifestAction = continuation.actions[0];
    manifestResources = [...continuation.preserveResources].join("|");
    resolverResources = [
      ...resolvePcmFlowContinuation({
        intent: "PCM_EXITED_BILATERAL_CONTINUATION",
        role: "owner",
      }).preserveResources,
    ].join("|");
  } finally {
    if (originalIndex) Object.defineProperty(Array.prototype, "0", originalIndex);
    else delete Array.prototype[0];
    if (originalIterator) Object.defineProperty(Array.prototype, Symbol.iterator, originalIterator);
    else delete Array.prototype[Symbol.iterator];
  }

  const exactResources = "workspaces|contract|documents|messages|schedules|evidence|acceptance|changes|addenda|caseRecords";
  assert.equal(manifestAction, undefined);
  assert.equal(manifestResources, exactResources);
  assert.equal(resolverResources, exactResources);
});

test("continuation and closed outcomes bind exact primitive roles without vendor-to-owner fallback", async () => {
  const { resolvePcmFlowContinuation } = await import(publicContractUrl.href);

  for (const intent of ["PCM_EXITED_BILATERAL_CONTINUATION", "CASE_CLOSED_READ_ONLY"]) {
    const expectedPolicy = intent === "PCM_EXITED_BILATERAL_CONTINUATION"
      ? "PRESERVE_BILATERAL_CASE_CONTINUATION"
      : "PRESERVE_EXISTING_CASE_READ_ONLY";
    const owner = resolvePcmFlowContinuation({ intent, role: "owner" });
    assert.equal(owner.routeKey, "ownerWorkspace");
    assert.equal(typeof owner.href, "string");
    assert.equal(owner.authorityGate, "G2_AUTH_RUNTIME");
    assert.equal(owner.payloadPolicy, expectedPolicy);
    assert.equal(owner.canMutate, false);

    const vendor = resolvePcmFlowContinuation({ intent, role: "vendor" });
    assert.equal(vendor.routeKey, "vendorWorkspace");
    assert.notEqual(vendor.routeKey, "ownerWorkspace");
    assert.equal(vendor.href, "../vendor_workspace/code.html");
    assert.equal(vendor.authorityGate, "G2_AUTH_RUNTIME");
    assert.equal(vendor.payloadPolicy, expectedPolicy);
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
        return { configurable: true, enumerable: true, value: "PCM_EXITED_BILATERAL_CONTINUATION" };
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
        yield "PCM_EXITED_BILATERAL_CONTINUATION";
        yield "owner";
      },
    });
    try {
      unknown = resolvePcmFlowContinuation({ intent: "UNKNOWN" });
      owner = resolvePcmFlowContinuation({
        intent: "PCM_EXITED_BILATERAL_CONTINUATION",
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

  assert.equal(integration.status, "SUPERSEDED_BY_T4_ROUTE_TRUTH_CORRECTION");
  assert.equal(integration.candidateCommit, "fd7a5719f545033a6b27c51ce028f95ba3f35a9f");
  assert.equal(integration.sourceAdmission, "ADMITTED_G1_UI_SOURCE_ONLY");
  assert.equal(integration.sourceCommit, "ca90ecdd3fb0191c8f3ae4f420c2011758908521");
  assert.equal(integration.integrationParent, "7464e8332932ce48b48044d5b738a2534335156b");
  assert.deepEqual(integration.integrationWriteSet, expectedWriteSet);
  assert.equal(integration.outsideWriteSet, 0);
  assert.equal(integration.publicContractByteFrozen, true);
  assert.deepEqual(integration.fullSuite, {
    command: "node --test tests/pcm-*.test.mjs",
    files: 12,
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
  assert.equal(integration.independentReview.important, 1);
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
    const immutable = spawnSync(
      "git",
      ["show", `${integration.candidateCommit}:${receipt.path}`],
      { cwd: repositoryRoot, encoding: null, maxBuffer: 16 * 1024 * 1024 },
    );
    assert.equal(immutable.status, 0, immutable.stderr?.toString() ?? receipt.path);
    const bytes = immutable.stdout;
    assert.equal(receipt.bytes, bytes.length, receipt.path);
    assert.equal(
      receipt.sha256,
      createHash("sha256").update(bytes).digest("hex"),
      receipt.path,
    );
    assert.equal(receipt.gitBlobSha1, gitBlobSha1(bytes), receipt.path);
    assert.equal(receipt.scope, "immutable_fd7_commit_blob_bytes", receipt.path);
  }
});

test("T4 route-truth correction binds exact-seven current bytes and the twelve-file suite", async () => {
  const manifest = JSON.parse(await readFile(governanceManifestUrl, "utf8"));
  const correction = manifest.t4RouteTruthCorrection;
  assert.equal(correction.candidateCommit, "35bb499b9c549e1a0013eace1c8f7d3070014bca");
  const expectedWriteSet = [
    "src/stitch_laibe_landing_onboarding/pcm_standalone/quote_check/code.html",
    "src/stitch_laibe_landing_onboarding/pcm_standalone/quote_check/app.js",
    "tests/pcm-owner-first-quote-check.test.mjs",
    "tests/pcm-owner-first-route-manifest.test.mjs",
    "docs/governance/pcm-owner-first-execution-manifest.v1.json",
    "docs/superpowers/specs/2026-08-03-pcm-owner-first-full-site-design.md",
    "docs/superpowers/plans/2026-08-03-laibe-pcm-end-to-end-flow-integration.md",
  ];
  const expectedFiles = [
    "pcm-contracted-owner-workspace.test.mjs",
    "pcm-full-flow-visual-port.test.mjs",
    "pcm-governance-pages.test.mjs",
    "pcm-missing-flow-pages.test.mjs",
    "pcm-owner-first-drawing-check.test.mjs",
    "pcm-owner-first-public-home.test.mjs",
    "pcm-owner-first-quote-check.test.mjs",
    "pcm-owner-first-route-manifest.test.mjs",
    "pcm-owner-first-shared-system.test.mjs",
    "pcm-public-home.test.mjs",
    "pcm-service-contract.test.mjs",
    "pcm-standalone-core.test.mjs",
  ];

  assert.equal(correction.status, "ADMITTED_G1_UI_SOURCE_ONLY");
  assert.equal(correction.parent, "fd7a5719f545033a6b27c51ce028f95ba3f35a9f");
  assert.deepEqual(correction.writeSet, expectedWriteSet);
  assert.equal(correction.outsideWriteSet, 0);
  assert.deepEqual(correction.fullSuite, {
    command: "node --test tests/pcm-*.test.mjs",
    files: 12,
    fileInventory: expectedFiles,
    tests: 216,
    passed: 216,
    failed: 0,
    exitCode: 0,
  });
  assert.equal(correction.browser.journey, "quote_check -> drawing_check");
  assert.deepEqual(correction.browser.viewports, ["1280x900", "768x1024", "390x844"]);
  assert.equal(correction.browser.destinationReached, "3/3");
  assert.equal(correction.browser.horizontalOverflow, 0);
  assert.equal(correction.browser.visibleControlsUnder44, 0);
  assert.equal(correction.browser.consoleWarningsOrErrors, 0);
  assert.equal(correction.browser.networkFailuresOrNon2xx, 0);
  assert.equal(correction.independentReview.critical, 0);
  assert.equal(correction.independentReview.important, 0);

  const artifactPaths = expectedWriteSet.filter(
    (path) => path !== "docs/governance/pcm-owner-first-execution-manifest.v1.json",
  );
  assert.deepEqual(correction.artifactReceipts.map(({ path }) => path), artifactPaths);
  for (const receipt of correction.artifactReceipts) {
    const immutable = spawnSync(
      "git",
      ["show", `${correction.candidateCommit}:${receipt.path}`],
      { cwd: repositoryRoot, encoding: null, maxBuffer: 16 * 1024 * 1024 },
    );
    assert.equal(immutable.status, 0, immutable.stderr?.toString() ?? receipt.path);
    const bytes = immutable.stdout;
    assert.equal(receipt.bytes, bytes.length, receipt.path);
    assert.equal(receipt.sha256, createHash("sha256").update(bytes).digest("hex"), receipt.path);
    assert.equal(receipt.gitBlobSha1, gitBlobSha1(bytes), receipt.path);
    assert.equal(receipt.scope, "immutable_35bb_commit_blob_bytes", receipt.path);
  }
});

test("T5 serial integration binds admitted account source and an active zero-authority public route", async () => {
  const manifest = JSON.parse(await readFile(governanceManifestUrl, "utf8"));
  const integration = manifest.t5SourceIntegration;
  const sourceWriteSet = [
    "src/stitch_laibe_landing_onboarding/pcm_standalone/account_access/code.html",
    "src/stitch_laibe_landing_onboarding/pcm_standalone/account_access/styles.css",
    "src/stitch_laibe_landing_onboarding/pcm_standalone/account_access/app.js",
    "tests/pcm-owner-first-account-access.test.mjs",
  ];
  const integrationWriteSet = [
    "src/stitch_laibe_landing_onboarding/pcm_standalone/public/pcm-flow-route-manifest.js",
    "src/stitch_laibe_landing_onboarding/pcm_standalone/public_home/code.html",
    "tests/pcm-owner-first-route-manifest.test.mjs",
    "tests/pcm-owner-first-public-home.test.mjs",
    "tests/pcm-owner-first-account-access.test.mjs",
    "tests/pcm-owner-first-quote-check.test.mjs",
    "docs/governance/pcm-owner-first-execution-manifest.v1.json",
    "docs/superpowers/specs/2026-08-03-pcm-owner-first-full-site-design.md",
    "docs/superpowers/plans/2026-08-03-laibe-pcm-end-to-end-flow-integration.md",
  ];

  assert.equal(integration.status, "ready_for_a0_focused_review");
  assert.equal(integration.sourceAdmission, "ADMITTED_G1_UI_SOURCE_ONLY");
  assert.equal(integration.sourceCommit, "1b62e12712178451b47b6b85c2fca859c26bde83");
  assert.equal(integration.sourceAbsorptionCommit, "bd3e0678eba2bd272f05b7e787ef99a954cbb9ee");
  assert.equal(integration.integrationParent, "bd3e0678eba2bd272f05b7e787ef99a954cbb9ee");
  assert.deepEqual(integration.sourceWriteSet, sourceWriteSet);
  assert.deepEqual(integration.integrationWriteSet, integrationWriteSet);
  assert.equal(integration.outsideWriteSet, 0);
  assert.deepEqual(integration.routeOutcome, {
    publicPath: "/account/access",
    lifecycle: "active",
    href: "../account_access/code.html",
    homeEdgeClickable: true,
    payloadPolicy: "NO_CASE_DATA",
    writeAuthority: "NONE",
  });
  assert.deepEqual(integration.fullSuite, {
    command: "node --test tests/pcm-*.test.mjs",
    files: 13,
    tests: 241,
    passed: 241,
    failed: 0,
    exitCode: 0,
  });
  assert.deepEqual(integration.browser.viewports, ["1280x900", "768x1024", "390x844"]);
  assert.equal(integration.browser.destinationReached, "3/3");
  assert.equal(integration.browser.enabledWriteControls, 0);
  assert.equal(integration.browser.horizontalOverflow, 0);
  assert.equal(integration.browser.visibleControlsUnder44, 0);
  assert.equal(integration.browser.consoleWarningsOrErrors, 0);
  assert.equal(integration.browser.networkFailuresOrNon2xx, 0);
  assert.equal(integration.gates.G2_AUTH_RUNTIME, "closed");
  assert.equal(integration.gates.G3_DURABLE_DATA, "closed");
  assert.equal(integration.gates.G4_PRODUCTION, "closed");

  const artifactPaths = integrationWriteSet.filter(
    (path) => path !== "docs/governance/pcm-owner-first-execution-manifest.v1.json",
  );
  assert.deepEqual(integration.artifactReceipts.map(({ path }) => path), artifactPaths);
  for (const receipt of integration.artifactReceipts) {
    const immutable = spawnSync("git", ["cat-file", "blob", receipt.gitBlobSha1], {
      cwd: repositoryRoot,
      encoding: null,
      maxBuffer: 16 * 1024 * 1024,
    });
    assert.equal(immutable.status, 0, immutable.stderr?.toString() ?? receipt.path);
    assert.equal(receipt.bytes, immutable.stdout.length, receipt.path);
    assert.equal(receipt.sha256, createHash("sha256").update(immutable.stdout).digest("hex"), receipt.path);
    assert.equal(receipt.gitBlobSha1, gitBlobSha1(immutable.stdout), receipt.path);
    assert.equal(receipt.scope, "declared_git_blob_bytes", receipt.path);
  }
  assert.equal(integration.independentReview.critical, 0);
  assert.equal(integration.independentReview.important, 0);
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

test("public contract preserves its compatibility own-key schema while manifest owns new canonical links", async () => {
  const { PUBLIC_ROUTES, resolvePcmFlowContinuation } = await import(
    publicContractUrl.href
  );

  assert.deepEqual(Object.getOwnPropertyNames(PUBLIC_ROUTES), [
    "home",
    "startCase",
    "basicReport",
    "process",
    "quoteCheck",
    "drawingCheck",
    "accountAccess",
    "caseSetup",
    "serviceContract",
    "contractPrerequisites",
    "contractSigning",
    "ownerWorkspace",
    "homeServiceConfirmationToOwnerContractManagement",
    "homeHeaderServiceContractToOwnerContractManagement",
    "homeDecisionQuoteCheckToQuoteCheck",
    "homeDecisionDrawingCheckToQuoteCheck",
    "homeDecisionCustomContractToQuoteCheck",
    "accountAccessOwnerLoginToOwnerWorkspace",
    "accountAccessInvitedPartnerLoginToVendorWorkspace",
    "vendorWorkspace",
    "accessUnavailable",
    "ownerStart",
    "documentCorrections",
    "selfServiceArchive",
  ]);

  assert.equal(PUBLIC_ROUTES.quoteCheck, "../quote_check/code.html");
  assert.equal(PUBLIC_ROUTES.drawingCheck, "../drawing_check/code.html");
  assert.equal(PUBLIC_ROUTES.accountAccess, "../account_access/code.html");
  assert.equal(PUBLIC_ROUTES.homeDecisionQuoteCheckToQuoteCheck, "../quote_check/code.html?mode=quote#document-workspace");
  assert.equal(PUBLIC_ROUTES.homeDecisionDrawingCheckToQuoteCheck, "../quote_check/code.html?mode=drawing#document-workspace");
  assert.equal(PUBLIC_ROUTES.homeDecisionCustomContractToQuoteCheck, "../quote_check/code.html?mode=contract#document-workspace");
  for (const routeKey of [
    "aboutDrs",
    "homeHeaderAboutDrsToAboutDrs",
    "homeDecisionSpecificationCheckToQuoteCheck",
    "quoteCheckBrandToHome",
    "quoteCheckHeaderHomeToHome",
    "accountAccessBrandToHome",
    "accountAccessHeaderHomeToHome",
    "accountAccessHeaderStartDocumentCheckToQuoteCheck",
    "aboutDrsBrandToHome",
    "aboutDrsHeaderHomeToHome",
    "aboutDrsHeaderStartDocumentCheckToQuoteCheck",
    "serviceContractBrandToHome",
    "serviceContractHeaderHomeToHome",
    "serviceContractTrustedOwnerReturnToOwnerContractManagement",
    "ownerWorkspaceBrandToHome",
    "ownerWorkspaceContractManagementToServiceContract",
    "vendorWorkspaceBrandToHome",
    "vendorWorkspaceAccessRecoveryToAccountAccess",
  ]) {
    assert.equal(Object.hasOwn(PUBLIC_ROUTES, routeKey), false, routeKey);
  }
  assert.equal(PUBLIC_ROUTES.accountAccessOwnerLoginToOwnerWorkspace, null);
  assert.equal(PUBLIC_ROUTES.accountAccessInvitedPartnerLoginToVendorWorkspace, "../vendor_workspace/code.html");
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
  assert.equal(accountResult.routeKey, "accountAccess");
  assert.equal(accountResult.href, "../account_access/code.html");
  assert.equal(accountResult.reason, "PUBLIC_ROUTE");
  assert.equal(accountResult.payloadPolicy, "NO_CASE_DATA");
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

test("current contract and plan use bilateral PCM-exit continuation and approved closed state names", async () => {
  const currentFiles = [
    "src/stitch_laibe_landing_onboarding/pcm_standalone/public/pcm-flow-route-manifest.js",
    "src/stitch_laibe_landing_onboarding/pcm_standalone/public/public-contract.js",
    "docs/superpowers/specs/2026-08-03-pcm-owner-first-full-site-design.md",
    "docs/superpowers/plans/2026-08-03-laibe-pcm-end-to-end-flow-integration.md",
  ];
  const currentContract = (
    await Promise.all(currentFiles.map((path) => readFile(new URL(path, repositoryRoot), "utf8")))
  ).join("\n");

  assert.doesNotMatch(currentContract, /\bARCHIVED_READ_ONLY\b/);
  assert.doesNotMatch(currentContract, /PCM_EXITED_READ_ONLY/);
  assert.match(currentContract, /PCM_EXITED_BILATERAL_CONTINUATION/);
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
