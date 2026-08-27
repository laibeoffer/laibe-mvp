import assert from "node:assert/strict";

const SCANNER_RUNTIME_URL = new URL(
  "../functions/_shared/drs-document-storage/drs-document-scanner-runtime.ts",
  import.meta.url,
);
const EDGE_RUNTIME_URL = new URL(
  "../functions/_shared/drs-document-storage/drs-document-edge-runtime.ts",
  import.meta.url,
);
const SERVICE_URL = new URL(
  "../functions/_shared/drs-document-storage/service.ts",
  import.meta.url,
);

const INTAKE_BUCKET = "drs-case-intake-private";
const RECORDS_BUCKET = "drs-case-records-private";
const INTENT_REF = "int_01j6a8k9m4q2w3e4r5t6y7u8i9";
const INTAKE_KEY =
  "intents/11111111-1111-4111-8111-111111111111/22222222-2222-4222-8222-222222222222.pdf";
const RECORDS_KEY =
  "cases/22222222-2222-4222-8222-222222222222/documents/33333333-3333-4333-8333-333333333333/versions/44444444-4444-4444-8444-444444444444/source.pdf";
const PDF_BYTES = new TextEncoder().encode(
  "%PDF-1.7\n1 0 obj\n<<>>\nendobj\n%%EOF",
);
const SHA = await sha256(PDF_BYTES);
const PRINCIPAL = Object.freeze({
  authenticatedUserId: "11111111-1111-4111-8111-111111111111",
  expectedCaseId: "22222222-2222-4222-8222-222222222222",
  authorizationSubject: "drs-specialist:11111111-1111-4111-8111-111111111111",
  grantId: "33333333-3333-4333-8333-333333333333",
  grantVersion: "7",
  grantExpiresAt: "2026-08-28T12:15:00.000Z",
});

async function sha256(bytes) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
  );
  return Array.from(
    new Uint8Array(digest),
    (value) => value.toString(16).padStart(2, "0"),
  ).join("");
}

function env(overrides = {}) {
  const values = {
    SUPABASE_URL: "http://127.0.0.1:54321",
    SUPABASE_SERVICE_ROLE_KEY: "server-only-service-role",
    LAIBE_DRS_DOCUMENT_SCANNER_URL: "http://127.0.0.1:54329/v1/scan",
    LAIBE_DRS_DOCUMENT_SCANNER_TOKEN: "scanner-only-token",
    ...overrides,
  };
  return Object.freeze({ get: (name) => values[name] });
}

function cleanReport(overrides = {}) {
  return {
    declaredMime: "application/pdf",
    detectedMime: "application/pdf",
    extension: "pdf",
    decodedBytes: PDF_BYTES.byteLength,
    pageCount: 1,
    megapixels: null,
    cpuMs: 1,
    wallMs: 1,
    rssBytes: 1024,
    indirectObjects: 1,
    maxReferenceDepth: 1,
    structuralState: "PASS",
    activeFeatures: [],
    malwareState: "CLEAN",
    ...overrides,
  };
}

function exactFacts(bucket, objectKey, overrides = {}) {
  return {
    bucket,
    objectKey,
    sha256: SHA,
    sizeBytes: PDF_BYTES.byteLength,
    detectedMime: "application/pdf",
    ...overrides,
  };
}

function plan() {
  return {
    ok: true,
    state: "VALIDATION_REQUIRED",
    intake_bucket: INTAKE_BUCKET,
    records_bucket: RECORDS_BUCKET,
    intake_object_key: INTAKE_KEY,
    records_object_key: RECORDS_KEY,
    declared_mime: "application/pdf",
  };
}

function finalizeRequest() {
  return {
    schemaVersion: "laibe.drs-document-upload-finalize.request.v1",
    intentRef: INTENT_REF,
    idempotencyKey: "finalize-01j6a8k9m4q2w3e4",
  };
}

async function importRequired(url, label) {
  const imported = await import(`${url.href}?test=${crypto.randomUUID()}`)
    .catch(
      () => null,
    );
  assert.ok(imported, `${label} production module is absent`);
  return imported;
}

