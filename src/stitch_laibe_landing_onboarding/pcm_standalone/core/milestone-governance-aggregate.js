import { fail } from "./errors.js";

const OWNER_CAPABILITY = "case_owner";
const VENDOR_CAPABILITY = "case_pro";
const PCM_CAPABILITY = "pcm_reviewer";
const SYSTEM_CAPABILITY = "system";
const SHA_256_PATTERN = /^[a-f0-9]{64}$/;
const CURE_DURATION_MS = 48 * 60 * 60 * 1000;

const LEGACY_REVIEW_OPINIONS = Object.freeze({
  APPROVED: "WRITTEN_CONDITIONS_MET",
  PCM_NOT_SUPPORTED: "UNABLE_TO_DETERMINE",
});
const REVIEW_OPINIONS = new Set([
  "APPROVED",
  "SUPPLEMENT_REQUIRED",
  "PCM_NOT_SUPPORTED",
  "UNABLE_TO_DETERMINE",
  "WRITTEN_CONDITIONS_MET",
  "WRITTEN_CONDITIONS_NOT_MET",
]);
const CURE_CANCELLATION_REASONS = new Set([
  "DOCUMENTS_NOT_READABLE",
  "PLATFORM_UNAVAILABLE",
  "NOTICE_DELIVERY_UNPROVEN",
  "OWNER_VALID_RESPONSE_RECEIVED",
  "BILATERAL_AGREEMENT_PENDING",
]);

export const MILESTONE_GOVERNANCE_EVENT_TYPES = Object.freeze([
  "PCM_MILESTONE_REVIEW_PUBLISHED",
  "OWNER_OBJECTION_SUBMITTED",
  "PCM_OBJECTION_RESPONSE_PUBLISHED",
  "INSPECTION_DEFERRAL_REQUESTED",
  "INSPECTION_DEFERRAL_ACCEPTED",
  "INSPECTION_DEFERRAL_REJECTED",
  "INSPECTION_DEFERRAL_RESUMED",
  "OWNER_VALIDATION_REOPENED",
  "NON_SIGNOFF_CURE_STARTED",
  "NON_SIGNOFF_CURE_CANCELLED",
  "BILATERAL_ACCEPTANCE_AGREEMENT_CONFIRMED",
  "OWNER_OVERRIDE_ACCEPTANCE",
  "PCM_SERVICE_TERMINATED_BY_OWNER",
  "FUTURE_PCM_INVOICES_CANCELLED",
]);

function isRecord(value) {
  return value !== null && typeof value === "object" &&
    !Array.isArray(value);
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

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) {
    return value;
  }

  for (const child of Object.values(value)) {
    deepFreeze(child);
  }

  return Object.freeze(value);
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

function requireText(value, fieldName) {
  if (typeof value !== "string" || value.trim() === "") {
    fail("INVALID_COMMAND", `${fieldName} is required.`);
  }

  return value;
}

function requireTimestamp(value, fieldName) {
  requireText(value, fieldName);
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) {
    fail("INVALID_COMMAND", `${fieldName} must be an ISO timestamp.`);
  }
  return timestamp;
}

function requireSha256(value, fieldName) {
  if (typeof value !== "string" || !SHA_256_PATTERN.test(value)) {
    fail(
      "INVALID_COMMAND",
      `${fieldName} must be a lowercase SHA-256 hex digest.`,
    );
  }
}

function requireDocumentVersions(value) {
  if (!Array.isArray(value) || value.length === 0) {
    fail(
      "INVALID_COMMAND",
      "referencedDocumentVersions must contain at least one version.",
    );
  }

  for (const [index, reference] of value.entries()) {
    if (!isRecord(reference)) {
      fail(
        "INVALID_COMMAND",
        `referencedDocumentVersions[${index}] must be an object.`,
      );
    }
    requireText(
      reference.documentId,
      `referencedDocumentVersions[${index}].documentId`,
    );
    requireText(
      reference.documentVersionId,
      `referencedDocumentVersions[${index}].documentVersionId`,
    );
  }
}

function normalizeReviewOpinion(value) {
  if (!REVIEW_OPINIONS.has(value)) {
    fail("INVALID_COMMAND", "pcmOpinion is invalid.");
  }

  return LEGACY_REVIEW_OPINIONS[value] ?? value;
}

function requireGovernanceActivation(value) {
  if (!isRecord(value)) {
    fail(
      "PCM_GOVERNANCE_ACTIVATION_REQUIRED",
      "Formal PCM governance requires exact contract and procedure assent.",
    );
  }

  const serviceAgreement = value.ownerLaibeServiceAgreement;
  const vendorAssent = value.vendorProcedureAssent;
  if (!isRecord(serviceAgreement) || !isRecord(vendorAssent)) {
    fail(
      "PCM_GOVERNANCE_ACTIVATION_REQUIRED",
      "Formal PCM governance requires exact contract and procedure assent.",
    );
  }

  requireText(
    value.procedureVersionId,
    "governanceActivation.procedureVersionId",
  );
  requireText(
    serviceAgreement.documentId,
    "governanceActivation.ownerLaibeServiceAgreement.documentId",
  );
  requireText(
    serviceAgreement.documentVersionId,
    "governanceActivation.ownerLaibeServiceAgreement.documentVersionId",
  );
  requireText(
    serviceAgreement.procedureVersionId,
    "governanceActivation.ownerLaibeServiceAgreement.procedureVersionId",
  );
  requireTimestamp(
    serviceAgreement.acceptedByOwnerAt,
    "governanceActivation.ownerLaibeServiceAgreement.acceptedByOwnerAt",
  );
  requireTimestamp(
    serviceAgreement.acceptedByLaibeAt,
    "governanceActivation.ownerLaibeServiceAgreement.acceptedByLaibeAt",
  );
  requireText(
    vendorAssent.documentId,
    "governanceActivation.vendorProcedureAssent.documentId",
  );
  requireText(
    vendorAssent.documentVersionId,
    "governanceActivation.vendorProcedureAssent.documentVersionId",
  );
  requireTimestamp(
    vendorAssent.acceptedByVendorAt,
    "governanceActivation.vendorProcedureAssent.acceptedByVendorAt",
  );

  if (
    serviceAgreement.procedureVersionId !== value.procedureVersionId ||
    vendorAssent.documentVersionId !== value.procedureVersionId
  ) {
    fail(
      "PCM_PROCEDURE_VERSION_MISMATCH",
      "Vendor assent must reference the active PCM procedure version.",
    );
  }

  return copyValue(value);
}

