import assert from "node:assert/strict";
import test from "node:test";

const runtimeModule = await import("../src/lib/drs-integration/local-runtime.mjs").catch(() => null);

const ids = {
  caseId: "11111111-1111-4111-8111-111111111111",
  groupLinkId: "22222222-2222-4222-8222-222222222222",
  assignmentId: "33333333-3333-4333-8333-333333333333",
  specialistId: "44444444-4444-4444-8444-444444444444",
  sourceEventId: "55555555-5555-4555-8555-555555555555",
};

const now = "2026-08-21T01:00:00.000Z";

function createFixture({
  transportStatus = "ACCEPTED",
  advisoryStatus = "REVIEW_COMPLETED_NO_FLAG",
  advisoryResult = null,
  sendLineImpl = null,
  additionalGroupLinks = [],
  assignmentValidFrom = "2026-08-20T00:00:00.000Z",
  groupValidFrom = "2026-08-20T00:00:00.000Z",
} = {}) {
  let sequence = 0;
  let transportCalls = 0;
  const transportPayloads = [];
  const advisoryInputs = [];
  const initialEvent = {
    event_id: ids.sourceEventId,
    case_id: ids.caseId,
    previous_event_id: null,
    event_type: "LINE_SENT_EVENT",
    occurred_at: "2026-08-21T00:55:00.000Z",
    actor: { actor_type: "owner", actor_id: "owner-subject" },
    payload: {
      message_state: "SENT",
      formal_link_id: ids.groupLinkId,
      line_group_id: "line-group-01",
    },
  };

  return {
    runtime: runtimeModule?.createLocalDrsRuntime({
      now: () => now,
      nextId: () => `aaaaaaaa-aaaa-4aaa-8aaa-${String(++sequence).padStart(12, "0")}`,
      verifySession: async (token) => {
        if (token === "specialist-session") return { authSubject: "auth-specialist-01" };
        if (token === "other-session") return { authSubject: "auth-specialist-02" };
        return null;
      },
      advisoryReview: async (payload) => {
        advisoryInputs.push(structuredClone(payload));
        return advisoryResult ?? ({
          status: advisoryStatus,
          findings: [],
          proposedText: "已依案件文件整理回覆。",
          modelId: "mock-advisory",
        });
      },
      sendLine: async (payload) => {
        transportCalls += 1;
        transportPayloads.push(structuredClone(payload));
        if (sendLineImpl) return sendLineImpl(payload);
        if (transportStatus !== "ACCEPTED") return { status: transportStatus };
        return {
          status: "ACCEPTED",
          transportMessageId: "line-message-accepted-01",
          acceptedAt: now,
          lineGroupId: payload.lineGroupId,
          transportPayloadSha256: payload.transportPayloadSha256,
        };
      },
      initialState: {
        cases: [{ caseId: ids.caseId, ownerSubject: "owner-subject" }],
        specialistBindings: [{ specialistId: ids.specialistId, authSubject: "auth-specialist-01" }],
        assignments: [{
          assignmentId: ids.assignmentId,
          caseId: ids.caseId,
          specialistId: ids.specialistId,
          validFrom: assignmentValidFrom,
          validUntil: null,
          status: "ACTIVE",
        }],
        groupLinks: [{
          groupLinkId: ids.groupLinkId,
          caseId: ids.caseId,
          lineGroupId: "line-group-01",
          groupKind: "DRS_CASE_GROUP",
          visibilityScope: "OWNER_VENDOR_DRS_SHARED",
          validFrom: groupValidFrom,
          validUntil: null,
        }, ...additionalGroupLinks],
        auditEvents: [initialEvent],
      },
    }),
    transportCalls: () => transportCalls,
    transportPayloads: () => structuredClone(transportPayloads),
    advisoryInputs: () => structuredClone(advisoryInputs),
  };
}

function containsForbiddenKey(value) {
  if (!value || typeof value !== "object") return false;
  for (const [key, child] of Object.entries(value)) {
    if (["submittedBody", "submitted_body", "intermediateEdits", "hiddenReasoning", "chainOfThought"].includes(key)) return true;
    if (containsForbiddenKey(child)) return true;
  }
  return false;
}

