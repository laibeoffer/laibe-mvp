import { createHash } from "node:crypto";

export const DRS_CORE_CONTRACT_VERSION = "drs-core-case-audit-w1";

export const VALID_AI_REVIEW_STATUSES = Object.freeze([
  "REVIEW_COMPLETED_NO_FLAG",
  "REVIEW_COMPLETED_ATTENTION",
  "REVIEW_SERVICE_UNAVAILABLE",
]);

export const DRS_EVENT_TYPES = Object.freeze([
  "LINE_SENT_EVENT",
  "AI_REVIEW",
  "HUMAN_DECISION",
  "FINAL_MESSAGE",
  "RECEIPT",
  "WORK_ITEM_TRANSITION",
]);

export const HUMAN_OUTBOUND_DECISIONS = Object.freeze([
  "EDIT_AND_SEND",
  "OVERRIDE_AND_SEND",
  "MANUAL_EXCEPTION_SEND",
  "PRE_SEND_REVIEW_NOT_PERFORMED_BREAK_GLASS",
]);

export const REVIEW_WORK_ITEM_TYPES = Object.freeze([
  "DOCUMENT_REVIEW",
  "DRAWING_REVIEW",
]);

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const LINE_SENT_PAYLOAD_KEYS = Object.freeze(["message_state", "message_kind", "sent_text", "attachment_refs"]);
const LINE_ATTACHMENT_REF_KEYS = Object.freeze(["attachment_id", "attachment_kind", "sha256"]);
const LINE_MESSAGE_KINDS = Object.freeze(["TEXT", "ATTACHMENT", "TEXT_AND_ATTACHMENT"]);
const LINE_ATTACHMENT_KINDS = Object.freeze(["IMAGE", "DOCUMENT", "DRAWING", "OTHER"]);
const AI_REVIEW_PAYLOAD_KEYS = Object.freeze([
  "review_id",
  "review_status",
  "submitted_snapshot_sha256",
  "reviewed_event_id",
  "flags",
  "findings",
]);
const AI_REVIEW_FLAG_KEYS = Object.freeze(["code", "severity"]);
const AI_REVIEW_FINDING_KEYS = Object.freeze(["finding_id", "severity", "summary"]);
const AI_REVIEW_TARGET_EVENT_TYPES = Object.freeze(["LINE_SENT_EVENT", "WORK_ITEM_TRANSITION"]);
const HUMAN_DECISION_PAYLOAD_KEYS = Object.freeze([
  "decision",
  "reason",
  "urgency",
  "incident_id",
  "ai_review_event_id",
  "final_snapshot_id",
  "result_difference",
  "break_glass_result",
]);
const RESULT_DIFFERENCE_KEYS = Object.freeze([
  "submitted_snapshot_sha256",
  "final_snapshot_sha256",
  "content_changed",
]);
const BREAK_GLASS_RESULT_KEYS = Object.freeze([
  "ai_review_performed",
  "final_snapshot_sha256",
]);
const FINAL_MESSAGE_PAYLOAD_KEYS = Object.freeze([
  "decision_event_id",
  "final_snapshot_id",
  "final_text",
  "transport_status",
]);
const RECEIPT_PAYLOAD_KEYS = Object.freeze([
  "final_message_event_id",
  "receipt_kind",
  "recipient_read",
  "transport_message_id",
  "accepted_at",
  "ingested_at",
]);
const WORK_ITEM_TRANSITION_PAYLOAD_KEYS = Object.freeze(["work_item_id", "action", "subject_ref"]);
const DOCUMENT_SUBJECT_REF_KEYS = Object.freeze(["document_id", "version"]);
const DRAWING_SUBJECT_REF_KEYS = Object.freeze(["drawing_id", "version"]);
const RFC3339_MILLIS_PATTERN = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,3}))?(Z|([+-])(\d{2}):(\d{2}))$/;
const MAX_RFC3339_OFFSET_MINUTES = 14 * 60;

const FORBIDDEN_WORKFLOW_TERMS = [
  /\btender\b/i,
  /\bbid\b/i,
  /\baward\b/i,
  /\bbidding\b/i,
  /招標/,
  /投標/,
  /競標/,
  /決標/,
];
const TRUSTED_AI_REVIEW_HASH = Symbol("trustedAiReviewHash");
const TRUSTED_AI_REVIEW_ACTOR = Object.freeze({
  actor_type: "ai_service",
  actor_id: "drs-ai-review-service",
});
const TRUSTED_AI_REVIEW_SOURCE = Object.freeze({
  surface: "SYSTEM",
});

function decision(ok, code, extra = {}) {
  return Object.freeze({ ok, code, ...extra });
}