function assertCommandEnvelope(aggregate, command) {
  if (!isRecord(command)) {
    fail("INVALID_COMMAND", "Command is required.");
  }

  requireText(command.type, "type");
  requireText(command.caseId, "caseId");
  requireText(command.milestoneId, "milestoneId");
  requireText(command.actorId, "actorId");
  requireText(command.actorCapability, "actorCapability");
  requireText(command.idempotencyKey, "idempotencyKey");
  requireTimestamp(command.occurredAt, "occurredAt");
  requireDocumentVersions(command.referencedDocumentVersions);

  if (
    !Number.isInteger(command.expectedAggregateVersion) ||
    command.expectedAggregateVersion < 0
  ) {
    fail("INVALID_COMMAND", "expectedAggregateVersion is required.");
  }

  if (command.caseId !== aggregate.caseId) {
    fail(
      "COMMAND_CASE_MISMATCH",
      "The command must reference this aggregate case.",
    );
  }

  if (command.milestoneId !== aggregate.milestoneId) {
    fail(
      "COMMAND_MILESTONE_MISMATCH",
      "The command must reference this aggregate milestone.",
    );
  }

  const fingerprint = stableSerialize(command);
  const existing =
    aggregate.processedCommandFingerprints[command.idempotencyKey];

  if (existing !== undefined) {
    if (existing === fingerprint) {
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
      "The milestone changed after this command was prepared.",
    );
  }

  return fingerprint;
}

function assertPcmActor(aggregate, command) {
  if (
    command.actorCapability !== PCM_CAPABILITY ||
    !aggregate.pcmActorIds.includes(command.actorId)
  ) {
    fail(
      "ACTOR_CANNOT_REVIEW_MILESTONE",
      "Only an authorized PCM reviewer may perform this action.",
    );
  }
}

function assertOwnerActor(aggregate, command) {
  if (
    command.actorCapability !== OWNER_CAPABILITY ||
    command.actorId !== aggregate.ownerActorId
  ) {
    fail(
      "ACTOR_IS_NOT_CASE_OWNER",
      "Only the case owner may perform this action.",
    );
  }
}

function assertVendorActor(aggregate, command, errorCode) {
  if (
    command.actorCapability !== VENDOR_CAPABILITY ||
    command.actorId !== aggregate.vendorActorId
  ) {
    fail(
      errorCode,
      "Only the participating vendor may perform this action.",
    );
  }
}

function assertCureCancellationActor(aggregate, command) {
  const isAuthorizedPcm = command.actorCapability === PCM_CAPABILITY &&
    aggregate.pcmActorIds.includes(command.actorId);
  const isAuthorizedSystem = command.actorCapability === SYSTEM_CAPABILITY &&
    aggregate.systemActorIds.includes(command.actorId);

  if (!isAuthorizedPcm && !isAuthorizedSystem) {
    fail(
      "ACTOR_CANNOT_CANCEL_CURE",
      "Only an authorized PCM reviewer or governance system may cancel the cure.",
    );
  }
}

function assertDeferralResumeActor(aggregate, command) {
  const isAuthorizedPcm = command.actorCapability === PCM_CAPABILITY &&
    aggregate.pcmActorIds.includes(command.actorId);
  const isAuthorizedSystem = command.actorCapability === SYSTEM_CAPABILITY &&
    aggregate.systemActorIds.includes(command.actorId);

  if (!isAuthorizedPcm && !isAuthorizedSystem) {
    fail(
      "ACTOR_CANNOT_RESUME_DEFERRAL",
      "Only an authorized PCM reviewer or governance system may resume a deferred inspection.",
    );
  }
}

function assertCureGuardFacts(command, errorCode) {
  if (
    command.documentsReadable !== true ||
    command.platformAvailable !== true ||
    command.ownerHasNoValidResponse !== true
  ) {
    fail(
      errorCode,
      "Documents and platform must be available with no valid owner response.",
    );
  }
}

function requireNoticeDeliveryEvidence(command) {
  const evidence = command.noticeDeliveryEvidence;
  if (
    !isRecord(evidence) ||
    typeof evidence.deliveredAt !== "string" ||
    evidence.deliveredAt.trim() === "" ||
    typeof evidence.channel !== "string" ||
    evidence.channel.trim() === "" ||
    typeof evidence.receiptId !== "string" ||
    evidence.receiptId.trim() === ""
  ) {
    fail(
      "NOTICE_DELIVERY_EVIDENCE_REQUIRED",
      "Provable notice delivery evidence is required.",
    );
  }

  const deliveredAt = Date.parse(evidence.deliveredAt);
  const commandTime = Date.parse(command.occurredAt);
  if (
    !Number.isFinite(deliveredAt) ||
    !Number.isFinite(commandTime) ||
    deliveredAt > commandTime
  ) {
    fail(
      "NOTICE_DELIVERY_EVIDENCE_REQUIRED",
      "Notice must be provably delivered before this command.",
    );
  }

  return copyValue(evidence);
}

function assertFullValidationPeriod(aggregate, startedAt, deadline) {
  const startedAtMs = requireTimestamp(startedAt, "occurredAt");
  const deadlineMs = requireTimestamp(
    deadline,
    "ownerValidationDeadline",
  );
  const expectedDurationMs = aggregate.ownerInspectionDurationHours * 60 * 60 *
    1000;

  if (deadlineMs - startedAtMs !== expectedDurationMs) {
    fail(
      "INVALID_VALIDATION_PERIOD",
      "The owner must receive the configured full validation period.",
    );
  }
}

function createEvent(aggregate, command, aggregateVersion, eventIndex, event) {
  return deepFreeze({
    eventId:
      `${aggregate.caseId}:${aggregate.milestoneId}:${aggregateVersion}:${eventIndex}`,
    caseId: aggregate.caseId,
    milestoneId: aggregate.milestoneId,
    aggregateVersion,
    idempotencyKey: command.idempotencyKey,
    occurredAt: command.occurredAt,
    actorId: command.actorId,
    actorCapability: command.actorCapability,
    referencedDocumentVersions: copyValue(
      command.referencedDocumentVersions,
    ),
    ...copyValue(event),
  });
}

