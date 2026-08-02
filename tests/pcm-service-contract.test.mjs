import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const serviceContractDir = path.join(
  packageRoot,
  "src",
  "stitch_laibe_landing_onboarding",
  "pcm_standalone",
  "service_contract",
);

function moduleUrl(fileName) {
  return pathToFileURL(path.join(serviceContractDir, fileName)).href;
}

test("service contract exports the frozen v0.3 content snapshot", async () => {
  const { CONTRACT_META, CONTRACT_SOURCE, LIFECYCLE } = await import(
    moduleUrl("contract-content.js"),
  );

  assert.equal(CONTRACT_META.version, "v0.3");
  assert.equal(CONTRACT_META.ownerServiceFeeRate, "3.5%");
  assert.equal(CONTRACT_META.legalReviewStatus, "READY_FOR_LEGAL_REVIEW");
  assert.deepEqual(LIFECYCLE, [
    "DRAFT",
    "OWNER_ACCEPTANCE_PENDING",
    "OWNER_ACCEPTED_PROVIDER_PENDING",
    "ACTIVE",
  ]);
  assert.match(CONTRACT_SOURCE, /## 蝚砌\?璇\?/);
  assert.match(CONTRACT_SOURCE, /## 蝚砌\?\?璇\?/);
  assert.match(CONTRACT_SOURCE, /# \?辣\?\?/);

  for (const forbidden of [
    "localStorage",
    "PREVIEWED",
    "OWNER_SIGNED_PENDING_PCM_REVIEW",
    "PCM_REVIEWER_SIGNED_ACTIVE",
    "LEGAL_FINAL嚗?撣急??",
  ]) {
    assert.equal(CONTRACT_SOURCE.includes(forbidden), false, forbidden);
  }
});

test("signing readiness is fail-closed for every required envelope field", async () => {
  const { CONTRACT_META } = await import(moduleUrl("contract-content.js"));
  const { evaluateSigningReadiness } = await import(moduleUrl("app.js"));
  const readyEnvelope = {
    contractVersionHash: "a".repeat(64),
    ownerIdentityVerified: true,
    ownerPartyId: "owner-001",
    serviceProviderPartySnapshot: {
      partyType: "natural_person",
      partyId: "provider-001",
      signatoryActorId: "actor-001",
    },
    writerReady: true,
    legalReviewStatus: "LEGAL_FINAL",
  };

  assert.deepEqual(evaluateSigningReadiness(readyEnvelope), {
    ready: true,
    reasons: [],
  });

  const mutations = [
    ["contractVersionHash", ""],
    ["ownerIdentityVerified", false],
    ["ownerPartyId", ""],
    ["serviceProviderPartySnapshot", null],
    ["writerReady", false],
    ["legalReviewStatus", CONTRACT_META.legalReviewStatus],
  ];

  for (const [field, value] of mutations) {
    const envelope = { ...readyEnvelope, [field]: value };
    assert.deepEqual(evaluateSigningReadiness(envelope).ready, false, field);
  }

  const initialEnvelope = {
    ...readyEnvelope,
    contractVersionHash: "",
    ownerIdentityVerified: false,
    ownerPartyId: "",
    serviceProviderPartySnapshot: null,
    writerReady: false,
    legalReviewStatus: CONTRACT_META.legalReviewStatus,
  };
  assert.equal(evaluateSigningReadiness(initialEnvelope).ready, false);
});

test("service contract page exists and keeps signing disabled until readiness is trusted", async () => {
  const html = await readFile(path.join(serviceContractDir, "code.html"), "utf8");
  const source = await readFile(path.join(serviceContractDir, "app.js"), "utf8");

  assert.match(html, /disabled/);
  assert.match(html, /aria-disabled=["']true["']/);
  assert.match(source, /legalReviewStatus:\s*CONTRACT_META\.legalReviewStatus/);
  assert.doesNotMatch(source, /localStorage|PREVIEWED|OWNER_SIGNED_PENDING_PCM_REVIEW/);
});