function hasText(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isUuid(value) {
  return typeof value === "string" && UUID_PATTERN.test(value);
}

function requireUuid(value, code) {
  return isUuid(value) ? null : decision(false, code);
}

function buildUtcDate(year, monthIndex, day, hour = 0, minute = 0, second = 0, millisecond = 0) {
  const date = new Date(0);
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCFullYear(year, monthIndex, day);
  date.setUTCHours(hour, minute, second, millisecond);
  return date;
}

const MIN_CANONICAL_UTC_TIME = buildUtcDate(1, 0, 1, 0, 0, 0, 0).getTime();
const MAX_CANONICAL_UTC_TIME = buildUtcDate(9999, 11, 31, 23, 59, 59, 999).getTime();

function formatCanonicalUtcMillis(time) {
  if (!Number.isFinite(time) || time < MIN_CANONICAL_UTC_TIME || time > MAX_CANONICAL_UTC_TIME) return null;
  const date = new Date(time);
  const year = date.getUTCFullYear();
  if (!Number.isInteger(year) || year < 1 || year > 9999) return null;
  return `${String(year).padStart(4, "0")}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}T${String(date.getUTCHours()).padStart(2, "0")}:${String(date.getUTCMinutes()).padStart(2, "0")}:${String(date.getUTCSeconds()).padStart(2, "0")}.${String(date.getUTCMilliseconds()).padStart(3, "0")}Z`;
}

function daysInMonth(year, month) {
  return buildUtcDate(year, month, 0).getUTCDate();
}

function parseRfc3339Millis(value) {
  if (typeof value !== "string") return null;
  const match = value.match(RFC3339_MILLIS_PATTERN);
  if (!match) return null;
  const [
    ,
    yearText,
    monthText,
    dayText,
    hourText,
    minuteText,
    secondText,
    fractionText,
    zoneText,
    offsetSign,
    offsetHourText,
    offsetMinuteText,
  ] = match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const hour = Number(hourText);
  const minute = Number(minuteText);
  const second = Number(secondText);
  const millisecond = Number((fractionText ?? "").padEnd(3, "0") || "0");
  if (!Number.isInteger(year) || year < 1 || year > 9999) return null;
  if (month < 1 || month > 12) return null;
  if (day < 1 || day > daysInMonth(year, month)) return null;
  if (hour > 23 || minute > 59 || second > 59) return null;
  let offsetMinutes = 0;
  if (zoneText !== "Z") {
    const offsetHour = Number(offsetHourText);
    const offsetMinute = Number(offsetMinuteText);
    if (offsetHour > 23 || offsetMinute > 59) return null;
    const absoluteOffsetMinutes = (offsetHour * 60) + offsetMinute;
    if (absoluteOffsetMinutes > MAX_RFC3339_OFFSET_MINUTES) return null;
    offsetMinutes = absoluteOffsetMinutes * (offsetSign === "+" ? 1 : -1);
  }
  const utcTime = buildUtcDate(year, month - 1, day, hour, minute, second, millisecond).getTime()
    - (offsetMinutes * 60_000);
  if (!Number.isFinite(utcTime)) return null;
  const shifted = new Date(utcTime + (offsetMinutes * 60_000));
  if (
    shifted.getUTCFullYear() !== year ||
    shifted.getUTCMonth() + 1 !== month ||
    shifted.getUTCDate() !== day ||
    shifted.getUTCHours() !== hour ||
    shifted.getUTCMinutes() !== minute ||
    shifted.getUTCSeconds() !== second ||
    shifted.getUTCMilliseconds() !== millisecond
  ) {
    return null;
  }
  const canonical = formatCanonicalUtcMillis(utcTime);
  if (!canonical) return null;
  return {
    time: utcTime,
    canonical,
  };
}

function canonicalizeAcceptedEvent(event = {}) {
  const occurredAt = canonicalOccurredAt(event.occurred_at);
  if (!occurredAt) return event;
  return {
    ...event,
    occurred_at: occurredAt,
  };
}

function toTime(value) {
  if (value === null || value === undefined) return null;
  return parseRfc3339Millis(value)?.time ?? Number.NaN;
}

function canonicalOccurredAt(value) {
  return parseRfc3339Millis(value)?.canonical ?? null;
}

function intervalRange(from, until) {
  const fromTime = toTime(from);
  if (!Number.isFinite(fromTime)) return null;
  if (until === null || until === undefined) {
    return { fromTime, untilTime: Number.POSITIVE_INFINITY };
  }
  const untilTime = toTime(until);
  if (!Number.isFinite(untilTime) || untilTime <= fromTime) return null;
  return { fromTime, untilTime };
}

function isValidInterval(from, until) {
  return intervalRange(from, until) !== null;
}

function isWithinInterval(at, from, until) {
  const atTime = toTime(at);
  const range = intervalRange(from, until);
  if (!Number.isFinite(atTime) || !range) return false;
  if (atTime < range.fromTime) return false;
  return atTime < range.untilTime;
}

function intervalsOverlap(left, right) {
  const leftRange = intervalRange(left.valid_from, left.valid_until);
  const rightRange = intervalRange(right.valid_from, right.valid_until);
  if (!leftRange || !rightRange) return null;
  return leftRange.fromTime < rightRange.untilTime && rightRange.fromTime < leftRange.untilTime;
}

function effectiveInterval(record, terminations, idField) {
  const baseRange = intervalRange(record.valid_from, record.valid_until);
  if (!baseRange) return null;
  const matchingTerminations = (terminations ?? []).filter((item) => item[idField] === record[idField]);
  for (const termination of matchingTerminations) {
    const terminationTime = toTime(termination.terminated_at);
    if (!Number.isFinite(terminationTime)) return null;
    if (terminationTime <= baseRange.fromTime) return null;
    if (baseRange.untilTime !== Number.POSITIVE_INFINITY && terminationTime > baseRange.untilTime) return null;
  }
  const termination = matchingTerminations[0];
  if (!termination) return record;
  const terminationTime = toTime(termination.terminated_at);
  if (baseRange.untilTime !== Number.POSITIVE_INFINITY && baseRange.untilTime <= terminationTime) return record;
  return { ...record, valid_until: termination.terminated_at };
}

function hasOnlyKeys(value, allowedKeys) {
  return isPlainObject(value) && Object.keys(value).every((key) => allowedKeys.includes(key));
}

function hasRequiredKeys(value, requiredKeys) {
  return isPlainObject(value) && requiredKeys.every((key) => Object.hasOwn(value, key));
}

function hasClosedRequiredKeys(value, requiredKeys, allowedKeys = requiredKeys) {
  return hasOnlyKeys(value, allowedKeys) && hasRequiredKeys(value, requiredKeys);
}

function isText(value) {
  return typeof value === "string";
}

function isOptionalText(value) {
  return value === undefined || value === null || isText(value);
}

function isBoolean(value) {
  return typeof value === "boolean";
}

function isSha256(value) {
  return isText(value) && /^[0-9a-f]{64}$/i.test(value);
}

function sha256Utf8(value) {
  if (!isText(value)) return null;
  return createHash("sha256").update(value, "utf8").digest("hex");
}

export function canonicalFinalSnapshotHash(finalText) {
  return sha256Utf8(finalText);
}

function hasResultDifferenceShape(value) {
  return hasClosedRequiredKeys(value, RESULT_DIFFERENCE_KEYS) &&
    isSha256(value.submitted_snapshot_sha256) &&
    isSha256(value.final_snapshot_sha256) &&
    isBoolean(value.content_changed);
}

function hasBreakGlassResultShape(value) {
  return hasClosedRequiredKeys(value, BREAK_GLASS_RESULT_KEYS) &&
    value.ai_review_performed === false &&
    isSha256(value.final_snapshot_sha256);
}

function isDocumentSubjectRef(value) {
  return hasClosedRequiredKeys(value, DOCUMENT_SUBJECT_REF_KEYS) &&
    isUuid(value.document_id) &&
    hasText(value.version);
}

function isDrawingSubjectRef(value) {
  return hasClosedRequiredKeys(value, DRAWING_SUBJECT_REF_KEYS) &&
    isUuid(value.drawing_id) &&
    hasText(value.version);
}

function hasSubjectRefShape(value) {
  return isDocumentSubjectRef(value) || isDrawingSubjectRef(value);
}

function hasWorkItemSubjectRefShape(workItemType, value) {
  if (workItemType === "DOCUMENT_REVIEW") return isDocumentSubjectRef(value);
  if (workItemType === "DRAWING_REVIEW") return isDrawingSubjectRef(value);
  return false;
}

function normalizeSubjectRef(value) {
  if (isDocumentSubjectRef(value)) {
    return { document_id: value.document_id, version: value.version };
  }
  if (isDrawingSubjectRef(value)) {
    return { drawing_id: value.drawing_id, version: value.version };
  }
  return value;
}

function sameSubjectRef(left, right) {
  return sameIdentity(normalizeSubjectRef(left) ?? {}, normalizeSubjectRef(right) ?? {});
}

function trustedAiReviewHashFor(context = {}) {
  return context[TRUSTED_AI_REVIEW_HASH];
}

function withTrustedAiReviewHash(context = {}, submittedSnapshotSha256) {
  return {
    ...context,
    [TRUSTED_AI_REVIEW_HASH]: submittedSnapshotSha256,
  };
}

function sortForIdentity(value) {
  if (Array.isArray(value)) return value.map(sortForIdentity);
  if (isPlainObject(value)) {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, sortForIdentity(value[key])]),
    );
  }
  return value;
}

function sameIdentity(left, right) {
  return JSON.stringify(sortForIdentity(left)) === JSON.stringify(sortForIdentity(right));
}

function eventIdentitySnapshot(event = {}) {
  const occurredAt = canonicalOccurredAt(event.occurred_at);
  if (!occurredAt) return null;
  return {
    event_id: event.event_id,
    case_id: event.case_id,
    previous_event_id: event.previous_event_id,
    event_type: event.event_type,
    occurred_at: occurredAt,
    actor: event.actor,
    source: event.source,
    payload: event.payload,
    recipient_read: event.recipient_read ?? false,
  };
}

function eventAtOrAfter(event, at) {
  const eventTime = toTime(event?.occurred_at);
  const atTime = toTime(at);
  return Number.isFinite(eventTime) && Number.isFinite(atTime) && eventTime >= atTime;
}

function hasDependentGroupEvent(link, termination, context) {
  const terminationTime = toTime(termination.terminated_at);
  if (!Number.isFinite(terminationTime)) return true;
  return (context?.auditEvents ?? []).some((event) => {
    if (
      event.case_id !== link.case_id ||
      event.event_type !== "LINE_SENT_EVENT" ||
      event.source?.group_link_id !== link.group_link_id
    ) {
      return false;
    }
    if (!Number.isFinite(toTime(event?.occurred_at))) return true;
    return eventAtOrAfter(event, termination.terminated_at);
  });
}

function hasDependentAssignmentEvent(assignment, termination, context) {
  const terminationTime = toTime(termination.terminated_at);
  if (!Number.isFinite(terminationTime)) return true;
  return (context?.auditEvents ?? []).some((event) => {
    if (
      event.case_id !== assignment.case_id ||
      !["HUMAN_DECISION", "FINAL_MESSAGE", "WORK_ITEM_TRANSITION"].includes(event.event_type) ||
      event.actor?.actor_type !== "drs_specialist" ||
      event.actor?.actor_id !== assignment.specialist_id
    ) {
      return false;
    }
    if (!Number.isFinite(toTime(event?.occurred_at))) return true;
    return eventAtOrAfter(event, termination.terminated_at);
  });
}

function clonePlain(value) {
  return structuredClone(value);
}

function freezePlain(value) {
  return Object.freeze(clonePlain(value));
}

