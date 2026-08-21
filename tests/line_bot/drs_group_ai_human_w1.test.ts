import {
  type AiReviewRecord,
  type AiReviewStatus,
  assertNoProductionSecrets,
  buildCaseStateFlex,
  buildComplexActionDeepLink,
  buildDrsRichMenuPayload,
  buildLinePushRequest,
  buildMissingDocumentsFlex,
  buildNextActionFlex,
  buildQuickReplyActions,
  buildReviewResultFlex,
  buildSpecialistDecisionFlex,
  buildSpecialistPrivateControlDelivery,
  completeDrsOutboundReview,
  computeFinalSnapshotSha256,
  computeHumanDecisionPayloadSha256,
  consumeComplexActionDeepLink,
  consumeLineAccountContinuation,
  consumeSpecialistPostbackHandle,
  createDeterministicAdvisoryPort,
  createLineAccountContinuation,
  createMemoryDrsLineStore,
  createPublicSafeText,
  createSpecialistPostbackHandle,
  type DrsLineMessageEvent,
  type FinalAttachmentRef,
  type FinalDeliverableMessage,
  finalizeDrsGroupSend,
  handleDirectEmergencyLineSend,
  linkLineAccount,
  processLineWebhook,
  reviewDrsOutboundContent,
  signLineBody,
  startDrsOutboundReview,
} from "../../src/lib/drs-linebot/w1.ts";

function assert(
  condition: boolean,
  message = "Assertion failed",
): asserts condition {
  if (!condition) throw new Error(message);
}

function assertEquals<T>(actual: T, expected: T, message?: string): void {
  if (actual !== expected) {
    throw new Error(
      message ?? `Expected ${String(expected)}, got ${String(actual)}`,
    );
  }
}

function assertRejects(fn: () => unknown, messageIncludes: string): void {
  try {
    fn();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    assert(
      message.includes(messageIncludes),
      `Expected rejection containing ${messageIncludes}, got ${message}`,
    );
    return;
  }
  throw new Error(`Expected rejection containing ${messageIncludes}`);
}

async function assertRejectsAsync(
  fn: () => Promise<unknown>,
  messageIncludes: string,
): Promise<void> {
  try {
    await fn();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    assert(
      message.includes(messageIncludes),
      `Expected rejection containing ${messageIncludes}, got ${message}`,
    );
    return;
  }
  throw new Error(`Expected rejection containing ${messageIncludes}`);
}

function textEvent(
  overrides: Partial<DrsLineMessageEvent> = {},
): DrsLineMessageEvent {
  return {
    type: "message",
    mode: "active",
    timestamp: Date.parse("2026-08-20T10:00:00.000Z"),
    webhookEventId: "webhook-event-1",
    deliveryContext: { isRedelivery: false },
    source: {
      type: "group",
      groupId: "CownerPrivateGroup",
      userId: "Uowner",
    },
    message: {
      id: "line-message-1",
      type: "text",
      text: "請協助整理這份追加需求。",
    },
    ...overrides,
  };
}

async function signedBody(
  channelSecret: string,
  destination: string,
  events: readonly unknown[],
): Promise<{ rawBody: string; signature: string }> {
  const rawBody = JSON.stringify({ destination, events });
  return {
    rawBody,
    signature: await signLineBody(channelSecret, rawBody),
  };
}

function createSequentialUuidFactory(): () =>
  `${string}-${string}-${string}-${string}-${string}` {
  let next = 1;
  return () => {
    const suffix = String(next++).padStart(12, "0");
    return `00000000-0000-4000-8000-${suffix}`;
  };
}

function assertUuid(value: string, label: string): void {
  assert(
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu
      .test(value),
    `${label} must be UUID, got ${value}`,
  );
}

async function snapshotFor(finalText: string): Promise<string> {
  return await computeFinalSnapshotSha256({
    finalText: createPublicSafeText(finalText),
    attachments: [],
  });
}

async function sha256Text(value: string): Promise<string> {
  const hash = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value),
  );
  return Array.from(new Uint8Array(hash))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function sqlFunctionSlice(
  sql: string,
  functionName: string,
  nextFunctionName?: string,
): string {
  const start = sql.indexOf(`create or replace function ${functionName}`);
  assert(start >= 0, `SQL function not found: ${functionName}`);
  const end = nextFunctionName
    ? sql.indexOf(`create or replace function ${nextFunctionName}`, start + 1)
    : sql.length;
  assert(end > start, `SQL function end not found after: ${functionName}`);
  return sql.slice(start, end);
}

function attachmentTransportMessages(
  attachments: readonly FinalAttachmentRef[],
): readonly FinalDeliverableMessage[] {
  return attachments.map((attachment) => {
    if (attachment.mimeType === "application/pdf") {
      const accessUrl =
        `https://drs.local.invalid/access/${attachment.attachmentId}`;
      return {
        type: "text",
        purpose: "attachment_payload",
        text: createPublicSafeText(
          `PDF 附件安全連結：${accessUrl}`,
        ),
        accessUrl,
        accessUrlKind: "drs_opaque_attachment_access",
        attachmentRef: { ...attachment },
      };
    }
    return {
      type: "image",
      purpose: "attachment_payload",
      originalContentUrl:
        `https://drs.local.invalid/images/${attachment.attachmentId}/original`,
      previewImageUrl:
        `https://drs.local.invalid/images/${attachment.attachmentId}/preview`,
      attachmentRef: { ...attachment },
    };
  }) as readonly FinalDeliverableMessage[];
}

const attachmentTransportResolver = {
  resolve(input: {
    attachments: readonly {
      attachmentId: string;
      sha256: string;
      mimeType: string;
      byteSize: number;
      storageRef: string;
    }[];
  }) {
    return attachmentTransportMessages(input.attachments);
  },
};

async function persistedDrsReview(
  store: ReturnType<typeof createMemoryDrsLineStore>,
  input: {
    caseId: string;
    linkedGroupId: string;
    text: string;
    mode?: "no_flag" | "attention" | "unavailable";
    now?: string;
  },
): Promise<AiReviewRecord> {
  const review = await reviewDrsOutboundContent({
    actorType: "DRS",
    text: input.text,
    advisoryPort: createDeterministicAdvisoryPort({
      mode: input.mode ?? "no_flag",
    }),
    now: input.now ?? "2026-08-20T10:00:00.000Z",
    store,
    caseId: input.caseId,
    linkedGroupId: input.linkedGroupId,
    submittedSnapshotSha256: await snapshotFor(input.text),
  });
  assert(review.required === true, "DRS review should be required");
  return review;
}

Deno.test("advisory failure becomes unavailable review and clears exact submitted body without raw error leakage", async () => {
  const store = createMemoryDrsLineStore({
    uuidFactory: createSequentialUuidFactory(),
  });
  const request = await startDrsOutboundReview({
    store,
    caseId: "case-ai-error-privacy",
    linkedGroupId: "linked-ai-error-privacy",
    submittedText:
      "這是需要審查的完整訊息，內含不應落庫的 secret=raw-openai-error。",
    now: "2026-08-20T10:00:00.000Z",
  });

  const review = await completeDrsOutboundReview({
    store,
    reviewRequestId: request.reviewRequestId,
    advisoryPort: {
      review() {
        throw new Error("raw provider timeout secret=live-openai-key");
      },
    },
    now: "2026-08-20T10:01:00.000Z",
  });

  assertEquals(review.status, "REVIEW_SERVICE_UNAVAILABLE");
  assertEquals(review.serviceErrorCode, "ADVISORY_PORT_UNAVAILABLE");
  assertEquals(store.aiReviewRequests[0].submittedBody, null);
  assertEquals(
    store.aiReviewRequests[0].submittedBodyClearedAt,
    "2026-08-20T10:01:00.000Z",
  );
  assert(
    !JSON.stringify(store).includes("secret=raw-openai-error") &&
      !JSON.stringify(store).includes("live-openai-key") &&
      !JSON.stringify(store).includes("raw provider timeout"),
    "raw submitted body and raw advisory error text must not be persisted",
  );
});

Deno.test("advisory unavailable return is normalized without retaining provider echoed private body", async () => {
  const store = createMemoryDrsLineStore({
    uuidFactory: createSequentialUuidFactory(),
  });
  const marker = "PRIVATE-SUBMITTED-BODY-DO-NOT-PERSIST";
  const request = await startDrsOutboundReview({
    store,
    caseId: "case-ai-unavailable-privacy",
    linkedGroupId: "linked-ai-unavailable-privacy",
    submittedText: `這是送給審查服務的私密送審原文 ${marker}`,
    now: "2026-08-20T10:00:00.000Z",
  });

  const review = await completeDrsOutboundReview({
    store,
    reviewRequestId: request.reviewRequestId,
    advisoryPort: {
      review(call) {
        return Promise.resolve({
          status: "REVIEW_SERVICE_UNAVAILABLE",
          findings: [`finding echoes ${marker}`, call.text],
          evidenceRefs: [`evidence ${marker}`],
          recommendations: [`recommendation ${marker}`],
          proposedText: call.text,
          model: `model-${marker}`,
          modelVersion: `version-${marker}`,
          ragVersion: `rag-${marker}`,
          skillVersion: `skill-${marker}`,
          serviceErrorCode: `provider-error-${marker}`,
        });
      },
    },
    now: "2026-08-20T10:01:00.000Z",
  });

  assertEquals(review.status, "REVIEW_SERVICE_UNAVAILABLE");
  assertEquals(store.aiReviewRequests[0].submittedBody, null);
  assertEquals(
    store.aiReviewRequests[0].submittedBodyClearedAt,
    "2026-08-20T10:01:00.000Z",
  );
  assert(
    !JSON.stringify(store).includes(marker),
    "unavailable review result must not persist submitted private body or echoed provider metadata",
  );
});

Deno.test("direct DRS review without store normalizes unavailable returns and thrown errors without leaking provider fields", async () => {
  const marker = "DIRECT-REVIEW-SECRET-MUST-NOT-PERSIST";
  const unavailable = await reviewDrsOutboundContent({
    actorType: "DRS",
    text: `送審原文 ${marker}`,
    advisoryPort: {
      review(call) {
        return Promise.resolve({
          status: "REVIEW_SERVICE_UNAVAILABLE",
          findings: [`finding ${marker}`, call.text],
          evidenceRefs: [`evidence ${marker}`],
          recommendations: [`recommendation ${marker}`],
          proposedText: `provider proposed ${marker}`,
          model: `model-${marker}`,
          modelVersion: `version-${marker}`,
          ragVersion: `rag-${marker}`,
          skillVersion: `skill-${marker}`,
          serviceErrorCode: `provider-error-${marker}`,
        });
      },
    },
    now: "2026-08-20T10:01:00.000Z",
    uuidFactory: createSequentialUuidFactory(),
  });
  assertEquals(unavailable.status, "REVIEW_SERVICE_UNAVAILABLE");
  assertEquals(unavailable.serviceErrorCode, "ADVISORY_PORT_UNAVAILABLE");
  assert(
    !JSON.stringify(unavailable).includes(marker),
    "direct unavailable review must not echo submitted body or provider metadata",
  );

  const thrown = await reviewDrsOutboundContent({
    actorType: "DRS",
    text: `送審原文 ${marker}`,
    advisoryPort: {
      review() {
        throw new Error(`provider exception ${marker}`);
      },
    },
    now: "2026-08-20T10:02:00.000Z",
    uuidFactory: createSequentialUuidFactory(),
  });
  assertEquals(thrown.status, "REVIEW_SERVICE_UNAVAILABLE");
  assertEquals(thrown.serviceErrorCode, "ADVISORY_PORT_UNAVAILABLE");
  assert(
    !JSON.stringify(thrown).includes(marker),
    "direct thrown advisory path must serialize only safe unavailable metadata",
  );
});

Deno.test("linked group authorization uses verified provider sent_at instead of delayed webhook arrival", async () => {
  const store = createMemoryDrsLineStore();
  store.linkGroup({
    formalLinkId: "formal-delayed-message",
    caseId: "case-delayed-message",
    linkedGroupId: "linked-delayed-message",
    lineGroupId: "CdelayedMessage",
    groupType: "OWNER_DRS_PRIVATE",
    status: "active",
    validFrom: "2026-08-20T10:00:00.000Z",
    validTo: "2026-08-20T10:05:00.000Z",
    drsMember: true,
    ownerLineUserIds: ["Uowner"],
    vendorLineUserIds: [],
  });
  const { rawBody, signature } = await signedBody("secret", "channel-drs", [
    textEvent({
      webhookEventId: "webhook-delayed-but-valid",
      timestamp: Date.parse("2026-08-20T10:03:00.000Z"),
      source: {
        type: "group",
        groupId: "CdelayedMessage",
        userId: "Uowner",
      },
      message: {
        id: "line-message-delayed-but-valid",
        type: "text",
        text: "這則訊息在正式連結有效期間內送出。",
      },
    }),
  ]);

  const result = await processLineWebhook({
    rawBody,
    signature,
    channelSecret: "secret",
    expectedDestination: "channel-drs",
    store,
    now: "2026-08-20T10:10:00.000Z",
  });

  assertEquals(result.acceptedCount, 1);
  assertEquals(result.deniedCount, 0);
  assertEquals(store.receipts[0].occurredAt, "2026-08-20T10:03:00.000Z");
  assertEquals(store.receipts[0].receivedAt, "2026-08-20T10:10:00.000Z");
});

Deno.test("provider sent_at outside formal link interval is denied even when webhook arrives during the interval", async () => {
  const store = createMemoryDrsLineStore();
  store.linkGroup({
    formalLinkId: "formal-sent-at-window",
    caseId: "case-sent-at-window",
    linkedGroupId: "linked-sent-at-window",
    lineGroupId: "CsentAtWindow",
    groupType: "OWNER_DRS_PRIVATE",
    status: "active",
    validFrom: "2026-08-20T10:00:00.000Z",
    validTo: "2026-08-20T10:05:00.000Z",
    drsMember: true,
    ownerLineUserIds: ["Uowner"],
    vendorLineUserIds: [],
  });
  const { rawBody, signature } = await signedBody("secret", "channel-drs", [
    textEvent({
      webhookEventId: "webhook-before-valid-from",
      timestamp: Date.parse("2026-08-20T09:59:59.000Z"),
      source: {
        type: "group",
        groupId: "CsentAtWindow",
        userId: "Uowner",
      },
      message: {
        id: "line-message-before-valid-from",
        type: "text",
        text: "這則訊息送出時尚未建立正式連結。",
      },
    }),
    textEvent({
      webhookEventId: "webhook-after-valid-to",
      timestamp: Date.parse("2026-08-20T10:05:00.000Z"),
      source: {
        type: "group",
        groupId: "CsentAtWindow",
        userId: "Uowner",
      },
      message: {
        id: "line-message-after-valid-to",
        type: "text",
        text: "這則訊息送出時連結已失效。",
      },
    }),
  ]);

  const result = await processLineWebhook({
    rawBody,
    signature,
    channelSecret: "secret",
    expectedDestination: "channel-drs",
    store,
    now: "2026-08-20T10:03:00.000Z",
  });

  assertEquals(result.acceptedCount, 0);
  assertEquals(result.deniedCount, 2);
  assertEquals(store.receipts.length, 0);
});

Deno.test("group lifecycle events are deduped and ordered without reactivating revoked links", async () => {
  const store = createMemoryDrsLineStore();
  store.linkGroup({
    formalLinkId: "formal-lifecycle",
    caseId: "case-lifecycle",
    linkedGroupId: "linked-lifecycle",
    lineGroupId: "Clifecycle",
    groupType: "OWNER_DRS_PRIVATE",
    status: "active",
    validFrom: "2026-08-20T00:00:00.000Z",
    validTo: "2026-09-20T00:00:00.000Z",
    drsMember: true,
    ownerLineUserIds: ["Uowner"],
    vendorLineUserIds: [],
  });
  const group = store.findLinkedGroupByLineGroupId("Clifecycle");
  assert(group !== undefined, "group fixture missing");
  const leave = {
    type: "leave",
    mode: "active",
    timestamp: Date.parse("2026-08-20T10:00:00.000Z"),
    webhookEventId: "lifecycle-equal-time-leave",
    deliveryContext: { isRedelivery: false },
    source: { type: "group", groupId: "Clifecycle" },
  };
  const join = {
    type: "join",
    mode: "active",
    timestamp: Date.parse("2026-08-20T10:00:00.000Z"),
    webhookEventId: "lifecycle-equal-time-join",
    deliveryContext: { isRedelivery: false },
    source: { type: "group", groupId: "Clifecycle" },
    replyToken: "reply-lifecycle",
  };
  const first = await signedBody("secret", "channel-drs", [leave, join]);
  await processLineWebhook({
    rawBody: first.rawBody,
    signature: first.signature,
    channelSecret: "secret",
    expectedDestination: "channel-drs",
    store,
    now: "2026-08-20T10:01:00.000Z",
  });
  assertEquals(group.drsMember, false);
  assertEquals(group.botPresenceEventType, "leave");

  group.status = "revoked";
  const revokedJoin = await signedBody("secret", "channel-drs", [{
    ...join,
    timestamp: Date.parse("2026-08-20T10:10:00.000Z"),
    webhookEventId: "lifecycle-revoked-join",
    replyToken: "reply-lifecycle-revoked",
  }]);
  await processLineWebhook({
    rawBody: revokedJoin.rawBody,
    signature: revokedJoin.signature,
    channelSecret: "secret",
    expectedDestination: "channel-drs",
    store,
    now: "2026-08-20T10:11:00.000Z",
  });
  assertEquals(group.status, "revoked");
  assertEquals(group.drsMember, false);
});

function seedSendableOwnerCase(
  store: ReturnType<typeof createMemoryDrsLineStore>,
  input: {
    caseId?: string;
    linkedGroupId?: string;
    lineGroupId?: string;
    assignmentId?: string;
    specialistId?: string;
    authSubject?: string;
    privateControlLineUserId?: string;
  } = {},
): {
  caseId: string;
  linkedGroupId: string;
  lineGroupId: string;
  assignmentId: string;
  specialistId: string;
  authSubject: string;
  privateControlLineUserId: string;
} {
  const values = {
    caseId: input.caseId ?? "case-fixture",
    linkedGroupId: input.linkedGroupId ?? "linked-fixture",
    lineGroupId: input.lineGroupId ?? "Cfixture",
    assignmentId: input.assignmentId ?? "assign-fixture",
    specialistId: input.specialistId ?? "spec-fixture",
    authSubject: input.authSubject ?? "auth-fixture",
    privateControlLineUserId: input.privateControlLineUserId ??
      "UspecialistFixture",
  };
  store.linkGroup({
    formalLinkId: `formal-${values.linkedGroupId}`,
    caseId: values.caseId,
    linkedGroupId: values.linkedGroupId,
    lineGroupId: values.lineGroupId,
    groupType: "OWNER_DRS_PRIVATE",
    status: "active",
    validFrom: "2026-08-20T00:00:00.000Z",
    validTo: "2026-09-20T00:00:00.000Z",
    drsMember: true,
    ownerLineUserIds: ["Uowner"],
    vendorLineUserIds: [],
  });
  store.assignSpecialist({
    assignmentId: values.assignmentId,
    caseId: values.caseId,
    specialistId: values.specialistId,
    verifiedAuthSubject: values.authSubject,
    specialistEmailSnapshot: `${values.specialistId}@example.test`,
    validFrom: "2026-08-20T00:00:00.000Z",
    validTo: "2026-09-20T00:00:00.000Z",
    assignedBy: "admin-1",
    status: "active",
    privateControlLineUserId: values.privateControlLineUserId,
  });
  return values;
}

