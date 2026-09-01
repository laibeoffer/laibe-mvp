import assert from "node:assert/strict";

const contractsUrl = new URL(
  "../functions/_shared/drs-document-storage/contracts.ts",
  import.meta.url,
);
const serviceUrl = new URL(
  "../functions/_shared/drs-document-storage/service.ts",
  import.meta.url,
);
const repositoryUrl = new URL(
  "../functions/_shared/drs-document-storage/supabase-document-adapter.ts",
  import.meta.url,
);
const storageUrl = new URL(
  "../functions/_shared/drs-document-storage/supabase-storage-adapter.ts",
  import.meta.url,
);

async function optionalEnv(name) {
  try {
    const permission = await Deno.permissions.query({
      name: "env",
      variable: name,
    });
    return permission.state === "granted" ? Deno.env.get(name) : undefined;
  } catch {
    return undefined;
  }
}

const REAL_STORAGE_CONFIRMED =
  (await optionalEnv("DRS_TASK4_REAL_STORAGE")) === "YES";

const VALID_FINALIZE = Object.freeze({
  schemaVersion: "laibe.drs-document-upload-finalize.request.v2",
  intentRef: "int_01j6a8k9m4q2w3e4r5t6y7u8i9",
  idempotencyKey: "finalize-01j6a8k9m4q2w3e4",
  commandId: "11111111-1111-4111-8111-111111111111",
  expectedCaseVersion: 7,
});
const SESSION = Object.freeze({
  userId: "11111111-1111-4111-8111-111111111111",
  sessionId: "22222222-2222-4222-8222-222222222222",
  caseId: "33333333-3333-4333-8333-333333333333",
  membershipId: "44444444-4444-4444-8444-444444444444",
  role: "owner",
  authorityVersion: 7,
  nextActor: "owner",
});
const INTAKE_KEY =
  "intents/55555555-5555-4555-8555-555555555555/66666666-6666-4666-8666-666666666666.pdf";
const RECORDS_KEY =
  "cases/33333333-3333-4333-8333-333333333333/documents/77777777-7777-4777-8777-777777777777/versions/88888888-8888-4888-8888-888888888888/source.pdf";
const PDF_BYTES = new TextEncoder().encode("%PDF-1.7\nTask4 deterministic fixture");
const PDF_SHA256 =
  "2bd18072c1be5d76677a2f47c7abc8ca6ffe1b34c4a5f953a00744c2bca74aa2";

function rewriteStandaloneStorageRequestUrl(storageOrigin, input) {
  const url = new URL(input);
  if (
    url.origin === storageOrigin &&
    (url.pathname === "/storage/v1" ||
      url.pathname.startsWith("/storage/v1/"))
  ) {
    url.pathname = url.pathname.slice("/storage/v1".length) || "/";
  }
  return url;
}

function createStandaloneStorageFetch(
  storageOrigin,
  fetchImplementation = fetch,
) {
  return (input, init) =>
    fetchImplementation(
      rewriteStandaloneStorageRequestUrl(storageOrigin, input),
      init,
    );
}

Deno.test("standalone Storage test transport removes only its gateway prefix", () => {
  assert.equal(
    rewriteStandaloneStorageRequestUrl(
      "http://storage:5000",
      "http://storage:5000/storage/v1/bucket/drs-case-intake-private",
    ).href,
    "http://storage:5000/bucket/drs-case-intake-private",
  );
  assert.equal(
    rewriteStandaloneStorageRequestUrl(
      "http://storage:5000",
      "https://project.supabase.co/storage/v1/object/authenticated/private/file.pdf",
    ).href,
    "https://project.supabase.co/storage/v1/object/authenticated/private/file.pdf",
  );
});

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

function objectFacts(bucket, objectKey, overrides = {}) {
  return {
    bucket,
    objectKey,
    sha256: PDF_SHA256,
    sizeBytes: PDF_BYTES.byteLength,
    detectedMime: "application/pdf",
    ...overrides,
  };
}

