import assert from "node:assert/strict";

const CONTRACTS_URL = new URL(
  "../functions/_shared/drs-document-storage/contracts.ts",
  import.meta.url,
);
const GUARD_URL = new URL(
  "../functions/_shared/drs-document-storage/request-guard.ts",
  import.meta.url,
);
const VALIDATION_URL = new URL(
  "../functions/_shared/drs-document-storage/validation.ts",
  import.meta.url,
);
const SERVICE_URL = new URL(
  "../functions/_shared/drs-document-storage/service.ts",
  import.meta.url,
);

const SHA = "a".repeat(64);
const VERSION_REF = "dvr_01j6a8k9m4q2w3e4r5t6y7u8i9";

function jsonRequest(path, body, init = {}) {
  return new Request(`https://project.example${path}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin: "https://app.example",
      ...init.headers,
    },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

Deno.test("focused RED 1: D5 closed document request and response seam exists", async () => {
  const contracts = await import(CONTRACTS_URL.href);
  assert.equal(
    contracts.DOCUMENT_LIMITS.maxFileBytes,
    26_214_400,
  );
  assert.deepEqual(contracts.DOCUMENT_LIMITS.allowedMime, [
    "application/pdf",
    "image/jpeg",
    "image/png",
  ]);
  assert.equal(
    contracts.UPLOAD_INTENT_REQUEST_SCHEMA,
    "laibe.drs-document-upload-intent.request.v1",
  );
  assert.equal(
    contracts.FINALIZE_REQUEST_SCHEMA,
    "laibe.drs-document-upload-finalize.request.v1",
  );
  assert.equal(
    contracts.SNAPSHOT_REQUEST_SCHEMA,
    "laibe.drs-document-snapshot.request.v1",
  );
});

Deno.test("upload intent parser accepts only the exact D5 request shape", async () => {
  const { readDocumentRequest } = await import(GUARD_URL.href);
  const valid = {
    schemaVersion: "laibe.drs-document-upload-intent.request.v1",
    mode: "NEW_DOCUMENT",
    documentKind: "drs_review",
    originalFilename: "一樓平面圖.pdf",
    declaredMime: "application/pdf",
    declaredSizeBytes: 1024,
    declaredSha256: SHA,
  };
  const parsed = await readDocumentRequest(
    "uploadIntent",
    jsonRequest("/functions/v1/drs-document-upload-intent", valid),
  );
  assert.equal(parsed.mode, "NEW_DOCUMENT");
  assert.equal(Object.isFrozen(parsed), true);

  for (
    const invalid of [
      { ...valid, caseId: "11111111-1111-4111-8111-111111111111" },
      { ...valid, role: "drs" },
      { ...valid, bucket: "drs-case-records-private" },
      { ...valid, documentRef: VERSION_REF },
      { ...valid, declaredSizeBytes: 26_214_401 },
      { ...valid, declaredMime: "image/svg+xml" },
      { ...valid, originalFilename: "drawing.png" },
      { ...valid, documentKind: "drawing" },
    ]
  ) {
    await assert.rejects(
      () =>
        readDocumentRequest(
          "uploadIntent",
          jsonRequest("/functions/v1/drs-document-upload-intent", invalid),
        ),
      (error) => error?.code === "INVALID_REQUEST" && error?.status === 400,
    );
  }
});

Deno.test("new-version, finalize and snapshot contracts reject ambiguity and caller authority", async () => {
  const { readDocumentRequest } = await import(GUARD_URL.href);
  const newVersion = {
    schemaVersion: "laibe.drs-document-upload-intent.request.v1",
    mode: "NEW_VERSION",
    documentRef: VERSION_REF.replace("dvr_", "doc_"),
    documentKind: "drs_review",
    originalFilename: "報價.pdf",
    declaredMime: "application/pdf",
    declaredSizeBytes: 4096,
    declaredSha256: SHA,
  };
  assert.equal(
    (await readDocumentRequest(
      "uploadIntent",
      jsonRequest("/functions/v1/drs-document-upload-intent", newVersion),
    )).mode,
    "NEW_VERSION",
  );

  const finalize = {
    schemaVersion: "laibe.drs-document-upload-finalize.request.v1",
    intentRef: "int_01j6a8k9m4q2w3e4r5t6y7u8i9",
    idempotencyKey: "finalize-01j6a8k9m4q2w3e4",
  };
  assert.equal(
    (await readDocumentRequest(
      "finalize",
      jsonRequest("/functions/v1/drs-document-upload-finalize", finalize),
    )).intentRef,
    finalize.intentRef,
  );

  const snapshot = {
    schemaVersion: "laibe.drs-document-snapshot.request.v1",
    purpose: "DECISION_BASIS",
    versionRefs: [VERSION_REF],
    idempotencyKey: "snapshot-01j6a8k9m4q2w3e4",
  };
  assert.deepEqual(
    (await readDocumentRequest(
      "snapshot",
      jsonRequest("/functions/v1/drs-document-snapshot", snapshot),
    )).versionRefs,
    [VERSION_REF],
  );

  await assert.rejects(
    () =>
      readDocumentRequest(
        "snapshot",
        jsonRequest(
          "/functions/v1/drs-document-snapshot",
          { ...snapshot, versionRefs: [VERSION_REF, VERSION_REF] },
        ),
      ),
    (error) => error?.code === "INVALID_REQUEST",
  );
  await assert.rejects(
    () =>
      readDocumentRequest(
        "finalize",
        jsonRequest(
          "/functions/v1/drs-document-upload-finalize?caseId=caller",
          finalize,
        ),
      ),
    (error) => error?.code === "INVALID_REQUEST",
  );
});

Deno.test("download contract is GET-only, bodyless, queryless and exact-version scoped", async () => {
  const { readDocumentRequest } = await import(GUARD_URL.href);
  const path = `/functions/v1/drs-document-version-download/${VERSION_REF}`;
  const parsed = await readDocumentRequest(
    "download",
    new Request(`https://project.example${path}`, {
      method: "GET",
      headers: { origin: "https://app.example" },
    }),
  );
  assert.equal(parsed.versionRef, VERSION_REF);
  for (
    const request of [
      new Request(`https://project.example${path}?download=1`),
      new Request(`https://project.example${path}`, { method: "POST" }),
      new Request(
        "https://project.example/functions/v1/drs-document-version-download/latest",
      ),
    ]
  ) {
    await assert.rejects(
      () => readDocumentRequest("download", request),
      (error) => error?.code === "INVALID_REQUEST",
    );
  }
});

