// deno-lint-ignore-file require-await -- injected ports deliberately mirror async production seams.

function assertionFailure(message) {
  throw new Error(message);
}

function printable(value) {
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value).sort().map((key) => [key, canonical(value[key])]),
    );
  }
  return value;
}

const assert = Object.freeze({
  equal(actual, expected, message = "values must be equal") {
    if (!Object.is(actual, expected)) {
      assertionFailure(
        `${message}: expected ${printable(expected)}, got ${printable(actual)}`,
      );
    }
  },
  deepEqual(actual, expected, message = "values must be deeply equal") {
    if (printable(canonical(actual)) !== printable(canonical(expected))) {
      assertionFailure(
        `${message}: expected ${printable(expected)}, got ${printable(actual)}`,
      );
    }
  },
  ok(value, message = "value must be truthy") {
    if (!value) assertionFailure(message);
  },
  match(value, pattern, message = "value must match") {
    if (typeof value !== "string" || !pattern.test(value)) {
      assertionFailure(`${message}: ${printable(value)}`);
    }
  },
  async rejects(promise, message = "promise must reject") {
    try {
      await promise;
    } catch {
      return;
    }
    assertionFailure(message);
  },
});

import {
  createDrsSessionBootstrapHandler,
  createServerOwnedVerifiedSessionProducer,
} from "../functions/_shared/drs-auth/drs-session-bootstrap-bff.ts";
import {
  createDrsDocumentBffAdapter,
  DRS_DOCUMENT_BFF_ROUTES,
} from "../functions/_shared/drs-document-bff/adapter.ts";

const APP_ORIGIN = "https://app.laibe.test";
const STORAGE_ORIGIN = "https://storage.laibe.test";
const COOKIE_NAME = "__Host-laibe-drs-session";
const COOKIE_PAIR = `${COOKIE_NAME}=sealed-cookie`;
const AUTHORIZATION = "Bearer opaque.proof.value";
const MAX_DOCUMENT_BYTES = 26_214_400;
const SHA = "a".repeat(64);
const INTENT_REF = `int_${"i".repeat(20)}`;
const DOCUMENT_REF = `doc_${"d".repeat(20)}`;
const VERSION_REF = `dvr_${"v".repeat(20)}`;
const SNAPSHOT_REF = `snp_${"s".repeat(20)}`;
const RECEIPT_REF = `rcp_${"r".repeat(20)}`;
const IDEMPOTENCY_KEY = "idempotency-key-0001";

const uploadIntentBody = Object.freeze({
  schemaVersion: "laibe.drs-document-upload-intent.request.v1",
  mode: "NEW_DOCUMENT",
  documentKind: "drs_review",
  originalFilename: "review.pdf",
  declaredMime: "application/pdf",
  declaredSizeBytes: 1024,
  declaredSha256: SHA,
});
const finalizeBody = Object.freeze({
  schemaVersion: "laibe.drs-document-upload-finalize.request.v1",
  intentRef: INTENT_REF,
  idempotencyKey: IDEMPOTENCY_KEY,
});
const snapshotBody = Object.freeze({
  schemaVersion: "laibe.drs-document-snapshot.request.v1",
  purpose: "DECISION_BASIS",
  versionRefs: Object.freeze([VERSION_REF]),
  idempotencyKey: IDEMPOTENCY_KEY,
});

function uploadIntentSuccess(overrides = {}) {
  return {
    schemaVersion: "laibe.drs-document-upload-intent.response.v1",
    state: "UPLOAD_INTENT_CREATED",
    intentRef: INTENT_REF,
    intentExpiresAt: "2026-08-27T04:15:00.000Z",
    upload: {
      method: "SIGNED_UPLOAD",
      signedUploadUrl:
        `${STORAGE_ORIGIN}/storage/v1/object/upload/sign/private/review.pdf?token=opaque-token`,
      nativeExpiresAt: "2026-08-27T06:00:00.000Z",
      requiredHeaders: { "content-type": "application/pdf" },
    },
    limits: {
      maxBytes: MAX_DOCUMENT_BYTES,
      allowedMime: ["application/pdf", "image/jpeg", "image/png"],
    },
    ...overrides,
  };
}

function finalizeCreated() {
  return {
    schemaVersion: "laibe.drs-document-upload-finalize.response.v1",
    state: "FORMAL_VERSION_CREATED",
    documentRef: DOCUMENT_REF,
    versionRef: VERSION_REF,
    receiptRef: RECEIPT_REF,
  };
}

function finalizePending() {
  return {
    schemaVersion: "laibe.drs-document-upload-finalize.response.v1",
    state: "VALIDATION_PENDING",
    intentRef: INTENT_REF,
  };
}

function snapshotCreated() {
  return {
    schemaVersion: "laibe.drs-document-snapshot.response.v1",
    state: "SNAPSHOT_RECORDED",
    snapshotRef: SNAPSHOT_REF,
    receiptRef: RECEIPT_REF,
    canonicalPayloadSha256: SHA,
  };
}

function edgeJson(status, body, headers = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json;charset=utf-8",
      ...headers,
    },
  });
}