Deno.test("focused RED: exact scanner and Edge runtime modules exist", async () => {
  const scanner = await importRequired(SCANNER_RUNTIME_URL, "scanner runtime");
  const edge = await importRequired(EDGE_RUNTIME_URL, "Edge runtime");
  assert.equal(typeof scanner.createDrsDocumentScannerRuntime, "function");
  assert.equal(typeof edge.createDrsDocumentEdgeRuntime, "function");
});

Deno.test("scanner derives identity from the exact bytes it scans and promotes that sealed byte sequence once", async () => {
  const { createDrsDocumentScannerRuntime } = await importRequired(
    SCANNER_RUNTIME_URL,
    "scanner runtime",
  );
  const scannerBodies = [];
  const recordBodies = [];
  const runtime = createDrsDocumentScannerRuntime({
    env: env(),
    fetch: async (input, init = {}) => {
      const url = new URL(typeof input === "string" ? input : input.url);
      if (url.pathname.includes(`/object/authenticated/${INTAKE_BUCKET}/`)) {
        return new Response(PDF_BYTES, {
          status: 200,
          headers: { "content-type": "application/pdf" },
        });
      }
      if (url.href === "http://127.0.0.1:54329/v1/scan") {
        const body = new Uint8Array(
          await new Response(init.body).arrayBuffer(),
        );
        scannerBodies.push(body);
        assert.equal(
          new Headers(init.headers).get("content-type"),
          "application/pdf",
        );
        return Response.json(cleanReport());
      }
      if (url.pathname.includes(`/object/${RECORDS_BUCKET}/`)) {
        const body = new Uint8Array(
          await new Response(init.body).arrayBuffer(),
        );
        recordBodies.push(body);
        return Response.json({ Key: RECORDS_KEY }, { status: 200 });
      }
      throw new Error("unexpected fetch");
    },
  });
  assert.equal(runtime.runtimeAvailable, true);
  const scanned = await runtime.scanSealed({
    intentRef: INTENT_REF,
    sourceBucket: INTAKE_BUCKET,
    sourceObjectKey: INTAKE_KEY,
    targetBucket: RECORDS_BUCKET,
    targetObjectKey: RECORDS_KEY,
    declaredMime: "application/pdf",
  });
  assert.ok(scanned);
  assert.deepEqual(scanned.facts, {
    sha256: SHA,
    sizeBytes: PDF_BYTES.byteLength,
    detectedMime: "application/pdf",
    validatedMime: "application/pdf",
  });
  assert.equal(JSON.stringify(scanned).includes("%PDF"), false);
  assert.deepEqual(scannerBodies, [PDF_BYTES]);
  assert.equal(
    await runtime.promoteSealed({
      seal: scanned.seal,
      intentRef: INTENT_REF,
      sourceBucket: INTAKE_BUCKET,
      sourceObjectKey: INTAKE_KEY,
      targetBucket: RECORDS_BUCKET,
      targetObjectKey: RECORDS_KEY,
    }),
    "RECORDS_WRITTEN",
  );
  assert.equal(
    await runtime.promoteSealed({
      seal: scanned.seal,
      intentRef: INTENT_REF,
      sourceBucket: INTAKE_BUCKET,
      sourceObjectKey: INTAKE_KEY,
      targetBucket: RECORDS_BUCKET,
      targetObjectKey: RECORDS_KEY,
    }),
    "NO_WRITE",
  );
  assert.deepEqual(recordBodies, [PDF_BYTES]);
});

