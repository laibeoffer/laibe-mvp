import { fail } from "./errors.js";

const NATURAL_PERSON = "natural_person";
const CASE_OWNER = "case_owner";
const SERVICE_PROVIDER = "service_provider_natural_person";
const SHA_256_PATTERN = /^[a-f0-9]{64}$/;

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function copyValue(value) {
  if (Array.isArray(value)) {
    return value.map(copyValue);
  }

  if (isRecord(value)) {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [key, copyValue(entry)]),
    );
  }

  return value;
}

function stableSerialize(value) {
  if (value === undefined) {
    return '"__undefined__"';
  }

  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map(stableSerialize).join(",")}]`;
  }

  return `{${
    Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableSerialize(value[key])}`)
      .join(",")
  }}`;
}

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) {
    return value;
  }

  for (const child of Object.values(value)) {
    deepFreeze(child);
  }

  return Object.freeze(value);
}

function requireText(value, fieldName) {
  if (typeof value !== "string" || value.trim() === "") {
    fail("INVALID_COMMAND", `${fieldName} is required.`);
  }

  return value;
}

function requireVersionHash(versionHash) {
  if (
    typeof versionHash !== "string" ||
    !SHA_256_PATTERN.test(versionHash)
  ) {
    fail(
      "INVALID_CONTRACT_VERSION_HASH",
      "versionHash must be a lowercase SHA-256 hex digest.",
    );
  }
}

function assertCommandEnvelope(aggregate, command) {
  if (!isRecord(command)) {
    fail("INVALID_COMMAND", "Command is required.");
  }

  requireText(command.idempotencyKey, "idempotencyKey");

  const commandFingerprint = stableSerialize(command);
  const hasExistingCommand = Object.prototype.hasOwnProperty.call(
    aggregate.processedCommandFingerprints,
    command.idempotencyKey,
  );

  if (hasExistingCommand) {
    if (
      aggregate.processedCommandFingerprints[command.idempotencyKey] ===
        commandFingerprint
    ) {
      return null;
    }

    fail(
      "IDEMPOTENCY_KEY_CONFLICT",
      "This idempotency key was already used for a different command.",
    );
  }

  if (command.expectedAggregateVersion !== aggregate.aggregateVersion) {
    fail(
      "STALE_AGGREGATE_VERSION",
      "The contract changed after this command was prepared.",
    );
  }

  return commandFingerprint;
}

function assertNaturalPersonProvider(snapshot) {
  if (!isRecord(snapshot) || snapshot.partyType !== NATURAL_PERSON) {
    fail(
      "SERVICE_PROVIDER_MUST_BE_NATURAL_PERSON",
      "The MVP service provider must be recorded as a natural person.",
    );
  }

  requireText(snapshot.partyId, "serviceProviderPartySnapshot.partyId");
  requireText(
    snapshot.signatoryActorId,
    "serviceProviderPartySnapshot.signatoryActorId",
  );
}

function createFrozenVersion(command, versionNumber) {
  requireText(command.contractVersionId, "contractVersionId");
  requireText(command.ownerPartyId, "ownerPartyId");
  requireText(command.actorId, "actorId");
  requireText(command.actorCapability, "actorCapability");
  requireText(command.createdAt, "createdAt");
  requireVersionHash(command.versionHash);
  assertNaturalPersonProvider(command.serviceProviderPartySnapshot);

  if (!isRecord(command.contentSnapshot)) {
    fail("INVALID_COMMAND", "contentSnapshot is required.");
  }

  return deepFreeze({
    contractVersionId: command.contractVersionId,
    versionNumber,
    versionHash: command.versionHash,
    predecessorContractVersionId: command.predecessorContractVersionId ?? null,
    contentSnapshot: copyValue(command.contentSnapshot),
    ownerPartyId: command.ownerPartyId,
    serviceProviderPartySnapshot: copyValue(
      command.serviceProviderPartySnapshot,
    ),
    createdAt: command.createdAt,
    createdBy: {
      actorId: command.actorId,
      actorCapability: command.actorCapability,
    },
  });
}