Deno.test("duplicate JSON members, authority headers and malformed UTF-8 fail before authority work", async () => {
  const { readDocumentRequest } = await import(GUARD_URL.href);
  const duplicate =
    `{"schemaVersion":"laibe.drs-document-upload-finalize.request.v1","intentRef":"int_01j6a8k9m4q2w3e4r5t6y7u8i9","intentRef":"int_01j6a8k9m4q2w3e4r5t6y7u8i9","idempotencyKey":"finalize-01j6a8k9m4q2w3e4"}`;
  await assert.rejects(
    () =>
      readDocumentRequest(
        "finalize",
        jsonRequest("/functions/v1/drs-document-upload-finalize", duplicate),
      ),
    (error) => error?.code === "INVALID_REQUEST",
  );
  await assert.rejects(
    () =>
      readDocumentRequest(
        "finalize",
        jsonRequest(
          "/functions/v1/drs-document-upload-finalize",
          {
            schemaVersion: "laibe.drs-document-upload-finalize.request.v1",
            intentRef: "int_01j6a8k9m4q2w3e4r5t6y7u8i9",
            idempotencyKey: "finalize-01j6a8k9m4q2w3e4",
          },
          { headers: { "x-laibe-case-id": "caller" } },
        ),
      ),
    (error) => error?.code === "INVALID_REQUEST",
  );
});

Deno.test("request JSON reader cancels a content-length-free stream immediately after 64 KiB", async () => {
  const { readDocumentRequest } = await import(GUARD_URL.href);
  let pulls = 0;
  let cancelled = false;
  const body = new ReadableStream({
    pull(controller) {
      pulls += 1;
      controller.enqueue(new Uint8Array(pulls === 1 ? 64 * 1024 : 1));
      if (pulls > 2) controller.close();
    },
    cancel() {
      cancelled = true;
    },
  });
  const request = new Request(
    "https://project.example/functions/v1/drs-document-upload-finalize",
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body,
    },
  );
  await assert.rejects(
    () => readDocumentRequest("finalize", request),
    (error) => error?.code === "INVALID_REQUEST",
  );
  assert.equal(pulls, 2, "reader must stop on the first overflow byte");
  assert.equal(cancelled, true, "overflow must cancel the original stream");

  const boundaryPayload = JSON.stringify({
    schemaVersion: "laibe.drs-document-upload-finalize.request.v1",
    intentRef: "int_01j6a8k9m4q2w3e4r5t6y7u8i9",
    idempotencyKey: "finalize-01j6a8k9m4q2w3e4",
  });
  const boundary = boundaryPayload +
    " ".repeat(64 * 1024 - boundaryPayload.length);
  const parsed = await readDocumentRequest(
    "finalize",
    jsonRequest(
      "/functions/v1/drs-document-upload-finalize",
      boundary,
    ),
  );
  assert.equal(parsed.intentRef, "int_01j6a8k9m4q2w3e4r5t6y7u8i9");
});

