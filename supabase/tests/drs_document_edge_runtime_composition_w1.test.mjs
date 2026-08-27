import assert from "node:assert/strict";

import { createDrsSecureSessionRuntime } from "../functions/_shared/drs-auth/drs-secure-session-runtime.ts";
import { createDrsDocumentEdgeRuntime } from "../functions/_shared/drs-document-storage/drs-document-edge-runtime.ts";
import { createDrsDocumentScannerRuntime } from "../functions/_shared/drs-document-storage/drs-document-scanner-runtime.ts";
import { createDocumentStorageService } from "../functions/_shared/drs-document-storage/service.ts";
import { createDrsDocumentSnapshotHandler } from "../functions/drs-document-snapshot/index.ts";
import { createDrsDocumentUploadFinalizeHandler } from "../functions/drs-document-upload-finalize/index.ts";
import { createDrsDocumentUploadIntentHandler } from "../functions/drs-document-upload-intent/index.ts";
import { createDrsDocumentVersionDownloadHandler } from "../functions/drs-document-version-download/index.ts";
import { createDrsSessionBootstrapEndpoint } from "../functions/drs-session-bootstrap/index.ts";

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
const APP_ORIGIN = "https://app.example.com";
const SUPABASE_ORIGIN = "http://127.0.0.1:54321";
const SCANNER_ORIGIN = "http://127.0.0.1:54329";
const SESSION_COOKIE_NAME = "__Host-laibe-drs-session";
const SPECIALIST_ID = "55555555-5555-4555-8555-555555555555";
const AUTHORIZATION_SUBJECT = `drs-specialist:${SPECIALIST_ID}`;
const DOCUMENT_REF = "doc_01j6a8k9m4q2w3e4r5t6y7u8i9";
const VERSION_REF = "dvr_01j6a8k9m4q2w3e4r5t6y7u8i9";
const RECEIPT_REF = "rcp_01j6a8k9m4q2w3e4r5t6y7u8i9";
const SNAPSHOT_REF = "snp_01j6a8k9m4q2w3e4r5t6y7u8i9";

function base64Url(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(
    /=+$/u,
    "",
  );
}

const COOKIE_KEY = base64Url(new Uint8Array(32).fill(0x31));
const PROOF_KEY = base64Url(new Uint8Array(32).fill(0x32));

function productionEnvironment(overrides = {}) {
  const values = Object.freeze({
    SUPABASE_URL: SUPABASE_ORIGIN,
    SUPABASE_SERVICE_ROLE_KEY: "opaque-test-service-role",
    LAIBE_DRS_APP_ORIGIN: APP_ORIGIN,
    LAIBE_DRS_SESSION_SUCCESS_URL: `${APP_ORIGIN}/specialist`,
    LAIBE_DRS_SESSION_COOKIE_NAME: SESSION_COOKIE_NAME,
    LAIBE_DRS_SESSION_COOKIE_KEY_V1: COOKIE_KEY,
    LAIBE_DRS_BFF_PROOF_KEY_V1: PROOF_KEY,
    LAIBE_DRS_DOCUMENT_SCANNER_URL: `${SCANNER_ORIGIN}/v1/scan`,
    LAIBE_DRS_DOCUMENT_SCANNER_TOKEN: "opaque-test-scanner-token",
    ...overrides,
  });
  return Object.freeze({ get: (name) => values[name] });
}

function jsonResponse(payload, status = 200) {
  const body = JSON.stringify(payload);
  return new Response(body, {
    status,
    headers: {
      "content-length": String(new TextEncoder().encode(body).byteLength),
      "content-type": "application/json",
    },
  });
}