test("normal outbound flow requires Human authority and records transport acceptance", async () => {
  assert.ok(runtimeModule, "DRS local integration runtime is missing");
  const fixture = createFixture();

  const review = await fixture.runtime.submitForAdvisoryReview({
    sessionToken: "specialist-session",
    caseId: ids.caseId,
    groupLinkId: ids.groupLinkId,
    assignmentId: ids.assignmentId,
    sourceEventId: ids.sourceEventId,
    submittedBody: "請依圖面第二版確認天花高度。",
  });

  assert.equal(review.status, "REVIEW_COMPLETED_NO_FLAG");
  assert.equal(fixture.transportCalls(), 0, "AI review must never send by itself");

  const sendInput = {
    sessionToken: "specialist-session",
    reviewId: review.reviewId,
    idempotencyKey: "normal-send-01",
    decisionType: "EDIT_AND_SEND",
    reason: "依最新圖面調整說明",
    finalBody: "已依案件文件整理回覆。",
    finalAttachments: [{
      attachmentId: "66666666-6666-4666-8666-666666666666",
      sha256: "1".repeat(64),
    }],
  };
  const result = await fixture.runtime.decideAndSend(sendInput);

  assert.equal(result.status, "TRANSPORT_ACCEPTED");
  assert.equal(fixture.transportCalls(), 1);
  assert.equal(result.receipt.recipientRead, false);
  assert.notEqual(result.bodySha256, result.transportPayloadSha256);

  const events = fixture.runtime.getCaseAuditEvents(ids.caseId);
  assert.deepEqual(events.map((event) => event.event_type), [
    "LINE_SENT_EVENT",
    "REVIEW_SNAPSHOT_SUBMITTED",
    "AI_REVIEW",
    "HUMAN_DECISION",
    "FINAL_MESSAGE",
    "RECEIPT",
  ]);
  for (let index = 1; index < events.length; index += 1) {
    assert.equal(events[index].previous_event_id, events[index - 1].event_id);
  }
  assert.equal(events[4].payload.transport_status, "ACCEPTED_BY_TRANSPORT");
  assert.equal(events[4].payload.line_group_id, "line-group-01");
  assert.equal(events[5].payload.recipient_read, false);
  assert.equal(events[1].payload.submitted_snapshot_sha256, review.submittedSnapshotSha256);
  assert.equal(events[2].payload.reviewed_snapshot_event_id, events[1].event_id);
  assert.deepEqual(fixture.advisoryInputs(), [{
    body: "請依圖面第二版確認天花高度。",
    submittedSnapshotSha256: review.submittedSnapshotSha256,
  }]);
  assert.ok(events.every((event) => !containsForbiddenKey(event)));

  const replay = await fixture.runtime.decideAndSend(sendInput);
  assert.deepEqual(replay, result);
  assert.equal(fixture.transportCalls(), 1, "accepted replay must not send twice");
  assert.equal(fixture.runtime.getCaseAuditEvents(ids.caseId).length, 6);

  await assert.rejects(() => fixture.runtime.decideAndSend({
    ...sendInput,
    finalBody: "內容被更換",
  }), /IDEMPOTENCY_CONFLICT/);
});

test("transport timeout cannot fabricate FINAL_MESSAGE or RECEIPT", async () => {
  assert.ok(runtimeModule, "DRS local integration runtime is missing");
  const fixture = createFixture({ transportStatus: "TIMEOUT" });
  const review = await fixture.runtime.submitForAdvisoryReview({
    sessionToken: "specialist-session",
    caseId: ids.caseId,
    groupLinkId: ids.groupLinkId,
    assignmentId: ids.assignmentId,
    sourceEventId: ids.sourceEventId,
    submittedBody: "請確認材料送達日期。",
  });

  const result = await fixture.runtime.decideAndSend({
    sessionToken: "specialist-session",
    reviewId: review.reviewId,
    idempotencyKey: "timeout-send-01",
    decisionType: "EDIT_AND_SEND",
    reason: "補充案件依據",
    finalBody: "材料日期仍待供應商確認。",
    finalAttachments: [],
  });

  assert.equal(result.status, "TRANSPORT_NOT_ACCEPTED");
  assert.deepEqual(
    fixture.runtime.getCaseAuditEvents(ids.caseId).map((event) => event.event_type),
    ["LINE_SENT_EVENT", "REVIEW_SNAPSHOT_SUBMITTED", "AI_REVIEW", "HUMAN_DECISION"],
  );

  const replay = await fixture.runtime.decideAndSend({
    sessionToken: "specialist-session",
    reviewId: review.reviewId,
    idempotencyKey: "timeout-send-01",
    decisionType: "EDIT_AND_SEND",
    reason: "補充案件依據",
    finalBody: "材料日期仍待供應商確認。",
    finalAttachments: [],
  });
  assert.deepEqual(replay, result);
  assert.equal(fixture.transportCalls(), 1, "failed transport replay must be stable");
});