Deno.test("hostile file validation remains fail closed until structural PASS and malware CLEAN", async () => {
  const { evaluateHostileFileReport } = await import(VALIDATION_URL.href);
  const clean = {
    declaredMime: "application/pdf",
    detectedMime: "application/pdf",
    extension: "pdf",
    decodedBytes: 2_000_000,
    pageCount: 12,
    megapixels: null,
    cpuMs: 500,
    wallMs: 700,
    rssBytes: 64 * 1024 * 1024,
    indirectObjects: 10_000,
    maxReferenceDepth: 12,
    structuralState: "PASS",
    activeFeatures: [],
    malwareState: "CLEAN",
  };
  assert.deepEqual(evaluateHostileFileReport(clean), {
    state: "CLEAN",
    reason: null,
  });
  for (
    const invalid of [
      { ...clean, malwareState: "UNKNOWN" },
      { ...clean, malwareState: "BROKEN" },
      { ...clean, malwareState: undefined },
      { ...clean, structuralState: "AMBIGUOUS" },
      { ...clean, structuralState: "BROKEN" },
      { ...clean, activeFeatures: ["OpenAction"] },
      { ...clean, activeFeatures: ["UnknownActiveFeature"] },
      { ...clean, activeFeatures: { some: () => false } },
      { ...clean, extension: "png" },
      { ...clean, pageCount: 501 },
      { ...clean, wallMs: 15_001 },
      { ...clean, decodedBytes: 200 * 1024 * 1024 + 1 },
    ]
  ) {
    assert.notEqual(evaluateHostileFileReport(invalid).state, "CLEAN");
  }
});

const PRINCIPAL = Object.freeze({
  authenticatedUserId: "11111111-1111-4111-8111-111111111111",
  expectedCaseId: "22222222-2222-4222-8222-222222222222",
  authorizationSubject: "DRS",
  grantId: "33333333-3333-4333-8333-333333333333",
  grantVersion: "7",
  grantExpiresAt: "2026-08-26T12:15:00.000Z",
});

Deno.test("finalize binds a CLEAN scanner report to actual intake MIME before promotion", async () => {
  const { createDocumentStorageService } = await import(SERVICE_URL.href);
  let executeCalls = 0;
  let promoteCalls = 0;
  const service = createDocumentStorageService({
    repository: {
      runtimeAvailable: true,
      execute() {
        executeCalls += 1;
        return Promise.resolve(
          executeCalls === 1
            ? {
              ok: true,
              state: "VALIDATION_REQUIRED",
              intake_bucket: "drs-case-intake-private",
              records_bucket: "drs-case-records-private",
              intake_object_key:
                "intents/11111111-1111-4111-8111-111111111111/22222222-2222-4222-8222-222222222222.pdf",
              records_object_key:
                "cases/22222222-2222-4222-8222-222222222222/documents/33333333-3333-4333-8333-333333333333/versions/44444444-4444-4444-8444-444444444444/source.pdf",
              declared_mime: "application/pdf",
            }
            : {
              ok: true,
              state: "FORMAL_VERSION_CREATED",
              document_ref: "doc_01j6a8k9m4q2w3e4r5t6y7u8i9",
              version_ref: VERSION_REF,
              receipt_ref: "rcp_01j6a8k9m4q2w3e4r5t6y7u8i9",
            },
        );
      },
      queueOrphanCleanup() {
        return Promise.resolve();
      },
    },
    storage: {
      runtimeAvailable: true,
      createSignedUpload: () => Promise.resolve(null),
      inspect: () =>
        Promise.resolve({
          bucket: "drs-case-intake-private",
          objectKey: "intents/source.pdf",
          sha256: "a".repeat(64),
          sizeBytes: 12,
          detectedMime: "application/pdf",
        }),
      promote() {
        promoteCalls += 1;
        return Promise.resolve(true);
      },
      download: () => Promise.resolve(null),
    },
    scanner: {
      runtimeAvailable: true,
      scan: () =>
        Promise.resolve({
          declaredMime: "image/jpeg",
          detectedMime: "image/jpeg",
          extension: "jpg",
          decodedBytes: 12,
          pageCount: null,
          megapixels: 1,
          cpuMs: 1,
          wallMs: 1,
          rssBytes: 1,
          indirectObjects: 0,
          maxReferenceDepth: 0,
          structuralState: "PASS",
          activeFeatures: [],
          malwareState: "CLEAN",
        }),
    },
  });
  const result = await service.finalizeUpload(PRINCIPAL, {
    schemaVersion: "laibe.drs-document-upload-finalize.request.v1",
    intentRef: "int_01j6a8k9m4q2w3e4r5t6y7u8i9",
    idempotencyKey: "finalize-01j6a8k9m4q2w3e4",
  });
  assert.equal(result?.state, "VALIDATION_PENDING");
  assert.equal(promoteCalls, 0);
  assert.equal(executeCalls, 1);
});

