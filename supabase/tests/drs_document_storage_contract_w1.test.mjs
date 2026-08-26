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
    documentKind: "drawing",
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
    documentKind: "quote",
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
      { ...clean, structuralState: "AMBIGUOUS" },
      { ...clean, activeFeatures: ["OpenAction"] },
      { ...clean, pageCount: 501 },
      { ...clean, wallMs: 15_001 },
      { ...clean, decodedBytes: 200 * 1024 * 1024 + 1 },
    ]
  ) {
    assert.notEqual(evaluateHostileFileReport(invalid).state, "CLEAN");
  }
});