async function stageFixtureAttachment(
  store: ReturnType<typeof createMemoryDrsLineStore>,
  input: {
    lineGroupId: string;
    lineMessageId: string;
    fileName?: string;
    bytes: Uint8Array;
    detectedMime: "application/pdf" | "image/jpeg" | "image/png";
  },
): Promise<FinalAttachmentRef> {
  const message = input.detectedMime === "application/pdf"
    ? {
      id: input.lineMessageId,
      type: "file" as const,
      fileName: input.fileName ?? "fixture.pdf",
      fileSize: input.bytes.byteLength,
      contentProvider: { type: "line" as const },
    }
    : {
      id: input.lineMessageId,
      type: "image" as const,
      contentProvider: { type: "line" as const },
    };
  const { rawBody, signature } = await signedBody("secret", "channel-drs", [
    textEvent({
      webhookEventId: `webhook-${input.lineMessageId}`,
      source: {
        type: "group",
        groupId: input.lineGroupId,
        userId: "Uowner",
      },
      message,
    }),
  ]);
  await processLineWebhook({
    rawBody,
    signature,
    channelSecret: "secret",
    expectedDestination: "channel-drs",
    store,
    now: "2026-08-20T10:00:00.000Z",
    contentProvider: {
      readMessageContent: () => input.bytes,
      detectMime: () => input.detectedMime,
    },
  });
  const staged = store.attachments.find((candidate) =>
    candidate.lineMessageId === input.lineMessageId
  );
  assert(staged !== undefined, "fixture attachment should be staged");
  return {
    attachmentId: staged.attachmentId,
    sha256: staged.sha256,
    mimeType: staged.mimeType,
    byteSize: staged.byteSize,
    storageRef: staged.storageRef,
  };
}

Deno.test("linked OWNER_DRS_PRIVATE inbound text/file/image is accepted as sent LINE receipts and audit evidence", async () => {
  const store = createMemoryDrsLineStore();
  store.linkGroup({
    formalLinkId: "formal-owner-private",
    caseId: "case-001",
    linkedGroupId: "linked-owner-private",
    lineGroupId: "CownerPrivateGroup",
    groupType: "OWNER_DRS_PRIVATE",
    status: "active",
    validFrom: "2026-08-20T00:00:00.000Z",
    validTo: "2026-09-20T00:00:00.000Z",
    drsMember: true,
    ownerLineUserIds: ["Uowner"],
    vendorLineUserIds: [],
  });

  const fileEvent = textEvent({
    webhookEventId: "webhook-event-file",
    message: {
      id: "line-message-file",
      type: "file",
      fileName: "contract.pdf",
      fileSize: 24,
      contentProvider: { type: "line" },
    },
  });
  const imageEvent = textEvent({
    webhookEventId: "webhook-event-image",
    message: {
      id: "line-message-image",
      type: "image",
      contentProvider: { type: "line" },
    },
  });

  const { rawBody, signature } = await signedBody("secret", "channel-drs", [
    textEvent(),
    fileEvent,
    imageEvent,
  ]);

  const result = await processLineWebhook({
    rawBody,
    signature,
    channelSecret: "secret",
    expectedDestination: "channel-drs",
    store,
    now: "2026-08-20T10:00:00.000Z",
    contentProvider: {
      readMessageContent(messageId) {
        if (messageId === "line-message-file") {
          return new TextEncoder().encode("%PDF-1.7 synthetic DRS");
        }
        return new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x01, 0x02]);
      },
      detectMime(messageId) {
        return messageId === "line-message-file"
          ? "application/pdf"
          : "image/jpeg";
      },
    },
  });

  assertEquals(result.acceptedCount, 3);
  assertEquals(store.receipts.length, 3);
  assertEquals(store.attachments.length, 2);
  assert(
    store.attachments.every((attachment) =>
      attachment.status === "private_staged"
    ),
  );
  assert(
    store.auditEvents.some((event) => event.eventType === "LINE_SENT_EVENT"),
  );
  assertEquals(
    store.canonicalCaseWrites.length,
    0,
    "A14 W1 must not directly write case truth",
  );
});

Deno.test("linked OWNER_VENDOR_DRS_SHARED inbound is accepted and routed through provider provenance only", async () => {
  const store = createMemoryDrsLineStore();
  store.linkGroup({
    formalLinkId: "formal-shared",
    caseId: "case-002",
    linkedGroupId: "linked-shared",
    lineGroupId: "CsharedGroup",
    groupType: "OWNER_VENDOR_DRS_SHARED",
    status: "active",
    validFrom: "2026-08-20T00:00:00.000Z",
    validTo: "2026-09-20T00:00:00.000Z",
    drsMember: true,
    ownerLineUserIds: ["Uowner"],
    vendorLineUserIds: ["Uvendor"],
  });
  const { rawBody, signature } = await signedBody("secret", "channel-drs", [
    textEvent({
      source: { type: "group", groupId: "CsharedGroup", userId: "Uvendor" },
      webhookEventId: "webhook-shared",
      message: {
        id: "line-message-shared",
        type: "text",
        text: "已傳現場尺寸。",
      },
    }),
  ]);
  const result = await processLineWebhook({
    rawBody,
    signature,
    channelSecret: "secret",
    expectedDestination: "channel-drs",
    store,
    now: "2026-08-20T10:00:00.000Z",
  });

  assertEquals(result.acceptedCount, 1);
  assertEquals(store.receipts[0].lineMessageId, "line-message-shared");
  assertEquals(store.receipts[0].logicalDocumentId, undefined);
});

Deno.test("non-linked group is acknowledged without fabricating a case record", async () => {
  const store = createMemoryDrsLineStore();
  const { rawBody, signature } = await signedBody("secret", "channel-drs", [
    textEvent({
      source: { type: "group", groupId: "Cunknown", userId: "Uowner" },
    }),
  ]);
  const result = await processLineWebhook({
    rawBody,
    signature,
    channelSecret: "secret",
    expectedDestination: "channel-drs",
    store,
    now: "2026-08-20T10:00:00.000Z",
  });
  assertEquals(result.acceptedCount, 0);
  assertEquals(result.deniedCount, 1);
  assertEquals(store.receipts.length, 0);
  assertEquals(store.auditEvents.length, 0);
});

Deno.test("wrong or expired group links deny ingestion", async () => {
  const store = createMemoryDrsLineStore();
  store.linkGroup({
    formalLinkId: "formal-expired",
    caseId: "case-003",
    linkedGroupId: "linked-expired",
    lineGroupId: "Cexpired",
    groupType: "OWNER_DRS_PRIVATE",
    status: "active",
    validFrom: "2026-07-01T00:00:00.000Z",
    validTo: "2026-08-01T00:00:00.000Z",
    drsMember: true,
    ownerLineUserIds: ["Uowner"],
    vendorLineUserIds: [],
  });
  const { rawBody, signature } = await signedBody("secret", "channel-drs", [
    textEvent({
      source: { type: "group", groupId: "Cexpired", userId: "Uowner" },
    }),
  ]);
  const result = await processLineWebhook({
    rawBody,
    signature,
    channelSecret: "secret",
    expectedDestination: "channel-drs",
    store,
    now: "2026-08-20T10:00:00.000Z",
  });
  assertEquals(result.deniedCount, 1);
  assertEquals(store.receipts.length, 0);
});

Deno.test("attachment failure is atomic: no receipt, audit or staging survives failed retrieval or validation", async () => {
  const cases = [
    {
      name: "missing_provider",
      contentProvider: undefined,
    },
    {
      name: "invalid_mime",
      contentProvider: {
        readMessageContent: () => new TextEncoder().encode("not supported"),
        detectMime: () => "text/plain",
      },
    },
    {
      name: "oversize",
      contentProvider: {
        readMessageContent: () => new Uint8Array(10 * 1024 * 1024 + 1),
        detectMime: () => "application/pdf",
      },
    },
    {
      name: "retrieval_failure",
      contentProvider: {
        readMessageContent: () => {
          throw new Error("download failed");
        },
        detectMime: () => "application/pdf",
      },
    },
  ];
  for (const item of cases) {
    const store = createMemoryDrsLineStore();
    store.linkGroup({
      formalLinkId: `formal-${item.name}`,
      caseId: `case-${item.name}`,
      linkedGroupId: `linked-${item.name}`,
      lineGroupId: `C${item.name}`,
      groupType: "OWNER_DRS_PRIVATE",
      status: "active",
      validFrom: "2026-08-20T00:00:00.000Z",
      validTo: "2026-09-20T00:00:00.000Z",
      drsMember: true,
      ownerLineUserIds: ["Uowner"],
      vendorLineUserIds: [],
    });
    const { rawBody, signature } = await signedBody("secret", "channel-drs", [
      textEvent({
        webhookEventId: `webhook-${item.name}`,
        source: { type: "group", groupId: `C${item.name}`, userId: "Uowner" },
        message: {
          id: `line-message-${item.name}`,
          type: "file",
          fileName: "candidate.pdf",
          fileSize: 1,
          contentProvider: { type: "line" },
        },
      }),
    ]);
    const result = await processLineWebhook({
      rawBody,
      signature,
      channelSecret: "secret",
      expectedDestination: "channel-drs",
      store,
      now: "2026-08-20T10:00:00.000Z",
      contentProvider: item.contentProvider,
    });
    assertEquals(result.acceptedCount, 0, item.name);
    assertEquals(result.deniedCount, 1, item.name);
    assertEquals(store.receipts.length, 0, item.name);
    assertEquals(store.attachments.length, 0, item.name);
    assertEquals(store.auditEvents.length, 0, item.name);
    assertEquals(store.finalMessages.length, 0, item.name);
  }
});

Deno.test("final attachments resolve only same-case staged immutable refs before finalization", async () => {
  const store = createMemoryDrsLineStore({
    uuidFactory: createSequentialUuidFactory(),
  });
  const fixture = seedSendableOwnerCase(store, {
    caseId: "case-final-attachment",
    linkedGroupId: "linked-final-attachment",
    lineGroupId: "CfinalAttachment",
    assignmentId: "assign-final-attachment",
  });
  const { rawBody, signature } = await signedBody("secret", "channel-drs", [
    textEvent({
      webhookEventId: "webhook-final-attachment",
      source: {
        type: "group",
        groupId: fixture.lineGroupId,
        userId: "Uowner",
      },
      message: {
        id: "line-message-final-attachment",
        type: "file",
        fileName: "review.pdf",
        fileSize: 19,
        contentProvider: { type: "line" },
      },
    }),
  ]);
  await processLineWebhook({
    rawBody,
    signature,
    channelSecret: "secret",
    expectedDestination: "channel-drs",
    store,
    now: "2026-08-20T10:00:00.000Z",
    contentProvider: {
      readMessageContent: () => new TextEncoder().encode("%PDF-1.7 staged"),
      detectMime: () => "application/pdf",
    },
  });
  const staged = store.attachments[0];
  assert(staged !== undefined, "attachment should be staged");
  const authorizedRef = {
    attachmentId: staged.attachmentId,
    sha256: staged.sha256,
    mimeType: staged.mimeType,
    byteSize: staged.byteSize,
    storageRef: staged.storageRef,
  };
  const finalText = "已收到附件，DRS 人員會整理後再通知。";
  const deliverableMessages = [
    {
      type: "text" as const,
      purpose: "final_text" as const,
      text: createPublicSafeText(finalText),
    },
    ...attachmentTransportMessages([authorizedRef]),
  ];
  const finalSnapshotSha256 = await computeFinalSnapshotSha256({
    finalText: createPublicSafeText(finalText),
    attachments: [authorizedRef],
    deliverableMessages,
  });
  const advisory = await persistedDrsReview(store, {
    caseId: fixture.caseId,
    linkedGroupId: fixture.linkedGroupId,
    text: "已收到附件，DRS 人員會整理後再通知。",
  });
  await finalizeDrsGroupSend({
    store,
    caseId: fixture.caseId,
    linkedGroupId: fixture.linkedGroupId,
    lineGroupId: fixture.lineGroupId,
    assignmentId: fixture.assignmentId,
    specialistAuthSubject: fixture.authSubject,
    decision: {
      type: "EDIT_AND_SEND",
      finalText,
      reason: "整理附件",
      finalSnapshotSha256,
    },
    aiReview: advisory,
    finalizationKey: "human-action-final-attachment",
    expectedFinalSnapshotHash: finalSnapshotSha256,
    finalAttachments: [authorizedRef],
    attachmentTransportResolver,
    now: "2026-08-20T10:01:00.000Z",
  });
  assertEquals(store.finalMessages[0].attachments.length, 1);

  const otherStore = createMemoryDrsLineStore();
  const otherFixture = seedSendableOwnerCase(otherStore, {
    caseId: "case-other-attachment",
    linkedGroupId: "linked-other-attachment",
    lineGroupId: "CotherAttachment",
    assignmentId: "assign-other-attachment",
  });
  const otherReview = await persistedDrsReview(otherStore, {
    caseId: otherFixture.caseId,
    linkedGroupId: otherFixture.linkedGroupId,
    text: "不得引用其他案件附件。",
  });
  const otherText = "不得引用其他案件附件。";
  const otherHash = await computeFinalSnapshotSha256({
    finalText: createPublicSafeText(otherText),
    attachments: [authorizedRef],
  });
  await assertRejectsAsync(
    () =>
      finalizeDrsGroupSend({
        store: otherStore,
        caseId: otherFixture.caseId,
        linkedGroupId: otherFixture.linkedGroupId,
        lineGroupId: otherFixture.lineGroupId,
        assignmentId: otherFixture.assignmentId,
        specialistAuthSubject: otherFixture.authSubject,
        decision: {
          type: "EDIT_AND_SEND",
          finalText: otherText,
          reason: "引用附件",
          finalSnapshotSha256: otherHash,
        },
        aiReview: otherReview,
        finalizationKey: "human-action-cross-attachment",
        expectedFinalSnapshotHash: otherHash,
        finalAttachments: [authorizedRef],
        now: "2026-08-20T10:02:00.000Z",
      }),
    "final_attachment_not_authorized",
  );
});

Deno.test("Owner and Vendor sent messages are not blocked or rewritten by DRS outbound pre-send AI policy", async () => {
  const port = createDeterministicAdvisoryPort({ mode: "attention" });
  const ownerResult = await reviewDrsOutboundContent({
    actorType: "OWNER",
    text: "我要先跟家人確認。",
    advisoryPort: port,
    now: "2026-08-20T10:00:00.000Z",
  });
  const vendorResult = await reviewDrsOutboundContent({
    actorType: "VENDOR",
    text: "明天補施工照片。",
    advisoryPort: port,
    now: "2026-08-20T10:00:00.000Z",
  });
  assertEquals(ownerResult.required, false);
  assertEquals(vendorResult.required, false);
  assertEquals(port.calls.length, 0);
});

Deno.test("normal DRS no-flag advisory review plus assigned specialist final send", async () => {
  const store = createMemoryDrsLineStore();
  store.linkGroup({
    formalLinkId: "formal-send",
    caseId: "case-send",
    linkedGroupId: "linked-send",
    lineGroupId: "Csend",
    groupType: "OWNER_DRS_PRIVATE",
    status: "active",
    validFrom: "2026-08-20T00:00:00.000Z",
    validTo: "2026-09-20T00:00:00.000Z",
    drsMember: true,
    ownerLineUserIds: ["Uowner"],
    vendorLineUserIds: [],
  });
  store.assignSpecialist({
    assignmentId: "assign-1",
    caseId: "case-send",
    specialistId: "spec-1",
    verifiedAuthSubject: "auth-subject-1",
    specialistEmailSnapshot: "drs@example.test",
    validFrom: "2026-08-20T00:00:00.000Z",
    validTo: "2026-09-20T00:00:00.000Z",
    assignedBy: "admin-1",
    status: "active",
    privateControlLineUserId: "UspecialistPrivate",
  });
  const advisory = await persistedDrsReview(store, {
    caseId: "case-send",
    linkedGroupId: "linked-send",
    text: "已收到，目前會先整理重點，後續需要確認的項目會再通知。",
  });
  assertEquals(
    advisory.status,
    "REVIEW_COMPLETED_NO_FLAG" satisfies AiReviewStatus,
  );
  const finalText = "已收到，目前先整理重點。";
  const finalSnapshotSha256 = await snapshotFor(finalText);
  const send = await finalizeDrsGroupSend({
    store,
    caseId: "case-send",
    linkedGroupId: "linked-send",
    lineGroupId: "Csend",
    assignmentId: "assign-1",
    specialistAuthSubject: "auth-subject-1",
    decision: {
      type: "EDIT_AND_SEND",
      finalText,
      reason: "整理後回覆",
      finalSnapshotSha256,
    },
    aiReview: advisory,
    finalizationKey: "human-action-send-1",
    expectedFinalSnapshotHash: finalSnapshotSha256,
    now: "2026-08-20T10:01:00.000Z",
  });
  assertEquals(send.status, "queued");
  assertEquals(store.aiReviews.length, 1);
  assertEquals(store.aiReviews[0].hiddenChainOfThoughtStored, false);
  assert(store.auditEvents.some((event) => event.eventType === "AI_REVIEW"));
  assertEquals(store.finalMessages.length, 1);
  assertEquals(
    store.humanDecisions[0].finalSnapshotSha256,
    finalSnapshotSha256,
  );
  assertEquals(store.outbox[0].target.type, "group");
  assertEquals(store.outbox[0].target.groupId, "Csend");
});