Deno.test("logical conflicts remain sanitized 409 responses and never queue orphan cleanup", async () => {
  const { createDocumentEdgeHandler, createDocumentStorageService } =
    await import(
      SERVICE_URL.href
    );
  let cleanupCalls = 0;
  const repository = {
    runtimeAvailable: true,
    execute: () =>
      Promise.resolve({ ok: false, state: "IDEMPOTENCY_CONFLICT" }),
    queueOrphanCleanup() {
      cleanupCalls += 1;
      return Promise.resolve();
    },
  };
  const storage = {
    runtimeAvailable: true,
    createSignedUpload: () => Promise.resolve(null),
    inspect: () => Promise.resolve(null),
    promote: () => Promise.resolve(false),
    download: () => Promise.resolve(null),
  };
  const service = createDocumentStorageService({
    repository,
    storage,
    scanner: { runtimeAvailable: false, scan: () => Promise.resolve(null) },
  });
  const dependencies = {
    allowedOrigins: ["https://app.example"],
    authority: {
      runtimeAvailable: true,
      authorize: () => Promise.resolve(PRINCIPAL),
    },
    service,
  };
  const finalizeHandler = createDocumentEdgeHandler(
    "finalize",
    "/functions/v1/drs-document-upload-finalize",
    dependencies,
  );
  const response = await finalizeHandler(jsonRequest(
    "/functions/v1/drs-document-upload-finalize",
    {
      schemaVersion: "laibe.drs-document-upload-finalize.request.v1",
      intentRef: "int_01j6a8k9m4q2w3e4r5t6y7u8i9",
      idempotencyKey: "finalize-01j6a8k9m4q2w3e4",
    },
    {
      headers: {
        authorization: "Bearer session",
        origin: "https://app.example",
      },
    },
  ));
  assert.equal(response.status, 409);
  assert.deepEqual(await response.json(), {
    schemaVersion: "laibe.drs-document-upload-finalize.response.v1",
    state: "IDEMPOTENCY_CONFLICT",
  });
  assert.equal(cleanupCalls, 0);

  const snapshotHandler = createDocumentEdgeHandler(
    "snapshot",
    "/functions/v1/drs-document-snapshot",
    dependencies,
  );
  const snapshotResponse = await snapshotHandler(jsonRequest(
    "/functions/v1/drs-document-snapshot",
    {
      schemaVersion: "laibe.drs-document-snapshot.request.v1",
      purpose: "DECISION_BASIS",
      versionRefs: [VERSION_REF],
      idempotencyKey: "snapshot-01j6a8k9m4q2w3e4",
    },
    {
      headers: {
        authorization: "Bearer session",
        origin: "https://app.example",
      },
    },
  ));
  assert.equal(snapshotResponse.status, 409);
  assert.deepEqual(await snapshotResponse.json(), {
    schemaVersion: "laibe.drs-document-snapshot.response.v1",
    state: "IDEMPOTENCY_CONFLICT",
  });
});

Deno.test("malformed formal replay cannot be projected as a successful version", async () => {
  const { createDocumentStorageService } = await import(SERVICE_URL.href);
  const service = createDocumentStorageService({
    repository: {
      runtimeAvailable: true,
      execute: () =>
        Promise.resolve({ ok: false, state: "FORMAL_VERSION_CREATED" }),
      queueOrphanCleanup: () => Promise.resolve(),
    },
    storage: {
      runtimeAvailable: true,
      createSignedUpload: () => Promise.resolve(null),
      inspect: () => Promise.resolve(null),
      promote: () => Promise.resolve(false),
      download: () => Promise.resolve(null),
    },
    scanner: { runtimeAvailable: false, scan: () => Promise.resolve(null) },
  });
  assert.equal(
    await service.finalizeUpload(PRINCIPAL, {
      schemaVersion: "laibe.drs-document-upload-finalize.request.v1",
      intentRef: "int_01j6a8k9m4q2w3e4r5t6y7u8i9",
      idempotencyKey: "finalize-01j6a8k9m4q2w3e4",
    }),
    null,
  );
});