test("a different authenticated subject cannot use the assigned specialist authority", async () => {
  assert.ok(runtimeModule, "DRS local integration runtime is missing");
  const fixture = createFixture();

  await assert.rejects(() => fixture.runtime.submitForAdvisoryReview({
    sessionToken: "other-session",
    caseId: ids.caseId,
    groupLinkId: ids.groupLinkId,
    assignmentId: ids.assignmentId,
    sourceEventId: ids.sourceEventId,
    submittedBody: "不得送出",
  }), /SPECIALIST_IDENTITY_MISMATCH/);

  assert.equal(fixture.transportCalls(), 0);
  assert.deepEqual(
    fixture.runtime.getCaseAuditEvents(ids.caseId).map((event) => event.event_type),
    ["LINE_SENT_EVENT"],
  );
});

test("review-service unavailable requires a complete Human break-glass decision", async () => {
  assert.ok(runtimeModule, "DRS local integration runtime is missing");
  const fixture = createFixture({ advisoryStatus: "REVIEW_SERVICE_UNAVAILABLE" });
  const review = await fixture.runtime.submitForAdvisoryReview({
    sessionToken: "specialist-session",
    caseId: ids.caseId,
    groupLinkId: ids.groupLinkId,
    assignmentId: ids.assignmentId,
    sourceEventId: ids.sourceEventId,
    submittedBody: "緊急通知：現場停工待確認。",
  });

  await assert.rejects(() => fixture.runtime.decideAndSend({
    sessionToken: "specialist-session",
    reviewId: review.reviewId,
    idempotencyKey: "break-glass-invalid-01",
    decisionType: "EDIT_AND_SEND",
    reason: "緊急通知",
    finalBody: "現場暫停施工，待專員確認。",
  }), /MANUAL_EXCEPTION_SEND_REQUIRED/);

  await assert.rejects(() => fixture.runtime.decideAndSend({
    sessionToken: "specialist-session",
    reviewId: review.reviewId,
    idempotencyKey: "break-glass-incomplete-01",
    decisionType: "MANUAL_EXCEPTION_SEND",
    reason: "緊急通知",
    finalBody: "現場暫停施工，待專員確認。",
  }), /MANUAL_EXCEPTION_URGENCY_REQUIRED/);

  const result = await fixture.runtime.decideAndSend({
    sessionToken: "specialist-session",
    reviewId: review.reviewId,
    idempotencyKey: "break-glass-send-01",
    decisionType: "MANUAL_EXCEPTION_SEND",
    reason: "現場安全疑慮，先通知停工",
    urgency: "IMMEDIATE",
    serviceIncidentId: "incident-ai-20260821-01",
    finalBody: "現場暫停施工，待專員確認。",
    finalAttachments: [],
  });

  assert.equal(result.status, "TRANSPORT_ACCEPTED");
  assert.equal(fixture.transportCalls(), 1);
  const decision = fixture.runtime.getCaseAuditEvents(ids.caseId).find((event) => event.event_type === "HUMAN_DECISION");
  assert.equal(decision.payload.urgency, "IMMEDIATE");
  assert.equal(decision.payload.service_incident_id, "incident-ai-20260821-01");
});

