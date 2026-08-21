import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const MODULE_PATH = "../src/lib/drs-core/index.mjs";
const UUID = Object.freeze({
  case: "11111111-1111-4111-8111-111111111111",
  otherCase: "11111111-1111-4111-8111-222222222222",
  owner: "22222222-2222-4222-8222-222222222222",
  specialist: "33333333-3333-4333-8333-333333333333",
  otherSpecialist: "33333333-3333-4333-8333-444444444444",
  commander: "44444444-4444-4444-8444-444444444444",
  groupLink: "55555555-5555-4555-8555-555555555555",
  otherGroupLink: "55555555-5555-4555-8555-666666666666",
  thirdGroupLink: "55555555-5555-4555-8555-777777777777",
  assignment: "66666666-6666-4666-8666-666666666666",
  otherAssignment: "66666666-6666-4666-8666-777777777777",
  assignmentTermination: "66666666-6666-4666-8666-888888888888",
  groupTermination: "66666666-6666-4666-8666-999999999999",
  lineEvent: "77777777-7777-4777-8777-777777777777",
  aiReview: "88888888-8888-4888-8888-888888888888",
  humanDecision: "99999999-9999-4999-8999-999999999999",
  finalMessage: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  receipt: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
  workItem: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
  transition: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
  document: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
  drawing: "ffffffff-ffff-4fff-8fff-ffffffffffff",
  review: "12345678-1234-4234-8234-123456789abc",
});
const SNAPSHOT_BODY = "AI 送審快照內容。";
const OTHER_SNAPSHOT_BODY = "AI 送審快照內容已由人工調整。";

function finalSnapshotHash(finalText) {
  return createHash("sha256").update(finalText, "utf8").digest("hex");
}

const SNAPSHOT_SHA = finalSnapshotHash(SNAPSHOT_BODY);
const OTHER_SNAPSHOT_SHA = finalSnapshotHash(OTHER_SNAPSHOT_BODY);

function resultDifference(submittedSnapshotSha256, finalSnapshotSha256) {
  return {
    submitted_snapshot_sha256: submittedSnapshotSha256,
    final_snapshot_sha256: finalSnapshotSha256,
    content_changed: submittedSnapshotSha256 !== finalSnapshotSha256,
  };
}

function breakGlassResult(finalSnapshotSha256) {
  return {
    ai_review_performed: false,
    final_snapshot_sha256: finalSnapshotSha256,
  };
}

function validAiReviewAppendInput(overrides = {}) {
  const overridePayload = overrides.payload ?? {};
  return validEnvelope({
    event_id: UUID.aiReview,
    event_type: "AI_REVIEW",
    previous_event_id: UUID.lineEvent,
    occurred_at: "2026-08-20T10:01:00+08:00",
    actor: { actor_type: "ai_service", actor_id: "DRS-AI-ADVISORY" },
    source: { surface: "SYSTEM" },
    submitted_snapshot_body: SNAPSHOT_BODY,
    ...overrides,
    payload: {
      review_id: UUID.review,
      review_status: "REVIEW_COMPLETED_ATTENTION",
      reviewed_event_id: UUID.lineEvent,
      flags: [{ code: "MISSING_ATTACHMENT_CONTEXT", severity: "attention" }],
      findings: [],
      ...overridePayload,
    },
  });
}

function validEditAndSendPayload(overrides = {}) {
  const finalSnapshotId = overrides.final_snapshot_id ?? OTHER_SNAPSHOT_SHA;
  const diff = overrides.result_difference ?? resultDifference(SNAPSHOT_SHA, finalSnapshotId);
  return {
    decision: "EDIT_AND_SEND",
    reason: "已人工修正文句後送出。",
    urgency: "",
    incident_id: null,
    ai_review_event_id: UUID.aiReview,
    final_snapshot_id: finalSnapshotId,
    result_difference: diff,
    ...overrides,
  };
}

async function loadContract() {
  try {
    return await import(`${MODULE_PATH}?cache=${Date.now()}`);
  } catch (error) {
    assert.fail(`drs-core contract module must be loadable: ${error.message}`);
  }
}

function sqlSource() {
  return readFileSync(
    new URL("../supabase/migrations/20260820090000_drs_core_case_audit_contract.sql", import.meta.url),
    "utf8",
  );
}

function validCase(overrides = {}) {
  return {
    case_id: UUID.case,
    case_number: "DRS-CASE-20260820-001",
    owner_id: UUID.owner,
    case_state: "ACTIVE_REVIEW",
    opened_at: "2026-08-20T09:00:00+08:00",
    ...overrides,
  };
}

function validFormalGroup(overrides = {}) {
  return {
    group_link_id: UUID.groupLink,
    case_id: UUID.case,
    line_group_id: "LINE-GROUP-001",
    group_kind: "DRS_CASE_GROUP",
    linked_by_specialist_id: UUID.specialist,
    valid_from: "2026-08-20T09:30:00+08:00",
    valid_until: "2026-09-20T09:30:00+08:00",
    ...overrides,
  };
}

function validSpecialistAssignment(overrides = {}) {
  return {
    assignment_id: UUID.assignment,
    case_id: UUID.case,
    specialist_id: UUID.specialist,
    assigned_by: UUID.commander,
    valid_from: "2026-08-20T09:20:00+08:00",
    valid_until: null,
    ...overrides,
  };
}

function validSpecialist(overrides = {}) {
  return {
    specialist_id: UUID.specialist,
    authority_state: "ACTIVE",
    ...overrides,
  };
}

function validAssignmentTermination(overrides = {}) {
  return {
    termination_id: UUID.assignmentTermination,
    assignment_id: UUID.assignment,
    case_id: UUID.case,
    specialist_id: UUID.specialist,
    terminated_at: "2026-08-21T09:00:00+08:00",
    terminated_by: UUID.commander,
    reason: "交接給下一位 DRS 專員。",
    ...overrides,
  };
}

function validEnvelope(overrides = {}) {
  return {
    event_id: UUID.lineEvent,
    case_id: UUID.case,
    event_type: "LINE_SENT_EVENT",
    occurred_at: "2026-08-20T10:00:00+08:00",
    actor: {
      actor_type: "owner",
      actor_id: UUID.owner,
    },
    source: {
      surface: "LINE",
      group_link_id: UUID.groupLink,
      transport_message_id: "LINE-MSG-001",
    },
    previous_event_id: null,
    payload: {
      message_state: "SENT",
      message_kind: "TEXT",
      sent_text: "請協助確認這版平面圖。",
      attachment_refs: [],
    },
    ...overrides,
  };
}

function validContext(overrides = {}) {
  return {
    caseIdentity: validCase(),
    groupLinks: [validFormalGroup()],
    specialists: [validSpecialist()],
    specialistAssignments: [validSpecialistAssignment()],
    now: "2026-08-20T10:30:00+08:00",
    existingEvents: [],
    ...overrides,
  };
}

function appendSequence(contract, context = validContext()) {
  const lineEvent = contract.appendAuditEvent(validEnvelope(), context);
  const aiReview = contract.appendAiReviewEvent(
    validAiReviewAppendInput({
      previous_event_id: lineEvent.event_id,
      payload: {
        reviewed_event_id: lineEvent.event_id,
      },
    }),
    { ...context, existingEvents: [lineEvent] },
  );
  const finalText = "已依現場紀錄補充，請業主與廠商確認。";
  const finalHash = finalSnapshotHash(finalText);
  const humanDecision = contract.appendAuditEvent(
    validEnvelope({
      event_id: UUID.humanDecision,
      event_type: "HUMAN_DECISION",
      previous_event_id: aiReview.event_id,
      occurred_at: "2026-08-20T10:02:00+08:00",
      actor: { actor_type: "drs_specialist", actor_id: UUID.specialist },
      source: { surface: "DRS_WORKSPACE" },
      payload: {
        decision: "OVERRIDE_AND_SEND",
        reason: "依現場紀錄補充說明後送出。",
        urgency: "NORMAL",
        incident_id: null,
        ai_review_event_id: aiReview.event_id,
        final_snapshot_id: finalHash,
        result_difference: resultDifference(SNAPSHOT_SHA, finalHash),
      },
    }),
    { ...context, existingEvents: [lineEvent, aiReview] },
  );
  const finalMessage = contract.appendAuditEvent(
    validEnvelope({
      event_id: UUID.finalMessage,
      event_type: "FINAL_MESSAGE",
      previous_event_id: humanDecision.event_id,
      occurred_at: "2026-08-20T10:03:00+08:00",
      actor: { actor_type: "drs_specialist", actor_id: UUID.specialist },
      source: { surface: "DRS_WORKSPACE" },
      payload: {
        decision_event_id: humanDecision.event_id,
        final_snapshot_id: finalHash,
        final_text: finalText,
        transport_status: "ACCEPTED_BY_TRANSPORT",
      },
    }),
    { ...context, existingEvents: [lineEvent, aiReview, humanDecision] },
  );
  const receipt = contract.appendAuditEvent(
    validEnvelope({
      event_id: UUID.receipt,
      event_type: "RECEIPT",
      previous_event_id: finalMessage.event_id,
      occurred_at: "2026-08-20T10:04:00+08:00",
      actor: { actor_type: "system", actor_id: "DRS-AUDIT" },
      source: { surface: "SYSTEM" },
      recipient_read: false,
      payload: {
        final_message_event_id: finalMessage.event_id,
        receipt_kind: "TRANSPORT_ACCEPTED",
        recipient_read: false,
        transport_message_id: "LINE-MSG-FINAL-001",
        accepted_at: "2026-08-20T10:03:30+08:00",
        ingested_at: "2026-08-20T10:04:00+08:00",
      },
    }),
    { ...context, existingEvents: [lineEvent, aiReview, humanDecision, finalMessage] },
  );
  return { lineEvent, aiReview, humanDecision, finalMessage, receipt };
}

test("case and persisted identifiers use canonical UUID strings with display number separated", async () => {
  const {
    DRS_CORE_CONTRACT_VERSION,
    VALID_AI_REVIEW_STATUSES,
    normalizeCaseIdentity,
    validateFormalGroupLink,
    validateSpecialistAssignment,
    validateDrsContractVocabulary,
  } = await loadContract();

  assert.equal(DRS_CORE_CONTRACT_VERSION, "drs-core-case-audit-w1");
  assert.deepEqual(VALID_AI_REVIEW_STATUSES, [
    "REVIEW_COMPLETED_NO_FLAG",
    "REVIEW_COMPLETED_ATTENTION",
    "REVIEW_SERVICE_UNAVAILABLE",
  ]);

  assert.deepEqual(normalizeCaseIdentity(validCase()), validCase());
  assert.deepEqual(normalizeCaseIdentity(validCase({ case_id: "DRS-CASE-20260820-001" })), {
    ok: false,
    code: "CASE_ID_MUST_BE_UUID",
  });
  assert.deepEqual(validateFormalGroupLink(validFormalGroup(), validContext()), {
    ok: true,
    code: "FORMAL_GROUP_LINK_VALID",
  });
  assert.deepEqual(
    validateSpecialistAssignment(validSpecialistAssignment(), validContext()),
    { ok: true, code: "SPECIALIST_ASSIGNMENT_VALID" },
  );
  assert.deepEqual(validateDrsContractVocabulary({ label: "DRS backend preserves LINE-first decision trace only." }), {
    ok: true,
    code: "DRS_VOCABULARY_ACCEPTED",
  });

  for (const forbidden of ["tender", "bid", "award", "競標", "投標", "招標"]) {
    assert.equal(validateDrsContractVocabulary({ label: forbidden }).ok, false);
  }
});

test("formal group link and sent LINE ingest fail closed for wrong case, inactive interval, drafts, and unrelated payloads", async () => {
  const { validateFormalGroupLink, canIngestLineEvent, classifyPrivacyScope, appendAuditEvent } = await loadContract();
  const context = validContext();

  assert.deepEqual(validateFormalGroupLink(validFormalGroup({ case_id: UUID.otherCase }), context), {
    ok: false,
    code: "GROUP_LINK_CASE_MISMATCH",
  });
  assert.deepEqual(validateFormalGroupLink(validFormalGroup({ valid_until: "2026-08-20T10:29:59+08:00" }), context), {
    ok: false,
    code: "GROUP_LINK_NOT_ACTIVE",
  });
  assert.deepEqual(validateFormalGroupLink(validFormalGroup({ valid_from: "2026-08-20T10:31:00+08:00" }), context), {
    ok: false,
    code: "GROUP_LINK_NOT_ACTIVE",
  });
  assert.deepEqual(
    canIngestLineEvent({
      case_id: UUID.case,
      group_link_id: UUID.groupLink,
      sent_at: "2026-08-20T10:10:00+08:00",
      message_state: "SENT",
    }, context),
    { ok: true, code: "LINE_EVENT_INGEST_ALLOWED", group_link_id: UUID.groupLink },
  );
  assert.deepEqual(
    canIngestLineEvent({
      case_id: UUID.case,
      group_link_id: UUID.otherGroupLink,
      sent_at: "2026-08-20T10:10:00+08:00",
      message_state: "SENT",
    }, context),
    { ok: false, code: "LINE_GROUP_NOT_FORMALLY_LINKED" },
  );
  assert.deepEqual(classifyPrivacyScope({ surface: "LINE", message_state: "UNSENT_DRAFT" }), {
    ok: false,
    code: "UNSENT_OR_DRAFT_DATA_FORBIDDEN",
  });
  assert.deepEqual(classifyPrivacyScope({ surface: "LINE", message_state: "KEYSTROKE" }), {
    ok: false,
    code: "UNSENT_OR_DRAFT_DATA_FORBIDDEN",
  });
  assert.deepEqual(classifyPrivacyScope({ surface: "OTHER_CHAT", message_state: "SENT" }), {
    ok: false,
    code: "UNRELATED_CHAT_DATA_FORBIDDEN",
  });
  assert.deepEqual(
    appendAuditEvent(validEnvelope({ payload: { ...validEnvelope().payload, message_state: "DRAFT" } }), context),
    { ok: false, code: "ONLY_SENT_LINE_EVENTS_CAN_BE_INGESTED" },
  );
});

test("audit chain rejects self-reference, cross-case predecessors, duplicate successors, and predecessor time inversion", async () => {
  const contract = await loadContract();
  const context = validContext();
  const { lineEvent, aiReview, humanDecision, finalMessage, receipt } = appendSequence(contract, context);

  assert.deepEqual(contract.createEventChainVerifier([lineEvent, aiReview, humanDecision, finalMessage, receipt]), {
    ok: true,
    code: "AUDIT_CHAIN_VALID",
    tail_event_id: UUID.receipt,
  });
  assert.deepEqual(
    contract.appendAiReviewEvent(
      validAiReviewAppendInput({
        previous_event_id: UUID.aiReview,
        payload: {
          review_status: "REVIEW_COMPLETED_ATTENTION",
          reviewed_event_id: UUID.lineEvent,
          flags: [],
        },
      }),
      { ...context, existingEvents: [lineEvent] },
    ),
    { ok: false, code: "AUDIT_EVENT_SELF_REFERENCE_FORBIDDEN" },
  );
  assert.deepEqual(
    contract.appendAiReviewEvent(
      validAiReviewAppendInput({
        case_id: UUID.otherCase,
        payload: {
          review_status: "REVIEW_COMPLETED_ATTENTION",
          reviewed_event_id: UUID.lineEvent,
          flags: [],
        },
      }),
      { ...context, caseIdentity: validCase({ case_id: UUID.otherCase }), existingEvents: [lineEvent] },
    ),
    { ok: false, code: "PREVIOUS_EVENT_CASE_MISMATCH" },
  );
  assert.deepEqual(
    contract.appendAiReviewEvent(
      validAiReviewAppendInput({
        event_id: "12121212-1212-4121-8121-121212121212",
        previous_event_id: UUID.lineEvent,
        occurred_at: "2026-08-20T10:05:00+08:00",
        payload: {
          review_status: "REVIEW_COMPLETED_NO_FLAG",
          reviewed_event_id: UUID.lineEvent,
          flags: [],
        },
      }),
      { ...context, existingEvents: [lineEvent, aiReview] },
    ),
    { ok: false, code: "PREVIOUS_EVENT_ALREADY_HAS_SUCCESSOR" },
  );
  assert.deepEqual(
    contract.appendAiReviewEvent(
      validAiReviewAppendInput({
        event_id: "13131313-1313-4131-8131-131313131313",
        previous_event_id: UUID.lineEvent,
        occurred_at: "2026-08-20T09:59:59+08:00",
        payload: {
          review_status: "REVIEW_COMPLETED_NO_FLAG",
          reviewed_event_id: UUID.lineEvent,
          flags: [],
        },
      }),
      { ...context, existingEvents: [lineEvent] },
    ),
    { ok: false, code: "PREVIOUS_EVENT_CHRONOLOGY_INVALID" },
  );
});

test("audit chain rejects multiple roots and disconnected same-case fragments", async () => {
  const contract = await loadContract();
  const context = validContext();
  const { lineEvent, aiReview } = appendSequence(contract, context);
  const secondRoot = contract.appendAuditEvent(
    validEnvelope({
      event_id: "16161616-1616-4161-8161-161616161616",
      occurred_at: "2026-08-20T10:06:00+08:00",
      source: {
        surface: "LINE",
        group_link_id: UUID.groupLink,
        transport_message_id: "LINE-MSG-002",
      },
      payload: {
        message_state: "SENT",
        message_kind: "TEXT",
        sent_text: "第二個 root 應被拒絕。",
        attachment_refs: [],
      },
    }),
    { ...context, existingEvents: [lineEvent, aiReview] },
  );

  assert.deepEqual(secondRoot, { ok: false, code: "AUDIT_CHAIN_ROOT_ALREADY_EXISTS" });
  assert.deepEqual(
    contract.createEventChainVerifier([
      lineEvent,
      aiReview,
      {
        ...lineEvent,
        event_id: "17171717-1717-4171-8171-171717171717",
        previous_event_id: null,
      },
    ]),
    { ok: false, code: "AUDIT_CHAIN_ROOT_COUNT_INVALID" },
  );
  assert.deepEqual(
    contract.createEventChainVerifier([
      lineEvent,
      aiReview,
      {
        ...aiReview,
        event_id: "18181818-1818-4181-8181-181818181818",
        previous_event_id: "19191919-1919-4191-8191-191919191919",
      },
    ]),
    { ok: false, code: "PREVIOUS_EVENT_ID_CHAIN_INVALID" },
  );
});

test("audit chain verifier rejects mixed-case input with an exact code", async () => {
  const contract = await loadContract();
  const context = validContext();
  const { lineEvent, aiReview } = appendSequence(contract, context);
  const otherCaseRoot = {
    ...lineEvent,
    event_id: "12121212-1212-4121-8121-121212121212",
    case_id: UUID.otherCase,
    previous_event_id: null,
  };

  assert.deepEqual(
    contract.createEventChainVerifier([aiReview, otherCaseRoot, lineEvent]),
    { ok: false, code: "AUDIT_CHAIN_MIXED_CASE" },
  );
});

test("audit chain verifier derives tail independent of input order", async () => {
  const contract = await loadContract();
  const context = validContext();
  const { lineEvent, aiReview, humanDecision, finalMessage, receipt } = appendSequence(contract, context);

  assert.deepEqual(
    contract.createEventChainVerifier([receipt, humanDecision, lineEvent, finalMessage, aiReview]),
    {
      ok: true,
      code: "AUDIT_CHAIN_VALID",
      tail_event_id: UUID.receipt,
    },
  );
});

test("final message requires a prior same-case Human decision from the active assigned specialist", async () => {
  const contract = await loadContract();
  const context = validContext();
  const { lineEvent, aiReview, humanDecision } = appendSequence(contract, context);
  const approvedText = "已依現場紀錄補充，請業主與廠商確認。";
  const aiText = "AI 不能核准送出。";

  assert.deepEqual(
    contract.appendAuditEvent(
      validEnvelope({
        event_id: UUID.finalMessage,
        event_type: "FINAL_MESSAGE",
        previous_event_id: humanDecision.event_id,
        occurred_at: "2026-08-20T10:03:00+08:00",
        actor: { actor_type: "drs_specialist", actor_id: UUID.specialist },
        source: { surface: "DRS_WORKSPACE" },
      payload: {
        decision_event_id: humanDecision.event_id,
        final_snapshot_id: finalSnapshotHash(approvedText),
        final_text: approvedText,
        transport_status: "ACCEPTED_BY_TRANSPORT",
      },
      }),
      { ...context, existingEvents: [lineEvent, aiReview, humanDecision] },
    ).event_id,
    UUID.finalMessage,
  );
  assert.deepEqual(
    contract.appendAuditEvent(
      validEnvelope({
        event_id: UUID.finalMessage,
        event_type: "FINAL_MESSAGE",
        previous_event_id: aiReview.event_id,
        occurred_at: "2026-08-20T10:03:00+08:00",
        actor: { actor_type: "drs_specialist", actor_id: UUID.specialist },
        source: { surface: "DRS_WORKSPACE" },
        payload: {
        decision_event_id: aiReview.event_id,
        final_snapshot_id: finalSnapshotHash(aiText),
        final_text: aiText,
        transport_status: "ACCEPTED_BY_TRANSPORT",
      },
      }),
      { ...context, existingEvents: [lineEvent, aiReview] },
    ),
    { ok: false, code: "FINAL_MESSAGE_REQUIRES_HUMAN_DECISION" },
  );
  assert.deepEqual(
    contract.appendAuditEvent(
      validEnvelope({
        event_id: UUID.finalMessage,
        event_type: "FINAL_MESSAGE",
        previous_event_id: humanDecision.event_id,
        occurred_at: "2026-08-20T10:03:00+08:00",
        actor: { actor_type: "system", actor_id: "DRS-AUDIT" },
        source: { surface: "SYSTEM" },
        payload: {
        decision_event_id: humanDecision.event_id,
        final_snapshot_id: finalSnapshotHash(approvedText),
        final_text: approvedText,
        transport_status: "ACCEPTED_BY_TRANSPORT",
      },
      }),
      { ...context, existingEvents: [lineEvent, aiReview, humanDecision] },
    ),
    { ok: false, code: "FINAL_MESSAGE_SENDER_MUST_BE_ASSIGNED_SPECIALIST" },
  );
});

