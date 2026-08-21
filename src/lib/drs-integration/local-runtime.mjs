import { createHash } from "node:crypto";

const reviewStatuses = new Set([
  "REVIEW_COMPLETED_NO_FLAG",
  "REVIEW_COMPLETED_ATTENTION",
  "REVIEW_SERVICE_UNAVAILABLE",
]);

const findingPolicies = new Map([
  ["DOCUMENT_VERSION_MISSING", {
    severity: "ATTENTION",
    recommendation: "請確認文件版本。",
  }],
  ["DOCUMENT_BASIS_UNCLEAR", {
    severity: "ATTENTION",
    recommendation: "請補充本次回覆所依據的案件文件。",
  }],
  ["RECIPIENT_AMBIGUOUS", {
    severity: "ATTENTION",
    recommendation: "請確認本次回覆的正式收件群組。",
  }],
  ["DATE_OR_NUMBER_UNCLEAR", {
    severity: "ATTENTION",
    recommendation: "請確認日期與數值依據。",
  }],
]);

function sha256(value) {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function clone(value) {
  return structuredClone(value);
}

function parseStrictTimestamp(value) {
  return isValidTimestamp(value) ? Date.parse(value) : NaN;
}

function inInterval(at, from, until) {
  const time = parseStrictTimestamp(at);
  const start = parseStrictTimestamp(from);
  const hasOpenEnd = until === null || until === undefined;
  const end = hasOpenEnd ? Number.POSITIVE_INFINITY : parseStrictTimestamp(until);
  return Number.isFinite(time) && Number.isFinite(start) && (hasOpenEnd || Number.isFinite(end)) && start <= time && time < end;
}

function requireText(value, code) {
  if (typeof value !== "string" || value.trim() === "") throw new Error(code);
  return value;
}

function transportSnapshotHash(lineGroupId, body, attachments) {
  return sha256(JSON.stringify({
    lineGroupId,
    body,
    attachments: attachments.map(({ attachmentId, sha256: attachmentSha256 }) => ({
      attachmentId,
      sha256: attachmentSha256,
    })),
  }));
}

function sanitizeAdvisory(advisory) {
  if (!reviewStatuses.has(advisory?.status)) throw new Error("AI_REVIEW_STATUS_INVALID");
  const findings = advisory.findings ?? [];
  if (!Array.isArray(findings) || findings.length > 50) throw new Error("AI_REVIEW_FINDINGS_INVALID");
  for (let index = 0; index < findings.length; index += 1) {
    if (!Object.hasOwn(findings, index)) throw new Error("AI_REVIEW_FINDINGS_INVALID");
  }
  const proposedText = typeof advisory.proposedText === "string" ? advisory.proposedText : "";
  return {
    status: advisory.status,
    modelId: typeof advisory.modelId === "string" && advisory.modelId.trim() !== ""
      ? advisory.modelId
      : "unknown",
    proposedTextSha256: sha256(proposedText),
    findings: findings.map((finding) => {
      const code = requireText(finding?.code, "AI_REVIEW_FINDING_CODE_REQUIRED");
      const policy = findingPolicies.get(code);
      if (!policy || finding?.severity !== policy.severity) throw new Error("AI_REVIEW_FINDING_NOT_ALLOWED");
      const evidenceRef = requireText(
        finding?.evidenceRef ?? finding?.evidence_ref,
        "AI_REVIEW_FINDING_EVIDENCE_REQUIRED",
      );
      if (!/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(evidenceRef)) {
        throw new Error("AI_REVIEW_FINDING_EVIDENCE_INVALID");
      }
      return {
        code,
        severity: policy.severity,
        evidenceRef,
        recommendation: policy.recommendation,
      };
    }),
  };
}

function isValidTimestamp(value) {
  if (typeof value !== "string") return false;
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,3}))?Z$/.exec(value);
  if (!match) return false;
  const [, year, month, day, hour, minute, second, fraction = "0"] = match;
  const parts = [year, month, day, hour, minute, second].map(Number);
  const milliseconds = Number(fraction.padEnd(3, "0"));
  const instant = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2], parts[3], parts[4], parts[5], milliseconds));
  return Number.isFinite(instant.getTime()) &&
    instant.getUTCFullYear() === parts[0] &&
    instant.getUTCMonth() === parts[1] - 1 &&
    instant.getUTCDate() === parts[2] &&
    instant.getUTCHours() === parts[3] &&
    instant.getUTCMinutes() === parts[4] &&
    instant.getUTCSeconds() === parts[5] &&
    instant.getUTCMilliseconds() === milliseconds;
}