Deno.test("snapshot success projection rejects malformed or open repository shapes", async () => {
  const { createDocumentEdgeHandler, createDocumentStorageService } =
    await import(SERVICE_URL.href);
  const validResult = {
    ok: true,
    state: "SNAPSHOT_RECORDED",
    snapshot_ref: "snp_01j6a8k9m4q2w3e4r5t6y7u8i9",
    receipt_ref: "rcp_01j6a8k9m4q2w3e4r5t6y7u8i9",
    canonical_payload_sha256: SHA,
  };
  const request = {
    schemaVersion: "laibe.drs-document-snapshot.request.v1",
    purpose: "DECISION_BASIS",
    versionRefs: [VERSION_REF],
    idempotencyKey: "snapshot-01j6a8k9m4q2w3e4",
  };
  const storage = {
    runtimeAvailable: true,
    createSignedUpload: () => Promise.resolve(null),
    inspect: () => Promise.resolve(null),
    promote: () => Promise.resolve(false),
    download: () => Promise.resolve(null),
  };
  for (
    const malformed of [
      { ...validResult, snapshot_ref: "snapshot-raw" },
      { ...validResult, receipt_ref: "rcp_short" },
      { ...validResult, canonical_payload_sha256: "A".repeat(64) },
      { ...validResult, canonical_payload_sha256: 7 },
      { ...validResult, provider_payload: { internal: true } },
    ]
  ) {
    const service = createDocumentStorageService({
      repository: {
        runtimeAvailable: true,
        execute: () => Promise.resolve(malformed),
        queueOrphanCleanup: () => Promise.resolve(undefined),
      },
      storage,
      scanner: { runtimeAvailable: false, scan: () => Promise.resolve(null) },
    });
    assert.equal(await service.createSnapshot(PRINCIPAL, request), null);
  }

  const malformedService = createDocumentStorageService({
    repository: {
      runtimeAvailable: true,
      execute: () => Promise.resolve({ ...validResult, snapshot_ref: null }),
      queueOrphanCleanup: () => Promise.resolve(undefined),
    },
    storage,
    scanner: { runtimeAvailable: false, scan: () => Promise.resolve(null) },
  });
  const handler = createDocumentEdgeHandler(
    "snapshot",
    "/functions/v1/drs-document-snapshot",
    {
      allowedOrigins: ["https://app.example"],
      authority: {
        runtimeAvailable: true,
        authorize: () => Promise.resolve(PRINCIPAL),
      },
      service: malformedService,
    },
  );
  const malformedResponse = await handler(jsonRequest(
    "/functions/v1/drs-document-snapshot",
    request,
    { headers: { authorization: "Bearer session" } },
  ));
  assert.equal(malformedResponse.status, 503);
  assert.deepEqual(await malformedResponse.json(), {
    state: "CONTEXT_UNAVAILABLE",
  });

  const validService = createDocumentStorageService({
    repository: {
      runtimeAvailable: true,
      execute: () => Promise.resolve(validResult),
      queueOrphanCleanup: () => Promise.resolve(undefined),
    },
    storage,
    scanner: { runtimeAvailable: false, scan: () => Promise.resolve(null) },
  });
  assert.deepEqual(await validService.createSnapshot(PRINCIPAL, request), {
    schemaVersion: "laibe.drs-document-snapshot.response.v1",
    state: "SNAPSHOT_RECORDED",
    snapshotRef: validResult.snapshot_ref,
    receiptRef: validResult.receipt_ref,
    canonicalPayloadSha256: SHA,
  });
});