test("final message rejects non-specialist Human decisions, inactive decision-time assignment, system UUID senders, and snapshot mismatch", async () => {
  const contract = await loadContract();
  const context = validContext();
  const { lineEvent, aiReview, humanDecision } = appendSequence(contract, context);
  const ownerDecision = {
    ...humanDecision,
    event_id: "1a1a1a1a-1a1a-4a1a-8a1a-1a1a1a1a1a1a",
    actor: { actor_type: "owner", actor_id: UUID.owner },
    payload: {
      ...validEditAndSendPayload({
        final_snapshot_id: finalSnapshotHash("Owner decision cannot authorize."),
        result_difference: resultDifference(SNAPSHOT_SHA, finalSnapshotHash("Owner decision cannot authorize.")),
      }),
    },
  };
  const inactiveSpecialistDecision = {
    ...humanDecision,
    event_id: "1b1b1b1b-1b1b-4b1b-8b1b-1b1b1b1b1b1b",
    actor: { actor_type: "drs_specialist", actor_id: UUID.otherSpecialist },
    occurred_at: "2026-08-20T08:00:00+08:00",
    payload: {
      ...validEditAndSendPayload({
        final_snapshot_id: finalSnapshotHash("Inactive decision cannot authorize."),
        result_difference: resultDifference(SNAPSHOT_SHA, finalSnapshotHash("Inactive decision cannot authorize.")),
      }),
    },
  };

  assert.deepEqual(
    contract.appendAuditEvent(
      validEnvelope({
        event_id: UUID.finalMessage,
        event_type: "FINAL_MESSAGE",
        previous_event_id: ownerDecision.event_id,
        occurred_at: "2026-08-20T10:03:00+08:00",
        actor: { actor_type: "drs_specialist", actor_id: UUID.specialist },
        source: { surface: "DRS_WORKSPACE" },
        payload: {
          decision_event_id: ownerDecision.event_id,
          final_snapshot_id: finalSnapshotHash("Owner decision cannot authorize."),
          final_text: "Owner decision cannot authorize.",
          transport_status: "ACCEPTED_BY_TRANSPORT",
        },
      }),
      { ...context, existingEvents: [lineEvent, aiReview, ownerDecision] },
    ),
    { ok: false, code: "FINAL_MESSAGE_REQUIRES_SPECIALIST_DECISION" },
  );
  assert.deepEqual(
    contract.appendAuditEvent(
      validEnvelope({
        event_id: UUID.finalMessage,
        event_type: "FINAL_MESSAGE",
        previous_event_id: inactiveSpecialistDecision.event_id,
        occurred_at: "2026-08-20T10:03:00+08:00",
        actor: { actor_type: "drs_specialist", actor_id: UUID.otherSpecialist },
        source: { surface: "DRS_WORKSPACE" },
        payload: {
          decision_event_id: inactiveSpecialistDecision.event_id,
          final_snapshot_id: finalSnapshotHash("Inactive decision cannot authorize."),
          final_text: "Inactive decision cannot authorize.",
          transport_status: "ACCEPTED_BY_TRANSPORT",
        },
      }),
      { ...context, existingEvents: [lineEvent, aiReview, inactiveSpecialistDecision] },
    ),
    { ok: false, code: "FINAL_MESSAGE_DECISION_SPECIALIST_NOT_ACTIVE" },
  );
  assert.deepEqual(
    contract.appendAuditEvent(
      validEnvelope({
        event_id: UUID.finalMessage,
        event_type: "FINAL_MESSAGE",
        previous_event_id: humanDecision.event_id,
        occurred_at: "2026-08-20T10:03:00+08:00",
        actor: { actor_type: "system", actor_id: UUID.specialist },
        source: { surface: "SYSTEM" },
        payload: {
          decision_event_id: humanDecision.event_id,
          final_snapshot_id: humanDecision.payload.final_snapshot_id,
          final_text: "已依現場紀錄補充，請業主與廠商確認。",
          transport_status: "ACCEPTED_BY_TRANSPORT",
        },
      }),
      { ...context, existingEvents: [lineEvent, aiReview, humanDecision] },
    ),
    { ok: false, code: "FINAL_MESSAGE_SENDER_MUST_BE_ASSIGNED_SPECIALIST" },
  );
  assert.deepEqual(
    contract.appendAuditEvent(
      validEnvelope({
        event_id: UUID.finalMessage,
        event_type: "FINAL_MESSAGE",
        previous_event_id: humanDecision.event_id,
        occurred_at: "2026-08-20T10:03:00+08:00",
        actor: { actor_type: "drs_specialist", actor_id: UUID.specialist },
        source: { surface: "DRS_WORKSPACE" },
        payload: {
          decision_event_id: humanDecision.event_id,
          final_snapshot_id: finalSnapshotHash("Snapshot mismatch cannot authorize."),
          final_text: "Snapshot mismatch cannot authorize.",
          transport_status: "ACCEPTED_BY_TRANSPORT",
        },
      }),
      { ...context, existingEvents: [lineEvent, aiReview, humanDecision] },
    ),
    { ok: false, code: "FINAL_MESSAGE_SNAPSHOT_MISMATCH" },
  );
});

test("Human decision authority rejects terminated, suspended, system-source, AI-source, and malformed decisions", async () => {
  const contract = await loadContract();
  const context = validContext();
  const { lineEvent, aiReview } = appendSequence(contract, context);

  assert.deepEqual(
    contract.appendAuditEvent(
      validEnvelope({
        event_id: UUID.humanDecision,
        event_type: "HUMAN_DECISION",
        previous_event_id: aiReview.event_id,
        occurred_at: "2026-08-20T10:02:00+08:00",
        actor: { actor_type: "drs_specialist", actor_id: UUID.specialist },
        source: { surface: "DRS_WORKSPACE" },
        payload: {
          ...validEditAndSendPayload({
            ai_review_event_id: aiReview.event_id,
          }),
        },
      }),
      {
        ...context,
        assignmentTerminations: [
          validAssignmentTermination({ terminated_at: "2026-08-20T10:01:00+08:00" }),
        ],
        existingEvents: [lineEvent, aiReview],
      },
    ),
    { ok: false, code: "SPECIALIST_ASSIGNMENT_NOT_ACTIVE" },
  );
  assert.deepEqual(
    contract.appendAuditEvent(
      validEnvelope({
        event_id: UUID.humanDecision,
        event_type: "HUMAN_DECISION",
        previous_event_id: aiReview.event_id,
        occurred_at: "2026-08-20T10:02:00+08:00",
        actor: { actor_type: "drs_specialist", actor_id: UUID.specialist },
        source: { surface: "DRS_WORKSPACE" },
        payload: {
          ...validEditAndSendPayload({
            ai_review_event_id: aiReview.event_id,
          }),
        },
      }),
      {
        ...context,
        specialists: [validSpecialist({ authority_state: "SUSPENDED" })],
        existingEvents: [lineEvent, aiReview],
      },
    ),
    { ok: false, code: "SPECIALIST_AUTHORITY_NOT_ACTIVE" },
  );
  assert.deepEqual(
    contract.appendAuditEvent(
      validEnvelope({
        event_id: UUID.humanDecision,
        event_type: "HUMAN_DECISION",
        previous_event_id: aiReview.event_id,
        occurred_at: "2026-08-20T10:02:00+08:00",
        actor: { actor_type: "drs_specialist", actor_id: UUID.specialist },
        source: { surface: "SYSTEM" },
        payload: {
          ...validEditAndSendPayload({
            ai_review_event_id: aiReview.event_id,
          }),
        },
      }),
      { ...context, existingEvents: [lineEvent, aiReview] },
    ),
    { ok: false, code: "HUMAN_DECISION_SOURCE_INVALID" },
  );
  assert.deepEqual(
    contract.appendAuditEvent(
      validEnvelope({
        event_id: UUID.humanDecision,
        event_type: "HUMAN_DECISION",
        previous_event_id: aiReview.event_id,
        occurred_at: "2026-08-20T10:02:00+08:00",
        actor: { actor_type: "ai_service", actor_id: "DRS-AI-ADVISORY" },
        source: { surface: "SYSTEM" },
        payload: {
          ...validEditAndSendPayload({
            ai_review_event_id: aiReview.event_id,
          }),
        },
      }),
      { ...context, existingEvents: [lineEvent, aiReview] },
    ),
    { ok: false, code: "HUMAN_DECISION_SOURCE_INVALID" },
  );
  assert.deepEqual(
    contract.appendAuditEvent(
      validEnvelope({
        event_id: UUID.humanDecision,
        event_type: "HUMAN_DECISION",
        previous_event_id: aiReview.event_id,
        occurred_at: "2026-08-20T10:02:00+08:00",
        actor: { actor_type: "drs_specialist", actor_id: UUID.specialist },
        source: { surface: "DRS_WORKSPACE" },
        payload: {
          decision: "OVERRIDE_AND_SEND",
          reason: "",
          urgency: "NORMAL",
          incident_id: null,
          ai_review_event_id: aiReview.event_id,
          final_snapshot_id: SNAPSHOT_SHA,
          result_difference: resultDifference(SNAPSHOT_SHA, SNAPSHOT_SHA),
        },
      }),
      { ...context, existingEvents: [lineEvent, aiReview] },
    ),
    { ok: false, code: "HUMAN_DECISION_REASON_REQUIRED" },
  );
  assert.deepEqual(
    contract.appendAuditEvent(
      validEnvelope({
        event_id: UUID.humanDecision,
        event_type: "HUMAN_DECISION",
        previous_event_id: aiReview.event_id,
        occurred_at: "2026-08-20T10:02:00+08:00",
        actor: { actor_type: "drs_specialist", actor_id: UUID.specialist },
        source: { surface: "DRS_WORKSPACE" },
        payload: {
          decision: "MANUAL_EXCEPTION_SEND",
          reason: "緊急事件改由人工例外送出。",
          urgency: "HIGH",
          incident_id: "",
          ai_review_event_id: aiReview.event_id,
          final_snapshot_id: SNAPSHOT_SHA,
          result_difference: resultDifference(SNAPSHOT_SHA, SNAPSHOT_SHA),
        },
      }),
      { ...context, existingEvents: [lineEvent, aiReview] },
    ),
    { ok: false, code: "MANUAL_EXCEPTION_INCIDENT_REQUIRED" },
  );
});

test("specialist assignment history rejects finite overlaps and keeps records immutable", async () => {
  const { createSpecialistAssignmentTermination, validateSpecialistAssignment } = await loadContract();
  const context = validContext({
    specialistAssignments: [
      validSpecialistAssignment({
        valid_from: "2026-08-20T09:00:00+08:00",
        valid_until: "2026-08-20T12:00:00+08:00",
      }),
    ],
    now: "2026-08-20T11:00:00+08:00",
  });

  assert.deepEqual(
    validateSpecialistAssignment(
      validSpecialistAssignment({
        assignment_id: UUID.otherAssignment,
        specialist_id: UUID.otherSpecialist,
        valid_from: "2026-08-20T11:30:00+08:00",
        valid_until: "2026-08-20T13:00:00+08:00",
      }),
      context,
    ),
    { ok: false, code: "SPECIALIST_ASSIGNMENT_INTERVAL_OVERLAP" },
  );
  assert.deepEqual(
    validateSpecialistAssignment(
      validSpecialistAssignment({
        assignment_id: UUID.otherAssignment,
        specialist_id: UUID.otherSpecialist,
        valid_from: "2026-08-20T12:00:00+08:00",
        valid_until: "2026-08-20T13:00:00+08:00",
      }),
      { ...context, now: "2026-08-20T12:30:00+08:00" },
    ),
    { ok: true, code: "SPECIALIST_ASSIGNMENT_VALID" },
  );
  assert.deepEqual(
    validateSpecialistAssignment(
      validSpecialistAssignment({
        assignment_id: UUID.otherAssignment,
        specialist_id: UUID.otherSpecialist,
        valid_from: "2026-08-20T12:00:00+08:00",
        valid_until: null,
      }),
      {
        ...context,
        now: "2026-08-20T13:00:00+08:00",
        specialistAssignments: [
          validSpecialistAssignment({
            valid_from: "2026-08-20T09:00:00+08:00",
            valid_until: null,
          }),
        ],
      },
    ),
    { ok: false, code: "SPECIALIST_ASSIGNMENT_INTERVAL_OVERLAP" },
  );
  assert.deepEqual(
    createSpecialistAssignmentTermination(validSpecialistAssignment(), {
      termination_id: UUID.assignmentTermination,
      terminated_at: "2026-08-21T09:00:00+08:00",
      terminated_by: UUID.commander,
      reason: "交接給下一位 DRS 專員。",
    }),
    {
      termination_id: UUID.assignmentTermination,
      assignment_id: UUID.assignment,
      case_id: UUID.case,
      specialist_id: UUID.specialist,
      terminated_at: "2026-08-21T09:00:00+08:00",
      terminated_by: UUID.commander,
      reason: "交接給下一位 DRS 專員。",
    },
  );
  assert.deepEqual(
    validateSpecialistAssignment(
      validSpecialistAssignment({
        assignment_id: UUID.otherAssignment,
        specialist_id: UUID.otherSpecialist,
        valid_from: "2026-08-21T09:00:00+08:00",
        valid_until: null,
      }),
      {
        ...validContext({ now: "2026-08-21T09:30:00+08:00" }),
        assignmentTerminations: [{
          termination_id: UUID.assignmentTermination,
          assignment_id: UUID.assignment,
          case_id: UUID.case,
          specialist_id: UUID.specialist,
          terminated_at: "2026-08-21T09:00:00+08:00",
          terminated_by: UUID.commander,
          reason: "交接給下一位 DRS 專員。",
        }],
      },
    ),
    { ok: true, code: "SPECIALIST_ASSIGNMENT_VALID" },
  );
});

test("work-item transitions are append-only evidence linked to same-case audit events", async () => {
  const contract = await loadContract();
  const context = validContext();
  const { lineEvent, aiReview, humanDecision } = appendSequence(contract, context);
  const documentReview = contract.createWorkItem({
    work_item_id: UUID.workItem,
    case_id: UUID.case,
    work_item_type: "DOCUMENT_REVIEW",
    subject_ref: { document_id: UUID.document, version: "v1" },
    requested_by: UUID.owner,
    created_at: "2026-08-20T10:00:00+08:00",
  });
  const reviewCompletedEvent = contract.appendAuditEvent(
    validEnvelope({
      event_id: "1c1c1c1c-1c1c-4c1c-8c1c-1c1c1c1c1c1c",
      event_type: "WORK_ITEM_TRANSITION",
      previous_event_id: humanDecision.event_id,
      occurred_at: "2026-08-20T10:30:00+08:00",
      actor: { actor_type: "drs_specialist", actor_id: UUID.specialist },
      source: { surface: "DRS_WORKSPACE" },
      payload: {
        work_item_id: UUID.workItem,
        action: "MARK_REVIEW_COMPLETED_ATTENTION",
        subject_ref: { version: "v1", document_id: UUID.document },
      },
    }),
    { ...context, existingEvents: [lineEvent, aiReview, humanDecision], workItems: [documentReview] },
  );

  const reviewed = contract.transitionWorkItem(documentReview, {
    transition_id: UUID.transition,
    audit_event_id: reviewCompletedEvent.event_id,
    case_id: UUID.case,
    action: "MARK_REVIEW_COMPLETED_ATTENTION",
    actor_type: "drs_specialist",
    actor_id: UUID.specialist,
    occurred_at: "2026-08-20T10:30:00+08:00",
  }, { ...context, auditEvents: [lineEvent, aiReview, humanDecision, reviewCompletedEvent] });
  assert.equal(reviewed.state, "WAITING_FOR_OWNER_DECISION");
  assert.equal(reviewed.next_actor, "OWNER");
  assert.equal(reviewed.transitions.length, 1);
  assert.equal(reviewed.transitions[0].audit_event_id, reviewCompletedEvent.event_id);
  assert.equal(reviewed.transitions[0].occurred_at, "2026-08-20T10:30:00+08:00");

  assert.deepEqual(
    contract.transitionWorkItem(documentReview, {
      transition_id: "10101010-1010-4010-8010-101010101010",
      audit_event_id: reviewCompletedEvent.event_id,
      case_id: UUID.case,
      action: "MARK_REVIEW_COMPLETED_ATTENTION",
      actor_type: "drs_specialist",
      actor_id: UUID.specialist,
      occurred_at: "2026-08-20T11:00:00+08:00",
    }, { ...context, auditEvents: [lineEvent, aiReview, humanDecision, reviewCompletedEvent] }),
    { ok: false, code: "WORK_ITEM_TRANSITION_EVIDENCE_TIME_MISMATCH" },
  );

  assert.deepEqual(
    contract.transitionWorkItem(documentReview, {
      transition_id: UUID.transition,
      audit_event_id: "14141414-1414-4141-8141-141414141414",
      case_id: UUID.case,
      action: "MARK_REVIEW_COMPLETED_ATTENTION",
      actor_type: "drs_specialist",
      actor_id: UUID.specialist,
      occurred_at: "2026-08-20T10:30:00+08:00",
    }, { ...context, auditEvents: [lineEvent, aiReview, humanDecision, reviewCompletedEvent] }),
    { ok: false, code: "WORK_ITEM_TRANSITION_AUDIT_EVENT_REQUIRED" },
  );
  const noFlagEvent = contract.appendAuditEvent(
    validEnvelope({
      event_id: "1e1e1e1e-1e1e-4e1e-8e1e-1e1e1e1e1e1e",
      event_type: "WORK_ITEM_TRANSITION",
      previous_event_id: reviewCompletedEvent.event_id,
      occurred_at: "2026-08-20T11:01:00+08:00",
      actor: { actor_type: "drs_specialist", actor_id: UUID.specialist },
      source: { surface: "DRS_WORKSPACE" },
      payload: {
        work_item_id: UUID.workItem,
        action: "MARK_REVIEW_COMPLETED_NO_FLAG",
        subject_ref: { document_id: UUID.document, version: "v1" },
      },
    }),
    { ...context, existingEvents: [lineEvent, aiReview, humanDecision, reviewCompletedEvent], workItems: [documentReview] },
  );
  assert.deepEqual(
    contract.transitionWorkItem(reviewed, {
      transition_id: "15151515-1515-4151-8151-151515151515",
      audit_event_id: noFlagEvent.event_id,
      case_id: UUID.case,
      action: "MARK_REVIEW_COMPLETED_NO_FLAG",
      actor_type: "drs_specialist",
      actor_id: UUID.specialist,
      occurred_at: "2026-08-20T11:01:00+08:00",
    }, { ...context, auditEvents: [lineEvent, aiReview, humanDecision, reviewCompletedEvent, noFlagEvent] }),
    { ok: false, code: "WORK_ITEM_TRANSITION_INVALID" },
  );
  assert.deepEqual(
    contract.transitionWorkItem(documentReview, {
      transition_id: "1d1d1d1d-1d1d-4d1d-8d1d-1d1d1d1d1d1d",
      audit_event_id: humanDecision.event_id,
      case_id: UUID.case,
      action: "MARK_REVIEW_COMPLETED_ATTENTION",
      actor_type: "drs_specialist",
      actor_id: UUID.specialist,
      occurred_at: "2026-08-20T11:05:00+08:00",
    }, { ...context, auditEvents: [lineEvent, aiReview, humanDecision, reviewCompletedEvent] }),
    { ok: false, code: "WORK_ITEM_TRANSITION_AUDIT_EVENT_TYPE_INVALID" },
  );
});