function browserHeaders(extra = {}) {
  const headers = new Headers({
    authorization: AUTHORIZATION,
    cookie: `unrelated=one; ${COOKIE_PAIR}; preference=compact`,
    origin: APP_ORIGIN,
    "sec-fetch-site": "same-origin",
    ...extra,
  });
  for (const [name, value] of Object.entries(extra)) {
    if (value === null) headers.delete(name);
  }
  return headers;
}

function post(pathname, body, options = {}) {
  const headers = browserHeaders({
    "content-type": "application/json",
    ...(options.headers ?? {}),
  });
  return new Request(`${APP_ORIGIN}${pathname}`, {
    method: options.method ?? "POST",
    headers,
    body: options.rawBody ?? JSON.stringify(body),
  });
}

function download(
  pathname = `/api/drs/document-versions/${VERSION_REF}/download`,
  options = {},
) {
  return new Request(`${APP_ORIGIN}${pathname}`, {
    method: options.method ?? "GET",
    headers: browserHeaders(options.headers ?? {}),
    body: options.body,
  });
}

function authorizedContext() {
  return Object.freeze({
    authenticatedUserId: "11111111-1111-4111-8111-111111111111",
    specialistId: "22222222-2222-4222-8222-222222222222",
    authorizationSubject: "drs-specialist:22222222-2222-4222-8222-222222222222",
    selectedCaseId: "33333333-3333-4333-8333-333333333333",
    caseStatus: "active",
    accessMode: "read_only",
    proofExpiresAt: "2026-08-27T04:00:45.000Z",
  });
}

function acceptedGuard(calls, inspect) {
  return Object.freeze({
    async authorize(request) {
      const clone = request.clone();
      const payload = await clone.json();
      calls.push({
        stage: "guard",
        method: request.method,
        pathname: new URL(request.url).pathname,
        query: new URL(request.url).search,
        headers: Object.fromEntries(request.headers.entries()),
        payload,
      });
      inspect?.(request, payload);
      return authorizedContext();
    },
  });
}

function fixture(respond, options = {}) {
  const calls = [];
  const guard = options.guard ?? acceptedGuard(calls, options.inspectGuard);
  const edgePort = Object.freeze({
    async invoke(request) {
      const body = request.body === null ? null : await request.clone().text();
      calls.push({
        stage: "edge",
        method: request.method,
        pathname: new URL(request.url).pathname,
        query: new URL(request.url).search,
        headers: Object.fromEntries(request.headers.entries()),
        body,
      });
      return typeof respond === "function" ? await respond(request) : respond;
    },
  });
  const handler = createDrsDocumentBffAdapter({
    applicationOrigin: APP_ORIGIN,
    storageOrigin: STORAGE_ORIGIN,
    sessionCookieName: COOKIE_NAME,
    edgePort,
    ...(options.guardDependencies
      ? { guardDependencies: options.guardDependencies }
      : {}),
  }, options.injectGuard === false ? undefined : guard);
  return { handler, calls };
}

async function assertJsonResponse(response, status, body) {
  assert.equal(response.status, status);
  assert.deepEqual(await response.json(), body);
  assert.equal(
    response.headers.get("content-type"),
    "application/json;charset=utf-8",
  );
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.equal(response.headers.get("pragma"), "no-cache");
  assert.equal(response.headers.get("x-content-type-options"), "nosniff");
  assert.equal(response.headers.get("referrer-policy"), "no-referrer");
  assert.equal(response.headers.get("access-control-allow-origin"), null);
  assert.equal(response.headers.get("set-cookie"), null);
}

async function assertInvalid(response) {
  await assertJsonResponse(response, 400, { state: "INVALID_REQUEST" });
}

async function assertUnavailable(response, status = 503) {
  await assertJsonResponse(response, status, { state: "CONTEXT_UNAVAILABLE" });
}

Deno.test("focused RED: exact D5 route table is public and fixed", () => {
  assert.deepEqual(DRS_DOCUMENT_BFF_ROUTES, {
    uploadIntent: {
      method: "POST",
      logicalPath: "/api/drs/documents/upload-intents",
      physicalPath: "/functions/v1/drs-document-upload-intent",
      operation: "UPLOAD_INTENT",
    },
    uploadFinalize: {
      method: "POST",
      logicalPath: "/api/drs/documents/upload-intents/finalize",
      physicalPath: "/functions/v1/drs-document-upload-finalize",
      operation: "UPLOAD_FINALIZE",
    },
    versionDownload: {
      method: "GET",
      logicalPath: "/api/drs/document-versions/",
      physicalPath: "/functions/v1/drs-document-version-download/",
      operation: "VERSION_DOWNLOAD",
    },
    snapshot: {
      method: "POST",
      logicalPath: "/api/drs/document-snapshots",
      physicalPath: "/functions/v1/drs-document-snapshot",
      operation: "SNAPSHOT",
    },
  });
});