test("parallel exact replay reserves one Human finalization and one transport call", async () => {
  let releaseTransport;
  const transportGate = new Promise((resolve) => { releaseTransport = resolve; });
  const fixture = createFixture({
    sendLineImpl: async (payload) => {
      await transportGate;
      return {
        status: "ACCEPTED",
        transportMessageId: "line-message-race-01",
        acceptedAt: now,
        lineGroupId: payload.lineGroupId,
        transportPayloadSha256: payload.transportPayloadSha256,
      };
    },
  });
  const review = await fixture.runtime.submitForAdvisoryReview({
    sessionToken: "specialist-session",
    caseId: ids.caseId,
    groupLinkId: ids.groupLinkId,
    assignmentId: ids.assignmentId,
    sourceEventId: ids.sourceEventId,
    submittedBody: "同一送出要求不得並行重複。",
  });
  const input = {
    sessionToken: "specialist-session",
    reviewId: review.reviewId,
    idempotencyKey: "parallel-send-01",
    decisionType: "EDIT_AND_SEND",
    reason: "依案件紀錄送出",
    finalBody: "已確認，請依案件紀錄辦理。",
    finalAttachments: [],
  };

  const first = fixture.runtime.decideAndSend(input);
  await new Promise((resolve) => setImmediate(resolve));
  const second = fixture.runtime.decideAndSend(input);
  releaseTransport();
  const [firstResult, secondResult] = await Promise.all([first, second]);

  assert.deepEqual(secondResult, firstResult);
  assert.equal(fixture.transportCalls(), 1);
  assert.deepEqual(
    fixture.runtime.getCaseAuditEvents(ids.caseId).map((event) => event.event_type),
    ["LINE_SENT_EVENT", "REVIEW_SNAPSHOT_SUBMITTED", "AI_REVIEW", "HUMAN_DECISION", "FINAL_MESSAGE", "RECEIPT"],
  );
});

test("source event, formal link, destination, and transport hash cannot be substituted", async () => {
  const otherGroupLink = {
    groupLinkId: "77777777-7777-4777-8777-777777777777",
    caseId: ids.caseId,
    lineGroupId: "line-group-private-02",
    groupKind: "DRS_CASE_GROUP",
    visibilityScope: "OWNER_DRS_PRIVATE",
    validFrom: "2026-08-20T00:00:00.000Z",
    validUntil: null,
  };
  const fixture = createFixture({ additionalGroupLinks: [otherGroupLink] });

  await assert.rejects(() => fixture.runtime.submitForAdvisoryReview({
    sessionToken: "specialist-session",
    caseId: ids.caseId,
    groupLinkId: otherGroupLink.groupLinkId,
    assignmentId: ids.assignmentId,
    sourceEventId: ids.sourceEventId,
    submittedBody: "不得改送另一個正式群組。",
  }), /REVIEW_SOURCE_GROUP_MISMATCH/);
  assert.equal(fixture.transportCalls(), 0);
});

test("AI advisory output is reduced to the accepted schema before persistence", async () => {
  const fixture = createFixture({
    advisoryResult: {
      status: "REVIEW_COMPLETED_ATTENTION",
      modelId: "mock-advisory",
      proposedText: "ARBITRARY_PROPOSED_TEXT_MUST_NOT_PERSIST",
      hiddenReasoning: "must never persist",
      findings: [{
        code: "DOCUMENT_VERSION_MISSING",
        severity: "ATTENTION",
        evidenceRef: "document-version",
        recommendation: "ARBITRARY_RECOMMENDATION_MUST_NOT_PERSIST",
        submittedBody: "must never persist",
        hiddenReasoning: { chainOfThought: "must never persist" },
      }],
    },
  });
  const review = await fixture.runtime.submitForAdvisoryReview({
    sessionToken: "specialist-session",
    caseId: ids.caseId,
    groupLinkId: ids.groupLinkId,
    assignmentId: ids.assignmentId,
    sourceEventId: ids.sourceEventId,
    submittedBody: "請確認文件版本。",
  });

  assert.deepEqual(review.findings, [{
    code: "DOCUMENT_VERSION_MISSING",
    severity: "ATTENTION",
    evidenceRef: "document-version",
    recommendation: "請確認文件版本。",
  }]);
  assert.equal("proposedText" in review, false);
  assert.match(review.proposedTextSha256, /^[a-f0-9]{64}$/);
  assert.equal(containsForbiddenKey(review), false);
  const persisted = JSON.stringify(fixture.runtime.getCaseAuditEvents(ids.caseId));
  assert.equal(containsForbiddenKey(JSON.parse(persisted)), false);
  assert.equal(persisted.includes("ARBITRARY_"), false);
  assert.equal(persisted.includes('"proposed_text":'), false);
  assert.equal(persisted.includes('"proposed_text_sha256":'), true);
});

