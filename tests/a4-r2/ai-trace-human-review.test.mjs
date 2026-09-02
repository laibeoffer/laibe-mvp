import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import test from "node:test";

import { validateAnalysisOutput } from "../../supabase/functions/_shared/drs-analysis/contracts.ts";
import { runAnalysisWorkerOnce } from "../../supabase/functions/drs-analysis-worker/index.ts";

const CASE_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const RUN_ID = "66666666-6060-4060-8060-606060606060";
const RUN_KEY = "f".repeat(64);
const JOB_ID = "88888888-8080-4080-8080-808080808080";
const WORKER_ID = "99999999-9090-4090-8090-909090909090";
const ENQUEUE_SOURCE = readFileSync(
  new URL(
    "../../supabase/functions/drs-analysis-enqueue/index.ts",
    import.meta.url,
  ),
  "utf8",
);
const DOCUMENT = Object.freeze({
  ordinal: 1,
  caseId: CASE_ID,
  documentId: "10101010-1010-4010-8010-101010101010",
  documentVersionId: "11111111-1010-4010-8010-101010101010",
  documentVersionRef: "dvr_11111111101040108010101010101010",
  documentKind: "quote",
  sha256: "a".repeat(64),
});

function runContext() {
  return {
    runId: RUN_ID,
    runKeySha256: RUN_KEY,
    caseId: CASE_ID,
    documents: [DOCUMENT],
  };
}

function analysisOutput() {
  return {
    schemaVersion: "laibe.drs.analysis-output.v1",
    runId: RUN_ID,
    runKeySha256: RUN_KEY,
    caseId: CASE_ID,
    providerNeutral: true,
    humanReviewRequired: true,
    formalImpact: "none",
    findings: [{
      schemaVersion: "laibe.drs.analysis-finding-draft.v1",
      findingId: "77777777-7070-4070-8070-707070707070",
      findingVersion: 1,
      runId: RUN_ID,
      runKeySha256: RUN_KEY,
      caseId: CASE_ID,
      domain: "quote",
      code: "QUOTE_TEST_RISK",
      classification: "risk",
      severity: "high",
      statement: "報價項目仍需由 DRS 依原始版本確認。",
      rationale: "同一份不可變版本中的欄位需要人工覆核。",
      citations: [{
        kind: "quote_row",
        caseId: CASE_ID,
        documentId: DOCUMENT.documentId,
        documentVersionId: DOCUMENT.documentVersionId,
        documentSha256: DOCUMENT.sha256,
        page: 2,
        row: 7,
      }],
      unknowns: [],
      sourceDocumentVersions: [{
        documentId: DOCUMENT.documentId,
        documentVersionId: DOCUMENT.documentVersionId,
        documentSha256: DOCUMENT.sha256,
      }],
      providerNeutral: true,
      humanReviewRequired: true,
      formalImpact: "none",
      lifecycle: "current",
    }],
  };
}

test("analysis enqueue closure excludes protected auth implementation and preserves session authority fields", () => {
  const importSpecifiers = [...ENQUEUE_SOURCE.matchAll(
    /\bfrom\s+["']([^"']+)["']/gu,
  )].map((match) => match[1]);
  assert.deepEqual(importSpecifiers, [
    "../_shared/drs-analysis/contracts.ts",
  ]);

  const contextDeclaration = ENQUEUE_SOURCE.match(
    /export type AnalysisEnqueueSessionContext = Readonly<\{([\s\S]*?)\}>;/u,
  );
  assert.ok(contextDeclaration);
  const contextBody = contextDeclaration[1];
  for (
    const [field, type] of Object.entries({
      userId: "string",
      sessionId: "string",
      caseId: "string",
      membershipId: "string",
      authorityVersion: "number",
    })
  ) {
    assert.match(contextBody, new RegExp(`\\b${field}: ${type};`, "u"));
  }
  assert.match(contextBody, /\brole: "owner" \| "vendor" \| "drs"/u);
  assert.match(contextBody, /\bnextActor: "owner" \| "vendor" \| "drs"/u);
  assert.match(
    ENQUEUE_SOURCE,
    /principal: AnalysisEnqueueSessionContext;/u,
  );
  assert.match(
    ENQUEUE_SOURCE,
    /resolveSessionContext\(\s*request: Request,?\s*\): Promise<AnalysisEnqueueSessionContext \| null>;/u,
  );
});

test("worker captures String.prototype.charCodeAt before validation-time mutation", async () => {
  const input = runContext();
  const expectedOutput = validateAnalysisOutput(input, analysisOutput());
  assert.ok(expectedOutput);
  const expectedBytes = JSON.stringify(expectedOutput);
  const expectedSha256 = createHash("sha256")
    .update(expectedBytes, "utf8")
    .digest("hex");

  const candidate = analysisOutput();
  const candidateFindings = [...candidate.findings];
  const originalCharCodeAt = Object.getOwnPropertyDescriptor(
    String.prototype,
    "charCodeAt",
  );
  const originalToJson = Object.getOwnPropertyDescriptor(
    Object.prototype,
    "toJSON",
  );
  let intrinsicsInstalled = false;
  let poisonedCharCodeAtCalls = 0;
  let inheritedToJsonCalls = 0;
  Object.defineProperty(candidateFindings, "map", {
    configurable: true,
    get() {
      if (!intrinsicsInstalled) {
        intrinsicsInstalled = true;
        Object.defineProperty(String.prototype, "charCodeAt", {
          configurable: true,
          enumerable: false,
          writable: true,
          value() {
            poisonedCharCodeAtCalls += 1;
            return 0x22;
          },
        });
        Object.defineProperty(Object.prototype, "toJSON", {
          configurable: true,
          enumerable: false,
          writable: true,
          value() {
            inheritedToJsonCalls += 1;
            return { poisoned: "INHERITED_TO_JSON" };
          },
        });
      }
      return Array.prototype.map;
    },
  });

  let providerCalls = 0;
  let completeEffects = 0;
  let failEffects = 0;
  let completedBytes = null;
  let completedSha256 = null;
  let result;
  try {
    result = await runAnalysisWorkerOnce({
      workerId: WORKER_ID,
      queue: {
        claim() {
          return { jobId: JOB_ID, workerId: WORKER_ID, input };
        },
        complete(_jobId, _workerId, outputSha256, output) {
          completeEffects += 1;
          completedSha256 = outputSha256;
          completedBytes = JSON.stringify(output);
          return { state: "APPLIED", newEffects: 1 };
        },
        fail() {
          failEffects += 1;
          return { state: "FAILED", newEffects: 0 };
        },
      },
      provider: {
        analyze() {
          providerCalls += 1;
          return { ...candidate, findings: candidateFindings };
        },
      },
    });
  } finally {
    Object.defineProperty(
      String.prototype,
      "charCodeAt",
      originalCharCodeAt,
    );
    if (originalToJson) {
      Object.defineProperty(Object.prototype, "toJSON", originalToJson);
    } else {
      delete Object.prototype.toJSON;
    }
  }

  assert.deepEqual(result, { state: "APPLIED", newEffects: 1 });
  assert.equal(intrinsicsInstalled, true);
  assert.equal(providerCalls, 1);
  assert.equal(completeEffects, 1);
  assert.equal(failEffects, 0);
  assert.equal(inheritedToJsonCalls, 0);
  assert.equal(completedBytes, expectedBytes);
  assert.equal(completedSha256, expectedSha256);
  assert.equal(poisonedCharCodeAtCalls, 0);
});