Deno.test("attention advisory requires specialist EDIT_AND_SEND or OVERRIDE_AND_SEND with reason", async () => {
  const store = createMemoryDrsLineStore();
  store.linkGroup({
    formalLinkId: "formal-attention",
    caseId: "case-attention",
    linkedGroupId: "linked-attention",
    lineGroupId: "Cattention",
    groupType: "OWNER_VENDOR_DRS_SHARED",
    status: "active",
    validFrom: "2026-08-20T00:00:00.000Z",
    validTo: "2026-09-20T00:00:00.000Z",
    drsMember: true,
    ownerLineUserIds: ["Uowner"],
    vendorLineUserIds: ["Uvendor"],
  });
  store.assignSpecialist({
    assignmentId: "assign-attention",
    caseId: "case-attention",
    specialistId: "spec-2",
    verifiedAuthSubject: "auth-subject-2",
    specialistEmailSnapshot: "spec2@example.test",
    validFrom: "2026-08-20T00:00:00.000Z",
    validTo: "2026-09-20T00:00:00.000Z",
    assignedBy: "admin-1",
    status: "active",
    privateControlLineUserId: "UspecialistPrivate2",
  });
  const advisory = await persistedDrsReview(store, {
    caseId: "case-attention",
    linkedGroupId: "linked-attention",
    text: "這段說法需要人工確認。",
    mode: "attention",
  });
  assertEquals(advisory.status, "REVIEW_COMPLETED_ATTENTION");
  const overrideWithoutReasonText = "人工覆核後送出。";
  const overrideWithoutReasonHash = await snapshotFor(
    overrideWithoutReasonText,
  );
  await assertRejectsAsync(
    () =>
      finalizeDrsGroupSend({
        store,
        caseId: "case-attention",
        linkedGroupId: "linked-attention",
        lineGroupId: "Cattention",
        assignmentId: "assign-attention",
        specialistAuthSubject: "auth-subject-2",
        decision: {
          type: "OVERRIDE_AND_SEND",
          finalText: overrideWithoutReasonText,
          reason: "",
          finalSnapshotSha256: overrideWithoutReasonHash,
        },
        aiReview: advisory,
        finalizationKey: "human-action-attention-reject",
        expectedFinalSnapshotHash: overrideWithoutReasonHash,
        now: "2026-08-20T10:01:00.000Z",
      }),
    "reason_required",
  );
  const editedText = "人工整理後：請先補上缺漏文件。";
  const editedHash = await snapshotFor(editedText);
  const edited = await finalizeDrsGroupSend({
    store,
    caseId: "case-attention",
    linkedGroupId: "linked-attention",
    lineGroupId: "Cattention",
    assignmentId: "assign-attention",
    specialistAuthSubject: "auth-subject-2",
    decision: {
      type: "EDIT_AND_SEND",
      finalText: editedText,
      reason: "修正用語",
      finalSnapshotSha256: editedHash,
    },
    aiReview: advisory,
    finalizationKey: "human-action-attention-edit",
    expectedFinalSnapshotHash: editedHash,
    now: "2026-08-20T10:02:00.000Z",
  });
  assertEquals(edited.status, "queued");
  const overrideText = "已由 DRS 人員覆核後送出。";
  const overrideHash = await snapshotFor(overrideText);
  const overrideReview = await persistedDrsReview(store, {
    caseId: "case-attention",
    linkedGroupId: "linked-attention",
    text: "這段說法需要第二次人工確認。",
    mode: "attention",
    now: "2026-08-20T10:02:30.000Z",
  });
  const overridden = await finalizeDrsGroupSend({
    store,
    caseId: "case-attention",
    linkedGroupId: "linked-attention",
    lineGroupId: "Cattention",
    assignmentId: "assign-attention",
    specialistAuthSubject: "auth-subject-2",
    decision: {
      type: "OVERRIDE_AND_SEND",
      finalText: overrideText,
      reason: "已比對原始需求",
      finalSnapshotSha256: overrideHash,
    },
    aiReview: overrideReview,
    finalizationKey: "human-action-attention-override",
    expectedFinalSnapshotHash: overrideHash,
    now: "2026-08-20T10:03:00.000Z",
  });
  assertEquals(overridden.status, "queued");
});

Deno.test("review unavailable requires MANUAL_EXCEPTION_SEND with reason, urgency and incident id", async () => {
  const store = createMemoryDrsLineStore();
  store.linkGroup({
    formalLinkId: "formal-unavailable",
    caseId: "case-unavailable",
    linkedGroupId: "linked-unavailable",
    lineGroupId: "Cunavailable",
    groupType: "OWNER_DRS_PRIVATE",
    status: "active",
    validFrom: "2026-08-20T00:00:00.000Z",
    validTo: "2026-09-20T00:00:00.000Z",
    drsMember: true,
    ownerLineUserIds: ["Uowner"],
    vendorLineUserIds: [],
  });
  store.assignSpecialist({
    assignmentId: "assign-unavailable",
    caseId: "case-unavailable",
    specialistId: "spec-3",
    verifiedAuthSubject: "auth-subject-3",
    specialistEmailSnapshot: "spec3@example.test",
    validFrom: "2026-08-20T00:00:00.000Z",
    validTo: "2026-09-20T00:00:00.000Z",
    assignedBy: "admin-1",
    status: "active",
    privateControlLineUserId: "UspecialistPrivate3",
  });
  const advisory = await persistedDrsReview(store, {
    caseId: "case-unavailable",
    linkedGroupId: "linked-unavailable",
    text: "服務暫時無法檢查，但案件需立即通知。",
    mode: "unavailable",
  });
  assertEquals(advisory.status, "REVIEW_SERVICE_UNAVAILABLE");
  const unavailableEditText = "請先暫停施工。";
  const unavailableEditHash = await snapshotFor(unavailableEditText);
  await assertRejectsAsync(
    () =>
      finalizeDrsGroupSend({
        store,
        caseId: "case-unavailable",
        linkedGroupId: "linked-unavailable",
        lineGroupId: "Cunavailable",
        assignmentId: "assign-unavailable",
        specialistAuthSubject: "auth-subject-3",
        decision: {
          type: "EDIT_AND_SEND",
          finalText: unavailableEditText,
          reason: "緊急通知",
          finalSnapshotSha256: unavailableEditHash,
        },
        aiReview: advisory,
        finalizationKey: "human-action-unavailable-reject",
        expectedFinalSnapshotHash: unavailableEditHash,
        now: "2026-08-20T10:01:00.000Z",
      }),
    "manual_exception_required",
  );
  const manualText = "請先暫停施工，待 DRS 人員完成文件整理後再確認。";
  const manualHash = await snapshotFor(manualText);
  const sent = await finalizeDrsGroupSend({
    store,
    caseId: "case-unavailable",
    linkedGroupId: "linked-unavailable",
    lineGroupId: "Cunavailable",
    assignmentId: "assign-unavailable",
    specialistAuthSubject: "auth-subject-3",
    decision: {
      type: "MANUAL_EXCEPTION_SEND",
      finalText: manualText,
      reason: "現場需即時停損提醒",
      urgency: "high",
      serviceIncidentId: "incident-001",
      finalSnapshotSha256: manualHash,
    },
    aiReview: advisory,
    finalizationKey: "human-action-unavailable-manual",
    expectedFinalSnapshotHash: manualHash,
    now: "2026-08-20T10:02:00.000Z",
  });
  assertEquals(sent.status, "queued");
  assertEquals(
    store.finalMessages[0].preSendReviewState,
    "REVIEW_SERVICE_UNAVAILABLE",
  );
});

Deno.test("emergency direct LINE send ingestion is break-glass with assignment, group and private binding revalidation", async () => {
  const store = createMemoryDrsLineStore();
  store.linkGroup({
    formalLinkId: "formal-emergency",
    caseId: "case-emergency",
    linkedGroupId: "linked-emergency",
    lineGroupId: "Cemergency",
    groupType: "OWNER_DRS_PRIVATE",
    status: "active",
    validFrom: "2026-08-20T00:00:00.000Z",
    validTo: "2026-09-20T00:00:00.000Z",
    drsMember: true,
    ownerLineUserIds: ["Uowner"],
    vendorLineUserIds: [],
  });
  store.assignSpecialist({
    assignmentId: "assign-emergency",
    caseId: "case-emergency",
    specialistId: "spec-emergency",
    verifiedAuthSubject: "auth-emergency",
    specialistEmailSnapshot: "emergency@example.test",
    validFrom: "2026-08-20T00:00:00.000Z",
    validTo: "2026-09-20T00:00:00.000Z",
    assignedBy: "admin-1",
    status: "active",
    privateControlLineUserId: "UspecialistEmergency",
  });
  linkLineAccount({
    store,
    subjectType: "SPECIALIST",
    subjectId: "spec-emergency",
    lineUserId: "UspecialistEmergency",
    linkedAt: "2026-08-20T10:00:00.000Z",
  });
  const emergency = await handleDirectEmergencyLineSend({
    store,
    assignmentId: "assign-emergency",
    specialistAuthSubject: "auth-emergency",
    privateControlLineUserId: "UspecialistEmergency",
    caseId: "case-emergency",
    linkedGroupId: "linked-emergency",
    lineGroupId: "Cemergency",
    lineMessageId: "line-direct-emergency",
    reason: "現場需要立即提醒",
    urgency: "high",
    serviceIncidentId: "incident-break-glass-1",
    finalText: "現場緊急提醒：請先暫停施工並等待 DRS 人員確認。",
    occurredAt: "2026-08-20T10:05:00.000Z",
  });
  const replay = await handleDirectEmergencyLineSend({
    store,
    assignmentId: "assign-emergency",
    specialistAuthSubject: "auth-emergency",
    privateControlLineUserId: "UspecialistEmergency",
    caseId: "case-emergency",
    linkedGroupId: "linked-emergency",
    lineGroupId: "Cemergency",
    lineMessageId: "line-direct-emergency",
    reason: "現場需要立即提醒",
    urgency: "high",
    serviceIncidentId: "incident-break-glass-1",
    finalText: "現場緊急提醒：請先暫停施工並等待 DRS 人員確認。",
    occurredAt: "2026-08-20T10:06:00.000Z",
  });
  assertEquals(replay.finalMessageId, emergency.finalMessageId);
  assertEquals(
    emergency.preSendReviewState,
    "PRE_SEND_REVIEW_NOT_PERFORMED_BREAK_GLASS",
  );
  assertEquals(emergency.aiReviewId, undefined);
  assertEquals(store.receipts.length, 1);
  assertEquals(store.receipts[0].lineMessageId, "line-direct-emergency");
  assertEquals(store.humanDecisions.length, 1);
  assertEquals(store.finalMessages.length, 1);
  assertEquals(
    store.auditEvents.filter((event) => event.eventType === "HUMAN_DECISION")
      .length,
    1,
  );
  assertEquals(
    store.auditEvents.filter((event) => event.eventType === "FINAL_MESSAGE")
      .length,
    1,
  );
  assertEquals(
    store.auditEvents.filter((event) => event.eventType === "LINE_SENT_EVENT")
      .length,
    1,
  );
});

Deno.test("AI advisory cannot send, approve, veto, or become final authority", async () => {
  const advisory = await reviewDrsOutboundContent({
    actorType: "DRS",
    text: "請補上合約附件。",
    advisoryPort: createDeterministicAdvisoryPort({ mode: "no_flag" }),
    now: "2026-08-20T10:00:00.000Z",
  });
  assertEquals(advisory.isApprover, false);
  assertEquals(advisory.canSendByItself, false);
  assertEquals(advisory.hiddenChainOfThoughtStored, false);
});

Deno.test("AI review persists a server-computed submitted snapshot request before advisory completion", async () => {
  const store = createMemoryDrsLineStore({
    uuidFactory: createSequentialUuidFactory(),
  });
  const fixture = seedSendableOwnerCase(store, {
    caseId: "case-review-provenance",
    linkedGroupId: "linked-review-provenance",
    lineGroupId: "CreviewProvenance",
    assignmentId: "assign-review-provenance",
  });
  const submittedText = "請 DRS 用這段實際送審內容建立審查。";
  const actualSubmittedSnapshot = await sha256Text(submittedText);
  const callerSuppliedWrongDigest = "f".repeat(64);
  const review = await reviewDrsOutboundContent({
    actorType: "DRS",
    text: submittedText,
    advisoryPort: createDeterministicAdvisoryPort({ mode: "attention" }),
    now: "2026-08-20T10:00:00.000Z",
    store,
    caseId: fixture.caseId,
    linkedGroupId: fixture.linkedGroupId,
    submittedSnapshotSha256: callerSuppliedWrongDigest,
  });
  assert(review.required === true, "DRS review should be required");
  assertEquals(
    review.submittedSnapshotSha256,
    actualSubmittedSnapshot,
    "caller-supplied digest must not become advisory authority",
  );
  const reviewRequests = (store as unknown as {
    aiReviewRequests?: readonly {
      reviewRequestId: string;
      caseId: string;
      linkedGroupId: string;
      submittedSnapshotSha256: string;
      status: string;
      completedReviewId?: string;
    }[];
  }).aiReviewRequests;
  assert(
    Array.isArray(reviewRequests),
    "missing durable review request ledger",
  );
  assertEquals(reviewRequests.length, 1);
  assertEquals(reviewRequests[0].caseId, fixture.caseId);
  assertEquals(reviewRequests[0].linkedGroupId, fixture.linkedGroupId);
  assertEquals(
    reviewRequests[0].submittedSnapshotSha256,
    actualSubmittedSnapshot,
  );
  assertEquals(reviewRequests[0].status, "completed");
  assertEquals(reviewRequests[0].completedReviewId, review.reviewId);
  assertEquals(
    (review as unknown as { reviewRequestId?: string }).reviewRequestId,
    reviewRequests[0].reviewRequestId,
  );
});

Deno.test("AI review hashes exact submitted body bytes and clears pending body after completion", async () => {
  const store = createMemoryDrsLineStore({
    uuidFactory: createSequentialUuidFactory(),
  });
  const fixture = seedSendableOwnerCase(store, {
    caseId: "case-exact-submitted-body",
    linkedGroupId: "linked-exact-submitted-body",
    lineGroupId: "CexactSubmittedBody",
    assignmentId: "assign-exact-submitted-body",
  });
  const submittedText = `${
    "請整理這段正式送審內容。".repeat(16)
  }DB debug mock-only 不可成為公開文案，但仍是送審 byte authority。`;
  const expectedExactHash = await sha256Text(submittedText);
  const advisoryCalls: string[] = [];
  const review = await reviewDrsOutboundContent({
    actorType: "DRS",
    text: submittedText,
    advisoryPort: {
      review: (call) => {
        advisoryCalls.push(call.text);
        return Promise.resolve({
          status: "REVIEW_COMPLETED_ATTENTION",
          findings: ["公共文案需改為產品語言"],
          evidenceRefs: ["fixture"],
          recommendations: ["移除工程語"],
          proposedText: "已收到，DRS 人員會整理後再通知。",
          model: "deterministic-local-fake",
          modelVersion: "w1",
          ragVersion: "none",
          skillVersion: "none",
        });
      },
    },
    now: "2026-08-20T10:00:00.000Z",
    store,
    caseId: fixture.caseId,
    linkedGroupId: fixture.linkedGroupId,
    submittedSnapshotSha256: "0".repeat(64),
  });

  assert(review.required === true, "DRS review should be required");
  assertEquals(advisoryCalls[0], submittedText);
  assertEquals(
    review.submittedSnapshotSha256,
    expectedExactHash,
    "review authority hash must cover the exact submitted body bytes",
  );
  const request = (store as unknown as {
    aiReviewRequests: {
      submittedBody?: string | null;
      submittedPreview?: string;
      submittedSnapshotSha256: string;
      submittedBodyClearedAt?: string;
      status: string;
      completedReviewId?: string;
    }[];
  }).aiReviewRequests[0];
  assertEquals(request.submittedSnapshotSha256, expectedExactHash);
  assertEquals(request.submittedBody, null);
  assert(
    typeof request.submittedPreview === "string" &&
      request.submittedPreview !== submittedText,
    "sanitized preview must be separate from cryptographic submitted bytes",
  );
  assertEquals(request.submittedBodyClearedAt, "2026-08-20T10:00:00.000Z");
  assertEquals(request.status, "completed");
  assertEquals(request.completedReviewId, review.reviewId);
});

Deno.test("AI submitted snapshot distinguishes long unsafe bodies that share the same sanitized preview", async () => {
  const store = createMemoryDrsLineStore({
    uuidFactory: createSequentialUuidFactory(),
  });
  const fixture = seedSendableOwnerCase(store, {
    caseId: "case-long-submitted-collision",
    linkedGroupId: "linked-long-submitted-collision",
    lineGroupId: "ClongSubmittedCollision",
    assignmentId: "assign-long-submitted-collision",
  });
  const sharedPrefix = `${"DB debug mock-only raw JSON ".repeat(14)}`;
  assert(sharedPrefix.length > 300, "probe must exceed 300 characters");
  const firstText = `${sharedPrefix}第一版正式送審尾端。`;
  const secondText = `${sharedPrefix}第二版正式送審尾端。`;
  const first = await persistedDrsReview(store, {
    caseId: fixture.caseId,
    linkedGroupId: fixture.linkedGroupId,
    text: firstText,
    now: "2026-08-20T10:00:00.000Z",
  });
  const second = await persistedDrsReview(store, {
    caseId: fixture.caseId,
    linkedGroupId: fixture.linkedGroupId,
    text: secondText,
    now: "2026-08-20T10:01:00.000Z",
  });

  assertEquals(first.submittedSnapshotSha256, await sha256Text(firstText));
  assertEquals(second.submittedSnapshotSha256, await sha256Text(secondText));
  assert(
    first.submittedSnapshotSha256 !== second.submittedSnapshotSha256,
    "exact submitted byte hashes must not collapse unsafe long text into the same sanitized-preview hash",
  );
});

Deno.test("final send rejects skipped or fabricated AI review and never records skipped as no-flag", async () => {
  const store = createMemoryDrsLineStore();
  const fixture = seedSendableOwnerCase(store, {
    caseId: "case-ai-required",
    linkedGroupId: "linked-ai-required",
    lineGroupId: "CaiRequired",
    assignmentId: "assign-ai-required",
  });
  const finalText = "已收到，DRS 人員會整理後再通知。";
  const finalSnapshotSha256 = await snapshotFor(finalText);
  const skipped = await reviewDrsOutboundContent({
    actorType: "OWNER",
    text: finalText,
    advisoryPort: createDeterministicAdvisoryPort({ mode: "no_flag" }),
    now: "2026-08-20T10:00:00.000Z",
  });
  await assertRejectsAsync(
    () =>
      finalizeDrsGroupSend({
        store,
        caseId: fixture.caseId,
        linkedGroupId: fixture.linkedGroupId,
        lineGroupId: fixture.lineGroupId,
        assignmentId: fixture.assignmentId,
        specialistAuthSubject: fixture.authSubject,
        decision: {
          type: "EDIT_AND_SEND",
          finalText,
          reason: "整理後通知",
          finalSnapshotSha256,
        },
        aiReview: skipped,
        finalizationKey: "human-action-skipped",
        expectedFinalSnapshotHash: finalSnapshotSha256,
        now: "2026-08-20T10:01:00.000Z",
      }),
    "ai_review_required",
  );
  assertEquals(store.aiReviews.length, 0);
  assertEquals(store.finalMessages.length, 0);

  const fabricated = {
    required: true as const,
    reviewId: "00000000-0000-4000-8000-999999999999",
    caseId: fixture.caseId,
    linkedGroupId: fixture.linkedGroupId,
    submittedSnapshotSha256: await snapshotFor(finalText),
    producedBy: "advisory_port" as const,
    status: "REVIEW_COMPLETED_NO_FLAG" as const,
    findings: [],
    evidenceRefs: [],
    recommendations: [],
    proposedText: finalText,
    proposedTextSha256: await snapshotFor(finalText),
    model: "local-fake",
    modelVersion: "w1",
    ragVersion: "none",
    skillVersion: "none",
    createdAt: "2026-08-20T10:00:00.000Z",
    completedAt: "2026-08-20T10:00:00.000Z",
    isApprover: false as const,
    canSendByItself: false as const,
    hiddenChainOfThoughtStored: false as const,
  };
  await assertRejectsAsync(
    () =>
      finalizeDrsGroupSend({
        store,
        caseId: fixture.caseId,
        linkedGroupId: fixture.linkedGroupId,
        lineGroupId: fixture.lineGroupId,
        assignmentId: fixture.assignmentId,
        specialistAuthSubject: fixture.authSubject,
        decision: {
          type: "EDIT_AND_SEND",
          finalText,
          reason: "整理後通知",
          finalSnapshotSha256,
        },
        aiReview: fabricated,
        finalizationKey: "human-action-fabricated",
        expectedFinalSnapshotHash: finalSnapshotSha256,
        now: "2026-08-20T10:02:00.000Z",
      }),
    "ai_review_not_persisted",
  );
});