test("work-item transitions enforce actor authority, finite time, owner confirmation, and audit actor parity", async () => {
  const contract = await loadContract();
  const context = validContext();
  const { lineEvent, aiReview, humanDecision } = appendSequence(contract, context);
  const documentReview = contract.createWorkItem({
    work_item_id: UUID.workItem,
    case_id: UUID.case,
    work_item_type: "DOCUMENT_REVIEW",
    subject_ref: { document_id: UUID.document, version: "v1" },
    requested_by: UUID.owner,
    created_at: "2026-08-20T10:00:00+08:00",
  });
  const specialistEvent = contract.appendAuditEvent(
    validEnvelope({
      event_id: "20202020-2020-4020-8020-202020202020",
      event_type: "WORK_ITEM_TRANSITION",
      previous_event_id: humanDecision.event_id,
      occurred_at: "2026-08-20T10:30:00+08:00",
      actor: { actor_type: "drs_specialist", actor_id: UUID.specialist },
      source: { surface: "DRS_WORKSPACE" },
      payload: {
        work_item_id: UUID.workItem,
        action: "MARK_REVIEW_COMPLETED_ATTENTION",
        subject_ref: { document_id: UUID.document, version: "v1" },
      },
    }),
    { ...context, existingEvents: [lineEvent, aiReview, humanDecision], workItems: [documentReview] },
  );
  const unassignedSpecialistEvent = {
    ...specialistEvent,
    event_id: "21212121-2121-4121-8121-212121212121",
    actor: { actor_type: "drs_specialist", actor_id: UUID.otherSpecialist },
  };
  const ownerEvent = {
    ...specialistEvent,
    event_id: "22222222-2222-4222-8222-333333333333",
    occurred_at: "2026-08-20T11:10:00+08:00",
    actor: { actor_type: "owner", actor_id: UUID.owner },
    payload: {
      work_item_id: UUID.workItem,
      action: "OWNER_CONFIRMED",
      subject_ref: { document_id: UUID.document, version: "v1" },
    },
  };
  const otherOwnerEvent = {
    ...ownerEvent,
    event_id: "23232323-2323-4232-8232-232323232323",
    actor: { actor_type: "owner", actor_id: UUID.otherSpecialist },
  };
  const reviewed = contract.transitionWorkItem(documentReview, {
    transition_id: UUID.transition,
    audit_event_id: specialistEvent.event_id,
    case_id: UUID.case,
    action: "MARK_REVIEW_COMPLETED_ATTENTION",
    actor_type: "drs_specialist",
    actor_id: UUID.specialist,
    occurred_at: "2026-08-20T10:30:00+08:00",
  }, { ...context, auditEvents: [lineEvent, aiReview, humanDecision, specialistEvent] });

  assert.deepEqual(
    contract.transitionWorkItem(documentReview, {
      transition_id: "24242424-2424-4242-8242-242424242424",
      audit_event_id: specialistEvent.event_id,
      case_id: UUID.case,
      action: "MARK_REVIEW_COMPLETED_ATTENTION",
      actor_type: "drs_specialist",
      actor_id: UUID.otherSpecialist,
      occurred_at: "2026-08-20T10:30:00+08:00",
    }, { ...context, auditEvents: [lineEvent, aiReview, humanDecision, specialistEvent] }),
    { ok: false, code: "WORK_ITEM_TRANSITION_AUDIT_ACTOR_MISMATCH" },
  );
  assert.deepEqual(
    contract.transitionWorkItem(documentReview, {
      transition_id: "25252525-2525-4252-8252-252525252525",
      audit_event_id: unassignedSpecialistEvent.event_id,
      case_id: UUID.case,
      action: "MARK_REVIEW_COMPLETED_ATTENTION",
      actor_type: "drs_specialist",
      actor_id: UUID.otherSpecialist,
      occurred_at: "2026-08-20T10:30:00+08:00",
    }, { ...context, auditEvents: [lineEvent, aiReview, humanDecision, unassignedSpecialistEvent] }),
    { ok: false, code: "WORK_ITEM_TRANSITION_SPECIALIST_NOT_ACTIVE" },
  );
  assert.deepEqual(
    contract.transitionWorkItem(documentReview, {
      transition_id: "26262626-2626-4262-8262-262626262626",
      audit_event_id: specialistEvent.event_id,
      case_id: UUID.case,
      action: "MARK_REVIEW_COMPLETED_ATTENTION",
      actor_type: "drs_specialist",
      actor_id: UUID.specialist,
      occurred_at: "not-a-date",
    }, { ...context, auditEvents: [lineEvent, aiReview, humanDecision, specialistEvent] }),
    { ok: false, code: "WORK_ITEM_TRANSITION_OCCURRED_AT_INVALID" },
  );
  assert.deepEqual(
    contract.transitionWorkItem(reviewed, {
      transition_id: "27272727-2727-4272-8272-272727272727",
      audit_event_id: otherOwnerEvent.event_id,
      case_id: UUID.case,
      action: "OWNER_CONFIRMED",
      actor_type: "owner",
      actor_id: UUID.otherSpecialist,
      occurred_at: "2026-08-20T11:10:00+08:00",
    }, { ...context, auditEvents: [lineEvent, aiReview, humanDecision, specialistEvent, otherOwnerEvent] }),
    { ok: false, code: "WORK_ITEM_TRANSITION_OWNER_REQUIRED" },
  );
  assert.equal(
    contract.transitionWorkItem(reviewed, {
      transition_id: "28282828-2828-4282-8282-282828282828",
      audit_event_id: ownerEvent.event_id,
      case_id: UUID.case,
      action: "OWNER_CONFIRMED",
      actor_type: "owner",
      actor_id: UUID.owner,
      occurred_at: "2026-08-20T11:10:00+08:00",
    }, { ...context, auditEvents: [lineEvent, aiReview, humanDecision, specialistEvent, ownerEvent] }).state,
    "CLOSED_RECORDED",
  );
});

test("work-item creation validates requested actor, subject reference, and created time", async () => {
  const { createWorkItem } = await loadContract();

  assert.deepEqual(createWorkItem({
    work_item_id: UUID.workItem,
    case_id: UUID.case,
    work_item_type: "DOCUMENT_REVIEW",
    subject_ref: { document_id: UUID.document, version: "v1" },
    requested_by: "OWNER-001",
    created_at: "2026-08-20T10:00:00+08:00",
  }), { ok: false, code: "REQUESTED_BY_MUST_BE_UUID" });
  assert.deepEqual(createWorkItem({
    work_item_id: UUID.workItem,
    case_id: UUID.case,
    work_item_type: "DOCUMENT_REVIEW",
    subject_ref: { drawing_id: UUID.drawing, version: "v1" },
    requested_by: UUID.owner,
    created_at: "2026-08-20T10:00:00+08:00",
  }), { ok: false, code: "WORK_ITEM_SUBJECT_REF_INVALID" });
  assert.deepEqual(createWorkItem({
    work_item_id: UUID.workItem,
    case_id: UUID.case,
    work_item_type: "DRAWING_REVIEW",
    subject_ref: { drawing_id: UUID.drawing, version: "v1" },
    requested_by: UUID.owner,
    created_at: "not-a-date",
  }), { ok: false, code: "WORK_ITEM_CREATED_AT_INVALID" });
});

test("formal group history rejects overlaps, supports bounded termination, and recursively blocks private editing payloads", async () => {
  const {
    appendAuditEvent,
    createFormalGroupLinkTermination,
    validateFormalGroupLink,
  } = await loadContract();
  const context = validContext({
    groupLinks: [
      validFormalGroup({
        valid_from: "2026-08-20T09:00:00+08:00",
        valid_until: "2026-08-20T12:00:00+08:00",
      }),
    ],
  });

  assert.deepEqual(
    validateFormalGroupLink(
      validFormalGroup({
        group_link_id: UUID.otherGroupLink,
        case_id: UUID.otherCase,
        valid_from: "2026-08-20T11:00:00+08:00",
        valid_until: "2026-08-20T13:00:00+08:00",
      }),
      { ...context, caseIdentity: validCase({ case_id: UUID.otherCase }) },
    ),
    { ok: false, code: "LINE_GROUP_LINK_INTERVAL_OVERLAP" },
  );
  assert.deepEqual(
    validateFormalGroupLink(
      validFormalGroup({
        group_link_id: UUID.thirdGroupLink,
        valid_from: "2026-08-20T12:00:00+08:00",
        valid_until: "2026-08-20T13:00:00+08:00",
      }),
      { ...context, now: "2026-08-20T12:30:00+08:00" },
    ),
    { ok: true, code: "FORMAL_GROUP_LINK_VALID" },
  );
  assert.deepEqual(
    createFormalGroupLinkTermination(validFormalGroup(), {
      termination_id: UUID.groupTermination,
      terminated_at: "2026-08-21T09:00:00+08:00",
      terminated_by: UUID.specialist,
      reason: "LINE 群組授權結束。",
    }),
    {
      termination_id: UUID.groupTermination,
      group_link_id: UUID.groupLink,
      case_id: UUID.case,
      line_group_id: "LINE-GROUP-001",
      terminated_at: "2026-08-21T09:00:00+08:00",
      terminated_by: UUID.specialist,
      reason: "LINE 群組授權結束。",
    },
  );
  assert.deepEqual(
    validateFormalGroupLink(
      validFormalGroup({
        group_link_id: UUID.thirdGroupLink,
        valid_from: "2026-08-21T09:00:00+08:00",
        valid_until: null,
      }),
      {
        ...validContext({ now: "2026-08-21T09:30:00+08:00" }),
        groupLinkTerminations: [{
          termination_id: UUID.groupTermination,
          group_link_id: UUID.groupLink,
          case_id: UUID.case,
          line_group_id: "LINE-GROUP-001",
          terminated_at: "2026-08-21T09:00:00+08:00",
          terminated_by: UUID.specialist,
          reason: "LINE 群組授權結束。",
        }],
      },
    ),
    { ok: true, code: "FORMAL_GROUP_LINK_VALID" },
  );
  assert.deepEqual(
    appendAuditEvent(
      validEnvelope({
        payload: {
          message_state: "SENT",
          message_kind: "TEXT",
          sent_text: "nested private edit must fail",
          attachment_refs: [],
          meta: { editor: { private_editing: { draft_text: "not sent" } } },
        },
      }),
      validContext(),
    ),
    { ok: false, code: "LINE_SENT_PAYLOAD_SCHEMA_INVALID" },
  );
});

test("termination history rejects retroactive invalidation of accepted dependent events", async () => {
  const contract = await loadContract();
  const context = validContext();
  const { lineEvent, aiReview, humanDecision } = appendSequence(contract, context);
  const transitionEvent = {
    event_id: "29292929-2929-4292-8292-292929292929",
    case_id: UUID.case,
    event_type: "WORK_ITEM_TRANSITION",
    previous_event_id: humanDecision.event_id,
    occurred_at: "2026-08-20T11:00:00+08:00",
    actor: { actor_type: "drs_specialist", actor_id: UUID.specialist },
    source: { surface: "DRS_WORKSPACE" },
    payload: {
      work_item_id: UUID.workItem,
      action: "MARK_REVIEW_COMPLETED_ATTENTION",
      subject_ref: { document_id: UUID.document, version: "v1" },
    },
  };

  assert.deepEqual(
    contract.createFormalGroupLinkTermination(validFormalGroup(), {
      termination_id: UUID.groupTermination,
      terminated_at: "2026-08-20T09:59:00+08:00",
      terminated_by: UUID.specialist,
      reason: "不可回溯終止已收錄 LINE 訊息。",
    }, { auditEvents: [lineEvent] }),
    { ok: false, code: "GROUP_LINK_TERMINATION_AFTER_DEPENDENT_EVENT_REQUIRED" },
  );
  assert.deepEqual(
    contract.createSpecialistAssignmentTermination(validSpecialistAssignment(), {
      termination_id: UUID.assignmentTermination,
      terminated_at: "2026-08-20T10:01:00+08:00",
      terminated_by: UUID.commander,
      reason: "不可回溯終止已核准的人工作業。",
    }, { auditEvents: [lineEvent, aiReview, humanDecision, transitionEvent] }),
    { ok: false, code: "ASSIGNMENT_TERMINATION_AFTER_DEPENDENT_EVENT_REQUIRED" },
  );
});

test("formal group admission model rejects stale link snapshots after termination", async () => {
  const contract = await loadContract();

  assert.deepEqual(
    contract.appendAuditEvent(
      validEnvelope({
        occurred_at: "2026-08-20T10:00:00+08:00",
      }),
      validContext({
        groupLinkTerminations: [{
          termination_id: UUID.groupTermination,
          group_link_id: UUID.groupLink,
          case_id: UUID.case,
          line_group_id: "LINE-GROUP-001",
          terminated_at: "2026-08-20T09:59:00+08:00",
          terminated_by: UUID.specialist,
          reason: "LINE 群組授權結束。",
        }],
      }),
    ),
    { ok: false, code: "LINE_GROUP_NOT_FORMALLY_LINKED" },
  );
});

test("guarded audit append writer returns exact replays and rejects identity conflicts", async () => {
  const contract = await loadContract();
  const context = validContext();
  const lineEvent = validEnvelope();
  const persistedLineEvent = contract.appendAuditEvent(lineEvent, context);

  assert.deepEqual(
    contract.appendAuditEventThroughGuardedWriter(lineEvent, context),
    { ok: true, code: "AUDIT_EVENT_APPENDED", audit_event_id: UUID.lineEvent },
  );
  assert.deepEqual(
    contract.appendAuditEventThroughGuardedWriter(
      validEnvelope({ occurred_at: persistedLineEvent.occurred_at }),
      { ...context, existingEvents: [persistedLineEvent] },
    ),
    { ok: true, code: "AUDIT_EVENT_REPLAY_ACCEPTED", audit_event_id: UUID.lineEvent },
  );
  assert.deepEqual(
    contract.appendAuditEventThroughGuardedWriter(
      validEnvelope({ occurred_at: "2026-08-20T10:00:00+08:00" }),
      { ...context, existingEvents: [persistedLineEvent] },
    ),
    { ok: true, code: "AUDIT_EVENT_REPLAY_ACCEPTED", audit_event_id: UUID.lineEvent },
  );
  for (const occurred_at of [
    "not-a-time",
    "-000001-12-31T10:30:00.000Z",
    "+010000-01-01T00:00:00.000Z",
    "0000-01-01T00:00:00Z",
    "0001-01-01T00:30:00+14:00",
    "9999-12-31T23:30:00-14:00",
  ]) {
    assert.deepEqual(
      contract.appendAuditEventThroughGuardedWriter(
        validEnvelope({ occurred_at }),
        { ...context, existingEvents: [persistedLineEvent] },
      ),
      { ok: false, code: "AUDIT_EVENT_OCCURRED_AT_INVALID" },
    );
  }
  for (const tamperedOccurredAt of [
    "not-a-time",
    "-000001-12-31T10:30:00.000Z",
    "+010000-01-01T00:00:00.000Z",
    "0000-01-01T00:00:00Z",
    "0001-01-01T00:30:00+14:00",
    "9999-12-31T23:30:00-14:00",
  ]) {
    assert.deepEqual(
      contract.appendAuditEventThroughGuardedWriter(
        validEnvelope({ occurred_at: tamperedOccurredAt }),
        { ...context, existingEvents: [{ ...persistedLineEvent, occurred_at: tamperedOccurredAt }] },
      ),
      { ok: false, code: "AUDIT_EVENT_OCCURRED_AT_INVALID" },
    );
    assert.deepEqual(
      contract.appendAuditEventThroughGuardedWriter(
        validEnvelope({ occurred_at: "2026-08-20T02:00:00.000Z" }),
        { ...context, existingEvents: [{ ...persistedLineEvent, occurred_at: tamperedOccurredAt }] },
      ),
      { ok: false, code: "AUDIT_EVENT_IDENTITY_REUSE_CONFLICT" },
    );
  }
  assert.deepEqual(
    contract.appendAuditEventThroughGuardedWriter(
      validEnvelope({ payload: { ...lineEvent.payload, sent_text: "same event id, different body" } }),
      { ...context, existingEvents: [persistedLineEvent] },
    ),
    { ok: false, code: "AUDIT_EVENT_IDENTITY_REUSE_CONFLICT" },
  );
  assert.deepEqual(
    contract.appendAuditEventThroughGuardedWriter(
      validEnvelope({
        event_id: "38383838-3838-4838-8838-383838383838",
        payload: { ...lineEvent.payload, sent_text: "same LINE transport id, different event" },
      }),
      { ...context, existingEvents: [persistedLineEvent] },
    ),
    { ok: false, code: "LINE_TRANSPORT_IDENTITY_REUSE_CONFLICT" },
  );
});

test("AI review requires the trusted append path, enforces AI provenance, and never persists the transient snapshot body", async () => {
  const contract = await loadContract();
  const context = validContext();
  const lineEvent = contract.appendAuditEvent(validEnvelope(), context);

  assert.deepEqual(
    contract.appendAuditEvent(
      validEnvelope({
        event_id: UUID.aiReview,
        event_type: "AI_REVIEW",
        previous_event_id: lineEvent.event_id,
        occurred_at: "2026-08-20T10:01:00+08:00",
        actor: { actor_type: "ai_service", actor_id: "DRS-AI-ADVISORY" },
        source: { surface: "SYSTEM" },
        payload: {
          review_id: UUID.review,
          review_status: "REVIEW_COMPLETED_ATTENTION",
          submitted_snapshot_sha256: SNAPSHOT_SHA,
          reviewed_event_id: lineEvent.event_id,
          flags: [],
          findings: [],
        },
      }),
      { ...context, existingEvents: [lineEvent] },
    ),
    { ok: false, code: "AI_REVIEW_REQUIRES_TRUSTED_APPEND_PATH" },
  );

  const aiReview = contract.appendAiReviewEvent(
    validAiReviewAppendInput({
      payload: {
        review_status: "REVIEW_COMPLETED_ATTENTION",
        reviewed_event_id: lineEvent.event_id,
        flags: [],
        findings: [],
      },
    }),
    { ...context, existingEvents: [lineEvent] },
  );

  assert.equal(aiReview.payload.submitted_snapshot_sha256, SNAPSHOT_SHA);
  assert.equal(Object.hasOwn(aiReview, "submitted_snapshot_body"), false);
  assert.equal(JSON.stringify(aiReview).includes(SNAPSHOT_BODY), false);
  assert.equal(aiReview.actor.actor_type, "ai_service");
  assert.equal(aiReview.actor.actor_id, "drs-ai-review-service");
  assert.deepEqual(aiReview.source, { surface: "SYSTEM" });

  const forgedProvenanceReview = contract.appendAiReviewEvent(
    validAiReviewAppendInput({
      event_id: "8f8f8f8f-8f8f-4f8f-8f8f-8f8f8f8f8f8f",
      actor: { actor_type: "owner", actor_id: UUID.owner },
      source: { surface: "LINE" },
    }),
    { ...context, existingEvents: [lineEvent] },
  );
  assert.equal(forgedProvenanceReview.actor.actor_type, "ai_service");
  assert.equal(forgedProvenanceReview.actor.actor_id, "drs-ai-review-service");
  assert.deepEqual(forgedProvenanceReview.source, { surface: "SYSTEM" });

  assert.deepEqual(
    contract.appendAiReviewEvent(
      validAiReviewAppendInput({
        payload: {
          submitted_snapshot_sha256: OTHER_SNAPSHOT_SHA,
        },
      }),
      { ...context, existingEvents: [lineEvent] },
    ),
    { ok: false, code: "AI_REVIEW_SUBMITTED_SNAPSHOT_SHA256_FORBIDDEN" },
  );
});

test("guarded trusted AI review append accepts exact replay and rejects changed body or payload conflicts", async () => {
  const contract = await loadContract();
  const context = validContext();
  const lineEvent = contract.appendAuditEvent(validEnvelope(), context);
  const aiReviewInput = validAiReviewAppendInput({
    payload: {
      review_status: "REVIEW_COMPLETED_ATTENTION",
      reviewed_event_id: lineEvent.event_id,
      flags: [],
      findings: [],
    },
  });

  assert.deepEqual(
    contract.appendAiReviewEventThroughGuardedWriter(
      aiReviewInput,
      { ...context, existingEvents: [lineEvent] },
    ),
    { ok: true, code: "AUDIT_EVENT_APPENDED", audit_event_id: UUID.aiReview },
  );

  const persistedAiReview = contract.appendAiReviewEvent(
    aiReviewInput,
    { ...context, existingEvents: [lineEvent] },
  );

  assert.deepEqual(
    contract.appendAiReviewEventThroughGuardedWriter(
      validAiReviewAppendInput({
        occurred_at: "2026-08-20T02:01:00.000Z",
        payload: {
          review_status: "REVIEW_COMPLETED_ATTENTION",
          reviewed_event_id: lineEvent.event_id,
          flags: [],
          findings: [],
        },
      }),
      { ...context, existingEvents: [lineEvent, persistedAiReview] },
    ),
    { ok: true, code: "AUDIT_EVENT_REPLAY_ACCEPTED", audit_event_id: UUID.aiReview },
  );

  assert.deepEqual(
    contract.appendAiReviewEventThroughGuardedWriter(
      validAiReviewAppendInput({
        submitted_snapshot_body: OTHER_SNAPSHOT_BODY,
      }),
      { ...context, existingEvents: [lineEvent, persistedAiReview] },
    ),
    { ok: false, code: "AUDIT_EVENT_IDENTITY_REUSE_CONFLICT" },
  );

  assert.deepEqual(
    contract.appendAiReviewEventThroughGuardedWriter(
      validAiReviewAppendInput({
        occurred_at: "2026-08-20T02:01:01.000Z",
        payload: {
          review_status: "REVIEW_COMPLETED_ATTENTION",
          reviewed_event_id: lineEvent.event_id,
          flags: [],
          findings: [],
        },
      }),
      { ...context, existingEvents: [lineEvent, persistedAiReview] },
    ),
    { ok: false, code: "AUDIT_EVENT_IDENTITY_REUSE_CONFLICT" },
  );

  assert.deepEqual(
    contract.appendAiReviewEventThroughGuardedWriter(
      validAiReviewAppendInput({
        event_id: "8e8e8e8e-8e8e-4e8e-8e8e-8e8e8e8e8e8e",
        payload: {
          review_status: "REVIEW_COMPLETED_ATTENTION",
          reviewed_event_id: lineEvent.event_id,
          flags: [],
          findings: [],
        },
      }),
      { ...context, existingEvents: [lineEvent, persistedAiReview] },
    ),
    { ok: false, code: "PREVIOUS_EVENT_ALREADY_HAS_SUCCESSOR" },
  );

  assert.deepEqual(
    contract.appendAiReviewEventThroughGuardedWriter(
      validAiReviewAppendInput({
        payload: {
          review_status: "REVIEW_COMPLETED_NO_FLAG",
          reviewed_event_id: lineEvent.event_id,
          flags: [],
          findings: [],
        },
      }),
      { ...context, existingEvents: [lineEvent, persistedAiReview] },
    ),
    { ok: false, code: "AUDIT_EVENT_IDENTITY_REUSE_CONFLICT" },
  );

  assert.deepEqual(
    contract.appendAiReviewEventThroughGuardedWriter(
      validAiReviewAppendInput({
        occurred_at: "infinity",
      }),
      { ...context, existingEvents: [lineEvent] },
    ),
    { ok: false, code: "AUDIT_EVENT_OCCURRED_AT_INVALID" },
  );
});

