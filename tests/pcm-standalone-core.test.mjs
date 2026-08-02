import assert from "node:assert/strict";
import test from "node:test";

const coreModuleUrl = new URL(
  "../src/stitch_laibe_landing_onboarding/pcm_standalone/core/index.js",
  import.meta.url,
);

async function loadCore() {
  try {
    return await import(coreModuleUrl.href);
  } catch (error) {
    assert.fail(
      `PCM standalone core module must be implemented: ${error.message}`,
    );
  }
}

const HASH_V1 = "a".repeat(64);
const HASH_V2 = "b".repeat(64);

function draftCommand(overrides = {}) {
  return {
    idempotencyKey: "draft-v1",
    expectedAggregateVersion: 0,
    actorId: "provider-person-1",
    actorCapability: "service_provider_natural_person",
    contractVersionId: "contract-version-1",
    versionHash: HASH_V1,
    createdAt: "2026-07-27T09:00:00.000Z",
    contentSnapshot: {
      title: "AI PCM 服務契約",
      scope: ["文件整理", "風險標註"],
    },
    ownerPartyId: "owner-1",
    serviceProviderPartySnapshot: {
      partyId: "provider-party-1",
      partyType: "natural_person",
      signatoryActorId: "provider-person-1",
      displayName: "個人工作室負責人",
    },
    ...overrides,
  };
}

function acceptanceCommand(overrides = {}) {
  return {
    idempotencyKey: "accept-owner-v1",
    expectedAggregateVersion: 2,
    actorId: "owner-1",
    actorCapability: "case_owner",
    contractVersionId: "contract-version-1",
    versionHash: HASH_V1,
    acceptedAt: "2026-07-27T09:05:00.000Z",
    intentStatement: "本人已閱讀並同意此版本內容。",
    sessionId: "session-owner-1",
    ...overrides,
  };
}

function submitCommand(overrides = {}) {
  return {
    idempotencyKey: "submit-v1",
    expectedAggregateVersion: 1,
    actorId: "provider-person-1",
    actorCapability: "service_provider_natural_person",
    contractVersionId: "contract-version-1",
    submittedAt: "2026-07-27T09:03:00.000Z",
    ...overrides,
  };
}

async function createDraftAggregate() {
  const core = await loadCore();
  const empty = core.createContractAggregate({
    contractId: "contract-1",
    caseId: "case-1",
  });
  return {
    core,
    aggregate: core.createContractVersion(empty, draftCommand()),
  };
}

async function createSubmittedAggregate() {
  const { core, aggregate } = await createDraftAggregate();
  return {
    core,
    aggregate: core.submitContractVersionForAcceptance(
      aggregate,
      submitCommand(),
    ),
  };
}

test("契約版本建立後不可變，修訂只建立 successor vN+1", async () => {
  const { core, aggregate } = await createDraftAggregate();
  const originalVersion = aggregate.contractVersions[0];

  assert.equal(originalVersion.versionNumber, 1);
  assert.equal(Object.isFrozen(originalVersion), true);
  assert.equal(Object.isFrozen(originalVersion.contentSnapshot), true);
  assert.throws(() => {
    originalVersion.contentSnapshot.title = "覆寫舊版本";
  }, TypeError);

  const revised = core.reviseContractVersion(aggregate, {
    ...draftCommand({
      idempotencyKey: "draft-v2",
      expectedAggregateVersion: 1,
      contractVersionId: "contract-version-2",
      versionHash: HASH_V2,
      createdAt: "2026-07-27T10:00:00.000Z",
      predecessorContractVersionId: "contract-version-1",
      contentSnapshot: {
        title: "AI PCM 服務契約（修訂版）",
        scope: ["文件整理", "風險標註", "補件追蹤"],
      },
    }),
  });

  assert.equal(revised.contractVersions.length, 2);
  assert.equal(revised.contractVersions[1].versionNumber, 2);
  assert.equal(
    revised.contractVersions[1].predecessorContractVersionId,
    "contract-version-1",
  );
  assert.deepEqual(revised.contractVersions[0], originalVersion);
  assert.equal(
    revised.lifecycleByVersionId["contract-version-1"],
    "SUPERSEDED",
  );
  assert.equal(revised.currentContractVersionId, "contract-version-2");
});