function createProductionFetchHarness(now) {
  const calls = [];
  let issued = null;
  const grantExpiresAt = new Date(now.getTime() + 30_000).toISOString();
  const fetch = (input, init = {}) => {
    const url = new URL(
      typeof input === "string" || input instanceof URL ? input : input.url,
    );
    const body = typeof init.body === "string" ? JSON.parse(init.body) : null;
    calls.push(Object.freeze({ pathname: url.pathname, body }));
    if (
      url.origin === SUPABASE_ORIGIN && url.pathname.startsWith("/rest/v1/rpc/")
    ) {
      if (url.pathname.endsWith("/drs_server_session_issue_v1")) {
        issued = Object.freeze({
          digest: body.p_access_token_digest,
          expiresAt: body.p_expires_at,
        });
        return jsonResponse({
          server_session_id: body.p_server_session_id,
          expires_at: body.p_expires_at,
        });
      }
      if (url.pathname.endsWith("/drs_server_session_verify_v1")) {
        assert.equal(body.p_access_token_digest, issued?.digest);
        return jsonResponse({
          authenticated_user_id: PRINCIPAL.authenticatedUserId,
          specialist_id: SPECIALIST_ID,
          authorization_subject: AUTHORIZATION_SUBJECT,
          expires_at: issued?.expiresAt,
        });
      }
      if (url.pathname.endsWith("/drs_workspace_grant_v1")) {
        return jsonResponse({
          authorized: true,
          state: "AUTHORIZED_DRS_WORKSPACE",
          case_id: PRINCIPAL.expectedCaseId,
          case_status: "active",
          access_mode: "read_only",
        });
      }
      if (url.pathname.endsWith("/drs_workspace_grant_v2")) {
        return jsonResponse({
          authorized: true,
          state: "AUTHORIZED_DRS_VERSIONED_WORKSPACE",
          authenticated_user_id: PRINCIPAL.authenticatedUserId,
          case_id: PRINCIPAL.expectedCaseId,
          authorization_subject: AUTHORIZATION_SUBJECT,
          grant_id: PRINCIPAL.grantId,
          grant_version: PRINCIPAL.grantVersion,
          grant_expires_at: grantExpiresAt,
        });
      }
      if (url.pathname.endsWith("/server_document_operation_v1")) {
        if (body.p_operation === "CREATE_UPLOAD_INTENT") {
          const resource = JSON.parse(body.p_resource_ref);
          return jsonResponse({
            ok: true,
            state: "UPLOAD_INTENT_CREATED",
            intent_ref: resource.intentRef,
          });
        }
        if (body.p_operation === "FINALIZE_UPLOAD") {
          return jsonResponse({
            ok: true,
            state: "FORMAL_VERSION_CREATED",
            document_ref: DOCUMENT_REF,
            version_ref: VERSION_REF,
            receipt_ref: RECEIPT_REF,
          });
        }
        if (body.p_operation === "CREATE_SNAPSHOT") {
          return jsonResponse({
            ok: true,
            state: "SNAPSHOT_RECORDED",
            snapshot_ref: SNAPSHOT_REF,
            receipt_ref: RECEIPT_REF,
            canonical_payload_sha256: SHA,
          });
        }
        if (body.p_operation === "DOWNLOAD_VERSION") {
          return jsonResponse({
            ok: true,
            state: "DOWNLOAD_READY",
            bucket_id: RECORDS_BUCKET,
            object_key: RECORDS_KEY,
          });
        }
      }
    }
    if (
      url.origin === SUPABASE_ORIGIN &&
      url.pathname.startsWith("/storage/v1/object/upload/sign/")
    ) {
      return jsonResponse({
        url: `${
          url.pathname.slice("/storage/v1".length)
        }?token=opaque-test-token`,
      });
    }
    if (
      url.origin === SUPABASE_ORIGIN &&
      url.pathname.startsWith(
        `/storage/v1/object/authenticated/${RECORDS_BUCKET}/`,
      )
    ) {
      return new Response(PDF_BYTES, {
        status: 200,
        headers: { "content-type": "application/pdf" },
      });
    }
    if (url.href === `${SCANNER_ORIGIN}/v1/scan`) {
      return jsonResponse(cleanReport());
    }
    throw new Error(`unexpected provider call ${url.pathname}`);
  };
  return Object.freeze({ calls, fetch });
}

