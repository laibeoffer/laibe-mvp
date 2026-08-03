import assert from "node:assert/strict";
import { access } from "node:fs/promises";
import test from "node:test";

const pcmRoot = new URL(
  "../src/stitch_laibe_landing_onboarding/pcm_standalone/",
  import.meta.url,
);
const publicContractUrl = new URL("public/public-contract.js", pcmRoot);
const routeManifestUrl = new URL("public/pcm-flow-route-manifest.js", pcmRoot);

test("route manifest names every owner-first gate and route state", async () => {
  const { PCM_FLOW_ROUTE_MANIFEST } = await import(routeManifestUrl.href);

  assert.deepEqual(
    PCM_FLOW_ROUTE_MANIFEST.gates.map(({ id }) => id),
    ["G1_UI_SOURCE", "G2_AUTH_RUNTIME", "G3_DURABLE_DATA", "G4_PRODUCTION"],
  );

  const nodeIds = new Set(PCM_FLOW_ROUTE_MANIFEST.nodes.map(({ id }) => id));
  for (const requiredId of [
    "home",
    "ownerStart",
    "documentCorrections",
    "basicReport",
    "serviceDecision",
    "selfServiceArchive",
    "serviceContract",
    "contractPrerequisites",
    "contractSigning",
    "ownerWorkspace",
    "accessUnavailable",
  ]) {
    assert.equal(nodeIds.has(requiredId), true, `missing route node: ${requiredId}`);
  }

  assert.deepEqual(
    new Set(PCM_FLOW_ROUTE_MANIFEST.nodes.map(({ lifecycle }) => lifecycle)),
    new Set(["active", "planned", "retired"]),
  );
  assert.equal(
    PCM_FLOW_ROUTE_MANIFEST.nodes.every(({ role, owner }) => role && owner),
    true,
  );
});

test("active routes resolve locally while planned routes remain non-clickable", async () => {
  const { PCM_FLOW_ROUTE_MANIFEST } = await import(routeManifestUrl.href);
  const activeNodes = PCM_FLOW_ROUTE_MANIFEST.nodes.filter(
    ({ lifecycle }) => lifecycle === "active",
  );

  for (const node of activeNodes) {
    assert.equal(typeof node.href, "string", `${node.id} must expose an href`);
    const pathOnly = node.href.split(/[?#]/, 1)[0];
    await access(new URL(pathOnly, routeManifestUrl));
  }

  for (const node of PCM_FLOW_ROUTE_MANIFEST.nodes.filter(
    ({ lifecycle }) => lifecycle === "planned",
  )) {
    assert.equal("href" in node, false, `${node.id} must not expose an href`);
  }
});

test("route graph covers forward, back, pending, and recovery edges", async () => {
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

test("public contract exposes the complete owner-first route vocabulary", async () => {
  const { PUBLIC_ROUTES } = await import(publicContractUrl.href);

  for (const routeKey of [
    "home",
    "ownerStart",
    "documentCorrections",
    "basicReport",
    "serviceDecision",
    "selfServiceArchive",
    "serviceContract",
    "contractPrerequisites",
    "contractSigning",
    "ownerWorkspace",
    "accessUnavailable",
  ]) {
    assert.equal(typeof PUBLIC_ROUTES[routeKey], "string", routeKey);
  }
});

test("continuation resolver stays closed for missing, invalid, or caller-asserted authority", async () => {
  const { resolvePcmFlowContinuation } = await import(publicContractUrl.href);

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
    },
  ]) {
    const result = resolvePcmFlowContinuation(context);
    assert.equal(result.routeKey, "accessUnavailable");
    assert.equal(result.href, "../access_unavailable/code.html");
    assert.equal(result.canMutate, false);
    assert.equal("caseData" in result, false);
    assert.equal("payload" in result, false);
  }
});

test("continuation resolver permits only public G1 intents", async () => {
  const { resolvePcmFlowContinuation } = await import(publicContractUrl.href);

  assert.deepEqual(resolvePcmFlowContinuation({ intent: "START_OWNER" }), {
    routeKey: "ownerStart",
    href: "../owner_start/code.html",
    gate: "G1_UI_SOURCE",
    reason: "PUBLIC_ROUTE",
    canMutate: false,
  });
  assert.equal(
    resolvePcmFlowContinuation({ intent: "READ_CONTRACT" }).routeKey,
    "serviceContract",
  );
  assert.equal(
    resolvePcmFlowContinuation({ intent: "SIGN_CONTRACT" }).routeKey,
    "accessUnavailable",
  );
});