test("guarded trusted AI review append requires strict RFC 3339 occurred_at inputs and canonical UTC millisecond replay", async () => {
  const contract = await loadContract();
  const context = validContext();
  const lineEvent = contract.appendAuditEvent(validEnvelope(), context);

  for (const occurred_at of [
    0,
    1,
    "2026-08-20T10:01:00",
    "2026-02-30T10:01:00+08:00",
    "2026-02-29T10:01:00+08:00",
    "2026-08-20T10:01:00+24:00",
    "infinity",
    "2026-08-20T10:01:00.1234+08:00",
    "2026-08-20T10:01:00.123456+08:00",
  ]) {
    assert.deepEqual(
      contract.appendAiReviewEventThroughGuardedWriter(
        validAiReviewAppendInput({
          occurred_at,
          payload: {
            review_status: "REVIEW_COMPLETED_ATTENTION",
            reviewed_event_id: lineEvent.event_id,
            flags: [],
            findings: [],
          },
        }),
        { ...context, existingEvents: [lineEvent] },
      ),
      { ok: false, code: "AUDIT_EVENT_OCCURRED_AT_INVALID" },
    );
  }

  const persistedAiReview = contract.appendAiReviewEvent(
    validAiReviewAppendInput({
      occurred_at: "2026-08-20T10:01:00.1+08:00",
      payload: {
        review_status: "REVIEW_COMPLETED_ATTENTION",
        reviewed_event_id: lineEvent.event_id,
        flags: [],
        findings: [],
      },
    }),
    { ...context, existingEvents: [lineEvent] },
  );

  assert.deepEqual(
    contract.appendAiReviewEventThroughGuardedWriter(
      validAiReviewAppendInput({
        occurred_at: "2026-08-20T02:01:00.100Z",
        payload: {
          review_status: "REVIEW_COMPLETED_ATTENTION",
          reviewed_event_id: lineEvent.event_id,
          flags: [],
          findings: [],
        },
      }),
      { ...context, existingEvents: [lineEvent, persistedAiReview] },
    ),
    { ok: true, code: "AUDIT_EVENT_REPLAY_ACCEPTED", audit_event_id: UUID.aiReview },
  );

  assert.deepEqual(
    contract.appendAiReviewEventThroughGuardedWriter(
      validAiReviewAppendInput({
        occurred_at: "2026-08-20T02:01:00.101Z",
        payload: {
          review_status: "REVIEW_COMPLETED_ATTENTION",
          reviewed_event_id: lineEvent.event_id,
          flags: [],
          findings: [],
        },
      }),
      { ...context, existingEvents: [lineEvent, persistedAiReview] },
    ),
    { ok: false, code: "AUDIT_EVENT_IDENTITY_REUSE_CONFLICT" },
  );
});

test("accepted event envelopes canonicalize occurred_at to UTC millisecond precision without mutating caller content", async () => {
  const contract = await loadContract();
  const context = {
    caseIdentity: { case_id: UUID.case, owner_id: UUID.owner },
    groupLinks: [{
      group_link_id: UUID.groupLink,
      case_id: UUID.case,
      line_group_id: "LINE-GROUP-001",
      group_kind: "DRS_CASE_GROUP",
      linked_by_specialist_id: UUID.specialist,
      valid_from: "2026-08-20T00:00:00.000Z",
      valid_until: null,
    }],
  };
  const input = validEnvelope({
    occurred_at: "2026-08-20T10:01:00.1+08:00",
    source: {
      surface: "LINE",
      group_link_id: UUID.groupLink,
      transport_message_id: "LINE-MSG-CANONICAL-001",
    },
    payload: {
      message_state: "SENT",
      message_kind: "TEXT_AND_ATTACHMENT",
      sent_text: "原始訊息內容",
      attachment_refs: [{
        attachment_id: "ATT-001",
        attachment_kind: "DOCUMENT",
        sha256: "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
      }],
    },
  });
  const original = structuredClone(input);

  const appended = contract.appendAuditEvent(input, context);

  assert.equal(appended.occurred_at, "2026-08-20T02:01:00.100Z");
  assert.deepEqual(appended.payload, original.payload);
  assert.deepEqual(appended.source, original.source);
  assert.deepEqual(input, original);
});

test("strict timestamp contract accepts supported low years from 0001 onward and rejects year zero or invalid low-year leap dates", async () => {
  const contract = await loadContract();
  const lowYearContext = (occurredAt) => ({
    caseIdentity: { case_id: UUID.case, owner_id: UUID.owner },
    groupLinks: [{
      group_link_id: UUID.groupLink,
      case_id: UUID.case,
      line_group_id: "LINE-GROUP-LOW-YEAR",
      group_kind: "DRS_CASE_GROUP",
      linked_by_specialist_id: UUID.specialist,
      valid_from: "0001-01-01T00:00:00.000Z",
      valid_until: null,
    }],
    now: occurredAt,
  });
  const lowYearEnvelope = (occurredAt) => validEnvelope({
    occurred_at: occurredAt,
    source: {
      surface: "LINE",
      group_link_id: UUID.groupLink,
      transport_message_id: `LINE-${occurredAt}`,
    },
  });

  assert.equal(
    contract.appendAuditEvent(lowYearEnvelope("0001-03-01T00:00:00Z"), lowYearContext("0001-03-01T00:00:00Z")).occurred_at,
    "0001-03-01T00:00:00.000Z",
  );
  assert.equal(
    contract.appendAuditEvent(lowYearEnvelope("0004-02-29T00:00:00Z"), lowYearContext("0004-02-29T00:00:00Z")).occurred_at,
    "0004-02-29T00:00:00.000Z",
  );
  assert.equal(
    contract.appendAuditEvent(lowYearEnvelope("0096-02-29T00:00:00Z"), lowYearContext("0096-02-29T00:00:00Z")).occurred_at,
    "0096-02-29T00:00:00.000Z",
  );
  assert.equal(
    contract.appendAuditEvent(lowYearEnvelope("0099-03-01T00:00:00Z"), lowYearContext("0099-03-01T00:00:00Z")).occurred_at,
    "0099-03-01T00:00:00.000Z",
  );
  assert.equal(
    contract.appendAuditEvent(lowYearEnvelope("0100-03-01T00:00:00Z"), lowYearContext("0100-03-01T00:00:00Z")).occurred_at,
    "0100-03-01T00:00:00.000Z",
  );

  for (const occurred_at of [
    "0000-01-01T00:00:00Z",
    "0000-01-01T14:00:00+14:00",
    "0000-02-29T00:00:00Z",
    "0001-02-29T00:00:00Z",
    "0001-02-29T00:00:00+14:00",
    "0099-02-29T00:00:00Z",
    "0100-02-29T00:00:00Z",
    "0000-02-30T00:00:00Z",
  ]) {
    assert.deepEqual(
      contract.appendAuditEvent(lowYearEnvelope(occurred_at), lowYearContext(occurred_at)),
      { ok: false, code: "AUDIT_EVENT_OCCURRED_AT_INVALID" },
    );
  }
});

test("strict timestamp contract accepts ±14:00 and rejects offsets outside the frozen W1 range", async () => {
  const contract = await loadContract();
  const baseContext = {
    caseIdentity: { case_id: UUID.case, owner_id: UUID.owner },
    groupLinks: [{
      group_link_id: UUID.groupLink,
      case_id: UUID.case,
      line_group_id: "LINE-GROUP-OFFSET",
      group_kind: "DRS_CASE_GROUP",
      linked_by_specialist_id: UUID.specialist,
      valid_from: "2026-08-19T00:00:00.000Z",
      valid_until: null,
    }],
  };
  const withOffset = (occurredAt, transportId) => validEnvelope({
    occurred_at: occurredAt,
    source: {
      surface: "LINE",
      group_link_id: UUID.groupLink,
      transport_message_id: transportId,
    },
  });

  assert.equal(
    contract.appendAuditEvent(withOffset("2026-08-21T00:30:00.000+14:00", "LINE-MSG-OFFSET-PLUS-14"), baseContext).occurred_at,
    "2026-08-20T10:30:00.000Z",
  );
  assert.equal(
    contract.appendAuditEvent(withOffset("2026-08-20T20:30:00.000-14:00", "LINE-MSG-OFFSET-MINUS-14"), baseContext).occurred_at,
    "2026-08-21T10:30:00.000Z",
  );

  for (const [occurredAt, transportId] of [
    ["2026-08-21T10:01:00+14:01", "LINE-MSG-OFFSET-PLUS-1401"],
    ["2026-08-20T10:01:00-14:01", "LINE-MSG-OFFSET-MINUS-1401"],
    ["2026-08-20T10:01:00+15:00", "LINE-MSG-OFFSET-PLUS-15"],
    ["2026-08-20T10:01:00-15:00", "LINE-MSG-OFFSET-MINUS-15"],
    ["2026-08-20T10:01:00+23:59", "LINE-MSG-OFFSET-PLUS-2359"],
  ]) {
    assert.deepEqual(
      contract.appendAuditEvent(withOffset(occurredAt, transportId), baseContext),
      { ok: false, code: "AUDIT_EVENT_OCCURRED_AT_INVALID" },
    );
  }
});

test("strict timestamp contract rejects UTC year spill outside the closed 0001-9999 range and keeps accepted canonical UTC parser-closed", async () => {
  const contract = await loadContract();
  const acceptedContext = {
    caseIdentity: { case_id: UUID.case, owner_id: UUID.owner },
    groupLinks: [{
      group_link_id: UUID.groupLink,
      case_id: UUID.case,
      line_group_id: "LINE-GROUP-YEAR-SPILL",
      group_kind: "DRS_CASE_GROUP",
      linked_by_specialist_id: UUID.specialist,
      valid_from: "0001-01-01T00:00:00.000Z",
      valid_until: null,
    }],
  };
  const spillProbeContext = {
    caseIdentity: { case_id: UUID.case, owner_id: UUID.owner },
    groupLinks: [{
      group_link_id: UUID.groupLink,
      case_id: UUID.case,
      line_group_id: "LINE-GROUP-YEAR-SPILL-PROBE",
      group_kind: "DRS_CASE_GROUP",
      linked_by_specialist_id: UUID.specialist,
      valid_from: "0001-01-01T00:00:00+14:00",
      valid_until: null,
    }],
  };
  const withOccurred = (eventId, occurredAt, transportMessageId) => validEnvelope({
    event_id: eventId,
    occurred_at: occurredAt,
    source: {
      surface: "LINE",
      group_link_id: UUID.groupLink,
      transport_message_id: transportMessageId,
    },
  });

  assert.deepEqual(
    contract.appendAuditEvent(
      withOccurred("77777777-7777-4777-8777-000000000101", "0001-01-01T00:30:00+14:00", "LINE-MSG-UTC-SPILL-LOW"),
      spillProbeContext,
    ),
    { ok: false, code: "AUDIT_EVENT_OCCURRED_AT_INVALID" },
  );
  assert.deepEqual(
    contract.appendAuditEvent(
      withOccurred("77777777-7777-4777-8777-000000000102", "9999-12-31T23:30:00-14:00", "LINE-MSG-UTC-SPILL-HIGH"),
      spillProbeContext,
    ),
    { ok: false, code: "AUDIT_EVENT_OCCURRED_AT_INVALID" },
  );

  for (const [eventId, occurredAt, transportMessageId, expectedCanonical] of [
    ["77777777-7777-4777-8777-000000000103", "0001-01-01T14:00:00+14:00", "LINE-MSG-UTC-LOW-EDGE", "0001-01-01T00:00:00.000Z"],
    ["77777777-7777-4777-8777-000000000104", "9999-12-31T09:59:59.999-14:00", "LINE-MSG-UTC-HIGH-EDGE", "9999-12-31T23:59:59.999Z"],
    ["77777777-7777-4777-8777-000000000105", "0001-01-01T00:00:00Z", "LINE-MSG-UTC-LOW-Z", "0001-01-01T00:00:00.000Z"],
    ["77777777-7777-4777-8777-000000000106", "9999-12-31T23:59:59.999Z", "LINE-MSG-UTC-HIGH-Z", "9999-12-31T23:59:59.999Z"],
    ["77777777-7777-4777-8777-000000000107", "2026-08-20T10:01:00.1+08:00", "LINE-MSG-UTC-MID-OFFSET", "2026-08-20T02:01:00.100Z"],
  ]) {
    const appended = contract.appendAuditEvent(
      withOccurred(eventId, occurredAt, transportMessageId),
      acceptedContext,
    );
    assert.equal(appended.occurred_at, expectedCanonical);
    assert.deepEqual(
      contract.createEventChainVerifier([appended]),
      { ok: true, code: "AUDIT_CHAIN_VALID", tail_event_id: eventId },
    );
  }
});

test("previous-event chronology fails closed for earlier successors and tampered predecessor timestamps", async () => {
  const contract = await loadContract();
  const baseContext = {
    caseIdentity: { case_id: UUID.case, owner_id: UUID.owner },
    groupLinks: [{
      group_link_id: UUID.groupLink,
      case_id: UUID.case,
      line_group_id: "LINE-GROUP-CHAIN-GUARD",
      group_kind: "DRS_CASE_GROUP",
      linked_by_specialist_id: UUID.specialist,
      valid_from: "0001-01-01T00:00:00.000Z",
      valid_until: null,
    }],
  };
  const root = contract.appendAuditEvent(
    validEnvelope({
      event_id: "77777777-7777-4777-8777-000000000108",
      occurred_at: "0001-01-01T14:30:00+14:00",
      source: {
        surface: "LINE",
        group_link_id: UUID.groupLink,
        transport_message_id: "LINE-MSG-CHAIN-ROOT",
      },
    }),
    baseContext,
  );
  assert.equal(root.occurred_at, "0001-01-01T00:30:00.000Z");

  assert.deepEqual(
    contract.appendAuditEvent(
      validEnvelope({
        event_id: "77777777-7777-4777-8777-000000000109",
        previous_event_id: root.event_id,
        occurred_at: "0001-01-01T14:20:00+14:00",
        source: {
          surface: "LINE",
          group_link_id: UUID.groupLink,
          transport_message_id: "LINE-MSG-CHAIN-EARLIER",
        },
      }),
      { ...baseContext, existingEvents: [root] },
    ),
    { ok: false, code: "PREVIOUS_EVENT_CHRONOLOGY_INVALID" },
  );

  for (const [eventId, tamperedOccurredAt, transportMessageId] of [
    ["77777777-7777-4777-8777-000000000110", "not-a-time", "LINE-MSG-CHAIN-BAD-TEXT"],
    ["77777777-7777-4777-8777-000000000111", "-000001-12-31T10:30:00.000Z", "LINE-MSG-CHAIN-LOW-SPILL"],
    ["77777777-7777-4777-8777-000000000112", "+010000-01-01T00:00:00.000Z", "LINE-MSG-CHAIN-HIGH-SPILL"],
  ]) {
    assert.deepEqual(
      contract.appendAuditEvent(
        validEnvelope({
          event_id: eventId,
          previous_event_id: root.event_id,
          occurred_at: "2026-08-20T10:01:00+08:00",
          source: {
            surface: "LINE",
            group_link_id: UUID.groupLink,
            transport_message_id: transportMessageId,
          },
        }),
        {
          ...baseContext,
          existingEvents: [{ ...root, occurred_at: tamperedOccurredAt }],
        },
      ),
      { ok: false, code: "PREVIOUS_EVENT_CHRONOLOGY_INVALID" },
    );
  }
});

test("invalid interval history cannot permit overlapping specialist assignments or formal group links", async () => {
  const contract = await loadContract();

  for (const invalidBoundary of [
    "not-a-time",
    "-000001-12-31T10:30:00.000Z",
    "+010000-01-01T00:00:00.000Z",
    "0000-01-01T00:00:00Z",
    "0001-01-01T00:30:00+14:00",
    "9999-12-31T23:30:00-14:00",
  ]) {
    assert.deepEqual(
      contract.validateSpecialistAssignment(
        validSpecialistAssignment({
          assignment_id: UUID.otherAssignment,
          specialist_id: UUID.otherSpecialist,
          valid_from: "2026-08-20T10:30:00+08:00",
          valid_until: "2026-08-20T11:30:00+08:00",
        }),
        validContext({
          specialistAssignments: [
            validSpecialistAssignment({
              valid_from: invalidBoundary,
              valid_until: "2026-08-20T12:00:00+08:00",
            }),
          ],
        }),
      ),
      { ok: false, code: "SPECIALIST_ASSIGNMENT_INTERVAL_OVERLAP" },
    );
    assert.deepEqual(
      contract.validateSpecialistAssignment(
        validSpecialistAssignment({
          assignment_id: UUID.otherAssignment,
          specialist_id: UUID.otherSpecialist,
          valid_from: "2026-08-20T10:30:00+08:00",
          valid_until: "2026-08-20T11:30:00+08:00",
        }),
        validContext({
          specialistAssignments: [
            validSpecialistAssignment({
              valid_from: "2026-08-20T09:00:00+08:00",
              valid_until: invalidBoundary,
            }),
          ],
        }),
      ),
      { ok: false, code: "SPECIALIST_ASSIGNMENT_INTERVAL_OVERLAP" },
    );
    assert.deepEqual(
      contract.validateFormalGroupLink(
        validFormalGroup({
          group_link_id: UUID.otherGroupLink,
          valid_from: "2026-08-20T10:30:00+08:00",
          valid_until: "2026-08-20T11:30:00+08:00",
        }),
        validContext({
          groupLinks: [
            validFormalGroup({
              valid_from: invalidBoundary,
              valid_until: "2026-08-20T12:00:00+08:00",
            }),
          ],
        }),
      ),
      { ok: false, code: "LINE_GROUP_LINK_INTERVAL_OVERLAP" },
    );
    assert.deepEqual(
      contract.validateFormalGroupLink(
        validFormalGroup({
          group_link_id: UUID.otherGroupLink,
          valid_from: "2026-08-20T10:30:00+08:00",
          valid_until: "2026-08-20T11:30:00+08:00",
        }),
        validContext({
          groupLinks: [
            validFormalGroup({
              valid_from: "2026-08-20T09:00:00+08:00",
              valid_until: invalidBoundary,
            }),
          ],
        }),
      ),
      { ok: false, code: "LINE_GROUP_LINK_INTERVAL_OVERLAP" },
    );
  }
});