async function runFinalizeScenario(options = {}) {
  const { createDocumentStorageService } = await import(serviceUrl.href);
  const calls = {
    authorize: 0,
    commit: 0,
    inspect: 0,
    promote: 0,
    queue: 0,
  };
  const repository = {
    runtimeAvailable: true,
    execute: () => Promise.resolve(null),
    finalizeDomainCommand(input) {
      if (input.action === "AUTHORIZE") {
        calls.authorize += 1;
        return Promise.resolve({
          ok: true,
          state: "VALIDATION_REQUIRED",
          newEffects: 0,
          intake_bucket: "drs-case-intake-private",
          intake_object_key: INTAKE_KEY,
          records_bucket: "drs-case-records-private",
          records_object_key: RECORDS_KEY,
          declared_mime: "application/pdf",
          declared_size_bytes: PDF_BYTES.byteLength,
          declared_sha256: PDF_SHA256,
        });
      }
      calls.commit += 1;
      return Promise.resolve(options.commitResult ?? {
        ok: true,
        state: "APPLIED",
        newEffects: 1,
        document_ref: "doc_01j6a8k9m4q2w3e4r5t6y7u8i9",
        version_ref: "dvr_01j6a8k9m4q2w3e4r5t6y7u8i9",
        receipt_ref: "rcp_01j6a8k9m4q2w3e4r5t6y7u8i9",
      });
    },
    queueOrphanCleanup() {
      calls.queue += 1;
      return Promise.resolve(
        Object.hasOwn(options, "queueResult")
          ? options.queueResult
          : {
            ok: true,
            state: "ORPHAN_CLEANUP_QUEUED",
            work_item_id: "99999999-9999-4999-8999-999999999999",
          },
      );
    },
  };
  const storage = {
    runtimeAvailable: true,
    createSignedUpload: () => Promise.resolve(null),
    download: () => Promise.resolve(null),
    inspect(input) {
      calls.inspect += 1;
      if (calls.inspect === 1) {
        return Promise.resolve(
          objectFacts(input.bucket, input.objectKey, options.beforeScan),
        );
      }
      if (calls.inspect === 2) {
        return Promise.resolve(
          objectFacts(input.bucket, input.objectKey, options.afterScan),
        );
      }
      return Promise.resolve(
        objectFacts(input.bucket, input.objectKey, options.destination),
      );
    },
    promote() {
      calls.promote += 1;
      return Promise.resolve(options.promoteResult ?? true);
    },
  };
  const scanner = {
    runtimeAvailable: options.scannerAvailable ?? true,
    scan() {
      if (options.scannerThrow) throw new Error("SCANNER_THROW_FIXTURE");
      return Promise.resolve(
        Object.hasOwn(options, "scanResult")
          ? options.scanResult
          : cleanReport(),
      );
    },
  };
  const service = createDocumentStorageService({ repository, storage, scanner });
  let result;
  let error;
  try {
    result = await service.finalizeUpload(SESSION, VALID_FINALIZE);
  } catch (failure) {
    error = failure;
  }
  return { calls, result, error };
}

Deno.test("finalize v2 admits only the four caller fields plus schemaVersion", async () => {
  const { parseFinalizeRequest } = await import(contractsUrl.href);
  assert.deepEqual(parseFinalizeRequest({ ...VALID_FINALIZE }), VALID_FINALIZE);

  for (
    const forbidden of [
      "userId",
      "caseId",
      "session",
      "authSession",
      "membership",
      "role",
      "sourceRole",
      "authorityVersion",
      "nextActor",
      "visibility",
      "bucket",
      "object",
      "document",
      "version",
      "receipt",
      "canonicalPayloadSha256",
      "evidenceRefs",
    ]
  ) {
    assert.equal(
      parseFinalizeRequest({ ...VALID_FINALIZE, [forbidden]: "caller-value" }),
      null,
      `caller authority/resource field must fail closed: ${forbidden}`,
    );
  }
});

Deno.test("finalize v2 rejects non-UUID commands and non-positive unsafe versions", async () => {
  const { parseFinalizeRequest } = await import(contractsUrl.href);
  for (const commandId of ["", "not-a-uuid", crypto.randomUUID().toUpperCase()]) {
    assert.equal(parseFinalizeRequest({ ...VALID_FINALIZE, commandId }), null);
  }
  for (const expectedCaseVersion of [0, -1, 1.5, Number.MAX_SAFE_INTEGER + 1]) {
    assert.equal(
      parseFinalizeRequest({ ...VALID_FINALIZE, expectedCaseVersion }),
      null,
    );
  }
});

Deno.test("finalize canonical bytes ignore inherited toJSON seams", async () => {
  const {
    canonicalFinalizeRequestV2,
    sha256CanonicalText,
  } = await import(contractsUrl.href);
  const expected =
    "schemaVersion=laibe.drs-document-upload-finalize.request.v2\n" +
    "intentRef=int_01j6a8k9m4q2w3e4r5t6y7u8i9\n" +
    "idempotencyKey=finalize-01j6a8k9m4q2w3e4\n" +
    "commandId=11111111-1111-4111-8111-111111111111\n" +
    "expectedCaseVersion=7";
  Object.prototype.toJSON = () => ({ poisoned: true });
  try {
    assert.equal(canonicalFinalizeRequestV2(VALID_FINALIZE), expected);
    assert.equal(
      await sha256CanonicalText(expected),
      "85306064b7679ca09b74a486ddf7b58f8291f1600c9e354562e6a2c0f599fca7",
    );
  } finally {
    delete Object.prototype.toJSON;
  }
});