function finishCommand(
  aggregate,
  command,
  fingerprint,
  patch,
  eventPayloads,
) {
  const aggregateVersion = aggregate.aggregateVersion + 1;
  const newEvents = eventPayloads.map((event, index) =>
    createEvent(
      aggregate,
      command,
      aggregateVersion,
      aggregate.events.length + index + 1,
      event,
    )
  );

  return deepFreeze({
    ...aggregate,
    ...copyValue(patch),
    aggregateVersion,
    events: [...aggregate.events, ...newEvents],
    processedIdempotencyKeys: [
      ...aggregate.processedIdempotencyKeys,
      command.idempotencyKey,
    ],
    processedCommandFingerprints: {
      ...aggregate.processedCommandFingerprints,
      [command.idempotencyKey]: fingerprint,
    },
  });
}

function requireState(aggregate, allowedStates, code, message) {
  if (!allowedStates.includes(aggregate.state)) {
    fail(code, message);
  }
}

function cancelActiveCure(aggregate, reason) {
  if (aggregate.activeCure?.status !== "ACTIVE") {
    return { activeCure: aggregate.activeCure, events: [] };
  }

  return {
    activeCure: {
      ...aggregate.activeCure,
      status: "CANCELLED",
      deadline: null,
      cancellationReason: reason,
    },
    events: [{
      type: "NON_SIGNOFF_CURE_CANCELLED",
      cancellationReason: reason,
      resultingState: "OWNER_SELF_INSPECTION",
    }],
  };
}

function publishMilestoneReview(aggregate, command, fingerprint) {
  assertPcmActor(aggregate, command);
  if (aggregate.pcmService.status !== "ACTIVE") {
    fail("PCM_INTERVENTION_ENDED", "PCM may no longer intervene.");
  }
  requireState(
    aggregate,
    ["AWAITING_PCM_REVIEW"],
    "MILESTONE_REVIEW_ALREADY_PUBLISHED",
    "This milestone already has a PCM review.",
  );
  const normalizedOpinion = normalizeReviewOpinion(command.pcmOpinion);
  requireText(command.reviewSummary, "reviewSummary");
  assertFullValidationPeriod(
    aggregate,
    command.occurredAt,
    command.ownerValidationDeadline,
  );

  const pcmReview = {
    opinion: normalizedOpinion,
    legacyOpinion: LEGACY_REVIEW_OPINIONS[command.pcmOpinion]
      ? command.pcmOpinion
      : null,
    scope: "SUBMITTED_DOCUMENTS_ONLY",
    summary: command.reviewSummary,
    publishedAt: command.occurredAt,
    referencedDocumentVersions: copyValue(
      command.referencedDocumentVersions,
    ),
  };
  const ownerValidation = {
    startedAt: command.occurredAt,
    deadline: command.ownerValidationDeadline,
    durationHours: aggregate.ownerInspectionDurationHours,
    status: "OPEN",
  };

  return finishCommand(
    aggregate,
    command,
    fingerprint,
    {
      state: "OWNER_SELF_INSPECTION",
      publicStatus:
        "PCM 已依提交文件提出書面檢討，等待甲方驗證、補充或提出異議。",
      pcmReview,
      ownerValidation,
    },
    [{
      type: command.type,
      pcmOpinion: normalizedOpinion,
      legacyOpinion: LEGACY_REVIEW_OPINIONS[command.pcmOpinion]
        ? command.pcmOpinion
        : null,
      ownerValidationDeadline: command.ownerValidationDeadline,
      resultingState: "OWNER_SELF_INSPECTION",
      nextActorCapability: OWNER_CAPABILITY,
    }],
  );
}

function submitOwnerObjection(aggregate, command, fingerprint) {
  assertOwnerActor(aggregate, command);
  requireState(
    aggregate,
    [
      "OWNER_SELF_INSPECTION",
      "OWNER_REINSPECTION",
      "UNREASONED_NON_SIGNOFF_CURE",
    ],
    "OBJECTION_NOT_AVAILABLE",
    "An objection cannot be submitted in the current state.",
  );
  if (
    !Array.isArray(command.objectionItems) ||
    command.objectionItems.length === 0
  ) {
    fail("INVALID_COMMAND", "objectionItems are required.");
  }

  const objectionIds = new Set();
  const attachedDocumentVersionIds = new Set(
    command.referencedDocumentVersions.map((item) => item.documentVersionId),
  );
  for (const [index, item] of command.objectionItems.entries()) {
    if (!isRecord(item)) {
      fail("INVALID_COMMAND", `objectionItems[${index}] is invalid.`);
    }
    requireText(item.objectionId, `objectionItems[${index}].objectionId`);
    requireText(item.statement, `objectionItems[${index}].statement`);
    if (
      !Array.isArray(item.evidenceDocumentVersionIds) ||
      item.evidenceDocumentVersionIds.length === 0
    ) {
      fail(
        "INVALID_COMMAND",
        `objectionItems[${index}].evidenceDocumentVersionIds is required.`,
      );
    }
    if (
      item.evidenceDocumentVersionIds.some((versionId) =>
        typeof versionId !== "string" ||
        versionId.trim() === "" ||
        !attachedDocumentVersionIds.has(versionId)
      )
    ) {
      fail(
        "OBJECTION_EVIDENCE_REFERENCE_MISMATCH",
        "Every objection evidence version must be attached to the command.",
      );
    }
    if (objectionIds.has(item.objectionId)) {
      fail("INVALID_COMMAND", "objectionId must be unique.");
    }
    objectionIds.add(item.objectionId);
  }

  const cancellation = cancelActiveCure(
    aggregate,
    "OWNER_OBJECTION_SUBMITTED",
  );
  const objectionItems = copyValue(command.objectionItems);

  return finishCommand(
    aggregate,
    command,
    fingerprint,
    {
      state: "PCM_VERIFYING_OBJECTION",
      publicStatus: "甲方已提出異議，PCM 正在逐項檢查與回復。",
      activeCure: cancellation.activeCure,
      activeObjection: {
        status: "PENDING_PCM_RESPONSE",
        submittedAt: command.occurredAt,
        objectionItems,
        responseItems: [],
      },
      ownerValidation: aggregate.ownerValidation
        ? {
          ...aggregate.ownerValidation,
          deadline: cancellation.events.length > 0
            ? null
            : aggregate.ownerValidation.deadline,
          status: "SUSPENDED_BY_OBJECTION",
        }
        : null,
    },
    [
      ...cancellation.events,
      {
        type: command.type,
        objectionItems,
        resultingState: "PCM_VERIFYING_OBJECTION",
        nextActorCapability: PCM_CAPABILITY,
      },
    ],
  );
}