test("termination constructors fail closed on invalid parent endpoints, existing termination endpoints, and invalid dependent event times", async () => {
  const contract = await loadContract();
  const lineEvent = validEnvelope();
  const transitionEvent = {
    event_id: "29292929-2929-4292-8292-292929292930",
    case_id: UUID.case,
    event_type: "WORK_ITEM_TRANSITION",
    previous_event_id: UUID.humanDecision,
    occurred_at: "2026-08-20T11:00:00+08:00",
    actor: { actor_type: "drs_specialist", actor_id: UUID.specialist },
    source: { surface: "DRS_WORKSPACE" },
    payload: {
      work_item_id: UUID.workItem,
      action: "MARK_REVIEW_COMPLETED_ATTENTION",
      subject_ref: { document_id: UUID.document, version: "v1" },
    },
  };

  for (const invalidBoundary of [
    "not-a-time",
    "-000001-12-31T10:30:00.000Z",
    "+010000-01-01T00:00:00.000Z",
    "0000-01-01T00:00:00Z",
    "0001-01-01T00:30:00+14:00",
    "9999-12-31T23:30:00-14:00",
  ]) {
    assert.deepEqual(
      contract.createSpecialistAssignmentTermination(
        validSpecialistAssignment({ valid_from: invalidBoundary }),
        {
          termination_id: UUID.assignmentTermination,
          terminated_at: "2026-08-21T09:00:00+08:00",
          terminated_by: UUID.commander,
          reason: "invalid parent valid_from must fail closed",
        },
      ),
      { ok: false, code: "ASSIGNMENT_TERMINATION_TIME_INVALID" },
    );
    assert.deepEqual(
      contract.createSpecialistAssignmentTermination(
        validSpecialistAssignment({ valid_until: invalidBoundary }),
        {
          termination_id: UUID.assignmentTermination,
          terminated_at: "2026-08-21T09:00:00+08:00",
          terminated_by: UUID.commander,
          reason: "invalid parent valid_until must fail closed",
        },
      ),
      { ok: false, code: "ASSIGNMENT_TERMINATION_TIME_INVALID" },
    );
    assert.deepEqual(
      contract.createSpecialistAssignmentTermination(
        validSpecialistAssignment(),
        {
          termination_id: UUID.assignmentTermination,
          terminated_at: "2026-08-21T09:00:00+08:00",
          terminated_by: UUID.commander,
          reason: "invalid existing termination must fail closed",
        },
        {
          assignmentTerminations: [{
            termination_id: "39393939-3939-4939-8939-393939393939",
            assignment_id: UUID.assignment,
            case_id: UUID.case,
            specialist_id: UUID.specialist,
            terminated_at: invalidBoundary,
            terminated_by: UUID.commander,
            reason: "corrupted existing termination",
          }],
        },
      ),
      { ok: false, code: "ASSIGNMENT_TERMINATION_TIME_INVALID" },
    );
    assert.deepEqual(
      contract.createFormalGroupLinkTermination(
        validFormalGroup({ valid_from: invalidBoundary }),
        {
          termination_id: UUID.groupTermination,
          terminated_at: "2026-08-21T09:00:00+08:00",
          terminated_by: UUID.specialist,
          reason: "invalid parent valid_from must fail closed",
        },
      ),
      { ok: false, code: "GROUP_LINK_TERMINATION_TIME_INVALID" },
    );
    assert.deepEqual(
      contract.createFormalGroupLinkTermination(
        validFormalGroup({ valid_until: invalidBoundary }),
        {
          termination_id: UUID.groupTermination,
          terminated_at: "2026-08-21T09:00:00+08:00",
          terminated_by: UUID.specialist,
          reason: "invalid parent valid_until must fail closed",
        },
      ),
      { ok: false, code: "GROUP_LINK_TERMINATION_TIME_INVALID" },
    );
    assert.deepEqual(
      contract.createFormalGroupLinkTermination(
        validFormalGroup(),
        {
          termination_id: UUID.groupTermination,
          terminated_at: "2026-08-21T09:00:00+08:00",
          terminated_by: UUID.specialist,
          reason: "invalid existing termination must fail closed",
        },
        {
          groupLinkTerminations: [{
            termination_id: "40404040-4040-4040-8040-404040404040",
            group_link_id: UUID.groupLink,
            case_id: UUID.case,
            line_group_id: "LINE-GROUP-001",
            terminated_at: invalidBoundary,
            terminated_by: UUID.specialist,
            reason: "corrupted existing termination",
          }],
        },
      ),
      { ok: false, code: "GROUP_LINK_TERMINATION_TIME_INVALID" },
    );
    assert.deepEqual(
      contract.createSpecialistAssignmentTermination(
        validSpecialistAssignment(),
        {
          termination_id: UUID.assignmentTermination,
          terminated_at: "2026-08-20T10:59:00+08:00",
          terminated_by: UUID.commander,
          reason: "invalid dependent event time must not allow termination",
        },
        { auditEvents: [{ ...transitionEvent, occurred_at: invalidBoundary }] },
      ),
      { ok: false, code: "ASSIGNMENT_TERMINATION_AFTER_DEPENDENT_EVENT_REQUIRED" },
    );
    assert.deepEqual(
      contract.createFormalGroupLinkTermination(
        validFormalGroup(),
        {
          termination_id: UUID.groupTermination,
          terminated_at: "2026-08-20T09:59:00+08:00",
          terminated_by: UUID.specialist,
          reason: "invalid dependent event time must not allow termination",
        },
        { auditEvents: [{ ...lineEvent, occurred_at: invalidBoundary }] },
      ),
      { ok: false, code: "GROUP_LINK_TERMINATION_AFTER_DEPENDENT_EVENT_REQUIRED" },
    );
  }

  for (const presentButInvalidValidUntil of ["", 0, false, Number.NaN]) {
    assert.deepEqual(
      contract.createSpecialistAssignmentTermination(
        validSpecialistAssignment({ valid_until: presentButInvalidValidUntil }),
        {
          termination_id: UUID.assignmentTermination,
          terminated_at: "2026-08-21T09:00:00+08:00",
          terminated_by: UUID.commander,
          reason: "present-but-invalid valid_until must fail closed",
        },
      ),
      { ok: false, code: "ASSIGNMENT_TERMINATION_TIME_INVALID" },
    );
    assert.deepEqual(
      contract.createFormalGroupLinkTermination(
        validFormalGroup({ valid_until: presentButInvalidValidUntil }),
        {
          termination_id: UUID.groupTermination,
          terminated_at: "2026-08-21T09:00:00+08:00",
          terminated_by: UUID.specialist,
          reason: "present-but-invalid valid_until must fail closed",
        },
      ),
      { ok: false, code: "GROUP_LINK_TERMINATION_TIME_INVALID" },
    );
  }

  assert.deepEqual(
    contract.createSpecialistAssignmentTermination(
      validSpecialistAssignment({ valid_until: null }),
      {
        termination_id: UUID.assignmentTermination,
        terminated_at: "2026-08-21T09:00:00+08:00",
        terminated_by: UUID.commander,
        reason: "explicit null valid_until remains open and terminates cleanly",
      },
    ),
    {
      termination_id: UUID.assignmentTermination,
      assignment_id: UUID.assignment,
      case_id: UUID.case,
      specialist_id: UUID.specialist,
      terminated_at: "2026-08-21T09:00:00+08:00",
      terminated_by: UUID.commander,
      reason: "explicit null valid_until remains open and terminates cleanly",
    },
  );
  assert.deepEqual(
    contract.createSpecialistAssignmentTermination(
      (() => {
        const assignment = validSpecialistAssignment();
        delete assignment.valid_until;
        return assignment;
      })(),
      {
        termination_id: UUID.assignmentTermination,
        terminated_at: "2026-08-21T09:00:00+08:00",
        terminated_by: UUID.commander,
        reason: "omitted valid_until remains open and terminates cleanly",
      },
    ),
    {
      termination_id: UUID.assignmentTermination,
      assignment_id: UUID.assignment,
      case_id: UUID.case,
      specialist_id: UUID.specialist,
      terminated_at: "2026-08-21T09:00:00+08:00",
      terminated_by: UUID.commander,
      reason: "omitted valid_until remains open and terminates cleanly",
    },
  );
  assert.deepEqual(
    contract.createFormalGroupLinkTermination(
      validFormalGroup({ valid_until: null }),
      {
        termination_id: UUID.groupTermination,
        terminated_at: "2026-08-21T09:00:00+08:00",
        terminated_by: UUID.specialist,
        reason: "explicit null valid_until remains open and terminates cleanly",
      },
    ),
    {
      termination_id: UUID.groupTermination,
      group_link_id: UUID.groupLink,
      case_id: UUID.case,
      line_group_id: "LINE-GROUP-001",
      terminated_at: "2026-08-21T09:00:00+08:00",
      terminated_by: UUID.specialist,
      reason: "explicit null valid_until remains open and terminates cleanly",
    },
  );
  assert.deepEqual(
    contract.createFormalGroupLinkTermination(
      (() => {
        const link = validFormalGroup();
        delete link.valid_until;
        return link;
      })(),
      {
        termination_id: UUID.groupTermination,
        terminated_at: "2026-08-21T09:00:00+08:00",
        terminated_by: UUID.specialist,
        reason: "omitted valid_until remains open and terminates cleanly",
      },
    ),
    {
      termination_id: UUID.groupTermination,
      group_link_id: UUID.groupLink,
      case_id: UUID.case,
      line_group_id: "LINE-GROUP-001",
      terminated_at: "2026-08-21T09:00:00+08:00",
      terminated_by: UUID.specialist,
      reason: "omitted valid_until remains open and terminates cleanly",
    },
  );
  assert.deepEqual(
    contract.createSpecialistAssignmentTermination(
      validSpecialistAssignment({ valid_until: "2026-08-21T10:00:00+08:00" }),
      {
        termination_id: UUID.assignmentTermination,
        terminated_at: "2026-08-21T09:00:00+08:00",
        terminated_by: UUID.commander,
        reason: "valid closed interval semantics remain unchanged",
      },
    ),
    {
      termination_id: UUID.assignmentTermination,
      assignment_id: UUID.assignment,
      case_id: UUID.case,
      specialist_id: UUID.specialist,
      terminated_at: "2026-08-21T09:00:00+08:00",
      terminated_by: UUID.commander,
      reason: "valid closed interval semantics remain unchanged",
    },
  );
  assert.deepEqual(
    contract.createFormalGroupLinkTermination(
      validFormalGroup({ valid_until: "2026-08-21T10:00:00+08:00" }),
      {
        termination_id: UUID.groupTermination,
        terminated_at: "2026-08-21T09:00:00+08:00",
        terminated_by: UUID.specialist,
        reason: "valid closed interval semantics remain unchanged",
      },
    ),
    {
      termination_id: UUID.groupTermination,
      group_link_id: UUID.groupLink,
      case_id: UUID.case,
      line_group_id: "LINE-GROUP-001",
      terminated_at: "2026-08-21T09:00:00+08:00",
      terminated_by: UUID.specialist,
      reason: "valid closed interval semantics remain unchanged",
    },
  );
});

test("audit chain verification rejects unparseable and signed-six-digit occurred_at values", async () => {
  const contract = await loadContract();
  const root = validEnvelope({
    event_id: "77777777-7777-4777-8777-000000000113",
    occurred_at: "2026-08-20T10:00:00.000Z",
    source: {
      surface: "LINE",
      group_link_id: UUID.groupLink,
      transport_message_id: "LINE-MSG-VERIFY-ROOT",
    },
  });
  const successor = validEnvelope({
    event_id: "77777777-7777-4777-8777-000000000114",
    previous_event_id: root.event_id,
    occurred_at: "2026-08-20T10:01:00.000Z",
    source: {
      surface: "LINE",
      group_link_id: UUID.groupLink,
      transport_message_id: "LINE-MSG-VERIFY-SUCCESSOR",
    },
  });

  for (const tamperedOccurredAt of [
    "not-a-time",
    "-000001-12-31T10:30:00.000Z",
    "+010000-01-01T00:00:00.000Z",
  ]) {
    assert.deepEqual(
      contract.createEventChainVerifier([
        { ...root, occurred_at: tamperedOccurredAt },
        successor,
      ]),
      { ok: false, code: "AUDIT_EVENT_OCCURRED_AT_INVALID" },
    );
  }
});

test("work-item subject refs require UUID-only closed document or drawing schemas", async () => {
  const { appendAuditEvent, createWorkItem } = await loadContract();
  const context = validContext();
  const { lineEvent, aiReview, humanDecision } = appendSequence(await loadContract(), context);

  assert.deepEqual(createWorkItem({
    work_item_id: UUID.workItem,
    case_id: UUID.case,
    work_item_type: "DOCUMENT_REVIEW",
    subject_ref: { document_id: UUID.document, version: "v1" },
    requested_by: UUID.owner,
    created_at: "2026-08-20T10:00:00+08:00",
  }).subject_ref, { document_id: UUID.document, version: "v1" });
  assert.deepEqual(createWorkItem({
    work_item_id: UUID.workItem,
    case_id: UUID.case,
    work_item_type: "DOCUMENT_REVIEW",
    subject_ref: { document_id: "DOC-001", version: "v1" },
    requested_by: UUID.owner,
    created_at: "2026-08-20T10:00:00+08:00",
  }), { ok: false, code: "WORK_ITEM_SUBJECT_REF_INVALID" });
  assert.deepEqual(createWorkItem({
    work_item_id: UUID.workItem,
    case_id: UUID.case,
    work_item_type: "DOCUMENT_REVIEW",
    subject_ref: { document_id: UUID.document, version: "v1", private_draft: { text: "not persisted" } },
    requested_by: UUID.owner,
    created_at: "2026-08-20T10:00:00+08:00",
  }), { ok: false, code: "WORK_ITEM_SUBJECT_REF_INVALID" });
  assert.deepEqual(createWorkItem({
    work_item_id: UUID.workItem,
    case_id: UUID.case,
    work_item_type: "DOCUMENT_REVIEW",
    subject_ref: { document_id: UUID.document, drawing_id: UUID.drawing, version: "v1" },
    requested_by: UUID.owner,
    created_at: "2026-08-20T10:00:00+08:00",
  }), { ok: false, code: "WORK_ITEM_SUBJECT_REF_INVALID" });
  assert.deepEqual(createWorkItem({
    work_item_id: UUID.workItem,
    case_id: UUID.case,
    work_item_type: "DRAWING_REVIEW",
    subject_ref: { drawing_id: null, version: "v1" },
    requested_by: UUID.owner,
    created_at: "2026-08-20T10:00:00+08:00",
  }), { ok: false, code: "WORK_ITEM_SUBJECT_REF_INVALID" });
  assert.deepEqual(
    appendAuditEvent(validEnvelope({
      event_id: "3d3d3d3d-3d3d-4d3d-8d3d-3d3d3d3d3d3d",
      event_type: "WORK_ITEM_TRANSITION",
      previous_event_id: humanDecision.event_id,
      occurred_at: "2026-08-20T10:30:00+08:00",
      actor: { actor_type: "drs_specialist", actor_id: UUID.specialist },
      source: { surface: "DRS_WORKSPACE" },
      payload: {
        work_item_id: "not-a-uuid",
        action: "MARK_REVIEW_COMPLETED_ATTENTION",
        subject_ref: { document_id: UUID.document, version: "v1" },
      },
    }), { ...context, existingEvents: [lineEvent, aiReview, humanDecision], workItems: [] }),
    { ok: false, code: "WORK_ITEM_TRANSITION_PAYLOAD_SCHEMA_INVALID" },
  );
  assert.deepEqual(
    appendAuditEvent(validEnvelope({
      event_id: "3e3e3e3e-3e3e-4e3e-8e3e-3e3e3e3e3e3e",
      event_type: "WORK_ITEM_TRANSITION",
      previous_event_id: humanDecision.event_id,
      occurred_at: "2026-08-20T10:30:00+08:00",
      actor: { actor_type: "drs_specialist", actor_id: UUID.specialist },
      source: { surface: "DRS_WORKSPACE" },
      payload: {
        work_item_id: "3f3f3f3f-3f3f-4f3f-8f3f-3f3f3f3f3f3f",
        action: "MARK_REVIEW_COMPLETED_ATTENTION",
        subject_ref: { document_id: UUID.document, version: "v1" },
      },
    }), { ...context, existingEvents: [lineEvent, aiReview, humanDecision], workItems: [] }),
    { ok: false, code: "WORK_ITEM_NOT_FOUND" },
  );
});

test("AI review provenance binds submitted snapshots to same-case source events", async () => {
  const contract = await loadContract();
  const context = validContext();
  const lineEvent = contract.appendAuditEvent(validEnvelope(), context);
  const sameCaseHuman = {
    ...lineEvent,
    event_id: UUID.humanDecision,
    event_type: "HUMAN_DECISION",
    previous_event_id: lineEvent.event_id,
    occurred_at: "2026-08-20T10:01:00+08:00",
    actor: { actor_type: "drs_specialist", actor_id: UUID.specialist },
    source: { surface: "DRS_WORKSPACE" },
    payload: {
      decision: "EDIT_AND_SEND",
      reason: "",
      urgency: "",
      incident_id: null,
      ai_review_event_id: UUID.aiReview,
      final_snapshot_id: SNAPSHOT_SHA,
    },
  };

  assert.deepEqual(
    contract.appendAiReviewEvent(validAiReviewAppendInput({
      payload: {
        review_id: UUID.review,
        review_status: "REVIEW_COMPLETED_NO_FLAG",
        reviewed_event_id: "39393939-3939-4939-8939-393939393939",
        flags: [],
        findings: [],
      },
    }), { ...context, existingEvents: [lineEvent] }),
    { ok: false, code: "AI_REVIEW_TARGET_NOT_FOUND" },
  );
  assert.deepEqual(
    contract.appendAiReviewEvent(validAiReviewAppendInput({
      case_id: UUID.case,
      payload: {
        review_id: UUID.review,
        review_status: "REVIEW_COMPLETED_NO_FLAG",
        reviewed_event_id: "3f3f3f3f-3f3f-4f3f-8f3f-3f3f3f3f3f3f",
        flags: [],
        findings: [],
      },
    }), {
      ...context,
      existingEvents: [
        lineEvent,
        {
          ...lineEvent,
          event_id: "3f3f3f3f-3f3f-4f3f-8f3f-3f3f3f3f3f3f",
          case_id: UUID.otherCase,
        },
      ],
    }),
    { ok: false, code: "AI_REVIEW_TARGET_CASE_MISMATCH" },
  );
  assert.deepEqual(
    contract.appendAiReviewEvent(validAiReviewAppendInput({
      previous_event_id: sameCaseHuman.event_id,
      occurred_at: "2026-08-20T10:02:00+08:00",
      payload: {
        review_id: UUID.review,
        review_status: "REVIEW_COMPLETED_NO_FLAG",
        reviewed_event_id: sameCaseHuman.event_id,
        flags: [],
        findings: [],
      },
    }), { ...context, existingEvents: [lineEvent, sameCaseHuman] }),
    { ok: false, code: "AI_REVIEW_TARGET_EVENT_TYPE_INVALID" },
  );
});

test("Human decisions require same-case AI review snapshot binding except break-glass", async () => {
  const contract = await loadContract();
  const context = validContext();
  const lineEvent = contract.appendAuditEvent(validEnvelope(), context);
  const unavailableReview = contract.appendAiReviewEvent(validAiReviewAppendInput({
    payload: {
      review_id: UUID.review,
      review_status: "REVIEW_SERVICE_UNAVAILABLE",
      reviewed_event_id: lineEvent.event_id,
      flags: [],
      findings: [],
    },
  }), { ...context, existingEvents: [lineEvent] });
  const completedReview = contract.appendAiReviewEvent(validAiReviewAppendInput({
    event_id: "3d3d3d3d-3d3d-4d3d-8d3d-3d3d3d3d3d3d",
    payload: {
      review_id: "3f3f3f3f-3f3f-4f3f-8f3f-3f3f3f3f3f3f",
      review_status: "REVIEW_COMPLETED_ATTENTION",
      reviewed_event_id: lineEvent.event_id,
      flags: [],
      findings: [],
    },
  }), { ...context, existingEvents: [lineEvent] });

  assert.deepEqual(
    contract.appendAuditEvent(validEnvelope({
      event_id: UUID.humanDecision,
      event_type: "HUMAN_DECISION",
      previous_event_id: unavailableReview.event_id,
      occurred_at: "2026-08-20T10:02:00+08:00",
      actor: { actor_type: "drs_specialist", actor_id: UUID.specialist },
      source: { surface: "DRS_WORKSPACE" },
      payload: {
        ...validEditAndSendPayload({
          ai_review_event_id: "3a3a3a3a-3a3a-4a3a-8a3a-3a3a3a3a3a3a",
        }),
      },
    }), { ...context, existingEvents: [lineEvent, unavailableReview] }),
    { ok: false, code: "HUMAN_DECISION_REQUIRES_AI_REVIEW" },
  );
  assert.equal(
    contract.appendAuditEvent(validEnvelope({
      event_id: UUID.humanDecision,
      event_type: "HUMAN_DECISION",
      previous_event_id: completedReview.event_id,
      occurred_at: "2026-08-20T10:02:00+08:00",
      actor: { actor_type: "drs_specialist", actor_id: UUID.specialist },
      source: { surface: "DRS_WORKSPACE" },
      payload: {
        ...validEditAndSendPayload({
          ai_review_event_id: completedReview.event_id,
          final_snapshot_id: OTHER_SNAPSHOT_SHA,
          result_difference: resultDifference(SNAPSHOT_SHA, OTHER_SNAPSHOT_SHA),
        }),
      },
    }), { ...context, existingEvents: [lineEvent, completedReview] }).event_id,
    UUID.humanDecision,
  );
  assert.deepEqual(
    contract.appendAuditEvent(validEnvelope({
      event_id: "3a3a3a3a-3a3a-4a3a-8a3a-3a3a3a3a3a3a",
      event_type: "HUMAN_DECISION",
      previous_event_id: unavailableReview.event_id,
      occurred_at: "2026-08-20T10:02:00+08:00",
      actor: { actor_type: "drs_specialist", actor_id: UUID.specialist },
      source: { surface: "DRS_WORKSPACE" },
      payload: {
        ...validEditAndSendPayload({
          ai_review_event_id: unavailableReview.event_id,
        }),
      },
    }), { ...context, existingEvents: [lineEvent, unavailableReview] }),
    { ok: false, code: "HUMAN_DECISION_AI_REVIEW_STATUS_INVALID" },
  );
  assert.deepEqual(
    contract.appendAuditEvent(validEnvelope({
      event_id: "3e3e3e3e-3e3e-4e3e-8e3e-3e3e3e3e3e3e",
      event_type: "HUMAN_DECISION",
      previous_event_id: unavailableReview.event_id,
      occurred_at: "2026-08-20T10:02:00+08:00",
      actor: { actor_type: "drs_specialist", actor_id: UUID.specialist },
      source: { surface: "DRS_WORKSPACE" },
      payload: {
        decision: "OVERRIDE_AND_SEND",
        reason: "Human override after review.",
        urgency: "",
        incident_id: null,
        ai_review_event_id: unavailableReview.event_id,
        final_snapshot_id: SNAPSHOT_SHA,
        result_difference: resultDifference(SNAPSHOT_SHA, SNAPSHOT_SHA),
      },
    }), { ...context, existingEvents: [lineEvent, unavailableReview] }),
    { ok: false, code: "HUMAN_DECISION_AI_REVIEW_STATUS_INVALID" },
  );
  assert.deepEqual(
    contract.appendAuditEvent(validEnvelope({
      event_id: "3f3f3f3f-3f3f-4f3f-8f3f-3f3f3f3f3f3f",
      event_type: "HUMAN_DECISION",
      previous_event_id: completedReview.event_id,
      occurred_at: "2026-08-20T10:02:00+08:00",
      actor: { actor_type: "drs_specialist", actor_id: UUID.specialist },
      source: { surface: "DRS_WORKSPACE" },
      payload: {
        decision: "MANUAL_EXCEPTION_SEND",
        reason: "Manual exception is only for unavailable review service.",
        urgency: "HIGH",
        incident_id: "INC-DRS-003",
        ai_review_event_id: completedReview.event_id,
        final_snapshot_id: SNAPSHOT_SHA,
        result_difference: resultDifference(SNAPSHOT_SHA, SNAPSHOT_SHA),
      },
    }), { ...context, existingEvents: [lineEvent, completedReview] }),
    { ok: false, code: "HUMAN_DECISION_AI_REVIEW_STATUS_INVALID" },
  );
  assert.equal(
    contract.appendAuditEvent(validEnvelope({
      event_id: "3b3b3b3b-3b3b-4b3b-8b3b-3b3b3b3b3b3b",
      event_type: "HUMAN_DECISION",
      previous_event_id: unavailableReview.event_id,
      occurred_at: "2026-08-20T10:02:00+08:00",
      actor: { actor_type: "drs_specialist", actor_id: UUID.specialist },
      source: { surface: "DRS_WORKSPACE" },
      payload: {
        decision: "MANUAL_EXCEPTION_SEND",
        reason: "AI review service unavailable, specialist recorded exception.",
        urgency: "HIGH",
        incident_id: "INC-DRS-001",
        ai_review_event_id: unavailableReview.event_id,
        final_snapshot_id: SNAPSHOT_SHA,
        result_difference: resultDifference(SNAPSHOT_SHA, SNAPSHOT_SHA),
      },
    }), { ...context, existingEvents: [lineEvent, unavailableReview] }).event_id,
    "3b3b3b3b-3b3b-4b3b-8b3b-3b3b3b3b3b3b",
  );
  assert.equal(
    contract.appendAuditEvent(validEnvelope({
      event_id: "3c3c3c3c-3c3c-4c3c-8c3c-3c3c3c3c3c3c",
      event_type: "HUMAN_DECISION",
      previous_event_id: lineEvent.event_id,
      occurred_at: "2026-08-20T10:03:00+08:00",
      actor: { actor_type: "drs_specialist", actor_id: UUID.specialist },
      source: { surface: "DRS_WORKSPACE" },
      payload: {
        decision: "PRE_SEND_REVIEW_NOT_PERFORMED_BREAK_GLASS",
        reason: "Owner safety incident required immediate manual exception.",
        urgency: "CRITICAL",
        incident_id: "INC-DRS-002",
        ai_review_event_id: null,
        final_snapshot_id: OTHER_SNAPSHOT_SHA,
        break_glass_result: breakGlassResult(OTHER_SNAPSHOT_SHA),
      },
    }), { ...context, existingEvents: [lineEvent] }).event_id,
    "3c3c3c3c-3c3c-4c3c-8c3c-3c3c3c3c3c3c",
  );
});