Deno.test("scanner seal rejects foreign targets, malformed reports, MIME mismatch and oversized streams", async () => {
  const { createDrsDocumentScannerRuntime } = await importRequired(
    SCANNER_RUNTIME_URL,
    "scanner runtime",
  );
  let mode = "clean";
  let cancelled = false;
  let pulls = 0;
  const runtime = createDrsDocumentScannerRuntime({
    env: env(),
    fetch: (input) => {
      const url = new URL(typeof input === "string" ? input : input.url);
      if (url.pathname.includes(`/object/authenticated/${INTAKE_BUCKET}/`)) {
        if (mode === "overflow") {
          return new Response(
            new ReadableStream({
              pull(controller) {
                pulls += 1;
                controller.enqueue(new Uint8Array(1024 * 1024));
              },
              cancel() {
                cancelled = true;
              },
            }),
            { headers: { "content-type": "application/pdf" } },
          );
        }
        return new Response(PDF_BYTES, {
          headers: { "content-type": "application/pdf" },
        });
      }
      if (url.href === "http://127.0.0.1:54329/v1/scan") {
        return Response.json(
          mode === "mime-mismatch"
            ? cleanReport({ detectedMime: "image/png", extension: "png" })
            : mode === "extra"
            ? { ...cleanReport(), rawProvider: "must-not-pass" }
            : cleanReport(),
        );
      }
      return Response.json({}, { status: 200 });
    },
  });
  const input = {
    intentRef: INTENT_REF,
    sourceBucket: INTAKE_BUCKET,
    sourceObjectKey: INTAKE_KEY,
    targetBucket: RECORDS_BUCKET,
    targetObjectKey: RECORDS_KEY,
    declaredMime: "application/pdf",
  };
  const valid = await runtime.scanSealed(input);
  assert.ok(valid);
  assert.equal(
    await runtime.promoteSealed({
      seal: valid.seal,
      ...input,
      targetObjectKey: RECORDS_KEY.replace("source.pdf", "foreign.pdf"),
    }),
    "NO_WRITE",
  );
  mode = "mime-mismatch";
  assert.equal(await runtime.scanSealed(input), null);
  mode = "extra";
  assert.equal(await runtime.scanSealed(input), null);
  mode = "overflow";
  assert.equal(await runtime.scanSealed(input), null);
  assert.equal(cancelled, true);
  assert.ok(pulls <= 27, `overflow reader pulled ${pulls} chunks`);
});

Deno.test("scanner deadline covers streamed object bytes and cancels a stalled body", async () => {
  const { createDrsDocumentScannerRuntime } = await importRequired(
    SCANNER_RUNTIME_URL,
    "scanner runtime",
  );
  let cancelled = false;
  const runtime = createDrsDocumentScannerRuntime({
    env: env(),
    timeoutMs: 5,
    fetch: (input) => {
      const url = new URL(typeof input === "string" ? input : input.url);
      if (url.pathname.includes(`/object/authenticated/${INTAKE_BUCKET}/`)) {
        return Promise.resolve(
          new Response(
            new ReadableStream({
              async pull(controller) {
                await new Promise((resolve) => setTimeout(resolve, 40));
                controller.enqueue(PDF_BYTES);
                controller.close();
              },
              cancel() {
                cancelled = true;
              },
            }),
            { headers: { "content-type": "application/pdf" } },
          ),
        );
      }
      if (url.href === "http://127.0.0.1:54329/v1/scan") {
        return Promise.resolve(Response.json(cleanReport()));
      }
      throw new Error("unexpected fetch");
    },
  });
  assert.equal(
    await runtime.scanSealed({
      intentRef: INTENT_REF,
      sourceBucket: INTAKE_BUCKET,
      sourceObjectKey: INTAKE_KEY,
      targetBucket: RECORDS_BUCKET,
      targetObjectKey: RECORDS_KEY,
      declaredMime: "application/pdf",
    }),
    null,
  );
  assert.equal(cancelled, true);
  await new Promise((resolve) => setTimeout(resolve, 50));
});