function appendEvent(aggregate, command, commandFingerprint, event) {
  const aggregateVersion = aggregate.aggregateVersion + 1;
  const frozenEvent = deepFreeze({
    eventId: `${aggregate.contractId}:${aggregateVersion}`,
    contractId: aggregate.contractId,
    caseId: aggregate.caseId,
    aggregateVersion,
    idempotencyKey: command.idempotencyKey,
    contractVersionId: command.contractVersionId,
    resultingState: event.resultingState,
    nextActorCapability: event.nextActorCapability ?? null,
    ...event,
  });

  return {
    aggregateVersion,
    events: deepFreeze([...aggregate.events, frozenEvent]),
    processedIdempotencyKeys: deepFreeze([
      ...aggregate.processedIdempotencyKeys,
      command.idempotencyKey,
    ]),
    processedCommandFingerprints: deepFreeze({
      ...aggregate.processedCommandFingerprints,
      [command.idempotencyKey]: commandFingerprint,
    }),
  };
}

function freezeAggregate(aggregate) {
  return deepFreeze(aggregate);
}

function getVersion(aggregate, contractVersionId) {
  return aggregate.contractVersions.find(
    (version) => version.contractVersionId === contractVersionId,
  );
}

function assertUniqueVersionId(aggregate, contractVersionId) {
  if (getVersion(aggregate, contractVersionId)) {
    fail(
      "CONTRACT_VERSION_ALREADY_EXISTS",
      "A contract version with this identity already exists.",
    );
  }
}

export function createContractAggregate({ contractId, caseId } = {}) {
  requireText(contractId, "contractId");
  requireText(caseId, "caseId");

  return freezeAggregate({
    contractId,
    caseId,
    aggregateVersion: 0,
    state: "NO_CONTRACT",
    currentContractVersionId: null,
    contractVersions: [],
    lifecycleByVersionId: {},
    acceptancesByVersionId: {},
    processedIdempotencyKeys: [],
    processedCommandFingerprints: {},
    events: [],
  });
}

export function createContractVersion(aggregate, command) {
  const commandFingerprint = assertCommandEnvelope(aggregate, command);
  if (commandFingerprint === null) {
    return aggregate;
  }

  if (aggregate.contractVersions.length !== 0) {
    fail(
      "CONTRACT_VERSION_SUCCESSOR_REQUIRED",
      "Use revision to create a successor contract version.",
    );
  }

  assertUniqueVersionId(aggregate, command.contractVersionId);
  const version = createFrozenVersion(command, 1);
  const appended = appendEvent(aggregate, command, commandFingerprint, {
    type: "CONTRACT_VERSION_CREATED",
    occurredAt: command.createdAt,
    actorId: command.actorId,
    actorCapability: command.actorCapability,
    contractVersionId: version.contractVersionId,
    versionHash: version.versionHash,
    resultingState: "DRAFT",
    nextActorCapability: SERVICE_PROVIDER,
  });

  return freezeAggregate({
    ...aggregate,
    ...appended,
    state: "DRAFT",
    currentContractVersionId: version.contractVersionId,
    contractVersions: deepFreeze([version]),
    lifecycleByVersionId: deepFreeze({
      [version.contractVersionId]: "DRAFT",
    }),
    acceptancesByVersionId: deepFreeze({
      [version.contractVersionId]: {},
    }),
  });
}