function normalizeAttachments(value) {
  if (!Array.isArray(value) || value.length > 50) throw new Error("FINAL_ATTACHMENT_INVALID");
  for (let index = 0; index < value.length; index += 1) {
    if (!Object.hasOwn(value, index)) throw new Error("FINAL_ATTACHMENT_INVALID");
  }
  return value.map((attachment) => {
    if (
      typeof attachment?.attachmentId !== "string" ||
      attachment.attachmentId.trim() === "" ||
      typeof attachment.sha256 !== "string" ||
      !/^[a-f0-9]{64}$/i.test(attachment.sha256)
    ) {
      throw new Error("FINAL_ATTACHMENT_INVALID");
    }
    return {
      attachmentId: attachment.attachmentId,
      sha256: attachment.sha256.toLowerCase(),
    };
  });
}

function decisionFingerprint(input) {
  return sha256(JSON.stringify({
    reviewId: input.reviewId,
    decisionType: input.decisionType,
    reason: input.reason ?? null,
    urgency: input.urgency ?? null,
    serviceIncidentId: input.serviceIncidentId ?? null,
    finalBody: input.finalBody ?? null,
    finalAttachments: input.finalAttachments ?? [],
  }));
}

function snapshotTransportAcceptance(transport) {
  if (!transport || typeof transport !== "object") return { status: "UNKNOWN" };
  const status = transport.status;
  const transportMessageId = transport.transportMessageId;
  const acceptedAt = transport.acceptedAt;
  const lineGroupId = transport.lineGroupId;
  const transportPayloadSha256 = transport.transportPayloadSha256;
  return { status, transportMessageId, acceptedAt, lineGroupId, transportPayloadSha256 };
}