Deno.test("service requires A B C D E equality and never calls mutable-key promote on the sealed path", async () => {
  const { createDocumentStorageService } = await import(SERVICE_URL.href);
  let executeCalls = 0;
  let legacyPromoteCalls = 0;
  let promoteSealedCalls = 0;
  const intake = exactFacts(INTAKE_BUCKET, INTAKE_KEY);
  const records = exactFacts(RECORDS_BUCKET, RECORDS_KEY);
  const inspections = [intake, intake, records, intake];
  const seal = Object.freeze({});
  const service = createDocumentStorageService({
    repository: {
      runtimeAvailable: true,
      execute: () =>
        Promise.resolve(
          ++executeCalls === 1 ? plan() : {
            ok: true,
            state: "FORMAL_VERSION_CREATED",
            document_ref: "doc_01j6a8k9m4q2w3e4r5t6y7u8i9",
            version_ref: "dvr_01j6a8k9m4q2w3e4r5t6y7u8i9",
            receipt_ref: "rcp_01j6a8k9m4q2w3e4r5t6y7u8i9",
          },
        ),
      queueOrphanCleanup: () => Promise.resolve(null),
    },
    storage: {
      runtimeAvailable: true,
      createSignedUpload: () => Promise.resolve(null),
      inspect: () => Promise.resolve(inspections.shift() ?? null),
      promote: () => {
        legacyPromoteCalls += 1;
        return Promise.resolve(false);
      },
      download: () => Promise.resolve(null),
    },
    scanner: {
      runtimeAvailable: true,
      scan: () => Promise.reject(new Error("legacy scanner used")),
      scanSealed: () =>
        Promise.resolve({
          seal,
          report: cleanReport(),
          facts: {
            sha256: SHA,
            sizeBytes: PDF_BYTES.byteLength,
            detectedMime: "application/pdf",
            validatedMime: "application/pdf",
          },
        }),
      promoteSealed: () => {
        promoteSealedCalls += 1;
        return Promise.resolve("RECORDS_WRITTEN");
      },
    },
  });
  const result = await service.finalizeUpload(PRINCIPAL, finalizeRequest());
  assert.equal(result?.state, "FORMAL_VERSION_CREATED");
  assert.equal(executeCalls, 2);
  assert.equal(promoteSealedCalls, 1);
  assert.equal(legacyPromoteCalls, 0);
  assert.equal(inspections.length, 0);
});

Deno.test("object swap before sealed promotion remains pending and performs no records write", async () => {
  const { createDocumentStorageService } = await import(SERVICE_URL.href);
  let promoteCalls = 0;
  let executeCalls = 0;
  const service = createDocumentStorageService({
    repository: {
      runtimeAvailable: true,
      execute: () => Promise.resolve(++executeCalls === 1 ? plan() : null),
      queueOrphanCleanup: () => Promise.resolve(null),
    },
    storage: {
      runtimeAvailable: true,
      createSignedUpload: () => Promise.resolve(null),
      inspect: (() => {
        const sequence = [
          exactFacts(INTAKE_BUCKET, INTAKE_KEY),
          exactFacts(INTAKE_BUCKET, INTAKE_KEY, { sha256: "b".repeat(64) }),
        ];
        return () => Promise.resolve(sequence.shift() ?? null);
      })(),
      promote: () => Promise.reject(new Error("legacy promote used")),
      download: () => Promise.resolve(null),
    },
    scanner: {
      runtimeAvailable: true,
      scan: () => Promise.reject(new Error("legacy scan used")),
      scanSealed: () =>
        Promise.resolve({
          seal: Object.freeze({}),
          report: cleanReport(),
          facts: {
            sha256: SHA,
            sizeBytes: PDF_BYTES.byteLength,
            detectedMime: "application/pdf",
            validatedMime: "application/pdf",
          },
        }),
      promoteSealed: () => {
        promoteCalls += 1;
        return Promise.resolve("RECORDS_WRITTEN");
      },
    },
  });
  assert.deepEqual(await service.finalizeUpload(PRINCIPAL, finalizeRequest()), {
    schemaVersion: "laibe.drs-document-upload-finalize.response.v1",
    state: "VALIDATION_PENDING",
    intentRef: INTENT_REF,
  });
  assert.equal(promoteCalls, 0);
  assert.equal(executeCalls, 1);
});

Deno.test("post-write mismatch requires durable orphan proof and never creates a formal version", async () => {
  const { createDocumentStorageService } = await import(SERVICE_URL.href);
  let executeCalls = 0;
  let cleanupCalls = 0;
  const sequence = [
    exactFacts(INTAKE_BUCKET, INTAKE_KEY),
    exactFacts(INTAKE_BUCKET, INTAKE_KEY),
    exactFacts(RECORDS_BUCKET, RECORDS_KEY, {
      sizeBytes: PDF_BYTES.byteLength + 1,
    }),
    exactFacts(INTAKE_BUCKET, INTAKE_KEY),
  ];
  const service = createDocumentStorageService({
    repository: {
      runtimeAvailable: true,
      execute: () => Promise.resolve(++executeCalls === 1 ? plan() : null),
      queueOrphanCleanup: () => {
        cleanupCalls += 1;
        return Promise.resolve({
          ok: true,
          state: "ORPHAN_CLEANUP_QUEUED",
          work_item_id: "55555555-5555-4555-8555-555555555555",
        });
      },
    },
    storage: {
      runtimeAvailable: true,
      createSignedUpload: () => Promise.resolve(null),
      inspect: () => Promise.resolve(sequence.shift() ?? null),
      promote: () => Promise.reject(new Error("legacy promote used")),
      download: () => Promise.resolve(null),
    },
    scanner: {
      runtimeAvailable: true,
      scan: () => Promise.reject(new Error("legacy scan used")),
      scanSealed: () =>
        Promise.resolve({
          seal: Object.freeze({}),
          report: cleanReport(),
          facts: {
            sha256: SHA,
            sizeBytes: PDF_BYTES.byteLength,
            detectedMime: "application/pdf",
            validatedMime: "application/pdf",
          },
        }),
      promoteSealed: () => Promise.resolve("RECORDS_WRITTEN"),
    },
  });
  assert.equal(
    await service.finalizeUpload(PRINCIPAL, finalizeRequest()),
    null,
  );
  assert.equal(cleanupCalls, 1);
  assert.equal(executeCalls, 1);
});