test("sparse AI findings fail closed without persisting null policy entries", async () => {
  const fixture = createFixture({
    advisoryResult: {
      status: "REVIEW_COMPLETED_ATTENTION",
      modelId: "mock-advisory",
      proposedText: "不得保存",
      findings: new Array(1),
    },
  });
  const review = await fixture.runtime.submitForAdvisoryReview({
    sessionToken: "specialist-session",
    caseId: ids.caseId,
    groupLinkId: ids.groupLinkId,
    assignmentId: ids.assignmentId,
    sourceEventId: ids.sourceEventId,
    submittedBody: "稀疏檢核結果必須失敗關閉。",
  });

  assert.equal(review.status, "REVIEW_SERVICE_UNAVAILABLE");
  assert.deepEqual(review.findings, []);
  const reviewEvent = fixture.runtime.getCaseAuditEvents(ids.caseId).find((event) => event.event_type === "AI_REVIEW");
  assert.deepEqual(reviewEvent.payload.findings, []);
});

test("malformed transport acceptance cannot create a final message or receipt", async () => {
  const fixture = createFixture({
    sendLineImpl: async (payload) => ({
      status: "ACCEPTED",
      transportMessageId: "line-malformed-time-01",
      acceptedAt: "0",
      lineGroupId: payload.lineGroupId,
      transportPayloadSha256: payload.transportPayloadSha256,
    }),
  });
  const review = await fixture.runtime.submitForAdvisoryReview({
    sessionToken: "specialist-session",
    caseId: ids.caseId,
    groupLinkId: ids.groupLinkId,
    assignmentId: ids.assignmentId,
    sourceEventId: ids.sourceEventId,
    submittedBody: "運送回執必須完整。",
  });
  const input = {
    sessionToken: "specialist-session",
    reviewId: review.reviewId,
    idempotencyKey: "malformed-accepted-01",
    decisionType: "EDIT_AND_SEND",
    reason: "依案件紀錄送出",
    finalBody: "運送回執必須完整。",
    finalAttachments: [],
  };

  const result = await fixture.runtime.decideAndSend(input);
  assert.equal(result.status, "TRANSPORT_NOT_ACCEPTED");
  assert.equal(result.transportStatus, "MALFORMED_ACCEPTANCE");
  assert.deepEqual(
    fixture.runtime.getCaseAuditEvents(ids.caseId).map((event) => event.event_type),
    ["LINE_SENT_EVENT", "REVIEW_SNAPSHOT_SUBMITTED", "AI_REVIEW", "HUMAN_DECISION"],
  );
  assert.deepEqual(await fixture.runtime.decideAndSend(input), result);
  assert.equal(fixture.transportCalls(), 1);
});

test("invalid attachment identity or hash is rejected before Human audit or transport", async () => {
  const fixture = createFixture();
  const review = await fixture.runtime.submitForAdvisoryReview({
    sessionToken: "specialist-session",
    caseId: ids.caseId,
    groupLinkId: ids.groupLinkId,
    assignmentId: ids.assignmentId,
    sourceEventId: ids.sourceEventId,
    submittedBody: "附件必須有完整身分與雜湊。",
  });

  await assert.rejects(() => fixture.runtime.decideAndSend({
    sessionToken: "specialist-session",
    reviewId: review.reviewId,
    idempotencyKey: "invalid-attachment-01",
    decisionType: "EDIT_AND_SEND",
    reason: "依案件文件送出",
    finalBody: "附件必須有完整身分與雜湊。",
    finalAttachments: [{ attachmentId: "attachment-without-hash" }],
  }), /FINAL_ATTACHMENT_INVALID/);
  assert.equal(fixture.transportCalls(), 0);
  assert.deepEqual(
    fixture.runtime.getCaseAuditEvents(ids.caseId).map((event) => event.event_type),
    ["LINE_SENT_EVENT", "REVIEW_SNAPSHOT_SUBMITTED", "AI_REVIEW"],
  );

  await assert.rejects(() => fixture.runtime.decideAndSend({
    sessionToken: "specialist-session",
    reviewId: review.reviewId,
    idempotencyKey: "sparse-attachment-01",
    decisionType: "EDIT_AND_SEND",
    reason: "依案件文件送出",
    finalBody: "附件必須有完整身分與雜湊。",
    finalAttachments: new Array(1),
  }), /FINAL_ATTACHMENT_INVALID/);
  assert.equal(fixture.transportCalls(), 0);
});