export function reviseContractVersion(aggregate, command) {
  const commandFingerprint = assertCommandEnvelope(aggregate, command);
  if (commandFingerprint === null) {
    return aggregate;
  }

  if (!aggregate.currentContractVersionId) {
    fail(
      "CONTRACT_VERSION_NOT_FOUND",
      "Create the first contract version before revising it.",
    );
  }

  if (
    command.predecessorContractVersionId !==
      aggregate.currentContractVersionId
  ) {
    fail(
      "CONTRACT_PREDECESSOR_MISMATCH",
      "The revision must succeed the current contract version.",
    );
  }

  assertUniqueVersionId(aggregate, command.contractVersionId);
  const version = createFrozenVersion(
    command,
    aggregate.contractVersions.length + 1,
  );
  const appended = appendEvent(aggregate, command, commandFingerprint, {
    type: "CONTRACT_VERSION_REVISED",
    occurredAt: command.createdAt,
    actorId: command.actorId,
    actorCapability: command.actorCapability,
    contractVersionId: version.contractVersionId,
    predecessorContractVersionId: command.predecessorContractVersionId,
    versionHash: version.versionHash,
    resultingState: "DRAFT",
    nextActorCapability: SERVICE_PROVIDER,
  });

  return freezeAggregate({
    ...aggregate,
    ...appended,
    state: "DRAFT",
    currentContractVersionId: version.contractVersionId,
    contractVersions: deepFreeze([...aggregate.contractVersions, version]),
    lifecycleByVersionId: deepFreeze({
      ...aggregate.lifecycleByVersionId,
      [command.predecessorContractVersionId]: "SUPERSEDED",
      [version.contractVersionId]: "DRAFT",
    }),
    acceptancesByVersionId: deepFreeze({
      ...aggregate.acceptancesByVersionId,
      [version.contractVersionId]: {},
    }),
  });
}

export function submitContractVersionForAcceptance(aggregate, command) {
  const commandFingerprint = assertCommandEnvelope(aggregate, command);
  if (commandFingerprint === null) {
    return aggregate;
  }

  requireText(command.actorId, "actorId");
  requireText(command.actorCapability, "actorCapability");
  requireText(command.contractVersionId, "contractVersionId");
  requireText(command.submittedAt, "submittedAt");

  const version = getVersion(aggregate, command.contractVersionId);
  if (!version) {
    fail(
      "CONTRACT_VERSION_NOT_FOUND",
      "The requested contract version does not exist.",
    );
  }

  if (command.contractVersionId !== aggregate.currentContractVersionId) {
    fail(
      "CONTRACT_VERSION_NOT_CURRENT",
      "Only the current contract version can be submitted.",
    );
  }

  if (
    command.actorCapability !== SERVICE_PROVIDER ||
    command.actorId !==
      version.serviceProviderPartySnapshot.signatoryActorId
  ) {
    fail(
      "ACTOR_CANNOT_SUBMIT_CONTRACT",
      "Only the natural-person service provider can submit this version.",
    );
  }

  if (
    aggregate.lifecycleByVersionId[command.contractVersionId] !== "DRAFT"
  ) {
    fail(
      "CONTRACT_VERSION_NOT_DRAFT",
      "Only a draft contract version can be submitted for acceptance.",
    );
  }

  const resultingState = "OWNER_ACCEPTANCE_PENDING";
  const appended = appendEvent(
    aggregate,
    command,
    commandFingerprint,
    {
      type: "CONTRACT_VERSION_SUBMITTED_FOR_ACCEPTANCE",
      occurredAt: command.submittedAt,
      actorId: command.actorId,
      actorCapability: command.actorCapability,
      versionHash: version.versionHash,
      resultingState,
      nextActorCapability: CASE_OWNER,
    },
  );

  return freezeAggregate({
    ...aggregate,
    ...appended,
    state: resultingState,
    lifecycleByVersionId: deepFreeze({
      ...aggregate.lifecycleByVersionId,
      [command.contractVersionId]: resultingState,
    }),
  });
}

function resolveAcceptanceSide(version, command) {
  if (
    command.actorCapability === CASE_OWNER &&
    command.actorId === version.ownerPartyId
  ) {
    return "owner";
  }

  if (
    command.actorCapability === SERVICE_PROVIDER &&
    command.actorId ===
      version.serviceProviderPartySnapshot.signatoryActorId
  ) {
    return "serviceProvider";
  }

  fail(
    "ACTOR_CANNOT_ACCEPT_CONTRACT",
    "This actor cannot accept the contract for either signing party.",
  );
}

