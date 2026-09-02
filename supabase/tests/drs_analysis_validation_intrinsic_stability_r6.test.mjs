import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  canonicalRunKeySha256,
  parseAnalysisEnqueueRequest,
  validateAnalysisRunContext,
} from "../functions/_shared/drs-analysis/contracts.ts";
import { runAnalysisWorkerOnce } from "../functions/drs-analysis-worker/index.ts";

const CASE_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const CASE_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const RUN_ID = "66666666-6060-4060-8060-606060606060";
const RUN_KEY = "f".repeat(64);
const WORKER_ID = "99999999-9090-4090-8090-909090909090";
const JOB_ID = "88888888-8080-4080-8080-808080808080";

function documentVersion(ordinal, overrides = {}) {
  return {
    ordinal,
    caseId: CASE_A,
    documentId: ordinal === 1
      ? "10101010-1010-4010-8010-101010101010"
      : "20202020-2020-4020-8020-202020202020",
    documentVersionId: ordinal === 1
      ? "11111111-1010-4010-8010-101010101010"
      : "22222222-2020-4020-8020-202020202020",
    documentVersionRef: ordinal === 1
      ? "dvr_11111111101040108010101010101010"
      : "dvr_22222222202040208020202020202020",
    documentKind: "quote",
    sha256: ordinal === 1 ? "a".repeat(64) : "b".repeat(64),
    ...overrides,
  };
}

function documents() {
  return [documentVersion(1), documentVersion(2)];
}

function runContext(overrides = {}) {
  return {
    runId: RUN_ID,
    runKeySha256: RUN_KEY,
    caseId: CASE_A,
    documents: documents(),
    ...overrides,
  };
}

function enqueueRequest(overrides = {}) {
  return {
    schemaVersion: "laibe.drs.analysis-enqueue.request.v1",
    inputManifestSha256: "1".repeat(64),
    documents: documents(),
    prompt: { version: "healthcheck-prompt-v1", sha256: "2".repeat(64) },
    model: {
      adapterVersion: "provider-neutral-adapter-v1",
      profileVersion: "deterministic-local-profile-v1",
    },
    rule: { version: "healthcheck-rules-v1", sha256: "3".repeat(64) },
    outputSchema: {
      version: "laibe.drs.analysis-output.v1",
      sha256: "4".repeat(64),
    },
    ...overrides,
  };
}

function withReplacedIntrinsics(callback) {
  const defineProperty = Object.defineProperty;
  const targets = [
    [Array, "isArray", () => {
      throw new Error("LATE_BOUND_ARRAY_IS_ARRAY");
    }],
    [Array.prototype, "push", () => {
      throw new Error("LATE_BOUND_ARRAY_PUSH");
    }],
    [Array.prototype, "map", () => {
      throw new Error("LATE_BOUND_ARRAY_MAP");
    }],
    [
      globalThis,
      "Set",
      class ReplacedSet {
        constructor() {
          throw new Error("LATE_BOUND_SET");
        }
      },
    ],
    [Object, "freeze", () => {
      throw new Error("LATE_BOUND_OBJECT_FREEZE");
    }],
    [Array.prototype, Symbol.iterator, () => {
      throw new Error("LATE_BOUND_ARRAY_ITERATOR");
    }],
  ];
  const originals = [];
  for (let index = 0; index < targets.length; index += 1) {
    const target = targets[index][0];
    const key = targets[index][1];
    const replacement = targets[index][2];
    originals[index] = Object.getOwnPropertyDescriptor(target, key);
    defineProperty(target, key, {
      ...originals[index],
      value: replacement,
    });
  }
  try {
    return callback();
  } finally {
    for (let index = targets.length - 1; index >= 0; index -= 1) {
      defineProperty(targets[index][0], targets[index][1], originals[index]);
    }
  }
}