Deno.test("all four logical routes authorize canonical scalar requests before fixed Edge requests", async () => {
  const scenarios = [
    {
      request: () =>
        post("/api/drs/documents/upload-intents", uploadIntentBody),
      response: () => edgeJson(201, uploadIntentSuccess()),
      operation: "UPLOAD_INTENT",
      physical: "/functions/v1/drs-document-upload-intent",
      status: 201,
    },
    {
      request: () =>
        post("/api/drs/documents/upload-intents/finalize", finalizeBody),
      response: () => edgeJson(201, finalizeCreated()),
      operation: "UPLOAD_FINALIZE",
      physical: "/functions/v1/drs-document-upload-finalize",
      status: 201,
    },
    {
      request: () => download(),
      response: () => new Response(new Uint8Array([1]), { status: 200 }),
      operation: "VERSION_DOWNLOAD",
      physical: `/functions/v1/drs-document-version-download/${VERSION_REF}`,
      status: 200,
    },
    {
      request: () => post("/api/drs/document-snapshots", snapshotBody),
      response: () => edgeJson(201, snapshotCreated()),
      operation: "SNAPSHOT",
      physical: "/functions/v1/drs-document-snapshot",
      status: 201,
    },
  ];

  for (const scenario of scenarios) {
    const { handler, calls } = fixture(scenario.response());
    const response = await handler(scenario.request());
    assert.equal(response.status, scenario.status);
    assert.equal(calls.length, 2);
    assert.equal(calls[0].stage, "guard");
    assert.deepEqual(calls[0], {
      stage: "guard",
      method: "POST",
      pathname: "/api/drs/_internal/document-operation-authorize",
      query: "",
      headers: {
        authorization: AUTHORIZATION,
        "content-type": "application/json;charset=utf-8",
        cookie: COOKIE_PAIR,
        origin: APP_ORIGIN,
        "sec-fetch-site": "same-origin",
      },
      payload: {
        schemaVersion: "laibe.drs-document-bff.guard.request.v1",
        operation: scenario.operation,
      },
    });
    assert.equal(calls[1].stage, "edge");
    assert.equal(calls[1].pathname, scenario.physical);
    assert.equal(calls[1].query, "");
    assert.deepEqual(calls[1].headers, {
      authorization: AUTHORIZATION,
      ...(scenario.operation === "VERSION_DOWNLOAD"
        ? {}
        : { "content-type": "application/json;charset=utf-8" }),
      cookie: COOKIE_PAIR,
      origin: APP_ORIGIN,
      "sec-fetch-site": "same-origin",
    });
    assert.equal(
      JSON.stringify(calls[1]).includes("selectedCaseId"),
      false,
    );
    assert.equal(JSON.stringify(calls[1]).includes("specialistId"), false);
  }
});

Deno.test("method, path, query, origin, headers, and caller authority reject before guard", async () => {
  const invalidRequests = [
    post("/api/drs/documents/upload-intents", uploadIntentBody, {
      method: "PUT",
    }),
    post("/api/drs/document/upload-intent", uploadIntentBody),
    post("/functions/v1/drs-document-upload-intent", uploadIntentBody),
    post("/api/drs/documents/upload-intents?target=edge", uploadIntentBody),
    post("/api/drs/documents/upload-intents", uploadIntentBody, {
      headers: { origin: "https://evil.example" },
    }),
    post("/api/drs/documents/upload-intents", uploadIntentBody, {
      headers: { "sec-fetch-site": "cross-site" },
    }),
    post("/api/drs/documents/upload-intents", uploadIntentBody, {
      headers: { "x-case-id": "caller-case" },
    }),
    post("/api/drs/documents/upload-intents", uploadIntentBody, {
      headers: { "x-random": "caller" },
    }),
    post("/api/drs/documents/upload-intents", uploadIntentBody, {
      headers: { "x-forwarded-user": "caller" },
    }),
    post("/api/drs/documents/upload-intents", uploadIntentBody, {
      headers: { authorization: null },
    }),
    post("/api/drs/documents/upload-intents", uploadIntentBody, {
      headers: { cookie: null },
    }),
    post("/api/drs/documents/upload-intents", {
      ...uploadIntentBody,
      caseId: "caller-case",
    }),
  ];
  for (const request of invalidRequests) {
    const { handler, calls } = fixture(edgeJson(201, uploadIntentSuccess()));
    await assertInvalid(await handler(request));
    assert.deepEqual(calls, []);
  }
});