function lifecycleAfterAcceptance(acceptances) {
  if (acceptances.owner && acceptances.serviceProvider) {
    return "ACTIVE";
  }

  if (acceptances.owner) {
    return "OWNER_ACCEPTED_PROVIDER_PENDING";
  }

  return "PROVIDER_ACCEPTED_OWNER_PENDING";
}

export function acceptContractVersion(aggregate, command) {
  const commandFingerprint = assertCommandEnvelope(aggregate, command);
  if (commandFingerprint === null) {
    return aggregate;
  }

  requireText(command.actorId, "actorId");
  requireText(command.actorCapability, "actorCapability");
  requireText(command.contractVersionId, "contractVersionId");
  requireText(command.acceptedAt, "acceptedAt");
  requireText(command.intentStatement, "intentStatement");
  requireText(command.sessionId, "sessionId");
  requireVersionHash(command.versionHash);

  const version = getVersion(aggregate, command.contractVersionId);
  if (!version) {
    fail(
      "CONTRACT_VERSION_NOT_FOUND",
      "The requested contract version does not exist.",
    );
  }

  if (command.contractVersionId !== aggregate.currentContractVersionId) {
    fail(
      "CONTRACT_VERSION_NOT_CURRENT",
      "Only the current contract version can be accepted.",
    );
  }

  if (command.versionHash !== version.versionHash) {
    fail(
      "CONTRACT_VERSION_HASH_MISMATCH",
      "Acceptance must reference the exact contract version hash.",
    );
  }

  const side = resolveAcceptanceSide(version, command);
  const currentLifecycle =
    aggregate.lifecycleByVersionId[command.contractVersionId];
  const existingAcceptances =
    aggregate.acceptancesByVersionId[command.contractVersionId] ?? {};

  if (currentLifecycle === "DRAFT") {
    fail(
      "CONTRACT_VERSION_NOT_SUBMITTED",
      "Submit the draft contract version before either party accepts it.",
    );
  }

  if (existingAcceptances[side]) {
    fail(
      "CONTRACT_PARTY_ALREADY_ACCEPTED",
      "This signing party has already accepted this contract version.",
    );
  }

  if (
    side === "owner" &&
    currentLifecycle !== "OWNER_ACCEPTANCE_PENDING"
  ) {
    fail(
      "CONTRACT_ACCEPTANCE_OUT_OF_SEQUENCE",
      "The owner cannot accept at the current contract state.",
    );
  }

  if (
    side === "serviceProvider" &&
    currentLifecycle !== "OWNER_ACCEPTED_PROVIDER_PENDING"
  ) {
    fail(
      "OWNER_ACCEPTANCE_REQUIRED",
      "The service provider can accept only after the owner.",
    );
  }

  const evidence = deepFreeze({
    actorId: command.actorId,
    actorCapability: command.actorCapability,
    contractVersionId: command.contractVersionId,
    versionHash: command.versionHash,
    acceptedAt: command.acceptedAt,
    intentStatement: command.intentStatement,
    sessionId: command.sessionId,
  });
  const versionAcceptances = deepFreeze({
    ...existingAcceptances,
    [side]: evidence,
  });
  const lifecycle = lifecycleAfterAcceptance(versionAcceptances);
  const appended = appendEvent(
    aggregate,
    command,
    commandFingerprint,
    {
      type: "CONTRACT_VERSION_ACCEPTED",
      occurredAt: command.acceptedAt,
      evidence,
      resultingState: lifecycle,
      nextActorCapability: lifecycle === "ACTIVE" ? null : SERVICE_PROVIDER,
    },
  );

  return freezeAggregate({
    ...aggregate,
    ...appended,
    state: lifecycle,
    lifecycleByVersionId: deepFreeze({
      ...aggregate.lifecycleByVersionId,
      [command.contractVersionId]: lifecycle,
    }),
    acceptancesByVersionId: deepFreeze({
      ...aggregate.acceptancesByVersionId,
      [command.contractVersionId]: versionAcceptances,
    }),
  });
}
