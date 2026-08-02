import assert from "node:assert/strict";
import { createHash } from "node:crypto";
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
const EXPECTED_CONTRACT_SOURCE_SHA256 =
  "f207829161de7bab5370dfd8242137adcfaa74d528f35843af685bb6f18674c5";

function moduleUrl(fileName) {
  return pathToFileURL(path.join(serviceContractDir, fileName)).href;
}

function sourceHash(source) {
  return createHash("sha256").update(source, "utf8").digest("hex");
}

test("service contract exports the exact frozen v0.3 content snapshot", async () => {
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
  assert.equal(sourceHash(CONTRACT_SOURCE), EXPECTED_CONTRACT_SOURCE_SHA256);

  for (const heading of [
    "第一條",
    "第二條",
    "第三條",
    "第四條",
    "第五條",
    "第六條",
    "第七條",
    "第八條",
    "第九條",
    "第十條",
    "第十一條",
    "第十二條",
    "第十三條",
    "第十四條",
    "第十五條",
    "第十六條",
    "第十七條",
    "第十八條",
    "第十九條",
    "第二十條",
    "第二十一條",
    "第二十二條",
    "第二十三條",
    "第二十四條",
    "第二十五條",
    "第二十六條",
    "第二十七條",
    "第二十八條",
  ]) {
    assert.match(CONTRACT_SOURCE, new RegExp(`^## ${heading}[　\\s]`, "m"));
  }
  for (const heading of [
    "附件一",
    "附件二",
    "附件三",
    "附件四",
    "附件五",
    "附件六",
    "附件七",
    "附件八",
    "附件九",
    "附件十",
    "附件十一",
    "附件十二",
    "附件十三",
    "附件十四",
  ]) {
    assert.match(CONTRACT_SOURCE, new RegExp(`^# ${heading}[　\\s]`, "m"));
  }

  for (const forbidden of [
    "localStorage",
    "PREVIEWED",
    "OWNER_SIGNED_PENDING_PCM_REVIEW",
    "PCM_REVIEWER_SIGNED_ACTIVE",
    "LEGAL_FINAL",
  ]) {
    assert.equal(CONTRACT_SOURCE.includes(forbidden), false, forbidden);
  }
});

test("signing readiness evaluates the production initial envelope and fails closed for every mutation", async () => {
  const { CONTRACT_META } = await import(moduleUrl("contract-content.js"));
  const {
    INITIAL_SIGNING_ENVELOPE,
    evaluateSigningReadiness,
  } = await import(moduleUrl("app.js"));

  assert.deepEqual(INITIAL_SIGNING_ENVELOPE, {
    contractVersionHash: "",
    ownerIdentityVerified: false,
    ownerPartyId: "",
    serviceProviderPartySnapshot: null,
    writerReady: false,
    legalReviewStatus: CONTRACT_META.legalReviewStatus,
  });
  const initialResult = evaluateSigningReadiness(INITIAL_SIGNING_ENVELOPE);
  assert.equal(initialResult.ready, false);
  assert.ok(initialResult.reasons.length > 0);

  const readyEnvelope = {
    ...INITIAL_SIGNING_ENVELOPE,
    contractVersionHash: EXPECTED_CONTRACT_SOURCE_SHA256,
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
    ["missing SHA-256", (envelope) => delete envelope.contractVersionHash],
    ["short SHA-256", (envelope) => { envelope.contractVersionHash = "a".repeat(63); }],
    ["uppercase SHA-256", (envelope) => { envelope.contractVersionHash = EXPECTED_CONTRACT_SOURCE_SHA256.toUpperCase(); }],
    ["nonhex SHA-256", (envelope) => { envelope.contractVersionHash = "g".repeat(64); }],
    ["owner identity false", (envelope) => { envelope.ownerIdentityVerified = false; }],
    ["missing owner party id", (envelope) => delete envelope.ownerPartyId],
    ["empty owner party id", (envelope) => { envelope.ownerPartyId = ""; }],
    ["provider snapshot null", (envelope) => { envelope.serviceProviderPartySnapshot = null; }],
    ["provider wrong party type", (envelope) => { envelope.serviceProviderPartySnapshot.partyType = "organization"; }],
    ["provider missing party id", (envelope) => delete envelope.serviceProviderPartySnapshot.partyId],
    ["provider empty party id", (envelope) => { envelope.serviceProviderPartySnapshot.partyId = ""; }],
    ["provider missing signatory actor id", (envelope) => delete envelope.serviceProviderPartySnapshot.signatoryActorId],
    ["provider empty signatory actor id", (envelope) => { envelope.serviceProviderPartySnapshot.signatoryActorId = ""; }],
    ["writer false", (envelope) => { envelope.writerReady = false; }],
    ["writer missing", (envelope) => delete envelope.writerReady],
    ["legal status wrong", (envelope) => { envelope.legalReviewStatus = CONTRACT_META.legalReviewStatus; }],
    ["legal status missing", (envelope) => delete envelope.legalReviewStatus],
  ];

  for (const [label, mutate] of mutations) {
    const candidate = structuredClone(readyEnvelope);
    mutate(candidate);
    const result = evaluateSigningReadiness(candidate);
    assert.deepEqual(Object.keys(result), ["ready", "reasons"], label);
    assert.equal(result.ready, false, label);
    assert.ok(Array.isArray(result.reasons), label);
    assert.ok(result.reasons.length > 0, label);
    assert.ok(
      result.reasons.every(
        (reason) => typeof reason === "string" && reason.trim().length > 0,
      ),
      label,
    );
  }
});

test("service contract source has no legacy runtime, signing methods, or preview statuses", async () => {
  const source = (
    await Promise.all(
      ["contract-content.js", "app.js", "code.html", "styles.css"].map(
        (fileName) => readFile(path.join(serviceContractDir, fileName), "utf8"),
      ),
    )
  ).join("\n");

  assert.doesNotMatch(source, /laibe-pcm-contract\.js/i);
  assert.doesNotMatch(
    source,
    /\b(?:load|save|ownerSign|reviewerSign|markPreviewed)\s*\(/,
  );
  assert.doesNotMatch(source, /localStorage/);
  for (const status of [
    "PREVIEWED",
    "OWNER_SIGNED_PENDING_PCM_REVIEW",
    "PCM_REVIEWER_SIGNED_ACTIVE",
  ]) {
    assert.doesNotMatch(source, new RegExp(status));
  }
});

test("service contract page uses the production initial envelope and disables signing by default", async () => {
  const html = await readFile(path.join(serviceContractDir, "code.html"), "utf8");
  const appSource = await readFile(path.join(serviceContractDir, "app.js"), "utf8");
  const signButton = [...html.matchAll(/<button\b[\s\S]*?<\/button>/gi)]
    .map(([button]) => button)
    .find((button) => /簽署|sign/i.test(button));

  assert.ok(signButton);
  assert.match(signButton, /\bdisabled(?:\s*=\s*["']disabled["'])?/i);
  assert.match(signButton, /aria-disabled=["']true["']/i);
  assert.match(appSource, /INITIAL_SIGNING_ENVELOPE/);
  assert.match(
    appSource,
    /evaluateSigningReadiness\(\s*INITIAL_SIGNING_ENVELOPE\s*\)/,
  );
});