function buildTrustedAiReviewEvent(input = {}) {
  if (input.event_type !== "AI_REVIEW") {
    return decision(false, "AI_REVIEW_EVENT_TYPE_REQUIRED");
  }
  if (!isText(input.submitted_snapshot_body)) {
    return decision(false, "AI_REVIEW_SUBMITTED_SNAPSHOT_BODY_REQUIRED");
  }
  if (Object.hasOwn(input.payload ?? {}, "submitted_snapshot_sha256")) {
    return decision(false, "AI_REVIEW_SUBMITTED_SNAPSHOT_SHA256_FORBIDDEN");
  }
  const submittedSnapshotSha256 = sha256Utf8(input.submitted_snapshot_body);
  const {
    submitted_snapshot_body: _submitted_snapshot_body,
    payload = {},
    actor: _actor,
    source: _source,
    ...event
  } = input;
  return freezePlain({
    ...event,
    actor: TRUSTED_AI_REVIEW_ACTOR,
    source: TRUSTED_AI_REVIEW_SOURCE,
    payload: {
      ...payload,
      submitted_snapshot_sha256: submittedSnapshotSha256,
    },
  });
}

function getCaseId(context) {
  return context?.caseIdentity?.case_id;
}

function activeGroupLinkFor(input, context) {
  return (context?.groupLinks ?? []).find((link) => {
    if (
      link.case_id !== input.case_id ||
      (link.line_group_id !== input.line_group_id && link.group_link_id !== input.group_link_id)
    ) {
      return false;
    }
    const effectiveLink = effectiveInterval(link, context?.groupLinkTerminations, "group_link_id");
    if (!effectiveLink) return false;
    return isWithinInterval(input.sent_at, effectiveLink.valid_from, effectiveLink.valid_until);
  });
}

function activeSpecialistAssignmentFor(input, context) {
  return (context?.specialistAssignments ?? []).find((assignment) => {
    const effectiveAssignment = effectiveInterval(
      assignment,
      context?.assignmentTerminations,
      "assignment_id",
    );
    if (!effectiveAssignment) return false;
    return assignment.case_id === input.case_id &&
      assignment.specialist_id === input.specialist_id &&
      specialistAuthorityActive(input.specialist_id, context) &&
      isWithinInterval(input.at ?? context?.now, assignment.valid_from, effectiveAssignment.valid_until);
  });
}

function specialistAuthorityActive(specialistId, context) {
  const specialist = (context?.specialists ?? []).find((item) => item.specialist_id === specialistId);
  return specialist?.authority_state === "ACTIVE";
}

function specialistAuthorityKnownInactive(specialistId, context) {
  const specialist = (context?.specialists ?? []).find((item) => item.specialist_id === specialistId);
  return Boolean(specialist) && specialist.authority_state !== "ACTIVE";
}

function findEvent(events, eventId) {
  return (events ?? []).find((event) => event.event_id === eventId);
}

function hasSuccessor(events, previousEventId) {
  return (events ?? []).some((event) => event.previous_event_id === previousEventId);
}

function validatePreviousEventBoundary(event, context) {
  if (event.previous_event_id === null) {
    const existingRoot = (context?.existingEvents ?? []).find((existing) =>
      existing.case_id === event.case_id && existing.previous_event_id === null
    );
    if (existingRoot) return decision(false, "AUDIT_CHAIN_ROOT_ALREADY_EXISTS");
    return decision(true, "ROOT_AUDIT_EVENT_VALID");
  }
  if (event.previous_event_id === event.event_id) {
    return decision(false, "AUDIT_EVENT_SELF_REFERENCE_FORBIDDEN");
  }
  const previous = findEvent(context?.existingEvents, event.previous_event_id);
  if (!previous) return decision(false, "PREVIOUS_EVENT_ID_CHAIN_INVALID");
  if (previous.case_id !== event.case_id) return decision(false, "PREVIOUS_EVENT_CASE_MISMATCH");
  const previousTime = toTime(previous.occurred_at);
  const eventTime = toTime(event.occurred_at);
  if (!Number.isFinite(previousTime) || !Number.isFinite(eventTime)) {
    return decision(false, "PREVIOUS_EVENT_CHRONOLOGY_INVALID");
  }
  if (previousTime > eventTime) {
    return decision(false, "PREVIOUS_EVENT_CHRONOLOGY_INVALID");
  }
  if (hasSuccessor(context?.existingEvents, event.previous_event_id)) {
    return decision(false, "PREVIOUS_EVENT_ALREADY_HAS_SUCCESSOR");
  }
  return decision(true, "PREVIOUS_EVENT_VALID");
}

function requireEnvelope(event, context) {
  if (!DRS_EVENT_TYPES.includes(event?.event_type)) {
    return decision(false, "AUDIT_EVENT_TYPE_INVALID");
  }
  const eventIdError = requireUuid(event.event_id, "AUDIT_EVENT_ID_MUST_BE_UUID");
  if (eventIdError) return eventIdError;
  if (event.case_id !== getCaseId(context)) return decision(false, "AUDIT_EVENT_CASE_MISMATCH");
  const caseIdError = requireUuid(event.case_id, "CASE_ID_MUST_BE_UUID");
  if (caseIdError) return caseIdError;
  if (!Number.isFinite(toTime(event.occurred_at))) {
    return decision(false, "AUDIT_EVENT_OCCURRED_AT_INVALID");
  }
  if (!hasText(event.actor?.actor_type) || !hasText(event.actor?.actor_id)) {
    return decision(false, "AUDIT_EVENT_ACTOR_REQUIRED");
  }
  if (event.previous_event_id !== null) {
    const previousIdError = requireUuid(event.previous_event_id, "PREVIOUS_EVENT_ID_MUST_BE_UUID");
    if (previousIdError) return previousIdError;
  }
  return validatePreviousEventBoundary(event, context);
}

function validateLineSentPayload(event, context) {
  const payload = event.payload ?? {};
  if (event.source?.surface !== "LINE") return decision(false, "LINE_EVENT_SOURCE_INVALID");
  if (!hasText(event.source?.transport_message_id)) {
    return decision(false, "LINE_SENT_TRANSPORT_ID_REQUIRED");
  }
  if (!hasClosedRequiredKeys(payload, LINE_SENT_PAYLOAD_KEYS)) {
    return decision(false, "LINE_SENT_PAYLOAD_SCHEMA_INVALID");
  }
  if (!isText(payload.message_state) || payload.message_state !== "SENT") {
    return decision(false, "ONLY_SENT_LINE_EVENTS_CAN_BE_INGESTED");
  }
  if (!isText(payload.message_kind) || !isText(payload.sent_text) || !Array.isArray(payload.attachment_refs)) {
    return decision(false, "LINE_SENT_PAYLOAD_SCHEMA_INVALID");
  }
  const intake = canIngestLineEvent({
    case_id: event.case_id,
    line_group_id: event.source?.line_group_id,
    group_link_id: event.source?.group_link_id,
    sent_at: event.occurred_at,
    message_state: payload.message_state,
  }, context);
  if (!intake.ok) return intake;
  if (!LINE_MESSAGE_KINDS.includes(payload.message_kind)) {
    return decision(false, "LINE_MESSAGE_KIND_INVALID");
  }
  if (!payload.attachment_refs.every((ref) => (
    hasClosedRequiredKeys(ref, ["attachment_id", "attachment_kind"], LINE_ATTACHMENT_REF_KEYS) &&
    hasText(ref.attachment_id) &&
    LINE_ATTACHMENT_KINDS.includes(ref.attachment_kind) &&
    (ref.sha256 === undefined || isSha256(ref.sha256))
  ))) {
    return decision(false, "LINE_ATTACHMENT_REFS_INVALID");
  }
  return decision(true, "LINE_SENT_EVENT_VALID");
}