Deno.test("duplicate JSON, malformed UTF-8, and oversized streaming bodies reject and cancel before guard", async () => {
  const duplicate = post(
    "/api/drs/documents/upload-intents",
    uploadIntentBody,
    {
      rawBody:
        `{"schemaVersion":"first","schemaVersion":"${uploadIntentBody.schemaVersion}"}`,
    },
  );
  {
    const { handler, calls } = fixture(edgeJson(201, uploadIntentSuccess()));
    await assertInvalid(await handler(duplicate));
    assert.deepEqual(calls, []);
  }

  const malformed = new Request(
    `${APP_ORIGIN}/api/drs/documents/upload-intents`,
    {
      method: "POST",
      headers: browserHeaders({ "content-type": "application/json" }),
      body: new Uint8Array([0xff]),
    },
  );
  {
    const { handler, calls } = fixture(edgeJson(201, uploadIntentSuccess()));
    await assertInvalid(await handler(malformed));
    assert.deepEqual(calls, []);
  }

  let cancelled = 0;
  let emitted = 0;
  const oversizedBody = new ReadableStream({
    pull(controller) {
      if (emitted < 65) {
        emitted += 1;
        controller.enqueue(new Uint8Array(1024));
      }
    },
    cancel() {
      cancelled += 1;
    },
  });
  const oversized = new Request(
    `${APP_ORIGIN}/api/drs/documents/upload-intents`,
    {
      method: "POST",
      headers: browserHeaders({ "content-type": "application/json" }),
      body: oversizedBody,
    },
  );
  const { handler, calls } = fixture(edgeJson(201, uploadIntentSuccess()));
  await assertInvalid(await handler(oversized));
  assert.equal(cancelled, 1);
  assert.deepEqual(calls, []);
});

Deno.test("closed upload, finalize, snapshot, and download selectors reject invalid values before guard", async () => {
  const invalid = [
    post("/api/drs/documents/upload-intents", {
      ...uploadIntentBody,
      documentKind: "owner_upload",
    }),
    post("/api/drs/documents/upload-intents", {
      ...uploadIntentBody,
      originalFilename: "review.png",
    }),
    post("/api/drs/documents/upload-intents", {
      ...uploadIntentBody,
      declaredSizeBytes: 0,
    }),
    post("/api/drs/documents/upload-intents", {
      ...uploadIntentBody,
      mode: "NEW_VERSION",
    }),
    post("/api/drs/documents/upload-intents", {
      ...uploadIntentBody,
      mode: "NEW_VERSION",
      documentRef: "doc_short",
    }),
    post("/api/drs/documents/upload-intents/finalize", {
      ...finalizeBody,
      idempotencyKey: "short",
    }),
    post("/api/drs/document-snapshots", {
      ...snapshotBody,
      versionRefs: [VERSION_REF, VERSION_REF],
    }),
    post("/api/drs/document-snapshots", {
      ...snapshotBody,
      purpose: "APPROVAL",
    }),
    download("/api/drs/document-versions/dvr_short/download"),
    download(`/api/drs/document-versions/${VERSION_REF}%2Fextra/download`),
    download(`/api/drs/document-versions/%64vr_${"v".repeat(20)}/download`),
    download(`/api/drs/document-versions/${VERSION_REF}/download/extra`),
    download(
      `/api/drs/document-versions/${VERSION_REF}/download?caseId=caller`,
    ),
    download(undefined, { headers: { "content-type": "application/json" } }),
    download(undefined, { headers: { "content-length": "1" } }),
  ];

  for (const request of invalid) {
    const { handler, calls } = fixture(
      edgeJson(503, { state: "CONTEXT_UNAVAILABLE" }),
    );
    await assertInvalid(await handler(request));
    assert.deepEqual(calls, []);
  }
});

Deno.test("valid NEW_VERSION upload uses a fresh closed JSON projection", async () => {
  const request = {
    ...uploadIntentBody,
    mode: "NEW_VERSION",
    documentRef: DOCUMENT_REF,
  };
  const { handler, calls } = fixture(edgeJson(201, uploadIntentSuccess()));
  await assertJsonResponse(
    await handler(post("/api/drs/documents/upload-intents", request)),
    201,
    uploadIntentSuccess(),
  );
  assert.deepEqual(JSON.parse(calls[1].body), request);
});

Deno.test("NEW_VERSION rejects a valid-looking non-document opaque selector before guard", async () => {
  const { handler, calls } = fixture(edgeJson(201, uploadIntentSuccess()));
  await assertInvalid(
    await handler(post("/api/drs/documents/upload-intents", {
      ...uploadIntentBody,
      mode: "NEW_VERSION",
      documentRef: INTENT_REF,
    })),
  );
  assert.deepEqual(calls, []);
});