test("契約依 DRAFT → owner 待接受 → provider 待接受 → ACTIVE 前進", async () => {
  const { core, aggregate: draft } = await createDraftAggregate();

  assert.equal(draft.state, "DRAFT");
  assert.deepEqual(
    {
      contractId: draft.events.at(-1).contractId,
      caseId: draft.events.at(-1).caseId,
      contractVersionId: draft.events.at(-1).contractVersionId,
      resultingState: draft.events.at(-1).resultingState,
      nextActorCapability: draft.events.at(-1).nextActorCapability,
    },
    {
      contractId: "contract-1",
      caseId: "case-1",
      contractVersionId: "contract-version-1",
      resultingState: "DRAFT",
      nextActorCapability: "service_provider_natural_person",
    },
  );

  assert.throws(
    () =>
      core.acceptContractVersion(
        draft,
        acceptanceCommand({ expectedAggregateVersion: 1 }),
      ),
    (error) => error.code === "CONTRACT_VERSION_NOT_SUBMITTED",
  );

  const aggregate = core.submitContractVersionForAcceptance(
    draft,
    submitCommand(),
  );
  assert.equal(aggregate.state, "OWNER_ACCEPTANCE_PENDING");
  assert.deepEqual(
    {
      contractId: aggregate.events.at(-1).contractId,
      caseId: aggregate.events.at(-1).caseId,
      contractVersionId: aggregate.events.at(-1).contractVersionId,
      resultingState: aggregate.events.at(-1).resultingState,
      nextActorCapability: aggregate.events.at(-1).nextActorCapability,
    },
    {
      contractId: "contract-1",
      caseId: "case-1",
      contractVersionId: "contract-version-1",
      resultingState: "OWNER_ACCEPTANCE_PENDING",
      nextActorCapability: "case_owner",
    },
  );

  assert.throws(
    () =>
      core.acceptContractVersion(aggregate, {
        ...acceptanceCommand({
          idempotencyKey: "provider-before-owner",
          actorId: "provider-person-1",
          actorCapability: "service_provider_natural_person",
          sessionId: "session-provider-too-early",
        }),
      }),
    (error) => error.code === "OWNER_ACCEPTANCE_REQUIRED",
  );

  const ownerAccepted = core.acceptContractVersion(
    aggregate,
    acceptanceCommand(),
  );

  assert.equal(
    ownerAccepted.lifecycleByVersionId["contract-version-1"],
    "OWNER_ACCEPTED_PROVIDER_PENDING",
  );
  assert.equal(
    ownerAccepted.events.at(-1).nextActorCapability,
    "service_provider_natural_person",
  );
  assert.equal(
    ownerAccepted.events.at(-1).resultingState,
    "OWNER_ACCEPTED_PROVIDER_PENDING",
  );

  assert.throws(
    () =>
      core.acceptContractVersion(ownerAccepted, {
        ...acceptanceCommand({
          idempotencyKey: "accept-provider-wrong-hash",
          expectedAggregateVersion: 3,
          actorId: "provider-person-1",
          actorCapability: "service_provider_natural_person",
          versionHash: HASH_V2,
          sessionId: "session-provider-wrong",
        }),
      }),
    (error) => error.code === "CONTRACT_VERSION_HASH_MISMATCH",
  );

  const active = core.acceptContractVersion(ownerAccepted, {
    ...acceptanceCommand({
      idempotencyKey: "accept-provider-v1",
      expectedAggregateVersion: 3,
      actorId: "provider-person-1",
      actorCapability: "service_provider_natural_person",
      sessionId: "session-provider-1",
    }),
  });

  assert.equal(active.lifecycleByVersionId["contract-version-1"], "ACTIVE");
  assert.equal(active.state, "ACTIVE");
  assert.equal(active.events.at(-1).resultingState, "ACTIVE");
  assert.equal(active.events.at(-1).nextActorCapability, null);
});

test("service provider 必須是自然人，PCM 審查者不得代替 provider 接受", async () => {
  const core = await loadCore();
  const empty = core.createContractAggregate({
    contractId: "contract-1",
    caseId: "case-1",
  });

  assert.throws(
    () =>
      core.createContractVersion(
        empty,
        draftCommand({
          serviceProviderPartySnapshot: {
            partyId: "provider-company-1",
            partyType: "company",
            signatoryActorId: "provider-person-1",
            displayName: "尚未成立的公司",
          },
        }),
      ),
    (error) => error.code === "SERVICE_PROVIDER_MUST_BE_NATURAL_PERSON",
  );

  const draft = core.createContractVersion(empty, draftCommand());
  const aggregate = core.submitContractVersionForAcceptance(
    draft,
    submitCommand(),
  );
  assert.throws(
    () =>
      core.acceptContractVersion(aggregate, {
        ...acceptanceCommand({
          idempotencyKey: "pcm-cannot-accept-provider",
          actorId: "pcm-reviewer-1",
          actorCapability: "pcm_reviewer",
        }),
      }),
    (error) => error.code === "ACTOR_CANNOT_ACCEPT_CONTRACT",
  );
});