Deno.test("final send rejects post-review or post-decision text drift from actual final bytes", async () => {
  const store = createMemoryDrsLineStore();
  const fixture = seedSendableOwnerCase(store, {
    caseId: "case-drift",
    linkedGroupId: "linked-drift",
    lineGroupId: "Cdrift",
    assignmentId: "assign-drift",
  });
  const advisory = await persistedDrsReview(store, {
    caseId: fixture.caseId,
    linkedGroupId: fixture.linkedGroupId,
    text: "原始建議文字。",
  });
  const staleHash = await snapshotFor("原始建議文字。");
  await assertRejectsAsync(
    () =>
      finalizeDrsGroupSend({
        store,
        caseId: fixture.caseId,
        linkedGroupId: fixture.linkedGroupId,
        lineGroupId: fixture.lineGroupId,
        assignmentId: fixture.assignmentId,
        specialistAuthSubject: fixture.authSubject,
        decision: {
          type: "EDIT_AND_SEND",
          finalText: "送出前被改過的文字。",
          reason: "人工修改",
          finalSnapshotSha256: staleHash,
        },
        aiReview: advisory,
        finalizationKey: "human-action-drift",
        expectedFinalSnapshotHash: staleHash,
        now: "2026-08-20T10:01:00.000Z",
      }),
    "final_snapshot_mismatch",
  );
  assertEquals(store.finalMessages.length, 0);
});

Deno.test("final send consumes only persisted advisory reviews once and is idempotent by Human action key", async () => {
  const store = createMemoryDrsLineStore({
    uuidFactory: createSequentialUuidFactory(),
  });
  const fixture = seedSendableOwnerCase(store, {
    caseId: "case-review-consume",
    linkedGroupId: "linked-review-consume",
    lineGroupId: "CreviewConsume",
    assignmentId: "assign-review-consume",
  });
  const fabricated = {
    required: true as const,
    reviewId: "00000000-0000-4000-8000-999999999999",
    caseId: fixture.caseId,
    linkedGroupId: fixture.linkedGroupId,
    submittedSnapshotSha256: await snapshotFor("看起來像真的審查。"),
    producedBy: "advisory_port" as const,
    status: "REVIEW_COMPLETED_NO_FLAG" as const,
    findings: [],
    evidenceRefs: [],
    recommendations: [],
    proposedText: "看起來像真的審查。",
    proposedTextSha256: await snapshotFor("看起來像真的審查。"),
    model: "local-fake",
    modelVersion: "w1",
    ragVersion: "none",
    skillVersion: "none",
    createdAt: "2026-08-20T10:00:00.000Z",
    completedAt: "2026-08-20T10:00:00.000Z",
    isApprover: false as const,
    canSendByItself: false as const,
    hiddenChainOfThoughtStored: false as const,
  };
  const finalText = "已收到，DRS 人員會整理後再通知。";
  const finalSnapshotSha256 = await snapshotFor(finalText);
  await assertRejectsAsync(
    () =>
      finalizeDrsGroupSend({
        store,
        caseId: fixture.caseId,
        linkedGroupId: fixture.linkedGroupId,
        lineGroupId: fixture.lineGroupId,
        assignmentId: fixture.assignmentId,
        specialistAuthSubject: fixture.authSubject,
        decision: {
          type: "EDIT_AND_SEND",
          finalText,
          reason: "整理後通知",
          finalSnapshotSha256,
        },
        aiReview: fabricated,
        finalizationKey: "human-action-fabricated-valid-looking",
        expectedFinalSnapshotHash: finalSnapshotSha256,
        now: "2026-08-20T10:01:00.000Z",
      }),
    "ai_review_not_persisted",
  );

  const persisted = await persistedDrsReview(store, {
    caseId: fixture.caseId,
    linkedGroupId: fixture.linkedGroupId,
    text: "已收到，DRS 人員會整理後再通知。",
  });
  const first = await finalizeDrsGroupSend({
    store,
    caseId: fixture.caseId,
    linkedGroupId: fixture.linkedGroupId,
    lineGroupId: fixture.lineGroupId,
    assignmentId: fixture.assignmentId,
    specialistAuthSubject: fixture.authSubject,
    decision: {
      type: "EDIT_AND_SEND",
      finalText,
      reason: "整理後通知",
      finalSnapshotSha256,
    },
    aiReview: { ...persisted, status: "REVIEW_SERVICE_UNAVAILABLE" },
    finalizationKey: "human-action-repeatable",
    expectedFinalSnapshotHash: finalSnapshotSha256,
    now: "2026-08-20T10:02:00.000Z",
  });
  const replay = await finalizeDrsGroupSend({
    store,
    caseId: fixture.caseId,
    linkedGroupId: fixture.linkedGroupId,
    lineGroupId: fixture.lineGroupId,
    assignmentId: fixture.assignmentId,
    specialistAuthSubject: fixture.authSubject,
    decision: {
      type: "EDIT_AND_SEND",
      finalText,
      reason: "整理後通知",
      finalSnapshotSha256,
    },
    aiReview: persisted,
    finalizationKey: "human-action-repeatable",
    expectedFinalSnapshotHash: finalSnapshotSha256,
    now: "2026-08-20T10:03:00.000Z",
  });
  assertEquals(replay.finalMessageId, first.finalMessageId);
  assertEquals(store.finalMessages.length, 1);
  assertEquals(store.outbox.length, 1);

  const conflictText = "同一 review 不得換內容重送。";
  const conflictHash = await snapshotFor(conflictText);
  await assertRejectsAsync(
    () =>
      finalizeDrsGroupSend({
        store,
        caseId: fixture.caseId,
        linkedGroupId: fixture.linkedGroupId,
        lineGroupId: fixture.lineGroupId,
        assignmentId: fixture.assignmentId,
        specialistAuthSubject: fixture.authSubject,
        decision: {
          type: "EDIT_AND_SEND",
          finalText: conflictText,
          reason: "整理後通知",
          finalSnapshotSha256: conflictHash,
        },
        aiReview: persisted,
        finalizationKey: "human-action-conflict",
        expectedFinalSnapshotHash: conflictHash,
        now: "2026-08-20T10:04:00.000Z",
      }),
    "ai_review_already_consumed",
  );
});

Deno.test("finalization binds immutable deliverable payload to final attachment refs", async () => {
  const store = createMemoryDrsLineStore({
    uuidFactory: createSequentialUuidFactory(),
  });
  const fixture = seedSendableOwnerCase(store, {
    caseId: "case-deliverable-attachment",
    linkedGroupId: "linked-deliverable-attachment",
    lineGroupId: "CdeliverableAttachment",
    assignmentId: "assign-deliverable-attachment",
  });
  const { rawBody, signature } = await signedBody("secret", "channel-drs", [
    textEvent({
      webhookEventId: "webhook-deliverable-attachment",
      source: {
        type: "group",
        groupId: fixture.lineGroupId,
        userId: "Uowner",
      },
      message: {
        id: "line-message-deliverable-attachment",
        type: "file",
        fileName: "review.pdf",
        fileSize: 21,
        contentProvider: { type: "line" },
      },
    }),
  ]);
  await processLineWebhook({
    rawBody,
    signature,
    channelSecret: "secret",
    expectedDestination: "channel-drs",
    store,
    now: "2026-08-20T10:00:00.000Z",
    contentProvider: {
      readMessageContent: () =>
        new TextEncoder().encode("%PDF-1.7 deliverable"),
      detectMime: () => "application/pdf",
    },
  });
  const staged = store.attachments[0];
  assert(staged !== undefined, "attachment should be staged");
  const ref = {
    attachmentId: staged.attachmentId,
    sha256: staged.sha256,
    mimeType: staged.mimeType,
    byteSize: staged.byteSize,
    storageRef: staged.storageRef,
  };
  const finalText = "已收到附件，DRS 人員會整理後再通知。";
  const deliverableMessages = [
    {
      type: "text" as const,
      purpose: "final_text" as const,
      text: createPublicSafeText(finalText),
    },
    ...attachmentTransportMessages([ref]),
  ];
  const finalSnapshotSha256 = await computeFinalSnapshotSha256({
    finalText: createPublicSafeText(finalText),
    attachments: [ref],
    deliverableMessages,
  });
  const review = await persistedDrsReview(store, {
    caseId: fixture.caseId,
    linkedGroupId: fixture.linkedGroupId,
    text: finalText,
  });
  await finalizeDrsGroupSend({
    store,
    caseId: fixture.caseId,
    linkedGroupId: fixture.linkedGroupId,
    lineGroupId: fixture.lineGroupId,
    assignmentId: fixture.assignmentId,
    specialistAuthSubject: fixture.authSubject,
    decision: {
      type: "EDIT_AND_SEND",
      finalText,
      reason: "整理附件",
      finalSnapshotSha256,
    },
    aiReview: review,
    finalizationKey: "human-action-deliverable-attachment",
    expectedFinalSnapshotHash: finalSnapshotSha256,
    finalAttachments: [ref],
    attachmentTransportResolver,
    now: "2026-08-20T10:01:00.000Z",
  });
  const finalMessage = store.finalMessages[0] as unknown as {
    deliverableMessages?: unknown[];
  };
  assert(
    JSON.stringify(finalMessage.deliverableMessages).includes(
      staged.storageRef,
    ),
    "final message must persist the exact immutable attachment deliverable ref",
  );
  const request = await buildLinePushRequest({
    endpointBaseUrl: "https://line.local.test/v2/bot",
    store,
    outboxId: store.outbox[0].outboxId,
  });
  const requestMessages = JSON.parse(request.body).messages as unknown[];
  assert(
    JSON.stringify(requestMessages).includes(
      "https://drs.local.invalid/access/",
    ),
    "LINE request must include the persisted opaque PDF access URL",
  );
  finalMessage.deliverableMessages = [];
  await assertRejectsAsync(
    () =>
      buildLinePushRequest({
        endpointBaseUrl: "https://line.local.test/v2/bot",
        store,
        outboxId: store.outbox[0].outboxId,
      }),
    "final_message_snapshot_mismatch",
  );
});

Deno.test("final attachment transport persists exact ordered LINE image and PDF payloads", async () => {
  const store = createMemoryDrsLineStore({
    uuidFactory: createSequentialUuidFactory(),
  });
  const fixture = seedSendableOwnerCase(store, {
    caseId: "case-line-attachment-payloads",
    linkedGroupId: "linked-line-attachment-payloads",
    lineGroupId: "ClineAttachmentPayloads",
    assignmentId: "assign-line-attachment-payloads",
  });
  const pngBytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 1, 2, 3]);
  const pdfBytes = new TextEncoder().encode("%PDF-1.7 line outbound pdf");
  const { rawBody, signature } = await signedBody("secret", "channel-drs", [
    textEvent({
      webhookEventId: "webhook-line-image-101",
      source: {
        type: "group",
        groupId: fixture.lineGroupId,
        userId: "Uowner",
      },
      message: {
        id: "line-image-101",
        type: "image",
        contentProvider: { type: "line" },
      },
    }),
    textEvent({
      webhookEventId: "webhook-line-pdf-102",
      source: {
        type: "group",
        groupId: fixture.lineGroupId,
        userId: "Uowner",
      },
      message: {
        id: "line-pdf-102",
        type: "file",
        fileName: "review.pdf",
        fileSize: pdfBytes.byteLength,
        contentProvider: { type: "line" },
      },
    }),
  ]);
  await processLineWebhook({
    rawBody,
    signature,
    channelSecret: "secret",
    expectedDestination: "channel-drs",
    store,
    now: "2026-08-20T10:00:00.000Z",
    contentProvider: {
      readMessageContent: (messageId) =>
        messageId === "line-image-101" ? pngBytes : pdfBytes,
      detectMime: (messageId) =>
        messageId === "line-image-101" ? "image/png" : "application/pdf",
    },
  });
  const image = store.attachments.find((candidate) =>
    candidate.lineMessageId === "line-image-101"
  );
  const pdf = store.attachments.find((candidate) =>
    candidate.lineMessageId === "line-pdf-102"
  );
  assert(
    image !== undefined && pdf !== undefined,
    "image and PDF attachments should be staged",
  );
  const imageRef: FinalAttachmentRef = {
    attachmentId: image.attachmentId,
    sha256: image.sha256,
    mimeType: image.mimeType,
    byteSize: image.byteSize,
    storageRef: image.storageRef,
  };
  const pdfRef: FinalAttachmentRef = {
    attachmentId: pdf.attachmentId,
    sha256: pdf.sha256,
    mimeType: pdf.mimeType,
    byteSize: pdf.byteSize,
    storageRef: pdf.storageRef,
  };
  const finalText = "附件整理完成後，請先在 LINE 查看摘要。";
  const deliverableMessages = [
    {
      type: "text" as const,
      purpose: "final_text" as const,
      text: createPublicSafeText(finalText),
    },
    ...attachmentTransportMessages([imageRef, pdfRef]),
  ];
  const finalSnapshotSha256 = await computeFinalSnapshotSha256({
    finalText: createPublicSafeText(finalText),
    attachments: [imageRef, pdfRef],
    deliverableMessages,
  });
  const advisory = await persistedDrsReview(store, {
    caseId: fixture.caseId,
    linkedGroupId: fixture.linkedGroupId,
    text: finalText,
  });

  await finalizeDrsGroupSend({
    store,
    caseId: fixture.caseId,
    linkedGroupId: fixture.linkedGroupId,
    lineGroupId: fixture.lineGroupId,
    assignmentId: fixture.assignmentId,
    specialistAuthSubject: fixture.authSubject,
    decision: {
      type: "EDIT_AND_SEND",
      finalText,
      reason: "整理附件",
      finalSnapshotSha256,
    },
    aiReview: advisory,
    finalizationKey: "human-action-line-attachment-payloads",
    expectedFinalSnapshotHash: finalSnapshotSha256,
    finalAttachments: [imageRef, pdfRef],
    attachmentTransportResolver,
    now: "2026-08-20T10:01:00.000Z",
  });
  const persistedMessages = store.finalMessages[0].deliverableMessages;
  assertEquals(persistedMessages.length, 3);
  assert(
    JSON.stringify(persistedMessages).includes(imageRef.storageRef) &&
      JSON.stringify(persistedMessages).includes(pdfRef.storageRef),
    "persisted deliverable must retain attachment storage refs for hash binding",
  );
  const request = await buildLinePushRequest({
    endpointBaseUrl: "https://line.local.test/v2/bot",
    store,
    outboxId: store.outbox[0].outboxId,
  });
  const messages = JSON.parse(request.body).messages;
  assertEquals(messages[0].type, "text");
  assertEquals(messages[1].type, "image");
  assertEquals(
    messages[1].originalContentUrl,
    `https://drs.local.invalid/images/${imageRef.attachmentId}/original`,
  );
  assertEquals(
    messages[1].previewImageUrl,
    `https://drs.local.invalid/images/${imageRef.attachmentId}/preview`,
  );
  assertEquals(messages[2].type, "text");
  assert(
    messages[2].text.includes(
      `https://drs.local.invalid/access/${pdfRef.attachmentId}`,
    ),
    "PDF outbound must be an opaque HTTPS access URL text payload",
  );
});

Deno.test("PDF attachment transport requires structured opaque access URL bound to the immutable attachment", async () => {
  const store = createMemoryDrsLineStore({
    uuidFactory: createSequentialUuidFactory(),
  });
  const fixture = seedSendableOwnerCase(store, {
    caseId: "case-pdf-opaque-url",
    linkedGroupId: "linked-pdf-opaque-url",
    lineGroupId: "CpdfOpaqueUrl",
    assignmentId: "assign-pdf-opaque-url",
  });
  const pdfBytes = new TextEncoder().encode("%PDF-1.7 opaque URL probe");
  const { rawBody, signature } = await signedBody("secret", "channel-drs", [
    textEvent({
      webhookEventId: "webhook-pdf-opaque-url",
      source: {
        type: "group",
        groupId: fixture.lineGroupId,
        userId: "Uowner",
      },
      message: {
        id: "line-pdf-opaque-url",
        type: "file",
        fileName: "opaque-url.pdf",
        fileSize: pdfBytes.byteLength,
        contentProvider: { type: "line" },
      },
    }),
  ]);
  await processLineWebhook({
    rawBody,
    signature,
    channelSecret: "secret",
    expectedDestination: "channel-drs",
    store,
    now: "2026-08-20T10:00:00.000Z",
    contentProvider: {
      readMessageContent: () => pdfBytes,
      detectMime: () => "application/pdf",
    },
  });
  const pdf = store.attachments.find((candidate) =>
    candidate.lineMessageId === "line-pdf-opaque-url"
  );
  assert(pdf !== undefined, "PDF attachment should be staged");
  const pdfRef: FinalAttachmentRef = {
    attachmentId: pdf.attachmentId,
    sha256: pdf.sha256,
    mimeType: pdf.mimeType,
    byteSize: pdf.byteSize,
    storageRef: pdf.storageRef,
  };
  const finalText = "請查看附件摘要。";
  const finalSnapshotSha256 = await computeFinalSnapshotSha256({
    finalText: createPublicSafeText(finalText),
    attachments: [pdfRef],
    deliverableMessages: [
      {
        type: "text",
        purpose: "final_text",
        text: createPublicSafeText(finalText),
      },
      {
        type: "text",
        purpose: "attachment_payload",
        text: createPublicSafeText(
          "PDF 附件安全連結：https://evil.invalid/raw-storage/private-staged",
        ),
        accessUrl: "https://evil.invalid/raw-storage/private-staged",
        attachmentRef: { ...pdfRef },
      },
    ] as unknown as readonly FinalDeliverableMessage[],
  });
  const advisory = await persistedDrsReview(store, {
    caseId: fixture.caseId,
    linkedGroupId: fixture.linkedGroupId,
    text: finalText,
  });

  await assertRejectsAsync(
    () =>
      finalizeDrsGroupSend({
        store,
        caseId: fixture.caseId,
        linkedGroupId: fixture.linkedGroupId,
        lineGroupId: fixture.lineGroupId,
        assignmentId: fixture.assignmentId,
        specialistAuthSubject: fixture.authSubject,
        decision: {
          type: "EDIT_AND_SEND",
          finalText,
          reason: "整理附件",
          finalSnapshotSha256,
        },
        aiReview: advisory,
        finalizationKey: "human-action-pdf-opaque-url",
        expectedFinalSnapshotHash: finalSnapshotSha256,
        finalAttachments: [pdfRef],
        attachmentTransportResolver: {
          resolve: () =>
            [
              {
                type: "text",
                purpose: "attachment_payload",
                text: createPublicSafeText(
                  "PDF 附件安全連結：https://evil.invalid/raw-storage/private-staged",
                ),
                accessUrl: "https://evil.invalid/raw-storage/private-staged",
                attachmentRef: { ...pdfRef },
              },
            ] as unknown as readonly FinalDeliverableMessage[],
        },
        now: "2026-08-20T10:01:00.000Z",
      }),
    "attachment_transport_unavailable",
  );
});