Deno.test("upload intent validates opaque Storage capability and exact required headers", async () => {
  const valid = uploadIntentSuccess();
  const invalidUploads = [
    {
      ...valid.upload,
      signedUploadUrl: valid.upload.signedUploadUrl.replace("https:", "http:"),
    },
    {
      ...valid.upload,
      signedUploadUrl: valid.upload.signedUploadUrl.replace(
        STORAGE_ORIGIN,
        "https://evil.example",
      ),
    },
    {
      ...valid.upload,
      signedUploadUrl: valid.upload.signedUploadUrl.replace(
        "https://",
        "https://user:pass@",
      ),
    },
    {
      ...valid.upload,
      signedUploadUrl: `${valid.upload.signedUploadUrl}#fragment`,
    },
    {
      ...valid.upload,
      signedUploadUrl:
        `${STORAGE_ORIGIN}/storage/v1/object/sign/private/review.pdf?token=opaque`,
    },
    {
      ...valid.upload,
      signedUploadUrl:
        `${STORAGE_ORIGIN}/storage/v1/object/upload/sign/?token=opaque`,
    },
    {
      ...valid.upload,
      signedUploadUrl:
        `${STORAGE_ORIGIN}/storage/v1/object/upload/sign/private/review.pdf`,
    },
    {
      ...valid.upload,
      signedUploadUrl: `${valid.upload.signedUploadUrl}&other=value`,
    },
    {
      ...valid.upload,
      signedUploadUrl: `${valid.upload.signedUploadUrl}&token=second`,
    },
    {
      ...valid.upload,
      signedUploadUrl:
        `${STORAGE_ORIGIN}/storage/v1/object/upload/sign/private/${
          "x".repeat(4096)
        }?token=opaque`,
    },
    {
      ...valid.upload,
      signedUploadUrl:
        `${STORAGE_ORIGIN}/storage/v1/object/upload/sign/private/review.pdf?token=opaque\u0000`,
    },
    { ...valid.upload, requiredHeaders: { "content-type": "image/png" } },
    {
      ...valid.upload,
      requiredHeaders: {
        "content-type": "application/pdf",
        authorization: "secret",
      },
    },
    {
      ...valid.upload,
      requiredHeaders: {
        "content-type": "application/pdf",
        "x-upsert": "true",
      },
    },
    { ...valid.upload, nativeExpiresAt: "not-an-instant" },
    { ...valid.upload, nativeExpiresAt: "2026-08-27T04:14:59.000Z" },
  ];

  for (const upload of invalidUploads) {
    const { handler } = fixture(edgeJson(201, uploadIntentSuccess({ upload })));
    await assertUnavailable(
      await handler(
        post("/api/drs/documents/upload-intents", uploadIntentBody),
      ),
    );
  }
});

Deno.test("signed upload capability remains replayable and is never labeled one-time", async () => {
  const capability = uploadIntentSuccess();
  let count = 0;
  const { handler } = fixture(() => {
    count += 1;
    return edgeJson(201, capability);
  });
  for (let index = 0; index < 2; index += 1) {
    const response = await handler(
      post("/api/drs/documents/upload-intents", uploadIntentBody),
    );
    assert.equal(response.status, 201);
    const publicBody = await response.text();
    assert.equal(publicBody.includes("one-time"), false);
    assert.equal(publicBody.includes("single-use"), false);
    assert.equal(publicBody.includes("bucket"), false);
    assert.equal(publicBody.includes("objectPath"), false);
    assert.equal(
      JSON.parse(publicBody).upload.signedUploadUrl,
      capability.upload.signedUploadUrl,
    );
  }
  assert.equal(count, 2);
});

Deno.test("finalize admits only exact 201, 202, and 409 response shapes", async () => {
  const accepted = [
    [201, finalizeCreated()],
    [202, finalizePending()],
    [409, {
      schemaVersion: "laibe.drs-document-upload-finalize.response.v1",
      state: "IDEMPOTENCY_CONFLICT",
    }],
    [409, {
      schemaVersion: "laibe.drs-document-upload-finalize.response.v1",
      state: "VERSION_CONFLICT",
    }],
  ];
  for (const [status, body] of accepted) {
    const { handler } = fixture(edgeJson(status, body));
    await assertJsonResponse(
      await handler(
        post("/api/drs/documents/upload-intents/finalize", finalizeBody),
      ),
      status,
      body,
    );
  }

  for (
    const [status, body] of [
      [200, finalizeCreated()],
      [201, { ...finalizeCreated(), selectedCaseId: "leak" }],
      [202, { ...finalizePending(), receiptRef: RECEIPT_REF }],
      [409, { state: "IDEMPOTENCY_CONFLICT" }],
      [409, {
        schemaVersion: "laibe.drs-document-upload-finalize.response.v1",
        state: "UNKNOWN_CONFLICT",
      }],
    ]
  ) {
    const { handler } = fixture(edgeJson(status, body));
    await assertUnavailable(
      await handler(
        post("/api/drs/documents/upload-intents/finalize", finalizeBody),
      ),
    );
  }
});

Deno.test("snapshot proves only exact refs and canonical hash with closed 201 and 409 shapes", async () => {
  for (
    const [status, body] of [
      [201, snapshotCreated()],
      [409, {
        schemaVersion: "laibe.drs-document-snapshot.response.v1",
        state: "IDEMPOTENCY_CONFLICT",
      }],
      [409, {
        schemaVersion: "laibe.drs-document-snapshot.response.v1",
        state: "VERSION_CONFLICT",
      }],
    ]
  ) {
    const { handler } = fixture(edgeJson(status, body));
    const response = await handler(
      post("/api/drs/document-snapshots", snapshotBody),
    );
    await assertJsonResponse(response, status, body);
    const publicBody = JSON.stringify(body).toLowerCase();
    for (
      const forbidden of [
        "approval",
        "delivery",
        "acceptance",
        "payment",
        "agreement",
      ]
    ) {
      assert.equal(publicBody.includes(forbidden), false);
    }
  }

  const { handler } = fixture(edgeJson(201, {
    ...snapshotCreated(),
    approvalState: "APPROVED",
  }));
  await assertUnavailable(
    await handler(post("/api/drs/document-snapshots", snapshotBody)),
  );
});