test("接受事件完整保存版本、意圖與 session 證據", async () => {
  const { core, aggregate } = await createSubmittedAggregate();
  const command = acceptanceCommand();
  const accepted = core.acceptContractVersion(aggregate, command);
  const event = accepted.events.at(-1);

  assert.equal(event.type, "CONTRACT_VERSION_ACCEPTED");
  assert.equal(event.contractId, "contract-1");
  assert.equal(event.caseId, "case-1");
  assert.equal(event.contractVersionId, "contract-version-1");
  assert.equal(event.resultingState, "OWNER_ACCEPTED_PROVIDER_PENDING");
  assert.equal(
    event.nextActorCapability,
    "service_provider_natural_person",
  );
  assert.deepEqual(event.evidence, {
    actorId: command.actorId,
    actorCapability: command.actorCapability,
    contractVersionId: command.contractVersionId,
    versionHash: command.versionHash,
    acceptedAt: command.acceptedAt,
    intentStatement: command.intentStatement,
    sessionId: command.sessionId,
  });
  assert.equal(Object.isFrozen(event.evidence), true);
});

test("重複 idempotencyKey 不增加事件，stale expectedAggregateVersion 被拒絕", async () => {
  const { core, aggregate } = await createSubmittedAggregate();
  const command = acceptanceCommand();
  const accepted = core.acceptContractVersion(aggregate, command);
  const duplicate = core.acceptContractVersion(accepted, command);

  assert.strictEqual(duplicate, accepted);
  assert.equal(duplicate.events.length, accepted.events.length);

  assert.throws(
    () =>
      core.acceptContractVersion(accepted, {
        ...command,
        expectedAggregateVersion: 3,
        intentStatement: "以相同 key 送出不同內容。",
      }),
    (error) => error.code === "IDEMPOTENCY_KEY_CONFLICT",
  );

  assert.throws(
    () =>
      core.acceptContractVersion(accepted, {
        ...acceptanceCommand({
          idempotencyKey: "stale-provider-command",
          expectedAggregateVersion: 2,
          actorId: "provider-person-1",
          actorCapability: "service_provider_natural_person",
          sessionId: "session-provider-stale",
        }),
      }),
    (error) => error.code === "STALE_AGGREGATE_VERSION",
  );
});

test("契約事件採 append-only，新命令不覆寫舊 aggregate 與舊事件", async () => {
  const { core, aggregate } = await createSubmittedAggregate();
  const beforeEvents = aggregate.events;
  const beforeFirstEvent = aggregate.events[0];
  const accepted = core.acceptContractVersion(
    aggregate,
    acceptanceCommand(),
  );

  assert.equal(Object.isFrozen(beforeEvents), true);
  assert.equal(Object.isFrozen(beforeFirstEvent), true);
  assert.equal(aggregate.events.length, 2);
  assert.equal(accepted.events.length, 3);
  assert.strictEqual(accepted.events[0], beforeFirstEvent);
  assert.notStrictEqual(accepted.events, beforeEvents);
});

test("案件 membership 只允許 owner 自有、pro 參與、PCM 授權案件", async () => {
  const core = await loadCore();
  const caseRecord = {
    caseId: "case-1",
    ownerActorId: "owner-1",
    proActorIds: ["pro-1"],
    pcmAuthorizedActorIds: ["pcm-reviewer-1"],
  };

  assert.equal(
    core.canAccessCase({
      actorId: "owner-1",
      actorCapability: "case_owner",
      caseRecord,
    }),
    true,
  );
  assert.equal(
    core.canAccessCase({
      actorId: "owner-2",
      actorCapability: "case_owner",
      caseRecord,
    }),
    false,
  );
  assert.equal(
    core.canAccessCase({
      actorId: "pro-1",
      actorCapability: "case_pro",
      caseRecord,
    }),
    true,
  );
  assert.equal(
    core.canAccessCase({
      actorId: "pro-2",
      actorCapability: "case_pro",
      caseRecord,
    }),
    false,
  );
  assert.equal(
    core.canAccessCase({
      actorId: "pcm-reviewer-1",
      actorCapability: "pcm_reviewer",
      caseRecord,
    }),
    true,
  );
  assert.equal(
    core.canAccessCase({
      actorId: "pcm-reviewer-2",
      actorCapability: "pcm_reviewer",
      caseRecord,
    }),
    false,
  );
});

test("核心公開介面不提供金流託管或 AI 最終裁決能力", async () => {
  const core = await loadCore();
  const exportNames = Object.keys(core).join(" ").toLowerCase();

  for (
    const forbiddenName of [
      "payment",
      "escrow",
      "fundrelease",
      "aifinaldecision",
      "legalguarantee",
    ]
  ) {
    assert.equal(exportNames.includes(forbiddenName), false);
  }
});