Deno.test("upload capability is projected only after the exact intent and signed response validate", async () => {
  const { createDocumentStorageService } = await import(SERVICE_URL.href);
  const request = {
    schemaVersion: "laibe.drs-document-upload-intent.request.v1",
    mode: "NEW_DOCUMENT",
    documentKind: "drs_review",
    originalFilename: "review.pdf",
    declaredMime: "application/pdf",
    declaredSizeBytes: PDF_BYTES.byteLength,
    declaredSha256: SHA,
  };
  function serviceFor(signed) {
    return createDocumentStorageService({
      randomUuid: (() => {
        const ids = [
          "11111111-1111-4111-8111-111111111111",
          "22222222-2222-4222-8222-222222222222",
        ];
        return () => ids.shift();
      })(),
      now: () => new Date("2026-08-28T12:00:00.000Z"),
      repository: {
        runtimeAvailable: true,
        execute: (input) =>
          Promise.resolve({
            ok: true,
            state: "UPLOAD_INTENT_CREATED",
            intent_ref: JSON.parse(input.resourceRef).intentRef,
          }),
        queueOrphanCleanup: () => Promise.resolve(null),
      },
      storage: {
        runtimeAvailable: true,
        createSignedUpload: () => Promise.resolve(signed),
        inspect: () => Promise.resolve(null),
        promote: () => Promise.resolve(false),
        download: () => Promise.resolve(null),
      },
      scanner: { runtimeAvailable: false, scan: () => Promise.resolve(null) },
    });
  }
  const signed = {
    signedUploadUrl:
      "http://127.0.0.1:54321/storage/v1/object/upload/sign/drs-case-intake-private/intents/11111111-1111-4111-8111-111111111111/22222222-2222-4222-8222-222222222222.pdf?token=opaque",
    nativeExpiresAt: "2026-08-28T14:00:00.000Z",
    requiredHeaders: { "content-type": "application/pdf" },
  };
  const success = await serviceFor(signed).createUploadIntent(
    PRINCIPAL,
    request,
  );
  assert.equal(success?.state, "UPLOAD_INTENT_CREATED");
  assert.deepEqual(success?.upload, { method: "SIGNED_UPLOAD", ...signed });
  for (
    const invalid of [
      { ...signed, requiredHeaders: { "content-type": "image/png" } },
      {
        ...signed,
        requiredHeaders: { "content-type": "application/pdf", x: "authority" },
      },
      { ...signed, nativeExpiresAt: "not-a-time" },
      { ...signed, signedUploadUrl: "https://attacker.example/token" },
    ]
  ) {
    assert.equal(
      await serviceFor(invalid).createUploadIntent(PRINCIPAL, request),
      null,
    );
  }
});

Deno.test("default Edge composer is import-safe and fails closed without the exact runtime environment", async () => {
  const edge = await importRequired(EDGE_RUNTIME_URL, "Edge runtime");
  const composed = edge.createDrsDocumentEdgeRuntime(
    "uploadIntent",
    "/functions/v1/drs-document-upload-intent",
    { env: Object.freeze({ get: () => undefined }) },
  );
  assert.deepEqual(composed.allowedOrigins, []);
  assert.equal(composed.authority.runtimeAvailable, false);
});