Deno.test("only exact sanitized Edge errors pass and every other status, body, header, or throw becomes 503", async () => {
  for (
    const [status, body] of [
      [400, { state: "INVALID_REQUEST" }],
      [401, { state: "AUTH_REQUIRED" }],
      [403, { state: "CONTEXT_UNAVAILABLE" }],
      [503, { state: "CONTEXT_UNAVAILABLE" }],
    ]
  ) {
    const { handler } = fixture(edgeJson(status, body, {
      "set-cookie": "secret=leak",
      "x-provider-error": "bucket/object/rpc",
    }));
    await assertJsonResponse(
      await handler(
        post("/api/drs/documents/upload-intents", uploadIntentBody),
      ),
      status,
      body,
    );
  }

  for (
    const respond of [
      edgeJson(503, { state: "CONTEXT_UNAVAILABLE", detail: "bucket/object" }),
      new Response("not-json", {
        status: 503,
        headers: { "content-type": "text/plain" },
      }),
      edgeJson(418, { state: "CONTEXT_UNAVAILABLE" }),
      () => {
        throw new Error("raw provider secret bucket/object/rpc");
      },
    ]
  ) {
    const { handler } = fixture(respond);
    const response = await handler(
      post("/api/drs/documents/upload-intents", uploadIntentBody),
    );
    await assertUnavailable(response);
  }
});

Deno.test("guard failures are sanitized and Edge is never invoked", async () => {
  for (
    const [status, code, expectedStatus, expectedBody] of [
      [400, "INVALID_REQUEST", 400, { state: "INVALID_REQUEST" }],
      [401, "AUTH_REQUIRED", 401, { state: "AUTH_REQUIRED" }],
      [403, "CASE_NOT_AUTHORIZED", 403, { state: "CONTEXT_UNAVAILABLE" }],
      [503, "CONTEXT_UNAVAILABLE", 503, { state: "CONTEXT_UNAVAILABLE" }],
      [500, "RAW_SECRET", 503, { state: "CONTEXT_UNAVAILABLE" }],
    ]
  ) {
    const calls = [];
    const guard = Object.freeze({
      async authorize() {
        calls.push("guard");
        throw Object.assign(new Error("raw secret bucket/object/rpc"), {
          status,
          code,
        });
      },
    });
    const built = fixture(edgeJson(201, uploadIntentSuccess()), { guard });
    await assertJsonResponse(
      await built.handler(
        post("/api/drs/documents/upload-intents", uploadIntentBody),
      ),
      expectedStatus,
      expectedBody,
    );
    assert.deepEqual(calls, ["guard"]);
    assert.deepEqual(built.calls, []);
  }
});

function trackedByteStream(chunks) {
  const state = { cancelled: 0, pulls: 0 };
  let index = 0;
  const body = new ReadableStream({
    pull(controller) {
      state.pulls += 1;
      if (index >= chunks.length) {
        controller.close();
        return;
      }
      controller.enqueue(chunks[index]);
      index += 1;
    },
    cancel() {
      state.cancelled += 1;
    },
  }, { highWaterMark: 0 });
  return { body, state };
}

function fakeDownloadEdgeBody(readSteps) {
  const state = { cancelled: 0, reads: 0 };
  const reader = {
    async read() {
      const step = readSteps[state.reads] ?? { done: true, value: undefined };
      state.reads += 1;
      if (step instanceof Error) throw step;
      return step;
    },
    async cancel() {
      state.cancelled += 1;
    },
  };
  return {
    response: {
      status: 200,
      headers: new Headers(),
      body: { getReader: () => reader },
    },
    state,
  };
}

Deno.test("download streams exact 1 byte and exact maximum while reconstructing only BFF headers", async () => {
  for (const size of [1, MAX_DOCUMENT_BYTES]) {
    const tracked = trackedByteStream([new Uint8Array(size)]);
    const edge = new Response(tracked.body, {
      status: 200,
      headers: {
        "content-length": String(size),
        "content-type": "image/png",
        "content-disposition": "inline; filename=provider-secret.png",
        "set-cookie": "provider=secret",
        server: "provider",
        "x-provider-path": "bucket/object",
      },
    });
    const { handler } = fixture(edge);
    const response = await handler(download());
    assert.equal(response.status, 200);
    assert.equal(
      response.headers.get("content-type"),
      "application/octet-stream",
    );
    assert.equal(response.headers.get("content-disposition"), "attachment");
    assert.equal(response.headers.get("x-content-type-options"), "nosniff");
    assert.equal(response.headers.get("cache-control"), "private, no-store");
    assert.equal(response.headers.get("content-length"), String(size));
    assert.equal(response.headers.get("set-cookie"), null);
    assert.equal(response.headers.get("server"), null);
    assert.equal(response.headers.get("x-provider-path"), null);
    assert.equal((await response.arrayBuffer()).byteLength, size);
    assert.equal(tracked.state.cancelled, 0);
  }
});