function validateAiReviewPayload(event, context) {
  const payload = event.payload ?? {};
  const trustedSubmittedSnapshotSha256 = trustedAiReviewHashFor(context);
  if (!isSha256(trustedSubmittedSnapshotSha256) || payload.submitted_snapshot_sha256 !== trustedSubmittedSnapshotSha256) {
    return decision(false, "AI_REVIEW_REQUIRES_TRUSTED_APPEND_PATH");
  }
  if (event.actor?.actor_type !== "ai_service" || !hasText(event.actor?.actor_id)) {
    return decision(false, "AI_REVIEW_ACTOR_INVALID");
  }
  if (event.source?.surface !== "SYSTEM") {
    return decision(false, "AI_REVIEW_SOURCE_INVALID");
  }
  if (
    !hasClosedRequiredKeys(payload, AI_REVIEW_PAYLOAD_KEYS) ||
    !isUuid(payload.review_id) ||
    !isText(payload.review_status) ||
    !isSha256(payload.submitted_snapshot_sha256) ||
    !isUuid(payload.reviewed_event_id) ||
    !Array.isArray(payload.flags) ||
    !Array.isArray(payload.findings)
  ) {
    return decision(false, "AI_REVIEW_PAYLOAD_SCHEMA_INVALID");
  }
  if (!VALID_AI_REVIEW_STATUSES.includes(payload.review_status)) {
    return decision(false, "AI_REVIEW_STATUS_INVALID");
  }
  if (!payload.flags.every((flag) => (
    hasClosedRequiredKeys(flag, AI_REVIEW_FLAG_KEYS) &&
    hasText(flag.code) &&
    hasText(flag.severity)
  ))) {
    return decision(false, "AI_REVIEW_PAYLOAD_SCHEMA_INVALID");
  }
  if (!payload.findings.every((finding) => (
    hasClosedRequiredKeys(finding, AI_REVIEW_FINDING_KEYS) &&
    hasText(finding.finding_id) &&
    hasText(finding.severity) &&
    hasText(finding.summary)
  ))) {
    return decision(false, "AI_REVIEW_PAYLOAD_SCHEMA_INVALID");
  }
  const reviewedEvent = findEvent(context?.existingEvents, payload.reviewed_event_id);
  if (!reviewedEvent) return decision(false, "AI_REVIEW_TARGET_NOT_FOUND");
  if (reviewedEvent.case_id !== event.case_id) return decision(false, "AI_REVIEW_TARGET_CASE_MISMATCH");
  if (!AI_REVIEW_TARGET_EVENT_TYPES.includes(reviewedEvent.event_type)) {
    return decision(false, "AI_REVIEW_TARGET_EVENT_TYPE_INVALID");
  }
  return decision(true, "AI_REVIEW_VALID");
}

function validateHumanDecisionPayload(event, context) {
  if (event.source?.surface !== "DRS_WORKSPACE") {
    return decision(false, "HUMAN_DECISION_SOURCE_INVALID");
  }
  if (event.actor.actor_type !== "drs_specialist") {
    return decision(false, "HUMAN_DECISION_ACTOR_MUST_BE_ASSIGNED_SPECIALIST");
  }
  if (
    !hasClosedRequiredKeys(event.payload ?? {}, ["decision", "reason", "urgency", "incident_id", "final_snapshot_id"], HUMAN_DECISION_PAYLOAD_KEYS) ||
    !hasText(event.payload.decision) ||
    !isText(event.payload.reason) ||
    !isText(event.payload.urgency) ||
    !isOptionalText(event.payload.incident_id) ||
    (event.payload.ai_review_event_id !== undefined && event.payload.ai_review_event_id !== null && !isUuid(event.payload.ai_review_event_id)) ||
    !isSha256(event.payload.final_snapshot_id)
  ) {
    return decision(false, "HUMAN_DECISION_PAYLOAD_SCHEMA_INVALID");
  }
  const outbound = validateHumanOutboundDecision({
    ...event.payload,
    specialist_id: event.actor.actor_id,
  }, {
    case_id: event.case_id,
    at: event.occurred_at,
    specialists: context.specialists,
    specialistAssignments: context.specialistAssignments,
    assignmentTerminations: context.assignmentTerminations,
  });
  if (!outbound.ok) return outbound;
  const isBreakGlass = event.payload.decision === "PRE_SEND_REVIEW_NOT_PERFORMED_BREAK_GLASS";
  if (isBreakGlass) {
    if (event.payload.ai_review_event_id !== undefined && event.payload.ai_review_event_id !== null) {
      return decision(false, "BREAK_GLASS_AI_REVIEW_FORBIDDEN");
    }
    if (Object.hasOwn(event.payload, "result_difference")) {
      return decision(false, "BREAK_GLASS_RESULT_SCHEMA_INVALID");
    }
    if (!hasBreakGlassResultShape(event.payload.break_glass_result)) {
      return decision(false, "BREAK_GLASS_RESULT_REQUIRED");
    }
    if (event.payload.break_glass_result.final_snapshot_sha256 !== event.payload.final_snapshot_id) {
      return decision(false, "BREAK_GLASS_RESULT_FINAL_SNAPSHOT_MISMATCH");
    }
  } else {
    if (Object.hasOwn(event.payload, "break_glass_result")) {
      return decision(false, "HUMAN_DECISION_RESULT_DIFFERENCE_REQUIRED");
    }
    if (!Object.hasOwn(event.payload, "result_difference")) {
      return decision(false, "HUMAN_DECISION_RESULT_DIFFERENCE_REQUIRED");
    }
    if (!hasResultDifferenceShape(event.payload.result_difference)) {
      return decision(false, "HUMAN_DECISION_RESULT_DIFFERENCE_SCHEMA_INVALID");
    }
    const diff = event.payload.result_difference;
    if (diff.final_snapshot_sha256 !== event.payload.final_snapshot_id) {
      return decision(false, "HUMAN_DECISION_RESULT_DIFFERENCE_FINAL_SNAPSHOT_MISMATCH");
    }
    if (diff.content_changed !== (diff.submitted_snapshot_sha256 !== diff.final_snapshot_sha256)) {
      return decision(false, "HUMAN_DECISION_RESULT_DIFFERENCE_CHANGED_FLAG_MISMATCH");
    }
    if (event.payload.decision === "EDIT_AND_SEND" && diff.content_changed !== true) {
      return decision(false, "EDIT_AND_SEND_REQUIRES_CONTENT_CHANGE");
    }
  }
  if (!isBreakGlass && !isUuid(event.payload.ai_review_event_id)) {
    return decision(false, "HUMAN_DECISION_REQUIRES_AI_REVIEW");
  }
  if (isUuid(event.payload.ai_review_event_id)) {
    const aiReviewEvent = findEvent(context.existingEvents, event.payload.ai_review_event_id);
    if (!aiReviewEvent || aiReviewEvent.event_type !== "AI_REVIEW") {
      return decision(false, "HUMAN_DECISION_REQUIRES_AI_REVIEW");
    }
    if (aiReviewEvent.case_id !== event.case_id) {
      return decision(false, "HUMAN_DECISION_AI_REVIEW_CASE_MISMATCH");
    }
    if (!isBreakGlass && event.payload.result_difference.submitted_snapshot_sha256 !== aiReviewEvent.payload?.submitted_snapshot_sha256) {
      return decision(false, "HUMAN_DECISION_RESULT_DIFFERENCE_AI_SNAPSHOT_MISMATCH");
    }
    if (
      ["EDIT_AND_SEND", "OVERRIDE_AND_SEND"].includes(event.payload.decision) &&
      aiReviewEvent.payload?.review_status === "REVIEW_SERVICE_UNAVAILABLE"
    ) {
      return decision(false, "HUMAN_DECISION_AI_REVIEW_STATUS_INVALID");
    }
    if (
      event.payload.decision === "MANUAL_EXCEPTION_SEND" &&
      aiReviewEvent.payload?.review_status !== "REVIEW_SERVICE_UNAVAILABLE"
    ) {
      return decision(false, "HUMAN_DECISION_AI_REVIEW_STATUS_INVALID");
    }
  }
  return decision(true, "HUMAN_OUTBOUND_DECISION_VALID");
}