test("validator captures safe intrinsics while preserving SUP request and canonical bindings", async () => {
  const context = runContext();
  let observed;
  let thrown = null;
  try {
    observed = withReplacedIntrinsics(() =>
      validateAnalysisRunContext(context)
    );
  } catch (error) {
    thrown = error;
  }

  assert.equal(thrown, null);
  assert.ok(observed);
  assert.equal(observed.caseId, CASE_A);
  assert.equal(observed.documents.length, 2);
  assert.equal(
    observed.documents[0].documentVersionId,
    context.documents[0].documentVersionId,
  );

  const request = enqueueRequest();
  const parsed = parseAnalysisEnqueueRequest(request, CASE_A);
  assert.ok(parsed);
  assert.equal(parsed.documents[0].caseId, CASE_A);
  assert.equal(parsed.documents[1].ordinal, 2);
  const firstKey = await canonicalRunKeySha256(parsed);
  const secondKey = await canonicalRunKeySha256(parsed);
  assert.match(firstKey, /^[a-f0-9]{64}$/u);
  assert.equal(firstKey, secondKey);

  const rebound = validateAnalysisRunContext({
    ...context,
    runKeySha256: firstKey,
    documents: parsed.documents,
  });
  assert.ok(rebound);
  assert.equal(rebound.runKeySha256, firstKey);
  assert.equal(
    rebound.documents[0].documentVersionId,
    parsed.documents[0].documentVersionId,
  );
  assert.equal(
    rebound.documents[1].documentVersionId,
    parsed.documents[1].documentVersionId,
  );

  const source = readFileSync(
    new URL("../functions/_shared/drs-analysis/contracts.ts", import.meta.url),
    "utf8",
  );
  assert.match(source, /export type AnalysisEnqueueRequest/u);
  assert.match(source, /export function parseAnalysisEnqueueRequest/u);
  assert.match(source, /export function canonicalRunKeySha256/u);
});

async function invalidWorkerReceipt(input) {
  let providerCalls = 0;
  let completeEffects = 0;
  let failEffects = 0;
  let failCode = null;
  let commandEffects = 0;
  let decisionEffects = 0;
  let eventEffects = 0;
  let claimed = false;
  const result = await runAnalysisWorkerOnce({
    workerId: WORKER_ID,
    queue: {
      async claim() {
        if (claimed) return null;
        claimed = true;
        return { jobId: JOB_ID, workerId: WORKER_ID, input };
      },
      async complete() {
        completeEffects += 1;
        return { state: "APPLIED", newEffects: 1 };
      },
      async fail(_jobId, _workerId, errorCode) {
        failEffects += 1;
        failCode = errorCode;
        return { state: "FAILED", newEffects: 0 };
      },
    },
    provider: {
      async analyze() {
        providerCalls += 1;
        return {};
      },
    },
    formalEffects: {
      command: () => commandEffects += 1,
      decision: () => decisionEffects += 1,
      event: () => eventEffects += 1,
    },
  });
  return {
    result,
    providerCalls,
    completeEffects,
    failEffects,
    failCode,
    commandEffects,
    decisionEffects,
    eventEffects,
  };
}

test("malformed, cross-case, duplicate, and sequence-invalid inputs fail closed before adapter", async () => {
  const revokedLike = runContext();
  Object.defineProperty(revokedLike, "caseId", {
    enumerable: true,
    get() {
      throw new Error("REVOKED_LIKE_PROPERTY_ACCESS");
    },
  });
  const duplicateDocuments = documents();
  duplicateDocuments[1] = {
    ...duplicateDocuments[1],
    documentVersionId: duplicateDocuments[0].documentVersionId,
  };
  const cases = [
    revokedLike,
    runContext({
      documents: documents().map((document) => ({
        ...document,
        caseId: CASE_B,
      })),
    }),
    runContext({ documents: duplicateDocuments }),
    runContext({
      documents: [
        documentVersion(2, { ordinal: 1 }),
        documentVersion(1, { ordinal: 3 }),
      ],
    }),
  ];

  for (let index = 0; index < cases.length; index += 1) {
    assert.doesNotThrow(() => validateAnalysisRunContext(cases[index]));
    assert.equal(validateAnalysisRunContext(cases[index]), null);
    const receipt = await invalidWorkerReceipt(cases[index]);
    assert.deepEqual(receipt.result, { state: "FAILED", newEffects: 0 });
    assert.equal(receipt.failCode, "INVALID_ANALYSIS_INPUT");
    assert.equal(receipt.providerCalls, 0);
    assert.equal(receipt.completeEffects, 0);
    assert.equal(receipt.failEffects, 1);
    assert.equal(receipt.commandEffects, 0);
    assert.equal(receipt.decisionEffects, 0);
    assert.equal(receipt.eventEffects, 0);
  }
});