async function createBrowserAuthorization(options) {
  const runtime = createDrsSecureSessionRuntime(options);
  assert.equal(runtime.runtimeAvailable, true);
  const produced = await runtime.verifiedSessionProducer.createVerifiedSession({
    authenticatedUserId: PRINCIPAL.authenticatedUserId,
    specialistId: SPECIALIST_ID,
    authorizationSubject: AUTHORIZATION_SUBJECT,
    callbackOrigin: APP_ORIGIN,
    successRedirectUrl: `${APP_ORIGIN}/specialist`,
    sessionCookieName: SESSION_COOKIE_NAME,
  });
  const cookie = produced.response.headers.get("set-cookie")?.split(";", 1)[0];
  assert.match(cookie, new RegExp(`^${SESSION_COOKIE_NAME}=v1\\.`));
  const bootstrap = createDrsSessionBootstrapEndpoint(
    runtime.bootstrapDependencies,
  );
  const response = await bootstrap(
    new Request(`${APP_ORIGIN}/functions/v1/drs-session-bootstrap`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie,
        origin: APP_ORIGIN,
        "sec-fetch-site": "same-origin",
      },
      body: "{}",
    }),
  );
  assert.equal(response.status, 204);
  const authorization = response.headers.get("authorization");
  assert.match(
    authorization,
    /^Bearer [A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/u,
  );
  return Object.freeze({ authorization, cookie });
}

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

Deno.test("focused RED: exact scanner and Edge runtime modules exist", () => {
  assert.equal(typeof createDrsDocumentScannerRuntime, "function");
  assert.equal(typeof createDrsDocumentEdgeRuntime, "function");
});