Deno.test("attachment transport rejects nested attachmentRef extra keys instead of normalizing them away", async () => {
  const store = createMemoryDrsLineStore({
    uuidFactory: createSequentialUuidFactory(),
  });
  const fixture = seedSendableOwnerCase(store, {
    caseId: "case-nested-key-closure",
    linkedGroupId: "linked-nested-key-closure",
    lineGroupId: "CnestedKeyClosure",
    assignmentId: "assign-nested-key-closure",
  });
  const pdfBytes = new TextEncoder().encode("%PDF-1.7 nested key closure");
  const { rawBody, signature } = await signedBody("secret", "channel-drs", [
    textEvent({
      webhookEventId: "webhook-nested-key-closure",
      source: {
        type: "group",
        groupId: fixture.lineGroupId,
        userId: "Uowner",
      },
      message: {
        id: "line-nested-key-closure",
        type: "file",
        fileName: "nested-key.pdf",
        fileSize: pdfBytes.byteLength,
        contentProvider: { type: "line" },
      },
    }),
  ]);
  await processLineWebhook({
    rawBody,
    signature,
    channelSecret: "secret",
    expectedDestination: "channel-drs",
    store,
    now: "2026-08-20T10:00:00.000Z",
    contentProvider: {
      readMessageContent: () => pdfBytes,
      detectMime: () => "application/pdf",
    },
  });
  const pdf = store.attachments.find((candidate) =>
    candidate.lineMessageId === "line-nested-key-closure"
  );
  assert(pdf !== undefined, "PDF attachment should be staged");
  const pdfRef: FinalAttachmentRef = {
    attachmentId: pdf.attachmentId,
    sha256: pdf.sha256,
    mimeType: pdf.mimeType,
    byteSize: pdf.byteSize,
    storageRef: pdf.storageRef,
  };
  const finalText = "請查看附件摘要。";
  const accessUrl = `https://drs.local.invalid/access/${pdfRef.attachmentId}`;
  const finalSnapshotSha256 = await computeFinalSnapshotSha256({
    finalText: createPublicSafeText(finalText),
    attachments: [pdfRef],
    deliverableMessages: [
      {
        type: "text",
        purpose: "final_text",
        text: createPublicSafeText(finalText),
      },
      {
        type: "text",
        purpose: "attachment_payload",
        text: createPublicSafeText(`PDF 附件安全連結：${accessUrl}`),
        accessUrl,
        accessUrlKind: "drs_opaque_attachment_access",
        attachmentRef: { ...pdfRef },
      },
    ] as unknown as readonly FinalDeliverableMessage[],
  });
  const advisory = await persistedDrsReview(store, {
    caseId: fixture.caseId,
    linkedGroupId: fixture.linkedGroupId,
    text: finalText,
  });

  await assertRejectsAsync(
    () =>
      finalizeDrsGroupSend({
        store,
        caseId: fixture.caseId,
        linkedGroupId: fixture.linkedGroupId,
        lineGroupId: fixture.lineGroupId,
        assignmentId: fixture.assignmentId,
        specialistAuthSubject: fixture.authSubject,
        decision: {
          type: "EDIT_AND_SEND",
          finalText,
          reason: "整理附件",
          finalSnapshotSha256,
        },
        aiReview: advisory,
        finalizationKey: "human-action-nested-key-closure",
        expectedFinalSnapshotHash: finalSnapshotSha256,
        finalAttachments: [pdfRef],
        attachmentTransportResolver: {
          resolve: () =>
            [
              {
                type: "text",
                purpose: "attachment_payload",
                text: createPublicSafeText(`PDF 附件安全連結：${accessUrl}`),
                accessUrl,
                accessUrlKind: "drs_opaque_attachment_access",
                attachmentRef: {
                  ...pdfRef,
                  private_draft: "draft-body",
                },
              },
            ] as unknown as readonly FinalDeliverableMessage[],
        },
        now: "2026-08-20T10:01:00.000Z",
      }),
    "attachment_transport_unavailable",
  );
});

Deno.test("PDF opaque URL rejects explicit ports, host drift and encoded storage identity before hashing", async () => {
  const cases = [
    {
      name: "explicit_default_port",
      url: (ref: FinalAttachmentRef) =>
        `https://drs.local.invalid:443/access/${ref.attachmentId}`,
    },
    {
      name: "non_default_port",
      url: (ref: FinalAttachmentRef) =>
        `https://drs.local.invalid:8443/access/${ref.attachmentId}`,
    },
    {
      name: "host_case_drift",
      url: (ref: FinalAttachmentRef) =>
        `https://DRS.local.invalid/access/${ref.attachmentId}`,
    },
    {
      name: "percent_encoded_storage_ref",
      url: (ref: FinalAttachmentRef) =>
        `https://drs.local.invalid/access/${ref.attachmentId}?ref=${
          encodeURIComponent(ref.storageRef)
        }`,
    },
  ];
  for (const item of cases) {
    const store = createMemoryDrsLineStore({
      uuidFactory: createSequentialUuidFactory(),
    });
    const fixture = seedSendableOwnerCase(store, {
      caseId: `case-pdf-url-${item.name}`,
      linkedGroupId: `linked-pdf-url-${item.name}`,
      lineGroupId: `CpdfUrl${item.name}`,
      assignmentId: `assign-pdf-url-${item.name}`,
    });
    const pdfRef = await stageFixtureAttachment(store, {
      lineGroupId: fixture.lineGroupId,
      lineMessageId: `line-pdf-url-${item.name}`,
      bytes: new TextEncoder().encode(`%PDF-1.7 ${item.name}`),
      detectedMime: "application/pdf",
    });
    const finalText = `請查看 PDF ${item.name}`;
    const accessUrl = item.url(pdfRef);
    const deliverableMessages = [
      {
        type: "text" as const,
        purpose: "final_text" as const,
        text: createPublicSafeText(finalText),
      },
      {
        type: "text" as const,
        purpose: "attachment_payload" as const,
        text: createPublicSafeText(`PDF 附件安全連結：${accessUrl}`),
        accessUrl,
        accessUrlKind: "drs_opaque_attachment_access" as const,
        attachmentRef: { ...pdfRef },
      },
    ] as unknown as readonly FinalDeliverableMessage[];
    const finalSnapshotSha256 = "0".repeat(64);
    const review = await persistedDrsReview(store, {
      caseId: fixture.caseId,
      linkedGroupId: fixture.linkedGroupId,
      text: finalText,
    });
    await assertRejectsAsync(
      () =>
        finalizeDrsGroupSend({
          store,
          caseId: fixture.caseId,
          linkedGroupId: fixture.linkedGroupId,
          lineGroupId: fixture.lineGroupId,
          assignmentId: fixture.assignmentId,
          specialistAuthSubject: fixture.authSubject,
          decision: {
            type: "EDIT_AND_SEND",
            finalText,
            reason: "整理附件",
            finalSnapshotSha256,
          },
          aiReview: review,
          finalizationKey: `human-action-pdf-url-${item.name}`,
          expectedFinalSnapshotHash: finalSnapshotSha256,
          finalAttachments: [pdfRef],
          attachmentTransportResolver: {
            resolve: () => [deliverableMessages[1]],
          },
          now: "2026-08-20T10:01:00.000Z",
        }),
      "attachment_transport_unavailable",
    );
  }
});

Deno.test("attachment transport rejects cross-variant top-level keys before persisted hash or send", async () => {
  const variants = [
    {
      name: "pdf_with_image_keys",
      mime: "application/pdf" as const,
      bytes: new TextEncoder().encode("%PDF-1.7 mixed keys"),
      message: (
        ref: FinalAttachmentRef,
        finalText: string,
      ): FinalDeliverableMessage => ({
        type: "text",
        purpose: "attachment_payload",
        text: createPublicSafeText(
          `PDF 附件安全連結：https://drs.local.invalid/access/${ref.attachmentId}`,
        ),
        accessUrl: `https://drs.local.invalid/access/${ref.attachmentId}`,
        accessUrlKind: "drs_opaque_attachment_access",
        originalContentUrl:
          `https://drs.local.invalid/images/${ref.attachmentId}/original`,
        attachmentRef: { ...ref },
        finalText,
      } as unknown as FinalDeliverableMessage),
    },
    {
      name: "image_with_pdf_keys",
      mime: "image/png" as const,
      bytes: new Uint8Array([0x89, 0x50, 0x4e, 0x47, 8]),
      message: (
        ref: FinalAttachmentRef,
        _finalText: string,
      ): FinalDeliverableMessage => ({
        type: "image",
        purpose: "attachment_payload",
        originalContentUrl:
          `https://drs.local.invalid/images/${ref.attachmentId}/original`,
        previewImageUrl:
          `https://drs.local.invalid/images/${ref.attachmentId}/preview`,
        accessUrl: `https://drs.local.invalid/access/${ref.attachmentId}`,
        accessUrlKind: "drs_opaque_attachment_access",
        attachmentRef: { ...ref },
      } as unknown as FinalDeliverableMessage),
    },
  ];
  for (const item of variants) {
    const store = createMemoryDrsLineStore({
      uuidFactory: createSequentialUuidFactory(),
    });
    const fixture = seedSendableOwnerCase(store, {
      caseId: `case-mixed-variant-${item.name}`,
      linkedGroupId: `linked-mixed-variant-${item.name}`,
      lineGroupId: `CmixedVariant${item.name}`,
      assignmentId: `assign-mixed-variant-${item.name}`,
    });
    const ref = await stageFixtureAttachment(store, {
      lineGroupId: fixture.lineGroupId,
      lineMessageId: `line-mixed-variant-${item.name}`,
      bytes: item.bytes,
      detectedMime: item.mime,
    });
    const finalText = `請查看附件 ${item.name}`;
    const invalidMessage = item.message(ref, finalText);
    const finalSnapshotSha256 = "0".repeat(64);
    const review = await persistedDrsReview(store, {
      caseId: fixture.caseId,
      linkedGroupId: fixture.linkedGroupId,
      text: finalText,
    });
    await assertRejectsAsync(
      () =>
        finalizeDrsGroupSend({
          store,
          caseId: fixture.caseId,
          linkedGroupId: fixture.linkedGroupId,
          lineGroupId: fixture.lineGroupId,
          assignmentId: fixture.assignmentId,
          specialistAuthSubject: fixture.authSubject,
          decision: {
            type: "EDIT_AND_SEND",
            finalText,
            reason: "整理附件",
            finalSnapshotSha256,
          },
          aiReview: review,
          finalizationKey: `human-action-mixed-variant-${item.name}`,
          expectedFinalSnapshotHash: finalSnapshotSha256,
          finalAttachments: [ref],
          attachmentTransportResolver: {
            resolve: () => [invalidMessage],
          },
          now: "2026-08-20T10:01:00.000Z",
        }),
      "attachment_transport_unavailable",
    );
  }
});

Deno.test("finalization fails closed when attachment transport payload cannot be resolved", async () => {
  const store = createMemoryDrsLineStore({
    uuidFactory: createSequentialUuidFactory(),
  });
  const fixture = seedSendableOwnerCase(store, {
    caseId: "case-attachment-transport-unavailable",
    linkedGroupId: "linked-attachment-transport-unavailable",
    lineGroupId: "CattachmentTransportUnavailable",
    assignmentId: "assign-attachment-transport-unavailable",
  });
  const { rawBody, signature } = await signedBody("secret", "channel-drs", [
    textEvent({
      webhookEventId: "webhook-attachment-transport-unavailable",
      source: {
        type: "group",
        groupId: fixture.lineGroupId,
        userId: "Uowner",
      },
      message: {
        id: "line-message-attachment-transport-unavailable",
        type: "file",
        fileName: "review.pdf",
        fileSize: 21,
        contentProvider: { type: "line" },
      },
    }),
  ]);
  await processLineWebhook({
    rawBody,
    signature,
    channelSecret: "secret",
    expectedDestination: "channel-drs",
    store,
    now: "2026-08-20T10:00:00.000Z",
    contentProvider: {
      readMessageContent: () =>
        new TextEncoder().encode("%PDF-1.7 unavailable"),
      detectMime: () => "application/pdf",
    },
  });
  const staged = store.attachments[0];
  const ref = {
    attachmentId: staged.attachmentId,
    sha256: staged.sha256,
    mimeType: staged.mimeType,
    byteSize: staged.byteSize,
    storageRef: staged.storageRef,
  };
  const finalText = "已收到附件，DRS 人員會整理後再通知。";
  const finalSnapshotSha256 = await computeFinalSnapshotSha256({
    finalText: createPublicSafeText(finalText),
    attachments: [ref],
  });
  const review = await persistedDrsReview(store, {
    caseId: fixture.caseId,
    linkedGroupId: fixture.linkedGroupId,
    text: finalText,
  });

  await assertRejectsAsync(
    () =>
      finalizeDrsGroupSend({
        store,
        caseId: fixture.caseId,
        linkedGroupId: fixture.linkedGroupId,
        lineGroupId: fixture.lineGroupId,
        assignmentId: fixture.assignmentId,
        specialistAuthSubject: fixture.authSubject,
        decision: {
          type: "EDIT_AND_SEND",
          finalText,
          reason: "整理附件",
          finalSnapshotSha256,
        },
        aiReview: review,
        finalizationKey: "human-action-attachment-transport-unavailable",
        expectedFinalSnapshotHash: finalSnapshotSha256,
        finalAttachments: [ref],
        now: "2026-08-20T10:01:00.000Z",
      }),
    "attachment_transport_unavailable",
  );
  assertEquals(store.finalMessages.length, 0);
  assertEquals(store.outbox.length, 0);
});

Deno.test("CANCEL consumes the persisted review without creating final message or outbox and hashes complete decision metadata", async () => {
  const store = createMemoryDrsLineStore({
    uuidFactory: createSequentialUuidFactory(),
  });
  const fixture = seedSendableOwnerCase(store, {
    caseId: "case-cancel",
    linkedGroupId: "linked-cancel",
    lineGroupId: "Ccancel",
    assignmentId: "assign-cancel",
  });
  const advisory = await persistedDrsReview(store, {
    caseId: fixture.caseId,
    linkedGroupId: fixture.linkedGroupId,
    text: "這則通知取消送出。",
  });
  const cancelled = await finalizeDrsGroupSend({
    store,
    caseId: fixture.caseId,
    linkedGroupId: fixture.linkedGroupId,
    lineGroupId: fixture.lineGroupId,
    assignmentId: fixture.assignmentId,
    specialistAuthSubject: fixture.authSubject,
    decision: { type: "CANCEL", reason: "人工判斷暫不送出" },
    aiReview: advisory,
    finalizationKey: "human-action-cancel",
    expectedFinalSnapshotHash: "",
    now: "2026-08-20T10:01:00.000Z",
  });
  assertEquals(cancelled.status, "cancelled");
  assertEquals(store.finalMessages.length, 0);
  assertEquals(store.outbox.length, 0);
  const decision = store.humanDecisions[0];
  const audit = store.auditEvents.find((event) =>
    event.eventType === "HUMAN_DECISION" &&
    event.correlationId === decision.decisionId
  );
  assert(audit !== undefined, "missing human decision audit");
  assertEquals(
    audit.payloadSha256,
    await computeHumanDecisionPayloadSha256(decision),
  );
});

Deno.test("all TypeScript-emitted persistence identifiers are UUID-compatible with SQL", async () => {
  const store = createMemoryDrsLineStore({
    uuidFactory: createSequentialUuidFactory(),
  });
  const fixture = seedSendableOwnerCase(store, {
    caseId: "case-uuid",
    linkedGroupId: "linked-uuid",
    lineGroupId: "Cuuid",
    assignmentId: "assign-uuid",
  });
  const { rawBody, signature } = await signedBody("secret", "channel-drs", [
    textEvent({
      webhookEventId: "webhook-uuid",
      source: { type: "group", groupId: "Cuuid", userId: "Uowner" },
      message: { id: "line-message-uuid", type: "text", text: "請協助整理。" },
    }),
  ]);
  await processLineWebhook({
    rawBody,
    signature,
    channelSecret: "secret",
    expectedDestination: "channel-drs",
    store,
    now: "2026-08-20T10:00:00.000Z",
  });
  const advisory = await persistedDrsReview(store, {
    caseId: fixture.caseId,
    linkedGroupId: fixture.linkedGroupId,
    text: "已收到，會整理後再通知。",
    now: "2026-08-20T10:01:00.000Z",
  });
  const finalText = "已收到，會整理後再通知。";
  const finalSnapshotSha256 = await snapshotFor(finalText);
  await finalizeDrsGroupSend({
    store,
    caseId: fixture.caseId,
    linkedGroupId: fixture.linkedGroupId,
    lineGroupId: fixture.lineGroupId,
    assignmentId: fixture.assignmentId,
    specialistAuthSubject: fixture.authSubject,
    decision: {
      type: "EDIT_AND_SEND",
      finalText,
      reason: "整理後通知",
      finalSnapshotSha256,
    },
    aiReview: advisory,
    finalizationKey: "human-action-uuid",
    expectedFinalSnapshotHash: finalSnapshotSha256,
    now: "2026-08-20T10:02:00.000Z",
  });
  for (const receipt of store.receipts) {
    assertUuid(receipt.receiptId, "receiptId");
  }
  for (const event of store.auditEvents) {
    assertUuid(event.auditEventId, "auditEventId");
  }
  for (const review of store.aiReviews) assertUuid(review.reviewId, "reviewId");
  for (const decision of store.humanDecisions) {
    assertUuid(decision.decisionId, "decisionId");
  }
  for (const message of store.finalMessages) {
    assertUuid(message.finalMessageId, "finalMessageId");
  }
  for (const outbox of store.outbox) {
    assertUuid(outbox.outboxId, "outboxId");
    assertUuid(outbox.retryKey, "retryKey");
  }
});

