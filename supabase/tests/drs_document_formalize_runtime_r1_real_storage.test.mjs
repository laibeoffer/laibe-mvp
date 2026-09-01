import assert from "node:assert/strict";

const contractsUrl = new URL(
  "../functions/_shared/drs-document-storage/contracts.ts",
  import.meta.url,
);

const VALID_FINALIZE = Object.freeze({
  schemaVersion: "laibe.drs-document-upload-finalize.request.v2",
  intentRef: "int_01j6a8k9m4q2w3e4r5t6y7u8i9",
  idempotencyKey: "finalize-01j6a8k9m4q2w3e4",
  commandId: "11111111-1111-4111-8111-111111111111",
  expectedCaseVersion: 7,
});

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