test("EDIT_AND_SEND requires reason and changed content evidence", async () => {
  const contract = await loadContract();
  const context = validContext();
  const lineEvent = contract.appendAuditEvent(validEnvelope(), context);
  const aiReview = contract.appendAiReviewEvent(validAiReviewAppendInput({
    payload: {
      review_status: "REVIEW_COMPLETED_ATTENTION",
      reviewed_event_id: lineEvent.event_id,
      flags: [],
      findings: [],
    },
  }), { ...context, existingEvents: [lineEvent] });

  assert.deepEqual(
    contract.appendAuditEvent(validEnvelope({
      event_id: UUID.humanDecision,
      event_type: "HUMAN_DECISION",
      previous_event_id: aiReview.event_id,
      occurred_at: "2026-08-20T10:02:00+08:00",
      actor: { actor_type: "drs_specialist", actor_id: UUID.specialist },
      source: { surface: "DRS_WORKSPACE" },
      payload: {
        ...validEditAndSendPayload({
          reason: "   ",
          ai_review_event_id: aiReview.event_id,
        }),
      },
    }), { ...context, existingEvents: [lineEvent, aiReview] }),
    { ok: false, code: "HUMAN_DECISION_REASON_REQUIRED" },
  );

  assert.deepEqual(
    contract.appendAuditEvent(validEnvelope({
      event_id: "99999999-9999-4999-8999-000000000030",
      event_type: "HUMAN_DECISION",
      previous_event_id: aiReview.event_id,
      occurred_at: "2026-08-20T10:02:00+08:00",
      actor: { actor_type: "drs_specialist", actor_id: UUID.specialist },
      source: { surface: "DRS_WORKSPACE" },
      payload: {
        ...validEditAndSendPayload({
          ai_review_event_id: aiReview.event_id,
          final_snapshot_id: SNAPSHOT_SHA,
          result_difference: resultDifference(SNAPSHOT_SHA, SNAPSHOT_SHA),
        }),
      },
    }), { ...context, existingEvents: [lineEvent, aiReview] }),
    { ok: false, code: "EDIT_AND_SEND_REQUIRES_CONTENT_CHANGE" },
  );

  assert.deepEqual(
    contract.appendAuditEvent(validEnvelope({
      event_id: "99999999-9999-4999-8999-000000000031",
      event_type: "HUMAN_DECISION",
      previous_event_id: aiReview.event_id,
      occurred_at: "2026-08-20T10:02:00+08:00",
      actor: { actor_type: "drs_specialist", actor_id: UUID.specialist },
      source: { surface: "DRS_WORKSPACE" },
      payload: {
        decision: "MANUAL_EXCEPTION_SEND",
        reason: "人工例外送出。",
        urgency: "   ",
        incident_id: "INC-DRS-999",
        ai_review_event_id: aiReview.event_id,
        final_snapshot_id: SNAPSHOT_SHA,
        result_difference: resultDifference(SNAPSHOT_SHA, SNAPSHOT_SHA),
      },
    }), { ...context, existingEvents: [lineEvent, aiReview] }),
    { ok: false, code: "MANUAL_EXCEPTION_URGENCY_REQUIRED" },
  );

  assert.deepEqual(
    contract.appendAuditEvent(validEnvelope({
      event_id: "99999999-9999-4999-8999-000000000032",
      event_type: "HUMAN_DECISION",
      previous_event_id: aiReview.event_id,
      occurred_at: "2026-08-20T10:02:00+08:00",
      actor: { actor_type: "drs_specialist", actor_id: UUID.specialist },
      source: { surface: "DRS_WORKSPACE" },
      payload: {
        decision: "PRE_SEND_REVIEW_NOT_PERFORMED_BREAK_GLASS",
        reason: "人工例外送出。",
        urgency: "HIGH",
        incident_id: "   ",
        ai_review_event_id: null,
        final_snapshot_id: OTHER_SNAPSHOT_SHA,
        break_glass_result: breakGlassResult(OTHER_SNAPSHOT_SHA),
      },
    }), { ...context, existingEvents: [lineEvent, aiReview] }),
    { ok: false, code: "MANUAL_EXCEPTION_INCIDENT_REQUIRED" },
  );
});

test("final messages bind final_text to the approved final snapshot hash", async () => {
  const contract = await loadContract();
  const context = validContext();
  const lineEvent = contract.appendAuditEvent(validEnvelope(), context);
  const aiReview = contract.appendAiReviewEvent(validAiReviewAppendInput({
    payload: {
      review_id: UUID.review,
      review_status: "REVIEW_COMPLETED_ATTENTION",
      reviewed_event_id: lineEvent.event_id,
      flags: [],
      findings: [],
    },
  }), { ...context, existingEvents: [lineEvent] });
  const approvedText = "已依現場紀錄補充，請業主與廠商確認。";
  const approvedHash = finalSnapshotHash(approvedText);
  const humanDecision = contract.appendAuditEvent(validEnvelope({
    event_id: UUID.humanDecision,
    event_type: "HUMAN_DECISION",
    previous_event_id: aiReview.event_id,
    occurred_at: "2026-08-20T10:02:00+08:00",
    actor: { actor_type: "drs_specialist", actor_id: UUID.specialist },
    source: { surface: "DRS_WORKSPACE" },
      payload: {
      ...validEditAndSendPayload({
        ai_review_event_id: aiReview.event_id,
        final_snapshot_id: approvedHash,
        result_difference: resultDifference(SNAPSHOT_SHA, approvedHash),
      }),
      },
    }), { ...context, existingEvents: [lineEvent, aiReview] });

  assert.equal(humanDecision.event_id, UUID.humanDecision);
  assert.equal(
    contract.appendAuditEvent(validEnvelope({
      event_id: UUID.finalMessage,
      event_type: "FINAL_MESSAGE",
      previous_event_id: humanDecision.event_id,
      occurred_at: "2026-08-20T10:03:00+08:00",
      actor: { actor_type: "drs_specialist", actor_id: UUID.specialist },
      source: { surface: "DRS_WORKSPACE" },
      payload: {
        decision_event_id: humanDecision.event_id,
        final_snapshot_id: approvedHash,
        final_text: approvedText,
        transport_status: "ACCEPTED_BY_TRANSPORT",
      },
    }), { ...context, existingEvents: [lineEvent, aiReview, humanDecision] }).event_id,
    UUID.finalMessage,
  );
  assert.deepEqual(
    contract.appendAuditEvent(validEnvelope({
      event_id: "aaaaaaaa-aaaa-4aaa-8aaa-111111111111",
      event_type: "FINAL_MESSAGE",
      previous_event_id: humanDecision.event_id,
      occurred_at: "2026-08-20T10:03:30+08:00",
      actor: { actor_type: "drs_specialist", actor_id: UUID.specialist },
      source: { surface: "DRS_WORKSPACE" },
      payload: {
        decision_event_id: humanDecision.event_id,
        final_snapshot_id: approvedHash,
        final_text: "已被換成另一段要送出的內容。",
        transport_status: "ACCEPTED_BY_TRANSPORT",
      },
    }), { ...context, existingEvents: [lineEvent, aiReview, humanDecision] }),
    { ok: false, code: "FINAL_MESSAGE_BODY_HASH_MISMATCH" },
  );
});

test("Human decisions require closed result-difference or break-glass result binding", async () => {
  const contract = await loadContract();
  const context = validContext();
  const lineEvent = contract.appendAuditEvent(validEnvelope(), context);
  const aiReview = contract.appendAiReviewEvent(validAiReviewAppendInput({
    payload: {
      review_id: UUID.review,
      review_status: "REVIEW_COMPLETED_NO_FLAG",
      reviewed_event_id: lineEvent.event_id,
      flags: [],
      findings: [],
    },
  }), { ...context, existingEvents: [lineEvent] });
  const unavailableReview = contract.appendAiReviewEvent(validAiReviewAppendInput({
    event_id: "88888888-8888-4888-8888-000000000007",
    occurred_at: "2026-08-20T10:01:30+08:00",
    payload: {
      review_id: "12345678-1234-4234-8234-000000000007",
      review_status: "REVIEW_SERVICE_UNAVAILABLE",
      reviewed_event_id: lineEvent.event_id,
      flags: [],
      findings: [],
    },
  }), { ...context, existingEvents: [lineEvent] });
  const finalHash = finalSnapshotHash("Human final body");

  assert.equal(
    contract.appendAuditEvent(validEnvelope({
      event_id: UUID.humanDecision,
      event_type: "HUMAN_DECISION",
      previous_event_id: aiReview.event_id,
      occurred_at: "2026-08-20T10:02:00+08:00",
      actor: { actor_type: "drs_specialist", actor_id: UUID.specialist },
      source: { surface: "DRS_WORKSPACE" },
      payload: {
        ...validEditAndSendPayload({
          ai_review_event_id: aiReview.event_id,
          final_snapshot_id: finalHash,
          result_difference: resultDifference(SNAPSHOT_SHA, finalHash),
        }),
      },
    }), { ...context, existingEvents: [lineEvent, aiReview] }).event_id,
    UUID.humanDecision,
  );
  assert.deepEqual(
    contract.appendAuditEvent(validEnvelope({
      event_id: "99999999-9999-4999-8999-000000000021",
      event_type: "HUMAN_DECISION",
      previous_event_id: aiReview.event_id,
      occurred_at: "2026-08-20T10:02:00+08:00",
      actor: { actor_type: "drs_specialist", actor_id: UUID.specialist },
      source: { surface: "DRS_WORKSPACE" },
      payload: {
        decision: "EDIT_AND_SEND",
        reason: "已人工修正文句後送出。",
        urgency: "",
        incident_id: null,
        ai_review_event_id: aiReview.event_id,
        final_snapshot_id: finalHash,
      },
    }), { ...context, existingEvents: [lineEvent, aiReview] }),
    { ok: false, code: "HUMAN_DECISION_RESULT_DIFFERENCE_REQUIRED" },
  );
  assert.deepEqual(
    contract.appendAuditEvent(validEnvelope({
      event_id: "99999999-9999-4999-8999-000000000022",
      event_type: "HUMAN_DECISION",
      previous_event_id: aiReview.event_id,
      occurred_at: "2026-08-20T10:02:00+08:00",
      actor: { actor_type: "drs_specialist", actor_id: UUID.specialist },
      source: { surface: "DRS_WORKSPACE" },
      payload: {
        ...validEditAndSendPayload({
          ai_review_event_id: aiReview.event_id,
          final_snapshot_id: finalHash,
        }),
        result_difference: {
          submitted_snapshot_sha256: OTHER_SNAPSHOT_SHA,
          final_snapshot_sha256: finalHash,
          content_changed: true,
        },
      },
    }), { ...context, existingEvents: [lineEvent, aiReview] }),
    { ok: false, code: "HUMAN_DECISION_RESULT_DIFFERENCE_AI_SNAPSHOT_MISMATCH" },
  );
  assert.deepEqual(
    contract.appendAuditEvent(validEnvelope({
      event_id: "99999999-9999-4999-8999-000000000023",
      event_type: "HUMAN_DECISION",
      previous_event_id: aiReview.event_id,
      occurred_at: "2026-08-20T10:02:00+08:00",
      actor: { actor_type: "drs_specialist", actor_id: UUID.specialist },
      source: { surface: "DRS_WORKSPACE" },
      payload: {
        ...validEditAndSendPayload({
          ai_review_event_id: aiReview.event_id,
          final_snapshot_id: finalHash,
        }),
        result_difference: {
          submitted_snapshot_sha256: SNAPSHOT_SHA,
          final_snapshot_sha256: OTHER_SNAPSHOT_SHA,
          content_changed: true,
        },
      },
    }), { ...context, existingEvents: [lineEvent, aiReview] }),
    { ok: false, code: "HUMAN_DECISION_RESULT_DIFFERENCE_FINAL_SNAPSHOT_MISMATCH" },
  );
  assert.deepEqual(
    contract.appendAuditEvent(validEnvelope({
      event_id: "99999999-9999-4999-8999-000000000024",
      event_type: "HUMAN_DECISION",
      previous_event_id: aiReview.event_id,
      occurred_at: "2026-08-20T10:02:00+08:00",
      actor: { actor_type: "drs_specialist", actor_id: UUID.specialist },
      source: { surface: "DRS_WORKSPACE" },
      payload: {
        ...validEditAndSendPayload({
          ai_review_event_id: aiReview.event_id,
          final_snapshot_id: finalHash,
        }),
        result_difference: {
          submitted_snapshot_sha256: SNAPSHOT_SHA,
          final_snapshot_sha256: finalHash,
          content_changed: false,
        },
      },
    }), { ...context, existingEvents: [lineEvent, aiReview] }),
    { ok: false, code: "HUMAN_DECISION_RESULT_DIFFERENCE_CHANGED_FLAG_MISMATCH" },
  );
  assert.equal(
    contract.appendAuditEvent(validEnvelope({
      event_id: "99999999-9999-4999-8999-000000000025",
      event_type: "HUMAN_DECISION",
      previous_event_id: lineEvent.event_id,
      occurred_at: "2026-08-20T10:03:00+08:00",
      actor: { actor_type: "drs_specialist", actor_id: UUID.specialist },
      source: { surface: "DRS_WORKSPACE" },
      payload: {
        decision: "PRE_SEND_REVIEW_NOT_PERFORMED_BREAK_GLASS",
        reason: "Immediate documented incident.",
        urgency: "CRITICAL",
        incident_id: "INC-DRS-BG-001",
        ai_review_event_id: null,
        final_snapshot_id: finalHash,
        break_glass_result: breakGlassResult(finalHash),
      },
    }), { ...context, existingEvents: [lineEvent] }).event_id,
    "99999999-9999-4999-8999-000000000025",
  );
  for (const reviewId of [aiReview.event_id, unavailableReview.event_id]) {
    assert.deepEqual(
      contract.appendAuditEvent(validEnvelope({
        event_id: reviewId === aiReview.event_id
          ? "99999999-9999-4999-8999-000000000026"
          : "99999999-9999-4999-8999-000000000027",
        event_type: "HUMAN_DECISION",
        previous_event_id: reviewId,
        occurred_at: "2026-08-20T10:03:00+08:00",
        actor: { actor_type: "drs_specialist", actor_id: UUID.specialist },
        source: { surface: "DRS_WORKSPACE" },
        payload: {
          decision: "PRE_SEND_REVIEW_NOT_PERFORMED_BREAK_GLASS",
          reason: "Immediate documented incident.",
          urgency: "CRITICAL",
          incident_id: "INC-DRS-BG-001",
          ai_review_event_id: reviewId,
          final_snapshot_id: finalHash,
          break_glass_result: breakGlassResult(finalHash),
        },
      }), { ...context, existingEvents: [lineEvent, aiReview, unavailableReview] }),
      { ok: false, code: "BREAK_GLASS_AI_REVIEW_FORBIDDEN" },
    );
  }
});

test("receipts bind transport acceptance to same-case final messages without read confirmation", async () => {
  const contract = await loadContract();
  const context = validContext();
  const { lineEvent, aiReview, humanDecision, finalMessage } = appendSequence(contract, context);

  assert.deepEqual(
    contract.appendAuditEvent(validEnvelope({
      event_id: UUID.receipt,
      event_type: "RECEIPT",
      previous_event_id: finalMessage.event_id,
      occurred_at: "2026-08-20T10:04:00+08:00",
      actor: { actor_type: "system", actor_id: "DRS-AUDIT" },
      source: { surface: "SYSTEM" },
      recipient_read: false,
      payload: {
        final_message_event_id: finalMessage.event_id,
        receipt_kind: "TRANSPORT_ACCEPTED",
        recipient_read: true,
        transport_message_id: "LINE-MSG-FINAL-001",
        accepted_at: "2026-08-20T10:03:30+08:00",
        ingested_at: "2026-08-20T10:04:00+08:00",
      },
    }), { ...context, existingEvents: [lineEvent, aiReview, humanDecision, finalMessage] }),
    { ok: false, code: "TRANSPORT_ACCEPTED_IS_NOT_RECIPIENT_READ" },
  );
  assert.deepEqual(
    contract.appendAuditEvent(validEnvelope({
      event_id: UUID.receipt,
      event_type: "RECEIPT",
      previous_event_id: finalMessage.event_id,
      occurred_at: "2026-08-20T10:04:00+08:00",
      actor: { actor_type: "system", actor_id: "DRS-AUDIT" },
      source: { surface: "SYSTEM" },
      recipient_read: true,
      payload: {
        final_message_event_id: finalMessage.event_id,
        receipt_kind: "TRANSPORT_ACCEPTED",
        recipient_read: false,
        transport_message_id: "LINE-MSG-FINAL-001",
        accepted_at: "2026-08-20T10:03:30+08:00",
        ingested_at: "2026-08-20T10:04:00+08:00",
      },
    }), { ...context, existingEvents: [lineEvent, aiReview, humanDecision, finalMessage] }),
    { ok: false, code: "TRANSPORT_ACCEPTED_IS_NOT_RECIPIENT_READ" },
  );
  assert.deepEqual(
    contract.appendAuditEvent(validEnvelope({
      event_id: UUID.receipt,
      event_type: "RECEIPT",
      previous_event_id: finalMessage.event_id,
      occurred_at: "2026-08-20T10:04:00+08:00",
      actor: { actor_type: "system", actor_id: "DRS-AUDIT" },
      source: { surface: "SYSTEM" },
      recipient_read: false,
      payload: {
        final_message_event_id: "3d3d3d3d-3d3d-4d3d-8d3d-3d3d3d3d3d3d",
        receipt_kind: "TRANSPORT_ACCEPTED",
        recipient_read: false,
        transport_message_id: "LINE-MSG-FINAL-001",
        accepted_at: "2026-08-20T10:03:30+08:00",
        ingested_at: "2026-08-20T10:04:00+08:00",
      },
    }), { ...context, existingEvents: [lineEvent, aiReview, humanDecision, finalMessage] }),
    { ok: false, code: "RECEIPT_FINAL_MESSAGE_REQUIRED" },
  );
  assert.deepEqual(
    contract.appendAuditEvent(validEnvelope({
      event_id: UUID.receipt,
      event_type: "RECEIPT",
      previous_event_id: finalMessage.event_id,
      occurred_at: "2026-08-20T10:04:00+08:00",
      actor: { actor_type: "system", actor_id: "DRS-AUDIT" },
      source: { surface: "SYSTEM" },
      recipient_read: false,
      payload: {
        final_message_event_id: finalMessage.event_id,
        receipt_kind: "RECIPIENT_READ",
        recipient_read: false,
        transport_message_id: "LINE-MSG-FINAL-001",
        accepted_at: "2026-08-20T10:03:30+08:00",
        ingested_at: "2026-08-20T10:04:00+08:00",
      },
    }), { ...context, existingEvents: [lineEvent, aiReview, humanDecision, finalMessage] }),
    { ok: false, code: "RECEIPT_KIND_INVALID" },
  );
});