function validateFinalMessagePayload(event, context) {
  const payload = event.payload ?? {};
  if (
    !hasClosedRequiredKeys(payload, FINAL_MESSAGE_PAYLOAD_KEYS) ||
    !isUuid(payload.decision_event_id) ||
    !isSha256(payload.final_snapshot_id) ||
    !hasText(payload.final_text) ||
    !isText(payload.transport_status)
  ) {
    return decision(false, "FINAL_MESSAGE_PAYLOAD_SCHEMA_INVALID");
  }
  if (payload.transport_status !== "ACCEPTED_BY_TRANSPORT") {
    return decision(false, "FINAL_MESSAGE_TRANSPORT_STATUS_INVALID");
  }
  if (canonicalFinalSnapshotHash(payload.final_text) !== payload.final_snapshot_id) {
    return decision(false, "FINAL_MESSAGE_BODY_HASH_MISMATCH");
  }
  const decisionEvent = findEvent(context.existingEvents, payload.decision_event_id);
  if (!decisionEvent || decisionEvent.case_id !== event.case_id || decisionEvent.event_type !== "HUMAN_DECISION") {
    return decision(false, "FINAL_MESSAGE_REQUIRES_HUMAN_DECISION");
  }
  if (decisionEvent.actor.actor_type !== "drs_specialist") {
    return decision(false, "FINAL_MESSAGE_REQUIRES_SPECIALIST_DECISION");
  }
  if (!HUMAN_OUTBOUND_DECISIONS.includes(decisionEvent.payload?.decision)) {
    return decision(false, "FINAL_MESSAGE_REQUIRES_VALID_HUMAN_DECISION");
  }
  if (!hasText(decisionEvent.payload?.final_snapshot_id)) {
    return decision(false, "FINAL_MESSAGE_DECISION_SNAPSHOT_REQUIRED");
  }
  if (decisionEvent.payload.final_snapshot_id !== payload.final_snapshot_id) {
    return decision(false, "FINAL_MESSAGE_SNAPSHOT_MISMATCH");
  }
  if (
    decisionEvent.payload.decision === "PRE_SEND_REVIEW_NOT_PERFORMED_BREAK_GLASS" &&
    decisionEvent.payload.break_glass_result?.final_snapshot_sha256 !== payload.final_snapshot_id
  ) {
    return decision(false, "FINAL_MESSAGE_SNAPSHOT_MISMATCH");
  }
  if (
    decisionEvent.payload.decision !== "PRE_SEND_REVIEW_NOT_PERFORMED_BREAK_GLASS" &&
    decisionEvent.payload.result_difference?.final_snapshot_sha256 !== payload.final_snapshot_id
  ) {
    return decision(false, "FINAL_MESSAGE_SNAPSHOT_MISMATCH");
  }
  const decisionTime = toTime(decisionEvent.occurred_at);
  const eventTime = toTime(event.occurred_at);
  if (!Number.isFinite(decisionTime) || !Number.isFinite(eventTime) || decisionTime > eventTime) {
    return decision(false, "FINAL_MESSAGE_DECISION_CHRONOLOGY_INVALID");
  }
  if (!activeSpecialistAssignmentFor({
    case_id: event.case_id,
    specialist_id: decisionEvent.actor.actor_id,
    at: decisionEvent.occurred_at,
  }, context)) {
    return decision(false, "FINAL_MESSAGE_DECISION_SPECIALIST_NOT_ACTIVE");
  }
  if (
    event.actor.actor_type !== "drs_specialist" ||
    event.actor.actor_id !== decisionEvent.actor.actor_id ||
    !activeSpecialistAssignmentFor({
      case_id: event.case_id,
      specialist_id: event.actor.actor_id,
      at: event.occurred_at,
    }, context)
  ) {
    return decision(false, "FINAL_MESSAGE_SENDER_MUST_BE_ASSIGNED_SPECIALIST");
  }
  if (["ai_service", "system"].includes(event.actor.actor_type)) {
    return decision(false, "FINAL_MESSAGE_SENDER_MUST_BE_ASSIGNED_SPECIALIST");
  }
  return decision(true, "FINAL_MESSAGE_VALID");
}

function validateReceiptPayload(event, context) {
  const payload = event.payload ?? {};
  if (
    !hasClosedRequiredKeys(payload, RECEIPT_PAYLOAD_KEYS) ||
    !isUuid(payload.final_message_event_id) ||
    !isText(payload.receipt_kind) ||
    !isBoolean(payload.recipient_read) ||
    !hasText(payload.transport_message_id) ||
    !Number.isFinite(toTime(payload.accepted_at)) ||
    !Number.isFinite(toTime(payload.ingested_at))
  ) {
    return decision(false, "RECEIPT_PAYLOAD_SCHEMA_INVALID");
  }
  if (payload.receipt_kind !== "TRANSPORT_ACCEPTED") {
    return decision(false, "RECEIPT_KIND_INVALID");
  }
  if (event.recipient_read !== false || payload.recipient_read !== false || payload.recipient_read !== event.recipient_read) {
    return decision(false, "TRANSPORT_ACCEPTED_IS_NOT_RECIPIENT_READ");
  }
  if (toTime(payload.accepted_at) > toTime(payload.ingested_at) || toTime(payload.ingested_at) > toTime(event.occurred_at)) {
    return decision(false, "RECEIPT_TRANSPORT_TIME_INVALID");
  }
  const finalMessage = findEvent(context?.existingEvents, payload.final_message_event_id);
  if (!finalMessage || finalMessage.event_type !== "FINAL_MESSAGE") {
    return decision(false, "RECEIPT_FINAL_MESSAGE_REQUIRED");
  }
  if (finalMessage.case_id !== event.case_id) {
    return decision(false, "RECEIPT_FINAL_MESSAGE_CASE_MISMATCH");
  }
  return decision(true, "RECEIPT_VALID");
}

function validateWorkItemTransitionAuditPayload(event, context = {}) {
  const payload = event.payload ?? {};
  if (event.source?.surface !== "DRS_WORKSPACE") {
    return decision(false, "WORK_ITEM_TRANSITION_SOURCE_INVALID");
  }
  if (
    !hasClosedRequiredKeys(payload, WORK_ITEM_TRANSITION_PAYLOAD_KEYS) ||
    !isUuid(payload.work_item_id) ||
    !hasText(payload.action) ||
    !hasSubjectRefShape(payload.subject_ref)
  ) {
    return decision(false, "WORK_ITEM_TRANSITION_PAYLOAD_SCHEMA_INVALID");
  }
  const workItem = (context.workItems ?? []).find((item) => item.work_item_id === payload.work_item_id);
  if (!workItem) return decision(false, "WORK_ITEM_NOT_FOUND");
  if (workItem.case_id !== event.case_id) return decision(false, "WORK_ITEM_TRANSITION_CASE_MISMATCH");
  if (!sameSubjectRef(workItem.subject_ref, payload.subject_ref)) {
    return decision(false, "WORK_ITEM_TRANSITION_AUDIT_SUBJECT_MISMATCH");
  }
  if (event.actor?.actor_type === "drs_specialist" && !activeSpecialistAssignmentFor({
    case_id: event.case_id,
    specialist_id: event.actor.actor_id,
    at: event.occurred_at,
  }, context)) {
    if (specialistAuthorityKnownInactive(event.actor.actor_id, context)) {
      return decision(false, "SPECIALIST_AUTHORITY_NOT_ACTIVE");
    }
    return decision(false, "WORK_ITEM_TRANSITION_SPECIALIST_NOT_ACTIVE");
  }
  if (event.actor?.actor_type === "owner" && event.actor.actor_id !== context.caseIdentity?.owner_id) {
    return decision(false, "WORK_ITEM_TRANSITION_OWNER_REQUIRED");
  }
  return decision(true, "WORK_ITEM_TRANSITION_AUDIT_VALID");
}

export function normalizeCaseIdentity(input = {}) {
  const normalized = {
    case_id: input.case_id,
    case_number: input.case_number,
    owner_id: input.owner_id,
    case_state: input.case_state,
    opened_at: input.opened_at,
  };
  if (!isUuid(normalized.case_id)) return decision(false, "CASE_ID_MUST_BE_UUID");
  if (!hasText(normalized.case_number)) return decision(false, "CASE_NUMBER_REQUIRED");
  if (!isUuid(normalized.owner_id)) return decision(false, "CASE_OWNER_MUST_BE_UUID");
  if (!["ACTIVE_REVIEW", "ACTIVE_CONSTRUCTION", "CLOSED"].includes(normalized.case_state)) {
    return decision(false, "CASE_STATE_INVALID");
  }
  if (!Number.isFinite(toTime(normalized.opened_at))) {
    return decision(false, "CASE_OPENED_AT_INVALID");
  }
  return freezePlain(normalized);
}