Deno.test("scanner derives identity from the exact bytes it scans and promotes that sealed byte sequence once", async () => {
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

Deno.test("all four real handler factories validate before authority and compose the exact server runtime", async () => {
  const now = new Date();
  const harness = createProductionFetchHarness(now);
  const options = Object.freeze({
    env: productionEnvironment(),
    fetch: harness.fetch,
    crypto: globalThis.crypto,
    now: () => new Date(now),
  });
  const browser = await createBrowserAuthorization(options);
  const uploadBody = Object.freeze({
    schemaVersion: "laibe.drs-document-upload-intent.request.v1",
    mode: "NEW_DOCUMENT",
    documentKind: "drs_review",
    originalFilename: "review.pdf",
    declaredMime: "application/pdf",
    declaredSizeBytes: PDF_BYTES.byteLength,
    declaredSha256: SHA,
  });
  const routes = [
    Object.freeze({
      name: "upload-intent",
      factory: createDrsDocumentUploadIntentHandler,
      path: "/functions/v1/drs-document-upload-intent",
      method: "POST",
      body: uploadBody,
      status: 201,
      state: "UPLOAD_INTENT_CREATED",
      operation: "CREATE_UPLOAD_INTENT",
      providerPath: "/storage/v1/object/upload/sign/",
    }),
    Object.freeze({
      name: "upload-finalize",
      factory: createDrsDocumentUploadFinalizeHandler,
      path: "/functions/v1/drs-document-upload-finalize",
      method: "POST",
      body: finalizeRequest(),
      status: 201,
      state: "FORMAL_VERSION_CREATED",
      operation: "FINALIZE_UPLOAD",
      providerPath: "/rest/v1/rpc/server_document_operation_v1",
    }),
    Object.freeze({
      name: "snapshot",
      factory: createDrsDocumentSnapshotHandler,
      path: "/functions/v1/drs-document-snapshot",
      method: "POST",
      body: Object.freeze({
        schemaVersion: "laibe.drs-document-snapshot.request.v1",
        purpose: "DECISION_BASIS",
        versionRefs: Object.freeze([VERSION_REF]),
        idempotencyKey: "snapshot-01j6a8k9m4q2w3e4",
      }),
      status: 201,
      state: "SNAPSHOT_RECORDED",
      operation: "CREATE_SNAPSHOT",
      providerPath: "/rest/v1/rpc/server_document_operation_v1",
    }),
    Object.freeze({
      name: "download",
      factory: createDrsDocumentVersionDownloadHandler,
      path: `/functions/v1/drs-document-version-download/${VERSION_REF}`,
      method: "GET",
      body: null,
      status: 200,
      state: null,
      operation: "DOWNLOAD_VERSION",
      providerPath: `/storage/v1/object/authenticated/${RECORDS_BUCKET}/`,
    }),
  ];

  function request(route, overrides = {}) {
    const method = overrides.method ?? route.method;
    const body = overrides.body === undefined ? route.body : overrides.body;
    const headers = new Headers({
      authorization: browser.authorization,
      cookie: browser.cookie,
      origin: APP_ORIGIN,
      "sec-fetch-site": "same-origin",
      ...(method === "POST" && body !== null
        ? { "content-type": "application/json" }
        : {}),
      ...overrides.headers,
    });
    return new Request(`${APP_ORIGIN}${overrides.path ?? route.path}`, {
      method,
      headers,
      ...(method === "POST" && body !== null
        ? { body: JSON.stringify(body) }
        : {}),
    });
  }

  for (const route of routes) {
    const handler = route.factory(undefined, options);
    const wrongMethod = route.method === "GET" ? "POST" : "GET";
    const authorityBody = route.body === null
      ? null
      : { ...route.body, userId: PRINCIPAL.authenticatedUserId };
    const invalid = [
      request(route, { method: wrongMethod, body: null }),
      request(route, { path: `${route.path}/wrong` }),
      request(route, { path: `${route.path}?grantId=${PRINCIPAL.grantId}` }),
      request(route, { headers: { "x-browser-role": "drs-specialist" } }),
      route.body === null
        ? request(route, { headers: { "content-type": "application/json" } })
        : request(route, { body: authorityBody }),
    ];
    for (const hostile of invalid) {
      harness.calls.length = 0;
      const response = await handler(hostile);
      assert.equal(response.status, 400, `${route.name} hostile request`);
      assert.equal(harness.calls.length, 0, `${route.name} fetched too early`);
    }

    harness.calls.length = 0;
    const response = await handler(request(route));
    assert.equal(response.status, route.status, route.name);
    const bytes = new Uint8Array(await response.arrayBuffer());
    const text = new TextDecoder().decode(bytes);
    if (route.state) {
      assert.equal(JSON.parse(text).state, route.state, route.name);
    } else {
      assert.deepEqual(bytes, PDF_BYTES, route.name);
      assert.equal(response.headers.get("content-disposition"), "attachment");
      assert.equal(response.headers.get("cache-control"), "private, no-store");
    }
    assert.equal(
      text.includes("signedUploadUrl"),
      route.name === "upload-intent",
      route.name,
    );
    assert.equal(text.includes("opaque-test-service-role"), false, route.name);
    assert.equal(text.includes("opaque-test-scanner-token"), false, route.name);
    assert.equal(text.includes(browser.cookie), false, route.name);
    const paths = harness.calls.map((call) => call.pathname);
    for (
      const required of [
        "/rest/v1/rpc/drs_server_session_verify_v1",
        "/rest/v1/rpc/drs_workspace_grant_v1",
        "/rest/v1/rpc/drs_workspace_grant_v2",
        "/rest/v1/rpc/server_document_operation_v1",
      ]
    ) {
      assert.equal(paths.includes(required), true, `${route.name} ${required}`);
    }
    assert.equal(
      harness.calls.some((call) => call.body?.p_operation === route.operation),
      true,
      `${route.name} repository operation`,
    );
    assert.equal(
      paths.some((path) => path.startsWith(route.providerPath)),
      true,
      `${route.name} provider seam`,
    );
  }
});

Deno.test("default Edge composer is import-safe and fails closed without the exact runtime environment", () => {
  const composed = createDrsDocumentEdgeRuntime(
    "uploadIntent",
    "/functions/v1/drs-document-upload-intent",
    { env: Object.freeze({ get: () => undefined }) },
  );
  assert.deepEqual(composed.allowedOrigins, []);
  assert.equal(composed.authority.runtimeAvailable, false);
});