Deno.test("unassigned or wrong specialist postback is denied", async () => {
  const store = createMemoryDrsLineStore();
  store.linkGroup({
    formalLinkId: "formal-deny",
    caseId: "case-deny",
    linkedGroupId: "linked-deny",
    lineGroupId: "Cdeny",
    groupType: "OWNER_DRS_PRIVATE",
    status: "active",
    validFrom: "2026-08-20T00:00:00.000Z",
    validTo: "2026-09-20T00:00:00.000Z",
    drsMember: true,
    ownerLineUserIds: ["Uowner"],
    vendorLineUserIds: [],
  });
  const advisory = await persistedDrsReview(store, {
    caseId: "case-deny",
    linkedGroupId: "linked-deny",
    text: "請補資料。",
  });
  const finalText = "請補資料。";
  const finalSnapshotSha256 = await snapshotFor(finalText);
  await assertRejectsAsync(
    () =>
      finalizeDrsGroupSend({
        store,
        caseId: "case-deny",
        linkedGroupId: "linked-deny",
        lineGroupId: "Cdeny",
        assignmentId: "missing-assignment",
        specialistAuthSubject: "wrong-auth",
        decision: {
          type: "EDIT_AND_SEND",
          finalText,
          reason: "整理通知",
          finalSnapshotSha256,
        },
        aiReview: advisory,
        finalizationKey: "human-action-deny",
        expectedFinalSnapshotHash: finalSnapshotSha256,
        now: "2026-08-20T10:01:00.000Z",
      }),
    "assignment_not_active",
  );
});

Deno.test("Flex, Quick Reply, Postback and Rich Menu payloads expose only opaque actions and public-safe content", () => {
  const store = createMemoryDrsLineStore({
    uuidFactory: createSequentialUuidFactory(),
  });
  const postback = createSpecialistPostbackHandle({
    store,
    specialistId: "spec-flex",
    authSubject: "auth-flex",
    caseId: "case-flex",
    linkedGroupId: "linked-flex",
    reviewId: "00000000-0000-4000-8000-000000000001",
    action: "EDIT_AND_SEND",
    expiresAt: "2026-08-20T11:00:00.000Z",
  });
  const safeTitle = createPublicSafeText("案件整理進度");
  const flexes = [
    buildCaseStateFlex({
      title: safeTitle,
      stateText: createPublicSafeText("已收到，正在整理需要確認的項目。"),
    }),
    buildNextActionFlex({
      title: safeTitle,
      nextAction: createPublicSafeText("請補上合約附件。"),
    }),
    buildMissingDocumentsFlex({
      title: safeTitle,
      missingItems: [
        createPublicSafeText("平面圖"),
        createPublicSafeText("報價單"),
      ],
    }),
    buildReviewResultFlex({
      title: safeTitle,
      result: createPublicSafeText("DRS 人員已完成本次回覆整理。"),
    }),
    buildSpecialistDecisionFlex({
      title: safeTitle,
      opaqueAction: postback.token,
    }),
  ];
  const quickReplies = buildQuickReplyActions([
    { label: createPublicSafeText("補文件"), opaqueAction: "act_1" },
    { label: createPublicSafeText("稍後處理"), opaqueAction: "act_2" },
  ]);
  const richMenu = buildDrsRichMenuPayload({
    barText: createPublicSafeText("案件操作"),
    actions: [{
      label: createPublicSafeText("查看狀態"),
      opaqueAction: "rm_1",
    }],
  });
  const serialized = JSON.stringify({ flexes, quickReplies, richMenu });
  assert(!serialized.includes("case-"), "payload must not expose raw case id");
  assert(
    !serialized.includes("review-"),
    "payload must not expose raw review id",
  );
  assert(!serialized.includes("spec-flex"));
  assert(!serialized.includes("case-flex"));
  assert(serialized.includes("act_1"));
  assert(serialized.includes("rm_1"));
});

Deno.test("specialist postback handle is cryptographically opaque, bound, single-use and expires at the boundary", () => {
  const store = createMemoryDrsLineStore({
    uuidFactory: createSequentialUuidFactory(),
  });
  const handle = createSpecialistPostbackHandle({
    store,
    specialistId: "spec-postback",
    authSubject: "auth-postback",
    caseId: "case-postback",
    linkedGroupId: "linked-postback",
    reviewId: "00000000-0000-4000-8000-000000000001",
    action: "OVERRIDE_AND_SEND",
    expiresAt: "2026-08-20T11:00:00.000Z",
  });
  assertUuid(handle.token, "specialist postback token");
  assert(!handle.token.includes("spec-postback"));
  assert(!handle.token.includes("case-postback"));
  assertRejects(
    () =>
      consumeSpecialistPostbackHandle({
        store,
        token: handle.token,
        specialistId: "spec-postback",
        authSubject: "wrong-auth-subject",
        caseId: "case-postback",
        linkedGroupId: "linked-postback",
        now: "2026-08-20T10:59:58.000Z",
      }),
    "opaque_token_context_mismatch",
  );
  const consumed = consumeSpecialistPostbackHandle({
    store,
    token: handle.token,
    specialistId: "spec-postback",
    authSubject: "auth-postback",
    caseId: "case-postback",
    linkedGroupId: "linked-postback",
    now: "2026-08-20T10:59:59.000Z",
  });
  assertEquals(consumed.action, "OVERRIDE_AND_SEND");
  assertRejects(
    () =>
      consumeSpecialistPostbackHandle({
        store,
        token: handle.token,
        specialistId: "spec-postback",
        authSubject: "auth-postback",
        caseId: "case-postback",
        linkedGroupId: "linked-postback",
        now: "2026-08-20T10:59:59.500Z",
      }),
    "opaque_token_consumed",
  );
  assertRejects(
    () =>
      consumeSpecialistPostbackHandle({
        store,
        token: "00000000-0000-4000-8000-999999999999",
        specialistId: "spec-postback",
        authSubject: "auth-postback",
        caseId: "case-postback",
        linkedGroupId: "linked-postback",
        now: "2026-08-20T10:59:59.000Z",
      }),
    "opaque_token_unknown",
  );

  const expiring = createSpecialistPostbackHandle({
    store,
    specialistId: "spec-postback",
    authSubject: "auth-postback",
    caseId: "case-postback",
    linkedGroupId: "linked-postback",
    reviewId: "00000000-0000-4000-8000-000000000002",
    action: "EDIT_AND_SEND",
    expiresAt: "2026-08-20T12:00:00.000Z",
  });
  assertRejects(
    () =>
      consumeSpecialistPostbackHandle({
        store,
        token: expiring.token,
        specialistId: "spec-postback",
        authSubject: "auth-postback",
        caseId: "case-postback",
        linkedGroupId: "linked-postback",
        now: "2026-08-20T12:00:00.000Z",
      }),
    "opaque_token_expired",
  );
  assertRejects(
    () =>
      createSpecialistPostbackHandle({
        store,
        specialistId: "spec-postback",
        authSubject: "auth-postback",
        caseId: "case-postback",
        linkedGroupId: "linked-postback",
        reviewId: "00000000-0000-4000-8000-000000000003",
        action: "EDIT_AND_SEND",
        expiresAt: "not-a-date",
      }),
    "opaque_token_invalid_expiry",
  );
});

Deno.test("group send revalidates assignment, link, membership, case and final snapshot hash", async () => {
  const store = createMemoryDrsLineStore();
  store.linkGroup({
    formalLinkId: "formal-revalidate",
    caseId: "case-revalidate",
    linkedGroupId: "linked-revalidate",
    lineGroupId: "Crevalidate",
    groupType: "OWNER_DRS_PRIVATE",
    status: "active",
    validFrom: "2026-08-20T00:00:00.000Z",
    validTo: "2026-09-20T00:00:00.000Z",
    drsMember: true,
    ownerLineUserIds: ["Uowner"],
    vendorLineUserIds: [],
  });
  store.assignSpecialist({
    assignmentId: "assign-revalidate",
    caseId: "case-revalidate",
    specialistId: "spec-4",
    verifiedAuthSubject: "auth-subject-4",
    specialistEmailSnapshot: "spec4@example.test",
    validFrom: "2026-08-20T00:00:00.000Z",
    validTo: "2026-09-20T00:00:00.000Z",
    assignedBy: "admin-1",
    status: "active",
    privateControlLineUserId: "UspecialistPrivate4",
  });
  const advisory = await persistedDrsReview(store, {
    caseId: "case-revalidate",
    linkedGroupId: "linked-revalidate",
    text: "已整理完成。",
  });
  const finalText = "已整理完成。";
  const finalSnapshotSha256 = await snapshotFor(finalText);
  await assertRejectsAsync(
    () =>
      finalizeDrsGroupSend({
        store,
        caseId: "case-revalidate",
        linkedGroupId: "linked-revalidate",
        lineGroupId: "Crevalidate",
        assignmentId: "assign-revalidate",
        specialistAuthSubject: "auth-subject-4",
        decision: {
          type: "EDIT_AND_SEND",
          finalText,
          reason: "通知",
          finalSnapshotSha256,
        },
        aiReview: advisory,
        finalizationKey: "human-action-revalidate-wrong-hash",
        expectedFinalSnapshotHash: "wrong-hash",
        now: "2026-08-20T10:01:00.000Z",
      }),
    "snapshot_hash_mismatch",
  );
  store.updateGroupMembership("linked-revalidate", { drsMember: false });
  await assertRejectsAsync(
    () =>
      finalizeDrsGroupSend({
        store,
        caseId: "case-revalidate",
        linkedGroupId: "linked-revalidate",
        lineGroupId: "Crevalidate",
        assignmentId: "assign-revalidate",
        specialistAuthSubject: "auth-subject-4",
        decision: {
          type: "EDIT_AND_SEND",
          finalText,
          reason: "通知",
          finalSnapshotSha256,
        },
        aiReview: advisory,
        finalizationKey: "human-action-revalidate-no-member",
        expectedFinalSnapshotHash: finalSnapshotSha256,
        now: "2026-08-20T10:02:00.000Z",
      }),
    "linked_group_not_sendable",
  );
});

Deno.test("complex document or drawing action issues only a server-side opaque single-use deep link", async () => {
  const store = createMemoryDrsLineStore({
    uuidFactory: createSequentialUuidFactory(),
  });
  const link = await buildComplexActionDeepLink({
    store,
    origin: "https://drs.local.test",
    opaqueActionContext: "ctx_complex_document_review",
    expiresAt: "2026-08-20T11:00:00.000Z",
  });
  assert(
    link.href.startsWith("https://drs.local.test/drs/line/continue?t="),
    "must use opaque server handle token",
  );
  assertUuid(link.token, "deep-link token");
  assert(!link.href.includes("case"));
  assert(!link.href.includes("review"));
  assert(!link.href.includes("profile"));
  assert(!link.href.includes("lineUserId"));
  const consumed = consumeComplexActionDeepLink({
    store,
    token: link.token,
    now: "2026-08-20T10:30:00.000Z",
  });
  assertEquals(consumed.actionContextId, "ctx_complex_document_review");
  assertRejects(
    () =>
      consumeComplexActionDeepLink({
        store,
        token: link.token,
        now: "2026-08-20T10:31:00.000Z",
      }),
    "opaque_token_consumed",
  );
  assertRejects(
    () =>
      consumeComplexActionDeepLink({
        store,
        token: "00000000-0000-4000-8000-999999999999",
        now: "2026-08-20T10:31:00.000Z",
      }),
    "opaque_token_unknown",
  );
});

Deno.test("duplicate redelivery is idempotent and no duplicate group send occurs", async () => {
  const store = createMemoryDrsLineStore();
  store.linkGroup({
    formalLinkId: "formal-idem",
    caseId: "case-idem",
    linkedGroupId: "linked-idem",
    lineGroupId: "Cidem",
    groupType: "OWNER_DRS_PRIVATE",
    status: "active",
    validFrom: "2026-08-20T00:00:00.000Z",
    validTo: "2026-09-20T00:00:00.000Z",
    drsMember: true,
    ownerLineUserIds: ["Uowner"],
    vendorLineUserIds: [],
  });
  const event = textEvent({
    webhookEventId: "webhook-idem",
    source: { type: "group", groupId: "Cidem", userId: "Uowner" },
    message: { id: "line-message-idem", type: "text", text: "同一則訊息" },
  });
  const first = await signedBody("secret", "channel-drs", [event]);
  const second = await signedBody("secret", "channel-drs", [
    { ...event, deliveryContext: { isRedelivery: true } },
  ]);
  await processLineWebhook({
    ...first,
    channelSecret: "secret",
    expectedDestination: "channel-drs",
    store,
    now: "2026-08-20T10:00:00.000Z",
  });
  await processLineWebhook({
    ...second,
    channelSecret: "secret",
    expectedDestination: "channel-drs",
    store,
    now: "2026-08-20T10:01:00.000Z",
  });
  assertEquals(store.receipts.length, 1);
  assertEquals(
    store.auditEvents.filter((eventRecord) =>
      eventRecord.eventType === "LINE_SENT_EVENT"
    ).length,
    1,
  );
});

Deno.test("drafts, keystrokes, unsent text and unrelated group data are not modeled or persisted", async () => {
  const store = createMemoryDrsLineStore();
  const { rawBody, signature } = await signedBody("secret", "channel-drs", [
    {
      type: "typing",
      source: {
        type: "group",
        groupId: "CownerPrivateGroup",
        userId: "Uowner",
      },
    },
    {
      type: "draft",
      source: {
        type: "group",
        groupId: "CownerPrivateGroup",
        userId: "Uowner",
      },
      text: "未送出",
    },
  ]);
  const result = await processLineWebhook({
    rawBody,
    signature,
    channelSecret: "secret",
    expectedDestination: "channel-drs",
    store,
    now: "2026-08-20T10:00:00.000Z",
  });
  assertEquals(result.acceptedCount, 0);
  assertEquals(store.receipts.length, 0);
  assertEquals(store.unsentDrafts.length, 0);
});

Deno.test("unsupported LINE events are safely acknowledged without case records", async () => {
  const store = createMemoryDrsLineStore();
  const { rawBody, signature } = await signedBody("secret", "channel-drs", [
    {
      type: "follow",
      source: { type: "user", userId: "Uowner" },
      timestamp: 1797700800000,
      webhookEventId: "follow-1",
    },
    {
      type: "message",
      source: { type: "room", roomId: "Rlegacy", userId: "Uowner" },
      timestamp: 1797700800000,
      webhookEventId: "room-1",
      message: { id: "room-msg", type: "text", text: "legacy room" },
    },
  ]);
  const result = await processLineWebhook({
    rawBody,
    signature,
    channelSecret: "secret",
    expectedDestination: "channel-drs",
    store,
    now: "2026-08-20T10:00:00.000Z",
  });
  assertEquals(result.unsupportedCount, 2);
  assertEquals(store.receipts.length, 0);
});

Deno.test("bot join and leave events maintain bot presence without reauthorizing formal revoked links or stale order", async () => {
  const store = createMemoryDrsLineStore();
  store.linkGroup({
    formalLinkId: "formal-membership",
    caseId: "case-membership",
    linkedGroupId: "linked-membership",
    lineGroupId: "Cmembership",
    groupType: "OWNER_DRS_PRIVATE",
    status: "active",
    validFrom: "2026-08-20T00:00:00.000Z",
    validTo: "2026-09-20T00:00:00.000Z",
    drsMember: false,
    ownerLineUserIds: ["Uowner"],
    vendorLineUserIds: [],
  });
  const join = await signedBody("secret", "channel-drs", [
    {
      type: "join",
      source: { type: "group", groupId: "Cmembership" },
      timestamp: 1797700800000,
      webhookEventId: "join-1",
    },
  ]);
  await processLineWebhook({
    ...join,
    channelSecret: "secret",
    expectedDestination: "channel-drs",
    store,
    now: "2026-08-20T10:00:00.000Z",
  });
  assertEquals(store.getLinkedGroup("linked-membership")?.drsMember, true);
  const leave = await signedBody("secret", "channel-drs", [
    {
      type: "leave",
      source: { type: "group", groupId: "Cmembership" },
      timestamp: 1797700800000,
      webhookEventId: "leave-1",
    },
  ]);
  await processLineWebhook({
    ...leave,
    channelSecret: "secret",
    expectedDestination: "channel-drs",
    store,
    now: "2026-08-20T10:01:00.000Z",
  });
  assertEquals(store.getLinkedGroup("linked-membership")?.status, "active");
  assertEquals(store.getLinkedGroup("linked-membership")?.drsMember, false);

  const staleJoin = await signedBody("secret", "channel-drs", [
    {
      type: "join",
      source: { type: "group", groupId: "Cmembership" },
      timestamp: 1797700799000,
      webhookEventId: "join-stale",
    },
  ]);
  await processLineWebhook({
    ...staleJoin,
    channelSecret: "secret",
    expectedDestination: "channel-drs",
    store,
    now: "2026-08-20T10:02:00.000Z",
  });
  assertEquals(
    store.getLinkedGroup("linked-membership")?.drsMember,
    false,
    "stale join must not reverse newer bot leave presence",
  );

  const equalTimestampJoin = await signedBody("secret", "channel-drs", [
    {
      type: "join",
      source: { type: "group", groupId: "Cmembership" },
      timestamp: 1797700800000,
      webhookEventId: "join-equal-stale",
    },
  ]);
  await processLineWebhook({
    ...equalTimestampJoin,
    channelSecret: "secret",
    expectedDestination: "channel-drs",
    store,
    now: "2026-08-20T10:02:30.000Z",
  });
  assertEquals(
    store.getLinkedGroup("linked-membership")?.drsMember,
    false,
    "equal timestamp join must not reverse an already-recorded leave",
  );

  store.updateGroupMembership("linked-membership", { status: "revoked" });
  const revokedJoin = await signedBody("secret", "channel-drs", [
    {
      type: "join",
      source: { type: "group", groupId: "Cmembership" },
      timestamp: 1797700920000,
      webhookEventId: "join-revoked",
    },
  ]);
  await processLineWebhook({
    ...revokedJoin,
    channelSecret: "secret",
    expectedDestination: "channel-drs",
    store,
    now: "2026-08-20T10:02:00.000Z",
  });
  assertEquals(store.getLinkedGroup("linked-membership")?.status, "revoked");
  assertEquals(store.getLinkedGroup("linked-membership")?.drsMember, false);
});

Deno.test("signature is verified before JSON parse and wrong destination is zero-write", async () => {
  const store = createMemoryDrsLineStore();
  const malformed = "{not-json";
  const badSignature = await signLineBody("wrong-secret", malformed);
  const signatureResult = await processLineWebhook({
    rawBody: malformed,
    signature: badSignature,
    channelSecret: "secret",
    expectedDestination: "channel-drs",
    store,
    now: "2026-08-20T10:00:00.000Z",
  });
  assertEquals(signatureResult.status, "bad_signature");
  assertEquals(store.receipts.length, 0);

  const wrongDestination = await signedBody("secret", "other-channel", [
    textEvent(),
  ]);
  const destinationResult = await processLineWebhook({
    ...wrongDestination,
    channelSecret: "secret",
    expectedDestination: "channel-drs",
    store,
    now: "2026-08-20T10:01:00.000Z",
  });
  assertEquals(destinationResult.status, "wrong_destination");
  assertEquals(store.receipts.length, 0);
});