export function validateFormalGroupLink(link = {}, context = {}) {
  if (!isUuid(link.group_link_id)) return decision(false, "GROUP_LINK_ID_MUST_BE_UUID");
  if (link.case_id !== getCaseId(context)) return decision(false, "GROUP_LINK_CASE_MISMATCH");
  if (!isUuid(link.case_id)) return decision(false, "CASE_ID_MUST_BE_UUID");
  if (link.group_kind !== "DRS_CASE_GROUP") return decision(false, "GROUP_LINK_KIND_INVALID");
  if (!hasText(link.line_group_id)) return decision(false, "LINE_GROUP_ID_REQUIRED");
  if (!isUuid(link.linked_by_specialist_id)) {
    return decision(false, "GROUP_LINK_SPECIALIST_MUST_BE_UUID");
  }
  if (!isValidInterval(link.valid_from, link.valid_until)) {
    return decision(false, "GROUP_LINK_INTERVAL_INVALID");
  }
  for (const existing of context.groupLinks ?? []) {
    if (existing.group_link_id === link.group_link_id || existing.line_group_id !== link.line_group_id) continue;
    const effectiveExisting = effectiveInterval(existing, context.groupLinkTerminations, "group_link_id");
    const overlap = effectiveExisting ? intervalsOverlap(effectiveExisting, link) : null;
    if (!effectiveExisting || overlap === null || overlap) {
      return decision(false, "LINE_GROUP_LINK_INTERVAL_OVERLAP");
    }
  }
  if (!isWithinInterval(context.now, link.valid_from, link.valid_until)) {
    return decision(false, "GROUP_LINK_NOT_ACTIVE");
  }
  return decision(true, "FORMAL_GROUP_LINK_VALID");
}

export function validateSpecialistAssignment(assignment = {}, context = {}) {
  if (!isUuid(assignment.assignment_id)) return decision(false, "ASSIGNMENT_ID_MUST_BE_UUID");
  if (assignment.case_id !== getCaseId(context)) {
    return decision(false, "SPECIALIST_ASSIGNMENT_CASE_MISMATCH");
  }
  if (!isUuid(assignment.case_id)) return decision(false, "CASE_ID_MUST_BE_UUID");
  if (!isUuid(assignment.specialist_id)) return decision(false, "SPECIALIST_ID_MUST_BE_UUID");
  if (!isUuid(assignment.assigned_by)) return decision(false, "ASSIGNED_BY_MUST_BE_UUID");
  if (!isValidInterval(assignment.valid_from, assignment.valid_until)) {
    return decision(false, "SPECIALIST_ASSIGNMENT_INTERVAL_INVALID");
  }
  for (const existing of context.specialistAssignments ?? []) {
    if (existing.assignment_id === assignment.assignment_id || existing.case_id !== assignment.case_id) continue;
    const effectiveExisting = effectiveInterval(existing, context.assignmentTerminations, "assignment_id");
    const overlap = effectiveExisting ? intervalsOverlap(effectiveExisting, assignment) : null;
    if (!effectiveExisting || overlap === null || overlap) {
      return decision(false, "SPECIALIST_ASSIGNMENT_INTERVAL_OVERLAP");
    }
  }
  return decision(true, "SPECIALIST_ASSIGNMENT_VALID");
}

export function createSpecialistAssignmentTermination(assignment = {}, input = {}, context = {}) {
  const terminationIdError = requireUuid(input.termination_id, "ASSIGNMENT_TERMINATION_ID_MUST_BE_UUID");
  if (terminationIdError) return terminationIdError;
  if (!isUuid(assignment.assignment_id)) return decision(false, "ASSIGNMENT_ID_MUST_BE_UUID");
  const hasPresentValidUntil = assignment.valid_until !== null && assignment.valid_until !== undefined;
  const terminatedAtTime = toTime(input.terminated_at);
  const validFromTime = toTime(assignment.valid_from);
  const validUntilTime = !hasPresentValidUntil
    ? null
    : toTime(assignment.valid_until);
  if (!Number.isFinite(terminatedAtTime)) return decision(false, "ASSIGNMENT_TERMINATED_AT_INVALID");
  if (!Number.isFinite(validFromTime) || (hasPresentValidUntil && !Number.isFinite(validUntilTime))) {
    return decision(false, "ASSIGNMENT_TERMINATION_TIME_INVALID");
  }
  for (const existingTermination of (context.assignmentTerminations ?? []).filter((item) =>
    item.assignment_id === assignment.assignment_id
  )) {
    const existingTerminationTime = toTime(existingTermination.terminated_at);
    if (
      !Number.isFinite(existingTerminationTime) ||
      existingTerminationTime <= validFromTime ||
      (validUntilTime !== null && existingTerminationTime > validUntilTime)
    ) {
      return decision(false, "ASSIGNMENT_TERMINATION_TIME_INVALID");
    }
  }
  if (terminatedAtTime <= validFromTime) {
    return decision(false, "ASSIGNMENT_TERMINATION_TIME_INVALID");
  }
  if (validUntilTime !== null && terminatedAtTime > validUntilTime) {
    return decision(false, "ASSIGNMENT_TERMINATION_TIME_INVALID");
  }
  if (hasDependentAssignmentEvent(assignment, input, context)) {
    return decision(false, "ASSIGNMENT_TERMINATION_AFTER_DEPENDENT_EVENT_REQUIRED");
  }
  if (!isUuid(input.terminated_by)) return decision(false, "ASSIGNMENT_TERMINATED_BY_MUST_BE_UUID");
  if (!hasText(input.reason)) return decision(false, "ASSIGNMENT_TERMINATION_REASON_REQUIRED");
  return freezePlain({
    termination_id: input.termination_id,
    assignment_id: assignment.assignment_id,
    case_id: assignment.case_id,
    specialist_id: assignment.specialist_id,
    terminated_at: input.terminated_at,
    terminated_by: input.terminated_by,
    reason: input.reason,
  });
}

export function createFormalGroupLinkTermination(link = {}, input = {}, context = {}) {
  const terminationIdError = requireUuid(input.termination_id, "GROUP_LINK_TERMINATION_ID_MUST_BE_UUID");
  if (terminationIdError) return terminationIdError;
  if (!isUuid(link.group_link_id)) return decision(false, "GROUP_LINK_ID_MUST_BE_UUID");
  const hasPresentValidUntil = link.valid_until !== null && link.valid_until !== undefined;
  const terminatedAtTime = toTime(input.terminated_at);
  const validFromTime = toTime(link.valid_from);
  const validUntilTime = !hasPresentValidUntil
    ? null
    : toTime(link.valid_until);
  if (!Number.isFinite(terminatedAtTime)) return decision(false, "GROUP_LINK_TERMINATED_AT_INVALID");
  if (!Number.isFinite(validFromTime) || (hasPresentValidUntil && !Number.isFinite(validUntilTime))) {
    return decision(false, "GROUP_LINK_TERMINATION_TIME_INVALID");
  }
  for (const existingTermination of (context.groupLinkTerminations ?? []).filter((item) =>
    item.group_link_id === link.group_link_id
  )) {
    const existingTerminationTime = toTime(existingTermination.terminated_at);
    if (
      !Number.isFinite(existingTerminationTime) ||
      existingTerminationTime <= validFromTime ||
      (validUntilTime !== null && existingTerminationTime > validUntilTime)
    ) {
      return decision(false, "GROUP_LINK_TERMINATION_TIME_INVALID");
    }
  }
  if (terminatedAtTime <= validFromTime) {
    return decision(false, "GROUP_LINK_TERMINATION_TIME_INVALID");
  }
  if (validUntilTime !== null && terminatedAtTime > validUntilTime) {
    return decision(false, "GROUP_LINK_TERMINATION_TIME_INVALID");
  }
  if (hasDependentGroupEvent(link, input, context)) {
    return decision(false, "GROUP_LINK_TERMINATION_AFTER_DEPENDENT_EVENT_REQUIRED");
  }
  if (!isUuid(input.terminated_by)) return decision(false, "GROUP_LINK_TERMINATED_BY_MUST_BE_UUID");
  if (!hasText(input.reason)) return decision(false, "GROUP_LINK_TERMINATION_REASON_REQUIRED");
  return freezePlain({
    termination_id: input.termination_id,
    group_link_id: link.group_link_id,
    case_id: link.case_id,
    line_group_id: link.line_group_id,
    terminated_at: input.terminated_at,
    terminated_by: input.terminated_by,
    reason: input.reason,
  });
}