function publishObjectionResponse(aggregate, command, fingerprint) {
  assertPcmActor(aggregate, command);
  requireState(
    aggregate,
    ["PCM_VERIFYING_OBJECTION"],
    "NO_ACTIVE_OBJECTION",
    "There is no owner objection awaiting a PCM response.",
  );
  if (aggregate.activeObjection?.status !== "PENDING_PCM_RESPONSE") {
    fail(
      "NO_ACTIVE_OBJECTION",
      "There is no owner objection awaiting a PCM response.",
    );
  }
  if (!Array.isArray(command.responseItems)) {
    fail("INVALID_COMMAND", "responseItems are required.");
  }

  const expectedIds = new Set(
    aggregate.activeObjection.objectionItems.map((item) => item.objectionId),
  );
  const respondedIds = new Set();
  for (const [index, response] of command.responseItems.entries()) {
    if (!isRecord(response)) {
      fail("INVALID_COMMAND", `responseItems[${index}] is invalid.`);
    }
    requireText(
      response.objectionId,
      `responseItems[${index}].objectionId`,
    );
    requireText(response.response, `responseItems[${index}].response`);
    if (
      !expectedIds.has(response.objectionId) ||
      respondedIds.has(response.objectionId)
    ) {
      fail(
        "OBJECTION_RESPONSE_INCOMPLETE",
        "PCM must respond exactly once to every objection item.",
      );
    }
    respondedIds.add(response.objectionId);
  }
  if (respondedIds.size !== expectedIds.size) {
    fail(
      "OBJECTION_RESPONSE_INCOMPLETE",
      "PCM must respond exactly once to every objection item.",
    );
  }
  const commandDocumentVersionIds = new Set(
    command.referencedDocumentVersions.map((item) => item.documentVersionId),
  );
  for (const [index, response] of command.responseItems.entries()) {
    if (
      !Array.isArray(response.referencedDocumentVersionIds) ||
      response.referencedDocumentVersionIds.length === 0 ||
      response.referencedDocumentVersionIds.some((versionId) =>
        typeof versionId !== "string" ||
        versionId.trim() === "" ||
        !commandDocumentVersionIds.has(versionId)
      )
    ) {
      fail(
        "OBJECTION_RESPONSE_REFERENCE_REQUIRED",
        `responseItems[${index}] must reference an attached document version.`,
      );
    }
  }
  assertFullValidationPeriod(
    aggregate,
    command.occurredAt,
    command.ownerValidationDeadline,
  );

  const responseItems = copyValue(command.responseItems);
  return finishCommand(
    aggregate,
    command,
    fingerprint,
    {
      state: "OWNER_REINSPECTION",
      publicStatus: "PCM 已逐項回復，甲方取得新的完整驗證期間。",
      activeObjection: {
        ...aggregate.activeObjection,
        status: "PCM_RESPONDED",
        respondedAt: command.occurredAt,
        responseItems,
      },
      ownerValidation: {
        startedAt: command.occurredAt,
        deadline: command.ownerValidationDeadline,
        durationHours: aggregate.ownerInspectionDurationHours,
        status: "OPEN",
      },
    },
    [{
      type: command.type,
      responseItems,
      ownerValidationDeadline: command.ownerValidationDeadline,
      resultingState: "OWNER_REINSPECTION",
      nextActorCapability: OWNER_CAPABILITY,
    }],
  );
}

function requestDeferral(aggregate, command, fingerprint) {
  assertOwnerActor(aggregate, command);
  requireState(
    aggregate,
    [
      "OWNER_SELF_INSPECTION",
      "OWNER_REINSPECTION",
      "UNREASONED_NON_SIGNOFF_CURE",
    ],
    "DEFERRAL_NOT_AVAILABLE",
    "A deferral cannot be requested in the current state.",
  );
  requireText(command.reason, "reason");
  const proposedResumeAt = requireTimestamp(
    command.proposedResumeAt,
    "proposedResumeAt",
  );
  if (proposedResumeAt <= Date.parse(command.occurredAt)) {
    fail("INVALID_COMMAND", "proposedResumeAt must be in the future.");
  }

  const cancellation = cancelActiveCure(
    aggregate,
    "INSPECTION_DEFERRAL_REQUESTED",
  );
  const returnStateOnRejection = aggregate.state ===
      "UNREASONED_NON_SIGNOFF_CURE"
    ? "OWNER_SELF_INSPECTION"
    : aggregate.state;

  return finishCommand(
    aggregate,
    command,
    fingerprint,
    {
      state: "DEFERRAL_CONSENT_PENDING",
      publicStatus: "甲方已申請暫緩，等待乙方明確回覆。",
      activeCure: cancellation.activeCure,
      inspectionDeferral: {
        status: "VENDOR_CONSENT_PENDING",
        requestedAt: command.occurredAt,
        proposedResumeAt: command.proposedResumeAt,
        reason: command.reason,
        returnStateOnRejection,
      },
    },
    [
      ...cancellation.events,
      {
        type: command.type,
        proposedResumeAt: command.proposedResumeAt,
        reason: command.reason,
        resultingState: "DEFERRAL_CONSENT_PENDING",
        nextActorCapability: VENDOR_CAPABILITY,
      },
    ],
  );
}