Deno.test("only CLEAN scanner output plus stable source and destination formalizes", async () => {
  const { calls, result, error } = await runFinalizeScenario();
  assert.equal(error, undefined);
  assert.equal(result?.state, "FORMAL_VERSION_CREATED");
  assert.deepEqual(calls, {
    authorize: 1,
    commit: 1,
    inspect: 3,
    promote: 1,
    queue: 0,
  });
});

Deno.test("scanner UNKNOWN TIMEOUT INFECTED null malformed throw and MIME mismatch fail before promotion", async () => {
  const scenarios = [
    { scanResult: cleanReport({ malwareState: "UNKNOWN" }) },
    { scanResult: cleanReport({ malwareState: "TIMEOUT" }) },
    { scanResult: cleanReport({ malwareState: "INFECTED" }) },
    { scanResult: null },
    { scanResult: {} },
    { scannerThrow: true },
    { scanResult: cleanReport({ detectedMime: "image/png" }) },
  ];
  for (const scenario of scenarios) {
    const { calls, result, error } = await runFinalizeScenario(scenario);
    assert.equal(error, undefined);
    assert.equal(result?.state, "VALIDATION_PENDING");
    assert.equal(calls.promote, 0);
    assert.equal(calls.commit, 0);
    assert.equal(calls.queue, 0);
  }
});

Deno.test("mutation before or after scan cannot promote", async () => {
  for (
    const scenario of [
      { beforeScan: { sha256: "a".repeat(64) } },
      { afterScan: { sizeBytes: PDF_BYTES.byteLength + 1 } },
    ]
  ) {
    const { calls, result, error } = await runFinalizeScenario(scenario);
    assert.equal(error, undefined);
    assert.equal(result, null);
    assert.equal(calls.promote, 0);
    assert.equal(calls.commit, 0);
    assert.equal(calls.queue, 0);
  }
});

Deno.test("destination drift and post-promotion DB conflict queue exactly one durable orphan", async () => {
  for (
    const scenario of [
      { destination: { objectKey: `${RECORDS_KEY}-drift` } },
      {
        commitResult: {
          ok: false,
          state: "CASE_VERSION_CONFLICT",
          newEffects: 0,
        },
      },
    ]
  ) {
    const { calls, result, error } = await runFinalizeScenario(scenario);
    assert.equal(error, undefined);
    assert.equal(calls.promote, 1);
    assert.equal(calls.queue, 1);
    if (scenario.commitResult) {
      assert.deepEqual(result, {
        schemaVersion: "laibe.drs-document-upload-finalize.response.v2",
        state: "CASE_VERSION_CONFLICT",
      });
    } else {
      assert.equal(result, null);
    }
  }
});

Deno.test("a promoted object without durable orphan recording fails ORPHAN_DURABILITY_UNAVAILABLE", async () => {
  const { calls, error } = await runFinalizeScenario({
    destination: { sha256: "b".repeat(64) },
    queueResult: null,
  });
  assert.equal(calls.promote, 1);
  assert.equal(calls.queue, 1);
  assert.equal(error?.message, "ORPHAN_DURABILITY_UNAVAILABLE");
});

Deno.test("real scanner provider remains a truthful HOLD seam", async () => {
  const { calls, result } = await runFinalizeScenario({
    scannerAvailable: false,
  });
  assert.equal(result?.state, "VALIDATION_PENDING");
  assert.equal(calls.inspect, 0);
  assert.equal(calls.promote, 0);
  assert.equal(calls.commit, 0);
});