Deno.test("download content-length stream binding rejects a declared length larger than actual bytes", async () => {
  const fake = fakeDownloadEdgeBody([
    { done: false, value: new Uint8Array([1]) },
    { done: true, value: undefined },
  ]);
  fake.response.headers.set("content-length", "2");
  const { handler } = fixture(fake.response);
  const response = await handler(download());
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("content-length"), "2");
  await assert.rejects(response.arrayBuffer());
  assert.equal(fake.state.cancelled, 1);
});

Deno.test("download content-length stream binding rejects bytes crossing a smaller declared length", async () => {
  const fake = fakeDownloadEdgeBody([
    { done: false, value: new Uint8Array([1]) },
    { done: false, value: new Uint8Array([2]) },
  ]);
  fake.response.headers.set("content-length", "1");
  const { handler } = fixture(fake.response);
  const response = await handler(download());
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("content-length"), "1");
  await assert.rejects(response.arrayBuffer());
  assert.equal(fake.state.reads, 2);
  assert.equal(fake.state.cancelled, 1);
});

Deno.test("download content-length stream binding accepts exact declared bytes and preserves the header", async () => {
  const fake = fakeDownloadEdgeBody([
    { done: false, value: new Uint8Array([1, 2]) },
    { done: true, value: undefined },
  ]);
  fake.response.headers.set("content-length", "2");
  const { handler } = fixture(fake.response);
  const response = await handler(download());
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("content-length"), "2");
  assert.equal((await response.arrayBuffer()).byteLength, 2);
  assert.equal(fake.state.cancelled, 0);
});

Deno.test("download content-length stream binding accepts bounded bytes when the header is absent", async () => {
  const fake = fakeDownloadEdgeBody([
    { done: false, value: new Uint8Array([1, 2]) },
    { done: true, value: undefined },
  ]);
  const { handler } = fixture(fake.response);
  const response = await handler(download());
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("content-length"), null);
  assert.equal((await response.arrayBuffer()).byteLength, 2);
  assert.equal(fake.state.cancelled, 0);
});

Deno.test("download cumulative overflow cancels the underlying stream and never completes", async () => {
  for (
    const chunks of [
      [new Uint8Array(MAX_DOCUMENT_BYTES + 1)],
      [new Uint8Array(MAX_DOCUMENT_BYTES), new Uint8Array(1)],
    ]
  ) {
    const tracked = trackedByteStream(chunks);
    const { handler } = fixture(new Response(tracked.body, { status: 200 }));
    const response = await handler(download());
    assert.equal(response.status, 200);
    await assert.rejects(response.arrayBuffer());
    assert.equal(tracked.state.cancelled, 1);
  }
});

Deno.test("download zero-byte EOF, invalid chunks, and upstream errors cancel and never complete", async () => {
  const scenarios = [
    [{ done: true, value: undefined }],
    [{ done: false, value: "not-bytes" }],
    [new Error("raw upstream failure")],
  ];
  for (const steps of scenarios) {
    const fake = fakeDownloadEdgeBody(steps);
    const { handler } = fixture(fake.response);
    const response = await handler(download());
    assert.equal(response.status, 200);
    await assert.rejects(response.arrayBuffer());
    assert.equal(fake.state.cancelled, 1);
  }
});

Deno.test("invalid optional download content-length cancels before returning sanitized 503", async () => {
  for (const value of ["0", "01", "-1", "26214401", "1, 2", "not-a-number"]) {
    const tracked = trackedByteStream([new Uint8Array([1])]);
    const edge = new Response(tracked.body, {
      status: 200,
      headers: { "content-length": value },
    });
    const { handler } = fixture(edge);
    await assertUnavailable(await handler(download()));
    assert.equal(tracked.state.cancelled, 1, value);
  }
});

Deno.test("oversized Edge JSON cancels and sanitizes before exposing any response bytes", async () => {
  let cancelled = 0;
  const body = new ReadableStream({
    start(controller) {
      controller.enqueue(new Uint8Array(65_537).fill(97));
    },
    cancel() {
      cancelled += 1;
    },
  });
  const { handler } = fixture(
    new Response(body, {
      status: 201,
      headers: { "content-type": "application/json" },
    }),
  );
  await assertUnavailable(
    await handler(post("/api/drs/documents/upload-intents", uploadIntentBody)),
  );
  assert.equal(cancelled, 1);
});

class FakeCookieEnvelopeCodec {
  constructor() {
    this.envelopes = new Map();
    this.counter = 0;
  }
  sealCookieEnvelope(payload) {
    const value = `sealed_cookie_${++this.counter}`;
    this.envelopes.set(value, structuredClone(payload));
    return value;
  }
  openCookieEnvelope(value) {
    if (!this.envelopes.has(value)) throw new Error("invalid envelope");
    return structuredClone(this.envelopes.get(value));
  }
}