function decideDeferral(aggregate, command, fingerprint, accepted) {
  assertVendorActor(
    aggregate,
    command,
    "ACTOR_CANNOT_DECIDE_DEFERRAL",
  );
  requireState(
    aggregate,
    ["DEFERRAL_CONSENT_PENDING"],
    "NO_PENDING_DEFERRAL",
    "There is no deferral awaiting vendor consent.",
  );
  if (aggregate.inspectionDeferral?.status !== "VENDOR_CONSENT_PENDING") {
    fail(
      "NO_PENDING_DEFERRAL",
      "There is no deferral awaiting vendor consent.",
    );
  }
  if (!accepted) {
    requireText(command.rejectionReason, "rejectionReason");
  }

  const resultingState = accepted
    ? "BILATERALLY_DEFERRED"
    : aggregate.inspectionDeferral.returnStateOnRejection;
  const status = accepted ? "ACCEPTED" : "REJECTED";

  return finishCommand(
    aggregate,
    command,
    fingerprint,
    {
      state: resultingState,
      publicStatus: accepted
        ? "甲乙雙方已同意暫緩驗證。"
        : "乙方未同意暫緩，回到甲方驗證。",
      inspectionDeferral: {
        ...aggregate.inspectionDeferral,
        status,
        decidedAt: command.occurredAt,
        decidedBy: command.actorId,
        rejectionReason: accepted ? null : command.rejectionReason,
      },
      ownerValidation: accepted && aggregate.ownerValidation
        ? {
          ...aggregate.ownerValidation,
          deadline: null,
          status: "BILATERALLY_DEFERRED",
        }
        : aggregate.ownerValidation,
    },
    [{
      type: command.type,
      resultingState,
      nextActorCapability: accepted ? null : OWNER_CAPABILITY,
    }],
  );
}

function resumeDeferral(aggregate, command, fingerprint) {
  assertDeferralResumeActor(aggregate, command);
  requireState(
    aggregate,
    ["BILATERALLY_DEFERRED"],
    "NO_ACCEPTED_DEFERRAL",
    "There is no accepted deferral to resume.",
  );
  if (aggregate.inspectionDeferral?.status !== "ACCEPTED") {
    fail(
      "NO_ACCEPTED_DEFERRAL",
      "There is no accepted deferral to resume.",
    );
  }

  const occurredAt = requireTimestamp(command.occurredAt, "occurredAt");
  const resumeAt = requireTimestamp(
    aggregate.inspectionDeferral.proposedResumeAt,
    "inspectionDeferral.proposedResumeAt",
  );
  if (occurredAt < resumeAt) {
    fail(
      "DEFERRAL_PERIOD_NOT_REACHED",
      "The agreed deferral period has not ended.",
    );
  }
  assertFullValidationPeriod(
    aggregate,
    command.occurredAt,
    command.ownerValidationDeadline,
  );

  const resultingState = aggregate.inspectionDeferral.returnStateOnRejection ===
      "OWNER_REINSPECTION"
    ? "OWNER_REINSPECTION"
    : "OWNER_SELF_INSPECTION";

  return finishCommand(
    aggregate,
    command,
    fingerprint,
    {
      state: resultingState,
      publicStatus: "雙方約定的暫緩期限已到，回到甲方驗證。",
      inspectionDeferral: {
        ...aggregate.inspectionDeferral,
        status: "RESUMED",
        resumedAt: command.occurredAt,
      },
      ownerValidation: aggregate.ownerValidation
        ? {
          ...aggregate.ownerValidation,
          startedAt: command.occurredAt,
          deadline: command.ownerValidationDeadline,
          status: "OPEN_AFTER_DEFERRAL",
        }
        : null,
    },
    [{
      type: command.type,
      agreedResumeAt: aggregate.inspectionDeferral.proposedResumeAt,
      ownerValidationDeadline: command.ownerValidationDeadline,
      resultingState,
      nextActorCapability: OWNER_CAPABILITY,
    }],
  );
}

function startCure(aggregate, command, fingerprint) {
  assertPcmActor(aggregate, command);
  requireState(
    aggregate,
    ["OWNER_SELF_INSPECTION", "OWNER_REINSPECTION"],
    "CURE_NOT_AVAILABLE",
    "The final cure is not available in the current state.",
  );
  if (!aggregate.ownerValidation) {
    fail("CURE_NOT_AVAILABLE", "Owner validation has not started.");
  }
  if (aggregate.pcmReview?.opinion !== "WRITTEN_CONDITIONS_MET") {
    fail(
      "CURE_REQUIRES_WRITTEN_CONDITIONS_MET",
      "The final cure is available only after written conditions are met.",
    );
  }
  assertCureGuardFacts(command, "CURE_GUARD_FAILED");
  const noticeDeliveryEvidence = requireNoticeDeliveryEvidence(command);
  if (
    aggregate.bilateralAcceptanceAgreement &&
    aggregate.bilateralAcceptanceAgreement.status !== "CONFIRMED"
  ) {
    fail(
      "CURE_BLOCKED_BY_PENDING_AGREEMENT",
      "A pending bilateral agreement must be resolved before cure.",
    );
  }
  if (aggregate.bilateralAcceptanceAgreement?.status === "CONFIRMED") {
    fail(
      "CURE_BLOCKED_BY_BILATERAL_AGREEMENT",
      "A confirmed bilateral acceptance agreement is a valid owner response.",
    );
  }
  const now = requireTimestamp(command.occurredAt, "occurredAt");
  const validationDeadline = requireTimestamp(
    aggregate.ownerValidation.deadline,
    "ownerValidation.deadline",
  );
  if (now < validationDeadline) {
    fail(
      "VALIDATION_PERIOD_NOT_EXPIRED",
      "The ordinary owner validation period has not expired.",
    );
  }
  const cureDeadline = requireTimestamp(
    command.cureDeadline,
    "cureDeadline",
  );
  if (cureDeadline - now !== CURE_DURATION_MS) {
    fail(
      "CURE_MUST_BE_48_HOURS",
      "The final non-signoff cure must be exactly 48 hours.",
    );
  }

  return finishCommand(
    aggregate,
    command,
    fingerprint,
    {
      state: "UNREASONED_NON_SIGNOFF_CURE",
      publicStatus:
        "書面條件成立後的甲方驗證期已屆滿，進入最後 48 小時回應通知。",
      activeCure: {
        status: "ACTIVE",
        startedAt: command.occurredAt,
        deadline: command.cureDeadline,
        noticeDeliveryEvidence,
        startGuardFacts: {
          documentsReadable: true,
          platformAvailable: true,
          ownerHasNoValidResponse: true,
        },
      },
    },
    [{
      type: command.type,
      cureDeadline: command.cureDeadline,
      resultingState: "UNREASONED_NON_SIGNOFF_CURE",
      nextActorCapability: OWNER_CAPABILITY,
    }],
  );
}