Deno.test("Task4 repository finalize path calls only the new public RPC", async () => {
  const { createSupabaseDocumentRepository } = await import(repositoryUrl.href);
  const seen = [];
  const repository = createSupabaseDocumentRepository({
    env: {
      get(name) {
        if (name === "SUPABASE_URL") return "http://rest:3000";
        if (name === "SUPABASE_SERVICE_ROLE_KEY") return "server-key";
        return undefined;
      },
    },
    fetch(url) {
      seen.push(String(url));
      return Promise.resolve(
        new Response(JSON.stringify({ ok: true, state: "VALIDATION_REQUIRED" }), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      );
    },
  });
  const contracts = await import(contractsUrl.href);
  const requestHash = await contracts.sha256CanonicalText(
    contracts.canonicalFinalizeRequestV2(VALID_FINALIZE),
  );
  assert.notEqual(
    await repository.finalizeDomainCommand({
      principal: SESSION,
      action: "AUTHORIZE",
      request: VALID_FINALIZE,
      finalizeRequestPayloadSha256: requestHash,
    }),
    null,
  );
  assert.equal(
    await repository.execute({
      principal: {
        authenticatedUserId: SESSION.userId,
        expectedCaseId: SESSION.caseId,
        authorizationSubject: `drs-specialist:${SESSION.userId}`,
        grantId: SESSION.membershipId,
        grantVersion: "7",
        grantExpiresAt: "2030-01-01T00:00:00.000Z",
      },
      operation: "FINALIZE_UPLOAD",
      resourceRef: VALID_FINALIZE.intentRef,
      idempotencyKey: VALID_FINALIZE.idempotencyKey,
      expectedPayloadSha256: requestHash,
    }),
    null,
  );
  assert.deepEqual(seen, [
    "http://rest:3000/rest/v1/rpc/server_document_finalize_domain_command_v1",
  ]);
});

Deno.test({
  name:
    "real Storage API: private intake bytes promote through runtime v2 into case records",
  ignore: !REAL_STORAGE_CONFIRMED,
  async fn() {
    const storageOrigin = await optionalEnv("DRS_TASK4_STORAGE_URL");
    const restOrigin = await optionalEnv("DRS_TASK4_REST_URL");
    const serviceKey = await optionalEnv("DRS_TASK4_SERVICE_ROLE_KEY");
    const anonKey = await optionalEnv("DRS_TASK4_ANON_KEY");
    const caseId = await optionalEnv("DRS_TASK4_STORAGE_CASE_ID");
    const userId = await optionalEnv("DRS_TASK4_STORAGE_USER_ID");
    const sessionId = await optionalEnv("DRS_TASK4_STORAGE_SESSION_ID");
    const membershipId = await optionalEnv(
      "DRS_TASK4_STORAGE_MEMBERSHIP_ID",
    );
    const expectedVersionRaw = await optionalEnv(
      "DRS_TASK4_STORAGE_EXPECTED_VERSION",
    );
    const intentRef = await optionalEnv("DRS_TASK4_STORAGE_INTENT_REF");
    const commandId = await optionalEnv("DRS_TASK4_STORAGE_COMMAND_ID");
    const idempotencyKey = await optionalEnv(
      "DRS_TASK4_STORAGE_IDEMPOTENCY_KEY",
    );
    const intakeKey = await optionalEnv("DRS_TASK4_STORAGE_INTAKE_KEY");
    const recordsKey = await optionalEnv("DRS_TASK4_STORAGE_RECORDS_KEY");
    for (
      const value of [
        storageOrigin,
        restOrigin,
        serviceKey,
        anonKey,
        caseId,
        userId,
        sessionId,
        membershipId,
        expectedVersionRaw,
        intentRef,
        commandId,
        idempotencyKey,
        intakeKey,
        recordsKey,
      ]
    ) assert.ok(value);
    assert.equal(storageOrigin, "http://storage:5000");
    assert.equal(restOrigin, "http://rest:3000");
    const standaloneStorageFetch = createStandaloneStorageFetch(storageOrigin);
    const expectedCaseVersion = Number(expectedVersionRaw);
    assert.equal(Number.isSafeInteger(expectedCaseVersion), true);
    assert.ok(expectedCaseVersion > 0);
    assert.equal(
      await crypto.subtle.digest("SHA-256", PDF_BYTES).then((digest) =>
        [...new Uint8Array(digest)].map((byte) =>
          byte.toString(16).padStart(2, "0")
        ).join("")
      ),
      PDF_SHA256,
    );

    const adminHeaders = {
      authorization: `Bearer ${serviceKey}`,
      apikey: serviceKey,
    };
    const uploaded = [
      ["drs-case-intake-private", intakeKey],
      ["drs-case-records-private", recordsKey],
    ];
    let primaryFailure;
    try {
      for (
        const bucket of [
          "drs-case-intake-private",
          "drs-case-records-private",
        ]
      ) {
        const response = await standaloneStorageFetch(
          `${storageOrigin}/storage/v1/bucket/${bucket}`,
          { headers: adminHeaders },
        );
        const text = await response.text();
        assert.equal(
          response.ok,
          true,
          `bucket unavailable: ${bucket} status=${response.status} body=${text}`,
        );
        const body = JSON.parse(text);
        assert.equal(body.id, bucket);
        assert.equal(body.public, false);
        assert.equal(Number(body.file_size_limit), 26_214_400);
        assert.deepEqual(body.allowed_mime_types, [
          "application/pdf",
          "image/jpeg",
          "image/png",
        ]);
      }

      const upload = await standaloneStorageFetch(
        `${storageOrigin}/storage/v1/object/drs-case-intake-private/${intakeKey}`,
        {
          method: "POST",
          headers: {
            ...adminHeaders,
            "content-type": "application/pdf",
            "x-upsert": "false",
          },
          body: PDF_BYTES,
        },
      );
      assert.equal(
        upload.ok,
        true,
        `real intake upload failed: ${upload.status} ${await upload.text()}`,
      );

      const { createSupabaseDocumentRepository } = await import(
        repositoryUrl.href
      );
      const { createSupabaseDocumentStoragePort } = await import(
        storageUrl.href
      );
      const { createDocumentStorageService } = await import(serviceUrl.href);
      const repository = createSupabaseDocumentRepository({
        env: {
          get(name) {
            if (name === "SUPABASE_URL") return restOrigin;
            if (name === "SUPABASE_SERVICE_ROLE_KEY") return serviceKey;
            return undefined;
          },
        },
      });
      const storage = createSupabaseDocumentStoragePort({
        env: {
          get(name) {
            if (name === "SUPABASE_URL") return storageOrigin;
            if (name === "SUPABASE_SERVICE_ROLE_KEY") return serviceKey;
            return undefined;
          },
        },
        fetch: standaloneStorageFetch,
      });
      const scanner = {
        runtimeAvailable: true,
        scan: () => Promise.resolve(cleanReport()),
      };
      const service = createDocumentStorageService({
        repository,
        storage,
        scanner,
      });
      const result = await service.finalizeUpload({
        userId,
        sessionId,
        caseId,
        membershipId,
        role: "owner",
        authorityVersion: 4,
        nextActor: "owner",
      }, {
        schemaVersion: "laibe.drs-document-upload-finalize.request.v2",
        intentRef,
        idempotencyKey,
        commandId,
        expectedCaseVersion,
      });
      assert.equal(result?.state, "FORMAL_VERSION_CREATED");
      assert.match(result?.documentRef ?? "", /^doc_[0-9a-z]{20,40}$/u);
      assert.match(result?.versionRef ?? "", /^dvr_[0-9a-z]{20,40}$/u);
      assert.match(result?.receiptRef ?? "", /^rcp_[0-9a-z]{20,40}$/u);

      const destination = await storage.inspect({
        bucket: "drs-case-records-private",
        objectKey: recordsKey,
      });
      assert.deepEqual(destination, {
        bucket: "drs-case-records-private",
        objectKey: recordsKey,
        sha256: PDF_SHA256,
        sizeBytes: PDF_BYTES.byteLength,
        detectedMime: "application/pdf",
      });
      const downloaded = await storage.download({
        bucket: "drs-case-records-private",
        objectKey: recordsKey,
      });
      assert.ok(downloaded);
      assert.deepEqual(
        new Uint8Array(await downloaded.arrayBuffer()),
        PDF_BYTES,
      );

      const browserRead = await standaloneStorageFetch(
        `${storageOrigin}/storage/v1/object/authenticated/drs-case-records-private/${recordsKey}`,
        {
          headers: {
            authorization: `Bearer ${anonKey}`,
            apikey: anonKey,
          },
        },
      );
      assert.equal(browserRead.ok, false);
      assert.ok([400, 401, 403, 404].includes(browserRead.status));
    } catch (error) {
      primaryFailure = error;
    }

    const cleanupErrors = [];
    for (const [bucket, objectKey] of uploaded) {
      try {
        const cleanup = await standaloneStorageFetch(
          `${storageOrigin}/storage/v1/object/${bucket}`,
          {
            method: "DELETE",
            headers: {
              ...adminHeaders,
              "content-type": "application/json",
            },
            body: JSON.stringify({ prefixes: [objectKey] }),
          },
        );
        const cleanupText = await cleanup.text();
        assert.equal(
          cleanup.ok,
          true,
          `cleanup failed: ${bucket} status=${cleanup.status} body=${cleanupText}`,
        );
      } catch (error) {
        cleanupErrors.push(error);
      }
    }
    if (primaryFailure && cleanupErrors.length > 0) {
      throw new AggregateError(
        [primaryFailure, ...cleanupErrors],
        "real Storage journey and cleanup both failed",
      );
    }
    if (primaryFailure) throw primaryFailure;
    if (cleanupErrors.length > 0) {
      throw new AggregateError(cleanupErrors, "real Storage cleanup failed");
    }
  },
});