export function validateDrsContractVocabulary(value) {
  const serialized = JSON.stringify(value ?? {});
  const rejected = FORBIDDEN_WORKFLOW_TERMS.find((pattern) => pattern.test(serialized));
  if (rejected) return decision(false, "OBSOLETE_WORKFLOW_VOCABULARY_REJECTED");
  return decision(true, "DRS_VOCABULARY_ACCEPTED");
}

export function canIngestLineEvent(input = {}, context = {}) {
  if (input.message_state !== "SENT") {
    return decision(false, "ONLY_SENT_LINE_EVENTS_CAN_BE_INGESTED");
  }
  if (input.case_id !== getCaseId(context)) return decision(false, "LINE_EVENT_CASE_MISMATCH");
  const link = activeGroupLinkFor(input, context);
  if (!link) return decision(false, "LINE_GROUP_NOT_FORMALLY_LINKED");
  return decision(true, "LINE_EVENT_INGEST_ALLOWED", {
    group_link_id: link.group_link_id,
  });
}

export function appendAuditEvent(event = {}, context = {}) {
  const envelope = requireEnvelope(event, context);
  if (!envelope.ok) return envelope;

  let payloadResult;
  if (event.event_type === "LINE_SENT_EVENT") payloadResult = validateLineSentPayload(event, context);
  if (event.event_type === "AI_REVIEW") payloadResult = validateAiReviewPayload(event, context);
  if (event.event_type === "HUMAN_DECISION") payloadResult = validateHumanDecisionPayload(event, context);
  if (event.event_type === "FINAL_MESSAGE") payloadResult = validateFinalMessagePayload(event, context);
  if (event.event_type === "RECEIPT") payloadResult = validateReceiptPayload(event, context);
  if (event.event_type === "WORK_ITEM_TRANSITION") {
    payloadResult = validateWorkItemTransitionAuditPayload(event, context);
  }

  if (!payloadResult?.ok) return payloadResult;
  const vocabulary = validateDrsContractVocabulary(event);
  if (!vocabulary.ok) return vocabulary;
  return freezePlain(canonicalizeAcceptedEvent(event));
}

export function appendAiReviewEvent(input = {}, context = {}) {
  const trustedEvent = buildTrustedAiReviewEvent(input);
  if (!trustedEvent.event_id) return trustedEvent;
  return appendAuditEvent(
    trustedEvent,
    withTrustedAiReviewHash(context, trustedEvent.payload.submitted_snapshot_sha256),
  );
}

export function appendAiReviewEventThroughGuardedWriter(input = {}, context = {}) {
  const trustedEvent = buildTrustedAiReviewEvent(input);
  if (!trustedEvent.event_id) return trustedEvent;
  return appendAuditEventThroughGuardedWriter(
    trustedEvent,
    withTrustedAiReviewHash(context, trustedEvent.payload.submitted_snapshot_sha256),
  );
}

export function appendAuditEventThroughGuardedWriter(event = {}, context = {}) {
  const canonicalEventOccurredAt = canonicalOccurredAt(event.occurred_at);
  if (!canonicalEventOccurredAt) {
    return decision(false, "AUDIT_EVENT_OCCURRED_AT_INVALID");
  }
  const candidateEvent = { ...event, occurred_at: canonicalEventOccurredAt };
  const candidateIdentity = eventIdentitySnapshot(candidateEvent);
  const existingById = findEvent(context.existingEvents, event.event_id);
  if (existingById) {
    const existingIdentity = eventIdentitySnapshot(existingById);
    if (!existingIdentity) return decision(false, "AUDIT_EVENT_IDENTITY_REUSE_CONFLICT");
    if (sameIdentity(existingIdentity, candidateIdentity)) {
      return decision(true, "AUDIT_EVENT_REPLAY_ACCEPTED", { audit_event_id: existingById.event_id });
    }
    return decision(false, "AUDIT_EVENT_IDENTITY_REUSE_CONFLICT");
  }

  if (event.event_type === "LINE_SENT_EVENT") {
    const existingByTransport = (context.existingEvents ?? []).find((existing) =>
      existing.event_type === "LINE_SENT_EVENT" &&
      existing.source?.surface === "LINE" &&
      existing.source?.group_link_id === event.source?.group_link_id &&
      existing.source?.transport_message_id === event.source?.transport_message_id
    );
    if (existingByTransport) {
      const existingIdentity = eventIdentitySnapshot(existingByTransport);
      if (!existingIdentity) return decision(false, "LINE_TRANSPORT_IDENTITY_REUSE_CONFLICT");
      if (sameIdentity(existingIdentity, candidateIdentity)) {
        return decision(true, "AUDIT_EVENT_REPLAY_ACCEPTED", { audit_event_id: existingByTransport.event_id });
      }
      return decision(false, "LINE_TRANSPORT_IDENTITY_REUSE_CONFLICT");
    }
  }

  const appended = appendAuditEvent(candidateEvent, context);
  if (!appended.event_id) return appended;
  return decision(true, "AUDIT_EVENT_APPENDED", { audit_event_id: appended.event_id });
}

export function createEventChainVerifier(events = []) {
  if (!Array.isArray(events) || events.length === 0) {
    return decision(false, "AUDIT_CHAIN_EMPTY");
  }
  const caseIds = new Set(events.map((event) => event.case_id));
  if (caseIds.size !== 1) return decision(false, "AUDIT_CHAIN_MIXED_CASE");
  const ids = new Set();
  const successorByPrevious = new Map();
  const rootsByCase = new Map();
  for (const event of events) {
    const eventTime = toTime(event.occurred_at);
    if (!Number.isFinite(eventTime)) return decision(false, "AUDIT_EVENT_OCCURRED_AT_INVALID");
    if (ids.has(event.event_id)) return decision(false, "AUDIT_EVENT_ID_DUPLICATE");
    ids.add(event.event_id);
    if (event.previous_event_id === event.event_id) {
      return decision(false, "AUDIT_EVENT_SELF_REFERENCE_FORBIDDEN");
    }
    if (event.previous_event_id === null) {
      rootsByCase.set(event.case_id, (rootsByCase.get(event.case_id) ?? 0) + 1);
    } else {
      if (successorByPrevious.has(event.previous_event_id)) {
        return decision(false, "PREVIOUS_EVENT_ALREADY_HAS_SUCCESSOR");
      }
      successorByPrevious.set(event.previous_event_id, event.event_id);
      const previous = findEvent(events, event.previous_event_id);
      if (!previous) return decision(false, "PREVIOUS_EVENT_ID_CHAIN_INVALID");
      if (previous.case_id !== event.case_id) return decision(false, "PREVIOUS_EVENT_CASE_MISMATCH");
      const previousTime = toTime(previous.occurred_at);
      if (!Number.isFinite(previousTime)) return decision(false, "AUDIT_EVENT_OCCURRED_AT_INVALID");
      if (previousTime > eventTime) {
        return decision(false, "PREVIOUS_EVENT_CHRONOLOGY_INVALID");
      }
    }
  }
  for (const count of rootsByCase.values()) {
    if (count !== 1) return decision(false, "AUDIT_CHAIN_ROOT_COUNT_INVALID");
  }
  const byId = new Map(events.map((event) => [event.event_id, event]));
  for (const event of events) {
    let cursor = event;
    const seen = new Set();
    while (cursor.previous_event_id !== null) {
      if (seen.has(cursor.event_id)) return decision(false, "AUDIT_CHAIN_CYCLE_INVALID");
      seen.add(cursor.event_id);
      cursor = byId.get(cursor.previous_event_id);
      if (!cursor) return decision(false, "PREVIOUS_EVENT_ID_CHAIN_INVALID");
      if (cursor.case_id !== event.case_id) return decision(false, "PREVIOUS_EVENT_CASE_MISMATCH");
    }
  }
  const tailEvents = events.filter((event) => !successorByPrevious.has(event.event_id));
  if (tailEvents.length !== rootsByCase.size) return decision(false, "AUDIT_CHAIN_TAIL_COUNT_INVALID");
  return decision(true, "AUDIT_CHAIN_VALID", {
    tail_event_id: tailEvents[0].event_id,
  });
}