Deno.test("non-finite or out-of-range LINE timestamps are rejected before Date conversion", async () => {
  for (
    const item of [
      { label: "infinite", timestampJson: "1e999" },
      { label: "out_of_range", timestampJson: "9007199254740992" },
    ]
  ) {
    const store = createMemoryDrsLineStore();
    store.linkGroup({
      formalLinkId: `formal-timestamp-${item.label}`,
      caseId: "case-timestamp",
      linkedGroupId: `linked-timestamp-${item.label}`,
      lineGroupId: "Ctimestamp",
      groupType: "OWNER_DRS_PRIVATE",
      status: "active",
      validFrom: "2026-08-20T00:00:00.000Z",
      validTo: "2026-09-20T00:00:00.000Z",
      drsMember: true,
      ownerLineUserIds: ["Uowner"],
      vendorLineUserIds: [],
    });
    const rawBody =
      `{"destination":"channel-drs","events":[{"type":"message","mode":"active","timestamp":${item.timestampJson},"webhookEventId":"webhook-timestamp-${item.label}","deliveryContext":{"isRedelivery":false},"source":{"type":"group","groupId":"Ctimestamp","userId":"Uowner"},"message":{"id":"line-message-timestamp-${item.label}","type":"text","text":"請協助整理。"}}]}`;
    const signature = await signLineBody("secret", rawBody);
    const result = await processLineWebhook({
      rawBody,
      signature,
      channelSecret: "secret",
      expectedDestination: "channel-drs",
      store,
      now: "2026-08-20T10:00:00.000Z",
    });
    assertEquals(result.acceptedCount, 0, item.label);
    assertEquals(result.deniedCount, 1, item.label);
    assertEquals(store.receipts.length, 0, item.label);
    assertEquals(store.auditEvents.length, 0, item.label);
  }
});

Deno.test("no secrets, PII or production hosts are embedded in W1 LINE source", async () => {
  const sources = [
    "src/lib/drs-linebot/w1.ts",
    "tests/line_bot/drs_group_ai_human_w1.test.ts",
    "supabase/migrations/20260820000000_drs_linebot_group_ai_human_w1.sql",
  ];
  const report = await assertNoProductionSecrets(sources);
  assertEquals(report.ok, true, report.findings.join("\n"));
});

Deno.test("account-link continuation is server-side opaque, single-use for verified server exchange, and unlink is explicit", async () => {
  const store = createMemoryDrsLineStore({
    uuidFactory: createSequentialUuidFactory(),
  });
  const continuation = await createLineAccountContinuation({
    store,
    subjectType: "SPECIALIST",
    subjectId: "spec-account-1",
    actionContextId: "ctx_account_link_1",
    expiresAt: "2026-08-20T10:10:00.000Z",
    origin: "https://drs.local.test",
  });
  assert(
    continuation.loginUrl.startsWith(
      "https://drs.local.test/drs/line/account-link/continue?t=",
    ),
  );
  assertUuid(continuation.token, "account-link continuation token");
  assert(!continuation.loginUrl.includes("spec-account-1"));
  assert(!continuation.loginUrl.includes("ctx_account_link_1"));

  const consumed = consumeLineAccountContinuation({
    store,
    token: continuation.token,
    now: "2026-08-20T10:05:00.000Z",
  });
  assertEquals(consumed.subjectType, "SPECIALIST");
  assertEquals(consumed.subjectId, "spec-account-1");
  assertRejects(
    () =>
      consumeLineAccountContinuation({
        store,
        token: continuation.token,
        now: "2026-08-20T10:06:00.000Z",
      }),
    "opaque_token_consumed",
  );

  const binding = linkLineAccount({
    store,
    subjectType: consumed.subjectType,
    subjectId: consumed.subjectId,
    lineUserId: "UspecialistLinked",
    linkedAt: "2026-08-20T10:06:00.000Z",
  });
  assertEquals(binding.status, "active");
  const same = linkLineAccount({
    store,
    subjectType: consumed.subjectType,
    subjectId: consumed.subjectId,
    lineUserId: "UspecialistLinked",
    linkedAt: "2026-08-20T10:07:00.000Z",
  });
  assertEquals(same.bindingId, binding.bindingId);
  store.unlinkLineAccount(binding.bindingId, "2026-08-20T10:08:00.000Z");
  assertEquals(store.accountBindings[0].status, "revoked");

  const expiredContinuation = await createLineAccountContinuation({
    store,
    subjectType: "SPECIALIST",
    subjectId: "spec-account-2",
    actionContextId: "ctx_account_link_2",
    expiresAt: "2026-08-20T10:10:00.000Z",
    origin: "https://drs.local.test",
  });
  assertRejects(
    () =>
      consumeLineAccountContinuation({
        store,
        token: expiredContinuation.token,
        now: "2026-08-20T10:11:00.000Z",
      }),
    "opaque_token_expired",
  );
  const boundaryContinuation = await createLineAccountContinuation({
    store,
    subjectType: "SPECIALIST",
    subjectId: "spec-account-3",
    actionContextId: "ctx_account_link_3",
    expiresAt: "2026-08-20T10:20:00.000Z",
    origin: "https://drs.local.test",
  });
  assertRejects(
    () =>
      consumeLineAccountContinuation({
        store,
        token: boundaryContinuation.token,
        now: "2026-08-20T10:20:00.000Z",
      }),
    "opaque_token_expired",
  );
  assertRejects(
    () =>
      consumeLineAccountContinuation({
        store,
        token: boundaryContinuation.token,
        now: "not-a-date",
      }),
    "opaque_token_invalid_now",
  );
  assertRejects(
    () =>
      createLineAccountContinuation({
        store,
        subjectType: "SPECIALIST",
        subjectId: "spec-account-4",
        actionContextId: "ctx_account_link_4",
        expiresAt: "not-a-date",
        origin: "https://drs.local.test",
      }),
    "opaque_token_invalid_expiry",
  );
});

Deno.test("specialist controls target only verified private bot control conversation", () => {
  const assignment = {
    assignmentId: "assign-private-control",
    caseId: "case-private-control",
    specialistId: "spec-private-control",
    verifiedAuthSubject: "auth-private-control",
    specialistEmailSnapshot: "spec-private@example.test",
    validFrom: "2026-08-20T00:00:00.000Z",
    validTo: "2026-09-20T00:00:00.000Z",
    assignedBy: "admin-1",
    status: "active" as const,
    privateControlLineUserId: "UspecialistPrivateControl",
  };
  const delivery = buildSpecialistPrivateControlDelivery({
    assignment,
    message: buildSpecialistDecisionFlex({
      title: createPublicSafeText("請確認是否送出"),
      opaqueAction: "00000000-0000-4000-8000-000000000001",
    }),
    retryKey: "retry-private-control",
  });
  assertEquals(delivery.target.type, "user");
  assertEquals(delivery.target.userId, "UspecialistPrivateControl");
  assert(
    !("groupId" in delivery.target),
    "private specialist controls must not target a group id",
  );
});

Deno.test("LINE push request resolves immutable outbox deliverable bytes and rejects drift", async () => {
  const store = createMemoryDrsLineStore({
    uuidFactory: createSequentialUuidFactory(),
  });
  const fixture = seedSendableOwnerCase(store, {
    caseId: "case-line-push",
    linkedGroupId: "linked-line-push",
    lineGroupId: "CgroupSend",
    assignmentId: "assign-line-push",
  });
  const advisory = await persistedDrsReview(store, {
    caseId: fixture.caseId,
    linkedGroupId: fixture.linkedGroupId,
    text: "已收到，DRS 人員會整理後再通知。",
  });
  const finalText = "已收到，DRS 人員會整理後再通知。";
  const finalSnapshotSha256 = await snapshotFor(finalText);
  await finalizeDrsGroupSend({
    store,
    caseId: fixture.caseId,
    linkedGroupId: fixture.linkedGroupId,
    lineGroupId: fixture.lineGroupId,
    assignmentId: fixture.assignmentId,
    specialistAuthSubject: fixture.authSubject,
    decision: {
      type: "EDIT_AND_SEND",
      finalText,
      reason: "整理後通知",
      finalSnapshotSha256,
    },
    aiReview: advisory,
    finalizationKey: "human-action-line-push",
    expectedFinalSnapshotHash: finalSnapshotSha256,
    now: "2026-08-20T10:01:00.000Z",
  });
  const request = await buildLinePushRequest({
    endpointBaseUrl: "https://line.local.test/v2/bot",
    store,
    outboxId: store.outbox[0].outboxId,
  });
  assertEquals(request.method, "POST");
  assertEquals(request.headers["x-line-retry-key"], store.outbox[0].retryKey);
  assert(JSON.parse(request.body).to === "CgroupSend");
  assert(
    JSON.stringify(JSON.parse(request.body).messages).includes(
      createPublicSafeText(finalText),
    ),
  );

  store.outbox[0].target = { type: "group", groupId: "Credirected" };
  await assertRejectsAsync(
    () =>
      buildLinePushRequest({
        endpointBaseUrl: "https://line.local.test/v2/bot",
        store,
        outboxId: store.outbox[0].outboxId,
      }),
    "outbox_target_mismatch",
  );
  store.outbox[0].target = { type: "group", groupId: "CgroupSend" };

  store.finalMessages[0].finalText = createPublicSafeText("被竄改的文字。");
  await assertRejectsAsync(
    () =>
      buildLinePushRequest({
        endpointBaseUrl: "https://line.local.test/v2/bot",
        store,
        outboxId: store.outbox[0].outboxId,
      }),
    "final_message_snapshot_mismatch",
  );
});

Deno.test("LINE push rejects persisted deliverable message array additions before transport", async () => {
  const store = createMemoryDrsLineStore({
    uuidFactory: createSequentialUuidFactory(),
  });
  const fixture = seedSendableOwnerCase(store, {
    caseId: "case-line-push-extra-message",
    linkedGroupId: "linked-line-push-extra-message",
    lineGroupId: "ClinePushExtraMessage",
    assignmentId: "assign-line-push-extra-message",
  });
  const finalText = "已收到，DRS 人員會整理後再通知。";
  const advisory = await persistedDrsReview(store, {
    caseId: fixture.caseId,
    linkedGroupId: fixture.linkedGroupId,
    text: finalText,
  });
  const finalSnapshotSha256 = await snapshotFor(finalText);
  await finalizeDrsGroupSend({
    store,
    caseId: fixture.caseId,
    linkedGroupId: fixture.linkedGroupId,
    lineGroupId: fixture.lineGroupId,
    assignmentId: fixture.assignmentId,
    specialistAuthSubject: fixture.authSubject,
    decision: {
      type: "EDIT_AND_SEND",
      finalText,
      reason: "整理後通知",
      finalSnapshotSha256,
    },
    aiReview: advisory,
    finalizationKey: "human-action-line-push-extra-message",
    expectedFinalSnapshotHash: finalSnapshotSha256,
    now: "2026-08-20T10:01:00.000Z",
  });

  const finalMessage = store.finalMessages[0] as unknown as {
    deliverableMessages: unknown[];
  };
  finalMessage.deliverableMessages = [
    ...finalMessage.deliverableMessages,
    {
      type: "text",
      purpose: "final_text",
      text: createPublicSafeText("這是不在人工決策快照內的額外訊息。"),
    },
  ];

  await assertRejectsAsync(
    () =>
      buildLinePushRequest({
        endpointBaseUrl: "https://line.local.test/v2/bot",
        store,
        outboxId: store.outbox[0].outboxId,
      }),
    "final_message_snapshot_mismatch",
  );
});

Deno.test("LINE push rejects persisted deliverable unknown keys instead of stripping private draft fields", async () => {
  const store = createMemoryDrsLineStore({
    uuidFactory: createSequentialUuidFactory(),
  });
  const fixture = seedSendableOwnerCase(store, {
    caseId: "case-line-push-private-draft",
    linkedGroupId: "linked-line-push-private-draft",
    lineGroupId: "ClinePushPrivateDraft",
    assignmentId: "assign-line-push-private-draft",
  });
  const finalText = "已收到，DRS 人員會整理後再通知。";
  const advisory = await persistedDrsReview(store, {
    caseId: fixture.caseId,
    linkedGroupId: fixture.linkedGroupId,
    text: finalText,
  });
  const finalSnapshotSha256 = await snapshotFor(finalText);
  await finalizeDrsGroupSend({
    store,
    caseId: fixture.caseId,
    linkedGroupId: fixture.linkedGroupId,
    lineGroupId: fixture.lineGroupId,
    assignmentId: fixture.assignmentId,
    specialistAuthSubject: fixture.authSubject,
    decision: {
      type: "EDIT_AND_SEND",
      finalText,
      reason: "整理後通知",
      finalSnapshotSha256,
    },
    aiReview: advisory,
    finalizationKey: "human-action-line-push-private-draft",
    expectedFinalSnapshotHash: finalSnapshotSha256,
    now: "2026-08-20T10:01:00.000Z",
  });

  const finalMessage = store.finalMessages[0] as unknown as {
    deliverableMessages: unknown[];
  };
  finalMessage.deliverableMessages[0] = {
    ...(finalMessage.deliverableMessages[0] as object),
    private_draft: "不應被 transport 靜默剝除的草稿欄位",
  };

  await assertRejectsAsync(
    () =>
      buildLinePushRequest({
        endpointBaseUrl: "https://line.local.test/v2/bot",
        store,
        outboxId: store.outbox[0].outboxId,
      }),
    "final_message_deliverable_mismatch",
  );
});

Deno.test("local migration contract keeps integration tables private with RLS/FORCE and no image canonical document promotion", async () => {
  const sql = await Deno.readTextFile(
    "supabase/migrations/20260820000000_drs_linebot_group_ai_human_w1.sql",
  );
  for (
    const table of [
      "drs_line_linked_groups",
      "drs_line_receipts",
      "drs_line_attachment_staging",
      "drs_line_specialist_assignments",
      "drs_line_ai_reviews",
      "drs_line_human_decisions",
      "drs_line_final_messages",
      "drs_line_outbox",
      "drs_line_audit_events",
      "drs_line_group_lifecycle_events",
    ]
  ) {
    assert(
      sql.includes(
        `alter table integration.${table} enable row level security`,
      ),
      `${table} missing RLS`,
    );
    assert(
      sql.includes(`alter table integration.${table} force row level security`),
      `${table} missing FORCE RLS`,
    );
  }
  assert(
    sql.includes(
      "revoke all on all tables in schema integration from public, anon, authenticated, service_role",
    ),
  );
  assert(
    !sql.includes(
      "grant select, insert, update on all tables in schema integration to service_role",
    ),
    "service_role must not receive broad direct table write grants",
  );
  assert(
    sql.includes(
      "create or replace function integration.drs_line_w1_append_receipt(",
    ),
  );
  assert(sql.includes("p_attachments jsonb"));
  assert(
    sql.includes(
      "create or replace function integration.drs_line_w1_finalize_message(",
    ),
  );
  assert(
    sql.includes(
      "create or replace function integration.drs_line_w1_persist_ai_review(",
    ),
  );
  assert(
    sql.includes(
      "create or replace function integration.drs_line_w1_record_human_decision(",
    ),
  );
  assert(
    sql.includes(
      "create or replace function integration.drs_line_w1_consume_opaque_handle(",
    ),
  );
  assert(sql.includes("security definer"));
  assert(sql.includes("set search_path = ''"));
  assert(sql.includes("on conflict"));
  assert(sql.includes("from integration.drs_line_ai_reviews"));
  assert(sql.includes("from integration.drs_line_human_decisions"));
  assert(sql.includes("review_consumed_by_decision_id"));
  assert(sql.includes("finalization_key"));
  assert(sql.includes("decision_payload_sha256"));
  assert(
    !sql.includes("p_decision_payload_sha256"),
    "SQL must recompute decision_payload_sha256 instead of trusting caller input",
  );
  assert(
    sql.includes("is distinct from"),
    "SQL nullable comparisons must use IS DISTINCT FROM",
  );
  assert(sql.includes("storage_ref text not null"));
  assert(sql.includes("final_body text not null"));
  assert(sql.includes("deliverable_messages jsonb not null"));
  assert(
    sql.includes("submitted_body text") &&
      sql.includes("submitted_body_cleared_at timestamptz"),
    "AI review request must hold submitted body only until completion",
  );
  assert(
    !sql.includes("p_submitted_snapshot_sha256") &&
      !sql.includes("p_submitted_body_sha256"),
    "SQL must derive submitted snapshot hash from submitted body server-side",
  );
  assert(
    sql.includes(
      "v_submitted_snapshot_sha256 := integration.drs_line_w1_sha256_text(p_submitted_body)",
    ),
    "request_ai_review must hash exact submitted body bytes",
  );
  assert(
    sql.includes("submitted_body = null") &&
      sql.includes("submitted_body_cleared_at = v_now"),
    "AI review completion must clear submitted body in the pending request",
  );
  assert(
    sql.includes("deliverable_messages") &&
      sql.includes("v_recomputed_final_snapshot_sha256") &&
      sql.includes("attachment_transport_unavailable"),
    "finalization must recompute final snapshot from canonical deliverable messages",
  );
  assert(
    !/on\s+conflict[\s\S]{0,120}do\s+nothing/iu.test(sql),
    "guarded RPCs must not use ON CONFLICT DO NOTHING with caller IDs",
  );
  for (
    const unsafeReturn of [
      "return p_review_id;",
      "return p_decision_id;",
      "return p_final_message_id;",
      "return p_outbox_id;",
      "return p_token;",
    ]
  ) {
    assert(
      !sql.includes(unsafeReturn),
      `guarded RPC must not return caller-supplied id: ${unsafeReturn}`,
    );
  }
  assert(
    sql.includes(
      "create or replace function integration.drs_line_w1_issue_opaque_handle(",
    ),
  );
  assert(
    sql.includes(
      "create or replace function integration.drs_line_w1_record_break_glass(",
    ),
  );
  assert(
    sql.includes(
      "create or replace function integration.drs_line_w1_record_group_lifecycle(",
    ),
    "group lifecycle mutation must be a guarded SQL path",
  );
  assert(
    sql.includes("alter function integration.drs_line_w1_finalize_message"),
    "SECURITY DEFINER ownership must be pinned",
  );
  assert(
    sql.includes("owner to laibe_integration_migration_owner"),
    "SECURITY DEFINER functions must name the intended non-login owner",
  );
  assert(
    sql.includes("create role laibe_integration_migration_owner nologin"),
    "migration owner must remain NOLOGIN",
  );
  assert(
    sql.includes(
      "grant usage on schema integration to laibe_integration_migration_owner",
    ) &&
      sql.includes(
        "grant select, insert, update on integration.drs_line_receipts to laibe_integration_migration_owner",
      ) &&
      sql.includes(
        "grant select, insert, update on integration.drs_line_ai_review_requests to laibe_integration_migration_owner",
      ),
    "SECURITY DEFINER owner must receive only explicit required object privileges",
  );
  assert(
    sql.includes("p_now is null") && sql.includes("v_now timestamptz := p_now"),
    "opaque handle consume must validate p_now once and use that value",
  );
  assert(sql.includes("if v_decision.decision_type = 'CANCEL' then"));
  assert(sql.includes("return null;"));
  assert(!sql.includes("p_pre_send_review_state"));
  assert(!sql.includes("p_decision_type text"));
  assert(sql.includes("p_sent_at timestamptz"));
  assert(
    sql.includes("valid_from <= p_sent_at") &&
      sql.includes("p_sent_at < valid_to"),
    "message authorization must validate formal link and assignment at provider sent_at",
  );
  assert(
    sql.includes("equal timestamp leave wins") &&
      sql.includes("formal authorization remains independent"),
    "lifecycle ordering must document leave-wins and formal revocation boundaries",
  );
  assert(
    sql.includes("PRE_SEND_REVIEW_NOT_PERFORMED_BREAK_GLASS") &&
      sql.includes("p_service_incident_id") &&
      sql.includes("v_recomputed_final_snapshot_sha256"),
    "break-glass RPC must recompute canonical evidence and remain Human-only",
  );
  assert(
    sql.includes(
      "revoke all on function integration.drs_line_w1_append_receipt",
    ),
  );
  assert(
    sql.includes(
      "revoke all on function integration.drs_line_w1_finalize_message",
    ),
  );
  assert(
    sql.includes(
      "revoke all on function integration.drs_line_w1_persist_ai_review",
    ),
  );
  assert(
    sql.includes(
      "revoke all on function integration.drs_line_w1_record_human_decision",
    ),
  );
  assert(
    sql.includes(
      "revoke all on function integration.drs_line_w1_consume_opaque_handle",
    ),
  );
  assert(
    sql.includes(
      "grant execute on function integration.drs_line_w1_append_receipt",
    ),
  );
  assert(
    sql.includes(
      "grant execute on function integration.drs_line_w1_finalize_message",
    ),
  );
  assert(
    sql.includes(
      "grant execute on function integration.drs_line_w1_persist_ai_review",
    ),
  );
  assert(
    sql.includes(
      "grant execute on function integration.drs_line_w1_record_human_decision",
    ),
  );
  assert(
    sql.includes(
      "grant execute on function integration.drs_line_w1_consume_opaque_handle",
    ),
  );
  assert(
    sql.includes(
      "mime_type in ('image/jpeg', 'image/png') and canonical_document_id is null",
    ),
  );
});