function cancelCure(aggregate, command, fingerprint) {
  assertCureCancellationActor(aggregate, command);
  requireState(
    aggregate,
    ["UNREASONED_NON_SIGNOFF_CURE"],
    "NO_ACTIVE_CURE",
    "There is no active cure to cancel.",
  );
  if (aggregate.activeCure?.status !== "ACTIVE") {
    fail("NO_ACTIVE_CURE", "There is no active cure to cancel.");
  }
  if (!CURE_CANCELLATION_REASONS.has(command.cancellationReason)) {
    fail(
      "INVALID_CURE_CANCELLATION_REASON",
      "The cure cancellation reason is not supported.",
    );
  }

  return finishCommand(
    aggregate,
    command,
    fingerprint,
    {
      state: "OWNER_SELF_INSPECTION",
      publicStatus: "補正倒數已取消；甲方回到驗證階段，舊倒數不再有效。",
      activeCure: {
        ...aggregate.activeCure,
        status: "CANCELLED",
        deadline: null,
        cancelledAt: command.occurredAt,
        cancellationReason: command.cancellationReason,
      },
      ownerValidation: aggregate.ownerValidation
        ? {
          ...aggregate.ownerValidation,
          deadline: null,
          status: "REOPENED_AFTER_CURE_CANCELLATION",
        }
        : null,
    },
    [{
      type: command.type,
      cancellationReason: command.cancellationReason,
      resultingState: "OWNER_SELF_INSPECTION",
      nextActorCapability: OWNER_CAPABILITY,
    }],
  );
}

function reopenOwnerValidation(aggregate, command, fingerprint) {
  assertDeferralResumeActor(aggregate, command);
  if (aggregate.pcmService.status !== "ACTIVE") {
    fail(
      "PCM_SERVICE_NOT_ACTIVE",
      "Owner validation cannot reopen after PCM service ends.",
    );
  }
  requireState(
    aggregate,
    ["OWNER_SELF_INSPECTION", "OWNER_REINSPECTION"],
    "VALIDATION_REOPEN_NOT_AVAILABLE",
    "Owner validation cannot reopen in the current state.",
  );
  if (
    aggregate.activeCure?.status !== "CANCELLED" ||
    aggregate.ownerValidation?.deadline !== null ||
    aggregate.ownerValidation?.status !==
      "REOPENED_AFTER_CURE_CANCELLATION"
  ) {
    fail(
      "VALIDATION_REOPEN_NOT_AVAILABLE",
      "A cancelled cure must be resolved before validation can reopen.",
    );
  }
  if (
    command.documentsReadable !== true ||
    command.platformAvailable !== true
  ) {
    fail(
      "VALIDATION_REOPEN_GUARD_FAILED",
      "Documents and the case page must be available before validation reopens.",
    );
  }
  requireText(command.reopenReason, "reopenReason");
  assertFullValidationPeriod(
    aggregate,
    command.occurredAt,
    command.ownerValidationDeadline,
  );

  return finishCommand(
    aggregate,
    command,
    fingerprint,
    {
      publicStatus: "文件與案件頁已恢復，甲方取得新的完整驗證期間。",
      ownerValidation: {
        ...aggregate.ownerValidation,
        startedAt: command.occurredAt,
        deadline: command.ownerValidationDeadline,
        status: "OPEN_AFTER_CURE_CANCELLATION",
      },
    },
    [{
      type: command.type,
      reopenReason: command.reopenReason,
      ownerValidationDeadline: command.ownerValidationDeadline,
      resultingState: aggregate.state,
      nextActorCapability: OWNER_CAPABILITY,
    }],
  );
}

function agreementSide(aggregate, command) {
  if (
    command.actorCapability === OWNER_CAPABILITY &&
    command.actorId === aggregate.ownerActorId
  ) {
    return "owner";
  }
  if (
    command.actorCapability === VENDOR_CAPABILITY &&
    command.actorId === aggregate.vendorActorId
  ) {
    return "vendor";
  }
  fail(
    "ACTOR_CANNOT_CONFIRM_AGREEMENT",
    "Only the case owner and participating vendor may confirm.",
  );
}

function confirmBilateralAgreement(aggregate, command, fingerprint) {
  if (aggregate.pcmService.status !== "ACTIVE") {
    fail(
      "PCM_SERVICE_NOT_ACTIVE",
      "A bilateral PCM acceptance agreement requires active PCM service.",
    );
  }
  requireState(
    aggregate,
    [
      "OWNER_SELF_INSPECTION",
      "OWNER_REINSPECTION",
      "UNREASONED_NON_SIGNOFF_CURE",
    ],
    "BILATERAL_AGREEMENT_NOT_AVAILABLE",
    "A bilateral acceptance agreement is not available in this state.",
  );
  if (
    ![
      "SUPPLEMENT_REQUIRED",
      "UNABLE_TO_DETERMINE",
      "WRITTEN_CONDITIONS_NOT_MET",
    ].includes(
      aggregate.pcmReview?.opinion,
    )
  ) {
    fail(
      "OWNER_OVERRIDE_NOT_AVAILABLE",
      "A bilateral agreement is available only when written conditions are not met or cannot be determined.",
    );
  }
  const side = agreementSide(aggregate, command);
  requireText(command.agreementVersionId, "agreementVersionId");
  requireSha256(command.agreementVersionHash, "agreementVersionHash");

  const current = aggregate.bilateralAcceptanceAgreement;
  if (
    current &&
    (
      current.agreementVersionId !== command.agreementVersionId ||
      current.agreementVersionHash !== command.agreementVersionHash
    )
  ) {
    fail(
      "AGREEMENT_VERSION_MISMATCH",
      "Both parties must confirm the exact same agreement version.",
    );
  }
  if (current?.confirmations?.[side]) {
    fail(
      "AGREEMENT_PARTY_ALREADY_CONFIRMED",
      "This party already confirmed the agreement version.",
    );
  }

  const cancellation = side === "owner"
    ? cancelActiveCure(
      aggregate,
      "BILATERAL_ACCEPTANCE_AGREEMENT_CONFIRMED",
    )
    : { activeCure: aggregate.activeCure, events: [] };
  const confirmations = {
    ...(current?.confirmations ?? {}),
    [side]: {
      actorId: command.actorId,
      confirmedAt: command.occurredAt,
    },
  };
  const confirmed = Boolean(confirmations.owner && confirmations.vendor);
  const agreement = {
    agreementVersionId: command.agreementVersionId,
    agreementVersionHash: command.agreementVersionHash,
    status: confirmed
      ? "CONFIRMED"
      : side === "owner"
      ? "OWNER_CONFIRMED_VENDOR_PENDING"
      : "VENDOR_CONFIRMED_OWNER_PENDING",
    confirmations,
  };
  const resultingState = cancellation.events.length > 0
    ? "OWNER_SELF_INSPECTION"
    : aggregate.state;

  return finishCommand(
    aggregate,
    command,
    fingerprint,
    {
      state: resultingState,
      activeCure: cancellation.activeCure,
      bilateralAcceptanceAgreement: agreement,
    },
    [
      ...cancellation.events,
      {
        type: command.type,
        agreementVersionId: command.agreementVersionId,
        agreementVersionHash: command.agreementVersionHash,
        confirmationSide: side,
        agreementStatus: agreement.status,
        resultingState,
      },
    ],
  );
}