export function createLocalDrsRuntime({
  now,
  nextId,
  verifySession,
  advisoryReview,
  sendLine,
  initialState,
}) {
  const state = {
    cases: clone(initialState?.cases ?? []),
    specialistBindings: clone(initialState?.specialistBindings ?? []),
    assignments: clone(initialState?.assignments ?? []),
    groupLinks: clone(initialState?.groupLinks ?? []),
    auditEvents: clone(initialState?.auditEvents ?? []),
    reviews: [],
    finalizations: new Map(),
    pendingFinalizations: new Map(),
  };

  function appendEvent({ caseId, eventType, actor, payload }) {
    const caseEvents = state.auditEvents.filter((event) => event.case_id === caseId);
    const previous = caseEvents.at(-1) ?? null;
    const event = {
      event_id: nextId(),
      case_id: caseId,
      previous_event_id: previous?.event_id ?? null,
      event_type: eventType,
      occurred_at: now(),
      actor,
      payload: clone(payload),
    };
    state.auditEvents.push(event);
    return event;
  }

  async function requireAssignedSpecialist({ sessionToken, caseId, assignmentId, groupLinkId }) {
    const session = await verifySession(sessionToken);
    if (!session?.authSubject) throw new Error("AUTHENTICATED_SESSION_REQUIRED");

    const binding = state.specialistBindings.find((candidate) => candidate.authSubject === session.authSubject);
    if (!binding) throw new Error("SPECIALIST_IDENTITY_MISMATCH");

    const at = now();
    const assignment = state.assignments.find((candidate) =>
      candidate.assignmentId === assignmentId &&
      candidate.caseId === caseId &&
      candidate.specialistId === binding.specialistId &&
      candidate.status === "ACTIVE" &&
      inInterval(at, candidate.validFrom, candidate.validUntil)
    );
    if (!assignment) throw new Error("SPECIALIST_ASSIGNMENT_NOT_ACTIVE");

    const groupLink = state.groupLinks.find((candidate) =>
      candidate.groupLinkId === groupLinkId &&
      candidate.caseId === caseId &&
      candidate.groupKind === "DRS_CASE_GROUP" &&
      inInterval(at, candidate.validFrom, candidate.validUntil)
    );
    if (!groupLink) throw new Error("FORMAL_GROUP_LINK_NOT_ACTIVE");

    return { binding, assignment, groupLink };
  }

  async function submitForAdvisoryReview(input) {
    const authority = await requireAssignedSpecialist(input);
    const sourceEvent = state.auditEvents.find((event) => event.event_id === input.sourceEventId);
    if (!sourceEvent || sourceEvent.case_id !== input.caseId || sourceEvent.event_type !== "LINE_SENT_EVENT") {
      throw new Error("REVIEW_SOURCE_EVENT_INVALID");
    }
    if (
      sourceEvent.payload?.formal_link_id !== authority.groupLink.groupLinkId ||
      sourceEvent.payload?.line_group_id !== authority.groupLink.lineGroupId
    ) {
      throw new Error("REVIEW_SOURCE_GROUP_MISMATCH");
    }

    const submittedBody = requireText(input.submittedBody, "SUBMITTED_SNAPSHOT_REQUIRED");
    const submittedSnapshotSha256 = sha256(submittedBody);
    const snapshotEvent = appendEvent({
      caseId: input.caseId,
      eventType: "REVIEW_SNAPSHOT_SUBMITTED",
      actor: { actor_type: "drs_specialist", actor_id: authority.binding.specialistId },
      payload: {
        submitted_snapshot_sha256: submittedSnapshotSha256,
        source_line_event_id: sourceEvent.event_id,
        formal_link_id: authority.groupLink.groupLinkId,
        line_group_id: authority.groupLink.lineGroupId,
      },
    });
    let advisory;
    try {
      advisory = sanitizeAdvisory(await advisoryReview({ body: submittedBody, submittedSnapshotSha256 }));
    } catch {
      advisory = sanitizeAdvisory({
        status: "REVIEW_SERVICE_UNAVAILABLE",
        findings: [],
        proposedText: "",
        modelId: "unavailable",
      });
    }

    const review = {
      reviewId: nextId(),
      caseId: input.caseId,
      groupLinkId: input.groupLinkId,
      assignmentId: input.assignmentId,
      specialistId: authority.binding.specialistId,
      sourceEventId: input.sourceEventId,
      submittedSnapshotEventId: snapshotEvent.event_id,
      submittedSnapshotSha256,
      status: advisory.status,
      findings: clone(advisory.findings ?? []),
      proposedTextSha256: advisory.proposedTextSha256,
      modelId: advisory.modelId ?? "unknown",
      consumed: false,
    };
    state.reviews.push(review);
    appendEvent({
      caseId: input.caseId,
      eventType: "AI_REVIEW",
      actor: { actor_type: "ai_service", actor_id: review.modelId },
      payload: {
        review_id: review.reviewId,
        review_status: review.status,
        submitted_snapshot_sha256: review.submittedSnapshotSha256,
        reviewed_event_id: review.sourceEventId,
        reviewed_snapshot_event_id: review.submittedSnapshotEventId,
        findings: review.findings,
        proposed_text_sha256: review.proposedTextSha256,
      },
    });
    return clone(review);
  }

  function validateDecision(review, input) {
    const decisionType = input.decisionType;
    const decisions = new Set(["EDIT_AND_SEND", "OVERRIDE_AND_SEND", "MANUAL_EXCEPTION_SEND", "CANCEL"]);
    if (!decisions.has(decisionType)) throw new Error("HUMAN_DECISION_INVALID");
    requireText(input.reason, "HUMAN_DECISION_REASON_REQUIRED");
    if (decisionType === "CANCEL") return;
    if (review.status === "REVIEW_SERVICE_UNAVAILABLE" && decisionType !== "MANUAL_EXCEPTION_SEND") {
      throw new Error("MANUAL_EXCEPTION_SEND_REQUIRED");
    }
    if (review.status !== "REVIEW_SERVICE_UNAVAILABLE" && decisionType === "MANUAL_EXCEPTION_SEND") {
      throw new Error("MANUAL_EXCEPTION_SEND_NOT_ALLOWED");
    }
    if (decisionType === "MANUAL_EXCEPTION_SEND") {
      requireText(input.urgency, "MANUAL_EXCEPTION_URGENCY_REQUIRED");
      requireText(input.serviceIncidentId, "MANUAL_EXCEPTION_INCIDENT_REQUIRED");
    }
  }

  async function performDecision({ review, authority, input, idempotencyKey, fingerprint }) {
    if (input.decisionType === "CANCEL") {
      appendEvent({
        caseId: review.caseId,
        eventType: "HUMAN_DECISION",
        actor: { actor_type: "drs_specialist", actor_id: review.specialistId },
        payload: {
          decision_id: nextId(),
          review_id: review.reviewId,
          decision: "CANCEL",
          reason: input.reason,
        },
      });
      review.consumed = true;
      const result = { status: "CANCELLED_BY_SPECIALIST" };
      state.finalizations.set(idempotencyKey, { fingerprint, result: clone(result) });
      return result;
    }

    const finalBody = requireText(input.finalBody, "FINAL_BODY_REQUIRED");
    const finalAttachments = normalizeAttachments(input.finalAttachments ?? []);
    const bodySha256 = sha256(finalBody);
    const transportPayloadSha256 = transportSnapshotHash(
      authority.groupLink.lineGroupId,
      finalBody,
      finalAttachments,
    );
    const humanDecisionEvent = appendEvent({
      caseId: review.caseId,
      eventType: "HUMAN_DECISION",
      actor: { actor_type: "drs_specialist", actor_id: review.specialistId },
      payload: {
        decision_id: nextId(),
        review_id: review.reviewId,
        decision: input.decisionType,
        reason: input.reason,
        reason_text: input.reason,
        urgency: input.decisionType === "MANUAL_EXCEPTION_SEND" ? input.urgency : null,
        service_incident_id: input.decisionType === "MANUAL_EXCEPTION_SEND" ? input.serviceIncidentId : null,
        final_snapshot_id: bodySha256,
        transport_payload_sha256: transportPayloadSha256,
        line_group_id: authority.groupLink.lineGroupId,
      },
    });
    review.consumed = true;

    let transport;
    try {
      transport = await sendLine({
        lineGroupId: authority.groupLink.lineGroupId,
        body: finalBody,
        attachments: finalAttachments,
        transportPayloadSha256,
      });
    } catch {
      transport = { status: "ERROR" };
    }
    const transportEvidence = snapshotTransportAcceptance(transport);
    const acceptanceIsComplete =
      transportEvidence.status === "ACCEPTED" &&
      typeof transportEvidence.transportMessageId === "string" &&
      transportEvidence.transportMessageId.trim() !== "" &&
      isValidTimestamp(transportEvidence.acceptedAt) &&
      transportEvidence.lineGroupId === authority.groupLink.lineGroupId &&
      transportEvidence.transportPayloadSha256 === transportPayloadSha256;
    if (!acceptanceIsComplete) {
      const result = {
        status: "TRANSPORT_NOT_ACCEPTED",
        transportStatus: transportEvidence.status === "ACCEPTED"
          ? "MALFORMED_ACCEPTANCE"
          : transportEvidence.status ?? "UNKNOWN",
      };
      state.finalizations.set(idempotencyKey, { fingerprint, result: clone(result) });
      return result;
    }

    const finalMessageEvent = appendEvent({
      caseId: review.caseId,
      eventType: "FINAL_MESSAGE",
      actor: { actor_type: "drs_specialist", actor_id: review.specialistId },
      payload: {
        review_id: review.reviewId,
        decision_event_id: humanDecisionEvent.event_id,
        final_body: finalBody,
        body_sha256: bodySha256,
        transport_payload_sha256: transportPayloadSha256,
        line_group_id: authority.groupLink.lineGroupId,
        transport_status: "ACCEPTED_BY_TRANSPORT",
        transport_message_id: transportEvidence.transportMessageId,
      },
    });
    const receiptEvent = appendEvent({
      caseId: review.caseId,
      eventType: "RECEIPT",
      actor: { actor_type: "transport", actor_id: "line" },
      payload: {
        final_message_event_id: finalMessageEvent.event_id,
        receipt_kind: "TRANSPORT_ACCEPTED",
        transport_message_id: transportEvidence.transportMessageId,
        line_group_id: authority.groupLink.lineGroupId,
        transport_payload_sha256: transportPayloadSha256,
        accepted_at: transportEvidence.acceptedAt,
        ingested_at: now(),
        recipient_read: false,
      },
    });

    const result = {
      status: "TRANSPORT_ACCEPTED",
      bodySha256,
      transportPayloadSha256,
      finalMessageEventId: finalMessageEvent.event_id,
      receipt: {
        receiptEventId: receiptEvent.event_id,
        recipientRead: false,
        transportMessageId: transportEvidence.transportMessageId,
      },
    };
    state.finalizations.set(idempotencyKey, { fingerprint, result: clone(result) });
    return result;
  }

  async function decideAndSend(input) {
    const review = state.reviews.find((candidate) => candidate.reviewId === input.reviewId);
    if (!review) throw new Error("AI_REVIEW_NOT_AVAILABLE");
    const idempotencyKey = requireText(input.idempotencyKey, "IDEMPOTENCY_KEY_REQUIRED");
    const fingerprint = decisionFingerprint(input);
    const authority = await requireAssignedSpecialist({
      sessionToken: input.sessionToken,
      caseId: review.caseId,
      assignmentId: review.assignmentId,
      groupLinkId: review.groupLinkId,
    });
    if (authority.binding.specialistId !== review.specialistId) throw new Error("SPECIALIST_IDENTITY_MISMATCH");

    const replay = state.finalizations.get(idempotencyKey);
    if (replay) {
      if (replay.fingerprint !== fingerprint) throw new Error("IDEMPOTENCY_CONFLICT");
      return clone(replay.result);
    }
    const pending = state.pendingFinalizations.get(idempotencyKey);
    if (pending) {
      if (pending.fingerprint !== fingerprint) throw new Error("IDEMPOTENCY_CONFLICT");
      return clone(await pending.promise);
    }
    if (review.consumed) throw new Error("AI_REVIEW_NOT_AVAILABLE");
    validateDecision(review, input);

    const promise = performDecision({ review, authority, input, idempotencyKey, fingerprint });
    state.pendingFinalizations.set(idempotencyKey, { fingerprint, promise });
    try {
      return clone(await promise);
    } finally {
      const current = state.pendingFinalizations.get(idempotencyKey);
      if (current?.promise === promise) state.pendingFinalizations.delete(idempotencyKey);
    }
  }

  return Object.freeze({
    submitForAdvisoryReview,
    decideAndSend,
    getCaseAuditEvents(caseId) {
      return clone(state.auditEvents.filter((event) => event.case_id === caseId));
    },
  });
}