test("specialist work-item audit and transition reject stale assignment after termination", async () => {
  const contract = await loadContract();
  const context = validContext();
  const { lineEvent, aiReview, humanDecision } = appendSequence(contract, context);
  const documentReview = contract.createWorkItem({
    work_item_id: UUID.workItem,
    case_id: UUID.case,
    work_item_type: "DOCUMENT_REVIEW",
    subject_ref: { document_id: UUID.document, version: "v1" },
    requested_by: UUID.owner,
    created_at: "2026-08-20T10:00:00+08:00",
  });
  const transitionEvent = validEnvelope({
    event_id: "3e3e3e3e-3e3e-4e3e-8e3e-3e3e3e3e3e3e",
    event_type: "WORK_ITEM_TRANSITION",
    previous_event_id: humanDecision.event_id,
    occurred_at: "2026-08-20T10:30:00+08:00",
    actor: { actor_type: "drs_specialist", actor_id: UUID.specialist },
    source: { surface: "DRS_WORKSPACE" },
    payload: {
      work_item_id: UUID.workItem,
      action: "MARK_REVIEW_COMPLETED_ATTENTION",
      subject_ref: { document_id: UUID.document, version: "v1" },
    },
  });
  const terminatedContext = {
    ...context,
    assignmentTerminations: [validAssignmentTermination({ terminated_at: "2026-08-20T10:29:00+08:00" })],
    existingEvents: [lineEvent, aiReview, humanDecision],
    workItems: [documentReview],
  };

  assert.deepEqual(
    contract.appendAuditEvent(transitionEvent, terminatedContext),
    { ok: false, code: "WORK_ITEM_TRANSITION_SPECIALIST_NOT_ACTIVE" },
  );

  assert.deepEqual(
    contract.transitionWorkItem(documentReview, {
      transition_id: UUID.transition,
      audit_event_id: transitionEvent.event_id,
      case_id: UUID.case,
      action: "MARK_REVIEW_COMPLETED_ATTENTION",
      actor_type: "drs_specialist",
      actor_id: UUID.specialist,
      occurred_at: "2026-08-20T10:30:00+08:00",
    }, { ...terminatedContext, auditEvents: [lineEvent, aiReview, humanDecision, transitionEvent] }),
    { ok: false, code: "WORK_ITEM_TRANSITION_SPECIALIST_NOT_ACTIVE" },
  );
});

test("closed payload schemas reject unrelated nested conversation data and unknown keys", async () => {
  const contract = await loadContract();
  const { appendAuditEvent } = contract;
  const context = validContext();
  const { lineEvent } = appendSequence(await loadContract(), context);

  assert.deepEqual(
    appendAuditEvent(
      validEnvelope({
        payload: {
          message_state: "SENT",
          message_kind: "TEXT",
          sent_text: "Only sent fields are accepted.",
          attachment_refs: [],
          unrelated_conversation: { private_message: { text: "not allowed" } },
        },
      }),
      context,
    ),
    { ok: false, code: "LINE_SENT_PAYLOAD_SCHEMA_INVALID" },
  );
  assert.deepEqual(
    contract.appendAiReviewEvent(
      validAiReviewAppendInput({
        payload: {
          review_status: "REVIEW_COMPLETED_NO_FLAG",
          reviewed_event_id: lineEvent.event_id,
          flags: [{ code: "OK", severity: "none", private_message: "not allowed" }],
        },
      }),
      { ...context, existingEvents: [lineEvent] },
    ),
    { ok: false, code: "AI_REVIEW_PAYLOAD_SCHEMA_INVALID" },
  );
});

test("closed typed payload schemas reject missing, null, empty, wrong scalar, mismatch, and nested private fields", async () => {
  const contract = await loadContract();
  const context = validContext();
  const { lineEvent, aiReview, humanDecision } = appendSequence(contract, context);

  assert.deepEqual(
    contract.appendAuditEvent(validEnvelope({
      payload: {
        message_state: "SENT",
        message_kind: "TEXT",
        sent_text: 123,
        attachment_refs: [],
      },
    }), context),
    { ok: false, code: "LINE_SENT_PAYLOAD_SCHEMA_INVALID" },
  );
  assert.deepEqual(
    contract.appendAuditEvent(validEnvelope({
      payload: {
        message_state: "SENT",
        message_kind: "ATTACHMENT",
        sent_text: "",
        attachment_refs: [{
          attachment_id: "LINE-FILE-001",
          attachment_kind: "DRAWING",
          private_draft: { text: "not sent" },
        }],
      },
    }), context),
    { ok: false, code: "LINE_ATTACHMENT_REFS_INVALID" },
  );
  assert.equal(
    contract.appendAuditEvent(validEnvelope({
      event_id: "30303030-3030-4030-8030-303030303030",
      payload: {
        message_state: "SENT",
        message_kind: "ATTACHMENT",
        sent_text: "",
        attachment_refs: [{
          attachment_id: "LINE-FILE-001",
          attachment_kind: "DRAWING",
          sha256: "f".repeat(64),
        }],
      },
    }), context).event_id,
    "30303030-3030-4030-8030-303030303030",
  );
  assert.deepEqual(
    contract.appendAiReviewEvent(validAiReviewAppendInput({
      event_id: "31313131-3131-4131-8131-313131313131",
      payload: {
        review_status: "REVIEW_COMPLETED_ATTENTION",
        reviewed_event_id: lineEvent.event_id,
        flags: [{ code: "DRAWING_RISK", severity: "attention" }],
        findings: [{ finding_id: "F-001", severity: "attention", summary: "需人工確認", private_message: "not allowed" }],
      },
    }), { ...context, existingEvents: [lineEvent] }),
    { ok: false, code: "AI_REVIEW_PAYLOAD_SCHEMA_INVALID" },
  );
  assert.deepEqual(
    contract.appendAuditEvent(validEnvelope({
      event_id: "32323232-3232-4232-8232-323232323232",
      event_type: "HUMAN_DECISION",
      previous_event_id: aiReview.event_id,
      occurred_at: "2026-08-20T10:02:00+08:00",
      actor: { actor_type: "drs_specialist", actor_id: UUID.specialist },
      source: { surface: "DRS_WORKSPACE" },
      payload: {
        decision: "OVERRIDE_AND_SEND",
        reason: "final snapshot cannot be null.",
        urgency: "NORMAL",
        incident_id: null,
        ai_review_event_id: aiReview.event_id,
        final_snapshot_id: null,
      },
    }), { ...context, existingEvents: [lineEvent, aiReview] }),
    { ok: false, code: "HUMAN_DECISION_PAYLOAD_SCHEMA_INVALID" },
  );
  assert.deepEqual(
    contract.appendAuditEvent(validEnvelope({
      event_id: "33333333-3333-4333-8333-333333333333",
      event_type: "FINAL_MESSAGE",
      previous_event_id: humanDecision.event_id,
      occurred_at: "2026-08-20T10:03:00+08:00",
      actor: { actor_type: "drs_specialist", actor_id: UUID.specialist },
      source: { surface: "DRS_WORKSPACE" },
      payload: {
        decision_event_id: humanDecision.event_id,
        final_snapshot_id: 7,
        final_text: "Wrong scalar snapshot binding must fail closed.",
        transport_status: "ACCEPTED_BY_TRANSPORT",
      },
    }), { ...context, existingEvents: [lineEvent, aiReview, humanDecision] }),
    { ok: false, code: "FINAL_MESSAGE_PAYLOAD_SCHEMA_INVALID" },
  );
  assert.deepEqual(
    contract.appendAuditEvent(validEnvelope({
      event_id: "34343434-3434-4434-8434-343434343434",
      event_type: "FINAL_MESSAGE",
      previous_event_id: humanDecision.event_id,
      occurred_at: "2026-08-20T10:03:00+08:00",
      actor: { actor_type: "drs_specialist", actor_id: UUID.specialist },
      source: { surface: "DRS_WORKSPACE" },
      payload: {
        decision_event_id: humanDecision.event_id,
        final_snapshot_id: finalSnapshotHash("Mismatched snapshot binding must fail closed."),
        final_text: "Mismatched snapshot binding must fail closed.",
        transport_status: "ACCEPTED_BY_TRANSPORT",
      },
    }), { ...context, existingEvents: [lineEvent, aiReview, humanDecision] }),
    { ok: false, code: "FINAL_MESSAGE_SNAPSHOT_MISMATCH" },
  );
  assert.deepEqual(
    contract.appendAuditEvent(validEnvelope({
      event_id: "35353535-3535-4535-8535-353535353535",
      event_type: "RECEIPT",
      previous_event_id: humanDecision.event_id,
      occurred_at: "2026-08-20T10:04:00+08:00",
      actor: { actor_type: "system", actor_id: "DRS-AUDIT" },
      source: { surface: "SYSTEM" },
      payload: {
        final_message_event_id: UUID.finalMessage,
        receipt_kind: "TRANSPORT_ACCEPTED",
        recipient_read: null,
      },
    }), { ...context, existingEvents: [lineEvent, aiReview, humanDecision] }),
    { ok: false, code: "RECEIPT_PAYLOAD_SCHEMA_INVALID" },
  );
  assert.deepEqual(
    contract.appendAuditEvent(validEnvelope({
      event_id: "36363636-3636-4636-8636-363636363636",
      event_type: "WORK_ITEM_TRANSITION",
      previous_event_id: humanDecision.event_id,
      occurred_at: "2026-08-20T10:30:00+08:00",
      actor: { actor_type: "drs_specialist", actor_id: UUID.specialist },
      source: { surface: "DRS_WORKSPACE" },
      payload: {
        work_item_id: UUID.workItem,
        action: null,
        subject_ref: { document_id: UUID.document, version: "v1" },
      },
    }), { ...context, existingEvents: [lineEvent, aiReview, humanDecision] }),
    { ok: false, code: "WORK_ITEM_TRANSITION_PAYLOAD_SCHEMA_INVALID" },
  );
});

test("SQL candidate statically encodes Rework 6 bounded concurrency and parity fixes", () => {
  const sql = sqlSource();

  assert.match(sql, /pg_advisory_xact_lock\(hashtextextended\(input_event_id::text, 0\)\)[\s\S]*where event_id = input_event_id/i);
  assert.match(sql, /input_event_type = 'LINE_SENT_EVENT'[\s\S]*pg_advisory_xact_lock\(hashtextextended\('drs_line_transport:' \|\| input_group_link_id::text \|\| ':' \|\| input_transport_message_id, 0\)\)[\s\S]*transport_message_id = input_transport_message_id/i);
  assert.match(sql, /coalesce\(new\.payload->>'decision', ''\) in \('EDIT_AND_SEND', 'OVERRIDE_AND_SEND'\)[\s\S]*ai_review_event\.payload->>'review_status' = 'REVIEW_SERVICE_UNAVAILABLE'/i);
  assert.match(sql, /coalesce\(new\.payload->>'decision', ''\) = 'MANUAL_EXCEPTION_SEND'[\s\S]*ai_review_event\.payload->>'review_status' <> 'REVIEW_SERVICE_UNAVAILABLE'/i);
  assert.match(sql, /coalesce\(btrim\(transport_message_id\), ''\) <> ''/i);
  assert.match(sql, /coalesce\(btrim\(new\.transport_message_id\), ''\) = ''/i);
  assert.match(sql, /select \*[\s\S]*into audit_work_item[\s\S]*from public\.drs_review_work_items[\s\S]*where work_item_id = \(new\.payload->>'work_item_id'\)::uuid/i);
  assert.match(sql, /create or replace function drs_private\.enforce_drs_audit_event_insert[\s\S]*new\.occurred_at = 'infinity'::timestamptz/i);
});

test("SQL candidate statically encodes Rework 7 final hash and conflict stability", () => {
  const sql = sqlSource();

  assert.match(sql, /create or replace function drs_private\.sha256_utf8\(input_text text\)/i);
  assert.match(sql, /new\.payload->>'final_snapshot_id' is distinct from drs_private\.sha256_utf8\(new\.payload->>'final_text'\)[\s\S]*FINAL_MESSAGE_BODY_HASH_MISMATCH/i);
  assert.match(sql, /array\['decision', 'reason', 'urgency', 'incident_id', 'ai_review_event_id', 'final_snapshot_id', 'result_difference', 'break_glass_result'\]/i);
  assert.match(sql, /drs_private\.jsonb_has_only_keys\(new\.payload->'result_difference', array\['submitted_snapshot_sha256', 'final_snapshot_sha256', 'content_changed'\]\)/i);
  assert.match(sql, /new\.payload->'result_difference'->>'submitted_snapshot_sha256' is distinct from ai_review_event\.payload->>'submitted_snapshot_sha256'[\s\S]*HUMAN_DECISION_RESULT_DIFFERENCE_AI_SNAPSHOT_MISMATCH/i);
  assert.match(sql, /new\.payload->'result_difference'->>'final_snapshot_sha256' is distinct from new\.payload->>'final_snapshot_id'[\s\S]*HUMAN_DECISION_RESULT_DIFFERENCE_FINAL_SNAPSHOT_MISMATCH/i);
  assert.match(sql, /\(new\.payload->'result_difference'->>'content_changed'\)::boolean is distinct from \(\s*new\.payload->'result_difference'->>'submitted_snapshot_sha256' is distinct from new\.payload->'result_difference'->>'final_snapshot_sha256'\s*\)[\s\S]*HUMAN_DECISION_RESULT_DIFFERENCE_CHANGED_FLAG_MISMATCH/i);
  assert.match(sql, /coalesce\(new\.payload->>'decision', ''\) = 'PRE_SEND_REVIEW_NOT_PERFORMED_BREAK_GLASS'[\s\S]*jsonb_typeof\(new\.payload->'ai_review_event_id'\) = 'string'[\s\S]*BREAK_GLASS_AI_REVIEW_FORBIDDEN/i);
  assert.match(sql, /drs_private\.jsonb_has_only_keys\(new\.payload->'break_glass_result', array\['ai_review_performed', 'final_snapshot_sha256'\]\)/i);
  assert.match(sql, /new\.payload->'break_glass_result'->'ai_review_performed' is not distinct from 'false'::jsonb/i);
  assert.match(sql, /coalesce\(btrim\(subject_ref->>'version'\), ''\) <> ''/i);
  assert.match(sql, /exception when unique_violation then[\s\S]*LINE_TRANSPORT_IDENTITY_REUSE_CONFLICT[\s\S]*AUDIT_CHAIN_ROOT_ALREADY_EXISTS[\s\S]*PREVIOUS_EVENT_ALREADY_HAS_SUCCESSOR/i);
});