function overrideAcceptance(aggregate, command, fingerprint) {
  if (aggregate.pcmService.status !== "ACTIVE") {
    fail(
      "PCM_SERVICE_NOT_ACTIVE",
      "Owner override requires active PCM service.",
    );
  }
  requireState(
    aggregate,
    [
      "OWNER_SELF_INSPECTION",
      "OWNER_REINSPECTION",
      "UNREASONED_NON_SIGNOFF_CURE",
    ],
    "OWNER_OVERRIDE_NOT_AVAILABLE",
    "Owner override is not available in this state.",
  );
  assertOwnerActor(aggregate, command);
  requireText(command.agreementVersionId, "agreementVersionId");
  requireSha256(command.agreementVersionHash, "agreementVersionHash");

  const agreement = aggregate.bilateralAcceptanceAgreement;
  if (!agreement || agreement.status !== "CONFIRMED") {
    fail(
      "BILATERAL_AGREEMENT_NOT_CONFIRMED",
      "Both owner and vendor must confirm the agreement first.",
    );
  }
  if (
    agreement.agreementVersionId !== command.agreementVersionId ||
    agreement.agreementVersionHash !== command.agreementVersionHash
  ) {
    fail(
      "AGREEMENT_VERSION_MISMATCH",
      "Owner acceptance must reference the confirmed agreement version.",
    );
  }
  requireText(command.intentStatement, "intentStatement");

  const cancellation = cancelActiveCure(
    aggregate,
    "OWNER_OVERRIDE_ACCEPTANCE",
  );
  const ownerOverrideAcceptance = {
    acceptedAt: command.occurredAt,
    agreementVersionId: command.agreementVersionId,
    agreementVersionHash: command.agreementVersionHash,
    intentStatement: command.intentStatement,
    pcmOpinionPreserved: true,
    appliesToThisMilestoneOnly: true,
    milestonePcmFeeStatus: "DUE",
    contractorPaymentDue: "NOT_DETERMINED",
  };

  return finishCommand(
    aggregate,
    command,
    fingerprint,
    {
      state: "OWNER_OVERRIDE_ACCEPTED",
      publicStatus:
        "甲方依甲乙雙方協議自行確認本里程碑；PCM 書面審查結果仍為條件不成立，且不代表現場品質判定。",
      activeCure: cancellation.activeCure,
      ownerOverrideAcceptance,
      pcmService: {
        ...aggregate.pcmService,
        status: "ACTIVE",
        futureMilestonesContinue: true,
      },
    },
    [
      ...cancellation.events,
      {
        type: command.type,
        agreementVersionId: command.agreementVersionId,
        pcmOpinion: aggregate.pcmReview.opinion,
        pcmOpinionPreserved: true,
        appliesToThisMilestoneOnly: true,
        milestonePcmFeeStatus: "DUE",
        contractorPaymentDue: "NOT_DETERMINED",
        resultingState: "OWNER_OVERRIDE_ACCEPTED",
      },
    ],
  );
}

function terminatePcmService(aggregate, command, fingerprint) {
  assertPcmActor(aggregate, command);
  requireText(command.terminationReason, "terminationReason");
  requireState(
    aggregate,
    ["UNREASONED_NON_SIGNOFF_CURE"],
    "TERMINATION_NOT_AVAILABLE",
    "PCM service termination requires an active final cure.",
  );
  if (aggregate.activeCure?.status !== "ACTIVE") {
    fail(
      "TERMINATION_NOT_AVAILABLE",
      "PCM service termination requires an active final cure.",
    );
  }
  assertCureGuardFacts(command, "TERMINATION_GUARD_FAILED");
  const noticeDeliveryEvidence = requireNoticeDeliveryEvidence(command);
  if (
    stableSerialize(noticeDeliveryEvidence) !==
      stableSerialize(aggregate.activeCure.noticeDeliveryEvidence)
  ) {
    fail(
      "NOTICE_DELIVERY_EVIDENCE_MISMATCH",
      "Termination must recheck the same notice delivery evidence.",
    );
  }
  const occurredAt = requireTimestamp(command.occurredAt, "occurredAt");
  const deadline = requireTimestamp(
    aggregate.activeCure.deadline,
    "activeCure.deadline",
  );
  if (occurredAt < deadline) {
    fail(
      "CURE_PERIOD_NOT_EXPIRED",
      "The final 48-hour cure has not expired.",
    );
  }

  return finishCommand(
    aggregate,
    command,
    fingerprint,
    {
      state: "PCM_SERVICE_TERMINATED_BY_OWNER",
      publicStatus:
        "PCM 服務已終止，書面治理條件失效；甲乙雙方仍可讀取與下載既有案件紀錄。",
      writtenGovernanceStatus: "WRITTEN_GOVERNANCE_INVALID",
      activeCure: {
        ...aggregate.activeCure,
        status: "EXPIRED_WITHOUT_OWNER_RESPONSE",
      },
      pcmService: {
        status: "TERMINATED_BY_OWNER",
        futureMilestonesContinue: false,
        canCreateIntervention: false,
      },
      billing: {
        futurePcmInvoices: "CANCELLED",
        paidSigningFeeRate: 0.1,
        paidSigningFeeDisposition:
          "OFFSET_SERVICES_ALREADY_PERFORMED_NO_REFUND_NO_EXTRA_BILLING",
      },
      accessPolicy: {
        owner: {
          canRead: true,
          canDownload: true,
          canExport: true,
          canRecordDirectAgreement: true,
        },
        vendor: {
          canRead: true,
          canDownload: true,
          canExport: true,
          canRecordDirectAgreement: true,
        },
        pcm: {
          canReadHistory: true,
          canCreateIntervention: false,
        },
      },
    },
    [
      {
        type: command.type,
        terminationReason: command.terminationReason,
        resultingState: "PCM_SERVICE_TERMINATED_BY_OWNER",
      },
      {
        type: "FUTURE_PCM_INVOICES_CANCELLED",
        paidSigningFeeRate: 0.1,
        paidSigningFeeDisposition:
          "OFFSET_SERVICES_ALREADY_PERFORMED_NO_REFUND_NO_EXTRA_BILLING",
        resultingState: "PCM_SERVICE_TERMINATED_BY_OWNER",
      },
    ],
  );
}

