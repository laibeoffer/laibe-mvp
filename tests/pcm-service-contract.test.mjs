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
  "1b40d6aed828dab049db579eb19324af14f251b631c1c7e587c99a594ee8222a";

function moduleUrl(fileName) {
  return pathToFileURL(path.join(serviceContractDir, fileName)).href;
}

function sourceHash(source) {
  return createHash("sha256").update(source, "utf8").digest("hex");
}

test("service contract exports the exact frozen v0.3 content snapshot", async () => {
  const {
    CONTRACT_META,
    CONTRACT_SOURCE,
    CONTRACT_SOURCE_SHA256,
    KEY_CLAUSES,
    LIFECYCLE,
  } = await import(
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
  assert.equal(CONTRACT_SOURCE_SHA256, EXPECTED_CONTRACT_SOURCE_SHA256);
  assert.equal(sourceHash(CONTRACT_SOURCE), CONTRACT_SOURCE_SHA256);

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

  const visibleContractText = `${JSON.stringify(KEY_CLAUSES)}\n${CONTRACT_SOURCE}`;
  for (const forbidden of [
    "localStorage",
    "MVP",
    "API",
    "Evidence Packet",
    "資料庫",
    "preview",
    "memo",
    "ProjectRequirementBrief",
    "金流",
    "代收代付",
    "服務方未來如提供金流",
    "除雙方另有明確書面約定外，服務方不收受",
    "PREVIEWED",
    "OWNER_SIGNED_PENDING_PCM_REVIEW",
    "PCM_REVIEWER_SIGNED_ACTIVE",
    "LEGAL_FINAL",
  ]) {
    assert.equal(visibleContractText.includes(forbidden), false, forbidden);
  }
  assert.doesNotMatch(CONTRACT_SOURCE, /\[\[[^\]]+\]\]/);
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
    ["different lowercase SHA-256", (envelope) => { envelope.contractVersionHash = "a".repeat(64); }],
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

test("signing readiness rejects non-record inputs without throwing", async () => {
  const { evaluateSigningReadiness } = await import(moduleUrl("app.js"));
  const invalidInputs = [
    ["null", null],
    ["undefined", undefined],
    ["boolean", true],
    ["number", 42],
    ["bigint", 42n],
    ["string", EXPECTED_CONTRACT_SOURCE_SHA256],
    ["symbol", Symbol("signing-envelope")],
    ["array", []],
    ["empty object", {}],
    ["missing fields", { ownerIdentityVerified: true }],
  ];

  for (const [label, input] of invalidInputs) {
    let result;
    assert.doesNotThrow(() => {
      result = evaluateSigningReadiness(input);
    }, label);
    assert.equal(result.ready, false, label);
    assert.ok(result.reasons.length > 0, label);
    assert.equal(Object.isFrozen(result), true, label);
    assert.equal(Object.isFrozen(result.reasons), true, label);
  }
});

test("signing readiness accepts only primitive strings without invoking caller coercion methods", async () => {
  const { evaluateSigningReadiness } = await import(moduleUrl("app.js"));
  const readyEnvelope = {
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

  const readyResult = evaluateSigningReadiness(readyEnvelope);
  assert.deepEqual(readyResult, { ready: true, reasons: [] });
  assert.equal(Object.isFrozen(readyResult), true);
  assert.equal(Object.isFrozen(readyResult.reasons), true);

  let hashMethodCalls = 0;
  const boxedHash = new String(EXPECTED_CONTRACT_SOURCE_SHA256);
  boxedHash.toString = () => {
    hashMethodCalls += 1;
    return EXPECTED_CONTRACT_SOURCE_SHA256;
  };
  const hashLikeObject = {
    toString() {
      hashMethodCalls += 1;
      return EXPECTED_CONTRACT_SOURCE_SHA256;
    },
  };

  for (const contractVersionHash of [boxedHash, hashLikeObject]) {
    const result = evaluateSigningReadiness({
      ...readyEnvelope,
      contractVersionHash,
    });
    assert.equal(result.ready, false);
  }
  assert.equal(hashMethodCalls, 0);

  const idScenarios = [
    ["owner party id", (envelope, value) => { envelope.ownerPartyId = value; }],
    ["provider party id", (envelope, value) => { envelope.serviceProviderPartySnapshot.partyId = value; }],
    ["provider signatory actor id", (envelope, value) => { envelope.serviceProviderPartySnapshot.signatoryActorId = value; }],
  ];

  for (const [label, mutate] of idScenarios) {
    let trimMethodCalls = 0;
    const stringLikeId = {
      trim() {
        trimMethodCalls += 1;
        return "coerced-id";
      },
    };
    const candidate = {
      ...readyEnvelope,
      serviceProviderPartySnapshot: {
        ...readyEnvelope.serviceProviderPartySnapshot,
      },
    };
    mutate(candidate, stringLikeId);
    const result = evaluateSigningReadiness(candidate);
    assert.equal(result.ready, false, label);
    assert.equal(trimMethodCalls, 0, label);
  }
});

test("signing readiness accepts only plain own-data envelope records", async () => {
  const { evaluateSigningReadiness } = await import(moduleUrl("app.js"));
  const readyProvider = {
    partyType: "natural_person",
    partyId: "provider-001",
    signatoryActorId: "actor-001",
  };
  const readyEnvelope = {
    contractVersionHash: EXPECTED_CONTRACT_SOURCE_SHA256,
    ownerIdentityVerified: true,
    ownerPartyId: "owner-001",
    serviceProviderPartySnapshot: readyProvider,
    writerReady: true,
    legalReviewStatus: "LEGAL_FINAL",
  };
  const exoticEnvelopes = [
    ["boxed String", Object.assign(new String("boxed"), readyEnvelope)],
    ["boxed Number", Object.assign(new Number(1), readyEnvelope)],
    ["boxed Boolean", Object.assign(new Boolean(false), readyEnvelope)],
    ["Date", Object.assign(new Date(0), readyEnvelope)],
    ["inherited fields", Object.create(readyEnvelope)],
  ];

  for (const [label, envelope] of exoticEnvelopes) {
    let result;
    assert.doesNotThrow(() => {
      result = evaluateSigningReadiness(envelope);
    }, label);
    assert.equal(result.ready, false, label);
  }

  assert.deepEqual(evaluateSigningReadiness(readyEnvelope), {
    ready: true,
    reasons: [],
  });

  const nullPrototypeProvider = Object.assign(
    Object.create(null),
    readyProvider,
  );
  const nullPrototypeEnvelope = Object.assign(Object.create(null), {
    ...readyEnvelope,
    serviceProviderPartySnapshot: nullPrototypeProvider,
  });
  assert.deepEqual(evaluateSigningReadiness(nullPrototypeEnvelope), {
    ready: true,
    reasons: [],
  });
});

test("signing readiness accepts only plain own-data provider records", async () => {
  const { evaluateSigningReadiness } = await import(moduleUrl("app.js"));
  const readyProvider = {
    partyType: "natural_person",
    partyId: "provider-001",
    signatoryActorId: "actor-001",
  };
  const readyEnvelope = {
    contractVersionHash: EXPECTED_CONTRACT_SOURCE_SHA256,
    ownerIdentityVerified: true,
    ownerPartyId: "owner-001",
    serviceProviderPartySnapshot: readyProvider,
    writerReady: true,
    legalReviewStatus: "LEGAL_FINAL",
  };
  const exoticProviders = [
    ["boxed provider", Object.assign(new String("boxed"), readyProvider)],
    ["boxed number provider", Object.assign(new Number(1), readyProvider)],
    ["Date provider", Object.assign(new Date(0), readyProvider)],
    ["inherited provider fields", Object.create(readyProvider)],
  ];

  for (const [label, serviceProviderPartySnapshot] of exoticProviders) {
    let result;
    assert.doesNotThrow(() => {
      result = evaluateSigningReadiness({
        ...readyEnvelope,
        serviceProviderPartySnapshot,
      });
    }, label);
    assert.equal(result.ready, false, label);
  }
});

test("signing readiness rejects accessors and non-enumerable required facts without reading them", async () => {
  const { evaluateSigningReadiness } = await import(moduleUrl("app.js"));
  const readyProvider = {
    partyType: "natural_person",
    partyId: "provider-001",
    signatoryActorId: "actor-001",
  };
  const readyEnvelope = {
    contractVersionHash: EXPECTED_CONTRACT_SOURCE_SHA256,
    ownerIdentityVerified: true,
    ownerPartyId: "owner-001",
    serviceProviderPartySnapshot: readyProvider,
    writerReady: true,
    legalReviewStatus: "LEGAL_FINAL",
  };

  let envelopeReadCount = 0;
  const envelopeWithAccessor = { ...readyEnvelope };
  Object.defineProperty(envelopeWithAccessor, "ownerPartyId", {
    enumerable: true,
    get() {
      envelopeReadCount += 1;
      return "owner-001";
    },
  });
  const accessorEnvelopeResult = evaluateSigningReadiness(envelopeWithAccessor);
  assert.equal(accessorEnvelopeResult.ready, false);
  assert.equal(envelopeReadCount, 0);

  let providerReadCount = 0;
  const providerWithAccessor = { ...readyProvider };
  Object.defineProperty(providerWithAccessor, "partyId", {
    enumerable: true,
    get() {
      providerReadCount += 1;
      return "provider-001";
    },
  });
  const accessorProviderResult = evaluateSigningReadiness({
    ...readyEnvelope,
    serviceProviderPartySnapshot: providerWithAccessor,
  });
  assert.equal(accessorProviderResult.ready, false);
  assert.equal(providerReadCount, 0);

  const nonEnumerableEnvelope = { ...readyEnvelope };
  Object.defineProperty(nonEnumerableEnvelope, "writerReady", {
    value: true,
    enumerable: false,
  });
  assert.equal(evaluateSigningReadiness(nonEnumerableEnvelope).ready, false);

  const nonEnumerableProvider = { ...readyProvider };
  Object.defineProperty(nonEnumerableProvider, "signatoryActorId", {
    value: "actor-001",
    enumerable: false,
  });
  assert.equal(
    evaluateSigningReadiness({
      ...readyEnvelope,
      serviceProviderPartySnapshot: nonEnumerableProvider,
    }).ready,
    false,
  );
});

test("contract heading resolver returns unique stable IDs with exact label boundaries", async () => {
  const { CONTRACT_SOURCE } = await import(moduleUrl("contract-content.js"));
  const appModule = await import(moduleUrl("app.js"));
  const { resolveContractSectionId } = appModule;

  assert.equal(typeof resolveContractSectionId, "function");
  assert.equal(Object.hasOwn(appModule, "SECTION_ID_MAP"), false);

  const headings = [];
  const lines = CONTRACT_SOURCE.split("\n");
  for (let index = 0; index < lines.length; index += 1) {
    const match = /^(#{1,3})\s+(.+)$/.exec(lines[index]);
    if (match) headings.push(match[2]);
  }

  const ids = [];
  for (let index = 0; index < headings.length; index += 1) {
    ids.push(resolveContractSectionId(headings[index], index + 1));
  }
  assert.equal(new Set(ids).size, ids.length);

  const expectedIds = [
    ["第一條　契約當事人", "article-01"],
    ["第十五條　重要事項確認方式", "article-15"],
    ["第十五條之一　付款節點資料通知", "article-15-1"],
    ["第十五條之二　指定通訊群組", "article-15-2"],
    ["第二十八條　簽署", "article-28"],
    ["附件一　AI PCM 服務範圍表", "annex-01"],
    ["附件十　案件參與者與授權帳號表", "annex-10"],
    ["附件十一　指定通訊群組與通知送達規則", "annex-11"],
    ["附件十二　資料保存、下載與刪除政策", "annex-12"],
    ["附件十三　第三方技術服務與跨境資料處理清單", "annex-13"],
    ["附件十四　已履行服務計價表", "annex-14"],
  ];
  for (const [heading, expectedId] of expectedIds) {
    assert.equal(resolveContractSectionId(heading, 999), expectedId, heading);
  }

  assert.equal(
    resolveContractSectionId("第十五條之一甲", 901),
    "contract-section-901",
  );
  assert.equal(
    resolveContractSectionId("附件十一甲", 902),
    "contract-section-902",
  );
});

test("contract reader maps frozen articles into four stable pages and uses vertical direction semantics", async () => {
  const {
    CONTRACT_PARTS,
    resolveContractPageDirection,
    resolveContractPartIndex,
  } = await import(moduleUrl("app.js"));

  assert.deepEqual(
    CONTRACT_PARTS.map(({ number, title }) => [number, title]),
    [
      ["01", "契約與服務"],
      ["02", "費用與付款"],
      ["03", "責任與紀錄"],
      ["04", "權益與簽署"],
    ],
  );
  assert.equal(resolveContractPartIndex("第一條　契約當事人", 3), 0);
  assert.equal(resolveContractPartIndex("第七條　服務費", 0), 1);
  assert.equal(resolveContractPartIndex("第十一條　服務方義務", 0), 2);
  assert.equal(resolveContractPartIndex("第二十一條　退費", 0), 3);
  assert.equal(resolveContractPartIndex("附件十四　已履行服務計價表", 0), 3);
  assert.equal(resolveContractPartIndex("萊比 LaiBE AI PCM 案件治理資訊服務契約", 2), 2);
  assert.equal(resolveContractPageDirection(0, 1), "next");
  assert.equal(resolveContractPageDirection(3, 1), "previous");
  assert.equal(resolveContractPageDirection(2, 2), "current");
});

test("contract rendering demotes source headings and styles all rendered levels", async () => {
  const [appSource, html, css] = await Promise.all([
    readFile(path.join(serviceContractDir, "app.js"), "utf8"),
    readFile(path.join(serviceContractDir, "code.html"), "utf8"),
    readFile(path.join(serviceContractDir, "styles.css"), "utf8"),
  ]);

  assert.equal((html.match(/<h1\b/gi) ?? []).length, 1);
  assert.match(appSource, /const renderedLevel = level \+ 1;/);
  assert.match(
    appSource,
    /createTextElement\(\s*`h\$\{renderedLevel\}`\s*,\s*headingText\s*\)/,
  );
  assert.doesNotMatch(
    appSource,
    /createTextElement\(\s*`h\$\{level\}`\s*,\s*headingText\s*\)/,
  );
  assert.doesNotMatch(css, /\.contract-paper h1\b/);
  for (const level of [2, 3, 4]) {
    assert.match(css, new RegExp(`\\.contract-paper h${level}\\s*\\{`));
  }
});

test("mobile contract navigation controls provide 44px centered touch targets", async () => {
  const css = await readFile(path.join(serviceContractDir, "styles.css"), "utf8");
  const mobileStart = css.indexOf("@media (max-width: 620px)");
  const mobileEnd = css.indexOf("@media", mobileStart + 1);
  assert.notEqual(mobileStart, -1);
  const mobileCss = css.slice(mobileStart, mobileEnd);

  for (const selector of [".contract-page-tab", ".contract-page-control", ".clause__source"]) {
    const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const rule = new RegExp(`${escapedSelector}\\s*\\{([^}]*)\\}`).exec(mobileCss);
    assert.ok(rule, `${selector} mobile rule`);
    assert.match(rule[1], /display:\s*(?:inline-)?flex\s*;/, selector);
    assert.match(rule[1], /min-height:\s*44px\s*;/, selector);
    assert.match(rule[1], /align-items:\s*center\s*;/, selector);
    assert.match(rule[1], /max-width:\s*100%\s*;/, selector);
    assert.match(rule[1], /overflow-wrap:\s*anywhere\s*;/, selector);
  }

  const baseClauseRule = /\.clause__source\s*\{([^}]*)\}/.exec(
    css.slice(0, mobileStart),
  );
  assert.ok(baseClauseRule);
  assert.match(baseClauseRule[1], /margin-top:\s*auto\s*;/);

  const mobileClauseRule = /\.clause__source\s*\{([^}]*)\}/.exec(mobileCss);
  assert.ok(mobileClauseRule);
  assert.match(
    mobileClauseRule[1],
    /padding-(?:top|block):\s*0(?:px)?\s*;/,
  );

  assert.match(css, /\.brand\s*>\s*span\s*\{/);
  assert.doesNotMatch(css, /\.brand\s+span\s*\{/);
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
    .find((button) => /\bdata-sign-button\b/i.test(button));

  assert.ok(signButton);
  assert.match(signButton, /\bdisabled(?:\s*=\s*["']disabled["'])?/i);
  assert.match(signButton, /aria-disabled=["']true["']/i);
  assert.match(appSource, /INITIAL_SIGNING_ENVELOPE/);
  assert.match(
    appSource,
    /evaluateSigningReadiness\(\s*INITIAL_SIGNING_ENVELOPE\s*\)/,
  );
});