test("SQL candidate statically encodes Rework 8 trusted pgcrypto resolution and AI-review authority", () => {
  const sql = sqlSource();

  assert.match(sql, /create or replace function drs_private\.resolve_pgcrypto_schema\(\)/i);
  assert.match(sql, /from pg_catalog\.pg_extension extension[\s\S]*join pg_catalog\.pg_namespace namespace/i);
  assert.match(sql, /where extension\.extname = 'pgcrypto'/i);
  assert.match(sql, /raise exception 'PGCRYPTO_EXTENSION_REQUIRED'/i);
  assert.match(sql, /create or replace function drs_private\.sha256_utf8\(input_text text\)[\s\S]*set search_path = pg_catalog, pg_temp/i);
  assert.match(sql, /execute format\('select encode\(%I\.digest\(convert_to\(\$1, ''UTF8''\), ''sha256''\), ''hex''\)'/i);
  assert.doesNotMatch(sql, /select encode\(digest\(convert_to\(input_text, 'UTF8'\), 'sha256'\), 'hex'\)/i);
  assert.match(sql, /if input_event_type = 'AI_REVIEW'[\s\S]*input_allow_ai_review is not true then[\s\S]*raise exception 'AI_REVIEW_REQUIRES_TRUSTED_APPEND_PATH'/i);
  assert.match(sql, /create or replace function public\.drs_append_ai_review_event\(/i);
  assert.match(sql, /public\.drs_append_ai_review_event\(uuid, uuid, uuid, text, uuid, text, uuid, jsonb, jsonb, text\)/i);
  assert.match(sql, /input_submitted_snapshot_body text/i);
  assert.match(sql, /jsonb_build_object\([\s\S]*'submitted_snapshot_sha256'[\s\S]*drs_private\.sha256_utf8\(input_submitted_snapshot_body\)/i);
  assert.match(sql, /return drs_private\.insert_drs_audit_event\([\s\S]*'AI_REVIEW'[\s\S]*'ai_service'[\s\S]*'drs-ai-review-service'[\s\S]*'SYSTEM'/i);
  assert.match(sql, /alter function public\.drs_append_ai_review_event\(/i);
  assert.match(sql, /revoke execute on function public\.drs_append_ai_review_event\(/i);
  assert.match(sql, /grant execute on function public\.drs_append_ai_review_event\(/i);
  assert.match(sql, /if coalesce\(btrim\(new\.actor_type\), ''\) <> 'ai_service'[\s\S]*coalesce\(btrim\(new\.actor_id\), ''\) = ''[\s\S]*raise exception 'AI_REVIEW_ACTOR_INVALID'/i);
  assert.match(sql, /if coalesce\(btrim\(new\.source_surface\), ''\) <> 'SYSTEM'[\s\S]*raise exception 'AI_REVIEW_SOURCE_INVALID'/i);
  assert.match(sql, /coalesce\(new\.payload->>'decision', ''\) in \('EDIT_AND_SEND', 'OVERRIDE_AND_SEND', 'MANUAL_EXCEPTION_SEND', 'PRE_SEND_REVIEW_NOT_PERFORMED_BREAK_GLASS'\)[\s\S]*coalesce\(btrim\(new\.payload->>'reason'\), ''\) = ''[\s\S]*HUMAN_DECISION_REASON_REQUIRED/i);
  assert.match(sql, /coalesce\(new\.payload->>'decision', ''\) in \('MANUAL_EXCEPTION_SEND', 'PRE_SEND_REVIEW_NOT_PERFORMED_BREAK_GLASS'\)[\s\S]*coalesce\(btrim\(new\.payload->>'urgency'\), ''\) = ''[\s\S]*MANUAL_EXCEPTION_URGENCY_REQUIRED/i);
  assert.match(sql, /coalesce\(new\.payload->>'decision', ''\) in \('MANUAL_EXCEPTION_SEND', 'PRE_SEND_REVIEW_NOT_PERFORMED_BREAK_GLASS'\)[\s\S]*coalesce\(btrim\(new\.payload->>'incident_id'\), ''\) = ''[\s\S]*MANUAL_EXCEPTION_INCIDENT_REQUIRED/i);
  assert.match(sql, /coalesce\(new\.payload->>'decision', ''\) = 'EDIT_AND_SEND'[\s\S]*\(new\.payload->'result_difference'->>'content_changed'\)::boolean is not true[\s\S]*EDIT_AND_SEND_REQUIRES_CONTENT_CHANGE/i);
});

test("SQL candidate statically encodes Rework 11 strict RFC 3339 millisecond append timestamps", () => {
  const sql = sqlSource();

  assert.match(sql, /create or replace function drs_private\.parse_rfc3339_millis\(input_text text\)/i);
  assert.match(sql, /coalesce\(btrim\(input_text\), ''\) = ''[\s\S]*raise exception 'AUDIT_EVENT_OCCURRED_AT_INVALID'/i);
  assert.match(sql, /input_text !~ '\^\(\[0-9\]\{4\}\)-\(\[0-9\]\{2\}\)-\(\[0-9\]\{2\}\)T\(\[0-9\]\{2\}\):\(\[0-9\]\{2\}\):\(\[0-9\]\{2\}\)\(\?:\\\.\(\[0-9\]\{1,3\}\)\)\?\(Z\|\(\[\+\-\]\)\(\[0-9\]\{2\}\):\(\[0-9\]\{2\}\)\)\$'[\s\S]*AUDIT_EVENT_OCCURRED_AT_INVALID/i);
  assert.match(sql, /regexp_match\([\s\S]*input_text[\s\S]*\^\(\[0-9\]\{4\}\)-\(\[0-9\]\{2\}\)-\(\[0-9\]\{2\}\)T/i);
  assert.match(sql, /parsed_timestamp := input_text::timestamptz/i);
  assert.match(sql, /to_char\(parsed_timestamp at time zone 'UTC', 'YYYY-MM-DD\"T\"HH24:MI:SS\.MS\"Z\"'\)/i);
  assert.match(sql, /create or replace function public\.drs_append_audit_event\(/i);
  assert.match(sql, /public\.drs_append_audit_event\(uuid, uuid, uuid, text, text, text, text, text, uuid, text, jsonb, boolean\)/i);
  assert.match(sql, /create or replace function public\.drs_append_ai_review_event\(/i);
  assert.match(sql, /public\.drs_append_ai_review_event\(uuid, uuid, uuid, text, uuid, text, uuid, jsonb, jsonb, text\)/i);
  assert.match(sql, /parsed_occurred_at := drs_private\.parse_rfc3339_millis\(input_occurred_at\)/i);
  assert.match(sql, /return drs_private\.insert_drs_audit_event\([\s\S]*parsed_occurred_at/i);
  assert.doesNotMatch(sql, /public\.drs_append_audit_event\(uuid, uuid, uuid, text, timestamptz, text, text, text, uuid, text, jsonb, boolean\)/i);
  assert.doesNotMatch(sql, /public\.drs_append_ai_review_event\(uuid, uuid, uuid, timestamptz, uuid, text, uuid, jsonb, jsonb, text\)/i);
});

test("SQL candidate statically encodes Rework 12 null, strict, and ±14:00 timestamp boundaries", () => {
  const sql = sqlSource();

  assert.match(sql, /create or replace function drs_private\.parse_rfc3339_millis\(input_text text\)/i);
  assert.match(sql, /if input_text is null[\s\S]*raise exception 'AUDIT_EVENT_OCCURRED_AT_INVALID'/i);
  assert.doesNotMatch(sql, /create or replace function drs_private\.parse_rfc3339_millis\(input_text text\)[\s\S]{0,120}\bstrict\b/i);
  assert.match(sql, /offset_minutes :=/i);
  assert.match(sql, /abs\(offset_minutes\) > 14 \* 60[\s\S]*raise exception 'AUDIT_EVENT_OCCURRED_AT_INVALID'/i);
  assert.match(sql, /input_occurred_at text/i);
  assert.match(sql, /parsed_occurred_at := drs_private\.parse_rfc3339_millis\(input_occurred_at\)/i);
});

test("SQL candidate statically encodes Rework 14 year-0000 rejection, 0001-9999 UTC range guards, and parser-closed canonical timestamps", () => {
  const sql = sqlSource();

  assert.match(sql, /if match_parts\[1\] = '0000'[\s\S]*raise exception 'AUDIT_EVENT_OCCURRED_AT_INVALID'[\s\S]*make_date/i);
  assert.match(sql, /if match_parts\[1\] = '0001'[\s\S]*match_parts\[2\]::integer = 1[\s\S]*match_parts\[3\]::integer = 1[\s\S]*offset_minutes > 0[\s\S]*local_time_millis < \(offset_minutes::bigint \* 60 \* 1000\)[\s\S]*AUDIT_EVENT_OCCURRED_AT_INVALID/i);
  assert.match(sql, /if match_parts\[1\] = '9999'[\s\S]*match_parts\[2\]::integer = 12[\s\S]*match_parts\[3\]::integer = 31[\s\S]*offset_minutes < 0[\s\S]*local_time_millis > \(86399999 \+ \(offset_minutes::bigint \* 60 \* 1000\)\)[\s\S]*AUDIT_EVENT_OCCURRED_AT_INVALID/i);
  assert.match(sql, /local_time_millis bigint;/i);
  assert.match(sql, /normalized_utc := to_char\(parsed_timestamp at time zone 'UTC', 'YYYY-MM-DD\"T\"HH24:MI:SS\.MS\"Z\"'\)/i);
  assert.match(sql, /normalized_utc !~ '\^\[0-9\]\{4\}-\[0-9\]\{2\}-\[0-9\]\{2\}T\[0-9\]\{2\}:\[0-9\]\{2\}:\[0-9\]\{2\}\\\.\[0-9\]\{3\}Z\$'[\s\S]*AUDIT_EVENT_OCCURRED_AT_INVALID/i);
  assert.match(sql, /parsed_occurred_at := drs_private\.parse_rfc3339_millis\(input_occurred_at\)/i);
});

test("SQL candidate statically encodes audit, authority, privacy, RLS-helper, assignment, and work-item invariants", () => {
  const sql = sqlSource();

  for (const table of [
    "drs_cases",
    "drs_case_line_group_links",
    "drs_case_line_group_link_terminations",
    "drs_specialists",
    "drs_case_specialist_assignments",
    "drs_case_specialist_assignment_terminations",
    "drs_case_audit_events",
    "drs_review_work_items",
    "drs_review_work_item_transitions",
  ]) {
    assert.match(sql, new RegExp(`create table if not exists public\\.${table}\\b`, "i"));
    assert.match(sql, new RegExp(`alter table public\\.${table}\\s+enable row level security`, "i"));
    assert.match(sql, new RegExp(`alter table public\\.${table}\\s+force row level security`, "i"));
  }

  assert.match(sql, /case_id uuid primary key default gen_random_uuid\(\)/i);
  assert.match(sql, /case_number text not null unique/i);
  assert.doesNotMatch(sql, /case_id text/i);

  assert.match(sql, /create schema if not exists drs_private/i);
  assert.match(sql, /security definer[\s\S]*set search_path = public, pg_temp/i);
  assert.match(sql, /create or replace function drs_private\.is_authorized_case_specialist_at/i);
  assert.match(sql, /create or replace function drs_private\.is_current_actor_active_case_specialist/i);
  assert.match(sql, /alter function drs_private\.is_authorized_case_specialist_at\(uuid, uuid, timestamptz\) owner to postgres/i);
  assert.match(sql, /alter function drs_private\.is_current_actor_active_case_specialist\(uuid\) owner to postgres/i);
  assert.match(sql, /target_specialist_id := \(select auth\.uid\(\)\)/i);
  assert.match(sql, /specialist\.authority_state = 'ACTIVE'/i);
  assert.match(sql, /revoke execute on function drs_private\.is_authorized_case_specialist_at\(uuid, uuid, timestamptz\) from public, anon, authenticated/i);
  assert.match(sql, /revoke execute on function drs_private\.is_current_actor_active_case_specialist\(uuid\) from public, anon/i);
  assert.match(sql, /grant usage on schema drs_private to authenticated/i);
  assert.match(sql, /grant execute on function drs_private\.is_current_actor_active_case_specialist\(uuid\) to authenticated/i);
  assert.doesNotMatch(sql, /grant execute on function drs_private\.is_authorized_case_specialist_at\(uuid, uuid, timestamptz\) to authenticated/i);
  assert.doesNotMatch(sql, /from public\.drs_case_specialist_assignments assignment[\s\S]{0,240}create policy/i);
  assert.match(sql, /create or replace function public\.drs_append_audit_event\(/i);
  assert.match(sql, /security definer[\s\S]*set search_path = public, pg_temp[\s\S]*insert into public\.drs_case_audit_events/i);
  assert.match(sql, /alter function public\.drs_append_audit_event\(uuid, uuid, uuid, text, text, text, text, text, uuid, text, jsonb, boolean\) owner to postgres/i);
  assert.match(sql, /revoke execute on function public\.drs_append_audit_event\(uuid, uuid, uuid, text, text, text, text, text, uuid, text, jsonb, boolean\) from public, anon, authenticated/i);
  assert.match(sql, /grant execute on function public\.drs_append_audit_event\(uuid, uuid, uuid, text, text, text, text, text, uuid, text, jsonb, boolean\) to service_role/i);
  assert.match(sql, /revoke insert, update, delete on public\.drs_case_audit_events from public, anon, authenticated, service_role/i);
  assert.match(sql, /pg_advisory_xact_lock\(hashtextextended\(input_event_id::text, 0\)\)[\s\S]*where event_id = input_event_id/i);
  assert.match(sql, /input_event_type = 'LINE_SENT_EVENT'[\s\S]*pg_advisory_xact_lock\(hashtextextended\('drs_line_transport:' \|\| input_group_link_id::text \|\| ':' \|\| input_transport_message_id, 0\)\)[\s\S]*transport_message_id = input_transport_message_id/i);
  assert.doesNotMatch(sql, /grant insert on public\.drs_case_audit_events/i);

  assert.match(sql, /constraint drs_case_audit_events_no_self_previous_check check\s*\(\s*previous_event_id is null or previous_event_id <> event_id\s*\)/i);
  assert.match(sql, /create unique index if not exists drs_case_audit_events_one_root_per_case/i);
  assert.match(sql, /create unique index if not exists drs_case_audit_events_previous_event_unique/i);
  assert.match(sql, /create unique index if not exists drs_case_audit_events_line_transport_identity_unique/i);
  assert.match(sql, /create or replace function drs_private\.enforce_drs_audit_event_insert/i);
  assert.match(sql, /previous_event\.case_id <> new\.case_id/i);
  assert.match(sql, /previous_event\.occurred_at > new\.occurred_at/i);
  assert.match(sql, /raise exception 'PREVIOUS_EVENT_CASE_MISMATCH'/i);
  assert.match(sql, /raise exception 'PREVIOUS_EVENT_CHRONOLOGY_INVALID'/i);
  assert.match(sql, /create trigger drs_case_audit_events_insert_guard/i);
  assert.match(sql, /create trigger drs_case_audit_events_no_update/i);
  assert.match(sql, /create trigger drs_case_audit_events_no_delete/i);

  assert.match(sql, /event_type <> 'FINAL_MESSAGE'[\s\S]*payload \? 'decision_event_id'/i);
  assert.match(sql, /event_type <> 'FINAL_MESSAGE'[\s\S]*payload \? 'final_snapshot_id'/i);
  assert.match(sql, /decision_event\.actor_type <> 'drs_specialist'/i);
  assert.match(sql, /coalesce\(decision_event\.payload->>'decision', ''\) not in/i);
  assert.match(sql, /jsonb_typeof\(new\.payload->'final_snapshot_id'\) is distinct from 'string'/i);
  assert.match(sql, /decision_event\.payload->>'final_snapshot_id' is distinct from new\.payload->>'final_snapshot_id'/i);
  assert.match(sql, /decision_event\.event_type <> 'HUMAN_DECISION'/i);
  assert.match(sql, /new\.actor_type <> 'drs_specialist'/i);
  assert.match(sql, /new\.source_surface <> 'DRS_WORKSPACE'/i);
  assert.match(sql, /raise exception 'HUMAN_DECISION_SOURCE_INVALID'/i);
  assert.match(sql, /raise exception 'SPECIALIST_AUTHORITY_NOT_ACTIVE'/i);
  assert.match(sql, /drs_private\.is_authorized_case_specialist_at\(new\.case_id, new\.actor_id::uuid, new\.occurred_at\)/i);
  assert.match(sql, /jsonb_typeof\(new\.payload->'review_id'\) is distinct from 'string'/i);
  assert.match(sql, /jsonb_typeof\(new\.payload->'submitted_snapshot_sha256'\) is distinct from 'string'/i);
  assert.match(sql, /new\.payload->>'submitted_snapshot_sha256' !~\* '\^\[0-9a-f\]\{64\}\$'/i);
  assert.match(sql, /reviewed_source\.event_id is null[\s\S]*AI_REVIEW_TARGET_NOT_FOUND/i);
  assert.match(sql, /reviewed_source\.case_id <> new\.case_id[\s\S]*AI_REVIEW_TARGET_CASE_MISMATCH/i);
  assert.match(sql, /reviewed_source\.event_type not in \('LINE_SENT_EVENT', 'WORK_ITEM_TRANSITION'\)/i);
  assert.match(sql, /ai_review_event\.event_type <> 'AI_REVIEW'/i);
  assert.match(sql, /coalesce\(new\.payload->>'decision', ''\) in \('EDIT_AND_SEND', 'OVERRIDE_AND_SEND'\)[\s\S]*ai_review_event\.payload->>'review_status' = 'REVIEW_SERVICE_UNAVAILABLE'/i);
  assert.match(sql, /coalesce\(new\.payload->>'decision', ''\) = 'MANUAL_EXCEPTION_SEND'[\s\S]*ai_review_event\.payload->>'review_status' <> 'REVIEW_SERVICE_UNAVAILABLE'/i);
  assert.doesNotMatch(sql, /ai_review_event\.payload->>'submitted_snapshot_sha256' is distinct from new\.payload->>'final_snapshot_id'/i);
  assert.match(sql, /coalesce\(new\.payload->>'decision', ''\) <> 'PRE_SEND_REVIEW_NOT_PERFORMED_BREAK_GLASS'[\s\S]*HUMAN_DECISION_REQUIRES_AI_REVIEW/i);
  assert.match(sql, /coalesce\(new\.payload->>'decision', ''\) in \('EDIT_AND_SEND', 'OVERRIDE_AND_SEND', 'MANUAL_EXCEPTION_SEND', 'PRE_SEND_REVIEW_NOT_PERFORMED_BREAK_GLASS'\)[\s\S]*coalesce\(btrim\(new\.payload->>'reason'\), ''\) = ''/i);
  assert.match(sql, /coalesce\(new\.payload->>'decision', ''\) in \('MANUAL_EXCEPTION_SEND', 'PRE_SEND_REVIEW_NOT_PERFORMED_BREAK_GLASS'\)/i);

  assert.match(sql, /event_type <> 'LINE_SENT_EVENT'[\s\S]*payload->>'message_state' = 'SENT'/i);
  assert.match(sql, /event_type <> 'LINE_SENT_EVENT'[\s\S]*source_surface = 'LINE'/i);
  assert.match(sql, /event_type <> 'LINE_SENT_EVENT'[\s\S]*group_link_id is not null/i);
  assert.match(sql, /coalesce\(btrim\(transport_message_id\), ''\) <> ''/i);
  assert.match(sql, /create or replace function drs_private\.jsonb_has_only_keys/i);
  assert.match(sql, /drs_private\.jsonb_has_only_keys\(new\.payload, array\['message_state', 'message_kind', 'sent_text', 'attachment_refs'\]\)/i);
  assert.match(sql, /jsonb_typeof\(new\.payload->'message_state'\) is distinct from 'string'/i);
  assert.match(sql, /new\.payload->>'message_state' is distinct from 'SENT'/i);
  assert.match(sql, /jsonb_typeof\(new\.payload->'sent_text'\) is distinct from 'string'/i);
  assert.match(sql, /jsonb_typeof\(new\.payload->'attachment_refs'\) is distinct from 'array'/i);
  assert.match(sql, /jsonb_array_elements\(new\.payload->'attachment_refs'\)/i);
  assert.match(sql, /drs_private\.jsonb_has_only_keys\(attachment_ref\.value, array\['attachment_id', 'attachment_kind', 'sha256'\]\)/i);
  assert.match(sql, /jsonb_typeof\(review_finding\.value->'summary'\) is distinct from 'string'/i);
  assert.match(sql, /raise exception 'LINE_SENT_PAYLOAD_SCHEMA_INVALID'/i);
  assert.match(sql, /coalesce\(btrim\(new\.transport_message_id\), ''\) = ''/i);
  assert.match(sql, /linked_group\.case_id <> new\.case_id/i);
  assert.match(sql, /if new\.event_type = 'LINE_SENT_EVENT'[\s\S]*pg_advisory_xact_lock\(hashtextextended\(new\.group_link_id::text, 0\)\)[\s\S]*select \*[\s\S]*into linked_group/i);
  assert.match(sql, /create table if not exists public\.drs_case_line_group_link_terminations/i);
  assert.match(sql, /create or replace function drs_private\.enforce_drs_line_group_link_insert/i);
  assert.match(sql, /pg_advisory_xact_lock\(hashtextextended\(new\.line_group_id, 0\)\)/i);
  assert.match(sql, /pg_advisory_xact_lock\(hashtextextended\(linked_group\.group_link_id::text, 0\)\)/i);
  assert.match(sql, /GROUP_LINK_TERMINATION_AFTER_DEPENDENT_EVENT_REQUIRED/i);
  assert.match(sql, /raise exception 'LINE_GROUP_LINK_INTERVAL_OVERLAP'/i);
  assert.match(sql, /create trigger drs_case_line_group_links_no_update/i);

  assert.match(sql, /create table if not exists public\.drs_case_specialist_assignment_terminations/i);
  assert.match(sql, /create or replace function drs_private\.enforce_drs_specialist_assignment_insert/i);
  assert.match(sql, /pg_advisory_xact_lock\(hashtextextended\(assignment\.assignment_id::text, 0\)\)/i);
  assert.match(sql, /ASSIGNMENT_TERMINATION_AFTER_DEPENDENT_EVENT_REQUIRED/i);
  assert.match(sql, /raise exception 'SPECIALIST_ASSIGNMENT_INTERVAL_OVERLAP'/i);
  assert.match(sql, /drs_case_specialist_assignment_terminations termination/i);
  assert.match(sql, /create trigger drs_case_specialist_assignments_no_update/i);
  assert.match(sql, /create trigger drs_case_specialist_assignments_no_delete/i);

  assert.match(sql, /create table if not exists public\.drs_review_work_item_transitions/i);
  assert.match(sql, /audit_event_id uuid not null references public\.drs_case_audit_events\(event_id\)/i);
  assert.match(sql, /create or replace function drs_private\.enforce_drs_work_item_transition_insert/i);
  assert.match(sql, /for update/i);
  assert.match(sql, /audit_event\.case_id <> new\.case_id/i);
  assert.match(sql, /audit_event\.event_type <> 'WORK_ITEM_TRANSITION'/i);
  assert.match(sql, /audit_event\.actor_type <> new\.actor_type/i);
  assert.match(sql, /jsonb_typeof\(new\.payload->'work_item_id'\) is distinct from 'string'/i);
  assert.match(sql, /new\.payload->>'work_item_id' !~\* '\^\[0-9a-f\]\{8\}-\[0-9a-f\]\{4\}-\[1-5\]\[0-9a-f\]\{3\}-\[89ab\]\[0-9a-f\]\{3\}-\[0-9a-f\]\{12\}\$'/i);
  assert.match(sql, /select \*[\s\S]*into audit_work_item[\s\S]*from public\.drs_review_work_items[\s\S]*where work_item_id = \(new\.payload->>'work_item_id'\)::uuid/i);
  assert.match(sql, /audit_work_item\.work_item_id is null[\s\S]*WORK_ITEM_NOT_FOUND/i);
  assert.match(sql, /audit_work_item\.case_id <> new\.case_id[\s\S]*WORK_ITEM_TRANSITION_CASE_MISMATCH/i);
  assert.match(sql, /jsonb_typeof\(new\.payload->'action'\) is distinct from 'string'/i);
  assert.match(sql, /jsonb_typeof\(new\.payload->'recipient_read'\) is distinct from 'boolean'/i);
  assert.match(sql, /jsonb_typeof\(new\.payload->'subject_ref'->'document_id'\) is not distinct from 'string'/i);
  assert.match(sql, /new\.payload->'subject_ref'->>'document_id' ~\* '\^\[0-9a-f\]\{8\}-\[0-9a-f\]\{4\}-\[1-5\]\[0-9a-f\]\{3\}-\[89ab\]\[0-9a-f\]\{3\}-\[0-9a-f\]\{12\}\$'/i);
  assert.match(sql, /drs_private\.jsonb_has_only_keys\(new\.payload->'subject_ref', array\['document_id', 'version'\]\)/i);
  assert.match(sql, /drs_private\.jsonb_has_only_keys\(new\.payload->'subject_ref', array\['drawing_id', 'version'\]\)/i);
  assert.match(sql, /new\.payload->'recipient_read' is distinct from to_jsonb\(new\.recipient_read\)/i);
  assert.match(sql, /receipt_final\.event_type <> 'FINAL_MESSAGE'/i);
  assert.match(sql, /receipt_accepted_at := drs_private\.parse_rfc3339_millis\(new\.payload->>'accepted_at'\)/i);
  assert.match(sql, /receipt_ingested_at := drs_private\.parse_rfc3339_millis\(new\.payload->>'ingested_at'\)/i);
  assert.match(sql, /if receipt_accepted_at > receipt_ingested_at[\s\S]*receipt_ingested_at > new\.occurred_at/i);
  assert.match(sql, /audit_event\.payload->>'work_item_id' is distinct from new\.work_item_id::text/i);
  assert.match(sql, /audit_event\.payload->>'action' is distinct from new\.action/i);
  assert.match(sql, /audit_event\.payload->'subject_ref'/i);
  assert.match(sql, /audit_event\.occurred_at is distinct from new\.occurred_at/i);
  assert.match(sql, /create or replace function drs_private\.enforce_drs_audit_event_insert[\s\S]*new\.occurred_at = '-infinity'::timestamptz/i);
  assert.match(sql, /create or replace function drs_private\.enforce_drs_audit_event_insert[\s\S]*new\.occurred_at = 'infinity'::timestamptz/i);
  assert.match(sql, /new\.occurred_at = '-infinity'::timestamptz/i);
  assert.match(sql, /new\.occurred_at = 'infinity'::timestamptz/i);
  assert.match(sql, /audit_event\.actor_id <> new\.actor_id/i);
  assert.match(sql, /new\.actor_id <> case_record\.owner_id::text/i);
  assert.match(sql, /WORK_ITEM_TRANSITION_OWNER_REQUIRED/i);
  assert.match(sql, /WORK_ITEM_TRANSITION_SPECIALIST_NOT_ACTIVE/i);
  assert.match(sql, /if new\.event_type = 'WORK_ITEM_TRANSITION'[\s\S]*select active_assignment\.assignment_id[\s\S]*perform pg_advisory_xact_lock\(hashtextextended\(active_assignment_id::text, 0\)\)[\s\S]*is_authorized_case_specialist_at\(new\.case_id, new\.actor_id::uuid, new\.occurred_at\)/i);
  assert.match(sql, /if new\.actor_type = 'drs_specialist'[\s\S]*select active_assignment\.assignment_id[\s\S]*perform pg_advisory_xact_lock\(hashtextextended\(active_assignment_id::text, 0\)\)[\s\S]*is_authorized_case_specialist_at\(new\.case_id, new\.actor_id::uuid, new\.occurred_at\)/i);
  assert.match(sql, /work_item\.case_id <> new\.case_id/i);
  assert.match(sql, /update public\.drs_review_work_items/i);
  assert.match(sql, /exists \([\s\S]*from public\.drs_review_work_item_transitions guarded_transition/i);
  assert.match(sql, /create trigger drs_review_work_item_transitions_no_update/i);
  assert.match(sql, /create trigger drs_review_work_item_transitions_no_delete/i);
  assert.doesNotMatch(sql, /pg_trigger_depth\(\)/i);
  assert.doesNotMatch(sql, /current_setting\('drs\.internal_transition_apply'/i);
  assert.doesNotMatch(sql, /set_config\('drs\.internal_transition_apply'/i);
  assert.doesNotMatch(sql, /\b(tender|bid|award|bidding|escrow|payment|pricing_rule|budget_estimate_line)\b/i);
});