export function createMilestoneGovernanceAggregate({
  caseId,
  milestoneId,
  ownerActorId,
  vendorActorId,
  pcmActorIds,
  systemActorIds = [],
  ownerInspectionDurationHours,
  governanceActivation,
} = {}) {
  requireText(caseId, "caseId");
  requireText(milestoneId, "milestoneId");
  requireText(ownerActorId, "ownerActorId");
  requireText(vendorActorId, "vendorActorId");
  if (
    !Array.isArray(pcmActorIds) ||
    pcmActorIds.length === 0 ||
    pcmActorIds.some((actorId) =>
      typeof actorId !== "string" || actorId.trim() === ""
    )
  ) {
    fail("INVALID_COMMAND", "pcmActorIds are required.");
  }
  if (
    !Array.isArray(systemActorIds) ||
    systemActorIds.some((actorId) =>
      typeof actorId !== "string" || actorId.trim() === ""
    )
  ) {
    fail("INVALID_COMMAND", "systemActorIds must contain actor identities.");
  }
  if (
    !Number.isInteger(ownerInspectionDurationHours) ||
    ownerInspectionDurationHours <= 0
  ) {
    fail(
      "INVALID_COMMAND",
      "ownerInspectionDurationHours must be a positive integer.",
    );
  }
  const verifiedGovernanceActivation = requireGovernanceActivation(
    governanceActivation,
  );

  return deepFreeze({
    caseId,
    milestoneId,
    ownerActorId,
    vendorActorId,
    pcmActorIds: [...pcmActorIds],
    systemActorIds: [...systemActorIds],
    ownerInspectionDurationHours,
    governanceActivation: verifiedGovernanceActivation,
    aggregateVersion: 0,
    state: "AWAITING_PCM_REVIEW",
    publicStatus: "三方書面治理已啟用，等待 PCM 依提交文件提出檢討意見。",
    writtenGovernanceStatus: "ACTIVE",
    paymentAuthorization: false,
    contractorPaymentDue: "NOT_DETERMINED",
    pcmReview: null,
    ownerValidation: null,
    activeObjection: null,
    inspectionDeferral: null,
    activeCure: null,
    bilateralAcceptanceAgreement: null,
    ownerOverrideAcceptance: null,
    pcmService: {
      status: "ACTIVE",
      futureMilestonesContinue: true,
      canCreateIntervention: true,
    },
    billing: {
      futurePcmInvoices: "SCHEDULED_BY_MILESTONE",
      paidSigningFeeRate: 0.1,
      paidSigningFeeDisposition: "AVAILABLE_FOR_SERVICE_OFFSET",
    },
    accessPolicy: {
      owner: {
        canRead: true,
        canDownload: true,
        canExport: true,
        canRecordDirectAgreement: true,
      },
      vendor: {
        canRead: true,
        canDownload: true,
        canExport: true,
        canRecordDirectAgreement: true,
      },
      pcm: {
        canReadHistory: true,
        canCreateIntervention: true,
      },
    },
    events: [],
    processedIdempotencyKeys: [],
    processedCommandFingerprints: {},
  });
}

export function applyMilestoneGovernanceCommand(aggregate, command) {
  if (!isRecord(aggregate)) {
    fail("INVALID_COMMAND", "Milestone aggregate is required.");
  }
  const fingerprint = assertCommandEnvelope(aggregate, command);
  if (fingerprint === null) {
    return aggregate;
  }

  if (
    aggregate.pcmService.status !== "ACTIVE" &&
    command.actorCapability === PCM_CAPABILITY
  ) {
    fail("PCM_INTERVENTION_ENDED", "PCM may no longer intervene.");
  }

  switch (command.type) {
    case "PCM_MILESTONE_REVIEW_PUBLISHED":
      return publishMilestoneReview(aggregate, command, fingerprint);
    case "OWNER_OBJECTION_SUBMITTED":
      return submitOwnerObjection(aggregate, command, fingerprint);
    case "PCM_OBJECTION_RESPONSE_PUBLISHED":
      return publishObjectionResponse(aggregate, command, fingerprint);
    case "INSPECTION_DEFERRAL_REQUESTED":
      return requestDeferral(aggregate, command, fingerprint);
    case "INSPECTION_DEFERRAL_ACCEPTED":
      return decideDeferral(aggregate, command, fingerprint, true);
    case "INSPECTION_DEFERRAL_REJECTED":
      return decideDeferral(aggregate, command, fingerprint, false);
    case "INSPECTION_DEFERRAL_RESUMED":
      return resumeDeferral(aggregate, command, fingerprint);
    case "OWNER_VALIDATION_REOPENED":
      return reopenOwnerValidation(aggregate, command, fingerprint);
    case "NON_SIGNOFF_CURE_STARTED":
      return startCure(aggregate, command, fingerprint);
    case "NON_SIGNOFF_CURE_CANCELLED":
      return cancelCure(aggregate, command, fingerprint);
    case "BILATERAL_ACCEPTANCE_AGREEMENT_CONFIRMED":
      return confirmBilateralAgreement(aggregate, command, fingerprint);
    case "OWNER_OVERRIDE_ACCEPTANCE":
      return overrideAcceptance(aggregate, command, fingerprint);
    case "PCM_SERVICE_TERMINATED_BY_OWNER":
      return terminatePcmService(aggregate, command, fingerprint);
    default:
      fail(
        "UNSUPPORTED_MILESTONE_COMMAND",
        "This milestone governance command is not supported.",
      );
  }
}
