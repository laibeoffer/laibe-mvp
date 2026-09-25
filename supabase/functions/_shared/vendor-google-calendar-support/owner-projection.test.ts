const moduleUrl = new URL("./owner-projection.ts", import.meta.url);

function equal(actual: unknown, expected: unknown): void {
  if (!Object.is(actual, expected)) {
    throw new Error(`expected ${String(expected)}, received ${String(actual)}`);
  }
}

function deepEqual(actual: unknown, expected: unknown): void {
  const left = JSON.stringify(actual);
  const right = JSON.stringify(expected);
  if (left !== right) throw new Error(`expected ${right}, received ${left}`);
}

function throws(action: () => unknown, expectedMessage: string): void {
  try {
    action();
  } catch (error) {
    if (error instanceof Error && error.message === expectedMessage) return;
    throw error;
  }
  throw new Error(`expected ${expectedMessage} to be thrown`);
}

async function projectionModule() {
  return import(moduleUrl.href);
}

const readyContext = {
  expectedCaseId: "5d87fcb4-1d97-46dd-89b0-a5d52d4dbd5d",
  ownerCaseId: "5d87fcb4-1d97-46dd-89b0-a5d52d4dbd5d",
  vendorCaseId: "5d87fcb4-1d97-46dd-89b0-a5d52d4dbd5d",
  ownerActive: true,
  vendorActive: true,
  sharingEnabled: true,
  sharingRevision: 4,
  expectedSharingRevision: 4,
  credentialGeneration: 3,
  expectedCredentialGeneration: 3,
  credentialRevokedAt: null,
} as const;

Deno.test("same-case active Vendor sharing is the only ready projection state", async () => {
  const { classifyOwnerCalendarProjectionContext } = await projectionModule();

  equal(classifyOwnerCalendarProjectionContext(readyContext), "ready");
  equal(
    classifyOwnerCalendarProjectionContext({
      ...readyContext,
      vendorActive: false,
    }),
    "not_shared",
  );
  equal(
    classifyOwnerCalendarProjectionContext({
      ...readyContext,
      sharingEnabled: false,
    }),
    "not_shared",
  );
  equal(
    classifyOwnerCalendarProjectionContext({
      ...readyContext,
      credentialRevokedAt: "2026-09-25T08:00:00Z",
    }),
    "not_shared",
  );
});

Deno.test("cross-case or inactive Owner authority fails closed", async () => {
  const { classifyOwnerCalendarProjectionContext } = await projectionModule();

  for (
    const context of [
      { ...readyContext, ownerActive: false },
      { ...readyContext, ownerCaseId: "d64b5099-9755-41ac-9fd0-3fc025d2f7c3" },
      { ...readyContext, vendorCaseId: "d64b5099-9755-41ac-9fd0-3fc025d2f7c3" },
    ]
  ) {
    throws(
      () => classifyOwnerCalendarProjectionContext(context),
      "authority_denied",
    );
  }
});

Deno.test("stale sharing or credential generation cannot produce Owner events", async () => {
  const { classifyOwnerCalendarProjectionContext } = await projectionModule();

  equal(
    classifyOwnerCalendarProjectionContext({
      ...readyContext,
      expectedSharingRevision: 5,
    }),
    "temporarily_unavailable",
  );
  equal(
    classifyOwnerCalendarProjectionContext({
      ...readyContext,
      expectedCredentialGeneration: 4,
    }),
    "temporarily_unavailable",
  );
});

Deno.test("Owner request range rejects invalid and over-31-day windows", async () => {
  const { parseOwnerCalendarProjectionRequest } = await projectionModule();
  const base = {
    schemaVersion: "laibe.owner-vendor-calendar-read.v1",
    timeMin: "2026-09-01T00:00:00+08:00",
    timeMax: "2026-10-02T00:00:00+08:00",
  };

  deepEqual(parseOwnerCalendarProjectionRequest(base), base);
  throws(
    () =>
      parseOwnerCalendarProjectionRequest({
        ...base,
        timeMax: "2026-10-03T00:00:00+08:00",
      }),
    "invalid_request",
  );
  throws(
    () =>
      parseOwnerCalendarProjectionRequest({ ...base, timeMax: base.timeMin }),
    "invalid_request",
  );
});