export function createWorkItem(input = {}) {
  if (!REVIEW_WORK_ITEM_TYPES.includes(input.work_item_type)) {
    return decision(false, "WORK_ITEM_TYPE_INVALID");
  }
  const workItemIdError = requireUuid(input.work_item_id, "WORK_ITEM_ID_MUST_BE_UUID");
  if (workItemIdError) return workItemIdError;
  const caseIdError = requireUuid(input.case_id, "CASE_ID_MUST_BE_UUID");
  if (caseIdError) return caseIdError;
  const requestedByError = requireUuid(input.requested_by, "REQUESTED_BY_MUST_BE_UUID");
  if (requestedByError) return requestedByError;
  if (!Number.isFinite(toTime(input.created_at))) return decision(false, "WORK_ITEM_CREATED_AT_INVALID");
  if (!hasWorkItemSubjectRefShape(input.work_item_type, input.subject_ref)) {
    return decision(false, "WORK_ITEM_SUBJECT_REF_INVALID");
  }
  const workItem = {
    work_item_id: input.work_item_id,
    case_id: input.case_id,
    work_item_type: input.work_item_type,
    subject_ref: normalizeSubjectRef(input.subject_ref),
    requested_by: input.requested_by,
    created_at: input.created_at,
    state: "WAITING_FOR_SPECIALIST_REVIEW",
    next_actor: "DRS_SPECIALIST",
    transitions: [],
  };
  return freezePlain(workItem);
}

function resolveTransitionState(workItem, transition) {
  const key = `${workItem.state}:${transition.action}:${transition.actor_type}`;
  if (
    key === "WAITING_FOR_SPECIALIST_REVIEW:MARK_REVIEW_COMPLETED_ATTENTION:drs_specialist" ||
    key === "WAITING_FOR_SPECIALIST_REVIEW:MARK_REVIEW_COMPLETED_NO_FLAG:drs_specialist"
  ) {
    return { state: "WAITING_FOR_OWNER_DECISION", next_actor: "OWNER" };
  }
  if (key === "WAITING_FOR_OWNER_DECISION:OWNER_CONFIRMED:owner") {
    return { state: "CLOSED_RECORDED", next_actor: "NONE" };
  }
  return null;
}

export function transitionWorkItem(workItem = {}, transition = {}, context = {}) {
  const transitionIdError = requireUuid(transition.transition_id, "WORK_ITEM_TRANSITION_ID_MUST_BE_UUID");
  if (transitionIdError) return transitionIdError;
  const auditEventIdError = requireUuid(transition.audit_event_id, "AUDIT_EVENT_ID_MUST_BE_UUID");
  if (auditEventIdError) return auditEventIdError;
  if (!Number.isFinite(toTime(transition.occurred_at))) {
    return decision(false, "WORK_ITEM_TRANSITION_OCCURRED_AT_INVALID");
  }
  if (transition.case_id !== workItem.case_id) return decision(false, "WORK_ITEM_TRANSITION_CASE_MISMATCH");
  const auditEvent = findEvent(context.auditEvents, transition.audit_event_id);
  if (!auditEvent || auditEvent.case_id !== transition.case_id) {
    return decision(false, "WORK_ITEM_TRANSITION_AUDIT_EVENT_REQUIRED");
  }
  if (auditEvent.event_type !== "WORK_ITEM_TRANSITION") {
    return decision(false, "WORK_ITEM_TRANSITION_AUDIT_EVENT_TYPE_INVALID");
  }
  if (auditEvent.actor?.actor_type !== transition.actor_type || auditEvent.actor?.actor_id !== transition.actor_id) {
    return decision(false, "WORK_ITEM_TRANSITION_AUDIT_ACTOR_MISMATCH");
  }
  if (auditEvent.payload?.work_item_id !== workItem.work_item_id) {
    return decision(false, "WORK_ITEM_TRANSITION_AUDIT_EVENT_REQUIRED");
  }
  if (auditEvent.payload?.action !== transition.action) {
    return decision(false, "WORK_ITEM_TRANSITION_AUDIT_ACTION_MISMATCH");
  }
  if (!sameSubjectRef(auditEvent.payload?.subject_ref, workItem.subject_ref)) {
    return decision(false, "WORK_ITEM_TRANSITION_AUDIT_SUBJECT_MISMATCH");
  }
  if (toTime(auditEvent.occurred_at) !== toTime(transition.occurred_at)) {
    return decision(false, "WORK_ITEM_TRANSITION_EVIDENCE_TIME_MISMATCH");
  }
  if (transition.actor_type === "drs_specialist" && !activeSpecialistAssignmentFor({
    case_id: transition.case_id,
    specialist_id: transition.actor_id,
    at: transition.occurred_at,
  }, context)) {
    if (specialistAuthorityKnownInactive(transition.actor_id, context)) {
      return decision(false, "SPECIALIST_AUTHORITY_NOT_ACTIVE");
    }
    return decision(false, "WORK_ITEM_TRANSITION_SPECIALIST_NOT_ACTIVE");
  }
  if (transition.actor_type === "owner" && transition.actor_id !== context.caseIdentity?.owner_id) {
    return decision(false, "WORK_ITEM_TRANSITION_OWNER_REQUIRED");
  }
  const next = resolveTransitionState(workItem, transition);
  if (!next) return decision(false, "WORK_ITEM_TRANSITION_INVALID");
  const record = {
    transition_id: transition.transition_id,
    work_item_id: workItem.work_item_id,
    case_id: transition.case_id,
    audit_event_id: transition.audit_event_id,
    from_state: workItem.state,
    to_state: next.state,
    next_actor: next.next_actor,
    action: transition.action,
    actor_type: transition.actor_type,
    actor_id: transition.actor_id,
    occurred_at: transition.occurred_at,
  };
  return freezePlain({
    ...workItem,
    state: next.state,
    next_actor: next.next_actor,
    transitions: [...(workItem.transitions ?? []), record],
  });
}

export function classifyPrivacyScope(input = {}) {
  if (["UNSENT_DRAFT", "DRAFT", "KEYSTROKE"].includes(input.message_state)) {
    return decision(false, "UNSENT_OR_DRAFT_DATA_FORBIDDEN");
  }
  if (input.surface !== "LINE") {
    return decision(false, "UNRELATED_CHAT_DATA_FORBIDDEN");
  }
  if (input.message_state !== "SENT") {
    return decision(false, "ONLY_SENT_LINE_EVENTS_CAN_BE_INGESTED");
  }
  return decision(true, "PRIVACY_SCOPE_ALLOWED");
}

export function validateHumanOutboundDecision(input = {}, context = {}) {
  if (!HUMAN_OUTBOUND_DECISIONS.includes(input.decision)) {
    return decision(false, "HUMAN_DECISION_INVALID");
  }
  if (!isUuid(input.specialist_id)) return decision(false, "SPECIALIST_ID_MUST_BE_UUID");
  if (context.case_id) {
    if (specialistAuthorityKnownInactive(input.specialist_id, context)) {
      return decision(false, "SPECIALIST_AUTHORITY_NOT_ACTIVE");
    }
    const activeAssignment = activeSpecialistAssignmentFor({
      case_id: context.case_id,
      specialist_id: input.specialist_id,
      at: context.at,
    }, {
      now: context.at,
      specialists: context.specialists,
      specialistAssignments: context.specialistAssignments,
      assignmentTerminations: context.assignmentTerminations,
    });
    if (!activeAssignment) return decision(false, "SPECIALIST_ASSIGNMENT_NOT_ACTIVE");
  }
  if (["EDIT_AND_SEND", "OVERRIDE_AND_SEND", "MANUAL_EXCEPTION_SEND", "PRE_SEND_REVIEW_NOT_PERFORMED_BREAK_GLASS"].includes(input.decision) && !hasText(input.reason)) {
    return decision(false, "HUMAN_DECISION_REASON_REQUIRED");
  }
  if (["MANUAL_EXCEPTION_SEND", "PRE_SEND_REVIEW_NOT_PERFORMED_BREAK_GLASS"].includes(input.decision)) {
    if (!hasText(input.urgency)) return decision(false, "MANUAL_EXCEPTION_URGENCY_REQUIRED");
    if (!hasText(input.incident_id)) return decision(false, "MANUAL_EXCEPTION_INCIDENT_REQUIRED");
  }
  return decision(true, "HUMAN_OUTBOUND_DECISION_VALID");
}