Deno.test("post-promotion conflict is returned only after durable orphan queue proof", async () => {
  const { createDocumentStorageService } = await import(SERVICE_URL.href);
  const plan = {
    ok: true,
    state: "VALIDATION_REQUIRED",
    intake_bucket: "drs-case-intake-private",
    records_bucket: "drs-case-records-private",
    intake_object_key:
      "intents/11111111-1111-4111-8111-111111111111/22222222-2222-4222-8222-222222222222.pdf",
    records_object_key:
      "cases/22222222-2222-4222-8222-222222222222/documents/33333333-3333-4333-8333-333333333333/versions/44444444-4444-4444-8444-444444444444/source.pdf",
    declared_mime: "application/pdf",
  };
  const facts = {
    bucket: "drs-case-records-private",
    objectKey: plan.records_object_key,
    sha256: SHA,
    sizeBytes: 12,
    detectedMime: "application/pdf",
  };
  const storage = {
    runtimeAvailable: true,
    createSignedUpload: () => Promise.resolve(null),
    inspect: () => Promise.resolve(facts),
    promote: () => Promise.resolve(true),
    download: () => Promise.resolve(null),
  };
  const scanner = {
    runtimeAvailable: true,
    scan: () =>
      Promise.resolve({
        declaredMime: "application/pdf",
        detectedMime: "application/pdf",
        extension: "pdf",
        decodedBytes: 12,
        pageCount: 1,
        megapixels: null,
        cpuMs: 1,
        wallMs: 1,
        rssBytes: 1,
        indirectObjects: 1,
        maxReferenceDepth: 1,
        structuralState: "PASS",
        activeFeatures: [],
        malwareState: "CLEAN",
      }),
  };
  const request = {
    schemaVersion: "laibe.drs-document-upload-finalize.request.v1",
    intentRef: "int_01j6a8k9m4q2w3e4r5t6y7u8i9",
    idempotencyKey: "finalize-01j6a8k9m4q2w3e4",
  };

  async function run(cleanupResult) {
    let executeCalls = 0;
    let cleanupCalls = 0;
    const service = createDocumentStorageService({
      repository: {
        runtimeAvailable: true,
        execute: () =>
          Promise.resolve(
            ++executeCalls === 1
              ? plan
              : { ok: false, state: "IDEMPOTENCY_CONFLICT" },
          ),
        queueOrphanCleanup: () => {
          cleanupCalls += 1;
          return Promise.resolve(cleanupResult);
        },
      },
      storage,
      scanner,
    });
    try {
      return {
        result: await service.finalizeUpload(PRINCIPAL, request),
        cleanupCalls,
        failure: null,
      };
    } catch (failure) {
      return { result: null, cleanupCalls, failure };
    }
  }

  const withoutDurability = await run(undefined);
  assert.equal(withoutDurability.cleanupCalls, 1);
  assert.equal(
    withoutDurability.failure?.message,
    "ORPHAN_DURABILITY_UNAVAILABLE",
  );

  const durable = await run({
    ok: true,
    state: "ORPHAN_CLEANUP_QUEUED",
    work_item_id: "55555555-5555-4555-8555-555555555555",
  });
  assert.equal(durable.cleanupCalls, 1);
  assert.equal(durable.failure, null);
  assert.deepEqual(durable.result, {
    schemaVersion: "laibe.drs-document-upload-finalize.response.v1",
    state: "IDEMPOTENCY_CONFLICT",
  });
});

Deno.test("DRS upload intent rejects non-review kinds before authority or provider work", async () => {
  const { createDocumentEdgeHandler } = await import(SERVICE_URL.href);
  let authorityCalls = 0;
  let serviceCalls = 0;
  const handler = createDocumentEdgeHandler(
    "uploadIntent",
    "/functions/v1/drs-document-upload-intent",
    {
      allowedOrigins: ["https://app.example"],
      authority: {
        runtimeAvailable: true,
        authorize: () => {
          authorityCalls += 1;
          return Promise.resolve(PRINCIPAL);
        },
      },
      service: {
        createUploadIntent: () => {
          serviceCalls += 1;
          return Promise.resolve(null);
        },
        finalizeUpload: () => Promise.resolve(null),
        downloadVersion: () => Promise.resolve(null),
        createSnapshot: () => Promise.resolve(null),
      },
    },
  );
  const response = await handler(jsonRequest(
    "/functions/v1/drs-document-upload-intent",
    {
      schemaVersion: "laibe.drs-document-upload-intent.request.v1",
      mode: "NEW_DOCUMENT",
      documentKind: "drawing",
      originalFilename: "drawing.pdf",
      declaredMime: "application/pdf",
      declaredSizeBytes: 1024,
      declaredSha256: SHA,
    },
    { headers: { authorization: "Bearer session" } },
  ));
  assert.equal(response.status, 400);
  assert.equal(authorityCalls, 0);
  assert.equal(serviceCalls, 0);
});
