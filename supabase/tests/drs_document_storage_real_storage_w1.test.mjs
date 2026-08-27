import assert from "node:assert/strict";

const STORAGE_URL = new URL(
  "../functions/_shared/drs-document-storage/supabase-storage-adapter.ts",
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

const ENV = Object.freeze({
  get(name) {
    return name === "SUPABASE_URL"
      ? "http://127.0.0.1:54321"
      : name === "SUPABASE_SERVICE_ROLE_KEY"
      ? "server-only-test-key"
      : undefined;
  },
});
const SELF_URL = new URL(import.meta.url);

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

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u;

function decodeBase64Url(segment) {
  const padded = segment
    .replaceAll("-", "+")
    .replaceAll("_", "/")
    .padEnd(Math.ceil(segment.length / 4) * 4, "=");
  return Uint8Array.from(
    atob(padded),
    (character) => character.charCodeAt(0),
  );
}

function encodeBase64Url(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(
    /=+$/u,
    "",
  );
}

function decodeJwtPart(segment) {
  return JSON.parse(new TextDecoder().decode(decodeBase64Url(segment)));
}

function decodeJwtPayload(token) {
  const parts = token.split(".");
  assert.equal(parts.length, 3, "signed capability must be a JWT");
  const payload = decodeJwtPart(parts[1]);
  assert.equal(typeof payload, "object");
  assert.notEqual(payload, null);
  assert.equal(Number.isSafeInteger(payload.iat), true);
  assert.equal(Number.isSafeInteger(payload.exp), true);
  return payload;
}

async function importJwtHmacKey(secret) {
  assert.equal(typeof secret, "string");
  assert.ok(secret.length >= 32, "trusted local JWT secret is required");
  return await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

async function rewriteVerifiedSignedUploadExpiry(
  rawUrl,
  secret,
  issuedAt,
  expiresAt,
) {
  assert.equal(Number.isSafeInteger(issuedAt), true);
  assert.equal(Number.isSafeInteger(expiresAt), true);
  assert.ok(expiresAt > issuedAt);
  const url = new URL(rawUrl);
  const token = url.searchParams.get("token");
  assert.ok(token, "signed capability token is required");
  const parts = token.split(".");
  assert.equal(parts.length, 3, "signed capability must be a JWT");
  const header = decodeJwtPart(parts[0]);
  assert.deepEqual(Object.keys(header).sort(), ["alg"]);
  assert.equal(header.alg, "HS256");
  const key = await importJwtHmacKey(secret);
  const originalValid = await crypto.subtle.verify(
    "HMAC",
    key,
    decodeBase64Url(parts[2]),
    new TextEncoder().encode(`${parts[0]}.${parts[1]}`),
  );
  assert.equal(
    originalValid,
    true,
    "provider capability must verify with the trusted local signer",
  );
  const originalClaims = decodeJwtPayload(token);
  const nextClaims = { ...originalClaims, iat: issuedAt, exp: expiresAt };
  const payload = encodeBase64Url(
    new TextEncoder().encode(JSON.stringify(nextClaims)),
  );
  const signingInput = `${parts[0]}.${payload}`;
  const signature = new Uint8Array(
    await crypto.subtle.sign(
      "HMAC",
      key,
      new TextEncoder().encode(signingInput),
    ),
  );
  url.searchParams.set(
    "token",
    `${signingInput}.${encodeBase64Url(signature)}`,
  );
  const rewrittenToken = url.searchParams.get("token");
  assert.ok(rewrittenToken);
  const rewrittenParts = rewrittenToken.split(".");
  const rewrittenValid = await crypto.subtle.verify(
    "HMAC",
    key,
    decodeBase64Url(rewrittenParts[2]),
    new TextEncoder().encode(`${rewrittenParts[0]}.${rewrittenParts[1]}`),
  );
  assert.equal(rewrittenValid, true, "rewritten fixture signature must verify");
  return { url, claims: decodeJwtPayload(rewrittenToken) };
}

function buildPsqlCommandOptions(password) {
  return {
    clearEnv: true,
    env: {
      PGCONNECT_TIMEOUT: "5",
      ...(password ? { PGPASSWORD: password } : {}),
    },
    stdin: "null",
    stdout: "piped",
    stderr: "piped",
  };
}

async function runPsql(psqlPath, rawDatabaseUrl, sql) {
  const databaseUrl = new URL(rawDatabaseUrl);
  assert.ok(["postgres:", "postgresql:"].includes(databaseUrl.protocol));
  assert.ok(
    ["127.0.0.1", "localhost", "::1"].includes(databaseUrl.hostname),
    "database fixture must be loopback-only",
  );
  assert.ok(databaseUrl.pathname.length > 1, "database name is required");
  const password = decodeURIComponent(databaseUrl.password);
  databaseUrl.password = "";
  const command = new Deno.Command(psqlPath, {
    ...buildPsqlCommandOptions(password),
    args: [
      "--no-psqlrc",
      "--quiet",
      "--set",
      "ON_ERROR_STOP=1",
      "--tuples-only",
      "--no-align",
      "--dbname",
      databaseUrl.toString(),
      "--command",
      sql,
    ],
  });
  const result = await command.output();
  assert.equal(result.code, 0, "disposable PostgreSQL fixture command failed");
  return new TextDecoder().decode(result.stdout).trim();
}

async function createCaseBoundRecordsFixture({
  psqlPath,
  databaseUrl,
  ownerUserId,
  otherUserId,
}) {
  assert.match(ownerUserId, UUID_PATTERN);
  assert.match(otherUserId, UUID_PATTERN);
  const ownerCaseId = crypto.randomUUID();
  const otherCaseId = crypto.randomUUID();
  const sql = `
begin;
insert into casework.cases(
  id, case_status, title, created_by, creation_idempotency_key,
  creation_payload_sha256
) values
  ('${ownerCaseId}', 'active', 'A15 owner case', '${ownerUserId}',
   'a15storage${ownerCaseId.replaceAll("-", "")}', repeat('a', 64)),
  ('${otherCaseId}', 'active', 'A15 other case', '${otherUserId}',
   'a15storage${otherCaseId.replaceAll("-", "")}', repeat('b', 64));
insert into casework.case_members(case_id, user_id, role, added_by)
values
  ('${ownerCaseId}', '${ownerUserId}', 'owner', '${ownerUserId}'),
  ('${otherCaseId}', '${otherUserId}', 'owner', '${otherUserId}');
select
  (select count(*) from casework.cases where id in ('${ownerCaseId}', '${otherCaseId}'))
  || '|' ||
  (select count(*) from casework.case_members where case_id in ('${ownerCaseId}', '${otherCaseId}'));
commit;`;
  assert.equal(await runPsql(psqlPath, databaseUrl, sql), "2|2");
  return { ownerCaseId, otherCaseId };
}

async function removeCaseBoundRecordsFixture(
  { psqlPath, databaseUrl, fixture },
) {
  const { ownerCaseId, otherCaseId } = fixture;
  assert.match(ownerCaseId, UUID_PATTERN);
  assert.match(otherCaseId, UUID_PATTERN);
  const sql = `
begin;
delete from casework.case_members
where case_id in ('${ownerCaseId}', '${otherCaseId}');
delete from casework.cases
where id in ('${ownerCaseId}', '${otherCaseId}');
select
  (select count(*) from casework.cases where id in ('${ownerCaseId}', '${otherCaseId}'))
  || '|' ||
  (select count(*) from casework.case_members where case_id in ('${ownerCaseId}', '${otherCaseId}'));
commit;`;
  assert.equal(await runPsql(psqlPath, databaseUrl, sql), "0|0");
}

async function assertAuthorizationSpecificDenial(response) {
  assert.equal(response.ok, false, "direct browser Storage access must fail");
  assert.ok(
    [400, 401, 403, 404].includes(response.status),
    "Storage denial status is required",
  );
  const text = await response.text();
  let body = {};
  try {
    body = JSON.parse(text);
  } catch {
    body = {};
  }
  const marker = [body.statusCode, body.error, body.code, body.message]
    .filter((value) => typeof value === "string" || typeof value === "number")
    .join(" ");
  assert.match(
    marker,
    /403|unauthori[sz]ed|permission|row.level|object not found/iu,
    "Storage must return its closed authorization/object-concealment outcome",
  );
}

async function assertStorageObjectAbsent(response) {
  assert.equal(response.ok, false, "deleted Storage object must be absent");
  assert.equal(
    response.status,
    400,
    "deleted Storage object must return the provider not-found HTTP status",
  );
  const body = await response.json();
  assert.deepEqual(
    Object.keys(body).sort(),
    ["error", "message", "statusCode"],
    "Storage absence response must use the exact provider shape",
  );
  assert.equal(String(body.statusCode), "404");
  assert.equal(body.error, "not_found");
  assert.equal(body.message, "Object not found");
}

async function runVerifiedCleanup({
  base,
  adminHeaders,
  uploadedByBucket,
  users,
  caseFixture,
  psqlPath,
  databaseUrl,
}) {
  const errors = [];
  const attempt = async (label, operation) => {
    try {
      await operation();
    } catch (error) {
      errors.push(new Error(`${label} failed`, { cause: error }));
    }
  };
  for (const [bucket, keys] of Object.entries(uploadedByBucket)) {
    if (keys.length === 0) continue;
    await attempt(`Storage cleanup ${bucket}`, async () => {
      const cleanup = await fetch(`${base}/storage/v1/object/${bucket}`, {
        method: "DELETE",
        headers: adminHeaders,
        body: JSON.stringify({ prefixes: keys }),
      });
      assert.equal(cleanup.ok, true, `Storage cleanup rejected for ${bucket}`);
      if (cleanup.body) await cleanup.body.cancel();
      for (const key of keys) {
        const readback = await fetch(
          `${base}/storage/v1/object/authenticated/${bucket}/${key}`,
          { headers: adminHeaders },
        );
        await assertStorageObjectAbsent(readback);
      }
    });
  }
  if (caseFixture) {
    await attempt("case/member fixture cleanup", async () => {
      await removeCaseBoundRecordsFixture({
        psqlPath,
        databaseUrl,
        fixture: caseFixture,
      });
    });
  }
  for (const id of users) {
    await attempt("Auth user cleanup", async () => {
      const cleanup = await fetch(`${base}/auth/v1/admin/users/${id}`, {
        method: "DELETE",
        headers: adminHeaders,
      });
      assert.equal(cleanup.ok, true, "Auth user cleanup rejected");
      if (cleanup.body) await cleanup.body.cancel();
      const readback = await fetch(`${base}/auth/v1/admin/users/${id}`, {
        headers: adminHeaders,
      });
      assert.equal(
        readback.ok,
        false,
        "Auth user cleanup readback must be absent",
      );
      assert.equal(readback.status, 404, "deleted Auth user must return 404");
      if (readback.body) await readback.body.cancel();
    });
  }
  return errors;
}

const REAL_STORAGE_CONFIRMED =
  (await optionalEnv("DRS_DOCUMENT_REAL_STORAGE_CONFIRMED")) === "1";

Deno.test("real Storage/Auth harness registers permission-safely and contains executable adversarial operations", async () => {
  const source = await Deno.readTextFile(SELF_URL);
  assert.doesNotMatch(source, /ignore:\s*Deno\.env\.get/u);
  assert.doesNotMatch(
    source,
    new RegExp(
      ["REAL", "STORAGE", "HARNESS", "REQUIRES", "DISPOSABLE", "PROVIDER"].join(
        "_",
      ),
      "u",
    ),
  );
  assert.match(source, /Deno\.permissions\.query/u);
  assert.doesNotMatch(source, /separately\s+clock-controlled\s+provider/iu);
  assert.match(source, /DRS_DOCUMENT_REAL_JWT_SECRET/u);
  assert.match(source, /DRS_DOCUMENT_REAL_PSQL/u);
  assert.match(source, /createCaseBoundRecordsFixture/u);
  assert.match(source, /rewriteVerifiedSignedUploadExpiry/u);
  assert.match(source, /runVerifiedCleanup/u);
  assert.match(source, /allowed_mime_types/u);
  assert.match(source, /crypto\.subtle\.digest/u);
  assert.match(source, /26_214_401/u);
  assert.match(source, /application\/svg\+xml/u);
  assert.match(source, /fetch\(/u);
});

Deno.test("focused RED 4: signed capability and scanner fail-closed seams are absent", async () => {
  const storage = await import(STORAGE_URL.href);
  const validation = await import(VALIDATION_URL.href);
  assert.equal(typeof storage.createSupabaseDocumentStoragePort, "function");
  assert.equal(typeof validation.evaluateHostileFileReport, "function");
});

Deno.test("focused RED review: an existing case-bound records object denial is absent", async () => {
  const source = await Deno.readTextFile(SELF_URL);
  const fixtureName = ["create", "CaseBound", "RecordsFixture"].join("");
  const denialName = ["assert", "Authorization", "SpecificDenial"].join("");
  assert.ok(source.includes(`function ${fixtureName}`));
  assert.ok(source.includes(`function ${denialName}`));
});

Deno.test("focused RED review: expired capability signature provenance is absent", async () => {
  const source = await Deno.readTextFile(SELF_URL);
  const signerName = ["rewrite", "Verified", "SignedUploadExpiry"].join("");
  const secretName = ["DRS_DOCUMENT", "REAL_JWT", "SECRET"].join("_");
  assert.ok(source.includes(`function ${signerName}`));
  assert.ok(source.includes(secretName));
});

Deno.test("focused RED review: cleanup success and primary failure aggregation are absent", async () => {
  const source = await Deno.readTextFile(SELF_URL);
  const cleanupName = ["run", "Verified", "Cleanup"].join("");
  const aggregateName = ["Aggregate", "Error"].join("");
  assert.ok(source.includes(`function ${cleanupName}`));
  assert.ok(source.includes(aggregateName));
});

Deno.test("focused RED readmission: psql child environment is not minimal", () => {
  const options = buildPsqlCommandOptions("local-disposable-password");
  assert.equal(options.clearEnv, true);
  assert.deepEqual(Object.keys(options.env).sort(), [
    "PGCONNECT_TIMEOUT",
    "PGPASSWORD",
  ]);
  for (
    const name of [
      "DRS_DOCUMENT_REAL_SERVICE_ROLE_KEY",
      "DRS_DOCUMENT_REAL_ANON_KEY",
      "DRS_DOCUMENT_REAL_JWT_SECRET",
    ]
  ) {
    assert.equal(Object.hasOwn(options.env, name), false);
  }
});

Deno.test("focused RED readmission: cleanup rejects arbitrary provider failure", async () => {
  await assert.doesNotReject(() =>
    assertStorageObjectAbsent(
      new Response(
        JSON.stringify({
          statusCode: "404",
          error: "not_found",
          message: "Object not found",
        }),
        { status: 400, headers: { "content-type": "application/json" } },
      ),
    )
  );
  await assert.rejects(() =>
    assertStorageObjectAbsent(
      new Response(
        JSON.stringify({
          statusCode: "500",
          error: "internal_error",
          message: "Internal server error",
        }),
        { status: 500, headers: { "content-type": "application/json" } },
      ),
    )
  );
});

Deno.test("server-owned intake path cannot be replaced by a caller path", async () => {
  const { buildIntakeObjectPath } = await import(STORAGE_URL.href);
  assert.equal(
    buildIntakeObjectPath(
      "11111111-1111-4111-8111-111111111111",
      "22222222-2222-4222-8222-222222222222",
      "pdf",
    ),
    "intents/11111111-1111-4111-8111-111111111111/22222222-2222-4222-8222-222222222222.pdf",
  );
  for (const ext of ["../pdf", "svg", "PDF", "pdf/evil"]) {
    assert.throws(() =>
      buildIntakeObjectPath(
        "11111111-1111-4111-8111-111111111111",
        "22222222-2222-4222-8222-222222222222",
        ext,
      )
    );
  }
});

Deno.test("official createSignedUploadUrl REST url is accepted only for the exact intake key", async () => {
  const { createSupabaseDocumentStoragePort } = await import(STORAGE_URL.href);
  const bucket = "drs-case-intake-private";
  const objectKey =
    "intents/11111111-1111-4111-8111-111111111111/22222222-2222-4222-8222-222222222222.pdf";
  const nativePath =
    `/object/upload/sign/${bucket}/${objectKey}?token=native-token`;
  const makePort = (url) =>
    createSupabaseDocumentStoragePort({
      env: ENV,
      fetch: () =>
        Promise.resolve(
          new Response(JSON.stringify({ url }), {
            status: 200,
            headers: { "content-type": "application/json" },
          }),
        ),
      now: () => new Date("2026-08-26T12:00:00.000Z"),
    });
  const signed = await makePort(nativePath).createSignedUpload({
    bucket,
    objectKey,
    mime: "application/pdf",
  });
  assert.equal(
    signed?.signedUploadUrl,
    `http://127.0.0.1:54321/storage/v1${nativePath}`,
  );
  for (
    const url of [
      nativePath.replace(bucket, "drs-case-records-private"),
      nativePath.replace(
        "22222222-2222-4222-8222-222222222222.pdf",
        "33333333-3333-4333-8333-333333333333.pdf",
      ),
      nativePath.split("?", 1)[0],
      `${nativePath}&caseId=caller`,
      `https://evil.example${nativePath}`,
    ]
  ) {
    assert.equal(
      await makePort(url).createSignedUpload({
        bucket,
        objectKey,
        mime: "application/pdf",
      }),
      null,
      url,
    );
  }
});

Deno.test("inspect recomputes size and SHA-256 from bounded object bytes", async () => {
  const { createSupabaseDocumentStoragePort } = await import(STORAGE_URL.href);
  const bytes = new TextEncoder().encode("%PDF-1.7\nDRS");
  let method = null;
  const port = createSupabaseDocumentStoragePort({
    env: ENV,
    fetch: (_url, init) => {
      method = init?.method ?? "GET";
      return Promise.resolve(
        new Response(bytes, {
          status: 200,
          headers: {
            "content-type": "application/pdf",
            "content-length": "1024",
            "x-laibe-sha256": "a".repeat(64),
          },
        }),
      );
    },
  });
  const facts = await port.inspect({
    bucket: "drs-case-intake-private",
    objectKey:
      "intents/11111111-1111-4111-8111-111111111111/22222222-2222-4222-8222-222222222222.pdf",
  });
  assert.equal(method, "GET");
  assert.equal(facts?.sizeBytes, bytes.byteLength);
  assert.equal(
    facts?.sha256,
    "e04d44ae182d4e7c3a0068e1883119ad68adabc6263bee839a86dbba1b50d7ea",
  );
  assert.notEqual(facts?.sha256, "a".repeat(64));
});

Deno.test("inspect cancels immediately when actual object bytes exceed 25 MiB", async () => {
  const { createSupabaseDocumentStoragePort } = await import(STORAGE_URL.href);
  let pulls = 0;
  let cancelled = false;
  const body = new ReadableStream({
    pull(controller) {
      pulls += 1;
      controller.enqueue(new Uint8Array(pulls === 1 ? 26_214_400 : 1));
    },
    cancel() {
      cancelled = true;
    },
  });
  const port = createSupabaseDocumentStoragePort({
    env: ENV,
    fetch: () =>
      Promise.resolve(
        new Response(body, {
          status: 200,
          headers: { "content-type": "application/pdf" },
        }),
      ),
  });
  assert.equal(
    await port.inspect({
      bucket: "drs-case-intake-private",
      objectKey:
        "intents/11111111-1111-4111-8111-111111111111/22222222-2222-4222-8222-222222222222.pdf",
    }),
    null,
  );
  assert.ok(pulls <= 3, `bounded reader pulled ${pulls} chunks`);
  assert.equal(cancelled, true);
});

Deno.test("post-promotion verification uses destination bytes and queues a typed orphan on mismatch", async () => {
  const { createSupabaseDocumentStoragePort } = await import(STORAGE_URL.href);
  const { createDocumentStorageService } = await import(SERVICE_URL.href);
  const source = new TextEncoder().encode("%PDF-1.7\nDRS");
  const changed = new TextEncoder().encode("%PDF-1.7\nDRX");
  let gets = 0;
  const storage = createSupabaseDocumentStoragePort({
    env: ENV,
    fetch: (_url, init) => {
      if (init?.method === "POST") {
        return Promise.resolve(new Response(null, { status: 200 }));
      }
      gets += 1;
      return Promise.resolve(
        new Response(gets === 1 ? source : changed, {
          status: 200,
          headers: {
            "content-type": "application/pdf",
            "content-length": String(source.byteLength),
            "x-laibe-sha256":
              "e04d44ae182d4e7c3a0068e1883119ad68adabc6263bee839a86dbba1b50d7ea",
          },
        }),
      );
    },
  });
  let executeCalls = 0;
  let cleanupCalls = 0;
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
              version_ref: "dvr_01j6a8k9m4q2w3e4r5t6y7u8i9",
              receipt_ref: "rcp_01j6a8k9m4q2w3e4r5t6y7u8i9",
            },
        );
      },
      queueOrphanCleanup() {
        cleanupCalls += 1;
        return Promise.resolve({
          ok: true,
          state: "ORPHAN_CLEANUP_QUEUED",
          work_item_id: "55555555-5555-4555-8555-555555555555",
        });
      },
    },
    storage,
    scanner: {
      runtimeAvailable: true,
      scan: () =>
        Promise.resolve({
          declaredMime: "application/pdf",
          detectedMime: "application/pdf",
          extension: "pdf",
          decodedBytes: source.byteLength,
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
    },
  });
  const result = await service.finalizeUpload({
    authenticatedUserId: "11111111-1111-4111-8111-111111111111",
    expectedCaseId: "22222222-2222-4222-8222-222222222222",
    authorizationSubject: "DRS",
    grantId: "33333333-3333-4333-8333-333333333333",
    grantVersion: "7",
    grantExpiresAt: "2026-08-26T12:15:00.000Z",
  }, {
    schemaVersion: "laibe.drs-document-upload-finalize.request.v1",
    intentRef: "int_01j6a8k9m4q2w3e4r5t6y7u8i9",
    idempotencyKey: "finalize-01j6a8k9m4q2w3e4",
  });
  assert.equal(result, null);
  assert.equal(executeCalls, 1);
  assert.equal(cleanupCalls, 1);
});