Deno.test("SQL FORCE RLS definer owner remains executable through explicit least-privilege policies and pgcrypto grants", async () => {
  const sql = await Deno.readTextFile(
    "supabase/migrations/20260820000000_drs_linebot_group_ai_human_w1.sql",
  );
  const forceRlsTables = [
    "drs_line_linked_groups",
    "drs_line_receipts",
    "drs_line_attachment_staging",
    "drs_line_specialist_assignments",
    "drs_line_ai_review_requests",
    "drs_line_ai_reviews",
    "drs_line_human_decisions",
    "drs_line_final_messages",
    "drs_line_outbox",
    "drs_line_audit_events",
    "drs_line_opaque_handles",
    "drs_line_group_lifecycle_events",
  ];
  for (const table of forceRlsTables) {
    assert(
      sql.includes(
        `create policy ${table}_definer_owner_rpc_policy on integration.${table}`,
      ),
      `${table} must grant FORCE-RLS visibility only to the definer owner`,
    );
    assert(
      sql.includes("to laibe_integration_migration_owner"),
      "FORCE-RLS owner policy must target only the NOLOGIN definer owner",
    );
  }
  assert(
    sql.includes(
      "grant usage on schema extensions to laibe_integration_migration_owner",
    ),
    "definer owner needs explicit extensions schema usage for pgcrypto digest",
  );
  assert(
    sql.includes(
      "grant execute on function extensions.digest(bytea, text) to laibe_integration_migration_owner",
    ),
    "definer owner needs only digest(bytea,text) execute",
  );
  assert(
    !/create\s+role\s+laibe_integration_migration_owner[\s\S]{0,120}\blogin\b/iu
      .test(sql),
    "definer owner must remain NOLOGIN",
  );
  assert(
    !/create\s+policy[\s\S]{0,180}\bto\s+(public|anon|authenticated|service_role)\b/iu
      .test(sql),
    "app roles must not receive direct table RLS policies",
  );
});

Deno.test("SQL replay paths return persisted IDs only after full semantic equality checks", async () => {
  const sql = await Deno.readTextFile(
    "supabase/migrations/20260820000000_drs_linebot_group_ai_human_w1.sql",
  );
  const appendReceipt = sql.slice(
    sql.indexOf(
      "create or replace function integration.drs_line_w1_append_receipt(",
    ),
    sql.indexOf(
      "create or replace function integration.drs_line_w1_request_ai_review(",
    ),
  );
  assert(
    appendReceipt.includes("receipt_id") &&
      appendReceipt.includes("v_inserted_receipt_id") &&
      !appendReceipt.includes("receipt_id,\n      p_receipt_id"),
    "attachment/audit writes must use persisted receipt id after conflict",
  );
  const requestReview = sql.slice(
    sql.indexOf(
      "create or replace function integration.drs_line_w1_request_ai_review(",
    ),
    sql.indexOf(
      "create or replace function integration.drs_line_w1_persist_ai_review(",
    ),
  );
  assert(
    requestReview.includes("status in ('pending', 'completed')") ||
      requestReview.includes("status <> 'cancelled'"),
    "exact AI request replay after completion must return persisted request identity",
  );
  assert(
    requestReview.includes("submitted_snapshot_sha256 is distinct from") &&
      requestReview.includes(
        "raise exception 'ai_review_request_replay_conflict'",
      ),
    "changed submitted body/context must fail closed on request replay",
  );
  const persistReview = sql.slice(
    sql.indexOf(
      "create or replace function integration.drs_line_w1_persist_ai_review(",
    ),
    sql.indexOf(
      "create or replace function integration.drs_line_w1_record_human_decision(",
    ),
  );
  assert(
    persistReview.includes("on conflict (review_request_id)") ||
      persistReview.includes("where review_request_id = p_review_request_id"),
    "persist_ai_review must converge unique review_request_id races",
  );
  assert(
    persistReview.includes("review_id is distinct from p_review_id") &&
      persistReview.includes("ai_review_replay_conflict"),
    "caller review ID substitution must conflict instead of being returned",
  );
  const finalization = sql.slice(
    sql.indexOf(
      "create or replace function integration.drs_line_w1_finalize_message(",
    ),
    sql.indexOf(
      "create or replace function integration.drs_line_w1_issue_opaque_handle(",
    ),
  );
  for (
    const semantic of [
      "case_id is distinct from",
      "linked_group_id is distinct from",
      "assignment_id is distinct from",
      "specialist_id is distinct from",
      "line_group_id is distinct from",
      "deliverable_messages is distinct from",
    ]
  ) {
    assert(
      finalization.includes(semantic),
      `missing final replay semantic: ${semantic}`,
    );
  }
});

Deno.test("SQL break-glass replay validates full immutable semantics before returning persisted records", async () => {
  const sql = await Deno.readTextFile(
    "supabase/migrations/20260820000000_drs_linebot_group_ai_human_w1.sql",
  );
  const body = sql.slice(
    sql.indexOf(
      "create or replace function integration.drs_line_w1_record_break_glass(",
    ),
    sql.indexOf(
      "create or replace function integration.drs_line_w1_record_group_lifecycle(",
    ),
  );
  const firstReturn = body.indexOf("return query select");
  for (
    const requiredBeforeReturn of [
      "from integration.drs_line_linked_groups",
      "from integration.drs_line_specialist_assignments",
      "private_control_line_user_id",
      "p_sent_at",
      "v_recomputed_final_snapshot_sha256",
      "jsonb_array_length(p_deliverable_messages)",
    ]
  ) {
    assert(
      body.indexOf(requiredBeforeReturn) >= 0 &&
        body.indexOf(requiredBeforeReturn) < firstReturn,
      `break-glass must validate ${requiredBeforeReturn} before replay return`,
    );
  }
  assert(
    body.includes(
      "v_provider_fingerprint := integration.drs_line_w1_sha256_json(",
    ) &&
      !body.includes("p_provider_fingerprint"),
    "provider fingerprint must be computed from canonical semantics, not caller text",
  );
  assert(
    body.includes("raise exception 'break_glass_provider_replay_conflict'"),
    "semantic collision on provider key must fail closed",
  );
});

Deno.test("SQL finalization closes JSON shapes, decision matrix and canonical hash contract", async () => {
  const sql = await Deno.readTextFile(
    "supabase/migrations/20260820000000_drs_linebot_group_ai_human_w1.sql",
  );
  assert(
    sql.includes("jsonb_object_keys") &&
      sql.includes("unknown_json_key") &&
      sql.includes("private_draft"),
    "candidate must reject unknown/private JSON keys in authority arrays",
  );
  assert(
    sql.includes("manual_exception_requires_unavailable_review") &&
      sql.includes("override_not_allowed_for_no_flag") &&
      sql.includes("cancel_creates_no_final_message"),
    "SQL must enforce Human decision matrix in guarded finalization",
  );
  assert(
    sql.includes("v_assignment") &&
      sql.includes("valid_from <= v_now") &&
      sql.includes("v_now < valid_to"),
    "send/finalization must revalidate assignment authority at finalization time",
  );
  assert(
    sql.includes("drs_line_w1_canonical_json_sha256_v1") &&
      sql.includes("A14_W1_CANONICAL_JSON_GOLDEN_SHA256"),
    "TS and SQL must share an explicit canonical JSON hashing contract fixture",
  );
});

Deno.test("SQL Rework 6 nested deliverables, assignment lock and break-glass replay gates are function-scoped", async () => {
  const sql = await Deno.readTextFile(
    "supabase/migrations/20260820000000_drs_linebot_group_ai_human_w1.sql",
  );
  const finalization = sqlFunctionSlice(
    sql,
    "integration.drs_line_w1_finalize_message(",
    "integration.drs_line_w1_issue_opaque_handle(",
  );
  const breakGlass = sqlFunctionSlice(
    sql,
    "integration.drs_line_w1_record_break_glass(",
    "integration.drs_line_w1_record_group_lifecycle(",
  );

  for (const body of [finalization, breakGlass]) {
    assert(
      body.includes(
        "jsonb_typeof(p_deliverable_messages) is distinct from 'array'",
      ),
      "deliverable_messages must be an array before nested inspection",
    );
    assert(
      body.includes(
        "jsonb_array_length(p_deliverable_messages) is distinct from 1 + jsonb_array_length",
      ),
      "SQL must require exact deliverable count of one final_text plus one payload per attachment ref",
    );
    assert(
      body.includes(
        "p_deliverable_messages->0->>'purpose' is distinct from 'final_text'",
      ) &&
        body.includes("p_deliverable_messages->0->>'text' is distinct from") &&
        body.includes(
          "array['purpose', 'text', 'type']::text[]",
        ),
      "first deliverable must be exact final_text object keys and exact text",
    );
    assert(
      body.includes("message.ordinality > 1") &&
        body.includes(
          "message.value->>'purpose' is distinct from 'attachment_payload'",
        ),
      "every later deliverable must be attachment_payload",
    );
    assert(
      body.includes(
        "jsonb_typeof(message.value->'attachmentRef') is distinct from 'object'",
      ) &&
        body.includes("jsonb_object_keys(message.value->'attachmentRef')") &&
        body.includes(
          "array['attachmentId', 'byteSize', 'mimeType', 'sha256', 'storageRef']::text[]",
        ) &&
        body.includes("attachment_ref_shape_invalid"),
      "nested attachmentRef objects must be exact-key closed and typed",
    );
    assert(
      body.includes("message.value->>'accessUrl'") &&
        body.includes("drs[.]local[.]invalid") &&
        body.includes("pdf_opaque_access_url_invalid") &&
        body.includes("message.value->>'accessUrl' !~") &&
        body.includes("'^https://drs[.]local[.]invalid/access/' ||") &&
        body.includes("|| '$'"),
      "PDF payload must bind exact trusted HTTPS URL to the attachment UUID with no query/fragment/port/userinfo/path drift",
    );
    assert(
      body.includes("originalContentUrl") &&
        body.includes("previewImageUrl") &&
        body.includes("image_url_invalid") &&
        body.includes(
          "array['attachmentRef', 'originalContentUrl', 'previewImageUrl', 'purpose', 'type']::text[]",
        ),
      "image payload URLs and keys must be variant-specific inside SQL nested shape gates",
    );
    assert(
      body.includes("count(*) filter") &&
        body.includes("attachment_payload_cardinality_invalid"),
      "SQL must require exactly one attachment payload per final attachment ref",
    );
    assert(
      body.includes(
        "array['accessUrl', 'accessUrlKind', 'attachmentRef', 'purpose', 'text', 'type']::text[]",
      ),
      "PDF payload keys must be variant-specific and reject cross-variant fields",
    );
  }

  assert(
    finalization.includes("into v_assignment") &&
      finalization.includes(
        "from integration.drs_line_specialist_assignments",
      ) &&
      finalization.includes("assignment_id = v_decision.assignment_id") &&
      finalization.includes("specialist_id = v_decision.specialist_id") &&
      finalization.includes("status = 'active'") &&
      finalization.includes("for update"),
    "finalization must lock and revalidate the persisted active specialist assignment",
  );
  const replayRead = breakGlass.indexOf("from integration.drs_line_receipts");
  const advisoryLock = breakGlass.indexOf("pg_advisory_xact_lock");
  assert(
    advisoryLock >= 0 && advisoryLock < replayRead,
    "break-glass must acquire a deterministic transaction lock before first provider replay read",
  );
});

Deno.test("SQL Rework 8 normalizes unavailable AI review persistence and rejects nullable PDF payload bypasses", async () => {
  const sql = await Deno.readTextFile(
    "supabase/migrations/20260820000000_drs_linebot_group_ai_human_w1.sql",
  );
  const persistReview = sqlFunctionSlice(
    sql,
    "integration.drs_line_w1_persist_ai_review(",
    "integration.drs_line_w1_record_human_decision(",
  );
  assert(
    persistReview.includes("v_safe_status") &&
      persistReview.includes("REVIEW_SERVICE_UNAVAILABLE") &&
      persistReview.includes("ADVISORY_PORT_UNAVAILABLE") &&
      persistReview.includes("v_safe_findings := '[]'::jsonb") &&
      persistReview.includes("v_safe_proposed_text_sha256"),
    "persist_ai_review must server-normalize unavailable provider metadata before persistence",
  );
  assert(
    !persistReview.includes("p_model, p_model_version, p_rag_version") ||
      persistReview.includes("v_safe_model, v_safe_model_version"),
    "unavailable persistence must not store caller provider model/version fields verbatim",
  );

  const finalization = sqlFunctionSlice(
    sql,
    "integration.drs_line_w1_finalize_message(",
    "integration.drs_line_w1_issue_opaque_handle(",
  );
  const breakGlass = sqlFunctionSlice(
    sql,
    "integration.drs_line_w1_record_break_glass(",
    "integration.drs_line_w1_record_group_lifecycle(",
  );
  for (const body of [finalization, breakGlass]) {
    assert(
      body.includes(
        "jsonb_typeof(message.value->'accessUrl') is distinct from 'string'",
      ) &&
        body.includes(
          "jsonb_typeof(message.value->'accessUrlKind') is distinct from 'string'",
        ) &&
        body.includes(
          "jsonb_typeof(message.value->'text') is distinct from 'string'",
        ),
      "PDF text/accessUrl/accessUrlKind must be non-null JSON strings before regex/equality checks",
    );
    assert(
      body.includes(
        "pdf access URL rejects explicit port/userinfo/query/fragment",
      ) &&
        body.includes("://drs.local.invalid:") &&
        body.includes("@drs.local.invalid") &&
        body.includes("%2f") &&
        body.includes("%2F"),
      "SQL PDF URL gate must document and reject port/userinfo/query/fragment/encoded path drift",
    );
    assert(
      body.includes("v_canonical_final_attachment_refs") &&
        body.includes(
          "jsonb_agg(ref.value order by ref.value->>'attachmentId', ref.value->>'sha256')",
        ),
      "SQL final snapshot must canonicalize attachment order to match TypeScript hashing",
    );
  }
});

Deno.test("SQL Rework 6 SECURITY DEFINER owner and helper execution grants are hardened", async () => {
  const sql = await Deno.readTextFile(
    "supabase/migrations/20260820000000_drs_linebot_group_ai_human_w1.sql",
  );
  assert(
    /alter\s+role\s+laibe_integration_migration_owner\s+with\s+nologin\s+nobypassrls\s+nosuperuser\s+nocreatedb\s+nocreaterole\s+noreplication/iu
      .test(sql),
    "migration owner attributes must be explicitly hardened after creation",
  );
  for (
    const signature of [
      "integration.drs_line_w1_canonical_json_text_v1(jsonb)",
      "integration.drs_line_w1_canonical_json_sha256_v1(jsonb)",
      "integration.drs_line_w1_sha256_json(jsonb)",
      "integration.drs_line_w1_sha256_text(text)",
      "integration.drs_line_w1_append_receipt(",
      "integration.drs_line_w1_request_ai_review(",
      "integration.drs_line_w1_persist_ai_review(",
      "integration.drs_line_w1_record_human_decision(",
      "integration.drs_line_w1_finalize_message(",
      "integration.drs_line_w1_issue_opaque_handle(",
      "integration.drs_line_w1_consume_opaque_handle(",
      "integration.drs_line_w1_record_break_glass(",
      "integration.drs_line_w1_record_group_lifecycle(",
    ]
  ) {
    assert(
      sql.includes(`alter function ${signature}`) &&
        sql.slice(sql.indexOf(`alter function ${signature}`), sql.length)
          .includes("owner to laibe_integration_migration_owner"),
      `SECURITY DEFINER/helper function owner pin missing: ${signature}`,
    );
  }
  for (
    const helper of [
      "integration.drs_line_w1_canonical_json_text_v1(jsonb)",
      "integration.drs_line_w1_canonical_json_sha256_v1(jsonb)",
      "integration.drs_line_w1_sha256_json(jsonb)",
      "integration.drs_line_w1_sha256_text(text)",
    ]
  ) {
    assert(
      sql.includes(
        `revoke all on function ${helper} from public, anon, authenticated, service_role`,
      ),
      `internal helper execute must be revoked from app roles: ${helper}`,
    );
    assert(
      !sql.includes(`grant execute on function ${helper}`),
      `internal helper must not be granted as guarded service_role RPC: ${helper}`,
    );
  }
});