class FakeProofCodec {
  constructor() {
    this.proofs = new Map();
    this.counter = 0;
  }
  mintOpaqueProof(claims) {
    const value = `opaque_${++this.counter}.bff_proof.signature`;
    this.proofs.set(value, structuredClone(claims));
    return value;
  }
  verifyOpaqueProof(value) {
    if (!this.proofs.has(value)) throw new Error("invalid proof");
    return structuredClone(this.proofs.get(value));
  }
}

async function realGuardFixture() {
  const now = new Date("2026-08-27T04:00:00.000Z");
  const authenticatedUserId = "11111111-1111-4111-8111-111111111111";
  const specialistId = "22222222-2222-4222-8222-222222222222";
  const selectedCaseId = "33333333-3333-4333-8333-333333333333";
  const authorizationSubject = `drs-specialist:${specialistId}`;
  const cookieEnvelope = new FakeCookieEnvelopeCodec();
  const proofCodec = new FakeProofCodec();
  const producer = createServerOwnedVerifiedSessionProducer({
    allowedCallbackOrigin: APP_ORIGIN,
    successRedirectUrl: `${APP_ORIGIN}/specialist`,
    sessionCookieName: COOKIE_NAME,
    sameSite: "Strict",
    now: () => new Date(now),
    serverSessionIssuer: {
      async issueServerSession() {
        return {
          serverSessionId: "server-session-secret",
          accessToken: "raw.supabase.session-token",
          expiresAtEpochSeconds: Math.floor(now.getTime() / 1000) + 600,
        };
      },
    },
    cookieEnvelope,
  });
  const continuation = await producer.createVerifiedSession({
    authenticatedUserId,
    specialistId,
    authorizationSubject,
    callbackOrigin: APP_ORIGIN,
    successRedirectUrl: `${APP_ORIGIN}/specialist`,
    sessionCookieName: COOKIE_NAME,
  });
  const setCookie = continuation.response.headers.get("set-cookie");
  assert.ok(setCookie);
  const cookiePair = setCookie.split(";", 1)[0];
  const dependencies = {
    allowedOrigin: APP_ORIGIN,
    sessionCookieName: COOKIE_NAME,
    proofTtlSeconds: 45,
    now: () => new Date(now),
    cookieEnvelope,
    proofCodec,
    accessSessionVerifier: {
      async verifyAccessSession() {
        return {
          authenticatedUserId,
          specialistId,
          authorizationSubject,
          expiresAtEpochSeconds: Math.floor(now.getTime() / 1000) + 600,
        };
      },
    },
    authorization: {
      async resolveSession() {
        return {
          selectedCaseId,
          caseStatus: "active",
          accessMode: "read_only",
        };
      },
      async authorizeServerSelectedCase() {
        throw new Error("guard must use resolveSession");
      },
    },
  };
  const bootstrap = createDrsSessionBootstrapHandler(dependencies);
  const bootstrapResponse = await bootstrap(
    new Request(
      `${APP_ORIGIN}/functions/v1/drs-session-bootstrap`,
      {
        method: "POST",
        headers: {
          cookie: cookiePair,
          "content-type": "application/json",
          origin: APP_ORIGIN,
          "sec-fetch-site": "same-origin",
        },
        body: "{}",
      },
    ),
  );
  assert.equal(bootstrapResponse.status, 204);
  const authorization = bootstrapResponse.headers.get("authorization");
  assert.match(authorization ?? "", /^Bearer [A-Za-z0-9_.-]+$/u);
  return { dependencies, cookiePair, authorization };
}

Deno.test("real createDrsBffGuard authorizes canonical scalar guard Requests for all four operations", async () => {
  const real = await realGuardFixture();
  const responses = [
    edgeJson(201, uploadIntentSuccess()),
    edgeJson(201, finalizeCreated()),
    new Response(new Uint8Array([1]), { status: 200 }),
    edgeJson(201, snapshotCreated()),
  ];
  const calls = [];
  const handler = createDrsDocumentBffAdapter({
    applicationOrigin: APP_ORIGIN,
    storageOrigin: STORAGE_ORIGIN,
    sessionCookieName: COOKIE_NAME,
    guardDependencies: real.dependencies,
    edgePort: {
      async invoke(request) {
        calls.push(new URL(request.url).pathname);
        return responses.shift();
      },
    },
  });
  const headers = {
    authorization: real.authorization,
    cookie: real.cookiePair,
    origin: APP_ORIGIN,
    "sec-fetch-site": "same-origin",
  };
  const requests = [
    post("/api/drs/documents/upload-intents", uploadIntentBody, { headers }),
    post("/api/drs/documents/upload-intents/finalize", finalizeBody, {
      headers,
    }),
    download(undefined, { headers }),
    post("/api/drs/document-snapshots", snapshotBody, { headers }),
  ];
  for (const request of requests) {
    const response = await handler(request);
    assert.ok([200, 201].includes(response.status));
  }
  assert.deepEqual(calls, [
    "/functions/v1/drs-document-upload-intent",
    "/functions/v1/drs-document-upload-finalize",
    `/functions/v1/drs-document-version-download/${VERSION_REF}`,
    "/functions/v1/drs-document-snapshot",
  ]);
});