Deno.test({
  name:
    "real Storage: private buckets, capability expiry/replay and negative uploads",
  ignore: !REAL_STORAGE_CONFIRMED,
  async fn() {
    const rawUrl = await optionalEnv("DRS_DOCUMENT_REAL_STORAGE_URL");
    const serviceKey = await optionalEnv("DRS_DOCUMENT_REAL_SERVICE_ROLE_KEY");
    const anonKey = await optionalEnv("DRS_DOCUMENT_REAL_ANON_KEY");
    const jwtSecret = await optionalEnv("DRS_DOCUMENT_REAL_JWT_SECRET");
    const psqlPath = await optionalEnv("DRS_DOCUMENT_REAL_PSQL");
    const databaseUrl = await optionalEnv("DRS_DOCUMENT_REAL_PG_URL");
    assert.ok(
      rawUrl && serviceKey && anonKey && jwtSecret && psqlPath && databaseUrl,
    );
    const origin = new URL(rawUrl);
    assert.ok(["http:", "https:"].includes(origin.protocol));
    assert.ok(["127.0.0.1", "localhost", "::1"].includes(origin.hostname));
    assert.equal(origin.username, "");
    assert.equal(origin.password, "");
    assert.equal(origin.pathname, "/");
    const base = origin.toString().replace(/\/$/u, "");
    const adminHeaders = {
      authorization: `Bearer ${serviceKey}`,
      apikey: serviceKey,
      "content-type": "application/json",
    };
    const discardBody = async (response) => {
      if (response.body) await response.body.cancel();
    };
    const issueSignedUrl = async (key) => {
      const response = await fetch(
        `${base}/storage/v1/object/upload/sign/drs-case-intake-private/${key}`,
        {
          method: "POST",
          headers: adminHeaders,
          body: JSON.stringify({ upsert: false }),
        },
      );
      assert.equal(response.ok, true, "signed capability creation failed");
      const body = await response.json();
      assert.equal(typeof body.url, "string");
      const url = new URL(`/storage/v1${body.url}`, base);
      assert.equal(url.origin, origin.origin);
      return url;
    };
    const suffix = crypto.randomUUID();
    const objectKey =
      `intents/${crypto.randomUUID()}/${crypto.randomUUID()}.pdf`;
    const bytes = new TextEncoder().encode("%PDF-1.7\nA15 real Storage");
    const users = [];
    const sessions = [];
    const uploadedByBucket = {
      "drs-case-intake-private": [],
      "drs-case-records-private": [],
    };
    let caseFixture = null;
    let primaryFailure = null;
    try {
      // bucket readback: both buckets must be private, 25 MiB and exact MIME.
      for (
        const bucket of ["drs-case-intake-private", "drs-case-records-private"]
      ) {
        const response = await fetch(`${base}/storage/v1/bucket/${bucket}`, {
          headers: adminHeaders,
        });
        assert.equal(response.ok, true, `bucket readback failed: ${bucket}`);
        const body = await response.json();
        assert.equal(body.id, bucket);
        assert.equal(body.public, false, "private bucket required");
        assert.equal(body.file_size_limit, 26_214_400);
        assert.deepEqual(body.allowed_mime_types, [
          "application/pdf",
          "image/jpeg",
          "image/png",
        ]);
      }

      // Two disposable Auth sessions plus two real case memberships bind the
      // denial to one existing records object, not a randomized 404.
      for (const role of ["a", "b"]) {
        const email = `a15-storage-${role}-${suffix}@example.invalid`;
        const password = `A15-${suffix}-${role}-safe`;
        const create = await fetch(`${base}/auth/v1/admin/users`, {
          method: "POST",
          headers: adminHeaders,
          body: JSON.stringify({ email, password, email_confirm: true }),
        });
        assert.equal(create.ok, true, "disposable Auth user creation failed");
        const created = await create.json();
        users.push(created.id);
        const login = await fetch(`${base}/auth/v1/token?grant_type=password`, {
          method: "POST",
          headers: { apikey: anonKey, "content-type": "application/json" },
          body: JSON.stringify({ email, password }),
        });
        assert.equal(login.ok, true, "disposable Auth session failed");
        const session = await login.json();
        sessions.push({ id: created.id, accessToken: session.access_token });
      }

      caseFixture = await createCaseBoundRecordsFixture({
        psqlPath,
        databaseUrl,
        ownerUserId: sessions[0].id,
        otherUserId: sessions[1].id,
      });
      const recordsKey =
        `cases/${caseFixture.ownerCaseId}/documents/${crypto.randomUUID()}/versions/${crypto.randomUUID()}/source.pdf`;
      const recordsUpload = await fetch(
        `${base}/storage/v1/object/drs-case-records-private/${recordsKey}`,
        {
          method: "POST",
          headers: {
            ...adminHeaders,
            "content-type": "application/pdf",
            "x-upsert": "false",
          },
          body: bytes,
        },
      );
      assert.equal(recordsUpload.ok, true, "records fixture upload failed");
      await discardBody(recordsUpload);
      uploadedByBucket["drs-case-records-private"].push(recordsKey);
      const serviceRead = await fetch(
        `${base}/storage/v1/object/authenticated/drs-case-records-private/${recordsKey}`,
        { headers: adminHeaders },
      );
      assert.equal(serviceRead.ok, true, "service records readback failed");
      assert.deepEqual(
        new Uint8Array(await serviceRead.arrayBuffer()),
        bytes,
        "service records readback bytes",
      );
      const crossCaseRead = await fetch(
        `${base}/storage/v1/object/authenticated/drs-case-records-private/${recordsKey}`,
        {
          headers: {
            authorization: `Bearer ${sessions[1].accessToken}`,
            apikey: anonKey,
          },
        },
      );
      await assertAuthorizationSpecificDenial(crossCaseRead);

      const signedUrl = await issueSignedUrl(objectKey);

      const upload = await fetch(signedUrl, {
        method: "PUT",
        headers: { "content-type": "application/pdf", "x-upsert": "false" },
        body: bytes,
      });
      assert.equal(upload.ok, true, "signed upload failed");
      await discardBody(upload);
      uploadedByBucket["drs-case-intake-private"].push(objectKey);
      const replay = await fetch(signedUrl, {
        method: "PUT",
        headers: { "content-type": "application/pdf", "x-upsert": "false" },
        body: bytes,
      });
      assert.equal(
        replay.ok,
        false,
        "signed capability replay must not overwrite",
      );
      await discardBody(replay);
      const wrongKey = new URL(signedUrl);
      wrongKey.pathname = wrongKey.pathname.replace(/\.pdf$/u, "-wrong.pdf");
      const wrong = await fetch(wrongKey, {
        method: "PUT",
        headers: { "content-type": "application/pdf", "x-upsert": "false" },
        body: bytes,
      });
      assert.equal(wrong.ok, false, "wrong key token substitution must fail");
      await discardBody(wrong);

      const wrongMimeKey =
        `intents/${crypto.randomUUID()}/${crypto.randomUUID()}.pdf`;
      const wrongMimeUrl = await issueSignedUrl(wrongMimeKey);
      const wrongMime = await fetch(wrongMimeUrl, {
        method: "PUT",
        headers: { "content-type": "application/svg+xml", "x-upsert": "false" },
        body: new TextEncoder().encode("<svg/>"),
      });
      assert.equal(wrongMime.ok, false, "bucket MIME allowlist must reject");
      await discardBody(wrongMime);

      const oversizedKey =
        `intents/${crypto.randomUUID()}/${crypto.randomUUID()}.pdf`;
      const oversizedUrl = await issueSignedUrl(oversizedKey);
      const oversized = await fetch(oversizedUrl, {
        method: "PUT",
        headers: { "content-type": "application/pdf", "x-upsert": "false" },
        body: new Uint8Array(26_214_401),
      });
      assert.equal(oversized.ok, false, "bucket size limit must reject");
      await discardBody(oversized);

      const nowSeconds = Math.floor(Date.now() / 1000);
      const expiredKey =
        `intents/${crypto.randomUUID()}/${crypto.randomUUID()}.pdf`;
      const expiredSource = await issueSignedUrl(expiredKey);
      const expiredFixture = await rewriteVerifiedSignedUploadExpiry(
        expiredSource,
        jwtSecret,
        nowSeconds - 7_260,
        nowSeconds - 60,
      );
      const expired = await fetch(expiredFixture.url, {
        method: "PUT",
        headers: { "content-type": "application/pdf", "x-upsert": "false" },
        body: bytes,
      });
      assert.equal(expiredFixture.claims.exp - expiredFixture.claims.iat, 7200);
      assert.ok(
        expiredFixture.claims.exp * 1000 < Date.now(),
        "expired capability fixture must carry a past expiry",
      );
      assert.equal(expired.ok, false, "expired capability must fail");
      assert.ok([400, 401, 403].includes(expired.status));
      const expiredBody = await expired.text();
      assert.match(
        expiredBody,
        /expir|jwt|token/iu,
        "validly signed capability must fail specifically on expiry",
      );

      const lateKey =
        `intents/${crypto.randomUUID()}/${crypto.randomUUID()}.pdf`;
      const lateSource = await issueSignedUrl(lateKey);
      const lateIssuedSeconds = nowSeconds - 960;
      const lateFixture = await rewriteVerifiedSignedUploadExpiry(
        lateSource,
        jwtSecret,
        lateIssuedSeconds,
        lateIssuedSeconds + 7200,
      );
      const lateIssuedMs = lateIssuedSeconds * 1000;
      const lateAgeMs = Date.now() - lateIssuedMs;
      assert.ok(lateAgeMs > 15 * 60_000, "late upload must exceed app TTL");
      assert.ok(
        lateAgeMs < 2 * 60 * 60_000,
        "late token must remain native-valid",
      );
      assert.equal(lateFixture.claims.iat * 1000, lateIssuedMs);
      assert.equal(lateFixture.claims.exp - lateFixture.claims.iat, 7200);
      assert.ok(
        lateFixture.claims.exp * 1000 > Date.now(),
        "late capability must remain within native token expiry",
      );
      const late = await fetch(lateFixture.url, {
        method: "PUT",
        headers: { "content-type": "application/pdf", "x-upsert": "false" },
        body: bytes,
      });
      assert.equal(
        late.ok,
        true,
        "native token remains replayable after application TTL",
      );
      await discardBody(late);
      uploadedByBucket["drs-case-intake-private"].push(lateKey);

      const served = await fetch(
        `${base}/storage/v1/object/authenticated/drs-case-intake-private/${objectKey}`,
        { headers: adminHeaders },
      );
      assert.equal(served.ok, true);
      const actual = new Uint8Array(await served.arrayBuffer());
      assert.equal(actual.byteLength, bytes.byteLength);
      assert.deepEqual(actual, bytes, "actual byte hash source mismatch");
      const actualHash = new Uint8Array(
        await crypto.subtle.digest("SHA-256", actual),
      );
      const expectedHash = new Uint8Array(
        await crypto.subtle.digest("SHA-256", bytes),
      );
      assert.deepEqual(actualHash, expectedHash, "actual byte hash mismatch");
    } catch (error) {
      primaryFailure = error;
    }
    const cleanupErrors = await runVerifiedCleanup({
      base,
      adminHeaders,
      uploadedByBucket,
      users,
      caseFixture,
      psqlPath,
      databaseUrl,
    });
    if (primaryFailure && cleanupErrors.length > 0) {
      throw new AggregateError(
        [primaryFailure, ...cleanupErrors],
        "real Storage operation and cleanup both failed",
      );
    }
    if (primaryFailure) throw primaryFailure;
    if (cleanupErrors.length > 0) {
      throw new AggregateError(cleanupErrors, "real Storage cleanup failed");
    }
  },
});