test("accepted transport evidence is snapshotted once before validation and persistence", async () => {
  let messageReads = 0;
  let acceptedAtReads = 0;
  const fixture = createFixture({
    sendLineImpl: async (payload) => ({
      status: "ACCEPTED",
      get transportMessageId() {
        messageReads += 1;
        return `line-snapshot-${messageReads}`;
      },
      get acceptedAt() {
        acceptedAtReads += 1;
        return acceptedAtReads === 1 ? now : "0";
      },
      lineGroupId: payload.lineGroupId,
      transportPayloadSha256: payload.transportPayloadSha256,
    }),
  });
  const review = await fixture.runtime.submitForAdvisoryReview({
    sessionToken: "specialist-session",
    caseId: ids.caseId,
    groupLinkId: ids.groupLinkId,
    assignmentId: ids.assignmentId,
    sourceEventId: ids.sourceEventId,
    submittedBody: "運送證據只能讀取一次。",
  });
  const result = await fixture.runtime.decideAndSend({
    sessionToken: "specialist-session",
    reviewId: review.reviewId,
    idempotencyKey: "transport-snapshot-01",
    decisionType: "EDIT_AND_SEND",
    reason: "依案件文件送出",
    finalBody: "運送證據只能讀取一次。",
    finalAttachments: [],
  });
  const events = fixture.runtime.getCaseAuditEvents(ids.caseId);
  const finalMessage = events.find((event) => event.event_type === "FINAL_MESSAGE");
  const receipt = events.find((event) => event.event_type === "RECEIPT");

  assert.equal(result.status, "TRANSPORT_ACCEPTED");
  assert.equal(messageReads, 1);
  assert.equal(acceptedAtReads, 1);
  assert.equal(result.receipt.transportMessageId, "line-snapshot-1");
  assert.equal(finalMessage.payload.transport_message_id, "line-snapshot-1");
  assert.equal(receipt.payload.transport_message_id, "line-snapshot-1");
  assert.equal(receipt.payload.accepted_at, now);
});

test("malformed assignment and group authority intervals fail closed", async () => {
  for (const fixtureOptions of [
    { assignmentValidFrom: "0" },
    { assignmentValidFrom: "2026-02-30T00:00:00.000Z" },
    { groupValidFrom: "0" },
    { groupValidFrom: "2026-02-30T00:00:00.000Z" },
  ]) {
    const fixture = createFixture(fixtureOptions);
    await assert.rejects(() => fixture.runtime.submitForAdvisoryReview({
      sessionToken: "specialist-session",
      caseId: ids.caseId,
      groupLinkId: ids.groupLinkId,
      assignmentId: ids.assignmentId,
      sourceEventId: ids.sourceEventId,
      submittedBody: "無效權限期間不得通過。",
    }), /SPECIALIST_ASSIGNMENT_NOT_ACTIVE|FORMAL_GROUP_LINK_NOT_ACTIVE/);
    assert.deepEqual(
      fixture.runtime.getCaseAuditEvents(ids.caseId).map((event) => event.event_type),
      ["LINE_SENT_EVENT"],
    );
  }
});

test("Human cancellation consumes no transport and creates no final-message receipt", async () => {
  assert.ok(runtimeModule, "DRS local integration runtime is missing");
  const fixture = createFixture();
  const review = await fixture.runtime.submitForAdvisoryReview({
    sessionToken: "specialist-session",
    caseId: ids.caseId,
    groupLinkId: ids.groupLinkId,
    assignmentId: ids.assignmentId,
    sourceEventId: ids.sourceEventId,
    submittedBody: "這則回覆暫不送出。",
  });

  const result = await fixture.runtime.decideAndSend({
    sessionToken: "specialist-session",
    reviewId: review.reviewId,
    idempotencyKey: "cancel-01",
    decisionType: "CANCEL",
    reason: "案件依據仍待補齊",
  });

  assert.equal(result.status, "CANCELLED_BY_SPECIALIST");
  assert.equal(fixture.transportCalls(), 0);
  assert.deepEqual(
    fixture.runtime.getCaseAuditEvents(ids.caseId).map((event) => event.event_type),
    ["LINE_SENT_EVENT", "REVIEW_SNAPSHOT_SUBMITTED", "AI_REVIEW", "HUMAN_DECISION"],
  );
});
